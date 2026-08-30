/**
 * THE CHAMPION'S PLAQUE — the proximity read on a standing victory
 * banner: walk up, and the mark speaks its names.
 *
 * The SignHud plaque's contract, applied whole (speechBubbles copies
 * it too — this is the reference shape for world-anchored DOM):
 * caller owns proximity per frame; this owns fade, dwell, re-arm, and
 * the measure-ONCE-per-paint law (offsetWidth per frame = a forced
 * reflow beside every banner). Pointer-events none — reading is
 * passive and never gates input.
 *
 * The dress is NOT the sign's parchment: a broken camp's mark is a
 * monument, not a notice — smoked ink, a gold rule, the kicker in
 * the standard's accent, the champions' names in roll order.
 */
import type { TrophyWire } from '@arx/shared';
export declare class TrophyHud {
    private readonly plaque;
    private shownKey;
    private shownAt;
    private retired;
    private plaqueW;
    private plaqueH;
    private lastTransform;
    private lastClamped;
    constructor();
    /**
     * Per-frame: show the plaque over `t` at screen point (sx, sy), or
     * pass null when no banner is near.
     */
    update(t: TrophyWire | null, sx?: number, sy?: number): void;
    private paint;
}
//# sourceMappingURL=trophyPlaque.d.ts.map