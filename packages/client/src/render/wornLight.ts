import type { EquipSlot } from '@arx/shared';
import { enchantDef } from '@arx/content';

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

export const ELEMENT_TINTS: Record<string, ElementTint> = {
  arcane: { core: '#efe3ff', mid: '#b49af0', deep: '122, 90, 196', fleck: '#fff8c8', glow: '180, 154, 240' },
  ember: { core: '#ffe8b0', mid: '#ff8a4a', deep: '196, 74, 30', fleck: '#ffd98a', glow: '255, 138, 74' },
  frost: { core: '#f0faff', mid: '#8ac4e8', deep: '74, 130, 180', fleck: '#d8f0fc', glow: '138, 196, 232' },
  storm: { core: '#fffdf0', mid: '#ffe86a', deep: '170, 150, 60', fleck: '#ffffff', glow: '255, 232, 106' },
  verdant: { core: '#eaffd8', mid: '#7ac46a', deep: '58, 122, 58', fleck: '#d8ffb0', glow: '122, 196, 106' },
  // Void runs inverted: a dark heart in a pale shell — the one school
  // whose flecks are darker than its body.
  void: { core: '#c8b0e8', mid: '#7a5adf', deep: '46, 32, 84', fleck: '#38284e', glow: '122, 90, 223' },
  radiant: { core: '#ffffff', mid: '#ffd98a', deep: '196, 150, 70', fleck: '#fff2c8', glow: '255, 217, 138' },
  blood: { core: '#ffb0a8', mid: '#d95763', deep: '134, 38, 48', fleck: '#ff8a8a', glow: '217, 87, 99' },
  astral: { core: '#ffffff', mid: '#9ae8de', deep: '90, 140, 180', fleck: '#e8b0ff', glow: '154, 232, 222' },
};

export function elementTint(element: string | undefined): ElementTint {
  return ELEMENT_TINTS[element ?? 'arcane'] ?? ELEMENT_TINTS.arcane!;
}

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

const EMPTY: WornLight = { slots: {}, best: null, any: false };

/**
 * Resolved light, cached against the appearance's own enchant object.
 *
 * This runs per entity per frame, twice (the renderer wants the world
 * channels, the rig wants the body channels), and it allocates a small
 * object per lit slot. An appearance's ench map is replaced wholesale
 * when a player's gear changes and is otherwise stable for minutes, so
 * keying on object identity turns the steady state into one WeakMap
 * hit — the same trick the renderer already plays on appearance
 * signatures. Weak, so nothing is pinned alive by the cache.
 */
const LIGHT_CACHE = new WeakMap<object, WornLight>();

/**
 * Resolve an appearance's enchant map into drawable light. Cheap and
 * allocation-free in the common case (nothing enchanted, or nothing
 * changed), because this runs per entity per frame.
 */
export function resolveWornLight(
  ench: Partial<Record<string, string>> | undefined,
): WornLight {
  if (!ench) return EMPTY;
  const hit = LIGHT_CACHE.get(ench);
  if (hit) return hit;
  const built = buildWornLight(ench);
  LIGHT_CACHE.set(ench, built);
  return built;
}

function buildWornLight(ench: Partial<Record<string, string>>): WornLight {
  let best: SlotLight | null = null;
  let slots: Partial<Record<EquipSlot, SlotLight>> | null = null;
  for (const slot of Object.keys(ench) as EquipSlot[]) {
    const def = enchantDef(ench[slot]);
    if (!def) continue;
    const light: SlotLight = {
      element: def.element,
      tier: def.tier,
      tint: elementTint(def.element),
    };
    (slots ??= {})[slot] = light;
    if (!best || def.tier > best.tier) best = light;
  }
  if (!slots || !best) return EMPTY;
  return { slots, best, any: true };
}

// ------------------------------------------------------- the tier dials

/**
 * THE DARKNESS LAW: a working that is bright enough to see is bright
 * enough to see BY. Tier 2 and up contribute real scene light, which
 * turns a cosmetic into play: an enchanted party lights its own way
 * through the deep, and a head working is a lantern nobody has to hold.
 *
 * Tier 1 contributes none on purpose. A mark is a mark.
 */
