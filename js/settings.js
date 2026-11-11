/*
 * Settings, a page of its own (#settings), opened from the gear in the
 * header; Close in the header goes back where you came from (app.js).
 *
 *   Language    the interface language (follows the device until picked)
 *   Appearance  light, dark, or the device's (a skin with one scheme fixes it)
 *   Hints       whether buying a hint asks first (Don't ask again turns it off)
 *   Home screen how to add Kanjiru to it (js/install.js), with the browser's
 *               own Install button where it offers one; gone once installed
 *   Move your progress to another device:
 *     Send       a one-time code from api/transfer.php, with a countdown
 *     Receive    enter a code from the other device
 *     Save text  the whole save as text to copy, or paste one in: a backup
 *                that needs no server
 *   Start over  reset achievements (one ask), or delete everything (three
 *               asks, the last one typed): js/confirm.js
 *   Debug       for testing: the answer on the game's keys and every hint
 *               free in a game (js/play/screen.js). Hidden until About's
 *               title is tapped quickly enough times (rules.js debugTaps),
 *               which turns it on; the same taps again turn it off and hide
 *               it (2026-11-10)
 *   About       a link to the About page and its credits (js/about.js)
 *
 * Home screen, Move your progress and Start over are folded to their titles
 * until opened (fold()), and stay as they were across redraws.
 *
 * The Hard and Guided switches are on the play card (app.js).
 *
 * A received save goes straight in on a device with no progress. On a device
 * with progress the player picks first: Merge both, or Replace this device
 * (rules in MERGE, js/store.js). The choice comes before the code is used,
 * so cancelling doesn't waste it.
 *
 *   const page = openSettings(root, { onChange });
 *   page.destroy();
 *
 * onChange() runs after anything changes the save (a save arrives, the
 * language, the scheme, debug), so the header can take it; then the page
 * redraws itself, in the language now set.
 */
import { t, has, lang, LANGUAGES } from './i18n.js';
import { ECONOMY, SKINS, ACHIEVEMENTS, RULES } from './registry.js';
import { toast } from './toast.js';
import { el, switchRow, segmented, smoothFold, crossfade } from './dom.js';
import * as store from './store.js';
import { sendSave, receiveSave, normalizeCode } from './transfer.js';
import { installed, platform, canPrompt, promptInstall, onInstallChange, installSteps } from './install.js';
import { isUnlocked } from './shop.js';
import { ask as confirm } from './confirm.js';
import { games } from './engine/stats.js';

let page = null;
let onChange = () => {};
let timer = null;
let countdown = null;

// What the page shows; render() draws it from here.
const ui = {
  send: { busy: false, code: null, expiresAt: 0 },
  receive: { code: '', busy: false },
  text: { mode: null, value: '' },   // mode: 'copy' or 'paste'
  ask: null,                         // { section, run(how) } while Merge / Replace shows
  open: {},                          // fold id → unfolded (fold())
  debugShown: false,                 // About's title tapped enough this visit
  status: {}                         // section → { kind: 'ok' | 'error', text }
};

export function openSettings(root, options = {}) {
  onChange = options.onChange || (() => {});
  page = el('section', { class: 'page settings-page', 'aria-labelledby': 'settings-title' });
  root.replaceChildren(page);
  ui.status = {};
  ui.ask = null;
  ui.debugShown = false;
  const off = onInstallChange(() => render());
  render();
  return {
    refresh: () => render(),
    destroy() {
      off();
      stopCountdown();
      page = null;
    }
  };
}

// ── Drawing ──────────────────────────────────────────────────────────

