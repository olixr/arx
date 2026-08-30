import { type ItemRoll } from '@arx/shared';
/**
 * THE DROPPED WORLD — every item's honest form on the ground.
 *
 * For years a dropped item was a leather bag with a topper. This module
 * replaces the bag with a REPRESENTATION LAW: an item on the ground is
 * the item, at the world's own scale, wherever the thing can honestly
 * be shown — and a deliberate, slot-shaped generalization where a 1:1
 * render would lie or mud (armor worn on a body has no honest "on the
 * ground" pose; it becomes the smith's bundle of its own slot, in its
 * own colors).
 *
 * The families:
 *  - WEAPONS AND TOOLS lie on the ground at their true held scale,
 *    painted by the SAME style painters that dress the fist — zero art
 *    drift, living fx channels still breathing on the dirt. The lay is
 *    a ground-plane projection (y-squash OUTSIDE the lay rotation), so
 *    a spear reads as a spear lying in the grass, not a spear pasted on
 *    it. Shields lie face-up through drawShieldAt's plane yaw.
 *  - ARMOR is the DELIBERATE GENERALIZATION, per slot: a helm's dome, a
 *    strapped cuirass bundle, folded legwear, a standing pair of boots,
 *    crossed gloves, a rolled cloak — each tinted by the piece and
 *    dressed by its armor class (cloth folds, leather stitch, plate
 *    sheen). Offhand tomes/orbs/quivers get their own true forms.
 *  - MATERIALS are 1:1: logs with ring faces, plank stacks, ingots that
 *    pyramid as the stack grows, draped pelts, cloth bolts, crystal
 *    shards glowing in their school's color, scrolls with wax seals,
 *    real keys, rings, bones, feathers, seed pouches, produce heaps,
 *    steaming bowls, cheese wheels with the wedge cut out.
 *  - THE SATCHEL survives as the last-resort fallback only — if a thing
 *    can't be shown beautifully, the generalization must still be.
 *
 * Stack grammar is per-family (bars pyramid, fish fan, scrolls fan,
 *  produce heaps) — a pile reads as a PILE before its label confirms it.
 * Rarity is a ground statement: uncommon+ rolls glow in their tier's
 *  color, rare+ orbit motes, legendary breathes a soft light shaft.
 *
 * Everything renders inside the drop's local frame: origin at the
 * drop's ground point, +y down, one world tile = `k` px. The caller
 * (renderer.dropItem) owns landing pop, bob, contact shadow, hover
 * and the loot label; this module owns the matter itself.
 */
export type GroundForm = 'coins' | 'ore' | 'egg' | 'weapon' | 'tool' | 'shield' | 'tome' | 'orb' | 'quiver' | 'arrows' | 'log' | 'board' | 'bar' | 'hide' | 'clothbolt' | 'wool' | 'cotton' | 'spool' | 'sheaf' | 'gem' | 'pearl' | 'dust' | 'scroll' | 'paper' | 'key' | 'ring' | 'bone' | 'fang' | 'shellplate' | 'feather' | 'sac' | 'slag' | 'seedpouch' | 'sapling' | 'twigbundle' | 'acorn' | 'pinecone' | 'resin' | 'waxcake' | 'sack' | 'soil' | 'crate' | 'saddle' | 'lead' | 'wateringcan' | 'locket' | 'token' | 'laurel' | 'truffle' | 'fish' | 'bird' | 'steak' | 'root' | 'bulb' | 'leafhead' | 'gourd' | 'fruit' | 'berries' | 'loaf' | 'cake' | 'pie' | 'dish' | 'bowl' | 'board_feast' | 'butter' | 'cheese' | 'jug' | 'pail' | 'honeypot' | 'jar' | 'skillet' | 'burnt' | 'potion' | 'oilvial' | 'salvepot' | 'helm' | 'bodyarmor' | 'legarmor' | 'boots' | 'gloves' | 'cape' | 'trinket' | 'satchel';
/**
 * The classification law: every item id resolves to exactly one ground
 * form. Field-derived families first (weapon styles, slots, scroll
 * fields), then the explicit id maps, then the satchel.
 */
