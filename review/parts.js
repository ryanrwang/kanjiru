/*
 * Parts check (dev only).
 *
 * Shows the parts palette from ../data/parts.json and every kanji's part
 * breakdown from ../data/candidates.json. Flag a kanji whose parts look
 * wrong; the flag saves to data/review.json (common.js), and the next
 * build lists flagged kanji so they can get a hand fix in
 * data/parts-overrides.json.
 *
 * The palette also checks, in this browser, which glyphs this device's own
 * fonts can't draw (open the page on a phone to check iOS or Android).
 */

import {
  el, $, store, loadReview, download, setStatus,
  isFlagged, flagButton, loadPalette, partsRow, strokeDrawing, SINGLE_STROKES
} from './common.js';

const PAGE_SIZE = 60;

const FILTERS = [
  ['easy', 'N3 or easier'],
  ['flagged', 'Flagged'],
  ['override', 'Hand-fixed'],
  ['singles', 'Single strokes'],
  ['twins', 'Look-alikes'],
  ['all', 'All kanji']
];

const state = {
  data: null,
  palette: null,
  filter: 'easy',
  tile: null,          // show only kanji using this tile
  q: '',
  list: [],
  page: 0,
  twins: new Map(),    // kanji → the other kanji with the same parts in the same places
  missing: new Set()   // glyphs this device's fonts can't draw
};

// ── This device's fonts ──────────────────────────────────────────────

// Code points no font is likely to have, one or two per block the palette
// uses: Apple's fallback draws a different "missing" box per block.
const SURELY_MISSING = [
  '\u{10FFFD}', '', '⺚', '⻿', '䶿', '鿿',
  '\u{2A6DE}', '\u{2A6DF}', '\u{3134F}', '\u{323AF}'
];

