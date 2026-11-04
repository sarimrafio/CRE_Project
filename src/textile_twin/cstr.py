"""Continuous Stirred-Tank Reactor (CSTR) Model with Monod Kinetics & Oxygen."""

from dataclasses import dataclass
from typing import Tuple, Dict, Any
import numpy as np
from scipy.integrate import solve_ivp
from scipy.optimize import root
from .kinetics import KineticParams, specific_growth_rate, substrate_consumption_rate, oxygen_uptake_rate

@dataclass
class CSTRState:
    """State vector of a CSTR."""
    S: float    # Substrate bCOD [mg/L]
    Xb: float   # Biomass [mg VSS/L]
    DO: float   # Dissolved oxygen [mg/L]

def cstr_derivatives(t: float, y: np.ndarray, S0: float, DO0: float,
                     tau: float, theta_c: float, params: KineticParams) -> np.ndarray:
    """Calculates [dS/dt, dXb/dt, dDO/dt] for CSTR."""
    S, Xb, DO = y[0], y[1], y[2]

    # Rates
    mu_eff = specific_growth_rate(S, DO, params)
    r_cons = (mu_eff * max(0.0, Xb)) / params.Y
    our = params.alpha_O * r_cons + (1.42 * params.b * max(0.0, Xb))

    # dS/dt = (S0 - S)/tau - r_cons
    dS_dt = (S0 - S) / tau - r_cons

    # dXb/dt = (mu_eff - b - 1/theta_c) * Xb
    dXb_dt = (mu_eff - params.b - (1.0 / theta_c)) * Xb

    # dDO/dt = (DO0 - DO)/tau + kLa*(DO_sat - DO) - our
    dDO_dt = (DO0 - DO) / tau + params.kLa * (params.DO_sat - DO) - our

    return np.array([dS_dt, dXb_dt, dDO_dt])

def simulate_cstr(S0: float, DO0: float, tau: float, theta_c: float,
                  initial_state: CSTRState, params: KineticParams,
                  t_span: Tuple[float, float] = (0.0, 30.0),
                  n_points: int = 500) -> Dict[str, Any]:
    """Simulate transient trajectory of CSTR to steady state."""
    params.validate()
    y0 = np.array([initial_state.S, initial_state.Xb, initial_state.DO])
    t_eval = np.linspace(t_span[0], t_span[1], n_points)

    sol = solve_ivp(
        fun=cstr_derivatives,
        t_span=t_span,
        y0=y0,
        t_eval=t_eval,
        args=(S0, DO0, tau, theta_c, params),
        method="Radau",
        rtol=1e-6,
        atol=1e-8
    )

    if not sol.success:
        raise RuntimeError(f"CSTR ODE solver failed: {sol.message}")

    return {
        "time": sol.t,
        "S": sol.y[0],
        "Xb": sol.y[1],
        "DO": sol.y[2],
        "success": sol.success,
        "steady_state": CSTRState(S=float(sol.y[0][-1]), Xb=float(sol.y[1][-1]), DO=float(sol.y[2][-1]))
    }

def solve_cstr_steady_state(S0: float, DO0: float, tau: float, theta_c: float,
                            params: KineticParams, Xb_guess: float = 2500.0) -> CSTRState:
    """Directly solve algebraic steady-state equations for CSTR."""
    params.validate()

    # Washout check: critical SRT
    mu_washout = params.mu_max - params.b
    if theta_c <= (1.0 / mu_washout):
        # Biomass washes out completely
        return CSTRState(S=S0, Xb=0.0, DO=params.DO_sat)

    # Nonlinear root finding for coupled (S, Xb, DO)
    def equations(vars):
        S, Xb, DO = vars
        derivs = cstr_derivatives(0.0, np.array([S, Xb, DO]), S0, DO0, tau, theta_c, params)
        return derivs

    # Initial guess: based on uninhibited analytical formulas
    net_req = params.b + (1.0 / theta_c)
    S_guess = (params.Ks * net_req) / (params.mu_max - net_req) if (params.mu_max > net_req) else S0 * 0.1
    DO_guess = 2.0

    res = root(equations, [S_guess, Xb_guess, DO_guess], method="hybr")
    if not res.success or res.x[0] < 0 or res.x[1] < 0:
        # Fall back to high-accuracy dynamic integration to steady state
        dyn = simulate_cstr(S0, DO0, tau, theta_c, CSTRState(S=S_guess, Xb=Xb_guess, DO=DO_guess), params, t_span=(0, 60))
        return dyn["steady_state"]

    return CSTRState(S=float(res.x[0]), Xb=float(res.x[1]), DO=float(res.x[2]))
