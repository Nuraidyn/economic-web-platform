from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from app.db import Base


class IngestionRun(Base):
    __tablename__ = "ingestion_runs"

    id = Column(Integer, primary_key=True)
    source = Column(String(64), nullable=False)
    country_code = Column(String(8), nullable=False)
    indicator_code = Column(String(64), nullable=False)
    status = Column(String(32), nullable=False, default="started")
    inserted = Column(Integer, nullable=False, default=0)
    total = Column(Integer, nullable=False, default=0)
    expected = Column(Integer, nullable=False, default=0)
    missing = Column(Integer, nullable=False, default=0)
    error = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True), nullable=True)
