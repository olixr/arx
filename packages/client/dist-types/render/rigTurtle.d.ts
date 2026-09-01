import type { BeastBlockFrame, BeastSpec } from './rig.js';
export declare const TURTLE_CLAW_FAN: readonly [-0.55, 0, 0.55];
/**
 * THE SHELL WALKS — the giant turtles. Four reads owned by no other
 * body: THE KEEP (a scute-mailed dome with a serrated rim — the
 * whole silhouette is the shell), THE HOOK (a beaked shear on a neck
 * that fires like a sprung trap while the feet stay planted), THE
 * COLUMNS (pillar legs splayed from under the rim on the widest
 * track in the wood), and THE MAIL (every scute an individually lit
 * pyramid seated on the dome's curve — armor built plate by plate,
 * never a painted grid).
 *
 * TWO BODIES, TWO SPECIES (this is the law of the pair): the giant
 * turtle is THE SNAPPER — a low, long, jagged vault dragging its rim
 * near the ground on a sprawled track, blade-keeled like the old
 * bestiary plates; the colossus is THE MOUNTAIN — a high tortoise
 * dome on true elephant columns with daylight under the keep, moss
 * on its crown plates and a head like a stone outcrop. They must
 * never read as one silhouette at two zooms.
 */
export interface TurtleLook {
    /** Crown plates — the mail's base tone; facets derive from it. */
    shell: string;
    /** The marginal band riding the shell's lower edge. */
    rim: string;
    /** Keel blades and rim saw-teeth. */
    spike: string;
    /** Hide: neck, legs, tail. */
    skin: string;
    /** Pale throat and lower jaw. */
    throat: string;
    beak: string;
    eye: string;
    /** The colossus wears the years: moss caps on the crown plates. */
    moss?: string;
    /** Shell half-width (tiles); length comes from the BeastSpec. */
    bodyW: number;
    /** Dome height at the peak. */
    shellH: number;
    /** Keel blade height above the crown at the tallest station. */
    spikeH: number;
    headW: number;
    headH: number;
    /** Head carry height above ground (the rim line). */
    headRise: number;
    /** Daylight under the keep: the rim's height off the ground. */
    rimBot: number;
    /** Heavier brow, barbels, moss, crown plate — the ancient read. */
    ancient?: boolean;
}
export declare const TURTLE_LOOK: TurtleLook;
export declare const COLOSSUS_LOOK: TurtleLook;
export declare const COLOSSUS_BANDS: readonly number[];
export declare const COLOSSUS_BAND_K: readonly number[];
export declare function paintTurtleBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: TurtleLook, f: BeastBlockFrame): void;
export declare function drawTurtleHead(ctx: CanvasRenderingContext2D, look: TurtleLook, o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    /** 0..1 jaw gape — open through the windup, clamped on the hit. */
    gape?: number;
    /** Corpse: lids down, jaw slack, nothing watching. */
    dead?: boolean;
}): void;
//# sourceMappingURL=rigTurtle.d.ts.map