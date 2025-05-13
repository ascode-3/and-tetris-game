import React from 'react';
import { Routes, Route } from 'react-router-dom';
import NavigationBlocker from './NavigationBlocker';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import RoomListPage from './pages/RoomListPage';
import CreateRoomPage from './pages/CreateRoomPage';
import WaitingRoomPage from './pages/WaitingRoomPage';
import TetrisPage from './pages/TetrisPage';

const App = () => {
  return (
    <>
      <NavigationBlocker />
      <Routes>
        <Route path="/"                      element={<LoginPage />} />
        <Route path="/lobby"                 element={<LobbyPage />} />
        <Route path="/rooms"                 element={<RoomListPage />} />
        <Route path="/create-room"           element={<CreateRoomPage />} />
        <Route path="/waiting-room/:roomId"  element={<WaitingRoomPage />} />
        <Route path="/tetris"                element={<TetrisPage />} />
      </Routes>
    </>
  );
};

export default App;
