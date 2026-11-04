"""Plug-Flow Reactor (PFR) 1D Spatial Integration Model."""

from dataclasses import dataclass
from typing import Dict, Any
import numpy as np
from scipy.integrate import solve_ivp
from .kinetics import KineticParams, specific_growth_rate, substrate_consumption_rate

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
                 params: KineticParams, n_points: int = 200) -> Dict[str, Any]:
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
        rtol=1e-5,
        atol=1e-7
    )

    if not sol.success:
        raise RuntimeError(f"PFR spatial integrator failed: {sol.message}")

    rates = []
    for s_val, xb_val, do_val in zip(sol.y[0], sol.y[1], sol.y[2]):
        rates.append(round(substrate_consumption_rate(s_val, xb_val, do_val, params), 3))

    return {
        "tau_profile": [round(float(v), 4) for v in sol.t],
        "fractional_length": [round(float(v / tau_total) if tau_total > 0 else 0.0, 4) for v in sol.t],
        "S": [round(float(v), 3) for v in sol.y[0]],
        "Xb": [round(float(v), 2) for v in sol.y[1]],
        "DO": [round(float(v), 3) for v in sol.y[2]],
        "reaction_rate": rates,
        "effluent_S": float(sol.y[0][-1]),
        "effluent_Xb": float(sol.y[1][-1]),
        "effluent_DO": float(sol.y[2][-1]),
        "conversion": (S0 - float(sol.y[0][-1])) / S0 if S0 > 0 else 0.0
    }
