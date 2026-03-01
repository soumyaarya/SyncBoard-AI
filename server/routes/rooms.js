const express = require('express');
const router = express.Router();
const { authMiddleware, optionalAuth } = require('../middleware/authMiddleware');
const Room = require('../models/Room');

// @route   GET /api/rooms
// @desc    Get all rooms for authenticated user
// @access  Protected
router.get('/', authMiddleware, async (req, res) => {
    try {
        const rooms = await Room.find({
            $or: [
                { owner: req.user.id },
                { 'participants.user': req.user.id }
            ]
        }).sort({ updatedAt: -1 });

        res.json({ success: true, rooms });
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/rooms/:id
// @desc    Get a specific room (public or owned)
// @access  Optional auth
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.id });

        if (!room) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }

        res.json({ success: true, room });
    } catch (error) {
        console.error('Error fetching room:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   DELETE /api/rooms/:id
// @desc    Delete a room (owner only)
// @access  Protected
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.id });

        if (!room) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }

        // Check ownership
        if (room.owner && room.owner.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this room' });
        }

        await Room.deleteOne({ roomId: req.params.id });
        res.json({ success: true, message: 'Room deleted' });
    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   PUT /api/rooms/:id/name
// @desc    Update room name (owner only)
// @access  Protected
router.put('/:id/name', authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;
        const room = await Room.findOne({ roomId: req.params.id });

        if (!room) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }

        // Check ownership
        if (room.owner && room.owner.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this room' });
        }

        room.name = name;
        await room.save();

        res.json({ success: true, room });
    } catch (error) {
        console.error('Error updating room:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
