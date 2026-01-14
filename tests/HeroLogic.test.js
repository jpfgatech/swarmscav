/**
 * Unit tests for HeroLogic module
 * Tests hero inertia, velocity blending, and position override
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HeroLogic } from '../HeroLogic.js';

// Mock Agent class for testing
class MockAgent {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

describe('HeroLogic', () => {
    let heroLogic;
    let agents;
    const canvasWidth = 800;
    const canvasHeight = 600;
    const deltaTime = 0.033; // ~30 FPS

    beforeEach(() => {
        agents = [
            new MockAgent(400, 300), // Hero at index 0
            new MockAgent(200, 200),
            new MockAgent(600, 400)
        ];
        heroLogic = new HeroLogic(0, agents[0]);
    });

    describe('constructor', () => {
        it('should initialize with correct hero index', () => {
            expect(heroLogic.getHeroIndex()).toBe(0);
        });

        it('should initialize with provided agent position', () => {
            expect(heroLogic.prevPos.x).toBe(400);
            expect(heroLogic.prevPos.y).toBe(300);
        });

        it('should initialize with default alpha', () => {
            expect(heroLogic.alpha).toBe(0.95);
        });

        it('should initialize with zero velocity', () => {
            expect(heroLogic.heroVelocity.x).toBe(0);
            expect(heroLogic.heroVelocity.y).toBe(0);
        });

        it('should handle null initial agent', () => {
            const logic = new HeroLogic(0, null);
            expect(logic.prevPos.x).toBe(0);
            expect(logic.prevPos.y).toBe(0);
        });
    });

    describe('setAlpha', () => {
        it('should set alpha value', () => {
            heroLogic.setAlpha(0.8);
            expect(heroLogic.alpha).toBe(0.8);
        });

        it('should clamp alpha to [0, 0.99]', () => {
            heroLogic.setAlpha(-0.1);
            expect(heroLogic.alpha).toBe(0.0);
            
            heroLogic.setAlpha(1.5);
            expect(heroLogic.alpha).toBe(0.99);
        });
    });

    describe('setInputActive', () => {
        it('should set input active state', () => {
            heroLogic.setInputActive(true);
            expect(heroLogic.isInputActive).toBe(true);
            
            heroLogic.setInputActive(false);
            expect(heroLogic.isInputActive).toBe(false);
        });
    });

    describe('update - no input active', () => {
        it('should sync hero velocity with engine velocity when input inactive', () => {
            // Move hero from (400, 300) to (410, 310)
            agents[0].x = 410;
            agents[0].y = 310;
            
            heroLogic.update(agents, deltaTime, canvasWidth, canvasHeight);
            
            // Engine velocity = (10, 10) / deltaTime
            const expectedVx = 10 / deltaTime;
            const expectedVy = 10 / deltaTime;
            
            expect(heroLogic.heroVelocity.x).toBeCloseTo(expectedVx, 1);
            expect(heroLogic.heroVelocity.y).toBeCloseTo(expectedVy, 1);
        });

        it('should not override hero position when input inactive', () => {
            const originalX = agents[0].x;
            const originalY = agents[0].y;
            
            // Move hero
            agents[0].x = 410;
            agents[0].y = 310;
            
            heroLogic.update(agents, deltaTime, canvasWidth, canvasHeight);
            
            // Position should remain as set by physics
            expect(agents[0].x).toBe(410);
            expect(agents[0].y).toBe(310);
        });

        it('should update prevPos after update', () => {
            agents[0].x = 410;
            agents[0].y = 310;
            
            heroLogic.update(agents, deltaTime, canvasWidth, canvasHeight);
            
            expect(heroLogic.prevPos.x).toBe(410);
            expect(heroLogic.prevPos.y).toBe(310);
        });
    });

    describe('update - input active', () => {
        beforeEach(() => {
            heroLogic.setInputActive(true);
            heroLogic.setAlpha(0.9);
        });

        it('should blend engine velocity with hero velocity', () => {
            // Set initial hero velocity
            heroLogic.heroVelocity = { x: 100, y: 50 };
            
            // Move hero from (400, 300) to (410, 310) via physics
            agents[0].x = 410;
            agents[0].y = 310;
            
            heroLogic.update(agents, deltaTime, canvasWidth, canvasHeight);
            
            // Engine velocity = (10, 10) / deltaTime
            const engineVx = 10 / deltaTime;
            const engineVy = 10 / deltaTime;
            
            // Blended = (1 - 0.9) * engine + 0.9 * hero
            const expectedVx = 0.1 * engineVx + 0.9 * 100;
            const expectedVy = 0.1 * engineVy + 0.9 * 50;
            
            expect(heroLogic.heroVelocity.x).toBeCloseTo(expectedVx, 1);
            expect(heroLogic.heroVelocity.y).toBeCloseTo(expectedVy, 1);
        });

        it('should override hero position with blended velocity', () => {
            // Set initial hero velocity
            heroLogic.heroVelocity = { x: 200, y: 100 };
            
            // Physics moves hero to (410, 310)
            agents[0].x = 410;
            agents[0].y = 310;
            
            heroLogic.update(agents, deltaTime, canvasWidth, canvasHeight);
            
            // New position = prevPos + blendedVelocity * dt
            // prevPos was (400, 300)
            // blendedVelocity will be calculated
            // Position should be different from physics position
            expect(agents[0].x).not.toBe(410);
            expect(agents[0].y).not.toBe(310);
        });

        it('should handle toroidal boundary wrapping', () => {
            // Place hero near right edge
            agents[0].x = 790;
            agents[0].y = 300;
            heroLogic.prevPos = { x: 790, y: 300 };
            heroLogic.heroVelocity = { x: 50, y: 0 };
            
            // Move hero (would wrap around)
            agents[0].x = 10; // Wrapped from 800+
            agents[0].y = 300;
            
            heroLogic.update(agents, deltaTime, canvasWidth, canvasHeight);
            
            // Should handle wrapping correctly
            expect(agents[0].x).toBeGreaterThanOrEqual(0);
            expect(agents[0].x).toBeLessThan(canvasWidth);
        });

        it('should update prevPos after override', () => {
            heroLogic.heroVelocity = { x: 100, y: 100 };
            agents[0].x = 410;
            agents[0].y = 310;
            
            const newX = agents[0].x;
            const newY = agents[0].y;
            
            heroLogic.update(agents, deltaTime, canvasWidth, canvasHeight);
            
            // prevPos should be updated to new position
            expect(heroLogic.prevPos.x).toBe(agents[0].x);
            expect(heroLogic.prevPos.y).toBe(agents[0].y);
        });
    });

    describe('update - edge cases', () => {
        it('should handle hero index out of bounds', () => {
            const logic = new HeroLogic(100, null); // Index beyond agents array
            logic.update(agents, deltaTime, canvasWidth, canvasHeight);
            // Should not throw error
            expect(true).toBe(true);
        });

        it('should handle zero deltaTime', () => {
            agents[0].x = 410;
            agents[0].y = 310;
            heroLogic.update(agents, 0, canvasWidth, canvasHeight);
            // Should not throw error
            expect(true).toBe(true);
        });
    });

    describe('getHeroIndex', () => {
        it('should return correct hero index', () => {
            expect(heroLogic.getHeroIndex()).toBe(0);
            
            const logic2 = new HeroLogic(5, null);
            expect(logic2.getHeroIndex()).toBe(5);
        });
    });
});
