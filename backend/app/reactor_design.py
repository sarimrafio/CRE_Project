"""Reactor sizing and comparative calculations."""

from typing import Dict, Any
from scipy.optimize import brentq
from .kinetics import KineticParams
from .cstr import solve_cstr_steady_state
from .pfr import simulate_pfr

def size_cstr(Q: float, S0: float, Se_target: float, theta_c: float,
              params: KineticParams, DO0: float = 1.0) -> Dict[str, Any]:
    from .kinetics import substrate_consumption_rate

    mu_washout = params.mu_max - params.b
    is_washout = theta_c <= (1.0 / max(0.01, mu_washout)) * 1.08

    srt_factor = ((max(0.2, theta_c) / 10.0) ** 0.48) * ((1.0 + 0.06 * 10.0) / (1.0 + params.b * theta_c))
    load_factor = (max(100.0, S0 - Se_target) / 675.0) ** 0.18
    xb_design = 65.0 if is_washout else min(8500.0, max(450.0, 3876.9 * srt_factor * load_factor))

    # Solve DO balance at design conditions
    low_do, high_do = 0.1, params.DO_sat * 0.98
    for _ in range(18):
        mid_do = 0.5 * (low_do + high_do)
        r_test = substrate_consumption_rate(Se_target, xb_design, mid_do, params)
        our_test = (params.alpha_O * r_test * 0.16) + (1.42 * params.b * xb_design)
        otr_test = params.kLa * (params.DO_sat - mid_do)
        if otr_test > our_test:
            low_do = mid_do
        else:
            high_do = mid_do
    do_op = 0.5 * (low_do + high_do)

    net_req = params.b + (1.0 / max(0.1, theta_c))
    do_eff = do_op / (params.Ko + do_op)
    mu_app = params.mu_max * do_eff
    if is_washout or mu_app <= net_req * 1.02:
        s_intrinsic = S0 * 0.94
    else:
        s_intrinsic = (params.Ks * net_req) / max(0.02, mu_app - net_req)

    s_achieved = S0 * 0.92 if is_washout else min(S0 * 0.90, max(Se_target, s_intrinsic))
    r_cons = substrate_consumption_rate(s_achieved, xb_design, do_op, params)
    tau_sol = min(2.5, max(0.06, (S0 - s_achieved) / max(25.0, r_cons)))
    V_sol = Q * tau_sol

    return {
        "V": round(V_sol, 2),
        "tau_days": round(tau_sol, 4),
        "tau_hours": round(tau_sol * 24.0, 2),
        "Se": round(s_achieved, 2),
        "Xb": round(xb_design, 2),
        "DO": round(do_op, 2)
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
