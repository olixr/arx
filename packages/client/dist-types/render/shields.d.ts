import { type ArxMark } from './wornLight.js';
/**
 * THE GREATSHIELD CLASS. Above the pavise the roster stops sharing a
 * silhouette: a tank's shield is the first thing anyone sees of them,
 * and three top-tier walls that differ only in paint are three copies
 * of the same shield. `wall`, `bastion` and `aegis` are all "a tower
 * shield" to the equipment system, and three different objects to the
 * eye — a calved slab, a battlement, and a crowned greatshield.
 */
export type ShieldShape = 'buckler' | 'round' | 'heater' | 'kite' | 'tower' | 'wall' | 'bastion' | 'aegis' | 'targe' | 'ribwall' | 'thorn' | 'breach' | 'door' | 'palisade' | 'gate' | 'carapace' | 'courtround' | 'pinion' | 'reliquary' | 'furnace' | 'leaf' | 'riftward' | 'falls' | 'colossus';
/**
 * The material dialect. Wood is BUILT — staves, seams, a bound rim you
 * can count the rivets on. Metal is FORGED — one continuous face,
 * beveled facets, a hard specular band. They must never paint alike.
 */
export type ShieldMaterial = 'wood' | 'iron' | 'steel' | 'bronze';
/** The heraldic charge across the face. */
export type ShieldDevice = 'none' | 'chevron' | 'diamond' | 'cross' | 'crown' | 'moon' | 'star' | 'fang';
/** Field division — how the face is quartered before the charge lands. */
export type ShieldField = 'plain' | 'pale' | 'bend' | 'chief' | 'quarter';
export interface ShieldStyle {
    /** THE WORN LIGHT: the bonded working, overlaid per instance. */
    arx?: ArxMark;
    shape: ShieldShape;
    material: ShieldMaterial;
    /** The field: the face's own color. */
    face: string;
    /** Second tincture for a divided field. */
    faceAlt?: string;
    field?: ShieldField;
    /** Bound rim / edge metal. */
    rim: string;
    /** Umbo. Undefined = a strapped shield with no boss. */
    boss?: string;
    device?: ShieldDevice;
    deviceColor?: string;
    /** Rivets around the bound rim — the built read. */
    studs?: boolean;
    /** Forged punch spikes (buckler dialect). */
    spikes?: boolean;
    /**
     * THE SPIKE PLAN. Spikes are not trim — they are the weapon half of
     * a shield's character, and a goblin's bent nails, a wolf-earned
     * fang crown and a champion's bone spurs must not all wear the same
     * four studs on the quarters. Angles are design-space (−π/2 = the
     * crown); unset = the quarters, which is the buckler's honest
     * default. All of it still roots on the OUTLINE via reachAlong.
     */
    spikeAngles?: number[];
    /** Tip reach past the binding, 1 = flush. Default 1.2. */
    spikeLen?: number;
    /** Half-width of a spike's root. Default 0.125. */
    spikeW?: number;
    /** Spike metal. Default: forged from the rim. Bone spurs are not. */
    spikeColor?: string;
    /** Stave count for wood faces. */
    planks?: number;
    /** Dish depth, 0 flat → 1 deeply bowled. */
    curve?: number;
    /** Leather of the enarmes on the back. */
    strapColor?: string;
    /**
     * THE SIGNATURE LAW (see below): the bespoke face painter for THIS
     * shield. Unset = the generic material dialect, which is what an
     * unknown or derived shield falls back to.
     */
    sig?: string;
    /**
     * THE LADDER: 1 a footsoldier's kit → 4 a treasure. It buys fittings,
     * not noise — a higher rung wears more real METAL, cut in more
     * planes, and its charge is worked rather than painted on.
     */
    tier?: number;
}
export declare const SHIELD_STYLES: Record<string, ShieldStyle>;
/**
 * The shield for an item — the bespoke record when one exists, else a
 * coherent one derived from the offhand's palette so an unknown shield
 * still paints as a real shield in the right dialect, never as a slab.
 */
