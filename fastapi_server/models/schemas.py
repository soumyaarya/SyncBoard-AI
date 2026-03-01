from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """User schema matching the Mongoose User model."""
    id: str = Field(alias="_id", default=None)
    google_id: str = Field(alias="googleId")
    email: str
    name: str
    avatar: Optional[str] = None
    created_at: Optional[datetime] = Field(alias="createdAt", default=None)

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class UserInToken(BaseModel):
    """User data stored in JWT token."""
    id: str
    email: str
    name: str
    avatar: Optional[str] = None


class RoomBase(BaseModel):
    """Room schema matching the Mongoose Room model."""
    id: str = Field(alias="_id", default=None)
    room_id: str = Field(alias="roomId")
    name: str = "Untitled Whiteboard"
    owner: Optional[str] = None
    participants: list = []
    is_active: bool = Field(alias="isActive", default=True)
    created_at: Optional[datetime] = Field(alias="createdAt", default=None)
    last_activity: Optional[datetime] = Field(alias="lastActivity", default=None)

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class RoomUpdateName(BaseModel):
    """Request body for updating room name."""
    name: str
