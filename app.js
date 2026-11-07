/*
 * Kanjiru — start screen.
 *
 * For now this shows how a game reads, the modes, the skin picker and the
 * hint shop, all built from the catalogues in js/config/ and the text in
 * js/i18n/. The game screen comes next. Nothing here hard-codes a mode,
 * skin, power or word of text: add one to its catalogue and it appears.
 */
import {
  MODES, SLOTS, SKINS, POWERS, ECONOMY, ACHIEVEMENT, validate
} from './js/registry.js';
import { t, setLang, nextLanguage } from './js/i18n.js';
import * as store from './js/store.js';

const TOKENS = window.TOKENS;
const save = store.load();
setLang(save.settings.lang);
validate();

// ── Tiny DOM helper ──────────────────────────────────────────────────

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) return;
    if (key === 'class') node.className = value;
    else if (key === 'style') Object.assign(node.style, value);
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  });
  children.flat().forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  });
  return node;
}

const pts = (n) => t('currency.amount', { n });

// ── Header: language, scheme, wallet ─────────────────────────────────

const ICONS = {
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
};

function applyLook() {
  TOKENS.applyLook(save.settings.theme, save.settings.scheme);
  renderHeader();
}

function renderHeader() {
  // Language: the button shows the language it switches to, in its own
  // script, so someone who can't read the current one can still find it.
  const next = nextLanguage();
  const langBtn = document.getElementById('lang-toggle');
  langBtn.textContent = next.label;
  langBtn.lang = next.id;
  langBtn.setAttribute('aria-label', next.switchTo);
  langBtn.title = next.switchTo;

  const schemeBtn = document.getElementById('scheme-toggle');
  const look = TOKENS.look();
  const dark = look.scheme === 'dark';
  const fixed = TOKENS.schemesOf(look.theme).length < 2;
  schemeBtn.innerHTML = dark ? ICONS.sun : ICONS.moon;
  schemeBtn.disabled = fixed;
  const label = fixed ? t('header.schemeFixed') : dark ? t('header.schemeLight') : t('header.schemeDark');
  schemeBtn.setAttribute('aria-label', label);
  schemeBtn.title = label;

  const wallet = document.getElementById('wallet');
  wallet.textContent = `${ECONOMY.currency.icon} ${pts(save.wallet.points)}`;
  wallet.title = `${t('header.points')} (${t('currency.name')})`;
}

document.getElementById('lang-toggle').addEventListener('click', () => {
  const next = nextLanguage().id;
  store.update((s) => { s.settings.lang = next; });
  setLang(next);
  renderAll();
});

document.getElementById('scheme-toggle').addEventListener('click', () => {
  const next = TOKENS.look().scheme === 'dark' ? 'light' : 'dark';
  store.update((s) => { s.settings.scheme = next; });
  applyLook();
  renderLooks();
});

// With no saved choice, follow the device as it switches.
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (save.settings.scheme === null) {
    applyLook();
    renderLooks();
  }
});

// ── Unlock rules ─────────────────────────────────────────────────────

function isUnlocked(slot, item) {
  return item.unlock.type === 'free' || (save.unlocked[slot] || []).includes(item.id);
}

function unlockText(unlock) {
  if (unlock.type === 'points') return t('looks.lockPoints', { cost: unlock.cost });
  if (unlock.type === 'achievement') {
    return t('looks.lockAchievement', { name: t(`achievement.${unlock.id}.name`) });
  }
  return '';
}

function unlockHint(unlock) {
  if (unlock.type === 'points') return t('looks.buyHint', { cost: unlock.cost });
  if (unlock.type === 'achievement' && ACHIEVEMENT[unlock.id]) {
    return t('looks.achievementHint', { desc: t(`achievement.${unlock.id}.desc`) });
  }
  return '';
}

// ── Sections ─────────────────────────────────────────────────────────

const app = document.getElementById('app');

// A worked example: answer 明 (日 left, 月 right).
const DEMO = [
  { guess: '間', parts: [['門', 'miss'], ['日', 'near']] },
  { guess: '時', parts: [['日', 'hit'], ['寺', 'miss']] },
  { guess: '明', parts: [['日', 'hit'], ['月', 'hit']] }
];

function renderHero() {
  return el('section', { class: 'card hero', 'aria-labelledby': 'hero-title' },
    el('p', { class: 'tagline', id: 'hero-title' },
      t('hero.title'),
      el('small', {}, t('hero.body'))
    ),
    el('div', { class: 'demo', 'aria-hidden': 'true' },
      DEMO.map((row) => el('div', { class: 'demo-row' },
        el('span', { class: 'demo-guess kanji', lang: 'ja' }, row.guess),
        row.parts.map(([part, state]) => el('span', { class: `tile is-${state}`, lang: 'ja' }, part))
      ))
    ),
    el('p', { class: 'demo-legend' },
      ['hit', 'near', 'miss'].map((state) =>
        el('span', {}, el('span', { class: `legend-dot is-${state}-bg` }), t(`hero.${state}`)))
    )
  );
}

