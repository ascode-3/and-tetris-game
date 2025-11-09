import { useState, useEffect, useRef, useCallback } from 'react';
import soundManager from '../../../utils/SoundManager';
import { ROWS, COLS, BLOCK_SIZE, INITIAL_DROP_INTERVAL, LOCK_DELAY, MAX_LOCK_MOVES } from '../constants';
import { createPiece, generateBag, checkCollision, getGhostPosition, rotatePiece } from '../utils/tetrisPiece';
import { clearLines, mergePiece, drawBoard, drawPreviewPiece, drawNextPieces } from '../utils/tetrisBoard';
import { addLineClearEffects } from '../utils/effects';
import { getPlanetEffects, isEffectEnabled, getEffectConfig } from '../../../config/planetEffects';

// Constants
const KEYS = {
    LEFT: 37,    // Left arrow
    RIGHT: 39,   // Right arrow
    DOWN: 40,    // Down arrow
    UP: 38,      // Up arrow
    SPACE: 32,   // Spacebar
    SHIFT: 16    // Shift
};

export function useMiniTetris(planetId = 'earth') {
    // Planet effects
    const planetEffects = useRef(getPlanetEffects(planetId));
    
    // Game state
    const [linesCleared, setLinesCleared] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isGameStarted, setIsGameStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [gameCompleted, setGameCompleted] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isInvisible, setIsInvisible] = useState(false);
    const isInvisibleRef = useRef(false); // 👈 이 줄 추가
    const timerIntervalRef = useRef(null);
    const linesClearedRef = useRef(0);
    const TARGET_LINES = 25;
    
    // Planet effect timers
    const garbageLineTimerRef = useRef(null);
    const invisibleTimerRef = useRef(null);
    const invisibleDurationTimerRef = useRef(null);

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

    // 👇 DAS (키 꾹 누르기) 관련 ref 추가
    const pressedKeysRef = useRef(new Set());
    const keyTimersRef = useRef({});
    const DAS_DELAY = 140; // 처음 지연 시간 (밀리초)
    const DAS_INTERVAL = 40; // 반복 간격 (밀리초)

    // === Planet Effect Functions ===
    
  const addGarbageLine = useCallback(() => {
    if (!isGameStartedRef.current || isPausedRef.current || gameOver || gameCompleted) return;
    
    const config = getEffectConfig(planetEffects.current, 'garbageLines');
    if (!config) return;
    
    console.log('🔥 가비지 라인 추가 시작!');
    console.log('현재 블록 위치:', currentPieceRef.current?.pos);
    
    // 👇 블록이 너무 위에 있으면 라인 추가 스킵
    if (currentPieceRef.current && currentPieceRef.current.pos.y <= 0) {
        console.log('⚠️ 블록이 맨 위에 있어서 라인 추가 스킵');
        return; // 이번엔 추가 안 함
    }
    
    // 1. 블록을 위로 이동
    if (currentPieceRef.current) {
        currentPieceRef.current.pos.y -= 1;
        console.log('블록 이동 후 위치:', currentPieceRef.current.pos);
    }
    
    // 2. 그리드 업데이트
    const newGrid = [...gridRef.current];
    
    const garbageLine = Array(COLS).fill(8);
    const holes = [];
    while (holes.length < config.holesCount) {
        const hole = Math.floor(Math.random() * COLS);
        if (!holes.includes(hole)) {
            holes.push(hole);
            garbageLine[hole] = 0;
        }
    }
    
    newGrid.shift();
    newGrid.push(garbageLine);
    gridRef.current = newGrid;
    
    console.log('그리드 업데이트 완료');
    
    // 3. 이동 후 충돌 체크
    if (currentPieceRef.current && checkCollision(currentPieceRef.current, gridRef.current)) {
        console.log('❌ 충돌 감지 - 게임오버');
        setGameOver(true);
        setIsGameStarted(false);
        isGameStartedRef.current = false;
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }
    } else {
        console.log('✅ 충돌 없음 - 계속 진행');
    }
}, [gameOver, gameCompleted]);
    
    // 목성: 블록 투명화
    const startInvisibleEffect = useCallback(() => {
        if (!isGameStartedRef.current || isPausedRef.current) return;
        
        const config = getEffectConfig(planetEffects.current, 'invisibleBlocks');
        if (!config) return;
        
        console.log('목성 투명화 효과 시작!');
        setIsInvisible(true);
        isInvisibleRef.current = true; // 👈 ref도 직접 업데이트!
        
        // duration 후 다시 보이게
        invisibleDurationTimerRef.current = setTimeout(() => {
            console.log('목성 투명화 효과 종료!');
            setIsInvisible(false);
            isInvisibleRef.current = false; // 👈 ref도 직접 업데이트!
        }, config.duration);
    }, []);
    
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

    useEffect(() => {
        isInvisibleRef.current = isInvisible;
    }, [isInvisible]);

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

        // 천왕성: 좌우 반전
        let actualDir = dir;
        if (isEffectEnabled(planetEffects.current, 'reverseControls')) {
            actualDir = -dir;
        }

        currentPieceRef.current.pos.x += actualDir;
        if (checkCollision(currentPieceRef.current, gridRef.current)) {
            currentPieceRef.current.pos.x -= actualDir;
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
        // 토성: Hold 기능 비활성화
        if (isEffectEnabled(planetEffects.current, 'disableHold')) {
            return;
        }
        
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
        
        // 해왕성: 낙하 속도 3배
        let effectiveDropInterval = dropIntervalRef.current;
        const speedConfig = getEffectConfig(planetEffects.current, 'dropSpeedMultiplier');
        if (speedConfig) {
            effectiveDropInterval = dropIntervalRef.current / speedConfig.multiplier;
        }
        
        dropCounterRef.current += deltaTime;
        if (isLockingRef.current) {
            lockDelayTimerRef.current += deltaTime;
        }
        
        if (dropCounterRef.current > effectiveDropInterval) {
            drop();
        }
        
        if (gameBoardRef.current) {
            const ctx = gameBoardRef.current.getContext('2d');
            const ghostPiece = currentPieceRef.current ? getGhostPosition(currentPieceRef.current, gridRef.current) : null;

            // isInvisible을 drawBoard에 전달
             drawBoard(ctx, gridRef.current, currentPieceRef.current, ghostPiece, isInvisibleRef.current);
        }
        
        animationFrameIdRef.current = requestAnimationFrame(gameLoop);
    }, [gameOver, gameCompleted, drop]);

    // Handle keyboard input
