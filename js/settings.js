/*
 * Settings panel, opened from the gear in the header.
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
 *   Debug       for testing: the answer on the game's keys (js/play/screen.js)
 *               and points to add, as their own ledger entries ('debug')
 *   About       a link to the About page and its credits (js/about.js)
 *
 * The Hard and Guided switches are on the play card (app.js).
 *
 * A received save goes straight in on a device with no progress. On a device
 * with progress the player picks first: Merge both, or Replace this device
 * (rules in MERGE, js/store.js). The choice comes before the code is used,
 * so cancelling doesn't waste it.
 *
 * openSettings({ onChange }) calls onChange() after anything changes the
 * save (a save arrives, the language, the scheme, debug), so the page can
 * redraw.
 */
import { t, has, lang, LANGUAGES } from './i18n.js';
import { ECONOMY } from './registry.js';
import { el, switchRow, segmented } from './dom.js';
import * as store from './store.js';
import { sendSave, receiveSave, normalizeCode } from './transfer.js';
import { installed, platform, canPrompt, promptInstall, onInstallChange, installSteps } from './install.js';

const ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

let dialog = null;
let onChange = () => {};
let timer = null;
let countdown = null;

// What the panel shows; render() draws it from here.
const ui = {
  send: { busy: false, code: null, expiresAt: 0 },
  receive: { code: '', busy: false },
  text: { mode: null, value: '' },   // mode: 'copy' or 'paste'
  ask: null,                         // { section, run(how) } while Merge / Replace shows
  status: {}                         // section → { kind: 'ok' | 'error', text }
};

export function openSettings(options = {}) {
  if (options.onChange) onChange = options.onChange;
  if (!dialog) {
    dialog = el('dialog', { class: 'sheet', 'aria-labelledby': 'settings-title' });
    // A click on the backdrop lands on the dialog itself: close.
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', stopCountdown);
    document.body.append(dialog);
    onInstallChange(() => { if (dialog.open) render(); });
  }
  ui.status = {};
  ui.ask = null;
  render();
  dialog.showModal();
}

// ── Drawing ──────────────────────────────────────────────────────────

function render() {
  if (!dialog) return;
  const focused = document.activeElement && dialog.contains(document.activeElement)
    ? document.activeElement.dataset.id : null;
  const scrolled = dialog.scrollTop;

  const close = el('button', {
    class: 'icon-btn', type: 'button', 'data-id': 'close',
    'aria-label': t('settings.close'), title: t('settings.close'),
    onclick: () => dialog.close()
  });
  close.innerHTML = ICON_CLOSE;

  dialog.replaceChildren(el('div', { class: 'sheet-body' },
    el('header', { class: 'sheet-head' },
      el('h2', { class: 'sheet-title', id: 'settings-title' }, t('settings.title')),
      close
    ),
    renderLanguage(),
    renderScheme(),
    renderHints(),
    renderInstall(),
    el('section', { class: 'sheet-section', 'aria-labelledby': 'transfer-title' },
      el('h3', { class: 'sheet-section-title', id: 'transfer-title' }, t('transfer.title')),
      el('p', { class: 'sheet-note' }, t('transfer.intro')),
      store.isPersistent() ? null : el('p', { class: 'transfer-status is-error' }, t('transfer.notSaving')),
      renderSend(),
      renderReceive(),
      renderText()),
    renderDebug(),
    renderAbout()
  ));

  // Keep the scroll and keyboard focus where they were; when the choice
  // appears, move to it.
  dialog.scrollTop = scrolled;
  const target = ui.ask
    ? dialog.querySelector('.ask-option')
    : focused && dialog.querySelector(`[data-id="${focused}"]`);
  if (target) target.focus();
  startCountdown();
}

// A change to the save: the page redraws, then the panel, in the language
// now set.
function changed() {
  onChange();
  render();
}

// ── Language and appearance ──────────────────────────────────────────

function renderLanguage() {
  return el('section', { class: 'sheet-section sheet-row', 'aria-labelledby': 'lang-title' },
    el('h3', { class: 'sheet-section-title', id: 'lang-title' }, t('settings.language')),
    segmented({
      id: 'lang', label: t('settings.language'), value: lang(),
      options: LANGUAGES.map((l) => ({ id: l.id, label: l.name, lang: l.id })),
      onPick: (id) => { store.update((s) => { s.settings.lang = id; }); changed(); }
    }));
}

