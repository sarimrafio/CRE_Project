"""Sustainability Metrics & Techno-Economic Assessment."""

from dataclasses import dataclass
from typing import Dict, Any

@dataclass
class SustainabilityParams:
    sae: float = 1.8                     # Standard Aeration Efficiency [kg O2 / kWh]
    mixing_power_density: float = 10.0   # Mixing power [W/m^3]
    pumping_energy_specific: float = 0.05# Pumping [kWh/m^3]
    electricity_cost_kwh: float = 0.095  # Industrial electricity [USD/kWh]
    grid_emission_factor: float = 0.615  # Grid GHG factor [kg CO2e / kWh]

def calculate_sustainability(Q: float, V: float, S0: float, Se: float,
                             Xb: float, theta_c: float,
                             alpha_O: float = 0.50, b_decay: float = 0.06,
                             params: SustainabilityParams = None) -> Dict[str, Any]:
    if params is None:
        params = SustainabilityParams()

    bcod_removed_daily = Q * (S0 - Se) * 1e-3
    biomass_inventory = V * Xb * 1e-3
    otr_daily = (alpha_O * bcod_removed_daily) + (1.42 * b_decay * biomass_inventory)

    aeration_kwh_daily = max(0.0, otr_daily / params.sae)
    mixing_kw = (params.mixing_power_density * V) / 1000.0
    mixing_kwh_daily = mixing_kw * 24.0
    pumping_kwh_daily = Q * params.pumping_energy_specific

    total_kwh_daily = aeration_kwh_daily + mixing_kwh_daily + pumping_kwh_daily
    energy_per_m3 = total_kwh_daily / Q if Q > 0 else 0.0
    cost_per_m3 = energy_per_m3 * params.electricity_cost_kwh
    ghg_per_m3 = energy_per_m3 * params.grid_emission_factor
    sludge_daily = biomass_inventory / theta_c if theta_c > 0 else 0.0

    return {
        "v_reactor_m3": round(V, 2),
        "aeration_kwh_day": round(aeration_kwh_daily, 2),
        "mixing_kwh_day": round(mixing_kwh_daily, 2),
        "pumping_kwh_day": round(pumping_kwh_daily, 2),
        "total_energy_kwh_day": round(total_kwh_daily, 2),
        "energy_kwh_per_m3": round(energy_per_m3, 4),
        "cost_usd_per_m3": round(cost_per_m3, 4),
        "ghg_kg_co2e_per_m3": round(ghg_per_m3, 4),
        "sludge_kg_vss_day": round(sludge_daily, 2)
    }
