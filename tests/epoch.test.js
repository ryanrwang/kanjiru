/*
 * Launch day: when the epoch (the date of puzzle 1) moves, dailies played
 * under the old one become keep-playing games (settleDailies in
 * js/store.js), so testers' early games never mark a new puzzle as played.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as ledger from '../js/ledger.js';
import { fresh, settleDailies, pastKey, readSave, mergeSaves, useEpoch, points, held } from '../js/store.js';
import { stats } from '../js/engine/stats.js';
import { historyKey } from '../js/engine/daily.js';

const OLD = '2026-11-01';
const LAUNCH = '2026-11-20';
const clone = (x) => JSON.parse(JSON.stringify(x));

// A tester's save: dailies 5, 6 and 7 (Nov 5–7) under the old epoch, a
// keep-playing game, a hint bought, and today's daily 8 on the go.
function testerSave() {
  const save = fresh();
  const win = (date, answer) => ({ date, guesses: [['a'], ['b']], won: true, powers: [], answer, level: 'normal' });
  save.history.main = {
    5: { ...win('2026-11-05', '時間'), won: false },
    6: win('2026-11-06', '電車'),
    7: win('2026-11-07', '先生'),
    p1abc: win('2026-11-07', '学校')
  };
  save.history.k1 = { 3: win('2026-11-03', '明') };   // a retired mode's daily
  ledger.add(save.ledger, 'game', { pts: 120, game: 'main/6', at: '2026-11-06' });
  ledger.add(save.ledger, 'drop', { hints: { sweep: 1 }, game: 'main/6', at: '2026-11-06' });
  ledger.add(save.ledger, 'game', { pts: 90, game: 'main/p1abc', at: '2026-11-07' });
  ledger.add(save.ledger, 'buy', { pts: -60, hints: { layout: 1 }, what: 'layout' });
  save.playing.main = {
    daily: { start: { modeId: 'main', daily: true, puzzle: 8, date: '2026-11-08', answer: '天気', level: 'normal' }, log: [] },
    practice: { start: { modeId: 'main', daily: false, puzzle: null, answer: '山道', level: 'normal' }, log: [] }
  };
  return save;
}

test('pastKey: the epoch the daily was played under, and its number', () => {
  assert.equal(pastKey('2026-11-07', 7), '2026-11-01#7');
  assert.equal(pastKey('2026-12-01', '1'), '2026-12-01#1');
  assert.equal(pastKey(undefined, 4), 'old#4');
});

test('the same epoch: nothing moves', () => {
  const save = testerSave();
  const before = clone(save);
  assert.equal(settleDailies(save, OLD), 0);
  assert.deepEqual(save, before);
});

test('a new epoch: old dailies become keep-playing games, in every mode', () => {
  const save = testerSave();
  const changed = settleDailies(save, LAUNCH);
  assert.equal(changed, 5);   // 4 dailies and the daily on the go
  assert.deepEqual(Object.keys(save.history.main).sort(), ['2026-11-01#5', '2026-11-01#6', '2026-11-01#7', 'p1abc']);
  assert.deepEqual(Object.keys(save.history.k1), ['2026-11-01#3']);
  assert.equal(save.history.main['2026-11-01#6'].answer, '電車');
  assert.equal(save.history.main['2026-11-01#5'].won, false);
  // Today's daily on the go is from the old epoch: dropped. Practice stays.
  assert.equal(save.playing.main.daily, undefined);
  assert.equal(save.playing.main.practice.start.answer, '山道');
});

test('their wins, kanji and points still count; the streak starts again', () => {
  const save = testerSave();
  const before = stats(save.history, { today: '2026-11-08' });
  const pts = points(save);
  const hints = held(save);
  settleDailies(save, LAUNCH);
  const after = stats(save.history, { today: '2026-11-08' });
  assert.equal(before.currentStreak, 2);   // 6 and 7 won (5 lost)
  assert.equal(after.currentStreak, 0);
  assert.equal(after.bestStreak, 0);
  assert.equal(after.dailyWins, 0);
  assert.equal(after.wins, before.wins);
  assert.equal(after.collected, before.collected);
  assert.equal(points(save), pts);
  assert.deepEqual(held(save), hints);
});

test('the old games\' ledger entries follow them, so puzzle 6 is new', () => {
  const save = testerSave();
  settleDailies(save, LAUNCH);
  const games = Object.values(save.ledger).map((e) => e.game).filter(Boolean).sort();
  assert.deepEqual(games, ['main/2026-11-01#6', 'main/2026-11-01#6', 'main/p1abc']);
  assert.deepEqual(ledger.rewardsOf(save.ledger, 'main/6'), []);
});

test('the new epoch\'s puzzle 1 can be played and saved under "1"', () => {
  const save = testerSave();
  save.history.main[1] = { date: '2026-11-01', guesses: [], won: true, powers: [], answer: '一つ', level: 'normal' };
  settleDailies(save, LAUNCH);
  assert.ok(!('1' in save.history.main), 'old puzzle 1 moved');
  const key = historyKey({ daily: true, puzzle: 1 });
  save.history.main[key] = { date: LAUNCH, guesses: [], won: true, powers: [], answer: '新年', level: 'normal' };
  assert.equal(settleDailies(save, LAUNCH), 0, 'a daily of this epoch stays');
  assert.equal(save.history.main['1'].answer, '新年');
  assert.equal(save.history.main['2026-11-01#1'].answer, '一つ');
  assert.equal(stats(save.history, { today: LAUNCH }).currentStreak, 1);
});

test('settling twice changes nothing', () => {
  const save = testerSave();
  settleDailies(save, LAUNCH);
  const once = clone(save);
  assert.equal(settleDailies(save, LAUNCH), 0);
  assert.deepEqual(save, once);
});

test('a daily with no date can\'t be placed: it moves aside too', () => {
  const save = fresh();
  save.history.main = { 4: { guesses: [], won: true, answer: '時間' } };
  assert.equal(settleDailies(save, LAUNCH), 1);
  assert.deepEqual(Object.keys(save.history.main), ['old#4']);
});

test('no epoch (no data yet), or not a save: nothing happens', () => {
  const save = testerSave();
  const before = clone(save);
  assert.equal(settleDailies(save, null), 0);
  assert.equal(settleDailies(save, 'soon'), 0);
  assert.equal(settleDailies(null, LAUNCH), 0);
  assert.deepEqual(save, before);
});

test('a later reset works the same way', () => {
  const save = testerSave();
  settleDailies(save, LAUNCH);
  save.history.main[2] = { date: '2026-11-21', guesses: [], won: true, powers: [], answer: '花火', level: 'normal' };
  settleDailies(save, '2027-01-01');
  assert.ok('2026-11-20#2' in save.history.main);
  assert.ok('2026-11-01#5' in save.history.main);
});

test('a save from a device not opened since launch is settled before a merge', () => {
  useEpoch(LAUNCH);
  try {
    // This device: settled, and has played the new puzzle 6.
    const mine = testerSave();
    settleDailies(mine, LAUNCH);
    mine.history.main[6] = { date: '2026-11-25', guesses: [['x']], won: true, powers: [], answer: '新しい', level: 'normal' };
    // The other device still has the old dailies under 5, 6 and 7.
    const theirs = readSave(JSON.stringify(testerSave()));
    assert.ok(!('6' in theirs.history.main), 'their old 6 moved before the merge');
    const merged = mergeSaves(mine, theirs);
    assert.equal(merged.history.main['6'].answer, '新しい');
    assert.equal(merged.history.main['2026-11-01#6'].answer, '電車');
    assert.equal(stats(merged.history, { today: '2026-11-25' }).dailyWins, 1);
  } finally {
    useEpoch(null);
  }
});

test('two devices that both moved the same old game merge it once', () => {
  const a = testerSave();
  const b = clone(a);
  settleDailies(a, LAUNCH);
  settleDailies(b, LAUNCH);
  const merged = mergeSaves(a, b);
  assert.deepEqual(merged.history, a.history);
  assert.equal(points(merged), points(a));
});
