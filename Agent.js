/**
 * Agent class representing a single swarmalator unit
 */
export class Agent {
    /**
     * @param {number} canvasWidth - Width of the canvas
     * @param {number} canvasHeight - Height of the canvas
     * @param {number} baseOmega - Common base intrinsic frequency
     * @param {number} omegaVariation - Random variation range for omega
     */
    constructor(canvasWidth, canvasHeight, baseOmega, omegaVariation) {
        // Spatial state: random position within canvas bounds
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        
        // Velocity state: initialized to zero (overdamped model: velocity = force)
        this.vx = 0;
        this.vy = 0;
        
        // Phase state: random initial phase and natural frequency
        this.theta = Math.random() * 2 * Math.PI; // Phase [0, 2π]
        // Natural frequency: base + random variation
        this.omega = baseOmega + (Math.random() - 0.5) * 2 * omegaVariation; // [baseOmega - variation, baseOmega + variation]
        
        // Acceleration state (initialized to zero, updated each frame)
        this.ax = 0;
        this.ay = 0;
        
        // Phase derivative (dtheta/dt) - calculated each frame
        this.dtheta_dt = 0;
        
        // Color will be updated dynamically based on phase
        this.color = '';
        this.updateColor();
    }
    
    /**
     * Updates the color property based on current phase
     * Maps phase [0, 2π] to red-blue-purple only (no yellow, cyan, green)
     */
    updateColor() {
        // Map phase [0, 2π] to hue: Red (0°) → Purple (300°) → Blue (240°) → Red (0°)
        // This avoids yellow, green, and cyan by going the "long way" around the color wheel
        const normalizedPhase = this.theta / (2 * Math.PI); // [0, 1]
        let hue;
        
        if (normalizedPhase < 1/3) {
            // First third: Red (0°) to Purple (300°) - going backwards
            hue = 360 - normalizedPhase * 3 * 60; // 360° → 300°
        } else if (normalizedPhase < 2/3) {
            // Second third: Purple (300°) to Blue (240°)
            const t = (normalizedPhase - 1/3) * 3;
            hue = 300 - t * 60; // 300° → 240°
        } else {
            // Last third: Blue (240°) to Red (0°) - going through purple (270-300°)
            const t = (normalizedPhase - 2/3) * 3; // t goes from 0 to 1
            // Go from 240° up to 360° (0°): 240° → 270° → 300° → 330° → 360° (0°)
            hue = 240 + t * 120; // 240° → 360° (which wraps to 0°)
            if (hue >= 360) hue = hue % 360;
        }
        
        // Low saturation (30%) and medium lightness (60%)
        this.color = `hsl(${hue}, 30%, 60%)`;
    }
    
    /**
     * Updates position using overdamped dynamics (Aristotelian motion)
     * Reference: velocity = force directly (no momentum/inertia)
     * Also updates phase based on phase derivative
     * @param {number} deltaTime - Time step for integration
     * @param {number} canvasWidth - Width of the canvas
     * @param {number} canvasHeight - Height of the canvas
     */
    update(deltaTime, canvasWidth, canvasHeight) {
        // Overdamped dynamics: velocity = force (no accumulation, no momentum)
        // This is Aristotelian motion, not Newtonian
        // The system naturally stops when forces balance (no need for damping)
        this.vx = this.ax; // Velocity is directly set to force
        this.vy = this.ay;
        
        // Update position: r = r + v * dt = r + F * dt
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        // Update phase: θ = θ + dθ/dt * dt
        this.theta += this.dtheta_dt * deltaTime;
        
        // Wrap phase to [0, 2π]
        while (this.theta < 0) this.theta += 2 * Math.PI;
        while (this.theta >= 2 * Math.PI) this.theta -= 2 * Math.PI;
        
        // Toroidal boundary wrapping
        if (this.x < 0) this.x += canvasWidth;
        if (this.x >= canvasWidth) this.x -= canvasWidth;
        if (this.y < 0) this.y += canvasHeight;
        if (this.y >= canvasHeight) this.y -= canvasHeight;
        
        // Reset acceleration and phase derivative for next frame
        this.ax = 0;
        this.ay = 0;
        this.dtheta_dt = 0;
    }
    
    /**
     * Adds a phase derivative contribution
     * @param {number} dtheta - Phase derivative contribution
     */
    addPhaseDerivative(dtheta) {
        this.dtheta_dt += dtheta;
    }
    
    /**
     * Adds a force to the agent's acceleration
     * @param {number} fx - Force component in x direction
     * @param {number} fy - Force component in y direction
     */
    addForce(fx, fy) {
        this.ax += fx;
        this.ay += fy;
    }
    
    /**
     * Renders the agent on the canvas
     * @param {CanvasRenderingContext2D} ctx - 2D rendering context
     */
    draw(ctx) {
        // Draw the agent body as a filled circle (proportional to canvas size)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, 2 * Math.PI);
        ctx.fill();
    }
}
