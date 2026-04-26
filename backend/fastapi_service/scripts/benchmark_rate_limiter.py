"""
Stress benchmark: Redis rate limiter — single vs multi-worker behaviour.

Shows the core problem that the Redis limiter solves:
  - Without shared state (fail-open / no Redis): every worker allows up to burst
    requests independently -> N_WORKERS * burst can sneak through.
  - With shared Redis bucket: the total burst is enforced globally.

Usage:
    cd backend/fastapi_service
    PYTHONPATH=. python scripts/benchmark_rate_limiter.py
"""
import sys
import time
import threading

import fakeredis
import fakeredis.aioredis
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.responses import PlainTextResponse

# -------------------------------------------------------------------------
# Config
# -------------------------------------------------------------------------
BURST = 10
N_REQUESTS_TOTAL = 300
N_WORKERS = 4

# -------------------------------------------------------------------------

def _make_base_app():
    inner = FastAPI()

    @inner.get("/api/v1/ping")
    def _ping():
        return PlainTextResponse("ok")

    return inner


def _run_requests(client, n, results):
    for _ in range(n):
        try:
            r = client.get("/api/v1/ping")
            results.append(r.status_code)
        except Exception:
            results.append(0)


def _bench(label, clients, n_per_worker):
    results = []
    threads = [
        threading.Thread(target=_run_requests, args=(c, n_per_worker, results))
        for c in clients
    ]
    t0 = time.perf_counter()
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    elapsed = time.perf_counter() - t0

    total = len(results)
    ok = results.count(200)
    limited = results.count(429)
    rps_throughput = total / elapsed
    print(f"  {label:50s}  200={ok:4d}  429={limited:4d}  "
          f"{rps_throughput:5.0f} req/s  ({elapsed*1000:.0f} ms)")
    return ok, limited


# -------------------------------------------------------------------------
# Scenario A: fail-open (no Redis) — simulates old per-worker in-memory
# Each worker has its own middleware instance with no shared state.
# -------------------------------------------------------------------------

def _make_failopen_clients(n_workers, burst):
    from app.middleware.rate_limit import RateLimitMiddleware

    clients = []
    for _ in range(n_workers):
        app = _make_base_app()
        app.add_middleware(RateLimitMiddleware, enabled=True, rps=0.01,
                           burst=burst, fail_open=True)
        app.state.redis = None   # Redis down -> fail-open
        clients.append(TestClient(app, raise_server_exceptions=False))
    return clients


# -------------------------------------------------------------------------
# Scenario B: Redis-backed shared bucket
# -------------------------------------------------------------------------

def _make_redis_clients(n_workers, burst):
    from app.middleware.rate_limit import RateLimitMiddleware

    server = fakeredis.FakeServer()
    clients = []
    for _ in range(n_workers):
        app = _make_base_app()
        app.add_middleware(RateLimitMiddleware, enabled=True, rps=0.01,
                           burst=burst, fail_open=False)
        app.state.redis = fakeredis.aioredis.FakeRedis(server=server)
        clients.append(TestClient(app, raise_server_exceptions=False))
    return clients


# -------------------------------------------------------------------------

def main():
    n_per_worker = N_REQUESTS_TOTAL // N_WORKERS
    total = n_per_worker * N_WORKERS

    print(f"\nBurst={BURST}  Workers={N_WORKERS}  "
          f"Requests={total} ({n_per_worker}/worker)\n")

    print("--- Single-worker ---")
    _bench("Fail-open / no Redis   (1 worker)", _make_failopen_clients(1, BURST), total)
    _bench("Redis shared bucket    (1 worker)", _make_redis_clients(1, BURST), total)

    print()
    print("--- Multi-worker ---")
    ok_old, lim_old = _bench(
        f"Fail-open / no Redis   ({N_WORKERS} workers, no shared state)",
        _make_failopen_clients(N_WORKERS, BURST), n_per_worker,
    )
    ok_new, lim_new = _bench(
        f"Redis shared bucket    ({N_WORKERS} workers, global limit)",
        _make_redis_clients(N_WORKERS, BURST), n_per_worker,
    )

    print()
    print("=" * 70)
    print("Key insight (multi-worker)")
    print("=" * 70)
    print(f"  Without Redis: {N_WORKERS} workers, no shared state")
    print(f"    -> allowed up to {ok_old} requests (no limiting at all in fail-open mode)")
    print(f"  With Redis: 1 shared bucket, burst={BURST}")
    print(f"    -> allowed {ok_new} requests (expected ~{BURST})")
    leakage = ok_old - ok_new
    print(f"  Redis enforcement prevents {leakage} extra requests slipping through.")


if __name__ == "__main__":
    main()
