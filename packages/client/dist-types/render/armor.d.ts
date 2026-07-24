/**
 * Visual equipment styles — the CAPE_STYLES pattern extended to every
 * armor slot. Each record is pure JSON-shaped data a painter interprets;
 * the content pass authors records + palettes here, never new painters.
 * Unknown items fall back to silhouettes derived from their item color,
 * so every future def is dressed the moment it exists.
 *
 * Painters run inside drawHumanoid's frames (torso squash frame, head
 * frame, arm joints) so the fake-3D foreshortening and facing bands are
 * inherited for free. Laws every painter obeys:
 * - hurt ⇒ paint flat #ffffff (the white-flash silhouette);
 * - fills/strokes on the live ctx only, no allocation, ≤ ~10 subpaths
 *   per garment (the cape budget — these run per entity per frame);
 * - front/profile/back reads gate on profileK/backK/lead like the face.
 */
export type ArmorClassStyle = 'cloth' | 'leather' | 'plate';
export interface BodyStyle {
    color: string;
    trim: string;
    /** Rivets, buckles, plate edges. Default shade(color, -20). */
    metal?: string;
    cls: ArmorClassStyle;
    silhouette: 'tunic' | 'robe' | 'jerkin' | 'cuirass' | 'brigandine';
    pauldron: 'none' | 'round' | 'spiked' | 'layered' | 'bladed' | 'fur' | 'feathered' | 'orbs';
    pauldronColor?: string;
    /** Bright edge accent on the pauldron rim / blade edge. */
    pauldronTrim?: string;
    /** Spike count for 'spiked' pauldrons, 1..3. Default 1. */
    pauldronSpikes?: number;
    chest: 'none' | 'straps' | 'plate' | 'emblem' | 'stitch' | 'scales';
    /** Hanging leather fringe strips off the chest yoke — the buckskin read. */
    fringe?: boolean;
    /** Big mismatched cloth patches with stitch ticks — the homespun read. */
    patches?: string;
    emblem?: 'chevron' | 'diamond' | 'bolt' | 'skull' | 'sun' | 'leaf' | 'star' | 'moon' | 'eye' | 'moth' | 'coin';
    /** Glowing rune dashes riding the hem trim — the enchanted-cloth read. */
    runes?: string;
    /** A waist sash: band, hip knot, two swinging tails. */
    sash?: string;
    /** Hip plates hanging from the fauld — the heavy-knight lower read. */
    tassets?: boolean;
    /** Vertical fluting on the breastplate — the Gothic-plate read. */
    ridges?: boolean;
    /** Robe/coat skirt length below the belt line, tiles. 0 = none. */
    skirt: number;
    skirtSlit?: boolean;
    /** drawArm sleeve override. Default shade(color, -12) — today's law. */
    sleeve?: string;
    /** Neck treatment: plate gorget ring or a fur ruff. */
    collar?: 'gorget' | 'fur';
    /** A belt pouch on the hip — the adventurer's secondary read. */
    pouch?: boolean;
    /** A diagonal shoulder-to-hip cord with bone toggles — the trapper. */
    bandolier?: string;
    /** A brush tail swinging off the trailing hip — the fox trophy read. */
    tail?: {
        color: string;
        tip: string;
    };
    /** Hem/trim accent that breathes with a slow ember pulse. */
    glowTrim?: string;
    /** Full sleeves: the forearm wears cloth with a belled cuff (robes). */
    sleeves?: 'full';
    /** Shoulder mantle (cope) color — the layered wizard majesty read. */
    mantle?: string;
    /** A second hem layer beneath the skirt — flowing depth. */
    underskirt?: string;
    /** Drifting magic motes in this color — the quiet aura. */
    motes?: string;
}
export interface HelmStyle {
    color: string;
    trim: string;
    /** THE FORGE LAW: every metal kind is a FULL-FACE helm with its own
     *  forged silhouette — a knight's helm owns the whole head. The old
     *  open `dome`/`horned` caps are gone; caps read as placeholders.
     *  `bascinet` is the pig-faced full helm (protruding snout box);
     *  `barbute` wears a bold T-cut; `armet` a slatted wedge visor with
     *  pivot roundels; `sallet` a swept tail + icicle bevor; `radiant` a
     *  sculpted sun-mask; `ramfort` the riveted siege bucket; `warmask`
     *  the raider's bronze face plate; `dread` the tooth-visored maw;
     *  `briar` the woven thorn-cage visor; `drake` the lapped-scale
     *  visage with a copper snout. */
    kind: 'greathelm' | 'bascinet' | 'barbute' | 'armet' | 'sallet' | 'radiant' | 'ramfort' | 'warmask' | 'dread' | 'briar' | 'drake' | 'hood' | 'circlet' | 'wizard';
    visor?: 'slit' | 'cross';
    plume?: {
        color: string;
    };
    /** `curl` bends the sweep into a ram's spiral beside the temples;
     *  `tine` forks a second point off each horn — the bramble read. */
    horns?: {
        color: string;
        size: number;
        curl?: boolean;
        tine?: boolean;
    };
    /** Up-curved boar tusks flanking the jaw — the charge read. */
    tusks?: {
        color: string;
    };
    /** A row of forged spikes riding the crown centerline, front-to-back
     *  — the mohawk of war. Reads as rising points frontal, a full
     *  spiked ridge at profile. */
    spikesCrown?: {
        color: string;
    };
    /** Swept-back side fins — blade silhouettes off the temples. */
    fins?: {
        color: string;
    };
    /** Upswept feathered wing blades — the valkyrie read. */
    wings?: {
        color: string;
    };
    /** A solid metal ridge crest riding the crown centerline. */
    crest?: {
        color: string;
    };
    /** The forge-accent metal: warmask cheek plates, dread bevor teeth,
     *  briar cage bars, ramfort keel plate, drake snout. Each kind
     *  interprets it as ITS structural second metal — never a tint. */
    jaw?: string;
    /** Wizard hats: a band buckle / star charm on the crown. */
    charm?: string;
    /** Hoods: a lumpy fur ruff ringing the face opening. */
    ruff?: {
        color: string;
    };
    /** Hoods: pricked ear points on the crown. `tall` is the hare read
     *  (long upright blades); `tip` paints the top third — black-tipped
     *  hare and fox ears both. */
    ears?: {
        color: string;
        tall?: boolean;
        tip?: string;
    };
    /** Hoods: a swept feather tucked at the temple, trailing back. */
    feather?: {
        color: string;
    };
    /** Hoods: a half-mask across the lower face — the rogue read.
     *  Warmask: the sculpted face-plate metal behind the bronze work. */
    mask?: string;
    /** Hoods: two bold curled moth feelers off the crown, clubbed tips. */
    antennae?: {
        color: string;
    };
    /** Hoods: branched ivory antlers — the forest-king crown. */
    antlers?: {
        color: string;
    };
    /** Hoods/domes: a cut gem set at the brow band. */
    gem?: {
        color: string;
    };
    /** A floating ring above the crown that never quite touches down. */
    halo?: {
        color: string;
    };
}
export interface LegStyle {
    kind: 'pants' | 'greaves' | 'wraps';
    /** Default: today's pants-color law (look pants / darkened body). */
    thigh?: string;
    shin?: string;
    knee?: 'none' | 'plate' | 'wrap';
    kneeColor?: string;
}
export interface BootStyle {
    color: string;
    /** Shaft height up the shin, tiles. 0.06 ≈ the bare foot chip. */
    height: number;
    cuff?: {
        color: string;
    };
    /** Metal toe cap color (sabatons). */
    toe?: string;
    /** A short spike off the shaft top — dread sabatons. */
    spike?: boolean;
    /** Crossed straps climbing the shaft — the scout's lacing. */
    wrap?: {
        color: string;
    };
    /** A lumpy fur top instead of a clean cuff — winter boots. */
    fur?: {
        color: string;
    };
    /** A curled slipper toe — the wizard's footnote. */
    curl?: boolean;
}
/**
 * Gloves dress BOTH solved arms as one armor unit: the hand (in one of
 * four silhouette molds), the FULL forearm from elbow to wrist (skin
 * never shows on a gloved arm), and a cuff at the elbow seam where the
 * glove flows into the sleeve. Devices (spikes, talons, studs, gems)
 * ride the hand. Robed sleeves win the forearm: under a belled cuff a
 * glove keeps only its hand and knuckle device — the sleeve is a tube
 * the hand lives in.
 */
