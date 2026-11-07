/*
 * Achievements. Each test is data: a stat and a threshold, checked by one
 * generic function, so adding an achievement never needs new code unless it
 * needs a new stat.
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
  { id: 'first-win',    name: 'First kanji', desc: 'Solve your first puzzle.',
    test: { stat: 'wins', atLeast: 1 }, reward: { points: 50 } },
  { id: 'streak-7',     name: 'One week',    desc: 'Solve 7 dailies in a row.',
    test: { stat: 'bestStreak', atLeast: 7 } },
  { id: 'streak-30',    name: 'One month',   desc: 'Solve 30 dailies in a row.',
    test: { stat: 'bestStreak', atLeast: 30 } },
  { id: 'sharp-eye',    name: 'Sharp eye',   desc: 'Solve a puzzle in 2 guesses.',
    test: { stat: 'fastestWin', atMost: 2 } },
  { id: 'unaided',      name: 'Unaided',     desc: 'Win without any hints.',
    test: { stat: 'cleanWins', atLeast: 1 }, reward: { points: 50 } },
  { id: 'collector-50', name: 'Collector',   desc: 'Solve 50 different kanji.',
    test: { stat: 'collected', atLeast: 50 }, reward: { power: 'reveal-part' } },
  { id: 'full-set',     name: 'Full set',    desc: 'Solve every daily length in one day.',
    test: { stat: 'fullSetDays', atLeast: 1 }, reward: { points: 200 } }
];
