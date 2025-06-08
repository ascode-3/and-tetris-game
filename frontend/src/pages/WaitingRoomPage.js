// WaitingRoomPage.js
import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from './socket'; // 소켓 import
import soundManager from '../utils/SoundManager'; // 효과음 매니저 import

const WaitingRoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const userId = useMemo(() => {
    let id = sessionStorage.getItem('sessionUserId');
    if (!id) {
      id = 'user_' + Math.floor(Math.random() * 1e8);
      sessionStorage.setItem('sessionUserId', id);
    }
    return id;
  }, []);

  const userNickname = useMemo(() => {
    return sessionStorage.getItem('userNickname') || `게스트_${userId.slice(-4)}`;
  }, [userId]);

  // 소켓 ID를 저장할 상태
  const [socketId, setSocketId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isCreator, setIsCreator] = useState(false);
  const [participantDetails, setParticipantDetails] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSocketReady, setIsSocketReady] = useState(false);

  // 소켓 연결 상태 확인 및 대기 함수
  const waitForSocketConnection = useCallback(() => {
    return new Promise((resolve) => {
      if (socket.connected && socket.id) {
        resolve(socket.id);
        return;
      }

      const checkConnection = () => {
        if (socket.connected && socket.id) {
          resolve(socket.id);
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      
      checkConnection();
    });
  }, []);

  // 방 참가 처리
  const joinRoom = useCallback(async (roomId, nickname) => {
    console.log(`Attempting to join room ${roomId} with nickname ${nickname}`);
    
    try {
      // 소켓 연결이 완료될 때까지 대기
      const currentSocketId = await waitForSocketConnection();
      console.log(`Socket ready with ID: ${currentSocketId}, joining room ${roomId}`);
      
      socket.emit('joinRoom', { roomId, playerName: nickname });
    } catch (error) {
      console.error('Error joining room:', error);
      setErrorMessage('서버 연결 중 오류가 발생했습니다.');
    }
  }, [waitForSocketConnection]);

  const leaveRoom = useCallback((roomId) => {
    console.log(`Leaving room ${roomId}`);
    if (socket.connected) {
      socket.emit('leaveRoom', { roomId });
    }
  }, []);

  // 소켓 연결 이벤트 핸들러
  const handleConnect = useCallback(() => {
    console.log('Socket connected with ID:', socket.id);
    setSocketId(socket.id);
    setIsSocketReady(true);
  }, []);

  // 소켓 연결 해제 이벤트 핸들러
  const handleDisconnect = useCallback(() => {
    console.log('Socket disconnected');
    setSocketId(null);
    setIsSocketReady(false);
  }, []);

  // 새 플레이어가 방에 참가했을 때의 이벤트 핸들러
  const handlePlayerJoined = useCallback((playerData) => {
    console.log('New player joined:', playerData);
    
    // 중복 체크 로직 추가 (소켓 ID 기반)
    setParticipants(prev => {
      if (prev.includes(playerData.id)) {
        console.log('Player already exists in participants:', playerData.id);
        return prev;
      }
      return [...prev, playerData.id];
    });
    
    setParticipantDetails(prev => {
      const existingPlayer = prev.find(p => p.socketId === playerData.id);
      if (existingPlayer) {
        console.log('Player already exists in participant details:', playerData.id);
        return prev;
      }
      return [
        ...prev,
        {
          id: playerData.id,
          socketId: playerData.id,
          nickname: playerData.name || `알 수 없음_${playerData.id.slice(-4)}`,
          isCreator: false
        }
      ];
    });
  }, []);

  // 플레이어가 방을 나갔을 때의 이벤트 핸들러
  const handlePlayerDisconnect = useCallback((playerSocketId) => {
    console.log('Player left:', playerSocketId);
    setParticipants(prev => prev.filter(socketId => socketId !== playerSocketId));
    setParticipantDetails(prev => prev.filter(p => p.socketId !== playerSocketId));
  }, []);

  // 방 상태 정보 수신 이벤트 핸들러
  const handleRoomState = useCallback((data) => {
    const currentSocketId = socket.id;
    
    console.log('handleRoomState - Received data:', data);
    console.log('handleRoomState - Current socketId:', currentSocketId);
    console.log('handleRoomState - Room creator:', data.creator);
    
    if (!currentSocketId) {
      console.warn('handleRoomState called but socket.id is null/undefined');
      return;
    }
    
    console.log('handleRoomState - Is current socket creator?', data.creator === currentSocketId);
    
    if (data.players) {
      // 참가자 정보 업데이트 (중복 제거 로직 포함)
      const uniquePlayerSocketIds = [...new Set(data.players.map(player => player.id))];
      const uniquePlayerDetails = data.players.reduce((acc, player) => {
        const existingPlayer = acc.find(p => p.socketId === player.id);
        if (!existingPlayer) {
          acc.push({
            id: player.id,
            socketId: player.id,
            nickname: player.name || `알 수 없음_${player.id.slice(-4)}`,
            isCreator: player.id === data.creator
          });
        }
        return acc;
      }, []);
      
      setParticipants(uniquePlayerSocketIds);
      setParticipantDetails(uniquePlayerDetails);
      
      // 방장 여부 업데이트
      const isUserCreator = data.creator === currentSocketId;
      console.log('handleRoomState - Setting isCreator to:', isUserCreator);
      setIsCreator(isUserCreator);
    }
  }, []);

  // 방장 변경 이벤트 핸들러
  const handleCreatorChanged = useCallback((data) => {
    const currentSocketId = socket.id;
    
    console.log('handleCreatorChanged - New creator ID:', data.newCreatorId);
    console.log('handleCreatorChanged - Current socketId:', currentSocketId);
    
    if (!currentSocketId) {
      console.warn('handleCreatorChanged called but socket.id is null/undefined');
      return;
    }
    
    const isNowCreator = data.newCreatorId === currentSocketId;
    console.log('handleCreatorChanged - Is current socket now creator?', isNowCreator);
    setIsCreator(isNowCreator);
    
    // 참가자 세부정보에서 방장 상태 업데이트
    setParticipantDetails(prev => 
      prev.map(participant => ({
        ...participant,
        isCreator: participant.socketId === data.newCreatorId
      }))
    );
  }, []);

  // 게임 시작 이벤트 리스너
  const handleMoveToTetris = useCallback((receivedRoomId) => {
    console.log('Received moveToTetrisPage event:', receivedRoomId);
    console.log('Current room:', roomId);
    
    if (receivedRoomId === roomId) {
      console.log('Moving to tetris page for room:', roomId);
      setTimeout(() => {
        navigate(`/tetris/${roomId}`);
      }, 100);
    } else {
      console.log('Received event for different room. Expected:', roomId, 'Received:', receivedRoomId);
    }
  }, [roomId, navigate]);

  // 게임 시작 확인 이벤트 리스너
  const handleGameStartConfirmation = useCallback((data) => {
    console.log('Received game start confirmation:', data);
    if (data.status === 'success') {
      console.log(`Game start confirmed for room: ${data.roomId} with ${data.participantCount} participants`);
      navigate(`/tetris/${data.roomId}`);
    } else if (data.status === 'error') {
      console.error('Game start failed:', data.error);
      alert('게임 시작에 실패했습니다. 다시 시도해주세요.');
    }
  }, [navigate]);

  // 초기 소켓 설정 및 방 참가 처리
  useEffect(() => {
    console.log('WaitingRoomPage mounted for room:', roomId);
    
    // 소켓 연결 상태 확인
    const initializeSocket = async () => {
      try {
        // 소켓이 이미 연결되어 있다면 ID 설정
        if (socket.connected && socket.id) {
          console.log('Socket already connected with ID:', socket.id);
          setSocketId(socket.id);
          setIsSocketReady(true);
        } else {
          console.log('Socket not connected, waiting for connection...');
          // 소켓 연결을 기다림
          await waitForSocketConnection();
        }
        
        // 방 참가
        console.log('Joining room after socket connection confirmed');
        await joinRoom(roomId, userNickname);
        
      } catch (error) {
        console.error('Error initializing socket:', error);
        setErrorMessage('서버 연결에 실패했습니다. 페이지를 새로고침해주세요.');
      }
    };

    initializeSocket();
  }, [roomId, userNickname, joinRoom, waitForSocketConnection]);

  // 소켓 이벤트 리스너 등록
  useEffect(() => {
    console.log('Registering socket event listeners');
    
    // 이벤트 리스너 등록
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('roomState', handleRoomState);
    socket.on('creatorChanged', handleCreatorChanged);
    socket.on('playerJoined', handlePlayerJoined);
    socket.on('playerDisconnect', handlePlayerDisconnect);
    socket.on('moveToTetrisPage', handleMoveToTetris);
    socket.on('gameStartConfirmation', handleGameStartConfirmation);
    
    console.log('🎯 All event listeners registered');

    return () => {
      console.log('Removing socket event listeners');
      
      // 모든 이벤트 리스너 제거
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('roomState', handleRoomState);
      socket.off('creatorChanged', handleCreatorChanged);
      socket.off('playerJoined', handlePlayerJoined);
      socket.off('playerDisconnect', handlePlayerDisconnect);
      socket.off('moveToTetrisPage', handleMoveToTetris);
      socket.off('gameStartConfirmation', handleGameStartConfirmation);
      
      console.log('🏁 All event listeners removed');
    };
  }, [handleConnect, handleDisconnect, handleRoomState, handleCreatorChanged, 
      handlePlayerJoined, handlePlayerDisconnect, handleMoveToTetris, handleGameStartConfirmation]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    const handleUnload = () => leaveRoom(roomId);
    const handlePopState = () => leaveRoom(roomId);

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      console.log('WaitingRoomPage unmounting, cleaning up...');
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('popstate', handlePopState);
      leaveRoom(roomId);
    };
  }, [roomId, leaveRoom]);

  const handleLeaveRoom = () => {
    soundManager.play('button');
    leaveRoom(roomId);
    navigate('/rooms');
  };

  const handleStartGame = () => {
    soundManager.play('button');
    
    if (!isSocketReady || !socket.connected) {
      setErrorMessage('서버와의 연결이 불안정합니다. 잠시 후 다시 시도해주세요.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    
    if (isCreator) {
      console.log('Creator starting game for room:', roomId);
      console.log('Socket connected status:', socket.connected);
      console.log('Current socket ID:', socket.id);

      if (participants.length < 2) {
        setErrorMessage('시작은 최소 2명부터 가능합니다.');
        setTimeout(() => setErrorMessage(''), 2000);
        return;
      }

      try {
        setErrorMessage('');
        socket.emit('startGame', { roomId });
        console.log('Emitted startGame event with data:', { roomId });
      } catch (error) {
        console.error('Error emitting startGame event:', error);
        alert('게임 시작 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } else {
      console.log('Non-creator attempted to start game');
      alert('방장만 게임을 시작할 수 있습니다.');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>대기실</h1>
      <h2>방 ID: {roomId}</h2>
      
      {/* 연결 상태 표시 */}
      {!isSocketReady && (
        <div style={{ 
          backgroundColor: '#fff3cd', 
          color: '#856404', 
          padding: '10px', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          서버에 연결 중입니다...
        </div>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, maxWidth: '250px' }}>
          <h3>참가자 목록 ({participants.length}명)</h3>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {participantDetails.map(participant => (
              <li
                key={`${participant.socketId || 'unknown'}-${participant.id || 'no-id'}`}
                style={{
                  margin: '8px 0',
                  padding: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  borderRadius: '4px',
                  border: participant.socketId === socketId ? '2px solid #007bff' : '1px solid rgba(0, 0, 0, 0.1)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <span style={{ 
                    position: 'relative', 
                    zIndex: 1,
                    color: '#333',
                    textShadow: '0 1px 1px rgba(0, 0, 0, 0.1)'
                  }}>
                    {participant.nickname} {participant.isCreator ? '(방장)' : ''} {participant.socketId === socketId ? ' (나)' : ''}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {isCreator && isSocketReady && (
            <div>
              <button
                onClick={handleStartGame}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  marginTop: '20px'
                }}
              >
                게임 시작
              </button>
              {errorMessage && (
                <p style={{ color: 'red', marginTop: '15px' }}>
                  {errorMessage}
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleLeaveRoom}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            방 나가기
          </button>
        </div>
      </div>
      
      {/* 디버깅 정보 (개발 중에만 표시) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          position: 'fixed', 
          bottom: '10px', 
          right: '10px', 
          backgroundColor: 'rgba(0,0,0,0.8)', 
          color: 'white', 
          padding: '10px', 
          borderRadius: '5px',
          fontSize: '12px'
        }}>
          <div>Socket ID: {socketId || 'null'}</div>
          <div>Connected: {socket.connected ? 'Yes' : 'No'}</div>
          <div>Socket Ready: {isSocketReady ? 'Yes' : 'No'}</div>
          <div>Is Creator: {isCreator ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  );
};

export default WaitingRoomPage;