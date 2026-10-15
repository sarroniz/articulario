
/* ============================================================
   Posturas articulatorias
   mid: contorno mediosagital del dorso (punta → raíz), 13 puntos
   r:   altura de los bordes laterales respecto a la línea media (+ = surco)
   w:   semianchura de la lengua
   ============================================================ */
const U_KN = [0, 0.04, 0.1, 0.18, 0.28, 0.4, 0.55, 0.7, 0.85, 1];
const RHO = [0.12, 0.2, 0.3, 0.4, 0.5, 0.55, 0.55, 0.5, 0.45, 0.4];
const THK = [0.3, 0.45, 0.75, 1.05, 1.35, 1.6, 1.8, 1.9, 1.9, 1.9];
const BFIX_U = [0, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85, 1];
const BFIX_X = [1.2, 1.3, 1.38, 2.0, 3.0, 4.0, 4.9, 5.8];
const BFIX_Y = [-0.7, -1.4, -2.3, -2.9, -3.3, -3.55, -3.65, -3.55];

const POSTURES = {
  rest: {
    mid: [[1.1, -0.25], [1.25, 0.15], [1.6, 0.42], [2.1, 0.7], [2.8, 0.95], [3.6, 1.1], [4.4, 1.1], [5.15, 0.9], [5.75, 0.45], [6.15, -0.2], [6.32, -1.0], [6.3, -2.2], [5.95, -3.5]],
    r: [0, -0.1, -0.25, -0.35, -0.4, -0.4, -0.35, -0.2, -0.1, 0],
    w: [0, 0.85, 1.35, 1.65, 1.85, 1.92, 1.85, 1.6, 1.3, 0.95],
    g0: 0.15, g1: 0.8, bk0: 0.0, bk1: 0.16, jaw: 3.5, velum: 0, abd: 0.75, voice: 0, yU: 0.06, yL: 0.02, spread: 1.0
  },
  // Variante apicoalveolar [s̺]; no se usa en la interfaz por ahora
  s_ap: {
    mid: [[0.95, 0.97], [1.12, 0.95], [1.4, 0.99], [1.82, 1.17], [2.4, 1.45], [3.1, 1.7], [3.9, 1.82], [4.7, 1.75], [5.35, 1.45], [5.9, 0.85], [6.28, -0.3], [6.32, -1.9], [5.95, -3.5]],
    r: [0, 0.32, 0.46, 0.42, 0.3, 0.15, 0.0, -0.1, -0.1, 0],
    w: [0, 0.95, 1.32, 1.55, 1.72, 1.8, 1.78, 1.55, 1.3, 0.95],
    g0: 0.05, g1: 0.42, bk0: 0.08, bk1: 0.32, jaw: 2.5, velum: 1, abd: 1, voice: 0, yU: 0.2, yL: -0.16, spread: 1.05
  },
  s: {
    mid: [[0.98, -0.4], [0.95, 0.25], [1.0, 0.78], [1.2, 1.07], [1.6, 1.3], [2.3, 1.58], [3.2, 1.8], [4.1, 1.83], [4.95, 1.62], [5.7, 1.05], [6.2, 0.0], [6.32, -1.6], [5.95, -3.5]],
    r: [0, 0.18, 0.38, 0.42, 0.35, 0.2, 0.0, -0.1, -0.1, 0],
    w: [0, 0.95, 1.32, 1.55, 1.72, 1.8, 1.78, 1.55, 1.3, 0.95],
    g0: 0.05, g1: 0.42, bk0: 0.0, bk1: 0.12, jaw: 2.5, velum: 1, abd: 1, voice: 0, yU: 0.2, yL: -0.16, spread: 1.05
  },
  l: {
    mid: [[0.88, 1.2], [1.1, 1.32], [1.45, 1.48], [1.95, 1.6], [2.6, 1.62], [3.3, 1.6], [4.1, 1.55], [4.85, 1.4], [5.5, 1.0], [6.0, 0.35], [6.28, -0.6], [6.3, -2.0], [5.95, -3.5]],
    r: [0, -0.2, -0.6, -0.85, -0.8, -0.6, -0.35, -0.2, -0.1, 0],
    w: [0, 0.7, 1.05, 1.3, 1.5, 1.7, 1.75, 1.55, 1.3, 0.95],
    g0: 0.15, g1: 0.8, bk0: 0.1, bk1: 0.4, jaw: 6, velum: 1, abd: 0.05, voice: 1, yU: 0.26, yL: -0.4, spread: 1.0
  }
};
function mixPosture(a, b, k) {
  const o = {};
  for (const key of Object.keys(a)) {
    const va = a[key], vb = b[key];
    if (Array.isArray(va)) o[key] = va.map((x, i) => Array.isArray(x) ? [lerp(x[0], vb[i][0], k), lerp(x[1], vb[i][1], k)] : lerp(x, vb[i], k));
    else o[key] = lerp(va, vb, k);
  }
  return o;
}

