/*
 * Kanjiru — Design Tokens
 *
 * Two layers:
 *   primitives → named by what they ARE   (color.gray.200, spacing.16)
 *   semantic   → named by what they DO    (color.text.primary, spacing.md)
 *
 * Skins (colour themes) sit on top of the semantic layer:
 *   - <html data-theme="ai">     picks the skin
 *   - <html data-scheme="dark">  picks light or dark within it
 *   - A skin lists only the semantic tokens it changes; everything else
 *     comes from the base light or dark set.
 *   - A skin may have one scheme only (urushi is dark-only). The other
 *     scheme then falls back to the one it has.
 *
 * Adding a skin: add its palette to primitives, its colours to THEMES
 * below, then its catalogue entry (name, tier, unlock) in
 * js/config/skins.js. The ids must match.
 *
 * NOT tokenized (intentional):
 *   - Breakpoints — @media order matters more than a token would.
 *   - z-index     — a small hand-managed stack is clearer than a token map.
 *
 * Usage:
 *   CSS:  color: var(--color-text-primary);
 *   JS:   window.TOKENS.active().color.text.primary
 */
(function () {
  'use strict';

  var SAVE_KEY = 'kanjiru';

  // ──────────────────────────────────────────────────────────────────
  // PRIMITIVES
  // ──────────────────────────────────────────────────────────────────

  var primitives = {
    color: {
      // Warm neutrals: paper at the light end, ink at the dark end.
      gray: {
        0:   '#FFFFFF',
        50:  '#FAF8F5',
        100: '#F2EFEA',
        200: '#E4DFD7',
        300: '#CBC4B8',
        400: '#A39B8E',
        500: '#7A7366',
        550: '#6B6458',  // muted text that still clears 4.5:1 on paper
        600: '#5A544A',
        700: '#3D3932',
        800: '#26231F',
        850: '#1E1C19',
        900: '#171513',
        950: '#0E0D0B'
      },
      // Brand: vermilion (朱 shu), the red of a hanko seal.
      vermilion: {
        50:  '#FDF0EC',
        100: '#FADBD2',
        200: '#F4B5A5',
        300: '#EC8A72',
        400: '#E3634A',
        500: '#D9412B',
        600: '#B8331F',  // brand on buttons: white text 5.9:1
        700: '#922818',
        800: '#6C1E13',
        900: '#48140D'
      },
      // Skin palettes, traditional Japanese colours. Every palette has the
      // same stops so accentTheme() can build a skin from any of them.
      ai: {       // 藍 indigo
        50: '#F1F4FA', 100: '#DCE3F2', 300: '#8DA2CF', 500: '#3A5BA0',
        700: '#263F75', 800: '#1C2F58', 900: '#13203D', 950: '#0B1326'
      },
      matcha: {   // 抹茶 green tea
        50: '#F4F7EC', 100: '#E4EBCF', 300: '#B3C484', 500: '#7A9140',
        700: '#4E5E27', 800: '#3A461D', 900: '#252D13', 950: '#151A0B'
      },
      sakura: {   // 桜 cherry blossom
        50: '#FDF3F6', 100: '#FBE3EA', 300: '#F0B0C2', 500: '#D9708F',
        700: '#A3425F', 800: '#7E3049', 900: '#4F1E2E', 950: '#2E111A'
      },
      kin: {      // 金 gold
        50: '#FBF6E9', 100: '#F4EBD3', 300: '#DCC383', 500: '#B8923A',
        700: '#7A5C1C', 800: '#5E4615', 900: '#3B2D0D', 950: '#221A07'
      },
      urushi: {   // 漆 lacquer
        500: '#B8321F', 700: '#8E2418', 800: '#2A1210', 900: '#1F0D0B', 950: '#140807'
      },
      // Guess feedback. Glyphs on tiles are large, so 3:1 is the floor.
      feedback: {
        hit:  '#4C8B3F',  // right part, right place — white 4.1:1
        near: '#B07F12',  // right part, wrong place — white 3.6:1
        miss: '#7A7366'   // not in the answer       — white 4.7:1
      },
      status: {
        info:    '#3A6EA5',
        success: '#4C8B3F',
        warning: '#B07F12',
        danger:  '#C0392B'
      },
      scrim: {
        light: 'rgba(23, 21, 19, 0.48)',
        dark:  'rgba(0, 0, 0, 0.64)'
      },
      white: '#FFFFFF',
      black: '#000000'
    },

    // 4px base grid: 0, 1, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96, 128
    spacing: {
      0: '0px', 1: '1px', 2: '2px', 4: '4px', 8: '8px', 12: '12px', 16: '16px',
      20: '20px', 24: '24px', 32: '32px', 40: '40px', 48: '48px', 56: '56px',
      64: '64px', 80: '80px', 96: '96px', 128: '128px'
    },

    fontFamily: {
      ui:    "'Noto Sans JP', system-ui, -apple-system, 'Segoe UI', sans-serif",
      kanji: "'Noto Serif JP', 'Yu Mincho', 'Hiragino Mincho ProN', serif"
    },
    fontSize: {
      12: '12px', 16: '16px', 20: '20px', 24: '24px', 32: '32px',
      40: '40px', 48: '48px', 64: '64px', 96: '96px'
    },
    fontWeight: { regular: '400', medium: '500', bold: '700', black: '900' },
    lineHeight: { tight: '1.1', snug: '1.3', normal: '1.5', relaxed: '1.7' },
    letterSpacing: { 0: '0', 2: '0.02em', 8: '0.08em' },

    // Larger fixed sizes (layout widths), still on the 4px grid.
    size: { 120: '120px', 240: '240px', 560: '560px' },

    radius: {
      0: '0px', 4: '4px', 8: '8px', 12: '12px', 16: '16px', 24: '24px', full: '9999px'
    },

    shadow: {
      none: 'none',
      sm:   '0 1px 2px rgba(23, 21, 19, 0.08)',
      md:   '0 4px 12px rgba(23, 21, 19, 0.10)',
      lg:   '0 12px 32px rgba(23, 21, 19, 0.16)',
      smDark: '0 1px 2px rgba(0, 0, 0, 0.40)',
      mdDark: '0 4px 12px rgba(0, 0, 0, 0.48)',
      lgDark: '0 12px 32px rgba(0, 0, 0, 0.56)'
    },

    duration: { 0: '0ms', 100: '100ms', 200: '200ms', 300: '300ms', 500: '500ms', 800: '800ms', 3000: '3000ms', 5000: '5000ms' },
    easing: {
      standard:   'cubic-bezier(0.2, 0, 0, 1)',
      emphasized: 'cubic-bezier(0.3, 0, 0, 1.3)',
      ink:        'cubic-bezier(0.6, 0, 0.2, 1)',   // slow start, quick finish, like a brush
      linear:     'linear'
    },

    opacity: { 0: '0', 25: '0.25', 40: '0.4', 60: '0.6', 80: '0.8', 100: '1' }
  };

  // ──────────────────────────────────────────────────────────────────
  // SEMANTIC — base light
  // ──────────────────────────────────────────────────────────────────

  var c = primitives.color;
  var s = primitives.spacing;
  var f = primitives.fontSize;

  var semanticLight = {
    color: {
      text: {
        primary:   c.gray[900],
        secondary: c.gray[600],
        muted:     c.gray[550],
        inverse:   c.gray[0],
        accent:    c.vermilion[600],
        onAccent:  c.white
      },
      bg: {
        page:    c.gray[50],
        surface: c.gray[0],
        raised:  c.gray[0],
        sunken:  c.gray[100],
        overlay: c.scrim.light
      },
      border: {
        subtle:  c.gray[200],
        default: c.gray[300],
        strong:  c.gray[500],
        focus:   c.vermilion[500]
      },
      interactive: {
        hover:    c.gray[100],
        active:   c.gray[200],
        selected: c.vermilion[50]
      },
      action: {
        primary:   { bg: c.vermilion[600], text: c.white, hover: c.vermilion[700] },
        secondary: { bg: c.gray[100], text: c.gray[900], hover: c.gray[200] }
      },
      link: {
        default: c.vermilion[600],
        hover:   c.vermilion[700]
      },
      status: {
        info:    c.status.info,
        success: c.status.success,
        warning: c.status.warning,
        danger:  c.status.danger
      },
      feedback: {
        hit:  c.feedback.hit,
        near: c.feedback.near,
        // In another kanji of the word: yellow too, like a letter in the
        // wrong spot. Its own token, so a colour-blind mode can split it.
        other: c.feedback.near,
        miss: c.feedback.miss,
        text: c.white
      },
      tile: {
        bg:     c.gray[0],
        border: c.gray[300],
        text:   c.gray[900]
      }
    },

    spacing: {
      xs:    s[4],
      sm:    s[8],
      md:    s[16],
      lg:    s[24],
      xl:    s[32],
      '2xl': s[48],
      '3xl': s[64]
    },

    font: {
      family: { ui: primitives.fontFamily.ui, kanji: primitives.fontFamily.kanji },
      size: {
        xs:      f[12],
        md:      f[16],
        lg:      f[20],
        xl:      f[24],
        '2xl':   f[32],
        '3xl':   f[48],
        display: f[64],
        hero:    f[96]
      },
      weight: {
        regular: primitives.fontWeight.regular,
        medium:  primitives.fontWeight.medium,
        bold:    primitives.fontWeight.bold,
        black:   primitives.fontWeight.black
      },
      lineHeight: {
        tight:   primitives.lineHeight.tight,
        snug:    primitives.lineHeight.snug,
        normal:  primitives.lineHeight.normal,
        relaxed: primitives.lineHeight.relaxed
      },
      tracking: {
        none: primitives.letterSpacing[0],
        wide: primitives.letterSpacing[2],
        caps: primitives.letterSpacing[8]
      }
    },

    // Border and outline widths.
    stroke: {
      thin:  s[1],
      thick: s[2]
    },

    // Fixed layout sizes.
    layout: {
      container: primitives.size[560],
      cardMin:   primitives.size[120],
      powerMin:  primitives.size[240],
      swatch:    s[96],
      guessCol:  s[64],
      tile:      s[48],
      cell:      s[40],  // game screen: board and palette tiles
      // Board cells at Normal and Hard: the game screen picks the largest
      // that fits the screen and the answer's number of parts.
      cellXs:    s[24],
      cellSm:    s[32],
      cellMd:    s[48],
      cellLg:    s[56],
      cellXl:    s[64],
      // Guided: the kanji built from found parts, above each kanji's cells.
      frameSm:   s[56],
      frame:     s[64],
      // The keyboard's keys: their height, and their least width. The game
      // screen drops to the small height only to keep cells at 32 px or more.
      keySm:     s[32],
      key:       s[40],
      // The play card's hanko seal, and a switch's track (its knob is
      // spacing.md, inset by spacing.xs).
      seal:      s[56],
      switch:    s[40]
    },

    radius: {
      none: primitives.radius[0],
      sm:   primitives.radius[4],
      md:   primitives.radius[8],
      lg:   primitives.radius[12],
      xl:   primitives.radius[16],
      full: primitives.radius.full
    },

    shadow: {
      none: primitives.shadow.none,
      sm:   primitives.shadow.sm,
      md:   primitives.shadow.md,
      lg:   primitives.shadow.lg
    },

    transition: {
      fast:   primitives.duration[100],
      base:   primitives.duration[200],
      slow:   primitives.duration[300],
      reveal: primitives.duration[500],
      long:   primitives.duration[800],
      message: primitives.duration[3000],   // how long a game message stays up
      toast:  primitives.duration[5000],    // how long a toast stays up
      ease:   primitives.easing.standard,
      bounce: primitives.easing.emphasized,
      ink:    primitives.easing.ink
    },

    opacity: {
      hidden:   primitives.opacity[0],
      faint:    primitives.opacity[25],
      disabled: primitives.opacity[40],
      soft:     primitives.opacity[60],
      strong:   primitives.opacity[80],
      full:     primitives.opacity[100]
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // SEMANTIC — base dark (only what differs from light)
  // ──────────────────────────────────────────────────────────────────

  var darkOverrides = {
    color: {
      text: {
        primary:   c.gray[50],
        secondary: c.gray[300],
        muted:     c.gray[400],
        inverse:   c.gray[900],
        accent:    c.vermilion[300]
      },
      bg: {
        page:    c.gray[950],
        surface: c.gray[900],
        raised:  c.gray[850],
        sunken:  c.gray[950],
        overlay: c.scrim.dark
      },
      border: {
        subtle:  c.gray[800],
        default: c.gray[700],
        strong:  c.gray[500],
        focus:   c.vermilion[400]
      },
      interactive: {
        hover:    c.gray[800],
        active:   c.gray[700],
        selected: c.vermilion[900]
      },
      action: {
        primary:   { hover: c.vermilion[700] },
        secondary: { bg: c.gray[800], text: c.gray[50], hover: c.gray[700] }
      },
      link: {
        default: c.vermilion[300],
        hover:   c.vermilion[200]
      },
      tile: {
        bg:     c.gray[900],
        border: c.gray[700],
        text:   c.gray[50]
      }
    },
    shadow: {
      sm: primitives.shadow.smDark,
      md: primitives.shadow.mdDark,
      lg: primitives.shadow.lgDark
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // THEMES (skins) — colour overrides on top of base light / dark
  // ──────────────────────────────────────────────────────────────────

  // Builds a light + dark skin from any palette with the standard stops.
  // A plain colour skin is then one line: `ai: accentTheme(c.ai)`.
  function accentTheme(p) {
    return {
      light: {
        color: {
          bg:          { page: p[50] },
          text:        { accent: p[700] },
          border:      { focus: p[500] },
          interactive: { selected: p[100] },
          action:      { primary: { bg: p[700], hover: p[800] } },
          link:        { default: p[700], hover: p[800] }
        }
      },
      dark: {
        color: {
          bg:          { page: p[950], surface: p[900], raised: p[800], sunken: p[950] },
          text:        { accent: p[300] },
          border:      { focus: p[300], subtle: p[800] },
          interactive: { selected: p[800], hover: p[800] },
          action:      { primary: { bg: p[700], hover: p[800] } },
          link:        { default: p[300], hover: p[100] },
          tile:        { bg: p[900], border: p[700] }
        }
      }
    };
  }

  var THEMES = {
    // Free basics
    'default': { light: {}, dark: {} },
    ai:        accentTheme(c.ai),
    matcha:    accentTheme(c.matcha),
    sakura:    accentTheme(c.sakura),

    // Fancy (unlockable). Textures and animations come from the skin's
    // CSS class in styles.css; these are only the colours.
    urushi: {
      dark: {
        color: {
          bg:          { page: c.urushi[950], surface: c.urushi[900], raised: c.urushi[800], sunken: c.urushi[950] },
          text:        { accent: c.kin[300] },
          border:      { focus: c.kin[300], subtle: c.urushi[800], default: c.kin[800] },
          interactive: { selected: c.urushi[800], hover: c.urushi[800] },
          action:      { primary: { bg: c.urushi[700], hover: c.urushi[500] } },
          link:        { default: c.kin[300], hover: c.kin[100] },
          tile:        { bg: c.urushi[900], border: c.kin[700] }
        }
      }
    },
    kinpaku: {
      light: accentTheme(c.kin).light
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // Resolving and injecting
  // ──────────────────────────────────────────────────────────────────

  function isObject(v) {
    return v && typeof v === 'object' && !Array.isArray(v);
  }

  function merge(base, over) {
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    Object.keys(over || {}).forEach(function (k) {
      out[k] = isObject(base[k]) && isObject(over[k]) ? merge(base[k], over[k]) : over[k];
    });
    return out;
  }

  var semanticDark = merge(semanticLight, darkOverrides);
  var BASE = { light: semanticLight, dark: semanticDark };

  // Which schemes a theme actually has (urushi → ['dark']).
  function schemesOf(themeId) {
    var t = THEMES[themeId] || THEMES['default'];
    return ['light', 'dark'].filter(function (sch) { return !!t[sch]; });
  }

  // The scheme a theme will really show for a requested scheme.
  function effectiveScheme(themeId, scheme) {
    var has = schemesOf(themeId);
    return has.indexOf(scheme) !== -1 ? scheme : has[0];
  }

  // Full semantic token set for a theme + scheme.
  function resolve(themeId, scheme) {
    var id = THEMES[themeId] ? themeId : 'default';
    var sch = effectiveScheme(id, scheme);
    return merge(BASE[sch], THEMES[id][sch]);
  }

  function flattenToCssVars(obj, prefix, out) {
    Object.keys(obj).forEach(function (key) {
      var name = prefix ? prefix + '-' + key : key;
      if (isObject(obj[key])) {
        flattenToCssVars(obj[key], name, out);
      } else {
        out['--' + name] = obj[key];
      }
    });
    return out;
  }

  function buildCssBlock(selector, semantic, scheme) {
    var vars = flattenToCssVars(semantic, '', {});
    var lines = Object.keys(vars).map(function (k) {
      return '  ' + k + ': ' + vars[k] + ';';
    });
    lines.push('  color-scheme: ' + scheme + ';');
    return selector + ' {\n' + lines.join('\n') + '\n}\n';
  }

  function buildCss() {
    var css = buildCssBlock(':root', resolve('default', 'light'), 'light') +
              buildCssBlock('[data-scheme="dark"]', resolve('default', 'dark'), 'dark');
    Object.keys(THEMES).forEach(function (id) {
      if (id === 'default') return;
      ['light', 'dark'].forEach(function (sch) {
        var sel = '[data-theme="' + id + '"]' + (sch === 'dark' ? '[data-scheme="dark"]' : '');
        css += buildCssBlock(sel, resolve(id, sch), effectiveScheme(id, sch));
      });
    });
    return css;
  }

  function injectTokens() {
    var style = document.getElementById('tokens-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'tokens-css';
      document.head.appendChild(style);
    }
    style.textContent = buildCss();
  }

  // ──────────────────────────────────────────────────────────────────
  // Applying a look (theme + scheme)
  // ──────────────────────────────────────────────────────────────────

  function systemScheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark' : 'light';
  }

  // Reads the saved look straight from the save, so the first paint is
  // already in the right colours. Any problem falls back to the defaults.
  function savedLook() {
    try {
      var save = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      return (save && save.settings) || {};
    } catch (e) {
      return {};
    }
  }

  var current = { theme: 'default', scheme: 'light' };

  function applyLook(theme, scheme) {
    var id = THEMES[theme] ? theme : 'default';
    var sch = effectiveScheme(id, scheme === 'dark' || scheme === 'light' ? scheme : systemScheme());
    var root = document.documentElement;
    root.setAttribute('data-theme', id);
    root.setAttribute('data-scheme', sch);
    current = { theme: id, scheme: sch };

    // The phone's address bar takes the page colour.
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = resolve(id, sch).color.bg.page;
    return current;
  }

  // ──────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────

  window.TOKENS = {
    primitives: primitives,
    semantic: semanticLight,        // base light layer
    themes: THEMES,
    resolve: resolve,               // (themeId, scheme) → semantic set
    schemesOf: schemesOf,           // themeId → ['light', 'dark']
    systemScheme: systemScheme,
    applyLook: applyLook,           // (themeId, scheme|null) → { theme, scheme }
    look: function () { return current; },
    active: function () { return resolve(current.theme, current.scheme); }
  };

  // Runs from <head> before the stylesheet applies and before first
  // paint, so the page never shows without its colours.
  injectTokens();
  var look = savedLook();
  applyLook(look.theme, look.scheme);
})();
