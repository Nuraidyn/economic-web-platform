from typing import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import verify_jwt

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    payload = verify_jwt(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return payload


def require_roles(*roles: str) -> Callable:
    def checker(payload: dict = Depends(get_current_user)):
        role = payload.get("role")
        roles_claim = payload.get("roles")
        allowed = set(roles)
        if role and role in allowed:
            return payload
        if isinstance(roles_claim, list) and any(item in allowed for item in roles_claim):
            return payload
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")

    return checker


def require_agreement(payload: dict = Depends(get_current_user)):
    if not payload.get("agreement_accepted"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User agreement required",
        )
    return payload