function rotAboutPivot(x, y, ang) {
  const c = Math.cos(ang), s = Math.sin(ang), dx = x - JAW_PIVOT.x, dy = y - JAW_PIVOT.y;
  return [JAW_PIVOT.x + dx * c - dy * s, JAW_PIVOT.y + dx * s + dy * c];
}

/* ============================================================
   Lengua: superficie cerrada generada a partir de la postura
   ============================================================ */
const NU = 120, NPH = 64;
const TONGUE_NV = (NU + 1) * NPH;
const tongueGeo = new THREE.BufferGeometry();
{
  const pos = new Float32Array((TONGUE_NV + 2) * 3);
  const idx = [];
  for (let i = 0; i < NU; i++) for (let j = 0; j < NPH; j++) {
    const a = i * NPH + j, b = i * NPH + (j + 1) % NPH, c = (i + 1) * NPH + (j + 1) % NPH, d = (i + 1) * NPH + j;
    idx.push(a, b, d, b, c, d);
  }
  const tipC = TONGUE_NV, rootC = TONGUE_NV + 1;
  for (let j = 0; j < NPH; j++) {
    idx.push(j, tipC, (j + 1) % NPH);
    idx.push(NU * NPH + j, NU * NPH + (j + 1) % NPH, rootC);
  }
  tongueGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  tongueGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array((TONGUE_NV + 2) * 3).fill(1), 3));
  tongueGeo.setIndex(idx);
}
const tongueContact = new Uint8Array(TONGUE_NV + 2);
const tongueSpine = { P: [], N: [], W: [] };

function clampToMouth(v, jawRad) {
  // cara lingual de los incisivos superiores
  if (v[1] > -0.05 && v[1] < 1.05 && Math.abs(v[2]) < 1.0) {
    const xl = 0.41 + 0.475 * v[1];
    if (v[0] < xl) v[0] = xl;
  }
  // bóveda del paladar
  const py = palY(v[0], v[2]);
  if (py !== null && v[1] > py - 0.015) v[1] = py - 0.015;
  // pared lingual de los dientes superiores
  if (v[0] > PAL.x0 && v[0] < 5.0 && v[1] > -0.05 && v[1] < palEdgeY(v[0]) + 0.02) {
    const wl = palW(v[0]) - 0.13;
    if (Math.abs(v[2]) > wl) v[2] = Math.sign(v[2]) * Math.max(0, wl);
  }
  // dientes inferiores (en coordenadas de la mandíbula)
  const [lx, ly] = rotAboutPivot(v[0], v[1], -jawRad);
  if (ly > -0.78 && ly < 0.25) {
    let x = lx, z = v[2];
    const x0l = 0.74 + (0.2 - ly) * 0.4;
    if (Math.abs(z) < 0.9 && x < x0l + 0.03) x = x0l + 0.03;
    if (x > x0l) {
      const d = (x - x0l) / 1.75, wl = (d >= 1 ? 1.5 : 1.5 * Math.sqrt(Math.max(0, 1 - (1 - d) * (1 - d)))) - 0.08;
      if (Math.abs(z) > wl) z = Math.sign(z) * Math.max(0, wl);
    }
    if (x !== lx || z !== v[2]) { const [wx, wy] = rotAboutPivot(x, ly, jawRad); v[0] = wx; v[1] = wy; v[2] = z; }
  }
}

