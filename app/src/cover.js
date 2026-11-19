// Vice Cover Studio — cover renderer.
// Draws a multi-panel GTA-style poster cover onto any canvas at any size.
// Pure canvas 2D, no network, no dependencies. Fonts come from app/fonts/.

export const GRADES = [
  { id: 'sunset', name: 'Vice Sunset', kind: 'sunset' },
  { id: 'neon', name: 'Neon Night', kind: 'neon' },
  { id: 'gold', name: 'Gold Hour', kind: 'gold' },
  { id: 'magenta', name: 'Magenta Dusk', kind: 'magenta' },
  { id: 'teal', name: 'Teal Noir', kind: 'teal' },
];

export const LAYOUTS = [
  { id: 'hero-top', name: 'Hero Top', panels: 4 },
  { id: 'hero-left', name: 'Hero Left', panels: 4 },
  { id: 'slash', name: 'Slash Cut', panels: 3 },
  { id: 'three-panel', name: 'Three Panel', panels: 3 },
  { id: 'four-square', name: 'Four Square', panels: 4 },
  { id: 'portrait-stack', name: 'Portrait Stack', panels: 3 },
];

export const SIZES = [
  { id: 'square', name: 'Square 1080 x 1080', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  { id: 'landscape', name: 'Landscape 1920 x 1080', w: 1920, h: 1080 },
];

// Panel rects as fractions of the cover [x, y, w, h]. The first rect is the hero.
export function layoutRects(layoutId) {
  const t = 1 / 3;
  switch (layoutId) {
    case 'hero-left':
      return [
        [0, 0, 0.6, 1],
        [0.6, 0, 0.4, t], [0.6, t, 0.4, t], [0.6, 2 * t, 0.4, t],
      ];
    case 'slash':
      return [[0, 0, 0.36, 1], [0.32, 0, 0.36, 1], [0.64, 0, 0.36, 1]];
    case 'three-panel':
      return [[0, 0, t, 1], [t, 0, t, 1], [2 * t, 0, t, 1]];
    case 'four-square':
      return [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]];
    case 'portrait-stack':
      return [[0, 0, 1, 0.55], [0, 0.55, 0.5, 0.45], [0.5, 0.55, 0.5, 0.45]];
    case 'hero-top':
    default:
      return [
        [0, 0, 1, 0.6],
        [0, 0.6, t, 0.4], [t, 0.6, t, 0.4], [2 * t, 0.6, t, 0.4],
      ];
  }
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

// Cover-fit draw of one photo inside a rect, with pan (px, py in -1..1) and zoom.
export function drawPhoto(ctx, img, rect, px, py, zoom) {
  const [rx, ry, rw, rh] = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, rw, rh);
  ctx.clip();
  if (!img || !img.naturalWidth) {
    const g = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
    g.addColorStop(0, '#3b1d4d'); g.addColorStop(1, '#12081f');
    ctx.fillStyle = g; ctx.fillRect(rx, ry, rw, rh);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `700 ${Math.max(12, rw * 0.045)}px Anton, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('ADD PHOTO', rx + rw / 2, ry + rh / 2);
    ctx.restore();
    return;
  }
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const s = Math.max(rw / iw, rh / ih) * Math.max(1, zoom || 1);
  const dw = iw * s, dh = ih * s;
  const ox = clamp(px || 0, -1, 1) * Math.max(0, (dw - rw) / 2);
  const oy = clamp(py || 0, -1, 1) * Math.max(0, (dh - rh) / 2);
  ctx.drawImage(img, rx + (rw - dw) / 2 + ox, ry + (rh - dh) / 2 + oy, dw, dh);
  ctx.restore();
}

function gradeOverlay(ctx, gradeId, W, H) {
  ctx.save();
  let g;
  switch (gradeId) {
    case 'neon': {
      g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, 'rgba(255,45,149,0.34)');
      g.addColorStop(0.55, 'rgba(20,10,40,0.10)');
      g.addColorStop(1, 'rgba(0,229,255,0.30)');
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      break;
    }
    case 'gold': {
      g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(255,190,80,0.10)');
      g.addColorStop(1, 'rgba(255,140,0,0.34)');
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      break;
    }
    case 'magenta': {
      g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, 'rgba(190,20,120,0.30)');
      g.addColorStop(1, 'rgba(80,10,90,0.28)');
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      break;
    }
    case 'teal': {
      g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(0,60,70,0.30)');
      g.addColorStop(1, 'rgba(0,20,30,0.42)');
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      break;
    }
    case 'sunset':
    default: {
      g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(255,120,40,0.06)');
      g.addColorStop(0.6, 'rgba(255,80,90,0.16)');
      g.addColorStop(1, 'rgba(255,45,120,0.30)');
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      break;
    }
  }
  ctx.restore();
  // Vignette: darkened edges keep the lettering readable.
  ctx.save();
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, gradeId === 'teal' ? 'rgba(0,0,0,0.42)' : 'rgba(0,0,0,0.28)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(2, s * 0.09);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.08, y - s * 0.55, x + s * 0.22, y - s * 0.95);
  ctx.stroke();
  const tx = x + s * 0.22, ty = y - s * 0.95;
  for (let i = 0; i < 6; i++) {
    const a = (-160 + i * 52) * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(
      tx + Math.cos(a) * s * 0.42, ty + Math.sin(a) * s * 0.42 - s * 0.12,
      tx + Math.cos(a) * s * 0.62, ty + Math.sin(a) * s * 0.62 + s * 0.22);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLabelChip(ctx, panel, rect, W, H, at) {
  const [rx, ry, rw] = rect;
  const pad = Math.max(8, W * 0.008);
  const fs = Math.max(11, W * 0.016);
  const fs2 = Math.max(9, W * 0.0125);
  ctx.save();
  ctx.font = `${fs}px Anton, sans-serif`;
  const line1 = `${(panel.place || '').toUpperCase()}  ·  ${panel.time || ''}`;
  const w1 = ctx.measureText(line1).width;
  ctx.font = `${fs2}px Anton, sans-serif`;
  const line2 = (panel.tag || '').toUpperCase();
  const w2 = ctx.measureText(line2).width;
  const cw = Math.max(w1, w2) + pad * 2;
  const ch = pad * 1.4 + fs + (line2 ? fs2 + 4 : 0);
  // Panel 0's chip sits right of the VOL.06 badge (same row), never under it.
  const cx = at && at.x !== undefined ? at.x : rx + Math.max(6, W * 0.01);
  const cy = at && at.y !== undefined ? at.y : ry + Math.max(6, H * 0.012);
  if (cx + cw > rx + rw - 6) { ctx.restore(); return; } // too tight: skip, never overlap
  ctx.fillStyle = 'rgba(8,4,16,0.62)';
  rr(ctx, cx, cy, cw, ch, Math.max(4, W * 0.006));
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.font = `${fs}px Anton, sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(line1, cx + pad, cy + pad * 0.7);
  if (line2) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = `${fs2}px Anton, sans-serif`;
    ctx.fillText('“' + line2 + '”', cx + pad, cy + pad * 0.7 + fs + 4);
  }
  ctx.restore();
}

