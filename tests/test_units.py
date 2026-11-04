"""Unit conversion and dimension verification tests."""

import pytest
from textile_twin.units import (
    mg_L_to_kg_m3, kg_m3_to_mg_L,
    days_to_hours, hours_to_days, m3_day_to_m3_s
)

def test_concentration_conversion():
    assert mg_L_to_kg_m3(1000.0) == 1.0
    assert kg_m3_to_mg_L(1.0) == 1000.0
    assert mg_L_to_kg_m3(0.0) == 0.0

def test_time_conversions():
    assert days_to_hours(1.0) == 24.0
    assert hours_to_days(24.0) == 1.0
    assert m3_day_to_m3_s(86400.0) == 1.0
