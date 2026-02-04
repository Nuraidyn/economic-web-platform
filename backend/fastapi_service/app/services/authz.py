from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Optional

import httpx

from app.core.config import (
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


_CACHE: dict[str, tuple[float, AuthzContext]] = {}


def _cache_get(token: str) -> Optional[AuthzContext]:
    item = _CACHE.get(token)
    if not item:
        return None
    expires_at, value = item
    if expires_at <= time.time():
        _CACHE.pop(token, None)
        return None
    return value


def _cache_set(token: str, value: AuthzContext) -> None:
    _CACHE[token] = (time.time() + max(AUTHZ_CACHE_TTL_SECONDS, 0), value)


def introspect_with_django(token: str) -> AuthzContext:
    cached = _cache_get(token)
    if cached:
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

