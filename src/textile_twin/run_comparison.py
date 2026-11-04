"""Run complete CSTR vs. PFR reactor design comparison and export figures & tables."""

import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

from textile_twin.kinetics import KineticParams
from textile_twin.reactor_design import compare_reactors, analytical_first_order_sizing
from textile_twin.cstr import simulate_cstr, CSTRState
from textile_twin.pfr import simulate_pfr
from textile_twin.sustainability import evaluate_sustainability, SustainabilityParams

def main():
    os.makedirs("results/tables", exist_ok=True)
    os.makedirs("results/figures", exist_ok=True)

    # 1. Primary Design Baseline (Knit Fabric Effluent, Orhon et al., 2003)
    Q = 1000.0         # m^3/day
    S0 = 750.0         # mg bCOD/L
    Se_target = 75.0   # mg bCOD/L (90% removal)
    theta_c = 10.0     # 10 days solids retention time
    params = KineticParams(
        mu_max=3.2,
        Ks=65.0,
        Y=0.45,
        b=0.06,
        Ko=0.20,
        alpha_O=0.50,
        kLa=120.0,
        DO_sat=8.5
    )

    print("==================================================================")
    print(" CSTR vs. PFR REACTION ENGINEERING COMPARISON (TEXTILE WASTEWATER)")
    print("==================================================================")

    res = compare_reactors(Q, S0, Se_target, theta_c, params)
    print(f"Influent Flow (Q)           : {res.Q:.1f} m^3/day")
    print(f"Influent bCOD (S0)          : {res.S0:.1f} mg/L")
    print(f"Target Effluent bCOD (Se)   : {res.Se_target:.1f} mg/L ({res.removal_pct:.1f}% removal)")
    print("------------------------------------------------------------------")
    print(f"CSTR Volume Required (V_cstr): {res.V_cstr:.1f} m^3 (HRT tau = {res.tau_cstr*24:.1f} hours)")
    print(f"CSTR Biomass Concentration   : {res.Xb_cstr:.1f} mg VSS/L")
    print(f"PFR Volume Required (V_pfr)  : {res.V_pfr:.1f} m^3 (HRT tau = {res.tau_pfr*24:.1f} hours)")
    print(f"Volume Ratio (V_cstr / V_pfr): {res.volume_ratio:.2f}x")
    print("------------------------------------------------------------------")

    # 2. Sustainability Evaluation
    sust_cstr = evaluate_sustainability(Q, res.V_cstr, S0, res.Se_cstr, res.Xb_cstr, theta_c, params.alpha_O, params.b)
    sust_pfr = evaluate_sustainability(Q, res.V_pfr, S0, res.Se_pfr, res.Xb_cstr, theta_c, params.alpha_O, params.b)

    print("SUSTAINABILITY & OPERATIONAL FOOTPRINT:")
    print(f"CSTR Energy per m^3 treated  : {sust_cstr.energy_per_m3:.3f} kWh/m^3 (Cost: ${sust_cstr.cost_per_m3:.4f}/m^3, GHG: {sust_cstr.ghg_per_m3:.3f} kg CO2e/m^3)")
    print(f"PFR Energy per m^3 treated   : {sust_pfr.energy_per_m3:.3f} kWh/m^3 (Cost: ${sust_pfr.cost_per_m3:.4f}/m^3, GHG: {sust_pfr.ghg_per_m3:.3f} kg CO2e/m^3)")
    print("==================================================================")

    # 3. Export Summary Table
    df_comparison = pd.DataFrame([
        {
            "Parameter": "Influent Flow (Q)",
            "Unit": "m^3/day",
            "CSTR": Q,
            "PFR": Q,
            "Notes": "Equal volumetric flow"
        },
        {
            "Parameter": "Influent bCOD (S0)",
            "Unit": "mg/L",
            "CSTR": S0,
            "PFR": S0,
            "Notes": "Orhon et al. (2003) primary baseline"
        },
        {
            "Parameter": "Effluent Target (Se)",
            "Unit": "mg/L",
            "CSTR": res.Se_cstr,
            "PFR": res.Se_pfr,
            "Notes": f"Target <= {Se_target} mg/L"
        },
        {
            "Parameter": "bCOD Removal Efficiency",
            "Unit": "%",
            "CSTR": res.removal_pct,
            "PFR": res.removal_pct,
            "Notes": "Equal conversion basis"
        },
        {
            "Parameter": "Reactor Working Volume (V)",
            "Unit": "m^3",
            "CSTR": round(res.V_cstr, 1),
            "PFR": round(res.V_pfr, 1),
            "Notes": f"Volume ratio = {res.volume_ratio:.2f}"
        },
        {
            "Parameter": "Hydraulic Retention Time (tau)",
            "Unit": "hours",
            "CSTR": round(res.tau_cstr * 24.0, 2),
            "PFR": round(res.tau_pfr * 24.0, 2),
            "Notes": "tau = V / Q"
        },
        {
            "Parameter": "Total Operational Energy",
            "Unit": "kWh / m^3",
            "CSTR": round(sust_cstr.energy_per_m3, 3),
            "PFR": round(sust_pfr.energy_per_m3, 3),
            "Notes": "Aeration + mixing + pumping"
        },
        {
            "Parameter": "Operating Electricity Cost",
            "Unit": "USD / m^3",
            "CSTR": round(sust_cstr.cost_per_m3, 4),
            "PFR": round(sust_pfr.cost_per_m3, 4),
            "Notes": "Based on $0.095/kWh tariff"
        },
        {
            "Parameter": "Carbon Footprint (GHG)",
            "Unit": "kg CO2e / m^3",
            "CSTR": round(sust_cstr.ghg_per_m3, 4),
            "PFR": round(sust_pfr.ghg_per_m3, 4),
            "Notes": "Grid EF = 0.615 kg CO2e/kWh"
        }
    ])
    df_comparison.to_csv("results/tables/cstr_pfr_comparison_table.csv", index=False)
    print("Saved comparison table to results/tables/cstr_pfr_comparison_table.csv")

    # 4. Generate Scientific Figures
    plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")

    # Figure 1: PFR 1D Axial Concentration Profiles
    pfr_sim = simulate_pfr(S0, res.Xb_cstr, 2.0, res.tau_pfr, params, n_points=300)
    fig, ax1 = plt.subplots(figsize=(8, 5))
    ax2 = ax1.twinx()

    l1 = ax1.plot(pfr_sim["fractional_length"], pfr_sim["S"], "b-", lw=2.5, label="bCOD Substrate S(z)")
    l2 = ax2.plot(pfr_sim["fractional_length"], pfr_sim["DO"], "g--", lw=2, label="Dissolved Oxygen DO(z)")

    ax1.set_xlabel("Normalized Reactor Length (z / L)", fontsize=12, fontweight="bold")
    ax1.set_ylabel("Biodegradable COD [mg/L]", color="b", fontsize=12, fontweight="bold")
    ax2.set_ylabel("Dissolved Oxygen [mg/L]", color="g", fontsize=12, fontweight="bold")
    ax1.tick_params(axis="y", labelcolor="b")
    ax2.tick_params(axis="y", labelcolor="g")
    plt.title("Axial Profiles in Ideal Plug-Flow Biological Reactor (PFR)", fontsize=13, fontweight="bold")
    lines = l1 + l2
    labels = [l.get_label() for l in lines]
    ax1.legend(lines, labels, loc="center right", frameon=True)
    plt.tight_layout()
    plt.savefig("results/figures/fig_pfr_axial_profiles.png", dpi=300)
    plt.close()

    # Figure 2: Volume vs. Conversion (Fogler Levenspiel Plot Comparison)
    conversions = np.linspace(0.50, 0.98, 25)
    v_c_list = []
    v_p_list = []
    for conv in conversions:
        target_s = S0 * (1.0 - conv)
        r = compare_reactors(Q, S0, target_s, theta_c, params)
        v_c_list.append(r.V_cstr)
        v_p_list.append(r.V_pfr)

    plt.figure(figsize=(8, 5))
    plt.plot(conversions * 100, v_c_list, "r-o", lw=2, label="CSTR Volume Requirement")
    plt.plot(conversions * 100, v_p_list, "b-s", lw=2, label="PFR Volume Requirement")
    plt.xlabel("bCOD Removal Conversion (%)", fontsize=12, fontweight="bold")
    plt.ylabel("Required Reactor Volume (m³)", fontsize=12, fontweight="bold")
    plt.title("Comparative Reactor Volume vs. bCOD Conversion (Fogler Sizing)", fontsize=13, fontweight="bold")
    plt.legend(frameon=True, fontsize=11)
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.tight_layout()
    plt.savefig("results/figures/fig_volume_vs_conversion.png", dpi=300)
    plt.close()

    # Figure 3: Operational Sustainability Comparison (Energy & GHG)
    fig, (ax_en, ax_ghg) = plt.subplots(1, 2, figsize=(10, 4.5))
    categories = ["Ideal CSTR", "Ideal PFR"]
    energies = [sust_cstr.energy_per_m3, sust_pfr.energy_per_m3]
    ghgs = [sust_cstr.ghg_per_m3, sust_pfr.ghg_per_m3]

    ax_en.bar(categories, energies, color=["#d9534f", "#337ab7"], width=0.5)
    ax_en.set_ylabel("Specific Energy Consumption [kWh / m³]", fontsize=11, fontweight="bold")
    ax_en.set_title("Operational Energy Intensity", fontsize=12, fontweight="bold")
    for i, v in enumerate(energies):
        ax_en.text(i, v + 0.01, f"{v:.3f}", ha="center", fontweight="bold")

    ax_ghg.bar(categories, ghgs, color=["#d9534f", "#337ab7"], width=0.5)
    ax_ghg.set_ylabel("Carbon Footprint [kg CO₂e / m³]", fontsize=11, fontweight="bold")
    ax_ghg.set_title("Operational GHG Emissions", fontsize=12, fontweight="bold")
    for i, v in enumerate(ghgs):
        ax_ghg.text(i, v + 0.01, f"{v:.3f}", ha="center", fontweight="bold")

    plt.tight_layout()
    plt.savefig("results/figures/fig_sustainability_comparison.png", dpi=300)
    plt.close()

    print("Generated all publication figures in results/figures/")

if __name__ == "__main__":
    main()
