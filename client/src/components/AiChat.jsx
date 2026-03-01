import { useState, useRef, useEffect, useCallback, memo } from 'react';
import mermaid from 'mermaid';
import './AiChat.css';

// Initialize mermaid with dark theme
mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
        primaryColor: '#6366f1',
        primaryTextColor: '#fff',
        primaryBorderColor: '#818cf8',
        lineColor: '#94a3b8',
        secondaryColor: '#1e1b4b',
        tertiaryColor: '#0f172a',
    },
    flowchart: { curve: 'basis' },
    securityLevel: 'loose',
});

// Sanitize common Mermaid syntax errors from AI output
const sanitizeMermaid = (code) => {
    return code
        // Fix -->|label|> → -->|label| (invalid trailing >)
        .replace(/-->\|([^|]*)\|>/g, '-->|$1|')
        // Fix ==>|label|> → ==>|label|
        .replace(/==>\|([^|]*)\|>/g, '==>|$1|')
        // Fix -.->|label|> → -.->|label|
        .replace(/-\.->\|([^|]*)\|>/g, '-.->|$1|')
        // Fix ER diagram relationship operators → simple arrows
        .replace(/\|\|--o\{/g, '-->|has many|')
        .replace(/\}o--\|\|/g, '-->|belongs to|')
        .replace(/\|\|--\|\{/g, '-->|has many|')
        .replace(/\}?\|--\|\|/g, '-->|belongs to|')
        .replace(/--\|\{/g, '-->|has many|')
        .replace(/\}o--/g, '-->|belongs to|')
        // Remove HTML tags except <br/> and <br>
        .replace(/<(?!\/?br\s*\/?>)[^>]+>/gi, '')
        // Fix & in labels (common issue)
        .replace(/&(?!amp;|lt;|gt;|quot;)/g, 'and');
};

// Memoized DiagramBlock — defined OUTSIDE AiChat so it has a stable identity
const DiagramBlock = memo(({ code, diagramId, onAddToBoard }) => {
    const containerRef = useRef(null);
    const [svg, setSvg] = useState(null);
    const [renderError, setRenderError] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const render = async () => {
            try {
                const sanitized = sanitizeMermaid(code);
                const { svg: result } = await mermaid.render(diagramId, sanitized);
                if (!cancelled && result) {
                    setSvg(result);
                    setRenderError(false);
                }
            } catch (err) {
                console.error('Mermaid render error:', err);
                if (!cancelled) setRenderError(true);
            }
        };
        render();
        return () => { cancelled = true; };
    }, [code, diagramId]);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAdd = () => {
        if (containerRef.current && svg) {
            // Use base64 data URL (not blob URL) to avoid tainting the canvas
            const svgBase64 = btoa(unescape(encodeURIComponent(svg)));
            const url = `data:image/svg+xml;base64,${svgBase64}`;
            const img = new Image();
            img.onload = () => {
                if (onAddToBoard) {
                    onAddToBoard(img, img.width, img.height);
                }
            };
            img.src = url;
        }
    };

    return (
        <div className="diagram-block" ref={containerRef}>
            {svg ? (
                <div
                    className="diagram-svg"
                    dangerouslySetInnerHTML={{ __html: svg }}
                />
            ) : renderError ? (
                <div className="diagram-error">
                    <span className="diagram-error-icon">⚠️</span>
                    <span>Diagram couldn't be rendered. Here's the code:</span>
                    <pre className="diagram-code-fallback">{code}</pre>
                </div>
            ) : (
                <div className="diagram-loading">
                    <div className="diagram-spinner"></div>
                    Rendering diagram...
                </div>
            )}
            <div className="diagram-actions">
                <button
                    className="diagram-action-btn"
                    onClick={handleAdd}
                    title="Place on whiteboard"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <line x1="12" y1="8" x2="12" y2="16" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    Add to Board
                </button>
                <button
                    className={`diagram-action-btn ${copied ? 'copied' : ''}`}
                    onClick={handleCopy}
                    title="Copy diagram code"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {copied ? (
                            <polyline points="20 6 9 17 4 12" />
                        ) : (
                            <>
                                <rect x="9" y="9" width="13" height="13" rx="2" />
                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                            </>
                        )}
                    </svg>
                    {copied ? 'Copied!' : 'Copy Code'}
                </button>
            </div>
        </div>
    );
});

DiagramBlock.displayName = 'DiagramBlock';

