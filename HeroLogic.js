/**
 * HeroLogic: Player-controlled boost for a Hero agent
 * 
 * This module implements script-level override for a Hero agent without
 * modifying the core Physics Engine. The Hero agent can boost along its
 * natural trajectory when input (Space/Touch) is active, while all other
 * agents follow standard Overdamped dynamics.
 * 
 * Architecture:
 * - Core physics runs standard Overdamped dynamics (v ∝ F) for all agents
 * - HeroLogic runs AFTER the core update to override Hero's position with boost
 * - Target agent (index 1) is rendered as gold and used for proximity pause
 */

export class HeroLogic {
    constructor(heroIndex = 0, initialAgent = null) {
        this.heroIndex = heroIndex; // Index of the hero agent
        this.prevPos = { x: 0, y: 0 }; // Previous position for velocity calculation
        this.isInputActive = false; // Whether input (Space/Touch) is currently active
        this.boostAlpha = 1.0; // Boost multiplier (1.0 = normal speed, 16.0 = 17x speed)
        this.isBoosting = false; // Whether currently boosting (for visual feedback)
        this.targetIndex = 1; // Index of the target agent (default: agent at index 1)
        
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
     * Sets the boost alpha parameter
     * @param {number} boostAlpha - Boost multiplier (1.0 to 16.0)
     */
    setBoostAlpha(boostAlpha) {
        this.boostAlpha = Math.max(1.0, Math.min(16.0, boostAlpha));
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
        
        // Calculate natural step (displacement from physics update)
        // Handle toroidal wrapping for step calculation
        let dx = currentPos.x - this.prevPos.x;
        let dy = currentPos.y - this.prevPos.y;
        
        // Handle toroidal wrapping
        if (Math.abs(dx) > canvasWidth / 2) {
            dx = dx > 0 ? dx - canvasWidth : dx + canvasWidth;
        }
        if (Math.abs(dy) > canvasHeight / 2) {
            dy = dy > 0 ? dy - canvasHeight : dy + canvasHeight;
        }
        
        const naturalStep = {
            x: dx,
            y: dy
        };
        
        if (this.isInputActive) {
            // Turbo Boost mode: Move faster along natural trajectory
            this.isBoosting = true;
            // boostStep = naturalStep * boostAlpha (boostAlpha is 1.0 to 16.0)
            const boostStep = {
                x: naturalStep.x * this.boostAlpha,
                y: naturalStep.y * this.boostAlpha
            };
            
            // Override position: HeroNewPos = HeroPrevPos + boostStep
            let newX = this.prevPos.x + boostStep.x;
            let newY = this.prevPos.y + boostStep.y;
            
            // Handle toroidal boundary wrapping
            if (newX < 0) newX += canvasWidth;
            if (newX >= canvasWidth) newX -= canvasWidth;
            if (newY < 0) newY += canvasHeight;
            if (newY >= canvasHeight) newY -= canvasHeight;
            
            // Update hero position
            hero.x = newX;
            hero.y = newY;
        } else {
            // No input: Hero follows physics normally
            this.isBoosting = false;
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
        
        // Base radius
        let radius = 6;
        
        // Pulse size when boosting (visual feedback)
        if (this.isBoosting) {
            // Pulse effect: slightly larger when boosting (scales with boostAlpha)
            const pulseFactor = 1.0 + ((this.boostAlpha - 1.0) / 15.0) * 0.3; // Up to 30% larger at max boost
            radius = 6 * pulseFactor;
        }
        
        // Draw hero as cyan circle
        ctx.fillStyle = 'cyan';
        ctx.beginPath();
        ctx.arc(hero.x, hero.y, radius, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw white border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    /**
     * Renders the target agent with special styling (gold)
     * @param {CanvasRenderingContext2D} ctx - 2D rendering context
     * @param {Array} agents - Array of Agent objects
     */
    renderTarget(ctx, agents) {
        if (this.targetIndex >= agents.length) {
            return; // Target index out of bounds
        }
        
        const target = agents[this.targetIndex];
        
        // Draw target as gold circle (slightly larger than regular agents)
        ctx.fillStyle = 'gold';
        ctx.beginPath();
        ctx.arc(target.x, target.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw white border
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
        const maxDistance = 24; // 3x diameter (3 * 8 pixels)
        
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
     * Gets the hero index
     * @returns {number} Hero agent index
     */
    getHeroIndex() {
        return this.heroIndex;
    }
}
