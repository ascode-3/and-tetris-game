import { BLOCK_SIZE, ROWS, COLS, GHOST_PIECE_OPACITY, COLORS } from '../constants';
import { createSparkle } from './effects';

// Draw grid lines
export function drawGrid(context, width, height) {
    context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    context.lineWidth = 0.8;

    // Draw vertical lines
    for (let x = 0; x <= width; x += BLOCK_SIZE) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
    }

    // Draw horizontal lines
    for (let y = 0; y <= height; y += BLOCK_SIZE) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
    }
}

// Draw a single block
export function drawBlock(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(
        x * BLOCK_SIZE,
        y * BLOCK_SIZE,
        BLOCK_SIZE - 1,
        BLOCK_SIZE - 1
    );
    
    // Draw block inner border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
        x * BLOCK_SIZE + 2,
        y * BLOCK_SIZE + 2,
        BLOCK_SIZE - 5,
        BLOCK_SIZE - 5
    );
}

// Draw preview piece
export function drawPreviewPiece(ctx, piece) {
    if (!piece) return;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    const offsetX = (4 - piece.shape[0].length) * BLOCK_SIZE / 2;
    const offsetY = (4 - piece.shape.length) * BLOCK_SIZE / 2;
    
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                ctx.fillStyle = piece.color;
                ctx.fillRect(
                    x * BLOCK_SIZE + offsetX,
                    y * BLOCK_SIZE + offsetY,
                    BLOCK_SIZE - 1,
                    BLOCK_SIZE - 1
                );
                
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 1;
                ctx.strokeRect(
                    x * BLOCK_SIZE + offsetX + 2,
                    y * BLOCK_SIZE + offsetY + 2,
                    BLOCK_SIZE - 5,
                    BLOCK_SIZE - 5
                );
            }
        });
    });
}

// Draw the entire game board
export function drawBoard(ctx, grid, currentPiece, ghostPiece) {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw grid
    drawGrid(ctx, ctx.canvas.width, ctx.canvas.height);
    
    // Draw placed pieces
    grid.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawBlock(ctx, x, y, COLORS[value - 1]);
            }
        });
    });
    
    // Draw ghost piece
    if (ghostPiece) {
        ctx.globalAlpha = GHOST_PIECE_OPACITY;
        ghostPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    drawBlock(ctx, ghostPiece.pos.x + x, ghostPiece.pos.y + y, ghostPiece.color);
                }
            });
        });
        ctx.globalAlpha = 1;
    }
    
    // Draw current piece
    if (currentPiece) {
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    drawBlock(ctx, currentPiece.pos.x + x, currentPiece.pos.y + y, currentPiece.color);
                }
            });
        });
    }
}

// Clear lines and return number of lines cleared
export function clearLines(grid) {
    let linesCleared = 0;
    let linesToClear = [];
    
    // Find complete lines
    for (let y = ROWS - 1; y >= 0; y--) {
        if (grid[y].every(cell => cell !== 0)) {
            linesToClear.push(y);
            linesCleared++;
        }
    }
    
    // Remove complete lines
    if (linesToClear.length > 0) {
        const newGrid = grid.filter((_, index) => !linesToClear.includes(index));
        
        // Add empty lines at the top
        for (let i = 0; i < linesToClear.length; i++) {
            newGrid.unshift(Array(COLS).fill(0));
        }
        
        return { newGrid, linesCleared, linesToClear };
    }
    
    return { newGrid: grid, linesCleared: 0, linesToClear: [] };
}

// Merge piece into grid
export function mergePiece(grid, piece) {
    const newGrid = grid.map(row => [...row]);
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const gridY = piece.pos.y + y;
                if (gridY >= 0) {
                    newGrid[gridY][piece.pos.x + x] = COLORS.indexOf(piece.color) + 1;
                    createSparkle(piece.pos.x + x, gridY);
                }
            }
        });
    });
    return newGrid;
} 