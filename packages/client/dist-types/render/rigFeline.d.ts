/**
 * THE SOFT-FOOTED — sabercat, lynx and the house cat, with the shared cat limb.
 * Split out of rig.ts on the golems.ts template (foundations F3.4);
 * rig.ts re-exports everything here, so every lab, test and painter
 * keeps its old door.
 */
import { EarSim } from './earPhysics.js';
import type { BeastBlockFrame, BeastSpec } from './rig.js';
/**
 * The night sabercat — the prestige saddle beast (THE ROAD GROWS
 * SHORT Phase 5). A cat is not a horse and is not painted like one:
 * low-slung length, shoulder blades riding ABOVE the spine line, a
 * deep waist tuck, flank stripes, a round skull with a short broad
 * muzzle, and the two ivory sabers that name it. It wears a HARNESS,
 * not a saddle: strap ring at the shoulders, low seat pad, breast
 * band. Ridden low — the seat sits where the cat's back actually is.
 */
export interface SabercatLook {
    coat: string;
    /** Flank banding — the saber stripe read. */
    stripe: string;
    under: string;
    earIn: string;
    eye: string;
    fang: string;
    /** Harness leather (the tack constant) and the seat pad's cloth. */
    leather: string;
    pad: string;
    bodyW: number;
    backH: number;
    /** The feline shoulder rise — blades above the spine at the walk. */
    shoulderH: number;
    chestH: number;
    tuckH: number;
    headW: number;
    headH: number;
}
export declare const SABERCAT_LOOKS: Record<string, SabercatLook>;
export declare function paintSabercatBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: SabercatLook, f: BeastBlockFrame): void;
/**
 * The sabercat head: a round skull where the wolf carries a slab, a
 * short broad muzzle where the wolf runs a spike, blunt round-backed
 * ears, pale-gold eyes, and the two ivory sabers dropping past the
 * jaw — visible at every facing the muzzle is, because they ARE the
 * animal.
 */
export declare function drawSabercatHead(ctx: CanvasRenderingContext2D, look: SabercatLook, o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
}): void;
/**
 * The lynx: the tufted shadow of the deep wood, designed around FOUR
 * reads no other beast owns — black EAR TUFTS spiking off triangular
 * ears, the pale facial RUFF framing the face in fur chops, a
 * black-tipped BOBTAIL perched high, and a RUMP-HIGH topline on legs
 * longer than a wolf's (the cat's mass sits over its haunches, the
 * inverse of the wolf's shoulder keel). Rosette spots write the coat.
 */
export interface LynxLook {
    coat: string;
    /** Rosette ink — the spots that name the cat. */
    rosette: string;
    under: string;
    /** Dark streaks seaming the pale ruff chops. */
    ruffDark: string;
    earIn: string;
    /** Ear-tuft and tail-tip ink. Tufts are STROKES (the fur-dialect law). */
    tuft: string;
    eye: string;
    /** Nose-leather ink — the downward triangle every cat face carries. */
    nose: string;
    bodyW: number;
    backH: number;
    /** The cat carries its mass BEHIND: extra height ramped over the haunches. */
    haunchH: number;
    /** A modest shoulder rise — always below the haunch line. */
    shoulderH: number;
    chestH: number;
    tuckH: number;
    headW: number;
    headH: number;
    /**
     * The duskruff dresses further: the storm mantle, silver grizzle,
     * and the old scar rake. Champions never roll a cluster — the
     * duskruff is a DESIGN (the packlord law).
     */
    champion?: boolean;
    grizzle?: string;
    scar?: string;
    seed?: number;
}
export declare const LYNX_LOOKS: Record<string, LynxLook>;
/**
 * THE COAT CLUSTERS (the gnoll law, spoken feline): four curated wild
 * colorways a spawned tribe spreads across — never a random hue roll,
 * always one of the four coats the wood actually breeds.
 */
export declare const LYNX_CLUSTERS: ReadonlyArray<Pick<LynxLook, 'coat' | 'under' | 'rosette' | 'ruffDark'>>;
export declare const LYNX_LOOK_CACHE: Map<string, LynxLook>;
/**
 * THE MUSCLED LIMB: the lynx's leg is drawn as MASS, never as stick
 * strokes — a filled haunch ball feeding a tapered thigh, a slim hock,
 * and the oversized paw a snow-cat actually stands on. Every shape is
 * built in the solved bones' own frames (hip→knee, knee→paw), so the
 * masses articulate honestly through all eight facing bands, the
 * pounce stretch, and every mid-turn joint memory — flat value planes
 * per the forge law, one coat family per cluster.
 */
