import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
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
  const [gameOver, setGameOver] = useState(false);
  const [isGameWon, setIsGameWon] = useState(false);
  const [winner, setWinner] = useState(null);
  const playerName = sessionStorage.getItem('userNickname') || '게스트_' + (sessionStorage.getItem('sessionUserId')?.slice(-4) || '0000');
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
    gameOver: gameIsOver,
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

  // refsReady가 true가 되면 본인 게임을 무조건 시작
  useEffect(() => {
    if (refsReady) {
      console.log('refsReady! Forcing startGame()');
      startGame();
    }
  }, [refsReady, startGame]);

  // Handle game state updates from other players
  const handleGameStateUpdate = useCallback((data) => {
    if (data.playerId !== socket?.id) {
      setOtherPlayers(prevPlayers => {
        // Find the index of the player to update
        const playerIndex = prevPlayers.findIndex(p => p.id === data.playerId);

        if (playerIndex > -1) {
          // 이미 게임 오버된 플레이어의 상태는 업데이트하지 않음
          if (prevPlayers[playerIndex].gameState?.isGameOver) {
            // 다만 isGameOver 플래그가 있는 상태에서는 유지
            if (data.gameState?.isGameOver) {
              return prevPlayers;
            }
            // 새 상태에 isGameOver 플래그가 없는 경우, 기존 플래그 유지
            const newPlayers = [...prevPlayers];
            newPlayers[playerIndex] = {
              ...newPlayers[playerIndex],
              gameState: {
                ...data.gameState,
                isGameOver: true
              }
            };
            return newPlayers;
          }
          
          // 일반 상태 업데이트
          const newPlayers = [...prevPlayers];
          newPlayers[playerIndex] = {
            ...newPlayers[playerIndex],
            gameState: data.gameState
          };
          return newPlayers;
        } else {
          // New player: Add to the end (or implement a consistent sorting)
          // For now, adding to the end. If strict join order is needed,
          // server should send join order.
          return [...prevPlayers, {
          id: data.playerId,
          name: data.playerName,
          gameState: data.gameState
        }];
        }
      });
    }
  }, [socket?.id]);

  // 다른 플레이어의 게임 오버 처리
  const handlePlayerGameOver = useCallback((data) => {
    if (data.playerId !== socket?.id) {
      console.log(`Player ${data.playerId} game over with score: ${data.score}`);
      
      setOtherPlayers(prevPlayers => {
        // 게임 오버된 플레이어 찾기
        const playerIndex = prevPlayers.findIndex(p => p.id === data.playerId);
        
        if (playerIndex > -1) {
          // 플레이어를 찾았으면 게임 오버 상태 업데이트
          const newPlayers = [...prevPlayers];
          newPlayers[playerIndex] = {
            ...newPlayers[playerIndex],
            gameState: {
              ...newPlayers[playerIndex].gameState,
              isGameOver: true
            }
          };
          return newPlayers;
        }
        return prevPlayers;
      });
    }
  }, [socket?.id]);
  
  // 게임 승리 이벤트 핸들러
  const handleGameWin = useCallback((data) => {
    console.log('Game won by:', data.winner);
    setIsGameWon(true);
    setWinner(data.winner);
  }, []);
  
  // 게임 재시작 이벤트 핸들러
  const handleGameRestart = useCallback(() => {
    console.log('Game restarted');
    setIsGameWon(false);
    setWinner(null);
    setGameOver(false);
    if (gameBoardRef.current) {
      startGame();
    }
  }, []);

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
    console.log('Joining room with playerName:', playerName);
    joinRoom(roomId, playerName);

    // Set up event listeners
    socket.on('gameStateUpdate', handleGameStateUpdate);
    socket.on('playerDisconnect', handlePlayerDisconnect);
    socket.on('playerGameOver', handlePlayerGameOver);
    socket.on('gameWin', handleGameWin);
    socket.on('gameRestart', handleGameRestart);
    socket.on('gameStart', () => {
      console.log('Received gameStart event, starting game...');
      startGame();
    });

    // Cleanup
    return () => {
      console.log('Cleaning up socket event handlers');
      socket.off('gameStateUpdate', handleGameStateUpdate);
      socket.off('playerDisconnect', handlePlayerDisconnect);
      socket.off('playerGameOver', handlePlayerGameOver);
      socket.off('gameWin', handleGameWin);
      socket.off('gameRestart', handleGameRestart);
      eventHandlersSet.current = false;
    };
  }, [socket, refsReady, roomId, playerName, startGame, joinRoom, handleGameStateUpdate, handlePlayerDisconnect, handlePlayerGameOver, handleGameWin, handleGameRestart]);

  // Send game state updates
  useEffect(() => {
    if (!socket || !currentGameState) return;

    const interval = setInterval(() => {
      updateGameState(roomId, currentGameState);
    }, 100); // Update every 100ms

    return () => clearInterval(interval);
  }, [socket, roomId, currentGameState, updateGameState]);

  // 게임 나가기 처리
  const handleLeaveGame = useCallback(() => {
    if (socket) {
      socket.emit('leaveRoom', { roomId });
      navigate('/rooms');
    }
  }, [socket, roomId, navigate]);
  
  // 게임 계속하기 처리
  const handleContinue = useCallback(() => {
    if (socket) {
      socket.emit('restartGame', { roomId });
      navigate(`/waiting-room/${roomId}`); // 대기실로 이동
    }
  }, [socket, roomId, navigate]);

  // 동적 레이아웃 계산 함수 수정
