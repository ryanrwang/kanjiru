/*
 * The ledger (js/ledger.js) and the save around it (js/store.js): points
 * and hints summed from entries, v1 saves moved over, and merges that add
 * up exactly and never create points.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as ledger from '../js/ledger.js';
import { fresh, readSave, mergeSaves, hasProgress, points, held, VERSION, MERGE } from '../js/store.js';
import { ECONOMY } from '../js/registry.js';

const clone = (x) => JSON.parse(JSON.stringify(x));

test('balance: points and hints are the sum of the entries, never below 0', () => {
  const book = {};
  ledger.add(book, 'start', { pts: 150 });
  ledger.add(book, 'game', { pts: 120, game: 'main/3' });
  ledger.add(book, 'buy', { pts: -60, hints: { sweep: 1 }, what: 'sweep' });
  ledger.add(book, 'drop', { hints: { meaning: 1 } });
  ledger.add(book, 'use', { hints: { sweep: -1 } });
  assert.deepEqual(ledger.balance(book), { points: 210, hints: { meaning: 1 } });
  ledger.add(book, 'buy', { pts: -500 });
  assert.equal(ledger.balance(book).points, 0);
  assert.deepEqual(ledger.balance({}), { points: 0, hints: {} });
});

test('balance: a retired power\'s hints count as the one it became', () => {
  const becomes = { 'head-start': { id: 'reveal-part', n: 2 }, reading: { id: 'meaning', n: 1 } };
  const book = {};
  ledger.add(book, 'buy', { hints: { 'head-start': 1 } });
  ledger.add(book, 'drop', { hints: { reading: 1, meaning: 1 } });
  assert.deepEqual(ledger.balance(book, becomes).hints, { 'reveal-part': 2, meaning: 2 });
  // Spending the new one uses up what the old ones were worth.
  ledger.add(book, 'use', { hints: { 'reveal-part': -1 } });
  assert.deepEqual(ledger.balance(book, becomes).hints, { 'reveal-part': 1, meaning: 2 });
  ledger.add(book, 'use', { hints: { 'reveal-part': -1 } });
  assert.deepEqual(ledger.balance(book, becomes).hints, { meaning: 2 });
  // Without the map, the raw counts.
  assert.deepEqual(ledger.balance(book).hints, { 'head-start': 1, reading: 1, meaning: 1 });
});

test('held: the real catalogue folds Head start and Reading', () => {
  const save = fresh();
  ledger.add(save.ledger, 'buy', { hints: { 'head-start': 1, reading: 2 } });
  assert.deepEqual(held(save), { 'reveal-part': 2, meaning: 2 });
});

test('add: empty fields stay out, ids differ', () => {
  const book = {};
  const a = ledger.add(book, 'game', { pts: 0, hints: { sweep: 0 }, game: 'main/1', at: '2026-11-08' });
  const b = ledger.add(book, 'game', { pts: 5 });
  assert.notEqual(a.id, b.id);
  assert.deepEqual(book[a.id], { why: 'game', at: '2026-11-08', game: 'main/1' });
  assert.equal(Object.keys(book).length, 2);
});

test('rewardsOf: what a game paid besides its own points', () => {
  const book = {};
  ledger.add(book, 'game', { pts: 100, game: 'main/7' });
  ledger.add(book, 'drop', { hints: { sweep: 1 }, game: 'main/7' });
  ledger.add(book, 'achievement', { pts: 50, game: 'main/7', what: 'first-win' });
  ledger.add(book, 'drop', { hints: { layout: 1 }, game: 'main/8' });
  assert.deepEqual(ledger.rewardsOf(book, 'main/7').map((e) => e.why), ['drop', 'achievement']);
});

test('a new save has only its starting points, and no progress', () => {
  const save = fresh();
  assert.equal(save.v, VERSION);
  assert.equal(points(save), ECONOMY.startingPoints);
  assert.deepEqual(held(save), {});
  assert.equal(hasProgress(save), false);
  assert.ok(!('wallet' in save) && !('inventory' in save));
});

test('a save from before the launch (v1 or v2) starts afresh, keeping its language and light or dark', () => {
  const v1 = { v: 1, settings: { theme: 'ai', lang: 'ja', scheme: 'dark' }, wallet: { points: 420 }, inventory: { sweep: 2, layout: 0 }, history: {}, playing: {}, unlocked: {}, achievements: {} };
  const v2 = fresh();
  v2.v = 2;
  v2.settings = { ...v2.settings, theme: 'ai', debug: true, langAsked: undefined, lang: null };
  ledger.add(v2.ledger, 'debug', { pts: 500 });
  v2.history = { main: { p1: { date: '2026-11-09', guesses: [], won: true, powers: [] } } };
  v2.achievements = { 'first-win': '2026-11-09' };
  [v1, v2].forEach((old) => {
    const save = readSave(JSON.stringify(old));
    assert.equal(save.v, VERSION);
    assert.equal(points(save), ECONOMY.startingPoints);
    assert.deepEqual(held(save), {});
    assert.equal(hasProgress(save), false);
    assert.ok(!('wallet' in save) && !('inventory' in save));
    assert.equal(save.settings.theme, fresh().settings.theme, 'looks start afresh');
    assert.equal(save.settings.debug, false);
  });
  const fromV1 = readSave(JSON.stringify(v1));
  assert.equal(fromV1.settings.lang, 'ja');
  assert.equal(fromV1.settings.scheme, 'dark');
  assert.equal(fromV1.settings.langAsked, true, 'a language picked counts as asked');
  assert.equal(readSave(JSON.stringify(v2)).settings.langAsked, false, 'following the device: asked on the next visit');
});

test('loading never adds starting points to a ledger that has entries', () => {
  const save = fresh();
  ledger.add(save.ledger, 'game', { pts: 30 });
  const again = readSave(JSON.stringify(save));
  assert.equal(Object.keys(again.ledger).length, 2);
  assert.equal(points(again), ECONOMY.startingPoints + 30);
});

test('merge: both devices\' points and hints add up, and merging twice changes nothing', () => {
  const pc = fresh();
  const phone = fresh();
  ledger.add(pc.ledger, 'game', { pts: 100 });
  ledger.add(pc.ledger, 'buy', { pts: -40, hints: { sweep: 1 } });
  ledger.add(phone.ledger, 'game', { pts: 70 });
  ledger.add(phone.ledger, 'drop', { hints: { sweep: 1 } });
  const merged = mergeSaves(pc, phone);
  assert.equal(points(merged), points(pc) + points(phone));
  assert.deepEqual(held(merged), { sweep: 2 });
  const twice = mergeSaves(merged, phone);
  assert.equal(points(twice), points(merged));
  const back = mergeSaves(phone, merged);
  assert.equal(points(back), points(merged), 'either way round');
});

test('merge: a device that never played adds no points', () => {
  const played = fresh();
  ledger.add(played.ledger, 'game', { pts: 100 });
  const merged = mergeSaves(played, fresh());
  assert.equal(points(merged), points(played));
});

// v1 saves start afresh at the launch (v3), so their entries are made
// straight from the ledger here; the merge rule for them stays.
test('merge: two v1 entries keep the higher, as v1 did', () => {
  const a = fresh();
  Object.assign(a.ledger, ledger.fromV1({ points: 500 }, { sweep: 1 }));
  const b = fresh();
  Object.assign(b.ledger, ledger.fromV1({ points: 300 }, {}));
  ledger.add(b.ledger, 'game', { pts: 50 });
  const merged = mergeSaves(a, b);
  // The higher v1 entry, b's game, and each device's own start.
  assert.equal(points(merged), 500 + 50 + 2 * ECONOMY.startingPoints);
  assert.deepEqual(held(merged), { sweep: 1 });
});

test('merge: the same daily paid on both devices counts both payments', () => {
  const a = fresh();
  const b = clone(a);   // b was sent from a
  ledger.add(a.ledger, 'game', { pts: 100, game: 'main/9' });
  ledger.add(b.ledger, 'game', { pts: 80, game: 'main/9' });
  assert.equal(points(mergeSaves(a, b)), ECONOMY.startingPoints + 180);
});

test('every save key has a merge rule', () => {
  Object.keys(fresh()).filter((k) => k !== 'v').forEach((key) => assert.ok(key in MERGE, key));
});
