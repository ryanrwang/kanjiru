/*
 * Word review (dev only).
 *
 * Reads ../data/candidates.json, shows each candidate answer with its part
 * breakdown, and records Keep / Maybe / Cut per word plus a flag per kanji
 * whose parts look wrong. Saving is in common.js; parts.html checks the
 * parts themselves.
 *
 * The list is a snapshot taken when the filters change, so deciding a word
 * doesn't make the page jump. Change a filter or press Refresh to rebuild it.
 */

import {
  el, $, store, scheduleSave, loadReview, download, setStatus,
  isFlagged, flagButton, loadPalette, partsRow
} from './common.js';

const PAGE_SIZE = 40;

const STATUSES = [
  ['pending', 'Pending'], ['keep', 'Keep'], ['maybe', 'Maybe'], ['cut', 'Cut'], ['all', 'All']
];

const state = {
  data: null,
  palette: null,
  filters: { length: 'all', status: 'pending', level: 'all', q: '' },
  list: [],
  page: 0
};

// ── Filtering ────────────────────────────────────────────────────────

function infoFor(word) {
  if (word.length === 1) {
    const k = state.data.kanji[word.word] || {};
    return {
      reading: [(k.on || []).join('、'), (k.kun || []).join('、')].filter(Boolean).join(' · '),
      meanings: k.meanings || []
    };
  }
  return { reading: word.reading || '', meanings: word.meanings || [] };
}

function decisionOf(word) {
  return store.review.decisions[word.word] || 'pending';
}

function matches(word, ignoreStatus) {
  const f = state.filters;
  if (f.length !== 'all' && word.length !== Number(f.length)) return false;
  if (f.level !== 'all') {
    if (f.level === 'none' ? word.jlpt !== null && word.jlpt !== undefined : word.jlpt !== Number(f.level)) return false;
  }
  if (!ignoreStatus && f.status !== 'all' && decisionOf(word) !== f.status) return false;
  if (f.q) {
    const q = f.q.toLowerCase();
    const info = infoFor(word);
    const hay = [word.word, info.reading, info.meanings.join(' ')].join(' ').toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function rebuild() {
  state.list = state.data.words.filter((w) => matches(w, false));
  state.page = 0;
  render();
}

// ── Rendering ────────────────────────────────────────────────────────

function chipGroup(id, options, key) {
  const box = $(id);
  box.replaceChildren(...options.map(([value, label]) => el('button', {
    class: 'chip',
    type: 'button',
    'aria-pressed': String(String(state.filters[key]) === String(value)),
    onclick: () => {
      state.filters[key] = value;
      renderFilters();
      rebuild();
    }
  }, label)));
}

function renderFilters() {
  const lengths = [...new Set(state.data.words.map((w) => w.length))].sort((a, b) => a - b);
  chipGroup('filter-length', [['all', 'All lengths'], ...lengths.map((n) => [n, `${n} kanji`])], 'length');
  chipGroup('filter-status', STATUSES, 'status');
  const levels = [...new Set(state.data.words.map((w) => w.jlpt).filter((n) => n))].sort((a, b) => b - a);
  chipGroup('filter-level', [['all', 'All levels'], ...levels.map((n) => [n, `N${n}`]), ['none', 'Not on JLPT list']], 'level');
}

function renderCounts() {
  const tally = { pending: 0, keep: 0, maybe: 0, cut: 0 };
  state.data.words.forEach((w) => { if (matches(w, true)) tally[decisionOf(w)] += 1; });
  $('counts').textContent =
    `Pending ${tally.pending} · Keep ${tally.keep} · Maybe ${tally.maybe} · Cut ${tally.cut}` +
    `  —  showing ${state.list.length} in this list`;
}

function partsBlock(char) {
  const k = state.data.kanji[char];
  const box = el('div', { class: `kanji-parts${isFlagged(char) ? ' is-flagged' : ''}` });
  box.append(
    el('div', { class: 'kanji-parts-head' },
      el('a', { href: `parts.html#${encodeURIComponent(char)}`, title: 'Open in the parts check' },
        el('span', { class: 'kanji', lang: 'ja' }, char),
        k ? ` · ${k.strokes} stroke${k.strokes === 1 ? '' : 's'}${k.jlpt ? ` · N${k.jlpt}` : ''}` +
            `${k.override ? ' · hand-fixed' : ''}` : ' · not in data'),
      flagButton(char, box)
    ),
    partsRow((k && k.parts) || [], state.palette)
  );
  return box;
}

function wordCard(word) {
  const info = infoFor(word);
  const decision = decisionOf(word);
  const card = el('li', { class: `card word-card is-${decision}` });

  const setDecision = (value) => {
    if (store.review.decisions[word.word] === value) delete store.review.decisions[word.word];
    else store.review.decisions[word.word] = value;
    const now = decisionOf(word);
    card.className = `card word-card is-${now}`;
    card.querySelectorAll('.decision').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.value === now));
    });
    renderCounts();
    scheduleSave();
  };

  card.append(
    el('div', { class: 'word-head' },
      el('div', {},
        el('span', { class: 'word-text', lang: 'ja' }, word.word),
        el('span', { class: 'word-reading', lang: 'ja' }, info.reading)
      ),
      el('div', { class: 'word-badges' },
        el('span', { class: 'pill' }, word.jlpt ? `N${word.jlpt}` : 'Not on JLPT list'),
        word.common ? el('span', { class: 'pill' }, 'common') : null,
        el('span', { class: 'pill' }, `${word.length} kanji`)
      )
    ),
    el('p', { class: 'word-meaning' }, info.meanings.join('; ')),
    el('div', { class: 'word-parts' }, [...word.word].map(partsBlock)),
    el('div', { class: 'decision-row' },
      [['keep', 'Keep'], ['maybe', 'Maybe'], ['cut', 'Cut']].map(([value, label]) => el('button', {
        class: 'decision',
        type: 'button',
        'data-value': value,
        'aria-pressed': String(decision === value),
        onclick: () => setDecision(value)
      }, label))
    )
  );
  return card;
}

