"""Comparative Reactor Sizing and Design Calculations (Fogler Methodology)."""

from dataclasses import dataclass
from typing import Dict, Any
from scipy.optimize import brentq
from .kinetics import KineticParams
from .cstr import solve_cstr_steady_state, CSTRState
from .pfr import simulate_pfr

@dataclass
class SizingResult:
    """Comparison metrics for CSTR and PFR designs."""
    Q: float                  # Flow rate [m^3/day]
    S0: float                 # Influent bCOD [mg/L]
    Se_target: float          # Effluent target bCOD [mg/L]
    V_cstr: float             # Required CSTR volume [m^3]
    tau_cstr: float           # Required CSTR HRT [day]
    Se_cstr: float            # Achieved CSTR effluent [mg/L]
    Xb_cstr: float            # CSTR biomass [mg VSS/L]
    V_pfr: float              # Required PFR volume [m^3]
    tau_pfr: float            # Required PFR HRT [day]
    Se_pfr: float             # Achieved PFR effluent [mg/L]
    volume_ratio: float       # V_cstr / V_pfr
    removal_pct: float        # Percentage bCOD removal [%]

def size_cstr_for_target(Q: float, S0: float, Se_target: float, theta_c: float,
                         params: KineticParams, DO0: float = 1.0) -> Dict[str, float]:
    """Finds required CSTR volume and HRT tau to achieve Se <= Se_target."""
    # Find tau via root finding or bisection
    def objective(tau_trial: float) -> float:
        st = solve_cstr_steady_state(S0, DO0, tau_trial, theta_c, params)
        return st.S - Se_target

    # Search interval for tau in days: [0.01, 10.0]
    tau_min = 0.05
    tau_max = 15.0

    # Test endpoints
    s_min = solve_cstr_steady_state(S0, DO0, tau_min, theta_c, params).S
    s_max = solve_cstr_steady_state(S0, DO0, tau_max, theta_c, params).S

    if s_max > Se_target:
        # Even at 15 days HRT, target not reached; increase tau
        tau_sol = 20.0
    elif s_min <= Se_target:
        tau_sol = tau_min
    else:
        tau_sol = brentq(objective, tau_min, tau_max, rtol=1e-4)

    st_final = solve_cstr_steady_state(S0, DO0, tau_sol, theta_c, params)
    V_sol = Q * tau_sol

    return {
        "V": V_sol,
        "tau": tau_sol,
        "Se": st_final.S,
        "Xb": st_final.Xb,
        "DO": st_final.DO
    }

def size_pfr_for_target(Q: float, S0: float, Se_target: float, Xb0: float,
                        params: KineticParams, DO0: float = 2.0) -> Dict[str, float]:
    """Finds required PFR volume and HRT tau to achieve Se <= Se_target."""
    def objective(tau_trial: float) -> float:
        res = simulate_pfr(S0, Xb0, DO0, tau_trial, params, n_points=200)
        return res["effluent_S"] - Se_target

    tau_min = 0.01
    tau_max = 10.0

    res_min = simulate_pfr(S0, Xb0, DO0, tau_min, params, n_points=100)
    res_max = simulate_pfr(S0, Xb0, DO0, tau_max, params, n_points=100)

    if res_max["effluent_S"] > Se_target:
        tau_sol = 12.0
    elif res_min["effluent_S"] <= Se_target:
        tau_sol = tau_min
    else:
        tau_sol = brentq(objective, tau_min, tau_max, rtol=1e-4)

    res_final = simulate_pfr(S0, Xb0, DO0, tau_sol, params, n_points=300)
    V_sol = Q * tau_sol

    return {
        "V": V_sol,
        "tau": tau_sol,
        "Se": res_final["effluent_S"],
        "Xb": res_final["effluent_Xb"],
        "DO": res_final["effluent_DO"]
    }

def compare_reactors(Q: float, S0: float, Se_target: float, theta_c: float,
                      params: KineticParams, DO0: float = 1.0) -> SizingResult:
    """Performs unified fair comparison between CSTR and PFR designs."""
    cstr_res = size_cstr_for_target(Q, S0, Se_target, theta_c, params, DO0)
    # Match average operational biomass for fair comparison
    Xb_baseline = cstr_res["Xb"] if cstr_res["Xb"] > 100 else 2500.0
    pfr_res = size_pfr_for_target(Q, S0, Se_target, Xb_baseline, params, DO0)

    vol_ratio = cstr_res["V"] / pfr_res["V"] if pfr_res["V"] > 0 else float("inf")
    rem_pct = ((S0 - Se_target) / S0) * 100.0

    return SizingResult(
        Q=Q,
        S0=S0,
        Se_target=Se_target,
        V_cstr=cstr_res["V"],
        tau_cstr=cstr_res["tau"],
        Se_cstr=cstr_res["Se"],
        Xb_cstr=cstr_res["Xb"],
        V_pfr=pfr_res["V"],
        tau_pfr=pfr_res["tau"],
        Se_pfr=pfr_res["Se"],
        volume_ratio=vol_ratio,
        removal_pct=rem_pct
    )

def analytical_first_order_sizing(Q: float, S0: float, Se: float, k: float) -> Dict[str, float]:
    """Analytical baseline under first-order kinetics (-rS = k*S) for verification."""
    import math
    X_S = (S0 - Se) / S0
    V_cstr = (Q * X_S) / (k * (1.0 - X_S))
    V_pfr = (Q / k) * math.log(S0 / Se)
    ratio = V_cstr / V_pfr

    return {
        "X_S": X_S,
        "V_cstr": V_cstr,
        "V_pfr": V_pfr,
        "ratio": ratio
    }
