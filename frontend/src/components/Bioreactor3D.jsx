import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { buildTextureKit, pbr, makeChainLinkTexture } from './proceduralTextures';
import { computeBioFlocMicroProfile } from '../kineticsEngine';

/**
 * Industrial-Grade 3D Bioreactor Digital Twin (All 25 CRE & Process Features)
 * Features:
 *  - Full 3D Process Train: Influent Pipe -> Reactor -> Secondary Clarifier -> RAS Recycle Loop -> WAS Purge -> DoE Gate
 *  - 3D Root Blower Station, Air Manifolds, EPDM Diffuser Grids, Dual Rushton Turbines, Wall Baffles
 *  - 16-Zone Serpentine PFR with Continuous Axial Heatmap & Tapered vs Uniform Aeration
 *  - 4-Mode 3D Volumetric Heatmap (True Visual, Substrate S, Dissolved Oxygen DO, Reaction Rate -r_S)
 *  - Live 3D Projected Holographic SCADA Callout Pins tracking 3D world coordinates
 *  - Interactive CRE Experiments: Pulse Tracer RTD (E(t)), Toxic Dye Shock Cannon, Blower Outage Crash Test
 *  - Draggable 3D Multiparameter Sonde Probe (z/L in [0, 1]) + Microscope Bio-Floc Reaction-Diffusion PiP
 *  - Cross-Sectional X-Ray Cutaway Mode, Human Engineer Scale Figure (1.75m), 5 Cinematic Camera Presets
 */

function makeSignboardTexture(title, subtitle, tag, isOutput = false) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background
  ctx.fillStyle = '#0a0f1d';
  ctx.fillRect(0, 0, 1024, 384);

  // Outer border & safety accents
  ctx.lineWidth = 14;
  ctx.strokeStyle = isOutput ? '#10b981' : '#a855f7';
  ctx.strokeRect(10, 10, 1004, 364);

  // Top header bar
  ctx.fillStyle = isOutput ? '#065f46' : '#581c87';
  ctx.fillRect(20, 20, 984, 70);

  ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(tag, 42, 55);

  ctx.font = 'bold 44px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = isOutput ? '#34d399' : '#e9d5ff';
  ctx.fillText(title, 42, 145);

  ctx.font = '28px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(subtitle, 42, 215);

  // Arrow / Flow indicator strip
  ctx.fillStyle = isOutput ? '#10b981' : '#c084fc';
  ctx.fillRect(42, 265, 940, 6);

  ctx.font = 'bold 30px monospace';
  ctx.fillStyle = isOutput ? '#a7f3d0' : '#f5d0fe';
  const flowText = isOutput
    ? 'FLOW DIRECTION ➔ RIVER / PUBLIC DISCHARGE (Se ≤ 75 mg/L)'
    : 'FLOW DIRECTION ➔ EQUALIZATION & TREATMENT TRAIN';
  ctx.fillText(flowText, 42, 320);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

