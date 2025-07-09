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

    // userId도 함께 전송하여 서버가 식별할 수 있도록 수정
    const joinRoom = (roomId, playerName, userId) => {
        if (socketRef.current) {
            console.log('Joining room:', roomId, 'as', playerName, '(userId:', userId, ')');
            socketRef.current.emit('joinRoom', { roomId, playerName, userId });
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

    // 라인 삭제 정보를 서버로 전송
    const sendLineCleared = (roomId, linesCleared) => {
        if (socketRef.current && roomId) {
            socketRef.current.emit('lineCleared', { roomId, linesCleared });
        }
    };

    // 가비지 라인 수신 콜백 등록
    const onReceiveGarbage = (callback) => {
        if (socketRef.current) {
            socketRef.current.on('receiveGarbage', callback);
            return () => socketRef.current.off('receiveGarbage', callback);
        }
        return () => {};
    };

    return {
        socket: socketRef.current,
        joinRoom,
        updateGameState,
        sendGameOver,
        sendLineCleared,
        onReceiveGarbage
    };
}; 