// NEON PALMS studio wiring: the three-column editor around drawNeonCover.
// Left: photos, layouts, grades, caption. Middle: the live cover preview
// with drag-to-move and scroll-to-zoom per panel. Right: export sizes,
// per-panel controls and the Look & Title sliders. Everything redraws the
// same canvas the exporter paints, so what you see is what the PNG holds.

import { LAYOUTS, GRADES, PHOTO_LABELS, SAMPLE_KEYS, defaultState, drawNeonCover, panelAt } from './cover.js';
import { loadImage, loadCoverFonts, loadSamples, runCoverShot, runEditorShot } from './shots.js';

const PREVIEW = {
  square: [900, 900],
  portrait: [864, 1080],
  wide: [1080, 608],
};
const EXPORT_SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  wide: [1920, 1080],
};

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const state = defaultState();
let images = {};
let selected = 0;
let previewSize = 'square';
let uploadCount = 0;

const $ = (id) => document.getElementById(id);

function currentLayout() {
  return LAYOUTS[state.layout];
}

function selectedSlot() {
  return state.panels[selected] || state.panels[0];
}

/** Redraws the preview canvas from the current state. */
function redraw() {
  drawNeonCover(canvas, state, images, { editor: true, selected });
  updatePanelInfo();
}

/** The one-line readout under the preview: panel, photo, zoom. */
function updatePanelInfo() {
  const layout = currentLayout();
  const panel = layout.panels[selected];
  const slot = selectedSlot();
  const info = $('panelInfo');
  if (!panel || !info) return;
  const known = PHOTO_LABELS[slot.photo];
  const place = known ? known.label : slot.photo.toUpperCase();
  const face = slot.face ? ' · face focus' : '';
  const flip = slot.flip ? ' · flipped' : '';
  info.textContent = `Panel ${selected + 1} of ${layout.panels.length} · ${place} · ${slot.photo}.jpg · Zoom ${slot.zoom.toFixed(2)}×${face}${flip}`;
  const zoom = $('panelZoom');
  if (zoom) zoom.value = String(slot.zoom);
  const faceBtn = $('faceBtn');
  if (faceBtn) faceBtn.classList.toggle('active', !!slot.face);
  const flipBtn = $('flipBtn');
  if (flipBtn) flipBtn.classList.toggle('active', !!slot.flip);
}

/** Builds the photo thumbnail strip: bundled samples plus uploads. */
function buildThumbs(extra = []) {
  const strip = $('thumbs');
  if (!strip) return;
  strip.innerHTML = '';
  const keys = [...SAMPLE_KEYS, ...extra];
  keys.forEach((key) => {
    const img = images[key];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb';
    btn.title = `${key}.jpg — click to put it in panel ${selected + 1}`;
    if (img) {
      const thumb = document.createElement('img');
      thumb.src = img.src;
      thumb.alt = key;
      btn.appendChild(thumb);
    }
    const tag = document.createElement('span');
    tag.textContent = key;
    btn.appendChild(tag);
    btn.addEventListener('click', () => {
      selectedSlot().photo = key;
      redraw();
    });
    strip.appendChild(btn);
  });
}

/** Builds the six layout picker buttons with mini mosaic diagrams. */
function buildLayouts() {
  const wrap = $('layouts');
  if (!wrap) return;
  wrap.innerHTML = '';
  Object.entries(LAYOUTS).forEach(([key, layout]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'layout-btn';
    btn.dataset.layout = key;
    btn.title = `${layout.name} — ${layout.panels.length} panels`;
    const mini = document.createElement('span');
    mini.className = 'lay-mini';
    layout.panels.forEach((p) => {
      const cell = document.createElement('i');
      cell.style.left = `${p.r[0] * 100}%`;
      cell.style.top = `${p.r[1] * 100}%`;
      cell.style.width = `${p.r[2] * 100}%`;
      cell.style.height = `${p.r[3] * 100}%`;
      mini.appendChild(cell);
    });
    btn.appendChild(mini);
    const label = document.createElement('span');
    label.textContent = layout.name;
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      state.layout = key;
      selected = 0;
      document.querySelectorAll('.layout-btn').forEach((b) => b.classList.toggle('active', b.dataset.layout === key));
      redraw();
    });
    if (key === state.layout) btn.classList.add('active');
    wrap.appendChild(btn);
  });
}

