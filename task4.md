# Task 4: Gym Wrapper

**Objective:** Wrap `SwarmCore` in a standard `gymnasium.Env` interface.

**Constants & Configuration:**
* `HERO_RADIUS = 6` pixels (from HeroLogic.js line 680)
* `TARGET_RADIUS = 6` pixels (from HeroLogic.js line 681)
* `DEMON_RADIUS = 6` pixels (from HeroLogic.js line 778)
* `CAPTURE_RADIUS = 12.0` pixels (HERO_RADIUS + TARGET_RADIUS = 6 + 6, from HeroLogic.js line 682)
* `KILL_RADIUS = 12.0` pixels (HERO_RADIUS + DEMON_RADIUS = 6 + 6, from HeroLogic.js line 779)
* `STAMINA_MAX = 2.0` seconds (from HeroLogic.js line 40: maxStamina = 2.0)
* `STAMINA_RECOVERY_RATE = 1.0` per second (from HeroLogic.js line 243: currentStamina += deltaTime)
* `STAMINA_CONSUMPTION_RATE = 1.0` per second (from HeroLogic.js line 128: currentStamina -= deltaTime)
* `EPISODE_LENGTH = 1000` frames (RL design choice, not in JS game)

**Step-by-Step Implementation:**

1.  **Define Spaces (`env.py`):**
    * **Action:** `Discrete(4)`
    * **Observation:** `Box(-inf, inf, shape=(87,), float32)`
        * **Normalization Strategy:** Divide ALL spatial values (Relative X, Relative Y) and velocities (Vx, Vy) by `LOGICAL_WIDTH` (1000.0) before returning.

2.  **Implement `reset(seed=None)`:**
    * Handle `super().reset(seed=seed)`.
    * **Positions:** Randomly initialize agents in `[0, 1000] x [0, 1000]`. **Important:** Immediately Apply Center-of-Mass correction (Task 1 logic - subtract mean position, re-center to logical center).
    * **State:** 
        * Reset Stamina to `STAMINA_MAX` (2.0 seconds, from HeroLogic.js line 40).
        * Reset `active_targets` list: All 10 targets active (indices 1-10, from HeroLogic.js lines 58-68).
        * Reset `active_demons` list: Initially empty (demons created when target captured, from HeroLogic.js line 37).
        * Hero index: `0` (from HeroLogic.js line 19, main.js line 144).
    * Return `_get_obs()`.

3.  **Implement `step(action)`:**
    1.  **Pre-Calculation:** Store `prev_dist` (Distance from Hero to nearest Target).
    2.  **Physics Step:** Call `core.step(dt, action)`.
    3.  **Reward Logic (Order Matters):**
        * Calculate `curr_dist`.
        * `reward = (prev_dist - curr_dist) * 10.0` (Progress Reward).
        * `reward -= 0.01` (Time Penalty).
        * **Capture Check:** If `curr_dist < CAPTURE_RADIUS` (12.0 pixels):
            * `reward += 10.0`
            * Mark target as inactive (from HeroLogic.js line 714: `target.active = false`).
            * **Corruption Mechanic:** Convert another active target to demon (from HeroLogic.js lines 726-748).
            * `terminated = True` only if all targets collected (from HeroLogic.js line 753: `getActiveTargetCount() === 0`).
        * **Death Check:** If `dist_to_demon < KILL_RADIUS` (12.0 pixels):
            * `reward -= 10.0`
            * `terminated = True` (Loss, from HeroLogic.js line 806).
    4.  **Truncation:**
        * `truncated = (self.frame_count >= EPISODE_LENGTH)`.
    5.  **Return:** `obs, reward, terminated, truncated, info`.

4.  **Implement `_get_obs()`:**
    This is the critical "Sensor" logic (from rl.md lines 224-232).
    * **Hero State (3 floats):** `[StaminaPct, Hero_Vx, Hero_Vy]`
        * `StaminaPct = currentStamina / maxStamina` (0.0 to 1.0, from HeroLogic.js line 841)
        * `Hero_Vx = agents_vel[0, 0]` (normalized by LOGICAL_WIDTH)
        * `Hero_Vy = agents_vel[0, 1]` (normalized by LOGICAL_WIDTH)
    * **Target State (4 floats):** `[Rel_X, Rel_Y, Rel_Vx, Rel_Vy]` (Nearest active target)
        * Find nearest active target using toroidal distance (from HeroLogic.js lines 697-709)
        * Calculate relative position: `dx = target.x - hero.x`, `dy = target.y - hero.y`
        * Apply toroidal wrapping if `|dx| > width/2` or `|dy| > height/2`
        * Normalize: `Rel_X = dx / LOGICAL_WIDTH`, `Rel_Y = dy / LOGICAL_WIDTH`
        * Normalize velocities: `Rel_Vx = target.vx / LOGICAL_WIDTH`, `Rel_Vy = target.vy / LOGICAL_WIDTH`
        * If no active target: pad with `[0.0, 0.0, 0.0, 0.0]`
    * **Flow Field (80 floats):** 20 Nearest Neighbors to Hero
        * Calculate distance from Hero to all other agents (excluding hero itself)
        * Use toroidal distance calculation (same as target state)
        * Use `np.argsort` to find indices of closest 20 agents
        * For each neighbor: `[Rel_X, Rel_Y, Rel_Vx, Rel_Vy]` (all normalized by LOGICAL_WIDTH)
        * Format: `[dx_0, dy_0, vx_0, vy_0, ... dx_19, dy_19, vx_19, vy_19]`
        * Padding: If < 20 neighbors, pad remaining with `0.0`
    * **Normalization:** All distances (dx, dy) and velocities (vx, vy) divided by `LOGICAL_WIDTH` (1000.0)