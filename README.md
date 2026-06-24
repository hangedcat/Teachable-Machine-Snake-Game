## AI-Powered Gesture-Controlled Snake

A high-fidelity, premium browser-based Snake game written in vanilla JavaScript and HTML5 Canvas. The game is controllable via standard keyboard inputs or real-time webcam gestures using a custom-trained **Google Teachable Machine** image classification model powered by **TensorFlow.js**.

## 🛠️ Tech Stack & Libraries
- **Graphics:** HTML5 Canvas API
- **Styling:** Custom CSS (Modern Glassmorphism & HSL Color Palettes)
- **Audio:** Web Audio API (real-time sound synthesis, no static audio assets)
- **Machine Learning:** TensorFlow.js (`@tensorflow/tfjs`) & Teachable Machine Image Classifier (`@teachablemachine/image`)

---

## 🧬 Data Structures Used

### 1. Double-Ended Queue (Deque / FIFO Queue)
The snake's body is represented as a dynamic list (array) of coordinate objects:
`[{ x, y }, { x, y }, ...]`
- **Movement (Shift & Push):** On each game tick, we compute the coordinates of the new head based on the current direction vector and insert it at the front of the array ($O(1)$ amortized insert using `unshift`).
- **Tail Removal (Pop):** If the snake does not eat food, the tail segment is removed from the end of the array using `pop()`. This effectively models a first-in, first-out (FIFO) queue representing the snake's path.

### 2. 2D Coordinate Vectors
Positions of the food, snake segments, and moving velocities are modeled as 2D spatial vectors `{ x: integer, y: integer }`. Grid calculations dynamically scale these vector positions to absolute pixels on the screen.

### 3. Particle Pool (Dynamic Array)
For the particle explosion when food is consumed, particles are managed in a dynamic list where decaying elements are spliced out of memory once their alpha opacity hits zero.

---

## 🧮 Algorithms Implemented

### 1. Self-Collision & Spawn Auditing (Linear Search)
To check if the snake has run into itself or if food is spawning on top of the snake's body:
- **Collision:** We slice the head of the snake and use a linear search helper (`.some()`) to iterate through the body elements to verify that the next head coordinate does not match any existing body coordinate. This runs in $O(N)$ time complexity where $N$ is the length of the snake.
- **Valid Food Spawn:** When food is eaten, the coordinates of the new food are randomly generated. A loop audits these coordinates against all elements of the snake array to ensure the food never spawns inside the snake.

### 2. Direction Change Debouncing
To prevent instantaneous 180-degree self-collisions (e.g. attempting to move directly left while currently moving right), the input system queues the next direction and audits it against the current heading vector before allowing the change to take place.

### 3. State Machine Control Flow
The game loop transitions through defined states: `IDLE` ➔ `PLAYING` ➔ `PAUSED` ➔ `GAME_OVER`. Audio synthesizers and canvas drawing loops listen to state changes to switch rendering modes dynamically.

---

## 🚀 How to Run locally

Since the webcam features require a secure context (HTTPS or Localhost):

1. Clone or download this repository.
2. Run a local development server in the project directory:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Or using Node.js
   npx serve
