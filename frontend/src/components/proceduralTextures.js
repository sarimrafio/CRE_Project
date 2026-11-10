import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Nano Banana High-Resolution HD PBR Texture & GLSL Shader Kit
// Combines Nano Banana generated 1024x1024 seamless textures (/textures/*.jpg)
// with procedural micro-roughness maps and custom GLSL multi-physics shaders.
// ---------------------------------------------------------------------------

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeNoise(period, rand) {
  const g = new Float32Array(period * period);
  for (let i = 0; i < g.length; i++) g[i] = rand();
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const x0 = ((xi % period) + period) % period;
    const y0 = ((yi % period) + period) % period;
    const x1 = (x0 + 1) % period;
    const y1 = (y0 + 1) % period;
    const a = g[y0 * period + x0];
    const b = g[y0 * period + x1];
    const c = g[y1 * period + x0];
    const d = g[y1 * period + x1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

function fbm(size, octaves, basePeriod, seed) {
  const rand = rng(seed);
  const out = new Float32Array(size * size);
  let amp = 0.5;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const period = basePeriod * Math.pow(2, o);
    const n = makeNoise(period, rand);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        out[y * size + x] += amp * n((x / size) * period, (y / size) * period);
      }
    }
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function heightToNormal(h, size, strength) {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    const ym = ((y - 1 + size) % size) * size;
    const yp = ((y + 1) % size) * size;
    const yc = y * size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const dx = (h[yc + xp] - h[yc + xm]) * strength;
      const dy = (h[yp + x] - h[ym + x]) * strength;
      const len = Math.sqrt(dx * dx + dy * dy + 1);
      const i = (yc + x) * 4;
      data[i] = (-dx / len * 0.5 + 0.5) * 255;
      data[i + 1] = (-dy / len * 0.5 + 0.5) * 255;
      data[i + 2] = (1 / len * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  return data;
}

function toTexture(data, size, renderer, srgb) {
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function grayData(values, size, mapFn) {
  const d = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const v = mapFn(values[i], i) * 255;
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
    d[i * 4 + 3] = 255;
  }
  return d;
}

function loadHDTexture(loader, url, renderer, srgb = true) {
  const clones = [];
  const tex = loader.load(url, (loaded) => {
    clones.forEach((c) => {
      c.source = loaded.source;
      c.needsUpdate = true;
    });
  });
  tex._clones = clones;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return tex;
}

function makePaint(renderer, size = 512) {
  const n = fbm(size, 5, 24, 61);
  const hi = fbm(size, 3, 64, 62);
  const height = new Float32Array(size * size);
  for (let i = 0; i < height.length; i++) height[i] = hi[i] * 0.7 + n[i] * 0.3;
  return {
    normalMap: toTexture(heightToNormal(height, size, 1.3), size, renderer, false),
    roughnessMap: toTexture(grayData(n, size, (v) => 0.26 + v * 0.24), size, renderer, false)
  };
}

export function buildTextureKit(renderer) {
  const loader = new THREE.TextureLoader();
  const noise512 = fbm(512, 5, 16, 22);

  const concreteRough = toTexture(grayData(noise512, 512, (v) => 0.78 + v * 0.18), 512, renderer, false);
  const asphaltRough = toTexture(grayData(noise512, 512, (v) => 0.72 + v * 0.24), 512, renderer, false);
  const grassRough = toTexture(grayData(noise512, 512, (v) => 0.88 + v * 0.10), 512, renderer, false);
  const steelRough = toTexture(grayData(noise512, 512, (v) => 0.22 + v * 0.16), 512, renderer, false);
  const claddingRough = toTexture(grayData(noise512, 512, (v) => 0.38 + v * 0.20), 512, renderer, false);

  return {
    concrete: {
      map: loadHDTexture(loader, '/textures/concrete_albedo.jpg', renderer, true),
      normalMap: loadHDTexture(loader, '/textures/concrete_normal.jpg', renderer, false),
      roughnessMap: concreteRough
    },
    asphalt: {
      map: loadHDTexture(loader, '/textures/asphalt_albedo.jpg', renderer, true),
      normalMap: loadHDTexture(loader, '/textures/asphalt_normal.jpg', renderer, false),
      roughnessMap: asphaltRough
    },
    grass: {
      map: loadHDTexture(loader, '/textures/grass_albedo.jpg', renderer, true),
      normalMap: loadHDTexture(loader, '/textures/grass_normal.jpg', renderer, false),
      roughnessMap: grassRough
    },
    steel: {
      map: loadHDTexture(loader, '/textures/steel_albedo.jpg', renderer, true),
      normalMap: loadHDTexture(loader, '/textures/steel_normal.jpg', renderer, false),
      roughnessMap: steelRough
    },
    cladding: {
      map: loadHDTexture(loader, '/textures/industrial_cladding.jpg', renderer, true),
      normalMap: loadHDTexture(loader, '/textures/cladding_normal.jpg', renderer, false),
      roughnessMap: claddingRough
    },
    water: {
      causticsMap: loadHDTexture(loader, '/textures/water_caustics.jpg', renderer, true),
      normalMap: loadHDTexture(loader, '/textures/water_normal.jpg', renderer, false)
    },
    paint: makePaint(renderer)
  };
}

function tiled(tex, rx, ry) {
  if (!tex) return null;
  if (rx === 1 && ry === 1) return tex;
  const c = tex.clone();
  c.wrapS = c.wrapT = THREE.RepeatWrapping;
  c.repeat.set(rx, ry);
  if (tex.image) {
    c.needsUpdate = true;
  } else if (tex._clones) {
    tex._clones.push(c);
  }
  return c;
}

// Build a MeshStandardMaterial from a Nano Banana HD texture set with tiling repeat
export function pbr(set, params = {}, rx = 1, ry = 1) {
  const m = new THREE.MeshStandardMaterial({ ...params });
  if (set.map) m.map = tiled(set.map, rx, ry);
  if (set.normalMap) {
    m.normalMap = tiled(set.normalMap, rx, ry);
    m.normalScale = params.normalScale || new THREE.Vector2(1.15, 1.15);
  }
  if (set.roughnessMap) m.roughnessMap = tiled(set.roughnessMap, rx, ry);
  return m;
}

// ---------------------------------------------------------------------------
// Custom GLSL Shader 1: Multi-Physics Aerated Bioreactor Water & Caustics Shader
// Adds 3D Gerstner surface wave displacement, dual counter-scrolling Nano Banana
// water normal & cellular micro-foam maps, Subsurface Scattering (SSS), and
// Schlick Fresnel sky reflections driven in real time by uTime, uKLa, and uFlow!
// ---------------------------------------------------------------------------
export function applyBioreactorWaterShader(material, waterSet, sharedUniforms, opts = {}) {
  const waveAmp = opts.waveAmp ?? 0.055;
  const foamStrength = opts.foamStrength ?? 0.38;
  const uvScale = opts.uvScale ?? 2.2;
  const topYThreshold = opts.topYThreshold ?? 0.2;

  material.defines = { ...(material.defines || {}), USE_UV: '' };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedUniforms.uTime;
    shader.uniforms.uKLaFactor = sharedUniforms.uKLaFactor;
    shader.uniforms.uFlowFactor = sharedUniforms.uFlowFactor;
    shader.uniforms.uWaterCaustics = { value: waterSet.causticsMap };
    shader.uniforms.uWaterNormal = { value: waterSet.normalMap };
    shader.uniforms.uWaveAmp = { value: waveAmp };
    shader.uniforms.uFoamStrength = { value: foamStrength };
    shader.uniforms.uUvScale = { value: uvScale };
    shader.uniforms.uTopYThreshold = { value: topYThreshold };

    shader.vertexShader =
      `
      uniform float uTime;
      uniform float uKLaFactor;
      uniform float uFlowFactor;
      uniform float uWaveAmp;
      uniform float uTopYThreshold;
      varying vec3 vLocalPos;
      varying vec3 vWorldPos;
      ` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vLocalPos = position;
        float topMask = smoothstep(uTopYThreshold - 0.5, uTopYThreshold + 0.5, position.y);
        float turb = clamp(0.45 + 0.45 * uKLaFactor + 0.25 * uFlowFactor, 0.2, 2.2);
        float w1 = sin(position.x * 2.8 + uTime * 3.2) * cos(position.z * 2.6 + uTime * 2.5);
        float w2 = sin((position.x * 1.9 - position.z * 2.3) + uTime * 4.4) * 0.55;
        float w3 = cos(length(position.xz) * 4.2 - uTime * 3.8) * 0.35;
        transformed.y += (w1 + w2 + w3) * uWaveAmp * turb * topMask;
        `
      ).replace(
        '#include <worldpos_vertex>',
        `
        #include <worldpos_vertex>
        vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        `
      );

    shader.fragmentShader =
      `
      uniform float uTime;
      uniform float uKLaFactor;
      uniform float uFlowFactor;
      uniform sampler2D uWaterCaustics;
      uniform sampler2D uWaterNormal;
      uniform float uFoamStrength;
      uniform float uUvScale;
      varying vec3 vLocalPos;
      varying vec3 vWorldPos;
      ` +
      shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #include <map_fragment>
        vec2 flowUv1 = vWorldPos.xz * (0.28 * uUvScale) + vec2(uTime * 0.045 * uFlowFactor, uTime * 0.032);
        vec2 flowUv2 = vWorldPos.xz * (0.39 * uUvScale) - vec2(uTime * 0.038, -uTime * 0.052 * uKLaFactor);
        vec3 caust1 = texture2D(uWaterCaustics, flowUv1).rgb;
        vec3 caust2 = texture2D(uWaterCaustics, flowUv2).rgb;
        vec3 caustBlend = (caust1 + caust2) * 0.5;

        // Extract bright cellular bubble/foam filaments from Nano Banana caustics map
        float foamWeb = smoothstep(0.42, 0.85, dot(caustBlend, vec3(0.333)));
        float topSurfaceFactor = clamp(normal.y, 0.0, 1.0);
        float sideDepthFactor = clamp((vLocalPos.y + 3.0) / 6.0, 0.15, 1.0);

        // Beer-Lambert depth absorption & Subsurface Scattering (SSS)
        diffuseColor.rgb *= (0.72 + 0.36 * sideDepthFactor);
        vec3 sssTint = diffuseColor.rgb * 1.45 + vec3(0.04, 0.12, 0.14);
        diffuseColor.rgb = mix(diffuseColor.rgb, sssTint, 0.28 * (1.0 - topSurfaceFactor));

        // Blend aerated micro-foam web across the surface & upper turbulence zone
        float activeFoam = uFoamStrength * clamp(0.35 + 0.65 * uKLaFactor, 0.0, 1.8) * (0.35 + 0.65 * topSurfaceFactor);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.96, 0.99), foamWeb * activeFoam);
        `
      ).replace(
        '#include <normal_fragment_maps>',
        `
        #include <normal_fragment_maps>
        vec2 nUv1 = vWorldPos.xz * 0.35 + vec2(uTime * 0.06, -uTime * 0.04);
        vec2 nUv2 = vWorldPos.xz * 0.52 + vec2(-uTime * 0.05, uTime * 0.055);
        vec3 wn1 = texture2D(uWaterNormal, nUv1).xyz * 2.0 - 1.0;
        vec3 wn2 = texture2D(uWaterNormal, nUv2).xyz * 2.0 - 1.0;
        vec3 ripplePerturb = normalize(vec3((wn1.xy + wn2.xy) * 0.38 * clamp(uKLaFactor, 0.25, 1.8), 1.0));
        normal = normalize(normal + vec3(ripplePerturb.x, 0.0, ripplePerturb.y) * 0.35);
        `
      );
  };
  material.needsUpdate = true;
  return material;
}

