/**
 * GlowRenderer: Atmospheric God Ray Effect
 * 
 * Implements soft, diffused light rays radiating from a bright center,
 * creating an ethereal, atmospheric effect through a hazy medium.
 */

/**
 * Renders atmospheric god rays at the specified position
 * Creates soft, diffused rays emanating from a bright white center
 * @param {CanvasRenderingContext2D} ctx - 2D rendering context
 * @param {number} x - X coordinate of ray center
 * @param {number} y - Y coordinate of ray center
 * @param {number} rayCount - Number of rays to render (default: 16)
 * @param {number} maxRadius - Maximum radius of rays (default: 80)
 * @param {number} intensity - Overall intensity (0-1, default: 0.6)
 */
export function renderGodRayBurst(ctx, x, y, rayCount = 16, maxRadius = 80, intensity = 0.6) {
    ctx.save();
    
    // Use lighter blending for atmospheric glow
    ctx.globalCompositeOperation = 'lighter';
    
    // Core bright white center (focal point)
    const centerGradient = ctx.createRadialGradient(x, y, 0, x, y, maxRadius * 0.15);
    centerGradient.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.9})`);
    centerGradient.addColorStop(0.5, `rgba(255, 255, 255, ${intensity * 0.3})`);
    centerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = centerGradient;
    ctx.beginPath();
    ctx.arc(x, y, maxRadius * 0.15, 0, 2 * Math.PI);
    ctx.fill();
    
    // Render soft, diffused rays radiating outward
    const angleStep = (2 * Math.PI) / rayCount;
    
    for (let i = 0; i < rayCount; i++) {
        const angle = i * angleStep;
        
        // Vary ray width and length slightly for natural variation
        const rayWidth = maxRadius * (0.08 + Math.sin(i * 2.3) * 0.02);
        const rayLength = maxRadius * (0.7 + Math.sin(i * 1.7) * 0.2);
        
        // Create soft ray gradient (fades from bright to transparent)
        const rayGradient = ctx.createLinearGradient(
            x, y,
            x + Math.cos(angle) * rayLength,
            y + Math.sin(angle) * rayLength
        );
        
        // Soft fade: bright at start, transparent at end
        rayGradient.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.4})`);
        rayGradient.addColorStop(0.3, `rgba(255, 255, 255, ${intensity * 0.25})`);
        rayGradient.addColorStop(0.6, `rgba(220, 220, 220, ${intensity * 0.15})`);
        rayGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = rayGradient;
        
        // Draw soft ray as a tapered shape
        // Create a soft-edged ray using overlapping gradients or a polygon
        const rayHalfWidth = rayWidth / 2;
        const perpAngle = angle + Math.PI / 2;
        
        // Ray shape: narrow at center, wider as it extends
        ctx.beginPath();
        const startX1 = x + Math.cos(perpAngle) * rayHalfWidth * 0.3;
        const startY1 = y + Math.sin(perpAngle) * rayHalfWidth * 0.3;
        const startX2 = x - Math.cos(perpAngle) * rayHalfWidth * 0.3;
        const startY2 = y - Math.sin(perpAngle) * rayHalfWidth * 0.3;
        
        const endX1 = x + Math.cos(angle) * rayLength + Math.cos(perpAngle) * rayHalfWidth;
        const endY1 = y + Math.sin(angle) * rayLength + Math.sin(perpAngle) * rayHalfWidth;
        const endX2 = x + Math.cos(angle) * rayLength - Math.cos(perpAngle) * rayHalfWidth;
        const endY2 = y + Math.sin(angle) * rayLength - Math.sin(perpAngle) * rayHalfWidth;
        
        ctx.moveTo(startX1, startY1);
        ctx.lineTo(endX1, endY1);
        ctx.lineTo(endX2, endY2);
        ctx.lineTo(startX2, startY2);
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.restore();
}