export interface GloveStyle {
    /** The hand itself. */
    color: string;
    /** Hand silhouette: gauntlet = squared plated fist with a hard end
     * cap, glove = fitted taper with a finger seam, wrap = taper crossed
     * by binding strips, paw = round beast mitt with toe splits. */
    hand?: 'glove' | 'gauntlet' | 'wrap' | 'paw';
    /** Forearm color, elbow to wrist. Absent = shade(color, −8). */
    bracer?: string;
    /** The elbow-seam treatment where glove meets sleeve. */
    cuff?: {
        color: string;
        /** band = buckled strap, flare = forged vambrace mouth, fur = pelt
         * roll, roll = folded-over top. */
        kind: 'band' | 'flare' | 'fur' | 'roll';
    };
    /** Device on the back of the hand / past the knuckles. */
    knuckle?: {
        color: string;
        /** studs = riveted domes, spikes = forged punch spikes on a
         * knuckle bar, claws = curved talons, plate = beveled hand plate,
         * gem = a bezel-set jewel. */
        kind: 'studs' | 'spikes' | 'claws' | 'plate' | 'gem';
    };
    /** Fingertips stay bare — the thief's fingerless cut. */
    fingerless?: boolean;
}
export interface OffhandStyle {
    /** 'weapon' = a dual-wielded blade: the rig paints the actual weapon. */
    kind: 'buckler' | 'kite' | 'tower' | 'tome' | 'quiver' | 'orb' | 'weapon';
    color: string;
    trim: string;
    boss?: string;
    spikes?: boolean;
    emblem?: 'chevron' | 'diamond';
}
export declare const BODY_STYLES: Record<string, BodyStyle>;
export declare const HELM_STYLES: Record<string, HelmStyle>;
export declare const LEG_STYLES: Record<string, LegStyle>;
export declare const BOOT_STYLES: Record<string, BootStyle>;
/**
 * The glove wardrobe. Every themed set's pair is designed against that
 * set's own devices — a Warden glove grows the leaf-bladed patina, a
 * Dreadforge glove spikes like its pauldrons — never a generic mitt
 * with a new tint. Populated per-set in the wardrobe passes below.
 */
