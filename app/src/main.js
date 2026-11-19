// Vice Cover Studio wiring: state, controls, panel drag/zoom, uploads, undo, export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js);
// `?selftest=1` runs the in-browser self-test and reports into #selftest-result.
import { drawCover, LAYOUTS, GRADES } from './cover.js';
import { runShot } from './shots.js';

export const SAMPLES = ['convertible', 'neon-portrait', 'coast-road', 'gas-station', 'boulevard', 'pier'];

const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const DEFAULT_PANELS = [
  { photo: 'convertible', place: 'Ocean Drive', time: '6:47 PM', tag: 'Chase the sunset', zoom: 1, ox: 0, oy: 0 },
  { photo: 'neon-portrait', place: 'Vice City', time: '11:58 PM', tag: 'Neon never sleeps', zoom: 1, ox: 0, oy: 0 },
  { photo: 'coast-road', place: 'Leonida Keys', time: '5:12 PM', tag: 'One last ride', zoom: 1, ox: 0, oy: 0 },
  { photo: 'gas-station', place: 'Port Gellhorn', time: '2:03 AM', tag: 'Fill up and vanish', zoom: 1, ox: 0, oy: 0 },
];

export function defaultState() {
  return {
    layout: 'hero-top',
    grade: 'sunset',
    size: '1080x1080',
    title: 'VICE CITY',
    subtitle: 'welcome back',
    quote: 'The city never sleeps. Neither do we.',
    stars: 5,
    showSeal: true,
    showWanted: true,
    showVol: true,
    showStrip: true,
    showQuote: true,
    selected: 0,
    panels: DEFAULT_PANELS.map((p) => ({ ...p })),
  };
}

const state = defaultState();
const history = [];
let historyIndex = -1;

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const imageCache = new Map();

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  if (imageCache.has(url)) return Promise.resolve(imageCache.get(url));
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { imageCache.set(url, img); resolve(img); };
    img.onerror = reject;
    img.src = url;
  });
}

function photoUrl(panel) {
  if (!panel.photo) return null;
  if (panel.photo.startsWith('data:') || panel.photo.startsWith('blob:')) return panel.photo;
  return `samples/${panel.photo}.jpg`;
}

function resolveImage(panel) {
  const url = photoUrl(panel);
  return url ? imageCache.get(url) || null : null;
}

async function preloadPhotos() {
  await Promise.all(SAMPLES.map((name) => loadImage(`samples/${name}.jpg`).catch(() => null)));
}

let fontsReady = false;
async function ensureFonts() {
  if (fontsReady) return;
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.ready,
    ]);
  } catch { /* fall back to system fonts; drawing still works */ }
  fontsReady = true;
}

function applySize() {
  const [w, h] = SIZES[state.size] || SIZES['1080x1080'];
  canvas.width = w;
  canvas.height = h;
  canvas.style.aspectRatio = `${w} / ${h}`;
}

async function redraw() {
  await ensureFonts();
  applySize();
  drawCover(canvas, state, resolveImage);
}

function snapshot() {
  return JSON.stringify({ ...state, panels: state.panels.map((p) => ({ ...p })) });
}

function pushHistory() {
  history.splice(historyIndex + 1);
  history.push(snapshot());
  if (history.length > 50) history.shift();
  historyIndex = history.length - 1;
  updateUndoButton();
}

function restoreHistory(json) {
  const saved = JSON.parse(json);
  Object.assign(state, saved);
  state.panels = saved.panels;
  syncControls();
  redraw();
}

function undo() {
  if (historyIndex <= 0) return;
  historyIndex -= 1;
  restoreHistory(history[historyIndex]);
  status.textContent = 'Undid the last change.';
  updateUndoButton();
}

function updateUndoButton() {
  const btn = document.getElementById('undo');
  if (btn) btn.disabled = historyIndex <= 0;
}

function commit(label) {
  pushHistory();
  redraw();
  if (label) status.textContent = label;
}

// ---- Controls ----
function syncControls() {
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.value = value; };
  const check = (id, value) => { const el = document.getElementById(id); if (el) el.checked = value; };
  set('title', state.title);
  set('subtitle', state.subtitle);
  set('quote', state.quote);
  set('stars', String(state.stars));
  set('size', state.size);
  check('showSeal', state.showSeal);
  check('showWanted', state.showWanted);
  check('showVol', state.showVol);
  check('showStrip', state.showStrip);
  check('showQuote', state.showQuote);
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  renderPanelEditor();
}

