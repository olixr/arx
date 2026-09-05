/**
 * THE LIBRARY IS THE VOICE (particles v6, phase 5) — ability plans.
 *
 * Every combat cast that arrives on the wire is answered by the
 * composed effect library: an `AbilityPlan` is a list of CUES — which
 * library effect, when (seconds after the cast), how big, aimed or not,
 * at the near or the far anchor, and for standing zones how often it
 * re-speaks. Curated plans live in `plans/<roster>.ts`, one per ability,
 * written by that roster's master pass. An ability without a curated
 * plan still speaks the library: `derivePlan` reads the style's family
 * (debris kind) and the wire kind and picks the material's matching
 * effect, so no cast anywhere falls back to the old matter.
 *
 * When a plan speaks, the cast's OLD particle voice is muted: the
 * signature's bursts and deployments, the kind grammar's debris, the
 * stamped decal, the aftermath beats. The painted centerpiece (rings,
 * motifs, strokes) stays — that is drawing, not matter. Pure instruments
 * (telegraphs, the breath's charge/note) keep their own voice.
 */

import type { FxStyle } from '../abilityFx.js';
import type { EffectDef } from './effects.js';
import { EFFECTS } from './library/index.js';
import { Particles, type BurstOpts, type Emitter, type Field, type FieldOpts, type EmitterOpts } from '../particles.js';
import { PLANS } from './plans/index.js';

export interface EffectCue {
  /** Library effect id. */
  id: string;
  /** Seconds after the cast arrives (default 0). */
  at?: number;
  /** Size-and-count multiplier (default: derived from the wire radius). */
  scale?: number;
  /** Multiply the wire radius for params.radius (default 1). */
  radiusK?: number;
  /** Cast at the far anchor (dash/bolt/beam/warp) instead of the near one. */
  atFar?: boolean;
  /** Altitude offset. */
  z?: number;
  /** Standing zones: re-cast every N seconds while the wire fx lives. */
  every?: number;
}

export interface AbilityPlan {
  cues: EffectCue[];
  /**
   * Keep the signature's own particle matter beside the library (rare:
   * a hand-painted lie the library refuses to tell). Default false.
   */
  keepMatter?: boolean;
}

/** The materials a style's debris family speaks. */
type Family = 'fire' | 'frost' | 'storm' | 'dust' | 'arcane' | 'shadow' | 'blood';

function hueOf(hex: string): number {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  if (Number.isNaN(n)) return 0;
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d < 1e-6) return 0;
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

type Family2 = Family | 'venom' | 'water';

function familyOf(st: FxStyle): Family2 {
  // Green matter that STAINS, or acid yellow-green leaf matter, is venom —
  // not foliage; blue-white ice that stains is the tide. The debris kind
  // carries the rest.
  const hue = hueOf(st.mid);
  if ((st.decal === 'stain' && hue >= 70 && hue <= 160) || (st.debris === 'leaf' && hue < 95)) return 'venom';
  if (st.debris === 'ice' && st.decal !== 'rime' && hue >= 185 && hue <= 215) return 'water';
  switch (st.debris) {
    case 'ember': return 'fire';
    case 'ice': return 'frost';
    case 'spark': return 'storm';
    case 'rock':
    case 'bone':
    case 'leaf': return 'dust';
    case 'star': return 'arcane';
    case 'shadow': return 'shadow';
    case 'blood': return 'blood';
    default: return 'arcane';
  }
}

/** Wire kinds that keep their own instrument voice — no plan, no mute. */
const PURE_INSTRUMENT = new Set(['telegraph', 'charge', 'note']);

