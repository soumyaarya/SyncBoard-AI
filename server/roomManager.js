const { v4: uuidv4 } = require('uuid');
const Room = require('./models/Room');
const Drawing = require('./models/Drawing');

// In-memory storage for real-time state
const rooms = new Map(); // roomId -> { users: Map<socketId, userInfo>, drawingState: [] }

class RoomManager {
    // Create a new room
    async createRoom(userId, roomName = 'Untitled Whiteboard') {
        const roomId = uuidv4().substring(0, 8);

        // Create in database
        const room = await Room.create({
            roomId,
            name: roomName,
            owner: userId,
            participants: [userId]
        });

        // Create empty drawing document
        await Drawing.create({
            roomId,
            strokes: []
        });

        // Initialize in-memory state
        rooms.set(roomId, {
            users: new Map(),
            strokes: []
        });

        return { roomId, room };
    }

    // Join an existing room
    async joinRoom(roomId, socketId, user) {
        // Check if room exists in database
        let room = await Room.findOne({ roomId });

        if (!room) {
            throw new Error('Room not found');
        }

        // Add participant if not already added
        if (user && !room.participants.includes(user._id)) {
            room.participants.push(user._id);
            await room.save();
        }

        // Initialize in-memory if needed
        if (!rooms.has(roomId)) {
            const drawing = await Drawing.findOne({ roomId });
            rooms.set(roomId, {
                users: new Map(),
                strokes: drawing?.strokes || []
            });
        }

        const roomState = rooms.get(roomId);

        // Add user to room
        const userInfo = {
            id: user?._id?.toString() || socketId,
            name: user?.name || `Guest-${socketId.substring(0, 4)}`,
            avatar: user?.avatar || null,
            socketId,
            cursor: { x: 0, y: 0 }
        };

        roomState.users.set(socketId, userInfo);

        return {
            room,
            users: Array.from(roomState.users.values()),
            strokes: roomState.strokes
        };
    }

    // Leave a room
    async leaveRoom(roomId, socketId) {
        const roomState = rooms.get(roomId);

        if (!roomState) return null;

        const user = roomState.users.get(socketId);
        roomState.users.delete(socketId);

        // If room is empty, persist and cleanup
        if (roomState.users.size === 0) {
            // Save using a system user ID when room empties
            await this.saveDrawingDirect(roomId, roomState.strokes);
            rooms.delete(roomId);
        }

        return user;
    }

    // Get all users in a room
    getUsers(roomId) {
        const roomState = rooms.get(roomId);
        return roomState ? Array.from(roomState.users.values()) : [];
    }

    // Add stroke to room
    addStroke(roomId, stroke) {
        const roomState = rooms.get(roomId);
        if (roomState) {
            roomState.strokes.push(stroke);
        }
    }

    // Clear all strokes
    clearStrokes(roomId) {
        const roomState = rooms.get(roomId);
        if (roomState) {
            roomState.strokes = [];
        }
    }

    // Undo last stroke by user
    undoStroke(roomId, userId) {
        const roomState = rooms.get(roomId);
        if (!roomState) return null;

        // Find and remove last stroke by this user
        for (let i = roomState.strokes.length - 1; i >= 0; i--) {
            if (roomState.strokes[i].oderId === userId) {
                return roomState.strokes.splice(i, 1)[0];
            }
        }
        return null;
    }

    // Update cursor position
    updateCursor(roomId, socketId, cursor) {
        const roomState = rooms.get(roomId);
        if (roomState && roomState.users.has(socketId)) {
            const user = roomState.users.get(socketId);
            user.cursor = cursor;
        }
    }

    // Save drawing to database
    async saveDrawing(roomId, userId) {
        try {
            const roomState = rooms.get(roomId);
            const strokes = roomState ? roomState.strokes : [];

            await Drawing.findOneAndUpdate(
                { roomId },
                {
                    strokes,
                    lastModified: new Date(),
                    savedBy: userId
                },
                { upsert: true }
            );

            // Also update the room's last activity
            await Room.findOneAndUpdate(
                { roomId },
                { lastActivity: new Date() }
            );
        } catch (error) {
            console.error('Error saving drawing:', error);
            throw error;
        }
    }

    // Save drawing directly with strokes (for auto-save when room empties)
    async saveDrawingDirect(roomId, strokes) {
        try {
            await Drawing.findOneAndUpdate(
                { roomId },
                { strokes, lastModified: new Date() },
                { upsert: true }
            );
        } catch (error) {
            console.error('Error saving drawing:', error);
        }
    }

    // Load drawing from database
    async loadDrawing(roomId) {
        const drawing = await Drawing.findOne({ roomId });
        return drawing?.strokes || [];
    }

    // Get room by socketId
    getRoomBySocket(socketId) {
        for (const [roomId, roomState] of rooms) {
            if (roomState.users.has(socketId)) {
                return roomId;
            }
        }
        return null;
    }
}

module.exports = new RoomManager();