export declare function shieldStyle(itemId: string, kind: 'buckler' | 'kite' | 'tower', color: string, trim: string, boss?: string): ShieldStyle;
/** The solved plane — everything the painters and the arm both need. */
export interface ShieldFrame {
    shape: ShieldShape;
    /** Screen center of the plane. */
    cx: number;
    cy: number;
    /** The yaw law's angle: 0 face-on, π/2 edge-on, π back-on. */
    theta: number;
    /** Screen-plane roll. */
    tilt: number;
    /** ±1: which screen side design +u (the outer edge) runs toward. */
    oside: number;
    /** ±1: the profile sign (which way the face normal rakes at profile). */
    sgnP: number;
    /** Screen half-extents and shell thickness, in pixels. */
    hw: number;
    hh: number;
    depth: number;
    curve: number;
    /** Where the fist actually closes — the arm's IK target. */
    gripX: number;
    gripY: number;
    /** Elbow pole preference for the off arm's two-bone solve. */
    poleX: number;
    poleY: number;
    /** cos θ < 0: the bearer is turned away and we read the shield's back. */
    seeBack: boolean;
    /** |cos θ|: how open the face is, 0 edge-on → 1 square to the camera. */
    open: number;
    /**
     * THE DEPTH LAW: the plane sits on the camera's side of the body, so
     * it paints over the torso. Held, that is true when the bearer faces
     * us; slung, when they are walking away — one flag, both cases.
     */
    front: boolean;
    /** How far onto the back the shield has traveled, 0 in hand → 1 slung. */
    sling: number;
    /**
     * 1 = combat guard, 0 = the relaxed carry. The rune face reads this
     * ("flares on guard" — the offhand's documented rhythm): the sigil
     * ring brightens as the shield squares up. Optional because the
     * free-standing frames (icons, ragdolls) have no bearer to guard.
     */
    guard?: number;
}
/**
 * THE GUARD LAW. Out of combat the shield rides at a relaxed carry —
 * turned a little off the line, hanging at the chest. The instant the
 * body means it, the shield squares up, rises, and comes across the
 * centerline: the tank read. It never rotates onto the forearm, never
 * lies flat, never leaves the front of the body.
 *
 * Everything here is continuous in its channels, so a shield settling
 * out of a fight travels back to the carry over the same blend every
 * other piece of carriage uses.
 */
export declare function solveShield(st: ShieldStyle, o: {
    /** Body center and the hip line it hangs from. */
    x: number;
    hipY: number;
    /** The shoulder line — where the guige carries a slung shield. */
    shoulderY: number;
    s: number;
    /** Fake-3D width squash from the solver. */
    wS: number;
    /** Facing (fx = screen x, fy > 0 = toward the camera). */
    fx: number;
    fy: number;
    /** Smoothed profile side from the rig (sign of fx, eased through 0). */
    sideS: number;
    /** 1 = settled into rest carriage, 0 = combat guard. */
    restSettle: number;
    /** Gait: smoothed swing drive, run blend, travel pole, its strength. */
    swing: number;
    runF: number;
    poleX: number;
    poleY: number;
    poleStrength: number;
    /** Sneak crouch blend. */
    crouch: number;
    /**
     * THE SLING: 0 = in the fist, 1 = carried on the back by its guige.
     * Rides the body's own sheathe clock, so a shield goes away with
     * the sword it fights beside and comes back with it.
     */
    sling: number;
    /** Melee combo stage (−1 none) and its normalized clock. */
    melee: number;
    poseT: number;
    /** Finisher drive, 0..1 — the shield rams forward with the body. */
    thrust: number;
    nowMs: number;
}): ShieldFrame;
/**
 * The shield, painted from the plane out: the far ring, the shell's
 * side wall (which becomes the whole silhouette at profile and carries
 * the foreshortened top plane), then the near ring wearing either the
 * face's heraldry or the back's straps and staves.
 */
export declare function drawShield(ctx: CanvasRenderingContext2D, st: ShieldStyle, fr: ShieldFrame, hurt: boolean, nowMs: number): void;
/**
 * The strap pass, painted AFTER the arm when the bearer is turned
 * away: the forearm goes THROUGH the enarmes, so the leather crosses
 * over the sleeve instead of the arm floating on the boards.
 */
export declare function drawShieldStraps(ctx: CanvasRenderingContext2D, st: ShieldStyle, fr: ShieldFrame, hurt: boolean): void;
/** True when an offhand kind is a shield and belongs to this dialect. */
export declare function isShieldKind(kind: string): kind is 'buckler' | 'kite' | 'tower';
/**
 * A free-standing shield in an arbitrary frame — the inventory icon and
 * the fallen shield of a ragdoll both come through here, so a shield
 * looks like ITSELF wherever it appears. Nothing is re-authored: the
 * icon is the world art, turned three-quarters on and lit by the same
 * sun.
 */
export declare function drawShieldAt(ctx: CanvasRenderingContext2D, st: ShieldStyle, o: {
    cx: number;
    cy: number;
    /** Half-height in the caller's units; the width follows the shape. */
    size: number;
    /** Plane yaw: 0 square to the eye, π/2 edge-on, π showing its back. */
    theta: number;
    tilt: number;
    /** Which way the design's outer edge runs (+1 screen-right). */
    oside?: number;
    hurt?: boolean;
    nowMs?: number;
}): void;
//# sourceMappingURL=shields.d.ts.map