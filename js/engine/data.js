/*
 * The game's data: the files tools/compile_game.py writes to data/game/,
 * plus the palette in data/parts.json, turned into the shape the engine uses:
 *
 *   kanji    { [kanji]: { strokes, jlpt, freq, meanings, on, kun, parts: [{ el, pos, form? }] } }
 *   tiles    data/parts.json's tiles: [{ id, strokes, uses, forms }]
 *   answers  { [length]: [answer, …] }   the daily order, Keep words only
 *   words    { [word]: { reading, meanings } }   for answers of 2+ kanji
 *   epoch    'YYYY-MM-DD', the date of puzzle 1
 */

// Raw JSON in → engine data out. Pure, so tests can feed it fixtures.
export function prepareData({ kanji, answers, parts }) {
  const fields = kanji.fields;
  const out = {};
  Object.entries(kanji.kanji).forEach(([ch, row]) => {
    const k = Object.fromEntries(fields.map((name, i) => [name, row[i]]));
    k.parts = (k.parts || []).map(([el, pos, form]) => (form ? { el, pos, form } : { el, pos }));
    out[ch] = k;
  });
  const words = Object.fromEntries(Object.entries((answers && answers.words) || {})
    .map(([word, [reading, meanings]]) => [word, { reading, meanings }]));
  return {
    kanji: out,
    tiles: parts.tiles,
    answers: (answers && answers.answers) || {},
    words,
    epoch: (answers && answers.epoch) || null
  };
}

// Fetches the three files (relative to the page) and prepares them.
export async function loadData(base = 'data/') {
  const get = async (path) => {
    const response = await fetch(base + path);
    if (!response.ok) throw new Error(`couldn't load ${base}${path} (${response.status})`);
    return response.json();
  };
  const [kanji, answers, parts] = await Promise.all([get('game/kanji.json'), get('game/answers.json'), get('parts.json')]);
  return prepareData({ kanji, answers, parts });
}