function drawSeal(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = 'rgba(10,5,18,0.72)';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffd166'; ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.94, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.025);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2); ctx.stroke();
  // Text around the ring.
  const label = 'ORIGINAL COVER ART • VICE COVER STUDIO • ';
  ctx.fillStyle = '#ffd166';
  ctx.font = `${Math.max(8, r * 0.17)}px Anton, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const step = (Math.PI * 2) / label.length;
  for (let i = 0; i < label.length; i++) {
    const a = -Math.PI / 2 + i * step;
    ctx.save();
    ctx.rotate(a);
    ctx.translate(0, -r * 0.81);
    ctx.fillText(label[i], 0, 0);
    ctx.restore();
  }
  ctx.fillStyle = '#ffd166';
  ctx.font = `${r * 0.52}px Anton, sans-serif`;
  ctx.fillText('★', 0, -r * 0.06);
  ctx.font = `${Math.max(7, r * 0.15)}px Anton, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText('EST. 2026', 0, r * 0.38);
  ctx.restore();
}

function fitFont(ctx, text, maxW, startPx, family) {
  let px = startPx;
  ctx.font = `${px}px ${family}`;
  while (px > 24 && ctx.measureText(text).width > maxW) {
    px -= 4;
    ctx.font = `${px}px ${family}`;
  }
  return px;
}

