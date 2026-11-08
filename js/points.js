/*
 * The Points page (#points, opened by the points in the header): the
 * wallet, the looks with examples, the hints and powers, and the
 * achievements. Buying happens in place, in two taps: Buy, then the confirm
 * that names the price and what's left (rules in js/shop.js).
 *
 *   const page = openPoints(root, { onBack, onLook, onWallet });
 *   page.refresh();   // the scheme changed
 *   page.destroy();
 *
 *   onBack()     leave the page
 *   onLook()     a look changed: apply it
 *   onWallet()   the points changed: redraw the header
 */
import { POWERS, SLOTS, SKINS, ECONOMY, ACHIEVEMENTS, ACHIEVEMENT } from './registry.js';
import { t } from './i18n.js';
import { el } from './dom.js';
import * as store from './store.js';
import { isUnlocked, powerOffer, skinOffer, buyPower, buySkin } from './shop.js';
import { stats, progress } from './engine/stats.js';
import { localDate } from './engine/daily.js';
import { amounts, skinsFor } from './play/rewards.js';
import { bump } from './toast.js';

const BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
const pts = (n) => t('currency.amount', { n });
const sep = () => t('reward.sep');

// How a guess reads in a look: the preview at the top of Looks, and three
// tiles in each colour swatch.
const PREVIEW = [['口', 'miss'], ['日', 'near'], ['寸', 'hit'], ['門', 'near'], ['日', 'hit']];
const SWATCH = [['日', 'hit'], ['土', 'near'], ['寸', 'miss']];

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

