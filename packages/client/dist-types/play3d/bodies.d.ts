/**
 * THE LIVING STAND UP (play3d S2) — ClientGame's entities as billboards.
 *
 * Every frame the stage walks `game.entities`, samples each body on
 * the same timeline the 2D client renders at (`game.renderTime()`
 * through the interp buffer's smoothed sample — one law, both doors),
 * derives its BodyKind from the meta (players and named townsfolk
 * broadcast an appearance; the bestiary paints from its def), and
 * hands the card its state. Bodies that left the set are disposed the
 * frame they vanish; the own body rides the predictor's render
 * position with `game.aim` for its facing, exactly like main.ts.
 *
 * What stands: Player, Npc (humanoid or beast). Not yet: ItemDrop,
 * ResourceNode, Prop, Projectile, BuildSite (the S2 ledger — props
 * are Workstream 2's PropKind registry; drops/projectiles are FX
 * lanes). Dead bodies (hp 0 / Dead / Lie) are hidden, not ragdolled.
 */
import * as THREE from 'three';
import type { ClientGame } from '../game/clientGame.js';
import type { BillboardClock } from './billboardMaterial.js';
export declare class EntityStage {
    private readonly scene;
    private readonly clock;
    private readonly groundY;
    private readonly recs;
    private own;
    private ownEquipSrc;
    private ownKind;
    private readonly fallback;
    /** Confession. */
    bodies: number;
    paints: number;
    constructor(scene: THREE.Scene, clock: BillboardClock, groundY: (wx: number, wy: number) => number);
    private humanoidFromAppearance;
    private kindFor;
    private ownKindFor;
    private make;
    private drop;
    /** One frame: sync the set to the game, advance and paint what is visible. */
    update(game: ClientGame, dt: number, nowMs: number, camYaw: number, frustum: THREE.Frustum): void;
    private fallbackFor;
    /** Drop every body (plane crossing / sign-out). */
    reset(): void;
    dispose(): void;
}
//# sourceMappingURL=bodies.d.ts.map