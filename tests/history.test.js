/*
 * The play page's list of games (js/history.js): newest first, and each
 * guess's squares scored again from the saved parts, or none when the
 * guesses no longer fit the answer.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playedGames, marksOf } from '../js/history.js';
import { fixtureData } from './helpers.js';

const data = fixtureData();
const p = (ms) => `p${ms.toString(36)}`;

test('games list newest first, by day then by finish time', () => {
  const history = {
    main: {
      [p(1000)]: { date: '2026-11-09', answer: 'a' },
      [p(3000)]: { date: '2026-11-10', answer: 'b' },
      [p(2000)]: { date: '2026-11-10', answer: 'c' }
    },
    k1: { 4: { date: '2026-11-08', answer: 'd' } }
  };
  assert.deepEqual(playedGames(history).map((g) => g.answer), ['b', 'c', 'a', 'd']);
});

test('a guess is scored again cell by cell', () => {
  const [left, right] = data.kanji['明'].parts.map((x) => x.el);
  const entry = { answer: '明', guesses: [[[right, left]], [[left, right]]] };
  assert.deepEqual(marksOf(entry, data), [['near', 'near'], ['hit', 'hit']]);
});

test('guesses that no longer fit the answer show no squares', () => {
  assert.equal(marksOf({ answer: '明', guesses: [[['日']]] }, data), null, 'too few parts');
  assert.equal(marksOf({ answer: '明', guesses: ['間'] }, data), null, 'a kanji guess (retired Easy)');
  assert.equal(marksOf({ answer: '明', guesses: [] }, data), null);
  assert.equal(marksOf({ answer: '鬱', guesses: [[['一']]] }, data), null, 'a kanji with no data');
});
