import { KoboldHeadFrame, KoboldHumpFrame } from './rigKobold.js';
/**
 * THE FUR DIALECT — the gnoll, the hyena-headed scavenger. Like the
 * bone and scale dialects it swaps head, hair, and face wholesale and
 * adds species mass (crest hump, bushy tail, bare paws) while the IK
 * rig, carriage, and facing bands keep working untouched. Each variant
 * is its own DESIGN, never a scale-up: the rank-and-file skulker in
 * its speckled coat, and the packlord's storm-dark bulk under the
 * standing crest. The rank-and-file additionally rolls a COAT CLUSTER
 * from its spawn seed — a warband reads as individuals from one stock,
 * never as one body stamped four times.
 */
export interface GnollLook {
    /** Coat base — the speckled gray-brown fur that carries the body. */
    fur: string;
    /** Pale underfur: throat, belly panel, jaw underside, tail's low edge. */
    underfur: string;
    /** Bare umber hide where the fur thins: paw pads and the ear dish. */
    skin: string;
    /** Speckle ink — the hyena's broken spot field over the coat. */
    spot: string;
    /** The bristled crest: crown, nape, and down the hunched back. */
    mane: string;
    /**
     * The dark face mask — brow ledge, muzzle bridge, eye sockets, claw
     * ink, the dorsal saddle. The menace tone: everything that scowls
     * wears it.
     */
    mask: string;
    /** The lit eye bead — small, close-set, watching the weakest. */
    eye: string;
    /** The bare nose pad at the muzzle tip. */
    nose: string;
    /** Frame multiplier: jaw mass, ear reach, crest height, tail girth. */
    heavy: number;
    /** Battle-worn: notched ear and a muzzle scar — the packlord's ledger. */
    scarred?: boolean;
    /** Spawn seed carried on the resolved look — drives the spot field. */
    seed?: number;
}
export declare const GNOLL_LOOKS: Record<string, GnollLook>;
/**
 * THE COAT CLUSTERS — four curated colorways for the rank-and-file,
 * picked by spawn seed so a pack sorts into family groups (the beasts'
 * one-line fur-tint law, grown to a wardrobe): dust, ash, russet, and
 * the bone-pale runt. Champions never roll — a packlord is a DESIGN.
 */
export declare const GNOLL_CLUSTERS: ReadonlyArray<Pick<GnollLook, 'fur' | 'underfur' | 'spot' | 'mane' | 'mask'>>;
export declare const GNOLL_LOOK_CACHE: Map<string, GnollLook>;
/**
 * Variant lookup with the rank-and-file as the unknown-id fallback.
 * The seed (spawn eid) rolls the skulker's coat cluster plus a small
 * shade jitter; named looks (the packlord) hold their authored design.
 * Resolved looks are cached — this runs per body per frame.
 */
export declare function gnollLook(defId: string, seed?: number): GnollLook;
/**
 * The gnoll head, drawn in the head block's own frame. Reads gnoll by
 * SILHOUETTE first: a broad low skull between TALL ROUND ears, a
 * bristled crest breaking off the crown, and a BLUNT DEEP muzzle — a
 * bone-cracking jaw, not the wolf's spike — ending in a broad nose
 * with the underbite's teeth proud of the lip. Muzzle length leads the
 * facing (short face-on, run out at profile) and the whole face is
 * gone from behind (the cattle muzzle law): occiput fur, spot courses,
 * ear backs, and the crest pouring down the nape.
 */
export declare function paintGnollHead(ctx: CanvasRenderingContext2D, gn: GnollLook, f: KoboldHeadFrame, seed?: number): void;
/**
 * The crest hump: the gnoll's hunched shoulders drawn in the torso's
 * local frame AFTER the garment and BEFORE the head — high withers in
 * FUR (the scraps a gnoll wears never cover its own back) with the
 * mane's bristle ridge marching down the slope. The low-slung skull
 * sinks into it; face-on and from behind it reads as the bowed back
 * the whole species carries.
 */
export declare function paintGnollCrest(ctx: CanvasRenderingContext2D, gn: GnollLook, f: KoboldHumpFrame): void;
/** Torso-local frame for the gnoll body coat overpaint. */
export interface GnollBodyFrame {
    s: number;
    tw: number;
    ww: number;
    th: number;
    fx: number;
    fy: number;
    profileK: number;
    backK: number;
    lead: number;
    hurt: boolean;
}
/**
 * THE BODY COAT — the gnoll's torso overpaint, drawn in the torso's
 * local frame AFTER the garment quad (which paints in plain fur) and
 * BEFORE the crest hump. It turns the flat tunic block into an
 * animal: pale belly panel face-on, the dark dorsal saddle from
 * behind, seeded rosettes on the flanks, a ragged pelt fringe over
 * the hip seam, and the scavenger's crude hide harness with its bone
 * fetishes — species dressing painted on, never equipment (nothing
 * here drops, so nothing here lies).
 */
export declare function paintGnollBody(ctx: CanvasRenderingContext2D, gn: GnollLook, f: GnollBodyFrame): void;
//# sourceMappingURL=rigGnoll.d.ts.map