/**
 * GlowRenderer: Volumetric God Ray Effect
 * 
 * Implements volumetric god rays using overlapping ray "leaves" that create
 * a dense core through overlap, with pulsing alpha and rotation.
 */

/**
 * Converts color string (HSL or RGB) to RGB values
 * @param {string} colorStr - Color string like "hsl(240, 30%, 60%)" or "rgb(255, 0, 0)"
 * @returns {Object} Object with r, g, b values (0-255)
 */
function colorToRgb(colorStr) {
    if (colorStr.startsWith('hsl')) {
        // Parse HSL string: "hsl(240, 30%, 60%)"
        const match = colorStr.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        if (!match) {
            return { r: 200, g: 230, b: 255 }; // Default light blue
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
    } else if (colorStr.startsWith('rgb')) {
        const match = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
            return {
                r: parseInt(match[1]),
                g: parseInt(match[2]),
                b: parseInt(match[3])
            };
        }
    }
    
    // Default light blue
    return { r: 200, g: 230, b: 255 };
}

/**
 * Creates an array of ray objects for the god ray effect
 * @param {number} count - Number of rays to create
 * @returns {Array} Array of ray objects
 */
function createRays(count) {
    const rays = [];
    for (let i = 0; i < count; i++) {
        rays.push({
            angle: Math.random() * Math.PI * 2,
            // Width factor: Determines how "fat" the leaf is
            width: Math.random() * 0.5 + 0.2,
            length: Math.random() * 0.5 + 0.2,
            alphaPhase: Math.random() * Math.PI * 2,
            alphaSpeed: Math.random() * 0.02 + 0.005,
            maxAlpha: Math.random() * 0.3 + 0.1,
            driftSpeed: (Math.random() - 0.5) * 0.002
        });
    }
    return rays;
}

// Cache for rays per entity (keyed by entity type and index)
const rayCache = new Map();

/**
 * Gets or creates rays for an entity
 * @param {string} key - Unique key for this entity (e.g., "hero-0", "target-1")
 * @param {number} rayCount - Number of rays to create
 * @returns {Array} Array of ray objects
 */
function getRays(key, rayCount) {
    if (!rayCache.has(key)) {
        rayCache.set(key, createRays(rayCount));
    }
    return rayCache.get(key);
}

/**
 * Renders volumetric god rays at the specified position
 * @param {CanvasRenderingContext2D} ctx - 2D rendering context
 * @param {number} x - X coordinate of ray center
 * @param {number} y - Y coordinate of ray center
 * @param {string} baseColor - Base color for the rays (HSL or RGB)
 * @param {number} rayCount - Number of rays to render
 * @param {number} rotationSpeed - Base rotation speed
 * @param {number} time - Current time in seconds (for animation)
 * @param {number} maxRadius - Maximum radius of the glow (3-4x agent radius)
 * @param {string} cacheKey - Unique key for caching rays (e.g., "hero-0")
 */
export function renderGodRays(ctx, x, y, baseColor, rayCount, rotationSpeed, time, maxRadius, cacheKey) {
    // Convert base color to RGB
    const rgb = colorToRgb(baseColor);
    
    // Get or create cached rays
    const rays = getRays(cacheKey, rayCount);
    
    ctx.save();
    
    // Use lighter blending for volumetric effect
    ctx.globalCompositeOperation = 'lighter';
    
    // Render each ray
    rays.forEach((ray) => {
        ray.angle += ray.driftSpeed + rotationSpeed;
        
        const alphaPulse = (Math.sin(ray.alphaPhase + time * ray.alphaSpeed) + 1) / 2;
        const currentAlpha = alphaPulse * ray.maxAlpha;
        
        if (currentAlpha < 0.01) return;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ray.angle);
        
        const rayLengthPixels = ray.length * maxRadius;
        
        // Gradient: Starts earlier to ensure center isn't dark
        const gradient = ctx.createLinearGradient(0, 0, rayLengthPixels, 0);
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`); // Tiny fade at very center
        gradient.addColorStop(0.05, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${currentAlpha})`); // Max bright very close to center
        gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${currentAlpha * 0.5})`); // Mid fade
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`); // Tip fade
        
        ctx.fillStyle = gradient;
        
        // SHAPE: "Leaf" / "Petal"
        // Use quadratic curves to create a leaf shape
        // Bulge out quickly near the base (0.15 length) to create the disk overlap
        // Then taper slowly to the tip.
        const bulgePos = rayLengthPixels * 0.15; // The widest point (creating the disk)
        const bulgeWidth = ray.width * (maxRadius * 0.1); // How fat the ray gets
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        // Top curve: 0,0 -> Bulge Out -> Tip
        ctx.quadraticCurveTo(bulgePos, -bulgeWidth, rayLengthPixels, 0);
        // Bottom curve: Tip -> Bulge Out -> 0,0
        ctx.quadraticCurveTo(bulgePos, bulgeWidth, 0, 0);
        ctx.fill();
        
        ctx.restore();
    });
    
    ctx.restore();
}
