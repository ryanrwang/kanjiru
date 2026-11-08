/*
 * The save: one JSON object in localStorage under "kanjiru".
 * tokens.js also reads settings.theme and settings.scheme from it before
 * first paint, so keep those two names.
 *
 * Shape (v2)
 *   v             schema version
 *   settings      { theme, tiles, effect, scheme, lang, level, debug }
 *                 scheme and lang null = follow the device; level: the
 *                 difficulty for new games (js/config/levels.js); debug:
 *                 the answer on the game's keys, and points to add (Settings)
 *   ledger        { [id]: { why, at, pts?, hints?, game?, what? } }   every
 *                 change to points and hints held (js/ledger.js); points()
 *                 and held() sum it. v1 kept wallet { points } and
 *                 inventory { [powerId]: count } instead
 *   unlocked      { [slotId]: [skinId, …] }           skins bought; free skins
 *                 and those an achievement unlocks aren't listed
 *   achievements  { [achievementId]: 'YYYY-MM-DD' }
 *   history       { [modeId]: { [key]: { date, guesses, won, powers, answer, level } } }
 *                 key: the puzzle number for a daily, "p" + a timestamp for
 *                 practice (js/engine/daily.js historyKey), or
 *                 "<epoch>#<number>" for a daily from an earlier epoch,
 *                 kept as a keep-playing game (settleDailies). guesses: the words
 *                 guessed, or for parts guesses the tile ids per kanji;
 *                 powers: power ids used (js/engine/game.js record)
 *   playing       { [modeId]: { daily, practice } }   games on the go, each
 *                 { start, log, done }: engine.replay(start, log) rebuilds it.
 *                 A finished daily stays (done) until the next one, so its
 *                 result can be shown again (js/play/session.js)
 *
 * History and the ledger are the source of truth: streaks and stats are
 * worked out from history, points and hints from the ledger, which also
 * makes merging two devices simple (MERGE, below).
 *
 * Changing the shape: bump VERSION and add a step to MIGRATIONS that turns
 * the old shape into the new one. Adding a key needs no migration, because
 * missing keys are filled in from fresh() on every load.
 */
import { DEFAULT_LOOK } from './config/skins.js';
import { ECONOMY } from './config/economy.js';
import { DEFAULT_LEVEL } from './config/levels.js';
import { puzzleNumber, addDays, isDailyKey } from './engine/daily.js';
import * as ledger from './ledger.js';

export const SAVE_KEY = 'kanjiru';
export const VERSION = 2;

// MIGRATIONS[n] turns a version-n save into version n + 1.
const MIGRATIONS = {
  // v1 → v2: the wallet and hints held become one ledger entry.
  1: (save) => {
    save.ledger = { ...ledger.fromV1(save.wallet, save.inventory), ...(isObject(save.ledger) ? save.ledger : {}) };
    delete save.wallet;
    delete save.inventory;
    return save;
  }
};

export function fresh() {
  const start = {};
  ledger.add(start, 'start', { pts: ECONOMY.startingPoints });
  return {
    v: VERSION,
    settings: { ...DEFAULT_LOOK, scheme: null, lang: null, level: DEFAULT_LEVEL, debug: false },
    ledger: start,
    unlocked: {},
    achievements: {},
    history: {},
    playing: {}
  };
}

const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Adds keys that are missing; never overwrites what the save has. Only the
// settings are filled inside: the other keys hold the player's own records
// (a new save's starting points must never join an old ledger).
function fillDefaults(target, defaults) {
  Object.keys(defaults).forEach((key) => {
    if (!(key in target)) target[key] = defaults[key];
    else if (key === 'settings' && isObject(target[key])) {
      Object.keys(defaults[key]).forEach((k) => { if (!(k in target[key])) target[key][k] = defaults[key][k]; });
    }
  });
  return target;
}

function migrate(save) {
  let v = Number(save.v) || 1;
  while (v < VERSION) {
    if (MIGRATIONS[v]) save = MIGRATIONS[v](save);
    v += 1;
  }
  save.v = VERSION;
  return save;
}

let state = null;
let memoryOnly = false;   // storage blocked (private mode etc.): play on, save nothing
let epoch = null;         // the date of puzzle 1, once the game data says (useEpoch)

