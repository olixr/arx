import { shade } from './rig.js';

/**
 * Sword visual styles — the CAPE_STYLES pattern for the blade roster.
 * Each record is pure data over one painter vocabulary: a blade
 * silhouette, a guard, a grip, a pommel, and an optional living fx
 * channel (ember seams, frost fog, starlight) driven off nowMs so every
 * instance of a blade shimmers in phase with the world, not the frame.
 *
 * Painter laws (shared with armor.ts):
 * - hurt ⇒ flat #ffffff silhouette, no details, no fx;
 * - fills on the live ctx, no allocation in the draw path;
 * - the outline is the renderer's dilate pass — never stroked here;
 * - geometry lives in the held-item frame: +x runs hand → tip, the
 *   bright edge faces −y (the sun law), grip behind the fist at −x.
 */

export type BladeKind =
  | 'arming'   // straight knightly taper — the reference silhouette
  | 'falchion' // straight back, flared cutting belly, clipped point
  | 'gladius'  // short, wide, leaf-waisted stabber
  | 'scimitar' // deep up-swept curve
  | 'saber'    // shallow curve, slim and quick
  | 'rapier'   // long needle with a ricasso
  | 'cutlass'  // short broad curve, clipped tip
  | 'cleaver'  // brutal square-nosed chopper
  // ---- the dagger vocabulary (short blades, len ≈ 0.5–0.7):
  | 'dirk'     // symmetric double-edge taper with a midrib
  | 'stiletto' // needle over a squared ricasso — all point
  | 'kris'     // the wave blade, two full bends
  | 'karambit' // hooked claw, edge on the inner curve
  | 'tanto'    // straight edge, hard angled tip facet
  | 'shivkind' // jagged wrapped scrap — menace by neglect
  | 'talon'    // one smooth fang curve
  | 'leafblade'; // small waisted leaf, the utility knife

export type GuardKind =
  | 'cross'  // straight quillon bar
  | 'swept'  // duelist's curved knuckle bow
  | 'shell'  // scalloped half-shell
  | 'disc'   // round plate
  | 'fang'   // two forward-raked tusks
  | 'thorn'  // three briar spikes
  | 'crown'  // crenellated bar
  | 'wing'   // paired swept wings
  | 'bolt'   // zigzag storm bar
  | 'stub'   // crude block, barely a guard
  | 'none';  // guardless — a knife trusts its grip

export type PommelKind =
  | 'round' | 'gem' | 'fang' | 'ring' | 'crescent' | 'star' | 'crown' | 'none';

export type BladeFx =
  | 'ember'  // rising ember motes off the fuller
  | 'frost'  // hanging frost-fog dots
  | 'void'   // wisp lights drifting tipward
  | 'storm'  // hard spark flickers
  | 'blood'  // slow beads running the seam
  | 'sun'    // warm sparks at the edge
  | 'star'   // twinkling starlight
  | 'gleam'; // a single glint traveling the edge

export interface SwordStyle {
  blade: BladeKind;
  /** Blade steel. Edge defaults to shade(+34), fuller to shade(−24). */
  color: string;
  edge?: string;
  fuller?: string;
  /** Blade length multiplier (1 ≈ half a body). */
  len?: number;
  guard: GuardKind;
  guardColor: string;
  grip?: string;
  /** Wrap-band accent on the grip. */
  wrap?: string;
  pommel?: PommelKind;
  pommelColor?: string;
  /** Jewel accent (gem pommels, crown settings). */
  gem?: string;
  /** Battle damage: dark bites knocked out of the cutting edge. */
  notched?: boolean;
  fx?: BladeFx;
  fxColor?: string;
}

/**
 * The blade roster's wardrobe. Metal-line variants share their design's
 * silhouette record and change only the palette — one design, four
 * metals, exactly like armor colorways.
 */
export const SWORD_STYLES: Record<string, SwordStyle> = {
  // ---- the classic arming line.
  bronze_sword: {
    blade: 'arming', color: '#c08a52', guard: 'cross', guardColor: '#4a3a2a',
    grip: '#6b4a26', pommel: 'gem', pommelColor: '#d9a441', gem: '#c4553d',
  },
  iron_sword: {
    blade: 'arming', color: '#8d9299', guard: 'cross', guardColor: '#4a3a2a',
    grip: '#5b4028', pommel: 'gem', pommelColor: '#d9a441', gem: '#c4553d',
  },
  steel_sword: {
    blade: 'arming', color: '#c4cad4', len: 1.05, guard: 'cross', guardColor: '#5a5f6a',
    grip: '#3a3540', pommel: 'gem', pommelColor: '#d9a441', gem: '#7fb2d9',
  },
  // The high ladder wears its ore's identity colors — the same hues
  // the deposits and icons speak — and only starsteel earns an fx.
  mithril_sword: {
    blade: 'arming', color: '#8fb4e4', edge: '#d8ecff', len: 1.05, guard: 'cross', guardColor: '#3f5e8c',
    grip: '#2e3a4e', wrap: '#7fa8d9', pommel: 'gem', pommelColor: '#3f5e8c', gem: '#d8ecff',
  },
  adamant_sword: {
    blade: 'arming', color: '#6cb47a', edge: '#d2f0d0', fuller: '#2f5e3c', len: 1.08, guard: 'cross', guardColor: '#2f5e3c',
    grip: '#26382c', wrap: '#5fa06a', pommel: 'gem', pommelColor: '#2f5e3c', gem: '#d2f0d0',
  },
  obsidian_sword: {
    blade: 'arming', color: '#4e4260', edge: '#b8a8d8', fuller: '#2a2333', len: 1.08, guard: 'stub', guardColor: '#332b40',
    grip: '#241d30', wrap: '#6a5a80', pommel: 'round', pommelColor: '#332b40',
  },
  starsteel_sword: {
    blade: 'arming', color: '#d6cbf6', edge: '#ffffff', fuller: '#a99ad8', len: 1.1, guard: 'wing', guardColor: '#7a6ab0',
    grip: '#3a3452', wrap: '#a99ad8', pommel: 'star', pommelColor: '#f4f4ff', fx: 'star', fxColor: '#f4f4ff',
  },

  // ---- falchion line: the workman's chopper.
  falchion: {
    blade: 'falchion', color: '#c08a52', guard: 'stub', guardColor: '#4a3a2a',
    grip: '#6b4a26', wrap: '#8a6a45', pommel: 'round', pommelColor: '#4a3a2a',
  },
  iron_falchion: {
    blade: 'falchion', color: '#9aa0a8', guard: 'stub', guardColor: '#3e3a44',
    grip: '#5b4028', wrap: '#8a6a45', pommel: 'round', pommelColor: '#3e3a44',
  },
  steel_falchion: {
    blade: 'falchion', color: '#c4cad4', guard: 'cross', guardColor: '#5a5f6a',
    grip: '#3a3540', wrap: '#b8bec8', pommel: 'round', pommelColor: '#5a5f6a',
  },
  gold_falchion: {
    blade: 'falchion', color: '#e8c04c', edge: '#fff2cc', guard: 'cross', guardColor: '#b8863f',
    grip: '#6a2a3a', wrap: '#d9a441', pommel: 'round', pommelColor: '#d9a441',
  },
  mithril_falchion: {
    blade: 'falchion', color: '#8fb4e4', edge: '#d8ecff', guard: 'cross', guardColor: '#3f5e8c',
    grip: '#2e3a4e', wrap: '#7fa8d9', pommel: 'round', pommelColor: '#3f5e8c',
  },
  adamant_falchion: {
    blade: 'falchion', color: '#6cb47a', edge: '#d2f0d0', fuller: '#2f5e3c', guard: 'cross', guardColor: '#2f5e3c',
    grip: '#26382c', wrap: '#5fa06a', pommel: 'round', pommelColor: '#2f5e3c',
  },
  obsidian_falchion: {
    blade: 'falchion', color: '#4e4260', edge: '#b8a8d8', fuller: '#2a2333', guard: 'stub', guardColor: '#332b40',
    grip: '#241d30', wrap: '#6a5a80', pommel: 'round', pommelColor: '#332b40',
  },
  starsteel_falchion: {
    blade: 'falchion', color: '#d6cbf6', edge: '#ffffff', fuller: '#a99ad8', guard: 'cross', guardColor: '#7a6ab0',
    grip: '#3a3452', wrap: '#a99ad8', pommel: 'star', pommelColor: '#f4f4ff', fx: 'star', fxColor: '#f4f4ff',
  },

  // ---- gladius line: the legion's short blade (len says SHORT).
  gladius: {
    blade: 'gladius', color: '#c08a52', len: 0.82, guard: 'stub', guardColor: '#5b4028',
    grip: '#8a6a45', wrap: '#6b4a26', pommel: 'round', pommelColor: '#5b4028',
  },
  iron_gladius: {
    blade: 'gladius', color: '#9aa0a8', len: 0.82, guard: 'stub', guardColor: '#4a4554',
    grip: '#8a6a45', wrap: '#5b4028', pommel: 'round', pommelColor: '#4a4554',
  },
  steel_gladius: {
    blade: 'gladius', color: '#c4cad4', len: 0.82, guard: 'disc', guardColor: '#5a5f6a',
    grip: '#5b4028', wrap: '#d9a441', pommel: 'round', pommelColor: '#5a5f6a',
  },
  gold_gladius: {
    blade: 'gladius', color: '#e8c04c', edge: '#fff2cc', len: 0.82, guard: 'disc', guardColor: '#b8863f',
    grip: '#6a2a3a', wrap: '#d9a441', pommel: 'gem', pommelColor: '#d9a441', gem: '#c4553d',
  },
  mithril_gladius: {
    blade: 'gladius', color: '#8fb4e4', edge: '#d8ecff', len: 0.82, guard: 'disc', guardColor: '#3f5e8c',
    grip: '#2e3a4e', wrap: '#7fa8d9', pommel: 'round', pommelColor: '#3f5e8c',
  },
  adamant_gladius: {
    blade: 'gladius', color: '#6cb47a', edge: '#d2f0d0', fuller: '#2f5e3c', len: 0.82, guard: 'disc', guardColor: '#2f5e3c',
    grip: '#26382c', wrap: '#5fa06a', pommel: 'round', pommelColor: '#2f5e3c',
  },
  obsidian_gladius: {
    blade: 'gladius', color: '#4e4260', edge: '#b8a8d8', fuller: '#2a2333', len: 0.82, guard: 'stub', guardColor: '#332b40',
    grip: '#241d30', wrap: '#6a5a80', pommel: 'round', pommelColor: '#332b40',
  },
  starsteel_gladius: {
    blade: 'gladius', color: '#d6cbf6', edge: '#ffffff', fuller: '#a99ad8', len: 0.82, guard: 'disc', guardColor: '#7a6ab0',
    grip: '#3a3452', wrap: '#a99ad8', pommel: 'star', pommelColor: '#f4f4ff', fx: 'star', fxColor: '#f4f4ff',
  },

  // ---- scimitar line: the sideways grin.
  scimitar: {
    blade: 'scimitar', color: '#c08a52', guard: 'disc', guardColor: '#4a3a2a',
    grip: '#6b4a26', pommel: 'crescent', pommelColor: '#4a3a2a',
  },
  iron_scimitar: {
    blade: 'scimitar', color: '#9aa0a8', guard: 'disc', guardColor: '#3e3a44',
    grip: '#5b4028', pommel: 'crescent', pommelColor: '#3e3a44',
  },
  steel_scimitar: {
    blade: 'scimitar', color: '#c4cad4', guard: 'disc', guardColor: '#5a5f6a',
    grip: '#3a3540', wrap: '#b8bec8', pommel: 'crescent', pommelColor: '#5a5f6a',
  },
  gold_scimitar: {
    blade: 'scimitar', color: '#e8c04c', edge: '#fff2cc', guard: 'disc', guardColor: '#b8863f',
    grip: '#6a2a3a', wrap: '#d9a441', pommel: 'crescent', pommelColor: '#d9a441',
  },
  mithril_scimitar: {
    blade: 'scimitar', color: '#8fb4e4', edge: '#d8ecff', guard: 'disc', guardColor: '#3f5e8c',
    grip: '#2e3a4e', wrap: '#7fa8d9', pommel: 'crescent', pommelColor: '#3f5e8c',
  },
  adamant_scimitar: {
    blade: 'scimitar', color: '#6cb47a', edge: '#d2f0d0', fuller: '#2f5e3c', guard: 'disc', guardColor: '#2f5e3c',
    grip: '#26382c', wrap: '#5fa06a', pommel: 'crescent', pommelColor: '#2f5e3c',
  },
  obsidian_scimitar: {
    blade: 'scimitar', color: '#4e4260', edge: '#b8a8d8', fuller: '#2a2333', guard: 'stub', guardColor: '#332b40',
    grip: '#241d30', wrap: '#6a5a80', pommel: 'crescent', pommelColor: '#332b40',
  },
  starsteel_scimitar: {
    blade: 'scimitar', color: '#d6cbf6', edge: '#ffffff', fuller: '#a99ad8', guard: 'disc', guardColor: '#7a6ab0',
    grip: '#3a3452', wrap: '#a99ad8', pommel: 'star', pommelColor: '#f4f4ff', fx: 'star', fxColor: '#f4f4ff',
  },

  // ---- bespoke crafts.
  briarfang: {
    blade: 'saber', color: '#a8925a', edge: '#d0c088', fuller: '#5a7a42',
    guard: 'thorn', guardColor: '#4a5a38', grip: '#5a4a32', wrap: '#79a355',
    pommel: 'fang', pommelColor: '#8a9a5c',
  },
  moonshard: {
    blade: 'rapier', color: '#dfe6f2', edge: '#ffffff', fuller: '#aab8d0',
    guard: 'swept', guardColor: '#9aa4b8', grip: '#3a4a6a', wrap: '#c9d4e8',
    pommel: 'gem', pommelColor: '#9aa4b8', gem: '#8f9ed6', fx: 'gleam', fxColor: '#eef2ff',
  },
  tidereaver: {
    blade: 'cutlass', color: '#8ab4ae', edge: '#d8f0e8', fuller: '#3d7a78',
    guard: 'shell', guardColor: '#e8d9b0', grip: '#3d5a58', wrap: '#b8863f',
    pommel: 'round', pommelColor: '#b8863f',
  },
  emberbrand: {
    blade: 'falchion', color: '#5c5258', edge: '#a89aa0', fuller: '#ff8a3c',
    guard: 'cross', guardColor: '#3a3238', grip: '#2e2a30', wrap: '#c4623c',
    pommel: 'gem', pommelColor: '#3a3238', gem: '#ff8a3c', fx: 'ember', fxColor: '#ffb060',
  },
  dawnbreaker: {
    blade: 'arming', color: '#f2e2b8', edge: '#fff4d0', fuller: '#d9a441', len: 1.05,
    guard: 'wing', guardColor: '#e8b64c', grip: '#8a4a2a', wrap: '#e8b64c',
    pommel: 'gem', pommelColor: '#e8b64c', gem: '#e85a3c', fx: 'sun', fxColor: '#ffdf8a',
  },

  // ---- drop-only wild finds.
  rustbite: {
    blade: 'arming', color: '#8a6a52', edge: '#a8886a', fuller: '#5a4436', len: 0.9,
    guard: 'stub', guardColor: '#5a4a3a', grip: '#4a3a2a', notched: true, pommel: 'none',
  },
  gobsplitter: {
    blade: 'cleaver', color: '#6e7a52', edge: '#98a474', fuller: '#4a5438',
    guard: 'stub', guardColor: '#4a3a2a', grip: '#4a3a2a', wrap: '#8a6a45',
    notched: true, pommel: 'ring', pommelColor: '#5a5448',
  },
  wolffang: {
    blade: 'saber', color: '#aab0bc', edge: '#e2e6ee',
    guard: 'fang', guardColor: '#e8e2d0', grip: '#5a6470', wrap: '#8d939f',
    pommel: 'fang', pommelColor: '#e8e2d0',
  },
  fenreaper: {
    blade: 'falchion', color: '#5a6a58', edge: '#8a9a84', fuller: '#8fd49a', len: 1.1,
    guard: 'cross', guardColor: '#4a4438', grip: '#3a3e34', wrap: '#79a355',
    pommel: 'crescent', pommelColor: '#4a4438', fx: 'void', fxColor: '#8fd49a',
  },
  gravewhisper: {
    blade: 'saber', color: '#8a8d98', edge: '#c8ccd8', fuller: '#aab8d0',
    guard: 'disc', guardColor: '#3a3d48', grip: '#2e3038', wrap: '#5a5f6a',
    pommel: 'ring', pommelColor: '#3a3d48', fx: 'void', fxColor: '#c9d4e8',
  },
  duelists_grace: {
    blade: 'rapier', color: '#e2e6ee', edge: '#ffffff', fuller: '#b8bec8',
    guard: 'swept', guardColor: '#d9a441', grip: '#e6ddc8', wrap: '#d9a441',
    pommel: 'round', pommelColor: '#d9a441',
  },
  frostbrand: {
    blade: 'arming', color: '#cfe2f0', edge: '#ffffff', fuller: '#8ac4e8',
    guard: 'cross', guardColor: '#7a94ac', grip: '#3a4a5c', wrap: '#a8c8dc',
    pommel: 'gem', pommelColor: '#7a94ac', gem: '#8ac4e8', fx: 'frost', fxColor: '#dff0ff',
  },
  bloodletter: {
    blade: 'cleaver', color: '#5a4048', edge: '#8a6a72', fuller: '#c4372a', len: 1.05,
    guard: 'stub', guardColor: '#3a2e34', grip: '#3a2e34', wrap: '#8a3040',
    pommel: 'ring', pommelColor: '#5a4048', fx: 'blood', fxColor: '#e04a38',
  },
  stormcall: {
    blade: 'saber', color: '#7a8ab8', edge: '#c9d4f0', fuller: '#4a5a8a',
    guard: 'bolt', guardColor: '#e8e06a', grip: '#2e3448', wrap: '#e8e06a',
    pommel: 'gem', pommelColor: '#4a5a8a', gem: '#e8e06a', fx: 'storm', fxColor: '#fff2a0',
  },
  sovereign: {
    blade: 'arming', color: '#e8d9a0', edge: '#fff2cc', fuller: '#c9a23c', len: 1.08,
    guard: 'crown', guardColor: '#d9a441', grip: '#6a2a3a', wrap: '#d9a441',
    pommel: 'crown', pommelColor: '#d9a441', gem: '#c4372a',
  },
  starfall: {
    blade: 'arming', color: '#5c5184', edge: '#a99ad8', fuller: '#d9d9ff',
    guard: 'wing', guardColor: '#453e66', grip: '#2a2438', wrap: '#8a7ab8',
    pommel: 'star', pommelColor: '#d9d9ff', fx: 'star', fxColor: '#f4f4ff',
  },
  oathkeeper: {
    blade: 'arming', color: '#eef0f4', edge: '#ffffff', fuller: '#c9ccd4', len: 1.05,
    guard: 'cross', guardColor: '#8a92a4', grip: '#2e3a5c', wrap: '#8a92a4',
    pommel: 'round', pommelColor: '#8a92a4', fx: 'gleam', fxColor: '#ffffff',
  },
};

