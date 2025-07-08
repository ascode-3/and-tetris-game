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
// 유저 ID와 소켓 ID 매핑 관리
const userSocketMap = new Map(); // userId -> socketId
const socketUserMap = new Map(); // socketId -> userId

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
            
            const creatorUserId = room.creator;
            const creatorData = room.players.get(creatorUserId);
            const creatorName = creatorData?.name || '알 수 없음';
            
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
        
        // 방 생성 (creator를 userId로 설정하기 위해 임시로 socketId 사용)
        gameRooms.set(roomId, {
            players: new Map(),
            gameStates: new Map(),
            isGameStarted: false,
            creator: socket.id, // 임시로 socketId를 사용, joinRoom에서 실제 userId로 업데이트됨
            movedToTetris: new Set() // 테트리스 페이지로 이동한 사용자 추적용 Set 추가
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

    // 게임방 참가 - 유저 ID 기반으로 변경
    socket.on('joinRoom', ({ roomId, playerName, userId }) => {
        console.log(`Player ${playerName} (userId: ${userId}, socketId: ${socket.id}) joining room ${roomId}`);
        
        // 유저 ID와 소켓 ID 매핑 저장
        userSocketMap.set(userId, socket.id);
        socketUserMap.set(socket.id, userId);
        
        socket.join(roomId);
        
        if (!gameRooms.has(roomId)) {
            gameRooms.set(roomId, {
                players: new Map(),
                gameStates: new Map(),
                isGameStarted: false,
                creator: userId, // 유저 ID로 방장 설정
                movedToTetris: new Set() // 테트리스 페이지로 이동한 사용자 추적용 Set 추가
            });
        }

        const room = gameRooms.get(roomId);
        
        // 기존 플레이어가 다시 접속한 경우 소켓 ID만 업데이트
        if (room.players.has(userId)) {
            const existingPlayer = room.players.get(userId);
            existingPlayer.socketId = socket.id;
            room.players.set(userId, existingPlayer);
            console.log(`Player ${userId} reconnected with new socket ${socket.id}`);
        } else {
            // 새 플레이어 추가
            room.players.set(userId, {
                id: userId,
                userId: userId,
                socketId: socket.id,
                name: playerName
            });
            
            // 방의 다른 플레이어들에게 새 플레이어 입장을 알림
            socket.to(roomId).emit('playerJoined', {
                userId: userId,
                socketId: socket.id,
                name: playerName
            });
        }
        
        // 방장이 설정되지 않았거나 소켓 ID로 설정되어 있으면 첫 번째 플레이어를 방장으로 설정
        if (!room.creator || !room.players.has(room.creator)) {
            const firstPlayerUserId = Array.from(room.players.keys())[0];
            room.creator = firstPlayerUserId;
            console.log(`Set room creator to: ${firstPlayerUserId}`);
        }

        // 새로 입장한 플레이어에게 현재 방의 상태 전송
        const currentPlayers = Array.from(room.players.values());
        const currentGameStates = Array.from(room.gameStates.entries()).map(([userId, gameState]) => ({
            playerId: userId,
            gameState
        }));

        socket.emit('roomState', {
            players: currentPlayers,
            gameStates: currentGameStates,
            creator: room.creator
        });
    });

    // 게임 시작 - 유저 ID 기반 방장 체크
    socket.on('startGame', ({ roomId, userId }) => {
        console.log(`Received startGame event for room: ${roomId} from user: ${userId}`);
        
        if (!gameRooms.has(roomId)) {
            socket.emit('gameStartConfirmation', {
                status: 'error',
                error: '존재하지 않는 방입니다.',
                roomId
            });
            return;
        }

        const room = gameRooms.get(roomId);
        
        // 방장 권한 체크 (유저 ID 기반)
        if (room.creator !== userId) {
            socket.emit('gameStartConfirmation', {
                status: 'error',
                error: '방장만 게임을 시작할 수 있습니다.',
                roomId
            });
            return;
        }
        
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

        /* === 랜덤 타겟 지정 및 주기적 변경 기능 추가 === */
        // 타겟을 지정하는 헬퍼 함수
        const assignTargets = () => {
            const playerIds = Array.from(room.players.keys());
            if (playerIds.length <= 1) return; // 플레이어가 1명 이하일 땐 타겟을 지정하지 않음

            // Map<attackerId, targetId>
            room.targetMap = new Map();

            playerIds.forEach(attackerId => {
                let targetId;
                if (playerIds.length === 2) {
                    // 두 명일 때는 상대방이 타겟
                    targetId = playerIds.find(id => id !== attackerId);
                } else {
                    // 세 명 이상일 때는 자신을 제외한 플레이어 중 무작위 선택
                    do {
                        targetId = playerIds[Math.floor(Math.random() * playerIds.length)];
                    } while (targetId === attackerId);
                }

                room.targetMap.set(attackerId, targetId);

                const attackerSocketId = userSocketMap.get(attackerId);
                if (attackerSocketId) {
                    io.to(attackerSocketId).emit('targetAssigned', {
                        targetId,
                        targetName: room.players.get(targetId)?.name
                    });
                }
            });
        };

        // 최초 타겟 지정
        assignTargets();

        // 15초마다 타겟 재지정
        if (room.targetInterval) {
            clearInterval(room.targetInterval);
        }
        room.targetInterval = setInterval(assignTargets, 15000);
        /* === 랜덤 타겟 기능 끝 === */
        
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
                    .filter(userId => !currentRoom.movedToTetris.has(userId));
                
                if (notMovedPlayers.length > 0) {
                    console.log(`Room ${roomId}: ${notMovedPlayers.length} players did not move to tetris page`);
                    
                    // 이동하지 않은 플레이어들에게 다시 이동 이벤트 전송
                    notMovedPlayers.forEach(userId => {
                        const playerSocketId = userSocketMap.get(userId);
                        if (playerSocketId) {
                            io.to(playerSocketId).emit('moveToTetrisPage', roomId);
                        }
                    });
                }
            }
        }, 5000);
    });

    // 테트리스 페이지 이동 확인 이벤트 핸들러
    socket.on('tetrisPageLoaded', ({ roomId }) => {
        const userId = socketUserMap.get(socket.id);
        if (gameRooms.has(roomId) && userId) {
            const room = gameRooms.get(roomId);
            
            // 테트리스 페이지로 이동한 플레이어 기록 (유저 ID 기반)
            if (!room.movedToTetris) {
                room.movedToTetris = new Set();
            }
            room.movedToTetris.add(userId);
            
            console.log(`Player ${userId} moved to tetris page in room ${roomId}`);
            // 페이지가 로드된 직후 현재 타겟 정보를 해당 플레이어에게 전송
            if (room.targetMap && room.targetMap.has(userId)) {
                const targetId = room.targetMap.get(userId);
                io.to(socket.id).emit('targetAssigned', {
                    targetId,
                    targetName: room.players.get(targetId)?.name
                });
            }
        }
    });

    // 게임 상태 업데이트
    socket.on('updateGameState', ({ roomId, gameState }) => {
        const userId = socketUserMap.get(socket.id);
        if (gameRooms.has(roomId) && userId) {
            const room = gameRooms.get(roomId);
            room.gameStates.set(userId, gameState);

            // 방의 다른 플레이어들에게 업데이트된 게임 상태 전송
            socket.to(roomId).emit('gameStateUpdate', {
                playerId: userId,
                playerName: room.players.get(userId)?.name,
                gameState
            });
        }
    });

    // 게임 오버
    socket.on('gameOver', ({ roomId, score }) => {
        const userId = socketUserMap.get(socket.id);
        if (gameRooms.has(roomId) && userId) {
            const room = gameRooms.get(roomId);
            
            // 이미 게임이 종료된 경우 처리하지 않음
            if (room.isGameFinished) {
                return;
            }
            
            // 플레이어의 게임 상태에 게임 오버 표시 추가
            if (room.gameStates.has(userId)) {
                const currentState = room.gameStates.get(userId);
                currentState.isGameOver = true;
                room.gameStates.set(userId, currentState);
            }
            
            // 방의 다른 플레이어들에게 게임 오버 알림
            socket.to(roomId).emit('playerGameOver', {
                playerId: userId,
                score,
                isGameOver: true
            });
            
            // 게임 상태 업데이트도 함께 전송하여 UI가 즉시 업데이트되도록 함
            socket.to(roomId).emit('gameStateUpdate', {
                playerId: userId,
                playerName: room.players.get(userId)?.name,
                gameState: { ...room.gameStates.get(userId), isGameOver: true }
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
                
                // 타겟 변경 인터벌 정리
                if (room.targetInterval) {
                    clearInterval(room.targetInterval);
                    room.targetInterval = null;
                }

                // 게임 상태 초기화
                room.isGameStarted = false;
                room.isGameFinished = true;
                room.playersRestarted = new Set(); // 계속하기 누른 플레이어 목록 초기화 (유저 ID 기반)
                
                // 테트리스 페이지 이동 추적 초기화
                if (room.movedToTetris) {
                    room.movedToTetris.clear();
                }
                
                console.log(`Game ended in room ${roomId}, waiting for players to continue...`);
            }
        }
    });
    
    // 게임 재시작 - 유저 ID 기반으로 수정
    socket.on('restartGame', ({ roomId }) => {
        const userId = socketUserMap.get(socket.id);
        if (gameRooms.has(roomId) && userId) {
            const room = gameRooms.get(roomId);
            
            // 계속하기를 누른 플레이어 추적을 위한 Set 초기화 또는 생성
            if (!room.playersRestarted) {
                room.playersRestarted = new Set();
            }
            
            // 현재 플레이어를 계속하기 누른 플레이어 목록에 추가 (유저 ID 기반)
            room.playersRestarted.add(userId);
            
            console.log(`Player ${userId} restarted in room ${roomId}. ${room.playersRestarted.size}/${room.players.size} players restarted.`);
            
            // 다른 플레이어들에게 누가 계속하기를 눌렀는지 알림
            io.to(roomId).emit('playerRestarted', {
                playerId: userId,
                playerName: room.players.get(userId)?.name,
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

    // 방 떠나기 처리 - 유저 ID 기반으로 수정
    socket.on('leaveRoom', ({ roomId, userId }) => {
        console.log(`Received leaveRoom event for room: ${roomId} from user: ${userId}`);
        
        if (!gameRooms.has(roomId)) return;
        
        const room = gameRooms.get(roomId);
        if (room.players.has(userId)) {
            const playerName = room.players.get(userId)?.name || '알 수 없음';
            console.log(`Player ${playerName} (userId: ${userId}, socketId: ${socket.id}) leaving room ${roomId}`);
            
            // 방장이 나갈 경우 새 방장 지정
            const wasCreator = room.creator === userId;
            room.players.delete(userId);
            room.gameStates.delete(userId);
            
            // 방의 다른 플레이어들에게 알림 (유저 ID로 알림)
            io.to(roomId).emit('playerDisconnect', userId);
            
            // 방에 플레이어가 없으면 방 삭제
            if (room.players.size === 0) {
                gameRooms.delete(roomId);
                io.emit('roomListUpdated'); // 방 목록 갱신 알림
            } else if (wasCreator) {
                // 새 방장 지정 (첫 번째 플레이어의 유저 ID)
                const newCreatorUserId = Array.from(room.players.keys())[0];
                room.creator = newCreatorUserId;
                
                // 새 방장 알림
                io.to(roomId).emit('creatorChanged', { newCreatorId: newCreatorUserId });
            }
            
            // 소켓에서 해당 방 떠나기
            socket.leave(roomId);
        }
        
        // 유저 ID와 소켓 ID 매핑 정리
        userSocketMap.delete(userId);
        socketUserMap.delete(socket.id);
    });
    
    // 연결 해제 - 유저 ID 기반으로 수정
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        
        const userId = socketUserMap.get(socket.id);
        
        // 모든 게임방에서 플레이어 제거
        for (const [roomId, room] of gameRooms.entries()) {
            if (userId && room.players.has(userId)) {
                const wasCreator = room.creator === userId;
                const playerName = room.players.get(userId)?.name || '알 수 없음';
                
                console.log(`Player ${playerName} (userId: ${userId}) disconnected from room ${roomId}`);
                
                room.players.delete(userId);
                room.gameStates.delete(userId);
                
                // 방의 다른 플레이어들에게 알림 (유저 ID로 알림)
                io.to(roomId).emit('playerDisconnect', userId);

                // 방에 플레이어가 없으면 방 삭제
                if (room.players.size === 0) {
                    gameRooms.delete(roomId);
                    io.emit('roomListUpdated'); // 방 목록 갱신 알림
                } else if (wasCreator) {
                    // 새 방장 지정 (첫 번째 플레이어의 유저 ID)
                    const newCreatorUserId = Array.from(room.players.keys())[0];
                    room.creator = newCreatorUserId;
                    
                    // 새 방장 알림
                    io.to(roomId).emit('creatorChanged', { newCreatorId: newCreatorUserId });
                }
            }
        }
        
        // 유저 ID와 소켓 ID 매핑 정리
        if (userId) {
            userSocketMap.delete(userId);
        }
        socketUserMap.delete(socket.id);
    });
});

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // 모든 네트워크 인터페이스에서 수신 대기
server.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
});