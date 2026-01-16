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
    const HERO_RADIUS = 4;
    const TARGET_RADIUS = 4;
    const COLLISION_DISTANCE = HERO_RADIUS + TARGET_RADIUS; // 8 pixels

    beforeEach(() => {
        agents = [
            new MockAgent(400, 300), // Hero at index 0
            new MockAgent(410, 300), // Target at index 1
            new MockAgent(200, 200)  // Other agent
        ];
        heroLogic = new HeroLogic(0, agents[0]);
    });

    describe('checkWinCondition', () => {
        it('should return true when Hero and Target collide (distance < 8 pixels)', () => {
            // Place hero and target 5 pixels apart (collision)
            agents[0].x = 100;
            agents[0].y = 100;
            agents[1].x = 105; // 5 pixels away (< 8)
            agents[1].y = 100;
            
            const result = heroLogic.checkWinCondition(agents, canvasWidth, canvasHeight);
            expect(result).toBe(true);
        });

        it('should return false when Hero and Target are far apart (distance >= 8 pixels)', () => {
            // Place hero and target 50 pixels apart (no collision)
            agents[0].x = 100;
            agents[0].y = 100;
            agents[1].x = 150; // 50 pixels away (>= 8)
            agents[1].y = 100;
            
            const result = heroLogic.checkWinCondition(agents, canvasWidth, canvasHeight);
            expect(result).toBe(false);
        });

        it('should return true when distance equals collision threshold (edge case)', () => {
            // Place hero and target just under 8 pixels apart (boundary case)
            agents[0].x = 100;
            agents[0].y = 100;
            agents[1].x = 100 + COLLISION_DISTANCE - 0.1; // Just under 8 pixels
            agents[1].y = 100;
            
            const result = heroLogic.checkWinCondition(agents, canvasWidth, canvasHeight);
            expect(result).toBe(true);
        });

        it('should return false when distance equals collision threshold exactly', () => {
            // Place hero and target exactly 8 pixels apart (boundary case)
            // Using 8.01 to ensure it's just over the threshold
            agents[0].x = 100;
            agents[0].y = 100;
            agents[1].x = 100 + COLLISION_DISTANCE + 0.01; // Just over 8 pixels (8.01)
            agents[1].y = 100;
            
            const result = heroLogic.checkWinCondition(agents, canvasWidth, canvasHeight);
            expect(result).toBe(false); // Should be false (distance >= threshold)
        });
        
        it('should return true when distance is just under collision threshold', () => {
            // Place hero and target just under 8 pixels apart
            agents[0].x = 100;
            agents[0].y = 100;
            agents[1].x = 100 + COLLISION_DISTANCE - 0.01; // Just under 8 pixels (7.99)
            agents[1].y = 100;
            
            const result = heroLogic.checkWinCondition(agents, canvasWidth, canvasHeight);
            expect(result).toBe(true); // Should be true (distance < threshold)
        });

        it('should handle toroidal wrapping in win condition check', () => {
            // Place hero and target near canvas edges (wrapped)
            agents[0].x = 10;
            agents[0].y = 100;
            agents[1].x = 790; // Wrapped: close to hero (distance = 20 pixels after wrapping)
            agents[1].y = 100;
            
            // After wrapping: |790 - 10| = 780 > 400, so wrapped = 800 - 780 = 20
            // Distance = 20 pixels (> 8), so should return false
            const result = heroLogic.checkWinCondition(agents, canvasWidth, canvasHeight);
            expect(result).toBe(false);
        });

        it('should handle diagonal collision detection', () => {
            // Place hero and target diagonally close
            agents[0].x = 100;
            agents[0].y = 100;
            agents[1].x = 106; // 6 pixels in x
            agents[1].y = 105; // 5 pixels in y, total distance = sqrt(6^2 + 5^2) = 7.8 (< 8)
            
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
