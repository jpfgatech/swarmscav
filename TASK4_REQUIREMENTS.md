# Task 4: Gym Wrapper - Requirements & JS Code Mapping

## Objective
Wrap the `SwarmCore` in a standard `gymnasium.Env` interface so it can be used with RL libraries like Stable Baselines 3.

---

## Requirements Breakdown

### 1. Create `env.py`
**File:** `python/swarmalator_rl/env.py`  
**Class:** `SwarmEnv(gymnasium.Env)`  
**Status:** ❌ Not implemented

---

### 2. Define Spaces

#### 2.1 Action Space
**Requirement:** `Discrete(4)`
- `0`: No-Op
- `1`: Hold Hero
- `2`: Hold Targets  
- `3`: Hold Both

**JS Code Reference:**
- ✅ **Defined in:** `scripts/generate_trace.js` lines 326-334 (`getActionForFrame()`)
- ✅ **Logic:** Actions 1, 2, 3 consume stamina. If `Stamina <= 0`, actions are ignored until recovery.
- ✅ **Stamina System:** `HeroLogic.js` lines 39-42, 98-106, 120-245
  - `maxStamina = 2.0` seconds
  - `currentStamina` tracks remaining stamina
  - `isExhausted` flag when stamina depleted
  - Recovery rate: `1.0` per second when not exhausted

**Status:** ✅ Logic exists in JS, needs Python implementation

---

#### 2.2 Observation Space
**Requirement:** `Box(low=-inf, high=inf, shape=(87,), dtype=np.float32)`

**Breakdown:**
1. **Hero State (3 floats):** `[StaminaPct, Hero_Vx, Hero_Vy]`
2. **Target State (4 floats):** `[Rel_X, Rel_Y, Rel_Vx, Rel_Vy]` (Nearest active target)
3. **Flow Field (80 floats):** 20 nearest neighbors × 4 values each
   - Format: `[Rel_X, Rel_Y, Rel_Vx, Rel_Vy]` per neighbor
   - Sort: Ascending by distance
   - Padding: `0.0` if < 20 neighbors
   - **Important:** Normalize all distances by `LOGICAL_WIDTH` (1000.0)

**Total:** 3 + 4 + 80 = 87 floats

**JS Code Reference:**

**Hero State:**
- ✅ **Stamina:** `HeroLogic.js` lines 40-42
  - `currentStamina` (0.0 to `maxStamina`)
  - `StaminaPct = currentStamina / maxStamina`
- ✅ **Hero Velocity:** `Agent.js` lines 17-18, 78-79
  - `agent.vx`, `agent.vy` (velocity = force in overdamped model)
  - Hero is at index 0: `swarm[0].vx`, `swarm[0].vy`

**Target State:**
- ✅ **Target Finding:** `HeroLogic.js` lines 58-68, 674-754
  - Targets are agents at indices 1-10 (if N >= 11)
  - `targets` array: `[{index, active}, ...]`
  - `getActiveTargetCount()` returns active target count
  - **Nearest Target:** Need to find closest active target to hero
  - **Toroidal Distance:** `HeroLogic.js` lines 697-709 (uses toroidal wrapping)
  - **Capture Radius:** `COLLISION_DISTANCE = HERO_RADIUS + TARGET_RADIUS = 6 + 6 = 12` pixels
    - Defined in `HeroLogic.js` line 682

**Flow Field (Neighbors):**
- ❌ **Not explicitly implemented in JS** (no neighbor finding logic)
- Need to implement: Calculate distance from Hero to all agents, sort by distance, take top 20
- **Distance Calculation:** Should use toroidal wrapping (like `HeroLogic.js` lines 697-709)

**Status:** 
- ✅ Hero state: Fully defined in JS
- ✅ Target state: Logic exists, need nearest target finding
- ❌ Flow field: Not in JS, needs implementation

---

### 3. Implement `_get_obs()`

**Requirement:** Construct the 87-float observation vector

**JS Code Reference:**

**Hero State:**
```javascript
// HeroLogic.js
const staminaPct = this.currentStamina / this.maxStamina;  // [0, 1]
const heroVx = swarm[0].vx;  // Velocity X
const heroVy = swarm[0].vy;  // Velocity Y
```

**Target State (Nearest Active Target):**
```javascript
// HeroLogic.js checkWinCondition() shows pattern:
// 1. Iterate through this.targets (indices 1-10)
// 2. Filter active targets: target.active === true
// 3. Calculate toroidal distance: (see lines 697-709)
let dx = targetAgent.x - hero.x;
let dy = targetAgent.y - hero.y;
if (Math.abs(dx) > canvasWidth / 2) dx = dx > 0 ? dx - canvasWidth : dx + canvasWidth;
if (Math.abs(dy) > canvasHeight / 2) dy = dy > 0 ? dy - canvasHeight : dy + canvasHeight;
const distance = Math.sqrt(dx * dx + dy * dy);
// 4. Find minimum distance
// 5. Return [dx/LOGICAL_WIDTH, dy/LOGICAL_WIDTH, targetVx, targetVy]
```

**Flow Field:**
- No JS implementation found
- Need to: Calculate distances from hero to all agents (excluding hero itself), sort, take top 20
- Use toroidal distance calculation

**Status:** Partially defined in JS, needs Python implementation

---

### 4. Implement `step(action)`

#### 4.1 Physics Step
**Requirement:** Call `core.step(action)`

