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
  Cpu
} from 'lucide-react';

import Bioreactor3D from './components/Bioreactor3D';
import LevenspielPlot from './components/LevenspielPlot';
import AxialProfilesPlot from './components/AxialProfilesPlot';
import TransientPlot from './components/TransientPlot';
import PresentationGuide from './components/PresentationGuide';

import {
  DEFAULT_KINETICS,
  sizeCSTR,
  sizePFR,
  evaluateSustainability,
  generateLevenspielData,
  simulateCSTRStartup
} from './kineticsEngine';

export default function App() {
  // Operational Parameters State
  const [Q, setQ] = useState(1000.0);           // m^3/day
  const [S0, setS0] = useState(750.0);          // mg bCOD/L
  const [targetSe, setTargetSe] = useState(75.0); // mg/L
  const [thetaC, setThetaC] = useState(10.0);   // days
  const [kLa, setKLa] = useState(120.0);        // 1/day

  // Kinetic Adjustments
  const [muMax, setMuMax] = useState(3.2);
  const [Ks, setKs] = useState(65.0);

  // UI state
  const [activeTab, setActiveTab] = useState('3d'); // '3d', 'levenspiel', 'profiles', 'transient', 'sustainability'
  const [viewMode3D, setViewMode3D] = useState('both'); // 'both', 'cstr', 'pfr'
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [showAdvancedKinetics, setShowAdvancedKinetics] = useState(false);

  // Render Backend API Connection State
  const [renderApiUrl, setRenderApiUrl] = useState(
    import.meta.env.VITE_API_URL || 'http://localhost:8000'
  );
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'connected', 'local_fallback', 'checking'
  const [remoteData, setRemoteData] = useState(null);

  // Active Kinetics Bundle
  const currentKinetics = useMemo(() => ({
    ...DEFAULT_KINETICS,
    mu_max: muMax,
    Ks: Ks,
    kLa: kLa
  }), [muMax, Ks, kLa]);

  // Sync with Render FastAPI Backend (/api/simulate/compare & /api/simulate/profiles)
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

  // Instant 60 FPS Client-Side Solutions (paired with Render FastAPI verification)
  const localCstr = useMemo(() => {
    return sizeCSTR(Q, S0, targetSe, thetaC, currentKinetics);
  }, [Q, S0, targetSe, thetaC, currentKinetics]);

  const localPfr = useMemo(() => {
    const xbBaseline = localCstr.Xb > 100 ? localCstr.Xb : 3800.0;
    return sizePFR(Q, S0, targetSe, xbBaseline, currentKinetics);
  }, [Q, S0, targetSe, localCstr.Xb, currentKinetics]);

  const cstrResult = useMemo(() => {
    if (backendStatus === 'connected' && remoteData?.cstr) {
      return {
        V: remoteData.cstr.volume_m3,
        tau_days: remoteData.cstr.tau_days,
        tau_hours: remoteData.cstr.tau_hours,
        Se: remoteData.cstr.effluent_S_mg_L,
        Xb: remoteData.cstr.biomass_Xb_mg_L,
        DO: remoteData.cstr.effluent_DO_mg_L
      };
    }
    return localCstr;
  }, [backendStatus, remoteData, localCstr]);

  const pfrResult = useMemo(() => {
    if (backendStatus === 'connected' && remoteData?.pfr) {
      return {
        V: remoteData.pfr.volume_m3,
        tau_days: remoteData.pfr.tau_days,
        tau_hours: remoteData.pfr.tau_hours,
        Se: remoteData.pfr.effluent_S_mg_L,
        Xb: remoteData.pfr.biomass_Xb_mg_L,
        DO: remoteData.pfr.effluent_DO_mg_L,
        profiles: localPfr.profiles
      };
    }
    return localPfr;
  }, [backendStatus, remoteData, localPfr]);

  const sustCSTR = useMemo(() => {
    if (backendStatus === 'connected' && remoteData?.cstr?.sustainability) {
      return remoteData.cstr.sustainability;
    }
    return evaluateSustainability(Q, cstrResult.V, S0, cstrResult.Se, cstrResult.Xb, thetaC, currentKinetics);
  }, [backendStatus, remoteData, Q, cstrResult, S0, thetaC, currentKinetics]);

  const sustPFR = useMemo(() => {
    if (backendStatus === 'connected' && remoteData?.pfr?.sustainability) {
      return remoteData.pfr.sustainability;
    }
    return evaluateSustainability(Q, pfrResult.V, S0, pfrResult.Se, pfrResult.Xb, thetaC, currentKinetics);
  }, [backendStatus, remoteData, Q, pfrResult, S0, thetaC, currentKinetics]);

  const levenspiel = useMemo(() => {
    return generateLevenspielData(S0, targetSe, cstrResult.Xb, currentKinetics);
  }, [S0, targetSe, cstrResult.Xb, currentKinetics]);

  const transient = useMemo(() => {
    return simulateCSTRStartup(S0, 1.0, cstrResult.tau_days, thetaC, currentKinetics, 25);
  }, [S0, cstrResult.tau_days, thetaC, currentKinetics]);

  const volumeRatio = cstrResult.V / (pfrResult.V || 1);
  const removalPct = ((S0 - targetSe) / S0) * 100.0;

  // Preset Scenario Handlers
  const applyPreset = (preset) => {
    if (preset.Q !== undefined) setQ(preset.Q);
    if (preset.S0 !== undefined) setS0(preset.S0);
    if (preset.Se !== undefined) setTargetSe(preset.Se);
    if (preset.theta_c !== undefined) setThetaC(preset.theta_c);
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
      ["Specific Energy Intensity", sustCSTR.energy_kwh_per_m3.toFixed(4), sustPFR.energy_kwh_per_m3.toFixed(4), "kWh/m3"],
      ["Daily Aeration Power", sustCSTR.aeration_kwh_day.toFixed(1), sustPFR.aeration_kwh_day.toFixed(1), "kWh/day"],
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
      <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                Textile Bioreactor Digital Twin
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-[10px] font-semibold text-blue-300">
                CRE Project 24
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Comparative CSTR & PFR Design • Vercel Frontend + Render FastAPI Backend
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
            title="Configure Render FastAPI Backend URL"
          >
            {backendStatus === 'connected' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Render API Connected (SciPy Radau)</span>
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>60 FPS Hybrid Solver (Render API Standby)</span>
              </>
            )}
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
              : 'Using built-in 60 FPS RK4 client solver with automatic failover.'}
          </div>
        </div>
      )}

      {/* =========================================================================
          SCENARIO PRESETS BAR
      ========================================================================= */}
      <div className="bg-slate-900/40 border-b border-slate-800/80 px-6 py-2.5 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-slate-400 font-semibold shrink-0 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Scenarios:
        </span>
        <button
          onClick={() => applyPreset({ Q: 1000, S0: 750, Se: 75, theta_c: 10 })}
          className="px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium shrink-0 transition"
        >
          Course Guideline Baseline (S₀=750 mg/L)
        </button>
        <button
          onClick={() => applyPreset({ Q: 1000, S0: 1500, Se: 150, theta_c: 10 })}
          className="px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium shrink-0 transition"
        >
          Toxic Azo Dye Shock (S₀=1500 mg/L)
        </button>
        <button
          onClick={() => applyPreset({ Q: 1000, S0: 180, Se: 20, theta_c: 10, tab: 'levenspiel' })}
          className="px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium shrink-0 transition"
        >
          Dilute Municipal Blend (First-Order Shift)
        </button>
        <button
          onClick={() => applyPreset({ Q: 1200, S0: 900, Se: 50, theta_c: 25 })}
          className="px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium shrink-0 transition"
        >
          High-Rate Aerobic MBR (θ_c=25 d)
        </button>
      </div>

      {/* =========================================================================
          KEY COMPARISON KPI CARDS
      ========================================================================= */}
      <section className="px-6 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* CSTR Volume */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-blue-500/30 backdrop-blur-md">
          <div className="text-[11px] text-blue-400 font-bold uppercase tracking-wider">CSTR Volume</div>
          <div className="mt-1 text-xl font-extrabold text-white font-mono">
            {cstrResult.V.toFixed(1)} <span className="text-xs font-normal text-slate-400">m³</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            HRT: <span className="text-slate-200 font-semibold">{cstrResult.tau_hours.toFixed(1)} h</span>
          </div>
        </div>

        {/* PFR Volume */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-emerald-500/30 backdrop-blur-md">
          <div className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">PFR Volume</div>
          <div className="mt-1 text-xl font-extrabold text-white font-mono">
            {pfrResult.V.toFixed(1)} <span className="text-xs font-normal text-slate-400">m³</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            HRT: <span className="text-slate-200 font-semibold">{pfrResult.tau_hours.toFixed(1)} h</span>
          </div>
        </div>

        {/* Volume Ratio */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-500/30 backdrop-blur-md">
          <div className="text-[11px] text-purple-400 font-bold uppercase tracking-wider">Levenspiel Ratio</div>
          <div className="mt-1 text-xl font-extrabold text-purple-300 font-mono">
            {volumeRatio.toFixed(2)}×
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            V_cstr / V_pfr (Parity)
          </div>
        </div>

        {/* Energy Intensity */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-amber-500/30 backdrop-blur-md">
          <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">Specific Energy</div>
          <div className="mt-1 text-xl font-extrabold text-white font-mono">
            {sustCSTR.energy_kwh_per_m3.toFixed(3)} <span className="text-xs font-normal text-slate-400">kWh/m³</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            PFR: {sustPFR.energy_kwh_per_m3.toFixed(3)} kWh/m³
          </div>
        </div>

        {/* Operating Cost */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-cyan-500/30 backdrop-blur-md">
          <div className="text-[11px] text-cyan-400 font-bold uppercase tracking-wider">Operating Cost</div>
          <div className="mt-1 text-xl font-extrabold text-white font-mono">
            ${sustCSTR.cost_usd_per_m3.toFixed(4)} <span className="text-xs font-normal text-slate-400">/m³</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Daily: ${(sustCSTR.cost_usd_per_m3 * Q).toFixed(2)} /day
          </div>
        </div>

        {/* Carbon Footprint */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-rose-500/30 backdrop-blur-md">
          <div className="text-[11px] text-rose-400 font-bold uppercase tracking-wider">Carbon Footprint</div>
          <div className="mt-1 text-xl font-extrabold text-white font-mono">
            {sustCSTR.ghg_kg_co2e_per_m3.toFixed(3)} <span className="text-xs font-normal text-slate-400">kg CO₂e/m³</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Daily: {(sustCSTR.ghg_kg_co2e_per_m3 * Q).toFixed(1)} kg/day
          </div>
        </div>
      </section>

      {/* =========================================================================
          MAIN WORKSPACE LAYOUT: CONTROL STATION + SCIENTIFIC WORKSPACE
      ========================================================================= */}
      <main className="flex-1 px-6 pb-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =========================================================================
            LEFT COLUMN: INTERACTIVE CONTROL PANEL (4 COLS)
        ========================================================================= */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Reactor Control Station
            </h2>
            <button
              onClick={() => {
                setQ(1000);
                setS0(750);
                setTargetSe(75);
                setThetaC(10);
                setKLa(120);
                setMuMax(3.2);
                setKs(65.0);
              }}
              className="text-slate-400 hover:text-white text-xs flex items-center gap-1 transition"
              title="Reset to Course Defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>

          {/* Slider 1: Flow Rate Q */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Flow Rate (Q):</span>
              <span className="font-mono font-bold text-cyan-300">{Q} m³/day</span>
            </div>
            <input
              type="range"
              min="200"
              max="4000"
              step="50"
              value={Q}
              onChange={(e) => setQ(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>200 m³/d</span>
              <span>4000 m³/d</span>
            </div>
          </div>

          {/* Slider 2: Influent bCOD S0 */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Influent Substrate (S₀):</span>
              <span className="font-mono font-bold text-purple-300">{S0} mg bCOD/L</span>
            </div>
            <input
              type="range"
              min="150"
              max="2000"
              step="25"
              value={S0}
              onChange={(e) => setS0(Number(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>150 mg/L (Dilute)</span>
              <span>2000 mg/L (Concentrated Dye)</span>
            </div>
          </div>

          {/* Slider 3: Target Effluent Se */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Target Effluent (S_e):</span>
              <span className="font-mono font-bold text-emerald-300">
                {targetSe} mg/L ({removalPct.toFixed(1)}% removal)
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="200"
              step="5"
              value={targetSe}
              onChange={(e) => setTargetSe(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>20 mg/L (Stringent)</span>
              <span>200 mg/L</span>
            </div>
          </div>

          {/* Slider 4: Sludge Age theta_c */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Sludge Retention Time (θ_c):</span>
              <span className="font-mono font-bold text-amber-300">{thetaC} days</span>
            </div>
            <input
              type="range"
              min="3"
              max="25"
              step="1"
              value={thetaC}
              onChange={(e) => setThetaC(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>3 days (High Rate)</span>
              <span>25 days (Extended Aeration)</span>
            </div>
          </div>

          {/* Slider 5: Aeration kLa */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Mass Transfer Coefficient (k_La):</span>
              <span className="font-mono font-bold text-blue-300">{kLa} 1/day</span>
            </div>
            <input
              type="range"
              min="40"
              max="240"
              step="10"
              value={kLa}
              onChange={(e) => setKLa(Number(e.target.value))}
              className="w-full accent-blue-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>40 1/d (Low)</span>
              <span>240 1/d (Intense)</span>
            </div>
          </div>

          {/* Advanced Biological Kinetics Accordion */}
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => setShowAdvancedKinetics(!showAdvancedKinetics)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
            >
              <span>Advanced Monod Parameters</span>
              <span>{showAdvancedKinetics ? '▲' : '▼'}</span>
            </button>

            {showAdvancedKinetics && (
              <div className="mt-3 space-y-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                <div>
                  <div className="flex justify-between text-slate-400">
                    <span>Max Growth Rate (μ_max):</span>
                    <span className="font-mono text-slate-200">{muMax} 1/day</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="6.0"
                    step="0.1"
                    value={muMax}
                    onChange={(e) => setMuMax(Number(e.target.value))}
                    className="w-full accent-cyan-400 mt-1"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-slate-400">
                    <span>Half-Velocity Constant (K_S):</span>
                    <span className="font-mono text-slate-200">{Ks} mg/L</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    step="5"
                    value={Ks}
                    onChange={(e) => setKs(Number(e.target.value))}
                    className="w-full accent-purple-400 mt-1"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: PRIMARY MULTI-TAB SCIENTIFIC WORKSPACE (8 COLS)
        ========================================================================= */}
        <div className="lg:col-span-8 space-y-4">
          {/* Tab Selection Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-medium">
              <button
                onClick={() => setActiveTab('3d')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === '3d'
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                3D Bioreactor Hydrodynamics
              </button>
              <button
                onClick={() => setActiveTab('levenspiel')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'levenspiel'
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Levenspiel Sizing Plot
              </button>
              <button
                onClick={() => setActiveTab('profiles')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'profiles'
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1D PFR Spatial Profiles
              </button>
              <button
                onClick={() => setActiveTab('transient')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'transient'
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dynamic Startup Trajectories
              </button>
              <button
                onClick={() => setActiveTab('sustainability')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'sustainability'
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sustainability & LCA
              </button>
            </div>

            {/* 3D Mode Selector if on 3D Tab */}
            {activeTab === '3d' && (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 text-[11px] mr-1">Focus:</span>
                <button
                  onClick={() => setViewMode3D('both')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    viewMode3D === 'both' ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Side-by-Side
                </button>
                <button
                  onClick={() => setViewMode3D('cstr')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    viewMode3D === 'cstr' ? 'bg-blue-500/20 border border-blue-400 text-blue-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  CSTR Tank
                </button>
                <button
                  onClick={() => setViewMode3D('pfr')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    viewMode3D === 'pfr' ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  PFR Serpentine
                </button>
              </div>
            )}
          </div>

          {/* Dynamic Tab Body */}
          {activeTab === '3d' && (
            <Bioreactor3D
              cstrSe={cstrResult.Se}
              pfrSe={pfrResult.Se}
              cstrVolume={cstrResult.V}
              pfrVolume={pfrResult.V}
              removalPct={removalPct}
              activeMode={viewMode3D}
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
            />
          )}

          {activeTab === 'transient' && (
            <TransientPlot
              transientData={transient}
            />
          )}

          {activeTab === 'sustainability' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Techno-Economic Life Cycle Assessment (LCA)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Comparison based on industrial tariff ($0.095/kWh) and national grid emissions (0.615 kg CO₂e/kWh)
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 px-3">Metric</th>
                      <th className="py-2.5 px-3 text-blue-400">CSTR Design</th>
                      <th className="py-2.5 px-3 text-emerald-400">PFR Design</th>
                      <th className="py-2.5 px-3">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    <tr>
                      <td className="py-2.5 px-3 text-slate-300 font-sans">Reactor Volume (V)</td>
                      <td className="py-2.5 px-3 text-white font-bold">{cstrResult.V.toFixed(1)} m³</td>
                      <td className="py-2.5 px-3 text-white font-bold">{pfrResult.V.toFixed(1)} m³</td>
                      <td className="py-2.5 px-3 text-slate-400">{(cstrResult.V - pfrResult.V).toFixed(1)} m³</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-300 font-sans">Daily Aeration Energy</td>
                      <td className="py-2.5 px-3">{sustCSTR.aeration_kwh_day.toFixed(1)} kWh/d</td>
                      <td className="py-2.5 px-3">{sustPFR.aeration_kwh_day.toFixed(1)} kWh/d</td>
                      <td className="py-2.5 px-3 text-slate-400">0.0%</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-300 font-sans">Mechanical Mixing Energy</td>
                      <td className="py-2.5 px-3">{sustCSTR.mixing_kwh_day.toFixed(1)} kWh/d</td>
                      <td className="py-2.5 px-3">{sustPFR.mixing_kwh_day.toFixed(1)} kWh/d</td>
                      <td className="py-2.5 px-3 text-slate-400">~1.0%</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-300 font-sans font-bold">Total Specific Energy</td>
                      <td className="py-2.5 px-3 text-amber-300 font-bold">{sustCSTR.energy_kwh_per_m3.toFixed(4)} kWh/m³</td>
                      <td className="py-2.5 px-3 text-amber-300 font-bold">{sustPFR.energy_kwh_per_m3.toFixed(4)} kWh/m³</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-semibold">Parity (1.00×)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-300 font-sans font-bold">Operating Cost</td>
                      <td className="py-2.5 px-3 text-cyan-300 font-bold">${sustCSTR.cost_usd_per_m3.toFixed(4)} /m³</td>
                      <td className="py-2.5 px-3 text-cyan-300 font-bold">${sustPFR.cost_usd_per_m3.toFixed(4)} /m³</td>
                      <td className="py-2.5 px-3 text-slate-400">+$0.0002/m³</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-300 font-sans font-bold">Operational GHG Emissions</td>
                      <td className="py-2.5 px-3 text-rose-300 font-bold">{sustCSTR.ghg_kg_co2e_per_m3.toFixed(4)} kg CO₂e/m³</td>
                      <td className="py-2.5 px-3 text-rose-300 font-bold">{sustPFR.ghg_kg_co2e_per_m3.toFixed(4)} kg CO₂e/m³</td>
                      <td className="py-2.5 px-3 text-slate-400">0.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* =========================================================================
          TEACHER PRESENTATION WALKTHROUGH MODAL
      ========================================================================= */}
      <PresentationGuide
        isOpen={isPresentationOpen}
        onClose={() => setIsPresentationOpen(false)}
        onApplyPreset={applyPreset}
      />
    </div>
  );
}
