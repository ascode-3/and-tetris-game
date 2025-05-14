import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = process.env.REACT_APP_SOCKET_SERVER_URL || 'http://localhost:3001';

export const useSocket = () => {
    const socketRef = useRef(null);

    useEffect(() => {
        // 이미 연결된 소켓이 있다면 재사용
        if (socketRef.current) {
            return;
        }

        // 소켓 연결
        try {
            socketRef.current = io(SOCKET_SERVER_URL, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                timeout: 10000
            });

            // 연결 이벤트 리스너
            socketRef.current.on('connect', () => {
                console.log('Connected to server');
            });

            socketRef.current.on('connect_error', (error) => {
                console.error('Connection error:', error);
                // 연결 실패 시 polling으로 fallback
                if (socketRef.current.io.opts.transports[0] === 'websocket') {
                    console.log('Falling back to polling transport');
                    socketRef.current.io.opts.transports = ['polling', 'websocket'];
                }
            });

            // 디버깅을 위한 이벤트 리스너
            socketRef.current.onAny((eventName, ...args) => {
                console.log(`Socket event received: ${eventName}`, args);
            });

        } catch (error) {
            console.error('Socket initialization error:', error);
        }

        // 컴포넌트 언마운트 시 소켓 연결 해제
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const joinRoom = (roomId, playerName) => {
        if (socketRef.current) {
            console.log('Joining room:', roomId, 'as', playerName);
            socketRef.current.emit('joinRoom', { roomId, playerName });
        } else {
            console.error('Socket not initialized');
        }
    };

    const updateGameState = (roomId, gameState) => {
        if (socketRef.current) {
            socketRef.current.emit('updateGameState', { roomId, gameState });
        } else {
            console.error('Socket not initialized');
        }
    };

    const sendGameOver = (roomId, score) => {
        if (socketRef.current) {
            socketRef.current.emit('gameOver', { roomId, score });
        } else {
            console.error('Socket not initialized');
        }
    };

    return {
        socket: socketRef.current,
        joinRoom,
        updateGameState,
        sendGameOver
    };
}; 