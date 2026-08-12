/**
 * GHOST WALK — Map Studio v2 Phase 6. Press Q and a real player body
 * drops at the view's center; WASD steers it through the TRUE
 * collision of the stage's chunks (walls stop you, water wades you —
 * the shared stepMovement, the game's own law); the camera follows.
 * The Mario-Maker instant feel-check, without leaving the bench.
 * Not a server session: nothing spawns, nothing saves, Esc or Q ends.
 */
import type { StagePeople } from './people.js';
import type { EditorStage } from './stage.js';
import type { Viewport } from './viewport.js';
export declare const GHOST_EID = 900000;
export declare class GhostWalk {
    private readonly stage;
    private readonly viewport;
    private readonly people;
    private readonly getZoneOrigin;
    active: boolean;
    private x;
    private y;
    private readonly held;
    private lastMs;
    constructor(stage: EditorStage, viewport: Viewport, people: StagePeople, getZoneOrigin: () => {
        x: number;
        y: number;
    });
    toggle(): void;
    begin(): void;
    end(): boolean;
    /** WASD while walking; true = the key was ours (swallow it). */
    keydown(code: string): boolean;
    keyup(code: string): void;
    /** Per-frame: the shared movement law over the stage's chunks. */
    update(nowMs: number): void;
}
//# sourceMappingURL=ghostWalk.d.ts.map