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
 * DOCKS. A Bridge tile near water is a DOCK: the ground under it is
 * painted as real water (the skin, contours and depth all run beneath
 * the boards) and a raised plank deck stands over it on driven piles.
 * The deck rides DOCK_LIFT tiles of SCREEN height above the surface —
 * renderLift lifts every body standing on one by the same amount, so
 * feet and boards agree by construction. Bake-space vertical offsets
 * must divide by FLAT (the bake squashes at blit time; screen height
 * does not).
 */
export declare const DOCK_LIFT = 0.22;
/** Bridge with any water within Chebyshev distance 2 — a dock. The
 *  radius-2 scan keeps a whole jetty uniform (interior tiles of a
 *  2-wide run don't all touch water) so the lift never dips mid-run. */
export declare function isDockTile(ground: GroundSampler, tx: number, ty: number): boolean;
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