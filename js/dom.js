/*
 * Tiny DOM helper shared by the screens.
 *
 *   el('button', { class: 'btn', type: 'button', onclick: go }, t('play'))
 *
 * Attributes set to null, undefined or false are left off; true sets an
 * empty attribute. on… attributes become event listeners. Children may be
 * nodes, text, arrays (nested to any depth), or null/false (skipped).
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) return;
    if (key === 'class') node.className = value;
    else if (key === 'style') Object.assign(node.style, value);
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
export function switchRow({ id, name, tag = null, note = null, on, onChange, disabled = false }) {
  return el('label', { class: `switch-row${disabled ? ' is-disabled' : ''}` },
    el('span', { class: 'switch-text' },
      el('span', { class: 'switch-name', id: `${id}-name` },
        name, tag ? el('span', { class: 'switch-tag' }, tag) : null),
      note ? el('span', { class: 'switch-note', id: `${id}-note` }, note) : null),
    el('input', {
      class: 'switch', type: 'checkbox', role: 'switch', 'data-id': id, checked: !!on, disabled,
      'aria-labelledby': `${id}-name`, 'aria-describedby': note ? `${id}-note` : null,
      onchange: (event) => onChange(event.target.checked)
    }));
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