const handleKeyDown = useCallback((event) => {
    if (gameOver || gameCompleted || !isGameStartedRef.current) return;
    
    // 일시정지 토글 (P 키 또는 ESC)
    if (event.keyCode === 80 || event.keyCode === 27) {
        togglePause();
        return;
    }

    if (isPausedRef.current) return;
    
    const key = event.keyCode;
    
    // 이미 눌려있는 키면 무시 (repeat 방지)
    if (pressedKeysRef.current.has(key)) return;
    
    pressedKeysRef.current.add(key);
    
    // 즉시 한 번 실행
    executeKeyAction(key);
    
    // 좌우 이동 키만 연속 입력 처리
    if (key === KEYS.LEFT || key === KEYS.RIGHT || key === KEYS.DOWN) {
        // 초기 딜레이 후 반복
        keyTimersRef.current[key] = setTimeout(() => {
            keyTimersRef.current[key] = setInterval(() => {
                if (pressedKeysRef.current.has(key)) {
                    executeKeyAction(key);
                }
            }, DAS_INTERVAL);
        }, DAS_DELAY);
    }
}, [gameOver, gameCompleted, togglePause]);

const handleKeyUp = useCallback((event) => {
    const key = event.keyCode;
    
    pressedKeysRef.current.delete(key);
    
    // 타이머 정리
    if (keyTimersRef.current[key]) {
        clearTimeout(keyTimersRef.current[key]);
        clearInterval(keyTimersRef.current[key]);
        delete keyTimersRef.current[key];
    }
}, []);

