import type { ZoneDef } from '@devcraft/content';
import type { PlacementRef } from './state.js';
/**
 * Placement geometry: hit-testing and shared accessors for the
 * placement kinds a zone carries — portals, NPC spawn clusters, named
 * actor posts, signs, and the world spawn. All coordinates here are LOCAL
 * zone tiles (floats for hit tests); the zone stores world coords.
 */
/** Local position of a placement's anchor (tile-center space). */
export declare function placementPos(zone: ZoneDef, ref: PlacementRef): {
    x: number;
    y: number;
} | null;
export declare function placementLabel(zone: ZoneDef, ref: PlacementRef): string;
export declare function sameRef(a: PlacementRef | null, b: PlacementRef | null): boolean;
/**
 * The placement under a local float coordinate, nearest-first.
 * Cluster centers hit inside 0.6 tiles; ring edges are a separate
 * affordance (clusterEdgeAt) so a big ring never swallows clicks.
 */
export declare function placementAt(zone: ZoneDef, fx: number, fy: number): PlacementRef | null;
/** Cluster whose RING EDGE is under the cursor (resize affordance). */
export declare function clusterEdgeAt(zone: ZoneDef, fx: number, fy: number, tol: number): number | null;
/** Move a placement's anchor to a local tile (integers — authored law). */
export declare function movePlacement(zone: ZoneDef, ref: PlacementRef, lx: number, ly: number): void;
/** Remove a placement (the world spawn simply clears). */
export declare function deletePlacement(zone: ZoneDef, ref: PlacementRef): void;
//# sourceMappingURL=placements.d.ts.map