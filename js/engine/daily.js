/*
 * Which puzzle to play: the daily (the same for everyone, by local date)
 * or a random practice one.
 *
 * The schedule is data/game/answers.json, written by tools/compile_game.py:
 * `epoch` is the date of puzzle 1, and each list (a mode's `answers`) has
 * its answers in a fixed shuffled order. Puzzle n plays answer n (wrapping round when
 * the list runs out). Dates are local, so the daily rolls over at the
 * player's midnight.
 */
const pad = (n) => String(n).padStart(2, '0');

// A Date → its local date, 'YYYY-MM-DD'.
export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// 'YYYY-MM-DD' → a day count, free of time zones and daylight saving.
export function dayIndex(ymd) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

export function addDays(ymd, days) {
  const date = new Date((dayIndex(ymd) + days) * 86400000);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

// The puzzle number on a date: 1 on the epoch. null before it.
export function puzzleNumber(epoch, ymd) {
  const n = dayIndex(ymd) - dayIndex(epoch) + 1;
  return n >= 1 ? n : null;
}

export function puzzleDate(epoch, n) {
  return addDays(epoch, n - 1);
}

// A mode's answers: its list in answers.json (modes.js answers).
export const answersFor = (data, mode) => (data.answers && data.answers[mode.answers || String(mode.length)]) || [];

// The daily for a mode on a date, or null (no dailies in this mode, no
// answers yet, or before the epoch).
export function daily(data, mode, ymd = localDate()) {
  const list = answersFor(data, mode);
  const puzzle = data.epoch ? puzzleNumber(data.epoch, ymd) : null;
  if (!mode.daily || !list.length || !puzzle) return null;
  return {
    modeId: mode.id,
    daily: true,
    puzzle,
    date: ymd,
    answer: list[(puzzle - 1) % list.length],
    seed: `daily:${mode.id}:${puzzle}`
  };
}

// A random practice game, or null with no answers. avoid: answers to skip
// (recent games, today's daily); ignored if it would leave nothing.
export function practice(data, mode, { rng = Math.random, avoid = [] } = {}) {
  const list = answersFor(data, mode);
  if (!list.length) return null;
  const skip = new Set(avoid);
  const open = list.filter((w) => !skip.has(w));
  const pool = open.length ? open : list;
  const answer = pool[Math.floor(rng() * pool.length)];
  return {
    modeId: mode.id,
    daily: false,
    puzzle: null,
    answer,
    seed: `practice:${mode.id}:${Math.floor(rng() * 2 ** 32).toString(36)}`
  };
}

// The answers of a mode's last `count` games in the save's history, newest
// first, for practice's avoid list (rules.js practice.avoidRecent).
export function recentAnswers(history, mode, count) {
  const games = Object.entries((history && history[mode.id]) || {});
  return games
    .filter(([, g]) => g && g.answer)
    .sort(([ka, a], [kb, b]) => String(b.date).localeCompare(String(a.date)) || kb.localeCompare(ka))
    .slice(0, count)
    .map(([, g]) => g.answer);
}

// History keys: a daily is stored under its puzzle number, a practice game
// under "p" + the time it ended, so two devices never clash.
export function historyKey(game, now = Date.now()) {
  return game.daily ? String(game.puzzle) : `p${now.toString(36)}`;
}

export const isDailyKey = (k) => /^\d+$/.test(String(k));

// When a keep-playing game finished (ms), from its history key; 0 for any
// other key (a daily has only its date).
export function keyTime(key) {
  const m = /^p([0-9a-z]+)$/.exec(String(key));
  const ms = m ? parseInt(m[1], 36) : 0;
  return Number.isFinite(ms) ? ms : 0;
}

// Milliseconds until the next local midnight, for the countdown.
export function msToNextDaily(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next - now;
}
