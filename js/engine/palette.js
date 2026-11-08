/*
 * The parts palette for one puzzle: a subset of data/parts.json's tiles.
 *
 * It holds every part of the answer, the tiles in rules.js palette.always,
 * and random decoys up to the mode's `palette` size. Guesses may only use
 * its parts (rules.js guessFromPalette), so the palette also decides which
 * kanji can be guessed.
 */
import { weightedIndex } from './random.js';

// Per data set: each kanji's set of tiles, worked out once.
const tileSets = new WeakMap();
export function tilesOfKanji(data) {
  if (!tileSets.has(data)) {
    const map = new Map();
    Object.entries(data.kanji).forEach(([ch, k]) => map.set(ch, new Set(k.parts.map((p) => p.el))));
    tileSets.set(data, map);
  }
  return tileSets.get(data);
}

// answerKanji: the answer's kanji, e.g. ['日', '本'].
// Returns tile ids in data.tiles order (fewest strokes first).
export function buildPalette({ data, answerKanji, size, rules, rng }) {
  const sets = tilesOfKanji(data);
  const known = new Set(data.tiles.map((t) => t.id));
  const chosen = new Set();
  answerKanji.forEach((ch) => (sets.get(ch) || []).forEach((el) => chosen.add(el)));
  (rules.palette.always || []).forEach((id) => { if (known.has(id)) chosen.add(id); });

  // Neighbours: how many kanji each tile shares with a part of the answer.
  const answerTiles = new Set(chosen);
  (rules.palette.always || []).forEach((id) => {
    if (!answerKanji.some((ch) => (sets.get(ch) || new Set()).has(id))) answerTiles.delete(id);
  });
  const neighbours = new Map();
  sets.forEach((els) => {
    if (![...els].some((el) => answerTiles.has(el))) return;
    els.forEach((el) => neighbours.set(el, (neighbours.get(el) || 0) + 1));
  });

  const weight = rules.palette.decoyWeight || {};
  const pool = data.tiles.filter((t) => !chosen.has(t.id));
  const weights = pool.map((t) =>
    (weight.byUses || 0) * (t.uses || 0) + (weight.byNeighbour || 0) * (neighbours.get(t.id) || 0));
  while (chosen.size < size && pool.length) {
    let i = weightedIndex(weights, rng);
    if (i < 0) i = Math.floor(rng() * pool.length);   // nothing weighted: plain random
    chosen.add(pool[i].id);
    pool.splice(i, 1);
    weights.splice(i, 1);
  }
  return data.tiles.filter((t) => chosen.has(t.id)).map((t) => t.id);
}

// True when every part of the kanji is in the palette (a Set or an array).
export function buildable(data, ch, palette) {
  const set = palette instanceof Set ? palette : new Set(palette);
  const els = tilesOfKanji(data).get(ch);
  return !!els && [...els].every((el) => set.has(el));
}

// Easiest first: JLPT N5 before N1 before none, then more frequent, then fewer strokes.
export function easiestFirst(data) {
  const k = (ch) => data.kanji[ch];
  return (a, b) => ((k(b).jlpt || 0) - (k(a).jlpt || 0))
    || ((k(a).freq || Infinity) - (k(b).freq || Infinity) || 0)
    || (k(a).strokes - k(b).strokes)
    || (a < b ? -1 : a > b ? 1 : 0);
}

// For the palette picker: given the tiles picked so far, the kanji that can
// still be made (buildable and holding every picked tile), easiest first,
// and the tiles that still combine with the picks (the rest grey out).
export function narrow(data, palette, picked = []) {
  const set = new Set(palette);
  const sets = tilesOfKanji(data);
  const kanji = [];
  const tiles = new Set();
  sets.forEach((els, ch) => {
    if (![...els].every((el) => set.has(el))) return;
    if (!picked.every((el) => els.has(el))) return;
    kanji.push(ch);
    els.forEach((el) => tiles.add(el));
  });
  kanji.sort(easiestFirst(data));
  return { kanji, tiles };
}