export function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch (e) {
    memoryOnly = true;
  }
  let save = null;
  if (raw) {
    try { save = JSON.parse(raw); } catch (e) { save = null; }
  }
  if (!isObject(save)) save = fresh();
  state = fillDefaults(migrate(save), fresh());
  settleDailies(state, epoch);
  askForPersistentStorage();
  return state;
}

// ── Dailies and the epoch ────────────────────────────────────────────
//
// A daily is saved under its puzzle number, counted from the epoch (the date
// of puzzle 1, data/game/answers.json). When the epoch moves (launch day, or
// any reset later), numbers from the old epoch would mark new puzzles as
// played. A daily's own date says which epoch it was played under (its date
// less its number, plus one), so one that doesn't fit the epoch now becomes
// a keep-playing game: its win, kanji and points still count, but it is no
// longer that number's daily and no longer counts toward the streak.
//
//   history  '7' played 2026-11-07, epoch then 2026-11-01  →  '2026-11-01#7'
//   ledger   its entries' game 'main/7'  →  'main/2026-11-01#7', so the new
//            puzzle 7's result card doesn't list the old game's rewards
//   playing  a daily on the go from another epoch is dropped
//
// Every device does the same with the same game, and doing it again changes
// nothing, so saves merge as before. Returns how many things it changed.

const isDate = (x) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
const fitsEpoch = (now, date, n) => isDate(date) && puzzleNumber(now, date) === Number(n);

// The history key for daily n played on `date`, once its epoch has passed.
export function pastKey(date, n) {
  return `${isDate(date) ? addDays(date, 1 - Number(n)) : 'old'}#${n}`;
}

export function settleDailies(save, now) {
  if (!isDate(now) || !isObject(save)) return 0;
  let changed = 0;
  const renamed = {};
  Object.entries(isObject(save.history) ? save.history : {}).forEach(([modeId, games]) => {
    if (!isObject(games)) return;
    Object.keys(games).filter(isDailyKey).forEach((key) => {
      const game = games[key];
      const date = isObject(game) ? game.date : null;
      if (fitsEpoch(now, date, key)) return;
      const to = pastKey(date, key);
      games[to] = isObject(games[to]) && isObject(game) ? betterGame(games[to], game) : game;
      delete games[key];
      renamed[`${modeId}/${key}`] = `${modeId}/${to}`;
      changed += 1;
    });
  });
  if (changed) {
    Object.values(isObject(save.ledger) ? save.ledger : {}).forEach((entry) => {
      if (isObject(entry) && renamed[entry.game]) entry.game = renamed[entry.game];
    });
  }
  Object.values(isObject(save.playing) ? save.playing : {}).forEach((kinds) => {
    const start = isObject(kinds) && isObject(kinds.daily) ? kinds.daily.start : null;
    if (isObject(start) && !fitsEpoch(now, start.date, start.puzzle)) {
      delete kinds.daily;
      changed += 1;
    }
  });
  return changed;
}

// The game data has loaded: its epoch settles this save now, and any save
// received from another device later (readSave). Returns settleDailies()'s count.
export function useEpoch(date) {
  epoch = isDate(date) ? date : null;
  const changed = settleDailies(get(), epoch);
  if (changed) persist();
  return changed;
}

export function get() {
  return state || load();
}

// Change the save and write it: store.update((s) => { s.settings.lang = 'ja'; })
export function update(change) {
  const s = get();
  change(s);
  persist();
  return s;
}

// Points and hints held, summed from the ledger (js/ledger.js).
export function points(save = get()) {
  return ledger.balance(save.ledger).points;
}

export function held(save = get()) {
  return ledger.balance(save.ledger).hints;
}

// Adds a ledger entry to a save, inside update():
//   store.update((s) => store.enter(s, 'buy', { pts: -60, hints: { sweep: 1 } }))
export function enter(save, why, fields) {
  return ledger.add(save.ledger, why, fields);
}

function persist() {
  if (memoryOnly) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    memoryOnly = true;
  }
}

export function isPersistent() {
  return !memoryOnly;
}

// Asks the browser not to clear the save when space runs low. Browsers may
// say no; nothing depends on the answer.
function askForPersistentStorage() {
  try {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  } catch (e) { /* not supported */ }
}

// ── Moving devices ───────────────────────────────────────────────────
//
// A received save either replaces this device's save or merges with it.
// A device with no progress just takes the received save as it is; one with
// progress asks the player first (js/settings.js).

// The whole save as text, for the transfer code or the copy/paste backup.
export function exportSave() {
  return JSON.stringify(get());
}

