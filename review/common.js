/*
 * Shared by the word review (index.html) and the parts check (parts.html).
 * Dev only.
 *
 * Holds the review file (Keep / Maybe / Cut per word, a flag per kanji whose
 * parts look wrong), saved to ../data/review.json through review.php under
 * PHP's built-in server, with a copy in this browser. Also draws parts:
 * text when the fonts have the glyph, KanjiVG strokes when they may not
 * (data/parts.json marks those with svg).
 */

const LOCAL_KEY = 'kanjiru.review';

export const POS_LABEL = {
  left: 'left', right: 'right', top: 'top', bottom: 'bottom',
  outer: 'outer', inner: 'inner', whole: 'whole', none: '—'
};

export const SINGLE_STROKES = new Set(['一', '丨', '丶', '丿', '乙', '亅']);

// ── DOM helpers ──────────────────────────────────────────────────────

export function el(tag, attrs = {}, ...children) {
  const node = tag === 'svg' || tag === 'path' || tag === 'title'
    ? document.createElementNS('http://www.w3.org/2000/svg', tag)
    : document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) return;
    if (key === 'class') node.setAttribute('class', value);
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  });
  children.flat().forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  });
  return node;
}

export const $ = (id) => document.getElementById(id);

// ── The review file ──────────────────────────────────────────────────

export const store = {
  review: { decisions: {}, parts: {} },
  serverSave: true
};

export function setStatus(text) {
  $('save-status').textContent = text;
}

let saveTimer = null;

export function scheduleSave() {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(store.review)); } catch (e) { /* ignore */ }
  setStatus('Saving…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 400);
}

async function saveNow() {
  if (!store.serverSave) {
    setStatus('Saved in this browser only');
    return;
  }
  try {
    const res = await fetch('review.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(store.review)
    });
    if (!res.ok) throw new Error(res.status);
    setStatus('Saved to data/review.json');
  } catch (e) {
    setStatus('File save failed — kept in this browser');
  }
}

export async function loadReview() {
  try {
    const res = await fetch('review.php', { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    const saved = await res.json();
    store.review = { decisions: saved.decisions || {}, parts: saved.parts || {} };
  } catch (e) {
    // No PHP (e.g. a static server): work from the browser copy.
    store.serverSave = false;
    try {
      const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
      store.review = { decisions: local.decisions || {}, parts: local.parts || {} };
    } catch (err) {
      store.review = { decisions: {}, parts: {} };
    }
  }
  setStatus(store.serverSave ? 'Saving to data/review.json' : 'No PHP: saving in this browser');
}

export function download() {
  const blob = new Blob([JSON.stringify(store.review, null, 2) + '\n'], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: 'review.json' });
  document.body.append(a);
  a.click();
  a.remove();
}

export function isFlagged(char) {
  return store.review.parts[char] === 'flag';
}

/** A ⚐ button that flags a kanji's parts; `box` gets .is-flagged too. */
export function flagButton(char, box) {
  const flagged = isFlagged(char);
  return el('button', {
    class: 'flag-btn',
    type: 'button',
    'aria-pressed': String(flagged),
    title: 'Flag this kanji’s parts as wrong or awkward',
    onclick: (e) => {
      if (isFlagged(char)) delete store.review.parts[char];
      else store.review.parts[char] = 'flag';
      const now = isFlagged(char);
      e.currentTarget.setAttribute('aria-pressed', String(now));
      e.currentTarget.textContent = now ? '⚑ Flagged' : '⚐ Parts';
      (box || e.currentTarget).classList.toggle('is-flagged', now);
      scheduleSave();
    }
  }, flagged ? '⚑ Flagged' : '⚐ Parts');
}

// ── Parts ────────────────────────────────────────────────────────────

/** Read ../data/parts.json into { tiles, forms: Map(glyph → {tile, form}) }. */
export async function loadPalette() {
  try {
    const res = await fetch('../data/parts.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    const forms = new Map();
    data.tiles.forEach((tile) => tile.forms.forEach((form) => forms.set(form.glyph, { tile, form })));
    return { meta: data.meta, tiles: data.tiles, forms };
  } catch (e) {
    return { meta: {}, tiles: [], forms: new Map() };
  }
}

/** KanjiVG's strokes for a form (form.svg from parts.json). */
export function strokeDrawing(form) {
  return el('svg', {
    class: 'glyph-svg',
    viewBox: form.svg.viewBox,
    role: 'img',
    'aria-label': form.glyph
  }, el('title', {}, form.glyph), form.svg.paths.map((d) => el('path', { d })));
}

/** A glyph as text, or as strokes when the fonts may lack it. */
export function glyph(char, palette, { preferText = false } = {}) {
  const hit = palette && palette.forms.get(char);
  if (hit && hit.form.svg && !preferText) return strokeDrawing(hit.form);
  return el('span', { lang: 'ja' }, char);
}

/** One part: its tile, and its position under it. */
export function partTile(part, palette) {
  const shown = part.form || part.el;
  return el('span', { class: 'part', title: part.form ? `${part.form} (counts as ${part.el})` : part.el },
    el('span', { class: 'tile' }, glyph(shown, palette)),
    el('span', { class: 'part-pos' }, POS_LABEL[part.pos] || part.pos)
  );
}

export function partsRow(parts, palette) {
  return el('div', { class: 'kanji-parts-row' }, parts.map((p) => partTile(p, palette)));
}
