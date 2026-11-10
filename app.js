/*
 * Kanjiru — the pages, and the way between them.
 *
 * The header: the brand on the left, and on the right one row of controls
 * that all look alike (bordered pills): the points, which open the Points
 * page, and the gear, which opens Settings. In a game on the go, End game's
 * flag and the hints held take the points' place. On a page of its own
 * (Points, Settings, About) the controls make way for Close, which goes back
 * where you came from. Away from the play page the brand is a breadcrumb:
 * 漢 › Points, 漢 › Settings, 漢 › Play; 漢 goes home. Everything on a page
 * is built from the catalogues in js/config/ and the text in js/i18n/: add
 * an entry and it appears.
 *
 * Pages (the URL hash, so the phone's back gesture works):
 *   (none)            the play page: How to play (js/howto.js, open for a
 *                     new player, folded after a game), a play card per
 *                     listed mode with the Hard and Guided switches on it,
 *                     every game played (js/history.js), then on a phone a
 *                     folded tip to add it to the home screen
 *   #points           the Points page (js/points.js): the wallet, looks,
 *                     hints and achievements, and buying
 *   #settings         Settings (js/settings.js): language, light or dark,
 *                     moving devices, starting over, debug
 *   #about            the About page (js/about.js): the game, your progress
 *                     and the credits; opened from Settings
 *   #main             a mode's daily (js/play/screen.js), or in a mode
 *                     without dailies (main, now), a random puzzle
 *   #main/practice    another puzzle after the daily ("keep playing")
 *
 * Each page opened from here is a history entry that knows how deep it is
 * (history.state.depth), so 漢 goes back to the play page's own entry and
 * Close goes back one, and the phone's Back does the same.
 */
import { MODES, MODE, LEVEL, ECONOMY, settingsLevel, validate } from './js/registry.js';
import { t, setLang } from './js/i18n.js';
import { el, switchRow } from './js/dom.js';
import * as store from './js/store.js';
import { openSettings } from './js/settings.js';
import { openPoints } from './js/points.js';
import { openAbout } from './js/about.js';
import { tipDue, platform, canPrompt, promptInstall, onInstallChange, installSteps } from './js/install.js';
import { toast, bump } from './js/toast.js';
import { ask } from './js/confirm.js';
import { loadData } from './js/engine/data.js';
import { createEngine } from './js/engine/game.js';
import { answersFor, localDate, msToNextDaily } from './js/engine/daily.js';
import { glyphMaker } from './js/play/glyph.js';
import { openGame, askEnd, forgetEnded } from './js/play/screen.js';
import { dailyStatus, practiceStatus, currentLevel, openPractice, skipPractice, finish } from './js/play/session.js';
import { earnAchievements, describe } from './js/play/rewards.js';
import { howTo } from './js/howto.js';
import { historyCard, PAGE } from './js/history.js';
import { games } from './js/engine/stats.js';

const TOKENS = window.TOKENS;
// Reassigned when a save arrives from another device (js/settings.js).
let save = store.load();
setLang(save.settings.lang);
validate();

const pts = (n) => t('currency.amount', { n });

// ── Header: the points, Settings, and Close ─────────────────────────

const FLAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 22V4"/><path d="M4 4h12l-2 4 2 4H4"/></svg>';
const BULB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>';
const GEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
const CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

function applyLook() {
  TOKENS.applyLook(save.settings.theme, save.settings.scheme);
}

let shownPoints = null;   // the points the header last showed on screen
// Pages other than home, and their names in the breadcrumb.
const CRUMBS = { points: 'points.title', settings: 'settings.title', about: 'about.title', game: 'header.game' };
// Pages of their own: the header has Close in place of its controls.
const PAGES = new Set(['points', 'settings', 'about']);

const byId = (id) => document.getElementById(id);
// The controls stay put between redraws, so the focus stays on them.
const endBtn = byId('end-open');
const hintsBtn = byId('hints-open');
const walletBtn = byId('wallet');
const settingsBtn = byId('settings-open');
const closeBtn = byId('page-close');
const dockBtn = byId('head-points');
let dockShown = null;   // the points the docked total last showed
endBtn.innerHTML = FLAG;
settingsBtn.innerHTML = GEAR;
closeBtn.innerHTML = CLOSE;

function label(node, text) {
  node.title = text;
  node.setAttribute('aria-label', text);
}

