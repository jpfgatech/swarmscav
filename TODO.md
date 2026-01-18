- [ ] **Refactor: Viewport Scaling Layer (Virtual Resolution)**
    - *Goal*: Decouple physics coordinates from screen pixels to ensure consistent gameplay across all devices (Desktop vs. Mobile).
    - *Architecture*: Introduce `ViewportManager.js` as the bridge between `Input/Renderer` and `PhysicsEngine`.
    - *Logic*:
        1.  **Config**: Define `LOGICAL_WIDTH = 1000` and `LOGICAL_HEIGHT = 1000` (or your preferred aspect ratio) in `Config.js`.
        2.  **ViewportManager**:
            -   Method `resize(screenWidth, screenHeight)`:
                -   Calculate `scale = Math.min(screenW / LOGICAL_W, screenH / LOGICAL_H)`.
                -   Calculate centering offsets: `offsetX = (screenW - LOGICAL_W * scale) / 2`.
            -   Method `project(x, y)`: Returns screen coordinates (for drawing).
            -   Method `unproject(screenX, screenY)`: Returns logical coordinates (for mouse clicks).
        3.  **Update Renderer**:
            -   Use `ctx.translate(offsetX, offsetY)` and `ctx.scale(scale, scale)` before drawing the frame.
            -   Draw everything using `LOGICAL` coordinates.
        4.  **Update Input**:
            -   Wrap mouse/touch events: `logicalPos = viewport.unproject(e.clientX, e.clientY)`.
            -   Pass these *corrected* coordinates to the Teleport/Hold logic.
    - *Verify*:
        1.  Resize your browser window aggressively (make it tall and skinny).
        2.  The game should shrink to fit but keep the square aspect ratio (letterboxed).
        3.  Clicking on an agent should still work accurately despite the scaling.

