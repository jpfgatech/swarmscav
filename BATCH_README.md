# Batch Automation for Swarmalator Parameter Sweep

This system provides automated batch processing for exploring the Swarmalator parameter space.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the dev server (in one terminal):
```bash
npm run dev
```

The batch runner expects the simulation to be available at `http://localhost:5173` (Vite's default port).

## Usage

### Full Parameter Sweep

Run all combinations of J and K:

```bash
npm run batch
```

This will generate **441 GIFs** (21 × 21 combinations).

### Random Subset

Run a specified number of randomly selected combinations:

```bash
npm run batch 100
```

### Single Simulation

Test a specific parameter combination:

```bash
npm run batch -- 2.0 -1.0
```

**Note**: Use `--` to pass negative values through npm. The `--` tells npm to pass all subsequent arguments to the script.

Alternative syntax:
```bash
npm run batch -- --j=2.0 --k=-1.0
```

Single simulations capture **30 seconds from the start** (900 frames @ 30 FPS).

## Parameter Space

The system sweeps through **2 dimensions** (J and K):

### Parameter Ranges
- **J** (Spatial Coupling): `-2.0` to `2.0` in steps of `0.2` (21 values)
- **K** (Phase Coupling): `-2.0` to `2.0` in steps of `0.2` (21 values)

### Total Simulations
**441 combinations** = 21 × 21

### Fixed Constants
- `N = 500` (Agent count)
- `REPULSION_STRENGTH = 4000.0` (Repulsion force)
- `EPSILON = 4.0` (Soft core repulsion)
- `TIME_SCALE = 100.0` (Simulation speed)

## Output

### File Naming Convention
Format: `swarms_J[val]_K[val].gif`

Examples:
- `swarms_J2_Km1.gif` (J=2.0, K=-1.0)
- `swarms_J0p2_K1p2.gif` (J=0.2, K=1.2)

Where:
- `J` = Spatial coupling constant
- `K` = Phase coupling constant
- Decimal points are replaced with `p` (e.g., `0.2` → `0p2`)
- Negative signs are replaced with `m` (e.g., `-1.0` → `m1`)

### Output Directory
All GIFs are saved to `./output/`

### Batch Mode vs Single Mode
- **Batch mode**: 10s warmup + 5s capture (150 frames @ 30 FPS)
- **Single mode**: 30s capture from start (900 frames @ 30 FPS)

### Error Logging
Failed simulations are logged to `error_log.txt` with timestamps and error details.

## Features

### Reliability
- **Browser Recycling**: Automatically recycles browser context every 50 runs to prevent memory leaks
- **Error Handling**: Continues processing even if individual simulations fail
- **Resume Capability**: Skips files that already exist (useful for resuming interrupted batches)
- **Progress Tracking**: Shows progress during long captures

### Performance
- **Efficient Frame Capture**: Captures at 30 FPS (matches simulation frame rate)
- **Optimized Physics**: Distance calculations cached per pair for all three force interactions
- **Frame-Rate Synchronized**: Simulation runs at 30 FPS to match capture rate

## Configuration

Edit the parameter arrays in `batch_runner.js` to modify the search space:

```javascript
// Generate values from -2.0 to 2.0 with 0.2 step (21 values each)
const J_VALUES = [];
const K_VALUES = [];
for (let i = -2.0; i <= 2.0; i += 0.2) {
    J_VALUES.push(Math.round(i * 10) / 10);
    K_VALUES.push(Math.round(i * 10) / 10);
}
```

## Tips

1. **Test first**: Use single simulation mode to verify parameters before running full batch
2. **Monitor progress**: The batch can take hours to complete - monitor the output directory
3. **Resume capability**: If interrupted, simply rerun - existing files will be skipped
4. **Check error log**: Review `error_log.txt` for any failed simulations
5. **Disk space**: Ensure sufficient disk space (each GIF is ~1-5 MB, so ~2-2.5 GB total for full batch)
