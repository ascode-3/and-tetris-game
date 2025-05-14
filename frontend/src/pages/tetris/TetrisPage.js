import React, { useRef, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTetris } from './hooks/useTetris';
import { useSocket } from '../../hooks/useSocket';
import MiniTetrisBoard from './components/MiniTetrisBoard';
import './TetrisPage.css';

const TetrisPage = () => {
  const navigate = useNavigate();
  const { roomId } = useParams(); // URL에서 방 ID 가져오기
  const [refsReady, setRefsReady] = useState(false);
  const [otherPlayers, setOtherPlayers] = useState([]);
  const playerName = localStorage.getItem('playerName') || 'Player'; // 플레이어 이름 가져오기

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

  // Socket 이벤트 리스너 설정
  useEffect(() => {
    if (!socket) return;

    // 방 상태 수신
    socket.on('roomState', ({ players, gameStates }) => {
      const others = players
        .filter(player => player.id !== socket.id)
        .map(player => ({
          ...player,
          gameState: gameStates.find(state => state.playerId === player.id)?.gameState
        }));
      setOtherPlayers(others);
    });

    // 새 플레이어 입장
    socket.on('playerJoined', (player) => {
      setOtherPlayers(prev => [...prev, { ...player, gameState: null }]);
    });

    // 플레이어 퇴장
    socket.on('playerLeft', ({ playerId }) => {
      setOtherPlayers(prev => prev.filter(player => player.id !== playerId));
    });

    // 게임 상태 업데이트 수신
    socket.on('gameStateUpdated', ({ playerId, gameState }) => {
      setOtherPlayers(prev => prev.map(player => 
        player.id === playerId 
          ? { ...player, gameState } 
          : player
      ));
    });

    return () => {
      socket.off('roomState');
      socket.off('playerJoined');
      socket.off('playerLeft');
      socket.off('gameStateUpdated');
    };
  }, [socket]);

  // 방 참가
  useEffect(() => {
    if (socket && roomId) {
      joinRoom(roomId, playerName);
    }
  }, [socket, roomId, playerName, joinRoom]);

  // 게임 상태 업데이트 전송
  useEffect(() => {
    const sendGameState = () => {
      if (socket && roomId && currentGameState) {
        updateGameState(roomId, currentGameState);
      }
    };

    // 주기적으로 게임 상태 전송 (60fps)
    const interval = setInterval(sendGameState, 1000 / 60);

    return () => clearInterval(interval);
  }, [socket, roomId, currentGameState, updateGameState]);

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

  // Auto start game after 2 seconds
  useEffect(() => {
    let cleanupFunction = null;
    
    if (refsReady) {
      console.log("Refs are ready, starting game in 2 seconds...");
      const timer = setTimeout(() => {
        console.log("Starting game now!");
        cleanupFunction = startGame();
      }, 2000);

      return () => {
        clearTimeout(timer);
        if (cleanupFunction) {
          cleanupFunction();
        }
      };
    }
  }, [refsReady, startGame]);

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
