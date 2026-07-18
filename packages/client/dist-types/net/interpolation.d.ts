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
}
/**
 * Per-remote-entity buffer of authoritative samples. Rendering samples
 * the buffer slightly in the past (INTERP_DELAY_MS) so there is almost
 * always a pair of snapshots to interpolate between.
 */
export declare class InterpBuffer {
    private samples;
    push(s: InterpSample): void;
    latest(): InterpSample | undefined;
    sampleAt(t: number): InterpSample | null;
}
//# sourceMappingURL=interpolation.d.ts.map