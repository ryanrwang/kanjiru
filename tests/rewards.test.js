/*
 * What a finished game pays (js/play/rewards.js): its points, the streak
 * rewards it reaches, a bonus hint and achievements, all as ledger entries.
 * Numbers come from the real catalogues, read here, never written out.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { payGame, earnAchievements, describe, skinsFor } from '../js/play/rewards.js';
import { fresh, points, held } from '../js/store.js';
import { ECONOMY, ACHIEVEMENT, ACHIEVEMENTS, SKINS } from '../js/registry.js';
import { stats } from '../js/engine/stats.js';

const win = (date, extra = {}) => ({ date, guesses: ['x', 'y', 'z'], won: true, powers: ['sweep'], answer: '明', level: 'normal', ...extra });
const noDrop = { rollDrop: () => null };
const state = (extra = {}) => ({ daily: true, status: 'won', ...extra });

// A save with daily wins on the days before `date`, then this game's.
function played(days, date, entry = win(date)) {
  const save = fresh();
  save.history.main = {};
  days.forEach((d, i) => { save.history.main[String(i + 1)] = win(d); });
  const streakBefore = stats(save.history, { today: date }).currentStreak;
  save.history.main[String(days.length + 1)] = entry;
  return { save, streakBefore };
}

test('a game pays its points into the ledger', () => {
  const { save, streakBefore } = played([], '2026-11-01');
  payGame(save, { engine: noDrop, state: state(), game: 'main/1', date: '2026-11-01', points: 123, streakBefore });
  const first = ACHIEVEMENT['first-win'].reward.points;
  assert.equal(points(save), ECONOMY.startingPoints + 123 + first);
});

test('reaching a streak length pays its reward, with its power', () => {
  const reward = ECONOMY.streakRewards.find((r) => r.power);
  const days = Array.from({ length: reward.wins - 1 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
  const date = `2026-10-${String(reward.wins).padStart(2, '0')}`;
  const { save, streakBefore } = played(days, date);
  save.achievements = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, '2026-01-01']));   // none of theirs
  const out = payGame(save, { engine: noDrop, state: state(), game: `main/${reward.wins}`, date, points: 0, streakBefore });
  const streak = out.filter((e) => e.why === 'streak');
  assert.deepEqual(streak.map((e) => e.what), [String(reward.wins)]);
  assert.equal(streak[0].pts, reward.points);
  assert.deepEqual(streak[0].hints, { [reward.power]: 1 });
  assert.equal(held(save)[reward.power], 1);
});

test('keep-playing wins pay streak rewards too; a lost game pays none', () => {
  const first = ECONOMY.streakRewards[0];
  const days = Array.from({ length: first.wins - 1 }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`);
  const date = `2026-11-${String(first.wins).padStart(2, '0')}`;
  const { save, streakBefore } = played(days, date);
  save.achievements = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, '2026-01-01']));
  const practice = payGame(save, { engine: noDrop, state: state({ daily: false }), game: 'main/p1', date, points: 0, streakBefore });
  assert.deepEqual(practice.map((e) => e.what), [String(first.wins)]);

  const lost = played(days, date, { ...win(date), won: false });
  const out = payGame(lost.save, { engine: noDrop, state: state({ status: 'lost' }), game: 'main/x', date, points: 0, streakBefore: lost.streakBefore });
  assert.deepEqual(out.filter((e) => e.why === 'streak'), []);
});

test('a bonus hint the engine rolls goes into the ledger', () => {
  const { save, streakBefore } = played([], '2026-11-01');
  let given = null;
  const engine = { rollDrop: (s, inventory) => { given = inventory; return 'sweep'; } };
  const out = payGame(save, { engine, state: state(), game: 'main/1', date: '2026-11-01', points: 0, streakBefore });
  assert.deepEqual(given, {}, 'the engine sees the hints held, for hold limits');
  assert.equal(out.filter((e) => e.why === 'drop').length, 1);
  assert.equal(held(save).sweep, 1);
});

test('achievements: earned once, with their reward, and retired ones never', () => {
  const save = fresh();
  save.history.main = { 1: win('2026-11-01', { level: 'hard', powers: [] }) };
  const out = earnAchievements(save, { date: '2026-11-01' });
  const ids = out.map((e) => e.what);
  assert.ok(ids.includes('first-win') && ids.includes('unaided') && ids.includes('hard-win'));
  assert.ok(!ids.includes('full-set'), 'retired');
  assert.equal(save.achievements['hard-win'], '2026-11-01');
  const total = ['first-win', 'unaided', 'hard-win'].reduce((n, id) => n + (ACHIEVEMENT[id].reward.points || 0), 0);
  assert.equal(points(save), ECONOMY.startingPoints + total);
  assert.deepEqual(earnAchievements(save, { date: '2026-11-02' }), [], 'never twice');
});

test('a Hard win counts at Guided · Hard too, not at Normal', () => {
  const s = stats({ main: { 1: win('2026-11-01', { level: 'guided-hard' }), 2: win('2026-11-02') } }, { today: '2026-11-02' });
  assert.equal(s.hardWins, 1);
});

test('describe: each reward reads with its icon and what it gave', () => {
  const unlocking = Object.values(SKINS).flat().find((item) => item.unlock.type === 'achievement');
  assert.ok(skinsFor(unlocking.unlock.id).length > 0);
  const a = describe({ why: 'achievement', what: unlocking.unlock.id });
  assert.equal(a.icon, ECONOMY.rewardIcons.achievement);
  assert.ok(a.body.length > 0, 'names the look it unlocks');
  const d = describe({ why: 'drop', hints: { sweep: 1 } });
  assert.equal(d.icon, ECONOMY.rewardIcons.drop);
  assert.ok(d.body.includes('🧹'));
});
