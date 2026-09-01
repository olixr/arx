export interface RecordingCtx {
    /** fill() + fillRect() calls. */
    fills: number;
    /** Fills laid while fillStyle read as a dark ink (#2…). */
    darkFills: number;
    /** Running sum of every finite numeric argument — a cheap geometry
     *  fingerprint: two runs that draw the same shapes sum the same. */
    coordSum: number;
    /** Every distinct method name the painter touched, in call order. */
    calls: string[];
    fillStyle: string | CanvasGradient | CanvasPattern;
    strokeStyle: string | CanvasGradient | CanvasPattern;
    lineWidth: number;
    globalAlpha: number;
}
/** A CanvasRenderingContext2D whose receipts a test can read back. */
export type TestCtx = CanvasRenderingContext2D & RecordingCtx;
/**
 * Build the recording context. Every method is a no-op that NaN-checks
 * its numeric arguments; `fill`/`fillRect` also count. Properties set by
 * the painter (fillStyle, transforms…) are stored and read back as-is.
 */
export declare function recordingCtx(): TestCtx;
//# sourceMappingURL=testkit.d.ts.map