function render() {
  if (!page) return;
  const focused = document.activeElement && page.contains(document.activeElement)
    ? document.activeElement.dataset.id : null;
  const scrolled = window.scrollY;
  // Once shown, debug stays for this visit, even switched off.
  if (store.get().settings.debug) ui.debugShown = true;

  // Named by the header's crumb, 漢 › Settings (app.js), which is the
  // page's h1: so each section's title is an h2, and a part of one an h3.
  page.replaceChildren(el('div', { class: 'card sheet-body settings-card' },
    renderLanguage(),
    renderScheme(),
    renderHints(),
    renderInstall(),
    fold('transfer', 'transfer.title',
      el('p', { class: 'sheet-note' }, t('transfer.intro')),
      store.isPersistent() ? null : el('p', { class: 'transfer-status is-error' }, t('transfer.notSaving')),
      renderSend(),
      renderReceive(),
      renderText()),
    renderReset(),
    ui.debugShown ? renderDebug() : null,
    renderAbout()
  ));

  // Keep the scroll and keyboard focus where they were; when the choice
  // appears, move to it.
  window.scrollTo(0, scrolled);
  const target = ui.ask
    ? page.querySelector('.ask-option')
    : focused && page.querySelector(`[data-id="${focused}"]`);
  if (target) target.focus({ preventScroll: !ui.ask });
  startCountdown();
}

// A change to the save: the header takes it (app.js), then this page
// redraws, in the language now set.
function changed() {
  onChange();
  render();
}

// A section folded to its title until opened, the whole title row its
// toggle; it eases open and shut (js/dom.js smoothFold()). ui.open keeps
// each one as it was across redraws.
function fold(id, titleKey, ...body) {
  return smoothFold(el('details', {
    class: 'sheet-section sheet-fold', open: !!ui.open[id],
    ontoggle: (event) => { ui.open[id] = event.currentTarget.open; }
  },
  el('summary', { class: 'fold-summary', 'data-id': `${id}-fold` },
    el('h2', { class: 'sheet-section-title', id: `${id}-title` }, t(titleKey)),
    el('span', { class: 'fold-chevron', 'aria-hidden': 'true' })),
  el('div', { class: 'sheet-fold-body' }, body)));
}

// ── Language and appearance ──────────────────────────────────────────

function renderLanguage() {
  return el('section', { class: 'sheet-section sheet-row', 'aria-labelledby': 'lang-title' },
    el('h2', { class: 'sheet-section-title', id: 'lang-title' }, t('settings.language')),
    segmented({
      id: 'lang', label: t('settings.language'), value: lang(),
      options: LANGUAGES.map((l) => ({ id: l.id, label: l.name, lang: l.id })),
      onPick: (id) => crossfade(() => { store.update((s) => { s.settings.lang = id; s.settings.langAsked = true; }); changed(); })
    }));
}

// Auto follows the device. A skin with one scheme (Urushi) fixes it.
function renderScheme() {
  const look = window.TOKENS.look();
  const fixed = window.TOKENS.schemesOf(look.theme).length < 2;
  const saved = store.get().settings.scheme;
  return el('section', { class: 'sheet-section sheet-row', 'aria-labelledby': 'scheme-title' },
    el('h2', { class: 'sheet-section-title', id: 'scheme-title' }, t('settings.scheme.title')),
    segmented({
      id: 'scheme', label: t('settings.scheme.title'), disabled: fixed,
      value: fixed ? look.scheme : saved || 'auto',
      options: ['auto', 'light', 'dark'].map((id) => ({ id, label: t(`settings.scheme.${id}`) })),
      onPick: (id) => crossfade(() => { store.update((s) => { s.settings.scheme = id === 'auto' ? null : id; }); changed(); })
    }),
    fixed ? el('p', { class: 'sheet-note sheet-row-note' }, t('settings.scheme.fixed', { name: t(`skin.theme.${look.theme}`) })) : null);
}

// ── Hints ────────────────────────────────────────────────────────────

// Buying a hint asks first; the confirm's Don't ask again turns this off,
// and here it comes back on.
function renderHints() {
  return el('section', { class: 'sheet-section', 'aria-labelledby': 'hints-settings-title' },
    el('h2', { class: 'sheet-section-title', id: 'hints-settings-title' }, t('settings.hints.title')),
    switchRow({
      id: 'confirm-hint-buy', name: t('settings.hints.name'), note: t('settings.hints.body'),
      on: store.get().settings.confirmHintBuy !== false,
      onChange: (value) => { store.update((s) => { s.settings.confirmHintBuy = value; }); changed(); }
    }));
}

