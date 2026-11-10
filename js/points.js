/*
 * The Points page (#points, opened by the points in the header; the header
 * shows 漢 › Points): the wallet, the looks with examples, the hints and
 * powers, and the achievements. Buying takes two taps: Buy, then a modal
 * that names the price and what's left (rules in js/shop.js).
 *
 *   const page = openPoints(root, { onLook, onWallet });
 *   page.refresh();   // the scheme changed
 *   page.destroy();
 *
 *   onLook()     a look changed: apply it
 *   onWallet()   the points changed: redraw the header
 *
 * Every look has an example, locked or not: colours as three tiles in the
 * skin's own colours, a tile reveal as three tiles revealing, a win effect
 * playing over a solved row. A reveal or effect plays when it first comes
 * into view, when it's tapped or hovered, and when it's picked.
 */
import { POWERS, SLOTS, SKINS, ECONOMY, ACHIEVEMENTS, ACHIEVEMENT, MODES } from './registry.js';
import { t } from './i18n.js';
import { el } from './dom.js';
import * as store from './store.js';
import { isUnlocked, powerOffer, skinOffer, buyPower, buySkin } from './shop.js';
import { stats, progress } from './engine/stats.js';
import { localDate } from './engine/daily.js';
import { amounts, skinsFor, achievementStats } from './play/rewards.js';
import { bump } from './toast.js';
import { example as effectExample } from './play/effects.js';

const pts = (n) => t('currency.amount', { n });
const sep = () => t('reward.sep');

// How a guess reads in a look: the preview at the top of Looks, and three
// tiles in each look's example.
const PREVIEW = [['口', 'miss'], ['日', 'near'], ['寸', 'hit'], ['門', 'near'], ['日', 'hit']];
const SWATCH = [['日', 'hit'], ['土', 'near'], ['寸', 'miss']];
const SOLVED = [['日', 'hit'], ['土', 'hit'], ['寸', 'hit']];
const DRAWN = '時';   // the answer Brush draw writes out
// The seal stamped by the Seal effect: the game's own (modes.js numeral).
const SEAL = (MODES.find((m) => m.listed) || MODES[0]).numeral;

const hoverable = () => window.matchMedia && window.matchMedia('(hover: hover)').matches;

function whenText(when) {
  if (when.includes('before') && when.includes('during')) return t('powers.whenBoth');
  return when.includes('before') ? t('powers.whenBefore') : t('powers.whenDuring');
}

function lockText(unlock) {
  if (unlock.type === 'points') return t('looks.lockPoints', { cost: unlock.cost });
  if (unlock.type === 'achievement') return t('looks.lockAchievement', { name: t(`achievement.${unlock.id}.name`) });
  return '';
}

// A bar for how far along an achievement is.
function meter(now) {
  const share = now.goal ? Math.min(1, (Number(now.value) || 0) / now.goal) : 0;
  return el('span', { class: 'meter', 'aria-hidden': 'true' },
    el('span', { class: 'meter-fill', style: { width: `${Math.round(share * 100)}%` } }));
}

// Starts an example's animation again from the top.
function play(stage) {
  stage.classList.remove('is-playing');
  void stage.offsetWidth;
  stage.classList.add('is-playing');
}

const miniTiles = (tiles) => tiles.map(([part, mark], i) => {
  const tile = el('span', { class: `tile is-${mark}`, lang: 'ja' }, part);
  tile.style.setProperty('--i', i);
  return tile;
});

