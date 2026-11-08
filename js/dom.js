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
