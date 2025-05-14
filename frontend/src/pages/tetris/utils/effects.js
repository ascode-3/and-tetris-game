import { BLOCK_SIZE } from '../constants';

// Create sparkle effect
export function createSparkle(x, y) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';
    sparkle.style.left = `${x * BLOCK_SIZE}px`;
    sparkle.style.top = `${y * BLOCK_SIZE}px`;
    sparkle.style.width = `${BLOCK_SIZE}px`;
    sparkle.style.height = `${BLOCK_SIZE}px`;
    
    const container = document.querySelector('.game-board-container');
    if (container) {
        container.appendChild(sparkle);
        sparkle.addEventListener('animationend', () => {
            sparkle.remove();
        });
    }
}

// Create line clear effect
export function createLineClearEffect(y) {
    const effect = document.createElement('div');
    effect.className = 'line-clear-effect';
    effect.style.top = `${y * BLOCK_SIZE}px`;
    effect.style.height = `${BLOCK_SIZE}px`;
    
    const container = document.querySelector('.game-board-container');
    if (container) {
        container.appendChild(effect);
        effect.addEventListener('animationend', () => {
            effect.remove();
        });
    }
}

// Add line clear effects with delay
export function addLineClearEffects(lines) {
    lines.forEach((y, index) => {
        setTimeout(() => {
            createLineClearEffect(y);
        }, index * 50); // 50ms delay between each line effect
    });
}

// Update score display
export function updateScoreDisplay(score) {
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
        scoreElement.textContent = score;
    }
}

// Update level display
export function updateLevelDisplay(level) {
    const levelElement = document.getElementById('level');
    if (levelElement) {
        levelElement.textContent = level;
    }
}

// Toggle pause overlay
export function togglePauseOverlay(isPaused) {
    const pauseOverlay = document.querySelector('.pause-overlay');
    if (pauseOverlay) {
        pauseOverlay.style.display = isPaused ? 'flex' : 'none';
    }
} 