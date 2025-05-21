import React, { useEffect, useRef } from 'react';
import { COLORS } from '../constants'; // COLORS 배열 import
// BLOCK_SIZE는 사용하지 않으므로 제거
// import { BLOCK_SIZE } from '../constants';

const MINI_BLOCK_SIZE = 15; // 미니 보드의 블록 크기
const MINI_BOARD_WIDTH = 10; // 테트리스 보드의 가로 블록 수
const MINI_BOARD_HEIGHT = 20; // 테트리스 보드의 세로 블록 수

const MiniTetrisBoard = ({ gameState, playerName }) => {
    const canvasRef = useRef(null);

    // 미니 보드 그리기
    const drawMiniBoard = (ctx, grid, currentPiece) => {
        // 캔버스 초기화
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // 그리드 라인 그리기
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.5;
        
        // 세로 선
        for (let x = 0; x <= MINI_BOARD_WIDTH; x++) {
            ctx.beginPath();
            ctx.moveTo(x * MINI_BLOCK_SIZE, 0);
            ctx.lineTo(x * MINI_BLOCK_SIZE, MINI_BOARD_HEIGHT * MINI_BLOCK_SIZE);
            ctx.stroke();
        }
        
        // 가로 선
        for (let y = 0; y <= MINI_BOARD_HEIGHT; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * MINI_BLOCK_SIZE);
            ctx.lineTo(MINI_BOARD_WIDTH * MINI_BLOCK_SIZE, y * MINI_BLOCK_SIZE);
            ctx.stroke();
        }

        // 배치된 블록 그리기
        if (grid) {
            grid.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        // value가 숫자(1~7)이면 COLORS에서 색상값을 가져옴
                        const color = typeof value === 'number' ? COLORS[value - 1] : value;
                        ctx.fillStyle = color;
                        ctx.fillRect(
                            x * MINI_BLOCK_SIZE,
                            y * MINI_BLOCK_SIZE,
                            MINI_BLOCK_SIZE - 1,
                            MINI_BLOCK_SIZE - 1
                        );
                    }
                });
            });
        }

        // 현재 움직이는 블록 그리기
        if (currentPiece) {
            ctx.fillStyle = currentPiece.color;
            currentPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        ctx.fillRect(
                            (currentPiece.pos.x + x) * MINI_BLOCK_SIZE,
                            (currentPiece.pos.y + y) * MINI_BLOCK_SIZE,
                            MINI_BLOCK_SIZE - 1,
                            MINI_BLOCK_SIZE - 1
                        );
                    }
                });
            });
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = MINI_BOARD_WIDTH * MINI_BLOCK_SIZE;
        canvas.height = MINI_BOARD_HEIGHT * MINI_BLOCK_SIZE;

        // 게임 상태가 있으면 보드 그리기
        if (gameState) {
            drawMiniBoard(ctx, gameState.grid, gameState.currentPiece);
        }
    }, [gameState]);

    return (
        <div className="mini-tetris-board">
            <div className="player-name">{playerName}</div>
            <canvas ref={canvasRef} />
        </div>
    );
};

export default MiniTetrisBoard; 