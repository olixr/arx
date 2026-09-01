/**
 * THE MONOLITH'S SHARED VOCABULARY — pure paint constants and phase
 * helpers the world painters speak, lifted out of the Renderer class so
 * prop family modules (render/props/*) can import them without touching
 * the engine. Everything here is data or a pure function; nothing reads
 * frame state.
 */
import { DOOR_TILES, doorInfo, Tile, WALL_RUN_TILES } from '@arx/shared';
import { DYE_SWATCHES } from './icons.js';
import type { WindSample } from './grass.js';

/** The world's outline color — the dark edge entities and props wear. */
export const STRUCT_OUTLINE = '#241a2e';

/** Market stall cloth rosters — hashed per stall, never authored. */
export const STALL_BANNERS: ReadonlyArray<{
  kind: 'stripes' | 'solid' | 'chevron';
  a: string;
  b: string;
}> = [
  { kind: 'stripes', a: '#b5493e', b: '#e8dfc8' }, // market classic
  { kind: 'stripes', a: '#3f6f8f', b: '#e8dfc8' }, // harbor blue
  { kind: 'solid', a: '#5d7f3a', b: '#e8dfc8' }, // herbalist green
  { kind: 'solid', a: '#7a4a8f', b: '#d9a441' }, // arcanist plum
  { kind: 'chevron', a: '#c9962e', b: '#6b4a26' }, // gilded trim
  { kind: 'solid', a: '#8a3d3d', b: '#e8dfc8' }, // vintner wine
];

/**
 * THE DYE LAW's cloths, index-married to the shared roster (linen 0
 * … rose 9; rename in place, never reorder). The bolt color `a`
 * comes from icons' DYE_SWATCHES — the one client color truth for
 * dyes — and `b` is its stripe/trim partner: undyed cream for most,
 * a paler self for pale cloths so stripes never vanish.
 */
export const AWNING_CLOTHS: ReadonlyArray<{ a: string; b: string }> = DYE_SWATCHES.map((a, i) => ({
  a,
  b: [
    '#efe8d4', // linen
    '#e8dcc4', // madder
    '#e8dcc4', // woad
    '#efe6cc', // weld
    '#e8dcc4', // ivy
    '#e3d7e8', // mulberry
    '#eadfc8', // ochre
    '#c9c4b4', // charcoal
    '#e0dcc0', // moss
    '#f4e9e0', // rose
  ][i]!,
}));

/** Every rock-formation tile, workable or spent. */
export const ROCK_TILES: ReadonlySet<number> = new Set([
  Tile.Rock,
  Tile.RockCopper,
  Tile.RockTin,
  Tile.RockIron,
  Tile.RockCoal,
  Tile.RockGold,
  Tile.RockSilver,
  Tile.RockMithril,
  Tile.RockAdamant,
  Tile.RockObsidian,
  Tile.RockStarfall,
  Tile.RockDepleted,
]);

/** The wall-run family as a membership set. */
export const WALL_TILES: ReadonlySet<number> = new Set<number>(WALL_RUN_TILES);

/** Staggered twinkle window: brief flash once per period. */
export function twinkle(tSec: number, seed: number, period: number): number {
  const phase = (tSec / period + ((seed >>> 3) % 97) / 97) % 1;
  const DUR = 0.14;
  return phase < DUR ? Math.sin((phase / DUR) * Math.PI) : 0;
}

/** The occlusion/sprite cache key for a standing tree at a world tile. */
export function treeKey(wx: number, wy: number, tile: Tile): number {
  return ((Math.floor(wx) + 8192) * 32768 + (Math.floor(wy) + 8192)) * 64 + (tile & 63);
}

