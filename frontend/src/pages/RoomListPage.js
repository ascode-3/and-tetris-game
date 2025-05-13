import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socketManager from './socket';

const RoomListPage = () => {
  const [rooms, setRooms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const userId = sessionStorage.getItem('sessionUserId');
    if (!userId) {
      navigate('/');
      return;
    }
  }, [navigate]);

  const loadRooms = () => {
    const storedRooms = JSON.parse(localStorage.getItem('rooms') || '[]');
    const roomsData = JSON.parse(localStorage.getItem('roomsData') || '{}');
    const validRooms = storedRooms.filter(roomId => roomsData[roomId]);

    if (validRooms.length !== storedRooms.length) {
      localStorage.setItem('rooms', JSON.stringify(validRooms));
    }

    const roomsWithInfo = validRooms.map(roomId => {
      const roomData = roomsData[roomId];
      const creatorId = roomData?.creator;
      const creatorNickname = roomData?.participantDetails?.[creatorId]?.nickname || '알 수 없음';
      return {
        id: roomId,
        participantCount: roomData?.participants?.length || 0,
        creatorNickname
      };
    });

    setRooms(roomsWithInfo);
  };

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateRoom = () => {
    navigate('/create-room');
  };

  const handleJoinRoom = (roomId) => {
    navigate(`/waiting-room/${roomId}`);
  };

  const handleReset = () => {
    if (window.confirm('정말로 모든 대기실을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      try {
        // 모든 방 데이터 초기화
        localStorage.setItem('rooms', '[]');
        localStorage.setItem('roomsData', '{}');
        
        // rooms 상태 초기화
        setRooms([]);
        
        // 소켓 이벤트 발생 (다른 클라이언트들에게 알림)
        socketManager.emit('resetRooms');
        
        // 성공 메시지
        alert('모든 대기실이 성공적으로 초기화되었습니다.');
        
        // 방 목록 새로고침
        loadRooms();
      } catch (error) {
        console.error('초기화 중 오류 발생:', error);
        alert('초기화 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    }
  };

  return (
    <div style={{ 
      padding: '20px',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0 }}>방 목록</h1>
        <div>
          <button 
            onClick={handleCreateRoom}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginRight: '10px',
              fontSize: '16px',
              transition: 'background-color 0.2s',
              ':hover': {
                backgroundColor: '#218838'
              }
            }}
          >
            방 생성
          </button>
          <button 
            onClick={handleReset}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              transition: 'background-color 0.2s',
              ':hover': {
                backgroundColor: '#c82333'
              }
            }}
          >
            초기화
          </button>
        </div>
      </div>

      {rooms.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          backgroundColor: 'white', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontSize: '16px', color: '#666' }}>생성된 방이 없습니다.</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '20px'
        }}>
          {rooms.map(room => (
            <div 
              key={room.id}
              onClick={() => handleJoinRoom(room.id)}
              style={{ 
                backgroundColor: 'white',
                border: '1px solid #eee',
                borderRadius: '8px',
                padding: '20px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
                ':hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
                }
              }}
            >
              <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>방 ID: {room.id}</h3>
              <p style={{ margin: '5px 0', color: '#666' }}>참가자: {room.participantCount}명</p>
              <p style={{ margin: '5px 0', color: '#666' }}>방장: {room.creatorNickname}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomListPage;
