/**
 * Batch Runner for Swarmalator Parameter Sweep
 * 
 * Executes high-density 5-dimensional parameter sweep and generates GIFs
 * for each combination using Puppeteer.
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
const ERROR_LOG = path.join(__dirname, 'error_log.txt');
const CAPTURE_DURATION = 5000; // 5 seconds (for batch mode)
const SINGLE_SIM_DURATION = 30000; // 30 seconds (for single simulation mode)
const FRAME_RATE = 30;
const FRAME_INTERVAL = 1000 / FRAME_RATE;
const TOTAL_FRAMES = Math.floor((CAPTURE_DURATION / 1000) * FRAME_RATE);
const SINGLE_SIM_FRAMES = Math.floor((SINGLE_SIM_DURATION / 1000) * FRAME_RATE);
const WARMUP_TIME = 10000; // 10 seconds warmup (skip first 10 seconds) - for batch mode only
// GIF delay in centiseconds (hundredths of a second) - omggif expects this format
const GIF_DELAY = Math.round(FRAME_INTERVAL / 10); // Convert ms to centiseconds
// Canvas dimensions (must match main.js)
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const BROWSER_RECYCLE_INTERVAL = 50; // Recycle browser every N runs

// Fixed constants
const FIXED_N = 500;
const FIXED_TIME_SCALE = 20.0;

// Parameter arrays (2 dimensions: J and K only)
// Generate values from -2.0 to 2.0 with 0.2 step (21 values each)
const J_VALUES = [];
const K_VALUES = [];
for (let i = -2.0; i <= 2.0; i += 0.2) {
    J_VALUES.push(Math.round(i * 10) / 10); // Round to avoid floating point errors
    K_VALUES.push(Math.round(i * 10) / 10);
}

/**
 * Generate Cartesian product of J and K parameter arrays
 */
