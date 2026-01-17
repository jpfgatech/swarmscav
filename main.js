import { Agent } from './Agent.js';
import { EnergyMonitor } from './EnergyMonitor.js';
import { HeroLogic } from './HeroLogic.js';
import {
    N,
    ENERGY_THRESHOLD_PER_AGENT,
    ENERGY_KILL_FRAMES,
    ENABLE_AUTO_KILL
} from './config.js';
import { RuntimeConfig, updateRuntimeConfig } from './runtimeConfig.js';
import { ParameterPanel } from './ParameterPanel.js';

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

// State: array of agents
const swarm = [];

// Energy monitor for convergence detection (with configurable thresholds)
const energyMonitor = new EnergyMonitor(600, ENERGY_THRESHOLD_PER_AGENT, ENERGY_KILL_FRAMES);

// No agent selection - only hero and target exist

// Hero logic for player-controlled inertia
let heroLogic = null;

// Flag to control energy curve visibility
let showEnergyCurve = false;

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
    
    // Create agents
    for (let i = 0; i < currentN; i++) {
        swarm.push(new Agent(canvas.width, canvas.height, RuntimeConfig.BASE_OMEGA, RuntimeConfig.OMEGA_VARIATION));
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
    
    // Re-center positions to canvas center
    const canvasCenterX = canvas.width / 2;
    const canvasCenterY = canvas.height / 2;
    for (const agent of swarm) {
        agent.x += canvasCenterX;
        agent.y += canvasCenterY;
    }
    
    console.log(`Initialized ${swarm.length} agents (centered)`);
    
    // Initialize hero logic (hero is agent at index 0)
    // Targets are now separate objects (not agents), initialized in HeroLogic constructor
    if (swarm.length > 0) {
        heroLogic = new HeroLogic(0, swarm[0], canvas.width, canvas.height);
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
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
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
    for (const agent of swarm) {
        agent.update(deltaTime, canvas.width, canvas.height);
    }
    
    // Hero anchor override (runs AFTER physics update)
    // Use realDeltaTime for stamina system (should be in real seconds, not scaled)
    if (heroLogic) {
        heroLogic.update(swarm, realDeltaTime, canvas.width, canvas.height);
        
        // Check win condition: Hero collects all targets
        if (heroLogic.checkWinCondition(swarm, canvas.width, canvas.height)) {
            window.SIMULATION_PAUSED = true;
            window.GAME_STATE = 'WON';
            console.log('Game won: All targets collected!');
        } else {
            // Check if hero and any target are closest and within 3x diameter (pause condition)
            if (heroLogic.checkHeroTargetProximity(swarm, canvas.width, canvas.height)) {
                window.SIMULATION_PAUSED = true;
                console.log('Simulation paused: Hero and Target are closest and within range');
            }
        }
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
    
    // Update colors for all agents (including hero)
    for (const agent of swarm) {
        agent.updateColor();
    }
    
    // Draw all agents (except hero which is rendered separately)
    for (let i = 0; i < swarm.length; i++) {
        // Skip hero (index 0) - it's rendered separately with phase color
        // Targets are now separate objects (not agents), rendered separately
        if (i !== 0) {
            swarm[i].draw(ctx);
        }
    }
    
    // Render stamina bar (on top of simulation, before hero/target)
    if (heroLogic) {
        heroLogic.renderStaminaBar(ctx, canvas.width, canvas.height);
    }
    
    // Render hero with phase-based color (after color update)
    if (heroLogic) {
        heroLogic.renderHero(ctx, swarm);
        heroLogic.renderTarget(ctx, swarm);
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
const PRESET_CONFIGS = [
    { J: 2.0, K: -1.0 },  // Preset 1: matches default config (restored from commit 7dc61c9)
    { J: 2.5, K: -0.16, TIME_SCALE: 250 },
    { J: 8.0, K: -8.0 },
    { J: 8.0, K: -4.0, TIME_SCALE: 50 }
];

// Apply a random preset configuration
// Returns the preset index that was applied
// NOTE: Only modifies J, K, and optionally TIME_SCALE. All other parameters remain as initialized.
function applyRandomPreset() {
    const presetIndex = Math.floor(Math.random() * PRESET_CONFIGS.length);
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
    const isDevMode = gameMode === 'dev';
    
    // Apply random preset if in player mode
    let currentPresetIndex = null;
    if (!isDevMode) {
        currentPresetIndex = applyRandomPreset();
    }
    
    initialize();
    
    // Initialize ParameterPanel (shown in both modes, but different UI)
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
            null  // presetIndex (not applicable in dev mode)
        );
        
        // Initialize panel with current config values
        parameterPanel.updateFromConfig(RuntimeConfig);
    } else {
        // Player mode: create panel with preset index display
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
            false, // isDevMode = false
            currentPresetIndex // presetIndex for display
        );
        
        // Initialize panel with current config values
        parameterPanel.updateFromConfig(RuntimeConfig);
    }
    
    // Add keyboard input handler for Space key (hero anchor activation)
    let spaceKeyPressed = false;
    document.addEventListener('keydown', (e) => {
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
                heroLogic.setInputActive(true);
            }
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            spaceKeyPressed = false;
            if (heroLogic) {
                heroLogic.setInputActive(false);
            }
        }
    });
    
    // Add touch support for mobile (anchor activation)
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (heroLogic && swarm.length > 0) {
            // Store current position as anchor point
            const heroIndex = heroLogic.getHeroIndex();
            if (heroIndex < swarm.length) {
                const hero = swarm[heroIndex];
                heroLogic.setPrevPos(hero.x, hero.y);
            }
            heroLogic.setInputActive(true);
        }
    });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (heroLogic) {
            heroLogic.setInputActive(false);
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
