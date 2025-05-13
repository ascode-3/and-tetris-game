import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [nickname, setNickname] = useState('');
  const navigate = useNavigate();

  const toggleForm = () => {
    setIsRegister(!isRegister);
  };

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
    backgroundColor: '#f0f0f0',
  };

  const cardStyle = {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    width: '300px',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '20px',
  };

  const tabStyle = (active) => ({
    background: 'none',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: active ? 'bold' : 'normal',
  });

  const avatarStyle = {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    marginBottom: '20px',
  };

  const formStyle = {
    display: 'flex',
    flexDirection: 'column',
  };

  const inputStyle = {
    marginBottom: '10px',
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '5px',
  };

  const optionsStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '20px',
  };

  const buttonStyle = {
    padding: '10px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  };

  const footerStyle = {
    textAlign: 'center',
    marginTop: '20px',
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <button style={tabStyle(!isRegister)} onClick={toggleForm}>로그인</button>
          <button style={tabStyle(isRegister)} onClick={toggleForm}>회원가입</button>
        </div>
        <div style={{ textAlign: 'center' }}>
          <img src="/api/placeholder/100/100" alt="User Avatar" style={avatarStyle} />
        </div>
        <form style={formStyle} onSubmit={(e) => e.preventDefault()}>
          <input 
            type="text" 
            placeholder="닉네임" 
            style={inputStyle} 
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <input type="password" placeholder="비밀번호" style={inputStyle} />
          {isRegister && <input type="password" placeholder="비밀번호 확인" style={inputStyle} />}
          <div style={optionsStyle}>
            {!isRegister && (
              <label>
                <input type="checkbox" /> 비밀번호 기억하기
              </label>
            )}
            <button type="button" onClick={() => alert('비밀번호 찾기 기능은 아직 구현되지 않았습니다.')}>비밀번호 찾기</button>
          </div>
          <button type="submit" style={buttonStyle}>{isRegister ? '회원가입' : '로그인'}</button>
        </form>
        <div style={footerStyle}>
          <button 
            type="button" 
            onClick={isRegister ? toggleForm : handleGuestLogin}
          >
            {isRegister ? '로그인' : '게스트'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;