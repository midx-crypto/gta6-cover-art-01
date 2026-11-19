// NEON PALMS cover renderer: a hero-mosaic, GTA-style multi-panel cover.
// One function draws the whole cover at any size (preview, export, shot),
// from a state object the editor owns. Everything is deterministic: the
// grain tile comes from a fixed-seed generator and the barcode bars from a
// hash of the title, so the same state always paints the same pixels.

export const SAMPLE_KEYS = ['driver', 'rider', 'tower', 'skyline', 'boulevard', 'pier'];

/** The location label that travels with each bundled photo, so a swapped
 *  photo always carries its own place and time with it. */
export const PHOTO_LABELS = {
  driver: { label: 'OCEAN DRIVE', time: '6:42 PM' },
  rider: { label: 'NEON ROW', time: '8:15 PM' },
  tower: { label: 'LIFEGUARD POINT', time: '5:58 PM' },
  skyline: { label: 'BAYFRONT', time: '9:40 PM' },
  boulevard: { label: 'PALM COURT', time: '6:10 PM' },
  pier: { label: 'PIER 26', time: '7:05 PM' },
};

/** The six panel layouts. Each panel is [x, y, w, h] in fractions of the
 *  cover, plus its label anchor: tl (top-left), tr (top-right) or bl
 *  (bottom-left, raised clear of the billing block). */
export const LAYOUTS = {
  'hero-left': {
    name: 'Hero Mosaic',
    panels: [
      { r: [0, 0, 0.42, 1], anchor: 'bl' },
      { r: [0.426, 0, 0.284, 0.497], anchor: 'tl' },
      { r: [0.716, 0, 0.284, 0.497], anchor: 'tl' },
      { r: [0.426, 0.503, 0.284, 0.497], anchor: 'bl' },
      { r: [0.716, 0.503, 0.284, 0.497], anchor: 'bl' },
    ],
  },
  'hero-right': {
    name: 'Hero Right',
    panels: [
      { r: [0, 0, 0.284, 0.497], anchor: 'tr' },
      { r: [0.29, 0, 0.284, 0.497], anchor: 'tl' },
      { r: [0, 0.503, 0.284, 0.497], anchor: 'bl' },
      { r: [0.29, 0.503, 0.284, 0.497], anchor: 'bl' },
      { r: [0.58, 0, 0.42, 1], anchor: 'bl' },
    ],
  },
  'top-hero': {
    name: 'Top Hero',
    panels: [
      { r: [0, 0, 1, 0.52], anchor: 'tr' },
      { r: [0, 0.526, 0.33, 0.474], anchor: 'bl' },
      { r: [0.335, 0.526, 0.33, 0.474], anchor: 'bl' },
      { r: [0.67, 0.526, 0.33, 0.474], anchor: 'bl' },
    ],
  },
  quad: {
    name: 'Quad Split',
    panels: [
      { r: [0, 0, 0.497, 0.497], anchor: 'tr' },
      { r: [0.503, 0, 0.497, 0.497], anchor: 'tl' },
      { r: [0, 0.503, 0.497, 0.497], anchor: 'bl' },
      { r: [0.503, 0.503, 0.497, 0.497], anchor: 'bl' },
    ],
  },
  trio: {
    name: 'Triple Strip',
    panels: [
      { r: [0, 0, 0.33, 1], anchor: 'bl' },
      { r: [0.335, 0, 0.33, 1], anchor: 'bl' },
      { r: [0.67, 0, 0.33, 1], anchor: 'bl' },
    ],
  },
  'six-frame': {
    name: 'Six Frame',
    panels: [
      { r: [0, 0, 0.33, 0.497], anchor: 'tr' },
      { r: [0.335, 0, 0.33, 0.497], anchor: 'tl' },
      { r: [0.67, 0, 0.33, 0.497], anchor: 'tl' },
      { r: [0, 0.503, 0.33, 0.497], anchor: 'bl' },
      { r: [0.335, 0.503, 0.33, 0.497], anchor: 'bl' },
      { r: [0.67, 0.503, 0.33, 0.497], anchor: 'bl' },
    ],
  },
};

