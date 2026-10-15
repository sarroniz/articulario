import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ============================================================
   Coordenadas (cm): x hacia atrás (posterior +), y hacia arriba, z lateral.
   Origen aproximado: borde de los incisivos superiores. Plano medio: z = 0.
   ============================================================ */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Catmull-Rom 2D por puntos de control, re-muestreado uniformemente por longitud de arco
function resample2(pts, n) {
  const get = i => {
    if (i < 0) { const a = pts[0], b = pts[1]; return [2 * a[0] - b[0], 2 * a[1] - b[1]]; }
    if (i > pts.length - 1) { const a = pts[pts.length - 1], b = pts[pts.length - 2]; return [2 * a[0] - b[0], 2 * a[1] - b[1]]; }
    return pts[i];
  };
  const dense = [], SEG = 24;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let k = 0; k < SEG; k++) {
      const t = k / SEG, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      dense.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  dense.push(pts[pts.length - 1].slice());
  const L = [0];
  for (let i = 1; i < dense.length; i++) L.push(L[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const total = L[L.length - 1], out = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const s = total * k / (n - 1);
    while (j < L.length - 2 && L[j + 1] < s) j++;
    const f = (s - L[j]) / ((L[j + 1] - L[j]) || 1);
    out.push([lerp(dense[j][0], dense[j + 1][0], f), lerp(dense[j][1], dense[j + 1][1], f)]);
  }
  out.total = total;
  return out;
}

// Interpolación cúbica (Catmull-Rom 1D) sobre nudos no uniformes
function spline1(ku, kv, u) {
  const n = ku.length;
  if (u <= ku[0]) return kv[0];
  if (u >= ku[n - 1]) return kv[n - 1];
  let i = 0;
  while (i < n - 2 && u > ku[i + 1]) i++;
  const h = ku[i + 1] - ku[i], t = (u - ku[i]) / h;
  const m = k => (k <= 0 ? (kv[1] - kv[0]) / (ku[1] - ku[0]) : k >= n - 1 ? (kv[n - 1] - kv[n - 2]) / (ku[n - 1] - ku[n - 2]) : (kv[k + 1] - kv[k - 1]) / (ku[k + 1] - ku[k - 1]));
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * kv[i] + (t3 - 2 * t2 + t) * h * m(i) + (-2 * t3 + 3 * t2) * kv[i + 1] + (t3 - t2) * h * m(i + 1);
}

// Tabla y(x) a partir de una curva monótona en x
function makeXTable(pts, n) {
  const d = resample2(pts, n);
  return x => {
    if (x <= d[0][0]) return d[0][1];
    if (x >= d[d.length - 1][0]) return d[d.length - 1][1];
    let lo = 0, hi = d.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (d[m][0] < x) lo = m; else hi = m; }
    return lerp(d[lo][1], d[hi][1], (x - d[lo][0]) / (d[hi][0] - d[lo][0]));
  };
}

/* ---------------- Paladar ---------------- */
const PAL = { x0: 0.8, D: 1.85, W: 1.72, xEnd: 5.3 };
const palMid = makeXTable([[0.8, 1.0], [1.0, 1.12], [1.25, 1.22], [1.6, 1.45], [2.1, 1.9], [2.8, 2.25], [3.6, 2.4], [4.4, 2.35], [5.3, 2.15]], 400);
function palW(x) {
  if (x <= PAL.x0) return 0;
  const d = (x - PAL.x0) / PAL.D;
  if (d >= 1) return PAL.W;
  return PAL.W * Math.sqrt(1 - (1 - d) * (1 - d));
}
const palEdgeY = x => lerp(1.0, 0.82, smooth(0.8, 2.4, x));
function palYt(x, t) { const e = palEdgeY(x), m = palMid(x); return e + (m - e) * (1 - Math.pow(Math.abs(t), 2.5)); }
function palY(x, z) {
  if (x < PAL.x0 || x > PAL.xEnd) return null;
  const w = palW(x);
  if (w < 1e-4) return null;
  const t = z / w;
  if (Math.abs(t) > 1) return null;
  return palYt(x, t);
}

/* ---------------- Arcadas dentarias ---------------- */
function makeArch(xc0, Dc, Wc) {
  const N = 400, pts = [], L = [0];
  for (let i = 0; i <= N; i++) {
    const ph = (Math.PI / 2) * i / N;
    pts.push([xc0 + Dc * (1 - Math.cos(ph)), Wc * Math.sin(ph)]);
    if (i) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const Lq = L[N];
  function at(s) {
    if (s >= Lq) return { x: xc0 + Dc + (s - Lq), z: Wc, tx: 1, tz: 0 };
    s = Math.max(0, s);
    let lo = 0, hi = N;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] < s) lo = m; else hi = m; }
    const f = (s - L[lo]) / (L[hi] - L[lo]);
    const dx = pts[hi][0] - pts[lo][0], dz = pts[hi][1] - pts[lo][1], dl = Math.hypot(dx, dz) || 1;
    return { x: lerp(pts[lo][0], pts[hi][0], f), z: lerp(pts[lo][1], pts[hi][1], f), tx: dx / dl, tz: dz / dl };
  }
  return { Lq, at };
}
const UPPER = makeArch(0.25, 2.05, 2.15);
const LOWER = makeArch(0.62, 1.85, 2.0);
const JAW_PIVOT = new THREE.Vector2(8.6, 2.2);

