/**
 * THE PAINTED WORLD STANDS UP (play3d S1; S3 review fixes) — the sprite
 * systems.
 *
 * Two kinds of billboard, one law (billboard.ts):
 *
 * STATICS — trees, saplings, wild flora (props/FX follow via the same
 * door). The production painters (trees.ts paintTree, crops.ts
 * paintPlant) are called ONCE per distinct model into a shelf-packed
 * ATLAS PAGE (2048², sRGB, mipmapped), ringed with the outline law.
 * THE PAGE IS UPLOADED ONCE: it goes resident blank the moment it is
 * minted (`Backend.prepareTexture`), and every sprite landed after
 * that is a SUB-RECT upload of its own canvas (`Backend.blit`) — the
 * page never re-uploads its 16 MB because one more tree variant walked
 * into view. The page canvas is still painted as the CPU mirror the
 * renderer re-uploads from after a context loss. The shelf pad is
 * 8 px: with mips, a 2 px pad bleeds neighbours from level 2 on.
 * Each chunk then owns one InstancedBufferGeometry per atlas page it
 * touches: one draw call per (chunk, page). Eviction disposes the
 * instance buffers; the atlas is shared and stays.
 *
 * ENTITIES live in entityBillboard.ts (S2 moved them out): a per-body
 * canvas painted by the production rigs and uploaded only on change.
 *
 * Pixel density: statics at 32 px/tile (the 2D game's TILE_PX).
 */
import * as THREE from 'three';
import { Tile, type ChunkData } from '@arx/shared';
import { ShelfPacker } from './atlasPack.js';
import { type BillboardClock, type BillboardFactory } from './billboard.js';
import type { Backend } from './stageBackend.js';
export declare const STATIC_PX = 32;
export declare const ATLAS_PAGE_PX = 2048;
/** Shelf pad between sprites — wide enough that mip level 3 stays clean. */
export declare const ATLAS_PAD_PX = 8;
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
/** A sprite painted on the page's CPU mirror, waiting for its sub-rect upload. */
interface PendingRect {
    canvas: HTMLCanvasElement;
    x: number;
    y: number;
}
interface AtlasPage {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    packer: ShelfPacker;
    tex: THREE.CanvasTexture;
    pending: PendingRect[];
}
export declare class SpriteAtlas {
    private readonly backend;
    private readonly ringPx;
    readonly pages: AtlasPage[];
    private readonly refs;
    /** Confession counters: sprites landed, page uploads (one per page), sub-rect blits. */
    sprites: number;
    uploads: number;
    blits: number;
    constructor(backend: Backend, ringPx?: number);
    get textureBytes(): number;
    private newPage;
    /** The sprite for `key`, painting it on first request. */
    get(key: string, spec: () => PaintSpec): SpriteRef;
    /** Land the pending sprites: sub-rect blits, one mip regen per page per flush. */
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
export declare function buildChunkStatics(chunk: ChunkData, atlas: SpriteAtlas, clock: BillboardClock, billboards: BillboardFactory, groundY: (wx: number, wy: number) => number): ChunkStatics;
export {};
//# sourceMappingURL=sprites.d.ts.map