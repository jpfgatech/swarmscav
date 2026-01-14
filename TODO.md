# Swarmalator Game Development Roadmap

## Phase 1: Game Mechanics (Web Prototype)
- [ ] **Feature: Win Condition (Target Reached)**
    - *Goal*: Detect when Hero reaches the Target and pause the game.
    - *Logic*: Check distance $d(Hero, Target) < (Radius_H + Radius_T)$.
    - *Constraint*: Must be checked in the `GameScript` layer (post-physics).
    - *Unit Test*: `tests/GameRules.test.js`: Mock Hero/Target positions at distance 5 (hit) and 50 (miss). Assert `game.state` changes to `WON`.
    - *Commit*: `feat(game): implement win condition and pause logic`

- [ ] **Feature: Phase Inversion Mechanic**
    - *Goal*: Implement "Polarity Switch" capability.
    - *Input*: **Spacebar** (Toggle).
    - *Logic*: When active, add $\pi$ (180°) to the Hero's effective phase during force calculation. This turns Attraction into Repulsion and vice versa.
    - *Visuals*: Hero border color flips (e.g., Cyan $\to$ Magenta) to indicate inverted state.
    - *Unit Test*: `tests/HeroLogic.test.js`: Verify that activating inversion shifts the output phase used in coupling calculations.
    - *Commit*: `feat(hero): add phase inversion mechanic mapped to spacebar`

- [ ] **Refactor: Input Swap & Boost**
    - *Goal*: Rebind controls and default settings.
    - *Changes*:
        1.  **Boost**: Move from Spacebar $\to$ **Mouse Click / Touch**.
        2.  **Defaults**: Set `SHOW_KINETIC_ENERGY = false` in `Config.js`.
    - *Verify*: Manual playtest. Click to speed up, Space to swap colors.
    - *Commit*: `refactor(input): swap boost/phase controls and update defaults`

- [ ] **Feature: Relative Phase Visualization**
    - *Goal*: Stabilize the "Rainbow Flash" by mapping color to *Relative Phase* rather than *Absolute Phase*.
    - *Logic*: `Hue = (AgentPhase - ReferencePhase)`.
    - *Config*: Add `VIEW_MODE` with options:
        1.  `MEDIAN`: Sort phases, pick middle value.
        2.  `MEAN`: Vector average of all phases (Order Parameter).
        3.  `MID_RANGE`: $(\min + \max) / 2$.
    - *Constraint*: Implement in `Renderer` (pure visual change).
    - *Verify*: Run simulation. The swarm colors should appear "calm" and slowly shifting, rather than strobing rapidly.
    - *Commit*: `feat(viz): implement relative phase rendering options`

## Phase 2: React Native Migration (The Major Shift)
- [ ] **Infra: Expo Setup & Responsive Canvas**
    - *Goal*: Initialize `swarmalator-mobile` (Expo/React Native).
    - *Responsive Logic*:
        -   **Web**: Use `window.innerWidth/Height` (Full viewport).
        -   **Mobile**: Use `Dimensions.get('window')` to set simulation bounds.
    - *Constraint*: The `PhysicsEngine` must accept dynamic `width/height` in its `init()` method.
    - *Commit*: `chore(init): setup expo project with responsive physics bounds`

- [ ] **Migration: Port Core & Game Logic**
    - *Goal*: Move the tested `src/core` (Physics, HeroLogic, Config) to the mobile app.
    - *UI Change*: **Hide the Parameter Panel**. It should not exist in the mobile Game View.
    - *Verify*: The app runs a headless simulation loop logging Hero coordinates to console.
    - *Commit*: `refactor(core): migrate physics engine to react native environment`

- [ ] **Feature: Mobile Controls & Rendering**
    - *Goal*: Wire up the visuals and interactions.
    - *Input*: Tap Screen $\to$ Trigger `Boost` (was Mouse Click).
    - *Input*: Button/Gesture $\to$ Trigger `Phase Inversion` (was Spacebar).
    - *Render*: Use `<Canvas>` (Skia) to draw the circles using the new Relative Phase logic.
    - *Commit*: `feat(mobile): implement touch controls and skia renderer`

## Phase 3: Onboarding
- [ ] **Feature: Slow-Motion Tutorial**
    - *Goal*: A scripted one-time intro sequence.
    - *Sequence*:
        1.  Start `TIME_SCALE = 0.1` (Slow Mo).
        2.  Overlay: "Tap to Boost" (Wait for input).
        3.  Overlay: "Space/Button to Invert" (Wait for input).
        4.  Restore `TIME_SCALE = 1.0`.
    - *State*: Save `hasSeenTutorial` to local storage.
    - *Commit*: `feat(ui): add interactive slow-motion tutorial`