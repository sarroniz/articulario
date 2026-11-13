
/* ============================================================
   Estado
   ============================================================ */
let sound = 'rest', view = '3d'; // al abrir: posición de reposo, sin sonido elegido
const targetKey = () => sound;
let cur = mixPosture(POSTURES.rest, POSTURES.rest, 1);
let kNow = 1, tween = null, dirty = true, playing = false;
const corX = () => parseFloat($('corX').value);
const fmt = (n, d = 1) => n.toFixed(d).replace('.', ',');

/* ---------------- Aplicar postura al modelo ---------------- */
function applyPosture() {
  const jr = cur.jaw * Math.PI / 180;
  jawPivot.rotation.z = jr;
  buildTongue(cur, jr);
  updateHeightfield();
  if (Math.abs(cur.velum - velumElev) > 0.002) {
    if (setGeometry(velum, velumGeometry(cur.velum))) syncCaps(); velumElev = cur.velum;
  }
  const a = setGeometry(upperLip, lipGeometry(true, cur.yU, cur.spread));
  const b = setGeometry(lowerLip, lipGeometry(false, cur.yL, cur.spread));
  if (a || b) syncCaps();
  paintContacts();
  drawEPG();
  if (view === 'cor') updateCorText();
}

function paintContacts() {
  const show = $('tContact').checked;
  const tc = tongueGeo.attributes.color.array;
  for (let n = 0; n < TONGUE_NV + 2; n++) {
    const c = show && tongueContact[n] ? colContact : colTongue;
    tc[n * 3] = c.r; tc[n * 3 + 1] = c.g; tc[n * 3 + 2] = c.b;
  }
  tongueGeo.attributes.color.needsUpdate = true;
  const pc = palGeo.attributes.color.array, pp = palGeo.attributes.position.array, n0 = palGeo.userData.innerCount;
  for (let n = 0; n < n0; n++) {
    const on = show && contactAt(pp[n * 3], pp[n * 3 + 2]);
    const c = on ? colContact : colPal;
    pc[n * 3] = c.r; pc[n * 3 + 1] = c.g; pc[n * 3 + 2] = c.b;
  }
  palGeo.attributes.color.needsUpdate = true;
}

/* ---------------- Palatograma (EPG, 62 electrodos) ---------------- */
const EPG_ROWS = [0.95, 1.3, 1.7, 2.15, 2.7, 3.3, 4.0, 4.75];
const EPG = [];
EPG_ROWS.forEach((x, r) => {
  const W = palW(x) * 0.96;
  const ts = r === 0 ? [-0.86, -0.52, -0.17, 0.17, 0.52, 0.86] : [-0.88, -0.63, -0.38, -0.13, 0.13, 0.38, 0.63, 0.88];
  ts.forEach(t => EPG.push({ r, x, z: t * W }));
});
function drawEPG() {
  const cv = $('epg'), g = cv.getContext('2d'), Wc = cv.width, Hc = cv.height;
  const ink = tok('--ink'), muted = tok('--muted'), line = tok('--line'), surf = tok('--surface'), contact = tok('--contact');
  g.clearRect(0, 0, Wc, Hc);
  const L = 14, T = 46, s = 88;
  const X = z => L + (z + 1.85) * s, Y = x => T + (x - 0.72) * s;
  // contorno del paladar
  g.beginPath();
  const xs = []; for (let x = 0.8; x <= 5.0; x += 0.05) xs.push(x);
  xs.forEach((x, i) => { const w = palW(x) + 0.12; if (i === 0) g.moveTo(X(w), Y(x)); else g.lineTo(X(w), Y(x)); });
  for (let i = xs.length - 1; i >= 0; i--) { const w = palW(xs[i]) + 0.12; g.lineTo(X(-w), Y(xs[i])); }
  g.closePath(); g.fillStyle = surf; g.fill(); g.lineWidth = 2; g.strokeStyle = line; g.stroke();
  // electrodos
  let nOn = 0;
  for (const e of EPG) {
    const on = contactAt(e.x, e.z); if (on) nOn++;
    g.beginPath(); g.arc(X(e.z), Y(e.x), 9.5, 0, Math.PI * 2);
    if (on) { g.fillStyle = contact; g.fill(); } else { g.lineWidth = 2.5; g.strokeStyle = muted; g.stroke(); }
  }
  // rótulos
  g.fillStyle = muted; g.font = '500 18px "IBM Plex Mono", ui-monospace, monospace'; g.textAlign = 'center';
  g.fillText('ANTERIOR', X(0), 26);
  g.textAlign = 'left'; g.textBaseline = 'middle';
  const zone = (r0, r1, txt) => {
    const y0 = Y(EPG_ROWS[r0]) - 9, y1 = Y(EPG_ROWS[r1]) + 9, xr = X(1.85) + 4;
    g.strokeStyle = line; g.lineWidth = 2; g.beginPath(); g.moveTo(xr, y0); g.lineTo(xr + 6, y0); g.lineTo(xr + 6, y1); g.lineTo(xr, y1); g.stroke();
    g.fillText(txt, xr + 12, (y0 + y1) / 2);
  };
  zone(0, 1, 'alv.'); zone(2, 3, 'postalv.'); zone(4, 7, 'palatal');
  g.textBaseline = 'alphabetic';
  // escala
  const yb = Hc - 18; g.strokeStyle = ink; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(L, yb); g.lineTo(L + s, yb); g.moveTo(L, yb - 6); g.lineTo(L, yb + 6); g.moveTo(L + s, yb - 6); g.lineTo(L + s, yb + 6); g.stroke();
  g.fillStyle = ink; g.textAlign = 'left'; g.fillText('1 cm', L + s + 10, yb + 7);
  g.textAlign = 'right'; g.fillStyle = muted; g.fillText(nOn + '/62', Wc - 8, yb + 7);
}

