import { useState, useEffect, useCallback, useRef } from 'react';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

export function useWebRTC(socket, roomId, onDataReceived) {
    const [peers, setPeers] = useState(new Map());
    const peersRef = useRef(new Map());
    const dataChannelsRef = useRef(new Map());

    useEffect(() => {
        if (!socket || !roomId) return;

        // Handle incoming offer
        socket.on('offer', async ({ offer, fromSocketId, fromUser }) => {
            console.log('Received offer from:', fromSocketId);
            try {
                // If we already have a connection with this peer, close it first
                const existingPc = peersRef.current.get(fromSocketId);
                if (existingPc) {
                    existingPc.close();
                    peersRef.current.delete(fromSocketId);
                    dataChannelsRef.current.delete(fromSocketId);
                }

                const peerConnection = createPeerConnection(fromSocketId, fromUser);

                await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);

                socket.emit('answer', {
                    answer,
                    targetSocketId: fromSocketId
                });
            } catch (error) {
                console.error('Error handling offer:', error);
            }
        });

        // Handle incoming answer
        socket.on('answer', async ({ answer, fromSocketId }) => {
            console.log('Received answer from:', fromSocketId);
            const peerConnection = peersRef.current.get(fromSocketId);
            if (peerConnection) {
                // Only set remote description if we're expecting an answer
                if (peerConnection.signalingState === 'have-local-offer') {
                    try {
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                    } catch (error) {
                        console.error('Error setting remote description:', error);
                    }
                } else {
                    console.warn(`Ignoring answer — connection in "${peerConnection.signalingState}" state`);
                }
            }
        });

        // Handle ICE candidates
        socket.on('ice-candidate', async ({ candidate, fromSocketId }) => {
            const peerConnection = peersRef.current.get(fromSocketId);
            if (peerConnection && candidate) {
                try {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (error) {
                    console.error('Error adding ICE candidate:', error);
                }
            }
        });

        return () => {
            socket.off('offer');
            socket.off('answer');
            socket.off('ice-candidate');

            // Cleanup peer connections
            peersRef.current.forEach((pc) => pc.close());
            peersRef.current.clear();
            dataChannelsRef.current.clear();
        };
    }, [socket, roomId]);

    const createPeerConnection = useCallback((socketId, user) => {
        const peerConnection = new RTCPeerConnection(ICE_SERVERS);

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    targetSocketId: socketId
                });
            }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
            console.log(`Peer ${socketId} connection state:`, peerConnection.connectionState);
            if (peerConnection.connectionState === 'disconnected' ||
                peerConnection.connectionState === 'failed') {
                closePeerConnection(socketId);
            }
        };

        // Handle data channel
        peerConnection.ondatachannel = (event) => {
            setupDataChannel(event.channel, socketId);
        };

        peersRef.current.set(socketId, peerConnection);
        setPeers(new Map(peersRef.current));

        return peerConnection;
    }, [socket]);

    const setupDataChannel = useCallback((dataChannel, socketId) => {
        dataChannel.onopen = () => {
            console.log(`Data channel with ${socketId} opened`);
        };

        dataChannel.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (onDataReceived) {
                    onDataReceived(data, socketId);
                }
            } catch (error) {
                console.error('Error parsing data channel message:', error);
            }
        };

        dataChannel.onclose = () => {
            console.log(`Data channel with ${socketId} closed`);
        };

        dataChannelsRef.current.set(socketId, dataChannel);
    }, [onDataReceived]);

    const initiateConnection = useCallback(async (targetSocketId, targetUser) => {
        console.log('Initiating connection to:', targetSocketId);
        const peerConnection = createPeerConnection(targetSocketId, targetUser);

        // Create data channel
        const dataChannel = peerConnection.createDataChannel('drawing', {
            ordered: true
        });
        setupDataChannel(dataChannel, targetSocketId);

        // Create and send offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        socket.emit('offer', {
            roomId,
            offer,
            targetSocketId
        });
    }, [socket, roomId, createPeerConnection, setupDataChannel]);

    const closePeerConnection = useCallback((socketId) => {
        const peerConnection = peersRef.current.get(socketId);
        if (peerConnection) {
            peerConnection.close();
            peersRef.current.delete(socketId);
            dataChannelsRef.current.delete(socketId);
            setPeers(new Map(peersRef.current));
        }
    }, []);

    const sendToAllPeers = useCallback((data) => {
        const message = JSON.stringify(data);
        dataChannelsRef.current.forEach((channel) => {
            if (channel.readyState === 'open') {
                channel.send(message);
            }
        });
    }, []);

    const sendToPeer = useCallback((socketId, data) => {
        const channel = dataChannelsRef.current.get(socketId);
        if (channel && channel.readyState === 'open') {
            channel.send(JSON.stringify(data));
        }
    }, []);

    return {
        peers,
        initiateConnection,
        closePeerConnection,
        sendToAllPeers,
        sendToPeer
    };
}
