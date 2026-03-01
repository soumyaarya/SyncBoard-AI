from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
from bson import ObjectId
from datetime import datetime

from database import rooms_collection
from middleware.auth import get_current_user, get_optional_user
from models.schemas import RoomUpdateName

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


def serialize_room(room: dict) -> dict:
    """Convert MongoDB room document to JSON-safe dict."""
    #mongoose does this automatically in fastapi we have to do it manually  
    if room is None:
        return None
    room["_id"] = str(room["_id"])
    if room.get("owner"):
        room["owner"] = str(room["owner"])
    if room.get("participants"):
        room["participants"] = [str(p) for p in room["participants"]]
    if room.get("createdAt"):
        room["createdAt"] = room["createdAt"].isoformat()
    if room.get("lastActivity"):
        room["lastActivity"] = room["lastActivity"].isoformat()
    return room


@router.get("/")
async def get_rooms(user: dict = Depends(get_current_user)):
    """Get all rooms for authenticated user."""
    try:
        user_id = ObjectId(user["id"])
        cursor = rooms_collection.find({
            "$or": [
                {"owner": user_id},
                {"participants": user_id},
            ]
        }).sort("updatedAt", -1)

        rooms = []
        async for room in cursor:
            rooms.append(serialize_room(room))

        return {"success": True, "rooms": rooms}
    except Exception as e:
        print(f"Error fetching rooms: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.get("/{room_id}")
#we use get_optional_user here because we want to allow public access to rooms
async def get_room(room_id: str, user: Optional[dict] = Depends(get_optional_user)):
    """Get a specific room (public or owned)."""
    try:
        room = await rooms_collection.find_one({"roomId": room_id})

        if not room:
            return JSONResponse(
                status_code=404,
                content={"success": False, "message": "Room not found"},
            )

        return {"success": True, "room": serialize_room(room)}
    except Exception as e:
        print(f"Error fetching room: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.delete("/{room_id}")
async def delete_room(room_id: str, user: dict = Depends(get_current_user)):
    """Delete a room (owner only)."""
    try:
        room = await rooms_collection.find_one({"roomId": room_id})

        if not room:
            return JSONResponse(
                status_code=404,
                content={"success": False, "message": "Room not found"},
            )

        # Check ownership
        if room.get("owner") and str(room["owner"]) != user["id"]:
            return JSONResponse(
                status_code=403,
                content={"success": False, "message": "Not authorized to delete this room"},
            )

        await rooms_collection.delete_one({"roomId": room_id})
        return {"success": True, "message": "Room deleted"}
    except Exception as e:
        print(f"Error deleting room: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.put("/{room_id}/name")
async def update_room_name(
    room_id: str,
    body: RoomUpdateName,
    user: dict = Depends(get_current_user),
):
    """Update room name (owner only)."""
    try:
        room = await rooms_collection.find_one({"roomId": room_id})

        if not room:
            return JSONResponse(
                status_code=404,
                content={"success": False, "message": "Room not found"},
            )

        # Check ownership
        if room.get("owner") and str(room["owner"]) != user["id"]:
            return JSONResponse(
                status_code=403,
                content={"success": False, "message": "Not authorized to update this room"},
            )

        await rooms_collection.update_one(
            {"roomId": room_id},
            {
                "$set": {
                    "name": body.name,
                    "lastActivity": datetime.utcnow(),
                }
            },
        )

        # Fetch updated room
        updated_room = await rooms_collection.find_one({"roomId": room_id})
        return {"success": True, "room": serialize_room(updated_room)}
    except Exception as e:
        print(f"Error updating room: {e}")
        raise HTTPException(status_code=500, detail="Server error")
