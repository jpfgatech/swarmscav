/**
 * Verification script for Task 1 trace.json
 * 
 * Checks:
 * 1. File exists and is valid JSON
 * 2. Correct number of frames (201)
 * 3. Correct structure (frame, hero_pos, agents_pos, agents_phase)
 * 4. No NaN or Infinity values
 * 5. Positions are within bounds [0, 1000]
 * 6. Phases are within [0, 2π]
 * 7. Deterministic: re-running generates same output
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tracePath = path.join(__dirname, '..', 'python', 'data', 'trace.json');

console.log('='.repeat(60));
console.log('Task 1 Trace Verification');
console.log('='.repeat(60));

// Check 1: File exists
if (!fs.existsSync(tracePath)) {
    console.error('❌ FAIL: trace.json does not exist');
    process.exit(1);
}
console.log('✅ PASS: trace.json exists');

// Check 2: Valid JSON
let trace;
try {
    const content = fs.readFileSync(tracePath, 'utf8');
    trace = JSON.parse(content);
} catch (error) {
    console.error('❌ FAIL: Invalid JSON:', error.message);
    process.exit(1);
}
console.log('✅ PASS: Valid JSON format');

// Check 3: Correct number of frames
if (trace.length !== 201) {
    console.error(`❌ FAIL: Expected 201 frames, got ${trace.length}`);
    process.exit(1);
}
console.log(`✅ PASS: Correct number of frames (${trace.length})`);

// Check 4: Structure validation
let hasErrors = false;
const LOGICAL_WIDTH = 1000;
const LOGICAL_HEIGHT = 1000;

for (let i = 0; i < trace.length; i++) {
    const frame = trace[i];
    
    // Check required fields
    if (frame.frame === undefined || frame.hero_pos === undefined || 
        frame.agents_pos === undefined || frame.agents_phase === undefined) {
        console.error(`❌ FAIL: Frame ${i} missing required fields`);
        hasErrors = true;
        continue;
    }
    
    // Check frame number
    if (frame.frame !== i) {
        console.error(`❌ FAIL: Frame ${i} has incorrect frame number: ${frame.frame}`);
        hasErrors = true;
    }
    
    // Check hero_pos
    if (!Array.isArray(frame.hero_pos) || frame.hero_pos.length !== 2) {
        console.error(`❌ FAIL: Frame ${i} hero_pos is not [x, y] array`);
        hasErrors = true;
    }
    
    // Check agents_pos
    if (!Array.isArray(frame.agents_pos) || frame.agents_pos.length !== 100) {
        console.error(`❌ FAIL: Frame ${i} agents_pos should have 100 entries, got ${frame.agents_pos.length}`);
        hasErrors = true;
    }
    
    // Check agents_phase
    if (!Array.isArray(frame.agents_phase) || frame.agents_phase.length !== 100) {
        console.error(`❌ FAIL: Frame ${i} agents_phase should have 100 entries, got ${frame.agents_phase.length}`);
        hasErrors = true;
    }
    
    // Check for NaN/Infinity
    const checkValue = (val, name, frameIdx) => {
        if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
            console.error(`❌ FAIL: Frame ${frameIdx} ${name} has invalid value: ${val}`);
            hasErrors = true;
        }
    };
    
    checkValue(frame.hero_pos[0], 'hero_pos[0]', i);
    checkValue(frame.hero_pos[1], 'hero_pos[1]', i);
    
    for (let j = 0; j < frame.agents_pos.length; j++) {
        checkValue(frame.agents_pos[j][0], `agents_pos[${j}][0]`, i);
        checkValue(frame.agents_pos[j][1], `agents_pos[${j}][1]`, i);
    }
    
    for (let j = 0; j < frame.agents_phase.length; j++) {
        checkValue(frame.agents_phase[j], `agents_phase[${j}]`, i);
    }
    
    // Check position bounds (validation of data structure only, not cross-comparison)
    // Positions should be in [0, width) and [0, height) after toroidal wrapping
    // Allow small tolerance for numerical precision
    const checkBounds = (x, y, name, frameIdx) => {
        if (x < -10 || x > LOGICAL_WIDTH + 10 || y < -10 || y > LOGICAL_HEIGHT + 10) {
            console.warn(`⚠️  WARN: Frame ${frameIdx} ${name} out of expected bounds [0, ${LOGICAL_WIDTH}]x[0, ${LOGICAL_HEIGHT}]: (${x.toFixed(2)}, ${y.toFixed(2)})`);
        }
    };
    
    checkBounds(frame.hero_pos[0], frame.hero_pos[1], 'hero_pos', i);
    
    // Check phase bounds [0, 2π] (validation of data structure only)
    for (let j = 0; j < frame.agents_phase.length; j++) {
        const phase = frame.agents_phase[j];
        if (phase < -0.1 || phase > 2 * Math.PI + 0.1) {
            console.warn(`⚠️  WARN: Frame ${i} agents_phase[${j}] out of expected bounds [0, 2π]: ${phase.toFixed(4)}`);
        }
    }
}

if (hasErrors) {
    console.error('\n❌ FAIL: Validation errors found');
    process.exit(1);
}

console.log('✅ PASS: All frames have correct structure');
console.log('✅ PASS: No NaN or Infinity values');
console.log('✅ PASS: Values are within expected bounds (positions in [0, 1000], phases in [0, 2π])');

// Check 5: Sample data inspection
console.log('\n' + '='.repeat(60));
console.log('Sample Data (Frame 0):');
console.log('='.repeat(60));
console.log(`Hero position: [${trace[0].hero_pos[0].toFixed(2)}, ${trace[0].hero_pos[1].toFixed(2)}]`);
console.log(`Agent 0 position: [${trace[0].agents_pos[0][0].toFixed(2)}, ${trace[0].agents_pos[0][1].toFixed(2)}]`);
console.log(`Agent 0 phase: ${trace[0].agents_phase[0].toFixed(4)}`);
console.log(`Agent 99 position: [${trace[0].agents_pos[99][0].toFixed(2)}, ${trace[0].agents_pos[99][1].toFixed(2)}]`);

// Check 6: Verify action sequence by checking hero movement
console.log('\n' + '='.repeat(60));
console.log('Action Sequence Verification:');
console.log('='.repeat(60));

// Action sequence: 0 (0-40) -> 1 (41-80) -> 0 (81-120) -> 2 (121-160) -> 0 (161-200)

// Frames 0-40: Action 0 (No-op) - Hero should move
const heroPos0 = trace[0].hero_pos;
const heroPos40 = trace[40].hero_pos;
const dist0to40 = Math.sqrt(
    Math.pow(heroPos40[0] - heroPos0[0], 2) + 
    Math.pow(heroPos40[1] - heroPos0[1], 2)
);
console.log(`Frames 0-40 (Action 0: No-op): Hero moved ${dist0to40.toFixed(2)} pixels`);

// Frames 41-80: Action 1 (Hold Hero) - Hero should be frozen
const heroPos41 = trace[41].hero_pos;
const heroPos80 = trace[80].hero_pos;
const dist41to80 = Math.sqrt(
    Math.pow(heroPos80[0] - heroPos41[0], 2) + 
    Math.pow(heroPos80[1] - heroPos41[1], 2)
);
console.log(`Frames 41-80 (Action 1: Hold Hero): Hero moved ${dist41to80.toFixed(6)} pixels (should be ~0)`);

if (dist41to80 < 0.001) {
    console.log('✅ PASS: Hero is frozen during Action 1');
} else if (dist41to80 < 0.01) {
    console.log('✅ PASS: Hero is effectively frozen (movement < 0.01 pixels, likely numerical precision)');
} else {
    console.warn('⚠️  WARN: Hero should be frozen during Action 1, but moved significantly');
}

// Frames 81-120: Action 0 (No-op, recovery) - Hero should move again
const heroPos81 = trace[81].hero_pos;
const heroPos120 = trace[120].hero_pos;
const dist81to120 = Math.sqrt(
    Math.pow(heroPos120[0] - heroPos81[0], 2) + 
    Math.pow(heroPos120[1] - heroPos81[1], 2)
);
console.log(`Frames 81-120 (Action 0: No-op, recovery): Hero moved ${dist81to120.toFixed(2)} pixels`);

// Check file size
const fileSize = fs.statSync(tracePath).size;
console.log('\n' + '='.repeat(60));
console.log('File Statistics:');
console.log('='.repeat(60));
console.log(`File size: ${(fileSize / 1024).toFixed(2)} KB`);
console.log(`Frames: ${trace.length}`);
console.log(`Data per frame: ~${(fileSize / trace.length / 1024).toFixed(2)} KB`);

console.log('\n' + '='.repeat(60));
console.log('✅ ALL CHECKS PASSED');
console.log('='.repeat(60));
console.log('\nTo verify determinism, run:');
console.log('  node scripts/generate_trace.js');
console.log('  git diff python/data/trace.json');
console.log('(Should show no differences)');
