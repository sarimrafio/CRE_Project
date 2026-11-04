import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
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
export default function Bioreactor3D({
  Q = 1000,
  S0 = 750,
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
  const [showScadaPins, setShowScadaPins] = useState(true); // Feature #18: 3D SCADA pins
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
    S0,
    tracerState,
    shockState
  });

  useEffect(() => {
    stateRef.current = {
      isPlaying,
      cutawayMode,
      heatmapMode,
      aerationMode,
      blowerTrip,
      probeZ,
      cstrResult,
      pfrResult,
      S0,
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
    S0,
    tracerState,
    shockState
  ]);

  // Camera Orbit State
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const cameraTargetRef = useRef(new THREE.Vector3(0, -0.5, 0));
  const cameraAngleRef = useRef({ theta: 0.42, phi: 0.38, radius: 28 });

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
  function evaluateFieldColor(mode, S_val, DO_val, rate_val, S_max = 750, tracerIntensity = 0, shockIntensity = 0) {
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
      const norm = Math.min(1, Math.max(0, S_val / Math.max(200, S_max)));
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
    // Default 'visual': True Industrial Appearance (Violet-Purple Azo Dye -> Clarified Amber-Teal)
    const dyeFrac = Math.min(1, Math.max(0, (S_val - 40) / Math.max(150, S_max - 40)));
    const cleanColor = new THREE.Color(0x0d9488); // Clarified teal-amber
    const dyeColor = new THREE.Color(0x6b21a8);   // Deep reactive azo violet
    return cleanColor.lerp(dyeColor, dyeFrac);
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
    scene.background = new THREE.Color(0x060b16);
    scene.fog = new THREE.FogExp2(0x060b16, 0.012);
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
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. MULTI-POINT INDUSTRIAL LIGHTING
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.75);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.35);
    sunLight.position.set(18, 32, 24);
    sunLight.castShadow = true;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.7);
    rimLight.position.set(-20, 12, -18);
    scene.add(rimLight);

    const underGlow = new THREE.PointLight(0x0ea5e9, 1.2, 35);
    underGlow.position.set(0, -3, 4);
    scene.add(underGlow);

    // 5. INDUSTRIAL PLANT FLOOR & SCALE GRID
    const floorGeo = new THREE.PlaneGeometry(46, 28);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x09101f,
      roughness: 0.85,
      metalness: 0.15
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -5.6;
    floor.receiveShadow = true;
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(44, 44, 0x1e3a8a, 0x0f172a);
    gridHelper.position.y = -5.58;
    scene.add(gridHelper);

    // Shared Engineering Materials
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
    const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.35 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7, metalness: 0.1 });
    const motorMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.3 });
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
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.32,
      roughness: 0.15,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    const cstrWall = new THREE.Mesh(wallGeo, wallMat);
    cstrGroup.add(cstrWall);
    cstrWallRef.current = cstrWall;

    // Top & Bottom Structural Steel Flanges
    const flangeGeo = new THREE.TorusGeometry(3.32, 0.12, 16, 48);
    const topFlange = new THREE.Mesh(flangeGeo, steelMat);
    topFlange.rotation.x = Math.PI / 2;
    topFlange.position.y = 3.3;
    cstrGroup.add(topFlange);

    const botFlange = topFlange.clone();
    botFlange.position.y = -3.3;
    cstrGroup.add(botFlange);

    // 4 Internal Anti-Swirl Wall Baffles (Feature #4)
    const baffleGeo = new THREE.BoxGeometry(0.35, 6.2, 0.08);
    for (let i = 0; i < 4; i++) {
      const bAngle = (i * Math.PI) / 2;
      const baffle = new THREE.Mesh(baffleGeo, darkSteelMat);
      baffle.rotation.y = -bAngle;
      baffle.position.set(Math.cos(bAngle) * 3.08, 0, Math.sin(bAngle) * 3.08);
      cstrGroup.add(baffle);
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
    cstrGroup.add(cstrLiquid);
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
    cstrGroup.add(cstrFoam);
    cstrFoamRef.current = cstrFoam;

    // Top Bridge Truss & Electric Gearbox Motor (Feature #4)
    const bridgeGeo = new THREE.BoxGeometry(7.0, 0.22, 0.65);
    const bridge = new THREE.Mesh(bridgeGeo, steelMat);
    bridge.position.y = 3.5;
    cstrGroup.add(bridge);

    const motorBody = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 1.2, 20), motorMat);
    motorBody.position.y = 4.2;
    cstrGroup.add(motorBody);

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
    cstrGroup.add(impellerGroup);
    impellerRef.current = impellerGroup;

    // Bottom Fine-Bubble EPDM Membrane Diffuser Grid (Feature #3)
    const diffuserRing = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.08, 12, 32), airPipeMat);
    diffuserRing.rotation.x = Math.PI / 2;
    diffuserRing.position.y = -3.05;
    cstrGroup.add(diffuserRing);

    const podGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 16);
    const podMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    for (let p = 0; p < 12; p++) {
      const ang = (p * Math.PI) / 6;
      const pod = new THREE.Mesh(podGeo, podMat);
      pod.position.set(Math.cos(ang) * 1.9, -3.0, Math.sin(ang) * 1.9);
      cstrGroup.add(pod);
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
      cstrGroup.add(bMesh);
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
      cstrGroup.add(fMesh);
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
      pfrGroup.add(baffleWall);
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
        pfrGroup.add(zoneMesh);
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
      pfrGroup.add(bMesh);
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
      pfrGroup.add(fMesh);
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
    pfrGroup.add(probeGroup);
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

    // Animated Pipeline Flow Particle System (Feature #2)
    // 1. Raw Influent Header (Purple particles flowing into CSTR and PFR)
    // 2. RAS Return Sludge Loop (Amber biomass particles returning from clarifiers)
    // 3. Compressed Air Header (Cyan air packets from Root Blower to both tanks)
    const pipeParticles = [];
    const pSphereGeo = new THREE.SphereGeometry(0.11, 10, 10);

    // Influent feed line particles
    const infMat = new THREE.MeshBasicMaterial({ color: 0xc084fc });
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(pSphereGeo, infMat);
      scene.add(m);
      pipeParticles.push({
        mesh: m,
        type: 'influent',
        progress: i / 24,
        branch: i % 2 === 0 ? 'cstr' : 'pfr'
      });
    }

    // RAS recycle loop particles
    const rasMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    for (let i = 0; i < 20; i++) {
      const m = new THREE.Mesh(pSphereGeo, rasMat);
      scene.add(m);
      pipeParticles.push({
        mesh: m,
        type: 'ras',
        progress: i / 20,
        branch: i % 2 === 0 ? 'cstr' : 'pfr'
      });
    }

    // Air manifold particles
    const airMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(pSphereGeo, airMat);
      scene.add(m);
      pipeParticles.push({
        mesh: m,
        type: 'air',
        progress: i / 24,
        branch: i % 2 === 0 ? 'cstr' : 'pfr'
      });
    }
    pipeParticlesRef.current = pipeParticles;

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
    // E. MOUSE ORBIT & ZOOM INTERACTION
    // =========================================================================
    const onMouseDown = (e) => {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      cameraAngleRef.current.theta -= dx * 0.007;
      cameraAngleRef.current.phi = Math.max(0.08, Math.min(Math.PI / 2 - 0.04, cameraAngleRef.current.phi + dy * 0.007));
      updateCameraPosition();
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

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
    let frameCounter = 0;

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = Math.min(0.1, clock.getDelta());
      const elapsed = clock.getElapsedTime();
      const st = stateRef.current;

      // 1. Update CSTR Liquid Color & Cutaway Wall
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
            shockCstr
          )
        );
      }

      // 2. Update 16 PFR Axial Spatial Zones with True Profile Colors
      if (pfrZonesRef.current.length > 0 && st.pfrResult?.profiles) {
        const prof = st.pfrResult.profiles;
        const nProf = prof.S.length;

        pfrZonesRef.current.forEach((zObj) => {
          const pIdx = Math.min(nProf - 1, Math.max(0, Math.round(zObj.fracZ * (nProf - 1))));
          const localS = prof.S[pIdx];
          const localDO = prof.DO[pIdx];
          const localRate = prof.reaction_rate[pIdx];

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
              shockPfr
            )
          );
        });
      }

      // 3. Position 3D Multiparameter Sonde Probe along Serpentine PFR (Feature #19)
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

      // 4. Update Clarifier Sludge Blankets & Surface Foam & Compliance Beacon
      if (cstrBlanketRef.current && st.cstrResult?.recycle) {
        const scaleH = Math.max(0.3, st.cstrResult.recycle.blanketPct / 35);
        cstrBlanketRef.current.scale.y = scaleH;
      }
      if (cstrFoamRef.current && st.cstrResult?.geometry) {
        cstrFoamRef.current.scale.y = Math.max(0.2, st.cstrResult.geometry.foamThicknessPct / 35);
      }
      if (complianceBeaconRef.current && st.cstrResult) {
        const isCompliant = st.cstrResult.Se <= 75.5 && !st.blowerTrip && !st.cstrResult.isWashout;
        complianceBeaconRef.current.material.color.setHex(isCompliant ? 0x10b981 : 0xef4444);
      }

      // 5. Mechanical Rotation & Multi-Phase Particle Kinematics
      if (st.isPlaying) {
        if (impellerRef.current) {
          impellerRef.current.rotation.y += delta * 5.2;
        }
        if (blowerFanRef.current && !st.blowerTrip) {
          blowerFanRef.current.rotation.z += delta * 12.0;
        }
        if (cstrRakeRef.current) cstrRakeRef.current.rotation.y += delta * 0.45;
        if (pfrRakeRef.current) pfrRakeRef.current.rotation.y += delta * 0.45;

        // CSTR Bubbles (Pause if Blower Trip is active!)
        bubblesRef.current.forEach((b) => {
          b.mesh.visible = !st.blowerTrip;
          if (!st.blowerTrip) {
            b.mesh.position.y += b.speedY;
            b.angle += 0.02;
            b.mesh.position.x = b.radius * Math.cos(b.angle);
            b.mesh.position.z = b.radius * Math.sin(b.angle);
            if (b.mesh.position.y > 2.4) {
              b.mesh.position.y = -3.0;
            }
          }
        });

        // CSTR Biomass Flocs (Toroidal Vortex Swirl)
        const washoutScale = st.cstrResult?.isWashout ? 0.15 : 1.0;
        flocsRef.current.forEach((f, idx) => {
          f.mesh.visible = (idx / flocsRef.current.length) <= washoutScale;
          f.theta += f.speedTheta;
          f.mesh.position.x = f.r * Math.cos(f.theta);
          f.mesh.position.z = f.r * Math.sin(f.theta);
          f.mesh.position.y = -0.4 + Math.sin(elapsed * 2.2 + idx) * 2.1;
        });

        // PFR Bubbles (Tapered vs Uniform density!)
        pfrBubblesRef.current.forEach((b) => {
          if (st.blowerTrip) {
            b.mesh.visible = false;
            return;
          }
          // In tapered mode, front half has 100% bubble visibility, tail has sparser bubbles
          b.mesh.visible = st.aerationMode === 'tapered' ? (b.fracZ < 0.55 || Math.random() > 0.25) : true;
          const speedBoost = st.aerationMode === 'tapered' && b.fracZ < 0.35 ? 1.45 : 1.0;
          b.mesh.position.y += b.speedY * speedBoost;
          b.mesh.position.x += b.speedX;
          if (b.mesh.position.y > 0.2 || b.mesh.position.x < b.minX || b.mesh.position.x > b.maxX) {
            b.mesh.position.y = -2.2;
            b.mesh.position.x = b.speedX > 0 ? b.minX : b.maxX;
          }
        });

        // PFR Biomass Flocs
        pfrFlocsRef.current.forEach((f) => {
          f.mesh.position.x += f.speedX;
          if (f.mesh.position.x < f.minX || f.mesh.position.x > f.maxX) {
            f.mesh.position.x = f.speedX > 0 ? f.minX : f.maxX;
          }
        });

        // Animated Pipeline Streamline Chevrons/Packets (Feature #2)
        pipeParticlesRef.current.forEach((pp) => {
          pp.progress = (pp.progress + delta * 0.42) % 1.0;
          const p = pp.progress;
          if (pp.type === 'influent') {
            if (pp.branch === 'cstr') {
              pp.mesh.position.set(-13.5 + p * 5.2, 3.2, 0);
            } else {
              pp.mesh.position.set(-13.5 + p * 17.0, 3.2 - p * 3.0, -2.3);
            }
          } else if (pp.type === 'ras') {
            if (pp.branch === 'cstr') {
              pp.mesh.position.set(-7.5 - p * 3.2, -4.4 + p * 6.5, 4.2 - p * 4.2);
            } else {
              pp.mesh.position.set(9.4 - p * 5.8, -4.4 + p * 4.0, 4.3 - p * 6.6);
            }
          } else if (pp.type === 'air') {
            pp.mesh.visible = !st.blowerTrip;
            if (pp.branch === 'cstr') {
              pp.mesh.position.set(-p * 7.5, -4.2 + p * 1.1, 4.6 - p * 4.6);
            } else {
              pp.mesh.position.set(p * 7.2, -4.2 + p * 1.9, 4.6 - p * 4.6);
            }
          }
        });
      }

      renderer.render(scene, camera);

      // Project 3D SCADA Anchor Coordinates to 2D Screen Overlay every 4 frames
      frameCounter++;
      if (frameCounter % 4 === 0 && mountRef.current) {
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        const projected = scadaAnchors.map((anc) => {
          const v = anc.pos.clone().project(camera);
          return {
            id: anc.id,
            x: (v.x * 0.5 + 0.5) * w,
            y: (-(v.y * 0.5) + 0.5) * h,
            visible: v.z < 1.0
          };
        });
        setPinCoords(projected);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
      mount.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      mount.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current?.domElement) {
        rendererRef.current.domElement.remove();
      }
    };
  }, [scadaAnchors]);

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
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
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
            className="px-2.5 py-1 rounded-lg bg-teal-600/30 hover:bg-teal-600/50 border border-teal-400/50 text-teal-200 font-semibold transition"
          >
            🧪 Inject RTD Pulse Tracer
          </button>
          <button
            onClick={() => setShockState({ active: true, elapsed: 0 })}
            className="px-2.5 py-1 rounded-lg bg-fuchsia-600/30 hover:bg-fuchsia-600/50 border border-fuchsia-400/50 text-fuchsia-200 font-semibold transition"
          >
            💥 Fire 2200 mg/L Dye Shock
          </button>
          <button
            onClick={onToggleAerationMode}
            className={`px-2.5 py-1 rounded-lg border font-semibold transition ${
              aerationMode === 'tapered'
                ? 'bg-emerald-600/40 border-emerald-400 text-emerald-200'
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
                : 'bg-slate-800 border-slate-700 text-rose-300 hover:bg-slate-700'
            }`}
          >
            {blowerTrip ? '⚡ Restart Air Blowers' : '⚠️ Simulate Blower Trip'}
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
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
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
          <div className="pt-1 border-t border-slate-800/80 flex items-center gap-2 text-[10px] text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-purple-400" /> Influent
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400" /> RAS Loop
            <span className="inline-block w-2 h-2 rounded-full bg-sky-400" /> Air Line
          </div>
        </div>

        {/* Top-Right Picture-in-Picture: Single 120µm Activated Sludge Bio-Floc Reaction-Diffusion (#23) */}
        {showFlocMicroscope && (
          <div className="absolute top-3 right-3 w-64 p-3 rounded-xl bg-slate-950/90 border border-cyan-500/40 backdrop-blur-md text-[11px] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-cyan-300">🔬 Micro-Scale Floc (120 µm)</span>
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
                  Thiele Modulus <span className="font-mono font-bold text-cyan-300">Φ = {bioFlocData.thieleO2}</span>
                </div>
                <div className="text-slate-300">
                  Effectiveness <span className="font-mono font-bold text-emerald-300">η = {bioFlocData.effectivenessFactor}</span>
                </div>
                <div className="text-purple-300">
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
            { id: 'cstr_cutaway', label: 'CSTR Cutaway' },
            { id: 'pfr_sag', label: 'PFR DO-Sag' },
            { id: 'clarifiers', label: 'Clarifiers & RAS' },
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
            onClick={() => setShowScadaPins(!showScadaPins)}
            className={`px-2.5 py-1 rounded-md font-semibold transition ${
              showScadaPins ? 'bg-cyan-700 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            📌 SCADA Tags
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
            <span className="font-bold text-amber-300 flex items-center gap-1.5">
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
              <div className="font-mono font-bold text-purple-300">{sondeReading.S} mg/L</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-500">Local DO(z)</div>
              <div className={`font-mono font-bold ${Number(sondeReading.DO) < 0.7 ? 'text-red-400' : 'text-cyan-300'}`}>
                {sondeReading.DO} mg/L
              </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-500">
                Rate −r<sub>S</sub>(z)
              </div>
              <div className="font-mono font-bold text-amber-300">{sondeReading.rate} mg/L·d</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-500">Local OUR(z)</div>
              <div className="font-mono font-bold text-rose-300">{sondeReading.OUR} mg/L·d</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-500">
                S / (K<sub>S</sub> + S)
              </div>
              <div className="font-mono font-bold text-emerald-300">{sondeReading.monodSat}%</div>
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
              <div className="text-emerald-300 font-bold">CAPEX: ${(cstrResult?.geometry?.capexUSD / 1000).toFixed(1)}k</div>
            </div>
            <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
              <div className="text-emerald-400 font-sans font-bold">PFR 4-Pass Baffled</div>
              <div>Dim: {pfrResult?.geometry?.totalChannelLength?.toFixed(0)}m × 2.2m × 3.5m</div>
              <div>Concrete: {pfrResult?.geometry?.concreteM3?.toFixed(0)} m<sup>3</sup></div>
              <div>Footprint: {pfrResult?.geometry?.footprintM2?.toFixed(0)} m<sup>2</sup></div>
              <div className="text-amber-300 font-bold">CAPEX: ${(pfrResult?.geometry?.capexUSD / 1000).toFixed(1)}k</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
