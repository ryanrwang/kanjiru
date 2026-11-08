/*
 * The About page (#about, opened from Settings and the result card; the
 * header shows 漢 › About): what Kanjiru is, where your progress is kept,
 * and the credits.
 *
 *   const page = openAbout(root);
 *
 * EDRDG asks apps to credit JMdict and KANJIDIC on a screen of their own,
 * with links to the project pages and the licence; KanjiVG and Jonathan
 * Waller ask for a credit and a link. data/ATTRIBUTION.md has the exact
 * versions and licences. The names and words are text (about.source.<id>);
 * the links and licences are here.
 */
import { t } from './i18n.js';
import { el } from './dom.js';

const EDRDG = 'https://www.edrdg.org/';
const EDRDG_LICENCE = 'https://www.edrdg.org/edrdg/licence.html';
const JMDICT = 'https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project';
const KANJIDIC = 'https://www.edrdg.org/wiki/index.php/KANJIDIC_Project';
const SOURCE_CODE = 'https://github.com/ryanrwang/kanjiru';
const DATA_LICENCE = ['CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/'];
const AUTHOR = 'https://www.ryanrwang.com/';

// Each source: its links ([text key, url]) and its licence ([name, url]).
const SOURCES = [
  { id: 'jmdict', links: [['project', JMDICT], ['json', 'https://github.com/scriptin/jmdict-simplified']], licence: ['CC BY-SA 4.0', EDRDG_LICENCE] },
  { id: 'kanjidic', links: [['project', KANJIDIC]], licence: ['CC BY-SA 4.0', EDRDG_LICENCE] },
  { id: 'kanjivg', links: [['project', 'https://kanjivg.tagaini.net']], licence: ['CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/'] },
  // tanos.co.uk is offline; the archive keeps it, and Waller's "Use my data!" page.
  { id: 'waller', links: [['site', 'https://web.archive.org/web/2020/http://www.tanos.co.uk/jlpt/'], ['lists', 'https://github.com/stephenmk/yomitan-jlpt-vocab']], licence: ['CC BY', 'https://web.archive.org/web/20251114165345/http://www.tanos.co.uk/jlpt/sharing/'] },
  { id: 'noto', links: [['fonts', 'https://fonts.google.com/noto']], licence: ['SIL OFL 1.1', 'https://openfontlicense.org/'] }
];

const out = (href, text) => el('a', { href, target: '_blank', rel: 'noopener' }, text);
// Links in a row, apart.
const linkRow = (links) => el('p', { class: 'credit-links' },
  links.map((link, i) => [i ? el('span', { class: 'credit-sep', 'aria-hidden': 'true' }, ' · ') : null, link]));

function intro() {
  return el('section', { class: 'card about-intro', 'aria-labelledby': 'about-name' },
    el('div', { class: 'play-top' },
      el('span', { class: 'play-seal kanji', lang: 'ja', 'aria-hidden': 'true' }, '漢'),
      el('div', { class: 'play-heading' },
        el('h2', { class: 'play-title', id: 'about-name' },
          'Kanjiru ', el('span', { class: 'kanji', lang: 'ja' }, '漢じる')),
        el('p', { class: 'about-by' }, out(AUTHOR, t('about.by'))))),
    el('p', { class: 'about-lead' }, t('about.lead')),
    el('p', { class: 'about-text' }, t('about.name')));
}

function progress() {
  return el('section', { class: 'section', 'aria-labelledby': 'about-privacy' },
    el('h2', { class: 'section-title', id: 'about-privacy' }, t('about.privacy.title')),
    el('p', { class: 'card about-card about-text' }, t('about.privacy.body')));
}

function source(s) {
  return el('li', { class: 'card credit' },
    el('p', { class: 'credit-name' }, t(`about.source.${s.id}.name`)),
    el('p', { class: 'credit-by' }, t(`about.source.${s.id}.by`)),
    el('p', { class: 'credit-use' }, t(`about.source.${s.id}.use`)),
    linkRow([...s.links.map(([key, url]) => out(url, t(`about.link.${key}`))), out(s.licence[1], s.licence[0])]));
}

function credits() {
  return el('section', { class: 'section', 'aria-labelledby': 'about-credits' },
    el('h2', { class: 'section-title', id: 'about-credits' },
      t('about.credits.title'), el('span', { class: 'section-note' }, t('about.credits.note'))),
    // EDRDG's own wording, with its links.
    el('div', { class: 'card about-card' },
      el('p', { class: 'about-text' }, t('about.credits.edrdg')),
      linkRow([out(JMDICT, 'JMdict'), out(KANJIDIC, 'KANJIDIC'), out(EDRDG, t('about.link.edrdg')), out(EDRDG_LICENCE, t('about.link.licence'))])),
    el('ul', { class: 'credit-list' }, SOURCES.map(source)),
    el('div', { class: 'card about-card' },
      el('p', { class: 'about-text' }, t('about.credits.data')),
      linkRow([out(DATA_LICENCE[1], DATA_LICENCE[0]), out(SOURCE_CODE, t('about.link.code'))])));
}

export function openAbout(root) {
  const page = el('section', { class: 'page about-page', 'aria-labelledby': 'about-title' });
  const render = () => page.replaceChildren(intro(), progress(), credits());
  render();
  root.replaceChildren(page);
  return { refresh: render, destroy() {} };
}
