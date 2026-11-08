import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareData } from '../js/engine/data.js';

test('prepareData turns the compiled files into engine data', () => {
  const data = prepareData({
    kanji: {
      fields: ['strokes', 'jlpt', 'freq', 'meanings', 'on', 'kun', 'parts'],
      kanji: { '海': [9, 4, 200, ['sea'], ['カイ'], ['うみ'], [['水', 'left', '氵'], ['𠂉', 'right'], ['毋', 'right']]] }
    },
    answers: { epoch: '2026-11-01', answers: { 1: ['海'], 2: [] }, words: { '海外': ['かいがい', ['abroad']] } },
    parts: { tiles: [{ id: '水', strokes: 4, uses: 1 }] }
  });
  assert.deepEqual(data.kanji['海'], {
    strokes: 9, jlpt: 4, freq: 200, meanings: ['sea'], on: ['カイ'], kun: ['うみ'],
    parts: [{ el: '水', pos: 'left', form: '氵' }, { el: '𠂉', pos: 'right' }, { el: '毋', pos: 'right' }]
  });
  assert.deepEqual(data.answers, { 1: ['海'], 2: [] });
  assert.deepEqual(data.words['海外'], { reading: 'かいがい', meanings: ['abroad'] });
  assert.equal(data.epoch, '2026-11-01');
  assert.equal(data.tiles.length, 1);
});

test('prepareData copes with no answers file', () => {
  const data = prepareData({ kanji: { fields: ['strokes', 'parts'], kanji: {} }, answers: null, parts: { tiles: [] } });
  assert.deepEqual(data.answers, {});
  assert.equal(data.epoch, null);
});
