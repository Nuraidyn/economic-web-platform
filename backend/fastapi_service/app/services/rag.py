from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

_model = None
_chunks: list[str] = []
_index: Optional[np.ndarray] = None  # shape (N, D)

_CHUNK_SIZE = 300   # approx words per chunk
_CHUNK_OVERLAP = 50
_MODEL_NAME = "all-MiniLM-L6-v2"


def _load_model():
    global _model
    if _model is not None:
        return _model
    from sentence_transformers import SentenceTransformer
    logger.info("rag: loading embedding model %s", _MODEL_NAME)
    _model = SentenceTransformer(_MODEL_NAME)
    logger.info("rag: model loaded")
    return _model


def _split_chunks(text: str, size: int = _CHUNK_SIZE, overlap: int = _CHUNK_OVERLAP) -> list[str]:
    words = text.split()
    if not words:
        return []
    chunks = []
    step = max(1, size - overlap)
    for i in range(0, len(words), step):
        chunk = " ".join(words[i : i + size])
        if chunk:
            chunks.append(chunk)
    return chunks


def build_index(kb_dir: str | Path) -> None:
    global _chunks, _index

    kb_path = Path(kb_dir)
    if not kb_path.exists():
        logger.warning("rag: knowledge_base dir %s does not exist — RAG disabled", kb_dir)
        _chunks = []
        _index = None
        return

    raw_chunks: list[str] = []
    for md_file in sorted(kb_path.glob("*.md")):
        try:
            text = md_file.read_text(encoding="utf-8")
            text = re.sub(r"^#+\s+", "", text, flags=re.MULTILINE)
            file_chunks = _split_chunks(text)
            raw_chunks.extend(file_chunks)
            logger.debug("rag: indexed %d chunks from %s", len(file_chunks), md_file.name)
        except Exception as exc:
            logger.warning("rag: failed to read %s: %s", md_file, exc)

    if not raw_chunks:
        logger.warning("rag: no chunks found in %s", kb_dir)
        _chunks = []
        _index = None
        return

    model = _load_model()
    embeddings = model.encode(raw_chunks, show_progress_bar=False)
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1.0, norms)
    _index = (embeddings / norms).astype(np.float32)
    _chunks = raw_chunks
    logger.info("rag: index built — %d chunks from %s", len(_chunks), kb_dir)


def retrieve(query: str, top_k: int = 4) -> list[str]:
    if _index is None or not _chunks:
        return []
    model = _load_model()
    q_emb = model.encode([query], show_progress_bar=False)[0]
    norm = np.linalg.norm(q_emb)
    if norm == 0:
        return []
    q_emb = (q_emb / norm).astype(np.float32)
    scores = _index @ q_emb
    k = min(top_k, len(_chunks))
    top_indices = np.argsort(scores)[::-1][:k]
    return [_chunks[i] for i in top_indices]