export declare function drawCatLimb(ctx: CanvasRenderingContext2D, o: {
    hipX: number;
    hipY: number;
    kx: number;
    ky: number;
    ex: number;
    ey: number;
    /** Upper-leg thickness in px (spec.legW × scale). */
    w: number;
    s: number;
    hind: boolean;
    coat: string;
    champion: boolean;
    /** Far-side legs step into shadow so pairs never merge mid-stride. */
    far: boolean;
    hurt: boolean;
    /** Paw fill override (white mitts, seal points). Absent = the coat's dark step. */
    paw?: string;
}): void;
/**
 * THE HOUSE CAT — the hearth's shadow, the first animal in the game
 * that exists purely for company. Nothing here is borrowed from the
 * lynx beyond the feline LAWS it must obey (the flat muzzle plate,
 * the canid wedge ban, the long-thigh bones): where the lynx is a
 * wild ambusher built on four predator reads, the house cat is built
 * on WARDROBE and CARRIAGE — a curated coat cabinet a whole town's
 * cats spread across (seeded, never random-hued), the raised
 * question-mark tail no wild cat carries, and THE SIT, the settled
 * upright rest that says "domestic" from across a market square.
 */
export interface HousecatLook {
    /** Base coat. */
    coat: string;
    /** Underparts: belly, chest, muzzle plate — and the tuxedo's dress. */
    under: string;
    /** Pattern ink: tabby bars, the cap, patches, the points. */
    mark: string;
    /** Second patch ink (calico, tortoiseshell). */
    mark2?: string;
    /** Inner-ear fan. */
    earIn: string;
    eye: string;
    nose: string;
    /**
     * The written pattern. 'solid' wears the coat plain; 'tabby' bars
     * the back and flanks and writes the crown M; 'bicolor' carries
     * white underparts high up the flank; 'tuxedo' is the black dress
     * over a white bib and blaze; 'capped' is a clean pale body under
     * a dark skullcap (the head painter owns the cap); 'patched'
     * scatters seeded color patches (calico, tortie); 'points' darkens
     * the extremities only — mask, ears, paws, tail.
     */
    pattern: 'solid' | 'tabby' | 'bicolor' | 'tuxedo' | 'capped' | 'patched' | 'points';
    /**
     * Long hair reads in the TAIL first (the plume vs the whip), then
     * the cheek fluff, the chest ruff, and the belly fringe.
     */
    longhair: boolean;
    /** Tail dress: ringed (the raccoon read), dark-tipped, plain coat, or mark-dark end to end. */
    tail: 'rings' | 'tip' | 'coat' | 'dark';
    /** White mitts on all four paws. */
    mitts?: boolean;
    /** The chest locket — one pale patch where the collarbones meet. */
    locket?: boolean;
    /** Body half-width (tiles); length comes from the BeastSpec. */
    bodyW: number;
    backH: number;
    /** The mild rump rise — a kept cat, never the lynx's coiled ramp. */
    haunchH: number;
    shoulderH: number;
    chestH: number;
    tuckH: number;
    headW: number;
    headH: number;
    seed?: number;
}
export declare const HOUSECAT_BASE: {
    bodyW: number;
    backH: number;
    haunchH: number;
    shoulderH: number;
    chestH: number;
    tuckH: number;
    headW: number;
    headH: number;
};
export type HousecatCoat = Omit<HousecatLook, keyof typeof HOUSECAT_BASE | 'seed'>;
export declare const HOUSECAT_LOOK_CACHE: Map<string, HousecatLook>;
/**
 * The house cat's body: a compact level-backed loaf on the block
 * dialect, morphing continuously into THE SIT — haunches folded
 * under, spine sloping up to a lifted chest — as `sitK` rises. The
 * sit is the species' whole domestic identity, so the morph is a
 * first-class body state, not a pose hack: footprint, topline, and
 * belly all interpolate, and the folded haunch paints as real mass.
 */
export declare function paintHousecatBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: HousecatLook, f: BeastBlockFrame, sitK?: number): void;
/**
 * The house cat's head — the feline grammar (the lynx's law: a FLAT
 * face, the muzzle plate barely leaving the skull at profile, the
 * canid wedge banned forever) recut CUTE: a round skull, eyes a full
 * size up from any wild cat's, small neat ears on the elastic pair,
 * the pink leather triangle, and the whisker fan at close zoom. The
 * ears ride EarSim — they lag the turn, flap with the trot, and
 * flick at rest; sim-less callers get THE ONE REST.
 */
export declare function drawHousecatHead(ctx: CanvasRenderingContext2D, look: HousecatLook, o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** Wall clock for the ear sim and the blink; absent = settled rest. */
    nowMs?: number;
    ears?: EarSim;
    /** 0..1 through THE SIT — steadies the ears, slows the blink. */
    sitK?: number;
}): void;
//# sourceMappingURL=rigFeline.d.ts.map