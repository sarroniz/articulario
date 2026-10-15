
/* ============================================================
   Escena
   ============================================================ */
const $ = id => document.getElementById(id);
const viewerEl = $('viewer');
const tok = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888888';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new THREE.WebGLRenderer({ antialias: true, stencil: true });
function showGLError() {
  if ($('glErr')) return;
  const p = document.createElement('p');
  p.id = 'glErr'; p.className = 'glerr';
  p.textContent = 'Este navegador no ha podido dibujar el modelo 3D. Recarga la página y, si sigue en blanco, prueba con otro navegador.';
  viewerEl.appendChild(p);
}
renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); showGLError(); });
renderer.domElement.addEventListener('webglcontextrestored', () => { const m = $('glErr'); if (m) m.remove(); });
renderer.debug.onShaderError = (gl, program, vs, fs) => { console.error('WebGL shader error', gl.getProgramInfoLog(program), gl.getShaderInfoLog(fs)); showGLError(); };
const hasStencil = !!(renderer.getContext().getContextAttributes() || {}).stencil;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.localClippingEnabled = true;
viewerEl.prepend(renderer.domElement);
const labelRenderer = new CSS2DRenderer();
Object.assign(labelRenderer.domElement.style, { position: 'absolute', left: '4px', top: '4px', pointerEvents: 'none', zIndex: '1' });
viewerEl.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 300);
scene.add(camera);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.12;
controls.minDistance = 6;
controls.maxDistance = 60;

scene.add(new THREE.HemisphereLight(0xffffff, 0x8f8280, 1.15));
const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(-6, 10, 14); scene.add(key);
const rim = new THREE.DirectionalLight(0xffffff, 0.45); rim.position.set(12, -4, -10); scene.add(rim);
const head = new THREE.DirectionalLight(0xffffff, 0.9); head.position.set(0, 0, 0); camera.add(head); head.target.position.set(0, 0, -1); camera.add(head.target);

const sagPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.001);
const sagBack = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0.4);
const corBack = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 2.2);
const corPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), -1.7);
const allMats = [];
const reg = m => { allMats.push(m); return m; };

const C = {
  tongue: 0xd46a78, tongueCap: 0xc9606e,
  pal: 0xe7a9a7, palCap: 0xdcaaa4,
  teeth: 0xf4eedf, teethCap: 0xece4d0,
  lips: 0xcd6d72, lipsCap: 0xc96f75,
  velum: 0xdf9a9e, velumCap: 0xd99599,
  phar: 0xdaa2a3, pharCap: 0xd7a3a4,
  lar: 0xd9aaa6, larCap: 0xd2a6a2,
  folds: 0xf0dcd2, foldsCap: 0xe6d0c4,
  mand: 0xe8b2ad, mandCap: 0xe0b3ad,
};
const matTongue = reg(tissue(0xffffff, C.tongueCap, { vc: true, rough: 0.5 }));
const matPal = reg(tissue(0xffffff, C.palCap, { vc: true }));
const matTeeth = reg(tissue(C.teeth, C.teethCap, { rough: 0.35 }));
const matGum = reg(tissue(C.pal, C.palCap));
const matMand = reg(tissue(C.mand, C.mandCap));
const matLips = reg(tissue(C.lips, C.lipsCap, { rough: 0.5 }));
const matVelum = reg(tissue(C.velum, C.velumCap));
const matPhar = reg(tissue(C.phar, C.pharCap));
const matLar = reg(tissue(C.lar, C.larCap));
const matFolds = reg(tissue(C.folds, C.foldsCap));
const matProfile = reg(new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.55 }));

const colTongue = new THREE.Color(C.tongue), colPal = new THREE.Color(C.pal), colContact = new THREE.Color(0xe58a22);

