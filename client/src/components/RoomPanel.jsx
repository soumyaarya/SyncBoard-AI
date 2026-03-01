import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './RoomPanel.css';

function RoomPanel({ user, onCreate, onJoin, onLogin, isConnected, isAuthenticated }) {
    const { logout } = useAuth();
    const [roomIdInput, setRoomIdInput] = useState('');
    const [roomName, setRoomName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleCreate = async () => {
        setError('');
        setIsLoading(true);
        try {
            await onCreate(roomName || 'Untitled Whiteboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoin = async (e) => {
        e.preventDefault();
        if (!roomIdInput.trim()) {
            setError('Please enter a room ID');
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            await onJoin(roomIdInput.trim());
        } catch (err) {
            setError(err.message || 'Room not found');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="room-panel-container">
            <div className="room-panel glass-card">
                {/* Header */}
                <div className="room-panel-header">
                    {isAuthenticated ? (
                        <>
                            <div className="user-info">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt={user.name} className="user-avatar" />
                                ) : (
                                    <div className="user-avatar-placeholder">
                                        {user?.name?.charAt(0) || '?'}
                                    </div>
                                )}
                                <div className="user-details">
                                    <span className="user-name">{user?.name || 'User'}</span>
                                    <span className="user-email">{user?.email}</span>
                                </div>
                            </div>
                            <button className="btn btn-secondary" onClick={logout}>
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="user-info">
                                <div className="user-avatar-placeholder guest">
                                    👤
                                </div>
                                <div className="user-details">
                                    <span className="user-name">Guest Mode</span>
                                    <span className="user-email">Sign in to save your work</span>
                                </div>
                            </div>
                            <button className="btn btn-primary" onClick={onLogin}>
                                Sign In
                            </button>
                        </>
                    )}
                </div>

                {/* Connection Status */}
                <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                    <span className="status-dot"></span>
                    <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
                </div>

                {/* Guest notice */}
                {!isAuthenticated && (
                    <div className="guest-notice">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>You're using SyncBoard as a guest. Sign in to save your whiteboards.</span>
                    </div>
                )}

                {/* Create Room Section */}
                <div className="room-section">
                    <h3>Create New Whiteboard</h3>
                    <div className="input-group">
                        <input
                            type="text"
                            className="input"
                            placeholder="Whiteboard name (optional)"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            disabled={!isConnected || isLoading}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={handleCreate}
                            disabled={!isConnected || isLoading}
                        >
                            {isLoading ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </div>

                <div className="divider">
                    <span>or</span>
                </div>

                {/* Join Room Section */}
                <div className="room-section">
                    <h3>Join Existing Room</h3>
                    <form onSubmit={handleJoin} className="input-group">
                        <input
                            type="text"
                            className="input"
                            placeholder="Enter room ID"
                            value={roomIdInput}
                            onChange={(e) => setRoomIdInput(e.target.value)}
                            disabled={!isConnected || isLoading}
                        />
                        <button
                            type="submit"
                            className="btn btn-secondary"
                            disabled={!isConnected || isLoading}
                        >
                            {isLoading ? 'Joining...' : 'Join'}
                        </button>
                    </form>
                </div>

                {/* Error Message */}
                {error && <div className="error-message">{error}</div>}
            </div>

            {/* Background Effects */}
            <div className="bg-effects">
                <div className="bg-gradient"></div>
                <div className="bg-grid"></div>
            </div>
        </div>
    );
}

export default RoomPanel;
