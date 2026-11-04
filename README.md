# Comparative CSTR and PFR Design for Biological Wastewater Treatment
### Industrial Application: Textile Wastewater Treatment Using Advanced Monod Kinetics

This repository contains the complete research, chemical reaction engineering models, numerical simulation engine, sustainability analysis, and digital twin interface for **Project 24** of the Chemical Reaction Engineering course.

---

## 🔬 Project Overview
- **Core Subject:** Chemical Reaction Engineering (CRE) — Reactor design following Fogler's methodology.
- **System:** Aerobic biological degradation of biodegradable organic matter (bCOD) from industrial textile wastewater.
- **Reactors Compared:** Ideal Continuous Stirred-Tank Reactor (CSTR) vs. Ideal Plug-Flow Reactor (PFR).
- **Biological Kinetics:** Advanced Monod kinetics accounting for active biomass growth, endogenous decay, solids retention time (SRT), and dissolved oxygen limitation ($K_O, k_La$).
- **Sustainability Scope:** Operational energy consumption (aeration, mixing, pumping), operating costs, and electricity-related greenhouse gas (GHG) emissions.

---

## 📂 Repository Structure
```
textile_wastewater_cre_project/
├── PROJECT_MASTER_BRIEF.md    # Master specifications and project standards
├── PROJECT_STATUS.md          # Traceable milestone progress log
├── CHANGELOG.md               # Version history
├── README.md                  # This file
├── docs/                      # Scientific documentation & guideline summaries
│   ├── Project Guideline.pdf  # Course document
│   ├── official_guideline_summary.md
│   ├── research_scope.md
│   ├── mathematical_model.md
│   ├── assumptions_and_limitations.md
│   └── claim_source_ledger.md
├── data/                      # Evidence databases & extraction records
│   ├── raw/
│   ├── processed/
│   ├── source_register.csv
│   ├── kinetic_parameters.csv
│   └── wastewater_profiles.csv
├── src/textile_twin/          # Scientific Python package
│   ├── kinetics.py
│   ├── cstr.py
│   ├── pfr.py
│   ├── reactor_design.py
│   ├── optimization.py
│   └── sustainability.py
├── tests/                     # Unit and mass-balance tests
├── results/                   # Generated tables, figures, and plots
└── report/                    # Final academic report & presentation
```

---

## 🚀 Getting Started
```powershell
# Recommended workspace:
cd "C:\Users\Sarim Sadman Rafio\.gemini\antigravity\scratch\textile_wastewater_cre_project"

# Run tests
pytest tests/
```
