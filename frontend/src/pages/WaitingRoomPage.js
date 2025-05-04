import React from 'react';
import { useParams } from 'react-router-dom';

const WaitingRoomPage = () => {
  const { roomId } = useParams();

  return (
    <div>
      <h1>Waiting Room Page</h1>
      <h2>Room ID: {roomId}</h2>
      {/* Add participant list and start button for room creator */}
    </div>
  );
};

export default WaitingRoomPage; 