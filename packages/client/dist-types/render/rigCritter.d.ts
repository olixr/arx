import type { BeastBlockFrame, BeastSpec } from './rig.js';
/**
 * The giant rat: a low hunched wedge — rump high and round, body
 * tapering into a pointed twitchy head with big dish ears, whiskers,
 * buck teeth and a long naked tail dragging an S behind it.
 */
export interface RatLook {
    fur: string;
    dorsal: string;
    belly: string;
    /** Naked skin — tail, nose, inner ear. */
    skin: string;
    earIn: string;
    bodyW: number;
    /** Height of the hunched rump peak. */
    humpH: number;
    headW: number;
    headH: number;
}
export declare const RAT_LOOK: RatLook;
export declare function paintRatBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: RatLook, f: BeastBlockFrame): void;
/**
 * The rat head: pointed snout wedge off a small skull, dish ears
 * behind, beady eyes, whiskers and buck teeth. Muzzle and eyes obey
 * the same foreshortening laws as the cattle and wolf.
 */
export declare function drawRatHead(ctx: CanvasRenderingContext2D, look: RatLook, o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** -1..1 fast whisker twitch, idle only. */
    twitch?: number;
}): void;
/**
 * The boar: a battering wedge built around four reads owned by no
 * other body — THE RAZOR HUMP (a shoulder tower falling away to a
 * lean low stern; the whole topline is a charge waiting to happen),
 * THE HEDGE CREST (a continuous serrated bristle ridge crown-to-
 * midback that erects when the charge winds up), THE RAVAGER TUSKS
 * (up-swept ivory crescents off the jaw corners), and THE GRIZZLE
 * MASK (a pale band down the snout ridge under furious little eyes).
 * The dire boar is a DESIGN, never an upscale: the mountain hump,
 * frost-tipped quills over cold iron, four aged tusks, rake scars.
 */
export interface BoarLook {
    hide: string;
    bristle: string;
    /** Lit quill tips — the crest must read on its own dark hedge. */
    quillTip: string;
    /** Grizzled dust: the snout-ridge mask and the flank band. */
    grizzle: string;
    snout: string;
    tusk: string;
    earIn: string;
    /** The furious little lamp set in the dark eye mask. */
    eye: string;
    bodyW: number;
    /** Stern topline height — the LOW end of the razorback slope. */
    backH: number;
    /** Shoulder-hump rise over the withers — the tower the slope falls from. */
    humpH: number;
    /** Bristle-quill height over the hump line. */
    crestH: number;
    /** Belly clearance at the deep chest / at the tucked stern. */
    chestH: number;
    tuckH: number;
    headW: number;
    headH: number;
    /** Tusk reach as a fraction of headW — the ravager dial. */
    tuskLen: number;
    /** The dire pair: upper hooks seated over the lower scimitars. */
    fourTusk?: boolean;
    /** Pale rake-scars on the flank — the dire's war record (seeded). */
    scar?: string;
    /** Heavy jowl masses framing the jaw (the dire's old-bruiser face). */
    jowl?: boolean;
    /** Tail cord length multiplier — the dire drags a longer rope. */
    tailK: number;
}
export declare const BOAR_LOOK: BoarLook;
/**
 * THE SCARRED IRON: the dire boar wears a cold iron-umber coat under
 * a frost-tipped quill hedge — a mountain at the shoulder where the
 * boar is a wedge, aged four-tusk jaws where the boar carries two
 * clean crescents, and garnet eyes sunk in heavy jowls. At any zoom
 * the two must never read as one silhouette twice.
 */
export declare const DIREBOAR_LOOK: BoarLook;
//# sourceMappingURL=rigCritter.d.ts.map