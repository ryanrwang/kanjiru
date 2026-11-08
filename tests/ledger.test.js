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

test('a v1 save becomes one ledger entry with its points and hints', () => {
  const v1 = { v: 1, settings: { theme: 'ai' }, wallet: { points: 420 }, inventory: { sweep: 2, layout: 0 }, history: {}, playing: {}, unlocked: {}, achievements: {} };
  const save = readSave(JSON.stringify(v1));
  assert.equal(save.v, VERSION);
  assert.equal(points(save), 420);
  assert.deepEqual(held(save), { sweep: 2 });
  assert.ok(!('wallet' in save) && !('inventory' in save));
  assert.deepEqual(Object.keys(save.ledger), [ledger.V1_ID], 'no starting points on top');
  assert.equal(save.settings.theme, 'ai');
  assert.equal(save.settings.tiles, 'flip', 'missing settings filled in');
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

test('merge: two v1 entries keep the higher, as v1 did', () => {
  const a = readSave(JSON.stringify({ v: 1, wallet: { points: 500 }, inventory: { sweep: 1 } }));
  const b = readSave(JSON.stringify({ v: 1, wallet: { points: 300 }, inventory: {} }));
  ledger.add(b.ledger, 'game', { pts: 50 });
  const merged = mergeSaves(a, b);
  assert.equal(points(merged), 550);
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
