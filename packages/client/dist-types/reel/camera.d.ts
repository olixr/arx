import type { Renderer } from '../render/renderer.js';
import type { CamMove } from './types.js';
interface Subject {
    x: number;
    y: number;
    /** Aim in radians, for the follow lead. */
    aim: number;
}
export declare class CamRig {
    private readonly renderer;
    /** The settled camera — what the spring chases. */
    private tx;
    private ty;
    private tzoom;
    /** The live camera — what the renderer is handed. */
    private x;
    private y;
    private zoom;
    private vx;
    private vy;
    private vz;
    private move;
    /** Move-local clock, seconds since the move was handed over. */
    private moveT;
    /** Where the camera stood when the current glide began. */
    private fromX;
    private fromY;
    private fromZoom;
    /** How hard the spring pulls (1/s). Higher = tighter, less weight. */
    stiffness: number;
    /** Hand-held energy, 0..1. */
    handheld: number;
    /** The always-on drift; a shot never turns this off. */
    breath: number;
    private clock;
    constructor(renderer: Renderer);
    /** Hand the rig a new move; the glide starts from wherever it is. */
    set(move: CamMove): void;
    /**
     * One frame. `subject` is the player; `foe` is whatever the shot's
     * followFoe/faceFoe picker settled on (null when there is none).
     */
    step(dt: number, subject: Subject, foe: {
        x: number;
        y: number;
    } | null): void;
    /** Give the camera back to the game. */
    release(): void;
}
export {};
//# sourceMappingURL=camera.d.ts.map