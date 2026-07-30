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

/**
 * The signature layer — a bespoke set-piece drawn ON TOP of the shared
 * kind grammar. Two fire novas share the ring language; only one grows
 * a pillar of flame out of the crater. This axis is what keeps a
 * hundred abilities from reading as palette swaps of each other.
 */
export type MotifKind =
  | 'pillar' // column of rising blocks — eruptions, strikes from the sky
  | 'spikes' // ground spears erupting on a ring — ice, bone, thorn
  | 'vortex' // inward spiral streaks — pulls, whirlwinds, maelstroms
  | 'rain' // matter falling from above inside the radius
  | 'cage' // vertical bars rising on the rim — wards, snares, coils
  | 'wisps' // orbiting soul-flames — reapers, graves, smoke
  | 'rays' // long rotating light blades — suns, crowns, eclipses
  | 'tear' // a jagged rift slitting open and snapping shut
  | 'wave' // breaking crescent crests rolling outward
  | 'bloom' // petals unfurling from the center
  | 'crown' // regal points riding the main ring
  | 'echo' // trailing repeat-rings — pulses, bells, arcane resonance
  | 'quake' // radiating ground fissures + upthrown slabs
  | 'swarm'; // darting motes with streak tails

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
  /** The bespoke set-piece layered over the shared grammar. */
  motif?: MotifKind;
  /** Camera drama weight 0..1 — scales shake on detonation. */
  punch: number;
  /**
   * Interior ground light-wash strength 0..1 — how hard the turf
   * INSIDE a young nova/blast lights up. Big detonations sear the
   * ground; utility pulses barely kiss it. Undefined = 0.45.
   */
  wash?: number;
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
  motif?: MotifKind,
): FxStyle {
  return { core, mid, deep, spark, glow, ring, debris, decal, motif, punch };
}