function renderPager() {
  const pages = Math.max(1, Math.ceil(state.list.length / PAGE_SIZE));
  const go = (n) => () => {
    state.page = Math.min(Math.max(n, 0), pages - 1);
    render();
    window.scrollTo({ top: 0 });
  };
  $('pager').replaceChildren(
    el('button', { class: 'chip', type: 'button', disabled: state.page === 0, onclick: go(state.page - 1) }, '‹ Prev'),
    el('span', { class: 'pill' }, `Page ${state.page + 1} of ${pages}`),
    el('button', { class: 'chip', type: 'button', disabled: state.page >= pages - 1, onclick: go(state.page + 1) }, 'Next ›'),
    el('button', { class: 'chip', type: 'button', onclick: () => { rebuild(); window.scrollTo({ top: 0 }); } }, 'Refresh list')
  );
}

function pageItems() {
  return state.list.slice(state.page * PAGE_SIZE, (state.page + 1) * PAGE_SIZE);
}

function render() {
  renderCounts();
  const items = pageItems();
  $('list').replaceChildren(...(items.length
    ? items.map(wordCard)
    : [el('li', { class: 'review-empty' }, 'Nothing here with these filters.')]));
  renderPager();
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

  $('search').addEventListener('input', (e) => {
    state.filters.q = e.target.value.trim();
    rebuild();
  });
  $('bulk-keep').addEventListener('click', () => {
    pageItems().forEach((w) => {
      if (decisionOf(w) === 'pending') store.review.decisions[w.word] = 'keep';
    });
    render();
    scheduleSave();
  });
  $('download').addEventListener('click', download);

  renderFilters();
  rebuild();
}

start();
