import sys
import re

FILE_PATH = r"C:\Users\Sarim Sadman Rafio\.gemini\antigravity\scratch\textile_wastewater_cre_project\frontend\src\components\Bioreactor3D.jsx"

with open(FILE_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add states for component labels and industrial plant
state_target = "  const [showScadaPins, setShowScadaPins] = useState(true); // Feature #18: 3D SCADA pins"
state_replacement = """  const [showScadaPins, setShowScadaPins] = useState(false); // Feature #18: 3D SCADA pins (default false so component labels shine)
  const [showComponentLabels, setShowComponentLabels] = useState(true); // Equipment Component Labels
  const [componentFilter, setComponentFilter] = useState('all'); // 'all' | 'cstr' | 'pfr' | 'aux'
  const [showIndustrialPlant, setShowIndustrialPlant] = useState(true); // Full Industrial ETP Plant Experience
  const [componentPinCoords, setComponentPinCoords] = useState([]);"""

assert state_target in content, "Could not find state_target"
content = content.replace(state_target, state_replacement, 1)

# 2. Add ref for industrialPlantRef
ref_target = "  const cstrVesselRef = useRef(null);"
ref_replacement = """  const industrialPlantRef = useRef(null);
  const cstrVesselRef = useRef(null);"""

assert ref_target in content, "Could not find ref_target"
content = content.replace(ref_target, ref_replacement, 1)

# 3. Add componentAnchors list
anchors_target = "  // 3D Anchor Points for Holographic SCADA Labels (Feature #18)"
anchors_addition = """  // Comprehensive Industrial Equipment Component Callouts (26 Major Process Units & Parts)
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
      id: 'pipe_rack',
      pos: new THREE.Vector3(0, 5.0, -4.5),
      tag: 'PBR-001',
      title: 'Overhead Industrial Pipe Bridge Rack',
      role: 'Heavy steel truss routing air, raw dye influent, steam, and treated utility lines',
      category: 'aux'
    }
  ], []);

"""

assert anchors_target in content, "Could not find anchors_target"
content = content.replace(anchors_target, anchors_addition + anchors_target, 1)

# 4. Add projection logic for componentPinCoords in animate()
proj_target = """      // Project 3D SCADA Anchor Coordinates to 2D Screen Overlay every 4 frames
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
      }"""

proj_replacement = """      // Project 3D SCADA and Equipment Component Coordinates to 2D Screen Overlay every 4 frames
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

        if (stateRef.current.showComponentLabels) {
          const filter = stateRef.current.componentFilter;
          const filtered = componentAnchors.filter(
            (anc) => filter === 'all' || anc.category === filter
          );
          const projectedComponents = filtered.map((anc) => {
            const v = anc.pos.clone().project(camera);
            return {
              id: anc.id,
              tag: anc.tag,
              title: anc.title,
              role: anc.role,
              category: anc.category,
              x: (v.x * 0.5 + 0.5) * w,
              y: (-(v.y * 0.5) + 0.5) * h,
              visible: v.z < 1.0
            };
          });
          setComponentPinCoords(projectedComponents);
        }
      }"""

assert proj_target in content, "Could not find proj_target"
content = content.replace(proj_target, proj_replacement, 1)

# 5. Keep stateRef in sync with showComponentLabels, componentFilter, showIndustrialPlant, showScadaPins
sync_target = "    stateRef.current = {\n      isPlaying,\n      cutawayMode,"
sync_replacement = """    stateRef.current = {
      showComponentLabels,
      componentFilter,
      showIndustrialPlant,
      showScadaPins,
      isPlaying,
      cutawayMode,"""
assert sync_target in content, "Could not find sync_target"
content = content.replace(sync_target, sync_replacement, 1)

# 6. Add useEffect to toggle industrialPlantRef.current.visible
vis_target = "  // Cutaway Wall Geometry Update (Feature #20)"
vis_addition = """  // Toggle Industrial Plant Environment Visibility
  useEffect(() => {
    if (industrialPlantRef.current) {
      industrialPlantRef.current.visible = showIndustrialPlant;
    }
  }, [showIndustrialPlant]);

"""
assert vis_target in content, "Could not find vis_target"
content = content.replace(vis_target, vis_addition + vis_target, 1)

# 7. Add Industrial Plant 3D Meshes before engineerGroup
plant_target = "    // =========================================================================\n    // D. HUMAN-SCALE ENGINEER FIGURE (1.75m Tall Reference) (Feature #25)"
plant_code = """    // =========================================================================
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
    const yellowSafetyMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.1 });
    const safetyStripesMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.5, metalness: 0.2 });
    const industrialBlueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35, metalness: 0.6 });
    const fiberglassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, transparent: true, opacity: 0.75, roughness: 0.3 });
    const chemOrangeMat = new THREE.MeshStandardMaterial({ color: 0xea580c, transparent: true, opacity: 0.8, roughness: 0.3 });
    const chemAmberMat = new THREE.MeshStandardMaterial({ color: 0xd97706, transparent: true, opacity: 0.8, roughness: 0.3 });
    const galvanizedMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.45, metalness: 0.85 });
    const sludgeCakeMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.95 });

    // 1. EXTENDED PLANT FOUNDATION SLAB & YELLOW SAFETY WALKWAY DEMARCATIONS
    const extendedFloorGeo = new THREE.PlaneGeometry(74, 52);
    const extendedFloorMat = new THREE.MeshStandardMaterial({ color: 0x080e1a, roughness: 0.9, metalness: 0.1 });
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

    // Downward dropper pipes to CSTR and PFR from the overhead rack
    const cstrDropper = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 4.2, 12), airPipeMat);
    cstrDropper.position.set(-7.5, 3.2, -2.4);
    cstrDropper.rotation.x = Math.PI / 6;
    industrialPlant.add(cstrDropper);

    const pfrDropper = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 4.2, 12), airPipeMat);
    pfrDropper.position.set(7.2, 3.2, -2.4);
    pfrDropper.rotation.x = Math.PI / 6;
    industrialPlant.add(pfrDropper);

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

"""

assert plant_target in content, "Could not find plant_target"
content = content.replace(plant_target, plant_code + plant_target, 1)

# 8. Add Component Labels UI Overlay and Control Switches in JSX return
overlay_target = "        {/* 3D Projected Holographic SCADA Callout Pins (#18) */}"
overlay_code = """        {/* Interactive Equipment Component Name Labels & Technical Inspection Badges */}
        {showComponentLabels && (
          <div className="pointer-events-none">
            {componentPinCoords.map((pin) => {
              if (!pin.visible) return null;
              const isCstr = pin.category === 'cstr';
              const isPfr = pin.category === 'pfr';
              const borderClass = isCstr
                ? 'border-amber-500/80 bg-slate-950/90 text-amber-200'
                : isPfr
                ? 'border-purple-500/80 bg-slate-950/90 text-purple-200'
                : 'border-cyan-500/80 bg-slate-950/90 text-cyan-200';
              const badgeClass = isCstr
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                : isPfr
                ? 'bg-purple-500/20 text-purple-300 border-purple-400/40'
                : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40';

              return (
                <div
                  key={pin.id}
                  style={{
                    left: `${Math.min(Math.max(pin.x, 110), 820)}px`,
                    top: `${Math.min(Math.max(pin.y, 40), 470)}px`
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-full px-2.5 py-1.5 rounded-xl border text-[10px] leading-tight backdrop-blur-md shadow-2xl transition-all duration-75 max-w-[210px] ${borderClass}`}
                >
                  <div className="flex items-center justify-between gap-1.5 pb-0.5 border-b border-slate-800">
                    <span className="font-extrabold tracking-wide uppercase truncate">{pin.title}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border shrink-0 ${badgeClass}`}>
                      {pin.tag}
                    </span>
                  </div>
                  <div className="pt-1 text-[9.5px] text-slate-300 leading-snug">
                    {pin.role}
                  </div>
                </div>
              );
            })}
          </div>
        )}

"""

assert overlay_target in content, "Could not find overlay_target"
content = content.replace(overlay_target, overlay_code + overlay_target, 1)

# 9. Add Component Filter and Switches in bottom toolbar
toolbar_target = """          <button
            onClick={() => setShowScadaPins(!showScadaPins)}
            className={`px-2.5 py-1 rounded-md font-semibold transition ${
              showScadaPins ? 'bg-cyan-700 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            📌 SCADA Tags
          </button>"""

toolbar_replacement = """          {/* Component Labels Toggle & Sub-Category Selector */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setShowComponentLabels(!showComponentLabels)}
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition ${
                showComponentLabels
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Component Names & Part Tags"
            >
              <span>🏷️ Equipment Labels: {showComponentLabels ? 'ON' : 'OFF'}</span>
            </button>
            {showComponentLabels && (
              <div className="flex items-center gap-0.5 pl-1 border-l border-slate-800 text-[10px]">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'cstr', label: 'CSTR' },
                  { id: 'pfr', label: 'PFR' },
                  { id: 'aux', label: 'Aux Plant' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setComponentFilter(f.id)}
                    className={`px-2 py-0.5 rounded font-semibold transition ${
                      componentFilter === f.id
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

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
          </button>"""

assert toolbar_target in content, "Could not find toolbar_target"
content = content.replace(toolbar_target, toolbar_replacement, 1)

with open(FILE_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS: Industrial plant environment and component labels successfully patched into Bioreactor3D.jsx!")
