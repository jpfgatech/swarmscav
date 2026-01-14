/**
 * Unit tests for Game Rules (Win Condition)
 * Tests win condition detection when Hero reaches Target
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

describe('GameRules - Win Condition', () => {
    let heroLogic;
    let agents;
    const canvasWidth = 800;
    const canvasHeight = 600;
    const HERO_RADIUS = 6;
    const TARGET_RADIUS = 6;
    const COLLISION_DISTANCE = HERO_RADIUS + TARGET_RADIUS; // 12 pixels

    beforeEach(() => {
        agents = [
            new MockAgent(400, 300), // Hero at index 0
            new MockAgent(410, 300), // Target at index 1
            new MockAgent(200, 200)  // Other agent
        ];
        heroLogic = new HeroLogic(0, agents[0]);
    });

    describe('checkWinCondition', () => {
        it('should return true when Hero and Target collide (distance < 12 pixels)', () => {
            // Place hero and target 5 pixels apart (collision)
            agents[0].x = 100;
            agents[0].y = 100;
            agents[1].x = 105; // 5 pixels away (< 12)
            agents[1].y = 100;
            
            const result = heroLogic.checkWinCondition(agents, canvasWidth, canvasHeight);
            expect(result).toBe(true);
        });

        it('should return false when Hero and Target are far apart (distance >= 12 pixels)', () => {
            // Place hero and target 50 pixels apart (no collision)
            agents[0].x = 100;
            agents[0].y = 100;
            agents[1].x = 150; // 50 pixels away (>= 12)
            agents[1].y = 100;
            
            const result = heroLogic.checkWinCondition(agents, canvasWidth, canvasHeight);
            expect(result).toBe(false);
        });

        it('should return true when distance equals collision threshold (edge case)', () => {
            // Place hero and target exactly 12 pixels apart (boundary case)
            agents[0].x = 100;
            agents[0].y = 100;
            agents[1].x = 100 + COLLISION_DISTANCE - 0.1; // Just under 12 pixels
            agents[1].y = 100;
            
            const result = heroLogic.checkWinCondition(agents, canvasWidth, canvasHeight);
            expect(result).toBe(true);
        });

        it('should return false when distance equals collision threshold exactly', () => {
            // Place hero and target exactly 12 pixels apart (boundary case)
            agents[0].x = 100;
            agents[0].y = 100;
            agents[1].x = 100 + COLLISION_DISTANCE; // Exactly 12 pixels
            agents[1].y = 100;
            
            const result = heroLogic.checkWinCondition(agents, canvasWidth, canvasHeight);
            expect(result).toBe(false); // Should be false (distance >= threshold)
        });

        it('should handle toroidal wrapping in win condition check', () => {
            // Place hero and target near canvas edges (wrapped)
            agents[0].x = 10;
            agents[0].y = 100;
            agents[1].x = 790; // Wrapped: close to hero (distance = 20 pixels after wrapping)
            agents[1].y = 100;
            
            // After wrapping: |790 - 10| = 780 > 400, so wrapped = 800 - 780 = 20
            // Distance = 20 pixels (> 12), so should return false
            const result = heroLogic.checkWinCondition(agents, canvasWidth, canvasHeight);
            expect(result).toBe(false);
        });

        it('should handle diagonal collision detection', () => {
            // Place hero and target diagonally close
            agents[0].x = 100;
            agents[0].y = 100;
            agents[1].x = 108; // 8 pixels in x
            agents[1].y = 106; // 6 pixels in y, total distance = sqrt(8^2 + 6^2) = 10 (< 12)
            
            const result = heroLogic.checkWinCondition(agents, canvasWidth, canvasHeight);
            expect(result).toBe(true);
        });

        it('should return false when hero or target index is out of bounds', () => {
            const logic = new HeroLogic(100, null); // Hero index beyond array
            const result = logic.checkWinCondition(agents, canvasWidth, canvasHeight);
            expect(result).toBe(false);
        });
    });
});