// ── Home screen ──────────────────────────────────────────────────────

// This phone's steps, or both phones' on a computer; the save text below
// is the backup either way.
function renderInstall() {
  if (installed()) return null;
  const p = platform();
  const both = p === 'other';
  return fold('install', 'install.title',
    el('p', { class: 'sheet-note' }, t(`install.why.${p}`)),
    (both ? ['ios', 'android'] : [p]).map((q) => (both
      ? el('div', { class: 'sheet-sub', role: 'group', 'aria-labelledby': `install-${q}-title` },
        el('h3', { class: 'sheet-sub-title', id: `install-${q}-title` }, t(`install.${q}.name`)),
        installSteps(q))
      : installSteps(q))),
    canPrompt() ? el('div', { class: 'btn-row' },
      el('button', {
        class: 'btn btn-primary', type: 'button', 'data-id': 'install',
        onclick: async () => { await promptInstall(); render(); }
      }, t('install.button'))) : null,
    el('p', { class: 'sheet-note' }, t('install.backup')));
}

// ── About ────────────────────────────────────────────────────────────

function renderAbout() {
  return el('section', { class: 'sheet-section sheet-row', 'aria-labelledby': 'about-link-title' },
    el('h2', { class: 'sheet-section-title about-title', id: 'about-link-title', onclick: tapAbout }, t('about.title')),
    // app.js opens it as a page, so Close there comes back here.
    el('a', { class: 'btn btn-secondary btn-small', href: '#about', 'data-id': 'about' }, t('about.open')));
}

// Debug's way in and out: RULES.debugTaps.count taps on About's title,
// all within RULES.debugTaps.within ms, show its section and turn it on;
// the same again turns it off and hides it. A toast says which.
let taps = [];
function tapAbout() {
  const { count, within } = RULES.debugTaps;
  const now = Date.now();
  taps = taps.filter((at) => now - at < within).concat(now);
  if (taps.length < count) return;
  taps = [];
  const on = !store.get().settings.debug;
  ui.debugShown = on;
  store.update((s) => { s.settings.debug = on; });
  toast({ icon: '🛠️', title: t(on ? 'settings.debug.unlocked' : 'settings.debug.locked') });
  changed();
}

// ── Starting over ────────────────────────────────────────────────────

function renderReset() {
  const row = (id, onclick) => el('div', { class: 'sheet-sub', role: 'group', 'aria-labelledby': `reset-${id}-title` },
    el('h3', { class: 'sheet-sub-title', id: `reset-${id}-title` }, t(`reset.${id}.name`)),
    el('p', { class: 'sheet-note' }, t(`reset.${id}.note`)),
    el('div', { class: 'btn-row' },
      el('button', { class: `btn ${id === 'all' ? 'btn-danger' : 'btn-secondary'}`, type: 'button', 'data-id': `reset-${id}`, onclick },
        t(`reset.${id}.button`))));
  return fold('reset', 'reset.title',
    row('achievements', resetAchievements),
    row('all', resetAll),
    renderStatus('reset'));
}

// The slots whose look in use is locked in a save (after a reset).
const lockedLooks = (save) => Object.keys(SKINS).filter((slot) => {
  const item = SKINS[slot].find((x) => x.id === save.settings[slot]);
  return item && !isUnlocked(slot, item, save);
});

async function resetAchievements() {
  const pick = await confirm({
    icon: ECONOMY.rewardIcons.achievement,
    title: t('reset.achievements.title'),
    body: [t('reset.achievements.body'), t('reset.achievements.keep')],
    options: [{ id: 'reset', name: t('reset.achievements.confirm'), desc: t('reset.achievements.confirmDesc'), danger: true }]
  });
  if (pick !== 'reset') return;
  store.resetAchievements(lockedLooks);
  ui.status.reset = { kind: 'ok', text: t('reset.achievements.done') };
  changed();
}

