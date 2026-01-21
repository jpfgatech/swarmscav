# Swarmalator RL Environment (Python Port)

This directory contains the Python implementation of the Swarmalator simulation for reinforcement learning.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

## Directory Structure

```
python/
├── swarmalator_rl/      # Main package
│   ├── __init__.py
│   ├── core.py         # SwarmCore (Physics) - Task 2
│   └── env.py          # SwarmEnv (Gym Wrapper) - Task 4
├── tests/               # Test suite
│   └── test_parity.py  # Parity test - Task 3
├── data/               # Data files
│   └── trace.json      # Reference trace from JS - Task 1
├── scripts/            # Utility scripts
│   └── check_run.py    # Sanity check - Task 5
├── requirements.txt    # Python dependencies
└── README.md          # This file
```

## Development Status

- [x] Task 0: Project Setup
- [ ] Task 1: Reference Data Generation (JS Side)
- [ ] Task 2: Physics Core (Python Side)
- [ ] Task 3: Parity Unit Test
- [ ] Task 4: Gym Wrapper
- [ ] Task 5: Sanity Check

## Parameters

See `STAGE1_PARAMETERS.md` for the complete parameter set used in Player Mode Stage 1.
