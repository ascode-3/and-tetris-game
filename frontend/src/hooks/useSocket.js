import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = process.env.REACT_APP_SOCKET_SERVER_URL || 'http://localhost:3001';

// 전역 소켓 인스턴스
let globalSocket = null;

// 소켓 초기화 함수
const initializeSocket = () => {
    if (globalSocket) return globalSocket;

    globalSocket = io(SOCKET_SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
    });

    // 기본 이벤트 리스너 설정
    globalSocket.on('connect', () => {
        console.log('Connected to server');
    });

    globalSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        if (globalSocket.io.opts.transports[0] === 'websocket') {
            console.log('Falling back to polling transport');
            globalSocket.io.opts.transports = ['polling', 'websocket'];
        }
    });

    return globalSocket;
};

export const useSocket = () => {
    const socketRef = useRef(null);
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (!socketRef.current) {
            socketRef.current = initializeSocket();
        }

        // 첫 마운트 시에만 디버그 이벤트 리스너 등록
        if (isInitialMount.current) {
            isInitialMount.current = false;
            
            // 디버깅을 위한 이벤트 리스너는 한 번만 등록
            const debugListener = (eventName, ...args) => {
                if (!eventName.startsWith('debug')) {  // debug 이벤트는 로깅하지 않음
                    console.log(`Socket event received: ${eventName}`, args);
                }
            };
            
            socketRef.current.onAny(debugListener);
            
            return () => {
                socketRef.current.offAny(debugListener);
            };
        }
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
        if (socketRef.current && roomId && gameState) {
            socketRef.current.emit('updateGameState', { roomId, gameState });
        }
    };

    const sendGameOver = (roomId, score) => {
        if (socketRef.current && roomId) {
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