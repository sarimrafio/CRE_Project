P = r"C:\Users\Sarim Sadman Rafio\.gemini\antigravity\scratch\textile_wastewater_cre_project\frontend\src\components\Bioreactor3D.jsx"
s = open(P, encoding="utf-8").read().replace("\r\n", "\n")


def rep(old, new):
    global s
    assert s.count(old) == 1, f"anchor count {s.count(old)} for: {old[:70]!r}"
    s = s.replace(old, new, 1)


def cut(start, end, new):
    """replace text from start marker up to (not including) end marker"""
    global s
    a = s.index(start)
    b = s.index(end, a)
    s = s[:a] + new + s[b:]


# ---------------------------------------------------------------- imports
rep("import * as THREE from 'three';\n",
    "import * as THREE from 'three';\n"
    "import { Sky } from 'three/examples/jsm/objects/Sky.js';\n"
    "import { buildTextureKit, pbr, makeChainLinkTexture } from './proceduralTextures';\n")

# ---------------------------------------------------------------- state
rep("  const [componentFilter, setComponentFilter] = useState('all'); // 'all' | 'cstr' | 'pfr' | 'aux'\n", "")
rep("  const [componentPinCoords, setComponentPinCoords] = useState([]);",
    "  const [hoverInfo, setHoverInfo] = useState(null); // {id, x, y} equipment under cursor\n"
    "  const [pinned, setPinned] = useState(null); // {id} equipment selected by click / tap\n"
    "  const [pinnedPos, setPinnedPos] = useState(null); // projected screen coords of pinned point\n"
    "  const pinnedRef = useRef(null);")
rep("      componentFilter,\n", "")

# extra info entry for the safety station
rep("    {\n      id: 'pipe_rack',",
    "    {\n      id: 'safety_station',\n      pos: new THREE.Vector3(-12.5, -3.0, 4.8),\n      tag: 'SAF-001',\n"
    "      title: 'Emergency Eyewash & Drench Shower',\n"
    "      role: 'ANSI Z358.1 safety station for chemical splash exposure, 15-minute flushing',\n"
    "      category: 'aux'\n    },\n    {\n      id: 'pipe_rack',")

# ---------------------------------------------------------------- scene / sky / fog
rep("    scene.background = new THREE.Color(0x060b16);\n    scene.fog = new THREE.FogExp2(0x060b16, 0.012);",
    "    scene.background = new THREE.Color(0xb7cde0);\n    scene.fog = new THREE.FogExp2(0xb7cde0, 0.0062);")

# ---------------------------------------------------------------- renderer + env
rep("    mount.appendChild(renderer.domElement);\n    rendererRef.current = renderer;\n",
    """    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
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
""")

# ---------------------------------------------------------------- lights
cut("    // 4. MULTI-POINT INDUSTRIAL LIGHTING\n", "    // 5. INDUSTRIAL PLANT FLOOR",
"""    // 4. DAYLIGHT: warm sun key + sky hemisphere fill, high-res soft shadows
    const hemiLight = new THREE.HemisphereLight(0xcfe3ff, 0x6b6558, 0.55);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff1dc, 3.0);
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

""")

# ---------------------------------------------------------------- ground
cut("    // 5. INDUSTRIAL PLANT FLOOR & SCALE GRID\n", "    // Shared Engineering Materials\n",
"""    // 5. REALISTIC GROUND: grass terrain -> asphalt apron -> reinforced concrete slab
    const grassMat = pbr(kit.grass, { color: 0xffffff, roughness: 1, metalness: 0 }, 220, 220);
    grassMat.polygonOffset = true;
    grassMat.polygonOffsetFactor = 2;
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(1300, 1300), grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -5.7;
    grass.receiveShadow = true;
    scene.add(grass);

    const slabMat = pbr(kit.concrete, { color: 0xffffff, roughness: 1, metalness: 0 }, 46 / 5, 28 / 5);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(46, 28), slabMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -5.6;
    floor.receiveShadow = true;
    scene.add(floor);

""")

rep("    const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });\n"
    "    const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.35 });\n"
    "    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7, metalness: 0.1 });\n"
    "    const motorMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.3 });",
    "    const steelMat = pbr(kit.steel, { color: 0xa5a9b0, metalness: 1.0, roughness: 1.0 }, 2, 2);\n"
    "    const darkSteelMat = pbr(kit.steel, { color: 0x5d636c, metalness: 1.0, roughness: 1.6 }, 2, 2);\n"
    "    const concreteMat = pbr(kit.concrete, { color: 0xffffff, roughness: 1, metalness: 0 }, 2, 1);\n"
    "    const motorMat = pbr(kit.paint, { color: 0x0f6fb5, metalness: 0.35, roughness: 1.0 }, 2, 2);")

