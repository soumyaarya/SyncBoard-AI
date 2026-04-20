import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Dashboard.css';

function Dashboard({ user, onCreate, onJoin, onLogout, token }) {
    const { logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [rooms, setRooms] = useState([]);
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [errorRooms, setErrorRooms] = useState('');
    const [showJoinInput, setShowJoinInput] = useState(false);
    const [showCreateInput, setShowCreateInput] = useState(false);
    const [joinRoomId, setJoinRoomId] = useState('');
    const [createRoomName, setCreateRoomName] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState('');

    // Fetch user's rooms
    const fetchRooms = useCallback(async () => {
        if (!token) return;
        setLoadingRooms(true);
        setErrorRooms('');
        try {
            const response = await fetch('/api/rooms/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setRooms(data.rooms || []);
            } else {
                setErrorRooms('Failed to load your whiteboards');
            }
        } catch (err) {
            console.error('Failed to fetch rooms:', err);
            setErrorRooms('Could not connect to server');
        } finally {
            setLoadingRooms(false);
        }
    }, [token]);

    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    // Create new room
    const handleCreate = async () => {
        setActionLoading(true);
        setActionError('');
        try {
            await onCreate(createRoomName || 'Untitled Whiteboard');
        } catch (err) {
            setActionError(err.message || 'Failed to create whiteboard');
            setActionLoading(false);
        }
    };

    // Join existing room
    const handleJoin = async (roomId, roomName) => {
        setActionLoading(true);
        setActionError('');
        try {
            await onJoin(roomId || joinRoomId.trim(), roomName);
        } catch (err) {
            setActionError(err.message || 'Room not found');
            setActionLoading(false);
        }
    };

    // Delete room
    const handleDelete = async (roomId, e) => {
        e.stopPropagation();
        if (!confirm('Delete this whiteboard? This action cannot be undone.')) return;
        try {
            const response = await fetch(`/api/rooms/${roomId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setRooms(prev => prev.filter(r => r.roomId !== roomId));
            } else {
                alert(data.message || 'Failed to delete');
            }
        } catch (err) {
            alert('Failed to delete whiteboard');
        }
    };

    // Format date for display
    const formatDate = (dateStr) => {
        if (!dateStr) return 'Unknown';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const handleLogout = () => {
        logout();
        if (onLogout) onLogout();
    };

    return (
        <div className="dashboard-page">
            {/* Navigation */}
            <nav className="dashboard-nav">
                <div className="dashboard-nav-left">
                    <div className="dashboard-nav-logo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                            <line x1="12" y1="22" x2="12" y2="15.5" />
                            <polyline points="22 8.5 12 15.5 2 8.5" />
                        </svg>
                    </div>
                    <span className="dashboard-nav-brand">SyncBoard</span>
                </div>
                <div className="dashboard-nav-right">
                    <button
                        className="btn-icon-nav"
                        onClick={toggleTheme}
                        title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                        style={{
                            width: 36, height: 36, borderRadius: 8,
                            border: '1px solid var(--glass-border)',
                            background: 'transparent', color: 'var(--text-secondary)',
                            cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        {theme === 'dark' ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
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
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        )}
                    </button>
                    <div className="dashboard-user-pill">
                        {user?.avatar ? (
                            <img src={user.avatar} alt={user.name} className="dashboard-user-avatar" />
                        ) : (
                            <div className="dashboard-user-avatar-placeholder">
                                {user?.name?.charAt(0) || '?'}
                            </div>
                        )}
                        <span className="dashboard-user-name">{user?.name?.split(' ')[0] || 'User'}</span>
                    </div>
                    <button className="dashboard-logout-btn" onClick={handleLogout}>
                        Sign out
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <div className="dashboard-content">
                {/* Welcome */}
                <div className="dashboard-welcome">
                    <h1>Welcome back, {user?.name?.split(' ')[0] || 'there'} 👋</h1>
                    <p>Create a new whiteboard or jump back into an existing one.</p>
                </div>

                {/* Quick Actions */}
                <div className="dashboard-actions">
                    <div className="action-card" onClick={() => { setShowCreateInput(!showCreateInput); setShowJoinInput(false); setActionError(''); }}>
                        <div className="action-card-icon create">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </div>
                        <div className="action-card-text">
                            <h3>New Whiteboard</h3>
                            <p>Start with a fresh canvas</p>
                        </div>
                    </div>
                    <div className="action-card" onClick={() => { setShowJoinInput(!showJoinInput); setShowCreateInput(false); setActionError(''); }}>
                        <div className="action-card-icon join">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                <polyline points="10 17 15 12 10 7" />
                                <line x1="15" y1="12" x2="3" y2="12" />
                            </svg>
                        </div>
                        <div className="action-card-text">
                            <h3>Join Room</h3>
                            <p>Enter an existing room ID</p>
                        </div>
                    </div>
                </div>

                {/* Inline Create Input */}
                {showCreateInput && (
                    <div className="create-inline">
                        <input
                            type="text"
                            className="input"
                            placeholder="Whiteboard name (optional)"
                            value={createRoomName}
                            onChange={(e) => setCreateRoomName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            autoFocus
                            disabled={actionLoading}
                        />
                        <button className="btn btn-primary" onClick={handleCreate} disabled={actionLoading}>
                            {actionLoading ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                )}

                {/* Inline Join Input */}
                {showJoinInput && (
                    <div className="join-inline">
                        <input
                            type="text"
                            className="input"
                            placeholder="Enter room ID"
                            value={joinRoomId}
                            onChange={(e) => setJoinRoomId(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                            autoFocus
                            disabled={actionLoading}
                        />
                        <button className="btn btn-primary" onClick={() => handleJoin()} disabled={actionLoading || !joinRoomId.trim()}>
                            {actionLoading ? 'Joining...' : 'Join'}
                        </button>
                    </div>
                )}

                {/* Action Error */}
                {actionError && (
                    <div className="error-message" style={{ marginTop: 12, marginBottom: 12 }}>
                        {actionError}
                    </div>
                )}

                {/* Rooms Section */}
                <div className="dashboard-rooms-header">
                    <h2>
                        My Whiteboards
                        {rooms.length > 0 && <span className="room-count">{rooms.length}</span>}
                    </h2>
                </div>

                {/* Loading State */}
                {loadingRooms && (
                    <div className="rooms-loading">
                        <div className="loading-spinner"></div>
                        <span>Loading your whiteboards...</span>
                    </div>
                )}

                {/* Error State */}
                {!loadingRooms && errorRooms && (
                    <div className="rooms-error">
                        <p>{errorRooms}</p>
                        <button className="btn btn-secondary" onClick={fetchRooms}>
                            Try Again
                        </button>
                    </div>
                )}

                {/* Empty State */}
                {!loadingRooms && !errorRooms && rooms.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="3" width="20" height="14" rx="2" />
                                <line x1="8" y1="21" x2="16" y2="21" />
                                <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                        </div>
                        <h3>No whiteboards yet</h3>
                        <p>Create your first whiteboard or join an existing room to get started.</p>
                    </div>
                )}

                {/* Room Cards Grid */}
                {!loadingRooms && !errorRooms && rooms.length > 0 && (
                    <div className="rooms-grid">
                        {rooms.map((room) => (
                            <div
                                key={room._id || room.roomId}
                                className="room-card"
                                onDoubleClick={() => handleJoin(room.roomId, room.name)}
                            >
                                <div className="room-card-header">
                                    <h4 className="room-card-title">{room.name || 'Untitled Whiteboard'}</h4>
                                    <span className="room-card-id">{room.roomId?.slice(0, 8)}</span>
                                </div>
                                <div className="room-card-meta">
                                    <span className="room-card-meta-item">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                        {formatDate(room.lastActivity || room.createdAt)}
                                    </span>
                                    {room.participants && room.participants.length > 0 && (
                                        <span className="room-card-meta-item">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                <circle cx="9" cy="7" r="4" />
                                            </svg>
                                            {room.participants.length} member{room.participants.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                                <div className="room-card-actions">
                                    <button
                                        className="room-card-open"
                                        onClick={() => handleJoin(room.roomId, room.name)}
                                    >
                                        Open
                                    </button>
                                    <button
                                        className="room-card-delete"
                                        onClick={(e) => handleDelete(room.roomId, e)}
                                        title="Delete whiteboard"
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
