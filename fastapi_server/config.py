from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache
import os
from dotenv import load_dotenv

# Load .env from sibling server directory (shared config)
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'server', '.env'))


class Settings(BaseSettings):
    # MongoDB
    mongodb_uri: str = Field(default="", alias="MONGODB_URI")

    # Google OAuth
    google_client_id: str = Field(default="", alias="GOOGLE_CLIENT_ID")
    google_client_secret: str = Field(default="", alias="GOOGLE_CLIENT_SECRET")

    # JWT
    jwt_secret: str = Field(default="", alias="JWT_SECRET")
    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 7

    # Client
    client_url: str = Field(default="http://localhost:5173", alias="CLIENT_URL")

    # Groq AI
    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")

    # Server (don't use 'port' — that picks up PORT=3001 from Node.js .env)
    fastapi_port: int = 8000

    model_config = {"populate_by_name": True}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
