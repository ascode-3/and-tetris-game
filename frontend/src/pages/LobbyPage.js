import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LobbyPage.css';

const LobbyPage = () => {
  const navigate = useNavigate();

  const handleButtonClick = (buttonName) => {
    switch(buttonName) {
      case '우상단': // 멀티게임
        navigate('/rooms');
        break;
      case '좌상단': // 랭킹전
      case '좌중앙': // 랭킹
      case '우중앙': // 설정
      default:
        alert('업데이트 예정입니다.');
        break;
    }
  };

  return (
    <div className="button-container">
      <div className="button top-left" onClick={() => handleButtonClick('좌상단')}>
        <span>랭킹전</span>
      </div>
      
      <div className="button middle-left" onClick={() => handleButtonClick('좌중앙')}>
        <span>랭킹</span>
      </div>
      
      <div className="button top-right" onClick={() => handleButtonClick('우상단')}>
        <span>멀티게임</span>
      </div>
      
      <div className="button middle-right" onClick={() => handleButtonClick('우중앙')}>
        <span>설정</span>
      </div>
    </div>
  );
};

export default LobbyPage;