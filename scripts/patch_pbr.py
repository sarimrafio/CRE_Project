import re
P = r"C:\Users\Sarim Sadman Rafio\.gemini\antigravity\scratch\textile_wastewater_cre_project\frontend\src\components\Bioreactor3D.jsx"
s = open(P, encoding="utf-8", newline="").read().replace("\r\n", "\n")


def rep(old, new, count=1):
    global s
    assert s.count(old) >= 1, "missing anchor: " + old[:60]
    s = s.replace(old, new, count)


# 1. imports
rep("import * as THREE from 'three';\n",
    "import * as THREE from 'three';\nimport { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';\n")

# helper: procedural brushed 316L maps (module scope, before component)
helper = r'''
// ---------------------------------------------------------------------------
// PBR TEXTURE PROTOCOL: Procedural brushed Stainless Steel 316L maps
// (roughness 0.22 base -> 0.35 in friction zones, tangent-space micro-brushed
// normal map with horizontal circumferential grain). Raise to 4096 for 4K.
// ---------------------------------------------------------------------------
const STEEL_TEX_SIZE = 2048;
function makeBrushedSteelMaps(renderer) {
  const size = STEEL_TEX_SIZE;
  const rough = new Uint8ClampedArray(size * size * 4);
  const normal = new Uint8ClampedArray(size * size * 4);
  // Per-row grain heights (grain lines run along U = circumference)
  const h = new Float32Array(size + 2);
  let acc = 0;
  for (let y = 0; y < size + 2; y++) {
    acc = acc * 0.55 + (Math.random() - 0.5);
    h[y] = acc;
  }
  for (let y = 0; y < size; y++) {
    const dh = (h[(y + 2) % (size + 2)] - h[y]) * 0.9;
    // friction zone band: roughness drifts 0.22 -> 0.35 across v
    const band = 0.22 + 0.13 * (0.5 + 0.5 * Math.sin((y / size) * Math.PI * 6)) * (0.6 + 0.4 * Math.random());
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const micro = (Math.random() - 0.5) * 0.05;
      const r = Math.min(1, Math.max(0, band + micro + (Math.random() < 0.0015 ? 0.1 : 0)));
      rough[i] = rough[i + 1] = rough[i + 2] = 255 * r;
      rough[i + 3] = 255;
      const nx = (Math.random() - 0.5) * 0.04;
      const ny = dh * 0.35 + (Math.random() - 0.5) * 0.04;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      normal[i] = (nx * 0.5 + 0.5) * 255;
      normal[i + 1] = (ny * 0.5 + 0.5) * 255;
      normal[i + 2] = (nz * 0.5 + 0.5) * 255;
      normal[i + 3] = 255;
    }
  }
  const mk = (data) => {
    const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    t.needsUpdate = true;
    return t;
  };
  return { roughnessMap: mk(rough), normalMap: mk(normal) };
}
'''
rep("\nexport default function", helper + "\nexport default function")

# 2. renderer: tone mapping + lab environment (RoomEnvironment = procedural cleanroom HDRI)
rep("    mount.appendChild(renderer.domElement);\n    rendererRef.current = renderer;\n",
    """    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Laboratory / cleanroom image-based lighting (procedural HDR environment)
    const pmrem = new THREE.PMREMGenerator(renderer);
    const labEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = labEnv;
    scene.environmentIntensity = 0.9;
""")

# 3. lights
rep("const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.75);",
    "const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.25);")
rep("""    sunLight.castShadow = true;
    scene.add(sunLight);
""", """    sunLight.castShadow = true;
    // High-resolution contact shadows grounding the frames
    sunLight.shadow.mapSize.set(4096, 4096);
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    Object.assign(sunLight.shadow.camera, { left: -26, right: 26, top: 20, bottom: -20, near: 1, far: 90 });
    sunLight.shadow.camera.updateProjectionMatrix();
    scene.add(sunLight);

    // Soft cool-toned fill to lift shadow regions inside the glass cylinders
    const coolFill = new THREE.DirectionalLight(0xbfdbfe, 0.55);
    coolFill.position.set(-14, 10, 20);
    scene.add(coolFill);
""")

# 4. steel materials
rep("const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });\n    const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.35 });",
    """const steelMaps = makeBrushedSteelMaps(renderer);
    // Industrial Stainless Steel 316L: #A5A9B0, metalness 1.0, brushed roughness/normal maps
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xa5a9b0,
      metalness: 1.0,
      roughness: 1.0,
      roughnessMap: steelMaps.roughnessMap,
      normalMap: steelMaps.normalMap,
      normalScale: new THREE.Vector2(0.8, 0.8)
    });
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x6b7078,
      metalness: 1.0,
      roughness: 1.0,
      roughnessMap: steelMaps.roughnessMap,
      normalMap: steelMaps.normalMap,
      normalScale: new THREE.Vector2(0.8, 0.8)
    });""")