/** The five colour grades: a canvas filter plus a tint gradient. */
export const GRADES = {
  vice: { name: 'Vice Sunset', filter: 'saturate(1.28) contrast(1.06) brightness(1.02) sepia(0.16)', top: '#ff7a2a', bottom: '#c2187a' },
  neon: { name: 'Neon Night', filter: 'saturate(1.38) contrast(1.08) brightness(0.96) hue-rotate(-12deg)', top: '#2a1a6e', bottom: '#ff2e88' },
  golden: { name: 'Golden Hour', filter: 'saturate(1.16) contrast(1.04) brightness(1.05) sepia(0.28)', top: '#ffb347', bottom: '#e2583e' },
  pastel: { name: 'Pastel Coast', filter: 'saturate(1.1) contrast(0.98) brightness(1.06)', top: '#7fe3d0', bottom: '#ff9ecf' },
  noir: { name: 'Noir Drive', filter: 'saturate(0.55) contrast(1.16) brightness(0.94)', top: '#3a4a6b', bottom: '#12081f' },
};

/** The default editor state: NEON PALMS, hero mosaic, Vice Sunset grade. */
export function defaultState() {
  return {
    layout: 'hero-left',
    grade: 'vice',
    title: 'NEON PALMS',
    subtitle: 'one last summer',
    tagline: 'CHASE THE SUN · OUTRUN THE NIGHT',
    quote: 'Every sunset is a getaway.',
    stars: 5,
    look: { paint: 55, grade: 60, halftone: 25, grain: 30, glow: 45 },
    panels: [
      { photo: 'driver', zoom: 1.12, ox: 0, oy: 0, flip: false, face: true },
      { photo: 'rider', zoom: 1.08, ox: 0, oy: 0, flip: false, face: false },
      { photo: 'tower', zoom: 1.05, ox: 0, oy: 0, flip: false, face: false },
      { photo: 'skyline', zoom: 1.05, ox: 0, oy: 0, flip: false, face: false },
      { photo: 'boulevard', zoom: 1.1, ox: 0, oy: 0, flip: false, face: false },
      { photo: 'pier', zoom: 1.1, ox: 0, oy: 0, flip: false, face: false },
    ],
  };
}

/** A tiny seeded generator (mulberry32) so the grain tile never changes. */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;
/** A 128 px monochrome noise tile, built once from a fixed seed. */
function getGrainTile() {
  if (grainTile) return grainTile;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const img = g.createImageData(128, 128);
  const rnd = seededRandom(20261120);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 96 + Math.floor(rnd() * 64);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

/** A small hash of a string, used to seed the barcode bars from the title. */
function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Draws one photo into a panel rect, honouring zoom, drag offset, flip
 *  and the face focus (aims the frame at the upper third of the photo).
 *  `extraOy` is an extra vertical shift in fractions of the panel height,
 *  used to lift a face clear of the title in narrow panels. */
function drawPanelPhoto(ctx, img, rect, panel, filter, extraOy = 0) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.filter = filter;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const base = Math.max(w / iw, h / ih);
  const s = base * (panel.zoom || 1);
  const dw = iw * s;
  const dh = ih * s;
  const fx = 0.5;
  const fy = panel.face ? 0.3 : 0.5;
  let dx = x + w / 2 - fx * dw + (panel.ox || 0) * w;
  let dy = y + h / 2 - fy * dh + (panel.oy || 0) * h + extraOy * h;
  if (dw > w) dx = Math.min(x, Math.max(x + w - dw, dx));
  if (dh > h) dy = Math.min(y, Math.max(y + h - dh, dy));
  if (panel.flip) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(-1, 1);
    ctx.translate(-(x + w / 2), -(y + h / 2));
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  ctx.filter = 'none';
}

