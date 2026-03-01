require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const roomManager = require('./roomManager');

const app = express();
const server = http.createServer(app);

// Connect to MongoDB (still needed for roomManager)
connectDB();

// CORS configuration
const corsOptions = {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
};

app.use(cors(corsOptions));

// Note: REST routes (/auth/*, /api/rooms/*, /api/health)
// are now handled by FastAPI server on port 8000

// Socket.io setup
const io = new Server(server, {
    cors: corsOptions
});

// Socket authentication middleware - verify JWT
io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
        } catch (error) {
            console.log('Invalid socket token');
        }
    }
    next();
});

// Socket event handlers
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`, socket.user?.name || 'Anonymous');

    // Create a new room
    socket.on('create-room', async (data, callback) => {
        try {
            const { roomId, room } = await roomManager.createRoom(
                socket.user?.id,
                data?.name
            );

            socket.join(roomId);
            const result = await roomManager.joinRoom(roomId, socket.id, socket.user);

            callback({ success: true, roomId, users: result.users });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // Join an existing room
    socket.on('join-room', async (roomId, callback) => {
        try {
            const result = await roomManager.joinRoom(roomId, socket.id, socket.user);

            socket.join(roomId);

            // Notify others in room
            socket.to(roomId).emit('user-joined', {
                user: roomManager.getUsers(roomId).find(u => u.socketId === socket.id)
            });

            callback({
                success: true,
                users: result.users,
                strokes: result.strokes
            });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // Leave room
    socket.on('leave-room', async (roomId) => {
        const user = await roomManager.leaveRoom(roomId, socket.id);
        socket.leave(roomId);

        if (user) {
            io.to(roomId).emit('user-left', { userId: user.id });
        }
    });

    // Drawing events
    socket.on('draw-start', (data) => {
        const { roomId, stroke } = data;
        socket.to(roomId).emit('draw-start', { stroke, userId: socket.user?.id || socket.id });
    });

    socket.on('draw-move', (data) => {
        const { roomId, point, strokeId } = data;
        socket.to(roomId).emit('draw-move', { point, strokeId, userId: socket.user?.id || socket.id });
    });

    socket.on('draw-end', (data) => {
        const { roomId, stroke } = data;
        roomManager.addStroke(roomId, stroke);
        socket.to(roomId).emit('draw-end', { stroke, userId: socket.user?.id || socket.id });
    });

    // Clear canvas
    socket.on('clear-canvas', (roomId) => {
        roomManager.clearStrokes(roomId);
        io.to(roomId).emit('canvas-cleared');
    });

    // Save drawing to database (requires auth)
    socket.on('save-drawing', async (data, callback) => {
        const { roomId } = data;

        // Check if user is authenticated
        if (!socket.user) {
            callback({ success: false, error: 'You must be signed in to save' });
            return;
        }

        try {
            await roomManager.saveDrawing(roomId, socket.user.id);
            callback({ success: true });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // Cursor position updates
    socket.on('cursor-move', (data) => {
        const { roomId, cursor } = data;
        roomManager.updateCursor(roomId, socket.id, cursor);
        socket.to(roomId).emit('cursor-update', {
            userId: socket.user?.id || socket.id,
            cursor
        });
    });

    // WebRTC signaling
    socket.on('offer', (data) => {
        const { roomId, offer, targetSocketId } = data;
        io.to(targetSocketId).emit('offer', {
            offer,
            fromSocketId: socket.id,
            fromUser: socket.user
        });
    });

    socket.on('answer', (data) => {
        const { answer, targetSocketId } = data;
        io.to(targetSocketId).emit('answer', {
            answer,
            fromSocketId: socket.id
        });
    });

    socket.on('ice-candidate', (data) => {
        const { candidate, targetSocketId } = data;
        io.to(targetSocketId).emit('ice-candidate', {
            candidate,
            fromSocketId: socket.id
        });
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
        console.log(`User disconnected: ${socket.id}`);

        const roomId = roomManager.getRoomBySocket(socket.id);
        if (roomId) {
            const user = await roomManager.leaveRoom(roomId, socket.id);
            if (user) {
                io.to(roomId).emit('user-left', { userId: user.id });
            }
        }
    });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
