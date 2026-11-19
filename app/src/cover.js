// Vice Cover Studio drawing engine: renders a GTA 6-style multi-panel cover onto a
// canvas from a plain state object. No network, no libraries, canvas 2D only.
//
// State shape:
//   { layout, grade, title, subtitle, quote, stars,
//     showSeal, showWanted, showVol, showStrip, showQuote,
//     panels: [{ photo, place, time, tag, zoom, ox, oy }, ...] }
// `resolveImage(panel)` returns a loaded HTMLImageElement or null, synchronously.

export const LAYOUTS = ['hero-top', 'hero-left', 'slash', 'three-panel', 'four-square', 'portrait-stack'];
export const GRADES = ['sunset', 'neon', 'gold', 'magenta', 'teal'];

const GRADE_STYLE = {
  sunset:  { title: ['#ffe259', '#ff7e2e', '#ff2975', '#8c1eff'], tint: '255, 90, 40',  accent: '#ff2975', sub: '#ffe259' },
  neon:    { title: ['#7df9ff', '#00f0ff', '#ff2975', '#b967ff'], tint: '0, 240, 255',  accent: '#00f0ff', sub: '#7df9ff' },
  gold:    { title: ['#fff3b0', '#ffd60a', '#fb8500', '#d00000'], tint: '255, 183, 3',  accent: '#ffb703', sub: '#fff3b0' },
  magenta: { title: ['#ffc2e2', '#ff5da2', '#d81159', '#7b2fbe'], tint: '216, 17, 89',  accent: '#ff5da2', sub: '#ffc2e2' },
  teal:    { title: ['#d8fff4', '#5eead4', '#00b4a2', '#0b3d5c'], tint: '0, 180, 162',  accent: '#5eead4', sub: '#d8fff4' },
};

// Panel rectangles as fractions of the panel band (x, y, w, h), plus an optional
// diagonal clip polygon (fractions of the band) for the slash layout.
function panelRects(layout) {
  switch (layout) {
    case 'hero-top':       return [[0, 0, 1, 0.58], [0, 0.58, 0.5, 0.42], [0.5, 0.58, 0.5, 0.42]];
    case 'hero-left':      return [[0, 0, 0.62, 1], [0.62, 0, 0.38, 0.5], [0.62, 0.5, 0.38, 0.5]];
    case 'slash':          return [[0, 0, 1, 1], [0, 0, 1, 1]];
    case 'three-panel':    return [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]];
    case 'four-square':    return [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]];
    case 'portrait-stack': return [[0, 0, 1, 0.62], [0, 0.62, 0.5, 0.38], [0.5, 0.62, 0.5, 0.38]];
    default:               return [[0, 0, 1, 1]];
  }
}

// Fraction of canvas height used by the title block (top) and the strip (bottom).
const TITLE_H = 0.2;
const STRIP_H = 0.12;

function fitText(ctx, text, maxWidth, startSize, font) {
  let size = startSize;
  ctx.font = font(size);
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = font(size);
  }
  return size;
}

/** Draws one photo panel (cover-fit with zoom + pan) inside rect `r` (pixels). */
function drawPanel(ctx, img, r, panel, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  if (img) {
    const zoom = Math.max(0.5, Math.min(4, panel.zoom || 1));
    const base = Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight) * zoom;
    const pw = img.naturalWidth * base;
    const ph = img.naturalHeight * base;
    const cx = r.x + r.w / 2 + (panel.ox || 0) * r.w * 0.2;
    const cy = r.y + r.h / 2 + (panel.oy || 0) * r.h * 0.2;
    ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
  } else {
    ctx.fillStyle = '#241534';
    ctx.fillRect(r.x, r.y, r.w, r.h);
  }
  // Grade tint, stronger toward the foot of the panel so labels stay readable.
  const tint = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  tint.addColorStop(0, `rgba(${grade.tint}, 0)`);
  tint.addColorStop(1, `rgba(${grade.tint}, 0.30)`);
  ctx.fillStyle = tint;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

/** Small chip label: dark pill with white caps text, or light pill for the time. */
function chip(ctx, text, x, y, scale, dark) {
  if (!text) return 0;
  const padX = 10 * scale;
  const padY = 5 * scale;
  const size = Math.max(11, 15 * scale);
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  const w = ctx.measureText(text).width + padX * 2;
  const h = size + padY * 2;
  ctx.fillStyle = dark ? 'rgba(10, 4, 18, 0.82)' : 'rgba(255, 255, 255, 0.92)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = dark ? '#ffffff' : '#160a24';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX, y + h / 2 + 1);
  return w;
}

