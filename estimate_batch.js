/**
 * Pre-Flight Batch Estimator
 * 
 * Calculates the exact scale of the parameter sweep and estimates total runtime
 * by running a probe simulation.
 */

import puppeteer from 'puppeteer';
import Jimp from 'jimp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Use omggif with quantize for palette generation
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { GifWriter } = require('omggif');
const quantize = require('quantize');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = 5173;
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.join(__dirname, 'output');
const CAPTURE_DURATION = 5000; // 5 seconds
const FRAME_RATE = 30;
const FRAME_INTERVAL = 1000 / FRAME_RATE;
const TOTAL_FRAMES = Math.floor((CAPTURE_DURATION / 1000) * FRAME_RATE);
const WARMUP_TIME = 10000; // 10 seconds warmup (skip first 10 seconds)
// GIF delay in centiseconds (hundredths of a second) - omggif expects this format
const GIF_DELAY = Math.round(FRAME_INTERVAL / 10); // Convert ms to centiseconds

// Parameter arrays (5 dimensions)
const J_VALUES = [-2.0, -1.5, -1.0, -0.8, -0.6, -0.4, -0.2, 0.0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.5, 2.0];
const K_VALUES = [-2.0, -1.5, -1.0, -0.8, -0.6, -0.4, -0.2, 0.0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.5, 2.0];
const MU_VALUES = [0.90, 0.95, 0.99];
const K_WELL_VALUES = [0.001, 0.002, 0.005];
const REP_VALUES = [0.5, 1.0, 2.0];

// Fixed constants
const FIXED_N = 500;
const FIXED_TIME_SCALE = 20.0;

/**
 * Generate Cartesian product of parameter arrays
 */
function generateJobManifest() {
    const jobs = [];
    
    for (const J of J_VALUES) {
        for (const K of K_VALUES) {
            for (const MU of MU_VALUES) {
                for (const K_WELL of K_WELL_VALUES) {
                    for (const REP of REP_VALUES) {
                        jobs.push({ J, K, MU, K_WELL, REP });
                    }
                }
            }
        }
    }
    
    return jobs;
}

/**
 * Format float for filename (2-3 decimal places)
 */
function formatParam(value) {
    const rounded = Math.round(value * 1000) / 1000;
    return rounded.toString().replace(/\.?0+$/, '');
}

/**
 * Generate filename for a parameter combination
 */
function generateFilename(job) {
    const jStr = formatParam(job.J).replace(/\./g, 'p').replace(/-/g, 'm');
    const kStr = formatParam(job.K).replace(/\./g, 'p').replace(/-/g, 'm');
    const mStr = formatParam(job.MU).replace(/\./g, 'p');
    const wStr = formatParam(job.K_WELL).replace(/\./g, 'p');
    const rStr = formatParam(job.REP).replace(/\./g, 'p');
    
    return `swarms_J${jStr}_K${kStr}_M${mStr}_W${wStr}_R${rStr}.gif`;
}

/**
 * Creates output directory if it doesn't exist
 */
function ensureOutputDir() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    const remainingHours = hours % 24;
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (remainingHours > 0) parts.push(`${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`);
    if (remainingMinutes > 0) parts.push(`${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`);
    if (remainingSeconds > 0 && days === 0) parts.push(`${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`);
    
    return parts.join(', ') || '0 seconds';
}

/**
 * Run a probe simulation to measure execution time and save GIF
 */
