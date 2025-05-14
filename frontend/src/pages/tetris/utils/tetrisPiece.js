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

// Create a new piece
export function createPiece(typeId) {
    return {
        pos: { 
            x: Math.floor(COLS / 2) - Math.floor(SHAPES[typeId][0].length / 2),
            y: 0 
        },
        shape: SHAPES[typeId],
        color: COLORS[typeId]
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

// Rotate piece
export function rotatePiece(piece) {
    const rotated = piece.shape[0].map((_, i) =>
        piece.shape.map(row => row[i]).reverse()
    );
    return rotated;
}

// Move piece
export function movePiece(piece, dir, grid) {
    const newPos = { x: piece.pos.x + dir, y: piece.pos.y };
    if (!checkCollision({ ...piece, pos: newPos }, grid)) {
        return newPos;
    }
    return piece.pos;
}

// Drop piece
export function dropPiece(piece, grid) {
    const newPos = { x: piece.pos.x, y: piece.pos.y + 1 };
    if (!checkCollision({ ...piece, pos: newPos }, grid)) {
        return newPos;
    }
    return piece.pos;
} 