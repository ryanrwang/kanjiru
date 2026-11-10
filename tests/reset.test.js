/*
 * Ending a game early and starting over (2026-11-10): giving up is a loss
 * that replays and records as one; achievements count only the games after
 * their last reset, their rewards pay once ever, and the reset survives a
 * merge with a device that never reset.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../js/engine/game.js';
import { stats, playedAfter } from '../js/engine/stats.js';
import { earnAchievements, achievementStats } from '../js/play/rewards.js';
import { fresh, mergeSaves, points } from '../js/store.js';
import { ACHIEVEMENT } from '../js/registry.js';
import { fixtureData, testConfig, start } from './helpers.js';

const engine = createEngine(fixtureData(), testConfig());
const at = (ms) => `p${ms.toString(36)}`;
const win = (date, extra = {}) => ({ date, guesses: ['x'], won: true, powers: [], answer: '明', level: 'normal', ...extra });

test('giving up ends the game as lost, at any point', () => {
  const game = engine.newGame(start('k1', '明'));
  const r = engine.giveUp(game);
  assert.equal(r.error, undefined);
  assert.equal(r.state.status, 'lost');
  assert.equal(r.state.gaveUp, true);
  assert.equal(game.status, 'playing', 'the old state is left alone');
  assert.equal(engine.giveUp(r.state).error, 'over');
  assert.equal(engine.guess(r.state, '明').error, 'over');
});

test('a game given up replays from its log and records that', () => {
  let game = engine.newGame(start('k1', '明'));
  game = engine.guess(game, '間').state;
  game = engine.giveUp(game).state;
  const again = engine.replay(start('k1', '明'), game.log);
  assert.equal(again.status, 'lost');
  assert.equal(again.gaveUp, true);
  assert.equal(again.guesses.length, 1);
  const entry = engine.record(game, '2026-11-10');
  assert.equal(entry.won, false);
  assert.equal(entry.gaveUp, true);
  assert.equal(engine.record(engine.newGame(start('k1', '明')), '2026-11-10').gaveUp, undefined);
  // It pays its parts like any loss, and no solve.
  assert.equal(engine.points(game).solve, 0);
});

test('playedAfter: by finish time, or for a daily by its day', () => {
  const noon = new Date(2026, 10, 10, 12).getTime();
  assert.equal(playedAfter({ key: at(noon + 1), date: '2026-11-10' }, noon), true);
  assert.equal(playedAfter({ key: at(noon - 1), date: '2026-11-10' }, noon), false);
  assert.equal(playedAfter({ key: '7', date: '2026-11-10' }, noon), false, 'a daily on the reset day');
  assert.equal(playedAfter({ key: '8', date: '2026-11-11' }, noon), true);
  assert.equal(playedAfter({ key: '1', date: '2000-01-01' }, null), true, 'no reset: every game');
});

test('stats since a reset count only the games after it', () => {
  const noon = new Date(2026, 10, 10, 12).getTime();
  const history = { main: { [at(noon - 5)]: win('2026-11-10'), [at(noon + 5)]: win('2026-11-10'), [at(noon + 9)]: win('2026-11-10', { won: false }) } };
  assert.equal(stats(history).wins, 2);
  assert.equal(stats(history, { since: noon }).wins, 1);
  assert.equal(stats(history, { since: noon }).played, 2);
});

test('after a reset, achievements are earned again but pay once', () => {
  const noon = new Date(2026, 10, 10, 12).getTime();
  const save = fresh();
  save.history.main = { [at(noon - 5)]: win('2026-11-10') };
  const first = earnAchievements(save, { date: '2026-11-10' });
  assert.ok(first.some((e) => e.what === 'first-win' && e.pts === ACHIEVEMENT['first-win'].reward.points));
  const paid = points(save);

  // Reset: nothing counts until a game after it.
  save.resets.achievements = noon;
  save.achievements = {};
  assert.equal(achievementStats(save).wins, 0);
  assert.deepEqual(earnAchievements(save, { date: '2026-11-10' }), []);

  save.history.main[at(noon + 5)] = win('2026-11-10');
  const again = earnAchievements(save, { date: '2026-11-10' });
  const firstWin = again.find((e) => e.what === 'first-win');
  assert.ok(firstWin, 'earned again');
  assert.equal(firstWin.pts, undefined, 'its reward isn’t paid twice');
  assert.equal(points(save), paid);
});

test('a merge keeps the later reset and drops achievements from before it', () => {
  const mine = fresh();
  const theirs = fresh();
  mine.history.main = { [at(1)]: win('2026-11-01') };
  theirs.history.main = { [at(2)]: win('2026-11-02') };
  const reset = new Date(2026, 10, 5, 12).getTime();
  mine.resets.achievements = reset;
  theirs.achievements = { 'first-win': '2026-11-02', unaided: '2026-11-07' };
  const merged = mergeSaves(mine, theirs);
  assert.equal(merged.resets.achievements, reset);
  assert.deepEqual(merged.achievements, { unaided: '2026-11-07' });
  // Again, the other way round: the same result.
  const back = mergeSaves(theirs, mine);
  assert.equal(back.resets.achievements, reset);
  assert.deepEqual(back.achievements, { unaided: '2026-11-07' });
});

test('a game deleted on one device stays deleted when the saves merge', () => {
  const mine = fresh();
  const theirs = fresh();
  theirs.history.main = { [at(1)]: win('2026-11-01'), [at(2)]: win('2026-11-02') };
  mine.history.main = { [at(2)]: win('2026-11-02') };
  mine.deleted.main = { [at(1)]: 5 };
  const merged = mergeSaves(mine, theirs);
  assert.deepEqual(Object.keys(merged.history.main), [at(2)]);
  assert.deepEqual(merged.deleted, { main: { [at(1)]: 5 } });
  // The other way round, and again: the same.
  const back = mergeSaves(theirs, mine);
  assert.deepEqual(Object.keys(back.history.main), [at(2)]);
  assert.deepEqual(Object.keys(mergeSaves(back, theirs).history.main), [at(2)]);
});
