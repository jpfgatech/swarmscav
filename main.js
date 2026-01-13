import { Agent } from './Agent.js';
import {
    N,
    SPEED,
    BASE_OMEGA,
    OMEGA_VARIATION,
    J,
    K,
    K_WELL,
    REPULSION_STRENGTH,
    EPSILON,
    CUTOFF_RADIUS,
    MU,
    TIME_SCALE
} from './config.js';

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
    
    // Set canvas size (restored to original, agents will be spaced further apart)
    canvas.width = 800;
    canvas.height = 600;
    console.log('Canvas initialized:', canvas.width, 'x', canvas.height);
}

// Setup canvas immediately (module scripts run after DOM is parsed)
setupCanvas();

// State: array of agents
const swarm = [];

// Timing for frame-rate independent physics
let lastTime = 0;
const TARGET_FPS = 60;
const DELTA_TIME_CAP = 1 / 30; // Cap deltaTime to prevent large jumps

/**
 * Initializes the swarm with N agents
 */
function initialize() {
    swarm.length = 0; // Clear existing agents
    
    for (let i = 0; i < N; i++) {
        swarm.push(new Agent(canvas.width, canvas.height, SPEED, BASE_OMEGA, OMEGA_VARIATION));
    }
    
    console.log(`Initialized ${swarm.length} agents`);
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
 * Calculates and applies the harmonic potential well force (confinement)
 * @param {Agent} agent - The agent to apply the force to
 * @param {number} centerX - X coordinate of the center
 * @param {number} centerY - Y coordinate of the center
 */
function applyWellForce(agent, centerX, centerY) {
    // Calculate displacement from center
    const dx = agent.x - centerX;
    const dy = agent.y - centerY;
    
    // Harmonic potential: F = -k * (r - r_center)
    const fx = -K_WELL * dx;
    const fy = -K_WELL * dy;
    
    agent.addForce(fx, fy);
}

/**
 * Calculates and applies repulsion forces between agents
 * @param {Agent} agent1 - First agent
 * @param {Agent} agent2 - Second agent
 */
function applyRepulsionForce(agent1, agent2) {
    // Calculate distance vector
    const dx = agent1.x - agent2.x;
    const dy = agent1.y - agent2.y;
    const distanceSquared = dx * dx + dy * dy;
    const distance = Math.sqrt(distanceSquared);
    
    // Optimization: skip if beyond cutoff radius
    if (distance > CUTOFF_RADIUS || distance < 0.001) {
        return;
    }
    
    // Inverse square law repulsion with softening parameter
    // F = (direction) / (distance^2 + epsilon)
    const forceMagnitude = REPULSION_STRENGTH / (distanceSquared + EPSILON);
    const fx = (dx / distance) * forceMagnitude;
    const fy = (dy / distance) * forceMagnitude;
    
    // Apply force to agent1 (Newton's third law: agent2 gets opposite force)
    agent1.addForce(fx, fy);
    agent2.addForce(-fx, -fy);
}

/**
 * Calculates and applies phase-based spatial coupling (J term)
 * This creates attraction/repulsion based on phase difference
 * @param {Agent} agent1 - First agent
 * @param {Agent} agent2 - Second agent
 */
function applyPhaseBasedSpatialCoupling(agent1, agent2) {
    // Calculate distance vector
    const dx = agent2.x - agent1.x; // Direction from agent1 to agent2
    const dy = agent2.y - agent1.y;
    const distanceSquared = dx * dx + dy * dy;
    const distance = Math.sqrt(distanceSquared);
    
    // Skip if too close or too far
    if (distance < 0.001 || distance > CUTOFF_RADIUS) {
        return;
    }
    
    // Phase difference
    const phaseDiff = agent2.theta - agent1.theta;
    
    // Phase-based spatial coupling: J * (r_j - r_i) / |r_j - r_i| * sin(θ_j - θ_i)
    // This creates attraction when phases are similar, repulsion when opposite
    const couplingStrength = J * Math.sin(phaseDiff) / distance;
    const fx = (dx / distance) * couplingStrength;
    const fy = (dy / distance) * couplingStrength;
    
    // Apply force (symmetric)
    agent1.addForce(fx, fy);
    agent2.addForce(-fx, -fy);
}

/**
 * Calculates and applies phase coupling (K term)
 * This synchronizes phases based on spatial distance
 * @param {Agent} agent1 - First agent
 * @param {Agent} agent2 - Second agent
 */
function applyPhaseCoupling(agent1, agent2) {
    // Calculate distance
    const dx = agent1.x - agent2.x;
    const dy = agent1.y - agent2.y;
    const distanceSquared = dx * dx + dy * dy;
    const distance = Math.sqrt(distanceSquared);
    
    // Skip if too close or too far
    if (distance < 0.001 || distance > CUTOFF_RADIUS) {
        return;
    }
    
    // Phase difference
    const phaseDiff = agent2.theta - agent1.theta;
    
    // Phase coupling: K * sin(θ_j - θ_i) / |r_j - r_i|
    // This synchronizes phases of nearby agents
    const phaseCoupling = K * Math.sin(phaseDiff) / distance;
    
    // Apply phase derivative (symmetric)
    agent1.addPhaseDerivative(phaseCoupling);
    agent2.addPhaseDerivative(-phaseCoupling);
}

/**
 * Physics update step: calculates all forces and integrates motion
 * @param {number} deltaTime - Time step for integration
 */
function updatePhysics(deltaTime) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Reset all accelerations and phase derivatives
    for (const agent of swarm) {
        agent.ax = 0;
        agent.ay = 0;
        agent.dtheta_dt = agent.omega; // Start with natural frequency
    }
    
    // Apply well force to each agent
    for (const agent of swarm) {
        applyWellForce(agent, centerX, centerY);
    }
    
    // Apply all pairwise interactions
    for (let i = 0; i < swarm.length; i++) {
        for (let j = i + 1; j < swarm.length; j++) {
            // Repulsion forces (collision avoidance)
            applyRepulsionForce(swarm[i], swarm[j]);
            
            // Phase-based spatial coupling (J term)
            applyPhaseBasedSpatialCoupling(swarm[i], swarm[j]);
            
            // Phase coupling (K term)
            applyPhaseCoupling(swarm[i], swarm[j]);
        }
    }
    
    // Integrate: update positions, velocities, and phases with damping
    for (const agent of swarm) {
        agent.update(deltaTime, MU, canvas.width, canvas.height);
    }
}

