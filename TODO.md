- [x] **Feature: Capture & Corruption Mechanic**
    - *Goal*: Implement the specific logic where catching a Target converts a neighbor into a Demon.
    - *Trigger*: Hero collides with Target $T_{hit}$.
    - *Logic*:
        1.  **Recycle Victim**:
            -   Remove $T_{hit}$ from `activeTargets`.
            -   Reinitialize $T_{hit}$ as a normal swarm agent (random pos/phase, 0 vel).
        2.  **Corrupt Bystander**:
            -   Check if `activeTargets` is not empty.
            -   Randomly select another target $T_{next}$.
            -   **Transfer**: Remove $T_{next}$ from `activeTargets` and push to `activeDemons`.
            -   *Constraint*: Do NOT reset $T_{next}$'s position or phase. It changes teams instantly in place.
    - *Cleanup*: Remove the temporary Demon spawn from the previous step.
    - *Verify*:
        1.  Catch a Gold Target.
        2.  Watch it vanish (recycled).
        3.  Watch a *different* Gold Target turn Red instantly.