export default function Bioreactor3D({
  Q = 1000,
  S0 = 750,
  targetSe = 75,
  thetaC = 10.0,
  kLa = 120.0,
  recycleRatio = 0.60,
  cstrResult,
  pfrResult,
  removalPct = 90.0,
  activeMode = 'both',
  aerationMode = 'uniform',
  onToggleAerationMode,
  blowerTrip = false,
  onToggleBlowerTrip,
  probeZ = 0.12,
  onChangeProbeZ,
  temperature = 25.0
}) {
  const mountRef = useRef(null);

  // Interactive 3D Controls & Modes
  const [isPlaying, setIsPlaying] = useState(true);
  const [cutawayMode, setCutawayMode] = useState(true); // Feature #20: Cross-sectional X-ray cutaway
  const [heatmapMode, setHeatmapMode] = useState('visual'); // Feature #13: 'visual' | 'substrate' | 'do' | 'rate'
  const [showScadaPins, setShowScadaPins] = useState(false); // Feature #18: 3D SCADA pins (default false so component labels shine)
  const [showComponentLabels, setShowComponentLabels] = useState(true); // Equipment Component Labels
  const [showIndustrialPlant, setShowIndustrialPlant] = useState(true); // Full Industrial ETP Plant Experience
  const [hoverInfo, setHoverInfo] = useState(null); // {id, x, y} equipment under cursor
  const [pinned, setPinned] = useState(null); // {id} equipment selected by click / tap
  const [pinnedPos, setPinnedPos] = useState(null); // projected screen coords of pinned point
  const pinnedRef = useRef(null);
  const [showFlocMicroscope, setShowFlocMicroscope] = useState(true); // Feature #23: Bio-floc PiP

  // Live CRE Experiment States (Features #7, #9)
  const [tracerState, setTracerState] = useState({ active: false, elapsed: 0 }); // RTD Pulse Tracer
  const [shockState, setShockState] = useState({ active: false, elapsed: 0 });   // Toxic Dye Shock Cannon

  // 3D Projected Screen Coordinates for Holographic SCADA Pins
  const [pinCoords, setPinCoords] = useState([]);

  // Three.js Refs
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const animFrameIdRef = useRef(null);

  // Dynamic Scene Object Refs for Real-Time Reactivity
  const industrialPlantRef = useRef(null);
  const cstrVesselRef = useRef(null);
  const pfrBasinRef = useRef(null);
  const impellerRef = useRef(null);
  const blowerFanRef = useRef(null);
  const cstrRakeRef = useRef(null);
  const pfrRakeRef = useRef(null);
  const cstrLiquidRef = useRef(null);
  const cstrWallRef = useRef(null);
  const cstrFoamRef = useRef(null);
  const cstrBlanketRef = useRef(null);
  const pfrBlanketRef = useRef(null);
  const pfrZonesRef = useRef([]);
  const probeMarkerRef = useRef(null);
  const complianceBeaconRef = useRef(null);
  const bubblesRef = useRef([]);
  const flocsRef = useRef([]);
  const pfrBubblesRef = useRef([]);
  const pfrFlocsRef = useRef([]);
  const pipeParticlesRef = useRef([]);
  const steamParticlesRef = useRef([]);

  // Refs to hold latest state inside requestAnimationFrame loop
  const stateRef = useRef({
    isPlaying,
    cutawayMode,
    heatmapMode,
    aerationMode,
    blowerTrip,
    probeZ,
    cstrResult,
    pfrResult,
    Q,
    S0,
    targetSe,
    thetaC,
    kLa,
    recycleRatio,
    temperature,
    tracerState,
    shockState
  });

  useEffect(() => {
    stateRef.current = {
      showComponentLabels,
      showIndustrialPlant,
      showScadaPins,
      isPlaying,
      cutawayMode,
      heatmapMode,
      aerationMode,
      blowerTrip,
      probeZ,
      cstrResult,
      pfrResult,
      Q,
      S0,
      targetSe,
      thetaC,
      kLa,
      recycleRatio,
      temperature,
      tracerState,
      shockState
    };
  }, [
    isPlaying,
    cutawayMode,
    heatmapMode,
    aerationMode,
    blowerTrip,
    probeZ,
    cstrResult,
    pfrResult,
    Q,
    S0,
    targetSe,
    thetaC,
    kLa,
    recycleRatio,
    temperature,
    tracerState,
    shockState
  ]);

  // Camera Orbit State
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const cameraTargetRef = useRef(new THREE.Vector3(0, -0.5, 0));
  const cameraAngleRef = useRef({ theta: 0.42, phi: 0.38, radius: 28 });

  // Comprehensive Industrial Equipment Component Callouts (26 Major Process Units & Parts)
  const componentAnchors = useMemo(() => [
    // --- A. CSTR EQUIPMENT COMPONENTS ---
    {
      id: 'cstr_motor',
      pos: new THREE.Vector3(-7.5, 4.8, 0),
      tag: 'MTR-101',
      title: 'Electric Gearmotor & VFD Drive',
      role: '15 kW variable-speed motor (45-90 RPM) driving vertical agitator shaft',
      category: 'cstr'
    },
    {
      id: 'cstr_bridge',
      pos: new THREE.Vector3(-7.5, 3.6, 0.4),
      tag: 'STR-101',
      title: 'Heavy Structural Bridge Truss',
      role: 'Spans reactor rim supporting top-entry drive and maintenance catwalk',
      category: 'cstr'
    },
    {
      id: 'cstr_vessel_shell',
      pos: new THREE.Vector3(-10.8, 1.8, 0),
      tag: 'BIO-101',
      title: 'Complete-Mix Aeration Tank',
      role: 'Reinforced glass/acrylic vessel maintaining uniform bulk MLSS and bCOD',
      category: 'cstr'
    },
    {
      id: 'cstr_baffles',
      pos: new THREE.Vector3(-4.4, 0.4, 0),
      tag: 'BAF-101',
      title: 'Anti-Vortex Baffles (4x)',
      role: 'Radial baffles (W = T/10) suppressing vortexing & forcing top-to-bottom turnover',
      category: 'cstr'
    },
    {
      id: 'cstr_impeller_upper',
      pos: new THREE.Vector3(-7.5, -0.2, 0.9),
      tag: 'IMP-101A',
      title: 'Upper Rushton Turbine Impeller',
      role: '6-blade radial disc turbine shearing compressed air into fine micro-bubbles',
      category: 'cstr'
    },
    {
      id: 'cstr_impeller_lower',
      pos: new THREE.Vector3(-7.5, -2.1, 0.9),
      tag: 'IMP-101B',
      title: 'Lower Rushton Sweep Impeller',
      role: 'Bottom fluid sweeper preventing active biomass settling and dead zones',
      category: 'cstr'
    },
    {
      id: 'cstr_diffusers',
      pos: new THREE.Vector3(-7.5, -3.1, 2.0),
      tag: 'DIF-101',
      title: 'Fine-Bubble EPDM Membrane Diffusers',
      role: 'Submerged ring aerator discharging compressed oxygen (kLa = 120 1/d)',
      category: 'cstr'
    },
    {
      id: 'cstr_clarifier_body',
      pos: new THREE.Vector3(-7.5, -3.2, 4.2),
      tag: 'CLR-101',
      title: 'Secondary Gravity Clarifier',
      role: 'Conical hopper basin separating activated sludge from treated supernatant',
      category: 'cstr'
    },
    {
      id: 'cstr_rake',
      pos: new THREE.Vector3(-7.5, -3.9, 4.2),
      tag: 'RAK-101',
      title: 'Motorized Sludge Scraper Rake',
      role: 'Slow spiral rake directing compacted sludge to central bottom hopper',
      category: 'cstr'
    },
    {
      id: 'cstr_ras_pipe',
      pos: new THREE.Vector3(-11.1, -1.6, 2.1),
      tag: 'PIP-101',
      title: 'RAS Sludge Recycle Underflow Line',
      role: 'Recirculates concentrated biomass (R = 0.5-1.0) to maintain sludge age θc = 10 d',
      category: 'cstr'
    },

    // --- B. PFR EQUIPMENT COMPONENTS ---
    {
      id: 'pfr_inlet_mix',
      pos: new THREE.Vector3(3.4, 0.6, -2.3),
      tag: 'MIX-201',
      title: 'PFR Influent & RAS Blending Chamber',
      role: 'High-turbulence inlet combining raw textile bCOD with return activated sludge',
      category: 'pfr'
    },
    {
      id: 'pfr_baffle_chicane',
      pos: new THREE.Vector3(7.2, 0.6, -1.55),
      tag: 'BAF-201',
      title: 'Serpentine Chicane Baffle Walls',
      role: '4-pass channel enforcing 1D axial plug-flow without backmixing (Pe > 50)',
      category: 'pfr'
    },
    {
      id: 'pfr_diffusers_tapered',
      pos: new THREE.Vector3(7.2, -3.0, -2.3),
      tag: 'DIF-201',
      title: 'Tapered Aeration Grid Header',
      role: 'Dense diffuser spacing at entrance to combat localized high OUR oxygen sag',
      category: 'pfr'
    },
    {
      id: 'pfr_axial_core',
      pos: new THREE.Vector3(8.5, 0.4, 0),
      tag: 'BIO-201',
      title: '16-Zone Axial Reaction Channel',
      role: 'Sequential plug-flow biodegradation along normalized coordinate z/L in [0, 1]',
      category: 'pfr'
    },
    {
      id: 'pfr_sonde_probe',
      pos: new THREE.Vector3(7.2, 1.4, 0),
      tag: 'SND-201',
      title: 'Submersible 3D Optical Sonde Probe',
      role: 'Continuously measures local dissolved oxygen DO(z), bCOD S(z), and kinetics',
      category: 'pfr'
    },
    {
      id: 'pfr_clarifier_body',
      pos: new THREE.Vector3(9.4, -3.2, 4.3),
      tag: 'CLR-201',
      title: 'PFR Secondary Sedimentation Basin',
      role: 'Quiescent gravity settling tank capturing flocculated biomass for recycle',
      category: 'pfr'
    },
    {
      id: 'pfr_weir',
      pos: new THREE.Vector3(11.2, -3.2, 4.3),
      tag: 'WEIR-201',
      title: 'Effluent V-Notch Overflow Weir',
      role: 'Calibrated stainless weir skimming clarified treated water meeting standards',
      category: 'pfr'
    },
    {
      id: 'pfr_compliance_gate',
      pos: new THREE.Vector3(12.6, -2.2, 4.3),
      tag: 'DOE-201',
      title: 'DoE Regulatory Compliance Gate',
      role: 'Continuous final telemetry beacon verifying discharge standards (COD ≤ 75 mg/L)',
      category: 'pfr'
    },

    // --- C. INDUSTRIAL AUXILIARY PLANT EQUIPMENTS ---
    {
      id: 'eq_basin',
      pos: new THREE.Vector3(-19.0, -1.2, -4.5),
      tag: 'TK-001',
      title: 'Equalization & Neutralization Basin (EQ)',
      role: '12-hr hydraulic buffer dampening toxic dye spikes, pH swings (6-11), and high COD',
      category: 'aux'
    },
    {
      id: 'chem_dosing_skid',
      pos: new THREE.Vector3(-19.0, -3.6, 3.5),
      tag: 'SKD-002',
      title: 'Automated Chemical Dosing Skid',
      role: 'Precision metering pumps dosing PAC coagulant, polymer, H2SO4 acid, and nutrients',
      category: 'aux'
    },
    {
      id: 'bar_screen',
      pos: new THREE.Vector3(-15.5, -3.2, -4.5),
      tag: 'SCR-001',
      title: 'Fine Rotary Drum Bar Screen',
      role: 'Stainless steel wedge-wire rotary screen removing lint, yarns, and coarse fibers',
      category: 'aux'
    },
    {
      id: 'roots_blower',
      pos: new THREE.Vector3(0, -4.0, 4.8),
      tag: 'BLO-101',
      title: 'Roots Rotary Lobe Blower Station',
      role: 'Twin tri-lobe positive displacement blowers supplying oil-free aeration air',
      category: 'aux'
    },
    {
      id: 'tertiary_filtration',
      pos: new THREE.Vector3(18.0, -1.8, 1.5),
      tag: 'FIL-301/302',
      title: 'Dual Sand & Carbon Pressure Vessels',
      role: 'Tertiary multi-media sand and activated carbon filters removing trace dye/TSS',
      category: 'aux'
    },
    {
      id: 'sludge_dewatering',
      pos: new THREE.Vector3(-1.0, -1.8, -9.5),
      tag: 'DW-401',
      title: 'Mechanical Sludge Dewatering House',
      role: 'Continuous belt filter press converting excess WAS into solid transportable cake',
      category: 'aux'
    },
    {
      id: 'scada_cabin',
      pos: new THREE.Vector3(17.0, -1.8, -6.5),
      tag: 'CTL-501',
      title: 'Plant MCC & SCADA Automation Cabin',
      role: 'Houses motor control center, PLC racks, and central DCS operator workstation',
      category: 'aux'
    },
    {
      id: 'safety_station',
      pos: new THREE.Vector3(-12.5, -3.0, 4.8),
      tag: 'SAF-001',
      title: 'Emergency Eyewash & Drench Shower',
      role: 'ANSI Z358.1 safety station for chemical splash exposure, 15-minute flushing',
      category: 'aux'
    },
    {
      id: 'pipe_rack',
      pos: new THREE.Vector3(0, 5.0, -4.5),
      tag: 'PBR-001',
      title: 'Overhead Industrial Pipe Bridge Rack',
      role: 'Heavy steel truss routing air, raw dye influent, steam, and treated utility lines',
      category: 'aux'
    },
    {
      id: 'raw_intake',
      pos: new THREE.Vector3(-25.5, -0.6, -4.5),
      tag: 'INF-001',
      title: 'Textile Dyehouse Raw Influent Intake',
      role: 'Raw textile dye wastewater (Q₀ = 1000 m³/d, bCOD = 750 mg/L) pumped from dyehouse & washing lines into EQ Basin TK-001',
      category: 'aux'
    },
    {
      id: 'final_outfall',
      pos: new THREE.Vector3(26.5, -1.2, 1.5),
      tag: 'OUTFALL-001',
      title: 'Final Treated Effluent Discharge Outfall',
      role: 'Post-tertiary polished effluent cascade discharging to receiving river, meeting Bangladesh DoE Schedule-10 standards (Sₑ ≤ 75 mg/L)',
      category: 'aux'
    }
  ], []);

  // 3D Anchor Points for Holographic SCADA Labels (Feature #18)
  const scadaAnchors = useMemo(() => [
    { id: 'influent', pos: new THREE.Vector3(-12.5, 3.6, 0), category: 'feed' },
    { id: 'cstr_core', pos: new THREE.Vector3(-7.5, 1.2, 0), category: 'cstr' },
    { id: 'cstr_clarifier', pos: new THREE.Vector3(-7.5, -4.6, 3.8), category: 'clarifier' },
    { id: 'blower', pos: new THREE.Vector3(0, -4.2, 4.8), category: 'blower' },
    { id: 'pfr_sag', pos: new THREE.Vector3(5.2, 0.8, -2.7), category: 'sag' },
    { id: 'pfr_exit', pos: new THREE.Vector3(10.8, 0.8, 2.7), category: 'pfr' },
    { id: 'doe_gate', pos: new THREE.Vector3(12.8, -2.5, 3.8), category: 'gate' }
  ], []);

  // Color Mapping Helper for 4-Mode Heatmap (Feature #13)
  function evaluateFieldColor(
    mode,
    S_val,
    DO_val,
    rate_val,
    S_max = 750,
    tracerIntensity = 0,
    shockIntensity = 0,
    Xb_val = 3877
  ) {
    // Pulse tracer overrides with neon cyan glow
    if (tracerIntensity > 0.05) {
      const base = new THREE.Color(0x0284c7);
      const neon = new THREE.Color(0x00ffcc);
      return base.lerp(neon, Math.min(1, tracerIntensity));
    }
    // Toxic shock overrides with bright magenta-crimson wave
    if (shockIntensity > 0.05) {
      const base = new THREE.Color(0x7e22ce);
      const toxic = new THREE.Color(0xff0055);
      return base.lerp(toxic, Math.min(1, shockIntensity));
    }

    if (mode === 'substrate') {
      // S Heatmap: Blue (low S <= 75) -> Cyan -> Yellow -> Red (high S >= 750)
      const norm = Math.min(1, Math.max(0, S_val / Math.max(150, S_max)));
      const c = new THREE.Color();
      c.setHSL((1.0 - norm) * 0.62, 0.9, 0.48);
      return c;
    }
    if (mode === 'do') {
      // DO Heatmap: Crimson Red (Hypoxic DO < 0.6) -> Amber (1.5) -> Bright Cyan (DO >= 4.0)
      const norm = Math.min(1, Math.max(0, DO_val / 4.5));
      const c = new THREE.Color();
      c.setHSL(norm * 0.54, 0.92, 0.46);
      return c;
    }
    if (mode === 'rate') {
      // Reaction Rate -r_S Heatmap: Deep Navy (low rate) -> Magma Orange -> Bright Yellow (max zero-order rate)
      const norm = Math.min(1, Math.max(0, rate_val / 32000));
      const c = new THREE.Color();
      c.setHSL(0.75 - norm * 0.62, 0.95, 0.30 + norm * 0.28);
      return c;
    }
    // Default 'visual': True Industrial Appearance combining Unreacted Azo Dye (S), Biomass MLSS (Xb), and Oxygenation (DO)
    const dyeFrac = Math.min(1, Math.max(0, (S_val - 20) / 280));
    const sludgeFrac = Math.min(1, Math.max(0, (Xb_val - 600) / 5800));
    const doClarity = Math.min(1, Math.max(0, DO_val / 3.8));

    const cleanTeal = new THREE.Color(0x0d9488);
    const oxygenatedCyan = new THREE.Color(0x06b6d4);
    const anoxicMurk = new THREE.Color(0x31102f);
    const sludgeAmber = new THREE.Color(0xb45309);
    const dyeViolet = new THREE.Color(0x7e22ce);

    // Base water clarity shifts between anoxic dark murk and oxygenated cyan-teal
    const baseLiquid = anoxicMurk.clone().lerp(cleanTeal, doClarity).lerp(oxygenatedCyan, doClarity * 0.35);
    // Blend in activated sludge MLSS golden-brown turbidity
    baseLiquid.lerp(sludgeAmber, sludgeFrac * 0.42);
    // Blend in unreacted purple-violet reactive azo dye
    baseLiquid.lerp(dyeViolet, dyeFrac * 0.85);
    return baseLiquid;
  }

  // Camera Position Updater
  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = cameraAngleRef.current;
    const target = cameraTargetRef.current;
    const x = target.x + radius * Math.cos(phi) * Math.sin(theta);
    const y = target.y + radius * Math.sin(phi);
    const z = target.z + radius * Math.cos(phi) * Math.cos(theta);

    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(target);
  };

  // Feature #21: Cinematic Camera Presets
  const applyCameraPreset = (presetName) => {
    if (presetName === 'overview') {
      cameraTargetRef.current.set(0, -0.8, 0);
      cameraAngleRef.current = { theta: 0.35, phi: 0.36, radius: 28 };
    } else if (presetName === 'cstr_cutaway') {
      cameraTargetRef.current.set(-7.5, -0.2, 0);
      cameraAngleRef.current = { theta: 0.18, phi: 0.22, radius: 13.5 };
      setCutawayMode(true);
    } else if (presetName === 'pfr_sag') {
      cameraTargetRef.current.set(6.8, -0.5, -1.8);
      cameraAngleRef.current = { theta: -0.35, phi: 0.42, radius: 13.5 };
    } else if (presetName === 'clarifiers') {
      cameraTargetRef.current.set(0, -3.2, 3.5);
      cameraAngleRef.current = { theta: 0.1, phi: 0.28, radius: 18 };
    } else if (presetName === 'blueprint') {
      cameraTargetRef.current.set(0, 0, 0);
      cameraAngleRef.current = { theta: 0.01, phi: 1.48, radius: 30 };
    } else if (presetName === 'intake') {
      cameraTargetRef.current.set(-22.5, -1.0, -4.5);
      cameraAngleRef.current = { theta: 0.62, phi: 0.32, radius: 16 };
    } else if (presetName === 'screen') {
      cameraTargetRef.current.set(-15.5, -2.5, -4.5);
      cameraAngleRef.current = { theta: 0.48, phi: 0.28, radius: 12 };
    } else if (presetName === 'bioreactors') {
      cameraTargetRef.current.set(0, -0.5, 0);
      cameraAngleRef.current = { theta: 0.22, phi: 0.35, radius: 22 };
    } else if (presetName === 'filters') {
      cameraTargetRef.current.set(18.0, -1.5, 1.5);
      cameraAngleRef.current = { theta: -0.32, phi: 0.28, radius: 13 };
    } else if (presetName === 'outfall') {
      cameraTargetRef.current.set(24.5, -2.2, 1.5);
      cameraAngleRef.current = { theta: -0.62, phi: 0.30, radius: 16 };
    }
    updateCameraPosition();
  };

  useEffect(() => {
    if (activeMode === 'cstr') applyCameraPreset('cstr_cutaway');
    else if (activeMode === 'pfr') applyCameraPreset('pfr_sag');
    else applyCameraPreset('overview');
  }, [activeMode]);

  // Build Complete 3D Industrial Process Plant
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 900;
    const height = mount.clientHeight || 540;

    // 1. SCENE & INDUSTRIAL ENVIRONMENT
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb7cde0);
    scene.fog = new THREE.FogExp2(0xb7cde0, 0.0042);
    sceneRef.current = scene;

    // 2. CAMERA
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.58;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Physically-based daylight sky (also used as image-based lighting)
    const sunElevation = 38;
    const sunAzimuth = 140;
    const sunDir = new THREE.Vector3().setFromSphericalCoords(
      1,
      THREE.MathUtils.degToRad(90 - sunElevation),
      THREE.MathUtils.degToRad(sunAzimuth)
    );
    const buildSky = () => {
      const sky = new Sky();
      sky.scale.setScalar(800);
      const u = sky.material.uniforms;
      u.turbidity.value = 3.5;
      u.rayleigh.value = 1.3;
      u.mieCoefficient.value = 0.005;
      u.mieDirectionalG.value = 0.8;
      u.sunPosition.value.copy(sunDir);
      return sky;
    };
    scene.add(buildSky());
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.add(buildSky());
    scene.environment = pmrem.fromScene(envScene).texture;
    scene.environmentIntensity = 0.85;
    pmrem.dispose();

    // HD procedural PBR texture kit (concrete, asphalt, grass, brushed steel, paint)
    const kit = buildTextureKit(renderer);

    // 4. DAYLIGHT: warm sun key + sky hemisphere fill, high-res soft shadows
    const hemiLight = new THREE.HemisphereLight(0xcfe3ff, 0x6b6558, 0.55);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff1dc, 2.6);
    sunLight.position.copy(sunDir).multiplyScalar(70);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(4096, 4096);
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.03;
    Object.assign(sunLight.shadow.camera, { left: -34, right: 34, top: 28, bottom: -28, near: 1, far: 160 });
    sunLight.shadow.camera.updateProjectionMatrix();
    scene.add(sunLight);

    const coolFill = new THREE.DirectionalLight(0xbcd4ff, 0.6);
    coolFill.position.set(-20, 14, -18);
    scene.add(coolFill);

    // 5. REALISTIC GROUND: grass terrain -> asphalt apron -> reinforced concrete slab
    const grassMat = pbr(kit.grass, { color: 0xffffff, roughness: 1, metalness: 0 }, 220, 220);
    grassMat.polygonOffset = true;
    grassMat.polygonOffsetFactor = 2;
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(1300, 1300), grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -5.7;
    grass.receiveShadow = true;
    scene.add(grass);

    const slabMat = pbr(kit.concrete, { color: 0xa9a9a4, roughness: 1, metalness: 0 }, 46 / 5, 28 / 5);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(46, 28), slabMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -5.6;
    floor.receiveShadow = true;
    scene.add(floor);

    // Shared Engineering Materials
    const steelMat = pbr(kit.steel, { color: 0xa5a9b0, metalness: 1.0, roughness: 1.0 }, 2, 2);
    const darkSteelMat = pbr(kit.steel, { color: 0x5d636c, metalness: 1.0, roughness: 1.6 }, 2, 2);
    const concreteMat = pbr(kit.concrete, { color: 0xbdbdb8, roughness: 1, metalness: 0 }, 2, 1);
    const motorMat = pbr(kit.paint, { color: 0x0f6fb5, metalness: 0.35, roughness: 1.0 }, 2, 2);
    const airPipeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.7, roughness: 0.2, transparent: true, opacity: 0.85 });
    const rasPipeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.5, roughness: 0.4, transparent: true, opacity: 0.85 });

    // =========================================================================
    // A. CSTR PROCESS TRAIN (LEFT SIDE: x = -7.5)
    // Includes: Influent Pipe, Cutaway Cylindrical Tank, 4 Wall Baffles,
    // Dual Rushton Turbines, Top Gearbox Motor, Bottom EPDM Diffuser Grid,
    // Secondary Gravity Clarifier, Rotating Scraper Bridge, RAS & WAS Loops
    // =========================================================================
    const cstrGroup = new THREE.Group();
    cstrGroup.position.set(-7.5, 0, 0);
    scene.add(cstrGroup);

    // Dynamic Vessel Sub-Group (Scales in 3D when required CSTR volume V changes!)
    const cstrVessel = new THREE.Group();
    cstrGroup.add(cstrVessel);
    cstrVesselRef.current = cstrVessel;

    // CSTR Support Pedestal Legs
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const legGeo = new THREE.CylinderGeometry(0.18, 0.22, 2.4, 12);
      const leg = new THREE.Mesh(legGeo, darkSteelMat);
      leg.position.set(Math.cos(angle) * 2.8, -4.4, Math.sin(angle) * 2.8);
      cstrGroup.add(leg);
    }

    // CSTR Outer Wall (Supports Cutaway X-Ray Mode via thetaLength)
    const wallGeo = new THREE.CylinderGeometry(3.3, 3.3, 6.6, 40, 1, true, Math.PI * 0.22, Math.PI * 1.56);
    const wallMat = new THREE.MeshPhysicalMaterial({
      color: 0xeaf6ff,
      transparent: true,
      opacity: 0.2,
      roughness: 0.05,
      metalness: 0.0,
      ior: 1.474,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      envMapIntensity: 1.6,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const cstrWall = new THREE.Mesh(wallGeo, wallMat);
    cstrVessel.add(cstrWall);
    cstrWallRef.current = cstrWall;

    // Top & Bottom Structural Steel Flanges
    const flangeGeo = new THREE.TorusGeometry(3.32, 0.12, 16, 48);
    const topFlange = new THREE.Mesh(flangeGeo, steelMat);
    topFlange.rotation.x = Math.PI / 2;
    topFlange.position.y = 3.3;
    cstrVessel.add(topFlange);

    const botFlange = topFlange.clone();
    botFlange.position.y = -3.3;
    cstrVessel.add(botFlange);

    // 4 Internal Anti-Swirl Wall Baffles (Feature #4)
    const baffleGeo = new THREE.BoxGeometry(0.35, 6.2, 0.08);
    for (let i = 0; i < 4; i++) {
      const bAngle = (i * Math.PI) / 2;
      const baffle = new THREE.Mesh(baffleGeo, darkSteelMat);
      baffle.rotation.y = -bAngle;
      baffle.position.set(Math.cos(bAngle) * 3.08, 0, Math.sin(bAngle) * 3.08);
      cstrVessel.add(baffle);
    }

    // CSTR Liquid Body
    const liquidGeo = new THREE.CylinderGeometry(3.18, 3.18, 5.8, 36);
    const liquidMat = new THREE.MeshPhysicalMaterial({
      color: 0x0d9488,
      transparent: true,
      opacity: 0.72,
      roughness: 0.2,
      metalness: 0.05
    });
    const cstrLiquid = new THREE.Mesh(liquidGeo, liquidMat);
    cstrLiquid.position.y = -0.35;
    cstrVessel.add(cstrLiquid);
    cstrLiquidRef.current = cstrLiquid;

    // Surface Surfactant Foam Layer (Feature #16)
    const foamGeo = new THREE.CylinderGeometry(3.16, 3.16, 0.28, 32);
    const foamMat = new THREE.MeshStandardMaterial({
      color: 0xf5d0fe,
      transparent: true,
      opacity: 0.55,
      roughness: 0.9
    });
    const cstrFoam = new THREE.Mesh(foamGeo, foamMat);
    cstrFoam.position.y = 2.62;
    cstrVessel.add(cstrFoam);
    cstrFoamRef.current = cstrFoam;

    // Top Bridge Truss & Electric Gearbox Motor (Feature #4)
    const bridgeGeo = new THREE.BoxGeometry(7.0, 0.22, 0.65);
    const bridge = new THREE.Mesh(bridgeGeo, steelMat);
    bridge.position.y = 3.5;
    cstrVessel.add(bridge);

    const motorBody = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 1.2, 20), motorMat);
    motorBody.position.y = 4.2;
    cstrVessel.add(motorBody);

    // Dual-Stage Rushton Turbine Impeller Assembly (Feature #4)
    const impellerGroup = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 6.6, 16), steelMat);
    shaft.position.y = 0.3;
    impellerGroup.add(shaft);

    // Two Rushton Turbine Discs (Lower & Middle Stage)
    [-2.1, -0.4].forEach((stageY) => {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.08, 24), steelMat);
      disc.position.y = stageY;
      impellerGroup.add(disc);

      const bladeGeo = new THREE.BoxGeometry(0.55, 0.36, 0.06);
      for (let b = 0; b < 6; b++) {
        const ang = (b * Math.PI) / 3;
        const blade = new THREE.Mesh(bladeGeo, steelMat);
        blade.rotation.y = -ang;
        blade.position.set(Math.cos(ang) * 0.85, stageY, Math.sin(ang) * 0.85);
        impellerGroup.add(blade);
      }
    });
    cstrVessel.add(impellerGroup);
    impellerRef.current = impellerGroup;

    // Bottom Fine-Bubble EPDM Membrane Diffuser Grid (Feature #3)
    const diffuserRing = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.08, 12, 32), airPipeMat);
    diffuserRing.rotation.x = Math.PI / 2;
    diffuserRing.position.y = -3.05;
    cstrVessel.add(diffuserRing);

    const podGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 16);
    const podMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    for (let p = 0; p < 12; p++) {
      const ang = (p * Math.PI) / 6;
      const pod = new THREE.Mesh(podGeo, podMat);
      pod.position.set(Math.cos(ang) * 1.9, -3.0, Math.sin(ang) * 1.9);
      cstrVessel.add(pod);
    }

    // CSTR Oxygen Micro-Bubbles (White/Cyan rising) & Biomass Flocs (Amber swirling) (Feature #14)
    const bubbleGeo = new THREE.SphereGeometry(0.075, 8, 8);
    const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.82 });
    const cstrBubbles = [];
    for (let i = 0; i < 85; i++) {
      const bMesh = new THREE.Mesh(bubbleGeo, bubbleMat);
      const r = 0.4 + Math.random() * 2.5;
      const theta = Math.random() * Math.PI * 2;
      bMesh.position.set(r * Math.cos(theta), -3.0 + Math.random() * 5.4, r * Math.sin(theta));
      cstrVessel.add(bMesh);
      cstrBubbles.push({ mesh: bMesh, speedY: 0.045 + Math.random() * 0.04, angle: theta, radius: r });
    }
    bubblesRef.current = cstrBubbles;

    const flocGeo = new THREE.DodecahedronGeometry(0.065, 0);
    const flocMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });
    const cstrFlocs = [];
    for (let i = 0; i < 90; i++) {
      const fMesh = new THREE.Mesh(flocGeo, flocMat);
      const r = 0.5 + Math.random() * 2.4;
      const theta = Math.random() * Math.PI * 2;
      const y = -2.8 + Math.random() * 5.0;
      fMesh.position.set(r * Math.cos(theta), y, r * Math.sin(theta));
      cstrVessel.add(fMesh);
      cstrFlocs.push({ mesh: fMesh, r, theta, y, speedTheta: 0.025 + Math.random() * 0.02 });
    }
    flocsRef.current = cstrFlocs;

    // CSTR Secondary Gravity Clarifier & RAS/WAS Recycle Loop (Features #1, #6)
    const cstrClarifier = new THREE.Group();
    cstrClarifier.position.set(0, -3.2, 4.2);
    cstrGroup.add(cstrClarifier);

    const clarCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(1.65, 1.65, 1.5, 28),
      new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.30 })
    );
    cstrClarifier.add(clarCyl);

    const clarCone = new THREE.Mesh(
      new THREE.ConeGeometry(1.65, 1.4, 28),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.4, transparent: true, opacity: 0.82 })
    );
    clarCone.rotation.x = Math.PI;
    clarCone.position.y = -1.45;
    cstrClarifier.add(clarCone);

    // Clarifier Sludge Blanket Layer (Feature #6)
    const blanketMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.58, 1.1, 0.8, 24),
      new THREE.MeshStandardMaterial({ color: 0x92400e, transparent: true, opacity: 0.85 })
    );
    blanketMesh.position.y = -0.5;
    cstrClarifier.add(blanketMesh);
    cstrBlanketRef.current = blanketMesh;

    // Rotating Clarifier Scraper Rake Arm
    const cstrRake = new THREE.Group();
    const rakeShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 12), steelMat);
    rakeShaft.position.y = -0.2;
    cstrRake.add(rakeShaft);
    const rakeArm = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 0.12), steelMat);
    rakeArm.position.y = -0.65;
    cstrRake.add(rakeArm);
    cstrClarifier.add(cstrRake);
    cstrRakeRef.current = cstrRake;

    // RAS Recycle Pipe (Clarifier Underflow -> CSTR Inlet)
    const rasPipeVert = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 5.4, 12), rasPipeMat);
    rasPipeVert.position.set(-3.6, -1.6, 2.1);
    cstrGroup.add(rasPipeVert);

    // =========================================================================
    // B. PFR SERPENTINE PROCESS TRAIN (RIGHT SIDE: x = 7.2)
    // Includes: 4-Pass Baffled Basin subdivided into 16 Axial Fluid Zones,
    // Tapered vs Uniform Bottom EPDM Diffusers, Secondary Clarifier & RAS Loop,
    // Draggable 3D Multiparameter Sensor Probe (Sonde) & DoE Compliance Gate
    // =========================================================================
    const pfrGroup = new THREE.Group();
    pfrGroup.position.set(7.2, 0, 0);
    scene.add(pfrGroup);

    // Dynamic PFR Basin Sub-Group (Scales in 3D when PFR volume V & channel length L change!)
    const pfrBasin = new THREE.Group();
    pfrGroup.add(pfrBasin);
    pfrBasinRef.current = pfrBasin;

    const passLen = 7.6;
    const passWidth = 1.35;
    const passHeight = 2.6;
    const zonesPerPass = 4; // 4 passes * 4 zones = 16 axial spatial heatmap zones!
    const zoneLen = passLen / zonesPerPass;
    const pfrZones = [];

    // Outer Concrete/Glass Basin Frame & Chicane Baffle Walls (Feature #5)
    for (let wallIdx = 0; wallIdx < 5; wallIdx++) {
      const zWall = (wallIdx - 2) * 1.55;
      const baffleWall = new THREE.Mesh(
        new THREE.BoxGeometry(passLen + 0.4, passHeight + 0.3, 0.12),
        concreteMat
      );
      baffleWall.position.set(0, -0.95, zWall);
      pfrBasin.add(baffleWall);
    }

    // 16 Axial Fluid Zones along the Serpentine Path (z/L in [0, 1])
    for (let pass = 0; pass < 4; pass++) {
      const zCenter = (pass - 1.5) * 1.55;
      for (let zSub = 0; zSub < zonesPerPass; zSub++) {
        const globalIdx = pass * zonesPerPass + zSub; // 0 .. 15
        const fracZ = globalIdx / 15.0;
        // Serpentine direction alternates each pass: even pass flows left->right, odd pass flows right->left
        const dir = pass % 2 === 0 ? 1 : -1;
        const xOffset = dir * (-passLen / 2 + (zSub + 0.5) * zoneLen);

        const zoneGeo = new THREE.BoxGeometry(zoneLen - 0.03, passHeight, passWidth);
        const zoneMat = new THREE.MeshPhysicalMaterial({
          color: 0x7e22ce,
          transparent: true,
          opacity: 0.78,
          roughness: 0.2,
          metalness: 0.05
        });
        const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
        zoneMesh.position.set(xOffset, -1.0, zCenter);
        pfrBasin.add(zoneMesh);
        pfrZones.push({ mesh: zoneMesh, fracZ, pass, xOffset, zCenter });
      }
    }
    pfrZonesRef.current = pfrZones;

    // PFR Aeration Bubbles & Biomass Flocs
    const pfrBubbles = [];
    for (let i = 0; i < 110; i++) {
      const bMesh = new THREE.Mesh(bubbleGeo, bubbleMat);
      const pass = Math.floor(Math.random() * 4);
      const zCenter = (pass - 1.5) * 1.55;
      const xRel = (Math.random() - 0.5) * (passLen - 0.4);
      const fracZ = (pass + (pass % 2 === 0 ? (xRel + passLen / 2) / passLen : (passLen / 2 - xRel) / passLen)) / 4.0;
      bMesh.position.set(xRel, -2.2 + Math.random() * 2.3, zCenter + (Math.random() - 0.5) * 0.9);
      pfrBasin.add(bMesh);
      pfrBubbles.push({
        mesh: bMesh,
        pass,
        fracZ,
        speedY: 0.035 + Math.random() * 0.035,
        speedX: pass % 2 === 0 ? 0.025 : -0.025,
        minX: -passLen / 2 + 0.25,
        maxX: passLen / 2 - 0.25
      });
    }
    pfrBubblesRef.current = pfrBubbles;

    const pfrFlocs = [];
    for (let i = 0; i < 80; i++) {
      const fMesh = new THREE.Mesh(flocGeo, flocMat);
      const pass = Math.floor(Math.random() * 4);
      const zCenter = (pass - 1.5) * 1.55;
      fMesh.position.set((Math.random() - 0.5) * (passLen - 0.4), -2.1 + Math.random() * 2.1, zCenter + (Math.random() - 0.5) * 0.8);
      pfrBasin.add(fMesh);
      pfrFlocs.push({
        mesh: fMesh,
        speedX: pass % 2 === 0 ? 0.032 : -0.032,
        minX: -passLen / 2 + 0.25,
        maxX: passLen / 2 - 0.25
      });
    }
    pfrFlocsRef.current = pfrFlocs;

    // Draggable 3D Multiparameter Sensor Probe (Sonde) in PFR (Feature #19)
    const probeGroup = new THREE.Group();
    const probeRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 3.6, 16),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 })
    );
    probeRod.position.y = 1.2;
    probeGroup.add(probeRod);

    const probeBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    probeBeacon.position.y = 3.1;
    probeGroup.add(probeBeacon);
    pfrBasin.add(probeGroup);
    probeMarkerRef.current = probeGroup;

    // PFR Secondary Clarifier & DoE Discharge Gate (Features #1, #6, #24)
    const pfrClarifier = new THREE.Group();
    pfrClarifier.position.set(2.2, -3.2, 4.3);
    pfrGroup.add(pfrClarifier);

    pfrClarifier.add(clarCyl.clone());
    const pfrCone = clarCone.clone();
    pfrClarifier.add(pfrCone);

    const pfrBlanket = blanketMesh.clone();
    pfrClarifier.add(pfrBlanket);
    pfrBlanketRef.current = pfrBlanket;

    const pfrRake = cstrRake.clone();
    pfrClarifier.add(pfrRake);
    pfrRakeRef.current = pfrRake;

    // Bangladesh DoE Regulatory Compliance Beacon Gate (Feature #24)
    const gateGroup = new THREE.Group();
    gateGroup.position.set(5.4, -3.2, 4.3);
    pfrGroup.add(gateGroup);

    const gatePillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.6, 0.6), darkSteelMat);
    gateGroup.add(gatePillar);

    const beaconSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0x10b981 })
    );
    beaconSphere.position.y = 1.55;
    gateGroup.add(beaconSphere);
    complianceBeaconRef.current = beaconSphere;

    // =========================================================================
    // C. CENTRAL ROOT BLOWER STATION & ANIMATED PIPELINE NETWORK (#1, #2, #3)
    // =========================================================================
    const blowerStation = new THREE.Group();
    blowerStation.position.set(0, -4.6, 4.6);
    scene.add(blowerStation);

    const blowerBase = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.4, 1.8), concreteMat);
    blowerStation.add(blowerBase);

    const blowerCasing = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 1.6, 24), motorMat);
    blowerCasing.rotation.z = Math.PI / 2;
    blowerCasing.position.y = 0.75;
    blowerStation.add(blowerCasing);

    const fanGroup = new THREE.Group();
    fanGroup.position.set(0, 0.75, 0.72);
    for (let f = 0; f < 6; f++) {
      const fBlade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.05), steelMat);
      fBlade.rotation.z = (f * Math.PI) / 3;
      fanGroup.add(fBlade);
    }
    blowerStation.add(fanGroup);
    blowerFanRef.current = fanGroup;

    // =========================================================================
    // C. CENTRAL ROOT BLOWER STATION & ANIMATED TRANSPARENT PIPING NETWORK
    // =========================================================================
    // All fluid flow is 100% mathematically constrained inside transparent glass/acrylic tubes
    const glassPipeRawMat = new THREE.MeshPhysicalMaterial({
      color: 0xf5eeff,
      transparent: true,
      opacity: 0.38,
      roughness: 0.05,
      transmission: 0.90,
      ior: 1.49,
      thickness: 0.20,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const glassPipeCleanMat = new THREE.MeshPhysicalMaterial({
      color: 0xecfeff,
      transparent: true,
      opacity: 0.34,
      roughness: 0.04,
      transmission: 0.94,
      ior: 1.49,
      thickness: 0.20,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const glassPipeSludgeMat = new THREE.MeshPhysicalMaterial({
      color: 0xfef3c7,
      transparent: true,
      opacity: 0.42,
      roughness: 0.05,
      transmission: 0.86,
      ior: 1.49,
      thickness: 0.20,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const glassPipeAirMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.30,
      roughness: 0.03,
      transmission: 0.96,
      ior: 1.47,
      thickness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const pipeGroup = new THREE.Group();
    scene.add(pipeGroup);

    const pipeFlangeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.25 });
    const addTransparentPipe = (curve, radius, mat, sampleT = [0.03, 0.5, 0.97]) => {
      const tubeGeo = new THREE.TubeGeometry(curve, 64, radius, 14, false);
      const tube = new THREE.Mesh(tubeGeo, mat);
      pipeGroup.add(tube);

      const flangeGeo = new THREE.TorusGeometry(radius * 1.25, radius * 0.22, 8, 20);
      sampleT.forEach((t) => {
        const pt = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t);
        const flange = new THREE.Mesh(flangeGeo, pipeFlangeMat);
        flange.position.copy(pt);
        flange.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
        pipeGroup.add(flange);
      });
      return tube;
    };

    // 16 Complete Continuous Process Piping Curves (Connecting origin to destination)
    const pipeCurves = {
      rawIntake: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-25.5, -1.8, -4.5),
        new THREE.Vector3(-22.0, -0.2, -4.5),
        new THREE.Vector3(-19.0, 0.5, -4.5)
      ]),
      eqToScreen: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-17.2, -2.8, -4.5),
        new THREE.Vector3(-16.3, -2.8, -4.5),
        new THREE.Vector3(-15.5, -3.2, -4.5)
      ]),
      screenToRack: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-14.8, -3.2, -4.5),
        new THREE.Vector3(-14.4, 0.5, -4.5),
        new THREE.Vector3(-14.2, 4.8, -4.5),
        new THREE.Vector3(-14.0, 5.2, -4.5)
      ]),
      rackToCstr: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-14.0, 5.2, -4.5),
        new THREE.Vector3(-7.5, 5.2, -4.5),
        new THREE.Vector3(-7.5, 4.2, -2.2),
        new THREE.Vector3(-7.5, 3.4, 0.0)
      ]),
      rackToPfr: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-7.5, 5.2, -4.5),
        new THREE.Vector3(3.4, 5.2, -4.5),
        new THREE.Vector3(3.4, 3.2, -3.2),
        new THREE.Vector3(3.4, 0.6, -2.3)
      ]),
      cstrOverflow: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-7.5, 2.0, 3.1),
        new THREE.Vector3(-7.5, 0.5, 3.6),
        new THREE.Vector3(-7.5, -0.8, 4.0),
        new THREE.Vector3(-7.5, -1.8, 4.2)
      ]),
      pfrExit: new THREE.CatmullRomCurve3([
        new THREE.Vector3(11.0, -0.8, 2.3),
        new THREE.Vector3(10.6, -1.2, 3.2),
        new THREE.Vector3(9.8, -1.5, 3.9),
        new THREE.Vector3(9.4, -1.8, 4.3)
      ]),
      cstrRas: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-7.5, -4.6, 4.2),
        new THREE.Vector3(-9.2, -4.8, 3.5),
        new THREE.Vector3(-10.8, -3.2, 1.8),
        new THREE.Vector3(-10.8, 0.8, 0.0),
        new THREE.Vector3(-8.8, 2.6, 0.0)
      ]),
      pfrRas: new THREE.CatmullRomCurve3([
        new THREE.Vector3(9.4, -4.6, 4.3),
        new THREE.Vector3(8.0, -4.8, 3.2),
        new THREE.Vector3(5.6, -4.4, 0.5),
        new THREE.Vector3(3.4, -2.5, -2.3),
        new THREE.Vector3(3.4, 0.2, -2.3)
      ]),
      wasSludge: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-4.0, -4.8, 3.5),
        new THREE.Vector3(-1.0, -4.8, 0.0),
        new THREE.Vector3(-1.0, -4.6, -5.0),
        new THREE.Vector3(-1.0, -2.2, -8.5)
      ]),
      cstrEffluent: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-7.5, -2.4, 5.2),
        new THREE.Vector3(-7.5, -3.6, 4.2),
        new THREE.Vector3(0.0, -3.6, 4.2),
        new THREE.Vector3(14.0, -3.6, 4.2)
      ]),
      pfrEffluent: new THREE.CatmullRomCurve3([
        new THREE.Vector3(9.4, -2.4, 4.3),
        new THREE.Vector3(12.6, -2.4, 4.3),
        new THREE.Vector3(14.0, -3.6, 4.2)
      ]),
      toTertiary: new THREE.CatmullRomCurve3([
        new THREE.Vector3(14.0, -3.6, 4.2),
        new THREE.Vector3(16.5, -3.0, 3.0),
        new THREE.Vector3(17.2, -1.0, 1.5),
        new THREE.Vector3(18.0, 0.5, 1.5)
      ]),
      toOutfall: new THREE.CatmullRomCurve3([
        new THREE.Vector3(19.2, -2.0, 1.5),
        new THREE.Vector3(21.5, -3.0, 1.5),
        new THREE.Vector3(24.0, -3.6, 1.5),
        new THREE.Vector3(26.5, -4.0, 1.5)
      ]),
      airCstr: new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.0, -3.8, 4.6),
        new THREE.Vector3(-3.5, -4.2, 3.2),
        new THREE.Vector3(-7.5, -4.2, 1.5),
        new THREE.Vector3(-7.5, -3.1, 0.0)
      ]),
      airPfr: new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.0, -3.8, 4.6),
        new THREE.Vector3(3.5, -4.2, 3.2),
        new THREE.Vector3(7.2, -4.2, 1.5),
        new THREE.Vector3(7.2, -3.1, -1.0)
      ])
    };

    // Instantiate physical transparent tubes
    addTransparentPipe(pipeCurves.rawIntake, 0.18, glassPipeRawMat);
    addTransparentPipe(pipeCurves.eqToScreen, 0.16, glassPipeRawMat);
    addTransparentPipe(pipeCurves.screenToRack, 0.18, glassPipeRawMat);
    addTransparentPipe(pipeCurves.rackToCstr, 0.16, glassPipeRawMat);
    addTransparentPipe(pipeCurves.rackToPfr, 0.16, glassPipeRawMat);
    addTransparentPipe(pipeCurves.cstrOverflow, 0.16, glassPipeRawMat);
    addTransparentPipe(pipeCurves.pfrExit, 0.16, glassPipeRawMat);
    addTransparentPipe(pipeCurves.cstrRas, 0.14, glassPipeSludgeMat);
    addTransparentPipe(pipeCurves.pfrRas, 0.14, glassPipeSludgeMat);
    addTransparentPipe(pipeCurves.wasSludge, 0.13, glassPipeSludgeMat);
    addTransparentPipe(pipeCurves.cstrEffluent, 0.15, glassPipeCleanMat);
    addTransparentPipe(pipeCurves.pfrEffluent, 0.15, glassPipeCleanMat);
    addTransparentPipe(pipeCurves.toTertiary, 0.16, glassPipeCleanMat);
    addTransparentPipe(pipeCurves.toOutfall, 0.18, glassPipeCleanMat);
    addTransparentPipe(pipeCurves.airCstr, 0.12, glassPipeAirMat);
    addTransparentPipe(pipeCurves.airPfr, 0.12, glassPipeAirMat);

    // Populate Animated Fluid Flow Particles (Strictly locked inside the 3D curves)
    const pipeParticles = [];
    const pGeo = new THREE.SphereGeometry(0.10, 10, 10);

    const spawnStream = (curve, count, mat, type, speedFactor = 1.0) => {
      for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(pGeo, mat);
        scene.add(m);
        pipeParticles.push({
          mesh: m,
          curve: curve,
          progress: i / count,
          speedFactor: speedFactor,
          type: type
        });
      }
    };

    const matRawDye = new THREE.MeshBasicMaterial({ color: 0x9333ea });
    const matScreened = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
    const matFeed = new THREE.MeshBasicMaterial({ color: 0xc084fc });
    const matMixed = new THREE.MeshBasicMaterial({ color: 0x0d9488 });
    const matRas = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const matWas = new THREE.MeshBasicMaterial({ color: 0x78350f });
    const matEffluent = new THREE.MeshBasicMaterial({ color: 0x14b8a6 });
    const matPolished = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const matOutfall = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    const matAir = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    spawnStream(pipeCurves.rawIntake, 8, matRawDye, 'influent', 0.9);
    spawnStream(pipeCurves.eqToScreen, 6, matScreened, 'influent', 1.0);
    spawnStream(pipeCurves.screenToRack, 8, matScreened, 'influent', 1.0);
    spawnStream(pipeCurves.rackToCstr, 10, matFeed, 'influent', 1.1);
    spawnStream(pipeCurves.rackToPfr, 12, matFeed, 'influent', 1.1);
    spawnStream(pipeCurves.cstrOverflow, 8, matMixed, 'mixed_liquor', 0.95);
    spawnStream(pipeCurves.pfrExit, 8, matMixed, 'mixed_liquor', 0.95);
    spawnStream(pipeCurves.cstrRas, 10, matRas, 'ras', 0.9);
    spawnStream(pipeCurves.pfrRas, 10, matRas, 'ras', 0.9);
    spawnStream(pipeCurves.wasSludge, 8, matWas, 'was', 0.8);
    spawnStream(pipeCurves.cstrEffluent, 8, matEffluent, 'effluent', 1.0);
    spawnStream(pipeCurves.pfrEffluent, 8, matEffluent, 'effluent', 1.0);
    spawnStream(pipeCurves.toTertiary, 8, matPolished, 'effluent', 1.0);
    spawnStream(pipeCurves.toOutfall, 12, matOutfall, 'effluent', 1.2);
    spawnStream(pipeCurves.airCstr, 10, matAir, 'air', 1.3);
    spawnStream(pipeCurves.airPfr, 10, matAir, 'air', 1.3);

    pipeParticlesRef.current = pipeParticles;

    // =========================================================================
    // D. EXPANDED INDUSTRIAL PLANT ENVIRONMENT & FACILITY EQUIPMENT
    // Creates a complete, realistic industrial textile ETP factory complex:
    // 1. Extended reinforced plant foundation slab & yellow hazard safety lanes
    // 2. Overhead structural steel pipe bridge rack & process utility headers
    // 3. Upstream Equalization & Neutralization Tank (EQ Basin) with mixer
    // 4. Automated Chemical Dosing Skid with IBC tanks & metering pumps
    // 5. Rotary Drum Fine Wedge-Wire Bar Screen Channel
    // 6. Dual Tertiary Pressure Sand & Granular Activated Carbon Filter Vessels
    // 7. Mechanical Sludge Dewatering House & Roll-Off Cake Skip Container
    // 8. Plant SCADA & Motor Control Center (MCC) Cabin with HVAC unit
    // 9. Plant Safety: Emergency Eyewash & Drench Shower, Stanchion Floodlights
    // =========================================================================
    const industrialPlant = new THREE.Group();
    industrialPlantRef.current = industrialPlant;
    scene.add(industrialPlant);

    // Shared Industrial Materials
    const yellowSafetyMat = pbr(kit.paint, { color: 0xf2c200, roughness: 1.0, metalness: 0.1 }, 2, 2);
    const safetyStripesMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.5, metalness: 0.2 });
    const industrialBlueMat = pbr(kit.paint, { color: 0x1e4fb8, roughness: 1.0, metalness: 0.45 }, 2, 2);
    const fiberglassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, transparent: true, opacity: 0.75, roughness: 0.3 });
    const chemOrangeMat = new THREE.MeshStandardMaterial({ color: 0xea580c, transparent: true, opacity: 0.8, roughness: 0.3 });
    const chemAmberMat = new THREE.MeshStandardMaterial({ color: 0xd97706, transparent: true, opacity: 0.8, roughness: 0.3 });
    const galvanizedMat = pbr(kit.steel, { color: 0xc3c8ce, roughness: 1.5, metalness: 1.0 }, 2, 2);
    const sludgeCakeMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.95 });

    // 1. EXTENDED PLANT FOUNDATION SLAB & YELLOW SAFETY WALKWAY DEMARCATIONS
    const extendedFloorGeo = new THREE.PlaneGeometry(74, 52);
    const extendedFloorMat = pbr(kit.asphalt, { color: 0xffffff, roughness: 1, metalness: 0 }, 74 / 3, 52 / 3);
    extendedFloorMat.polygonOffset = true;
    extendedFloorMat.polygonOffsetFactor = 1;
    const extendedFloor = new THREE.Mesh(extendedFloorGeo, extendedFloorMat);
    extendedFloor.rotation.x = -Math.PI / 2;
    extendedFloor.position.y = -5.62;
    extendedFloor.receiveShadow = true;
    industrialPlant.add(extendedFloor);

    // Painted Yellow Walkway Line Marking (Perimeter boundary)
    const walkwayGeo = new THREE.BoxGeometry(48, 0.02, 0.25);
    const walkwayLine1 = new THREE.Mesh(walkwayGeo, yellowSafetyMat);
    walkwayLine1.position.set(0, -5.58, 8.5);
    industrialPlant.add(walkwayLine1);

    const walkwayLine2 = new THREE.Mesh(walkwayGeo, yellowSafetyMat);
    walkwayLine2.position.set(0, -5.58, -7.5);
    industrialPlant.add(walkwayLine2);

    // Containment Bund Curbing around CSTR and PFR (Spill Prevention)
    const cstrCurbGeo = new THREE.TorusGeometry(4.2, 0.14, 8, 36);
    const cstrCurb = new THREE.Mesh(cstrCurbGeo, safetyStripesMat);
    cstrCurb.rotation.x = Math.PI / 2;
    cstrCurb.position.set(-7.5, -5.52, 0);
    industrialPlant.add(cstrCurb);

    const pfrCurbGeo = new THREE.BoxGeometry(8.6, 0.25, 6.8);
    const pfrCurbEdge = new THREE.Mesh(
      new THREE.RingGeometry(4.3, 4.5, 4),
      safetyStripesMat
    );

    // 2. OVERHEAD STRUCTURAL STEEL PIPE BRIDGE & PROCESS UTILITY RACK (z = -4.8, y = 5.2)
    const pipeRackGroup = new THREE.Group();
    pipeRackGroup.position.set(0, 0, -4.8);
    industrialPlant.add(pipeRackGroup);

    // Structural H-Columns
    [-20, -10, 0, 10, 20].forEach((colX) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.35, 10.8, 0.35), darkSteelMat);
      col.position.set(colX, -0.2, 0);
      pipeRackGroup.add(col);

      // Support bracket & cross-beam
      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 2.2), darkSteelMat);
      crossBeam.position.set(colX, 5.0, 0);
      pipeRackGroup.add(crossBeam);
    });

    // Longitudinal Pipe Tray Channels
    const trayGeo = new THREE.BoxGeometry(44, 0.15, 2.0);
    const tray = new THREE.Mesh(trayGeo, galvanizedMat);
    tray.position.set(0, 5.0, 0);
    pipeRackGroup.add(tray);

    // Multi-Tier Process Utility Pipes Spanning Facility:
    // (a) Blue Compressed Air Header
    const airLineOverhead = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 44, 16), airPipeMat);
    airLineOverhead.rotation.z = Math.PI / 2;
    airLineOverhead.position.set(0, 5.35, -0.6);
    pipeRackGroup.add(airLineOverhead);

    // (b) Purple Raw Influent Header
    const feedLineOverhead = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 44, 16),
      new THREE.MeshStandardMaterial({ color: 0xa855f7, metalness: 0.6, roughness: 0.3 })
    );
    feedLineOverhead.rotation.z = Math.PI / 2;
    feedLineOverhead.position.set(0, 5.35, -0.1);
    pipeRackGroup.add(feedLineOverhead);

    // (c) Emerald Treated Polishing Line
    const treatedLineOverhead = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 44, 16),
      new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.6, roughness: 0.3 })
    );
    treatedLineOverhead.rotation.z = Math.PI / 2;
    treatedLineOverhead.position.set(0, 5.35, 0.4);
    pipeRackGroup.add(treatedLineOverhead);

    // (d) Insulated Steam / High-Temp Pipe
    const steamLineOverhead = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 44, 16),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.8, roughness: 0.25 })
    );
    steamLineOverhead.rotation.z = Math.PI / 2;
    steamLineOverhead.position.set(0, 5.35, 0.8);
    pipeRackGroup.add(steamLineOverhead);

    // 3. UPSTREAM EQUALIZATION & NEUTRALIZATION TANK (EQ BASIN: x = -19.0, z = -4.5)
    const eqGroup = new THREE.Group();
    eqGroup.position.set(-19.0, -2.5, -4.5);
    industrialPlant.add(eqGroup);

    // Concrete Basin Walls
    const eqBasinGeo = new THREE.BoxGeometry(6.5, 4.5, 4.2);
    const eqBasinMesh = new THREE.Mesh(
      eqBasinGeo,
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8, metalness: 0.2 })
    );
    eqGroup.add(eqBasinMesh);

    // Agitated Raw Dye Wastewater Inside EQ Basin
    const eqLiquid = new THREE.Mesh(
      new THREE.BoxGeometry(6.1, 3.8, 3.8),
      new THREE.MeshPhysicalMaterial({
        color: 0x581c87, // Deep dark raw textile azo dye
        transparent: true,
        opacity: 0.88,
        roughness: 0.3
      })
    );
    eqLiquid.position.y = 0.2;
    eqGroup.add(eqLiquid);

    // Top Catwalk & Submersible Mixer Bridge
    const eqBridge = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 4.4), steelMat);
    eqBridge.position.y = 2.35;
    eqGroup.add(eqBridge);

    // Top Submersible Mixer Motor & Shaft
    const eqMixerMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.8, 16), motorMat);
    eqMixerMotor.position.set(0, 2.9, 0);
    eqGroup.add(eqMixerMotor);

    const eqMixerShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 12), steelMat);
    eqMixerShaft.position.set(0, 0.8, 0);
    eqGroup.add(eqMixerShaft);

    // Perimeter Yellow Handrail on EQ Basin
    [-2.0, 2.0].forEach((zOff) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.08, 0.08), yellowSafetyMat);
      rail.position.set(0, 3.2, zOff);
      eqGroup.add(rail);
    });

    // 4. AUTOMATED CHEMICAL DOSING SKID (x = -19.0, z = 3.5)
    const chemGroup = new THREE.Group();
    chemGroup.position.set(-19.0, -4.5, 3.5);
    industrialPlant.add(chemGroup);

    // Raised Steel Drip Tray Containment Skid
    const skidTray = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.28, 2.6), darkSteelMat);
    chemGroup.add(skidTray);

    // 3 Chemical IBC Tanks (Alkali NaOH, Acid H2SO4, Polymer Flocculant)
    const ibcConfigs = [
      { x: -1.8, mat: fiberglassMat, label: 'Alkali (NaOH)' },
      { x: 0, mat: chemOrangeMat, label: 'Acid (H2SO4)' },
      { x: 1.8, mat: chemAmberMat, label: 'Polymer (PAM)' }
    ];
    ibcConfigs.forEach((ibc) => {
      // Steel Cage Frame
      const cage = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 1.6, 1.4),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, wireframe: true })
      );
      cage.position.set(ibc.x, 0.95, 0);
      chemGroup.add(cage);

      // Translucent Chemical Container
      const tank = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, 1.3), ibc.mat);
      tank.position.set(ibc.x, 0.95, 0);
      chemGroup.add(tank);

      // Top Cap
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 16), darkSteelMat);
      cap.position.set(ibc.x, 1.75, 0);
      chemGroup.add(cap);
    });

    // Twin Motorized Metering Diaphragm Pumps
    [-0.8, 0.8].forEach((pX) => {
      const pMotor = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.4), motorMat);
      pMotor.position.set(pX, 0.45, 1.0);
      chemGroup.add(pMotor);

      const pHead = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.35, 12), steelMat);
      pHead.rotation.x = Math.PI / 2;
      pHead.position.set(pX, 0.45, 1.25);
      chemGroup.add(pHead);
    });

    // 5. ROTARY DRUM FINE SCREEN CHANNEL (x = -15.5, z = -4.5)
    const screenGroup = new THREE.Group();
    screenGroup.position.set(-15.5, -4.0, -4.5);
    industrialPlant.add(screenGroup);

    // Concrete Inflow Channel
    const screenChannel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 1.2), concreteMat);
    screenGroup.add(screenChannel);

    // Stainless Rotary Drum (Wedge-Wire)
    const screenDrum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 1.4, 20),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.25 })
    );
    screenDrum.rotation.z = Math.PI / 4;
    screenDrum.position.set(0, 0.6, 0);
    screenGroup.add(screenDrum);

    // Screen Drive Motor
    const screenMotor = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.4), motorMat);
    screenMotor.position.set(0.65, 1.1, 0);
    screenGroup.add(screenMotor);

    // 6. DUAL TERTIARY MULTI-MEDIA PRESSURE FILTERS (PSF & GAC: x = 18.0, z = 1.5)
    const filterGroup = new THREE.Group();
    filterGroup.position.set(18.0, -2.8, 1.5);
    industrialPlant.add(filterGroup);

    // Two Pressure Vessels (Sand Filter & Carbon Filter)
    [-1.2, 1.2].forEach((vX, vIdx) => {
      // Vertical Cylinder Body
      const vesselBody = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.4, 24), industrialBlueMat);
      vesselBody.position.set(vX, 0.4, 0);
      filterGroup.add(vesselBody);

      // Top Dished Head (Hemisphere)
      const topHead = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), industrialBlueMat);
      topHead.position.set(vX, 2.1, 0);
      filterGroup.add(topHead);

      // Bottom Dished Head
      const botHead = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), industrialBlueMat);
      botHead.position.set(vX, -1.3, 0);
      filterGroup.add(botHead);

      // 4 Steel Support Legs
      for (let l = 0; l < 4; l++) {
        const ang = (l * Math.PI) / 2 + Math.PI / 4;
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.12), darkSteelMat);
        leg.position.set(vX + Math.cos(ang) * 0.8, -2.0, Math.sin(ang) * 0.8);
        filterGroup.add(leg);
      }

      // Front Multi-Port Valve & Manifold Loop
      const frontValve = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 8, 16), yellowSafetyMat);
      frontValve.position.set(vX, 0.4, 0.98);
      filterGroup.add(frontValve);
    });

    // Connecting Pipe Bridge between vessels
    const connectPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.4, 12), steelMat);
    connectPipe.rotation.z = Math.PI / 2;
    connectPipe.position.set(0, 1.2, 0.95);
    filterGroup.add(connectPipe);

    // 7. MECHANICAL SLUDGE DEWATERING HOUSE & ROLL-OFF SKIP CONTAINER (x = -1.0, z = -9.5)
    const dewaterGroup = new THREE.Group();
    dewaterGroup.position.set(-1.0, -2.5, -9.5);
    industrialPlant.add(dewaterGroup);

    // Open Steel Canopy Building
    const shedRoof = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 0.18, 4.6),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 })
    );
    shedRoof.position.y = 3.6;
    dewaterGroup.add(shedRoof);

    // 4 Corner Steel Columns
    [-3.3, 3.3].forEach((cX) => {
      [-2.0, 2.0].forEach((cZ) => {
        const col = new THREE.Mesh(new THREE.BoxGeometry(0.25, 6.2, 0.25), darkSteelMat);
        col.position.set(cX, 0.5, cZ);
        dewaterGroup.add(col);
      });
    });

    // Belt Filter Press Machine Base & Rollers
    const bfpBase = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 1.8), industrialBlueMat);
    bfpBase.position.set(-1.2, -1.8, 0);
    dewaterGroup.add(bfpBase);

    // Press Tension Rollers
    for (let r = 0; r < 4; r++) {
      const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.6, 16), steelMat);
      roller.rotation.x = Math.PI / 2;
      roller.position.set(-2.2 + r * 0.7, -1.0, 0);
      dewaterGroup.add(roller);
    }

    // Roll-Off Sludge Cake Skip Container (Dark Green)
    const skipGeo = new THREE.BoxGeometry(2.4, 1.4, 1.8);
    const skipMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.7, metalness: 0.2 });
    const skipContainer = new THREE.Mesh(skipGeo, skipMat);
    skipContainer.position.set(2.0, -2.0, 0);
    dewaterGroup.add(skipContainer);

    // Dewatered Sludge Cake Inside Container
    const sludgeCake = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 1.6), sludgeCakeMat);
    sludgeCake.position.set(2.0, -1.6, 0);
    dewaterGroup.add(sludgeCake);

    // Sludge Discharge Chute from Press into Skip
    const chute = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.6), galvanizedMat);
    chute.rotation.z = -Math.PI / 6;
    chute.position.set(0.6, -1.1, 0);
    dewaterGroup.add(chute);

    // 8. PLANT SCADA & MCC ELECTRICAL CONTROL CABIN (x = 17.0, z = -6.5)
    const scadaGroup = new THREE.Group();
    scadaGroup.position.set(17.0, -3.2, -6.5);
    industrialPlant.add(scadaGroup);

    // Modular Containerized Cabin Shell
    const cabinMesh = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 3.4, 3.4),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.3 })
    );
    scadaGroup.add(cabinMesh);

    // Large Tinted Viewing Window Overlooking Plant
    const windowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 1.6),
      new THREE.MeshPhysicalMaterial({ color: 0x0ea5e9, roughness: 0.1, transmission: 0.65, transparent: true, opacity: 0.7 })
    );
    windowMesh.position.set(0, 0.2, 1.72);
    scadaGroup.add(windowMesh);

    // Interior Ambient SCADA Glow
    const scadaScreenGlow = new THREE.PointLight(0x06b6d4, 1.5, 6);
    scadaScreenGlow.position.set(0, 0.2, 1.0);
    scadaGroup.add(scadaScreenGlow);

    // Rooftop HVAC Air Conditioning Unit
    const hvacUnit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.65, 1.2), darkSteelMat);
    hvacUnit.position.set(0, 2.0, 0);
    scadaGroup.add(hvacUnit);

    // Exterior Electrical Disconnect Switches & Beacon
    const switchBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.25), darkSteelMat);
    switchBox.position.set(2.2, 0, 1.75);
    scadaGroup.add(switchBox);

    const redBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    redBeacon.position.set(2.2, 0.6, 1.75);
    scadaGroup.add(redBeacon);

    // 9. PLANT SAFETY & LIGHTING INFRASTRUCTURE
    // Emergency Eye Wash & Drench Shower (x = -12.5, z = 4.8)
    const showerGroup = new THREE.Group();
    showerGroup.position.set(-12.5, -5.5, 4.8);
    industrialPlant.add(showerGroup);

    const showerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 12), galvanizedMat);
    showerPole.position.y = 1.6;
    showerGroup.add(showerPole);

    const showerHead = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.2, 16), yellowSafetyMat);
    showerHead.rotation.x = Math.PI;
    showerHead.position.set(0, 3.1, 0.3);
    showerGroup.add(showerHead);

    const eyeWashBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.15, 0.18, 16), yellowSafetyMat);
    eyeWashBowl.position.set(0, 1.4, 0.25);
    showerGroup.add(eyeWashBowl);

    // Safety Placard (Green with White Cross)
    const safetySign = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x15803d })
    );
    safetySign.position.set(0, 2.4, 0.1);
    showerGroup.add(safetySign);

    // High-Mast Industrial Floodlight Stanchions (Corner Plant Lighting)
    [
      { x: -22, z: 12 },
      { x: 22, z: 12 }
    ].forEach((polePos) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 14, 16), darkSteelMat);
      pole.position.set(polePos.x, 1.4, polePos.z);
      industrialPlant.add(pole);

      const lampHead = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.8), yellowSafetyMat);
      lampHead.rotation.x = Math.PI / 6;
      lampHead.position.set(polePos.x, 8.4, polePos.z);
      industrialPlant.add(lampHead);

      const floodBulb = new THREE.PointLight(0xfef08a, 0.65, 32);
      floodBulb.position.set(polePos.x, 8.0, polePos.z);
      industrialPlant.add(floodBulb);
    });

    // =========================================================================
    // 10. RAW TEXTILE INFLUENT INTAKE FLUME & 3D SIGNBOARD (x = -25.5, z = -4.5)
    // =========================================================================
    const intakeGroup = new THREE.Group();
    intakeGroup.position.set(-25.5, -4.0, -4.5);
    industrialPlant.add(intakeGroup);

    // Concrete Inflow Flume Basin
    const intakeBasin = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.2, 3.0), concreteMat);
    intakeGroup.add(intakeBasin);

    // Deep Dark Reactive Dye Wastewater
    const rawWater = new THREE.Mesh(
      new THREE.BoxGeometry(4.1, 2.0, 2.6),
      new THREE.MeshPhysicalMaterial({
        color: 0x4a044e,
        roughness: 0.15,
        transmission: 0.35,
        transparent: true,
        opacity: 0.92
      })
    );
    rawWater.position.y = 0.5;
    intakeGroup.add(rawWater);

    // Intake Trash Rack / Grate (Vertical Stainless Steel Bars)
    for (let b = -1.2; b <= 1.2; b += 0.3) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8), darkSteelMat);
      bar.position.set(b, 0.6, 0);
      intakeGroup.add(bar);
    }

    // Upstream Inflow Culvert Pipe (Connecting to Offsite Mill)
    const inCulvert = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 3.0, 24), concreteMat);
    inCulvert.rotation.z = Math.PI / 2;
    inCulvert.position.set(-2.8, 0.2, 0);
    intakeGroup.add(inCulvert);

    // Overhead Structural Steel Gantry & Signboard Mount
    [-1.8, 1.8].forEach((gx) => {
      const gCol = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.4, 0.2), darkSteelMat);
      gCol.position.set(gx, 2.0, 1.3);
      intakeGroup.add(gCol);
    });
    const gBeam = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.2, 0.25), darkSteelMat);
    gBeam.position.set(0, 4.1, 1.3);
    intakeGroup.add(gBeam);

    // High-Visibility 3D Illuminated Signboard: INLET
    const inSignTex = makeSignboardTexture(
      'TEXTILE DYEHOUSE RAW INFLUENT',
      'Origin: Wet Processing Dye Mill ➔ EQ Basin TK-001 | S₀ = 750 mg/L bCOD',
      '⬅ RAW INFLUENT FEED INTAKE (Q₀ = 1000 m³/d)',
      false
    );
    const inSignMat = new THREE.MeshStandardMaterial({
      map: inSignTex,
      roughness: 0.3,
      metalness: 0.1,
      emissive: 0x581c87,
      emissiveIntensity: 0.35
    });
    const inSignBoard = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.6, 0.08), inSignMat);
    inSignBoard.position.set(0, 3.2, 1.3);
    intakeGroup.add(inSignBoard);

    // Pulsing Purple Warning Intake Beacon
    const inBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), new THREE.MeshBasicMaterial({ color: 0xc084fc }));
    inBeacon.position.set(0, 4.35, 1.3);
    intakeGroup.add(inBeacon);
    const inLight = new THREE.PointLight(0xa855f7, 1.5, 8);
    inLight.position.set(0, 4.35, 1.3);
    intakeGroup.add(inLight);

    // =========================================================================
    // 11. FINAL TREATED EFFLUENT OUTFALL CANAL & CASCADE (x = 26.5, z = 1.5)
    // =========================================================================
    const outfallGroup = new THREE.Group();
    outfallGroup.position.set(26.5, -4.2, 1.5);
    industrialPlant.add(outfallGroup);

    // Concrete Discharge Canal
    const outfallBasin = new THREE.Mesh(new THREE.BoxGeometry(6.5, 3.2, 3.4), concreteMat);
    outfallGroup.add(outfallBasin);

    // Stepped Aeration Cascade (3 Descending Steps)
    const stepGeos = [
      { x: -1.6, y: 0.2, w: 1.8, h: 1.2 },
      { x: 0.0, y: -0.3, w: 1.6, h: 1.0 },
      { x: 1.6, y: -0.8, w: 1.8, h: 0.8 }
    ];
    stepGeos.forEach((sg) => {
      const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(sg.w, sg.h, 2.8), concreteMat);
      stepMesh.position.set(sg.x, sg.y, 0);
      outfallGroup.add(stepMesh);

      // Sparkling Treated Water on Each Step
      const waterSheet = new THREE.Mesh(
        new THREE.BoxGeometry(sg.w - 0.04, 0.15, 2.7),
        new THREE.MeshPhysicalMaterial({
          color: 0x10b981,
          roughness: 0.04,
          transmission: 0.94,
          ior: 1.33,
          transparent: true,
          opacity: 0.88
        })
      );
      waterSheet.position.set(sg.x, sg.y + sg.h / 2 + 0.08, 0);
      outfallGroup.add(waterSheet);
    });

    // Twin Safety Handrails on Outfall Canal
    [-1.4, 1.4].forEach((rz) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.08, 0.08), yellowSafetyMat);
      rail.position.set(0, 1.8, rz);
      outfallGroup.add(rail);
      for (let p = -2.8; p <= 2.8; p += 1.4) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 0.08), darkSteelMat);
        post.position.set(p, 0.9, rz);
        outfallGroup.add(post);
      }
    });

    // Outfall Gantry & 3D Signboard
    [-2.2, 2.2].forEach((gx) => {
      const gCol = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.4, 0.2), darkSteelMat);
      gCol.position.set(gx, 2.0, -1.4);
      outfallGroup.add(gCol);
    });
    const outGBeam = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.2, 0.25), darkSteelMat);
    outGBeam.position.set(0, 4.1, -1.4);
    outfallGroup.add(outGBeam);

    // High-Visibility 3D Illuminated Signboard: OUTLET
    const outSignTex = makeSignboardTexture(
      'FINAL TREATED EFFLUENT OUTFALL',
      'Destination: Receiving River Outfall | DoE ECR Schedule-10 Compliant | Sₑ ≤ 75 mg/L',
      'DISCHARGE STREAM ➡ (Q = 1000 m³/d, Clean Decolorized)',
      true
    );
    const outSignMat = new THREE.MeshStandardMaterial({
      map: outSignTex,
      roughness: 0.3,
      metalness: 0.1,
      emissive: 0x065f46,
      emissiveIntensity: 0.35
    });
    const outSignBoard = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.6, 0.08), outSignMat);
    outSignBoard.position.set(0, 3.2, -1.4);
    outfallGroup.add(outSignBoard);

    // Glowing Green Compliance LED Beacon
    const outBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), new THREE.MeshBasicMaterial({ color: 0x34d399 }));
    outBeacon.position.set(0, 4.35, -1.4);
    outfallGroup.add(outBeacon);
    const outLight = new THREE.PointLight(0x10b981, 1.6, 8);
    outLight.position.set(0, 4.35, -1.4);
    outfallGroup.add(outLight);

    // =========================================================================
    // D. HUMAN-SCALE ENGINEER FIGURE (1.75m Tall Reference) (Feature #25)
    // =========================================================================
    const engineerGroup = new THREE.Group();
    engineerGroup.position.set(-12.2, -5.55, 2.5);
    scene.add(engineerGroup);

    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.16, 0.85, 12),
      new THREE.MeshStandardMaterial({ color: 0xf97316 }) // High-vis safety vest
    );
    torso.position.y = 0.75;
    engineerGroup.add(torso);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xfde047 }) // Safety yellow hard hat
    );
    head.position.y = 1.35;
    engineerGroup.add(head);

    // =========================================================================
    // REALISM PROPS: perimeter fence, access road, trees, wet patches, drains
    // =========================================================================
    {
      const rand = (() => { let q = 7; return () => { q = (q * 16807) % 2147483647; return q / 2147483647; }; })();
      const groundY = -5.62;

      // Perimeter chain-link fence
      const fenceTex = makeChainLinkTexture(renderer);
      const fenceMat = new THREE.MeshBasicMaterial({ map: fenceTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, alphaTest: 0.05 });
      const hx = 36;
      const hz = 25;
      const postGeo = new THREE.CylinderGeometry(0.07, 0.07, 2.5, 8);
      const sides = [
        { len: hx * 2, pos: [0, hz], rot: 0 },
        { len: hx * 2, pos: [0, -hz], rot: 0 },
        { len: hz * 2, pos: [hx, 0], rot: Math.PI / 2 },
        { len: hz * 2, pos: [-hx, 0], rot: Math.PI / 2 }
      ];
      sides.forEach((sd) => {
        const panelTex = fenceTex.clone();
        panelTex.wrapS = panelTex.wrapT = THREE.RepeatWrapping;
        panelTex.repeat.set(sd.len / 1.2, 2.2 / 1.2);
        panelTex.needsUpdate = true;
        const panel = new THREE.Mesh(
          new THREE.PlaneGeometry(sd.len, 2.2),
          new THREE.MeshBasicMaterial({ map: panelTex, transparent: true, side: THREE.DoubleSide, depthWrite: false })
        );
        panel.position.set(sd.pos[0], groundY + 1.25, sd.pos[1]);
        panel.rotation.y = sd.rot;
        industrialPlant.add(panel);

        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, sd.len, 8), galvanizedMat);
        rail.rotation.z = Math.PI / 2;
        rail.rotation.y = sd.rot === 0 ? 0 : Math.PI / 2;
        rail.position.set(sd.pos[0], groundY + 2.35, sd.pos[1]);
        industrialPlant.add(rail);

        const count = Math.floor(sd.len / 3);
        for (let i = 0; i <= count; i++) {
          const post = new THREE.Mesh(postGeo, galvanizedMat);
          const t = -sd.len / 2 + (i / count) * sd.len;
          post.position.set(
            sd.rot === 0 ? t : sd.pos[0],
            groundY + 1.25,
            sd.rot === 0 ? sd.pos[1] : t
          );
          industrialPlant.add(post);
        }
      });

      // Public access road with kerb and dashed centre line
      const roadMat = pbr(kit.asphalt, { color: 0xdddddd, roughness: 1, metalness: 0 }, 80 / 3, 8 / 3);
      const road = new THREE.Mesh(new THREE.PlaneGeometry(160, 8), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, -5.66, 32);
      road.receiveShadow = true;
      industrialPlant.add(road);
      const dashMat = new THREE.MeshStandardMaterial({ color: 0xf3f0d0, roughness: 0.7 });
      for (let i = -38; i <= 38; i++) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.18), dashMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(i * 2, -5.655, 32);
        industrialPlant.add(dash);
      }
      const kerbMat = pbr(kit.concrete, { color: 0xffffff, roughness: 1, metalness: 0 }, 20, 0.2);
      [27.9, 36.1].forEach((kz) => {
        const kerb = new THREE.Mesh(new THREE.BoxGeometry(160, 0.18, 0.3), kerbMat);
        kerb.position.set(0, -5.58, kz);
        industrialPlant.add(kerb);
      });

      // Trees beyond the fence
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.95 });
      for (let i = 0; i < 26; i++) {
        let tx = (rand() - 0.5) * 150;
        let tz = -30 - rand() * 40;
        if (i % 3 === 0) { tx = (rand() < 0.5 ? -1 : 1) * (42 + rand() * 40); tz = (rand() - 0.5) * 50; }
        const h = 4 + rand() * 4;
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, h, 8), trunkMat);
        trunk.position.y = h / 2;
        tree.add(trunk);
        for (let k = 0; k < 4; k++) {
          const fol = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.5 + rand() * 1.4, 2),
            new THREE.MeshStandardMaterial({
              color: new THREE.Color().setHSL(0.27 + rand() * 0.06, 0.45, 0.2 + rand() * 0.1),
              roughness: 0.95
            })
          );
          fol.position.set((rand() - 0.5) * 2.2, h + 0.4 + k * 0.6, (rand() - 0.5) * 2.2);
          fol.scale.y = 0.85;
          fol.castShadow = true;
          tree.add(fol);
        }
        tree.position.set(tx, -5.68, tz);
        industrialPlant.add(tree);
      }

      // Wet / oil patches that reflect the sky on the slab
      for (let i = 0; i < 9; i++) {
        const puddle = new THREE.Mesh(
          new THREE.CircleGeometry(0.5 + rand() * 1.1, 28),
          new THREE.MeshStandardMaterial({
            color: 0x1a1f26,
            roughness: 0.04,
            metalness: 0.0,
            transparent: true,
            opacity: 0.55,
            polygonOffset: true,
            polygonOffsetFactor: -2
          })
        );
        puddle.rotation.x = -Math.PI / 2;
        puddle.scale.set(1 + rand(), 1, 1);
        puddle.position.set((rand() - 0.5) * 40, -5.585, (rand() - 0.5) * 22);
        industrialPlant.add(puddle);
      }

      // Floor drain grates
      const grateMat = new THREE.MeshStandardMaterial({ color: 0x2b2f35, roughness: 0.6, metalness: 0.8 });
      [[-3, 6.5], [3, 6.5], [-14, -2], [14, -2]].forEach(([gx, gz]) => {
        const grate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.5), grateMat);
        grate.position.set(gx, -5.575, gz);
        industrialPlant.add(grate);
      });
    }

    // =========================================================================
    // EQUIPMENT PICKING IDS (hover / tap shows the equipment label)
    // =========================================================================
    const tag = (obj, id) => { if (obj) obj.userData.compId = id; };
    tag(cstrVessel, 'cstr_vessel_shell');
    tag(motorBody, 'cstr_motor');
    tag(bridge, 'cstr_bridge');
    tag(impellerGroup, 'cstr_impeller_upper');
    tag(diffuserRing, 'cstr_diffusers');
    cstrVessel.traverse((o) => {
      if (o.isMesh && o.material === podMat) tag(o, 'cstr_diffusers');
      if (o.isMesh && o.material === darkSteelMat && o.geometry.type === 'BoxGeometry') tag(o, 'cstr_baffles');
    });
    tag(cstrClarifier, 'cstr_clarifier_body');
    tag(cstrRake, 'cstr_rake');
    tag(rasPipeVert, 'cstr_ras_pipe');
    tag(pfrBasin, 'pfr_axial_core');
    pfrBasin.traverse((o) => { if (o.isMesh && o.material === concreteMat) tag(o, 'pfr_baffle_chicane'); });
    tag(probeGroup, 'pfr_sonde_probe');
    tag(pfrClarifier, 'pfr_clarifier_body');
    tag(gateGroup, 'pfr_compliance_gate');
    tag(blowerStation, 'roots_blower');
    tag(eqGroup, 'eq_basin');
    tag(chemGroup, 'chem_dosing_skid');
    tag(screenGroup, 'bar_screen');
    tag(filterGroup, 'tertiary_filtration');
    tag(dewaterGroup, 'sludge_dewatering');
    tag(scadaGroup, 'scada_cabin');
    tag(pipeRackGroup, 'pipe_rack');
    tag(showerGroup, 'safety_station');
    tag(intakeBasin, 'raw_intake');
    tag(outfallBasin, 'final_outfall');

    // Selection marker for pinned equipment
    const pinMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.95, depthTest: false })
    );
    pinMarker.renderOrder = 999;
    pinMarker.visible = false;
    scene.add(pinMarker);

    // Raycast picking
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const isVisibleChain = (o) => { while (o) { if (!o.visible) return false; o = o.parent; } return true; };
    const pickEquipment = (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      for (const hit of hits) {
        if (!isVisibleChain(hit.object)) continue;
        let o = hit.object;
        while (o) {
          if (o.userData && o.userData.compId) {
            return { id: o.userData.compId, point: hit.point.clone(), x: clientX - rect.left, y: clientY - rect.top };
          }
          o = o.parent;
        }
      }
      return null;
    };
    const applyPin = (res) => {
      if (res && !(pinnedRef.current && pinnedRef.current.id === res.id)) {
        pinnedRef.current = { id: res.id, point: res.point };
        setPinned({ id: res.id });
      } else {
        pinnedRef.current = null;
        setPinned(null);
        setPinnedPos(null);
      }
    };

    // =========================================================================
    // E. MOUSE ORBIT & ZOOM INTERACTION
    // =========================================================================
    const downPos = { x: 0, y: 0 };
    let lastHoverTs = 0;
    const onMouseDown = (e) => {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
      downPos.x = e.clientX;
      downPos.y = e.clientY;
    };

    const onMouseMove = (e) => {
      if (!isDraggingRef.current) {
        // Hover: show the equipment label under the cursor
        if (!stateRef.current.showComponentLabels || e.target !== renderer.domElement) {
          mount.style.cursor = 'default';
          setHoverInfo((prev) => (prev ? null : prev));
          return;
        }
        const now = performance.now();
        if (now - lastHoverTs < 40) return;
        lastHoverTs = now;
        const res = pickEquipment(e.clientX, e.clientY);
        mount.style.cursor = res ? 'pointer' : 'grab';
        setHoverInfo(res ? { id: res.id, x: res.x, y: res.y } : null);
        return;
      }
      setHoverInfo(null);
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      cameraAngleRef.current.theta -= dx * 0.007;
      cameraAngleRef.current.phi = Math.max(0.08, Math.min(Math.PI / 2 - 0.04, cameraAngleRef.current.phi + dy * 0.007));
      updateCameraPosition();
    };

    const onMouseUp = (e) => {
      const wasDragging = isDraggingRef.current;
      isDraggingRef.current = false;
      // A click (no drag) on equipment pins its label
      if (wasDragging && e.target === renderer.domElement && stateRef.current.showComponentLabels) {
        const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
        if (moved < 5) applyPin(pickEquipment(e.clientX, e.clientY));
      }
    };

    // Touch: tap equipment to show label, one-finger drag orbits
    const touch = { x: 0, y: 0, sx: 0, sy: 0, moved: false };
    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      touch.x = touch.sx = t.clientX;
      touch.y = touch.sy = t.clientY;
      touch.moved = false;
    };
    const onTouchMove = (e) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const t = e.touches[0];
      if (Math.hypot(t.clientX - touch.sx, t.clientY - touch.sy) > 8) touch.moved = true;
      cameraAngleRef.current.theta -= (t.clientX - touch.x) * 0.007;
      cameraAngleRef.current.phi = Math.max(0.08, Math.min(Math.PI / 2 - 0.04, cameraAngleRef.current.phi + (t.clientY - touch.y) * 0.007));
      touch.x = t.clientX;
      touch.y = t.clientY;
      updateCameraPosition();
    };
    const onTouchEnd = () => {
      if (!touch.moved && stateRef.current.showComponentLabels) applyPin(pickEquipment(touch.sx, touch.sy));
    };
    mount.addEventListener('touchstart', onTouchStart, { passive: true });
    mount.addEventListener('touchmove', onTouchMove, { passive: false });
    mount.addEventListener('touchend', onTouchEnd);

    const onWheel = (e) => {
      e.preventDefault();
      cameraAngleRef.current.radius = Math.max(9, Math.min(46, cameraAngleRef.current.radius + e.deltaY * 0.018));
      updateCameraPosition();
    };

    mount.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    mount.addEventListener('wheel', onWheel, { passive: false });

    const handleResize = () => {
      if (!mountRef.current) return;
      const newW = mountRef.current.clientWidth;
      const newH = mountRef.current.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    // =========================================================================
    // F. 60 FPS MULTI-PHYSICS & SCADA PROJECTION LOOP
    // =========================================================================
    const clock = new THREE.Clock();
    scene.traverse((o) => {
      if (o.isMesh && o.material && !o.material.transparent && !o.material.isShaderMaterial && !o.material.isMeshBasicMaterial) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });

    let frameCounter = 0;

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = Math.min(0.1, clock.getDelta());
      const elapsed = clock.getElapsedTime();
      const st = stateRef.current;

      // 1. Dynamically Scale 3D CSTR & PFR Vessel Geometries with Calculated Reactor Volume V!
      if (cstrVesselRef.current && st.cstrResult?.V) {
        const volRatioCstr = Math.max(0.18, Math.min(4.2, st.cstrResult.V / 490.0));
        const rScale = Math.max(0.62, Math.min(1.48, Math.pow(volRatioCstr, 0.34)));
        const hScale = Math.max(0.65, Math.min(1.42, Math.pow(volRatioCstr, 0.30)));
        cstrVesselRef.current.scale.lerp(new THREE.Vector3(rScale, hScale, rScale), 0.12);
        // Keep tank bottom sitting cleanly on support legs
        cstrVesselRef.current.position.y = (hScale - 1.0) * 3.1;
      }

      if (pfrBasinRef.current && st.pfrResult?.V) {
        const volRatioPfr = Math.max(0.18, Math.min(4.2, st.pfrResult.V / 495.0));
        const lenScale = Math.max(0.60, Math.min(1.48, Math.pow(volRatioPfr, 0.38)));
        const depthScale = Math.max(0.68, Math.min(1.38, Math.pow(volRatioPfr, 0.26)));
        pfrBasinRef.current.scale.lerp(new THREE.Vector3(lenScale, depthScale, 1.0), 0.12);
        pfrBasinRef.current.position.y = (depthScale - 1.0) * 1.8;
      }

      // 2. Update CSTR Liquid Color & Cutaway Wall (Coupled to Se, DO, r_S, S0, and Xb)
      if (cstrLiquidRef.current && st.cstrResult) {
        const tracerCstr = st.tracerState.active ? Math.exp(-st.tracerState.elapsed * 0.8) : 0;
        const shockCstr = st.shockState.active ? Math.exp(-Math.pow((st.shockState.elapsed - 1.5) / 1.8, 2)) * 0.65 : 0;

        cstrLiquidRef.current.material.color.copy(
          evaluateFieldColor(
            st.heatmapMode,
            st.cstrResult.Se,
            st.cstrResult.DO,
            st.cstrResult.r_S,
            st.S0,
            tracerCstr,
            shockCstr,
            st.cstrResult.Xb
          )
        );
      }

      // 3. Update 16 PFR Axial Spatial Zones with True Profile Colors
      if (pfrZonesRef.current.length > 0 && st.pfrResult?.profiles) {
        const prof = st.pfrResult.profiles;
        const nProf = prof.S.length;

        pfrZonesRef.current.forEach((zObj) => {
          const pIdx = Math.min(nProf - 1, Math.max(0, Math.round(zObj.fracZ * (nProf - 1))));
          const localS = prof.S[pIdx];
          const localDO = prof.DO[pIdx];
          const localRate = prof.reaction_rate[pIdx];
          const localXb = prof.Xb ? prof.Xb[pIdx] : 3877;

          // Plug-flow pulse tracer wave traveling along z/L
          const tracerFront = (st.tracerState.elapsed % 4.5) / 3.6;
          const tracerPfr = st.tracerState.active
            ? Math.exp(-Math.pow((zObj.fracZ - tracerFront) / 0.11, 2))
            : 0;

          // Plug-flow toxic dye shock wave traveling along z/L
          const shockFront = (st.shockState.elapsed % 4.5) / 3.6;
          const shockPfr = st.shockState.active
            ? Math.exp(-Math.pow((zObj.fracZ - shockFront) / 0.14, 2))
            : 0;

          zObj.mesh.material.color.copy(
            evaluateFieldColor(
              st.heatmapMode,
              localS,
              localDO,
              localRate,
              st.S0,
              tracerPfr,
              shockPfr,
              localXb
            )
          );
        });
      }

      // 4. Position 3D Multiparameter Sonde Probe along Serpentine PFR (Feature #19)
      if (probeMarkerRef.current) {
        const zFrac = Math.min(1, Math.max(0, st.probeZ));
        const passFloat = zFrac * 4.0;
        const passIdx = Math.min(3, Math.floor(passFloat));
        const subFrac = passFloat - passIdx;
        const zCenter = (passIdx - 1.5) * 1.55;
        const dir = passIdx % 2 === 0 ? 1 : -1;
        const xPos = dir * (-passLen / 2 + subFrac * passLen);
        probeMarkerRef.current.position.set(xPos, -0.8, zCenter);
      }

      // 5. Update Clarifier Sludge Blankets (CSTR & PFR), Surface Foam & Compliance Beacon
      if (cstrBlanketRef.current && st.cstrResult?.recycle) {
        const scaleH = Math.max(0.25, Math.min(2.2, st.cstrResult.recycle.blanketPct / 30));
        cstrBlanketRef.current.scale.y = scaleH;
      }
      if (pfrBlanketRef.current && st.pfrResult) {
        const pfrBlanketScale = Math.max(0.25, Math.min(2.3, ((st.pfrResult.svi || 110) / 110) * (0.60 / Math.max(0.2, st.recycleRatio || 0.6)) * 0.95));
        pfrBlanketRef.current.scale.y = pfrBlanketScale;
      }
      if (cstrFoamRef.current && st.cstrResult?.geometry) {
        const foamScale = Math.max(0.15, Math.min(3.2, (st.cstrResult.geometry.foamThicknessPct / 30) * ((st.kLa || 120) / 120)));
        cstrFoamRef.current.scale.y = foamScale;
        cstrFoamRef.current.material.opacity = Math.min(0.88, 0.30 + (st.S0 / 2000) * 0.45);
      }
      if (complianceBeaconRef.current && st.cstrResult) {
        const isCompliant = st.cstrResult.Se <= (st.targetSe + 0.8) && !st.blowerTrip && !st.cstrResult.isWashout;
        complianceBeaconRef.current.material.color.setHex(isCompliant ? 0x10b981 : 0xef4444);
      }

      // 6. Dynamic Mechanical Rotation & Multi-Phase Particle Kinematics (Driven by Q, kLa, thetaC, R, T, S0!)
      if (st.isPlaying) {
        const flowFactor = Math.max(0.25, Math.min(3.5, (st.Q || 1000) / 1000.0));
        const klaFactor = Math.max(0.25, Math.min(2.5, (st.kLa || 120) / 120.0));
        const rasFactor = Math.max(0.3, Math.min(2.6, (st.recycleRatio || 0.6) / 0.60));
        const tempFactor = Math.max(0.7, Math.min(1.6, Math.pow(1.05, (st.temperature || 25) - 20)));
        const xbVal = st.cstrResult?.Xb || 3877;
        const flocCountFrac = st.cstrResult?.isWashout
          ? 0.08
          : Math.max(0.18, Math.min(1.0, xbVal / 5200.0));
        const flocSizeScale = Math.max(0.55, Math.min(1.75, Math.pow((st.thetaC || 10) / 10.0, 0.32)));
        const bubbleCountFrac = st.blowerTrip ? 0 : Math.max(0.20, Math.min(1.0, (st.kLa || 120) / 200.0));
        const bubbleSizeScale = Math.max(0.65, Math.min(1.55, 0.75 + 0.35 * klaFactor));

        // Impeller spins faster with higher hydraulic flow Q and aeration agitation
        if (impellerRef.current) {
          impellerRef.current.rotation.y += delta * (2.8 + 2.6 * flowFactor + 1.4 * klaFactor);
        }
        // Root Blower Fan RPM scales directly with kLa!
        if (blowerFanRef.current && !st.blowerTrip) {
          blowerFanRef.current.rotation.z += delta * 12.0 * klaFactor;
        }
        // Clarifier Scraper Rake RPM scales with RAS recycle ratio R!
        if (cstrRakeRef.current) cstrRakeRef.current.rotation.y += delta * 0.45 * rasFactor;
        if (pfrRakeRef.current) pfrRakeRef.current.rotation.y += delta * 0.45 * rasFactor;

        // CSTR Bubbles: Count, Size & Rising Velocity scale with kLa & Temperature!
        bubblesRef.current.forEach((b, idx) => {
          const isActiveBubble = !st.blowerTrip && (idx / bubblesRef.current.length) <= bubbleCountFrac;
          b.mesh.visible = isActiveBubble;
          if (isActiveBubble) {
            b.mesh.scale.setScalar(bubbleSizeScale);
            b.mesh.position.y += b.speedY * klaFactor * tempFactor;
            b.angle += 0.015 * (flowFactor + klaFactor * 0.5);
            b.mesh.position.x = b.radius * Math.cos(b.angle);
            b.mesh.position.z = b.radius * Math.sin(b.angle);
            if (b.mesh.position.y > 2.4) {
              b.mesh.position.y = -3.0;
            }
          }
        });

        // CSTR Biomass Flocs: Count, Size & Toroidal Swirl scale with theta_c (Xb), Q, and T!
        flocsRef.current.forEach((f, idx) => {
          f.mesh.visible = (idx / flocsRef.current.length) <= flocCountFrac;
          f.mesh.scale.setScalar(flocSizeScale);
          f.theta += f.speedTheta * (0.55 + 0.65 * flowFactor) * tempFactor;
          f.mesh.position.x = f.r * Math.cos(f.theta);
          f.mesh.position.z = f.r * Math.sin(f.theta);
          f.mesh.position.y = -0.4 + Math.sin(elapsed * (1.5 + flowFactor) + idx) * 2.1;
        });

        // PFR Bubbles: Density, Size & Rising Speed scale with kLa + Tapered/Uniform Mode!
        pfrBubblesRef.current.forEach((b, idx) => {
          if (st.blowerTrip) {
            b.mesh.visible = false;
            return;
          }
          const baseVisible = (idx / pfrBubblesRef.current.length) <= bubbleCountFrac;
          b.mesh.visible = st.aerationMode === 'tapered'
            ? baseVisible && (b.fracZ < 0.55 || idx % 3 === 0)
            : baseVisible;
          b.mesh.scale.setScalar(bubbleSizeScale);
          const speedBoost = st.aerationMode === 'tapered' && b.fracZ < 0.35 ? 1.55 : 1.0;
          b.mesh.position.y += b.speedY * klaFactor * speedBoost;
          b.mesh.position.x += b.speedX * flowFactor;
          if (b.mesh.position.y > 0.2 || b.mesh.position.x < b.minX || b.mesh.position.x > b.maxX) {
            b.mesh.position.y = -2.2;
            b.mesh.position.x = b.speedX > 0 ? b.minX : b.maxX;
          }
        });

        // PFR Biomass Flocs: Advection velocity scales with Flow Rate Q; Count & Size scale with theta_c!
        pfrFlocsRef.current.forEach((f, idx) => {
          f.mesh.visible = (idx / pfrFlocsRef.current.length) <= flocCountFrac;
          f.mesh.scale.setScalar(flocSizeScale);
          f.mesh.position.x += f.speedX * flowFactor;
          if (f.mesh.position.x < f.minX || f.mesh.position.x > f.maxX) {
            f.mesh.position.x = f.speedX > 0 ? f.minX : f.maxX;
          }
        });

        // 100% Mathematically Constrained Fluid Flow inside Transparent Glass Pipes
        pipeParticlesRef.current.forEach((pp) => {
          let spd = 0.28 * flowFactor;
          if (pp.type === 'ras' || pp.type === 'was') {
            spd = 0.25 * rasFactor * Math.sqrt(flowFactor);
          } else if (pp.type === 'air') {
            spd = 0.40 * klaFactor;
            pp.mesh.visible = !st.blowerTrip;
          }
          pp.progress = (pp.progress + delta * (pp.speedFactor || 1.0) * spd) % 1.0;

          if (pp.type === 'influent') {
            const sScale = Math.max(0.75, Math.min(1.5, 0.7 + (st.S0 || 750) / 1200));
            pp.mesh.scale.setScalar(sScale);
          } else if (pp.type === 'ras') {
            pp.mesh.scale.setScalar(Math.max(0.65, Math.min(1.5, 0.6 + (st.recycleRatio || 0.6) * 0.75)));
          } else if (pp.type === 'air') {
            pp.mesh.scale.setScalar(bubbleSizeScale);
          }

          // Exact evaluation on Catmull-Rom centerline
          const pt = pp.curve.getPointAt(pp.progress);
          pp.mesh.position.copy(pt);
        });
      }

      renderer.render(scene, camera);

      // Project 3D SCADA and Equipment Component Coordinates to 2D Screen Overlay every 4 frames
      frameCounter++;
      if (frameCounter % 4 === 0 && mountRef.current) {
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;

        if (stateRef.current.showScadaPins) {
          const projectedScada = scadaAnchors.map((anc) => {
            const v = anc.pos.clone().project(camera);
            return {
              id: anc.id,
              x: (v.x * 0.5 + 0.5) * w,
              y: (-(v.y * 0.5) + 0.5) * h,
              visible: v.z < 1.0
            };
          });
          setPinCoords(projectedScada);
        }

        if (pinnedRef.current) {
          const v = pinnedRef.current.point.clone().project(camera);
          pinMarker.visible = true;
          pinMarker.position.copy(pinnedRef.current.point);
          pinMarker.scale.setScalar(1 + 0.3 * Math.sin(performance.now() * 0.006));
          setPinnedPos({ x: (v.x * 0.5 + 0.5) * w, y: (-(v.y * 0.5) + 0.5) * h, visible: v.z < 1.0 });
        } else {
          pinMarker.visible = false;
        }
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
      mount.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      mount.removeEventListener('wheel', onWheel);
      mount.removeEventListener('touchstart', onTouchStart);
      mount.removeEventListener('touchmove', onTouchMove);
      mount.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current?.domElement) {
        rendererRef.current.domElement.remove();
      }
    };
  }, [scadaAnchors]);

  // Toggle Industrial Plant Environment Visibility
  useEffect(() => {
    if (industrialPlantRef.current) {
      industrialPlantRef.current.visible = showIndustrialPlant;
    }
  }, [showIndustrialPlant]);

  // Cutaway Wall Geometry Update (Feature #20)
  useEffect(() => {
    if (!cstrWallRef.current) return;
    cstrWallRef.current.geometry.dispose();
    cstrWallRef.current.geometry = cutawayMode
      ? new THREE.CylinderGeometry(3.3, 3.3, 6.6, 40, 1, true, Math.PI * 0.25, Math.PI * 1.50)
      : new THREE.CylinderGeometry(3.3, 3.3, 6.6, 40, 1, true, 0, Math.PI * 2);
  }, [cutawayMode]);

  // Timer for Pulse Tracer RTD & Toxic Shock Cannon animations
  useEffect(() => {
    if (!tracerState.active && !shockState.active) return;
    const interval = setInterval(() => {
      setTracerState((prev) => {
        if (!prev.active) return prev;
        if (prev.elapsed > 5.0) return { active: false, elapsed: 0 };
        return { active: true, elapsed: prev.elapsed + 0.08 };
      });
      setShockState((prev) => {
        if (!prev.active) return prev;
        if (prev.elapsed > 5.0) return { active: false, elapsed: 0 };
        return { active: true, elapsed: prev.elapsed + 0.08 };
      });
    }, 50);
    return () => clearInterval(interval);
  }, [tracerState.active, shockState.active]);

  // Local Multiparameter Sonde Readings at probeZ (Feature #19)
  const sondeReading = useMemo(() => {
    const prof = pfrResult?.profiles;
    if (!prof || !prof.S) {
      return { zPct: 12, S: 620, DO: 0.52, Xb: 3880, rate: 28500, OUR: 14500, mu: 2.4 };
    }
    const n = prof.S.length;
    const idx = Math.min(n - 1, Math.max(0, Math.round(probeZ * (n - 1))));
    const sVal = prof.S[idx];
    const doVal = prof.DO[idx];
    return {
      zPct: (probeZ * 100).toFixed(0),
      S: sVal.toFixed(1),
      DO: doVal.toFixed(2),
      Xb: prof.Xb[idx].toFixed(0),
      rate: prof.reaction_rate[idx].toFixed(0),
      OUR: (prof.OUR ? prof.OUR[idx] : prof.reaction_rate[idx] * 0.52).toFixed(0),
      mu: (prof.mu ? prof.mu[idx] : 2.1).toFixed(2),
      monodSat: ((sVal / (65 + sVal)) * 100).toFixed(1),
      doLim: ((doVal / (0.20 + doVal)) * 100).toFixed(1)
    };
  }, [pfrResult, probeZ]);

  // Single Bio-Floc Reaction-Diffusion Micro-Profile at Probe Location (Feature #23)
  const bioFlocData = useMemo(() => {
    return computeBioFlocMicroProfile(Number(sondeReading.S), Number(sondeReading.DO), 60);
  }, [sondeReading.S, sondeReading.DO]);

  // Dynamic SCADA Tag Content Resolver (Feature #18)
  const getScadaCardData = (id) => {
    if (id === 'influent') {
      return {
        title: 'INFLUENT FEED HEADER',
        line1: (
          <>
            Q<sub>0</sub> = {Q} m<sup>3</sup>/d | S<sub>0</sub> = {S0} mg/L
          </>
        ),
        line2: `T = ${temperature}°C | Azo Dye Effluent`,
        color: 'border-purple-500/60 bg-purple-950/85 text-purple-200'
      };
    }
    if (id === 'cstr_core') {
      return {
        title: (
          <>
            CSTR MIXED VESSEL ({cstrResult?.V?.toFixed(0)} m<sup>3</sup>)
          </>
        ),
        line1: (
          <>
            S<sub>e</sub> = {cstrResult?.Se?.toFixed(1)} mg/L | DO = {cstrResult?.DO?.toFixed(2)} mg/L
          </>
        ),
        line2: `D = ${cstrResult?.geometry?.diameter?.toFixed(1)}m × H = ${cstrResult?.geometry?.height?.toFixed(1)}m`,
        color: 'border-blue-500/60 bg-blue-950/85 text-blue-200'
      };
    }
    if (id === 'cstr_clarifier') {
      return {
        title: 'CLARIFIER & RAS RECYCLE',
        line1: (
          <>
            Q<sub>R</sub> = {cstrResult?.recycle?.Q_R?.toFixed(0)} m<sup>3</sup>/d | X<sub>R</sub> = {cstrResult?.recycle?.X_R?.toFixed(0)} mg/L
          </>
        ),
        line2: (
          <>
            WAS Q<sub>w</sub> = {cstrResult?.recycle?.Q_w?.toFixed(1)} m<sup>3</sup>/d | SVI = {cstrResult?.recycle?.svi} mL/g
          </>
        ),
        color: 'border-amber-500/60 bg-amber-950/85 text-amber-200'
      };
    }
    if (id === 'blower') {
      return {
        title: 'ROOT AIR BLOWER STATION',
        line1: blowerTrip ? (
          <>⚠️ BLOWER TRIPPED (O<sub>2</sub> OFF)</>
        ) : (
          <>
            k<sub>L</sub>a = {pfrResult?.profiles?.kLa_profile?.[0]?.toFixed(0) || 120} d<sup>−1</sup> ({aerationMode.toUpperCase()})
          </>
        ),
        line2: (
          <>
            DO<sub>sat</sub>({temperature}°C) = {(14.62 - 0.3898 * temperature + 0.006969 * temperature * temperature).toFixed(2)} mg/L
          </>
        ),
        color: blowerTrip ? 'border-red-500 bg-red-950/90 text-red-200 animate-pulse' : 'border-cyan-500/60 bg-cyan-950/85 text-cyan-200'
      };
    }
    if (id === 'pfr_sag') {
      const minDO = pfrResult?.min_DO ?? 0.52;
      const isSag = minDO < 0.75;
      return {
        title: isSag ? '⚠️ PFR INLET DO-SAG ZONE' : '✓ PFR TAPERED AERATION ZONE',
        line1: `Min DO = ${minDO.toFixed(2)} mg/L at z/L = ${((pfrResult?.min_DO_z || 0.1) * 100).toFixed(0)}%`,
        line2: isSag ? 'High OUR causes hypoxia (<0.7 mg/L)' : 'Front-loaded diffusers prevent sag',
        color: isSag ? 'border-rose-500/80 bg-rose-950/90 text-rose-200' : 'border-emerald-500/60 bg-emerald-950/85 text-emerald-200'
      };
    }
    if (id === 'pfr_exit') {
      return {
        title: (
          <>
            PFR 4-PASS SERPENTINE ({pfrResult?.V?.toFixed(0)} m<sup>3</sup>)
          </>
        ),
        line1: (
          <>
            Exit S<sub>e</sub> = {pfrResult?.Se?.toFixed(1)} mg/L | L = {pfrResult?.geometry?.totalChannelLength?.toFixed(0)}m
          </>
        ),
        line2: `SVI = ${pfrResult?.svi} mL/g | HRT = ${pfrResult?.tau_hours?.toFixed(1)} h`,
        color: 'border-emerald-500/60 bg-emerald-950/85 text-emerald-200'
      };
    }
    const isCompliant = (cstrResult?.Se <= 75.5) && !blowerTrip && !cstrResult?.isWashout;
    return {
      title: 'DoE ECR SCHEDULE-10 GATE',
      line1: isCompliant ? '🟢 COMPLIANT (bCOD ≤ 75 mg/L)' : '🔴 VIOLATION: AUTO-RECIRCULATE',
      line2: `Removal: ${removalPct.toFixed(1)}% | Standard: 75 mg/L`,
      color: isCompliant ? 'border-emerald-400 bg-emerald-950/90 text-emerald-200' : 'border-red-500 bg-red-950/90 text-red-200 animate-bounce'
    };
  };

  return (
    <div className="space-y-3">
      {/* =====================================================================
          TOP 3D MULTI-PHYSICS & CRE EXPERIMENT CONTROL RIBBON
      ===================================================================== */}
      <div className="p-3 rounded-2xl bg-slate-900/95 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* 4-Mode Volumetric Heatmap Switcher (#13) */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-slate-400 font-semibold mr-1">3D Field Heatmap:</span>
          {[
            { id: 'visual', label: '1. True Dye & Sludge' },
            { id: 'substrate', label: '2. Substrate S(x,y,z)' },
            { id: 'do', label: <>3. Dissolved O<sub>2</sub> (DO Sag)</> },
            { id: 'rate', label: <>4. Reaction Rate −r<sub>S</sub></> }
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setHeatmapMode(m.id)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                heatmapMode === m.id
                  ? 'bg-terracotta text-linen font-bold shadow-md shadow-terracotta/25'
                  : 'bg-sumi text-putty border border-putty/20 hover:text-linen'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Live CRE Experiments (#7, #9, #10, #12) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setTracerState({ active: true, elapsed: 0 })}
            className="px-2.5 py-1 rounded-lg bg-workwear/50 hover:bg-workwear border border-workwear text-linen font-semibold transition"
          >
            🧪 Inject RTD Pulse Tracer
          </button>
          <button
            onClick={() => setShockState({ active: true, elapsed: 0 })}
            className="px-2.5 py-1 rounded-lg bg-oxblood/70 hover:bg-oxblood border border-oxblood text-linen font-semibold transition"
          >
            💥 Fire 2200 mg/L Dye Shock
          </button>
          <button
            onClick={onToggleAerationMode}
            className={`px-2.5 py-1 rounded-lg border font-semibold transition ${
              aerationMode === 'tapered'
                ? 'bg-pine/80 border border-pine text-linen'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {aerationMode === 'tapered' ? '✓ Tapered PFR Aeration' : '⇄ Uniform PFR Aeration'}
          </button>
          <button
            onClick={onToggleBlowerTrip}
            className={`px-2.5 py-1 rounded-lg border font-semibold transition ${
              blowerTrip
                ? 'bg-red-600 text-white border-red-400 animate-pulse'
                : 'bg-sumi border border-oxblood/50 text-oxblood hover:bg-oxblood hover:text-linen'
            }`}
          >
            {blowerTrip ? '⚡ Restart Air Blowers' : '⚠️ Simulate Blower Trip'}
          </button>
        </div>
      </div>

      {/* =====================================================================
          WATER JOURNEY FLOW TRAIN ROADMAP (INLET ➔ BIOREACTORS ➔ OUTLET)
      ===================================================================== */}
      <div className="p-2.5 rounded-2xl bg-sumi/95 border border-putty/20 flex items-center justify-between gap-2 overflow-x-auto text-xs shadow-inner">
        <div className="flex items-center gap-2 shrink-0 font-bold text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-ochre animate-ping" />
          <span className="tracking-wider uppercase text-[11px] text-ochre font-extrabold">Water Journey:</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-max text-[11px]">
          {/* Step 1: Raw Intake & EQ */}
          <button
            onClick={() => applyCameraPreset('intake')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-fig/85 hover:bg-fig border border-fig text-linen font-semibold transition"
            title="Click to view Raw Dyehouse Influent Intake & EQ Basin"
          >
            <span className="w-2 h-2 rounded-full bg-terracotta" />
            <span>1. Raw Intake & EQ</span>
            <span className="font-mono text-[9.5px] text-putty">({S0} mg/L bCOD)</span>
          </button>
          <span className="text-slate-500 font-bold">➔</span>

          {/* Step 2: Fine Bar Screen */}
          <button
            onClick={() => applyCameraPreset('screen')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-workwear/80 hover:bg-workwear border border-workwear text-linen font-semibold transition"
            title="Click to view Fine Drum Bar Screen"
          >
            <span className="w-2 h-2 rounded-full bg-celadon" />
            <span>2. Bar Screen</span>
            <span className="font-mono text-[9.5px] text-celadon">(Lint Removal)</span>
          </button>
          <span className="text-slate-500 font-bold">➔</span>

          {/* Step 3: Bioreactors */}
          <button
            onClick={() => applyCameraPreset('bioreactors')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-terracotta/80 hover:bg-terracotta border border-terracotta text-linen font-semibold transition"
            title="Click to view CSTR & PFR Biological Reaction Basins"
          >
            <span className="w-2 h-2 rounded-full bg-linen" />
            <span>3. Bioreactors</span>
            <span className="font-mono text-[9.5px] text-putty">(CSTR vs PFR)</span>
          </button>
          <span className="text-slate-500 font-bold">➔</span>

          {/* Step 4: Clarifiers & RAS */}
          <button
            onClick={() => applyCameraPreset('clarifiers')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-ochre/80 hover:bg-ochre border border-ochre text-sumi font-semibold font-semibold transition"
            title="Click to view Secondary Clarifiers & Biomass Recycle Loop"
          >
            <span className="w-2 h-2 rounded-full bg-sumi" />
            <span>4. Clarifiers & RAS</span>
            <span className="font-mono text-[9.5px] text-sumi">(R = {recycleRatio})</span>
          </button>
          <span className="text-slate-500 font-bold">➔</span>

          {/* Step 5: Tertiary Filters */}
          <button
            onClick={() => applyCameraPreset('filters')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-celadon/40 hover:bg-celadon/60 border border-celadon text-linen font-semibold transition"
            title="Click to view Tertiary Multi-Media Sand & Carbon Pressure Vessels"
          >
            <span className="w-2 h-2 rounded-full bg-workwear" />
            <span>5. Sand & Carbon</span>
            <span className="font-mono text-[9.5px] text-putty">(Trace Polish)</span>
          </button>
          <span className="text-slate-500 font-bold">➔</span>

          {/* Step 6: Final Compliant Outfall */}
          <button
            onClick={() => applyCameraPreset('outfall')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pine/90 hover:bg-pine border border-pine text-linen font-bold shadow-lg shadow-pine/25 transition"
            title="Click to view Final Treated Discharge Outfall Canal"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-celadon animate-pulse" />
            <span>6. Compliant River Outfall</span>
            <span className="font-mono text-[9.5px] text-celadon">(Sₑ ≤ {targetSe} mg/L)</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          MAIN 3D WEBGL VIEWPORT + HOLOGRAPHIC SCADA OVERLAYS
      ===================================================================== */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-700/70 shadow-2xl bg-[#060b16]">
        <div ref={mountRef} className="w-full h-[540px] cursor-grab active:cursor-grabbing" />

        {/* Critical Biomass Washout or Blower Trip Emergency Banner (#10, #11) */}
        {(cstrResult?.isWashout || blowerTrip) && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-xl bg-red-600/95 border border-red-300 text-white text-xs font-extrabold tracking-wide shadow-2xl animate-bounce z-30">
            {cstrResult?.isWashout ? (
              <>
                🚨 CRITICAL BIOMASS WASHOUT: θ<sub>c</sub> ({cstrResult?.theta_c_min?.toFixed(2)}d min) EXCEEDED — MICROBES FLUSHED OUT!
              </>
            ) : (
              <>
                🚨 EMERGENCY POWER OUTAGE: ROOT BLOWERS TRIPPED (k<sub>L</sub>a → 0) — ANOXIC HYPOXIA IN PROGRESS!
              </>
            )}
          </div>
        )}

        {/* Active Pulse Tracer / Shock Wave Status Toast */}
        {(tracerState.active || shockState.active) && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-xl bg-slate-950/90 border border-cyan-400 text-cyan-200 text-xs font-bold shadow-xl z-20">
            {tracerState.active ? (
              <>
                🧪 RTD Pulse Tracer Active (θ = {(tracerState.elapsed / 2.2).toFixed(2)}): CSTR Exponential Decay E(θ) = e<sup>−θ</sup> vs. PFR Axial Plug
              </>
            ) : (
              <>
                💥 Toxic Azo Dye Dump (2200 mg/L): CSTR Dilutes Shock Across {cstrResult?.V?.toFixed(0)} m<sup>3</sup> vs. PFR Plug Breakthrough
              </>
            )}
          </div>
        )}

        {/* Hover / tap equipment labels (compact, never block the equipment) */}
        {showComponentLabels && (() => {
          const catStyle = (c) =>
            c === 'cstr'
              ? { box: 'border-terracotta text-linen bg-sumi/90', badge: 'bg-terracotta/30 text-terracotta' }
              : c === 'pfr'
              ? { box: 'border-pine text-linen bg-sumi/90', badge: 'bg-pine/40 text-celadon' }
              : { box: 'border-workwear text-linen bg-sumi/90', badge: 'bg-workwear/30 text-putty' };
          const width = (mountRef.current && mountRef.current.clientWidth) || 900;
          const cards = [];
          if (hoverInfo && !(pinned && pinned.id === hoverInfo.id)) {
            const info = componentAnchors.find((a) => a.id === hoverInfo.id);
            if (info) {
              const st = catStyle(info.category);
              cards.push(
                <div
                  key="hover"
                  style={{ left: Math.min(hoverInfo.x + 16, width - 226), top: Math.max(hoverInfo.y - 10, 6) }}
                  className={`absolute z-20 w-52 pointer-events-none px-2 py-1.5 rounded-lg border bg-slate-950/90 backdrop-blur-sm shadow-xl text-[10px] leading-snug ${st.box}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold truncate">{info.title}</span>
                    <span className={`px-1 rounded font-mono text-[9px] shrink-0 ${st.badge}`}>{info.tag}</span>
                  </div>
                  <div className="mt-0.5 text-slate-300 text-[9.5px]">{info.role}</div>
                </div>
              );
            }
          }
          if (pinned && pinnedPos && pinnedPos.visible) {
            const info = componentAnchors.find((a) => a.id === pinned.id);
            if (info) {
              const st = catStyle(info.category);
              cards.push(
                <div
                  key="pinned"
                  style={{ left: Math.min(Math.max(pinnedPos.x, 110), width - 110), top: Math.max(pinnedPos.y - 14, 70) }}
                  className={`absolute z-30 w-52 -translate-x-1/2 -translate-y-full pointer-events-none px-2 py-1.5 rounded-lg border-2 bg-slate-950/95 shadow-2xl text-[10px] leading-snug ${st.box}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold truncate">{info.title}</span>
                    <span className={`px-1 rounded font-mono text-[9px] shrink-0 ${st.badge}`}>{info.tag}</span>
                  </div>
                  <div className="mt-0.5 text-slate-300 text-[9.5px]">{info.role}</div>
                  <div className="mt-0.5 text-[8.5px] text-slate-500">Click / tap again to dismiss</div>
                </div>
              );
            }
          }
          return (
            <>
              {cards}
              {!hoverInfo && !pinned && (
                <div className="absolute bottom-3 left-3 pointer-events-none text-[10px] text-slate-700 bg-white/60 px-2 py-1 rounded-md backdrop-blur-sm">
                  Hover or tap any equipment to see its name
                </div>
              )}
            </>
          );
        })()}

        {/* 3D Projected Holographic SCADA Callout Pins (#18) */}
        {showScadaPins &&
          pinCoords.map((pin) => {
            if (!pin.visible) return null;
            const card = getScadaCardData(pin.id);
            return (
              <div
                key={pin.id}
                style={{
                  left: `${Math.min(Math.max(pin.x, 85), 820)}px`,
                  top: `${Math.min(Math.max(pin.y, 35), 475)}px`
                }}
                className={`absolute -translate-x-1/2 -translate-y-full pointer-events-none px-2.5 py-1 rounded-lg border text-[10px] leading-tight backdrop-blur-md shadow-lg transition-all duration-75 ${card.color}`}
              >
                <div className="font-extrabold tracking-wider">{card.title}</div>
                <div className="font-mono">{card.line1}</div>
                <div className="opacity-85">{card.line2}</div>
              </div>
            );
          })}

        {/* Top-Left Heatmap Colorbar & Legend (#13) */}
        <div className="absolute top-3 left-3 p-2.5 rounded-xl bg-slate-950/85 border border-slate-800 backdrop-blur-md text-[11px] space-y-1.5 pointer-events-none">
          <div className="font-bold text-slate-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-ochre animate-ping" />
            <span>
              {heatmapMode === 'visual' && 'True Process Color (Dye → Clarified)'}
              {heatmapMode === 'substrate' && `Substrate S(x,y,z) [0 – ${S0} mg/L]`}
              {heatmapMode === 'do' && 'Dissolved Oxygen DO [0.0 – 5.0 mg/L]'}
              {heatmapMode === 'rate' && (
                <>
                  Monod Rate −r<sub>S</sub> [mg/(L·d)]
                </>
              )}
            </span>
          </div>
          <div
            className={`w-44 h-2.5 rounded-full ${
              heatmapMode === 'visual'
                ? 'bg-gradient-to-r from-purple-700 via-cyan-600 to-teal-500'
                : heatmapMode === 'substrate'
                ? 'bg-gradient-to-r from-blue-500 via-yellow-400 to-red-600'
                : heatmapMode === 'do'
                ? 'bg-gradient-to-r from-red-600 via-amber-400 to-cyan-400'
                : 'bg-gradient-to-r from-indigo-900 via-orange-500 to-yellow-300'
            }`}
          />
          <div className="flex justify-between text-[9px] font-mono text-slate-400">
            <span>{heatmapMode === 'do' ? '0.0 (Hypoxic Sag)' : 'Low / Treated'}</span>
            <span>{heatmapMode === 'do' ? '5.0+ mg/L (Aerated)' : 'High / Inlet'}</span>
          </div>
          <div className="pt-1 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Raw Dye Feed</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-workwear" /> Treated Effluent</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> RAS Sludge</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-900" /> WAS Purge</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400" /> Air Line</span>
          </div>
        </div>

        {/* Top-Right Picture-in-Picture: Single 120µm Activated Sludge Bio-Floc Reaction-Diffusion (#23) */}
        {showFlocMicroscope && (
          <div className="absolute top-3 right-3 w-64 p-3 rounded-xl bg-slate-950/90 border border-cyan-500/40 backdrop-blur-md text-[11px] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-putty">🔬 Micro-Scale Floc (120 µm)</span>
              <span className="font-mono text-[10px] text-slate-400">z/L = {sondeReading.zPct}%</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              {/* Concentric Spherical Bio-Floc Visualizer */}
              <div className="relative w-16 h-16 shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border-2 border-cyan-400">
                <div
                  style={{
                    width: `${Math.max(28, bioFlocData.anoxicCoreFraction * 0.65)}%`,
                    height: `${Math.max(28, bioFlocData.anoxicCoreFraction * 0.65)}%`
                  }}
                  className="rounded-full bg-gradient-to-tr from-purple-700 to-rose-600 border border-rose-300/70 flex items-center justify-center text-[8px] font-bold text-white text-center leading-none p-0.5"
                >
                  Anoxic Core
                </div>
              </div>
              <div className="space-y-0.5 text-[10px]">
                <div className="text-slate-300">
                  Thiele Modulus <span className="font-mono font-bold text-putty">Φ = {bioFlocData.thieleO2}</span>
                </div>
                <div className="text-slate-300">
                  Effectiveness <span className="font-mono font-bold text-celadon">η = {bioFlocData.effectivenessFactor}</span>
                </div>
                <div className="text-putty">
                  Anoxic Core: <span className="font-mono font-bold">{bioFlocData.anoxicCoreFraction}% vol</span>
                </div>
                <div className="text-[9px] text-slate-400 leading-tight">
                  Outer shell oxidizes bCOD; core cleaves <span className="font-mono">-N=N-</span> azo bonds.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom-Left Camera Presets & Cutaway Controls (#20, #21) */}
        <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-1.5 bg-slate-950/90 border border-slate-800 p-2 rounded-xl backdrop-blur-md text-[11px]">
          <span className="text-slate-400 font-semibold px-1">Camera:</span>
          {[
            { id: 'overview', label: 'Full Plant' },
            { id: 'intake', label: '⬅ Raw Intake' },
            { id: 'cstr_cutaway', label: 'CSTR Cutaway' },
            { id: 'pfr_sag', label: 'PFR DO-Sag' },
            { id: 'clarifiers', label: 'Clarifiers & RAS' },
            { id: 'filters', label: 'Sand & Carbon' },
            { id: 'outfall', label: 'River Outfall ➡' },
            { id: 'blueprint', label: 'Top Blueprint' }
          ].map((cam) => (
            <button
              key={cam.id}
              onClick={() => applyCameraPreset(cam.id)}
              className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition"
            >
              {cam.label}
            </button>
          ))}
        </div>

        {/* Bottom-Right Toggles */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 p-2 rounded-xl backdrop-blur-md text-[11px]">
          <button
            onClick={() => setCutawayMode(!cutawayMode)}
            className={`px-2.5 py-1 rounded-md font-semibold transition ${
              cutawayMode ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {cutawayMode ? '✂️ X-Ray Cutaway ON' : '✂️ Cutaway OFF'}
          </button>
          <button
            onClick={() => {
              setShowComponentLabels(!showComponentLabels);
              setHoverInfo(null);
              pinnedRef.current = null;
              setPinned(null);
            }}
            className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition ${
              showComponentLabels
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Hover the mouse over (or tap) any equipment to reveal its name"
          >
            <span>🏷️ Hover/Tap Labels: {showComponentLabels ? 'ON' : 'OFF'}</span>
          </button>

          {/* Full Industrial Plant Experience Toggle */}
          <button
            onClick={() => setShowIndustrialPlant(!showIndustrialPlant)}
            className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition ${
              showIndustrialPlant
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle surrounding industrial plant factory equipment"
          >
            <span>🏭 Industrial Plant: {showIndustrialPlant ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowScadaPins(!showScadaPins)}
            className={`px-2.5 py-1 rounded-md font-semibold transition ${
              showScadaPins ? 'bg-cyan-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 SCADA
          </button>
          <button
            onClick={() => setShowFlocMicroscope(!showFlocMicroscope)}
            className={`px-2.5 py-1 rounded-md font-semibold transition ${
              showFlocMicroscope ? 'bg-purple-700 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            🔬 Micro-Floc
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold transition"
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
        </div>
      </div>

      {/* =====================================================================
          INTERACTIVE 3D MULTIPARAMETER SONDE PROBE & CIVIL CAPEX TELEMETRY (#19, #22, #25)
      ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Draggable 3D Sonde Probe Bar (7 cols) */}
        <div className="lg:col-span-7 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-sumi flex items-center gap-1.5">
              <span>🛰️ Interactive 3D Multiparameter Sonde Probe (Slide along PFR Channel)</span>
            </span>
            <span className="font-mono font-bold text-white bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 rounded">
              Axial Coordinate z/L = {sondeReading.zPct}%
            </span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.01"
            value={probeZ}
            onChange={(e) => onChangeProbeZ && onChangeProbeZ(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer"
          />
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1 text-[11px]">
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-500">Local S(z)</div>
              <div className="font-mono font-bold text-putty">{sondeReading.S} mg/L</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-500">Local DO(z)</div>
              <div className={`font-mono font-bold ${Number(sondeReading.DO) < 0.7 ? 'text-red-400' : 'text-putty'}`}>
                {sondeReading.DO} mg/L
              </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-500">
                Rate −r<sub>S</sub>(z)
              </div>
              <div className="font-mono font-bold text-sumi">{sondeReading.rate} mg/L·d</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-500">Local OUR(z)</div>
              <div className="font-mono font-bold text-rose-300">{sondeReading.OUR} mg/L·d</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-500">
                S / (K<sub>S</sub> + S)
              </div>
              <div className="font-mono font-bold text-celadon">{sondeReading.monodSat}%</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-500">
                DO / (K<sub>O</sub> + DO)
              </div>
              <div className="font-mono font-bold text-sky-300">{sondeReading.doLim}%</div>
            </div>
          </div>
        </div>

        {/* Civil Footprint, Concrete Volume & CAPEX Comparison (#15, #25) */}
        <div className="lg:col-span-5 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between text-xs">
          <div className="font-bold text-slate-200 flex items-center justify-between">
            <span>🏗️ Civil Engineering & Mechanical Sizing</span>
            <span className="text-[10px] text-orange-300 font-normal">👷 1.75m Scale Engineer Shown</span>
          </div>
          <div className="grid grid-cols-2 gap-2 my-2 font-mono text-[11px]">
            <div className="p-2 rounded-lg bg-blue-950/30 border border-blue-800/40">
              <div className="text-blue-400 font-sans font-bold">CSTR Cylindrical Basin</div>
              <div>Dim: Ø{cstrResult?.geometry?.diameter?.toFixed(1)}m × {cstrResult?.geometry?.height?.toFixed(1)}m</div>
              <div>Concrete: {cstrResult?.geometry?.concreteM3?.toFixed(0)} m<sup>3</sup></div>
              <div>Footprint: {cstrResult?.geometry?.footprintM2?.toFixed(0)} m<sup>2</sup></div>
              <div className="text-celadon font-bold">CAPEX: ${(cstrResult?.geometry?.capexUSD / 1000).toFixed(1)}k</div>
            </div>
            <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
              <div className="text-emerald-400 font-sans font-bold">PFR 4-Pass Baffled</div>
              <div>Dim: {pfrResult?.geometry?.totalChannelLength?.toFixed(0)}m × 2.2m × 3.5m</div>
              <div>Concrete: {pfrResult?.geometry?.concreteM3?.toFixed(0)} m<sup>3</sup></div>
              <div>Footprint: {pfrResult?.geometry?.footprintM2?.toFixed(0)} m<sup>2</sup></div>
              <div className="text-sumi font-bold">CAPEX: ${(pfrResult?.geometry?.capexUSD / 1000).toFixed(1)}k</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
