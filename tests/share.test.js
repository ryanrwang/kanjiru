import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../js/engine/game.js';
import { MODE, RULES } from '../js/registry.js';
import { shareText, shareGrid } from '../js/play/share.js';
import { fixtureData, testConfig, start } from './helpers.js';

const config = testConfig();
config.modes.forEach((m) => { m.palette = 999; });
const engine = createEngine(fixtureData(), config);
const marks = { hit: 'G', near: 'Y', other: 'B', miss: '.' };

// A t() that shows which key and values it was given; level names as their key.
const t = (key, p) => (key.startsWith('level.') ? key : `${key}|${p.numeral}|${p.puzzle}|${p.level}|${p.score}|${p.hints}`);

const play = (state, ...steps) => steps.reduce((s, step) => {
  const r = Array.isArray(step) ? engine.guess(s, [step])
    : step.startsWith('!') ? engine.usePower(s, step.slice(1)) : engine.guess(s, step);
  assert.equal(r.error, undefined, `${step}: ${r.error}`);
  return r.state;
}, state);

test('the share grid has one square per part, one line per guess', () => {
  const game = play(engine.newGame(start('k1', '明')), '間', '時', '明');
  assert.equal(shareGrid(game, marks), '.Y\nG..\nGG');
});

test('the share text: daily number, score, and 💡 only when a power was used', () => {
  const mode = MODE.k1;
  const clean = play(engine.newGame(start('k1', '明', { puzzle: 7 })), '時', '明');
  assert.equal(shareText({ state: clean, mode, t, share: RULES.share }).split('\n')[0], 'share.daily|一|7|level.easy.name|2/6|');

  const helped = play(engine.newGame(start('k1', '明', { puzzle: 7 })), '!strokes', '明');
  assert.equal(shareText({ state: helped, mode, t, share: RULES.share }).split('\n')[0],
    `share.daily|一|7|level.easy.name|1/6| ${RULES.share.hints}`);
});

test('a lost practice game scores X and ends with the link', () => {
  const lost = play(engine.newGame(start('k1', '明', { daily: false, puzzle: null })), '間', '月', '時', '林', '森', '品');
  const lines = shareText({ state: lost, mode: MODE.k1, t, share: RULES.share, url: 'https://example.com/' }).split('\n');
  assert.equal(lines[0], 'share.practice|一|null|level.easy.name|X/6|');
  assert.equal(lines.length, 1 + 6 + 1);
  assert.equal(lines[lines.length - 1], 'https://example.com/');
});

test('a parts game shares green and grey squares, and its level', () => {
  const game = play(engine.newGame(start('k1', '明', { level: 'normal', puzzle: 7 })), ['門', '日'], ['月', '日']);
  const lines = shareText({ state: game, mode: MODE.k1, t, share: RULES.share }).split('\n');
  assert.equal(lines[0], 'share.daily|一|7|level.normal.name|2/6|');
  const { hit, miss } = RULES.share.marks;
  assert.deepEqual(lines.slice(1), [miss + hit, hit + hit]);
});