/** A five-pointed star path centred at (cx, cy) with outer radius r. */
function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** The WANTED star row, top-left. Filled stars are gold, the rest hollow. */
function drawWanted(ctx, W, H, count) {
  const r = H * 0.016;
  const x0 = W * 0.028;
  const y = H * 0.052;
  ctx.save();
  ctx.font = `bold ${Math.round(H * 0.016)}px Anton, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = H * 0.006;
  ctx.fillText('W A N T E D', x0, H * 0.032);
  for (let i = 0; i < 5; i++) {
    const cx = x0 + r + i * r * 2.4;
    starPath(ctx, cx, y, r);
    if (i < count) {
      ctx.fillStyle = '#ffd23e';
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fill();
    }
    ctx.lineWidth = Math.max(1, H * 0.0016);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.stroke();
  }
  ctx.restore();
}

/** The starburst seal, bottom-right, overlapping the photo grid. */
function drawSeal(ctx, W, H) {
  const cx = W * 0.875;
  const cy = H * 0.735;
  const R = W * 0.072;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.21);
  ctx.beginPath();
  const points = 16;
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? R : R * 0.86;
    const a = (i * Math.PI) / points;
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd23e';
  ctx.fill();
  ctx.lineWidth = Math.max(2, H * 0.003);
  ctx.strokeStyle = '#7a1e2b';
  ctx.stroke();
  ctx.fillStyle = '#7a1e2b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(R * 0.24)}px Anton, sans-serif`;
  ctx.fillText('ORIGINAL', 0, -R * 0.16);
  ctx.fillText('COVER ART', 0, R * 0.16);
  ctx.restore();
}

/** The barcode, bottom-right, its bars seeded by the title. */
function drawBarcode(ctx, W, H, title) {
  const bw = W * 0.088;
  const bh = H * 0.038;
  const x = W * 0.895;
  const y = H * 0.898;
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, bw, bh);
  const rnd = seededRandom(hashString(title || 'NEON PALMS'));
  let bx = x + bw * 0.06;
  ctx.fillStyle = '#111111';
  while (bx < x + bw * 0.94) {
    const wBar = bw * (0.008 + rnd() * 0.02);
    if (rnd() > 0.35) ctx.fillRect(bx, y + bh * 0.1, wBar, bh * 0.72);
    bx += wBar + bw * 0.008;
  }
  ctx.restore();
}

/** The billing block, centred on the foot of the cover. */
function drawBilling(ctx, W, H) {
  const line = 'A LEONIDA PICTURES PRODUCTION · STARRING YOU · SHOT ON YOUR OWN CAMERA · GRADED BY HAND';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = H * 0.005;
  let size = Math.round(H * 0.0165);
  ctx.font = `bold ${size}px Anton, sans-serif`;
  while (ctx.measureText(line).width > W * 0.88 && size > 9) {
    size -= 1;
    ctx.font = `bold ${size}px Anton, sans-serif`;
  }
  ctx.fillText(line, W / 2, H * 0.978);
  ctx.restore();
}

