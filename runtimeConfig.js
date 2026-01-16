/**
 * Runtime Configuration Object
 * 
 * This module provides a mutable configuration object that can be updated
 * in real-time by the ParameterPanel. It initializes from config.js values
 * and allows dynamic updates during simulation.
 * 
 * For batch mode, URL parameters are read here to override initial values.
 */

import {
    N,
    BASE_OMEGA as INIT_BASE_OMEGA,
    OMEGA_VARIATION as INIT_OMEGA_VARIATION,
    J as INIT_J,
    K as INIT_K,
    REPULSION_STRENGTH as INIT_REPULSION_STRENGTH,
    EPSILON as INIT_EPSILON,
    TIME_SCALE as INIT_TIME_SCALE,
    ENERGY_THRESHOLD_PER_AGENT,
    ENERGY_KILL_FRAMES,
    ENABLE_AUTO_KILL
} from './config.js';

// Helper function to get URL parameter (for batch mode only)
function getUrlParam(name, defaultValue) {
    if (typeof window === 'undefined') return defaultValue;
    const urlParams = new URLSearchParams(window.location.search);
    const value = urlParams.get(name);
    return value !== null ? parseFloat(value) : defaultValue;
}

function getUrlParamBool(name, defaultValue) {
    if (typeof window === 'undefined') return defaultValue;
    const urlParams = new URLSearchParams(window.location.search);
    const value = urlParams.get(name);
    if (value === null) return defaultValue;
    return value === 'true' || value === '1';
}

function getUrlParamString(name, defaultValue) {
    if (typeof window === 'undefined') return defaultValue;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name) || defaultValue;
}

/**
 * Mutable runtime configuration object
 * These values can be updated in real-time by the ParameterPanel
 * URL parameters (for batch mode) override initial values
 */
export const RuntimeConfig = {
    // These are mutable and can be updated
    J: getUrlParam('J', INIT_J),
    K: getUrlParam('K', INIT_K),
    BASE_OMEGA: getUrlParam('BASE_OMEGA', INIT_BASE_OMEGA),
    OMEGA_VARIATION: getUrlParam('OMEGA_VARIATION', INIT_OMEGA_VARIATION),
    TIME_SCALE: getUrlParam('TIME_SCALE', INIT_TIME_SCALE),
    EPSILON: getUrlParam('EPSILON', INIT_EPSILON),
    REPULSION_STRENGTH: getUrlParam('REP', INIT_REPULSION_STRENGTH),
    
    // These are read-only (from config.js, with URL override for batch)
    N: getUrlParam('N', N),
    ENERGY_THRESHOLD_PER_AGENT: getUrlParam('ENERGY_THRESHOLD', ENERGY_THRESHOLD_PER_AGENT),
    ENERGY_KILL_FRAMES: getUrlParam('ENERGY_KILL_FRAMES', ENERGY_KILL_FRAMES),
    ENABLE_AUTO_KILL: getUrlParamBool('ENABLE_AUTO_KILL', ENABLE_AUTO_KILL)
};

/**
 * Updates a runtime config value
 * @param {string} key - Config key to update
 * @param {number} value - New value
 */
export function updateRuntimeConfig(key, value) {
    if (key in RuntimeConfig && typeof RuntimeConfig[key] === 'number') {
        RuntimeConfig[key] = value;
        console.log(`Updated ${key} to ${value}`);
    } else {
        console.warn(`Cannot update ${key}: not a mutable config value`);
    }
}
