/**
 * Unit tests for ParameterPanel module
 * Tests mapLogScale, unmapLogScale, and ParameterPanel class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mapLogScale, unmapLogScale, ParameterPanel } from '../ParameterPanel.js';

// Setup DOM environment for ParameterPanel tests
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;

describe('mapLogScale', () => {
    it('should map 0 to minimum value', () => {
        expect(mapLogScale(0, 0.001, 10)).toBeCloseTo(0.001, 5);
    });

    it('should map 1 to maximum value', () => {
        expect(mapLogScale(1, 0.001, 10)).toBeCloseTo(10, 5);
    });

    it('should map 0.5 to geometric mean', () => {
        const result = mapLogScale(0.5, 0.001, 10);
        const expected = Math.sqrt(0.001 * 10); // Geometric mean
        expect(result).toBeCloseTo(expected, 3);
    });

    it('should clamp values outside [0, 1]', () => {
        expect(mapLogScale(-1, 0.001, 10)).toBeCloseTo(0.001, 5);
        expect(mapLogScale(2, 0.001, 10)).toBeCloseTo(10, 5);
    });

    it('should handle different ranges', () => {
        expect(mapLogScale(0, 1, 10000)).toBeCloseTo(1, 5);
        expect(mapLogScale(1, 1, 10000)).toBeCloseTo(10000, 5);
    });
});

describe('unmapLogScale', () => {
    it('should map minimum value to 0', () => {
        expect(unmapLogScale(0.001, 0.001, 10)).toBeCloseTo(0, 5);
    });

    it('should map maximum value to 1', () => {
        expect(unmapLogScale(10, 0.001, 10)).toBeCloseTo(1, 5);
    });

    it('should be inverse of mapLogScale', () => {
        const sliderVal = 0.7;
        const mapped = mapLogScale(sliderVal, 0.001, 10);
        const unmapped = unmapLogScale(mapped, 0.001, 10);
        expect(unmapped).toBeCloseTo(sliderVal, 3);
    });

    it('should handle geometric mean correctly', () => {
        const geometricMean = Math.sqrt(0.001 * 10);
        const result = unmapLogScale(geometricMean, 0.001, 10);
        expect(result).toBeCloseTo(0.5, 3);
    });
});

describe('ParameterPanel', () => {
    let mockConfigUpdater;
    let mockEnergyToggle;
    let mockMaxStamina;
    let panel;

    beforeEach(() => {
        // Clear any existing panel
        const existing = document.getElementById('parameter-panel');
        if (existing) {
            existing.remove();
        }
        
        mockConfigUpdater = vi.fn();
        mockEnergyToggle = vi.fn();
        mockMaxStamina = vi.fn();
    });
    
    describe('Player Mode (Sliders)', () => {
        beforeEach(() => {
            panel = new ParameterPanel(mockConfigUpdater, mockEnergyToggle, mockMaxStamina, false);
        });

    it('should create panel with correct structure', () => {
        const panelElement = document.getElementById('parameter-panel');
        expect(panelElement).toBeTruthy();
        expect(panelElement.querySelector('.panel-header')).toBeTruthy();
        expect(panelElement.querySelector('.panel-content')).toBeTruthy();
    });

        it('should create panel with correct structure', () => {
            const panelElement = document.getElementById('parameter-panel');
            expect(panelElement).toBeTruthy();
            expect(panelElement.querySelector('.panel-header')).toBeTruthy();
            expect(panelElement.querySelector('.panel-content')).toBeTruthy();
        });

        it('should have J and K sliders', () => {
            const jSlider = document.getElementById('j-slider');
            const kSlider = document.getElementById('k-slider');
            expect(jSlider).toBeTruthy();
            expect(kSlider).toBeTruthy();
            expect(jSlider.min).toBe('-2');
            expect(jSlider.max).toBe('2');
            expect(kSlider.min).toBe('-2');
            expect(kSlider.max).toBe('2');
        });

        it('should have TIME_SCALE slider with log scale', () => {
            const timeScaleSlider = document.getElementById('time-scale-slider');
            expect(timeScaleSlider).toBeTruthy();
            expect(timeScaleSlider.min).toBe('0');
            expect(timeScaleSlider.max).toBe('1');
        });

        it('should have BASE_OMEGA slider with log scale', () => {
            const freqBaseSlider = document.getElementById('freq-base-slider');
            expect(freqBaseSlider).toBeTruthy();
            expect(freqBaseSlider.min).toBe('0');
            expect(freqBaseSlider.max).toBe('1');
        });

        it('should have max stamina slider', () => {
            const maxStaminaSlider = document.getElementById('max-stamina-slider');
            expect(maxStaminaSlider).toBeTruthy();
            expect(maxStaminaSlider.min).toBe('1.0');
            expect(maxStaminaSlider.max).toBe('5.0');
        });

        it('should have energy curve toggle', () => {
            const energyToggle = document.getElementById('energy-curve-toggle');
            expect(energyToggle).toBeTruthy();
            expect(energyToggle.type).toBe('checkbox');
        });

        it('should call configUpdater when J slider changes', () => {
            const jSlider = document.getElementById('j-slider');
            jSlider.value = '1.5';
            jSlider.dispatchEvent(new Event('input'));
            
            expect(mockConfigUpdater).toHaveBeenCalledWith('J', 1.5);
        });

        it('should call configUpdater when K slider changes', () => {
            const kSlider = document.getElementById('k-slider');
            kSlider.value = '-0.5';
            kSlider.dispatchEvent(new Event('input'));
            
            expect(mockConfigUpdater).toHaveBeenCalledWith('K', -0.5);
        });

        it('should call maxStaminaCallback when max stamina slider changes', () => {
            const maxStaminaSlider = document.getElementById('max-stamina-slider');
            if (maxStaminaSlider) {
                maxStaminaSlider.value = '3.0';
                maxStaminaSlider.dispatchEvent(new Event('input'));
                
                expect(maxStaminaSlider).toBeTruthy();
                expect(mockMaxStamina).toHaveBeenCalledWith(3.0);
            }
        });

        it('should call energyToggleCallback when toggle changes', () => {
            const energyToggle = document.getElementById('energy-curve-toggle');
            energyToggle.checked = false;
            energyToggle.dispatchEvent(new Event('change'));
            
            expect(mockEnergyToggle).toHaveBeenCalledWith(false);
        });

        it('should handle preset buttons for J', () => {
            const presetButtons = document.querySelectorAll('.preset-btn[data-param="J"]');
            expect(presetButtons.length).toBeGreaterThan(0);
            
            // Test a preset button click
            const plus4Button = Array.from(presetButtons).find(btn => 
                btn.dataset.value === '4' && btn.dataset.sign === '+'
            );
            
            if (plus4Button) {
                plus4Button.click();
                expect(mockConfigUpdater).toHaveBeenCalledWith('J', 4);
            }
        });

        it('should update from config correctly', () => {
            const config = {
                J: 1.5,
                K: -0.3,
                TIME_SCALE: 500,
                BASE_OMEGA: 0.05,
                OMEGA_VARIATION: 0.02
            };
            
            panel.updateFromConfig(config);
            
            const jSlider = document.getElementById('j-slider');
            const kSlider = document.getElementById('k-slider');
            expect(parseFloat(jSlider.value)).toBeCloseTo(1.5, 2);
            expect(parseFloat(kSlider.value)).toBeCloseTo(-0.3, 2);
        });
    });
    
    describe('Developer Mode (Text Inputs)', () => {
        beforeEach(() => {
            panel = new ParameterPanel(mockConfigUpdater, mockEnergyToggle, mockMaxStamina, true);
        });
        
        it('should create panel with correct structure', () => {
            const panelElement = document.getElementById('parameter-panel');
            expect(panelElement).toBeTruthy();
            expect(panelElement.querySelector('.panel-header')).toBeTruthy();
            expect(panelElement.querySelector('.panel-content')).toBeTruthy();
        });

        it('should have J and K number inputs', () => {
            const jInput = document.getElementById('j-input');
            const kInput = document.getElementById('k-input');
            expect(jInput).toBeTruthy();
            expect(kInput).toBeTruthy();
            expect(jInput.type).toBe('number');
            expect(kInput.type).toBe('number');
        });

        it('should have TIME_SCALE number input', () => {
            const timeScaleInput = document.getElementById('time-scale-input');
            expect(timeScaleInput).toBeTruthy();
            expect(timeScaleInput.type).toBe('number');
        });

        it('should have BASE_OMEGA number input', () => {
            const freqBaseInput = document.getElementById('freq-base-input');
            expect(freqBaseInput).toBeTruthy();
            expect(freqBaseInput.type).toBe('number');
        });

        it('should have max stamina number input', () => {
            const maxStaminaInput = document.getElementById('max-stamina-input');
            expect(maxStaminaInput).toBeTruthy();
            expect(maxStaminaInput.type).toBe('number');
        });

        it('should call configUpdater when J input changes (blur)', () => {
            const jInput = document.getElementById('j-input');
            jInput.value = '1024';
            jInput.dispatchEvent(new Event('blur'));
            
            expect(mockConfigUpdater).toHaveBeenCalledWith('J', 1024);
        });

        it('should call configUpdater when K input changes (change)', () => {
            const kInput = document.getElementById('k-input');
            kInput.value = '-1024';
            kInput.dispatchEvent(new Event('change'));
            
            expect(mockConfigUpdater).toHaveBeenCalledWith('K', -1024);
        });

        it('should call maxStaminaCallback when max stamina input changes', () => {
            const maxStaminaInput = document.getElementById('max-stamina-input');
            if (maxStaminaInput) {
                maxStaminaInput.value = '5.5';
                maxStaminaInput.dispatchEvent(new Event('blur'));
                
                expect(mockMaxStamina).toHaveBeenCalledWith(5.5);
            }
        });

        it('should update from config correctly', () => {
            const config = {
                J: 1.5,
                K: -0.3,
                TIME_SCALE: 500,
                BASE_OMEGA: 0.05,
                OMEGA_VARIATION: 0.02
            };
            
            panel.updateFromConfig(config);
            
            const jInput = document.getElementById('j-input');
            const kInput = document.getElementById('k-input');
            const timeScaleInput = document.getElementById('time-scale-input');
            const freqBaseInput = document.getElementById('freq-base-input');
            const freqStdInput = document.getElementById('freq-std-input');
            
            expect(parseFloat(jInput.value)).toBeCloseTo(1.5, 2);
            expect(parseFloat(kInput.value)).toBeCloseTo(-0.3, 2);
            expect(parseFloat(timeScaleInput.value)).toBeCloseTo(500, 1);
            expect(parseFloat(freqBaseInput.value)).toBeCloseTo(0.05, 4);
            // OMEGA_VARIATION = multiplier * BASE_OMEGA, so multiplier = 0.02 / 0.05 = 0.4
            expect(parseFloat(freqStdInput.value)).toBeCloseTo(0.4, 2);
        });
    });
});
