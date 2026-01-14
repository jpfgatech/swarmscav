/**
 * AnalysisMode: Agent Selection & Proximity Pause (Game Mode)
 * 
 * This module handles:
 * - Mouse-based agent selection (up to 4 agents)
 * - Gabriel Graph condition monitoring for selected agent pairs
 * - Simulation pause when Gabriel condition is met
 * 
 * Gabriel Graph Condition:
 * Two agents i and j are Gabriel neighbors if no other agent k lies
 * in the circle with diameter |r_i - r_j| centered at the midpoint.
 * 
 * Condition: |r_k - mid(i,j)| < (1/2)|r_i - r_j| for any k ≠ i,j
 * If NO such k exists, then i and j are Gabriel neighbors → PAUSE
 */

export class AnalysisMode {
    constructor() {
        this.selectedAgents = new Set(); // Set of agent indices
        this.maxSelection = 4;
        this.isPaused = false;
    }
    
    /**
     * Handles mouse click to select/deselect agents
     * @param {number} mouseX - Mouse X coordinate in canvas space
     * @param {number} mouseY - Mouse Y coordinate in canvas space
     * @param {Array} agents - Array of Agent objects
     * @param {number} canvasWidth - Canvas width (for toroidal wrapping)
     * @param {number} canvasHeight - Canvas height (for toroidal wrapping)
     * @returns {number|null} - Index of selected/deselected agent, or null
     */
    handleMouseClick(mouseX, mouseY, agents, canvasWidth, canvasHeight) {
        if (this.isPaused) {
            return null; // Don't allow selection changes when paused
        }
        
        // Find nearest agent to mouse click
        let nearestIndex = null;
        let minDistance = Infinity;
        const selectionRadius = 20; // Maximum distance to select an agent
        
        for (let i = 0; i < agents.length; i++) {
            const agent = agents[i];
            
            // Calculate distance with toroidal wrapping
            let dx = agent.x - mouseX;
            let dy = agent.y - mouseY;
            
            // Handle toroidal wrapping
            if (Math.abs(dx) > canvasWidth / 2) {
                dx = dx > 0 ? dx - canvasWidth : dx + canvasWidth;
            }
            if (Math.abs(dy) > canvasHeight / 2) {
                dy = dy > 0 ? dy - canvasHeight : dy + canvasHeight;
            }
            
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < minDistance && distance < selectionRadius) {
                minDistance = distance;
                nearestIndex = i;
            }
        }
        
        if (nearestIndex === null) {
            return null;
        }
        
        // Toggle selection
        if (this.selectedAgents.has(nearestIndex)) {
            // Deselect
            this.selectedAgents.delete(nearestIndex);
        } else {
            // Select (if under limit)
            if (this.selectedAgents.size < this.maxSelection) {
                this.selectedAgents.add(nearestIndex);
            }
        }
        
        return nearestIndex;
    }
    
    /**
     * Checks if selected agent pairs satisfy the Gabriel Graph condition
     * @param {Array} agents - Array of Agent objects
     * @param {number} canvasWidth - Canvas width (for toroidal wrapping)
     * @param {number} canvasHeight - Canvas height (for toroidal wrapping)
     * @returns {boolean} - True if any selected pair satisfies Gabriel condition (should pause)
     */
    checkGabrielCondition(agents, canvasWidth, canvasHeight) {
        if (this.selectedAgents.size < 2) {
            return false; // Need at least 2 selected agents
        }
        
        const selectedArray = Array.from(this.selectedAgents);
        
        // Check all pairs of selected agents
        for (let i = 0; i < selectedArray.length; i++) {
            for (let j = i + 1; j < selectedArray.length; j++) {
                const idx1 = selectedArray[i];
                const idx2 = selectedArray[j];
                
                const agent1 = agents[idx1];
                const agent2 = agents[idx2];
                
                // Calculate distance vector with toroidal wrapping
                let dx = agent2.x - agent1.x;
                let dy = agent2.y - agent1.y;
                
                // Handle toroidal wrapping
                if (Math.abs(dx) > canvasWidth / 2) {
                    dx = dx > 0 ? dx - canvasWidth : dx + canvasWidth;
                }
                if (Math.abs(dy) > canvasHeight / 2) {
                    dy = dy > 0 ? dy - canvasHeight : dy + canvasHeight;
                }
                
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Condition: diameter must not exceed three times the agent's graphic circle diameter
                // Agent graphic circle has radius 4, so diameter = 8
                // Maximum allowed distance = 3 * 8 = 24
                const AGENT_GRAPHIC_DIAMETER = 8; // radius 4 * 2
                const MAX_DISTANCE = 3 * AGENT_GRAPHIC_DIAMETER; // 24
                
                if (distance > MAX_DISTANCE) {
                    continue; // Skip this pair - too far apart
                }
                
                const halfDistance = distance / 2;
                const midX = agent1.x + dx / 2;
                const midY = agent1.y + dy / 2;
                
                // Check if any other agent lies in the circle
                // Circle: center = midpoint, radius = halfDistance
                let foundIntruder = false;
                
                for (let k = 0; k < agents.length; k++) {
                    // Skip the two agents in the pair
                    if (k === idx1 || k === idx2) {
                        continue;
                    }
                    
                    const agentK = agents[k];
                    
                    // Calculate distance from agentK to midpoint with toroidal wrapping
                    let dxK = agentK.x - midX;
                    let dyK = agentK.y - midY;
                    
                    // Handle toroidal wrapping
                    if (Math.abs(dxK) > canvasWidth / 2) {
                        dxK = dxK > 0 ? dxK - canvasWidth : dxK + canvasWidth;
                    }
                    if (Math.abs(dyK) > canvasHeight / 2) {
                        dyK = dyK > 0 ? dyK - canvasHeight : dyK + canvasHeight;
                    }
                    
                    const distToMid = Math.sqrt(dxK * dxK + dyK * dyK);
                    
                    // If agentK is inside the circle, it violates Gabriel condition
                    if (distToMid < halfDistance) {
                        foundIntruder = true;
                        break;
                    }
                }
                
                // If no intruder found, Gabriel condition is satisfied → PAUSE
                if (!foundIntruder) {
                    return true;
                }
            }
        }
        
        return false; // No pair satisfies Gabriel condition
    }
    
    /**
     * Renders selected agents with special styling
     * @param {CanvasRenderingContext2D} ctx - 2D rendering context
     * @param {Array} agents - Array of Agent objects
     */
    renderSelectedAgents(ctx, agents) {
        for (const index of this.selectedAgents) {
            if (index >= 0 && index < agents.length) {
                const agent = agents[index];
                
                // Draw pale/desaturated version of agent color
                // Parse HSL from agent color and adjust lightness to 70%, saturation to 30%
                const hue = (agent.theta / (2 * Math.PI)) * 360;
                const paleColor = `hsl(${hue}, 30%, 70%)`;
                
                // Draw agent body
                ctx.fillStyle = paleColor;
                ctx.beginPath();
                ctx.arc(agent.x, agent.y, 4, 0, 2 * Math.PI);
                ctx.fill();
                
                // Draw white border
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    }
    
    /**
     * Clears all selections
     */
    clearSelection() {
        this.selectedAgents.clear();
    }
    
    /**
     * Resets pause state
     */
    reset() {
        this.isPaused = false;
    }
    
    /**
     * Gets the number of selected agents
     */
    getSelectionCount() {
        return this.selectedAgents.size;
    }
}
