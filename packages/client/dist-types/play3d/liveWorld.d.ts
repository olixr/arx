/**
 * THE LIVE WORLD (play3d S2) — WorldSource3D over ClientGame.
 *
 * ClientGame already owns the streamed truth: its ChunkStore fills as
 * the server deals chunks around the body, tile patches land in place
 * with a `rev` bump (own content) or a fringe bump (a neighbour's edge
 * changed — the blob halo reads across borders), and a plane crossing
 * drops the store whole. This source adds nothing to that; it only
 * answers the streamer's questions from the live store and refuses
 * (`ready` false) for a chunk the wire has not delivered yet, so the
 * ground never stands up as an empty field that would need tearing
 * down a frame later.
 *
 * Absent-chunk answers follow the 2D client: elev 0, ground undefined
 * (solid to a collider), so a heightfield at the streaming edge slopes
 * to the meadow plane and the body cannot walk off into nothing.
 */
import { type ChunkData, type Vec2 } from '@arx/shared';
import type { ClientGame } from '../game/clientGame.js';
import type { WorldSource3D } from './world.js';
export declare class LiveWorld implements WorldSource3D {
    private readonly game;
    readonly label: string;
    constructor(game: ClientGame);
    get spawn(): Vec2;
    ensure(cx: number, cy: number): ChunkData;
    peek(cx: number, cy: number): ChunkData | undefined;
    ready(cx: number, cy: number): boolean;
    groundAt(tx: number, ty: number): number | undefined;
    detailAt(tx: number, ty: number): number;
    elevAt(tx: number, ty: number): number;
    isSolid(tx: number, ty: number): boolean;
    isRamp(tx: number, ty: number): boolean;
    /** The chunk coordinates of a world tile (streaming helpers). */
    static chunkOf(t: number): number;
}
//# sourceMappingURL=liveWorld.d.ts.map