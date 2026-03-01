import { useTheme } from '../context/ThemeContext';
import './Login.css';

function Login({ onLogin, onContinueAsGuest, onSwitchAccount, user, isAuthenticated }) {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="landing-page">
            {/* Navigation */}
            <nav className="landing-nav">
                <div className="nav-left">
                    <div className="nav-logo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                            <line x1="12" y1="22" x2="12" y2="15.5" />
                            <polyline points="22 8.5 12 15.5 2 8.5" />
                        </svg>
                    </div>
                    <span className="nav-brand">SyncBoard</span>
                </div>
                <div className="nav-links">
                    <a href="#features" className="nav-link">Features</a>
                    <a href="#ai" className="nav-link">AI Assistant</a>
                    <a href="#collab" className="nav-link">Collaboration</a>
                </div>
                <div className="nav-right">
                    <button
                        className="btn-icon-nav"
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
                    <button className="btn-nav-primary" onClick={onLogin}>
                        Get started
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-content">
                    <h1 className="hero-title">
                        Your all-in-one<br />
                        <span className="hero-highlight">collaborative whiteboard.</span>
                    </h1>
                    <p className="hero-subtitle">
                        SyncBoard brings teams and tools together for seamless
                        real-time brainstorming, drawing, and visual collaboration.
                    </p>
                    <div className="hero-actions">
                        {isAuthenticated && user ? (
                            <>
                                <button className="btn-hero-primary btn-continue" onClick={onLogin}>
                                    {user.avatar && (
                                        <img src={user.avatar} alt="" className="btn-avatar" />
                                    )}
                                    Continue as {user.name?.split(' ')[0] || 'User'}
                                </button>
                                <button className="btn-hero-secondary" onClick={onSwitchAccount}>
                                    Switch account
                                </button>
                            </>
                        ) : (
                            <>
                                <button className="btn-hero-primary" onClick={onLogin}>
                                    <svg viewBox="0 0 24 24" width="20" height="20">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Get started for free
                                </button>
                                <button className="btn-hero-secondary" onClick={onContinueAsGuest}>
                                    Continue as Guest
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Product Preview */}
                <div className="product-preview">
                    <div className="preview-window">
                        <div className="preview-titlebar">
                            <div className="preview-dots">
                                <span className="dot red"></span>
                                <span className="dot yellow"></span>
                                <span className="dot green"></span>
                            </div>
                            <div className="preview-tab">SyncBoard — Whiteboard</div>
                        </div>
                        <div className="preview-content">
                            {/* Toolbar preview */}
                            <div className="preview-sidebar">
                                <div className="preview-tool active">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                                    </svg>
                                </div>
                                <div className="preview-tool">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="3" width="18" height="18" rx="2" />
                                    </svg>
                                </div>
                                <div className="preview-tool">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                    </svg>
                                </div>
                                <div className="preview-tool">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="4 7 4 4 20 4 20 7" />
                                        <line x1="9" y1="20" x2="15" y2="20" />
                                        <line x1="12" y1="4" x2="12" y2="20" />
                                    </svg>
                                </div>
                            </div>
                            {/* Canvas preview */}
                            <div className="preview-canvas">
                                <div className="preview-header-bar">
                                    <span className="preview-room-name">Team Brainstorm</span>
                                    <div className="preview-avatars">
                                        <div className="preview-avatar" style={{ background: '#6366f1' }}>A</div>
                                        <div className="preview-avatar" style={{ background: '#ec4899' }}>B</div>
                                        <div className="preview-avatar" style={{ background: '#f59e0b' }}>C</div>
                                    </div>
                                </div>
                                {/* Decorative drawings */}
                                <svg className="preview-drawing" viewBox="0 0 600 300" fill="none">
                                    {/* Concept map */}
                                    <rect x="220" y="30" width="160" height="50" rx="12" fill="#6366f1" opacity="0.15" stroke="#6366f1" strokeWidth="2" />
                                    <text x="300" y="60" textAnchor="middle" fill="#6366f1" fontSize="14" fontWeight="600">Main Idea</text>

                                    <rect x="60" y="140" width="140" height="45" rx="10" fill="#ec4899" opacity="0.1" stroke="#ec4899" strokeWidth="1.5" />
                                    <text x="130" y="167" textAnchor="middle" fill="#ec4899" fontSize="12">Feature A</text>

                                    <rect x="400" y="140" width="140" height="45" rx="10" fill="#22c55e" opacity="0.1" stroke="#22c55e" strokeWidth="1.5" />
                                    <text x="470" y="167" textAnchor="middle" fill="#22c55e" fontSize="12">Feature B</text>

                                    <rect x="220" y="220" width="160" height="45" rx="10" fill="#f59e0b" opacity="0.1" stroke="#f59e0b" strokeWidth="1.5" />
                                    <text x="300" y="247" textAnchor="middle" fill="#f59e0b" fontSize="12">Feature C</text>

                                    {/* Connection lines */}
                                    <line x1="260" y1="80" x2="160" y2="140" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4" />
                                    <line x1="340" y1="80" x2="440" y2="140" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4" />
                                    <line x1="300" y1="80" x2="300" y2="220" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4" />

                                    {/* Cursor */}
                                    <g transform="translate(380, 120)">
                                        <path d="M0 0 L0 16 L4.5 12 L9 18 L12 16.5 L7.5 10.5 L13.5 10.5 Z" fill="#6366f1" />
                                        <text x="16" y="16" fontSize="10" fill="#6366f1" fontWeight="500">Alice</text>
                                    </g>
                                </svg>

                                {/* AI chip */}
                                <div className="preview-ai-chip">
                                    <span>✨</span> AI Assistant
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="features-section" id="features">
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon-wrap purple">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                        </div>
                        <h4>Ultra Low Latency</h4>
                        <p>P2P WebRTC connections for instant real-time collaboration without any delays.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon-wrap pink">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <h4>Real-time Cursors</h4>
                        <p>See your teammates' cursors and drawings appear live as they create.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon-wrap amber">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                <path d="M2 17l10 5 10-5" />
                                <path d="M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <h4>AI-Powered</h4>
                        <p>Built-in AI assistant generates concept maps, flowcharts, and architecture diagrams.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon-wrap green">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                        </div>
                        <h4>Rich Drawing Tools</h4>
                        <p>Pen, shapes, sticky notes, text, colors, and more — everything you need to create.</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-brand">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                        <line x1="12" y1="22" x2="12" y2="15.5" />
                        <polyline points="22 8.5 12 15.5 2 8.5" />
                    </svg>
                    <span>SyncBoard</span>
                </div>
                <p className="footer-note">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Sign in to save and share your whiteboards
                </p>
            </footer>
        </div>
    );
}

export default Login;
