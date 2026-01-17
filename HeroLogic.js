/**
 * HeroLogic: Hero Anchor Mechanic (Hold to Stop) & Multi-Target Scavenger Hunt
 * 
 * This module implements a passive "Brake" mechanic for the Hero agent.
 * The Hero moves naturally with the swarm until the player holds input to freeze it in place.
 * 
 * Architecture:
 * - Core physics runs standard Overdamped dynamics (v ∝ F) for all agents
 * - HeroLogic runs AFTER the core update to lock Hero position when input is active
 * - Tracks 10 target objects {x, y, active} (not agents) for scavenger hunt
 * - Targets are rendered as gold dots and collected when Hero collides with them
 * - Win condition: all 10 targets collected
 */

export class HeroLogic {
    constructor(heroIndex = 0, initialAgent = null, targetAgents = []) {
        this.heroIndex = heroIndex; // Index of the hero agent
        this.prevPos = { x: 0, y: 0 }; // Previous position (locked position when anchored)
        this.isInputActive = false; // Whether input (Space/Touch) is currently active (anchor)
        
        // Multi-target scavenger hunt: track target agent indices {index, active}
        // Targets are agents in the swarm that move with physics
        this.targets = [];
        this.initializeTargets(targetAgents);
        
        // Stamina system
        this.maxStamina = 2.0; // Maximum stamina in seconds
        this.currentStamina = 2.0; // Current stamina (initially full)
        this.isExhausted = false; // Whether stamina is depleted
        
        // Initialize previous position if provided
        if (initialAgent) {
            this.prevPos = { x: initialAgent.x, y: initialAgent.y };
        }
    }
    
