import json
import os
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base, get_db
from app.deps import require_agreement
from app.main import app
from app.models import Country, Indicator, Observation
from app.models_analytics import LorenzResult
from app.models_forecast import ForecastPoint, ForecastRun


def _disable_rate_limit_middleware():
    for middleware in app.user_middleware:
        if middleware.cls.__name__ == "RateLimitMiddleware":
            middleware.kwargs["enabled"] = False
    app.middleware_stack = app.build_middleware_stack()


class FastApiBaseTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        _disable_rate_limit_middleware()

    def setUp(self):
        self.tmp_dir = tempfile.TemporaryDirectory()
        db_path = os.path.join(self.tmp_dir.name, "test_fastapi.sqlite3")
        self.engine = create_engine(
            f"sqlite:///{db_path}",
            future=True,
            connect_args={"check_same_thread": False},
        )
        self.SessionLocal = sessionmaker(
            bind=self.engine,
            autoflush=False,
            autocommit=False,
            future=True,
            expire_on_commit=False,
        )
        Base.metadata.create_all(bind=self.engine)

        def override_get_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[require_agreement] = lambda: {
            "user_id": 1,
            "role": "admin",
            "agreement_accepted": True,
        }
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()
        self.tmp_dir.cleanup()

    def _seed_country(self, code="KZ", name="Kazakhstan") -> Country:
        with self.SessionLocal() as db:
            country = Country(code=code, name=name)
            db.add(country)
            db.commit()
            return country

    def _seed_indicator(
        self,
        code="FP.CPI.TOTL.ZG",
        name="Inflation (annual %)",
        source="world_bank",
    ) -> Indicator:
        with self.SessionLocal() as db:
            indicator = Indicator(code=code, name=name, source=source)
            db.add(indicator)
            db.commit()
            return indicator


class HealthAndCatalogTests(FastApiBaseTestCase):
    def test_healthcheck_returns_ok(self):
        response = self.client.get("/api/v1/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_countries_endpoint_merges_defaults_and_normalizes_display_name(self):
        self._seed_country(code="US", name="US")

        response = self.client.get("/api/v1/countries")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        by_code = {row["code"]: row for row in payload}
        self.assertIn("KZ", by_code)
        self.assertEqual(by_code["US"]["name"], "United States")

        names = [row["name"] for row in payload]
        self.assertEqual(names, sorted(names))

    def test_indicators_endpoint_uses_defaults_when_db_is_empty(self):
        response = self.client.get("/api/v1/indicators")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertGreaterEqual(len(payload), 5)
        self.assertTrue(any(row["code"] == "SI.POV.GINI" for row in payload))

    def test_indicators_endpoint_prefers_database_rows_when_present(self):
        self._seed_indicator(code="TEST.IND", name="Test Indicator", source="custom")

        response = self.client.get("/api/v1/indicators")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["code"], "TEST.IND")


