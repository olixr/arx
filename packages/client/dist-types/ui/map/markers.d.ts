import type { DiscoveryWire } from '@arx/shared';
/** One ledger mark at screen (x, y); r is the sigil half-size in px. */
export declare function drawDiscoveryMarker(ctx: CanvasRenderingContext2D, d: DiscoveryWire, x: number, y: number, r: number, hot?: boolean): void;
/** The one active waypoint: a planted banner with a soft beacon pulse. */
export declare function drawWaypointFlag(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, pulse01: number): void;
/**
 * Where the reader last fell: a solid bone skull over the spilled
 * pack, breathing a slow ember ring (the waypoint beacon's grim
 * cousin). Personal like the flag — nobody else's chart carries it.
 */
export declare function drawDeathMark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, pulse01: number): void;
/**
 * The reader's own body: a gold compass needle at their heading, over
 * a quiet gold presence halo — the first thing the eye should find.
 * `pulse01` breathes the halo; pass `quiet` on the glass, where the
 * needle is always dead center and only needs a whisper.
 */
export declare function drawPlayerToken(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, dir: number, pulse01?: number, quiet?: boolean): void;
/** A fellow's identity ink — the tint their undressed rig would wear. */
export declare function partyColor(name: string): string;
/**
 * A party member: a kin-dot in their identity color. Round where the
 * reader's own token is an arrow — kin are companions, not headings —
 * in the same shader-ringed dialect on parchment and glass alike.
 */
export declare function drawPartyToken(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void;
/**
 * THE EDGE POINTER — when a mark the reader cares about (their own
 * body, the flag, the fall) sits off the folded chart, a solid
 * chevron rides the chart's edge aimed along the bearing, so nothing
 * personal is ever simply lost. Returns the clamped anchor so callers
 * can set a word beside it.
 */
export declare function drawEdgePointer(ctx: CanvasRenderingContext2D, cw: number, ch: number, x: number, y: number, color: string, label?: string): void;
/**
 * THE COMPASS ROSE — north is up, said out loud. A quiet bone-and-
 * brass star in the chart's corner; the N is set at draw time (text
 * does not survive the unit-box bake).
 */
export declare function drawCompassRose(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void;
/**
 * THE SCALE BAR — how far is that, in tiles (a tile is a stride).
 * Picks a round count that lands the bar near a hand's width.
 */
export declare function drawScaleBar(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void;
/**
 * THE QUEST INKS — the chart's errand colors, chosen to stay apart
 * from each other AND from the claimed personal inks (waypoint sky,
 * fall ember, player gold, brass towns) on parchment, glass, and the
 * danger wash alike. Six is plenty: the pane rarely shows more, and
 * assignment probes to a free ink when two errands collide.
 */
export declare const QUEST_INKS: ReadonlyArray<readonly [number, number, number]>;
/** One quest ink as a CSS color at the given presence. */
export declare function inkCss(ink: readonly [number, number, number], alpha: number): string;
/** The ink lifted toward bone for label text on the dark plate. */
export declare function inkLabelCss(ink: readonly [number, number, number]): string;
/**
 * The searching ground's ORGANIC rim — a closed loop whose radius
 * breathes with value noise sampled on a circle, so every ground is a
 * hand-sketched blob (never a compass circle) that holds its exact
 * shape frame over frame: the seed is the ground's identity, and the
 * noise walks the same lattice every draw.
 */
export declare function questGroundPath(ctx: CanvasRenderingContext2D, seed: number, rPx: number, wobble: number): void;
/**
 * THE SEARCHING GROUND — an errand's "somewhere hereabouts", drawn in
 * its quest's ink. A soft wash inside a walking dashed rim over a
 * dark hairline seat, the whole shape a seeded hand-drawn blob.
 * `sure: false` is a RUMOR — looser silhouette, fainter presence, and
 * a second loose rim pass like a cartographer sketching over their
 * own line. `focus` breathes; `quiet` mutes for the traveler's glass.
 */
export declare function drawQuestGround(ctx: CanvasRenderingContext2D, x: number, y: number, rPx: number, ink: readonly [number, number, number], seed: number, pulse01: number, opts?: {
    sure?: boolean;
    focus?: boolean;
    quiet?: boolean;
}): void;
/**
 * THE KNOWN DOOR — a person or place somebody could point a finger
 * at: a firm, small, TRUE circle (the one shape a sure hand draws)
 * with a solid rim and a seated heart-dot. Still a neighborhood — the
 * server fuzzes every center — but the line does not wander.
 */
export declare function drawKnownSpot(ctx: CanvasRenderingContext2D, x: number, y: number, rPx: number, ink: readonly [number, number, number], pulse01: number, opts?: {
    focus?: boolean;
    quiet?: boolean;
}): void;
/** A serif nameplate on a dark eased plate — the cartographer's hand. */
export declare function drawMapLabel(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color?: string, size?: number): void;
/** The waypoint's sky ink and the fall's ember — shared with the HUD. */
export declare const WAYPOINT_INK = "#7ec8e3";
export declare const DEATH_INK = "#d96c4f";
export declare const PLAYER_INK = "#f2c94c";
//# sourceMappingURL=markers.d.ts.map