/**
 * NeuroSnake - High Fidelity Canvas Snake Game Engine
 * ponytail: simplified game engine by locking grid size (20x20) and using math logic for eye placement and direction maps.
 */
class SnakeGame {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) throw new Error(`Canvas with ID ${canvasId} not found.`);
        this.ctx = this.canvas.getContext('2d');
        
        // ponytail: Locked standard grid coordinates to keep gameplay consistent across devices.
        this.gridWidth = 20;
        this.gridHeight = 20;
        this.tileSize = 30;
        this.canvas.width = this.gridWidth * this.tileSize;
        this.canvas.height = this.gridHeight * this.tileSize;
        
        this.highScore = parseInt(localStorage.getItem('neuro_snake_high_score') || '0', 10);
        this.onScoreChange = options.onScoreChange || (() => {});
        this.onGameOver = options.onGameOver || (() => {});
        this.onStateChange = options.onStateChange || (() => {});
        
        this.state = 'IDLE';
        this.snake = [];
        this.direction = { x: 0, y: 0 };
        this.nextDirection = { x: 0, y: 0 };
        this.food = { x: 0, y: 0 };
        this.score = 0;
        this.gameInterval = null;
        this.speedMs = options.speedMs || 90;
        this.particles = [];
        this.glowPulse = 0;
        
        this.reset();
        this.startDrawLoop();
    }
    
    reset() {
        const startX = Math.floor(this.gridWidth / 2);
        const startY = Math.floor(this.gridHeight / 2);
        
        this.snake = [
            { x: startX, y: startY },
            { x: startX, y: startY + 1 },
            { x: startX, y: startY + 2 }
        ];
        this.direction = { x: 0, y: -1 };
        this.nextDirection = { x: 0, y: -1 };
        this.score = 0;
        this.particles = [];
        this.spawnFood();
        this.onScoreChange(this.score, this.highScore);
        this.setState('IDLE');
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
            this.gameInterval = null;
        }
    }
    
    setState(newState) {
        this.state = newState;
        this.onStateChange(this.state);
    }
    
    spawnFood() {
        let proposedFood;
        let valid = false;
        while (!valid) {
            proposedFood = {
                x: 1 + Math.floor(Math.random() * (this.gridWidth - 2)),
                y: 1 + Math.floor(Math.random() * (this.gridHeight - 2))
            };
            valid = !this.snake.some(segment => segment.x === proposedFood.x && segment.y === proposedFood.y);
        }
        this.food = proposedFood;
    }
    
    setSpeed(ms) {
        this.speedMs = ms;
        if (this.state === 'PLAYING') {
            this.pause();
            this.start();
        }
    }
    
    start() {
        if (this.state === 'PLAYING') return;
        if (this.state === 'GAME_OVER' || this.state === 'IDLE') this.reset();
        this.setState('PLAYING');
        this.gameInterval = setInterval(() => this.tick(), this.speedMs);
    }
    
    pause() {
        if (this.state !== 'PLAYING') return;
        this.setState('PAUSED');
        clearInterval(this.gameInterval);
        this.gameInterval = null;
    }
    
    tick() {
        if (this.state !== 'PLAYING') return;
        this.direction = { ...this.nextDirection };
        const head = this.snake[0];
        const nextHead = { x: head.x + this.direction.x, y: head.y + this.direction.y };
        
        if (nextHead.x <= 0 || nextHead.x >= this.gridWidth - 1 || nextHead.y <= 0 || nextHead.y >= this.gridHeight - 1) {
            this.gameOver();
            return;
        }
        
        if (this.snake.slice(0, -1).some(segment => segment.x === nextHead.x && segment.y === nextHead.y)) {
            this.gameOver();
            return;
        }
        
        this.snake.unshift(nextHead);
        if (nextHead.x === this.food.x && nextHead.y === this.food.y) {
            this.score += 10;
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('neuro_snake_high_score', this.highScore.toString());
            }
            this.onScoreChange(this.score, this.highScore);
            this.createFoodExplosion(this.food.x, this.food.y);
            this.spawnFood();
        } else {
            this.snake.pop();
        }
    }
    
    gameOver() {
        this.setState('GAME_OVER');
        clearInterval(this.gameInterval);
        this.gameInterval = null;
        this.onGameOver(this.score);
    }
    
    changeDirection(dirName) {
        // ponytail: replaced bulky switch statement with lookup map & arithmetic opposite check
        const dirs = { UP: { x: 0, y: -1 }, DOWN: { x: 0, y: 1 }, LEFT: { x: -1, y: 0 }, RIGHT: { x: 1, y: 0 } };
        const newDir = dirs[dirName.toUpperCase()];
        if (newDir && (newDir.x + this.direction.x !== 0 || newDir.y + this.direction.y !== 0)) {
            const changed = this.nextDirection.x !== newDir.x || this.nextDirection.y !== newDir.y;
            this.nextDirection = newDir;
            return changed;
        }
        return false;
    }
    
    createFoodExplosion(gridX, gridY) {
        const centerX = (gridX + 0.5) * this.tileSize;
        const centerY = (gridY + 0.5) * this.tileSize;
        const colors = ['#cc785c', '#8e8b82', '#3d3d3a', '#efe9de'];
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
                decay: 0.03 + Math.random() * 0.04
            });
        }
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;
            if (p.alpha <= 0) this.particles.splice(i, 1);
        }
    }
    
    startDrawLoop() {
        const render = () => {
            this.draw();
            this.updateParticles();
            this.glowPulse = (this.glowPulse + 0.05) % (Math.PI * 2);
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    }
    
    draw() {
        const ctx = this.ctx;
        const size = this.tileSize;
        
        ctx.fillStyle = '#faf9f5';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        ctx.strokeStyle = 'rgba(230, 223, 216, 0.45)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= this.gridWidth; i++) {
            ctx.beginPath();
            ctx.moveTo(i * size, 0);
            ctx.lineTo(i * size, this.canvas.height);
            ctx.stroke();
        }
        for (let j = 0; j <= this.gridHeight; j++) {
            ctx.beginPath();
            ctx.moveTo(0, j * size);
            ctx.lineTo(this.canvas.width, j * size);
            ctx.stroke();
        }
        
        this.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        
        if (this.state !== 'GAME_OVER') {
            const foodPulse = Math.sin(this.glowPulse) * 0.8;
            const foodRadius = (size / 2) * 0.6 + foodPulse;
            ctx.save();
            ctx.fillStyle = '#cc785c';
            ctx.beginPath();
            ctx.arc((this.food.x + 0.5) * size, (this.food.y + 0.5) * size, foodRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        this.snake.forEach((segment, index) => {
            const isHead = index === 0;
            const segmentCenterX = (segment.x + 0.5) * size;
            const segmentCenterY = (segment.y + 0.5) * size;
            
            ctx.save();
            const lightness = 9 + Math.floor((index / this.snake.length) * 15);
            ctx.fillStyle = `hsl(30, 10%, ${lightness}%)`;
            
            const padding = isHead ? 1 : 2 + (index / this.snake.length) * 2;
            const rectSize = size - padding * 2;
            ctx.beginPath();
            ctx.roundRect(segment.x * size + padding, segment.y * size + padding, rectSize, rectSize, isHead ? size / 2.5 : size / 4);
            ctx.fill();
            
            if (isHead) {
                const eyeOffset = size * 0.22;
                // ponytail: replaced 15 lines of direction cases with trigonometric/matrix perpendicular eye offset calculations
                const dx = this.direction.x, dy = this.direction.y;
                const px = -dy, py = dx;
                const eyeL = { x: segmentCenterX + (dx + px) * eyeOffset, y: segmentCenterY + (dy + py) * eyeOffset };
                const eyeR = { x: segmentCenterX + (dx - px) * eyeOffset, y: segmentCenterY + (dy - py) * eyeOffset };
                
                [eyeL, eyeR].forEach(eye => {
                    ctx.beginPath();
                    ctx.arc(eye.x, eye.y, size * 0.09, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(eye.x + dx, eye.y + dy, size * 0.04, 0, Math.PI * 2);
                    ctx.fillStyle = '#181715';
                    ctx.fill();
                });
            }
            ctx.restore();
        });
        
        ctx.save();
        ctx.fillStyle = '#cc785c';
        ctx.fillRect(0, 0, size, this.canvas.height);
        ctx.fillRect((this.gridWidth - 1) * size, 0, size, this.canvas.height);
        ctx.fillRect(0, 0, this.canvas.width, size);
        ctx.fillRect(0, (this.gridHeight - 1) * size, this.canvas.width, size);
        
        ctx.strokeStyle = 'rgba(24, 23, 21, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(size, size, (this.gridWidth - 2) * size, (this.gridHeight - 2) * size);
        ctx.restore();
    }
}
