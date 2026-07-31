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
  // ---- the legendary silhouettes (the ten-crowns pass): forged wide,
  // reference-grade, one story each — never handed to a metal ladder.
  | 'runeblade' // segmented ceremonial slab, stepped spear-cut tip
  | 'cloven'    // twin storm-tines split around a live gap
  | 'crystal'   // faceted shard, every plane its own light
  | 'flared'    // wide taper over swept basal flare prongs
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
  | 'coil'   // a living serpent wound over the ricasso, head toward the edge
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
  | 'gleam'  // a single glint traveling the edge
  // ---- the legendary signature words (ten-crowns law: each chase
  // blade owns ONE of these and no other blade wears it):
  | 'ripple'     // tide rings expanding off the mid-blade
  | 'drip'       // molten beads swelling on the belly, falling free
  | 'arc'        // lightning snaps the blade, re-jagged every 90ms
  | 'slither'    // one serpent-light winding the edge, tail fading
  | 'sunflare'   // a slow-turning ray star + staggered gleam winks
  | 'frostbloom' // ice spikes growing off the spine, holding, fading
  | 'petalfall'  // shed petals rocking down off the edge
  | 'orbit'      // two glints circling the blade, near-big far-dim
  | 'gravemist'; // pale wisps curling up off the steel

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
  /**
   * A living core vein down the blade's center — the one bright thing
   * on a dark blade (the riftglass law brought to one-handers). It
   * REPLACES the fuller line's read and breathes on the world clock.
   */
  core?: string;
  /** Script ticks along the spine that light in a walking sequence. */
  runes?: string;
  /** Socketed stones marching the fuller line (the molten-slab read). */
  gems?: { color: string; n?: number };
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

  // ---- THE TEN CROWNS: the legendary chase blades. Each owns one
  // animated signature word (fx / runes / gems / core) that no other
  // blade in the roster wears — the cloth-road law brought to steel.
  saltfang: {
    // The drowned duelist's saber, handed back by the tide: sea-glass
    // steel under salt-crusted gold, rings still spreading off it.
    // The core is the wet light down the spine — never dry steel.
    blade: 'saber', color: '#7fae9e', edge: '#d8f4e6', fuller: '#3d6b62', len: 1.12,
    core: '#c8f2e2',
    guard: 'swept', guardColor: '#5f8a7a', grip: '#2e4a44', wrap: '#b0a068',
    pommel: 'gem', pommelColor: '#5f8a7a', gem: '#d8f4e6', fx: 'ripple', fxColor: '#bfeedd',
  },
  brightword: {
    // The shrine slab: pale ceremonial steel forged in sections, gold
    // script reading itself down the flat, crown and claret below.
    blade: 'runeblade', color: '#dfe2ea', edge: '#ffffff', fuller: '#a8aec0', len: 1.05,
    core: '#ffd977', runes: '#ffd977',
    guard: 'crown', guardColor: '#c9a23c', gem: '#e85a3c', grip: '#5a2e34', wrap: '#c9a23c',
    pommel: 'gem', pommelColor: '#c9a23c',
  },
  cindermaw: {
    // A black leaf-slab with four live coals socketed down the spine
    // and a molten rim — it drools slag when it thinks about eating.
    blade: 'gladius', color: '#3a3234', edge: '#ff9a4c', fuller: '#241e20', len: 1.05,
    gems: { color: '#ffa040', n: 4 },
    guard: 'wing', guardColor: '#3a3234', grip: '#6a3a2a', wrap: '#8a4a30',
    pommel: 'gem', pommelColor: '#3a3234', gem: '#ffa040', fx: 'drip', fxColor: '#ffb060',
  },
  skysplinter: {
    // Twin storm-tines around a live gap; the bolt jumps the notch
    // and never draws the same path twice.
    blade: 'cloven', color: '#8fa2c4', edge: '#e6eeff', fuller: '#3c4664', len: 1.08,
    guard: 'bolt', guardColor: '#ffe66a', grip: '#2e3448', wrap: '#7a88b8',
    pommel: 'ring', pommelColor: '#ffe66a', fx: 'arc', fxColor: '#aee0ff',
  },
  vipersong: {
    // Jade fang-curve under a living coil guard; one bright serpent
    // light winds the edge, patient as the song.
    blade: 'scimitar', color: '#6faa74', edge: '#d6f2c8', fuller: '#2f5e3c', len: 1.05,
    core: '#b8e878',
    guard: 'coil', guardColor: '#3f6a48', gem: '#ffd977', grip: '#2c3a2e', wrap: '#79a355',
    pommel: 'fang', pommelColor: '#e2dcc8', fx: 'slither', fxColor: '#d0ff9a',
  },
  crownfire: {
    // The throne room's blade: royal gold on swept flares, rubies down
    // the spine, a slow sun turning at the ricasso.
    blade: 'flared', color: '#e8c04c', edge: '#fff2cc', fuller: '#b8863f', len: 1.08,
    gems: { color: '#e85a3c', n: 3 },
    guard: 'crown', guardColor: '#d9a441', gem: '#e85a3c', grip: '#6a2a3a', wrap: '#d9a441',
    pommel: 'crown', pommelColor: '#d9a441', fx: 'sunflare', fxColor: '#ffdf8a',
  },
  winterspire: {
    // A grown shard of deep winter: faceted ice-steel around a white
    // heart-line, still growing itself new edges.
    blade: 'crystal', color: '#a9c8e4', edge: '#eef8ff', fuller: '#5a7ea6', len: 1.1,
    core: '#ffffff',
    guard: 'wing', guardColor: '#6f8fb4', grip: '#2e3a4e', wrap: '#a8c8dc',
    pommel: 'gem', pommelColor: '#6f8fb4', gem: '#eef8ff', fx: 'frostbloom', fxColor: '#dff2ff',
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

  // ---- THE TEN CROWNS, rogue's third: the chase knives. Same law as
  // the sword crowns — one animated signature word each, worn alone.
  nightbloom: {
    // A single dusk petal ground to an edge; the garden sheds around
    // it and never runs out.
    blade: 'leafblade', color: '#6a5e88', edge: '#cbb8f0', fuller: '#38304a', len: 0.72,
    core: '#e79ad4',
    guard: 'thorn', guardColor: '#4a4258', grip: '#241d30', wrap: '#5a4a78',
    pommel: 'gem', pommelColor: '#4a4258', gem: '#e79ad4', fx: 'petalfall', fxColor: '#e8b4de',
  },
  rooksbeak: {
    // The Rookery's black beak in brass furniture; two coin-glints
    // circle it, counting what it's owed. A dark blade's lit edge
    // stays midtone (the riftglass bench law) so the brass reads.
    blade: 'karambit', color: '#4a505c', edge: '#b8c4d4', fuller: '#2a2d34', len: 0.6,
    guard: 'none', guardColor: '#2a2d34', grip: '#2a2d34', wrap: '#c9a23c',
    pommel: 'ring', pommelColor: '#a8842e', fx: 'orbit', fxColor: '#ffd977',
  },
  marrowlight: {
    // A needle of old bone with a grave-green heart-line; what the
    // bone remembers rises off it a little at a time.
    blade: 'stiletto', color: '#e2dcc8', edge: '#f8f4e4', fuller: '#b0a890', len: 0.72,
    core: '#b8e8a8',
    guard: 'disc', guardColor: '#b0a890', grip: '#8a8276', wrap: '#4a5a48',
    pommel: 'crescent', pommelColor: '#b8e8a8', fx: 'gravemist', fxColor: '#cff0c0',
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
  drawBlade(ctx, st, color, bx, tip, s, nowMs, hurt);

  // ---- guard last: it seats OVER the blade base and the grip.
  drawGuard(ctx, st, s, hurt);

  // ---- the living channel.
  if (!hurt && st.fx) drawBladeFx(ctx, st, bx, tip, s, nowMs);
}

/**
 * The blade's spine path — a quadratic every dress detail (core vein,
 * runes, gem sockets) rides so it follows curved silhouettes instead
 * of cutting a chord across them. Straight blades return zeros.
 */
function bladeSpine(kind: BladeKind): readonly [number, number, number] {
  switch (kind) {
    case 'saber': return [0.004, -0.014, -0.028];
    case 'scimitar': return [-0.01, -0.04, -0.072];
    case 'cutlass': return [-0.014, -0.03, -0.042];
    case 'falchion': return [-0.012, -0.016, -0.02];
    case 'talon': return [-0.012, -0.02, 0.012];
    default: return [0, 0, 0];
  }
}

function drawBlade(
  ctx: CanvasRenderingContext2D,
  st: SwordStyle,
  color: string,
  bx: number,
  tip: number,
  s: number,
  nowMs: number,
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

    // --------------------------------------- the legendary silhouettes
    case 'runeblade': {
      // A ceremonial slab forged in sections — wide flats made to carry
      // script, stepping down twice into a spear-cut point (the shrine
      // sword read). Width is the argument: no ladder blade is this bold.
      const hw = 0.054 * s;
      const t1 = tip - 0.17 * s; // first step
      const t2 = tip - 0.06 * s; // second step
      ctx.beginPath();
      ctx.moveTo(bx, -hw);
      ctx.lineTo(t1, -hw);
      ctx.lineTo(t1 + 0.022 * s, -hw * 0.62);
      ctx.lineTo(t2, -hw * 0.62);
      ctx.lineTo(tip, 0);
      ctx.lineTo(t2, hw * 0.62);
      ctx.lineTo(t1 + 0.022 * s, hw * 0.62);
      ctx.lineTo(t1, hw);
      ctx.lineTo(bx, hw);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      // Lit top plane down the whole run — one sun, one strip.
      ctx.fillStyle = edge;
      ctx.beginPath();
      ctx.moveTo(bx + 0.008 * s, -hw + 0.007 * s);
      ctx.lineTo(t1 - 0.004 * s, -hw + 0.007 * s);
      ctx.lineTo(t1 + 0.02 * s, -hw * 0.62 + 0.006 * s);
      ctx.lineTo(t2 + 0.01 * s, -hw * 0.62 + 0.006 * s);
      ctx.lineTo(tip - 0.024 * s, -0.004 * s);
      ctx.lineTo(bx + 0.008 * s, -0.004 * s);
      ctx.closePath();
      ctx.fill();
      // Forge seams: the sections the smith joined, told in two dark
      // cross-lines — never a full break (one line each, budgeted).
      ctx.strokeStyle = fuller;
      ctx.lineWidth = Math.max(1, 0.013 * s);
      for (const t of [0.34, 0.62]) {
        const x = bx + len * t;
        ctx.beginPath();
        ctx.moveTo(x + 0.008 * s, -hw * 0.82);
        ctx.lineTo(x - 0.008 * s, hw * 0.82);
        ctx.stroke();
      }
      break;
    }
    case 'cloven': {
      // Twin storm-tines split around a LIVE gap — a true fork, the
      // background showing through the middle. The gap starts just
      // past half-blade; the arc word snaps across the daylight.
      const x0 = bx + len * 0.48; // where the steel decides to disagree
      // The shared root slab.
      ctx.beginPath();
      ctx.moveTo(bx, -0.05 * s);
      ctx.lineTo(x0 + 0.03 * s, -0.055 * s);
      ctx.lineTo(x0 + 0.02 * s, 0.05 * s);
      ctx.lineTo(bx, 0.05 * s);
      ctx.closePath();
      ctx.fill();
      // Upper tine: the long one, raked skyward.
      ctx.beginPath();
      ctx.moveTo(x0, -0.055 * s);
      ctx.lineTo(tip, -0.088 * s);
      ctx.lineTo(tip - 0.03 * s, -0.038 * s);
      ctx.lineTo(x0 - 0.01 * s, -0.008 * s);
      ctx.closePath();
      ctx.fill();
      // Lower tine: shorter, leveler — the answer. It ends in a
      // POINT: a tine is a spear, never a paddle.
      ctx.beginPath();
      ctx.moveTo(x0 - 0.005 * s, 0.012 * s);
      ctx.lineTo(tip - 0.03 * s, 0.052 * s);
      ctx.lineTo(x0 - 0.01 * s, 0.052 * s);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      // Edge light on both tines' sky sides + the root.
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1, 0.015 * s);
      ctx.beginPath();
      ctx.moveTo(bx + 0.015 * s, -0.042 * s);
      ctx.lineTo(x0 + 0.015 * s, -0.046 * s);
      ctx.lineTo(tip - 0.015 * s, -0.082 * s);
      ctx.stroke();
      ctx.lineWidth = Math.max(1, 0.011 * s);
      ctx.beginPath();
      ctx.moveTo(x0 + 0.01 * s, 0.022 * s);
      ctx.lineTo(tip - 0.06 * s, 0.048 * s);
      ctx.stroke();
      // The fork's throat wears the deep plane.
      ctx.strokeStyle = fuller;
      ctx.lineWidth = Math.max(1, 0.014 * s);
      ctx.beginPath();
      ctx.moveTo(x0 + 0.02 * s, -0.03 * s);
      ctx.lineTo(x0 + 0.01 * s, 0.03 * s);
      ctx.stroke();
      break;
    }
    case 'crystal': {
      // A faceted shard: every plane owns its light. The silhouette is
      // deliberately asymmetric — grown, not forged.
      ctx.beginPath();
      ctx.moveTo(bx, -0.03 * s);
      ctx.lineTo(bx + len * 0.3, -0.06 * s);
      ctx.lineTo(bx + len * 0.72, -0.046 * s);
      ctx.lineTo(tip, 0);
      ctx.lineTo(bx + len * 0.6, 0.048 * s);
      ctx.lineTo(bx + len * 0.22, 0.054 * s);
      ctx.lineTo(bx, 0.028 * s);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      // The lit facet: one bright plane across the upper mid-run.
      ctx.fillStyle = edge;
      ctx.beginPath();
      ctx.moveTo(bx + len * 0.3, -0.052 * s);
      ctx.lineTo(bx + len * 0.72, -0.04 * s);
      ctx.lineTo(tip - 0.02 * s, -0.002 * s);
      ctx.lineTo(bx + len * 0.34, -0.008 * s);
      ctx.closePath();
      ctx.fill();
      // The deep facet below the midline — ice under ice.
      ctx.fillStyle = fuller;
      ctx.beginPath();
      ctx.moveTo(bx + len * 0.26, 0.012 * s);
      ctx.lineTo(bx + len * 0.6, 0.04 * s);
      ctx.lineTo(bx + len * 0.24, 0.046 * s);
      ctx.closePath();
      ctx.fill();
      // Facet seams: the two lines where the planes meet.
      ctx.strokeStyle = shade(st.color, -18);
      ctx.lineWidth = Math.max(1, 0.01 * s);
      ctx.beginPath();
      ctx.moveTo(bx + len * 0.3, -0.052 * s);
      ctx.lineTo(bx + len * 0.34, -0.006 * s);
      ctx.lineTo(bx + len * 0.26, 0.012 * s);
      ctx.stroke();
      break;
    }
    case 'flared': {
      // A wide royal taper standing on swept basal flares — the throne
      // room's blade. The flares paint first so the main slab seats
      // over their roots (proper overlap, never a butt joint).
      const hw = 0.048 * s;
      for (const sy of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(bx + 0.015 * s, sy * 0.02 * s);
        ctx.quadraticCurveTo(bx + 0.055 * s, sy * 0.105 * s, bx + 0.125 * s, sy * 0.115 * s);
        ctx.quadraticCurveTo(bx + 0.09 * s, sy * 0.05 * s, bx + 0.155 * s, sy * 0.028 * s);
        ctx.closePath();
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(bx, -hw);
      ctx.lineTo(tip - 0.13 * s, -hw * 0.72);
      ctx.lineTo(tip, 0);
      ctx.lineTo(tip - 0.13 * s, hw * 0.72);
      ctx.lineTo(bx, hw);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      // Flare undersides take the shade plane — two-plane metal.
      ctx.fillStyle = fuller;
      for (const sy of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(bx + 0.06 * s, sy * 0.052 * s);
        ctx.quadraticCurveTo(bx + 0.09 * s, sy * 0.088 * s, bx + 0.12 * s, sy * 0.1 * s);
        ctx.quadraticCurveTo(bx + 0.095 * s, sy * 0.062 * s, bx + 0.14 * s, sy * 0.034 * s);
        ctx.closePath();
        ctx.fill();
      }
      // Edge light along the top taper.
      ctx.fillStyle = edge;
      ctx.beginPath();
      ctx.moveTo(bx + 0.01 * s, -hw + 0.007 * s);
      ctx.lineTo(tip - 0.135 * s, -hw * 0.72 + 0.006 * s);
      ctx.lineTo(tip - 0.028 * s, -0.004 * s);
      ctx.lineTo(bx + 0.01 * s, -0.004 * s);
      ctx.closePath();
      ctx.fill();
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
  // ---- the legendary dress pass: core vein, walking runes, sockets.
  // All of it rides the blade's SPINE quadratic so curved silhouettes
  // keep their details on the steel, never on a chord through the air.
  if (!hurt && (st.core || st.runes || st.gems)) {
    const [sy0, syc, sy1] = bladeSpine(st.blade);
    const x0 = bx + 0.03 * s;
    const x1 = tip - 0.07 * s;
    const spineAt = (t: number): readonly [number, number] => {
      const u = 1 - t;
      return [
        x0 + (x1 - x0) * t,
        (u * u * sy0 + 2 * u * t * syc + t * t * sy1) * s,
      ];
    };
    if (st.core) {
      // The vein breathes on the world clock: a soft halo under a hot
      // line. It REPLACES the fuller's read — the one bright thing.
      const breath = 0.72 + 0.28 * Math.sin(nowMs * 0.0021);
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.32 * breath;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2, 0.05 * s);
      ctx.beginPath();
      ctx.moveTo(x0, sy0 * s);
      ctx.quadraticCurveTo((x0 + x1) / 2, syc * s, x1, sy1 * s);
      ctx.stroke();
      ctx.globalAlpha = breath;
      ctx.lineWidth = Math.max(1.2, 0.021 * s);
      ctx.beginPath();
      ctx.moveTo(x0, sy0 * s);
      ctx.quadraticCurveTo((x0 + x1) / 2, syc * s, x1, sy1 * s);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineCap = 'butt';
    }
    if (st.runes) {
      // Four script ticks lighting in a walking sequence — the word
      // reads itself down the blade, over and over.
      ctx.strokeStyle = st.runes;
      ctx.lineWidth = Math.max(1.2, 0.019 * s);
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const [rx, ry] = spineAt(0.18 + i * 0.2);
        const pulse = Math.max(0, Math.sin(nowMs * 0.0026 - i * 1.05));
        ctx.globalAlpha = 0.35 + 0.65 * pulse * pulse;
        ctx.beginPath();
        ctx.moveTo(rx - 0.015 * s, ry + 0.026 * s);
        ctx.lineTo(rx + 0.015 * s, ry - 0.026 * s);
        ctx.stroke();
        // A cross-stroke every other tick — script, not scratches.
        if (i % 2 === 0) {
          ctx.beginPath();
          ctx.moveTo(rx - 0.013 * s, ry - 0.016 * s);
          ctx.lineTo(rx + 0.013 * s, ry - 0.002 * s);
          ctx.stroke();
        }
        if (pulse > 0.92) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(rx, ry, Math.max(1, 0.008 * s), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.lineCap = 'butt';
    }
    if (st.gems) {
      // Socketed stones marching the spine: dark seat, hot stone, one
      // glint — worn INTO the steel, never stickered on.
      const n = st.gems.n ?? 3;
      for (let i = 0; i < n; i++) {
        const [gx, gy] = spineAt(0.16 + (i * 0.66) / Math.max(1, n - 1));
        const gr = 0.024 * s * (1 - i * 0.09);
        ctx.fillStyle = shade(st.color, -34);
        ctx.beginPath();
        ctx.moveTo(gx - gr * 1.3, gy);
        ctx.lineTo(gx, gy - gr * 1.3);
        ctx.lineTo(gx + gr * 1.3, gy);
        ctx.lineTo(gx, gy + gr * 1.3);
        ctx.closePath();
        ctx.fill();
        const hot = 0.8 + 0.2 * Math.sin(nowMs * 0.0024 + i * 1.4);
        ctx.globalAlpha = hot;
        ctx.fillStyle = st.gems.color;
        ctx.beginPath();
        ctx.moveTo(gx - gr, gy);
        ctx.lineTo(gx, gy - gr);
        ctx.lineTo(gx + gr, gy);
        ctx.lineTo(gx, gy + gr);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff8e8';
        ctx.beginPath();
        ctx.arc(gx - gr * 0.3, gy - gr * 0.35, Math.max(0.8, gr * 0.28), 0, Math.PI * 2);
        ctx.fill();
      }
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
    case 'coil': {
      // A living serpent wound TIGHT over the ricasso: three fat
      // wraps crossing the blade base like rings on a finger, each
      // with a lit back, then the head rising past the spine. Tight
      // is the law — a loose coil reads as a pretzel, not a snake.
      ctx.strokeStyle = c;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2.5, 0.032 * s);
      for (const [ox, sy] of [[0.02, 1], [0.048, -1], [0.076, 1]] as const) {
        ctx.beginPath();
        ctx.moveTo(ox * s, sy * 0.06 * s);
        ctx.quadraticCurveTo((ox + 0.016) * s, 0, ox * s, -sy * 0.06 * s);
        ctx.stroke();
      }
      if (!hurt) {
        // Each wrap's back catches the sun on its own curve.
        ctx.strokeStyle = shade(st.guardColor, 30);
        ctx.lineWidth = Math.max(1, 0.011 * s);
        for (const [ox, sy] of [[0.02, 1], [0.048, -1], [0.076, 1]] as const) {
          ctx.beginPath();
          ctx.moveTo((ox + 0.004) * s, sy * 0.045 * s);
          ctx.quadraticCurveTo((ox + 0.016) * s, 0, (ox + 0.004) * s, -sy * 0.045 * s);
          ctx.stroke();
        }
      }
      ctx.lineCap = 'butt';
      // The head rises off the last wrap, jaw toward the edge.
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(0.082 * s, -0.05 * s);
      ctx.quadraticCurveTo(0.098 * s, -0.092 * s, 0.128 * s, -0.088 * s);
      ctx.quadraticCurveTo(0.146 * s, -0.084 * s, 0.138 * s, -0.062 * s);
      ctx.lineTo(0.104 * s, -0.04 * s);
      ctx.closePath();
      ctx.fill();
      if (!hurt && st.gem) {
        ctx.fillStyle = st.gem;
        ctx.beginPath();
        ctx.arc(0.122 * s, -0.072 * s, Math.max(1, 0.01 * s), 0, Math.PI * 2);
        ctx.fill();
      }
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
  st: Pick<SwordStyle, 'fx' | 'fxColor'>,
  bx: number,
  tip: number,
  s: number,
  nowMs: number,
): void {
  const c = st.fxColor ?? '#ffffff';
  const len = tip - bx;
  // Deterministic jitter for the re-jag words — seeded on the world
  // clock, never Math.random (icons pin one frame; replays agree).
  const jag = (seed: number, k: number): number => {
    const v = Math.sin(seed * 91.7 + k * 23.31) * 43758.5453;
    return v - Math.floor(v);
  };
  switch (st.fx) {
    case 'ripple': {
      // Tide rings LYING ON the steel — flat water circles spreading
      // along the flat like rain on a still pool, never a lasso
      // around the blade (the round-1 bench verdict).
      ctx.strokeStyle = c;
      for (let i = 0; i < 3; i++) {
        const ph = (nowMs * 0.00042 + i * 0.333) % 1;
        const cx = bx + len * (0.3 + 0.24 * i);
        ctx.globalAlpha = 0.7 * (1 - ph);
        ctx.lineWidth = Math.max(1, 0.011 * s * (1 - ph * 0.4));
        ctx.beginPath();
        ctx.ellipse(cx, -0.004 * s, 0.012 * s + 0.055 * s * ph, (0.012 * s + 0.055 * s * ph) * 0.32, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Foam winks trading places along the bright edge.
      for (let i = 0; i < 2; i++) {
        const tw = Math.max(0, Math.sin(nowMs * 0.003 + i * Math.PI));
        if (tw < 0.5) continue;
        ctx.globalAlpha = tw;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(bx + len * (0.45 + 0.35 * i), -0.03 * s, Math.max(1, 0.009 * s * tw), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      return;
    }
    case 'drip': {
      // Molten beads swell on the belly, let go, and fall — heavy,
      // bright, gone. The swell is the tell; the fall is the payoff.
      ctx.fillStyle = c;
      for (let i = 0; i < 3; i++) {
        const ph = (nowMs * 0.00038 + i * 0.333) % 1;
        const x = bx + len * (0.3 + 0.24 * i);
        if (ph < 0.4) {
          const g = ph / 0.4;
          ctx.globalAlpha = 0.5 + 0.5 * g;
          ctx.beginPath();
          ctx.arc(x, 0.032 * s + 0.006 * s * g, Math.max(1, 0.013 * s * g), 0, Math.PI * 2);
          ctx.fill();
        } else {
          const f = (ph - 0.4) / 0.6;
          ctx.globalAlpha = f < 0.7 ? 1 : (1 - f) / 0.3;
          ctx.beginPath();
          ctx.arc(x + 0.01 * s * f, 0.038 * s + 0.13 * s * f * f, Math.max(1, 0.012 * s * (1 - f * 0.45)), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      return;
    }
    case 'arc': {
      // Lightning snaps the blade's run and re-jags every 90ms —
      // electricity never draws the same path twice (the plate-road
      // law brought to steel). Between snaps, a charge wink.
      const seed = Math.floor(nowMs / 90);
      const gate = Math.sin(nowMs * 0.0057);
      if (gate > -0.15) {
        // The bolt lives in the FORK: it snaps from the upper tine's
        // underside across the open gap to the lower tine, diagonal,
        // never twice the same.
        const ax = bx + len * 0.58;
        const ay = -0.038 * s;
        const bx2 = bx + len * 0.88;
        const by = 0.038 * s;
        const segs = 5;
        for (const [w, col, al] of [[0.014, c, 0.9], [0.006, '#ffffff', 0.95]] as const) {
          ctx.strokeStyle = col;
          ctx.lineWidth = Math.max(1, w * s);
          ctx.globalAlpha = al * Math.min(1, 0.4 + gate);
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          for (let k = 1; k < segs; k++) {
            const t = k / segs;
            ctx.lineTo(
              ax + (bx2 - ax) * t + (jag(seed, k + 5) - 0.5) * 0.05 * s,
              ay + (by - ay) * t + (jag(seed, k) - 0.5) * 0.05 * s,
            );
          }
          ctx.lineTo(bx2, by);
          ctx.stroke();
        }
        // The strike point flares where the bolt lands.
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(bx2, by, Math.max(1, 0.011 * s * (0.6 + 0.4 * jag(seed, 9))), 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Charge-cross wink at mid-blade while the sky reloads.
        const w = Math.max(0, -gate) * 0.02 * s;
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = c;
        ctx.fillRect(bx + len * 0.62 - w / 2, -0.002 * s - w * 2, w, w * 4);
        ctx.fillRect(bx + len * 0.62 - w * 2, -0.002 * s - w / 2, w * 4, w);
      }
      ctx.globalAlpha = 1;
      return;
    }
    case 'slither': {
      // One serpent-light winds the blade, tail fading behind it —
      // alive, patient, always moving toward the point.
      const head = (nowMs * 0.00032) % 1;
      ctx.fillStyle = c;
      for (let i = 0; i < 5; i++) {
        const t = head - i * 0.045;
        if (t < 0.04) continue;
        const x = bx + len * t;
        const y = Math.sin(t * 9.5) * 0.024 * s - 0.006 * s;
        ctx.globalAlpha = i === 0 ? 0.95 : 0.55 * (1 - i / 5);
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, 0.013 * s * (1 - i * 0.16)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      return;
    }
    case 'sunflare': {
      // A slow-turning ray star seated low on the blade, and gleam
      // winks trading places up the run — never all lit at once.
      const fx0 = bx + len * 0.3;
      const rot = nowMs * 0.00052;
      ctx.fillStyle = c;
      ctx.globalAlpha = 0.75;
      for (let k = 0; k < 4; k++) {
        const a = rot + (k * Math.PI) / 2;
        const rl = 0.075 * s * (0.85 + 0.15 * Math.sin(nowMs * 0.003 + k));
        ctx.beginPath();
        ctx.moveTo(fx0 + Math.cos(a) * rl, Math.sin(a) * rl);
        ctx.lineTo(fx0 + Math.cos(a + 2.35) * 0.016 * s, Math.sin(a + 2.35) * 0.016 * s);
        ctx.lineTo(fx0 + Math.cos(a - 2.35) * 0.016 * s, Math.sin(a - 2.35) * 0.016 * s);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff8e0';
      ctx.beginPath();
      ctx.arc(fx0, 0, Math.max(1, 0.018 * s), 0, Math.PI * 2);
      ctx.fill();
      // Two staggered winks: phase-opposed so one always rests.
      for (let i = 0; i < 2; i++) {
        const tw = Math.max(0, Math.sin(nowMs * 0.0035 + i * Math.PI));
        if (tw < 0.55) continue;
        const wx = bx + len * (0.58 + 0.22 * i);
        const wr = 0.016 * s * tw;
        ctx.globalAlpha = tw;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(wx - wr / 3, -0.018 * s - wr, wr * 0.66, wr * 2);
        ctx.fillRect(wx - wr, -0.018 * s - wr / 3, wr * 2, wr * 0.66);
      }
      ctx.globalAlpha = 1;
      return;
    }
    case 'frostbloom': {
      // Ice spikes grow off the spine, hold, and sublime away — the
      // cold keeps building the blade a new edge it never asked for.
      for (let i = 0; i < 3; i++) {
        const ph = (nowMs * 0.00028 + i * 0.37) % 1;
        const grow = Math.min(1, ph / 0.3) * (ph < 0.72 ? 1 : (1 - ph) / 0.28);
        if (grow <= 0.02) continue;
        const x = bx + len * (0.32 + 0.21 * i);
        const h = 0.055 * s * grow;
        ctx.globalAlpha = 0.85 * Math.min(1, grow * 1.5);
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(x - 0.013 * s, -0.036 * s);
        ctx.lineTo(x + 0.004 * s + 0.008 * s * i, -0.036 * s - h);
        ctx.lineTo(x + 0.014 * s, -0.036 * s);
        ctx.closePath();
        ctx.fill();
        if (grow > 0.8) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x + 0.004 * s + 0.008 * s * i, -0.036 * s - h, Math.max(0.8, 0.006 * s), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // One hanging breath of fog under the belly.
      const fp = (nowMs * 0.0004) % 1;
      ctx.globalAlpha = 0.35 * (1 - Math.abs(fp - 0.5) * 2);
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(bx + len * 0.6, 0.045 * s, Math.max(1, 0.016 * s), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }
    case 'petalfall': {
      // Petals shed off the edge and rock down, fading — the garden
      // never stops losing them and never runs out.
      ctx.fillStyle = c;
      for (let i = 0; i < 2; i++) {
        const ph = (nowMs * 0.00033 + i * 0.5) % 1;
        const x = bx + len * (0.38 + 0.28 * i) + 0.02 * s * Math.sin(ph * 5 + i * 2);
        const y = -0.012 * s + 0.11 * s * ph;
        ctx.globalAlpha = 0.85 * (1 - ph);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(0.7 * Math.sin(ph * 7 + i * 1.7));
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.max(1, 0.016 * s), Math.max(0.8, 0.008 * s), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // The bloom at the guard: a dim heart that breathes.
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(nowMs * 0.0019);
      ctx.beginPath();
      ctx.arc(bx + 0.02 * s, -0.02 * s, Math.max(1, 0.012 * s), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }
    case 'orbit': {
      // Two glints circle the blade with honest depth: near passes
      // big and lit, far passes small and dim (the fake-3D law).
      const cx = bx + len * 0.5;
      for (let i = 0; i < 2; i++) {
        const a = nowMs * 0.0012 + i * Math.PI;
        const depth = Math.sin(a);
        const x = cx + Math.cos(a) * 0.12 * s;
        const y = depth * 0.03 * s;
        ctx.globalAlpha = 0.4 + 0.6 * Math.max(0, depth);
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, 0.011 * s * (1 + 0.5 * depth)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      return;
    }
    case 'gravemist': {
      // Pale wisps curl up off the steel and thin to nothing — what
      // the bone remembers, leaving a little at a time.
      ctx.fillStyle = c;
      for (let i = 0; i < 3; i++) {
        const ph = (nowMs * 0.0003 + i * 0.333) % 1;
        const x = bx + len * (0.3 + 0.22 * i) + 0.02 * s * Math.sin(ph * 6.5 + i * 2.2);
        const y = -0.02 * s - 0.085 * s * ph;
        ctx.globalAlpha = 0.6 * (1 - ph);
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, 0.012 * s * (1 - ph * 0.4)), 0, Math.PI * 2);
        ctx.fill();
        // The curl: a smaller trailing knuckle behind the head.
        ctx.globalAlpha = 0.35 * (1 - ph);
        ctx.beginPath();
        ctx.arc(x - 0.014 * s * Math.cos(ph * 6.5 + i * 2.2), y + 0.016 * s, Math.max(0.8, 0.008 * s), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      return;
    }
    default: break;
  }
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
  | 'obsidian'  // faceted volcanic glass, lit from inside
  | 'fluted';   // channeled court metal, a gleam walking the flutes

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
  | 'wisp'      // no cradle: the focus simply follows the staff
  // ---- THE TEN VOICES: one crown per voice, no other staff wears it.
  | 'canopy'    // a living tree crown, boughs and leaf lobes, a bloom that opens
  | 'winghalo'  // spread gold wings, a halo floating free above the tip
  | 'phases'    // a silver ring, pearl heart, three moon beads orbiting
  | 'cyclone'   // stacked wind spirals turning, the focus calm in the eye
  | 'plume'     // a fan of brass quills, molten inkwell at the root
  | 'eclipse'   // a dark star, pale corona, an accretion ring feeding it
  | 'chalice'   // a garnet cup, a heart above it beating, tithe rising in
  | 'gyre'      // counter-rotating rings around a keystone, glyphs orbiting
  | 'comet'     // the focus RIDES a visible orbit track, tail streaming
  | 'crownring';// a floating gold crown, tethered to the tip by a live arc

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
  | 'aurora'  // slow ribbons of many-colored light
  // ---- THE TEN VOICES' signature channels, one owner each.
  | 'petals'    // shed petals rocking down, one firefly that blinks
  | 'glory'     // long light rays wheeling slow behind the crown
  | 'moonveil'  // sinking glints under a breathing halo of cold
  | 'gust'      // curved wind streaks whipping past the crown
  | 'flutter'   // ember flecks that climb rocking side to side
  | 'infall'    // motes spiral INWARD and are not seen again
  | 'tithe'     // beads rise up the shaft and are taken at the cup
  | 'glyphs'    // script lights orbiting the crown in walking sequence
  | 'stardust'  // twinkles strewn along the comet's path
  | 'crownarcs';// hard arcs between the crown's points, mostly waiting

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

  // ---- THE TEN VOICES: the legendary chase line. Every crown and
  // every fx word below has exactly one owner — a voice is a voice.
  wealdheart: {
    shaft: 'gnarled', color: '#5e4a30', edge: '#7e6844', metal: '#7a9a4a',
    crown: 'canopy', crownColor: '#5a7a3c', gem: '#ffd98a', gemCore: '#fff4d0',
    ferrule: false, fx: 'petals', fxColor: '#e8a8c8', len: 1.08,
  },
  firstlight: {
    shaft: 'straight', color: '#e0d4b4', edge: '#f4ecd8', metal: '#d9a441',
    crown: 'winghalo', crownColor: '#e8b84a', gem: '#ffd98a', gemCore: '#fffdf0',
    ferrule: true, fx: 'glory', fxColor: '#ffe8b0', len: 1.06,
  },
  moonwell: {
    shaft: 'iron', color: '#8a92a6', edge: '#b0b8c8', metal: '#c8d0dc',
    crown: 'phases', crownColor: '#c8d0dc', gem: '#bcd8f0', gemCore: '#f4faff',
    ferrule: true, fx: 'moonveil', fxColor: '#d8ecff', len: 1.05,
  },
  galecall: {
    shaft: 'straight', color: '#6e7a84', edge: '#94a0aa', metal: '#b87333',
    crown: 'cyclone', crownColor: '#b8c8d4', gem: '#e8f0f4', gemCore: '#ffffff',
    ferrule: true, fx: 'gust', fxColor: '#d8e8f0', len: 1.08,
  },
  firequill: {
    shaft: 'obsidian', color: '#3a3038', edge: '#584a54', metal: '#e85a2c',
    crown: 'plume', crownColor: '#c98a3f', gem: '#ff8a3c', gemCore: '#ffe8b0',
    ferrule: false, fx: 'flutter', fxColor: '#ff9a5a', len: 1.05,
  },
  hollowstar: {
    shaft: 'iron', color: '#46425a', edge: '#645e7a', metal: '#6a6480',
    crown: 'eclipse', crownColor: '#8a80c8', gem: '#241e38', gemCore: '#b8a8f0',
    ferrule: true, fx: 'infall', fxColor: '#9a8ad8', len: 1.06,
  },
  everthirst: {
    shaft: 'twisted', color: '#4a2e34', edge: '#6a444c', metal: '#8d5a64',
    crown: 'chalice', crownColor: '#7a2e38', gem: '#e84a5a', gemCore: '#ffc8d0',
    ferrule: false, fx: 'tithe', fxColor: '#e84a5a', len: 1.05,
  },
  runekey: {
    shaft: 'fluted', color: '#8a7a52', edge: '#b0a074', metal: '#9a7ae0',
    crown: 'gyre', crownColor: '#d9a441', gem: '#c8b8f0', gemCore: '#efe8ff',
    ferrule: true, fx: 'glyphs', fxColor: '#b0a0e8', len: 1.06,
  },
  driftstar: {
    shaft: 'iron', color: '#9aa2b4', edge: '#c4ccd8', metal: '#d9a441',
    crown: 'comet', crownColor: '#c8d4e0', gem: '#9ae8de', gemCore: '#ffffff',
    ferrule: false, fx: 'stardust', fxColor: '#e8f4ff', len: 1.1,
  },
  skythrone: {
    shaft: 'fluted', color: '#7a828e', edge: '#a0a8b4', metal: '#d9a441',
    crown: 'crownring', crownColor: '#e8b84a', gem: '#e8f0f4', gemCore: '#fffdf0',
    ferrule: true, fx: 'crownarcs', fxColor: '#fff0a0', len: 1.12,
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
  } else if (st.shaft === 'fluted') {
    // Court metal drawn in channels. Two flute lines split the body,
    // collars pinch the length into stations, and one gleam WALKS the
    // flutes on the clock — worked gold never sits entirely still.
    ctx.strokeStyle = wood;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(butt, 0);
    ctx.lineTo(neck, 0);
    ctx.stroke();
    if (!hurt) {
      // The flute channels: one lit, one shaded, both full-length.
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(butt + 0.04 * s, -0.018 * s);
      ctx.lineTo(neck - 0.04 * s, -0.018 * s);
      ctx.stroke();
      ctx.strokeStyle = shade(st.color, -20);
      ctx.beginPath();
      ctx.moveTo(butt + 0.04 * s, 0.016 * s);
      ctx.lineTo(neck - 0.04 * s, 0.016 * s);
      ctx.stroke();
      // Collars at the working stations.
      ctx.fillStyle = metal;
      for (const t of [0.22, 0.55, 0.86]) {
        ctx.fillRect(butt + (neck - butt) * t - 0.012 * s, -0.038 * s, 0.024 * s, 0.076 * s);
      }
      // The walking gleam: a short white slide running butt → crown.
      const gl = ((nowMs * 0.00022) % 1 + 1) % 1;
      const gx = butt + (neck - butt) * gl;
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = '#fff6dc';
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.moveTo(gx - 0.03 * s, -0.018 * s);
      ctx.lineTo(gx + 0.03 * s, -0.018 * s);
      ctx.stroke();
      ctx.globalAlpha = 1;
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

    // ================================================= THE TEN VOICES
    // The legendary crowns. Louder than the ladder's — a chase staff
    // must read across a whole room — but every mass stays inside the
    // held-item ring envelope, and every clock is nowMs-deterministic.

    case 'canopy': {
      // A living tree kept small: three boughs off the neck, two leaf
      // lobes to a bough trading the light, and at the tip a bloom
      // that opens on its own slow season. The wood never stopped
      // growing; the carver just asked it nicely.
      ctx.strokeStyle = wood;
      ctx.lineWidth = Math.max(2, s * 0.034);
      ctx.lineCap = 'round';
      const boughs: Array<[number, number]> = [
        [0.1, -0.16], [0.16, 0.14], [0.22, -0.02],
      ];
      for (const [dx, dy] of boughs) {
        ctx.beginPath();
        ctx.moveTo(neck, 0);
        ctx.quadraticCurveTo(
          neck + dx * 0.5 * s, dy * 0.8 * s,
          neck + dx * s, dy * s,
        );
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      // Leaf lobes: a dark under-mass and a lit upper lobe per bough.
      const lobe = (x: number, y: number, r: number, c: string): void => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      };
      const leafDeep = hurt ? '#ffffff' : shade(crownC, -16);
      const leafLit = hurt ? '#ffffff' : shade(crownC, 22);
      for (const [dx, dy] of boughs) {
        const bx = neck + dx * s;
        const by = dy * s;
        lobe(bx, by, 0.062 * s, hurt ? '#ffffff' : crownC);
        lobe(bx + 0.02 * s, by - 0.024 * s, 0.044 * s, leafLit);
        lobe(bx - 0.026 * s, by + 0.02 * s, 0.04 * s, leafDeep);
      }
      // The heart-glow where the boughs part: the sap remembers.
      if (!hurt) {
        ctx.globalAlpha = 0.55 + 0.25 * Math.sin(nowMs * 0.0021) + castT * 0.3;
        ctx.fillStyle = gem;
        ctx.beginPath();
        ctx.arc(neck + 0.09 * s, 0, 0.034 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // The bloom CRESTS the canopy — above every bough, first to
      // the light — opening on the slow clock, snapping wide on a
      // cast. Five petals leaning out from a bright eye.
      if (!hurt) {
        const open = Math.max((Math.sin(nowMs * 0.0009) + 1) / 2, castT);
        const bx = top + 0.2 * s;
        ctx.fillStyle = gemCore;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const reach = (0.02 + open * 0.045) * s;
          ctx.beginPath();
          ctx.ellipse(
            bx + Math.cos(a) * reach, Math.sin(a) * reach,
            0.024 * s, 0.014 * s, a, 0, Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.fillStyle = gem;
        ctx.beginPath();
        ctx.arc(bx, 0, (0.02 + open * 0.012 + castT * 0.02) * s, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawFocus(top + 0.2 * s, 0, gemR * 0.6);
      }
      break;
    }

    case 'winghalo': {
      // Two SOLID gold wings cupping the pearl — filled fans, not
      // wire — and above the tip, held by nothing, the halo. It does
      // not rest on the staff. It has simply agreed to stay.
      for (const fs of [-1, 1]) {
        // The wing: one bold filled fan sweeping up and out, then
        // two step-cuts on the trailing edge to say "feathers".
        ctx.fillStyle = hurt ? '#ffffff' : crownC;
        ctx.beginPath();
        ctx.moveTo(neck - 0.02 * s, fs * 0.016 * s);
        ctx.quadraticCurveTo(
          top - 0.02 * s, fs * 0.2 * s,
          top + 0.1 * s, fs * 0.17 * s,
        );
        // Trailing edge steps back toward the root in three bites.
        ctx.lineTo(top + 0.045 * s, fs * 0.135 * s);
        ctx.lineTo(top + 0.065 * s, fs * 0.1 * s);
        ctx.lineTo(top + 0.02 * s, fs * 0.075 * s);
        ctx.lineTo(top + 0.035 * s, fs * 0.045 * s);
        ctx.quadraticCurveTo(neck + 0.03 * s, fs * 0.02 * s, neck - 0.02 * s, fs * 0.016 * s);
        ctx.closePath();
        ctx.fill();
        if (!hurt) {
          // The lit leading edge — one sun on the up side.
          ctx.strokeStyle = shade(crownC, 32);
          ctx.lineWidth = Math.max(1.5, s * 0.02);
          ctx.beginPath();
          ctx.moveTo(neck - 0.01 * s, fs * 0.02 * s);
          ctx.quadraticCurveTo(
            top - 0.02 * s, fs * 0.185 * s,
            top + 0.09 * s, fs * 0.165 * s,
          );
          ctx.stroke();
        }
      }
      // The sun-pearl seated between the wing roots.
      drawFocus(top - 0.005 * s, 0, gemR * 0.95);
      // The halo, floating past the tip on its own small breath.
      const hx = top + 0.19 * s + (hurt ? 0 : Math.sin(nowMs * 0.0016) * 0.012 * s);
      ctx.strokeStyle = hurt ? '#ffffff' : shade(crownC, 26);
      ctx.lineWidth = Math.max(2.5, s * (0.032 + castT * 0.014));
      ctx.beginPath();
      ctx.arc(hx, 0, 0.08 * s, 0, Math.PI * 2);
      ctx.stroke();
      if (castT > 0 && !hurt) {
        ctx.globalAlpha = 0.4 * castT;
        ctx.strokeStyle = gemCore;
        ctx.lineWidth = Math.max(1, s * 0.05);
        ctx.beginPath();
        ctx.arc(hx, 0, 0.1 * s, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      break;
    }

    case 'phases': {
      // A silver ring holding the full moon, and three small moons
      // WALKING the ring — each lit on the side that faces the pearl,
      // so the crown carries its own astronomy lesson.
      const cx2 = top + 0.02 * s;
      ctx.strokeStyle = crownC;
      ctx.lineWidth = Math.max(2, s * 0.032);
      ctx.beginPath();
      ctx.arc(cx2, 0, 0.125 * s, 0, Math.PI * 2);
      ctx.stroke();
      drawFocus(cx2, 0, gemR * 0.8);
      if (!hurt) {
        for (let i = 0; i < 3; i++) {
          const a = nowMs * 0.00052 + (i * Math.PI * 2) / 3;
          const mx = cx2 + Math.cos(a) * 0.125 * s;
          const my = Math.sin(a) * 0.125 * s;
          const r = 0.026 * s;
          // Dark body first, then the lit half toward the pearl.
          ctx.fillStyle = shade(st.color, -14);
          ctx.beginPath();
          ctx.arc(mx, my, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = gemCore;
          const toPearl = Math.atan2(-my, cx2 - mx);
          ctx.beginPath();
          ctx.arc(mx, my, r, toPearl - Math.PI / 2, toPearl + Math.PI / 2);
          ctx.fill();
        }
      }
      break;
    }

    case 'cyclone': {
      // The storm kept as a pet: a CLEAN funnel of three wind rings
      // stacked up the crown, each a flattened hoop growing as it
      // climbs, turning on one patient clock — and the pearl floating
      // in the eye, untouched. The gaps in the hoops ARE the motion.
      const spin = nowMs * (0.0016 + castT * 0.003);
      ctx.lineCap = 'round';
      for (let ring = 0; ring < 3; ring++) {
        const rx = top - 0.045 * s + ring * 0.085 * s;
        const rr = (0.065 + ring * 0.045) * s;
        const a0 = spin * (ring % 2 === 0 ? 1 : -1) + ring * 1.1;
        // One bold lit arc per hoop, one dim answer behind it — a
        // hoop, not a scribble. The hoop lies WIDE across the shaft
        // (y) and thin along it (x): the funnel seen from its side.
        ctx.strokeStyle = hurt ? '#ffffff' : shade(crownC, 22);
        ctx.lineWidth = Math.max(2, s * 0.032);
        ctx.beginPath();
        ctx.ellipse(rx, 0, rr * 0.3, rr, 0, a0, a0 + 2.6);
        ctx.stroke();
        if (!hurt) {
          ctx.globalAlpha = 0.45;
          ctx.strokeStyle = crownC;
          ctx.lineWidth = Math.max(1.5, s * 0.022);
          ctx.beginPath();
          ctx.ellipse(rx, 0, rr * 0.3, rr, 0, a0 + Math.PI, a0 + Math.PI + 2.2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      ctx.lineCap = 'butt';
      const bob = hurt ? 0 : Math.sin(nowMs * 0.0026) * 0.012 * s;
      drawFocus(top + 0.04 * s, bob, gemR * 0.72);
      break;
    }

    case 'plume': {
      // A fan of five LONG brass quills rising off the inkwell — the
      // firebird paid its scribe in feathers. Tips catch fire in
      // sequence, and the whole fan spreads when the word is spoken.
      const spread = 1 + castT * 0.35;
      for (let i = 0; i < 5; i++) {
        const k = i - 2;
        const a = k * 0.42 * spread;
        const rootX = top - 0.05 * s;
        const len2 = (0.28 - Math.abs(k) * 0.05) * s;
        const tipX = rootX + Math.cos(a) * len2;
        const tipY = Math.sin(a) * len2;
        // Vane: slender bowed sides to a drawn point — a QUILL, so
        // the waist stays narrow and the length does the talking.
        ctx.fillStyle = hurt ? '#ffffff' : crownC;
        ctx.beginPath();
        ctx.moveTo(rootX, 0);
        ctx.quadraticCurveTo(
          rootX + Math.cos(a - 0.24) * len2 * 0.6, tipY * 0.5 + Math.sin(a - 0.24) * len2 * 0.55,
          tipX, tipY,
        );
        ctx.quadraticCurveTo(
          rootX + Math.cos(a + 0.24) * len2 * 0.6, tipY * 0.5 + Math.sin(a + 0.24) * len2 * 0.55,
          rootX, 0,
        );
        ctx.fill();
        if (!hurt) {
          // The spine, and the tip-coal that burns on its turn.
          ctx.strokeStyle = shade(crownC, -18);
          ctx.lineWidth = Math.max(1, s * 0.012);
          ctx.beginPath();
          ctx.moveTo(rootX, 0);
          ctx.lineTo(tipX, tipY);
          ctx.stroke();
          const on = (Math.sin(nowMs * 0.0032 - i * 1.1) + 1) / 2;
          ctx.globalAlpha = 0.4 + 0.6 * Math.max(on * on, castT);
          ctx.fillStyle = gem;
          ctx.beginPath();
          ctx.arc(tipX, tipY, 0.024 * s, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      // The inkwell: a squat brass pot with an honest open mouth —
      // the tilted-top-plane law brought to a pot of molten light.
      ctx.fillStyle = hurt ? '#ffffff' : shade(crownC, -16);
      ctx.fillRect(top - 0.115 * s, -0.05 * s, 0.07 * s, 0.1 * s);
      if (!hurt) {
        ctx.fillStyle = shade(crownC, -34);
        ctx.beginPath();
        ctx.ellipse(top - 0.045 * s, 0, 0.02 * s, 0.05 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      drawFocus(top - 0.045 * s, 0, gemR * 0.56);
      break;
    }

    case 'eclipse': {
      // A star that closed its eye. The body is finished dark; the
      // corona is the pale ring that proves it is still there; the
      // accretion ellipse tilts across, near side lit, feeding it.
      const cx2 = top + 0.04 * s;
      // Corona first — a dark crown must carry its own light to read,
      // and a legendary's corona is a STATEMENT, not a hairline.
      if (!hurt) {
        ctx.globalAlpha = Math.min(1, 0.85 + 0.15 * Math.sin(nowMs * 0.0019) + castT * 0.4);
        ctx.strokeStyle = gemCore;
        ctx.lineWidth = Math.max(2.5, s * 0.03);
        ctx.beginPath();
        ctx.arc(cx2, 0, 0.105 * s, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = hurt ? '#ffffff' : gem;
      ctx.beginPath();
      ctx.arc(cx2, 0, 0.095 * s, 0, Math.PI * 2);
      ctx.fill();
      if (!hurt) {
        // The accretion ring: a flat tilted ellipse. Dim full pass
        // first, then the lit near arc riding over the dark face.
        ctx.strokeStyle = shade(gemCore, -30);
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = Math.max(1.5, s * 0.018);
        ctx.beginPath();
        ctx.ellipse(cx2, 0, 0.175 * s, 0.06 * s, -0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = gemCore;
        ctx.lineWidth = Math.max(2, s * 0.026);
        ctx.beginPath();
        ctx.ellipse(cx2, 0, 0.175 * s, 0.06 * s, -0.5, Math.PI * 0.12, Math.PI * 0.88);
        ctx.stroke();
        // One violet glint crossing the dark face — the eye moving
        // under the lid.
        const ga = nowMs * 0.0014;
        ctx.fillStyle = gemCore;
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(nowMs * 0.005);
        ctx.beginPath();
        ctx.arc(
          cx2 + Math.cos(ga) * 0.045 * s,
          Math.sin(ga) * 0.045 * s,
          0.016 * s, 0, Math.PI * 2,
        );
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      break;
    }

    case 'chalice': {
      // The cup that is never full. Garnet bowl with an honest
      // foreshortened mouth, a stem off the neck, and above the rim a
      // heart of red glass BEATING — two thumps and a rest, the way
      // hearts actually go.
      const bx = top - 0.02 * s;
      // Stem, and a real FOOT plate — a goblet stands on furniture.
      ctx.strokeStyle = hurt ? '#ffffff' : crownC;
      ctx.lineWidth = Math.max(2, s * 0.026);
      ctx.beginPath();
      ctx.moveTo(neck - 0.02 * s, 0);
      ctx.lineTo(bx - 0.05 * s, 0);
      ctx.stroke();
      ctx.fillStyle = hurt ? '#ffffff' : crownC;
      ctx.fillRect(neck - 0.026 * s, -0.045 * s, 0.022 * s, 0.09 * s);
      // Bowl: a true goblet silhouette — narrow at the stem, flaring
      // WIDE to the lip, cut square across the mouth.
      ctx.beginPath();
      ctx.moveTo(bx - 0.05 * s, -0.022 * s);
      ctx.quadraticCurveTo(bx - 0.015 * s, -0.095 * s, bx + 0.055 * s, -0.098 * s);
      ctx.lineTo(bx + 0.055 * s, 0.098 * s);
      ctx.quadraticCurveTo(bx - 0.015 * s, 0.095 * s, bx - 0.05 * s, 0.022 * s);
      ctx.closePath();
      ctx.fill();
      // The mouth: a tilted ellipse showing the inside — the tall-
      // casework law brought to a cup. The wine glows.
      if (!hurt) {
        ctx.fillStyle = shade(st.crownColor ?? '#7a2e38', -26);
        ctx.beginPath();
        ctx.ellipse(bx + 0.055 * s, 0, 0.032 * s, 0.098 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = gem;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.ellipse(bx + 0.055 * s, 0, 0.022 * s, 0.076 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Rim light on the near lip — garnet catches the one sun.
        ctx.strokeStyle = shade(crownC, 34);
        ctx.lineWidth = Math.max(1.5, s * 0.016);
        ctx.beginPath();
        ctx.ellipse(bx + 0.055 * s, 0, 0.032 * s, 0.098 * s, 0, -Math.PI * 0.42, Math.PI * 0.42);
        ctx.stroke();
      }
      // The heart above the cup: two lobes and a point, beating on a
      // double-thump. It swells hard on a cast — the drink goes out.
      if (!hurt) {
        const tt = (nowMs % 1100) / 1100;
        const thump = tt < 0.12 ? 1 - tt / 0.12
          : tt < 0.3 ? Math.max(0, 1 - (tt - 0.18) / 0.12) * 0.7
          : 0;
        const hs = (0.048 + thump * 0.012 + castT * 0.02) * s;
        const hx = bx + 0.19 * s;
        ctx.fillStyle = gem;
        ctx.beginPath();
        ctx.moveTo(hx - hs, 0);
        ctx.quadraticCurveTo(hx - hs * 0.2, -hs * 1.05, hx + hs * 0.45, -hs * 0.55);
        ctx.quadraticCurveTo(hx + hs * 0.95, -hs * 0.1, hx + hs * 0.45, 0);
        ctx.quadraticCurveTo(hx + hs * 0.95, hs * 0.1, hx + hs * 0.45, hs * 0.55);
        ctx.quadraticCurveTo(hx - hs * 0.2, hs * 1.05, hx - hs, 0);
        ctx.fill();
        ctx.fillStyle = gemCore;
        ctx.beginPath();
        ctx.arc(hx - hs * 0.15, -hs * 0.3, hs * 0.22, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawFocus(bx + 0.19 * s, 0, gemR * 0.7);
      }
      break;
    }

    case 'gyre': {
      // The proof, drawn: two square rings counter-rotating around a
      // keystone that touches neither. Glyph satellites keep their
      // orbits outside. On a cast the rings snap into alignment — the
      // theorem, for one frame, agreeing with itself.
      const cx2 = top + 0.04 * s;
      // Rings hurry when the word is being spoken; the clock stays
      // continuous so no phase ever pops.
      const a1 = nowMs * (0.0016 + castT * 0.0024);
      const a2 = -nowMs * (0.0021 + castT * 0.0024) + 0.6;
      const ringPath = (r: number, a: number): void => {
        ctx.beginPath();
        for (let i = 0; i <= 4; i++) {
          const va = a + (i / 4) * Math.PI * 2;
          const x = cx2 + Math.cos(va) * r;
          const y = Math.sin(va) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      };
      ctx.strokeStyle = hurt ? '#ffffff' : crownC;
      ctx.lineWidth = Math.max(1.5, s * 0.024);
      ringPath(0.115 * s, a1);
      ctx.stroke();
      ctx.strokeStyle = hurt ? '#ffffff' : (st.metal ?? crownC);
      ctx.lineWidth = Math.max(1.5, s * 0.02);
      ringPath(0.085 * s, a2);
      ctx.stroke();
      drawFocus(cx2, 0, gemR * 0.6);
      if (!hurt) {
        // Three glyph satellites, lit in walking sequence.
        for (let i = 0; i < 3; i++) {
          const oa = nowMs * 0.001 + (i * Math.PI * 2) / 3;
          const gx = cx2 + Math.cos(oa) * 0.165 * s;
          const gy = Math.sin(oa) * 0.165 * s;
          const on = (Math.sin(nowMs * 0.0035 - i * 2.1) + 1) / 2;
          ctx.globalAlpha = 0.5 + 0.5 * Math.max(on * on, castT);
          ctx.strokeStyle = gem;
          ctx.lineWidth = Math.max(1, s * 0.016);
          ctx.beginPath();
          ctx.moveTo(gx - 0.016 * s, gy + 0.02 * s);
          ctx.lineTo(gx + 0.016 * s, gy - 0.02 * s);
          ctx.moveTo(gx - 0.014 * s, gy - 0.014 * s);
          ctx.lineTo(gx + 0.014 * s, gy + 0.006 * s);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      break;
    }

    case 'comet': {
      // The one visitor that agreed to stay, on the condition it
      // never has to stop moving. A silver orbit track past the tip;
      // the star rides it, tail streaming behind along the path.
      const cx2 = top + 0.07 * s;
      const ex = 0.155 * s;
      const ey = 0.1 * s;
      const tilt = -0.35;
      if (!hurt) {
        // The track is silverwork, not a suggestion — the astrolabe
        // arc the visitor agreed to.
        ctx.strokeStyle = crownC;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = Math.max(1.5, s * 0.02);
        ctx.beginPath();
        ctx.ellipse(cx2, 0, ex, ey, tilt, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // The white sun at the focus of it all, with its cross-glint.
      ctx.fillStyle = hurt ? '#ffffff' : gemCore;
      ctx.beginPath();
      ctx.arc(cx2, 0, 0.034 * s, 0, Math.PI * 2);
      ctx.fill();
      if (!hurt) {
        ctx.strokeStyle = gemCore;
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(cx2 - 0.06 * s, 0);
        ctx.lineTo(cx2 + 0.06 * s, 0);
        ctx.moveTo(cx2, -0.06 * s);
        ctx.lineTo(cx2, 0.06 * s);
        ctx.stroke();
      }
      // The rider. Speed leans harder on a cast — perihelion.
      const oa = nowMs * (0.0019 + castT * 0.0022);
      const rot = (x: number, y: number): [number, number] => [
        cx2 + x * Math.cos(tilt) - y * Math.sin(tilt),
        x * Math.sin(tilt) + y * Math.cos(tilt),
      ];
      const [sx, sy] = rot(Math.cos(oa) * ex, Math.sin(oa) * ey);
      if (!hurt) {
        // Tail: a bright arc SEGMENT swept back along the track,
        // then two cooling beads — a comet, not confetti.
        ctx.strokeStyle = gem;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = Math.max(2, s * 0.028);
        ctx.beginPath();
        ctx.ellipse(cx2, 0, ex, ey, tilt, oa - 0.85, oa - 0.12);
        ctx.stroke();
        ctx.lineCap = 'butt';
        for (let k = 1; k <= 2; k++) {
          const ta = oa - 0.95 - k * 0.3;
          const [tx2, ty2] = rot(Math.cos(ta) * ex, Math.sin(ta) * ey);
          ctx.globalAlpha = 0.5 - k * 0.18;
          ctx.fillStyle = gem;
          ctx.beginPath();
          ctx.arc(tx2, ty2, (0.02 - k * 0.005) * s, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      drawFocus(sx, sy, gemR * 0.6);
      break;
    }

    case 'crownring': {
      // Someone's crown, worn by nobody, floating above the tip with
      // a live arc holding it down like a leash. Three points and a
      // pearl in the hollow. The staff did not steal it. The weather
      // ABDICATED.
      const bob = hurt ? 0 : Math.sin(nowMs * 0.0014) * 0.014 * s;
      const cx2 = top + (0.17 + castT * 0.04) * s + bob;
      // The tether arc first, under the gold: re-jagged on the 90ms
      // law, never the same path twice, always ON during a cast.
      if (!hurt && (castT > 0 || Math.sin(nowMs * 0.013) > -0.2)) {
        const seed = Math.floor(nowMs / 90);
        const jag = (k: number): number =>
          Math.sin(seed * 12.9898 + k * 78.233) * 0.034 * s;
        ctx.strokeStyle = st.fxColor ?? gemCore;
        ctx.lineWidth = Math.max(1.5, s * 0.02);
        ctx.beginPath();
        ctx.moveTo(top - 0.01 * s, 0);
        ctx.lineTo(top + (cx2 - top) * 0.35, jag(1));
        ctx.lineTo(top + (cx2 - top) * 0.7, jag(2));
        ctx.lineTo(cx2 - 0.05 * s, jag(3) * 0.4);
        ctx.stroke();
      }
      // The pearl first, resting in the band's hollow so the gold
      // reads OVER it — a crown around a jewel, not a blob.
      drawFocus(cx2 + 0.005 * s, 0, gemR * 0.55);
      // The band: a fat gold bar across the crown's floor.
      const bandX = cx2 - 0.04 * s;
      ctx.strokeStyle = hurt ? '#ffffff' : crownC;
      ctx.lineWidth = Math.max(3, s * 0.04);
      ctx.beginPath();
      ctx.moveTo(bandX, -0.1 * s);
      ctx.lineTo(bandX, 0.1 * s);
      ctx.stroke();
      // Three SEPARATED points with ball tips — daylight between
      // them is what says "crown" across a room.
      ctx.fillStyle = hurt ? '#ffffff' : crownC;
      for (const [dy, len2] of [[-0.095, 0.07], [0, 0.115], [0.095, 0.07]] as const) {
        ctx.beginPath();
        ctx.moveTo(bandX, (dy - 0.02) * s);
        ctx.lineTo(bandX + len2 * s, dy * s);
        ctx.lineTo(bandX, (dy + 0.02) * s);
        ctx.closePath();
        ctx.fill();
        if (!hurt) {
          ctx.beginPath();
          ctx.arc(bandX + (len2 + 0.012) * s, dy * s, 0.016 * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (!hurt) {
        // One lit edge along the band — the sun agrees it is gold.
        ctx.strokeStyle = shade(crownC, 30);
        ctx.lineWidth = Math.max(1.5, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(bandX + 0.014 * s, -0.09 * s);
        ctx.lineTo(bandX + 0.014 * s, 0.09 * s);
        ctx.stroke();
      }
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
    } else if (st.fx === 'glory') {
      // Firstlight's word: three long rays wheeling slow behind the
      // crown, each fading at its own end, plus gold dust rising.
      ctx.strokeStyle = c;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a = nowMs * 0.0006 + (i * Math.PI * 2) / 3;
        const reach = (0.24 + 0.03 * Math.sin(nowMs * 0.0021 + i * 2)) * s;
        ctx.globalAlpha = 0.34 + 0.2 * Math.sin(nowMs * 0.0017 + i * 2.1) + castT * 0.3;
        ctx.lineWidth = Math.max(1.5, s * 0.02);
        ctx.beginPath();
        ctx.moveTo(fxX + Math.cos(a) * 0.1 * s, Math.sin(a) * 0.1 * s);
        ctx.lineTo(fxX + Math.cos(a) * reach, Math.sin(a) * reach);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      for (let i = 0; i < 3; i++) {
        const phase = ((nowMs * 0.00035 + i * 0.37) % 1 + 1) % 1;
        ctx.globalAlpha = 0.6 * (1 - phase);
        ctx.beginPath();
        ctx.arc(
          fxX + 0.04 * s + phase * 0.1 * s,
          Math.sin(i * 2.6) * 0.08 * s,
          Math.max(1, 0.012 * s), 0, Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (st.fx === 'glyphs') {
      // Runekey's word: script lights orbiting the crown, each
      // reading itself out in walking sequence — runes that never
      // agreed to stand still.
      ctx.strokeStyle = c;
      ctx.lineWidth = Math.max(1, s * 0.015);
      for (let i = 0; i < 4; i++) {
        const a = nowMs * 0.0008 + (i * Math.PI) / 2;
        const gx = fxX + Math.cos(a) * 0.21 * s;
        const gy = Math.sin(a) * 0.17 * s;
        const on = (Math.sin(nowMs * 0.0031 - i * 1.3) + 1) / 2;
        ctx.globalAlpha = 0.5 + 0.5 * on * on;
        ctx.beginPath();
        ctx.moveTo(gx - 0.013 * s, gy + 0.016 * s);
        ctx.lineTo(gx + 0.013 * s, gy - 0.016 * s);
        ctx.moveTo(gx - 0.01 * s, gy - 0.012 * s);
        ctx.lineTo(gx + 0.012 * s, gy + 0.004 * s);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (st.fx === 'tithe') {
      // Everthirst's word: beads gather low on the shaft and climb to
      // the cup. They do not come back down. The staff is OWED.
      for (let i = 0; i < 4; i++) {
        const phase = ((nowMs * 0.00038 + i * 0.29) % 1 + 1) % 1;
        const x = butt + (top - butt) * (0.3 + phase * 0.62);
        const y = Math.sin(phase * Math.PI * 4 + i * 2.2) * 0.028 * s;
        ctx.globalAlpha = 0.5 + 0.4 * phase; // brighter as it nears the cup
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, (0.011 + phase * 0.008) * s), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (st.fx === 'crownarcs') {
      // Skythrone's word: arcs between the crown's points, re-jagged
      // on the 90ms law, mostly waiting — lightning is a punctuation
      // mark, not a sentence.
      if (Math.sin(nowMs * 0.011) > 0.45 || castT > 0) {
        const seed = Math.floor(nowMs / 90);
        const jag = (k: number): number =>
          Math.sin(seed * 12.9898 + k * 78.233) * 0.03 * s;
        ctx.strokeStyle = c;
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(fxX + 0.2 * s, -0.075 * s);
        ctx.lineTo(fxX + 0.24 * s + jag(1) * 0.5, jag(2));
        ctx.lineTo(fxX + 0.2 * s, 0.075 * s);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    } else if (st.fx === 'petals') {
      // Wealdheart's word: shed petals rocking down off the canopy,
      // and one firefly that blinks — alive, where motes only drift.
      for (let i = 0; i < 3; i++) {
        const phase = ((nowMs * 0.0003 + i * 0.34) % 1 + 1) % 1;
        const x = fxX + 0.02 * s - phase * 0.2 * s;
        const y = Math.sin(i * 2.2) * 0.06 * s + Math.sin(phase * Math.PI * 3 + i) * 0.05 * s;
        const rock = Math.sin(phase * Math.PI * 5 + i * 1.7) * 0.7;
        ctx.globalAlpha = 0.8 * (1 - phase * 0.7);
        ctx.beginPath();
        ctx.ellipse(x, y, 0.022 * s, 0.012 * s, rock, 0, Math.PI * 2);
        ctx.fill();
      }
      const blink = Math.sin(nowMs * 0.006) > 0.72;
      if (blink) {
        ctx.fillStyle = '#f4eca0';
        ctx.beginPath();
        ctx.arc(
          fxX + Math.cos(nowMs * 0.0011) * 0.14 * s,
          Math.sin(nowMs * 0.0017) * 0.11 * s,
          Math.max(1, 0.014 * s), 0, Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (st.fx === 'gust') {
      // Galecall's word: curved wind streaks whipping past the crown,
      // each born, bent, and gone — the air showing its work.
      ctx.strokeStyle = c;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const phase = ((nowMs * 0.0008 + i * 0.33) % 1 + 1) % 1;
        const y0 = (i - 1) * 0.09 * s;
        const x0 = fxX - 0.14 * s + phase * 0.3 * s;
        ctx.globalAlpha = 0.7 * Math.sin(phase * Math.PI);
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(x0 - 0.06 * s, y0 + 0.02 * s);
        ctx.quadraticCurveTo(x0 - 0.01 * s, y0 - 0.02 * s, x0 + 0.05 * s, y0);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.globalAlpha = 1;
    } else if (st.fx === 'moonveil') {
      // Moonwell's word: a breathing halo of cold around the ring,
      // and glints sinking under it like light through deep water.
      ctx.strokeStyle = c;
      ctx.globalAlpha = 0.22 + 0.14 * Math.sin(nowMs * 0.0019) + castT * 0.25;
      ctx.lineWidth = Math.max(1.5, s * 0.02);
      ctx.beginPath();
      ctx.arc(fxX, 0, 0.19 * s, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const phase = ((nowMs * 0.00032 + i * 0.27) % 1 + 1) % 1;
        const x = fxX + 0.02 * s - phase * 0.16 * s;
        const y = Math.sin(i * 2.7) * 0.07 * s;
        const tw = 0.5 + 0.5 * Math.abs(Math.sin(nowMs * 0.004 + i * 1.9));
        ctx.globalAlpha = 0.7 * (1 - phase * 0.6) * tw;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, 0.013 * s), 0, Math.PI * 2);
        ctx.fill();
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
          case 'flutter': // ember flecks climbing, rocking side to side
            x += 0.04 * s + phase * 0.17 * s;
            y = Math.sin(phase * Math.PI * 4 + i * 1.9) * 0.055 * s;
            r *= 1 - phase * 0.5;
            break;
          case 'infall': { // spiral INWARD; taken at the rim, gone
            const a2 = nowMs * 0.002 + i * 1.57 + phase * 2.4;
            const rad = (0.2 - phase * 0.11) * s;
            x += 0.01 * s + Math.cos(a2) * rad;
            y = Math.sin(a2) * rad * 0.8;
            ctx.globalAlpha = 0.35 + 0.45 * phase; // brightest just before
            r *= 1 - phase * 0.45;
            break;
          }
          case 'stardust': { // twinkles strewn along the orbit track
            const a3 = i * 1.9 + 0.7;
            x += 0.04 * s + Math.cos(a3) * 0.15 * s;
            y = Math.sin(a3) * 0.1 * s - Math.cos(a3) * 0.05 * s;
            r *= 0.4 + 0.7 * Math.abs(Math.sin(nowMs * 0.0038 + i * 2.3));
            break;
          }
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
 * A greatweapon's look — THE ARMORY's vocabulary. Three dialects share
 * the frame: the GREATBLADE (a sword grown past apology), the
 * double-headed GREATAXE (twin bits arguing off one haft), and the
 * MAUL (a quarry head on a war haft). Like the sword roster, every
 * record is pure data over one painter vocabulary: a silhouette, a
 * guard, fittings, and an optional living fx channel. Flat like
 * everything else: each mass is a base fill + one lit plane + one
 * line; the renderer's dilate rings the body, so nothing here strokes
 * its own outline.
 */

export type GreatbladeKind =
  | 'colossus'    // the founding slab — broad, blunt-shouldered, honest
  | 'leaf'        // bronze-age waisted leaf, widest past the middle
  | 'cruciform'   // long-fullered soldier steel, clean straight taper
  | 'spire'       // slender high taper — elegance at six feet
  | 'cleaverback' // straight spine, flared belly, clipped working nose
  | 'flamberge'   // the wave edge — three bends and a point
  | 'sawback';    // broad drop-nose chopper, teeth marching the spine

export type GreataxeHead =
  | 'crescent'  // twin deep crescent bits with horns
  | 'bearded'   // squared bits with hanging heel hooks
  | 'jaws'      // tooth-rowed bite silhouettes
  | 'scrap'     // mismatched bent plates — menace by neglect
  | 'halfmoon'; // wide shallow half-moon sweeps

export type GreatGuard =
  | 'bar'    // the founding straight bar
  | 'cross'  // flared quillons with struck tips
  | 'wing'   // paired swept wings
  | 'crown'  // pronged gold court cross, flared toward the tip
  | 'thorn'  // layered swept spikes raking both ways
  | 'hook'   // one great toll-bar hook forward, a short spur back
  | 'stub';  // crude block

export type GreatPommel =
  | 'wheel' | 'ring' | 'coin' | 'star' | 'bone' | 'gem' | 'none';

export interface GreatStyle {
  kind: 'greatblade' | 'maul' | 'greataxe';
  /** Blade silhouette (greatblade dialect). Default 'colossus'. */
  blade?: GreatbladeKind;
  /** Head silhouette (greataxe dialect). Default 'crescent'. */
  head?: GreataxeHead;
  /** Maul head build. Default 'block'; 'bell' is a cast bell. */
  maul?: 'block' | 'bell';
  /** Steel / head color. */
  color: string;
  /** Lit edge or top plane; defaults shade(+34). */
  edge?: string;
  /** The one dark line (fuller / head seam); defaults shade(−24). */
  fuller?: string;
  guardColor: string;
  /** Guard build (greatblade only). Default 'bar'. */
  guard?: GreatGuard;
  grip?: string;
  /** Wrap-band accent on the long grip / haft. */
  wrap?: string;
  pommel?: GreatPommel;
  pommelColor?: string;
  /** Jewel accent (gem pommels, the seated stone between axe heads). */
  gem?: string;
  /**
   * A living core channel down the blade's center — the vein of color
   * every storied blade in the references carries. Replaces the dark
   * fuller line (still one line's worth of budget, now the loudest
   * thing on the steel).
   */
  core?: string;
  /** Script ticks marching the fuller — worked, not glowing. */
  runes?: string;
  /** Axe head-mount collar; defaults to guardColor. */
  collar?: string;
  /** Greataxe: a finishing spike past the crown. */
  spike?: boolean;
  /** Battle damage: dark bites knocked out of the working edge. */
  notched?: boolean;
  fx?: BladeFx;
  fxColor?: string;
  /** Length multiplier — 1 runs ~1.12 of a body scale, tip to pommel. */
  len?: number;
}

/**
 * THE ARMORY — the great school's roster. Twenty-two weapons, no two
 * silhouettes wearing the same clothes: the forge lines relearn the
 * shape at every metal, and every owned find answers "who held this?"
 */
export const GREAT_STYLES: Record<string, GreatStyle> = {
  // ---- the greatblade forge line.
  // The founding blade: honest iron, oak grip long enough for both
  // fists, a cross wide enough to catch a falling tree.
  iron_greatblade: {
    kind: 'greatblade', blade: 'colossus', color: '#8d9299',
    guardColor: '#5a5f66', grip: '#4a3a2a', pommel: 'wheel', pommelColor: '#9aa2ac',
  },
  // The first lesson: a leaf of poured bronze on a rope-bound grip.
  bronze_greatblade: {
    kind: 'greatblade', blade: 'leaf', color: '#b8834f', edge: '#dca56a', fuller: '#7d5432',
    guard: 'stub', guardColor: '#5b4028', grip: '#8a6a45', wrap: '#6b4a26',
    pommel: 'wheel', pommelColor: '#5b4028',
  },
  // Clean soldier steel: the long fuller is the whole ornament.
  steel_greatblade: {
    kind: 'greatblade', blade: 'cruciform', color: '#b8bec8', edge: '#e2e6ee', fuller: '#7a8090',
    guard: 'cross', guardColor: '#5a5f6a', grip: '#3a3540', wrap: '#b8bec8',
    pommel: 'wheel', pommelColor: '#5a5f6a',
  },
  // Sky-metal drawn to a spire on swept wings.
  mithril_greatblade: {
    kind: 'greatblade', blade: 'spire', color: '#8fb4e4', edge: '#d8ecff', fuller: '#4a6a9c',
    guard: 'wing', guardColor: '#3f5e8c', grip: '#2e3a4e', wrap: '#7fa8d9',
    pommel: 'gem', pommelColor: '#3f5e8c', gem: '#d8ecff',
  },
  // The smith's proof: fallen-sky violet under a star.
  starsteel_greatblade: {
    kind: 'greatblade', blade: 'spire', len: 1.04, color: '#d6cbf6', edge: '#ffffff', fuller: '#a99ad8',
    guard: 'wing', guardColor: '#7a6ab0', grip: '#3a3452', wrap: '#a99ad8',
    pommel: 'star', pommelColor: '#f4f4ff', fx: 'star', fxColor: '#f4f4ff',
  },

  // ---- the owned blades.
  // The road-crew's toll arm: working sea-iron, notched by argument,
  // the first coin it ever took let into the pommel.
  reavers_toll: {
    kind: 'greatblade', blade: 'cleaverback', color: '#6e7c92', edge: '#98a6ba', fuller: '#46505e',
    notched: true, guard: 'stub', guardColor: '#4a4554', grip: '#3a3540', wrap: '#8a6a45',
    pommel: 'coin', pommelColor: '#d9a441', gem: '#b8863f',
  },
  // Black crypt iron under a thorn cross, grave-script down the
  // fuller in old bone — buried with it, kept it anyway.
  gravewrought: {
    kind: 'greatblade', blade: 'colossus', len: 0.97, color: '#4c505e', edge: '#787e8e', fuller: '#2c3040',
    runes: '#a8a290', notched: true, guard: 'thorn', guardColor: '#343744', grip: '#2e3038',
    wrap: '#a8a290', pommel: 'ring', pommelColor: '#a8a290',
  },
  // A slab of mountain-stone steel split down the middle by the fire
  // it was quenched in; the sawback spine never stopped smoking.
  ashrender: {
    kind: 'greatblade', blade: 'sawback', color: '#574e54', edge: '#948a92', core: '#ff8a3c',
    guard: 'thorn', guardColor: '#332c32', grip: '#2e2a30', wrap: '#c4623c',
    pommel: 'star', pommelColor: '#584a52', fx: 'ember', fxColor: '#ffb060',
  },
  // Shelf ice on a crossbar, the old cold worked into the fuller in
  // script no living smith reads — colder to hold than to face.
  frostfell: {
    kind: 'greatblade', blade: 'cruciform', len: 1.03, color: '#cfe2f0', edge: '#ffffff', fuller: '#8ac4e8',
    core: '#5aa8dc', runes: '#eaf6ff', guard: 'cross', guardColor: '#7a94ac', grip: '#3a4a5c',
    wrap: '#a8c8dc', pommel: 'gem', pommelColor: '#7a94ac', gem: '#bfe4ff', fx: 'frost', fxColor: '#dff0ff',
  },
  // White steel carrying one crimson vein under a pronged gold cross;
  // the grip carries both thrones — crimson wound in moonpale.
  crowns_argument: {
    kind: 'greatblade', blade: 'cruciform', len: 1.02, color: '#dfe3ec', edge: '#ffffff', fuller: '#9aa2b4',
    core: '#c4372a', guard: 'crown', guardColor: '#d9a441', grip: '#8a2a3a', wrap: '#dfe4f0',
    pommel: 'gem', pommelColor: '#d9a441', gem: '#c4372a',
  },
  // The heirloom: white steel, the oath worked down the center in a
  // gold vein, spread gold wings — a gleam walks the edge like a kept
  // promise.
  colossus_vow: {
    kind: 'greatblade', blade: 'colossus', len: 1.06, color: '#eef0f4', edge: '#ffffff', fuller: '#c8ccd6',
    core: '#d9a441', guard: 'wing', guardColor: '#d9a441', grip: '#2e3a5c', wrap: '#d9c990',
    pommel: 'gem', pommelColor: '#b8a86a', gem: '#efe6cc', fx: 'gleam', fxColor: '#ffffff',
  },

  // ---- the greataxe forge line.
  // Two bronze crescents on an ash haft — timber first, then whatever.
  bronze_greataxe: {
    kind: 'greataxe', head: 'crescent', color: '#b8834f', edge: '#dca56a', fuller: '#7d5432',
    guardColor: '#5b4028', grip: '#8a6a45', wrap: '#6b4a26', pommel: 'none',
  },
  // Honest iron, bearded on both bits so nothing slips the hook.
  iron_greataxe: {
    kind: 'greataxe', head: 'bearded', color: '#8d9299', edge: '#b4bac2', fuller: '#565b64',
    guardColor: '#4a4554', grip: '#5b4028', pommel: 'wheel', pommelColor: '#4a4554',
  },
  // Watch-pattern steel with a brass collar and a finishing spike —
  // brass is the roster's one warm metal, spent here on purpose.
  steel_greataxe: {
    kind: 'greataxe', head: 'crescent', color: '#b8bec8', edge: '#e2e6ee', fuller: '#7a8090',
    collar: '#c9a45e', spike: true, guardColor: '#5a5f6a', grip: '#3a3540', wrap: '#c9a45e',
    pommel: 'wheel', pommelColor: '#5a5f6a',
  },
  // Deep-green adamant ground to two half-moons. It does not notch.
  adamant_greataxe: {
    kind: 'greataxe', head: 'halfmoon', color: '#6cb47a', edge: '#d2f0d0', fuller: '#2f5e3c',
    collar: '#2f5e3c', spike: true, guardColor: '#2f5e3c', grip: '#26382c', wrap: '#5fa06a',
    pommel: 'wheel', pommelColor: '#2f5e3c',
  },

  // ---- the owned axes.
  // Two stolen plow-blades bent around one haft — crude is the craft.
  gobmangler: {
    kind: 'greataxe', head: 'scrap', len: 0.92, color: '#6e7a52', edge: '#98a474', fuller: '#4a5438',
    notched: true, guardColor: '#4a3a2a', grip: '#4a3a2a', wrap: '#8a6a45', pommel: 'none',
  },
  // Rust-black tooth rows hafted in old bone — the jaws remember.
  barrowmaw: {
    kind: 'greataxe', head: 'jaws', color: '#7a7264', edge: '#a89a84', fuller: '#4a4438',
    notched: true, collar: '#a8a290', guardColor: '#5a5448', grip: '#6a6254', wrap: '#a8a290',
    pommel: 'bone', pommelColor: '#e8e2d0',
  },
  // The emberstone seated between the heads keeps the metal working.
  forgewrath: {
    kind: 'greataxe', head: 'crescent', color: '#5c5258', edge: '#8d8288', fuller: '#ff8a3c',
    collar: '#b06a30', gem: '#ff8a3c', spike: true, guardColor: '#3a3238', grip: '#2e2a30',
    wrap: '#c4623c', pommel: 'wheel', pommelColor: '#3a3238', fx: 'ember', fxColor: '#ffb060',
  },
  // Struck on the quench and sold as ruined; the buyer knew better.
  stormhewer: {
    kind: 'greataxe', head: 'halfmoon', color: '#7a8ab8', edge: '#c9d4f0', fuller: '#4a5a8a',
    collar: '#e8e06a', spike: true, guardColor: '#2e3448', grip: '#2e3448', wrap: '#e8e06a',
    pommel: 'wheel', pommelColor: '#4a5a8a', fx: 'storm', fxColor: '#fff2a0',
  },
  // The Queen's commission: moonpale half-moons in gold filigree.
  moonhewn: {
    kind: 'greataxe', head: 'halfmoon', len: 1.02, color: '#d8dce8', edge: '#ffffff', fuller: '#9aa4c0',
    collar: '#d9a441', guardColor: '#3a4a6a', grip: '#3a4a6a', wrap: '#d9a441',
    pommel: 'gem', pommelColor: '#d9a441', gem: '#dfe6f6', fx: 'gleam', fxColor: '#eef2ff',
  },
  // The heirloom: obsidian horns edged in starsteel, wisps trailing —
  // somewhere a mountain is shorter than it used to be.
  mountains_end: {
    kind: 'greataxe', head: 'crescent', len: 1.05, color: '#4e4260', edge: '#cabdf2', fuller: '#2a2333',
    collar: '#7a6ab0', spike: true, guardColor: '#332b40', grip: '#241d30', wrap: '#8a7ab8',
    pommel: 'star', pommelColor: '#f4f4ff', fx: 'void', fxColor: '#b8a8d8',
  },

  // ---- the chase maul: quarry granite banded in iron on a dark haft.
  stonebreaker_maul: {
    kind: 'maul', color: '#7d7468', edge: '#a89e8e',
    guardColor: '#4a4554', grip: '#5b4028', len: 0.96,
  },

  // ---- THE VAULT OF NAMES: the chase two-handers. Every one of these
  // is a story first and a weapon second — the details are the plot.
  // The blade that broke the toll-bar: road-iron scarred by the work,
  // a toll-lamp's amber down the middle, and the bar's own hook
  // forged into the cross. The coin in the pommel never got paid.
  tollbreaker: {
    kind: 'greatblade', blade: 'cleaverback', color: '#5e6470', edge: '#8e96a4',
    core: '#d9a441', notched: true, guard: 'hook', guardColor: '#3e4450', grip: '#33302c',
    wrap: '#d9a441', pommel: 'coin', pommelColor: '#8e96a4', gem: '#d9a441',
  },
  // Bog-iron the fen held for a hundred years and handed back lit —
  // the wave edge is the water, the green vein is whatever it learned
  // down there, and the stone in the pommel is the lantern.
  fens_lantern: {
    kind: 'greatblade', blade: 'flamberge', color: '#4e584a', edge: '#7e8e70',
    core: '#b8e068', guard: 'cross', guardColor: '#38402f', grip: '#2c3226',
    wrap: '#8a9a58', pommel: 'gem', pommelColor: '#38402f', gem: '#d8f090',
    fx: 'gleam', fxColor: '#d8f090',
  },
  // Ground from a pane of the riftgate: night-glass on a thorn cross,
  // a white seam of elsewhere down the center, constellations nobody
  // recognizes worked along the fuller. It drinks what it cuts.
  riftglass: {
    kind: 'greatblade', blade: 'spire', len: 1.05, color: '#3a3048', edge: '#6a5c8c',
    core: '#f4f4ff', runes: '#9a8cc8', guard: 'thorn', guardColor: '#3a3252',
    grip: '#241d30', wrap: '#8a7ab8', pommel: 'star', pommelColor: '#f4f4ff',
    fx: 'star', fxColor: '#e8e4ff',
  },
  // Hafted through the spine-bone of the bear that closed the North
  // road: claw-row heads in trail-brown iron, hide lashing, the
  // knuckle pommel. The hunger stayed in the steel.
  bearspine: {
    kind: 'greataxe', head: 'jaws', len: 0.98, color: '#6a5a4c', edge: '#a08a70',
    fuller: '#42382e', notched: true, collar: '#d8ceba', spike: true,
    guardColor: '#5a4a3c', grip: '#4a3a2a', wrap: '#8a6a45',
    pommel: 'bone', pommelColor: '#e8e2d0',
  },
  // The digmaster's own: granite-true bearded bits that never once
  // swung at stone, the seam's gold seated in the eye, and the tally
  // of every strike it did land scored down the haft.
  seamsplitter: {
    kind: 'greataxe', head: 'bearded', color: '#8a8478', edge: '#c2baa8',
    fuller: '#565046', runes: '#e8c04c', collar: '#c9a45e', gem: '#e8c04c',
    guardColor: '#565046', grip: '#3e3a32', wrap: '#c9a45e',
    pommel: 'wheel', pommelColor: '#565046',
  },
  // Cast from the watch-bell that rang the Toll War's last warning
  // and cracked on the peal: bell-bronze on a dark haft, verdigris
  // straps, the crack left showing. It still means to be heard.
  last_bell: {
    kind: 'maul', maul: 'bell', color: '#b08a4a', edge: '#e2c384',
    fuller: '#6a5026', guardColor: '#4a7a68', grip: '#3a342c', wrap: '#d9a441',
    pommel: 'ring', pommelColor: '#4a7a68', fx: 'storm', fxColor: '#ffe89a',
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
  // 'greataxe' exactly — a bare 'axe' substring would claim the
  // woodcutter's hatchets out of the tool rack.
  const axe = itemId.includes('greataxe');
  if (!maul && !axe && !itemId.includes('greatblade') && !itemId.includes('greatsword')) return null;
  let fb = GREAT_FALLBACKS.get(itemId);
  if (!fb) {
    fb = maul
      ? { kind: 'maul', color: color ?? '#7d7468', guardColor: '#4a4554', grip: '#5b4028' }
      : axe
        ? { kind: 'greataxe', color: color ?? '#8d9299', guardColor: '#4a4554', grip: '#5b4028' }
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
    // The war haft: butt to collar, wearing the same furniture the
    // rest of the school earns — wrap stations and a real pommel.
    const collar = tip - 0.28 * LEN;
    ctx.strokeStyle = gripC;
    ctx.lineWidth = Math.max(2.5, s * 0.058);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(butt, 0);
    ctx.lineTo(collar, 0);
    ctx.stroke();
    if (!hurt && st.wrap) {
      ctx.fillStyle = st.wrap;
      const gl = collar - butt;
      ctx.fillRect(butt + gl * 0.2, -0.028 * s, 0.018 * s, 0.056 * s);
      ctx.fillRect(butt + gl * 0.55, -0.028 * s, 0.018 * s, 0.056 * s);
    }
    drawGreatPommel(ctx, st, s, butt, hurt);
    // Iron collar where the head takes the haft.
    ctx.fillStyle = guard;
    ctx.fillRect(collar - 0.018 * s, -0.075 * s, 0.042 * s, 0.15 * s);
    if ((st.maul ?? 'block') === 'bell') {
      drawBellHead(ctx, st, s, collar, tip, steel, edge, dark, guard, hurt);
    } else {
      // The head: one QUARRY block — proud at the striking end,
      // chamfered so the mass reads carved, not sawn.
      const h0 = 0.105 * s;
      const h1 = 0.128 * s;
      const bx0 = collar + 0.024 * s;
      ctx.fillStyle = steel;
      ctx.beginPath();
      ctx.moveTo(bx0, -h0);
      ctx.lineTo(tip - 0.03 * s, -h1);
      ctx.lineTo(tip, -h1 * 0.72);
      ctx.lineTo(tip, h1 * 0.72);
      ctx.lineTo(tip - 0.03 * s, h1);
      ctx.lineTo(bx0, h0);
      ctx.closePath();
      ctx.fill();
      // Its lit top plane (sun law: bright on −y) and the one seam.
      ctx.fillStyle = edge;
      ctx.beginPath();
      ctx.moveTo(bx0, -h0);
      ctx.lineTo(tip - 0.03 * s, -h1);
      ctx.lineTo(tip, -h1 * 0.72);
      ctx.lineTo(tip - 0.005 * s, -h1 * 0.45);
      ctx.lineTo(bx0, -h0 * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = Math.max(1, s * 0.015);
      ctx.beginPath();
      ctx.moveTo(bx0 + 0.03 * s, h0 * 0.4);
      ctx.lineTo(tip - 0.03 * s, h1 * 0.38);
      ctx.stroke();
      // Twin iron straps holding the quarry stone to the haft.
      ctx.fillStyle = guard;
      ctx.fillRect(bx0 + 0.028 * s, -h0 - 0.008 * s, 0.024 * s, 2 * h0 + 0.016 * s);
      ctx.fillRect(tip - 0.062 * s, -h1 - 0.006 * s, 0.024 * s, 2 * h1 + 0.012 * s);
    }
    if (!hurt && st.fx) drawBladeFx(ctx, st, collar + 0.04 * s, tip, s, nowMs);
    return;
  }

  if (st.kind === 'greataxe') {
    drawGreataxeBody(ctx, st, s, butt, tip, steel, edge, dark, guard, gripC, hurt);
    if (!hurt && st.fx) drawBladeFx(ctx, st, butt + 0.55 * LEN, tip, s, nowMs);
    return;
  }

  // -------------------------------------------------- the greatblade
  const gx = butt + 0.3 * LEN; // the cross sits 30% up from the butt
  drawGreatPommel(ctx, st, s, butt, hurt);
  // The two-fist grip — the long handle is the school's signature.
  ctx.strokeStyle = gripC;
  ctx.lineWidth = Math.max(2.5, s * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(butt + 0.03 * s, 0);
  ctx.lineTo(gx - 0.01 * s, 0);
  ctx.stroke();
  if (!hurt && st.wrap) {
    // Two wrap bands: the fists' stations, marked.
    ctx.fillStyle = st.wrap;
    const gl = gx - butt - 0.04 * s;
    ctx.fillRect(butt + 0.03 * s + gl * 0.22, -0.028 * s, 0.018 * s, 0.056 * s);
    ctx.fillRect(butt + 0.03 * s + gl * 0.62, -0.028 * s, 0.018 * s, 0.056 * s);
  }
  drawGreatbladeSilhouette(ctx, st, s, gx, tip, steel, edge, dark, hurt);
  drawGreatGuard(ctx, st, s, gx, guard, hurt);
  if (!hurt && st.fx) drawBladeFx(ctx, st, gx + 0.1 * s, tip, s, nowMs);
}

/**
 * The greatblade silhouettes. Each is one closed mass wearing exactly
 * one lit plane on −y (the sun law) and one dark line — the FLAT law
 * measured against a sword, not against how good it could look alone.
 */
function drawGreatbladeSilhouette(
  ctx: CanvasRenderingContext2D,
  st: GreatStyle,
  s: number,
  gx: number,
  tip: number,
  steel: string,
  edge: string,
  dark: string,
  hurt?: boolean,
): void {
  const bx = gx + 0.02 * s;
  const len = tip - bx;
  ctx.fillStyle = steel;
  switch (st.blade ?? 'colossus') {
    case 'leaf': {
      // Bronze-age waist: narrow at the cross, widest past the middle.
      const bw = 0.064 * s;
      const belly = bx + len * 0.55;
      ctx.beginPath();
      ctx.moveTo(bx, -bw * 0.62);
      ctx.quadraticCurveTo(belly, -bw * 1.34, tip - 0.15 * s, -bw * 0.72);
      ctx.lineTo(tip, 0);
      ctx.lineTo(tip - 0.15 * s, bw * 0.72);
      ctx.quadraticCurveTo(belly, bw * 1.34, bx, bw * 0.62);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      ctx.fillStyle = edge;
      ctx.beginPath();
      ctx.moveTo(bx, -bw * 0.58);
      ctx.quadraticCurveTo(belly, -bw * 1.26, tip - 0.15 * s, -bw * 0.66);
      ctx.lineTo(tip - 0.05 * s, -bw * 0.1);
      ctx.quadraticCurveTo(belly, -bw * 0.5, bx, -bw * 0.2);
      ctx.closePath();
      ctx.fill();
      // The cast midrib — poured, not forged.
      if (!st.core) {
        ctx.strokeStyle = dark;
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(bx + 0.03 * s, 0.012 * s);
        ctx.lineTo(tip - 0.08 * s, 0.006 * s);
        ctx.stroke();
      }
      break;
    }
    case 'cruciform': {
      // Soldier steel gone to war: a broad straight body, then the
      // tip flares one last shoulder before the point — the spear-cut
      // silhouette every storied straight blade carries.
      const bw = 0.06 * s;
      const sh = tip - len * 0.2; // the tip-flare station
      ctx.beginPath();
      ctx.moveTo(bx, -bw);
      ctx.lineTo(sh, -bw * 0.74);
      ctx.lineTo(sh + 0.035 * s, -bw * 0.95);
      ctx.lineTo(tip, 0);
      ctx.lineTo(sh + 0.035 * s, bw * 0.95);
      ctx.lineTo(sh, bw * 0.74);
      ctx.lineTo(bx, bw);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      ctx.fillStyle = edge;
      ctx.beginPath();
      ctx.moveTo(bx, -bw);
      ctx.lineTo(sh, -bw * 0.74);
      ctx.lineTo(sh + 0.035 * s, -bw * 0.95);
      ctx.lineTo(tip, 0);
      ctx.lineTo(sh + 0.02 * s, -bw * 0.24);
      ctx.lineTo(bx, -bw * 0.3);
      ctx.closePath();
      ctx.fill();
      if (!st.core) {
        ctx.strokeStyle = dark;
        ctx.lineWidth = Math.max(1, s * 0.015);
        ctx.beginPath();
        ctx.moveTo(bx + 0.03 * s, bw * 0.2);
        ctx.lineTo(tip - 0.18 * s, bw * 0.12);
        ctx.stroke();
      }
      break;
    }
    case 'spire': {
      // Elegance at six feet: a short ricasso, then one long draw to
      // the finest point in the roster.
      const bw = 0.054 * s;
      const ric = bx + len * 0.17;
      ctx.beginPath();
      ctx.moveTo(bx, -bw);
      ctx.lineTo(ric, -bw);
      ctx.lineTo(tip, 0);
      ctx.lineTo(ric, bw);
      ctx.lineTo(bx, bw);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      ctx.fillStyle = edge;
      ctx.beginPath();
      ctx.moveTo(bx, -bw);
      ctx.lineTo(ric, -bw);
      ctx.lineTo(tip, 0);
      ctx.lineTo(ric, -bw * 0.28);
      ctx.lineTo(bx, -bw * 0.32);
      ctx.closePath();
      ctx.fill();
      if (!st.core) {
        ctx.strokeStyle = dark;
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(bx + 0.02 * s, bw * 0.24);
        ctx.lineTo(bx + len * 0.6, bw * 0.1);
        ctx.stroke();
      }
      break;
    }
    case 'cleaverback': {
      // The working blade: straight spine, a real chopping belly, a
      // nose clipped square because a point would be showing off.
      const spine = -0.05 * s;
      ctx.beginPath();
      ctx.moveTo(bx, spine);
      ctx.lineTo(tip - 0.035 * s, spine);
      ctx.lineTo(tip, 0.018 * s);
      ctx.quadraticCurveTo(bx + len * 0.62, 0.088 * s, bx, 0.05 * s);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      // The cutting edge is the BELLY — light rides the underside.
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1.2, s * 0.022);
      ctx.beginPath();
      ctx.moveTo(bx + 0.02 * s, 0.046 * s);
      ctx.quadraticCurveTo(bx + len * 0.62, 0.076 * s, tip - 0.02 * s, 0.012 * s);
      ctx.stroke();
      ctx.strokeStyle = dark;
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.moveTo(bx + 0.03 * s, spine + 0.02 * s);
      ctx.lineTo(tip - 0.08 * s, spine + 0.02 * s);
      ctx.stroke();
      break;
    }
    case 'flamberge': {
      // The wave edge: three bends a side, mirrored, dying into the
      // taper — enough flame to read at gameplay size, no more.
      const bw = 0.06 * s;
      const wl = len * 0.72; // the waves live in the lower 72%
      ctx.beginPath();
      ctx.moveTo(bx, -bw);
      for (let k = 0; k < 3; k++) {
        const x0 = bx + (wl / 3) * k;
        const x1 = bx + (wl / 3) * (k + 1);
        const w0 = bw * (1 - 0.12 * k);
        ctx.quadraticCurveTo((x0 + x1) / 2, -w0 - 0.026 * s, x1, -w0 * 0.82);
      }
      ctx.lineTo(tip, 0);
      for (let k = 2; k >= 0; k--) {
        const x0 = bx + (wl / 3) * (k + 1);
        const x1 = bx + (wl / 3) * k;
        const w0 = bw * (1 - 0.12 * k);
        if (k === 2) ctx.lineTo(x0, w0 * 0.82);
        ctx.quadraticCurveTo((x0 + x1) / 2, w0 + 0.026 * s, x1, k === 0 ? bw : bw * (1 - 0.12 * (k - 1)) * 0.82);
      }
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      // One lit crest riding the upper waves.
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1.2, s * 0.018);
      ctx.beginPath();
      ctx.moveTo(bx + 0.01 * s, -bw * 0.88);
      for (let k = 0; k < 3; k++) {
        const x0 = bx + (wl / 3) * k;
        const x1 = bx + (wl / 3) * (k + 1);
        const w0 = bw * (1 - 0.12 * k);
        ctx.quadraticCurveTo((x0 + x1) / 2, -w0 - 0.018 * s, x1, -w0 * 0.74);
      }
      ctx.stroke();
      // The unquenched seam down the middle.
      if (!st.core) {
        ctx.strokeStyle = dark;
        ctx.lineWidth = Math.max(1.2, s * 0.022);
        ctx.beginPath();
        ctx.moveTo(bx + 0.03 * s, 0);
        ctx.lineTo(tip - 0.1 * s, 0);
        ctx.stroke();
      }
      break;
    }
    case 'sawback': {
      // The mountain cleaver: a slab that WIDENS toward the working
      // nose, teeth marching the spine, the whole mass clipped on one
      // long forward diagonal — the reference-wall silhouette.
      const spine = -0.06 * s;
      const belly = 0.082 * s;
      ctx.beginPath();
      ctx.moveTo(bx, spine * 0.6);
      ctx.lineTo(bx + len * 0.16, spine);
      for (const [tp, te] of [[0.3, 0.4], [0.48, 0.58], [0.66, 0.76]] as const) {
        ctx.lineTo(bx + len * tp, spine - 0.05 * s);
        ctx.lineTo(bx + len * te, spine);
      }
      ctx.lineTo(tip - len * 0.07, spine);
      ctx.lineTo(tip, belly * 0.3); // the angled working nose
      ctx.quadraticCurveTo(bx + len * 0.55, belly * 1.18, bx, belly * 0.6);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      // Stone rim along the spine plane — the sun still finds it.
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1.2, s * 0.018);
      ctx.beginPath();
      ctx.moveTo(bx + len * 0.16, spine + 0.014 * s);
      ctx.lineTo(tip - len * 0.09, spine + 0.014 * s);
      ctx.stroke();
      break;
    }
    default: {
      // 'colossus' — the founding slab, finally slab-wide: broad,
      // blunt-shouldered, honest taper.
      const bw = 0.074 * s;
      ctx.beginPath();
      ctx.moveTo(bx, -bw);
      ctx.lineTo(tip - 0.1 * s, -bw * 0.8);
      ctx.lineTo(tip, 0);
      ctx.lineTo(tip - 0.1 * s, bw * 0.8);
      ctx.lineTo(bx, bw);
      ctx.closePath();
      ctx.fill();
      if (hurt) return;
      ctx.fillStyle = edge;
      ctx.beginPath();
      ctx.moveTo(bx, -bw);
      ctx.lineTo(tip - 0.1 * s, -bw * 0.8);
      ctx.lineTo(tip, 0);
      ctx.lineTo(tip - 0.11 * s, -bw * 0.28);
      ctx.lineTo(bx, -bw * 0.32);
      ctx.closePath();
      ctx.fill();
      if (!st.core) {
        ctx.strokeStyle = dark;
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(gx + 0.05 * s, bw * 0.22);
        ctx.lineTo(tip - 0.15 * s, bw * 0.18);
        ctx.stroke();
      }
      break;
    }
  }
  // The living core: one bright vein down the center — it spends the
  // dark line's budget and carries the whole blade's story.
  if (!hurt && st.core) {
    const saw = st.blade === 'sawback';
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.6, s * (saw ? 0.034 : 0.024));
    ctx.lineCap = 'round';
    const cy = saw ? 0.008 * s : 0;
    ctx.beginPath();
    ctx.moveTo(bx + 0.045 * s, cy);
    ctx.lineTo(tip - (saw ? 0.1 : 0.16) * s, cy * 0.5);
    ctx.stroke();
  }
  // Script ticks marching the fuller — worked into the steel.
  if (!hurt && st.runes) {
    ctx.strokeStyle = st.runes;
    ctx.lineWidth = Math.max(1, s * 0.013);
    ctx.lineCap = 'butt';
    const rh = [1, 0.65, 0.85, 0.7] as const;
    for (let i = 0; i < 4; i++) {
      const x = bx + len * (0.14 + i * 0.13);
      const h = 0.024 * s * (rh[i] ?? 1);
      ctx.beginPath();
      ctx.moveTo(x, -h);
      ctx.lineTo(x + 0.014 * s, h);
      ctx.stroke();
    }
  }
  // Battle bites out of the working edge — owned steel wears its life.
  if (!hurt && st.notched) {
    ctx.fillStyle = shade(st.color, -52);
    const edgeY = st.blade === 'cleaverback' ? 0.072 * s : 0.058 * s;
    for (const [t, sy, d] of [[0.3, 1, 1], [0.62, 1, 0.7], [0.46, -1, 0.75]] as const) {
      const nx = bx + len * t;
      const ny = sy * (st.blade === 'cleaverback' && sy < 0 ? 0.042 * s : edgeY);
      ctx.beginPath();
      ctx.moveTo(nx - 0.024 * s, ny);
      ctx.lineTo(nx + 0.024 * s, ny);
      ctx.lineTo(nx, ny - sy * 0.036 * s * d);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/** The greatblade guards: one bar's worth of build, five builds. */
function drawGreatGuard(
  ctx: CanvasRenderingContext2D,
  st: GreatStyle,
  s: number,
  gx: number,
  guard: string,
  hurt?: boolean,
): void {
  ctx.fillStyle = guard;
  switch (st.guard ?? 'bar') {
    case 'stub':
      ctx.fillRect(gx - 0.02 * s, -0.078 * s, 0.046 * s, 0.156 * s);
      break;
    case 'cross': {
      // Flared quillons: a real bar, swelling hard at both tips.
      ctx.fillRect(gx - 0.015 * s, -0.125 * s, 0.036 * s, 0.25 * s);
      ctx.fillRect(gx - 0.026 * s, -0.145 * s, 0.058 * s, 0.032 * s);
      ctx.fillRect(gx - 0.026 * s, 0.113 * s, 0.058 * s, 0.032 * s);
      if (!hurt) {
        // The struck tips catch the light.
        ctx.fillStyle = shade(guard, 32);
        ctx.fillRect(gx - 0.026 * s, -0.145 * s, 0.058 * s, 0.012 * s);
      }
      break;
    }
    case 'wing': {
      // Spread wings: three fingers a side fanned off the boss, the
      // tallest near-square to the blade — the paladin's gold.
      for (const m of [-1, 1] as const) {
        for (const [fx, fy, fw] of [
          [0.03, 0.17, 0.032],
          [0.075, 0.13, 0.03],
          [0.112, 0.082, 0.028],
        ] as const) {
          ctx.beginPath();
          ctx.moveTo(gx - 0.012 * s, m * 0.028 * s);
          ctx.lineTo(gx + fx * s, m * fy * s);
          ctx.lineTo(gx + (fx + fw) * s, m * fy * 0.66 * s);
          ctx.closePath();
          ctx.fill();
        }
      }
      // The boss between the wings.
      ctx.fillRect(gx - 0.02 * s, -0.055 * s, 0.05 * s, 0.11 * s);
      if (!hurt) {
        ctx.fillStyle = shade(guard, 30);
        ctx.fillRect(gx - 0.02 * s, -0.055 * s, 0.05 * s, 0.02 * s);
      }
      break;
    }
    case 'crown': {
      // The court's cross: a gold bar throwing swept horn prongs
      // toward the blade, and a center point riding the spine.
      ctx.fillRect(gx - 0.018 * s, -0.13 * s, 0.04 * s, 0.26 * s);
      for (const m of [-1, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(gx - 0.006 * s, m * 0.095 * s);
        ctx.lineTo(gx + 0.105 * s, m * 0.172 * s);
        ctx.lineTo(gx + 0.026 * s, m * 0.082 * s);
        ctx.closePath();
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(gx + 0.018 * s, -0.032 * s);
      ctx.lineTo(gx + 0.105 * s, 0);
      ctx.lineTo(gx + 0.018 * s, 0.032 * s);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = shade(guard, 30);
        ctx.fillRect(gx - 0.018 * s, -0.13 * s, 0.04 * s, 0.014 * s);
      }
      break;
    }
    case 'hook': {
      // The toll-bar's own hook, forged into the cross: one great
      // curl rising over the spine toward the tip, a short spur
      // raked back beneath — the shape that held the road shut.
      ctx.fillRect(gx - 0.018 * s, -0.1 * s, 0.042 * s, 0.2 * s);
      ctx.beginPath();
      ctx.moveTo(gx - 0.01 * s, -0.088 * s);
      ctx.quadraticCurveTo(gx + 0.02 * s, -0.19 * s, gx + 0.118 * s, -0.168 * s);
      ctx.quadraticCurveTo(gx + 0.062 * s, -0.152 * s, gx + 0.036 * s, -0.118 * s);
      ctx.lineTo(gx + 0.022 * s, -0.078 * s);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(gx - 0.006 * s, 0.072 * s);
      ctx.lineTo(gx - 0.078 * s, 0.128 * s);
      ctx.lineTo(gx - 0.026 * s, 0.056 * s);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = shade(guard, 30);
        ctx.fillRect(gx - 0.018 * s, -0.1 * s, 0.042 * s, 0.013 * s);
      }
      break;
    }
    case 'thorn': {
      // Layered swept spikes raking both ways — the dark court's iron.
      for (const m of [-1, 1] as const) {
        // The long fore-thorn toward the blade.
        ctx.beginPath();
        ctx.moveTo(gx - 0.012 * s, m * 0.04 * s);
        ctx.lineTo(gx + 0.118 * s, m * 0.148 * s);
        ctx.lineTo(gx + 0.022 * s, m * 0.052 * s);
        ctx.closePath();
        ctx.fill();
        // The tall outer thorn, near-vertical.
        ctx.beginPath();
        ctx.moveTo(gx - 0.024 * s, m * 0.03 * s);
        ctx.lineTo(gx + 0.018 * s, m * 0.185 * s);
        ctx.lineTo(gx + 0.014 * s, m * 0.042 * s);
        ctx.closePath();
        ctx.fill();
        // The back-raked barb toward the pommel.
        ctx.beginPath();
        ctx.moveTo(gx - 0.008 * s, m * 0.048 * s);
        ctx.lineTo(gx - 0.088 * s, m * 0.122 * s);
        ctx.lineTo(gx - 0.028 * s, m * 0.034 * s);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillRect(gx - 0.02 * s, -0.058 * s, 0.046 * s, 0.116 * s);
      break;
    }
    default:
      // 'bar' — the founding wide cross, now built like one.
      ctx.fillRect(gx - 0.018 * s, -0.13 * s, 0.044 * s, 0.26 * s);
      break;
  }
}

/** The pommel rack: the counterweight both fists trust, seven ways. */
function drawGreatPommel(
  ctx: CanvasRenderingContext2D,
  st: GreatStyle,
  s: number,
  butt: number,
  hurt?: boolean,
): void {
  const kind = st.pommel ?? 'wheel';
  if (kind === 'none') return;
  const col = hurt ? '#ffffff' : (st.pommelColor ?? st.guardColor);
  ctx.fillStyle = col;
  switch (kind) {
    case 'ring': {
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(1.6, s * 0.024);
      ctx.beginPath();
      ctx.arc(butt, 0, 0.032 * s, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'coin': {
      // The first toll, let into the steel.
      ctx.beginPath();
      ctx.arc(butt, 0, 0.038 * s, 0, Math.PI * 2);
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = st.gem ?? shade(col, -30);
        ctx.beginPath();
        ctx.arc(butt, 0, 0.02 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'star': {
      const r = 0.05 * s;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const rr = i % 2 === 0 ? r : r * 0.42;
        ctx.lineTo(butt + Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'bone': {
      // A knuckle end: two lobes of old bone.
      ctx.beginPath();
      ctx.arc(butt - 0.012 * s, -0.018 * s, 0.026 * s, 0, Math.PI * 2);
      ctx.arc(butt - 0.012 * s, 0.018 * s, 0.026 * s, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'gem': {
      ctx.beginPath();
      ctx.arc(butt, 0, 0.036 * s, 0, Math.PI * 2);
      ctx.fill();
      if (!hurt && st.gem) {
        ctx.fillStyle = st.gem;
        ctx.beginPath();
        ctx.arc(butt, 0, 0.019 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    default:
      // 'wheel' — the founding disc.
      ctx.beginPath();
      ctx.arc(butt, 0, 0.036 * s, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
}

/**
 * The bell maul head: a cast bell lying along the haft, mouth toward
 * the strike. Bronze body flaring from crown to lip, a verdigris
 * crown strap, one gold waist band — and the crack it took on its
 * last peal, left showing (the one dark line, spent on the story).
 */
function drawBellHead(
  ctx: CanvasRenderingContext2D,
  st: GreatStyle,
  s: number,
  collar: number,
  tip: number,
  steel: string,
  edge: string,
  dark: string,
  guard: string,
  hurt?: boolean,
): void {
  const x0 = collar + 0.02 * s; // the crown end
  const mouth = tip - 0.012 * s;
  const span = mouth - x0;
  // The bell body: concave shoulders swelling to the mouth.
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.moveTo(x0, -0.064 * s);
  ctx.quadraticCurveTo(x0 + span * 0.55, -0.068 * s, mouth - 0.038 * s, -0.104 * s);
  ctx.quadraticCurveTo(mouth - 0.012 * s, -0.124 * s, mouth, -0.14 * s);
  ctx.lineTo(mouth, 0.14 * s);
  ctx.quadraticCurveTo(mouth - 0.012 * s, 0.124 * s, mouth - 0.038 * s, 0.104 * s);
  ctx.quadraticCurveTo(x0 + span * 0.55, 0.068 * s, x0, 0.064 * s);
  ctx.closePath();
  ctx.fill();
  // The mouth lip, proud of the body.
  ctx.fillRect(mouth - 0.006 * s, -0.15 * s, 0.024 * s, 0.3 * s);
  if (hurt) return;
  // Lit top plane along the upper profile (sun law).
  ctx.fillStyle = edge;
  ctx.beginPath();
  ctx.moveTo(x0, -0.064 * s);
  ctx.quadraticCurveTo(x0 + span * 0.55, -0.068 * s, mouth - 0.038 * s, -0.104 * s);
  ctx.quadraticCurveTo(mouth - 0.012 * s, -0.124 * s, mouth, -0.14 * s);
  ctx.lineTo(mouth, -0.096 * s);
  ctx.quadraticCurveTo(mouth - 0.05 * s, -0.062 * s, x0, -0.032 * s);
  ctx.closePath();
  ctx.fill();
  // The verdigris crown strap and the gold waist band.
  ctx.fillStyle = guard;
  ctx.fillRect(x0 - 0.004 * s, -0.072 * s, 0.024 * s, 0.144 * s);
  if (st.wrap) {
    ctx.fillStyle = st.wrap;
    ctx.fillRect(x0 + span * 0.58, -0.093 * s, 0.016 * s, 0.186 * s);
  }
  // THE CRACK: jagged from the lip toward the waist. It rang anyway.
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1.2, s * 0.016);
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  ctx.moveTo(mouth + 0.004 * s, 0.062 * s);
  ctx.lineTo(mouth - 0.045 * s, 0.048 * s);
  ctx.lineTo(mouth - 0.07 * s, 0.066 * s);
  ctx.lineTo(mouth - 0.105 * s, 0.04 * s);
  ctx.stroke();
}

/**
 * The double-headed greataxe: a war haft with twin mirrored bits at
 * the crown. The upper bit (−y) wears the lit strip — the sun law —
 * and the lower bit runs a shade darker so the two read as planes of
 * one head, not a butterfly. Head shapes carry the identity.
 */
function drawGreataxeBody(
  ctx: CanvasRenderingContext2D,
  st: GreatStyle,
  s: number,
  butt: number,
  tip: number,
  steel: string,
  edge: string,
  dark: string,
  guard: string,
  gripC: string,
  hurt?: boolean,
): void {
  const L = tip - butt;
  const hx = tip - 0.14 * L; // head mount center
  const collar = hurt ? '#ffffff' : (st.collar ?? guard);
  // The haft: butt through the crown.
  ctx.strokeStyle = gripC;
  ctx.lineWidth = Math.max(2.5, s * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(butt, 0);
  ctx.lineTo(tip - (st.spike ? 0.05 : 0.02) * L, 0);
  ctx.stroke();
  if (!hurt && st.wrap) {
    ctx.fillStyle = st.wrap;
    const gl = hx - 0.1 * L - butt;
    ctx.fillRect(butt + gl * 0.18, -0.028 * s, 0.018 * s, 0.056 * s);
    ctx.fillRect(butt + gl * 0.52, -0.028 * s, 0.018 * s, 0.056 * s);
  }
  // Tally marks scored down the haft — four strokes and the fifth
  // crossing them, the count of strikes the owner cared to keep.
  if (!hurt && st.runes) {
    ctx.strokeStyle = st.runes;
    ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.lineCap = 'butt';
    const gl = hx - 0.12 * L - butt;
    for (let i = 0; i < 4; i++) {
      const x = butt + gl * (0.62 + i * 0.07);
      ctx.beginPath();
      ctx.moveTo(x, -0.022 * s);
      ctx.lineTo(x + 0.006 * s, 0.022 * s);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(butt + gl * 0.6, 0.018 * s);
    ctx.lineTo(butt + gl * 0.85, -0.018 * s);
    ctx.stroke();
  }
  drawGreatPommel(ctx, st, s, butt, hurt);

  // The heads, mirrored across the haft.
  drawAxeBit(ctx, st, s, hx, -1, steel, edge, dark, hurt);
  drawAxeBit(ctx, st, s, hx, 1, hurt ? '#ffffff' : shade(st.color, -12), edge, dark, hurt);

  // The mount collar seats OVER the cheeks — the heads hang from it.
  ctx.fillStyle = collar;
  ctx.fillRect(hx - 0.04 * s, -0.064 * s, 0.08 * s, 0.128 * s);
  if (!hurt && st.gem) {
    // The seated stone between the heads.
    ctx.fillStyle = st.gem;
    ctx.beginPath();
    ctx.arc(hx, 0, 0.028 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  // The finishing spike past the crown.
  if (st.spike) {
    ctx.fillStyle = hurt ? '#ffffff' : steel;
    ctx.beginPath();
    ctx.moveTo(tip - 0.09 * L, -0.032 * s);
    ctx.lineTo(tip + 0.015 * L, 0);
    ctx.lineTo(tip - 0.09 * L, 0.032 * s);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * One axe bit. `side` −1 paints the upper (−y, lit) head, +1 the
 * lower. Shapes are authored for the upper head and mirrored by
 * multiplying every y — the two bits are the same forging.
 */
function drawAxeBit(
  ctx: CanvasRenderingContext2D,
  st: GreatStyle,
  s: number,
  hx: number,
  side: -1 | 1,
  fill: string,
  edge: string,
  dark: string,
  hurt?: boolean,
): void {
  const m = side;
  const head = st.head ?? 'crescent';
  ctx.fillStyle = fill;
  switch (head) {
    case 'bearded': {
      // Squared bit; the heel drops a hanging hook toward the butt.
      ctx.beginPath();
      ctx.moveTo(hx + 0.06 * s, m * -0.048 * s);
      ctx.lineTo(hx + 0.118 * s, m * -0.212 * s);
      ctx.lineTo(hx - 0.105 * s, m * -0.228 * s);
      ctx.lineTo(hx - 0.15 * s, m * -0.085 * s);
      ctx.lineTo(hx - 0.078 * s, m * -0.135 * s);
      ctx.lineTo(hx - 0.06 * s, m * -0.048 * s);
      ctx.closePath();
      ctx.fill();
      if (hurt || m > 0) break;
      ctx.fillStyle = edge;
      ctx.beginPath();
      ctx.moveTo(hx + 0.118 * s, -0.212 * s);
      ctx.lineTo(hx - 0.105 * s, -0.228 * s);
      ctx.lineTo(hx - 0.094 * s, -0.182 * s);
      ctx.lineTo(hx + 0.104 * s, -0.168 * s);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'jaws': {
      // The bite: the working edge is a marching row of teeth.
      ctx.beginPath();
      ctx.moveTo(hx + 0.068 * s, m * -0.048 * s);
      ctx.lineTo(hx + 0.125 * s, m * -0.215 * s);
      ctx.lineTo(hx + 0.072 * s, m * -0.17 * s);
      ctx.lineTo(hx + 0.03 * s, m * -0.232 * s);
      ctx.lineTo(hx - 0.012 * s, m * -0.17 * s);
      ctx.lineTo(hx - 0.058 * s, m * -0.225 * s);
      ctx.lineTo(hx - 0.115 * s, m * -0.212 * s);
      ctx.lineTo(hx - 0.065 * s, m * -0.048 * s);
      ctx.closePath();
      ctx.fill();
      if (hurt || m > 0) break;
      ctx.fillStyle = edge;
      ctx.beginPath();
      ctx.moveTo(hx + 0.125 * s, -0.215 * s);
      ctx.lineTo(hx + 0.072 * s, -0.17 * s);
      ctx.lineTo(hx + 0.03 * s, -0.232 * s);
      ctx.lineTo(hx + 0.036 * s, -0.185 * s);
      ctx.lineTo(hx + 0.068 * s, -0.14 * s);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'scrap': {
      // Mismatched plates: the upper bit is a bent trapezoid, the
      // lower a smaller tilted shear — no two swings land the same.
      if (m < 0) {
        ctx.beginPath();
        ctx.moveTo(hx + 0.07 * s, -0.048 * s);
        ctx.lineTo(hx + 0.128 * s, -0.182 * s);
        ctx.lineTo(hx + 0.026 * s, -0.235 * s);
        ctx.lineTo(hx - 0.102 * s, -0.192 * s);
        ctx.lineTo(hx - 0.06 * s, -0.048 * s);
        ctx.closePath();
        ctx.fill();
        if (!hurt) {
          ctx.fillStyle = edge;
          ctx.beginPath();
          ctx.moveTo(hx + 0.128 * s, -0.182 * s);
          ctx.lineTo(hx + 0.026 * s, -0.235 * s);
          ctx.lineTo(hx + 0.006 * s, -0.19 * s);
          ctx.lineTo(hx + 0.105 * s, -0.148 * s);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(hx + 0.055 * s, 0.048 * s);
        ctx.lineTo(hx + 0.082 * s, 0.172 * s);
        ctx.lineTo(hx - 0.082 * s, 0.205 * s);
        ctx.lineTo(hx - 0.075 * s, 0.048 * s);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'halfmoon': {
      // One wide shallow sweep — the whole bit is edge — on a narrow
      // taper of a cheek (a slab cheek made a T; bench verdict).
      ctx.beginPath();
      ctx.moveTo(hx - 0.04 * s, m * -0.048 * s);
      ctx.lineTo(hx - 0.064 * s, m * -0.155 * s);
      ctx.lineTo(hx + 0.064 * s, m * -0.155 * s);
      ctx.lineTo(hx + 0.04 * s, m * -0.048 * s);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hx - 0.168 * s, m * -0.118 * s);
      ctx.quadraticCurveTo(hx, m * -0.288 * s, hx + 0.168 * s, m * -0.118 * s);
      ctx.quadraticCurveTo(hx, m * -0.148 * s, hx - 0.168 * s, m * -0.118 * s);
      ctx.closePath();
      ctx.fill();
      if (hurt || m > 0) break;
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1.2, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(hx - 0.152 * s, -0.122 * s);
      ctx.quadraticCurveTo(hx, -0.272 * s, hx + 0.152 * s, -0.122 * s);
      ctx.stroke();
      break;
    }
    default: {
      // 'crescent' — a TRUE crescent: a thin curved blade with horns,
      // standing off the eye on its own neck. The fan-fill version
      // read as a bowtie at gameplay scale (bench verdict); the neck
      // runs a plane darker or blade and neck melt into a bell.
      ctx.fillStyle = hurt ? '#ffffff' : shade(fill, -14);
      ctx.beginPath();
      ctx.moveTo(hx - 0.042 * s, m * -0.048 * s);
      ctx.lineTo(hx - 0.058 * s, m * -0.198 * s);
      ctx.lineTo(hx + 0.058 * s, m * -0.198 * s);
      ctx.lineTo(hx + 0.042 * s, m * -0.048 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(hx - 0.152 * s, m * -0.172 * s);
      ctx.quadraticCurveTo(hx, m * -0.295 * s, hx + 0.152 * s, m * -0.176 * s);
      ctx.quadraticCurveTo(hx, m * -0.198 * s, hx - 0.152 * s, m * -0.172 * s);
      ctx.closePath();
      ctx.fill();
      if (hurt || m > 0) break;
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1.2, s * 0.022);
      ctx.beginPath();
      ctx.moveTo(hx - 0.138 * s, -0.176 * s);
      ctx.quadraticCurveTo(hx, -0.282 * s, hx + 0.138 * s, -0.18 * s);
      ctx.stroke();
      break;
    }
  }
  // The one seam: the lower head's cheek line ties the bits to the eye.
  if (!hurt && m > 0) {
    ctx.strokeStyle = dark;
    ctx.lineWidth = Math.max(1, s * 0.014);
    ctx.beginPath();
    ctx.moveTo(hx - 0.05 * s, 0.092 * s);
    ctx.lineTo(hx + 0.05 * s, 0.092 * s);
    ctx.stroke();
  }
  // Battle bites out of the upper working edge.
  if (!hurt && st.notched && m < 0) {
    ctx.fillStyle = shade(st.color, -52);
    for (const t of [-0.055, 0.04] as const) {
      ctx.beginPath();
      ctx.moveTo(hx + (t - 0.02) * s, -0.208 * s);
      ctx.lineTo(hx + (t + 0.02) * s, -0.214 * s);
      ctx.lineTo(hx + t * s, -0.172 * s);
      ctx.closePath();
      ctx.fill();
    }
  }
}
