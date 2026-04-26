"""
Tests for POST /api/v1/income/insights endpoint and service layer.

Groups:
  TestRequestValidation  — Pydantic schema validation
  TestProviderSelection  — openai / gemini / groq / fallback routing
  TestFallbackLogic      — deterministic fallback quality
  TestEndpointContract   — API response shape and HTTP codes
"""
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base, get_db
from app.deps import get_authz_context
from app.schemas import IncomeInsightsRequest
from app.services.authz import AuthzContext
from app.services.income_insights import (
    _fallback_response,
    _parse_llm_json,
    _resolve_provider,
    generate_income_insights,
)

import app.models            # noqa: F401
import app.models_ingestion  # noqa: F401


# ── shared fixtures ──────────────────────────────────────────────────────────

_VALID_PAYLOAD = {
    "age": 30,
    "country": "Kazakhstan",
    "profession": "Software Engineer",
    "experience_years": 5,
    "monthly_income": 3000.0,
    "monthly_expenses": 1800.0,
    "yearly_growth_percent": 10.0,
    "currency": "USD",
    "comparison_countries": ["Germany", "Canada"],
    "period_years": 1,
    "inflation_adjusted": False,
}

_VALID_REQ = IncomeInsightsRequest(**_VALID_PAYLOAD)


def _make_client():
    import tempfile, os
    from app.main import app

    tmp = tempfile.TemporaryDirectory()
    engine = create_engine(
        f"sqlite:///{os.path.join(tmp.name, 'test.db')}",
        future=True,
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def _db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    def _admin():
        return AuthzContext(user_id=1, role="admin", agreement_accepted=True)

    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_authz_context] = _admin
    return TestClient(app), app, engine, tmp


# ── TestRequestValidation ────────────────────────────────────────────────────

class TestRequestValidation(unittest.TestCase):
    def test_valid_payload_accepted(self):
        req = IncomeInsightsRequest(**_VALID_PAYLOAD)
        self.assertEqual(req.age, 30)

    def test_age_below_minimum_rejected(self):
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            IncomeInsightsRequest(**{**_VALID_PAYLOAD, "age": 10})

    def test_age_above_maximum_rejected(self):
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            IncomeInsightsRequest(**{**_VALID_PAYLOAD, "age": 150})

    def test_negative_income_rejected(self):
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            IncomeInsightsRequest(**{**_VALID_PAYLOAD, "monthly_income": -100})

    def test_negative_expenses_rejected(self):
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            IncomeInsightsRequest(**{**_VALID_PAYLOAD, "monthly_expenses": -50})

    def test_growth_above_100_rejected(self):
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            IncomeInsightsRequest(**{**_VALID_PAYLOAD, "yearly_growth_percent": 200})

    def test_period_years_out_of_range_rejected(self):
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            IncomeInsightsRequest(**{**_VALID_PAYLOAD, "period_years": 10})

    def test_empty_profession_rejected(self):
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            IncomeInsightsRequest(**{**_VALID_PAYLOAD, "profession": ""})

    def test_defaults_applied(self):
        minimal = {k: v for k, v in _VALID_PAYLOAD.items()
                   if k not in ("currency", "comparison_countries", "period_years", "inflation_adjusted")}
        req = IncomeInsightsRequest(**minimal)
        self.assertEqual(req.currency, "USD")
        self.assertEqual(req.comparison_countries, [])
        self.assertEqual(req.period_years, 1)
        self.assertFalse(req.inflation_adjusted)


# ── TestProviderSelection ────────────────────────────────────────────────────

class TestProviderSelection(unittest.TestCase):
    def test_explicit_fallback_returns_fallback(self):
        with patch("app.services.income_insights.AI_INSIGHTS_PROVIDER", "fallback"):
            with patch("app.services.income_insights._resolve_provider", return_value="fallback"):
                result = generate_income_insights(_VALID_REQ)
        self.assertEqual(result.provider, "fallback")

    def test_openai_key_present_calls_openai(self):
        _LLM_JSON = {
            "summary": "Test summary",
            "income_benchmark": ["bench1"],
            "action_plan": {"next_3_months": ["a"], "next_6_months": ["b"], "next_12_months": ["c"]},
            "potential_countries": [{"country": "US", "reason": "r", "estimated_income_range": "e"}],
            "disclaimer": "d",
        }
        with patch("app.services.income_insights._resolve_provider", return_value="openai"):
            with patch("app.services.income_insights.OPENAI_API_KEY", "sk-test"):
                with patch("app.services.income_insights._call_openai", return_value='{"summary":"Test summary","income_benchmark":["bench1"],"action_plan":{"next_3_months":["a"],"next_6_months":["b"],"next_12_months":["c"]},"potential_countries":[{"country":"US","reason":"r","estimated_income_range":"e"}],"disclaimer":"d"}'):
                    result = generate_income_insights(_VALID_REQ)
        self.assertEqual(result.provider, "openai")
        self.assertEqual(result.summary, "Test summary")

    def test_gemini_key_present_calls_gemini(self):
        with patch("app.services.income_insights._resolve_provider", return_value="gemini"):
            with patch("app.services.income_insights.GEMINI_API_KEY", "gemini-key"):
                with patch("app.services.income_insights._call_gemini", return_value='{"summary":"Gem","income_benchmark":["b"],"action_plan":{"next_3_months":["a"],"next_6_months":["b"],"next_12_months":["c"]},"potential_countries":[],"disclaimer":"d"}'):
                    result = generate_income_insights(_VALID_REQ)
        self.assertEqual(result.provider, "gemini")

    def test_no_key_returns_fallback(self):
        with patch("app.services.income_insights._resolve_provider", return_value="openai"):
            with patch("app.services.income_insights.OPENAI_API_KEY", ""):
                result = generate_income_insights(_VALID_REQ)
        self.assertEqual(result.provider, "fallback")

    def test_llm_exception_falls_back(self):
        with patch("app.services.income_insights._resolve_provider", return_value="openai"):
            with patch("app.services.income_insights.OPENAI_API_KEY", "sk-test"):
                with patch("app.services.income_insights._call_openai",
                           side_effect=RuntimeError("timeout")):
                    result = generate_income_insights(_VALID_REQ)
        self.assertEqual(result.provider, "fallback")

    def test_json_parse_error_falls_back(self):
        with patch("app.services.income_insights._resolve_provider", return_value="openai"):
            with patch("app.services.income_insights.OPENAI_API_KEY", "sk-test"):
                with patch("app.services.income_insights._call_openai",
                           return_value="not valid json at all"):
                    result = generate_income_insights(_VALID_REQ)
        self.assertEqual(result.provider, "fallback")


