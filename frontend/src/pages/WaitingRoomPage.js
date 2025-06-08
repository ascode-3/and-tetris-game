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
  const [socketId, setSocketId] = useState(socket.id || null);
  const [participants, setParticipants] = useState([]);
  const [isCreator, setIsCreator] = useState(false);
  const [participantDetails, setParticipantDetails] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  // 방 참가 처리 - 유저 ID 추가
  const joinRoom = useCallback((roomId, nickname, userId) => {
    console.log(`Joining room ${roomId} with nickname ${nickname}, userId: ${userId}`);
    socket.emit('joinRoom', { roomId, playerName: nickname, userId });
  }, []);

  const leaveRoom = useCallback((roomId, userId) => {
    console.log(`Leaving room ${roomId}, userId: ${userId}`);
    socket.emit('leaveRoom', { roomId, userId });
  }, []);

  // 소켓 연결 이벤트 핸들러 - socketId 업데이트
  const handleConnect = useCallback(() => {
    console.log('Socket connected with ID:', socket.id);
    setSocketId(socket.id);
  }, []);

  // 소켓 연결 해제 이벤트 핸들러
  const handleDisconnect = useCallback(() => {
    console.log('Socket disconnected');
    setSocketId(null);
  }, []);

  // 새 플레이어가 방에 참가했을 때의 이벤트 핸들러
  const handlePlayerJoined = useCallback((playerData) => {
    console.log('New player joined:', playerData);
    
    // 중복 체크 로직 추가 (유저 ID 기반)
    setParticipants(prev => {
      if (prev.includes(playerData.userId)) {
        console.log('Player already exists in participants:', playerData.userId);
        return prev;
      }
      return [...prev, playerData.userId];
    });
    
    setParticipantDetails(prev => {
      const existingPlayer = prev.find(p => p.userId === playerData.userId);
      if (existingPlayer) {
        console.log('Player already exists in participant details:', playerData.userId);
        return prev;
      }
      return [
        ...prev,
        {
          id: playerData.userId,
          userId: playerData.userId,
          socketId: playerData.socketId,
          nickname: playerData.name || `알 수 없음_${playerData.userId.slice(-4)}`,
          isCreator: false
        }
      ];
    });
  }, []);

  // 플레이어가 방을 나갔을 때의 이벤트 핸들러
  const handlePlayerDisconnect = useCallback((playerUserId) => {
    console.log('Player left:', playerUserId);
    setParticipants(prev => prev.filter(userId => userId !== playerUserId));
    setParticipantDetails(prev => prev.filter(p => p.userId !== playerUserId));
  }, []);

  // 방 상태 정보 수신 이벤트 핸들러 - 유저 ID 기반으로 변경
  const handleRoomState = useCallback((data) => {
    console.log('handleRoomState - Received data:', data);
    console.log('handleRoomState - Current userId:', userId);
    console.log('handleRoomState - Room creator:', data.creator);
    console.log('handleRoomState - Is current user creator?', data.creator === userId);
    
    if (data.players) {
      // 참가자 정보 업데이트 (중복 제거 로직 포함)
      const uniquePlayerUserIds = [...new Set(data.players.map(player => player.userId))];
      const uniquePlayerDetails = data.players.reduce((acc, player) => {
        const existingPlayer = acc.find(p => p.userId === player.userId);
        if (!existingPlayer) {
          acc.push({
            id: player.userId,
            userId: player.userId,
            socketId: player.socketId,
            nickname: player.name || `알 수 없음_${player.userId.slice(-4)}`,
            isCreator: player.userId === data.creator
          });
        }
        return acc;
      }, []);
      
      setParticipants(uniquePlayerUserIds);
      setParticipantDetails(uniquePlayerDetails);
      
      // 방장 여부 업데이트 (유저 ID 기반)
      const isUserCreator = data.creator === userId;
      console.log('handleRoomState - Setting isCreator to:', isUserCreator);
      setIsCreator(isUserCreator);
    }
  }, [userId]);

  // 방장 변경 이벤트 핸들러 - 유저 ID 기반으로 변경
  const handleCreatorChanged = useCallback((data) => {
    console.log('handleCreatorChanged - New creator ID:', data.newCreatorId);
    console.log('handleCreatorChanged - Current userId:', userId);
    const isNowCreator = data.newCreatorId === userId;
    console.log('handleCreatorChanged - Is current user now creator?', isNowCreator);
    setIsCreator(isNowCreator);
    
    // 참가자 세부정보에서 방장 상태 업데이트
    setParticipantDetails(prev => 
      prev.map(participant => ({
        ...participant,
        isCreator: participant.userId === data.newCreatorId
      }))
    );
  }, [userId]);

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

  useEffect(() => {
    console.log('WaitingRoomPage mounted for room:', roomId);
    
    // 소켓 ID 초기 설정
    if (socket.id) {
      setSocketId(socket.id);
      console.log('Initial socket ID set:', socket.id);
    }
    
    // 방 참가 - 유저 ID 포함
    console.log('Emitting joinRoom event for room:', roomId);
    joinRoom(roomId, userNickname, userId);
    
    // 주기적으로 방 상태를 확인하기 위한 인터벌 설정
    const interval = setInterval(() => {
      // 소켓 ID가 변경되었는지 확인하고 업데이트
      if (socket.id && socket.id !== socketId) {
        console.log('Socket ID changed, updating:', socket.id);
        setSocketId(socket.id);
      }
    }, 1000); // 1초마다 확인

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

    const handleUnload = () => leaveRoom(roomId, userId);
    const handlePopState = () => leaveRoom(roomId, userId);

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      console.log('WaitingRoomPage unmounting, cleaning up...');
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('popstate', handlePopState);
      leaveRoom(roomId, userId);
      
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
  }, [roomId, userNickname, userId, socketId, joinRoom, leaveRoom, 
      handleConnect, handleDisconnect, handleRoomState, handleCreatorChanged, 
      handlePlayerJoined, handlePlayerDisconnect, handleMoveToTetris, handleGameStartConfirmation]);

  const handleLeaveRoom = () => {
    soundManager.play('button');
    leaveRoom(roomId, userId);
    navigate('/rooms');
  };

  const handleStartGame = () => {
    soundManager.play('button');
    
    if (isCreator) {
      console.log('Creator starting game for room:', roomId);
      console.log('Socket connected status:', socket.connected);
      console.log('Current socket ID:', socket.id);
      console.log('Current user ID:', userId);
      
      if (!socket.connected) {
        console.error('Socket is not connected');
        setErrorMessage('서버와의 연결이 끊어졌습니다. 페이지를 새로고침해주세요.');
        setTimeout(() => setErrorMessage(''), 2000);
        return;
      }

      if (participants.length < 2) {
        setErrorMessage('시작은 최소 2명부터 가능합니다.');
        setTimeout(() => setErrorMessage(''), 2000);
        return;
      }

      try {
        setErrorMessage('');
        socket.emit('startGame', { roomId, userId });
        console.log('Emitted startGame event with data:', { roomId, userId });
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
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, maxWidth: '250px' }}>
          <h3>참가자 목록 ({participants.length}명)</h3>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {participantDetails.map(participant => (
              <li
                key={`${participant.userId || 'unknown'}-${participant.id || 'no-id'}`}
                style={{
                  margin: '8px 0',
                  padding: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  borderRadius: '4px',
                  border: participant.userId === userId ? '2px solid #007bff' : '1px solid rgba(0, 0, 0, 0.1)',
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
                    {participant.nickname} {participant.isCreator ? '(방장)' : ''} {participant.userId === userId ? ' (나)' : ''}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {isCreator && (
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
          <div>User ID: {userId}</div>
          <div>Connected: {socket.connected ? 'Yes' : 'No'}</div>
          <div>Is Creator: {isCreator ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  );
};

export default WaitingRoomPage;