function buildTongue(p, jawRad) {
  const P = resample2(p.mid, NU + 1);
  const pos = tongueGeo.attributes.position.array;
  const v = [0, 0, 0];
  tongueSpine.P = P; tongueSpine.N = []; tongueSpine.W = [];
  for (let i = 0; i <= NU; i++) {
    const u = i / NU;
    const a = P[Math.max(0, i - 1)], b = P[Math.min(NU, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const nx = -ty, ny = tx;
    tongueSpine.N.push([nx, ny]);
    const W = Math.max(0, spline1(U_KN, p.w, u));
    tongueSpine.W.push(W);
    const r = spline1(U_KN, p.r, u), rho = spline1(U_KN, RHO, u), thk = spline1(U_KN, THK, u);
    const blx = P[i][0] - nx * thk, bly = P[i][1] - ny * thk;
    const [bfx, bfy] = rotAboutPivot(spline1(BFIX_U, BFIX_X, u), spline1(BFIX_U, BFIX_Y, u), jawRad * 0.85);
    const bk = smooth(p.bk0, p.bk1, u);
    const Bx = lerp(blx, bfx, bk), By = lerp(bly, bfy, bk);
    let ux = P[i][0] - Bx, uy = P[i][1] - By; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
    const Hedge = Math.min(0, r) - rho, Wb = Math.min(W, 1.2 + 0.25 * smooth(0.6, 1, u));
    for (let j = 0; j < NPH; j++) {
      const ph = 2 * Math.PI * j / NPH, t = Math.cos(ph), sp = Math.sin(ph);
      if (sp >= -1e-9) {
        const prof = r * smooth(p.g0, p.g1, Math.abs(t));
        const f = Math.pow(Math.max(0, 1 - t * t), 0.3);
        const H = Hedge + (prof - Hedge) * f;
        v[0] = P[i][0] + ux * H; v[1] = P[i][1] + uy * H; v[2] = W * t;
      } else {
        const s = Math.pow(-sp, 0.6);
        const ex = P[i][0] + ux * Hedge, ey = P[i][1] + uy * Hedge;
        v[0] = lerp(ex, Bx, s); v[1] = lerp(ey, By, s);
        v[2] = Math.sign(t) * Math.pow(Math.abs(t), 0.45) * lerp(W, Wb, smooth(0, 0.4, s));
      }
      clampToMouth(v, jawRad);
      const k = (i * NPH + j) * 3;
      pos[k] = v[0]; pos[k + 1] = v[1]; pos[k + 2] = v[2];
    }
  }
  // centros de las tapas
  for (const [ring, c] of [[0, TONGUE_NV], [NU, TONGUE_NV + 1]]) {
    let sx = 0, sy = 0, sz = 0;
    for (let j = 0; j < NPH; j++) { const k = (ring * NPH + j) * 3; sx += pos[k]; sy += pos[k + 1]; sz += pos[k + 2]; }
    pos[c * 3] = sx / NPH; pos[c * 3 + 1] = sy / NPH; pos[c * 3 + 2] = sz / NPH;
  }
  // contactos con el paladar
  for (let n = 0; n < TONGUE_NV; n++) {
    const k = n * 3, py = palY(pos[k], pos[k + 2]);
    tongueContact[n] = py !== null && py - pos[k + 1] < 0.05 ? 1 : 0;
  }
  tongueGeo.attributes.position.needsUpdate = true;
  tongueGeo.computeVertexNormals();
  tongueGeo.computeBoundingSphere();
}

/* ---------------- Mapa de alturas y contactos (vista desde arriba) ---------------- */
const HF = { x0: 0.4, z0: -2.1, d: 0.07, nx: 76, nz: 61 };
const hfY = new Float32Array(HF.nx * HF.nz);
const hfC = new Uint8Array(HF.nx * HF.nz);
const hfTmp = new Uint8Array(HF.nx * HF.nz);
function updateHeightfield() {
  hfY.fill(-99); hfC.fill(0);
  const pos = tongueGeo.attributes.position.array;
  for (let i = 0; i <= NU; i++) for (let j = 0; j <= NPH / 2; j++) {
    const n = i * NPH + j, k = n * 3;
    const ci = Math.round((pos[k] - HF.x0) / HF.d), cj = Math.round((pos[k + 2] - HF.z0) / HF.d);
    if (ci < 0 || cj < 0 || ci >= HF.nx || cj >= HF.nz) continue;
    const c = ci * HF.nz + cj;
    if (pos[k + 1] > hfY[c]) hfY[c] = pos[k + 1];
    if (tongueContact[n]) hfC[c] = 1;
  }
  // relleno de huecos y dilatación de 1 celda
  const yCopy = hfY.slice();
  hfTmp.set(hfC);
  for (let i = 0; i < HF.nx; i++) for (let j = 0; j < HF.nz; j++) {
    const c = i * HF.nz + j;
    let m = yCopy[c], cc = hfTmp[c];
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      const ii = i + di, jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= HF.nx || jj >= HF.nz) continue;
      const c2 = ii * HF.nz + jj;
      if (yCopy[c] < -90 && yCopy[c2] > m) m = yCopy[c2];
      if (hfTmp[c2]) cc = 1;
    }
    hfY[c] = m; hfC[c] = cc;
  }
}
function hfCell(x, z) {
  const ci = Math.round((x - HF.x0) / HF.d), cj = Math.round((z - HF.z0) / HF.d);
  if (ci < 0 || cj < 0 || ci >= HF.nx || cj >= HF.nz) return -1;
  return ci * HF.nz + cj;
}
const tongueTopAt = (x, z) => { const c = hfCell(x, z); return c < 0 ? -99 : hfY[c]; };
const contactAt = (x, z) => { const c = hfCell(x, z); return c >= 0 && hfC[c] === 1; };

