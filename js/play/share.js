/*
 * The share text after a game: the puzzle, the score and an emoji grid,
 * one square per part per guess. Pure, so it can be tested.
 *
 *   Kanjiru 一 #7 Normal 3/6 💡
 *   ⬜🟨
 *   🟩⬜⬜
 *   🟩🟩
 *
 * The squares and the hint mark come from rules.js `share`; the words from
 * share.daily / share.practice in js/i18n/*.js.
 */

// One line per guess. split: a space between the kanji of a longer word
// (only where the board showed them apart: levels.js showSplit).
export function shareGrid(state, marks, split = true) {
  return state.guesses
    .map((g) => g.slots.map((slot) => slot.tiles.map((tile) => marks[tile.mark] || marks.miss).join('')).join(split ? ' ' : ''))
    .join('\n');
}

// t: the i18n t(). share: rules.js share. url: added on its own line, if given.
// The level's name comes from t('level.<id>.name').
export function shareText({ state, mode, t, share, url = '', split = true }) {
  const score = state.status === 'won' ? state.guesses.length : 'X';
  const head = t(state.daily ? 'share.daily' : 'share.practice', {
    numeral: mode.numeral,
    puzzle: state.puzzle,
    level: t(`level.${state.level}.name`),
    score: `${score}/${mode.guesses}`,
    hints: state.powers.length ? ` ${share.hints}` : ''
  });
  return [head, shareGrid(state, share.marks, split), url].filter(Boolean).join('\n');
}
