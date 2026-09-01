export interface KoboldLook {
    /** Hide base — each variant weathered its own tunnel. */
    hide: string;
    /** Pale under-hide: jaw, muzzle underside, the tail's low edge. */
    belly: string;
    /** The lit eye bead — small, bright, watching. */
    eye: string;
    /** The bare nose pad at the snout tip. */
    nose: string;
    /**
     * Ragged mane shag over crown and nape; undefined = the digger's
     * short bristle scruff instead.
     */
    mane?: string;
    /** Frame multiplier: jaw mass, ear dish, tail girth. */
    heavy: number;
}
/** The inner ear membrane — thin skin, always flesh-pink. */
export declare const KOBOLD_EAR_INNER = "#c78e7f";
export declare const KOBOLD_LOOKS: Record<string, KoboldLook>;
/** Variant lookup with the rank-and-file as the unknown-id fallback. */
export declare function koboldLook(defId: string): KoboldLook;
/**
 * A tapered filled ribbon along a quadratic spine — the law learned on
 * the ram's horns: curved mass reads as carved form only when drawn as
 * a filled shape with an outline, never as a stroke chain. Width
 * tapers base→tip; returns the sampled spine so callers can seat
 * details on it.
 */
export declare function scaleRibbon(ctx: CanvasRenderingContext2D, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, w0: number, fill: string, outline: string): Array<{
    x: number;
    y: number;
    px: number;
    py: number;
    w: number;
}>;
export interface KoboldHeadFrame {
    s: number;
    headX: number;
    headY: number;
    hw: number;
    hh: number;
    cut: number;
    fx: number;
    fy: number;
    profileK: number;
    backK: number;
    lead: number;
    hurt: boolean;
    nowMs: number;
    /** 0..1 jaw drop — the combat yip-and-snap; 0 keeps the jaw seated. */
    gape: number;
}
/**
 * The kobold head, drawn in the head block's own frame. Reads kobold
 * by SILHOUETTE first: a low cranium between big dish ears under the
 * candle crown, and a LONG snout that leads the facing — hanging low
 * face-on, run out level and drooping at profile — ending in a bare
 * nose pad with whiskers and buck incisors. The pale mandible drops
 * with the gape. From behind there is NO face: hide plates, the nape,
 * the ears' backs, and the scruff or mane riding the crown.
 */
export declare function paintKoboldHead(ctx: CanvasRenderingContext2D, kb: KoboldLook, f: KoboldHeadFrame): void;
export interface KoboldHumpFrame {
    s: number;
    tw: number;
    th: number;
    fx: number;
    backK: number;
    hurt: boolean;
}
/**
 * The shoulder hump: the bent back the whole species carries, drawn
 * in the torso's local frame AFTER the garment and BEFORE the head —
 * a rounded mass rising behind the neck that the low-slung skull sinks
 * into. It trails the facing at profile and reads as bowed shoulders
 * face-on and from behind.
 */
export declare function paintKoboldHump(ctx: CanvasRenderingContext2D, kb: KoboldLook, garment: string, f: KoboldHumpFrame): void;
export interface KoboldTailFrame {
    s: number;
    fx: number;
    fy: number;
    profileK: number;
    backK: number;
    lead: number;
    nowMs: number;
    runF: number;
    poleX: number;
    hurt: boolean;
}
/**
 * The naked tail — THE LIVING WHIP. Drawn in the torso's squashed
 * local frame BEFORE the garment so the root always tucks behind the
 * body. A wave travels root-to-tip on the wall clock, quickening and
 * widening with the gait, so the tail is never a dead ribbon: it
 * snakes at a stand, lashes at a run. Hide at the root eases to bare
 * flesh at the tip. It trails the facing — run out long at profile,
 * hanging low and swaying seen from behind, tip peeking past the hip
 * face-on.
 */
export declare function paintKoboldTail(ctx: CanvasRenderingContext2D, kb: KoboldLook, f: KoboldTailFrame): void;
//# sourceMappingURL=rigKobold.d.ts.map