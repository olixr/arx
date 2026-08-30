import type { EarCarriage } from './earPhysics.js';
export interface SkralLook {
    /** Hide base — the wet scale that names the species. */
    hide: string;
    /** Pale underside: belly plate, jaw shovel, throat, palms, webs. */
    belly: string;
    /** Dark face ink: pupils, mouth seam, nostril pits, claw ticks. */
    ink: string;
    /** The lantern iris — big, pale, and unblinking. */
    eye: string;
    /** Crest membrane (and every limb fin's) — the accent color. */
    fin: string;
    /** Fin rays and crest spines — must hold above '#30' shaded. */
    ray: string;
    /** The net-sash wrap: woven cord and a frayed hip net. */
    cloth: string;
    /** The tidecaller's kelp mantle; undefined = bare rank-and-file. */
    garb?: string;
    /** Coral brow studs — the deepking's crown. */
    crowned?: boolean;
    /** The back-slung barbed trident — the deepking's carry. */
    trident?: boolean;
    /** An eye that lost an argument: lid seam + a notched crest. */
    scarred?: boolean;
    /**
     * Jaw-span multiplier (default 1) — a HEAD dial, not a limb one
     * (the dialect law): the deepking's maw out-spans its shoal, the
     * tidecaller's is a shade daintier. Feeds the mouth span, the
     * gape's drop, and the corner fangs.
     */
    jaw?: number;
    /** Frame multiplier: jaw span, crest reach, belly swell. */
    heavy: number;
    /** Spawn seed carried on the resolved look — per-body wear. */
    seed?: number;
}
export declare const SKRAL_LOOKS: Record<string, SkralLook>;
/**
 * Variant lookup with the rank-and-file as the unknown-id fallback.
 * The seed (spawn eid) rolls the wader's and the harpooner's water
 * cluster plus a small shade jitter; named looks hold their authored
 * design. Resolved looks are cached — this runs per body per frame.
 */
export declare function skralLook(defId: string, seed?: number): SkralLook;
/**
 * The crest carriage: both chains root near the sagittal line high on
 * the crown (rootR 0.06 — nearly one blade), swept back-and-up. The
 * FLARE is a carriage change, not a screen trick: the strike beat
 * raises the rise and reach, and the sim follows with honest lag.
 */
export declare function skralCrestCarriage(heavy: number, flare: number): EarCarriage;
export interface SkralCrestStyle {
    membrane: string;
    ray: string;
    edge: string;
}
/** Pre-resolved crest colors off the look (hurt handled by caller). */
export declare function skralCrestStyle(sk: SkralLook, back: boolean): SkralCrestStyle;
/**
 * One crest bank drawn along a sim chain: a tapered membrane ribbon
 * with spine rays fanned through it and THE BROKEN INK on the leading
 * edge — a partial stroke only (the outline shader rings only the
 * outer silhouette; a closed ring would grid the fin and muddy it —
 * the turtle thorn lesson).
 */
export declare function drawSkralCrest(ctx: CanvasRenderingContext2D, pts: ReadonlyArray<{
    x: number;
    y: number;
}>, w0: number, st: SkralCrestStyle, opts: {
    hurt: boolean;
    notch?: boolean;
}): void;
export interface SkralHeadFrame {
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
    /** 0..1 jaw drop — the combat croak; 0 keeps the grin seated. */
    gape: number;
}
/**
 * THE HEAD IS ONE HULL (user-directed structural round: "rethink the
 * models — proper perspective, skews, and orientations; the eyes
 * float; the mouth was a hodgepodge"). The per-band blends are GONE.
 * The head is an ellipsoid hull with semi-axes (aF fwd, aL lat, aZ
 * up), and every feature — both eye domes, the mouth arc, the teeth,
 * the nostrils, the gills, the crown ring, the barbels, the scar —
 * is a STATION in head space projected through the fixed bird's-eye
 * camera (YK 0.6). Orientation, foreshortening, which eye shows,
 * where the grin wraps out of sight, and what peeks over the skyline
 * from behind all fall out BY CONSTRUCTION (the motion doctrine, law
 * three — the lesson the goblin head paid for three times):
 * - a station's camera-side depth d = F·fy + L·py orders it against
 *   the skull slab: d < 0 paints BEFORE the hull (hidden, or peeking
 *   past the silhouette), d > 0 paints OVER it;
 * - a feature's INK draws only while its outward normal faces the
 *   camera — so the face vanishes from behind with no gate at all;
 * - the mouth is a sampled 3D arc around the muzzle: the visible run
 *   is wherever its samples hold the camera side, so the grin is
 *   full at the bow, wraps honestly at the quarters, runs one-sided
 *   at profile, and is gone from behind — and the teeth ride the
 *   samples, narrowing with the arc's own foreshortening.
 */