// Auto follows the device. A skin with one scheme (Urushi) fixes it.
function renderScheme() {
  const look = window.TOKENS.look();
  const fixed = window.TOKENS.schemesOf(look.theme).length < 2;
  const saved = store.get().settings.scheme;
  return el('section', { class: 'sheet-section sheet-row', 'aria-labelledby': 'scheme-title' },
    el('h3', { class: 'sheet-section-title', id: 'scheme-title' }, t('settings.scheme.title')),
    segmented({
      id: 'scheme', label: t('settings.scheme.title'), disabled: fixed,
      value: fixed ? look.scheme : saved || 'auto',
      options: ['auto', 'light', 'dark'].map((id) => ({ id, label: t(`settings.scheme.${id}`) })),
      onPick: (id) => { store.update((s) => { s.settings.scheme = id === 'auto' ? null : id; }); changed(); }
    }),
    fixed ? el('p', { class: 'sheet-note sheet-row-note' }, t('settings.scheme.fixed', { name: t(`skin.theme.${look.theme}`) })) : null);
}

// ── Hints ────────────────────────────────────────────────────────────

// Buying a hint asks first; the confirm's Don't ask again turns this off,
// and here it comes back on.
function renderHints() {
  return el('section', { class: 'sheet-section', 'aria-labelledby': 'hints-settings-title' },
    el('h3', { class: 'sheet-section-title', id: 'hints-settings-title' }, t('settings.hints.title')),
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
  return el('section', { class: 'sheet-section', 'aria-labelledby': 'install-title' },
    el('h3', { class: 'sheet-section-title', id: 'install-title' }, t('install.title')),
    el('p', { class: 'sheet-note' }, t(`install.why.${p}`)),
    (both ? ['ios', 'android'] : [p]).map((q) => (both
      ? el('div', { class: 'sheet-sub', role: 'group', 'aria-labelledby': `install-${q}-title` },
        el('h4', { class: 'sheet-sub-title', id: `install-${q}-title` }, t(`install.${q}.name`)),
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
    el('h3', { class: 'sheet-section-title', id: 'about-link-title' }, t('about.title')),
    el('a', {
      class: 'btn btn-secondary btn-small', href: '#about', 'data-id': 'about',
      onclick: () => dialog.close()
    }, t('about.open')));
}

// ── Debug ────────────────────────────────────────────────────────────

function renderDebug() {
  const on = !!store.get().settings.debug;
  return el('section', { class: 'sheet-section', 'aria-labelledby': 'debug-title' },
    el('h3', { class: 'sheet-section-title', id: 'debug-title' }, t('settings.debug.title')),
    switchRow({
      id: 'debug', name: t('settings.debug.name'), note: t('settings.debug.body'), on,
      onChange: (value) => {
        store.update((s) => { s.settings.debug = value; });
        ui.status.debug = null;
        changed();
      }
    }),
    on ? el('div', { class: 'btn-row' },
      el('button', { class: 'btn btn-secondary', type: 'button', 'data-id': 'debug-points', onclick: addPoints },
        t('settings.debug.add', { n: ECONOMY.debugPoints }))) : null,
    renderStatus('debug'));
}

function addPoints() {
  store.update((s) => store.enter(s, 'debug', { pts: ECONOMY.debugPoints }));
  ui.status.debug = { kind: 'ok', text: t('settings.debug.added', { n: ECONOMY.debugPoints, total: store.points() }) };
  changed();
}

// ── Moving devices ───────────────────────────────────────────────────

function section(id, ...content) {
  return el('div', { class: 'sheet-sub', role: 'group', 'aria-labelledby': `transfer-${id}-title` },
    el('h4', { class: 'sheet-sub-title', id: `transfer-${id}-title` }, t(`transfer.${id}.title`)),
    el('p', { class: 'sheet-note' }, t(`transfer.${id}.body`)),
    content,
    ui.ask && ui.ask.section === id ? renderAsk() : null,
    renderStatus(id)
  );
}

function renderStatus(id) {
  const status = ui.status[id];
  return el('p', {
    class: `transfer-status${status ? ` is-${status.kind}` : ''}`,
    'data-status': id, role: 'status', 'aria-live': 'polite'
  }, status ? status.text : '');
}

// Updates one section's message without redrawing (keeps text selected).
function setStatus(id, status) {
  ui.status[id] = status;
  const node = dialog && dialog.querySelector(`[data-status="${id}"]`);
  if (!node) return;
  node.className = `transfer-status${status ? ` is-${status.kind}` : ''}`;
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
  return section('send',
    live ? el('p', {
      class: 'transfer-code', lang: 'en',
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
          dialog.querySelector('.save-text').focus();
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
  const area = dialog.querySelector('.save-text');
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
