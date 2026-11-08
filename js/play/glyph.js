/*
 * Part glyphs on the game screen: text, or KanjiVG strokes for the few
 * glyphs fonts may lack (data/parts.json gives those forms an `svg`).
 *
 *   const glyph = glyphMaker(data.tiles);
 *   el('span', { class: 'tile', lang: 'ja' }, glyph('氵'));
 */
const SVG = 'http://www.w3.org/2000/svg';

function strokes(form) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'glyph-svg');
  svg.setAttribute('viewBox', form.svg.viewBox);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', form.glyph);
  form.svg.paths.forEach((d) => {
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
    return form && form.svg ? strokes(form) : document.createTextNode(text);
  };
}
