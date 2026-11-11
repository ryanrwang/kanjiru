/*
 * Hint icons: how a hint or power is drawn, in the look the player picked
 * (Points › Looks, the icons slot in js/config/skins.js; its style field):
 *   emoji        the power's emoji (powers.js icon)
 *   illustrated  its drawing on the page, outlined and filled with the
 *                game's own colours: the tiles' green, yellow and grey, the
 *                bulb's gold and the skin's accent
 *   seal         its plate drawing in white on a rounded square in the
 *                skin's accent, like a hanko
 *   badge        the plate drawing on a circle in the hint's own colour
 *                (powers.js badge, tokens.js hint.badge)
 * A power without art (powers.js art) shows its emoji in every look.
 *
 * Each hint has two drawings (ART), both on a 24 grid, picked on the dev
 * page review/hint-art.html (2026-11-11):
 *   drawn   for Illustrated: strokes .line (ink), .accent and .on (the
 *           text colour on a coloured tile), fills .f-paper, .f-gold,
 *           .f-hit, .f-near, .f-accent and .f-spark, text .t-on and .t-gold
 *   plated  for a plate: strokes .line, fills .fill (.soft rounds their
 *           corners), thin cuts in the plate's colour .cut, all white. Each
 *           is centred by eye, not by its box: fit() moves the middle of
 *           its ink to the middle and scales it to about 88%. The two kanji
 *           were placed by their measured ink (氵 sits left of its em).
 * Kanji are .kan, numbers .num. Stroke widths are part of a drawing, so
 * they're here; colours are styles.css "Hint icons".
 *
 *   hintIcon(power, { size, look })  a <span> holding the icon
 *     size   'md' (32px: hint rows, chips, card titles, the sweep's broom)
 *            or 'lg' (48px: confirms)
 *     look   an icons skin id, for the Points page's examples; else the player's
 *   textIcon(power)  its emoji for a line of text in the Emoji look, else ''
 */
import { skin, DEFAULT_LOOK } from '../registry.js';
import * as store from '../store.js';
import { el } from '../dom.js';

const fit = (svg, cx, cy, s) => `<g transform="translate(12 12) scale(${s}) translate(${-cx} ${-cy})">${svg}</g>`;
// Illustrated's line, and its hairlines.
const drawn = (svg) => `<g stroke-width="1.75">${svg}</g>`;
const HAIR = 'stroke-width="0.96"';
const CENTRE = 'text-anchor="middle" dominant-baseline="central"';