function renderModes() {
  return el('section', { class: 'section', 'aria-labelledby': 'modes-title' },
    el('h2', { class: 'section-title', id: 'modes-title' },
      t('play.title'), el('span', { class: 'section-note' }, t('play.note'))),
    el('div', { class: 'mode-grid' },
      MODES.map((mode) => el('button', { class: 'card mode-card', type: 'button', disabled: true },
        el('span', { class: 'mode-kanji kanji', lang: 'ja', 'aria-hidden': 'true' }, mode.numeral),
        el('span', { class: 'mode-name' }, t(`mode.${mode.id}.name`)),
        el('span', { class: 'mode-meta' }, t('play.meta', { guesses: mode.guesses, mult: mode.points }))
      ))
    )
  );
}

function themeSwatch(item) {
  const unlocked = isUnlocked('theme', item);
  const colours = TOKENS.resolve(item.id, TOKENS.look().scheme).color;
  const name = t(`skin.theme.${item.id}`);
  return el('button', {
    class: `swatch${unlocked ? '' : ' is-locked'}`,
    type: 'button',
    'aria-pressed': String(save.settings.theme === item.id),
    'aria-disabled': unlocked ? null : 'true',
    title: unlocked ? name : unlockHint(item.unlock),
    onclick: () => {
      if (!unlocked) return;
      store.update((s) => { s.settings.theme = item.id; });
      applyLook();
      renderLooks();
    }
  },
    el('span', { class: 'swatch-preview', style: { background: colours.bg.page } },
      [colours.text.accent, colours.feedback.hit, colours.feedback.near, colours.feedback.miss].map((c) =>
        el('span', { class: 'swatch-dot', style: { background: c } }))
    ),
    el('span', { class: 'swatch-name' }, name),
    unlocked ? null : el('span', { class: 'swatch-lock' }, unlockText(item.unlock))
  );
}

function skinChip(slot, item) {
  const unlocked = isUnlocked(slot, item);
  const name = t(`skin.${slot}.${item.id}`);
  return el('button', {
    class: `chip${unlocked ? '' : ' is-locked'}`,
    type: 'button',
    'aria-pressed': String(save.settings[slot] === item.id),
    'aria-disabled': unlocked ? null : 'true',
    title: unlocked ? name : unlockHint(item.unlock),
    onclick: () => {
      if (!unlocked) return;
      store.update((s) => { s.settings[slot] = item.id; });
      renderLooks();
    }
  }, name, unlocked ? null : ` ${unlockText(item.unlock)}`);
}

let looksSection = null;

function renderLooks() {
  const fresh = el('section', { class: 'section', 'aria-labelledby': 'looks-title' },
    el('h2', { class: 'section-title', id: 'looks-title' },
      t('looks.title'), el('span', { class: 'section-note' }, t('looks.note'))),
    SLOTS.map((slot) => el('div', { class: 'look-slot' },
      el('span', { class: 'look-slot-name' }, t(`slot.${slot.id}`)),
      slot.id === 'theme'
        ? el('div', { class: 'swatch-row' }, SKINS.theme.map(themeSwatch))
        : el('div', { class: 'chip-row' }, SKINS[slot.id].map((item) => skinChip(slot.id, item)))
    ))
  );
  if (looksSection && looksSection.isConnected) looksSection.replaceWith(fresh);
  looksSection = fresh;
  return fresh;
}

function whenText(when) {
  if (when.includes('before') && when.includes('during')) return t('powers.whenBoth');
  return when.includes('before') ? t('powers.whenBefore') : t('powers.whenDuring');
}

function renderPowers() {
  return el('section', { class: 'section', 'aria-labelledby': 'powers-title' },
    el('h2', { class: 'section-title', id: 'powers-title' },
      t('powers.title'), el('span', { class: 'section-note' }, t('powers.note'))),
    el('div', { class: 'power-list' },
      POWERS.map((p) => el('div', { class: 'card power' },
        el('span', { class: 'power-icon', 'aria-hidden': 'true' }, p.icon),
        el('div', { class: 'power-body' },
          el('div', { class: 'power-name' },
            el('span', {}, t(`power.${p.id}.name`)),
            el('span', { class: 'power-cost' },
              p.cost === null ? t('powers.earnedOnly') : t('powers.cost', { cost: p.cost }))),
          el('p', { class: 'power-desc' }, t(`power.${p.id}.desc`)),
          el('p', { class: 'power-when' },
            [
              whenText(p.when),
              p.minLength > 1 ? t('powers.minLength', { n: p.minLength }) : null,
              t('powers.have', { n: save.inventory[p.id] || 0 })
            ].filter(Boolean).join(' · '))
        )
      ))
    )
  );
}

// ── Start ────────────────────────────────────────────────────────────

function renderAll() {
  renderHeader();
  app.replaceChildren(renderHero(), renderModes(), renderLooks(), renderPowers());
}

applyLook();
renderAll();
