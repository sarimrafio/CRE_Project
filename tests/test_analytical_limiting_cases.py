"""Verification of CSTR vs PFR against Fogler's analytical first-order limiting cases."""

import pytest
import math
from textile_twin.reactor_design import analytical_first_order_sizing

def test_analytical_first_order_verification():
    Q = 1000.0   # m^3/day
    S0 = 1000.0  # mg/L
    Se = 100.0   # mg/L (90% removal, X_S = 0.90)
    k = 0.5      # 1/day

    res = analytical_first_order_sizing(Q, S0, Se, k)

    expected_X_S = 0.90
    expected_V_cstr = (1000.0 * 0.90) / (0.5 * 0.10) # 18,000 m^3
    expected_V_pfr = (1000.0 / 0.5) * math.log(10.0) # ~ 4,605.17 m^3
    expected_ratio = expected_V_cstr / expected_V_pfr # ~ 3.90865

    assert abs(res["X_S"] - expected_X_S) < 1e-6
    assert abs(res["V_cstr"] - expected_V_cstr) < 1e-4
    assert abs(res["V_pfr"] - expected_V_pfr) < 1e-2
    assert abs(res["ratio"] - expected_ratio) < 1e-3
