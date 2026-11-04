"""Unit tests for operational sustainability, energy, cost, and GHG calculations."""

import pytest
from textile_twin.sustainability import evaluate_sustainability, SustainabilityParams

def test_sustainability_metrics_positive_and_consistent():
    Q = 1000.0   # m^3/day
    V = 5000.0   # m^3
    S0 = 800.0   # mg/L
    Se = 80.0    # mg/L
    Xb = 2500.0  # mg/L
    theta_c = 10.0 # days

    res = evaluate_sustainability(Q, V, S0, Se, Xb, theta_c)

    assert res.total_energy_daily > 0.0
    assert res.energy_per_m3 > 0.0
    assert res.cost_per_m3 > 0.0
    assert res.ghg_per_m3 > 0.0
    assert res.sludge_production_daily > 0.0
    # Consistency check: Cost = energy * price
    p = SustainabilityParams()
    assert abs(res.cost_per_m3 - (res.energy_per_m3 * p.electricity_cost_kwh)) < 1e-6
