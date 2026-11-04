"""Unit conversion and validation utilities for Chemical Reaction Engineering."""

def mg_L_to_kg_m3(val: float) -> float:
    """Convert mg/L to kg/m^3 (1 mg/L = 0.001 kg/m^3 = 1 g/m^3)."""
    return val * 1e-3

def kg_m3_to_mg_L(val: float) -> float:
    """Convert kg/m^3 to mg/L."""
    return val * 1e3

def days_to_hours(days: float) -> float:
    """Convert days to hours."""
    return days * 24.0

def hours_to_days(hours: float) -> float:
    """Convert hours to days."""
    return hours / 24.0

def m3_day_to_m3_s(flow: float) -> float:
    """Convert m^3/day to m^3/s."""
    return flow / 86400.0
