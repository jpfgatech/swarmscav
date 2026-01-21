# Player Mode Stage 1 Parameters

**Extracted from:** `main.js` (Player Mode Preset Index 0) + `src/core/Config.js` (defaults)

**Date:** 2026-01-18  
**Purpose:** Reference document for Python RL environment port (Task 0)

---

## Preset Configuration (Player Mode Stage 1)

When player mode starts, it applies **Preset Index 0**, which corresponds to:
```javascript
{ J: 8.0, K: -4.0, TIME_SCALE: 50 }
```

**Note:** Only `J`, `K`, and `TIME_SCALE` are overridden by the preset. All other parameters use default values from `Config.js`.

---

## Complete Parameter Set

### Swarmalator Coupling Constants
- **J** (Spatial Coupling): `8.0` *(from preset)*
- **K** (Phase Coupling): `-4.0` *(from preset)*

### Agent Population
- **N** (Number of Agents): `100` *(from Config default)*

### Initial Conditions
- **BASE_OMEGA** (Base Intrinsic Frequency): `0.1` *(from Config default)*
- **OMEGA_VARIATION** (Frequency Variation Range): `0.0` *(from Config default)*
  - All agents have identical natural frequency: `omega = 0.1`

### Spatial Forces
- **REPULSION_STRENGTH**: `4000.0` *(from Config default)*
- **EPSILON** (Softening Parameter): `4.0` *(from Config default)*
  - Prevents singularity at `r = 0` in repulsion force: `force = dir / (distSq + epsilon)`

### Dynamics
- **TIME_SCALE**: `50.0` *(from preset)*
  - Multiplier for simulation speed: `deltaTime = rawDeltaTime * TIME_SCALE`
  - At 30 FPS: `rawDeltaTime ≈ 0.0333s`, so `deltaTime ≈ 1.67s` (scaled)

### Viewport (Logical Coordinate System)
- **LOGICAL_WIDTH**: `1000` pixels *(from Config default)*
- **LOGICAL_HEIGHT**: `1000` pixels *(from Config default)*
  - Physics calculations use logical coordinates (not screen pixels)

### Time Step Calculation (JS Implementation)
- **TARGET_FPS**: `30` frames per second
- **DELTA_TIME_CAP**: `1/30 ≈ 0.0333` seconds (maximum frame time)
- **Raw Delta Time**: `min(elapsed_ms / 1000, DELTA_TIME_CAP)`
- **Scaled Delta Time**: `rawDeltaTime * TIME_SCALE`
  - For deterministic Python port: Use **fixed `dt = 0.0333 * 50 = 1.67` seconds** per step
  - **OR** use `dt = 0.05` as specified in RL doc (needs verification which is correct)

---

## Physics Equations (Reference)

### Overdamped Dynamics
```
v_i = (1/N) * Σ[j≠i] [ (x_j - x_i) / |x_j - x_i| * (1 + J*cos(θ_j - θ_i)) 
                       - (x_j - x_i) / |x_j - x_i|² * REPULSION_STRENGTH / (dist² + EPSILON) ]
```

### Phase Synchronization
```
dθ_i/dt = ω_i + (K/N) * Σ[j≠i] sin(θ_j - θ_i) / |x_j - x_i|
```

### Integration (Euler Method)
```
x_i(t+dt) = x_i(t) + v_i * dt
θ_i(t+dt) = θ_i(t) + (dθ_i/dt) * dt
```

**Note:** The JS implementation uses **overdamped dynamics** (velocity = force directly, no momentum accumulation).

---

## Game-Specific Parameters (Hero Logic)

### Hero & Targets
- **Hero Index**: `0` (first agent in swarm)
- **Target Count**: `10` targets (indices 1-10) *(as per RL doc and HeroLogic design)*
- **Target Indices**: `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]`
- **Note**: JS code currently initializes only 7 targets in `main.js` line 144, but HeroLogic is designed for 10. Use 10 for RL port.

### Stamina System
- **Max Stamina**: `2.0` seconds
- **Stamina Recovery Rate**: `1.0` per second (when not exhausted)
- **Stamina Consumption**: `1.0` per second (when action active)

### Action Space (RL)
- `0`: No-Op (release all keys)
- `1`: Hold Hero (Channel A - Spacebar)
- `2`: Hold Targets (Channel B - Ctrl)
- `3`: Hold Both (Channel A + Channel B)

---

## Important Notes for Python Port

1. **Normalization**: All forces are divided by `N` (population size) to prevent explosions.

2. **Coordinate System**: Use logical coordinates (1000×1000), not screen coordinates.

3. **Toroidal Boundaries**: Positions wrap around at boundaries:
   - `if x < 0: x += width`
   - `if x >= width: x -= width`
   - Same for `y`

4. **Phase Wrapping**: Phase is kept in `[0, 2π)`:
   - `while theta < 0: theta += 2π`
   - `while theta >= 2π: theta -= 2π`

5. **Distance Calculation**: Use Euclidean distance with toroidal wrapping (minimum distance across boundaries).

6. **Time Step**: For deterministic parity testing, use **fixed `dt`** (either `0.05` as in RL doc, or `1.67` to match JS scaled time). This needs clarification.

---

## Source Files Reference

- **Preset Definition**: `main.js` lines 477-482
- **Default Config**: `src/core/Config.js`
- **Runtime Config**: `runtimeConfig.js`
- **Physics Implementation**: `main.js` functions:
  - `applyRepulsionForce()` (line 173)
  - `applyPhaseBasedSpatialCoupling()` (line 196)
  - `applyPhaseCoupling()` (line 226)
  - `updatePhysics()` (line 250)
- **Agent Update**: `Agent.js` `update()` method (line 74)

---

## Verification Checklist

- [ ] All parameters match JS defaults + preset overrides
- [ ] Time step (`dt`) decision: fixed `0.05` vs `1.67` (scaled) vs variable
- [x] Target count: Use 10 targets (as per RL doc and HeroLogic design, despite JS init using 7)
- [ ] Phase wrapping logic matches JS implementation
- [ ] Toroidal boundary conditions match JS implementation
