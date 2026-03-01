from fastapi import APIRouter, Request, Depends
from fastapi.responses import RedirectResponse, JSONResponse
from typing import Optional
import httpx
from urllib.parse import urlencode
from datetime import datetime

from config import get_settings
from database import users_collection
from middleware.auth import get_current_user, get_optional_user, create_token, decode_token

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

# Google OAuth redirect must come back to THIS server, not the frontend
GOOGLE_CALLBACK_URL = f"http://localhost:{settings.fastapi_port}/auth/google/callback"
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


@router.get("/google")
async def google_login():
    """Redirect to Google OAuth consent screen."""
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": GOOGLE_CALLBACK_URL,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url=url)


@router.get("/google/callback")
async def google_callback(code: str = None, error: str = None):
    """Handle Google OAuth callback — exchange code for token, upsert user, issue JWT."""
    if error or not code:
        return RedirectResponse(url=f"{settings.client_url}/login?error=auth_failed")

    try:
        # Exchange authorization code for access token
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": GOOGLE_CALLBACK_URL,
                },
            )
            token_data = token_response.json()

            if "access_token" not in token_data:
                return RedirectResponse(url=f"{settings.client_url}/login?error=auth_failed")

            # Get user info from Google
            userinfo_response = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
            )
            userinfo = userinfo_response.json()

        # Upsert user in MongoDB (matches Passport strategy behavior)
        existing_user = await users_collection.find_one({"googleId": userinfo["id"]})

        if existing_user:
            # Update existing user info
            await users_collection.update_one(
                {"googleId": userinfo["id"]},
                {
                    "$set": {
                        "name": userinfo.get("name", ""),
                        "avatar": userinfo.get("picture", ""),
                    }
                },
            )
            existing_user["name"] = userinfo.get("name", "")
            existing_user["avatar"] = userinfo.get("picture", "")
            user_data = existing_user
        else:
            # Create new user
            new_user = {
                "googleId": userinfo["id"],
                "email": userinfo.get("email", ""),
                "name": userinfo.get("name", ""),
                "avatar": userinfo.get("picture", ""),
                "createdAt": datetime.utcnow(),
            }
            result = await users_collection.insert_one(new_user)
            new_user["_id"] = result.inserted_id
            user_data = new_user

        # Generate JWT token (same format as Node.js)
        token = create_token(user_data)

        # Redirect to client with token (same as Node.js flow)
        return RedirectResponse(url=f"{settings.client_url}/auth/callback?token={token}")

    except Exception as e:
        print(f"OAuth error: {e}")
        return RedirectResponse(url=f"{settings.client_url}/login?error=auth_failed")


@router.get("/me")
async def get_me(request: Request):
    """Get current user from JWT token. Returns {user: null} if no/invalid token."""
    auth_header = request.headers.get("authorization", "")

    if not auth_header.startswith("Bearer "):
        return JSONResponse(content={"user": None})

    token = auth_header.split(" ")[1]
    payload = decode_token(token)

    if not payload:
        return JSONResponse(content={"user": None})

    return JSONResponse(content={
        "user": {
            "id": payload.get("id"),
            "name": payload.get("name"),
            "email": payload.get("email"),
            "avatar": payload.get("avatar"),
        }
    })


@router.get("/logout")
async def logout():
    """Logout endpoint - client should remove token."""
    return {"message": "Logout successful. Please remove the token from client."}
