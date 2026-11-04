"""Operational Sustainability Assessment: Energy, Operating Cost, and Carbon Footprint."""

from dataclasses import dataclass
from typing import Dict, Any

@dataclass
class SustainabilityParams:
    """Techno-economic and environmental life-cycle inventory parameters."""
    sae: float = 1.8            # Standard Aeration Efficiency [kg O2 / kWh] (fine-bubble diffusers)
    mixing_power_density: float = 10.0 # Mixing power [W/m^3]
    pumping_energy_specific: float = 0.05 # Feed & recirculation pumping [kWh/m^3]
    electricity_cost_kwh: float = 0.095   # Industrial electricity price [USD/kWh] (Bangladesh EPZ tariff ~11.5 BDT/kWh)
    grid_emission_factor: float = 0.615   # Grid emission factor [kg CO2e / kWh] (Bangladesh national grid LCI)

@dataclass
class SustainabilityMetrics:
    """Sustainability footprint per cubic meter of wastewater treated [m^3]."""
    functional_unit: str
    q_daily: float                    # m^3/day
    v_reactor: float                  # m^3
    aeration_energy_daily: float      # kWh/day
    mixing_energy_daily: float        # kWh/day
    pumping_energy_daily: float       # kWh/day
    total_energy_daily: float         # kWh/day
    energy_per_m3: float              # kWh / m^3 treated
    cost_per_m3: float                # USD / m^3 treated
    ghg_per_m3: float                 # kg CO2e / m^3 treated
    sludge_production_daily: float    # kg VSS / day

def evaluate_sustainability(Q: float, V: float, S0: float, Se: float,
                            Xb: float, theta_c: float,
                            alpha_O: float = 0.50, b_decay: float = 0.05,
                            params: SustainabilityParams = None) -> SustainabilityMetrics:
    """Evaluates operational energy, operational cost, and GHG emissions for a reactor."""
    if params is None:
        params = SustainabilityParams()

    # Mass of bCOD removed daily [kg bCOD/day]
    # S in mg/L = g/m^3 -> kg = val * 1e-3
    bcod_removed_daily = Q * (S0 - Se) * 1e-3

    # Oxygen requirement: synthesis + endogenous respiration [kg O2/day]
    # OTR = alpha_O * bCOD_rem + 1.42 * b * V * Xb * 1e-3
    biomass_inventory = V * Xb * 1e-3 # kg VSS
    otr_daily = (alpha_O * bcod_removed_daily) + (1.42 * b_decay * biomass_inventory)

    # Aeration electric power [kWh/day]
    # E_aer = OTR / SAE
    aeration_kwh_daily = max(0.0, otr_daily / params.sae)

    # Mixing energy [kWh/day]
    # P_mix [kW] = (density * V) / 1000
    mixing_kw = (params.mixing_power_density * V) / 1000.0
    mixing_kwh_daily = mixing_kw * 24.0

    # Pumping energy [kWh/day]
    pumping_kwh_daily = Q * params.pumping_energy_specific

    total_kwh_daily = aeration_kwh_daily + mixing_kwh_daily + pumping_kwh_daily
    energy_per_m3 = total_kwh_daily / Q if Q > 0 else 0.0

    # Operating cost [USD/m^3]
    cost_per_m3 = energy_per_m3 * params.electricity_cost_kwh

    # Operational GHG emissions [kg CO2e / m^3]
    ghg_per_m3 = energy_per_m3 * params.grid_emission_factor

    # Sludge wasting rate [kg VSS/day]
    sludge_daily = biomass_inventory / theta_c if theta_c > 0 else 0.0

    return SustainabilityMetrics(
        functional_unit="Treatment of 1 m^3 of textile wastewater to target effluent standard",
        q_daily=Q,
        v_reactor=V,
        aeration_energy_daily=aeration_kwh_daily,
        mixing_energy_daily=mixing_kwh_daily,
        pumping_energy_daily=pumping_kwh_daily,
        total_energy_daily=total_kwh_daily,
        energy_per_m3=energy_per_m3,
        cost_per_m3=cost_per_m3,
        ghg_per_m3=ghg_per_m3,
        sludge_production_daily=sludge_daily
    )
