export interface InterpSample {
    /** Server timeline, ms (serverTick * TICK_MS). */
    t: number;
    x: number;
    y: number;
    dir: number;
    pose: number;
    hpPct: number;
    /** STATUS_BIT bitfield (burn/chill/shock/bleed VFX). */
    status: number;
    /** NPC alert telegraph (ALERT_ICON_*): the ?/! over the head. */
    alert: number;
}
/** Shortest signed angular distance a→b, in (-π, π]. */
export declare function shortestAngle(a: number, b: number): number;
export declare class InterpBuffer {
    private samples;
    /**
     * BALLISTIC TRUTH (v9): projectiles carry their flight speed on the
     * enter meta. When set, sampling past the newest sample projects
     * along that sample's `dir` at this speed — exact for straight
     * shots, tracks the newest heading for curving ones (homing,
     * boomerang return), and works from a single sample, so a fresh
     * shot never freezes at its spawn point waiting for a pair.
     */
    ballisticSpeed: number | null;
    /** RENDER CONTINUITY state — see sampleSmoothed. */
    private smTime;
    private smOut;
    private smRawX;
    private smRawY;
    private smErrX;
    private smErrY;
    push(s: InterpSample): void;
    latest(): InterpSample | undefined;
    /**
     * RENDER CONTINUITY: sampleAt with the discontinuities hidden. A late
     * snapshot burst moves the sampled position in one visible snap —
     * extrapolation guessed, reality disagreed, or the buffer ran dry and
     * then refilled. Any frame-to-frame jump beyond plausible motion is
     * folded into a visual offset that decays with an 80ms half-life, so
     * the body GLIDES onto its corrected path instead of teleporting.
     * Real teleports (3+ tiles) still snap — nobody should watch a
     * neighbor slide across the map. Idempotent per timestamp: every
     * caller in one frame shares one answer.
     */
    sampleSmoothed(t: number): InterpSample | null;
    /**
     * True while sampleSmoothed is still bleeding off a correction
     * offset: the body is GLIDING onto its authoritative path, and the
     * glide is presentation, not travel. Consumers that turn motion into
     * matter (the worn-light trail and wake) gate on this, so a standing
     * body taking a sub-3-tile correction cannot shed footprints at the
     * ~13 t/s the glide briefly reads as.
     */
    gliding(): boolean;
    sampleAt(t: number): InterpSample | null;
}
//# sourceMappingURL=interpolation.d.ts.map