import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const RoomListPage = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);

  const handleCreateRoom = () => {
    navigate('/create-room');
  };

  // Load rooms from localStorage
  useEffect(() => {
    const storedRooms = JSON.parse(window.localStorage.getItem('rooms') || '[]');
    setRooms(storedRooms);
  }, []);

  return (
    <div>
      <h1>Room List Page</h1>
      {/* Add list of available rooms and a button to create a new room */}
      <button onClick={handleCreateRoom}>방 생성</button>
      <ul>
        {rooms.map((room) => (
          <li key={room} onClick={() => navigate(`/waiting-room/${room}`)}>{room}</li>
        ))}
      </ul>
    </div>
  );
};

export default RoomListPage; 