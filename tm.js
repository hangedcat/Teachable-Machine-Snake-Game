/**
 * Teachable Machine Module for NeuroSnake
 * Handles loading TensorFlow models, webcam capture, and prediction piping.
 */
class TMHelper {
    constructor() {
        this.model = null;
        this.webcam = null;
        this.isModelLoaded = false;
        this.isWebcamActive = false;
        this.loopActive = false;
        this.modelUrl = "";
        this.animationFrameId = null;
    }

    /**
     * Load the model from the given Teachable Machine URL
     * @param {string} rawUrl - The sharing URL from Teachable Machine
     */
    async loadModel(rawUrl) {
        if (!rawUrl || rawUrl.trim() === "") {
            throw new Error("Model URL cannot be empty.");
        }

        // Format URL (ensure trailing slash)
        let baseUrl = rawUrl.trim();
        if (!baseUrl.endsWith("/")) {
            baseUrl += "/";
        }

        const modelURL = baseUrl + "model.json";
        const metadataURL = baseUrl + "metadata.json";

        try {
            // Check if window.tmImage is loaded (loaded via CDN)
            if (typeof window.tmImage === "undefined") {
                throw new Error("Teachable Machine library is not loaded yet. Check internet connection.");
            }

            // Load model and metadata
            this.model = await window.tmImage.load(modelURL, metadataURL);
            this.modelUrl = baseUrl;
            this.isModelLoaded = true;
            return this.model.getClassLabels();
        } catch (error) {
            this.isModelLoaded = false;
            this.model = null;
            console.error("Failed to load TM Model:", error);
            throw new Error(`Failed to load model from URL: ${error.message}`);
        }
    }

    /**
     * Set up user webcam stream
     * @param {string} containerId - Element ID to append the webcam canvas to
     */
    async setupWebcam(containerId) {
        if (this.isWebcamActive) return;

        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Webcam container with ID ${containerId} not found.`);
        }

        try {
            if (typeof window.tmImage === "undefined") {
                throw new Error("Teachable Machine library is not loaded.");
            }

            // Setup a 240x180 canvas for webcam stream
            const width = 240;
            const height = 180;
            const flip = true; // mirror mode is standard for webcams

            this.webcam = new window.tmImage.Webcam(width, height, flip);
            
            // Request permissions and initialize camera
            await this.webcam.setup();
            await this.webcam.play();
            
            // Clear container and append the webcam canvas
            container.innerHTML = "";
            container.appendChild(this.webcam.canvas);
            this.isWebcamActive = true;
        } catch (error) {
            this.isWebcamActive = false;
            this.webcam = null;
            console.error("Webcam setup error:", error);
            throw new Error("Webcam access denied or unavailable. Please enable camera permissions.");
        }
    }

    /**
     * Start the prediction animation loop
     * @param {function} onPredictionCallback - Called on every frame with predictions array
     */
    startPredictionLoop(onPredictionCallback) {
        if (this.loopActive) return;
        if (!this.model) {
            throw new Error("No model loaded to make predictions.");
        }
        if (!this.webcam) {
            throw new Error("Webcam must be active to start prediction loop.");
        }

        this.loopActive = true;

        const predictLoop = async () => {
            if (!this.loopActive) return;

            try {
                // Update webcam frame
                this.webcam.update();
                
                // Classify frame
                const predictions = await this.model.predict(this.webcam.canvas);
                
                // Return predictions to callback
                onPredictionCallback(predictions);
            } catch (err) {
                console.error("Error inside prediction loop:", err);
            }

            // Loop on next animation frame
            this.animationFrameId = requestAnimationFrame(predictLoop);
        };

        this.animationFrameId = requestAnimationFrame(predictLoop);
    }

    /**
     * Stop prediction loop and clean up webcam
     */
    stopWebcam() {
        this.loopActive = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.webcam) {
            try {
                this.webcam.stop();
            } catch (err) {
                console.warn("Error stopping webcam:", err);
            }
            this.webcam = null;
        }
        this.isWebcamActive = false;
    }
}
