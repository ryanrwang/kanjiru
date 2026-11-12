/*
 * The result card at the end of a game: on a game not solved, the answer's
 * parts on top as the row the board never got; the answer with its meanings,
 * readings and parts; then the points, in a box of their own: what the
 * game paid, the streak (wins in a row), its rewards (streak, bonus hint,
 * achievements: js/play/rewards.js describe()) and the points you have
 * now; the share text (while rules.js share.show is on), a countdown to
 * the next daily (in a mode with dailies), and Done and New game. The
 * dictionary credit sits under the card. Just finished (fresh), the points
 * rise in.
 *
 *   const card = renderResult({ ... });   // card.node (the card and its credit), card.tick()
 */
import { RULES, LEVEL } from '../registry.js';
import { t, lang } from '../i18n.js';
import { el } from '../dom.js';
import { bump } from '../toast.js';
import { withCoin } from '../coin.js';
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

// A game not solved: the answer atop the card, its parts as the row the
// board never got, in green (2026-11-10, the user asked). Each kanji's
// parts keep together, as on the board. reveal: just finished, so the
// row plays the tile reveal in use (tiles, settings.tiles) once the card
// is in. Screen readers have the answer from the card itself.
function solutionRow(answer, data, glyph, tiles, reveal) {
  let i = 0;
  return el('div', { class: `result-solution${reveal ? ' is-new' : ''}`, 'data-tiles': tiles, 'aria-hidden': 'true' },
    [...answer].map((ch) => el('span', { class: 'result-solution-kanji' },
      data.kanji[ch].parts.map((p) => el('span', { class: 'tile is-cell is-hit', lang: 'ja', style: { '--i': i++ } }, glyph(p.form || p.el))))));
}

export function renderResult({ engine, data, mode, game, points, streak, glyph, rewards = [], balance = null, fresh = false, tiles = null, reveal = false, onPractice, onHome }) {
  const { state } = game;
  const won = state.status === 'won';
  const info = engine.answerInfo(state.answer);
  const local = (info.local || {})[lang()] || null;
  const url = `${location.origin}${location.pathname}`;
  // The squares keep the kanji apart only where the board did (levels.js showSplit).
  const level = LEVEL[state.level];
  const text = shareText({ state, mode, t, share: RULES.share, url, split: !level || level.guess !== 'parts' || level.showSplit });

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

  const earned = game.exact ? el('div', { class: 'result-earned' },
    el('p', { class: 'result-label' }, t('result.points')),
    el('p', { class: `result-big result-points${fresh ? ' is-new' : ''}` }, t('result.pointsEarned', { n: points.total })),
    el('p', { class: 'result-why' }, t('result.pointsWhy', { parts: points.parts, solve: points.solve, mult: points.multiplier }))) : null;

  const card = el('section', { class: 'card result', 'aria-labelledby': 'result-title' },
    won ? null : solutionRow(state.answer, data, glyph, tiles, reveal),
    el('header', { class: 'result-head' },
      el('h2', { class: `result-title${won ? ' is-won' : ''}`, id: 'result-title' },
        won ? t('result.won', { n: state.guesses.length }) : state.gaveUp ? t('result.gaveUp') : t('result.lost')),
      el('span', { class: 'pill' }, t(`level.${state.level}.name`))),

    el('div', { class: 'answer' },
      el('span', { class: 'answer-kanji kanji', lang: 'ja' }, state.answer),
      el('div', { class: 'answer-info' },
        // A one-kanji answer that isn't a word alone: the word it's known by.
        info.form ? el('p', { class: 'answer-form kanji', lang: 'ja' }, info.form) : null,
        // In the interface's language where the answer has a meaning in it
        // (data/meanings-ja.json), with the dictionary's English under it.
        local ? el('p', { class: 'answer-meanings', lang: lang() }, local) : null,
        info.meanings.length ? el('p', { class: `answer-meanings${local ? ' is-second' : ''}`, lang: 'en' }, info.meanings.join(t('game.meaningSep'))) : null,
        el('p', { class: 'answer-readings' }, readingNodes(info.reading)))),
    el('div', { class: 'answer-parts' },
      el('span', { class: 'answer-label' }, t('result.parts')), answerParts),

    // The points, a box of their own (2026-11-10): paid and the streak on
    // top, the rewards, then what you have now.
    el('section', { class: 'result-box', 'aria-label': t('result.points') },
      el('div', { class: 'result-box-top' },
        earned,
        el('div', { class: 'result-streak' },
          el('p', { class: 'result-label' }, t('result.streak')),
          el('p', { class: 'result-big' }, t('result.streakDays', { n: streak })))),
      // Laid out like the points above: a label, then each reward.
      rewards.length ? el('div', { class: 'result-rewards-part' },
        el('p', { class: 'result-label', id: 'result-rewards-label' }, t('result.rewards')),
        el('ul', { class: 'result-rewards', 'aria-labelledby': 'result-rewards-label' },
          rewards.map((r) => el('li', { class: 'result-reward' },
            el('span', { class: 'result-reward-icon', 'aria-hidden': 'true' }, r.icon),
            el('span', { class: 'result-reward-text' },
              el('span', { class: 'result-reward-title' }, r.title),
              r.body ? el('span', { class: 'result-reward-body' }, r.body) : null))))) : null,
      balance !== null ? el('p', { class: 'result-balance' },
        el('span', { class: 'result-balance-amount' }, withCoin((icon) => t('result.balance', { icon, n: balance }))),
        el('a', { class: 'result-balance-link', href: '#points' }, t('result.spend'))) : null),

    RULES.share.show ? el('div', { class: 'share' },
      preview,
      el('div', { class: 'btn-row result-actions' }, shareButton),
      status) : null,

    mode.daily ? el('p', { class: 'countdown' }, t('result.nextDaily'), ' ', countdown) : null,

    // Done on the left, New game on the right, on top when they stack. With
    // a mouse each names its key (js/play/screen.js onResultKey()).
    el('div', { class: 'btn-row result-actions' },
      el('button', { class: 'btn btn-ghost', type: 'button', 'data-id': 'result-done', 'aria-keyshortcuts': 'Escape', onclick: onHome },
        t('result.done'), el('span', { class: 'key-hint', 'aria-hidden': 'true' }, t('game.key.esc'))),
      el('button', { class: 'btn btn-primary', type: 'button', 'data-id': 'result-again', 'aria-keyshortcuts': 'Enter', onclick: onPractice },
        state.daily ? t('result.practice') : t('result.again'),
        el('span', { class: 'key-hint', 'aria-hidden': 'true' }, t('game.key.enter'))))
  );

  // EDRDG asks for its credit where its words show: under the card.
  const node = el('div', { class: 'result-wrap' }, card,
    el('p', { class: 'result-source' }, t('result.source'), ' ',
      el('a', { href: '#about' }, t('result.credits'))));

  // The points just paid rise from the total, once the card is on screen.
  if (fresh && game.exact && points.total) {
    requestAnimationFrame(() => bump(node.querySelector('.result-balance-amount'), points.total));
  }

  const tick = () => {
    const ms = msToNextDaily();
    countdown.textContent = clock(ms);
    return ms;
  };
  tick();
  return { node, tick };
}
