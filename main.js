import { Agent } from './Agent.js';
import { EnergyMonitor } from './EnergyMonitor.js';
import { HeroLogic } from './HeroLogic.js';
import {
    N,
    LOGICAL_WIDTH,
    LOGICAL_HEIGHT,
    ENERGY_THRESHOLD_PER_AGENT,
    ENERGY_KILL_FRAMES,
    ENABLE_AUTO_KILL
} from './config.js';
import { RuntimeConfig, updateRuntimeConfig } from './runtimeConfig.js';
import { ParameterPanel } from './ParameterPanel.js';
import { ViewportManager } from './ViewportManager.js';

// Canvas setup - wait for DOM to be ready
let canvas, ctx;

function setupCanvas() {
    canvas = document.getElementById('canvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        throw new Error('Canvas element #canvas not found in DOM');
    }
    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get 2D context from canvas!');
        throw new Error('Could not get 2D rendering context');
    }
    
    // Set canvas size (restored to 800x600 for better resolution)
    canvas.width = 800;
    canvas.height = 600;
    console.log('Canvas initialized:', canvas.width, 'x', canvas.height);
}

// Setup canvas immediately (module scripts run after DOM is parsed)
setupCanvas();

// Viewport manager for cross-platform scaling
const viewportManager = new ViewportManager(LOGICAL_WIDTH, LOGICAL_HEIGHT);

// Initialize viewport on load
function updateViewport() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    canvas.width = screenWidth;
    canvas.height = screenHeight;
    viewportManager.resize(screenWidth, screenHeight);
}

// Update viewport on window resize
window.addEventListener('resize', updateViewport);
updateViewport(); // Initial viewport setup

// State: array of agents
const swarm = [];

// Energy monitor for convergence detection (with configurable thresholds)
const energyMonitor = new EnergyMonitor(600, ENERGY_THRESHOLD_PER_AGENT, ENERGY_KILL_FRAMES);

// No agent selection - only hero and target exist

// Hero logic for player-controlled inertia
let heroLogic = null;

// Flag to control energy curve visibility
let showEnergyCurve = false;

// Game mode and preset tracking (module scope for access in updatePhysics)
let isDevMode = false;
let currentPresetIndex = null;

// Timing for frame-rate independent physics
let lastTime = 0;
let simulationStartTime = 0;
const TARGET_FPS = 30; // Match capture frame rate for consistency
const DELTA_TIME_CAP = 1 / 30; // Cap deltaTime to prevent large jumps
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS; // ~33.33ms for 30 FPS

/**
 * Initializes the swarm with N agents
 * Centers the swarm by removing mean position and velocity
 */
function initialize() {
    swarm.length = 0; // Clear existing agents
    
    // Use RuntimeConfig.N to support URL parameter overrides (batch mode)
    const currentN = RuntimeConfig.N;
    
    // Create agents (hero + targets + regular agents)
    // Hero is at index 0, targets are at indices 1-10
    // Use logical dimensions for agent initialization (physics uses logical coordinates)
    const logicalWidth = viewportManager.getLogicalWidth();
    const logicalHeight = viewportManager.getLogicalHeight();
    for (let i = 0; i < currentN; i++) {
        swarm.push(new Agent(logicalWidth, logicalHeight, RuntimeConfig.BASE_OMEGA, RuntimeConfig.OMEGA_VARIATION));
    }
    
    // Calculate and subtract center of mass (position)
    let sumX = 0, sumY = 0;
    for (const agent of swarm) {
        sumX += agent.x;
        sumY += agent.y;
    }
    const centerX = sumX / currentN;
    const centerY = sumY / currentN;
    
    // Shift all positions to center at origin
    for (const agent of swarm) {
        agent.x -= centerX;
        agent.y -= centerY;
    }
    
    // Calculate and subtract mean velocity
    let sumVx = 0, sumVy = 0;
    for (const agent of swarm) {
        sumVx += agent.vx;
        sumVy += agent.vy;
    }
    const meanVx = sumVx / currentN;
    const meanVy = sumVy / currentN;
    
    // Shift all velocities to remove mean
    for (const agent of swarm) {
        agent.vx -= meanVx;
        agent.vy -= meanVy;
    }
    
    // Re-center positions to logical coordinate center
    const logicalCenterX = viewportManager.getLogicalWidth() / 2;
    const logicalCenterY = viewportManager.getLogicalHeight() / 2;
    for (const agent of swarm) {
        agent.x += logicalCenterX;
        agent.y += logicalCenterY;
    }
    
    console.log(`Initialized ${swarm.length} agents (centered)`);
    
    // Initialize hero logic (hero is agent at index 0)
    // Targets are agents at indices 1-7 (7 targets, included in swarm count)
    if (swarm.length >= 8) {
        // Hero at index 0, targets at indices 1-7
        heroLogic = new HeroLogic(0, swarm[0], swarm.slice(1, 8));
    } else {
        // Fallback: if not enough agents, just initialize with hero
        heroLogic = new HeroLogic(0, swarm[0], []);
    }
}

