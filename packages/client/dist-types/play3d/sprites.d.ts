/**
 * THE PAINTED WORLD STANDS UP (play3d S1) — the sprite systems.
 *
 * Two kinds of billboard, one shader (billboardMaterial.ts):
 *
 * STATICS — trees, saplings, wild flora (props/FX follow in S2 via the
 * same door). The production painters (trees.ts paintTree, crops.ts
 * paintPlant) are called ONCE per distinct model into a shelf-packed
 * ATLAS PAGE (2048², sRGB, mipmapped), ringed with the outline law, and
 * uploaded ONCE. Each chunk then owns one InstancedBufferGeometry per
 * atlas page it touches: one draw call per (chunk, page). Eviction
 * disposes the instance buffers; the atlas is shared and stays.
 *
 * ENTITIES live in entityBillboard.ts (S2 moved them out): a per-body
 * canvas painted by the production rigs and uploaded only on change.
 *
 * Pixel density: statics at 32 px/tile (the 2D game's TILE_PX).
 */
import * as THREE from 'three';
import { Tile, type ChunkData } from '@arx/shared';
import { ShelfPacker } from './atlasPack.js';
import { type BillboardClock } from './billboardMaterial.js';
export declare const STATIC_PX = 32;
export declare const ATLAS_PAGE_PX = 2048;
export interface SpriteRef {
    page: number;
    u0: number;
    v0: number;
    u1: number;
    v1: number;
    /** World size in tiles. */
    w: number;
    h: number;
    /** Feet anchor: fraction across the width; fraction of height below the feet. */
    ax: number;
    ay: number;
}
/** What a painter needs to say about itself to be atlased. */
export interface PaintSpec {
    /** Canvas pixel size (outline ring included). */
    cw: number;
    ch: number;
    /** Feet anchor in canvas px (from left, from top). */
    ax: number;
    ay: number;
    /** Paint at canvas origin; the ring is applied afterwards. */
    paint: (ctx: CanvasRenderingContext2D) => void;
}
interface AtlasPage {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    packer: ShelfPacker;
    tex: THREE.CanvasTexture;
    dirty: boolean;
}
export declare class SpriteAtlas {
    private readonly ringPx;
    readonly pages: AtlasPage[];
    private readonly refs;
    private readonly scratch;
    private readonly scratchCtx;
    /** Confession counters. */
    sprites: number;
    uploads: number;
    constructor(ringPx?: number);
    get textureBytes(): number;
    private newPage;
    /** The sprite for `key`, painting it on first request. */
    get(key: string, spec: () => PaintSpec): SpriteRef;
    /** Upload dirty pages (at most once per frame per page). */
    flush(): void;
    dispose(): void;
}
/** True for a tile this lane stands up as a billboard. */
export declare function isStandingTile(tile: Tile): boolean;
export interface ChunkStatics {
    meshes: THREE.Mesh[];
    instances: number;
    dispose(): void;
}
/**
 * Stand up one chunk's trees and flora. `groundY(tx, ty)` gives the
 * feet height (tile centre). Returns one mesh per atlas page touched.
 */
export declare function buildChunkStatics(chunk: ChunkData, atlas: SpriteAtlas, clock: BillboardClock, groundY: (wx: number, wy: number) => number): ChunkStatics;
export {};
//# sourceMappingURL=sprites.d.ts.map