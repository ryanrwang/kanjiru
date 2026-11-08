/*
 * Games in the save: starting, resuming and finishing them.
 *
 *   save.playing[modeId].daily     { start, log, done }   today's daily. It stays once done,
 *                                  so its result shows again until the next daily
 *   save.playing[modeId].practice  { start, log }         the practice game on the go
 *
 * A game is saved as its start and log, and engine.replay() rebuilds it, so
 * a reload or a closed tab carries on where it left off. The start holds
 * the game's level (js/config/levels.js): settings.level when it began.
 * A game with no moves yet follows a level picked since. A finished game goes
 * into history (the source of truth for stats) under daily.js historyKey(),
 * and its points into the wallet.
 *
 * Each function returns a game: { start, state, done, exact }
 *   done   finished and recorded
 *   exact  rebuilt from this device's own log; false when only the history
 *          entry was there (a game from another device), so points and
 *          power order are unknown
 */
import * as store from '../store.js';
import { RULES, LEVEL, DEFAULT_LEVEL } from '../registry.js';
import { daily, practice, recentAnswers, historyKey, localDate } from '../engine/daily.js';

// Rebuilds a saved game, or null when it no longer replays (the data changed).
function rebuild(engine, saved) {
  if (!saved || !saved.start) return null;
  try {
    return engine.replay(saved.start, saved.log || []);
  } catch (e) {
    console.warn('[kanjiru] a saved game no longer replays, so it starts again', e);
    return null;
  }
}

// A finished game from its history entry alone: the guesses, scored again.
function fromHistory(engine, start, entry) {
  let state = engine.newGame(start);
  state = { ...state, rows: Math.max(state.rows, entry.guesses.length) };
  for (const word of entry.guesses) {
    const r = engine.guess(state, word);
    if (r.error) break;
    state = r.state;
  }
  return { ...state, status: entry.won ? 'won' : 'lost', powers: (entry.powers || []).slice() };
}

// The level new games start at: the player's pick, or the default.
export function currentLevel() {
  const id = store.get().settings.level;
  return LEVEL[id] ? id : DEFAULT_LEVEL;
}

// A saved game with no moves yet moves to the level picked since.
function atLevel(saved) {
  const level = currentLevel();
  if (!saved || !saved.start || (saved.log || []).length || saved.start.level === level) return saved;
  return { ...saved, start: { ...saved.start, level } };
}

function keep(modeId, kind, game) {
  store.update((s) => {
    s.playing[modeId] = s.playing[modeId] || {};
    s.playing[modeId][kind] = { start: game.start, log: game.state.log, ...(game.done ? { done: true } : {}) };
  });
}

// Today's daily, or null when the mode has none (no answers yet).
export function openDaily(engine, data, mode, today = localDate()) {
  const base = daily(data, mode, today);
  if (!base) return null;
  const save = store.get();
  const entry = (save.history[mode.id] || {})[String(base.puzzle)];
  const mine = (save.playing[mode.id] || {}).daily;
  const same = mine && mine.start && mine.start.puzzle === base.puzzle && mine.start.answer === base.answer;
  const saved = same ? atLevel(mine) : null;
  const start = { ...base, level: saved ? saved.start.level : currentLevel() };
  const state = saved ? rebuild(engine, { ...saved, start }) : null;

  if (entry) {
    if (state && state.status !== 'playing') return { start, state, done: true, exact: true };
    const old = { ...base, level: entry.level || start.level };
    return { start: old, state: fromHistory(engine, old, entry), done: true, exact: false };
  }
  const game = { start, state: state || engine.newGame(start), done: false, exact: true };
  if (game.state.status !== 'playing') return finish(engine, mode, game).game;
  keep(mode.id, 'daily', game);
  return game;
}

// The practice game on the go, or a new one; null with no answers.
export function openPractice(engine, data, mode) {
  const save = store.get();
  const saved = atLevel((save.playing[mode.id] || {}).practice);
  const state = rebuild(engine, saved);
  if (state && state.status === 'playing') {
    const game = { start: saved.start, state, done: false, exact: true };
    keep(mode.id, 'practice', game);
    return game;
  }

  // Skip recent answers and today's daily, so practice never spoils it.
  const avoid = recentAnswers(save.history, mode, RULES.practice.avoidRecent);
  const today = daily(data, mode);
  if (today) avoid.push(today.answer);
  const base = practice(data, mode, { avoid });
  if (!base) return null;
  const start = { ...base, level: currentLevel() };
  const game = { start, state: engine.newGame(start), done: false, exact: true };
  keep(mode.id, 'practice', game);
  return game;
}

// After every guess or power: save the game on the go.
export function progress(mode, game) {
  keep(mode.id, game.state.daily ? 'daily' : 'practice', game);
}

// The game is over: record it and pay its points, once.
// Returns { game, points, paid }.
export function finish(engine, mode, game) {
  const { start, state } = game;
  const key = historyKey(state);
  const date = state.daily ? start.date : localDate();
  const points = engine.points(state);
  let paid = false;
  store.update((s) => {
    s.history[mode.id] = s.history[mode.id] || {};
    s.playing[mode.id] = s.playing[mode.id] || {};
    if (!s.history[mode.id][key]) {
      s.history[mode.id][key] = engine.record(state, date);
      s.wallet.points += points.total;
      paid = true;
    }
    if (state.daily) s.playing[mode.id].daily = { start, log: state.log, done: true };
    else delete s.playing[mode.id].practice;
  });
  return { game: { ...game, done: true }, points, paid };
}

// Uses up one of a held power.
export function spendPower(powerId) {
  store.update((s) => {
    s.inventory[powerId] = Math.max(0, (s.inventory[powerId] || 0) - 1);
  });
}

// For the start screen: today's daily in a mode, without starting it.
// { puzzle, entry, started, guesses, level } or null. level: the one it
// was played at, the one it's on the go at, or the one it would start at.
export function dailyStatus(data, mode, today = localDate()) {
  const start = daily(data, mode, today);
  if (!start) return null;
  const save = store.get();
  const entry = (save.history[mode.id] || {})[String(start.puzzle)] || null;
  const saved = (save.playing[mode.id] || {}).daily;
  const onTheGo = !entry && saved && saved.start && saved.start.puzzle === start.puzzle && !saved.done;
  const guesses = onTheGo ? (saved.log || []).filter((step) => 'guess' in step).length : 0;
  const level = entry ? entry.level : guesses ? saved.start.level : currentLevel();
  return { puzzle: start.puzzle, entry, started: !!onTheGo, guesses, level: LEVEL[level] ? level : currentLevel() };
}