// Keys are the names in powers.js art and KNOWN_ART in js/registry.js.
export const ART = {
  // Stroke count: 正, the tally that counts to five, its base in the accent.
  tally: {
    drawn: drawn('<path class="line" d="M4 4H20M12 4V20M12 12H18M6 12V20"/><path class="accent" d="M3 20H21"/>'),
    plated: fit('<path class="line" stroke-width="1.9" d="M7.5 7H16.5M12 7V17M12 12H15.5M8.5 12V17M6.5 17H17.5"/>', 12, 12.25, 0.88)
  },
  // Layout: a kanji's frame split into its places.
  split: {
    drawn: drawn('<path class="f-accent" d="M5 3H11V21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3Z"/>'
      + '<path class="f-gold" d="M11 3H19A2 2 0 0 1 21 5V11H11Z"/>'
      + '<rect class="line" x="3" y="3" width="18" height="18" rx="2"/>'
      + '<path class="line" d="M11 3V21M11 11H21"/>'),
    plated: fit('<path class="fill" d="M8.75 6.95H11.2V17.05H8.75A1.8 1.8 0 0 1 6.95 15.25V8.75A1.8 1.8 0 0 1 8.75 6.95Z"/>'
      + '<rect class="line" stroke-width="1.9" x="6.95" y="6.95" width="10.1" height="10.1" rx="1.8"/>'
      + '<path class="line" stroke-width="1.9" d="M11.2 6.95V17.05M11.2 12H17.05"/>', 11.6, 12, 0.88)
  },
  // Meaning: an open dictionary, its definition picked out.
  book: {
    drawn: drawn('<path class="line f-paper" d="M12 6.5C9.5 4.8 6 4.4 2.5 5V18.5C6 18 9.5 18.4 12 20.1Z"/>'
      + '<path class="line f-paper" d="M12 6.5C14.5 4.8 18 4.4 21.5 5V18.5C18 18 14.5 18.4 12 20.1Z"/>'
      + `<path class="line" ${HAIR} d="M5 9.2H9.5M5 12.2H9.5M5 15.2H8.5M14.5 12.2H19M14.5 15.2H17.5"/>`
      + '<path class="accent" d="M14.5 9.2H19"/>'),
    plated: fit('<path class="fill soft" stroke-width="0.7" d="M11.1 8C9.7 7 7.9 6.6 5.8 6.8V16.4C7.9 16.2 9.7 16.6 11.1 17.6Z"/>'
      + '<path class="fill soft" stroke-width="0.7" d="M12.9 8C14.3 7 16.1 6.6 18.2 6.8V16.4C16.1 16.2 14.3 16.6 12.9 17.6Z"/>'
      + '<path class="cut" stroke-width="1.1" d="M7.6 9.8H9.6M7.6 12.4H9.6M14.4 9.8H16.4M14.4 12.4H16.4"/>', 12, 12.18, 0.885)
  },
  // Arrows: a yellow tile and which way its part lies.
  arrows: {
    drawn: drawn('<rect class="line f-near" x="3" y="3" width="18" height="18" rx="3"/>'
      + '<path class="on" d="M7 12H17M9.8 9.2L7 12L9.8 14.8M14.2 9.2L17 12L14.2 14.8"/>'),
    plated: fit('<path class="line" stroke-width="1.9" d="M6.5 12H17.5M9.4 9.1L6.5 12L9.4 14.9M14.6 9.1L17.5 12L14.6 14.9"/>', 12, 12, 0.9)
  },
  // Sweep: a bamboo broom, the one that crosses the keyboard.
  broom: {
    drawn: drawn('<g transform="translate(15 9) rotate(45)">'
      + '<path class="line" d="M0 -8.6V2"/>'
      + '<path class="line f-gold" d="M-1.6 3.6L-4.6 11Q0 12.6 4.6 11L1.6 3.6Z"/>'
      + `<path class="line" ${HAIR} d="M0 4.8V11.4M-1.5 5.2L-2.6 11.2M1.5 5.2L2.6 11.2"/>`
      + '<rect class="line f-accent" x="-2.1" y="1.8" width="4.2" height="2" rx="0.6"/></g>'
      + `<path class="accent" ${HAIR} d="M13.5 21.5H18M16 19H20.5"/>`),
    plated: fit('<g transform="translate(13.6 10.4) rotate(45)"><path class="line" stroke-width="1.9" d="M0 -6.4V0.4"/>'
      + '<rect class="fill" x="-1.8" y="0.2" width="3.6" height="1.9" rx="0.5"/>'
      + '<path class="fill soft" stroke-width="0.7" d="M-1.4 3L-3.8 7.3Q0 8.8 3.8 7.3L1.4 3Z"/>'
      + '<path class="cut" stroke-width="1.1" d="M-0.7 4L-1.3 7.3M0.7 4L1.3 7.3"/></g>', 12, 12, 0.9)
  },
  // Reveal a part: a green tile with a part on it (氵), and a glint.
  part: {
    drawn: drawn('<rect class="line f-hit" x="3" y="5" width="16" height="16" rx="3"/>'
      + `<text class="t-on kan" x="11" y="13.4" font-size="12.5" ${CENTRE}>氵</text>`
      + '<path class="f-spark" d="M20 1.2Q20.5 3.5 22.8 4Q20.5 4.5 20 6.8Q19.5 4.5 17.2 4Q19.5 3.5 20 1.2Z"/>'),
    plated: `<text class="t-ink kan" x="15.21" y="11.91" font-size="12.5" ${CENTRE}>氵</text>`
  },
  // Extra guess: +1, on a gold tile.
  'plus-one': {
    drawn: drawn('<rect class="line f-gold" x="3" y="3" width="18" height="18" rx="3"/>'
      + `<text class="t-gold num" x="12" y="12.4" font-size="10.5" ${CENTRE}>+1</text>`),
    plated: fit('<path class="line" stroke-width="1.9" d="M6.9 12H12.1M9.5 9.4V14.6M14.9 9.5L17.1 7.6V16.4"/>', 12.25, 12, 0.9)
  },
  // Reveal a kanji: a green tile with a whole kanji, 字.
  kanji: {
    drawn: drawn('<rect class="line f-hit" x="3" y="3" width="18" height="18" rx="3"/>'
      + `<text class="t-on kan" x="12" y="12.4" font-size="12.5" ${CENTRE}>字</text>`),
    plated: `<text class="t-ink kan" x="11.97" y="12.03" font-size="11.6" ${CENTRE}>字</text>`
  }
};

// The plates under a plated drawing, by style.
const PLATES = {
  seal: '<rect class="plate" x="0.5" y="0.5" width="23" height="23" rx="5"/>'
    + '<rect class="rim" stroke-width="0.6" x="2" y="2" width="20" height="20" rx="3.6"/>',
  badge: '<circle class="plate" cx="12" cy="12" r="12"/>'
};

// The style of a look (skins.js style), the player's unless one is named.
function styleOf(look) {
  const id = look || (store.get().settings || {}).icons;
  const item = skin('icons', id) || skin('icons', DEFAULT_LOOK.icons);
  return item ? item.style : 'emoji';
}

export function hintIcon(power, { size = 'md', look = null } = {}) {
  const style = styleOf(look);
  const art = power && ART[power.art];
  if (style === 'emoji' || !art) {
    return el('span', { class: `hint-art is-${size} is-emoji`, 'aria-hidden': 'true' }, (power && power.icon) || '');
  }
  const node = el('span', {
    class: `hint-art is-${size} is-${style}`,
    'aria-hidden': 'true',
    style: style === 'badge' ? { '--badge': `var(--color-hint-badge-${power.badge})` } : null
  });
  const body = PLATES[style] ? PLATES[style] + art.plated : art.drawn;
  node.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" focusable="false">${body}</svg>`;
  return node;
}

export function textIcon(power) {
  return power && (styleOf() === 'emoji' || !ART[power.art]) ? power.icon || '' : '';
}
