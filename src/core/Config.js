/**
 * Pure Configuration Object
 * 
 * This file contains all default simulation parameters as a pure JavaScript object.
 * No DOM dependencies - can be used in Node.js or browser contexts.
 * 
 * URL parameter overrides are applied in config.js (which imports this).
 */

export const Config = {
    // ============================================================================
    // Agent Population
    // ============================================================================
    N: 200, // Number of agents

    // ============================================================================
    // Initial Conditions
    // ============================================================================
    BASE_OMEGA: 0.02, // Common base intrinsic frequency for all agents
    OMEGA_VARIATION: 0.02, // Random variation range for omega

    // ============================================================================
    // Swarmalator Coupling Constants
    // ============================================================================
    J: 1.2, // Spatial coupling constant (phase-based spatial attraction/repulsion)
    K: 0.00, // Phase coupling constant (spatial-based phase synchronization)

    // ============================================================================
    // Spatial Forces
    // ============================================================================
    REPULSION_STRENGTH: 4000.0, // Repulsion force multiplier (scaled for 800x600 canvas)
    EPSILON: 4.0, // Softening parameter to prevent singularity at r=0

    // ============================================================================
    // Dynamics
    // ============================================================================
    TIME_SCALE: 100.0, // 1.0 = normal speed, > 1.0 = faster, < 1.0 = slower

    // ============================================================================
    // Energy Monitor (Auto-Kill Optimization)
    // ============================================================================
    ENERGY_THRESHOLD_PER_AGENT: 0.001, // Average energy threshold per agent
    ENERGY_KILL_FRAMES: 30, // Consecutive frames below threshold to trigger kill
    ENABLE_AUTO_KILL: false // Enable auto-kill optimization (only active in batch mode)
};
