import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://localhost:3001';

export const useSocket = () => {
    const socketRef = useRef(null);

    useEffect(() => {
        // 소켓 연결
        socketRef.current = io(SOCKET_SERVER_URL, {
            transports: ['websocket'],
            autoConnect: true
        });

        // 연결 이벤트 리스너
        socketRef.current.on('connect', () => {
            console.log('Connected to server');
        });

        socketRef.current.on('connect_error', (error) => {
            console.error('Connection error:', error);
        });

        // 컴포넌트 언마운트 시 소켓 연결 해제
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const joinRoom = (roomId, playerName) => {
        if (socketRef.current) {
            socketRef.current.emit('joinRoom', { roomId, playerName });
        }
    };

    const updateGameState = (roomId, gameState) => {
        if (socketRef.current) {
            socketRef.current.emit('updateGameState', { roomId, gameState });
        }
    };

    const sendGameOver = (roomId, score) => {
        if (socketRef.current) {
            socketRef.current.emit('gameOver', { roomId, score });
        }
    };

    return {
        socket: socketRef.current,
        joinRoom,
        updateGameState,
        sendGameOver
    };
}; 