function drawSeal(ctx, cx, cy, radius, grade) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.21);
  ctx.fillStyle = '#ffd60a';
  ctx.strokeStyle = '#7a1e2b';
  ctx.lineWidth = Math.max(2, radius * 0.07);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#7a1e2b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${radius * 0.34}px Anton, sans-serif`;
  ctx.fillText('VICE', 0, -radius * 0.24);
  ctx.font = `700 ${radius * 0.2}px system-ui, sans-serif`;
  ctx.fillText('CITY', 0, radius * 0.12);
  ctx.font = `700 ${radius * 0.17}px system-ui, sans-serif`;
  ctx.fillText('EST. 2026', 0, radius * 0.42);
  ctx.restore();
}

/** Renders the full cover. `state` follows the shape above; `resolveImage` maps a panel to an image. */
export function drawCover(canvas, state, resolveImage) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const s = W / 1080; // scale unit: everything is laid out for a 1080-wide canvas
  const grade = GRADE_STYLE[state.grade] || GRADE_STYLE.sunset;
  const gap = 8 * s;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0d0618';
  ctx.fillRect(10 * s, 10 * s, W - 20 * s, H - 20 * s);

  // ---- Title block (top) ----
  const titleTop = 10 * s;
  const titleH = H * TITLE_H;
  const title = (state.title || 'VICE CITY').toUpperCase();
  const tg = ctx.createLinearGradient(0, titleTop, 0, titleTop + titleH * 0.95);
  grade.title.forEach((c, i) => tg.addColorStop(i / (grade.title.length - 1), c));
  const titleSize = fitText(ctx, title, W * 0.94, H * 0.155, (px) => `${px}px Anton, sans-serif`);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const titleY = titleTop + titleH * 0.46;
  // 3D depth: stacked dark copies stepping down-right.
  ctx.fillStyle = '#1c0533';
  for (let i = 7; i >= 1; i--) {
    ctx.fillText(title, W / 2 + i * 1.6 * s, titleY + i * 1.6 * s);
  }
  ctx.fillStyle = tg;
  ctx.fillText(title, W / 2, titleY);
  ctx.lineWidth = 1.5 * s;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.strokeText(title, W / 2, titleY);
  // Script subtitle overlapping the title's foot, slightly tilted.
  if (state.subtitle) {
    ctx.save();
    ctx.translate(W / 2, titleTop + titleH * 0.86);
    ctx.rotate(-0.03);
    const subSize = fitText(ctx, state.subtitle, W * 0.7, H * 0.052, (px) => `${px}px Pacifico, cursive`);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = grade.sub;
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 8 * s;
    ctx.fillText(state.subtitle, 0, 0);
    ctx.restore();
  }

  // ---- Panels (middle band) ----
  const band = { x: 10 * s, y: titleTop + titleH, w: W - 20 * s, h: H * (1 - TITLE_H - STRIP_H) - 10 * s };
  const rects = panelRects(state.layout);
  const panels = state.panels || [];
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(band.x, band.y, band.w, band.h);
  rects.forEach((fr, i) => {
    const panel = panels[i] || { photo: '', place: '', time: '', tag: '', zoom: 1, ox: 0, oy: 0 };
    const r = {
      x: band.x + fr[0] * band.w + (fr[0] > 0 ? gap / 2 : 0),
      y: band.y + fr[1] * band.h + (fr[1] > 0 ? gap / 2 : 0),
      w: fr[2] * band.w - (fr[0] > 0 ? gap / 2 : 0) - (fr[0] + fr[2] < 1 ? gap / 2 : 0),
      h: fr[3] * band.h - (fr[1] > 0 ? gap / 2 : 0) - (fr[1] + fr[3] < 1 ? gap / 2 : 0),
    };
    if (state.layout === 'slash') {
      // Diagonal split: panel 0 keeps the upper-left, panel 1 the lower-right.
      ctx.save();
      ctx.beginPath();
      if (i === 0) {
        ctx.moveTo(band.x, band.y);
        ctx.lineTo(band.x + band.w, band.y);
        ctx.lineTo(band.x + band.w * 0.42, band.y + band.h);
        ctx.lineTo(band.x, band.y + band.h);
      } else {
        ctx.moveTo(band.x + band.w, band.y);
        ctx.lineTo(band.x + band.w, band.y + band.h);
        ctx.lineTo(band.x + band.w * 0.42, band.y + band.h);
      }
      ctx.closePath();
      ctx.clip();
      drawPanel(ctx, resolveImage(panel), r, panel, grade);
      ctx.restore();
      if (i === 1) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6 * s;
        ctx.beginPath();
        ctx.moveTo(band.x + band.w, band.y);
        ctx.lineTo(band.x + band.w * 0.42, band.y + band.h);
        ctx.stroke();
      }
    } else {
      drawPanel(ctx, resolveImage(panel), r, panel, grade);
    }
    // Per-panel labels.
    const labelScale = Math.max(0.6, Math.min(1.4, W / 1080));
    if (panel.place) chip(ctx, panel.place.toUpperCase(), r.x + 10 * s, r.y + r.h - 34 * labelScale, labelScale, true);
    if (panel.time) {
      ctx.font = `700 ${Math.max(11, 15 * labelScale)}px system-ui, sans-serif`;
      const tw = ctx.measureText(panel.time).width;
      chip(ctx, panel.time, r.x + r.w - tw - 30 * labelScale, r.y + 10 * s, labelScale, false);
    }
    if (panel.tag) {
      ctx.font = `italic 700 ${Math.max(11, 14 * labelScale)}px system-ui, sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6 * s;
      ctx.fillText(panel.tag, r.x + r.w - 10 * s, r.y + r.h - 18 * labelScale);
      ctx.shadowBlur = 0;
    }
    // Selection ring for the active panel (editor only; state.selected is a panel index).
    if (state.selected === i) {
      ctx.strokeStyle = grade.accent;
      ctx.lineWidth = 4 * s;
      ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
    }
  });

  // ---- Seal badge (top-right, kept inside the title band) ----
  if (state.showSeal) {
    drawSeal(ctx, W - 78 * s, titleTop + titleH * 0.5, 52 * s, grade);
  }

  // ---- Bottom strip ----
  if (state.showStrip) {
    const stripY = H * (1 - STRIP_H);
    ctx.fillStyle = '#0d0618';
    ctx.fillRect(10 * s, stripY, W - 20 * s, H * STRIP_H - 10 * s);
    ctx.fillStyle = grade.accent;
    ctx.fillRect(10 * s, stripY, W - 20 * s, 3 * s);
    const midY = stripY + (H * STRIP_H - 10 * s) / 2;
    const stripScale = Math.max(0.6, Math.min(1.3, W / 1080));
    // Stars + quote (left).
    if (state.showQuote) {
      const starSize = Math.max(12, 20 * stripScale);
      ctx.font = `${starSize}px system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      let sx = 26 * s;
      const stars = Math.max(0, Math.min(5, state.stars || 0));
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i < stars ? '#ffd60a' : 'rgba(255,255,255,0.25)';
        ctx.fillText('★', sx, midY - 12 * stripScale);
        sx += starSize + 2;
      }
      const quote = (state.quote || '').trim();
      if (quote) {
        ctx.font = `italic ${Math.max(11, 15 * stripScale)}px Georgia, serif`;
        ctx.fillStyle = '#f5eefc';
        const qSize = fitText(ctx, `“${quote}”`, W * 0.52, Math.max(11, 15 * stripScale), (px) => `italic ${px}px Georgia, serif`);
        ctx.font = `italic ${qSize}px Georgia, serif`;
        ctx.fillText(`“${quote}”`, 26 * s, midY + 16 * stripScale);
      }
    }
    // Right-hand badges: COLLECTOR'S EDITION + VOL.06 + WANTED pill.
    const pill = (text, x, bg, fg, bold) => {
      ctx.font = `${bold ? 700 : 600} ${Math.max(10, 13 * stripScale)}px system-ui, sans-serif`;
      const w = ctx.measureText(text).width + 18 * stripScale;
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(x - w, midY - 15 * stripScale, w, 30 * stripScale, 15 * stripScale);
      ctx.fill();
      ctx.fillStyle = fg;
      ctx.textAlign = 'center';
      ctx.fillText(text, x - w / 2, midY + 1);
      return w;
    };
    let bx = W - 26 * s;
    if (state.showWanted) bx -= pill('WANTED', bx, '#d81159', '#ffffff', true) + 10 * s;
    if (state.showVol) bx -= pill('VOL. 06', bx, '#ffffff', '#160a24', true) + 10 * s;
    ctx.font = `600 ${Math.max(9, 12 * stripScale)}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'right';
    ctx.fillText("COLLECTOR'S EDITION", bx - 6 * s, midY);
  }
}
