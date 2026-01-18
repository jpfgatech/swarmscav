/**
 * ParameterPanel: Interactive UI for real-time parameter tuning
 * 
 * Provides sliders and controls for:
 * - J and K coupling constants (with extreme presets)
 * - TIME_SCALE (log scale)
 * - BASE_OMEGA (log scale)
 * - OMEGA_VARIATION (percentage of BASE_OMEGA)
 * - Energy curve visibility toggle
 */

/**
 * Maps a linear slider value [0, 1] to a logarithmic scale [min, max]
 * @param {number} sliderVal - Slider value in [0, 1]
 * @param {number} min - Minimum value (log scale)
 * @param {number} max - Maximum value (log scale)
 * @returns {number} Mapped value on log scale
 */
export function mapLogScale(sliderVal, min, max) {
    // Clamp slider value to [0, 1]
    const clamped = Math.max(0, Math.min(1, sliderVal));
    
    // Map to logarithmic scale: log(value) = log(min) + t * (log(max) - log(min))
    const logMin = Math.log10(min);
    const logMax = Math.log10(max);
    const logValue = logMin + clamped * (logMax - logMin);
    
    return Math.pow(10, logValue);
}

/**
 * Maps a value from log scale [min, max] back to linear slider [0, 1]
 * @param {number} value - Value on log scale
 * @param {number} min - Minimum value (log scale)
 * @param {number} max - Maximum value (log scale)
 * @returns {number} Slider value in [0, 1]
 */
export function unmapLogScale(value, min, max) {
    const logMin = Math.log10(min);
    const logMax = Math.log10(max);
    const logValue = Math.log10(value);
    
    return (logValue - logMin) / (logMax - logMin);
}

/**
 * Creates and manages the interactive parameter panel
 */
export class ParameterPanel {
    constructor(configUpdater, energyToggleCallback, maxStaminaCallback = null, isDevMode = true, presetIndex = null, presetCallback = null) {
        this.configUpdater = configUpdater; // Function to update config values
        this.energyToggleCallback = energyToggleCallback; // Function to toggle energy curve
        this.maxStaminaCallback = maxStaminaCallback; // Function to update max stamina (optional)
        this.presetCallback = presetCallback; // Function to apply preset config (for dev mode)
        this.showEnergyCurve = false; // Default: hide energy curve
        this.isDevMode = isDevMode; // Whether in developer mode (text inputs) or player mode (sliders)
        this.presetIndex = presetIndex; // Current preset index (for player mode display)
        
        this.createPanel();
    }
    
    generateDevModeHTML() {
        return `
                <!-- Preset Selector -->
                <div class="control-group">
                    <h4>Preset Configurations</h4>
                    <div class="control-row">
                        <div class="preset-buttons">
                            <button class="preset-btn" data-preset-index="0">Preset 1</button>
                            <button class="preset-btn" data-preset-index="1">Preset 2</button>
                            <button class="preset-btn" data-preset-index="2">Preset 3</button>
                            <button class="preset-btn" data-preset-index="3">Preset 4</button>
                        </div>
                    </div>
                </div>
                
                <!-- Coupling Controls -->
                <div class="control-group">
                    <h4>Coupling Constants</h4>
                    
                    <div class="control-row">
                        <label for="j-input">J (Spatial Coupling):</label>
                        <input type="number" id="j-input" step="any" value="1.2" class="number-input">
                    </div>
                    
                    <div class="control-row">
                        <label for="k-input">K (Phase Coupling):</label>
                        <input type="number" id="k-input" step="any" value="0.00" class="number-input">
                    </div>
                </div>
                
                <!-- Time Dynamics -->
                <div class="control-group">
                    <h4>Time Dynamics</h4>
                    
                    <div class="control-row">
                        <label for="time-scale-input">Time Scale:</label>
                        <input type="number" id="time-scale-input" step="any" value="100.0" class="number-input">
                    </div>
                    
                    <div class="control-row">
                        <label for="freq-base-input">Base Frequency (BASE_OMEGA):</label>
                        <input type="number" id="freq-base-input" step="any" value="0.02" class="number-input">
                    </div>
                </div>
                
                <!-- Variance -->
                <div class="control-group">
                    <h4>Frequency Variance</h4>
                    
                    <div class="control-row">
                        <label for="freq-std-input">Freq Std Dev (multiplier):</label>
                        <input type="number" id="freq-std-input" step="any" value="1.0" class="number-input">
                    </div>
                </div>
                
                <!-- Stamina -->
                <div class="control-group">
                    <h4>Stamina</h4>
                    
                    <div class="control-row">
                        <label for="max-stamina-input">Max Stamina (seconds):</label>
                        <input type="number" id="max-stamina-input" step="any" value="2.0" class="number-input">
                    </div>
                </div>
                
                <!-- Visuals -->
                <div class="control-group">
                    <h4>Visuals</h4>
                    
                    <div class="control-row">
                        <label class="toggle-label">
                            <input type="checkbox" id="energy-curve-toggle">
                            <span>Show Kinetic Energy Curve</span>
                        </label>
                    </div>
                </div>
        `;
    }
    
