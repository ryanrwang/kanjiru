import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { buildPalette, buildable, narrow, tilesForPlace, keyCorners } from '../js/engine/palette.js';
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

test('tilesForPlace: the palette tiles some kanji has in that place, in palette order', () => {
  const data = fixtureData();
  const pal = ['日', '月', '門', '木', '土', '寸'];
  assert.deepEqual(tilesForPlace(data, pal, 'outer'), ['門']);
  // 日 is left in 明 and 時, and inside 間; 月 is right in 明.
  assert.ok(tilesForPlace(data, pal, 'left').includes('日'));
  assert.ok(tilesForPlace(data, pal, 'inner').includes('日'));
  assert.ok(!tilesForPlace(data, pal, 'left').includes('門'));
  const right = tilesForPlace(data, pal, 'right');
  ['月', '土', '寸'].forEach((id) => assert.ok(right.includes(id), id));
  assert.deepEqual(right, pal.filter((id) => right.includes(id)));
});

// Keys' corner forms (rules.js palette.corner), on made-up tiles.
const cornerData = (answers = {}) => ({
  kanji: {
    '物': { parts: [{ el: '牛', pos: 'left', form: '牜' }, { el: '勿', pos: 'right' }] },
    '休': { parts: [{ el: '人', pos: 'left', form: '亻' }, { el: '木', pos: 'right' }] }
  },
  tiles: [
    { id: '人', forms: [{ glyph: '人', uses: 24 }, { glyph: '亻', uses: 113 }, { glyph: '𠆢', uses: 40 }] },
    { id: '牛', forms: [{ glyph: '牛', uses: 5 }, { glyph: '⺧', uses: 5 }, { glyph: '牜', uses: 5 }] },
    { id: '匚', forms: [{ glyph: '匚', uses: 8 }, { glyph: '匸', uses: 4 }] },
    { id: '己', forms: [{ glyph: '己', uses: 10 }, { glyph: '巳', uses: 9 }] },
    { id: '竜', forms: [{ glyph: '竜', uses: 2 }, { glyph: '龍', uses: 2 }] },
    { id: '木', forms: [{ glyph: '木', uses: 159 }] },
    { id: '口' }
  ],
  answers
});
const cornerRules = { palette: { corner: { minUses: 5, skip: ['巳'] } } };

test('a key shows one other form in its corner: the one most kanji use', () => {
  const corners = keyCorners(cornerData(), cornerRules);
  assert.equal(corners.get('人'), '亻', 'not 𠆢 as well');
  assert.equal(corners.get('木'), null, 'one form, no corner');
  assert.equal(corners.get('口'), null, 'a tile with no forms listed');
});

test('a form in too few kanji, or one a reader takes for the key, stays off the corner', () => {
  const corners = keyCorners(cornerData(), cornerRules);
  assert.equal(corners.get('匚'), null, '匸 is in only 4');
  assert.equal(corners.get('己'), null, '巳 is skipped');
  assert.equal(corners.get('竜'), null, '龍 is in only 2');
});

test('a tie goes to the form the answers use more', () => {
  assert.equal(keyCorners(cornerData({ main: ['物'] }), cornerRules).get('牛'), '牜');
  assert.equal(keyCorners(cornerData({}), cornerRules).get('牛'), '⺧', 'no answers: the first listed');
});

test('the corners are the same whatever the puzzle', () => {
  const data = cornerData({ main: ['物', '休'] });
  assert.equal(keyCorners(data, cornerRules), keyCorners(data, cornerRules));
});

test('the real rules skip only forms the real tiles have', () => {
  const tiles = JSON.parse(readFileSync(new URL('../data/parts.json', import.meta.url), 'utf8')).tiles;
  const forms = new Set(tiles.flatMap((t) => t.forms.filter((f) => f.glyph !== t.id).map((f) => f.glyph)));
  RULES.palette.corner.skip.forEach((g) => assert.ok(forms.has(g), `${g} is no tile's other form`));
  assert.ok(RULES.palette.corner.minUses >= 1);
});
