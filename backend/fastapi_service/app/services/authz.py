from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import Optional

import httpx
from cachetools import TTLCache

from app.core.config import (
    AUTHZ_CACHE_MAXSIZE,
    AUTHZ_CACHE_TTL_SECONDS,
    AUTHZ_INTROSPECT_PATH,
    AUTHZ_INTROSPECT_TIMEOUT_SECONDS,
    DJANGO_AUTH_URL,
)


@dataclass(frozen=True)
class AuthzContext:
    user_id: int
    role: str
    agreement_accepted: bool


class AuthzUnavailable(RuntimeError):
    """Django auth service is unavailable or returned unexpected response."""


class AuthzInvalidToken(RuntimeError):
    """Token is invalid/expired according to Django."""


# ---------------------------------------------------------------------------
# Bounded TTL cache
#
# cachetools.TTLCache auto-evicts entries:
#   - on TTL expiry (lazy, on next access of expired key)
#   - when maxsize is exceeded (LRU eviction of oldest entry)
#
# Not thread-safe by itself — all access goes through _CACHE_LOCK.
# ---------------------------------------------------------------------------

_ttl = max(AUTHZ_CACHE_TTL_SECONDS, 1)  # TTLCache requires ttl > 0
_CACHE: TTLCache[str, AuthzContext] = TTLCache(maxsize=AUTHZ_CACHE_MAXSIZE, ttl=_ttl)
_CACHE_LOCK = threading.Lock()

_hits = 0
_misses = 0


# ---------------------------------------------------------------------------
# Diagnostics
# ---------------------------------------------------------------------------

def get_cache_stats() -> dict:
    """Return a snapshot of cache diagnostics (safe to call at any time)."""
    with _CACHE_LOCK:
        return {
            "size": len(_CACHE),
            "maxsize": _CACHE.maxsize,
            "ttl_seconds": _CACHE.ttl,
            "hits": _hits,
            "misses": _misses,
        }


def clear_cache() -> None:
    """Evict all entries (useful in tests and admin tooling)."""
    global _hits, _misses
    with _CACHE_LOCK:
        _CACHE.clear()
        _hits = 0
        _misses = 0


# ---------------------------------------------------------------------------
# Internal cache helpers
# ---------------------------------------------------------------------------

def _cache_get(token: str) -> Optional[AuthzContext]:
    global _hits, _misses
    with _CACHE_LOCK:
        value = _CACHE.get(token)  # returns None for missing or expired keys
        if value is not None:
            _hits += 1
            return value
        _misses += 1
        return None


def _cache_set(token: str, value: AuthzContext) -> None:
    with _CACHE_LOCK:
        _CACHE[token] = value


# ---------------------------------------------------------------------------
# Public API — contract unchanged
# ---------------------------------------------------------------------------

def introspect_with_django(token: str) -> AuthzContext:
    """Validate token via Django introspection endpoint; caches successful results.

    Raises:
        AuthzInvalidToken  — token rejected by Django (401/403)
        AuthzUnavailable   — network error or unexpected Django response
    """
    cached = _cache_get(token)
    if cached is not None:
        return cached

    base = DJANGO_AUTH_URL.rstrip("/")
    path = AUTHZ_INTROSPECT_PATH if AUTHZ_INTROSPECT_PATH.startswith("/") else f"/{AUTHZ_INTROSPECT_PATH}"
    url = f"{base}{path}"
    headers = {"Authorization": f"Bearer {token}"}

    try:
        with httpx.Client(timeout=AUTHZ_INTROSPECT_TIMEOUT_SECONDS) as client:
            resp = client.get(url, headers=headers)
    except httpx.HTTPError as exc:
        raise AuthzUnavailable(str(exc)) from exc

    if resp.status_code in (401, 403):
        # Invalid/expired tokens are NOT cached — each request re-checks Django.
        raise AuthzInvalidToken("Invalid token")

    if resp.status_code >= 500:
        raise AuthzUnavailable(f"Django auth error ({resp.status_code})")

    try:
        resp.raise_for_status()
        payload = resp.json()
    except Exception as exc:
        raise AuthzUnavailable("Unexpected Django introspection response") from exc

    user_id = payload.get("user_id")
    role = payload.get("role")
    agreement_accepted = payload.get("agreement_accepted")
    if not isinstance(user_id, int) or not isinstance(role, str) or not isinstance(agreement_accepted, bool):
        raise AuthzUnavailable("Invalid introspection schema")

    ctx = AuthzContext(user_id=user_id, role=role, agreement_accepted=agreement_accepted)
    _cache_set(token, ctx)
    return ctx