// The elemental family voices. Individual abilities start from one and
// swap layers so siblings share a language yet keep their own face.
// Each family carries its own ground-wash temperament: fire SEARS the
// turf it lands on, shadow barely lets light touch it.
const EMBER = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#fff3d0', '#ff9a44', '#c43a18', '#ffd24a', '255, 150, 70', 'teeth', 'ember', 'scorch'),
  wash: 0.62,
  ...over,
});
const FROST = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#f0fbff', '#8ac4e8', '#3a6c94', '#d8f2ff', '150, 208, 240', 'frost', 'ice', 'rime'),
  wash: 0.48,
  ...over,
});
const STORM = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#fffce0', '#e8e06a', '#8a7a2a', '#ffffff', '240, 228, 120', 'teeth', 'spark', undefined, 0.6),
  wash: 0.55,
  ...over,
});
const VERDANT = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#eaffd8', '#7ac46a', '#3a6a34', '#c8e89a', '140, 208, 120', 'petals', 'leaf', 'roots'),
  wash: 0.35,
  ...over,
});
const BLOOD = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#ffd8d8', '#c4372a', '#6a1518', '#ff6a5a', '220, 80, 60', 'shards', 'blood', 'stain'),
  wash: 0.42,
  ...over,
});
const VOID = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#e8e0ff', '#7a68a8', '#2a2244', '#b49af0', '150, 120, 220', 'runes', 'shadow', 'glow'),
  wash: 0.5,
  ...over,
});
const RADIANT = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#fffbe8', '#ffd98a', '#b8862a', '#ffffff', '255, 220, 140', 'halo', 'star', 'glow', 0.6),
  wash: 0.7,
  ...over,
});
const BONE = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#fffcf0', '#e2dcc8', '#8a8474', '#ffffff', '220, 214, 190', 'shards', 'bone', 'cracks'),
  wash: 0.3,
  ...over,
});
const STEEL = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#ffffff', '#b8bec8', '#5a6068', '#e8eef8', '200, 208, 220', 'teeth', 'rock', 'cracks'),
  wash: 0.3,
  ...over,
});
const GOLD = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#fff8d8', '#e8c04c', '#9a7a1c', '#ffffff', '240, 200, 90', 'halo', 'star', 'glow', 0.6),
  wash: 0.62,
  ...over,
});
const TIDE = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#e0f8f8', '#6aa0c8', '#2a5a78', '#b8e8e8', '120, 180, 210', 'petals', 'ice', 'glow'),
  wash: 0.42,
  ...over,
});
const ARCANE = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#f4ecff', '#b49af0', '#5a4088', '#ffffff', '190, 160, 250', 'runes', 'star', 'runes'),
  wash: 0.52,
  ...over,
});
const SHADOW = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#d8d4e8', '#6a6080', '#1a1626', '#8a7fae', '120, 110, 160', 'shards', 'shadow', 'glow'),
  wash: 0.22,
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
  crescent_sweep: STEEL({ mid: '#d9a05a', deep: '#7a5426', spark: '#ffe8b0', ring: 'petals', wash: 0.35 }),
  lunge: STEEL({ ring: 'shards', decal: undefined, punch: 0.4 }),
  shadowstep: SHADOW({ ring: 'runes', motif: 'tear', punch: 0.3, wash: 0.1 }),
  shockwave: STEEL({ ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'quake', punch: 0.9, wash: 0.5 }),
  volley: VERDANT({ mid: '#8a6a45', deep: '#4a3822', ring: 'shards', debris: 'spark', decal: undefined, motif: 'rain' }),
  piercing_bolt: VERDANT({ mid: '#6b8a5a', ring: 'shards', decal: undefined, punch: 0.4 }),
  frost_nova: FROST({ motif: 'spikes', punch: 0.6, wash: 0.5 }),
  fireburst: EMBER({ motif: 'pillar', punch: 0.8, wash: 0.75 }),

  // ------------------------------------------------- blade-roster arts
  sundering_chop: STEEL({ mid: '#a4744b', deep: '#5a3c22', debris: 'rock', motif: 'quake', punch: 0.8, wash: 0.5 }),
  thorn_lash: VERDANT({ mid: '#5a7a42', ring: 'shards', debris: 'leaf', motif: 'spikes' }),
  quicksilver: STEEL({ core: '#ffffff', mid: '#e6ddc8', ring: 'shards', decal: undefined, motif: 'echo', punch: 0.3, wash: 0.25 }),
  riptide: TIDE({ mid: '#3d7a78', ring: 'petals', debris: 'ice', motif: 'wave', wash: 0.5 }),
  cinder_arc: EMBER({ mid: '#c4623c', ring: 'shards', punch: 0.5 }),
  winters_edge: FROST({ mid: '#a8c8dc', ring: 'shards', punch: 0.4 }),
  reapers_arc: VERDANT({ mid: '#4a5a48', deep: '#242e22', ring: 'shards', debris: 'leaf', decal: 'stain', motif: 'wisps', wash: 0.2 }),
  red_harvest: BLOOD({ ring: 'teeth', motif: 'wave', punch: 0.7, wash: 0.45 }),
  storm_brand: STORM({ mid: '#5a6a9c', ring: 'runes', motif: 'echo' }),
  kings_decree: GOLD({ ring: 'teeth', debris: 'star', motif: 'crown', punch: 0.9, wash: 0.7 }),
  sunburst: RADIANT({ mid: '#e8b64c', ring: 'teeth', debris: 'ember', decal: 'scorch', motif: 'rays', punch: 0.8, wash: 0.8 }),
  starfall_strike: VOID({ mid: '#4a4066', spark: '#ffd98a', debris: 'star', decal: 'scorch', motif: 'rain', punch: 0.9, wash: 0.65 }),
  vow_unbroken: RADIANT({ mid: '#e8e8f0', ring: 'halo', debris: 'star', motif: 'echo', punch: 0.2, wash: 0.35 }),

  // ------------------------------------------------- rogue-roster arts
  serpents_kiss: VERDANT({ mid: '#8a9a4a', ring: 'shards', debris: 'spark', decal: 'stain', motif: 'spikes' }),
  stinger: GOLD({ mid: '#e8b64c', ring: 'shards', debris: 'spark', decal: undefined, motif: 'swarm', punch: 0.3 }),
  cold_snap: FROST({ ring: 'teeth', motif: 'echo', punch: 0.5, wash: 0.45 }),
  bone_needle: BONE({ ring: 'shards', decal: undefined, motif: 'spikes', punch: 0.3 }),
  shadow_fang: SHADOW({ ring: 'shards', debris: 'shadow', motif: 'wisps', punch: 0.5 }),
  crimson_tithe: BLOOD({ ring: 'halo', motif: 'swarm', punch: 0.2, wash: 0.2 }),
  pale_flame: FROST({ mid: '#c8dce8', ring: 'petals', debris: 'spark', motif: 'wisps', punch: 0.4 }),
  spark_lash: STORM({ mid: '#7a88b8', ring: 'runes', motif: 'swarm', punch: 0.4 }),
  kings_bane: GOLD({ mid: '#c9a23c', ring: 'shards', debris: 'blood', decal: 'stain', motif: 'crown', punch: 0.7, wash: 0.5 }),
  last_word: STEEL({ core: '#ffffff', mid: '#f0f0f4', ring: 'halo', debris: 'spark', motif: 'echo', punch: 0.9, wash: 0.6 }),

  // ------------------------------------------------ archer-roster arts
  broadhead: STEEL({ mid: '#7a5a36', ring: 'shards', debris: 'blood', decal: 'stain', punch: 0.5 }),
  wingbeat: TIDE({ mid: '#4a8ab8', ring: 'petals', debris: 'spark', decal: undefined, motif: 'wave', punch: 0.3 }),
  verdant_burst: VERDANT({ motif: 'bloom', punch: 0.7, wash: 0.45 }),
  windsong: TIDE({ mid: '#8ab4c8', ring: 'halo', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.5 }),
  thorn_fan: VERDANT({ mid: '#6a8a4a', ring: 'shards', decal: undefined, motif: 'spikes', punch: 0.4 }),
  howling_loose: FROST({ mid: '#9ab8d8', ring: 'shards', debris: 'spark', motif: 'wave', punch: 0.4 }),
  hoarfrost: FROST({ ring: 'frost', motif: 'rain', punch: 0.7, wash: 0.55 }),
  ghost_shaft: SHADOW({ mid: '#a8a4c0', ring: 'runes', debris: 'spark', motif: 'wisps', punch: 0.4 }),
  cinder_rain: EMBER({ mid: '#e8823d', ring: 'shards', motif: 'rain', punch: 0.7, wash: 0.55 }),
  kings_arrow: GOLD({ mid: '#c9a23c', ring: 'halo', debris: 'spark', motif: 'crown', punch: 0.6 }),
  starfall_arrows: VOID({ mid: '#8a90d8', spark: '#fffbe8', debris: 'star', motif: 'rain', punch: 0.5, wash: 0.55 }),
  skyrend: STORM({ mid: '#d8e4f0', deep: '#5a6a8a', ring: 'teeth', motif: 'tear', punch: 0.9 }),

  // ---------------------------------------------- archmage-roster arts
  arcane_ring: ARCANE({ motif: 'echo', punch: 0.5, wash: 0.5 }),
  wisp_flare: RADIANT({ mid: '#efe8c0', ring: 'petals', debris: 'spark', decal: undefined, motif: 'swarm', punch: 0.3 }),
  hearth_flare: EMBER({ mid: '#e8944a', ring: 'petals', motif: 'bloom', punch: 0.6, wash: 0.65 }),
  undertow: TIDE({ ring: 'petals', debris: 'ice', decal: 'glow', motif: 'vortex', punch: 0.7, wash: 0.45 }),
  stormlash: STORM({ motif: 'pillar', punch: 0.8 }),
  cinderstorm: EMBER({ mid: '#e8683c', ring: 'teeth', debris: 'ember', motif: 'vortex', punch: 0.7, wash: 0.6 }),
  glaciate: FROST({ ring: 'frost', motif: 'cage', punch: 0.8, wash: 0.55 }),
  galvanic_arc: STORM({ mid: '#e8e29a', ring: 'runes', motif: 'echo', punch: 0.5 }),
  overgrowth: VERDANT({ motif: 'bloom', punch: 0.6, wash: 0.4 }),
  grave_chill: BONE({ mid: '#8a9484', ring: 'frost', debris: 'ice', decal: 'rime', motif: 'wisps', punch: 0.5, wash: 0.25 }),
  gloom_burst: VOID({ mid: '#9a6ab8', ring: 'petals', debris: 'shadow', decal: 'stain', motif: 'tear', punch: 0.6, wash: 0.3 }),
  venom_lash: VERDANT({ mid: '#a0c050', ring: 'shards', debris: 'spark', decal: 'stain', motif: 'rain', punch: 0.4 }),
  magma_orb: EMBER({ deep: '#8a2008', ring: 'teeth', debris: 'rock', motif: 'quake', punch: 0.8, wash: 0.75 }),
  shatterfrost: FROST({ ring: 'teeth', debris: 'ice', motif: 'quake', punch: 0.8, wash: 0.6 }),
  solar_lance: RADIANT({ motif: 'rays', punch: 0.8, wash: 0.75 }),
  rune_echo: ARCANE({ mid: '#b0a0d8', decal: 'glow', motif: 'echo', punch: 0.5, wash: 0.5 }),
  marrow_pulse: BONE({ ring: 'runes', motif: 'echo', punch: 0.5, wash: 0.3 }),
  void_rift: VOID({ motif: 'vortex', punch: 0.9, wash: 0.35 }),
  eye_of_the_storm: STORM({ mid: '#c8d0e8', ring: 'halo', motif: 'vortex', punch: 0.6, wash: 0.45 }),
  red_eclipse: BLOOD({ mid: '#c84a5a', ring: 'halo', debris: 'blood', motif: 'rays', punch: 0.8, wash: 0.6 }),
  realm_rend: fx('#ffffff', '#9ae8de', '#2a6a64', '#e0fffb', '160, 235, 225', 'teeth', 'star', 'glow', 0.9, 'tear'),

  // ------------------------------------------------------ relic actives
  ember_dash: EMBER({ ring: 'shards', decal: 'scorch', punch: 0.5 }),
  healing_totem: VERDANT({ ring: 'halo', debris: 'leaf', decal: 'glow', motif: 'bloom', punch: 0.2, wash: 0.4 }),
  snare_trap: VERDANT({ mid: '#a08a4a', ring: 'shards', debris: 'leaf', motif: 'cage', punch: 0.3, wash: 0.2 }),
  storm_bell: STORM({ ring: 'halo', motif: 'echo', punch: 0.8, wash: 0.65 }),
  hunters_decoy: fx('#fff8e0', '#c4a35a', '#6a5426', '#e8d8a0', '200, 170, 100', 'shards', 'leaf', undefined, 0.2),
  stone_aegis: STEEL({ mid: '#8a9484', ring: 'halo', debris: 'rock', motif: 'cage', punch: 0.3, wash: 0.25 }),
  coil_lance: STORM({ mid: '#d8cc5a', ring: 'runes', motif: 'cage', punch: 0.7 }),
  bramble_burst: VERDANT({ ring: 'shards', motif: 'spikes', punch: 0.6, wash: 0.3 }),
  arcane_seekers: ARCANE({ ring: 'petals', debris: 'star', decal: 'glow', motif: 'swarm', punch: 0.4 }),
  venom_dart: VERDANT({ mid: '#a0c050', ring: 'runes', debris: 'spark', decal: undefined, punch: 0.3 }),

  // -------------------------------------------------------- techniques
  heavy_slam: STEEL({ mid: '#b8865a', debris: 'rock', motif: 'quake', punch: 0.9, wash: 0.55 }),
  whirlwind: STEEL({ mid: '#d9a05a', ring: 'petals', debris: 'spark', decal: undefined, motif: 'vortex', punch: 0.5, wash: 0.35 }),
  bloodlust: BLOOD({ ring: 'teeth', motif: 'wisps', punch: 0.3, wash: 0.3 }),
  tumble_shot: VERDANT({ mid: '#8a9a5a', ring: 'shards', debris: 'spark', decal: undefined, punch: 0.3 }),
  rain_of_arrows: VERDANT({ mid: '#6b8a5a', ring: 'shards', debris: 'spark', motif: 'rain', punch: 0.7, wash: 0.45 }),
  twin_strike: STEEL({ mid: '#5a7a4a', ring: 'shards', decal: undefined, motif: 'echo', punch: 0.4 }),
  arc_bolt: STORM({ punch: 0.5 }),
  blink: ARCANE({ ring: 'halo', decal: 'runes', motif: 'tear', punch: 0.3, wash: 0.3 }),
  meteor_shard: EMBER({ mid: '#e85a3c', debris: 'rock', motif: 'quake', punch: 1.0, wash: 0.8 }),
  earthbreaker: STEEL({ mid: '#a4744b', deep: '#4a3018', debris: 'rock', decal: 'cracks', motif: 'quake', punch: 1.0, wash: 0.7 }),
  storm_of_shafts: STORM({ mid: '#8ab4c8', ring: 'shards', debris: 'spark', decal: undefined, motif: 'rain', punch: 0.6, wash: 0.5 }),
  maelstrom: TIDE({ ring: 'frost', debris: 'ice', motif: 'vortex', punch: 0.8, wash: 0.5 }),
  rend: BLOOD({ ring: 'shards', debris: 'blood', decal: 'stain', punch: 0.4 }),
  smoke_bomb: SHADOW({ mid: '#8a8794', ring: 'petals', decal: undefined, motif: 'wisps', punch: 0.5, wash: 0.12 }),
  envenom: VERDANT({ mid: '#a0c050', ring: 'halo', debris: 'leaf', decal: undefined, motif: 'swarm', punch: 0.2, wash: 0.15 }),
  night_fangs: SHADOW({ mid: '#4a4058', ring: 'shards', debris: 'blood', decal: undefined, motif: 'spikes', punch: 0.4, wash: 0.2 }),

  // ------------------------------- THE OPEN LADDER — the 24 new arts
  bull_rush: STEEL({ mid: '#c48a5a', ring: 'teeth', debris: 'rock', decal: undefined, motif: 'wave', punch: 0.7, wash: 0.4 }),
  warcry: GOLD({ mid: '#d9b05a', ring: 'teeth', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.4, wash: 0.4 }),
  steel_wave: STEEL({ ring: 'petals', debris: 'spark', decal: undefined, motif: 'wave', punch: 0.5, wash: 0.3 }),
  stagger_stomp: STEEL({ mid: '#a4886a', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'echo', punch: 0.8, wash: 0.5 }),
  headsman_stroke: BLOOD({ mid: '#8a4a3a', ring: 'teeth', debris: 'blood', decal: 'stain', motif: 'tear', punch: 0.8, wash: 0.45 }),
  warlords_descent: GOLD({ mid: '#d9a05a', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'crown', punch: 1.0, wash: 0.6 }),
  longshot: VERDANT({ mid: '#7a9a5a', ring: 'shards', debris: 'spark', decal: undefined, punch: 0.35 }),
  snare_shot: VERDANT({ mid: '#a08a4a', ring: 'shards', debris: 'leaf', decal: undefined, motif: 'cage', punch: 0.25, wash: 0.2 }),
  ricochet: STEEL({ mid: '#8a7a4a', ring: 'shards', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.4 }),
  skyfall_shot: VERDANT({ mid: '#6b8a6a', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'rain', punch: 0.8, wash: 0.5 }),
  phantom_flight: SHADOW({ mid: '#9aa8b8', ring: 'runes', debris: 'spark', decal: undefined, motif: 'wisps', punch: 0.35 }),
  arrow_tempest: STORM({ mid: '#5a7a8a', ring: 'shards', debris: 'spark', decal: undefined, motif: 'swarm', punch: 0.6, wash: 0.45 }),
  frost_lance: FROST({ ring: 'frost', debris: 'ice', decal: 'rime', motif: 'rays', punch: 0.5 }),
  ward_shell: ARCANE({ ring: 'halo', debris: 'star', decal: 'glow', motif: 'cage', punch: 0.2, wash: 0.35 }),
  ember_fan: EMBER({ ring: 'petals', debris: 'ember', decal: 'scorch', motif: 'swarm', punch: 0.5 }),
  stormcall: STORM({ ring: 'runes', debris: 'spark', decal: undefined, motif: 'rain', punch: 0.7, wash: 0.55 }),
  mirror_image: ARCANE({ mid: '#b8a8e8', ring: 'runes', debris: 'star', decal: 'runes', motif: 'echo', punch: 0.25, wash: 0.3 }),
  daybreak: RADIANT({ ring: 'teeth', debris: 'star', decal: 'scorch', motif: 'rays', punch: 0.9, wash: 0.8 }),
  ghost_step: SHADOW({ ring: 'shards', debris: 'blood', decal: undefined, motif: 'tear', punch: 0.35, wash: 0.15 }),
  caltrops: STEEL({ mid: '#7a7468', ring: 'shards', debris: 'rock', decal: 'cracks', motif: 'spikes', punch: 0.3, wash: 0.2 }),
  fan_of_knives: STEEL({ mid: '#a8a4b8', ring: 'shards', debris: 'blood', decal: undefined, motif: 'spikes', punch: 0.5, wash: 0.3 }),
  feint_double: SHADOW({ mid: '#8a8494', ring: 'runes', debris: 'shadow', decal: undefined, motif: 'tear', punch: 0.2, wash: 0.12 }),
  exposing_strike: BLOOD({ mid: '#9a6a8a', ring: 'shards', debris: 'blood', decal: 'stain', motif: 'echo', punch: 0.5 }),
  thousand_cuts: STEEL({ core: '#ffffff', mid: '#c4b8d8', ring: 'shards', debris: 'blood', decal: 'stain', motif: 'swarm', punch: 0.6, wash: 0.3 }),

  // ------------------------ THE SHIELD SKILL — the wall's ladder
  // The school speaks iron: STEEL voices with oak, heated-iron and
  // brass accents. Guard arts glow low; the breaks and the great
  // stand are the school's loud moments.
  shield_bash: STEEL({ mid: '#8ea4b8', ring: 'teeth', debris: 'spark', decal: undefined, punch: 0.6, wash: 0.35 }),
  set_the_wall: STEEL({ mid: '#7d8a9a', ring: 'halo', decal: undefined, motif: 'cage', punch: 0.2, wash: 0.25 }),
  shield_rush: STEEL({ mid: '#9aa8b8', ring: 'shards', debris: 'spark', decal: undefined, motif: 'wave', punch: 0.55 }),
  draw_iron: GOLD({ mid: '#c9a45e', ring: 'teeth', debris: 'spark', decal: undefined, motif: 'crown', punch: 0.5, wash: 0.4 }),
  shield_roof: STEEL({ mid: '#8a7a5e', deep: '#4a3f2e', ring: 'halo', decal: undefined, motif: 'echo', punch: 0.2, wash: 0.2 }),
  turned_blow: STEEL({ mid: '#b87a5e', deep: '#6a4030', spark: '#ffd0a8', ring: 'shards', debris: 'ember', decal: undefined, motif: 'echo', punch: 0.4 }),
  rampart_break: STEEL({ mid: '#7a8494', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'quake', punch: 0.85, wash: 0.5 }),
  wheel_of_iron: STEEL({ mid: '#aab6c4', ring: 'shards', debris: 'spark', decal: undefined, motif: 'vortex', punch: 0.5 }),
  hold_the_line: STEEL({ mid: '#8a94a4', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'cage', punch: 0.4, wash: 0.3 }),
  unbroken: GOLD({ mid: '#e8d5a0', ring: 'halo', debris: 'star', decal: 'glow', motif: 'rays', punch: 0.7, wash: 0.6 }),
  // The rim spark — not an art, the block law's own voice.
  shield_block: STEEL({ mid: '#c8d2dc', ring: 'shards', debris: 'spark', decal: undefined, punch: 0.15, wash: 0.1 }),

  // ------------------------ THE GREAT SCHOOL — the colossus's ladder
  // The school speaks forge-and-granite: hot iron mids over STEEL and
  // EMBER voices, rock debris, quake grammar. Everything lands HEAVY —
  // the school's punch floor sits higher than any other ladder's.
  wide_swath: STEEL({ mid: '#c47a3d', ring: 'teeth', debris: 'spark', decal: undefined, motif: 'wave', punch: 0.6, wash: 0.35 }),
  haft_check: STEEL({ mid: '#8a7a68', ring: 'shards', debris: 'spark', decal: undefined, punch: 0.35, wash: 0.2 }),
  iron_pendulum: STEEL({ mid: '#9a8a78', ring: 'shards', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.55, wash: 0.3 }),
  fault_line: EMBER({ mid: '#a06a48', deep: '#4a3020', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'quake', punch: 0.85, wash: 0.5 }),
  colossus_stance: BLOOD({ mid: '#b85e3a', ring: 'halo', debris: 'ember', decal: undefined, motif: 'pillar', punch: 0.25, wash: 0.25 }),
  skysunder: EMBER({ mid: '#c9924a', ring: 'teeth', debris: 'rock', decal: 'scorch', motif: 'pillar', punch: 0.9, wash: 0.6 }),
  executioners_arc: BLOOD({ mid: '#8a5a4a', ring: 'shards', debris: 'blood', decal: 'stain', punch: 0.65, wash: 0.3 }),
  avalanche: STEEL({ mid: '#b0a494', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'rain', punch: 0.7, wash: 0.35 }),
  breaker_charge: STEEL({ mid: '#b06a30', ring: 'shards', debris: 'spark', decal: undefined, motif: 'wave', punch: 0.6, wash: 0.3 }),
  titans_verdict: GOLD({ mid: '#e0a04c', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'quake', punch: 0.95, wash: 0.6 }),
  // The founding pair's Weapon Arts.
  colossus_arc: STEEL({ mid: '#9aa2ac', ring: 'teeth', debris: 'spark', decal: undefined, motif: 'wave', punch: 0.65, wash: 0.35 }),
  quakefall: EMBER({ mid: '#7d7468', deep: '#3a342c', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'quake', punch: 1.0, wash: 0.55 }),
  // THE ARMORY's Weapon Arts — every bespoke greatweapon speaks its
  // own face over the school's forge-and-granite floor. Punches stay
  // at the school's high floor; the palettes carry the identity.
  hewers_wheel: STEEL({ mid: '#9a8a6a', ring: 'teeth', debris: 'spark', decal: undefined, motif: 'vortex', punch: 0.6, wash: 0.3 }),
  reavers_due: STEEL({ mid: '#6e7c92', ring: 'shards', debris: 'spark', decal: undefined, motif: 'wave', punch: 0.6, wash: 0.25 }),
  mournfield: FROST({ mid: '#8a90a8', deep: '#3c4050', ring: 'halo', debris: 'shadow', decal: undefined, motif: 'cage', punch: 0.3, wash: 0.3 }),
  ash_harvest: EMBER({ mid: '#c47444', ring: 'shards', debris: 'ember', decal: 'scorch', motif: 'wave', punch: 0.7, wash: 0.4 }),
  glacier_sunder: FROST({ mid: '#9cc4e0', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'quake', punch: 0.85, wash: 0.5 }),
  crowns_word: GOLD({ mid: '#e0b054', ring: 'halo', debris: 'spark', decal: undefined, motif: 'crown', punch: 0.7, wash: 0.45 }),
  last_argument: RADIANT({ mid: '#efe6cc', ring: 'teeth', debris: 'star', decal: 'glow', motif: 'wave', punch: 0.95, wash: 0.55 }),
  barrow_bite: BONE({ mid: '#a89a84', ring: 'shards', debris: 'bone', decal: 'stain', motif: 'spikes', punch: 0.65, wash: 0.3 }),
  thunder_fell: STORM({ mid: '#8ca0d4', ring: 'teeth', debris: 'rock', decal: 'scorch', motif: 'quake', punch: 0.85, wash: 0.5 }),
  white_heat: EMBER({ mid: '#f0a050', deep: '#7a3c18', ring: 'halo', debris: 'ember', decal: undefined, motif: 'pillar', punch: 0.35, wash: 0.35 }),
  pale_crescent: FROST({ mid: '#d8dce8', ring: 'halo', debris: 'star', decal: undefined, motif: 'wave', punch: 0.6, wash: 0.35 }),
  horizon_fall: VOID({ mid: '#6a5e7a', deep: '#2c2438', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'pillar', punch: 1.0, wash: 0.55 }),
  // THE VAULT OF NAMES — six chase faces over the school's floor.
  // Each palette is the weapon's own paint: toll-lamp amber, fen
  // green, gate-glass violet, trail-brown, seam gold, bell bronze.
  road_opens: GOLD({ mid: '#d9a441', deep: '#5e6470', ring: 'teeth', debris: 'spark', decal: undefined, motif: 'wave', punch: 0.8, wash: 0.4 }),
  marsh_light: VERDANT({ mid: '#b8e068', deep: '#3a4432', ring: 'halo', debris: 'leaf', decal: 'stain', motif: 'wisps', punch: 0.35, wash: 0.35 }),
  riftfall: VOID({ mid: '#8a7ab8', deep: '#241d30', ring: 'runes', debris: 'star', decal: 'cracks', motif: 'tear', punch: 1.0, wash: 0.55 }),
  winters_hunger: BLOOD({ mid: '#a08a70', deep: '#42382e', ring: 'shards', debris: 'blood', decal: undefined, motif: 'spikes', punch: 0.4, wash: 0.3 }),
  open_seam: EMBER({ mid: '#e8c04c', deep: '#565046', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'quake', punch: 0.7, wash: 0.45 }),
  last_toll: STORM({ mid: '#e2c384', deep: '#4a7a68', ring: 'halo', debris: 'spark', decal: 'glow', motif: 'echo', punch: 0.9, wash: 0.5 }),

  // ------------------------ THE TWIN SCHOOL — the paired ladder
  // The school speaks TWIN STEEL: bright steel with the school's own
  // brass-amber, and everything answers twice — paired trails, crossed
  // marks, counter-rotation. Nothing in this ladder arrives alone.
  twin_cut: STEEL({ mid: '#d9a441', ring: 'shards', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.45, wash: 0.3 }),
  heron_step: STEEL({ mid: '#9ab4c4', ring: 'shards', debris: 'blood', decal: undefined, motif: 'wave', punch: 0.4, wash: 0.25 }),
  crossed_throw: STEEL({ mid: '#c4b48a', ring: 'shards', debris: 'spark', decal: undefined, motif: 'swarm', punch: 0.35, wash: 0.25 }),
  mirrored_hand: GOLD({ mid: '#e8d8a8', ring: 'halo', debris: 'star', decal: undefined, motif: 'echo', punch: 0.2, wash: 0.3 }),
  turning_reel: STEEL({ mid: '#b8a88a', ring: 'petals', debris: 'spark', decal: undefined, motif: 'vortex', punch: 0.55, wash: 0.35 }),
  red_ribbons: BLOOD({ mid: '#c44a3a', ring: 'halo', debris: 'blood', decal: 'stain', motif: 'swarm', punch: 0.25, wash: 0.25 }),
  swallows_dive: STEEL({ mid: '#8ab4d8', ring: 'teeth', debris: 'spark', decal: 'cracks', motif: 'rain', punch: 0.75, wash: 0.4 }),
  the_shears: STEEL({ mid: '#b0a4b8', ring: 'shards', debris: 'blood', decal: 'stain', motif: 'tear', punch: 0.6, wash: 0.3 }),
  storm_of_two: STEEL({ mid: '#a8b0c0', ring: 'halo', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.5, wash: 0.35 }),
  hundred_hands: GOLD({ mid: '#e0c060', ring: 'shards', debris: 'spark', decal: undefined, motif: 'swarm', punch: 0.6, wash: 0.35 }),

  // ------------------------- THE UNWRITTEN PAGE — deed-earned arts
  riftwalker_step: VOID({ ring: 'runes', debris: 'star', motif: 'tear', punch: 0.5, wash: 0.35 }),
  oathbound_edge: GOLD({ ring: 'halo', debris: 'star', motif: 'crown', punch: 0.7, wash: 0.55 }),
  warden_volley: VERDANT({ mid: '#8a9a78', ring: 'teeth', debris: 'spark', decal: undefined, motif: 'rain', punch: 0.55 }),
  whisper_fang: SHADOW({ mid: '#6a5a88', ring: 'shards', debris: 'blood', decal: 'stain', motif: 'wisps', punch: 0.45, wash: 0.15 }),
  champions_wall: GOLD({ mid: '#d8b76a', ring: 'teeth', debris: 'bone', decal: 'cracks', motif: 'crown', punch: 0.7, wash: 0.45 }),
  giantsfall: GOLD({ mid: '#d88a4a', ring: 'shards', debris: 'star', decal: 'cracks', motif: 'pillar', punch: 0.85, wash: 0.5 }),
  two_answers: GOLD({ mid: '#e8c878', ring: 'teeth', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.65, wash: 0.4 }),

  // ------------------------------------------------------------ sigils
  bone_tempest: BONE({ motif: 'vortex', punch: 0.9, wash: 0.4 }),

  // ------------------------------------------------------ npc specials
  ground_slam: BONE({ debris: 'rock', decal: 'cracks', motif: 'quake', punch: 0.9, wash: 0.45 }),
  rallying_howl: SHADOW({ mid: '#9aa2b8', ring: 'halo', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.6, wash: 0.3 }),
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
    wash: 0.45,
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
