import React from 'react';
import { useNavigate } from 'react-router-dom';

const LobbyPage = () => {
  const navigate = useNavigate();

  const handleGameStart = () => {
    navigate('/rooms');
  };

  return (
    <div>
      <h1>Lobby Page</h1>
      <button onClick={handleGameStart}>일반 게임</button>
      {/* Add buttons or links to navigate to game rooms */}
    </div>
  );
};

export default LobbyPage; 