/* ---------------- Constructores de geometría ---------------- */
function flipWinding(g) {
  if (g.index) {
    const a = g.index.array;
    for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; }
    g.index.needsUpdate = true;
  } else {
    for (const name of Object.keys(g.attributes)) {
      const at = g.attributes[name], sz = at.itemSize, arr = at.array;
      for (let i = 0; i < at.count; i += 3) for (let c = 0; c < sz; c++) {
        const t = arr[(i + 1) * sz + c]; arr[(i + 1) * sz + c] = arr[(i + 2) * sz + c]; arr[(i + 2) * sz + c] = t;
      }
      at.needsUpdate = true;
    }
  }
}
function signedVolume(pos, idx) {
  let v = 0;
  const n = idx ? idx.length : pos.length / 3;
  for (let i = 0; i < n; i += 3) {
    const a = (idx ? idx[i] : i) * 3, b = (idx ? idx[i + 1] : i + 1) * 3, c = (idx ? idx[i + 2] : i + 2) * 3;
    v += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1])
       - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c])
       + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
  }
  return v / 6;
}
function orientOutward(g) {
  const v = signedVolume(g.attributes.position.array, g.index ? g.index.array : null);
  if (v < 0) flipWinding(g);
  return g;
}

// Lámina gruesa cerrada: superficie interior y exterior parametrizadas en (u,v) ∈ [0,1]²
function buildSheet(nu, nv, inner, outer, withColor) {
  const pos = [], idx = [];
  const id = (L, i, j) => L * (nu + 1) * (nv + 1) + i * (nv + 1) + j;
  for (const fn of [inner, outer]) for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const p = fn(i / nu, j / nv); pos.push(p[0], p[1], p[2]); }
  const q = (a, b, c, d, flip) => { if (!flip) idx.push(a, b, d, b, c, d); else idx.push(a, d, b, b, d, c); };
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    q(id(0, i, j), id(0, i + 1, j), id(0, i + 1, j + 1), id(0, i, j + 1), false);
    q(id(1, i, j), id(1, i + 1, j), id(1, i + 1, j + 1), id(1, i, j + 1), true);
  }
  // paredes laterales con vértices propios (sombreado plano en los cantos)
  const P = k => [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]];
  const side = (A, B, C, D, flip) => {
    const base = pos.length / 3;
    for (const k of [A, B, C, D]) { const p = P(k); pos.push(p[0], p[1], p[2]); }
    q(base, base + 1, base + 2, base + 3, flip);
  };
  for (let i = 0; i < nu; i++) {
    side(id(0, i, 0), id(1, i, 0), id(1, i + 1, 0), id(0, i + 1, 0), false);
    side(id(0, i, nv), id(1, i, nv), id(1, i + 1, nv), id(0, i + 1, nv), true);
  }
  for (let j = 0; j < nv; j++) {
    side(id(0, 0, j), id(0, 0, j + 1), id(1, 0, j + 1), id(1, 0, j), false);
    side(id(0, nu, j), id(0, nu, j + 1), id(1, nu, j + 1), id(1, nu, j), true);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (withColor) g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(pos.length).fill(1), 3));
  g.setIndex(idx);
  orientOutward(g);
  g.computeVertexNormals();
  g.userData.innerCount = (nu + 1) * (nv + 1);
  return g;
}

