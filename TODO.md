- [ ] **Fix: Target Collection Patch (No Pause / Recycle Agent)**
    - *Context*: The previous implementation erroneously paused the game on contact and didn't handle agent removal correctly.
    - *Goal*: Remove the pause, and "recycle" collected target agents into new random swarm agents.
    - *Logic*:
        1.  **Locate**: In `GameLogic.js` (or where collision is checked).
        2.  **Remove Pause**: DELETE the line `simulation.pause()` or `state.paused = true` inside the collision block.
        3.  **Implement Recycle**: When Hero hits Target Agent $T_i$:
            -   **De-List**: Remove $T_i$ from the `activeTargets` array (so it stops being drawn as Gold/counted as a target).
            -   **Respawn (The "New Agent" Trick)**:
                -   Overwrite $T_i$'s position in `SimulationState` to a **new random location** on screen.
                -   Randomize $T_i$'s **phase**.
                -   Reset $T_i$'s **velocity** to zero.
            -   *Result*: The "Target" vanishes, and a new "Civilian" agent pops into existence elsewhere. The memory footprint remains identical.
    - *Verify*:
        1.  Run game.
        2.  Touch a target.
        3.  Confirm game **continues** (does not freeze).
        4.  Confirm target disappears (no longer Gold).
        5.  Confirm a new random agent appears somewhere else (maintaining N=100).