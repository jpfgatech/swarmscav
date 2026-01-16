/**
 * HeroLogic: Hero Anchor Mechanic (Hold to Stop)
 * 
 * This module implements a passive "Brake" mechanic for the Hero agent.
 * The Hero moves naturally with the swarm until the player holds input to freeze it in place.
 * 
 * Architecture:
 * - Core physics runs standard Overdamped dynamics (v ∝ F) for all agents
 * - HeroLogic runs AFTER the core update to lock Hero position when input is active
 * - Target agent (index 1) is rendered as gold and used for proximity pause
 */

export class HeroLogic {
    constructor(heroIndex = 0, initialAgent = null) {
        this.heroIndex = heroIndex; // Index of the hero agent
        this.prevPos = { x: 0, y: 0 }; // Previous position (locked position when anchored)
        this.isInputActive = false; // Whether input (Space/Touch) is currently active (anchor)
        this.targetIndex = 1; // Index of the target agent (default: agent at index 1)
        
        // Initialize previous position if provided
        if (initialAgent) {
            this.prevPos = { x: initialAgent.x, y: initialAgent.y };
        }
    }
    
    /**
     * Sets the input state (Space key or touch) - activates anchor
     * @param {boolean} active - Whether input is active (anchor active)
     */
    setInputActive(active) {
        this.isInputActive = active;
    }
    