/* ============================================================
   Estructuras fijas o semifijas
   ============================================================ */
function palateGeometry() {
  const nu = 64, nv = 44;
  const X = u => PAL.x0 + (PAL.xEnd - PAL.x0) * Math.pow(u, 1.35);
  const inner = (u, v) => { const x = X(u), t = v * 2 - 1, w = palW(x); return [x, palYt(x, t), t * w]; };
  const outer = (u, v) => { const x = X(u), t = v * 2 - 1, w = palW(x); return [x, palYt(x, t) + 0.55 + 0.25 * (1 - smooth(0, 0.25, u)), t * w * 1.04]; };
  return buildSheet(nu, nv, inner, outer, true);
}

const VEL_UP = [[5.3, 2.15], [6.0, 2.5], [6.7, 2.66], [7.05, 2.38], [7.1, 1.88]];
const VEL_DOWN = [[5.3, 2.15], [5.95, 1.85], [6.45, 1.4], [6.75, 0.9], [6.85, 0.45]];
let velumMid = [];
function velumGeometry(elev) {
  const ctrl = VEL_UP.map((p, i) => [lerp(VEL_DOWN[i][0], p[0], elev), lerp(VEL_DOWN[i][1], p[1], elev)]);
  const C = resample2(ctrl, 41);
  velumMid = C;
  const frame = u => {
    const i = Math.round(u * 40), a = C[Math.max(0, i - 1)], b = C[Math.min(40, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1;
    return { p: C[i], nx: -ty / l, ny: tx / l };
  };
  const wv = u => lerp(1.6, 0.3, smooth(0.55, 1.0, u)), th = u => lerp(0.62, 0.36, u);
  const inner = (u, v) => { const f = frame(u), t = v * 2 - 1; return [f.p[0], f.p[1] - 0.25 * t * t * (1 - u), t * wv(u)]; };
  const outer = (u, v) => { const f = frame(u), t = v * 2 - 1, h = th(u); return [f.p[0] + f.nx * h, f.p[1] - 0.25 * t * t * (1 - u) + f.ny * h, t * wv(u)]; };
  return buildSheet(40, 16, inner, outer);
}
function velumUnderY(x) {
  let best = null, bd = 1e9;
  for (const p of velumMid) { const d = Math.abs(p[0] - x); if (d < bd) { bd = d; best = p[1]; } }
  return bd < 0.25 ? best : null;
}

function pharynxGeometry() {
  const wall = resample2([[6.0, 4.3], [6.85, 4.05], [7.45, 3.5], [7.65, 2.6], [7.7, 1.2], [7.6, -0.8], [7.45, -3.0], [7.35, -5.2], [7.35, -6.8]], 61);
  const fr = u => {
    const i = Math.round(u * 60), a = wall[Math.max(0, i - 1)], b = wall[Math.min(60, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    return { p: wall[i], nx: ty, ny: -tx }; // normal hacia la vía aérea (adelante)
  };
  const BM = 1.45;
  const mk = off => (u, v) => {
    const f = fr(u), b = (v * 2 - 1) * BM, Rn = 1.4 + off, Rz = 1.75 + off;
    const d = Rn * (1 - Math.cos(b)) - off;
    return [f.p[0] + f.nx * d, f.p[1] + f.ny * d, Rz * Math.sin(b)];
  };
  return buildSheet(60, 28, mk(0), mk(0.45));
}

function larynxGeometry() {
  const inner = (u, v) => { const y = lerp(-4.35, -8.8, u), a = Math.PI / 2 + v * Math.PI * 2; return [6.2 + 0.75 * Math.cos(a), y, 0.82 * Math.sin(a)]; };
  const outer = (u, v) => { const y = lerp(-4.35, -8.8, u), a = Math.PI / 2 + v * Math.PI * 2; return [6.2 + 1.05 * Math.cos(a), y, 1.12 * Math.sin(a)]; };
  return buildSheet(24, 48, inner, outer);
}

function epiglottisGeometry() {
  const C = resample2([[6.05, -4.35], [6.2, -3.6], [6.45, -2.9], [6.8, -2.45]], 21);
  const w = u => 0.25 + 0.6 * smooth(0, 0.6, u);
  const inner = (u, v) => { const p = C[Math.round(u * 20)], t = v * 2 - 1; return [p[0] + 0.28 * t * t * smooth(0.2, 1, u), p[1], t * w(u)]; };
  const outer = (u, v) => { const p = C[Math.round(u * 20)], t = v * 2 - 1; return [p[0] + 0.28 * t * t * smooth(0.2, 1, u) - 0.13, p[1] + 0.03, t * w(u)]; };
  return buildSheet(20, 12, inner, outer);
}

function foldsGeometry(abd, phase) {
  // cuerdas vocales vistas como dos cuñas; abd = separación, phase = vibración
  const geos = [];
  for (const sd of [1, -1]) {
    const gap = x => { const k = (x - 5.5) / 1.35; return 0.02 + abd * (0.08 + 0.42 * k) + phase * 0.06 * Math.sin(Math.PI * k); };
    const inner = (u, v) => { const x = lerp(5.5, 6.85, u), z = lerp(gap(x), 0.8, v); return [x, -6.35 - 0.06 * (1 - v), sd * z]; };
    const outer = (u, v) => { const x = lerp(5.5, 6.85, u), z = lerp(gap(x) + 0.05, 0.8, v); return [x, -6.35 - 0.1 - 0.45 * v, sd * z]; };
    geos.push(buildSheet(10, 4, inner, outer));
  }
  return mergeGeometries(geos);
}

// Sección de los labios (c: hacia delante desde el arco, y): borde libre en yEdge
const LIP_UP = [[-0.42, 0.1], [0.05, 0.0], [0.5, 0.12], [0.74, 0.42], [0.72, 0.78], [0.8, 1.3], [0.92, 1.85], [0.3, 2.05], [-0.42, 1.9], [-0.5, 1.0]];
const LIP_LO = [[-0.42, -0.1], [0.05, 0.0], [0.5, -0.1], [0.72, -0.4], [0.68, -0.8], [0.5, -1.25], [0.58, -1.6], [-0.1, -1.75], [-0.45, -1.5], [-0.5, -0.7]];
function closedSmooth(pts, n) {
  const m = pts.length, out = [];
  for (let k = 0; k < n; k++) {
    const f = k / n * m, i = Math.floor(f), t = f - i;
    const p0 = pts[(i - 1 + m) % m], p1 = pts[i % m], p2 = pts[(i + 1) % m], p3 = pts[(i + 2) % m];
    const c = (a, b, cc, d) => 0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t * t + (-a + 3 * b - 3 * cc + d) * t * t * t);
    out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
  }
  return out;
}
const LIP_UP_S = closedSmooth(LIP_UP, 30), LIP_LO_S = closedSmooth(LIP_LO, 30);
function lipGeometry(upper, yEdge, spread) {
  const am = 0.95, R = 3.0, xL = 2.45, nS = 44, rings = [], sec = upper ? LIP_UP_S : LIP_LO_S;
  for (let i = 0; i <= nS; i++) {
    const al = -am + 2 * am * i / nS, tau = Math.pow(Math.max(0, 1 - (al / am) ** 2), 0.45);
    const cx = xL - R * Math.cos(al), cz = R * Math.sin(al) * spread;
    const ox = -Math.cos(al), oz = Math.sin(al);
    const ks = lerp(0.12, 1, tau), kv = lerp(0.2, 1, tau);
    rings.push(sec.map(([c, v]) => { const cc = c * ks; return [cx + ox * cc, yEdge + v * kv, cz + oz * cc]; }));
  }
  return buildSweep(rings);
}

function floorGeometry() {
  // suelo de la boca (en coordenadas de la mandíbula)
  const wl = x => { const d = (x - 0.95) / 1.75; return d >= 1 ? 1.45 : 1.45 * Math.sqrt(Math.max(0, 1 - (1 - d) * (1 - d))); };
  const X = u => lerp(1.0, 3.2, u);
  const inner = (u, v) => { const x = X(u), t = v * 2 - 1; return [x, -1.5 - 0.35 * u + 0.35 * Math.pow(Math.abs(t), 3), t * wl(x)]; };
  const outer = (u, v) => { const x = X(u), t = v * 2 - 1; return [x, -2.9 - 0.3 * u, t * wl(x)]; };
  return buildSheet(16, 20, inner, outer);
}

function profileCurve(pts) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], -0.02))), 120, 0.03, 6, false);
}
