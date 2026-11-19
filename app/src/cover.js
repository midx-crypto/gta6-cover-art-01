// Vice Cover Studio — cover renderer. Pure canvas, no dependencies.
// Draws a GTA 6-style multi-panel cover: photos, 3D gradient title,
// script subtitle, stars + quote, per-panel labels, seal, WANTED pill,
// VOL badge, collector ribbon and bottom strip.

export const SAMPLES = [
  { id: 'convertible', src: './samples/convertible.jpg', place: 'Ocean Drive', time: '6:42 PM', tag: 'Sunset Cruise' },
  { id: 'neon-portrait', src: './samples/neon-portrait.jpg', place: 'Neon Alley', time: '11:58 PM', tag: 'Night Owl' },
  { id: 'coast-road', src: './samples/coast-road.jpg', place: 'Coastal Hwy', time: '5:17 PM', tag: 'Golden Run' },
  { id: 'gas-station', src: './samples/gas-station.jpg', place: 'Route 66 Gas', time: '2:13 AM', tag: 'Last Stop' },
  { id: 'boulevard', src: './samples/boulevard.jpg', place: 'The Boulevard', time: '7:05 PM', tag: 'City Lights' },
  { id: 'pier', src: './samples/pier.jpg', place: 'Vice Pier', time: '8:44 PM', tag: 'High Tide' },
];

export const LAYOUTS = {
  'hero-top': { name: 'Hero Top', panels: 3 },
  'hero-left': { name: 'Hero Left', panels: 3 },
  'slash-cut': { name: 'Slash Cut', panels: 2 },
  'three-panel': { name: 'Three Panel', panels: 3 },
  'four-square': { name: 'Four Square', panels: 4 },
  'portrait-stack': { name: 'Portrait Stack', panels: 3 },
};

export const GRADES = {
  'vice-sunset': { name: 'Vice Sunset', wash: ['#ff7e5f', '#feb47b'], washAlpha: 0.26, title: ['#fff3b0', '#ffb347', '#ff5e62'], accent: '#ffd166', tint: '#ff8c42' },
  'neon-night': { name: 'Neon Night', wash: ['#00f5d4', '#9b5de5'], washAlpha: 0.28, title: ['#e0fbfc', '#7ee8fa', '#f72585'], accent: '#00f5d4', tint: '#9b5de5' },
  'gold-hour': { name: 'Gold Hour', wash: ['#f6d365', '#fda085'], washAlpha: 0.24, title: ['#fff8dc', '#ffd700', '#ff8c00'], accent: '#ffd700', tint: '#f6d365' },
  'magenta-dusk': { name: 'Magenta Dusk', wash: ['#ff006e', '#8338ec'], washAlpha: 0.28, title: ['#ffe5ec', '#ff8fa3', '#c9184a'], accent: '#ff70a6', tint: '#ff006e' },
  'teal-noir': { name: 'Teal Noir', wash: ['#0f2027', '#2c5364'], washAlpha: 0.30, title: ['#e8f6f3', '#a8dadc', '#457b9d'], accent: '#a8dadc', tint: '#2c5364' },
};