/** The quote, bottom-left above the billing block. */
function drawQuote(ctx, W, H, quote) {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = H * 0.005;
  const qSize = Math.round(H * 0.021);
  ctx.font = `italic ${qSize}px Georgia, serif`;
  ctx.fillText(`“${quote}”`, W * 0.028, H * 0.912);
  ctx.font = `bold ${Math.round(H * 0.0145)}px Anton, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('— THE COAST HERALD · VOL. 07', W * 0.028, H * 0.936);
  ctx.restore();
}

/** A panel's location + time label, at its anchor corner. The label comes
 *  from the photo in the panel, so it travels with the photo on a swap.
 *  Bottom labels sit raised, clear of the billing block at the foot. */
function drawPanelLabel(ctx, photoKey, panel, rect, H) {
  const known = PHOTO_LABELS[photoKey];
  const labelText = known ? known.label : photoKey.toUpperCase();
  const timeText = known ? known.time : '';
  const size = Math.max(11, Math.round(H * 0.017));
  ctx.save();
  ctx.font = `bold ${size}px Anton, sans-serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = H * 0.006;
  const text = timeText ? `${labelText} · ${timeText}` : labelText;
  const pad = H * 0.012;
  let x;
  let y;
  if (panel.anchor === 'tr') {
    ctx.textAlign = 'right';
    x = rect.x + rect.w - pad;
    y = rect.y + pad + size;
  } else if (panel.anchor === 'bl') {
    ctx.textAlign = 'left';
    x = rect.x + pad;
    y = rect.y + rect.h - H * 0.045;
  } else {
    ctx.textAlign = 'left';
    x = rect.x + pad;
    y = rect.y + pad + size;
  }
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** The big 3D title, gradient-filled with a stacked extrude, centred on the
 *  seam of the grid, with the script subtitle and tagline beneath it. */
function drawTitleBlock(ctx, W, H, state) {
  const look = state.look;
  const cx = W / 2;
  const title = (state.title || 'NEON PALMS').trim().toUpperCase();
  // Fit the title to the width, then place it over the grid's middle seam.
  let size = Math.round(H * 0.15);
  ctx.font = `${size}px Anton, sans-serif`;
  while (ctx.measureText(title).width > W * 0.94 && size > 24) {
    size -= 2;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  const titleY = H * 0.44;
  const grad = ctx.createLinearGradient(0, titleY - size * 0.8, 0, titleY + size * 0.25);
  grad.addColorStop(0, '#ffb347');
  grad.addColorStop(0.45, '#ff5e62');
  grad.addColorStop(0.75, '#ff2e88');
  grad.addColorStop(1, '#8b2ff7');
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${size}px Anton, sans-serif`;
  // Extrude: stacked dark copies stepping down-right.
  const steps = 7;
  ctx.fillStyle = '#3d0a4e';
  for (let i = steps; i >= 1; i--) {
    const off = (size * 0.045 * i) / steps;
    ctx.fillText(title, cx + off * 1.6, titleY + off * 2.2);
  }
  // Neon glow under the gradient face.
  ctx.shadowColor = `rgba(255,46,136,${0.35 + (look.glow / 100) * 0.5})`;
  ctx.shadowBlur = (look.glow / 100) * size * 0.55;
  ctx.fillStyle = grad;
  ctx.fillText(title, cx, titleY);
  ctx.shadowBlur = 0;
  // Thin bright rim on the top edge of the letters.
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillText(title, cx, titleY - size * 0.012);
  ctx.restore();

  // Script subtitle, then the spaced tagline.
  const subY = titleY + size * 0.72;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = H * 0.008;
  let subSize = Math.round(H * 0.042);
  ctx.font = `${subSize}px Pacifico, cursive`;
  while (ctx.measureText(state.subtitle).width > W * 0.7 && subSize > 14) {
    subSize -= 1;
    ctx.font = `${subSize}px Pacifico, cursive`;
  }
  ctx.fillText(state.subtitle, cx, subY);
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe9a8';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = H * 0.006;
  let tagSize = Math.round(H * 0.022);
  ctx.font = `bold ${tagSize}px Anton, sans-serif`;
  try {
    ctx.letterSpacing = `${Math.round(H * 0.004)}px`;
  } catch {
    // Older canvas builds ignore letterSpacing; the tagline still draws.
  }
  while (ctx.measureText(state.tagline).width > W * 0.86 && tagSize > 10) {
    tagSize -= 1;
    ctx.font = `bold ${tagSize}px Anton, sans-serif`;
  }
  ctx.fillText(state.tagline, cx, subY + H * 0.052);
  try {
    ctx.letterSpacing = '0px';
  } catch {
    // Ignore.
  }
  ctx.restore();
}

/** Halftone dots over the mosaic, denser where the slider says so. */
function drawHalftone(ctx, W, H, amount) {
  if (amount <= 0) return;
  ctx.save();
  ctx.fillStyle = `rgba(10,4,20,${0.05 + (amount / 100) * 0.13})`;
  const gap = Math.max(9, Math.round(H * 0.013));
  const r = Math.max(0.7, gap * 0.16 * (0.5 + amount / 100));
  for (let y = gap / 2; y < H; y += gap) {
    for (let x = gap / 2; x < W; x += gap) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** The cover itself. `images` maps photo keys to loaded images (or null).
 *  `opts.editor` adds panel numbers and the selected-panel outline. */
export function drawNeonCover(canvas, state, images, opts = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const layout = LAYOUTS[state.layout] || LAYOUTS['hero-left'];
  const grade = GRADES[state.grade] || GRADES.vice;
  const look = state.look;
  const paintFilter = `saturate(${1 + look.paint / 130}) contrast(${1 + look.paint / 420})`;
  const filter = `${grade.filter} ${paintFilter}`;

  ctx.save();
  ctx.filter = 'none';
  ctx.fillStyle = '#160a1e';
  ctx.fillRect(0, 0, W, H);

  // The photo mosaic. A face-focused photo in a narrow panel is lifted a
  // little, so the title that crosses the middle seam never hides the eyes.
  const rects = layout.panels.map((p) => ({
    x: p.r[0] * W,
    y: p.r[1] * H,
    w: p.r[2] * W,
    h: p.r[3] * H,
  }));
  layout.panels.forEach((panel, i) => {
    const slot = state.panels[i] || state.panels[0];
    const img = images[slot.photo];
    const narrowFace = slot.face && rects[i].w / rects[i].h < 0.5;
    if (img) drawPanelPhoto(ctx, img, rects[i], slot, filter, narrowFace ? -0.2 : 0);
  });

  // The grade tint: a warm-to-purple wash over the whole mosaic.
  const wash = ctx.createLinearGradient(0, 0, 0, H);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(1, grade.bottom);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.25 + (look.grade / 100) * 0.45;
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  drawHalftone(ctx, W, H, look.halftone);
  if (look.grain > 0) {
    const tile = getGrainTile();
    const pattern = ctx.createPattern(tile, 'repeat');
    ctx.save();
    ctx.globalAlpha = (look.grain / 100) * 0.16;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Panel labels, then the cover furniture.
  layout.panels.forEach((panel, i) => {
    const slot = state.panels[i] || state.panels[0];
    drawPanelLabel(ctx, slot.photo, panel, rects[i], H);
  });
  drawWanted(ctx, W, H, state.stars);
  drawTitleBlock(ctx, W, H, state);
  drawQuote(ctx, W, H, state.quote);
  drawBilling(ctx, W, H);
  drawSeal(ctx, W, H);
  drawBarcode(ctx, W, H, state.title);

  // Editor-only overlays: panel numbers and the selected outline.
  if (opts.editor) {
    rects.forEach((rect, i) => {
      const cx = rect.x + H * 0.022;
      const cy = rect.y + H * 0.022;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, H * 0.016, 0, Math.PI * 2);
      ctx.fillStyle = opts.selected === i ? '#ff2e88' : 'rgba(10,4,20,0.85)';
      ctx.fill();
      ctx.lineWidth = Math.max(1, H * 0.0015);
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(H * 0.016)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), cx, cy + 1);
      ctx.restore();
      if (opts.selected === i) {
        ctx.save();
        ctx.lineWidth = Math.max(2, H * 0.004);
        ctx.strokeStyle = '#ff2e88';
        ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
        ctx.restore();
      }
    });
  }
  ctx.restore();
}

/** The panel index whose rect holds (px, py) in canvas pixels, or -1. */
export function panelAt(state, px, py, W, H) {
  const layout = LAYOUTS[state.layout] || LAYOUTS['hero-left'];
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const p = layout.panels[i];
    const x = p.r[0] * W;
    const y = p.r[1] * H;
    const w = p.r[2] * W;
    const h = p.r[3] * H;
    if (px >= x && px <= x + w && py >= y && py <= y + h) return i;
  }
  return -1;
}
