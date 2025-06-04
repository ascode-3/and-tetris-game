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

  const [participants, setParticipants] = useState([]);
  const [isCreator, setIsCreator] = useState(false);
  const [participantDetails, setParticipantDetails] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  // 방 참가 처리 - 서버에 요청을 보내고 서버에서 방 상태를 받아옴
  const joinRoom = useCallback((roomId, userId, nickname) => {
    console.log(`Joining room ${roomId} with nickname ${nickname} and user ID ${userId}`);
    socket.emit('joinRoom', { roomId, playerName: nickname });
  }, []);

  const leaveRoom = useCallback((roomId, userId) => {
    console.log(`Leaving room ${roomId} with user ID ${userId}`);
    socket.emit('leaveRoom', { roomId });
  }, []);

  // 참가자 정보 업데이트는 이제 서버에서 roomState 이벤트로 받아오기 때문에 이 함수는 사용하지 않습니다.

  useEffect(() => {
    console.log('WaitingRoomPage mounted for room:', roomId);
    
    joinRoom(roomId, userId, userNickname);

    // 방 참가
    console.log('Emitting joinRoom event for room:', roomId);
    socket.emit('joinRoom', { roomId, playerName: userNickname });

    // 방 상태 정보 수신 이벤트 핸들러
    const handleRoomState = (data) => {
      console.log('Received room state:', data);
      if (data.players) {
        // 참가자 정보 업데이트
        setParticipants(data.players.map(player => player.id));
        setParticipantDetails(data.players.map(player => ({
          id: player.id,
          nickname: player.name || `알 수 없음_${player.id.slice(-4)}`,
          isCreator: player.id === data.creator
        })));
        
        // 방장 여부 업데이트
        setIsCreator(data.creator === userId);
      }
    };
    
    // 방장 변경 이벤트 핸들러
    const handleCreatorChanged = (data) => {
      console.log('Creator changed:', data);
      setIsCreator(data.newCreatorId === userId);
    };
    
    // 이벤트 리스너 등록
    socket.on('roomState', handleRoomState);
    socket.on('creatorChanged', handleCreatorChanged);

    // 게임 시작 이벤트 리스너 등록
    const handleMoveToTetris = (receivedRoomId) => {
      console.log('Received moveToTetrisPage event:', receivedRoomId);
      console.log('Current room:', roomId);
      
      if (receivedRoomId === roomId) {
        console.log('Moving to tetris page for room:', roomId);
        // 약간의 지연을 주어 모든 클라이언트가 이벤트를 받을 시간을 확보
        setTimeout(() => {
          navigate(`/tetris/${roomId}`);
        }, 100);
      } else {
        console.log('Received event for different room. Expected:', roomId, 'Received:', receivedRoomId);
      }
    };

    // 게임 시작 확인 이벤트 리스너
    const handleGameStartConfirmation = (data) => {
      console.log('Received game start confirmation:', data);
      if (data.status === 'success') {
        console.log(`Game start confirmed for room: ${data.roomId} with ${data.participantCount} participants`);
        // 게임 시작 성공 시 테트리스 페이지로 이동
        navigate(`/tetris/${data.roomId}`);
      } else if (data.status === 'error') {
        console.error('Game start failed:', data.error);
        alert('게임 시작에 실패했습니다. 다시 시도해주세요.');
      }
    };

    // 이벤트 리스너 등록
    socket.on('moveToTetrisPage', handleMoveToTetris);
    console.log('🎯 moveToTetrisPage event listener registered');
    
    socket.on('gameStartConfirmation', handleGameStartConfirmation);
    console.log('🎯 gameStartConfirmation event listener registered');

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
      
      socket.off('moveToTetrisPage', handleMoveToTetris);
      console.log('🏁 moveToTetrisPage event listener removed');
      
      socket.off('gameStartConfirmation', handleGameStartConfirmation);
      console.log('🏁 gameStartConfirmation event listener removed');
      
      socket.off('roomState', handleRoomState);
      socket.off('creatorChanged', handleCreatorChanged);
    };
  }, [roomId, userId, userNickname, joinRoom, leaveRoom, navigate]);

  const handleLeaveRoom = () => {
    soundManager.play('button'); // 버튼 효과음 재생
    leaveRoom(roomId, userId);
    navigate('/rooms');
  };

  const handleStartGame = () => {
    soundManager.play('button'); // 버튼 효과음 재생
    
    if (isCreator) {
      console.log('Creator starting game for room:', roomId);
      console.log('Socket connected status:', socket.isConnected);
      
      if (!socket.isConnected) {
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
        setErrorMessage(''); // 에러 메시지 초기화
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
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, maxWidth: '250px' }}>
          <h3>참가자 목록 ({participants.length}명)</h3>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {participantDetails.map(participant => (
              <li
                key={participant.id}
                style={{
                  margin: '8px 0',
                  padding: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.7)', // 흰색에 70% 투명도
                  borderRadius: '4px',
                  border: participant.id === userId ? '2px solid #007bff' : '1px solid rgba(0, 0, 0, 0.1)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <span style={{ 
                    position: 'relative', 
                    zIndex: 1,
                    color: '#333', // 글자 색상 명시
                    textShadow: '0 1px 1px rgba(0, 0, 0, 0.1)' // 글자 가독성 향상을 위한 그림자
                  }}>
                    {participant.nickname} {participant.isCreator ? '(방장)' : ''} {participant.id === userId ? ' (나)' : ''}
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
    </div>
  );
};

export default WaitingRoomPage;