/**
 * The rogue's roster wardrobe. Daggers reuse the whole SwordStyle
 * vocabulary at knife length — len runs 0.5–0.7, guards go small or
 * vanish, and the backstab identity lives in hooks, waves and needles.
 */
export const DAGGER_STYLES: Record<string, SwordStyle> = {
  // ---- the dirk line.
  bronze_dagger: {
    blade: 'dirk', color: '#c08a52', len: 0.62, guard: 'stub', guardColor: '#4a3a2a',
    grip: '#6b4a26', pommel: 'round', pommelColor: '#4a3a2a',
  },
  iron_dagger: {
    blade: 'dirk', color: '#8d9299', len: 0.62, guard: 'stub', guardColor: '#3e3a44',
    grip: '#4a3a2a', pommel: 'round', pommelColor: '#3e3a44',
  },
  steel_dagger: {
    blade: 'dirk', color: '#c4cad4', len: 0.65, guard: 'cross', guardColor: '#5a5f6a',
    grip: '#3a3540', wrap: '#b8bec8', pommel: 'round', pommelColor: '#5a5f6a',
  },
  gold_dagger: {
    blade: 'dirk', color: '#e8c04c', edge: '#fff2cc', len: 0.65, guard: 'cross', guardColor: '#b8863f',
    grip: '#6a2a3a', wrap: '#d9a441', pommel: 'gem', pommelColor: '#b8863f', gem: '#c4553d',
  },

  // ---- the stiletto line.
  stiletto: {
    blade: 'stiletto', color: '#c08a52', len: 0.7, guard: 'disc', guardColor: '#4a3a2a',
    grip: '#5a4a32', pommel: 'round', pommelColor: '#4a3a2a',
  },
  iron_stiletto: {
    blade: 'stiletto', color: '#9aa0a8', len: 0.7, guard: 'disc', guardColor: '#3e3a44',
    grip: '#3a3540', pommel: 'round', pommelColor: '#3e3a44',
  },
  steel_stiletto: {
    blade: 'stiletto', color: '#c4cad4', len: 0.72, guard: 'disc', guardColor: '#5a5f6a',
    grip: '#2e3038', wrap: '#b8bec8', pommel: 'round', pommelColor: '#5a5f6a',
  },
  gold_stiletto: {
    blade: 'stiletto', color: '#e8c04c', edge: '#fff2cc', len: 0.72, guard: 'disc', guardColor: '#b8863f',
    grip: '#6a2a3a', wrap: '#d9a441', pommel: 'gem', pommelColor: '#b8863f', gem: '#8f9ed6',
  },
  mithril_stiletto: {
    blade: 'stiletto', color: '#8fb4e4', edge: '#d8ecff', len: 0.72, guard: 'disc', guardColor: '#3f5e8c',
    grip: '#2e3a4e', wrap: '#7fa8d9', pommel: 'round', pommelColor: '#3f5e8c',
  },
  adamant_stiletto: {
    blade: 'stiletto', color: '#6cb47a', edge: '#d2f0d0', fuller: '#2f5e3c', len: 0.72, guard: 'disc', guardColor: '#2f5e3c',
    grip: '#26382c', wrap: '#5fa06a', pommel: 'round', pommelColor: '#2f5e3c',
  },
  obsidian_stiletto: {
    blade: 'stiletto', color: '#4e4260', edge: '#b8a8d8', fuller: '#2a2333', len: 0.72, guard: 'none', guardColor: '#332b40',
    grip: '#241d30', wrap: '#6a5a80', pommel: 'round', pommelColor: '#332b40',
  },
  starsteel_stiletto: {
    blade: 'stiletto', color: '#d6cbf6', edge: '#ffffff', fuller: '#a99ad8', len: 0.72, guard: 'disc', guardColor: '#7a6ab0',
    grip: '#3a3452', wrap: '#a99ad8', pommel: 'star', pommelColor: '#f4f4ff', fx: 'star', fxColor: '#f4f4ff',
  },

  // ---- the kris line.
  kris: {
    blade: 'kris', color: '#c08a52', len: 0.62, guard: 'fang', guardColor: '#6b4a26',
    grip: '#5a4a32', pommel: 'crescent', pommelColor: '#4a3a2a',
  },
  iron_kris: {
    blade: 'kris', color: '#9aa0a8', len: 0.62, guard: 'fang', guardColor: '#6a6578',
    grip: '#3a3540', wrap: '#6a6578', pommel: 'crescent', pommelColor: '#6a6578',
  },
  steel_kris: {
    blade: 'kris', color: '#c4cad4', len: 0.65, guard: 'fang', guardColor: '#5a5f6a',
    grip: '#2e3038', wrap: '#b8bec8', pommel: 'crescent', pommelColor: '#5a5f6a',
  },
  gold_kris: {
    blade: 'kris', color: '#e8c04c', edge: '#fff2cc', len: 0.65, guard: 'fang', guardColor: '#b8863f',
    grip: '#6a2a3a', wrap: '#d9a441', pommel: 'gem', pommelColor: '#b8863f', gem: '#c4553d',
  },
  mithril_kris: {
    blade: 'kris', color: '#8fb4e4', edge: '#d8ecff', len: 0.65, guard: 'fang', guardColor: '#3f5e8c',
    grip: '#2e3a4e', wrap: '#7fa8d9', pommel: 'crescent', pommelColor: '#3f5e8c',
  },
  adamant_kris: {
    blade: 'kris', color: '#6cb47a', edge: '#d2f0d0', fuller: '#2f5e3c', len: 0.65, guard: 'fang', guardColor: '#2f5e3c',
    grip: '#26382c', wrap: '#5fa06a', pommel: 'crescent', pommelColor: '#2f5e3c',
  },
  obsidian_kris: {
    blade: 'kris', color: '#4e4260', edge: '#b8a8d8', fuller: '#2a2333', len: 0.65, guard: 'fang', guardColor: '#332b40',
    grip: '#241d30', wrap: '#6a5a80', pommel: 'crescent', pommelColor: '#332b40',
  },
  starsteel_kris: {
    blade: 'kris', color: '#d6cbf6', edge: '#ffffff', fuller: '#a99ad8', len: 0.65, guard: 'fang', guardColor: '#7a6ab0',
    grip: '#3a3452', wrap: '#a99ad8', pommel: 'star', pommelColor: '#f4f4ff', fx: 'star', fxColor: '#f4f4ff',
  },

  // ---- the tanto line.
  tanto: {
    blade: 'tanto', color: '#c08a52', len: 0.6, guard: 'disc', guardColor: '#4a3a2a',
    grip: '#5a4a32', wrap: '#8a6a45', pommel: 'none',
  },
  iron_tanto: {
    blade: 'tanto', color: '#9aa0a8', len: 0.6, guard: 'disc', guardColor: '#3e3a44',
    grip: '#3a3540', wrap: '#5b4028', pommel: 'none',
  },
  steel_tanto: {
    blade: 'tanto', color: '#c4cad4', len: 0.62, guard: 'disc', guardColor: '#5a5f6a',
    grip: '#2e3038', wrap: '#d9a441', pommel: 'none',
  },
  gold_tanto: {
    blade: 'tanto', color: '#e8c04c', edge: '#fff2cc', len: 0.62, guard: 'disc', guardColor: '#b8863f',
    grip: '#6a2a3a', wrap: '#d9a441', pommel: 'none',
  },
  mithril_tanto: {
    blade: 'tanto', color: '#8fb4e4', edge: '#d8ecff', len: 0.62, guard: 'disc', guardColor: '#3f5e8c',
    grip: '#2e3a4e', wrap: '#7fa8d9', pommel: 'none',
  },
  adamant_tanto: {
    blade: 'tanto', color: '#6cb47a', edge: '#d2f0d0', fuller: '#2f5e3c', len: 0.62, guard: 'disc', guardColor: '#2f5e3c',
    grip: '#26382c', wrap: '#5fa06a', pommel: 'none',
  },
  obsidian_tanto: {
    blade: 'tanto', color: '#4e4260', edge: '#b8a8d8', fuller: '#2a2333', len: 0.62, guard: 'disc', guardColor: '#332b40',
    grip: '#241d30', wrap: '#6a5a80', pommel: 'none',
  },
  starsteel_tanto: {
    blade: 'tanto', color: '#d6cbf6', edge: '#ffffff', fuller: '#a99ad8', len: 0.62, guard: 'disc', guardColor: '#7a6ab0',
    grip: '#3a3452', wrap: '#a99ad8', pommel: 'none', fx: 'star', fxColor: '#f4f4ff',
  },

  // ---- bespoke crafts.
  vagrants_friend: {
    blade: 'leafblade', color: '#a89878', edge: '#d0c4a0', len: 0.55,
    guard: 'stub', guardColor: '#6b4a26', grip: '#8a7a5c', wrap: '#b0a068',
    pommel: 'ring', pommelColor: '#6b4a26',
  },
  sting: {
    blade: 'stiletto', color: '#e8b64c', edge: '#fff2cc', fuller: '#3a3238', len: 0.68,
    guard: 'wing', guardColor: '#d9a441', grip: '#3a3238', wrap: '#e8b64c',
    pommel: 'gem', pommelColor: '#3a3238', gem: '#e8b64c', fx: 'sun', fxColor: '#ffe08a',
  },
  coldsnap: {
    blade: 'dirk', color: '#cfe2f0', edge: '#ffffff', fuller: '#8ac4e8', len: 0.62,
    guard: 'cross', guardColor: '#7a94ac', grip: '#3a4a5c', wrap: '#a8c8dc',
    pommel: 'gem', pommelColor: '#7a94ac', gem: '#b8d8e8', fx: 'frost', fxColor: '#e8f4ff',
  },

  // ---- drop-only wild finds.
  shiv: {
    blade: 'shivkind', color: '#8a8276', edge: '#a8a094', fuller: '#5a5248', len: 0.5,
    guard: 'none', guardColor: '#5a5248', grip: '#6e5a40', wrap: '#8a8276', pommel: 'none',
  },
  ratter: {
    blade: 'leafblade', color: '#9a8468', edge: '#c0aa88', len: 0.5, notched: true,
    guard: 'stub', guardColor: '#5a4a3a', grip: '#4a3a2a', pommel: 'ring', pommelColor: '#8a8276',
  },
  scaler: {
    blade: 'leafblade', color: '#9ab8b0', edge: '#d0e8e0', fuller: '#5a7a72', len: 0.58,
    guard: 'stub', guardColor: '#4a5a58', grip: '#3d5a58', wrap: '#b0a068',
    pommel: 'round', pommelColor: '#4a5a58', fx: 'gleam', fxColor: '#e8fff8',
  },
  fangtooth: {
    blade: 'karambit', color: '#d8d2c0', edge: '#f4efe0', fuller: '#a89e88', len: 0.52,
    guard: 'none', guardColor: '#5a6470', grip: '#5a6470', wrap: '#8d939f',
    pommel: 'ring', pommelColor: '#8d939f',
  },
  bogsting: {
    blade: 'talon', color: '#5a7a58', edge: '#8aa484', fuller: '#3a4a38', len: 0.55,
    guard: 'thorn', guardColor: '#3e4a38', grip: '#3a3e34', wrap: '#79a355',
    pommel: 'round', pommelColor: '#3e4a38',
  },
  bonepick: {
    blade: 'stiletto', color: '#e2dcc8', edge: '#f8f4e4', fuller: '#b0a890', len: 0.68,
    guard: 'none', guardColor: '#b0a890', grip: '#c9c2ac', wrap: '#8a8276',
    pommel: 'fang', pommelColor: '#e2dcc8',
  },
  redhand: {
    blade: 'dirk', color: '#8d9299', edge: '#c8ccd8', fuller: '#a04a48', len: 0.6,
    guard: 'stub', guardColor: '#5a2e2c', grip: '#a04a48', wrap: '#6a3230',
    pommel: 'round', pommelColor: '#5a2e2c',
  },
  nightthorn: {
    blade: 'kris', color: '#5f5478', edge: '#a898d0', fuller: '#7a6a9c', len: 0.62,
    guard: 'thorn', guardColor: '#3a3448', grip: '#2a2438', wrap: '#5a4a78',
    pommel: 'gem', pommelColor: '#3a3448', gem: '#8a7ab8', fx: 'void', fxColor: '#a89ad0',
  },
  leech: {
    blade: 'talon', color: '#95545e', edge: '#c07a84', fuller: '#c4372a', len: 0.55,
    guard: 'none', guardColor: '#3a2228', grip: '#3a2228', wrap: '#8a3040',
    pommel: 'gem', pommelColor: '#3a2228', gem: '#c4372a', fx: 'blood', fxColor: '#e04a38',
  },
  hush: {
    blade: 'stiletto', color: '#b8b4c4', edge: '#e2dee8', fuller: '#8a8698', len: 0.72,
    guard: 'disc', guardColor: '#5a5666', grip: '#3a3844', wrap: '#8a8698',
    pommel: 'round', pommelColor: '#5a5666',
  },
  palefire: {
    blade: 'tanto', color: '#c8dce8', edge: '#ffffff', fuller: '#8ac4e8', len: 0.6,
    guard: 'disc', guardColor: '#7a94ac', grip: '#2e3a48', wrap: '#a8c8dc',
    pommel: 'none', fx: 'frost', fxColor: '#e8f6ff',
  },
  sparkfang: {
    blade: 'karambit', color: '#7a88b8', edge: '#c9d4f0', fuller: '#4a5a8a', len: 0.52,
    guard: 'bolt', guardColor: '#e8e06a', grip: '#2e3448', wrap: '#e8e06a',
    pommel: 'ring', pommelColor: '#4a5a8a', fx: 'storm', fxColor: '#fff2a0',
  },
  kingsbane: {
    blade: 'stiletto', color: '#6a5f78', edge: '#b0a4c4', fuller: '#c9a23c', len: 0.72,
    guard: 'crown', guardColor: '#c9a23c', gem: '#c4372a', grip: '#6a2a3a', wrap: '#c9a23c',
    pommel: 'crown', pommelColor: '#c9a23c',
  },
  last_word: {
    blade: 'dirk', color: '#f0f0f4', edge: '#ffffff', fuller: '#c9ccd4', len: 0.65,
    guard: 'cross', guardColor: '#8a92a4', grip: '#2e3a5c', wrap: '#8a92a4',
    pommel: 'round', pommelColor: '#8a92a4', fx: 'gleam', fxColor: '#ffffff',
  },
};

/** Color-derived fallbacks so any future '*sword' id is dressed. */
const FALLBACKS = new Map<string, SwordStyle>();

/**
 * Resolve a held item to its blade style — swords and daggers share one
 * painter. Registry hits first; unknown '*sword' ids get an arming
 * fallback and unknown '*dagger' ids a dirk fallback, both in the item
 * color. Null means "not a blade".
 */
