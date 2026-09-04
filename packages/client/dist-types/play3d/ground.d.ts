/**
 * THE GROUND STREAMS (play3d S1) — chunk heightfield meshes textured
 * by the real terrain baker, dealt around the camera target and
 * evicted (and DISPOSED) behind it.
 *
 * Per chunk:
 *  1. Geometry NOW: heightfield.ts builds the tile-level mesh (flat
 *     tops, sloped ramps, real vertical cliff faces) from the world's
 *     elev layer — cheap, synchronous, so the ground exists the frame
 *     it enters the ring, wearing a meadow-toned placeholder.
 *  2. Texture SOON: the 2D client's time-sliced bake (terrain.ts
 *     startChunkBake/stepChunkBake) is stepped under a per-frame ms
 *     budget, nearest chunk first, at most `MAX_JOBS` in flight. THE
 *     LEVELS COMPOSITE: the base bake paints every lifted/sunken tile
 *     as the dark cliff band (the 2D client draws plateau tops from
 *     separate per-level canvases shifted up-screen); here each level's
 *     elevated bake (startElevatedBake, ascending, exactly the 2D
 *     client's level list) is composited back onto the base canvas at
 *     its row origin — the 3D mesh carries the height, so the ONE
 *     texture holds every tile's own top. When the chain completes the
 *     canvas becomes a CanvasTexture uploaded ONCE (mipmapped,
 *     anisotropic, sRGB) and the placeholder material is swapped for
 *     the painted one. THE CANVAS PAYS ONCE (the 2D client's B4
 *     lesson): the moment the upload lands (`tex.onUpdate`) the 776²
 *     bake canvas is shrunk to 1×1 — the GPU copy is the only copy, and
 *     a ring of 49 chunks does not also hold ~118 MB of CPU bitmaps.
 *     A context loss therefore cannot re-upload from the image: the
 *     owner calls `reset()` on restore and the ring re-bakes. The bake's
 *     gutter is kept and the UVs inset past it — the gutter is real
 *     neighbour content and is exactly what a bilinear/mip sampler
 *     wants at chunk seams.
 *  3. Eviction past ring+1: geometry, both materials and the texture
 *     are disposed, the chunk's standing statics with them, and the
 *     byte ledger is debited. No leaks; the HUD shows the ledger.
 *
 * Lamps found while scanning a chunk are reported to the sky rig so
 * point lights can find them (lights.ts).
 *
 * S2 — THE LIVE GROUND: a streamed world answers `ready` false until
 * the server has dealt a chunk, and the streamer waits for it (no empty
 * stand-in). Every record remembers the chunk OBJECT and its `rev`;
 * `refresh()` (called when ClientGame.worldVersion moves) evicts any
 * record whose chunk was replaced, patched (rev bump) or fringe-bumped
 * by a neighbour's change, and the ring re-admits it next update with
 * fresh geometry, statics and a fresh bake — the 2D client's own
 * re-bake law, at chunk grain. `reset()` drops everything (a plane
 * crossing: the store under us was emptied).
 */
import * as THREE from 'three';
import { type SpriteAtlas } from './sprites.js';
import type { BillboardClock, BillboardFactory } from './billboard.js';
import type { WorldSource3D } from './world.js';
/** Bake density: px per tile. 24 keeps a 32-tile chunk at 776² (2.4MB). */
export declare const BAKE_PX = 24;
/** Chunks loaded within this Chebyshev radius of the target's chunk. */
export declare const LOAD_RING = 2;
/** ...and evicted only past this one (hysteresis). */
export declare const EVICT_RING: number;
/** The 2D client's level list: min..max, level 0 only when pits exist. */
export declare function elevLevels(elev: Int8Array): number[];
export interface LampSpot {
    x: number;
    y: number;
    z: number;
    /** Campfires burn warmer and lower than lamp posts. */
    kind: 'lamp' | 'fire';
}
export interface GroundStats {
    chunks: number;
    painted: number;
    baking: number;
    bakesDone: number;
    bakeMsLast: number;
    /** GPU bytes (mips counted). */
    textureBytes: number;
    /** CPU bake canvases still held (in flight or awaiting their upload). */
    canvasBytes: number;
    faces: number;
    statics: number;
    staticDraws: number;
}
export declare class GroundStreamer {
    private readonly world;
    private readonly atlas;
    private readonly clock;
    private readonly billboards;
    readonly group: THREE.Group<THREE.Object3DEventMap>;
    private readonly recs;
    private readonly ring;
    private readonly lamps;
    private readonly scratch;
    private readonly gutter;
    readonly stats: GroundStats;
    /** Fires whenever the lamp roster changes (chunk load/evict). */
    onLampsChanged: ((lamps: LampSpot[]) => void) | null;
    constructor(scene: THREE.Scene, world: WorldSource3D, atlas: SpriteAtlas, clock: BillboardClock, billboards: BillboardFactory);
    /** World-unit height of the ground under a world point. */
    heightAt(wx: number, wy: number): number;
    /** `heightAt` as one bound function (handed out, never re-minted). */
    readonly heightAtFn: (wx: number, wy: number) => number;
    private readonly levelAt;
    private readonly isRamp;
    private readonly groundSampler;
    private readonly detailSampler;
    /**
     * One frame of streaming around the target: admit new chunks
     * (nearest first), step bakes under `budgetMs`, evict the far ones.
     */
    update(targetX: number, targetZ: number, budgetMs: number): void;
    private admit;
    private standUp;
    private scanLamps;
    private emitLamps;
    /**
     * A job finished: composite it (elevated) or adopt it (base), then
     * start the next level or finalize. Returns true while more baking
     * remains for this chunk.
     */
    private advanceBake;
    private finishBake;
    private evict;
    /**
     * The world moved under us: evict every record whose chunk was
     * replaced, patched or fringe-bumped. Returns the number evicted;
     * the next update() re-admits them nearest first.
     */
    refresh(): number;
    /** Drop every chunk (plane crossing) — the ring refills from the new store. */
    reset(): void;
    dispose(): void;
}
//# sourceMappingURL=ground.d.ts.map