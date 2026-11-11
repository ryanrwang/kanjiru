/*
 * The points' coin: a koban (小判), the old oval gold coin the points are
 * named after, with the hammered lines across its face. Drawn, so it looks
 * the same on every phone; the 🪙 emoji didn't (2026-11-11, the user asked).
 * Colours are tokens (coin.face, line, shine, rim: the same in every skin);
 * styles.css "The coin" sizes it to its text (1em, a little over), so each
 * place sets its size with its font size.
 *
 *   coin()               a <span class="coin">, hidden from screen readers
 *                        (the text beside it says the points)
 *   withCoin(render)     a line of text with the coin where its {icon} was:
 *                        render(icon) returns the text, e.g.
 *                        withCoin((icon) => t('result.balance', { icon, n }))
 */
import { el } from './dom.js';

// On a 24 grid: the face, its lines (each inset from the rim), a glint at
// the top left, then the rim over all. Stroke widths are part of the
// drawing, so they're here; colours are styles.css "The coin".
const SVG = '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" aria-hidden="true" focusable="false">'
  + '<ellipse class="coin-face" cx="12" cy="12" rx="8.25" ry="10.75"/>'
  + '<path class="coin-line" stroke-width="0.9" d="M7.13 5.5H16.87M6.21 7.5H17.79M5.68 9.5H18.32M5.46 11.5H18.54M5.53 13.5H18.47M5.9 15.5H18.1M6.61 17.5H17.39"/>'
  + '<path class="coin-shine" stroke-width="1.3" d="M6.2 9.6A7 9.2 0 0 1 9.6 3.9"/>'
  + '<ellipse class="coin-rim" stroke-width="1.5" cx="12" cy="12" rx="8.25" ry="10.75"/>'
  + '</svg>';

export function coin() {
  const node = el('span', { class: 'coin', 'aria-hidden': 'true' });
  node.innerHTML = SVG;
  return node;
}

// A character no translation uses, to mark the coin's place in the text.
const MARK = '';
export function withCoin(render) {
  return render(MARK).split(MARK).flatMap((text, i) => (i ? [coin(), text] : [text]));
}
