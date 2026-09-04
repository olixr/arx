/**
 * THE WORLD BEHIND THE DOOR (play3d S1) — the world-source seam.
 *
 * The 3D client never asks "what is this tile" of anything but a
 * WorldSource3D. S1 ships ONE implementation, StandaloneWorld: the real
 * `@arx/content` worldgen (WORLD_SEED, generateChunk) with the real
 * Dawnmead ZoneDef stamped over it by the SAME overlay law the server's
 * WorldSource applies (TILE_SKIP transparent, a flat zone levels the
 * ground under it, a zone with an elev layer stamps it verbatim). So
 * the skeleton renders the very tiles a player at spawn is served — no
 * server needed. S2 adds LiveWorld over ClientGame's streamed chunks;
 * everything above this seam is untouched by that swap.
 *
 * Edge-harmony: the zone's border profile is published to the worldgen
 * fields exactly as the server does at boot, so the meadow around the
 * village blends toward Dawnmead's hems the way it does live. Only
 * Dawnmead is registered here — the other towns' hems are far outside
 * the S1 ring, and registering all of content's zones would cost a
 * build of every map at page load.
 */
import { ChunkStore, type ChunkData, type Vec2 } from '@arx/shared';
import { type ZoneDef } from '@arx/content';
export interface WorldSource3D {
    /** The chunk, generated/fetched on demand. */
    ensure(cx: number, cy: number): ChunkData;
    /** The chunk if already present (no generation side-effect). */
    peek(cx: number, cy: number): ChunkData | undefined;
    groundAt(tx: number, ty: number): number | undefined;
    detailAt(tx: number, ty: number): number;
    elevAt(tx: number, ty: number): number;
    isSolid(tx: number, ty: number): boolean;
    isRamp(tx: number, ty: number): boolean;
    readonly spawn: Vec2;
    /** Human-readable source name for the HUD confession. */
    readonly label: string;
}
/** The server's overlay law, verbatim (worldSource.ts overlayZone). */
export declare function overlayZone(chunk: ChunkData, zone: ZoneDef): void;
export declare class StandaloneWorld extends ChunkStore implements WorldSource3D {
    private readonly seed;
    readonly label: string;
    readonly spawn: Vec2;
    private readonly zones;
    /** Chunks generated so far — the HUD's "world" confession. */
    generated: number;
    constructor(seed?: number, zones?: ZoneDef[]);
    ensure(cx: number, cy: number): ChunkData;
    peek(cx: number, cy: number): ChunkData | undefined;
    groundAt(tx: number, ty: number): number | undefined;
    detailAt(tx: number, ty: number): number;
    elevAt(tx: number, ty: number): number;
    isSolid(tx: number, ty: number): boolean;
    isRamp(tx: number, ty: number): boolean;
}
//# sourceMappingURL=world.d.ts.map