function generateJobManifest() {
    const jobs = [];
    
    for (const J of J_VALUES) {
        for (const K of K_VALUES) {
            jobs.push({ J, K });
        }
    }
    
    return jobs;
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Get random subset of jobs
 */
function getRandomJobs(jobs, count) {
    if (count >= jobs.length) {
        return jobs;
    }
    const shuffled = shuffleArray(jobs);
    return shuffled.slice(0, count);
}

/**
 * Format float for filename (2-3 decimal places)
 */
function formatParam(value) {
    // Round to 3 decimal places and remove trailing zeros
    const rounded = Math.round(value * 1000) / 1000;
    return rounded.toString().replace(/\.?0+$/, '');
}

/**
 * Generate filename for a parameter combination
 * Format: swarms_J[val]_K[val].gif
 */
function generateFilename(job) {
    const jStr = formatParam(job.J).replace(/\./g, 'p').replace(/-/g, 'm');
    const kStr = formatParam(job.K).replace(/\./g, 'p').replace(/-/g, 'm');
    
    return `swarms_J${jStr}_K${kStr}.gif`;
}

/**
 * Log error to file
 */
function logError(job, error) {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] J=${job.J}, K=${job.K}\n`;
    const errorMsg = `  Error: ${error.message}\n  Stack: ${error.stack}\n\n`;
    
    fs.appendFileSync(ERROR_LOG, message + errorMsg);
}

/**
 * Creates output directory if it doesn't exist
 */
function ensureOutputDir() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        console.log(`Created output directory: ${OUTPUT_DIR}`);
    }
}

/**
 * Captures frames from the simulation and encodes them into a GIF
 * @param {Object} page - Puppeteer page object
 * @param {Object} job - Job parameters {J, K}
 * @param {boolean} isSingleSim - If true, capture 30s from start; if false, 5s after 10s warmup
 */
async function captureSimulation(page, job, isSingleSim = false) {
    // Build URL with J and K parameters only
    const params = new URLSearchParams({
        J: job.J.toString(),
        K: job.K.toString(),
        N: FIXED_N.toString()
    });
    const url = `${BASE_URL}?${params.toString()}`;
    
    // Navigate to simulation
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('#canvas', { timeout: 10000 });
    
    // For single simulation mode: start from beginning (no warmup)
    // For batch mode: warmup period to skip initial transient
    if (!isSingleSim) {
        await page.waitForTimeout(WARMUP_TIME);
    }
    
    // Prepare GIF encoder
    const filename = generateFilename(job);
    const filepath = path.join(OUTPUT_DIR, filename);
    
    // Check if file already exists (resume capability)
    if (fs.existsSync(filepath)) {
        console.log(`  ⏭ Skipping (already exists): ${filename}`);
        return { success: true, filepath, skipped: true };
    }
    
    // Determine frame count based on mode
    const frameCount = isSingleSim ? SINGLE_SIM_FRAMES : TOTAL_FRAMES;
    
    if (isSingleSim) {
        console.log(`  Capturing ${frameCount} frames (${SINGLE_SIM_DURATION}ms from start)`);
    }
    
    // Collect all frames first
    const frames = [];
    const progressInterval = Math.max(1, Math.floor(frameCount / 10)); // Log every 10%
    
    for (let i = 0; i < frameCount; i++) {
        // Log progress for long captures
        if (frameCount > 100 && (i % progressInterval === 0 || i === frameCount - 1)) {
            const percent = Math.round((i + 1) / frameCount * 100);
            process.stdout.write(`\r  Progress: ${i + 1}/${frameCount} frames (${percent}%)`);
        }
        
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
        const rgbData = new Uint8Array(CANVAS_WIDTH * CANVAS_HEIGHT * 3);
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
    }
    
    if (frameCount > 100) {
        process.stdout.write('\n'); // New line after progress
    }
    
    console.log(`  Collected ${frames.length} frames, encoding GIF...`);
    
    // Encode all frames to GIF using omggif with palette generation
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
    
    // Create GIF with global palette
    const gifBuffer = Buffer.alloc(CANVAS_WIDTH * CANVAS_HEIGHT * frames.length * 3 + 10000); // Extra space for headers
    const gif = new GifWriter(gifBuffer, CANVAS_WIDTH, CANVAS_HEIGHT, { 
        loop: 0,
        palette: palette
    });
    
    // Convert RGB frames to indexed color frames
    for (let i = 0; i < frames.length; i++) {
        const rgbData = frames[i];
        const indexedPixels = new Uint8Array(CANVAS_WIDTH * CANVAS_HEIGHT);
        
        for (let j = 0; j < CANVAS_WIDTH * CANVAS_HEIGHT; j++) {
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
        
        gif.addFrame(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, indexedPixels, { delay: GIF_DELAY });
    }
    
    // Write the GIF file
    const finalBuffer = gifBuffer.slice(0, gif.end());
    fs.writeFileSync(filepath, finalBuffer);
    
    return { success: true, filepath, skipped: false };
}

/**
 * Main batch processing function
 */
async function runBatch() {
    // Parse command line arguments
    const args = process.argv.slice(2);
    let randomCount = null;
    let specificJ = null;
    let specificK = null;
    
    // Parse command-line arguments
    // Note: npm strips arguments starting with '-', so use: npm run batch -- 2.0 -1.0
    // Or use flags: npm run batch -- --j=2.0 --k=-1.0
    if (args.length > 0) {
        // Check for --j and --k flags first
        const jArg = args.find(arg => arg.startsWith('--j=') || arg.startsWith('-j='));
        const kArg = args.find(arg => arg.startsWith('--k=') || arg.startsWith('-k='));
        
        if (jArg || kArg) {
            // Using flag syntax
            if (jArg) {
                specificJ = parseFloat(jArg.split('=')[1]);
                if (isNaN(specificJ)) {
                    console.error('Error: --j must be a valid number');
                    process.exit(1);
                }
            }
            
            if (kArg) {
                specificK = parseFloat(kArg.split('=')[1]);
                if (isNaN(specificK)) {
                    console.error('Error: --k must be a valid number');
                    process.exit(1);
                }
            }
            
            if ((jArg && !kArg) || (!jArg && kArg)) {
                console.error('Error: Both --j and --k must be specified together');
                process.exit(1);
            }
        } else if (args.length >= 2) {
            // Try parsing as two numbers (J and K)
            const jVal = parseFloat(args[0]);
            const kVal = parseFloat(args[1]);
            
            // Check if both are valid numbers (including negative)
            // If first arg is a float (has decimal) OR second arg exists and is a number, treat as J/K
            const firstIsFloat = args[0].includes('.') || isNaN(parseInt(args[0], 10));
            const secondIsNumber = !isNaN(kVal);
            
            if (firstIsFloat && secondIsNumber) {
                specificJ = jVal;
                specificK = kVal;
            } else {
                // Fall back to random count if first arg is an integer
                const countArg = args.find(arg => arg.startsWith('--count=') || arg.startsWith('-n='));
                if (countArg) {
                    randomCount = parseInt(countArg.split('=')[1], 10);
                    if (isNaN(randomCount) || randomCount < 1) {
                        console.error('Error: --count must be a positive integer');
                        process.exit(1);
                    }
                } else if (!isNaN(parseInt(args[0], 10)) && isNaN(parseFloat(args[0]))) {
                    // Only if it's a pure integer (not a float)
                    randomCount = parseInt(args[0], 10);
                }
            }
        } else if (args.length === 1) {
            // Single argument - check if it's a float (J value) or integer (count)
            const val = parseFloat(args[0]);
            const intVal = parseInt(args[0], 10);
            
            if (!isNaN(val) && args[0].includes('.')) {
                // It's a float - could be J, but we need K too
                // This likely means npm stripped the second argument (negative number)
                console.error('\n⚠️  Error: Both J and K must be specified.');
                console.error('⚠️  npm strips arguments starting with "-", so use "--" to pass them through:');
                console.error('   npm run batch -- 2.0 -1.0');
                console.error('   OR: npm run batch -- --j=2.0 --k=-1.0\n');
                process.exit(1);
            } else if (!isNaN(intVal) && val === intVal) {
                // It's a pure integer - treat as count
                randomCount = intVal;
            }
        }
    }
    
    console.log('='.repeat(60));
    console.log('Swarmalator Batch Runner');
    console.log('='.repeat(60));
    
    // Generate job manifest
    let jobs = [];
    const isSingleSim = specificJ !== null && specificK !== null;
    
    if (isSingleSim) {
        // Single job with specified J and K
        jobs = [{ J: specificJ, K: specificK }];
        console.log(`\nSingle Simulation Mode: J=${specificJ}, K=${specificK}`);
        console.log(`  Duration: ${SINGLE_SIM_DURATION}ms (${SINGLE_SIM_FRAMES} frames @ ${FRAME_RATE} FPS) - from start`);
        console.log(`  isSingleSim flag: ${isSingleSim}`);
    } else {
        // Generate full job manifest
        jobs = generateJobManifest();
        const totalPossibleJobs = jobs.length;
        
        // Apply random selection if requested
        if (randomCount !== null) {
            console.log(`\nRandom Selection Mode: ${randomCount} simulations`);
            jobs = getRandomJobs(jobs, randomCount);
            console.log(`Selected ${jobs.length} random combinations from ${totalPossibleJobs} total`);
        }
    }
    
    const totalJobs = jobs.length;
    
    if (specificJ !== null && specificK !== null) {
        console.log(`Running single simulation with specified parameters`);
    } else if (randomCount === null) {
        console.log(`Total Simulations: ${totalJobs.toLocaleString()}`);
        console.log(`  J: ${J_VALUES.length} values (${J_VALUES[0]} to ${J_VALUES[J_VALUES.length - 1]})`);
        console.log(`  K: ${K_VALUES.length} values (${K_VALUES[0]} to ${K_VALUES[K_VALUES.length - 1]})`);
        console.log(`  = ${J_VALUES.length} × ${K_VALUES.length}`);
    } else {
        console.log(`Running ${totalJobs} randomly selected simulations`);
        const totalPossibleJobs = generateJobManifest().length;
        console.log(`(from ${totalPossibleJobs.toLocaleString()} total possible combinations)`);
    }
    console.log(`Output Directory: ${OUTPUT_DIR}`);
    console.log(`Capture Duration: ${CAPTURE_DURATION}ms (${TOTAL_FRAMES} frames @ ${FRAME_RATE} FPS)`);
    console.log(`Browser Recycle Interval: Every ${BROWSER_RECYCLE_INTERVAL} runs`);
    
    // Ensure output directory exists
    ensureOutputDir();
    
    // Clear error log
    if (fs.existsSync(ERROR_LOG)) {
        fs.writeFileSync(ERROR_LOG, `Batch Run Started: ${new Date().toISOString()}\n\n`);
    }
    
    const results = [];
    let browser = null;
    let page = null;
    let runCount = 0;
    
    try {
        for (let i = 0; i < jobs.length; i++) {
            const job = jobs[i];
            const progress = `[${i + 1}/${totalJobs}]`;
            
            // Recycle browser every N runs to prevent memory leaks
            if (runCount % BROWSER_RECYCLE_INTERVAL === 0) {
                if (browser) {
                    console.log(`\n🔄 Recycling browser (run ${runCount})...`);
                    await browser.close();
                }
                
                browser = await puppeteer.launch({
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
                page = await browser.newPage();
                await page.setViewport({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
            }
            
            console.log(`\n${progress} J=${job.J}, K=${job.K}`);
            
            try {
                const result = await captureSimulation(page, job, isSingleSim);
                results.push({ ...job, ...result });
                
                if (!result.skipped) {
                    console.log(`  ✓ Saved: ${path.basename(result.filepath)}`);
                }
            } catch (error) {
                console.error(`  ✗ Error: ${error.message}`);
                logError(job, error);
                results.push({ ...job, success: false, error: error.message });
            }
            
            runCount++;
            
            // Progress indicator every 10 jobs
            if ((i + 1) % 10 === 0) {
                const successful = results.filter(r => r.success && !r.skipped).length;
                const failed = results.filter(r => !r.success).length;
                const skipped = results.filter(r => r.skipped).length;
                console.log(`\n📊 Progress: ${successful} successful, ${failed} failed, ${skipped} skipped`);
            }
        }
        
        // Final summary
        console.log('\n' + '='.repeat(60));
        console.log('Batch Processing Complete');
        console.log('='.repeat(60));
        const successful = results.filter(r => r.success && !r.skipped).length;
        const failed = results.filter(r => !r.success).length;
        const skipped = results.filter(r => r.skipped).length;
        
        console.log(`Total: ${totalJobs} simulations`);
        console.log(`Successful: ${successful}`);
        console.log(`Failed: ${failed}`);
        console.log(`Skipped (already existed): ${skipped}`);
        
        if (failed > 0) {
            console.log(`\n⚠ Errors logged to: ${ERROR_LOG}`);
        }
        
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the batch
runBatch().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