/* ---------------- Glotis (vista superior) ---------------- */
function drawGlottis(now) {
  const cv = $('glot'), g = cv.getContext('2d'), W = cv.width, H = cv.height;
  const muted = tok('--muted'), ink = tok('--ink');
  g.clearRect(0, 0, W, H);
  const cx = W / 2, top = 46, bot = H - 52;
  const vib = cur.voice > 0.02 && !reduceMotion ? cur.voice * (0.5 + 0.5 * Math.sin(now * 0.02)) : cur.voice * 0.5;
  const a = 3 + cur.abd * 44 + vib * 7;
  // vía aérea
  g.beginPath(); g.moveTo(cx, top); g.lineTo(cx + a, bot); g.lineTo(cx - a, bot); g.closePath();
  g.fillStyle = '#1b2026'; g.fill();
  for (const sd of [-1, 1]) {
    g.beginPath(); g.moveTo(cx, top); g.lineTo(cx + sd * a, bot); g.lineTo(cx + sd * (a + 46), bot); g.lineTo(cx + sd * 50, top + 6); g.closePath();
    g.fillStyle = '#efd9cf'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#b88f86'; g.stroke();
    g.beginPath(); g.arc(cx + sd * (a + 20), bot + 14, 14, 0, Math.PI * 2); g.fillStyle = '#d8aaa4'; g.fill();
  }
  g.fillStyle = muted; g.font = '500 19px "IBM Plex Mono", ui-monospace, monospace'; g.textAlign = 'center';
  g.fillText('ANTERIOR', cx, 28);
  g.fillText('POSTERIOR', cx, H - 6);
}

/* ---------------- Texto del corte coronal ---------------- */
function updateCorText() {
  const x = corX();
  $('corXv').textContent = fmt(Math.max(0, x - 0.1)) + ' cm';
  const w = palW(x);
  let cOpen = false, cCont = false, lOpen = false, lCont = false, any = false;
  for (let z = -1.6; z <= 1.6; z += 0.05) {
    const t = tongueTopAt(x, z), p = palY(x, z);
    if (p === null) continue;
    if (t > -90) any = true;
    const cont = t > -90 && contactAt(x, z), open = !cont && (t < -90 || p - t > 0.06);
    if (Math.abs(z) < 0.2) { if (cont) cCont = true; if (open) cOpen = true; }
    if (Math.abs(z) > 0.55 && Math.abs(z) < w - 0.05) { if (cont) lCont = true; if (open) lOpen = true; }
  }
  let s;
  if (!any || w < 0.3) s = 'Este corte queda delante de la lengua o fuera del paladar.';
  else if (cOpen && lCont) s = 'Canal central abierto; los bordes de la lengua tocan el paladar a ambos lados.';
  else if (cCont && lOpen) s = 'Contacto en la línea media; el aire pasa por los lados de la lengua.';
  else if (cCont && lCont) s = 'Cierre completo en este corte.';
  else if (cOpen && lOpen) s = 'Sin contacto: la lengua no toca el paladar en este corte.';
  else s = 'Contacto parcial en este corte.';
  $('corText').textContent = s;
}

