/*
 * The points' coin, drawn so it looks the same on every phone: the 🪙
 * emoji differs from one to the next (2026-11-11, the user asked). It
 * follows Android's emoji (a round gold coin seen a little from above, its
 * ridged edge showing, a ring of stars round a building) with a kanji
 * twist: 金 (gold, money) stamped in the middle, and dots for the stars.
 * Picked from drawings next to that emoji; a first try, an oval koban,
 * didn't look good.
 *
 * The 金 is Noto Serif JP Black's outline (SIL Open Font License 1.1, the
 * font the app already uses; data/ATTRIBUTION.md), so it doesn't wait on
 * the font. Colours are tokens (coin.*, the same in every skin), set on
 * the shared gradients in styles.css "The coin". Each coin points at one
 * set of gradients and one 金, in a hidden <svg> added to the page once.
 *
 *   coin()               a <span class="coin">, hidden from screen readers
 *                        (the text beside it says the points); 1.25em of
 *                        its text, so each place sizes it with its font size
 *   withCoin(render)     a line of text with the coin where its {icon} was:
 *                        render(icon) returns the text, e.g.
 *                        withCoin((icon) => t('result.balance', { icon, n }))
 */
import { el } from './dom.js';

// 金, in a box 1 wide centred on 0 (its ink, not its em).
const KIN = ''
  + 'M-0.254 -0.092H0.045L0.114 -0.179Q0.114 -0.179 0.135 -0.162Q0.156 -0.146 0.185 -0.123Q0.214 -0.1 0.238 -0.079Q0.234 -0.063 0.209 -0.063H-0.246Z'
  + 'M-0.419 0.084H0.211L0.285 -0.014Q0.285 -0.014 0.299 -0.003Q0.312 0.008 0.334 0.025Q0.355 0.041 0.378 0.06Q0.402 0.079 0.42 0.096Q0.416 0.112 0.39 0.112H-0.411Z'
  + 'M-0.471 0.44H0.24L0.322 0.334Q0.322 0.334 0.337 0.345Q0.351 0.357 0.375 0.375Q0.399 0.393 0.424 0.413Q0.45 0.434 0.47 0.452Q0.466 0.469 0.44 0.469H-0.463Z'
  + 'M-0.096 -0.087H0.058V0.449H-0.096Z'
  + 'M-0.317 0.15Q-0.241 0.176 -0.201 0.21Q-0.162 0.244 -0.15 0.279Q-0.138 0.314 -0.148 0.342Q-0.158 0.37 -0.181 0.386Q-0.205 0.402 -0.235 0.399Q-0.264 0.395 -0.294 0.364Q-0.291 0.327 -0.295 0.291Q-0.299 0.255 -0.307 0.22Q-0.315 0.185 -0.326 0.154Z'
  + 'M0.16 0.143 0.35 0.211Q0.347 0.221 0.337 0.226Q0.326 0.232 0.308 0.231Q0.263 0.28 0.211 0.326Q0.159 0.371 0.111 0.404L0.099 0.397Q0.109 0.366 0.119 0.324Q0.129 0.281 0.14 0.234Q0.151 0.187 0.16 0.143Z'
  + 'M0.047 -0.372Q0.008 -0.311 -0.052 -0.251Q-0.112 -0.19 -0.184 -0.136Q-0.257 -0.081 -0.337 -0.038Q-0.416 0.006 -0.494 0.035L-0.5 0.025Q-0.434 -0.02 -0.37 -0.081Q-0.305 -0.143 -0.25 -0.211Q-0.195 -0.279 -0.156 -0.346Q-0.118 -0.412 -0.103 -0.469L0.119 -0.41Q0.116 -0.399 0.103 -0.393Q0.091 -0.388 0.062 -0.385Q0.098 -0.338 0.15 -0.303Q0.202 -0.268 0.262 -0.243Q0.323 -0.219 0.384 -0.202Q0.446 -0.185 0.5 -0.174L0.499 -0.157Q0.466 -0.148 0.441 -0.123Q0.416 -0.099 0.4 -0.068Q0.384 -0.036 0.379 -0.006Q0.307 -0.046 0.242 -0.097Q0.176 -0.149 0.126 -0.217Q0.076 -0.285 0.047 -0.372Z';

