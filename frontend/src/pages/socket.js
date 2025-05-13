// socket.js
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = process.env.REACT_APP_SOCKET_SERVER_URL || 'https://and-tetris-game.onrender.com';

class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventWrappers = new Map(); // 이벤트 래퍼 함수를 저장할 맵
    this.initialize();
  }

  initialize() {
    console.log('Initializing socket connection to:', SOCKET_SERVER_URL);
    
    this.socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      withCredentials: true,
      forceNew: true,
      cors: {
        origin: "*"
      }
    });

    this.setupBaseListeners();
  }

  setupBaseListeners() {
    this.socket.on('connect', () => {
      console.log('✅ Socket connected successfully. Socket ID:', this.socket.id);
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected. Reason:', reason);
      this.isConnected = false;
    });

    this.socket.on('error', (error) => {
      console.error('Socket error occurred:', error);
      alert(error.message || '서버 오류가 발생했습니다.');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    // 서버로부터 오는 모든 이벤트를 로깅
    this.socket.onAny((eventName, ...args) => {
      console.log('Received event:', eventName, 'with data:', args);
    });
  }

  on(event, callback) {
    if (!this.socket) {
      console.error('Socket instance not initialized');
      return;
    }

    console.log('Registering listener for event:', event);
    
    // 이미 등록된 래퍼 함수가 있으면 제거
    if (this.eventWrappers.has(event)) {
      const oldWrappers = this.eventWrappers.get(event) || [];
      for (const wrapper of oldWrappers) {
        this.socket.off(event, wrapper);
      }
    }

    // 새로운 래퍼 함수 생성
    const wrappedCallback = (...args) => {
      console.log(`Event ${event} triggered with data:`, args);
      callback(...args);
    };
    
    this.socket.on(event, wrappedCallback);
    
    // 래퍼 함수를 맵에 저장
    if (!this.eventWrappers.has(event)) {
      this.eventWrappers.set(event, []);
    }
    this.eventWrappers.get(event).push(wrappedCallback);
    
    return wrappedCallback;
  }

  off(event, callback) {
    if (!this.socket) {
      console.error('Socket instance not initialized');
      return;
    }
    
    if (callback) {
      // 특정 콜백 함수에 대한 리스너 제거
      this.socket.off(event, callback);
      console.log(`Removed specific listener for event: ${event}`);
    } else {
      // 이벤트에 등록된 모든 리스너 제거
      this.socket.off(event);
      // 등록된 래퍼 함수도 제거
      if (this.eventWrappers.has(event)) {
        this.eventWrappers.delete(event);
      }
      console.log(`Removed all listeners for event: ${event}`);
    }
  }

  emit(event, data) {
    if (!this.isConnected) {
      console.warn('Socket is not connected. Cannot emit event:', event);
      return;
    }
    console.log(`Emitting event: ${event}`, data);
    this.socket.emit(event, data, (response) => {
      console.log(`Server acknowledged ${event}:`, response);
    });
  }

  connect() {
    if (!this.isConnected && this.socket) {
      console.log('Attempting to connect socket...');
      this.socket.connect();
    }
  }

  disconnect() {
    if (this.isConnected && this.socket) {
      console.log('Disconnecting socket...');
      this.socket.disconnect();
    }
  }
}

const socketManager = new SocketManager();
export default socketManager;