// 키 액션 실행 함수
const executeKeyAction = useCallback((key) => {
    if (isPausedRef.current) return;
    
    switch(key) {
        case KEYS.LEFT:
            movePiece(-1);
            break;
        case KEYS.RIGHT:
            movePiece(1);
            break;
        case KEYS.DOWN:
            // 화성: DOWN 키를 누르면 하드 드롭
            if (isEffectEnabled(planetEffects.current, 'downKeyHardDrop')) {
                hardDrop();
            } else {
                soundManager.play('move');
                drop();
            }
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
}, [movePiece, drop, rotate, hardDrop, holdPiece]);

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
        
        // === 행성 효과 타이머 시작 ===
        
        // 태양: 10초마다 가비지 라인 추가
        const garbageConfig = getEffectConfig(planetEffects.current, 'garbageLines');
        if (garbageConfig) {
            garbageLineTimerRef.current = setInterval(() => {
                if (!isPausedRef.current && isGameStartedRef.current) {
                    addGarbageLine();
                }
            }, garbageConfig.interval);
        }
        
        // 목성: 10초마다 2초 동안 투명화
        const invisibleConfig = getEffectConfig(planetEffects.current, 'invisibleBlocks');
        if (invisibleConfig) {
            invisibleTimerRef.current = setInterval(() => {
                if (!isPausedRef.current && isGameStartedRef.current) {
                    startInvisibleEffect();
                }
            }, invisibleConfig.interval);
        }
        
        return () => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
            if (garbageLineTimerRef.current) {
                clearInterval(garbageLineTimerRef.current);
            }
            if (invisibleTimerRef.current) {
                clearInterval(invisibleTimerRef.current);
            }
            if (invisibleDurationTimerRef.current) {
                clearTimeout(invisibleDurationTimerRef.current);
            }
        };
    }, [gameLoop, getNextPieceFromBag, spawnPiece, updatePreviewDisplays, addGarbageLine, startInvisibleEffect]);

    // Restart game
    const restartGame = useCallback(() => {
        // 기존 타이머 정리
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
        }
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }
        if (garbageLineTimerRef.current) {
            clearInterval(garbageLineTimerRef.current);
        }
        if (invisibleTimerRef.current) {
            clearInterval(invisibleTimerRef.current);
        }
        if (invisibleDurationTimerRef.current) {
            clearTimeout(invisibleDurationTimerRef.current);
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
    document.addEventListener('keydown', handleKeyDown);  // 👈 변경
    document.addEventListener('keyup', handleKeyUp);      // 👈 추가
    
    return () => {
        document.removeEventListener('keydown', handleKeyDown);  // 👈 변경
        document.removeEventListener('keyup', handleKeyUp);      // 👈 추가
        
        // 타이머 정리
        Object.values(keyTimersRef.current).forEach(timer => {
            clearTimeout(timer);
            clearInterval(timer);
        });
        
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
        }
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }
    };
}, [handleKeyDown, handleKeyUp]);  // 👈 의존성 변경


    // isInvisible 상태를 ref에 동기화
    useEffect(() => {
        isInvisibleRef.current = isInvisible;
        console.log('🔄 useEffect 실행! isInvisible:', isInvisible, 'ref:', isInvisibleRef.current);
    }, [isInvisible]);

    

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
            if (garbageLineTimerRef.current) {
                clearInterval(garbageLineTimerRef.current);
            }
            if (invisibleTimerRef.current) {
                clearInterval(invisibleTimerRef.current);
            }
            if (invisibleDurationTimerRef.current) {
                clearTimeout(invisibleDurationTimerRef.current);
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
        setNextCanvasRef,
        planetEffects: planetEffects.current,
        isInvisible
    };
}
