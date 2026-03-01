from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import get_settings
from database import ping_db
from routers import auth, rooms, ai

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    await ping_db()
    print(f"FastAPI server ready on port {settings.fastapi_port}")
    yield
    # Shutdown
    print("FastAPI server shutting down")


app = FastAPI(
    title="SyncBoard API",
    description="FastAPI backend for the Real-Time Collaboration Whiteboard",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.client_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(rooms.router)
app.include_router(ai.router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    from datetime import datetime

    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=settings.fastapi_port, reload=True)
