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

// === Utility: shadeColor ===
// 밝기 조정을 통해 색상을 밝히거나 어둡게 합니다.
// percent 양수 : 색상을 밝게, 음수 : 어둡게 (-1 ~ 1 범위 권장)
function shadeColor(hexColor, percent) {
    let num = parseInt(hexColor.slice(1), 16);
    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;

    const tint = (channel) => {
        if (percent < 0) {
            return Math.round(channel * (1 + percent));
        } else {
            return Math.round(channel * (1 - percent) + 255 * percent);
        }
    };

    r = tint(r);
    g = tint(g);
    b = tint(b);

    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Draw a single block with 3D effect
export function drawBlock(ctx, x, y, color) {
    const posX = x * BLOCK_SIZE;
    const posY = y * BLOCK_SIZE;

    // Create gradient for 3D shading
    const gradient = ctx.createLinearGradient(posX, posY, posX + BLOCK_SIZE, posY + BLOCK_SIZE);
    gradient.addColorStop(0, shadeColor(color, 0.3));     // lighter top-left
    gradient.addColorStop(1, shadeColor(color, -0.3));    // darker bottom-right

    // Main filled rectangle
    ctx.fillStyle = gradient;
    ctx.fillRect(posX, posY, BLOCK_SIZE, BLOCK_SIZE);

    // Outer darker border
    ctx.strokeStyle = shadeColor(color, -0.45);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(posX + 0.5, posY + 0.5, BLOCK_SIZE - 1, BLOCK_SIZE - 1);

    // Inner highlight (small glossy square on top-left)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(posX + 2, posY + 2, BLOCK_SIZE * 0.4, BLOCK_SIZE * 0.4);

    // Optional inner shadow bottom-right
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.moveTo(posX + BLOCK_SIZE - 1, posY + 1);
    ctx.lineTo(posX + BLOCK_SIZE - 1, posY + BLOCK_SIZE - 1);
    ctx.lineTo(posX + 1, posY + BLOCK_SIZE - 1);
    ctx.stroke();
}

// Draw preview piece (Hold용)
export function drawPreviewPiece(ctx, piece) {
    if (!piece) return;

    // 배경을 투명하게 유지
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // 블록의 실제 크기 계산
    const shapeWidth = piece.shape[0].length;
    const shapeHeight = piece.shape.length;
    
    // 중앙 정렬을 위한 오프셋 계산
    const offsetX = (ctx.canvas.width - shapeWidth * BLOCK_SIZE) / 2;
    const offsetY = (ctx.canvas.height - shapeHeight * BLOCK_SIZE) / 2;
    
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const posX = x * BLOCK_SIZE + offsetX;
                const posY = y * BLOCK_SIZE + offsetY;
                
                // 3D 효과를 위한 그라데이션
                const gradient = ctx.createLinearGradient(posX, posY, posX + BLOCK_SIZE, posY + BLOCK_SIZE);
                gradient.addColorStop(0, shadeColor(piece.color, 0.3));
                gradient.addColorStop(1, shadeColor(piece.color, -0.3));
                
                // 메인 블록
                ctx.fillStyle = gradient;
                ctx.fillRect(posX, posY, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
                
                // 외곽선
                ctx.strokeStyle = shadeColor(piece.color, -0.45);
                ctx.lineWidth = 1.5;
                ctx.strokeRect(posX + 0.5, posY + 0.5, BLOCK_SIZE - 3, BLOCK_SIZE - 3);
                
                // 하이라이트
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(posX + 2, posY + 2, BLOCK_SIZE * 0.35, BLOCK_SIZE * 0.35);
            }
        });
    });
}

// Draw next pieces (4개를 세로로 표시)
export function drawNextPieces(ctx, pieces) {
    if (!pieces || pieces.length === 0) return;
    
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    const spacing = 8; // 블록 사이 간격
    const blockAreaHeight = BLOCK_SIZE * 3; // 각 블록당 할당된 높이
    
    pieces.forEach((piece, index) => {
        if (!piece) return;
        
        const shapeWidth = piece.shape[0].length;
        const shapeHeight = piece.shape.length;
        
        // 각 블록의 시작 Y 위치
        const startY = index * blockAreaHeight + spacing;
        
        // 중앙 정렬
        const offsetX = (ctx.canvas.width - shapeWidth * BLOCK_SIZE) / 2;
        const offsetY = startY + (blockAreaHeight - shapeHeight * BLOCK_SIZE) / 2;
        
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const posX = x * BLOCK_SIZE + offsetX;
                    const posY = y * BLOCK_SIZE + offsetY;
                    
                    // 3D 효과
                    const gradient = ctx.createLinearGradient(posX, posY, posX + BLOCK_SIZE, posY + BLOCK_SIZE);
                    gradient.addColorStop(0, shadeColor(piece.color, 0.3));
                    gradient.addColorStop(1, shadeColor(piece.color, -0.3));
                    
                    ctx.fillStyle = gradient;
                    ctx.fillRect(posX, posY, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
                    
                    ctx.strokeStyle = shadeColor(piece.color, -0.45);
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(posX + 0.5, posY + 0.5, BLOCK_SIZE - 3, BLOCK_SIZE - 3);
                    
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.fillRect(posX + 2, posY + 2, BLOCK_SIZE * 0.35, BLOCK_SIZE * 0.35);
                }
            });
        });
    });
}

// Draw the entire game board
export function drawBoard(ctx, grid, currentPiece, ghostPiece) {
    // Clear canvas with black background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw grid lines
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