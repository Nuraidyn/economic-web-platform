"""
Tests for batch ingestion refactor.

- Unit: dedup logic (_load_existing_years)
- Integration: first ingest inserts N rows, second inserts 0
- API contract: POST /api/v1/ingest/world-bank response shape unchanged
"""
import types
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.db import Base, get_db
import app.models           # noqa: F401 — register ORM mappers
import app.models_ingestion  # noqa: F401
from app.models import Country, Indicator, Observation
from app.services.ingestion import (
    WORLD_BANK_SOURCE,
    _load_existing_years,
    ingest_indicator,
)


# ---------------------------------------------------------------------------
# Shared DB fixture
# ---------------------------------------------------------------------------

def _make_session():
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    return Session()


def _seed_country_indicator(session):
    c = Country(code="KZ", name="Kazakhstan")
    i = Indicator(code="NY.GDP.MKTP.CD", name="GDP", source=WORLD_BANK_SOURCE)
    session.add_all([c, i])
    session.flush()
    return c, i


FAKE_SERIES_10 = [{"year": 2010 + n, "value": float(n)} for n in range(10)]


# ---------------------------------------------------------------------------
# Unit: _load_existing_years
# ---------------------------------------------------------------------------

class TestLoadExistingYears(unittest.TestCase):
    def setUp(self):
        self.session = _make_session()
        self.country, self.indicator = _seed_country_indicator(self.session)

    def test_empty_table_returns_empty_set(self):
        years = _load_existing_years(self.session, self.country.id, self.indicator.id)
        self.assertEqual(years, set())

    def test_returns_correct_years(self):
        self.session.add_all([
            Observation(country_id=self.country.id, indicator_id=self.indicator.id,
                        year=y, value=float(y), source=WORLD_BANK_SOURCE)
            for y in [2000, 2005, 2010]
        ])
        self.session.flush()
        years = _load_existing_years(self.session, self.country.id, self.indicator.id)
        self.assertEqual(years, {2000, 2005, 2010})

    def test_isolates_by_indicator(self):
        other_ind = Indicator(code="OTHER", name="Other", source=WORLD_BANK_SOURCE)
        self.session.add(other_ind)
        self.session.flush()
        self.session.add(
            Observation(country_id=self.country.id, indicator_id=other_ind.id,
                        year=1999, value=1.0, source=WORLD_BANK_SOURCE)
        )
        self.session.flush()
        years = _load_existing_years(self.session, self.country.id, self.indicator.id)
        self.assertNotIn(1999, years)

    def test_isolates_by_country(self):
        other_c = Country(code="US", name="USA")
        self.session.add(other_c)
        self.session.flush()
        self.session.add(
            Observation(country_id=other_c.id, indicator_id=self.indicator.id,
                        year=2000, value=1.0, source=WORLD_BANK_SOURCE)
        )
        self.session.flush()
        years = _load_existing_years(self.session, self.country.id, self.indicator.id)
        self.assertNotIn(2000, years)


# ---------------------------------------------------------------------------
# Unit: dedup in memory
# ---------------------------------------------------------------------------

class TestDedupLogic(unittest.TestCase):
    """Pure dedup: series filtered by existing_years."""

    def _filter(self, series, existing):
        return [e for e in series if e["year"] not in existing]

    def test_all_new(self):
        result = self._filter(FAKE_SERIES_10, set())
        self.assertEqual(len(result), 10)

    def test_all_existing(self):
        existing = {e["year"] for e in FAKE_SERIES_10}
        result = self._filter(FAKE_SERIES_10, existing)
        self.assertEqual(len(result), 0)

    def test_partial_overlap(self):
        existing = {2010, 2011, 2012}
        result = self._filter(FAKE_SERIES_10, existing)
        self.assertEqual(len(result), 7)
        inserted_years = {e["year"] for e in result}
        self.assertNotIn(2010, inserted_years)
        self.assertNotIn(2012, inserted_years)


# ---------------------------------------------------------------------------
# Integration: ingest_indicator idempotency
# ---------------------------------------------------------------------------

