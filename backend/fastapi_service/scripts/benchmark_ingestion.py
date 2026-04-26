"""
Benchmark: N+1 vs batch ingestion.

Runs both implementations against an in-memory SQLite DB and reports:
  - SQL query count
  - elapsed time (ms)
  - rows inserted

Usage:
    cd backend/fastapi_service
    python scripts/benchmark_ingestion.py
"""
import sys
import time

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import func

# ---- dataset size -------------------------------------------------------
N_YEARS = 64   # typical World Bank series length

FAKE_SERIES = [{"year": 1960 + i, "value": float(i)} for i in range(N_YEARS)]

# ---- helpers ------------------------------------------------------------

def _make_db():
    from app.db import Base
    import app.models           # noqa: F401 — register ORM classes
    import app.models_ingestion  # noqa: F401
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(bind=engine)
    return engine


def _count_queries(engine):
    """Return a mutable counter dict; incremented via SQLAlchemy event."""
    counter = {"n": 0}

    @event.listens_for(engine, "before_cursor_execute")
    def _inc(conn, cursor, statement, parameters, context, executemany):
        counter["n"] += 1

    return counter


def _setup_country_indicator(session):
    from app.models import Country, Indicator
    c = Country(code="KZ", name="Kazakhstan")
    i = Indicator(code="NY.GDP.MKTP.CD", name="GDP", source="world_bank")
    session.add_all([c, i])
    session.flush()
    return c, i


# ---- OLD implementation (N+1 loop) -------------------------------------

def _ingest_old(session, country, indicator, series):
    from app.models import Observation
    new_rows = 0
    for entry in series:
        exists = (
            session.query(Observation)
            .filter(
                Observation.country_id == country.id,
                Observation.indicator_id == indicator.id,
                Observation.year == entry["year"],
            )
            .first()
        )
        if exists:
            continue
        session.add(Observation(
            country_id=country.id,
            indicator_id=indicator.id,
            year=entry["year"],
            value=entry["value"],
            source="world_bank",
        ))
        new_rows += 1
    session.flush()
    return new_rows


# ---- NEW implementation (batch) ----------------------------------------

def _ingest_new(session, country, indicator, series):
    from app.models import Observation
    from app.services.ingestion import _load_existing_years
    existing_years = _load_existing_years(session, country.id, indicator.id)
    new_obs = [
        Observation(
            country_id=country.id,
            indicator_id=indicator.id,
            year=entry["year"],
            value=entry["value"],
            source="world_bank",
        )
        for entry in series
        if entry["year"] not in existing_years
    ]
    if new_obs:
        session.add_all(new_obs)
    session.flush()
    return len(new_obs)


# ---- runner ------------------------------------------------------------

def run_bench(label, ingest_fn, series, runs=5):
    results = []
    for _ in range(runs):
        engine = _make_db()
        counter = _count_queries(engine)
        Session = sessionmaker(bind=engine)
        session = Session()
        country, indicator = _setup_country_indicator(session)
        session.commit()

        # reset counter after setup
        counter["n"] = 0
        t0 = time.perf_counter()
        inserted = ingest_fn(session, country, indicator, series)
        session.commit()
        elapsed = (time.perf_counter() - t0) * 1000

        results.append({"queries": counter["n"], "ms": elapsed, "inserted": inserted})
        session.close()

    avg_q = sum(r["queries"] for r in results) / runs
    avg_ms = sum(r["ms"] for r in results) / runs
    ins = results[0]["inserted"]
    print(f"  {label:30s}  queries={avg_q:.0f}  elapsed={avg_ms:.2f} ms  inserted={ins}")
    return avg_q, avg_ms


def main():
    n = len(FAKE_SERIES)
    print(f"Benchmark: {n} rows, {5} runs each\n")

    print("--- First ingest (empty DB) ---")
    old_q1, old_ms1 = run_bench("OLD (N+1 loop)", _ingest_old, FAKE_SERIES)
    new_q1, new_ms1 = run_bench("NEW (batch)",    _ingest_new, FAKE_SERIES)

    print()
    print("--- Second ingest (all rows exist, idempotency) ---")
    # pre-seed the DB then run again

    def _seed_then_ingest_old(session, country, indicator, series):
        _ingest_old(session, country, indicator, series)
        session.commit()
        return _ingest_old(session, country, indicator, series)

    def _seed_then_ingest_new(session, country, indicator, series):
        _ingest_new(session, country, indicator, series)
        session.commit()
        return _ingest_new(session, country, indicator, series)

    old_q2, old_ms2 = run_bench("OLD (N+1 loop) re-ingest", _seed_then_ingest_old, FAKE_SERIES)
    new_q2, new_ms2 = run_bench("NEW (batch)    re-ingest", _seed_then_ingest_new, FAKE_SERIES)

    print()
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"{'Scenario':<35} {'OLD queries':>11} {'NEW queries':>11} {'Speedup':>8}")
    print("-" * 60)
    print(f"{'First ingest (N rows)':<35} {old_q1:>11.0f} {new_q1:>11.0f} {old_ms1/new_ms1:>7.1f}x")
    print(f"{'Re-ingest (all exist)':<35} {old_q2:>11.0f} {new_q2:>11.0f} {old_ms2/new_ms2:>7.1f}x")
    print()
    print(f"Query reduction (first ingest):  {old_q1:.0f} -> {new_q1:.0f}  "
          f"({(1 - new_q1/old_q1)*100:.0f}% fewer)")


if __name__ == "__main__":
    main()
