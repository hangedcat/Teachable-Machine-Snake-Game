/**
 * Teachable Machine Module for NeuroSnake
 * ponytail: simplified TMHelper by removing redundant state flags and letting direct object checks manage logic flow.
 */
class TMHelper {
    constructor() {
        this.model = null;
        this.webcam = null;
        this.animationFrameId = null;
    }

    async loadModel(rawUrl) {
        if (!rawUrl || !rawUrl.trim()) throw new Error("Model URL cannot be empty.");
        let baseUrl = rawUrl.trim();
        if (!baseUrl.endsWith("/")) baseUrl += "/";

        if (typeof window.tmImage === "undefined") {
            throw new Error("Teachable Machine library is not loaded yet.");
        }

        this.model = await window.tmImage.load(baseUrl + "model.json", baseUrl + "metadata.json");
        return this.model.getClassLabels();
    }

    async setupWebcam(containerId) {
        if (this.webcam) return;
        const container = document.getElementById(containerId);
        if (!container) throw new Error(`Webcam container with ID ${containerId} not found.`);

        this.webcam = new window.tmImage.Webcam(240, 180, true);
        await this.webcam.setup();
        await this.webcam.play();
        
        container.innerHTML = "";
        container.appendChild(this.webcam.canvas);
    }

    startPredictionLoop(onPredictionCallback) {
        if (!this.model || !this.webcam) return;

        const predictLoop = async () => {
            if (!this.webcam) return;
            try {
                this.webcam.update();
                const predictions = await this.model.predict(this.webcam.canvas);
                onPredictionCallback(predictions);
            } catch (err) {
                console.error("Prediction error:", err);
            }
            this.animationFrameId = requestAnimationFrame(predictLoop);
        };
        this.animationFrameId = requestAnimationFrame(predictLoop);
    }

    stopWebcam() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        if (this.webcam) {
            try { this.webcam.stop(); } catch (err) { console.warn(err); }
            this.webcam = null;
        }
    }
}
