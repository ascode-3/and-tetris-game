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
        origin: "*", // 모든 출처 허용 (배포 시에는 보안상 특정 도메인만 허용하는 것이 좋습니다)
        methods: ["GET", "POST"]
    }
});

// 게임방 관리
const gameRooms = new Map();

// 소켓 연결 처리
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // 방 목록 요청 처리
    socket.on('getRoomList', () => {
        console.log('Room list requested by', socket.id);
        const roomList = [];
        
        // 게임방 정보를 가공하여 전송
        for (const [roomId, room] of gameRooms.entries()) {
            // 시작된 게임은 목록에서 제외
            if (room.isGameStarted) continue;
            
            const creatorId = Array.from(room.players.keys())[0] || '';
            const creatorName = room.players.get(creatorId)?.name || '알 수 없음';
            
            roomList.push({
                id: roomId,
                participantCount: room.players.size,
                creatorNickname: creatorName
            });
        }
        
        socket.emit('roomListResponse', roomList);
    });
    
    // 방 생성 처리
    socket.on('createRoom', ({ playerName }) => {
        // 방 ID 생성
        const roomId = Math.random().toString(36).substr(2, 5).toUpperCase();
        
        // 방 생성
        gameRooms.set(roomId, {
            players: new Map(),
            gameStates: new Map(),
            isGameStarted: false,
            creator: socket.id
        });
        
        console.log(`Room ${roomId} created by ${playerName} (${socket.id})`);
        
        // 방 생성자에게 방 ID 응답
        socket.emit('roomCreated', { roomId, success: true });
        
        // 다른 모든 사용자에게 새 방이 생성됨을 알림
        socket.broadcast.emit('roomListUpdated');
    });
    
    // 방 존재 확인 요청 처리
    socket.on('checkRoomExists', ({ roomId }) => {
        const exists = gameRooms.has(roomId);
        socket.emit('roomExistsResponse', { roomId, exists });
    });

    // 게임방 참가
    socket.on('joinRoom', ({ roomId, playerName }) => {
        console.log(`Player ${playerName} (${socket.id}) joining room ${roomId}`);
        socket.join(roomId);
        
        if (!gameRooms.has(roomId)) {
            gameRooms.set(roomId, {
                players: new Map(),
                gameStates: new Map(),
                isGameStarted: false,
                creator: socket.id
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
            gameStates: currentGameStates,
            creator: room.creator
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
        
        // 테트리스 페이지로 이동한 플레이어 추적을 위한 Set 추가
        room.movedToTetris = new Set();

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
        
        // 5초 후에 모든 플레이어가 테트리스 페이지로 이동했는지 확인
        setTimeout(() => {
            if (gameRooms.has(roomId)) {
                const currentRoom = gameRooms.get(roomId);
                
                // 테트리스 페이지로 이동하지 않은 플레이어 확인
                const notMovedPlayers = Array.from(currentRoom.players.keys())
                    .filter(playerId => !currentRoom.movedToTetris.has(playerId));
                
                if (notMovedPlayers.length > 0) {
                    console.log(`Room ${roomId}: ${notMovedPlayers.length} players did not move to tetris page`);
                    
                    // 이동하지 않은 플레이어들에게 다시 이동 이벤트 전송
                    notMovedPlayers.forEach(playerId => {
                        io.to(playerId).emit('moveToTetrisPage', roomId);
                    });
                }
            }
        }, 5000);
    });

    // 테트리스 페이지 이동 확인 이벤트 핸들러 추가
    socket.on('tetrisPageLoaded', ({ roomId }) => {
        if (gameRooms.has(roomId)) {
            const room = gameRooms.get(roomId);
            
            // 테트리스 페이지로 이동한 플레이어 기록
            if (!room.movedToTetris) {
                room.movedToTetris = new Set();
            }
            room.movedToTetris.add(socket.id);
            
            console.log(`Player ${socket.id} moved to tetris page in room ${roomId}`);
        }
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
            
            // 이미 게임이 종료된 경우 처리하지 않음
            if (room.isGameFinished) {
                return;
            }
            
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
            
            // 게임 오버되지 않은 플레이어 수 확인
            let activePlayers = 0;
            let lastActivePlayer = null;
            
            for (const [playerId, gameState] of room.gameStates.entries()) {
                if (!gameState.isGameOver) {
                    activePlayers++;
                    lastActivePlayer = {
                        id: playerId,
                        name: room.players.get(playerId)?.name
                    };
                }
            }
            
            console.log(`Room ${roomId}: ${activePlayers} active players remaining`);
            
            // 게임 오버되지 않은 플레이어가 1명만 남았으면 게임 종료
            if (activePlayers === 1 && room.players.size > 1) {
                room.isGameFinished = true;
                
                console.log(`Game finished in room ${roomId}. Winner: ${lastActivePlayer.name}`);
                
                // 승자 알림
                io.to(roomId).emit('gameWin', {
                    winner: lastActivePlayer,
                    players: Array.from(room.players.values())
                });
                
                // 게임 상태 초기화
                room.isGameStarted = false;
                room.isGameFinished = true;
                room.playersRestarted = new Set(); // 계속하기 누른 플레이어 목록 초기화
                
                // 테트리스 페이지 이동 추적 초기화
                if (room.movedToTetris) {
                    room.movedToTetris.clear();
                }
                
                console.log(`Game ended in room ${roomId}, waiting for players to continue...`);
            }
        }
    });
    
    // 게임 재시작
    socket.on('restartGame', ({ roomId }) => {
        if (gameRooms.has(roomId)) {
            const room = gameRooms.get(roomId);
            
            // 계속하기를 누른 플레이어 추적을 위한 Set 초기화 또는 생성
            if (!room.playersRestarted) {
                room.playersRestarted = new Set();
            }
            
            // 현재 플레이어를 계속하기 누른 플레이어 목록에 추가
            room.playersRestarted.add(socket.id);
            
            console.log(`Player ${socket.id} restarted in room ${roomId}. ${room.playersRestarted.size}/${room.players.size} players restarted.`);
            
            // 다른 플레이어들에게 누가 계속하기를 눌렀는지 알림
            io.to(roomId).emit('playerRestarted', {
                playerId: socket.id,
                playerName: room.players.get(socket.id)?.name,
                restartedCount: room.playersRestarted.size,
                totalPlayers: room.players.size
            });
            
            // 모든 플레이어가 계속하기를 눌렀는지 확인
            if (room.playersRestarted.size === room.players.size) {
                // 게임 상태 초기화
                room.isGameFinished = false;
                room.isGameStarted = false; // 게임 시작 상태도 초기화
                room.playersRestarted.clear(); // 계속하기 누른 플레이어 목록 초기화
                
                // 테트리스 페이지 이동 추적 초기화
                if (room.movedToTetris) {
                    room.movedToTetris.clear();
                }
                
                // 모든 플레이어의 게임 상태 초기화
                for (const [playerId, gameState] of room.gameStates.entries()) {
                    if (gameState) {
                        gameState.isGameOver = false;
                        room.gameStates.set(playerId, gameState);
                    }
                }
                
                // 모든 플레이어에게 게임 재시작 알림
                io.to(roomId).emit('gameRestart');
                
                console.log(`Game fully restarted in room ${roomId} with all players`);
            }
        }
    });

    // 방 떠나기 처리
    socket.on('leaveRoom', ({ roomId }) => {
        if (!gameRooms.has(roomId)) return;
        
        const room = gameRooms.get(roomId);
        if (room.players.has(socket.id)) {
            const playerName = room.players.get(socket.id)?.name || '알 수 없음';
            console.log(`Player ${playerName} (${socket.id}) leaving room ${roomId}`);
            
            // 방장이 나갈 경우 새 방장 지정
            const wasCreator = room.creator === socket.id;
            room.players.delete(socket.id);
            room.gameStates.delete(socket.id);
            
            // 방의 다른 플레이어들에게 알림
            io.to(roomId).emit('playerDisconnect', socket.id);
            
            // 방에 플레이어가 없으면 방 삭제
            if (room.players.size === 0) {
                gameRooms.delete(roomId);
                io.emit('roomListUpdated'); // 방 목록 갱신 알림
            } else if (wasCreator) {
                // 새 방장 지정 (첫 번째 플레이어)
                const newCreator = Array.from(room.players.keys())[0];
                room.creator = newCreator;
                
                // 새 방장 알림
                io.to(roomId).emit('creatorChanged', { newCreatorId: newCreator });
            }
            
            // 소켓에서 해당 방 떠나기
            socket.leave(roomId);
        }
    });
    
    // 연결 해제
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        
        // 모든 게임방에서 플레이어 제거
        for (const [roomId, room] of gameRooms.entries()) {
            if (room.players.has(socket.id)) {
                const wasCreator = room.creator === socket.id;
                room.players.delete(socket.id);
                room.gameStates.delete(socket.id);
                
                // 방의 다른 플레이어들에게 알림
                io.to(roomId).emit('playerDisconnect', socket.id);

                // 방에 플레이어가 없으면 방 삭제
                if (room.players.size === 0) {
                    gameRooms.delete(roomId);
                    io.emit('roomListUpdated'); // 방 목록 갱신 알림
                } else if (wasCreator) {
                    // 새 방장 지정 (첫 번째 플레이어)
                    const newCreator = Array.from(room.players.keys())[0];
                    room.creator = newCreator;
                    
                    // 새 방장 알림
                    io.to(roomId).emit('creatorChanged', { newCreatorId: newCreator });
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // 모든 네트워크 인터페이스에서 수신 대기
server.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
});