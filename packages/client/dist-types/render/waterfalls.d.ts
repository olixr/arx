import { ClientGame } from '../game/clientGame.js';
import type { DrawItem } from './renderer.js';
import type { FallTones } from './renderer.js';
import type { PaintHost } from './paintHost.js';
/**
 * WATERFALLS — THE SPILL LAW.
 *
 * A cliff face becomes a waterfall where the world says the water
 * continues over it: FEED water on the high terrace within
 * FALL_LOOKBACK tiles behind the boundary, and PLUNGE water on the low
 * side within FALL_LOOKAHEAD tiles past the foot. Authored channels
 * stop at the lip (water never touches the Cliff rim strip — the
 * auto-fence makes that impossible), and plunge basins resume a tile
 * or two past the foot, so the scan is a short perpendicular walk on
 * BOTH sides, never a direct-adjacency test.
 *
 * The high walk demands elev === level the whole way (a taller wall
 * behind the rim means the water up there belongs to a HIGHER fall;
 * only the top face of a stacked drop owns the curtain). The low walk
 * accepts any elevation BELOW the level and reports where the water
 * actually lands (landElev) — a two-level sheer drop hangs ONE
 * curtain from the top crest to the true landing, through the
 * intermediate faces.
 *
 * Detection is pure world-data (unit-tested here); the curtain /
 * headrace / churn / outwash art lives in renderer.ts beside
 * cliffFaceItem, whose contour segments the curtains inherit — a
 * diagonal rim gets a sheared curtain by construction.
 */
/** Tiles scanned behind the boundary for feed water (k=0 is the Cliff
 *  rim strip itself, so the nearest legal feed sits at k=1). */
export declare const FALL_LOOKBACK = 4;
/** Tiles scanned past the foot for the plunge water. */
export declare const FALL_LOOKAHEAD = 4;
export interface SpillInfo {
    /** Tiles from the boundary back to the feed water (1..LOOKBACK-1). */
    race: number;
    /** Tiles from the foot row out to the plunge water (0 = water at the foot). */
    drop: number;
    /** Elevation the water lands at — level-1, or lower for stacked drops. */
    landElev: number;
}
type Sampler = (tx: number, ty: number) => number | undefined;
export declare function isFallWater(t: number | undefined): boolean;
/**
 * Spill test at a point ON a contour boundary. (mx,my) is the sample
 * point (a face-segment half midpoint), (nx,ny) the outward low-side
 * normal. Diagonal boundaries walk the diagonal first, then fall back
 * to each cardinal component — a channel meeting a beveled corner
 * rarely lines up with the exact diagonal ray.
 */
export declare function spillAt(ground: Sampler, elev: Sampler, mx: number, my: number, nx: number, ny: number, level: number): SpillInfo | null;
export declare function fallAt(rend: PaintHost, game: ClientGame, mx: number, my: number, nx: number, ny: number, level: number): SpillInfo | null;
export declare function fallClip(rend: PaintHost, game: ClientGame, key: string, build: () => Path2D | null): Path2D | null;
/** Clip the ctx to a world-coordinate region path lifted by `lift`
 *  screen px — the reflection-composite idiom: transform, clip,
 *  restore the transform but keep the clip. Callers wrap in
 *  save()/restore(). */
export declare function clipFallRegion(rend: PaintHost, path: Path2D, lift: number): void;
/** The contiguous spill run through a boundary column — the mouth
 *  region must span the WHOLE run (per-segment virtual sets would
 *  seam mid-channel). Walks quarter-point spill tests both ways. */
export declare function fallRunColsX(rend: PaintHost, game: ClientGame, col: number, my: number, nx: number, ny: number, level: number): [number, number];
/**
 * THE MOUTH REGION — the feed channel's drawn water region EXTENDED
 * through the dry rim strip to the crest by a VIRTUAL sampler: the
 * spill columns' rim tiles count as water, so marching squares
 * grows organic banks that CONTINUE the channel's own drawn banks
 * exactly (the shared tile edges hash to the same crossings). The
 * headrace tongue clipped to this region meets the authored water
 * edge seamlessly — the alignment the straight tile-edge tongue
 * never had. `axis` is the run's direction; (runA..runB) the tile
 * range along it; `rim` the first dry tile row/col on the high
 * side; `step` walks from the rim toward the feed water.
 */