// Problems are thrown as errors with a code, which the panel turns into
// text: transfer.errors.<code> in js/i18n/*.js.
function saveError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

// Text → a checked, migrated save, without touching this device's save.
export function readSave(text) {
  let save = null;
  try { save = JSON.parse(String(text).trim()); } catch (e) { throw saveError('not-a-save'); }
  if (!isObject(save) || !Number.isInteger(save.v) || save.v < 1) throw saveError('not-a-save');
  if (save.v > VERSION) throw saveError('newer-version');
  save = fillDefaults(migrate(save), fresh());
  const base = fresh();
  const broken = Object.keys(base).some((key) => isObject(base[key]) && !isObject(save[key]));
  if (broken) throw saveError('not-a-save');
  // A device not opened since the epoch moved: settle its dailies first, so
  // they can't land on this epoch's puzzle numbers in a merge.
  settleDailies(save, epoch);
  return save;
}

// True once anything but the looks and language differs from a new save:
// games played, points earned or spent, hints, unlocks, achievements.
export function hasProgress(save = get()) {
  const base = fresh();
  return Object.keys(save).some((key) => {
    if (key === 'v' || key === 'settings') return false;
    if (key === 'ledger') return ledger.hasProgress(save.ledger);
    return JSON.stringify(save[key]) !== JSON.stringify(base[key]);
  });
}

// how: 'replace' (this device's save is thrown away) or 'merge'.
export function importSave(text, how = 'replace') {
  const theirs = readSave(text);
  state = how === 'merge' ? mergeSaves(get(), theirs) : theirs;
  persist();
  return state;
}

// ── Merging ──────────────────────────────────────────────────────────
//
// One rule per top-level key of the save. Every rule is safe to repeat:
// merging the same save twice, or sending saves back and forth, never
// creates points, hints or games. A new key in fresh() needs a rule here;
// validate() in js/registry.js warns when one is missing.

const count = (x) => {
  if (Array.isArray(x)) return x.length;
  if (isObject(x)) return Object.values(x).reduce((n, v) => n + (Number(v) || 0), 0);
  return Number(x) || 0;
};

// The same puzzle played on both devices: keep the better result.
function betterGame(a, b) {
  if (!!a.won !== !!b.won) return a.won ? a : b;
  if (count(a.guesses) !== count(b.guesses)) return count(a.guesses) < count(b.guesses) ? a : b;
  return count(a.powers) <= count(b.powers) ? a : b;
}

// Applies pick(mine, theirs) to every key found in either object.
function eachKey(pick) {
  return (mine = {}, theirs = {}) => {
    const out = {};
    new Set([...Object.keys(mine), ...Object.keys(theirs)]).forEach((key) => {
      if (!(key in theirs)) out[key] = mine[key];
      else if (!(key in mine)) out[key] = theirs[key];
      else out[key] = pick(mine[key], theirs[key]);
    });
    return out;
  };
}

const list = (x) => (Array.isArray(x) ? x : []);

export const MERGE = {
  // Looks and language belong to the device in your hand.
  settings: (mine) => mine,
  // Every entry from both, once each, so points and hints add up
  // (js/ledger.js mergeLedgers).
  ledger: ledger.mergeLedgers,
  // Skins bought on either device, in the order they were bought here.
  unlocked: eachKey((a, b) => [...new Set([...list(a), ...list(b)])]),
  // Achievements from both, with the earlier date.
  achievements: eachKey((a, b) => (String(b) < String(a) ? b : a)),
  // Games from both; streaks and stats are worked out again from these.
  history: eachKey((mineMode, theirMode) => eachKey(betterGame)(mineMode, theirMode)),
  // Games on the go belong to the device in your hand. A daily the other
  // device finished is in history, which wins over one on the go here.
  playing: (mine) => mine
};

export function mergeSaves(mine, theirs) {
  const merged = JSON.parse(JSON.stringify(mine));
  Object.entries(MERGE).forEach(([key, rule]) => {
    merged[key] = JSON.parse(JSON.stringify(rule(mine[key], theirs[key])));
  });
  merged.v = VERSION;
  return fillDefaults(merged, fresh());
}

// Keys of the save that MERGE has no rule for (validate() reports them).
export function missingMergeRules() {
  return Object.keys(fresh()).filter((key) => key !== 'v' && !(key in MERGE));
}
