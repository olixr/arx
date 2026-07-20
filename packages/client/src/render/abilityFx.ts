/**
 * Ability visual identities — the layered combat-FX vocabulary.
 *
 * Every ability id maps to an FxStyle: a four-band palette plus a set
 * of layer choices (ring silhouette, debris family, lingering ground
 * decal, camera punch). The renderer composes the actual moment from
 * these facts in MULTIPLE PASSES — flash, body, rim, debris, decal,
 * glow — so every art reads as a staged presentation, not a blip.
 *
 * Everything stays on brand: hard-edged rects, jagged polygons, flat
 * fills. No blur, no gradients — the world is chunky and so is its
 * magic. Unknown ids fall back to a palette derived from the ability's
 * wire color, so a missing entry degrades gracefully, never invisibly.
 */

import { shade } from './rig.js';

// ------------------------------------------------------------- style

/** Ring silhouette for nova/blast expansion. */
export type RingStyle = 'teeth' | 'petals' | 'shards' | 'runes' | 'frost' | 'halo';

/** Chunk family thrown by detonations and simmering in fields. */
export type DebrisKind =
  | 'ember'
  | 'rock'
  | 'ice'
  | 'leaf'
  | 'bone'
  | 'spark'
  | 'star'
  | 'shadow'
  | 'blood';

/** Lingering ground mark left where the hit landed. */
export type DecalKind = 'scorch' | 'rime' | 'cracks' | 'roots' | 'stain' | 'runes' | 'glow';

export interface FxStyle {
  /** Hottest center — the white-out band. */
  core: string;
  /** The identity color — most of the painted area. */
  mid: string;
  /** Dark outer band — silhouettes and shadows of the effect. */
  deep: string;
  /** Debris/spark accent. */
  spark: string;
  /** queueGlow tint as 'r, g, b'. */
  glow: string;
  ring: RingStyle;
  debris: DebrisKind;
  decal?: DecalKind;
  /** Camera drama weight 0..1 — scales shake on detonation. */
  punch: number;
}

function fx(
  core: string,
  mid: string,
  deep: string,
  spark: string,
  glow: string,
  ring: RingStyle,
  debris: DebrisKind,
  decal?: DecalKind,
  punch = 0.5,
): FxStyle {
  return { core, mid, deep, spark, glow, ring, debris, decal, punch };
}

// The elemental family voices. Individual abilities start from one and
// swap layers so siblings share a language yet keep their own face.
const EMBER = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#fff3d0', '#ff9a44', '#c43a18', '#ffd24a', '255, 150, 70', 'teeth', 'ember', 'scorch'),
  ...over,
});
const FROST = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#f0fbff', '#8ac4e8', '#3a6c94', '#d8f2ff', '150, 208, 240', 'frost', 'ice', 'rime'),
  ...over,
});
const STORM = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#fffce0', '#e8e06a', '#8a7a2a', '#ffffff', '240, 228, 120', 'teeth', 'spark', undefined, 0.6),
  ...over,
});
const VERDANT = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#eaffd8', '#7ac46a', '#3a6a34', '#c8e89a', '140, 208, 120', 'petals', 'leaf', 'roots'),
  ...over,
});
const BLOOD = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#ffd8d8', '#c4372a', '#6a1518', '#ff6a5a', '220, 80, 60', 'shards', 'blood', 'stain'),
  ...over,
});
const VOID = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#e8e0ff', '#7a68a8', '#2a2244', '#b49af0', '150, 120, 220', 'runes', 'shadow', 'glow'),
  ...over,
});
const RADIANT = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#fffbe8', '#ffd98a', '#b8862a', '#ffffff', '255, 220, 140', 'halo', 'star', 'glow', 0.6),
  ...over,
});
const BONE = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#fffcf0', '#e2dcc8', '#8a8474', '#ffffff', '220, 214, 190', 'shards', 'bone', 'cracks'),
  ...over,
});
const STEEL = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#ffffff', '#b8bec8', '#5a6068', '#e8eef8', '200, 208, 220', 'teeth', 'rock', 'cracks'),
  ...over,
});
const GOLD = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#fff8d8', '#e8c04c', '#9a7a1c', '#ffffff', '240, 200, 90', 'halo', 'star', 'glow', 0.6),
  ...over,
});
const TIDE = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#e0f8f8', '#6aa0c8', '#2a5a78', '#b8e8e8', '120, 180, 210', 'petals', 'ice', 'glow'),
  ...over,
});
const ARCANE = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#f4ecff', '#b49af0', '#5a4088', '#ffffff', '190, 160, 250', 'runes', 'star', 'runes'),
  ...over,
});
const SHADOW = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#d8d4e8', '#6a6080', '#1a1626', '#8a7fae', '120, 110, 160', 'shards', 'shadow', 'glow'),
  ...over,
});

