# Physics Engine Versions Analysis

## Overview
This document explains the different physics implementations and identifies which should be the ground truth.

## Versions Identified

### 1. **main.js** (Webpage Game - GROUND TRUTH)
**Purpose:** The actual game that players see and interact with in the browser  
**Location:** `main.js` lines 262-288  
**Toroidal Wrapping in Force Calculations:** ❌ **NO**

```javascript
// Lines 266-269: Direct distance calculation (NO wrapping)
const dxAttract = swarm[j].x - swarm[i].x;
const dyAttract = swarm[j].y - swarm[i].y;
const dxRepel = swarm[i].x - swarm[j].x;
const dyRepel = swarm[i].y - swarm[j].y;
const distanceSquared = dxAttract * dxAttract + dyAttract * dyAttract;
```

**Note:** Positions wrap at boundaries (in `Agent.update()`), but force calculations use unwrapped distances.

---

### 2. **scripts/generate_trace.js** (Trace Generation - CURRENTLY WRONG)
**Purpose:** Generates deterministic reference data for Python parity testing  
**Location:** `scripts/generate_trace.js` lines 109-124, 199-200  
**Toroidal Wrapping in Force Calculations:** ✅ **YES** (via `toroidalDistance()` function)

```javascript
// Uses toroidal wrapping
const { dx: dxAttract, dy: dyAttract, distance, distanceSquared } = 
    toroidalDistance(swarm[i].x, swarm[i].y, swarm[j].x, swarm[j].y, LOGICAL_WIDTH, LOGICAL_HEIGHT);
```

**Issue:** This doesn't match the webpage game behavior.

---

### 3. **python/swarmalator_rl/core.py** (Python Port - CURRENTLY WRONG)
**Purpose:** Python implementation for RL environment  
**Location:** `python/swarmalator_rl/core.py` lines 120-146, 172-178  
**Toroidal Wrapping in Force Calculations:** ✅ **YES** (vectorized)

```python
# Applies toroidal wrapping
dx = np.where(np.abs(dx) > self.LOGICAL_WIDTH / 2, ...)
dy = np.where(np.abs(dy) > self.LOGICAL_HEIGHT / 2, ...)
```

**Issue:** This doesn't match the webpage game behavior.

---

### 4. **task1.md** (Specification - MISLEADING)
**Purpose:** Documentation for Task 1 trace generation  
**Location:** `task1.md` lines 19-26  
**Toroidal Wrapping Specified:** ✅ **YES**

**Issue:** The spec says to use toroidal wrapping, but the actual webpage game doesn't use it.

---

## Ground Truth Decision

**GROUND TRUTH: `main.js` (the webpage game)**

**Reasoning:**
1. The webpage game (`main.js`) is what players actually experience
2. The RL environment should match the game players see
3. The trace generation should produce data that matches the webpage behavior
4. The Python port should match the webpage behavior

---

## Required Fixes

### Fix 1: `scripts/generate_trace.js`
**Action:** Remove toroidal wrapping from force calculations  
**Change:** Replace `toroidalDistance()` call with direct distance calculation (matching `main.js`)

### Fix 2: `python/swarmalator_rl/core.py`
**Action:** Remove toroidal wrapping from force calculations  
**Change:** Remove wrapping logic in `_calculate_forces()` method

### Fix 3: `task1.md`
**Action:** Update specification to match actual webpage behavior  
**Change:** Remove or clarify toroidal wrapping section

---

## Impact

**Current State:**
- Trace generation uses toroidal wrapping → produces different results than webpage
- Python port uses toroidal wrapping → produces different results than webpage
- Parity test fails because implementations don't match

**After Fix:**
- Trace generation matches webpage → correct reference data
- Python port matches webpage → correct RL environment
- Parity test should pass (within float32 precision)

---

## Note on Toroidal Boundaries

**Position Wrapping:** Still applies (agents wrap at boundaries)  
**Force Calculation:** Should NOT use toroidal wrapping (matches webpage)

This means:
- Agents can wrap around boundaries (position updates)
- But forces are calculated using straight-line distances (not shortest toroidal path)
