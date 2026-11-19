// Fixed scenes for screenshots: ?shot=cover draws the cover alone at one
// of the three export sizes; ?shot=editor shows the full studio. The
// loader hands the main module a ready-to-draw state, and window.__shotReady
// is set once the paint has landed, so a headless capture can wait for it.

import { defaultState, drawNeonCover } from './cover.js';

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Waits until the bundled display fonts are usable by the canvas. */
export async function loadCoverFonts() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.ready,
    ]);
  } catch {
    // The canvas falls back to its system fonts; the shot still renders.
  }
}

/** Loads every bundled sample photo, keyed by its file name. */
export async function loadSamples() {
  const keys = ['driver', 'rider', 'tower', 'skyline', 'boulevard', 'pier'];
  const images = {};
  await Promise.all(
    keys.map(async (key) => {
      try {
        images[key] = await loadImage(`samples/${key}.jpg`);
      } catch {
        images[key] = null;
      }
    }),
  );
  return images;
}

/** Paints the cover alone, sized to the requested export shape. */
export async function runCoverShot(canvas, size) {
  const dims = { square: [1080, 1080], portrait: [1080, 1350], wide: [1920, 1080] };
  const [w, h] = dims[size] || dims.square;
  canvas.width = w;
  canvas.height = h;
  const images = await loadSamples();
  await loadCoverFonts();
  drawNeonCover(canvas, defaultState(), images, {});
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}

/** Paints the editor with the default cover loaded, for the editor shot. */
export async function runEditorShot(canvas, drawEditor) {
  const images = await loadSamples();
  await loadCoverFonts();
  drawEditor(images);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
