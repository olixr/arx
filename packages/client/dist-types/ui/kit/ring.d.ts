/**
 * THE RING GAUGE — radial progress for emblems and crests
 * (The Grand Refit, Phase 2). The "show, don't spell" workhorse:
 * a skill's climb, a school's level, a bond's warmth read as a filled
 * ring around the thing itself, not as a sentence beside it.
 *
 * Flat-facet law: the ring is a hard-edged arc (butt caps, no glow),
 * an SVG stroke over a recessed channel — the gauge vocabulary bent
 * into a circle. Size rides `--ring-size` (rem) so it obeys the one
 * ruler; the center is a slot the caller fills (a numeral, a crest).
 */
export interface RingGauge {
    root: HTMLElement;
    /** The center slot — put a numeral or an emblem in it. */
    center: HTMLElement;
    /** Set the fill fraction [0,1]; snaps into the flat-facet world. */
    set(frac: number): void;
}
export declare function ringGauge(frac: number, opts?: {
    size?: string;
    tone?: string;
    track?: boolean;
}): RingGauge;
//# sourceMappingURL=ring.d.ts.map