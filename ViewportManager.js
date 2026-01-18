/**
 * ViewportManager: Manages viewport scaling and coordinate transformation
 * 
 * Decouples physics coordinates from screen pixels to ensure consistent gameplay
 * across all devices (Desktop vs. Mobile).
 * 
 * Architecture:
 * - Logical coordinate system: Fixed virtual resolution (e.g., 1000x1000)
 * - Screen coordinate system: Actual canvas/pixel dimensions
 * - Maintains aspect ratio with letterboxing/pillarboxing
 */
export class ViewportManager {
    /**
     * @param {number} logicalWidth - Logical coordinate system width
     * @param {number} logicalHeight - Logical coordinate system height
     */
    constructor(logicalWidth, logicalHeight) {
        this.logicalWidth = logicalWidth;
        this.logicalHeight = logicalHeight;
        
        // Screen dimensions (updated on resize)
        this.screenWidth = 0;
        this.screenHeight = 0;
        
        // Viewport transformation parameters (calculated on resize)
        this.scale = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;
    }
    
    /**
     * Resize viewport to match new screen dimensions
     * Calculates scale and centering offsets for letterboxing/pillarboxing
     * @param {number} screenWidth - Actual screen/canvas width in pixels
     * @param {number} screenHeight - Actual screen/canvas height in pixels
     */
    resize(screenWidth, screenHeight) {
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        
        // Calculate scale to fit logical resolution within screen (maintain aspect ratio)
        // Scale is the minimum ratio to ensure everything fits
        const scaleX = screenWidth / this.logicalWidth;
        const scaleY = screenHeight / this.logicalHeight;
        this.scale = Math.min(scaleX, scaleY);
        
        // Calculate centering offsets for letterboxing/pillarboxing
        const scaledWidth = this.logicalWidth * this.scale;
        const scaledHeight = this.logicalHeight * this.scale;
        this.offsetX = (screenWidth - scaledWidth) / 2;
        this.offsetY = (screenHeight - scaledHeight) / 2;
    }
    
    /**
     * Project logical coordinates to screen coordinates (for drawing)
     * @param {number} x - Logical X coordinate
     * @param {number} y - Logical Y coordinate
     * @returns {{x: number, y: number}} Screen coordinates in pixels
     */
    project(x, y) {
        return {
            x: x * this.scale + this.offsetX,
            y: y * this.scale + this.offsetY
        };
    }
    
    /**
     * Unproject screen coordinates to logical coordinates (for input)
     * @param {number} screenX - Screen X coordinate in pixels
     * @param {number} screenY - Screen Y coordinate in pixels
     * @returns {{x: number, y: number}} Logical coordinates
     */
    unproject(screenX, screenY) {
        return {
            x: (screenX - this.offsetX) / this.scale,
            y: (screenY - this.offsetY) / this.scale
        };
    }
    
    /**
     * Get current scale factor
     * @returns {number} Scale factor
     */
    getScale() {
        return this.scale;
    }
    
    /**
     * Get current offset X
     * @returns {number} Offset X in pixels
     */
    getOffsetX() {
        return this.offsetX;
    }
    
    /**
     * Get current offset Y
     * @returns {number} Offset Y in pixels
     */
    getOffsetY() {
        return this.offsetY;
    }
    
    /**
     * Get logical width
     * @returns {number} Logical width
     */
    getLogicalWidth() {
        return this.logicalWidth;
    }
    
    /**
     * Get logical height
     * @returns {number} Logical height
     */
    getLogicalHeight() {
        return this.logicalHeight;
    }
}