    /**
     * Updates hero position with anchor mechanic
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
        
        if (this.isInputActive) {
            // Anchor active: Lock position and stop velocity
            // Force Hero.velocity = (0, 0) and Hero.pos = Hero.prevPos
            hero.x = this.prevPos.x;
            hero.y = this.prevPos.y;
            hero.vx = 0;
            hero.vy = 0;
        } else {
            // Anchor inactive: Allow PhysicsEngine to update Hero position normally
            // Update previous position for next frame (for anchor lock)
            this.prevPos = { x: hero.x, y: hero.y };
        }
    }
    
    /**
     * Renders the hero agent with phase-based color (standard agent size)
     * @param {CanvasRenderingContext2D} ctx - 2D rendering context
     * @param {Array} agents - Array of Agent objects
     */
    renderHero(ctx, agents) {
        if (this.heroIndex >= agents.length) {
            return; // Hero index out of bounds
        }
        
        const hero = agents[this.heroIndex];
        
        // Standard agent radius (4 pixels, same as regular agents)
        const radius = 4;
        
        // Draw hero with phase-based color (like regular agents)
        // Use agent's color property which is updated based on phase
        ctx.fillStyle = hero.color;
        ctx.beginPath();
        ctx.arc(hero.x, hero.y, radius, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw white border to distinguish hero
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    /**
     * Renders the target agent with special styling (gold, standard agent size)
     * @param {CanvasRenderingContext2D} ctx - 2D rendering context
     * @param {Array} agents - Array of Agent objects
     */
    renderTarget(ctx, agents) {
        if (this.targetIndex >= agents.length) {
            return; // Target index out of bounds
        }
        
        const target = agents[this.targetIndex];
        
        // Standard agent radius (4 pixels, same as regular agents)
        const radius = 4;
        
        // Draw target as gold circle
        ctx.fillStyle = 'gold';
        ctx.beginPath();
        ctx.arc(target.x, target.y, radius, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw white border to distinguish target
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    /**
     * Checks if hero and target are closest to each other and within 3x diameter (24 pixels)
     * @param {Array} agents - Array of Agent objects
     * @param {number} canvasWidth - Canvas width (for toroidal wrapping)
     * @param {number} canvasHeight - Canvas height (for toroidal wrapping)
     * @returns {boolean} - True if should pause (hero and target are closest and within range)
     */
    checkHeroTargetProximity(agents, canvasWidth, canvasHeight) {
        if (this.heroIndex >= agents.length || this.targetIndex >= agents.length) {
            return false;
        }
        
        const hero = agents[this.heroIndex];
        const target = agents[this.targetIndex];
        
        // Calculate distance with toroidal wrapping
        let dx = target.x - hero.x;
        let dy = target.y - hero.y;
        
        // Handle toroidal wrapping
        if (Math.abs(dx) > canvasWidth / 2) {
            dx = dx > 0 ? dx - canvasWidth : dx + canvasWidth;
        }
        if (Math.abs(dy) > canvasHeight / 2) {
            dy = dy > 0 ? dy - canvasHeight : dy + canvasHeight;
        }
        
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 12; // 3x diameter (3 * 4 pixels, standard agent size)
        
        // Check if within range
        if (distance > maxDistance) {
            return false;
        }
        
        // Check if hero and target are closest to each other
        // (no other agent is closer to hero than target, and vice versa)
        let heroToTargetIsClosest = true;
        let targetToHeroIsClosest = true;
        
        for (let i = 0; i < agents.length; i++) {
            if (i === this.heroIndex || i === this.targetIndex) {
                continue;
            }
            
            const other = agents[i];
            
            // Check distance from hero to other agent
            let dxHero = other.x - hero.x;
            let dyHero = other.y - hero.y;
            if (Math.abs(dxHero) > canvasWidth / 2) {
                dxHero = dxHero > 0 ? dxHero - canvasWidth : dxHero + canvasWidth;
            }
            if (Math.abs(dyHero) > canvasHeight / 2) {
                dyHero = dyHero > 0 ? dyHero - canvasHeight : dyHero + canvasHeight;
            }
            const distHeroToOther = Math.sqrt(dxHero * dxHero + dyHero * dyHero);
            
            // Check distance from target to other agent
            let dxTarget = other.x - target.x;
            let dyTarget = other.y - target.y;
            if (Math.abs(dxTarget) > canvasWidth / 2) {
                dxTarget = dxTarget > 0 ? dxTarget - canvasWidth : dxTarget + canvasWidth;
            }
            if (Math.abs(dyTarget) > canvasHeight / 2) {
                dyTarget = dyTarget > 0 ? dyTarget - canvasHeight : dyTarget + canvasHeight;
            }
            const distTargetToOther = Math.sqrt(dxTarget * dxTarget + dyTarget * dyTarget);
            
            // If any other agent is closer to hero than target, hero-to-target is not closest
            if (distHeroToOther < distance) {
                heroToTargetIsClosest = false;
            }
            
            // If any other agent is closer to target than hero, target-to-hero is not closest
            if (distTargetToOther < distance) {
                targetToHeroIsClosest = false;
            }
        }
        
        // Pause if they are closest to each other and within range
        return heroToTargetIsClosest && targetToHeroIsClosest;
    }
    
    /**
     * Checks if Hero has reached Target (win condition)
     * Win condition: distance < (Radius_H + Radius_T)
     * Hero and Target both have radius 6 pixels, so collision distance = 12 pixels
     * @param {Array} agents - Array of Agent objects
     * @param {number} canvasWidth - Canvas width (for toroidal wrapping)
     * @param {number} canvasHeight - Canvas height (for toroidal wrapping)
     * @returns {boolean} - True if Hero has reached Target (win condition met)
     */
    checkWinCondition(agents, canvasWidth, canvasHeight) {
        if (this.heroIndex >= agents.length || this.targetIndex >= agents.length) {
            return false;
        }
        
        const hero = agents[this.heroIndex];
        const target = agents[this.targetIndex];
        
        // Calculate distance with toroidal wrapping
        let dx = target.x - hero.x;
        let dy = target.y - hero.y;
        
        // Handle toroidal wrapping
        if (Math.abs(dx) > canvasWidth / 2) {
            dx = dx > 0 ? dx - canvasWidth : dx + canvasWidth;
        }
        if (Math.abs(dy) > canvasHeight / 2) {
            dy = dy > 0 ? dy - canvasHeight : dy + canvasHeight;
        }
        
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Win condition: distance < (Radius_H + Radius_T)
        // Hero radius = 4, Target radius = 4 (standard agent size), so collision distance = 8 pixels
        const HERO_RADIUS = 4;
        const TARGET_RADIUS = 4;
        const COLLISION_DISTANCE = HERO_RADIUS + TARGET_RADIUS;
        
        return distance < COLLISION_DISTANCE;
    }
    
    /**
     * Gets the hero index
     * @returns {number} Hero agent index
     */
    getHeroIndex() {
        return this.heroIndex;
    }
    
    /**
     * Sets the previous position (used for teleport to prevent velocity jump)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    setPrevPos(x, y) {
        this.prevPos = { x, y };
    }
}
