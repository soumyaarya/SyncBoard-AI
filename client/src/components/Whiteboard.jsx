import { useRef, useState, useEffect, useCallback } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { useDrawingSync } from '../hooks/useDrawingSync';
import { useTheme } from '../context/ThemeContext';
import Toolbar from './Toolbar';
import CursorOverlay from './CursorOverlay';
import AiChat from './AiChat';
import './Whiteboard.css';

function Whiteboard({ socket, roomId, roomName, users, user, initialStrokes, onLeave, onSave, onLogout, isConnected, isAuthenticated }) {
    const { theme, toggleTheme } = useTheme();
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState('pen');
    const [color, setColor] = useState(theme === 'dark' ? '#ffffff' : '#000000');
    const [size, setSize] = useState(3);
    const [remoteCursors, setRemoteCursors] = useState(new Map());
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [zoom, setZoom] = useState(1);
    const [showShareModal, setShowShareModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showAiChat, setShowAiChat] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const currentStrokeRef = useRef(null);
    const strokesRef = useRef([]);
    const initialStrokesDrawn = useRef(false);

    // Undo/Redo stacks
    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);

    // Shape drawing state
    const [shapeStart, setShapeStart] = useState(null);
    const [previewShape, setPreviewShape] = useState(null);

    // Text tool state
    const [textInput, setTextInput] = useState(null);
    const [textValue, setTextValue] = useState('');

    // Sticky notes state
    const [stickyNotes, setStickyNotes] = useState([]);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [draggingNote, setDraggingNote] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Board diagrams state (AI-generated, movable & resizable)
    const [boardDiagrams, setBoardDiagrams] = useState([]);
    const boardDiagramsRef = useRef([]);
    const [draggingDiagram, setDraggingDiagram] = useState(null);
    const [diagramDragOffset, setDiagramDragOffset] = useState({ x: 0, y: 0 });
    const [resizingDiagram, setResizingDiagram] = useState(null);
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });
    const sendToPeerRef = useRef(null);

    // Keep ref in sync with state
    useEffect(() => {
        boardDiagramsRef.current = boardDiagrams;
    }, [boardDiagrams]);

    // Handle incoming data from peers
    const handleDataReceived = useCallback((data, fromSocketId) => {
        switch (data.type) {
            case 'draw-start':
                handleRemoteDrawStart(data.stroke);
                break;
            case 'draw-move':
                handleRemoteDrawMove(data.strokeId, data.point);
                break;
            case 'draw-end':
                handleRemoteDrawEnd(data.stroke);
                break;
            case 'clear-canvas':
                clearCanvasLocal();
                break;
            case 'cursor-move':
                setRemoteCursors(prev => new Map(prev).set(fromSocketId, data.cursor));
                break;
            case 'undo':
                handleRemoteUndo();
                break;
            case 'sticky-note-add':
                setStickyNotes(prev => [...prev, data.note]);
                break;
            case 'sticky-note-update':
                setStickyNotes(prev => prev.map(n => n.id === data.note.id ? data.note : n));
                break;
            case 'sticky-note-delete':
                setStickyNotes(prev => prev.filter(n => n.id !== data.noteId));
                break;
            case 'diagram-add':
                setBoardDiagrams(prev => [...prev, data.diagram]);
                break;
            case 'diagram-update':
                setBoardDiagrams(prev => prev.map(d => d.id === data.diagram.id ? { ...d, ...data.diagram } : d));
                break;
            case 'diagram-delete':
                setBoardDiagrams(prev => prev.filter(d => d.id !== data.diagramId));
                break;
            case 'diagram-request':
                // A new peer is asking for existing diagrams
                if (boardDiagramsRef.current.length > 0 && sendToPeerRef.current) {
                    sendToPeerRef.current(fromSocketId, {
                        type: 'diagram-sync',
                        diagrams: boardDiagramsRef.current
                    });
                }
                break;
            case 'diagram-sync':
                // Received existing diagrams from a peer
                if (data.diagrams && data.diagrams.length > 0) {
                    setBoardDiagrams(prev => {
                        const existingIds = new Set(prev.map(d => d.id));
                        const newDiagrams = data.diagrams.filter(d => !existingIds.has(d.id));
                        return [...prev, ...newDiagrams];
                    });
                }
                break;
        }
    }, []);

    const { sendToAllPeers, sendToPeer, initiateConnection } = useWebRTC(socket, roomId, handleDataReceived);
    const drawingSync = useDrawingSync(socket, roomId, sendToAllPeers);

    // Keep sendToPeer ref updated for handleDataReceived
    useEffect(() => {
        sendToPeerRef.current = sendToPeer;
    }, [sendToPeer]);

    // Request existing diagrams from peers when joining
    useEffect(() => {
        if (users && users.length > 1) {
            // Small delay to let data channels establish
            const timer = setTimeout(() => {
                sendToAllPeers({ type: 'diagram-request' });
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [users?.length]);

    // Initialize canvas size
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                setCanvasSize({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };

        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // Get canvas background color based on theme
    const getCanvasBgColor = () => theme === 'dark' ? '#1a1a25' : '#ffffff';

    // Update pen color when theme changes
    useEffect(() => {
        if (color === '#ffffff' || color === '#000000') {
            setColor(theme === 'dark' ? '#ffffff' : '#000000');
        }
    }, [theme]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    handleUndo();
                } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    handleRedo();
                }
            }
            // Tool shortcuts
            if (!e.ctrlKey && !e.metaKey && !textInput) {
                switch (e.key.toLowerCase()) {
                    case 'p': setTool('pen'); break;
                    case 'e': setTool('eraser'); break;
                    case 'r': setTool('rectangle'); break;
                    case 'c': setTool('circle'); break;
                    case 'l': setTool('line'); break;
                    case 't': setTool('text'); break;
                    case 'n': handleAddStickyNote(); break;
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undoStack, redoStack, textInput]);

    // Redraw canvas
    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const bgColor = getCanvasBgColor();

        // Clear and fill background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Redraw all strokes
        strokesRef.current.forEach(stroke => {
            drawStroke(ctx, stroke, bgColor);
        });
    }, [theme]);

    // Draw a single stroke
    const drawStroke = (ctx, stroke, bgColor) => {
        if (!stroke || !stroke.points || stroke.points.length === 0) return;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = stroke.tool === 'eraser' ? bgColor : stroke.color;
        ctx.lineWidth = stroke.tool === 'eraser' ? stroke.size * 3 : stroke.size;

        // Handle different tools
        if (stroke.tool === 'rectangle' && stroke.points.length >= 2) {
            const start = stroke.points[0];
            const end = stroke.points[stroke.points.length - 1];
            ctx.beginPath();
            ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
            ctx.stroke();
        } else if (stroke.tool === 'circle' && stroke.points.length >= 2) {
            const start = stroke.points[0];
            const end = stroke.points[stroke.points.length - 1];
            const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
            ctx.beginPath();
            ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
            ctx.stroke();
        } else if (stroke.tool === 'line' && stroke.points.length >= 2) {
            const start = stroke.points[0];
            const end = stroke.points[stroke.points.length - 1];
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
        } else if (stroke.tool === 'arrow' && stroke.points.length >= 2) {
            const start = stroke.points[0];
            const end = stroke.points[stroke.points.length - 1];
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const headLength = 15;

            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();

            // Arrow head
            ctx.beginPath();
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(end.x - headLength * Math.cos(angle - Math.PI / 6), end.y - headLength * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(end.x - headLength * Math.cos(angle + Math.PI / 6), end.y - headLength * Math.sin(angle + Math.PI / 6));
            ctx.stroke();
        } else if (stroke.tool === 'triangle' && stroke.points.length >= 2) {
            const start = stroke.points[0];
            const end = stroke.points[stroke.points.length - 1];
            const width = end.x - start.x;
            const height = end.y - start.y;

            ctx.beginPath();
            ctx.moveTo(start.x + width / 2, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.lineTo(start.x, end.y);
            ctx.closePath();
            ctx.stroke();
        } else if (stroke.tool === 'text' && stroke.text) {
            ctx.font = `${stroke.size * 6}px Inter, sans-serif`;
            ctx.fillStyle = stroke.color;
            ctx.fillText(stroke.text, stroke.points[0].x, stroke.points[0].y);
        } else {
            // Freehand pen/eraser
            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            ctx.stroke();
        }
    };

    // Setup canvas context and draw initial strokes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || canvasSize.width === 0) return;

        const ctx = canvas.getContext('2d');
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Load initial strokes only once
        if (initialStrokes && initialStrokes.length > 0 && !initialStrokesDrawn.current) {
            initialStrokesDrawn.current = true;
            strokesRef.current = [...initialStrokes];
        }

        redrawCanvas();
    }, [canvasSize, theme, redrawCanvas]);

    // Setup socket listeners for drawing sync
    useEffect(() => {
        if (!socket) return;

        socket.on('draw-start', ({ stroke }) => handleRemoteDrawStart(stroke));
        socket.on('draw-move', ({ strokeId, point }) => handleRemoteDrawMove(strokeId, point));
        socket.on('draw-end', ({ stroke }) => handleRemoteDrawEnd(stroke));
        socket.on('canvas-cleared', () => clearCanvasLocal());
        socket.on('cursor-update', ({ userId, cursor }) => {
            setRemoteCursors(prev => new Map(prev).set(userId, cursor));
        });

        // Initiate P2P connections with existing users
        users.forEach(u => {
            if (u.socketId !== socket.id) {
                initiateConnection(u.socketId, u);
            }
        });

        return () => {
            socket.off('draw-start');
            socket.off('draw-move');
            socket.off('draw-end');
            socket.off('canvas-cleared');
            socket.off('cursor-update');
        };
    }, [socket, users, initiateConnection]);

    // Sticky note drag listeners
    useEffect(() => {
        if (!draggingNote) return;

        const handleMouseMove = (e) => handleStickyDragMove(e);
        const handleMouseUp = () => handleStickyDragEnd();

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchmove', handleMouseMove);
        document.addEventListener('touchend', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleMouseMove);
            document.removeEventListener('touchend', handleMouseUp);
        };
    }, [draggingNote, dragOffset]);

    // Drawing functions
    const getCanvasPoint = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) / zoom,
            y: (clientY - rect.top) / zoom
        };
    };

    const isShapeTool = (t) => ['rectangle', 'circle', 'line', 'arrow', 'triangle'].includes(t);

    const startDrawing = (e) => {
        e.preventDefault();
        const point = getCanvasPoint(e);

        // Handle text tool
        if (tool === 'text') {
            setTextInput(point);
            setTextValue('');
            return;
        }

        // Handle sticky note tool
        if (tool === 'sticky') {
            handleAddStickyNote(point);
            return;
        }

        setIsDrawing(true);

        if (isShapeTool(tool)) {
            setShapeStart(point);
            setPreviewShape({ tool, color, size, points: [point, point] });
        } else {
            const stroke = drawingSync.startStroke(point, tool, color, size, user?.id);
            currentStrokeRef.current = stroke;

            const ctx = canvasRef.current.getContext('2d');
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.strokeStyle = tool === 'eraser' ? getCanvasBgColor() : color;
            ctx.lineWidth = tool === 'eraser' ? size * 3 : size;
        }
    };

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();

        const point = getCanvasPoint(e);
        drawingSync.updateCursor(point);

        if (isShapeTool(tool)) {
            // Update shape preview
            setPreviewShape(prev => ({
                ...prev,
                points: [shapeStart, point]
            }));
            // Redraw canvas with preview
            redrawCanvas();
            const ctx = canvasRef.current.getContext('2d');
            drawStroke(ctx, { tool, color, size, points: [shapeStart, point] }, getCanvasBgColor());
        } else {
            drawingSync.moveStroke(point);
            const ctx = canvasRef.current.getContext('2d');
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
        }
    };

    const endDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);

        if (isShapeTool(tool) && previewShape) {
            // Save shape as stroke
            const shapeStroke = {
                id: Date.now().toString(),
                tool,
                color,
                size,
                points: previewShape.points,
                userId: user?.id
            };

            // Save to undo stack before adding
            setUndoStack(prev => [...prev, [...strokesRef.current]]);
            setRedoStack([]);

            strokesRef.current.push(shapeStroke);
            drawingSync.broadcastStroke(shapeStroke);
            setPreviewShape(null);
            setShapeStart(null);
        } else {
            const stroke = drawingSync.endStroke();
            if (stroke) {
                // Save to undo stack before adding
                setUndoStack(prev => [...prev, [...strokesRef.current]]);
                setRedoStack([]);

                strokesRef.current.push(stroke);
            }
        }
        currentStrokeRef.current = null;
    };

    // Handle text input submission
    const handleTextSubmit = () => {
        if (textValue.trim() && textInput) {
            const textStroke = {
                id: Date.now().toString(),
                tool: 'text',
                color,
                size,
                points: [textInput],
                text: textValue,
                userId: user?.id
            };

            setUndoStack(prev => [...prev, [...strokesRef.current]]);
            setRedoStack([]);

            strokesRef.current.push(textStroke);
            redrawCanvas();
            drawingSync.broadcastStroke(textStroke);
        }
        setTextInput(null);
        setTextValue('');
    };

    // Sticky Note functions
    const handleAddStickyNote = (stickyColor = '#fef08a') => {
        const note = {
            id: Date.now().toString(),
            x: 100 + Math.random() * 100,
            y: 100 + Math.random() * 100,
            width: 200,
            height: 150,
            text: '',
            color: stickyColor,
            userId: user?.id
        };
        setStickyNotes(prev => [...prev, note]);
        setEditingNoteId(note.id);
        sendToAllPeers({ type: 'sticky-note-add', note });
    };

    const handleUpdateStickyNote = (id, updates) => {
        setStickyNotes(prev => prev.map(note =>
            note.id === id ? { ...note, ...updates } : note
        ));
        const updatedNote = stickyNotes.find(n => n.id === id);
        if (updatedNote) {
            sendToAllPeers({ type: 'sticky-note-update', note: { ...updatedNote, ...updates } });
        }
    };

    const handleDeleteStickyNote = (id) => {
        setStickyNotes(prev => prev.filter(note => note.id !== id));
        sendToAllPeers({ type: 'sticky-note-delete', noteId: id });
    };

    // Sticky note drag handlers
    const handleStickyDragStart = (e, noteId) => {
        e.preventDefault();
        const note = stickyNotes.find(n => n.id === noteId);
        if (!note) return;

        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

        setDraggingNote(noteId);
        setDragOffset({
            x: clientX - note.x,
            y: clientY - note.y
        });
    };

    const handleStickyDragMove = (e) => {
        if (!draggingNote) return;

        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        const newX = clientX - dragOffset.x;
        const newY = clientY - dragOffset.y;

        setStickyNotes(prev => prev.map(note =>
            note.id === draggingNote ? { ...note, x: newX, y: newY } : note
        ));
    };

    const handleStickyDragEnd = () => {
        if (draggingNote) {
            const note = stickyNotes.find(n => n.id === draggingNote);
            if (note) {
                sendToAllPeers({ type: 'sticky-note-update', note });
            }
        }
        setDraggingNote(null);
    };

    // Board Diagram functions
    const handleAddDiagramToBoard = (svgDataUrl, width, height) => {
        const canvas = canvasRef.current;
        const maxW = canvas ? canvas.width * 0.5 : 400;
        const maxH = canvas ? canvas.height * 0.5 : 300;
        const scale = Math.min(maxW / width, maxH / height, 1);
        const diagram = {
            id: `diagram-${Date.now()}`,
            src: svgDataUrl,
            x: 100 + Math.random() * 80,
            y: 80 + Math.random() * 80,
            width: width * scale,
            height: height * scale,
        };
        setBoardDiagrams(prev => [...prev, diagram]);
        sendToAllPeers({ type: 'diagram-add', diagram });
    };

    const handleDeleteDiagram = (id) => {
        setBoardDiagrams(prev => prev.filter(d => d.id !== id));
        sendToAllPeers({ type: 'diagram-delete', diagramId: id });
    };

    const handleDiagramDragStart = (e, diagramId) => {
        e.preventDefault();
        e.stopPropagation();
        const diagram = boardDiagrams.find(d => d.id === diagramId);
        if (!diagram) return;
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        setDraggingDiagram(diagramId);
        setDiagramDragOffset({ x: clientX - diagram.x, y: clientY - diagram.y });
    };

    const handleDiagramDragMove = (e) => {
        if (!draggingDiagram) return;
        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        setBoardDiagrams(prev => prev.map(d =>
            d.id === draggingDiagram ? { ...d, x: clientX - diagramDragOffset.x, y: clientY - diagramDragOffset.y } : d
        ));
    };

    const handleDiagramDragEnd = () => {
        if (draggingDiagram) {
            const diagram = boardDiagrams.find(d => d.id === draggingDiagram);
            if (diagram) {
                sendToAllPeers({ type: 'diagram-update', diagram: { id: diagram.id, x: diagram.x, y: diagram.y } });
            }
        }
        setDraggingDiagram(null);
    };

    const handleDiagramResizeStart = (e, diagramId) => {
        e.preventDefault();
        e.stopPropagation();
        const diagram = boardDiagrams.find(d => d.id === diagramId);
        if (!diagram) return;
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        setResizingDiagram(diagramId);
        setResizeStart({ x: clientX, y: clientY, w: diagram.width, h: diagram.height });
    };

    const handleDiagramResizeMove = (e) => {
        if (!resizingDiagram) return;
        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        const dx = clientX - resizeStart.x;
        const dy = clientY - resizeStart.y;
        const newW = Math.max(100, resizeStart.w + dx);
        const newH = Math.max(60, resizeStart.h + dy);
        setBoardDiagrams(prev => prev.map(d =>
            d.id === resizingDiagram ? { ...d, width: newW, height: newH } : d
        ));
    };

    const handleDiagramResizeEnd = () => {
        if (resizingDiagram) {
            const diagram = boardDiagrams.find(d => d.id === resizingDiagram);
            if (diagram) {
                sendToAllPeers({ type: 'diagram-update', diagram: { id: diagram.id, width: diagram.width, height: diagram.height } });
            }
        }
        setResizingDiagram(null);
    };

    // Undo/Redo functions
    const handleUndo = () => {
        if (undoStack.length === 0) return;

        const previousStrokes = undoStack[undoStack.length - 1];
        setRedoStack(prev => [...prev, [...strokesRef.current]]);
        setUndoStack(prev => prev.slice(0, -1));

        strokesRef.current = previousStrokes;
        redrawCanvas();

        sendToAllPeers({ type: 'undo' });
    };

    const handleRedo = () => {
        if (redoStack.length === 0) return;

        const nextStrokes = redoStack[redoStack.length - 1];
        setUndoStack(prev => [...prev, [...strokesRef.current]]);
        setRedoStack(prev => prev.slice(0, -1));

        strokesRef.current = nextStrokes;
        redrawCanvas();
    };

    const handleRemoteUndo = () => {
        if (strokesRef.current.length > 0) {
            strokesRef.current = strokesRef.current.slice(0, -1);
            redrawCanvas();
        }
    };

    // Handle remote drawing
    const handleRemoteDrawStart = (stroke) => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        ctx.strokeStyle = stroke.tool === 'eraser' ? getCanvasBgColor() : stroke.color;
        ctx.lineWidth = stroke.tool === 'eraser' ? stroke.size * 3 : stroke.size;
    };

    const handleRemoteDrawMove = (strokeId, point) => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
    };

    const handleRemoteDrawEnd = (stroke) => {
        strokesRef.current.push(stroke);
        redrawCanvas();
    };

    const clearCanvasLocal = () => {
        setUndoStack(prev => [...prev, [...strokesRef.current]]);
        setRedoStack([]);
        strokesRef.current = [];
        redrawCanvas();
    };

    const handleClear = () => {
        clearCanvasLocal();
        drawingSync.clearCanvas();
    };

    const handleExport = () => {
        const canvas = canvasRef.current;
        const link = document.createElement('a');
        link.download = `whiteboard-${roomId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId);
    };

    // Zoom functions
    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev - 0.25, 0.5));
    };

    const handleResetZoom = () => {
        setZoom(1);
    };

    // Share functions
    const getRoomUrl = () => {
        return `${window.location.origin}?join=${roomId}`;
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(getRoomUrl());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="whiteboard-container">
            {/* Header */}
            <header className="whiteboard-header">
                <div className="header-left">
                    <button className="btn btn-icon" onClick={onLeave} title="Leave Room">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="room-info">
                        <span className="room-name">{roomName || 'Untitled Whiteboard'}</span>
                        <button className="room-id" onClick={copyRoomId} title="Click to copy Room ID">
                            <span className="room-id-text">{roomId}</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" />
                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="header-center">
                    <div className={`connection-badge ${isConnected ? 'connected' : ''}`}>
                        <span className="status-dot"></span>
                        {isConnected ? 'Connected' : 'Reconnecting...'}
                    </div>

                    {/* Theme Toggle */}
                    <button
                        className="btn btn-icon theme-toggle"
                        onClick={toggleTheme}
                        title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                    >
                        {theme === 'dark' ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                <line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        )}
                    </button>
                </div>

                <div className="header-right">
                    <div className="users-list">
                        {users.slice(0, 5).map((u) => (
                            <div
                                key={u.id}
                                className="user-avatar-small"
                                title={u.name}
                                style={{
                                    backgroundImage: u.avatar ? `url(${u.avatar})` : undefined,
                                    backgroundColor: !u.avatar ? 'var(--accent-primary)' : undefined
                                }}
                            >
                                {!u.avatar && u.name?.charAt(0)}
                            </div>
                        ))}
                        {users.length > 5 && (
                            <div className="user-avatar-small more">+{users.length - 5}</div>
                        )}
                    </div>
                    <button
                        className={`ai-toggle-btn ${showAiChat ? 'active' : ''}`}
                        onClick={() => setShowAiChat(!showAiChat)}
                        title="AI Assistant"
                    >
                        <span className="ai-sparkle">✨</span>
                        AI
                    </button>
                    <button
                        className="btn btn-primary share-btn"
                        onClick={() => setShowShareModal(true)}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="18" cy="5" r="3" />
                            <circle cx="6" cy="12" r="3" />
                            <circle cx="18" cy="19" r="3" />
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                        Share
                    </button>

                    {/* Profile Avatar */}
                    {user && isAuthenticated && (
                        <div className="profile-menu-wrapper">
                            <button
                                className="profile-avatar-btn"
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                title={user.name}
                            >
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.name} className="profile-avatar-img" />
                                ) : (
                                    <span className="profile-avatar-initial">{user.name?.charAt(0)}</span>
                                )}
                            </button>
                            {showProfileMenu && (
                                <>
                                    <div className="profile-menu-backdrop" onClick={() => setShowProfileMenu(false)} />
                                    <div className="profile-dropdown">
                                        <div className="profile-dropdown-header">
                                            {user.avatar ? (
                                                <img src={user.avatar} alt="" className="profile-dropdown-avatar" />
                                            ) : (
                                                <div className="profile-dropdown-avatar-fallback">{user.name?.charAt(0)}</div>
                                            )}
                                            <div className="profile-dropdown-info">
                                                <span className="profile-dropdown-name">{user.name}</span>
                                                <span className="profile-dropdown-email">{user.email}</span>
                                            </div>
                                        </div>
                                        <div className="profile-dropdown-divider" />
                                        <button className="profile-dropdown-item" onClick={() => { setShowProfileMenu(false); onLeave(); }}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M19 12H5M12 19l-7-7 7-7" />
                                            </svg>
                                            Leave Room
                                        </button>
                                        <button className="profile-dropdown-item logout" onClick={() => { setShowProfileMenu(false); onLogout(); }}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                                                <polyline points="16 17 21 12 16 7" />
                                                <line x1="21" y1="12" x2="9" y2="12" />
                                            </svg>
                                            Logout
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </header>

            {/* Share Modal */}
            {showShareModal && (
                <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
                    <div className="modal share-modal glass-card" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setShowShareModal(false)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                        <h3>Share this Board</h3>
                        <p>Invite others to collaborate by sharing this link:</p>

                        <div className="share-url-box">
                            <input
                                type="text"
                                className="input"
                                value={getRoomUrl()}
                                readOnly
                            />
                            <button
                                className={`btn btn-primary ${copied ? 'copied' : ''}`}
                                onClick={handleCopyLink}
                            >
                                {copied ? (
                                    <>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="9" y="9" width="13" height="13" rx="2" />
                                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                        </svg>
                                        Copy Link
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="share-room-id">
                            <span>Room ID:</span>
                            <code>{roomId}</code>
                        </div>
                    </div>
                </div>
            )}

            {/* Toolbar */}
            <Toolbar
                tool={tool}
                setTool={setTool}
                color={color}
                setColor={setColor}
                size={size}
                setSize={setSize}
                onClear={handleClear}
                onExport={handleExport}
                onSave={onSave}
                isAuthenticated={isAuthenticated}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={undoStack.length > 0}
                canRedo={redoStack.length > 0}
                onAddStickyNote={handleAddStickyNote}
            />

            {/* Zoom Controls */}
            <div className="zoom-controls glass-card">
                <button className="btn btn-icon" onClick={handleZoomOut} title="Zoom Out">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                </button>
                <button className="zoom-level" onClick={handleResetZoom} title="Reset Zoom">
                    {Math.round(zoom * 100)}%
                </button>
                <button className="btn btn-icon" onClick={handleZoomIn} title="Zoom In">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="11" y1="8" x2="11" y2="14" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                </button>
            </div>

            {/* Canvas Container */}
            <div
                className="canvas-container"
                ref={containerRef}
                onMouseMove={(e) => { handleDiagramDragMove(e); handleDiagramResizeMove(e); }}
                onMouseUp={() => { handleDiagramDragEnd(); handleDiagramResizeEnd(); }}
                onTouchMove={(e) => { handleDiagramDragMove(e); handleDiagramResizeMove(e); }}
                onTouchEnd={() => { handleDiagramDragEnd(); handleDiagramResizeEnd(); }}
            >
                <canvas
                    ref={canvasRef}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    className={`drawing-canvas ${tool === 'eraser' ? 'eraser-cursor' : tool === 'text' ? 'text-cursor' : 'pen-cursor'}`}
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={endDrawing}
                    onMouseLeave={endDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={endDrawing}
                />
                <CursorOverlay cursors={remoteCursors} users={users} />

                {/* Sticky Notes */}
                {stickyNotes.map(note => (
                    <div
                        key={note.id}
                        className={`sticky-note ${draggingNote === note.id ? 'dragging' : ''}`}
                        style={{
                            left: note.x,
                            top: note.y,
                            width: note.width,
                            height: note.height,
                            backgroundColor: note.color
                        }}
                    >
                        <div
                            className="sticky-note-header"
                            onMouseDown={(e) => handleStickyDragStart(e, note.id)}
                            onTouchStart={(e) => handleStickyDragStart(e, note.id)}
                            style={{ cursor: 'grab' }}
                        >
                            <span className="drag-handle">⋮⋮</span>
                            <button
                                className="sticky-note-delete"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteStickyNote(note.id);
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <textarea
                            className="sticky-note-content"
                            value={note.text}
                            onChange={(e) => handleUpdateStickyNote(note.id, { text: e.target.value })}
                            placeholder="Type here..."
                            autoFocus={editingNoteId === note.id}
                        />
                    </div>
                ))}

                {/* Board Diagrams (movable & resizable) */}
                {boardDiagrams.map(diagram => (
                    <div
                        key={diagram.id}
                        className={`board-diagram ${draggingDiagram === diagram.id ? 'dragging' : ''}`}
                        style={{
                            left: diagram.x,
                            top: diagram.y,
                            width: diagram.width,
                            height: diagram.height,
                        }}
                    >
                        <div
                            className="board-diagram-header"
                            onMouseDown={(e) => handleDiagramDragStart(e, diagram.id)}
                            onTouchStart={(e) => handleDiagramDragStart(e, diagram.id)}
                        >
                            <span className="drag-handle">⋮⋮</span>
                            <button
                                className="board-diagram-delete"
                                onClick={(e) => { e.stopPropagation(); handleDeleteDiagram(diagram.id); }}
                            >
                                ×
                            </button>
                        </div>
                        <img
                            src={diagram.src}
                            alt="AI Diagram"
                            className="board-diagram-img"
                            draggable={false}
                        />
                        <div
                            className="board-diagram-resize"
                            onMouseDown={(e) => handleDiagramResizeStart(e, diagram.id)}
                            onTouchStart={(e) => handleDiagramResizeStart(e, diagram.id)}
                        />
                    </div>
                ))}

                {/* Text Input */}
                {textInput && (
                    <div
                        className="text-input-container"
                        style={{ left: textInput.x, top: textInput.y }}
                    >
                        <input
                            type="text"
                            className="canvas-text-input"
                            value={textValue}
                            onChange={(e) => setTextValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleTextSubmit();
                                if (e.key === 'Escape') { setTextInput(null); setTextValue(''); }
                            }}
                            onBlur={handleTextSubmit}
                            autoFocus
                            placeholder="Type and press Enter"
                            style={{ color, fontSize: size * 6 }}
                        />
                    </div>
                )}
            </div>

            {/* AI Chat Panel */}
            <AiChat
                isOpen={showAiChat}
                onClose={() => setShowAiChat(false)}
                onAddToBoard={(img, width, height) => {
                    // Convert image to data URL and add as movable overlay
                    const tmpCanvas = document.createElement('canvas');
                    tmpCanvas.width = width;
                    tmpCanvas.height = height;
                    const tmpCtx = tmpCanvas.getContext('2d');
                    tmpCtx.drawImage(img, 0, 0);
                    const dataUrl = tmpCanvas.toDataURL('image/png');
                    handleAddDiagramToBoard(dataUrl, width, height);
                }}
            />
        </div>
    );
}

export default Whiteboard;