const calculateOptimalLayout = useCallback((playerCount) => {
  if (playerCount === 0) return { cols: 0, rows: 0, boardWidth: 0, boardHeight: 0 };
  
  // 1명일 때는 특별 처리 (1:1 모드)
  if (playerCount === 1) {
    return {
      cols: 1,
      rows: 1,
      boardWidth: gameOver ? 300 : 300, // 1:1일 때는 큰 크기로
      boardHeight: gameOver ? 600 : 600
    };
  }
  
  // 기본 설정
  const availableWidth = gameOver ? 1200 : 700;
  const availableHeight = 600;
  const minBoardWidth = 80;
  const minBoardHeight = 160;
  const maxBoardWidth = gameOver ? 200 : 150;
  const maxBoardHeight = gameOver ? 400 : 300;
  const gap = 20;

  let bestLayout = { cols: 1, rows: playerCount, boardWidth: minBoardWidth, boardHeight: minBoardHeight };
  let bestScore = 0;

  // 2~5명일 때는 가로 배치 우선으로 강제
  const maxCols = playerCount <= 5 ? playerCount : 6; // 5명 이하면 모두 가로로
  
  // 가능한 모든 레이아웃 조합 시도
  for (let cols = 1; cols <= maxCols; cols++) {
    const rows = Math.ceil(playerCount / cols);
    
    // 2~5명일 때는 가로 배치를 강하게 선호
    let layoutPreference = 1;
    if (playerCount >= 2 && playerCount <= 5 && cols === playerCount) {
      layoutPreference = 10; // 가로 배치에 큰 가중치
    }
    
    // 계산된 보드 크기
    const boardWidth = Math.floor((availableWidth - gap * (cols - 1)) / cols);
    const boardHeight = Math.floor((availableHeight - gap * (rows - 1)) / rows);
    
    // 제약 조건 확인
    if (boardWidth >= minBoardWidth && boardHeight >= minBoardHeight &&
        boardWidth <= maxBoardWidth && boardHeight <= maxBoardHeight) {
      
      // 2:1 비율 유지 (테트리스 판 특성)
      const adjustedHeight = Math.min(boardHeight, boardWidth * 2);
      const adjustedWidth = Math.min(boardWidth, adjustedHeight / 2);
      
      // 점수 계산 (크기가 클수록, 비율이 2:1에 가까울수록 높은 점수)
      const sizeScore = adjustedWidth * adjustedHeight;
      const ratioScore = 1 - Math.abs((adjustedHeight / adjustedWidth) - 2) / 2;
      const totalScore = sizeScore * ratioScore * layoutPreference;
      
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestLayout = {
          cols,
          rows,
          boardWidth: Math.floor(adjustedWidth),
          boardHeight: Math.floor(adjustedHeight)
        };
      }
    }
  }

  return bestLayout;
}, [gameOver]);

