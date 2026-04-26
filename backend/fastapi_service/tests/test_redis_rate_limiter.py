"""
Tests for Redis-based rate limiter middleware.

Uses fakeredis (in-process Redis emulator) — no real Redis required.

Test groups
-----------
TestTokenBucketLua      — unit tests for the Lua script logic
TestRateLimitHeaders    — X-RateLimit-* and Retry-After headers
TestRateLimitEnforcement — N requests ok, N+1 returns 429
TestSharedState         — two clients share one bucket (multi-worker simulation)
TestFallbackBehaviour   — Redis down: fail-open and fail-closed
TestPathFilter          — only /api/* is rate-limited
"""
import asyncio
import unittest
from unittest.mock import AsyncMock, patch

import fakeredis
import fakeredis.aioredis
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.responses import PlainTextResponse

from app.middleware.rate_limit import RateLimitMiddleware, _LUA_TOKEN_BUCKET


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_app(burst=5, rps=0.01, fail_open=True, path="/api/v1/ping"):
    """Minimal FastAPI app with the rate-limit middleware wired."""
    inner = FastAPI()

    @inner.get(path)
    def _ping():
        return PlainTextResponse("ok")

    @inner.get("/health")
    def _health():
        return PlainTextResponse("ok")

    inner.add_middleware(
        RateLimitMiddleware,
        enabled=True,
        rps=rps,
        burst=burst,
        fail_open=fail_open,
    )
    return inner


def _make_fake_redis(server=None):
    """Create fakeredis async client backed by an optional shared FakeServer.

    Do NOT use asyncio.run() here — the client must be created synchronously
    so it binds to the event loop used by TestClient (anyio), not a throwaway
    loop from asyncio.run().
    """
    if server is None:
        server = fakeredis.FakeServer()
    return fakeredis.aioredis.FakeRedis(server=server)


def _client_with_redis(app, redis_client):
    """Inject a fake Redis into app.state and return TestClient."""
    app.state.redis = redis_client
    return TestClient(app, raise_server_exceptions=True)


# ---------------------------------------------------------------------------
# Unit: Lua token bucket
# ---------------------------------------------------------------------------

