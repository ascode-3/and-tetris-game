import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [nickname, setNickname] = useState('');
  const navigate = useNavigate();

  const handleGuestLogin = () => {
    // Generate a random guest nickname if none provided
    const guestNickname = nickname || `guest_${Math.floor(10000000 + Math.random() * 90000000)}`;
    
    // 고유 사용자 ID 생성
    const userId = `user_${Math.floor(10000000 + Math.random() * 90000000)}`;
    
    // 세션 스토리지에 사용자 정보 저장
    sessionStorage.setItem('sessionUserId', userId);
    sessionStorage.setItem('userNickname', guestNickname);
    
    console.log(`Logged in as: ${guestNickname} (ID: ${userId})`);
    navigate('/lobby'); // 방 목록 페이지로 이동
  };

  const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundImage: "url(/images/background image.jpg)",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  const cardStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    padding: '30px',
    borderRadius: '15px',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
    width: '320px',
    textAlign: 'center',
    transform: 'translateY(-20px)',
    transition: 'transform 0.3s ease',
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '20px',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
  };

  const avatarStyle = {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    margin: '0 auto 20px',
    display: 'block',
    objectFit: 'cover',
  };

  const formStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    margin: '4px 0',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '13px',
  };


  const buttonStyle = {
    width: '100%',
    padding: '12px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    marginTop: '20px',
    fontWeight: 'bold',
    transition: 'background-color 0.3s',
  };


  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          테트리스 게임
        </div>
        <img src="/images/login.a.png" alt="Tetris Logo" style={avatarStyle} />
        <form style={formStyle} onSubmit={(e) => {
          e.preventDefault();
          handleGuestLogin();
        }}>
          <input 
            type="text" 
            placeholder="닉네임을 입력하세요 (선택사항)" 
            style={inputStyle} 
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength="12"
          />
          <button type="submit" style={buttonStyle}>게임 시작하기</button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;