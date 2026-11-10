/*
 * Stats, streaks and achievements, worked out from the save's history
 * (js/store.js). Nothing here is stored: the history is the source of truth.
 *
 * History: { [modeId]: { [key]: { date, guesses, won, powers, answer } } }
 * A daily's key is its puzzle number; a practice game's starts with "p".
 * `guesses` is the list of guessed words (a number also works).
 *
 * The rules (docs/DESIGN.md, "Dailies and stats"):
 *   - One streak across modes: wins in a row, in the order the games were
 *     played, dailies and keep-playing games alike. A loss ends it.
 *   - Wins, fastest win, clean wins, Hard wins and kanji collected count
 *     every game.
 *   - Full-set days count dailies only.
 *   - Achievements count only games played after their last reset
 *     (save.resets.achievements, Settings): stats(history, { since }).
 */
import { ACHIEVEMENTS, ECONOMY, LEVELS } from '../registry.js';
import { isDailyKey, keyTime, localDate } from './daily.js';

const guessCount = (g) => (Array.isArray(g.guesses) ? g.guesses.length : Number(g.guesses) || 0);
const powerCount = (g) => (Array.isArray(g.powers) ? g.powers.length : Number(g.powers) || 0);
const answerOf = (g) => g.answer || (g.won && Array.isArray(g.guesses) ? g.guesses[g.guesses.length - 1] : '');

// Every game as { modeId, key, daily, ...entry }.
export function games(history = {}) {
  return Object.entries(history).flatMap(([modeId, byKey]) =>
    Object.entries(byKey || {}).map(([key, g]) => ({ modeId, key, daily: isDailyKey(key), ...g })));
}

// Whether a game was played after a moment (ms): a keep-playing game by
// when it finished, a daily (only its date is known) when its day is later.
export function playedAfter(g, since) {
  if (!since) return true;
  const ms = keyTime(g.key);
  return ms ? ms > since : String(g.date) > localDate(new Date(since));
}

// Most and current wins in a row, over every game in the order played: by
// date, then a day's keep-playing games by when they finished (daily.js
// keyTime). A daily has only its date, so it counts as its day's first.
export function winRuns(all) {
  const ordered = all.slice().sort((a, b) =>
    String(a.date).localeCompare(String(b.date)) || keyTime(a.key) - keyTime(b.key));
  let best = 0;
  let run = 0;
  ordered.forEach((g) => {
    run = g.won ? run + 1 : 0;
    best = Math.max(best, run);
  });
  return { best, current: run };
}

// options.dailyModes: the mode ids that have a daily now (with answers); a
// full-set day needs a won daily in each. options.levels: the level
// catalogue, for Hard wins (a level's `hard`). options.since: count only
// games played after this moment (ms), for achievements after a reset.
// options.today is no longer needed (streaks don't hang on dates) but
// callers may still pass it.
export function stats(history, { dailyModes = [], levels = LEVELS, since = null } = {}) {
  const all = games(history).filter((g) => playedAfter(g, since));
  const wins = all.filter((g) => g.won);
  const dailyWins = wins.filter((g) => g.daily);
  const streak = winRuns(all);

  const wonModesByDate = new Map();
  dailyWins.forEach((g) => {
    if (!wonModesByDate.has(g.date)) wonModesByDate.set(g.date, new Set());
    wonModesByDate.get(g.date).add(g.modeId);
  });
  const fullSetDays = dailyModes.length
    ? [...wonModesByDate.values()].filter((set) => dailyModes.every((id) => set.has(id))).length
    : 0;

  const collected = new Set();
  wins.forEach((g) => [...answerOf(g)].forEach((ch) => collected.add(ch)));

  return {
    played: all.length,
    wins: wins.length,
    dailyPlayed: all.filter((g) => g.daily).length,
    dailyWins: dailyWins.length,
    currentStreak: streak.current,
    bestStreak: streak.best,
    fastestWin: wins.length ? Math.min(...wins.map(guessCount)) : null,
    cleanWins: wins.filter((g) => powerCount(g) === 0).length,
    hardWins: wins.filter((g) => levels.some((l) => l.id === g.level && l.hard)).length,
    collected: collected.size,
    fullSetDays
  };
}

// Whether a stat meets an achievement's test ({ stat, atLeast } or { stat, atMost }).
export function passes(test, value) {
  if (value === null || value === undefined) return false;
  if ('atLeast' in test) return value >= test.atLeast;
  if ('atMost' in test) return value <= test.atMost;
  return false;
}

// Achievements now earned that the save doesn't have yet (earned: the
// save's { achievementId: date }). Retired ones are never earned again.
export function newAchievements(statValues, earned = {}, achievements = ACHIEVEMENTS) {
  return achievements.filter((a) => !a.retired && !earned[a.id] && passes(a.test, statValues[a.test.stat]));
}

// How far along an achievement is: { value, goal } for an atLeast test
// (value capped at the goal), or { value: best so far, goal } for atMost.
export function progress(test, statValues) {
  const value = statValues[test.stat];
  if ('atLeast' in test) return { value: Math.min(Number(value) || 0, test.atLeast), goal: test.atLeast };
  return { value: value === undefined ? null : value, goal: test.atMost };
}

// Streak rewards for the lengths a streak passed going from `before` to
// `after` wins in a row. Each run pays again when it reaches a length.
export function streakRewards(before, after, economy = ECONOMY) {
  return economy.streakRewards.filter((r) => before < r.wins && after >= r.wins);
}