# 5. borosilicate glass shell
old_wall = re.search(r"const wallMat = new THREE\.MeshPhysicalMaterial\(\{.*?\}\);\n", s, re.S).group(0)
rep(old_wall, """const wallMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.06,
      metalness: 0.0,
      transmission: 0.94,
      ior: 1.474,
      thickness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      side: THREE.DoubleSide
    });
""")

# clarifier shell -> borosilicate glass (clone reused for PFR clarifier)
rep("new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.30 })",
    "new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.06, metalness: 0, transmission: 0.94, ior: 1.474, thickness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02 })")

# PFR baffles -> polished acrylic/glass
rep("""new THREE.BoxGeometry(passLen + 0.4, passHeight + 0.3, 0.12),
        concreteMat""", """new THREE.BoxGeometry(passLen + 0.4, passHeight + 0.3, 0.12),
        acrylicMat""")
rep("    // 16 Axial Fluid Zones along the Serpentine Path (z/L in [0, 1])\n",
    """    // 16 Axial Fluid Zones along the Serpentine Path (z/L in [0, 1])
""")
rep("    const passLen = 7.6;\n", """    const acrylicMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, roughness: 0.06, metalness: 0, transmission: 0.92,
      ior: 1.474, thickness: 0.12, clearcoat: 1, clearcoatRoughness: 0.02
    });
    const passLen = 7.6;
""")

# 6. optional packed-bed ceramic media (instanced translucent spheres) inside PFR passes
rep("    pfrZonesRef.current = pfrZones;\n", """    pfrZonesRef.current = pfrZones;

    // Packed-bed ceramic/silica media (instanced, translucent SSS-style), togglable
    {
      const mediaMat = new THREE.MeshPhysicalMaterial({
        color: 0xe0e6ed, roughness: 0.45, metalness: 0,
        transmission: 0.5, thickness: 0.05, ior: 1.45,
        attenuationColor: new THREE.Color(0xe0e6ed), attenuationDistance: 0.05
      });
      const rad = 0.12, step = 0.25;
      const nx = Math.floor((passLen - 0.3) / step), ny = Math.floor((passHeight - 0.2) / step), nz = Math.floor((passWidth - 0.2) / step);
      const total = nx * ny * nz * 4;
      const media = new THREE.InstancedMesh(new THREE.SphereGeometry(rad, 14, 10), mediaMat, total);
      const dummy = new THREE.Object3D();
      let k = 0;
      for (let pass = 0; pass < 4; pass++) {
        const zc = (pass - 1.5) * 1.55;
        for (let ix = 0; ix < nx; ix++) for (let iy = 0; iy < ny; iy++) for (let iz = 0; iz < nz; iz++) {
          dummy.position.set(
            -passLen / 2 + 0.15 + ix * step + (Math.random() - 0.5) * 0.03,
            -2.2 + 0.1 + iy * step + (Math.random() - 0.5) * 0.03,
            zc - (nz - 1) * step / 2 + iz * step + (Math.random() - 0.5) * 0.03
          );
          dummy.updateMatrix();
          media.setMatrixAt(k++, dummy.matrix);
        }
      }
      media.visible = false;
      pfrBasin.add(media);
      pfrMediaRef.current = media;
    }
""")
rep("  const pfrZonesRef = useRef([]);\n", "  const pfrZonesRef = useRef([]);\n  const pfrMediaRef = useRef(null);\n")
rep("  const [showScadaPins, setShowScadaPins] = useState(true);",
    "  const [showPackedMedia, setShowPackedMedia] = useState(false);\n  const [showScadaPins, setShowScadaPins] = useState(true);")
rep("  // Cutaway Wall Geometry Update (Feature #20)\n", """  useEffect(() => {
    if (pfrMediaRef.current) pfrMediaRef.current.visible = showPackedMedia;
  }, [showPackedMedia]);

  // Cutaway Wall Geometry Update (Feature #20)
""")

# toggle button
rep("""          <button
            onClick={() => setShowScadaPins(!showScadaPins)}""", """          <button
            onClick={() => setShowPackedMedia(!showPackedMedia)}
            className={`px-2.5 py-1 rounded-md font-semibold transition ${
              showPackedMedia ? 'bg-slate-200 text-slate-900' : 'bg-slate-800 text-slate-300'
            }`}
          >
            ⚪ PFR Ceramic Media
          </button>
          <button
            onClick={() => setShowScadaPins(!showScadaPins)}""")

# 7. shadow casting pass before animate loop
rep("    let frameCounter = 0;\n", """    // Contact shadows: opaque structural parts cast & receive
    scene.traverse((o) => {
      if (o.isMesh && o.material && !o.material.transparent && !o.material.transmission) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });

    let frameCounter = 0;
""")

# cleanup env
rep("      if (rendererRef.current?.domElement) {\n        rendererRef.current.domElement.remove();",
    "      pmrem.dispose();\n      if (rendererRef.current?.domElement) {\n        rendererRef.current.domElement.remove();")

open(P, "w", encoding="utf-8", newline="\n").write(s)
print("patched")
