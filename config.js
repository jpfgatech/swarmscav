/**
 * Swarmalator Simulation Configuration
 * 
 * This file contains all tunable parameters for the swarmalator simulation.
 * Parameters can be overridden via URL query parameters (e.g., ?J=1.0&K=-1.0)
 */

// Helper function to get URL parameter or return default
function getUrlParam(name, defaultValue) {
    if (typeof window === 'undefined') return defaultValue;
    const urlParams = new URLSearchParams(window.location.search);
    const value = urlParams.get(name);
    return value !== null ? parseFloat(value) : defaultValue;
}

// ============================================================================
// Agent Population
// ============================================================================
export const N = getUrlParam('N', 200); // Number of agents

// ============================================================================
// Initial Conditions
// ============================================================================
export const SPEED = 5; // Initial speed magnitude for all agents

// Phase dynamics
export const BASE_OMEGA = 0.1; // Common base intrinsic frequency for all agents
export const OMEGA_VARIATION = 0.00; // Random variation range for omega
// Each agent gets: omega = BASE_OMEGA ± OMEGA_VARIATION

// ============================================================================
// Swarmalator Coupling Constants
// ============================================================================

/**
 * J - Spatial Coupling Constant (Phase-based spatial attraction/repulsion)
 * 
 * Controls how phase differences affect spatial forces between agents.
 * 
 * Positive J (J > 0):
 *   - Agents with similar phases (θ_j ≈ θ_i) attract each other spatially
 *   - Agents with opposite phases (θ_j ≈ θ_i + π) repel each other spatially
 *   - Creates phase-based clustering: similar phases group together
 * 
 * Negative J (J < 0):
 *   - Agents with similar phases repel each other spatially
 *   - Agents with opposite phases attract each other spatially
 *   - Creates phase-based segregation: opposite phases group together
 * 
 * Zero J (J = 0):
 *   - No phase-based spatial coupling
 *   - Spatial forces depend only on repulsion and well forces
 */
export const J = getUrlParam('J', -0.2);

/**
 * K - Phase Coupling Constant (Spatial-based phase synchronization)
 * 
 * Controls how spatial proximity affects phase synchronization between agents.
 * 
 * Positive K (K > 0):
 *   - Nearby agents synchronize their phases (attractive phase coupling)
 *   - Phases converge: θ_j → θ_i for nearby agents
 *   - Creates phase synchronization clusters
 * 
 * Negative K (K < 0):
 *   - Nearby agents anti-synchronize their phases (repulsive phase coupling)
 *   - Phases diverge: θ_j → θ_i + π for nearby agents
 *   - Creates phase wave patterns or spirals
 * 
 * Zero K (K = 0):
 *   - No phase coupling between agents
 *   - Phases evolve only based on intrinsic frequency (omega)
 */
export const K = getUrlParam('K', 0.00);

// ============================================================================
// Spatial Forces
// ============================================================================

/**
 * Harmonic Potential Well (Confinement)
 * Pulls agents toward the center of the canvas
 */
export const K_WELL = getUrlParam('K_WELL', 0.002); // Stiffness coefficient (higher = tighter confinement)

/**
 * Repulsion Force (Collision Avoidance)
 * Prevents agents from overlapping
 */
export const REPULSION_STRENGTH = getUrlParam('REP', 1.0); // Repulsion force multiplier (higher = stronger repulsion)
export const EPSILON = 0.1; // Softening parameter to prevent singularity at r=0
export const CUTOFF_RADIUS = 100; // Distance threshold for repulsion calculation (optimization)

// ============================================================================
// Dynamics
// ============================================================================

/**
 * Velocity Damping (Friction)
 * Removes kinetic energy from the system over time
 */
export const MU = getUrlParam('MU', 0.999); // Damping coefficient
// 1.0 = no friction (perpetual motion)
// 0.9-0.99 = fluid-like (water/air)
// < 0.5 = over-damped (molasses)

/**
 * Time Scale Multiplier
 * Speeds up or slows down the entire simulation
 */
export const TIME_SCALE = 20.0; // 1.0 = normal speed, > 1.0 = faster, < 1.0 = slower

