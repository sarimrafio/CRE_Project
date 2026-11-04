"""FastAPI Digital Twin Service for Industrial Textile Wastewater Treatment."""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
import numpy as np

from .kinetics import KineticParams, substrate_consumption_rate
from .cstr import simulate_cstr, CSTRState
from .pfr import simulate_pfr
from .reactor_design import size_cstr, size_pfr
from .sustainability import calculate_sustainability
from .schemas import SimulationRequest, ProfileRequest, TransientRequest, KineticModel, PaperUpdateRequest

PAPER_PASSCODE = "4554"
PAPER_STORAGE_PATH = os.path.join(os.path.dirname(__file__), "saved_paper.json")


app = FastAPI(
    title="Bioreactor Digital Twin API",
    description="CRE Comparative CSTR and PFR Simulation for Biological Textile Wastewater Treatment",
    version="1.0.0"
)

# Enable CORS for frontend web application (Vercel, localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _build_params(k_model: KineticModel | None) -> KineticParams:
    if k_model is None:
        return KineticParams()
    return KineticParams(
        mu_max=k_model.mu_max,
        Ks=k_model.Ks,
        Ko=k_model.Ko,
        Y=k_model.Y,
        b=k_model.b,
        kLa=k_model.kLa,
        DO_sat=k_model.DO_sat,
        alpha_O=k_model.alpha_O
    )

