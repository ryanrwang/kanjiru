/*
 * Typing parts on a physical keyboard (js/play/keys.js): which physical
 * key each of the game's keys takes, the letter it shows, and which key a
 * keypress types.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyCodes, keyLabel, fallbackLabel, matchKey } from '../js/play/keys.js';
import { RULES } from '../js/registry.js';

test('a desktop keyboard of 28 keys, 11 a row, takes Q to [, A to \', Z to N', () => {
  const codes = keyCodes(28, 11);
  const letters = codes.map((c) => keyLabel(c, null)).join('');
  assert.equal(letters, "QWERTYUIOP[ASDFGHJKL;'ZXCVBN");
  assert.ok(codes.every(Boolean));
});

test('a key past the end of its keyboard row gets no letter', () => {
  // 13 a row: the top row has 12 keys, the middle 11.
  const codes = keyCodes(28, 13);
  assert.equal(codes[11], 'BracketRight');
  assert.equal(codes[12], null);
  assert.equal(codes[13], 'KeyA');
  assert.equal(codes[24], null);
  assert.equal(codes[25], null);
  assert.equal(codes[26], 'KeyZ');
});

test('keys below the last keyboard row, or with no columns, get none', () => {
  const codes = keyCodes(28, 8);   // 4 rows of 8
  assert.deepEqual(codes.slice(24), [null, null, null, null]);
  assert.deepEqual(keyCodes(3, 0), [null, null, null]);
});

test('every code in the rules has a QWERTY letter', () => {
  RULES.typing.rows.flat().forEach((code) => assert.ok(fallbackLabel(code), code));
});

test('the player\'s layout names the letters where the browser says', () => {
  const azerty = new Map([['KeyQ', 'a'], ['KeyW', 'z'], ['Semicolon', 'm']]);
  assert.equal(keyLabel('KeyQ', azerty), 'A');
  assert.equal(keyLabel('Semicolon', azerty), 'M');
  // Not in the map: QWERTY's.
  assert.equal(keyLabel('KeyE', azerty), 'E');
  assert.equal(keyLabel(null, azerty), null);
});

test('a keypress finds its key by the letter shown, then by its place', () => {
  const keys = [{ letter: 'Q', code: 'KeyQ' }, { letter: 'A', code: 'KeyA' }, { letter: ';', code: 'Semicolon' }];
  assert.equal(matchKey(keys, { key: 'a', code: 'KeyA' }), 1);
  // Another layout: the letter read wins over the place.
  assert.equal(matchKey(keys, { key: 'q', code: 'KeyA' }), 0);
  // Shift + ; types ":": found by its place.
  assert.equal(matchKey(keys, { key: ':', code: 'Semicolon' }), 2);
  assert.equal(matchKey(keys, { key: 'Enter', code: 'Enter' }), -1);
  assert.equal(matchKey(keys, { key: 'z', code: 'KeyZ' }), -1);
});

test('two keys showing the same letter go by place', () => {
  // A Turkish layout: ı on KeyI and i on Quote both show I.
  const keys = [{ letter: 'I', code: 'KeyI' }, { letter: 'I', code: 'Quote' }];
  assert.equal(matchKey(keys, { key: 'i', code: 'Quote' }), 1);
  assert.equal(matchKey(keys, { key: 'ı', code: 'KeyI' }), 0);
});
