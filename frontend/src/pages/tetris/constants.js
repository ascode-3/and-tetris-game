// Board dimensions
export const COLS = 10;
export const ROWS = 20;
export const BLOCK_SIZE = 30;

// Colors for pieces
export const COLORS = [
    'cyan', 'blue', 'orange', 'yellow', 'green', 'purple', 'red'
];

// Visual settings
export const GHOST_PIECE_OPACITY = 0.3;

// Game mechanics
export const LOCK_DELAY = 500;
export const MAX_LOCK_MOVES = 15;
export const INITIAL_DROP_INTERVAL = 1000;

// Tetromino shapes
export const SHAPES = [
    [[1, 1, 1, 1]],                    // I
    [[1, 1, 1], [0, 1, 0]],           // T
    [[1, 1, 1], [1, 0, 0]],           // L
    [[1, 1, 1], [0, 0, 1]],           // J
    [[1, 1], [1, 1]],                 // O
    [[1, 1, 0], [0, 1, 1]],           // S
    [[0, 1, 1], [1, 1, 0]]            // Z
];

// Key codes
export const KEYS = {
    LEFT: 37,
    RIGHT: 39,
    DOWN: 40,
    UP: 38,
    SPACE: 32,
    SHIFT: 16,
    Q: 81
}; 