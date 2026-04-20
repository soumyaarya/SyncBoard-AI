from motor.motor_asyncio import AsyncIOMotorClient
from config import get_settings

settings = get_settings()

client = AsyncIOMotorClient(settings.mongodb_uri)

# Mongoose defaults to 'test' when no DB name is specified in the Atlas URI.
# Confirmed by inspecting mongoose.connection.db.databaseName at runtime.
db = client["test"]

# Collections (matching Mongoose model names)
users_collection = db["users"]
rooms_collection = db["rooms"]
drawings_collection = db["drawings"]

#health check checking mongodb connection
async def ping_db():
    """Test database connectivity."""
    await client.admin.command("ping")
    print(f"MongoDB connected successfully")