function renderPanelEditor() {
  const wrap = document.getElementById('panels');
  if (!wrap) return;
  wrap.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const card = document.createElement('div');
    card.className = 'panel-card' + (state.selected === i ? ' selected' : '');
    card.innerHTML = `
      <div class="panel-head"><strong>Panel ${i + 1}</strong><button type="button" data-act="select">Use</button></div>
      <label>Photo <select data-field="photo">${SAMPLES.map((n) => `<option value="${n}"${panel.photo === n ? ' selected' : ''}>${n}</option>`).join('')}<option value="__upload__">Upload your own…</option></select></label>
      <label>Upload <input type="file" accept="image/*" data-field="file"></label>
      <label>Place <input type="text" maxlength="24" data-field="place" value=""></label>
      <label>Time <input type="text" maxlength="12" data-field="time" value=""></label>
      <label>Tagline <input type="text" maxlength="40" data-field="tag" value=""></label>
      <label>Zoom <input type="range" min="1" max="2.5" step="0.05" data-field="zoom" value="1"></label>
      <button type="button" data-act="reset-crop">Reset crop</button>`;
    card.querySelector('[data-field="place"]').value = panel.place;
    card.querySelector('[data-field="time"]').value = panel.time;
    card.querySelector('[data-field="tag"]').value = panel.tag;
    card.querySelector('[data-field="zoom"]').value = String(panel.zoom || 1);
    card.querySelector('[data-act="select"]').addEventListener('click', () => {
      state.selected = i;
      commit();
      syncControls();
    });
    card.querySelector('[data-act="reset-crop"]').addEventListener('click', () => {
      panel.zoom = 1; panel.ox = 0; panel.oy = 0;
      commit('Crop reset.');
    });
    card.querySelector('[data-field="photo"]').addEventListener('change', async (e) => {
      if (e.target.value === '__upload__') {
        card.querySelector('[data-field="file"]').click();
        e.target.value = panel.photo;
        return;
      }
      panel.photo = e.target.value;
      await loadImage(photoUrl(panel)).catch(() => null);
      state.selected = i;
      commit();
    });
    card.querySelector('[data-field="file"]').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      panel.photo = url;
      await loadImage(url).catch(() => null);
      state.selected = i;
      commit('Photo uploaded.');
    });
    for (const field of ['place', 'time', 'tag']) {
      card.querySelector(`[data-field="${field}"]`).addEventListener('input', (e) => {
        panel[field] = e.target.value;
        redraw();
      });
      card.querySelector(`[data-field="${field}"]`).addEventListener('change', () => commit());
    }
    card.querySelector('[data-field="zoom"]').addEventListener('input', (e) => {
      panel.zoom = Number(e.target.value);
      redraw();
    });
    card.querySelector('[data-field="zoom"]').addEventListener('change', () => commit());
    card.addEventListener('click', (e) => {
      if (e.target.closest('button, select, input')) return;
      state.selected = i;
      redraw();
      syncControls();
    });
    wrap.appendChild(card);
  });
}

