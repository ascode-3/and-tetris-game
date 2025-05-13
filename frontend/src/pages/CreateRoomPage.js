import React from 'react';
import { useNavigate } from 'react-router-dom';

const CreateRoomPage = () => {
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    // 1) 새 방 ID 생성
    const roomId = Math.random().toString(36).substr(2, 5).toUpperCase();

    // 2) 로컬스토리지의 rooms 배열 업데이트 (방 목록에 표시하기 위함)
    const rooms = JSON.parse(localStorage.getItem('rooms') || '[]');
    if (!rooms.includes(roomId)) {
      localStorage.setItem('rooms', JSON.stringify([...rooms, roomId]));
    }

    // 3) 세션 스토리지에서 사용자 ID와 닉네임 가져오기
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

    // 4) roomsData 초기화 - 방장을 참가자로 등록하고 닉네임 정보 추가
    const roomsData = JSON.parse(localStorage.getItem('roomsData') || '{}');
    roomsData[roomId] = {
      participants: [userId],  // 방장을 참가자로 추가
      creator: userId,         // 방장 정보 기록
      participantDetails: {    // 참가자 상세 정보 저장
        [userId]: {
          nickname: userNickname
        }
      }
    };
    localStorage.setItem('roomsData', JSON.stringify(roomsData));

    // 5) 생성한 방의 대기실로 이동
    navigate(`/waiting-room/${roomId}`);
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
        style={{
          padding: '10px 20px',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          fontSize: '16px',
          cursor: 'pointer',
          marginTop: '20px'
        }}
      >
        완료
      </button>
    </div>
  );
};

export default CreateRoomPage;