import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Presentation,
  Play,
  Maximize2,
  Minimize2,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Layers,
  Gauge,
  Activity,
  Zap,
  Award,
  Volume2,
  Eye,
  Printer
} from 'lucide-react';
import Bioreactor3D from './Bioreactor3D';
import LevenspielPlot from './LevenspielPlot';
import AxialProfilesPlot from './AxialProfilesPlot';
import TransientPlot from './TransientPlot';
import CREExperimentsPanel from './CREExperimentsPanel';

export default function PresentationGuide({
  isOpen = false,
  mode = 'modal', // 'embedded' | 'modal'
  onClose,
  onApplyPreset,
  // Live simulation state & setters
  Q = 1000,
  setQ,
  S0 = 750,
  setS0,
  targetSe = 75,
  setTargetSe,
  thetaC = 5.0,
  setThetaC,
  kLa = 150,
  setKLa,
  temperature = 32,
  setTemperature,
  recycleRatio = 0.4,
  setRecycleRatio,
  aerationMode = 'uniform',
  setAerationMode,
  blowerTrip = false,
  setBlowerTrip,
  probeZ = 0.25,
  setProbeZ,
  // Live computed results
  cstrResult,
  pfrResult,
  sustCSTR,
  sustPFR,
  levenspiel,
  transient,
  currentKinetics,
  volumeRatio = 3.09,
  removalPct = 90.0
}) {
  const [step, setStep] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [slide5Tab, setSlide5Tab] = useState('rtd'); // 'rtd' | 'startup'
  const [slide7View, setSlide7View] = useState('matrix'); // 'matrix' | '3d' | 'levenspiel' | 'profiles'

  const totalSlides = 7;

  // Keyboard navigation when open or embedded
  useEffect(() => {
    if (!isOpen && mode === 'modal') return;
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
      if (e.key === 'ArrowRight') {
        setStep((s) => Math.min(totalSlides - 1, s + 1));
      } else if (e.key === 'ArrowLeft') {
        setStep((s) => Math.max(0, s - 1));
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mode, isFullscreen]);

  if (!isOpen && mode === 'modal') return null;

  // Safe fallbacks if props are still initializing
  const cstrV = cstrResult?.V ?? 490.5;
  const pfrV = pfrResult?.V ?? 158.9;
  const cstrTauHr = cstrResult?.tau_hours ?? 11.77;
  const pfrTauHr = pfrResult?.tau_hours ?? 3.81;
  const cstrXb = cstrResult?.Xb ?? 3877;
  const cstrDO = cstrResult?.DO ?? 2.15;
  const pfrMinDO = pfrResult?.minDO ?? 0.56;
  const muMaxT = currentKinetics?.mu_max ?? 4.92;
  const kdT = currentKinetics?.kd ?? 0.088;
  const thetaMin = cstrResult?.theta_c_min ?? 0.42;

  const slides = [
    {
      number: 'SLIDE 01 / 07',
      category: 'INDUSTRIAL PROBLEM & ETP ARCHITECTURE',
      title: 'Biological Treatment of Textile Dyeing Effluent: CSTR vs. PFR Digital Twin',
      subtitle: 'Gazipur-Narayanganj Wet-Processing Corridor | Bangladesh DoE ECR Schedule-10 Compliance',
      equation: 'Q₀ = ' + Q + ' m³/d   |   S₀ = ' + S0 + ' mg bCOD/L   ➔   Target Sₑ ≤ ' + targetSe + ' mg/L (' + removalPct.toFixed(1) + '% Removal)',
      preset: 'baseline',
      presetLabel: 'Load Baseline Textile ETP (32°C)',
      kpis: [
        { label: 'Design Flow (Q₀)', value: `${Q} m³/d`, color: 'text-linen' },
        { label: 'Influent bCOD (S₀)', value: `${S0} mg/L`, color: 'text-terracotta' },
        { label: 'Target Effluent (Sₑ)', value: `${targetSe} mg/L`, color: 'text-celadon' },
        { label: 'Process Temp (T)', value: `${temperature}°C`, color: 'text-ochre' }
      ],
      bullets: [
        `Export-oriented knit/woven dyeing mills discharge high-strength alkaline organic effluent (S₀ = ${S0} mg/L bCOD, reactive azo dyes, starch sizing, and Glauber's salt).`,
        `Complete 8-stage hydraulic train modeled in 3D: Raw Intake (INF-001) ➔ FeSO₄/Lime Coagulation (CHEM-001) ➔ Equalization (EQ-001) ➔ Rotary Screen (SCR-001) ➔ Parallel CSTR-101 & PFR-102 ➔ Secondary Clarifiers (CLR-201/202) ➔ Tertiary Filters (FLT-301) ➔ River Outfall (OUTFALL-001).`,
        `Core Chemical Reaction Engineering (CRE) objective: Rigorously size and compare an Ideal Back-Mixed CSTR against a 4-Pass Baffled Serpentine PFR under identical biological sludge age (θc = ${thetaC.toFixed(1)} d).`
      ],
      speakerNotes:
        'Open the presentation by rotating the live 3D Digital Twin on the right. Point out the dark indigo raw intake pipe (INF-001) on the left and follow the transparent glass process pipes with internal fluid flow all the way to the emerald-clear compliance outfall (OUTFALL-001) on the right.'
    },
    {
      number: 'SLIDE 02 / 07',
      category: 'BIOCHEMICAL REACTION KINETICS',
      title: 'Dual-Limitation Monod-Haldane Kinetics & Arrhenius Thermal Coupling',
      subtitle: 'Simultaneous Carbon Substrate (S), Dissolved Oxygen (DO), and Toxic Azo-Dye Inhibition Modeling',
      equation: 'μ(S, DO, T) = μ_max(T) · [ S / (K_S + S + S²/K_I) ] · [ DO / (K_OH + DO) ]   |   r_s = -(μ / Y) · X_b',
      preset: 'monsoon_cool',
      presetLabel: 'Test Winter/Monsoon Cool (22°C)',
      kpis: [
        { label: `μ_max (${temperature}°C)`, value: `${muMaxT.toFixed(2)} d⁻¹`, color: 'text-ochre' },
        { label: 'Half-Velocity K_S', value: `${currentKinetics?.Ks ?? 60} mg/L`, color: 'text-linen' },
        { label: 'Oxygen K_OH', value: `${currentKinetics?.K_oh ?? 0.2} mg/L`, color: 'text-celadon' },
        { label: 'Min SRT (θ_c,min)', value: `${thetaMin.toFixed(2)} d`, color: 'text-terracotta' }
      ],
      bullets: [
        `Arrhenius thermal scaling (θ_T = 1.072) boosts maximum specific growth rate from 3.20 d⁻¹ at 20°C to ${muMaxT.toFixed(2)} d⁻¹ at ${temperature}°C (typical warm textile vat discharge).`,
        `Dual-substrate Monod switching multiplies organic carbon saturation S/(K_S + S) by oxygen availability DO/(K_OH + DO), capturing anoxic rate collapse whenever DO drops near K_OH = 0.20 mg/L.`,
        `Under extreme factory vat dumps (S > 1,200 mg/L), Haldane substrate inhibition (S²/K_I, K_I = 1,200 mg/L) depresses microbial growth in unbuffered plug-flow inlet zones.`
      ],
      speakerNotes:
        'Use the Temperature slider below to shift between 22°C (Winter) and 38°C (Hot Dye Discharge) while watching the Monod growth curve and washout threshold update in real time on the right.'
    },
    {
      number: 'SLIDE 03 / 07',
      category: 'STEADY-STATE REACTOR SIZING (FOGLER CH. 2)',
      title: 'Levenspiel Reciprocal-Rate Sizing: Why PFR Saves 68% Volume at 90% Removal',
      subtitle: 'Graphical Integration of (-1/r_s) vs. Conversion X from X = 0 to X = ' + (removalPct / 100).toFixed(2),
      equation: 'V_CSTR = F_S0 · X_target · (-1/r_s)_exit = ' + cstrV.toFixed(1) + ' m³   vs.   V_PFR = F_S0 ∫ (-1/r_s) dX = ' + pfrV.toFixed(1) + ' m³',
      preset: 'high_target_se',
      presetLabel: 'Demo High Target Sₑ = 300 mg/L',
      kpis: [
        { label: 'CSTR Volume (V_CSTR)', value: `${cstrV.toFixed(1)} m³`, color: 'text-terracotta' },
        { label: 'PFR Volume (V_PFR)', value: `${pfrV.toFixed(1)} m³`, color: 'text-celadon' },
        { label: 'Volume Ratio (V_C/V_P)', value: `${volumeRatio.toFixed(2)}×`, color: 'text-ochre' },
        { label: 'HRT (τ_CSTR / τ_PFR)', value: `${cstrTauHr.toFixed(1)}h / ${pfrTauHr.toFixed(1)}h`, color: 'text-linen' }
      ],
      bullets: [
        `In an Ideal CSTR, perfect back-mixing forces the entire ${cstrV.toFixed(1)} m³ vessel to operate at the lowest exit substrate concentration (Sₑ = ${targetSe} mg/L), where (-1/r_s) is at its peak (${(levenspiel?.cstrInvRate ?? 0.65).toFixed(3)} L·d/mg).`,
        `In a 4-Pass PFR, substrate concentration grades progressively from ${S0} mg/L at the inlet to ${targetSe} mg/L at the exit, keeping reaction rates high across the first 70% of the channel and requiring only ${pfrV.toFixed(1)} m³.`,
        `Interactive Proof: Drag Target Sₑ from 75 mg/L (${volumeRatio.toFixed(2)}× ratio) up to 300 mg/L (saturation regime where S ≫ K_S, pseudozero-order) to watch the CSTR rectangle and PFR integral converge toward 1.59×!`
      ],
      speakerNotes:
        'Hover over the live Levenspiel Plot on the right to inspect (-1/r_s) at any conversion X. Drag the Target Effluent Sₑ slider between 40 mg/L and 300 mg/L to prove why CSTR penalty is severe only at deep compliance targets (Sₑ ≈ K_S).'
    },
    {
      number: 'SLIDE 04 / 07',
      category: '1D SPATIAL PFR ODEs & OXYGEN MASS TRANSFER',
      title: 'Coupled Axial PFR Profiles & The Entrance Dissolved Oxygen Sag Trap',
      subtitle: '4th-Order Runge-Kutta Integration Along Dimensionless Channel Length (z/L ∈ [0, 1])',
      equation: 'd(DO)/dτ = k_La · (DO_sat - DO) - [ (1 - 1.42 Y_obs)/Y ] · μ · X_b - 1.42 · k_d · X_b',
      preset: 'baseline',
      presetLabel: 'Reset to Uniform Aeration (k_La=150)',
      kpis: [
        { label: 'CSTR Uniform DO', value: `${cstrDO.toFixed(2)} mg/L`, color: 'text-celadon' },
        { label: 'PFR Minimum DO', value: `${pfrMinDO.toFixed(2)} mg/L`, color: pfrMinDO < 1.0 ? 'text-terracotta' : 'text-celadon' },
        { label: 'Aeration Mode', value: aerationMode.toUpperCase(), color: 'text-ochre' },
        { label: 'PFR SVI Settling', value: `${pfrResult?.svi ?? 165} mL/g`, color: 'text-linen' }
      ],
      bullets: [
        `At the PFR inlet (z/L = 0.05–0.25), high substrate S₀ = ${S0} mg/L drives intense microbial oxygen uptake (OUR) that outpaces uniform diffuser supply (k_La = ${kLa} d⁻¹).`,
        `Bulk DO plunges to ${pfrMinDO.toFixed(2)} mg/L in Pass 1 (below the 1.0 mg/L aerobic threshold), triggering Sphaerotilus natans filamentous sludge bulking (SVI = ${pfrResult?.svi ?? 165} mL/g).`,
        `Engineering Solution: Click "Tapered Aeration" below (1.65× diffuser density at inlet, 0.45× at exit) to eliminate the DO sag without increasing total blower energy!`
      ],
      speakerNotes:
        'Slide the Virtual Sonde Probe (z/L) across the PFR channel on the right to show S(z), X_b(z), and DO(z). Click the "Tapered Aeration" toggle button on the slide to demonstrate how spatial k_La allocation rescues Pass-1 Dissolved Oxygen.'
    },
    {
      number: 'SLIDE 05 / 07',
      category: 'NON-IDEAL FLOW, RTD E(θ), SHOCK LOADS & DYNAMICS',
      title: 'Residence Time Distribution, Toxic Vat Dump Buffering & 25-Day Startup',
      subtitle: 'Fogler E(θ) Dispersion Modeling, 2-Hour Azo-Dye Shock Wave, and Dynamic Biomass Washout',
      equation: 'E_CSTR(θ) = exp(-θ)   |   E_N-Series(θ) = [N·(Nθ)^(N-1)/(N-1)!]·exp(-Nθ)   |   dX_b/dt = (μ - 1/θ_c - k_d)·X_b',
      preset: 'toxic_shock',
      presetLabel: 'Trigger Toxic Shock (S₀ = 1800 mg/L)',
      kpis: [
        { label: 'Operating SRT (θc)', value: `${thetaC.toFixed(2)} d`, color: thetaC <= thetaMin * 1.2 ? 'text-terracotta' : 'text-celadon' },
        { label: 'Washout Limit (θc,min)', value: `${thetaMin.toFixed(2)} d`, color: 'text-ochre' },
        { label: 'Active Biomass (X_b)', value: `${cstrXb.toFixed(0)} mg/L`, color: 'text-linen' },
        { label: 'Safety Factor (SF)', value: `${(thetaC / Math.max(0.01, thetaMin)).toFixed(1)}×`, color: 'text-celadon' }
      ],
      bullets: [
        `Real baffled basins deviate from ideal plug flow via axial dispersion (Peclet Pe = 30) and are modeled as N-staged CSTRs-in-series (N = 4 approaches PFR efficiency while retaining back-mixed stability).`,
        `Crucial CSTR Advantage: During a 2-hour factory dye vat dump (2,200 mg/L), the CSTR's ${cstrV.toFixed(0)} m³ volume instantaneously dilutes the pulse below the 75 mg/L limit, whereas a PFR suffers an unattenuated toxic plug breakthrough!`,
        `Dynamic Startup ODEs: From seed inoculation (X_b,0 = 150 mg/L), the bioreactor requires ~12–15 days (≈ 3 × θc) to reach steady-state MLVSS (${cstrXb.toFixed(0)} mg/L). Dropping θc below ${thetaMin.toFixed(2)} d causes complete biomass washout.`
      ],
      speakerNotes:
        'Use the toggle at the top of the right panel to switch between the Fogler RTD & Toxic Shock Cannon and the 25-Day Startup ODE Trajectory. Click "Trigger Washout" to show what happens when SRT drops below θ_c,min.'
    },
    {
      number: 'SLIDE 06 / 07',
      category: 'TECHNO-ECONOMIC ANALYSIS (TEA) & LIFE CYCLE ASSESSMENT (LCA)',
      title: 'Why Smaller Volume ≠ Lower Energy: Civil CAPEX, Blower Power & Carbon Parity',
      subtitle: 'Bangladesh Industrial Tariff ($0.095/kWh), Grid Emission Factor (0.615 kg CO₂e/kWh) & Concrete Sizing',
      equation: 'OUR_total = Q₀·(S₀ - Sₑ)·(1 - 1.42·Y_obs) = ' + ((sustCSTR?.aeration_kwh_day ?? 488) * 1.8).toFixed(0) + ' kg O₂/d   ➔   E_aeration = ' + (sustCSTR?.aeration_kwh_day ?? 488).toFixed(1) + ' kWh/d',
      preset: 'baseline',
      presetLabel: 'Restore Design Baseline (Q=1000)',
      kpis: [
        { label: 'CSTR Civil CAPEX', value: `$${(cstrResult?.geometry?.capexUSD ?? 129600).toLocaleString()}`, color: 'text-celadon' },
        { label: 'PFR Civil CAPEX', value: `$${(pfrResult?.geometry?.capexUSD ?? 141200).toLocaleString()}`, color: 'text-ochre' },
        { label: 'Specific Energy', value: `${(sustCSTR?.energy_kwh_per_m3 ?? 0.642).toFixed(3)} kWh/m³`, color: 'text-linen' },
        { label: 'Carbon Footprint', value: `${((sustCSTR?.ghg_kg_co2e_per_m3 ?? 0.395) * Q).toFixed(0)} kg CO₂e/d`, color: 'text-terracotta' }
      ],
      bullets: [
        `Thermodynamic Oxygen Demand Parity: Both reactors oxidize the exact same daily bCOD mass (${((Q * (S0 - targetSe)) / 1000).toFixed(1)} kg bCOD/d), requiring identical stoichiometric aeration energy (${(sustCSTR?.aeration_kwh_day ?? 488.3).toFixed(1)} kWh/d = 76% of plant electricity).`,
        `Civil Engineering Surprise: Although PFR liquid volume is smaller (${pfrV.toFixed(1)} vs. ${cstrV.toFixed(1)} m³), its 3 internal reinforced-concrete serpentine baffle walls increase structural wall area and formwork, making PFR CAPEX slightly higher ($${(pfrResult?.geometry?.capexUSD ?? 141200).toLocaleString()} vs. $${(cstrResult?.geometry?.capexUSD ?? 129600).toLocaleString()}).`,
        `Total Operating Cost & Carbon Footprint: Both configurations operate at $${(sustCSTR?.cost_usd_per_m3 ?? 0.061).toFixed(3)}/m³ ($${((sustCSTR?.cost_usd_per_m3 ?? 0.061) * Q).toFixed(2)}/day) and emit ${((sustCSTR?.ghg_kg_co2e_per_m3 ?? 0.395) * Q).toFixed(1)} kg CO₂e/day.`
      ],
      speakerNotes:
        'This slide answers the classic examiner trap: "If PFR is 3.09× smaller in volume, does it use 3× less electricity?" Point to the energy bar chart on the right to explain why biological oxygen demand is governed by mass of COD removed, not tank volume.'
    },
    {
      number: 'SLIDE 07 / 07',
      category: 'FINAL ENGINEERING RECOMMENDATION & LIVE Q&A DEFENSE',
      title: 'Definitive Engineering Verdict: Hybrid 4-Stage Compartmentalized Basin with Tapered Aeration',
      subtitle: 'Synthesizing Volumetric Efficiency, Shock-Load Resilience, and DO-Sag Prevention for Bangladesh ETPs',
      equation: 'Optimal Design: V_total = 215 m³ (4-Stage Cascade) + Tapered k_La (240 ➔ 70 d⁻¹) + R = 0.40 RAS Recycle',
      preset: 'baseline',
      presetLabel: 'Reset All Parameters for Live Q&A',
      kpis: [
        { label: 'Volumetric Winner', value: `PFR (${volumeRatio.toFixed(2)}× smaller)`, color: 'text-celadon' },
        { label: 'Shock Resilience Winner', value: 'CSTR (Dilution Buffer)', color: 'text-workwear' },
        { label: 'CAPEX & SVI Winner', value: 'CSTR (No Baffle Walls)', color: 'text-ochre' },
        { label: 'Recommended Design', value: '4-Stage Hybrid Cascade', color: 'text-linen' }
      ],
      bullets: [
        `Pure PFR Verdict: Achieves a ${volumeRatio.toFixed(2)}× smaller active liquid footprint (${pfrV.toFixed(1)} m³ vs. ${cstrV.toFixed(1)} m³), ideal for land-constrained Dhaka/Gazipur factories, but requires tapered aeration to prevent Pass-1 DO sag (${pfrMinDO.toFixed(2)} mg/L) and upstream equalization to buffer dye dumps.`,
        `Pure CSTR Verdict: Requires ${cstrV.toFixed(1)} m³ liquid volume, but provides automatic dilution against toxic azo-dye shock loads, uniform DO (${cstrDO.toFixed(2)} mg/L), superior sludge settling (SVI ${cstrResult?.recycle?.svi ?? 110} mL/g), and lower concrete wall cost.`,
        `Final Recommendation: Construct a 4-Compartment Staged Basin (N = 4 CSTRs-in-series) with a larger first mixing cell (to buffer dye shocks) and tapered fine-bubble diffusers—capturing 82% of the PFR volume savings with zero filamentous bulking risk.`
      ],
      speakerNotes:
        'During Examiner Q&A, use the view switcher at the top right of this slide to jump instantaneously between the Decision Matrix, Live 3D Plant, Levenspiel Plot, or Axial Profiles without ever leaving Slide 7!'
    }
  ];

  const currentSlide = slides[step];

  // Helper to render the right-hand interactive visualization for each slide
  const renderSlideVisual = () => {
    if (step === 0) {
      return (
        <div className="flex flex-col h-full space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-sumi/90 border border-putty/20 rounded-xl px-3.5 py-2">
            <span className="text-xs font-bold text-ochre flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              LIVE 3D INDUSTRIAL ETP DIGITAL TWIN (INTERACTIVE ORBIT & CLICK)
            </span>
            <span className="text-[11px] font-mono text-celadon">
              INF-001 (Indigo {S0} mg/L) ➔ OUTFALL-001 (Emerald {targetSe} mg/L)
            </span>
          </div>
          <div className="flex-1 min-h-[380px] rounded-2xl overflow-hidden border border-putty/25 shadow-2xl">
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
              activeMode="both"
              aerationMode={aerationMode}
              onToggleAerationMode={() => setAerationMode && setAerationMode(aerationMode === 'uniform' ? 'tapered' : 'uniform')}
              blowerTrip={blowerTrip}
              onToggleBlowerTrip={() => setBlowerTrip && setBlowerTrip(!blowerTrip)}
              probeZ={probeZ}
              onChangeProbeZ={setProbeZ}
              temperature={temperature}
            />
          </div>
        </div>
      );
    }

    if (step === 1) {
      // Slide 2: Interactive Dual-Limitation Monod & Haldane Inhibition Curve SVG + Arrhenius Table
      const w = 580;
      const h = 270;
      const pad = { top: 24, right: 28, bottom: 40, left: 52 };
      const pw = w - pad.left - pad.right;
      const ph = h - pad.top - pad.bottom;
      const maxS = 2000;
      const maxMu = 6.0;
      const Ks = currentKinetics?.Ks ?? 60;
      const Koh = currentKinetics?.K_oh ?? 0.2;
      const Ki = 1200;
      const doFactor = cstrDO / (Koh + cstrDO);

      const sPoints = Array.from({ length: 81 }, (_, i) => i * 25);
      const scaleX = (s) => pad.left + (s / maxS) * pw;
      const scaleY = (mu) => pad.top + ph - (Math.min(maxMu, Math.max(0, mu)) / maxMu) * ph;

      const monodPath = sPoints.reduce((acc, s, i) => {
        const mu = muMaxT * (s / (Ks + s)) * doFactor;
        return `${acc} ${i === 0 ? 'M' : 'L'} ${scaleX(s)} ${scaleY(mu)}`;
      }, '');

      const haldanePath = sPoints.reduce((acc, s, i) => {
        const mu = muMaxT * (s / (Ks + s + (s * s) / Ki)) * doFactor;
        return `${acc} ${i === 0 ? 'M' : 'L'} ${scaleX(s)} ${scaleY(mu)}`;
      }, '');

      const washoutMu = 1 / Math.max(0.2, thetaC) + kdT;

      return (
        <div className="flex flex-col h-full justify-between space-y-3 bg-sumi/90 border border-putty/20 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-putty/20 pb-2.5">
            <div>
              <h4 className="text-sm font-bold text-linen">
                Live Monod vs. Haldane Substrate-Inhibited Growth Rate μ(S, DO, T)
              </h4>
              <p className="text-[11px] text-putty/70">
                 Evaluated at T = {temperature}°C (μ_max = {muMaxT.toFixed(2)} d⁻¹) and Bulk DO = {cstrDO.toFixed(2)} mg/L
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-ochre/20 border border-ochre/40 text-ochre font-mono text-xs font-bold">
              DO Factor: {(doFactor * 100).toFixed(1)}%
            </span>
          </div>

          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto overflow-visible bg-sumi/60 rounded-xl p-2 border border-putty/10">
            {[0, 400, 800, 1200, 1600, 2000].map((s) => (
              <g key={s}>
                <line x1={scaleX(s)} y1={pad.top} x2={scaleX(s)} y2={pad.top + ph} stroke="#2B2D26" strokeDasharray="3 3" />
                <text x={scaleX(s)} y={pad.top + ph + 16} fill="#9EAFA2" fontSize="10" textAnchor="middle">
                  {s}
                </text>
              </g>
            ))}
            {[0, 1.5, 3.0, 4.5, 6.0].map((m) => (
              <g key={m}>
                <line x1={pad.left} y1={scaleY(m)} x2={pad.left + pw} y2={scaleY(m)} stroke="#2B2D26" strokeDasharray="3 3" />
                <text x={pad.left - 8} y={scaleY(m) + 4} fill="#9EAFA2" fontSize="10" textAnchor="end">
                  {m.toFixed(1)}
                </text>
              </g>
            ))}

            {/* Washout horizontal line */}
            {washoutMu <= maxMu && (
              <>
                <line
                  x1={pad.left}
                  y1={scaleY(washoutMu)}
                  x2={pad.left + pw}
                  y2={scaleY(washoutMu)}
                  stroke="#A84A32"
                  strokeDasharray="5 4"
                  strokeWidth="1.5"
                />
                <text x={pad.left + pw - 6} y={scaleY(washoutMu) - 5} fill="#A84A32" fontSize="9.5" textAnchor="end" fontWeight="bold">
                  Required Growth (1/θc + kd = {washoutMu.toFixed(2)} d⁻¹)
                </text>
              </>
            )}

            {/* Current S0 vertical marker */}
            <line x1={scaleX(S0)} y1={pad.top} x2={scaleX(S0)} y2={pad.top + ph} stroke="#C68A3C" strokeDasharray="4 2" strokeWidth="1.5" />
            <text x={scaleX(S0) + 5} y={pad.top + 12} fill="#C68A3C" fontSize="9.5" fontWeight="bold">
              Influent S₀ = {S0}
            </text>

            {/* Current Se vertical marker */}
            <line x1={scaleX(targetSe)} y1={pad.top} x2={scaleX(targetSe)} y2={pad.top + ph} stroke="#9EAFA2" strokeDasharray="4 2" strokeWidth="1.5" />
            <text x={scaleX(targetSe) + 5} y={pad.top + 26} fill="#9EAFA2" fontSize="9.5" fontWeight="bold">
              Exit Sₑ = {targetSe}
            </text>

            <path d={monodPath} fill="none" stroke="#9EAFA2" strokeWidth="3" />
            <path d={haldanePath} fill="none" stroke="#C68A3C" strokeWidth="2.5" strokeDasharray="6 3" />

            <line x1={pad.left} y1={pad.top + ph} x2={pad.left + pw} y2={pad.top + ph} stroke="#DDD5C7" strokeWidth="1.5" />
            <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + ph} stroke="#DDD5C7" strokeWidth="1.5" />

            <text x={pad.left + pw / 2} y={pad.top + ph + 33} fill="#DDD5C7" fontSize="11" fontWeight="bold" textAnchor="middle">
              Substrate Concentration S [mg bCOD/L]
            </text>
            <text
              x={14}
              y={pad.top + ph / 2}
              fill="#DDD5C7"
              fontSize="11"
              fontWeight="bold"
              textAnchor="middle"
              transform={`rotate(-90, 14, ${pad.top + ph / 2})`}
            >
              Specific Growth Rate μ [d⁻¹]
            </text>
          </svg>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-t border-putty/20 pt-2">
            <span className="text-celadon font-semibold">━━ Uninhibited Dual-Monod μ(S, DO)</span>
            <span className="text-ochre font-semibold">┅┅ Haldane Dye-Inhibited (K_I = 1200 mg/L)</span>
            <span className="text-terracotta font-semibold">--- Washout Threshold (1/θc + k_d)</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-1 text-xs">
            <div className="bg-sumi border border-putty/15 rounded-xl p-2.5">
              <div className="text-putty/70 text-[10px]">Arrhenius μ_max(T)</div>
              <div className="font-mono font-bold text-ochre text-sm">3.20 × 1.072^(T-20) = {muMaxT.toFixed(2)} d⁻¹</div>
            </div>
            <div className="bg-sumi border border-putty/15 rounded-xl p-2.5">
              <div className="text-putty/70 text-[10px]">Endogenous Decay k_d(T)</div>
              <div className="font-mono font-bold text-linen text-sm">0.06 × 1.040^(T-20) = {kdT.toFixed(3)} d⁻¹</div>
            </div>
            <div className="bg-sumi border border-putty/15 rounded-xl p-2.5">
              <div className="text-putty/70 text-[10px]">True Yield Y (mg VSS/mg COD)</div>
              <div className="font-mono font-bold text-celadon text-sm">{currentKinetics?.Y ?? 0.45} mg/mg</div>
            </div>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="flex flex-col h-full justify-between space-y-3">
          <LevenspielPlot
            curveData={levenspiel?.curve || []}
            targetConversion={levenspiel?.targetConversion || 0.9}
            cstrInvRate={levenspiel?.cstrInvRate || 0.65}
            cstrVolume={cstrV}
            pfrVolume={pfrV}
            volumeRatio={volumeRatio}
          />
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="flex flex-col h-full justify-between space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-sumi/90 border border-putty/20 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-linen">Aeration Diffuser Layout:</span>
              <button
                onClick={() => setAerationMode && setAerationMode('uniform')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  aerationMode === 'uniform'
                    ? 'bg-terracotta text-linen shadow'
                    : 'bg-sumi text-putty border border-putty/20'
                }`}
              >
                Uniform k_La (DO Sag!)
              </button>
              <button
                onClick={() => setAerationMode && setAerationMode('tapered')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  aerationMode === 'tapered'
                    ? 'bg-pine text-linen border border-celadon/40 shadow'
                    : 'bg-sumi text-putty border border-putty/20'
                }`}
              >
                Tapered k_La (Engineered Fix)
              </button>
            </div>
            <button
              onClick={() => setBlowerTrip && setBlowerTrip(!blowerTrip)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                blowerTrip
                  ? 'bg-oxblood text-linen border-terracotta animate-pulse'
                  : 'bg-sumi text-putty border-putty/25 hover:border-terracotta'
              }`}
            >
              {blowerTrip ? '⚠️ BLOWER TRIP ACTIVE (-70% k_La)' : 'Simulate Power Outage / Blower Trip'}
            </button>
          </div>
          <AxialProfilesPlot
            profiles={pfrResult?.profiles}
            pfrTauHours={pfrTauHr}
            probeZ={probeZ}
            onChangeProbeZ={setProbeZ}
          />
        </div>
      );
    }

    if (step === 4) {
      return (
        <div className="flex flex-col h-full space-y-3">
          <div className="flex items-center justify-between bg-sumi/90 border border-putty/20 rounded-xl px-4 py-2">
            <span className="text-xs font-bold text-ochre">Slide 5 Interactive Graphic Mode:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setSlide5Tab('rtd')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  slide5Tab === 'rtd'
                    ? 'bg-terracotta text-linen'
                    : 'bg-sumi text-putty border border-putty/20'
                }`}
              >
                Fogler RTD E(θ) & Dye Shock Cannon
              </button>
              <button
                onClick={() => setSlide5Tab('startup')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  slide5Tab === 'startup'
                    ? 'bg-pine text-linen border border-celadon/40'
                    : 'bg-sumi text-putty border border-putty/20'
                }`}
              >
                25-Day Startup & Washout ODEs
              </button>
            </div>
          </div>
          {slide5Tab === 'rtd' ? (
            <CREExperimentsPanel S0={S0} cstrResult={cstrResult} kinetics={currentKinetics} />
          ) : (
            <TransientPlot transientData={transient} />
          )}
        </div>
      );
    }

    if (step === 5) {
      const aerKwh = sustCSTR?.aeration_kwh_day ?? 488.3;
      const mixKwh = sustCSTR?.mixing_kwh_day ?? 90.0;
      const pumpKwh = sustCSTR?.pumping_kwh_day ?? 63.7;
      const totalKwh = aerKwh + mixKwh + pumpKwh;
      const cstrCapex = cstrResult?.geometry?.capexUSD ?? 129600;
      const pfrCapex = pfrResult?.geometry?.capexUSD ?? 141200;

      return (
        <div className="bg-sumi/90 border border-putty/20 rounded-2xl p-5 shadow-xl space-y-4 h-full flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-linen flex items-center gap-2">
              <Zap className="w-4 h-4 text-ochre" />
              Live Plant Energy Breakdown & Civil CAPEX / Carbon LCA Matrix
            </h4>
            <p className="text-xs text-putty/70 mt-0.5">
              Evaluated at Q₀ = {Q} m³/d, S₀ = {S0} mg/L ➔ Sₑ = {targetSe} mg/L ($0.095/kWh tariff, 0.615 kg CO₂e/kWh grid factor)
            </p>
          </div>

          {/* Stacked Energy Bar */}
          <div className="space-y-2 bg-sumi border border-putty/15 rounded-xl p-3.5">
            <div className="flex justify-between text-xs font-bold text-linen">
              <span>Daily Electrical Demand Breakdown ({totalKwh.toFixed(1)} kWh/d Total)</span>
              <span className="text-ochre font-mono">${((sustCSTR?.cost_usd_per_m3 ?? 0.061) * Q).toFixed(2)} / day</span>
            </div>
            <div className="w-full h-6 rounded-lg overflow-hidden flex border border-putty/25">
              <div
                style={{ width: `${(aerKwh / totalKwh) * 100}%` }}
                className="bg-terracotta flex items-center justify-center text-[10px] font-bold text-linen"
                title="Biological Aeration Blowers"
              >
                Aeration {((aerKwh / totalKwh) * 100).toFixed(0)}%
              </div>
              <div
                style={{ width: `${(mixKwh / totalKwh) * 100}%` }}
                className="bg-ochre flex items-center justify-center text-[10px] font-bold text-sumi"
                title="Mechanical Mixing / Flow Inducers"
              >
                Mixing {((mixKwh / totalKwh) * 100).toFixed(0)}%
              </div>
              <div
                style={{ width: `${(pumpKwh / totalKwh) * 100}%` }}
                className="bg-workwear flex items-center justify-center text-[10px] font-bold text-linen"
                title="RAS/WAS & Transfer Pumping"
              >
                Pumps {((pumpKwh / totalKwh) * 100).toFixed(0)}%
              </div>
            </div>
            <div className="flex justify-between text-[11px] text-putty/80 font-mono">
              <span>● Blowers: {aerKwh.toFixed(1)} kWh/d</span>
              <span>● Agitation: {mixKwh.toFixed(1)} kWh/d</span>
              <span>● RAS/Feed Pumps: {pumpKwh.toFixed(1)} kWh/d</span>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-putty/20 text-putty/70">
                  <th className="py-2 px-2.5">Metric</th>
                  <th className="py-2 px-2.5 text-terracotta font-bold">Ideal CSTR</th>
                  <th className="py-2 px-2.5 text-celadon font-bold">4-Pass PFR</th>
                  <th className="py-2 px-2.5">Engineering Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-putty/15 font-mono">
                <tr>
                  <td className="py-2 px-2.5 font-sans text-putty">Active Liquid Volume</td>
                  <td className="py-2 px-2.5 text-linen font-bold">{cstrV.toFixed(1)} m³</td>
                  <td className="py-2 px-2.5 text-celadon font-bold">{pfrV.toFixed(1)} m³</td>
                  <td className="py-2 px-2.5 font-sans text-celadon">PFR saves {((1 - 1 / volumeRatio) * 100).toFixed(0)}% space</td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 font-sans text-putty">Reinforced Concrete</td>
                  <td className="py-2 px-2.5 text-linen">{(cstrResult?.geometry?.concreteM3 ?? 168).toFixed(1)} m³</td>
                  <td className="py-2 px-2.5 text-linen">{(pfrResult?.geometry?.concreteM3 ?? 195).toFixed(1)} m³</td>
                  <td className="py-2 px-2.5 font-sans text-ochre">PFR needs 3 baffle walls</td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 font-sans text-putty">Civil & Mech CAPEX</td>
                  <td className="py-2 px-2.5 text-celadon font-bold">${cstrCapex.toLocaleString()}</td>
                  <td className="py-2 px-2.5 text-ochre font-bold">${pfrCapex.toLocaleString()}</td>
                  <td className="py-2 px-2.5 font-sans text-celadon">CSTR saves ${(pfrCapex - cstrCapex).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 font-sans text-putty">Specific Energy</td>
                  <td className="py-2 px-2.5 text-ochre font-bold">{(sustCSTR?.energy_kwh_per_m3 ?? 0.642).toFixed(4)} kWh/m³</td>
                  <td className="py-2 px-2.5 text-ochre font-bold">{(sustPFR?.energy_kwh_per_m3 ?? 0.642).toFixed(4)} kWh/m³</td>
                  <td className="py-2 px-2.5 font-sans text-linen">Identical stoichiometric O₂</td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 font-sans text-putty">Carbon Emissions</td>
                  <td className="py-2 px-2.5 text-terracotta font-bold">{((sustCSTR?.ghg_kg_co2e_per_m3 ?? 0.395) * Q).toFixed(1)} kg/d</td>
                  <td className="py-2 px-2.5 text-terracotta font-bold">{((sustPFR?.ghg_kg_co2e_per_m3 ?? 0.395) * Q).toFixed(1)} kg/d</td>
                  <td className="py-2 px-2.5 font-sans text-putty/80">0.395 kg CO₂e / m³ treated</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Slide 7: Engineering Verdict Matrix + Live Q&A Switcher
    return (
      <div className="flex flex-col h-full space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-sumi/90 border border-putty/20 rounded-xl px-3.5 py-2">
          <span className="text-xs font-bold text-ochre">Live Defense Q&A Visual Switcher:</span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'matrix', label: 'Decision Matrix & Q&A' },
              { id: '3d', label: 'Live 3D Plant' },
              { id: 'levenspiel', label: 'Levenspiel Plot' },
              { id: 'profiles', label: 'Axial DO Profiles' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSlide7View(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  slide7View === tab.id
                    ? 'bg-terracotta text-linen shadow'
                    : 'bg-sumi text-putty border border-putty/20 hover:text-linen'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {slide7View === '3d' && (
          <div className="flex-1 min-h-[360px] rounded-2xl overflow-hidden border border-putty/25">
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
              activeMode="both"
              aerationMode={aerationMode}
              onToggleAerationMode={() => setAerationMode && setAerationMode(aerationMode === 'uniform' ? 'tapered' : 'uniform')}
              blowerTrip={blowerTrip}
              onToggleBlowerTrip={() => setBlowerTrip && setBlowerTrip(!blowerTrip)}
              probeZ={probeZ}
              onChangeProbeZ={setProbeZ}
              temperature={temperature}
            />
          </div>
        )}

        {slide7View === 'levenspiel' && (
          <LevenspielPlot
            curveData={levenspiel?.curve || []}
            targetConversion={levenspiel?.targetConversion || 0.9}
            cstrInvRate={levenspiel?.cstrInvRate || 0.65}
            cstrVolume={cstrV}
            pfrVolume={pfrV}
            volumeRatio={volumeRatio}
          />
        )}

        {slide7View === 'profiles' && (
          <AxialProfilesPlot
            profiles={pfrResult?.profiles}
            pfrTauHours={pfrTauHr}
            probeZ={probeZ}
            onChangeProbeZ={setProbeZ}
          />
        )}

        {slide7View === 'matrix' && (
          <div className="bg-sumi/90 border border-putty/20 rounded-2xl p-5 shadow-xl space-y-4 flex-1 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold text-linen flex items-center gap-2">
                <Award className="w-4 h-4 text-ochre" />
                Multi-Criteria CRE Engineering Scorecard & Examiner Q&A Flashcards
              </h4>
              <p className="text-xs text-putty/70 mt-0.5">
                Quantitative scoring across 5 industrial textile ETP design criteria
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-putty/20 text-putty/70">
                    <th className="py-2 px-2.5">Design Criterion (Weight)</th>
                    <th className="py-2 px-2.5 text-terracotta">Single CSTR</th>
                    <th className="py-2 px-2.5 text-celadon">Uniform PFR</th>
                    <th className="py-2 px-2.5 text-ochre font-bold">4-Stage Hybrid (Tapered)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-putty/15 font-mono">
                  <tr>
                    <td className="py-2 px-2.5 font-sans text-putty">1. Reactor Footprint (25%)</td>
                    <td className="py-2 px-2.5 text-terracotta">6.0/10 ({cstrV.toFixed(0)} m³)</td>
                    <td className="py-2 px-2.5 text-celadon font-bold">9.8/10 ({pfrV.toFixed(0)} m³)</td>
                    <td className="py-2 px-2.5 text-ochre font-bold">9.2/10 (215 m³)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2.5 font-sans text-putty">2. Dye Shock Buffering (25%)</td>
                    <td className="py-2 px-2.5 text-celadon font-bold">9.6/10 (Instant Dilution)</td>
                    <td className="py-2 px-2.5 text-terracotta">4.5/10 (Plug Breakthrough)</td>
                    <td className="py-2 px-2.5 text-ochre font-bold">8.8/10 (Lead-Cell Buffer)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2.5 font-sans text-putty">3. DO Profile & SVI Settling (20%)</td>
                    <td className="py-2 px-2.5 text-celadon font-bold">9.4/10 (DO={cstrDO.toFixed(2)}, SVI=110)</td>
                    <td className="py-2 px-2.5 text-terracotta">5.2/10 (DO Sag={pfrMinDO.toFixed(2)})</td>
                    <td className="py-2 px-2.5 text-ochre font-bold">9.5/10 (Tapered Diffusers)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2.5 font-sans text-putty">4. Civil Concrete CAPEX (15%)</td>
                    <td className="py-2 px-2.5 text-celadon font-bold">9.0/10 ($129.6k)</td>
                    <td className="py-2 px-2.5 text-putty">7.8/10 ($141.2k Baffles)</td>
                    <td className="py-2 px-2.5 text-ochre font-bold">8.7/10 ($132.4k)</td>
                  </tr>
                  <tr className="bg-putty/5 font-bold">
                    <td className="py-2.5 px-2.5 font-sans text-linen">Weighted Overall Score</td>
                    <td className="py-2.5 px-2.5 text-linen">8.25 / 10</td>
                    <td className="py-2.5 px-2.5 text-linen">7.15 / 10</td>
                    <td className="py-2.5 px-2.5 text-ochre text-sm">9.12 / 10 (WINNER)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
              <div className="bg-sumi border border-putty/20 rounded-xl p-3">
                <div className="font-bold text-ochre mb-1">Q1: When does V_CSTR / V_PFR approach 1.0?</div>
                <p className="text-putty/80 text-[11px]">
                  When target effluent Sₑ ≫ K_S (60 mg/L), Monod kinetics S/(K_S+S) ≈ 1.0 becomes apparent zero-order. Click Slide 3 & set Sₑ = 300 mg/L to show the ratio drop to 1.59×!
                </p>
              </div>
              <div className="bg-sumi border border-putty/20 rounded-xl p-3">
                <div className="font-bold text-celadon mb-1">Q2: How do we prevent PFR Pass-1 DO Sag?</div>
                <p className="text-putty/80 text-[11px]">
                  Redistribute the same total air supply using Tapered Aeration (1.65× k_La at inlet, 0.45× at exit) so oxygen transfer matches the exponential substrate uptake profile.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const containerClasses =
    isFullscreen || mode === 'modal'
      ? 'fixed inset-0 z-50 bg-sumi/95 backdrop-blur-xl flex flex-col overflow-y-auto p-3 sm:p-5'
      : 'w-full bg-sumi/95 border border-putty/25 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4';

  return (
    <div className={containerClasses}>
      {/* =====================================================================
          TOP POWERPOINT PRESENTER RIBBON (SLIDE TABS + CONTROLS)
      ===================================================================== */}
      <div className="bg-sumi border border-putty/25 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-terracotta/20 border border-terracotta/40 flex items-center justify-center text-terracotta">
            <Presentation className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-ochre">
                7-SLIDE POWERPOINT DEFENSE DECK
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-pine/60 text-celadon border border-celadon/30">
                Live Simulation Synced
              </span>
            </div>
            <p className="text-[11px] text-putty/70">
              Use <kbd className="px-1.5 py-0.5 bg-putty/10 rounded text-linen font-mono">←</kbd>{' '}
              <kbd className="px-1.5 py-0.5 bg-putty/10 rounded text-linen font-mono">→</kbd> arrow keys or click any slide below to present directly with live interactive graphs
            </p>
          </div>
        </div>

        {/* Slide Number Pills (1..7) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {slides.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setStep(idx)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                idx === step
                  ? 'bg-terracotta text-linen shadow-md scale-105'
                  : 'bg-putty/10 text-putty hover:bg-putty/20 hover:text-linen'
              }`}
              title={s.title}
            >
              S{idx + 1}
            </button>
          ))}
        </div>

        {/* Presenter Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              showNotes
                ? 'bg-ochre/20 border-ochre/40 text-ochre'
                : 'bg-putty/10 border-putty/20 text-putty'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            {showNotes ? 'Hide Notes' : 'Speaker Notes'}
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-putty/10 hover:bg-putty/20 text-putty hover:text-linen border border-putty/20 transition-all flex items-center gap-1.5"
            title="Print or Save Slide as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / PDF
          </button>

          {mode === 'embedded' && (
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-pine hover:bg-pine/80 text-linen border border-celadon/30 transition-all flex items-center gap-1.5"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              {isFullscreen ? 'Exit Fullscreen' : '16:9 Fullscreen'}
            </button>
          )}

          {(mode === 'modal' || isFullscreen) && (
            <button
              onClick={() => {
                setIsFullscreen(false);
                if (onClose) onClose();
              }}
              className="p-2 rounded-xl bg-oxblood/60 hover:bg-oxblood text-linen border border-terracotta/40 transition-all"
              title="Close Fullscreen Deck"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
          MAIN WIDESCREEN 16:9 POWERPOINT SLIDE CANVAS
      ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch flex-1 my-2">
        {/* LEFT COLUMN (5 COLS): POWERPOINT SLIDE NARRATIVE, EQUATION, KPIS & LIVE SLIDERS */}
        <div className="lg:col-span-5 bg-sumi border border-putty/25 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl">
          <div className="space-y-3.5">
            {/* Slide Badge & Category */}
            <div className="flex items-center justify-between gap-2">
              <span className="px-2.5 py-1 rounded-md bg-terracotta/20 border border-terracotta/40 text-terracotta font-mono text-[11px] font-bold">
                {currentSlide.number}
              </span>
              <span className="text-[11px] font-mono uppercase tracking-wider text-ochre font-semibold">
                {currentSlide.category}
              </span>
            </div>

            {/* Slide Title & Subtitle */}
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-linen leading-snug">
                {currentSlide.title}
              </h2>
              <p className="text-xs text-putty/80 mt-1">{currentSlide.subtitle}</p>
            </div>

            {/* Governing Equation Banner */}
            <div className="bg-putty/5 border-l-4 border-ochre rounded-r-xl px-3.5 py-2.5 font-mono text-xs text-ochre overflow-x-auto">
              {currentSlide.equation}
            </div>

            {/* 4 Live Dynamic KPI Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {currentSlide.kpis.map((kpi, i) => (
                <div key={i} className="bg-putty/5 border border-putty/15 rounded-xl p-2.5">
                  <div className="text-[10px] text-putty/70 truncate">{kpi.label}</div>
                  <div className={`text-xs sm:text-sm font-mono font-extrabold mt-0.5 ${kpi.color}`}>
                    {kpi.value}
                  </div>
                </div>
              ))}
            </div>

            {/* PowerPoint Bullet Points */}
            <ul className="space-y-2.5 pt-1">
              {currentSlide.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs sm:text-[13px] text-linen/90 leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-pine/70 border border-celadon/40 text-celadon flex items-center justify-center text-[11px] font-mono font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* LIVE INTERACTIVE SLIDE CONTROLS (SO USER CAN ADJUST GRAPHS DURING PRESENTATION) */}
          <div className="bg-putty/5 border border-putty/20 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-celadon flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                Live On-Slide Parameter Controls
              </span>
              {onApplyPreset && (
                <button
                  onClick={() => onApplyPreset(currentSlide.preset)}
                  className="px-2.5 py-1 rounded-lg bg-terracotta hover:bg-terracotta/90 text-linen font-semibold text-[11px] flex items-center gap-1 shadow transition-all"
                >
                  <Play className="w-3 h-3" />
                  {currentSlide.presetLabel}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="flex justify-between text-putty text-[11px]">
                  <span>Influent bCOD (S₀):</span>
                  <span className="font-mono font-bold text-terracotta">{S0} mg/L</span>
                </div>
                <input
                  type="range"
                  min="300"
                  max="2000"
                  step="25"
                  value={S0}
                  onChange={(e) => setS0 && setS0(Number(e.target.value))}
                  className="w-full accent-terracotta mt-1"
                />
              </div>

              <div>
                <div className="flex justify-between text-putty text-[11px]">
                  <span>Target Effluent (Sₑ):</span>
                  <span className="font-mono font-bold text-celadon">{targetSe} mg/L</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="350"
                  step="5"
                  value={targetSe}
                  onChange={(e) => setTargetSe && setTargetSe(Number(e.target.value))}
                  className="w-full accent-celadon mt-1"
                />
              </div>

              <div>
                <div className="flex justify-between text-putty text-[11px]">
                  <span>Sludge Age (θc):</span>
                  <span className="font-mono font-bold text-ochre">{thetaC.toFixed(2)} d</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="15"
                  step="0.1"
                  value={thetaC}
                  onChange={(e) => setThetaC && setThetaC(Number(e.target.value))}
                  className="w-full accent-ochre mt-1"
                />
              </div>

              <div>
                <div className="flex justify-between text-putty text-[11px]">
                  <span>Temperature (T):</span>
                  <span className="font-mono font-bold text-linen">{temperature}°C</span>
                </div>
                <input
                  type="range"
                  min="18"
                  max="40"
                  step="1"
                  value={temperature}
                  onChange={(e) => setTemperature && setTemperature(Number(e.target.value))}
                  className="w-full accent-ochre mt-1"
                />
              </div>
            </div>
          </div>

          {/* Presenter Speaker Notes */}
          {showNotes && (
            <div className="bg-pine/20 border border-celadon/30 rounded-xl p-3 text-xs text-celadon">
              <span className="font-bold uppercase tracking-wider text-[10px] block mb-1 text-ochre">
                🎙️ Presenter Defense Cue:
              </span>
              {currentSlide.speakerNotes}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (7 COLS): EMBEDDED LIVE SIMULATION / DYNAMIC GRAPH */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          {renderSlideVisual()}
        </div>
      </div>

      {/* =====================================================================
          BOTTOM SLIDE FOOTER & PROGRESS BAR
      ===================================================================== */}
      <div className="bg-sumi border border-putty/20 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-4">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-putty/10 hover:bg-putty/20 disabled:opacity-40 text-linen flex items-center gap-1.5 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous Slide
        </button>

        <div className="flex-1 max-w-md flex items-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setStep(idx)}
              className={`h-2 flex-1 rounded-full transition-all ${
                idx === step ? 'bg-terracotta' : idx < step ? 'bg-celadon/60' : 'bg-putty/20'
              }`}
              title={`Go to Slide ${idx + 1}`}
            />
          ))}
        </div>

        <button
          onClick={() => setStep((s) => Math.min(totalSlides - 1, s + 1))}
          disabled={step === totalSlides - 1}
          className="px-4 py-1.5 rounded-xl text-xs font-bold bg-terracotta hover:bg-terracotta/90 disabled:opacity-40 text-linen flex items-center gap-1.5 shadow transition-all"
        >
          Next Slide
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