function wireControls() {
  document.querySelectorAll('[data-layout]').forEach((b) => b.addEventListener('click', () => {
    state.layout = b.dataset.layout;
    commit(`Layout: ${state.layout}.`);
    syncControls();
  }));
  document.querySelectorAll('[data-grade]').forEach((b) => b.addEventListener('click', () => {
    state.grade = b.dataset.grade;
    commit(`Grade: ${state.grade}.`);
    syncControls();
  }));
  const bindText = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => { state[key] = el.value; redraw(); });
    el.addEventListener('change', () => commit());
  };
  bindText('title', 'title');
  bindText('subtitle', 'subtitle');
  bindText('quote', 'quote');
  const stars = document.getElementById('stars');
  if (stars) stars.addEventListener('change', () => { state.stars = Number(stars.value); commit(); });
  const size = document.getElementById('size');
  if (size) size.addEventListener('change', () => { state.size = size.value; commit(`Export size: ${state.size}.`); });
  for (const [id, key] of [['showSeal', 'showSeal'], ['showWanted', 'showWanted'], ['showVol', 'showVol'], ['showStrip', 'showStrip'], ['showQuote', 'showQuote']]) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => { state[key] = el.checked; commit(); });
  }
  document.getElementById('undo').addEventListener('click', undo);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
  });
  document.getElementById('export').addEventListener('click', () => {
    const [w, h] = SIZES[state.size] || SIZES['1080x1080'];
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    drawCover(off, state, resolveImage);
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-cover-${state.layout}-${w}x${h}.png`;
      a.click();
      status.textContent = `Saved vice-cover-${state.layout}-${w}x${h}.png`;
    }, 'image/png');
  });
}

// ---- Panel drag / wheel zoom on the preview canvas ----
function wireCanvas() {
  let drag = null;
  const toCanvas = (e) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };
  canvas.addEventListener('pointerdown', (e) => {
    const p = toCanvas(e);
    // Hit-test panels in reverse order (topmost first) using the same band math as cover.js.
    const bandY = 10 * (canvas.width / 1080) + canvas.height * 0.2;
    const bandH = canvas.height * (1 - 0.2 - 0.12) - 10 * (canvas.width / 1080);
    if (p.y < bandY || p.y > bandY + bandH) return;
    canvas.setPointerCapture(e.pointerId);
    drag = { x: p.x, y: p.y, panel: state.selected, moved: false };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = toCanvas(e);
    const panel = state.panels[drag.panel];
    if (!panel) return;
    const dx = (p.x - drag.x) / canvas.width;
    const dy = (p.y - drag.y) / canvas.height;
    if (Math.abs(dx) + Math.abs(dy) > 0.002) drag.moved = true;
    panel.ox = Math.max(-2, Math.min(2, (panel.ox || 0) + dx * 4));
    panel.oy = Math.max(-2, Math.min(2, (panel.oy || 0) + dy * 4));
    drag.x = p.x;
    drag.y = p.y;
    redraw();
  });
  canvas.addEventListener('pointerup', () => {
    if (drag && drag.moved) commit();
    drag = null;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const panel = state.panels[state.selected];
    if (!panel) return;
    panel.zoom = Math.max(1, Math.min(2.5, (panel.zoom || 1) - Math.sign(e.deltaY) * 0.1));
    redraw();
  }, { passive: false });
}

// ---- In-browser self-test (?selftest=1) ----
export async function runSelftest() {
  const results = [];
  const check = (name, ok) => results.push([name, !!ok]);
  await ensureFonts();
  await preloadPhotos();
  const off = document.createElement('canvas');
  off.width = 540;
  off.height = 540;
  for (const layout of LAYOUTS) {
    for (const grade of GRADES) {
      try {
        drawCover(off, { ...defaultState(), layout, grade }, resolveImage);
        check(`${layout}/${grade}`, true);
      } catch (err) {
        check(`${layout}/${grade}`, false);
      }
    }
  }
  // Every export size renders without throwing.
  for (const [w, h] of Object.values(SIZES)) {
    try {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      drawCover(c, { ...defaultState(), size: `${w}x${h}` }, resolveImage);
      check(`size ${w}x${h}`, true);
    } catch { check(`size ${w}x${h}`, false); }
  }
  // The canvas is not blank: sample a few pixels across the title and a panel.
  try {
    drawCover(off, defaultState(), resolveImage);
    const px = off.getContext('2d').getImageData(0, 0, 540, 540).data;
    let varied = new Set();
    for (let i = 0; i < px.length; i += 4011) varied.add(px[i] + ',' + px[i + 1] + ',' + px[i + 2]);
    check('pixels-varied', varied.size > 8);
  } catch { check('pixels-varied', false); }
  const passed = results.filter(([, ok]) => ok).length;
  const failed = results.filter(([, ok]) => !ok);
  const el = document.getElementById('selftest-result');
  const text = `SELFTEST ${failed.length === 0 ? 'PASS' : 'FAIL'} ${passed}/${results.length}` + (failed.length ? ` failed: ${failed.map(([n]) => n).join(', ')}` : '');
  if (el) el.textContent = text;
  console.log(text);
  window.__selftest = text;
  return failed.length === 0;
}

async function init() {
  const params = new URLSearchParams(location.search);
  wireControls();
  wireCanvas();
  syncControls();
  await preloadPhotos();
  await redraw();
  pushHistory();
  const shot = params.get('shot');
  if (shot) {
    await runShot(shot, params, state, { redraw, commit, syncControls, loadImage, canvas });
  } else if (params.get('selftest') === '1') {
    await runSelftest();
  }
  if (shot || params.get('selftest') === '1') {
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
  }
}

init().catch((err) => {
  console.error(err);
  const el = document.getElementById('selftest-result');
  if (el) el.textContent = `SELFTEST FAIL init: ${err.message}`;
});