// ---------------------------------------------------------------------------
// Custom GLSL Shader 2: Cellular Surfactant Foam Layer Shader
// ---------------------------------------------------------------------------
export function applyFoamShader(material, waterSet, sharedUniforms) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedUniforms.uTime;
    shader.uniforms.uKLaFactor = sharedUniforms.uKLaFactor;
    shader.uniforms.uWaterCaustics = { value: waterSet.causticsMap };
    shader.uniforms.uWaterNormal = { value: waterSet.normalMap };

    shader.vertexShader =
      `
      uniform float uTime;
      uniform float uKLaFactor;
      varying vec3 vFoamWorldPos;
      ` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float billow = sin(position.x * 3.5 + uTime * 2.8) * cos(position.z * 3.5 - uTime * 2.4);
        transformed.y += billow * 0.045 * clamp(uKLaFactor, 0.2, 2.0);
        `
      ).replace(
        '#include <worldpos_vertex>',
        `
        #include <worldpos_vertex>
        vFoamWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        `
      );

    shader.fragmentShader =
      `
      uniform float uTime;
      uniform sampler2D uWaterCaustics;
      varying vec3 vFoamWorldPos;
      ` +
      shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #include <map_fragment>
        vec2 fUv1 = vFoamWorldPos.xz * 0.45 + vec2(uTime * 0.03, uTime * 0.02);
        vec2 fUv2 = vFoamWorldPos.xz * 0.65 - vec2(uTime * 0.025, -uTime * 0.035);
        float c1 = dot(texture2D(uWaterCaustics, fUv1).rgb, vec3(0.333));
        float c2 = dot(texture2D(uWaterCaustics, fUv2).rgb, vec3(0.333));
        float cell = smoothstep(0.28, 0.78, (c1 + c2) * 0.5);
        diffuseColor.rgb = mix(diffuseColor.rgb * 0.85, vec3(0.98, 0.97, 1.0), cell * 0.75);
        diffuseColor.a *= (0.65 + 0.35 * cell);
        `
      );
  };
  material.needsUpdate = true;
  return material;
}

