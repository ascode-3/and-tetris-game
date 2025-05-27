// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", // React 앱의 주소
        methods: ["GET", "POST"]
    }
});

// 게임방 관리
const gameRooms = new Map();

// 소켓 연결 처리
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // 게임방 참가
    socket.on('joinRoom', ({ roomId, playerName }) => {
        console.log(`Player ${playerName} (${socket.id}) joining room ${roomId}`);
        socket.join(roomId);
        
        if (!gameRooms.has(roomId)) {
            gameRooms.set(roomId, {
                players: new Map(),
                gameStates: new Map(),
                isGameStarted: false
            });
        }

        const room = gameRooms.get(roomId);
        room.players.set(socket.id, {
            id: socket.id,
            name: playerName
        });

        // 방의 다른 플레이어들에게 새 플레이어 입장을 알림
        socket.to(roomId).emit('playerJoined', {
            id: socket.id,
            name: playerName
        });

        // 새로 입장한 플레이어에게 현재 방의 상태 전송
        const currentPlayers = Array.from(room.players.values());
        const currentGameStates = Array.from(room.gameStates.entries()).map(([playerId, gameState]) => ({
            playerId,
            gameState
        }));

        socket.emit('roomState', {
            players: currentPlayers,
            gameStates: currentGameStates
        });
    });

    // 게임 시작
    socket.on('startGame', ({ roomId }) => {
        console.log(`Received startGame event for room: ${roomId}`);
        
        if (!gameRooms.has(roomId)) {
            socket.emit('gameStartConfirmation', {
                status: 'error',
                error: '존재하지 않는 방입니다.',
                roomId
            });
            return;
        }

        const room = gameRooms.get(roomId);
        
        if (room.isGameStarted) {
            socket.emit('gameStartConfirmation', {
                status: 'error',
                error: '이미 게임이 시작되었습니다.',
                roomId
            });
            return;
        }

        if (room.players.size < 1) {
            socket.emit('gameStartConfirmation', {
                status: 'error',
                error: '게임을 시작하기 위한 최소 인원이 부족합니다.',
                roomId
            });
            return;
        }

        // 게임 시작 상태로 변경
        room.isGameStarted = true;

        // 모든 플레이어에게 게임 시작 알림
        io.to(roomId).emit('moveToTetrisPage', roomId);
        io.to(roomId).emit('gameStart');
        
        // 게임 시작 확인 메시지 전송
        socket.emit('gameStartConfirmation', {
            status: 'success',
            roomId,
            participantCount: room.players.size
        });

        console.log(`Game started in room ${roomId} with ${room.players.size} players`);
    });

    // 게임 상태 업데이트
    socket.on('updateGameState', ({ roomId, gameState }) => {
        if (gameRooms.has(roomId)) {
            const room = gameRooms.get(roomId);
            room.gameStates.set(socket.id, gameState);

            // 방의 다른 플레이어들에게 업데이트된 게임 상태 전송
            socket.to(roomId).emit('gameStateUpdate', {
                playerId: socket.id,
                playerName: room.players.get(socket.id)?.name,
                gameState
            });
        }
    });

    // 게임 오버
    socket.on('gameOver', ({ roomId, score }) => {
        if (gameRooms.has(roomId)) {
            const room = gameRooms.get(roomId);
            
            // 플레이어의 게임 상태에 게임 오버 표시 추가
            if (room.gameStates.has(socket.id)) {
                const currentState = room.gameStates.get(socket.id);
                currentState.isGameOver = true;
                room.gameStates.set(socket.id, currentState);
            }
            
            // 방의 다른 플레이어들에게 게임 오버 알림
            socket.to(roomId).emit('playerGameOver', {
                playerId: socket.id,
                score,
                isGameOver: true
            });
            
            // 게임 상태 업데이트도 함께 전송하여 UI가 즉시 업데이트되도록 함
            socket.to(roomId).emit('gameStateUpdate', {
                playerId: socket.id,
                playerName: room.players.get(socket.id)?.name,
                gameState: { ...room.gameStates.get(socket.id), isGameOver: true }
            });
        }
    });

    // 연결 해제
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        
        // 모든 게임방에서 플레이어 제거
        for (const [roomId, room] of gameRooms.entries()) {
            if (room.players.has(socket.id)) {
                room.players.delete(socket.id);
                room.gameStates.delete(socket.id);
                
                // 방의 다른 플레이어들에게 알림
                io.to(roomId).emit('playerDisconnect', socket.id);

                // 방에 플레이어가 없으면 방 삭제
                if (room.players.size === 0) {
                    gameRooms.delete(roomId);
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});