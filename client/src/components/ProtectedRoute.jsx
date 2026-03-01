import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute - Wraps routes that require authentication
 * 
 * Usage:
 * <Route path="/protected" element={<ProtectedRoute><SomeComponent /></ProtectedRoute>} />
 */
function ProtectedRoute({ children, requireAuth = true }) {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();

    // Show loading while checking auth status
    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    // If auth is required and user is not authenticated, redirect to login
    if (requireAuth && !isAuthenticated) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // If user is authenticated but route is for guests only, redirect to app
    if (!requireAuth && isAuthenticated) {
        return <Navigate to="/room" replace />;
    }

    return children;
}

export default ProtectedRoute;