// The confirm before buying, in a modal: the price, and what's left after.
let confirmSheet = null;
function confirmBuy({ icon, name, cost, have, onYes }) {
  if (!confirmSheet) {
    confirmSheet = el('dialog', { class: 'sheet confirm-sheet', 'aria-labelledby': 'confirm-title' });
    confirmSheet.addEventListener('click', (event) => { if (event.target === confirmSheet) confirmSheet.close(); });
    document.body.append(confirmSheet);
  }
  const yes = el('button', {
    class: 'btn btn-primary', type: 'button',
    onclick: () => { confirmSheet.close(); onYes(); }
  }, t('shop.confirmYes', { cost }));
  confirmSheet.replaceChildren(el('div', { class: 'sheet-body' },
    el('header', { class: 'power-sheet-head' },
      el('span', { class: 'power-icon', 'aria-hidden': 'true' }, icon),
      el('h2', { class: 'sheet-title', id: 'confirm-title' }, t('shop.confirmTitle', { name }))),
    el('p', {}, t('shop.confirm', { cost, have, left: have - cost, name })),
    el('div', { class: 'btn-row' }, yes,
      el('button', { class: 'btn btn-ghost', type: 'button', onclick: () => confirmSheet.close() }, t('shop.cancel')))));
  confirmSheet.showModal();
  yes.focus();
}

