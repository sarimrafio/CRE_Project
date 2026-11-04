# Nomenclature & Unit Consistency Standard

To prevent dimensional errors, the project maintains strict SI-derived engineering units across all equations, Python scripts, databases, and reporting tables.

---

## 1. Primary Reaction Engineering Variables

| Symbol | Definition | Primary Engineering Unit | Internal SI Unit | Conversion Factor |
| :--- | :--- | :--- | :--- | :--- |
| $S$ | Biodegradable substrate concentration (bCOD basis) | $\mathrm{g\,COD/m^3}$ (or $\mathrm{mg\,COD/L}$) | $\mathrm{kg\,COD/m^3}$ | $1\,\mathrm{mg/L} = 10^{-3}\,\mathrm{kg/m^3}$ |
| $S_0$ | Influent biodegradable substrate | $\mathrm{mg\,COD/L}$ | $\mathrm{kg\,COD/m^3}$ | $10^{-3}$ |
| $S_e$ | Effluent biodegradable substrate | $\mathrm{mg\,COD/L}$ | $\mathrm{kg\,COD/m^3}$ | $10^{-3}$ |
| $X_b$ | Active biomass concentration | $\mathrm{mg\,VSS/L}$ | $\mathrm{kg\,VSS/m^3}$ | $10^{-3}$ |
| $DO$ | Dissolved oxygen concentration | $\mathrm{mg\,O_2/L}$ | $\mathrm{kg\,O_2/m^3}$ | $10^{-3}$ |
| $DO^*$ | Saturated dissolved oxygen concentration | $\mathrm{mg\,O_2/L}$ | $\mathrm{kg\,O_2/m^3}$ | $10^{-3}$ |
| $Q$ | Volumetric wastewater flow rate | $\mathrm{m^3/day}$ | $\mathrm{m^3/s}$ | $1 / 86400$ |
| $V$ | Reactor working volume | $\mathrm{m^3}$ | $\mathrm{m^3}$ | $1.0$ |
| $A$ | PFR cross-sectional area | $\mathrm{m^2}$ | $\mathrm{m^2}$ | $1.0$ |
| $L$ | PFR channel length | $\mathrm{m}$ | $\mathrm{m}$ | $1.0$ |
| $u$ | Superficial velocity ($Q/A$) | $\mathrm{m/day}$ | $\mathrm{m/s}$ | $1 / 86400$ |
| $\tau$ | Hydraulic retention time ($V/Q$) | $\mathrm{day}$ (or $\mathrm{h}$) | $\mathrm{s}$ | $86400$ (or $3600$) |
| $\theta_c$ | Solids retention time (sludge age) | $\mathrm{day}$ | $\mathrm{s}$ | $86400$ |

---

## 2. Biological Kinetic Parameters

| Symbol | Definition | Standard Engineering Unit | Typical Textile WW Range |
| :--- | :--- | :--- | :--- |
| $\mu_{\max}$ | Maximum specific microbial growth rate | $\mathrm{day^{-1}}$ | $0.5 - 6.0\,\mathrm{day^{-1}}$ |
| $K_S$ | Monod half-saturation constant for bCOD | $\mathrm{mg\,COD/L}$ | $20 - 250\,\mathrm{mg/L}$ |
| $K_O$ | Oxygen half-saturation constant | $\mathrm{mg\,O_2/L}$ | $0.1 - 0.5\,\mathrm{mg/L}$ |
| $Y$ | Biomass yield coefficient | $\mathrm{mg\,VSS / mg\,COD}$ | $0.3 - 0.65\,\mathrm{g\,VSS/g\,COD}$ |
| $b$ | Microbial endogenous decay rate | $\mathrm{day^{-1}}$ | $0.03 - 0.12\,\mathrm{day^{-1}}$ |
| $k_La$ | Volumetric oxygen mass transfer coefficient | $\mathrm{day^{-1}}$ (or $\mathrm{h^{-1}}$) | $2 - 20\,\mathrm{h^{-1}}$ ($48 - 480\,\mathrm{day^{-1}}$) |
| $\alpha_O$ | Stoichiometric oxygen demand coefficient | $\mathrm{mg\,O_2 / mg\,COD}$ removed | $0.35 - 0.70\,\mathrm{g\,O_2/g\,COD}$ |
| $X_S$ | Substrate fractional conversion | dimensionless | $0.0 - 1.0$ |
| $\eta_S$ | Percentage bCOD removal | $\%$ | $0 - 100\%$ |
