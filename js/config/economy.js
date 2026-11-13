/*
 * Points: earned by playing, spent on powers and skins.
 * Every number lives here so balancing never touches game code.
 * Each mode's `points` multiplier (modes.js) applies on top.
 */
export const ECONOMY = {
  // The points are 小判 (koban), the old gold coin: its name and "{n} pts"
  // wording are in js/i18n/*.js, and its picture, a gold coin stamped 金,
  // is drawn in js/coin.js, so it looks the same on every phone (it was the
  // 🪙 emoji until 2026-11-11).

  // Shown on the toasts and the result card for each kind of reward.
  rewardIcons: { streak: '🔥', drop: '🎁', achievement: '🏅' },

  // A new save's points: a welcome bonus, enough for one hint (Layout, 60;
  // powers.js), which the first game's tip points to (2026-11-10, the user
  // asked; it was 150). Each device starts with these, and a merge adds
  // both devices' points (js/ledger.js), so a device that never played adds
  // nothing.
  startingPoints: 60,

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
    { wins: 10, points: 500, power: 'reveal-part' },
    { wins: 25, points: 2000 }
  ],

  // Random bonus hint after a quick solve only (2026-11-13, the user asked:
  // the 30% on any win went, so a drop feels earned and the result card
  // celebrates it). Which one is picked by each power's `drop` weight in
  // powers.js, skipping powers already held at their limit.
  drops: {
    chanceOnPerfect: 0.6,  // a quick solve: ...
    perfectShare: 0.5      // ...using this share of the mode's rows or fewer
  }
};