/** Glyphs that draw like a missing-glyph box (or nothing) in the device's sans-serif. */
function missingOnDevice(glyphs) {
  const size = 40;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.font = `${size * 0.75}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fingerprint = (char) => {
    ctx.clearRect(0, 0, size, size);
    ctx.fillText(char, size / 2, size / 2);
    const pixels = ctx.getImageData(0, 0, size, size).data;
    let hash = 0;
    let ink = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      hash = (Math.imul(hash, 31) + pixels[i]) | 0;
      ink += pixels[i];
    }
    return ink ? String(hash) : 'blank';
  };
  const boxes = new Set(['blank', ...SURELY_MISSING.map(fingerprint)]);
  return new Set(glyphs.filter((g) => boxes.has(fingerprint(g))));
}

// ── Lists ────────────────────────────────────────────────────────────

function findTwins() {
  const groups = new Map();
  Object.entries(state.data.kanji).forEach(([k, v]) => {
    if (!v.grade) return;
    const key = v.parts.map((p) => `${p.el}:${p.pos}`).sort().join(' ');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(k);
  });
  groups.forEach((list) => {
    if (list.length > 1) list.forEach((k) => state.twins.set(k, list.filter((o) => o !== k)));
  });
}

function matches(k, v) {
  if (state.tile && !v.parts.some((p) => p.el === state.tile)) return false;
  switch (state.filter) {
    case 'easy': if (!(v.jlpt >= 3)) return false; break;
    case 'flagged': if (!isFlagged(k)) return false; break;
    case 'override': if (!v.override) return false; break;
    case 'singles': if (!v.parts.some((p) => SINGLE_STROKES.has(p.el)) || v.atomic) return false; break;
    case 'twins': if (!state.twins.has(k)) return false; break;
    default: break;
  }
  if (state.q) {
    const q = state.q.toLowerCase();
    const hay = [k, ...(v.meanings || []), ...(v.on || []), ...(v.kun || [])].join(' ').toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function sortKey(k, v) {
  return [v.jlpt ? -v.jlpt : 0, v.freq || 9999, k];
}

function compare(a, b) {
  const ka = sortKey(...a);
  const kb = sortKey(...b);
  for (let i = 0; i < ka.length; i += 1) {
    if (ka[i] < kb[i]) return -1;
    if (ka[i] > kb[i]) return 1;
  }
  return 0;
}

function rebuild() {
  state.list = Object.entries(state.data.kanji)
    .filter(([k, v]) => matches(k, v))
    .sort(compare)
    .map(([k]) => k);
  state.page = 0;
  renderList();
}

// ── Palette ──────────────────────────────────────────────────────────

function paletteTile(tile) {
  const [main, ...variants] = tile.forms;
  const missing = tile.forms.some((f) => state.missing.has(f.glyph));
  const drawn = tile.forms.some((f) => f.svg);
  return el('button', {
    class: `palette-tile${missing ? ' is-missing' : ''}`,
    type: 'button',
    'aria-pressed': String(state.tile === tile.id),
    title: `${tile.id}: ${tile.strokes} strokes, in ${tile.uses} jōyō kanji` +
      (variants.length ? `; also drawn ${variants.map((f) => f.glyph).join(' ')}` : '') +
      (drawn ? '; drawn from KanjiVG where fonts may lack it' : '') +
      (missing ? '; this device’s own fonts lack a form' : ''),
    onclick: () => {
      state.tile = state.tile === tile.id ? null : tile.id;
      renderPalette();
      renderFilters();
      rebuild();
      $('kanji-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },
  el('span', { class: 'tile' }, main.svg ? strokeDrawing(main) : el('span', { lang: 'ja' }, main.glyph)),
  variants.length ? el('span', { class: 'palette-forms', lang: 'ja' },
    variants.map((f) => (f.svg ? strokeDrawing(f) : el('span', {}, f.glyph)))) : null,
  el('span', { class: 'palette-uses' }, missing ? '✕ device' : drawn ? `${tile.uses} · svg` : String(tile.uses)));
}

function renderPalette() {
  const tiles = state.palette.tiles;
  const byStrokes = new Map();
  tiles.forEach((t) => {
    if (!byStrokes.has(t.strokes)) byStrokes.set(t.strokes, []);
    byStrokes.get(t.strokes).push(t);
  });
  const glyphs = tiles.flatMap((t) => t.forms);
  const drawn = glyphs.filter((f) => f.svg);
  const notNoto = glyphs.filter((f) => f.font === false);
  const notJis = glyphs.filter((f) => f.jis === false);
  $('palette-summary').replaceChildren(
    `${tiles.length} tiles, ${glyphs.length} glyphs counting variant forms. `,
    `${drawn.length} are drawn from KanjiVG strokes: ${notNoto.length} not in Noto Sans/Serif JP, `,
    `${notJis.length} outside JIS X 0213 (so a phone’s own fonts may lack them). `,
    el('strong', {}, state.missing.size
      ? `This device’s own fonts lack ${state.missing.size}: ${[...state.missing].join(' ')}`
      : 'This device’s own fonts draw them all.'),
    ' Tap a tile to list the kanji that use it.'
  );
  $('palette').replaceChildren(...[...byStrokes.entries()].map(([n, list]) => el('section', { class: 'palette-group' },
    el('h3', { class: 'palette-head' }, `${n} stroke${n === 1 ? '' : 's'} · ${list.length}`),
    el('div', { class: 'palette-grid' }, list.map(paletteTile))
  )));
}

// ── Kanji ────────────────────────────────────────────────────────────

function kanjiCard(k) {
  const v = state.data.kanji[k];
  const card = el('li', { class: `card kanji-card${isFlagged(k) ? ' is-flagged' : ''}`, id: `k-${k}` });
  const twins = state.twins.get(k);
  card.append(
    el('div', { class: 'kanji-card-head' },
      el('span', { class: 'kanji-big', lang: 'ja' }, k),
      el('div', { class: 'kanji-meta' },
        el('span', {}, (v.meanings || []).slice(0, 3).join('; ')),
        el('span', { class: 'kanji-facts' },
          [v.jlpt ? `N${v.jlpt}` : 'not on JLPT list', `${v.strokes} strokes`,
            v.atomic ? 'a tile itself' : null, v.override ? 'hand-fixed' : null,
            twins ? `same parts as ${twins.join(' ')}` : null].filter(Boolean).join(' · '))
      ),
      flagButton(k, card)
    ),
    partsRow(v.parts, state.palette)
  );
  return card;
}

function renderFilters() {
  $('filter-kind').replaceChildren(...FILTERS.map(([value, label]) => el('button', {
    class: 'chip',
    type: 'button',
    'aria-pressed': String(state.filter === value),
    onclick: () => {
      state.filter = value;
      renderFilters();
      rebuild();
    }
  }, label)), state.tile ? el('button', {
    class: 'chip',
    type: 'button',
    'aria-pressed': 'true',
    title: 'Show kanji with any tile',
    onclick: () => {
      state.tile = null;
      renderPalette();
      renderFilters();
      rebuild();
    }
  }, el('span', { lang: 'ja' }, `Uses ${state.tile}`), ' ✕') : null);
}

function renderList() {
  const pages = Math.max(1, Math.ceil(state.list.length / PAGE_SIZE));
  const items = state.list.slice(state.page * PAGE_SIZE, (state.page + 1) * PAGE_SIZE);
  $('counts').textContent = `${state.list.length} kanji · ${Object.keys(store.review.parts).length} flagged in all`;
  $('list').replaceChildren(...(items.length
    ? items.map(kanjiCard)
    : [el('li', { class: 'review-empty' }, 'Nothing here with these filters.')]));
  const go = (n) => () => {
    state.page = Math.min(Math.max(n, 0), pages - 1);
    renderList();
    $('kanji-section').scrollIntoView({ block: 'start' });
  };
  $('pager').replaceChildren(
    el('button', { class: 'chip', type: 'button', disabled: state.page === 0, onclick: go(state.page - 1) }, '‹ Prev'),
    el('span', { class: 'pill' }, `Page ${state.page + 1} of ${pages}`),
    el('button', { class: 'chip', type: 'button', disabled: state.page >= pages - 1, onclick: go(state.page + 1) }, 'Next ›')
  );
}

/** parts.html#語 shows that kanji. */
function showFromHash() {
  const k = decodeURIComponent(location.hash.slice(1));
  if (!k || !state.data.kanji[k]) return;
  state.filter = 'all';
  state.tile = null;
  state.q = k;
  $('search').value = k;
  renderPalette();
  renderFilters();
  rebuild();
  $('kanji-section').scrollIntoView({ block: 'start' });
}

// ── Start ────────────────────────────────────────────────────────────

async function start() {
  try {
    const res = await fetch('../data/candidates.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    state.data = await res.json();
  } catch (e) {
    setStatus('No data');
    $('list').replaceChildren(el('li', { class: 'review-empty' },
      'Could not load data/candidates.json. Run: python -I tools/build_data.py'));
    return;
  }
  state.palette = await loadPalette();
  await loadReview();
  state.missing = missingOnDevice(state.palette.tiles.flatMap((t) => t.forms.map((f) => f.glyph)));
  findTwins();

  $('search').addEventListener('input', (e) => {
    state.q = e.target.value.trim();
    rebuild();
  });
  $('download').addEventListener('click', download);
  window.addEventListener('hashchange', showFromHash);

  renderPalette();
  renderFilters();
  rebuild();
  showFromHash();
}

start();
