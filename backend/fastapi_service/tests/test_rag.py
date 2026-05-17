import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

import numpy as np


class RagServiceTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        with open(os.path.join(self.tmp, "gdp.md"), "w") as f:
            f.write("# GDP\nGDP measures total economic output of a country.")
        with open(os.path.join(self.tmp, "inflation.md"), "w") as f:
            f.write("# Inflation\nInflation is the rate at which prices rise over time.")

    @patch("sentence_transformers.SentenceTransformer")
    def test_build_index_and_retrieve(self, MockST):
        mock_model = MagicMock()
        MockST.return_value = mock_model

        def fake_encode(texts, show_progress_bar=False):
            results = []
            for text in texts:
                if "gdp" in text.lower() or "output" in text.lower():
                    results.append(np.array([1.0, 0.0, 0.0], dtype=np.float32))
                else:
                    results.append(np.array([0.0, 1.0, 0.0], dtype=np.float32))
            return np.array(results, dtype=np.float32)

        mock_model.encode.side_effect = fake_encode

        import importlib
        import app.services.rag as rag_mod
        importlib.reload(rag_mod)
        rag_mod._model = mock_model
        rag_mod.build_index(self.tmp)

        results = rag_mod.retrieve("What is GDP?", top_k=1)
        self.assertEqual(len(results), 1)
        self.assertIn("GDP", results[0])

    @patch("sentence_transformers.SentenceTransformer")
    def test_retrieve_returns_empty_when_index_not_built(self, MockST):
        import importlib
        import app.services.rag as rag_mod
        importlib.reload(rag_mod)
        rag_mod._chunks = []
        rag_mod._index = None

        results = rag_mod.retrieve("anything")
        self.assertEqual(results, [])

    @patch("sentence_transformers.SentenceTransformer")
    def test_retrieve_top_k_limit(self, MockST):
        mock_model = MagicMock()
        MockST.return_value = mock_model
        mock_model.encode.return_value = np.ones((2, 3), dtype=np.float32)

        import importlib
        import app.services.rag as rag_mod
        importlib.reload(rag_mod)
        rag_mod._model = mock_model
        rag_mod.build_index(self.tmp)

        results = rag_mod.retrieve("any query", top_k=1)
        self.assertEqual(len(results), 1)

    @patch("sentence_transformers.SentenceTransformer")
    def test_build_index_missing_dir(self, MockST):
        import importlib
        import app.services.rag as rag_mod
        importlib.reload(rag_mod)
        mock_model = MagicMock()
        MockST.return_value = mock_model
        rag_mod._model = mock_model

        rag_mod.build_index("/nonexistent/path/to/kb")
        self.assertEqual(rag_mod._chunks, [])
        self.assertIsNone(rag_mod._index)
