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
          // Player found: Update their game state while preserving order
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

  const handleLeaveGame = () => {
    navigate('/rooms');
  };

  // 동적 레이아웃 계산 함수
  const calculateOptimalLayout = useCallback((playerCount) => {
    if (playerCount === 0) return { cols: 0, rows: 0, boardWidth: 0, boardHeight: 0 };
    
    // 기본 설정
    const availableWidth = gameOver ? 1200 : 700; // 본인이 아웃되면 더 큰 공간 사용
    const availableHeight = 600;
    const minBoardWidth = 80;
    const minBoardHeight = 160;
    const maxBoardWidth = gameOver ? 200 : 150;
    const maxBoardHeight = gameOver ? 400 : 300;
    const gap = 20;

    let bestLayout = { cols: 1, rows: playerCount, boardWidth: minBoardWidth, boardHeight: minBoardHeight };
    let bestScore = 0;

    // 가능한 모든 레이아웃 조합 시도
    for (let cols = 1; cols <= Math.min(playerCount, 6); cols++) {
      const rows = Math.ceil(playerCount / cols);
      
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
        const totalScore = sizeScore * ratioScore;
        
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

  // 동적 스타일과 클래스명 계산
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
      maxWidth: gameOver ? '1200px' : '700px',
      maxHeight: '600px',
      alignContent: 'start',
      justifyContent: 'start',
      overflow: 'hidden' // 스크롤 방지
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

  // 1대1 특별 처리 (기존 로직 유지)
  const miniBoard1v1Style = useMemo(() => {
    if (!gameOver && otherPlayers.length === 1) {
      return { width: '300px', height: '600px' };
    }
    return miniBoardStyle; // 동적 계산된 스타일 사용
  }, [gameOver, otherPlayers.length, miniBoardStyle]);

  return (
    <div className="container">
      <div className="game-area">
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
            <MiniTetrisBoard
              key={player.id}
              gameState={player.gameState}
              playerName={player.name}
              style={!gameOver && otherPlayers.length === 1 ? miniBoard1v1Style : miniBoardStyle}
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