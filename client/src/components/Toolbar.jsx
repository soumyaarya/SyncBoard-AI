import { useState, useRef, useEffect } from 'react';
import './Toolbar.css';

const COLORS = [
    '#ffffff', '#ef4444', '#f97316', '#eab308',
    '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899',
    '#f472b6', '#a78bfa', '#60a5fa', '#34d399',
    '#fbbf24', '#fb923c', '#f87171', '#000000'
];

const STICKY_COLORS = [
    '#fef08a', // Yellow
    '#fca5a5', // Red/Pink
    '#86efac', // Green
    '#93c5fd', // Blue
    '#c4b5fd', // Purple
    '#fdba74', // Orange
];

const SIZES = [2, 4, 6, 10, 16];

const SHAPE_TOOLS = [
    { id: 'rectangle', label: 'Rectangle' },
    { id: 'circle', label: 'Circle' },
    { id: 'line', label: 'Line' },
    { id: 'arrow', label: 'Arrow' },
    { id: 'triangle', label: 'Triangle' }
];

const VISIBLE_COUNT = 5; // Number of tools visible at a time

function Toolbar({
    tool,
    setTool,
    color,
    setColor,
    size,
    setSize,
    onClear,
    onExport,
    onSave,
    isAuthenticated,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onAddStickyNote
}) {
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [selectedShape, setSelectedShape] = useState('rectangle');
    const [scrollOffset, setScrollOffset] = useState(0);

    const toolbarRef = useRef(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (toolbarRef.current && !toolbarRef.current.contains(e.target)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDropdown = (name) => {
        setActiveDropdown(prev => prev === name ? null : name);
    };

    const handleShapeSelect = (shapeId) => {
        setSelectedShape(shapeId);
        setTool(shapeId);
        setActiveDropdown(null);
    };

    const handleStickyColorSelect = (stickyColor) => {
        setTool('sticky');
        if (onAddStickyNote) onAddStickyNote(stickyColor);
        setActiveDropdown(null);
    };

    const isShapeTool = SHAPE_TOOLS.some(s => s.id === tool);

    const getShapeIcon = (shapeId) => {
        switch (shapeId) {
            case 'rectangle':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                    </svg>
                );
            case 'circle':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="9" />
                    </svg>
                );
            case 'line':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="19" x2="19" y2="5" />
                    </svg>
                );
            case 'arrow':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="19" x2="19" y2="5" />
                        <polyline points="10 5 19 5 19 14" />
                    </svg>
                );
            case 'triangle':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 3L22 21H2L12 3Z" />
                    </svg>
                );
            default:
                return null;
        }
    };

    // Define all tools as renderable items
    const allTools = [
        // Page 1: Drawing tools
        {
            id: 'pen',
            render: () => (
                <button
                    key="pen"
                    className={`btn btn-icon ${tool === 'pen' ? 'active' : ''}`}
                    onClick={() => { setTool('pen'); setActiveDropdown(null); }}
                    title="Pen (P)"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 19l7-7 3 3-7 7-3-3z" />
                        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                    </svg>
                </button>
            )
        },
        {
            id: 'shapes',
            render: () => (
                <div className="picker-container" key="shapes">
                    <button
                        className={`btn btn-icon ${isShapeTool ? 'active' : ''}`}
                        onClick={() => toggleDropdown('shapes')}
                        title="Shapes"
                    >
                        {getShapeIcon(selectedShape)}
                    </button>
                    {activeDropdown === 'shapes' && (
                        <div className="picker-dropdown shapes-picker">
                            {SHAPE_TOOLS.map((shape) => (
                                <button
                                    key={shape.id}
                                    className={`shape-option ${tool === shape.id ? 'active' : ''}`}
                                    onClick={() => handleShapeSelect(shape.id)}
                                    title={shape.label}
                                >
                                    {getShapeIcon(shape.id)}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )
        },
        {
            id: 'sticky',
            render: () => (
                <div className="picker-container" key="sticky">
                    <button
                        className={`btn btn-icon ${tool === 'sticky' ? 'active' : ''}`}
                        onClick={() => toggleDropdown('sticky')}
                        title="Sticky Note (N)"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h9l5-5V5a2 2 0 00-2-2z" />
                            <polyline points="14 21 14 15 20 15" />
                        </svg>
                    </button>
                    {activeDropdown === 'sticky' && (
                        <div className="picker-dropdown sticky-color-picker">
                            <div className="picker-label">Choose color</div>
                            <div className="sticky-colors">
                                {STICKY_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        className="sticky-color-option"
                                        style={{ backgroundColor: c }}
                                        onClick={() => handleStickyColorSelect(c)}
                                        title="Add sticky note"
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )
        },
        {
            id: 'text',
            render: () => (
                <button
                    key="text"
                    className={`btn btn-icon ${tool === 'text' ? 'active' : ''}`}
                    onClick={() => { setTool('text'); setActiveDropdown(null); }}
                    title="Text (T)"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="4 7 4 4 20 4 20 7" />
                        <line x1="12" y1="4" x2="12" y2="20" />
                        <line x1="8" y1="20" x2="16" y2="20" />
                    </svg>
                </button>
            )
        },
        {
            id: 'eraser',
            render: () => (
                <button
                    key="eraser"
                    className={`btn btn-icon ${tool === 'eraser' ? 'active' : ''}`}
                    onClick={() => {
                        setTool(tool === 'eraser' ? 'pen' : 'eraser');
                        setActiveDropdown(null);
                    }}
                    title="Eraser (E)"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8l10-10c.8-.8 2-.8 2.8 0l6 6c.8.8.8 2 0 2.8L13 20" />
                        <path d="M6.5 17.5L15.5 8.5" />
                    </svg>
                </button>
            )
        },
        // Page 2: Styling & Actions
        {
            id: 'color',
            render: () => (
                <div className="picker-container" key="color">
                    <button
                        className="btn btn-icon color-btn"
                        onClick={() => toggleDropdown('color')}
                        title="Color"
                    >
                        <span className="color-preview" style={{ backgroundColor: color }}></span>
                    </button>
                    {activeDropdown === 'color' && (
                        <div className="picker-dropdown color-picker">
                            {COLORS.map((c) => (
                                <button
                                    key={c}
                                    className={`color-option ${color === c ? 'active' : ''}`}
                                    style={{ backgroundColor: c }}
                                    onClick={() => {
                                        setColor(c);
                                        setActiveDropdown(null);
                                    }}
                                />
                            ))}
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="color-input"
                            />
                        </div>
                    )}
                </div>
            )
        },
        {
            id: 'size',
            render: () => (
                <div className="picker-container" key="size">
                    <button
                        className="btn btn-icon size-btn"
                        onClick={() => toggleDropdown('size')}
                        title="Stroke Size"
                    >
                        <span className="size-preview" style={{ width: size * 2, height: size * 2 }}></span>
                    </button>
                    {activeDropdown === 'size' && (
                        <div className="picker-dropdown size-picker">
                            {SIZES.map((s) => (
                                <button
                                    key={s}
                                    className={`size-option ${size === s ? 'active' : ''}`}
                                    onClick={() => {
                                        setSize(s);
                                        setActiveDropdown(null);
                                    }}
                                >
                                    <span style={{ width: s * 2, height: s * 2 }}></span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )
        },
        {
            id: 'clear',
            render: () => (
                <button key="clear" className="btn btn-icon" onClick={onClear} title="Clear Canvas">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                    </svg>
                </button>
            )
        },
        {
            id: 'export',
            render: () => (
                <button key="export" className="btn btn-icon" onClick={onExport} title="Export PNG">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                </button>
            )
        },
        {
            id: 'save',
            render: () => (
                <button
                    key="save"
                    className={`btn btn-icon ${isAuthenticated ? '' : 'disabled'}`}
                    onClick={onSave}
                    disabled={!isAuthenticated}
                    title={isAuthenticated ? 'Save to Cloud' : 'Sign in to Save'}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                    </svg>
                </button>
            )
        },
    ];

    const totalTools = allTools.length;
    const canScrollDown = scrollOffset + VISIBLE_COUNT < totalTools;
    const canScrollUp = scrollOffset > 0;

    const visibleTools = allTools.slice(scrollOffset, scrollOffset + VISIBLE_COUNT);

    const handleScrollDown = () => {
        if (canScrollDown) {
            setActiveDropdown(null);
            setScrollOffset(prev => Math.min(prev + VISIBLE_COUNT, totalTools - VISIBLE_COUNT));
        }
    };

    const handleScrollUp = () => {
        if (canScrollUp) {
            setActiveDropdown(null);
            setScrollOffset(prev => Math.max(prev - VISIBLE_COUNT, 0));
        }
    };

    return (
        <div className="toolbar-vertical glass-card" ref={toolbarRef}>
            {/* Scroll Up Button */}
            {canScrollUp && (
                <button
                    className="btn btn-icon scroll-btn"
                    onClick={handleScrollUp}
                    title="Previous tools"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="18 15 12 9 6 15" />
                    </svg>
                </button>
            )}

            {/* Visible Tools */}
            <div className="tools-window">
                {visibleTools.map(t => t.render())}
            </div>

            {/* Scroll Down Button */}
            {canScrollDown && (
                <button
                    className="btn btn-icon scroll-btn"
                    onClick={handleScrollDown}
                    title="More tools"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </button>
            )}

            {/* Divider */}
            <div className="toolbar-divider-h"></div>

            {/* Undo/Redo - Always visible */}
            <button
                className={`btn btn-icon ${!canUndo ? 'disabled' : ''}`}
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 10h10a5 5 0 015 5v2a5 5 0 01-5 5H3" />
                    <polyline points="8 15 3 10 8 5" />
                </svg>
            </button>

            <button
                className={`btn btn-icon ${!canRedo ? 'disabled' : ''}`}
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo (Ctrl+Y)"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10H11a5 5 0 00-5 5v2a5 5 0 005 5h10" />
                    <polyline points="16 15 21 10 16 5" />
                </svg>
            </button>
        </div>
    );
}

export default Toolbar;
