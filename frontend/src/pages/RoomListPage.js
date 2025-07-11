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
    // 서버에서 방 목록 요청
    socketManager.emit('getRoomList');
  };
  
  // 서버로부터 방 목록 응답 수신 시 처리
  useEffect(() => {
    // 방 목록 응답 이벤트 리스너
    const handleRoomListResponse = (roomList) => {
      console.log('Received room list from server:', roomList);
      setRooms(roomList);
    };
    
    // 방 목록 갱신 알림 이벤트 리스너
    const handleRoomListUpdated = () => {
      console.log('Room list updated notification received');
      loadRooms(); // 방 목록 다시 요청
    };
    
    // 이벤트 리스너 등록
    socketManager.on('roomListResponse', handleRoomListResponse);
    socketManager.on('roomListUpdated', handleRoomListUpdated);
    
    return () => {
      // 컴포넌트 언마운트 시 이벤트 리스너 제거
      socketManager.off('roomListResponse', handleRoomListResponse);
      socketManager.off('roomListUpdated', handleRoomListUpdated);
    };
  }, []);

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

  return (
    <div style={{ 
      padding: '20px',
      minHeight: '100vh',
      backgroundImage: `url('/images/background image.jpg')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      backgroundRepeat: 'no-repeat'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(5px)',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0 }}>방 목록</h1>
        <div>
<div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={handleCreateRoom}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                ':hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                  backgroundColor: '#218838'
                },
                ':active': {
                  transform: 'translateY(0)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }
              }}
            >
              방 생성
            </button>
          </div>
        </div>
      </div>

      {rooms.length > 0 ? (
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
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(5px)',
                borderRadius: '10px',
                padding: '20px',
                cursor: 'pointer',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.3s ease',
                ':hover': {
                  transform: 'translateY(-5px)',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  boxShadow: '0 6px 12px rgba(0, 0, 0, 0.3)'
                },
                ':active': {
                  transform: 'translateY(0)',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                }
              }}
            >
              <h3 style={{ margin: '0 0 10px 0', color: '#000000', fontWeight: '700' }}>방 ID: {room.id}</h3>
              <p style={{ margin: '5px 0', color: '#000000', fontWeight: '600' }}>참가자: {room.participantCount}명</p>
              <p style={{ margin: '5px 0', color: '#000000', fontWeight: '600' }}>방장: {room.creatorNickname}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default RoomListPage;
