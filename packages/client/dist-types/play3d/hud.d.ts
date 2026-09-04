/**
 * THE CONFESSION (play3d S1) — a DOM overlay that tells the truth about
 * the frame: rAF interval (EMA + worst of the last 2 s), Three's own
 * renderer.info (draw calls, triangles, programs, geometries, textures)
 * and this client's ledgers (chunks, bakes in flight, texture bytes,
 * standing instances, entity repaints). Updated at 4 Hz so the HUD
 * itself never becomes the frame cost it reports.
 *
 * Headless numbers are INDICATIONS ONLY: a headless rAF is capped and
 * jittery, so "frame ms" from Playwright is never an fps claim.
 */
export interface ConfessionExtra {
    [key: string]: string | number;
}
export declare class Confession {
    private readonly el;
    private ema;
    private worst;
    private worstAt;
    private lastFlush;
    private frames;
    private lastFpsAt;
    private fps;
    /** The last rendered lines — read by the Playwright probe. */
    lines: string[];
    constructor(parent: HTMLElement);
    /** Feed one frame's wall interval (ms). */
    frame(ms: number, nowMs: number): void;
    /** True when the next `update` will repaint — build its lines only then. */
    due(nowMs: number): boolean;
    /** Repaint the overlay at most every 250 ms. */
    update(nowMs: number, info: {
        render: {
            calls: number;
            triangles: number;
        };
        memory: {
            geometries: number;
            textures: number;
        };
        programs: unknown[] | null;
    }, extra: ConfessionExtra): void;
    dispose(): void;
}
export declare function fmtBytes(b: number): string;
//# sourceMappingURL=hud.d.ts.map