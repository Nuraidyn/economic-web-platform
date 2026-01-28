from typing import Optional

import jwt

from app.core.config import JWT_ALGORITHM, JWT_SECRET


def verify_jwt(token: str) -> Optional[dict]:
    if not token:
        return None
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None
