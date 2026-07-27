import type { WoodSkin } from './woodSkins.js';
/**
 * ORGANIC terrain rendering. Tiles are authored on a grid but the grid
 * must disappear on screen: material regions are contoured on the dual
 * grid (marching squares over tile corners), then every edge crossing
 * slides along its edge by a deterministic world-keyed hash and every
 * boundary run bows into a quadratic curve. Nature never cuts a 45°
 * chamfer — roads wander, meadows bite into sand, shorelines meander.
 * Masonry still may: layers with wobble 0 keep ruler-straight cuts
 * (stone plazas, wood floors), so man-made ground reads deliberate
 * while wild ground flows.
 *
 * Where two materials meet they BLEND, the way hand-drawn transition
 * tiles do: a worn shade band just inside the edge, grass tufts
 * overhanging the boundary, and crumbs of the material scattered out
 * onto the turf. Ground shading comes from low-frequency noise — big
 * soft meadows, no checkerboard.
 *
 * All jitter is keyed on WORLD tile coordinates, so the same curve
 * falls out of every chunk bake, every resolution tier, and the live
 * shoreline pass — geometry agrees everywhere by construction.
 */
export type GroundSampler = (tx: number, ty: number) => number | undefined;
export type DetailSampler = (tx: number, ty: number) => number;
export type ElevSampler = (tx: number, ty: number) => number;
/**
 * The soil family: a tilled plot and every crop growth stage share ONE
 * ground material, so a field contours as a single dug bed — no seams
 * between a plot and the plant standing in it.
 */
export declare const SOIL_TILES: Set<number>;
/**
 * GUTTER LAW: chunk bakes carry a margin of real neighbor content on
 * every side, and the renderer blits from the inset source rect.
 * Scaled drawImage filtering samples beyond the source rect at its
 * edges — against a bare canvas edge that blend pulls in TRANSPARENT
 * pixels and paints a hairline dark seam along every chunk boundary.
 * With a gutter the kernel lands on true world content instead. The
 * painters already draw world-keyed content past the chunk bounds
 * (the canvas merely clipped it), so the gutter costs only pixels.
 */
export declare function bakeGutter(px: number): number;
/**
 * TIME-SLICED CHUNK BAKING. A full chunk bake costs 10-40ms — far past
 * any 120fps frame budget, so it must never run whole inside a frame.
 * startChunkBake paints the cheap meadow base synchronously (~0.1ms, a
 * usable placeholder) and returns a job whose remaining steps — one
 * material layer per step, the elev mask + planks, the per-tile detail
 * pass in row bands, docks last — each fit a small slice of a frame.
 * The renderer advances jobs against a per-frame time budget and blits
 * the canvas at whatever completeness it has: brand-new ground sweeps
 * its detail in over a few frames instead of hitching one.
 *
 * Step ORDER is the paint order of the old monolithic bake, so a
 * finished job is pixel-identical to bakeChunk's output. Partial
 * states are always "lower passes complete, higher passes absent" —
 * never residue that a later pass fails to cover.
 */
export interface ChunkBakeJob {
    canvas: HTMLCanvasElement;
    /** Remaining paint steps; each sized to fit a slice of frame budget. */
    steps: Array<() => void>;
    next: number;
}
/** Advance a sliced bake by one step; true when the bake is complete. */
export declare function stepChunkBake(job: ChunkBakeJob): boolean;
export declare function startChunkBake(ground: GroundSampler, detail: DetailSampler, elev: ElevSampler, cx: number, cy: number, px: number, woodSkin?: WoodSkinSampler): ChunkBakeJob;
/** The one-shot bake: start + run every step. Output is identical to
 *  the sliced path — this is the sliced path, run to completion. */
export declare function bakeChunk(ground: GroundSampler, detail: DetailSampler, elev: ElevSampler, cx: number, cy: number, px: number, woodSkin?: WoodSkinSampler): HTMLCanvasElement;
/**
 * Bake the LIFTED terrain surface of one chunk at one elevation level:
 * every tile at `level` or higher (ramps excluded — they get bespoke
 * stair props) painted with the full material-skin pipeline, clipped to
 * a marching-squares contour so the plateau top has the same crisp
 * 45°-cut coastline as every other material — then finished with a
 * sunlit brink line along the rim. The renderer draws this canvas
 * shifted UP by level·ELEV_H and y-sorted, which is what makes the
 * plateau a solid mass you can walk behind.
 */
