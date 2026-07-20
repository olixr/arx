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
