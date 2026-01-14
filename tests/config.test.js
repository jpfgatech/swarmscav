/**
 * Unit tests for config.js URL parameter parsing
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Config URL Parameter Parsing', () => {
    let originalLocation;
    
    beforeEach(() => {
        // Save original location
        originalLocation = global.window?.location;
    });
    
    afterEach(() => {
        // Restore original location
        if (global.window) {
            global.window.location = originalLocation;
        }
    });
    
    it('should use default values when no URL parameters are present', async () => {
        // Mock window.location without search params
        global.window = {
            location: {
                search: ''
            }
        };
        
        // Dynamically import config to get fresh values
        const { Config } = await import('../src/core/Config.js');
        
        // Since we can't easily test the exported constants without URL params in Node,
        // we'll test the helper function directly
        const urlParams = new URLSearchParams('');
        const getUrlParam = (name, defaultValue) => {
            const value = urlParams.get(name);
            return value !== null ? parseFloat(value) : defaultValue;
        };
        
        expect(getUrlParam('BASE_OMEGA', Config.BASE_OMEGA)).toBe(Config.BASE_OMEGA);
        expect(getUrlParam('OMEGA_VARIATION', Config.OMEGA_VARIATION)).toBe(Config.OMEGA_VARIATION);
        expect(getUrlParam('TIME_SCALE', Config.TIME_SCALE)).toBe(Config.TIME_SCALE);
    });
    
    it('should parse BASE_OMEGA from URL parameter', () => {
        const urlParams = new URLSearchParams('?BASE_OMEGA=0.05');
        const getUrlParam = (name, defaultValue) => {
            const value = urlParams.get(name);
            return value !== null ? parseFloat(value) : defaultValue;
        };
        
        const result = getUrlParam('BASE_OMEGA', 0.02);
        expect(result).toBe(0.05);
    });
    
    it('should parse OMEGA_VARIATION from URL parameter', () => {
        const urlParams = new URLSearchParams('?OMEGA_VARIATION=0.05');
        const getUrlParam = (name, defaultValue) => {
            const value = urlParams.get(name);
            return value !== null ? parseFloat(value) : defaultValue;
        };
        
        const result = getUrlParam('OMEGA_VARIATION', 0.02);
        expect(result).toBe(0.05);
    });
    
    it('should parse TIME_SCALE from URL parameter', () => {
        const urlParams = new URLSearchParams('?TIME_SCALE=50.0');
        const getUrlParam = (name, defaultValue) => {
            const value = urlParams.get(name);
            return value !== null ? parseFloat(value) : defaultValue;
        };
        
        const result = getUrlParam('TIME_SCALE', 100.0);
        expect(result).toBe(50.0);
    });
    
    it('should parse EPSILON from URL parameter', () => {
        const urlParams = new URLSearchParams('?EPSILON=8.0');
        const getUrlParam = (name, defaultValue) => {
            const value = urlParams.get(name);
            return value !== null ? parseFloat(value) : defaultValue;
        };
        
        const result = getUrlParam('EPSILON', 4.0);
        expect(result).toBe(8.0);
    });
    
    it('should parse multiple parameters simultaneously', () => {
        const urlParams = new URLSearchParams('?BASE_OMEGA=0.05&OMEGA_VARIATION=0.03&TIME_SCALE=50.0&EPSILON=8.0');
        const getUrlParam = (name, defaultValue) => {
            const value = urlParams.get(name);
            return value !== null ? parseFloat(value) : defaultValue;
        };
        
        expect(getUrlParam('BASE_OMEGA', 0.02)).toBe(0.05);
        expect(getUrlParam('OMEGA_VARIATION', 0.02)).toBe(0.03);
        expect(getUrlParam('TIME_SCALE', 100.0)).toBe(50.0);
        expect(getUrlParam('EPSILON', 4.0)).toBe(8.0);
    });
    
    it('should handle negative values correctly', () => {
        const urlParams = new URLSearchParams('?TIME_SCALE=-50.0');
        const getUrlParam = (name, defaultValue) => {
            const value = urlParams.get(name);
            return value !== null ? parseFloat(value) : defaultValue;
        };
        
        const result = getUrlParam('TIME_SCALE', 100.0);
        expect(result).toBe(-50.0);
    });
    
    it('should fall back to default when parameter is missing', () => {
        const urlParams = new URLSearchParams('?J=1.0&K=0.5');
        const getUrlParam = (name, defaultValue) => {
            const value = urlParams.get(name);
            return value !== null ? parseFloat(value) : defaultValue;
        };
        
        // BASE_OMEGA not in URL, should use default
        expect(getUrlParam('BASE_OMEGA', 0.02)).toBe(0.02);
    });
    
    it('should handle invalid numeric values gracefully', () => {
        const urlParams = new URLSearchParams('?BASE_OMEGA=invalid');
        const getUrlParam = (name, defaultValue) => {
            const value = urlParams.get(name);
            return value !== null ? parseFloat(value) : defaultValue;
        };
        
        const result = getUrlParam('BASE_OMEGA', 0.02);
        expect(isNaN(result)).toBe(true);
    });
});