/** Builds the five colour-grade swatch buttons. */
function buildGrades() {
  const wrap = $('grades');
  if (!wrap) return;
  wrap.innerHTML = '';
  Object.entries(GRADES).forEach(([key, grade]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'grade-btn';
    btn.dataset.grade = key;
    btn.title = grade.name;
    const sw = document.createElement('span');
    sw.className = 'grade-sw';
    sw.style.background = `linear-gradient(135deg, ${grade.top}, ${grade.bottom})`;
    btn.appendChild(sw);
    const label = document.createElement('span');
    label.textContent = grade.name;
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      state.grade = key;
      document.querySelectorAll('.grade-btn').forEach((b) => b.classList.toggle('active', b.dataset.grade === key));
      redraw();
    });
    if (key === state.grade) btn.classList.add('active');
    wrap.appendChild(btn);
  });
}

/** Builds the five WANTED star toggle buttons. */
function buildStars() {
  const wrap = $('starsRow');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (let n = 1; n <= 5; n++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'star-btn';
    btn.textContent = '★';
    btn.title = `${n} wanted star${n > 1 ? 's' : ''}`;
    btn.dataset.stars = String(n);
    btn.addEventListener('click', () => {
      state.stars = n;
      document.querySelectorAll('.star-btn').forEach((b) => b.classList.toggle('active', Number(b.dataset.stars) <= n));
      redraw();
    });
    if (n <= state.stars) btn.classList.add('active');
    wrap.appendChild(btn);
  }
}

/** Binds a caption field to its state key. */
function bindCaption(id, key) {
  const el = $(id);
  if (!el) return;
  el.value = state[key];
  el.addEventListener('input', () => {
    state[key] = el.value;
    redraw();
  });
}

/** Binds one Look & Title slider to its state key. */
function bindLook(id, key) {
  const el = $(id);
  if (!el) return;
  el.value = String(state.look[key]);
  el.addEventListener('input', () => {
    state.look[key] = Number(el.value);
    const out = document.querySelector(`[data-look-out="${key}"]`);
    if (out) out.textContent = `${el.value}%`;
    redraw();
  });
}