// Paladar
const palGeo = palateGeometry();
const palate = new THREE.Mesh(palGeo, matPal); scene.add(palate);
{
  const col = palGeo.attributes.color.array;
  for (let i = 0; i < col.length; i += 3) { col[i] = colPal.r; col[i + 1] = colPal.g; col[i + 2] = colPal.b; }
}
const upperTeeth = new THREE.Mesh(teethRow(UPPER_TEETH, UPPER, true, () => 0), matTeeth); scene.add(upperTeeth);
const upperBand = new THREE.Mesh(archBand(UPPER, 5.85, 140, 28, s => {
  const y0 = lerp(0.98, 0.72, smooth(1.0, 3.5, s)), y1 = lerp(2.15, 1.65, smooth(0.5, 3.5, s));
  const tilt = lerp(0.25, 0, smooth(0.8, 2.4, s));
  return { yc: (y0 + y1) / 2, hv: (y1 - y0) / 2, cc: lerp(0.12, 0.0, smooth(0.5, 2.0, s)), hc: lerp(0.5, 0.45, smooth(1, 3.5, s)), e: 0.45, lean: v => v * Math.tan(tilt) };
}), matGum); scene.add(upperBand);

// Mandíbula (gira alrededor de la ATM)
const jawPivot = new THREE.Group(); jawPivot.position.set(JAW_PIVOT.x, JAW_PIVOT.y, 0); scene.add(jawPivot);
const jaw = new THREE.Group(); jaw.position.set(-JAW_PIVOT.x, -JAW_PIVOT.y, 0); jawPivot.add(jaw);
const lowerTeeth = new THREE.Mesh(teethRow(LOWER_TEETH, LOWER, false, k => (k < 2 ? 0.2 : k === 2 ? 0.1 : 0)), matTeeth); jaw.add(lowerTeeth);
const lowerBand = new THREE.Mesh(archBand(LOWER, 5.7, 140, 28, s => {
  const y0 = -0.68, y1 = lerp(-3.35, -2.75, smooth(0.5, 4, s));
  const tilt = lerp(0.2, 0, smooth(0.8, 2.2, s)), front = 1 - smooth(0.5, 1.6, s);
  return { yc: (y0 + y1) / 2, hv: (y1 - y0) / 2, cc: 0, hc: lerp(0.45, 0.52, smooth(1, 4, s)), e: 0.5, lean: v => (-v) * Math.tan(tilt) - 0.4 * smooth(-1.6, -3.0, v) * front };
}), matMand); jaw.add(lowerBand);
const floor = new THREE.Mesh(floorGeometry(), matMand); jaw.add(floor);

// Velo, faringe, laringe, epiglotis, cuerdas
let velumElev = -1;
const velum = new THREE.Mesh(new THREE.BufferGeometry(), matVelum); scene.add(velum);
const pharynx = new THREE.Mesh(pharynxGeometry(), matPhar); scene.add(pharynx);
const larynx = new THREE.Mesh(larynxGeometry(), matLar); scene.add(larynx);
const epiglottis = new THREE.Mesh(epiglottisGeometry(), matLar); scene.add(epiglottis);
const folds = new THREE.Mesh(new THREE.BufferGeometry(), matFolds); scene.add(folds);

// Labios
const upperLip = new THREE.Mesh(new THREE.BufferGeometry(), matLips); scene.add(upperLip);
const lowerLip = new THREE.Mesh(new THREE.BufferGeometry(), matLips); scene.add(lowerLip);

// Lengua
const tongue = new THREE.Mesh(tongueGeo, matTongue); scene.add(tongue);

// Perfil del rostro (referencia)
const profUpper = new THREE.Mesh(profileCurve([[-1.0, 8.6], [-1.35, 7.6], [-0.95, 6.85], [-1.55, 5.7], [-2.3, 4.35], [-2.95, 3.3], [-2.7, 2.6], [-1.6, 2.2], [-1.3, 1.9]]), matProfile); scene.add(profUpper);
const profChin = new THREE.Mesh(profileCurve([[-1.05, -1.55], [-0.75, -1.95], [-1.15, -2.8], [-1.1, -3.5], [-0.5, -4.05], [0.9, -4.35], [2.3, -4.55]]), matProfile); jaw.add(profChin);
const profNeck = new THREE.Mesh(profileCurve([[2.6, -4.65], [3.7, -5.4], [4.2, -7.2], [4.35, -9.2]]), matProfile); scene.add(profNeck);

