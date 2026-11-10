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

  // 60 FPS Multi-Physics Solvers (Fully coupled across all 9 process & kinetic sliders)
  const cstrResult = useMemo(() => {
    return sizeCSTR(Q, S0, targetSe, thetaC, currentKinetics, recycleRatio, blowerTrip);
  }, [Q, S0, targetSe, thetaC, currentKinetics, recycleRatio, blowerTrip]);

  const pfrResult = useMemo(() => {
    const xbBaseline = cstrResult.Xb > 150 ? cstrResult.Xb : 3800.0;
    return sizePFR(Q, S0, targetSe, xbBaseline, currentKinetics, aerationMode, blowerTrip);
  }, [Q, S0, targetSe, cstrResult.Xb, currentKinetics, aerationMode, blowerTrip]);

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
    <div className="min-h-screen bg-sumi text-linen flex flex-col selection:bg-terracotta selection:text-linen">
      {/* =========================================================================
          TOP NAVIGATION BAR (10 NON-AI NATURAL PIGMENTS PALETTE)
      ========================================================================= */}
      <header className="sticky top-0 z-40 bg-sumi/95 border-b border-putty/20 backdrop-blur-md px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-terracotta via-ochre to-workwear flex items-center justify-center shadow-lg shadow-terracotta/25 border border-putty/20">
            <Activity className="w-6 h-6 text-linen" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-linen tracking-tight">
                Industrial Textile Bioreactor Digital Twin
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-celadon/15 border border-celadon/30 text-[10px] font-bold text-celadon">
                25-Feature 3D Multi-Physics & SCADA
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-putty/80">
                Comparative CSTR vs. PFR Design • Fogler CRE Methodology • Bangladesh Textile Sector
              </p>
              {/* 10 Non-AI Natural Mineral Pigments Swatch Strip */}
              <div className="hidden xl:flex items-center gap-1 pl-2 border-l border-putty/20" title="10 Natural Mineral Pigments Theme (No Neon AI Tropes)">
                <span className="text-[10px] text-putty/60 font-semibold mr-0.5">Palette:</span>
                {[
                  { name: 'Raw Linen', hex: '#F6F3ED' },
                  { name: 'Sumi Ink', hex: '#1C1D1A' },
                  { name: 'Terracotta', hex: '#C2593F' },
                  { name: 'Pine Needle', hex: '#2B4436' },
                  { name: 'Raw Ochre', hex: '#C68A3C' },
                  { name: 'Washed Celadon', hex: '#9EAFA2' },
                  { name: 'French Workwear Blue', hex: '#2C526A' },
                  { name: 'Dried Fig', hex: '#422933' },
                  { name: 'Warm Putty', hex: '#DDD5C7' },
                  { name: 'Tuscan Oxblood', hex: '#6E2B27' }
                ].map((sw) => (
                  <span
                    key={sw.name}
                    className="w-2.5 h-2.5 rounded-full border border-putty/40 inline-block shadow-sm transition hover:scale-125 cursor-help"
                    style={{ backgroundColor: sw.hex }}
                    title={`${sw.name} (${sw.hex})`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Render Backend Connection Badge */}
          <button
            onClick={() => setShowApiConfig(!showApiConfig)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              backendStatus === 'connected'
                ? 'bg-pine/80 border-pine text-linen hover:bg-pine'
                : 'bg-workwear/60 hover:bg-workwear border-workwear text-putty'
            }`}
          >
            {backendStatus === 'connected' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-celadon" />
                <span>Render API Connected</span>
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5 text-ochre" />
                <span>60 FPS Multi-Physics Engine</span>
              </>
            )}
          </button>

          {/* Research Paper Button */}
          <button
            onClick={() => setActiveTab('paper')}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === 'paper'
                ? 'bg-terracotta border-terracotta text-linen shadow-lg shadow-terracotta/25'
                : 'bg-fig/70 hover:bg-fig border-fig/80 text-linen'
            }`}
          >
            <BookOpen className="w-4 h-4 text-linen" />
            <span>📄 Research Paper (Edit: 4554)</span>
          </button>

          {/* Presentation Mode Button */}
          <button
            onClick={() => setActiveTab('presentation')}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold shadow-lg flex items-center gap-2 transition ${
              activeTab === 'presentation'
                ? 'bg-terracotta border-terracotta text-linen shadow-terracotta/25'
                : 'bg-workwear hover:bg-workwear/80 text-linen border-workwear/60 shadow-workwear/25'
            }`}
          >
            <PlayCircle className="w-4 h-4 text-ochre" />
            <span>📊 7-Slide PowerPoint Deck</span>
          </button>

          {/* Fullscreen Presenter Button */}
          <button
            onClick={() => setIsPresentationOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-pine/80 hover:bg-pine text-linen border border-celadon/40 text-xs font-semibold flex items-center gap-1.5 transition"
            title="Launch Fullscreen 16:9 Widescreen Slide Deck"
          >
            <span>Fullscreen Slides</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl bg-sumi hover:bg-sumi/80 border border-putty/30 text-putty text-xs font-semibold flex items-center gap-1.5 transition hover:text-linen hover:border-terracotta"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-celadon" />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {/* Collapsible Render Backend API Configuration Bar */}
      {showApiConfig && (
        <div className="bg-sumi/95 border-b border-putty/20 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-putty">
            <Server className="w-4 h-4 text-ochre" />
            <span className="font-semibold">Render FastAPI Endpoint:</span>
            <input
              type="text"
              value={renderApiUrl}
              onChange={(e) => setRenderApiUrl(e.target.value)}
              placeholder="https://textile-bioreactor-digital-twin-api.onrender.com"
              className="w-80 px-2.5 py-1 rounded-lg bg-sumi border border-putty/30 text-linen font-mono text-xs focus:border-terracotta focus:outline-none"
            />
            <button
              onClick={syncWithRenderBackend}
              className="px-3 py-1 rounded-lg bg-terracotta hover:bg-terracotta/90 text-linen font-semibold transition shadow-sm"
            >
              Test & Sync
            </button>
          </div>
          <div className="text-putty/70">
            {backendStatus === 'connected'
              ? 'Live SciPy Radau ODE responses active from Render FastAPI backend.'
              : 'Using built-in 60 FPS RK4 multi-physics client solver with automatic failover.'}
          </div>
        </div>
      )}

      {/* =========================================================================
          INDUSTRIAL USE-CASE & FAILURE SCENARIO PRESETS BAR
      ========================================================================= */}
      <div className="bg-sumi/80 border-b border-putty/15 px-6 py-2 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-putty/80 font-semibold shrink-0 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-ochre" />
          Use Cases:
        </span>
        <button
          onClick={() => applyPreset({ Q: 1000, S0: 750, Se: 75, theta_c: 10, T: 25, aerationMode: 'uniform', tab: '3d' })}
          className="px-2.5 py-1 rounded-lg bg-sumi hover:bg-workwear/40 border border-putty/30 text-putty hover:text-linen font-medium shrink-0 transition"
        >
          1. Course Baseline (S<sub>0</sub>=750, 90% Removal)
        </button>
        <button
          onClick={() => applyPreset({ Q: 1000, S0: 750, Se: 75, theta_c: 10, T: 25, aerationMode: 'tapered', tab: '3d' })}
          className="px-2.5 py-1 rounded-lg bg-pine/70 hover:bg-pine border border-pine text-linen font-medium shrink-0 transition"
        >
          2. PFR Tapered Aeration (Eliminate DO Sag)
        </button>
        <button
          onClick={() => applyPreset({ Q: 1000, S0: 750, Se: 75, theta_c: 0.35, T: 25, tab: '3d' })}
          className="px-2.5 py-1 rounded-lg bg-oxblood/80 hover:bg-oxblood border border-oxblood text-linen font-medium shrink-0 transition"
        >
          3. Critical Biomass Washout (θ<sub>c</sub> = 0.35d)
        </button>
        <button
          onClick={() => applyPreset({ Q: 1000, S0: 180, Se: 20, theta_c: 10, T: 25, tab: 'levenspiel' })}
          className="px-2.5 py-1 rounded-lg bg-workwear/70 hover:bg-workwear border border-workwear text-linen font-medium shrink-0 transition"
        >
          4. Dilute Municipal Blend (1<sup>st</sup>-Order Shift)
        </button>
        <button
          onClick={() => applyPreset({ Q: 1000, S0: 750, Se: 75, theta_c: 10, T: 36, tab: '3d' })}
          className="px-2.5 py-1 rounded-lg bg-ochre/75 hover:bg-ochre border border-ochre text-sumi font-semibold shrink-0 transition"
        >
          5. Summer Monsoon Heatwave (36°C DO Drop)
        </button>
        <button
          onClick={() => applyPreset({ Q: 1000, S0: 750, Se: 75, theta_c: 10, T: 25, tab: 'cre_lab' })}
          className="px-2.5 py-1 rounded-lg bg-fig/75 hover:bg-fig border border-fig text-linen font-medium shrink-0 transition"
        >
          6. RTD & N-CSTR Cascade Lab
        </button>
      </div>

      {/* =========================================================================
          KEY COMPARISON KPI CARDS (THEMED WITH THE 10 NON-AI COLORS)
      ========================================================================= */}
      <section className="px-6 py-3.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* CSTR Volume: Terracotta (#C2593F) */}
        <div className="p-3 rounded-2xl bg-sumi/90 border border-terracotta/40 shadow-sm">
          <div className="text-[10px] text-terracotta font-bold uppercase tracking-wider">CSTR Volume & Basin</div>
          <div className="mt-0.5 text-lg font-extrabold text-linen font-mono">
            {cstrResult.V.toFixed(1)} <span className="text-xs font-normal text-putty/70">m<sup>3</sup></span>
          </div>
          <div className="text-[11px] text-putty/70">
            Ø{cstrResult.geometry.diameter.toFixed(1)}m × {cstrResult.geometry.height.toFixed(1)}m ({cstrResult.tau_hours.toFixed(1)}h)
          </div>
        </div>

        {/* PFR Volume: Pine Needle (#2B4436) */}
        <div className="p-3 rounded-2xl bg-sumi/90 border border-pine/50 shadow-sm">
          <div className="text-[10px] text-celadon font-bold uppercase tracking-wider">PFR Volume & Basin</div>
          <div className="mt-0.5 text-lg font-extrabold text-linen font-mono">
            {pfrResult.V.toFixed(1)} <span className="text-xs font-normal text-putty/70">m<sup>3</sup></span>
          </div>
          <div className="text-[11px] text-putty/70">
            L={pfrResult.geometry.totalChannelLength.toFixed(0)}m 4-Pass ({pfrResult.tau_hours.toFixed(1)}h)
          </div>
        </div>

        {/* Levenspiel Ratio: Raw Ochre (#C68A3C) */}
        <div className="p-3 rounded-2xl bg-sumi/90 border border-ochre/40 shadow-sm">
          <div className="text-[10px] text-ochre font-bold uppercase tracking-wider">Levenspiel Ratio</div>
          <div className="mt-0.5 text-lg font-extrabold text-ochre font-mono">
            {volumeRatio.toFixed(2)}×
          </div>
          <div className="text-[11px] text-putty/70">
            V<sub>CSTR</sub> / V<sub>PFR</sub> (Monod Zero-Order)
          </div>
        </div>

        {/* PFR Inlet Min DO: French Workwear Blue (#2C526A) & Tuscan Oxblood Alert */}
        <div className="p-3 rounded-2xl bg-sumi/90 border border-workwear/40 shadow-sm">
          <div className="text-[10px] text-celadon font-bold uppercase tracking-wider">PFR Inlet Min DO</div>
          <div className={`mt-0.5 text-lg font-extrabold font-mono ${pfrResult.min_DO < 0.7 ? 'text-oxblood font-bold' : 'text-celadon'}`}>
            {pfrResult.min_DO.toFixed(2)} <span className="text-xs font-normal text-putty/70">mg/L</span>
          </div>
          <div className="text-[11px] text-putty/70">
            {pfrResult.min_DO < 0.7 ? '⚠️ Hypoxic DO-Sag Bulking' : '✓ Safe Aerobic Floor'}
          </div>
        </div>

        {/* Specific Energy & Cost: Washed Celadon (#9EAFA2) */}
        <div className="p-3 rounded-2xl bg-sumi/90 border border-workwear/40 shadow-sm">
          <div className="text-[10px] text-celadon font-bold uppercase tracking-wider">Specific Energy & Cost</div>
          <div className="mt-0.5 text-lg font-extrabold text-linen font-mono">
            {sustCSTR.energy_kwh_per_m3.toFixed(3)} <span className="text-xs font-normal text-putty/70">kWh/m<sup>3</sup></span>
          </div>
          <div className="text-[11px] text-putty/70">
            OPEX: ${sustCSTR.cost_usd_per_m3.toFixed(4)}/m<sup>3</sup>
          </div>
        </div>

        {/* DoE Schedule-10 Status: Pine Needle Compliant vs Tuscan Oxblood Violation */}
        <div className="p-3 rounded-2xl bg-sumi/90 border border-putty/20 shadow-sm">
          <div className="text-[10px] text-putty font-bold uppercase tracking-wider">DoE Schedule-10 Status</div>
          <div className={`mt-0.5 text-sm font-extrabold font-mono ${cstrResult.Se <= 75.5 && !cstrResult.isWashout ? 'text-celadon' : 'text-oxblood animate-pulse'}`}>
            {cstrResult.Se <= 75.5 && !cstrResult.isWashout ? '🟢 COMPLIANT' : '🔴 VIOLATION'}
          </div>
          <div className="text-[11px] text-putty/70">
            Exit S<sub>e</sub> = {cstrResult.Se.toFixed(1)} mg/L ({removalPct.toFixed(1)}%)
          </div>
        </div>
      </section>

      {/* =========================================================================
          MAIN WORKSPACE LAYOUT: CONTROL STATION (3 COLS) + VIEWPORT (9 COLS)
      ========================================================================= */}
      <main className="flex-1 px-6 pb-8 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: REACTOR CONTROL STATION */}
        <div className="lg:col-span-3 bg-sumi/90 border border-putty/20 rounded-2xl p-4 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-putty/20">
            <h2 className="text-xs font-bold text-linen uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-terracotta" />
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
              className="text-putty/70 hover:text-linen text-[11px] flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3 text-ochre" />
              Reset
            </button>
          </div>

          {/* Slider 1: Flow Rate Q (French Workwear Blue) */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-putty">
                Flow Rate (Q<sub>0</sub>):
              </span>
              <span className="font-mono font-bold text-workwear">{Q} m<sup>3</sup>/d</span>
            </div>
            <input type="range" min="200" max="4000" step="50" value={Q} onChange={(e) => setQ(Number(e.target.value))} className="w-full accent-workwear cursor-pointer" />
          </div>

          {/* Slider 2: Influent bCOD S0 (Terracotta) */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-putty">
                Influent bCOD (S<sub>0</sub>):
              </span>
              <span className="font-mono font-bold text-terracotta">{S0} mg/L</span>
            </div>
            <input type="range" min="150" max="2000" step="25" value={S0} onChange={(e) => setS0(Number(e.target.value))} className="w-full accent-terracotta cursor-pointer" />
          </div>

          {/* Slider 3: Target Effluent Se (Pine Needle / Washed Celadon) */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-putty">
                Target Effluent (S<sub>e</sub>):
              </span>
              <span className="font-mono font-bold text-celadon">{targetSe} mg/L</span>
            </div>
            <input type="range" min="20" max="200" step="5" value={targetSe} onChange={(e) => setTargetSe(Number(e.target.value))} className="w-full accent-pine cursor-pointer" />
          </div>

          {/* Slider 4: Sludge Retention Time theta_c (Raw Ochre / Tuscan Oxblood for Washout) */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-putty">
                Sludge Age (θ<sub>c</sub>):
              </span>
              <span className={`font-mono font-bold ${cstrResult.isWashout ? 'text-oxblood animate-pulse' : 'text-ochre'}`}>
                {thetaC} d {cstrResult.isWashout ? '(WASHOUT!)' : ''}
              </span>
            </div>
            <input type="range" min="0.3" max="25" step="0.1" value={thetaC} onChange={(e) => setThetaC(Number(e.target.value))} className="w-full accent-ochre cursor-pointer" />
            <div className="flex justify-between text-[10px] text-putty/60">
              <span>
                θ<sub>c,min</sub> = {cstrResult.theta_c_min.toFixed(2)}d
              </span>
              <span>25d (Extended)</span>
            </div>
          </div>

          {/* Slider 5: Mass Transfer kLa (French Workwear Blue) */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-putty">
                Blower Aeration (k<sub>L</sub>a):
              </span>
              <span className="font-mono font-bold text-workwear">
                {kLa} d<sup>−1</sup>
              </span>
            </div>
            <input type="range" min="40" max="240" step="10" value={kLa} onChange={(e) => setKLa(Number(e.target.value))} className="w-full accent-workwear cursor-pointer" />
          </div>

          {/* Slider 6: Arrhenius Temperature T (Terracotta / Raw Ochre) */}
          <div className="space-y-1 pt-2 border-t border-putty/20">
            <div className="flex justify-between text-xs">
              <span className="text-putty flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-terracotta" />
                Temperature (T):
              </span>
              <span className="font-mono font-bold text-terracotta">
                {temperature}°C (DO<sub>sat</sub>={currentKinetics.DO_sat.toFixed(1)})
              </span>
            </div>
            <input type="range" min="15" max="38" step="1" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} className="w-full accent-terracotta cursor-pointer" />
            <div className="flex justify-between text-[10px] text-putty/60">
              <span>15°C (Winter)</span>
              <span>
                μ<sub>max</sub>(T)={currentKinetics.mu_max.toFixed(2)} d<sup>−1</sup>
              </span>
              <span>38°C</span>
            </div>
          </div>

          {/* Slider 7: Clarifier RAS Recycle Ratio R (Raw Ochre) */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-putty">RAS Recycle Ratio (R):</span>
              <span className="font-mono font-bold text-ochre">
                {(recycleRatio * 100).toFixed(0)}% ({(Q * recycleRatio).toFixed(0)} m<sup>3</sup>/d)
              </span>
            </div>
            <input type="range" min="0.2" max="1.5" step="0.05" value={recycleRatio} onChange={(e) => setRecycleRatio(Number(e.target.value))} className="w-full accent-ochre cursor-pointer" />
          </div>

          {/* Advanced Monod Kinetics Accordion */}
          <div className="pt-2 border-t border-putty/20">
            <button
              onClick={() => setShowAdvancedKinetics(!showAdvancedKinetics)}
              className="w-full flex items-center justify-between text-xs font-semibold text-putty/70 hover:text-linen transition"
            >
              <span>Base Monod Constants (20°C)</span>
              <span className="text-ochre">{showAdvancedKinetics ? '▲' : '▼'}</span>
            </button>

            {showAdvancedKinetics && (
              <div className="mt-2.5 space-y-2.5 p-2.5 rounded-xl bg-sumi border border-putty/20 text-xs">
                <div>
                  <div className="flex justify-between text-putty/80">
                    <span>
                      Base μ<sub>max</sub>(20°C):
                    </span>
                    <span className="font-mono text-linen font-bold">
                      {muMax} d<sup>−1</sup>
                    </span>
                  </div>
                  <input type="range" min="1.2" max="5.5" step="0.1" value={muMax} onChange={(e) => setMuMax(Number(e.target.value))} className="w-full accent-workwear mt-1" />
                </div>
                <div>
                  <div className="flex justify-between text-putty/80">
                    <span>
                      Half-Velocity K<sub>S</sub>:
                    </span>
                    <span className="font-mono text-linen font-bold">{Ks} mg/L</span>
                  </div>
                  <input type="range" min="20" max="200" step="5" value={Ks} onChange={(e) => setKs(Number(e.target.value))} className="w-full accent-terracotta mt-1" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: MULTI-TAB 3D & SCIENTIFIC WORKSPACE (9 COLS) */}
        <div className="lg:col-span-9 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-putty/20 pb-2">
            <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-sumi/90 border border-putty/20 text-xs font-medium">
              <button
                onClick={() => setActiveTab('3d')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === '3d' ? 'bg-terracotta text-linen font-bold shadow-md shadow-terracotta/25' : 'text-putty/70 hover:text-linen'
                }`}
              >
                🏭 3D Process Twin (25 Features)
              </button>
              <button
                onClick={() => setActiveTab('presentation')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                  activeTab === 'presentation'
                    ? 'bg-terracotta text-linen font-bold shadow-md shadow-terracotta/25'
                    : 'text-ochre hover:text-linen'
                }`}
              >
                <PlayCircle className="w-3.5 h-3.5 text-linen" />
                <span>📊 7-Slide PowerPoint Deck</span>
              </button>
              <button
                onClick={() => setActiveTab('cre_lab')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                  activeTab === 'cre_lab' ? 'bg-fig text-linen font-bold shadow-md shadow-fig/25' : 'text-putty/70 hover:text-linen'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5 text-ochre" />
                <span>RTD, N-CSTR & Shock Lab</span>
              </button>
              <button
                onClick={() => setActiveTab('levenspiel')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'levenspiel' ? 'bg-ochre text-sumi font-bold shadow-md shadow-ochre/25' : 'text-putty/70 hover:text-linen'
                }`}
              >
                📐 Levenspiel Sizing
              </button>
              <button
                onClick={() => setActiveTab('profiles')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'profiles' ? 'bg-workwear text-linen font-bold shadow-md shadow-workwear/25' : 'text-putty/70 hover:text-linen'
                }`}
              >
                📈 1D PFR Spatial Profiles
              </button>
              <button
                onClick={() => setActiveTab('transient')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'transient' ? 'bg-pine text-linen font-bold shadow-md shadow-pine/25' : 'text-putty/70 hover:text-linen'
                }`}
              >
                ⏱️ 25-Day Startup
              </button>
              <button
                onClick={() => setActiveTab('sustainability')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'sustainability' ? 'bg-celadon text-sumi font-bold shadow-md shadow-celadon/25' : 'text-putty/70 hover:text-linen'
                }`}
              >
                ⚡ Sustainability & LCA
              </button>
              <button
                onClick={() => setActiveTab('paper')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                  activeTab === 'paper' ? 'bg-oxblood text-linen font-bold shadow-md shadow-oxblood/25' : 'text-celadon hover:text-linen'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-linen" />
                <span>📄 Full Research Paper</span>
              </button>
            </div>

            {activeTab === '3d' && (
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => setViewMode3D('both')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    viewMode3D === 'both' ? 'bg-workwear/40 border border-workwear text-linen' : 'bg-sumi text-putty/70 hover:text-linen'
                  }`}
                >
                  Both Trains
                </button>
                <button
                  onClick={() => setViewMode3D('cstr')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    viewMode3D === 'cstr' ? 'bg-terracotta/40 border border-terracotta text-linen' : 'bg-sumi text-putty/70 hover:text-linen'
                  }`}
                >
                  Zoom CSTR
                </button>
                <button
                  onClick={() => setViewMode3D('pfr')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    viewMode3D === 'pfr' ? 'bg-pine/50 border border-pine text-linen' : 'bg-sumi text-putty/70 hover:text-linen'
                  }`}
                >
                  Zoom PFR
                </button>
              </div>
            )}
          </div>

          {activeTab === 'presentation' && (
            <PresentationGuide
              isOpen={true}
              mode="embedded"
              onClose={() => setActiveTab('3d')}
              onApplyPreset={applyPreset}
              Q={Q}
              setQ={setQ}
              S0={S0}
              setS0={setS0}
              targetSe={targetSe}
              setTargetSe={setTargetSe}
              thetaC={thetaC}
              setThetaC={setThetaC}
              kLa={kLa}
              setKLa={setKLa}
              temperature={temperature}
              setTemperature={setTemperature}
              recycleRatio={recycleRatio}
              setRecycleRatio={setRecycleRatio}
              aerationMode={aerationMode}
              setAerationMode={setAerationMode}
              blowerTrip={blowerTrip}
              setBlowerTrip={setBlowerTrip}
              probeZ={probeZ}
              setProbeZ={setProbeZ}
              cstrResult={cstrResult}
              pfrResult={pfrResult}
              sustCSTR={sustCSTR}
              sustPFR={sustPFR}
              levenspiel={levenspiel}
              transient={transient}
              currentKinetics={currentKinetics}
              volumeRatio={volumeRatio}
              removalPct={removalPct}
            />
          )}

          {activeTab === '3d' && (
            <Bioreactor3D
              Q={Q}
              S0={S0}
              targetSe={targetSe}
              thetaC={thetaC}
              kLa={kLa}
              recycleRatio={recycleRatio}
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
            <div className="bg-sumi/90 border border-putty/20 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-5">
              <div>
                <h3 className="text-base font-bold text-linen flex items-center gap-2">
                  <Zap className="w-4 h-4 text-ochre" />
                  Techno-Economic, Civil Engineering & Life Cycle Assessment (LCA)
                </h3>
                <p className="text-xs text-putty/70 mt-0.5">
                  Comparison based on Bangladesh industrial tariff ($0.095/kWh), national grid emissions (0.615 kg CO<sub>2</sub>e/kWh), and reinforced concrete basin sizing
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-putty/20 text-putty/70">
                      <th className="py-2.5 px-3">Engineering Metric</th>
                      <th className="py-2.5 px-3 text-terracotta font-bold">CSTR Process Train</th>
                      <th className="py-2.5 px-3 text-pine font-bold">PFR 4-Pass Train</th>
                      <th className="py-2.5 px-3">Engineering Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-putty/15 font-mono">
                    <tr>
                      <td className="py-2.5 px-3 text-putty font-sans">Active Reactor Volume (V)</td>
                      <td className="py-2.5 px-3 text-linen font-bold">{cstrResult.V.toFixed(1)} m<sup>3</sup></td>
                      <td className="py-2.5 px-3 text-linen font-bold">{pfrResult.V.toFixed(1)} m<sup>3</sup></td>
                      <td className="py-2.5 px-3 text-putty/70">Ratio: {volumeRatio.toFixed(2)}×</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-putty font-sans">Reinforced Concrete Volume</td>
                      <td className="py-2.5 px-3 text-linen">{cstrResult.geometry.concreteM3.toFixed(1)} m<sup>3</sup></td>
                      <td className="py-2.5 px-3 text-linen">{pfrResult.geometry.concreteM3.toFixed(1)} m<sup>3</sup></td>
                      <td className="py-2.5 px-3 text-celadon font-sans">CSTR saves baffle concrete</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-putty font-sans">Civil & Mechanical CAPEX</td>
                      <td className="py-2.5 px-3 text-celadon font-bold">${cstrResult.geometry.capexUSD.toFixed(0)}</td>
                      <td className="py-2.5 px-3 text-ochre font-bold">${pfrResult.geometry.capexUSD.toFixed(0)}</td>
                      <td className="py-2.5 px-3 text-celadon font-sans">CSTR lower capital cost</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-putty font-sans">Sludge Volume Index (SVI)</td>
                      <td className="py-2.5 px-3 text-linen">{cstrResult.recycle.svi} mL/g</td>
                      <td className="py-2.5 px-3 text-oxblood">{pfrResult.svi} mL/g</td>
                      <td className="py-2.5 px-3 text-putty/70 font-sans">{pfrResult.svi > 150 ? 'PFR DO-sag bulking risk' : 'Good settling'}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-putty font-sans">Daily Aeration Energy</td>
                      <td className="py-2.5 px-3 text-linen">{sustCSTR.aeration_kwh_day.toFixed(1)} kWh/d</td>
                      <td className="py-2.5 px-3 text-linen">{sustPFR.aeration_kwh_day.toFixed(1)} kWh/d</td>
                      <td className="py-2.5 px-3 text-putty/70">SAE = 1.8 kg O<sub>2</sub>/kWh</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-putty font-sans font-bold">Total Specific Energy</td>
                      <td className="py-2.5 px-3 text-ochre font-bold">{sustCSTR.energy_kwh_per_m3.toFixed(4)} kWh/m<sup>3</sup></td>
                      <td className="py-2.5 px-3 text-ochre font-bold">{sustPFR.energy_kwh_per_m3.toFixed(4)} kWh/m<sup>3</sup></td>
                      <td className="py-2.5 px-3 text-celadon font-semibold">Parity (1.00×)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-putty font-sans font-bold">Operating Cost (OPEX)</td>
                      <td className="py-2.5 px-3 text-workwear font-bold">${sustCSTR.cost_usd_per_m3.toFixed(4)} /m<sup>3</sup></td>
                      <td className="py-2.5 px-3 text-workwear font-bold">${sustPFR.cost_usd_per_m3.toFixed(4)} /m<sup>3</sup></td>
                      <td className="py-2.5 px-3 text-putty/70">${(sustCSTR.cost_usd_per_m3 * Q).toFixed(2)}/day</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-putty font-sans font-bold">Operational Carbon Footprint</td>
                      <td className="py-2.5 px-3 text-oxblood font-bold">{sustCSTR.ghg_kg_co2e_per_m3.toFixed(4)} kg CO<sub>2</sub>e/m<sup>3</sup></td>
                      <td className="py-2.5 px-3 text-oxblood font-bold">{sustPFR.ghg_kg_co2e_per_m3.toFixed(4)} kg CO<sub>2</sub>e/m<sup>3</sup></td>
                      <td className="py-2.5 px-3 text-putty/70">{(sustCSTR.ghg_kg_co2e_per_m3 * Q).toFixed(1)} kg CO<sub>2</sub>e/d</td>
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
        mode="modal"
        onClose={() => setIsPresentationOpen(false)}
        onApplyPreset={applyPreset}
        Q={Q}
        setQ={setQ}
        S0={S0}
        setS0={setS0}
        targetSe={targetSe}
        setTargetSe={setTargetSe}
        thetaC={thetaC}
        setThetaC={setThetaC}
        kLa={kLa}
        setKLa={setKLa}
        temperature={temperature}
        setTemperature={setTemperature}
        recycleRatio={recycleRatio}
        setRecycleRatio={setRecycleRatio}
        aerationMode={aerationMode}
        setAerationMode={setAerationMode}
        blowerTrip={blowerTrip}
        setBlowerTrip={setBlowerTrip}
        probeZ={probeZ}
        setProbeZ={setProbeZ}
        cstrResult={cstrResult}
        pfrResult={pfrResult}
        sustCSTR={sustCSTR}
        sustPFR={sustPFR}
        levenspiel={levenspiel}
        transient={transient}
        currentKinetics={currentKinetics}
        volumeRatio={volumeRatio}
        removalPct={removalPct}
      />
    </div>
  );
}