// 동적 스타일과 클래스명 계산 부분도 수정
const { otherPlayersStyle, otherPlayersClassName, miniBoardStyle } = useMemo(() => {
  const playerCount = otherPlayers.length;
  const layout = calculateOptimalLayout(playerCount);
  
  // 기본 클래스명
  let className = 'other-players';
  
  // 상황별 클래스명 추가
  if (!gameOver) {
    if (playerCount === 1) {
      className += ' one-on-one';
    } else if (playerCount >= 2) {
      className += ' multi-alive';
    }
  } else {
    if (playerCount === 2) {
      className += ' full two-players';
    } else if (playerCount >= 3) {
      className += ' full multi-out';
    }
  }
  
  // 동적 레이아웃 클래스 추가
  className += ` dynamic-layout cols-${layout.cols}`;

  // 컨테이너 스타일
  const containerStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
    gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
    gap: '20px',
    padding: '20px',
    maxWidth: playerCount === 1 ? '350px' : (gameOver ? '1200px' : '700px'), // 1명일 때 최대 너비 조정
    maxHeight: '600px',
    alignContent: 'start',
    justifyContent: 'start',
    overflow: 'hidden'
  };

  // 미니 보드 스타일
  const boardStyle = playerCount > 0 ? {
    width: `${layout.boardWidth}px`,
    height: `${layout.boardHeight}px`,
    minWidth: `${layout.boardWidth}px`,
    minHeight: `${layout.boardHeight}px`
  } : {};

  return {
    otherPlayersStyle: containerStyle,
    otherPlayersClassName: className,
    miniBoardStyle: boardStyle
  };
}, [otherPlayers.length, gameOver, calculateOptimalLayout]);

// 1대1 특별 처리는 이제 calculateOptimalLayout에서 처리하므로 단순화
const miniBoard1v1Style = useMemo(() => {
  // 동적 계산된 스타일을 그대로 사용
  return miniBoardStyle;
}, [miniBoardStyle]);

  return (
    <div className="container">
      <div className="game-area">
        {!isGameWon ? (
          // 일반 게임 화면
          <>
            {!gameOver && (
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
            )}
            <div 
              className={otherPlayersClassName}
              style={otherPlayersStyle}
            >
              {otherPlayers.map((player) => (
                // 게임 오버된 플레이어는 표시하지 않음
                !player.gameState?.isGameOver && (
                  <MiniTetrisBoard
                    key={player.id}
                    gameState={player.gameState}
                    playerName={player.name}
                    style={!gameOver && otherPlayers.length === 1 ? miniBoard1v1Style : miniBoardStyle}
                  />
                )
              ))}
            </div>
          </>
        ) : (
          // 우승 화면
          <div className="win-screen">
            <h2 className="win-title">게임 종료!</h2>
            <p className="win-message">
              {winner?.id === socket?.id 
                ? '축하합니다! 당신이 우승했습니다!' 
                : `${winner?.name}님이 우승했습니다!`}
            </p>
            <div className="win-buttons">
              <button className="continue-button" onClick={handleContinue}>
                계속하기
              </button>
              <button className="leave-button" onClick={handleLeaveGame}>
                나가기
              </button>
            </div>
          </div>
        )}
      </div>
      {!isGameWon && (
        <button
          className="leave-button"
          onClick={handleLeaveGame}
        >
          게임 나가기
        </button>
      )}
    </div>
  );
};

export default TetrisPage;