# ── TestFallbackLogic ────────────────────────────────────────────────────────

class TestFallbackLogic(unittest.TestCase):
    def test_fallback_returns_correct_provider(self):
        result = _fallback_response(_VALID_REQ)
        self.assertEqual(result.provider, "fallback")

    def test_fallback_has_summary(self):
        result = _fallback_response(_VALID_REQ)
        self.assertTrue(len(result.summary) > 10)

    def test_fallback_has_action_plan_keys(self):
        result = _fallback_response(_VALID_REQ)
        self.assertIn("next_3_months", result.action_plan)
        self.assertIn("next_6_months", result.action_plan)
        self.assertIn("next_12_months", result.action_plan)

    def test_fallback_has_potential_countries(self):
        result = _fallback_response(_VALID_REQ)
        self.assertGreater(len(result.potential_countries), 0)

    def test_fallback_has_disclaimer(self):
        result = _fallback_response(_VALID_REQ)
        self.assertIn("educational", result.disclaimer.lower())

    def test_deficit_profile_mentions_budget(self):
        deficit_req = IncomeInsightsRequest(
            **{**_VALID_PAYLOAD, "monthly_income": 1000, "monthly_expenses": 1500}
        )
        result = _fallback_response(deficit_req)
        self.assertIn("budget", result.action_plan["next_3_months"][0].lower())

    def test_strong_savings_profile(self):
        strong_req = IncomeInsightsRequest(
            **{**_VALID_PAYLOAD, "monthly_income": 5000, "monthly_expenses": 1000}
        )
        result = _fallback_response(strong_req)
        self.assertIn("strong", result.summary.lower())

    def test_parse_llm_json_strips_markdown(self):
        raw = '```json\n{"key": "value"}\n```'
        parsed = _parse_llm_json(raw)
        self.assertEqual(parsed["key"], "value")

    def test_parse_llm_json_plain(self):
        raw = '{"key": "value"}'
        parsed = _parse_llm_json(raw)
        self.assertEqual(parsed["key"], "value")


# ── TestEndpointContract ─────────────────────────────────────────────────────

class TestEndpointContract(unittest.TestCase):
    def setUp(self):
        self.client, self.app, self.engine, self.tmp = _make_client()

    def tearDown(self):
        self.client.close()
        self.app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()
        self.tmp.cleanup()

    def test_valid_request_returns_200(self):
        r = self.client.post("/api/v1/income/insights", json=_VALID_PAYLOAD)
        self.assertEqual(r.status_code, 200)

    def test_response_has_required_fields(self):
        r = self.client.post("/api/v1/income/insights", json=_VALID_PAYLOAD)
        body = r.json()
        for field in ("summary", "income_benchmark", "action_plan",
                      "potential_countries", "disclaimer", "provider"):
            self.assertIn(field, body, f"Missing field: {field}")

    def test_action_plan_has_all_horizons(self):
        r = self.client.post("/api/v1/income/insights", json=_VALID_PAYLOAD)
        plan = r.json()["action_plan"]
        self.assertIn("next_3_months", plan)
        self.assertIn("next_6_months", plan)
        self.assertIn("next_12_months", plan)

    def test_provider_is_valid(self):
        r = self.client.post("/api/v1/income/insights", json=_VALID_PAYLOAD)
        provider = r.json()["provider"]
        self.assertIn(provider, {"openai", "gemini", "groq", "fallback"})

    def test_income_benchmark_is_list(self):
        r = self.client.post("/api/v1/income/insights", json=_VALID_PAYLOAD)
        self.assertIsInstance(r.json()["income_benchmark"], list)

    def test_invalid_age_returns_422(self):
        bad = {**_VALID_PAYLOAD, "age": 5}
        r = self.client.post("/api/v1/income/insights", json=bad)
        self.assertEqual(r.status_code, 422)

    def test_negative_income_returns_422(self):
        bad = {**_VALID_PAYLOAD, "monthly_income": -1}
        r = self.client.post("/api/v1/income/insights", json=bad)
        self.assertEqual(r.status_code, 422)

    def test_unauthenticated_returns_200(self):
        # Income insights is a public endpoint — no auth required.
        from app.main import app
        app.dependency_overrides.clear()
        client = TestClient(app)
        r = client.post("/api/v1/income/insights", json=_VALID_PAYLOAD)
        self.assertEqual(r.status_code, 200)

    def test_llm_failure_still_returns_200_with_fallback(self):
        with patch("app.services.income_insights._call_openai",
                   side_effect=RuntimeError("network error")):
            with patch("app.services.income_insights.OPENAI_API_KEY", "sk-test"):
                r = self.client.post("/api/v1/income/insights", json=_VALID_PAYLOAD)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["provider"], "fallback")


if __name__ == "__main__":
    unittest.main()