export declare function paintSkralHead(ctx: CanvasRenderingContext2D, sk: SkralLook, f: SkralHeadFrame): void;
export interface SkralBodyFrame {
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
    nowMs: number;
}
/**
 * THE BODY JOINS THE HULL: the torso overpaint in two passes ordered
 * by the same station-depth truth the head runs on. The `behind`
 * pass paints UNDER the torso garment (the rig calls it before the
 * cloth goes down): the slung trident's SHAFT lives there always —
 * honestly occluded by the body when the skral faces the camera,
 * fully revealed as it turns away, continuous in between (the old
 * front/back modes snapped at the quarter boundary) — and the spine
 * finlets sit there whenever the back faces away from the camera.
 * The `front` pass carries the tines (above the shoulder line, never
 * occluded), the sling strap on the chest, the finlets when the back
 * is toward the camera, and the belly plate. The carry lives on ONE
 * BODY SHOULDER (the left): its screen side comes from the lateral
 * projection, never from `lead` — a slung weapon must not teleport
 * shoulders when the facing crosses south (the lead-sign snap).
 * The belly pass is gated by the caller when real armor is worn
 * (armor stays visible: the loot-story law).
 */
export declare function paintSkralBody(ctx: CanvasRenderingContext2D, sk: SkralLook, f: SkralBodyFrame, armored: boolean, layer?: 'behind' | 'front'): void;
/**
 * THE NET-SASH — every skral wears the woven belt and its frayed hip
 * net (the loincloth law): cord band at the waist, a short knotted
 * net apron on the near hip, and one shell bead. The tidecaller's
 * kelp mantle rides the shoulders above it.
 */
export declare function paintSkralWrap(ctx: CanvasRenderingContext2D, sk: SkralLook, f: SkralBodyFrame): void;
/**
 * The skral arm past the solve: lean hide strokes with a forearm FIN
 * off the outer edge and a webbed three-ray hand — palm chip, splayed
 * fingers, membrane fills between them. Called from drawArm the way
 * the golem and ogre arms are; the skral never owned a sleeve.
 */
export declare function drawSkralArm(ctx: CanvasRenderingContext2D, sk: SkralLook, sx: number, sy: number, kx: number, ky: number, ex: number, ey: number, s: number, hurt: boolean, nowMs: number, 
/**
 * THE FACE SANDWICH (the stoop lane, round 2): the skral's skull is
 * WIDER than its shoulder bar, so a front-layer arm's ROOT half
 * lives behind the head — painted whole over the face it read as
 * sprouting from the eye (the deepking strike / tidecaller cast
 * screenshots). The rig paints the arm in two passes around the
 * head: 'under' = the upper arm only (shoulder→elbow, occluded by
 * the skull), 'over' = forearm + fin + webbed hand, emerging past
 * the head silhouette. Undefined paints the whole arm (the behind-
 * torso layers and the settled rest, where the head already covers
 * everything). The two passes butt-join at the elbow with round
 * caps — pixels identical to a single pass wherever the head
 * doesn't overlap.
 */
seg?: 'under' | 'over'): void;
/**
 * THE FAN FOOT: the murloc footprint — a webbed triangle twice the
 * shank's width, three long toe rays with membrane between, splayed
 * toward the lead. The widest bare foot below the ogre's, on the
 * thinnest shanks in the game: the proportion IS the species.
 */
export declare function paintSkralFoot(ctx: CanvasRenderingContext2D, sk: SkralLook, fxx: number, fyy: number, s: number, lead: number, hurt: boolean): void;
//# sourceMappingURL=skral.d.ts.map