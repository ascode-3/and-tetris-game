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
        color: COLORS[typeId],
        type: typeId,           // 추가: 테트로미노 종류 식별용
        orientation: 0          // 추가: 회전 상태 (0,1,2,3)
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
export function rotatePiece(piece, grid) {
    // Helper: rotate matrix CW
    const rotateMatrixCW = (matrix) => matrix[0].map((_, i) => matrix.map(row => row[i]).reverse());

    // Helper: pivot finder – pick block with most direct neighbours (up/down/left/right)
    const findPivot = (shape) => {
        let best = {x:0, y:0, score:-1};
        const h = shape.length;
        const w = shape[0].length;
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        for (let y=0; y<h; y++){
            for (let x=0; x<w; x++){
                if(!shape[y][x]) continue;
                let score=0;
                for(const [dx,dy] of dirs){
                    const nx=x+dx, ny=y+dy;
                    if(nx>=0 && nx<w && ny>=0 && ny<h && shape[ny][nx]) score++;
                }
                if(score>best.score){ best={x,y,score}; }
            }
        }
        return {x:best.x, y:best.y};
    };

    // SRS kick tables
    const JLSTZ_KICKS = {"0->1": [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],"1->2": [[0,0],[1,0],[1,-1],[0,2],[1,2]],"2->3": [[0,0],[1,0],[1,1],[0,-2],[1,-2]],"3->0": [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]]};
    const I_KICKS  = {"0->1": [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],"1->2": [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],"2->3": [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],"3->0": [[0,0],[1,0],[-2,0],[1,-2],[-2,1]]};

    const newOrientation = (piece.orientation + 1) % 4;
    const rotatedShape = rotateMatrixCW(piece.shape);

    // pivot offset 계산 → 회전 전후 위치 보정
    const oldPivot = findPivot(piece.shape);
    const newPivot = findPivot(rotatedShape);
    const pivotDx = oldPivot.x - newPivot.x;
    const pivotDy = oldPivot.y - newPivot.y;

    // kick table 선택
    let kicks;
    if (piece.type === 0) {
        kicks = I_KICKS[`${piece.orientation}->${newOrientation}`];
    } else if (piece.type === 4) {
        kicks = [[0,0]];
    } else {
        kicks = JLSTZ_KICKS[`${piece.orientation}->${newOrientation}`];
    }

    for (const [dx, dy] of kicks) {
        const testPiece = {
            ...piece,
            shape: rotatedShape,
            orientation: newOrientation,
            pos: { x: piece.pos.x + pivotDx + dx, y: piece.pos.y + pivotDy + dy }
        };
        if (!checkCollision(testPiece, grid)) {
            return testPiece;
        }
    }
    return null;
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