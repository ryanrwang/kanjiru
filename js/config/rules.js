/*
 * Game rules that aren't points, modes or powers. The engine (js/engine/)
 * reads them from here, so tuning the game never touches its code.
 *
 * The daily schedule (its start date and the answer order) is data, not
 * config: tools/compile_game.py writes it to data/game/answers.json.
 */
export const RULES = {
  // The parts palette for one puzzle: every part of the answer, these
  // tiles, then decoys drawn at random until the mode's `palette` size
  // (modes.js) is reached. A daily's palette comes from its puzzle number,
  // so everyone gets the same one.
  palette: {
    // Always shown: the single strokes, which fill gaps in many kanji.
    always: ['一', '丨', '丶', '丿', '乙', '亅'],
    // A decoy's chance = byUses × the jōyō kanji it appears in
    //                  + byNeighbour × the kanji it shares with an answer part.
    // Neighbours make more real kanji buildable from the palette.
    decoyWeight: { byUses: 1, byNeighbour: 20 }
  },

  // A guess must be built only from the palette's parts.
  guessFromPalette: true,

  // Practice answers skip the most recent ones played in that mode.
  practice: { avoidRecent: 30 },

  // The play page's tip to add Kanjiru to the home screen (js/install.js):
  // on a phone, once there's progress to lose. "Not now" puts it off this
  // many days. iOS clears an unvisited site's saves after 7.
  installTip: { laterDays: 14 },

  // The share text after a game: one square per part, per guess, and a
  // mark when the game used a hint or power (the free meaning doesn't count).
  // show: false hides it on the result card for now (2026-11-08).
  share: {
    show: false,
    marks: { hit: '🟩', near: '🟨', other: '🟨', miss: '⬜' },
    hints: '💡'
  }
};