export function openPoints(root, ctx) {
  // offer: the locked look whose details show; done: { key, text } after
  // a purchase or a change; playing: the look whose example plays on the
  // next draw.
  const ui = { offer: null, done: null, playing: null };
  const page = el('section', { class: 'page points-page', 'aria-labelledby': 'points-title' });
  let replay = false;   // the preview plays its tile reveal on the next draw

  // Each example plays once by itself, the first time it's on screen.
  const seen = new Set();
  const watcher = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      watcher.unobserve(entry.target);
      seen.add(entry.target.dataset.play);
      play(entry.target);
    });
  }, { threshold: 1 }) : null;

  function render(focusKey = null) {
    const save = store.get();
    const values = stats(save.history, { today: localDate() });
    // Achievements count the games since their last reset (Settings).
    const earning = achievementStats(save);
    page.replaceChildren(wallet(save, values), looks(save, earning), powers(save), achievements(save, earning));
    ui.playing = null;
    if (watcher) {
      watcher.disconnect();
      page.querySelectorAll('[data-play]').forEach((stage) => {
        if (!seen.has(stage.dataset.play)) watcher.observe(stage);
      });
    }
    if (focusKey) {
      const target = page.querySelector(`[data-key="${focusKey}"] [data-focus]`)
        || page.querySelector(`[data-key="${focusKey}"] button:not(:disabled)`)
        || page.querySelector(`button[data-key="${focusKey}"]`);
      if (target) target.focus({ preventScroll: true });
    }
  }

  // ── Wallet ─────────────────────────────────────────────────────────

  function stat(label, value) {
    return el('div', { class: 'wallet-stat' }, el('dt', {}, label), el('dd', {}, value));
  }

  function wallet(save, values) {
    const held = Object.values(store.held(save)).reduce((a, n) => a + n, 0);
    const shown = ACHIEVEMENTS.filter((a) => !a.retired || save.achievements[a.id]);
    const earned = shown.filter((a) => save.achievements[a.id]).length;
    return el('section', { class: 'card wallet-hero', 'aria-labelledby': 'wallet-title' },
      el('p', { class: 'wallet-label', id: 'wallet-title' }, t('points.wallet')),
      el('p', { class: 'wallet-total' },
        el('span', { class: 'wallet-coin', 'aria-hidden': 'true' }, ECONOMY.currency.icon),
        el('span', { class: 'wallet-number' }, String(store.points(save))),
        el('span', { class: 'wallet-unit' }, t('currency.unit'))),
      el('p', { class: 'wallet-how' }, t('points.how', { part: ECONOMY.perPart.hit, win: ECONOMY.solve.base })),
      el('dl', { class: 'wallet-stats' },
        stat(t('points.hints'), String(held)),
        stat(t('points.streak'), t('result.streakDays', { n: values.currentStreak })),
        stat(t('points.achievements'), t('points.of', { n: earned, total: shown.length }))));
  }

  // After a purchase: the wallet's points go down, and the header's.
  function paid(cost) {
    bump(page.querySelector('.wallet-number'), -cost);
    ctx.onWallet();
  }

  function buyButton(cost, why, onBuy) {
    return el('button', {
      class: 'btn btn-secondary btn-small', type: 'button', disabled: !!why, onclick: onBuy
    }, t('shop.buyFor', { cost }));
  }

  function whyText(offer, hold) {
    if (offer.why === 'full') return t('shop.full', { hold });
    if (offer.why === 'short') return t('shop.short', { n: offer.need });
    if (offer.why === 'soon') return t('shop.soon');
    return '';
  }

  const doneLine = (key) => (ui.done && ui.done.key === key
    ? el('p', { class: 'status-line is-ok', role: 'status' }, ui.done.text) : null);

  // ── Looks ──────────────────────────────────────────────────────────

  function use(slot, item) {
    store.update((s) => { s.settings[slot] = item.id; });
    ui.offer = null;
    ui.done = null;
    if (slot === 'theme') ctx.onLook();
    if (slot === 'tiles') replay = true;
    render(`skin:${slot}:${item.id}`);
  }

  // A locked look: its details open under its row (offer), or close.
  function toggle(key) {
    ui.offer = ui.offer === key ? null : key;
    ui.done = null;
    render(key);
  }

  // The current look on a few tiles; picking a tile reveal plays it here.
  function preview(save) {
    const row = el('div', { class: `look-preview${replay ? ' is-new' : ''}`, 'aria-hidden': 'true', 'data-tiles': save.settings.tiles },
      PREVIEW.map(([part, mark], i) => {
        const tile = el('span', { class: `tile is-cell is-${mark}`, lang: 'ja' }, part);
        tile.style.setProperty('--i', i);
        return tile;
      }));
    replay = false;
    return row;
  }

  // A look's example. Colours: three tiles in the skin's own colours, on
  // its own page colour. A reveal or effect: the current colours, moving.
  function example(slot, item, key) {
    if (slot === 'theme') {
      const c = window.TOKENS.resolve(item.id, window.TOKENS.look().scheme).color;
      return el('span', { class: 'swatch-preview', 'aria-hidden': 'true', style: { background: c.bg.page, borderColor: c.border.subtle } },
        SWATCH.map(([part, mark]) => el('span', {
          class: 'swatch-tile', lang: 'ja', style: { background: c.feedback[mark], color: c.feedback.text }
        }, part)));
    }
    // The same pieces a game plays (js/play/effects.js).
    const stage = slot === 'tiles'
      ? el('span', { class: 'swatch-preview reveal-stage', 'data-tiles': item.id }, miniTiles(SWATCH))
      : el('span', { class: 'swatch-preview fx-stage', 'data-effect': item.id },
        effectExample(item.id, { tiles: miniTiles(SOLVED), drawn: DRAWN, numeral: SEAL }));
    stage.setAttribute('aria-hidden', 'true');
    stage.dataset.play = key;
    if (ui.playing === key) stage.classList.add('is-playing');
    return stage;
  }

  // A look: its example, its name, and whether it's in use or how to get it.
  function lookCard(slot, item, save) {
    const key = `skin:${slot}:${item.id}`;
    const unlocked = isUnlocked(slot, item, save);
    const usable = unlocked && !item.soon;
    const on = save.settings[slot] === item.id;
    const name = t(`skin.${slot}.${item.id}`);
    const state = on ? t('looks.inUse') : !unlocked ? lockText(item.unlock) : item.soon ? t('shop.soon') : '';
    const shown = example(slot, item, key);
    const card = el('button', {
      class: `swatch${usable ? '' : ' is-locked'}${ui.offer === key ? ' is-open' : ''}`,
      type: 'button', 'data-key': key,
      'aria-pressed': String(on),
      'aria-expanded': usable ? null : String(ui.offer === key),
      'aria-label': state ? `${name}${sep()}${state}` : name,
      onclick: () => {
        ui.playing = key;
        return usable ? use(slot, item) : toggle(key);
      }
    },
      shown,
      el('span', { class: 'swatch-name', 'aria-hidden': 'true' }, name),
      state ? el('span', { class: `swatch-state${on ? ' is-on' : ''}`, 'aria-hidden': 'true' }, state) : null);
    if (slot !== 'theme' && hoverable()) card.addEventListener('mouseenter', () => play(shown));
    return card;
  }

  // The open locked look of a slot: how to get it, and Buy when it's for sale.
  function offerPanel(slot, save, values) {
    const item = (SKINS[slot.id] || []).find((x) => ui.offer === `skin:${slot.id}:${x.id}`);
    if (!item) return null;
    const key = `skin:${slot.id}:${item.id}`;
    const offer = skinOffer(slot.id, item, save);
    const name = t(`skin.${slot.id}.${item.id}`);
    const unlock = item.unlock;
    const lines = [];
    let action = null;
    const pay = () => {
      if (!buySkin(slot.id, item.id)) return;
      store.update((s) => { s.settings[slot.id] = item.id; });
      ui.offer = null;
      ui.playing = key;
      ui.done = { key: `slot:${slot.id}`, text: t('shop.boughtSkin', { name, left: store.points() }) };
      if (slot.id === 'theme') ctx.onLook();
      if (slot.id === 'tiles') replay = true;
      render(key);
      paid(unlock.cost);
    };
    if (offer.owned) lines.push(item.soon ? t('shop.ownedSoon') : t('shop.owned'));
    else if (unlock.type === 'achievement' && ACHIEVEMENT[unlock.id]) {
      const a = ACHIEVEMENT[unlock.id];
      const now = progress(a.test, values);
      lines.push(t('shop.earn', { name: t(`achievement.${a.id}.name`), desc: t(`achievement.${a.id}.desc`) }));
      if ('atLeast' in a.test) {
        lines.push(el('span', { class: 'offer-progress' }, meter(now), t('achievements.progress', { n: now.value, goal: now.goal })));
      }
    } else {
      if (offer.why) lines.push(whyText(offer));
      if (!item.soon) {
        action = buyButton(unlock.cost, offer.why, () => confirmBuy({
          icon: slot.icon, name, cost: unlock.cost, have: offer.have, onYes: pay
        }));
      }
    }
    return el('div', { class: 'offer', 'data-key': key },
      el('p', { class: 'offer-name' },
        el('span', {}, name),
        el('span', { class: 'offer-price' }, unlock.type === 'points' ? pts(unlock.cost) : t('shop.byAchievement'))),
      lines.map((line) => el('p', { class: 'offer-line' }, line)),
      action ? el('div', { class: 'btn-row' }, action) : null);
  }

  function looks(save, values) {
    return el('section', { class: 'section', 'aria-labelledby': 'looks-title' },
      el('h2', { class: 'section-title', id: 'looks-title' },
        t('looks.title'), el('span', { class: 'section-note' }, t('looks.note'))),
      el('div', { class: 'card looks-card' },
        preview(save),
        SLOTS.map((slot) => el('div', { class: 'look-slot', role: 'group', 'aria-labelledby': `slot-${slot.id}` },
          el('h3', { class: 'look-slot-name', id: `slot-${slot.id}` }, t(`slot.${slot.id}`)),
          el('div', { class: 'swatch-grid' }, SKINS[slot.id].map((item) => lookCard(slot.id, item, save))),
          offerPanel(slot, save, values),
          doneLine(`slot:${slot.id}`)))));
  }

  // ── Hints and powers ───────────────────────────────────────────────

  function powerCard(p, save) {
    const key = `power:${p.id}`;
    const offer = powerOffer(p.id, save);
    const name = t(`power.${p.id}.name`);
    const pay = () => {
      if (!buyPower(p.id)) return;
      ui.done = { key, text: t('shop.bought', { name, n: store.held()[p.id] || 0, left: store.points() }) };
      render(key);
      paid(p.cost);
    };
    const why = offer.why === 'not-for-sale' ? t('powers.earnedOnly') : whyText(offer, p.hold);
    return el('div', { class: 'card power', 'data-key': key },
      el('span', { class: 'power-icon', 'aria-hidden': 'true' }, p.icon),
      el('div', { class: 'power-body' },
        el('p', { class: 'power-name' },
          el('span', {}, name),
          el('span', { class: `power-held${offer.held ? ' is-held' : ''}` }, t('shop.have', { n: offer.held, hold: p.hold }))),
        el('p', { class: 'power-desc' }, t(`power.${p.id}.desc`)),
        el('p', { class: 'power-when' },
          [whenText(p.when), p.minLength > 1 ? t('powers.minLength', { n: p.minLength }) : null].filter(Boolean).join(sep())),
        doneLine(key),
        el('div', { class: 'power-buy' },
          p.cost === null ? null : buyButton(p.cost, offer.why, () => confirmBuy({
            icon: p.icon, name, cost: p.cost, have: offer.have, onYes: pay
          })),
          why ? el('span', { class: 'power-why' }, why) : null)));
  }

  function powers(save) {
    return el('section', { class: 'section', 'aria-labelledby': 'powers-title' },
      el('h2', { class: 'section-title', id: 'powers-title' },
        t('powers.title'), el('span', { class: 'section-note' }, t('powers.note'))),
      el('div', { class: 'power-list' }, POWERS.map((p) => powerCard(p, save))));
  }

  // ── Achievements ───────────────────────────────────────────────────

  // Each with its reward and the looks it unlocks; earned ones show when,
  // the rest how far along you are.
  function achievementCard(a, save, values) {
    const date = save.achievements[a.id];
    const now = progress(a.test, values);
    const reward = [
      ...amounts({ pts: (a.reward || {}).points || 0, hints: (a.reward || {}).power ? { [a.reward.power]: 1 } : {} }),
      ...skinsFor(a.id).map(({ slot, item }) => t('reward.unlocks', { name: t(`skin.${slot}.${item.id}`) }))
    ];
    let state = null;
    if (date) state = t('achievements.earned', { date });
    else if ('atLeast' in a.test) state = el('span', { class: 'offer-progress' }, meter(now), t('achievements.progress', { n: now.value, goal: now.goal }));
    else if (now.value !== null) state = t('achievements.best', { n: now.value });
    return el('div', { class: `card achievement${date ? ' is-earned' : ''}` },
      el('span', { class: 'achievement-icon', 'aria-hidden': 'true' }, date ? ECONOMY.rewardIcons.achievement : '○'),
      el('div', { class: 'achievement-body' },
        el('p', { class: 'achievement-name' }, t(`achievement.${a.id}.name`)),
        el('p', { class: 'achievement-desc' }, t(`achievement.${a.id}.desc`)),
        reward.length ? el('p', { class: 'achievement-reward' }, reward.join(sep())) : null,
        state ? el('p', { class: 'achievement-state' }, state) : null));
  }

  function achievements(save, values) {
    const shown = ACHIEVEMENTS.filter((a) => !a.retired || save.achievements[a.id]);
    const earned = shown.filter((a) => save.achievements[a.id]).length;
    return el('section', { class: 'section', 'aria-labelledby': 'achievements-title' },
      el('h2', { class: 'section-title', id: 'achievements-title' },
        t('achievements.title'), el('span', { class: 'section-note' }, t('achievements.note', { n: earned, total: shown.length }))),
      el('div', { class: 'achievement-list' }, shown.map((a) => achievementCard(a, save, values))));
  }

  root.replaceChildren(page);
  render();
  return {
    refresh: () => render(),
    destroy() {
      if (watcher) watcher.disconnect();
      if (confirmSheet && confirmSheet.open) confirmSheet.close();
    }
  };
}
