"""
Tests for observation DB indexes and the ensure_indexes migration.
"""
import unittest

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.migrations import ensure_indexes
from app.models import Country, Indicator, Observation


def _make_engine():
    return create_engine("sqlite:///:memory:", future=True)


def _seed(session):
    c = Country(code="KZ", name="Kazakhstan")
    i = Indicator(code="GDP", name="GDP", source="wb")
    session.add_all([c, i])
    session.flush()
    session.add_all([
        Observation(country_id=c.id, indicator_id=i.id, year=y, value=float(y), source="wb")
        for y in range(2000, 2020)
    ])
    session.commit()
    return c, i


class TestEnsureIndexesIdempotent(unittest.TestCase):
    """ensure_indexes() must succeed when called multiple times on the same DB."""

    def test_runs_twice_without_error(self):
        engine = _make_engine()
        Base.metadata.create_all(bind=engine)
        ensure_indexes(engine)
        ensure_indexes(engine)  # second call must not raise

    def test_indexes_exist_after_migration(self):
        engine = _make_engine()
        Base.metadata.create_all(bind=engine)
        ensure_indexes(engine)

        inspector = inspect(engine)
        index_names = {idx["name"] for idx in inspector.get_indexes("observations")}
        self.assertIn("idx_obs_indicator_id", index_names)
        self.assertIn("idx_obs_year", index_names)

    def test_idempotent_on_fresh_db(self):
        """On a fresh DB (create_all already created the indexes), ensure_indexes is a no-op."""
        engine = _make_engine()
        Base.metadata.create_all(bind=engine)  # indexes created by __table_args__

        inspector = inspect(engine)
        before = {idx["name"] for idx in inspector.get_indexes("observations")}
        self.assertIn("idx_obs_indicator_id", before)

        ensure_indexes(engine)  # should not raise even though index already exists

        after = {idx["name"] for idx in inspector.get_indexes("observations")}
        self.assertEqual(before, after)


class TestIndexUsage(unittest.TestCase):
    """EXPLAIN QUERY PLAN must show SEARCH (index scan) for indexed queries."""

    @classmethod
    def setUpClass(cls):
        cls.engine = _make_engine()
        Base.metadata.create_all(bind=cls.engine)
        ensure_indexes(cls.engine)
        Session = sessionmaker(bind=cls.engine)
        session = Session()

        # Seed 30 countries x 5 indicators x 20 years = 3 000 rows
        countries = [Country(code=f"C{n:02d}", name=f"Country {n}") for n in range(1, 31)]
        indicators = [Indicator(code=f"I{n}", name=f"Ind {n}", source="wb") for n in range(1, 6)]
        session.add_all(countries + indicators)
        session.flush()
        obs = [
            Observation(
                country_id=c.id, indicator_id=i.id,
                year=y, value=float(c.id + i.id + y), source="wb",
            )
            for c in countries
            for i in indicators
            for y in range(2000, 2020)
        ]
        session.add_all(obs)
        session.commit()
        cls.session = session

    def _plan(self, sql):
        rows = self.session.execute(text(f"EXPLAIN QUERY PLAN {sql}")).fetchall()
        return " | ".join(str(r[-1]) for r in rows).upper()

    def test_timeseries_uses_composite_index(self):
        plan = self._plan(
            "SELECT year, value FROM observations "
            "WHERE country_id = 1 AND indicator_id = 1 ORDER BY year"
        )
        # SQLite may name the unique-constraint index "uq_obs" (explicit) or
        # "sqlite_autoindex_observations_1" (auto-generated) depending on dialect.
        self.assertIn("SEARCH", plan, f"Expected index SEARCH, got: {plan}")
        self.assertNotIn("SCAN TABLE", plan, f"Unexpected full table scan: {plan}")

    def test_indicator_filter_uses_idx_obs_indicator_id(self):
        plan = self._plan(
            "SELECT country_id, AVG(value) FROM observations "
            "WHERE indicator_id = 2 GROUP BY country_id"
        )
        self.assertIn("IDX_OBS_INDICATOR_ID", plan, f"Expected indicator index, got: {plan}")

    def test_year_range_uses_idx_obs_year(self):
        plan = self._plan(
            "SELECT country_id, indicator_id, AVG(value) FROM observations "
            "WHERE year BETWEEN 2005 AND 2015 GROUP BY country_id, indicator_id"
        )
        self.assertIn("IDX_OBS_YEAR", plan, f"Expected year index, got: {plan}")


class TestObservationUniqueConstraint(unittest.TestCase):
    """uq_obs must prevent duplicate (country, indicator, year) rows."""

    def test_duplicate_row_raises(self):
        from sqlalchemy.exc import IntegrityError

        engine = _make_engine()
        Base.metadata.create_all(bind=engine)
        Session = sessionmaker(bind=engine)
        session = Session()

        c = Country(code="US", name="USA")
        i = Indicator(code="INF", name="Inflation", source="wb")
        session.add_all([c, i])
        session.flush()

        session.add(Observation(country_id=c.id, indicator_id=i.id, year=2020, value=1.0, source="wb"))
        session.commit()

        session.add(Observation(country_id=c.id, indicator_id=i.id, year=2020, value=2.0, source="wb"))
        with self.assertRaises(IntegrityError):
            session.commit()


if __name__ == "__main__":
    unittest.main()