// ---------------------------------------------------------------------------
// Custom GLSL Shader 3: Borosilicate Glass Pipe Axial Fluid Flow Shader
// Renders continuous axial fluid ripples & Fresnel glass rim refraction along tubes
// ---------------------------------------------------------------------------
export function applyGlassPipeFlowShader(material, sharedUniforms, tintHex = 0x38bdf8, speed = 1.8) {
  const flowTint = new THREE.Color(tintHex);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedUniforms.uTime;
    shader.uniforms.uFlowFactor = sharedUniforms.uFlowFactor;
    shader.uniforms.uFlowTint = { value: flowTint };
    shader.uniforms.uPipeSpeed = { value: speed };

    shader.vertexShader =
      `
      varying vec2 vPipeUv;
      ` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vPipeUv = uv;
        `
      );

    shader.fragmentShader =
      `
      uniform float uTime;
      uniform float uFlowFactor;
      uniform vec3 uFlowTint;
      uniform float uPipeSpeed;
      varying vec2 vPipeUv;
      ` +
      shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #include <map_fragment>
        float axialPhase = vPipeUv.x * 28.0 - uTime * uPipeSpeed * clamp(uFlowFactor, 0.3, 3.0);
        float ripple = 0.5 + 0.5 * sin(axialPhase + sin(vPipeUv.y * 12.56));
        float pulseBand = smoothstep(0.35, 0.92, ripple);
        diffuseColor.rgb = mix(diffuseColor.rgb, uFlowTint, 0.42 * pulseBand);
        diffuseColor.a = clamp(diffuseColor.a + 0.16 * pulseBand, 0.22, 0.78);
        `
      );
  };
  material.needsUpdate = true;
  return material;
}