// Three asks: what goes, are you sure, then type the word. The last
// button says what follows: everything goes, and the page reloads on home,
// where a toast says it's done (2026-11-11, the user asked).
async function resetAll() {
  const save = store.get();
  const shown = ACHIEVEMENTS.filter((a) => !a.retired || save.achievements[a.id]);
  const counts = {
    games: games(save.history).length,
    points: store.points(save),
    hints: Object.values(store.held(save)).reduce((a, n) => a + n, 0),
    achievements: shown.filter((a) => save.achievements[a.id]).length
  };
  const of = 3;
  const one = await confirm({
    step: { n: 1, of }, icon: '⚠️',
    title: t('reset.all.title1'),
    body: [t('reset.all.body1'), t('reset.all.counts', counts), t('reset.all.stays')],
    options: [{ id: 'next', name: t('reset.all.next'), desc: t('reset.all.nextDesc') }]
  });
  if (one !== 'next') return;
  const two = await confirm({
    step: { n: 2, of }, icon: '⚠️',
    title: t('reset.all.title2'),
    body: [t('reset.all.body2'), t('reset.all.backup')],
    options: [{ id: 'sure', name: t('reset.all.sure'), desc: t('reset.all.sureDesc', { word: t('reset.all.word') }), danger: true }]
  });
  if (two !== 'sure') return;
  const word = t('reset.all.word');
  const three = await confirm({
    step: { n: 3, of }, icon: '⚠️',
    title: t('reset.all.title3', { word }),
    typed: { word, also: ['DELETE'], label: t('reset.all.typeLabel'), hint: t('reset.all.typeHint', { word }) },
    options: [{ id: 'delete', name: t('reset.all.delete'), desc: t('reset.all.deleteDesc'), danger: true }]
  });
  if (three !== 'delete') return;
  store.resetAll();
  store.markStartedOver();
  // Home, loaded afresh at the top: no hash, so no page of its own to come
  // back to, and scrolled up first, since a reload keeps the scroll.
  history.replaceState(null, '', location.pathname + location.search);
  window.scrollTo(0, 0);
  location.reload();
}

// ── Debug ────────────────────────────────────────────────────────────

// No Add points: every hint is free in a game in debug mode (the user
// took the button out, 2026-11-10).
function renderDebug() {
  const on = !!store.get().settings.debug;
  return el('section', { class: 'sheet-section', 'aria-labelledby': 'debug-title' },
    el('h2', { class: 'sheet-section-title', id: 'debug-title' }, t('settings.debug.title')),
    switchRow({
      id: 'debug', name: t('settings.debug.name'), note: t('settings.debug.body'), on,
      onChange: (value) => {
        store.update((s) => { s.settings.debug = value; });
        changed();
      }
    }));
}

// ── Moving devices ───────────────────────────────────────────────────

function section(id, ...content) {
  return el('div', { class: 'sheet-sub', role: 'group', 'aria-labelledby': `transfer-${id}-title` },
    el('h3', { class: 'sheet-sub-title', id: `transfer-${id}-title` }, t(`transfer.${id}.title`)),
    el('p', { class: 'sheet-note' }, t(`transfer.${id}.body`)),
    content,
    ui.ask && ui.ask.section === id ? renderAsk() : null,
    renderStatus(id)
  );
}

// A section's message; it fades in when it's news (the text each
// section last showed).
const news = { status: {}, code: null };

function statusClass(id, status) {
  const fresh = !!status && news.status[id] !== status.text;
  news.status[id] = status ? status.text : null;
  return `transfer-status${status ? ` is-${status.kind}` : ''}${fresh ? ' is-new' : ''}`;
}

function renderStatus(id) {
  const status = ui.status[id];
  return el('p', {
    class: statusClass(id, status),
    'data-status': id, role: 'status', 'aria-live': 'polite'
  }, status ? status.text : '');
}

// Updates one section's message without redrawing (keeps text selected).
function setStatus(id, status) {
  ui.status[id] = status;
  const node = page && page.querySelector(`[data-status="${id}"]`);
  if (!node) return;
  node.className = '';
  void node.offsetWidth;   // so its fade starts again
  node.className = statusClass(id, status);
  node.textContent = status ? status.text : '';
}

