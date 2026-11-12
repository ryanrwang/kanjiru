/*
 * Part glyphs on the game screen: text, or a drawing for the few glyphs
 * Noto lacks (data/parts.json gives those forms an `outline`, and `svg`).
 *   outline  the part cut from a Noto Serif JP kanji that has it
 *            (tools/make_outlines.py), filled, so it looks like the font
 *   svg      KanjiVG's strokes, for a part with no outline yet
 *
 *   const glyph = glyphMaker(data.tiles);
 *   el('span', { class: 'tile', lang: 'ja' }, glyph('氵'));
 */
const SVG = 'http://www.w3.org/2000/svg';

function drawing(form) {
  const outline = form.outline;
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', outline ? 'glyph-svg is-outline' : 'glyph-svg');
  svg.setAttribute('viewBox', outline ? outline.viewBox : form.svg.viewBox);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', form.glyph);
  (outline ? [outline.d] : form.svg.paths).forEach((d) => {
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  });
  return svg;
}

// tiles: data/parts.json's tiles. Returns glyph(text) → a node.
export function glyphMaker(tiles) {
  const forms = new Map();
  tiles.forEach((tile) => tile.forms.forEach((f) => { if (!forms.has(f.glyph)) forms.set(f.glyph, f); }));
  return (text) => {
    const form = forms.get(text);
    return form && (form.outline || form.svg) ? drawing(form) : document.createTextNode(text);
  };
}
