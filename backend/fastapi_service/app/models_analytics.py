import json

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.sql import func

from app.db import Base


class LorenzResult(Base):
    __tablename__ = "lorenz_results"

    id = Column(Integer, primary_key=True)
    country_id = Column(Integer, ForeignKey("countries.id"), nullable=False)
    year = Column(Integer, nullable=False)
    points_json = Column(Text, nullable=False)
    gini = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("country_id", "year", name="uq_lorenz_result"),)

    def points(self):
        return json.loads(self.points_json)