export function openPoints(root, ctx) {
  // offer: the locked look whose details show; confirm: the item asking
  // "Spend …?"; done: { key, text } after a purchase or a change.
  const ui = { offer: null, confirm: null, done: null };
  const page = el('section', { class: 'page points-page', 'aria-labelledby': 'points-title' });
  let replay = false;   // the preview plays its tile reveal on the next draw

  function render(focusKey = null) {
    const save = store.get();
    const values = stats(save.history, { today: localDate() });
    page.replaceChildren(head(), wallet(save, values), looks(save, values), powers(save), achievements(save, values));
    if (focusKey) {
      const target = page.querySelector(`[data-key="${focusKey}"] [data-focus]`)
        || page.querySelector(`[data-key="${focusKey}"] button:not(:disabled)`)
        || page.querySelector(`button[data-key="${focusKey}"]`);
      if (target) target.focus({ preventScroll: true });
    }
  }

  // ── Head and wallet ────────────────────────────────────────────────

  function head() {
    const back = el('button', {
      class: 'icon-btn', type: 'button', title: t('game.home'), 'aria-label': t('game.home'), onclick: ctx.onBack
    });
    back.innerHTML = BACK;
    return el('header', { class: 'page-head' },
      back, el('h2', { class: 'page-title', id: 'points-title' }, t('points.title')));
  }

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

  // ── Buying, in two taps ────────────────────────────────────────────

  function confirmRow(key, { cost, have, name }, pay) {
    return el('div', { class: 'shop-confirm' },
      el('p', {}, t('shop.confirm', { cost, have, left: have - cost, name })),
      el('div', { class: 'btn-row' },
        el('button', { class: 'btn btn-primary btn-small', type: 'button', 'data-focus': '', onclick: pay },
          t('shop.confirmYes', { cost })),
        el('button', {
          class: 'btn btn-ghost btn-small', type: 'button',
          onclick: () => { ui.confirm = null; render(key); }
        }, t('shop.cancel'))));
  }

  function buyButton(key, cost, why) {
    return el('button', {
      class: 'btn btn-secondary btn-small', type: 'button', disabled: !!why,
      onclick: () => { ui.confirm = key; ui.done = null; render(key); }
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
    ui.confirm = null;
    ui.done = null;
    if (slot === 'theme') ctx.onLook();
    if (slot === 'tiles') replay = true;
    render(`skin:${slot}:${item.id}`);
  }

  // A locked look: its details open under its row (offer), or close.
  function toggle(key) {
    ui.offer = ui.offer === key ? null : key;
    ui.confirm = null;
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

  function swatch(item, save) {
    const key = `skin:theme:${item.id}`;
    const unlocked = isUnlocked('theme', item, save);
    const on = save.settings.theme === item.id;
    const c = window.TOKENS.resolve(item.id, window.TOKENS.look().scheme).color;
    const name = t(`skin.theme.${item.id}`);
    const state = on ? t('looks.inUse') : unlocked ? '' : lockText(item.unlock);
    return el('button', {
      class: `swatch${unlocked ? '' : ' is-locked'}${ui.offer === key ? ' is-open' : ''}`,
      type: 'button', 'data-key': key,
      'aria-pressed': String(on),
      'aria-expanded': unlocked ? null : String(ui.offer === key),
      'aria-label': state ? `${name}${sep()}${state}` : name,
      onclick: () => (unlocked ? use('theme', item) : toggle(key))
    },
      el('span', { class: 'swatch-preview', 'aria-hidden': 'true', style: { background: c.bg.page, borderColor: c.border.subtle } },
        SWATCH.map(([part, mark]) => el('span', {
          class: 'swatch-tile', lang: 'ja', style: { background: c.feedback[mark], color: c.feedback.text }
        }, part))),
      el('span', { class: 'swatch-name', 'aria-hidden': 'true' }, name),
      state ? el('span', { class: `swatch-state${on ? ' is-on' : ''}`, 'aria-hidden': 'true' }, state) : null);
  }

  function chip(slot, item, save) {
    const key = `skin:${slot.id}:${item.id}`;
    const unlocked = isUnlocked(slot.id, item, save);
    const usable = unlocked && !item.soon;
    const name = t(`skin.${slot.id}.${item.id}`);
    const note = !unlocked ? lockText(item.unlock) : item.soon ? t('shop.soon') : '';
    return el('button', {
      class: `chip${usable ? '' : ' is-locked'}${ui.offer === key ? ' is-open' : ''}`,
      type: 'button', 'data-key': key,
      'aria-pressed': String(save.settings[slot.id] === item.id),
      'aria-expanded': usable ? null : String(ui.offer === key),
      onclick: () => (usable ? use(slot.id, item) : toggle(key))
    }, name, note ? el('span', { class: 'chip-note' }, note) : null);
  }

  // The open locked look of a slot: how to get it, and Buy when it's for sale.
  function offerPanel(slot, save, values) {
    const item = (SKINS[slot.id] || []).find((x) => ui.offer === `skin:${slot.id}:${x.id}`);
    if (!item) return null;
    const key = `skin:${slot.id}:${item.id}`;
    const offer = skinOffer(slot.id, item, save);
    const name = t(`skin.${slot.id}.${item.id}`);
    const unlock = item.unlock;
    const confirming = ui.confirm === key && !offer.why;
    const lines = [];
    let action = null;
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
      if (!item.soon && !confirming) action = buyButton(key, unlock.cost, offer.why);
    }
    const pay = () => {
      if (!buySkin(slot.id, item.id)) return;
      store.update((s) => { s.settings[slot.id] = item.id; });
      ui.confirm = null;
      ui.offer = null;
      ui.done = { key: `slot:${slot.id}`, text: t('shop.boughtSkin', { name, left: store.points() }) };
      if (slot.id === 'theme') ctx.onLook();
      if (slot.id === 'tiles') replay = true;
      render(key);
      paid(unlock.cost);
    };
    return el('div', { class: 'offer', 'data-key': key },
      el('p', { class: 'offer-name' },
        el('span', {}, name),
        el('span', { class: 'offer-price' }, unlock.type === 'points' ? pts(unlock.cost) : t('shop.byAchievement'))),
      lines.map((line) => el('p', { class: 'offer-line' }, line)),
      confirming ? confirmRow(key, { cost: unlock.cost, have: offer.have, name }, pay) : null,
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
          slot.id === 'theme'
            ? el('div', { class: 'swatch-grid' }, SKINS.theme.map((item) => swatch(item, save)))
            : el('div', { class: 'chip-row' }, SKINS[slot.id].map((item) => chip(slot, item, save))),
          offerPanel(slot, save, values),
          doneLine(`slot:${slot.id}`)))));
  }

  // ── Hints and powers ───────────────────────────────────────────────

  function powerCard(p, save) {
    const key = `power:${p.id}`;
    const offer = powerOffer(p.id, save);
    const name = t(`power.${p.id}.name`);
    const confirming = ui.confirm === key && !offer.why;
    const pay = () => {
      if (!buyPower(p.id)) return;
      ui.confirm = null;
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
        confirming ? confirmRow(key, { cost: p.cost, have: offer.have, name }, pay) : null,
        doneLine(key),
        confirming ? null : el('div', { class: 'power-buy' },
          p.cost === null ? null : buyButton(key, p.cost, offer.why),
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
  return { refresh: () => render(), destroy() {} };
}
