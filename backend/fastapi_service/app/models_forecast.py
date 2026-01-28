from sqlalchemy import Column, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db import Base


class ForecastRun(Base):
    __tablename__ = "forecast_runs"

    id = Column(Integer, primary_key=True)
    country_id = Column(Integer, ForeignKey("countries.id"), nullable=False)
    target_indicator_id = Column(Integer, ForeignKey("indicators.id"), nullable=False)
    model_name = Column(String(128), nullable=False)
    horizon_years = Column(Integer, nullable=False)
    assumptions = Column(Text, nullable=True)
    metrics = Column(Text, nullable=True)

    country = relationship("Country")
    target_indicator = relationship("Indicator")
    points = relationship("ForecastPoint", back_populates="run")


class ForecastPoint(Base):
    __tablename__ = "forecast_points"

    id = Column(Integer, primary_key=True)
    run_id = Column(Integer, ForeignKey("forecast_runs.id"), nullable=False)
    year = Column(Integer, nullable=False)
    value = Column(Float, nullable=False)
    lower = Column(Float, nullable=True)
    upper = Column(Float, nullable=True)

    run = relationship("ForecastRun", back_populates="points")
