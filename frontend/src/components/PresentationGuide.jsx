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
  Sparkles,
  BookOpen,
  Zap,
  Award,
  Printer,
  Download,
  Users,
  HeartHandshake
} from 'lucide-react';
import Bioreactor3D from './Bioreactor3D';
import LevenspielPlot from './LevenspielPlot';
import AxialProfilesPlot from './AxialProfilesPlot';
import TransientPlot from './TransientPlot';
import CREExperimentsPanel from './CREExperimentsPanel';

export const GROUP_MEMBERS = [
  { id: 1, name: 'Sarim Sadman Rafio' },
  { id: 2, name: 'Kazi Farhan Hasan' },
  { id: 3, name: 'Md. Zinnuraine' },
  { id: 4, name: 'Azizia Binta Sayeed' },
  { id: 5, name: 'Sabikun Nahar Anika' }
];

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
  const [slide9View, setSlide9View] = useState('thankyou'); // 'thankyou' | '3d' | 'levenspiel' | 'profiles'

  const totalSlides = 9;

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
      number: 'SLIDE 01 / 09',
      category: 'WELCOME & RESEARCH GROUP INTRODUCTION',
      presenter: '1. Sarim Sadman Rafio (Opening & Team Intro)',
      title: 'Welcome Everyone: Comparative Design of CSTR & PFR Bioreactors for Textile Dyeing Effluent',
      subtitle: 'Chemical Reaction Engineering (CRE) Digital Twin, Multi-Physics Simulation & Bangladesh DoE Compliance',
      equation: (
        <>
          Group Members: 1. Sarim Sadman Rafio • 2. Kazi Farhan Hasan • 3. Md. Zinnuraine • 4. Azizia Binta Sayeed • 5. Sabikun Nahar Anika
        </>
      ),
      preset: 'baseline',
      presetLabel: 'Initialize Design Baseline (32°C)',
      kpis: [
        {
          label: 'Research Team',
          value: '5 Group Members',
          color: 'text-ochre'
        },
        {
          label: (
            <>
              Design Capacity (Q<sub>0</sub>)
            </>
          ),
          value: (
            <>
              {Q} m<sup>3</sup>/d
            </>
          ),
          color: 'text-linen'
        },
        {
          label: (
            <>
              bCOD Reduction (S<sub>0</sub>➔S<sub>e</sub>)
            </>
          ),
          value: `${S0} ➔ ${targetSe} mg/L`,
          color: 'text-celadon'
        },
        {
          label: (
            <>
              Volume Ratio (V<sub>C</sub>/V<sub>P</sub>)
            </>
          ),
          value: `${volumeRatio.toFixed(2)}×`,
          color: 'text-terracotta'
        }
      ],
      bullets: [
        <>
          <strong>Warm Welcome to Honorable Faculty &amp; Audience:</strong> Welcome to our Chemical Reaction Engineering (CRE) design defense on biological treatment of high-strength industrial textile dyeing wastewater in Bangladesh.
        </>,
        <>
          <strong>Presented by Our 5-Member Engineering Team:</strong> (1) <strong>Sarim Sadman Rafio</strong>, (2) <strong>Kazi Farhan Hasan</strong>, (3) <strong>Md. Zinnuraine</strong>, (4) <strong>Azizia Binta Sayeed</strong>, and (5) <strong>Sabikun Nahar Anika</strong>.
        </>,
        <>
          <strong>Live Interactive Digital Twin Presentation:</strong> Every slide in this deck is directly wired to a real-time 60 FPS Runge-Kutta (RK4) multi-physics solver, interactive 3D ETP plant, Levenspiel sizing integrator, and TEA/LCA scorecard.
        </>
      ],
      speakerNotes: (
        <>
          Greet the examination panel and audience warmly, introduce all 5 group members listed on the right-hand showcase card, and briefly state our core question: Why does a 4-Pass PFR require 3.09× less liquid volume than a CSTR at 90% bCOD removal, yet demand a hybrid staged architecture for industrial resilience?
        </>
      )
    },
    {
      number: 'SLIDE 02 / 09',
      category: 'INDUSTRIAL PROBLEM & ETP ARCHITECTURE',
      presenter: '1. Sarim Sadman Rafio',
      title: 'Biological Treatment of Textile Dyeing Effluent: CSTR vs. PFR Digital Twin',
      subtitle: 'Gazipur-Narayanganj Wet-Processing Corridor | Bangladesh DoE ECR Schedule-10 Compliance',
      equation: (
        <>
          Q<sub>0</sub> = {Q} m<sup>3</sup>/d &nbsp;|&nbsp; S<sub>0</sub> = {S0} mg bCOD/L &nbsp;➔&nbsp; Target S<sub>e</sub> ≤ {targetSe} mg/L ({removalPct.toFixed(1)}% Removal)
        </>
      ),
      preset: 'baseline',
      presetLabel: 'Load Baseline Textile ETP (32°C)',
      kpis: [
        {
          label: (
            <>
              Design Flow (Q<sub>0</sub>)
            </>
          ),
          value: (
            <>
              {Q} m<sup>3</sup>/d
            </>
          ),
          color: 'text-linen'
        },
        {
          label: (
            <>
              Influent bCOD (S<sub>0</sub>)
            </>
          ),
          value: `${S0} mg/L`,
          color: 'text-terracotta'
        },
        {
          label: (
            <>
              Target Effluent (S<sub>e</sub>)
            </>
          ),
          value: `${targetSe} mg/L`,
          color: 'text-celadon'
        },
        { label: 'Process Temp (T)', value: `${temperature}°C`, color: 'text-ochre' }
      ],
      bullets: [
        <>
          Export-oriented knit/woven dyeing mills discharge high-strength alkaline organic effluent (S<sub>0</sub> = {S0} mg/L bCOD, reactive azo dyes, starch sizing, and Glauber&apos;s salt).
        </>,
        <>
          Complete 8-stage hydraulic train modeled in 3D: Raw Intake (INF-001) ➔ FeSO<sub>4</sub>/Lime Coagulation (CHEM-001) ➔ Equalization (EQ-001) ➔ Rotary Screen (SCR-001) ➔ Parallel CSTR-101 &amp; PFR-102 ➔ Secondary Clarifiers (CLR-201/202) ➔ Tertiary Filters (FLT-301) ➔ River Outfall (OUTFALL-001).
        </>,
        <>
          Core Chemical Reaction Engineering (CRE) objective: Rigorously size and compare an Ideal Back-Mixed CSTR against a 4-Pass Baffled Serpentine PFR under identical biological sludge age (θ<sub>c</sub> = {thetaC.toFixed(1)} d).
        </>
      ],
      speakerNotes: (
        <>
          Rotate the live 3D Digital Twin on the right. Point out the dark indigo raw intake pipe (INF-001) on the left and follow the transparent glass process pipes with internal fluid flow all the way to the emerald-clear compliance outfall (OUTFALL-001) on the right.
        </>
      )
    },
    {
      number: 'SLIDE 03 / 09',
      category: 'BIOCHEMICAL REACTION KINETICS',
      presenter: '2. Kazi Farhan Hasan',
      title: 'Dual-Limitation Monod-Haldane Kinetics & Arrhenius Thermal Coupling',
      subtitle: 'Simultaneous Carbon Substrate (S), Dissolved Oxygen (DO), and Toxic Azo-Dye Inhibition Modeling',
      equation: (
        <>
          μ(S, DO, T) = μ<sub>max</sub>(T) · [ S / (K<sub>S</sub> + S + S<sup>2</sup>/K<sub>I</sub>) ] · [ DO / (K<sub>OH</sub> + DO) ] &nbsp;|&nbsp; r<sub>s</sub> = −(μ / Y) · X<sub>b</sub>
        </>
      ),
      preset: 'monsoon_cool',
      presetLabel: 'Test Winter/Monsoon Cool (22°C)',
      kpis: [
        {
          label: (
            <>
              μ<sub>max</sub> ({temperature}°C)
            </>
          ),
          value: (
            <>
              {muMaxT.toFixed(2)} d<sup>−1</sup>
            </>
          ),
          color: 'text-ochre'
        },
        {
          label: (
            <>
              Half-Velocity K<sub>S</sub>
            </>
          ),
          value: `${currentKinetics?.Ks ?? 60} mg/L`,
          color: 'text-linen'
        },
        {
          label: (
            <>
              Oxygen K<sub>OH</sub>
            </>
          ),
          value: `${currentKinetics?.K_oh ?? 0.2} mg/L`,
          color: 'text-celadon'
        },
        {
          label: (
            <>
              Min SRT (θ<sub>c,min</sub>)
            </>
          ),
          value: `${thetaMin.toFixed(2)} d`,
          color: 'text-terracotta'
        }
      ],
      bullets: [
        <>
          Arrhenius thermal scaling (θ<sub>T</sub> = 1.072) boosts maximum specific growth rate from 3.20 d<sup>−1</sup> at 20°C to {muMaxT.toFixed(2)} d<sup>−1</sup> at {temperature}°C (typical warm textile vat discharge).
        </>,
        <>
          Dual-substrate Monod switching multiplies organic carbon saturation S/(K<sub>S</sub> + S) by oxygen availability DO/(K<sub>OH</sub> + DO), capturing anoxic rate collapse whenever DO drops near K<sub>OH</sub> = 0.20 mg/L.
        </>,
        <>
          Under extreme factory vat dumps (S &gt; 1,200 mg/L), Haldane substrate inhibition (S<sup>2</sup>/K<sub>I</sub>, K<sub>I</sub> = 1,200 mg/L) depresses microbial growth in unbuffered plug-flow inlet zones.
        </>
      ],
      speakerNotes: (
        <>
          Use the Temperature slider below to shift between 22°C (Winter) and 38°C (Hot Dye Discharge) while watching the Monod growth curve and washout threshold (1/θ<sub>c</sub> + k<sub>d</sub>) update in real time on the right.
        </>
      )
    },
    {
      number: 'SLIDE 04 / 09',
      category: 'STEADY-STATE REACTOR SIZING (FOGLER CH. 2)',
      presenter: '3. Md. Zinnuraine',
      title: 'Levenspiel Reciprocal-Rate Sizing: Why PFR Saves 68% Volume at 90% Removal',
      subtitle: (
        <>
          Graphical Integration of (−1/r<sub>s</sub>) vs. Conversion X from X = 0 to X = {(removalPct / 100).toFixed(2)}
        </>
      ),
      equation: (
        <>
          V<sub>CSTR</sub> = F<sub>S0</sub> · X<sub>target</sub> · (−1/r<sub>s</sub>)<sub>exit</sub> = {cstrV.toFixed(1)} m<sup>3</sup> &nbsp; vs. &nbsp; V<sub>PFR</sub> = F<sub>S0</sub> ∫ (−1/r<sub>s</sub>) dX = {pfrV.toFixed(1)} m<sup>3</sup>
        </>
      ),
      preset: 'high_target_se',
      presetLabel: (
        <>
          Demo High Target S<sub>e</sub> = 300 mg/L
        </>
      ),
      kpis: [
        {
          label: (
            <>
              CSTR Volume (V<sub>CSTR</sub>)
            </>
          ),
          value: (
            <>
              {cstrV.toFixed(1)} m<sup>3</sup>
            </>
          ),
          color: 'text-terracotta'
        },
        {
          label: (
            <>
              PFR Volume (V<sub>PFR</sub>)
            </>
          ),
          value: (
            <>
              {pfrV.toFixed(1)} m<sup>3</sup>
            </>
          ),
          color: 'text-celadon'
        },
        {
          label: (
            <>
              Volume Ratio (V<sub>C</sub>/V<sub>P</sub>)
            </>
          ),
          value: `${volumeRatio.toFixed(2)}×`,
          color: 'text-ochre'
        },
        {
          label: (
            <>
              HRT (τ<sub>CSTR</sub> / τ<sub>PFR</sub>)
            </>
          ),
          value: `${cstrTauHr.toFixed(1)}h / ${pfrTauHr.toFixed(1)}h`,
          color: 'text-linen'
        }
      ],
      bullets: [
        <>
          In an Ideal CSTR, perfect back-mixing forces the entire {cstrV.toFixed(1)} m<sup>3</sup> vessel to operate at the lowest exit substrate concentration (S<sub>e</sub> = {targetSe} mg/L), where (−1/r<sub>s</sub>) is at its peak ({(levenspiel?.cstrInvRate ?? 0.65).toFixed(3)} L·d/mg).
        </>,
        <>
          In a 4-Pass PFR, substrate concentration grades progressively from {S0} mg/L at the inlet to {targetSe} mg/L at the exit, keeping reaction rates high across the first 70% of the channel and requiring only {pfrV.toFixed(1)} m<sup>3</sup>.
        </>,
        <>
          Interactive Proof: Drag Target S<sub>e</sub> from 75 mg/L ({volumeRatio.toFixed(2)}× ratio) up to 300 mg/L (saturation regime where S ≫ K<sub>S</sub>, pseudo-zero-order) to watch the CSTR rectangle and PFR integral converge toward 1.59×!
        </>
      ],
      speakerNotes: (
        <>
          Hover over the live Levenspiel Plot on the right to inspect (−1/r<sub>s</sub>) at any conversion X. Drag the Target Effluent S<sub>e</sub> slider between 40 mg/L and 300 mg/L to prove why CSTR penalty is severe only at deep compliance targets (S<sub>e</sub> ≈ K<sub>S</sub>).
        </>
      )
    },
    {
      number: 'SLIDE 05 / 09',
      category: '1D SPATIAL PFR ODEs & OXYGEN MASS TRANSFER',
      presenter: '3. Md. Zinnuraine',
      title: 'Coupled Axial PFR Profiles & The Entrance Dissolved Oxygen Sag Trap',
      subtitle: '4th-Order Runge-Kutta Integration Along Dimensionless Channel Length (z/L ∈ [0, 1])',
      equation: (
        <>
          d(DO)/dτ = k<sub>L</sub>a · (DO<sub>sat</sub> − DO) − [ (1 − 1.42 Y<sub>obs</sub>)/Y ] · μ · X<sub>b</sub> − 1.42 · k<sub>d</sub> · X<sub>b</sub>
        </>
      ),
      preset: 'baseline',
      presetLabel: (
        <>
          Reset to Uniform Aeration (k<sub>L</sub>a = 150)
        </>
      ),
      kpis: [
        { label: 'CSTR Uniform DO', value: `${cstrDO.toFixed(2)} mg/L`, color: 'text-celadon' },
        { label: 'PFR Minimum DO', value: `${pfrMinDO.toFixed(2)} mg/L`, color: pfrMinDO < 1.0 ? 'text-terracotta' : 'text-celadon' },
        { label: 'Aeration Mode', value: aerationMode.toUpperCase(), color: 'text-ochre' },
        { label: 'PFR SVI Settling', value: `${pfrResult?.svi ?? 165} mL/g`, color: 'text-linen' }
      ],
      bullets: [
        <>
          At the PFR inlet (z/L = 0.05–0.25), high substrate S<sub>0</sub> = {S0} mg/L drives intense microbial oxygen uptake (OUR) that outpaces uniform diffuser supply (k<sub>L</sub>a = {kLa} d<sup>−1</sup>).
        </>,
        <>
          Bulk DO plunges to {pfrMinDO.toFixed(2)} mg/L in Pass 1 (below the 1.0 mg/L aerobic threshold), triggering <em>Sphaerotilus natans</em> filamentous sludge bulking (SVI = {pfrResult?.svi ?? 165} mL/g).
        </>,
        <>
          Engineering Solution: Click &ldquo;Tapered k<sub>L</sub>a&rdquo; on the right panel (1.65× diffuser density at inlet, 0.45× at exit) to eliminate the DO sag without increasing total blower energy!
        </>
      ],
      speakerNotes: (
        <>
          Slide the Virtual Sonde Probe (z/L) across the PFR channel on the right to show S(z), X<sub>b</sub>(z), and DO(z). Click the &ldquo;Tapered k<sub>L</sub>a&rdquo; toggle button on the slide to demonstrate how spatial k<sub>L</sub>a allocation rescues Pass-1 Dissolved Oxygen.
        </>
      )
    },
    {
      number: 'SLIDE 06 / 09',
      category: 'NON-IDEAL FLOW, RTD E(θ), SHOCK LOADS & DYNAMICS',
      presenter: '4. Azizia Binta Sayeed',
      title: 'Residence Time Distribution, Toxic Vat Dump Buffering & 25-Day Startup',
      subtitle: 'Fogler E(θ) Dispersion Modeling, 2-Hour Azo-Dye Shock Wave, and Dynamic Biomass Washout',
      equation: (
        <>
          E<sub>CSTR</sub>(θ) = e<sup>−θ</sup> &nbsp;|&nbsp; E<sub>N-Series</sub>(θ) = [N·(Nθ)<sup>N−1</sup>/(N−1)!]·e<sup>−Nθ</sup> &nbsp;|&nbsp; dX<sub>b</sub>/dt = (μ − 1/θ<sub>c</sub> − k<sub>d</sub>)·X<sub>b</sub>
        </>
      ),
      preset: 'toxic_shock',
      presetLabel: (
        <>
          Trigger Toxic Shock (S<sub>0</sub> = 1800 mg/L)
        </>
      ),
      kpis: [
        {
          label: (
            <>
              Operating SRT (θ<sub>c</sub>)
            </>
          ),
          value: `${thetaC.toFixed(2)} d`,
          color: thetaC <= thetaMin * 1.2 ? 'text-terracotta' : 'text-celadon'
        },
        {
          label: (
            <>
              Washout Limit (θ<sub>c,min</sub>)
            </>
          ),
          value: `${thetaMin.toFixed(2)} d`,
          color: 'text-ochre'
        },
        {
          label: (
            <>
              Active Biomass (X<sub>b</sub>)
            </>
          ),
          value: `${cstrXb.toFixed(0)} mg/L`,
          color: 'text-linen'
        },
        { label: 'Safety Factor (SF)', value: `${(thetaC / Math.max(0.01, thetaMin)).toFixed(1)}×`, color: 'text-celadon' }
      ],
      bullets: [
        <>
          Real baffled basins deviate from ideal plug flow via axial dispersion (Peclet Pe = 30) and are modeled as N-staged CSTRs-in-series (N = 4 approaches PFR efficiency while retaining back-mixed stability).
        </>,
        <>
          Crucial CSTR Advantage: During a 2-hour factory dye vat dump (2,200 mg/L), the CSTR&apos;s {cstrV.toFixed(0)} m<sup>3</sup> volume instantaneously dilutes the pulse below the 75 mg/L limit, whereas a PFR suffers an unattenuated toxic plug breakthrough!
        </>,
        <>
          Dynamic Startup ODEs: From seed inoculation (X<sub>b,0</sub> = 150 mg/L), the bioreactor requires ~12–15 days (≈ 3 × θ<sub>c</sub>) to reach steady-state MLVSS ({cstrXb.toFixed(0)} mg/L). Dropping θ<sub>c</sub> below {thetaMin.toFixed(2)} d causes complete biomass washout.
        </>
      ],
      speakerNotes: (
        <>
          Use the toggle at the top of the right panel to switch between the Fogler RTD &amp; Toxic Shock Cannon and the 25-Day Startup ODE Trajectory. Drag θ<sub>c</sub> below θ<sub>c,min</sub> (0.42 d) to show washout live.
        </>
      )
    },
    {
      number: 'SLIDE 07 / 09',
      category: 'TECHNO-ECONOMIC ANALYSIS (TEA) & LIFE CYCLE ASSESSMENT (LCA)',
      presenter: '5. Sabikun Nahar Anika',
      title: 'Why Smaller Volume ≠ Lower Energy: Civil CAPEX, Blower Power & Carbon Parity',
      subtitle: (
        <>
          Bangladesh Industrial Tariff ($0.095/kWh), Grid Emission Factor (0.615 kg CO<sub>2</sub>e/kWh) &amp; Concrete Sizing
        </>
      ),
      equation: (
        <>
          OUR<sub>total</sub> = Q<sub>0</sub>·(S<sub>0</sub> − S<sub>e</sub>)·(1 − 1.42·Y<sub>obs</sub>) = {((sustCSTR?.aeration_kwh_day ?? 488) * 1.8).toFixed(0)} kg O<sub>2</sub>/d &nbsp;➔&nbsp; E<sub>aeration</sub> = {(sustCSTR?.aeration_kwh_day ?? 488).toFixed(1)} kWh/d
        </>
      ),
      preset: 'baseline',
      presetLabel: (
        <>
          Restore Design Baseline (Q<sub>0</sub> = 1000)
        </>
      ),
      kpis: [
        { label: 'CSTR Civil CAPEX', value: `$${(cstrResult?.geometry?.capexUSD ?? 129600).toLocaleString()}`, color: 'text-celadon' },
        { label: 'PFR Civil CAPEX', value: `$${(pfrResult?.geometry?.capexUSD ?? 141200).toLocaleString()}`, color: 'text-ochre' },
        {
          label: 'Specific Energy',
          value: (
            <>
              {(sustCSTR?.energy_kwh_per_m3 ?? 0.642).toFixed(3)} kWh/m<sup>3</sup>
            </>
          ),
          color: 'text-linen'
        },
        {
          label: 'Carbon Footprint',
          value: (
            <>
              {((sustCSTR?.ghg_kg_co2e_per_m3 ?? 0.395) * Q).toFixed(0)} kg CO<sub>2</sub>e/d
            </>
          ),
          color: 'text-terracotta'
        }
      ],
      bullets: [
        <>
          Thermodynamic Oxygen Demand Parity: Both reactors oxidize the exact same daily bCOD mass ({((Q * (S0 - targetSe)) / 1000).toFixed(1)} kg bCOD/d), requiring identical stoichiometric aeration energy ({(sustCSTR?.aeration_kwh_day ?? 488.3).toFixed(1)} kWh/d = 76% of plant electricity).
        </>,
        <>
          Civil Engineering Surprise: Although PFR liquid volume is smaller ({pfrV.toFixed(1)} vs. {cstrV.toFixed(1)} m<sup>3</sup>), its 3 internal reinforced-concrete serpentine baffle walls increase structural wall area and formwork, making PFR CAPEX slightly higher (${(pfrResult?.geometry?.capexUSD ?? 141200).toLocaleString()} vs. ${(cstrResult?.geometry?.capexUSD ?? 129600).toLocaleString()}).
        </>,
        <>
          Total Operating Cost &amp; Carbon Footprint: Both configurations operate at ${(sustCSTR?.cost_usd_per_m3 ?? 0.061).toFixed(3)}/m<sup>3</sup> (${((sustCSTR?.cost_usd_per_m3 ?? 0.061) * Q).toFixed(2)}/day) and emit {((sustCSTR?.ghg_kg_co2e_per_m3 ?? 0.395) * Q).toFixed(1)} kg CO<sub>2</sub>e/day.
        </>
      ],
      speakerNotes: (
        <>
          This slide answers the classic examiner trap: &ldquo;If PFR is 3.09× smaller in volume, does it use 3× less electricity?&rdquo; Point to the energy bar chart on the right to explain why biological oxygen demand is governed by mass of COD removed, not tank volume.
        </>
      )
    },
    {
      number: 'SLIDE 08 / 09',
      category: 'FINAL ENGINEERING RECOMMENDATION & MULTI-CRITERIA VERDICT',
      presenter: '5. Sabikun Nahar Anika',
      title: 'Definitive Engineering Verdict: Hybrid 4-Stage Compartmentalized Basin with Tapered Aeration',
      subtitle: 'Synthesizing Volumetric Efficiency, Shock-Load Resilience, and DO-Sag Prevention for Bangladesh ETPs',
      equation: (
        <>
          Optimal Design: V<sub>total</sub> = 215 m<sup>3</sup> (4-Stage Cascade) + Tapered k<sub>L</sub>a (240 ➔ 70 d<sup>−1</sup>) + R = 0.40 RAS Recycle
        </>
      ),
      preset: 'baseline',
      presetLabel: 'Reset All Parameters for Verdict',
      kpis: [
        { label: 'Volumetric Winner', value: `PFR (${volumeRatio.toFixed(2)}× smaller)`, color: 'text-celadon' },
        { label: 'Shock Resilience Winner', value: 'CSTR (Dilution Buffer)', color: 'text-workwear' },
        { label: 'CAPEX & SVI Winner', value: 'CSTR (No Baffle Walls)', color: 'text-ochre' },
        { label: 'Recommended Design', value: '4-Stage Hybrid Cascade', color: 'text-linen' }
      ],
      bullets: [
        <>
          Pure PFR Verdict: Achieves a {volumeRatio.toFixed(2)}× smaller active liquid footprint ({pfrV.toFixed(1)} m<sup>3</sup> vs. {cstrV.toFixed(1)} m<sup>3</sup>), ideal for land-constrained Dhaka/Gazipur factories, but requires tapered aeration to prevent Pass-1 DO sag ({pfrMinDO.toFixed(2)} mg/L) and upstream equalization to buffer dye dumps.
        </>,
        <>
          Pure CSTR Verdict: Requires {cstrV.toFixed(1)} m<sup>3</sup> liquid volume, but provides automatic dilution against toxic azo-dye shock loads, uniform DO ({cstrDO.toFixed(2)} mg/L), superior sludge settling (SVI {cstrResult?.recycle?.svi ?? 110} mL/g), and lower concrete wall cost.
        </>,
        <>
          Final Recommendation: Construct a 4-Compartment Staged Basin (N = 4 CSTRs-in-series) with a larger first mixing cell (to buffer dye shocks) and tapered fine-bubble diffusers—capturing 82% of the PFR volume savings with zero filamentous bulking risk.
        </>
      ],
      speakerNotes: (
        <>
          Walk through the Multi-Criteria CRE Engineering Scorecard on the right (9.12/10 for the 4-Stage Hybrid Cascade vs. 8.25/10 for Single CSTR and 7.15/10 for Uniform PFR), then advance to Slide 9 to thank the panel and open the floor for Q&amp;A.
        </>
      )
    },
    {
      number: 'SLIDE 09 / 09',
      category: 'THANK YOU & LIVE EXAMINER Q&A DEFENSE',
      presenter: 'All 5 Group Members (Closing & Q&A)',
      title: 'Thank You Everyone for Your Time & Attention — Questions & Live Simulation Defense',
      subtitle: 'Interactive CRE Digital Twin Ready for Live Parameter Stress-Testing by the Examination Panel',
      equation: (
        <>
          Thank You from: 1. Sarim Sadman Rafio • 2. Kazi Farhan Hasan • 3. Md. Zinnuraine • 4. Azizia Binta Sayeed • 5. Sabikun Nahar Anika
        </>
      ),
      preset: 'baseline',
      presetLabel: 'Reset Baseline for Examiner Q&A',
      kpis: [
        { label: 'Presentation Status', value: 'Complete (9/9)', color: 'text-celadon' },
        { label: 'CSTR vs PFR Ratio', value: `${volumeRatio.toFixed(2)}×`, color: 'text-ochre' },
        {
          label: 'DoE Compliance',
          value: (
            <>
              S<sub>e</sub> ≤ {targetSe} mg/L
            </>
          ),
          color: 'text-linen'
        },
        { label: 'Hybrid Score', value: '9.12 / 10', color: 'text-terracotta' }
      ],
      bullets: [
        <>
          <strong>Thank You for Listening:</strong> On behalf of all 5 group members—<strong>Sarim Sadman Rafio</strong>, <strong>Kazi Farhan Hasan</strong>, <strong>Md. Zinnuraine</strong>, <strong>Azizia Binta Sayeed</strong>, and <strong>Sabikun Nahar Anika</strong>—we sincerely thank our respected faculty examiners and classmates for your attention.
        </>,
        <>
          <strong>Key Takeaway Summary:</strong> While Levenspiel kinetics gives PFR a {volumeRatio.toFixed(2)}× volumetric edge ({pfrV.toFixed(1)} m<sup>3</sup> vs. {cstrV.toFixed(1)} m<sup>3</sup>), coupling 1D DO mass transfer, RTD dispersion, and TEA/LCA proves that a <strong>4-Stage Hybrid Cascade with Tapered Aeration</strong> is the optimal real-world ETP architecture.
        </>,
        <>
          <strong>Open Floor for Questions:</strong> Use the live Q&amp;A view switcher on the right or drag any parameter slider below to test any hypothetical scenario live in front of the examination board!
        </>
      ],
      speakerNotes: (
        <>
          Conclude warmly, thank the professors and audience, and invite questions. Keep this slide on screen during Q&amp;A—you can switch between the Team Sign-Off &amp; Q&amp;A Flashcards, Live 3D Plant, Levenspiel Plot, or Axial DO Profiles with one click!
        </>
      )
    }
  ];

  const currentSlide = slides[step];

  // Helper to render the right-hand interactive visualization for each slide
  const renderSlideVisual = () => {
    // SLIDE 1 (step === 0): WELCOME & 5 GROUP MEMBERS SHOWCASE + PRESENTATION ROADMAP
    if (step === 0) {
      return (
        <div className="flex flex-col h-full justify-between space-y-4 bg-sumi/90 border border-putty/20 rounded-2xl p-5 shadow-xl">
          <div className="bg-gradient-to-r from-terracotta/25 via-ochre/15 to-pine/30 border border-ochre/40 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-ochre/20 border border-ochre/40 text-ochre text-[10px] font-mono font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                Chemical Reaction Engineering • Course Design Project
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-linen">
                Welcome to Our Presentation Defense
              </h3>
              <p className="text-xs text-putty/80">
                Comparative CSTR vs. PFR Bioreactor Sizing, Multi-Physics ODEs &amp; Techno-Economic Defense
              </p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="px-3.5 py-2 rounded-xl bg-terracotta hover:bg-terracotta/90 text-linen text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all"
            >
              <span>Start Technical Deck</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 5 Group Members Showcase Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-celadon flex items-center gap-1.5">
                <Users className="w-4 h-4 text-ochre" />
                Presented By Group Members (5)
              </h4>
              <span className="text-[11px] font-mono text-putty/70">
                Chemical Reaction Engineering Research Team
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GROUP_MEMBERS.map((member, idx) => (
                <div
                  key={member.id}
                  className={`bg-sumi border border-putty/20 rounded-xl p-3.5 flex items-center gap-3 ${
                    idx === 4 ? 'sm:col-span-2' : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-terracotta/20 border border-terracotta/40 text-ochre font-mono font-extrabold text-sm flex items-center justify-center shrink-0">
                    0{member.id}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-extrabold text-linen truncate">
                      {member.id}. {member.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Presentation Agenda / Outline Card (No 3D Simulation on Slide 1) */}
          <div className="bg-putty/5 border border-putty/20 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ochre">
                Presentation Deck Structure (Slides S2 – S8)
              </span>
              <span className="text-[11px] font-mono text-celadon">Click any topic to jump</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { idx: 1, tag: 'S2', title: 'Industrial ETP Problem & 3D Digital Twin' },
                { idx: 2, tag: 'S3', title: 'Dual Monod-Haldane Kinetics & Arrhenius' },
                { idx: 3, tag: 'S4', title: 'Levenspiel Sizing (CSTR vs. PFR Volume)' },
                { idx: 4, tag: 'S5', title: '1D Spatial PFR ODEs & Entrance DO Sag' },
                { idx: 5, tag: 'S6', title: 'Fogler RTD E(θ), Dye Shock & 25-Day Startup' },
                { idx: 6, tag: 'S7', title: 'TEA/LCA Energy & Civil Concrete CAPEX' },
                { idx: 7, tag: 'S8', title: 'Final 4-Stage Hybrid Cascade Verdict' }
              ].map((item) => (
                <button
                  key={item.tag}
                  onClick={() => setStep(item.idx)}
                  className="text-left px-3 py-2 rounded-lg bg-sumi hover:bg-putty/10 border border-putty/15 hover:border-ochre/40 flex items-center gap-2 transition-all"
                >
                  <span className="font-mono font-bold text-terracotta text-[11px]">{item.tag}</span>
                  <span className="text-linen/90 truncate">{item.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // SLIDE 2 (step === 1): INDUSTRIAL PROBLEM & 3D ETP ARCHITECTURE
    if (step === 1) {
      return (
        <div className="flex flex-col h-full space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-sumi/90 border border-putty/20 rounded-xl px-3.5 py-2">
            <span className="text-xs font-bold text-ochre flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              LIVE 3D INDUSTRIAL ETP DIGITAL TWIN (INTERACTIVE ORBIT &amp; CLICK)
            </span>
            <span className="text-[11px] font-mono text-celadon">
              INF-001 (Indigo S<sub>0</sub> = {S0} mg/L) ➔ OUTFALL-001 (Emerald S<sub>e</sub> = {targetSe} mg/L)
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

    // SLIDE 3 (step === 2): BIOCHEMICAL REACTION KINETICS
    if (step === 2) {
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
                Evaluated at T = {temperature}°C (μ<sub>max</sub> = {muMaxT.toFixed(2)} d<sup>−1</sup>) and Bulk DO = {cstrDO.toFixed(2)} mg/L
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
                  Required Growth (1/θ<tspan dy="2" fontSize="7.5">c</tspan><tspan dy="-2"> + k</tspan><tspan dy="2" fontSize="7.5">d</tspan><tspan dy="-2"> = {washoutMu.toFixed(2)} d</tspan><tspan dy="-3" fontSize="7.5">−1</tspan><tspan dy="3">)</tspan>
                </text>
              </>
            )}

            {/* Current S0 vertical marker */}
            <line x1={scaleX(S0)} y1={pad.top} x2={scaleX(S0)} y2={pad.top + ph} stroke="#C68A3C" strokeDasharray="4 2" strokeWidth="1.5" />
            <text x={scaleX(S0) + 5} y={pad.top + 12} fill="#C68A3C" fontSize="9.5" fontWeight="bold">
              Influent S<tspan dy="2" fontSize="7.5">0</tspan><tspan dy="-2"> = {S0}</tspan>
            </text>

            {/* Current Se vertical marker */}
            <line x1={scaleX(targetSe)} y1={pad.top} x2={scaleX(targetSe)} y2={pad.top + ph} stroke="#9EAFA2" strokeDasharray="4 2" strokeWidth="1.5" />
            <text x={scaleX(targetSe) + 5} y={pad.top + 26} fill="#9EAFA2" fontSize="9.5" fontWeight="bold">
              Exit S<tspan dy="2" fontSize="7.5">e</tspan><tspan dy="-2"> = {targetSe}</tspan>
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
              Specific Growth Rate μ [d<tspan dy="-3" fontSize="8">−1</tspan><tspan dy="3">]</tspan>
            </text>
          </svg>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-t border-putty/20 pt-2">
            <span className="text-celadon font-semibold">━━ Uninhibited Dual-Monod μ(S, DO)</span>
            <span className="text-ochre font-semibold">
              ┅┅ Haldane Dye-Inhibited (K<sub>I</sub> = 1200 mg/L)
            </span>
            <span className="text-terracotta font-semibold">
              --- Washout Threshold (1/θ<sub>c</sub> + k<sub>d</sub>)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-1 text-xs">
            <div className="bg-sumi border border-putty/15 rounded-xl p-2.5">
              <div className="text-putty/70 text-[10px]">
                Arrhenius μ<sub>max</sub>(T)
              </div>
              <div className="font-mono font-bold text-ochre text-sm">
                3.20 × 1.072<sup>T−20</sup> = {muMaxT.toFixed(2)} d<sup>−1</sup>
              </div>
            </div>
            <div className="bg-sumi border border-putty/15 rounded-xl p-2.5">
              <div className="text-putty/70 text-[10px]">
                Endogenous Decay k<sub>d</sub>(T)
              </div>
              <div className="font-mono font-bold text-linen text-sm">
                0.06 × 1.040<sup>T−20</sup> = {kdT.toFixed(3)} d<sup>−1</sup>
              </div>
            </div>
            <div className="bg-sumi border border-putty/15 rounded-xl p-2.5">
              <div className="text-putty/70 text-[10px]">True Yield Y (mg VSS/mg COD)</div>
              <div className="font-mono font-bold text-celadon text-sm">{currentKinetics?.Y ?? 0.45} mg/mg</div>
            </div>
          </div>
        </div>
      );
    }

    // SLIDE 4 (step === 3): LEVENSPIEL RECIPROCAL-RATE SIZING
    if (step === 3) {
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

    // SLIDE 5 (step === 4): 1D SPATIAL PFR ODEs & OXYGEN MASS TRANSFER
    if (step === 4) {
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
                Uniform k<sub>L</sub>a (DO Sag!)
              </button>
              <button
                onClick={() => setAerationMode && setAerationMode('tapered')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  aerationMode === 'tapered'
                    ? 'bg-pine text-linen border border-celadon/40 shadow'
                    : 'bg-sumi text-putty border border-putty/20'
                }`}
              >
                Tapered k<sub>L</sub>a (Engineered Fix)
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
              {blowerTrip ? (
                <>
                  ⚠️ BLOWER TRIP ACTIVE (−70% k<sub>L</sub>a)
                </>
              ) : (
                'Simulate Power Outage / Blower Trip'
              )}
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

    // SLIDE 6 (step === 5): NON-IDEAL FLOW, RTD E(θ), SHOCK LOADS & DYNAMICS
    if (step === 5) {
      return (
        <div className="flex flex-col h-full space-y-3">
          <div className="flex items-center justify-between bg-sumi/90 border border-putty/20 rounded-xl px-4 py-2">
            <span className="text-xs font-bold text-ochre">Slide 6 Interactive Graphic Mode:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setSlide5Tab('rtd')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  slide5Tab === 'rtd'
                    ? 'bg-terracotta text-linen'
                    : 'bg-sumi text-putty border border-putty/20'
                }`}
              >
                Fogler RTD E(θ) &amp; Dye Shock Cannon
              </button>
              <button
                onClick={() => setSlide5Tab('startup')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  slide5Tab === 'startup'
                    ? 'bg-pine text-linen border border-celadon/40'
                    : 'bg-sumi text-putty border border-putty/20'
                }`}
              >
                25-Day Startup &amp; Washout ODEs
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

    // SLIDE 7 (step === 6): TECHNO-ECONOMIC ANALYSIS (TEA) & LIFE CYCLE ASSESSMENT (LCA)
    if (step === 6) {
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
              Live Plant Energy Breakdown &amp; Civil CAPEX / Carbon LCA Matrix
            </h4>
            <p className="text-xs text-putty/70 mt-0.5">
              Evaluated at Q<sub>0</sub> = {Q} m<sup>3</sup>/d, S<sub>0</sub> = {S0} mg/L ➔ S<sub>e</sub> = {targetSe} mg/L ($0.095/kWh tariff, 0.615 kg CO<sub>2</sub>e/kWh grid factor)
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
                  <td className="py-2 px-2.5 text-linen font-bold">
                    {cstrV.toFixed(1)} m<sup>3</sup>
                  </td>
                  <td className="py-2 px-2.5 text-celadon font-bold">
                    {pfrV.toFixed(1)} m<sup>3</sup>
                  </td>
                  <td className="py-2 px-2.5 font-sans text-celadon">PFR saves {((1 - 1 / volumeRatio) * 100).toFixed(0)}% space</td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 font-sans text-putty">Reinforced Concrete</td>
                  <td className="py-2 px-2.5 text-linen">
                    {(cstrResult?.geometry?.concreteM3 ?? 168).toFixed(1)} m<sup>3</sup>
                  </td>
                  <td className="py-2 px-2.5 text-linen">
                    {(pfrResult?.geometry?.concreteM3 ?? 195).toFixed(1)} m<sup>3</sup>
                  </td>
                  <td className="py-2 px-2.5 font-sans text-ochre">PFR needs 3 baffle walls</td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 font-sans text-putty">Civil &amp; Mech CAPEX</td>
                  <td className="py-2 px-2.5 text-celadon font-bold">${cstrCapex.toLocaleString()}</td>
                  <td className="py-2 px-2.5 text-ochre font-bold">${pfrCapex.toLocaleString()}</td>
                  <td className="py-2 px-2.5 font-sans text-celadon">CSTR saves ${(pfrCapex - cstrCapex).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 font-sans text-putty">Specific Energy</td>
                  <td className="py-2 px-2.5 text-ochre font-bold">
                    {(sustCSTR?.energy_kwh_per_m3 ?? 0.642).toFixed(4)} kWh/m<sup>3</sup>
                  </td>
                  <td className="py-2 px-2.5 text-ochre font-bold">
                    {(sustPFR?.energy_kwh_per_m3 ?? 0.642).toFixed(4)} kWh/m<sup>3</sup>
                  </td>
                  <td className="py-2 px-2.5 font-sans text-linen">
                    Identical stoichiometric O<sub>2</sub>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 font-sans text-putty">Carbon Emissions</td>
                  <td className="py-2 px-2.5 text-terracotta font-bold">{((sustCSTR?.ghg_kg_co2e_per_m3 ?? 0.395) * Q).toFixed(1)} kg/d</td>
                  <td className="py-2 px-2.5 text-terracotta font-bold">{((sustPFR?.ghg_kg_co2e_per_m3 ?? 0.395) * Q).toFixed(1)} kg/d</td>
                  <td className="py-2 px-2.5 font-sans text-putty/80">
                    0.395 kg CO<sub>2</sub>e / m<sup>3</sup> treated
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // SLIDE 8 (step === 7): FINAL ENGINEERING RECOMMENDATION & MULTI-CRITERIA VERDICT
    if (step === 7) {
      return (
        <div className="flex flex-col h-full space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-sumi/90 border border-putty/20 rounded-xl px-3.5 py-2">
            <span className="text-xs font-bold text-ochre">Slide 8 Decision Matrix &amp; Visual Switcher:</span>
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
                  Multi-Criteria CRE Engineering Scorecard &amp; Examiner Q&amp;A Flashcards
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
                      <td className="py-2 px-2.5 text-terracotta">
                        6.0/10 ({cstrV.toFixed(0)} m<sup>3</sup>)
                      </td>
                      <td className="py-2 px-2.5 text-celadon font-bold">
                        9.8/10 ({pfrV.toFixed(0)} m<sup>3</sup>)
                      </td>
                      <td className="py-2 px-2.5 text-ochre font-bold">
                        9.2/10 (215 m<sup>3</sup>)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2.5 font-sans text-putty">2. Dye Shock Buffering (25%)</td>
                      <td className="py-2 px-2.5 text-celadon font-bold">9.6/10 (Instant Dilution)</td>
                      <td className="py-2 px-2.5 text-terracotta">4.5/10 (Plug Breakthrough)</td>
                      <td className="py-2 px-2.5 text-ochre font-bold">8.8/10 (Lead-Cell Buffer)</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2.5 font-sans text-putty">3. DO Profile &amp; SVI Settling (20%)</td>
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
                  <div className="font-bold text-ochre mb-1">
                    Q1: When does V<sub>CSTR</sub> / V<sub>PFR</sub> approach 1.0?
                  </div>
                  <p className="text-putty/80 text-[11px]">
                    When target effluent S<sub>e</sub> ≫ K<sub>S</sub> (60 mg/L), Monod kinetics S/(K<sub>S</sub> + S) ≈ 1.0 becomes apparent zero-order. Click Slide 4 &amp; set S<sub>e</sub> = 300 mg/L to show the ratio drop to 1.59×!
                  </p>
                </div>
                <div className="bg-sumi border border-putty/20 rounded-xl p-3">
                  <div className="font-bold text-celadon mb-1">Q2: How do we prevent PFR Pass-1 DO Sag?</div>
                  <p className="text-putty/80 text-[11px]">
                    Redistribute the same total air supply using Tapered Aeration (1.65× k<sub>L</sub>a at inlet, 0.45× at exit) so oxygen transfer matches the exponential substrate uptake profile.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // SLIDE 9 (step === 8): THANK YOU EVERYONE & 5 GROUP MEMBERS CLOSING + EXAMINER Q&A SWITCHER
    return (
      <div className="flex flex-col h-full space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-sumi/90 border border-putty/20 rounded-xl px-3.5 py-2">
          <span className="text-xs font-bold text-ochre">Closing &amp; Examiner Q&amp;A Live Switcher:</span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'thankyou', label: 'Thank You & Team Roster' },
              { id: '3d', label: 'Live 3D Plant' },
              { id: 'levenspiel', label: 'Levenspiel Plot' },
              { id: 'profiles', label: 'Axial DO Profiles' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSlide9View(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  slide9View === tab.id
                    ? 'bg-terracotta text-linen shadow'
                    : 'bg-sumi text-putty border border-putty/20 hover:text-linen'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {slide9View === '3d' && (
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

        {slide9View === 'levenspiel' && (
          <LevenspielPlot
            curveData={levenspiel?.curve || []}
            targetConversion={levenspiel?.targetConversion || 0.9}
            cstrInvRate={levenspiel?.cstrInvRate || 0.65}
            cstrVolume={cstrV}
            pfrVolume={pfrV}
            volumeRatio={volumeRatio}
          />
        )}

        {slide9View === 'profiles' && (
          <AxialProfilesPlot
            profiles={pfrResult?.profiles}
            pfrTauHours={pfrTauHr}
            probeZ={probeZ}
            onChangeProbeZ={setProbeZ}
          />
        )}

        {slide9View === 'thankyou' && (
          <div className="bg-sumi/90 border border-putty/20 rounded-2xl p-5 shadow-xl space-y-4 flex-1 flex flex-col justify-between">
            <div className="bg-gradient-to-br from-pine/40 via-sumi to-terracotta/25 border border-celadon/40 rounded-2xl p-5 text-center space-y-2 shadow-inner">
              <div className="w-12 h-12 rounded-2xl bg-terracotta/20 border border-terracotta/40 text-ochre flex items-center justify-center mx-auto shadow">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-linen tracking-tight">
                Thank You Everyone for Your Time &amp; Attention!
              </h3>
              <p className="text-xs sm:text-sm text-putty/85 max-w-xl mx-auto">
                We welcome your questions, critiques, and live parameter stress-testing on our CSTR vs. PFR Textile Effluent Bioreactor Digital Twin.
              </p>
            </div>

            {/* 5 Group Members Sign-Off Roster */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-ochre flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-celadon" />
                  Presented By Group Members (5)
                </span>
                <span className="text-[11px] font-mono text-celadon">
                  Ready for Examiner Q&amp;A
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {GROUP_MEMBERS.map((member, idx) => (
                  <div
                    key={member.id}
                    className={`bg-sumi border border-putty/20 rounded-xl p-3 flex items-center gap-3 ${
                      idx === 4 ? 'sm:col-span-2' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-pine/70 border border-celadon/40 text-celadon font-mono font-extrabold text-xs flex items-center justify-center shrink-0">
                      0{member.id}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-extrabold text-linen">
                        {member.id}. {member.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Jump Buttons for Live Examiner Questions */}
            <div className="bg-putty/5 border border-putty/20 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-linen">
                Jump Directly to Any Technical Slide for Defense:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { slideIdx: 1, label: 'S2: 3D ETP' },
                  { slideIdx: 2, label: 'S3: Kinetics' },
                  { slideIdx: 3, label: 'S4: Levenspiel' },
                  { slideIdx: 4, label: 'S5: DO Sag' },
                  { slideIdx: 5, label: 'S6: RTD & Shock' },
                  { slideIdx: 6, label: 'S7: TEA/LCA' },
                  { slideIdx: 7, label: 'S8: Verdict' }
                ].map((btn) => (
                  <button
                    key={btn.slideIdx}
                    onClick={() => setStep(btn.slideIdx)}
                    className="px-2.5 py-1 rounded-lg bg-sumi hover:bg-terracotta text-putty hover:text-linen border border-putty/25 text-[11px] font-mono font-bold transition-all"
                  >
                    {btn.label}
                  </button>
                ))}
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
                9-SLIDE POWERPOINT DEFENSE DECK
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

        {/* Slide Number Pills (1..9) */}
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

          <a
            href="/presenter_7_slide_script_and_qa_guide.pdf"
            download="Textile_Bioreactor_9_Slide_Defense_Guide.pdf"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-terracotta hover:bg-terracotta/90 text-linen border border-terracotta/40 transition-all flex items-center gap-1.5 shadow"
            title="Download Complete Presenter Script, Theory & Q&A PDF"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF Guide
          </a>

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
            <div className="flex flex-wrap items-center justify-between gap-2">
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
            <div className="bg-putty/5 border-l-4 border-ochre rounded-r-xl px-3.5 py-2.5 font-mono text-xs text-ochre overflow-x-auto leading-relaxed">
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
                  <span>{currentSlide.presetLabel}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="flex justify-between text-putty text-[11px]">
                  <span>
                    Influent bCOD (S<sub>0</sub>):
                  </span>
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
                  <span>
                    Target Effluent (S<sub>e</sub>):
                  </span>
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
                  <span>
                    Sludge Age (θ<sub>c</sub>):
                  </span>
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
            <div className="bg-pine/20 border border-celadon/30 rounded-xl p-3 text-xs text-celadon leading-relaxed">
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
