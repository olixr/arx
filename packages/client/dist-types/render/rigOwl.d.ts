/**
 * THE FEATHER-AND-DISC DIALECT — the great owl, the parliament's
 * hunter. A TWO-POST beast unlike anything else on the rig: an
 * upright keg of plumage on backward-kneed bird legs, a facial disc
 * that carries BOTH eyes forward (the one face in the bestiary that
 * meets yours), and a head that turns on its own clock while the
 * body stands stone-still. Straight out of the oldest bestiaries — a
 * horned hunter the size of a shepherd — rebuilt in the Arx facet
 * dialect: block-prism body, chamfered feather fans, hard shade
 * steps, square pupils, no soft pill anywhere.
 */
export interface OwlLook {
    /** Mantle — the folded-wing cloak that IS the back and shoulders. */
    mantle: string;
    /** Breast keel and underwing — the pale flash of the threat bloom. */
    breast: string;
    /** Barring ink: breast chevrons, feather tips, tail bands. */
    bar: string;
    /** The facial disc plate. */
    disc: string;
    /** The disc's dark rim — what makes the disc a DISC. */
    discRim: string;
    /** The iris — the lamp of the face. */
    eye: string;
    /** Beak horn. */
    horn: string;
    /** Body half-width (tiles); length comes from the BeastSpec. */
    bodyW: number;
    /** Shoulder-dome height of the upright keg (tiles). */
    backH: number;
    /** Belly clearance over the shanks (tiles). */
    bellyH: number;
    headW: number;
    headH: number;
    /** Ear-tuft reach (tiles) — the horned crown; the elder's is a crest. */
    tuftLen: number;
    /** Tail-fan blade reach past the rump (tiles). */
    tailLen: number;
    /** Leading-primary reach of one spread wing (tiles). */
    wingSpan: number;
    /** Doubled disc ring, frost crown ticks — the elder's ledger. */
    elder?: boolean;
    /** Spawn seed carried on the resolved look — drives barring phase. */
    seed?: number;
}
/** The rank-and-file hunter: tawny bark camouflage, amber lamps. */
export declare const GREAT_OWL_LOOK: OwlLook;
/**
 * The elder: the parliament's high seat — never a scale-up. Storm
 * slate over moon-pale cream where the wing is bark over buff, a
 * TALL tufted crest for a crown, the disc ring doubled like a
 * weathered court seal, and frost ticked through the crown feathers.
 * It out-masses the hunter in every dimension that counts.
 */
export declare const ELDER_GREAT_OWL_LOOK: OwlLook;
/**
 * THE PLUMAGE CLUSTERS — four curated colorways for the rank-and-file,
 * picked by spawn seed so a parliament sorts into kin groups (the
 * gnoll coat-cluster law, feathered): tawny bark, ash gray, deep-wood
 * moss, and the birch-pale ghost. Elders never roll — an elder is a
 * DESIGN.
 */
export declare const OWL_PLUMAGES: ReadonlyArray<Pick<OwlLook, 'mantle' | 'breast' | 'bar' | 'disc' | 'discRim' | 'eye'>>;
export declare const OWL_LOOK_CACHE: Map<string, OwlLook>;
/**
 * Variant lookup with the hunter as the unknown-id fallback. The seed
 * (spawn eid) rolls the rank-and-file's plumage cluster plus a small
 * shade jitter — hashed first, because knot members spawn with
 * CONSECUTIVE eids and raw bits would dress a whole wing in one coat.
 * The elder holds its authored design. Cached; runs per body per frame.
 */
export declare function owlLook(defId: string, seed?: number): OwlLook;
/**
 * One feathered wing fan in the facet dialect: a bone-dark leading
 * arm and four chamfered primary blades stepping back from it — a
 * STEPPED silhouette, never a soft fan. Pale on the underside, so a
 * raised wing flashes the mantle warning every prey animal in the
 * wood understands. Screen-space like the bat's membranes (billboard
 * wings read at every body facing); the corpse splay squashes the
 * same fan onto the ground.
 */
export declare function owlWingFan(ctx: CanvasRenderingContext2D, look: OwlLook, o: {
    /** Shoulder pivot on screen. */
    x: number;
    y: number;
    s: number;
    /** Screen angle of the leading edge (radians). */
    ang: number;
    /** 0..1 fan opening. */
    spread: number;
    /** Leading-primary reach (tiles). */
    span: number;
    /** Show the pale underside (wings up = the mantle flash). */
    under?: boolean;
    /** Vertical squash for corpse splays flat on the ground. */
    squash?: number;
    /**
     * Fan-opening scale: 1 = the full mantling droop (the standing
     * threat bloom). Level flight carries the blade flatter — cruise
     * ~0.6, a locked-out glide flatter still.
     */
    openK?: number;
    hurt?: boolean;
    seed?: number;
}): void;
/**
 * THE BROAD WING — the great owl's living wing, drawn in BODY SPACE
 * and projected through the caller's lens, so the same mass
 * foreshortens correctly at every one of the eight facings: a
 * profile bird shows a near wing crossing its body and a far wing
 * behind it, a bird flying away shows both wings from above, and
 * nothing ever points sideways-on-screen because the screen said so.
 *
 * The planform is a real owl's: a bone-dark leading arm sweeping out
 * to the wrist, a broad slab of secondaries behind it, and FINGERED
 * primaries stepping back from the wingtip — each finger shorter and
 * further back-swept than the last — closing along a curved trailing
 * edge into the flank. Coverts shingle the shoulder, a dark
 * flight-feather band rides the outer half, and bar ink ticks the
 * finger tips. Pale underside for the mantling flash.
 */
export declare function owlWingBroad(ctx: CanvasRenderingContext2D, look: OwlLook, o: {
    /** Body-space projector: (F fwd, L starboard, Z up) tiles → screen. */
    P: (F: number, L: number, Z: number) => [number, number];
    /** Which wing: -1 port, +1 starboard. */
    es: number;
    s: number;
    /** Wing carriage: 0 = level, + = raised (mantling), − = swept low. */
    raise: number;
    /** The HAND's carriage, trailing the arm through the beat — the
     *  tip whip. Defaults to `raise` (a held pose). */
    raiseHand?: number;
    /** Load flex: + bends the primaries UP under the power stroke,
     *  − droops them through the recovery. */
    flex?: number;
    /** Rowing swing: forward wrist offset (tiles) through the power
     *  stroke, backward on recovery. */
    swing?: number;
    /** 0..1 downwash window — pale gust streaks fall away under the
     *  wingtips right after the stroke bottoms out. */
    gust?: number;
    /** 0..1 how far the wing is unfolded from the body. */
    spread: number;
    /** Back-sweep of the primary fingers: 0.25 mantling → 1 diving. */
    sweepK: number;
    /** Leading-primary reach in tiles (the look's wingSpan). */
    span: number;
    /** Show the pale underside (raised wings flash the warning). */
    under?: boolean;
    hurt?: boolean;
    seed?: number;
}): void;
/** Flight ceiling per rank (tiles over the ground anchor): the elder
 *  rides higher — rank you can read from across the glade. */
export declare function owlHoverHeight(look: OwlLook): number;
//# sourceMappingURL=rigOwl.d.ts.map