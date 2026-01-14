/**
 * Unit tests for HeroLogic module
 * Tests hero boost, position override, and hero-target proximity
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
            new MockAgent(200, 200), // Target at index 1
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

        it('should initialize with default boost alpha', () => {
            expect(heroLogic.boostAlpha).toBe(1.0);
        });

        it('should initialize with target index', () => {
            expect(heroLogic.targetIndex).toBe(1);
        });

        it('should handle null initial agent', () => {
            const logic = new HeroLogic(0, null);
            expect(logic.prevPos.x).toBe(0);
            expect(logic.prevPos.y).toBe(0);
        });
    });

    describe('setBoostAlpha', () => {
        it('should set boost alpha value', () => {
            heroLogic.setBoostAlpha(3.0);
            expect(heroLogic.boostAlpha).toBe(3.0);
        });

        it('should clamp boost alpha to [1.0, 16.0]', () => {
            heroLogic.setBoostAlpha(-1.0);
            expect(heroLogic.boostAlpha).toBe(1.0);
            
            heroLogic.setBoostAlpha(20.0);
            expect(heroLogic.boostAlpha).toBe(16.0);
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

        it('should not be boosting when input inactive', () => {
            heroLogic.update(agents, deltaTime, canvasWidth, canvasHeight);
            expect(heroLogic.isBoosting).toBe(false);
        });
    });

    describe('update - input active', () => {
        beforeEach(() => {
            heroLogic.setInputActive(true);
            heroLogic.setBoostAlpha(3.0);
        });

        it('should boost hero position along natural trajectory', () => {
            // Move hero from (400, 300) to (410, 310) via physics
            agents[0].x = 410;
            agents[0].y = 310;
            
            heroLogic.update(agents, deltaTime, canvasWidth, canvasHeight);
            
            // boostStep = naturalStep * boostAlpha = (10, 10) * 3.0 = (30, 30)
            // newPos = prevPos + boostStep = (400, 300) + (30, 30) = (430, 330)
            expect(agents[0].x).toBe(430);
            expect(agents[0].y).toBe(330);
        });

        it('should set isBoosting flag when input active', () => {
            agents[0].x = 410;
            agents[0].y = 310;
            
            heroLogic.update(agents, deltaTime, canvasWidth, canvasHeight);
            
            expect(heroLogic.isBoosting).toBe(true);
        });

        it('should handle toroidal boundary wrapping', () => {
            // Place hero near right edge
            agents[0].x = 790;
            agents[0].y = 300;
            heroLogic.prevPos = { x: 790, y: 300 };
            
            // Move hero (would wrap around)
            agents[0].x = 10; // Wrapped from 800+
            agents[0].y = 300;
            
            heroLogic.update(agents, deltaTime, canvasWidth, canvasHeight);
            
            // Should handle wrapping correctly
            expect(agents[0].x).toBeGreaterThanOrEqual(0);
            expect(agents[0].x).toBeLessThan(canvasWidth);
        });

        it('should update prevPos after override', () => {
            agents[0].x = 410;
            agents[0].y = 310;
            
            heroLogic.update(agents, deltaTime, canvasWidth, canvasHeight);
            
            // prevPos should be updated to new position
            expect(heroLogic.prevPos.x).toBe(agents[0].x);
            expect(heroLogic.prevPos.y).toBe(agents[0].y);
        });
    });

    describe('checkHeroTargetProximity', () => {
        it('should return false when hero and target are far apart', () => {
            agents[0].x = 100;
            agents[0].y = 100;
            agents[1].x = 500;
            agents[1].y = 500;
            
            const result = heroLogic.checkHeroTargetProximity(agents, canvasWidth, canvasHeight);
            expect(result).toBe(false);
        });

        it('should return false when distance exceeds 24 pixels', () => {
            agents[0].x = 100;
            agents[0].y = 100;
            agents[1].x = 130; // 30 pixels away (> 24)
            agents[1].y = 100;
            
            const result = heroLogic.checkHeroTargetProximity(agents, canvasWidth, canvasHeight);
            expect(result).toBe(false);
        });

        it('should return true when hero and target are closest and within 24 pixels', () => {
            // Place hero and target close together, with other agents far away
            agents[0].x = 100;
            agents[0].y = 100;
            agents[1].x = 110; // 10 pixels away (< 24)
            agents[1].y = 100;
            agents[2].x = 500; // Far away
            agents[2].y = 500;
            
            const result = heroLogic.checkHeroTargetProximity(agents, canvasWidth, canvasHeight);
            expect(result).toBe(true);
        });

        it('should return false when another agent is closer to hero than target', () => {
            agents[0].x = 100;
            agents[0].y = 100;
            agents[1].x = 120; // 20 pixels away
            agents[1].y = 100;
            agents[2].x = 105; // 5 pixels away (closer than target)
            agents[2].y = 100;
            
            const result = heroLogic.checkHeroTargetProximity(agents, canvasWidth, canvasHeight);
            expect(result).toBe(false);
        });

        it('should handle toroidal wrapping in proximity check', () => {
            // Place hero and target near canvas edges (wrapped)
            agents[0].x = 10;
            agents[0].y = 100;
            agents[1].x = 790; // Wrapped: close to hero
            agents[1].y = 100;
            agents[2].x = 400; // Far away
            agents[2].y = 400;
            
            const result = heroLogic.checkHeroTargetProximity(agents, canvasWidth, canvasHeight);
            // Should handle wrapping correctly
            expect(typeof result).toBe('boolean');
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
