/*
 * Kanjiru — the start screen and the way into a game.
 *
 * The start screen shows how a game reads, the level picker, the modes, the
 * skin picker and the hints, all built from the catalogues in js/config/
 * and the text in js/i18n/. Nothing here hard-codes a mode, skin, power or word of text:
 * add one to its catalogue and it appears.
 *
 * Routes (the URL hash, so the phone's back gesture works):
 *   (none)            the start screen
 *   #main             a mode's daily (js/play/screen.js)
 *   #main/practice    another puzzle after it ("keep playing")
 */
import {
  MODES, MODE, LEVELS, LEVEL, SLOTS, SKINS, POWERS, ECONOMY, ACHIEVEMENT, validate
} from './js/registry.js';
import { t, setLang, nextLanguage } from './js/i18n.js';
import { el } from './js/dom.js';
import * as store from './js/store.js';
import { openSettings } from './js/settings.js';
import { loadData } from './js/engine/data.js';
import { createEngine } from './js/engine/game.js';
import { answersFor } from './js/engine/daily.js';
import { glyphMaker } from './js/play/glyph.js';
import { openGame } from './js/play/screen.js';
import { dailyStatus, currentLevel } from './js/play/session.js';

const TOKENS = window.TOKENS;
// Reassigned when a save arrives from another device (js/settings.js).
let save = store.load();
setLang(save.settings.lang);
validate();

const pts = (n) => t('currency.amount', { n });

// ── Header: language, scheme, wallet ─────────────────────────────────

const ICONS = {
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
};

function applyLook() {
  TOKENS.applyLook(save.settings.theme, save.settings.scheme);
  renderHeader();
}

function renderHeader() {
  // Language: the button shows the language it switches to, in its own
  // script, so someone who can't read the current one can still find it.
  const next = nextLanguage();
  const langBtn = document.getElementById('lang-toggle');
  langBtn.textContent = next.label;
  langBtn.lang = next.id;
  langBtn.setAttribute('aria-label', next.switchTo);
  langBtn.title = next.switchTo;

  const schemeBtn = document.getElementById('scheme-toggle');
  const look = TOKENS.look();
  const dark = look.scheme === 'dark';
  const fixed = TOKENS.schemesOf(look.theme).length < 2;
  schemeBtn.innerHTML = dark ? ICONS.sun : ICONS.moon;
  schemeBtn.disabled = fixed;
  const label = fixed ? t('header.schemeFixed') : dark ? t('header.schemeLight') : t('header.schemeDark');
  schemeBtn.setAttribute('aria-label', label);
  schemeBtn.title = label;

  const settingsBtn = document.getElementById('settings-open');
  settingsBtn.innerHTML = ICONS.gear;
  settingsBtn.setAttribute('aria-label', t('settings.open'));
  settingsBtn.title = t('settings.open');

  const wallet = document.getElementById('wallet');
  wallet.textContent = `${ECONOMY.currency.icon} ${pts(save.wallet.points)}`;
  wallet.title = `${t('header.points')} (${t('currency.name')})`;
}

document.getElementById('lang-toggle').addEventListener('click', () => {
  const next = nextLanguage().id;
  store.update((s) => { s.settings.lang = next; });
  setLang(next);
  if (screen) { renderHeader(); screen.refresh(); } else renderAll();
});

document.getElementById('scheme-toggle').addEventListener('click', () => {
  const next = TOKENS.look().scheme === 'dark' ? 'light' : 'dark';
  store.update((s) => { s.settings.scheme = next; });
  applyLook();
  renderLooks();
});

// A save arrived from another device: redraw with its progress, looks and language.
function reloadSave() {
  save = store.get();
  setLang(save.settings.lang);
  applyLook();
  renderAll();
}

document.getElementById('settings-open').addEventListener('click', () => {
  openSettings({ onChange: reloadSave });
});

// With no saved choice, follow the device as it switches.
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (save.settings.scheme === null) {
    applyLook();
    renderLooks();
  }
});

// ── Unlock rules ─────────────────────────────────────────────────────

function isUnlocked(slot, item) {
  return item.unlock.type === 'free' || (save.unlocked[slot] || []).includes(item.id);
}

function unlockText(unlock) {
  if (unlock.type === 'points') return t('looks.lockPoints', { cost: unlock.cost });
  if (unlock.type === 'achievement') {
    return t('looks.lockAchievement', { name: t(`achievement.${unlock.id}.name`) });
  }
  return '';
}

function unlockHint(unlock) {
  if (unlock.type === 'points') return t('looks.buyHint', { cost: unlock.cost });
  if (unlock.type === 'achievement' && ACHIEVEMENT[unlock.id]) {
    return t('looks.achievementHint', { desc: t(`achievement.${unlock.id}.desc`) });
  }
  return '';
}