function AiChat({ isOpen, onClose, onAddToBoard }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    // Parse AI reply into text segments and diagram blocks
    const parseMessage = (reply, diagrams) => {
        if (!diagrams || diagrams.length === 0) {
            return [{ type: 'text', content: reply }];
        }

        const parts = reply.split('[DIAGRAM]');
        const result = [];

        parts.forEach((part, i) => {
            if (part.trim()) {
                result.push({ type: 'text', content: part.trim() });
            }
            if (i < diagrams.length) {
                result.push({ type: 'diagram', content: diagrams[i] });
            }
        });

        return result;
    };

    // Format text with basic markdown (bold, code, lists)
    const formatText = (text) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n- /g, '\n• ')
            .replace(/\n(\d+)\. /g, '\n$1. ')
            .replace(/\n/g, '<br/>');
    };

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        const userMessage = { role: 'user', content: trimmed };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Build history for context
            const history = messages.map(m => ({
                role: m.role,
                content: m.content
            }));

            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: trimmed,
                    history: history
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'AI request failed');
            }

            const data = await res.json();
            const aiMessage = {
                role: 'assistant',
                content: data.reply,
                diagrams: data.diagrams
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `⚠️ ${err.message}`,
                error: true
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleClearChat = () => {
        setMessages([]);
    };

    const suggestions = [
        "Suggest a concept map for user authentication",
        "Create a flowchart for CI/CD pipeline",
        "Design a database schema for e-commerce",
        "Architecture diagram for microservices",
    ];

    // Stop all events from leaking through to the whiteboard canvas
    const stopPropagation = (e) => e.stopPropagation();

    return (
        <div
            className={`ai-chat-panel ${isOpen ? 'open' : ''}`}
            onMouseDown={stopPropagation}
            onMouseUp={stopPropagation}
            onMouseMove={stopPropagation}
            onTouchStart={stopPropagation}
            onTouchMove={stopPropagation}
            onTouchEnd={stopPropagation}
            onPointerDown={stopPropagation}
            onPointerMove={stopPropagation}
            onPointerUp={stopPropagation}
            onKeyDown={stopPropagation}
            onKeyUp={stopPropagation}
            onClick={stopPropagation}
        >
            {/* Header */}
            <div className="ai-chat-header">
                <div className="ai-chat-header-left">
                    <div className="ai-avatar-header">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <div>
                        <h3>SyncBoard AI</h3>
                        <span className="ai-status">Ready to help</span>
                    </div>
                </div>
                <div className="ai-chat-header-actions">
                    <button className="ai-header-btn" onClick={handleClearChat} title="Clear Chat">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                    </button>
                    <button className="ai-header-btn" onClick={onClose} title="Close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="ai-chat-messages">
                {messages.length === 0 ? (
                    <div className="ai-chat-empty">
                        <div className="ai-logo-large">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                <path d="M2 17l10 5 10-5" />
                                <path d="M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <h3>How can I help?</h3>
                        <p>I can generate concept maps, architecture diagrams, flowcharts, and more for your whiteboard.</p>
                        <div className="ai-suggestions">
                            {suggestions.map((s, i) => (
                                <button
                                    key={i}
                                    className="ai-suggestion-chip"
                                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    messages.map((msg, msgIdx) => (
                        <div key={msgIdx} className={`ai-message ${msg.role}`}>
                            <div className="ai-message-avatar">
                                {msg.role === 'user' ? (
                                    <div className="user-avatar-icon">Y</div>
                                ) : (
                                    <div className="ai-avatar-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                            <path d="M2 17l10 5 10-5" />
                                            <path d="M2 12l10 5 10-5" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <div className="ai-message-content">
                                <div className="ai-message-name">
                                    {msg.role === 'user' ? 'You' : 'SyncBoard AI'}
                                </div>
                                {msg.diagrams && msg.diagrams.length > 0 ? (
                                    parseMessage(msg.content, msg.diagrams).map((part, pIdx) => (
                                        part.type === 'text' ? (
                                            <div
                                                key={`text-${msgIdx}-${pIdx}`}
                                                className="ai-message-text"
                                                dangerouslySetInnerHTML={{ __html: formatText(part.content) }}
                                            />
                                        ) : (
                                            <DiagramBlock
                                                key={`diagram-${msgIdx}-${pIdx}`}
                                                code={part.content}
                                                diagramId={`mermaid-${msgIdx}-${pIdx}`}
                                                onAddToBoard={onAddToBoard}
                                            />
                                        )
                                    ))
                                ) : (
                                    <div
                                        className={`ai-message-text ${msg.error ? 'error' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: formatText(msg.content) }}
                                    />
                                )}
                            </div>
                        </div>
                    ))
                )}
                {isLoading && (
                    <div className="ai-message assistant">
                        <div className="ai-message-avatar">
                            <div className="ai-avatar-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                    <path d="M2 17l10 5 10-5" />
                                    <path d="M2 12l10 5 10-5" />
                                </svg>
                            </div>
                        </div>
                        <div className="ai-message-content">
                            <div className="ai-message-name">SyncBoard AI</div>
                            <div className="ai-typing">
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                                <span className="typing-label">Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="ai-chat-input-area">
                <div className="ai-input-wrapper">
                    <textarea
                        ref={inputRef}
                        className="ai-input"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        placeholder="Ask me to create diagrams, concept maps..."
                        rows="1"
                        disabled={isLoading}
                    />
                    <button
                        className={`ai-send-btn ${input.trim() ? 'active' : ''}`}
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                    </button>
                </div>
                <div className="ai-input-hint">
                    Press Enter to send · Shift+Enter for new line
                </div>
            </div>
        </div>
    );
}

export default AiChat;