/* ---------------- Descripciones ---------------- */
const DESC = {
  rest: {
    title: 'Posición de reposo', kR: '—',
    list: [['Labios', 'juntos'], ['Lengua', 'relajada'], ['Velo', 'bajado (respiración nasal)'], ['Glotis', 'abierta']],
    text: 'Así está el tracto vocal cuando no se habla: los labios están juntos, la lengua descansa con la punta detrás de los incisivos inferiores, el velo del paladar está bajado para respirar por la nariz y las cuerdas vocales están separadas. Elige un sonido en el cuadro para ver cómo se articula.'
  },
  s: {
    title: '<span class="ipa">[s]</span> fricativa alveolar sorda', kR: '[s]',
    list: [['Punto', 'alveolar'], ['Modo', 'fricativo'], ['Sonoridad', 'sorda'], ['Velo', 'elevado (oral)']],
    text: 'La punta de la lengua queda apoyada detrás de los incisivos inferiores y el predorso se eleva hacia los alvéolos hasta dejar una estrechez mínima. Los bordes de la lengua se apoyan en las encías y los molares superiores, así que el aire solo puede salir por un surco estrecho en el centro. El chorro choca contra los incisivos y produce la turbulencia característica de la fricativa. Las cuerdas vocales están separadas y no vibran. En el palatograma, el contacto dibuja una herradura abierta por el centro.'
  },
  l: {
    title: '<span class="ipa">[l]</span> lateral alveolar sonora', kR: '[l]',
    list: [['Punto', 'alveolar'], ['Modo', 'lateral'], ['Sonoridad', 'sonora'], ['Velo', 'elevado (oral)']],
    text: 'El ápice de la lengua se apoya en los alvéolos y cierra el paso del aire en la línea media. Los bordes de la lengua descienden y dejan, a uno o a ambos lados, un canal por el que el aire sale sin turbulencia. El dorso se mantiene adelantado, sin elevarse hacia el velo. Las cuerdas vocales vibran durante toda la articulación. En el palatograma solo hay contacto en la zona alveolar central.'
  },
  p: {
    title: '<span class="ipa">[p]</span> oclusiva bilabial sorda', kR: '[p]',
    list: [['Punto', 'bilabial'], ['Modo', 'oclusivo'], ['Sonoridad', 'sorda'], ['Velo', 'elevado (oral)']],
    text: 'Los labios se cierran por completo y el velo del paladar está elevado, así que el aire no puede salir ni por la boca ni por la nariz: se acumula detrás de los labios y aumenta la presión. Cuando los labios se separan, el aire sale de golpe y produce una breve explosión. Las cuerdas vocales están separadas y no vibran. En español la [p] no es aspirada: la vibración de la vocal siguiente empieza casi inmediatamente después de la explosión. La lengua no participa en la articulación y en el palatograma no aparece ningún contacto.'
  },
  b: {
    title: '<span class="ipa">[b]</span> oclusiva bilabial sonora', kR: '[b]',
    list: [['Punto', 'bilabial'], ['Modo', 'oclusivo'], ['Sonoridad', 'sonora'], ['Velo', 'elevado (oral)']],
    text: 'Los labios se cierran por completo y el velo del paladar está elevado, así que el aire no puede salir ni por la boca ni por la nariz y se acumula detrás de los labios. Las cuerdas vocales vibran durante toda la oclusión, por eso antes de la explosión se oye un murmullo grave. Al separarse los labios, el aire sale en una explosión suave y la vocal siguiente empieza sin interrupción. En español, /b/ se pronuncia como oclusiva tras pausa o tras nasal, como en «un beso»; en las demás posiciones se realiza como aproximante [β]. La lengua no participa y en el palatograma no aparece ningún contacto.'
  },
  m: {
    title: '<span class="ipa">[m]</span> nasal bilabial sonora', kR: '[m]',
    list: [['Punto', 'bilabial'], ['Modo', 'nasal'], ['Sonoridad', 'sonora'], ['Velo', 'descendido (nasal)']],
    text: 'Los labios se cierran por completo e impiden que el aire salga por la boca. El velo del paladar desciende y abre el paso hacia las fosas nasales, así que el aire sale por la nariz. La lengua no participa en la articulación y queda en una posición neutra, preparada para el sonido siguiente. Las cuerdas vocales vibran durante toda la articulación. En el palatograma no aparece ningún contacto.'
  }
};
/* ---------------- Inventario: cuadro AFI ---------------- */
const PLACES = [['Bil.', 'bilabial'], ['Lbd.', 'labiodental'], ['Den.', 'dental'], ['Alv.', 'alveolar'], ['Pal.', 'palatal'], ['Vel.', 'velar']];
const MANNERS = ['Oclusiva', 'Nasal', 'Fricativa', 'Africada', 'Aproximante', 'Lateral', 'Vibrante simple', 'Vibrante múltiple'];
// [modo, punto, sonora, símbolo, nombre, alófono de]
const CONS = [
  [0, 0, 0, 'p', 'oclusiva bilabial sorda'], [0, 0, 1, 'b', 'oclusiva bilabial sonora'],
  [0, 2, 0, 't̪', 'oclusiva dental sorda'], [0, 2, 1, 'd̪', 'oclusiva dental sonora'],
  [0, 5, 0, 'k', 'oclusiva velar sorda'], [0, 5, 1, 'g', 'oclusiva velar sonora'],
  [1, 0, 1, 'm', 'nasal bilabial sonora'], [1, 1, 1, 'ɱ', 'nasal labiodental sonora', '/n/ ante /f/'],
  [1, 2, 1, 'n̪', 'nasal dental sonora', '/n/ ante /t d/'], [1, 3, 1, 'n', 'nasal alveolar sonora'],
  [1, 4, 1, 'ɲ', 'nasal palatal sonora'], [1, 5, 1, 'ŋ', 'nasal velar sonora', '/n/ ante /k g x/'],
  [2, 1, 0, 'f', 'fricativa labiodental sorda'], [2, 3, 0, 's', 'fricativa alveolar sorda'],
  [2, 3, 1, 'z', 'fricativa alveolar sonora', '/s/ ante consonante sonora'], [2, 4, 1, 'ʝ', 'fricativa palatal sonora'],
  [2, 5, 0, 'x', 'fricativa velar sorda'],
  [3, 4, 0, 'tʃ', 'africada palatal sorda'], [3, 4, 1, 'ɟʝ', 'africada palatal sonora', '/ʝ/ tras pausa, nasal o lateral'],
  [4, 0, 1, 'β', 'aproximante bilabial sonora', '/b/'], [4, 2, 1, 'ð', 'aproximante dental sonora', '/d/'],
  [4, 5, 1, 'ɣ', 'aproximante velar sonora', '/g/'],
  [5, 2, 1, 'l̪', 'lateral dental sonora', '/l/ ante /t d/'], [5, 3, 1, 'l', 'lateral alveolar sonora'],
  [6, 3, 1, 'ɾ', 'vibrante simple alveolar sonora'], [7, 3, 1, 'r', 'vibrante múltiple alveolar sonora']
];
// [símbolo, nombre, x %, y %, alófono de] sobre el trapecio
const VOWELS = [
  ['i', 'vocal anterior alta', 8, 0], ['e', 'vocal anterior media', 30, 50], ['a', 'vocal central baja', 68, 100],
  ['o', 'vocal posterior media', 100, 50], ['u', 'vocal posterior alta', 100, 0],
  ['j', 'aproximante palatal', 24, 0, '/i/ en diptongo'], ['w', 'aproximante labiovelar', 84, 0, '/u/ en diptongo']
];
const KEY_OF = { s: 's', l: 'l', m: 'm', p: 'p', b: 'b' }; // símbolo → postura disponible en el modelo
function sndBtn(sym, name, allo) {
  const b = document.createElement('button'), key = KEY_OF[sym];
  b.type = 'button';
  b.className = 'snd' + (allo ? ' al' : '') + (sym === 'tʃ' || sym === 'ɟʝ' ? ' dg' : '');
  b.textContent = sym;
  const full = `[${sym}] ${name}` + (allo ? `, alófono de ${allo}` : '');
  b.setAttribute('aria-label', key ? full : full + ' (próximamente)');
  b.title = key ? full : full + ' · próximamente';
  if (key) {
    b.classList.add('on'); b.dataset.key = key; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => { if (sound !== key) { sound = key; goTarget(); } });
  } else b.setAttribute('aria-disabled', 'true');
  return b;
}
function buildInventory() {
  const t = $('tblC');
  t.innerHTML = '<colgroup><col class="mh">' + PLACES.map(() => '<col>').join('') + '</colgroup><thead><tr><th scope="col"><span class="vh">Modo</span></th>' +
    PLACES.map(([ab, full]) => `<th scope="col"><abbr title="${full}">${ab}</abbr></th>`).join('') + '</tr></thead><tbody></tbody>';
  MANNERS.forEach((mn, r) => {
    const tr = document.createElement('tr'), th = document.createElement('th');
    th.scope = 'row'; th.textContent = mn; tr.appendChild(th);
    PLACES.forEach((_, c) => {
      const td = document.createElement('td'), cell = document.createElement('div');
      cell.className = 'cell';
      for (const v of [0, 1]) {
        const e = CONS.find(x => x[0] === r && x[1] === c && x[2] === v);
        cell.appendChild(e ? sndBtn(e[3], e[4], e[5]) : document.createElement('span'));
      }
      td.appendChild(cell); tr.appendChild(td);
    });
    t.tBodies[0].appendChild(tr);
  });
  const v = $('tblV');
  v.innerHTML = '<div class="plot"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M8 0 L100 0 L100 100 L46 100 Z M27 50 L100 50"/></svg></div>';
  const plot = v.firstChild;
  for (const [txt, x, y] of [['anterior', 8, -26], ['central', 54, -26], ['posterior', 94, -26]]) {
    const l = document.createElement('span'); l.className = 'lab'; l.textContent = txt; l.style.left = x + '%'; l.style.top = y + 'px'; plot.appendChild(l);
  }
  for (const [txt, y] of [['alta', 0], ['media', 50], ['baja', 100]]) {
    const l = document.createElement('span'); l.className = 'lab'; l.textContent = txt; l.style.left = '-28px'; l.style.top = y + '%'; plot.appendChild(l);
  }
  for (const [sym, name, x, y, allo] of VOWELS) {
    const b = sndBtn(sym, name, allo); b.style.left = x + '%'; b.style.top = y + '%'; plot.appendChild(b);
  }
}
buildInventory();

