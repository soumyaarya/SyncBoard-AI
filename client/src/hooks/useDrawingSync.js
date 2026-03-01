import { useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

export function useDrawingSync(socket, roomId, sendToAllPeers) {
    const strokesRef = useRef([]);
    const currentStrokeRef = useRef(null);

    const startStroke = useCallback((point, tool, color, size, userId) => {
        const stroke = {
            id: uuidv4(),
            tool,
            color,
            size,
            points: [point],
            startPoint: point,
            endPoint: point,
            userId,
            timestamp: Date.now()
        };

        currentStrokeRef.current = stroke;

        // Send via WebRTC for low latency
        if (sendToAllPeers) {
            sendToAllPeers({
                type: 'draw-start',
                stroke
            });
        }

        // Also send via Socket.io as fallback
        if (socket && roomId) {
            socket.emit('draw-start', { roomId, stroke });
        }

        return stroke;
    }, [socket, roomId, sendToAllPeers]);

    const moveStroke = useCallback((point) => {
        if (!currentStrokeRef.current) return;

        currentStrokeRef.current.points.push(point);
        currentStrokeRef.current.endPoint = point;

        // Send via WebRTC
        if (sendToAllPeers) {
            sendToAllPeers({
                type: 'draw-move',
                strokeId: currentStrokeRef.current.id,
                point
            });
        }

        // Socket.io fallback
        if (socket && roomId) {
            socket.emit('draw-move', {
                roomId,
                strokeId: currentStrokeRef.current.id,
                point
            });
        }
    }, [socket, roomId, sendToAllPeers]);

    const endStroke = useCallback(() => {
        if (!currentStrokeRef.current) return null;

        const stroke = { ...currentStrokeRef.current };
        strokesRef.current.push(stroke);
        currentStrokeRef.current = null;

        // Send via WebRTC
        if (sendToAllPeers) {
            sendToAllPeers({
                type: 'draw-end',
                stroke
            });
        }

        // Socket.io fallback
        if (socket && roomId) {
            socket.emit('draw-end', { roomId, stroke });
        }

        return stroke;
    }, [socket, roomId, sendToAllPeers]);

    const clearCanvas = useCallback(() => {
        strokesRef.current = [];

        if (sendToAllPeers) {
            sendToAllPeers({ type: 'clear-canvas' });
        }

        if (socket && roomId) {
            socket.emit('clear-canvas', roomId);
        }
    }, [socket, roomId, sendToAllPeers]);

    const updateCursor = useCallback((cursor) => {
        if (sendToAllPeers) {
            sendToAllPeers({
                type: 'cursor-move',
                cursor
            });
        }

        if (socket && roomId) {
            socket.emit('cursor-move', { roomId, cursor });
        }
    }, [socket, roomId, sendToAllPeers]);

    const getStrokes = useCallback(() => {
        return strokesRef.current;
    }, []);

    const setStrokes = useCallback((strokes) => {
        strokesRef.current = strokes;
    }, []);

    return {
        startStroke,
        moveStroke,
        endStroke,
        clearCanvas,
        updateCursor,
        getStrokes,
        setStrokes
    };
}
