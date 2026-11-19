// Vice Cover Studio — editor wiring: state, undo, drag/zoom crop,
// uploads, export, self-test and fixed screenshot scenes.
import { SAMPLES, LAYOUTS, GRADES, EXPORT_SIZES, defaultState, layoutPanels, drawCover } from './cover.js';
import { applyShot, shotCanvasSize, markShotReady } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');
const query = new URLSearchParams(location.search);
const state = defaultState();
const shot = applyShot(query, state);

const images = new Map(); // id -> HTMLImageElement
const customLabels = new Map(); // upload id -> {place,time,tag}
let uploadCount = 0;
let history = [];
let drag = null;
let wheelTimer = null;
let errors = 0;
window.addEventListener('error', () => { errors++; });

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('load failed: ' + src));
    img.src = src;
  });
}

function pushHistory() {
  history.push(JSON.stringify(state));
  if (history.length > 60) history.shift();
}

function undo() {
  const prev = history.pop();
  if (!prev) return;
  const keep = state.selected;
  Object.assign(state, JSON.parse(prev));
  state.selected = keep;
  syncControls();
  render();
}

function currentSize() {
  const s = EXPORT_SIZES.find((x) => x.id === state.exportSize) || EXPORT_SIZES[0];
  return s;
}

function render() {
  let W, H;
  if (shot === 'cover') {
    W = window.innerWidth; H = window.innerHeight;
  } else {
    const s = currentSize();
    W = s.w; H = s.h;
  }
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  drawCover(ctx, state, images, W, H);
  drawSelection();
}

function drawSelection() {
  if (shot === 'cover') return;
  const panels = layoutPanels(state.layout, canvas.width, canvas.height);
  const p = panels[state.selected];
  if (!p) return;
  ctx.save();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 8]);
  if (p.poly) {
    ctx.beginPath();
    ctx.moveTo(p.poly[0][0], p.poly[0][1]);
    for (let k = 1; k < p.poly.length; k++) ctx.lineTo(p.poly[k][0], p.poly[k][1]);
    ctx.closePath();
  } else {
    ctx.strokeRect(p.x + 2, p.y + 2, p.w - 4, p.h - 4);
  }
  ctx.stroke();
  ctx.restore();
}

