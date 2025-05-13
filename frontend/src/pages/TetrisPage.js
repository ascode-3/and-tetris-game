import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const TetrisPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const handleLeaveGame = () => {
    // 나중에 소켓 연결 해제 등 추가 가능
    navigate('/rooms'); // 방 리스트로 돌아가기
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>🎮 테트리스 게임</h1>
      <h2>Room ID: {roomId}</h2>
      <p>여기서 멀티 테트리스 게임이 시작됩니다. (아직 구현되지 않음)</p>

      <button
        onClick={handleLeaveGame}
        style={{
          padding: '10px 20px',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginTop: '20px'
        }}
      >
        게임 나가기
      </button>
    </div>
  );
};

export default TetrisPage;
