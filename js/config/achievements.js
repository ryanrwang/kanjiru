/*
 * Achievements. Each test is data: a stat and a threshold, checked by one
 * generic function, so adding an achievement never needs new code unless it
 * needs a new stat. Names and descriptions live under achievement.<id> in
 * js/i18n/*.js.
 *
 * Stats (worked out from the save's history):
 *   wins          puzzles solved, any mode
 *   bestStreak    longest run of daily puzzles solved
 *   fastestWin    fewest guesses in a win (lower is better → use atMost)
 *   cleanWins     wins with no hints or powers used
 *   collected     different kanji solved
 *   fullSetDays   days with every daily mode solved
 *
 * Fields
 *   id      stable key (never rename); skins.js unlocks refer to it
 *   test    { stat, atLeast } or { stat, atMost }
 *   reward  optional { points, power }
 */
export const ACHIEVEMENTS = [
  { id: 'first-win',    test: { stat: 'wins', atLeast: 1 }, reward: { points: 50 } },
  { id: 'streak-7',     test: { stat: 'bestStreak', atLeast: 7 } },
  { id: 'streak-30',    test: { stat: 'bestStreak', atLeast: 30 } },
  { id: 'sharp-eye',    test: { stat: 'fastestWin', atMost: 2 } },
  { id: 'unaided',      test: { stat: 'cleanWins', atLeast: 1 }, reward: { points: 50 } },
  { id: 'collector-50', test: { stat: 'collected', atLeast: 50 }, reward: { power: 'reveal-part' } },
  { id: 'full-set',     test: { stat: 'fullSetDays', atLeast: 1 }, reward: { points: 200 } }
];
