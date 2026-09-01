/**
 * THE MONOLITH'S SHARED VOCABULARY — pure paint constants and phase
 * helpers the world painters speak, lifted out of the Renderer class so
 * prop family modules (render/props/*) can import them without touching
 * the engine. Everything here is data or a pure function; nothing reads
 * frame state.
 */
import { Tile } from '@arx/shared';
import type { WindSample } from './grass.js';
/** The world's outline color — the dark edge entities and props wear. */
export declare const STRUCT_OUTLINE = "#241a2e";
/** Market stall cloth rosters — hashed per stall, never authored. */
export declare const STALL_BANNERS: ReadonlyArray<{
    kind: 'stripes' | 'solid' | 'chevron';
    a: string;
    b: string;
}>;
/**
 * THE DYE LAW's cloths, index-married to the shared roster (linen 0
 * … rose 9; rename in place, never reorder). The bolt color `a`
 * comes from icons' DYE_SWATCHES — the one client color truth for
 * dyes — and `b` is its stripe/trim partner: undyed cream for most,
 * a paler self for pale cloths so stripes never vanish.
 */
export declare const AWNING_CLOTHS: ReadonlyArray<{
    a: string;
    b: string;
}>;
/** Every rock-formation tile, workable or spent. */
export declare const ROCK_TILES: ReadonlySet<number>;
/** The wall-run family as a membership set. */
export declare const WALL_TILES: ReadonlySet<number>;
/** Staggered twinkle window: brief flash once per period. */
export declare function twinkle(tSec: number, seed: number, period: number): number;
/** The occlusion/sprite cache key for a standing tree at a world tile. */
export declare function treeKey(wx: number, wy: number, tile: Tile): number;
/** Renderer-side wind scratch (samples are consumed immediately). */
export declare const WIND_TMP: WindSample;
export declare const PALI_LOG = "#6a4a28";
export declare const PALI_ROPE = "#8a713f";
export declare const PALI_ROPE_DARK = "#4a3a22";
export declare const PALI_BONE = "#c9c2ae";
export declare const GY_STONE = "#6f6a7d";
export declare const GY_STONE_LIT = "#8d889c";
export declare const GY_MOSS = "rgba(74, 97, 56, 0.5)";
export declare const TWN_BRONZE = "#6d5a34";
export declare const TWN_BRONZE_LIT = "#c2a45c";
export declare const TWN_OAK = "#8a6534";
export declare const TWN_OAK_LIT = "#c9a76a";
export declare const TWN_OAK_DARK = "#6f4d26";
export declare const TWN_ROPE = "#a89263";
export declare const TWN_IRON = "#4c4a52";
export declare const TRD_STEEL = "#8a94a0";
export declare const TRD_STEEL_LIT = "#d2dae2";
export declare const TRD_LEATHER_LIT = "#b5824e";
export declare const TRD_CRUST = "#c9955c";
export declare const TRD_CRUST_LIT = "#e8c48e";
export declare const TRD_HERB = "#5d7c42";
export declare const TRD_HERB_DRY = "#8a9058";
export declare const HRB_SAGE = "#8fb083";
export declare const HRB_SAGE_DEEP = "#5b8a5e";
export declare const HRB_MOON = "#8f9ed6";
export declare const HRB_MOON_DEEP = "#5c6693";
export declare const HRB_SOIL_WET = "#3a2d1e";
/**
 * The fence family's timber — golden oak, the regionless wood-skin
 * baseline, so player fencing matches unenclosed builds everywhere.
 * One palette for straight runs, 45° turns, and gates: a pen must
 * read as ONE carpentered line. Rail fills are deliberately constant
 * per tile (no hash jitter) — N-S strips and E-W boards continue
 * across tile joins, and any per-tile tone would print the grid.
 */
export declare const FENCE_POST = "#6e4b29";
export declare const FENCE_RAIL = "#8a6534";
/** Door ids whose leaf/frame the doorway painter itself owns — fence,
 * garrison, palisade and hedge gates belong to their family painters. */
/** Every WALL doorway tile — open and shut, both orientations and
 *  widths. Fence gates are doors on the wire (locks, occupancy,
 *  auto-close all ride DOOR_INFO) but they are fence props to the
 *  renderer — kept OUT of this set so the wall-doorway pipeline
 *  (side-notch law, wide merges, veil, wallish) never sees them.
 *  Garrison gates carve out the same way: they belong to the
 *  garrison run pipeline, never the building-doorway one. */
export declare const PANEL_DOOR_TILES: Set<number>;
//# sourceMappingURL=paintVocab.d.ts.map