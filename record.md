- [x] **Feature: Hero Anchor Mechanic (Hold to Stop)**
    - *Goal*: Replace all existing player interactions with a passive "Brake" mechanic. The Hero moves naturally with the swarm until the player holds input to freeze it in place.
    - *Cleanup*:
        -   Remove all previous "Teleport", "Boost", or "Inertia" logic.
        -   Reset Hero and Target radii to match the standard agent size (no longer larger).
    - *Logic*:
        1.  **Input**: Listen for `keydown(Space)` or `touchstart`.
        2.  **Update Loop**:
            -   Check if Input is **Active**.
            -   **If Active**: Force `Hero.velocity = (0, 0)` and `Hero.pos = Hero.prevPos` (Lock position).
            -   **If Inactive**: Allow `PhysicsEngine` to update Hero position normally based on swarm forces.
    - *Verify*:
        1.  Run simulation. Hero should drift with the swarm.
        2.  Hold Spacebar. Hero should stop dead in its tracks immediately.
        3.  Release Spacebar. Hero should resume drifting from that exact spot.


- [x] **Feature: Teleport Mechanic (Click-to-Spawn)**
    - *Goal*: Implement the core gameplay mechanic where the player clicks to instantly replace the Hero agent.
    - *Logic*:
        1.  **Input**: Listen for `mousedown` events on the canvas.
        2.  **Action**:
            -   Identify the current `HERO_ID`.
            -   **Position**: Update `SimulationState` to set the Hero's position `(x, y)` to the exact mouse click coordinates.
            -   **Dynamics**: Reset the Hero's velocity to `(0, 0)` (stop all momentum).
            -   **Phase**: Randomize the Hero's phase $\theta$ to a value between $0$ and $2\pi$.
    - *Constraint*: This logic must directly manipulate the `SimulationState` arrays and must work independently of the physics update loop.
    - *Verify*:
        1.  Run the simulation.
        2.  Click anywhere on the screen.
        3.  Observe the "Hero" dot disappearing from its old spot and instantly appearing under your cursor, stationary, with a new random color (phase).
