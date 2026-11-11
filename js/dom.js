/*
 * Tiny DOM helper shared by the screens.
 *
 *   el('button', { class: 'btn', type: 'button', onclick: go }, t('play'))
 *
 * Attributes set to null, undefined or false are left off; true sets an
 * empty attribute. on… attributes become event listeners; style takes an
 * object, custom properties (--i) too. Children may be
 * nodes, text, arrays (nested to any depth), or null/false (skipped).
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) return;
    if (key === 'class') node.className = value;
    else if (key === 'style') {
      // Custom properties (--i) need setProperty; the rest assign as usual.
      Object.entries(value).forEach(([name, v]) => {
        if (name.startsWith('--')) node.style.setProperty(name, v);
        else node.style[name] = v;
      });
    }
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  });
  children.flat(Infinity).forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  });
  return node;
}

// A switch: a checkbox drawn as a sliding toggle (styles.css .switch), after
// its name, an optional tag (a points multiplier) and an optional note. The
// whole row toggles it. data-id lets a redraw put the focus back.
// Its page redraws when it moves, so the switch drawn next starts the way
// it was and slides from there (.is-from, for one frame).
const flipped = new Set();   // ids of switches just moved, until drawn again

export function switchRow({ id, name, tag = null, note = null, on, onChange, disabled = false }) {
  const from = flipped.delete(id) && motion('toggle') > 0;
  const input = el('input', {
    class: `switch${from ? ' is-from' : ''}`, type: 'checkbox', role: 'switch', 'data-id': id, checked: !!on, disabled,
    'aria-labelledby': `${id}-name`, 'aria-describedby': note ? `${id}-note` : null,
    onchange: (event) => {
      flipped.add(id);
      requestAnimationFrame(() => flipped.delete(id));   // only the redraw this change makes
      onChange(event.target.checked);
    }
  });
  if (from) {
    requestAnimationFrame(() => {
      void input.offsetWidth;   // drawn the old way first
      input.classList.remove('is-from');
    });
  }
  return el('label', { class: `switch-row${disabled ? ' is-disabled' : ''}` },
    el('span', { class: 'switch-text' },
      el('span', { class: 'switch-name', id: `${id}-name` },
        name, tag ? el('span', { class: 'switch-tag' }, tag) : null),
      note ? el('span', { class: 'switch-note', id: `${id}-note` }, note) : null),
    input);
}

// A row of buttons where one is picked (language, light or dark).
//   options  [{ id, label, lang? }]
export function segmented({ id, label, options, value, onPick, disabled = false }) {
  return el('div', { class: 'segmented', role: 'group', 'aria-label': label, 'data-id': id },
    options.map((o) => el('button', {
      class: 'segment', type: 'button', lang: o.lang || null, 'data-id': `${id}-${o.id}`,
      'aria-pressed': String(o.id === value), disabled,
      onclick: () => { if (o.id !== value) onPick(o.id); }
    }, o.label)));
}

// ── Motion ───────────────────────────────────────────────────────────
// Moves between states (2026-11-11, the user asked: smooth but quick).
// Every time is a token (tokens.js transition); under reduced motion each
// is 0, so the change happens at once.

export const reducedMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

// A transition token's time in ms, 0 under reduced motion.
export function motion(key) {
  if (reducedMotion()) return 0;
  return parseFloat(window.TOKENS.active().transition[key]) || 0;
}

const easing = (key) => window.TOKENS.active().transition[key];

// A block's box, shut: no height, padding or border, and see-through.
const SHUT = { height: '0px', paddingTop: '0px', paddingBottom: '0px', borderTopWidth: '0px', borderBottomWidth: '0px', opacity: 0 };

function boxOf(node) {
  const cs = getComputedStyle(node);
  return {
    height: `${node.getBoundingClientRect().height}px`,
    paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom,
    borderTopWidth: cs.borderTopWidth, borderBottomWidth: cs.borderBottomWidth,
    opacity: Number(cs.opacity)
  };
}

// The gap above a node in its flex or grid parent, which a block growing
// in or shrinking away takes in too, so nothing jumps at the end.
function gapAbove(node) {
  if (!node.previousElementSibling || !node.parentElement) return 0;
  const cs = getComputedStyle(node.parentElement);
  return /flex|grid/.test(cs.display) ? parseFloat(cs.rowGap) || 0 : 0;
}

const moving = new WeakMap();   // node → its size move running

function sizeMove(node, from, to, time, ease) {
  node.style.overflow = 'hidden';
  const run = node.animate([from, to], { duration: time, easing: easing(ease) });
  moving.set(node, run);
  // Only the latest move tidies up: one turned round mid-way is cancelled
  // after the next has begun.
  const tidy = () => { if (moving.get(node) === run) { moving.delete(node); node.style.overflow = ''; } };
  run.finished.then(tidy, tidy);
  return run;
}

// A block easing in where it now stands: from nothing to its own height,
// fading in (a locked look's details, a fold's body).
export function growIn(node, key = 'fold') {
  const time = motion(key);
  if (!time || !node.animate || !node.isConnected) return;
  const gap = gapAbove(node);
  sizeMove(node, { ...SHUT, marginTop: `${-gap}px` }, { ...boxOf(node), marginTop: '0px' }, time, 'ease');
}

// A block easing away before it goes (a deleted game, the install tip put
// off): resolves once it's shut, at once under reduced motion.
export function shrinkOut(node, key = 'fold') {
  const time = motion(key);
  if (!time || !node.animate || !node.isConnected) return Promise.resolve();
  const gap = gapAbove(node);
  const run = sizeMove(node, { ...boxOf(node), marginTop: '0px' }, { ...SHUT, marginTop: `${-gap}px` }, time, 'exit');
  return run.finished.then(() => { node.style.visibility = 'hidden'; }, () => {});
}

// A <details> that eases open and shut (tokens.js fold): its body's height,
// padding and opacity, the chevron turning on the same time (styles.css
// .is-shutting; until then it's still [open]). fill(), optional, runs as it
// opens, before the body is measured (history draws its board then). A tap
// mid-move turns it round from where it is.
export function smoothFold(details, fill = null) {
  const summary = details.querySelector(':scope > summary');
  if (!summary) return details;
  let run = null;
  summary.addEventListener('click', (event) => {
    const time = motion('fold');
    if (!time || !details.animate) {
      if (fill && !details.open) fill();
      return;   // the browser's own toggle
    }
    event.preventDefault();
    const shutting = details.open && !details.classList.contains('is-shutting');
    let body = details.querySelector(':scope > :not(summary)');
    const from = run && body ? boxOf(body) : null;   // mid-move: where it is now
    if (run) { run.cancel(); run = null; }
    if (shutting) details.classList.add('is-shutting');
    else {
      details.classList.remove('is-shutting');
      if (!details.open) details.open = true;
      if (fill) fill();
      body = details.querySelector(':scope > :not(summary)');
    }
    if (!body) {
      if (shutting) { details.open = false; details.classList.remove('is-shutting'); }
      return;
    }
    const full = boxOf(body);
    full.opacity = 1;
    const now = run = sizeMove(body, from || (shutting ? full : SHUT), shutting ? SHUT : full, time, shutting ? 'exit' : 'ease');
    now.finished.then(() => {
      if (run !== now) return;
      run = null;
      if (shutting) { details.open = false; details.classList.remove('is-shutting'); }
    }, () => {});
  });
  return details;
}

// ── Modals (a <dialog class="sheet">) ───────────────────────────────
// Opening, the sheet rises in and its backdrop fades (styles.css .sheet).
// Closing, the dialog closes at once, so the page is usable and takes the
// focus as before, while a copy of it fades out on top (.sheet-ghost). A
// sheet opened again while its copy fades (the next step of a run of asks)
// stays put and only its content changes (.is-again).

const ghosts = new WeakMap();   // dialog → the copy fading out

export function openSheet(dialog) {
  const ghost = ghosts.get(dialog);
  if (ghost) { ghost.remove(); ghosts.delete(dialog); }
  dialog.classList.remove('is-again');
  if (ghost || dialog.open) {
    void dialog.offsetWidth;   // so the content's fade starts again
    dialog.classList.add('is-again');
  }
  if (!dialog.open) dialog.showModal();
}

export function closeSheet(dialog) {
  if (!dialog || !dialog.open) return;
  const time = motion('sheetOut');
  if (time && !ghosts.has(dialog)) {
    const copy = el('div', { class: dialog.className.replace(/\bis-again\b/, '') },
      [...dialog.children].map((node) => node.cloneNode(true)));
    copy.querySelectorAll('[id], [data-id]').forEach((node) => { node.removeAttribute('id'); node.removeAttribute('data-id'); });
    const ghost = el('div', { class: 'sheet-ghost', 'aria-hidden': 'true', inert: true }, copy);
    document.body.append(ghost);
    copy.scrollTop = dialog.scrollTop;
    ghosts.set(dialog, ghost);
    setTimeout(() => {
      ghost.remove();
      if (ghosts.get(dialog) === ghost) ghosts.delete(dialog);
    }, time);
  }
  dialog.close();
}

// Esc and a tap on the backdrop close a sheet the same way. With esc false
// the sheet handles Esc itself (the hints step back first).
export function dismissable(dialog, { esc = true } = {}) {
  dialog.addEventListener('click', (event) => { if (event.target === dialog) closeSheet(dialog); });
  if (esc) {
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeSheet(dialog);
    });
  }
  return dialog;
}

// A change of look or language: the old page fades into the new where the
// browser can (tokens.js look); elsewhere it changes at once.
export function crossfade(change) {
  if (!motion('look') || !document.startViewTransition) { change(); return; }
  document.startViewTransition(change);
}