export declare const GLOVE_STYLES: Record<string, GloveStyle>;
export declare const OFFHAND_STYLES: Record<string, OffhandStyle>;
/** Unknown body item: a plain tunic in the item's color — today's read. */
export declare function bodyStyle(itemId: string): BodyStyle;
/** Unknown head item: a tinted barbute — full-face even as a stand-in,
 *  because a cap reads as a placeholder (THE FORGE LAW). */
export declare function helmStyle(itemId: string): HelmStyle;
export declare function legStyle(itemId: string): LegStyle;
export declare function bootStyle(itemId: string): BootStyle;
/** Unknown glove item: a plain mitt in the item's color, strap cuff. */
export declare function gloveStyle(itemId: string): GloveStyle;
export declare function offhandStyle(itemId: string): OffhandStyle;
/**
 * The torso local frame drawHumanoid establishes before calling in:
 * translated to the hip line, rotated by combat lean, scaled by the
 * fake-3D squash — every coordinate here foreshortens for free.
 */
export interface TorsoFrame {
    s: number;
    /** Shoulder / waist half-widths, hip→shoulder height (local units). */
    tw: number;
    ww: number;
    th: number;
    lead: number;
    profileK: number;
    backK: number;
    hurt: boolean;
    /** Foot-lift differential — the gait beat hems sway on. */
    strideSw: number;
    /** Wall-clock ms — hem flutter, ember pulses, living details. */
    nowMs: number;
    /** Gait blend 0..1 — billow and cloth drag scale with real speed. */
    runF: number;
    /**
     * Cloth drag in local x: the hem trails the direction of travel like
     * real cloth (screen travel, un-squashed by the caller). Signed.
     */
    dragX: number;
}
/**
 * Torso garment. Replaces the fixed tunic: the `tunic` silhouette with
 * no details is stroke-for-stroke the original body. Pauldrons are NOT
 * drawn here — they are true shoulder joints, painted in screen space
 * on the solved shoulder anchors (drawPauldron) so they ride the arms.
 */
export declare function drawTorsoGarment(ctx: CanvasRenderingContext2D, st: BodyStyle, f: TorsoFrame): void;
/**
 * A pauldron as a real shoulder JOINT: painted in screen space on the
 * solved shoulder anchor, after its arm, so it caps the arm root and
 * rides swings instead of staying glued to the torso corners. `side`
 * is the outward direction sign; `squashK` is the body's facing squash.
 */
export declare function drawPauldron(ctx: CanvasRenderingContext2D, st: BodyStyle, x: number, y: number, side: number, s: number, squashK: number, hurt: boolean, near: boolean, nowMs?: number): void;
/** The head local frame (inside the torso squash) drawHelmet works in. */
export interface HeadFrame {
    s: number;
    headX: number;
    headY: number;
    hw: number;
    hh: number;
    cut: number;
    headR: number;
    fx: number;
    profileK: number;
    backK: number;
    lead: number;
    hurt: boolean;
    /** Wall-clock ms — hat-tip sway, living micro-motion. */
    nowMs: number;
}
/**
 * Styled head gear. `dome` reproduces the original helmet exactly;
 * the other kinds extend the same band grammar the face uses.
 */
export declare function drawHelmet(ctx: CanvasRenderingContext2D, st: HelmStyle, f: HeadFrame): void;
/**
 * Arm-carried offhand, strapped to the solved off forearm — drawn in
 * the same depth layer as the arm so the strap never breaks.
 */
export declare function drawOffhandOnArm(ctx: CanvasRenderingContext2D, st: OffhandStyle, arm: {
    ex: number;
    ey: number;
    kx: number;
    ky: number;
}, s: number, profileK: number, hurt: boolean): void;
/**
 * Back-mounted quiver (screen space, at the shoulder line). Depth is
 * the caller's: behind the torso when the player faces the camera, in
 * front when they face away — the cape's facing law. When a cape is
 * worn the quiver drops to the off hip so cloth and leather never fight.
 */
export declare function drawQuiver(ctx: CanvasRenderingContext2D, st: OffhandStyle, x: number, y: number, s: number, lead: number, hurt: boolean): void;
//# sourceMappingURL=armor.d.ts.map