# ---------------------------------------------------------------- glass shell (no transmission so inner fluid stays visible)
import re
m = re.search(r"    const wallMat = new THREE\.MeshPhysicalMaterial\(\{.*?\n    \}\);\n", s, re.S)
assert m
s = s.replace(m.group(0),
"""    const wallMat = new THREE.MeshPhysicalMaterial({
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
""", 1)

# ---------------------------------------------------------------- industrial plant materials
rep("const yellowSafetyMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.1 });",
    "const yellowSafetyMat = pbr(kit.paint, { color: 0xf2c200, roughness: 1.0, metalness: 0.1 }, 2, 2);")
rep("const industrialBlueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35, metalness: 0.6 });",
    "const industrialBlueMat = pbr(kit.paint, { color: 0x1e4fb8, roughness: 1.0, metalness: 0.45 }, 2, 2);")
rep("const galvanizedMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.45, metalness: 0.85 });",
    "const galvanizedMat = pbr(kit.steel, { color: 0xc3c8ce, roughness: 1.5, metalness: 1.0 }, 2, 2);")
rep("    const extendedFloorGeo = new THREE.PlaneGeometry(74, 52);\n"
    "    const extendedFloorMat = new THREE.MeshStandardMaterial({ color: 0x080e1a, roughness: 0.9, metalness: 0.1 });",
    "    const extendedFloorGeo = new THREE.PlaneGeometry(74, 52);\n"
    "    const extendedFloorMat = pbr(kit.asphalt, { color: 0xffffff, roughness: 1, metalness: 0 }, 74 / 3, 52 / 3);\n"
    "    extendedFloorMat.polygonOffset = true;\n    extendedFloorMat.polygonOffsetFactor = 1;")

# ---------------------------------------------------------------- tagging + realism props + pointer picking
tag_block = """    // =========================================================================
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

"""
rep("    // =========================================================================\n    // E. MOUSE ORBIT",
    tag_block + "    // =========================================================================\n    // E. MOUSE ORBIT")

# ---------------------------------------------------------------- mouse handlers
cut("    const onMouseDown = (e) => {", "    const onWheel = (e) => {",
"""    const downPos = { x: 0, y: 0 };
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

""")
rep("      mount.removeEventListener('wheel', onWheel);\n",
    "      mount.removeEventListener('wheel', onWheel);\n"
    "      mount.removeEventListener('touchstart', onTouchStart);\n"
    "      mount.removeEventListener('touchmove', onTouchMove);\n"
    "      mount.removeEventListener('touchend', onTouchEnd);\n")

# ---------------------------------------------------------------- projection of pinned point (replaces always-on labels)
a = s.index("        if (stateRef.current.showComponentLabels) {")
endmark = "          setComponentPinCoords(projectedComponents);\n        }\n"
b = s.index(endmark, a) + len(endmark)
s = s[:a] + """        if (pinnedRef.current) {
          const v = pinnedRef.current.point.clone().project(camera);
          pinMarker.visible = true;
          pinMarker.position.copy(pinnedRef.current.point);
          pinMarker.scale.setScalar(1 + 0.3 * Math.sin(performance.now() * 0.006));
          setPinnedPos({ x: (v.x * 0.5 + 0.5) * w, y: (-(v.y * 0.5) + 0.5) * h, visible: v.z < 1.0 });
        } else {
          pinMarker.visible = false;
        }
""" + s[b:]

# ---------------------------------------------------------------- shadow casting pass
rep("    let frameCounter = 0;\n", """    scene.traverse((o) => {
      if (o.isMesh && o.material && !o.material.transparent && !o.material.isShaderMaterial && !o.material.isMeshBasicMaterial) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });

    let frameCounter = 0;
""")

# ---------------------------------------------------------------- overlay JSX
cut("        {/* Interactive Equipment Component Name Labels & Technical Inspection Badges */}",
    "        {/* 3D Projected Holographic SCADA Callout Pins (#18) */}",
"""        {/* Hover / tap equipment labels (compact, never block the equipment) */}
        {showComponentLabels && (() => {
          const catStyle = (c) =>
            c === 'cstr'
              ? { box: 'border-amber-400/70 text-amber-100', badge: 'bg-amber-500/25 text-amber-200' }
              : c === 'pfr'
              ? { box: 'border-purple-400/70 text-purple-100', badge: 'bg-purple-500/25 text-purple-200' }
              : { box: 'border-cyan-400/70 text-cyan-100', badge: 'bg-cyan-500/25 text-cyan-200' };
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

""")

# ---------------------------------------------------------------- toolbar
cut("          {/* Component Labels Toggle & Sub-Category Selector */}",
    "          {/* Full Industrial Plant Experience Toggle */}",
"""          <button
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

""")

open(P, "w", encoding="utf-8", newline="\n").write(s)
print("patched OK")
