- [ ] **Feature: Hero Turbo Boost (Script-Level Override)**
    - *Goal*: Implement a "Sprint" mechanic where the Hero moves faster along its natural trajectory when the player inputs command.
    - *Architecture*:
        1.  **Core**: `PhysicsEngine.update()` calculates standard positions for all agents.
        2.  **Script**: `HeroLogic.js` runs *immediately after*.
    - *Logic*:
        -   **Capture**: Before `engine.update()`, store `HeroPrevPos`.
        -   **Calculate**: After update, compute `naturalStep = HeroCurrentPos - HeroPrevPos`.
        -   **On Input (Space/Touch)**:
            -   Get Slider Value `alpha` (0 to 4).
            -   Compute `boostStep = naturalStep * (1 + alpha)`.
            -   **Override**: `HeroNewPos = HeroPrevPos + boostStep`.
            -   Update `SimulationState` with `HeroNewPos`.
    - *UI*:
        -   Slider: `Boost Alpha` (Range `0.0` to `4.0`).
        -   Visuals: Hero = Cyan (pulse size when boosting?), Target = Gold.
    - *Verify*:
        1.  Set Alpha = 3.0.
        2.  Run sim. Hero moves at normal swarm speed.
        3.  Hold Space. Hero should suddenly zip through the crowd 4x faster, but still curving around obstacles based on swarm forces.