// state: { layout, grade, title, subtitle, quote, stars, panels: [{img, px, py, zoom, place, time, tag}] }
export function drawCover(ctx, state, W, H) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#14081f';
  ctx.fillRect(0, 0, W, H);
  const rects = layoutRects(state.layout);
  const layout = LAYOUTS.find((l) => l.id === state.layout) || LAYOUTS[0];
  const n = layout.panels;
  const gap = Math.max(2, W * 0.004);

  // Panels (slash layout clips diagonal edges).
  for (let i = 0; i < n; i++) {
    const [fx, fy, fw, fh] = rects[i];
    const p = state.panels[i] || {};
    if (state.layout === 'slash') {
      const slant = W * 0.045;
      const x0 = fx * W, x1 = (fx + fw) * W;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x0 + (i === 0 ? 0 : slant), 0);
      ctx.lineTo(x1 + slant, 0);
      ctx.lineTo(x1 - (i === 2 ? 0 : slant), H);
      ctx.lineTo(x0 - slant, H);
      ctx.closePath();
      ctx.clip();
      drawPhoto(ctx, p.img, [x0 - slant, 0, (x1 - x0) + slant * 2, H], p.px, p.py, p.zoom);
      ctx.restore();
      // Slant divider.
      ctx.save();
      ctx.strokeStyle = 'rgba(10,4,18,0.9)';
      ctx.lineWidth = gap;
      ctx.beginPath();
      ctx.moveTo(x0 + slant, 0); ctx.lineTo(x0 - slant, H);
      ctx.stroke();
      ctx.restore();
    } else {
      const rect = [
        fx * W + (i > 0 && fy === 0 ? gap / 2 : 0),
        fy * H + (fy > 0 ? gap / 2 : 0),
        fw * W - gap,
        fh * H - gap,
      ];
      drawPhoto(ctx, p.img, rect, p.px, p.py, p.zoom);
    }
  }

  gradeOverlay(ctx, state.grade, W, H);

  // Panel labels (top of each panel, never under the title).
  for (let i = 0; i < n; i++) {
    const [fx, fy, fw, fh] = rects[i];
    const p = state.panels[i] || {};
    if (!p.place && !p.tag) continue;
    const heroAt = i === 0 ? { x: W * 0.115, y: H * 0.028 } : undefined;
    if (state.layout === 'slash') {
      drawLabelChip(ctx, p, [fx * W + W * 0.02, 0, fw * W - W * 0.04, fh * H], W, H, heroAt);
    } else {
      drawLabelChip(ctx, p, [fx * W, fy * H, fw * W, fh * H], W, H, heroAt);
    }
  }

  // Top badges: VOL.06 left, COLLECTOR'S EDITION centre, WANTED right.
  const u = W / 100; // 1% of width
  ctx.save();
  ctx.textBaseline = 'middle';
  const badgeY = H * 0.028;
  ctx.font = `${Math.max(11, u * 1.7)}px Anton, sans-serif`;
  ctx.textAlign = 'left';
  const vol = 'VOL. 06';
  const vw = ctx.measureText(vol).width + u * 2.2;
  ctx.fillStyle = '#ffd166';
  rr(ctx, W * 0.015, badgeY, vw, H * 0.042, H * 0.021); ctx.fill();
  ctx.fillStyle = '#1a0b1e';
  ctx.fillText(vol, W * 0.015 + u * 1.1, badgeY + H * 0.021);
  const ribbon = "COLLECTOR'S EDITION";
  ctx.font = `${Math.max(10, u * 1.5)}px Anton, sans-serif`;
  const rw2 = ctx.measureText(ribbon).width + u * 2.4;
  ctx.fillStyle = 'rgba(8,4,16,0.66)';
  rr(ctx, (W - rw2) / 2, badgeY, rw2, H * 0.042, H * 0.021); ctx.fill();
  ctx.strokeStyle = '#ffd166'; ctx.lineWidth = Math.max(1, u * 0.12);
  rr(ctx, (W - rw2) / 2, badgeY, rw2, H * 0.042, H * 0.021); ctx.stroke();
  ctx.fillStyle = '#ffd166';
  ctx.textAlign = 'center';
  ctx.fillText(ribbon, W / 2, badgeY + H * 0.021);
  const stars = '★'.repeat(Math.max(1, Math.min(5, state.stars || 5)));
  const wanted = `WANTED ${stars}`;
  ctx.font = `${Math.max(11, u * 1.7)}px Anton, sans-serif`;
  const ww = ctx.measureText(wanted).width + u * 2.2;
  ctx.fillStyle = '#c81e3a';
  rr(ctx, W * 0.985 - ww, badgeY, ww, H * 0.042, H * 0.021); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(wanted, W * 0.985 - ww + u * 1.1, badgeY + H * 0.021);
  ctx.restore();

  // Giant 3D gradient title: measure it first so the stars + quote sit
  // strictly above it, never behind its letters.
  const title = (state.title || 'NEON TIDE').toUpperCase();
  const titlePx = fitFont(ctx, title, W * 0.94, W * 0.105, 'Anton, sans-serif');
  const ty = H * 0.845;
  const titleTop = ty - titlePx;
  const quotePx = fitFont(ctx, (state.quote || '').toUpperCase(), W * 0.86, Math.max(12, W * 0.024), 'Anton, sans-serif');
  // The quote must clear both the title below it and any bottom-row panel
  // label chips above it (hero-top / portrait-stack): lift it above the
  // chip row when it would otherwise overlap the chips.
  let quoteBaseline = titleTop - 8;
  {
    const chipPad = Math.max(8, W * 0.008);
    const chipFs = Math.max(11, W * 0.016);
    const chipFs2 = Math.max(9, W * 0.0125);
    const chipH = chipPad * 1.4 + chipFs + chipFs2 + 4;
    let chipRowY = null;
    for (const [fx, fy] of rects) if (fy > 0) chipRowY = chipRowY === null ? fy * H : Math.min(chipRowY, fy * H);
    if (chipRowY !== null && quoteBaseline - quotePx < chipRowY + chipH) {
      quoteBaseline = chipRowY - 12;
    }
  }
  const starPx = Math.max(14, W * 0.028);
  const starsBaseline = quoteBaseline - quotePx - 6;

  // Stars + press quote above the title.
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffd166';
  ctx.font = `${starPx}px Anton, sans-serif`;
  ctx.fillText('★'.repeat(Math.max(1, Math.min(5, state.stars || 5))), W / 2, starsBaseline);
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = Math.max(4, u);
  ctx.font = `${quotePx}px Anton, sans-serif`;
  ctx.fillText((state.quote || '').toUpperCase(), W / 2, quoteBaseline);
  ctx.restore();

  // Giant 3D gradient title + script subtitle.
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `${titlePx}px Anton, sans-serif`;
  const depth = Math.max(4, titlePx * 0.045);
  ctx.fillStyle = '#160818';
  for (let d = 3; d >= 1; d--) ctx.fillText(title, W / 2, ty + depth * d);
  const tg = ctx.createLinearGradient(0, ty - titlePx, 0, ty);
  tg.addColorStop(0, '#ffe259');
  tg.addColorStop(0.45, '#ff7e2e');
  tg.addColorStop(0.75, '#ff2e88');
  tg.addColorStop(1, '#c81e8f');
  ctx.fillStyle = tg;
  ctx.fillText(title, W / 2, ty);
  ctx.strokeStyle = '#160818';
  ctx.lineWidth = Math.max(2, titlePx * 0.035);
  ctx.lineJoin = 'round';
  ctx.strokeText(title, W / 2, ty);
  ctx.restore();

  const subPx = Math.max(16, titlePx * 0.34);
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `${subPx}px Pacifico, cursive`;
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = Math.max(4, u * 1.2);
  ctx.shadowOffsetY = Math.max(2, u * 0.4);
  ctx.fillText(state.subtitle || '', W / 2, H * 0.905);
  ctx.restore();

  // Round seal, bottom-right above the strip.
  drawSeal(ctx, W * 0.9, H * 0.815, Math.max(28, W * 0.052));

  // Bottom strip: palms + tagline + small print.
  const stripTop = H * 0.93;
  ctx.save();
  const sg = ctx.createLinearGradient(0, stripTop, 0, H);
  sg.addColorStop(0, 'rgba(8,3,14,0.88)');
  sg.addColorStop(1, 'rgba(8,3,14,0.97)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, stripTop, W, H - stripTop);
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(0, stripTop, W, Math.max(2, H * 0.004));
  const palmS = (H - stripTop) * 0.85;
  drawPalm(ctx, W * 0.045, H - (H - stripTop) * 0.08, palmS, 'rgba(0,0,0,0.85)');
  drawPalm(ctx, W * 0.955, H - (H - stripTop) * 0.08, palmS, 'rgba(0,0,0,0.85)');
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd166';
  const tagPx = fitFont(ctx, 'ONE COAST  •  NO RULES  •  COMING SOON', W * 0.8, Math.max(12, W * 0.026), 'Anton, sans-serif');
  ctx.fillText('ONE COAST  •  NO RULES  •  COMING SOON', W / 2, stripTop + (H - stripTop) * 0.34);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `${Math.max(8, W * 0.009)}px Anton, sans-serif`;
  ctx.fillText('VICE COVER STUDIO — FAN-MADE POSTER MAKER • NOT AFFILIATED WITH ROCKSTAR GAMES', W / 2, stripTop + (H - stripTop) * 0.76);
  ctx.restore();
}