export interface ElevatedBake {
    canvas: HTMLCanvasElement;
    /** Chunk rows (local ly) containing any lifted content at this level. */
    rows: boolean[];
}
export declare function bakeElevated(ground: GroundSampler, detail: DetailSampler, elev: ElevSampler, cx: number, cy: number, px: number, level: number): ElevatedBake | null;
/** Resolves the wood skin a building floor tile is cut from. */
export type WoodSkinSampler = (tx: number, ty: number) => WoodSkin;
/**
 * Live-water options, threaded from the renderer each frame. `full`
 * gates the ENHANCEMENT layer (swells, caustics, rolling foam) — the
 * base water (baked skins, waterline, glints, fishing rings) never
 * turns off, so switching to basic only quiets the surface, it never
 * breaks it. `moonlit` silvers and dims the glitter after dark.
 */
export interface WaterFx {
    full: boolean;
    moonlit: boolean;
}
/**
 * RAISED DECKS. Two structures stride over the water, and they are
 * NOT the same build:
 *
 *   DOCK (Tile.Dock) — the exposed jetty: a plank deck suspended on
 *   driven wooden piles, deliberately reading as "placed over" the
 *   water. Painted by drawDocks.
 *
 *   BRIDGE (Tile.Bridge) — the seated crossing: the same raised walk,
 *   but SEATED INTO both banks — stone abutment steps at every land
 *   threshold, chunky stone piers with an arched fascia over the
 *   water, kerbed board edges, and hip-height rails along every edge
 *   that faces water (the rails are live renderer items so bodies
 *   sort against them). Painted by drawBridges.
 *
 * Both share the deck mechanics: the ground under them is painted as
 * real water (skin, contours and depth all run beneath the boards)
 * and the deck rides DOCK_LIFT tiles of SCREEN height above the
 * surface — renderLift lifts every body standing on one by the same
 * amount, so feet and boards agree by construction. Bake-space
 * vertical offsets must divide by FLAT (the bake squashes at blit
 * time; screen height does not).
 */
export declare const DOCK_LIFT = 0.22;
/** Deck-family ground: the two raised-walk tiles. */
export declare function isDeckGround(t: number | undefined): boolean;
/** Dock tile near water — a raised jetty deck. */
export declare function isDockTile(ground: GroundSampler, tx: number, ty: number): boolean;
/** Bridge tile near water — a raised, seated crossing. */
export declare function isBridgeTile(ground: GroundSampler, tx: number, ty: number): boolean;
/** Either raised deck — everything the water must flow quietly under. */
export declare function isDeckTile(ground: GroundSampler, tx: number, ty: number): boolean;
/**
 * The walk axis of a whole connected deck span, decided ONCE for the
 * span so every member tile lays its boards, kerbs and rails the same
 * way (a per-tile guess splits a wobbly-banked crossing into mixed
 * directions): flood the deck region (4-way, capped), count exposed
 * edges that meet water on each axis — a river runs past the SIDES —
 * and fall back to the region's long axis when the water reads
 * ambiguous. Returns true when the walk runs N-S. `out` collects the
 * verdict for every member tile so callers memoize one flood per span.
 */
export declare function deckWalkIsVertical(ground: GroundSampler, tx: number, ty: number, out?: Map<number, boolean>): boolean;
/**
 * The breeze layer: drifting water glints, swell bands, shallow-water
 * caustics, the surf shoreline and portal swirls. Drawn every frame
 * over the baked ground. (Grass and flowers live in grass.ts.)
 */
export declare function drawLiveGround(ctx: CanvasRenderingContext2D, ground: GroundSampler, bounds: {
    minTx: number;
    maxTx: number;
    minTy: number;
    maxTy: number;
}, worldToScreen: (wx: number, wy: number) => {
    x: number;
    y: number;
}, s: number, timeMs: number, fx?: WaterFx): void;
/**
 * The visible water region as ONE Path2D in WORLD tile coordinates:
 * interior dual cells as rects, boundary cells through the same organic
 * contour geometry as the baked skin — so a reflection clipped by this
 * path ends exactly at the painted meander, never at a tile edge. The
 * renderer's reflection pass applies it under the camera's affine
 * transform. Returns null when no water is in view.
 */
export declare function waterRegionPath(ground: GroundSampler, bounds: {
    minTx: number;
    maxTx: number;
    minTy: number;
    maxTy: number;
}): Path2D | null;
//# sourceMappingURL=terrain.d.ts.map