/*
 * Achievements. Each test is data: a stat and a threshold, checked by one
 * generic function, so adding an achievement never needs new code unless it
 * needs a new stat. Names and descriptions live under achievement.<id> in
 * js/i18n/*.js.
 *
 * Stats (worked out from the save's history):
 *   wins          puzzles solved, any mode
 *   bestStreak    most wins in a row (a loss ends a run)
 *   fastestWin    fewest guesses in a win (lower is better → use atMost)
 *   cleanWins     wins with no hints or powers used
 *   collected     different kanji solved
 *   hardWins      wins with Hard on (a level with hard: true, levels.js)
 *   fullSetDays   days with every daily mode solved (no mode has one now)
 *
 * Fields
 *   id       stable key (never rename); skins.js unlocks refer to it
 *   test     { stat, atLeast } or { stat, atMost }
 *   reward   optional { points, power }: paid once, when it's earned. A
 *            power reward may take you past the power's hold limit
 *   retired  true: no longer earned or listed; saves that have it keep it
 *
 * Checked after every game and when the page opens (js/play/rewards.js), so
 * a save from before an achievement existed earns it on its next visit.
 */
export const ACHIEVEMENTS = [
  { id: 'first-win',    test: { stat: 'wins', atLeast: 1 }, reward: { points: 50 } },
  // The eighth, for an even 8 at launch (2026-11-10, the user asked).
  { id: 'regular',      test: { stat: 'wins', atLeast: 25 }, reward: { points: 150 } },
  { id: 'unaided',      test: { stat: 'cleanWins', atLeast: 1 }, reward: { points: 50 } },
  { id: 'hard-win',     test: { stat: 'hardWins', atLeast: 1 }, reward: { points: 200 } },
  { id: 'sharp-eye',    test: { stat: 'fastestWin', atMost: 2 } },
  // Days in a row with a daily won, until dailies went (2026-11-09): wins
  // in a row took their place.
  { id: 'streak-7',     test: { stat: 'bestStreak', atLeast: 7 }, retired: true },
  { id: 'streak-30',    test: { stat: 'bestStreak', atLeast: 30 }, retired: true },
  { id: 'win-run-5',    test: { stat: 'bestStreak', atLeast: 5 } },
  { id: 'win-run-10',   test: { stat: 'bestStreak', atLeast: 10 } },
  { id: 'collector-50', test: { stat: 'collected', atLeast: 50 }, reward: { power: 'reveal-part' } },
  // With one daily mode, a full set was just a daily won (step 5): Hard win
  // took its place.
  { id: 'full-set',     test: { stat: 'fullSetDays', atLeast: 1 }, reward: { points: 200 }, retired: true }
];
