/** Tiny pooled particle system — squares only, hard edges, no blur. */
export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
    gravity: number;
    /** Per-second velocity damping — lets dust billow out and settle. */
    drag: number;
    /** 0 = shrink over life (default); >0 = grow by this many tiles/sec. */
    grow: number;
    /**
     * Ground-hugging particles (footfall dust) join the renderer's
     * y-sort as world items instead of the overlay pass — a trail left
     * behind a south-running body must paint UNDER the body.
     */
    ground: boolean;
}
export declare class Particles {
    private readonly pool;
    burst(x: number, y: number, count: number, colors: string[], opts?: {
        speed?: number;
        life?: number;
        size?: number;
        gravity?: number;
        up?: boolean;
        /** Emit in a cone around this angle (radians) instead of a circle. */
        dir?: number;
        spread?: number;
        /** Per-second velocity damping (dust rolls out and stops). */
        drag?: number;
        /** Tiles/sec the block grows instead of shrinking (billowing dust). */
        grow?: number;
        /** Y-sort with the world (ground dust) instead of drawing on top. */
        ground?: boolean;
    }): void;
    update(dt: number): void;
    /** The overlay pass: everything airborne. Ground particles are
     * skipped here — the renderer y-sorts them into the world. */
    draw(ctx: CanvasRenderingContext2D, worldToScreen: (wx: number, wy: number) => {
        x: number;
        y: number;
    }, scale: number): void;
    drawOne(ctx: CanvasRenderingContext2D, p: Particle, worldToScreen: (wx: number, wy: number) => {
        x: number;
        y: number;
    }, scale: number): void;
    /** Live particles flagged for the world y-sort. */
    groundParticles(): IterableIterator<Particle>;
}
//# sourceMappingURL=particles.d.ts.map