export declare function groundForm(itemId: string): GroundForm;
export interface GroundDropEnv {
    ctx: CanvasRenderingContext2D;
    /** Camera scale: px per world tile. */
    k: number;
    /** Entity id — seeds deterministic per-drop jitter and fx phase. */
    eid: number;
    itemId: string;
    qty: number;
    now: number;
    /** Outline ink (hover brightens it). */
    outline: string;
    hovered: boolean;
    roll?: ItemRoll;
}
/** Contact-shadow spread multiplier per form (the caller draws it). */
export declare function groundShadowSpread(itemId: string): number;
/**
 * The drop's ground glow, if it earns one: rolled rarity above common
 * speaks in its tier color; crystal matter glows in its school; big
 * coin piles and high-value goods keep their classic shimmer.
 */
export declare function groundGlowFor(itemId: string, qty: number, roll?: ItemRoll): {
    rgb: string;
    r: number;
    a: number;
} | null;
/**
 * Paint one drop's matter inside the drop-local frame (origin at the
 * ground point, +y down, `k` px per tile). The caller owns landing
 * pop/bob (applied to the frame), contact shadow, hover ring, glow
 * queueing and the loot label.
 */
export declare function drawGroundDrop(g: GroundDropEnv): void;
/**
 * THE TUMBLE — a drop's landing choreography, as pure kinematics the
 * renderer samples by age. The item falls a real ballistic arc, takes
 * two damped bounces with squash-and-stretch at each contact, rocks a
 * decaying wobble as it settles, and only then hands over to the idle
 * bob. A per-drop stagger delay means a slain foe's spill POPS like a
 * split satchel instead of landing as one synchronized clap.
 *
 * All lengths are in TILES (the caller multiplies by camera scale).
 */
export interface DropLanding {
    /** Height above the ground, tiles (0 once settled). */
    lift: number;
    /** Vertical scale: >1 stretching in flight, <1 squashing at contact. */
    squash: number;
    /** Settling rock, radians — apply to the whole drop frame. */
    wobble: number;
    /** Appear-grow scale (0.9 → 1 over the first beat). */
    pop: number;
    /** Ground contacts so far (0..3) — dust fires on each increase. */
    contacts: number;
    /** True once the whole choreography is over. */
    settled: boolean;
}
/** Full choreography duration (after the per-drop delay). */
export declare const LAND_TOTAL: number;
/** The per-drop stagger: 0..0.14s, deterministic per eid. */
export declare function dropLandDelay(eid: number): number;
export declare function dropLanding(eid: number, ageSec: number): DropLanding;
/**
 * THE QUIET PLATE — the loot label's visibility law, pure so the pins
 * can hold it. With every drop wearing its honest form, the ART is the
 * first read; a plate is the SECOND read, invited three ways:
 *  - hover / the reveal hold: full read, always;
 *  - a rolled rare+ drop or a dungeon key announces at range — the
 *    payoff beat must never hide;
 *  - anything else whispers only within arm's reach.
 */
export declare function lootLabelAlpha(dist: number, hovered: boolean, showAll: boolean, rarTier: number): number;
/** A roll's tier index (0 = common/rollless) — the label law's key. */
export declare function rarTierOf(roll?: ItemRoll): number;
/**
 * Plate priority under crowding — when more plates want in than the
 * screen can hold legibly, the payoff wins, then the pointer, then
 * whatever is closest. Higher score = keeps its plate.
 */
export declare function lootPlateScore(hovered: boolean, rarTier: number, value: number, dist: number): number;
/**
 * Whether the renderer should echo shrunken siblings behind the front
 * item for a merged stack. Families that draw their OWN pile grammar
 * (coin piles, egg clutches, log cords, bar pyramids, fanned fish,
 * scroll fans, potion clusters, produce heaps...) refuse the echo.
 */
export declare function drawsOwnPile(itemId: string): boolean;
//# sourceMappingURL=groundItems.d.ts.map