    generatePlayerModeHTML() {
        const presetDisplay = this.presetIndex !== null 
            ? `<div class="preset-display">Preset: ${this.presetIndex + 1} / ${4}</div>`
            : '';
        
        return `
                ${presetDisplay}
                <!-- Coupling Controls -->
                <div class="control-group">
                    <h4>Coupling Constants</h4>
                    
                    <div class="control-row">
                        <label for="j-slider">J (Spatial Coupling): <span id="j-value">1.2</span></label>
                        <div class="slider-container">
                            <input type="range" id="j-slider" min="-2" max="2" step="0.01" value="1.2" class="slider">
                            <div class="preset-buttons">
                                <button class="preset-btn" data-param="J" data-value="4" data-sign="+">+4</button>
                                <button class="preset-btn" data-param="J" data-value="4" data-sign="-">-4</button>
                                <button class="preset-btn" data-param="J" data-value="8" data-sign="+">+8</button>
                                <button class="preset-btn" data-param="J" data-value="8" data-sign="-">-8</button>
                                <button class="preset-btn" data-param="J" data-value="1024" data-sign="+">+1024</button>
                                <button class="preset-btn" data-param="J" data-value="1024" data-sign="-">-1024</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="control-row">
                        <label for="k-slider">K (Phase Coupling): <span id="k-value">0.00</span></label>
                        <div class="slider-container">
                            <input type="range" id="k-slider" min="-2" max="2" step="0.01" value="0.00" class="slider">
                            <div class="preset-buttons">
                                <button class="preset-btn" data-param="K" data-value="4" data-sign="+">+4</button>
                                <button class="preset-btn" data-param="K" data-value="4" data-sign="-">-4</button>
                                <button class="preset-btn" data-param="K" data-value="8" data-sign="+">+8</button>
                                <button class="preset-btn" data-param="K" data-value="8" data-sign="-">-8</button>
                                <button class="preset-btn" data-param="K" data-value="1024" data-sign="+">+1024</button>
                                <button class="preset-btn" data-param="K" data-value="1024" data-sign="-">-1024</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Time Dynamics (Log Scale) -->
                <div class="control-group">
                    <h4>Time Dynamics (Log Scale)</h4>
                    
                    <div class="control-row">
                        <label for="time-scale-slider">Time Scale: <span id="time-scale-value">100.0</span></label>
                        <input type="range" id="time-scale-slider" min="0" max="1" step="0.001" value="0.5" class="slider log-slider">
                    </div>
                    
                    <div class="control-row">
                        <label for="freq-base-slider">Base Frequency (BASE_OMEGA): <span id="freq-base-value">0.02</span></label>
                        <input type="range" id="freq-base-slider" min="0" max="1" step="0.001" value="0.301" class="slider log-slider">
                    </div>
                </div>
                
                <!-- Variance -->
                <div class="control-group">
                    <h4>Frequency Variance</h4>
                    
                    <div class="control-row">
                        <label for="freq-std-slider">Freq Std Dev: <span id="freq-std-value">100%</span></label>
                        <input type="range" id="freq-std-slider" min="0" max="4" step="0.01" value="1.0" class="slider">
                    </div>
                </div>
                
                <!-- Stamina -->
                <div class="control-group">
                    <h4>Stamina</h4>
                    
                    <div class="control-row">
                        <label for="max-stamina-slider">Max Stamina: <span id="max-stamina-value">2.0</span>s</label>
                        <input type="range" id="max-stamina-slider" min="1.0" max="5.0" step="0.1" value="2.0" class="slider">
                    </div>
                </div>
                
                <!-- Visuals -->
                <div class="control-group">
                    <h4>Visuals</h4>
                    
                    <div class="control-row">
                        <label class="toggle-label">
                            <input type="checkbox" id="energy-curve-toggle">
                            <span>Show Kinetic Energy Curve</span>
                        </label>
                    </div>
                </div>
        `;
    }
    
