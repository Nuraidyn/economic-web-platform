from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db import Base


class Country(Base):
    __tablename__ = "countries"

    id = Column(Integer, primary_key=True)
    code = Column(String(8), unique=True, nullable=False)
    name = Column(String(128), nullable=False)

    observations = relationship("Observation", back_populates="country")


class Indicator(Base):
    __tablename__ = "indicators"

    id = Column(Integer, primary_key=True)
    code = Column(String(64), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    source = Column(String(64), nullable=False)
    unit = Column(String(64), nullable=True)
    description = Column(Text, nullable=True)

    observations = relationship("Observation", back_populates="indicator")


class Observation(Base):
    __tablename__ = "observations"

    id = Column(Integer, primary_key=True)
    country_id = Column(Integer, ForeignKey("countries.id"), nullable=False)
    indicator_id = Column(Integer, ForeignKey("indicators.id"), nullable=False)
    year = Column(Integer, nullable=False)
    value = Column(Float, nullable=True)
    source = Column(String(64), nullable=False)
    is_estimate = Column(Boolean, default=False)

    country = relationship("Country", back_populates="observations")
    indicator = relationship("Indicator", back_populates="observations")

    __table_args__ = (UniqueConstraint("country_id", "indicator_id", "year", name="uq_obs"),)
