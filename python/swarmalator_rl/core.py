"""
SwarmCore: High-performance Swarmalator physics engine using NumPy vectorization.

This module implements the core physics logic from the JavaScript engine,
using vectorized NumPy operations for performance.
"""

import numpy as np
from typing import Optional, Tuple


class SwarmCore:
    """
    Core Swarmalator physics engine.
    
    Implements overdamped dynamics with:
    - Repulsion forces (soft-core gravity)
    - Phase-based spatial coupling (J term)
    - Phase coupling (K term)
    - Toroidal boundary conditions
    """
    
    # Physics constants (Stage 1 parameters)
    N = 100
    J = 8.0
    K = -4.0
    TIME_SCALE = 50.0
    REPULSION_STRENGTH = 4000.0
    EPSILON = 4.0
    BASE_OMEGA = 0.1
    OMEGA_VARIATION = 0.0
    LOGICAL_WIDTH = 1000.0
    LOGICAL_HEIGHT = 1000.0
    DT = 0.05 * TIME_SCALE  # Scaled time step (2.5 seconds per frame)
    
    def __init__(self, seed: int = 12345):
        """
        Initialize the SwarmCore.
        
        Args:
            seed: Random seed for deterministic initialization
        """
        self.seed = seed
        self.rng = np.random.RandomState(seed)
        
        # State arrays (shape: (N, 2) for positions/velocities, (N,) for phases)
        self.agents_pos: np.ndarray = None  # Shape: (N, 2)
        self.agents_phase: np.ndarray = None  # Shape: (N,)
        self.agents_vel: np.ndarray = None  # Shape: (N, 2)
        self.agents_omega: np.ndarray = None  # Shape: (N,) - natural frequencies
        
        # Force arrays (computed each step)
        self.agents_force: np.ndarray = None  # Shape: (N, 2)
        self.agents_phase_derivative: np.ndarray = None  # Shape: (N,)
        
        # Action state tracking
        self.prev_action: int = 0
        self.prev_positions: dict = {}  # Store positions when action becomes active
        
        # Initialize state
        self.reset()
    
    def reset(self, seed: Optional[int] = None):
        """
        Reset the simulation to initial state.
        
        Args:
            seed: Optional new random seed (uses existing if None)
        """
        if seed is not None:
            self.seed = seed
            self.rng = np.random.RandomState(seed)
        
        # Initialize positions randomly
        self.agents_pos = self.rng.uniform(
            low=[0, 0],
            high=[self.LOGICAL_WIDTH, self.LOGICAL_HEIGHT],
            size=(self.N, 2)
        ).astype(np.float32)
        
        # Initialize phases randomly
        self.agents_phase = self.rng.uniform(
            low=0.0,
            high=2 * np.pi,
            size=self.N
        ).astype(np.float32)
        
        # Initialize velocities to zero (overdamped model)
        self.agents_vel = np.zeros((self.N, 2), dtype=np.float32)
        
        # Initialize natural frequencies
        omega_base = self.BASE_OMEGA
        omega_var = self.OMEGA_VARIATION
        self.agents_omega = np.full(
            self.N,
            omega_base + self.rng.uniform(-omega_var, omega_var, size=self.N),
            dtype=np.float32
        )
        
        # Re-center positions (subtract center of mass)
        center = np.mean(self.agents_pos, axis=0)
        self.agents_pos -= center
        
        # Re-center velocities (subtract mean velocity)
        mean_vel = np.mean(self.agents_vel, axis=0)
        self.agents_vel -= mean_vel
        
        # Re-center to logical coordinate center
        logical_center = np.array([self.LOGICAL_WIDTH / 2, self.LOGICAL_HEIGHT / 2], dtype=np.float32)
        self.agents_pos += logical_center
        
        # Initialize force arrays
        self.agents_force = np.zeros((self.N, 2), dtype=np.float32)
        self.agents_phase_derivative = np.zeros(self.N, dtype=np.float32)
        
        # Reset action state
        self.prev_action = 0
        self.prev_positions = {}
    
    def _toroidal_distance(self, pos1: np.ndarray, pos2: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Calculate toroidal distance between two positions.
        
        Args:
            pos1: Position array, shape (..., 2)
            pos2: Position array, shape (..., 2)
        
        Returns:
            Tuple of (dx, dy, distance) where:
            - dx, dy: Wrapped differences, shape (...,)
            - distance: Euclidean distance, shape (...,)
        """
        dx = pos2[..., 0] - pos1[..., 0]
        dy = pos2[..., 1] - pos1[..., 1]
        
        # Wrap if distance > half width/height
        dx = np.where(np.abs(dx) > self.LOGICAL_WIDTH / 2,
                     np.where(dx > 0, dx - self.LOGICAL_WIDTH, dx + self.LOGICAL_WIDTH),
                     dx)
        dy = np.where(np.abs(dy) > self.LOGICAL_HEIGHT / 2,
                     np.where(dy > 0, dy - self.LOGICAL_HEIGHT, dy + self.LOGICAL_HEIGHT),
                     dy)
        
        distance = np.sqrt(dx * dx + dy * dy)
        
        return dx, dy, distance
    
    def _calculate_forces(self):
        """
        Calculate all forces using vectorized NumPy operations.
        
        Updates:
            - self.agents_force: Net force on each agent
            - self.agents_phase_derivative: Phase derivative for each agent
        """
        # Reset forces and phase derivatives
        self.agents_force.fill(0.0)
        self.agents_phase_derivative = self.agents_omega.copy()  # Start with natural frequency
        
        # Vectorized pairwise interactions
        # Create difference matrices: r_diff[i, j] = pos[j] - pos[i]
        # Shape: (N, N, 2)
        pos_expanded_i = self.agents_pos[:, np.newaxis, :]  # Shape: (N, 1, 2)
        pos_expanded_j = self.agents_pos[np.newaxis, :, :]  # Shape: (1, N, 2)
        
        # Calculate distances for all pairs
        # NOTE: Match main.js behavior - NO toroidal wrapping in force calculations
        # Positions wrap at boundaries (in step()), but forces use straight-line distances
        dx = pos_expanded_j[..., 0] - pos_expanded_i[..., 0]  # Shape: (N, N)
        dy = pos_expanded_j[..., 1] - pos_expanded_i[..., 1]  # Shape: (N, N)
        
        # Distance matrix
        distance_sq = dx * dx + dy * dy  # Shape: (N, N)
        distance = np.sqrt(distance_sq)  # Shape: (N, N)
        
        # Mask out self-interactions (diagonal) and very close pairs
        mask = np.eye(self.N, dtype=bool) | (distance_sq < 1e-6)
        distance_sq = np.where(mask, np.inf, distance_sq)
        distance = np.where(mask, np.inf, distance)
        
        # Phase differences: phase_diff[i, j] = phase[j] - phase[i]
        phase_expanded_i = self.agents_phase[:, np.newaxis]  # Shape: (N, 1)
        phase_expanded_j = self.agents_phase[np.newaxis, :]  # Shape: (1, N)
        phase_diff = phase_expanded_j - phase_expanded_i  # Shape: (N, N)
        
        # ===== Repulsion Force =====
        # F_rep = REPULSION_STRENGTH / (distance^2 + EPSILON) / N
        # Direction: from j to i (dx_repel = -dx, dy_repel = -dy)
        # Note: dx = pos[j] - pos[i], so -dx pushes i away from j
        inv_dist_sq_plus_eps = 1.0 / (distance_sq + self.EPSILON)  # Shape: (N, N)
        repulsion_magnitude = self.REPULSION_STRENGTH * inv_dist_sq_plus_eps / self.N  # Shape: (N, N)
        
        # Unit vectors (for repulsion, direction is -dx, -dy to push i away from j)
        inv_distance = np.where(mask, 0.0, 1.0 / distance)  # Shape: (N, N)
        unit_x_repel = -dx * inv_distance  # Shape: (N, N) - direction from j to i
        unit_y_repel = -dy * inv_distance  # Shape: (N, N)
        
        # Repulsion force components (force on agent i from agent j)
        repulsion_fx = unit_x_repel * repulsion_magnitude  # Shape: (N, N)
        repulsion_fy = unit_y_repel * repulsion_magnitude  # Shape: (N, N)
        
        # Sum over j to get net force on each i
        self.agents_force[:, 0] += np.sum(repulsion_fx, axis=1)
        self.agents_force[:, 1] += np.sum(repulsion_fy, axis=1)
        
        # ===== Phase-Based Spatial Coupling (J term) =====
        # F_att = (1 + J*cos(θ_j - θ_i)) * unit_vector / N
        # Direction: from i to j (dx, dy)
        coupling_strength = (1.0 + self.J * np.cos(phase_diff)) / self.N  # Shape: (N, N)
        
        # Unit vectors (for attraction, direction is dx, dy)
        unit_x_att = np.where(mask, 0.0, dx * inv_distance)  # Shape: (N, N)
        unit_y_att = np.where(mask, 0.0, dy * inv_distance)  # Shape: (N, N)
        
        # Attraction force components
        attraction_fx = unit_x_att * coupling_strength  # Shape: (N, N)
        attraction_fy = unit_y_att * coupling_strength  # Shape: (N, N)
        
        # Sum over j to get net force on each i
        self.agents_force[:, 0] += np.sum(attraction_fx, axis=1)
        self.agents_force[:, 1] += np.sum(attraction_fy, axis=1)
        
        # ===== Phase Coupling (K term) =====
        # dθ/dt = K * sin(θ_j - θ_i) / distance / N
        phase_coupling = self.K * np.sin(phase_diff) * inv_distance / self.N  # Shape: (N, N)
        
        # Sum over j to get net phase derivative for each i
        self.agents_phase_derivative += np.sum(phase_coupling, axis=1)
    
    def step(self, dt: Optional[float] = None, action: int = 0):
        """
        Perform one physics step.
        
        Args:
            dt: Time step (uses self.DT if None)
            action: Action index (0=No-op, 1=Hold Hero, 2=Hold Targets, 3=Hold Both)
        """
        if dt is None:
            dt = self.DT
        
        # Update previous positions when action changes or becomes active
        if self.prev_action != action:
            if action == 1 or action == 3:  # Hold Hero
                self.prev_positions[0] = self.agents_pos[0].copy()
            if action == 2 or action == 3:  # Hold Targets
                for i in range(1, min(11, self.N)):
                    self.prev_positions[i] = self.agents_pos[i].copy()
        
        # Calculate forces
        self._calculate_forces()
        
        # Overdamped dynamics: velocity = force directly
        self.agents_vel = self.agents_force.copy()
        
        # Integrate positions and phases
        self.agents_pos += self.agents_vel * dt
        self.agents_phase += self.agents_phase_derivative * dt
        
        # Wrap phase to [0, 2π]
        self.agents_phase = np.mod(self.agents_phase, 2 * np.pi)
        
        # Toroidal boundary wrapping
        self.agents_pos[:, 0] = np.mod(self.agents_pos[:, 0], self.LOGICAL_WIDTH)
        self.agents_pos[:, 1] = np.mod(self.agents_pos[:, 1], self.LOGICAL_HEIGHT)
        
        # Apply actions AFTER integration (matching JS behavior)
        if action == 1 or action == 3:  # Hold Hero
            if 0 in self.prev_positions:
                self.agents_pos[0] = self.prev_positions[0].copy()
            self.agents_vel[0] = 0.0
            self.agents_force[0] = 0.0
        
        if action == 2 or action == 3:  # Hold Targets
            for i in range(1, min(11, self.N)):
                if i in self.prev_positions:
                    self.agents_pos[i] = self.prev_positions[i].copy()
                self.agents_vel[i] = 0.0
                self.agents_force[i] = 0.0
        
        self.prev_action = action
    
    def apply_action(self, action: int):
        """
        Apply an action (alias for step with action only).
        
        Args:
            action: Action index (0=No-op, 1=Hold Hero, 2=Hold Targets, 3=Hold Both)
        """
        self.step(action=action)
    
    def get_state(self) -> dict:
        """
        Get current simulation state.
        
        Returns:
            Dictionary with 'agents_pos', 'agents_phase', 'hero_pos'
        """
        return {
            'agents_pos': self.agents_pos.copy(),
            'agents_phase': self.agents_phase.copy(),
            'hero_pos': self.agents_pos[0].copy()
        }