    createPanel() {
        // Remove existing panel if it exists
        const existing = document.getElementById('parameter-panel');
        if (existing) {
            existing.remove();
        }
        
        // Create panel container
        const panel = document.createElement('div');
        panel.id = 'parameter-panel';
        
        // Generate HTML based on mode
        const htmlContent = this.isDevMode ? this.generateDevModeHTML() : this.generatePlayerModeHTML();
        panel.innerHTML = `
            <div class="panel-header">
                <h3>${this.isDevMode ? 'Developer Parameters' : 'Interactive Parameters'}</h3>
                <button id="panel-toggle" class="panel-toggle">−</button>
            </div>
            <div class="panel-content" id="panel-content">
                ${htmlContent}
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #parameter-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #2a2a2a;
                border: 2px solid #444;
                border-radius: 8px;
                padding: 0;
                min-width: 300px;
                max-width: 400px;
                max-height: 90vh;
                overflow-y: auto;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            }
            
            .panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 15px;
                background: #333;
                border-bottom: 1px solid #444;
                border-radius: 6px 6px 0 0;
            }
            
            .panel-header h3 {
                margin: 0;
                color: #fff;
                font-size: 14px;
                font-weight: 600;
            }
            
            .panel-toggle {
                background: #444;
                border: 1px solid #555;
                color: #ccc;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 16px;
                line-height: 1;
            }
            
            .panel-toggle:hover {
                background: #555;
            }
            
            .panel-content {
                padding: 15px;
            }
            
            .panel-content.collapsed {
                display: none;
            }
            
            .control-group {
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid #333;
            }
            
            .control-group:last-child {
                border-bottom: none;
            }
            
            .control-group h4 {
                margin: 0 0 12px 0;
                color: #fff;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .control-row {
                margin-bottom: 15px;
            }
            
            .control-row:last-child {
                margin-bottom: 0;
            }
            
            .control-row label {
                display: block;
                color: #aaa;
                font-size: 11px;
                margin-bottom: 6px;
            }
            
            .control-row label span {
                color: #fff;
                font-weight: 600;
            }
            
            .slider-container {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .slider {
                width: 100%;
                height: 6px;
                background: #444;
                border-radius: 3px;
                outline: none;
                -webkit-appearance: none;
            }
            
            .slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                background: #0af;
                border-radius: 50%;
                cursor: pointer;
            }
            
            .slider::-moz-range-thumb {
                width: 16px;
                height: 16px;
                background: #0af;
                border-radius: 50%;
                cursor: pointer;
                border: none;
            }
            
            .preset-buttons {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 4px;
            }
            
            .preset-btn {
                padding: 4px 6px;
                background: #444;
                border: 1px solid #555;
                color: #ccc;
                cursor: pointer;
                border-radius: 4px;
                font-size: 10px;
                transition: background 0.2s;
            }
            
            .preset-btn:hover {
                background: #555;
            }
            
            .preset-btn:active {
                background: #666;
            }
            
            .toggle-label {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
            }
            
            .toggle-label input[type="checkbox"] {
                width: 18px;
                height: 18px;
                cursor: pointer;
            }
            
            .preset-display {
                padding: 10px 15px;
                margin: 0 15px 15px 15px;
                background: #333;
                border: 1px solid #555;
                border-radius: 4px;
                color: #0af;
                font-size: 12px;
                font-weight: 600;
                text-align: center;
            }
            
            .number-input {
                width: 100%;
                padding: 6px 8px;
                background: #333;
                border: 1px solid #555;
                border-radius: 4px;
                color: #fff;
                font-size: 12px;
                font-family: monospace;
            }
            
            .number-input:focus {
                outline: none;
                border-color: #0af;
                background: #3a3a3a;
            }
        `;
        document.head.appendChild(style);
        
        // Insert panel into body (ensure body exists)
        if (document.body) {
            document.body.appendChild(panel);
        } else {
            // If body doesn't exist yet, wait for DOMContentLoaded
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    if (document.body) {
                        document.body.appendChild(panel);
                    }
                });
            } else {
                // Fallback: append when body is available
                setTimeout(() => {
                    if (document.body) {
                        document.body.appendChild(panel);
                    }
                }, 0);
            }
        }
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const panel = document.getElementById('parameter-panel');
        const panelContent = document.getElementById('panel-content');
        const toggleBtn = document.getElementById('panel-toggle');
        
        // Toggle panel collapse
        toggleBtn.addEventListener('click', () => {
            const isCollapsed = panelContent.classList.contains('collapsed');
            if (isCollapsed) {
                panelContent.classList.remove('collapsed');
                toggleBtn.textContent = '−';
            } else {
                panelContent.classList.add('collapsed');
                toggleBtn.textContent = '+';
            }
        });
        
        // Preset selector buttons (dev mode only) - SET UP FIRST before other listeners
        console.log('Checking preset buttons setup:', { isDevMode: this.isDevMode, hasCallback: !!this.presetCallback });
        if (this.isDevMode && this.presetCallback) {
            // Use a small delay to ensure DOM is ready
            setTimeout(() => {
                const presetButtons = document.querySelectorAll('.preset-btn[data-preset-index]');
                console.log('Found preset buttons:', presetButtons.length);
                if (presetButtons.length === 0) {
                    console.error('No preset buttons found in DOM!');
                    // Try finding them in the panel
                    const panel = document.getElementById('parameter-panel');
                    if (panel) {
                        const buttonsInPanel = panel.querySelectorAll('.preset-btn[data-preset-index]');
                        console.log('Buttons in panel:', buttonsInPanel.length);
                    }
                }
                presetButtons.forEach((btn, index) => {
                    console.log(`Attaching listener to button ${index}:`, btn.textContent, btn.dataset.presetIndex);
                    // Remove any existing listeners first
                    const newBtn = btn.cloneNode(true);
                    btn.parentNode.replaceChild(newBtn, btn);
                    newBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const presetIndex = parseInt(newBtn.dataset.presetIndex);
                        console.log('Preset button clicked! Index:', presetIndex);
                        if (!isNaN(presetIndex) && this.presetCallback) {
                            this.presetCallback(presetIndex);
                        } else {
                            console.error('Invalid preset index or no callback:', { presetIndex, hasCallback: !!this.presetCallback });
                        }
                    });
                });
            }, 10);
        } else {
            console.log('Preset buttons not set up:', { isDevMode: this.isDevMode, hasCallback: !!this.presetCallback });
        }
        
        if (this.isDevMode) {
            // Dev mode: text inputs with blur/change events
            this.setupDevModeListeners();
        } else {
            // Player mode: sliders with input events
            this.setupPlayerModeListeners();
        }
        
        // Energy curve toggle (common to both modes)
        const energyToggle = document.getElementById('energy-curve-toggle');
        if (energyToggle) {
            energyToggle.checked = this.showEnergyCurve;
            energyToggle.addEventListener('change', (e) => {
                this.showEnergyCurve = e.target.checked;
                this.energyToggleCallback(this.showEnergyCurve);
            });
        }
    }
    
    setupDevModeListeners() {
        // J input
        const jInput = document.getElementById('j-input');
        if (jInput) {
            jInput.addEventListener('blur', (e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                    this.configUpdater('J', value);
                }
            });
            jInput.addEventListener('change', (e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                    this.configUpdater('J', value);
                }
            });
        }
        
        // K input
        const kInput = document.getElementById('k-input');
        if (kInput) {
            kInput.addEventListener('blur', (e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                    this.configUpdater('K', value);
                }
            });
            kInput.addEventListener('change', (e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                    this.configUpdater('K', value);
                }
            });
        }
        
        // Time scale input
        const timeScaleInput = document.getElementById('time-scale-input');
        if (timeScaleInput) {
            timeScaleInput.addEventListener('blur', (e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value > 0) {
                    this.configUpdater('TIME_SCALE', value);
                }
            });
            timeScaleInput.addEventListener('change', (e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value > 0) {
                    this.configUpdater('TIME_SCALE', value);
                }
            });
        }
        
        // Base frequency input
        const freqBaseInput = document.getElementById('freq-base-input');
        if (freqBaseInput) {
            freqBaseInput.addEventListener('blur', (e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value > 0) {
                    this.configUpdater('BASE_OMEGA', value);
                }
            });
            freqBaseInput.addEventListener('change', (e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value > 0) {
                    this.configUpdater('BASE_OMEGA', value);
                }
            });
        }
        
        // Frequency std dev input (multiplier)
        const freqStdInput = document.getElementById('freq-std-input');
        if (freqStdInput) {
            freqStdInput.addEventListener('blur', (e) => {
                const multiplier = parseFloat(e.target.value);
                if (!isNaN(multiplier) && multiplier >= 0) {
                    const baseFreq = parseFloat(freqBaseInput.value) || 0.02;
                    const omegaStd = multiplier * baseFreq;
                    this.configUpdater('OMEGA_VARIATION', omegaStd);
                }
            });
            freqStdInput.addEventListener('change', (e) => {
                const multiplier = parseFloat(e.target.value);
                if (!isNaN(multiplier) && multiplier >= 0) {
                    const baseFreq = parseFloat(freqBaseInput.value) || 0.02;
                    const omegaStd = multiplier * baseFreq;
                    this.configUpdater('OMEGA_VARIATION', omegaStd);
                }
            });
        }
        
        // Max Stamina input
        const maxStaminaInput = document.getElementById('max-stamina-input');
        if (maxStaminaInput && this.maxStaminaCallback) {
            maxStaminaInput.addEventListener('blur', (e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value > 0) {
                    this.maxStaminaCallback(value);
                }
            });
            maxStaminaInput.addEventListener('change', (e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value > 0) {
                    this.maxStaminaCallback(value);
                }
            });
        }
    }
    
    setupPlayerModeListeners() {
        // J slider
        const jSlider = document.getElementById('j-slider');
        const jValue = document.getElementById('j-value');
        if (jSlider && jValue) {
            jSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                jValue.textContent = value.toFixed(2);
                this.configUpdater('J', value);
            });
        }
        
        // K slider
        const kSlider = document.getElementById('k-slider');
        const kValue = document.getElementById('k-value');
        if (kSlider && kValue) {
            kSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                kValue.textContent = value.toFixed(2);
                this.configUpdater('K', value);
            });
        }
        
        // Time scale slider (log scale: 10 to 10000)
        const timeScaleSlider = document.getElementById('time-scale-slider');
        const timeScaleValue = document.getElementById('time-scale-value');
        if (timeScaleSlider && timeScaleValue) {
            timeScaleSlider.addEventListener('input', (e) => {
                const value = mapLogScale(parseFloat(e.target.value), 10, 10000);
                timeScaleValue.textContent = value.toFixed(1);
                this.configUpdater('TIME_SCALE', value);
            });
        }
        
        // Base frequency slider (log scale: 0.001 to 10)
        const freqBaseSlider = document.getElementById('freq-base-slider');
        const freqBaseValue = document.getElementById('freq-base-value');
        if (freqBaseSlider && freqBaseValue) {
            freqBaseSlider.addEventListener('input', (e) => {
                const value = mapLogScale(parseFloat(e.target.value), 0.001, 10);
                freqBaseValue.textContent = value.toFixed(4);
                this.configUpdater('BASE_OMEGA', value);
            });
        }
        
        // Frequency std dev slider (0% to 400% of base)
        const freqStdSlider = document.getElementById('freq-std-slider');
        const freqStdValue = document.getElementById('freq-std-value');
        if (freqStdSlider && freqStdValue && freqBaseSlider) {
            freqStdSlider.addEventListener('input', (e) => {
                const multiplier = parseFloat(e.target.value); // 0.0 to 4.0
                const baseFreq = mapLogScale(parseFloat(freqBaseSlider.value), 0.001, 10);
                // omega_std = slider_val * base_omega
                const omegaStd = multiplier * baseFreq;
                freqStdValue.textContent = `${(multiplier * 100).toFixed(0)}%`;
                this.configUpdater('OMEGA_VARIATION', omegaStd);
            });
        }
        
        // Max Stamina slider (1.0 to 5.0 seconds)
        const maxStaminaSlider = document.getElementById('max-stamina-slider');
        const maxStaminaValue = document.getElementById('max-stamina-value');
        if (maxStaminaSlider && maxStaminaValue) {
            maxStaminaSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                maxStaminaValue.textContent = value.toFixed(1);
                if (this.maxStaminaCallback) {
                    this.maxStaminaCallback(value);
                }
            });
        }
        
        // Preset buttons for J and K (player mode only)
        document.querySelectorAll('.preset-btn[data-param]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const param = e.target.dataset.param;
                const absValue = parseFloat(e.target.dataset.value);
                const sign = e.target.dataset.sign;
                
                // Apply sign to value
                const newValue = sign === '+' ? absValue : -absValue;
                
                // Update slider and value display
                const slider = document.getElementById(`${param.toLowerCase()}-slider`);
                const valueSpan = document.getElementById(`${param.toLowerCase()}-value`);
                
                // For extreme values like ±1024, don't clamp - allow them to exceed slider range
                // The slider itself is limited to -2 to 2, but config can accept any value
                if (slider && valueSpan) {
                    if (Math.abs(newValue) <= 2) {
                        slider.value = newValue;
                        valueSpan.textContent = newValue.toFixed(2);
                    } else {
                        // For extreme values, update display but keep slider at limit
                        slider.value = newValue > 0 ? 2 : -2;
                        valueSpan.textContent = newValue.toFixed(0);
                    }
                }
                
                // Update config with actual value (not clamped)
                this.configUpdater(param, newValue);
            });
        });
    }
    
    /**
     * Updates input/slider values from current config (useful for initialization)
     */
    updateFromConfig(config) {
        if (this.isDevMode) {
            // Dev mode: update text inputs
            const jInput = document.getElementById('j-input');
            if (jInput) jInput.value = config.J;
            
            const kInput = document.getElementById('k-input');
            if (kInput) kInput.value = config.K;
            
            const timeScaleInput = document.getElementById('time-scale-input');
            if (timeScaleInput) timeScaleInput.value = config.TIME_SCALE;
            
            const freqBaseInput = document.getElementById('freq-base-input');
            if (freqBaseInput) freqBaseInput.value = config.BASE_OMEGA;
            
            const freqStdInput = document.getElementById('freq-std-input');
            if (freqStdInput) {
                const multiplier = config.OMEGA_VARIATION / config.BASE_OMEGA;
                freqStdInput.value = multiplier;
            }
            
            const maxStaminaInput = document.getElementById('max-stamina-input');
            if (maxStaminaInput) {
                // MAX_STAMINA is not in Config, it's managed by HeroLogic
                // Default to 2.0 if not provided
                const stamina = (config && config.MAX_STAMINA) ? config.MAX_STAMINA : 2.0;
                maxStaminaInput.value = stamina;
            }
        } else {
            // Player mode: update sliders
            const jSlider = document.getElementById('j-slider');
            const jValue = document.getElementById('j-value');
            if (jSlider && jValue) {
                jSlider.value = config.J;
                jValue.textContent = config.J.toFixed(2);
            }
            
            const kSlider = document.getElementById('k-slider');
            const kValue = document.getElementById('k-value');
            if (kSlider && kValue) {
                kSlider.value = config.K;
                kValue.textContent = config.K.toFixed(2);
            }
            
            // Update time scale slider (log scale)
            const timeScaleSlider = document.getElementById('time-scale-slider');
            const timeScaleValue = document.getElementById('time-scale-value');
            if (timeScaleSlider && timeScaleValue) {
                const sliderVal = unmapLogScale(config.TIME_SCALE, 10, 10000);
                timeScaleSlider.value = sliderVal;
                timeScaleValue.textContent = config.TIME_SCALE.toFixed(1);
            }
            
            // Update base frequency slider (log scale)
            const freqBaseSlider = document.getElementById('freq-base-slider');
            const freqBaseValue = document.getElementById('freq-base-value');
            if (freqBaseSlider && freqBaseValue) {
                const sliderVal = unmapLogScale(config.BASE_OMEGA, 0.001, 10);
                freqBaseSlider.value = sliderVal;
                freqBaseValue.textContent = config.BASE_OMEGA.toFixed(4);
            }
            
            // Update frequency std dev slider
            const freqStdSlider = document.getElementById('freq-std-slider');
            const freqStdValue = document.getElementById('freq-std-value');
            if (freqStdSlider && freqStdValue) {
                // omega_std = slider_val * base_omega, so slider_val = omega_std / base_omega
                const multiplier = config.OMEGA_VARIATION / config.BASE_OMEGA;
                const sliderValue = Math.max(0, Math.min(4, multiplier));
                freqStdSlider.value = sliderValue;
                freqStdValue.textContent = `${(multiplier * 100).toFixed(0)}%`;
            }
            
            // Update max stamina slider (if callback is provided, it means heroLogic exists)
            const maxStaminaSlider = document.getElementById('max-stamina-slider');
            const maxStaminaValue = document.getElementById('max-stamina-value');
            if (maxStaminaSlider && maxStaminaValue && this.maxStaminaCallback) {
                // Default to 2.0 if not in config
                const stamina = config.MAX_STAMINA || 2.0;
                const sliderValue = Math.max(1.0, Math.min(5.0, stamina));
                maxStaminaSlider.value = sliderValue;
                maxStaminaValue.textContent = sliderValue.toFixed(1);
            }
        }
    }
}
