// Vice Cover Studio — editor wiring.
// Pick photos, crop-position each panel, edit the caption, export a PNG.
// All photos stay on this machine: samples are local files, uploads are read
// with FileReader/object URLs and never sent anywhere.

import { GRADES, LAYOUTS, SIZES, layoutRects, drawCover } from './cover.js';

const SAMPLES = [
  { id: 'convertible', src: 'samples/convertible.jpg', label: 'Convertible' },
  { id: 'neon-portrait', src: 'samples/neon-portrait.jpg', label: 'Neon Portrait' },
  { id: 'coast-road', src: 'samples/coast-road.jpg', label: 'Coast Road' },
  { id: 'gas-station', src: 'samples/gas-station.jpg', label: 'Gas Station' },
  { id: 'boulevard', src: 'samples/boulevard.jpg', label: 'Boulevard' },
  { id: 'pier', src: 'samples/pier.jpg', label: 'Pier' },
];

const DEFAULT_PANELS = [
  { src: 'samples/convertible.jpg', px: 0, py: 0, zoom: 1, place: 'Neon Row', time: '9:12 PM', tag: 'No witnesses' },
  { src: 'samples/coast-road.jpg', px: 0, py: 0, zoom: 1, place: 'Coast Highway', time: '7:40 PM', tag: 'Last light' },
  { src: 'samples/pier.jpg', px: 0, py: 0, zoom: 1, place: 'Pier 39', time: '6:05 AM', tag: 'Empty nets' },
  { src: 'samples/gas-station.jpg', px: 0, py: 0, zoom: 1, place: 'Gas & Go', time: '11:47 PM', tag: 'Full tank, no plan' },
];

function defaultState() {
  return {
    layout: 'hero-top',
    grade: 'sunset',
    size: 'landscape',
    title: 'NEON TIDE',
    subtitle: 'Six nights in paradise',
    quote: 'A fever dream in neon — The Coast Herald',
    stars: 5,
    panels: DEFAULT_PANELS.map((p) => ({ ...p })),
  };
}

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const selftest = params.get('selftest') === '1';

let state = defaultState();
let selected = 0;
let history = [];
const images = new Map(); // src -> HTMLImageElement
const customPhotos = []; // uploaded {src, label}

function loadImage(src) {
  if (images.has(src)) return Promise.resolve(images.get(src));
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { images.set(src, img); resolve(img); };
    img.onerror = () => { images.set(src, null); resolve(null); };
    img.src = src;
  });
}

async function loadFonts() {
  try {
    const anton = new FontFace('Anton', "url('fonts/Anton-Regular.ttf')");
    const pacifico = new FontFace('Pacifico', "url('fonts/Pacifico-Regular.ttf')");
    await Promise.all([anton.load(), pacifico.load()]);
    document.fonts.add(anton);
    document.fonts.add(pacifico);
  } catch (e) { /* fall back to system fonts; the cover still draws */ }
  await document.fonts.ready.catch(() => {});
}

// ---- state helpers -------------------------------------------------------

function snapshot() {
  return JSON.stringify(state);
}

function restore(json) {
  state = JSON.parse(json);
  syncControls();
  renderPreview();
}

function pushHistory() {
  history.push(snapshot());
  if (history.length > 50) history.shift();
}

function undo() {
  const prev = history.pop();
  if (prev) restore(prev);
}

function stateWithImages() {
  return {
    ...state,
    panels: state.panels.map((p) => ({ ...p, img: images.get(p.src) || null })),
  };
}

function currentSize() {
  return SIZES.find((s) => s.id === state.size) || SIZES[2];
}

// ---- preview -------------------------------------------------------------

const preview = document.getElementById('preview');
const pctx = preview.getContext('2d');

function renderPreview() {
  const size = currentSize();
  const maxW = size.w >= size.h ? 960 : 720;
  const scale = maxW / size.w;
  preview.width = Math.round(size.w * scale);
  preview.height = Math.round(size.h * scale);
  drawCover(pctx, stateWithImages(), preview.width, preview.height);
  drawSelection();
}

