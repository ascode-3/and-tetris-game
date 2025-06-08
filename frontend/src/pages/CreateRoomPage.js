import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socketManager from './socket';

const CreateRoomPage = () => {
  const navigate = useNavigate();

  const [isCreating, setIsCreating] = useState(false);
  
  useEffect(() => {
    // 방 생성 응답 이벤트 리스너 등록
    const handleRoomCreated = ({roomId, success}) => {
      console.log('Room created response:', roomId, success);
      setIsCreating(false);
      
      if (success) {
        // 생성한 방의 대기실로 이동
        navigate(`/waiting-room/${roomId}`);
      } else {
        alert('방 생성에 실패했습니다. 다시 시도해주세요.');
      }
    };
    
    socketManager.on('roomCreated', handleRoomCreated);
    
    return () => {
      socketManager.off('roomCreated', handleRoomCreated);
    };
  }, [navigate]);

  const handleCreateRoom = () => {
    // 세션 스토리지에서 사용자 ID와 닉네임 가져오기
    let userId = sessionStorage.getItem('sessionUserId');
    let userNickname = sessionStorage.getItem('userNickname');
    
    // ID가 없으면 생성
    if (!userId) {
      userId = `user_${Math.floor(Math.random() * 1e8)}`;
      sessionStorage.setItem('sessionUserId', userId);
    }
    
    // 닉네임이 없으면 기본값 설정
    if (!userNickname) {
      userNickname = `게스트_${userId.slice(-4)}`;
      sessionStorage.setItem('userNickname', userNickname);
    }

    // 서버에 방 생성 요청
    setIsCreating(true);
    socketManager.emit('createRoom', { playerName: userNickname });
  };

  return (
    <div style={{ 
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh'
    }}>
      <h1>방 생성</h1>
      <p>새로운 방을 생성합니다. '완료' 버튼을 누르면 대기실로 이동합니다.</p>
      <button 
  onClick={handleCreateRoom}
  disabled={isCreating}
  style={{
    padding: '10px 20px',
    backgroundColor: isCreating ? '#6c757d' : '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontSize: '16px',
    cursor: isCreating ? 'not-allowed' : 'pointer',
    marginTop: '20px',
    opacity: isCreating ? 0.7 : 1,
    transition: 'all 0.3s ease'
  }}
>
  {isCreating ? '생성 중...' : '완료'}
</button>
    </div>
  );
};

export default CreateRoomPage;