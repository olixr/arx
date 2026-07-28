import type { DiscoveryWire } from '@arx/shared';
/** One ledger mark at screen (x, y); r is the sigil half-size in px. */
export declare function drawDiscoveryMarker(ctx: CanvasRenderingContext2D, d: DiscoveryWire, x: number, y: number, r: number, hot?: boolean): void;
/** The one active waypoint: a planted banner with a soft beacon pulse. */
export declare function drawWaypointFlag(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, pulse01: number): void;
/** The reader's own body: a gold compass-arrow token at their heading. */
export declare function drawPlayerToken(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, dir: number): void;
/** A serif nameplate over dark backing — the cartographer's hand. */
export declare function drawMapLabel(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color?: string, size?: number): void;
//# sourceMappingURL=markers.d.ts.map