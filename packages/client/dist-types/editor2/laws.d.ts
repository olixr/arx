/**
 * THE VISIBLE LAWS — Map Studio v2 Phase 5. Pure readings of the zone
 * laws the save-time validator enforces, cheap enough to run under the
 * cursor and every frame: the stair predicate (verbatim from
 * ZoneBuilder.validateStairs, with its reasons), the auto-fence line
 * (every FENCEABLE tile with a lower 8-neighbor becomes Cliff at
 * save; a non-fenceable one REFUSES the save), and the ramp-gated
 * reachability flood. The validator remains the one gate — these are
 * its light thrown forward onto the bench.
 */
import type { ZoneDef } from '@arx/content';
/** ZoneBuilder.FENCEABLE, mirrored (private there; keep in sync). */
export declare const FENCEABLE: ReadonlySet<number>;
/** The doorway tiles THE DOOR-OPENS-ONTO-A-ROOM law inspects. */
export declare const DOORWAY_TILES: ReadonlySet<number>;
/**
 * The stairs law, verbatim from ZoneBuilder.validateStairs — null when
 * a Ramp may stand at (x,y), else WHY not (the status bar's words).
 */
export declare function stairLegalAt(z: ZoneDef, x: number, y: number): string | null;
export interface FenceCell {
    x: number;
    y: number;
    /** True = auto-fence paves it to Cliff at save; false = it REFUSES. */
    ok: boolean;
}
/**
 * THE FENCE LINE, LIVE: within a LOCAL rect, every tile with a lower
 * 8-neighbor (the high side of a boundary) that is not already solid
 * and not a stair. FENCEABLE ones become Cliff on save; the rest are
 * the exact cells the validator will name.
 */
export declare function fenceLine(z: ZoneDef, x0: number, y0: number, x1: number, y1: number): FenceCell[];
export interface ReachResult {
    /** LOCAL indices reachable from the spawn on foot. */
    reachable: Set<number>;
    /** Walkable but unreachable — the validator's complaint, mapped. */
    stranded: Set<number>;
    /** Where the flood started (local), or null without a spawn. */
    from: {
        x: number;
        y: number;
    } | null;
}
/**
 * THE REACH: flood from the zone spawn, 4-way, walkable = non-solid,
 * crossing a level change ONLY through a Ramp on either side — the
 * validator's own crossing rule.
 */
export declare function reachability(z: ZoneDef): ReachResult;
/** THE SHELF (draw-order strat) of a tile: crowns ride shelf 0. */
export declare function shelfAt(z: ZoneDef, x: number, y: number): number;
//# sourceMappingURL=laws.d.ts.map