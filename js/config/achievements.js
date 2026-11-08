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
 *   hardWins      wins with Hard on (a level with hard: true, levels.js)
 *   fullSetDays   days with every daily mode solved
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
  { id: 'unaided',      test: { stat: 'cleanWins', atLeast: 1 }, reward: { points: 50 } },
  { id: 'hard-win',     test: { stat: 'hardWins', atLeast: 1 }, reward: { points: 200 } },
  { id: 'sharp-eye',    test: { stat: 'fastestWin', atMost: 2 } },
  { id: 'streak-7',     test: { stat: 'bestStreak', atLeast: 7 } },
  { id: 'streak-30',    test: { stat: 'bestStreak', atLeast: 30 } },
  { id: 'collector-50', test: { stat: 'collected', atLeast: 50 }, reward: { power: 'reveal-part' } },
  // With one daily mode, a full set was just a daily won (step 5): Hard win
  // took its place.
  { id: 'full-set',     test: { stat: 'fullSetDays', atLeast: 1 }, reward: { points: 200 }, retired: true }
];
