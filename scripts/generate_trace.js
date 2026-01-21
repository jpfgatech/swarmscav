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
// Time step: Use scaled time to match JS behavior
// JS uses: deltaTime = rawDeltaTime * TIME_SCALE = 0.0333 * 50 = 1.67
// For deterministic trace, use: dt = 0.05 * TIME_SCALE = 2.5
// This matches the physics time scale used in JS
const DT = 0.05 * TIME_SCALE; // Scaled time step (2.5 seconds per frame)

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
// Track previous positions for action application (persists across frames)
const prevPositions = new Map();

function updatePhysics(swarm, deltaTime, action, prevAction) {
    // Update previous positions when action changes or becomes inactive
    // Store positions at the START of an action (when action becomes active)
    if (prevAction !== action) {
        // Action changed - store current positions as "previous" for new action
        if (action === 1 || action === 3) {
            prevPositions.set(0, { x: swarm[0].x, y: swarm[0].y });
        }
        if (action === 2 || action === 3) {
            for (let i = 1; i <= 10 && i < swarm.length; i++) {
                prevPositions.set(i, { x: swarm[i].x, y: swarm[i].y });
            }
        }
    }
    
    // Reset accelerations and phase derivatives
    for (const agent of swarm) {
        agent.ax = 0;
        agent.ay = 0;
        agent.dtheta_dt = agent.omega; // Start with natural frequency
    }
    
    // Calculate forces (pairwise interactions)
    // NOTE: Match main.js behavior - NO toroidal wrapping in force calculations
    // Positions wrap at boundaries, but forces use straight-line distances
    for (let i = 0; i < swarm.length; i++) {
        for (let j = i + 1; j < swarm.length; j++) {
            // Direct distance calculation (matching main.js lines 266-269)
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
            
            // Apply forces
            applyRepulsionForce(swarm[i], swarm[j], dxRepel, dyRepel, distanceSquared);
            applyPhaseBasedSpatialCoupling(swarm[i], swarm[j], dxAttract, dyAttract, distance);
            applyPhaseCoupling(swarm[i], swarm[j], distance);
        }
    }
    
    // Integrate: update positions and phases FIRST
    for (const agent of swarm) {
        agent.update(deltaTime, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    }
    
    // Apply actions AFTER integration (matching JS behavior)
    // Action 0: No-op (do nothing)
    // Action 1: Hold Hero (index 0)
    // Action 2: Hold Targets (indices 1-10)
    // Action 3: Hold Both (Hero + Targets)
    
    if (action === 1 || action === 3) {
        // Hold Hero: reset to previous position and zero velocity
        const prevPos = prevPositions.get(0);
        if (prevPos) {
            swarm[0].x = prevPos.x;
            swarm[0].y = prevPos.y;
        }
        swarm[0].vx = 0;
        swarm[0].vy = 0;
        swarm[0].ax = 0;  // Also zero acceleration for next frame
        swarm[0].ay = 0;
    }
    
    if (action === 2 || action === 3) {
        // Hold Targets: reset to previous positions and zero velocities
        for (let i = 1; i <= 10 && i < swarm.length; i++) {
            const prevPos = prevPositions.get(i);
            if (prevPos) {
                swarm[i].x = prevPos.x;
                swarm[i].y = prevPos.y;
            }
            swarm[i].vx = 0;
            swarm[i].vy = 0;
            swarm[i].ax = 0;
            swarm[i].ay = 0;
        }
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
// Action sequence with recovery periods (tests all 4 actions):
// - Action 0: No-Op (Release all)
// - Action 1: Hold Hero
// - Action 2: Hold Targets
// - Action 3: Hold Both
// - Max stamina = 2.0 seconds
// - dt = 0.05 seconds per frame
// - Stamina lasts 40 frames (2.0 / 0.05 = 40)
// - Use 40 frames per action, with 40-frame recovery (Action 0) between actions
// Sequence: 0 -> 1 -> 0 -> 2 -> 0 -> 3 -> 0 (7 stages total, 280 frames)
function getActionForFrame(frame) {
    if (frame <= 40) return 0;      // Frames 0-40: No-op (initial)
    if (frame <= 80) return 1;      // Frames 41-80: Hold Hero (2.0 seconds)
    if (frame <= 120) return 0;     // Frames 81-120: No-op (recovery)
    if (frame <= 160) return 2;     // Frames 121-160: Hold Targets (2.0 seconds)
    if (frame <= 200) return 0;     // Frames 161-200: No-op (recovery)
    if (frame <= 240) return 3;     // Frames 201-240: Hold Both (2.0 seconds)
    return 0;                        // Frames 241-280: No-op (recovery)
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
    
    // Run simulation for 280 frames (7 stages: 0->1->0->2->0->3->0)
    // Each action segment is 40 frames (2.0 seconds) to respect stamina limit
    // Recovery periods (Action 0) allow stamina to regenerate
    const TOTAL_FRAMES = 280;
    let prevAction = 0;
    for (let frame = 1; frame <= TOTAL_FRAMES; frame++) {
        const action = getActionForFrame(frame);
        updatePhysics(swarm, DT, action, prevAction);
        prevAction = action;
        trace.push(exportState(swarm, frame));
        
        if (frame % 40 === 0) {
            const actionName = ['No-op', 'Hold Hero', 'Hold Targets', 'Hold Both'][action];
            console.log(`Frame ${frame}/${TOTAL_FRAMES} completed (Action ${action}: ${actionName})`);
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
