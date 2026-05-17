import json
import tempfile
import unittest
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.models import AIConversation, AIMessage

STRUCTURED_RESPONSE = json.dumps({
    "summary": "GDP is growing steadily.",
    "insights": ["Kazakhstan GDP rose 4% in 2023.", "Growth is driven by oil exports."],
    "limitations": "Data ends in 2023.",
    "suggested_next_steps": ["Compare with inflation?"],
})

SUGGESTIONS_RESPONSE = json.dumps(["What is inflation?", "Compare countries?", "Show trends?"])


def _make_session():
    tmp = tempfile.mkdtemp()
    engine = create_engine(
        f"sqlite:///{tmp}/test.db",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    return engine, sessionmaker(bind=engine)


class AIMentorServiceTest(unittest.TestCase):
    def setUp(self):
        self.engine, self.Session = _make_session()

    def tearDown(self):
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()

    @patch("app.services.ai_mentor._call_openrouter", return_value=STRUCTURED_RESPONSE)
    @patch("app.services.rag.retrieve", return_value=["GDP chunk"])
    def test_chat_creates_conversation_and_messages(self, mock_rag, mock_llm):
        from app.services.ai_mentor import chat

        with self.Session() as db:
            result = chat(
                user_id=1,
                conversation_id=None,
                message="Tell me about GDP",
                context_snapshot=None,
                language="en",
                db=db,
            )
            db.commit()

        self.assertEqual(result.summary, "GDP is growing steadily.")
        self.assertEqual(result.insights, ["Kazakhstan GDP rose 4% in 2023.", "Growth is driven by oil exports."])
        self.assertIsNotNone(result.conversation_id)
        self.assertIsNotNone(result.message_id)

    @patch("app.services.ai_mentor._call_openrouter", return_value=STRUCTURED_RESPONSE)
    @patch("app.services.rag.retrieve", return_value=[])
    def test_chat_reuses_existing_conversation(self, mock_rag, mock_llm):
        from app.services.ai_mentor import chat

        with self.Session() as db:
            conv = AIConversation(user_id=1, title="Existing")
            db.add(conv)
            db.flush()
            conv_id = conv.id
            db.commit()

        with self.Session() as db:
            result = chat(
                user_id=1,
                conversation_id=conv_id,
                message="Follow-up question",
                context_snapshot=None,
                language="en",
                db=db,
            )
            db.commit()

        self.assertEqual(result.conversation_id, conv_id)

    @patch("app.services.ai_mentor._call_openrouter", return_value=SUGGESTIONS_RESPONSE)
    @patch("app.services.rag.retrieve", return_value=[])
    def test_suggest_next_returns_list(self, mock_rag, mock_llm):
        from app.services.ai_mentor import suggest_next

        with self.Session() as db:
            suggestions = suggest_next(
                user_id=1,
                conversation_id=None,
                context_snapshot={"countries": ["KZ"]},
                language="en",
                db=db,
            )

        self.assertIsInstance(suggestions, list)
        self.assertGreater(len(suggestions), 0)

    @patch("app.services.ai_mentor._call_openrouter", return_value="# Report\n\nKey findings...")
    @patch("app.services.rag.retrieve", return_value=[])
    def test_report_summary_stores_message(self, mock_rag, mock_llm):
        from app.services.ai_mentor import report_summary

        with self.Session() as db:
            conv = AIConversation(user_id=1, title="Report test")
            db.add(conv)
            db.flush()
            msg = AIMessage(conversation_id=conv.id, role="user", content="Hello")
            db.add(msg)
            db.flush()
            conv_id = conv.id
            db.commit()

        with self.Session() as db:
            markdown, msg_id = report_summary(
                user_id=1,
                conversation_id=conv_id,
                context_snapshot=None,
                language="en",
                db=db,
            )
            db.commit()

        self.assertIn("Report", markdown)
        self.assertIsNotNone(msg_id)

    @patch("app.services.ai_mentor._call_openrouter", return_value="not valid json")
    @patch("app.services.rag.retrieve", return_value=[])
    def test_chat_fallback_on_invalid_json(self, mock_rag, mock_llm):
        from app.services.ai_mentor import chat

        with self.Session() as db:
            result = chat(
                user_id=1,
                conversation_id=None,
                message="Question",
                context_snapshot=None,
                language="en",
                db=db,
            )
            db.commit()

        self.assertIn("not valid json", result.summary)
        self.assertEqual(result.insights, [])
