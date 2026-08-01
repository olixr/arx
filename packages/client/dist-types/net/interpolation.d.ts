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
export declare class InterpBuffer {
    private samples;
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
    sampleAt(t: number): InterpSample | null;
}
//# sourceMappingURL=interpolation.d.ts.map