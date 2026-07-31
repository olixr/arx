/**
 * Sword visual styles — the CAPE_STYLES pattern for the blade roster.
 * Each record is pure data over one painter vocabulary: a blade
 * silhouette, a guard, a grip, a pommel, and an optional living fx
 * channel (ember seams, frost fog, starlight) driven off nowMs so every
 * instance of a blade shimmers in phase with the world, not the frame.
 *
 * Painter laws (shared with armor.ts):
 * - hurt ⇒ flat #ffffff silhouette, no details, no fx;
 * - fills on the live ctx, no allocation in the draw path;
 * - the outline is the renderer's dilate pass — never stroked here;
 * - geometry lives in the held-item frame: +x runs hand → tip, the
 *   bright edge faces −y (the sun law), grip behind the fist at −x.
 */
export type BladeKind = 'arming' | 'falchion' | 'gladius' | 'scimitar' | 'saber' | 'rapier' | 'cutlass' | 'cleaver' | 'runeblade' | 'cloven' | 'crystal' | 'flared' | 'dirk' | 'stiletto' | 'kris' | 'karambit' | 'tanto' | 'shivkind' | 'talon' | 'leafblade';
export type GuardKind = 'cross' | 'swept' | 'shell' | 'disc' | 'fang' | 'thorn' | 'crown' | 'wing' | 'bolt' | 'coil' | 'stub' | 'none';
export type PommelKind = 'round' | 'gem' | 'fang' | 'ring' | 'crescent' | 'star' | 'crown' | 'none';
export type BladeFx = 'ember' | 'frost' | 'void' | 'storm' | 'blood' | 'sun' | 'star' | 'gleam' | 'ripple' | 'drip' | 'arc' | 'slither' | 'sunflare' | 'frostbloom' | 'petalfall' | 'orbit' | 'gravemist';
export interface SwordStyle {
    blade: BladeKind;
    /** Blade steel. Edge defaults to shade(+34), fuller to shade(−24). */
    color: string;
    edge?: string;
    fuller?: string;
    /** Blade length multiplier (1 ≈ half a body). */
    len?: number;
    guard: GuardKind;
    guardColor: string;
    grip?: string;
    /** Wrap-band accent on the grip. */
    wrap?: string;
    pommel?: PommelKind;
    pommelColor?: string;
    /** Jewel accent (gem pommels, crown settings). */
    gem?: string;
    /** Battle damage: dark bites knocked out of the cutting edge. */
    notched?: boolean;
    /**
     * A living core vein down the blade's center — the one bright thing
     * on a dark blade (the riftglass law brought to one-handers). It
     * REPLACES the fuller line's read and breathes on the world clock.
     */
    core?: string;
    /** Script ticks along the spine that light in a walking sequence. */
    runes?: string;
    /** Socketed stones marching the fuller line (the molten-slab read). */
    gems?: {
        color: string;
        n?: number;
    };
    fx?: BladeFx;
    fxColor?: string;
}
/**
 * The blade roster's wardrobe. Metal-line variants share their design's
 * silhouette record and change only the palette — one design, four
 * metals, exactly like armor colorways.
 */
export declare const SWORD_STYLES: Record<string, SwordStyle>;
/**
 * The rogue's roster wardrobe. Daggers reuse the whole SwordStyle
 * vocabulary at knife length — len runs 0.5–0.7, guards go small or
 * vanish, and the backstab identity lives in hooks, waves and needles.
 */
export declare const DAGGER_STYLES: Record<string, SwordStyle>;
/**
 * Resolve a held item to its blade style — swords and daggers share one
 * painter. Registry hits first; unknown '*sword' ids get an arming
 * fallback and unknown '*dagger' ids a dirk fallback, both in the item
 * color. Null means "not a blade".
 */
export declare function bladeStyle(itemId: string | undefined, color?: string): SwordStyle | null;
/** Back-compat alias — sword-only callers migrated to bladeStyle. */
export declare const swordStyle: typeof bladeStyle;
/**
 * Paint a sword in the held-item frame (origin at the fist, +x toward
 * the tip, rotation already applied by drawHeldItem). Scale s is the
 * body scale — a standard blade reaches ~0.5 s.
 */