    /**
     * Initializes 10 target agents (targets are agents in the swarm)
     * @param {Array} targetAgents - Array of 10 target Agent objects from swarm
     */
    initializeTargets(targetAgents) {
        this.targets = [];
        // Track target agent indices, starting from heroIndex + 1
        const startIndex = this.heroIndex + 1;
        for (let i = 0; i < Math.min(10, targetAgents.length); i++) {
            this.targets.push({
                index: startIndex + i, // Agent index in swarm
                active: true
            });
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
     * Sets the maximum stamina value
     * @param {number} maxStamina - Maximum stamina in seconds (1.0 to 5.0)
     */
    setMaxStamina(maxStamina) {
        this.maxStamina = Math.max(1.0, Math.min(5.0, maxStamina));
        // Clamp current stamina to new max
        if (this.currentStamina > this.maxStamina) {
            this.currentStamina = this.maxStamina;
        }
    }
    
    /**
     * Updates hero position with anchor mechanic and stamina system
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
        
        // Stamina system update
        if (this.isInputActive) {
            if (!this.isExhausted) {
                // Consumption: Input active AND not exhausted
                // Consume stamina and apply halt physics
                this.currentStamina -= deltaTime;
                if (this.currentStamina <= 0) {
                    this.currentStamina = 0;
                    this.isExhausted = true;
                }
                
                // Apply halt physics (only if not exhausted)
                hero.x = this.prevPos.x;
                hero.y = this.prevPos.y;
                hero.vx = 0;
                hero.vy = 0;
            } else {
                // Input active but exhausted - regenerate stamina (input ignored)
                this.currentStamina += deltaTime;
                if (this.currentStamina >= this.maxStamina) {
                    this.currentStamina = this.maxStamina;
                    this.isExhausted = false;
                }
                
                // Allow PhysicsEngine to update Hero position normally (input ignored)
                this.prevPos = { x: hero.x, y: hero.y };
            }
        } else {
            // Recovery: Input inactive
            // Regenerate stamina
            this.currentStamina += deltaTime;
            if (this.currentStamina >= this.maxStamina) {
                this.currentStamina = this.maxStamina;
                this.isExhausted = false;
            }
            
            // Allow PhysicsEngine to update Hero position normally
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
     * Renders all active targets with special styling (gold, standard agent size)
     * @param {CanvasRenderingContext2D} ctx - 2D rendering context
     * @param {Array} agents - Array of Agent objects (includes target agents)
     */
    renderTarget(ctx, agents) {
        // Standard agent radius (4 pixels, same as regular agents)
        const radius = 4;
        
        // Render all active targets (targets are agents in the swarm)
        for (const target of this.targets) {
            if (!target.active) {
                continue; // Skip inactive (collected) targets
            }
            
            // Check if target agent index is valid
            if (target.index >= agents.length) {
                continue;
            }
            
            const targetAgent = agents[target.index];
            
            // Draw target as gold circle
            ctx.fillStyle = 'gold';
            ctx.beginPath();
            ctx.arc(targetAgent.x, targetAgent.y, radius, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw white border to distinguish target
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
    
    /**
     * Checks if hero and any active target are closest to each other and within 3x diameter (12 pixels)
     * @param {Array} agents - Array of Agent objects
     * @param {number} canvasWidth - Canvas width (for toroidal wrapping)
     * @param {number} canvasHeight - Canvas height (for toroidal wrapping)
     * @returns {boolean} - True if should pause (hero and a target are closest and within range)
     */
    checkHeroTargetProximity(agents, canvasWidth, canvasHeight) {
        if (this.heroIndex >= agents.length) {
            return false;
        }
        
        const hero = agents[this.heroIndex];
        
        // Check proximity with all active targets (targets are agents in the swarm)
        for (const target of this.targets) {
            if (!target.active) {
                continue; // Skip inactive targets
            }
            
            // Check if target agent index is valid
            if (target.index >= agents.length) {
                continue;
            }
            
            const targetAgent = agents[target.index];
            
            // Calculate distance with toroidal wrapping
            let dx = targetAgent.x - hero.x;
            let dy = targetAgent.y - hero.y;
            
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
                continue; // Check next target
            }
            
            // Check if hero and this target are closest to each other
            // (no other agent is closer to hero than this target, and vice versa)
            let heroToTargetIsClosest = true;
            let targetToHeroIsClosest = true;
            
            for (let i = 0; i < agents.length; i++) {
                if (i === this.heroIndex) {
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
                let dxTarget = other.x - targetAgent.x;
                let dyTarget = other.y - targetAgent.y;
                if (Math.abs(dxTarget) > canvasWidth / 2) {
                    dxTarget = dxTarget > 0 ? dxTarget - canvasWidth : dxTarget + canvasWidth;
                }
                if (Math.abs(dyTarget) > canvasHeight / 2) {
                    dyTarget = dyTarget > 0 ? dyTarget - canvasHeight : dyTarget + canvasHeight;
                }
                const distTargetToOther = Math.sqrt(dxTarget * dxTarget + dyTarget * dyTarget);
                
                // If any other agent is closer to hero than this target, hero-to-target is not closest
                if (distHeroToOther < distance) {
                    heroToTargetIsClosest = false;
                }
                
                // If any other agent is closer to target than hero, target-to-hero is not closest
                if (distTargetToOther < distance) {
                    targetToHeroIsClosest = false;
                }
            }
            
            // If this target is closest to hero and within range, pause
            if (heroToTargetIsClosest && targetToHeroIsClosest) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Checks if Hero has collected any targets and updates target states
     * Win condition: all targets collected (activeTargets.length == 0)
     * @param {Array} agents - Array of Agent objects (includes target agents)
     * @param {number} canvasWidth - Canvas width (for toroidal wrapping)
     * @param {number} canvasHeight - Canvas height (for toroidal wrapping)
     * @returns {boolean} - True if all targets collected (win condition met)
     */
    checkWinCondition(agents, canvasWidth, canvasHeight) {
        if (this.heroIndex >= agents.length) {
            return false;
        }
        
        const hero = agents[this.heroIndex];
        const HERO_RADIUS = 4;
        const TARGET_RADIUS = 4;
        const COLLISION_DISTANCE = HERO_RADIUS + TARGET_RADIUS;
        
        // Check collision with all active targets (targets are agents in the swarm)
        for (const target of this.targets) {
            if (!target.active) {
                continue; // Skip already collected targets
            }
            
            // Check if target agent index is valid
            if (target.index >= agents.length) {
                continue;
            }
            
            const targetAgent = agents[target.index];
            
            // Calculate distance with toroidal wrapping
            let dx = targetAgent.x - hero.x;
            let dy = targetAgent.y - hero.y;
            
            // Handle toroidal wrapping
            if (Math.abs(dx) > canvasWidth / 2) {
                dx = dx > 0 ? dx - canvasWidth : dx + canvasWidth;
            }
            if (Math.abs(dy) > canvasHeight / 2) {
                dy = dy > 0 ? dy - canvasHeight : dy + canvasHeight;
            }
            
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check collision: distance < (Radius_H + Radius_T)
            if (distance < COLLISION_DISTANCE) {
                // Mark target as collected (inactive)
                target.active = false;
                console.log(`Target collected! ${this.getActiveTargetCount()} targets remaining.`);
            }
        }
        
        // Win condition: all targets collected
        return this.getActiveTargetCount() === 0;
    }
    
    /**
     * Gets the count of active (uncollected) targets
     * @returns {number} - Number of active targets
     */
    getActiveTargetCount() {
        return this.targets.filter(t => t.active).length;
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
    
    /**
     * Renders the stamina bar at the top of the screen using the same color spectrum as agent phases
     * @param {CanvasRenderingContext2D} ctx - 2D rendering context
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     */
    renderStaminaBar(ctx, canvasWidth, canvasHeight) {
        const barHeight = 8;
        const barY = 0; // Top of screen
        
        // Calculate bar width based on stamina percentage
        const staminaPercent = this.currentStamina / this.maxStamina;
        const barWidth = staminaPercent * canvasWidth;
        
        // Use the same color spectrum as agent phases: low-saturation red-blue-purple
        // Agent phase mapping: Red (360°) → Purple (300°) → Blue (240°) → Red (0°)
        // We'll map stamina from full (Red 360°) to empty (Blue 240°)
        // Create gradient for the full bar width (not canvas width)
        const gradient = ctx.createLinearGradient(0, barY, canvasWidth, barY);
        
        // Low saturation (30%) like agent colors
        const saturation = 0.3;
        const lightness = 0.5;
        
        // Helper function to convert HSL to RGB (same as Agent.updateColor)
        const hslToRgb = (h, s, l) => {
            let r, g, b;
            if (s === 0) {
                r = g = b = l;
            } else {
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1/6) return p + (q - p) * 6 * t;
                    if (t < 1/2) return q;
                    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                };
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                r = hue2rgb(p, q, h + 1/3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1/3);
            }
            return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
        };
        
        // Add color stops matching agent phase colors
        // Full stamina (stop 0) = Red (360°), Empty stamina (stop 1) = Blue (240°)
        // Map through: Red (360°) → Purple (300°) → Blue (240°)
        const numStops = 20;
        for (let i = 0; i <= numStops; i++) {
            const t = i / numStops; // 0 (full) to 1 (empty)
            let hue;
            
            if (t < 1/2) {
                // First half: Red (360°) to Purple (300°)
                const localT = t * 2; // 0 to 1
                hue = 360 - localT * 60; // 360° → 300°
            } else {
                // Second half: Purple (300°) to Blue (240°)
                const localT = (t - 0.5) * 2; // 0 to 1
                hue = 300 - localT * 60; // 300° → 240°
            }
            
            const [r, g, b] = hslToRgb(hue / 360, saturation, lightness);
            gradient.addColorStop(t, `rgb(${r}, ${g}, ${b})`);
        }
        
        // Draw background (full width, dark gray)
        ctx.fillStyle = 'rgba(32, 32, 32, 0.5)';
        ctx.fillRect(0, barY, canvasWidth, barHeight);
        
        // If exhausted, render semi-transparent/grayed out
        if (this.isExhausted) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
            ctx.fillRect(0, barY, barWidth, barHeight);
        } else {
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = gradient;
            // Draw only the portion corresponding to current stamina
            ctx.fillRect(0, barY, barWidth, barHeight);
        }
        
        // Add white glow when recovering from exhaustion
        // Check if we're recovering: input inactive and stamina is regenerating (not at max)
        const isRecovering = !this.isInputActive && this.currentStamina < this.maxStamina && this.currentStamina > 0;
        if (isRecovering) {
            // Draw a low-saturation white glow behind the bar
            ctx.save();
            ctx.globalAlpha = 0.3;
            // Create a subtle white glow effect
            for (let i = 0; i < 3; i++) {
                ctx.fillStyle = `rgba(255, 255, 255, ${0.1 - i * 0.03})`;
                ctx.fillRect(0, barY - i, barWidth, barHeight + i * 2);
            }
            ctx.restore();
        }
        
        // Reset global alpha
        ctx.globalAlpha = 1.0;
        
        // Draw border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, barY, canvasWidth, barHeight);
    }
}
