const mongoose = require('mongoose');

const strokeSchema = new mongoose.Schema({
    id: String,
    tool: {
        type: String,
        enum: ['pen', 'eraser', 'rectangle', 'circle', 'line'],
        default: 'pen'
    },
    color: {
        type: String,
        default: '#ffffff'
    },
    size: {
        type: Number,
        default: 3
    },
    points: [{
        x: Number,
        y: Number
    }],
    startPoint: {
        x: Number,
        y: Number
    },
    endPoint: {
        x: Number,
        y: Number
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const drawingSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    strokes: [strokeSchema],
    canvasState: {
        type: String // Base64 encoded canvas for quick loading
    },
    lastModified: {
        type: Date,
        default: Date.now
    }
});

// Update lastModified on save
drawingSchema.pre('save', function (next) {
    this.lastModified = new Date();
    next();
});

module.exports = mongoose.model('Drawing', drawingSchema);
