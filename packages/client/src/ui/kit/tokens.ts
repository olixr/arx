/**
 * THE ONE MATERIAL TRUTH — the single source for every color, ladder
 * and lane the interface wears (The Grand Refit, Phase 1).
 *
 * Before this module, the palette lived twice: once in style.css's
 * `:root` and once as swatch consts inside ui/chrome.ts — and the two
 * had drifted (brass vs gold, stale fallbacks from a pre-refit skin).
 * Now the stylesheet owns NO values. Everything below is injected onto
 * `:root` at boot, and the chrome painter imports the same objects, so
 * a material can never disagree with itself again.
 *
 * Laws:
 * - ONE TRUTH. No hex literal may be added to style.css that exists
 *   here; no swatch may be added here without a CSS custom property.
 * - LADDERS, NOT NUMBERS. New sizes come from the type/space/radius/
 *   stroke ladders. A bare px in a stylesheet is a defect.
 * - REM IS THE RULER. Every ladder value is rem so the whole interface
 *   rides the root scale (ui/kit/scale.ts). Only true hairline art may
 *   ever reason in device pixels.
 */

/* ---------------------------------------------------------------- */
/* The painted materials — imported by ui/chrome.ts for the 9-slice  */
/* kit and published to CSS so the stylesheet can echo them.         */
/* ---------------------------------------------------------------- */

/**
 * THE INK — the world's outline-shader color (renderer STRUCT_OUTLINE
 * and the icons' eight-tap ring). The Ink Pass makes it a UI material:
 * every raised or sunken piece of furniture wears this same bold line,
 * so a button and the axe painted on it finally speak one language.
 */
export const INK = '#241a2e';

/** Structure: riveted case bands, key buttons. */
export const IRON = { rim: '#0f0c08', base: '#3b4048', lit: '#5a626d', dark: '#22262b' };
/** The touchable: action ingots, brackets, crests, fillet lines. */
export const BRASS = { rim: '#22150a', base: '#c99a3e', lit: '#eec66e', dark: '#8a6420' };
/** The field everything sits in. */
export const LEATHER = { seam: '#171208', echo: '#4a3f2e' };
/** The documents: blueprint sheets, title banners. */
export const PAPER = { field: '#e9dcba', edge: '#c3b189', rim: '#6b5c3d', ink: '#3a2f1d' };

/** The case-bottom leather field — CSS `--panel` and the painter agree. */
export const PANEL_FILL = '#262019';
/** The recessed well floor — CSS `--sunk` and the painter agree. */
export const SUNK_FILL = '#191510';
/**
 * THE SUEDE BED — the floor of a FILLED well. The icons wear the
 * world's dark outline ring, and a ring only cuts against ground
 * lighter than itself: on the near-black well floor the shader was
 * invisible. Occupied wells are lined with this warm mid suede so
 * every icon pops the way it does standing in the world; empty wells
 * keep the quiet dark floor so a bare pack never glares.
 */
export const BED_FILL = '#71603f';

/* ---------------------------------------------------------------- */
/* The palette — every CSS color token, by family.                   */
/* ---------------------------------------------------------------- */

export const PALETTE: Record<string, string> = {
  /* the leather field */
  ink: '#14110d',
  panel: PANEL_FILL,
  raise: '#332a1f',
  'raise-hi': '#3f3425',
  sunk: SUNK_FILL,
  'well-bed': BED_FILL,
  line: LEATHER.echo,
  'line-strong': '#63543c',

  /* structure + touchable metals */
  iron: IRON.base,
  'iron-lit': IRON.lit,
  brass: BRASS.base,
  'brass-lit': BRASS.lit,
  /* The one ink for text stamped on brass — four strays unified. */
  'brass-ink': '#241503',

  /* documents + working text */
  parchment: '#f0e6cf',
  'parchment-dim': '#b2a78f',
  /* The quiet third voice: annotations, counts at rest. */
  'parchment-faint': '#9a8f78',
  'sheet-ink': PAPER.ink,

  /* the gold ramp — deep to hot, one family */
  'gold-deep': '#8a5f1c',
  gold: '#d9a441',
  'gold-bright': '#e8b64c',
  'gold-hot': '#ffe9a8',

  /* the ember ramp (harm, shortfall, theft) */
  'ember-deep': '#c8483e',
  red: '#d95763',
  'red-soft': '#ff9b8a',

  /* growth and water */
  green: '#7dc46a',
  blue: '#7fb4d9',

  /* the bond family — the companion's color. `bond` is the collar's
     bond-green ink the world already paints on a tamed friend; the
     deep tone is its shaded half for two-tone gauge fills. */
  bond: '#9fd39a',
  'bond-deep': '#5f8f58',

  /* the arcane family — Callings, lessons, the cinema's law lines.
     Lived as scattered literals since the codex shipped; now named. */
  arcane: '#b49af0',
  'arcane-soft': '#b9a8d0',
  'arcane-deep': '#6a5a9a',
  'arcane-shade': '#43405e',

  /* the one silhouette shadow */
  shadow: 'rgba(12, 8, 4, 0.55)',

  /* THE INK — the outline shader's line, worn by the furniture too.
     `ink-line` is the ring furniture cuts inward from its silhouette;
     `ink-wash` is the translucent version for seals and count pills. */
  outline: INK,
  'ink-line': 'rgba(16, 10, 20, 0.9)',
  'ink-wash': 'rgba(16, 10, 14, 0.85)',
};