function renderHeader() {
  // Home names the game; another page shows where you are: 漢 › Points.
  const brand = byId('brand');
  const p = page();
  const crumb = CRUMBS[p.name] ? t(CRUMBS[p.name]) : null;
  brand.title = t('header.home');
  // Shown as 漢 alone, the link is named for where it goes.
  if (crumb) brand.setAttribute('aria-label', t('header.home'));
  else brand.removeAttribute('aria-label');
  brand.parentElement.querySelectorAll('.crumb').forEach((node) => node.remove());
  document.querySelector('.app-header').classList.toggle('is-crumb', !!crumb);
  // In a game: whether it's on and the hints held (js/play/screen.js head()).
  const game = p.name === 'game' && view && view.head ? view.head() : null;
  if (crumb) {
    brand.after(
      el('span', { class: 'crumb crumb-sep', 'aria-hidden': 'true' }, '›'),
      el('span', { class: 'crumb crumb-page', id: `${p.name}-title` }, crumb));
  }

  // A page of its own: Close alone.
  const own = PAGES.has(p.name);
  closeBtn.hidden = !own;
  label(closeBtn, t('header.close'));
  settingsBtn.hidden = own;
  label(settingsBtn, t('settings.open'));

  // While a game is on, End game (a flag: give up, or a new puzzle; js/play/
  // screen.js endGame) and the hints held, which open the hints modal, take
  // the points' place.
  const hintsOn = !!(game && game.playing);
  endBtn.hidden = !hintsOn;
  label(endBtn, t('game.end.open'));
  hintsBtn.hidden = !hintsOn;
  if (hintsOn) {
    const icon = el('span', { class: 'head-icon is-accent' });
    icon.innerHTML = BULB;
    hintsBtn.replaceChildren(icon, el('span', {}, String(game.held)));
    hintsBtn.title = t('game.powers.title');
    hintsBtn.setAttribute('aria-label', t('header.hints', { n: game.held }));
  }

  // The points open the Points page. A change since they last showed rises
  // from them, once they're on screen (a game on the go shows the hints;
  // while a game loads, neither: it's about to show the hints).
  const hidden = own || hintsOn || (p.name === 'game' && !game);
  walletBtn.hidden = hidden;
  const now = store.points(save);
  const amount = el('span', { class: 'wallet-amount' },
    el('span', { class: 'wallet-icon', 'aria-hidden': 'true' }, ECONOMY.currency.icon), pts(now));
  walletBtn.replaceChildren(amount);
  walletBtn.title = t('header.points');
  walletBtn.setAttribute('aria-label', t('header.wallet', { amount: pts(now) }));
  if (!hidden) {
    if (shownPoints !== null && now !== shownPoints) bump(amount, now - shownPoints);
    shownPoints = now;
  }

  // On the Points page, the points dock beside Close as the wallet scrolls
  // under the header (js/points.js sets how far, --dock). The page says
  // the total itself, so screen readers skip this one.
  const docked = p.name === 'points';
  dockBtn.hidden = !docked;
  const dockAmount = el('span', { class: 'wallet-amount' },
    el('span', { class: 'wallet-icon' }, ECONOMY.currency.icon), pts(now));
  dockBtn.replaceChildren(dockAmount);
  if (docked && dockShown !== null && now !== dockShown) bump(dockAmount, now - dockShown);
  dockShown = docked ? now : null;
}

endBtn.addEventListener('click', () => view && view.endGame && view.endGame());
hintsBtn.addEventListener('click', () => view && view.openHints && view.openHints());
closeBtn.addEventListener('click', closePage);

byId('brand').addEventListener('click', (event) => {
  event.preventDefault();
  if (page().name === 'play') window.scrollTo({ top: 0, behavior: 'smooth' });
  else home();
});

// Links to a page (the points, the gear, About in Settings, the result
// card's links) open it as a new entry that knows its depth (go()).
document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest && event.target.closest('a[href^="#"]');
  const path = link ? link.getAttribute('href').slice(1) : '';
  if (!path || link.target) return;
  event.preventDefault();
  go(path);
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
// arrived from another device: the header takes it; Settings redraws itself.
function settingsChanged() {
  save = store.get();
  catchUp();
  setLang(save.settings.lang);
  applyLook();
  renderHeader();
}

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

const game = { data: null, engine: null, glyph: null, error: false, moved: 0 };

