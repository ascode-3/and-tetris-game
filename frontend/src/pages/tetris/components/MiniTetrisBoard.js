import React, { useEffect, useRef } from 'react';
import { COLORS } from '../constants'; // COLORS 배열 import
// BLOCK_SIZE는 사용하지 않으므로 제거
// import { BLOCK_SIZE } from '../constants';

const MINI_BOARD_WIDTH = 10; // 테트리스 보드의 가로 블록 수
const MINI_BOARD_HEIGHT = 20; // 테트리스 보드의 세로 블록 수

const MiniTetrisBoard = ({ gameState, playerName }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    // 색상 밝기/어둡기 조정 유틸
    const shadeColor = (hexColor, percent) => {
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
    };

    // 미니 블록 3D 렌더
    const drawMiniBlock = (ctx, x, y, size, color) => {
        const posX = x * size;
        const posY = y * size;
        const gradient = ctx.createLinearGradient(posX, posY, posX + size, posY + size);
        gradient.addColorStop(0, shadeColor(color, 0.3));
        gradient.addColorStop(1, shadeColor(color, -0.3));

        ctx.fillStyle = gradient;
        ctx.fillRect(posX, posY, size, size);

        // Border
        ctx.strokeStyle = shadeColor(color, -0.45);
        ctx.lineWidth = 0.8;
        ctx.strokeRect(posX + 0.4, posY + 0.4, size - 0.8, size - 0.8);

        // Glossy highlight
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(posX + 1, posY + 1, size * 0.4, size * 0.4);
    };

    // 미니 보드 그리기
    const drawMiniBoard = (ctx, grid, currentPiece) => {
        // 캔버스 초기화 - 투명 배경을 유지하기 위해 clearRect 사용
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        const currentMiniBlockSize = ctx.canvas.width / MINI_BOARD_WIDTH;
        
        // 그리드 라인 그리기
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.5;
        
        // 세로 선
        for (let x = 0; x <= MINI_BOARD_WIDTH; x++) {
            ctx.beginPath();
            ctx.moveTo(x * currentMiniBlockSize, 0);
            ctx.lineTo(x * currentMiniBlockSize, MINI_BOARD_HEIGHT * currentMiniBlockSize);
            ctx.stroke();
        }
        
        // 가로 선
        for (let y = 0; y <= MINI_BOARD_HEIGHT; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * currentMiniBlockSize);
            ctx.lineTo(MINI_BOARD_WIDTH * currentMiniBlockSize, y * currentMiniBlockSize);
            ctx.stroke();
        }

        // 배치된 블록 그리기
        if (grid) {
            grid.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        // value가 숫자(1~7)이면 COLORS에서 색상값을 가져옴
                        const color = typeof value === 'number' ? COLORS[value - 1] : value;
                        drawMiniBlock(ctx, x, y, currentMiniBlockSize, color);
                    }
                });
            });
        }

        // 현재 움직이는 블록 그리기
        if (currentPiece) {
            currentPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        drawMiniBlock(
                            ctx,
                            currentPiece.pos.x + x,
                            currentPiece.pos.y + y,
                            currentMiniBlockSize,
                            currentPiece.color
                        );
                    }
                });
            });
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        
        // 부모 컨테이너의 실제 렌더링된 크기를 가져옴 (CSS에 의해 결정됨)
        // padding 및 border를 제외한 실제 콘텐츠 영역 크기
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // 캔버스 요소의 실제 width/height 속성을 컨테이너 크기에 맞게 조정
        // 테트리스 판 비율(10:20 = 1:2)을 유지하면서 컨테이너에 꽉 차게 만듦
        const boardRatio = MINI_BOARD_WIDTH / MINI_BOARD_HEIGHT;
        let canvasWidth = containerWidth;
        let canvasHeight = containerWidth / boardRatio;
        
        if (canvasHeight > containerHeight) {
            canvasHeight = containerHeight;
            canvasWidth = containerHeight * boardRatio;
        }
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // 게임 상태가 있으면 보드 그리기
        if (gameState) {
            drawMiniBoard(ctx, gameState.grid, gameState.currentPiece);
        }
    }, [gameState]);

    return (
        <div className="mini-tetris-board" ref={containerRef}>
            <canvas ref={canvasRef} />
        </div>
    );
};

export default MiniTetrisBoard; 