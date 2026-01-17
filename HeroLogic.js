import { renderGodRays } from './GlowRenderer.js';
import { GlowConfig } from './glowConfig.js';

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
        
        // Dual-channel input system
        // Channel A (Hero): Spacebar (Web) / Left-Side Tap (Mobile)
        // Channel B (Targets): Ctrl Key (Web) / Right-Side Tap (Mobile)
        this.isChannelAActive = false; // Whether Channel A (Hero) is active
        this.isChannelBActive = false; // Whether Channel B (Targets) is active
        
        // Multi-target scavenger hunt: track target agent indices {index, active}
        // Targets are agents in the swarm that move with physics
        this.targets = [];
        this.initializeTargets(targetAgents);
        
        // Demon entities: track demon agent indices {index}
        // Demons are agents in the swarm that move with physics
        // Initially empty (can be populated later)
        this.activeDemons = [];
        
        // Shared stamina system (common resource for both channels)
        this.maxStamina = 2.0; // Maximum stamina in seconds
        this.currentStamina = 2.0; // Current stamina (initially full)
        this.isExhausted = false; // Whether stamina is depleted
        
        // Store previous positions for targets and demons (for Channel B freeze)
        this.targetPrevPositions = new Map();
        this.demonPrevPositions = new Map();
        
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
     * Sets Channel A state (Hero anchor) - Spacebar / Left-side touch
     * @param {boolean} active - Whether Channel A is active
     */
    setChannelAActive(active) {
        this.isChannelAActive = active;
    }
    
    /**
     * Sets Channel B state (Target freeze) - Ctrl key / Right-side touch
     * @param {boolean} active - Whether Channel B is active
     */
    setChannelBActive(active) {
        this.isChannelBActive = active;
    }
    
    /**
     * Legacy method for backward compatibility (maps to Channel A)
     * @param {boolean} active - Whether input is active
     */
    setInputActive(active) {
        this.setChannelAActive(active);
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
     * Updates hero and target positions with dual-channel anchor mechanic and shared stamina system
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
        
        // Shared stamina system: drain if either channel is active (at 1x rate)
        const anyChannelActive = this.isChannelAActive || this.isChannelBActive;
        
        if (anyChannelActive) {
            if (!this.isExhausted) {
                // Consumption: Any channel active AND not exhausted
                // Consume stamina at 1x rate (holding both doesn't drain faster)
                this.currentStamina -= deltaTime;
                if (this.currentStamina <= 0) {
                    this.currentStamina = 0;
                    this.isExhausted = true;
                }
                
                // Apply halt physics based on active channels (only if not exhausted)
                
                // Channel A: Freeze Hero
                if (this.isChannelAActive) {
                    hero.x = this.prevPos.x;
                    hero.y = this.prevPos.y;
                    hero.vx = 0;
                    hero.vy = 0;
                } else {
                    // Update previous position for next frame
                    this.prevPos = { x: hero.x, y: hero.y };
                }
                
                // Channel B: Freeze all active targets AND demons
                if (this.isChannelBActive) {
                    // Freeze targets
                    for (const target of this.targets) {
                        if (!target.active) {
                            continue; // Skip inactive targets
                        }
                        
                        if (target.index >= agents.length) {
                            continue;
                        }
                        
                        const targetAgent = agents[target.index];
                        
                        // Store previous position if not already stored
                        if (!this.targetPrevPositions.has(target.index)) {
                            this.targetPrevPositions.set(target.index, { x: targetAgent.x, y: targetAgent.y });
                        }
                        
                        const prevPos = this.targetPrevPositions.get(target.index);
                        targetAgent.x = prevPos.x;
                        targetAgent.y = prevPos.y;
                        targetAgent.vx = 0;
                        targetAgent.vy = 0;
                    }
                    
                    // Freeze demons
                    for (const demon of this.activeDemons) {
                        if (demon.index >= agents.length) {
                            continue;
                        }
                        
                        const demonAgent = agents[demon.index];
                        
                        // Store previous position if not already stored
                        if (!this.demonPrevPositions.has(demon.index)) {
                            this.demonPrevPositions.set(demon.index, { x: demonAgent.x, y: demonAgent.y });
                        }
                        
                        const prevPos = this.demonPrevPositions.get(demon.index);
                        demonAgent.x = prevPos.x;
                        demonAgent.y = prevPos.y;
                        demonAgent.vx = 0;
                        demonAgent.vy = 0;
                    }
                } else {
                    // Update previous positions for targets
                    for (const target of this.targets) {
                        if (!target.active || target.index >= agents.length) {
                            continue;
                        }
                        const targetAgent = agents[target.index];
                        this.targetPrevPositions.set(target.index, { x: targetAgent.x, y: targetAgent.y });
                    }
                    
                    // Update previous positions for demons
                    for (const demon of this.activeDemons) {
                        if (demon.index >= agents.length) {
                            continue;
                        }
                        const demonAgent = agents[demon.index];
                        this.demonPrevPositions.set(demon.index, { x: demonAgent.x, y: demonAgent.y });
                    }
                }
            } else {
                // Any channel active but exhausted - regenerate stamina (input ignored)
                this.currentStamina += deltaTime;
                if (this.currentStamina >= this.maxStamina) {
                    this.currentStamina = this.maxStamina;
                    this.isExhausted = false;
                }
                
                // Allow PhysicsEngine to update positions normally (input ignored)
                this.prevPos = { x: hero.x, y: hero.y };
                
                // Update previous positions for targets
                for (const target of this.targets) {
                    if (!target.active || target.index >= agents.length) {
                        continue;
                    }
                    const targetAgent = agents[target.index];
                    this.targetPrevPositions.set(target.index, { x: targetAgent.x, y: targetAgent.y });
                }
                
                // Update previous positions for demons
                for (const demon of this.activeDemons) {
                    if (demon.index >= agents.length) {
                        continue;
                    }
                    const demonAgent = agents[demon.index];
                    this.demonPrevPositions.set(demon.index, { x: demonAgent.x, y: demonAgent.y });
                }
            }
        } else {
            // Recovery: Both channels inactive
            // Regenerate stamina
            this.currentStamina += deltaTime;
            if (this.currentStamina >= this.maxStamina) {
                this.currentStamina = this.maxStamina;
                this.isExhausted = false;
            }
            
            // Allow PhysicsEngine to update Hero position normally
            this.prevPos = { x: hero.x, y: hero.y };
            
            // Update previous positions for targets
            for (const target of this.targets) {
                if (!target.active || target.index >= agents.length) {
                    continue;
                }
                const targetAgent = agents[target.index];
                this.targetPrevPositions.set(target.index, { x: targetAgent.x, y: targetAgent.y });
            }
            
            // Update previous positions for demons
            for (const demon of this.activeDemons) {
                if (demon.index >= agents.length) {
                    continue;
                }
                const demonAgent = agents[demon.index];
                this.demonPrevPositions.set(demon.index, { x: demonAgent.x, y: demonAgent.y });
            }
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
        
        // Draw hero with special color (temporarily for visibility without white border)
        // Use bright cyan to make hero recognizable
        ctx.fillStyle = 'rgb(0, 255, 255)'; // Bright cyan
        ctx.beginPath();
        ctx.arc(hero.x, hero.y, radius, 0, 2 * Math.PI);
        ctx.fill();
        
        // White border removed - user doesn't want white stroke
    }
    
    /**
     * Renders god ray glow effect at hero position (called separately if needed)
     * @param {CanvasRenderingContext2D} ctx - 2D rendering context
     * @param {Array} agents - Array of Agent objects
     * @param {number} time - Current time in seconds (for rotation animation)
     */
    renderGodRayBurst(ctx, agents, time) {
        // Glow is now rendered in renderHero method
        // This method kept for compatibility but does nothing
    }
    
    /**
     * Renders all active targets with fuzzy boundary and glow effect
     * @param {CanvasRenderingContext2D} ctx - 2D rendering context
     * @param {Array} agents - Array of Agent objects (includes target agents)
     * @param {number} time - Current time in seconds (for glow animation)
     */
    renderTarget(ctx, agents, time) {
        // Standard agent radius (4 pixels, same as regular agents)
        const radius = 4;
        const glowRadius = radius * 3.5; // 3-4x agent radius (14px)
        
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
            
            // Draw target with fuzzy boundary (radial gradient fade-out)
            const gradient = ctx.createRadialGradient(targetAgent.x, targetAgent.y, 0, targetAgent.x, targetAgent.y, radius);
            gradient.addColorStop(0, 'gold'); // Gold at center
            gradient.addColorStop(0.7, 'rgba(255, 215, 0, 0.8)'); // Slight fade
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)'); // Fade to transparent at edge
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(targetAgent.x, targetAgent.y, radius, 0, 2 * Math.PI);
            ctx.fill();
            
            // Render god rays glow effect
            renderGodRays(
                ctx,
                targetAgent.x,
                targetAgent.y,
                'gold',
                GlowConfig.target.rayCount,
                GlowConfig.target.rotationSpeed,
                time,
                glowRadius,
                `target-${target.index}`
            );
        }
    }
    
    /**
     * Renders all demons with fuzzy boundary and glow effect
     * @param {CanvasRenderingContext2D} ctx - 2D rendering context
     * @param {Array} agents - Array of Agent objects (includes demon agents)
     * @param {number} time - Current time in seconds (for glow animation)
     */
    renderDemons(ctx, agents, time) {
        // Standard agent radius (4 pixels, same as regular agents)
        const radius = 4;
        const glowRadius = radius * 3.5; // 3-4x agent radius (14px)
        
        // Brick red color: hsl(0, 60%, 40%)
        const demonColor = 'hsl(0, 60%, 40%)';
        
        // Render all demons (demons are agents in the swarm)
        for (const demon of this.activeDemons) {
            // Check if demon agent index is valid
            if (demon.index >= agents.length) {
                continue;
            }
            
            const demonAgent = agents[demon.index];
            
            // Draw demon with fuzzy boundary (radial gradient fade-out)
            // Convert HSL to RGB for gradient
            const hslMatch = demonColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
            let demonRgb = { r: 163, g: 65, b: 65 }; // Default brick red
            if (hslMatch) {
                const h = parseFloat(hslMatch[1]) / 360;
                const s = parseFloat(hslMatch[2]) / 100;
                const l = parseFloat(hslMatch[3]) / 100;
                if (s === 0) {
                    const val = Math.round(l * 255);
                    demonRgb = { r: val, g: val, b: val };
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
                    demonRgb = {
                        r: Math.round(hue2rgb(p, q, h + 1/3) * 255),
                        g: Math.round(hue2rgb(p, q, h) * 255),
                        b: Math.round(hue2rgb(p, q, h - 1/3) * 255)
                    };
                }
            }
            
            const gradient = ctx.createRadialGradient(demonAgent.x, demonAgent.y, 0, demonAgent.x, demonAgent.y, radius);
            gradient.addColorStop(0, demonColor); // Brick red at center
            gradient.addColorStop(0.7, `rgba(${demonRgb.r}, ${demonRgb.g}, ${demonRgb.b}, 0.8)`); // Slight fade
            gradient.addColorStop(1, `rgba(${demonRgb.r}, ${demonRgb.g}, ${demonRgb.b}, 0)`); // Fade to transparent at edge
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(demonAgent.x, demonAgent.y, radius, 0, 2 * Math.PI);
            ctx.fill();
            
            // Render god rays glow effect
            renderGodRays(
                ctx,
                demonAgent.x,
                demonAgent.y,
                demonColor,
                GlowConfig.demon.rayCount,
                GlowConfig.demon.rotationSpeed,
                time,
                glowRadius,
                `demon-${demon.index}`
            );
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
                // 1. Recycle Victim: Remove T_hit from activeTargets and recycle as normal agent
                target.active = false;
                
                // Recycle the agent: respawn it as a regular "civilian" agent
                // Move to random position, randomize phase, reset velocity
                targetAgent.x = Math.random() * canvasWidth;
                targetAgent.y = Math.random() * canvasHeight;
                targetAgent.theta = Math.random() * 2 * Math.PI; // Randomize phase
                targetAgent.vx = 0; // Reset velocity
                targetAgent.vy = 0;
                targetAgent.ax = 0; // Reset acceleration
                targetAgent.ay = 0;
                
                // 2. Corrupt Bystander: Convert another target into a demon
                const activeTargets = this.targets.filter(t => t.active);
                if (activeTargets.length > 0) {
                    // Randomly select another active target
                    const randomIndex = Math.floor(Math.random() * activeTargets.length);
                    const targetToCorrupt = activeTargets[randomIndex];
                    
                    // Transfer: Remove T_next from activeTargets and push to activeDemons
                    targetToCorrupt.active = false;
                    this.activeDemons.push({ index: targetToCorrupt.index });
                    
                    // Constraint: Do NOT reset position or phase - it changes teams instantly in place
                    // The agent at targetToCorrupt.index stays where it is, just changes from gold to red
                    
                    // Remove from targetPrevPositions if present
                    if (this.targetPrevPositions.has(targetToCorrupt.index)) {
                        this.targetPrevPositions.delete(targetToCorrupt.index);
                    }
                    
                    console.log(`Target collected! ${this.getActiveTargetCount()} targets remaining. Target at index ${targetToCorrupt.index} corrupted into demon!`);
                } else {
                    console.log(`Target collected! ${this.getActiveTargetCount()} targets remaining. Agent recycled.`);
                }
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
     * Checks if Hero has collided with any demon (game over condition)
     * @param {Array} agents - Array of Agent objects (includes demon agents)
     * @param {number} canvasWidth - Canvas width (for toroidal wrapping)
     * @param {number} canvasHeight - Canvas height (for toroidal wrapping)
     * @returns {boolean} - True if Hero has collided with a demon (game over)
     */
    checkDemonCollision(agents, canvasWidth, canvasHeight) {
        if (this.heroIndex >= agents.length) {
            return false;
        }
        
        const hero = agents[this.heroIndex];
        const HERO_RADIUS = 4;
        const DEMON_RADIUS = 4;
        const COLLISION_DISTANCE = HERO_RADIUS + DEMON_RADIUS;
        
        // Check collision with all demons
        for (const demon of this.activeDemons) {
            // Check if demon agent index is valid
            if (demon.index >= agents.length) {
                continue;
            }
            
            const demonAgent = agents[demon.index];
            
            // Calculate distance with toroidal wrapping
            let dx = demonAgent.x - hero.x;
            let dy = demonAgent.y - hero.y;
            
            // Handle toroidal wrapping
            if (Math.abs(dx) > canvasWidth / 2) {
                dx = dx > 0 ? dx - canvasWidth : dx + canvasWidth;
            }
            if (Math.abs(dy) > canvasHeight / 2) {
                dy = dy > 0 ? dy - canvasHeight : dy + canvasHeight;
            }
            
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check collision: distance < (Radius_H + Radius_D)
            if (distance < COLLISION_DISTANCE) {
                return true; // Game Over!
            }
        }
        
        return false;
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
