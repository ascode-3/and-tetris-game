import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMiniTetris } from './tetris/hooks/useMiniTetris';
import { isEffectEnabled } from '../config/planetEffects';
import '../styles/MiniTetrisPage.css';

const MiniTetrisPage = () => {
  const navigate = useNavigate();
  const { difficulty } = useParams();
  
  // difficulty를 행성 ID로 사용 (예: 'sun', 'earth', 'mars' 등)
  const planetId = difficulty || 'earth';
  
  const {
    linesCleared,
    elapsedTime,
    isGameStarted,
    gameOver,
    gameCompleted,
    isPaused,
    gameBoardRef,
    holdCanvasRef,
    nextCanvasRef,
    startGame,
    restartGame,
    togglePause,
    setGameBoardRef,
    setHoldCanvasRef,
    setNextCanvasRef,
    planetEffects
  } = useMiniTetris(planetId);
  
  // 금성: Next 숨기기
  const hideNext = isEffectEnabled(planetEffects, 'hideNext');

  // 난이도에 따른 게임 속도 설정
  const getGameSpeed = () => {
    switch(difficulty) {
      case 'easy':
        return 800; // 느린 속도
      case 'hard':
        return 300; // 빠른 속도
      case 'normal':
      default:
        return 500; // 기본 속도
    }
  };

  const GAME_SPEED = getGameSpeed();

  // 시간을 분:초 형식으로 변환
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBackToLobby = () => {
    navigate('/select-difficulty');
  };

  const handleStartGame = () => {
    if (!isGameStarted) {
      startGame();
    }
  };

  return (
    <div className="mini-tetris-container">
      <div className="game-layout">
        {/* 왼쪽: Hold 및 조작법 */}
        <div className="side-panel left-panel">
          <div className="panel-section">
            <h3>Hold</h3>
            <canvas ref={setHoldCanvasRef} className="preview-canvas" />
          </div>
          
          <div className="panel-section controls-panel">
            <h3>조작법</h3>
            <div className="controls-list">
              <p>← → : 좌우 이동</p>
              <p>↑ : 회전</p>
              <p>↓ : 소프트 드롭</p>
              <p>Space : 하드 드롭</p>
              <p>Shift : Hold</p>
              <p>P / ESC : 일시정지</p>
            </div>
          </div>

          {/* 방해 효과 섹션 */}
          <div className="panel-section effect-panel">
            <h3>방해 효과</h3>
            <div className="effect-description">
              <p>{planetEffects.effectDescription || '방해 효과 없음'}</p>
            </div>
          </div>
        </div>

        {/* 중앙: 게임 보드 */}
        <div className="center-panel">
          <div className="game-info">
            <div className="info-item">
              <span className="info-label">라인:</span>
              <span className="info-value">{linesCleared} / 25</span>
            </div>
            <div className="info-item">
              <span className="info-label">시간:</span>
              <span className="info-value">{formatTime(elapsedTime)}</span>
            </div>
          </div>

          <div className="game-area">
            <canvas ref={setGameBoardRef} className="game-canvas" />
            
            {!isGameStarted && !gameOver && !gameCompleted && (
              <div className="game-overlay">
                <h2>루나 테트리스</h2>
                <p>25줄을 클리어하세요!</p>
                <button onClick={handleStartGame} className="start-button">
                  게임 시작
                </button>
                <div className="overlay-buttons">
                  <button onClick={handleBackToLobby} className="back-button">
                    돌아가기
                  </button>
                </div>
              </div>
            )}
            
            {gameOver && (
              <div className="game-overlay">
                <h2>게임 오버!</h2>
                <p className="final-info">클리어한 라인: {linesCleared}</p>
                <p className="final-info">소요 시간: {formatTime(elapsedTime)}</p>
                <button onClick={restartGame} className="restart-button">
                  다시 시작
                </button>
                <button onClick={handleBackToLobby} className="back-button">
                  돌아가기
                </button>
              </div>
            )}

            {gameCompleted && (
              <div className="game-overlay">
                <h2>🎉 완료! 🎉</h2>
                <p className="final-info">25줄 클리어 성공!</p>
                <p className="final-time">완료 시간: {formatTime(elapsedTime)}</p>
                <button onClick={restartGame} className="restart-button">
                  다시 시작
                </button>
                <button onClick={handleBackToLobby} className="back-button">
                  로비로 돌아가기
                </button>
              </div>
            )}

            {isPaused && !gameOver && !gameCompleted && (
              <div className="game-overlay">
                <h2>일시정지</h2>
                <p>P 키 또는 ESC 키를 눌러 계속하기</p>
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: Next 영역 (4개 블록) - 금성에서는 블록만 안 보임 */}
        <div className="side-panel right-panel">
          <div className="panel-section next-panel">
            <h3>Next</h3>
            <canvas 
              ref={setNextCanvasRef} 
              className="next-canvas"
              style={{ opacity: hideNext ? 0 : 1 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiniTetrisPage;