// Vice Cover Studio — editor wiring: state, preview, panels, export, shot modes.
import { SIZES, LAYOUTS, GRADES, drawCover, panelRects } from './cover.js';

const SAMPLES = [
  'convertible.jpg',
  'neon-portrait.jpg',
  'coast-road.jpg',
  'gas-station.jpg',
  'pier.jpg',
  'boulevard.jpg',
];

const DEFAULT_PANELS = [
  { photo: 'convertible.jpg', place: 'OCEAN DRIVE', time: '7:40 PM', tag: 'NO WITNESSES', zoom: 1, ox: 0, oy: 0 },
  { photo: 'neon-portrait.jpg', place: 'NEON ROW', time: '11:15 PM', tag: 'AFTER DARK', zoom: 1, ox: 0, oy: 0 },
  { photo: 'coast-road.jpg', place: 'COAST HIGHWAY', time: '6:05 PM', tag: 'FULL SEND', zoom: 1.15, ox: 0, oy: -0.1 },
  { photo: 'gas-station.jpg', place: 'PIER 39', time: '8:20 PM', tag: 'LAST LIGHT', zoom: 1, ox: 0, oy: 0 },
  { photo: 'pier.jpg', place: 'BOULEVARD', time: '5:55 PM', tag: 'GOLDEN HOUR', zoom: 1, ox: 0, oy: 0 },
];

function defaultState() {
  return {
    layout: 'hero-top',
    grade: 'vice',
    size: '1920x1080',
    title: 'NEON TIDE',
    subtitle: 'Six nights in paradise',
    quote: 'A FEVER DREAM IN NEON',
    source: 'THE COAST HERALD',
    stars: 5,
    panels: DEFAULT_PANELS.map((p) => ({ ...p })),
  };
}

const state = defaultState();
let selected = 0;
const images = {};
const history = [];
const params = new URLSearchParams(location.search);
const shotMode = params.get('shot') || '';

function loadImage(key, src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { images[key] = img; resolve(true); };
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

async function loadAllPhotos() {
  await Promise.all(SAMPLES.map((s) => loadImage(s, `samples/${s}`)));
  // Wait for the display faces so canvas text uses them, not a fallback.
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.ready,
    ]);
  } catch (e) { /* fonts fall back to sans-serif; render anyway */ }
}

const canvas = document.getElementById('preview');
const ctx = canvas.getContext('2d');

function render() {
  const { w, h } = SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(ctx, w, h, state, images);
  canvas.style.aspectRatio = `${w} / ${h}`;
}

function pushHistory() {
  history.push(JSON.stringify(state));
  if (history.length > 60) history.shift();
}

function undo() {
  const prev = history.pop();
  if (!prev) return;
  const restored = JSON.parse(prev);
  Object.assign(state, restored);
  selected = Math.min(selected, state.panels.length - 1);
  syncControls();
  render();
}

function syncControls() {
  document.getElementById('titleInput').value = state.title;
  document.getElementById('subtitleInput').value = state.subtitle;
  document.getElementById('quoteInput').value = state.quote;
  document.getElementById('sourceInput').value = state.source;
  document.getElementById('starsInput').value = String(state.stars);
  document.querySelectorAll('#layoutRow button').forEach((b) =>
    b.classList.toggle('active', b.dataset.value === state.layout));
  document.querySelectorAll('#gradeRow button').forEach((b) =>
    b.classList.toggle('active', b.dataset.value === state.grade));
  document.querySelectorAll('#sizeRow button').forEach((b) =>
    b.classList.toggle('active', b.dataset.value === state.size));
  document.querySelectorAll('#sampleRow img').forEach((img) =>
    img.classList.toggle('selected', img.dataset.photo === state.panels[selected]?.photo));
  syncPanelForm();
}

function syncPanelForm() {
  const p = state.panels[selected];
  const rects = panelRects(state.layout, SIZES[state.size].w, SIZES[state.size].h);
  const count = rects.length;
  document.getElementById('panelName').textContent =
    p ? `Panel ${selected + 1} of ${count}${selected === 0 ? ' · Hero' : ''}` : 'No panel';
  document.getElementById('placeInput').value = p?.place || '';
  document.getElementById('timeInput').value = p?.time || '';
  document.getElementById('tagInput').value = p?.tag || '';
  document.getElementById('zoomInput').value = String(p?.zoom || 1);
}

function buildButtons() {
  const layoutRow = document.getElementById('layoutRow');
  for (const [key, def] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.value = key;
    b.textContent = def.label;
    b.addEventListener('click', () => {
      if (state.layout === key) return;
      pushHistory();
      state.layout = key;
      selected = 0;
      syncControls();
      render();
    });
    layoutRow.appendChild(b);
  }
  const gradeRow = document.getElementById('gradeRow');
  for (const [key, def] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.value = key;
    b.innerHTML = `<span class="sw" style="background:${def.dot}"></span>${def.label}`;
    b.addEventListener('click', () => {
      if (state.grade === key) return;
      pushHistory();
      state.grade = key;
      syncControls();
      render();
    });
    gradeRow.appendChild(b);
  }
  const sizeRow = document.getElementById('sizeRow');
  for (const [key, def] of Object.entries(SIZES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.value = key;
    b.textContent = def.label;
    b.addEventListener('click', () => {
      if (state.size === key) return;
      pushHistory();
      state.size = key;
      syncControls();
      render();
    });
    sizeRow.appendChild(b);
  }
  const sampleRow = document.getElementById('sampleRow');
  for (const name of SAMPLES) {
    const img = document.createElement('img');
    img.src = `samples/${name}`;
    img.alt = name;
    img.dataset.photo = name;
    img.addEventListener('click', () => {
      pushHistory();
      state.panels[selected].photo = name;
      state.panels[selected].zoom = 1;
      state.panels[selected].ox = 0;
      state.panels[selected].oy = 0;
      syncControls();
      render();
    });
    sampleRow.appendChild(img);
  }
}

function bindTextInputs() {
  const bind = (id, key) => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      state[key] = el.value;
      render();
    });
    el.addEventListener('change', pushHistory);
  };
  bind('titleInput', 'title');
  bind('subtitleInput', 'subtitle');
  bind('quoteInput', 'quote');
  bind('sourceInput', 'source');
  document.getElementById('starsInput').addEventListener('change', (e) => {
    pushHistory();
    state.stars = Number(e.target.value);
    render();
  });
  const panelBind = (id, key) => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      state.panels[selected][key] = el.value;
      render();
    });
    el.addEventListener('change', pushHistory);
  };
  panelBind('placeInput', 'place');
  panelBind('timeInput', 'time');
  panelBind('tagInput', 'tag');
  document.getElementById('zoomInput').addEventListener('input', (e) => {
    state.panels[selected].zoom = Number(e.target.value);
    render();
  });
  document.getElementById('zoomInput').addEventListener('change', pushHistory);
}

function bindCanvas() {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function toCanvas(e) {
    const r = canvas.getBoundingClientRect();
    const { w, h } = SIZES[state.size];
    return {
      x: ((e.clientX - r.left) / r.width) * w,
      y: ((e.clientY - r.top) / r.height) * h,
    };
  }
  function hitPanel(x, y) {
    const rects = panelRects(state.layout, SIZES[state.size].w, SIZES[state.size].h);
    for (let i = rects.length - 1; i >= 0; i--) {
      const r = rects[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
    }
    return -1;
  }

  canvas.addEventListener('pointerdown', (e) => {
    const p = toCanvas(e);
    const hit = hitPanel(p.x, p.y);
    if (hit < 0) return;
    if (hit !== selected) {
      selected = hit;
      syncControls();
    }
    dragging = true;
    lastX = p.x;
    lastY = p.y;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const p = toCanvas(e);
    const panel = state.panels[selected];
    const rects = panelRects(state.layout, SIZES[state.size].w, SIZES[state.size].h);
    const r = rects[selected];
    if (!panel || !r) return;
    // Pan in fractions of the slack the zoom leaves.
    const img = images[panel.photo];
    if (img) {
      const scale = Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight) * Math.max(1, panel.zoom);
      const slackX = Math.max(1, (img.naturalWidth * scale - r.w) / 2);
      const slackY = Math.max(1, (img.naturalHeight * scale - r.h) / 2);
      panel.ox = Math.max(-1, Math.min(1, panel.ox + ((p.x - lastX) / slackX)));
      panel.oy = Math.max(-1, Math.min(1, panel.oy + ((p.y - lastY) / slackY)));
    }
    lastX = p.x;
    lastY = p.y;
    render();
  });
  canvas.addEventListener('pointerup', () => {
    if (dragging) pushHistory();
    dragging = false;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = toCanvas(e);
    const hit = hitPanel(p.x, p.y);
    if (hit < 0) return;
    if (hit !== selected) {
      selected = hit;
      syncControls();
    }
    const panel = state.panels[selected];
    panel.zoom = Math.max(1, Math.min(3, (panel.zoom || 1) * (e.deltaY < 0 ? 1.08 : 0.92)));
    document.getElementById('zoomInput').value = String(panel.zoom);
    render();
  }, { passive: false });
}

function exportPNG() {
  const { w, h } = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off.getContext('2d'), w, h, state, images);
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${state.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

// Auto-fill: match each panel to the sample whose aspect fits it best.
function autoFill() {
  pushHistory();
  const rects = panelRects(state.layout, SIZES[state.size].w, SIZES[state.size].h);
  const used = SAMPLES.filter((s) => images[s]);
  rects.forEach((r, i) => {
    const target = r.w / r.h;
    let best = used[0];
    let bestScore = Infinity;
    for (const s of used) {
      const img = images[s];
      const score = Math.abs(Math.log((img.naturalWidth / img.naturalHeight) / target));
      if (score < bestScore) {
        bestScore = score;
        best = s;
      }
    }
    state.panels[i].photo = best;
    state.panels[i].zoom = 1;
    state.panels[i].ox = 0;
    state.panels[i].oy = 0;
  });
  syncControls();
  render();
}

// Shot modes for screenshots (?shot=cover / ?shot=export), kept harmless:
// they only preset state and hide the editor chrome for a clean capture.
function applyShotParams() {
  const size = params.get('size');
  if (size && SIZES[size]) state.size = size;
  const layout = params.get('layout');
  if (layout && LAYOUTS[layout]) state.layout = layout;
  const grade = params.get('grade');
  if (grade && GRADES[grade]) state.grade = grade;
  const title = params.get('title');
  if (title) state.title = title;
  const subtitle = params.get('subtitle');
  if (subtitle) state.subtitle = subtitle;
  const hero = params.get('photo');
  if (hero && SAMPLES.includes(hero)) state.panels[0].photo = hero;
  if (shotMode === 'cover' || shotMode === 'export') {
    document.body.classList.add('cover-only');
  }
}

buildButtons();
bindTextInputs();
bindCanvas();
document.getElementById('exportBtn').addEventListener('click', exportPNG);
document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('autoFillBtn').addEventListener('click', autoFill);
document.getElementById('uploadInput').addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const key = `upload:${Date.now()}`;
  loadImage(key, url).then(() => {
    pushHistory();
    state.panels[selected].photo = key;
    state.panels[selected].zoom = 1;
    state.panels[selected].ox = 0;
    state.panels[selected].oy = 0;
    const row = document.getElementById('sampleRow');
    const img = document.createElement('img');
    img.src = url;
    img.alt = file.name;
    img.dataset.photo = key;
    img.classList.add('uploaded');
    img.addEventListener('click', () => {
      pushHistory();
      state.panels[selected].photo = key;
      syncControls();
      render();
    });
    row.appendChild(img);
    syncControls();
    render();
  });
});
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    undo();
  }
});

applyShotParams();
syncControls();
await loadAllPhotos();
render();
document.title = 'READY';

// ?shot=export probe: renders the export canvas at full size and reports the
// PNG byte length in the document title, so the export path can be checked
// headlessly without a download. Harmless in normal use: it only runs in
// this mode, and the app's Export button uses the same drawCover + toBlob.
if (shotMode === 'export') {
  const { w, h } = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off.getContext('2d'), w, h, state, images);
  off.toBlob((blob) => {
    document.title = blob ? `EXPORT-OK:${blob.size}` : 'EXPORT-FAIL';
  }, 'image/png');
}
