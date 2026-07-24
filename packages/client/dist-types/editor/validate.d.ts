import { type ZoneDef } from '@devcraft/content';
/**
 * The editor's validator IS the ZoneBuilder — the same laws every
 * shipped map passed at build time: flat two-tile border apron, the
 * camera-facing stair predicate, auto-grown cliff fences, and spawn
 * reachability across levels. The zone is replayed cell-by-cell
 * through a builder and build() renders the verdict. Ramp tiles are
 * replayed as stairs() — in this world a stair IS the only legal gap
 * in a fence, so painting one invokes the law.
 */
export interface ValidationResult {
    ok: boolean;
    error?: string;
    /** Ground after auto-fencing, when it differs from the input. */
    fencedGround?: Uint16Array;
    /** How many tiles the auto-fence would add. */
    fenceAdded: number;
}
export declare function validateZone(zone: ZoneDef): ValidationResult;
//# sourceMappingURL=validate.d.ts.map