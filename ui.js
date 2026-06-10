/**
 * UI and State Manager for NeuroSnake
 * Orchestrates interaction between the Canvas Game and the AI Teachable Machine Helper.
 */

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // Sound FX Synthesis Engine (Web Audio API)
    // ----------------------------------------------------
    class SoundFX {
        constructor() {
            this.ctx = null;
            this.enabled = localStorage.getItem('snake_sound_enabled') !== 'false';
        }

        init() {
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        toggle() {
            this.enabled = !this.enabled;
            localStorage.setItem('snake_sound_enabled', this.enabled.toString());
            this.init();
            return this.enabled;
        }

        playEat() {
            if (!this.enabled) return;
            this.init();
            if (!this.ctx) return;

            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.08);
        }

        playGameOver() {
            if (!this.enabled) return;
            this.init();
            if (!this.ctx) return;

            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(40, now + 0.4);

            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.4);
        }

        playMove() {
            if (!this.enabled) return;
            this.init();
            if (!this.ctx) return;

            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(110, now);
            osc.frequency.linearRampToValueAtTime(70, now + 0.03);

            gain.gain.setValueAtTime(0.02, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.03);
        }

        playStart() {
            if (!this.enabled) return;
            this.init();
            if (!this.ctx) return;

            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(261.63, now); // C4
            osc.frequency.setValueAtTime(392.00, now + 0.08); // G4

            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.2);
        }
    }

    // ----------------------------------------------------
    // State Variables & Instantiations
    // ----------------------------------------------------
    let controlMode = 'keyboard'; // 'keyboard' or 'ai'
    let confidenceThreshold = 0.8;
    let toastTimeout = null;
    let lastScore = 0;

    const tmHelper = new TMHelper();
    const sounds = new SoundFX();
    
    // Initialize Snake Game with UI Callbacks
    const game = new SnakeGame('game-canvas', {
        wrapAround: false, // Solid boundaries by default
        speedMs: 90,
        onScoreChange: (score, highScore) => {
            document.getElementById('score-val').textContent = String(score).padStart(5, '0');
            document.getElementById('high-score-val').textContent = String(highScore).padStart(5, '0');
            if (score > lastScore) {
                sounds.playEat();
            }
            if (score === 0) {
                lastScore = 0;
            } else {
                lastScore = score;
            }
        },
        onGameOver: (score) => {
            document.getElementById('final-score-val').textContent = score;
            document.getElementById('game-over-screen').classList.remove('hidden');
            sounds.playGameOver();
        },
        onStateChange: (state) => {
            const playPauseBtn = document.getElementById('btn-play-pause');
            if (state === 'PLAYING') {
                playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
                document.getElementById('start-screen').classList.add('hidden');
                document.getElementById('pause-screen').classList.add('hidden');
                document.getElementById('game-over-screen').classList.add('hidden');
            } else if (state === 'PAUSED') {
                playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                document.getElementById('pause-screen').classList.remove('hidden');
            } else if (state === 'IDLE') {
                playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                document.getElementById('start-screen').classList.remove('hidden');
                document.getElementById('pause-screen').classList.add('hidden');
                document.getElementById('game-over-screen').classList.add('hidden');
            }
        }
    });

    // ----------------------------------------------------
    // DOM Elements Reference
    // ----------------------------------------------------
    const modeBadge = document.getElementById('mode-badge');
    const modeText = document.getElementById('mode-text');
    const statusBadge = document.getElementById('status-badge');
    const statusText = document.getElementById('status-text');

    const btnStartGame = document.getElementById('btn-start-game');
    const btnRestart = document.getElementById('btn-restart');
    const btnResumeGame = document.getElementById('btn-resume-game');
    const btnPlayPause = document.getElementById('btn-play-pause');
    const btnReset = document.getElementById('btn-reset');
    
    const btnModeKeyboard = document.getElementById('btn-mode-keyboard');
    const btnModeAi = document.getElementById('btn-mode-ai');
    
    const aiSetupGroup = document.getElementById('ai-setup-group');
    const aiVisualsPanel = document.getElementById('ai-visuals-panel');
    const inputModelUrl = document.getElementById('model-url');
    const btnLoadModel = document.getElementById('btn-load-model');
    const btnStartCamera = document.getElementById('btn-start-camera');
    
    const sliderThreshold = document.getElementById('threshold-slider');
    const valThreshold = document.getElementById('threshold-val');
    const speedSelect = document.getElementById('speed-select');
    
    const webcamPlaceholder = document.getElementById('webcam-placeholder');
    const webcamContainer = document.getElementById('webcam-container');
    const predictionsList = document.getElementById('predictions-list');
    
    const toggleTutorial = document.getElementById('toggle-tutorial');
    const tutorialContent = document.getElementById('tutorial-content');
    
    const toastNotification = document.getElementById('toast-notification');
    const toastMessage = document.getElementById('toast-message');

    // Sidebar & Scrim Nodes
    const btnToggleSettings = document.getElementById('btn-toggle-settings');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const settingsSidebar = document.getElementById('settings-sidebar');
    const sidebarScrim = document.getElementById('sidebar-scrim');

    // ----------------------------------------------------
    // Toast Notification System
    // ----------------------------------------------------
    function showToast(message, isSuccess = false) {
        if (toastTimeout) {
            clearTimeout(toastTimeout);
        }
        
        toastMessage.textContent = message;
        toastNotification.classList.remove('hidden', 'success');
        
        if (isSuccess) {
            toastNotification.classList.add('success');
        }
        
        toastTimeout = setTimeout(() => {
            toastNotification.classList.add('hidden');
        }, 3500);
    }

    // ----------------------------------------------------
    // Keyboard Controls Mapping (Always operational for rescue)
    // ----------------------------------------------------
    window.addEventListener('keydown', (e) => {
        // Prevent default scrolling keys when active on canvas
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }

        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (game.changeDirection('UP')) sounds.playMove();
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                if (game.changeDirection('DOWN')) sounds.playMove();
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                if (game.changeDirection('LEFT')) sounds.playMove();
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                if (game.changeDirection('RIGHT')) sounds.playMove();
                break;
            case ' ': // Spacebar for Play/Pause/Start
                handlePlayPauseAction();
                break;
            case 'Enter': // Enter for Restart when game over
                if (game.state === 'GAME_OVER') {
                    sounds.playStart();
                    game.start();
                }
                break;
        }
    });

    function handlePlayPauseAction() {
        if (game.state === 'PLAYING') {
            game.pause();
        } else if (game.state === 'PAUSED' || game.state === 'IDLE') {
            sounds.playStart();
            game.start();
        }
    }

    // ----------------------------------------------------
    // UI Button & Viewport Listeners
    // ----------------------------------------------------
    btnStartGame.addEventListener('click', () => {
        sounds.playStart();
        game.start();
    });
    btnResumeGame.addEventListener('click', () => {
        sounds.playStart();
        game.start();
    });
    btnRestart.addEventListener('click', () => {
        sounds.playStart();
        game.start();
    });
    
    btnPlayPause.addEventListener('click', handlePlayPauseAction);
    btnReset.addEventListener('click', () => {
        sounds.playStart();
        game.reset();
    });
    
    speedSelect.addEventListener('change', (e) => {
        game.setSpeed(parseInt(e.target.value, 10));
    });

    // Toggle Sound Button
    const btnToggleSound = document.getElementById('btn-toggle-sound');
    if (btnToggleSound) {
        btnToggleSound.textContent = sounds.enabled ? 'ON' : 'OFF';
        btnToggleSound.addEventListener('click', () => {
            const enabled = sounds.toggle();
            btnToggleSound.textContent = enabled ? 'ON' : 'OFF';
            if (enabled) {
                sounds.playStart();
            }
        });
    }

    // Window Resize Handler
    window.addEventListener('resize', () => {
        game.resize();
    });

    // Settings Sidebar Toggles
    function openSettings() {
        settingsSidebar.classList.add('open');
        sidebarScrim.classList.remove('hidden');
    }

    function closeSettings() {
        settingsSidebar.classList.remove('open');
        sidebarScrim.classList.add('hidden');
    }

    btnToggleSettings.addEventListener('click', openSettings);
    btnCloseSettings.addEventListener('click', closeSettings);
    sidebarScrim.addEventListener('click', closeSettings);

    // Toggle Tutorial Accordion
    toggleTutorial.addEventListener('click', () => {
        const arrow = toggleTutorial.querySelector('.accordion-arrow');
        tutorialContent.classList.toggle('collapsed');
        arrow.classList.toggle('collapsed');
    });

    // Slider Listeners
    sliderThreshold.addEventListener('input', (e) => {
        const val = e.target.value;
        valThreshold.textContent = `${val}%`;
        confidenceThreshold = parseFloat(val) / 100;
    });

    // ----------------------------------------------------
    // Control Mode Switcher
    // ----------------------------------------------------
    btnModeKeyboard.addEventListener('click', () => setControlMode('keyboard'));
    btnModeAi.addEventListener('click', () => setControlMode('ai'));

    function setControlMode(mode) {
        if (mode === controlMode) return;
        controlMode = mode;

        if (mode === 'keyboard') {
            btnModeKeyboard.classList.add('active');
            btnModeAi.classList.remove('active');
            
            aiSetupGroup.classList.add('hidden');
            aiVisualsPanel.classList.add('hidden');
            
            // Revert Header Badge
            modeBadge.className = 'badge badge-keyboard';
            modeText.textContent = 'KEYBOARD MODE';
            modeBadge.querySelector('i').className = 'fa-solid fa-keyboard';
            
            // Clean up webcam to save system resources
            tmHelper.stopWebcam();
            document.querySelector('.webcam-wrapper').classList.remove('active');
            webcamPlaceholder.classList.remove('hidden');
        } else {
            btnModeAi.classList.add('active');
            btnModeKeyboard.classList.remove('active');
            
            aiSetupGroup.classList.remove('hidden');
            aiVisualsPanel.classList.remove('hidden');
            
            // Change Header Badge
            modeBadge.className = 'badge badge-ai';
            modeText.textContent = 'AI WEBCAM MODE';
            modeBadge.querySelector('i').className = 'fa-solid fa-robot';
            
            // Proactive checks
            if (tmHelper.isModelLoaded) {
                updateModelStatusBadge('online');
                if (!tmHelper.isWebcamActive) {
                    showToast("Model is online! Connect your camera below to start.", true);
                } else {
                    startAIProcessing();
                }
            } else {
                updateModelStatusBadge('offline');
            }
        }
    }

    // ----------------------------------------------------
    // Teachable Machine Actions
    // ----------------------------------------------------
    
    // Auto-load last successful model link
    const cachedUrl = localStorage.getItem('neuro_snake_model_url');
    if (cachedUrl) {
        inputModelUrl.value = cachedUrl;
    }

    // Load Model Trigger
    btnLoadModel.addEventListener('click', async () => {
        const url = inputModelUrl.value.trim();
        if (!url) {
            showToast("Please enter a valid Teachable Machine URL.");
            return;
        }

        updateModelStatusBadge('loading');
        btnLoadModel.disabled = true;
        btnLoadModel.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

        try {
            const classes = await tmHelper.loadModel(url);
            
            // Save successful URL
            localStorage.setItem('neuro_snake_model_url', url);
            
            showToast("Teachable Machine Model Loaded Successfully!", true);
            updateModelStatusBadge('online');
            
            // Initialize progress bars in the visualizer list
            renderPredictionBars(classes);
            
            // Prompt/Setup webcam if not active
            if (!tmHelper.isWebcamActive) {
                await startWebcamFeed();
            } else {
                startAIProcessing();
            }
        } catch (err) {
            updateModelStatusBadge('error');
            showToast(err.message);
        } finally {
            btnLoadModel.disabled = false;
            btnLoadModel.innerHTML = '<i class="fa-solid fa-download"></i> Load';
        }
    });

    // Start Camera Manually Button
    btnStartCamera.addEventListener('click', async () => {
        await startWebcamFeed();
    });

    async function startWebcamFeed() {
        btnStartCamera.disabled = true;
        btnStartCamera.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enabling...';
        
        try {
            await tmHelper.setupWebcam('webcam-container');
            
            // Visual indicators
            webcamPlaceholder.classList.add('hidden');
            document.querySelector('.webcam-wrapper').classList.add('active');
            
            startAIProcessing();
        } catch (err) {
            showToast(err.message);
            btnStartCamera.disabled = false;
            btnStartCamera.innerHTML = '<i class="fa-solid fa-camera"></i> Enable Camera';
        }
    }

    // Starts processing frame inputs if model & camera are active
    function startAIProcessing() {
        if (controlMode === 'ai' && tmHelper.isModelLoaded && tmHelper.isWebcamActive) {
            tmHelper.startPredictionLoop((predictions) => {
                handlePredictions(predictions);
            });
        }
    }

    // Update Model Badge visual indicator
    function updateModelStatusBadge(status) {
        statusBadge.className = 'badge'; // reset
        
        switch (status) {
            case 'offline':
                statusBadge.classList.add('badge-inactive');
                statusText.textContent = 'AI MODEL OFFLINE';
                statusBadge.querySelector('i').className = 'fa-solid fa-circle-notch';
                break;
            case 'loading':
                statusBadge.classList.add('badge-inactive');
                statusText.textContent = 'LOADING MODEL...';
                statusBadge.querySelector('i').className = 'fa-solid fa-circle-notch fa-spin';
                break;
            case 'online':
                statusBadge.classList.add('badge-active');
                statusText.textContent = 'AI MODEL ONLINE';
                statusBadge.querySelector('i').className = 'fa-solid fa-circle-check';
                break;
            case 'error':
                statusBadge.classList.add('badge-inactive');
                statusText.textContent = 'LOAD ERROR';
                statusBadge.querySelector('i').className = 'fa-solid fa-circle-xmark';
                // Inline styling correction for error visibility
                statusBadge.style.borderColor = 'var(--danger)';
                statusBadge.style.color = 'var(--danger)';
                statusBadge.style.background = 'rgba(198, 69, 69, 0.1)';
                break;
        }
    }

    // Render prediction list structures dynamically
    function renderPredictionBars(classLabels) {
        predictionsList.innerHTML = "";
        
        // Custom icons for classes based on direction tags
        const classIcons = {
            up: 'fa-chevron-up',
            down: 'fa-chevron-down',
            left: 'fa-chevron-left',
            right: 'fa-chevron-right',
            idle: 'fa-circle-dot'
        };

        classLabels.forEach(label => {
            const key = label.toLowerCase();
            const icon = classIcons[key] || 'fa-question';
            
            const row = document.createElement('div');
            row.className = `pred-row ${key}`;
            row.id = `pred-row-${key}`;
            
            row.innerHTML = `
                <div class="pred-labels">
                    <span class="pred-class ${key}"><i class="fa-solid ${icon}"></i> ${label}</span>
                    <span class="pred-pct" id="pred-pct-${key}">0%</span>
                </div>
                <div class="pred-track">
                    <div class="pred-fill" id="pred-fill-${key}"></div>
                </div>
            `;
            predictionsList.appendChild(row);
        });
    }

    // Handle predictions stream update
    function handlePredictions(predictions) {
        if (controlMode !== 'ai') return;
        
        let highestProb = 0;
        let highestClass = "";

        predictions.forEach(p => {
            const key = p.className.toLowerCase();
            const probability = p.probability;
            
            // Check if bar is rendered
            const fillEl = document.getElementById(`pred-fill-${key}`);
            const pctEl = document.getElementById(`pred-pct-${key}`);
            const rowEl = document.getElementById(`pred-row-${key}`);
            
            if (fillEl && pctEl) {
                // Update fill width and text
                const percentage = Math.round(probability * 100);
                fillEl.style.width = `${percentage}%`;
                pctEl.textContent = `${percentage}%`;
                
                // Track highest
                if (probability > highestProb) {
                    highestProb = probability;
                    highestClass = key;
                }
                
                // Reset active row styles temporarily
                rowEl.classList.remove('active');
            }
        });

        // If highest probability exceeds sensitivity threshold, process input
        if (highestProb >= confidenceThreshold) {
            const activeRow = document.getElementById(`pred-row-${highestClass}`);
            if (activeRow) {
                activeRow.classList.add('active');
            }
            
            // Trigger game direction change if playing
            if (game.state === 'PLAYING') {
                if (['up', 'down', 'left', 'right'].includes(highestClass)) {
                    if (game.changeDirection(highestClass)) {
                        sounds.playMove();
                    }
                }
            }
        }
    }
});
