/*
 * Kanjiru — the pages, and the way between them.
 *
 * The header holds two things: the points, which open the Points page, and
 * the gear, which opens Settings (js/settings.js: language, light or dark,
 * moving devices, debug). Everything on a page is built from the catalogues
 * in js/config/ and the text in js/i18n/: add an entry and it appears.
 *
 * Pages (the URL hash, so the phone's back gesture works):
 *   (none)            the play page: a play card per listed mode, with the
 *                     Hard and Guided switches on it, then how to play
 *   #points           the Points page (js/points.js): the wallet, looks,
 *                     hints and achievements, and buying
 *   #main             a mode's daily (js/play/screen.js)
 *   #main/practice    another puzzle after it ("keep playing")
 */
import { MODES, MODE, LEVEL, ECONOMY, settingsLevel, validate } from './js/registry.js';
import { t, setLang } from './js/i18n.js';
import { el, switchRow } from './js/dom.js';
import * as store from './js/store.js';
import { openSettings } from './js/settings.js';
import { openPoints } from './js/points.js';
import { toast, bump } from './js/toast.js';
import { loadData } from './js/engine/data.js';
import { createEngine } from './js/engine/game.js';
import { answersFor, localDate, msToNextDaily } from './js/engine/daily.js';
import { glyphMaker } from './js/play/glyph.js';
import { openGame } from './js/play/screen.js';
import { dailyStatus, currentLevel } from './js/play/session.js';
import { earnAchievements, describe } from './js/play/rewards.js';

const TOKENS = window.TOKENS;
// Reassigned when a save arrives from another device (js/settings.js).
let save = store.load();
setLang(save.settings.lang);
validate();

const pts = (n) => t('currency.amount', { n });

// ── Header: the points and Settings ──────────────────────────────────

const GEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';

function applyLook() {
  TOKENS.applyLook(save.settings.theme, save.settings.scheme);
}

let shownPoints = null;   // the points the header last showed on screen

function renderHeader() {
  const settingsBtn = document.getElementById('settings-open');
  settingsBtn.innerHTML = GEAR;
  settingsBtn.setAttribute('aria-label', t('settings.open'));
  settingsBtn.title = t('settings.open');
  // Home names the game; another page shows where you are: 漢 › Points.
  const brand = document.getElementById('brand');
  const p = page();
  const crumb = p.name === 'points' ? t('points.title') : null;
  brand.title = t('header.home');
  // Shown as 漢 alone, the link is named for where it goes.
  if (crumb) brand.setAttribute('aria-label', t('header.home'));
  else brand.removeAttribute('aria-label');
  brand.parentElement.querySelectorAll('.crumb').forEach((node) => node.remove());
  document.querySelector('.app-header').classList.toggle('is-crumb', !!crumb);
  if (crumb) {
    brand.after(
      el('span', { class: 'crumb crumb-sep', 'aria-hidden': 'true' }, '›'),
      el('span', { class: 'crumb crumb-page', id: `${p.name}-title` }, crumb));
  }

  // The points open the Points page. A change since they last showed rises
  // from them, once they're on screen (a game hides the header).
  const wallet = document.getElementById('wallet');
  const now = store.points(save);
  const amount = el('span', { class: 'wallet-amount' },
    el('span', { class: 'wallet-icon', 'aria-hidden': 'true' }, ECONOMY.currency.icon), pts(now));
  wallet.replaceChildren(amount);
  wallet.title = t('header.points');
  wallet.setAttribute('aria-label', t('header.wallet', { amount: pts(now) }));
  if (p.name === 'points') wallet.setAttribute('aria-current', 'page');
  else wallet.removeAttribute('aria-current');
  if (!document.body.classList.contains('is-game')) {
    if (shownPoints !== null && now !== shownPoints) bump(amount, now - shownPoints);
    shownPoints = now;
  }
}

document.getElementById('wallet').addEventListener('click', (event) => {
  event.preventDefault();
  if (page().name === 'points') window.scrollTo({ top: 0, behavior: 'smooth' });
  else go('points');
});

document.getElementById('brand').addEventListener('click', (event) => {
  event.preventDefault();
  if (page().name === 'play') window.scrollTo({ top: 0, behavior: 'smooth' });
  else home();
});

// Achievements the history has earned and the save hasn't yet (a save from
// before they existed, or one just merged): earned now, with their toasts.
function catchUp() {
  let earned = [];
  store.update((s) => { earned = earnAchievements(s, { date: localDate() }); });
  earned.forEach((entry) => toast(describe(entry)));
  return earned.length > 0;
}

// Settings changed something (a look, the language, debug points) or a save
// arrived from another device: redraw with it.
function reloadSave() {
  save = store.get();
  catchUp();
  setLang(save.settings.lang);
  applyLook();
  // The page redraws behind the panel; it stays where it was scrolled.
  const scrolled = window.scrollY;
  renderAll();
  window.scrollTo(0, scrolled);
}

