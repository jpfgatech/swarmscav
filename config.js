/**
 * Swarmalator Simulation Configuration
 * 
 * This file applies URL parameter overrides to the pure Config object.
 * Parameters can be overridden via URL query parameters (e.g., ?J=1.0&K=-1.0)
 */

import { Config as DefaultConfig } from './src/core/Config.js';

// Helper function to get URL parameter or return default
function getUrlParam(name, defaultValue) {
    if (typeof window === 'undefined') return defaultValue;
    const urlParams = new URLSearchParams(window.location.search);
    const value = urlParams.get(name);
    return value !== null ? parseFloat(value) : defaultValue;
}

// Helper function to get URL parameter as boolean
function getUrlParamBool(name, defaultValue) {
    if (typeof window === 'undefined') return defaultValue;
    const urlParams = new URLSearchParams(window.location.search);
    const value = urlParams.get(name);
    if (value === null) return defaultValue;
    return value === 'true' || value === '1';
}

// ============================================================================
// Agent Population
// ============================================================================
export const N = getUrlParam('N', DefaultConfig.N);

// ============================================================================
// Initial Conditions
// ============================================================================
export const BASE_OMEGA = getUrlParam('BASE_OMEGA', DefaultConfig.BASE_OMEGA);
export const OMEGA_VARIATION = getUrlParam('OMEGA_VARIATION', DefaultConfig.OMEGA_VARIATION);

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
export const J = getUrlParam('J', DefaultConfig.J);

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
export const K = getUrlParam('K', DefaultConfig.K);

// ============================================================================
// Spatial Forces
// ============================================================================

/**
 * Repulsion Force (Collision Avoidance)
 * Prevents agents from overlapping
 * NOTE: Must be significantly larger than attraction strength to prevent collapse
 * The attraction term has constant strength (infinite range), so repulsion needs to dominate at close distances
 */
export const REPULSION_STRENGTH = getUrlParam('REP', DefaultConfig.REPULSION_STRENGTH);
export const EPSILON = getUrlParam('EPSILON', DefaultConfig.EPSILON);

// ============================================================================
// Dynamics
// ============================================================================

/**
 * Time Scale Multiplier
 * Speeds up or slows down the entire simulation
 */
export const TIME_SCALE = getUrlParam('TIME_SCALE', DefaultConfig.TIME_SCALE);

// ============================================================================
// Energy Monitor (Auto-Kill Optimization)
// ============================================================================

/**
 * Energy threshold per agent for convergence detection
 * When average kinetic energy per agent falls below this value for ENERGY_KILL_FRAMES
 * consecutive frames, the simulation is considered "dead" (reached equilibrium)
 */
export const ENERGY_THRESHOLD_PER_AGENT = getUrlParam('ENERGY_THRESHOLD', DefaultConfig.ENERGY_THRESHOLD_PER_AGENT);

/**
 * Number of consecutive frames below threshold required to trigger auto-kill
 * At 30 FPS, default of 30 frames = 1 second of low energy
 */
export const ENERGY_KILL_FRAMES = getUrlParam('ENERGY_KILL_FRAMES', DefaultConfig.ENERGY_KILL_FRAMES);

/**
 * Enable auto-kill optimization (only active in batch mode)
 * When false, simulation continues even if equilibrium is reached (for dev mode)
 * Default: false (disabled in dev mode)
 */
export const ENABLE_AUTO_KILL = getUrlParamBool('ENABLE_AUTO_KILL', DefaultConfig.ENABLE_AUTO_KILL);