export function tierGlowAlpha(tier: number): number {
  if (tier <= 1) return 0;
  if (tier === 2) return 0.1;
  if (tier === 3) return 0.2;
  // Tiers 4 and 5 climb PAST the tier-3 voice — restrained steps, so a
  // masterwork still reads as a masterwork standing next to one.
  return tier === 4 ? 0.24 : 0.3;
}

export function tierGlowRadius(tier: number): number {
  if (tier <= 1) return 0;
  if (tier === 2) return 0.7;
  if (tier === 3) return 1.0;
  return tier === 4 ? 1.1 : 1.3;
}

/**
 * Motes shed per second at this tier. Tier 1 sheds none: its whole
 * vocabulary is the timed glint, so a tier-1 kit stays clean.
 */
export function tierMoteRate(tier: number): number {
  if (tier <= 1) return 0;
  if (tier === 2) return 2.2;
  if (tier === 3) return 5;
  return tier === 4 ? 6.5 : 8;
}

/**
 * THE GLINT CLOCK. A tier-1 working has no particles and no glow, so
 * all it owns is a travelling highlight. Each slot is given its own
 * phase offset from this so a fully tier-1 kit twinkles in sequence
 * around the body instead of strobing in unison.
 */
export function glintAt(nowMs: number, phase: number): number {
  const t = (nowMs / 1000) * 0.9 + phase;
  const f = t - Math.floor(t);
  // A short bright pass, then a long dark rest — a glint, not a pulse.
  return f > 0.86 ? Math.sin((f - 0.86) / 0.14 * Math.PI) : 0;
}

/** Stable per-slot phase so the glints go round the body, not together. */
export const SLOT_GLINT_PHASE: Record<string, number> = {
  head: 0,
  body: 0.13,
  legs: 0.26,
  gloves: 0.39,
  boots: 0.52,
  cape: 0.65,
  offhand: 0.78,
  weapon: 0.91,
};

// ------------------------------------------------------- the body channels

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

export function arxMark(slot: SlotLight | undefined): ArxMark | undefined {
  if (!slot) return undefined;
  return { mid: slot.tint.mid, core: slot.tint.core, tier: slot.tier, element: slot.element };
}

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
export function markPulse(mark: ArxMark, nowMs: number, phase: number, rate = 1): number {
  if (mark.tier <= 1) return 0.25 * glintAt(nowMs, phase);
  if (mark.tier >= 4) {
    // Tiers 4 and 5 breathe DEEPER and a shade FASTER: the same lungs,
    // working harder. The rhythm answers the high bands so the slot
    // channels read louder without changing their place or shape.
    const base = mark.tier === 4 ? 0.6 : 0.64;
    const swing = mark.tier === 4 ? 0.33 : 0.36;
    return base + swing * Math.sin(nowMs * 0.0035 * rate + phase * Math.PI * 2);
  }
  const base = mark.tier === 2 ? 0.34 : 0.55;
  const swing = mark.tier === 2 ? 0.16 : 0.3;
  return base + swing * Math.sin(nowMs * 0.0026 * rate + phase * Math.PI * 2);
}

// -------------------------------------------------------- the readability caps

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
export const WORN_LIGHT_NEAR = 9;
export const WORN_LIGHT_FAR = 17;

/** How loudly a body at this distance may speak, 0..1. */
export function wornLightFalloff(dist: number, isOwn: boolean): number {
  if (isOwn) return 1;
  if (dist <= WORN_LIGHT_NEAR) return 1;
  if (dist >= WORN_LIGHT_FAR) return 0;
  return 1 - (dist - WORN_LIGHT_NEAR) / (WORN_LIGHT_FAR - WORN_LIGHT_NEAR);
}

/**
 * Past this many lit bodies in one frame, remote workings stop shedding
 * particles and keep only their glow. A backstop for the town square,
 * not a dial anyone should have to think about — the distance falloff
 * does the real work and this only catches the pathological crowd.
 */
export const WORN_LIGHT_BODY_BUDGET = 8;

// ------------------------------------------------------------ woken workings

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
export type ProcShape =
  | 'status'
  | 'nova'
  | 'bolt'
  | 'chain'
  | 'ward'
  | 'heal'
  | 'surge'
  | 'cleanse'
  | 'yield'
  | 'reveal'
  | 'mark';

export function procShape(id: string | undefined): ProcShape | undefined {
  const head = id?.split(':')[0];
  return head && (PROC_SHAPES as readonly string[]).includes(head)
    ? (head as ProcShape)
    : undefined;
}

