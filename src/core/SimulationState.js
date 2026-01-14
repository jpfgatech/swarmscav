/**
 * SimulationState: Efficient storage for swarmalator agents using Float32Arrays
 * 
 * This class provides a pure data structure (no DOM dependencies) for storing
 * agent positions, velocities, phases, and accelerations in typed arrays for
 * optimal performance.
 */
export class SimulationState {
    /**
     * @param {number} agentCount - Number of agents in the simulation
     */
    constructor(agentCount) {
        this.N = agentCount;
        
        // Spatial state: positions (x, y) for each agent
        // Layout: [x0, y0, x1, y1, ..., xN-1, yN-1]
        this.positions = new Float32Array(agentCount * 2);
        
        // Velocity state: velocities (vx, vy) for each agent
        // Layout: [vx0, vy0, vx1, vy1, ..., vxN-1, vyN-1]
        this.velocities = new Float32Array(agentCount * 2);
        
        // Phase state: phase (theta) and natural frequency (omega) for each agent
        // Layout: [theta0, omega0, theta1, omega1, ..., thetaN-1, omegaN-1]
        this.phases = new Float32Array(agentCount * 2);
        
        // Acceleration state: forces (ax, ay) for each agent (reset each frame)
        // Layout: [ax0, ay0, ax1, ay1, ..., axN-1, ayN-1]
        this.accelerations = new Float32Array(agentCount * 2);
        
        // Phase derivative (dtheta_dt) for each agent (reset each frame)
        // Layout: [dtheta_dt0, dtheta_dt1, ..., dtheta_dtN-1]
        this.phaseDerivatives = new Float32Array(agentCount);
    }
    
    /**
     * Gets agent data at index i
     * @param {number} i - Agent index (0 to N-1)
     * @returns {Object} Agent data object with all properties
     */
    getAgent(i) {
        if (i < 0 || i >= this.N) {
            throw new Error(`Agent index ${i} out of bounds [0, ${this.N - 1}]`);
        }
        
        const posIdx = i * 2;
        const phaseIdx = i * 2;
        
        return {
            x: this.positions[posIdx],
            y: this.positions[posIdx + 1],
            vx: this.velocities[posIdx],
            vy: this.velocities[posIdx + 1],
            theta: this.phases[phaseIdx],
            omega: this.phases[phaseIdx + 1],
            ax: this.accelerations[posIdx],
            ay: this.accelerations[posIdx + 1],
            dtheta_dt: this.phaseDerivatives[i]
        };
    }
    
    /**
     * Sets agent data at index i
     * @param {number} i - Agent index (0 to N-1)
     * @param {Object} data - Agent data object (partial updates allowed)
     */
    setAgent(i, data) {
        if (i < 0 || i >= this.N) {
            throw new Error(`Agent index ${i} out of bounds [0, ${this.N - 1}]`);
        }
        
        const posIdx = i * 2;
        const phaseIdx = i * 2;
        
        if (data.x !== undefined) this.positions[posIdx] = data.x;
        if (data.y !== undefined) this.positions[posIdx + 1] = data.y;
        if (data.vx !== undefined) this.velocities[posIdx] = data.vx;
        if (data.vy !== undefined) this.velocities[posIdx + 1] = data.vy;
        if (data.theta !== undefined) this.phases[phaseIdx] = data.theta;
        if (data.omega !== undefined) this.phases[phaseIdx + 1] = data.omega;
        if (data.ax !== undefined) this.accelerations[posIdx] = data.ax;
        if (data.ay !== undefined) this.accelerations[posIdx + 1] = data.ay;
        if (data.dtheta_dt !== undefined) this.phaseDerivatives[i] = data.dtheta_dt;
    }
    
    /**
     * Resets all accelerations and phase derivatives to zero (called each frame)
     */
    resetForces() {
        this.accelerations.fill(0);
        this.phaseDerivatives.fill(0);
    }
    
    /**
     * Gets the number of agents
     * @returns {number} Agent count
     */
    getAgentCount() {
        return this.N;
    }
}