/**
 * Main render loop with frame-rate independent physics
 * @param {number} currentTime - Current timestamp from requestAnimationFrame
 */
function render(currentTime) {
    // Calculate deltaTime (in seconds)
    // At 60 FPS, this is approximately 1/60 ≈ 0.0167 seconds per frame
    const rawDeltaTime = Math.min(
        (currentTime - lastTime) / 1000,
        DELTA_TIME_CAP
    );
    lastTime = currentTime;
    
    // Apply time scale multiplier to speed up/slow down simulation
    const deltaTime = rawDeltaTime * TIME_SCALE;
    
    // Always update physics (computation happens every frame)
    updatePhysics(deltaTime);
    
    // Clear canvas
    clear();
    
    // Update colors and draw agents
    if (swarm.length === 0) {
        console.warn('Swarm is empty - cannot render');
        return;
    }
    for (const agent of swarm) {
        agent.updateColor();
        agent.draw(ctx);
    }
    
    // Continue the animation loop
    requestAnimationFrame(render);
}

// Initialize and start the simulation
try {
    initialize();
    console.log('Simulation initialized successfully');
    requestAnimationFrame((time) => {
        lastTime = time;
        render(time);
    });
} catch (error) {
    console.error('Failed to initialize simulation:', error);
    throw error;
}