// ── Game data ────────────────────────────────────────────────────────
//
// Loaded once in the background; the start screen draws straight away and
// the mode cards fill in when it arrives.

const game = { data: null, engine: null, glyph: null, error: false };

const ready = loadData().then((data) => {
  game.data = data;
  game.engine = createEngine(data);
  game.glyph = glyphMaker(data.tiles);
}).catch((e) => {
  console.error('[kanjiru] the game data didn’t load', e);
  game.error = true;
});

// A mode can be played once the game screen supports it and it has answers.
const playable = (mode) => !!(mode.playable && game.data && answersFor(game.data, mode).length);

// ── Sections ─────────────────────────────────────────────────────────

const app = document.getElementById('app');

// A worked example for each kind of guess (levels.js guess).
// Kanji guesses: answer 明 (日 left, 月 right).
// Parts guesses: answer 時間 (日 土 寸 | 門 日), one group of cells per
// kanji. Without places (Normal) a part is green in the right kanji and
// yellow in the other; with places (Hard) it's green only in its place.
const DEMO = {
  kanji: [
    { guess: '間', parts: [['門', 'miss'], ['日', 'near']] },
    { guess: '時', parts: [['日', 'hit'], ['寺', 'miss']] },
    { guess: '明', parts: [['日', 'hit'], ['月', 'hit']] }
  ],
  parts: [
    [[['木', 'miss'], ['口', 'miss'], ['日', 'hit']], [['寸', 'other'], ['門', 'hit']]],
    [[['日', 'hit'], ['土', 'hit'], ['寸', 'hit']], [['門', 'hit'], ['月', 'miss']]],
    [[['日', 'hit'], ['土', 'hit'], ['寸', 'hit']], [['門', 'hit'], ['日', 'hit']]]
  ],
  places: [
    [[['口', 'miss'], ['日', 'near'], ['木', 'miss']], [['門', 'hit'], ['寸', 'other']]],
    [[['日', 'hit'], ['土', 'hit'], ['寸', 'hit']], [['門', 'hit'], ['月', 'miss']]],
    [[['日', 'hit'], ['土', 'hit'], ['寸', 'hit']], [['門', 'hit'], ['日', 'hit']]]
  ],
  answer: '時間',
  positions: [['left', 'right', 'right'], ['outer', 'inner']]
};

let heroSection = null;

// Parts guesses: the cells of each kanji, the answer once a row is solved.
function demoParts(level) {
  const slots = (row) => row.map((cells) => el('span', { class: 'demo-slot' }, cells));
  const rows = DEMO[level.places ? 'places' : 'parts'];
  return el('div', { class: 'demo is-parts', 'aria-hidden': 'true' },
    level.places ? el('div', { class: 'demo-row' },
      slots(DEMO.positions.map((slot) => slot.map((pos) => el('span', { class: 'demo-place' }, t(`posShort.${pos}`)))))) : null,
    rows.map((row) => el('div', { class: 'demo-row' },
      slots(row.map((slot) => slot.map(([part, state]) => el('span', { class: `tile is-cell is-${state}`, lang: 'ja' }, part)))),
      row.every((slot) => slot.every(([, state]) => state === 'hit'))
        ? el('span', { class: 'demo-answer kanji', lang: 'ja' }, DEMO.answer) : null)));
}

function renderHero() {
  const level = LEVEL[currentLevel()];
  const parts = level.guess === 'parts';
  const legend = ['hit', 'near', 'miss'].map((state) => [state, `hero.${state}`]);
  const fresh = el('section', { class: 'card hero', 'aria-labelledby': 'hero-title' },
    el('p', { class: 'tagline', id: 'hero-title' },
      t('hero.title'),
      el('small', {}, t(!parts ? 'hero.body' : level.places ? 'hero.placesBody' : 'hero.partsBody'))
    ),
    parts ? demoParts(level) : el('div', { class: 'demo', 'aria-hidden': 'true' },
      DEMO.kanji.map((row) => el('div', { class: 'demo-row' },
        el('span', { class: 'demo-guess kanji', lang: 'ja' }, row.guess),
        row.parts.map(([part, state]) => el('span', { class: `tile is-${state}`, lang: 'ja' }, part))))
    ),
    el('p', { class: 'demo-legend' },
      legend.map(([state, key]) =>
        el('span', {}, el('span', { class: `legend-dot is-${state}-bg` }), t(key)))
    )
  );
  if (heroSection && heroSection.isConnected) heroSection.replaceWith(fresh);
  heroSection = fresh;
  return fresh;
}