function drawSelection() {
  if (shot) return;
  const rects = layoutRects(state.layout);
  const layout = LAYOUTS.find((l) => l.id === state.layout) || LAYOUTS[0];
  const n = layout.panels;
  const gap = Math.max(2, preview.width * 0.004);
  pctx.save();
  for (let i = 0; i < n; i++) {
    const [fx, fy, fw, fh] = rects[i];
    const x = fx * preview.width, y = fy * preview.height;
    const w = fw * preview.width, h = fh * preview.height;
    pctx.strokeStyle = i === selected ? '#ffd166' : 'rgba(255,255,255,0.35)';
    pctx.lineWidth = i === selected ? 3 : 1;
    if (state.layout === 'slash') {
      const slant = preview.width * 0.045;
      pctx.beginPath();
      pctx.moveTo(x + (i === 0 ? 0 : slant), 0);
      pctx.lineTo(x + fw * preview.width + slant, 0);
      pctx.lineTo(x + fw * preview.width - (i === 2 ? 0 : slant), preview.height);
      pctx.lineTo(x - slant, preview.height);
      pctx.closePath();
      pctx.stroke();
    } else {
      pctx.strokeRect(x + gap / 2, y + gap / 2, w - gap, h - gap);
    }
  }
  pctx.restore();
}

function hitPanel(clientX, clientY) {
  const r = preview.getBoundingClientRect();
  const x = (clientX - r.left) * (preview.width / r.width);
  const y = (clientY - r.top) * (preview.height / r.height);
  const rects = layoutRects(state.layout);
  const layout = LAYOUTS.find((l) => l.id === state.layout) || LAYOUTS[0];
  for (let i = layout.panels - 1; i >= 0; i--) {
    const [fx, fy, fw, fh] = rects[i];
    if (x >= fx * preview.width && x <= (fx + fw) * preview.width
      && y >= fy * preview.height && y <= (fy + fh) * preview.height) return i;
  }
  return 0;
}

// ---- export --------------------------------------------------------------

function renderExport(sizeId) {
  const size = SIZES.find((s) => s.id === sizeId) || currentSize();
  const canvas = document.createElement('canvas');
  canvas.width = size.w; canvas.height = size.h;
  drawCover(canvas.getContext('2d'), stateWithImages(), size.w, size.h);
  return { canvas, size };
}

function exportPNG() {
  const { canvas, size } = renderExport(state.size);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

// ---- controls ------------------------------------------------------------

const $ = (id) => document.getElementById(id);

function segmented(el, items, current, onPick) {
  el.innerHTML = '';
  for (const item of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'seg' + (item.id === current ? ' on' : '');
    b.textContent = item.name;
    b.addEventListener('click', () => { pushHistory(); onPick(item.id); renderPreview(); syncControls(); });
    el.appendChild(b);
  }
}

function syncControls() {
  segmented($('layouts'), LAYOUTS, state.layout, (id) => { state.layout = id; selected = 0; });
  segmented($('grades'), GRADES, state.grade, (id) => { state.grade = id; });
  segmented($('sizes'), SIZES, state.size, (id) => { state.size = id; });
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('quote').value = state.quote;
  $('stars').value = String(state.stars);
  const p = state.panels[selected] || {};
  $('panel-name').textContent = `Panel ${selected + 1} — ${p.place || 'untitled'}`;
  $('place').value = p.place || '';
  $('time').value = p.time || '';
  $('tag').value = p.tag || '';
  $('zoom').value = String(p.zoom || 1);
  $('panx').value = String(p.px || 0);
  $('pany').value = String(p.py || 0);
  document.querySelectorAll('#photos .thumb').forEach((t) => {
    t.classList.toggle('on', t.dataset.src === p.src);
  });
}

function buildPhotoStrip() {
  const strip = $('photos');
  strip.innerHTML = '';
  const all = [...SAMPLES, ...customPhotos];
  for (const ph of all) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.dataset.src = ph.src;
    b.title = ph.label;
    const img = document.createElement('img');
    img.src = ph.src;
    img.alt = ph.label;
    b.appendChild(img);
    b.addEventListener('click', () => {
      pushHistory();
      state.panels[selected].src = ph.src;
      loadImage(ph.src).then(renderPreview);
      syncControls();
    });
    strip.appendChild(b);
  }
}