// The gradients and the 金, once per page: hidden, but not display: none,
// which would stop the coins using them (styles.css .coin-defs).
const DEFS = '<svg class="coin-defs" aria-hidden="true" focusable="false"><defs>'
  + '<linearGradient id="coin-g-face" x1="0.15" y1="0.05" x2="0.85" y2="0.95">'
  + '<stop offset="0" class="coin-s-face-light"/><stop offset="0.5" class="coin-s-face"/><stop offset="1" class="coin-s-face-deep"/></linearGradient>'
  + '<linearGradient id="coin-g-field" x1="0.15" y1="0.05" x2="0.85" y2="0.95">'
  + '<stop offset="0" class="coin-s-field-deep"/><stop offset="1" class="coin-s-field-light"/></linearGradient>'
  + '<linearGradient id="coin-g-edge" x1="0" y1="0" x2="0" y2="1">'
  + '<stop offset="0" class="coin-s-edge"/><stop offset="1" class="coin-s-edge-deep"/></linearGradient>'
  + '<linearGradient id="coin-g-mark" x1="0" y1="0" x2="1" y2="1">'
  + '<stop offset="0" class="coin-s-mark"/><stop offset="1" class="coin-s-mark-deep"/></linearGradient>'
  + `<path id="coin-kin" d="${KIN}"/>`
  + '</defs></svg>';

function defs() {
  if (document.getElementById('coin-kin')) return;
  document.body.insertAdjacentHTML('beforeend', DEFS);
}

// On a 32 grid, the face's centre at 16, 14.6, radius 12.8: the edge (the
// face again, 2.6 lower) and its ridges, the face (the raised rim), the
// sunken field and its line, twelve dots, the 金 raised (a shadow below
// right, a light above left, then the 金 itself), and a glint at the top
// left. Stroke widths are part of the drawing, so they're here.
const KIN_AT = (dx, dy) => `transform="translate(${16 + dx} ${14.6 + dy}) scale(10.5)"`;
const SVG = '<svg viewBox="1.8 1.7 28.4 28.4" aria-hidden="true" focusable="false">'
  + '<circle class="coin-edge" cx="16" cy="17.2" r="12.8"/>'
  + '<path class="coin-ridge" stroke-width="0.55" stroke-linecap="round" d="M4.1 19.31V21.91M5.7 22.2V24.8M7.3 23.99V26.59M8.9 25.25V27.85M10.5 26.16V28.76M12.1 26.79V29.39M13.7 27.19V29.79M15.3 27.38V29.98M16.9 27.37V29.97M18.5 27.15V29.75M20.1 26.73V29.33M21.7 26.06V28.66M23.3 25.11V27.71M24.9 23.8V26.4M26.5 21.92V24.52"/>'
  + '<circle class="coin-face" stroke-width="0.5" cx="16" cy="14.6" r="12.8"/>'
  + '<circle class="coin-field" stroke-width="0.6" cx="16" cy="14.6" r="10.4"/>'
  + '<g class="coin-dot"><circle cx="16" cy="5.7" r="0.6"/><circle cx="20.45" cy="6.89" r="0.6"/><circle cx="23.71" cy="10.15" r="0.6"/><circle cx="24.9" cy="14.6" r="0.6"/><circle cx="23.71" cy="19.05" r="0.6"/><circle cx="20.45" cy="22.31" r="0.6"/><circle cx="16" cy="23.5" r="0.6"/><circle cx="11.55" cy="22.31" r="0.6"/><circle cx="8.29" cy="19.05" r="0.6"/><circle cx="7.1" cy="14.6" r="0.6"/><circle cx="8.29" cy="10.15" r="0.6"/><circle cx="11.55" cy="6.89" r="0.6"/></g>'
  + `<use class="coin-shadow" href="#coin-kin" ${KIN_AT(0.35, 0.45)}/>`
  + `<use class="coin-light" href="#coin-kin" ${KIN_AT(-0.25, -0.3)}/>`
  + `<use class="coin-mark" href="#coin-kin" ${KIN_AT(0, 0)}/>`
  + '<path class="coin-shine" stroke-width="1.1" stroke-linecap="round" fill="none" d="M7.2 9.2A10.4 10.4 0 0 1 12.4 4.6"/>'
  + '</svg>';

export function coin() {
  defs();
  const node = el('span', { class: 'coin', 'aria-hidden': 'true' });
  node.innerHTML = SVG;
  return node;
}

// A character no translation uses, to mark the coin's place in the text.
const MARK = '\uE000';
export function withCoin(render) {
  return render(MARK).split(MARK).flatMap((text, i) => (i ? [coin(), text] : [text]));
}
