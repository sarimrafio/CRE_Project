"""Unit tests for PFR 1D spatial solver."""

import pytest
from textile_twin.kinetics import KineticParams
from textile_twin.pfr import simulate_pfr

@pytest.fixture
def test_setup():
    params = KineticParams(mu_max=3.0, Ks=80.0, Y=0.5, b=0.05, Ko=0.2)
    S0 = 800.0   # mg/L
    Xb0 = 2500.0 # mg/L
    DO0 = 2.0   # mg/L
    tau = 0.25  # 6 hours
    return params, S0, Xb0, DO0, tau

def test_pfr_monotonic_substrate_depletion(test_setup):
    params, S0, Xb0, DO0, tau = test_setup
    res = simulate_pfr(S0, Xb0, DO0, tau, params)

    # Substrate must monotonically decrease along reactor length
    S_profile = res["S"]
    for i in range(len(S_profile) - 1):
        assert S_profile[i] >= S_profile[i + 1] - 1e-6

    assert res["effluent_S"] < S0
    assert res["conversion"] > 0.50
