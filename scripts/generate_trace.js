/**
 * Task 1: Reference Data Generation (JS Side)
 * 
 * Generates a deterministic trace.json from the Swarmalator physics engine.
 * Uses seeded LCG for reproducibility and fixed dt=0.05.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Constants (Stage 1 Parameters)
// ============================================================================
const N = 100;
const J = 8.0;
const K = -4.0;
const TIME_SCALE = 50.0;
const REPULSION_STRENGTH = 4000.0;
const EPSILON = 4.0;
const BASE_OMEGA = 0.1;
const OMEGA_VARIATION = 0.0;
const LOGICAL_WIDTH = 1000;
const LOGICAL_HEIGHT = 1000;
const DT = 0.05; // Fixed time step

// ============================================================================
// Seeded Random Number Generator (LCG)
// ============================================================================
let seed = 12345;
function seededRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
}

// ============================================================================
// Agent Class
// ============================================================================
class Agent {
    constructor(canvasWidth, canvasHeight, baseOmega, omegaVariation) {
        // Random position within canvas bounds
        this.x = seededRandom() * canvasWidth;
        this.y = seededRandom() * canvasHeight;
        
        // Velocity initialized to zero (overdamped model)
        this.vx = 0;
        this.vy = 0;
        
        // Random phase and natural frequency
        this.theta = seededRandom() * 2 * Math.PI;
        this.omega = baseOmega + (seededRandom() - 0.5) * 2 * omegaVariation;
        
        // Acceleration (updated each frame)
        this.ax = 0;
        this.ay = 0;
        
        // Phase derivative (updated each frame)
        this.dtheta_dt = 0;
    }
    
    update(deltaTime, canvasWidth, canvasHeight) {
        // Overdamped dynamics: velocity = force directly
        this.vx = this.ax;
        this.vy = this.ay;
        
        // Update position
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        // Update phase
        this.theta += this.dtheta_dt * deltaTime;
        
        // Wrap phase to [0, 2π]
        while (this.theta < 0) this.theta += 2 * Math.PI;
        while (this.theta >= 2 * Math.PI) this.theta -= 2 * Math.PI;
        
        // Toroidal boundary wrapping
        if (this.x < 0) this.x += canvasWidth;
        if (this.x >= canvasWidth) this.x -= canvasWidth;
        if (this.y < 0) this.y += canvasHeight;
        if (this.y >= canvasHeight) this.y -= canvasHeight;
        
        // Reset for next frame
        this.ax = 0;
        this.ay = 0;
        this.dtheta_dt = 0;
    }
    
    addForce(fx, fy) {
        this.ax += fx;
        this.ay += fy;
    }
    
    addPhaseDerivative(dtheta) {
        this.dtheta_dt += dtheta;
    }
}

// ============================================================================
// Toroidal Distance Calculation
// ============================================================================
function toroidalDistance(x1, y1, x2, y2, width, height) {
    let dx = x2 - x1;
    let dy = y2 - y1;
    
    if (Math.abs(dx) > width / 2) {
        dx = dx > 0 ? dx - width : dx + width;
    }
    if (Math.abs(dy) > height / 2) {
        dy = dy > 0 ? dy - height : dy + height;
    }
    
    const distanceSquared = dx * dx + dy * dy;
    const distance = Math.sqrt(distanceSquared);
    
    return { dx, dy, distance, distanceSquared };
}

// ============================================================================
// Force Calculations
// ============================================================================
function applyRepulsionForce(agent1, agent2, dx, dy, distanceSquared) {
    const invDistanceSqPlusEpsilon = 1.0 / (distanceSquared + EPSILON);
    const forceMagnitude = REPULSION_STRENGTH * invDistanceSqPlusEpsilon / N;
    
    const invDistance = 1.0 / Math.sqrt(distanceSquared);
    const fx = dx * invDistance * forceMagnitude;
    const fy = dy * invDistance * forceMagnitude;
    
    agent1.addForce(fx, fy);
    agent2.addForce(-fx, -fy);
}

function applyPhaseBasedSpatialCoupling(agent1, agent2, dx, dy, distance) {
    const phaseDiff = agent2.theta - agent1.theta;
    const invDistance = 1.0 / distance;
    const unitX = dx * invDistance;
    const unitY = dy * invDistance;
    
    const couplingStrength = (1.0 + J * Math.cos(phaseDiff)) / N;
    const fx = unitX * couplingStrength;
    const fy = unitY * couplingStrength;
    
    agent1.addForce(fx, fy);
    agent2.addForce(-fx, -fy);
}

function applyPhaseCoupling(agent1, agent2, distance) {
    if (distance < 0.001) {
        return; // Numerical stability
    }
    
    const phaseDiff = agent2.theta - agent1.theta;
    const invDistance = 1.0 / distance;
    const phaseCoupling = K * Math.sin(phaseDiff) * invDistance / N;
    
    agent1.addPhaseDerivative(phaseCoupling);
    agent2.addPhaseDerivative(-phaseCoupling);
}

// ============================================================================
// Physics Update
// ============================================================================
function updatePhysics(swarm, deltaTime, action) {
    // Reset accelerations and phase derivatives
    for (const agent of swarm) {
        agent.ax = 0;
        agent.ay = 0;
        agent.dtheta_dt = agent.omega; // Start with natural frequency
    }
    
    // Calculate forces (pairwise interactions)
    for (let i = 0; i < swarm.length; i++) {
        for (let j = i + 1; j < swarm.length; j++) {
            const { dx: dxAttract, dy: dyAttract, distance, distanceSquared } = 
                toroidalDistance(swarm[i].x, swarm[i].y, swarm[j].x, swarm[j].y, LOGICAL_WIDTH, LOGICAL_HEIGHT);
            
            // Skip if too close (numerical stability)
            if (distanceSquared < 0.000001) {
                continue;
            }
            
            const dxRepel = -dxAttract;
            const dyRepel = -dyAttract;
            
            // Apply forces
            applyRepulsionForce(swarm[i], swarm[j], dxRepel, dyRepel, distanceSquared);
            applyPhaseBasedSpatialCoupling(swarm[i], swarm[j], dxAttract, dyAttract, distance);
            applyPhaseCoupling(swarm[i], swarm[j], distance);
        }
    }
    
    // Apply actions: zero out velocities for affected agents
    // Action 0: No-op (do nothing)
    // Action 1: Hold Hero (index 0)
    // Action 2: Hold Targets (indices 1-10)
    // Action 3: Hold Both (Hero + Targets)
    
    if (action === 1 || action === 3) {
        // Hold Hero
        swarm[0].vx = 0;
        swarm[0].vy = 0;
    }
    
    if (action === 2 || action === 3) {
        // Hold Targets (indices 1-10)
        for (let i = 1; i <= 10 && i < swarm.length; i++) {
            swarm[i].vx = 0;
            swarm[i].vy = 0;
        }
    }
    
    // Integrate: update positions and phases
    for (const agent of swarm) {
        agent.update(deltaTime, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    }
}

// ============================================================================
// Initialization
// ============================================================================
function initialize() {
    const swarm = [];
    
    // Create agents with random positions
    for (let i = 0; i < N; i++) {
        swarm.push(new Agent(LOGICAL_WIDTH, LOGICAL_HEIGHT, BASE_OMEGA, OMEGA_VARIATION));
    }
    
    // Calculate and subtract center of mass
    let sumX = 0, sumY = 0;
    for (const agent of swarm) {
        sumX += agent.x;
        sumY += agent.y;
    }
    const centerX = sumX / N;
    const centerY = sumY / N;
    
    // Shift all positions to center at origin
    for (const agent of swarm) {
        agent.x -= centerX;
        agent.y -= centerY;
    }
    
    // Calculate and subtract mean velocity (should be 0, but for completeness)
    let sumVx = 0, sumVy = 0;
    for (const agent of swarm) {
        sumVx += agent.vx;
        sumVy += agent.vy;
    }
    const meanVx = sumVx / N;
    const meanVy = sumVy / N;
    
    for (const agent of swarm) {
        agent.vx -= meanVx;
        agent.vy -= meanVy;
    }
    
    // Re-center positions to logical coordinate center
    const logicalCenterX = LOGICAL_WIDTH / 2;
    const logicalCenterY = LOGICAL_HEIGHT / 2;
    for (const agent of swarm) {
        agent.x += logicalCenterX;
        agent.y += logicalCenterY;
    }
    
    return swarm;
}

// ============================================================================
// Get Action for Frame
// ============================================================================
function getActionForFrame(frame) {
    if (frame <= 50) return 0;
    if (frame <= 100) return 1;
    if (frame <= 150) return 2;
    return 3;
}

// ============================================================================
// Export State
// ============================================================================
function exportState(swarm, frame) {
    return {
        frame: frame,
        hero_pos: [swarm[0].x, swarm[0].y],
        agents_pos: swarm.map(agent => [agent.x, agent.y]),
        agents_phase: swarm.map(agent => agent.theta)
    };
}

// ============================================================================
// Main Execution
// ============================================================================
function main() {
    console.log('Generating deterministic trace...');
    console.log(`Parameters: N=${N}, J=${J}, K=${K}, dt=${DT}`);
    
    // Reset seed for deterministic initialization
    seed = 12345;
    
    // Initialize swarm
    const swarm = initialize();
    console.log(`Initialized ${swarm.length} agents`);
    
    // Collect trace data
    const trace = [];
    
    // Export initial state (frame 0)
    trace.push(exportState(swarm, 0));
    
    // Run simulation for 200 frames
    for (let frame = 1; frame <= 200; frame++) {
        const action = getActionForFrame(frame);
        updatePhysics(swarm, DT, action);
        trace.push(exportState(swarm, frame));
        
        if (frame % 50 === 0) {
            console.log(`Frame ${frame}/200 completed`);
        }
    }
    
    // Save trace.json
    const outputPath = path.join(__dirname, '..', 'python', 'data', 'trace.json');
    fs.writeFileSync(outputPath, JSON.stringify(trace, null, 2));
    
    console.log(`\nTrace saved to: ${outputPath}`);
    console.log(`Total frames: ${trace.length}`);
    console.log(`File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
}

// Run
main();