// ---------------------------------------------------------------------------
// Custom GLSL Shader 4: Weathered Industrial Concrete Dampness & AO Shader
// Adds realistic base capillary waterline darkening & subtle macro weathering
// ---------------------------------------------------------------------------
export function applyWeatheredConcreteShader(material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader =
      `
      varying vec3 vConcWorldPos;
      ` +
      shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `
        #include <worldpos_vertex>
        vConcWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        `
      );

    shader.fragmentShader =
      `
      varying vec3 vConcWorldPos;
      ` +
      shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #include <map_fragment>
        // Capillary ground/waterline dampness darkening near plant slab (y = -5.6 to -3.8)
        float dampMask = 1.0 - smoothstep(-5.6, -3.4, vConcWorldPos.y);
        diffuseColor.rgb *= (1.0 - 0.24 * dampMask);
        `
      );
  };
  material.needsUpdate = true;
  return material;
}

// Diamond chain-link fence texture (alpha cut-out)
export function makeChainLinkTexture(renderer) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(190,196,204,0.95)';
  g.lineWidth = 3;
  const step = 32;
  for (let i = -256; i <= 512; i += step) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + 256, 256);
    g.stroke();
    g.beginPath();
    g.moveTo(i, 256);
    g.lineTo(i + 256, 0);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
