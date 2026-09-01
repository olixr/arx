import type { PaintHost } from './paintHost.js';
/**
 * The revealed mouth: the body's own plan as a dark cavity — one
 * bold lining band on the near wall, one sunlit near-rim lane.
 */
export declare function chestMouth(rend: PaintHost, ctx: CanvasRenderingContext2D, cx: number, bodyT: number, bw: number, topD: number, s: number, reveal: number, wall: string, lining: string): void;
/**
 * The standing open lid: the lid's inner face as a square slab
 * rising behind the box — frame color around a lining inset, a cap
 * strip along the top. Bespoke trim is painted by the caller.
 */
export declare function chestStandingLid(rend: PaintHost, ctx: CanvasRenderingContext2D, cx: number, hingeY: number, bw: number, standH: number, s: number, frame: string, lining: string, cap: string): number;
/**
 * A moss slab: a low-poly rectangular patch — deep seat offset
 * down-right, square body, one bold lit top strip. Never a blob.
 */
export declare function mossSlab(rend: PaintHost, ctx: CanvasRenderingContext2D, x: number, y: number, w: number, hgt: number, s: number): void;
/**
 * WOOD — the traveller's trunk. Honest warm boards carried by two
 * broad silver straps and a silver arris cap: the metal is the
 * contrast, the wood stays quiet.
 */
export declare function drawChestWood(rend: PaintHost, ctx: CanvasRenderingContext2D, cx: number, baseY: number, s: number, o: number): void;
/**
 * MOSSY — the wayside elder. A batten-built chest with no metal
 * left worth naming, being claimed one square slab of moss at a
 * time. Blocky moss, blocky mushrooms, quiet wood.
 */
export declare function drawChestMossy(rend: PaintHost, ctx: CanvasRenderingContext2D, cx: number, baseY: number, s: number, o: number): void;
/**
 * IRON — the strongchest. Dark timber in an iron grip: corner
 * columns, one massive belt, and a padlock the size of a fist.
 * The lock IS the promise; it goes with the key that opens it.
 */
export declare function drawChestIron(rend: PaintHost, ctx: CanvasRenderingContext2D, cx: number, baseY: number, s: number, o: number): void;
/**
 * GILDED — the coffer. A stepped gold crown over a lacquer inlay:
 * treasure-house work, all big faces and one set stone. The value
 * ladder does the shining; the sparkles only visit.
 */
export declare function drawChestGilded(rend: PaintHost, ctx: CanvasRenderingContext2D, cx: number, baseY: number, s: number, o: number, t: number, h: number): void;
/**
 * BOSS — the black cache. A pedestal-set black mass in angular
 * iron, fronted by a bone skull whose sockets smoulder while the
 * hoard is still inside. Legendary is a silhouette, not a shimmer.
 */
export declare function drawChestBoss(rend: PaintHost, ctx: CanvasRenderingContext2D, cx: number, baseY: number, s: number, o: number, t: number, h: number): void;
/** Everything a chest painter needs for one frame. */
export declare function chestPose(o: number): {
    tilt: number;
    stand: number;
};
//# sourceMappingURL=chestArt.d.ts.map