export declare function mouthClipFor(rend: PaintHost, game: ClientGame, level: number, axis: 'x' | 'y', runA: number, runB: number, rim: number, step: number): Path2D | null;
/** THE LANDING REGION — the real drawn water at the landing
 *  elevation around a fall's foot. Pool dressing (outwash entering
 *  the pool, rings, rafts, the strong mist veil) clips to it so
 *  nothing paints onto drawn grass past the meandering shoreline. */
export declare function landClipFor(rend: PaintHost, game: ClientGame, landElev: number, cx0: number, cx1: number, cy0: number, cy1: number): Path2D | null;
export declare function fallTones(rend: PaintHost): FallTones;
/** THE BREAKWATER — where the sheet knifes into the pool. Not a
 *  band and never a slab: a rank of low-poly FOAM MOUNDS in the
 *  world's own two-tone blob language (wash base under a lit foam
 *  cap, chunky 7-vertex polygons like every canopy and pool blob
 *  in the game), overlapping along a WORLD-KEYED grid so segment
 *  seams vanish, and tapering to nothing at true run ends
 *  (capL/capR) — the foam ends because the mounds shrink away,
 *  never because a fill stops. Behind the rank, the dark LAP line
 *  grounds the impact; in front, crescent backwash slides off into
 *  the pool and the dissolving tail carries the last flecks out.
 *  (ox,oy) = low-side push; `push` = screen-px drop to meet the
 *  dipped sheet base. */
export declare function drawFallChurn(rend: PaintHost, x0: number, y0: number, x1: number, y1: number, ox: number, oy: number, landLift: number, level: number, t: number, tones: FallTones, push?: number, capL?: boolean, capR?: boolean): void;
/** Airborne life at a fall's landing: drifting mist motes and darting
 *  spray, dt-gated per visible fall (the portal-emitter idiom).
 *  Enhancement layer — rides the Water motion setting. */
export declare function emitFallHaze(rend: PaintHost, x0: number, y0: number, x1: number, y1: number, wet?: (wx: number, wy: number) => boolean): void;
/**
 * Spill tests for one downhill face segment, emitting the curtain
 * and its low-ground dressing. Halves are tested independently (the
 * same quarter-offset law as ramp ownership) so the curtain starts
 * and stops on the channel's tile edges, not the dual cell's.
 */
export declare function pushSouthFallItems(rend: PaintHost, game: ClientGame, items: DrawItem[], ax: number, ay: number, bx: number, by: number, nx: number, ny: number, level: number): void;
/**
 * THE WATERFALL CURTAIN — water continuing over a cliff face,
 * painted in THE POUR dialect: the world's flat-vector water
 * language folded over an edge. Everything is OPAQUE stepped tone —
 * never a translucent gradient (a see-through curtain reads as
 * wallpaper on the wall, the shipped proof-of-concept failure).
 * Top to bottom: the HEADRACE (the channel's own open-water tone
 * carried solid to the lip, mid-current lanes stretching as the
 * water gathers speed, a pale acceleration shelf where it thins
 * over the arris), the CREST ROLL (the foreshortened curl — the
 * top-plane law applied to water: a lit convex band riding the
 * arris, tearing off in world-keyed scallops, casting one crisp
 * shadow on the sheet), and the SHEET itself (0.4-tile world-grid
 * bands of the water palette, each breaking at a world-keyed height
 * into its air-charged lower half — a hard step, not a fade; base
 * DIPPED south of the wall foot and free ends FLARED outward as
 * the unconfined edge fans in air — the 2.5D pitch-out read; foam
 * threads at constant SCREEN speed — phase rate divides by drop
 * height so a two-level fall doesn't cascade twice as fast).
 * Churn, outwash, rings and mist live in per-row items on the low
 * ground (fallOutwashRowItem) so elevated landing rows — which
 * blit as items at rowTy-0.01 — can't paint over them; diagonals,
 * whose landing is a corner pocket rather than a row, draw their
 * dressing right here. Every mark is keyed to WORLD coordinates
 * (the cliff-face law): the sheet runs unbroken across segment
 * seams and around 45° turns, and both dip and band edges key to
 * world x so abutting segments join pixel-true.
 */
