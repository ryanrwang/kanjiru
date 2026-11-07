/*
 * Kanjiru — start screen.
 *
 * For now this shows how a game reads, the modes, the skin picker and the
 * hint shop, all built from the catalogues in js/config/. The game screen
 * comes next. Nothing here hard-codes a mode, skin or power: add one to its
 * catalogue and it appears.
 */
import {
  MODES, SLOTS, SKINS, POWERS, ECONOMY, ACHIEVEMENT, validate
} from './js/registry.js';
import * as store from './js/store.js';

const TOKENS = window.TOKENS;
const save = store.load();
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

// ── Look: theme + scheme ─────────────────────────────────────────────

const ICONS = {
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
};

function applyLook() {
  TOKENS.applyLook(save.settings.theme, save.settings.scheme);
  renderSchemeToggle();
}

function renderSchemeToggle() {
  const btn = document.getElementById('scheme-toggle');
  const look = TOKENS.look();
  const dark = look.scheme === 'dark';
  const fixed = TOKENS.schemesOf(look.theme).length < 2;
  btn.innerHTML = dark ? ICONS.sun : ICONS.moon;
  btn.disabled = fixed;
  btn.setAttribute('aria-label', fixed
    ? 'This skin has one colour scheme only'
    : dark ? 'Switch to light mode' : 'Switch to dark mode');
  btn.title = btn.getAttribute('aria-label');
}

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

// ── Wallet ───────────────────────────────────────────────────────────

function renderWallet() {
  document.getElementById('wallet').textContent =
    `${ECONOMY.currency.icon} ${save.wallet.points} ${ECONOMY.currency.short}`;
}

// ── Unlock rules ─────────────────────────────────────────────────────

function isUnlocked(slot, item) {
  return item.unlock.type === 'free' || (save.unlocked[slot] || []).includes(item.id);
}

function unlockText(unlock) {
  if (unlock.type === 'points') return `🔒 ${unlock.cost} ${ECONOMY.currency.short}`;
  if (unlock.type === 'achievement') {
    const a = ACHIEVEMENT[unlock.id];
    return `🔒 ${a ? a.name : unlock.id}`;
  }
  return '';
}

function unlockHint(unlock) {
  if (unlock.type === 'points') return `Buy for ${unlock.cost} points (shop coming soon)`;
  if (unlock.type === 'achievement') {
    const a = ACHIEVEMENT[unlock.id];
    return a ? `Unlock: ${a.desc}` : 'Locked';
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
      'Guess the kanji from its parts.',
      el('small', {}, 'Each guess colours its parts: right spot, wrong spot, or not in the answer.')
    ),
    el('div', { class: 'demo', 'aria-hidden': 'true' },
      DEMO.map((row) => el('div', { class: 'demo-row' },
        el('span', { class: 'demo-guess kanji', lang: 'ja' }, row.guess),
        row.parts.map(([part, state]) => el('span', { class: `tile is-${state}`, lang: 'ja' }, part))
      ))
    ),
    el('p', { class: 'demo-legend' },
      el('span', {}, el('span', { class: 'legend-dot is-hit-bg' }), 'Right part, right spot'),
      el('span', {}, el('span', { class: 'legend-dot is-near-bg' }), 'Right part, wrong spot'),
      el('span', {}, el('span', { class: 'legend-dot is-miss-bg' }), 'Not in the answer')
    )
  );
}

function renderModes() {
  return el('section', { class: 'section', 'aria-labelledby': 'modes-title' },
    el('h2', { class: 'section-title', id: 'modes-title' },
      'Play', el('span', { class: 'section-note' }, 'Game screen coming next')),
    el('div', { class: 'mode-grid' },
      MODES.map((mode) => el('button', { class: 'card mode-card', type: 'button', disabled: true },
        el('span', { class: 'mode-kanji kanji', lang: 'ja', 'aria-hidden': 'true' }, mode.numeral),
        el('span', { class: 'mode-name' }, mode.name),
        el('span', { class: 'mode-meta' },
          `${mode.guesses} guesses · ×${mode.points} ${ECONOMY.currency.short}`)
      ))
    )
  );
}

