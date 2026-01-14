/**
 * PhysicsEngine: Pure physics computation for swarmalator simulation
 * 
 * This class contains all physics logic with ZERO DOM dependencies.
 * It operates on SimulationState and Config objects, performing:
 * - Force calculations (repulsion, phase-based attraction, phase coupling)
 * - Overdamped dynamics integration
 * - Boundary wrapping (optional, if boundaries provided)
 */

import { SimulationState } from './SimulationState.js';

export class PhysicsEngine {
    /**
     * @param {Object} config - Configuration object (from Config.js)
     */
    constructor(config) {
        this.config = config;
    }
    
    /**
     * Main physics update step: calculates all forces and integrates motion
     * @param {SimulationState} state - The simulation state to update
     * @param {number} deltaTime - Time step for integration
     * @param {Object} boundaries - Optional boundary constraints {width, height} for toroidal wrapping
     */
    update(state, deltaTime, boundaries = null) {
        const N = state.getAgentCount();
        const { J, K, REPULSION_STRENGTH, EPSILON } = this.config;
        
        // Reset all accelerations and phase derivatives
        state.resetForces();
        
        // Initialize phase derivatives with natural frequency (omega)
        for (let i = 0; i < N; i++) {
            const agent = state.getAgent(i);
            state.setAgent(i, { dtheta_dt: agent.omega });
        }
        
        // Apply all pairwise interactions (optimized: calculate distance once per pair)
        for (let i = 0; i < N; i++) {
            for (let j = i + 1; j < N; j++) {
                const agent1 = state.getAgent(i);
                const agent2 = state.getAgent(j);
                
                // Calculate distance vector once for all three interactions
                const dxAttract = agent2.x - agent1.x; // For attraction (agent1 -> agent2)
                const dyAttract = agent2.y - agent1.y;
                const dxRepel = agent1.x - agent2.x;   // For repulsion (agent1 <- agent2)
                const dyRepel = agent1.y - agent2.y;
                const distanceSquared = dxAttract * dxAttract + dyAttract * dyAttract;
                
                // Skip if too close (numerical stability)
                if (distanceSquared < 0.000001) {
                    continue;
                }
                
                const distance = Math.sqrt(distanceSquared);
                
                // Repulsion forces (collision avoidance)
                this._applyRepulsionForce(state, i, j, dxRepel, dyRepel, distanceSquared, N, REPULSION_STRENGTH, EPSILON);
                
                // Phase-based spatial coupling (J term)
                this._applyPhaseBasedSpatialCoupling(state, i, j, dxAttract, dyAttract, distance, N, J);
                
                // Phase coupling (K term)
                this._applyPhaseCoupling(state, i, j, distance, N, K);
            }
        }
        
        // Integrate: update positions, velocities, and phases using overdamped dynamics
        for (let i = 0; i < N; i++) {
            const agent = state.getAgent(i);
            
            // Overdamped dynamics: velocity = force (no accumulation, no momentum)
            const vx = agent.ax; // Velocity is directly set to force
            const vy = agent.ay;
            
            // Update position: r = r + v * dt = r + F * dt
            let newX = agent.x + vx * deltaTime;
            let newY = agent.y + vy * deltaTime;
            
            // Update phase: θ = θ + dθ/dt * dt
            let newTheta = agent.theta + agent.dtheta_dt * deltaTime;
            
            // Wrap phase to [0, 2π]
            while (newTheta < 0) newTheta += 2 * Math.PI;
            while (newTheta >= 2 * Math.PI) newTheta -= 2 * Math.PI;
            
            // Toroidal boundary wrapping (if boundaries provided)
            if (boundaries) {
                if (newX < 0) newX += boundaries.width;
                if (newX >= boundaries.width) newX -= boundaries.width;
                if (newY < 0) newY += boundaries.height;
                if (newY >= boundaries.height) newY -= boundaries.height;
            }
            
            // Update state
            state.setAgent(i, {
                x: newX,
                y: newY,
                vx: vx,
                vy: vy,
                theta: newTheta
            });
        }
    }
    
    /**
     * Calculates and applies repulsion forces between two agents
     * Reference: F_rep = (r_i - r_j) / (|r_i - r_j|^2 + epsilon) / N
     * @private
     */
    _applyRepulsionForce(state, i, j, dx, dy, distanceSquared, N, REPULSION_STRENGTH, EPSILON) {
        // Soft core repulsion: F = (r_i - r_j) / (|r_i - r_j|^2 + epsilon) / N
        const invDistanceSqPlusEpsilon = 1.0 / (distanceSquared + EPSILON);
        const forceMagnitude = REPULSION_STRENGTH * invDistanceSqPlusEpsilon / N;
        
        // Normalize direction using distanceSquared to avoid sqrt
        const invDistance = 1.0 / Math.sqrt(distanceSquared);
        const fx = dx * invDistance * forceMagnitude;
        const fy = dy * invDistance * forceMagnitude;
        
        // Apply force (symmetric, Newton's third law)
        const agent1 = state.getAgent(i);
        const agent2 = state.getAgent(j);
        state.setAgent(i, {
            ax: agent1.ax + fx,
            ay: agent1.ay + fy
        });
        state.setAgent(j, {
            ax: agent2.ax - fx,
            ay: agent2.ay - fy
        });
    }
    
    /**
     * Calculates and applies phase-based spatial coupling (J term)
     * Reference: F_att = (1 + J*cos(θ_j - θ_i)) * (r_j - r_i) / |r_j - r_i| / N
     * @private
     */
    _applyPhaseBasedSpatialCoupling(state, i, j, dx, dy, distance, N, J) {
        const agent1 = state.getAgent(i);
        const agent2 = state.getAgent(j);
        
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
        const couplingStrength = (1.0 + J * Math.cos(phaseDiff)) / N;
        
        const fx = unitX * couplingStrength;
        const fy = unitY * couplingStrength;
        
        // Apply force (symmetric, Newton's third law)
        state.setAgent(i, {
            ax: agent1.ax + fx,
            ay: agent1.ay + fy
        });
        state.setAgent(j, {
            ax: agent2.ax - fx,
            ay: agent2.ay - fy
        });
    }
    
    /**
     * Calculates and applies phase coupling (K term)
     * Reference: dθ/dt += K * sin(θ_j - θ_i) / |r_j - r_i| / N
     * @private
     */
    _applyPhaseCoupling(state, i, j, distance, N, K) {
        // Skip if too close (numerical stability)
        if (distance < 0.001) {
            return;
        }
        
        const agent1 = state.getAgent(i);
        const agent2 = state.getAgent(j);
        
        // Phase difference
        const phaseDiff = agent2.theta - agent1.theta;
        
        // Phase coupling: K * sin(θ_j - θ_i) / |r_j - r_i| / N
        // The /N scaling is critical to prevent phase derivative explosion
        const invDistance = 1.0 / distance;
        const phaseCoupling = K * Math.sin(phaseDiff) * invDistance / N;
        
        // Apply phase derivative (symmetric)
        state.setAgent(i, {
            dtheta_dt: agent1.dtheta_dt + phaseCoupling
        });
        state.setAgent(j, {
            dtheta_dt: agent2.dtheta_dt - phaseCoupling
        });
    }
}
