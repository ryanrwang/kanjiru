/*
 * Hints on the game screen: what the player knows about the answer (clues),
 * the powers they hold, and the sheet that uses one, or buys one when they
 * hold none (js/shop.js).
 *
 * Clue icons are the icons of the powers that reveal them (js/config/powers.js),
 * so nothing here names a power.
 */
import { POWERS, ECONOMY } from '../registry.js';
import { t } from '../i18n.js';
import { el } from '../dom.js';
import { bump } from '../toast.js';

const pts = (n) => t('currency.amount', { n });

const iconOf = (effect) => (POWERS.find((p) => p.effect === effect) || {}).icon || '';
const list = (items) => items.filter(Boolean).join(t('game.listSep'));

// Kun readings: 'あか.るい' → あか + るい (okurigana muted), '-' kept.
function kun(reading) {
  const [stem, tail] = reading.split('.');
  return el('span', { class: 'reading' }, stem, tail ? el('span', { class: 'okurigana' }, tail) : null);
}

// KANJIDIC can list a reading with and without its okurigana (か.つ and
// かつ for 勝), which read the same on screen. Keep one, in the first one's
// place: the one that marks the okurigana.
export function uniqueKun(readings) {
  const best = new Map();
  readings.forEach((r) => {
    const key = r.replace('.', '');
    if (!best.has(key) || (r.includes('.') && !best.get(key).includes('.'))) best.set(key, r);
  });
  return [...best.values()];
}

export function readingNodes(reading) {
  if (typeof reading === 'string') return [el('span', { lang: 'ja' }, reading)];
  const out = [];
  if (reading.on.length) {
    out.push(el('span', { class: 'reading-group' },
      el('span', { class: 'reading-label' }, t('game.on')),
      el('span', { lang: 'ja' }, reading.on.join('、'))));
  }
  if (reading.kun.length) {
    out.push(el('span', { class: 'reading-group' },
      el('span', { class: 'reading-label' }, t('game.kun')),
      el('span', { lang: 'ja' }, uniqueKun(reading.kun).map((r, i) => [i ? '、' : '', kun(r)]))));
  }
  return out;
}

// A part as a tile with its position underneath.
export function partTile(part, glyph, mark = '') {
  return el('span', { class: 'part-chip' },
    el('span', { class: `tile is-cell${mark ? ` is-${mark}` : ''}`, lang: 'ja' }, glyph(part.form || part.el)),
    el('span', { class: 'part-pos' }, t(`pos.${part.pos}`)));
}

function clue(effect, label, body, tag) {
  return el('div', { class: 'clue' },
    el('span', { class: 'clue-icon', 'aria-hidden': 'true' }, iconOf(effect)),
    el('span', { class: 'clue-label' }, label, tag ? el('span', { class: 'clue-tag' }, tag) : null),
    el('span', { class: 'clue-body' }, body));
}

// The clues known so far, or null when there are none.
export function renderClues({ engine, state, mode, glyph }) {
  const c = engine.clues(state);
  const many = [...state.answer].length > 1;
  const perSlot = (values, show) => values.map((v, i) => (many ? `${i + 1}: ${show(v)}` : show(v)));
  const rows = [];

  if (c.meaning) {
    rows.push(clue('revealMeaning', t('game.clue.meaning'), c.meaning.join(t('game.meaningSep')), c.meaningFree ? t('game.clue.free') : null));
  } else if (c.meaningFreeAt !== null && state.status === 'playing') {
    rows.push(el('div', { class: 'clue is-soon' },
      el('span', { class: 'clue-icon', 'aria-hidden': 'true' }, iconOf('revealMeaning')),
      el('span', { class: 'clue-body' }, t('game.clue.meaningSoon', { n: c.meaningFreeAt }))));
  }
  if (c.reading) rows.push(clue('revealReading', t('game.clue.reading'), readingNodes(c.reading)));
  if (c.strokes) rows.push(clue('revealStrokes', t('game.clue.strokes'), list(perSlot(c.strokes, String))));
  if (c.layout) {
    rows.push(clue('revealLayout', t('game.clue.layout'),
      perSlot(c.layout, (positions) => positions.map((p) => t(`pos.${p}`)).join(t('game.layoutSep'))).join(' / ')));
  }
  if (c.parts.length) {
    rows.push(clue('revealParts', t('game.clue.parts'),
      el('span', { class: 'part-chips' }, c.parts.map((p) => partTile(p, glyph, 'hit')))));
  }
  if (c.kanji.length) {
    rows.push(clue('revealKanji', t('game.clue.kanji'),
      el('span', { lang: 'ja' }, c.kanji.map((k) => `${k.slot + 1}: ${k.kanji}`).join(t('game.listSep')))));
  }
  if (c.eliminated.length) {
    rows.push(clue('eliminateParts', t('game.clue.eliminated'), t('game.clue.eliminatedCount', { n: c.eliminated.length })));
  }
  return rows.length ? el('div', { class: 'clues', 'aria-live': 'polite' }, rows) : null;
}

