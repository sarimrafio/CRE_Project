"""Dual-Limitation Monod Biological Reaction Kinetics."""

from dataclasses import dataclass

@dataclass
class KineticParams:
    """Calibrated dual-limitation Monod parameters for textile effluent."""
    mu_max: float = 3.2        # Maximum specific growth rate [1/day]
    Ks: float = 65.0           # Half-saturation constant for bCOD [mg/L]
    Ko: float = 0.20           # Half-saturation constant for DO [mg/L]
    Y: float = 0.45            # Biomass yield coefficient [g VSS / g bCOD]
    b: float = 0.06            # Endogenous biomass decay coefficient [1/day]
    kLa: float = 120.0         # Volumetric oxygen mass transfer coefficient [1/day]
    DO_sat: float = 8.2        # Dissolved oxygen saturation at 25 deg C [mg/L]
    alpha_O: float = 0.50      # Oxygen consumed per unit bCOD oxidized [g O2 / g bCOD]

    def validate(self) -> None:
        """Enforce thermodynamic and biological feasibility bounds."""
        if self.mu_max <= 0:
            raise ValueError("mu_max must be positive.")
        if self.Ks <= 0:
            raise ValueError("Ks must be positive.")
        if self.Ko <= 0:
            raise ValueError("Ko must be positive.")
        if not (0.0 < self.Y <= 1.0):
            raise ValueError(f"Yield Y={self.Y} must be strictly in (0, 1].")
        if self.b < 0:
            raise ValueError("Decay coefficient b must be non-negative.")
        if self.kLa <= 0:
            raise ValueError("kLa must be positive.")
        if self.DO_sat <= 0:
            raise ValueError("DO_sat must be positive.")

def specific_growth_rate(S: float, DO: float, params: KineticParams) -> float:
    """Calculates specific growth rate mu(S, DO) [1/day]."""
    s_term = max(0.0, S) / (params.Ks + max(0.0, S))
    o_term = max(0.0, DO) / (params.Ko + max(0.0, DO))
    return params.mu_max * s_term * o_term

def substrate_consumption_rate(S: float, Xb: float, DO: float, params: KineticParams) -> float:
    """Substrate consumption rate -r_S = (mu * Xb) / Y [mg bCOD / (L * day)]."""
    mu_eff = specific_growth_rate(S, DO, params)
    return (mu_eff * max(0.0, Xb)) / params.Y

def oxygen_uptake_rate(S: float, Xb: float, DO: float, params: KineticParams) -> float:
    """Oxygen uptake rate OUR [mg O2 / (L * day)]."""
    r_cons = substrate_consumption_rate(S, Xb, DO, params)
    endogenous = 1.42 * params.b * max(0.0, Xb)
    return (params.alpha_O * r_cons) + endogenous
