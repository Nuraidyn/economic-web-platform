"""
Standalone migration script: add observation indexes to an existing database.

Usage:
    cd backend/fastapi_service
    python scripts/migrate_add_indexes.py
    python scripts/migrate_add_indexes.py --database-url sqlite:///./fastapi.db
    python scripts/migrate_add_indexes.py --database-url postgresql+psycopg://user:pw@host/db

The migration is idempotent: safe to run multiple times.
"""
import argparse
import logging
import sys

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")

from sqlalchemy import create_engine


def main():
    parser = argparse.ArgumentParser(description="Add observation indexes to the FastAPI database")
    parser.add_argument(
        "--database-url",
        default=None,
        help="SQLAlchemy URL (default: reads DATABASE_URL from env/.env)",
    )
    args = parser.parse_args()

    if args.database_url:
        db_url = args.database_url
    else:
        # Fall back to app config (reads .env)
        import os, sys
        sys.path.insert(0, str(__file__.replace("scripts/migrate_add_indexes.py", "")))
        from app.core.config import DATABASE_URL
        db_url = DATABASE_URL

    engine = create_engine(db_url, future=True)
    logging.info("Connecting to: %s", db_url.split("@")[-1] if "@" in db_url else db_url)

    from app.migrations import ensure_indexes
    ensure_indexes(engine)
    logging.info("Migration complete.")


if __name__ == "__main__":
    main()
