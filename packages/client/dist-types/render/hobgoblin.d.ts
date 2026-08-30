import type { EarCarriage } from './earPhysics.js';
export interface HobgoblinLook {
    /** War-flushed hide — the brick-and-ember skins of the legion. */
    hide: string;
    /** Face ink: pupils, mouth seam, nostril pits, brow shadow. */
    ink: string;
    /** The ember iris — a watch-fire in a deep socket. */
    eye: string;
    /** The queue and the jaw fringe — always dark, never rolled loud. */
    hair: string;
    /** Armor ground: the banded cuirass, helm, greave, and bracer. */
    iron: string;
    /** Rank metal: rivets, rings, buckles — gilt on the officer. */
    trim: string;
    /** THE BANNER IS ONE: the legion crimson. Constant by law. */
    banner: string;
    /** Harness leather: straps, pteruges ground, boot uppers. */
    strap: string;
    /** The warcaster's mantle; undefined = the line ranks' iron. */
    garb?: string;
    /**
     * The painted helm — head furniture, never an equipment item (THE
     * FORGE LAW makes item metal full-face; the legion's open war-helm
     * is authored INTO the head so the face it disciplines stays
     * readable): 'cap' the line skullcap with cheek guards, 'crest'
     * the officer's combed galea, 'horns' the juggernaut's horned
     * crown, 'none' the bare-crowned specialist.
     */
    helm: 'cap' | 'crest' | 'horns' | 'none';
    /** The flame-speaker's bound top-knot on the bare crown. */
    knot?: boolean;
    /** Jaw-span multiplier (a HEAD dial): the warlord out-jaws the line. */
    jaw?: number;
    /** One argument lost: brow-to-cheek seam + a notched ear blade. */
    scarred?: boolean;
    /** The officer's jaw fringe and chin braid. */
    bearded?: boolean;
    /** The back-slung legion standard — the warlord plants the claim. */
    standard?: boolean;
    /** Frame multiplier: jaw, brow, tusk, and habit weights. */
    heavy: number;
    /** Spawn seed carried on the resolved look — per-body wear. */
    seed?: number;
}
export declare const HOB_LOOKS: Record<string, HobgoblinLook>;
/**
 * Variant lookup with the legionary as the unknown-id fallback. The
 * seed (spawn eid) rolls the line ranks' skin cluster plus a small
 * shade jitter; named looks hold their authored design. Resolved
 * looks are cached — this runs per body per frame.
 */
export declare function hobgoblinLook(defId: string, seed?: number): HobgoblinLook;
/**
 * The blade carriage: rooted at the skull's rear quarters and swept
 * BACK-AND-UP — the disciplined silhouette. The goblin wings stand
 * wide off the temples (azimuth 2.0, spread 0.85); these root deeper
 * around the skull and hold a tight lane, so face-on they read as
 * two raked points past the helm's cheeks and at profile as one long
 * blade continuing the crown line. The snarl PINS them flatter still
 * — carriage change through the sim, never a screen trick.
 */
export declare function hobEarCarriage(heavy: number, pin: number): EarCarriage;
export interface HobEarStyle {
    skin: string;
    inner: string;
    edge: string;
    ring: string;
}
/** Pre-resolved blade colors off the look (hurt handled by caller). */
export declare function hobEarStyle(hb: HobgoblinLook, back: boolean): HobEarStyle;
/**
 * One lance-blade ear along a sim chain: a narrow angular ribbon —
 * straight planes to a point (THE FLAT FORGE LAW; the goblin's wing
 * is a bowed membrane, this is a knife) — with the inner scoop
 * shadowed on the forward face, one partial edge stroke (never a
 * closed ring under the outline shader), the officer's ring at the
 * root, and the scar ledger's notch bitten from the trailing edge.
 */
export declare function drawHobEar(ctx: CanvasRenderingContext2D, pts: ReadonlyArray<{
    x: number;
    y: number;
}>, w0: number, st: HobEarStyle, opts: {
    hurt: boolean;
    back: boolean;
    notch?: boolean;
    ringed?: boolean;
}): void;
export interface HobHeadFrame {
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
    /** 0..1 jaw drop — the war-shout; 0 keeps the stern seam set. */
    gape: number;
}
/**
 * THE HEAD IS A TURNED VOLUME (round three, user-directed root fix).
 * The features were always honest 3D stations — but the silhouette
 * they lived on was still an axis-aligned billboard slab, so through
 * a turn the face slid across a rectangle that never rotated, and at
 * the diagonals the mouth read as hanging off a cheek that wasn't
 * turning with it. The hull is now a real solid: a TWO-LOBE SKULL (domed cranium over a
 * narrower squarer jaw — superellipsoid lobes)
 * (the soldier's rounded block, honestly three-dimensional) with the
 * longer rear axis, and the painted silhouette is its EXACT screen
 * projection — computed by support function through the very same
 * basis every station projects through. One algebra, two guarantees:
 * the outline tips, shifts, and swells with the turn by construction,
 * and every on-hull feature provably lives inside it.
 *
 * Exported whole so the audit sheet's probe overlay and the law tests
 * walk the SAME geometry the painter draws — the vetting procedure,
 * not a parallel approximation.
 */
