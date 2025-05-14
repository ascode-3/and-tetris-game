import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTetris } from './hooks/useTetris';
import { useSocket } from '../../hooks/useSocket';
import MiniTetrisBoard from './components/MiniTetrisBoard';
import './TetrisPage.css';

const TetrisPage = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [refsReady, setRefsReady] = useState(false);
  const [otherPlayers, setOtherPlayers] = useState([]);
  const playerName = localStorage.getItem('playerName') || 'Player';
  const eventHandlersSet = useRef(false);

  // Socket 훅 사용
  const { socket, joinRoom, updateGameState } = useSocket();

  // Canvas refs
  const gameBoardRef = useRef(null);
  const holdCanvasRef = useRef(null);
  const nextCanvasRef = useRef(null);
  const nextNextCanvasRef = useRef(null);

  // Initialize game
  const {
    startGame,
    setGameBoardRef,
    setHoldCanvasRef,
    setNextCanvasRef,
    setNextNextCanvasRef,
    gameOver,
    currentGameState
  } = useTetris();

  // Set canvas refs
  useEffect(() => {
    if (gameBoardRef.current && holdCanvasRef.current && 
        nextCanvasRef.current && nextNextCanvasRef.current) {
      
      setGameBoardRef(gameBoardRef.current);
      setHoldCanvasRef(holdCanvasRef.current);
      setNextCanvasRef(nextCanvasRef.current);
      setNextNextCanvasRef(nextNextCanvasRef.current);
      
      setRefsReady(true);
    }
  }, [
    setGameBoardRef, 
    setHoldCanvasRef, 
    setNextCanvasRef, 
    setNextNextCanvasRef
  ]);

  // Handle game state updates from other players
  const handleGameStateUpdate = useCallback((data) => {
    if (data.playerId !== socket?.id) {
      setOtherPlayers(prevPlayers => {
        const updatedPlayers = prevPlayers.filter(p => p.id !== data.playerId);
        return [...updatedPlayers, {
          id: data.playerId,
          name: data.playerName,
          gameState: data.gameState
        }];
      });
    }
  }, [socket?.id]);

  // Handle player disconnect
  const handlePlayerDisconnect = useCallback((playerId) => {
    setOtherPlayers(prevPlayers => 
      prevPlayers.filter(p => p.id !== playerId)
    );
  }, []);

  // Socket.IO event handlers
  useEffect(() => {
    if (!socket || !refsReady || eventHandlersSet.current) return;

    console.log('Setting up socket event handlers in TetrisPage');
    eventHandlersSet.current = true;

    // Join the game room
    joinRoom(roomId, playerName);

    // Set up event listeners
    socket.on('gameStateUpdate', handleGameStateUpdate);
    socket.on('playerDisconnect', handlePlayerDisconnect);
    socket.on('gameStart', () => {
      console.log('Received gameStart event, starting game...');
      startGame();
    });

    // Cleanup
    return () => {
      console.log('Cleaning up socket event handlers');
      socket.off('gameStateUpdate', handleGameStateUpdate);
      socket.off('playerDisconnect', handlePlayerDisconnect);
      socket.off('gameStart');
      eventHandlersSet.current = false;
    };
  }, [socket, refsReady, roomId, playerName, startGame, joinRoom, handleGameStateUpdate, handlePlayerDisconnect]);

  // Send game state updates
  useEffect(() => {
    if (!socket || !currentGameState) return;

    const interval = setInterval(() => {
      updateGameState(roomId, currentGameState);
    }, 100); // Update every 100ms

    return () => clearInterval(interval);
  }, [socket, roomId, currentGameState, updateGameState]);

  // Handle game over
  useEffect(() => {
    if (gameOver) {
      navigate('/rooms');
    }
  }, [gameOver, navigate]);

  const handleLeaveGame = () => {
    navigate('/rooms');
  };

  return (
    <div className="container">
      <div className="game-area">
        <div className="player-game">
          <div className="side-panel left">
            <div className="hold-box">
              <div className="panel-label">Hold:</div>
              <canvas ref={holdCanvasRef} id="holdCanvas" width="120" height="120"></canvas>
            </div>
          </div>

          <div className="game-board-container">
            <canvas ref={gameBoardRef} id="gameBoard" width="300" height="600"></canvas>
          </div>

          <div className="side-panel right">
            <div className="next-box">
              <div className="panel-label">Next:</div>
              <canvas ref={nextCanvasRef} id="nextCanvas" width="120" height="120"></canvas>
            </div>
            <div className="next-next-box">
              <div className="panel-label">Next Next:</div>
              <canvas ref={nextNextCanvasRef} id="nextNextCanvas" width="120" height="120"></canvas>
            </div>
            <div className="controls">
              <div className="panel-label">Controls:</div>
              <div className="control-item">←→ : 이동</div>
              <div className="control-item">↑ : 회전</div>
              <div className="control-item">↓ : 소프트 드롭</div>
              <div className="control-item">Space : 하드 드롭</div>
              <div className="control-item">Shift : 홀드</div>
            </div>
          </div>
        </div>

        <div className="other-players">
          {otherPlayers.map((player) => (
            <MiniTetrisBoard
              key={player.id}
              gameState={player.gameState}
              playerName={player.name}
            />
          ))}
        </div>
      </div>

      <button
        className="leave-button"
        onClick={handleLeaveGame}
      >
        게임 나가기
      </button>
    </div>
  );
};

export default TetrisPage;
