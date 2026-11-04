import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Activity,
  Sliders,
  Zap,
  FileSpreadsheet,
  PlayCircle,
  RotateCcw,
  Sparkles,
  Server,
  CheckCircle2,
  Cpu,
  Thermometer,
  FlaskConical,
  BookOpen
} from 'lucide-react';

import Bioreactor3D from './components/Bioreactor3D';
import LevenspielPlot from './components/LevenspielPlot';
import AxialProfilesPlot from './components/AxialProfilesPlot';
import TransientPlot from './components/TransientPlot';
import CREExperimentsPanel from './components/CREExperimentsPanel';
import ResearchPaperPanel from './components/ResearchPaperPanel';
import PresentationGuide from './components/PresentationGuide';

import {
  DEFAULT_KINETICS,
  applyTemperatureCorrection,
  sizeCSTR,
  sizePFR,
  evaluateSustainability,
  generateLevenspielData,
  simulateCSTRStartup
} from './kineticsEngine';

export default function App() {
  // Primary Operational Parameters
  const [Q, setQ] = useState(1000.0);             // m^3/day
  const [S0, setS0] = useState(750.0);            // mg bCOD/L
  const [targetSe, setTargetSe] = useState(75.0); // mg/L
  const [thetaC, setThetaC] = useState(10.0);     // days (can drag down to 0.3d for Washout!)
  const [kLa, setKLa] = useState(120.0);          // 1/day at 20°C
  const [temperature, setTemperature] = useState(25.0); // °C (Arrhenius & DO_sat)
  const [recycleRatio, setRecycleRatio] = useState(0.60); // R = Q_R / Q_0

  // Process Engineering Mode Switches
  const [aerationMode, setAerationMode] = useState('uniform'); // 'uniform' | 'tapered'
  const [blowerTrip, setBlowerTrip] = useState(false);
  const [probeZ, setProbeZ] = useState(0.12); // Synchronized 3D Sonde & 2D Plot cursor

  // Base Monod Adjustments
  const [muMax, setMuMax] = useState(3.2);
  const [Ks, setKs] = useState(65.0);

  // UI Navigation State
  const [activeTab, setActiveTab] = useState('3d'); // '3d', 'cre_lab', 'levenspiel', 'profiles', 'transient', 'sustainability'
  const [viewMode3D, setViewMode3D] = useState('both'); // 'both', 'cstr', 'pfr'
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [showAdvancedKinetics, setShowAdvancedKinetics] = useState(false);

  // Render Backend API Connection State
  const [renderApiUrl, setRenderApiUrl] = useState(
    import.meta.env.VITE_API_URL || 'https://textile-bioreactor-digital-twin-api.onrender.com'
  );
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [remoteData, setRemoteData] = useState(null);

  // Arrhenius Temperature-Corrected Kinetics Bundle (#17)
  const currentKinetics = useMemo(() => {
    const base = {
      ...DEFAULT_KINETICS,
      mu_max: muMax,
      Ks: Ks,
      kLa: kLa
    };
    return applyTemperatureCorrection(base, temperature);
  }, [muMax, Ks, kLa, temperature]);

  // Live Render FastAPI Sync
  const syncWithRenderBackend = useCallback(async () => {
    const cleanUrl = renderApiUrl.replace(/\/+$/, '');
    try {
      setBackendStatus('checking');
      const compareRes = await fetch(`${cleanUrl}/api/simulate/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Q,
          S0,
          Se_target: targetSe,
          theta_c: thetaC,
          kinetics: currentKinetics
        })
      });
      if (!compareRes.ok) throw new Error('Backend HTTP error');
      const compareJson = await compareRes.json();
      setRemoteData(compareJson);
      setBackendStatus('connected');
    } catch {
      setBackendStatus('local_fallback');
      setRemoteData(null);
    }
  }, [renderApiUrl, Q, S0, targetSe, thetaC, currentKinetics]);

  useEffect(() => {
    const timer = setTimeout(() => {
      syncWithRenderBackend();
    }, 250);
    return () => clearTimeout(timer);
  }, [syncWithRenderBackend]);

  // 60 FPS Multi-Physics Solvers
  const localCstr = useMemo(() => {
    return sizeCSTR(Q, S0, targetSe, thetaC, currentKinetics, recycleRatio, blowerTrip);
  }, [Q, S0, targetSe, thetaC, currentKinetics, recycleRatio, blowerTrip]);

  const localPfr = useMemo(() => {
    const xbBaseline = localCstr.Xb > 150 ? localCstr.Xb : 3800.0;
    return sizePFR(Q, S0, targetSe, xbBaseline, currentKinetics, aerationMode, blowerTrip);
  }, [Q, S0, targetSe, localCstr.Xb, currentKinetics, aerationMode, blowerTrip]);

  const cstrResult = useMemo(() => {
    if (backendStatus === 'connected' && remoteData?.cstr && !blowerTrip && !localCstr.isWashout) {
      return {
        ...localCstr,
        V: remoteData.cstr.volume_m3,
        tau_days: remoteData.cstr.tau_days,
        tau_hours: remoteData.cstr.tau_hours,
        Se: remoteData.cstr.effluent_S_mg_L,
        Xb: remoteData.cstr.biomass_Xb_mg_L
      };
    }
    return localCstr;
  }, [backendStatus, remoteData, localCstr, blowerTrip]);

  const pfrResult = useMemo(() => {
    if (backendStatus === 'connected' && remoteData?.pfr && !blowerTrip && aerationMode === 'uniform') {
      return {
        ...localPfr,
        V: remoteData.pfr.volume_m3,
        tau_days: remoteData.pfr.tau_days,
        tau_hours: remoteData.pfr.tau_hours,
        Se: remoteData.pfr.effluent_S_mg_L,
        Xb: remoteData.pfr.biomass_Xb_mg_L
      };
    }
    return localPfr;
  }, [backendStatus, remoteData, localPfr, blowerTrip, aerationMode]);

  const sustCSTR = useMemo(() => {
    return evaluateSustainability(Q, cstrResult.V, S0, cstrResult.Se, cstrResult.Xb, thetaC, currentKinetics);
  }, [Q, cstrResult, S0, thetaC, currentKinetics]);

  const sustPFR = useMemo(() => {
    return evaluateSustainability(Q, pfrResult.V, S0, pfrResult.Se, pfrResult.Xb, thetaC, currentKinetics);
  }, [Q, pfrResult, S0, thetaC, currentKinetics]);

  const levenspiel = useMemo(() => {
    return generateLevenspielData(S0, targetSe, cstrResult.Xb, currentKinetics);
  }, [S0, targetSe, cstrResult.Xb, currentKinetics]);

  const transient = useMemo(() => {
    return simulateCSTRStartup(S0, 1.0, cstrResult.tau_days, thetaC, currentKinetics, 25);
  }, [S0, cstrResult.tau_days, thetaC, currentKinetics]);

  const volumeRatio = cstrResult.V / (pfrResult.V || 1);
  const removalPct = ((S0 - cstrResult.Se) / S0) * 100.0;

  // Preset Scenario Handlers
  const applyPreset = (preset) => {
    setBlowerTrip(false);
    if (preset.Q !== undefined) setQ(preset.Q);
    if (preset.S0 !== undefined) setS0(preset.S0);
    if (preset.Se !== undefined) setTargetSe(preset.Se);
    if (preset.theta_c !== undefined) setThetaC(preset.theta_c);
    if (preset.T !== undefined) setTemperature(preset.T);
    if (preset.aerationMode) setAerationMode(preset.aerationMode);
    if (preset.tab) setActiveTab(preset.tab);
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    const rows = [
      ["Parameter", "CSTR Design", "PFR Design", "Unit"],
      ["Wastewater Flow Rate Q", Q, Q, "m3/day"],
      ["Influent bCOD S0", S0, S0, "mg/L"],
      ["Target Effluent Se", targetSe, targetSe, "mg/L"],
      ["Achieved Effluent Se", cstrResult.Se.toFixed(2), pfrResult.Se.toFixed(2), "mg/L"],
      ["Required Reactor Volume V", cstrResult.V.toFixed(2), pfrResult.V.toFixed(2), "m3"],
      ["Hydraulic Retention Time tau", cstrResult.tau_hours.toFixed(2), pfrResult.tau_hours.toFixed(2), "hours"],
      ["Biomass Concentration Xb", cstrResult.Xb.toFixed(1), pfrResult.Xb.toFixed(1), "mg VSS/L"],
      ["Recycle Ratio R", recycleRatio, recycleRatio, "-"],
      ["Reactor Temperature T", temperature, temperature, "deg C"],
      ["Civil Concrete Volume", cstrResult.geometry.concreteM3.toFixed(1), pfrResult.geometry.concreteM3.toFixed(1), "m3"],
      ["Estimated Civil & Mech CAPEX", cstrResult.geometry.capexUSD.toFixed(0), pfrResult.geometry.capexUSD.toFixed(0), "USD"],
      ["Specific Energy Intensity", sustCSTR.energy_kwh_per_m3.toFixed(4), sustPFR.energy_kwh_per_m3.toFixed(4), "kWh/m3"],
      ["Operating Cost", sustCSTR.cost_usd_per_m3.toFixed(4), sustPFR.cost_usd_per_m3.toFixed(4), "USD/m3"],
      ["Carbon Footprint", sustCSTR.ghg_kg_co2e_per_m3.toFixed(4), sustPFR.ghg_kg_co2e_per_m3.toFixed(4), "kg CO2e/m3"],
      ["Volume Ratio (CSTR / PFR)", volumeRatio.toFixed(4), "1.0000", "-"]
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `textile_bioreactor_design_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* =========================================================================
          TOP NAVIGATION BAR
      ========================================================================= */}
      <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                Industrial Textile Bioreactor Digital Twin
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-[10px] font-bold text-cyan-300">
                25-Feature 3D Multi-Physics & SCADA
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Comparative CSTR vs. PFR Design • Fogler CRE Methodology • Bangladesh Textile Sector
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Render Backend Connection Badge */}
          <button
            onClick={() => setShowApiConfig(!showApiConfig)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              backendStatus === 'connected'
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800/90 border-slate-700 text-cyan-300'
            }`}
          >
            {backendStatus === 'connected' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Render API Connected</span>
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>60 FPS Multi-Physics Engine</span>
              </>
            )}
          </button>

          {/* Research Paper Button */}
          <button
            onClick={() => setActiveTab('paper')}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === 'paper'
                ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-emerald-950/70 hover:bg-emerald-900/80 border-emerald-500/40 text-emerald-300'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>📄 Research Paper (Edit: 4554)</span>
          </button>

          {/* Presentation Mode Button */}
          <button
            onClick={() => setIsPresentationOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Examiner Presentation Mode</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {/* Collapsible Render Backend API Configuration Bar */}
      {showApiConfig && (
        <div className="bg-slate-900/95 border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Server className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold">Render FastAPI Endpoint:</span>
            <input
              type="text"
              value={renderApiUrl}
              onChange={(e) => setRenderApiUrl(e.target.value)}
              placeholder="https://textile-bioreactor-digital-twin-api.onrender.com"
              className="w-80 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-xs"
            />
            <button
              onClick={syncWithRenderBackend}
              className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition"
            >
              Test & Sync
            </button>
          </div>
          <div className="text-slate-400">
            {backendStatus === 'connected'
              ? 'Live SciPy Radau ODE responses active from Render FastAPI backend.'
              : 'Using built-in 60 FPS RK4 multi-physics client solver with automatic failover.'}
          </div>
        </div>
      )}

      {/* =========================================================================
          INDUSTRIAL USE-CASE & FAILURE SCENARIO PRESETS BAR
      ========================================================================= */}
      <div className="bg-slate-900/40 border-b border-slate-800/80 px-6 py-2 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-slate-400 font-semibold shrink-0 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Use Cases:
        </span>
        <button
          onClick={() => applyPreset({ Q: 1000, S0: 750, Se: 75, theta_c: 10, T: 25, aerationMode: 'uniform', tab: '3d' })}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium shrink-0 transition"
        >
          1. Course Baseline (S<sub>0</sub>=750, 90% Removal)
        </button>
        <button
          onClick={() => applyPreset({ Q: 1000, S0: 750, Se: 75, theta_c: 10, T: 25, aerationMode: 'tapered', tab: '3d' })}
          className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-600/40 text-emerald-200 font-medium shrink-0 transition"
        >
          2. PFR Tapered Aeration (Eliminate DO Sag)
        </button>
        <button
          onClick={() => applyPreset({ Q: 1000, S0: 750, Se: 75, theta_c: 0.35, T: 25, tab: '3d' })}
          className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 border border-rose-600/40 text-rose-200 font-medium shrink-0 transition"
        >
          3. Critical Biomass Washout (θ<sub>c</sub> = 0.35d)
        </button>
        <button
          onClick={() => applyPreset({ Q: 1000, S0: 180, Se: 20, theta_c: 10, T: 25, tab: 'levenspiel' })}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium shrink-0 transition"
        >
          4. Dilute Municipal Blend (1<sup>st</sup>-Order Shift)
        </button>
        <button
          onClick={() => applyPreset({ Q: 1000, S0: 750, Se: 75, theta_c: 10, T: 36, tab: '3d' })}
          className="px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 border border-amber-600/40 text-amber-200 font-medium shrink-0 transition"
        >
          5. Summer Monsoon Heatwave (36°C DO Drop)
        </button>
        <button
          onClick={() => applyPreset({ Q: 1000, S0: 750, Se: 75, theta_c: 10, T: 25, tab: 'cre_lab' })}
          className="px-2.5 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/40 text-indigo-200 font-medium shrink-0 transition"
        >
          6. RTD & N-CSTR Cascade Lab
        </button>
      </div>

      {/* =========================================================================
          KEY COMPARISON KPI CARDS
      ========================================================================= */}
      <section className="px-6 py-3.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-2xl bg-slate-900/80 border border-blue-500/30">
          <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">CSTR Volume & Basin</div>
          <div className="mt-0.5 text-lg font-extrabold text-white font-mono">
            {cstrResult.V.toFixed(1)} <span className="text-xs font-normal text-slate-400">m<sup>3</sup></span>
          </div>
          <div className="text-[11px] text-slate-400">
            Ø{cstrResult.geometry.diameter.toFixed(1)}m × {cstrResult.geometry.height.toFixed(1)}m ({cstrResult.tau_hours.toFixed(1)}h)
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-900/80 border border-emerald-500/30">
          <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">PFR Volume & Basin</div>
          <div className="mt-0.5 text-lg font-extrabold text-white font-mono">
            {pfrResult.V.toFixed(1)} <span className="text-xs font-normal text-slate-400">m<sup>3</sup></span>
          </div>
          <div className="text-[11px] text-slate-400">
            L={pfrResult.geometry.totalChannelLength.toFixed(0)}m 4-Pass ({pfrResult.tau_hours.toFixed(1)}h)
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-900/80 border border-purple-500/30">
          <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Levenspiel Ratio</div>
          <div className="mt-0.5 text-lg font-extrabold text-purple-300 font-mono">
            {volumeRatio.toFixed(2)}×
          </div>
          <div className="text-[11px] text-slate-400">
            V<sub>CSTR</sub> / V<sub>PFR</sub> (Monod Zero-Order)
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-900/80 border border-amber-500/30">
          <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">PFR Inlet Min DO</div>
          <div className={`mt-0.5 text-lg font-extrabold font-mono ${pfrResult.min_DO < 0.7 ? 'text-rose-400' : 'text-emerald-300'}`}>
            {pfrResult.min_DO.toFixed(2)} <span className="text-xs font-normal text-slate-400">mg/L</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {pfrResult.min_DO < 0.7 ? '⚠️ Hypoxic DO-Sag Bulking' : '✓ Safe Aerobic Floor'}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-900/80 border border-cyan-500/30">
          <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Specific Energy & Cost</div>
          <div className="mt-0.5 text-lg font-extrabold text-white font-mono">
            {sustCSTR.energy_kwh_per_m3.toFixed(3)} <span className="text-xs font-normal text-slate-400">kWh/m<sup>3</sup></span>
          </div>
          <div className="text-[11px] text-slate-400">
            OPEX: ${sustCSTR.cost_usd_per_m3.toFixed(4)}/m<sup>3</sup>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-900/80 border border-rose-500/30">
          <div className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">DoE Schedule-10 Status</div>
          <div className={`mt-0.5 text-sm font-extrabold font-mono ${cstrResult.Se <= 75.5 && !cstrResult.isWashout ? 'text-emerald-400' : 'text-red-400'}`}>
            {cstrResult.Se <= 75.5 && !cstrResult.isWashout ? '🟢 COMPLIANT' : '🔴 VIOLATION'}
          </div>
          <div className="text-[11px] text-slate-400">
            Exit S<sub>e</sub> = {cstrResult.Se.toFixed(1)} mg/L ({removalPct.toFixed(1)}%)
          </div>
        </div>
      </section>

      {/* =========================================================================
          MAIN WORKSPACE LAYOUT: CONTROL STATION (3 COLS) + VIEWPORT (9 COLS)
      ========================================================================= */}
      <main className="flex-1 px-6 pb-8 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: REACTOR CONTROL STATION */}
        <div className="lg:col-span-3 bg-slate-900/85 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Process & SCADA Controls
            </h2>
            <button
              onClick={() => {
                setQ(1000);
                setS0(750);
                setTargetSe(75);
                setThetaC(10);
                setKLa(120);
                setTemperature(25);
                setRecycleRatio(0.60);
                setAerationMode('uniform');
                setBlowerTrip(false);
                setMuMax(3.2);
                setKs(65.0);
              }}
              className="text-slate-400 hover:text-white text-[11px] flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>

          {/* Slider 1: Flow Rate Q */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">
                Flow Rate (Q<sub>0</sub>):
              </span>
              <span className="font-mono font-bold text-cyan-300">{Q} m<sup>3</sup>/d</span>
            </div>
            <input type="range" min="200" max="4000" step="50" value={Q} onChange={(e) => setQ(Number(e.target.value))} className="w-full accent-cyan-400 cursor-pointer" />
          </div>

          {/* Slider 2: Influent bCOD S0 */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">
                Influent bCOD (S<sub>0</sub>):
              </span>
              <span className="font-mono font-bold text-purple-300">{S0} mg/L</span>
            </div>
            <input type="range" min="150" max="2000" step="25" value={S0} onChange={(e) => setS0(Number(e.target.value))} className="w-full accent-purple-400 cursor-pointer" />
          </div>

          {/* Slider 3: Target Effluent Se */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">
                Target Effluent (S<sub>e</sub>):
              </span>
              <span className="font-mono font-bold text-emerald-300">{targetSe} mg/L</span>
            </div>
            <input type="range" min="20" max="200" step="5" value={targetSe} onChange={(e) => setTargetSe(Number(e.target.value))} className="w-full accent-emerald-400 cursor-pointer" />
          </div>

          {/* Slider 4: Sludge Retention Time theta_c (down to 0.3d for Washout!) */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">
                Sludge Age (θ<sub>c</sub>):
              </span>
              <span className={`font-mono font-bold ${cstrResult.isWashout ? 'text-red-400 animate-pulse' : 'text-amber-300'}`}>
                {thetaC} d {cstrResult.isWashout ? '(WASHOUT!)' : ''}
              </span>
            </div>
            <input type="range" min="0.3" max="25" step="0.1" value={thetaC} onChange={(e) => setThetaC(Number(e.target.value))} className="w-full accent-amber-400 cursor-pointer" />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>
                θ<sub>c,min</sub> = {cstrResult.theta_c_min.toFixed(2)}d
              </span>
              <span>25d (Extended)</span>
            </div>
          </div>

          {/* Slider 5: Mass Transfer kLa */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">
                Blower Aeration (k<sub>L</sub>a):
              </span>
              <span className="font-mono font-bold text-blue-300">
                {kLa} d<sup>−1</sup>
              </span>
            </div>
            <input type="range" min="40" max="240" step="10" value={kLa} onChange={(e) => setKLa(Number(e.target.value))} className="w-full accent-blue-400 cursor-pointer" />
          </div>

          {/* Slider 6: Arrhenius Temperature T (#17) */}
          <div className="space-y-1 pt-2 border-t border-slate-800/80">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                Temperature (T):
              </span>
              <span className="font-mono font-bold text-orange-300">
                {temperature}°C (DO<sub>sat</sub>={currentKinetics.DO_sat.toFixed(1)})
              </span>
            </div>
            <input type="range" min="15" max="38" step="1" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} className="w-full accent-orange-400 cursor-pointer" />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>15°C (Winter)</span>
              <span>
                μ<sub>max</sub>(T)={currentKinetics.mu_max.toFixed(2)} d<sup>−1</sup>
              </span>
              <span>38°C</span>
            </div>
          </div>

          {/* Slider 7: Clarifier RAS Recycle Ratio R (#1, #6) */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">RAS Recycle Ratio (R):</span>
              <span className="font-mono font-bold text-amber-300">
                {(recycleRatio * 100).toFixed(0)}% ({(Q * recycleRatio).toFixed(0)} m<sup>3</sup>/d)
              </span>
            </div>
            <input type="range" min="0.2" max="1.5" step="0.05" value={recycleRatio} onChange={(e) => setRecycleRatio(Number(e.target.value))} className="w-full accent-amber-500 cursor-pointer" />
          </div>

          {/* Advanced Monod Kinetics Accordion */}
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => setShowAdvancedKinetics(!showAdvancedKinetics)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
            >
              <span>Base Monod Constants (20°C)</span>
              <span>{showAdvancedKinetics ? '▲' : '▼'}</span>
            </button>

            {showAdvancedKinetics && (
              <div className="mt-2.5 space-y-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
                <div>
                  <div className="flex justify-between text-slate-400">
                    <span>
                      Base μ<sub>max</sub>(20°C):
                    </span>
                    <span className="font-mono text-slate-200">
                      {muMax} d<sup>−1</sup>
                    </span>
                  </div>
                  <input type="range" min="1.2" max="5.5" step="0.1" value={muMax} onChange={(e) => setMuMax(Number(e.target.value))} className="w-full accent-cyan-400 mt-1" />
                </div>
                <div>
                  <div className="flex justify-between text-slate-400">
                    <span>
                      Half-Velocity K<sub>S</sub>:
                    </span>
                    <span className="font-mono text-slate-200">{Ks} mg/L</span>
                  </div>
                  <input type="range" min="20" max="200" step="5" value={Ks} onChange={(e) => setKs(Number(e.target.value))} className="w-full accent-purple-400 mt-1" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: MULTI-TAB 3D & SCIENTIFIC WORKSPACE (9 COLS) */}
        <div className="lg:col-span-9 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-medium">
              <button
                onClick={() => setActiveTab('3d')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === '3d' ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🏭 3D Process Twin (25 Features)
              </button>
              <button
                onClick={() => setActiveTab('cre_lab')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                  activeTab === 'cre_lab' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>RTD, N-CSTR & Shock Lab</span>
              </button>
              <button
                onClick={() => setActiveTab('levenspiel')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'levenspiel' ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📐 Levenspiel Sizing
              </button>
              <button
                onClick={() => setActiveTab('profiles')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'profiles' ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📈 1D PFR Spatial Profiles
              </button>
              <button
                onClick={() => setActiveTab('transient')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'transient' ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ⏱️ 25-Day Startup
              </button>
              <button
                onClick={() => setActiveTab('sustainability')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'sustainability' ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ⚡ Sustainability & LCA
              </button>
              <button
                onClick={() => setActiveTab('paper')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                  activeTab === 'paper' ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-500/20' : 'text-emerald-300 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>📄 Full Research Paper</span>
              </button>
            </div>

            {activeTab === '3d' && (
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => setViewMode3D('both')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    viewMode3D === 'both' ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Both Trains
                </button>
                <button
                  onClick={() => setViewMode3D('cstr')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    viewMode3D === 'cstr' ? 'bg-blue-500/20 border border-blue-400 text-blue-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Zoom CSTR
                </button>
                <button
                  onClick={() => setViewMode3D('pfr')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    viewMode3D === 'pfr' ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Zoom PFR
                </button>
              </div>
            )}
          </div>

          {activeTab === '3d' && (
            <Bioreactor3D
              Q={Q}
              S0={S0}
              cstrResult={cstrResult}
              pfrResult={pfrResult}
              removalPct={removalPct}
              activeMode={viewMode3D}
              aerationMode={aerationMode}
              onToggleAerationMode={() => setAerationMode(aerationMode === 'uniform' ? 'tapered' : 'uniform')}
              blowerTrip={blowerTrip}
              onToggleBlowerTrip={() => setBlowerTrip(!blowerTrip)}
              probeZ={probeZ}
              onChangeProbeZ={setProbeZ}
              temperature={temperature}
            />
          )}

          {activeTab === 'cre_lab' && (
            <CREExperimentsPanel
              S0={S0}
              cstrResult={cstrResult}
              kinetics={currentKinetics}
            />
          )}

          {activeTab === 'levenspiel' && (
            <LevenspielPlot
              curveData={levenspiel.curve}
              targetConversion={levenspiel.targetConversion}
              cstrInvRate={levenspiel.cstrInvRate}
              cstrVolume={cstrResult.V}
              pfrVolume={pfrResult.V}
              volumeRatio={volumeRatio}
            />
          )}

          {activeTab === 'profiles' && (
            <AxialProfilesPlot
              profiles={pfrResult.profiles}
              pfrTauHours={pfrResult.tau_hours}
              probeZ={probeZ}
              onChangeProbeZ={setProbeZ}
            />
          )}

          {activeTab === 'transient' && (
            <TransientPlot transientData={transient} />
          )}

          {activeTab === 'paper' && (
            <ResearchPaperPanel apiUrl={renderApiUrl} />
          )}

          {activeTab === 'sustainability' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Techno-Economic, Civil Engineering & Life Cycle Assessment (LCA)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Comparison based on Bangladesh industrial tariff ($0.095/kWh), national grid emissions (0.615 kg CO<sub>2</sub>e/kWh), and reinforced concrete basin sizing
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 px-3">Engineering Metric</th>
                      <th className="py-2.5 px-3 text-blue-400">CSTR Process Train</th>
                      <th className="py-2.5 px-3 text-emerald-400">PFR 4-Pass Train</th>
                      <th className="py-2.5 px-3">Engineering Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    <tr>
                      <td className="py-2.5 px-3 text-slate-300 font-sans">Active Reactor Volume (V)</td>
                      <td className="py-2.5 px-3 text-white font-bold">{cstrResult.V.toFixed(1)} m<sup>3</sup></td>
                      <td className="py-2.5 px-3 text-white font-bold">{pfrResult.V.toFixed(1)} m<sup>3</sup></td>
                      <td className="py-2.5 px-3 text-slate-400">Ratio: {volumeRatio.toFixed(2)}×</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-300 font-sans">Reinforced Concrete Volume</td>
                      <td className="py-2.5 px-3">{cstrResult.geometry.concreteM3.toFixed(1)} m<sup>3</sup></td>
                      <td className="py-2.5 px-3">{pfrResult.geometry.concreteM3.toFixed(1)} m<sup>3</sup></td>
                      <td className="py-2.5 px-3 text-emerald-400 font-sans">CSTR saves baffle concrete</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-300 font-sans">Civil & Mechanical CAPEX</td>
                      <td className="py-2.5 px-3 text-emerald-300 font-bold">${cstrResult.geometry.capexUSD.toFixed(0)}</td>
                      <td className="py-2.5 px-3 text-amber-300 font-bold">${pfrResult.geometry.capexUSD.toFixed(0)}</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-sans">CSTR lower capital cost</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-300 font-sans">Sludge Volume Index (SVI)</td>
                      <td className="py-2.5 px-3">{cstrResult.recycle.svi} mL/g</td>
                      <td className="py-2.5 px-3 text-rose-300">{pfrResult.svi} mL/g</td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans">{pfrResult.svi > 150 ? 'PFR DO-sag bulking risk' : 'Good settling'}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-300 font-sans">Daily Aeration Energy</td>
                      <td className="py-2.5 px-3">{sustCSTR.aeration_kwh_day.toFixed(1)} kWh/d</td>
                      <td className="py-2.5 px-3">{sustPFR.aeration_kwh_day.toFixed(1)} kWh/d</td>
                      <td className="py-2.5 px-3 text-slate-400">SAE = 1.8 kg O<sub>2</sub>/kWh</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-300 font-sans font-bold">Total Specific Energy</td>
                      <td className="py-2.5 px-3 text-amber-300 font-bold">{sustCSTR.energy_kwh_per_m3.toFixed(4)} kWh/m<sup>3</sup></td>
                      <td className="py-2.5 px-3 text-amber-300 font-bold">{sustPFR.energy_kwh_per_m3.toFixed(4)} kWh/m<sup>3</sup></td>
                      <td className="py-2.5 px-3 text-emerald-400 font-semibold">Parity (1.00×)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-300 font-sans font-bold">Operating Cost (OPEX)</td>
                      <td className="py-2.5 px-3 text-cyan-300 font-bold">${sustCSTR.cost_usd_per_m3.toFixed(4)} /m<sup>3</sup></td>
                      <td className="py-2.5 px-3 text-cyan-300 font-bold">${sustPFR.cost_usd_per_m3.toFixed(4)} /m<sup>3</sup></td>
                      <td className="py-2.5 px-3 text-slate-400">${(sustCSTR.cost_usd_per_m3 * Q).toFixed(2)}/day</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-300 font-sans font-bold">Operational Carbon Footprint</td>
                      <td className="py-2.5 px-3 text-rose-300 font-bold">{sustCSTR.ghg_kg_co2e_per_m3.toFixed(4)} kg CO<sub>2</sub>e/m<sup>3</sup></td>
                      <td className="py-2.5 px-3 text-rose-300 font-bold">{sustPFR.ghg_kg_co2e_per_m3.toFixed(4)} kg CO<sub>2</sub>e/m<sup>3</sup></td>
                      <td className="py-2.5 px-3 text-slate-400">{(sustCSTR.ghg_kg_co2e_per_m3 * Q).toFixed(1)} kg CO<sub>2</sub>e/d</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      <PresentationGuide
        isOpen={isPresentationOpen}
        onClose={() => setIsPresentationOpen(false)}
        onApplyPreset={applyPreset}
      />
    </div>
  );
}
