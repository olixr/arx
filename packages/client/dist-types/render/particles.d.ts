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
    }): void;
    update(dt: number): void;
    draw(ctx: CanvasRenderingContext2D, worldToScreen: (wx: number, wy: number) => {
        x: number;
        y: number;
    }, scale: number): void;
}
//# sourceMappingURL=particles.d.ts.map