function pointInPanel(px, py, p) {
  if (p.poly) {
    let inside = false;
    for (let i = 0, j = p.poly.length - 1; i < p.poly.length; j = i++) {
      const xi = p.poly[i][0], yi = p.poly[i][1];
      const xj = p.poly[j][0], yj = p.poly[j][1];
      if (((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  return px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h;
}

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (canvas.width / r.width),
    y: (e.clientY - r.top) * (canvas.height / r.height),
  };
}

// --- controls ---
function buildControls() {
  const layoutBox = $('layouts');
  Object.entries(LAYOUTS).forEach(([id, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = def.name;
    b.dataset.layout = id;
    b.addEventListener('click', () => { pushHistory(); state.layout = id; state.selected = 0; syncControls(); render(); });
    layoutBox.appendChild(b);
  });

  const gradeBox = $('grades');
  Object.entries(GRADES).forEach(([id, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.dataset.grade = id;
    b.title = def.name;
    b.style.background = `linear-gradient(135deg, ${def.wash[0]}, ${def.wash[1]})`;
    b.innerHTML = `<span>${def.name}</span>`;
    b.addEventListener('click', () => { pushHistory(); state.grade = id; syncControls(); render(); });
    gradeBox.appendChild(b);
  });

  const sizeSel = $('exportSize');
  EXPORT_SIZES.forEach((s) => {
    const o = document.createElement('option');
    o.value = s.id; o.textContent = s.label;
    sizeSel.appendChild(o);
  });
  sizeSel.addEventListener('change', () => { pushHistory(); state.exportSize = sizeSel.value; render(); });

  const thumbBox = $('thumbs');
  SAMPLES.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.dataset.sample = s.id;
    b.title = `${s.place} - ${s.tag}`;
    const img = document.createElement('img');
    img.src = s.src; img.alt = s.place;
    b.appendChild(img);
    b.addEventListener('click', () => {
      pushHistory();
      state.panels[state.selected].img = s.id;
      state.panels[state.selected].dx = 0;
      state.panels[state.selected].dy = 0;
      state.panels[state.selected].scale = 1;
      delete state.panels[state.selected].label;
      syncControls(); render();
    });
    thumbBox.appendChild(b);
  });
}

function bindText(id, key) {
  $(id).addEventListener('input', (e) => { state[key] = e.target.value; render(); });
  $(id).addEventListener('change', pushHistory);
}

function syncControls() {
  document.querySelectorAll('#layouts .chip').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('#grades .swatch').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('#thumbs .thumb').forEach((b) => b.classList.toggle('active', b.dataset.sample === state.panels[state.selected].img));
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('quote').value = state.quote;
  $('stars').value = state.stars;
  $('starsOut').textContent = state.stars + ' / 5';
  $('vol').value = state.vol;
  $('wanted').checked = state.wanted;
  $('seal').checked = state.seal;
  $('strip').checked = state.strip;
  $('exportSize').value = state.exportSize;
  $('zoom').value = Math.round(((state.panels[state.selected].scale || 1) - 1) * 100);
  $('zoomOut').textContent = Math.round((state.panels[state.selected].scale || 1) * 100) + '%';
  $('panelLabel').textContent = 'Panel ' + (state.selected + 1) + ' of ' + LAYOUTS[state.layout].panels;
}

function bindUI() {
  bindText('title', 'title');
  bindText('subtitle', 'subtitle');
  bindText('quote', 'quote');
  bindText('vol', 'vol');
  $('stars').addEventListener('input', (e) => { state.stars = Number(e.target.value); $('starsOut').textContent = state.stars + ' / 5'; render(); });
  $('stars').addEventListener('change', pushHistory);
  $('wanted').addEventListener('change', (e) => { pushHistory(); state.wanted = e.target.checked; render(); });
  $('seal').addEventListener('change', (e) => { pushHistory(); state.seal = e.target.checked; render(); });
  $('strip').addEventListener('change', (e) => { pushHistory(); state.strip = e.target.checked; render(); });
  $('zoom').addEventListener('input', (e) => {
    const spec = state.panels[state.selected];
    spec.scale = 1 + Number(e.target.value) / 100;
    $('zoomOut').textContent = Math.round(spec.scale * 100) + '%';
    render();
  });
  $('zoom').addEventListener('change', pushHistory);
  $('resetCrop').addEventListener('click', () => {
    pushHistory();
    const spec = state.panels[state.selected];
    spec.dx = 0; spec.dy = 0; spec.scale = 1;
    syncControls(); render();
  });
  $('undo').addEventListener('click', undo);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
  });
  $('upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const img = await loadImage(URL.createObjectURL(file));
      uploadCount++;
      const id = 'upload-' + uploadCount;
      images.set(id, img);
      customLabels.set(id, { place: 'Your Photo', time: 'Just Now', tag: file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Uploaded' });
      pushHistory();
      const spec = state.panels[state.selected];
      spec.img = id; spec.dx = 0; spec.dy = 0; spec.scale = 1;
      spec.label = customLabels.get(id);
      $('status').textContent = 'Uploaded ' + file.name + ' into panel ' + (state.selected + 1) + '.';
      syncControls(); render();
    } catch (err) {
      $('status').textContent = 'Upload failed: ' + err.message;
    }
    e.target.value = '';
  });
  $('export').addEventListener('click', () => {
    const s = currentSize();
    const off = document.createElement('canvas');
    off.width = s.w; off.height = s.h;
    drawCover(off.getContext('2d'), state, images, s.w, s.h);
    off.toBlob((blob) => {
      if (!blob) { $('status').textContent = 'Export failed.'; return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-cover-${s.w}x${s.h}.png`;
      a.click();
      $('status').textContent = `Saved vice-cover-${s.w}x${s.h}.png`;
    }, 'image/png');
  });

  // drag to pan crop, wheel to zoom, click to select panel
  canvas.addEventListener('pointerdown', (e) => {
    const pt = canvasPoint(e);
    const panels = layoutPanels(state.layout, canvas.width, canvas.height);
    let hit = -1;
    for (let i = panels.length - 1; i >= 0; i--) {
      if (pointInPanel(pt.x, pt.y, panels[i])) { hit = i; break; }
    }
    if (hit < 0) return;
    pushHistory();
    state.selected = hit;
    syncControls();
    drag = { x: pt.x, y: pt.y, dx: state.panels[hit].dx, dy: state.panels[hit].dy };
    canvas.setPointerCapture(e.pointerId);
    render();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const pt = canvasPoint(e);
    const p = layoutPanels(state.layout, canvas.width, canvas.height)[state.selected];
    const spec = state.panels[state.selected];
    spec.dx = Math.max(-1, Math.min(1, drag.dx + (pt.x - drag.x) / p.w));
    spec.dy = Math.max(-1, Math.min(1, drag.dy + (pt.y - drag.y) / p.h));
    render();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const pt = canvasPoint(e);
    const panels = layoutPanels(state.layout, canvas.width, canvas.height);
    let hit = -1;
    for (let i = panels.length - 1; i >= 0; i--) {
      if (pointInPanel(pt.x, pt.y, panels[i])) { hit = i; break; }
    }
    if (hit < 0) return;
    if (!wheelTimer) pushHistory();
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { wheelTimer = null; }, 600);
    const spec = state.panels[hit];
    spec.scale = Math.max(1, Math.min(4, (spec.scale || 1) * Math.pow(1.0015, -e.deltaY)));
    state.selected = hit;
    syncControls(); render();
  }, { passive: false });
}

// --- self-test: ?selftest=1 ---
async function selftest() {
  const results = [];
  try {
    const anton = await document.fonts.load('40px Anton');
    const pacifico = await document.fonts.load('40px Pacifico');
    results.push('fonts:' + (anton.length > 0 && pacifico.length > 0 ? 'ok' : 'MISSING'));
    const missing = SAMPLES.filter((s) => !images.get(s.id) || !images.get(s.id).naturalWidth);
    results.push('samples:' + (missing.length === 0 ? 'ok' : 'MISSING ' + missing.map((m) => m.id).join(',')));
    const off = document.createElement('canvas');
    off.width = 360; off.height = 360;
    const octx = off.getContext('2d');
    let combos = 0;
    for (const layout of Object.keys(LAYOUTS)) {
      for (const grade of Object.keys(GRADES)) {
        drawCover(octx, { ...state, layout, grade }, images, 360, 360);
        combos++;
      }
    }
    results.push('combos:' + combos);
    for (const s of EXPORT_SIZES) {
      const c2 = document.createElement('canvas');
      c2.width = s.w; c2.height = s.h;
      drawCover(c2.getContext('2d'), state, images, s.w, s.h);
    }
    results.push('exports:ok');
    results.push('errors:' + errors);
  } catch (err) {
    results.push('EXCEPTION ' + err.message);
  }
  const pass = results.every((r) => !/MISSING|EXCEPTION/.test(r)) && errors === 0;
  const text = (pass ? 'SELFTEST PASS' : 'SELFTEST FAIL') + ' | ' + results.join(' | ');
  const el = $('selftest');
  if (el) el.textContent = text;
  document.title = text;
  window.__selftest = text;
  return pass;
}

// --- boot ---
async function boot() {
  try {
    await Promise.all([
      document.fonts.load('40px Anton'),
      document.fonts.load('40px Pacifico'),
      ...SAMPLES.map(async (s) => {
        try { images.set(s.id, await loadImage(s.src)); } catch (e) { /* placeholder gradient */ }
      }),
    ]);
  } catch (e) { /* fonts may fall back; render anyway */ }
  if (shot !== 'cover') { buildControls(); bindUI(); }
  if (shot === 'cover') {
    const size = shotCanvasSize(shot, query);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    void size;
  }
  syncControls();
  render();
  if (query.get('selftest') === '1') {
    await selftest();
  }
  if (shot) markShotReady();
}

boot();