// The powers this answer's length allows, as buttons with the count held,
// and the points to buy more. A power that can't be used now is dimmed; one
// you hold none of has a muted count (its sheet sells one).
export function renderPowerBar({ engine, state, held, points, onPick }) {
  const offered = POWERS.filter((p) => (p.minLength || 1) <= [...state.answer].length);
  if (!offered.length || state.status !== 'playing') return null;
  return el('div', { class: 'power-bar', role: 'group', 'aria-labelledby': 'power-bar-title' },
    el('span', { class: 'power-bar-title', id: 'power-bar-title' },
      el('span', {}, t('game.powers.title')),
      el('span', { class: 'power-bar-points' }, `${ECONOMY.currency.icon} ${pts(points)}`)),
    el('div', { class: 'power-chips' }, offered.map((p) => {
      const n = held[p.id] || 0;
      const off = !!engine.canUse(state, p.id);
      const name = t(`power.${p.id}.name`);
      return el('button', {
        class: `power-chip${off ? ' is-off' : ''}${n ? '' : ' is-none'}`,
        type: 'button',
        title: name,
        'aria-label': `${name} · ${t('powers.have', { n })}`,
        onclick: () => onPick(p.id)
      },
        el('span', { 'aria-hidden': 'true' }, p.icon),
        el('span', { class: 'power-chip-count', 'aria-hidden': 'true' }, String(n)));
    })));
}

// Why a power can't be used now, as text, or ''. The rules come first, so
// a power you couldn't use anyway doesn't just say you have none.
export function whyNot(engine, state, power, held) {
  const code = engine.canUse(state, power.id);
  if (code === 'when') return t(power.when.includes('before') ? 'game.powers.why.before' : 'game.powers.why.during');
  if (code) return t(`game.powers.why.${code}`, { n: power.minLength || 1 });
  return held ? '' : t('game.powers.why.none');
}

// The sheet for one power: what it does, how many you hold, and Use. When
// you hold none and could use one now, Buy takes Use's place, in two taps
// (Buy, then the confirm that names the price), and Use comes back after.
//   read()   the latest { held, points, why, offer }; offer is js/shop.js
//            powerOffer(), or null when it can't be bought here
//   onBuy()  buys one; true when it did
let sheet = null;
export function openPowerSheet({ power, read, onBuy, onUse }) {
  if (!sheet) {
    sheet = el('dialog', { class: 'sheet power-sheet', 'aria-labelledby': 'power-sheet-title' });
    sheet.addEventListener('click', (event) => { if (event.target === sheet) sheet.close(); });
    document.body.append(sheet);
  }
  const name = t(`power.${power.id}.name`);
  let confirming = false;
  let bought = false;

  const draw = (spent = 0) => {
    const { held, points, why, offer } = read();
    const selling = !!offer && offer.why !== 'not-for-sale' && (!held || bought);
    const buyFirst = selling && !bought && !held;
    const pointsNode = el('span', { class: 'power-sheet-points' }, `${ECONOMY.currency.icon} ${pts(points)}`);
    const use = el('button', {
      class: 'btn btn-primary', type: 'button', disabled: !!why,
      onclick: () => { sheet.close(); onUse(); }
    }, t('game.powers.use'));
    const yes = el('button', {
      class: 'btn btn-primary btn-small', type: 'button',
      onclick: () => {
        if (!onBuy()) return;
        confirming = false;
        bought = true;
        draw(power.cost);
      }
    }, t('shop.confirmYes', { cost: power.cost }));
    const buy = el('button', {
      class: 'btn btn-primary', type: 'button', disabled: !!(offer && offer.why),
      onclick: () => { confirming = true; draw(); }
    }, t('game.powers.buy', { cost: power.cost }));

    let buyRow = null;
    if (selling && bought) {
      buyRow = el('p', { class: 'status-line is-ok', role: 'status' }, t('game.powers.bought', { n: held }));
    } else if (selling && confirming && !offer.why) {
      buyRow = el('div', { class: 'shop-confirm' },
        el('p', {}, t('shop.confirm', { cost: power.cost, have: points, left: points - power.cost, name })),
        el('div', { class: 'btn-row' }, yes,
          el('button', {
            class: 'btn btn-ghost btn-small', type: 'button',
            onclick: () => { confirming = false; draw(); }
          }, t('shop.cancel'))));
    } else if (buyFirst && offer.why) {
      buyRow = el('p', { class: 'status-line is-error' },
        offer.why === 'short' ? t('shop.short', { n: offer.need }) : t('shop.full', { hold: power.hold }));
    }

    sheet.replaceChildren(el('div', { class: 'sheet-body' },
      el('header', { class: 'power-sheet-head' },
        el('span', { class: 'power-icon', 'aria-hidden': 'true' }, power.icon),
        el('h2', { class: 'sheet-title', id: 'power-sheet-title' }, name)),
      el('p', {}, t(`power.${power.id}.desc`)),
      el('p', { class: 'sheet-note' }, t('powers.have', { n: held }), t('reward.sep'), pointsNode),
      // Holding none needs no warning when Buy is right there.
      why && !confirming && !buyFirst ? el('p', { class: 'status-line is-error' }, why) : null,
      buyRow,
      // While the confirm shows, its own buttons are the only ones.
      confirming ? null : el('div', { class: 'btn-row' },
        buyFirst ? buy : use,
        el('button', { class: 'btn btn-ghost', type: 'button', onclick: () => sheet.close() }, t('game.powers.cancel')))
    ));
    if (spent) bump(pointsNode, -spent);
    return { use, buy, buyFirst, why };
  };

  const first = draw();
  sheet.showModal();
  if (first.buyFirst) { if (!first.buy.disabled) first.buy.focus(); }
  else if (!first.why) first.use.focus();
  // Focus follows the step: the confirm, then Use once it's bought.
  sheet.onclick = (event) => {
    if (event.target === sheet) return;
    queueMicrotask(() => {
      const next = sheet.querySelector('.shop-confirm .btn-primary') || sheet.querySelector('.btn-row > .btn-primary:not(:disabled)');
      if (next && sheet.open && !sheet.contains(document.activeElement)) next.focus();
    });
  };
}

export function closePowerSheet() {
  if (sheet && sheet.open) sheet.close();
}
