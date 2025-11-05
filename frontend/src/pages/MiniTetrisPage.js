import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/MiniTetrisPage.css';

const MiniTetrisPage = () => {
  const navigate = useNavigate();

  const handleBackToLobby = () => {
    navigate('/lobby');
  };

  // 여기에 미니 테트리스 게임 컴포넌트를 추가하시면 됩니다.
  // 예: <MiniTetris />

  return (
    <div className="mini-tetris-container">
      <h1>미니 테트리스</h1>
      <div className="game-area">
        {/* 미니 테트리스 게임이 여기에 들어갑니다 */}
        <p>미니 테트리스 게임이 여기에 표시됩니다.</p>
      </div>
      <button onClick={handleBackToLobby} className="back-button">
        로비로 돌아가기
      </button>
    </div>
  );
};

export default MiniTetrisPage;
