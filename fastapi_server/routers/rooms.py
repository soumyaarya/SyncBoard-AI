from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
from bson import ObjectId
from datetime import datetime

from database import rooms_collection
from middleware.auth import get_current_user, get_optional_user
from models.schemas import RoomUpdateName

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


@router.get("/debug")
async def debug_rooms():
    """DEBUG: Show raw room data to diagnose query issues. TEMPORARY - remove after debugging."""
    # Show all rooms in the collection
    all_rooms = []
    async for room in rooms_collection.find().limit(10):
        # Convert ObjectId fields to strings for JSON
        raw = {}
        for key, val in room.items():
            if hasattr(val, '__str__') and key == '_id':
                raw[key] = str(val)
            elif key == 'owner':
                raw[key] = f"{val} (type: {type(val).__name__})"
            elif key == 'participants':
                raw[key] = [f"{p} (type: {type(p).__name__})" for p in val]
            else:
                raw[key] = str(val)
        all_rooms.append(raw)

    return {
        "total_rooms_in_db": await rooms_collection.count_documents({}),
        "sample_rooms": all_rooms,
    }


def serialize_room(room: dict) -> dict:
    """Convert MongoDB room document to JSON-safe dict."""
    if room is None:
        return None
    room["_id"] = str(room["_id"])
    if room.get("owner"):
        room["owner"] = str(room["owner"])
    # Filter out null participants (e.g. guests who joined without an account)
    if room.get("participants") is not None:
        room["participants"] = [str(p) for p in room["participants"] if p is not None]
    if room.get("createdAt"):
        room["createdAt"] = room["createdAt"].isoformat()
    # Always provide a lastActivity — fall back to createdAt so time is never 'Unknown'
    last_activity = room.get("lastActivity") or room.get("createdAt")
    room["lastActivity"] = last_activity.isoformat() if last_activity else None
    return room


@router.get("/")
async def get_rooms(user: dict = Depends(get_current_user)):
    """Get all rooms for authenticated user."""
    try:
        user_id = ObjectId(user["id"])
        print(f"[DEBUG] Fetching rooms for user_id: {user_id} (raw: {user['id']})")

        # Also try matching the raw string ID in case owner was stored as string
        cursor = rooms_collection.find({
            "$or": [
                {"owner": user_id},
                {"owner": user["id"]},
                {"participants": user_id},
                {"participants": user["id"]},
            ]
        }).sort("lastActivity", -1)

        rooms = []
        async for room in cursor:
            rooms.append(serialize_room(room))

        print(f"[DEBUG] Found {len(rooms)} rooms for user {user['id']}")
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
