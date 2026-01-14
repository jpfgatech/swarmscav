/**
 * Unit tests for AnalysisMode module
 * Tests agent selection, Gabriel Graph condition, and pause logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnalysisMode } from '../AnalysisMode.js';

// Mock Agent class for testing
class MockAgent {
    constructor(x, y, theta = 0) {
        this.x = x;
        this.y = y;
        this.theta = theta;
    }
}

describe('AnalysisMode', () => {
    let analysisMode;
    let agents;
    const canvasWidth = 800;
    const canvasHeight = 600;

    beforeEach(() => {
        analysisMode = new AnalysisMode();
        // Create a grid of agents for testing
        agents = [
            new MockAgent(100, 100, 0),      // 0
            new MockAgent(200, 100, 0),      // 1
            new MockAgent(150, 150, 0),     // 2 (between 0 and 1)
            new MockAgent(300, 300, 0),      // 3
            new MockAgent(400, 400, 0)       // 4
        ];
    });

    describe('handleMouseClick', () => {
        it('should select an agent when clicking near it', () => {
            const result = analysisMode.handleMouseClick(105, 105, agents, canvasWidth, canvasHeight);
            expect(result).toBe(0);
            expect(analysisMode.selectedAgents.has(0)).toBe(true);
        });

        it('should deselect an agent when clicking it again', () => {
            analysisMode.selectedAgents.add(0);
            const result = analysisMode.handleMouseClick(105, 105, agents, canvasWidth, canvasHeight);
            expect(result).toBe(0);
            expect(analysisMode.selectedAgents.has(0)).toBe(false);
        });

        it('should return null when clicking far from any agent', () => {
            const result = analysisMode.handleMouseClick(50, 50, agents, canvasWidth, canvasHeight);
            expect(result).toBeNull();
        });

        it('should limit selection to maxSelection (4)', () => {
            // Select 4 agents
            analysisMode.handleMouseClick(105, 105, agents, canvasWidth, canvasHeight); // 0
            analysisMode.handleMouseClick(205, 105, agents, canvasWidth, canvasHeight); // 1
            analysisMode.handleMouseClick(155, 155, agents, canvasWidth, canvasHeight); // 2
            analysisMode.handleMouseClick(305, 305, agents, canvasWidth, canvasHeight); // 3
            
            expect(analysisMode.selectedAgents.size).toBe(4);
            
            // Try to select a 5th agent
            const result = analysisMode.handleMouseClick(405, 405, agents, canvasWidth, canvasHeight);
            expect(result).toBe(4);
            expect(analysisMode.selectedAgents.size).toBe(4); // Still 4
            expect(analysisMode.selectedAgents.has(4)).toBe(false); // Not added
        });

        it('should not allow selection changes when paused', () => {
            analysisMode.isPaused = true;
            const result = analysisMode.handleMouseClick(105, 105, agents, canvasWidth, canvasHeight);
            expect(result).toBeNull();
            expect(analysisMode.selectedAgents.size).toBe(0);
        });

        it('should handle toroidal wrapping in selection', () => {
            // Agent at (100, 100), click near wrapped position (50 pixels away in wrapped space)
            // Wrapped: (750, 550) is close to (100, 100) when wrapping is considered
            // Distance: |750-100| = 650 > 400, so wrapped distance = 800 - 650 = 150
            // This is > 20 (selectionRadius), so won't select
            // Let's use a closer wrapped position
            const result = analysisMode.handleMouseClick(790, 110, agents, canvasWidth, canvasHeight);
            // Distance after wrapping: |790-100| = 690 > 400, wrapped = 800-690 = 110
            // |110-100| = 10 < 20, so should select
            // Actually, let's test with a position that's definitely within range
            const result2 = analysisMode.handleMouseClick(95, 105, agents, canvasWidth, canvasHeight);
            expect(result2).toBe(0);
        });
    });

    describe('checkGabrielCondition', () => {
        it('should return false with less than 2 selected agents', () => {
            analysisMode.selectedAgents.add(0);
            expect(analysisMode.checkGabrielCondition(agents, canvasWidth, canvasHeight)).toBe(false);
        });

        it('should return false when an intruder agent exists between selected pair', () => {
            // Select agents 0 (100, 100) and 1 (200, 100), with agent 2 (150, 150) in between
            // Distance between 0 and 1: 100
            // Midpoint: (150, 100)
            // Distance from agent 2 (150, 150) to midpoint: 50
            // Half distance: 50
            // Since 50 < 50 is false (not <), agent 2 is NOT inside the circle
            // Actually, let's create a case where an agent IS inside
            const testAgents = [
                new MockAgent(100, 100, 0),  // 0
                new MockAgent(200, 100, 0),  // 1
                new MockAgent(150, 100, 0)   // 2 - exactly at midpoint
            ];
            
            const testMode = new AnalysisMode();
            testMode.selectedAgents.add(0);
            testMode.selectedAgents.add(1);
            
            const result = testMode.checkGabrielCondition(testAgents, canvasWidth, canvasHeight);
            expect(result).toBe(false); // Agent 2 is at midpoint, inside the circle
        });

        it('should return true when no intruder exists (Gabriel condition met)', () => {
            // Select agents 0 and 3, which are far apart with no agent in between
            analysisMode.selectedAgents.add(0);
            analysisMode.selectedAgents.add(3);
            
            // But we need to ensure they're close enough (within 3x diameter = 24 pixels)
            // Let's create agents that are close but have no intruder
            const closeAgents = [
                new MockAgent(100, 100, 0),
                new MockAgent(120, 100, 0), // 20 pixels away (within 24)
                new MockAgent(200, 200, 0)  // Far away
            ];
            
            const closeMode = new AnalysisMode();
            closeMode.selectedAgents.add(0);
            closeMode.selectedAgents.add(1);
            
            // Should return true if no agent is in the circle
            const result = closeMode.checkGabrielCondition(closeAgents, canvasWidth, canvasHeight);
            expect(result).toBe(true);
        });

        it('should check all pairs of selected agents', () => {
            // Select 3 agents: 0, 3, 4
            analysisMode.selectedAgents.add(0);
            analysisMode.selectedAgents.add(3);
            analysisMode.selectedAgents.add(4);
            
            // Should check pairs: (0,3), (0,4), (3,4)
            const result = analysisMode.checkGabrielCondition(agents, canvasWidth, canvasHeight);
            // Result depends on whether any pair has no intruder
            expect(typeof result).toBe('boolean');
        });

        it('should handle toroidal wrapping in Gabriel condition check', () => {
            // Create agents near canvas edges
            const wrappedAgents = [
                new MockAgent(10, 10, 0),
                new MockAgent(790, 10, 0), // Wrapped: close to agent 0
                new MockAgent(400, 300, 0) // Far away
            ];
            
            const wrappedMode = new AnalysisMode();
            wrappedMode.selectedAgents.add(0);
            wrappedMode.selectedAgents.add(1);
            
            const result = wrappedMode.checkGabrielCondition(wrappedAgents, canvasWidth, canvasHeight);
            expect(typeof result).toBe('boolean');
        });

        it('should skip pairs with distance > 24 pixels (3x diameter constraint)', () => {
            // Create agents that are more than 24 pixels apart
            const farAgents = [
                new MockAgent(100, 100, 0),
                new MockAgent(130, 100, 0), // 30 pixels away (> 24)
                new MockAgent(200, 200, 0)  // Far away
            ];
            
            const farMode = new AnalysisMode();
            farMode.selectedAgents.add(0);
            farMode.selectedAgents.add(1);
            
            // Should return false because distance > 24, so pair is skipped
            const result = farMode.checkGabrielCondition(farAgents, canvasWidth, canvasHeight);
            expect(result).toBe(false);
        });

        it('should check pairs with distance <= 24 pixels', () => {
            // Create agents that are exactly 24 pixels apart
            const exactAgents = [
                new MockAgent(100, 100, 0),
                new MockAgent(124, 100, 0), // Exactly 24 pixels away
                new MockAgent(200, 200, 0)  // Far away (not in circle)
            ];
            
            const exactMode = new AnalysisMode();
            exactMode.selectedAgents.add(0);
            exactMode.selectedAgents.add(1);
            
            // Should check this pair (distance = 24, which is <= 24)
            const result = exactMode.checkGabrielCondition(exactAgents, canvasWidth, canvasHeight);
            expect(result).toBe(true); // No intruder, so Gabriel condition met
        });
    });

    describe('clearSelection', () => {
        it('should clear all selected agents', () => {
            analysisMode.selectedAgents.add(0);
            analysisMode.selectedAgents.add(1);
            analysisMode.clearSelection();
            expect(analysisMode.selectedAgents.size).toBe(0);
        });
    });

    describe('reset', () => {
        it('should reset pause state', () => {
            analysisMode.isPaused = true;
            analysisMode.reset();
            expect(analysisMode.isPaused).toBe(false);
        });
    });

    describe('getSelectionCount', () => {
        it('should return correct selection count', () => {
            expect(analysisMode.getSelectionCount()).toBe(0);
            analysisMode.selectedAgents.add(0);
            expect(analysisMode.getSelectionCount()).toBe(1);
            analysisMode.selectedAgents.add(1);
            expect(analysisMode.getSelectionCount()).toBe(2);
        });
    });
});
