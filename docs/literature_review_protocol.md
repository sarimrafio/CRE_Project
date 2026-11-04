# Literature Review & Evidence Protocol

Following PRISMA 2020 principles for traceable scientific data gathering.

---

## 1. Search Strategy & Lawful Access
Searches will be performed against peer-reviewed bibliographic metadata engines:
- OpenAlex API / Crossref
- Scopus / Web of Science (via academic subscriptions)
- PubMed / Google Scholar
- Institutional Open Access Repositories / Unpaywall

---

## 2. Canonical Search Queries
1. **Textile Wastewater Biodegradability & COD Fractionation:**
   ```text
   ("textile wastewater" OR "textile effluent" OR "dyeing wastewater") AND ("biological treatment" OR "activated sludge" OR "aerobic treatment") AND (COD OR "biodegradable COD" OR biodegradability)
   ```
2. **Monod Kinetics for Textile Effluent Biodegradation:**
   ```text
   ("textile wastewater" OR "textile effluent") AND (Monod OR "growth kinetics" OR "biodegradation kinetics") AND ("maximum specific growth rate" OR "half saturation constant" OR yield)
   ```
3. **CSTR vs. PFR Reactor Comparisons in Biological Treatment:**
   ```text
   (CSTR OR "continuous stirred tank reactor") AND (PFR OR "plug flow reactor") AND ("biological wastewater treatment" OR "activated sludge") AND ("reactor design" OR "residence time" OR kinetics)
   ```

---

## 3. Inclusion & Exclusion Criteria
### Inclusion
- Peer-reviewed empirical studies focusing on biological treatment of real or simulated textile wastewater.
- Explicit reporting of reactor volume, flow, HRT, influent/effluent concentrations, and biomass levels.
- Direct reporting of Monod kinetic parameters or time-series curves allowing non-linear regression.

### Exclusion
- Abstract-only or review articles lacking original experimental data.
- Studies with ambiguous or contradictory unit definitions.
- Works reporting only dye decolorization by dead adsorbents without biological cell growth/metabolism.

---

## 4. Evidence Classification Grades
- **Grade A:** Full-scale or pilot textile biological plant with complete mass balances and operating conditions.
- **Grade B:** Controlled laboratory-scale bioreactor on textile effluent with validated kinetic tracking.
- **Grade C:** Partial data or transferred parameters from industrial organic effluents (used strictly for sensitivity ranges).
- **Grade D:** Abstract-only, qualitative discussions (background context only; excluded from quantitative parameter estimation).
