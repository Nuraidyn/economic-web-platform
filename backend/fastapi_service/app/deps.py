from __future__ import annotations

from typing import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import verify_jwt
from app.core.config import AUTHZ_INTROSPECT_STRICT
from app.services.authz import AuthzInvalidToken, AuthzUnavailable, AuthzContext, introspect_with_django

bearer_scheme = HTTPBearer(auto_error=False)


def get_token(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> str:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    return credentials.credentials


def get_jwt_payload(token: str = Depends(get_token)) -> dict:
    payload = verify_jwt(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return payload


def get_current_user(
    token: str = Depends(get_token),
    _: dict = Depends(get_jwt_payload),
) -> dict:
    """
    Backwards-compatible dependency (returns JWT payload).
    Prefer using `get_authz_context()` for role/agreement checks.
    """
    # jwt payload is validated in get_jwt_payload
    return verify_jwt(token) or {}


def get_authz_context(token: str = Depends(get_token)) -> AuthzContext:
    """
    Returns live authorization context (role + agreement) from Django introspection.

    We prefer Django introspection for the latest role/agreement state, and only fall back
    to local JWT verification if introspection is unavailable and non-strict mode is enabled.
    """
    try:
        return introspect_with_django(token)
    except AuthzInvalidToken:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except AuthzUnavailable as exc:
        if AUTHZ_INTROSPECT_STRICT:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Auth service unavailable",
            ) from exc
        jwt_payload = verify_jwt(token)
        if not jwt_payload:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
        # fallback to JWT claims (best-effort) when non-strict
        user_id = jwt_payload.get("user_id") or jwt_payload.get("id") or jwt_payload.get("sub") or 0
        try:
            user_id_int = int(user_id)
        except Exception:
            user_id_int = 0
        role = jwt_payload.get("role") or "user"
        agreement_accepted = bool(jwt_payload.get("agreement_accepted"))
        return AuthzContext(user_id=user_id_int, role=str(role), agreement_accepted=agreement_accepted)


def require_roles(*roles: str) -> Callable:
    def checker(ctx: AuthzContext = Depends(get_authz_context)):
        role = ctx.role
        roles_claim = None
        allowed = set(roles)
        if role and role in allowed:
            return ctx
        if isinstance(roles_claim, list) and any(item in allowed for item in roles_claim):
            return ctx
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")

    return checker


def require_agreement(ctx: AuthzContext = Depends(get_authz_context)):
    if not ctx.agreement_accepted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User agreement required",
        )
    return ctx
