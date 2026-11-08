/*
 * The share text after a game: the puzzle, the score and an emoji grid,
 * one square per part per guess. Pure, so it can be tested.
 *
 *   Kanjiru 一 #7 3/6 💡
 *   ⬜🟨
 *   🟩⬜⬜
 *   🟩🟩
 *
 * The squares and the hint mark come from rules.js `share`; the words from
 * share.daily / share.practice in js/i18n/*.js.
 */

// One line per guess; the kanji of a longer word are split by spaces.
export function shareGrid(state, marks) {
  return state.guesses
    .map((g) => g.slots.map((slot) => slot.tiles.map((tile) => marks[tile.mark] || marks.miss).join('')).join(' '))
    .join('\n');
}

// t: the i18n t(). share: rules.js share. url: added on its own line, if given.
export function shareText({ state, mode, t, share, url = '' }) {
  const score = state.status === 'won' ? state.guesses.length : 'X';
  const head = t(state.daily ? 'share.daily' : 'share.practice', {
    numeral: mode.numeral,
    puzzle: state.puzzle,
    score: `${score}/${mode.guesses}`,
    hints: state.powers.length ? ` ${share.hints}` : ''
  });
  return [head, shareGrid(state, share.marks), url].filter(Boolean).join('\n');
}
