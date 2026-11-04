# Assumptions & Limitations Register

This document tracks all physical, mathematical, and operational assumptions used in the models to ensure complete scientific integrity.

---

## 1. Substrate & Biodegradability
- **Assumption:** The biological reactor model tracks **biodegradable organic substrate ($S$, bCOD)** rather than total COD.
- **Rationale:** Industrial textile effluent contains recalcitrant azo dyes, sizing agents, and synthetic surfactants. Assuming 100% biodegradability severely overestimates biological removal.
- **Traceability:** Total COD, soluble COD, and BOD/COD ratios are maintained as distinct observational fields in literature extraction tables.

---

## 2. Hydrodynamics
- **CSTR Assumption:** Ideal instantaneous macro- and micro-mixing throughout the tank volume ($S_{\mathrm{exit}} = S_{\mathrm{bulk}}$).
- **PFR Assumption:** Ideal 1D plug flow with uniform velocity profile across cross-section $A$, and zero axial back-mixing ($Pe \to \infty$).
- **Limitation:** Real aeration basins exhibit non-ideal flow (dispersion, dead zones, short-circuiting). Ideal reactors represent theoretical thermodynamic and reaction-engineering performance bounds.

---

## 3. Biomass Retention & Solids Retention Time (SRT)
- **CSTR Formulation:** Uses a reduced biomass-retention model characterized by an effective solids retention time ($\theta_c$), where biomass wasting rate is represented by $-X_b / \theta_c$.
- **PFR Physical Consistency Rule:** A naive distributed loss term $-X_b / \theta_c$ along the length of a plug-flow channel lacks physical justification without a clarifier and recycle loop (RAS).
  - *Route A (Ideal Suspended-Growth PFR):* Biomass flows advectively with liquid, growing and decaying along length $z$ ($u \, dX_b/dz = (\mu_{\mathrm{eff}} - b)X_b$).
  - *Route B (PFR with Clarifier & Recycle):* Biomass enters at $z=0$ boosted by recycle ratio $R$ and recycled biomass concentration $X_{b,r}$.
- **Decision:** Both routes will be investigated; if Route A is compared against a CSTR with cell recycle, the configuration difference will be explicitly reported.

---

## 4. Oxygen Transfer & Limiting Kinetics
- **Assumption:** Dual-limitation Monod kinetics:
  $$\mu_{\mathrm{eff}} = \mu_{\max} \left(\frac{S}{K_S + S}\right) \left(\frac{DO}{K_O + DO}\right)$$
- **Aeration:** Linear driving force $OTR = k_La(DO^* - DO)$, balanced against biological oxygen uptake rate (OUR).
- **Limitation:** Temperature and salinity effects on $DO^*$ and $k_La$ will be parameterized using published empirical correlations where supported.