document.getElementById('settings-open').addEventListener('click', () => {
  openSettings({ onChange: reloadSave });
});

// With no saved choice, follow the device as it switches.
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (save.settings.scheme === null) {
    applyLook();
    if (view && view.refresh && page().name === 'points') view.refresh();
  }
});

// ── Game data ────────────────────────────────────────────────────────
//
// Loaded once in the background; the play page draws straight away and its
// cards fill in when it arrives.

const game = { data: null, engine: null, glyph: null, error: false };

const ready = loadData().then((data) => {
  store.useEpoch(data.epoch);   // dailies from an earlier epoch become keep-playing games
  game.data = data;
  game.engine = createEngine(data);
  game.glyph = glyphMaker(data.tiles);
}).catch((e) => {
  console.error('[kanjiru] the game data didn’t load', e);
  game.error = true;
});

// A mode can be played once the game screen supports it and it has answers.
const playable = (mode) => !!(mode.playable && game.data && answersFor(game.data, mode).length);

// ── The play page ────────────────────────────────────────────────────

const app = document.getElementById('app');

const pad = (n) => String(n).padStart(2, '0');
function clock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

// The Hard and Guided switches, right on the card: they pick the level of
// the next game, and of one with no moves yet (js/play/session.js).
function levelSwitches(title) {
  const level = LEVEL[currentLevel()];
  const set = (key, on) => {
    const hard = key === 'hard' ? on : level.hard;
    const guided = key === 'guided' ? on : level.guided;
    store.update((s) => { s.settings.level = settingsLevel(hard, guided); });
    renderCards(`level-${key}`);
  };
  return el('div', { class: 'play-level', role: 'group', 'aria-labelledby': 'play-level-title' },
    el('p', { class: 'play-level-title', id: 'play-level-title' }, title),
    ['hard', 'guided'].map((key) => switchRow({
      id: `level-${key}`,
      name: t(`play.${key}.name`),
      tag: t('play.mult', { mult: LEVEL[settingsLevel(key === 'hard', key === 'guided')].points }),
      note: t(`play.${key}.body`),
      on: level[key],
      onChange: (on) => set(key, on)
    })));
}

// One card per listed mode: today's daily first, then keep playing. The
// switches show whenever the next game can still take them.
function playCard(mode) {
  const can = playable(mode);
  const status = can ? dailyStatus(game.data, mode) : null;
  const done = !!(status && status.entry);
  const going = !!(status && status.started && status.guesses > 0);
  const level = status ? t(`level.${status.level}.name`) : null;

  let line;
  if (!can) line = !mode.playable || game.data ? t('play.soon') : game.error ? t('play.loadFailed') : t('play.loading');
  else if (!status) line = t('play.practiceOnly');
  else if (done && status.entry.won) line = t('play.won', { n: status.entry.guesses.length, level });
  else if (done) line = t('play.lost', { level });
  else if (going) line = t('play.going', { n: status.guesses, rows: mode.guesses, level });
  else line = t('play.ready', { rows: mode.guesses });

  const button = (cls, text, path) => el('button', {
    class: `btn ${cls}`, type: 'button', onclick: () => go(path)
  }, text);
  let actions = [];
  if (can && (!status || done)) {
    actions = [button('btn-primary btn-large', t('play.more'), `${mode.id}/practice`),
      status ? button('btn-secondary btn-large', t('play.result'), mode.id) : null];
  } else if (can) {
    actions = [button('btn-primary btn-large', going ? t('play.continue') : t('play.start'), mode.id)];
  }

  return el('section', { class: `card play-card${can ? '' : ' is-soon'}`, 'aria-labelledby': `play-${mode.id}` },
    el('div', { class: 'play-top' },
      el('span', { class: 'play-seal kanji', lang: 'ja', 'aria-hidden': 'true' }, mode.numeral),
      el('div', { class: 'play-heading' },
        el('h2', { class: 'play-title', id: `play-${mode.id}` },
          status ? t('play.daily', { n: status.puzzle }) : t(`mode.${mode.id}.name`)),
        // Where the daily stands, and once it's done, the time to the next.
        el('div', { class: 'play-status' },
          el('p', { class: `play-line${done && status.entry.won ? ' is-won' : ''}` }, line),
          done ? el('p', { class: 'play-countdown' },
            el('span', {}, t('play.nextDaily')),
            el('span', { class: 'countdown-time', 'data-countdown': '' }, clock(msToNextDaily()))) : null))),
    can && !going ? levelSwitches(done || !status ? t('play.levelNext') : t('play.level')) : null,
    actions.length ? el('div', { class: 'play-actions' }, actions) : null);
}