function themeSwatch(item) {
  const unlocked = isUnlocked('theme', item);
  const t = TOKENS.resolve(item.id, TOKENS.look().scheme).color;
  const selected = save.settings.theme === item.id;
  return el('button', {
    class: `swatch${unlocked ? '' : ' is-locked'}`,
    type: 'button',
    'aria-pressed': String(selected),
    'aria-disabled': unlocked ? null : 'true',
    title: unlocked ? item.name : unlockHint(item.unlock),
    onclick: () => {
      if (!unlocked) return;
      store.update((s) => { s.settings.theme = item.id; });
      applyLook();
      renderLooks();
    }
  },
    el('span', { class: 'swatch-preview', style: { background: t.bg.page } },
      [t.text.accent, t.feedback.hit, t.feedback.near, t.feedback.miss].map((colour) =>
        el('span', { class: 'swatch-dot', style: { background: colour } }))
    ),
    el('span', { class: 'swatch-name' }, item.name),
    unlocked ? null : el('span', { class: 'swatch-lock' }, unlockText(item.unlock))
  );
}

function skinChip(slot, item) {
  const unlocked = isUnlocked(slot, item);
  return el('button', {
    class: `chip${unlocked ? '' : ' is-locked'}`,
    type: 'button',
    'aria-pressed': String(save.settings[slot] === item.id),
    'aria-disabled': unlocked ? null : 'true',
    title: unlocked ? item.name : unlockHint(item.unlock),
    onclick: () => {
      if (!unlocked) return;
      store.update((s) => { s.settings[slot] = item.id; });
      renderLooks();
    }
  }, item.name, unlocked ? null : ` ${unlockText(item.unlock)}`);
}

let looksSection = null;

function renderLooks() {
  const fresh = el('section', { class: 'section', 'aria-labelledby': 'looks-title' },
    el('h2', { class: 'section-title', id: 'looks-title' },
      'Looks', el('span', { class: 'section-note' }, 'Mix colours, tiles and effects')),
    SLOTS.map((slot) => el('div', { class: 'look-slot' },
      el('span', { class: 'look-slot-name' }, slot.name),
      slot.id === 'theme'
        ? el('div', { class: 'swatch-row' }, SKINS.theme.map(themeSwatch))
        : el('div', { class: 'chip-row' }, SKINS[slot.id].map((item) => skinChip(slot.id, item)))
    ))
  );
  if (looksSection) looksSection.replaceWith(fresh);
  looksSection = fresh;
  return fresh;
}

function whenText(when) {
  if (when.includes('before') && when.includes('during')) return 'Before or during a game';
  return when.includes('before') ? 'Before your first guess' : 'During a game';
}

function renderPowers() {
  return el('section', { class: 'section', 'aria-labelledby': 'powers-title' },
    el('h2', { class: 'section-title', id: 'powers-title' },
      'Hints & powers', el('span', { class: 'section-note' }, 'Earn or buy with points')),
    el('div', { class: 'power-list' },
      POWERS.map((p) => el('div', { class: 'card power' },
        el('span', { class: 'power-icon', 'aria-hidden': 'true' }, p.icon),
        el('div', { class: 'power-body' },
          el('div', { class: 'power-name' },
            el('span', {}, p.name),
            el('span', { class: 'power-cost' },
              p.cost === null ? 'Earned only' : `${p.cost} ${ECONOMY.currency.short}`)),
          el('p', { class: 'power-desc' }, p.desc),
          el('p', { class: 'power-when' },
            whenText(p.when),
            p.minLength > 1 ? ` · ${p.minLength}+ kanji modes` : '',
            ` · You have ${save.inventory[p.id] || 0}`)
        )
      ))
    )
  );
}

// ── Start ────────────────────────────────────────────────────────────

applyLook();
renderWallet();
app.append(renderHero(), renderModes(), renderLooks(), renderPowers());
