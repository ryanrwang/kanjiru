/*
 * Seeded randomness. A daily puzzle's palette and every power's pick come
 * from a seed, so the same puzzle gives the same result for everyone and a
 * replayed game comes out the same.
 */

// A string → a 32-bit seed (FNV-1a).
export function hashSeed(text) {
  let h = 0x811c9dc5;
  for (const ch of String(text)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// A seed (number or string) → a function returning numbers in [0, 1) (mulberry32).
export function seeded(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A shuffled copy (Fisher–Yates).
export function shuffle(list, rng) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// The index of one item, picked with chance proportional to its weight;
// -1 when nothing has weight.
export function weightedIndex(weights, rng) {
  const total = weights.reduce((sum, w) => sum + Math.max(0, w), 0);
  if (!(total > 0)) return -1;
  let r = rng() * total;
  for (let i = 0; i < weights.length; i += 1) {
    r -= Math.max(0, weights[i]);
    if (r < 0) return i;
  }
  return weights.length - 1;
}
