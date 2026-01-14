# Swarmalator Refactor & Migration Roadmap

## Phase 0: Infrastructure & Safety
- [x] **Infra: Setup Test Runner**
    - *Goal*: Install `vitest` (fast, no config needed) or `jest`.
    - *Task*: Add a "test" script to `package.json`.
    - *Verify*: Create a dummy `sum.test.js` (1+1=2) and run `npm test`. It must pass.

## Phase 1: Logic Decoupling (The "Core")
- [x] **Refactor: Config Isolation**
    - *Goal*: Extract all constants ($N, J, K) into `src/core/Config.js`.
    - *Constraint*: Pure JS object export. No DOM.
    - *Verify*: Manual check that the current app still runs importing from this new file.

- [x] **Refactor: Simulation State**
    - *Goal*: Create `src/core/SimulationState.js`.
    - *Task*: Define a class that holds `Float32Array`s for positions and velocities.
    - *Constraint*: It must have methods `getAgent(i)` and `setAgent(i, data)`.
    - *Unit Test*: Create `tests/SimulationState.test.js`. Initialize it and assert that `getAgent(0)` returns the expected initial structure.

- [x] **Refactor: Physics Engine (Pure Logic)**
    - *Goal*: Create `src/core/PhysicsEngine.js`.
    - *Task*: Move the `update()` loop here. It accepts `SimulationState` and `Config` as arguments.
    - *Constraint*: **ZERO** references to `window`, `canvas`, or `context`. Strictly math only.
    - *Unit Test*: Create `tests/PhysicsEngine.test.js`.
        1. Mock a state with 2 agents close to each other.
        2. Run `engine.update()`.
        3. Assert that their positions have changed (velocity applied).

- [ ] **Feature: Interactive Parameter Panel (Web)**
    - *Goal*: Create a collapsible HTML overlay (`ParameterPanel.js`) to tune `Config` values in real-time.
    - *UI Requirements*:
        1.  **Coupling Controls (J & K)**:
            -   Range: `[-2, 2]` (Linear Slider).
            -   **Extreme Presets**: Add buttons next to sliders for `±4`, `±32`, `±1024`.
        2.  **Time Dynamics (Log Scale)**:
            -   `t_step`: Range `[1, 10000]` (Logarithmic mapping).
            -   `freq_base`: Range `[0.001, 10]` (Logarithmic mapping).
        3.  **Variance**:
            -   `freq_std`: Range `0%` to `200%` (Linear multiplier of `freq_base`).
        4.  **Visuals**:
            -   Toggle Switch: "Show Kinetic Energy Curve" (Show/Hide the bottom graph).
    - *Constraint*:
        -   Implement a helper function `mapLogScale(sliderVal, min, max)` to handle the non-linear inputs correctly.
        -   Sliders must update the global `Config` object immediately.
    - *Verify*:
        1.  Run `npm run dev`.
        2.  Drag `t_step` to max; verify simulation speeds up massively.
        3.  Click `J = 1024`; verify agents lock into position instantly (high force).
        4.  Toggle the Energy Curve; verify the canvas graph appears/disappears.- [ ] **Feature: Agent Selection & Proximity Pause (Game Mode)**
    - *Goal*: Allow mouse selection of 4 agents and pause when they become topological neighbors (Gabriel Graph condition).
    - *Logic*:
        1.  **Input**: Add `canvas.addEventListener('mousedown')`. Map $(x,y)$ to nearest agent. Toggle selection state. Limit to 4.
        2.  **Render**: Selected agents draw as `hsl(hue, 30%, 70%)` (Pale/Desaturated) with a white border.
        3.  **Monitor**: In `main.js` update loop:
            -   For every pair of selected agents $(i, j)$:
            -   Check if any *other* agent $k$ satisfies $|\mathbf{r}_k - \text{mid}(i,j)| < \frac{1}{2}|\mathbf{r}_i - \mathbf{r}_j|$.
            -   If NO agent $k$ is found (The Gabriel Condition), set `SIMULATION_PAUSED = true`.
    - *Constraint*: Keep this logic in a separate module `AnalysisMode.js` to avoid cluttering the Physics Engine.
    - *Verify*:
        1.  Click two agents.
        2.  Wait for them to drift near each other without a third party in between.
        3.  Verify the simulation freezes instantly.