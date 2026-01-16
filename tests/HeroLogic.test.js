/**
 * Unit tests for HeroLogic module
 * Tests hero anchor mechanic (hold to stop)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HeroLogic } from '../HeroLogic.js';

// Mock Agent class for testing
class MockAgent {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
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

        it('should initialize with anchor inactive', () => {
            expect(heroLogic.isInputActive).toBe(false);
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

    describe('setInputActive', () => {
        it('should set input active state', () => {
            heroLogic.setInputActive(true);
            expect(heroLogic.isInputActive).toBe(true);
            
            heroLogic.setInputActive(false);
            expect(heroLogic.isInputActive).toBe(false);
        });
    });

    describe('update - anchor inactive', () => {
        it('should allow hero to move normally when anchor inactive', () => {
            // Physics moves hero to new position
            agents[0].x = 410;
            agents[0].y = 310;
            agents[0].vx = 10;
            agents[0].vy = 10;
            
            heroLogic.update(agents, deltaTime, canvasWidth, canvasHeight);
            
            // Position should remain as set by physics
            expect(agents[0].x).toBe(410);
            expect(agents[0].y).toBe(310);
            
            // prevPos should be updated to new position
            expect(heroLogic.prevPos.x).toBe(410);
            expect(heroLogic.prevPos.y).toBe(310);
        });
    });

    describe('update - anchor active', () => {
        beforeEach(() => {
            // Set anchor point
            heroLogic.setPrevPos(400, 300);
            heroLogic.setInputActive(true);
        });

        it('should lock hero position when anchor active', () => {
            // Physics tries to move hero
            agents[0].x = 410;
            agents[0].y = 310;
            agents[0].vx = 10;
            agents[0].vy = 10;
            
            heroLogic.update(agents, deltaTime, canvasWidth, canvasHeight);
            
            // Position should be locked to prevPos
            expect(agents[0].x).toBe(400);
            expect(agents[0].y).toBe(300);
        });

        it('should reset hero velocity to zero when anchor active', () => {
            agents[0].vx = 100;
            agents[0].vy = 50;
            
            heroLogic.update(agents, deltaTime, canvasWidth, canvasHeight);
            
            expect(agents[0].vx).toBe(0);
            expect(agents[0].vy).toBe(0);
        });
    });

    describe('setPrevPos', () => {
        it('should set previous position', () => {
            heroLogic.setPrevPos(100, 200);
            expect(heroLogic.prevPos.x).toBe(100);
            expect(heroLogic.prevPos.y).toBe(200);
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

        it('should return false when distance exceeds 12 pixels', () => {
            agents[0].x = 100;
            agents[0].y = 100;
            agents[1].x = 115; // 15 pixels away (> 12)
            agents[1].y = 100;
            
            const result = heroLogic.checkHeroTargetProximity(agents, canvasWidth, canvasHeight);
            expect(result).toBe(false);
        });

        it('should return true when hero and target are closest and within 12 pixels', () => {
            // Place hero and target close together, with other agents far away
            agents[0].x = 100;
            agents[0].y = 100;
            agents[1].x = 110; // 10 pixels away (< 12)
            agents[1].y = 100;
            agents[2].x = 500; // Far away
            agents[2].y = 500;
            
            const result = heroLogic.checkHeroTargetProximity(agents, canvasWidth, canvasHeight);
            expect(result).toBe(true);
        });
    });

    describe('checkWinCondition', () => {
        it('should return true when Hero and Target collide (distance < 8 pixels)', () => {
            agents[0].x = 100;
            agents[0].y = 100;
            agents[1].x = 105; // 5 pixels away (< 8)
            agents[1].y = 100;
            
            const result = heroLogic.checkWinCondition(agents, canvasWidth, canvasHeight);
            expect(result).toBe(true);
        });

        it('should return false when Hero and Target are far apart (distance >= 8 pixels)', () => {
            agents[0].x = 100;
            agents[0].y = 100;
            agents[1].x = 150; // 50 pixels away (>= 8)
            agents[1].y = 100;
            
            const result = heroLogic.checkWinCondition(agents, canvasWidth, canvasHeight);
            expect(result).toBe(false);
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
