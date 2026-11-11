/*
 * The save and other tabs (js/store.js sync()): a tab takes a save another
 * tab wrote instead of writing over it, and a save that can't be read is
 * kept aside before a new one takes its place.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// A localStorage for this file's process; store.js finds it as the global.
const kept = new Map();
globalThis.localStorage = {
  getItem: (key) => (kept.has(key) ? kept.get(key) : null),
  setItem: (key, value) => { kept.set(key, String(value)); },
  removeItem: (key) => { kept.delete(key); }
};

const store = await import('../js/store.js');
const read = () => JSON.parse(kept.get(store.SAVE_KEY));

test('a change is written at once, and writing it isn’t a change from elsewhere', () => {
  kept.clear();
  store.load();
  store.update((s) => { s.settings.lang = 'ja'; });
  assert.equal(read().settings.lang, 'ja');
  assert.equal(store.sync(), false);
});

test('a save another tab wrote is taken, not written over', () => {
  kept.clear();
  store.load();
  store.update((s) => { s.settings.lang = 'ja'; });
  // The other tab, which loaded the same save, finishes a game.
  const theirs = read();
  theirs.history = { main: { p1: { date: '2026-11-11', guesses: [], won: true, powers: [], answer: '時間', level: 'normal' } } };
  theirs.ledger.other = { why: 'game', at: 1, pts: 120, game: 'main/p1' };
  kept.set(store.SAVE_KEY, JSON.stringify(theirs));

  assert.equal(store.sync(), true);
  assert.ok(store.get().history.main.p1, 'their game is here now');
  assert.equal(store.points(), store.points(theirs));
  assert.equal(store.sync(), false, 'taken once');

  // This tab's next change keeps their game.
  store.update((s) => { s.settings.lang = 'en'; });
  assert.ok(read().history.main.p1);
  assert.equal(read().settings.lang, 'en');
});

test('storage cleared elsewhere: this tab starts afresh too', () => {
  kept.clear();
  store.load();
  store.update((s) => { s.settings.lang = 'ja'; });
  kept.delete(store.SAVE_KEY);
  assert.equal(store.sync(), true);
  assert.equal(store.get().settings.lang, null);
});

test('a save that can’t be read is kept aside before a new one replaces it', () => {
  kept.clear();
  kept.set(store.SAVE_KEY, '{"v":3,"history":{"main":');   // cut short
  const save = store.load();
  assert.equal(save.v, store.VERSION);
  assert.equal(kept.get(store.BROKEN_KEY), '{"v":3,"history":{"main":');
  // A good save is never copied there.
  kept.clear();
  store.load();
  store.update((s) => { s.settings.lang = 'ja'; });
  store.load();
  assert.equal(kept.has(store.BROKEN_KEY), false);
});
