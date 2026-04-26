"""
Benchmark: EXPLAIN QUERY PLAN before and after observation indexes.

Creates an in-memory SQLite DB, seeds 61 200 rows (30 countries x 34 indicators
x 60 years), captures EXPLAIN QUERY PLAN for three representative queries,
then applies the indexes and repeats.

Usage:
    cd backend/fastapi_service
    python scripts/benchmark_indexes.py
"""
import sys
import time
import sqlite3

# ---- seed parameters ---------------------------------------------------
N_COUNTRIES  = 30
N_INDICATORS = 34
N_YEARS      = 60   # 1960-2019
TOTAL_ROWS   = N_COUNTRIES * N_INDICATORS * N_YEARS  # 61 200

# ---- benchmark queries -------------------------------------------------
QUERIES = [
    (
        "time-series for one country+indicator",
        """
        SELECT year, value
        FROM observations
        WHERE country_id = 5 AND indicator_id = 3
        ORDER BY year
        """,
    ),
    (
        "inequality ranking: all countries for one indicator",
        """
        SELECT country_id, AVG(value) AS avg_val
        FROM observations
        WHERE indicator_id = 7
        GROUP BY country_id
        ORDER BY avg_val DESC
        """,
    ),
    (
        "year-range scan across all countries+indicators",
        """
        SELECT country_id, indicator_id, AVG(value)
        FROM observations
        WHERE year BETWEEN 2000 AND 2019
        GROUP BY country_id, indicator_id
        """,
    ),
]


def seed(conn: sqlite3.Connection) -> None:
    conn.executescript("""
        CREATE TABLE observations (
            id           INTEGER PRIMARY KEY,
            country_id   INTEGER NOT NULL,
            indicator_id INTEGER NOT NULL,
            year         INTEGER NOT NULL,
            value        REAL,
            source       TEXT    NOT NULL DEFAULT 'bench',
            is_estimate  INTEGER NOT NULL DEFAULT 0
        );
        CREATE UNIQUE INDEX uq_obs ON observations(country_id, indicator_id, year);
    """)
    rows = [
        (cid, iid, yr, float(cid * iid + yr))
        for cid in range(1, N_COUNTRIES + 1)
        for iid in range(1, N_INDICATORS + 1)
        for yr  in range(1960, 1960 + N_YEARS)
    ]
    conn.executemany(
        "INSERT INTO observations(country_id, indicator_id, year, value) VALUES (?,?,?,?)",
        rows,
    )
    conn.commit()
    print(f"Seeded {len(rows):,} rows.")


def explain(conn: sqlite3.Connection, label: str, sql: str) -> None:
    plan_rows = conn.execute(f"EXPLAIN QUERY PLAN {sql}").fetchall()
    plan_text = " | ".join(r[-1] for r in plan_rows)
    print(f"  [{label}]  {plan_text}")


def measure_ms(conn: sqlite3.Connection, sql: str, runs: int = 20) -> float:
    t0 = time.perf_counter()
    for _ in range(runs):
        conn.execute(sql).fetchall()
    return (time.perf_counter() - t0) / runs * 1000


def run_suite(conn: sqlite3.Connection, phase: str) -> None:
    print(f"\n=== {phase} ===")
    for label, sql in QUERIES:
        explain(conn, label, sql)
        ms = measure_ms(conn, sql)
        print(f"         avg latency: {ms:.3f} ms")


def apply_indexes(conn: sqlite3.Connection) -> None:
    conn.executescript("""
        CREATE INDEX IF NOT EXISTS idx_obs_indicator_id ON observations(indicator_id);
        CREATE INDEX IF NOT EXISTS idx_obs_year         ON observations(year);
    """)
    conn.commit()
    print("\nIndexes applied: idx_obs_indicator_id, idx_obs_year")


def main() -> None:
    print(f"Benchmark: {TOTAL_ROWS:,} rows  "
          f"({N_COUNTRIES} countries x {N_INDICATORS} indicators x {N_YEARS} years)")

    conn = sqlite3.connect(":memory:")
    seed(conn)

    run_suite(conn, "BEFORE indexes (only uq_obs composite)")
    apply_indexes(conn)
    run_suite(conn, "AFTER  indexes (+ idx_obs_indicator_id + idx_obs_year)")

    conn.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