class TestIngestIndicatorIdempotency(unittest.TestCase):
    def _run(self, session, series):
        with patch("app.services.ingestion.fetch_indicator_series", return_value=series):
            return ingest_indicator(session, "KZ", "NY.GDP.MKTP.CD")

    def test_first_ingest_inserts_all_rows(self):
        session = _make_session()
        result = self._run(session, FAKE_SERIES_10)
        self.assertEqual(result["inserted"], 10)
        self.assertEqual(result["total"], 10)

    def test_second_ingest_inserts_zero(self):
        session = _make_session()
        self._run(session, FAKE_SERIES_10)
        result = self._run(session, FAKE_SERIES_10)
        self.assertEqual(result["inserted"], 0)

    def test_partial_new_rows_on_second_ingest(self):
        session = _make_session()
        self._run(session, FAKE_SERIES_10[:5])
        # now ingest the full 10-row series; only 5 new rows expected
        result = self._run(session, FAKE_SERIES_10)
        self.assertEqual(result["inserted"], 5)

    def test_observations_count_after_two_ingests(self):
        session = _make_session()
        self._run(session, FAKE_SERIES_10)
        self._run(session, FAKE_SERIES_10)
        count = session.query(Observation).count()
        self.assertEqual(count, 10)

    def test_run_record_status_completed(self):
        from app.models_ingestion import IngestionRun
        session = _make_session()
        result = self._run(session, FAKE_SERIES_10)
        run = session.query(IngestionRun).filter_by(id=result["run_id"]).one()
        self.assertEqual(run.status, "completed")
        self.assertEqual(run.inserted, 10)

    def test_run_record_on_error(self):
        from app.models_ingestion import IngestionRun
        session = _make_session()
        with patch("app.services.ingestion.fetch_indicator_series",
                   side_effect=RuntimeError("fetch failed")):
            with self.assertRaises(RuntimeError):
                ingest_indicator(session, "KZ", "NY.GDP.MKTP.CD")
        run = session.query(IngestionRun).first()
        self.assertEqual(run.status, "failed")
        self.assertIn("fetch failed", run.error)


# ---------------------------------------------------------------------------
# Query count: batch uses 1 bulk SELECT instead of N individual SELECTs
# ---------------------------------------------------------------------------

class TestBatchQueryCount(unittest.TestCase):
    def test_single_select_for_existing_check(self):
        engine = create_engine("sqlite:///:memory:", future=True)
        Base.metadata.create_all(bind=engine)
        selects = []

        @event.listens_for(engine, "before_cursor_execute")
        def _capture(conn, cursor, stmt, params, ctx, executemany):
            if stmt.strip().upper().startswith("SELECT"):
                selects.append(stmt)

        Session = sessionmaker(bind=engine)
        session = Session()

        with patch("app.services.ingestion.fetch_indicator_series",
                   return_value=FAKE_SERIES_10):
            ingest_indicator(session, "KZ", "NY.GDP.MKTP.CD")

        # exactly 1 SELECT for existing years (plus lookups for country/indicator)
        # the key assertion: NOT 10 individual SELECTs for each year
        year_check_selects = [
            s for s in selects
            if "observations" in s.lower() and "year" in s.lower()
               and "country_id" in s.lower()
        ]
        self.assertEqual(
            len(year_check_selects), 1,
            f"Expected 1 batch SELECT for existing years, got {len(year_check_selects)}: "
            f"{year_check_selects}",
        )


# ---------------------------------------------------------------------------
# API contract: response shape
# ---------------------------------------------------------------------------

class TestIngestionAPIContract(unittest.TestCase):
    def setUp(self):
        import tempfile, os
        from app.main import app
        from app.deps import get_authz_context
        from app.services.authz import AuthzContext

        # fresh file-backed DB per test (avoids in-memory sharing issues)
        self._tmp = tempfile.TemporaryDirectory()
        db_path = os.path.join(self._tmp.name, "test.db")
        engine = create_engine(
            f"sqlite:///{db_path}",
            future=True,
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(bind=engine)
        TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)

        def _override_db():
            db = TestSession()
            try:
                yield db
            finally:
                db.close()

        def _admin_ctx():
            return AuthzContext(user_id=1, role="admin", agreement_accepted=True)

        app.dependency_overrides[get_db] = _override_db
        app.dependency_overrides[get_authz_context] = _admin_ctx
        self.client = TestClient(app)
        self._app = app
        self._engine = engine

    def tearDown(self):
        self.client.close()
        self._app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=self._engine)
        self._engine.dispose()
        self._tmp.cleanup()

    def test_response_has_required_fields(self):
        with patch("app.services.ingestion.fetch_indicator_series",
                   return_value=FAKE_SERIES_10):
            resp = self.client.post(
                "/api/v1/ingest/world-bank",
                json={"country": "KZ", "indicator": "NY.GDP.MKTP.CD"},
            )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        for field in ("country", "indicator", "inserted", "total", "expected", "missing", "run_id"):
            self.assertIn(field, body, f"Missing field: {field}")

    def test_inserted_count_correct(self):
        with patch("app.services.ingestion.fetch_indicator_series",
                   return_value=FAKE_SERIES_10):
            resp = self.client.post(
                "/api/v1/ingest/world-bank",
                json={"country": "KZ", "indicator": "NY.GDP.MKTP.CD"},
            )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["inserted"], 10)

    def test_502_on_fetch_failure(self):
        with patch("app.services.ingestion.fetch_indicator_series",
                   side_effect=RuntimeError("upstream down")):
            resp = self.client.post(
                "/api/v1/ingest/world-bank",
                json={"country": "KZ", "indicator": "NY.GDP.MKTP.CD"},
            )
        self.assertEqual(resp.status_code, 502)


if __name__ == "__main__":
    unittest.main()