- [x] **Feature: Stamina System (Hold Mechanics)**
    - *Goal*: Implement a resource management system for the "Hold to Stop" mechanic.
    - *Logic*:
        -   **State**: Track `currentStamina` (init 2.0s), `maxStamina` (2.0s), and `isExhausted` (bool).
        -   **Update Loop**:
            1.  **Consumption**: If Input (Space/Touch) is active AND `!isExhausted`:
                -   `currentStamina -= deltaTime`.
                -   Trigger "Halt" physics (Hero velocity = 0).
                -   If `currentStamina <= 0`: Set `isExhausted = true`.
            2.  **Recovery**: If Input is inactive OR `isExhausted`:
                -   `currentStamina += deltaTime`.
                -   Do NOT trigger "Halt" physics (Input ignored).
            3.  **Reset**: If `currentStamina >= maxStamina`: Set `isExhausted = false`.
    - *Constraint*: The "Hold to Stop" physics must strictly check `!isExhausted` before applying.
    - *Verify*:
        1.  Hold Space until stamina runs out (gameplay resumes despite holding).
        2.  Release Space briefly (gameplay still normal/hero moving).
        3.  Wait for full recharge, then Hold Space again (hero stops).- [x] **Feature: Stamina UI (Rainbow Bar)**
    - *Goal*: Visualize the stamina status using a spectrum-colored energy bar.
    - *Logic*:
        -   **Position**: Draw a bar at the top or bottom of the screen.
        -   **Width**: `(currentStamina / maxStamina) * ScreenWidth`.
        -   **Color**: Fill with a Horizontal Linear Gradient representing the HSL spectrum (0 to 360).
        -   **Feedback state**: If `isExhausted` is true, render the bar semi-transparent or grayed out to indicate the penalty state.
    - *Constraint*: Render this in the main `draw()` loop on top of the simulation.
    - *Verify*: Hold Space and watch the rainbow bar shrink smoothly. Release and watch it grow back.- [x] **Refactor: Config Panel & Parameter Tuning**
    - *Goal*: Update the Debug Panel to match the new gameplay design.
    - *Tasks*:
        1.  **Remove**: Delete the "Boost Factor" slider.
        2.  **Add**: "Max Stamina" slider. Range: `1.0` to `5.0` seconds. Updates `maxStamina` in logic.
        3.  **Update**: "Frequency Variation" slider.
            -   Rename label to "**Freq Std Dev**".
            -   Update Logic: `omega_std = slider_val * base_omega`.
            -   Range: `0.0` (0%) to `4.0` (400%).
    - *Verify*:
        1.  Set Stamina slider to 5s; verify bar drains slower.
        2.  Set Freq Std Dev to 400%; verify some agents spin very fast (CW) and some very fast (CCW).- [x] **Feature: Game Modes & Parameter Presets**
    - *Goal*: Separate "Player Mode" (Randomized Presets) from "Developer Mode" (Manual Control) based on URL auth.
    - *Logic*:
        1.  **Mode Detection**: On init, check URL params for a password (e.g., `?mode=dev_secret`).
            -   If present: Set `state.isDev = true`.
            -   If absent: Set `state.isDev = false`.
        2.  **Player Mode (Default)**:
            -   **Hide Panel**: Do not instantiate/render the `ParameterPanel`.
            -   **Randomize**: Pick one of the following 4 Configuration Sets and apply it to `Config`:
                -   Set A: `{ J: 2.5, K: -1.0 }`
                -   Set B: `{ J: 2.5, K: -0.16, timeScale: 250 }`
                -   Set C: `{ J: 8.0, K: -8.0 }`
                -   Set D: `{ J: 8.0, K: -4.0, timeScale: 50 }`
        3.  **Developer Mode**:
            -   Do not randomize (keep defaults).
            -   Initialize the Panel.
    - *Verify*:
        1.  Load `localhost:3000` -> Verify no panel and random behavior. Refresh to see different behaviors.
        2.  Load `localhost:3000?mode=dev_secret` -> Verify panel appears and default settings are used.- [x] **Refactor: Developer Panel (Text Inputs)**
    - *Goal*: Convert the Developer Panel from "Exploration Tools" (Sliders) to "Precision Tools" (Text Boxes).
    - *Logic*:
        -   **Condition**: Only execute this if `isDevMode` is true.
        -   **UI Change**: Rewrite the `ParameterPanel` class.
            -   Replace all `<input type="range">` elements with `<input type="number">`.
            -   Remove `min/max` constraints (allow typing any float).
            -   Use `onchange` and `blur` events to apply values (to prevent lag while typing).
    - *Constraint*: Ensure inputs handle standard values (e.g., "1.0") and extreme scientific notation if needed.
    - *Verify*: Enter Developer Mode. Type "1024" into `J`. Verify the simulation reacts instantly/upon enter.

- [x] **Feature: Multi-Target Scavenger Hunt**
    - *Goal*: Transition from "Reach 1 Target" to "Collect 10 Targets".
    - *Logic*:
        1.  **State**: Update `SimulationState` to track an array of 10 Target objects `{x, y, active}` instead of a single Target.
        2.  **Initialization**: Randomly spawn 10 targets within bounds.
        3.  **Update Loop**:
            -   Iterate through all *active* targets.
            -   Check condition: `distance(Hero, target_i) < (Radius_H + Radius_T)`.
            -   **On Hit**: Mark target as `active = false` (Remove from play).
        4.  **Win Condition**: If `activeTargets.length == 0`, Trigger `Game Won` (Pause).
    - *Visuals*: Render all 10 targets. Stop rendering them individually as they are collected.
    - *Verify*:
        1.  Start game. Count 10 gold dots.
        2.  Steer Hero into one. It should disappear. Game continues.
        3.  Collect all 10. Game should freeze/win.