export declare function hobHeadHull(hw: number, hh: number, fx: number, fy: number): {
    aF: number;
    aB: number;
    aL: number;
    aZ: number;
    c1f: {
        x: number;
        y: number;
    };
    c1b: {
        x: number;
        y: number;
    };
    c2: {
        x: number;
        y: number;
    };
    c3: {
        x: number;
        y: number;
    };
    /** Station: head frame (F, L, Z) → screen offset + camera depth. */
    st: (F: number, L: number, Z: number) => {
        x: number;
        y: number;
        d: number;
    };
    /** Support point of the projected skull in screen direction (nx,ny). */
    support: (nx: number, ny: number) => {
        x: number;
        y: number;
    };
    /** One point of the crown cross-section ring at height Z = zR. */
    ring: (zR: number, t: number) => {
        x: number;
        y: number;
        d: number;
    };
};
/**
 * THE PROBE (the standing vetting procedure): when the lab flips this
 * on, every painted head overlays its own silhouette sampling and its
 * load-bearing feature stations — green where the station holds the
 * camera side, hollow red where it has turned away. A head change is
 * audited by LOOKING at the geometry the painter actually ran, at
 * every band of the turn strip, before any judgment call on the art.
 */
export declare const HOB_HEAD_DEBUG: {
    on: boolean;
};
/**
 * THE WAR MASK IS ONE HULL. The head is a superellipsoid hull with
 * semi-axes (aF fwd, aB aft, aL lat, aZ up) and EVERY feature — the
 * helm and its furniture, the brow ledge, both ember eyes, the flat
 * nose, the mouth arc with its corner fangs, the jaw fringe, the
 * scar — is a STATION `st(F, L, Z)` projected through the fixed
 * bird's-eye camera (YK 0.6). Orientation, foreshortening, which eye
 * shows, where the seam wraps out of sight, and what serrates the
 * skyline from behind all fall out BY CONSTRUCTION (the motion
 * doctrine's law three; the skral head is the precedent and the
 * goblin head is the tuition). Fixture law: everything mounted ON
 * the skull (horns, crest, studs) starts at unit length and its
 * protrusion runs along the projected surface normal — never a
 * screen triangle.
 */
export declare function paintHobgoblinHead(ctx: CanvasRenderingContext2D, hb: HobgoblinLook, f: HobHeadFrame): void;
export interface HobBodyFrame {
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
 * THE IRON HABIT, two passes ordered by station depth (the skral
 * body law). The `behind` pass paints UNDER the torso garment: the
 * warlord's standard pole lives there always — honestly occluded by
 * the body at the bow, fully revealed as it turns away, continuous
 * in between. The `front` pass carries the pennant's high reach, the
 * cuirass, girdle, sash, and gorget. The standard rides ONE BODY
 * SHOULDER (the left): its screen side comes from the lateral
 * projection (L·px), NEVER from `lead` — the lead sign flips
 * crossing S/N and teleports anything hung on it.
 * The cuirass overpaint is gated by the caller when real armor is
 * worn (armor stays visible: the loot-story law); the pteruges
 * skirt paints ALWAYS (the harness law — this body is never bare).
 */
export declare function paintHobgoblinBody(ctx: CanvasRenderingContext2D, hb: HobgoblinLook, f: HobBodyFrame, armored: boolean, layer?: 'behind' | 'front'): void;
/**
 * The hobgoblin arm past the solve: a soldier's arm — hide above the
 * elbow, the banded iron bracer below it (the legion never marches
 * bare-wristed), and a gauntleted fist with a knuckle bar. Called
 * from drawArm the way the golem, ogre, and skral arms are.
 */
export declare function drawHobgoblinArm(ctx: CanvasRenderingContext2D, hb: HobgoblinLook, sx: number, sy: number, kx: number, ky: number, ex: number, ey: number, s: number, hurt: boolean, nowMs: number): void;
/**
 * THE MARCHING BOOT: the first dialect foot that is FOOTWEAR — an
 * iron-toed hobnailed marcher under a greave cuff. The legion is
 * shod; the goblin's flap and the skral's fan are the barefoot
 * species' arguments, and this is the answer iron gives.
 */
export declare function paintHobgoblinFoot(ctx: CanvasRenderingContext2D, hb: HobgoblinLook, fxx: number, fyy: number, s: number, fx: number, lead: number, hurt: boolean): void;
//# sourceMappingURL=hobgoblin.d.ts.map