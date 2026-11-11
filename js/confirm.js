/*
 * A modal that asks before something that can't be undone: ending a game,
 * resetting achievements, deleting everything.
 *
 *   const pick = await ask({ title, body, options, cancel });
 *   // the picked option's id, or null when cancelled (Cancel, Esc, the backdrop)
 *
 *   icon     optional, before the title
 *   title    the question
 *   body     optional text, or a list of lines
 *   options  [{ id, name, desc, danger, lang }]: each a big button with what
 *            it does under its name; danger shows its name in the accent
 *            colour; lang, when its words are in a language of their own
 *   typed    optional { word, also, label, hint }: then the options stay off
 *            until the word (or one in also) is typed, any case, for the
 *            last step of a reset
 *   step     optional { n, of }: "Step 2 of 3", for a run of asks
 *   closeX   true: an × in the corner in place of the Cancel button (End
 *            game, 2026-11-10); it cancels the same way
 *
 * One dialog serves every ask, so a run of them (the reset's three steps)
 * reads as one sheet changing: its content fades from one step to the next
 * (js/dom.js openSheet()).
 */
import { t } from './i18n.js';
import { el, openSheet, closeSheet } from './dom.js';

const CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';

let dialog = null;
let settle = null;   // resolves the ask on show

function close(value) {
  const done = settle;
  settle = null;
  // At once, so the page takes the focus as before; a copy fades out.
  if (dialog && dialog.open) closeSheet(dialog);
  if (done) done(value);
}

export function ask({ icon = null, title, body = null, options, typed = null, step = null, cancel = null, closeX = false }) {
  if (!dialog) {
    dialog = el('dialog', { class: 'sheet confirm-sheet ask-sheet', 'aria-labelledby': 'ask-sheet-title' });
    // The backdrop and Esc cancel, fading like the buttons do.
    dialog.addEventListener('click', (event) => { if (event.target === dialog) close(null); });
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(null); });
    // The close event comes a moment later: by then the next ask of a run
    // may have opened the dialog again, and that one stays.
    dialog.addEventListener('close', () => { if (!dialog.open) close(null); });
    document.body.append(dialog);
  }
  if (settle) settle(null);   // a new ask replaces one still open

  const lines = Array.isArray(body) ? body : body ? [body] : [];
  const field = typed ? el('input', {
    class: 'code-input ask-typed', type: 'text', autocomplete: 'off', autocapitalize: 'characters',
    autocorrect: 'off', spellcheck: 'false', 'aria-label': typed.label, placeholder: typed.word,
    'aria-describedby': 'ask-typed-hint'
  }) : null;
  const buttons = options.map((o) => el('button', {
    class: `ask-option${o.danger ? ' is-danger' : ''}`, type: 'button', 'data-id': `ask-${o.id}`,
    lang: o.lang || null, disabled: !!typed,
    onclick: () => close(o.id)
  },
    el('span', { class: 'ask-option-name' }, o.name),
    o.desc ? el('span', { class: 'ask-option-desc' }, o.desc) : null));
  if (field) {
    const words = [typed.word, ...(typed.also || [])].map((w) => w.toUpperCase());
    const match = () => words.includes(field.value.trim().toUpperCase());
    field.addEventListener('input', () => buttons.forEach((b) => { b.disabled = !match(); }));
    field.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.isComposing && match()) close(options[0].id);
    });
  }

  let x = null;
  if (closeX) {
    x = el('button', {
      class: 'icon-btn ask-close', type: 'button', 'data-id': 'ask-cancel',
      'aria-label': t('confirm.close'), title: t('confirm.close'), onclick: () => close(null)
    });
    x.innerHTML = CLOSE;
  }
  dialog.replaceChildren(el('div', { class: 'sheet-body' },
    el('header', { class: 'power-sheet-head' },
      icon ? el('span', { class: 'power-icon', 'aria-hidden': 'true' }, icon) : null,
      el('div', { class: 'ask-sheet-titles' },
        step ? el('p', { class: 'ask-step' }, t('confirm.step', { n: step.n, of: step.of })) : null,
        el('h2', { class: 'sheet-title', id: 'ask-sheet-title' }, title)),
      x),
    lines.map((line) => el('p', { class: 'ask-sheet-body' }, line)),
    field ? el('label', { class: 'ask-typed-row' },
      el('span', { class: 'ask-typed-hint', id: 'ask-typed-hint' }, typed.hint || typed.label),
      field) : null,
    el('div', { class: 'ask-options' }, buttons),
    closeX ? null : el('div', { class: 'btn-row' },
      el('button', { class: 'btn btn-ghost', type: 'button', 'data-id': 'ask-cancel', onclick: () => close(null) },
        cancel || t('confirm.cancel')))));

  return new Promise((resolve) => {
    settle = resolve;
    openSheet(dialog);
    (field || buttons[0]).focus();
  });
}

// Closes an ask that's open (leaving a page), as cancelled.
export function closeAsk() {
  close(null);
}
