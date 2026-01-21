# Boundary Wrapping Analysis: JavaScript vs Python

## The Issue

**JavaScript wrapping (Agent.js lines 93-96):**
```javascript
if (this.x < 0) this.x += canvasWidth;
if (this.x >= canvasWidth) this.x -= canvasWidth;
```

**Problem:** Only wraps **once**. If an agent moves more than one width in a single frame:
- `x = 2500`, `canvasWidth = 1000` → `2500 - 1000 = 1500` ❌ (still out of bounds!)
- `x = 1990`, `canvasWidth = 1000` → `1990 - 1000 = 990` ❌ (still out of bounds!)

**Python wrapping (core.py lines 263-264):**
```python
self.agents_pos[:, 0] = np.mod(self.agents_pos[:, 0], self.LOGICAL_WIDTH)
```

**Correct:** `np.mod` handles multiple wraps correctly:
- `np.mod(2500, 1000) = 500` ✅
- `np.mod(1990, 1000) = 990` ✅

## Impact Analysis

### When Does This Matter?

For an agent to move more than one width (1000 pixels) in a single frame:
- **Velocity needed:** `vx * dt > 1000`
- **With `dt = 0.05 * TIME_SCALE = 2.5` seconds:**
  - `vx > 1000 / 2.5 = 400` pixels/second
- **With `dt = 0.033` (30 FPS, unscaled):**
  - `vx > 1000 / 0.033 = 30,000` pixels/second (unlikely)

**Typical velocities:**
- Forces are normalized by `N=100`, so typical forces are ~0.01 to 1.0
- With overdamped dynamics: `v = F`, so velocities are ~0.01 to 1.0 pixels/second
- Even with `TIME_SCALE=50`, velocities are ~0.5 to 50 pixels/second

**Conclusion:** Moving >1000 pixels in one frame is **unlikely but possible** during:
- Initial transients (high forces)
- Action releases (sudden velocity changes)
- Numerical instabilities

### Error Pattern Evidence

From `task3_float_precision_analysis.md`:
- **Frame 250:** Error spikes to **1.34** (exponential, not precision-related)
- This suggests agents **are** crossing boundaries multiple times
- JavaScript positions become out-of-bounds
- Next frame's force calculations use wrong positions
- **Cascading error:** Exponential divergence

## Which Version Should We Adopt?

### Option 1: Fix JavaScript to Match Python (Recommended ✅)

**Pros:**
- Fixes the bug in the actual game
- Python already has correct implementation
- Prevents out-of-bounds positions
- Eliminates exponential error growth

**Cons:**
- Changes game behavior (but fixes a bug)
- Need to regenerate trace.json

**Implementation:**
```javascript
// Fix Agent.js lines 93-96
while (this.x < 0) this.x += canvasWidth;
while (this.x >= canvasWidth) this.x -= canvasWidth;
while (this.y < 0) this.y += canvasHeight;
while (this.y >= canvasHeight) this.y -= canvasHeight;
```

Or use modulo (handles negatives correctly):
```javascript
this.x = ((this.x % canvasWidth) + canvasWidth) % canvasWidth;
this.y = ((this.y % canvasHeight) + canvasHeight) % canvasHeight;
```

### Option 2: Fix Python to Match JavaScript (Not Recommended ❌)

**Pros:**
- Matches current game behavior exactly

**Cons:**
- Keeps the bug in both implementations
- Allows out-of-bounds positions
- Causes exponential error growth
- Python would need buggy wrapping logic

**Implementation:**
```python
# Buggy wrapping to match JS
mask_x_neg = self.agents_pos[:, 0] < 0
mask_x_pos = self.agents_pos[:, 0] >= self.LOGICAL_WIDTH
self.agents_pos[mask_x_neg, 0] += self.LOGICAL_WIDTH
self.agents_pos[mask_x_pos, 0] -= self.LOGICAL_WIDTH
# Same for y
```

## Recommendation

**✅ Adopt Option 1: Fix JavaScript**

**Reasoning:**
1. **JavaScript is the ground truth** - but it has a bug that should be fixed
2. **Python is correct** - no need to introduce bugs
3. **Error pattern confirms** - exponential growth at frame 250 suggests boundary issues
4. **Best practice** - proper toroidal wrapping prevents numerical issues

**Action Plan:**
1. Fix `Agent.js` wrapping to use `while` loops or modulo
2. Fix `scripts/generate_trace.js` wrapping (same issue)
3. Regenerate `trace.json` with fixed wrapping
4. Re-run parity test (should see dramatic error reduction)
5. Python implementation already correct, no changes needed

## Verification

After fixing JavaScript:
- **Expected errors:** Should drop from 1.34 to ~1e-3 to 1e-2 (float32 precision limits)
- **Error growth:** Should be linear/quadratic, not exponential
- **Frame 250:** Should not have error spike
