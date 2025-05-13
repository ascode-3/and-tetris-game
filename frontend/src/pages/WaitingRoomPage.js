// WaitingRoomPage.js
import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from './socket'; // 소켓 import

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

  const joinRoom = useCallback((roomId, userId, nickname) => {
    const roomsData = JSON.parse(localStorage.getItem('roomsData') || '{}');

    if (!roomsData[roomId]) {
      const rooms = JSON.parse(localStorage.getItem('rooms') || '[]');
      if (!rooms.includes(roomId)) {
        localStorage.setItem('rooms', JSON.stringify([...rooms, roomId]));
      }

      roomsData[roomId] = {
        participants: [],
        participantDetails: {},
        creator: userId
      };
    }

    if (!roomsData[roomId].participants.includes(userId)) {
      roomsData[roomId].participants.push(userId);
    }

    roomsData[roomId].participantDetails[userId] = { nickname };
    localStorage.setItem('roomsData', JSON.stringify(roomsData));

    if (roomsData[roomId].creator === userId) {
      setIsCreator(true);
    }
  }, []);

  const leaveRoom = useCallback((roomId, userId) => {
    const roomsData = JSON.parse(localStorage.getItem('roomsData') || '{}');

    if (roomsData[roomId]) {
      const wasCreator = roomsData[roomId].creator === userId;

      roomsData[roomId].participants = roomsData[roomId].participants.filter(id => id !== userId);

      if (roomsData[roomId].participantDetails[userId]) {
        delete roomsData[roomId].participantDetails[userId];
      }

      if (wasCreator && roomsData[roomId].participants.length > 0) {
        const newCreatorIndex = Math.floor(Math.random() * roomsData[roomId].participants.length);
        const newCreator = roomsData[roomId].participants[newCreatorIndex];
        roomsData[roomId].creator = newCreator;
      }

      if (roomsData[roomId].participants.length === 0) {
        const rooms = JSON.parse(localStorage.getItem('rooms') || '[]');
        const updatedRooms = rooms.filter(id => id !== roomId);
        localStorage.setItem('rooms', JSON.stringify(updatedRooms));
        delete roomsData[roomId];
      }

      localStorage.setItem('roomsData', JSON.stringify(roomsData));
    }
  }, []);

  const updateParticipants = useCallback(() => {
    const roomsData = JSON.parse(localStorage.getItem('roomsData') || '{}');

    if (roomsData[roomId]) {
      const uniqueParticipants = [...new Set(roomsData[roomId].participants || [])];

      if (uniqueParticipants.length !== roomsData[roomId].participants.length) {
        roomsData[roomId].participants = uniqueParticipants;
        localStorage.setItem('roomsData', JSON.stringify(roomsData));
      }

      setParticipants(uniqueParticipants);
      setIsCreator(roomsData[roomId].creator === userId);

      const details = uniqueParticipants.map(participantId => ({
        id: participantId,
        nickname: roomsData[roomId].participantDetails?.[participantId]?.nickname || `알 수 없음_${participantId.slice(-4)}`,
        isCreator: participantId === roomsData[roomId].creator
      }));

      setParticipantDetails(details);
    } else {
      setParticipants([]);
      setParticipantDetails([]);
    }
  }, [roomId, userId]);

  useEffect(() => {
    console.log('WaitingRoomPage mounted for room:', roomId);
    
    joinRoom(roomId, userId, userNickname);
    updateParticipants();
    const interval = setInterval(updateParticipants, 1000);

    // 방 참가
    console.log('Emitting joinRoom event for room:', roomId);
    socket.emit('joinRoom', roomId);

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
      console.log('🎯 moveToTetrisPage event listener removed');
      
      socket.off('gameStartConfirmation', handleGameStartConfirmation);
      console.log('🎯 gameStartConfirmation event listener removed');
    };
  }, [roomId, userId, userNickname, joinRoom, leaveRoom, updateParticipants, navigate]);

  const handleLeaveRoom = () => {
    leaveRoom(roomId, userId);
    navigate('/rooms');
  };

  const handleStartGame = () => {
    if (isCreator) {
      console.log('Creator starting game for room:', roomId);
      console.log('Socket connected status:', socket.isConnected);
      
      if (!socket.isConnected) {
        console.error('Socket is not connected');
        alert('서버와의 연결이 끊어졌습니다. 페이지를 새로고침해주세요.');
        return;
      }

      try {
        // 객체 형태로 roomId 전달
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
        <div style={{ flex: 1 }}>
          <h3>참가자 목록 ({participants.length}명)</h3>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {participantDetails.map(participant => (
              <li
                key={participant.id}
                style={{
                  margin: '8px 0',
                  padding: '8px',
                  backgroundColor: participant.isCreator ? '#fff3cd' : '#f8f9fa',
                  borderRadius: '4px',
                  border: participant.id === userId ? '2px solid #007bff' : '1px solid #ddd'
                }}
              >
                {participant.nickname} {participant.isCreator ? '(방장)' : ''} {participant.id === userId ? ' (나)' : ''}
              </li>
            ))}
          </ul>

          {isCreator && (
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