- [x] **Refactor: Config Panel & Parameter Tuning**
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
        2.  Set Freq Std Dev to 400%; verify some agents spin very fast (CW) and some very fast (CCW).