function renderDesc() {
  const d = DESC[targetKey()];
  $('descTitle').innerHTML = d.title;
  $('descList').innerHTML = d.list.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
  $('descText').textContent = d.text;
  $('kR').textContent = d.kR;
  $('k').disabled = $('play').disabled = sound === 'rest';
  for (const b of document.querySelectorAll('.snd[data-key]')) b.setAttribute('aria-pressed', b.dataset.key === sound);
  renderSteps();
}

/* ---------------- Audio sintético ---------------- */
let actx = null;
function ac() {
  if (!actx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; actx = new A(); }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function playS(apical, dur) {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + 0.03, len = Math.floor(a.sampleRate * (dur + 0.2));
  const buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(); src.buffer = buf;
  const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = apical ? 2400 : 3600; hp.Q.value = 0.7;
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = apical ? 4300 : 6400; bp.Q.value = 1.4;
  const env = a.createGain();
  env.gain.setValueAtTime(0, t0); env.gain.linearRampToValueAtTime(0.9, t0 + 0.09); env.gain.setValueAtTime(0.9, t0 + dur - 0.14); env.gain.linearRampToValueAtTime(0, t0 + dur);
  src.connect(hp).connect(bp).connect(env).connect(a.destination);
  src.start(t0); src.stop(t0 + dur + 0.1);
}
function playL(dur) {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + 0.03, N = 48, re = new Float32Array(N + 1), im = new Float32Array(N + 1);
  for (let n = 1; n <= N; n++) im[n] = 1 / Math.pow(n, 1.25);
  const osc = a.createOscillator(); osc.setPeriodicWave(a.createPeriodicWave(re, im));
  osc.frequency.setValueAtTime(122, t0); osc.frequency.linearRampToValueAtTime(110, t0 + dur);
  const vib = a.createOscillator(), vg = a.createGain(); vib.frequency.value = 5.3; vg.gain.value = 1.4; vib.connect(vg).connect(osc.frequency);
  const sum = a.createGain();
  const low = a.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 420; low.Q.value = 0.8;
  const lg = a.createGain(); lg.gain.value = 0.35; osc.connect(low).connect(lg).connect(sum);
  for (const [f, q, gn] of [[360, 5, 1.0], [1450, 8, 0.55], [2750, 10, 0.3], [3550, 12, 0.12]]) {
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    const gg = a.createGain(); gg.gain.value = gn; osc.connect(bp).connect(gg).connect(sum);
  }
  const notch = a.createBiquadFilter(); notch.type = 'notch'; notch.frequency.value = 2100; notch.Q.value = 2.5;
  const env = a.createGain();
  env.gain.setValueAtTime(0, t0); env.gain.linearRampToValueAtTime(0.75, t0 + 0.07); env.gain.setValueAtTime(0.75, t0 + dur - 0.12); env.gain.linearRampToValueAtTime(0, t0 + dur);
  sum.connect(notch).connect(env).connect(a.destination);
  osc.start(t0); vib.start(t0); osc.stop(t0 + dur + 0.05); vib.stop(t0 + dur + 0.05);
}

function playP() {
  // explosión breve, sin aspiración, con la energía en frecuencias bajas
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + 0.02, len = Math.floor(a.sampleRate * 0.08);
  const buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (a.sampleRate * 0.006));
  const src = a.createBufferSource(); src.buffer = buf;
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.7;
  const g = a.createGain(); g.gain.value = 1.6;
  src.connect(bp).connect(g).connect(a.destination);
  src.start(t0);
}
function playB() {
  // explosión suave de la oclusiva sonora
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + 0.02, len = Math.floor(a.sampleRate * 0.06);
  const buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (a.sampleRate * 0.004));
  const src = a.createBufferSource(); src.buffer = buf;
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.7;
  const g = a.createGain(); g.gain.value = 0.8;
  src.connect(bp).connect(g).connect(a.destination);
  src.start(t0);
}
function playVoiceBar(dur) {
  // murmullo grave de las cuerdas vocales durante la oclusión (barra de sonoridad)
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + 0.02, N = 24, re = new Float32Array(N + 1), im = new Float32Array(N + 1);
  for (let n = 1; n <= N; n++) im[n] = 1 / Math.pow(n, 1.4);
  const osc = a.createOscillator(); osc.setPeriodicWave(a.createPeriodicWave(re, im));
  osc.frequency.setValueAtTime(122, t0); osc.frequency.linearRampToValueAtTime(116, t0 + dur);
  const low = a.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 280; low.Q.value = 0.7;
  const env = a.createGain();
  env.gain.setValueAtTime(0, t0); env.gain.linearRampToValueAtTime(0.45, t0 + 0.06); env.gain.setValueAtTime(0.45, t0 + dur - 0.08); env.gain.linearRampToValueAtTime(0, t0 + dur);
  osc.connect(low).connect(env).connect(a.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}
function playOnset(dur) {
  // comienzo breve de una vocal abierta, para ilustrar la vocal que sigue a la oclusiva
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + 0.01, N = 48, re = new Float32Array(N + 1), im = new Float32Array(N + 1);
  for (let n = 1; n <= N; n++) im[n] = 1 / Math.pow(n, 1.25);
  const osc = a.createOscillator(); osc.setPeriodicWave(a.createPeriodicWave(re, im));
  osc.frequency.setValueAtTime(125, t0); osc.frequency.linearRampToValueAtTime(112, t0 + dur);
  const sum = a.createGain();
  for (const [f, q, gn] of [[750, 5, 1.0], [1250, 7, 0.55], [2600, 10, 0.25]]) {
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    const gg = a.createGain(); gg.gain.value = gn; osc.connect(bp).connect(gg).connect(sum);
  }
  const env = a.createGain();
  env.gain.setValueAtTime(0, t0); env.gain.linearRampToValueAtTime(0.7, t0 + 0.03); env.gain.setValueAtTime(0.7, t0 + dur - 0.1); env.gain.linearRampToValueAtTime(0, t0 + dur);
  sum.connect(env).connect(a.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}
function playM(dur) {
  // murmullo nasal: resonancia grave (~260 Hz) y antirresonancia bilabial (~1000 Hz)
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + 0.03, N = 48, re = new Float32Array(N + 1), im = new Float32Array(N + 1);
  for (let n = 1; n <= N; n++) im[n] = 1 / Math.pow(n, 1.25);
  const osc = a.createOscillator(); osc.setPeriodicWave(a.createPeriodicWave(re, im));
  osc.frequency.setValueAtTime(122, t0); osc.frequency.linearRampToValueAtTime(110, t0 + dur);
  const vib = a.createOscillator(), vg = a.createGain(); vib.frequency.value = 5.3; vg.gain.value = 1.4; vib.connect(vg).connect(osc.frequency);
  const sum = a.createGain();
  const low = a.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 350; low.Q.value = 0.8;
  const lg = a.createGain(); lg.gain.value = 0.5; osc.connect(low).connect(lg).connect(sum);
  for (const [f, q, gn] of [[260, 4, 1.0], [2100, 9, 0.12], [2800, 10, 0.08]]) {
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    const gg = a.createGain(); gg.gain.value = gn; osc.connect(bp).connect(gg).connect(sum);
  }
  const notch = a.createBiquadFilter(); notch.type = 'notch'; notch.frequency.value = 1000; notch.Q.value = 2;
  const env = a.createGain();
  env.gain.setValueAtTime(0, t0); env.gain.linearRampToValueAtTime(0.75, t0 + 0.07); env.gain.setValueAtTime(0.75, t0 + dur - 0.12); env.gain.linearRampToValueAtTime(0, t0 + dur);
  sum.connect(notch).connect(env).connect(a.destination);
  osc.start(t0); vib.start(t0); osc.stop(t0 + dur + 0.05); vib.stop(t0 + dur + 0.05);
}

/* ---------------- Vistas y cámara ---------------- */
const VIEWS = {
  '3d': { pos: () => [-7.6, 5.6, 23.5], tgt: () => [3.0, -1.3, 0], up: [0, 1, 0], fov: 30 },
  sag: { pos: () => [2.9, -1.2, 63], tgt: () => [2.9, -1.2, 0], up: [0, 1, 0], fov: 12 },
  cor: { pos: () => [corX() - 26, 0.55, 0], tgt: () => [corX(), 0.55, 0], up: [0, 1, 0], fov: 12 },
  pal: { pos: () => [2.75, -22.5, 0], tgt: () => [2.75, 1.5, 0], up: [-1, 0, 0], fov: 16 }
};
let camTween = null;
function setView(v, instant) {
  view = v;
  for (const b of document.querySelectorAll('.view-tabs button')) b.setAttribute('aria-pressed', b.dataset.view === v);
  $('corBox').hidden = v !== 'cor';
  $('tCutWrap').hidden = v !== '3d';
  applyClip();
  const hidePal = v === 'pal';
  for (const o of [tongue, jawPivot, lowerLip, upperLip, pharynx, larynx, epiglottis, folds, profUpper, profNeck]) o.visible = !hidePal;
  for (const o of [profUpper, profNeck]) o.visible = v === '3d' || v === 'sag';
  profChin.visible = v === '3d' || v === 'sag';
  const V = VIEWS[v];
  const to = { pos: new THREE.Vector3(...V.pos()), tgt: new THREE.Vector3(...V.tgt()), up: new THREE.Vector3(...V.up), fov: V.fov };
  if (instant || reduceMotion) { camera.position.copy(to.pos); controls.target.copy(to.tgt); camera.up.copy(to.up); camera.fov = to.fov; camera.updateProjectionMatrix(); camera.lookAt(to.tgt); camTween = null; controls.enabled = v !== 'pal'; }
  else { controls.enabled = false; camTween = { from: { pos: camera.position.clone(), tgt: controls.target.clone(), up: camera.up.clone(), fov: camera.fov }, to, t0: performance.now(), dur: 750 }; }
  syncCaps();
  if (v === 'cor') updateCorText();
}
function applyClip() {
  let planes = [];
  if (view === '3d' && $('tCut').checked) planes = [sagPlane];
  if (view === 'sag') planes = [sagPlane, sagBack];
  if (view === 'cor') { corPlane.constant = -corX(); corBack.constant = corX() + 0.3; planes = [corPlane, corBack]; }
  for (const m of allMats) { m.clippingPlanes = planes; m.needsUpdate = true; }
  setCapPlane(planes.length ? planes[0] : null);
}

/* ---------------- Transiciones de postura ---------------- */
function tweenTo(target, dur, done, keepK) {
  tween = { from: cur, to: target, t0: performance.now(), dur: reduceMotion ? 1 : dur, done, keepK };
}
function goTarget() {
  renderDesc();
  $('corX').value = sound === 'l' ? 1.42 : 1.65;
  corPlane.constant = -corX(); corBack.constant = corX() + 0.3;
  if (view === 'cor') { const dx = corX() - controls.target.x; camera.position.x += dx; controls.target.x += dx; syncCaps(); }
  $('k').value = 1;
  seqId++; playing = false; stopMode = 'hold'; burstUntil = 0;
  stopPhase = STOPS[sound] ? 2 : 0;
  renderSteps();
  tweenTo(POSTURES[targetKey()], 650);
}
function setFromSlider() {
  tween = null;
  seqId++; playing = false;
  if (STOPS[sound]) { stopPhase = 0; stopMode = 'hold'; burstUntil = 0; renderSteps(); }
  kNow = parseFloat($('k').value);
  cur = mixPosture(POSTURES.rest, POSTURES[targetKey()], kNow);
  dirty = true;
}
function articulate() {
  if (playing || sound === 'rest') return;
  playing = true;
  const tk = targetKey();
  if (STOPS[tk]) { runPhases(); return; }
  cur = mixPosture(POSTURES.rest, POSTURES.rest, 0); dirty = true;
  $('k').value = 1;
  tweenTo(POSTURES[tk], 480, () => {
    const dur = 0.95;
    if (tk === 'l') playL(dur); else if (tk === 'm') playM(dur); else playS(false, dur);
    setTimeout(() => { playing = false; }, dur * 1000);
  });
}

/* ---------------- Fases de las oclusivas ---------------- */
// Cada oclusiva define sus posturas (oclusión, explosión, salida) y el texto de cada fase.
const STOPS = {
  p: {
    closure: 'p', release: 'p_rel', out: 'p_out', burst: () => playP(),
    phases: [
      ['Cierre', 'Los labios se acercan hasta tocarse y el velo del paladar se eleva y cierra el paso hacia la nariz.'],
      ['Oclusión', 'Con la boca y la nariz cerradas, el aire que llega de los pulmones se acumula detrás de los labios y la presión aumenta. Durante esta fase no se oye nada.'],
      ['Explosión', 'Los labios se separan de golpe y el aire comprimido sale de una vez. Esa salida brusca produce un ruido muy breve: la explosión.'],
      ['Salida', 'Tras la explosión empieza la vocal siguiente. En español las cuerdas vocales empiezan a vibrar casi enseguida, sin aspiración.']
    ]
  },
  b: {
    closure: 'b', release: 'b_rel', out: 'b_out', burst: () => playB(), hold: () => playVoiceBar(1.3),
    phases: [
      ['Cierre', 'Los labios se acercan hasta tocarse y el velo del paladar se eleva y cierra el paso hacia la nariz. Las cuerdas vocales ya están vibrando.'],
      ['Oclusión', 'Con la boca y la nariz cerradas, las cuerdas vocales siguen vibrando y se oye un murmullo grave. Como la glotis está casi cerrada para vibrar, el aire llega poco a poco y la presión detrás de los labios sube despacio.'],
      ['Explosión', 'Los labios se separan y el aire acumulado sale en una explosión suave. Las cuerdas vocales no dejan de vibrar.'],
      ['Salida', 'La vocal siguiente empieza sin interrupción: la vibración de las cuerdas vocales continúa desde la oclusión.']
    ]
  }
};
let stopPhase = 0, seqId = 0;
function renderSteps() {
  const st = STOPS[sound], box = $('phases');
  box.hidden = !st;
  if (!st) return;
  const ol = $('steps');
  if (ol.dataset.key !== sound) {
    ol.dataset.key = sound;
    ol.innerHTML = st.phases.map(([name], i) => `<li><button type="button" class="step" data-n="${i + 1}"><b>${i + 1}</b>${name}</button></li>`).join('');
    for (const b of ol.querySelectorAll('.step')) b.addEventListener('click', () => { seqId++; playing = false; setPhase(+b.dataset.n); });
  }
  for (const b of ol.querySelectorAll('.step')) {
    if (+b.dataset.n === stopPhase) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
  }
  $('phaseTxt').textContent = stopPhase ? st.phases[stopPhase - 1][1] : 'Pulsa una fase para verla, o «Articular y escuchar» para recorrerlas todas.';
}
function setPhase(n, withSound) {
  const st = STOPS[sound]; if (!st) return;
  stopPhase = n; $('k').value = 1; renderSteps();
  const P = POSTURES;
  if (n === 1) {
    stopMode = 'hold'; burstUntil = 0; resetStopFlow();
    tweenTo(P[st.release], 250, () => tweenTo(P[st.closure], 700, null, true), true);
  } else if (n === 2) {
    stopMode = 'hold'; burstUntil = 0;
    if (withSound !== false && st.hold) st.hold();
    tweenTo(P[st.closure], 300, null, true);
  } else if (n === 3) {
    stopMode = 'hold'; burstUntil = performance.now() + 700;
    if (withSound !== false) st.burst();
    tweenTo(P[st.release], 90, null, true);
  } else if (n === 4) {
    stopMode = 'open'; burstUntil = 0; spreadStopFlow();
    if (withSound !== false) playOnset(0.45);
    tweenTo(P[st.out], 260, null, true);
  }
}
// Recorre las cuatro fases a cámara lenta
function runPhases() {
  const id = ++seqId, plan = [[1, 0], [2, 1050], [3, 2500], [4, 3150], [0, 4600]];
  playing = true;
  for (const [n, t] of plan) setTimeout(() => {
    if (id !== seqId) return;
    if (n) setPhase(n); else playing = false;
  }, t);
}

/* ---------------- Eventos ---------------- */
for (const b of document.querySelectorAll('.view-tabs button')) b.addEventListener('click', () => setView(b.dataset.view));
for (const [id, show] of [['tabC', 'tblC'], ['tabV', 'tblV']]) $(id).addEventListener('click', () => {
  for (const [i2, t2] of [['tabC', 'tblC'], ['tabV', 'tblV']]) { $(i2).setAttribute('aria-pressed', i2 === id); $(t2).hidden = t2 !== show; }
});
$('k').addEventListener('input', setFromSlider);
$('play').addEventListener('click', articulate);
$('tContact').addEventListener('change', () => { paintContacts(); });
$('tCut').addEventListener('change', applyClip);
$('corX').addEventListener('input', () => {
  corPlane.constant = -corX(); corBack.constant = corX() + 0.3; syncCaps();
  const V = VIEWS.cor; const dx = corX() - controls.target.x;
  if (view === 'cor') { camera.position.x += dx; controls.target.x += dx; }
  updateCorText();
});

function applyTheme() {
  renderer.setClearColor(new THREE.Color(tok('--viewer')), 1);
  flowMat.color.set(tok('--air'));
  matProfile.color.set(tok('--muted'));
  drawEPG();
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });

function resize() {
  const w = viewerEl.clientWidth - 8, h = viewerEl.clientHeight - 8;
  if (w <= 0 || h <= 0) return;
  renderer.setSize(w, h, false);
  labelRenderer.setSize(w, h);
  camera.aspect = w / h;
  // en pantallas estrechas, alejar la cámara para que quepa todo
  camera.zoom = Math.min(1, (w / h) / 1.05);
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewerEl);

/* ---------------- Bucle ---------------- */
let last = performance.now(), foldsT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = clamp((now - last) / 1000, 0, 0.05); last = Math.max(last, now);
  if (tween) {
    const t = clamp((now - tween.t0) / tween.dur, 0, 1), e = easeIO(t);
    cur = mixPosture(tween.from, tween.to, e);
    kNow = tween.keepK ? 1 : e; dirty = true;
    if (t >= 1) { const d = tween.done; tween = null; kNow = 1; d && d(); }
  }
  if (camTween) {
    const t = clamp((now - camTween.t0) / camTween.dur, 0, 1), e = easeIO(t);
    camera.position.lerpVectors(camTween.from.pos, camTween.to.pos, e);
    controls.target.lerpVectors(camTween.from.tgt, camTween.to.tgt, e);
    camera.up.lerpVectors(camTween.from.up, camTween.to.up, e).normalize();
    camera.fov = lerp(camTween.from.fov, camTween.to.fov, e); camera.updateProjectionMatrix();
    camera.lookAt(controls.target);
    if (t >= 1) { camTween = null; controls.enabled = view !== 'pal'; }
  }
  if (dirty) { applyPosture(); dirty = false; }
  flowAlpha = smooth(0.82, 1, kNow) * (stopPhase === 1 ? 0 : 1);
  if (flowAlpha > 0.01 && flowKey !== targetKey()) computeFlow(targetKey());
  // cuerdas vocales
  foldsT += dt;
  if (foldsT > 0.04) {
    foldsT = 0;
    const ph = cur.voice > 0.02 && !reduceMotion ? cur.voice * Math.sin(now * 0.02) : 0;
    if (setGeometry(folds, foldsGeometry(cur.abd, ph))) syncCaps();
  }
  updateFlow(dt, now);
  drawGlottis(now);
  updateLabels();
  if (controls.enabled && !camTween) controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

/* ---------------- Arranque ---------------- */
buildTongue(cur, cur.jaw * Math.PI / 180);
if (signedVolume(tongueGeo.attributes.position.array, tongueGeo.index.array) < 0) flipWinding(tongueGeo);
resize();
renderDesc();
applyTheme();
setView('3d', true);
applyPosture();
computeFlow(targetKey());
requestAnimationFrame(frame);