// Tubo cerrado: anillos de puntos (ring(i) -> array de [x,y,z]) con tapas
function buildSweep(rings) {
  const n = rings.length, m = rings[0].length, pos = [], idx = [];
  for (const r of rings) for (const p of r) pos.push(p[0], p[1], p[2]);
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < m; j++) {
    const a = i * m + j, b = i * m + (j + 1) % m, c = (i + 1) * m + (j + 1) % m, d = (i + 1) * m + j;
    idx.push(a, b, d, b, c, d);
  }
  for (const [ri, flip] of [[0, false], [n - 1, true]]) {
    const r = rings[ri], cx = r.reduce((s, p) => s + p[0], 0) / m, cy = r.reduce((s, p) => s + p[1], 0) / m, cz = r.reduce((s, p) => s + p[2], 0) / m;
    const base = pos.length / 3;
    for (const p of r) pos.push(p[0], p[1], p[2]);
    pos.push(cx, cy, cz);
    for (let j = 0; j < m; j++) { const a = base + j, b = base + (j + 1) % m, c = base + m; if (!flip) idx.push(a, c, b); else idx.push(a, b, c); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  orientOutward(g);
  g.computeVertexNormals();
  return g;
}

/* ---------------- Materiales con relleno de corte ---------------- */
// Las caras traseras se pintan con un color plano: al cortar un sólido cerrado, el corte se ve relleno.
function tissue(hex, capHex, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ color: hex, roughness: opts.rough ?? 0.62, metalness: 0, side: THREE.DoubleSide, vertexColors: !!opts.vc });
  const c = new THREE.Color(capHex);
  const cap = { value: new THREE.Vector3(...c.getRGB(new THREE.Color(), THREE.SRGBColorSpace).toArray()) };
  m.onBeforeCompile = sh => {
    sh.uniforms.uCap = cap;
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', 'uniform vec3 uCap;\nvoid main() {')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n if (!gl_FrontFacing) { gl_FragColor = vec4(uCap, 1.0); return; }');
  };
  m.userData.cap = cap;
  return m;
}

/* ---------------- Dientes ---------------- */
const UPPER_TEETH = [ // [mesiodistal, vestíbulo-lingual, alto corona, afinado borde, inclinación]
  [0.86, 0.70, 1.05, 0.38, 0.25], [0.66, 0.62, 0.95, 0.4, 0.22], [0.78, 0.80, 1.0, 0.5, 0.12],
  [0.70, 0.90, 0.85, 0.8, 0.0], [0.66, 0.90, 0.80, 0.85, 0.0], [1.0, 1.05, 0.75, 0.9, 0.0], [0.9, 1.0, 0.72, 0.9, 0.0]];
const LOWER_TEETH = [
  [0.54, 0.60, 0.92, 0.38, 0.2], [0.60, 0.62, 0.92, 0.4, 0.18], [0.68, 0.75, 0.98, 0.5, 0.1],
  [0.70, 0.80, 0.80, 0.8, 0.0], [0.72, 0.85, 0.78, 0.85, 0.0], [1.1, 1.0, 0.72, 0.9, 0.0], [1.0, 0.98, 0.70, 0.9, 0.0]];

function toothGeo(spec, arch, sC, side, upper, yBase) {
  const [w, b, h, taper, tilt] = spec, root = 0.7, H = h + root;
  const g = new RoundedBoxGeometry(w, H, b, 3, Math.min(0.12, w * 0.2, b * 0.18));
  const pos = g.attributes.position, a = arch.at(sC);
  const Tx = a.tx, Tz = a.tz, Ox = -a.tz, Oz = a.tx;
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i), ly = pos.getY(i) + H / 2;
    let lz = pos.getZ(i);
    const rootK = lerp(1, 0.45, smooth(h, H, ly));
    lz *= lerp(taper, 1, smooth(0, h * 0.85, ly)) * rootK;
    const lx2 = lx * lerp(1, 0.6, smooth(h, H, ly));
    lz -= ly * Math.tan(tilt);
    const y = upper ? yBase + ly : yBase - ly;
    const x = a.x + Tx * lx2 + Ox * lz, z = a.z + Tz * lx2 + Oz * lz;
    pos.setXYZ(i, x, y, side * z);
  }
  if (side < 0) flipWinding(g);
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return g;
}
function teethRow(list, arch, upper, yBaseFn) {
  const geos = [];
  for (const side of [1, -1]) {
    let s = -0.035;
    list.forEach((spec, k) => {
      const sc = s + spec[0] / 2;
      geos.push(toothGeo(spec, arch, sc, side, upper, yBaseFn(k)));
      s += spec[0] + 0.025;
    });
  }
  return mergeGeometries(geos);
}

// Banda de encía / hueso alveolar a lo largo de la arcada (de un lado al otro)
function archBand(arch, Ltot, nS, nPhi, sec) {
  const rings = [];
  for (let i = 0; i <= nS; i++) {
    const sig = -Ltot + 2 * Ltot * i / nS, s = Math.abs(sig), side = sig < 0 ? -1 : 1;
    const a = arch.at(s), Ox = -a.tz, Oz = a.tx;
    const S = sec(s), ring = [];
    for (let j = 0; j < nPhi; j++) {
      const ph = 2 * Math.PI * j / nPhi, cp = Math.cos(ph), sp = Math.sin(ph);
      const c0 = Math.sign(cp) * Math.pow(Math.abs(cp), S.e), v0 = Math.sign(sp) * Math.pow(Math.abs(sp), S.e);
      const v = S.yc + S.hv * v0;
      let c = S.cc + S.hc * c0 - (S.lean ? S.lean(v) : 0);
      const x = a.x + Ox * c, z = side * (a.z + Oz * c);
      ring.push([x, v, z]);
    }
    rings.push(ring);
  }
  return buildSweep(rings);
}