const PROC_SHAPES: readonly ProcShape[] = [
  'status', 'nova', 'bolt', 'chain', 'ward', 'heal',
  'surge', 'cleanse', 'yield', 'reveal', 'mark',
];

/**
 * How loudly each action speaks, and which way its matter goes. This is
 * the grammar of scale for woken workings: a nova is an EVENT and gets
 * to shout, a yield is a small good thing happening in your hands and
 * must not. Nothing here reaches an ability's volume, ever — a proc
 * punctuates a fight, it does not interrupt one.
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

export const PROC_VOICE: Record<ProcShape, ProcVoice> = {
  // Outward and violent.
  nova: { ring: 1, shards: 6, flow: 1, weight: 1 },
  chain: { ring: 0.55, shards: 3, flow: 1, weight: 0.8 },
  bolt: { ring: 0.5, shards: 2, flow: 1, weight: 0.7 },
  status: { ring: 0.6, shards: 2, flow: 1, weight: 0.6 },
  // Inward: these things happen TO the wearer, so their matter falls in
  // rather than blowing out. That single sign flip is what lets a
  // player tell a ward from a nova at a glance without reading a word.
  ward: { ring: 0.85, shards: 4, flow: -1, weight: 0.8 },
  heal: { ring: 0.7, shards: 4, flow: -1, weight: 0.65 },
  surge: { ring: 0.75, shards: 5, flow: -1, weight: 0.75 },
  cleanse: { ring: 0.9, shards: 3, flow: 1, weight: 0.6 },
  // Quiet: a good thing, noticed, not announced.
  yield: { ring: 0.45, shards: 2, flow: -1, weight: 0.4 },
  reveal: { ring: 1, shards: 0, flow: 1, weight: 0.45 },
  mark: { ring: 0.6, shards: 0, flow: 1, weight: 0.3 },
};

export function procVoice(id: string | undefined): ProcVoice {
  const shape = procShape(id);
  return shape ? PROC_VOICE[shape] : PROC_VOICE.status;
}

// ---------------------------------------------------------------- the trail

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
export const TRAIL_MIN_SPEED = 2.6;
/** Full voice at a dead run. */
export const TRAIL_FULL_SPEED = 4.6;
/** Tiles between footfalls. One stride, so prints land where feet do. */
export const TRAIL_STRIDE = 0.62;
/** How far a print sits off the centerline, left and right alternating. */
export const TRAIL_STANCE = 0.11;
/** A print's whole life, ms. Short: the ground must clear behind you. */
export const TRAIL_PRINT_MS = 1200;

/**
 * Tiers 4 and 5 LINGER: the prints that stay lit after the runner is
 * gone are the silhouette-touching read the high bands earn on this
 * channel. Still finite, still clearing — the ground always wins.
 */
export function trailPrintMs(tier: number): number {
  if (tier >= 5) return 2600;
  if (tier === 4) return 1800;
  return TRAIL_PRINT_MS;
}
/** Hard ceiling on live prints across every body on screen. */
export const TRAIL_PRINT_CAP = 96;

export function trailStrength(speed: number): number {
  if (speed < TRAIL_MIN_SPEED) return 0;
  const t = (speed - TRAIL_MIN_SPEED) / (TRAIL_FULL_SPEED - TRAIL_MIN_SPEED);
  return Math.max(0, Math.min(1, t));
}

/**
 * How each school writes on the ground. Deliberately different SHAPES,
 * not one shape recolored: a frost print whitens the turf, a void print
 * darkens it, a verdant print grows and dies inside its own fade. If
 * these were all the same stamp in nine colors the whole system would
 * read as a palette swap, which is the failure this phase exists to
 * avoid.
 */
export type PrintKind =
  | 'scorch'
  | 'rime'
  | 'spark'
  | 'bloom'
  | 'shadow'
  | 'light'
  | 'stain'
  | 'star'
  | 'sigil';

export const ELEMENT_PRINT: Record<string, PrintKind> = {
  ember: 'scorch',
  frost: 'rime',
  storm: 'spark',
  verdant: 'bloom',
  void: 'shadow',
  radiant: 'light',
  blood: 'stain',
  astral: 'star',
  arcane: 'sigil',
};

export function printKind(element: string): PrintKind {
  return ELEMENT_PRINT[element] ?? 'sigil';
}