/**
 * Every ability's face. Layer swaps keep siblings distinct: two fire
 * arts never share BOTH ring and debris; two frost arts differ in
 * decal or punch. The registry is the single place an art's visual
 * identity lives — content adds an ability, this table gives it a face.
 */
export const FX_STYLES: Record<string, FxStyle> = {
  // ---------------------------------------------- founding weapon arts
  crescent_sweep: STEEL({ mid: '#d9a05a', deep: '#7a5426', spark: '#ffe8b0', ring: 'petals' }),
  lunge: STEEL({ ring: 'shards', decal: undefined, punch: 0.4 }),
  shadowstep: SHADOW({ ring: 'runes', punch: 0.3 }),
  shockwave: STEEL({ ring: 'teeth', debris: 'rock', decal: 'cracks', punch: 0.9 }),
  volley: VERDANT({ mid: '#8a6a45', deep: '#4a3822', ring: 'shards', debris: 'spark', decal: undefined }),
  piercing_bolt: VERDANT({ mid: '#6b8a5a', ring: 'shards', decal: undefined, punch: 0.4 }),
  frost_nova: FROST({ punch: 0.6 }),
  fireburst: EMBER({ punch: 0.8 }),

  // ------------------------------------------------- blade-roster arts
  sundering_chop: STEEL({ mid: '#a4744b', deep: '#5a3c22', debris: 'rock', punch: 0.8 }),
  thorn_lash: VERDANT({ mid: '#5a7a42', ring: 'shards', debris: 'leaf' }),
  quicksilver: STEEL({ core: '#ffffff', mid: '#e6ddc8', ring: 'shards', decal: undefined, punch: 0.3 }),
  riptide: TIDE({ mid: '#3d7a78', ring: 'petals', debris: 'ice' }),
  cinder_arc: EMBER({ mid: '#c4623c', ring: 'shards', punch: 0.5 }),
  winters_edge: FROST({ mid: '#a8c8dc', ring: 'shards', punch: 0.4 }),
  reapers_arc: VERDANT({ mid: '#4a5a48', deep: '#242e22', ring: 'shards', debris: 'leaf', decal: 'stain' }),
  red_harvest: BLOOD({ ring: 'teeth', punch: 0.7 }),
  storm_brand: STORM({ mid: '#5a6a9c', ring: 'runes' }),
  kings_decree: GOLD({ ring: 'teeth', debris: 'star', punch: 0.9 }),
  sunburst: RADIANT({ mid: '#e8b64c', ring: 'teeth', debris: 'ember', decal: 'scorch', punch: 0.8 }),
  starfall_strike: VOID({ mid: '#4a4066', spark: '#ffd98a', debris: 'star', decal: 'scorch', punch: 0.9 }),
  vow_unbroken: RADIANT({ mid: '#e8e8f0', ring: 'halo', debris: 'star', punch: 0.2 }),

  // ------------------------------------------------- rogue-roster arts
  serpents_kiss: VERDANT({ mid: '#8a9a4a', ring: 'shards', debris: 'spark', decal: 'stain' }),
  stinger: GOLD({ mid: '#e8b64c', ring: 'shards', debris: 'spark', decal: undefined, punch: 0.3 }),
  cold_snap: FROST({ ring: 'teeth', punch: 0.5 }),
  bone_needle: BONE({ ring: 'shards', decal: undefined, punch: 0.3 }),
  shadow_fang: SHADOW({ ring: 'shards', debris: 'shadow', punch: 0.5 }),
  crimson_tithe: BLOOD({ ring: 'halo', punch: 0.2 }),
  pale_flame: FROST({ mid: '#c8dce8', ring: 'petals', debris: 'spark', punch: 0.4 }),
  spark_lash: STORM({ mid: '#7a88b8', ring: 'runes', punch: 0.4 }),
  kings_bane: GOLD({ mid: '#c9a23c', ring: 'shards', debris: 'blood', decal: 'stain', punch: 0.7 }),
  last_word: STEEL({ core: '#ffffff', mid: '#f0f0f4', ring: 'halo', debris: 'spark', punch: 0.9 }),

  // ------------------------------------------------ archer-roster arts
  broadhead: STEEL({ mid: '#7a5a36', ring: 'shards', debris: 'blood', decal: 'stain', punch: 0.5 }),
  wingbeat: TIDE({ mid: '#4a8ab8', ring: 'petals', debris: 'spark', decal: undefined, punch: 0.3 }),
  verdant_burst: VERDANT({ punch: 0.7 }),
  windsong: TIDE({ mid: '#8ab4c8', ring: 'halo', debris: 'spark', decal: undefined, punch: 0.5 }),
  thorn_fan: VERDANT({ mid: '#6a8a4a', ring: 'shards', decal: undefined, punch: 0.4 }),
  howling_loose: FROST({ mid: '#9ab8d8', ring: 'shards', debris: 'spark', punch: 0.4 }),
  hoarfrost: FROST({ ring: 'frost', punch: 0.7 }),
  ghost_shaft: SHADOW({ mid: '#a8a4c0', ring: 'runes', debris: 'spark', punch: 0.4 }),
  cinder_rain: EMBER({ mid: '#e8823d', ring: 'shards', punch: 0.7 }),
  kings_arrow: GOLD({ mid: '#c9a23c', ring: 'halo', debris: 'spark', punch: 0.6 }),
  starfall_arrows: VOID({ mid: '#8a90d8', spark: '#fffbe8', debris: 'star', punch: 0.5 }),
  skyrend: STORM({ mid: '#d8e4f0', deep: '#5a6a8a', ring: 'teeth', punch: 0.9 }),

  // ---------------------------------------------- archmage-roster arts
  arcane_ring: ARCANE({ punch: 0.5 }),
  wisp_flare: RADIANT({ mid: '#efe8c0', ring: 'petals', debris: 'spark', decal: undefined, punch: 0.3 }),
  hearth_flare: EMBER({ mid: '#e8944a', ring: 'petals', punch: 0.6 }),
  undertow: TIDE({ ring: 'petals', debris: 'ice', decal: 'glow', punch: 0.7 }),
  stormlash: STORM({ punch: 0.8 }),
  cinderstorm: EMBER({ mid: '#e8683c', ring: 'teeth', debris: 'ember', punch: 0.7 }),
  glaciate: FROST({ ring: 'frost', punch: 0.8 }),
  galvanic_arc: STORM({ mid: '#e8e29a', ring: 'runes', punch: 0.5 }),
  overgrowth: VERDANT({ punch: 0.6 }),
  grave_chill: BONE({ mid: '#8a9484', ring: 'frost', debris: 'ice', decal: 'rime', punch: 0.5 }),
  gloom_burst: VOID({ mid: '#9a6ab8', ring: 'petals', debris: 'shadow', decal: 'stain', punch: 0.6 }),
  venom_lash: VERDANT({ mid: '#a0c050', ring: 'shards', debris: 'spark', decal: 'stain', punch: 0.4 }),
  magma_orb: EMBER({ deep: '#8a2008', ring: 'teeth', debris: 'rock', punch: 0.8 }),
  shatterfrost: FROST({ ring: 'teeth', debris: 'ice', punch: 0.8 }),
  solar_lance: RADIANT({ punch: 0.8 }),
  rune_echo: ARCANE({ mid: '#b0a0d8', decal: 'glow', punch: 0.5 }),
  marrow_pulse: BONE({ ring: 'runes', punch: 0.5 }),
  void_rift: VOID({ punch: 0.9 }),
  eye_of_the_storm: STORM({ mid: '#c8d0e8', ring: 'halo', punch: 0.6 }),
  red_eclipse: BLOOD({ mid: '#c84a5a', ring: 'halo', debris: 'blood', punch: 0.8 }),
  realm_rend: fx('#ffffff', '#9ae8de', '#2a6a64', '#e0fffb', '160, 235, 225', 'teeth', 'star', 'glow', 0.9),

  // ------------------------------------------------------ relic actives
  ember_dash: EMBER({ ring: 'shards', decal: 'scorch', punch: 0.5 }),
  healing_totem: VERDANT({ ring: 'halo', debris: 'leaf', decal: 'glow', punch: 0.2 }),
  snare_trap: VERDANT({ mid: '#a08a4a', ring: 'shards', debris: 'leaf', punch: 0.3 }),
  storm_bell: STORM({ ring: 'halo', punch: 0.8 }),
  hunters_decoy: fx('#fff8e0', '#c4a35a', '#6a5426', '#e8d8a0', '200, 170, 100', 'shards', 'leaf', undefined, 0.2),
  stone_aegis: STEEL({ mid: '#8a9484', ring: 'halo', debris: 'rock', punch: 0.3 }),
  coil_lance: STORM({ mid: '#d8cc5a', ring: 'runes', punch: 0.7 }),
  bramble_burst: VERDANT({ ring: 'shards', punch: 0.6 }),
  arcane_seekers: ARCANE({ ring: 'petals', debris: 'star', decal: 'glow', punch: 0.4 }),
  venom_dart: VERDANT({ mid: '#a0c050', ring: 'runes', debris: 'spark', decal: undefined, punch: 0.3 }),

  // -------------------------------------------------------- techniques
  heavy_slam: STEEL({ mid: '#b8865a', debris: 'rock', punch: 0.9 }),
  whirlwind: STEEL({ mid: '#d9a05a', ring: 'petals', debris: 'spark', decal: undefined, punch: 0.5 }),
  bloodlust: BLOOD({ ring: 'teeth', punch: 0.3 }),
  tumble_shot: VERDANT({ mid: '#8a9a5a', ring: 'shards', debris: 'spark', decal: undefined, punch: 0.3 }),
  rain_of_arrows: VERDANT({ mid: '#6b8a5a', ring: 'shards', debris: 'spark', punch: 0.7 }),
  twin_strike: STEEL({ mid: '#5a7a4a', ring: 'shards', decal: undefined, punch: 0.4 }),
  arc_bolt: STORM({ punch: 0.5 }),
  blink: ARCANE({ ring: 'halo', decal: 'runes', punch: 0.3 }),
  meteor_shard: EMBER({ mid: '#e85a3c', debris: 'rock', punch: 1.0 }),
  earthbreaker: STEEL({ mid: '#a4744b', deep: '#4a3018', debris: 'rock', decal: 'cracks', punch: 1.0 }),
  storm_of_shafts: STORM({ mid: '#8ab4c8', ring: 'shards', debris: 'spark', decal: undefined, punch: 0.6 }),
  maelstrom: TIDE({ ring: 'frost', debris: 'ice', punch: 0.8 }),
  rend: BLOOD({ ring: 'shards', debris: 'blood', decal: 'stain', punch: 0.4 }),
  smoke_bomb: SHADOW({ mid: '#8a8794', ring: 'petals', decal: undefined, punch: 0.5 }),
  envenom: VERDANT({ mid: '#a0c050', ring: 'halo', debris: 'leaf', decal: undefined, punch: 0.2 }),
  night_fangs: SHADOW({ mid: '#4a4058', ring: 'shards', debris: 'blood', decal: undefined, punch: 0.4 }),

  // ------------------------------------------------------------ sigils
  bone_tempest: BONE({ punch: 0.9 }),

  // ------------------------------------------------------ npc specials
  ground_slam: BONE({ debris: 'rock', decal: 'cracks', punch: 0.9 }),
};