// Today's daily in a mode, as a line of text.
function dailyText(status) {
  if (!status) return t('play.practiceOnly');
  const { puzzle, entry, started, guesses } = status;
  const level = t(`level.${status.level}.name`);
  if (entry) {
    return entry.won
      ? t('play.dailyWon', { n: puzzle, level, guesses: entry.guesses.length })
      : t('play.dailyLost', { n: puzzle, level });
  }
  return started ? t('play.dailyStarted', { n: puzzle, level, guesses }) : t('play.dailyNew', { n: puzzle });
}

// The daily comes first; once it's done (or with no daily), keep playing.
function modeCard(mode) {
  const can = playable(mode);
  const status = can ? dailyStatus(game.data, mode) : null;
  const more = can && (!status || !!status.entry);
  const note = can ? dailyText(status)
    : !mode.playable || game.data ? t('play.soon')
      : game.error ? t('play.loadFailed') : t('play.loading');
  return el('div', { class: `card mode-card${can ? '' : ' is-soon'}` },
    el('span', { class: 'mode-kanji kanji', lang: 'ja', 'aria-hidden': 'true' }, mode.numeral),
    el('span', { class: 'mode-name' }, t(`mode.${mode.id}.name`)),
    el('span', { class: 'mode-meta' }, t('play.meta', { guesses: mode.guesses, mult: mode.points })),
    el('span', { class: 'mode-status' }, note),
    can ? el('div', { class: 'mode-actions' },
      more ? el('button', { class: 'btn btn-primary btn-small', type: 'button', onclick: () => go(`${mode.id}/practice`) },
        t('play.practice')) : null,
      status ? el('button', { class: `btn ${more ? 'btn-secondary' : 'btn-primary'} btn-small`, type: 'button', onclick: () => go(mode.id) },
        status.entry ? t('play.result') : status.started ? t('play.continue') : t('play.daily')) : null) : null
  );
}

// The level for new games (save.settings.level). A game already begun
// keeps its own, unless it has no moves yet (js/play/session.js).
function levelPicker() {
  const current = currentLevel();
  return el('div', { class: 'level-picker' },
    el('span', { class: 'look-slot-name', id: 'level-label' }, t('play.level')),
    el('div', { class: 'chip-row', role: 'group', 'aria-labelledby': 'level-label' },
      LEVELS.map((level) => el('button', {
        class: 'chip', type: 'button',
        'aria-pressed': String(level.id === current),
        onclick: () => {
          if (level.id === current) return;
          store.update((s) => { s.settings.level = level.id; });
          renderHero();
          renderModes();
        }
      }, t(`level.${level.id}.name`)))),
    el('p', { class: 'level-desc' },
      t(`level.${current}.desc`), ' ',
      el('span', { class: 'level-points' }, t('play.levelPoints', { mult: LEVEL[current].points }))));
}

let modesSection = null;

function renderModes() {
  const fresh = el('section', { class: 'section', 'aria-labelledby': 'modes-title' },
    el('h2', { class: 'section-title', id: 'modes-title' },
      t('play.title'), el('span', { class: 'section-note' }, t('play.note'))),
    levelPicker(),
    el('div', { class: 'mode-grid' }, MODES.filter((m) => m.listed).map(modeCard))
  );
  if (modesSection && modesSection.isConnected) modesSection.replaceWith(fresh);
  modesSection = fresh;
  return fresh;
}

function themeSwatch(item) {
  const unlocked = isUnlocked('theme', item);
  const colours = TOKENS.resolve(item.id, TOKENS.look().scheme).color;
  const name = t(`skin.theme.${item.id}`);
  return el('button', {
    class: `swatch${unlocked ? '' : ' is-locked'}`,
    type: 'button',
    'aria-pressed': String(save.settings.theme === item.id),
    'aria-disabled': unlocked ? null : 'true',
    title: unlocked ? name : unlockHint(item.unlock),
    onclick: () => {
      if (!unlocked) return;
      store.update((s) => { s.settings.theme = item.id; });
      applyLook();
      renderLooks();
    }
  },
    el('span', { class: 'swatch-preview', style: { background: colours.bg.page } },
      [colours.text.accent, colours.feedback.hit, colours.feedback.near, colours.feedback.miss].map((c) =>
        el('span', { class: 'swatch-dot', style: { background: c } }))
    ),
    el('span', { class: 'swatch-name' }, name),
    unlocked ? null : el('span', { class: 'swatch-lock' }, unlockText(item.unlock))
  );
}