export const EXPORT_SIZES = [
  { id: 'square', w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  { id: 'portrait', w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  { id: 'wide', w: 1920, h: 1080, label: 'Wide 1920 x 1080' },
];

export function defaultState() {
  return {
    layout: 'hero-top',
    grade: 'vice-sunset',
    exportSize: 'square',
    title: 'VICE CITY',
    subtitle: 'Neon Nights',
    quote: 'The city never sleeps, and neither do we.',
    stars: 5,
    wanted: true,
    seal: true,
    strip: true,
    vol: 'VOL. 06',
    edition: "COLLECTOR'S EDITION",
    selected: 0,
    panels: [
      { img: 'convertible', dx: 0, dy: 0, scale: 1 },
      { img: 'neon-portrait', dx: 0, dy: 0, scale: 1 },
      { img: 'coast-road', dx: 0, dy: 0, scale: 1 },
      { img: 'gas-station', dx: 0, dy: 0, scale: 1 },
    ],
  };
}

// Panel geometry for a layout, in canvas pixels. A panel is {x,y,w,h,poly?}.
export function layoutPanels(layout, W, H) {
  const g = Math.max(2, Math.round(W * 0.004));
  const R = (x, y, w, h) => ({ x, y, w, h });
  switch (layout) {
    case 'hero-top': {
      const hy = Math.round(H * 0.60);
      return [R(0, 0, W, hy), R(0, hy + g, W / 2 - g / 2, H - hy - g), R(W / 2 + g / 2, hy + g, W / 2 - g / 2, H - hy - g)];
    }
    case 'hero-left': {
      const hx = Math.round(W * 0.60);
      return [R(0, 0, hx, H), R(hx + g, 0, W - hx - g, H / 2 - g / 2), R(hx + g, H / 2 + g / 2, W - hx - g, H / 2 - g / 2)];
    }
    case 'slash-cut': {
      const ax = W * 0.56, bx = W * 0.44;
      return [
        { x: 0, y: 0, w: W, h: H, poly: [[0, 0], [ax, 0], [bx, H], [0, H]] },
        { x: 0, y: 0, w: W, h: H, poly: [[ax, 0], [W, 0], [W, H], [bx, H]] },
      ];
    }
    case 'three-panel': {
      const w = (W - 2 * g) / 3;
      return [R(0, 0, w, H), R(w + g, 0, w, H), R(2 * (w + g), 0, w, H)];
    }
    case 'four-square': {
      const w = (W - g) / 2, h = (H - g) / 2;
      return [R(0, 0, w, h), R(w + g, 0, w, h), R(0, h + g, w, h), R(w + g, h + g, w, h)];
    }
    case 'portrait-stack': {
      const h1 = Math.round(H * 0.44), h2 = Math.round(H * 0.31);
      return [R(0, 0, W, h1), R(0, h1 + g, W, h2), R(0, h1 + h2 + 2 * g, W, H - h1 - h2 - 2 * g)];
    }
    default:
      return [R(0, 0, W, H)];
  }
}

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function star(ctx, cx, cy, r, points = 5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function fitFont(ctx, text, maxW, startPx, family) {
  let px = startPx;
  while (px > 12) {
    ctx.font = `${px}px ${family}`;
    if (ctx.measureText(text).width <= maxW) break;
    px -= 2;
  }
  ctx.font = `${px}px ${family}`;
  return px;
}

function wrapLines(ctx, text, maxW) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// images: Map id -> HTMLImageElement. Draws the full cover.
export function drawCover(ctx, state, images, W, H, opts = {}) {
  const grade = GRADES[state.grade] || GRADES['vice-sunset'];
  const showChrome = opts.chrome !== false;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0b0b12';
  ctx.fillRect(0, 0, W, H);

  const panels = layoutPanels(state.layout, W, H);
  const count = LAYOUTS[state.layout].panels;
  const u = W / 1080; // scale unit

  // --- photo panels ---
  for (let i = 0; i < count; i++) {
    const p = panels[i];
    const spec = state.panels[i] || state.panels[0];
    const entry = images.get(spec.img);
    ctx.save();
    ctx.beginPath();
    if (p.poly) {
      ctx.moveTo(p.poly[0][0], p.poly[0][1]);
      for (let k = 1; k < p.poly.length; k++) ctx.lineTo(p.poly[k][0], p.poly[k][1]);
      ctx.closePath();
    } else {
      ctx.rect(p.x, p.y, p.w, p.h);
    }
    ctx.clip();
    if (entry && entry.naturalWidth) {
      const iw = entry.naturalWidth, ih = entry.naturalHeight;
      const base = Math.max(p.w / iw, p.h / ih) * (spec.scale || 1);
      const dw = iw * base, dh = ih * base;
      const cx = p.x + p.w / 2 + (spec.dx || 0) * p.w;
      const cy = p.y + p.h / 2 + (spec.dy || 0) * p.h;
      ctx.drawImage(entry, cx - dw / 2, cy - dh / 2, dw, dh);
    } else {
      const grad = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
      grad.addColorStop(0, '#3a2b4d'); grad.addColorStop(1, '#14101d');
      ctx.fillStyle = grad;
      ctx.fillRect(p.x, p.y, p.w, p.h);
    }
    const shade = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
    shade.addColorStop(0, 'rgba(0,0,0,0.18)');
    shade.addColorStop(0.5, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = shade;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = Math.max(1, 2 * u);
    ctx.beginPath();
    if (p.poly) {
      ctx.moveTo(p.poly[0][0], p.poly[0][1]);
      for (let k = 1; k < p.poly.length; k++) ctx.lineTo(p.poly[k][0], p.poly[k][1]);
      ctx.closePath();
    } else {
      ctx.rect(p.x, p.y, p.w, p.h);
    }
    ctx.stroke();
    ctx.restore();
  }

  // --- colour grade wash ---
  const wash = ctx.createLinearGradient(0, 0, W, H);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(1, grade.wash[1]);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = grade.washAlpha * 2.2;
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // --- vignette ---
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  if (!showChrome) { ctx.restore(); return; }

  // --- title block legibility gradient ---
  const topShade = ctx.createLinearGradient(0, 0, 0, H * 0.42);
  topShade.addColorStop(0, 'rgba(5,2,12,0.62)');
  topShade.addColorStop(1, 'rgba(5,2,12,0)');
  ctx.fillStyle = topShade;
  ctx.fillRect(0, 0, W, H * 0.42);

  const cx = W / 2;
  const title = (state.title || 'VICE CITY').toUpperCase();

  // --- 3D gradient title (capped by height so wide canvases don't clip) ---
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let titlePx = fitFont(ctx, title, W * 0.96, W * 0.15, 'Anton, sans-serif');
  titlePx = Math.min(titlePx, H * 0.19);
  ctx.font = `${titlePx}px Anton, sans-serif`;
  const titleY = H * 0.13;
  const depth = Math.max(2, Math.round(5 * u));
  const grad = ctx.createLinearGradient(0, titleY - titlePx * 0.55, 0, titleY + titlePx * 0.55);
  grad.addColorStop(0, grade.title[0]);
  grad.addColorStop(0.55, grade.title[1]);
  grad.addColorStop(1, grade.title[2]);
  ctx.save();
  ctx.translate(cx, 0);
  ctx.rotate(-0.02);
  ctx.translate(-cx, 0);
  for (let d = 5; d >= 1; d--) {
    ctx.fillStyle = d % 2 ? '#1c0b33' : '#12041f';
    ctx.fillText(title, cx, titleY + d * depth);
  }
  ctx.fillStyle = grad;
  ctx.fillText(title, cx, titleY);
  ctx.lineWidth = Math.max(1, 2.5 * u);
  ctx.strokeStyle = 'rgba(10,2,20,0.55)';
  ctx.strokeText(title, cx, titleY);
  ctx.restore();

  // --- script subtitle (stacked below the title, never overlapping it) ---
  const subPx = fitFont(ctx, state.subtitle || '', W * 0.7, Math.min(W * 0.052, H * 0.075), 'Pacifico, cursive');
  const subY = titleY + titlePx * 0.52 + subPx * 0.55;
  ctx.save();
  ctx.translate(cx, subY);
  ctx.rotate(-0.035);
  ctx.font = `${subPx}px Pacifico, cursive`;
  ctx.fillStyle = grade.accent;
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 10 * u;
  ctx.shadowOffsetY = 3 * u;
  ctx.fillText(state.subtitle || '', 0, 0);
  ctx.restore();

  // --- stars + quote (stacked below the subtitle with clear gaps) ---
  const starR = Math.max(6, W * 0.016);
  const starY = subY + subPx * 0.5 + starR + H * 0.014;
  const gap = starR * 2.6;
  const totalW = state.stars * gap - (gap - starR * 2);
  for (let i = 0; i < 5; i++) {
    const sx = cx - totalW / 2 + starR + i * gap;
    star(ctx, sx, starY, starR);
    ctx.fillStyle = i < state.stars ? '#ffd700' : 'rgba(255,255,255,0.25)';
    ctx.fill();
    ctx.lineWidth = Math.max(1, 1.5 * u);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.stroke();
  }
  if (state.quote) {
    ctx.font = `italic ${Math.max(13, Math.round(W * 0.021))}px Georgia, serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6 * u;
    ctx.shadowOffsetY = 2 * u;
    const qlines = wrapLines(ctx, '\u201C' + state.quote + '\u201D', W * 0.78);
    const quoteY = starY + starR + H * 0.026;
    qlines.forEach((ln, i) => ctx.fillText(ln, cx, quoteY + i * W * 0.026));
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // --- per-panel labels (place / time / tagline) ---
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < count; i++) {
    const p = panels[i];
    const spec = state.panels[i] || state.panels[0];
    const s = spec.label || SAMPLES.find((x) => x.id === spec.img) || SAMPLES[0];
    const label = `${s.place}  \u2022  ${s.time}`;
    const pad = 10 * u;
    ctx.font = `700 ${Math.max(11, Math.round(W * 0.016))}px Anton, sans-serif`;
    const lw = ctx.measureText(label).width + pad * 2;
    const lh = Math.max(20, W * 0.032);
    const topEdge = p.y < H * 0.14;
    const lx = p.x + 12 * u;
    const ly = topEdge ? p.y + p.h - lh - 12 * u : p.y + 12 * u;
    ctx.fillStyle = 'rgba(5,2,12,0.72)';
    rr(ctx, lx, ly, lw, lh, lh / 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, lx + pad, ly + lh / 2 + 1);
    ctx.font = `italic 600 ${Math.max(11, Math.round(W * 0.017))}px Georgia, serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 5 * u;
    ctx.shadowOffsetY = 2 * u;
    const ty = topEdge ? p.y + p.h - lh - 12 * u - W * 0.024 : p.y + p.h - 14 * u;
    ctx.fillText(s.tag, lx, ty);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // --- VOL badge (top-left) ---
  ctx.textAlign = 'left';
  ctx.font = `700 ${Math.max(12, Math.round(W * 0.02))}px Anton, sans-serif`;
  ctx.fillStyle = grade.accent;
  ctx.fillText(state.vol || 'VOL. 06', 16 * u, 22 * u);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(16 * u, 30 * u, Math.max(30, W * 0.05), Math.max(2, 3 * u));

  // --- WANTED pill (top-right) ---
  if (state.wanted) {
    const pw = W * 0.115, ph = Math.max(22, H * 0.038);
    const px = W - pw - 16 * u, py = 14 * u;
    ctx.save();
    ctx.translate(px + pw / 2, py + ph / 2);
    ctx.rotate(0.07);
    ctx.fillStyle = '#fff8ee';
    rr(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2);
    ctx.fill();
    ctx.lineWidth = Math.max(2, 3 * u);
    ctx.strokeStyle = '#c1121f';
    ctx.stroke();
    ctx.fillStyle = '#c1121f';
    ctx.font = `700 ${Math.max(11, Math.round(W * 0.02))}px Anton, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('\u2605 WANTED', 0, 1);
    ctx.restore();
  }

  // --- seal badge (bottom-right) ---
  if (state.seal) {
    const sr = Math.max(26, W * 0.052);
    const sx = W - sr - 22 * u;
    const sy = H - sr - (state.strip ? H * 0.085 : 22 * u) - 8 * u;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(-0.21);
    ctx.beginPath(); ctx.arc(0, 0, sr, 0, Math.PI * 2);
    ctx.fillStyle = '#f4c542'; ctx.fill();
    ctx.lineWidth = Math.max(2, 3 * u); ctx.strokeStyle = '#7a5200'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, sr * 0.78, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(1, 1.5 * u); ctx.stroke();
    star(ctx, 0, -sr * 0.22, sr * 0.30);
    ctx.fillStyle = '#7a5200'; ctx.fill();
    ctx.fillStyle = '#5c3d00';
    ctx.font = `700 ${Math.max(9, Math.round(sr * 0.22))}px Anton, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('VICE', 0, sr * 0.34);
    ctx.font = `700 ${Math.max(7, Math.round(sr * 0.13))}px Anton, sans-serif`;
    ctx.fillText('EST. 2026', 0, sr * 0.58);
    ctx.restore();
  }

  // --- collector ribbon + bottom strip ---
  const stripH = state.strip ? Math.max(26, H * 0.042) : 0;
  if (state.strip) {
    const ry = H - stripH - Math.max(24, H * 0.030);
    ctx.fillStyle = '#f4c542';
    ctx.fillRect(0, ry, W, Math.max(24, H * 0.030));
    ctx.fillStyle = '#241300';
    ctx.font = `700 ${Math.max(11, Math.round(W * 0.019))}px Anton, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`\u2605  ${state.edition || "COLLECTOR'S EDITION"}  \u2605`, cx, ry + Math.max(24, H * 0.030) / 2 + 1);
    ctx.fillStyle = '#0b0b12';
    ctx.fillRect(0, H - stripH, W, stripH);
    ctx.fillStyle = grade.accent;
    ctx.textAlign = 'left';
    ctx.font = `${Math.max(10, Math.round(W * 0.016))}px Anton, sans-serif`;
    const unit = 'VICE COVER STUDIO  \u2605  LEONIDA  \u2605  EST. 2026  \u2605  ';
    let stripText = unit;
    while (ctx.measureText(stripText).width < W * 1.2) stripText += unit;
    ctx.fillText(stripText, 8 * u, H - stripH / 2 + 1);
  }

  ctx.restore();
}