/** Renders the cover at an export size and downloads it as a PNG. */
async function exportSize(size) {
  const [w, h] = EXPORT_SIZES[size];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawNeonCover(off, state, images, {});
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  if (!blob) {
    status.textContent = 'Export failed — the browser refused the PNG.';
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `neon-palms-${size}-${w}x${h}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  status.textContent = `Saved neon-palms-${size}-${w}x${h}.png (${(blob.size / 1024).toFixed(0)} KB)`;
}

/** Pointer drag moves the selected panel's photo; the wheel zooms it. */
function bindCanvas() {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let dragPanel = -1;

  const toCanvas = (e) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  canvas.addEventListener('pointerdown', (e) => {
    const p = toCanvas(e);
    const hit = panelAt(state, p.x, p.y, canvas.width, canvas.height);
    if (hit < 0) return;
    selected = hit;
    dragPanel = hit;
    dragging = true;
    lastX = p.x;
    lastY = p.y;
    canvas.setPointerCapture(e.pointerId);
    redraw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || dragPanel < 0) return;
    const p = toCanvas(e);
    const layout = currentLayout();
    const panel = layout.panels[dragPanel];
    const slot = state.panels[dragPanel];
    if (!panel || !slot) return;
    slot.ox = Math.max(-0.4, Math.min(0.4, (slot.ox || 0) + (p.x - lastX) / (panel.r[2] * canvas.width)));
    slot.oy = Math.max(-0.4, Math.min(0.4, (slot.oy || 0) + (p.y - lastY) / (panel.r[3] * canvas.height)));
    lastX = p.x;
    lastY = p.y;
    redraw();
  });
  const endDrag = () => {
    dragging = false;
    dragPanel = -1;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const slot = selectedSlot();
    slot.zoom = Math.max(1, Math.min(2.5, slot.zoom * (1 - e.deltaY * 0.0012)));
    redraw();
  }, { passive: false });
}

/** Switches the preview between the three export aspect ratios. */
function bindSizes() {
  document.querySelectorAll('.size-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      previewSize = btn.dataset.size;
      const [w, h] = PREVIEW[previewSize];
      canvas.width = w;
      canvas.height = h;
      document.querySelectorAll('.size-btn').forEach((b) => b.classList.toggle('active', b === btn));
      redraw();
    });
  });
}

/** The per-panel controls: zoom slider, flip, swap with next, face focus. */
function bindPanelControls() {
  const zoom = $('panelZoom');
  if (zoom) {
    zoom.addEventListener('input', () => {
      selectedSlot().zoom = Number(zoom.value);
      redraw();
    });
  }
  $('flipBtn')?.addEventListener('click', () => {
    const slot = selectedSlot();
    slot.flip = !slot.flip;
    redraw();
  });
  $('faceBtn')?.addEventListener('click', () => {
    const slot = selectedSlot();
    slot.face = !slot.face;
    redraw();
  });
  $('swapBtn')?.addEventListener('click', () => {
    const layout = currentLayout();
    const next = (selected + 1) % layout.panels.length;
    const a = state.panels[selected];
    const b = state.panels[next];
    state.panels[selected] = b;
    state.panels[next] = a;
    selected = next;
    redraw();
  });
}

/** The Add-photos input: local files only, read on this machine. */
function bindUploads() {
  const input = $('addPhotos');
  if (!input) return;
  input.addEventListener('change', async () => {
    const files = [...(input.files || [])].filter((f) => f.type.startsWith('image/'));
    const added = [];
    for (const file of files) {
      const key = `up${uploadCount++}`;
      try {
        const img = await loadImage(URL.createObjectURL(file));
        images[key] = img;
        added.push(key);
      } catch {
        // A file that is not a readable image is skipped, not fatal.
      }
    }
    if (added.length > 0) {
      buildThumbs(Object.keys(images).filter((k) => !SAMPLE_KEYS.includes(k)));
      selectedSlot().photo = added[0];
      status.textContent = `Added ${added.length} photo${added.length > 1 ? 's' : ''} — placed in panel ${selected + 1}.`;
      redraw();
    }
    input.value = '';
  });
}

/** The export buttons: one per size, plus all three at once. */
function bindExports() {
  document.querySelectorAll('[data-export]').forEach((btn) => {
    btn.addEventListener('click', () => exportSize(btn.dataset.export));
  });
  $('exportAll')?.addEventListener('click', async () => {
    for (const size of ['square', 'portrait', 'wide']) {
      await exportSize(size);
      await new Promise((r) => setTimeout(r, 250));
    }
    status.textContent = 'Saved all three sizes: 1080×1080, 1080×1350, 1920×1080.';
  });
}

/** Builds the editor chrome, then paints the first preview. */
async function initEditor() {
  images = await loadSamples();
  buildThumbs();
  buildLayouts();
  buildGrades();
  buildStars();
  bindCaption('capTitle', 'title');
  bindCaption('capSubtitle', 'subtitle');
  bindCaption('capTagline', 'tagline');
  bindCaption('capQuote', 'quote');
  bindLook('lookPaint', 'paint');
  bindLook('lookGrade', 'grade');
  bindLook('lookHalftone', 'halftone');
  bindLook('lookGrain', 'grain');
  bindLook('lookGlow', 'glow');
  bindCanvas();
  bindSizes();
  bindPanelControls();
  bindUploads();
  bindExports();
  const [w, h] = PREVIEW[previewSize];
  canvas.width = w;
  canvas.height = h;
  await loadCoverFonts();
  redraw();
}

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot === 'cover') {
  document.body.classList.add('shot-cover');
  runCoverShot(canvas, params.get('size') || 'square');
} else if (shot === 'editor') {
  initEditor().then(() => {
    runEditorShot(canvas, () => redraw());
  });
} else {
  initEditor();
}
