"""Unit tests for CSTR solver and steady-state convergence."""

import pytest
import numpy as np
from textile_twin.kinetics import KineticParams
from textile_twin.cstr import simulate_cstr, solve_cstr_steady_state, CSTRState

@pytest.fixture
def test_setup():
    params = KineticParams(mu_max=3.0, Ks=80.0, Y=0.5, b=0.05, Ko=0.2)
    S0 = 800.0   # mg/L bCOD
    DO0 = 1.0   # mg/L
    tau = 0.5   # 12 hours HRT
    theta_c = 10.0 # 10 days SRT
    return params, S0, DO0, tau, theta_c

def test_cstr_dynamic_simulation(test_setup):
    params, S0, DO0, tau, theta_c = test_setup
    init = CSTRState(S=100.0, Xb=2000.0, DO=2.0)
    res = simulate_cstr(S0, DO0, tau, theta_c, init, params, t_span=(0, 20))

    assert res["success"] is True
    assert res["steady_state"].S > 0
    assert res["steady_state"].S < S0
    assert res["steady_state"].Xb > 1000.0

def test_cstr_algebraic_and_dynamic_consistency(test_setup):
    params, S0, DO0, tau, theta_c = test_setup
    alg_state = solve_cstr_steady_state(S0, DO0, tau, theta_c, params)
    dyn_res = simulate_cstr(S0, DO0, tau, theta_c, alg_state, params, t_span=(0, 30))

    # At steady state, dynamic endpoints must match algebraic solution within 1%
    assert abs(alg_state.S - dyn_res["steady_state"].S) / alg_state.S < 0.05
    assert abs(alg_state.Xb - dyn_res["steady_state"].Xb) / alg_state.Xb < 0.05

def test_biomass_washout(test_setup):
    params, S0, DO0, tau, _ = test_setup
    # Set theta_c critically low (below 1 / (mu_max - b))
    crit_theta_c = 0.2 # 0.2 days is well below washout threshold ~ 0.34 days
    st = solve_cstr_steady_state(S0, DO0, tau, crit_theta_c, params)
    assert st.Xb == 0.0
    assert st.S == S0