export function bladeStyle(itemId: string | undefined, color?: string): SwordStyle | null {
  if (!itemId) return null;
  const st = SWORD_STYLES[itemId] ?? DAGGER_STYLES[itemId];
  if (st) return st;
  const sword = itemId.includes('sword');
  if (!sword && !itemId.includes('dagger')) return null;
  let fb = FALLBACKS.get(itemId);
  if (!fb) {
    fb = sword
      ? {
          blade: 'arming', color: color ?? '#b8bec8', guard: 'cross', guardColor: '#4a3a2a',
          grip: '#6b4a26', pommel: 'gem', pommelColor: '#d9a441', gem: '#c4553d',
        }
      : {
          blade: 'dirk', color: color ?? '#8d9299', len: 0.62, guard: 'stub',
          guardColor: '#4a3a2a', grip: '#4a3a2a', pommel: 'round', pommelColor: '#3e3a44',
        };
    FALLBACKS.set(itemId, fb);
  }
  return fb;
}

/** Back-compat alias — sword-only callers migrated to bladeStyle. */
export const swordStyle = bladeStyle;

/**
 * Paint a sword in the held-item frame (origin at the fist, +x toward
 * the tip, rotation already applied by drawHeldItem). Scale s is the
 * body scale — a standard blade reaches ~0.5 s.
 */
export function drawSword(
  ctx: CanvasRenderingContext2D,
  st: SwordStyle,
  s: number,
  nowMs: number,
  hurt?: boolean,
): void {
  const color = hurt ? '#ffffff' : st.color;
  const bx = 0.045 * s; // blade base — the guard's far side
  const len = (st.len ?? 1) * 0.44 * s;
  const tip = bx + len;

  // ---- grip + pommel behind the fist (painted first: the hand and
  // guard overlap them, exactly like the classic painter).
  const gripC = hurt ? '#ffffff' : (st.grip ?? '#6b4a26');
  ctx.fillStyle = gripC;
  ctx.fillRect(-0.088 * s, -0.026 * s, 0.108 * s, 0.052 * s);
  if (!hurt && st.wrap) {
    ctx.fillStyle = st.wrap;
    ctx.fillRect(-0.066 * s, -0.026 * s, 0.014 * s, 0.052 * s);
    ctx.fillRect(-0.034 * s, -0.026 * s, 0.014 * s, 0.052 * s);
  }
  drawPommel(ctx, st, s, hurt);

  // ---- blade silhouette + dress (edge light on −y, fuller center).
  drawBlade(ctx, st, color, bx, tip, s, hurt);

  // ---- guard last: it seats OVER the blade base and the grip.
  drawGuard(ctx, st, s, hurt);

  // ---- the living channel.
  if (!hurt && st.fx) drawBladeFx(ctx, st, bx, tip, s, nowMs);
}

