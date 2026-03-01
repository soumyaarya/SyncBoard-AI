import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'syncboard_token';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY));
    const [loading, setLoading] = useState(true);

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
