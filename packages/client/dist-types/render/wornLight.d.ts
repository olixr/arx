import type { EquipSlot } from '@arx/shared';
/**
 * THE WORN LIGHT — the one law for what an enchantment LOOKS like on a
 * body. Weapons had this since the first enchant shipped (rig.ts's
 * enchantedStyle re-aims the blade's mote channel); every other slot
 * showed nothing at all until tier 3, where all eight collapsed into
 * one identical corona. This module is what the other seven slots use.
 *
 * ------------------------------------------------------------------
 * THE ANTI-MUSH LAW: ONE CHANNEL PER SLOT.
 *
 * A fully kitted character wears up to eight workings at once. If every
 * slot glowed the same way the character would read as a lit blob and
 * the player could not tell which of their choices they were looking
 * at. So each slot owns a DIFFERENT channel, in a different PLACE, at a
 * different RHYTHM:
 *
 *   weapon  - the edge      light travelling the blade (pre-existing)
 *   offhand - the rune face a sigil that sits quiet and flares on guard
 *   head    - the brow      a mark at the temples; a real lamp after dark
 *   body    - the weave     rune dashes on hem and seam, breathing slow
 *   gloves  - the knuckles  a flicker at the fists, brightest mid-swing
 *   legs    - the greaves   thin light down the thigh, pulsing in stride
 *   boots   - THE TRAIL     prints and shed motes behind a runner
 *   cape    - the wake      motes shedding off the trailing hem
 *
 * Place and rhythm do the separating, so two slots may share an element
 * and still read as two distinct things.
 *
 * ------------------------------------------------------------------
 * THE TIER GRAMMAR: tier is LOUDNESS, element is HUE, slot is PLACE.
 *
 *   1 - a mark. One glint on a beat, no particles, mostly seen in
 *       motion or in the dark. It says "this is enchanted" and stops.
 *   2 - a steady channel. The slot's own light plus sparse motes, and
 *       a small contribution to the scene light after dark.
 *   3 - the living corona at full voice, plus the slot's signature.
 *
 * Tiers 4 and 5 arrive with the roster (Phase 3) and earn a
 * silhouette-touching element on top; the dials below already read any
 * tier, so a tier-4 working lights correctly the day it is authored.
 */
/** A school's palette. `deep`/`glow` are 'r, g, b' for queueGlow. */
export interface ElementTint {
    core: string;
    mid: string;
    deep: string;
    fleck: string;
    glow: string;
}
export declare const ELEMENT_TINTS: Record<string, ElementTint>;
export declare function elementTint(element: string | undefined): ElementTint;
/** One slot's working, resolved for drawing. */
export interface SlotLight {
    element: string;
    tier: number;
    tint: ElementTint;
}
/** Every worn working, by slot, plus the loudest one on the body. */
export interface WornLight {
    slots: Partial<Record<EquipSlot, SlotLight>>;
    /** The strongest worn tier — what the body-wide corona answers to. */
    best: SlotLight | null;
    /** True if anything at all is worn enchanted (the cheap early out). */
    any: boolean;
}
/**
 * Resolve an appearance's enchant map into drawable light. Cheap and
 * allocation-free in the common case (nothing enchanted, or nothing
 * changed), because this runs per entity per frame.
 */
export declare function resolveWornLight(ench: Partial<Record<string, string>> | undefined): WornLight;
/**
 * THE DARKNESS LAW: a working that is bright enough to see is bright
 * enough to see BY. Tier 2 and up contribute real scene light, which
 * turns a cosmetic into play: an enchanted party lights its own way
 * through the deep, and a head working is a lantern nobody has to hold.
 *
 * Tier 1 contributes none on purpose. A mark is a mark.
 */
export declare function tierGlowAlpha(tier: number): number;
export declare function tierGlowRadius(tier: number): number;
/**
 * Motes shed per second at this tier. Tier 1 sheds none: its whole
 * vocabulary is the timed glint, so a tier-1 kit stays clean.
 */
export declare function tierMoteRate(tier: number): number;
/**
 * THE GLINT CLOCK. A tier-1 working has no particles and no glow, so
 * all it owns is a travelling highlight. Each slot is given its own
 * phase offset from this so a fully tier-1 kit twinkles in sequence
 * around the body instead of strobing in unison.
 */
export declare function glintAt(nowMs: number, phase: number): number;
/** Stable per-slot phase so the glints go round the body, not together. */
export declare const SLOT_GLINT_PHASE: Record<string, number>;
/**
 * A working reduced to what a body painter needs. Armor styles carry
 * this as one optional field, so a piece is enchanted by overlaying a
 * mark on its resolved style — the enchantedStyle pattern the weapon
 * painters have used since enchants first shipped, generalized to the
 * other seven slots.
 */
export interface ArxMark {
    /** The channel's body color. */
    mid: string;
    /** Its hot center, for the glint and the brightest ticks. */
    core: string;
    /** Loudness. Also decides whether the slot casts real light. */
    tier: number;
    element: string;
}
export declare function arxMark(slot: SlotLight | undefined): ArxMark | undefined;
/**
 * THE ONE BREATH. Every body channel pulses through this, so the whole
 * kit shares one law of loudness while each slot keeps its own phase
 * and speed. That combination is what lets eight lit slots read as
 * eight things instead of one flicker:
 *
 *   tier 1 - dark except for a brief travelling glint (see glintAt)
 *   tier 2 - a steady low channel with a gentle breath over it
 *   tier 3 - bright, and breathing hard
 */
