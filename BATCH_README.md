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

### Killed Simulations
Simulations that reach equilibrium are automatically terminated and logged to `output/killed_log.txt` with timestamp, parameters, time, and final energy. No GIF is generated for killed simulations.

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
- **Auto-Kill Optimization**: Automatically terminates static simulations to save time and disk space

## Configuration

### Parameter Sweep Configuration

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

### Batch Configuration File (`batch_config.json`)

The batch runner uses a JSON configuration file for energy monitoring and capture settings:

```json
{
  "energy": {
    "threshold_per_agent": 0.001,
    "consecutive_frames": 30
  },
  "capture": {
    "frame_rate": 30,
    "batch_duration_ms": 5000,
    "single_duration_ms": 30000,
    "warmup_ms": 10000
  },
  "browser": {
    "recycle_interval": 50
  }
}
```

#### Energy Monitor Settings

- **`threshold_per_agent`**: Average kinetic energy threshold per agent (default: `0.001`)
  - When average energy per agent falls below this value for `consecutive_frames` frames, the simulation is considered "dead" (reached equilibrium)
  - Lower values = more sensitive (kills earlier)
  - Higher values = less sensitive (allows more movement)
  - **Note**: This uses average energy per agent, so it's independent of population size (N)

- **`consecutive_frames`**: Number of consecutive frames below threshold required to trigger auto-kill (default: `30`)
  - At 30 FPS, this is 1 second of low energy
  - Higher values = more conservative (requires longer period of stability)
  - Lower values = more aggressive (kills faster)

#### Capture Settings

- **`frame_rate`**: Frame rate for GIF capture (default: `30`)
- **`batch_duration_ms`**: Duration to capture in batch mode (default: `5000` = 5 seconds)
- **`single_duration_ms`**: Duration to capture in single simulation mode (default: `30000` = 30 seconds)
- **`warmup_ms`**: Warmup period before capture in batch mode (default: `10000` = 10 seconds)

#### Browser Settings

- **`recycle_interval`**: Number of simulations before recycling browser (default: `50`)
  - Helps prevent memory leaks during long batch runs

### Auto-Kill Optimization

The batch runner automatically detects when simulations reach equilibrium (crystallized/dead) and terminates them early to save processing time and disk space.

- **Detection**: Based on average kinetic energy per agent
- **Action**: When equilibrium is detected, the simulation is killed and no GIF is generated
- **Logging**: Killed simulations are logged to `output/killed_log.txt` with timestamp, parameters, time, and final energy
- **Visualization**: In dev mode (`npm run dev`), an EKG-style energy graph is displayed at the bottom of the canvas showing energy decay over time

## Tips

1. **Test first**: Use single simulation mode to verify parameters before running full batch
2. **Monitor progress**: The batch can take hours to complete - monitor the output directory
3. **Resume capability**: If interrupted, simply rerun - existing files will be skipped
4. **Check error log**: Review `error_log.txt` for any failed simulations
5. **Check killed log**: Review `output/killed_log.txt` to see which simulations reached equilibrium
6. **Disk space**: Ensure sufficient disk space (each GIF is ~1-5 MB, so ~2-2.5 GB total for full batch)
7. **Adjust thresholds**: Modify `batch_config.json` to fine-tune auto-kill sensitivity based on your needs
