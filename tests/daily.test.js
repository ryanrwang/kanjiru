import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  localDate, dayIndex, addDays, puzzleNumber, puzzleDate, daily, practice,
  recentAnswers, historyKey, isDailyKey, msToNextDaily
} from '../js/engine/daily.js';
import { MODE } from '../js/registry.js';
import { fixtureData } from './helpers.js';

const data = fixtureData({ answers: { 1: ['明', '時', '間'], 2: ['日本'] }, epoch: '2026-11-01' });

test('local dates', () => {
  assert.equal(localDate(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.equal(localDate(new Date(2026, 11, 31, 0, 0)), '2026-12-31');
});

test('day counts ignore daylight saving', () => {
  assert.equal(dayIndex('2026-03-09') - dayIndex('2026-03-08'), 1);   // US clocks change
  assert.equal(dayIndex('2026-10-26') - dayIndex('2026-10-25'), 1);   // EU clocks change
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
});

test('puzzle numbers start at 1 on the epoch', () => {
  assert.equal(puzzleNumber('2026-11-01', '2026-11-01'), 1);
  assert.equal(puzzleNumber('2026-11-01', '2026-11-07'), 7);
  assert.equal(puzzleNumber('2026-11-01', '2026-10-31'), null);
  assert.equal(puzzleDate('2026-11-01', 7), '2026-11-07');
  assert.equal(puzzleDate('2026-11-01', puzzleNumber('2026-11-01', '2027-03-15')), '2027-03-15');
});

test('the daily: the same answer and seed for everyone on a date', () => {
  const d = daily(data, MODE.k1, '2026-11-02');
  assert.deepEqual(d, { modeId: 'k1', daily: true, puzzle: 2, date: '2026-11-02', answer: '時', seed: 'daily:k1:2' });
  assert.deepEqual(daily(data, MODE.k1, '2026-11-02'), d);
  assert.equal(daily(data, MODE.k2, '2026-11-02').answer, '日本');
});

test('the daily wraps round when the answers run out', () => {
  assert.equal(daily(data, MODE.k1, '2026-11-04').answer, '明');
});

test('no daily without answers, before the epoch, or in a practice-only mode', () => {
  assert.equal(daily(data, MODE.k3, '2026-11-02'), null);
  assert.equal(daily(data, MODE.k1, '2026-10-01'), null);
  assert.equal(daily(data, { ...MODE.k1, daily: false }, '2026-11-02'), null);
  assert.equal(daily({ ...data, epoch: null }, MODE.k1, '2026-11-02'), null);
});

test('practice: a random answer, skipping the ones to avoid', () => {
  const p = practice(data, MODE.k1, { rng: () => 0, avoid: ['明'] });
  assert.equal(p.answer, '時');
  assert.equal(p.daily, false);
  assert.equal(p.puzzle, null);
  assert.match(p.seed, /^practice:k1:/);
  assert.equal(practice(data, MODE.k1, { rng: () => 0, avoid: ['明', '時', '間'] }).answer, '明', 'falls back to all');
  assert.equal(practice(data, MODE.k3), null);
});

test('recent answers, newest first', () => {
  const history = { k1: {
    3: { date: '2026-11-03', answer: '間' },
    pa: { date: '2026-11-05', answer: '時' },
    pb: { date: '2026-11-05', answer: '明' },
    1: { date: '2026-11-01', answer: '林' }
  } };
  assert.deepEqual(recentAnswers(history, MODE.k1, 3), ['明', '時', '間']);
  assert.deepEqual(recentAnswers({}, MODE.k1, 3), []);
});

test('history keys: puzzle numbers for dailies, "p…" for practice', () => {
  assert.equal(historyKey({ daily: true, puzzle: 12 }), '12');
  assert.match(historyKey({ daily: false }, 1700000000000), /^p[0-9a-z]+$/);
  assert.equal(isDailyKey('12'), true);
  assert.equal(isDailyKey('p1x'), false);
});

test('the countdown to the next daily', () => {
  assert.equal(msToNextDaily(new Date(2026, 10, 7, 23, 0, 0)), 3600000);
});

test('the main mode plays its own list, with answers of any length', () => {
  const mixed = fixtureData({ answers: { main: ['日本', '明'] }, epoch: '2026-11-01' });
  assert.equal(MODE.main.length, null);
  assert.equal(daily(mixed, MODE.main, '2026-11-01').answer, '日本');
  assert.equal(daily(mixed, MODE.main, '2026-11-02').answer, '明');
  assert.equal(daily(mixed, MODE.k1, '2026-11-01'), null, 'a retired mode has no list');
  assert.ok(['日本', '明'].includes(practice(mixed, MODE.main, { rng: () => 0 }).answer));
});
