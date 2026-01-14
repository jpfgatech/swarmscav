/**
 * Swarmalator Simulation Configuration
 * 
 * This file re-exports the pure Config object from src/core/Config.js.
 * For interactive parameter tuning, use the ParameterPanel.
 * For batch mode, URL parameters are handled in runtimeConfig.js.
 */

import { Config } from './src/core/Config.js';

// Re-export all config values directly (no URL parameter parsing)
export const N = Config.N;
export const BASE_OMEGA = Config.BASE_OMEGA;
export const OMEGA_VARIATION = Config.OMEGA_VARIATION;
export const J = Config.J;
export const K = Config.K;
export const REPULSION_STRENGTH = Config.REPULSION_STRENGTH;
export const EPSILON = Config.EPSILON;
export const TIME_SCALE = Config.TIME_SCALE;
export const ENERGY_THRESHOLD_PER_AGENT = Config.ENERGY_THRESHOLD_PER_AGENT;
export const ENERGY_KILL_FRAMES = Config.ENERGY_KILL_FRAMES;
export const ENABLE_AUTO_KILL = Config.ENABLE_AUTO_KILL;
