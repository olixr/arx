import { KoboldHeadFrame } from './rigKobold.js';
/**
 * THE GREENSKIN DIALECT — the goblin, done at last as its own species.
 * Fifth head-swap dialect after bone, scale, fur, and construct: it
 * swaps head, hair, and face wholesale and reshapes the body's ARGUMENT
 * — the biggest head in the game on the smallest frame, a pot gut over
 * bandy shanks, overlong arms ending in knuckly hands — while the IK
 * rig, carriage, and facing bands keep working untouched. Where the
 * skeleton grins, the kobold bucks, and the gnoll juts, the goblin
 * FLARES: enormous back-swept wing ears wider than the shoulders, the
 * one silhouette that reads goblin at any distance. Each variant is a
 * DESIGN, never a scale-up; the rank-and-file additionally roll a HIDE
 * CLUSTER from the spawn seed so a warband reads as family, never as
 * one body stamped five times.
 */
export interface GoblinLook {
    /** Hide base — the green that names the species. */
    hide: string;
    /** Pale underhide: the pot gut, jaw, palms, and the ear membranes. */
    belly: string;
    /** The dark face ink: pupils, nostrils, maw, claw ticks, the scowl. */
    ink: string;
    /** The lit eye bead — bright, mean, and too small for the head. */
    eye: string;
    /**
     * The loincloth wrap: every goblin owns real underwear — a cloth
     * band lapping the pelvis with a torn apron front and seat. Dirty
     * scrap-cloth on the rabble, school-dyed on the casters, oiled
     * leather under the warboss iron.
     */
    cloth: string;
    /**
     * The casters' ragged half-cowl and shawl; undefined = the bare
     * chest and scrap belt of the rank-and-file.
     */
    garb?: string;
    /** The warboss war-knot: a rag-tied bristle spike on the crown. */
    topknot?: string;
    /** Paired up-tusks proud of the lip — the warboss jaw. */
    tusks?: boolean;
    /** Battle-worn: a notched ear and a cheek scar — rank as ledger. */
    scarred?: boolean;
    /** Frame multiplier: jaw mass, ear reach, gut swell. */
    heavy: number;
    /** Spawn seed carried on the resolved look — per-body wear marks. */
    seed?: number;
}
/** Needle teeth and tusk bone — one tone for every goblin mouth. */
export declare const GOBLIN_TOOTH = "#e9e0c6";
export declare const GOBLIN_LOOKS: Record<string, GoblinLook>;
/**
 * THE HIDE CLUSTERS — four curated greens for the rank-and-file,
 * picked by spawn seed so a camp sorts into family groups (the gnoll
 * coat-cluster law, kept): moss, olive, bog, and the sallow runt.
 * Casters and the warboss never roll — a named goblin is a DESIGN.
 */
export declare const GOBLIN_CLUSTERS: ReadonlyArray<Pick<GoblinLook, 'hide' | 'belly'>>;
export declare const GOBLIN_LOOK_CACHE: Map<string, GoblinLook>;
/**
 * Variant lookup with the rank-and-file as the unknown-id fallback.
 * The seed (spawn eid) rolls the chopper's and the thrower's hide
 * cluster plus a small shade jitter; named looks (the casters, the
 * warboss) hold their authored design. Resolved looks are cached —
 * this runs per body per frame.
 */
export declare function goblinLook(defId: string, seed?: number): GoblinLook;
/**
 * The goblin head, drawn in the head block's own frame. Reads goblin
 * by SILHOUETTE first: WING EARS swept back and out past the shoulder
 * line — the widest thing on the body — over a low broad cranium with
 * no chin to speak of, a HOOKED nose leading the facing, beady bright
 * eyes under a born scowl, and the needle grin ear to ear. The jaw
 * drops through every strike beat and the ears PIN BACK with it: the
 * goblin JEERS as it swings. From behind there is no face — occiput
 * hide, the nape wedge, the ears' backs, and the warboss war-knot.
 */
export declare function paintGoblinHead(ctx: CanvasRenderingContext2D, gb: GoblinLook, f: KoboldHeadFrame): void;
/** Torso-local frame for the goblin body overpaint. */
export interface GoblinBodyFrame {
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
 * THE LOINCLOTH — every goblin owns real underwear. A cloth wrap
 * lapping the pelvis hip to hip, with a torn apron hanging over the
 * front and a seat flap covering the back band: coverage from every
 * facing, never a naked hip line. Drawn in the torso's local frame
 * over the legs and UNDER the gut overpaint, and — unlike the gut —
 * for EVERY variant: the warboss wears its wrap under the scavenged
 * iron the way every soldier ever has.
 */
export declare function paintGoblinLoincloth(ctx: CanvasRenderingContext2D, gb: GoblinLook, f: GoblinBodyFrame): void;
/**
 * THE POT GUT — the goblin's torso overpaint, drawn in the torso's
 * local frame AFTER the garment quad (which paints in plain hide) and
 * gated OFF whenever a real body item is worn (the warboss keeps its
 * scavenged iron; nothing here may cover gear that drops). It turns
 * the flat tunic block into a body: the low-slung belly with its lit
 * pale panel and navel, the crease shading under the overhang, a
 * crude rope belt cinched UNDER the gut with the scrap pouch on the
 * hip — and for the casters, the ragged half-shawl with its torn hem
 * over the shoulders. Species dressing painted on, never equipment.
 */
export declare function paintGoblinTorso(ctx: CanvasRenderingContext2D, gb: GoblinLook, f: GoblinBodyFrame): void;
//# sourceMappingURL=rigGoblin.d.ts.map