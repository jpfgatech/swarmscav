# Task 1: Reference Data Generation (JS Side)

**Objective:** Create a deterministic "Truth" dataset (`trace.json`) from the existing JavaScript engine.

**Critical Requirements:**
1.  **Fixed Time Step:** Force `dt=0.05 * TIME_SCALE = 2.5` (Ignore `performance.now`).
2.  **Seeded Randomness:** Replace `Math.random()` with the LCG provided below.

**Simulation Logic Specs (The "Patch"):**
You must verify the JS engine follows this exact logic during the trace generation:

* **1. Initialization Sequence:**
    1.  Generate random positions in `[0, width] × [0, height]`.
    2.  Calculate Mean Position $(\bar{x}, \bar{y})$.
    3.  **Re-Center:** Shift all agents so the mean becomes `(width/2, height/2)`.
    4.  Generate random phases in $[0, 2\pi]$.
    5.  Set all Omegas to `BASE_OMEGA` (0.1).

* **2. Distance Calculation:**
    When calculating distances ($dx, dy$) for forces, use **direct (unwrapped) distances**:
    ```javascript
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distanceSquared = dx * dx + dy * dy;
    ```
    **Note:** This matches `main.js` behavior. Positions wrap at boundaries (in `Agent.update()`), but force calculations use straight-line distances, not toroidal shortest paths.

* **3. Update Order (Per Frame):**
    1.  Reset Accelerations to 0.
    2.  Calculate & Apply Forces (Repulsion -> J-Coupling -> K-Coupling).
    3.  **Apply Actions:** Check inputs (Action 1/2/3) and zero out velocities for affected agents *immediately* after force calc.
    4.  **Integration:** Update Positions (`pos += vel * dt`) and Phases.

**Step-by-Step Implementation:**

1.  **Implement LCG:**
    ```javascript
    let seed = 12345;
    function seededRandom() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    }
    ```

2.  **Execute Run (200 Frames):**
    * **Parameters:** `N=100`, `J=8.0`, `K=-4.0`, `TIME_SCALE=50.0`, `REPULSION=4000.0`, `EPSILON=4.0`, `dt=0.05`.
    * **Input Sequence:**
        * Frame 0-50: Action 0.
        * Frame 51-100: Action 1 (Hold Hero).
        * Frame 101-150: Action 2 (Hold Targets).
        * Frame 151-200: Action 3 (Hold Both).

3.  **Export `trace.json`:**
    ```json
    [
      {
        "frame": 0,
        "hero_pos": [x, y],
        "agents_pos": [[x,y], ...],
        "agents_phase": [p0, p1, ...]
      },
      ...
    ]
    ```