export declare function markPulse(mark: ArxMark, nowMs: number, phase: number, rate?: number): number;
/**
 * THE READABILITY CAP. Ten enchanted players in a market square must
 * not become soup, and the frame must not fall over drawing them.
 *
 * Distance is the honest dial: your OWN light is always full, because
 * it is the thing you paid for and the thing you are looking at. Other
 * people's fades with range, and past the far mark only the loudest
 * body-wide read survives at all. Nobody's screen is ever quieter than
 * their own character.
 */
export declare const WORN_LIGHT_NEAR = 9;
export declare const WORN_LIGHT_FAR = 17;
/** How loudly a body at this distance may speak, 0..1. */
export declare function wornLightFalloff(dist: number, isOwn: boolean): number;
/**
 * Past this many lit bodies in one frame, remote workings stop shedding
 * particles and keep only their glow. A backstop for the town square,
 * not a dial anyone should have to think about — the distance falloff
 * does the real work and this only catches the pathological crowd.
 */
export declare const WORN_LIGHT_BODY_BUDGET = 8;
/**
 * A proc fx carries its id as `<action>:<procId>` — the same structured
 * id convention projectile defIds already use for `arx:<element>`. The
 * client shapes the moment off the ACTION, so any working Phase 3
 * authors reads correctly on the day it ships, without waiting for a
 * bespoke signature to be drawn for it.
 *
 * A bespoke signature registered under either the full id or the proc
 * id still wins; this is the floor, not the ceiling.
 */
export type ProcShape = 'status' | 'nova' | 'bolt' | 'chain' | 'ward' | 'heal' | 'surge' | 'cleanse' | 'yield' | 'reveal' | 'mark';
export declare function procShape(id: string | undefined): ProcShape | undefined;
/**
 * How loudly each action speaks, and which way its matter goes. This is
 * the grammar of scale for woken workings: a nova is an EVENT and gets
 * to shout, a yield is a small good thing happening in your hands and
 * must not. Nothing here reaches an ability's volume, ever — a proc
 * punctuates a fight, it does not interrupt one.
 *
 * FX v5 audit verdict (wave 3k, the epic's close): the proc voice is
 * AUDITED BESPOKE — it never joins the matter library. Three design
 * properties forbid it: (1) the shards are deterministic painted
 * choreography, and the inward gather onto a moving wearer cannot be
 * run by ballistic grains; (2) the grammar of scale — library matter
 * leaves real stains and settling grains, which would carpet a fight
 * in leftovers from punctuation marks; (3) procs tint by the worn
 * school's style, and a material palette would shout over it. The
 * floor stays the floor; a bespoke signature above it still wins.
 */
export interface ProcVoice {
    /** Ring scale against the fx radius. */
    ring: number;
    /** Shards kicked up in the volume pass. */
    shards: number;
    /** 1 = matter leaves the ground, -1 = it falls INTO the wearer. */
    flow: number;
    /** Overall loudness 0..1. */
    weight: number;
}
export declare const PROC_VOICE: Record<ProcShape, ProcVoice>;
export declare function procVoice(id: string | undefined): ProcVoice;
/**
 * THE TRAIL is the boots' channel, and the one channel allowed to write
 * on the ground. It is two things: a PRINT stamped at each footfall,
 * and MOTES shed while moving.
 *
 * SPEED-GATED, and this is the law that makes it work. Walking leaves
 * nothing. Only a runner paints. A trail that accumulated under a
 * standing player would smear every doorway and market stall in the
 * game into a puddle of light within a minute, and the effect would go
 * from a reward for motion to a thing players ask to turn off.
 */
export declare const TRAIL_MIN_SPEED = 2.6;
/** Full voice at a dead run. */
export declare const TRAIL_FULL_SPEED = 4.6;
/** Tiles between footfalls. One stride, so prints land where feet do. */
export declare const TRAIL_STRIDE = 0.62;
/** How far a print sits off the centerline, left and right alternating. */
export declare const TRAIL_STANCE = 0.11;
/** A print's whole life, ms. Short: the ground must clear behind you. */
export declare const TRAIL_PRINT_MS = 1200;
/**
 * Tiers 4 and 5 LINGER: the prints that stay lit after the runner is
 * gone are the silhouette-touching read the high bands earn on this
 * channel. Still finite, still clearing — the ground always wins.
 */
export declare function trailPrintMs(tier: number): number;
/** Hard ceiling on live prints across every body on screen. */
export declare const TRAIL_PRINT_CAP = 96;
export declare function trailStrength(speed: number): number;
/**
 * How each school writes on the ground. Deliberately different SHAPES,
 * not one shape recolored: a frost print whitens the turf, a void print
 * darkens it, a verdant print grows and dies inside its own fade. If
 * these were all the same stamp in nine colors the whole system would
 * read as a palette swap, which is the failure this phase exists to
 * avoid.
 */
export type PrintKind = 'scorch' | 'rime' | 'spark' | 'bloom' | 'shadow' | 'light' | 'stain' | 'star' | 'sigil';
export declare const ELEMENT_PRINT: Record<string, PrintKind>;
export declare function printKind(element: string): PrintKind;
//# sourceMappingURL=wornLight.d.ts.map