async function runProbe() {
    console.log('\n' + '='.repeat(60));
    console.log('Running Probe Simulation');
    console.log('='.repeat(60));
    
    const probeJob = { J: 0.0, K: 0.0, MU: 0.95, K_WELL: 0.002, REP: 1.0 };
    console.log(`Probe Parameters: J=${probeJob.J}, K=${probeJob.K}, MU=${probeJob.MU}, K_WELL=${probeJob.K_WELL}, REP=${probeJob.REP}`);
    
    ensureOutputDir();
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const startTime = Date.now();
    
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 800, height: 600 });
        
        // Build URL
        const params = new URLSearchParams({
            J: probeJob.J.toString(),
            K: probeJob.K.toString(),
            MU: probeJob.MU.toString(),
            K_WELL: probeJob.K_WELL.toString(),
            REP: probeJob.REP.toString(),
            N: FIXED_N.toString()
        });
        const url = `${BASE_URL}?${params.toString()}`;
        
        await page.goto(url, { waitUntil: 'networkidle0' });
        await page.waitForSelector('#canvas');
        
        // Warmup
        console.log(`Warming up for ${WARMUP_TIME}ms...`);
        await page.waitForTimeout(WARMUP_TIME);
        
        // Prepare GIF encoder
        const filename = generateFilename(probeJob);
        const filepath = path.join(OUTPUT_DIR, filename);
        
        // Collect all frames first
        const frames = [];
        console.log(`Capturing ${TOTAL_FRAMES} frames...`);
        
        for (let i = 0; i < TOTAL_FRAMES; i++) {
            // Capture canvas as image
            const imageData = await page.evaluate(() => {
                const canvas = document.getElementById('canvas');
                return canvas.toDataURL('image/png');
            });
            
            // Convert data URL to buffer
            const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Load image using Jimp
            const image = await Jimp.read(buffer);
            
            // Convert to RGB array (omggif needs RGB, not RGBA)
            const rgbData = new Uint8Array(800 * 600 * 3);
            let idx = 0;
            image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, imgIdx) {
                rgbData[idx++] = this.bitmap.data[imgIdx];     // R
                rgbData[idx++] = this.bitmap.data[imgIdx + 1]; // G
                rgbData[idx++] = this.bitmap.data[imgIdx + 2]; // B
                // Skip alpha channel
            });
            
            frames.push(rgbData);
            
            // Wait for next frame
            await page.waitForTimeout(FRAME_INTERVAL);
            
            if ((i + 1) % 30 === 0) {
                process.stdout.write(`  Progress: ${i + 1}/${TOTAL_FRAMES} frames\r`);
            }
        }
        
        // Encode all frames to GIF using omggif with palette generation
        console.log(`\n  Encoding GIF...`);
        
        // Generate palette from first frame using quantize
        const firstFrameRgb = frames[0];
        const colorMap = [];
        // Sample colors (use every Nth pixel to speed up quantization)
        const sampleRate = 10; // Sample every 10th pixel
        for (let i = 0; i < firstFrameRgb.length; i += 3 * sampleRate) {
            colorMap.push([firstFrameRgb[i], firstFrameRgb[i + 1], firstFrameRgb[i + 2]]);
        }
        const cmap = quantize(colorMap, 256);
        
        // Get palette directly from color map
        const paletteArray = cmap.palette();
        const palette = [];
        for (let i = 0; i < paletteArray.length; i++) {
            const r = paletteArray[i][0];
            const g = paletteArray[i][1];
            const b = paletteArray[i][2];
            // Convert to 24-bit RGB integer (omggif expects this format)
            palette.push((r << 16) | (g << 8) | b);
        }
        
        // omggif requires palette size to be a power of 2 (2, 4, 8, 16, 32, 64, 128, 256)
        // Calculate the next power of 2 that fits the palette
        let targetSize = 2;
        if (palette.length > 0) {
            const log2 = Math.ceil(Math.log2(Math.max(2, palette.length)));
            targetSize = Math.min(256, Math.pow(2, log2));
        }
        
        // Fill palette to target size
        while (palette.length < targetSize) {
            palette.push(0x000000); // Black
        }
        
        // Ensure it's exactly a power of 2
        if (palette.length !== targetSize) {
            palette.length = targetSize;
        }
        
        console.log(`  Generated palette with ${palette.length} colors (power of 2: ${Math.log2(palette.length)})`);
        
        // Create GIF with global palette
        const gifBuffer = Buffer.alloc(800 * 600 * frames.length * 3 + 10000); // Extra space for headers
        const gif = new GifWriter(gifBuffer, 800, 600, { 
            loop: 0,
            palette: palette
        });
        
        // Convert RGB frames to indexed color frames
        for (let i = 0; i < frames.length; i++) {
            const rgbData = frames[i];
            const indexedPixels = new Uint8Array(800 * 600);
            
            for (let j = 0; j < 800 * 600; j++) {
                const r = rgbData[j * 3];
                const g = rgbData[j * 3 + 1];
                const b = rgbData[j * 3 + 2];
                
                // Find closest color in palette
                let minDist = Infinity;
                let bestIdx = 0;
                for (let k = 0; k < palette.length; k++) {
                    const rgb = palette[k];
                    const pr = (rgb >> 16) & 0xff;
                    const pg = (rgb >> 8) & 0xff;
                    const pb = rgb & 0xff;
                    const dist = Math.pow(r - pr, 2) + Math.pow(g - pg, 2) + Math.pow(b - pb, 2);
                    if (dist < minDist) {
                        minDist = dist;
                        bestIdx = k;
                    }
                }
                indexedPixels[j] = bestIdx;
            }
            
            gif.addFrame(0, 0, 800, 600, indexedPixels, { delay: GIF_DELAY });
        }
        
        // Write the GIF file
        const finalBuffer = gifBuffer.slice(0, gif.end());
        fs.writeFileSync(filepath, finalBuffer);
        
        await page.close();
    } finally {
        await browser.close();
    }
    
    const duration = Date.now() - startTime;
    const filename = generateFilename(probeJob);
    console.log(`\n✓ Probe completed in ${formatDuration(duration)}`);
    console.log(`✓ Saved probe GIF: ${filename}`);
    
    return duration;
}

