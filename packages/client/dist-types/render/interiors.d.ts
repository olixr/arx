/**
 * INTERIOR DETECTION — derived, never authored. A building is any
 * region of tiles fully enclosed by INTERIOR_BOUNDARY_TILES (walls,
 * windowed walls, and doorways — a doorway-closed ring encloses;
 * arches and railings deliberately never bound a room). Because the
 * regions are flood-filled from the live tile grid, player-built
 * enclosures earn the cutaway wall, sun-shadow shelter, and warm
 * windows with zero server work, and a demolished wall un-rooms the
 * space the moment the patch lands.
 *
 * Regions are computed lazily per queried tile and cached until the
 * world changes (worldVersion bump ⇒ full clear; recompute is bounded
 * by MAX_REGION and only runs for tiles actually asked about).
 */
import { Tile } from '@devcraft/shared';
import type { ClientGame } from '../game/clientGame.js';
export interface InteriorRegion {
    id: number;
    /** Packed interior tile keys (floors AND furniture inside). */
    tiles: Set<number>;
    /** Packed boundary-wall tile keys (the ring, doorways included). */
    wallTiles: Set<number>;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    doorTiles: Array<{
        tx: number;
        ty: number;
    }>;
    /** Majority boundary material (facade dressing follows it). */
    wallMaterial: Tile;
    /** Facade story count from authored Detail.Story markers. */
    stories: 1 | 2 | 3;
    /** A hearth/campfire/furnace inside: windows glow warm at night. */
    hasHearth: boolean;
    elevLevel: number;
    seed: number;
}
export declare function packTile(tx: number, ty: number): number;
export declare class InteriorMap {
    private version;
    private readonly byTile;
    private nextId;
    /** Version gate: any world change invalidates every cached region. */
    beginFrame(version: number): void;
    /** The enclosed region containing this tile, or null for outdoors. */
    regionAt(game: ClientGame, tx: number, ty: number): InteriorRegion | null;
    private flood;
}
//# sourceMappingURL=interiors.d.ts.map