export declare function waterfallItem(rend: PaintHost, game: ClientGame, ax: number, ay: number, bx: number, by: number, nx: number, ny: number, level: number, info: SpillInfo, edgeL: boolean, edgeR: boolean, diagonal: boolean, mouth: Path2D | null): DrawItem;
/**
 * One low-ground row of a straight fall's landing: the outwash
 * tongue slice (spreading as it runs, whitest at impact); row 0 adds
 * the churn mound over the sheet's foot; the last row adds pool
 * rings (FLAT-law 0.6 ellipses), drifting foam rafts, the mist veil,
 * and owns the haze particles. Per-row items because elevated
 * landing rows blit as items at rowTy-0.01 — one spanning item
 * would be painted over by every row after its own.
 */
export declare function fallOutwashRowItem(rend: PaintHost, game: ClientGame, x0: number, x1: number, foot: number, r: number, info: SpillInfo, level: number, land: Path2D | null, apron: Path2D | null, runX0: number, runX1: number): DrawItem;
/**
 * THE SIDE FALL — water over a pure north-south rim. The face is
 * edge-on (the cliffSideItem cheat strip), so the fall reads as a
 * narrow ribbon hugging the rim line: crest fold at the top, scroll
 * threads at constant screen speed, aerating body, churn stack at
 * the landing. One item per contiguous water streak of the run —
 * the sheet's motion needs the whole height, not row-sliced phases.
 * Sorts at its FIRST row without the side item's early bias: every
 * wall slice that can overlap sorts earlier by construction (their
 * bias is the full crown lift), while bodies beside the rim still
 * win against the wall line itself.
 */
export declare function fallRibbonItem(rend: PaintHost, x: number, r0: number, r1: number, nx: number, level: number, info: SpillInfo, land: Path2D | null): DrawItem;
/**
 * A side fall's flat-ground dressing: the crown headrace running
 * sideways into the rim line, the outwash fanning across the low
 * ground, pool rings and the mist veil. Sorts after every crown and
 * landing row blit it can touch ((r1-1)+0.03 beats rowTy-0.01).
 */
export declare function fallSideDressItem(rend: PaintHost, game: ClientGame, x: number, r0: number, r1: number, nx: number, level: number, info: SpillInfo, mouth: Path2D | null, land: Path2D | null, apron: Path2D | null): DrawItem;
/**
 * NORTH falls: the face looks away from the camera, so the visible
 * story is the crown — the race running away toward the edge, the
 * boil at the silhouette, the peeking top of the hidden sheet — and
 * beyond the ridge, the far basin's churn (occluded by the lifted
 * crown exactly where it should be) plus a rising plume. Diagonal
 * back-bevels are skipped: the flanking cardinal faces carry them.
 */
export declare function pushNorthFallItems(rend: PaintHost, game: ClientGame, items: DrawItem[], ax: number, ay: number, bx: number, by: number, nx: number, ny: number, level: number): void;
/** The crown half of a north fall: race away to the edge + the boil
 *  line at the silhouette. Sorts after every crown row it crosses. */
export declare function northFallRaceItem(rend: PaintHost, x0: number, x1: number, yEdge: number, level: number, info: SpillInfo, mouth: Path2D | null): DrawItem;
/** The far-basin half of a north fall: churn, rings and a small
 *  veil at the landing, sorted to draw BEFORE the lifted crown rows
 *  so the ridge occludes it exactly where it should. */
export declare function northFallChurnItem(rend: PaintHost, game: ClientGame, x0: number, x1: number, yEdge: number, level: number, info: SpillInfo, land: Path2D | null): DrawItem;
export {};
//# sourceMappingURL=waterfalls.d.ts.map