function skinChip(slot, item) {
  const unlocked = isUnlocked(slot, item);
  const name = t(`skin.${slot}.${item.id}`);
  return el('button', {
    class: `chip${unlocked ? '' : ' is-locked'}`,
    type: 'button',
    'aria-pressed': String(save.settings[slot] === item.id),
    'aria-disabled': unlocked ? null : 'true',
    title: unlocked ? name : unlockHint(item.unlock),
    onclick: () => {
      if (!unlocked) return;
      store.update((s) => { s.settings[slot] = item.id; });
      renderLooks();
    }
  }, name, unlocked ? null : ` ${unlockText(item.unlock)}`);
}

let looksSection = null;

function renderLooks() {
  const fresh = el('section', { class: 'section', 'aria-labelledby': 'looks-title' },
    el('h2', { class: 'section-title', id: 'looks-title' },
      t('looks.title'), el('span', { class: 'section-note' }, t('looks.note'))),
    SLOTS.map((slot) => el('div', { class: 'look-slot' },
      el('span', { class: 'look-slot-name' }, t(`slot.${slot.id}`)),
      slot.id === 'theme'
        ? el('div', { class: 'swatch-row' }, SKINS.theme.map(themeSwatch))
        : el('div', { class: 'chip-row' }, SKINS[slot.id].map((item) => skinChip(slot.id, item)))
    ))
  );
  if (looksSection && looksSection.isConnected) looksSection.replaceWith(fresh);
  looksSection = fresh;
  return fresh;
}

function whenText(when) {
  if (when.includes('before') && when.includes('during')) return t('powers.whenBoth');
  return when.includes('before') ? t('powers.whenBefore') : t('powers.whenDuring');
}

function renderPowers() {
  return el('section', { class: 'section', 'aria-labelledby': 'powers-title' },
    el('h2', { class: 'section-title', id: 'powers-title' },
      t('powers.title'), el('span', { class: 'section-note' }, t('powers.note'))),
    el('div', { class: 'power-list' },
      POWERS.map((p) => el('div', { class: 'card power' },
        el('span', { class: 'power-icon', 'aria-hidden': 'true' }, p.icon),
        el('div', { class: 'power-body' },
          el('div', { class: 'power-name' },
            el('span', {}, t(`power.${p.id}.name`)),
            el('span', { class: 'power-cost' },
              p.cost === null ? t('powers.earnedOnly') : t('powers.cost', { cost: p.cost }))),
          el('p', { class: 'power-desc' }, t(`power.${p.id}.desc`)),
          el('p', { class: 'power-when' },
            [
              whenText(p.when),
              p.minLength > 1 ? t('powers.minLength', { n: p.minLength }) : null,
              t('powers.have', { n: save.inventory[p.id] || 0 })
            ].filter(Boolean).join(' · '))
        )
      ))
    )
  );
}

// ── Routes ───────────────────────────────────────────────────────────

let screen = null;        // the game screen, while one is open
let wentIn = false;       // reached the game from the start screen, so Back can go back

function route() {
  const [modeId, kind] = location.hash.replace(/^#/, '').split('/');
  const mode = MODE[modeId];
  return mode ? { mode, kind: kind === 'practice' ? 'practice' : 'daily' } : null;
}

function go(path) {
  wentIn = true;
  location.hash = path;
}

function home() {
  if (wentIn) { wentIn = false; history.back(); return; }
  history.replaceState(null, '', location.pathname + location.search);
  renderAll();
}

function renderStart() {
  app.replaceChildren(renderHero(), renderModes(), renderLooks(), renderPowers());
}

async function renderGame({ mode, kind }) {
  app.replaceChildren(el('p', { class: 'loading' }, t('play.loading')));
  await ready;
  const now = route();
  if (!now || now.mode !== mode || now.kind !== kind || screen) return;   // moved on meanwhile
  if (!playable(mode)) {
    app.replaceChildren(el('section', { class: 'card game-soon' },
      el('p', {}, game.error ? t('play.loadFailed') : t('game.soon')),
      el('div', { class: 'btn-row' },
        el('button', { class: 'btn btn-secondary', type: 'button', onclick: home }, t('game.home')))));
    return;
  }
  screen = openGame(app, {
    data: game.data, engine: game.engine, glyph: game.glyph, mode, kind,
    onHome: home,
    onPractice: () => location.replace(`#${mode.id}/practice`),
    onWallet: renderHeader,
    onReload: renderAll
  });
}

function renderAll() {
  renderHeader();
  if (screen) { screen.destroy(); screen = null; }
  const r = route();
  document.body.classList.toggle('is-game', !!r);
  if (r) renderGame(r);
  else renderStart();
}

window.addEventListener('hashchange', () => {
  if (!route()) wentIn = false;
  renderAll();
  window.scrollTo(0, 0);
});

applyLook();
renderAll();
// The mode cards wait for the data.
ready.then(() => { if (!route()) renderModes(); });