/**
 * Main estimation function
 */
async function estimate() {
    console.log('='.repeat(60));
    console.log('Swarmalator Batch Estimator');
    console.log('='.repeat(60));
    
    // Generate job manifest
    const jobs = generateJobManifest();
    const totalJobs = jobs.length;
    
    // Display parameter arrays
    console.log('\nParameter Arrays:');
    console.log(`  J: [${J_VALUES.join(', ')}] (${J_VALUES.length} values)`);
    console.log(`  K: [${K_VALUES.join(', ')}] (${K_VALUES.length} values)`);
    console.log(`  MU: [${MU_VALUES.join(', ')}] (${MU_VALUES.length} values)`);
    console.log(`  K_WELL: [${K_WELL_VALUES.join(', ')}] (${K_WELL_VALUES.length} values)`);
    console.log(`  REP: [${REP_VALUES.join(', ')}] (${REP_VALUES.length} values)`);
    
    console.log(`\nTotal Simulation Count: ${totalJobs.toLocaleString()}`);
    console.log(`  = ${J_VALUES.length} × ${K_VALUES.length} × ${MU_VALUES.length} × ${K_WELL_VALUES.length} × ${REP_VALUES.length}`);
    
    // Run probe
    const probeTime = await runProbe();
    
    // Calculate estimate
    const totalTimeMs = probeTime * totalJobs;
    const totalTimeSeconds = totalTimeMs / 1000;
    const totalTimeMinutes = totalTimeSeconds / 60;
    const totalTimeHours = totalTimeMinutes / 60;
    const totalTimeDays = totalTimeHours / 24;
    
    console.log('\n' + '='.repeat(60));
    console.log('Time Estimate');
    console.log('='.repeat(60));
    console.log(`Probe Duration: ${formatDuration(probeTime)}`);
    console.log(`Total Estimated Time: ${formatDuration(totalTimeMs)}`);
    console.log(`  (${totalTimeDays.toFixed(2)} days)`);
    console.log(`  (${totalTimeHours.toFixed(2)} hours)`);
    console.log(`  (${totalTimeMinutes.toFixed(2)} minutes)`);
    console.log(`  (${totalTimeSeconds.toFixed(0)} seconds)`);
    
    console.log('\n' + '='.repeat(60));
    console.log('Ready to proceed with batch_runner.js');
    console.log('='.repeat(60));
}

// Run estimation
estimate().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
