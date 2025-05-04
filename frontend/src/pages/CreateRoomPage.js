import React from 'react';
import { useNavigate } from 'react-router-dom';

const CreateRoomPage = () => {
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    const roomId = Math.random().toString(36).substr(2, 5).toUpperCase(); // Generate a 5-character unique room ID in uppercase
    // Add room to the list
    window.localStorage.setItem('rooms', JSON.stringify([...JSON.parse(window.localStorage.getItem('rooms') || '[]'), roomId]));
    navigate(`/waiting-room/${roomId}`);
  };

  return (
    <div>
      <h1>Create Room Page</h1>
      {/* Add form or inputs to create a new room */}
      <button onClick={handleCreateRoom}>완료</button>
    </div>
  );
};

export default CreateRoomPage; 