import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

export function useSocket(token) {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [roomId, setRoomId] = useState(null);
    const [users, setUsers] = useState([]);
    const [initialStrokes, setInitialStrokes] = useState([]);
    const socketRef = useRef(null);

    useEffect(() => {
        // Allow connection even without token (guest mode)
        const newSocket = io(SOCKET_URL, {
            auth: { token: token || null },
            transports: ['websocket', 'polling']
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
        });

        newSocket.on('user-joined', ({ user: joinedUser }) => {
            setUsers(prev => [...prev.filter(u => u.id !== joinedUser.id), joinedUser]);
        });

        newSocket.on('user-left', ({ userId }) => {
            setUsers(prev => prev.filter(u => u.id !== userId));
        });

        return () => {
            newSocket.disconnect();
        };
    }, [token]);

    const createRoom = useCallback((name) => {
        return new Promise((resolve, reject) => {
            if (!socketRef.current) {
                reject(new Error('Socket not connected'));
                return;
            }

            socketRef.current.emit('create-room', { name }, (response) => {
                if (response.success) {
                    setRoomId(response.roomId);
                    setUsers(response.users || []);
                    setInitialStrokes([]);
                    resolve(response);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }, []);

    const joinRoom = useCallback((id) => {
        return new Promise((resolve, reject) => {
            if (!socketRef.current) {
                reject(new Error('Socket not connected'));
                return;
            }

            socketRef.current.emit('join-room', id, (response) => {
                if (response.success) {
                    setRoomId(id);
                    setUsers(response.users || []);
                    setInitialStrokes(response.strokes || []);
                    resolve(response);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }, []);

    const leaveRoom = useCallback(() => {
        if (socketRef.current && roomId) {
            socketRef.current.emit('leave-room', roomId);
            setRoomId(null);
            setUsers([]);
            setInitialStrokes([]);
        }
    }, [roomId]);

    return {
        socket,
        isConnected,
        roomId,
        users,
        initialStrokes,
        createRoom,
        joinRoom,
        leaveRoom
    };
}
