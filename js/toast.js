/*
 * Toasts: a short note at the top of the screen that goes by itself
 * (achievements, streak rewards, bonus hints), and the "+50" that rises
 * from a points total when it changes.
 *
 *   toast({ icon, title, body })
 *   bump(node, +50)         // node: where the points show
 *
 * The toasts sit in a popover where the browser has them, so they show over
 * an open sheet too. Under reduced motion nothing moves: they appear, stay
 * and go.
 */
import { t } from './i18n.js';
import { el } from './dom.js';

const ms = (key) => parseFloat(window.TOKENS.active().transition[key]) || 0;

let box = null;

function shelf() {
  if (!box) {
    box = el('div', { class: 'toasts', role: 'status', 'aria-live': 'polite', popover: 'manual' });
    document.body.append(box);
  }
  // Again on every toast, so it comes up over a sheet opened since.
  if (box.showPopover) {
    try {
      if (box.matches(':popover-open')) box.hidePopover();
      box.showPopover();
    } catch (e) { /* no popovers: it's a fixed box instead */ }
  }
  return box;
}

function dismiss(node) {
  if (!node.isConnected || node.classList.contains('is-leaving')) return;
  node.classList.add('is-leaving');
  setTimeout(() => {
    node.remove();
    if (box && !box.children.length && box.hidePopover) {
      try { box.hidePopover(); } catch (e) { /* already hidden */ }
    }
  }, ms('base'));
}

export function toast({ icon = '', title, body = '' }) {
  const node = el('button', { class: 'toast', type: 'button', title: t('toast.dismiss') },
    icon ? el('span', { class: 'toast-icon', 'aria-hidden': 'true' }, icon) : null,
    el('span', { class: 'toast-text' },
      el('span', { class: 'toast-title' }, title),
      body ? el('span', { class: 'toast-body' }, body) : null));
  node.addEventListener('click', () => dismiss(node));
  shelf().append(node);
  setTimeout(() => dismiss(node), ms('toast'));
  return node;
}

// "+50" (or "−60") rising from a points total, then gone. The node gets
// position: relative from .has-bump.
export function bump(node, delta) {
  if (!node || !delta) return;
  node.classList.add('has-bump');
  const tag = el('span', { class: `points-bump${delta < 0 ? ' is-spent' : ''}`, 'aria-hidden': 'true' },
    delta > 0 ? t('reward.points', { n: delta }) : t('reward.spent', { n: -delta }));
  node.append(tag);
  setTimeout(() => tag.remove(), ms('long') * 2);
}
