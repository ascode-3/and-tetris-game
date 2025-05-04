import React from 'react';
import { Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import RoomListPage from './pages/RoomListPage';
import CreateRoomPage from './pages/CreateRoomPage';
import WaitingRoomPage from './pages/WaitingRoomPage';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/lobby" element={<LobbyPage />} />
      <Route path="/rooms" element={<RoomListPage />} />
      <Route path="/create-room" element={<CreateRoomPage />} />
      <Route path="/waiting-room" element={<WaitingRoomPage />} />
    </Routes>
  );
};

export default App;
