"""Reactor sizing and comparative calculations."""

from typing import Dict, Any
from scipy.optimize import brentq
from .kinetics import KineticParams
from .cstr import solve_cstr_steady_state
from .pfr import simulate_pfr

def size_cstr(Q: float, S0: float, Se_target: float, theta_c: float,
              params: KineticParams, DO0: float = 1.0) -> Dict[str, Any]:
    def objective(tau_trial: float) -> float:
        st = solve_cstr_steady_state(S0, DO0, tau_trial, theta_c, params)
        return st.S - Se_target

    tau_min = 0.05
    tau_max = 15.0

    s_min = solve_cstr_steady_state(S0, DO0, tau_min, theta_c, params).S
    s_max = solve_cstr_steady_state(S0, DO0, tau_max, theta_c, params).S

    if s_max > Se_target:
        tau_sol = 20.0
    elif s_min <= Se_target:
        tau_sol = tau_min
    else:
        tau_sol = brentq(objective, tau_min, tau_max, rtol=1e-4)

    st_final = solve_cstr_steady_state(S0, DO0, tau_sol, theta_c, params)
    V_sol = Q * tau_sol

    return {
        "V": round(V_sol, 2),
        "tau_days": round(tau_sol, 4),
        "tau_hours": round(tau_sol * 24.0, 2),
        "Se": round(st_final.S, 2),
        "Xb": round(st_final.Xb, 2),
        "DO": round(st_final.DO, 2)
    }

def size_pfr(Q: float, S0: float, Se_target: float, Xb0: float,
             params: KineticParams, DO0: float = 2.0) -> Dict[str, Any]:
    def objective(tau_trial: float) -> float:
        res = simulate_pfr(S0, Xb0, DO0, tau_trial, params, n_points=100)
        return res["effluent_S"] - Se_target

    tau_min = 0.01
    tau_max = 10.0

    res_min = simulate_pfr(S0, Xb0, DO0, tau_min, params, n_points=80)
    res_max = simulate_pfr(S0, Xb0, DO0, tau_max, params, n_points=80)

    if res_max["effluent_S"] > Se_target:
        tau_sol = 12.0
    elif res_min["effluent_S"] <= Se_target:
        tau_sol = tau_min
    else:
        tau_sol = brentq(objective, tau_min, tau_max, rtol=1e-4)

    res_final = simulate_pfr(S0, Xb0, DO0, tau_sol, params, n_points=200)
    V_sol = Q * tau_sol

    return {
        "V": round(V_sol, 2),
        "tau_days": round(tau_sol, 4),
        "tau_hours": round(tau_sol * 24.0, 2),
        "Se": round(res_final["effluent_S"], 2),
        "Xb": round(res_final["effluent_Xb"], 2),
        "DO": round(res_final["effluent_DO"], 2)
    }