/**
 * Clears the canvas with optional trail effect
 */
function clear() {
    // Semi-transparent fill for motion blur effect
    if (!ctx) {
        console.error('Canvas context is null!');
        return;
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/**
 * Calculates and applies repulsion forces between agents
 * Reference: F_rep = (r_i - r_j) / (|r_i - r_j|^2 + epsilon) / N
 * @param {Agent} agent1 - First agent
 * @param {Agent} agent2 - Second agent
 * @param {number} dx - X component of distance vector (agent1 - agent2)
 * @param {number} dy - Y component of distance vector (agent1 - agent2)
 * @param {number} distanceSquared - Squared distance (dx² + dy²)
 */
function applyRepulsionForce(agent1, agent2, dx, dy, distanceSquared) {
    // Soft core repulsion: F = (r_i - r_j) / (|r_i - r_j|^2 + epsilon) / N
    // The /N scaling is critical to prevent force explosion with large populations
    const invDistanceSqPlusEpsilon = 1.0 / (distanceSquared + RuntimeConfig.EPSILON);
    const forceMagnitude = RuntimeConfig.REPULSION_STRENGTH * invDistanceSqPlusEpsilon / RuntimeConfig.N;
    
    // Normalize direction using distanceSquared to avoid sqrt
    const invDistance = 1.0 / Math.sqrt(distanceSquared);
    const fx = dx * invDistance * forceMagnitude;
    const fy = dy * invDistance * forceMagnitude;
    
    // Apply force (symmetric, Newton's third law)
    agent1.addForce(fx, fy);
    agent2.addForce(-fx, -fy);
}

/**
 * Calculates and applies phase-based spatial coupling (J term)
 * Reference: F_att = (1 + J*cos(θ_j - θ_i)) * (r_j - r_i) / |r_j - r_i| / N
 * The constant "1" provides infinite-range global gravity (self-confinement)
 * @param {Agent} agent1 - First agent
 * @param {Agent} agent2 - Second agent
 */
function applyPhaseBasedSpatialCoupling(agent1, agent2, dx, dy, distance) {
    // Phase difference
    const phaseDiff = agent2.theta - agent1.theta;
    
    // Attraction: (1 + J*cos(θ_j - θ_i)) * unit_vector / N
    // Unit vector direction (infinite range - strength independent of distance)
    const invDistance = 1.0 / distance;
    const unitX = dx * invDistance;
    const unitY = dy * invDistance;
    
    // Coupling strength: (1 + J*cos(phaseDiff)) / N
    // The "1" provides constant global attraction (self-confinement)
    // J*cos modulates based on phase similarity
    const couplingStrength = (1.0 + RuntimeConfig.J * Math.cos(phaseDiff)) / RuntimeConfig.N;
    
    const fx = unitX * couplingStrength;
    const fy = unitY * couplingStrength;
    
    // Apply force (symmetric, Newton's third law)
    agent1.addForce(fx, fy);
    agent2.addForce(-fx, -fy);
}

/**
 * Calculates and applies phase coupling (K term)
 * Reference: dθ/dt += K * sin(θ_j - θ_i) / |r_j - r_i| / N
 * @param {Agent} agent1 - First agent
 * @param {Agent} agent2 - Second agent
 * @param {number} distance - Pre-calculated distance (to avoid redundant sqrt)
 */
function applyPhaseCoupling(agent1, agent2, distance) {
    // Skip if too close (numerical stability)
    if (distance < 0.001) {
        return;
    }
    
    // Phase difference
    const phaseDiff = agent2.theta - agent1.theta;
    
    // Phase coupling: K * sin(θ_j - θ_i) / |r_j - r_i| / N
    // The /N scaling is critical to prevent phase derivative explosion
    const invDistance = 1.0 / distance;
    const phaseCoupling = RuntimeConfig.K * Math.sin(phaseDiff) * invDistance / RuntimeConfig.N;
    
    // Apply phase derivative (symmetric)
    agent1.addPhaseDerivative(phaseCoupling);
    agent2.addPhaseDerivative(-phaseCoupling);
}

/**
 * Physics update step: calculates all forces and integrates motion
 * @param {number} deltaTime - Time step for integration (scaled by TIME_SCALE)
 * @param {number} realDeltaTime - Real time step in seconds (unscaled, for stamina system)
 */
function updatePhysics(deltaTime, realDeltaTime) {
    // Use logical coordinates for physics calculations
    const centerX = viewportManager.getLogicalWidth() / 2;
    const centerY = viewportManager.getLogicalHeight() / 2;
    
    // Reset all accelerations and phase derivatives
    for (const agent of swarm) {
        agent.ax = 0;
        agent.ay = 0;
        agent.dtheta_dt = agent.omega; // Start with natural frequency
    }
    
    // Apply all pairwise interactions (optimized: calculate distance once per pair)
    for (let i = 0; i < swarm.length; i++) {
        for (let j = i + 1; j < swarm.length; j++) {
            // Calculate distance vector once for all three interactions
            const dxAttract = swarm[j].x - swarm[i].x; // For attraction (agent1 -> agent2)
            const dyAttract = swarm[j].y - swarm[i].y;
            const dxRepel = swarm[i].x - swarm[j].x;   // For repulsion (agent1 <- agent2)
            const dyRepel = swarm[i].y - swarm[j].y;
            const distanceSquared = dxAttract * dxAttract + dyAttract * dyAttract;
            
            // Skip if too close (numerical stability)
            if (distanceSquared < 0.000001) {
                continue;
            }
            
            const distance = Math.sqrt(distanceSquared);
            
            // Repulsion forces (collision avoidance) - uses dxRepel, dyRepel
            applyRepulsionForce(swarm[i], swarm[j], dxRepel, dyRepel, distanceSquared);
            
            // Phase-based spatial coupling (J term) - reuse distance and dxAttract, dyAttract
            applyPhaseBasedSpatialCoupling(swarm[i], swarm[j], dxAttract, dyAttract, distance);
            
            // Phase coupling (K term) - reuse distance
            applyPhaseCoupling(swarm[i], swarm[j], distance);
        }
    }
    
    // Integrate: update positions, velocities, and phases
    // Use logical dimensions for boundary wrapping
    const logicalWidth = viewportManager.getLogicalWidth();
    const logicalHeight = viewportManager.getLogicalHeight();
    for (const agent of swarm) {
        agent.update(deltaTime, logicalWidth, logicalHeight);
    }
    
    // Hero anchor override (runs AFTER physics update)
    // Use realDeltaTime for stamina system (should be in real seconds, not scaled)
    // Use logical dimensions for game logic (reuse variables from above)
    if (heroLogic) {
        heroLogic.update(swarm, realDeltaTime, logicalWidth, logicalHeight);
        
        // Check win condition: Hero collects all targets
        // Only pause when ALL targets are collected (game won)
        // Individual target collection does not pause the game
        if (heroLogic.checkWinCondition(swarm, logicalWidth, logicalHeight)) {
            // Check if we haven't already triggered stage progression
            if (window.GAME_STATE !== 'STAGE_CLEARED' && window.GAME_STATE !== 'REBOOTING') {
                window.SIMULATION_PAUSED = true;
                window.GAME_STATE = 'STAGE_CLEARED';
                console.log('Stage cleared! All targets collected! Rebooting with next preset in 1 second...');
                
                // Pause for 1 second, then reboot with next preset (only in player mode)
                if (!isDevMode && currentPresetIndex !== null) {
                    setTimeout(() => {
                        const nextPresetIndex = currentPresetIndex + 1;
                        window.GAME_STATE = 'REBOOTING';
                        applyPresetAndReboot(nextPresetIndex);
                    }, 1000);
                } else {
                    // Dev mode: just mark as won
                    window.GAME_STATE = 'WON';
                }
            }
        }
        
        // Check game over condition: Hero collides with demon
        if (heroLogic.checkDemonCollision(swarm, logicalWidth, logicalHeight)) {
            window.SIMULATION_PAUSED = true;
            window.GAME_STATE = 'LOST';
            console.log('Game over: Hero collided with demon!');
        }
        // Removed proximity pause - game continues while collecting targets
    }
    
    // Proximity pause only applies to hero and target (no agent selection)
    
    // Measure kinetic energy and check for convergence
    const currentEnergy = energyMonitor.measure(swarm);
    
    // Auto-kill check: if system has reached equilibrium, mark as dead (only in batch mode)
    if (ENABLE_AUTO_KILL && energyMonitor.isDead()) {
        window.SIMULATION_STATUS = 'DEAD';
        const simulationTime = (performance.now() - simulationStartTime) / 1000; // Time in seconds since start
        window.SIMULATION_RESULT = {
            time: simulationTime,
            energy: currentEnergy,
            params: { J: RuntimeConfig.J, K: RuntimeConfig.K, N }
        };
    }
}

/**
 * Main render loop with frame-rate independent physics
 * Throttled to TARGET_FPS to match capture rate
 * @param {number} currentTime - Current timestamp from requestAnimationFrame
 */
function render(currentTime) {
    // Throttle to TARGET_FPS (30 FPS to match capture rate)
    const elapsed = currentTime - lastTime;
    if (elapsed < FRAME_INTERVAL_MS) {
        requestAnimationFrame(render);
        return;
    }
    
    // Calculate deltaTime (in seconds)
    // At 30 FPS, this is approximately 1/30 ≈ 0.0333 seconds per frame
    const rawDeltaTime = Math.min(
        elapsed / 1000,
        DELTA_TIME_CAP
    );
    lastTime = currentTime;
    
    // Apply time scale multiplier to speed up/slow down simulation
    const deltaTime = rawDeltaTime * RuntimeConfig.TIME_SCALE;
    
    // Update physics only if not paused
    if (!window.SIMULATION_PAUSED) {
        updatePhysics(deltaTime, rawDeltaTime); // Pass both scaled and unscaled time
    }
    
    // Check if simulation is dead (reached equilibrium) - only stop rendering in batch mode
    if (ENABLE_AUTO_KILL && window.SIMULATION_STATUS === 'DEAD') {
        // Stop rendering but keep the loop alive for batch runner to detect
        return;
    }
    
    // Clear canvas
    clear();
    
    // Update colors and draw agents
    if (swarm.length === 0) {
        console.warn('Swarm is empty - cannot render');
        return;
    }
    
    // Apply viewport transform: translate and scale for logical-to-screen projection
    ctx.save();
    ctx.translate(viewportManager.getOffsetX(), viewportManager.getOffsetY());
    ctx.scale(viewportManager.getScale(), viewportManager.getScale());
    
    // Update colors for all agents (including hero)
    for (const agent of swarm) {
        agent.updateColor();
    }
    
    // TEMPORARILY DISABLED: Render glows first (before all agents) so they appear beneath
    // TODO: Re-enable glow rendering when ready
    // if (heroLogic) {
    //     const currentTimeSeconds = (performance.now() - simulationStartTime) / 1000;
    //     heroLogic.renderGlows(ctx, swarm, currentTimeSeconds);
    // }
    
    // Draw all agents (except hero, targets, and demons which are rendered separately)
    for (let i = 0; i < swarm.length; i++) {
        // Skip hero (index 0) - it's rendered separately with phase color
        // Skip targets (indices 1-10 if present) - they're rendered separately as gold
        // Skip demons - they're rendered separately as red
        if (i === 0) {
            continue; // Skip hero
        }
        if (heroLogic && heroLogic.targets.some(t => t.index === i && t.active)) {
            continue; // Skip active targets (rendered as gold)
        }
        if (heroLogic && heroLogic.activeDemons.some(d => d.index === i)) {
            continue; // Skip demons (rendered as red)
        }
        swarm[i].draw(ctx);
    }
    
    // Render hero, targets, and demons (game objects in logical space)
    if (heroLogic) {
        const currentTimeSeconds = (performance.now() - simulationStartTime) / 1000;
        heroLogic.renderHero(ctx, swarm, currentTimeSeconds);
        heroLogic.renderTarget(ctx, swarm, currentTimeSeconds);
        heroLogic.renderDemons(ctx, swarm, currentTimeSeconds);
    }
    
    // Restore viewport transform (draw UI elements in screen space)
    ctx.restore();
    
    // Render UI elements in screen space (after transform restore)
    // Render stamina bar (on top of simulation)
    if (heroLogic) {
        heroLogic.renderStaminaBar(ctx, canvas.width, canvas.height);
        
        // Render HUD in corner (lives, targets, demons)
        heroLogic.renderHUD(ctx, canvas.width, canvas.height);
    }
    
    // Render energy monitor (EKG-style graph) if enabled
    if (showEnergyCurve) {
        energyMonitor.render(ctx, canvas.width, canvas.height);
    }
    
    // Continue the animation loop
    requestAnimationFrame(render);
}


// Initialize simulation status
window.SIMULATION_STATUS = 'RUNNING';
window.SIMULATION_RESULT = null;
window.SIMULATION_PAUSED = false;

// Game mode detection
function getGameMode() {
    if (typeof window === 'undefined') return 'player';
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    return mode === 'dev_secret' ? 'dev' : 'player';
}

// Preset configurations for Player Mode
// Reordered: start with preset 3/4/2 then 1 (indices: 3, 2, 1, 0)
const PRESET_CONFIGS = [
    { J: 8.0, K: -4.0, TIME_SCALE: 50 },  // Preset 3 -> index 0
    { J: 8.0, K: -8.0 },                  // Preset 2 -> index 1
    { J: 2.5, K: -0.16, TIME_SCALE: 250 }, // Preset 1 -> index 2
    { J: 2.0, K: -1.0 }                   // Preset 0 -> index 3 (matches default config)
];

// Apply preset configuration for player mode (always starts with first preset)
// Returns the preset index that was applied
// NOTE: Only modifies J, K, and optionally TIME_SCALE. All other parameters remain as initialized.
function applyPlayerPreset() {
    // Always start with preset index 0 (which is now preset 3 after reordering)
    const presetIndex = 0;
    const preset = PRESET_CONFIGS[presetIndex];
    console.log('Player Mode: Applying preset', presetIndex, preset);
    
    // Only apply preset-specific overrides (as specified in record.md lines 77-80)
    // All other parameters (BASE_OMEGA, EPSILON, REPULSION_STRENGTH, etc.) remain
    // as they were initialized in RuntimeConfig (which could include URL parameter overrides)
    if (preset.J !== undefined) {
        RuntimeConfig.J = preset.J;
    }
    if (preset.K !== undefined) {
        RuntimeConfig.K = preset.K;
    }
    if (preset.TIME_SCALE !== undefined) {
        RuntimeConfig.TIME_SCALE = preset.TIME_SCALE;
    }
    
    return presetIndex;
}

// Initialize and start the simulation
try {
    // Detect game mode
    const gameMode = getGameMode();
    isDevMode = gameMode === 'dev';
    
    // Track current preset index (global for stage progression)
    currentPresetIndex = null;
    if (!isDevMode) {
        currentPresetIndex = applyPlayerPreset();
    }
    
    // Function to apply a specific preset index and reinitialize
    function applyPresetAndReboot(presetIndex) {
        if (presetIndex < 0 || presetIndex >= PRESET_CONFIGS.length) {
            console.log('All presets completed! Restarting from first preset.');
            presetIndex = 0; // Loop back to first preset
        }
        
        const preset = PRESET_CONFIGS[presetIndex];
        console.log('Applying preset', presetIndex, preset);
        
        // Apply preset-specific overrides
        if (preset.J !== undefined) {
            RuntimeConfig.J = preset.J;
        }
        if (preset.K !== undefined) {
            RuntimeConfig.K = preset.K;
        }
        if (preset.TIME_SCALE !== undefined) {
            RuntimeConfig.TIME_SCALE = preset.TIME_SCALE;
        }
        
        // Reset simulation state
        window.SIMULATION_PAUSED = false;
        window.GAME_STATE = null;
        
        // Reinitialize swarm with new preset
        initialize();
        
        // Update panel if in dev mode
        if (parameterPanel) {
            parameterPanel.updateFromConfig(RuntimeConfig);
        }
        
        currentPresetIndex = presetIndex;
    }
    
    initialize();
    
    // Apply preset configuration (for dev mode preset selector)
    function applyPresetConfig(presetIndex) {
        if (presetIndex < 0 || presetIndex >= PRESET_CONFIGS.length) {
            console.error('Invalid preset index:', presetIndex);
            return;
        }
        
        const preset = PRESET_CONFIGS[presetIndex];
        console.log('Dev Mode: Applying preset', presetIndex, preset);
        
        // Apply preset-specific overrides
        if (preset.J !== undefined) {
            RuntimeConfig.J = preset.J;
        }
        if (preset.K !== undefined) {
            RuntimeConfig.K = preset.K;
        }
        if (preset.TIME_SCALE !== undefined) {
            RuntimeConfig.TIME_SCALE = preset.TIME_SCALE;
        }
        
        // Reset simulation state
        window.SIMULATION_PAUSED = false;
        window.GAME_STATE = null;
        
        // Reinitialize swarm with new preset (restart simulation)
        initialize();
        
        // Update panel to reflect new values (this updates the input fields)
        if (parameterPanel) {
            parameterPanel.updateFromConfig(RuntimeConfig);
            console.log('Panel updated with preset values:', { J: RuntimeConfig.J, K: RuntimeConfig.K, TIME_SCALE: RuntimeConfig.TIME_SCALE });
        }
    }
    
    // Initialize ParameterPanel (shown only in dev mode)
    let parameterPanel = null;
    if (isDevMode) {
        parameterPanel = new ParameterPanel(
            (key, value) => {
                // Config updater callback
                updateRuntimeConfig(key, value);
            },
            (show) => {
                // Energy curve toggle callback
                showEnergyCurve = show;
            },
            (maxStamina) => {
                // Max stamina callback
                if (heroLogic) {
                    heroLogic.setMaxStamina(maxStamina);
                }
            },
            true, // isDevMode = true
            null, // presetIndex (not applicable in dev mode)
            applyPresetConfig // presetCallback for dev mode preset selector
        );
        
        // Initialize panel with current config values
        parameterPanel.updateFromConfig(RuntimeConfig);
    } else {
        // Player mode: panel is hidden (not created)
        // No panel in player mode
    }
    
    // Dual-channel input system
    // Channel A (Hero): Spacebar (Web) / Left-Side Tap (Mobile)
    // Channel B (Targets): Ctrl Key (Web) / Right-Side Tap (Mobile)
    
    let spaceKeyPressed = false;
    let ctrlKeyPressed = false;
    
    // Keyboard input handlers
    document.addEventListener('keydown', (e) => {
        // Channel A: Spacebar
        if (e.code === 'Space' && !spaceKeyPressed) {
            e.preventDefault();
            spaceKeyPressed = true;
            if (heroLogic && swarm.length > 0) {
                // Store current position as anchor point
                const heroIndex = heroLogic.getHeroIndex();
                if (heroIndex < swarm.length) {
                    const hero = swarm[heroIndex];
                    heroLogic.setPrevPos(hero.x, hero.y);
                }
                heroLogic.setChannelAActive(true);
            }
        }
        
        // Channel B: Ctrl key (either left or right Ctrl)
        if ((e.code === 'ControlLeft' || e.code === 'ControlRight') && !ctrlKeyPressed) {
            e.preventDefault();
            ctrlKeyPressed = true;
            if (heroLogic) {
                // Store current positions for all active targets
                for (const target of heroLogic.targets) {
                    if (!target.active || target.index >= swarm.length) {
                        continue;
                    }
                    const targetAgent = swarm[target.index];
                    heroLogic.setPrevPos(targetAgent.x, targetAgent.y); // Store for first target (will be handled in update)
                }
                heroLogic.setChannelBActive(true);
            }
        }
    });
    
    document.addEventListener('keyup', (e) => {
        // Channel A: Spacebar
        if (e.code === 'Space') {
            e.preventDefault();
            spaceKeyPressed = false;
            if (heroLogic) {
                heroLogic.setChannelAActive(false);
            }
        }
        
        // Channel B: Ctrl key
        if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
            e.preventDefault();
            ctrlKeyPressed = false;
            if (heroLogic) {
                heroLogic.setChannelBActive(false);
            }
        }
    });
    
    // Touch support for mobile (left-side tap = Channel A, right-side tap = Channel B)
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (heroLogic && swarm.length > 0 && e.touches.length > 0) {
            // Get touch position relative to canvas
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            const screenX = touch.clientX - rect.left;
            const screenY = touch.clientY - rect.top;
            
            // Unproject screen coordinates to logical coordinates
            const logicalPos = viewportManager.unproject(screenX, screenY);
            const logicalWidth = viewportManager.getLogicalWidth();
            
            // Determine which side was touched (left half = Channel A, right half = Channel B)
            // Use logical coordinates for consistency
            if (logicalPos.x < logicalWidth / 2) {
                // Left side: Channel A (Hero)
                const heroIndex = heroLogic.getHeroIndex();
                if (heroIndex < swarm.length) {
                    const hero = swarm[heroIndex];
                    heroLogic.setPrevPos(hero.x, hero.y);
                }
                heroLogic.setChannelAActive(true);
            } else {
                // Right side: Channel B (Targets)
                for (const target of heroLogic.targets) {
                    if (!target.active || target.index >= swarm.length) {
                        continue;
                    }
                    const targetAgent = swarm[target.index];
                    heroLogic.setPrevPos(targetAgent.x, targetAgent.y); // Store for first target
                }
                heroLogic.setChannelBActive(true);
            }
        }
    });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (heroLogic) {
            // Reset both channels on touch end (simple behavior for mobile)
            heroLogic.setChannelAActive(false);
            heroLogic.setChannelBActive(false);
        }
    });
    
    canvas.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        if (heroLogic) {
            // Reset both channels on touch cancel
            heroLogic.setChannelAActive(false);
            heroLogic.setChannelBActive(false);
        }
    });
    
    simulationStartTime = performance.now(); // Track simulation start time
    console.log('Simulation initialized successfully');
    requestAnimationFrame((time) => {
        lastTime = time;
        render(time);
    });
} catch (error) {
    console.error('Failed to initialize simulation:', error);
    throw error;
}
