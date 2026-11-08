import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPalette, buildable, narrow } from '../js/engine/palette.js';
import { seeded } from '../js/engine/random.js';
import { RULES } from '../js/registry.js';
import { fixtureData } from './helpers.js';

const make = (answerKanji, size, seed = 's', rules = RULES, data = fixtureData()) =>
  buildPalette({ data, answerKanji, size, rules, rng: seeded(seed) });

test('the palette holds the answer\'s parts, the always tiles, and decoys up to its size', () => {
  const pal = make(['語'], 20);
  assert.equal(pal.length, 20);
  ['言', '五', '口', ...RULES.palette.always].forEach((id) => assert.ok(pal.includes(id), id));
  assert.equal(new Set(pal).size, pal.length);
});

test('a longer answer has every kanji\'s parts', () => {
  const pal = make(['日', '本', '語'], 12);
  ['日', '木', '一', '言', '五', '口'].forEach((id) => assert.ok(pal.includes(id), id));
});

test('the same seed gives the same palette; another seed, another one', () => {
  assert.deepEqual(make(['明'], 25, 'daily:k1:12'), make(['明'], 25, 'daily:k1:12'));
  assert.notDeepEqual(make(['明'], 25, 'daily:k1:12'), make(['明'], 25, 'daily:k1:13'));
});

test('the palette keeps data/parts.json order (fewest strokes first)', () => {
  const data = fixtureData();
  const order = data.tiles.map((t) => t.id);
  const pal = make(['明'], 30);
  assert.deepEqual(pal, order.filter((id) => pal.includes(id)));
});

test('a size bigger than the tile list gives every tile', () => {
  const data = fixtureData();
  assert.equal(make(['明'], 999).length, data.tiles.length);
});

test('the answer\'s parts stay even when the size is too small for them', () => {
  const pal = make(['語'], 2);
  ['言', '五', '口'].forEach((id) => assert.ok(pal.includes(id)));
});

test('decoy weights come from the rules: weight 0 tiles are never picked while others have weight', () => {
  const data = fixtureData();
  // Only neighbours count: tiles sharing a kanji with 日 (明 → 月, 時 → 土 寸, 間 → 門 …).
  const rules = { ...RULES, palette: { always: [], decoyWeight: { byUses: 0, byNeighbour: 1 } } };
  const pal = make(['日'], 4, 's', rules, data);
  const neighbours = new Set(['月', '土', '寸', '門', '日']);
  pal.forEach((id) => assert.ok(neighbours.has(id), `${id} isn't a neighbour of 日`));
});

test('buildable: every part must be in the palette', () => {
  const data = fixtureData();
  assert.equal(buildable(data, '明', ['日', '月']), true);
  assert.equal(buildable(data, '明', new Set(['日'])), false);
  assert.equal(buildable(data, '鬱', ['日']), false);
});

test('narrow: kanji that can still be made, easiest first, and the tiles that combine', () => {
  const data = fixtureData();
  const pal = ['日', '月', '門', '木', '土', '寸', '一'];
  const all = narrow(data, pal);
  ['明', '日', '月', '間', '時', '林', '森', '本', '未', '末'].forEach((ch) => assert.ok(all.kanji.includes(ch), ch));
  assert.ok(!all.kanji.includes('語'));
  const withSun = narrow(data, pal, ['日']);
  assert.deepEqual([...withSun.kanji].sort(), ['日', '明', '時', '晶', '間'].sort());
  assert.deepEqual([...withSun.tiles].sort(), ['日', '月', '土', '寸', '門'].sort());
  // Easiest first: JLPT level (N5 before N4 …), then frequency.
  const k = data.kanji;
  for (let i = 1; i < all.kanji.length; i += 1) {
    assert.ok((k[all.kanji[i - 1]].jlpt || 0) >= (k[all.kanji[i]].jlpt || 0));
  }
});
