/**
 * THE PROVING GROUND — the codex's live diagram of what an art DOES
 * (the Techniques room rebuilt, 2026-08-15).
 *
 * A stat card can say "Range 5 · Radius 2.6"; the proving ground DRAWS
 * it: a caster figure stands on a measured floor, the aim runs down a
 * tile ruler, and the cast's true shape — arc, fan, nova, beam, chain,
 * dash, field — is painted in the art's own FX palette (fxStyleFor:
 * the hotbar plate, the battlefield detonation and this diagram are
 * one voice). Dummies stand where bodies would; knockback pushes them,
 * vortexes pull them, statuses wisp over them.
 *
 * Laws:
 * - THE RIG IS THE RULER: the caster figure is one tile tall, the
 *   floor is ticked in tiles, so every distance reads in the world's
 *   own unit (art-scale law).
 * - ONE VOICE: every color but the chrome comes from the ability's
 *   FxStyle. The chrome (ink lines, parchment numerals) comes from
 *   the one material truth.
 * - MOTION IS A GRACE NOTE: the loop breathes at ~30fps only while
 *   the room stands open and the Interface-motion setting allows it;
 *   with motion off, one still frame tells the whole story.
 */
import type { AbilityDef } from '@arx/shared';
export interface ProvingGround {
    root: HTMLElement;
    /** Lay a new subject on the ground (honed def). Null clears it. */
    show(ab: AbilityDef | null): void;
    /** Stop the loop and release the canvas. */
    destroy(): void;
}
export declare function provingGround(): ProvingGround;
//# sourceMappingURL=artDiagram.d.ts.map