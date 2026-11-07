/*
 * Word review (dev only).
 *
 * Reads ../data/candidates.json, shows each candidate answer with its part
 * breakdown, and records Keep / Maybe / Cut per word plus a flag per kanji
 * whose parts look wrong. Decisions save to ../data/review.json through
 * review.php (PHP's built-in server only), with a copy in this browser.
 *
 * The list is a snapshot taken when the filters change, so deciding a word
 * doesn't make the page jump. Change a filter or press Refresh to rebuild it.
 */

const PAGE_SIZE = 40;
const LOCAL_KEY = 'kanjiru.review';

const POS_LABEL = {
  left: 'left', right: 'right', top: 'top', bottom: 'bottom',
  outer: 'outer', inner: 'inner', whole: 'whole', none: '—'
};

const STATUSES = [
  ['pending', 'Pending'], ['keep', 'Keep'], ['maybe', 'Maybe'], ['cut', 'Cut'], ['all', 'All']
];

const state = {
  data: null,
  review: { decisions: {}, parts: {} },
  filters: { length: 'all', status: 'pending', level: 'all', q: '' },
  list: [],
  page: 0,
  serverSave: true
};

// ── DOM helper ───────────────────────────────────────────────────────

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) return;
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  });
  children.flat().forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  });
  return node;
}

const $ = (id) => document.getElementById(id);

// ── Saving ───────────────────────────────────────────────────────────

function setStatus(text) {
  $('save-status').textContent = text;
}

let saveTimer = null;

function scheduleSave() {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(state.review)); } catch (e) { /* ignore */ }
  setStatus('Saving…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 400);
}

async function saveNow() {
  if (!state.serverSave) {
    setStatus('Saved in this browser only');
    return;
  }
  try {
    const res = await fetch('review.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.review)
    });
    if (!res.ok) throw new Error(res.status);
    setStatus('Saved to data/review.json');
  } catch (e) {
    setStatus('File save failed — kept in this browser');
  }
}

async function loadReview() {
  try {
    const res = await fetch('review.php', { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    const saved = await res.json();
    return { decisions: saved.decisions || {}, parts: saved.parts || {} };
  } catch (e) {
    // No PHP (e.g. a static server): work from the browser copy.
    state.serverSave = false;
    try {
      const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
      return { decisions: local.decisions || {}, parts: local.parts || {} };
    } catch (err) {
      return { decisions: {}, parts: {} };
    }
  }
}

function download() {
  const blob = new Blob([JSON.stringify(state.review, null, 2) + '\n'], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: 'review.json' });
  document.body.append(a);
  a.click();
  a.remove();
}

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
  return state.review.decisions[word.word] || 'pending';
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
  const flagged = state.review.parts[char] === 'flag';
  const parts = (k && k.parts) || [];
  return el('div', { class: `kanji-parts${flagged ? ' is-flagged' : ''}` },
    el('div', { class: 'kanji-parts-head' },
      el('span', {}, el('span', { class: 'kanji', lang: 'ja' }, char),
        k ? ` · ${k.strokes} stroke${k.strokes === 1 ? '' : 's'}${k.jlpt ? ` · N${k.jlpt}` : ''}` : ' · not in data'),
      el('button', {
        class: 'flag-btn',
        type: 'button',
        'aria-pressed': String(flagged),
        title: 'Flag this kanji’s parts as wrong or awkward',
        onclick: (e) => {
          if (state.review.parts[char] === 'flag') delete state.review.parts[char];
          else state.review.parts[char] = 'flag';
          const now = state.review.parts[char] === 'flag';
          e.currentTarget.setAttribute('aria-pressed', String(now));
          e.currentTarget.closest('.kanji-parts').classList.toggle('is-flagged', now);
          scheduleSave();
        }
      }, flagged ? '⚑ Flagged' : '⚐ Parts')
    ),
    el('div', { class: 'kanji-parts-row' },
      parts.map((p) => el('span', { class: 'part', title: p.orig ? `${p.el} (from ${p.orig})` : p.el },
        el('span', { class: 'tile', lang: 'ja' }, p.el),
        el('span', { class: 'part-pos' }, POS_LABEL[p.pos] || p.pos)
      ))
    )
  );
}

function wordCard(word) {
  const info = infoFor(word);
  const decision = decisionOf(word);
  const card = el('li', { class: `card word-card is-${decision}` });

  const setDecision = (value) => {
    if (state.review.decisions[word.word] === value) delete state.review.decisions[word.word];
    else state.review.decisions[word.word] = value;
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
  state.review = await loadReview();
  setStatus(state.serverSave ? 'Saving to data/review.json' : 'No PHP: saving in this browser');

  $('search').addEventListener('input', (e) => {
    state.filters.q = e.target.value.trim();
    rebuild();
  });
  $('bulk-keep').addEventListener('click', () => {
    pageItems().forEach((w) => {
      if (decisionOf(w) === 'pending') state.review.decisions[w.word] = 'keep';
    });
    render();
    scheduleSave();
  });
  $('download').addEventListener('click', download);

  renderFilters();
  rebuild();
}

start();
