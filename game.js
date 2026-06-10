/**
 * NeuroSnake - High Fidelity Canvas Snake Game Engine
 */
class SnakeGame {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas with ID ${canvasId} not found.`);
        }
        this.ctx = this.canvas.getContext('2d');
        
        // Dynamic Grid calculations (initially set by resize)
        this.gridWidth = 20;
        this.gridHeight = 20;
        this.tileSize = 30;
        
        // Game Preferences
        this.wrapAround = options.wrapAround !== undefined ? options.wrapAround : false;
        
        // High Score
        this.highScore = parseInt(localStorage.getItem('neuro_snake_high_score') || '0', 10);
        
        // Callbacks
        this.onScoreChange = options.onScoreChange || (() => {});
        this.onGameOver = options.onGameOver || (() => {});
        this.onStateChange = options.onStateChange || (() => {});
        
        // Core State
        this.state = 'IDLE'; // IDLE, PLAYING, PAUSED, GAME_OVER
        this.snake = [];
        this.direction = { x: 0, y: 0 };
        this.nextDirection = { x: 0, y: 0 };
        this.food = { x: 0, y: 0 };
        this.score = 0;
        this.gameInterval = null;
        this.speedMs = options.speedMs || 90;
        
        // Particles for food ingestion explosion
        this.particles = [];
        
        // Canvas Glow effect tracker (cycles over time)
        this.glowPulse = 0;
        
        // Fit canvas to window sizes
        this.resize();
        
        // Reset to initial state
        this.reset();
        
        // Start rendering loops
        this.startDrawLoop();
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        this.tileSize = 30; // 30px per grid cell
        this.gridWidth = Math.floor(this.canvas.width / this.tileSize);
        this.gridHeight = Math.floor(this.canvas.height / this.tileSize);
        
        // Compute wall thickness/offset to dynamically position absolute UI overlays
        const bottomOffset = this.canvas.height - (this.gridHeight - 1) * this.tileSize;
        const rightOffset = this.canvas.width - (this.gridWidth - 1) * this.tileSize;
        document.documentElement.style.setProperty('--bottom-wall-offset', `${bottomOffset}px`);
        document.documentElement.style.setProperty('--right-wall-offset', `${rightOffset}px`);
        
        // Prevent snake segments exceeding window when window size is reduced (clamped inside walls)
        if (this.snake && this.snake.length > 0) {
            this.snake.forEach(segment => {
                segment.x = Math.max(1, Math.min(segment.x, this.gridWidth - 2));
                segment.y = Math.max(1, Math.min(segment.y, this.gridHeight - 2));
            });
        }
        
        if (this.food) {
            if (this.food.x <= 0 || this.food.x >= this.gridWidth - 1 || 
                this.food.y <= 0 || this.food.y >= this.gridHeight - 1) {
                this.spawnFood();
            }
        }
    }
    
    reset() {
        const startX = Math.floor(this.gridWidth / 2) || 10;
        const startY = Math.floor(this.gridHeight / 2) || 10;
        
        this.snake = [
            { x: startX, y: startY },
            { x: startX, y: startY + 1 },
            { x: startX, y: startY + 2 }
        ];
        this.direction = { x: 0, y: -1 }; // Move Up initially
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
            
            // Check if food spawns on top of the snake
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
        
        if (this.state === 'GAME_OVER' || this.state === 'IDLE') {
            this.reset();
        }
        
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
        
        // Apply queued direction
        this.direction = { ...this.nextDirection };
        
        // Calculate head
        const head = this.snake[0];
        const nextHead = {
            x: head.x + this.direction.x,
            y: head.y + this.direction.y
        };
        
        // Handle boundary conditions (walls on all sides)
        if (nextHead.x <= 0 || nextHead.x >= this.gridWidth - 1 || nextHead.y <= 0 || nextHead.y >= this.gridHeight - 1) {
            this.gameOver();
            return;
        }
        
        // Handle self-collision (excluding the tail if the snake isn't eating)
        const hitSelf = this.snake.slice(0, -1).some(segment => segment.x === nextHead.x && segment.y === nextHead.y);
        if (hitSelf) {
            this.gameOver();
            return;
        }
        
        // Add new head
        this.snake.unshift(nextHead);
        
        // Check food collision
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
            // Remove tail
            this.snake.pop();
        }
    }
    
    gameOver() {
        this.setState('GAME_OVER');
        clearInterval(this.gameInterval);
        this.gameInterval = null;
        this.onGameOver(this.score);
    }
    
    // Changes direction, preventing a direct reverse block (e.g. going Left while moving Right)
    changeDirection(dirName) {
        const currentDir = this.direction;
        
        let newDir;
        switch (dirName.toUpperCase()) {
            case 'UP':
                if (currentDir.y !== 1) newDir = { x: 0, y: -1 };
                break;
            case 'DOWN':
                if (currentDir.y !== -1) newDir = { x: 0, y: 1 };
                break;
            case 'LEFT':
                if (currentDir.x !== 1) newDir = { x: -1, y: 0 };
                break;
            case 'RIGHT':
                if (currentDir.x !== -1) newDir = { x: 1, y: 0 };
                break;
        }
        
        if (newDir) {
            const changed = this.nextDirection.x !== newDir.x || this.nextDirection.y !== newDir.y;
            this.nextDirection = newDir;
            return changed;
        }
        return false;
    }
    
    // Explosion effects when food is eaten
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
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    // Core Rendering Loops
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
        
        // 1. Clear background to warm cream
        ctx.fillStyle = '#faf9f5';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 2. Draw Subtle Hairline Grid Pattern
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
        
        // 3. Draw Particles (dust drift)
        ctx.shadowBlur = 0;
        this.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        
        // 4. Draw Food (solid coral circle)
        if (this.state !== 'GAME_OVER') {
            const foodPulse = Math.sin(this.glowPulse) * 0.8;
            const foodRadius = (size / 2) * 0.6 + foodPulse;
            const foodCenterX = (this.food.x + 0.5) * size;
            const foodCenterY = (this.food.y + 0.5) * size;
            
            ctx.save();
            ctx.fillStyle = '#cc785c'; // Anthropic Coral
            
            ctx.beginPath();
            ctx.arc(foodCenterX, foodCenterY, foodRadius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
        
        // 5. Draw Snake (warm-ink segments)
        this.snake.forEach((segment, index) => {
            const isHead = index === 0;
            const segmentCenterX = (segment.x + 0.5) * size;
            const segmentCenterY = (segment.y + 0.5) * size;
            
            ctx.save();
            
            // Interpolate color from dark warm ink (#181715) to muted body slate (#3d3d3a)
            const lightness = 9 + Math.floor((index / this.snake.length) * 15); // 9% to 24%
            const color = `hsl(30, 10%, ${lightness}%)`;
            
            ctx.fillStyle = color;
            ctx.shadowBlur = 0;
            
            // Rounded shapes for segments
            const padding = isHead ? 1 : 2 + (index / this.snake.length) * 2; 
            const rectSize = size - padding * 2;
            const rx = segment.x * size + padding;
            const ry = segment.y * size + padding;
            
            // Draw segment path with rounded borders
            ctx.beginPath();
            ctx.roundRect(rx, ry, rectSize, rectSize, isHead ? size / 2.5 : size / 4);
            ctx.fill();
            
            // Draw Face/Eyes if it's the head
            if (isHead) {
                const eyeOffset = size * 0.22;
                const eyeRadius = size * 0.09;
                const pupRadius = size * 0.04;
                
                let eyeL = { x: 0, y: 0 };
                let eyeR = { x: 0, y: 0 };
                
                // Position eyes depending on direction
                if (this.direction.x === 0 && this.direction.y === -1) { // UP
                    eyeL = { x: segmentCenterX - eyeOffset, y: segmentCenterY - eyeOffset };
                    eyeR = { x: segmentCenterX + eyeOffset, y: segmentCenterY - eyeOffset };
                } else if (this.direction.x === 0 && this.direction.y === 1) { // DOWN
                    eyeL = { x: segmentCenterX - eyeOffset, y: segmentCenterY + eyeOffset };
                    eyeR = { x: segmentCenterX + eyeOffset, y: segmentCenterY + eyeOffset };
                } else if (this.direction.x === -1 && this.direction.y === 0) { // LEFT
                    eyeL = { x: segmentCenterX - eyeOffset, y: segmentCenterY - eyeOffset };
                    eyeR = { x: segmentCenterX - eyeOffset, y: segmentCenterY + eyeOffset };
                } else if (this.direction.x === 1 && this.direction.y === 0) { // RIGHT
                    eyeL = { x: segmentCenterX + eyeOffset, y: segmentCenterY - eyeOffset };
                    eyeR = { x: segmentCenterX + eyeOffset, y: segmentCenterY + eyeOffset };
                }
                
                // Draw Left Eye
                ctx.beginPath();
                ctx.arc(eyeL.x, eyeL.y, eyeRadius, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(eyeL.x + this.direction.x * 1, eyeL.y + this.direction.y * 1, pupRadius, 0, Math.PI * 2);
                ctx.fillStyle = '#181715'; // pupils match body ink
                ctx.fill();
                
                // Draw Right Eye
                ctx.beginPath();
                ctx.arc(eyeR.x, eyeR.y, eyeRadius, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(eyeR.x + this.direction.x * 1, eyeR.y + this.direction.y * 1, pupRadius, 0, Math.PI * 2);
                ctx.fillStyle = '#181715';
                ctx.fill();
            }
            
            ctx.restore();
        });
        
        // 6. Draw Walls (Solid Coral Border covering the grid edge)
        ctx.save();
        ctx.fillStyle = '#cc785c'; // Anthropic Coral
        
        // Left wall
        ctx.fillRect(0, 0, size, this.canvas.height);
        // Right wall
        ctx.fillRect((this.gridWidth - 1) * size, 0, this.canvas.width - (this.gridWidth - 1) * size, this.canvas.height);
        // Top wall
        ctx.fillRect(0, 0, this.canvas.width, size);
        // Bottom wall
        ctx.fillRect(0, (this.gridHeight - 1) * size, this.canvas.width, this.canvas.height - (this.gridHeight - 1) * size);
        
        // Inner print-like borderline around the playable area
        ctx.strokeStyle = 'rgba(24, 23, 21, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(size, size, (this.gridWidth - 2) * size, (this.gridHeight - 2) * size);
        
        ctx.restore();
    }
}