class ObservationApiTests(FastApiBaseTestCase):
    def test_observations_returns_cached_db_series(self):
        with self.SessionLocal() as db:
            country = Country(code="KZ", name="Kazakhstan")
            indicator = Indicator(
                code="FP.CPI.TOTL.ZG",
                name="Inflation (annual %)",
                source="world_bank",
            )
            db.add_all([country, indicator])
            db.commit()

            db.add_all(
                [
                    Observation(
                        country_id=country.id,
                        indicator_id=indicator.id,
                        year=2006,
                        value=8.72,
                        source="world_bank",
                    ),
                    Observation(
                        country_id=country.id,
                        indicator_id=indicator.id,
                        year=2007,
                        value=10.8,
                        source="world_bank",
                    ),
                ]
            )
            db.commit()

        response = self.client.get(
            "/api/v1/observations",
            params={
                "country": "KZ",
                "indicator": "FP.CPI.TOTL.ZG",
                "start_year": 2006,
                "end_year": 2007,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("X-Data-Source"), "cache_db")
        payload = response.json()
        self.assertEqual(len(payload), 2)
        self.assertEqual(payload[0]["year"], 2006)
        self.assertEqual(payload[1]["value"], 10.8)

    def test_observations_fetches_world_bank_when_cache_misses(self):
        series = [
            {"year": 2021, "value": 7.1},
            {"year": 2022, "value": 8.4},
            {"year": 2023, "value": 9.9},
        ]
        with patch(
            "app.api.v1.observations.fetch_indicator_series",
            return_value=series,
        ) as mocked_fetch:
            response = self.client.get(
                "/api/v1/observations",
                params={
                    "country": "kz",
                    "indicator": "FP.CPI.TOTL.ZG",
                    "start_year": 2022,
                    "end_year": 2023,
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("X-Data-Source"), "world_bank_live")
        payload = response.json()
        self.assertEqual(len(payload), 2)
        self.assertEqual(payload[0]["country"], "KZ")
        mocked_fetch.assert_called_once_with("KZ", "FP.CPI.TOTL.ZG")

    def test_observations_rejects_invalid_year_range(self):
        response = self.client.get(
            "/api/v1/observations",
            params={
                "country": "KZ",
                "indicator": "FP.CPI.TOTL.ZG",
                "start_year": 2024,
                "end_year": 2020,
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "start_year must be <= end_year")

    def test_observations_enforce_safe_year_bounds(self):
        response = self.client.get(
            "/api/v1/observations",
            params={
                "country": "KZ",
                "indicator": "FP.CPI.TOTL.ZG",
                "start_year": 1980,
            },
        )

        self.assertEqual(response.status_code, 422)


class ForecastApiTests(FastApiBaseTestCase):
    def test_create_forecast_uses_cached_run_when_available(self):
        fake_result = SimpleNamespace(
            run=SimpleNamespace(
                model_name="cached_linear",
                horizon_years=2,
                assumptions="cached assumptions",
                metrics="cached metrics",
            ),
            points=[
                SimpleNamespace(year=2025, value=5.2, lower=4.9, upper=5.5),
                SimpleNamespace(year=2026, value=5.4, lower=5.0, upper=5.8),
            ],
        )

        with patch("app.api.v1.forecast.run_forecast", return_value=fake_result):
            response = self.client.post(
                "/api/v1/forecast",
                params={
                    "country": "KZ",
                    "indicator": "FP.CPI.TOTL.ZG",
                    "horizon_years": 2,
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["model_name"], "cached_linear")
        self.assertEqual(len(payload["points"]), 2)
        self.assertEqual(payload["points"][0]["year"], 2025)

    def test_create_forecast_falls_back_to_live_series(self):
        live_series = [
            {"year": 2014, "value": 6.0},
            {"year": 2015, "value": 6.1},
            {"year": 2016, "value": 6.2},
            {"year": 2017, "value": 6.4},
            {"year": 2018, "value": 6.5},
            {"year": 2019, "value": 6.8},
            {"year": 2020, "value": 7.2},
            {"year": 2021, "value": 7.5},
            {"year": 2022, "value": 8.0},
            {"year": 2023, "value": 8.4},
        ]

        with patch("app.api.v1.forecast.run_forecast", return_value=None), patch(
            "app.api.v1.forecast.fetch_indicator_series", return_value=live_series
        ):
            response = self.client.post(
                "/api/v1/forecast",
                params={
                    "country": "KZ",
                    "indicator": "FP.CPI.TOTL.ZG",
                    "horizon_years": 3,
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["country"], "KZ")
        self.assertEqual(payload["horizon_years"], 3)
        self.assertEqual(len(payload["points"]), 3)
        self.assertEqual(payload["points"][0]["year"], 2024)

    def test_create_forecast_returns_400_when_history_too_short(self):
        short_series = [
            {"year": 2020, "value": 1.0},
            {"year": 2021, "value": 1.1},
            {"year": 2022, "value": 1.2},
            {"year": 2023, "value": 1.3},
            {"year": 2024, "value": 1.4},
            {"year": 2025, "value": 1.5},
            {"year": 2026, "value": 1.6},
        ]

        with patch("app.api.v1.forecast.run_forecast", return_value=None), patch(
            "app.api.v1.forecast.fetch_indicator_series", return_value=short_series
        ):
            response = self.client.post(
                "/api/v1/forecast",
                params={
                    "country": "KZ",
                    "indicator": "FP.CPI.TOTL.ZG",
                    "horizon_years": 2,
                },
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Not enough data to forecast")

    def test_latest_forecast_returns_404_for_unknown_country_or_indicator(self):
        response = self.client.get(
            "/api/v1/forecast/latest",
            params={"country": "KZ", "indicator": "FP.CPI.TOTL.ZG"},
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"], "Unknown country or indicator")

    def test_latest_forecast_returns_saved_run(self):
        with self.SessionLocal() as db:
            country = Country(code="KZ", name="Kazakhstan")
            indicator = Indicator(
                code="FP.CPI.TOTL.ZG",
                name="Inflation (annual %)",
                source="world_bank",
            )
            db.add_all([country, indicator])
            db.commit()

            run = ForecastRun(
                country_id=country.id,
                target_indicator_id=indicator.id,
                model_name="linear_trend",
                horizon_years=2,
                assumptions="assumptions",
                metrics="metrics",
            )
            db.add(run)
            db.commit()

            db.add_all(
                [
                    ForecastPoint(run_id=run.id, year=2025, value=9.0, lower=8.0, upper=10.0),
                    ForecastPoint(run_id=run.id, year=2026, value=9.5, lower=8.3, upper=10.7),
                ]
            )
            db.commit()

        response = self.client.get(
            "/api/v1/forecast/latest",
            params={"country": "KZ", "indicator": "FP.CPI.TOTL.ZG"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["model_name"], "linear_trend")
        self.assertEqual(len(payload["points"]), 2)
        self.assertEqual(payload["points"][1]["year"], 2026)


class AnalyticsAndInequalityTests(FastApiBaseTestCase):
    def test_chart_explain_returns_local_fallback_for_missing_openai_key(self):
        payload = {
            "question": "Объясни, что показывает график и тренд.",
            "language": "ru",
            "start_year": 2006,
            "end_year": 2024,
            "datasets": [
                {
                    "indicator": "FP.CPI.TOTL.ZG",
                    "indicator_label": "Inflation (annual %)",
                    "series": [
                        {
                            "country": "KZ",
                            "data": [
                                {"year": 2006, "value": 8.72},
                                {"year": 2024, "value": 8.84},
                            ],
                        }
                    ],
                }
            ],
        }

        with patch("app.services.chart_explainer.CHART_EXPLAIN_PROVIDER", "openai"), patch(
            "app.services.chart_explainer.OPENAI_API_KEY", ""
        ):
            response = self.client.post("/api/v1/analytics/chart/explain", json=payload)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["provider"], "local-fallback")
        self.assertIn("Вопрос пользователя", data["answer"])
        self.assertIn("Причина", data["answer"])

    def test_chart_explain_rejects_too_many_countries_per_indicator(self):
        payload = {
            "question": "Explain",
            "language": "en",
            "datasets": [
                {
                    "indicator": "FP.CPI.TOTL.ZG",
                    "series": [
                        {"country": "KZ", "data": [{"year": 2022, "value": 1.0}]},
                        {"country": "US", "data": [{"year": 2022, "value": 2.0}]},
                        {"country": "RU", "data": [{"year": 2022, "value": 3.0}]},
                        {"country": "DE", "data": [{"year": 2022, "value": 4.0}]},
                        {"country": "FR", "data": [{"year": 2022, "value": 5.0}]},
                    ],
                }
            ],
        }

        response = self.client.post("/api/v1/analytics/chart/explain", json=payload)

        self.assertEqual(response.status_code, 400)
        self.assertIn("Too many countries", response.json()["detail"])

    def test_gini_trend_uses_cache_and_computes_yoy(self):
        with self.SessionLocal() as db:
            country = Country(code="KZ", name="Kazakhstan")
            indicator = Indicator(
                code="SI.POV.GINI",
                name="Gini Index",
                source="world_bank",
            )
            db.add_all([country, indicator])
            db.commit()
            db.add_all(
                [
                    Observation(
                        country_id=country.id,
                        indicator_id=indicator.id,
                        year=2020,
                        value=31.0,
                        source="world_bank",
                    ),
                    Observation(
                        country_id=country.id,
                        indicator_id=indicator.id,
                        year=2021,
                        value=29.0,
                        source="world_bank",
                    ),
                ]
            )
            db.commit()

        response = self.client.get(
            "/api/v1/inequality/gini/trend",
            params={"country": "KZ", "start_year": 2020, "end_year": 2021},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["meta"]["source"], "cache_db")
        self.assertEqual(len(payload["points"]), 2)
        self.assertEqual(payload["points"][1]["yoy_change"], -2.0)

    def test_gini_ranking_sorts_known_values_descending(self):
        with self.SessionLocal() as db:
            gini = Indicator(code="SI.POV.GINI", name="Gini Index", source="world_bank")
            kz = Country(code="KZ", name="Kazakhstan")
            us = Country(code="US", name="United States")
            db.add_all([gini, kz, us])
            db.commit()
            db.add_all(
                [
                    Observation(
                        country_id=kz.id,
                        indicator_id=gini.id,
                        year=2021,
                        value=31.0,
                        source="world_bank",
                    ),
                    Observation(
                        country_id=us.id,
                        indicator_id=gini.id,
                        year=2021,
                        value=41.0,
                        source="world_bank",
                    ),
                ]
            )
            db.commit()

        response = self.client.get(
            "/api/v1/inequality/gini/ranking",
            params={"year": 2021, "countries": "KZ,US"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload[0]["country"], "US")
        self.assertEqual(payload[0]["value"], 41.0)

    def test_correlation_returns_expected_overlap(self):
        with self.SessionLocal() as db:
            country = Country(code="KZ", name="Kazakhstan")
            indicator_a = Indicator(code="A.TEST", name="A", source="test")
            indicator_b = Indicator(code="B.TEST", name="B", source="test")
            db.add_all([country, indicator_a, indicator_b])
            db.commit()
            rows = []
            for year, a_value, b_value in [(2020, 1.0, 2.0), (2021, 2.0, 4.0), (2022, 3.0, 6.0)]:
                rows.append(
                    Observation(
                        country_id=country.id,
                        indicator_id=indicator_a.id,
                        year=year,
                        value=a_value,
                        source="test",
                    )
                )
                rows.append(
                    Observation(
                        country_id=country.id,
                        indicator_id=indicator_b.id,
                        year=year,
                        value=b_value,
                        source="test",
                    )
                )
            db.add_all(rows)
            db.commit()

        response = self.client.get(
            "/api/v1/correlation",
            params={"country": "KZ", "indicator_a": "A.TEST", "indicator_b": "B.TEST"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["points"], 3)
        self.assertAlmostEqual(payload["correlation"], 1.0, places=6)

    def test_lorenz_and_gini_return_cached_result(self):
        with self.SessionLocal() as db:
            country = Country(code="KZ", name="Kazakhstan")
            db.add(country)
            db.commit()
            db.add(
                LorenzResult(
                    country_id=country.id,
                    year=2022,
                    points_json=json.dumps([
                        {"x": 0.0, "y": 0.0},
                        {"x": 0.2, "y": 0.05},
                        {"x": 1.0, "y": 1.0},
                    ]),
                    gini=0.37,
                )
            )
            db.commit()

        lorenz_response = self.client.get(
            "/api/v1/lorenz",
            params={"country": "KZ", "year": 2022},
        )
        gini_response = self.client.get(
            "/api/v1/gini",
            params={"country": "KZ", "year": 2022},
        )

        self.assertEqual(lorenz_response.status_code, 200)
        self.assertEqual(gini_response.status_code, 200)
        self.assertEqual(len(lorenz_response.json()["points"]), 3)
        self.assertEqual(gini_response.json()["gini"], 0.37)


if __name__ == "__main__":
    unittest.main()
