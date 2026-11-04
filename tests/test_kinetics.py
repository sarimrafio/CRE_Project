"""Unit tests for Monod kinetics and limiting behaviors."""

import pytest
from textile_twin.kinetics import (
    KineticParams, specific_growth_rate,
    substrate_consumption_rate, oxygen_uptake_rate
)

@pytest.fixture
def standard_params():
    return KineticParams(
        mu_max=3.0,
        Ks=100.0,
        Y=0.5,
        b=0.05,
        Ko=0.2,
        alpha_O=0.5
    )

def test_zero_growth_at_zero_substrate(standard_params):
    mu = specific_growth_rate(0.0, 5.0, standard_params)
    assert mu == 0.0

def test_zero_growth_at_zero_oxygen(standard_params):
    mu = specific_growth_rate(500.0, 0.0, standard_params)
    assert mu == 0.0

def test_asymptotic_growth_at_saturating_substrate(standard_params):
    # S >> Ks and DO >> Ko -> mu approaches mu_max
    mu = specific_growth_rate(1e6, 1e4, standard_params)
    assert abs(mu - standard_params.mu_max) < 0.001

def test_half_saturation_constant(standard_params):
    # At S = Ks, DO >> Ko -> mu should be 0.5 * mu_max
    mu = specific_growth_rate(standard_params.Ks, 100.0, standard_params)
    assert abs(mu - 0.5 * standard_params.mu_max) < 0.01

def test_invalid_parameters():
    with pytest.raises(ValueError):
        KineticParams(mu_max=-1.0, Ks=100.0, Y=0.5, b=0.05).validate()
    with pytest.raises(ValueError):
        KineticParams(mu_max=3.0, Ks=-50.0, Y=0.5, b=0.05).validate()
    with pytest.raises(ValueError):
        KineticParams(mu_max=3.0, Ks=100.0, Y=1.5, b=0.05).validate()
