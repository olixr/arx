/**
 * Prop debris — the smash theatre.
 *
 * When a destructible prop bursts, the server sends ONE fx (impact
 * point + heading + kind) and swaps the tile; everything that flies
 * is simulated here, client-side, for free. Each kind breaks along
 * its own joinery — a barrel gives up staves, hoops, and its lid; a
 * crate sheds planks and corner posts; a chair loses the argument one
 * leg at a time — and every burst rolls its own counts, sizes, spins,
 * and speeds so no two breakages read alike.
 *
 * The chunks are honest little bodies: world-plane velocity plus a
 * vertical z with gravity, a couple of dampened bounces, and
 * axis-separated wall tests against the real collision field — smash
 * a barrel against a wall and its staves thud off the mass instead of
 * ghosting through. They lie where they fall for a few seconds, then
 * fade.
 *
 * Perf discipline is the particle engine's: pooled, swap-removed,
 * free-listed, capped with a rotating overwrite slot. Zero alloc once
 * warm, and a room-clearing rampage can never grow the draw bill.
 */
export declare const DEBRIS_CAP = 220;
export type SmashKind = 'barrel' | 'crate' | 'goods' | 'chair' | 'table' | 'bench' | 'bonepile' | 'crackedwall';
export interface DebrisChunk {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    rot: number;
    spin: number;
    len: number;
    wid: number;
    color: string;
    /** Lit stripe along the long axis — reads as a turned stave/plank. */
    stripe: string | null;
    /** Round chunks (lids, produce) draw as ellipses, not slabs. */
    round: boolean;
    settled: boolean;
    life: number;
    maxLife: number;
}
export declare class Debris {
    private readonly pool;
    private readonly free;
    private capCursor;
    private take;
    /**
     * Burst a prop at (x,y): chunks fly in a cone around `dir` — WITH
     * the blow, away from whoever swung it. `rand` is injectable so the
     * break-up laws are testable; live smashes ride Math.random and
     * every one rolls different.
     */
    smash(x: number, y: number, dir: number, kind: SmashKind, rand?: () => number): void;
    /**
     * A blow that DIDN'T finish the prop: a few small chips fly off the
     * impact, short-lived — the "it's working" feedback between hits on
     * durable furniture. Same bodies, smaller and briefer than a burst.
     */
    chip(x: number, y: number, dir: number, kind: SmashKind, rand?: () => number): void;
    /**
     * Step every chunk: gravity, bounce, and axis-separated wall tests
     * against the live collision field (the corpse-skid law) — debris
     * never crosses a wall, it thuds and drops.
     */
    update(dt: number, solid: (x: number, y: number) => boolean): void;
    /** Live chunks, for the renderer's world y-sort. */
    chunks(): IterableIterator<DebrisChunk>;
    drawOne(ctx: CanvasRenderingContext2D, c: DebrisChunk, worldToScreen: (wx: number, wy: number) => {
        x: number;
        y: number;
    }, scale: number, outlined?: boolean): void;
}
//# sourceMappingURL=debris.d.ts.map