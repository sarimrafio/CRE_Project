# Mathematical Model Specification & Decision Memo

This document establishes the governing differential equations, reaction kinetics, stoichiometric relations, and physical decisions for the comparative design of CSTR and PFR biological reactors.

---

## 1. Key Physical & Reaction Engineering Decisions

### Decision 1: Substrate Definition ($S$)
- **Resolution:** $S$ represents **biodegradable soluble Chemical Oxygen Demand (bCOD)**, expressed in $\mathrm{mg\,COD/L}$ (or $\mathrm{g\,COD/m^3}$).
- **Justification:** Textile wastewater typically contains a non-biodegradable refractory COD fraction ($f_{\mathrm{nb}} = 0.20 - 0.45$) composed of synthetic polymers, azo dyes, and halogenated sizing chemicals. Treating total COD as homogeneous biodegradable substrate violates conservation principles and over-predicts biological removal. Refractory COD passes through unreacted ($S_{\mathrm{total,eff}} = S_e + \mathrm{COD}_{\mathrm{refractory}}$).

### Decision 2: Kinetic Formulation & Hierarchy
- **Primary Model (M2):** Dual-limitation Monod kinetics with endogenous decay and dissolved oxygen constraint:
  $$\mu_{\mathrm{eff}}(S, DO) = \mu_{\max} \left(\frac{S}{K_S + S}\right) \left(\frac{DO}{K_O + DO}\right)$$
  $$\mu_{\mathrm{net}} = \mu_{\mathrm{eff}} - b$$
- **Baseline Model (M0):** Pseudo first-order reaction $-r_S = kS$ for analytical verification against Fogler's classic reactor expressions.

### Decision 3: PFR Biomass Retention Resolution
- **Physical Analysis:** In an ideal continuous plug-flow channel without secondary settling and sludge return, active biomass is swept downstream. To prevent total biomass washout under high flow velocities, biological plug-flow systems in industry rely on **settling with Return Activated Sludge (RAS)** or **fixed-film biofilm attachments**.
- **Adopted Comparison Approach:**
  - **Baseline Hydrodynamic Comparison:** Both CSTR and PFR operate at identical effective cell residence time $\theta_c$ (SRT) to compare pure hydrodynamic efficiency at equal biological inventory.
  - **Explicit Physical Justification:** The PFR with sludge recycle maintains inlet biomass $X_{b,0} = \frac{R}{1+R} X_{b,\mathrm{recycle}}$, matching the solids retention achievable in the CSTR clarifier loop.

---

## 2. Complete Derivations (Fogler Methodology)

### 2.1 General Conservation Law
For any species $j$ in a control volume $V$:
$$\text{Rate of Accumulation} = \text{Rate In} - \text{Rate Out} + \text{Rate of Generation}$$
$$\frac{d(V C_j)}{dt} = Q_{\mathrm{in}} C_{j,\mathrm{in}} - Q_{\mathrm{out}} C_{j,\mathrm{out}} + r_j V$$

---

### 2.2 CSTR Derivations
Assuming constant volume $V$, constant density, and ideal micro-mixing ($C_{j,\mathrm{exit}} = C_{j,\mathrm{bulk}} = C_j$):

#### 1. Substrate Balance ($S$):
$$V \frac{dS}{dt} = Q(S_0 - S) - r_S V$$
Dividing by $V$ and substituting $\tau = V/Q$:
$$\frac{dS}{dt} = \frac{1}{\tau}(S_0 - S) - \frac{\mu_{\mathrm{eff}} X_b}{Y}$$

At steady state ($dS/dt = 0$):
$$\frac{S_0 - S}{\tau} = \frac{\mu_{\mathrm{eff}} X_b}{Y} \implies V_{\mathrm{CSTR}} = \frac{Q(S_0 - S_e) Y}{\mu_{\mathrm{eff}} X_b}$$

#### 2. Biomass Balance ($X_b$):
In an activated-sludge system with sludge wasting controlled by solids retention time $\theta_c$:
$$\frac{dX_b}{dt} = \left(\mu_{\mathrm{eff}} - b - \frac{1}{\theta_c}\right) X_b$$

At steady state ($X_b > 0$):
$$\mu_{\mathrm{eff}} = b + \frac{1}{\theta_c}$$
This fundamental relationship fixes the required substrate concentration $S_e$ inside the CSTR independently of reactor volume!
$$\mu_{\max} \left(\frac{S_e}{K_S + S_e}\right) \left(\frac{DO}{K_O + DO}\right) = b + \frac{1}{\theta_c}$$

Solving for $S_e$ when oxygen is non-limiting ($DO \gg K_O$):
$$S_e = \frac{K_S (b + 1/\theta_c)}{\mu_{\max} - (b + 1/\theta_c)}$$

#### 3. Dissolved Oxygen Balance ($DO$):
$$\frac{dDO}{dt} = \frac{1}{\tau}(DO_0 - DO) + k_La (DO^* - DO) - \alpha_O \left(\frac{\mu_{\mathrm{eff}} X_b}{Y}\right)$$
where $\alpha_O$ is the oxygen demand stoichiometric coefficient ($\mathrm{g\,O_2/g\,bCOD}$ removed).

---

### 2.3 PFR Derivations
For 1D plug flow along coordinate $z \in [0, L]$ with cross-sectional area $A$ and superficial liquid velocity $u = Q/A$:

#### 1. Substrate Profile ($S(z)$):
$$u \frac{dS}{dz} = - \frac{\mu_{\mathrm{eff}}(S, DO) X_b}{Y}$$
Boundary Condition at $z = 0$: $S(0) = S_0$.

#### 2. Biomass Profile ($X_b(z)$):
For suspended-growth advective flow with recycle boundary condition:
$$u \frac{dX_b}{dz} = (\mu_{\mathrm{eff}} - b) X_b$$
Boundary Condition at $z = 0$: $X_b(0) = X_{b,0}$.

#### 3. Dissolved Oxygen Profile ($DO(z)$):
$$u \frac{dDO}{dz} = k_La(DO^* - DO) - \alpha_O \left(\frac{\mu_{\mathrm{eff}} X_b}{Y}\right)$$
Boundary Condition at $z = 0$: $DO(0) = DO_0$.

#### 4. Residence Time & Reactor Volume:
$$\tau_{\mathrm{PFR}} = \int_0^L \frac{dz}{u} = \int_{S_e}^{S_0} \frac{Y \, dS}{\mu_{\mathrm{eff}}(S) X_b(S)}$$
$$V_{\mathrm{PFR}} = Q \times \tau_{\mathrm{PFR}} = A \times L$$

---

### 2.4 Analytical Limiting Case (Model M0: First-Order Kinetics)
When $-r_S = kS$:
- **CSTR Volume:**
  $$V_{\mathrm{CSTR}} = \frac{Q(S_0 - S_e)}{k S_e} = \frac{Q X_S}{k(1 - X_S)}$$
- **PFR Volume:**
  $$V_{\mathrm{PFR}} = \frac{Q}{k} \ln\left(\frac{S_0}{S_e}\right) = -\frac{Q}{k} \ln(1 - X_S)$$
- **Volume Ratio:**
  $$\frac{V_{\mathrm{CSTR}}}{V_{\mathrm{PFR}}} = \frac{X_S}{(1 - X_S) \ln[1/(1 - X_S)]}$$
  For $X_S = 0.90$ (90% removal), $V_{\mathrm{CSTR}} / V_{\mathrm{PFR}} \approx \frac{0.9}{0.1 \times 2.3026} \approx 3.91$.
  This analytical limit provides an exact benchmark for verifying the numerical ODE integrators.