/* ---------------- Relleno de los cortes (stencil) ---------------- */
const capPlaneGeo = new THREE.PlaneGeometry(60, 60);
const capItems = [];
let capOrder = 1;
function addCaps(mesh, capHex) {
  const mk = (side, op) => new THREE.MeshBasicMaterial({ side, depthWrite: false, depthTest: false, colorWrite: false, stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc, stencilFail: op, stencilZFail: op, stencilZPass: op });
  const sb = new THREE.Mesh(mesh.geometry, mk(THREE.BackSide, THREE.IncrementWrapStencilOp));
  const sf = new THREE.Mesh(mesh.geometry, mk(THREE.FrontSide, THREE.DecrementWrapStencilOp));
  sb.renderOrder = sf.renderOrder = capOrder;
  sb.frustumCulled = sf.frustumCulled = false;
  mesh.add(sb, sf);
  const pm = new THREE.MeshBasicMaterial({ color: capHex, stencilWrite: true, stencilRef: 0, stencilFunc: THREE.NotEqualStencilFunc, stencilFail: THREE.ReplaceStencilOp, stencilZFail: THREE.ReplaceStencilOp, stencilZPass: THREE.ReplaceStencilOp });
  const plane = new THREE.Mesh(capPlaneGeo, pm);
  plane.renderOrder = capOrder + 0.5;
  plane.onAfterRender = r => r.clearStencil();
  plane.visible = false;
  scene.add(plane);
  mesh.renderOrder = 100;
  capItems.push({ mesh, sb, sf, plane });
  capOrder += 1;
}
// Actualiza la geometría de una malla sin crear buffers nuevos en la GPU si la topología no cambia
function setGeometry(mesh, g) {
  const old = mesh.geometry, op = old.attributes.position;
  if (op && old.index && g.index && op.count === g.attributes.position.count && old.index.count === g.index.count) {
    op.array.set(g.attributes.position.array); op.needsUpdate = true;
    old.attributes.normal.array.set(g.attributes.normal.array); old.attributes.normal.needsUpdate = true;
    old.index.array.set(g.index.array); old.index.needsUpdate = true;
    old.computeBoundingSphere();
    g.dispose();
    return false;
  }
  old.dispose(); mesh.geometry = g;
  return true;
}
const worldVisible = o => { while (o) { if (!o.visible) return false; o = o.parent; } return true; };
let capPlane = null;
function setCapPlane(pl) {
  if (!hasStencil) pl = null; // sin stencil, el relleno lo hacen las caras traseras
  capPlane = pl;
  for (const c of capItems) {
    for (const m of [c.sb, c.sf]) { m.material.clippingPlanes = pl ? [pl] : []; m.material.needsUpdate = true; m.visible = !!pl; }
  }
  syncCaps();
}
function syncCaps() {
  for (const c of capItems) {
    c.sb.geometry = c.sf.geometry = c.mesh.geometry;
    const on = !!capPlane && worldVisible(c.mesh);
    c.plane.visible = on;
    if (on) {
      const n = capPlane.normal;
      // el plano conserva n·p + d >= 0; el relleno mira hacia la cámara (lado recortado)
      c.plane.position.copy(n).multiplyScalar(-capPlane.constant);
      c.plane.lookAt(c.plane.position.clone().sub(n));
    }
  }
}
addCaps(palate, C.palCap); addCaps(upperTeeth, C.teethCap); addCaps(upperBand, C.palCap);
addCaps(lowerTeeth, C.teethCap); addCaps(lowerBand, C.mandCap); addCaps(floor, C.mandCap);
addCaps(velum, C.velumCap); addCaps(pharynx, C.pharCap); addCaps(larynx, C.larCap); addCaps(epiglottis, C.larCap);
addCaps(folds, C.foldsCap); addCaps(upperLip, C.lipsCap); addCaps(lowerLip, C.lipsCap); addCaps(tongue, C.tongueCap);

