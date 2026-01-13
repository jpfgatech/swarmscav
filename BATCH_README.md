# Batch Automation for Swarmalator Parameter Sweep

This system provides two scripts for exploring the Swarmalator parameter space:

1. **`estimate_batch.js`** - Pre-flight estimator (calculates total jobs and time estimate)
2. **`batch_runner.js`** - Full batch processor (executes all simulations)

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

### Step 1: Estimate Batch Size and Time

Before running the full batch, estimate the total time:

```bash
npm run estimate
```

This will:
- Calculate the total number of simulations (6,075 combinations)
- Run a probe simulation to measure execution time
- **Save the probe GIF** to the output directory
- Estimate total batch duration

### Step 2: Run the Batch

**Option A: Full Parameter Sweep**
Run all 6,075 combinations:

```bash
npm run batch
```

**Option B: Random Subset**
Run a specified number of randomly selected combinations:

```bash
npm run batch -- --count=100
# or
npm run batch -- -n=100
# or simply
npm run batch 100
```

This is useful for:
- Quick exploration of parameter space
- Testing before running the full batch
- Sampling representative combinations

## Parameter Space

The system sweeps through **5 dimensions**:

### High-Density Axes (J & K)
- **15 values each**: `[-2.0, -1.5, -1.0, -0.8, -0.6, -0.4, -0.2, 0.0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.5, 2.0]`
- **Total combinations**: 15 × 15 = 225 for J/K alone

### Secondary Axes
- **MU** (Damping): `[0.90, 0.95, 0.99]` (3 values)
- **K_WELL** (Well Stiffness): `[0.001, 0.002, 0.005]` (3 values)
- **REP** (Repulsion): `[0.5, 1.0, 2.0]` (3 values)

### Fixed Constants
- `N = 500` (Agent count)
- `TIME_SCALE = 20.0` (Simulation speed)

### Total Simulations
**6,075 combinations** = 15 × 15 × 3 × 3 × 3

## Output

### File Naming Convention
Format: `swarms_J[val]_K[val]_M[val]_W[val]_R[val].gif`

Examples:
- `swarms_J1p0_K-0p8_M0p95_W0p002_R1p0.gif`
- `swarms_J0p0_K0p0_M0p99_W0p005_R2p0.gif`

Where:
- `J`, `K` = Spatial and phase coupling
- `M` = MU (damping)
- `W` = K_WELL (well stiffness)
- `R` = REP (repulsion)

### Output Directory
All GIFs are saved to `./output/`

### Error Logging
Failed simulations are logged to `error_log.txt` with timestamps and error details.

## Features

### Reliability
- **Browser Recycling**: Automatically recycles browser context every 50 runs to prevent memory leaks
- **Error Handling**: Continues processing even if individual simulations fail
- **Resume Capability**: Skips files that already exist (useful for resuming interrupted batches)
- **Progress Tracking**: Shows progress every 10 simulations

### Performance
- **Parallel GIF Encoding**: Uses 2 workers for GIF encoding
- **Efficient Frame Capture**: Captures 150 frames (5 seconds @ 30 FPS) per simulation
- **Warmup Period**: 2-second warmup before capture to let simulation stabilize

## Configuration

Edit the parameter arrays in both `estimate_batch.js` and `batch_runner.js` to modify the search space:

```javascript
const J_VALUES = [-2.0, -1.5, -1.0, ...];
const K_VALUES = [-2.0, -1.5, -1.0, ...];
const MU_VALUES = [0.90, 0.95, 0.99];
const K_WELL_VALUES = [0.001, 0.002, 0.005];
const REP_VALUES = [0.5, 1.0, 2.0];
```

**Important**: Both scripts must use the same parameter arrays!

## Tips

1. **Run estimate first**: Always run `npm run estimate` to understand the scale before starting the full batch
2. **Monitor progress**: The batch can take days to complete - monitor the output directory
3. **Resume capability**: If interrupted, simply rerun - existing files will be skipped
4. **Check error log**: Review `error_log.txt` for any failed simulations
5. **Disk space**: Ensure sufficient disk space (each GIF is ~1-5 MB, so ~6-30 GB total)
