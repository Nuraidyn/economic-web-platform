"""
Redis-based token-bucket rate limiter (per-IP, per-API-path).

Algorithm: token bucket implemented as an atomic Lua script stored on the Redis
server.  Each bucket lives in a Redis hash key ``rl:{client_ip}`` with two
fields — ``t`` (current tokens, float) and ``ts`` (last-refill timestamp,
float seconds since epoch).

The Lua script is loaded once at startup via SCRIPT LOAD and called via EVALSHA
on every request, so it runs atomically on the Redis side without a round-trip
race condition.

Multi-worker behaviour
----------------------
All uvicorn workers share the same Redis backend, so the token bucket is global
per IP — a single ``burst``-token pool is shared across every worker process.
This solves the "N workers × burst" multiplication problem of the old in-memory
implementation.

Fallback
--------
If Redis is unavailable the middleware checks ``RATE_LIMIT_REDIS_FAIL_OPEN``:
  - ``1``  (default in dev) → allow all requests, log a warning once per window.
  - ``0``  (recommended in prod) → return HTTP 503 ``{"detail":"rate-limiter
    unavailable"}``.

Response headers (always added on 200, only Retry-After on 429)
---------------------------------------------------------------
  X-RateLimit-Limit:     maximum tokens (burst)
  X-RateLimit-Remaining: tokens remaining after this request
  Retry-After:           seconds to wait (only on HTTP 429)
"""
from __future__ import annotations

import logging
import time
from typing import Optional

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lua token-bucket script
# ---------------------------------------------------------------------------
# KEYS[1]  = bucket key  (e.g. "rl:127.0.0.1")
# ARGV[1]  = rate        (tokens replenished per second, float)
# ARGV[2]  = burst       (max tokens, integer)
# ARGV[3]  = now         (current unix timestamp, float seconds)
# ARGV[4]  = ttl         (key expiry in seconds, integer)
#
# Returns: { allowed (0|1), remaining (integer floor) }
_LUA_TOKEN_BUCKET = """
local key   = KEYS[1]
local rate  = tonumber(ARGV[1])
local burst = tonumber(ARGV[2])
local now   = tonumber(ARGV[3])
local ttl   = tonumber(ARGV[4])

local data  = redis.call('HMGET', key, 't', 'ts')
local tokens = tonumber(data[1])
local last   = tonumber(data[2])

if not tokens then
    -- First request: grant burst-1 tokens (consume one immediately)
    redis.call('HSET', key, 't', burst - 1, 'ts', now)
    redis.call('EXPIRE', key, ttl)
    return {1, burst - 1}
end

local elapsed = math.max(now - last, 0)
tokens = math.min(burst, tokens + elapsed * rate)

local allowed
if tokens >= 1.0 then
    tokens = tokens - 1.0
    allowed = 1
else
    allowed = 0
end

redis.call('HSET', key, 't', tokens, 'ts', now)
redis.call('EXPIRE', key, ttl)
return {allowed, math.floor(tokens)}
"""


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Token-bucket rate limiter backed by Redis.

    The Redis client is read from ``request.app.state.redis`` (set up in main.py
    startup event).  If the client is absent or a Redis error occurs the
    middleware honours the ``fail_open`` flag.
    """

    def __init__(
        self,
        app,
        enabled: bool = True,
        rps: float = 5.0,
        burst: int = 20,
        fail_open: bool = True,
    ):
        super().__init__(app)
        self.enabled = enabled
        self.rps = max(float(rps), 0.1)
        self.burst = max(int(burst), 1)
        self.fail_open = fail_open
        # TTL = time to refill from 0 to burst, + 1 s safety margin
        self._ttl = int(self.burst / self.rps) + 1
        self._sha: Optional[str] = None   # loaded on first request
        self._warn_logged = False

    # ------------------------------------------------------------------
    # helpers
    # ------------------------------------------------------------------

    def _client_ip(self, request: Request) -> str:
        if request.client:
            return request.client.host
        return "unknown"

    async def _load_script(self, redis_client) -> str:
        """SCRIPT LOAD once; cache the SHA."""
        if self._sha is None:
            self._sha = await redis_client.script_load(_LUA_TOKEN_BUCKET)
        return self._sha

    async def _check(self, redis_client, ip: str) -> tuple[bool, int]:
        """
        Returns (allowed, remaining).
        Raises redis.RedisError on connection failure.
        """
        sha = await self._load_script(redis_client)
        key = f"rl:{ip}"
        now = time.time()
        result = await redis_client.evalsha(
            sha, 1, key,
            str(self.rps), str(self.burst), str(now), str(self._ttl),
        )
        allowed = bool(int(result[0]))
        remaining = int(result[1])
        return allowed, remaining

    # ------------------------------------------------------------------
    # middleware entry point
    # ------------------------------------------------------------------

    async def dispatch(self, request: Request, call_next) -> Response:
        if not self.enabled:
            return await call_next(request)

        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        redis_client = getattr(request.app.state, "redis", None)

        # ---- Redis unavailable fallback --------------------------------
        if redis_client is None:
            if not self.fail_open:
                return JSONResponse(
                    status_code=503,
                    content={"detail": "rate-limiter unavailable"},
                )
            if not self._warn_logged:
                logger.warning(
                    "RateLimitMiddleware: Redis not available, running in "
                    "permissive mode (fail_open=True). All requests are allowed."
                )
                self._warn_logged = True
            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(self.burst)
            response.headers["X-RateLimit-Remaining"] = str(self.burst)
            return response

        # ---- normal Redis path -----------------------------------------
        ip = self._client_ip(request)
        try:
            allowed, remaining = await self._check(redis_client, ip)
            self._warn_logged = False  # Redis back online
        except Exception as exc:
            logger.warning("RateLimitMiddleware: Redis error: %s", exc)
            if not self.fail_open:
                return JSONResponse(
                    status_code=503,
                    content={"detail": "rate-limiter unavailable"},
                )
            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(self.burst)
            response.headers["X-RateLimit-Remaining"] = str(self.burst)
            return response

        if not allowed:
            retry_after = max(1, int(1.0 / self.rps))
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded"},
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(self.burst),
                    "X-RateLimit-Remaining": "0",
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.burst)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
