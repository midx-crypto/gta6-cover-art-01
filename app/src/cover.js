// Vice Cover Studio — cover renderer.
// Draws the whole poster on any 2d canvas at any size: photo panels, colour
// grade, 3D gradient title, script subtitle, badges, bottom strip.
// No Rockstar artwork, logo or font is used anywhere here.

export const SIZES = {
  '1920x1080': { w: 1920, h: 1080, label: 'Landscape 1920×1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait 1080×1350' },
  '1080x1080': { w: 1080, h: 1080, label: 'Square 1080×1080' },
};

export const LAYOUTS = {
  'hero-top': { label: 'Hero Top', panels: 4 },
  'hero-left': { label: 'Hero Left', panels: 3 },
  'slash': { label: 'Slash Cut', panels: 3 },
  'three-panel': { label: 'Triple Split', panels: 3 },
  'four-grid': { label: 'Four Grid', panels: 4 },
  'portrait-stack': { label: 'Portrait Stack', panels: 4 },
};

export const GRADES = {
  vice: { label: 'Vice Sunset', dot: '#ff7a18' },
  neon: { label: 'Neon Night', dot: '#ff2e88' },
  gold: { label: 'Gold Hour', dot: '#ffd23e' },
  magenta: { label: 'Magenta Dusk', dot: '#c724b1' },
  teal: { label: 'Teal Noir', dot: '#2ee6d6' },
};