/**
 * Resolve an ability's visual identity. Unknown/absent ids derive a
 * serviceable palette from the wire color so nothing ever renders as
 * "missing" — but every real ability should have a registry face.
 */
export function fxStyleFor(id: string | undefined, color: string | undefined): FxStyle {
  if (id) {
    const st = FX_STYLES[id];
    if (st) return st;
  }
  const mid = color ?? '#f4efe4';
  const cr = Number.parseInt(mid.slice(1, 3), 16) || 244;
  const cg = Number.parseInt(mid.slice(3, 5), 16) || 239;
  const cb = Number.parseInt(mid.slice(5, 7), 16) || 228;
  return {
    core: shade(mid, 70),
    mid,
    deep: shade(mid, -45),
    spark: shade(mid, 40),
    glow: `${cr}, ${cg}, ${cb}`,
    ring: 'teeth',
    debris: 'spark',
    punch: 0.5,
  };
}

// -------------------------------------------------- geometry helpers

/** Tiny deterministic PRNG — effects re-render identically every frame. */
export function srand(seed: number): () => number {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A jagged ring path: a polygon whose radius alternates per vertex —
 * teeth, petals, shards and frost are all vertex-count + jag choices.
 * Ground rings squash by `squash` (the camera's ground perspective).
 */
export function jaggedRingPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  squash: number,
  points: number,
  jag: number,
  rot: number,
  seed = 7,
): void {
  const rand = srand(seed);
  for (let i = 0; i <= points; i++) {
    const a = rot + (i / points) * Math.PI * 2;
    // Even verts ride the rim, odd verts bite in/out by jag (seeded so
    // the silhouette is stable but organic).
    const rr = r * (1 + (i % 2 === 0 ? 0 : jag * (0.6 + 0.8 * rand())) * (i % 4 === 1 ? 1 : -1));
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr * squash;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** A blocky burst star: alternating outer/inner vertices. */
export function burstStarPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  points: number,
  rot: number,
  squash = 1,
): void {
  for (let i = 0; i <= points * 2; i++) {
    const a = rot + (i / (points * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? rOuter : rInner;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr * squash;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/**
 * A jagged lightning path between two screen points. `seed` picks the
 * kink layout; step count scales with length so short hops stay sharp.
 */
export function boltPath(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  seed: number,
  jagPx: number,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const steps = Math.max(3, Math.min(9, Math.round(len / 26)));
  const rand = srand(seed);
  ctx.moveTo(x1, y1);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const off = (rand() - 0.5) * 2 * jagPx * (1 - Math.abs(t - 0.5));
    ctx.lineTo(x1 + dx * t + nx * off, y1 + dy * t + ny * off);
  }
  ctx.lineTo(x2, y2);
}