const ready = loadData().then((data) => {
  // First: dailies from an earlier epoch become keep-playing games.
  game.moved = store.useEpoch(data.epoch);
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
// the next game, and of one with no moves yet (js/play/session.js). No title
// over them (2026-11-10, the user asked); screen readers hear "Level".
function levelSwitches() {
  const level = LEVEL[currentLevel()];
  const set = (key, on) => {
    const hard = key === 'hard' ? on : level.hard;
    const guided = key === 'guided' ? on : level.guided;
    store.update((s) => { s.settings.level = settingsLevel(hard, guided); });
    renderCards(`level-${key}`);
  };
  return el('div', { class: 'play-level', role: 'group', 'aria-label': t('play.level') },
    ['hard', 'guided'].map((key) => switchRow({
      id: `level-${key}`,
      name: t(`play.${key}.name`),
      tag: t('play.mult', { mult: LEVEL[settingsLevel(key === 'hard', key === 'guided')].points }),
      note: t(`play.${key}.body`),
      on: level[key],
      onChange: (on) => set(key, on)
    })));
}

// The flag beside Continue (2026-11-10, the user asked): ends the game on
// the go without opening it, with the game's own ask (give up, or a new
// puzzle). Either way the card starts afresh; giving up records the loss,
// pays its parts and names the answer.
async function endFromCard(mode) {
  const on = openPractice(game.engine, game.data, mode);
  if (!on || on.state.status !== 'playing') return;
  const pick = await askEnd(on.state);
  if (!pick || page().name !== 'play') return;
  if (pick === 'new') {
    skipPractice(mode);
    // The next game is drawn now, so it skips this answer.
    openPractice(game.engine, game.data, mode, { skip: on.state.answer });
    toast({ icon: '🏳️', title: t('game.end.skipped') });
  } else {
    const r = game.engine.giveUp(on.state);
    if (r.error) return;
    const done = finish(game.engine, mode, { ...on, state: r.state });
    toast({
      icon: '🏳️', title: t('play.gaveUp', { answer: r.state.answer }),
      body: done.paid && done.points.total > 0 ? t('reward.points', { n: done.points.total }) : ''
    });
    done.rewards.forEach((entry) => toast(describe(entry)));
  }
  renderCards();
  renderHistory();
  renderHeader();
  const next = cards && cards.querySelector('.play-actions .btn-primary');
  if (next) next.focus();
}

function endButton(mode) {
  const node = el('button', {
    class: 'btn btn-secondary btn-large play-end', type: 'button', 'data-id': `end-${mode.id}`,
    title: t('game.end.open'), 'aria-label': t('game.end.open'), onclick: () => endFromCard(mode)
  });
  node.innerHTML = FLAG;
  return node;
}

// One card per listed mode. A mode with a daily offers it first, then keep
// playing; one without (main, since 2026-11-09) starts a random puzzle each
// time, or carries on the one on the go. The switches show whenever the
// next game can still take them.
function playCard(mode) {
  const can = playable(mode);
  const random = can && !mode.daily ? practiceStatus(mode) : null;
  const status = can && !random ? dailyStatus(game.data, mode) : null;
  const done = !!(status && status.entry);
  const going = random ? random.guesses > 0 : !!(status && status.started && status.guesses > 0);
  const level = random || status ? t(`level.${(random || status).level}.name`) : null;

  let line;
  if (!can) line = !mode.playable || game.data ? t('play.soon') : game.error ? t('play.loadFailed') : t('play.loading');
  else if (random) line = going ? t('play.going', { n: random.guesses, rows: mode.guesses, level }) : t('play.readyAny', { rows: mode.guesses });
  else if (!status) line = t('play.practiceOnly');
  else if (done && status.entry.won) line = t('play.won', { n: status.entry.guesses.length, level });
  else if (done) line = t('play.lost', { level });
  else if (going) line = t('play.going', { n: status.guesses, rows: mode.guesses, level });
  else line = t('play.ready', { rows: mode.guesses });

  const button = (cls, text, path) => el('button', {
    class: `btn ${cls}`, type: 'button', onclick: () => go(path)
  }, text);
  let actions = [];
  if (random) {
    // A game on the go can be ended from here: the flag, beside Continue.
    actions = [going ? endButton(mode) : null,
      button('btn-primary btn-large', going ? t('play.continue') : t('play.start'), mode.id)];
  } else if (can && (!status || done)) {
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
    can && !going ? levelSwitches() : null,
    actions.some(Boolean) ? el('div', { class: 'play-actions' }, actions) : null);
}

// Every game played, under the card (js/history.js), PAGE more at a time.
// (Not named history: that's window.history, which the routes use.)
let played = null;
let playedShown = PAGE;

// Deleting a game from history (2026-11-10, the user asked for any game):
// one ask, then it's gone from the list and the stats (store.deleteGame);
// what it paid stays. The focus goes to the game that took its place.
async function deleteFromHistory(g) {
  const pick = await ask({
    icon: '🗑️',
    title: t('history.deleteTitle'),
    body: t('history.deleteBody', { answer: g.answer }),
    options: [{ id: 'delete', name: t('history.deleteYes'), desc: t('history.deleteDesc'), danger: true }]
  });
  if (pick !== 'delete' || page().name !== 'play') return;
  const items = played ? [...played.querySelectorAll('.history-item')] : [];
  const at = items.findIndex((node) => node.dataset.game === `${g.modeId}/${g.key}`);
  store.deleteGame(g.modeId, g.key);
  renderHistory();
  toast({ icon: '🗑️', title: t('history.deleted', { answer: g.answer }) });
  const left = played ? [...played.querySelectorAll('.history-summary')] : [];
  const next = left[Math.min(Math.max(at, 0), left.length - 1)] || (cards && cards.querySelector('.play-actions .btn-primary'));
  if (next) next.focus();
}

function renderHistory() {
  const fresh = historyCard({
    save: store.get(), data: game.data, engine: game.engine, glyph: game.glyph, shown: playedShown,
    onDelete: deleteFromHistory,
    onMore: () => {
      const from = playedShown;
      playedShown += PAGE;
      renderHistory();
      // The first game just listed takes the focus, so the keyboard carries on there.
      const next = played && played.querySelectorAll('.history-item')[from];
      if (next) { next.setAttribute('tabindex', '-1'); next.focus(); }
    }
  });
  if (played && played.isConnected) {
    if (fresh) played.replaceWith(fresh);
    else played.remove();
  } else if (fresh && cards && cards.isConnected) {
    // Above the install tip, which stays at the bottom.
    if (tip && tip.isConnected) tip.before(fresh);
    else app.append(fresh);
  }
  played = fresh;
}

// Adding Kanjiru to the home screen (js/install.js): on a phone, once there's
// progress to keep, at the bottom of the play page, folded to its title.
// Not now puts it off a while.
function installTip() {
  if (!tipDue(store.get())) return null;
  const p = platform();
  const later = () => {
    store.update((s) => { s.settings.installLater = localDate(); });
    renderTip();
    const next = app.querySelector('.play-actions .btn');
    if (next) next.focus();
  };
  return el('details', { class: 'card fold install-tip' },
    el('summary', { class: 'fold-summary' },
      el('h2', { class: 'fold-title', id: 'install-tip-title' }, t('install.title')),
      el('span', { class: 'fold-chevron', 'aria-hidden': 'true' })),
    el('div', { class: 'fold-body install-body' },
      el('p', { class: 'install-why' }, t(`install.why.${p}`)),
      installSteps(p),
      el('p', { class: 'install-note' }, t('install.tipBackup')),
      el('div', { class: 'btn-row' },
        canPrompt() ? el('button', { class: 'btn btn-primary', type: 'button', onclick: () => promptInstall() }, t('install.button')) : null,
        el('button', { class: 'btn btn-ghost', type: 'button', onclick: later }, t('install.later')))));
}

let tip = null;
function renderTip() {
  const fresh = installTip();
  // Opened by the player, it stays open when it redraws.
  if (fresh && tip && tip.open) fresh.open = true;
  if (tip && tip.isConnected) {
    if (fresh) tip.replaceWith(fresh);
    else tip.remove();
  } else if (fresh && cards && cards.isConnected) app.append(fresh);
  tip = fresh;
}

// The install prompt arrived, or the app was installed.
onInstallChange(() => { if (page().name === 'play') renderTip(); });

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

// How to play, always above the card: open until the first game is
// played, then folded to its title (docs/DESIGN.md, "Screens and menus").
let guide = null;

function renderPlay() {
  const save = store.get();
  const newcomer = games(save.history).length === 0;
  if (guide) guide.stop();
  guide = howTo({ open: newcomer, tiles: save.settings.tiles });
  played = null;
  playedShown = PAGE;
  tip = null;
  cards = null;
  app.replaceChildren(guide.node, renderCards());
  renderHistory();
  renderTip();
  // The countdown ticks; at midnight the new daily takes the card.
  const day = localDate();
  playTimer = setInterval(() => {
    if (localDate() !== day) { renderAll(); return; }
    document.querySelectorAll('[data-countdown]').forEach((node) => { node.textContent = clock(msToNextDaily()); });
  }, 1000);
}

// ── Routes ───────────────────────────────────────────────────────────

let view = null;          // the game or a page, while one is open
let routed = null;        // the hash last drawn, so one move draws once

function page() {
  const [first, kind] = location.hash.replace(/^#/, '').split('/');
  if (PAGES.has(first)) return { name: first };
  const mode = MODE[first];
  // A mode without dailies plays a random puzzle at #<mode> too.
  return mode ? { name: 'game', mode, kind: kind === 'practice' || !mode.daily ? 'practice' : 'daily' } : { name: 'play' };
}

// How many pages deep this entry is, counted from the play page's.
const depth = () => (window.history.state && window.history.state.depth) || 0;

function go(path) {
  if (`#${path}` === location.hash) return;
  window.history.pushState({ depth: depth() + 1 }, '', `#${path}`);
  route();
}

// 漢: back to the play page's own entry, so Back doesn't return to the
// page just left. Opened straight at a page, the play page takes its place.
function home() {
  const d = depth();
  if (d > 0) { window.history.go(-d); return; }
  window.history.replaceState(null, '', location.pathname + location.search);
  route();
}

// Close (Points, Settings, About): back where you came from.
function closePage() {
  if (depth() > 0) window.history.back();
  else home();
}

// Draws the page the URL names, once per move (Back fires both popstate
// and hashchange).
function route() {
  if (routed === location.hash) return;
  routed = location.hash;
  renderAll();
  window.scrollTo(0, 0);
  glass();   // at the top now, before the scroll event's frame
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
    onPractice: () => {
      window.history.replaceState(window.history.state, '', `#${mode.id}/practice`);
      route();
    },
    onWallet: () => { if (view) renderHeader(); },
    onReload: renderAll
  });
  renderHeader();
}

// Every page: the header sticks to the top and turns to glass as the page
// slides under it (--glass, 0 to 1, following the scroll; styles.css
// .app-header). The user liked it on the Points page, asked for it on
// Settings, then everywhere, a game too (2026-11-10).
const appHeader = document.querySelector('.app-header');
let glassFrame = 0;
function glass() {
  glassFrame = 0;
  const lead = parseFloat(TOKENS.active().spacing.lg) || 1;
  appHeader.style.setProperty('--glass', Math.min(1, Math.max(0, window.scrollY / lead)).toFixed(3));
}
const onGlassScroll = () => { if (!glassFrame) glassFrame = requestAnimationFrame(glass); };
window.addEventListener('scroll', onGlassScroll, { passive: true });
window.addEventListener('resize', onGlassScroll);

function renderAll() {
  const p = page();
  // A game closing for a page of its own keeps a game just over, so Close
  // comes back to its result; the play page forgets it (js/play/screen.js).
  if (view) { view.destroy({ keep: PAGES.has(p.name) }); view = null; }
  if (p.name === 'play') forgetEnded();
  if (guide) { guide.stop(); guide = null; }
  clearInterval(playTimer);
  // Before the header, which shows the hints in a game on the go.
  document.body.classList.toggle('is-game', p.name === 'game');
  document.body.dataset.page = p.name;
  glass();
  renderHeader();
  if (p.name === 'game') renderGame(p);
  else if (p.name === 'points') {
    view = openPoints(app, {
      onLook: () => { save = store.get(); applyLook(); },
      onWallet: renderHeader
    });
  } else if (p.name === 'settings') view = openSettings(app, { onChange: settingsChanged });
  else if (p.name === 'about') view = openAbout(app);
  else renderPlay();
  routed = location.hash;
}

window.addEventListener('popstate', route);
window.addEventListener('hashchange', route);

catchUp();
applyLook();
renderAll();
// The play cards wait for the data. Dailies it moved to keep playing
// (useEpoch, on the first visit after launch) change the Points page's
// streak and stats, so it redraws too.
ready.then(() => {
  const now = page().name;
  if (now === 'play') { renderCards(); renderHistory(); }
  else if (now === 'points' && game.moved && view) view.refresh();
});
