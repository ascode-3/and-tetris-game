import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTetris } from './hooks/useTetris';
import './TetrisPage.css';

const TetrisPage = () => {
  const navigate = useNavigate();

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
    gameOver
  } = useTetris();

  // Set canvas refs
  useEffect(() => {
    if (gameBoardRef.current) setGameBoardRef(gameBoardRef.current);
    if (holdCanvasRef.current) setHoldCanvasRef(holdCanvasRef.current);
    if (nextCanvasRef.current) setNextCanvasRef(nextCanvasRef.current);
    if (nextNextCanvasRef.current) setNextNextCanvasRef(nextNextCanvasRef.current);
  }, [setGameBoardRef, setHoldCanvasRef, setNextCanvasRef, setNextNextCanvasRef]);

  // Auto start game after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      const cleanup = startGame();
      return () => {
        if (cleanup) cleanup();
      };
    }, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, [startGame]);

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
            <div className="control-item">←→ : Move</div>
            <div className="control-item">↑ : Rotate</div>
            <div className="control-item">↓ : Drop</div>
            <div className="control-item">Space : Hard Drop</div>
            <div className="control-item">Shift : Hold Piece</div>
            <div className="control-item">Q : Pause</div>
          </div>
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
