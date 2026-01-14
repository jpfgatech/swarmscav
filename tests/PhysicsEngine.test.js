/**
 * Unit tests for PhysicsEngine class
 */

import { describe, it, expect } from 'vitest';
import { PhysicsEngine } from '../src/core/PhysicsEngine.js';
import { SimulationState } from '../src/core/SimulationState.js';
import { Config } from '../src/core/Config.js';

describe('PhysicsEngine', () => {
    it('should update positions when two agents are close', () => {
        // Create a minimal config
        const config = {
            J: 1.0,
            K: 0.0,
            REPULSION_STRENGTH: 1000.0,
            EPSILON: 1.0
        };
        
        const engine = new PhysicsEngine(config);
        const state = new SimulationState(2);
        
        // Place two agents close to each other
        // Agent 0 at (0, 0)
        state.setAgent(0, {
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            theta: 0,
            omega: 0.02,
            ax: 0,
            ay: 0,
            dtheta_dt: 0
        });
        
        // Agent 1 at (5, 5) - close enough to interact
        state.setAgent(1, {
            x: 5,
            y: 5,
            vx: 0,
            vy: 0,
            theta: Math.PI / 4,
            omega: 0.02,
            ax: 0,
            ay: 0,
            dtheta_dt: 0
        });
        
        // Store initial positions
        const agent0Before = state.getAgent(0);
        const agent1Before = state.getAgent(1);
        
        // Run physics update
        const deltaTime = 0.01; // Small time step
        engine.update(state, deltaTime);
        
        // Get positions after update
        const agent0After = state.getAgent(0);
        const agent1After = state.getAgent(1);
        
        // Assert that positions have changed (forces were applied)
        // Due to repulsion and attraction, agents should move
        const pos0Changed = Math.abs(agent0After.x - agent0Before.x) > 0.0001 ||
                           Math.abs(agent0After.y - agent0Before.y) > 0.0001;
        const pos1Changed = Math.abs(agent1After.x - agent1Before.x) > 0.0001 ||
                           Math.abs(agent1After.y - agent1Before.y) > 0.0001;
        
        expect(pos0Changed || pos1Changed).toBe(true);
        
        // Verify velocities were set (overdamped dynamics: v = F)
        // After forces are applied, velocities should be non-zero
        const hasVelocity = Math.abs(agent0After.vx) > 0.0001 ||
                           Math.abs(agent0After.vy) > 0.0001 ||
                           Math.abs(agent1After.vx) > 0.0001 ||
                           Math.abs(agent1After.vy) > 0.0001;
        expect(hasVelocity).toBe(true);
    });
    
    it('should apply toroidal boundary wrapping when boundaries provided', () => {
        const config = {
            J: 1.0,
            K: 0.0,
            REPULSION_STRENGTH: 1000.0,
            EPSILON: 1.0
        };
        
        const engine = new PhysicsEngine(config);
        const state = new SimulationState(1);
        
        // Place agent near right boundary
        state.setAgent(0, {
            x: 790, // Near right edge of 800-width boundary
            y: 300,
            vx: 20, // Moving right (will wrap)
            vy: 0,
            theta: 0,
            omega: 0.02,
            ax: 20, // Force pushing right
            ay: 0,
            dtheta_dt: 0
        });
        
        const boundaries = { width: 800, height: 600 };
        const deltaTime = 0.1; // Large enough to cause wrap
        
        engine.update(state, deltaTime, boundaries);
        
        const agent = state.getAgent(0);
        
        // Position should wrap: 790 + 20*0.1 = 792, but if it exceeds 800, wrap to left
        // Actually, with boundaries, it should wrap: 790 + 20*0.1 = 792 (no wrap needed)
        // Let's test with a position that definitely wraps
        state.setAgent(0, {
            x: 795,
            y: 300,
            vx: 0,
            vy: 0,
            theta: 0,
            omega: 0.02,
            ax: 100, // Large force pushing right
            ay: 0,
            dtheta_dt: 0
        });
        
        engine.update(state, deltaTime, boundaries);
        
        const agentAfter = state.getAgent(0);
        // With large force, position should wrap around
        expect(agentAfter.x).toBeGreaterThanOrEqual(0);
        expect(agentAfter.x).toBeLessThan(800);
        expect(agentAfter.y).toBeGreaterThanOrEqual(0);
        expect(agentAfter.y).toBeLessThan(600);
    });
    
    it('should update phases based on natural frequency', () => {
        const config = {
            J: 1.0,
            K: 0.0,
            REPULSION_STRENGTH: 1000.0,
            EPSILON: 1.0
        };
        
        const engine = new PhysicsEngine(config);
        const state = new SimulationState(1);
        
        state.setAgent(0, {
            x: 100,
            y: 100,
            vx: 0,
            vy: 0,
            theta: 0,
            omega: 0.1, // Natural frequency
            ax: 0,
            ay: 0,
            dtheta_dt: 0
        });
        
        const deltaTime = 0.1;
        engine.update(state, deltaTime);
        
        const agent = state.getAgent(0);
        
        // Phase should advance by omega * deltaTime
        // theta_new = theta_old + omega * dt = 0 + 0.1 * 0.1 = 0.01
        expect(agent.theta).toBeCloseTo(0.01, 5);
    });
    
    it('should have no DOM dependencies', () => {
        // This test verifies that PhysicsEngine can be imported and used
        // in a Node.js environment (no window, canvas, document)
        const config = {
            J: 1.0,
            K: 0.0,
            REPULSION_STRENGTH: 1000.0,
            EPSILON: 1.0
        };
        
        // Should not throw even if window/canvas/document don't exist
        expect(() => {
            const engine = new PhysicsEngine(config);
            const state = new SimulationState(10);
            engine.update(state, 0.01);
        }).not.toThrow();
    });
});
