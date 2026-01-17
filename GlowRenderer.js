/**
 * GlowRenderer: Atmospheric God Ray Effect with Flowing Interference
 * 
 * Implements soft, flowing light rays with rotating star interference,
 * creating an ethereal, atmospheric effect through a hazy medium.
 */

/**
 * Draws a star shape
 * @param {CanvasRenderingContext2D} ctx - 2D rendering context
 * @param {number} cx - Center X coordinate
 * @param {number} cy - Center Y coordinate
 * @param {number} spikes - Number of spikes/points
 * @param {number} outerRadius - Outer radius of the star
 * @param {number} innerRadius - Inner radius of the star
 * @param {number} rotation - Rotation angle in radians
 */
function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, rotation) {
    let rot = Math.PI / 2 * 3 + rotation;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
}

/**
 * Renders atmospheric god rays with flowing interference at the specified position
 * Creates soft, rotating star interference pattern emanating from a bright white center
 * @param {CanvasRenderingContext2D} ctx - 2D rendering context
 * @param {number} x - X coordinate of ray center
 * @param {number} y - Y coordinate of ray center
 * @param {string} heroColor - Base hero color for Layer 2
 * @param {number} time - Current time in seconds (for rotation animation)
 */
export function renderGodRayBurst(ctx, x, y, heroColor, time) {
    // Agent radius is 4px, so 3x = 12px max radius
    const AGENT_RADIUS = 4;
    const maxRadius = AGENT_RADIUS * 3; // 12px
    
    ctx.save();
    
    // Use lighter blending for atmospheric glow (but keep transparency/shady)
    ctx.globalCompositeOperation = 'lighter';
    
    // Layer 1 (Core): Soft radial gradient - very subtle (shady, don't cover background)
    ctx.globalAlpha = 0.15; // Very transparent to keep dark background visible
    const centerGradient = ctx.createRadialGradient(x, y, 0, x, y, maxRadius * 0.4);
    centerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    centerGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
    centerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = centerGradient;
    ctx.beginPath();
    ctx.arc(x, y, maxRadius * 0.4, 0, 2 * Math.PI);
    ctx.fill();
    
    // Layer 2 (Slow Flow): 12-point irregular star - hero color, slow CW rotation
    ctx.globalAlpha = 0.2; // Shady/transparent
    ctx.fillStyle = heroColor;
    ctx.translate(x, y);
    const layer2Rotation = time * 0.2; // Slow clockwise rotation
    const layer2Scale = 1.0 + Math.sin(time) * 0.1; // Slight pulse
    ctx.scale(layer2Scale, layer2Scale);
    ctx.rotate(layer2Rotation);
    const layer2OuterRadius = maxRadius * 0.9;
    const layer2InnerRadius = maxRadius * 0.4; // Irregular/narrow points
    drawStar(ctx, 0, 0, 12, layer2OuterRadius, layer2InnerRadius, 0);
    ctx.resetTransform();
    
    // Layer 3 (Fast Jitter): 8-point sharp star - white, fast CCW rotation
    // Creates interference pattern with Layer 2
    ctx.globalAlpha = 0.25; // Slightly more visible for interference
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.translate(x, y);
    const layer3Rotation = time * -0.5; // Fast counter-clockwise rotation
    const layer3Scale = 0.7;
    ctx.scale(layer3Scale, layer3Scale);
    ctx.rotate(layer3Rotation);
    const layer3OuterRadius = maxRadius * 0.8;
    const layer3InnerRadius = maxRadius * 0.3; // Sharp points
    drawStar(ctx, 0, 0, 8, layer3OuterRadius, layer3InnerRadius, 0);
    ctx.resetTransform();
    
    ctx.restore();
}