export declare function drawSword(ctx: CanvasRenderingContext2D, st: SwordStyle, s: number, nowMs: number, hurt?: boolean): void;
export type BowKind = 'shortbow' | 'longbow' | 'recurve' | 'flatbow' | 'composite' | 'crude' | 'bone' | 'antler' | 'wing' | 'crystal' | 'talon' | 'brand' | 'fang' | 'harp' | 'loom' | 'siege';
export type BowTip = 'plain' | 'horn' | 'gold' | 'iron' | 'thorn' | 'bone';
/**
 * The legendary signature words (ten-flights law: each chase bow owns
 * ONE of these and no other bow wears it). All clocks ride nowMs —
 * icons pin one frame, and two frames must prove the motion.
 */
export type BowSig = 'budding' | 'dawnrays' | 'rimelight' | 'spurarcs' | 'emberseam' | 'hushfeathers' | 'bloodhaze' | 'glyphwalk' | 'starweft' | 'stormcrest';
export type BowCharm = 'feathers' | 'beads' | 'teeth' | 'leaves' | 'fur' | 'holes';
export interface BowStyle {
    bow: BowKind;
    /** Limb wood. Belly light defaults to shade(+26), wrap to shade(−30). */
    color: string;
    belly?: string;
    wrap?: string;
    /** Bowstring color (gut, sinew, silk). */
    string?: string;
    /** Tip-span multiplier over the kind's natural length. */
    len?: number;
    tip?: BowTip;
    tipColor?: string;
    charm?: BowCharm;
    charmColor?: string;
    /** Fletching color of the nocked arrow — identity at full draw. */
    fletch?: string;
    fx?: BladeFx;
    fxColor?: string;
    /** The one-owner legendary signature word (ten-flights law). */
    sig?: BowSig;
    sigColor?: string;
}
export declare const BOW_STYLES: Record<string, BowStyle>;
/**
 * Resolve a held item to its bow style. Registry hits first; unknown
 * '*bow' ids get a shortbow fallback in the item color. Null means
 * "not a bow" — the rig's isBow and drawHeldItem both key off this.
 */
export declare function bowStyle(itemId: string | undefined, color?: string): BowStyle | null;
/**
 * Paint a bow in the held-item frame (origin at the fist, +x toward the
 * target). `pull` is the string haul-back in px; `loose` the release
 * progress. Limbs flex with the pull; the belly passes x ≈ 0.18 s at
 * midline by construction (ctrlX = 0.36 s − tipX), so the rest-carry
 * grip translate keeps holding wood for every kind.
 */
export declare function drawBow(ctx: CanvasRenderingContext2D, st: BowStyle, s: number, nowMs: number, hurt?: boolean, pull?: number, loose?: number): void;
export type StaffShaft = 'straight' | 'gnarled' | 'twisted' | 'bone' | 'iron' | 'obsidian' | 'fluted';
export type StaffCrown = 'fork' | 'orb' | 'crook' | 'crescent' | 'skull' | 'twinprong' | 'sundisc' | 'coil' | 'thorns' | 'lantern' | 'shard' | 'ring' | 'knot' | 'branch' | 'wisp' | 'canopy' | 'winghalo' | 'phases' | 'cyclone' | 'plume' | 'eclipse' | 'chalice' | 'gyre' | 'comet' | 'crownring';
export type StaffFx = 'embers' | 'frost' | 'sparks' | 'motes' | 'leaves' | 'drip' | 'rays' | 'stars' | 'runes' | 'aurora' | 'petals' | 'glory' | 'moonveil' | 'gust' | 'flutter' | 'infall' | 'tithe' | 'glyphs' | 'stardust' | 'crownarcs';
export interface StaffStyle {
    shaft: StaffShaft;
    /** Shaft body color. Edge light defaults to shade(+28). */
    color: string;
    edge?: string;
    /** Fittings: wire wraps, collars, crown metal. */
    metal?: string;
    crown: StaffCrown;
    /** Crown structure color (defaults to metal). */
    crownColor?: string;
    /** The focus — the element made visible. */
    gem?: string;
    /** Hot core / glint inside the focus. */
    gemCore?: string;
    /** Length multiplier (1 ≈ body-tall). */
    len?: number;
    /** Iron shoe at the butt — a stick that gets WALKED on. */
    ferrule?: boolean;
    fx?: StaffFx;
    fxColor?: string;
}
export declare const STAFF_STYLES: Record<string, StaffStyle>;
/**
 * Resolve a held item to its staff style. Registry hits first; unknown
 * '*staff' ids get the classic fork-and-orb in the item color. Null
 * means "not a staff" — the rig's isStaff and drawHeldItem key off it.
 */
