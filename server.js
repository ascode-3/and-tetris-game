// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: "*",
  methods: ['GET', 'POST'],
  credentials: true
}));

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
    transports: ['websocket', 'polling']
  },
  allowEIO3: true
});

const PORT = process.env.PORT || 10000;

// 기본 라우트 추가
app.get('/', (req, res) => {
  res.send('Server is running');
});

// 방 정보를 저장할 객체
const rooms = new Map();

// 디버깅을 위한 interval 추가
setInterval(() => {
  console.log('🔄 Active rooms:', rooms.size);
  rooms.forEach((participants, roomId) => {
    console.log(`Room ${roomId}: ${participants.size} participants`);
  });
}, 5000);

io.on('connection', (socket) => {
  console.log('✅ New client connected:', socket.id);
  console.log('📡 Transport type:', socket.conn.transport.name);

  // 연결된 모든 소켓 수 로깅
  const connectedSockets = io.sockets.sockets.size;
  console.log(`👥 Total connected clients: ${connectedSockets}`);

  // 모든 수신 이벤트 로깅
  socket.onAny((event, ...args) => {
    console.log('📥 Received event:', event, 'from socket:', socket.id, 'with data:', JSON.stringify(args));
  });

  // 방에 참가
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`🔗 User ${socket.id} joined room: ${roomId}`);
    
    // 방 정보 업데이트
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(socket.id);
    
    // 방의 현재 참가자 수 로깅
    console.log(`Room ${roomId} now has ${rooms.get(roomId).size} participants`);
    
    // 방의 모든 참가자 ID 로깅
    console.log(`Room ${roomId} participants:`, Array.from(rooms.get(roomId)));
  });

  // 게임 시작 → 같은 방 유저들에게만 이동 이벤트
  socket.on('startGame', async (data) => {
    console.log('🎲 StartGame event received with data:', JSON.stringify(data));
    try {
      // data가 객체인 경우와 문자열인 경우 모두 처리
      const roomId = typeof data === 'object' ? data.roomId : data;
      
      console.log(`🎮 Game starting in room: ${roomId} by socket: ${socket.id}`);
      
      // 방의 참가자 확인
      const roomParticipants = rooms.get(roomId);
      if (!roomParticipants || roomParticipants.size === 0) {
        console.log(`⚠️ No participants found in room ${roomId}`);
        socket.emit('gameStartConfirmation', {
          status: 'error',
          roomId,
          error: '방에 참가자가 없습니다.'
        });
        return;
      }
      
      console.log(`Room ${roomId} participants:`, Array.from(roomParticipants));
      
      // 직접 소켓 이벤트를 방 전체에 브로드캐스트
      io.to(roomId).emit('moveToTetrisPage', roomId);
      console.log(`📢 Broadcasted moveToTetrisPage event to room: ${roomId}`);

      // 방장에게 확인 메시지 전송
      socket.emit('gameStartConfirmation', {
        status: 'success',
        roomId,
        participantCount: roomParticipants.size
      });
    } catch (error) {
      console.error('Error in startGame:', error);
      socket.emit('gameStartConfirmation', {
        status: 'error',
        roomId: typeof data === 'object' ? data.roomId : data,
        error: error.message
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
    console.log('📡 Disconnect reason:', socket.disconnectReason);
    
    // 연결이 끊긴 소켓을 모든 방에서 제거
    rooms.forEach((participants, roomId) => {
      if (participants.delete(socket.id)) {
        console.log(`Removed ${socket.id} from room ${roomId}`);
        if (participants.size === 0) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} is now empty and removed`);
        }
      }
    });
  });
});

// 서버 에러 핸들링
server.on('error', (error) => {
  console.error('Server error:', error);
});

server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});