function bindControls() {
  $('title').addEventListener('input', (e) => { state.title = e.target.value; renderPreview(); });
  $('title').addEventListener('change', pushHistory);
  $('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; renderPreview(); });
  $('subtitle').addEventListener('change', pushHistory);
  $('quote').addEventListener('input', (e) => { state.quote = e.target.value; renderPreview(); });
  $('quote').addEventListener('change', pushHistory);
  $('stars').addEventListener('change', (e) => { pushHistory(); state.stars = Number(e.target.value); renderPreview(); });
  $('place').addEventListener('input', (e) => { state.panels[selected].place = e.target.value; renderPreview(); });
  $('place').addEventListener('change', pushHistory);
  $('time').addEventListener('input', (e) => { state.panels[selected].time = e.target.value; renderPreview(); });
  $('time').addEventListener('change', pushHistory);
  $('tag').addEventListener('input', (e) => { state.panels[selected].tag = e.target.value; renderPreview(); });
  $('tag').addEventListener('change', pushHistory);
  $('zoom').addEventListener('input', (e) => { state.panels[selected].zoom = Number(e.target.value); renderPreview(); });
  $('zoom').addEventListener('change', pushHistory);
  $('panx').addEventListener('input', (e) => { state.panels[selected].px = Number(e.target.value); renderPreview(); });
  $('panx').addEventListener('change', pushHistory);
  $('pany').addEventListener('input', (e) => { state.panels[selected].py = Number(e.target.value); renderPreview(); });
  $('pany').addEventListener('change', pushHistory);
  $('undo').addEventListener('click', undo);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
  });
  $('export').addEventListener('click', exportPNG);
  $('fill-all').addEventListener('click', () => {
    pushHistory();
    const src = state.panels[selected].src;
    state.panels.forEach((p) => { p.src = src; });
    renderPreview(); syncControls();
  });
  $('reset').addEventListener('click', () => {
    pushHistory();
    state = defaultState(); selected = 0;
    Promise.all(state.panels.map((p) => loadImage(p.src))).then(() => { renderPreview(); syncControls(); });
  });
  $('upload').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const label = file.name.replace(/\.[^.]+$/, '') || 'Upload';
    customPhotos.push({ src: url, label });
    pushHistory();
    state.panels[selected].src = url;
    loadImage(url).then(() => { buildPhotoStrip(); renderPreview(); syncControls(); });
    e.target.value = '';
  });

  // Drag to pan the selected panel, wheel to zoom it.
  let drag = null;
  preview.addEventListener('pointerdown', (e) => {
    pushHistory();
    selected = hitPanel(e.clientX, e.clientY);
    syncControls();
    drag = { x: e.clientX, y: e.clientY };
    preview.setPointerCapture(e.pointerId);
    renderPreview();
  });
  preview.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = preview.getBoundingClientRect();
    const dx = (e.clientX - drag.x) * (preview.width / r.width);
    const dy = (e.clientY - drag.y) * (preview.height / r.height);
    drag = { x: e.clientX, y: e.clientY };
    const p = state.panels[selected];
    p.px = Math.max(-1, Math.min(1, (p.px || 0) + (dx / preview.width) * 2));
    p.py = Math.max(-1, Math.min(1, (p.py || 0) + (dy / preview.height) * 2));
    renderPreview();
    $('panx').value = String(p.px); $('pany').value = String(p.py);
  });
  preview.addEventListener('pointerup', () => { drag = null; });
  preview.addEventListener('wheel', (e) => {
    e.preventDefault();
    pushHistory();
    const p = state.panels[selected];
    p.zoom = Math.max(1, Math.min(3, (p.zoom || 1) * (1 - e.deltaY * 0.001)));
    $('zoom').value = String(p.zoom);
    renderPreview();
  }, { passive: false });
}

// ---- shot mode: full-screen cover for screenshots -------------------------

async function runShot() {
  document.body.classList.add('shot');
  const size = shot === 'portrait' ? SIZES[1] : shot === 'square' ? SIZES[0] : SIZES[2];
  const canvas = document.getElementById('shot');
  canvas.width = size.w; canvas.height = size.h;
  await loadFonts();
  await Promise.all(state.panels.map((p) => loadImage(p.src)));
  drawCover(canvas.getContext('2d'), stateWithImages(), size.w, size.h);
  document.title = `Vice Cover Studio — ${shot} ${size.w}x${size.h}`;
}

// ---- self-test: render all 3 sizes, report into the DOM ------------------

async function runSelfTest() {
  const results = [];
  for (const size of SIZES) {
    const { canvas } = renderExport(size.id);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
    const px = canvas.getContext('2d').getImageData(Math.floor(size.w / 2), Math.floor(size.h / 2), 1, 1).data;
    const nonBlank = px[0] + px[1] + px[2] > 30;
    results.push({ size: `${size.w}x${size.h}`, bytes: blob ? blob.size : 0, nonBlank });
  }
  const ok = results.every((r) => r.bytes > 10000 && r.nonBlank);
  const text = JSON.stringify({ ok, results });
  $('selftest').textContent = text;
  document.title = `SELFTEST ${ok ? 'PASS' : 'FAIL'} ${text}`;
}

// ---- init ------------------------------------------------------------------

async function init() {
  if (shot && shot !== 'editor') {
    await runShot();
    return;
  }
  buildPhotoStrip();
  bindControls();
  syncControls();
  await loadFonts();
  await Promise.all(SAMPLES.map((s) => loadImage(s.src)));
  renderPreview();
  if (selftest) await runSelfTest();
}

init();
