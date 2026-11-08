import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stats, runs, newAchievements, streakRewards, passes } from '../js/engine/stats.js';
import { ACHIEVEMENTS, KNOWN_STATS, ECONOMY } from '../js/registry.js';

const win = (date, answer, guesses = 3, powers = []) =>
  ({ date, guesses: Array(guesses - 1).fill('林').concat(answer), won: true, powers, answer });
const loss = (date, answer) => ({ date, guesses: ['林', '森'], won: false, powers: [], answer });

test('streak: days in a row with a daily won, in any mode', () => {
  const history = {
    k1: { 1: win('2026-11-01', '明'), 2: win('2026-11-02', '時'), 4: win('2026-11-04', '間') },
    k2: { 3: win('2026-11-03', '日本'), 4: win('2026-11-04', '本日') }
  };
  const s = stats(history, { today: '2026-11-04' });
  assert.equal(s.bestStreak, 4);
  assert.equal(s.currentStreak, 4);
});

test('streak: a day not played yet doesn\'t break it; a missed day does', () => {
  const history = { k1: { 1: win('2026-11-01', '明'), 2: win('2026-11-02', '時') } };
  assert.equal(stats(history, { today: '2026-11-03' }).currentStreak, 2);
  assert.equal(stats(history, { today: '2026-11-04' }).currentStreak, 0);
  assert.equal(stats(history, { today: '2026-11-04' }).bestStreak, 2);
});

test('streak: losses and practice games don\'t count', () => {
  const history = { k1: {
    1: win('2026-11-01', '明'),
    2: loss('2026-11-02', '時'),
    pz: win('2026-11-02', '間'),
    3: win('2026-11-03', '林')
  } };
  const s = stats(history, { today: '2026-11-03' });
  assert.equal(s.bestStreak, 1);
  assert.equal(s.currentStreak, 1);
});

test('wins, fastest, clean wins and kanji collected count practice too', () => {
  const history = {
    k1: { 1: win('2026-11-01', '明', 4), pa: win('2026-11-01', '明', 2, ['strokes']), 2: loss('2026-11-02', '時') },
    k2: { 1: win('2026-11-01', '日本', 5) }
  };
  const s = stats(history, { today: '2026-11-02' });
  assert.equal(s.played, 4);
  assert.equal(s.wins, 3);
  assert.equal(s.dailyWins, 2);
  assert.equal(s.fastestWin, 2);
  assert.equal(s.cleanWins, 2);
  assert.equal(s.collected, 3, '明, 日, 本');
});

test('no wins: no fastest win', () => {
  assert.equal(stats({}, { today: '2026-11-01' }).fastestWin, null);
});

test('guess counts may be numbers (older entries)', () => {
  const s = stats({ k1: { 1: { date: '2026-11-01', guesses: 2, won: true, powers: 0, answer: '明' } } }, { today: '2026-11-01' });
  assert.equal(s.fastestWin, 2);
  assert.equal(s.cleanWins, 1);
});

test('full-set days: every daily mode won that day', () => {
  const history = {
    k1: { 1: win('2026-11-01', '明'), 2: win('2026-11-02', '時') },
    k2: { 1: win('2026-11-01', '日本'), 2: loss('2026-11-02', '本日') }
  };
  assert.equal(stats(history, { today: '2026-11-02', dailyModes: ['k1', 'k2'] }).fullSetDays, 1);
  assert.equal(stats(history, { today: '2026-11-02', dailyModes: ['k1'] }).fullSetDays, 2);
  assert.equal(stats(history, { today: '2026-11-02', dailyModes: [] }).fullSetDays, 0);
});

test('runs: best and current', () => {
  assert.deepEqual(runs(['2026-11-01', '2026-11-02', '2026-11-05'], '2026-11-05'), { best: 2, current: 1 });
  assert.deepEqual(runs([], '2026-11-05'), { best: 0, current: 0 });
});

test('stats() works out every stat achievements may test', () => {
  const s = stats({}, { today: '2026-11-01' });
  KNOWN_STATS.forEach((name) => assert.ok(name in s, name));
});

test('achievements: atLeast, atMost, and never twice', () => {
  assert.equal(passes({ stat: 'wins', atLeast: 1 }, 1), true);
  assert.equal(passes({ stat: 'fastestWin', atMost: 2 }, 3), false);
  assert.equal(passes({ stat: 'fastestWin', atMost: 2 }, null), false);
  const values = { wins: 1, bestStreak: 0, fastestWin: 2, cleanWins: 0, collected: 1, fullSetDays: 0 };
  const ids = newAchievements(values, {}, ACHIEVEMENTS).map((a) => a.id);
  assert.ok(ids.includes('first-win'));
  assert.ok(ids.includes('sharp-eye'));
  assert.ok(!ids.includes('streak-7'));
  assert.ok(!newAchievements(values, { 'first-win': '2026-11-01' }).some((a) => a.id === 'first-win'));
});

test('streak rewards: each length passed pays', () => {
  assert.deepEqual(streakRewards(2, 3, ECONOMY).map((r) => r.days), [3]);
  assert.deepEqual(streakRewards(6, 30, ECONOMY).map((r) => r.days), [7, 30]);
  assert.deepEqual(streakRewards(3, 3, ECONOMY), []);
});