function drawBlade(
  ctx: CanvasRenderingContext2D,
  st: SwordStyle,
  color: string,
  bx: number,
  tip: number,
  s: number,
  hurt?: boolean,
): void {
  const edge = hurt ? '#ffffff' : (st.edge ?? shade(st.color, 34));
  const fuller = hurt ? '#ffffff' : (st.fuller ?? shade(st.color, -24));
  const len = tip - bx;
  ctx.fillStyle = color;
  switch (st.blade) {
    case 'arming': {
      const hw = 0.038 * s;
      ctx.beginPath();
      ctx.moveTo(bx, -hw);
      ctx.lineTo(tip - 0.1 * s, -hw);
      ctx.lineTo(tip, 0);
      ctx.lineTo(tip - 0.1 * s, hw);
      ctx.lineTo(bx, hw);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      // Edge light along the top, fuller down the middle.
      ctx.fillStyle = edge;
      ctx.beginPath();
      ctx.moveTo(bx + 0.01 * s, -hw + 0.006 * s);
      ctx.lineTo(tip - 0.105 * s, -hw + 0.006 * s);
      ctx.lineTo(tip - 0.03 * s, -0.004 * s);
      ctx.lineTo(bx + 0.01 * s, -0.004 * s);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = fuller;
      ctx.lineWidth = Math.max(1, 0.016 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.02 * s, 0.008 * s);
      ctx.lineTo(tip - 0.12 * s, 0.008 * s);
      ctx.stroke();
      break;
    }
    case 'falchion': {
      // Straight back on top, belly flaring below, clipped point.
      ctx.beginPath();
      ctx.moveTo(bx, -0.03 * s);
      ctx.lineTo(tip - 0.02 * s, -0.042 * s);
      ctx.lineTo(tip, 0.014 * s);
      ctx.quadraticCurveTo(tip - len * 0.35, 0.075 * s, bx, 0.036 * s);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      // The cutting edge is the BELLY here — light rides the underside.
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1, 0.02 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.02 * s, 0.032 * s);
      ctx.quadraticCurveTo(tip - len * 0.35, 0.062 * s, tip - 0.015 * s, 0.012 * s);
      ctx.stroke();
      ctx.strokeStyle = fuller;
      ctx.lineWidth = Math.max(1, 0.016 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.02 * s, -0.014 * s);
      ctx.lineTo(tip - 0.09 * s, -0.02 * s);
      ctx.stroke();
      break;
    }
    case 'gladius': {
      // Leaf blade: waisted at the base, widest past the middle.
      const hw = 0.048 * s;
      ctx.beginPath();
      ctx.moveTo(bx, -0.03 * s);
      ctx.quadraticCurveTo(bx + len * 0.55, -hw * 1.25, tip - 0.07 * s, -hw * 0.7);
      ctx.lineTo(tip, 0);
      ctx.lineTo(tip - 0.07 * s, hw * 0.7);
      ctx.quadraticCurveTo(bx + len * 0.55, hw * 1.25, bx, 0.03 * s);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1, 0.018 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.015 * s, -0.026 * s);
      ctx.quadraticCurveTo(bx + len * 0.55, -hw * 1.1, tip - 0.03 * s, -0.012 * s);
      ctx.stroke();
      // Gladius signature: a strong midrib, not a fuller.
      ctx.strokeStyle = fuller;
      ctx.lineWidth = Math.max(1, 0.02 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.01 * s, 0);
      ctx.lineTo(tip - 0.03 * s, 0);
      ctx.stroke();
      break;
    }
    case 'scimitar': {
      // Deep curve: both edges ride quadratics, tip swept high.
      ctx.beginPath();
      ctx.moveTo(bx, -0.024 * s);
      ctx.quadraticCurveTo(bx + len * 0.55, -0.062 * s, tip, -0.095 * s);
      ctx.quadraticCurveTo(bx + len * 0.62, -0.006 * s, bx, 0.028 * s);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1, 0.018 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.02 * s, 0.02 * s);
      ctx.quadraticCurveTo(bx + len * 0.6, -0.012 * s, tip - 0.012 * s, -0.086 * s);
      ctx.stroke();
      ctx.strokeStyle = fuller;
      ctx.lineWidth = Math.max(1, 0.014 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.02 * s, -0.012 * s);
      ctx.quadraticCurveTo(bx + len * 0.5, -0.042 * s, tip - 0.05 * s, -0.07 * s);
      ctx.stroke();
      break;
    }
    case 'saber': {
      // Shallow curve — quick, officer-slim.
      ctx.beginPath();
      ctx.moveTo(bx, -0.026 * s);
      ctx.quadraticCurveTo(bx + len * 0.55, -0.045 * s, tip, -0.052 * s);
      ctx.lineTo(tip - 0.015 * s, -0.01 * s);
      ctx.quadraticCurveTo(bx + len * 0.55, 0.006 * s, bx, 0.026 * s);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1, 0.016 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.02 * s, -0.02 * s);
      ctx.quadraticCurveTo(bx + len * 0.55, -0.038 * s, tip - 0.01 * s, -0.046 * s);
      ctx.stroke();
      ctx.strokeStyle = fuller;
      ctx.lineWidth = Math.max(1, 0.013 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.02 * s, 0.006 * s);
      ctx.quadraticCurveTo(bx + len * 0.5, -0.008 * s, tip - 0.05 * s, -0.022 * s);
      ctx.stroke();
      break;
    }
    case 'rapier': {
      // Needle with a short wide ricasso at the guard.
      const hw = 0.016 * s;
      ctx.beginPath();
      ctx.moveTo(bx, -0.026 * s);
      ctx.lineTo(bx + 0.05 * s, -0.026 * s);
      ctx.lineTo(bx + 0.07 * s, -hw);
      ctx.lineTo(tip, 0);
      ctx.lineTo(bx + 0.07 * s, hw);
      ctx.lineTo(bx + 0.05 * s, 0.026 * s);
      ctx.lineTo(bx, 0.026 * s);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1, 0.012 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.06 * s, -hw * 0.5);
      ctx.lineTo(tip - 0.02 * s, -0.002 * s);
      ctx.stroke();
      break;
    }
    case 'cutlass': {
      // Short broad curve with a clipped, working tip.
      ctx.beginPath();
      ctx.moveTo(bx, -0.03 * s);
      ctx.quadraticCurveTo(bx + len * 0.6, -0.052 * s, tip - 0.015 * s, -0.06 * s);
      ctx.lineTo(tip, 0.005 * s);
      ctx.quadraticCurveTo(bx + len * 0.55, 0.028 * s, bx, 0.034 * s);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1, 0.018 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.02 * s, 0.028 * s);
      ctx.quadraticCurveTo(bx + len * 0.55, 0.018 * s, tip - 0.008 * s, 0.002 * s);
      ctx.stroke();
      ctx.strokeStyle = fuller;
      ctx.lineWidth = Math.max(1, 0.014 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.02 * s, -0.016 * s);
      ctx.quadraticCurveTo(bx + len * 0.55, -0.034 * s, tip - 0.04 * s, -0.044 * s);
      ctx.stroke();
      break;
    }
    case 'cleaver': {
      // A slab with an angled nose. Menace by geometry.
      const hw = 0.055 * s;
      ctx.beginPath();
      ctx.moveTo(bx, -0.032 * s);
      ctx.lineTo(tip - 0.14 * s, -hw);
      ctx.lineTo(tip, -hw * 0.55);
      ctx.lineTo(tip - 0.02 * s, hw);
      ctx.lineTo(bx, hw * 0.75);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1, 0.02 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.02 * s, hw * 0.68);
      ctx.lineTo(tip - 0.03 * s, hw * 0.9);
      ctx.stroke();
      ctx.strokeStyle = fuller;
      ctx.lineWidth = Math.max(1, 0.016 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.03 * s, -0.012 * s);
      ctx.lineTo(tip - 0.12 * s, -0.024 * s);
      ctx.stroke();
      // Riveted spine: the crude fittings that hold a slab together.
      ctx.fillStyle = fuller;
      for (const rx of [0.3, 0.6]) {
        ctx.beginPath();
        ctx.arc(bx + len * rx, -0.018 * s, Math.max(1, 0.012 * s), 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    // ------------------------------------------- the dagger vocabulary
    case 'dirk': {
      // Symmetric double-edge with a proud midrib.
      const hw = 0.03 * s;
      ctx.beginPath();
      ctx.moveTo(bx, -hw);
      ctx.lineTo(bx + len * 0.62, -hw * 0.82);
      ctx.lineTo(tip, 0);
      ctx.lineTo(bx + len * 0.62, hw * 0.82);
      ctx.lineTo(bx, hw);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      ctx.fillStyle = edge;
      ctx.beginPath();
      ctx.moveTo(bx + 0.008 * s, -hw + 0.005 * s);
      ctx.lineTo(bx + len * 0.6, -hw * 0.76);
      ctx.lineTo(tip - 0.02 * s, -0.003 * s);
      ctx.lineTo(bx + 0.008 * s, -0.003 * s);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = fuller;
      ctx.lineWidth = Math.max(1, 0.014 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.01 * s, 0.006 * s);
      ctx.lineTo(tip - 0.03 * s, 0.002 * s);
      ctx.stroke();
      break;
    }
    case 'stiletto': {
      // A squared ricasso, then nothing but point.
      const hw = 0.012 * s;
      ctx.fillRect(bx, -0.024 * s, 0.045 * s, 0.048 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.04 * s, -hw);
      ctx.lineTo(tip, 0);
      ctx.lineTo(bx + 0.04 * s, hw);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1, 0.01 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.045 * s, -hw * 0.4);
      ctx.lineTo(tip - 0.015 * s, -0.001 * s);
      ctx.stroke();
      ctx.fillStyle = fuller;
      ctx.fillRect(bx + 0.008 * s, -0.008 * s, 0.026 * s, 0.016 * s);
      break;
    }
    case 'kris': {
      // The wave: both edges ride the same two-bend serpent.
      const hw = 0.026 * s;
      const wave = (t: number): number => Math.sin(t * Math.PI * 2) * 0.028 * s * (1 - t * 0.55);
      ctx.beginPath();
      ctx.moveTo(bx, -hw);
      for (let i = 1; i <= 8; i++) {
        const t = i / 8;
        ctx.lineTo(bx + len * t, wave(t) - hw * (1 - t * 0.9));
      }
      for (let i = 8; i >= 0; i--) {
        const t = i / 8;
        ctx.lineTo(bx + len * t, wave(t) + hw * (1 - t * 0.9));
      }
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1, 0.012 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.01 * s, -hw * 0.5);
      for (let i = 1; i <= 8; i++) {
        const t = i / 8;
        ctx.lineTo(bx + len * t, wave(t) - hw * 0.5 * (1 - t * 0.9));
      }
      ctx.stroke();
      break;
    }
    case 'karambit': {
      // The claw: spine arcs down, edge rides the inner curve, tip
      // hooks back toward the wielder's line.
      ctx.beginPath();
      ctx.moveTo(bx, -0.02 * s);
      ctx.quadraticCurveTo(bx + len * 0.75, -0.01 * s, tip - 0.02 * s, 0.078 * s);
      ctx.quadraticCurveTo(tip - 0.055 * s, 0.09 * s, tip - 0.075 * s, 0.075 * s);
      ctx.quadraticCurveTo(bx + len * 0.45, 0.028 * s, bx, 0.024 * s);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1, 0.014 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.015 * s, 0.02 * s);
      ctx.quadraticCurveTo(bx + len * 0.5, 0.026 * s, tip - 0.062 * s, 0.068 * s);
      ctx.stroke();
      ctx.strokeStyle = fuller;
      ctx.lineWidth = Math.max(1, 0.011 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.015 * s, -0.01 * s);
      ctx.quadraticCurveTo(bx + len * 0.6, -0.002 * s, tip - 0.045 * s, 0.05 * s);
      ctx.stroke();
      break;
    }
    case 'tanto': {
      // Straight spine, straight edge, one hard kissaki facet.
      const hw = 0.028 * s;
      const k = tip - 0.085 * s; // facet line
      ctx.beginPath();
      ctx.moveTo(bx, -hw);
      ctx.lineTo(k, -hw);
      ctx.lineTo(tip, -0.002 * s);
      ctx.lineTo(k + 0.02 * s, hw * 0.9);
      ctx.lineTo(bx, hw * 0.8);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      // The kissaki catches its own light — a separate facet plane.
      ctx.fillStyle = edge;
      ctx.beginPath();
      ctx.moveTo(k, -hw);
      ctx.lineTo(tip, -0.002 * s);
      ctx.lineTo(k + 0.02 * s, hw * 0.9);
      ctx.lineTo(k - 0.006 * s, 0.004 * s);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1, 0.014 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.01 * s, hw * 0.72);
      ctx.lineTo(k, hw * 0.82);
      ctx.stroke();
      ctx.strokeStyle = fuller;
      ctx.lineWidth = Math.max(1, 0.012 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.01 * s, -hw * 0.55);
      ctx.lineTo(k - 0.01 * s, -hw * 0.55);
      ctx.stroke();
      break;
    }
    case 'shivkind': {
      // Filed scrap: irregular jags, no two edges agreeing.
      ctx.beginPath();
      ctx.moveTo(bx, -0.024 * s);
      ctx.lineTo(bx + len * 0.3, -0.035 * s);
      ctx.lineTo(bx + len * 0.5, -0.02 * s);
      ctx.lineTo(bx + len * 0.78, -0.03 * s);
      ctx.lineTo(tip, 0.004 * s);
      ctx.lineTo(bx + len * 0.55, 0.028 * s);
      ctx.lineTo(bx + len * 0.3, 0.02 * s);
      ctx.lineTo(bx, 0.028 * s);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1, 0.012 * s);
      ctx.beginPath();
      ctx.moveTo(bx + len * 0.32, -0.026 * s);
      ctx.lineTo(bx + len * 0.76, -0.022 * s);
      ctx.stroke();
      // The rag wrap where a guard should be.
      ctx.fillStyle = fuller;
      ctx.fillRect(bx - 0.006 * s, -0.032 * s, 0.03 * s, 0.064 * s);
      break;
    }
    case 'talon': {
      // One smooth fang — less hook than the karambit, more grace.
      ctx.beginPath();
      ctx.moveTo(bx, -0.026 * s);
      ctx.quadraticCurveTo(bx + len * 0.6, -0.036 * s, tip, 0.035 * s);
      ctx.quadraticCurveTo(bx + len * 0.5, 0.012 * s, bx, 0.026 * s);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1, 0.013 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.012 * s, 0.02 * s);
      ctx.quadraticCurveTo(bx + len * 0.55, 0.008 * s, tip - 0.015 * s, 0.03 * s);
      ctx.stroke();
      ctx.strokeStyle = fuller;
      ctx.lineWidth = Math.max(1, 0.011 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.012 * s, -0.014 * s);
      ctx.quadraticCurveTo(bx + len * 0.55, -0.022 * s, tip - 0.03 * s, 0.014 * s);
      ctx.stroke();
      break;
    }
    case 'leafblade': {
      // A pocket leaf — the gladius idea at utility size.
      const hw = 0.034 * s;
      ctx.beginPath();
      ctx.moveTo(bx, -0.02 * s);
      ctx.quadraticCurveTo(bx + len * 0.5, -hw, tip - 0.05 * s, -hw * 0.5);
      ctx.lineTo(tip, 0);
      ctx.lineTo(tip - 0.05 * s, hw * 0.5);
      ctx.quadraticCurveTo(bx + len * 0.5, hw, bx, 0.02 * s);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1, 0.013 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.012 * s, -0.016 * s);
      ctx.quadraticCurveTo(bx + len * 0.5, -hw * 0.75, tip - 0.025 * s, -0.008 * s);
      ctx.stroke();
      ctx.strokeStyle = fuller;
      ctx.lineWidth = Math.max(1, 0.013 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.01 * s, 0);
      ctx.lineTo(tip - 0.02 * s, 0);
      ctx.stroke();
      break;
    }
  }
  // Battle bites knocked out of the cutting edge — the wedge BASE sits
  // on the silhouette boundary and cuts inward, so it reads as missing
  // metal, never as teeth stuck on the blade.
  if (!hurt && st.notched) {
    const edgeY = st.blade === 'cleaver' ? 0.052 * s : 0.034 * s;
    ctx.fillStyle = shade(st.color, -56);
    for (const [t, sy, d] of [[0.34, 1, 1], [0.66, 1, 0.7], [0.52, -1, 0.8]] as const) {
      const nx = bx + len * t;
      const ny = sy * (st.blade === 'cleaver' && sy < 0 ? 0.032 * s : edgeY);
      ctx.beginPath();
      ctx.moveTo(nx - 0.02 * s, ny);
      ctx.lineTo(nx + 0.02 * s, ny);
      ctx.lineTo(nx, ny - sy * 0.03 * s * d);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawGuard(
  ctx: CanvasRenderingContext2D,
  st: SwordStyle,
  s: number,
  hurt?: boolean,
): void {
  const c = hurt ? '#ffffff' : st.guardColor;
  ctx.fillStyle = c;
  switch (st.guard) {
    case 'cross':
      ctx.fillRect(0.018 * s, -0.088 * s, 0.042 * s, 0.176 * s);
      if (!hurt) {
        // Quillon tips catch the light.
        ctx.fillStyle = shade(st.guardColor, 26);
        ctx.fillRect(0.018 * s, -0.088 * s, 0.042 * s, 0.02 * s);
        ctx.fillRect(0.018 * s, 0.068 * s, 0.042 * s, 0.02 * s);
      }
      break;
    case 'swept': {
      // A knuckle bow sweeping from guard to pommel — the duelist read.
      ctx.fillRect(0.02 * s, -0.07 * s, 0.034 * s, 0.14 * s);
      ctx.strokeStyle = c;
      ctx.lineWidth = Math.max(1.5, 0.02 * s);
      ctx.beginPath();
      ctx.moveTo(0.034 * s, 0.066 * s);
      ctx.quadraticCurveTo(-0.03 * s, 0.105 * s, -0.09 * s, 0.03 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0.034 * s, -0.066 * s);
      ctx.quadraticCurveTo(-0.005 * s, -0.088 * s, -0.03 * s, -0.055 * s);
      ctx.stroke();
      break;
    }
    case 'shell': {
      // A scalloped half-shell cupping the hand from below.
      ctx.beginPath();
      ctx.arc(0.026 * s, 0, 0.085 * s, Math.PI * 0.32, Math.PI * 1.68);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        ctx.strokeStyle = shade(st.guardColor, -26);
        ctx.lineWidth = Math.max(1, 0.012 * s);
        for (const a of [0.62, 1.0, 1.38]) {
          ctx.beginPath();
          ctx.moveTo(0.026 * s, 0);
          const ang = Math.PI * a;
          ctx.lineTo(0.026 * s + Math.cos(ang) * 0.075 * s, Math.sin(ang) * 0.075 * s);
          ctx.stroke();
        }
      }
      break;
    }
    case 'disc':
      // A tsuba-like plate: an oval seen edge-on, not a ball.
      ctx.beginPath();
      ctx.ellipse(0.034 * s, 0, 0.022 * s, 0.066 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = shade(st.guardColor, 24);
        ctx.beginPath();
        ctx.ellipse(0.03 * s, -0.02 * s, 0.01 * s, 0.032 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'fang':
      // Two ivory tusks raked toward the blade.
      for (const sy of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0.02 * s, sy * 0.028 * s);
        ctx.quadraticCurveTo(0.06 * s, sy * 0.095 * s, 0.115 * s, sy * 0.075 * s);
        ctx.quadraticCurveTo(0.065 * s, sy * 0.06 * s, 0.056 * s, sy * 0.02 * s);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillRect(0.02 * s, -0.036 * s, 0.036 * s, 0.072 * s);
      break;
    case 'thorn':
      // Briar spikes at three angles — the hedge grips the blade.
      ctx.fillRect(0.018 * s, -0.07 * s, 0.036 * s, 0.14 * s);
      for (const [sy, ox] of [[-1, 0.01], [1, 0.01], [1, -0.045]] as const) {
        ctx.beginPath();
        ctx.moveTo(0.036 * s + ox * s, sy * 0.05 * s);
        ctx.lineTo(0.075 * s + ox * s, sy * 0.1 * s);
        ctx.lineTo(0.052 * s + ox * s, sy * 0.045 * s);
        ctx.closePath();
        ctx.fill();
      }
      break;
    case 'crown':
      // A crenellated bar: the guard wears the kingdom.
      ctx.fillRect(0.018 * s, -0.082 * s, 0.04 * s, 0.164 * s);
      for (const sy of [-1, 0, 1]) {
        ctx.fillRect(0.05 * s, sy * 0.058 * s - 0.014 * s, 0.024 * s, 0.028 * s);
      }
      if (!hurt && st.gem) {
        ctx.fillStyle = st.gem;
        ctx.beginPath();
        ctx.arc(0.038 * s, 0, 0.018 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'wing':
      // Paired wings swept back off the guard block.
      for (const sy of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0.03 * s, sy * 0.02 * s);
        ctx.quadraticCurveTo(-0.01 * s, sy * 0.1 * s, -0.065 * s, sy * 0.125 * s);
        ctx.quadraticCurveTo(-0.005 * s, sy * 0.075 * s, 0.008 * s, sy * 0.024 * s);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillRect(0.02 * s, -0.045 * s, 0.036 * s, 0.09 * s);
      break;
    case 'bolt': {
      // A zigzag of storm-metal instead of a straight quillon.
      ctx.strokeStyle = c;
      ctx.lineWidth = Math.max(2, 0.03 * s);
      ctx.beginPath();
      ctx.moveTo(0.028 * s, -0.09 * s);
      ctx.lineTo(0.052 * s, -0.03 * s);
      ctx.lineTo(0.02 * s, 0.03 * s);
      ctx.lineTo(0.048 * s, 0.09 * s);
      ctx.stroke();
      break;
    }
    case 'stub':
      ctx.fillRect(0.02 * s, -0.052 * s, 0.036 * s, 0.104 * s);
      break;
    case 'none':
      break;
  }
}

function drawPommel(
  ctx: CanvasRenderingContext2D,
  st: SwordStyle,
  s: number,
  hurt?: boolean,
): void {
  const kind = st.pommel ?? 'round';
  if (kind === 'none') return;
  const c = hurt ? '#ffffff' : (st.pommelColor ?? '#4a3a2a');
  const px = -0.098 * s;
  ctx.fillStyle = c;
  switch (kind) {
    case 'round':
      ctx.beginPath();
      ctx.arc(px, 0, 0.032 * s, 0, Math.PI * 2);
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = shade(st.pommelColor ?? '#4a3a2a', 30);
        ctx.beginPath();
        ctx.arc(px - 0.008 * s, -0.008 * s, 0.012 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'gem':
      ctx.beginPath();
      ctx.arc(px, 0, 0.034 * s, 0, Math.PI * 2);
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = st.gem ?? '#c4553d';
        ctx.beginPath();
        ctx.arc(px, 0, 0.02 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff2cc';
        ctx.beginPath();
        ctx.arc(px - 0.008 * s, -0.008 * s, 0.007 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'fang':
      // A tooth curving off the butt — trophy hardware.
      ctx.beginPath();
      ctx.moveTo(px + 0.02 * s, -0.022 * s);
      ctx.quadraticCurveTo(px - 0.05 * s, -0.02 * s, px - 0.06 * s, 0.035 * s);
      ctx.quadraticCurveTo(px - 0.025 * s, 0.005 * s, px + 0.02 * s, 0.022 * s);
      ctx.closePath();
      ctx.fill();
      break;
    case 'ring':
      ctx.strokeStyle = c;
      ctx.lineWidth = Math.max(1.5, 0.018 * s);
      ctx.beginPath();
      ctx.arc(px - 0.006 * s, 0, 0.03 * s, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'crescent':
      ctx.strokeStyle = c;
      ctx.lineWidth = Math.max(1.5, 0.022 * s);
      ctx.beginPath();
      ctx.arc(px + 0.012 * s, 0, 0.036 * s, Math.PI * 0.6, Math.PI * 1.4);
      ctx.stroke();
      break;
    case 'star': {
      // A four-point star of starmetal.
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const r = i % 2 === 0 ? 0.042 * s : 0.016 * s;
        const a = (i / 8) * Math.PI * 2;
        const x = px + Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'crown':
      ctx.fillRect(px - 0.018 * s, -0.034 * s, 0.036 * s, 0.068 * s);
      for (const sy of [-1, 0, 1]) {
        ctx.fillRect(px - 0.042 * s, sy * 0.024 * s - 0.01 * s, 0.024 * s, 0.02 * s);
      }
      if (!hurt && st.gem) {
        ctx.fillStyle = st.gem;
        ctx.beginPath();
        ctx.arc(px, 0, 0.012 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
  }
}

/**
 * The living channel: deterministic motes and gleams parameterized on
 * nowMs so blades breathe in world time. Two to three dots — the cape
 * fx budget — never particles with state.
 */
function drawBladeFx(
  ctx: CanvasRenderingContext2D,
  st: SwordStyle,
  bx: number,
  tip: number,
  s: number,
  nowMs: number,
): void {
  const c = st.fxColor ?? '#ffffff';
  const len = tip - bx;
  if (st.fx === 'gleam') {
    // One glint traveling the edge, resting between passes.
    const u = (nowMs % 2600) / 2600;
    if (u < 0.55) {
      const t = u / 0.55;
      const x = bx + len * t;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x, -0.03 * s, Math.max(1, 0.014 * s * Math.sin(Math.PI * t)), 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  for (let i = 0; i < 3; i++) {
    const phase = (nowMs * 0.00045 + i * 0.37) % 1;
    const t = 0.25 + 0.62 * ((i * 0.31 + phase * (st.fx === 'blood' ? 0.25 : 1)) % 1);
    const x = bx + len * t;
    let y = 0;
    let r = Math.max(1, 0.012 * s);
    switch (st.fx) {
      case 'ember': // motes rise OFF the seam — born on it, fading just above
        y = -0.014 * s - 0.026 * s * phase;
        r *= 1 - phase * 0.6;
        break;
      case 'frost': // fog hangs, barely swaying
        y = 0.035 * s * Math.sin(phase * Math.PI * 2 + i * 2.1);
        break;
      case 'void': // wisps drift tipward along the seam
        y = -0.012 * s + 0.014 * s * Math.sin(phase * Math.PI * 2);
        break;
      case 'storm': // hard flicker: sparks blink, never drift
        if (Math.sin(nowMs * 0.02 + i * 2.6) < 0.55) continue;
        y = (i - 1) * 0.03 * s;
        break;
      case 'blood': // beads run slowly toward the tip, heavy
        y = 0.024 * s + 0.012 * s * phase;
        r *= 0.9;
        break;
      case 'sun': // warm sparks hugging the bright edge
        y = -0.024 * s + 0.01 * s * Math.sin(phase * Math.PI * 2 + i);
        break;
      case 'star': // twinkle: scale pulses hard
        y = (i - 1) * 0.028 * s;
        r *= 0.6 + 0.7 * Math.abs(Math.sin(nowMs * 0.004 + i * 1.7));
        break;
    }
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ======================================================================
// The archer's roster — bow visual styles. Same pattern as the blades:
// pure data records over one painter vocabulary. A bow is a limb
// silhouette (kind), a wood, tip furniture, a hanging charm, the nocked
// arrow's fletching color, and an optional living fx channel riding the
// limb curve. The painter preserves the classic bow behaviors: limbs
// flex deeper as the string comes back, the string hauls to the nock
// point, release buzzes, and the belly always passes through x ≈ 0.18 s
// (the grip law drawHeldItem's carry translate depends on).

export type BowKind =
  | 'shortbow'  // deep D-curve, compact — the skirmisher's frame
  | 'longbow'   // tall shallow arc, narrow limbs, man-tall
  | 'recurve'   // working limbs with tips hooked toward the target
  | 'flatbow'   // broad paddle limbs, widest at mid-limb
  | 'composite' // rigid riser, working limbs, angled siyah levers
  | 'crude'     // a kinked branch with knots — menace by neglect
  | 'bone';     // ribbed vertebrae strung with sinew

export type BowTip = 'plain' | 'horn' | 'gold' | 'iron' | 'thorn' | 'bone';

export type BowCharm =
  | 'feathers' // two hanging fletch-feathers off the lower limb
  | 'beads'    // a short strand of beads
  | 'teeth'    // knuckle-bone rattle
  | 'leaves'   // living sprigs budding off the limb
  | 'fur'      // pelt tufts ringing the grip
  | 'holes';   // drilled song-holes along the upper limb

export interface BowStyle {
  bow: BowKind;
  /** Limb wood. Belly light defaults to shade(+26), wrap to shade(−30). */
  color: string;
  belly?: string;
  wrap?: string;
  /** Bowstring color (gut, sinew, silk). */
  string?: string;
  /** Tip-span multiplier over the kind's natural length. */
  len?: number;
  tip?: BowTip;
  tipColor?: string;
  charm?: BowCharm;
  charmColor?: string;
  /** Fletching color of the nocked arrow — identity at full draw. */
  fletch?: string;
  fx?: BladeFx;
  fxColor?: string;
}

export const BOW_STYLES: Record<string, BowStyle> = {
  // ---- shortbow line: the skirmisher's bow, one design in four woods.
  shortbow: { bow: 'shortbow', color: '#96784f', wrap: '#5b4028' },
  oak_shortbow: { bow: 'shortbow', color: '#6b4a26', belly: '#8a6534', wrap: '#3e3a44', tip: 'horn', tipColor: '#d8d2c0' },
  willow_shortbow: { bow: 'shortbow', color: '#8a9455', belly: '#a8b46e', wrap: '#5b4028', tip: 'horn', tipColor: '#e2dcc8' },
  yew_shortbow: { bow: 'shortbow', color: '#7d4436', belly: '#9a5c44', wrap: '#3a3540', tip: 'gold', tipColor: '#e8c04c' },

  // ---- longbow line: the war bow.
  longbow: { bow: 'longbow', color: '#96784f', wrap: '#5b4028' },
  oak_longbow: { bow: 'longbow', color: '#6b4a26', belly: '#8a6534', wrap: '#3e3a44', tip: 'horn', tipColor: '#d8d2c0' },
  willow_longbow: { bow: 'longbow', color: '#8a9455', belly: '#a8b46e', wrap: '#5b4028', tip: 'horn', tipColor: '#e2dcc8' },
  yew_longbow: { bow: 'longbow', color: '#7d4436', belly: '#9a5c44', wrap: '#3a3540', tip: 'gold', tipColor: '#e8c04c' },

  // ---- hunting bow line: the recurve.
  hunting_bow: { bow: 'recurve', color: '#96784f', wrap: '#5b4028', fletch: '#8a9455' },
  oak_hunting_bow: { bow: 'recurve', color: '#6b4a26', belly: '#8a6534', wrap: '#5b4028', tip: 'horn', tipColor: '#d8d2c0', charm: 'feathers', charmColor: '#c9b88a', fletch: '#8a9455' },
  willow_hunting_bow: { bow: 'recurve', color: '#8a9455', belly: '#a8b46e', wrap: '#5b4028', tip: 'horn', tipColor: '#e2dcc8', charm: 'feathers', charmColor: '#c9b88a', fletch: '#8a9455' },
  yew_hunting_bow: { bow: 'recurve', color: '#7d4436', belly: '#9a5c44', wrap: '#3a3540', tip: 'iron', tipColor: '#8d9299', charm: 'feathers', charmColor: '#c9b88a', fletch: '#8a9455' },

  // ---- bespoke crafts.
  sparrowhawk: {
    bow: 'recurve', color: '#4a8ab8', belly: '#7ab4d8', wrap: '#2e5a7a',
    tip: 'horn', tipColor: '#e8e4da', charm: 'feathers', charmColor: '#e8e4da',
    fletch: '#e8e4da',
  },
  heartwood: {
    bow: 'flatbow', color: '#6a8a4a', belly: '#8aa862', wrap: '#4a3a2a',
    tip: 'thorn', tipColor: '#5a9a4a', charm: 'leaves', charmColor: '#5a9a4a',
    fletch: '#a8d87a', fx: 'sun', fxColor: '#c8e89a',
  },
  windsinger: {
    bow: 'longbow', color: '#7d4436', belly: '#9a5c44', wrap: '#b8863f',
    tip: 'gold', tipColor: '#e8c04c', charm: 'holes', charmColor: '#2e2434',
    fletch: '#c8dce8', fx: 'storm', fxColor: '#d8ecf4',
  },

  // ---- wild finds.
  stickbow: { bow: 'crude', color: '#96784f', string: '#c9b88a', fletch: '#c9b88a' },
  knucklebow: {
    bow: 'composite', color: '#8a6f52', belly: '#a8895f', wrap: '#4a3a2a',
    string: '#d8cba8', tip: 'bone', tipColor: '#e2dcc8', charm: 'teeth', charmColor: '#e2dcc8',
  },
  poachers_friend: {
    bow: 'shortbow', color: '#7a6a48', belly: '#96845c', wrap: '#4a3a2a',
    charm: 'beads', charmColor: '#8a7a5c', fletch: '#8a9455',
  },
  bramblethorn: {
    bow: 'crude', color: '#5a7a3c', belly: '#78964e', wrap: '#4a3a2a',
    tip: 'thorn', tipColor: '#78964e', charm: 'beads', charmColor: '#c4553d',
    fletch: '#78964e',
  },
  driftwood: {
    bow: 'flatbow', color: '#a89e86', belly: '#dcd4c0', wrap: '#55493c',
    fletch: '#7fb2d9',
  },
  fishspine: {
    bow: 'bone', color: '#c8ccc4', belly: '#e2e4de', string: '#d8cba8',
    tip: 'bone', tipColor: '#e2e4de', fletch: '#7fb2d9',
  },
  wolfsong: {
    bow: 'shortbow', color: '#8a8f9d', belly: '#b8bdc8', wrap: '#4a4e5a',
    tip: 'horn', tipColor: '#e2dcc8', charm: 'fur', charmColor: '#b0b5c0',
    fletch: '#c8d8e8', fx: 'frost', fxColor: '#d8e8f4',
  },
  rimewood: {
    bow: 'longbow', color: '#a8c8d8', belly: '#d8ecf4', wrap: '#5a7a8a',
    tip: 'iron', tipColor: '#8d9299', fletch: '#d8ecf4', fx: 'frost', fxColor: '#e8f4fa',
  },
  marrowpoint: {
    bow: 'bone', color: '#d8d2be', belly: '#eae4d0', string: '#c9c4b0',
    tip: 'iron', tipColor: '#5a5f6a', fletch: '#b8b4a4',
  },
  whisperwind: {
    bow: 'recurve', color: '#9a96ac', belly: '#b8b4c8', wrap: '#5a5668',
    string: '#b8b4c4', fletch: '#c8c4dc', fx: 'void', fxColor: '#c8c4dc',
  },
  emberglow: {
    bow: 'flatbow', color: '#c86a38', belly: '#e8944c', wrap: '#3a2a22',
    tip: 'iron', tipColor: '#5a5f6a', fletch: '#e8944c', fx: 'ember', fxColor: '#ffb35c',
  },
  kingswood: {
    bow: 'longbow', color: '#8a5c30', belly: '#b07c42', wrap: '#e8c04c',
    tip: 'gold', tipColor: '#e8c04c', charm: 'beads', charmColor: '#e8c04c',
    fletch: '#7a4a9e', fx: 'gleam', fxColor: '#ffe9a3',
  },
  starcall: {
    bow: 'recurve', color: '#5a5e9e', belly: '#7a80c4', wrap: '#3a3560',
    tip: 'gold', tipColor: '#e8c04c', fletch: '#c9cdf4', fx: 'star', fxColor: '#c9cdf4',
  },
  skyrender: {
    bow: 'recurve', len: 1.15, color: '#dce4ec', belly: '#f4f8fc', wrap: '#b8863f',
    tip: 'gold', tipColor: '#e8c04c', charm: 'beads', charmColor: '#e8c04c',
    fletch: '#e8c04c', fx: 'storm', fxColor: '#a8d8f4',
  },
};

const BOW_FALLBACKS = new Map<string, BowStyle>();

/**
 * Resolve a held item to its bow style. Registry hits first; unknown
 * '*bow' ids get a shortbow fallback in the item color. Null means
 * "not a bow" — the rig's isBow and drawHeldItem both key off this.
 */
export function bowStyle(itemId: string | undefined, color?: string): BowStyle | null {
  if (!itemId) return null;
  const st = BOW_STYLES[itemId];
  if (st) return st;
  if (!itemId.includes('bow')) return null;
  let fb = BOW_FALLBACKS.get(itemId);
  if (!fb) {
    fb = { bow: 'shortbow', color: color ?? '#8a6a45', wrap: '#5b4028' };
    BOW_FALLBACKS.set(itemId, fb);
  }
  return fb;
}

/** Natural proportions per kind: tip-span factor and tip angle. */
const BOW_KIND: Record<BowKind, { len: number; ang: number }> = {
  shortbow: { len: 0.85, ang: Math.PI / 2.3 },
  longbow: { len: 1.35, ang: Math.PI / 2.12 },
  recurve: { len: 0.95, ang: Math.PI / 2.42 },
  flatbow: { len: 1.0, ang: Math.PI / 2.3 },
  composite: { len: 0.95, ang: Math.PI / 2.35 },
  crude: { len: 0.9, ang: Math.PI / 2.3 },
  bone: { len: 0.9, ang: Math.PI / 2.32 },
};

/**
 * Paint a bow in the held-item frame (origin at the fist, +x toward the
 * target). `pull` is the string haul-back in px; `loose` the release
 * progress. Limbs flex with the pull; the belly passes x ≈ 0.18 s at
 * midline by construction (ctrlX = 0.36 s − tipX), so the rest-carry
 * grip translate keeps holding wood for every kind.
 */
export function drawBow(
  ctx: CanvasRenderingContext2D,
  st: BowStyle,
  s: number,
  nowMs: number,
  hurt?: boolean,
  pull = 0,
  loose?: number,
): void {
  const kind = BOW_KIND[st.bow];
  const S = 0.3 * s * (st.len ?? 1) * kind.len;
  const flex = Math.min(1, pull / (0.36 * s));
  const tipX = Math.cos(kind.ang) * S;
  const tipY = Math.sin(kind.ang) * S;
  const ctrlX = 0.36 * s - tipX + flex * 0.05 * s;
  const wood = hurt ? '#ffffff' : st.color;
  const belly = hurt ? '#ffffff' : (st.belly ?? shade(st.color, 26));
  const lw = Math.max(2, s * (st.bow === 'flatbow' ? 0.05 : st.bow === 'longbow' ? 0.04 : 0.048));

  // Point on the main limb curve, t: 0 = top tip, 1 = bottom tip.
  const limbX = (t: number): number => {
    const u = 1 - t;
    return u * u * tipX + 2 * u * t * ctrlX + t * t * tipX;
  };
  const limbY = (t: number): number => {
    const u = 1 - t;
    return u * u * -tipY + t * t * tipY;
  };

  // String attach points (hooks and siyahs reach past the main curve).
  let ax = tipX;
  let ayT = -tipY;
  let ayB = tipY;

  ctx.lineCap = 'round';

  // ---- limbs.
  if (st.bow === 'recurve') {
    // Working limbs stop short; tips hook toward the target.
    const innerY = tipY * 0.86;
    const hookX = tipX + (0.062 - flex * 0.018) * s;
    const hookY = tipY * 1.02;
    ctx.strokeStyle = wood;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(hookX, -hookY);
    ctx.quadraticCurveTo(tipX - 0.008 * s, -innerY, limbX(0.5) - 0.0001, 0);
    ctx.quadraticCurveTo(tipX - 0.008 * s, innerY, hookX, hookY);
    ctx.stroke();
    // Belly light hugging the target side.
    ctx.strokeStyle = belly;
    ctx.lineWidth = lw * 0.42;
    ctx.beginPath();
    ctx.moveTo(hookX + lw * 0.2, -hookY + 0.012 * s);
    ctx.quadraticCurveTo(ctrlX + lw * 0.32, 0, hookX + lw * 0.2, hookY - 0.012 * s);
    ctx.stroke();
    ax = hookX;
    ayT = -hookY;
    ayB = hookY;
  } else if (st.bow === 'composite') {
    // Rigid riser, working limbs, straight siyah levers.
    const elbowX = 0.1 * s;
    const elbowY = tipY * 0.76;
    const siyahX = 0.148 * s;
    ctx.strokeStyle = wood;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(siyahX, -tipY);
    ctx.lineTo(elbowX, -elbowY);
    ctx.quadraticCurveTo(ctrlX + 0.02 * s, 0, elbowX, elbowY);
    ctx.lineTo(siyahX, tipY);
    ctx.stroke();
    ctx.strokeStyle = belly;
    ctx.lineWidth = lw * 0.4;
    ctx.beginPath();
    ctx.moveTo(elbowX + lw * 0.3, -elbowY + 0.01 * s);
    ctx.quadraticCurveTo(ctrlX + 0.02 * s + lw * 0.3, 0, elbowX + lw * 0.3, elbowY - 0.01 * s);
    ctx.stroke();
    ax = siyahX;
  } else if (st.bow === 'crude') {
    // A kinked branch — asymmetric elbows and knot bumps.
    ctx.strokeStyle = wood;
    ctx.lineWidth = lw * 0.92;
    ctx.beginPath();
    ctx.moveTo(tipX + 0.014 * s, -tipY);
    ctx.lineTo(ctrlX * 0.72, -tipY * 0.52);
    ctx.lineTo(ctrlX * 0.62 + flex * 0.04 * s, 0.04 * s);
    ctx.lineTo(ctrlX * 0.78, tipY * 0.46);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    if (!hurt) {
      ctx.fillStyle = shade(st.color, -18);
      ctx.beginPath();
      ctx.arc(ctrlX * 0.72, -tipY * 0.52, lw * 0.55, 0, Math.PI * 2);
      ctx.arc(ctrlX * 0.78, tipY * 0.46, lw * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ax = tipX + 0.007 * s;
  } else if (st.bow === 'bone') {
    // Vertebrae threaded along the curve, biggest at the grip.
    const n = 11;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const r = (0.016 + 0.017 * Math.sin(Math.PI * t)) * s;
      ctx.fillStyle = wood;
      ctx.beginPath();
      ctx.arc(limbX(t), limbY(t), r, 0, Math.PI * 2);
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = belly;
        ctx.beginPath();
        ctx.arc(limbX(t) + r * 0.35, limbY(t), r * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (st.bow === 'flatbow') {
    // Broad paddle limbs: segment strokes with a width profile.
    ctx.strokeStyle = wood;
    for (let i = 0; i < 8; i++) {
      const t0 = i / 8;
      const t1 = (i + 1) / 8;
      ctx.lineWidth = lw * (0.55 + 0.95 * Math.sin(Math.PI * (t0 + t1) * 0.5));
      ctx.beginPath();
      ctx.moveTo(limbX(t0), limbY(t0));
      ctx.lineTo(limbX(t1), limbY(t1));
      ctx.stroke();
    }
    ctx.strokeStyle = belly;
    ctx.lineWidth = lw * 0.4;
    ctx.beginPath();
    ctx.moveTo(tipX + lw * 0.22, -tipY + 0.012 * s);
    ctx.quadraticCurveTo(ctrlX + lw * 0.35, 0, tipX + lw * 0.22, tipY - 0.012 * s);
    ctx.stroke();
  } else {
    // shortbow / longbow: the classic sprung arc, two-pass.
    ctx.strokeStyle = wood;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(tipX, -tipY);
    ctx.quadraticCurveTo(ctrlX, 0, tipX, tipY);
    ctx.stroke();
    ctx.strokeStyle = belly;
    ctx.lineWidth = lw * 0.42;
    ctx.beginPath();
    ctx.moveTo(tipX + lw * 0.22, -tipY + 0.012 * s);
    ctx.quadraticCurveTo(ctrlX + lw * 0.32, 0, tipX + lw * 0.22, tipY - 0.012 * s);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  // ---- tip furniture.
  if (!hurt && st.tip && st.tip !== 'plain') {
    const tc = st.tipColor ?? '#d8d2c0';
    ctx.fillStyle = tc;
    for (const sy of [-1, 1]) {
      const ty2 = sy < 0 ? ayT : ayB;
      if (st.tip === 'horn') {
        ctx.beginPath();
        ctx.moveTo(ax - 0.022 * s, ty2);
        ctx.lineTo(ax + 0.022 * s, ty2);
        ctx.lineTo(ax + 0.004 * s, ty2 + sy * 0.05 * s);
        ctx.closePath();
        ctx.fill();
      } else if (st.tip === 'thorn') {
        ctx.beginPath();
        ctx.moveTo(ax, ty2 - sy * 0.01 * s);
        ctx.lineTo(ax + 0.052 * s, ty2 + sy * 0.014 * s);
        ctx.lineTo(ax + 0.006 * s, ty2 + sy * 0.026 * s);
        ctx.closePath();
        ctx.fill();
      } else if (st.tip === 'bone') {
        ctx.beginPath();
        ctx.arc(ax, ty2, 0.024 * s, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // gold / iron: a metal nock band across the limb end.
        ctx.fillRect(ax - 0.026 * s, ty2 - sy * 0.008 * s, 0.052 * s, sy * 0.032 * s);
      }
    }
  }

  // ---- grip wrap: a band over the belly where the fist lands.
  const gripX = 0.18 * s + flex * 0.025 * s;
  const wrapC = hurt ? '#ffffff' : (st.wrap ?? shade(st.color, -30));
  ctx.fillStyle = wrapC;
  ctx.fillRect(gripX - lw * 0.85, -0.055 * s, lw * 1.7, 0.11 * s);

  // ---- charms.
  if (!hurt && st.charm) {
    const cc = st.charmColor ?? '#c9b88a';
    ctx.fillStyle = cc;
    if (st.charm === 'holes') {
      // Song-holes drilled along the upper limb.
      for (const t of [0.22, 0.32, 0.42]) {
        ctx.beginPath();
        ctx.arc(limbX(t), limbY(t), Math.max(1, 0.013 * s), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (st.charm === 'fur') {
      // Pelt tufts ringing the grip band — three spiky teeth per end.
      for (const sy of [-1, 1]) {
        for (const k of [-1, 0, 1]) {
          ctx.beginPath();
          ctx.moveTo(gripX + (k - 0.5) * lw * 0.62, sy * 0.055 * s);
          ctx.lineTo(gripX + k * lw * 0.62, sy * (0.055 + 0.042 - Math.abs(k) * 0.01) * s);
          ctx.lineTo(gripX + (k + 0.5) * lw * 0.62, sy * 0.055 * s);
          ctx.closePath();
          ctx.fill();
        }
      }
    } else {
      // Hanging charms off the lower limb, swaying gently — offset off
      // the belly side so they hang in air, never buried in the wood.
      const hx = limbX(0.74) + 0.024 * s;
      const hy = limbY(0.74);
      const sway = Math.sin(nowMs * 0.0022) * 0.012 * s;
      if (st.charm === 'feathers') {
        for (const k of [0, 1]) {
          ctx.beginPath();
          ctx.moveTo(hx + k * 0.026 * s, hy);
          ctx.lineTo(hx + k * 0.026 * s + sway - 0.016 * s, hy + 0.095 * s);
          ctx.lineTo(hx + k * 0.026 * s + sway + 0.014 * s, hy + 0.078 * s);
          ctx.closePath();
          ctx.fill();
        }
      } else if (st.charm === 'teeth') {
        for (const k of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(hx + k * 0.014 * s - 0.01 * s, hy + 0.01 * s);
          ctx.lineTo(hx + k * 0.014 * s + 0.01 * s, hy + 0.01 * s);
          ctx.lineTo(hx + k * 0.014 * s + sway * 0.6, hy + 0.05 * s);
          ctx.closePath();
          ctx.fill();
        }
      } else if (st.charm === 'leaves') {
        for (const t of [0.3, 0.62, 0.78]) {
          const lx = limbX(t);
          const ly = limbY(t);
          ctx.beginPath();
          ctx.moveTo(lx + 0.012 * s, ly);
          ctx.lineTo(lx + 0.036 * s, ly - 0.014 * s);
          ctx.lineTo(lx + 0.052 * s, ly + 0.004 * s);
          ctx.lineTo(lx + 0.03 * s, ly + 0.016 * s);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        // beads: a short strand hanging clear of the limb.
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(hx + 0.006 * s + sway * (i / 3), hy + (0.026 + i * 0.026) * s, Math.max(1, 0.012 * s), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // ---- string: taut → hauled to the nock → buzzing on release.
  ctx.strokeStyle = hurt ? '#ffffff' : (st.string ?? '#e6e0d0');
  ctx.lineWidth = Math.max(1, s * 0.018);
  ctx.beginPath();
  ctx.moveTo(ax, ayT);
  if (loose !== undefined) {
    const buzz = Math.sin(loose * 42) * 0.05 * s * (1 - loose);
    ctx.quadraticCurveTo(-buzz, 0, ax, ayB);
  } else if (pull > 0.5) {
    ctx.lineTo(-pull, 0);
    ctx.lineTo(ax, ayB);
  } else {
    // At rest the string is a straight brace, tip to tip.
    ctx.lineTo(ax, ayB);
  }
  ctx.stroke();

  // ---- nocked arrow, fletched in the bow's colors.
  if (pull > 0.06 * s && loose === undefined && !hurt) {
    ctx.strokeStyle = '#c4b590';
    ctx.lineWidth = Math.max(1.5, s * 0.028);
    ctx.beginPath();
    ctx.moveTo(-pull, 0);
    ctx.lineTo(0.38 * s, 0);
    ctx.stroke();
    ctx.fillStyle = '#c9ccd4';
    ctx.beginPath();
    ctx.moveTo(0.44 * s, 0);
    ctx.lineTo(0.36 * s, -0.032 * s);
    ctx.lineTo(0.36 * s, 0.032 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = st.fletch ?? '#d95763';
    ctx.lineWidth = Math.max(1, s * 0.02);
    for (const sy of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-pull + 0.01 * s, 0);
      ctx.lineTo(-pull - 0.045 * s, sy * 0.045 * s);
      ctx.stroke();
    }
  }

  // ---- the living channel, riding the limb curve.
  if (!hurt && st.fx) {
    const c = st.fxColor ?? '#ffffff';
    if (st.fx === 'gleam') {
      const u = (nowMs % 2600) / 2600;
      if (u < 0.55) {
        const t = u / 0.55;
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(limbX(t), limbY(t), Math.max(1, 0.014 * s * Math.sin(Math.PI * t)), 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      for (let i = 0; i < 3; i++) {
        const phase = (nowMs * 0.00045 + i * 0.37) % 1;
        const t = 0.12 + 0.76 * ((i * 0.31 + phase) % 1);
        let x = limbX(t);
        let y = limbY(t);
        let r = Math.max(1, 0.012 * s);
        switch (st.fx) {
          case 'ember':
            x += 0.014 * s + 0.026 * s * phase;
            r *= 1 - phase * 0.6;
            break;
          case 'frost':
            x += 0.03 * s * Math.sin(phase * Math.PI * 2 + i * 2.1);
            break;
          case 'void':
            x += 0.018 * s + 0.012 * s * Math.sin(phase * Math.PI * 2);
            break;
          case 'storm':
            if (Math.sin(nowMs * 0.02 + i * 2.6) < 0.55) continue;
            x += 0.022 * s;
            break;
          case 'star':
            x += 0.024 * s;
            r *= 0.6 + 0.7 * Math.abs(Math.sin(nowMs * 0.004 + i * 1.7));
            break;
          default: // sun / blood: warm sparkles hugging the belly
            x += 0.02 * s + 0.008 * s * Math.sin(phase * Math.PI * 2 + i);
            break;
        }
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// ======================================================================
// The archmage's roster — staff visual styles.
//
// A staff is three statements stacked on one line: the SHAFT (what the
// world gave), the CROWN (what the maker did with it), and the FOCUS
// (what lives there now). Records are pure data over one painter; the
// living fx channel rides nowMs like the blades', and every focus
// flares on a cast — the staff is the spell's mouth, and it should
// visibly speak.
//
// Frame: origin at the fist, +x runs hand → crown, the butt trails at
// −x. The rig slides the grip with carriage (planted walking stick ↔
// leveled at something), so all geometry hangs off a grip-relative
// span, never absolute x.
// ======================================================================

export type StaffShaft =
  | 'straight'  // clean tapered hardwood with an edge light
  | 'gnarled'   // kinked wild wood, knot bumps
  | 'twisted'   // two strands wound around each other (the carved line)
  | 'bone'      // stacked vertebrae on an iron thread
  | 'iron'      // drawn metal rod, collared
  | 'obsidian'; // faceted volcanic glass, lit from inside

export type StaffCrown =
  | 'fork'      // gilded claw cradling the focus (the classic)
  | 'orb'       // collared socket holding a bare focus
  | 'crook'     // the shepherd's hook
  | 'crescent'  // a moon of metal or glass cupping the focus
  | 'skull'     // a small skull, flame standing where thought was
  | 'twinprong' // two straight lightning prongs, focus arcing between
  | 'sundisc'   // a rayed disc with the focus at heart
  | 'coil'      // twin serpents crossing, focus held at the mouths
  | 'thorns'    // a briar spiral armed with thorns around the focus
  | 'lantern'   // a little cage, the focus burning inside
  | 'shard'     // crystal shards clustered around (or AS) the focus
  | 'ring'      // an annulus, the focus floating dead center
  | 'knot'      // a fist of rootwood, runes lit across it
  | 'branch'    // living twigs and a leaf — barely a staff at all
  | 'wisp';     // no cradle: the focus simply follows the staff

export type StaffFx =
  | 'embers'  // rising fire motes off the crown
  | 'frost'   // falling frost-fog dots
  | 'sparks'  // hard electric flickers
  | 'motes'   // slow orbiting arcana
  | 'leaves'  // green flecks drifting off
  | 'drip'    // beads running off the crown (blood runs UP)
  | 'rays'    // breathing sun rays
  | 'stars'   // twinkling pinpricks inside/around the focus
  | 'runes'   // rune lights pulsing in sequence down the shaft
  | 'aurora'; // slow ribbons of many-colored light

export interface StaffStyle {
  shaft: StaffShaft;
  /** Shaft body color. Edge light defaults to shade(+28). */
  color: string;
  edge?: string;
  /** Fittings: wire wraps, collars, crown metal. */
  metal?: string;
  crown: StaffCrown;
  /** Crown structure color (defaults to metal). */
  crownColor?: string;
  /** The focus — the element made visible. */
  gem?: string;
  /** Hot core / glint inside the focus. */
  gemCore?: string;
  /** Length multiplier (1 ≈ body-tall). */
  len?: number;
  /** Iron shoe at the butt — a stick that gets WALKED on. */
  ferrule?: boolean;
  fx?: StaffFx;
  fxColor?: string;
}

export const STAFF_STYLES: Record<string, StaffStyle> = {
  // ---- the carving ladder: one twisted-strand design, four woods.
  // The strands wind tighter and the arcana wakes as the wood deepens.
  carved_staff: {
    shaft: 'twisted', color: '#8a6a45', metal: '#8d9299',
    crown: 'orb', gem: '#b49af0', ferrule: true,
  },
  oak_staff: {
    shaft: 'twisted', color: '#6b4a26', metal: '#8d9299',
    crown: 'orb', gem: '#b49af0', ferrule: true, fx: 'motes', fxColor: '#b49af0',
  },
  willow_staff: {
    shaft: 'twisted', color: '#8a9455', edge: '#b8c284', metal: '#d9a441',
    crown: 'orb', gem: '#b49af0', ferrule: true, fx: 'motes', fxColor: '#c8b4f4',
  },
  yew_staff: {
    shaft: 'twisted', color: '#7d4436', edge: '#a86a52', metal: '#d9a441',
    crown: 'fork', gem: '#b49af0', gemCore: '#efe3ff', ferrule: true,
    fx: 'motes', fxColor: '#c8b4f4', len: 1.05,
  },

  // ---- the battlestaff frame: ONE willow war-build, four gems. Same
  // dark shaft, same iron claw — the gem owns the identity.
  ember_battlestaff: {
    shaft: 'straight', color: '#4e3a28', edge: '#6e563c', metal: '#4a4554',
    crown: 'fork', crownColor: '#4a4554', gem: '#ff8a4a', gemCore: '#ffe8b0',
    ferrule: true, fx: 'embers', fxColor: '#ff9a5a', len: 1.05,
  },
  frost_battlestaff: {
    shaft: 'straight', color: '#4e3a28', edge: '#6e563c', metal: '#4a4554',
    crown: 'fork', crownColor: '#4a4554', gem: '#8ac4e8', gemCore: '#f0faff',
    ferrule: true, fx: 'frost', fxColor: '#c8e8f8', len: 1.05,
  },
  storm_battlestaff: {
    shaft: 'straight', color: '#4e3a28', edge: '#6e563c', metal: '#4a4554',
    crown: 'fork', crownColor: '#4a4554', gem: '#ffe86a', gemCore: '#fffdf0',
    ferrule: true, fx: 'sparks', fxColor: '#fff0a0', len: 1.05,
  },
  verdant_battlestaff: {
    shaft: 'straight', color: '#4e3a28', edge: '#6e563c', metal: '#4a4554',
    crown: 'fork', crownColor: '#4a4554', gem: '#7ac46a', gemCore: '#eaffd8',
    ferrule: true, fx: 'leaves', fxColor: '#9ad088', len: 1.05,
  },

  // ---- the adopted classics.
  apprentice_staff: {
    shaft: 'straight', color: '#5f4226', edge: '#8a6642', metal: '#d9a441',
    crown: 'fork', crownColor: '#b8863f', gem: '#7a5ac4', gemCore: '#efe3ff',
    ferrule: true,
  },
  ember_staff: {
    shaft: 'gnarled', color: '#4a3430', edge: '#6e4a3c', metal: '#4a4554',
    crown: 'orb', gem: '#ff8a4a', gemCore: '#ffe8b0',
    ferrule: true, fx: 'embers', fxColor: '#ff9a5a',
  },

  // ---- the bespoke crafts.
  hearthwarden: {
    shaft: 'straight', color: '#7a5432', edge: '#a0784a', metal: '#4a4554',
    crown: 'lantern', crownColor: '#4a4554', gem: '#ffb44a', gemCore: '#ffe8b0',
    ferrule: true, fx: 'embers', fxColor: '#ff9a5a',
  },
  tidebinder: {
    shaft: 'gnarled', color: '#a89e86', edge: '#ccc2a8', metal: '#5a8ab0',
    crown: 'crescent', crownColor: '#7a94a0', gem: '#6ab4dc', gemCore: '#f0faff',
    ferrule: false, fx: 'drip', fxColor: '#8ac4e8',
  },
  stormcaller: {
    shaft: 'straight', color: '#4e3a30', edge: '#6e5644', metal: '#b87333',
    crown: 'twinprong', crownColor: '#8d9299', gem: '#ffe86a', gemCore: '#ffffff',
    ferrule: true, fx: 'sparks', fxColor: '#fff0a0', len: 1.1,
  },

  // ---- the wild finds.
  hazel_switch: {
    shaft: 'gnarled', color: '#96784f', edge: '#b89a6c',
    crown: 'branch', crownColor: '#7a9a4a', gem: '#a0c46a',
    ferrule: false, len: 0.85,
  },
  shepherds_crook: {
    shaft: 'straight', color: '#a08a5c', edge: '#c4ae7c', metal: '#8d9299',
    crown: 'crook', crownColor: '#a08a5c',
    ferrule: true, fx: 'leaves', fxColor: '#9ad088',
  },
  wisplight: {
    shaft: 'gnarled', color: '#6e5a40', edge: '#948060',
    crown: 'wisp', gem: '#f4ecc0', gemCore: '#ffffff',
    ferrule: false, fx: 'motes', fxColor: '#efe8c0',
  },
  gravewood: {
    shaft: 'gnarled', color: '#524a3e', edge: '#6e6454',
    crown: 'skull', crownColor: '#d8d2be', gem: '#8ec89a', gemCore: '#eaffd8',
    ferrule: false, fx: 'motes', fxColor: '#8ec89a',
  },
  gloomthorn: {
    shaft: 'twisted', color: '#4a3a52', edge: '#685478', metal: '#3a2e42',
    crown: 'thorns', crownColor: '#5a4668', gem: '#b070d8', gemCore: '#e8d0ff',
    ferrule: false, fx: 'motes', fxColor: '#9a6ab8',
  },
  serpentcoil: {
    shaft: 'straight', color: '#3e3428', edge: '#5c4e3a', metal: '#b87333',
    crown: 'coil', crownColor: '#b87333', gem: '#8ad05a', gemCore: '#eaffd8',
    ferrule: true, fx: 'motes', fxColor: '#a0c050',
  },
  glacierbite: {
    shaft: 'straight', color: '#5c5448', edge: '#7c7260', metal: '#7a94a0',
    crown: 'shard', crownColor: '#b0d8e8', gem: '#8ac4e8', gemCore: '#f0faff',
    ferrule: true, fx: 'frost', fxColor: '#c8e8f8', len: 1.08,
  },
  pyreheart: {
    shaft: 'obsidian', color: '#3a3038', edge: '#584a54', metal: '#e85a2c',
    crown: 'shard', crownColor: '#78566a', gem: '#ff6a2c', gemCore: '#ffb45a',
    ferrule: false, fx: 'embers', fxColor: '#ff8a3c',
  },
  runegnarl: {
    shaft: 'gnarled', color: '#5e5244', edge: '#7e7060', metal: '#b0a0d8',
    crown: 'knot', crownColor: '#483e34', gem: '#c8b8f0', gemCore: '#e8e0ff',
    ferrule: false, fx: 'runes', fxColor: '#b0a0d8',
  },
  sunwrought: {
    shaft: 'straight', color: '#d8ccb0', edge: '#f0e8d0', metal: '#d9a441',
    crown: 'sundisc', crownColor: '#e8b84a', gem: '#ffd98a', gemCore: '#ffffff',
    ferrule: true, fx: 'rays', fxColor: '#ffd98a', len: 1.05,
  },
  boneharrow: {
    shaft: 'bone', color: '#d8d2be', edge: '#f0ecdc', metal: '#4a4554',
    crown: 'lantern', crownColor: '#c8c2ac', gem: '#8ec89a', gemCore: '#eaffd8',
    ferrule: false, fx: 'motes', fxColor: '#8ec89a', len: 1.05,
  },
  bloodmoon: {
    shaft: 'straight', color: '#3e2a30', edge: '#5e4048', metal: '#8d5a64',
    crown: 'crescent', crownColor: '#c84a5a', gem: '#ff6a7a', gemCore: '#ffd0d4',
    ferrule: true, fx: 'drip', fxColor: '#d95763',
  },
  nightwell: {
    shaft: 'iron', color: '#3a3648', edge: '#565064', metal: '#6a6480',
    crown: 'crescent', crownColor: '#565064', gem: '#1e1a2e', gemCore: '#8a80c8',
    ferrule: true, fx: 'stars', fxColor: '#c8c2ee', len: 1.05,
  },
  tempest_crown: {
    shaft: 'iron', color: '#7a828e', edge: '#a0a8b4', metal: '#c8ccd4',
    crown: 'ring', crownColor: '#c8ccd4', gem: '#ffe86a', gemCore: '#ffffff',
    ferrule: true, fx: 'sparks', fxColor: '#e8f0ff', len: 1.05,
  },
  worldsplinter: {
    shaft: 'straight', color: '#b8c8c4', edge: '#dceee8', metal: '#d9a441',
    crown: 'shard', crownColor: '#9ae8de', gem: '#9ae8de', gemCore: '#ffffff',
    ferrule: false, fx: 'aurora', fxColor: '#9ae8de', len: 1.12,
  },
};

const STAFF_FALLBACKS = new Map<string, StaffStyle>();

/**
 * Resolve a held item to its staff style. Registry hits first; unknown
 * '*staff' ids get the classic fork-and-orb in the item color. Null
 * means "not a staff" — the rig's isStaff and drawHeldItem key off it.
 */
export function staffStyle(itemId: string | undefined, color?: string): StaffStyle | null {
  if (!itemId) return null;
  const st = STAFF_STYLES[itemId];
  if (st) return st;
  if (!itemId.includes('staff')) return null;
  let fb = STAFF_FALLBACKS.get(itemId);
  if (!fb) {
    fb = {
      shaft: 'straight', color: '#5f4226', edge: '#8a6642', metal: '#d9a441',
      crown: 'fork', crownColor: '#b8863f', gem: color ?? '#b49af0',
      gemCore: '#efe3ff', ferrule: true,
    };
    STAFF_FALLBACKS.set(itemId, fb);
  }
  return fb;
}

/**
 * Paint a staff in the held-item frame (origin at the fist, +x toward
 * the crown). `grip` is the fraction of length trailing below the hand
 * — the rig slides it with carriage. `castT` flares the focus while
 * the spell leaves.
 */
export function drawStaff(
  ctx: CanvasRenderingContext2D,
  st: StaffStyle,
  s: number,
  nowMs: number,
  hurt?: boolean,
  grip = 0.34,
  castT = 0,
): void {
  const LEN = 0.98 * s * (st.len ?? 1);
  const butt = -grip * LEN;
  const top = (1 - grip) * LEN;
  const wood = hurt ? '#ffffff' : st.color;
  const edge = hurt ? '#ffffff' : (st.edge ?? shade(st.color, 28));
  const metal = hurt ? '#ffffff' : (st.metal ?? '#8d9299');
  const crownC = hurt ? '#ffffff' : (st.crownColor ?? metal);
  const gem = hurt ? '#ffffff' : (st.gem ?? '#b49af0');
  const gemCore = hurt ? '#ffffff' : (st.gemCore ?? '#efe3ff');
  const lw = Math.max(2.5, s * 0.062);
  // Where the wood ends and the crown begins.
  const neck = top - 0.1 * s;

  ctx.lineCap = 'round';

  // ------------------------------------------------------------ shaft
  if (st.shaft === 'twisted') {
    // Two strands wound around each other — the carver's brag. Each
    // strand is a gentle opposed sine; they trade the light.
    ctx.strokeStyle = wood;
    ctx.lineWidth = lw * 0.62;
    for (const ph of [0, Math.PI]) {
      ctx.beginPath();
      const steps = 9;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = butt + (neck - butt) * t;
        const y = Math.sin(t * Math.PI * 3 + ph) * 0.024 * s;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      if (ph === Math.PI) ctx.strokeStyle = hurt ? '#ffffff' : shade(st.color, 16);
      ctx.stroke();
    }
    ctx.strokeStyle = edge;
    ctx.lineWidth = Math.max(1, s * 0.014);
    ctx.beginPath();
    ctx.moveTo(butt + 0.04 * s, -0.02 * s);
    ctx.lineTo(neck - 0.04 * s, -0.02 * s);
    ctx.stroke();
  } else if (st.shaft === 'gnarled') {
    // Wild wood keeps its kinks; knots swell where branches argued.
    ctx.strokeStyle = wood;
    ctx.lineWidth = lw * 0.92;
    ctx.beginPath();
    ctx.moveTo(butt, 0.01 * s);
    ctx.lineTo(butt + (neck - butt) * 0.3, -0.022 * s);
    ctx.lineTo(butt + (neck - butt) * 0.58, 0.018 * s);
    ctx.lineTo(butt + (neck - butt) * 0.85, -0.012 * s);
    ctx.lineTo(neck, 0);
    ctx.stroke();
    if (!hurt) {
      ctx.fillStyle = shade(st.color, -18);
      ctx.beginPath();
      ctx.arc(butt + (neck - butt) * 0.3, -0.022 * s, lw * 0.5, 0, Math.PI * 2);
      ctx.arc(butt + (neck - butt) * 0.58, 0.018 * s, lw * 0.44, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(butt + (neck - butt) * 0.34, -0.038 * s);
      ctx.lineTo(butt + (neck - butt) * 0.8, -0.028 * s);
      ctx.stroke();
    }
  } else if (st.shaft === 'bone') {
    // Vertebrae threaded on an iron rod, biggest mid-shaft.
    ctx.strokeStyle = metal;
    ctx.lineWidth = Math.max(1.5, s * 0.02);
    ctx.beginPath();
    ctx.moveTo(butt, 0);
    ctx.lineTo(neck, 0);
    ctx.stroke();
    const n = 10;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = butt + (neck - butt) * t;
      const r = (0.02 + 0.016 * Math.sin(Math.PI * t)) * s;
      ctx.fillStyle = wood;
      ctx.beginPath();
      ctx.arc(x, 0, r, 0, Math.PI * 2);
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = edge;
        ctx.beginPath();
        ctx.arc(x + r * 0.3, -r * 0.25, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (st.shaft === 'iron') {
    // Drawn metal, cold and even; collars break the length.
    ctx.strokeStyle = wood;
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ctx.moveTo(butt, 0);
    ctx.lineTo(neck, 0);
    ctx.stroke();
    ctx.strokeStyle = edge;
    ctx.lineWidth = Math.max(1, s * 0.016);
    ctx.beginPath();
    ctx.moveTo(butt + 0.03 * s, -0.014 * s);
    ctx.lineTo(neck - 0.03 * s, -0.014 * s);
    ctx.stroke();
    if (!hurt) {
      ctx.fillStyle = metal;
      for (const t of [0.3, 0.72]) {
        ctx.fillRect(butt + (neck - butt) * t - 0.014 * s, -0.036 * s, 0.028 * s, 0.072 * s);
      }
    }
  } else if (st.shaft === 'obsidian') {
    // Volcanic glass in facet segments; the vein inside breathes.
    ctx.strokeStyle = wood;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(butt, 0);
    ctx.lineTo(neck, 0);
    ctx.stroke();
    if (!hurt) {
      // Magma cracks: short bright nicks, brightening on the cast.
      const glowK = 0.6 + 0.4 * Math.sin(nowMs * 0.003) + castT * 0.8;
      ctx.strokeStyle = st.metal ?? '#e85a2c';
      ctx.globalAlpha = Math.min(1, 0.45 + glowK * 0.3);
      ctx.lineWidth = Math.max(1, s * 0.018);
      for (const t of [0.2, 0.45, 0.66, 0.88]) {
        const x = butt + (neck - butt) * t;
        ctx.beginPath();
        ctx.moveTo(x - 0.02 * s, 0.016 * s);
        ctx.lineTo(x + 0.02 * s, -0.016 * s);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(butt + 0.05 * s, -0.022 * s);
      ctx.lineTo(neck - 0.05 * s, -0.022 * s);
      ctx.stroke();
    }
  } else {
    // straight: the honest two-pass hardwood the wand line shipped with.
    ctx.strokeStyle = wood;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(butt, 0);
    ctx.lineTo(neck, 0);
    ctx.stroke();
    ctx.strokeStyle = edge;
    ctx.lineWidth = Math.max(1, s * 0.018);
    ctx.beginPath();
    ctx.moveTo(butt + 0.03 * s, -0.012 * s);
    ctx.lineTo(neck - 0.04 * s, -0.012 * s);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  // Ferrule shoeing the butt.
  if (st.ferrule && !hurt) {
    ctx.fillStyle = '#4a4554';
    ctx.fillRect(butt, -0.03 * s, 0.05 * s, 0.06 * s);
  }
  // Wire wrap at the hand (skipped on bone/obsidian — nothing to bind).
  if (!hurt && st.shaft !== 'bone' && st.shaft !== 'obsidian') {
    ctx.strokeStyle = metal;
    ctx.lineWidth = Math.max(1.5, s * 0.03);
    ctx.beginPath();
    ctx.moveTo(0.05 * s, -0.032 * s);
    ctx.lineTo(0.05 * s, 0.032 * s);
    ctx.stroke();
  }

  // ------------------------------------------------------------ crown
  // The focus flares while the spell leaves — shared by every crown.
  const gemR = (0.078 + castT * 0.04) * s;
  const drawFocus = (x: number, y: number, r: number): void => {
    ctx.fillStyle = gem;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = gemCore;
      ctx.beginPath();
      ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.36, 0, Math.PI * 2);
      ctx.fill();
    }
    if (castT > 0) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = gem;
      ctx.beginPath();
      ctx.arc(x, y, r * (1.7 + castT * 1.2), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  };

  switch (st.crown) {
    case 'fork': {
      // Gilded claw cradling the focus.
      ctx.strokeStyle = crownC;
      ctx.lineWidth = Math.max(2, s * 0.045);
      for (const fs of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(top - 0.13 * s, fs * 0.012 * s);
        ctx.quadraticCurveTo(top - 0.04 * s, fs * 0.075 * s, top + 0.015 * s, fs * 0.05 * s);
        ctx.stroke();
      }
      drawFocus(top, 0, gemR);
      break;
    }
    case 'orb': {
      // A collar, then the bare focus standing on it.
      ctx.fillStyle = crownC;
      ctx.fillRect(neck - 0.01 * s, -0.034 * s, 0.036 * s, 0.068 * s);
      drawFocus(top - 0.02 * s, 0, gemR);
      break;
    }
    case 'crook': {
      // The shepherd's hook, curling back over the shaft.
      ctx.strokeStyle = hurt ? '#ffffff' : crownC;
      ctx.lineWidth = lw * 0.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(neck, 0);
      ctx.quadraticCurveTo(top + 0.09 * s, -0.012 * s, top + 0.06 * s, -0.11 * s);
      ctx.quadraticCurveTo(top + 0.02 * s, -0.17 * s, top - 0.06 * s, -0.13 * s);
      ctx.stroke();
      ctx.lineCap = 'butt';
      if (!hurt) {
        // The little iron bell that told the flock where home was.
        ctx.fillStyle = st.metal ?? '#8d9299';
        ctx.beginPath();
        ctx.arc(top - 0.06 * s, -0.1 * s, 0.026 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'crescent': {
      // A moon cupping the focus. Structure first, focus floating in.
      ctx.strokeStyle = crownC;
      ctx.lineWidth = Math.max(2, s * 0.042);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(top + 0.01 * s, 0, 0.115 * s, Math.PI * 0.62, Math.PI * 1.38, false);
      ctx.stroke();
      ctx.lineCap = 'butt';
      drawFocus(top + 0.02 * s, 0, gemR * 0.92);
      break;
    }
    case 'skull': {
      // A small skull facing the viewer: dome leading +x (skyward when
      // planted), jaw stepping back toward the shaft, and the focus
      // burning as a standing flame beyond the crown of the head.
      ctx.fillStyle = crownC;
      ctx.fillRect(top - 0.075 * s, -0.036 * s, 0.05 * s, 0.072 * s);
      ctx.beginPath();
      ctx.arc(top - 0.01 * s, 0, 0.07 * s, 0, Math.PI * 2);
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = '#2e2a26';
        ctx.beginPath();
        ctx.arc(top - 0.018 * s, -0.03 * s, 0.018 * s, 0, Math.PI * 2);
        ctx.arc(top - 0.018 * s, 0.03 * s, 0.018 * s, 0, Math.PI * 2);
        ctx.fill();
        // Teeth nicks along the jaw's shaft edge.
        ctx.fillRect(top - 0.075 * s, -0.02 * s, 0.012 * s, 0.012 * s);
        ctx.fillRect(top - 0.075 * s, 0.008 * s, 0.012 * s, 0.012 * s);
      }
      // The flame: a teardrop standing off the dome, leaning with time.
      if (!hurt) {
        const lean = Math.sin(nowMs * 0.004) * 0.016 * s;
        const tipX = top + 0.19 * s + castT * 0.05 * s;
        ctx.fillStyle = gem;
        ctx.beginPath();
        ctx.moveTo(tipX, lean);
        ctx.quadraticCurveTo(top + 0.13 * s, 0.032 * s, top + 0.085 * s, 0);
        ctx.quadraticCurveTo(top + 0.13 * s, -0.032 * s, tipX, lean);
        ctx.fill();
        ctx.fillStyle = gemCore;
        ctx.beginPath();
        ctx.arc(top + 0.115 * s, 0, 0.018 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'twinprong': {
      // Two straight lightning rods; the focus arcs in the gap.
      ctx.strokeStyle = crownC;
      ctx.lineWidth = Math.max(2, s * 0.04);
      for (const fs of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(neck, fs * 0.015 * s);
        ctx.lineTo(top + 0.02 * s, fs * 0.07 * s);
        ctx.lineTo(top + 0.09 * s, fs * 0.075 * s);
        ctx.stroke();
      }
      drawFocus(top + 0.035 * s, 0, gemR * 0.8);
      if (!hurt) {
        // A live arc jumping prong-to-prong, flickering on its own clock.
        if (Math.sin(nowMs * 0.021) > 0.2) {
          ctx.strokeStyle = gemCore;
          ctx.lineWidth = Math.max(1, s * 0.016);
          ctx.beginPath();
          ctx.moveTo(top + 0.06 * s, -0.072 * s);
          ctx.lineTo(top + 0.02 * s, -0.02 * s);
          ctx.lineTo(top + 0.08 * s, 0.014 * s);
          ctx.lineTo(top + 0.05 * s, 0.073 * s);
          ctx.stroke();
        }
      }
      break;
    }
    case 'sundisc': {
      // The rayed disc; rays breathe, the focus is the sun's heart.
      if (!hurt) {
        const breath = 1 + 0.1 * Math.sin(nowMs * 0.0024) + castT * 0.4;
        ctx.strokeStyle = crownC;
        ctx.lineWidth = Math.max(1.5, s * 0.028);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
          ctx.beginPath();
          ctx.moveTo(top + Math.cos(a) * 0.1 * s, Math.sin(a) * 0.1 * s);
          ctx.lineTo(top + Math.cos(a) * 0.15 * s * breath, Math.sin(a) * 0.15 * s * breath);
          ctx.stroke();
        }
      }
      ctx.fillStyle = crownC;
      ctx.beginPath();
      ctx.arc(top, 0, 0.095 * s, 0, Math.PI * 2);
      ctx.fill();
      drawFocus(top, 0, gemR * 0.82);
      break;
    }
    case 'coil': {
      // Twin serpents crossing up the neck, mouths meeting at the focus.
      ctx.strokeStyle = crownC;
      ctx.lineWidth = Math.max(2, s * 0.036);
      ctx.lineCap = 'round';
      for (const fs of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(neck - 0.05 * s, 0);
        ctx.quadraticCurveTo(neck + 0.03 * s, fs * 0.085 * s, top - 0.015 * s, fs * 0.02 * s);
        ctx.quadraticCurveTo(top + 0.02 * s, fs * -0.05 * s, top + 0.05 * s, fs * 0.028 * s);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      if (!hurt) {
        // Heads: two wedges facing the held gem.
        ctx.fillStyle = shade(st.crownColor ?? '#b87333', 22);
        for (const fs of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(top + 0.05 * s, fs * 0.028 * s);
          ctx.lineTo(top + 0.095 * s, fs * 0.045 * s);
          ctx.lineTo(top + 0.085 * s, fs * 0.006 * s);
          ctx.closePath();
          ctx.fill();
        }
      }
      drawFocus(top + 0.1 * s, 0, gemR * 0.68);
      break;
    }
    case 'thorns': {
      // A briar spiral around the focus, armed outward — the curse
      // light burns first, the bramble cages it.
      drawFocus(top + 0.05 * s, 0, gemR * 0.9);
      ctx.strokeStyle = crownC;
      ctx.lineWidth = Math.max(2, s * 0.036);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(neck, 0);
      ctx.quadraticCurveTo(top + 0.03 * s, -0.14 * s, top + 0.13 * s, -0.03 * s);
      ctx.quadraticCurveTo(top + 0.15 * s, 0.11 * s, top - 0.02 * s, 0.105 * s);
      ctx.stroke();
      ctx.lineCap = 'butt';
      if (!hurt) {
        ctx.fillStyle = crownC;
        const thorns: Array<[number, number, number, number]> = [
          [top - 0.0 * s, -0.11 * s, 0.4, -1],
          [top + 0.12 * s, -0.075 * s, 1, -0.5],
          [top + 0.145 * s, 0.055 * s, 1, 0.5],
          [top + 0.035 * s, 0.115 * s, -0.2, 1],
        ];
        for (const [tx2, ty2, dx2, dy2] of thorns) {
          // Thorn wedge pointing (dx2, dy2) away from the spiral.
          const nx = -dy2, ny = dx2;
          ctx.beginPath();
          ctx.moveTo(tx2 + nx * 0.018 * s, ty2 + ny * 0.018 * s);
          ctx.lineTo(tx2 - nx * 0.018 * s, ty2 - ny * 0.018 * s);
          ctx.lineTo(tx2 + dx2 * 0.065 * s, ty2 + dy2 * 0.065 * s);
          ctx.closePath();
          ctx.fill();
        }
      }
      break;
    }
    case 'lantern': {
      // A little cage; the focus burns inside, never quite still.
      const cx2 = top + 0.01 * s;
      if (!hurt) {
        const flick = 0.9 + 0.1 * Math.sin(nowMs * 0.009);
        drawFocus(cx2, 0, gemR * 0.72 * flick);
      } else {
        drawFocus(cx2, 0, gemR * 0.72);
      }
      ctx.strokeStyle = crownC;
      ctx.lineWidth = Math.max(1.5, s * 0.026);
      // Cage ribs: an ellipse read as three verticals + cap and base.
      ctx.beginPath();
      ctx.moveTo(cx2 - 0.075 * s, -0.06 * s);
      ctx.quadraticCurveTo(cx2, -0.115 * s, cx2 + 0.075 * s, -0.06 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx2 - 0.075 * s, 0.06 * s);
      ctx.quadraticCurveTo(cx2, 0.115 * s, cx2 + 0.075 * s, 0.06 * s);
      ctx.stroke();
      for (const fx2 of [-0.075, 0, 0.075]) {
        ctx.beginPath();
        ctx.moveTo(cx2 + fx2 * s, -0.06 * s + Math.abs(fx2) * 0.2 * s);
        ctx.lineTo(cx2 + fx2 * s, 0.06 * s - Math.abs(fx2) * 0.2 * s);
        ctx.stroke();
      }
      break;
    }
    case 'shard': {
      // Crystal shards clustered at the crown — the focus made solid.
      // The center shard leads along +x; wings flank it.
      const shards: Array<[number, number, number, number]> = [
        [top + 0.02 * s, 0, 0.15 * s, 0.045 * s],
        [top - 0.01 * s, -0.055 * s, 0.1 * s, 0.032 * s],
        [top - 0.01 * s, 0.055 * s, 0.1 * s, 0.032 * s],
      ];
      for (const [sx, sy, sl, sw] of shards) {
        ctx.fillStyle = hurt ? '#ffffff' : (st.crownColor ?? gem);
        ctx.beginPath();
        ctx.moveTo(sx + sl, sy);
        ctx.lineTo(sx, sy - sw);
        ctx.lineTo(sx - sl * 0.4, sy);
        ctx.lineTo(sx, sy + sw);
        ctx.closePath();
        ctx.fill();
        if (!hurt) {
          ctx.fillStyle = gemCore;
          ctx.beginPath();
          ctx.moveTo(sx + sl * 0.6, sy);
          ctx.lineTo(sx, sy - sw * 0.4);
          ctx.lineTo(sx - sl * 0.2, sy);
          ctx.lineTo(sx, sy + sw * 0.4);
          ctx.closePath();
          ctx.fill();
        }
      }
      // The molten heart glowing between the shards.
      if (!hurt) {
        ctx.fillStyle = gem;
        ctx.beginPath();
        ctx.arc(top - 0.005 * s, 0, 0.032 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      if (castT > 0) {
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = gem;
        ctx.beginPath();
        ctx.arc(top + 0.02 * s, 0, (0.16 + castT * 0.1) * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'ring': {
      // An annulus; the focus floats dead center, touching nothing.
      ctx.strokeStyle = crownC;
      ctx.lineWidth = Math.max(2, s * 0.036);
      ctx.beginPath();
      ctx.arc(top + 0.02 * s, 0, 0.105 * s, 0, Math.PI * 2);
      ctx.stroke();
      const bob = hurt ? 0 : Math.sin(nowMs * 0.0032) * 0.012 * s;
      drawFocus(top + 0.02 * s, bob, gemR * 0.66);
      break;
    }
    case 'knot': {
      // A fist of rootwood; runes surface across it in sequence.
      ctx.fillStyle = crownC;
      ctx.beginPath();
      ctx.arc(top - 0.01 * s, 0, 0.088 * s, 0, Math.PI * 2);
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = shade(st.crownColor ?? st.color, 20);
        ctx.beginPath();
        ctx.arc(top - 0.035 * s, -0.03 * s, 0.036 * s, 0, Math.PI * 2);
        ctx.fill();
        // Three rune nicks lighting in order, brightening on the cast.
        ctx.strokeStyle = gem;
        ctx.lineWidth = Math.max(1.5, s * 0.022);
        for (let i = 0; i < 3; i++) {
          const on = (Math.sin(nowMs * 0.0035 - i * 1.4) + 1) / 2;
          ctx.globalAlpha = 0.5 + 0.5 * Math.max(on * on, castT);
          const rx = top - 0.05 * s + i * 0.045 * s;
          ctx.beginPath();
          ctx.moveTo(rx, 0.02 * s);
          ctx.lineTo(rx + 0.02 * s, -0.03 * s);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'branch': {
      // Barely worked at all: two twigs and one leaf that refuses to fall.
      ctx.strokeStyle = wood;
      ctx.lineWidth = Math.max(1.5, s * 0.026);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(neck, 0);
      ctx.lineTo(top + 0.05 * s, -0.035 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(top - 0.04 * s, 0);
      ctx.lineTo(top + 0.015 * s, 0.05 * s);
      ctx.stroke();
      ctx.lineCap = 'butt';
      if (!hurt) {
        ctx.fillStyle = st.crownColor ?? '#7a9a4a';
        ctx.beginPath();
        ctx.moveTo(top + 0.05 * s, -0.035 * s);
        ctx.quadraticCurveTo(top + 0.11 * s, -0.075 * s, top + 0.12 * s, -0.02 * s);
        ctx.quadraticCurveTo(top + 0.08 * s, -0.005 * s, top + 0.05 * s, -0.035 * s);
        ctx.fill();
      }
      break;
    }
    case 'wisp': {
      // No cradle at all: the light follows the staff at a polite
      // distance, bobbing on its own time. It is not attached. It is
      // ACCOMPANYING.
      const bobX = hurt ? 0 : Math.sin(nowMs * 0.0021) * 0.02 * s;
      const bobY = hurt ? 0 : Math.sin(nowMs * 0.0034) * 0.026 * s;
      drawFocus(top + 0.08 * s + bobX, -0.05 * s + bobY, gemR * 0.62);
      break;
    }
  }

  // --------------------------------------------------------------- fx
  // The living channel: cheap, deterministic, riding nowMs. All fx hang
  // around the crown; runes walk the shaft instead.
  if (!hurt && st.fx) {
    const c = st.fxColor ?? gem;
    ctx.fillStyle = c;
    const fxX = top + 0.02 * s;
    if (st.fx === 'runes') {
      // Rune lights pulsing in sequence DOWN the shaft.
      ctx.strokeStyle = c;
      ctx.lineWidth = Math.max(1, s * 0.014);
      for (let i = 0; i < 4; i++) {
        const on = (Math.sin(nowMs * 0.003 - i * 1.1) + 1) / 2;
        ctx.globalAlpha = 0.15 + 0.6 * on * on;
        const x = butt + (neck - butt) * (0.25 + i * 0.18);
        ctx.beginPath();
        ctx.moveTo(x - 0.012 * s, 0.018 * s);
        ctx.lineTo(x + 0.012 * s, -0.018 * s);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (st.fx === 'rays') {
      // Handled structurally by the sundisc; add a faint outer breath.
      ctx.globalAlpha = 0.2 + 0.14 * Math.sin(nowMs * 0.0024);
      ctx.beginPath();
      ctx.arc(fxX, 0, 0.19 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (st.fx === 'aurora') {
      // Slow ribbons: three arcs of shifted hue orbiting the crown.
      const AURORA = ['#9ae8de', '#c8b0ff', '#ffd0e8'];
      for (let i = 0; i < 3; i++) {
        const ph = nowMs * 0.0011 + (i * Math.PI * 2) / 3;
        ctx.strokeStyle = AURORA[i]!;
        ctx.globalAlpha = 0.4 + 0.25 * Math.sin(ph * 2.3);
        ctx.lineWidth = Math.max(1, s * 0.018);
        ctx.beginPath();
        ctx.arc(fxX, 0, (0.15 + 0.03 * Math.sin(ph)) * s, ph, ph + 1.6);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else {
      // Particle-dot channels share one loop; motion picks the school.
      for (let i = 0; i < 4; i++) {
        const phase = ((nowMs * 0.00042 + i * 0.31) % 1 + 1) % 1;
        let x = fxX;
        let y = 0;
        let r = Math.max(1, 0.016 * s);
        ctx.globalAlpha = 0.75 * (1 - phase * 0.6);
        switch (st.fx) {
          case 'embers': // climb past the crown, shrinking
            x += 0.05 * s + phase * 0.15 * s;
            y = Math.sin(i * 2.4) * 0.05 * s;
            r *= 1 - phase * 0.55;
            break;
          case 'frost': // sink below the crown, drifting
            x -= 0.02 * s + phase * 0.13 * s;
            y = Math.sin(phase * Math.PI * 2 + i * 2.1) * 0.05 * s;
            break;
          case 'sparks': // hard flickers, mostly off
            if (Math.sin(nowMs * 0.019 + i * 2.6) < 0.5) continue;
            x += Math.sin(i * 3.1) * 0.09 * s;
            y = Math.cos(i * 2.2) * 0.07 * s;
            break;
          case 'leaves': // drift off and sink, swaying
            x -= phase * 0.08 * s;
            y = (i % 2 === 0 ? 1 : -1) * (0.03 * s + phase * 0.08 * s) +
              Math.sin(phase * Math.PI * 3 + i) * 0.02 * s;
            break;
          case 'drip': { // beads run down the wood; blood runs UP
            const down = st.gem === '#ff6a7a' ? 1 : -1;
            x += down * (0.05 * s + phase * 0.14 * s);
            y = Math.sin(i * 2.8) * 0.05 * s;
            r *= 1 - phase * 0.4;
            break;
          }
          case 'stars': // pinpricks inside the focus, twinkling
            x += Math.sin(i * 2.51 + 0.8) * 0.045 * s;
            y = Math.cos(i * 1.73) * 0.04 * s;
            r *= 0.5 + 0.6 * Math.abs(Math.sin(nowMs * 0.0045 + i * 1.7));
            break;
          default: // motes: slow orbit around the crown
            x += Math.cos(nowMs * 0.0016 + (i * Math.PI) / 2) * 0.1 * s;
            y = Math.sin(nowMs * 0.0016 + (i * Math.PI) / 2) * 0.08 * s;
            break;
        }
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
}

// =================================================== the great school

/**
 * A greatweapon's look. Two dialects share the frame: the GREATBLADE
 * (a sword grown past apology — broad body, long two-fist grip, wide
 * cross) and the MAUL (a quarry head on a war haft). Flat like
 * everything else: base fill + one lit plane + one line; the renderer's
 * dilate rings the body, so nothing here strokes its own outline.
 */
export interface GreatStyle {
  kind: 'greatblade' | 'maul';
  /** Steel / head color. */
  color: string;
  /** Lit edge or top plane; defaults shade(+34). */
  edge?: string;
  /** The one dark line (fuller / head seam); defaults shade(−24). */
  fuller?: string;
  guardColor: string;
  grip?: string;
  pommelColor?: string;
  /** Length multiplier — 1 runs ~0.94 of a body scale, tip to pommel. */
  len?: number;
}

export const GREAT_STYLES: Record<string, GreatStyle> = {
  // The founding blade: honest iron, oak grip long enough for both
  // fists, a cross wide enough to catch a falling tree.
  iron_greatblade: {
    kind: 'greatblade', color: '#8d9299',
    guardColor: '#5a5f66', grip: '#4a3a2a', pommelColor: '#9aa2ac',
  },
  // The chase maul: quarry granite banded in iron on a dark haft.
  stonebreaker_maul: {
    kind: 'maul', color: '#7d7468', edge: '#a89e8e',
    guardColor: '#4a4554', grip: '#5b4028', len: 0.96,
  },
};

const GREAT_FALLBACKS = new Map<string, GreatStyle>();

/**
 * Resolve a greatweapon look. Registry first; unknown ids that read
 * as great steel (`greatblade`/`greatsword`/`maul`/`warhammer`) get a
 * cached color-derived fallback — degrade, never invisible. CHECK
 * GREAT FIRST: 'greatsword' also satisfies bladeStyle's '*sword'
 * fallback, so every dispatch site must ask this registry before the
 * one-hand one.
 */
export function greatStyle(itemId: string | undefined, color?: string): GreatStyle | null {
  if (!itemId) return null;
  const st = GREAT_STYLES[itemId];
  if (st) return st;
  const maul = itemId.includes('maul') || itemId.includes('warhammer');
  if (!maul && !itemId.includes('greatblade') && !itemId.includes('greatsword')) return null;
  let fb = GREAT_FALLBACKS.get(itemId);
  if (!fb) {
    fb = maul
      ? { kind: 'maul', color: color ?? '#7d7468', guardColor: '#4a4554', grip: '#5b4028' }
      : { kind: 'greatblade', color: color ?? '#8d9299', guardColor: '#5a5f66', grip: '#4a3a2a' };
    GREAT_FALLBACKS.set(itemId, fb);
  }
  return fb;
}

/**
 * Paint a greatweapon in the held-item frame (origin at the MAIN fist,
 * +x toward the tip). `grip` is the fraction of total length trailing
 * behind the fist — the rig slides it through carries and strikes the
 * way the staff does, and the long two-fist handle is the painter's
 * whole argument that this weapon owns both hands.
 */
export function drawGreatweapon(
  ctx: CanvasRenderingContext2D,
  st: GreatStyle,
  s: number,
  nowMs: number,
  hurt?: boolean,
  grip = 0.2,
): void {
  const LEN = 1.12 * s * (st.len ?? 1);
  const butt = -grip * LEN;
  const tip = (1 - grip) * LEN;
  const steel = hurt ? '#ffffff' : st.color;
  const edge = hurt ? '#ffffff' : (st.edge ?? shade(st.color, 34));
  const dark = hurt ? '#ffffff' : (st.fuller ?? shade(st.color, -24));
  const guard = hurt ? '#ffffff' : st.guardColor;
  const gripC = hurt ? '#ffffff' : (st.grip ?? '#4a3a2a');

  if (st.kind === 'maul') {
    // The war haft: butt to collar.
    const collar = tip - 0.3 * LEN;
    ctx.strokeStyle = gripC;
    ctx.lineWidth = Math.max(2.5, s * 0.055);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(butt, 0);
    ctx.lineTo(collar, 0);
    ctx.stroke();
    // Iron collar where the head takes the haft.
    ctx.fillStyle = guard;
    ctx.fillRect(collar - 0.015 * s, -0.055 * s, 0.035 * s, 0.11 * s);
    // The head: one granite block, slightly proud at the striking end.
    const h0 = 0.075 * s;
    const h1 = 0.088 * s;
    ctx.fillStyle = steel;
    ctx.beginPath();
    ctx.moveTo(collar + 0.02 * s, -h0);
    ctx.lineTo(tip, -h1);
    ctx.lineTo(tip, h1);
    ctx.lineTo(collar + 0.02 * s, h0);
    ctx.closePath();
    ctx.fill();
    // Its lit top plane (sun law: bright on −y) and the one seam.
    ctx.fillStyle = edge;
    ctx.beginPath();
    ctx.moveTo(collar + 0.02 * s, -h0);
    ctx.lineTo(tip, -h1);
    ctx.lineTo(tip, -h1 * 0.55);
    ctx.lineTo(collar + 0.02 * s, -h0 * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = Math.max(1, s * 0.014);
    ctx.beginPath();
    ctx.moveTo(collar + 0.05 * s, h0 * 0.35);
    ctx.lineTo(tip - 0.02 * s, h1 * 0.35);
    ctx.stroke();
    return;
  }

  // -------------------------------------------------- the greatblade
  const gx = butt + 0.3 * LEN; // the cross sits 30% up from the butt
  // Pommel: the counterweight both fists trust.
  ctx.fillStyle = hurt ? '#ffffff' : (st.pommelColor ?? guard);
  ctx.beginPath();
  ctx.arc(butt, 0, 0.036 * s, 0, Math.PI * 2);
  ctx.fill();
  // The two-fist grip.
  ctx.strokeStyle = gripC;
  ctx.lineWidth = Math.max(2.5, s * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(butt + 0.03 * s, 0);
  ctx.lineTo(gx - 0.01 * s, 0);
  ctx.stroke();
  // The wide cross.
  ctx.fillStyle = guard;
  ctx.fillRect(gx - 0.016 * s, -0.105 * s, 0.038 * s, 0.21 * s);
  // The blade: broad, blunt-shouldered, honest taper.
  const bw = 0.046 * s;
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.moveTo(gx + 0.02 * s, -bw);
  ctx.lineTo(tip - 0.09 * s, -bw * 0.82);
  ctx.lineTo(tip, 0);
  ctx.lineTo(tip - 0.09 * s, bw * 0.82);
  ctx.lineTo(gx + 0.02 * s, bw);
  ctx.closePath();
  ctx.fill();
  // One lit edge plane on −y (the sun law) and the one fuller line.
  ctx.fillStyle = edge;
  ctx.beginPath();
  ctx.moveTo(gx + 0.02 * s, -bw);
  ctx.lineTo(tip - 0.09 * s, -bw * 0.82);
  ctx.lineTo(tip, 0);
  ctx.lineTo(tip - 0.1 * s, -bw * 0.3);
  ctx.lineTo(gx + 0.02 * s, -bw * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1, s * 0.014);
  ctx.beginPath();
  ctx.moveTo(gx + 0.05 * s, bw * 0.22);
  ctx.lineTo(tip - 0.14 * s, bw * 0.18);
  ctx.stroke();
}