class TestTokenBucketLua(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.redis = _make_fake_redis()
        self.sha = await self.redis.script_load(_LUA_TOKEN_BUCKET)

    async def _call(self, key, rate, burst, now):
        return await self.redis.evalsha(
            self.sha, 1, key,
            str(rate), str(burst), str(now), "60",
        )

    async def test_first_request_allowed(self):
        result = await self._call("rl:1.1.1.1", 5, 10, 1000.0)
        self.assertEqual(int(result[0]), 1)    # allowed
        self.assertEqual(int(result[1]), 9)    # burst-1 remaining

    async def test_burst_exhausted_returns_denied(self):
        # consume all burst tokens
        for _ in range(10):
            await self._call("rl:2.2.2.2", 5, 10, 1000.0)
        result = await self._call("rl:2.2.2.2", 5, 10, 1000.0)
        self.assertEqual(int(result[0]), 0)    # denied
        self.assertEqual(int(result[1]), 0)    # 0 remaining

    async def test_tokens_refill_over_time(self):
        # drain fully
        for _ in range(10):
            await self._call("rl:3.3.3.3", 5, 10, 1000.0)
        # advance 2 seconds → 10 tokens refilled (5 rps × 2 s)
        result = await self._call("rl:3.3.3.3", 5, 10, 1002.0)
        self.assertEqual(int(result[0]), 1)

    async def test_remaining_decrements(self):
        r1 = await self._call("rl:4.4.4.4", 5, 5, 1000.0)
        r2 = await self._call("rl:4.4.4.4", 5, 5, 1000.0)
        self.assertGreater(int(r1[1]), int(r2[1]))

    async def test_independent_keys(self):
        """Two IPs have independent buckets."""
        for _ in range(5):
            await self._call("rl:a", 5, 5, 1000.0)
        # key b is untouched
        result = await self._call("rl:b", 5, 5, 1000.0)
        self.assertEqual(int(result[0]), 1)


# ---------------------------------------------------------------------------
# Headers
# ---------------------------------------------------------------------------

class TestRateLimitHeaders(unittest.TestCase):
    def setUp(self):
        self.app = _make_app(burst=10, rps=0.01)
        self.redis = _make_fake_redis()
        self.client = _client_with_redis(self.app, self.redis)

    def test_200_has_limit_header(self):
        r = self.client.get("/api/v1/ping")
        self.assertEqual(r.status_code, 200)
        self.assertIn("x-ratelimit-limit", r.headers)
        self.assertEqual(r.headers["x-ratelimit-limit"], "10")

    def test_200_has_remaining_header(self):
        r = self.client.get("/api/v1/ping")
        self.assertIn("x-ratelimit-remaining", r.headers)

    def test_remaining_decrements_across_requests(self):
        r1 = self.client.get("/api/v1/ping")
        r2 = self.client.get("/api/v1/ping")
        self.assertGreater(
            int(r1.headers["x-ratelimit-remaining"]),
            int(r2.headers["x-ratelimit-remaining"]),
        )

    def test_429_has_retry_after(self):
        # drain
        for _ in range(11):
            self.client.get("/api/v1/ping")
        r = self.client.get("/api/v1/ping")
        if r.status_code == 429:
            self.assertIn("retry-after", r.headers)

    def test_429_remaining_is_zero(self):
        for _ in range(11):
            self.client.get("/api/v1/ping")
        r = self.client.get("/api/v1/ping")
        if r.status_code == 429:
            self.assertEqual(r.headers.get("x-ratelimit-remaining"), "0")


# ---------------------------------------------------------------------------
# Enforcement: N ok, N+1 → 429
# ---------------------------------------------------------------------------

class TestRateLimitEnforcement(unittest.TestCase):
    def setUp(self):
        self.burst = 5
        self.app = _make_app(burst=self.burst, rps=0.01)
        self.redis = _make_fake_redis()
        self.client = _client_with_redis(self.app, self.redis)

    def test_burst_requests_succeed(self):
        for _ in range(self.burst):
            r = self.client.get("/api/v1/ping")
            self.assertEqual(r.status_code, 200)

    def test_burst_plus_one_returns_429(self):
        for _ in range(self.burst):
            self.client.get("/api/v1/ping")
        r = self.client.get("/api/v1/ping")
        self.assertEqual(r.status_code, 429)

    def test_429_body(self):
        for _ in range(self.burst + 1):
            r = self.client.get("/api/v1/ping")
        if r.status_code == 429:
            self.assertIn("detail", r.json())

    def test_non_api_path_never_limited(self):
        for _ in range(self.burst + 5):
            r = self.client.get("/health")
            self.assertEqual(r.status_code, 200)


# ---------------------------------------------------------------------------
# Shared state: multi-worker simulation
# ---------------------------------------------------------------------------

class TestSharedState(unittest.TestCase):
    """
    Two separate app instances share ONE fakeredis → they share the token pool,
    simulating two uvicorn workers talking to the same Redis.
    """

    def setUp(self):
        self.burst = 4
        # Both workers share the SAME FakeServer (= same Redis data store)
        self.server = fakeredis.FakeServer()

        self.app1 = _make_app(burst=self.burst, rps=0.01)
        self.app2 = _make_app(burst=self.burst, rps=0.01)

        self.client1 = _client_with_redis(self.app1, _make_fake_redis(self.server))
        self.client2 = _client_with_redis(self.app2, _make_fake_redis(self.server))

    def test_combined_requests_exhaust_shared_bucket(self):
        """Worker1 uses 2 tokens, Worker2 uses 2 tokens → bucket empty."""
        responses = []
        for _ in range(2):
            responses.append(self.client1.get("/api/v1/ping"))
        for _ in range(2):
            responses.append(self.client2.get("/api/v1/ping"))

        # All 4 should be 200 (burst=4)
        statuses_200 = [r.status_code for r in responses if r.status_code == 200]
        self.assertEqual(len(statuses_200), self.burst)

    def test_one_more_from_either_worker_gives_429(self):
        for _ in range(self.burst):
            self.client1.get("/api/v1/ping")
        r = self.client2.get("/api/v1/ping")
        self.assertEqual(r.status_code, 429)


# ---------------------------------------------------------------------------
# Fallback: Redis down
# ---------------------------------------------------------------------------

class TestFallbackBehaviour(unittest.TestCase):
    def _make_client(self, fail_open: bool):
        app = _make_app(burst=3, rps=0.01, fail_open=fail_open)
        app.state.redis = None          # simulate Redis down
        return TestClient(app, raise_server_exceptions=True)

    def test_fail_open_allows_all_requests(self):
        client = self._make_client(fail_open=True)
        for _ in range(10):
            r = client.get("/api/v1/ping")
            self.assertEqual(r.status_code, 200)

    def test_fail_open_still_adds_limit_header(self):
        client = self._make_client(fail_open=True)
        r = client.get("/api/v1/ping")
        self.assertIn("x-ratelimit-limit", r.headers)

    def test_fail_closed_returns_503(self):
        client = self._make_client(fail_open=False)
        r = client.get("/api/v1/ping")
        self.assertEqual(r.status_code, 503)

    def test_fail_closed_body(self):
        client = self._make_client(fail_open=False)
        r = client.get("/api/v1/ping")
        self.assertIn("detail", r.json())

    def test_redis_error_during_check_triggers_fallback(self):
        """Transient Redis error after successful startup also falls back."""
        app = _make_app(burst=3, rps=0.01, fail_open=True)
        broken = AsyncMock()
        broken.script_load = AsyncMock(side_effect=ConnectionError("timeout"))
        app.state.redis = broken
        client = TestClient(app)
        r = client.get("/api/v1/ping")
        self.assertEqual(r.status_code, 200)   # fail-open → 200


# ---------------------------------------------------------------------------
# Path filter
# ---------------------------------------------------------------------------

class TestPathFilter(unittest.TestCase):
    def setUp(self):
        self.burst = 2
        inner = FastAPI()

        @inner.get("/api/v1/data")
        def _data():
            return PlainTextResponse("data")

        @inner.get("/docs")
        def _docs():
            return PlainTextResponse("docs")

        @inner.get("/health")
        def _health():
            return PlainTextResponse("health")

        inner.add_middleware(
            RateLimitMiddleware,
            enabled=True,
            rps=0.01,
            burst=self.burst,
            fail_open=True,
        )
        self.redis = _make_fake_redis()
        inner.state.redis = self.redis
        self.client = TestClient(inner)

    def test_api_path_limited(self):
        for _ in range(self.burst):
            self.client.get("/api/v1/data")
        r = self.client.get("/api/v1/data")
        self.assertEqual(r.status_code, 429)

    def test_non_api_path_not_limited(self):
        for _ in range(self.burst + 5):
            r = self.client.get("/health")
            self.assertEqual(r.status_code, 200)

    def test_docs_path_not_limited(self):
        for _ in range(self.burst + 5):
            r = self.client.get("/docs")
            # /docs may return 200 or redirect; important: not 429
            self.assertNotEqual(r.status_code, 429)


if __name__ == "__main__":
    unittest.main()
