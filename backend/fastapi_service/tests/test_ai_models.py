import os
import tempfile
import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.models import AIConversation, AIMessage


class AIModelsTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.engine = create_engine(
            f"sqlite:///{self.tmp.name}/test.db",
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)

    def tearDown(self):
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()
        self.tmp.cleanup()

    def test_create_conversation_and_messages(self):
        with self.Session() as db:
            conv = AIConversation(user_id=1, title="Test chat")
            db.add(conv)
            db.flush()
            msg = AIMessage(conversation_id=conv.id, role="user", content="Hello")
            db.add(msg)
            db.commit()
            conv_id = conv.id

        with self.Session() as db:
            conv = db.get(AIConversation, conv_id)
            self.assertEqual(conv.title, "Test chat")
            self.assertEqual(len(conv.messages), 1)
            self.assertEqual(conv.messages[0].role, "user")

    def test_structured_response_json_field(self):
        with self.Session() as db:
            conv = AIConversation(user_id=2, title="JSON test")
            db.add(conv)
            db.flush()
            structured = {"summary": "s", "insights": ["a"], "limitations": "l", "suggested_next_steps": []}
            msg = AIMessage(
                conversation_id=conv.id,
                role="assistant",
                content="Answer",
                structured_response=structured,
                rag_chunks_used=["chunk1"],
            )
            db.add(msg)
            db.commit()
            msg_id = msg.id

        with self.Session() as db:
            msg = db.get(AIMessage, msg_id)
            self.assertEqual(msg.structured_response["summary"], "s")
            self.assertEqual(msg.rag_chunks_used, ["chunk1"])