/* ---------------- Flujo de aire ---------------- */
const FLOW_N = 640;
const flowPos = new Float32Array(FLOW_N * 3);
const flowGeo = new THREE.BufferGeometry(); flowGeo.setAttribute('position', new THREE.BufferAttribute(flowPos, 3));
const dotTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const flowMat = reg(new THREE.PointsMaterial({ size: 0.2, map: dotTex, transparent: true, depthWrite: false, color: 0x1d6fa5 }));
const flow = new THREE.Points(flowGeo, flowMat); flow.frustumCulled = false; flow.renderOrder = 5; scene.add(flow);
const parts = Array.from({ length: FLOW_N }, (_, i) => ({ s: Math.random(), p: i % 2, j: [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1], sp: 0.85 + Math.random() * 0.3 }));
let flowPaths = [], flowKind = 'none', flowKey = '', flowAlpha = 0, flowConstr = 0.7;

function oralMid(x, z, fallback) {
  let top = palY(x, z);
  if (top === null) top = velumUnderY(x);
  const t = tongueTopAt(x, z);
  if (top === null || t < -90) return fallback;
  return (top + t) / 2;
}
function computeFlow(key) {
  const back = [[6.2, -6.6], [6.25, -5.1], [6.95, -3.7], [7.02, -2.1], [7.0, -0.4], [6.8, 1.1]];
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const mkBack = z => back.map(p => V(p[0], p[1], z));
  const zc = -0.05;
  if (key === 'l') {
    const pathFor = sd => {
      const pts = mkBack(0);
      pts.push(V(6.15, oralMid(6.15, 0, 1.8), 0));
      for (const x of [5.4, 4.6, 3.8]) pts.push(V(x, oralMid(x, 0, 1.9), sd * 0.1));
      pts.push(V(3.05, oralMid(3.05, sd * 0.65, 1.6), sd * 0.65));
      pts.push(V(2.35, oralMid(2.35, sd * 1.05, 1.2), sd * 1.05));
      pts.push(V(1.7, oralMid(1.7, sd * 1.15, 0.9), sd * 1.15));
      pts.push(V(1.15, 0.55, sd * 1.0));
      pts.push(V(0.78, 0.1, sd * 0.86));
      pts.push(V(0.42, -0.3, sd * 0.76));
      pts.push(V(-0.3, -0.24, sd * 0.52));
      pts.push(V(-0.95, -0.22, sd * 0.45));
      pts.push(V(-2.4, -0.32, sd * 0.62));
      return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    };
    flowPaths = [pathFor(-1), pathFor(1)];
    flowKind = 'lateral';
  } else {
    const pts = mkBack(zc);
    pts.push(V(6.15, oralMid(6.15, 0, 1.9), zc));
    for (const x of [5.4, 4.6, 3.8, 3.0, 2.3, 1.75, 1.35]) pts.push(V(x, oralMid(x, 0, 1.6), zc));
    if (key === 's_ap') {
      pts.push(V(1.07, oralMid(1.07, 0, 1.05), zc));
      pts.push(V(0.84, 0.66, zc)); pts.push(V(0.56, 0.16, zc));
    } else {
      pts.push(V(1.1, oralMid(1.1, 0, 1.15), zc));
      pts.push(V(0.84, 0.72, zc)); pts.push(V(0.62, 0.28, zc));
    }
    pts.push(V(0.3, -0.07, zc)); pts.push(V(-0.25, -0.03, zc)); pts.push(V(-0.95, 0.0, zc)); pts.push(V(-2.4, -0.08, zc));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    // fracción del recorrido donde está la estrechez
    const L = curve.getLength(); let acc = 0, lc = 0;
    const lens = curve.getLengths(400);
    for (let i = 0; i <= 400; i++) { const p = curve.getPoint(i / 400); if (p.x < 1.2 && p.y > 0.4) { lc = lens[i]; break; } }
    flowConstr = lc / L || 0.7;
    flowPaths = [curve];
    flowKind = 'central';
  }
  flowKey = key;
}
const _v = new THREE.Vector3();
function updateFlow(dt, now) {
  flow.visible = $('tFlow').checked && flowAlpha > 0.01 && flowPaths.length > 0 && view !== 'pal';
  flowMat.opacity = flowAlpha;
  flowMat.size = 0.24 * Math.tan(Math.PI / 12) / Math.tan(camera.fov * Math.PI / 360) / camera.zoom;
  if (!flow.visible) return;
  const speed = (flowKind === 'central' ? 0.2 : 0.16) * (reduceMotion ? 0.35 : 1);
  for (let i = 0; i < FLOW_N; i++) {
    const q = parts[i];
    q.s += dt * speed * q.sp;
    if (q.s >= 1) { q.s -= 1; q.j = [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1]; }
    const path = flowPaths[q.p % flowPaths.length];
    path.getPointAt(q.s, _v);
    let amp = 0.07;
    if (flowKind === 'central') {
      const after = smooth(flowConstr, flowConstr + 0.1, q.s);
      amp = lerp(0.1, 0.035, smooth(flowConstr - 0.35, flowConstr, q.s)) + after * 0.28 * (0.5 + 0.5 * Math.sin(now * 0.013 + i));
      if (q.s < 0.35) amp = 0.16;
      _v.x += q.j[0] * amp; _v.y += q.j[1] * amp; _v.z += q.j[2] * Math.min(amp, 0.05);
      if (_v.z > 0) _v.z = -_v.z * 0.5; // mantener el chorro visible en el corte medio
    } else {
      amp = q.s < 0.35 ? 0.16 : 0.08;
      _v.x += q.j[0] * amp; _v.y += q.j[1] * amp; _v.z += q.j[2] * amp;
    }
    flowPos[i * 3] = _v.x; flowPos[i * 3 + 1] = _v.y; flowPos[i * 3 + 2] = _v.z;
  }
  flowGeo.attributes.position.needsUpdate = true;
}

