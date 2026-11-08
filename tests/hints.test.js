import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uniqueKun } from '../js/play/hints.js';

test('uniqueKun: a reading listed with and without okurigana shows once, with it', () => {
  // 勝 in KANJIDIC: か.つ and かつ read the same on screen.
  assert.deepEqual(uniqueKun(['か.つ', '-が.ち', 'まさ.る', 'すぐ.れる', 'かつ']), ['か.つ', '-が.ち', 'まさ.る', 'すぐ.れる']);
  // The marked one wins even when it comes second, in the first one's place.
  assert.deepEqual(uniqueKun(['かつ', 'まさ.る', 'か.つ']), ['か.つ', 'まさ.る']);
});

test('uniqueKun: different readings all stay', () => {
  assert.deepEqual(uniqueKun(['あか.るい', 'あか.るむ', 'あか']), ['あか.るい', 'あか.るむ', 'あか']);
  assert.deepEqual(uniqueKun(['-が.ち', 'が.ち']), ['-が.ち', 'が.ち']);
  assert.deepEqual(uniqueKun([]), []);
});