/* ---------------------------------------------------------------- */
/* The ladders — every size the interface may use, in rem.           */
/* ---------------------------------------------------------------- */

/** Type ladder: six steps. Names say the job, not the size. */
export const TYPE: Record<string, string> = {
  't-whisper': '0.75rem' /* 12 — corner counts, seals */,
  't-label': '0.84375rem' /* 13.5 — chips, badges, sublines */,
  't-body': '1rem' /* 16 — the couch-readable floor */,
  't-lead': '1.125rem' /* 18 — row names, tooltip names */,
  't-title': '1.5rem' /* 24 — plaque values, bench names */,
  't-display': '1.875rem' /* 30 — screen titles, ceremony */,
};

/** Space ladder: the only gaps and paddings there are. */
export const SPACE: Record<string, string> = {
  'sp-1': '0.125rem' /* 2 */,
  'sp-2': '0.25rem' /* 4 */,
  'sp-3': '0.375rem' /* 6 */,
  'sp-4': '0.5rem' /* 8 */,
  'sp-5': '0.75rem' /* 12 */,
  'sp-6': '1rem' /* 16 */,
  'sp-7': '1.5rem' /* 24 */,
  'sp-8': '2rem' /* 32 */,
};

/** Rounding: chips, plates, and the case. Chamfers stay painted. */
export const RADIUS: Record<string, string> = {
  'r-chip': '0.25rem' /* 4 */,
  'r-plate': '0.4375rem' /* 7 */,
  'r-case': '0.8125rem' /* 13 */,
};

/** Strokes: the three line weights. */
export const STROKE: Record<string, string> = {
  hairline: '0.09375rem' /* 1.5 */,
  rule: '0.125rem' /* 2 */,
  rim: '0.1875rem' /* 3 */,
};

/**
 * THE BOTTOM LANES — the south edge is shared real estate: hotbar,
 * action strip, loot tray, sign tray, build tray all park here. Their
 * altitudes were five hand-tuned constants that had to agree by luck;
 * now they are one stack.
 */
export const LANES: Record<string, string> = {
  'lane-hotbar': '0.875rem' /* 14 — the hotbar's rest */,
  'lane-chips': '1.125rem' /* 18 — buff/status chip row beside the hotbar */,
  'lane-plaque': '4.0625rem' /* 65 — companion plaque above the chips */,
  'lane-strip': '5.75rem' /* 92 — the action strip above it */,
  'lane-loot': '6rem' /* 96 — loot tray's floor */,
  'lane-sign': '7.5rem' /* 120 — sign tray's floor */,
  'lane-build': '11rem' /* 176 — build tray above the pinned strip */,
};

/* ---------------------------------------------------------------- */

/** The one text shadow: sharp, offset, never blurred. Scales. */
const SHADOWS: Record<string, string> = {
  punch: '0.125rem 0.125rem 0 rgba(14, 10, 5, 0.9)',
  'punch-small': '0.09375rem 0.09375rem 0 rgba(14, 10, 5, 0.9)',
};

const FONTS: Record<string, string> = {
  serif: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
};

const SANS = "'Trebuchet MS', 'Verdana', sans-serif";

/**
 * Publish the whole truth to `:root`. Called at boot before any panel
 * shows — the stylesheet holds no values of its own.
 */
export function installTokens(): void {
  const root = document.documentElement.style;
  for (const sheet of [PALETTE, TYPE, SPACE, RADIUS, STROKE, LANES, SHADOWS, FONTS]) {
    for (const [name, value] of Object.entries(sheet)) {
      root.setProperty(`--${name}`, value);
    }
  }
  root.fontFamily = SANS;
}
