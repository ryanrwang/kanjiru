import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stats, newAchievements, streakRewards, passes } from '../js/engine/stats.js';
import { ACHIEVEMENTS, KNOWN_STATS, ECONOMY } from '../js/registry.js';

const win = (date, answer, guesses = 3, powers = []) =>
  ({ date, guesses: Array(guesses - 1).fill('林').concat(answer), won: true, powers, answer });
const loss = (date, answer) => ({ date, guesses: ['林', '森'], won: false, powers: [], answer });

// A keep-playing game's history key: "p" + when it finished, in base 36.
const at = (ms) => `p${ms.toString(36)}`;

test('streak: wins in a row, dailies and keep-playing alike, in any mode', () => {
  const history = {
    k1: { 1: win('2026-11-01', '明'), [at(2000)]: win('2026-11-09', '時') },
    k2: { 3: win('2026-11-03', '日本') }
  };
  const s = stats(history);
  assert.equal(s.bestStreak, 3, 'days between games don\'t matter');
  assert.equal(s.currentStreak, 3);
});

test('streak: a loss ends it', () => {
  const history = { main: {
    [at(1000)]: win('2026-11-01', '明'),
    [at(2000)]: win('2026-11-01', '時'),
    [at(3000)]: loss('2026-11-02', '間'),
    [at(4000)]: win('2026-11-02', '林')
  } };
  const s = stats(history);
  assert.equal(s.bestStreak, 2);
  assert.equal(s.currentStreak, 1);
});

test('streak: a day\'s games go in the order they finished', () => {
  // Written out of order: the win finished last.
  const history = { main: { [at(9000)]: win('2026-11-02', '明'), [at(5000)]: loss('2026-11-02', '時') } };
  assert.equal(stats(history).currentStreak, 1);
  const flipped = { main: { [at(5000)]: win('2026-11-02', '明'), [at(9000)]: loss('2026-11-02', '時') } };
  assert.equal(stats(flipped).currentStreak, 0);
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

test('streak: none played', () => {
  const s = stats({});
  assert.equal(s.bestStreak, 0);
  assert.equal(s.currentStreak, 0);
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
  const [a, b, c] = ECONOMY.streakRewards.map((r) => r.wins);
  assert.deepEqual(streakRewards(a - 1, a, ECONOMY).map((r) => r.wins), [a]);
  assert.deepEqual(streakRewards(b - 1, c, ECONOMY).map((r) => r.wins), [b, c]);
  assert.deepEqual(streakRewards(a, a, ECONOMY), []);
});