// ---- lifted with THE PROP HALL (foundations F1): constants shared
// by the prop families AND the engine's own painters ----
/** Renderer-side wind scratch (samples are consumed immediately). */
export const WIND_TMP: WindSample = { bx: 0, by: 0, s: 0, l: 0 };
// THE SPIKED WALL: war-camp timber — rawer and darker than town
// fencing (axe-hewn green logs, not milled rails), bound in worn rope.
export const PALI_LOG = '#6a4a28';
export const PALI_ROPE = '#8a713f';
export const PALI_ROPE_DARK = '#4a3a22';
export const PALI_BONE = '#c9c2ae';
export const GY_STONE = '#6f6a7d';
export const GY_STONE_LIT = '#8d889c';
export const GY_MOSS = 'rgba(74, 97, 56, 0.5)';
export const TWN_BRONZE = '#6d5a34';
export const TWN_BRONZE_LIT = '#c2a45c';
export const TWN_OAK = '#8a6534';
export const TWN_OAK_LIT = '#c9a76a';
export const TWN_OAK_DARK = '#6f4d26';
export const TWN_ROPE = '#a89263';
export const TWN_IRON = '#4c4a52';
// THE TRADES KEEP SHOP — the workshop kit's own keys, laid over the
// town timber it shares: quench iron and slack water, grindstone
// grit, oven brick with its fired heart, cured leather, and the
// herb-green of the drying rack. Trades read by MATERIAL.
export const TRD_STEEL = '#8a94a0';
export const TRD_STEEL_LIT = '#d2dae2';
export const TRD_LEATHER_LIT = '#b5824e';
export const TRD_CRUST = '#c9955c';
export const TRD_CRUST_LIT = '#e8c48e';
export const TRD_HERB = '#5d7c42';
export const TRD_HERB_DRY = '#8a9058';
// THE HERBALIST'S SHELF: the shelf paints the game's OWN botany —
// sagewort silver-green and moonbell dusk-blue matched to the wild
// nodes and the farm rows, so the species read as ONE plant whether
// they stand wild, grow in the physic tub, or dry on the beam.
export const HRB_SAGE = '#8fb083';
export const HRB_SAGE_DEEP = '#5b8a5e';
export const HRB_MOON = '#8f9ed6';
export const HRB_MOON_DEEP = '#5c6693';
export const HRB_SOIL_WET = '#3a2d1e';

// ---- lifted with F2 WAVE A: barrier inks the engine still speaks ----
/**
 * The fence family's timber — golden oak, the regionless wood-skin
 * baseline, so player fencing matches unenclosed builds everywhere.
 * One palette for straight runs, 45° turns, and gates: a pen must
 * read as ONE carpentered line. Rail fills are deliberately constant
 * per tile (no hash jitter) — N-S strips and E-W boards continue
 * across tile joins, and any per-tile tone would print the grid.
 */
export const FENCE_POST = '#6e4b29';
export const FENCE_RAIL = '#8a6534';

/** Door ids whose leaf/frame the doorway painter itself owns — fence,
 * garrison, palisade and hedge gates belong to their family painters. */
/** Every WALL doorway tile — open and shut, both orientations and
 *  widths. Fence gates are doors on the wire (locks, occupancy,
 *  auto-close all ride DOOR_INFO) but they are fence props to the
 *  renderer — kept OUT of this set so the wall-doorway pipeline
 *  (side-notch law, wide merges, veil, wallish) never sees them.
 *  Garrison gates carve out the same way: they belong to the
 *  garrison run pipeline, never the building-doorway one. */
export const PANEL_DOOR_TILES = new Set<number>(
  [...DOOR_TILES].filter(
    (t) =>
      doorInfo(t)!.material !== 'fence' &&
      doorInfo(t)!.material !== 'garrison' &&
      // The camp gate belongs to the palisade family's painter.
      doorInfo(t)!.material !== 'palisade' &&
      // The garden arch belongs to the hedge family's painter.
      doorInfo(t)!.material !== 'hedge' &&
      // The graveyard gate belongs to the iron-fence family's painter.
      doorInfo(t)!.material !== 'iron',
  ),
);

// ---- lifted with F2 WAVE B ----
/**
 * The knee-high stub every revealed wall sinks to — ONE height, shared
 * by every wall kind in every zone, so adjacent runs of different
 * materials (or a doorframe mid-run) always meet at the same crown
 * line while cut. Waist on the body scale: low enough to see over,
 * tall enough to still read as the wall's footprint.
 */
export const WALL_STUB = 0.62;
/**
 * THE GARRISON SCALE — curtain-wall height in tiles. Fortification
 * reads as fortification only when it dwarfs the house grammar: the
 * rampart stands half again over WALL_H (2.05) and three bodies over
 * the 1.15-tile rig, with the crenellated parapet rising MERLON_H
 * above the wall-walk on top of that. Anything between "house" and
 * "keep" muddies both reads — if this ever changes, re-audit the
 * deep-south culling admission (a 3.4 + 0.5 crown spans ~6.5 screen
 * rows at yScale 0.6) and the lighting tallH callback with it.
 */
export const GARRISON_H = 3.4;
/** Parapet tooth above the wall-walk — chest-high on the crown. */
export const MERLON_H = 0.5;

// ---- lifted with F2 WAVE B: garrison leaf ink + the stone hash ----
/** Gatehouse leaves: iron-bound oak, darker than any house door. */
export const GAR_LEAF = '#4e3a20';
/** Deterministic per-stone jitter, world-keyed like the terrain bake. */
export function stone01(a: number, b: number, c: number): number {
  let t = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 974634599)) | 0;
  t = Math.imul(t ^ (t >>> 13), 1274126177);
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}
