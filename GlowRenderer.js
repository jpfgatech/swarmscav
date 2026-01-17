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
 * Draws a star shape with uneven arms and radial transparency fade
 * @param {CanvasRenderingContext2D} ctx - 2D rendering context
 * @param {number} cx - Center X coordinate
 * @param {number} cy - Center Y coordinate
 * @param {number} spikes - Number of spikes/points
 * @param {number} outerRadius - Base outer radius of the star
 * @param {number} innerRadius - Inner radius of the star
 * @param {number} rotation - Rotation angle in radians
 * @param {number} noiseAmount - Amount of variation for uneven arms (0-1)
 * @param {number} baseAlpha - Base alpha value for the gradient (0-1)
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

    // Create radial gradient for transparency fade from center to edge
    // Each arm gets increasingly transparent with radius
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${baseAlpha})`); // Full alpha at center
    gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${baseAlpha * 0.8})`); // Slight fade
    gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${baseAlpha * 0.4})`); // Medium fade
    gradient.addColorStop(0.85, `rgba(${r}, ${g}, ${b}, ${baseAlpha * 0.15})`); // Heavy fade
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`); // Fully transparent at edge

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
    
    // Fill with radial gradient for transparency fade
    ctx.fillStyle = gradient;
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
    // Arms are uneven (noise variation) and fade with radius (increasingly transparent from center to edge)
    ctx.globalAlpha = 1.0; // Gradient will handle alpha fade
    ctx.translate(x, y);
    const layer2Rotation = time * 0.2; // Slow clockwise rotation
    const layer2Scale = 1.0 + Math.sin(time) * 0.1; // Slight pulse
    ctx.scale(layer2Scale, layer2Scale);
    ctx.rotate(layer2Rotation);
    const layer2OuterRadius = maxRadius * 0.9;
    const layer2InnerRadius = maxRadius * 0.4; // Irregular/narrow points
    drawStar(ctx, 0, 0, 12, layer2OuterRadius, layer2InnerRadius, layer2Rotation, 0.25, 0.4, heroColor);
    ctx.resetTransform();
    
    // Layer 3 (Fast Jitter): 8-point sharp star - white, fast CCW rotation
    // Creates interference pattern with Layer 2, arms are uneven and fade with radius
    ctx.globalAlpha = 1.0; // Gradient will handle alpha fade
    ctx.translate(x, y);
    const layer3Rotation = time * -0.5; // Fast counter-clockwise rotation
    const layer3Scale = 0.7;
    ctx.scale(layer3Scale, layer3Scale);
    ctx.rotate(layer3Rotation);
    const layer3OuterRadius = maxRadius * 0.8;
    const layer3InnerRadius = maxRadius * 0.3; // Sharp points
    drawStar(ctx, 0, 0, 8, layer3OuterRadius, layer3InnerRadius, layer3Rotation, 0.2, 0.3, 'white');
    ctx.resetTransform();
    
    ctx.restore();
}
