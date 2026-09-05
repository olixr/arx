import { type CollisionSource, type InputFrame, type TravelKind, type Vec2 } from '@arx/shared';
/**
 * THE CROSSING, mirrored: the movement a cast carries. A `blink`
 * leaves through the shared teleport resolver on the cast frame; the
 * traversal kinds walk a seq-window road — one transit step per
 * frame at the kind's speed, the sticks suppressed while the road
 * owns the body, exactly the window the server's tickTransits walks
 * in the tick domain (the recorded bounded-drift class: both ends of
 * the road agree, the middle folds through the error offset).
 */
export interface CastMove {
    kind: TravelKind;
    dirX: number;
    dirY: number;
    dist: number;
}
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
    /**
     * Unacked frames, each stamped with the SPEED it was first simmed at
     * — reconcile replays with the frame's own historical speed, never
     * today's (a mid-flight ride/chill change used to mis-replay the
     * whole queue at the new multiplier). Rooting is re-judged live at
     * replay instead: it is seq-deterministic, and a root learned LATE
     * (a charged cast's fire message) must still root the frames it
     * covers.
     */
    private pending;
    private errX;
    private errY;
    /** Most recent locally-committed ability cast, mirrored from the
     * server's rules so casts don't rubber-band: movement freezes for the
     * commitment window, and dash Arts move the body on the cast frame. */
    private lastCastSeq;
    private lastCastFreeze;
    private lastCastMove;
    /**
     * Equipped weapon style ('archery' slows movement while Attack is held
     * — the braced draw stance). Must mirror the server's view; ClientGame
     * updates it from equip messages.
     */
    weaponStyle: string | null;
    /**
     * THE PREDICTOR LEARNS ITS LEGS: the steady speed multiplier over
     * base — saddle, tonics, stride enchants, composed server-side by
     * the one law (rideSpeedMult) and mirrored here via S2CRide. Before
     * this mirror existed the predictor ran at base speed and mounted
     * prediction would have rubber-banded every frame.
     */
    speedMult: number;
    /**
     * THE PREDICTOR FEELS THE PAGES (statusBook Phase 3, generalizing
     * THE PREDICTOR FEELS THE COLD): the movement factor of every
     * status riding the own body — chill's slow, the holds' stone feet
     * — derived from the same STATUS_BOOK pages the server folds
     * (moveFactorOfBits off the own snapshot's status word). Without it
     * a slowed player over-predicts for the state's whole life and
     * rubber-bands every frame. One RTT stale at the edges, honest for
     * the duration.
     */
    statusMoveFactor: number;
    /**
     * Drawn-bow walk factor with perks folded (Longstride) — mirrored
     * from S2CRide; the bare constant is only the fallback.
     */
    drawFactor: number;
    constructor(collision: CollisionSource, speed: number);
    reset(pos: Vec2): void;
    /** ClientGame commits a cast on input frame `seq`. */
    registerCast(seq: number, freezeTicks: number, move: CastMove | null): void;
    /**
     * THE TRAVELED ROAD, mirrored: the frames whose legs the road owns
     * — [cast frame, cast frame + duration). The cast frame itself
     * still walks its normal step (the server processed that frame's
     * stick before the press), so only the LATER window frames zero
     * their input speed; every window frame takes its transit step.
     */
    private roadOwns;
    /** The cast's movement on this frame: the blink door or one road step. */
    private applyCastMove;
    /** Rooted while committed to a cast (the frames after the cast frame). */
    private rooted;
    /**
     * Per-frame speed — every factor the server applies, mirrored:
     * draw-slow (perk-folded), the steady ride mult, and the riding
     * pages' feet (chill, the holds).
     */
    private frameSpeed;
    /** The shared per-frame move: the normal step + a cast's own move. */
    private simFrame;
    applyInput(frame: InputFrame): void;
    reconcile(authoritative: Vec2, lastProcessedSeq: number): void;
    /** Call once per render frame; decays the correction offset. */
    decayError(frameDt: number): void;
    /** Smooth render position: tick-interpolated + correction offset. */
    renderPos(): Vec2;
}
//# sourceMappingURL=prediction.d.ts.map