/**
 * THE PACK — wolf, dire wolf, fey wolf and worg: the canid family, its ears and their chains.
 * Split out of rig.ts on the golems.ts template (foundations F3.4);
 * rig.ts re-exports everything here, so every lab, test and painter
 * keeps its old door.
 */
import type { DireWolfLook, FeyWolfLook } from './rig.js';
/**
 * The wolf: a lean predator prism — deep chest, tucked waist, shoulder
 * hump, dark saddle cape over pale underparts, erect ears, long
 * foreshortening muzzle, amber eyes and a bushy dark-tipped brush.
 */
export interface WolfLook {
    coat: string;
    saddle: string;
    under: string;
    earIn: string;
    eye: string;
    /** Body half-width (tiles); length comes from the BeastSpec. */
    bodyW: number;
    backH: number;
    /** Extra mass ramped up over the shoulders. */
    shoulderH: number;
    /** Belly height at the chest (deep) and the waist (tucked). */
    chestH: number;
    tuckH: number;
    headW: number;
    headH: number;
}
export declare const WOLF_LOOK: WolfLook;
/** Pre-resolved canid-ear tones — the painter never learns a species. */
export interface CanidEarStyle {
    /** The blade's frame fill, both faces. */
    fill: string;
    /** Pale inner fan, face-on only. */
    inner: string;
    /** Back cartilage seam. */
    seam: string;
}
/**
 * Paint one projected canid ear off a physics (or rest) chain — the
 * pricked blade every wolf-line head wears: straight tapered edges,
 * pale inner fan face-on, one cartilage seam behind, and the optional
 * NOTCH bitten from the trailing edge (the matriarch's history in
 * silhouette). Plain path calls so painter tests can walk every
 * coordinate.
 */
export declare function paintCanidEar(ctx: CanvasRenderingContext2D, pts: Array<{
    x: number;
    y: number;
}>, w0: number, st: CanidEarStyle, o: {
    front: boolean;
    hurt: boolean;
    dead: boolean;
    notch: boolean;
    headX: number;
    headY: number;
}): void;
export declare const DIREWOLF_LOOK: DireWolfLook;
/**
 * OLD FANG (the dread crown, the wolf boss): the dire painter worn
 * by an authored DESIGN, never a reskin — aged iron-grey where the
 * dire runs storm-charcoal, and the frost ticking laid on HEAVY: a
 * coat gone white at the guard hairs the way an old muzzle goes
 * white. Old-gold eyes (the dire's burn ember), pale scar rake wider
 * than hers — his ledger is longer. Frame reads OLD AND RANGY:
 * leaner in the body and lower at the back than the matriarch,
 * carried on the longest lope in the wood.
 */
export declare const OLDFANG_LOOK: DireWolfLook;
export declare const FEYWOLF_LOOK: FeyWolfLook;
/**
 * The worg: goblin-kin war-hound, designed around ONE silhouette
 * element: the HYENA SLOPE — towering shoulders falling hard down a
 * pencil-thin rump, the head slung LOW off the withers. A bear-trap
 * skull with an underbite whose fang-tusks hook up past the muzzle,
 * big ragged bat ears torn at the edges, mange-dappled dun hide over
 * a bare-skin chest, a short ratty kink of a tail — nothing about it
 * reads noble. The eyes are sickly green and set forward: it is
 * thinking about you specifically.
 */
export interface WorgLook {
    hide: string;
    /** Mange dapple blotches across the shoulders. */
    dapple: string;
    /** The short choppy bristle strip down the nape — patchy, not a mane. */
    mane: string;
    /** Bare skin: chest bib, muzzle, tail hide. */
    bare: string;
    earIn: string;
    eye: string;
    fang: string;
    bodyW: number;
    /** Withers height — the tall front of the slope. */
    shoulderH: number;
    /** Rump height — the low rear of the slope. */
    rumpH: number;
    chestH: number;
    headW: number;
    headH: number;
}
export declare const WORG_LOOK: WorgLook;
//# sourceMappingURL=rigCanid.d.ts.map