import { useState, useEffect, useRef, useCallback } from 'react';
import { ROWS, COLS, INITIAL_DROP_INTERVAL, LOCK_DELAY, MAX_LOCK_MOVES, KEYS } from '../constants';
import { createPiece, generateBag, checkCollision, getGhostPosition, rotatePiece } from '../utils/tetrisPiece';
import { clearLines, mergePiece, drawBoard, drawPreviewPiece } from '../utils/tetrisBoard';
import { updateScoreDisplay, updateLevelDisplay, addLineClearEffects, togglePauseOverlay } from '../utils/effects';

export function useTetris() {
    // Game state
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [isGameStarted, setIsGameStarted] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [gameOver, setGameOver] = useState(false);

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

    // Update preview displays
    const updatePreviewDisplays = useCallback(() => {
        if (holdCanvasRef.current) {
            drawPreviewPiece(holdCanvasRef.current.getContext('2d'), holdPieceRef.current);
        }
        if (nextCanvasRef.current) {
            drawPreviewPiece(nextCanvasRef.current.getContext('2d'), nextPieceRef.current);
        }
        if (nextNextCanvasRef.current) {
            drawPreviewPiece(nextNextCanvasRef.current.getContext('2d'), nextNextPieceRef.current);
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
        currentPieceRef.current = nextPieceRef.current;
        nextPieceRef.current = nextNextPieceRef.current;
        nextNextPieceRef.current = getNextPieceFromBag();
        
        if (checkCollision(currentPieceRef.current, gridRef.current)) {
            setGameOver(true);
        }
        
        updatePreviewDisplays();
    }, [getNextPieceFromBag, updatePreviewDisplays]);

    // Move piece
    const movePiece = useCallback((dir) => {
        if (!currentPieceRef.current) return;

        currentPieceRef.current.pos.x += dir;
        if (checkCollision(currentPieceRef.current, gridRef.current)) {
            currentPieceRef.current.pos.x -= dir;
            return false;
        }
        if (isLockingRef.current) {
            moveCounterRef.current++;
        }
        return true;
    }, []);

    // Drop piece
    const drop = useCallback(() => {
        if (!currentPieceRef.current) return;

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
    }, [spawnPiece]);

    // Hard drop
    const hardDrop = useCallback(() => {
        if (!currentPieceRef.current) return;

        while (!checkCollision(currentPieceRef.current, gridRef.current)) {
            currentPieceRef.current.pos.y++;
        }
        currentPieceRef.current.pos.y--;
        drop();
    }, [drop]);

    // Hold piece
    const holdPiece = useCallback(() => {
        if (!canHoldRef.current || !currentPieceRef.current) return;
        
        if (!holdPieceRef.current) {
            holdPieceRef.current = {
                shape: currentPieceRef.current.shape,
                color: currentPieceRef.current.color
            };
            spawnPiece();
        } else {
            const temp = {
                shape: currentPieceRef.current.shape,
                color: currentPieceRef.current.color
            };
            currentPieceRef.current = {
                pos: {x: Math.floor(COLS/2) - Math.floor(holdPieceRef.current.shape[0].length/2), y: 0},
                shape: holdPieceRef.current.shape,
                color: holdPieceRef.current.color
            };
            holdPieceRef.current = temp;
        }
        
        canHoldRef.current = false;
        updatePreviewDisplays();
    }, [spawnPiece, updatePreviewDisplays]);

    // Rotate piece
    const rotate = useCallback(() => {
        if (!currentPieceRef.current) return;

        const rotated = rotatePiece(currentPieceRef.current);
        const originalShape = currentPieceRef.current.shape;
        currentPieceRef.current.shape = rotated;
        
        if (checkCollision(currentPieceRef.current, gridRef.current)) {
            currentPieceRef.current.shape = originalShape;
        } else if (isLockingRef.current) {
            moveCounterRef.current++;
        }
    }, []);

    // Game loop
    const gameLoop = useCallback((time = 0) => {
        if (!isGameStarted || isPaused || gameOver) return;
        
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
            requestAnimationFrame(gameLoop);
        }
    }, [isGameStarted, isPaused, gameOver, drop]);

    // Handle keyboard input
    const handleKeyPress = useCallback((event) => {
        if (event.keyCode === KEYS.Q) {
            if (!isGameStarted || gameOver) return;
            setIsPaused(prev => {
                togglePauseOverlay(!prev);
                return !prev;
            });
            return;
        }
        
        if (gameOver || !isGameStarted || isPaused) return;
        
        switch(event.keyCode) {
            case KEYS.LEFT:
                movePiece(-1);
                break;
            case KEYS.RIGHT:
                movePiece(1);
                break;
            case KEYS.DOWN:
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
    }, [isGameStarted, isPaused, gameOver, movePiece, drop, rotate, hardDrop, holdPiece]);

    // Start game
    const startGame = useCallback(() => {
        if (isGameStarted) return;

        // Reset game state
        setGameOver(false);
        setIsGameStarted(true);
        setIsPaused(false);
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
        spawnPiece();
        
        // Update displays
        updateScoreDisplay(0);
        updateLevelDisplay(1);
        togglePauseOverlay(false);
        
        // Start game loop
        const animationId = requestAnimationFrame(gameLoop);
        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [isGameStarted, gameLoop, getNextPieceFromBag, spawnPiece]);

    // Initialize game
    useEffect(() => {
        if (!gameBoardRef.current || !holdCanvasRef.current || !nextCanvasRef.current || !nextNextCanvasRef.current) return;

        const gameBoard = gameBoardRef.current;
        const holdCanvas = holdCanvasRef.current;
        const nextCanvas = nextCanvasRef.current;
        const nextNextCanvas = nextNextCanvasRef.current;
        
        // Set canvas sizes
        gameBoard.width = COLS * 30;
        gameBoard.height = ROWS * 30;
        holdCanvas.width = holdCanvas.height = 4 * 30;
        nextCanvas.width = nextCanvas.height = 4 * 30;
        nextNextCanvas.width = nextNextCanvas.height = 4 * 30;
        
        // Add keyboard event listener
        document.addEventListener('keydown', handleKeyPress);
        
        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [handleKeyPress]);

    return {
        score,
        level,
        isGameStarted,
        isPaused,
        gameOver,
        gameBoardRef,
        holdCanvasRef,
        nextCanvasRef,
        nextNextCanvasRef,
        startGame,
        setGameBoardRef,
        setHoldCanvasRef,
        setNextCanvasRef,
        setNextNextCanvasRef
    };
} 