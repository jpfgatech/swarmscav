/**
 * GlowRenderer: Atmospheric God Ray Effect with Flowing Interference
 * 
 * Implements soft, flowing light rays with rotating star interference,
 * creating an ethereal, atmospheric effect through a hazy medium.
 */

/**
 * Converts HSL color string to RGB values
 * @param {string} hslStr - HSL color string like "hsl(240, 30%, 60%)"
 * @returns {Object} Object with r, g, b values (0-255)
 */
function hslToRgb(hslStr) {
    // Parse HSL string: "hsl(240, 30%, 60%)"
    const match = hslStr.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!match) {
        return { r: 255, g: 255, b: 255 }; // Default to white
    }
    
    const h = parseFloat(match[1]) / 360; // Hue [0, 1]
    const s = parseFloat(match[2]) / 100; // Saturation [0, 1]
    const l = parseFloat(match[3]) / 100; // Lightness [0, 1]
    
    let r, g, b;
    
    if (s === 0) {
        r = g = b = l; // Achromatic (grey)
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

/**
 * Draws a star shape with uneven arms and flat transparency (no radial gradient fade)
 * @param {CanvasRenderingContext2D} ctx - 2D rendering context
 * @param {number} cx - Center X coordinate
 * @param {number} cy - Center Y coordinate
 * @param {number} spikes - Number of spikes/points
 * @param {number} outerRadius - Base outer radius of the star
 * @param {number} innerRadius - Inner radius of the star
 * @param {number} rotation - Rotation angle in radians
 * @param {number} noiseAmount - Amount of variation for uneven arms (0-1)
 * @param {number} baseAlpha - Base alpha value (flat transparency, no gradient fade)
 * @param {string} colorStr - Color string (HSL or RGB) for the star
 */
function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, rotation, noiseAmount = 0.3, baseAlpha = 1.0, colorStr = 'white') {
    let rot = Math.PI / 2 * 3 + rotation;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    // Calculate max radius with variations for gradient
    let maxRadius = 0;
    const armRadii = [];
    for (let i = 0; i < spikes; i++) {
        // Vary outer radius for each arm (makes arms uneven)
        const outerVariation = 1 + (Math.sin(i * 1.7 + rotation) * noiseAmount);
        const currentOuterRadius = outerRadius * outerVariation;
        armRadii.push(currentOuterRadius);
        if (currentOuterRadius > maxRadius) {
            maxRadius = currentOuterRadius;
        }
    }

    // Extract RGB from color string (HSL or RGB)
    let r = 255, g = 255, b = 255;
    if (colorStr.startsWith('hsl')) {
        const rgb = hslToRgb(colorStr);
        r = rgb.r;
        g = rgb.g;
        b = rgb.b;
    } else if (colorStr.startsWith('rgb')) {
        const match = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
            r = parseInt(match[1]);
            g = parseInt(match[2]);
            b = parseInt(match[3]);
        }
    }

    // Flat transparency - no radial gradient fade
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${baseAlpha})`;

    ctx.beginPath();
    
    // Start from first outer point with noise variation
    ctx.moveTo(cx + Math.cos(rot) * armRadii[0], cy + Math.sin(rot) * armRadii[0]);
    
    for (let i = 0; i < spikes; i++) {
        const currentOuterRadius = armRadii[i];
        
        x = cx + Math.cos(rot) * currentOuterRadius;
        y = cy + Math.sin(rot) * currentOuterRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.closePath();
    
    // Fill with flat transparency (no gradient fade)
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
    
    // Multiple stars for interference - all with thin/needle-like arms to avoid white circle
    
    // Star 1: Hero color, 6-point, thin arms (not needle-like, but thinner)
    ctx.globalAlpha = 1.0; // Will use flat alpha in fillStyle
    ctx.translate(x, y);
    const rot1 = time * 0.2; // Slow clockwise rotation
    ctx.scale(1.0 + Math.sin(time) * 0.1, 1.0 + Math.sin(time) * 0.1);
    ctx.rotate(rot1);
    drawStar(ctx, 0, 0, 6, maxRadius * 0.9, maxRadius * 0.15, rot1, 0.25, 0.18, heroColor); // Thin arms, less transparent (alpha 0.18)
    ctx.resetTransform();
    
    // Star 2: White, 8-point, needle-like (very small inner radius)
    ctx.globalAlpha = 1.0;
    ctx.translate(x, y);
    const rot2 = time * -0.5; // Fast counter-clockwise rotation
    ctx.scale(0.8, 0.8);
    ctx.rotate(rot2);
    drawStar(ctx, 0, 0, 8, maxRadius * 0.85, maxRadius * 0.05, rot2, 0.2, 0.15, 'white'); // Needle-like, less transparent (alpha 0.15)
    ctx.resetTransform();
    
    // Star 3: Hero color, 5-point, thin arms
    ctx.globalAlpha = 1.0;
    ctx.translate(x, y);
    const rot3 = time * 0.35; // Medium rotation
    ctx.scale(0.75, 0.75);
    ctx.rotate(rot3);
    drawStar(ctx, 0, 0, 5, maxRadius * 0.8, maxRadius * 0.12, rot3, 0.3, 0.12, heroColor); // Thin arms, less transparent (alpha 0.12)
    ctx.resetTransform();
    
    // Star 4: White, 7-point, needle-like
    ctx.globalAlpha = 1.0;
    ctx.translate(x, y);
    const rot4 = time * -0.3; // Slow counter-clockwise
    ctx.scale(0.65, 0.65);
    ctx.rotate(rot4);
    drawStar(ctx, 0, 0, 7, maxRadius * 0.75, maxRadius * 0.04, rot4, 0.15, 0.10, 'white'); // Needle-like, less transparent (alpha 0.10)
    ctx.resetTransform();
    
    ctx.restore();
}
