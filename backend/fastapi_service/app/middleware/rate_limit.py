from __future__ import annotations

import threading
import time
from dataclasses import dataclass

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response


@dataclass
class _Bucket:
    tokens: float
    last_refill: float


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory token bucket rate limiter (per-IP).

    Notes:
    - Intended for local/dev and small deployments.
    - For multi-worker / distributed deployments, replace with Redis-based limiter.
    """

    def __init__(self, app, enabled: bool = True, rps: float = 5.0, burst: int = 20):
        super().__init__(app)
        self.enabled = enabled
        self.rps = max(float(rps), 0.1)
        self.burst = max(int(burst), 1)
        self._buckets: dict[str, _Bucket] = {}
        self._lock = threading.Lock()

    def _get_client_key(self, request: Request) -> str:
        client = request.client.host if request.client else "unknown"
        # For local/student use we avoid trusting X-Forwarded-For by default.
        return client

    def _allow(self, key: str) -> bool:
        now = time.monotonic()
        with self._lock:
            bucket = self._buckets.get(key)
            if not bucket:
                self._buckets[key] = _Bucket(tokens=float(self.burst - 1), last_refill=now)
                return True

            elapsed = max(now - bucket.last_refill, 0.0)
            bucket.tokens = min(float(self.burst), bucket.tokens + elapsed * self.rps)
            bucket.last_refill = now
            if bucket.tokens < 1.0:
                return False
            bucket.tokens -= 1.0
            return True

    async def dispatch(self, request: Request, call_next) -> Response:
        if not self.enabled:
            return await call_next(request)

        # Rate limit only API calls
        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        key = self._get_client_key(request)
        if not self._allow(key):
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded"},
                headers={"Retry-After": "1"},
            )

        return await call_next(request)