function errorStatus(error) {
  const key = `transfer.errors.${error && error.code}`;
  return { kind: 'error', text: has('en', key) ? t(key) : t('transfer.errors.server') };
}

// ── Send ─────────────────────────────────────────────────────────────

function renderSend() {
  const s = ui.send;
  const live = !!s.code && Date.now() < s.expiresAt;
  const half = s.code ? Math.ceil(s.code.length / 2) : 0;
  countdown = live ? el('p', { class: 'transfer-countdown' }) : null;
  // A new code fades in; the same one drawn again stays still.
  const fresh = live && news.code !== s.code;
  news.code = live ? s.code : null;
  return section('send',
    live ? el('p', {
      class: `transfer-code${fresh ? ' is-new' : ''}`, lang: 'en',
      'aria-label': t('transfer.send.codeLabel', { code: s.code.split('').join(' ') })
    }, el('span', {}, s.code.slice(0, half)), el('span', {}, s.code.slice(half))) : null,
    countdown,
    el('div', { class: 'btn-row' },
      el('button', {
        class: `btn ${live ? 'btn-secondary' : 'btn-primary'}`, type: 'button', 'data-id': 'send',
        disabled: s.busy, onclick: doSend
      }, s.busy ? t('transfer.send.busy') : t(live ? 'transfer.send.again' : 'transfer.send.button'))
    )
  );
}

async function doSend() {
  ui.send.busy = true;
  ui.status.send = null;
  render();
  try {
    const { code, expiresIn } = await sendSave(store.exportSave());
    ui.send.code = code;
    ui.send.expiresAt = Date.now() + expiresIn * 1000;
  } catch (error) {
    ui.status.send = errorStatus(error);
  }
  ui.send.busy = false;
  render();
}

const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

function startCountdown() {
  stopCountdown();
  if (!ui.send.code) return;
  const tick = () => {
    const left = Math.max(0, Math.ceil((ui.send.expiresAt - Date.now()) / 1000));
    if (left === 0) {
      ui.send.code = null;
      ui.status.send = { kind: 'error', text: t('transfer.send.expired') };
      render();
      return;
    }
    if (countdown) countdown.textContent = t('transfer.send.expires', { time: clock(left) });
  };
  tick();
  if (ui.send.code) timer = setInterval(tick, 1000);
}

function stopCountdown() {
  clearInterval(timer);
  timer = null;
}

// ── Receive ──────────────────────────────────────────────────────────

function renderReceive() {
  const r = ui.receive;
  return section('receive',
    el('div', { class: 'field-row' },
      el('input', {
        class: 'code-input', type: 'text', 'data-id': 'code', value: r.code,
        placeholder: t('transfer.receive.placeholder'), 'aria-label': t('transfer.receive.label'),
        autocomplete: 'off', autocapitalize: 'characters', autocorrect: 'off',
        spellcheck: 'false', enterkeyhint: 'go', disabled: r.busy,
        oninput: (event) => { r.code = event.target.value; },
        onkeydown: (event) => { if (event.key === 'Enter' && !event.isComposing) startReceive(); }
      }),
      el('button', {
        class: 'btn btn-primary', type: 'button', 'data-id': 'receive',
        disabled: r.busy, onclick: startReceive
      }, t(r.busy ? 'transfer.receive.busy' : 'transfer.receive.button'))
    )
  );
}

function startReceive() {
  if (ui.receive.busy) return;
  const code = normalizeCode(ui.receive.code);
  if (!code) {
    setStatus('receive', errorStatus({ code: 'bad-code' }));
    return;
  }
  setStatus('receive', null);
  ask('receive', async (how) => {
    ui.receive.busy = true;
    render();
    try {
      apply('receive', await receiveSave(code), how);
      ui.receive.code = '';
    } catch (error) {
      ui.status.receive = errorStatus(error);
    }
    ui.receive.busy = false;
    render();
  });
}

// ── Save text ────────────────────────────────────────────────────────

