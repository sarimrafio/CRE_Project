import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Procedural HD PBR texture kit (tileable). No external image assets required.
// Each set provides albedo (map), tangent-space normalMap and roughnessMap.
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

// Tileable fractal noise in [0,1]
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

function makeConcrete(renderer, size = 1024) {
  const rand = rng(11);
  const big = fbm(size, 5, 3, 21);
  const mid = fbm(size, 5, 16, 22);
  const stain = fbm(size, 4, 2, 23);
  const height = new Float32Array(size * size);
  const color = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      let h = mid[i] * 0.6 + big[i] * 0.4;
      const speck = rand();
      if (speck > 0.985) h += 0.18;
      else if (speck < 0.01) h -= 0.2;
      // expansion/control joints on tile edge
      const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
      let joint = 0;
      if (edge < 3) joint = 1 - edge / 3;
      h -= joint * 0.5;
      height[i] = h;
      let c = 146 + (mid[i] - 0.5) * 70 + (big[i] - 0.5) * 40 + (rand() - 0.5) * 16;
      c *= 1 - Math.max(0, stain[i] - 0.55) * 0.9; // dirt/water stains
      c *= 1 - joint * 0.55;
      color[i * 4] = c * 1.0;
      color[i * 4 + 1] = c * 0.99;
      color[i * 4 + 2] = c * 0.95;
      color[i * 4 + 3] = 255;
    }
  }
  return {
    map: toTexture(color, size, renderer, true),
    normalMap: toTexture(heightToNormal(height, size, 3.0), size, renderer, false),
    roughnessMap: toTexture(grayData(mid, size, (v) => 0.82 + v * 0.16), size, renderer, false)
  };
}

function makeAsphalt(renderer, size = 1024) {
  const rand = rng(31);
  const low = fbm(size, 4, 4, 32);
  const height = new Float32Array(size * size);
  const color = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const r = rand();
    let h = low[i] * 0.3 + rand() * 0.55;
    let c = 42 + low[i] * 24 + rand() * 18;
    if (r > 0.992) {
      c += 70;
      h += 0.3;
    } else if (r > 0.97) {
      c += 25;
    }
    height[i] = h;
    color[i * 4] = c;
    color[i * 4 + 1] = c;
    color[i * 4 + 2] = c * 1.03;
    color[i * 4 + 3] = 255;
  }
  return {
    map: toTexture(color, size, renderer, true),
    normalMap: toTexture(heightToNormal(height, size, 4.0), size, renderer, false),
    roughnessMap: toTexture(grayData(low, size, (v) => 0.78 + v * 0.2), size, renderer, false)
  };
}

function makeGrass(renderer, size = 1024) {
  const rand = rng(41);
  const low = fbm(size, 5, 3, 42);
  const dry = fbm(size, 4, 2, 43);
  const height = new Float32Array(size * size);
  const color = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const blade = rand();
      height[i] = blade * 0.7 + low[i] * 0.3;
      const dryness = Math.max(0, dry[i] - 0.5) * 1.6;
      let r = 52 + low[i] * 30 + blade * 26;
      let g = 84 + low[i] * 36 + blade * 34;
      let b = 30 + low[i] * 14 + blade * 10;
      r += dryness * 70;
      g += dryness * 30;
      b += dryness * 6;
      color[i * 4] = r;
      color[i * 4 + 1] = g;
      color[i * 4 + 2] = b;
      color[i * 4 + 3] = 255;
    }
  }
  return {
    map: toTexture(color, size, renderer, true),
    normalMap: toTexture(heightToNormal(height, size, 2.2), size, renderer, false),
    roughnessMap: toTexture(grayData(low, size, () => 0.95), size, renderer, false)
  };
}

// Brushed stainless 316L: roughness 0.22 base up to 0.35, horizontal grain
function makeSteel(renderer, size = 2048) {
  const rough = new Uint8ClampedArray(size * size * 4);
  const normal = new Uint8ClampedArray(size * size * 4);
  const rand = rng(51);
  const h = new Float32Array(size + 2);
  let acc = 0;
  for (let y = 0; y < size + 2; y++) {
    acc = acc * 0.55 + (rand() - 0.5);
    h[y] = acc;
  }
  for (let y = 0; y < size; y++) {
    const dh = (h[y + 2] - h[y]) * 0.9;
    const band = 0.22 + 0.13 * (0.5 + 0.5 * Math.sin((y / size) * Math.PI * 6)) * (0.6 + 0.4 * rand());
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const r = Math.min(1, Math.max(0, band + (rand() - 0.5) * 0.05));
      rough[i] = rough[i + 1] = rough[i + 2] = r * 255;
      rough[i + 3] = 255;
      const nx = (rand() - 0.5) * 0.04;
      const ny = dh * 0.35 + (rand() - 0.5) * 0.04;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      normal[i] = (nx * 0.5 + 0.5) * 255;
      normal[i + 1] = (ny * 0.5 + 0.5) * 255;
      normal[i + 2] = (nz * 0.5 + 0.5) * 255;
      normal[i + 3] = 255;
    }
  }
  return {
    normalMap: toTexture(normal, size, renderer, false),
    roughnessMap: toTexture(rough, size, renderer, false)
  };
}

// Industrial paint: orange-peel normal + uneven gloss
function makePaint(renderer, size = 512) {
  const n = fbm(size, 5, 24, 61);
  const hi = fbm(size, 3, 64, 62);
  const height = new Float32Array(size * size);
  for (let i = 0; i < height.length; i++) height[i] = hi[i] * 0.7 + n[i] * 0.3;
  return {
    normalMap: toTexture(heightToNormal(height, size, 1.2), size, renderer, false),
    roughnessMap: toTexture(grayData(n, size, (v) => 0.3 + v * 0.22), size, renderer, false)
  };
}

export function buildTextureKit(renderer) {
  return {
    concrete: makeConcrete(renderer),
    asphalt: makeAsphalt(renderer),
    grass: makeGrass(renderer),
    steel: makeSteel(renderer),
    paint: makePaint(renderer)
  };
}

function tiled(tex, rx, ry) {
  const c = tex.clone();
  c.wrapS = c.wrapT = THREE.RepeatWrapping;
  c.repeat.set(rx, ry);
  c.needsUpdate = true;
  return c;
}

// Build a MeshStandardMaterial from a texture set with a tiling repeat
export function pbr(set, params = {}, rx = 1, ry = 1) {
  const m = new THREE.MeshStandardMaterial({ ...params });
  if (set.map) m.map = tiled(set.map, rx, ry);
  if (set.normalMap) {
    m.normalMap = tiled(set.normalMap, rx, ry);
    m.normalScale = new THREE.Vector2(1, 1);
  }
  if (set.roughnessMap) m.roughnessMap = tiled(set.roughnessMap, rx, ry);
  return m;
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
