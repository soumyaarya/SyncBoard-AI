import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function useAuthCheck() {
    const { user, loading } = useAuth();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (!loading) {
            setIsReady(true);
        }
    }, [loading]);

    return { user, loading, isReady };
}
