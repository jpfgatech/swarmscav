# Toroidal Distance Usage Confirmation

## Summary
**All three implementations correctly use direct (unwrapped) distances for force calculations.**

## JavaScript (main.js) - Ground Truth
**File:** `main.js` lines 266-269
```javascript
const dxAttract = swarm[j].x - swarm[i].x; // For attraction (agent1 -> agent2)
const dyAttract = swarm[j].y - swarm[i].y;
const dxRepel = swarm[i].x - swarm[j].x;   // For repulsion (agent1 <- agent2)
const dyRepel = swarm[i].y - swarm[j].y;
```
**Status:** ✅ **NO toroidal wrapping** - Uses direct distances

## JavaScript (generate_trace.js) - Trace Generator
**File:** `scripts/generate_trace.js` lines 202-205
```javascript
// NOTE: Match main.js behavior - NO toroidal wrapping in force calculations
// Positions wrap at boundaries, but forces use straight-line distances
const dxAttract = swarm[j].x - swarm[i].x; // For attraction (agent1 -> agent2)
const dyAttract = swarm[j].y - swarm[i].y;
const dxRepel = swarm[i].x - swarm[j].x;   // For repulsion (agent1 <- agent2)
const dyRepel = swarm[i].y - swarm[j].y;
```
**Status:** ✅ **NO toroidal wrapping** - Uses direct distances (matches main.js)

## Python (core.py) - Physics Engine
**File:** `python/swarmalator_rl/core.py` lines 169-170
```python
# NOTE: Match main.js behavior - NO toroidal wrapping in force calculations
# Positions wrap at boundaries (in step()), but forces use straight-line distances
dx = pos_expanded_j[..., 0] - pos_expanded_i[..., 0]  # Shape: (N, N)
dy = pos_expanded_j[..., 1] - pos_expanded_i[..., 1]  # Shape: (N, N)
```
**Status:** ✅ **NO toroidal wrapping** - Uses direct distances (matches main.js)

**Note:** The `_toroidal_distance()` method exists in `core.py` (lines 120-146) but is **NOT used** in `_calculate_forces()`. It's only used for observation calculations (nearest target, flow field).

## Boundary Wrapping (Positions Only)
All implementations wrap positions at boundaries **AFTER** integration:
- **main.js:** `agent.update(deltaTime, logicalWidth, logicalHeight)` → wraps in `Agent.js`
- **generate_trace.js:** `agent.update(deltaTime, LOGICAL_WIDTH, LOGICAL_HEIGHT)` → wraps in `Agent.update()`
- **core.py:** Lines 262-264:
  ```python
  self.agents_pos[:, 0] = np.mod(self.agents_pos[:, 0], self.LOGICAL_WIDTH)
  self.agents_pos[:, 1] = np.mod(self.agents_pos[:, 1], self.LOGICAL_HEIGHT)
  ```

## Conclusion
**All implementations are consistent:**
1. ✅ Force calculations use **direct (unwrapped) distances**
2. ✅ Position wrapping happens **after integration** (boundary conditions)
3. ✅ No toroidal wrapping in force calculations

## Error Pattern Analysis
If you're seeing errors that grow exponentially (e.g., 1.34 at frame 250), the issue is **NOT** toroidal distance in forces. Possible causes:
1. **Float32 vs Float64 precision** (expected: ~1e-3 to 1e-2 after 280 frames)
2. **Action application timing** (check if actions are applied at the same point in the update cycle)
3. **Numerical integration differences** (Euler step order, accumulation)
4. **Random number generation** (LCG vs NumPy RNG differences)
5. **Boundary wrapping implementation** (mod vs custom wrapping logic)

## Verification Steps
1. ✅ Force calculations: All use direct distances
2. ⚠️ Check action application: Verify both apply actions AFTER integration
3. ⚠️ Check boundary wrapping: Verify both use same wrapping logic
4. ⚠️ Check numerical precision: Float32 vs Float64 accumulation
