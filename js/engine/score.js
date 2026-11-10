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

// Hands out the answer's parts, each once. take(s, test) finds the first
// unused part of answer slot `s` that `test` accepts, uses it up and
// returns { slot, part }, or null.
function partTaker(answer) {
  const used = answer.map((slot) => slot.parts.map(() => false));
  return (s, test) => {
    const i = answer[s].parts.findIndex((p, j) => !used[s][j] && test(p));
    if (i < 0) return null;
    used[s][i] = true;
    return { slot: s, part: i };
  };
}

// Longer words: a part still grey that is unused in another slot of the
// answer is marked `other`. Slots left to right, parts in order, other
// slots searched left to right.
function markOthers(result, answer, take) {
  if (answer.length <= 1) return;
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

// Greens, then yellows, within each slot, in order: a tile is `hit` when an
// unused part of its slot has the same tile and place, then `near` when
// one has the same tile anywhere.
function markPlaces(result, take) {
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
}

// Scores one kanji guess (levels.js guess: 'kanji').
//   guess, answer: arrays of slots, one per kanji: { kanji, parts: [...] }
// Returns one entry per slot:
//   { kanji, solved, tiles: [{ el, pos, form, mark, of }] }
// `of` is the answer part a mark used up, { slot, part }, or null for miss.
export function scoreGuess(guess, answer) {
  if (guess.length !== answer.length) throw new Error('guess and answer differ in length');
  const take = partTaker(answer);
  const result = guess.map((slot, s) => ({
    kanji: slot.kanji,
    solved: slot.kanji === answer[s].kanji,
    tiles: slot.parts.map((p) => ({ el: p.el, pos: p.pos, form: p.form || p.el, mark: 'miss', of: null }))
  }));

  // 1. Greens, then 2. yellows, within each slot, in stroke order.
  markPlaces(result, take);

  // 3. Parts in another kanji of the word.
  markOthers(result, answer, take);
  return result;
}

// Scores one parts guess (levels.js guess: 'parts'): the tile ids picked
// for each slot's cells.
//   places: each cell's place, per slot (levels.js places), or null.
// With places, a tile takes its cell's place and is marked as in
// scoreGuess: `hit` in its place, `near` elsewhere in its slot. Without,
// a tile is `hit` when its slot has it anywhere (taking that part's
// place), with no `near`. Longer words get `other` as above. A slot is
// solved when all its cells are `hit` and it has as many as the answer's
// kanji has parts; its kanji is then the answer's, otherwise null (the
// engine fills in a real kanji the parts make, if any).
// Same return shape as scoreGuess.
export function scoreParts(picks, answer, places = null) {
  if (picks.length !== answer.length) throw new Error('guess and answer differ in length');
  const take = partTaker(answer);
  const result = picks.map((els, s) => ({
    kanji: null,
    solved: false,
    tiles: els.map((el, i) => ({ el, pos: places ? places[s][i] : null, form: el, mark: 'miss', of: null }))
  }));
  if (places) markPlaces(result, take);
  else {
    result.forEach((slot, s) => slot.tiles.forEach((tile) => {
      const of = take(s, (p) => p.el === tile.el);
      if (of) Object.assign(tile, { mark: 'hit', of, pos: answer[s].parts[of.part].pos });
    }));
  }
  markOthers(result, answer, take);
  result.forEach((slot, s) => {
    slot.solved = slot.tiles.length === answer[s].parts.length && slot.tiles.every((tile) => tile.mark === 'hit');
    if (slot.solved) slot.kanji = answer[s].kanji;
  });
  return result;
}

// Scores one parts guess in order (levels.js order): the answer's parts in
// writing order, one per cell, across all its kanji, like a word's letters
// in Wordle. A tile is `hit` when its cell holds that part in the answer,
// then `near` when an unused cell elsewhere in the word does (cells in
// order). Which kanji a cell belongs to doesn't change its mark.
//   picks: the tile ids per slot, as many as each answer kanji has parts.
// Same return shape as scoreGuess; a tile's `pos` is its cell's place in the
// answer. A slot is solved when all its cells are `hit`.
export function scoreOrder(picks, answer) {
  if (picks.length !== answer.length) throw new Error('guess and answer differ in length');
  const cells = answer.flatMap((slot, s) => slot.parts.map((p, i) => ({ slot: s, part: i, el: p.el, pos: p.pos })));
  const result = picks.map((els) => ({
    kanji: null,
    solved: false,
    tiles: els.map((el) => ({ el, pos: null, form: el, mark: 'miss', of: null }))
  }));
  const tiles = result.flatMap((slot) => slot.tiles);
  if (tiles.length !== cells.length) throw new Error('guess and answer differ in parts');
  const used = cells.map(() => false);
  tiles.forEach((tile, i) => {
    tile.pos = cells[i].pos;
    if (tile.el !== cells[i].el) return;
    used[i] = true;
    Object.assign(tile, { mark: 'hit', of: { slot: cells[i].slot, part: cells[i].part } });
  });
  tiles.forEach((tile) => {
    if (tile.mark !== 'miss') return;
    const j = cells.findIndex((cell, k) => !used[k] && cell.el === tile.el);
    if (j < 0) return;
    used[j] = true;
    Object.assign(tile, { mark: 'near', of: { slot: cells[j].slot, part: cells[j].part } });
  });
  result.forEach((slot, s) => {
    slot.solved = slot.tiles.length === answer[s].parts.length && slot.tiles.every((tile) => tile.mark === 'hit');
    if (slot.solved) slot.kanji = answer[s].kanji;
  });
  return result;
}

// True when every part of every slot is green, i.e. the guess and the answer
// have the same parts in the same places (a look-alike, or the answer).
export function allHit(scored) {
  return scored.every((slot) => slot.tiles.every((tile) => tile.mark === 'hit'));
}

// Which way each yellow tile's part lies in the answer, in writing order
// across the word (the Arrows hint): 'left', 'right', or null for a tile
// that isn't yellow. The part is the one its mark used up (`of`), so the
// arrow and the mark always agree.
//   scored: one guess's slots ({ tiles }); answer: the answer's slots
//   ({ parts }). Returns, per slot, one entry per tile.
export function nearWays(scored, answer) {
  const first = [];
  answer.reduce((n, slot) => { first.push(n); return n + slot.parts.length; }, 0);
  let cell = 0;
  return scored.map((slot) => slot.tiles.map((tile) => {
    const at = cell;
    cell += 1;
    if (tile.mark !== 'near' || !tile.of || first[tile.of.slot] === undefined) return null;
    const to = first[tile.of.slot] + tile.of.part;
    return to < at ? 'left' : to > at ? 'right' : null;
  }));
}

// The kanji's shape: its distinct positions in stroke order, such as
// ['left', 'right'] or ['outer', 'inner']. Used by the layout hint.
export function layoutOf(parts) {
  return [...new Set(parts.map((p) => p.pos))];
}
