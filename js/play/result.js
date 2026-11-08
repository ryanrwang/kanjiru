/*
 * The result card at the end of a game: the answer with its meanings,
 * readings and parts, the points it paid, the streak, the share text, a
 * countdown to the next daily, and what to play next.
 *
 *   const card = renderResult({ ... });   // card.node, card.tick()
 */
import { RULES } from '../registry.js';
import { t } from '../i18n.js';
import { el } from '../dom.js';
import { msToNextDaily } from '../engine/daily.js';
import { shareText } from './share.js';
import { readingNodes, partTile } from './hints.js';

const pad = (n) => String(n).padStart(2, '0');

function clock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

// Copies text: the clipboard API where the page allows it (https), else
// the old select-and-copy, which also works on a plain-http test server.
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) { /* not allowed here: try the old way */ }
  const area = el('textarea', { class: 'visually-hidden', readonly: true, 'aria-hidden': 'true' });
  area.value = text;
  document.body.append(area);
  area.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  area.remove();
  return ok;
}

// Phones get the share sheet; computers copy.
async function shareOut(text) {
  const phone = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (phone && navigator.share) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
    }
  }
  return (await copy(text)) ? 'copied' : 'failed';
}

export function renderResult({ engine, data, mode, game, points, streak, glyph, onPractice, onHome }) {
  const { state } = game;
  const won = state.status === 'won';
  const info = engine.answerInfo(state.answer);
  const url = `${location.origin}${location.pathname}`;
  const text = shareText({ state, mode, t, share: RULES.share, url });

  const status = el('p', { class: 'status-line', role: 'status' });
  const preview = el('pre', { class: 'share-preview' }, text);
  const countdown = el('span', { class: 'countdown-time' });

  const shareButton = el('button', {
    class: 'btn btn-primary', type: 'button',
    onclick: async () => {
      const how = await shareOut(text);
      status.className = `status-line${how === 'failed' ? ' is-error' : ' is-ok'}`;
      status.textContent = how === 'copied' ? t('result.copied') : how === 'failed' ? t('result.copyManually') : '';
      if (how === 'failed') window.getSelection().selectAllChildren(preview);
    }
  }, t('result.share'));

  const answerParts = [...state.answer].map((ch) => el('div', { class: 'answer-kanji-parts' },
    [...state.answer].length > 1 ? el('span', { class: 'kanji', lang: 'ja' }, ch) : null,
    el('span', { class: 'part-chips' }, data.kanji[ch].parts.map((p) => partTile(p, glyph)))));

  const node = el('section', { class: 'card result', 'aria-labelledby': 'result-title' },
    el('h2', { class: `result-title${won ? ' is-won' : ''}`, id: 'result-title' },
      won ? t('result.won', { n: state.guesses.length }) : t('result.lost')),

    el('div', { class: 'answer' },
      el('span', { class: 'answer-kanji kanji', lang: 'ja' }, state.answer),
      el('div', { class: 'answer-info' },
        info.meanings.length ? el('p', { class: 'answer-meanings' }, info.meanings.join(t('game.meaningSep'))) : null,
        el('p', { class: 'answer-readings' }, readingNodes(info.reading)))),
    el('div', { class: 'answer-parts' },
      el('span', { class: 'answer-label' }, t('result.parts')), answerParts),

    el('dl', { class: 'result-stats' },
      game.exact ? el('div', { class: 'result-stat' },
        el('dt', {}, t('result.points')),
        el('dd', {}, t('result.pointsEarned', { n: points.total }),
          el('small', {}, t('result.pointsWhy', { parts: points.parts, solve: points.solve, mult: points.multiplier })))) : null,
      el('div', { class: 'result-stat' },
        el('dt', {}, t('result.streak')),
        el('dd', {}, t('result.streakDays', { n: streak })))),

    el('div', { class: 'share' },
      preview,
      el('div', { class: 'btn-row' }, shareButton),
      status),

    el('p', { class: 'countdown' }, t('result.nextDaily'), ' ', countdown),

    el('div', { class: 'btn-row' },
      el('button', { class: 'btn btn-secondary', type: 'button', onclick: onPractice },
        state.daily ? t('result.practice') : t('result.again')),
      el('button', { class: 'btn btn-ghost', type: 'button', onclick: onHome }, t('game.home')))
  );

  const tick = () => {
    const ms = msToNextDaily();
    countdown.textContent = clock(ms);
    return ms;
  };
  tick();
  return { node, tick };
}