export declare function staffStyle(itemId: string | undefined, color?: string): StaffStyle | null;
/**
 * Paint a staff in the held-item frame (origin at the fist, +x toward
 * the crown). `grip` is the fraction of length trailing below the hand
 * — the rig slides it with carriage. `castT` flares the focus while
 * the spell leaves.
 */
export declare function drawStaff(ctx: CanvasRenderingContext2D, st: StaffStyle, s: number, nowMs: number, hurt?: boolean, grip?: number, castT?: number): void;
/**
 * A greatweapon's look — THE ARMORY's vocabulary. Three dialects share
 * the frame: the GREATBLADE (a sword grown past apology), the
 * double-headed GREATAXE (twin bits arguing off one haft), and the
 * MAUL (a quarry head on a war haft). Like the sword roster, every
 * record is pure data over one painter vocabulary: a silhouette, a
 * guard, fittings, and an optional living fx channel. Flat like
 * everything else: each mass is a base fill + one lit plane + one
 * line; the renderer's dilate rings the body, so nothing here strokes
 * its own outline.
 */
export type GreatbladeKind = 'colossus' | 'leaf' | 'cruciform' | 'spire' | 'cleaverback' | 'flamberge' | 'sawback';
export type GreataxeHead = 'crescent' | 'bearded' | 'jaws' | 'scrap' | 'halfmoon';
export type GreatGuard = 'bar' | 'cross' | 'wing' | 'crown' | 'thorn' | 'hook' | 'stub';
export type GreatPommel = 'wheel' | 'ring' | 'coin' | 'star' | 'bone' | 'gem' | 'none';
export interface GreatStyle {
    kind: 'greatblade' | 'maul' | 'greataxe';
    /** Blade silhouette (greatblade dialect). Default 'colossus'. */
    blade?: GreatbladeKind;
    /** Head silhouette (greataxe dialect). Default 'crescent'. */
    head?: GreataxeHead;
    /** Maul head build. Default 'block'; 'bell' is a cast bell. */
    maul?: 'block' | 'bell';
    /** Steel / head color. */
    color: string;
    /** Lit edge or top plane; defaults shade(+34). */
    edge?: string;
    /** The one dark line (fuller / head seam); defaults shade(−24). */
    fuller?: string;
    guardColor: string;
    /** Guard build (greatblade only). Default 'bar'. */
    guard?: GreatGuard;
    grip?: string;
    /** Wrap-band accent on the long grip / haft. */
    wrap?: string;
    pommel?: GreatPommel;
    pommelColor?: string;
    /** Jewel accent (gem pommels, the seated stone between axe heads). */
    gem?: string;
    /**
     * A living core channel down the blade's center — the vein of color
     * every storied blade in the references carries. Replaces the dark
     * fuller line (still one line's worth of budget, now the loudest
     * thing on the steel).
     */
    core?: string;
    /** Script ticks marching the fuller — worked, not glowing. */
    runes?: string;
    /** Axe head-mount collar; defaults to guardColor. */
    collar?: string;
    /** Greataxe: a finishing spike past the crown. */
    spike?: boolean;
    /** Battle damage: dark bites knocked out of the working edge. */
    notched?: boolean;
    fx?: BladeFx;
    fxColor?: string;
    /** Length multiplier — 1 runs ~1.12 of a body scale, tip to pommel. */
    len?: number;
}
/**
 * THE ARMORY — the great school's roster. Twenty-two weapons, no two
 * silhouettes wearing the same clothes: the forge lines relearn the
 * shape at every metal, and every owned find answers "who held this?"
 */
export declare const GREAT_STYLES: Record<string, GreatStyle>;
/**
 * Resolve a greatweapon look. Registry first; unknown ids that read
 * as great steel (`greatblade`/`greatsword`/`maul`/`warhammer`) get a
 * cached color-derived fallback — degrade, never invisible. CHECK
 * GREAT FIRST: 'greatsword' also satisfies bladeStyle's '*sword'
 * fallback, so every dispatch site must ask this registry before the
 * one-hand one.
 */
export declare function greatStyle(itemId: string | undefined, color?: string): GreatStyle | null;
/**
 * Paint a greatweapon in the held-item frame (origin at the MAIN fist,
 * +x toward the tip). `grip` is the fraction of total length trailing
 * behind the fist — the rig slides it through carries and strikes the
 * way the staff does, and the long two-fist handle is the painter's
 * whole argument that this weapon owns both hands.
 */
export declare function drawGreatweapon(ctx: CanvasRenderingContext2D, st: GreatStyle, s: number, nowMs: number, hurt?: boolean, grip?: number): void;
//# sourceMappingURL=weapons.d.ts.map