# Research Scope & Boundary Definitions

## 1. Title & Research Question
- **Working Title:** Comparative Dynamic Modelling, Design, and Sustainability Optimization of CSTR and PFR Systems for Biological Treatment of Textile Wastewater: A Literature-Calibrated Digital Twin Approach
- **Research Question:** How do ideal CSTR and PFR configurations compare in the biological treatment of textile wastewater when biodegradable substrate degradation, microbial growth, biomass decay/retention, and oxygen availability are represented using an advanced Monod kinetic model?

---

## 2. System Boundary
```
   [ Textile Wastewater Influent ]
               │
               ▼
   ┌───────────────────────────────────────────────┐
   │         CORE BIOLOGICAL REACTOR BOUNDARY       │
   │                                               │
   │    CSTR or PFR Biological Aeration Tank       │
   │    - Biodegradable Substrate (bCOD) Removal   │
   │    - Active Microbial Growth & Decay (Xb)     │
   │    - Dissolved Oxygen (DO) & Aeration Transfer│
   │                                               │
   └───────────────────────┬───────────────────────┘
                           │
                           ▼
   [ Effluent: Target bCOD ≤ Setpoint, Sludge Output ]
```

### Inclusions (Within Core Model)
- Aerobic microbial degradation of biodegradable chemical oxygen demand ($S$, bCOD).
- Active biomass dynamics ($X_b$) with specific growth ($\mu$) and endogenous decay ($b$).
- Oxygen transfer from bubble aeration ($k_La$) and oxygen uptake rate (OUR).
- Comparative reactor hydrodynamics: CSTR (well-mixed) vs. PFR (plug-flow, zero axial dispersion).
- Direct operational sustainability: aeration blower power, pumping, operating electrical costs, and grid carbon footprint.

### Exclusions (Documented as External Pre/Post Treatment)
- Coagulation/flocculation, Fenton oxidation, electrochemical decolorization, reverse osmosis, and sludge digestors. (Described as context in literature review, but omitted from reactor kinetic balance).
- Non-biodegradable refractory COD (treated as conservative background, not assimilated by aerobic heterotrophic biomass).