**JS Code Reference:**
- ✅ **Physics Update:** `main.js` function `updatePhysics(deltaTime, realDeltaTime)` lines 250-352
- ✅ **Action Application:** `scripts/generate_trace.js` function `updatePhysics()` lines 174-260
  - Actions applied AFTER integration (matching JS behavior)
  - Action 1: Hold Hero (index 0)
  - Action 2: Hold Targets (indices 1-10)
  - Action 3: Hold Both

**Status:** ✅ Already implemented in `SwarmCore.step()`

---

#### 4.2 Reward Calculation
**Requirement:** `(prev_dist - curr_dist) * 10.0 + (capture_bonus) + (time_penalty)`

**Components:**
1. **Dense Reward:** `(PrevDist - CurrDist) * 10.0`
   - `PrevDist`: Distance to nearest target at previous step
   - `CurrDist`: Distance to nearest target at current step
   - Positive when getting closer, negative when moving away

2. **Penalty:** `-0.01` per frame (Urgency)
   - Constant small negative reward to encourage speed

3. **Capture Bonus:** `+10.0`
   - When hero captures a target (distance < capture radius)

4. **Death Penalty:** `-10.0`
   - When hero collides with demon

**JS Code Reference:**

**Distance Calculation:**
- ✅ **Toroidal Distance:** `HeroLogic.js` lines 697-709
  - Uses toroidal wrapping for distance calculation
  - `COLLISION_DISTANCE = 12` pixels (HERO_RADIUS + TARGET_RADIUS)

**Capture Detection:**
- ✅ **Win Condition:** `HeroLogic.js` `checkWinCondition()` lines 674-754
  - Checks if `distance < COLLISION_DISTANCE` (12 pixels)
  - When captured: `target.active = false`
  - Also triggers "Corruption" mechanic (converts another target to demon)

**Death Detection:**
- ✅ **Demon Collision:** `HeroLogic.js` `checkDemonCollision()` lines 771-811
  - Checks collision with demons: `distance < COLLISION_DISTANCE` (12 pixels)
  - Returns `true` if collision detected

**Status:** 
- ✅ Capture/death detection logic exists in JS
- ❌ Reward calculation not in JS (game doesn't use RL rewards)
- Need to implement reward calculation in Python

---

#### 4.3 Termination Conditions
**Requirement:** Check Capture (Win) or Death (Loss)

**JS Code Reference:**
- ✅ **Win Condition:** `HeroLogic.js` `checkWinCondition()` lines 674-754
  - Returns `true` when `getActiveTargetCount() === 0` (all targets collected)
  - Called in `main.js` line 307
  - Sets `window.GAME_STATE = 'STAGE_CLEARED'` or `'WON'`

- ✅ **Death Condition:** `HeroLogic.js` `checkDemonCollision()` lines 771-811
  - Returns `true` when hero collides with any demon
  - Called in `main.js` line 329
  - Sets `window.GAME_STATE = 'LOST'`

**Status:** ✅ Fully defined in JS

---

## Summary: What's Already in JS vs What Needs Implementation

### ✅ Already Defined in JS:
1. **Action Space Logic:** Action mapping (0-3), stamina system
2. **Hero State:** Stamina tracking, velocity access
3. **Target System:** Target indices (1-10), active flag, capture detection
4. **Demon System:** Demon collision detection
5. **Win/Loss Conditions:** `checkWinCondition()`, `checkDemonCollision()`
6. **Toroidal Distance:** Used in collision detection (lines 697-709, 790-800)
7. **Collision Radius:** `COLLISION_DISTANCE = 12` pixels (6 + 6)

### ❌ Needs Implementation:
1. **Observation Construction:** `_get_obs()` method
2. **Nearest Target Finding:** Find closest active target to hero
3. **Flow Field Calculation:** Find 20 nearest neighbors, sort by distance
4. **Reward Calculation:** Dense reward, penalty, capture bonus, death penalty
5. **Distance Tracking:** Track previous distance for dense reward
6. **Gymnasium Interface:** `reset()`, `step()`, `render()`, spaces definition

---

## Key Constants from JS Code

**From `HeroLogic.js`:**
- `HERO_RADIUS = 6` pixels
- `TARGET_RADIUS = 6` pixels  
- `DEMON_RADIUS = 6` pixels
- `COLLISION_DISTANCE = 12` pixels (HERO_RADIUS + TARGET_RADIUS)
- `maxStamina = 2.0` seconds
- Hero index: `0`
- Target indices: `1-10` (if N >= 11)
- Demon indices: Dynamic (stored in `activeDemons` array)

**From `Config.js` / `main.js`:**
- `LOGICAL_WIDTH = 1000` pixels
- `LOGICAL_HEIGHT = 1000` pixels
- Normalization factor: `LOGICAL_WIDTH` (1000.0) for distances

---

## Implementation Notes

1. **Stamina System:** Must track `currentStamina` and `maxStamina` in Python env
2. **Target Management:** Track which targets are active (start with all 10 active)
3. **Demon Management:** Track active demons (initially empty, created when target captured)
4. **Toroidal Distance:** Use same wrapping logic as `HeroLogic.js` lines 697-709
5. **Observation Normalization:** All distances divided by `LOGICAL_WIDTH` (1000.0)
6. **Reward Tracking:** Need to store previous distance to nearest target for dense reward
