"""
Lightweight DDL migration for existing databases.

The project uses SQLAlchemy create_all() for new databases — indexes declared
in __table_args__ are created automatically.  For databases that already existed
before this migration was added, ensure_indexes() applies the new indexes via
CREATE INDEX IF NOT EXISTS, which is idempotent and safe to run on every startup.

Supported dialects: SQLite, PostgreSQL.
"""
import logging

from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

# (index_name, table, column(s)) — must match Index declarations in models.py
_INDEXES: list[tuple[str, str, str]] = [
    ("idx_obs_indicator_id", "observations", "indicator_id"),
    ("idx_obs_year",         "observations", "year"),
]


def ensure_indexes(engine: Engine) -> None:
    """Create any missing observation indexes — safe to call on every startup."""
    with engine.begin() as conn:
        for name, table, columns in _INDEXES:
            sql = f"CREATE INDEX IF NOT EXISTS {name} ON {table}({columns})"
            conn.execute(text(sql))
            logger.debug("ensure_indexes: applied %s", name)
    logger.info("ensure_indexes: all observation indexes verified")