/* ---------------- Etiquetas ---------------- */
const labels = [];
function addLabel(text, side, getPos, views) {
  const el = document.createElement('div');
  el.className = 'lbl ' + side;
  el.innerHTML = '<i></i><span></span>';
  el.querySelector('span').textContent = text;
  const o = new CSS2DObject(el);
  scene.add(o);
  labels.push({ o, getPos, views });
}
const tipPos = (u, inset) => () => {
  const i = Math.round(u * NU), P = tongueSpine.P[i], N = tongueSpine.N[i];
  return P ? [P[0] - N[0] * inset, P[1] - N[1] * inset, -0.02] : [0, 0, 0];
};
addLabel('labios', 'l', () => [-1.3, cur.yU + 0.75, -0.02], ['3d', 'sag']);
addLabel('alvéolos', 't', () => [1.18, 1.2, -0.02], ['3d', 'sag', 'pal']);
addLabel('paladar duro', 't', () => [3.5, 2.72, -0.02], ['3d', 'sag', 'pal']);
addLabel('velo', 't', () => { const p = velumMid[18] || [6, 2.5]; return [p[0], p[1] + 0.55, -0.02]; }, ['3d', 'sag', 'pal']);
addLabel('ápice', 'b', tipPos(0, 0.05), ['3d', 'sag']);
addLabel('dorso', 'b', tipPos(0.42, 0.35), ['3d', 'sag']);
addLabel('faringe', 'r', () => [7.02, -1.0, -0.02], ['3d', 'sag']);
addLabel('epiglotis', 'r', () => [6.72, -2.62, -0.02], ['3d', 'sag']);
addLabel('cuerdas vocales', 'r', () => [6.3, -6.4, -0.02], ['3d', 'sag']);
addLabel('paladar', 't', () => [corX(), (palY(corX(), 0) ?? 2) + 0.4, 0], ['cor']);
addLabel('lengua', 'b', () => { const t = tongueTopAt(corX(), 0); return [corX(), (t > -90 ? t : 0.5) - 0.55, 0]; }, ['cor']);
function updateLabels() {
  const on = $('tLabels').checked;
  for (const L of labels) {
    const vis = on && L.views.includes(view) && !(view === '3d' && !$('tCut').checked);
    L.o.visible = vis;
    if (vis) { const p = L.getPos(); L.o.position.set(p[0], p[1], p[2]); }
  }
}
