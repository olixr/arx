/**
 * THE RED SKULK — the fox.
 * Split out of rig.ts on the golems.ts template (foundations F3.4);
 * rig.ts re-exports everything here, so every lab, test and painter
 * keeps its old door.
 */
import { EarSim } from './earPhysics.js';
import type { BeastBlockFrame, BeastSpec } from './rig.js';
/**
 * THE FOX — the cunning made flesh, and none of it borrowed: not the
 * wolf's slab skull, not the lynx's flat plate, not the worg's slope.
 * Four reads own the species. THE BRUSH: a tail nearly the body's own
 * length ending in the white flag — the one mark that survives any
 * zoom, any coat, any light. THE SOOT EARS: oversized triangles,
 * black-backed, so the fox reads from BEHIND by its ears alone. THE
 * SNIPE: a fine tapering muzzle under amber eyes cut with the vertical
 * pupil — the only canid in the wood wearing a cat's eye. THE
 * STOCKINGS: dark legs under a warm coat, the fox stepping in soot.
 */
export interface FoxLook {
    coat: string;
    /** Cream bib, underbelly, and the pale side of every mark. */
    under: string;
    /** The dark stockings — a fox walks in soot to the knee. */
    sock: string;
    /** Soot backing the oversized ears — the from-behind read. */
    earBack: string;
    earIn: string;
    eye: string;
    nose: string;
    /** The brush flag: white for the wild skulk, smoke for the queen. */
    tip: string;
    /** The brush's darker root third — volume, not a banded raccoon. */
    brushRoot: string;
    /**
     * The cross-fox mark: a dark dorsal stripe crossed by a shoulder
     * bar. One wild cluster wears it faint; the matriarch wears it
     * burned deep — the cross writ large.
     */
    mantle?: string;
    /** Silver ticking — the sable cluster's frost, the queen's winters. */
    grizzle?: string;
    bodyW: number;
    backH: number;
    /** A modest wither rise — the fox carries its head HIGH and alert. */
    shoulderH: number;
    /** The light spring coiled behind — well under the lynx's ramp. */
    haunchH: number;
    chestH: number;
    /** High tuck: the leggy waist that says featherweight at any zoom. */
    tuckH: number;
    headW: number;
    headH: number;
    /**
     * The matriarch dresses further: the great pale ruff collar, the
     * silvered mask, the ember ring on her smoke brush. Champions never
     * roll a cluster — the vixen is a DESIGN (the packlord law).
     */
    champion?: boolean;
    /** The queen's ember ring, banded below her smoke tip. */
    ember?: string;
    /** The great ruff collar — pale, chest-deep, no lean fox carries it. */
    ruff?: string;
    seed?: number;
}
export declare const FOX_LOOKS: Record<string, FoxLook>;
/**
 * THE COAT CLUSTERS (the gnoll law, spoken vulpine): four curated wild
 * colorways a spawned skulk spreads across — the ember red, the frost
 * white, the dusk cross, and the sable silver. Never a random hue
 * roll; always one of the four coats the wood actually breeds.
 */
export declare const FOX_CLUSTERS: ReadonlyArray<Pick<FoxLook, 'coat' | 'under' | 'sock' | 'brushRoot' | 'tip' | 'mantle' | 'grizzle'>>;
export declare const FOX_LOOK_CACHE: Map<string, FoxLook>;
export declare function foxLook(defId: string, seed?: number): FoxLook;
export declare function paintFoxBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: FoxLook, f: BeastBlockFrame): void;
/**
 * The fox head: a compact near-round skull (deeper chamfers than the
 * wolf slab, shy of the cat's circle) crowned by the SOOT EARS —
 * triangles taller than any canid's, black-backed so the species reads
 * from behind — over THE SNIPE: a fine tapering muzzle, pale-jawed,
 * dotted with the small black nose. The eyes are the fox's secret:
 * amber almonds cut with the VERTICAL pupil — a cat's eye in a canid
 * face, the cunning made visible. `snarl` pins the ears and gapes the
 * needle jaw through the pounce telegraph; corpses pass `dead`.
 */
export declare function drawFoxHead(ctx: CanvasRenderingContext2D, look: FoxLook, o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** 0..1 through the attack telegraph. */
    snarl?: number;
    /** Wall clock for the ear sim tick; absent = the settled rest. */
    nowMs?: number;
    /** THE EAR IS A SIMULATION: the live elastic pair. Sim-less
     *  callers (portraits, CMS, ragdoll) fall to earRestChain — THE
     *  ONE REST, the exact silhouette the live game relaxes to. */
    ears?: EarSim;
}): void;
//# sourceMappingURL=rigFox.d.ts.map