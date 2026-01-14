/**
 * Unit tests for SimulationState class
 */

import { describe, it, expect } from 'vitest';
import { SimulationState } from '../src/core/SimulationState.js';

describe('SimulationState', () => {
    it('should initialize with correct structure', () => {
        const state = new SimulationState(10);
        
        expect(state.getAgentCount()).toBe(10);
        expect(state.positions.length).toBe(20); // 10 agents * 2 (x, y)
        expect(state.velocities.length).toBe(20); // 10 agents * 2 (vx, vy)
        expect(state.phases.length).toBe(20); // 10 agents * 2 (theta, omega)
        expect(state.accelerations.length).toBe(20); // 10 agents * 2 (ax, ay)
        expect(state.phaseDerivatives.length).toBe(10); // 10 agents * 1 (dtheta_dt)
    });
    
    it('should return expected structure from getAgent(0)', () => {
        const state = new SimulationState(5);
        
        const agent = state.getAgent(0);
        
        // Verify structure contains all expected properties
        expect(agent).toHaveProperty('x');
        expect(agent).toHaveProperty('y');
        expect(agent).toHaveProperty('vx');
        expect(agent).toHaveProperty('vy');
        expect(agent).toHaveProperty('theta');
        expect(agent).toHaveProperty('omega');
        expect(agent).toHaveProperty('ax');
        expect(agent).toHaveProperty('ay');
        expect(agent).toHaveProperty('dtheta_dt');
        
        // Verify all values are numbers
        expect(typeof agent.x).toBe('number');
        expect(typeof agent.y).toBe('number');
        expect(typeof agent.vx).toBe('number');
        expect(typeof agent.vy).toBe('number');
        expect(typeof agent.theta).toBe('number');
        expect(typeof agent.omega).toBe('number');
        expect(typeof agent.ax).toBe('number');
        expect(typeof agent.ay).toBe('number');
        expect(typeof agent.dtheta_dt).toBe('number');
        
        // Verify initial values are zero (Float32Array defaults to 0)
        expect(agent.x).toBe(0);
        expect(agent.y).toBe(0);
        expect(agent.vx).toBe(0);
        expect(agent.vy).toBe(0);
        expect(agent.theta).toBe(0);
        expect(agent.omega).toBe(0);
        expect(agent.ax).toBe(0);
        expect(agent.ay).toBe(0);
        expect(agent.dtheta_dt).toBe(0);
    });
    
    it('should set and get agent data correctly', () => {
        const state = new SimulationState(3);
        
        // Set agent 0
        state.setAgent(0, {
            x: 10.5,
            y: 20.7,
            vx: 1.2,
            vy: -0.5,
            theta: Math.PI / 4,
            omega: 0.02,
            ax: 0.1,
            ay: -0.2,
            dtheta_dt: 0.03
        });
        
        const agent = state.getAgent(0);
        
        expect(agent.x).toBeCloseTo(10.5, 5);
        expect(agent.y).toBeCloseTo(20.7, 5);
        expect(agent.vx).toBeCloseTo(1.2, 5);
        expect(agent.vy).toBeCloseTo(-0.5, 5);
        expect(agent.theta).toBeCloseTo(Math.PI / 4, 5);
        expect(agent.omega).toBeCloseTo(0.02, 5);
        expect(agent.ax).toBeCloseTo(0.1, 5);
        expect(agent.ay).toBeCloseTo(-0.2, 5);
        expect(agent.dtheta_dt).toBeCloseTo(0.03, 5);
    });
    
    it('should support partial updates with setAgent', () => {
        const state = new SimulationState(2);
        
        // Set initial values
        state.setAgent(0, { x: 100, y: 200, vx: 1, vy: 2 });
        
        // Partial update - only change x
        state.setAgent(0, { x: 150 });
        
        const agent = state.getAgent(0);
        expect(agent.x).toBe(150);
        expect(agent.y).toBe(200); // Unchanged
        expect(agent.vx).toBe(1); // Unchanged
        expect(agent.vy).toBe(2); // Unchanged
    });
    
    it('should handle multiple agents independently', () => {
        const state = new SimulationState(3);
        
        state.setAgent(0, { x: 1, y: 2, theta: 0.1 });
        state.setAgent(1, { x: 10, y: 20, theta: 0.2 });
        state.setAgent(2, { x: 100, y: 200, theta: 0.3 });
        
        expect(state.getAgent(0).x).toBe(1);
        expect(state.getAgent(1).x).toBe(10);
        expect(state.getAgent(2).x).toBe(100);
        
        expect(state.getAgent(0).theta).toBeCloseTo(0.1, 5);
        expect(state.getAgent(1).theta).toBeCloseTo(0.2, 5);
        expect(state.getAgent(2).theta).toBeCloseTo(0.3, 5);
    });
    
    it('should throw error for out-of-bounds index', () => {
        const state = new SimulationState(5);
        
        expect(() => state.getAgent(-1)).toThrow('out of bounds');
        expect(() => state.getAgent(5)).toThrow('out of bounds');
        expect(() => state.setAgent(-1, { x: 1 })).toThrow('out of bounds');
        expect(() => state.setAgent(5, { x: 1 })).toThrow('out of bounds');
    });
    
    it('should reset forces correctly', () => {
        const state = new SimulationState(2);
        
        // Set some forces
        state.setAgent(0, { ax: 1.5, ay: 2.5, dtheta_dt: 0.1 });
        state.setAgent(1, { ax: 3.0, ay: 4.0, dtheta_dt: 0.2 });
        
        // Verify forces are set
        expect(state.getAgent(0).ax).toBeCloseTo(1.5, 5);
        expect(state.getAgent(0).dtheta_dt).toBeCloseTo(0.1, 5);
        
        // Reset forces
        state.resetForces();
        
        // Verify all forces are zero
        expect(state.getAgent(0).ax).toBe(0);
        expect(state.getAgent(0).ay).toBe(0);
        expect(state.getAgent(0).dtheta_dt).toBe(0);
        expect(state.getAgent(1).ax).toBe(0);
        expect(state.getAgent(1).ay).toBe(0);
        expect(state.getAgent(1).dtheta_dt).toBe(0);
    });
});
