"""Plug-Flow Reactor (PFR) 1D Spatial Integration Model."""

from dataclasses import dataclass
from typing import Dict, Any, Tuple
import numpy as np
from scipy.integrate import solve_ivp
from .kinetics import KineticParams, specific_growth_rate, substrate_consumption_rate, oxygen_uptake_rate

@dataclass
class PFRState:
    """State vector of PFR at any axial position."""
    S: float
    Xb: float
    DO: float

def pfr_spatial_derivatives(tau_pos: float, y: np.ndarray, params: KineticParams) -> np.ndarray:
    """Calculates [dS/dtau, dXb/dtau, dDO/dtau] along the plug-flow reactor."""
    S, Xb, DO = max(0.0, y[0]), max(0.0, y[1]), max(0.0, y[2])

    mu_eff = specific_growth_rate(S, DO, params)
    r_cons = (mu_eff * Xb) / params.Y
    our = params.alpha_O * r_cons + (1.42 * params.b * Xb)

    dS_dtau = -r_cons
    dXb_dtau = (mu_eff - params.b) * Xb
    dDO_dtau = params.kLa * (params.DO_sat - DO) - our

    return np.array([dS_dtau, dXb_dtau, dDO_dtau])

def simulate_pfr(S0: float, Xb0: float, DO0: float, tau_total: float,
                 params: KineticParams, n_points: int = 500) -> Dict[str, Any]:
    """Integrates spatial differential balances across total residence time tau_total."""
    params.validate()
    y0 = np.array([S0, Xb0, DO0])
    tau_eval = np.linspace(0.0, tau_total, n_points)

    sol = solve_ivp(
        fun=pfr_spatial_derivatives,
        t_span=(0.0, tau_total),
        y0=y0,
        t_eval=tau_eval,
        args=(params,),
        method="Radau",
        rtol=1e-6,
        atol=1e-8
    )

    if not sol.success:
        raise RuntimeError(f"PFR spatial integrator failed: {sol.message}")

    return {
        "tau_profile": sol.t,
        "fractional_length": sol.t / tau_total if tau_total > 0 else sol.t,
        "S": sol.y[0],
        "Xb": sol.y[1],
        "DO": sol.y[2],
        "effluent_S": float(sol.y[0][-1]),
        "effluent_Xb": float(sol.y[1][-1]),
        "effluent_DO": float(sol.y[2][-1]),
        "conversion": (S0 - float(sol.y[0][-1])) / S0 if S0 > 0 else 0.0
    }
