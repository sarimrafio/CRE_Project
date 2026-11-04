"""Biological reaction kinetics modules for textile wastewater treatment."""

from dataclasses import dataclass
import numpy as np

@dataclass
class KineticParams:
    """Monod and biological growth parameters with strict dimensional typing."""
    mu_max: float        # Maximum specific growth rate [1/day]
    Ks: float            # Half-velocity constant for bCOD [mg/L]
    Y: float             # Biomass yield [mg VSS / mg bCOD]
    b: float             # Endogenous decay coefficient [1/day]
    Ko: float = 0.20     # Oxygen half-saturation constant [mg O2/L]
    alpha_O: float = 0.50 # Stoichiometric oxygen demand coefficient [mg O2 / mg bCOD]
    kLa: float = 120.0   # Volumetric mass transfer coefficient [1/day] (approx 5 1/h)
    DO_sat: float = 8.5  # Saturated DO at standard operating temperature [mg/L]

    def validate(self) -> None:
        """Enforce physical validity of biological parameters."""
        if self.mu_max <= 0:
            raise ValueError("mu_max must be positive.")
        if self.Ks <= 0:
            raise ValueError("Ks must be positive.")
        if not (0 < self.Y <= 1.0):
            raise ValueError("Yield Y must be between 0 and 1.0 mg VSS/mg bCOD.")
        if self.b < 0:
            raise ValueError("Endogenous decay rate b cannot be negative.")
        if self.Ko <= 0:
            raise ValueError("Oxygen half-saturation Ko must be positive.")

def specific_growth_rate(S: float, DO: float, params: KineticParams) -> float:
    """Calculate dual-limited effective specific growth rate mu_eff [1/day].

    mu_eff = mu_max * [S / (Ks + S)] * [DO / (Ko + DO)]
    """
    S_eff = max(0.0, float(S))
    DO_eff = max(0.0, float(DO))

    f_substrate = S_eff / (params.Ks + S_eff) if (params.Ks + S_eff) > 0 else 0.0
    f_oxygen = DO_eff / (params.Ko + DO_eff) if (params.Ko + DO_eff) > 0 else 0.0

    return params.mu_max * f_substrate * f_oxygen

def substrate_consumption_rate(S: float, Xb: float, DO: float, params: KineticParams) -> float:
    """Rate of substrate consumption -r_S [mg bCOD / (L * day)].

    -r_S = (mu_eff * Xb) / Y
    """
    mu_eff = specific_growth_rate(S, DO, params)
    Xb_eff = max(0.0, float(Xb))
    return (mu_eff * Xb_eff) / params.Y

def oxygen_uptake_rate(S: float, Xb: float, DO: float, params: KineticParams) -> float:
    """Biological Oxygen Uptake Rate (OUR) [mg O2 / (L * day)].

    OUR = alpha_O * (-r_S) + (1.42 * b * Xb) [endogenous respiration]
    """
    r_S_cons = substrate_consumption_rate(S, Xb, DO, params)
    Xb_eff = max(0.0, float(Xb))
    return params.alpha_O * r_S_cons + (1.42 * params.b * Xb_eff)
