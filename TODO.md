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

