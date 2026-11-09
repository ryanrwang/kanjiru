/*
 * Points: earned by playing, spent on powers and skins.
 * Every number lives here so balancing never touches game code.
 * Each mode's `points` multiplier (modes.js) applies on top.
 */
export const ECONOMY = {
  // 小判, the old gold coin. Its name and "{n} pts" wording are in js/i18n/*.js.
  currency: { icon: '🪙' },

  // Shown on the toasts and the result card for each kind of reward.
  rewardIcons: { streak: '🔥', drop: '🎁', achievement: '🏅' },

  // A new save's points. Each device starts with these, and a merge adds
  // both devices' points (js/ledger.js), so a device that never played adds
  // nothing.
  startingPoints: 150,

  // Debug mode (Settings) adds this many each tap, as a 'debug' ledger
  // entry, so test points can be told apart from earned ones.
  debugPoints: 500,

  // Earned during a game, for each part of the answer a guess marks for the
  // first time. A part that goes from one mark to a better one later pays
  // the difference, so each part pays at most `hit`. Parts a power reveals
  // pay nothing. Marks: hit (green), near (yellow), other (in another kanji
  // of the word, 2+ kanji modes).
  perPart: { hit: 8, near: 3, other: 2 },

  // Earned on a win: fewer guesses used = more points. Unused rows are
  // counted from the mode's own rows, so an extra-guess row never pays.
  solve: { base: 80, perUnusedGuess: 20 },

  // The daily, and every puzzle played after it ("keep playing"). They pay
  // the same: more puzzles earn normally, with no limit.
  dailyMultiplier: 1,
  practiceMultiplier: 1,

  // Paid each time a streak of wins in a row reaches these lengths. A loss
  // ends the streak, and the next one pays again.
  streakRewards: [
    { wins: 3,  points: 30 },
    { wins: 5,  points: 100, power: 'extra-guess' },
    { wins: 10, points: 500, power: 'head-start' },
    { wins: 25, points: 2000 }
  ],

  // Random bonus hint after a win; which one is picked by each power's
  // `drop` weight in powers.js, skipping powers already held at their limit.
  drops: {
    chanceOnWin: 0.3,
    chanceOnPerfect: 0.6,  // a perfect solve: ...
    perfectShare: 0.5      // ...using this share of the mode's rows or fewer
  }
};
