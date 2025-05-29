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
    backgroundImage: "url(process.env.PUBLIC_URL + '/images/background image.jpg')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  const cardStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    padding: '40px', // 패딩 증가
    borderRadius: '15px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    width: '400px', // 너비 증가
    backdropFilter: 'blur(5px)',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '20px',
  };

  const tabStyle = (active) => ({
    background: 'none',
    border: 'none',
    fontSize: '18px', // 폰트 크기 증가
    cursor: 'pointer',
    fontWeight: active ? 'bold' : 'normal',
    padding: '10px 20px', // 패딩 추가
    color: active ? '#007bff' : '#333', // 활성 탭 색상 변경
  });

  const avatarStyle = {
    width: '150px', // 아바타 크기 증가
    height: '150px',
    borderRadius: '50%',
    marginBottom: '30px', // 여백 증가
  };

  const formStyle = {
    display: 'flex',
    flexDirection: 'column',
  };

  const inputStyle = {
    marginBottom: '15px', // 여백 증가
    padding: '15px', // 패딩 증가
    border: '1px solid #ccc',
    borderRadius: '8px',
    fontSize: '16px', // 폰트 크기 증가
  };

  const optionsStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '20px',
    color: 'black', // 글씨 색상을 검정색으로 변경
  };

  const buttonStyle = {
    padding: '15px', // 패딩 증가
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px', // 폰트 크기 증가
    fontWeight: 'bold', // 글자 두께 증가
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