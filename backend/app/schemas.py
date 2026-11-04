"""Pydantic schemas for API requests and responses."""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class KineticModel(BaseModel):
    mu_max: float = Field(default=3.2, description="Maximum specific growth rate [1/day]")
    Ks: float = Field(default=65.0, description="Half-velocity constant [mg bCOD/L]")
    Ko: float = Field(default=0.20, description="Oxygen half-velocity constant [mg DO/L]")
    Y: float = Field(default=0.45, description="Biomass yield [g VSS / g bCOD]")
    b: float = Field(default=0.06, description="Endogenous decay rate [1/day]")
    kLa: float = Field(default=120.0, description="Oxygen mass transfer coefficient [1/day]")
    DO_sat: float = Field(default=8.2, description="DO saturation [mg/L]")
    alpha_O: float = Field(default=0.50, description="Oxygen consumption factor [g O2 / g bCOD]")

class SimulationRequest(BaseModel):
    Q: float = Field(default=1000.0, description="Wastewater flow rate [m^3/day]")
    S0: float = Field(default=750.0, description="Influent bCOD [mg/L]")
    Se_target: float = Field(default=75.0, description="Effluent target bCOD [mg/L]")
    theta_c: float = Field(default=10.0, description="Sludge retention time SRT [days]")
    kinetics: Optional[KineticModel] = None

class ProfileRequest(BaseModel):
    S0: float = Field(default=750.0, description="Influent bCOD [mg/L]")
    Xb0: float = Field(default=3876.9, description="Inlet biomass [mg VSS/L]")
    DO0: float = Field(default=2.0, description="Inlet DO [mg/L]")
    tau_days: float = Field(default=0.495, description="Total HRT [days]")
    n_points: int = Field(default=100, description="Number of spatial points")
    kinetics: Optional[KineticModel] = None

class TransientRequest(BaseModel):
    S0: float = Field(default=750.0, description="Influent bCOD [mg/L]")
    DO0: float = Field(default=1.0, description="Influent DO [mg/L]")
    tau_days: float = Field(default=0.490, description="CSTR HRT [days]")
    theta_c: float = Field(default=10.0, description="SRT [days]")
    initial_S: float = Field(default=750.0, description="Initial S in reactor [mg/L]")
    initial_Xb: float = Field(default=200.0, description="Initial seed biomass [mg VSS/L]")
    initial_DO: float = Field(default=4.0, description="Initial DO [mg/L]")
    days: float = Field(default=25.0, description="Simulation duration [days]")
    kinetics: Optional[KineticModel] = None

class PaperUpdateRequest(BaseModel):
    passcode: str = Field(..., description="Passcode required to edit the research paper (4554)")
    content_html: str = Field(..., description="Updated HTML content of the research paper")

