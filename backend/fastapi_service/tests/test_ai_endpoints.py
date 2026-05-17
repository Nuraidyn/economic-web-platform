import tempfile
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base, get_db
from app.deps import require_agreement, require_staff
from app.main import app
from app.services.authz import AuthzContext


def _make_authz(user_id=1):
    return AuthzContext(user_id=user_id, role="user", agreement_accepted=True)


class AIEndpointsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        for mw in app.user_middleware:
            if mw.cls.__name__ == "RateLimitMiddleware":
                mw.kwargs["enabled"] = False
        app.middleware_stack = app.build_middleware_stack()

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.engine = create_engine(
            f"sqlite:///{self.tmp.name}/test.db",
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(bind=self.engine)
        Session = sessionmaker(
            bind=self.engine,
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
        )

        def override_db():
            db = Session()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides[require_agreement] = lambda: _make_authz()
        app.dependency_overrides[require_staff] = lambda: _make_authz()
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()
        self.tmp.cleanup()

    @patch("app.services.ai_mentor.chat")
    def test_chat_endpoint_returns_structured_response(self, mock_chat):
        from app.schemas import StructuredAIResponse
        mock_chat.return_value = StructuredAIResponse(
            conversation_id=1,
            message_id=1,
            summary="Test summary",
            insights=["Insight 1"],
            limitations="None",
            suggested_next_steps=["Next?"],
            provider="openrouter",
            model="llama",
        )
        response = self.client.post(
            "/api/v1/ai/chat",
            json={"message": "Tell me about GDP", "language": "en"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["summary"], "Test summary")
        self.assertIn("conversation_id", data)

    @patch("app.services.ai_mentor.suggest_next", return_value=["Q1?", "Q2?"])
    def test_suggest_next_returns_list(self, mock_suggest):
        response = self.client.post(
            "/api/v1/ai/suggest-next",
            json={"language": "en"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("suggestions", data)
        self.assertEqual(data["suggestions"], ["Q1?", "Q2?"])

    def test_list_conversations_empty(self):
        response = self.client.get("/api/v1/ai/conversations")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_delete_nonexistent_conversation_returns_404(self):
        response = self.client.delete("/api/v1/ai/conversations/9999")
        self.assertEqual(response.status_code, 404)