// How a game reads, worked through: the answer is 時間, whose parts in
// writing order are 日 土 寸 門 日. The cells don't show where 時 ends;
// like Wordle's letters, a part is green in its cell and yellow in another.
// It opens the play page, always, as its intro.
const DEMO = {
  rows: [
    [['口', 'miss'], ['日', 'near'], ['寸', 'hit'], ['木', 'miss'], ['月', 'miss']],
    [['日', 'hit'], ['土', 'hit'], ['寸', 'hit'], ['日', 'near'], ['門', 'near']],
    [['日', 'hit'], ['土', 'hit'], ['寸', 'hit'], ['門', 'hit'], ['日', 'hit']]
  ],
  answer: '時間'
};

function howTo() {
  return el('section', { class: 'card howto', 'aria-labelledby': 'howto-title' },
    el('h2', { class: 'howto-title', id: 'howto-title' }, t('howto.title')),
    el('p', { class: 'howto-lead' }, t('howto.lead')),
    el('p', { class: 'howto-text' }, t('howto.body')),
    el('div', { class: 'demo', 'aria-hidden': 'true' },
      DEMO.rows.map((row) => el('div', { class: 'demo-row' },
        el('span', { class: 'demo-slot' }, row.map(([part, state]) => el('span', { class: `tile is-cell is-${state}`, lang: 'ja' }, part))),
        row.every(([, state]) => state === 'hit') ? el('span', { class: 'demo-answer kanji', lang: 'ja' }, DEMO.answer) : null))),
    el('ul', { class: 'demo-legend' },
      ['hit', 'near', 'miss'].map((state) =>
        el('li', {}, el('span', { class: `legend-dot is-${state}-bg` }), t(`howto.${state}`)))));
}

let cards = null;
let playTimer = 0;

// The cards again (the data arrived, or a switch moved), keeping the focus
// on the switch that moved.
function renderCards(focusId = null) {
  const fresh = el('div', { class: 'play-cards' }, MODES.filter((m) => m.listed).map(playCard));
  if (cards && cards.isConnected) cards.replaceWith(fresh);
  cards = fresh;
  if (focusId) {
    const target = fresh.querySelector(`[data-id="${focusId}"]`);
    if (target) target.focus();
  }
  return fresh;
}

function renderPlay() {
  app.replaceChildren(howTo(), renderCards());
  // The countdown ticks; at midnight the new daily takes the card.
  const day = localDate();
  playTimer = setInterval(() => {
    if (localDate() !== day) { renderAll(); return; }
    document.querySelectorAll('[data-countdown]').forEach((node) => { node.textContent = clock(msToNextDaily()); });
  }, 1000);
}

// ── Routes ───────────────────────────────────────────────────────────

let view = null;          // the game or the Points page, while one is open
let wentIn = false;       // reached a page from the play page, so Back can go back

function page() {
  const [first, kind] = location.hash.replace(/^#/, '').split('/');
  if (first === 'points') return { name: 'points' };
  const mode = MODE[first];
  return mode ? { name: 'game', mode, kind: kind === 'practice' ? 'practice' : 'daily' } : { name: 'play' };
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

async function renderGame({ mode, kind }) {
  app.replaceChildren(el('p', { class: 'loading' }, t('play.loading')));
  await ready;
  const now = page();
  if (now.name !== 'game' || now.mode !== mode || now.kind !== kind || view) return;   // moved on meanwhile
  if (!playable(mode)) {
    app.replaceChildren(el('section', { class: 'card game-soon' },
      el('p', {}, game.error ? t('play.loadFailed') : t('game.soon')),
      el('div', { class: 'btn-row' },
        el('button', { class: 'btn btn-secondary', type: 'button', onclick: home }, t('game.home')))));
    return;
  }
  view = openGame(app, {
    data: game.data, engine: game.engine, glyph: game.glyph, mode, kind,
    onHome: home,
    onPractice: () => location.replace(`#${mode.id}/practice`),
    onWallet: renderHeader,
    onReload: renderAll
  });
}

function renderAll() {
  if (view) { view.destroy(); view = null; }
  clearInterval(playTimer);
  const p = page();
  // Before the header, so points won in a game rise from it on the way out.
  document.body.classList.toggle('is-game', p.name === 'game');
  document.body.dataset.page = p.name;
  renderHeader();
  if (p.name === 'game') renderGame(p);
  else if (p.name === 'points') {
    view = openPoints(app, {
      onLook: () => { save = store.get(); applyLook(); },
      onWallet: renderHeader
    });
  } else renderPlay();
}

window.addEventListener('hashchange', () => {
  if (page().name === 'play') wentIn = false;
  renderAll();
  window.scrollTo(0, 0);
});

catchUp();
applyLook();
renderAll();
// The play cards wait for the data.
ready.then(() => { if (page().name === 'play') renderCards(); });
