import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useSocket } from './hooks/useSocket';
import Login from './components/Login';
import RoomPanel from './components/RoomPanel';
import Dashboard from './components/Dashboard';
import Whiteboard from './components/Whiteboard';
import './App.css';

// Auth callback component to handle JWT token from URL
function AuthCallback() {
    const [searchParams] = useSearchParams();
    const { handleAuthCallback } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            handleAuthCallback(token);
            sessionStorage.setItem('justLoggedIn', 'true');
            navigate('/', { replace: true });
        } else {
            navigate('/?error=no_token', { replace: true });
        }
    }, [searchParams, handleAuthCallback, navigate]);

    return (
        <div className="loading-screen">
            <div className="loading-spinner"></div>
            <p>Authenticating...</p>
        </div>
    );
}

function App() {
    const { user, token, loading, isAuthenticated, login, logout } = useAuth();
    const { socket, isConnected, roomId, users, initialStrokes, createRoom, joinRoom, leaveRoom } = useSocket(token);
    const [currentRoom, setCurrentRoom] = useState(null);
    const [roomName, setRoomName] = useState('');
    const [showSavePrompt, setShowSavePrompt] = useState(false);
    const [guestMode, setGuestMode] = useState(false); // Track if user chose guest mode
    const [showDashboard, setShowDashboard] = useState(false); // Controls showing room panel vs homepage
    const navigate = useNavigate();
    const location = useLocation();

    // Check for ?join= parameter in URL (shared whiteboard links)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const joinRoomId = params.get('join');
        if (joinRoomId && !currentRoom) {
            // Auto-enter guest mode if not authenticated
            if (!isAuthenticated) {
                setGuestMode(true);
            }
            // Auto-join the room
            handleJoinRoom(joinRoomId).catch(err => {
                console.error('Failed to auto-join room:', err);
            });
            // Clean the URL (remove ?join= parameter)
            navigate('/', { replace: true });
        }
    }, [location.search, isAuthenticated]);

    // Handle room creation (works for guests too)
    const handleCreateRoom = async (name) => {
        try {
            const result = await createRoom(name);
            setCurrentRoom(result.roomId);
            setRoomName(name || 'Untitled Whiteboard');
        } catch (error) {
            console.error('Failed to create room:', error);
        }
    };

    // Handle room joining
    const handleJoinRoom = async (id, name = '') => {
        try {
            const result = await joinRoom(id);
            setCurrentRoom(id);
            setRoomName(name || `Room ${id.slice(0, 6)}`);
            return result;
        } catch (error) {
            console.error('Failed to join room:', error);
            throw error;
        }
    };

    // Handle leaving room — authenticated users go to dashboard, guests to homepage
    const handleLeaveRoom = () => {
        leaveRoom();
        setCurrentRoom(null);
        setRoomName('');
        setShowDashboard(isAuthenticated); // Dashboard for signed users, homepage for guests
    };

    // Handle save - requires auth
    const handleSave = () => {
        if (!isAuthenticated) {
            setShowSavePrompt(true);
        } else {
            // Actually save to database
            if (socket && currentRoom) {
                socket.emit('save-drawing', { roomId: currentRoom }, (response) => {
                    if (response.success) {
                        alert('Whiteboard saved successfully!');
                    } else {
                        alert('Failed to save: ' + response.error);
                    }
                });
            }
        }
    };

    // Continue as guest
    const handleContinueAsGuest = () => {
        setGuestMode(true);
        setShowDashboard(true); // Show room panel after choosing guest mode
    };

    // Handle login from save prompt
    const handleLoginFromPrompt = () => {
        // Store current room to return after login
        if (currentRoom) {
            localStorage.setItem('returnToRoom', currentRoom);
        }
        login();
    };

    // Check if returning from login
    useEffect(() => {
        if (isAuthenticated && !currentRoom) {
            const returnRoom = localStorage.getItem('returnToRoom');
            if (returnRoom) {
                localStorage.removeItem('returnToRoom');
                setShowDashboard(true);
                handleJoinRoom(returnRoom);
            }
        }
    }, [isAuthenticated]);

    // Handle "Get Started" / login button — show dashboard after auth
    const handleGetStarted = () => {
        if (isAuthenticated) {
            setShowDashboard(true);
        } else {
            login();
        }
    };

    // After auth callback, show dashboard
    useEffect(() => {
        if (isAuthenticated && !showDashboard && !currentRoom) {
            // User just logged in — show dashboard
            const justLoggedIn = sessionStorage.getItem('justLoggedIn');
            if (justLoggedIn) {
                sessionStorage.removeItem('justLoggedIn');
                setShowDashboard(true);
            }
        }
    }, [isAuthenticated]);

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    // Determine what to show
    const showWhiteboard = !!currentRoom;
    const showRoomPanel = !showWhiteboard && showDashboard && (isAuthenticated || guestMode);
    const showLandingPage = !showWhiteboard && !showRoomPanel;

    return (
        <div className="app">
            {/* Save Prompt Modal */}
            {showSavePrompt && (
                <div className="modal-overlay" onClick={() => setShowSavePrompt(false)}>
                    <div className="modal glass-card" onClick={e => e.stopPropagation()}>
                        <h3>Sign in to Save</h3>
                        <p>You need to sign in with Google to save your whiteboard.</p>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowSavePrompt(false)}>
                                Continue without saving
                            </button>
                            <button className="btn btn-primary" onClick={handleLoginFromPrompt}>
                                Sign in with Google
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Routes>
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route
                    path="/"
                    element={
                        showWhiteboard ? (
                            <Whiteboard
                                socket={socket}
                                roomId={currentRoom}
                                roomName={roomName}
                                users={users}
                                user={user}
                                initialStrokes={initialStrokes}
                                onLeave={handleLeaveRoom}
                                onSave={handleSave}
                                onLogout={() => { handleLeaveRoom(); logout(); }}
                                isConnected={isConnected}
                                isAuthenticated={isAuthenticated}
                            />
                        ) : showRoomPanel ? (
                            isAuthenticated ? (
                                <Dashboard
                                    user={user}
                                    onCreate={handleCreateRoom}
                                    onJoin={handleJoinRoom}
                                    onLogout={() => { logout(); setShowDashboard(false); }}
                                    token={token}
                                />
                            ) : (
                                <RoomPanel
                                    user={user}
                                    onCreate={handleCreateRoom}
                                    onJoin={handleJoinRoom}
                                    onLogin={login}
                                    isConnected={isConnected}
                                    isAuthenticated={isAuthenticated}
                                />
                            )
                        ) : (
                            <Login
                                onLogin={handleGetStarted}
                                onContinueAsGuest={handleContinueAsGuest}
                                onSwitchAccount={() => { logout(); login(); }}
                                user={user}
                                isAuthenticated={isAuthenticated}
                            />
                        )
                    }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}

export default App;
