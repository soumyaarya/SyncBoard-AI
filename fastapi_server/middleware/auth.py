from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from typing import Optional
from config import get_settings

security = HTTPBearer(auto_error=False)
settings = get_settings()


def decode_token(token: str) -> dict:
    """Decode and verify a JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError:
        return None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """
    Required auth dependency.
    Returns the decoded JWT user or raises 401.
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="No token provided. Authentication required.")

    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token. Authentication failed.")

    return {
        "id": payload.get("id"),
        "email": payload.get("email"),
        "name": payload.get("name"),
        "avatar": payload.get("avatar"),
    }


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[dict]:
    """
    Optional auth dependency.
    Returns the decoded JWT user or None (no error raised).
    """
    if not credentials:
        return None

    payload = decode_token(credentials.credentials)
    if not payload:
        return None

    return {
        "id": payload.get("id"),
        "email": payload.get("email"),
        "name": payload.get("name"),
        "avatar": payload.get("avatar"),
    }


def create_token(user_data: dict) -> str:
    """Create a JWT token for a user."""
    from datetime import datetime, timedelta

    payload = {
        "id": str(user_data["_id"]),
        "email": user_data["email"],
        "name": user_data["name"],
        "avatar": user_data.get("avatar"),
        "exp": datetime.utcnow() + timedelta(days=settings.jwt_expire_days),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
