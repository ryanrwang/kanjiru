/*
 * Stats, streaks and achievements, worked out from the save's history
 * (js/store.js). Nothing here is stored: the history is the source of truth.
 *
 * History: { [modeId]: { [key]: { date, guesses, won, powers, answer } } }
 * A daily's key is its puzzle number; a practice game's starts with "p".
 * `guesses` is the list of guessed words (a number also works).
 *
 * The rules (docs/DESIGN.md, "Dailies and stats"):
 *   - One streak across modes: days in a row with at least one daily won.
 *     A day not played yet doesn't break it.
 *   - Wins, fastest win, clean wins and kanji collected count practice too.
 *   - Streaks and full-set days count dailies only.
 */
import { ACHIEVEMENTS, ECONOMY } from '../registry.js';
import { dayIndex, isDailyKey } from './daily.js';

const guessCount = (g) => (Array.isArray(g.guesses) ? g.guesses.length : Number(g.guesses) || 0);
const powerCount = (g) => (Array.isArray(g.powers) ? g.powers.length : Number(g.powers) || 0);
const answerOf = (g) => g.answer || (g.won && Array.isArray(g.guesses) ? g.guesses[g.guesses.length - 1] : '');

// Every game as { modeId, key, daily, ...entry }.
export function games(history = {}) {
  return Object.entries(history).flatMap(([modeId, byKey]) =>
    Object.entries(byKey || {}).map(([key, g]) => ({ modeId, key, daily: isDailyKey(key), ...g })));
}

// Longest and current run of consecutive days in a set of 'YYYY-MM-DD'.
export function runs(dates, today) {
  const days = [...new Set([...dates].map(dayIndex))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  days.forEach((d, i) => {
    run = i > 0 && d === days[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  // The current run ends today, or yesterday if today isn't won yet.
  const set = new Set(days);
  let day = dayIndex(today);
  if (!set.has(day)) day -= 1;
  let current = 0;
  while (set.has(day)) { current += 1; day -= 1; }
  return { best, current };
}

// options.today: 'YYYY-MM-DD'. options.dailyModes: the mode ids that have a
// daily now (with answers); a full-set day needs a won daily in each.
export function stats(history, { today, dailyModes = [] } = {}) {
  const all = games(history);
  const wins = all.filter((g) => g.won);
  const dailyWins = wins.filter((g) => g.daily);
  const streak = runs(dailyWins.map((g) => g.date), today);

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
// save's { achievementId: date }).
export function newAchievements(statValues, earned = {}, achievements = ACHIEVEMENTS) {
  return achievements.filter((a) => !earned[a.id] && passes(a.test, statValues[a.test.stat]));
}

// Streak rewards for the lengths a streak passed going from `before` to
// `after` days. Each run pays again when it reaches a length.
export function streakRewards(before, after, economy = ECONOMY) {
  return economy.streakRewards.filter((r) => before < r.days && after >= r.days);
}
