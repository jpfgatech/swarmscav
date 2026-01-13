/**
 * Energy Monitor - Tracks system kinetic energy for convergence detection
 * Displays EKG-style visualization in dev mode
 */

export class EnergyMonitor {
    constructor(bufferSize = 600, thresholdPerAgent = 0.001, killFrames = 30) {
        this.bufferSize = bufferSize;
        this.energyHistory = new Array(bufferSize).fill(0);
        this.currentIndex = 0;
        this.maxEnergy = 0.001; // Initial max for scaling
        this.consecutiveIdleFrames = 0;
        
        // Auto-kill constants (configurable)
        this.KILL_THRESHOLD_PER_AGENT = thresholdPerAgent; // Average energy threshold per agent
        this.KILL_FRAMES = killFrames; // Consecutive frames below threshold to trigger kill
    }
    
    /**
     * Measure total kinetic energy from agents
     * E_k = sum(vx^2 + vy^2) for all agents
     * Returns average energy per agent for threshold comparison
     * @param {Array<Agent>} agents - Array of agents
     * @returns {number} Average kinetic energy per agent
     */
    measure(agents) {
        let totalEnergy = 0;
        const agentCount = agents.length;
        
        for (const agent of agents) {
            const vx2 = agent.vx * agent.vx;
            const vy2 = agent.vy * agent.vy;
            totalEnergy += vx2 + vy2;
        }
        
        // Calculate average energy per agent
        const avgEnergy = agentCount > 0 ? totalEnergy / agentCount : 0;
        
        // Store average energy in circular buffer (for visualization)
        this.energyHistory[this.currentIndex] = avgEnergy;
        this.currentIndex = (this.currentIndex + 1) % this.bufferSize;
        
        // Update max for auto-scaling (but ignore initial high energy spikes)
        // Only update max if it's significantly higher, or decay slowly
        if (avgEnergy > this.maxEnergy * 1.1) {
            this.maxEnergy = avgEnergy;
        } else {
            // Decay max to allow rescaling when energy drops
            this.maxEnergy *= 0.9995;
        }
        
        // Check for auto-kill condition (using average energy per agent)
        if (avgEnergy < this.KILL_THRESHOLD_PER_AGENT) {
            this.consecutiveIdleFrames++;
        } else {
            this.consecutiveIdleFrames = 0;
        }
        
        return avgEnergy;
    }
    
    /**
     * Check if simulation should be killed (reached equilibrium)
     * Uses average energy per agent, so threshold is independent of N
     * @returns {boolean} True if simulation is dead
     */
    isDead() {
        return this.consecutiveIdleFrames >= this.KILL_FRAMES;
    }
    
    /**
     * Get current kinetic energy
     * @returns {number} Most recent energy measurement
     */
    getCurrentEnergy() {
        const prevIndex = (this.currentIndex - 1 + this.bufferSize) % this.bufferSize;
        return this.energyHistory[prevIndex];
    }
    
    /**
     * Render EKG-style energy graph at bottom of canvas
     * @param {CanvasRenderingContext2D} ctx - 2D rendering context
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     */
    render(ctx, canvasWidth, canvasHeight) {
        const graphHeight = 80;
        const graphY = canvasHeight - graphHeight - 10;
        const graphWidth = canvasWidth - 20;
        const graphX = 10;
        
        // Background
        ctx.fillStyle = 'rgba(20, 20, 20, 0.8)';
        ctx.fillRect(graphX, graphY, graphWidth, graphHeight);
        
        // Border
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.strokeRect(graphX, graphY, graphWidth, graphHeight);
        
        // Draw grid lines
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 4; i++) {
            const y = graphY + (graphHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(graphX, y);
            ctx.lineTo(graphX + graphWidth, y);
            ctx.stroke();
        }
        
        // Calculate display scaling to better show threshold (ignore initial high energy)
        const threshold = this.KILL_THRESHOLD_PER_AGENT;
        // Use max of current max or 5x threshold for better visualization
        const displayMax = Math.max(this.maxEnergy, threshold * 5);
        
        // Draw threshold line first (so it's behind the curve)
        if (threshold < displayMax && threshold > 0) {
            const thresholdY = graphY + graphHeight - (threshold / displayMax) * graphHeight;
            ctx.strokeStyle = '#f00';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(graphX, thresholdY);
            ctx.lineTo(graphX + graphWidth, thresholdY);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // Draw energy curve with adjusted scaling
        if (displayMax > 0.0001) {
            ctx.strokeStyle = '#0f0';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            for (let i = 0; i < this.bufferSize; i++) {
                const bufferIndex = (this.currentIndex - this.bufferSize + i + this.bufferSize) % this.bufferSize;
                const energy = this.energyHistory[bufferIndex];
                const x = graphX + (graphWidth / this.bufferSize) * i;
                const normalizedEnergy = Math.min(energy / displayMax, 1.0);
                const y = graphY + graphHeight - (normalizedEnergy * graphHeight);
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            ctx.stroke();
        }
        
        // Label
        ctx.fillStyle = '#0f0';
        ctx.font = '12px monospace';
        ctx.fillText(`Avg Energy: ${this.getCurrentEnergy().toFixed(6)}`, graphX + 5, graphY + 15);
        ctx.fillText(`Threshold: ${threshold.toFixed(6)}`, graphX + 5, graphY + 30);
    }
}
