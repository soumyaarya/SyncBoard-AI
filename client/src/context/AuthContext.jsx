import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'syncboard_token';

export function AuthProvider({ children }) {
    const SESSION_FLAG = 'syncboard_session_active';

    // On fresh browser/tab open, sessionStorage is empty → clear persisted token
    // On page refresh, sessionStorage still has the flag → keep token
    const getInitialToken = () => {
        const isExistingSession = sessionStorage.getItem(SESSION_FLAG);
        if (!isExistingSession) {
            // Fresh browser open — clear stale token
            localStorage.removeItem(TOKEN_KEY);
            return null;
        }
        return localStorage.getItem(TOKEN_KEY);
    };

    const [user, setUser] = useState(null);
    const [token, setToken] = useState(getInitialToken);
    const [loading, setLoading] = useState(true);

    // Mark this session as active (survives refreshes, cleared on tab/browser close)
    useEffect(() => {
        sessionStorage.setItem(SESSION_FLAG, 'true');
    }, []);

    useEffect(() => {
        if (token) {
            checkAuth();
        } else {
            setLoading(false);
        }
    }, [token]);

    const checkAuth = async () => {
        try {
            const response = await fetch('/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.user) {
                setUser(data.user);
            } else {
                // Token is invalid
                logout();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = () => {
        window.location.href = '/auth/google';
    };

    const handleAuthCallback = (newToken) => {
        localStorage.setItem(TOKEN_KEY, newToken);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(SESSION_FLAG);
        setToken(null);
        setUser(null);
    };

    const value = {
        user,
        token,
        loading,
        login,
        logout,
        handleAuthCallback,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
