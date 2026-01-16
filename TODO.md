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
