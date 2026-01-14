/**
 * HeroLogic: Player-controlled inertia for a Hero agent
 * 
 * This module implements script-level override for a Hero agent without
 * modifying the core Physics Engine. The Hero agent has inertia (momentum)
 * that can be controlled via input (Space/Touch), while all other agents
 * follow standard Overdamped dynamics.
 * 
 * Architecture:
 * - Core physics runs standard Overdamped dynamics (v ∝ F) for all agents
 * - HeroLogic runs AFTER the core update to override Hero's position with blended velocity
 */

export class HeroLogic {
    constructor(heroIndex = 0, initialAgent = null) {
        this.heroIndex = heroIndex; // Index of the hero agent
        this.heroVelocity = { x: 0, y: 0 }; // Hero's velocity (momentum)
        this.prevPos = { x: 0, y: 0 }; // Previous position for velocity calculation
        this.isInputActive = false; // Whether input (Space/Touch) is currently active
        this.alpha = 0.95; // Inertia blending factor (0.0 = no inertia, 0.99 = max inertia)
        
        // Initialize previous position if provided
        if (initialAgent) {
            this.prevPos = { x: initialAgent.x, y: initialAgent.y };
        }
    }
    
    /**
     * Sets the input state (Space key or touch)
     * @param {boolean} active - Whether input is active
     */
    setInputActive(active) {
        this.isInputActive = active;
    }
    
    /**
     * Sets the inertia alpha parameter
     * @param {number} alpha - Blending factor (0.0 to 0.99)
     */
    setAlpha(alpha) {
        this.alpha = Math.max(0.0, Math.min(0.99, alpha));
    }
    
    /**
     * Updates hero position with inertia override
     * This should be called AFTER physics update (agent.update())
     * @param {Array} agents - Array of Agent objects
     * @param {number} deltaTime - Time step
     * @param {number} canvasWidth - Canvas width (for boundary wrapping)
     * @param {number} canvasHeight - Canvas height (for boundary wrapping)
     */
    update(agents, deltaTime, canvasWidth, canvasHeight) {
        if (this.heroIndex >= agents.length) {
            return; // Hero index out of bounds
        }
        
        const hero = agents[this.heroIndex];
        const currentPos = { x: hero.x, y: hero.y };
        
        // Calculate engine velocity (from physics update)
        // Handle toroidal wrapping for velocity calculation
        let dx = currentPos.x - this.prevPos.x;
        let dy = currentPos.y - this.prevPos.y;
        
        // Handle toroidal wrapping
        if (Math.abs(dx) > canvasWidth / 2) {
            dx = dx > 0 ? dx - canvasWidth : dx + canvasWidth;
        }
        if (Math.abs(dy) > canvasHeight / 2) {
            dy = dy > 0 ? dy - canvasHeight : dy + canvasHeight;
        }
        
        const engineVelocity = {
            x: dx / deltaTime,
            y: dy / deltaTime
        };
        
        if (this.isInputActive) {
            // Input active: Blend engine velocity with hero velocity (inertia)
            const blendedVelocity = {
                x: (1 - this.alpha) * engineVelocity.x + this.alpha * this.heroVelocity.x,
                y: (1 - this.alpha) * engineVelocity.y + this.alpha * this.heroVelocity.y
            };
            
            // Override position: newPos = prevPos + blendedVelocity * dt
            let newX = this.prevPos.x + blendedVelocity.x * deltaTime;
            let newY = this.prevPos.y + blendedVelocity.y * deltaTime;
            
            // Handle toroidal boundary wrapping
            if (newX < 0) newX += canvasWidth;
            if (newX >= canvasWidth) newX -= canvasWidth;
            if (newY < 0) newY += canvasHeight;
            if (newY >= canvasHeight) newY -= canvasHeight;
            
            // Update hero position
            hero.x = newX;
            hero.y = newY;
            
            // Update hero velocity for next frame
            this.heroVelocity = blendedVelocity;
        } else {
            // No input: Sync hero velocity with engine velocity
            this.heroVelocity = engineVelocity;
        }
        
        // Update previous position for next frame
        this.prevPos = { x: hero.x, y: hero.y };
    }
    
    /**
     * Renders the hero agent with special styling (cyan)
     * @param {CanvasRenderingContext2D} ctx - 2D rendering context
     * @param {Array} agents - Array of Agent objects
     */
    renderHero(ctx, agents) {
        if (this.heroIndex >= agents.length) {
            return; // Hero index out of bounds
        }
        
        const hero = agents[this.heroIndex];
        
        // Draw hero as cyan circle (slightly larger than regular agents)
        ctx.fillStyle = 'cyan';
        ctx.beginPath();
        ctx.arc(hero.x, hero.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw white border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    /**
     * Gets the hero index
     * @returns {number} Hero agent index
     */
    getHeroIndex() {
        return this.heroIndex;
    }
}
