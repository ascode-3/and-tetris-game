// Board dimensions
export const COLS = 10;
export const ROWS = 20;
export const BLOCK_SIZE = 24;

// Colors for pieces
export const COLORS = [
    '#5FC9BD', // I piece – deep teal
    '#5A5AC9', // J piece – royal blue
    '#C47A3A', // L piece – burnt orange
    '#D9B73A', // O piece – goldenrod
    '#7FBF5E', // S piece – forest green
    '#B55EB5', // T piece – deep lavender
    '#C75A5A', // Z piece – brick red
    '#555555'  // garbage grey
];

// Visual settings
export const GHOST_PIECE_OPACITY = 0.3;

// Game mechanics
export const LOCK_DELAY = 250;
export const MAX_LOCK_MOVES = 15;
export const INITIAL_DROP_INTERVAL = 500;

// Tetromino shapes
export const SHAPES = [
    // I
    [
        [0,0,0,0],
        [1,1,1,1],
        [0,0,0,0],
        [0,0,0,0]
    ],
    // T
    [
        [0,0,0,0],
        [1,1,1,0],
        [0,1,0,0],
        [0,0,0,0]
    ],
    // L
    [
        [0,0,1,0],
        [1,1,1,0],
        [0,0,0,0],
        [0,0,0,0]
    ],
    // J
    [
        [1,0,0,0],
        [1,1,1,0],
        [0,0,0,0],
        [0,0,0,0]
    ],
    // O
    [
        [0,1,1,0],
        [0,1,1,0],
        [0,0,0,0],
        [0,0,0,0]
    ],
    // S
    [
        [0,1,1,0],
        [1,1,0,0],
        [0,0,0,0],
        [0,0,0,0]
    ],
    // Z
    [
        [1,1,0,0],
        [0,1,1,0],
        [0,0,0,0],
        [0,0,0,0]
    ]
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