import type { DiscoveryWire } from '@arx/shared';
/** One ledger mark at screen (x, y); r is the sigil half-size in px. */
export declare function drawDiscoveryMarker(ctx: CanvasRenderingContext2D, d: DiscoveryWire, x: number, y: number, r: number, hot?: boolean): void;
/** The one active waypoint: a planted banner with a soft beacon pulse. */
export declare function drawWaypointFlag(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, pulse01: number): void;
/**
 * Where the reader last fell: a little bone-ink skull over the spilled
 * pack, breathing a slow ember ring (the waypoint beacon's grim
 * cousin). Personal like the flag — nobody else's chart carries it.
 */
export declare function drawDeathMark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, pulse01: number): void;
/** The reader's own body: a gold compass-arrow token at their heading. */
export declare function drawPlayerToken(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, dir: number): void;
/** A fellow's identity ink — the tint their undressed rig would wear. */
export declare function partyColor(name: string): string;
/**
 * A party member: a kin-dot in their identity color. Round where the
 * reader's own token is an arrow — kin are companions, not headings —
 * with the same dark rim and one soft under-shade so it sits in the
 * sigil dialect on parchment and glass alike.
 */
export declare function drawPartyToken(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void;
/**
 * THE SEARCH RING — an errand's "somewhere hereabouts". A soft gold
 * wash inside a slowly walking dashed rim, breathing one quiet beacon
 * ring: deliberately loose, because the ring promises a neighborhood,
 * never a spot. `quiet` mutes it for the traveler's glass.
 */
export declare function drawSearchRing(ctx: CanvasRenderingContext2D, x: number, y: number, rPx: number, pulse01: number, quiet?: boolean): void;
/** A serif nameplate over dark backing — the cartographer's hand. */
export declare function drawMapLabel(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color?: string, size?: number): void;
//# sourceMappingURL=markers.d.ts.map