@app.get("/")
def read_root():
    return {
        "service": "Bioreactor Digital Twin API",
        "description": "Comparative CSTR vs PFR for Textile Wastewater Treatment",
        "version": "1.0.0",
        "status": "online"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/api/calibrated-defaults")
def get_defaults():
    return {
        "wastewater": {
            "source": "Industrial Textile Dyeing & Finishing Effluent",
            "reference": "Solís et al. (2012), Metcalf & Eddy (2014)",
            "Q_m3_day": 1000.0,
            "S0_mg_bCOD_L": 750.0,
            "Se_target_mg_L": 75.0,
            "theta_c_days": 10.0,
            "T_celsius": 25.0
        },
        "kinetics": {
            "mu_max_day": 3.2,
            "Ks_mg_L": 65.0,
            "Ko_mg_L": 0.20,
            "Y_g_g": 0.45,
            "b_day": 0.06,
            "kLa_day": 120.0,
            "DO_sat_mg_L": 8.2,
            "alpha_O_g_g": 0.50
        }
    }

@app.post("/api/simulate/compare")
def compare_reactors_endpoint(req: SimulationRequest):
    try:
        params = _build_params(req.kinetics)
        params.validate()

        # Size CSTR
        cstr = size_cstr(req.Q, req.S0, req.Se_target, req.theta_c, params)

        # Baseline biomass for fair comparison in PFR
        xb_baseline = cstr["Xb"] if cstr["Xb"] > 100.0 else 3000.0

        # Size PFR
        pfr = size_pfr(req.Q, req.S0, req.Se_target, xb_baseline, params)

        vol_ratio = round(cstr["V"] / pfr["V"], 4) if pfr["V"] > 0 else 1.0
        removal_pct = round(((req.S0 - req.Se_target) / req.S0) * 100.0, 2)

        # Sustainability calculations
        sust_cstr = calculate_sustainability(
            req.Q, cstr["V"], req.S0, cstr["Se"], cstr["Xb"], req.theta_c,
            params.alpha_O, params.b
        )
        sust_pfr = calculate_sustainability(
            req.Q, pfr["V"], req.S0, pfr["Se"], pfr["Xb"], req.theta_c,
            params.alpha_O, params.b
        )

        return {
            "inputs": {
                "Q": req.Q,
                "S0": req.S0,
                "Se_target": req.Se_target,
                "theta_c": req.theta_c,
                "removal_pct": removal_pct
            },
            "cstr": {
                "volume_m3": cstr["V"],
                "tau_days": cstr["tau_days"],
                "tau_hours": cstr["tau_hours"],
                "effluent_S_mg_L": cstr["Se"],
                "biomass_Xb_mg_L": cstr["Xb"],
                "effluent_DO_mg_L": cstr["DO"],
                "sustainability": sust_cstr
            },
            "pfr": {
                "volume_m3": pfr["V"],
                "tau_days": pfr["tau_days"],
                "tau_hours": pfr["tau_hours"],
                "effluent_S_mg_L": pfr["Se"],
                "biomass_Xb_mg_L": pfr["Xb"],
                "effluent_DO_mg_L": pfr["DO"],
                "sustainability": sust_pfr
            },
            "comparison": {
                "volume_ratio_cstr_over_pfr": vol_ratio,
                "volume_difference_m3": round(cstr["V"] - pfr["V"], 2),
                "energy_ratio": round(sust_cstr["energy_kwh_per_m3"] / sust_pfr["energy_kwh_per_m3"], 4) if sust_pfr["energy_kwh_per_m3"] > 0 else 1.0,
                "phenomenon_explanation": "Because influent bCOD is much higher than Ks (S >> Ks), Monod kinetics operates in the zero-order saturation regime across ~85% of the reactor volume. Hence, the classic first-order Levenspiel advantage collapses to near parity (ratio ~0.99x-1.05x)."
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/simulate/profiles")
def pfr_profiles_endpoint(req: ProfileRequest):
    try:
        params = _build_params(req.kinetics)
        params.validate()

        result = simulate_pfr(
            S0=req.S0,
            Xb0=req.Xb0,
            DO0=req.DO0,
            tau_total=req.tau_days,
            params=params,
            n_points=req.n_points
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/simulate/transient")
def cstr_transient_endpoint(req: TransientRequest):
    try:
        params = _build_params(req.kinetics)
        params.validate()

        init_st = CSTRState(S=req.initial_S, Xb=req.initial_Xb, DO=req.initial_DO)
        result = simulate_cstr(
            S0=req.S0,
            DO0=req.DO0,
            tau=req.tau_days,
            theta_c=req.theta_c,
            initial_state=init_st,
            params=params,
            t_span=(0.0, req.days),
            n_points=250
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/simulate/levenspiel")
def levenspiel_endpoint(req: SimulationRequest):
    """Calculates Levenspiel reciprocal rate curves 1/(-r_S) vs substrate conversion X_S."""
    try:
        params = _build_params(req.kinetics)
        params.validate()

        # Baseline biomass
        cstr = size_cstr(req.Q, req.S0, req.Se_target, req.theta_c, params)
        Xb = cstr["Xb"]
        DO_avg = 2.0

        conversions = np.linspace(0.001, 0.95, 100)
        curve_data = []

        for x in conversions:
            S_val = req.S0 * (1.0 - x)
            rate = substrate_consumption_rate(S_val, Xb, DO_avg, params)
            recip_rate = (1.0 / rate) if rate > 0 else 0.0
            curve_data.append({
                "conversion": round(float(x), 4),
                "substrate_mg_L": round(float(S_val), 2),
                "consumption_rate": round(float(rate), 2),
                "inv_rate": round(float(recip_rate), 5)
            })

        target_x = (req.S0 - req.Se_target) / req.S0
        rate_at_target = substrate_consumption_rate(req.Se_target, Xb, DO_avg, params)
        cstr_inv_rate = (1.0 / rate_at_target) if rate_at_target > 0 else 0.0

        return {
            "curve": curve_data,
            "target_conversion": round(target_x, 4),
            "cstr_inv_rate_at_exit": round(cstr_inv_rate, 5),
            "explanation": "Levenspiel reciprocal rate plot: PFR volume is the integral under the curve (area under f(X)), whereas CSTR volume is the rectangle of width X_exit and height 1/(-r_S)|exit."
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/export/csv", response_class=PlainTextResponse)
def export_csv_summary():
    params = KineticParams()
    cstr = size_cstr(1000.0, 750.0, 75.0, 10.0, params)
    pfr = size_pfr(1000.0, 750.0, 75.0, cstr["Xb"], params)
    sust_cstr = calculate_sustainability(1000.0, cstr["V"], 750.0, cstr["Se"], cstr["Xb"], 10.0, params.alpha_O, params.b)
    sust_pfr = calculate_sustainability(1000.0, pfr["V"], 750.0, pfr["Se"], pfr["Xb"], 10.0, params.alpha_O, params.b)

    lines = [
        "Parameter,CSTR Design,PFR Design,Unit",
        f"Flow Rate Q,1000,1000,m3/day",
        f"Influent bCOD S0,750,750,mg/L",
        f"Target Effluent Se,75,75,mg/L",
        f"Required Reactor Volume V,{cstr['V']},{pfr['V']},m3",
        f"Hydraulic Retention Time tau,{cstr['tau_hours']},{pfr['tau_hours']},hours",
        f"Achieved Effluent Se,{cstr['Se']},{pfr['Se']},mg/L",
        f"Biomass Concentration Xb,{cstr['Xb']},{pfr['Xb']},mg VSS/L",
        f"Effluent DO,{cstr['DO']},{pfr['DO']},mg/L",
        f"Specific Energy Intensity,{sust_cstr['energy_kwh_per_m3']},{sust_pfr['energy_kwh_per_m3']},kWh/m3",
        f"Operating Cost,{sust_cstr['cost_usd_per_m3']},{sust_pfr['cost_usd_per_m3']},USD/m3",
        f"Carbon Footprint,{sust_cstr['ghg_kg_co2e_per_m3']},{sust_pfr['ghg_kg_co2e_per_m3']},kg CO2e/m3",
        f"Daily Sludge Production,{sust_cstr['sludge_kg_vss_day']},{sust_pfr['sludge_kg_vss_day']},kg VSS/day",
        f"Volume Ratio (CSTR / PFR),{round(cstr['V'] / pfr['V'], 4)},1.0,-"
    ]
    return "\n".join(lines)


@app.get("/api/paper")
def get_research_paper():
    """Returns any custom-edited research paper HTML stored on the server."""
    import json
    if os.path.exists(PAPER_STORAGE_PATH):
        try:
            with open(PAPER_STORAGE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            return {"custom": True, "content_html": data.get("content_html", ""), "updated_at": data.get("updated_at")}
        except Exception:
            pass
    return {"custom": False, "content_html": None}


@app.put("/api/paper")
def update_research_paper(req: PaperUpdateRequest):
    """Validates passcode 4554 and saves updated research paper HTML."""
    import json
    from datetime import datetime, timezone
    if req.passcode.strip() != PAPER_PASSCODE:
        raise HTTPException(status_code=403, detail="Invalid passcode. Access denied.")
    payload = {
        "content_html": req.content_html,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    with open(PAPER_STORAGE_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    return {"status": "saved", "updated_at": payload["updated_at"]}