/** The derived vocabulary: family × kind → effect ids. */
const DERIVED: Record<Family2, Record<string, EffectCue[]>> = {
  fire: {
    nova: [{ id: 'fire.burst' }],
    blast: [{ id: 'fire.burst' }, { id: 'fire.floor', at: 0.3, scale: 0.7 }],
    arc: [{ id: 'fire.fan' }],
    dash: [{ id: 'fire.trail' }],
    bolt: [{ id: 'fire.trail', scale: 0.7 }],
    beam: [{ id: 'fire.trail' }],
    warp: [{ id: 'smoke.wisp', scale: 0.7 }, { id: 'fire.burst', atFar: true, scale: 0.7 }],
    summon: [{ id: 'fire.plume', scale: 0.7 }],
    field: [{ id: 'fire.floor', every: 3 }],
    vanish: [{ id: 'smoke.wisp', scale: 0.8 }],
    reaction: [{ id: 'fire.burst', scale: 0.45 }],
  },
  frost: {
    nova: [{ id: 'frost.nova' }],
    blast: [{ id: 'frost.nova' }, { id: 'frost.shards', at: 0.25, scale: 0.7 }],
    arc: [{ id: 'frost.breath' }],
    dash: [{ id: 'frost.breath' }],
    bolt: [{ id: 'frost.shards', atFar: true, scale: 0.6 }],
    beam: [{ id: 'frost.breath' }],
    warp: [{ id: 'frost.fog', scale: 0.6 }, { id: 'frost.nova', atFar: true, scale: 0.6 }],
    summon: [{ id: 'frost.pillar', scale: 0.8 }],
    field: [{ id: 'frost.fog', every: 3 }],
    vanish: [{ id: 'frost.fog', scale: 0.6 }],
    reaction: [{ id: 'frost.shards', scale: 0.45 }],
  },
  storm: {
    nova: [{ id: 'storm.nova' }],
    blast: [{ id: 'storm.strike' }],
    arc: [{ id: 'storm.nova', scale: 0.6 }],
    dash: [{ id: 'storm.arc' }],
    bolt: [{ id: 'storm.arc' }],
    beam: [{ id: 'storm.arc' }],
    warp: [{ id: 'storm.charge', scale: 0.5 }, { id: 'storm.strike', atFar: true, scale: 0.7 }],
    summon: [{ id: 'storm.charge' }],
    field: [{ id: 'storm.cloud', every: 3 }],
    vanish: [{ id: 'storm.charge', scale: 0.5 }],
    reaction: [{ id: 'storm.charge', scale: 0.4 }],
  },
  dust: {
    nova: [{ id: 'dust.slam' }],
    blast: [{ id: 'dust.slam' }],
    arc: [{ id: 'dust.kick', scale: 2.2 }],
    dash: [{ id: 'dust.gouge' }],
    bolt: [{ id: 'dust.gouge', scale: 0.7 }],
    beam: [{ id: 'dust.gouge' }],
    warp: [{ id: 'dust.kick', scale: 2 }, { id: 'dust.slam', atFar: true, scale: 0.6 }],
    summon: [{ id: 'dust.billow', scale: 0.7 }],
    field: [{ id: 'dust.billow', every: 3 }],
    vanish: [{ id: 'dust.billow', scale: 0.6 }],
    reaction: [{ id: 'dust.kick', scale: 1.5 }],
  },
  arcane: {
    nova: [{ id: 'arcane.bloom' }],
    blast: [{ id: 'arcane.shatter' }],
    arc: [{ id: 'arcane.shatter', scale: 0.7 }],
    dash: [{ id: 'arcane.beam' }],
    bolt: [{ id: 'arcane.beam' }],
    beam: [{ id: 'arcane.beam' }],
    warp: [{ id: 'arcane.shatter', scale: 0.6 }, { id: 'arcane.bloom', atFar: true, scale: 0.7 }],
    summon: [{ id: 'arcane.sigil' }],
    field: [{ id: 'arcane.sigil', every: 3 }],
    vanish: [{ id: 'arcane.orbit', scale: 0.6 }],
    reaction: [{ id: 'arcane.orbit', scale: 0.5 }],
  },
  shadow: {
    nova: [{ id: 'shadow.burst' }],
    blast: [{ id: 'shadow.burst' }],
    arc: [{ id: 'shadow.grasp', scale: 0.8 }],
    dash: [{ id: 'shadow.wisps', scale: 0.7 }],
    bolt: [{ id: 'shadow.grasp', atFar: true, scale: 0.6 }],
    beam: [{ id: 'shadow.grasp' }],
    warp: [{ id: 'shadow.burst', scale: 0.6 }, { id: 'shadow.burst', atFar: true, scale: 0.6 }],
    summon: [{ id: 'shadow.veil' }],
    field: [{ id: 'shadow.veil', every: 3 }],
    vanish: [{ id: 'shadow.veil', scale: 0.6 }],
    reaction: [{ id: 'shadow.grasp', scale: 0.4 }],
  },
  venom: {
    nova: [{ id: 'venom.burst' }],
    blast: [{ id: 'venom.burst' }, { id: 'venom.pool', at: 0.4, scale: 0.7 }],
    arc: [{ id: 'venom.spit' }],
    dash: [{ id: 'venom.spit' }],
    bolt: [{ id: 'venom.burst', atFar: true, scale: 0.7 }],
    beam: [{ id: 'venom.spit' }],
    warp: [{ id: 'venom.cloud', scale: 0.5 }, { id: 'venom.burst', atFar: true, scale: 0.6 }],
    summon: [{ id: 'venom.pool' }],
    field: [{ id: 'venom.cloud', every: 3 }],
    vanish: [{ id: 'venom.cloud', scale: 0.6 }],
    reaction: [{ id: 'venom.drip', scale: 0.6 }],
  },
  water: {
    nova: [{ id: 'water.splash' }],
    blast: [{ id: 'water.splash' }],
    arc: [{ id: 'water.jet' }],
    dash: [{ id: 'water.jet' }],
    bolt: [{ id: 'water.splash', atFar: true, scale: 0.7 }],
    beam: [{ id: 'water.jet' }],
    warp: [{ id: 'water.mist', scale: 0.6 }, { id: 'water.splash', atFar: true, scale: 0.7 }],
    summon: [{ id: 'water.mist' }],
    field: [{ id: 'water.rain', every: 3 }],
    vanish: [{ id: 'water.mist', scale: 0.6 }],
    reaction: [{ id: 'water.splash', scale: 0.45 }],
  },
  blood: {
    nova: [{ id: 'blood.hit' }],
    blast: [{ id: 'blood.hit' }, { id: 'blood.pool', at: 0.3, scale: 0.6 }],
    arc: [{ id: 'blood.hit' }],
    dash: [{ id: 'blood.spray', scale: 0.7 }],
    bolt: [{ id: 'blood.hit', atFar: true, scale: 0.7 }],
    beam: [{ id: 'blood.spray' }],
    warp: [{ id: 'blood.drink', scale: 0.6 }, { id: 'blood.hit', atFar: true, scale: 0.6 }],
    summon: [{ id: 'blood.pool', scale: 0.7 }],
    field: [{ id: 'blood.pool', every: 3 }],
    vanish: [{ id: 'blood.drink', scale: 0.6 }],
    reaction: [{ id: 'blood.hit', scale: 0.45 }],
  },
};

