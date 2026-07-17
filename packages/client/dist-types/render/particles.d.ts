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
    }): void;
    update(dt: number): void;
    draw(ctx: CanvasRenderingContext2D, worldToScreen: (wx: number, wy: number) => {
        x: number;
        y: number;
    }, scale: number): void;
}
//# sourceMappingURL=particles.d.ts.map