// Panel rectangles in fractions of the canvas (x, y, w, h, optional slant).
// slant shifts the top edge right by slant * canvas width: slanted panels.
function layoutRects(layout, W, H) {
  const portrait = H >= W;
  switch (layout) {
    case 'hero-left':
      return [
        { x: 0, y: 0, w: 0.62, h: 1 },
        { x: 0.62, y: 0, w: 0.38, h: 0.52 },
        { x: 0.62, y: 0.52, w: 0.38, h: 0.48 },
      ];
    case 'slash':
      return [
        { x: -0.02, y: 0, w: 0.40, h: 1, slant: 0.07 },
        { x: 0.34, y: 0, w: 0.38, h: 1, slant: 0.07 },
        { x: 0.68, y: 0, w: 0.36, h: 1, slant: 0.07 },
      ];
    case 'three-panel':
      return [
        { x: 0, y: 0, w: 1 / 3, h: 1 },
        { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
        { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
      ];
    case 'four-grid':
      return [
        { x: 0, y: 0, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0, w: 0.5, h: 0.5 },
        { x: 0, y: 0.5, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
      ];
    case 'portrait-stack':
      return portrait
        ? [
            { x: 0, y: 0, w: 1, h: 0.52 },
            { x: 0, y: 0.52, w: 0.5, h: 0.26 },
            { x: 0.5, y: 0.52, w: 0.5, h: 0.26 },
            { x: 0, y: 0.78, w: 1, h: 0.22 },
          ]
        : [
            { x: 0, y: 0, w: 0.55, h: 1 },
            { x: 0.55, y: 0, w: 0.45, h: 0.5 },
            { x: 0.55, y: 0.5, w: 0.45, h: 0.5 },
            { x: 0, y: 0, w: 0.001, h: 0.001 },
          ];
    case 'hero-top':
    default:
      return [
        { x: 0, y: 0, w: 1, h: 0.56 },
        { x: 0, y: 0.56, w: 0.34, h: 0.44 },
        { x: 0.34, y: 0.56, w: 0.33, h: 0.44 },
        { x: 0.67, y: 0.56, w: 0.33, h: 0.44 },
      ];
  }
}

export function panelRects(layout, W, H) {
  return layoutRects(layout, W, H)
    .map((r) => ({
      x: r.x * W,
      y: r.y * H,
      w: r.w * W,
      h: r.h * H,
      slant: (r.slant || 0) * W,
    }))
    .filter((r) => r.w > 4 && r.h > 4);
}

// Cover-fit draw of one photo inside a panel rect, with zoom + pan offsets.
function drawPhoto(ctx, img, rect, zoom, ox, oy) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(rect.w / iw, rect.h / ih) * Math.max(1, zoom);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = rect.x + (rect.w - dw) / 2 + ox * Math.max(0, (dw - rect.w) / 2);
  const dy = rect.y + (rect.h - dh) / 2 + oy * Math.max(0, (dh - rect.h) / 2);
  ctx.drawImage(img, dx, dy, dw, dh);
}

function clipPanel(ctx, r) {
  ctx.beginPath();
  if (r.slant) {
    ctx.moveTo(r.x + r.slant, r.y);
    ctx.lineTo(r.x + r.w + r.slant, r.y);
    ctx.lineTo(r.x + r.w, r.y + r.h);
    ctx.lineTo(r.x, r.y + r.h);
  } else {
    ctx.rect(r.x, r.y, r.w, r.h);
  }
  ctx.closePath();
  ctx.clip();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Colour grade: translucent tint washes + vignette, over the photos only.
function applyGrade(ctx, W, H, grade) {
  const washes = {
    vice: [
      ['overlay', 'rgba(255,110,30,0.20)'],
      ['soft-light', 'rgba(255,0,110,0.28)'],
    ],
    neon: [
      ['overlay', 'rgba(190,20,220,0.22)'],
      ['soft-light', 'rgba(0,220,255,0.22)'],
      ['overlay', 'rgba(255,0,120,0.10)'],
    ],
    gold: [
      ['soft-light', 'rgba(255,180,60,0.42)'],
      ['overlay', 'rgba(255,140,20,0.14)'],
    ],
    magenta: [
      ['overlay', 'rgba(255,40,140,0.22)'],
      ['soft-light', 'rgba(120,20,160,0.30)'],
    ],
    teal: [
      ['soft-light', 'rgba(0,230,200,0.26)'],
      ['overlay', 'rgba(0,60,70,0.20)'],
      ['soft-light', 'rgba(255,170,60,0.12)'],
    ],
  }[grade] || [];
  for (const [mode, color] of washes) {
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // Vignette: darker corners, brighter middle.
  const vig = ctx.createRadialGradient(
    W / 2, H * 0.42, Math.min(W, H) * 0.35,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  vig.addColorStop(0, 'rgba(8,0,18,0)');
  vig.addColorStop(1, 'rgba(8,0,18,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(6, -34, 2, -62);
  ctx.stroke();
  // Fronds: five arcs fanning from the crown.
  for (let i = 0; i < 5; i++) {
    const a = (-160 + i * 38) * Math.PI / 180;
    const ex = Math.cos(a) * 46;
    const ey = -62 + Math.sin(a) * 30;
    ctx.beginPath();
    ctx.moveTo(2, -62);
    ctx.quadraticCurveTo(2 + ex * 0.5, -62 + ey * 0.4 - 14, 2 + ex, -62 + ey);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSeal(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = 'rgba(10,2,20,0.72)';
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
  ctx.stroke();
  // Circular text around the seal.
  const text = 'ORIGINAL COVER ART ★ ';
  ctx.fillStyle = '#ffd23e';
  ctx.font = `bold ${Math.max(9, r * 0.19)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const step = (Math.PI * 2) / text.length;
  for (let i = 0; i < text.length; i++) {
    ctx.save();
    ctx.rotate(-Math.PI / 2 + i * step);
    ctx.translate(0, -r * 0.68);
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }
  ctx.font = `${r * 0.62}px Anton, sans-serif`;
  ctx.fillStyle = '#fff';
  ctx.fillText('VI', 0, r * 0.05);
  ctx.restore();
}

function fitTitleLines(ctx, title, maxWidth, startSize) {
  const words = title.split(/\s+/).filter(Boolean);
  let size = startSize;
  let lines = [title];
  while (size > startSize * 0.45) {
    ctx.font = `${size}px Anton, sans-serif`;
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (widest <= maxWidth) return { lines, size };
    if (lines.length === 1 && words.length > 1) {
      // Greedy wrap into two lines.
      const first = [];
      let w = 0;
      for (const word of words) {
        const trial = [...first, word].join(' ');
        if (ctx.measureText(trial).width <= maxWidth && first.length < words.length - 1) {
          first.push(word);
          w = ctx.measureText(trial).width;
        } else break;
      }
      if (first.length > 0) lines = [first.join(' '), words.slice(first.length).join(' ')];
    }
    size *= 0.92;
  }
  ctx.font = `${size}px Anton, sans-serif`;
  return { lines, size };
}

export function drawCover(ctx, W, H, state, images) {
  const gutter = Math.max(3, Math.round(W * 0.004));
  const rects = panelRects(state.layout, W, H);
  const used = rects.slice(0, LAYOUTS[state.layout]?.panels ?? 4);

  // Backdrop between panels.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1c0a2e');
  bg.addColorStop(1, '#3d0f2e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Photos.
  used.forEach((r, i) => {
    const p = state.panels[i];
    if (!p) return;
    const img = images[p.photo];
    ctx.save();
    clipPanel(ctx, r);
    if (img && img.complete && img.naturalWidth) {
      drawPhoto(ctx, img, r, p.zoom || 1, p.ox || 0, p.oy || 0);
    } else {
      const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
      g.addColorStop(0, '#5b2a86');
      g.addColorStop(1, '#c2275f');
      ctx.fillStyle = g;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    ctx.restore();
    // Gutter frame.
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = gutter;
    clipPanel(ctx, r);
    ctx.stroke();
    ctx.restore();
  });

  // Colour grade over the photos.
  applyGrade(ctx, W, H, state.grade);

  // Legibility scrim across the lower half.
  const scrim = ctx.createLinearGradient(0, H * 0.42, 0, H);
  scrim.addColorStop(0, 'rgba(12,2,24,0)');
  scrim.addColorStop(0.55, 'rgba(12,2,24,0.42)');
  scrim.addColorStop(1, 'rgba(12,2,24,0.72)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H * 0.42, W, H * 0.58);

  const pad = W * 0.035;
  const stripH = Math.max(30, H * 0.058);
  const smallH = Math.max(12, H * 0.016);
  const titleZoneTop = H - stripH - smallH;

  // Top badges: VOL ticket top-left, WANTED pill top-right.
  ctx.save();
  const badgeY = pad * 0.7;
  const volR = Math.max(18, W * 0.028);
  ctx.fillStyle = 'rgba(10,2,20,0.7)';
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = Math.max(2, W * 0.002);
  ctx.beginPath();
  ctx.arc(pad + volR, badgeY + volR, volR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd23e';
  ctx.font = `${Math.max(10, volR * 0.42)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VOL.', pad + volR, badgeY + volR - volR * 0.22);
  ctx.fillStyle = '#fff';
  ctx.font = `${Math.max(12, volR * 0.52)}px Anton, sans-serif`;
  ctx.fillText('06', pad + volR, badgeY + volR + volR * 0.3);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `${Math.max(9, W * 0.011)}px Anton, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText("COLLECTOR'S EDITION", pad + volR * 2 + 10, badgeY + volR * 0.9);
  const wanted = `WANTED ${'★'.repeat(state.stars || 5)}`;
  ctx.font = `${Math.max(11, W * 0.016)}px Anton, sans-serif`;
  const ww = ctx.measureText(wanted).width + pad * 0.8;
  const wh = Math.max(22, W * 0.032);
  ctx.fillStyle = 'rgba(10,2,20,0.72)';
  roundRect(ctx, W - pad - ww, badgeY, ww, wh, wh / 2);
  ctx.fill();
  ctx.strokeStyle = '#ff2e88';
  ctx.lineWidth = Math.max(1.5, W * 0.0016);
  roundRect(ctx, W - pad - ww, badgeY, ww, wh, wh / 2);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(wanted, W - pad - ww / 2, badgeY + wh / 2 + 1);
  ctx.restore();

  // Stars + press quote, just above the title.
  const quoteSize = Math.max(12, W * 0.02);
  const titleStart = Math.max(W * 0.13, H * 0.16);
  const { lines, size: titleSize } = fitTitleLines(
    ctx, (state.title || 'VICE CITY').toUpperCase(), W - pad * 2, titleStart,
  );
  const subSize = Math.max(16, titleSize * 0.30);
  const lineH = titleSize * 1.02;
  // Lift the stars + quote clear of the small panels' label chips (the chips
  // sit at the panels' top edge): the quote floats over the hero photo.
  const quoteY = titleZoneTop - subSize * 1.7 - lineH * lines.length - quoteSize * 4.0;

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Stars.
  ctx.font = `${quoteSize}px sans-serif`;
  ctx.fillStyle = '#ffd23e';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.fillText('★'.repeat(state.stars || 5) + '☆'.repeat(5 - (state.stars || 5)), pad, quoteY);
  // Quote.
  try { ctx.letterSpacing = `${Math.max(1, W * 0.002)}px`; } catch (e) { /* older canvas */ }
  ctx.font = `${quoteSize}px Anton, sans-serif`;
  ctx.fillStyle = '#fff';
  const quoteText = `“${(state.quote || '').toUpperCase()}” — ${state.source || ''}`.trim();
  ctx.fillText(quoteText, pad, quoteY + quoteSize * 1.5);
  try { ctx.letterSpacing = '0px'; } catch (e) { /* older canvas */ }
  ctx.restore();

  // The huge 3D gradient title.
  const titleGrad = ctx.createLinearGradient(0, titleZoneTop - lineH * lines.length, 0, titleZoneTop - subSize * 0.6);
  titleGrad.addColorStop(0, '#ffe95e');
  titleGrad.addColorStop(0.35, '#ff9a2e');
  titleGrad.addColorStop(0.65, '#ff2e88');
  titleGrad.addColorStop(1, '#b537f2');
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  lines.forEach((line, li) => {
    const y = titleZoneTop - subSize * 1.7 - lineH * (lines.length - 1 - li);
    const depth = Math.max(3, titleSize * 0.055);
    // Drop shadow layer.
    ctx.font = `${titleSize}px Anton, sans-serif`;
    ctx.fillStyle = 'rgba(40,4,54,0.9)';
    ctx.fillText(line, pad + depth, y + depth);
    // Thick dark outline.
    ctx.strokeStyle = '#1c0526';
    ctx.lineWidth = Math.max(4, titleSize * 0.10);
    ctx.strokeText(line, pad, y);
    // Gradient fill.
    ctx.fillStyle = titleGrad;
    ctx.fillText(line, pad, y);
    // Top highlight.
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.font = `${titleSize}px Anton, sans-serif`;
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad, y - titleSize * 0.92, ctx.measureText(line).width, titleSize * 0.16);
    ctx.clip();
    ctx.fillText(line, pad, y);
    ctx.restore();
  });
  ctx.restore();

  // Script subtitle under the title.
  ctx.save();
  ctx.font = `${subSize}px Pacifico, cursive`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = Math.max(4, subSize * 0.25);
  ctx.fillStyle = '#fff';
  // Pacifico capitals swash left of their origin; inset so nothing clips.
  ctx.fillText(state.subtitle || '', pad + subSize * 0.25, titleZoneTop - subSize * 0.35);
  ctx.restore();

  // Round seal badge, bottom-right above the strip.
  const sealR = Math.max(30, Math.min(W * 0.062, (titleZoneTop - quoteY) * 0.42));
  drawSeal(ctx, W - pad - sealR, titleZoneTop - sealR - subSize * 0.4, sealR);

  // Panel labels on the small panels, drawn LAST so they sit on top of the
  // title zone instead of being struck through by it: solid chips at each
  // panel's top-left, like stickers pasted on the poster.
  used.forEach((r, i) => {
    if (i === 0) return;
    const p = state.panels[i];
    if (!p || !p.place) return;
    const fs = Math.max(11, W * 0.016);
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const lines = [p.place, `${p.time || ''}${p.time && p.tag ? '  —  ' : ''}${p.tag || ''}`.trim()];
    ctx.font = `${fs}px Anton, sans-serif`;
    const w1 = ctx.measureText(lines[0]).width;
    ctx.font = `${Math.max(9, fs * 0.62)}px Anton, sans-serif`;
    const w2 = ctx.measureText(lines[1]).width;
    const bw = Math.max(w1, w2) + pad * 0.5;
    const bh = fs * 2.1;
    ctx.fillStyle = 'rgba(10,2,20,0.88)';
    roundRect(ctx, r.x + pad * 0.4, r.y + pad * 0.4, bw, bh, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `${fs}px Anton, sans-serif`;
    ctx.fillText(lines[0], r.x + pad * 0.65, r.y + pad * 0.4 + fs * 0.18);
    ctx.fillStyle = '#ffd23e';
    ctx.font = `${Math.max(9, fs * 0.62)}px Anton, sans-serif`;
    ctx.fillText(lines[1], r.x + pad * 0.65, r.y + pad * 0.4 + fs * 1.18);
    ctx.restore();
  });

  // Bottom strip: palms + tagline.
  const stripY = H - stripH - smallH;
  const stripGrad = ctx.createLinearGradient(0, stripY, 0, stripY + stripH);
  stripGrad.addColorStop(0, '#160a24');
  stripGrad.addColorStop(1, '#0a0512');
  ctx.fillStyle = stripGrad;
  ctx.fillRect(0, stripY, W, stripH);
  ctx.fillStyle = '#ff7a18';
  ctx.fillRect(0, stripY, W, Math.max(2, stripH * 0.06));
  const palmS = stripH / 64;
  drawPalm(ctx, pad * 1.2, stripY + stripH - 2, palmS, '#2a1240');
  drawPalm(ctx, W - pad * 1.2, stripY + stripH - 2, palmS * 0.85, '#2a1240');
  ctx.save();
  ctx.font = `${Math.max(11, stripH * 0.42)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = `${Math.max(1, W * 0.003)}px`; } catch (e) { /* older canvas */ }
  ctx.fillStyle = '#ffd23e';
  ctx.fillText('ONE COAST  •  NO RULES  •  COMING SOON', W / 2, stripY + stripH * 0.56);
  try { ctx.letterSpacing = '0px'; } catch (e) { /* older canvas */ }
  ctx.restore();

  // Small print.
  ctx.save();
  ctx.font = `${Math.max(8, smallH * 0.62)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(
    'Fan-made cover concept · Not affiliated with Rockstar Games · Sample photos are AI-generated',
    W / 2, H - smallH / 2,
  );
  ctx.restore();
}