function renderText() {
  const x = ui.text;
  return section('text',
    el('div', { class: 'btn-row' },
      el('button', { class: 'btn btn-secondary', type: 'button', 'data-id': 'copy', onclick: doCopy },
        t('transfer.text.copy')),
      el('button', {
        class: 'btn btn-secondary', type: 'button', 'data-id': 'paste',
        onclick: () => {
          ui.text = { mode: 'paste', value: '' };
          ui.status.text = null;
          ui.ask = null;
          render();
          page.querySelector('.save-text').focus();
        }
      }, t('transfer.text.paste'))
    ),
    x.mode === 'copy'
      ? el('textarea', {
        class: 'save-text', readonly: true, rows: 4, 'data-id': 'save-text',
        'aria-label': t('transfer.text.copyLabel'), spellcheck: 'false'
      }, store.exportSave())
      : null,
    x.mode === 'paste'
      ? [
        el('textarea', {
          class: 'save-text', rows: 4, 'data-id': 'save-text',
          'aria-label': t('transfer.text.pasteLabel'), placeholder: t('transfer.text.pasteLabel'),
          spellcheck: 'false', autocomplete: 'off',
          oninput: (event) => { x.value = event.target.value; }
        }, x.value),
        el('div', { class: 'btn-row' },
          el('button', { class: 'btn btn-primary', type: 'button', 'data-id': 'load', onclick: startPaste },
            t('transfer.text.load')))
      ]
      : null
  );
}

async function doCopy() {
  ui.text = { mode: 'copy', value: '' };
  ui.status.text = null;
  ui.ask = null;
  render();
  const area = page && page.querySelector('.save-text');
  let copied = false;
  // The clipboard API needs https; on plain http fall back to the old way.
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(store.exportSave());
      copied = true;
    }
  } catch (e) { copied = false; }
  if (area) {
    area.focus();
    area.select();
    if (!copied) {
      try { copied = document.execCommand('copy'); } catch (e) { copied = false; }
    }
  }
  setStatus('text', copied
    ? { kind: 'ok', text: t('transfer.text.copied') }
    : { kind: 'error', text: t('transfer.text.copyManually') });
}

function startPaste() {
  const text = ui.text.value;
  try {
    store.readSave(text);
  } catch (error) {
    setStatus('text', errorStatus(error));
    return;
  }
  setStatus('text', null);
  ask('text', (how) => {
    try {
      apply('text', text, how);
      ui.text = { mode: null, value: '' };
    } catch (error) {
      ui.status.text = errorStatus(error);
    }
    render();
  });
}

// ── Merge or replace ─────────────────────────────────────────────────

// Runs run('replace') straight away on a device with no progress;
// otherwise shows the choice and runs it with the player's pick.
function ask(sectionId, run) {
  if (!store.hasProgress()) {
    run('replace');
    return;
  }
  ui.ask = { section: sectionId, run };
  render();
}

function renderAsk() {
  const option = (how) => el('button', {
    class: `ask-option is-${how}`, type: 'button', 'data-id': `ask-${how}`,
    onclick: () => {
      const { run } = ui.ask;
      ui.ask = null;
      run(how);
    }
  },
    el('span', { class: 'ask-option-name' }, t(`transfer.ask.${how}`)),
    el('span', { class: 'ask-option-desc' }, t(`transfer.ask.${how}Desc`))
  );
  return el('div', { class: 'ask', role: 'group', 'aria-labelledby': 'ask-title' },
    el('p', { class: 'ask-title', id: 'ask-title' }, t('transfer.ask.title')),
    el('div', { class: 'ask-options' }, option('merge'), option('replace')),
    el('button', {
      class: 'btn btn-ghost', type: 'button', 'data-id': 'ask-cancel',
      onclick: () => { ui.ask = null; render(); }
    }, t('transfer.ask.cancel'))
  );
}

// Puts a received save in, then lets the page redraw. The message comes
// after the redraw, which may have switched to the save's language.
function apply(sectionId, text, how) {
  store.importSave(text, how);
  onChange();
  ui.status[sectionId] = { kind: 'ok', text: t(how === 'merge' ? 'transfer.done.merged' : 'transfer.done.received') };
}
