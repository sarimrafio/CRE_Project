# Official Course Guideline Summary

**Controlling Document:** `Project Guideline.pdf`  
**Physical File Location in Project:** `docs/Project Guideline.pdf`  
**Team Structure:** 4 Students per Group  

---

## 1. Selected Project Topic
Listed under **Area 5: Permaculture, Nutrient Cycling and Environmental Processes**:
> **24. Comparative CSTR and PFR Design for Biological Wastewater Treatment**

*(Industrial application refined in consultation with team: Aerobic biological treatment of textile wastewater with advanced Monod kinetics).*

---

## 2. Mandatory 4-Step Methodology

### Step 1 — Literature Data Collection
- Collect published biological reaction-rate expressions.
- Extract kinetic parameters ($\mu_{\max}, K_S, K_O, Y, b$).
- Identify standard operating conditions (HRT, SRT, pH, temperature, DO, $k_La$).
- Record conversion and effluent quality data for industrial wastewater.
- Gather process energy requirements (kWh/m³ treated).

### Step 2 — Reaction Engineering Calculations
- Apply **Fogler's methodology**:
  1. Mole balance on chemical/biological species.
  2. Rate law formulation (Monod kinetics with biomass and oxygen terms).
  3. Stoichiometry & yield relations ($Y_{X/S}$).
  4. Combination and integration into reactor design equations.
- Calculate conversion ($X_S$), hydraulic residence time ($\tau$), reactor working volume ($V$), and biomass retention ($\theta_c$).

### Step 3 — Simulation and Optimization
- Implement mathematical models in Python (NumPy, SciPy).
- Compare CSTR and PFR behavior under identical influent, kinetic, and effluent targets.
- Vary operating conditions and perform systematic sensitivity analysis.
- Optimize reactor volume and operational energy.

### Step 4 — Sustainability Assessment
- Estimate operational energy consumption (aeration, pumping, mixing).
- Account for material/chemical requirements and biological waste/sludge generation.
- Calculate operational GHG emissions using verified regional grid emission factors.
- Ensure all assumptions and life-cycle inventory (LCI) data are transparent and referenced.
