import { useState, useEffect, useRef, useCallback } from 'react';
import soundManager from '../../../utils/SoundManager';
import { ROWS, COLS, BLOCK_SIZE, INITIAL_DROP_INTERVAL, LOCK_DELAY, MAX_LOCK_MOVES } from '../constants';
import { createPiece, generateBag, checkCollision, getGhostPosition, rotatePiece } from '../utils/tetrisPiece';
import { clearLines, mergePiece, drawBoard, drawPreviewPiece, drawNextPieces } from '../utils/tetrisBoard';
import { addLineClearEffects } from '../utils/effects';

// Constants
const KEYS = {
    LEFT: 37,    // Left arrow
    RIGHT: 39,   // Right arrow
    DOWN: 40,    // Down arrow
    UP: 38,      // Up arrow
    SPACE: 32,   // Spacebar
    SHIFT: 16    // Shift
};

export function useMiniTetris() {
    // Game state
    const [linesCleared, setLinesCleared] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isGameStarted, setIsGameStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [gameCompleted, setGameCompleted] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const timerIntervalRef = useRef(null);
    const linesClearedRef = useRef(0);
    const TARGET_LINES = 25;

    // Refs for game state
    const gridRef = useRef(Array.from({length: ROWS}, () => Array(COLS).fill(0)));
    const currentPieceRef = useRef(null);
    const holdPieceRef = useRef(null);
    const pieceBagRef = useRef([]);
    const canHoldRef = useRef(true);
    const dropCounterRef = useRef(0);
    const lastTimeRef = useRef(0);
    const lockDelayTimerRef = useRef(0);
    const isLockingRef = useRef(false);
    const moveCounterRef = useRef(0);
    const dropIntervalRef = useRef(INITIAL_DROP_INTERVAL);
    const animationFrameIdRef = useRef(null);
    const isGameStartedRef = useRef(false);
    const isPausedRef = useRef(false);

    // Canvas refs
    const gameBoardRef = useRef(null);
    const holdCanvasRef = useRef(null);
    const nextCanvasRef = useRef(null);
    
    // Next pieces (4개)
    const nextPieces = useRef([]);

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

    // 상태 변경을 감지하고 ref에 동기화
    useEffect(() => {
        isGameStartedRef.current = isGameStarted;
    }, [isGameStarted]);

    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    // Update preview displays
    const updatePreviewDisplays = useCallback(() => {
        if (holdCanvasRef.current) {
            const ctx = holdCanvasRef.current.getContext('2d');
            drawPreviewPiece(ctx, holdPieceRef.current);
        }
        if (nextCanvasRef.current) {
            const ctx = nextCanvasRef.current.getContext('2d');
            drawNextPieces(ctx, nextPieces.current);
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
        // 초기화: nextPieces가 비어있으면 4개 채우기
        if (nextPieces.current.length === 0) {
            for (let i = 0; i < 4; i++) {
                nextPieces.current.push(getNextPieceFromBag());
            }
        }
        
        // 첫 번째 Next를 current로 이동
        currentPieceRef.current = nextPieces.current.shift();
        // 새 블록 추가
        nextPieces.current.push(getNextPieceFromBag());
        
        // 게임 오버 체크
        if (currentPieceRef.current && checkCollision(currentPieceRef.current, gridRef.current)) {
            setGameOver(true);
            setIsGameStarted(false);
            isGameStartedRef.current = false;
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
            return false;
        }
        
        updatePreviewDisplays();
        return true;
    }, [getNextPieceFromBag, updatePreviewDisplays]);

    // Move piece
    const movePiece = useCallback((dir) => {
        if (!currentPieceRef.current || !isGameStartedRef.current || isPausedRef.current) return false;

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

    // Drop piece
    const drop = useCallback(() => {
        if (!currentPieceRef.current || !isGameStartedRef.current || isPausedRef.current) return false;

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
                const { newGrid, linesCleared: clearedCount, linesToClear } = clearLines(gridRef.current);
                gridRef.current = newGrid;
                
                if (clearedCount > 0) {
                    addLineClearEffects(linesToClear);
                    const newTotal = linesClearedRef.current + clearedCount;
                    linesClearedRef.current = newTotal;
                    setLinesCleared(newTotal);
                    
                    // 25줄 달성 체크
                    if (newTotal >= TARGET_LINES) {
                        setGameCompleted(true);
                        setIsGameStarted(false);
                        isGameStartedRef.current = false;
                        if (timerIntervalRef.current) {
                            clearInterval(timerIntervalRef.current);
                        }
                        return false;
                    }
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
        if (!currentPieceRef.current || !isGameStartedRef.current || isPausedRef.current) return;

        while (!checkCollision(currentPieceRef.current, gridRef.current)) {
            currentPieceRef.current.pos.y++;
        }
        currentPieceRef.current.pos.y--;
        
        // 착지 효과음 재생
        soundManager.play('land');
        
        // 바로 그리드에 병합하고 새 피스 생성
        gridRef.current = mergePiece(gridRef.current, currentPieceRef.current);
        const { newGrid, linesCleared: clearedCount, linesToClear } = clearLines(gridRef.current);
        gridRef.current = newGrid;
        
        if (clearedCount > 0) {
            addLineClearEffects(linesToClear);
            const newTotal = linesClearedRef.current + clearedCount;
            linesClearedRef.current = newTotal;
            setLinesCleared(newTotal);
            
            // 25줄 달성 체크
            if (newTotal >= TARGET_LINES) {
                setGameCompleted(true);
                setIsGameStarted(false);
                isGameStartedRef.current = false;
                if (timerIntervalRef.current) {
                    clearInterval(timerIntervalRef.current);
                }
                return;
            }
        }
        
        spawnPiece();
        canHoldRef.current = true;
        isLockingRef.current = false;
        moveCounterRef.current = 0;
        lockDelayTimerRef.current = 0;
    }, [spawnPiece]);

    // Hold piece
    const holdPiece = useCallback(() => {
        if (!canHoldRef.current || !currentPieceRef.current || !isGameStartedRef.current || isPausedRef.current) return;
        
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
        if (!currentPieceRef.current || !isGameStartedRef.current || isPausedRef.current) return;

        const rotatedPiece = rotatePiece(currentPieceRef.current, gridRef.current);
        if (rotatedPiece) {
            currentPieceRef.current = rotatedPiece;
            if (isLockingRef.current) {
                moveCounterRef.current++;
            }
        }
    }, []);

    // Toggle pause
    const togglePause = useCallback(() => {
        if (!gameOver && isGameStartedRef.current) {
            setIsPaused(prev => !prev);
        }
    }, [gameOver]);

    // Game loop
    const gameLoop = useCallback((time = 0) => {
        if (!isGameStartedRef.current || gameOver || gameCompleted || isPausedRef.current) {
            if (!gameOver && !gameCompleted && isGameStartedRef.current) {
                animationFrameIdRef.current = requestAnimationFrame(gameLoop);
            }
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
        
        animationFrameIdRef.current = requestAnimationFrame(gameLoop);
    }, [gameOver, gameCompleted, drop]);

    // Handle keyboard input
    const handleKeyPress = useCallback((event) => {
        if (gameOver || gameCompleted || !isGameStartedRef.current) return;
        
        // 일시정지 토글 (P 키 또는 ESC)
        if (event.keyCode === 80 || event.keyCode === 27) { // P or ESC
            togglePause();
            return;
        }

        if (isPausedRef.current) return;
        
        switch(event.keyCode) {
            case KEYS.LEFT:
                movePiece(-1);
                break;
            case KEYS.RIGHT:
                movePiece(1);
                break;
            case KEYS.DOWN:
                soundManager.play('move');
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
    }, [gameOver, gameCompleted, movePiece, drop, rotate, hardDrop, holdPiece, togglePause]);

    // Start game
    const startGame = useCallback(() => {
        console.log("Starting mini tetris game...");
        if (isGameStartedRef.current) {
            console.log("Game already started, returning");
            return;
        }

        // 캠버스 확인
        if (!gameBoardRef.current || !holdCanvasRef.current || 
            !nextCanvasRef.current) {
            console.error("Canvas references not set properly");
            return;
        }

        // Reset game state
        setGameOver(false);
        setGameCompleted(false);
        setIsGameStarted(true);
        setIsPaused(false);
        isGameStartedRef.current = true;
        isPausedRef.current = false;
        setLinesCleared(0);
        linesClearedRef.current = 0;
        setElapsedTime(0);
        
        // Reset refs
        dropIntervalRef.current = INITIAL_DROP_INTERVAL;
        dropCounterRef.current = 0;
        lastTimeRef.current = 0;
        lockDelayTimerRef.current = 0;
        isLockingRef.current = false;
        nextPieces.current = [];
        moveCounterRef.current = 0;
        canHoldRef.current = true;
        
        // Initialize grid and pieces
        gridRef.current = Array.from({length: ROWS}, () => Array(COLS).fill(0));
        holdPieceRef.current = null;
        pieceBagRef.current = generateBag();
        
        // Generate initial pieces (spawnPiece가 4개 채움)
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
        
        console.log("Starting game loop...");
        // Start game loop
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
        }
        animationFrameIdRef.current = requestAnimationFrame(gameLoop);
        
        // 타이머 시작 (1초마다 증가)
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }
        
        timerIntervalRef.current = setInterval(() => {
            if (!isPausedRef.current && isGameStartedRef.current) {
                setElapsedTime(prev => prev + 1);
            }
        }, 1000);
        
        return () => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, [gameLoop, getNextPieceFromBag, spawnPiece, updatePreviewDisplays]);

    // Restart game
    const restartGame = useCallback(() => {
        // 기존 타이머 정리
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
        }
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }
        
        // 상태 초기화
        setIsGameStarted(false);
        isGameStartedRef.current = false;
        setGameOver(false);
        setGameCompleted(false);
        setIsPaused(false);
        isPausedRef.current = false;
        
        // 잠시 후 게임 시작
        setTimeout(() => {
            startGame();
        }, 100);
    }, [startGame]);

    // Initialize game
    useEffect(() => {
        if (!gameBoardRef.current || !holdCanvasRef.current || 
            !nextCanvasRef.current) return;

        const gameBoard = gameBoardRef.current;
        const holdCanvas = holdCanvasRef.current;
        const nextCanvas = nextCanvasRef.current;
        
        // Set canvas sizes
        gameBoard.width = COLS * BLOCK_SIZE;
        gameBoard.height = ROWS * BLOCK_SIZE;
        holdCanvas.width = holdCanvas.height = 4 * BLOCK_SIZE;
        // Next canvas는 4개 블록을 세로로 표시 (각 블록당 3 * BLOCK_SIZE 높이)
        nextCanvas.width = 4 * BLOCK_SIZE;
        nextCanvas.height = 12 * BLOCK_SIZE;
        
        // 초기 캔버스 배경 설정
        const gameCtx = gameBoard.getContext('2d');
        gameCtx.fillStyle = '#000';
        gameCtx.fillRect(0, 0, gameBoard.width, gameBoard.height);
        
        const holdCtx = holdCanvas.getContext('2d');
        holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
        
        const nextCtx = nextCanvas.getContext('2d');
        nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        
        // Add keyboard event listener
        document.addEventListener('keydown', handleKeyPress);
        
        return () => {
            document.removeEventListener('keydown', handleKeyPress);
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, [handleKeyPress]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, []);

    return {
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
        setNextCanvasRef
    };
}