const derivedCache = new Map<string, AbilityPlan | null>();

/** The family × kind fallback (memoized per id+kind+family). */
export function derivePlan(kind: string, st: FxStyle): AbilityPlan | null {
  if (PURE_INSTRUMENT.has(kind)) return null;
  const fam = familyOf(st);
  const key = `${fam}:${kind}`;
  const have = derivedCache.get(key);
  if (have !== undefined) return have;
  const cues = DERIVED[fam][kind] ?? DERIVED[fam].nova!;
  const plan: AbilityPlan = { cues };
  derivedCache.set(key, plan);
  return plan;
}

/**
 * The plan for a cast: curated by ability id, else derived. Pure
 * instruments answer null — they keep their own voice and are not muted.
 */
export function planFor(id: string | undefined, kind: string, st: FxStyle): AbilityPlan | null {
  if (PURE_INSTRUMENT.has(kind)) return null;
  if (id) {
    const curated = PLANS[id] ?? (id.includes(':') ? PLANS[id.slice(id.indexOf(':') + 1)] : undefined);
    if (curated) return curated;
  }
  return derivePlan(kind, st);
}

/** Every curated plan's effect must exist (the contract test). */
export function planEffects(plan: AbilityPlan): EffectDef[] {
  return plan.cues.map((c) => EFFECTS[c.id]).filter((d): d is EffectDef => d !== undefined);
}

/** The default cast scale from the wire radius: bigger reach, bigger voice. */
export function scaleForRadius(radius: number): number {
  return Math.max(0.8, Math.min(2.4, 1 + (radius - 1) * 0.35));
}

/**
 * THE MUTED VOICE: a Particles whose spawn doors are shut. Signatures
 * and the kind grammar keep calling burst/emit exactly as before; while
 * a plan speaks, nothing they say reaches the pool.
 */
export class MutedParticles extends Particles {
  private readonly deadEmitter: Emitter = {
    alive: false, kind: 0, x: 0, y: 0, z: 0, x2: 0, y2: 0, radius: 0, dir: 0, spread: 0,
    rate: 0, age: 0, dur: 0, attack: 0, release: 0, orbitSpeed: 0, orbitA: 0,
    tangent: false, sweep: 0, outward: 0, hasDir: false, hasOutward: false, pops: null,
    acc0: 0, acc1: 0, acc2: 0, acc3: 0, stop() {},
  };
  private readonly deadField: Field = {
    alive: false, kind: 0, x: 0, y: 0, radius: 0, strength: 0, dir: 0, height: 0,
    dur: 0, age: 0, attack: 0, release: 0, stop() {},
  };
  override burst(_x: number, _y: number, _count: number, _colors: string[], _opts?: BurstOpts): void {}
  override emit(_opts: EmitterOpts): Emitter {
    return this.deadEmitter;
  }
  override field(_opts: FieldOpts): Field {
    return this.deadField;
  }
  override recipe(): void {}
}
