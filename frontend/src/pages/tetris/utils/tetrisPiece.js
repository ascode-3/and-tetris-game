import { COLS, SHAPES, COLORS } from '../constants';

// Fisher-Yates shuffle algorithm
export function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Generate new bag of pieces
export function generateBag() {
    const indices = Array.from({ length: SHAPES.length }, (_, i) => i);
    return shuffleArray(indices);
}

// SRS: All rotation states for each piece
// 배열 인덱스: [I, T, L, J, O, S, Z]
const ROTATION_STATES = [
    // I piece (4x4 grid)
    [
        [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // 0°
        [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]], // 90°
        [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]], // 180°
        [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]  // 270°
    ],
    // T piece (3x3 grid in 4x4)
    [
        [[0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]], // 0°
        [[0,1,0,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]], // 90°
        [[0,0,0,0],[1,1,1,0],[0,1,0,0],[0,0,0,0]], // 180°
        [[0,1,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]]  // 270°
    ],
    // L piece
    [
        [[0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]], // 0°
        [[0,1,0,0],[0,1,0,0],[0,1,1,0],[0,0,0,0]], // 90°
        [[0,0,0,0],[1,1,1,0],[1,0,0,0],[0,0,0,0]], // 180°
        [[1,1,0,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]]  // 270°
    ],
    // J piece
    [
        [[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]], // 0°
        [[0,1,1,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]], // 90°
        [[0,0,0,0],[1,1,1,0],[0,0,1,0],[0,0,0,0]], // 180°
        [[0,1,0,0],[0,1,0,0],[1,1,0,0],[0,0,0,0]]  // 270°
    ],
    // O piece (doesn't rotate, but has 4 identical states)
    [
        [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
        [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
        [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
        [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]]
    ],
    // S piece
    [
        [[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]], // 0°
        [[0,1,0,0],[0,1,1,0],[0,0,1,0],[0,0,0,0]], // 90°
        [[0,0,0,0],[0,1,1,0],[1,1,0,0],[0,0,0,0]], // 180°
        [[1,0,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]]  // 270°
    ],
    // Z piece
    [
        [[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]], // 0°
        [[0,0,1,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]], // 90°
        [[0,0,0,0],[1,1,0,0],[0,1,1,0],[0,0,0,0]], // 180°
        [[0,1,0,0],[1,1,0,0],[1,0,0,0],[0,0,0,0]]  // 270°
    ]
];

// SRS Wall Kick Data
// For J, L, S, T, Z pieces
const JLSTZ_WALL_KICKS = {
    '0->1': [[0,0], [-1,0], [-1,+1], [0,-2], [-1,-2]],
    '1->0': [[0,0], [+1,0], [+1,-1], [0,+2], [+1,+2]],
    '1->2': [[0,0], [+1,0], [+1,-1], [0,+2], [+1,+2]],
    '2->1': [[0,0], [-1,0], [-1,+1], [0,-2], [-1,-2]],
    '2->3': [[0,0], [+1,0], [+1,+1], [0,-2], [+1,-2]],
    '3->2': [[0,0], [-1,0], [-1,-1], [0,+2], [-1,+2]],
    '3->0': [[0,0], [-1,0], [-1,-1], [0,+2], [-1,+2]],
    '0->3': [[0,0], [+1,0], [+1,+1], [0,-2], [+1,-2]]
};

// For I piece
const I_WALL_KICKS = {
    '0->1': [[0,0], [-2,0], [+1,0], [-2,-1], [+1,+2]],
    '1->0': [[0,0], [+2,0], [-1,0], [+2,+1], [-1,-2]],
    '1->2': [[0,0], [-1,0], [+2,0], [-1,+2], [+2,-1]],
    '2->1': [[0,0], [+1,0], [-2,0], [+1,-2], [-2,+1]],
    '2->3': [[0,0], [+2,0], [-1,0], [+2,+1], [-1,-2]],
    '3->2': [[0,0], [-2,0], [+1,0], [-2,-1], [+1,+2]],
    '3->0': [[0,0], [+1,0], [-2,0], [+1,-2], [-2,+1]],
    '0->3': [[0,0], [-1,0], [+2,0], [-1,+2], [+2,-1]]
};

// O piece doesn't need wall kicks (doesn't rotate meaningfully)
const O_WALL_KICKS = {
    '0->1': [[0,0]],
    '1->0': [[0,0]],
    '1->2': [[0,0]],
    '2->1': [[0,0]],
    '2->3': [[0,0]],
    '3->2': [[0,0]],
    '3->0': [[0,0]],
    '0->3': [[0,0]]
};

// Create a new piece
export function createPiece(typeId) {
    return {
        pos: { 
            x: Math.floor(COLS / 2) - 2, // SRS spawn: 중앙에서 약간 왼쪽
            y: typeId === 0 ? -1 : 0     // I piece는 한 칸 위에서 시작
        },
        shape: ROTATION_STATES[typeId][0],
        color: COLORS[typeId],
        type: typeId,
        orientation: 0
    };
}

// Get ghost piece position
export function getGhostPosition(piece, grid) {
    const ghost = {
        pos: { x: piece.pos.x, y: piece.pos.y },
        shape: piece.shape,
        color: piece.color
    };

    while (!checkCollision(ghost, grid)) {
        ghost.pos.y++;
    }
    ghost.pos.y--;

    return ghost;
}

// Check collision
export function checkCollision(piece, grid) {
    return piece.shape.some((row, dy) =>
        row.some((value, dx) => {
            if (!value) return false;
            const newX = piece.pos.x + dx;
            const newY = piece.pos.y + dy;
            return newX < 0 || newX >= COLS || newY >= grid.length ||
                   (newY >= 0 && grid[newY][newX]);
        })
    );
}

// Rotate piece (clockwise by default, dir = -1 for CCW)
export function rotatePiece(piece, grid, dir = 1) {
    const currentOrientation = piece.orientation;
    const newOrientation = (currentOrientation + dir + 4) % 4;
    
    // Get wall kick table based on piece type
    let wallKicks;
    if (piece.type === 0) { // I piece
        wallKicks = I_WALL_KICKS;
    } else if (piece.type === 4) { // O piece
        wallKicks = O_WALL_KICKS;
    } else { // J, L, S, T, Z pieces
        wallKicks = JLSTZ_WALL_KICKS;
    }
    
    // Get kick tests for this rotation
    const kickKey = `${currentOrientation}->${newOrientation}`;
    const kicks = wallKicks[kickKey] || [[0,0]];
    
    // Try each kick offset
    for (const [dx, dy] of kicks) {
        const testPiece = {
            ...piece,
            shape: ROTATION_STATES[piece.type][newOrientation],
            orientation: newOrientation,
            pos: { 
                x: piece.pos.x + dx, 
                y: piece.pos.y - dy  // SRS uses -dy (up is negative)
            }
        };
        
        if (!checkCollision(testPiece, grid)) {
            return testPiece;
        }
    }
    
    // Rotation failed
    return null;
}

// Rotate piece 180 degrees
export function rotate180(piece, grid) {
    const currentOrientation = piece.orientation;
    const newOrientation = (currentOrientation + 2) % 4;
    
    // Get wall kick table based on piece type
    let wallKicks;
    if (piece.type === 0) { // I piece
        wallKicks = I_WALL_KICKS;
    } else if (piece.type === 4) { // O piece
        wallKicks = O_WALL_KICKS;
    } else { // J, L, S, T, Z pieces
        wallKicks = JLSTZ_WALL_KICKS;
    }
    
    // 180도 회전은 두 번 회전하는 것과 같으므로, 중간 단계를 거쳐야 함
    // 하지만 간단하게 직접 180도 회전 시도
    const kickKey = `${currentOrientation}->${(currentOrientation + 1) % 4}`;
    const kicks = wallKicks[kickKey] || [[0,0]];
    
    // Try each kick offset
    for (const [dx, dy] of kicks) {
        const testPiece = {
            ...piece,
            shape: ROTATION_STATES[piece.type][newOrientation],
            orientation: newOrientation,
            pos: { 
                x: piece.pos.x + dx, 
                y: piece.pos.y - dy
            }
        };
        
        if (!checkCollision(testPiece, grid)) {
            return testPiece;
        }
    }
    
    // Rotation failed
    return null;
}

// Move piece horizontally
export function movePiece(piece, dir, grid) {
    const newPos = { x: piece.pos.x + dir, y: piece.pos.y };
    if (!checkCollision({ ...piece, pos: newPos }, grid)) {
        return newPos;
    }
    return piece.pos;
}

// Drop piece down by one
export function dropPiece(piece, grid) {
    const newPos = { x: piece.pos.x, y: piece.pos.y + 1 };
    if (!checkCollision({ ...piece, pos: newPos }, grid)) {
        return newPos;
    }
    return piece.pos;
}