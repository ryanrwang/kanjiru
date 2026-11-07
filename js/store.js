/*
 * The save: one JSON object in localStorage under "kanjiru".
 * tokens.js also reads settings.theme and settings.scheme from it before
 * first paint, so keep those two names.
 *
 * Shape (v1)
 *   v             schema version
 *   settings      { theme, tiles, effect, scheme, lang }
 *                 scheme and lang null = follow the device
 *   wallet        { points }
 *   inventory     { [powerId]: count }
 *   unlocked      { [slotId]: [skinId, …] }           free skins aren't listed
 *   achievements  { [achievementId]: 'YYYY-MM-DD' }
 *   history       { [modeId]: { [puzzleNo]: { date, guesses, won, powers } } }
 *
 * History is the source of truth: streaks and stats are worked out from it,
 * which also makes merging two devices simple later.
 *
 * Changing the shape: bump VERSION and add a step to MIGRATIONS that turns
 * the old shape into the new one. Adding a key needs no migration, because
 * missing keys are filled in from fresh() on every load.
 */
import { DEFAULT_LOOK } from './config/skins.js';
import { ECONOMY } from './config/economy.js';

export const SAVE_KEY = 'kanjiru';
export const VERSION = 1;

// MIGRATIONS[n] turns a version-n save into version n + 1.
const MIGRATIONS = {
  // 1: (save) => { /* reshape */ return save; },
};

export function fresh() {
  return {
    v: VERSION,
    settings: { ...DEFAULT_LOOK, scheme: null, lang: null },
    wallet: { points: ECONOMY.startingPoints },
    inventory: {},
    unlocked: {},
    achievements: {},
    history: {}
  };
}

const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Adds keys that are missing; never overwrites what the save has.
function fillDefaults(target, defaults) {
  Object.keys(defaults).forEach((key) => {
    if (!(key in target)) target[key] = defaults[key];
    else if (isObject(target[key]) && isObject(defaults[key])) fillDefaults(target[key], defaults[key]);
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
  askForPersistentStorage();
  return state;
}

export function get() {
  return state || load();
}

// Change the save and write it: store.update((s) => { s.wallet.points += 10; })
export function update(change) {
  const s = get();
  change(s);
  persist();
  return s;
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

// For moving to another device: the whole save as text, and back.
export function exportSave() {
  return JSON.stringify(get());
}

export function importSave(text) {
  const save = JSON.parse(text);
  if (!isObject(save) || !save.v) throw new Error('That isn’t a Kanjiru save.');
  if (save.v > VERSION) throw new Error('That save is from a newer version. Reload and try again.');
  state = fillDefaults(migrate(save), fresh());
  persist();
  return state;
}
