import { useState, useEffect, useRef, useCallback } from 'react';
import soundManager from '../../../utils/SoundManager';
import { ROWS, COLS, BLOCK_SIZE, INITIAL_DROP_INTERVAL, LOCK_DELAY, MAX_LOCK_MOVES, COLORS } from '../constants';
import { createPiece, generateBag, checkCollision, getGhostPosition, rotatePiece } from '../utils/tetrisPiece';
import { clearLines, mergePiece, drawBoard, drawPreviewPiece } from '../utils/tetrisBoard';
import { updateScoreDisplay, updateLevelDisplay, addLineClearEffects } from '../utils/effects';
import { useSocket } from '../../../hooks/useSocket';

// Constants
const KEYS = {
    LEFT: 37,    // Left arrow
    RIGHT: 39,   // Right arrow
    DOWN: 40,    // Down arrow
    UP: 38,      // Up arrow
    SPACE: 32,   // Spacebar
    SHIFT: 16    // Shift
};

export function useTetris() {
    // Socket 훅 사용
    const { sendGameOver, sendLineCleared, onReceiveGarbage } = useSocket();
    
    // Game state
    const [score, setScore] = useState(0);
    const scoreRef = useRef(score);
    
    // scoreRef를 score와 동기화
    useEffect(() => {
        scoreRef.current = score;
    }, [score]);
    
    const [level, setLevel] = useState(1);
    const [isGameStarted, setIsGameStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const roomIdRef = useRef(window.location.pathname.split('/').pop());
    const levelUpTimerRef = useRef(null); // 레벨업 타이머를 위한 ref 추가

    // Refs for game state
    const gridRef = useRef(Array.from({length: ROWS}, () => Array(COLS).fill(0)));
    const currentPieceRef = useRef(null);
    const holdPieceRef = useRef(null);
    const nextPieceRef = useRef(null);
    const nextNextPieceRef = useRef(null);
    const pieceBagRef = useRef([]);
    const canHoldRef = useRef(true);
    const dropCounterRef = useRef(0);
    const lastTimeRef = useRef(0);
    const lockDelayTimerRef = useRef(0);
    const isLockingRef = useRef(false);
    const moveCounterRef = useRef(0);
    const dropIntervalRef = useRef(INITIAL_DROP_INTERVAL);
    const animationFrameIdRef = useRef(null); // Added to track animation frame
    const isGameStartedRef = useRef(false); // 추가: 직접 참조할 ref로 isGameStarted 상태 추적

    // Canvas refs
    const gameBoardRef = useRef(null);
    const holdCanvasRef = useRef(null);
    const nextCanvasRef = useRef(null);
    const nextNextCanvasRef = useRef(null);

    // Set canvas refs
    const setGameBoardRef = useCallback((ref) => {
        gameBoardRef.current = ref;
    }, []);

    const setHoldCanvasRef = useCallback((ref) => {
        holdCanvasRef.current = ref;
    }, []);

    const setNextCanvasRef = useCallback((ref) => {
        nextCanvasRef.current = ref;
    }, []);

    const setNextNextCanvasRef = useCallback((ref) => {
        nextNextCanvasRef.current = ref;
    }, []);

    // 상태 변경을 감지하고 ref에 동기화
    useEffect(() => {
        isGameStartedRef.current = isGameStarted;
    }, [isGameStarted]);

    // === 현재 게임 상태를 즉시 반환하는 헬퍼 ===
    const getCurrentGameState = useCallback(() => ({
        grid: gridRef.current.map(row => [...row]),
        currentPiece: currentPieceRef.current,
        score: scoreRef.current,
        level,
        holdPiece: holdPieceRef.current,
        nextPiece: nextPieceRef.current,
        nextNextPiece: nextNextPieceRef.current,
        isGameOver: gameOver
    }), [level, gameOver]);

    // Update preview displays
    const updatePreviewDisplays = useCallback(() => {
        if (holdCanvasRef.current) {
            const ctx = holdCanvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, holdCanvasRef.current.width, holdCanvasRef.current.height);
            drawPreviewPiece(ctx, holdPieceRef.current);
        }
        if (nextCanvasRef.current) {
            const ctx = nextCanvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, nextCanvasRef.current.width, nextCanvasRef.current.height);
            drawPreviewPiece(ctx, nextPieceRef.current);
        }
        if (nextNextCanvasRef.current) {
            const ctx = nextNextCanvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, nextNextCanvasRef.current.width, nextNextCanvasRef.current.height);
            drawPreviewPiece(ctx, nextNextPieceRef.current);
        }
    }, []);

    // Get next piece from bag
    const getNextPieceFromBag = useCallback(() => {
        if (pieceBagRef.current.length === 0) {
            pieceBagRef.current = generateBag();
        }
        return createPiece(pieceBagRef.current.pop());
    }, []);

    // Spawn new piece
    const spawnPiece = useCallback(() => {
        // 기존 코드가 여기서 문제를 일으킬 수 있음
        // nextPieceRef.current가 준비되지 않은 상태에서 currentPieceRef.current에 할당될 수 있음
        if (!nextPieceRef.current) {
            // 초기 bag 설정이 안되어 있으면 설정
            if (pieceBagRef.current.length === 0) {
                pieceBagRef.current = generateBag();
            }
            nextPieceRef.current = getNextPieceFromBag();
        }
        
        if (!nextNextPieceRef.current) {
            nextNextPieceRef.current = getNextPieceFromBag();
        }
        
        currentPieceRef.current = nextPieceRef.current;
        nextPieceRef.current = nextNextPieceRef.current;
        nextNextPieceRef.current = getNextPieceFromBag();
        
        // 게임 오버 체크는 currentPiece가 할당된 후에 해야 함
        if (currentPieceRef.current && checkCollision(currentPieceRef.current, gridRef.current)) {
            setGameOver(true);
            // 게임 오버 이벤트를 서버에 전송 (scoreRef를 사용하여 최신 값 참조)
            const currentScore = scoreRef !== undefined ? scoreRef.current : 0;
            sendGameOver(roomIdRef.current, currentScore);
            return false;
        }
        
        updatePreviewDisplays();
        return true;
    }, [getNextPieceFromBag, updatePreviewDisplays, gameOver]);

    // Move piece
    const movePiece = useCallback((dir) => {
        if (!currentPieceRef.current || !isGameStartedRef.current) return false;

        currentPieceRef.current.pos.x += dir;
        if (checkCollision(currentPieceRef.current, gridRef.current)) {
            currentPieceRef.current.pos.x -= dir;
            return false;
        }
        if (isLockingRef.current) {
            moveCounterRef.current++;
        }
        // 좌우 이동 시 효과음 재생
        if (dir !== 0) {
            soundManager.play('move');
        }
        return true;
    }, []);

    // === 가비지 라인 추가 함수 ===
    const addGarbageLines = useCallback((count) => {
        if (count <= 0) return;
        for (let i = 0; i < count; i++) {
            // 맨 위 줄 삭제
            gridRef.current.shift();
            // 구멍 위치
            const hole = Math.floor(Math.random() * COLS);
            const greyIndex = COLORS.length; // garbage color index (value stored in grid)
            const newRow = Array.from({ length: COLS }, (_, idx) => (idx === hole ? 0 : greyIndex));
            gridRef.current.push(newRow);
        }
        // 피스가 겹치지 않도록 위치 보정
        if (currentPieceRef.current) {
            currentPieceRef.current.pos.y = Math.max(currentPieceRef.current.pos.y - count, 0);
        }
    }, []);

    // 서버로부터 가비지 수신 리스너 등록
    useEffect(() => {
        const off = onReceiveGarbage(({ lines }) => {
            addGarbageLines(lines);
        });
        return off;
    }, [onReceiveGarbage, addGarbageLines]);

    // Drop piece
    const drop = useCallback(() => {
        if (!currentPieceRef.current || !isGameStartedRef.current) return false;

        currentPieceRef.current.pos.y++;
        if (checkCollision(currentPieceRef.current, gridRef.current)) {
            currentPieceRef.current.pos.y--;
            
            if (!isLockingRef.current) {
                isLockingRef.current = true;
                lockDelayTimerRef.current = 0;
                moveCounterRef.current = 0;
            }
            
            if (lockDelayTimerRef.current >= LOCK_DELAY || moveCounterRef.current >= MAX_LOCK_MOVES) {
                gridRef.current = mergePiece(gridRef.current, currentPieceRef.current);
                const { newGrid, linesCleared, linesToClear } = clearLines(gridRef.current);
                gridRef.current = newGrid;
                
                if (linesCleared > 0) {
                    sendLineCleared(roomIdRef.current, linesCleared);
                    addLineClearEffects(linesToClear);
                    setScore(prev => {
                        const newScore = prev + linesCleared * linesCleared * 100;
                        updateScoreDisplay(newScore);
                        return newScore;
                    });
                }
                
                spawnPiece();
                canHoldRef.current = true;
                isLockingRef.current = false;
                moveCounterRef.current = 0;
            }
        } else {
            isLockingRef.current = false;
            lockDelayTimerRef.current = 0;
            moveCounterRef.current = 0;
        }
        dropCounterRef.current = 0;
        return true;
    }, [spawnPiece]);

    // Hard drop
    const hardDrop = useCallback(() => {
        if (!currentPieceRef.current || !isGameStartedRef.current) return;

        while (!checkCollision(currentPieceRef.current, gridRef.current)) {
            currentPieceRef.current.pos.y++;
        }
        currentPieceRef.current.pos.y--;
        
        // 착지 효과음 재생
        soundManager.play('land');
        
        // 바로 그리드에 병합하고 새 피스 생성
        gridRef.current = mergePiece(gridRef.current, currentPieceRef.current);
        const { newGrid, linesCleared, linesToClear } = clearLines(gridRef.current);
        gridRef.current = newGrid;
        
        if (linesCleared > 0) {
            sendLineCleared(roomIdRef.current, linesCleared);
                    addLineClearEffects(linesToClear);
            setScore(prev => {
                const newScore = prev + linesCleared * linesCleared * 100;
                updateScoreDisplay(newScore);
                return newScore;
            });
        }
        
        spawnPiece();
        canHoldRef.current = true;
        isLockingRef.current = false;
        moveCounterRef.current = 0;
        lockDelayTimerRef.current = 0;
    }, [spawnPiece]);

    // Hold piece
    const holdPiece = useCallback(() => {
        if (!canHoldRef.current || !currentPieceRef.current || !isGameStartedRef.current) return;
        
        if (!holdPieceRef.current) {
            holdPieceRef.current = {
                shape: currentPieceRef.current.shape,
                color: currentPieceRef.current.color,
                type: currentPieceRef.current.type,
                orientation: 0
            };
            spawnPiece();
        } else {
            const temp = {
                shape: currentPieceRef.current.shape,
                color: currentPieceRef.current.color,
                type: currentPieceRef.current.type,
                orientation: 0
            };
            currentPieceRef.current = {
                pos: {x: Math.floor(COLS/2) - Math.floor(holdPieceRef.current.shape[0].length/2), y: 0},
                shape: holdPieceRef.current.shape,
                color: holdPieceRef.current.color,
                type: holdPieceRef.current.type,
                orientation: 0
            };
            holdPieceRef.current = temp;
        }
        
        canHoldRef.current = false;
        updatePreviewDisplays();
    }, [spawnPiece, updatePreviewDisplays]);

    // Rotate piece
    const rotate = useCallback(() => {
        if (!currentPieceRef.current || !isGameStartedRef.current) return;

        const rotatedPiece = rotatePiece(currentPieceRef.current, gridRef.current);
        if (rotatedPiece) {
            currentPieceRef.current = rotatedPiece;
            if (isLockingRef.current) {
                moveCounterRef.current++;
            }
        }
    }, []);

    // Game loop
    const gameLoop = useCallback((time = 0) => {
        if (!isGameStartedRef.current || gameOver) {
            animationFrameIdRef.current = requestAnimationFrame(gameLoop);
            return;
        }
        
        const deltaTime = time - lastTimeRef.current;
        lastTimeRef.current = time;
        
        dropCounterRef.current += deltaTime;
        if (isLockingRef.current) {
            lockDelayTimerRef.current += deltaTime;
        }
        
        if (dropCounterRef.current > dropIntervalRef.current) {
            drop();
        }
        
        if (gameBoardRef.current) {
            const ctx = gameBoardRef.current.getContext('2d');
            const ghostPiece = currentPieceRef.current ? getGhostPosition(currentPieceRef.current, gridRef.current) : null;
            drawBoard(ctx, gridRef.current, currentPieceRef.current, ghostPiece);
        }
        
        if (!gameOver) {
            animationFrameIdRef.current = requestAnimationFrame(gameLoop);
        }
    }, [gameOver, drop]);

    // Handle keyboard input
    const handleKeyPress = useCallback((event) => {
        if (gameOver || !isGameStartedRef.current) return;
        
        switch(event.keyCode) {
            case KEYS.LEFT:
                movePiece(-1);
                break;
            case KEYS.RIGHT:
                movePiece(1);
                break;
            case KEYS.DOWN:
                soundManager.play('move'); // 소프트 드롭 시 효과음 재생
                drop();
                break;
            case KEYS.UP:
                rotate();
                break;
            case KEYS.SPACE:
                hardDrop();
                break;
            case KEYS.SHIFT:
                holdPiece();
                break;
            default:
                break;
        }
    }, [gameOver, movePiece, drop, rotate, hardDrop, holdPiece]);

    // Start game
    const startGame = useCallback(() => {
        console.log("Starting game...");
        if (isGameStartedRef.current) {
            console.log("Game already started, returning");
            return;
        }

        // 캔버스 확인
        if (!gameBoardRef.current || !holdCanvasRef.current || 
            !nextCanvasRef.current || !nextNextCanvasRef.current) {
            console.error("Canvas references not set properly");
            return;
        }

        // Reset game state
        setGameOver(false);
        setIsGameStarted(true);
        isGameStartedRef.current = true;
        setScore(0);
        setLevel(1);
        
        // Reset refs
        dropIntervalRef.current = INITIAL_DROP_INTERVAL;
        dropCounterRef.current = 0;
        lastTimeRef.current = 0;
        lockDelayTimerRef.current = 0;
        isLockingRef.current = false;
        moveCounterRef.current = 0;
        canHoldRef.current = true;
        
        // Initialize grid and pieces
        gridRef.current = Array.from({length: ROWS}, () => Array(COLS).fill(0));
        holdPieceRef.current = null;
        pieceBagRef.current = generateBag();
        
        // Generate initial pieces
        nextPieceRef.current = getNextPieceFromBag();
        nextNextPieceRef.current = getNextPieceFromBag();
        
        const spawnSuccess = spawnPiece();
        
        if (!spawnSuccess) {
            console.error("Failed to spawn initial piece");
            setIsGameStarted(false);
            isGameStartedRef.current = false;
            return;
        }
        
        // 미리 캔버스 초기화
        if (gameBoardRef.current) {
            const ctx = gameBoardRef.current.getContext('2d');
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, gameBoardRef.current.width, gameBoardRef.current.height);
            drawBoard(ctx, gridRef.current, currentPieceRef.current, null);
        }
        
        // Update displays
        updatePreviewDisplays();
        updateScoreDisplay(0);
        updateLevelDisplay(1);
        
        console.log("Starting game loop...");
        // Start game loop
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
        }
        animationFrameIdRef.current = requestAnimationFrame(gameLoop);
        
        // 10초마다 레벨업 타이머 설정
        if (levelUpTimerRef.current) {
            clearInterval(levelUpTimerRef.current);
        }
        
        levelUpTimerRef.current = setInterval(() => {
            setLevel(prevLevel => {
                const newLevel = prevLevel + 1;
                // 레벨이 올라갈수록 블록이 더 빨리 떨어지도록 조정 (예: 레벨당 50ms씩 감소, 최소 50ms)
                dropIntervalRef.current = Math.max(150, INITIAL_DROP_INTERVAL - (newLevel * 50));
                updateLevelDisplay(newLevel);
                return newLevel;
            });
        }, 5000); // 5초(5000ms)마다 실행
        
        return () => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
            if (levelUpTimerRef.current) {
                clearInterval(levelUpTimerRef.current);
            }
        };
    }, [gameLoop, getNextPieceFromBag, spawnPiece, updatePreviewDisplays, sendGameOver]);

    // Initialize game
    useEffect(() => {
        if (!gameBoardRef.current || !holdCanvasRef.current || 
            !nextCanvasRef.current || !nextNextCanvasRef.current) return;

        const gameBoard = gameBoardRef.current;
        const holdCanvas = holdCanvasRef.current;
        const nextCanvas = nextCanvasRef.current;
        const nextNextCanvas = nextNextCanvasRef.current;
        
        // Set canvas sizes
        gameBoard.width = COLS * BLOCK_SIZE;
        gameBoard.height = ROWS * BLOCK_SIZE;
        holdCanvas.width = holdCanvas.height = 4 * BLOCK_SIZE;
        nextCanvas.width = nextCanvas.height = 4 * BLOCK_SIZE;
        nextNextCanvas.width = nextNextCanvas.height = 4 * BLOCK_SIZE;
        
        // 초기 캔버스 배경 설정
        const gameCtx = gameBoard.getContext('2d');
        gameCtx.fillStyle = '#000';
        gameCtx.fillRect(0, 0, gameBoard.width, gameBoard.height);
        
        const holdCtx = holdCanvas.getContext('2d');
        holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
        
        const nextCtx = nextCanvas.getContext('2d');
        nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        
        const nextNextCtx = nextNextCanvas.getContext('2d');
        nextNextCtx.clearRect(0, 0, nextNextCanvas.width, nextNextCanvas.height);
        
        // Add keyboard event listener
        document.addEventListener('keydown', handleKeyPress);
        
        return () => {
            document.removeEventListener('keydown', handleKeyPress);
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
            if (levelUpTimerRef.current) {
                clearInterval(levelUpTimerRef.current);
            }
        };
    }, [handleKeyPress]);

    // Set up keyboard event listeners
    useEffect(() => {
        window.addEventListener('keydown', handleKeyPress);
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [handleKeyPress]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
            if (levelUpTimerRef.current) {
                clearInterval(levelUpTimerRef.current);
            }
        };
    }, []);

    return {
        score,
        level,
        isGameStarted,
        gameOver,
        gameBoardRef,
        holdCanvasRef,
        nextCanvasRef,
        nextNextCanvasRef,
        startGame,
        setGameBoardRef,
        setHoldCanvasRef,
        setNextCanvasRef,
        setNextNextCanvasRef,
        getCurrentGameState,
        currentGameState: {
            grid: gridRef.current.map(row => [...row]),
            currentPiece: currentPieceRef.current,
            score,
            level,
            holdPiece: holdPieceRef.current,
            nextPiece: nextPieceRef.current,
            nextNextPiece: nextNextPieceRef.current,
            isGameOver: gameOver
        }
    };
}