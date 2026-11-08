/*
 * Scoring: a guess against the answer, part by part. The rules are in
 * docs/DESIGN.md ("Scoring").
 *
 * Parts are { el, pos, form? }: `el` is the palette tile, `pos` its place in
 * the whole kanji, `form` the glyph shown when it differs (氵 for 水). Parts
 * are compared by tile and position, never by form, so variants match.
 *
 * Every mark uses up one part of the answer, so the marks never claim more
 * copies of a part than the answer has (like Wordle's repeated letters).
 */

// Weakest first. Points per mark are in economy.js perPart.
export const MARKS = ['miss', 'other', 'near', 'hit'];

// Scores one guess.
//   guess, answer: arrays of slots, one per kanji: { kanji, parts: [...] }
// Returns one entry per slot:
//   { kanji, solved, tiles: [{ el, pos, form, mark, of }] }
// `of` is the answer part a mark used up, { slot, part }, or null for miss.
export function scoreGuess(guess, answer) {
  if (guess.length !== answer.length) throw new Error('guess and answer differ in length');
  const used = answer.map((slot) => slot.parts.map(() => false));
  const result = guess.map((slot, s) => ({
    kanji: slot.kanji,
    solved: slot.kanji === answer[s].kanji,
    tiles: slot.parts.map((p) => ({ el: p.el, pos: p.pos, form: p.form || p.el, mark: 'miss', of: null }))
  }));

  // Finds the first unused part of answer slot `s` that `test` accepts, and uses it up.
  const take = (s, test) => {
    const i = answer[s].parts.findIndex((p, j) => !used[s][j] && test(p));
    if (i < 0) return null;
    used[s][i] = true;
    return { slot: s, part: i };
  };

  // 1. Greens, then 2. yellows, within each slot, in stroke order.
  result.forEach((slot, s) => {
    slot.tiles.forEach((tile) => {
      const of = take(s, (p) => p.el === tile.el && p.pos === tile.pos);
      if (of) Object.assign(tile, { mark: 'hit', of });
    });
    slot.tiles.forEach((tile) => {
      if (tile.mark !== 'miss') return;
      const of = take(s, (p) => p.el === tile.el);
      if (of) Object.assign(tile, { mark: 'near', of });
    });
  });

  // 3. Longer words: a part still grey that is unused in another slot of
  //    the answer is marked `other`. Slots left to right, parts in stroke
  //    order, other slots searched left to right.
  if (answer.length > 1) {
    result.forEach((slot, s) => {
      slot.tiles.forEach((tile) => {
        if (tile.mark !== 'miss') return;
        for (let t = 0; t < answer.length; t += 1) {
          if (t === s) continue;
          const of = take(t, (p) => p.el === tile.el);
          if (of) { Object.assign(tile, { mark: 'other', of }); break; }
        }
      });
    });
  }
  return result;
}

// True when every part of every slot is green, i.e. the guess and the answer
// have the same parts in the same places (a look-alike, or the answer).
export function allHit(scored) {
  return scored.every((slot) => slot.tiles.every((tile) => tile.mark === 'hit'));
}

// The kanji's shape: its distinct positions in stroke order, such as
// ['left', 'right'] or ['outer', 'inner']. Used by the layout hint.
export function layoutOf(parts) {
  return [...new Set(parts.map((p) => p.pos))];
}
