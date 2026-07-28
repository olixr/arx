import { type CollisionSource, type InputFrame, type Vec2 } from '@arx/shared';
/**
 * Client-side prediction for the local player. Inputs are applied
 * immediately and kept until the server acknowledges them; on each
 * snapshot we rewind to the authoritative state and replay unacked
 * inputs. Corrections are folded into a decaying error offset so they
 * render as a soft nudge instead of a snap.
 *
 * Prediction advances in fixed 20 Hz steps, but frames render at
 * 60–144 Hz — so `renderPos` interpolates between the previous and
 * current predicted states by the accumulator fraction (`renderAlpha`).
 * Without this the local player pops forward once per tick and holds
 * still between them while the smoothed camera glides — the classic
 * "my character is jittery but the world is smooth" artifact.
 */
export declare class Predictor {
    private readonly collision;
    speed: number;
    pos: Vec2;
    /** State one prediction step behind `pos` — the interpolation base. */
    private prev;
    /** 0..1 fraction through the current tick, set by the game loop. */
    renderAlpha: number;
    private pending;
    private errX;
    private errY;
    private lastDodgeSeq;
    /** Most recent locally-committed ability cast, mirrored from the
     * server's rules so casts don't rubber-band: movement freezes for the
     * commitment window, and dash Arts move the body on the cast frame. */
    private lastCastSeq;
    private lastCastFreeze;
    private lastCastDash;
    /** Fires when a dodge impulse applies locally (for whoosh/trail FX). */
    onDodge: ((x: number, y: number, mx: number, my: number) => void) | null;
    /**
     * Equipped weapon style ('archery' slows movement while Attack is held
     * — the braced draw stance). Must mirror the server's view; ClientGame
     * updates it from equip messages.
     */
    weaponStyle: string | null;
    constructor(collision: CollisionSource, speed: number);
    reset(pos: Vec2): void;
    /** ClientGame commits a cast on input frame `seq`. */
    registerCast(seq: number, freezeTicks: number, dash: {
        tiles: number;
        aim: number;
    } | null): void;
    private applyCastDash;
    /** Per-frame speed — drawing a bow brakes exactly like the server. */
    private frameSpeed;
    /** The shared per-frame move: normal step + optional dodge impulse. */
    private simFrame;
    applyInput(frame: InputFrame): void;
    reconcile(authoritative: Vec2, lastProcessedSeq: number): void;
    /** Call once per render frame; decays the correction offset. */
    decayError(frameDt: number): void;
    /** Smooth render position: tick-interpolated + correction offset. */
    renderPos(): Vec2;
}
//# sourceMappingURL=prediction.d.ts.map