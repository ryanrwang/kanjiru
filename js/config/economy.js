/*
 * Points: earned by playing, spent on powers and skins.
 * Every number lives here so balancing never touches game code.
 * Each mode's `points` multiplier (modes.js) applies on top.
 */
export const ECONOMY = {
  currency: { name: 'Koban', short: 'pts', icon: '🪙' },   // 小判, the old gold coin

  startingPoints: 100,

  // Earned during a game, for each part a guess uncovers for the first time.
  perPart: { hit: 5, near: 2 },

  // Earned on a win: fewer guesses used = more points.
  solve: { base: 50, perUnusedGuess: 15 },

  // Daily puzzles pay more than practice ones.
  dailyMultiplier: 1,
  practiceMultiplier: 0.5,

  // Paid once when a daily streak reaches these lengths.
  streakRewards: [
    { days: 3,   points: 30 },
    { days: 7,   points: 100, power: 'extra-guess' },
    { days: 30,  points: 500, power: 'head-start' },
    { days: 100, points: 2000 }
  ],

  // Random bonus hint after a win; which one is picked by each power's
  // `drop` weight in powers.js.
  drops: {
    chanceOnWin: 0.3,
    chanceOnPerfect: 0.6   // solved with half the rows or fewer
  }
};
