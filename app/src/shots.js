// Fixed scenes for screenshots, round 3.
// ?shot=cover  -> cover alone, fills the viewport, sized to the viewport.
// ?shot=editor -> the full editor UI.
// Query params: layout, grade, title, subtitle, photo (panel 0 sample),
// size (square|portrait|wide). window.__shotReady is set once painted.
import { EXPORT_SIZES } from './cover.js';

export function applyShot(query, state) {
  const shot = query.get('shot');
  if (!shot) return null;
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('title')) state.title = query.get('title');
  if (query.get('subtitle')) state.subtitle = query.get('subtitle');
  if (query.get('photo')) state.panels[0].img = query.get('photo');
  if (query.get('size')) state.exportSize = query.get('size');
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') document.body.classList.add('shot-editor');
  return shot;
}

export function shotCanvasSize(shot, query) {
  if (shot !== 'cover') return null;
  const size = EXPORT_SIZES.find((s) => s.id === (query.get('size') || 'square'));
  return size ? { w: size.w, h: size.h } : { w: 1080, h: 1080 };
}

export function markShotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
    document.title = 'SHOT READY';
  }));
}
