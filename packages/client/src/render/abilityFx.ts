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
 * Arx. Unknown ids fall back to a palette derived from the ability's
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
  /**
   * THE AUTHORED FLAME (lighting v4 phase 4): the real scene light a
   * signature carries — reach in tiles, peak intensity, source height.
   * Set per FAMILY (one voice per school) and overridable per style;
   * absent = the queueGlow floor derivation (min(0.55, a·1.6)) — the
   * floor, not the ceiling. SHADOW authors none BY LAW: shadow matter
   * never emits (the matter library's own refusal).
   */
  light?: { r: number; intensity: number; z?: number };
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
  light: { r: 3.4, intensity: 0.7, z: 0.4 },
  ...over,
});
const FROST = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#f0fbff', '#8ac4e8', '#3a6c94', '#d8f2ff', '150, 208, 240', 'frost', 'ice', 'rime'),
  wash: 0.48,
  light: { r: 2.4, intensity: 0.4, z: 0.3 },
  ...over,
});
const STORM = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#fffce0', '#e8e06a', '#8a7a2a', '#ffffff', '240, 228, 120', 'teeth', 'spark', undefined, 0.6),
  wash: 0.55,
  light: { r: 3.0, intensity: 0.6, z: 0.5 },
  ...over,
});
const VERDANT = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#eaffd8', '#7ac46a', '#3a6a34', '#c8e89a', '140, 208, 120', 'petals', 'leaf', 'roots'),
  wash: 0.35,
  light: { r: 2.2, intensity: 0.35, z: 0.3 },
  ...over,
});
const BLOOD = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#ffd8d8', '#c4372a', '#6a1518', '#ff6a5a', '220, 80, 60', 'shards', 'blood', 'stain'),
  wash: 0.42,
  light: { r: 2.2, intensity: 0.35, z: 0.3 },
  ...over,
});
const VOID = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#e8e0ff', '#7a68a8', '#2a2244', '#b49af0', '150, 120, 220', 'runes', 'shadow', 'glow'),
  wash: 0.5,
  light: { r: 2.0, intensity: 0.3, z: 0.3 },
  ...over,
});
const RADIANT = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#fffbe8', '#ffd98a', '#b8862a', '#ffffff', '255, 220, 140', 'halo', 'star', 'glow', 0.6),
  wash: 0.7,
  light: { r: 3.2, intensity: 0.6, z: 0.4 },
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
  light: { r: 1.8, intensity: 0.25, z: 0.3 },
  ...over,
});
const GOLD = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#fff8d8', '#e8c04c', '#9a7a1c', '#ffffff', '240, 200, 90', 'halo', 'star', 'glow', 0.6),
  wash: 0.62,
  light: { r: 3.0, intensity: 0.55, z: 0.4 },
  ...over,
});
const TIDE = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#e0f8f8', '#6aa0c8', '#2a5a78', '#b8e8e8', '120, 180, 210', 'petals', 'ice', 'glow'),
  wash: 0.42,
  light: { r: 2.4, intensity: 0.4, z: 0.3 },
  ...over,
});
const ARCANE = (over: Partial<FxStyle> = {}): FxStyle => ({
  ...fx('#f4ecff', '#b49af0', '#5a4088', '#ffffff', '190, 160, 250', 'runes', 'star', 'runes'),
  wash: 0.52,
  light: { r: 2.8, intensity: 0.5, z: 0.4 },
  ...over,
});
// SHADOW authors NO light (see FxStyle.light): dark matter never emits.
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

  // -------------------------------------- the ten crowns, sword arts
  drag_under: TIDE({ mid: '#7fae9e', ring: 'halo', debris: 'ice', motif: 'wave', punch: 0.45, wash: 0.5 }),
  spoken_light: RADIANT({ mid: '#ffd977', ring: 'runes', debris: 'star', motif: 'rays', punch: 0.6, wash: 0.55 }),
  slagfall: EMBER({ mid: '#ff8a3c', ring: 'teeth', debris: 'ember', decal: 'scorch', motif: 'rain', punch: 0.8, wash: 0.5 }),
  sky_splits: STORM({ mid: '#8fa2c4', ring: 'shards', debris: 'spark', motif: 'rays', punch: 0.7 }),
  green_verse: VERDANT({ mid: '#6faa74', ring: 'petals', debris: 'leaf', decal: 'stain', motif: 'spikes', punch: 0.4 }),
  sun_court: GOLD({ mid: '#e8c04c', ring: 'halo', debris: 'star', decal: 'scorch', motif: 'crown', punch: 0.85, wash: 0.7 }),
  still_air: FROST({ mid: '#a9c8e4', ring: 'halo', debris: 'ice', motif: 'echo', punch: 0.35, wash: 0.6 }),

  // ------------------------------------------------- rogue-roster arts
  serpents_kiss: VERDANT({ mid: '#8a9a4a', ring: 'shards', debris: 'spark', decal: 'stain', motif: 'spikes' }),
  stinger: GOLD({ mid: '#e8b64c', ring: 'shards', debris: 'spark', decal: undefined, motif: 'swarm', punch: 0.3 }),
  cold_snap: FROST({ ring: 'teeth', motif: 'echo', punch: 0.5, wash: 0.45 }),
  bone_needle: BONE({ ring: 'shards', decal: undefined, motif: 'spikes', punch: 0.3 }),
  shadow_fang: SHADOW({ ring: 'shards', debris: 'shadow', motif: 'wisps', punch: 0.5 }),
  crimson_tithe: BLOOD({ ring: 'halo', motif: 'swarm', punch: 0.2, wash: 0.2 }),
  pale_flame: FROST({ mid: '#c8dce8', ring: 'petals', debris: 'spark', motif: 'wisps', punch: 0.4 }),

  // -------------------------------------- the ten crowns, knife arts
  garden_close: VOID({ mid: '#5f5478', spark: '#e0aad8', ring: 'petals', debris: 'shadow', motif: 'bloom', punch: 0.4, wash: 0.35 }),
  beak_first: SHADOW({ mid: '#3c4048', spark: '#ffd977', ring: 'shards', debris: 'spark', motif: 'swarm', punch: 0.5 }),
  pale_lantern: BONE({ mid: '#cff0c0', ring: 'halo', debris: 'shadow', motif: 'wisps', punch: 0.2, wash: 0.3 }),
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

  // -------------------------------------- the ten voices, staff arts
  wild_root: VERDANT({ mid: '#7a9a4a', ring: 'petals', debris: 'leaf', decal: 'roots', motif: 'spikes', punch: 0.5, wash: 0.4 }),
  day_breaks: RADIANT({ mid: '#ffd98a', ring: 'halo', debris: 'star', decal: 'glow', motif: 'rays', punch: 0.7, wash: 0.7 }),
  moonfall: FROST({ mid: '#bcd8f0', ring: 'halo', debris: 'ice', decal: 'rime', motif: 'rain', punch: 0.75, wash: 0.6 }),
  shearwind: STORM({ mid: '#d8e8f0', ring: 'halo', debris: 'spark', decal: undefined, motif: 'vortex', punch: 0.65, wash: 0.5 }),
  the_molt: EMBER({ mid: '#ff9a5a', ring: 'petals', debris: 'ember', decal: 'scorch', motif: 'swarm', punch: 0.5, wash: 0.5 }),
  hollowing: VOID({ mid: '#9a8ad8', ring: 'halo', debris: 'shadow', decal: 'stain', motif: 'vortex', punch: 0.7, wash: 0.3 }),
  red_toll: BLOOD({ mid: '#e84a5a', ring: 'runes', debris: 'blood', decal: 'stain', motif: 'swarm', punch: 0.55, wash: 0.4 }),
  axiom: ARCANE({ mid: '#c8b8f0', ring: 'runes', debris: 'star', decal: 'runes', motif: 'echo', punch: 0.55, wash: 0.5 }),
  perihelion: fx('#ffffff', '#b8ecff', '#2a4a6a', '#e8f8ff', '184, 236, 255', 'shards', 'star', 'cracks', 0.85, 'rain'),
  crownstorm: GOLD({ mid: '#fff0a0', ring: 'runes', debris: 'spark', decal: 'glow', motif: 'crown', punch: 0.8, wash: 0.6 }),

  // ------------------------------------- the ten flights, bow arts
  wakewood: VERDANT({ mid: '#6a8a4a', ring: 'shards', debris: 'leaf', decal: 'roots', motif: 'spikes', punch: 0.5, wash: 0.35 }),
  larkshot: RADIANT({ mid: '#ffd98a', ring: 'petals', debris: 'star', decal: 'glow', motif: 'rays', punch: 0.65, wash: 0.6 }),
  glasshail: FROST({ mid: '#bcd8f0', ring: 'shards', debris: 'ice', decal: 'rime', motif: 'rain', punch: 0.6, wash: 0.45 }),
  stormskip: STORM({ mid: '#8fa2c4', ring: 'shards', debris: 'spark', motif: 'echo', punch: 0.55 }),
  charfall: EMBER({ mid: '#ff8a3c', ring: 'teeth', debris: 'ember', decal: 'scorch', motif: 'pillar', punch: 0.8, wash: 0.55 }),
  hushfall: VOID({ mid: '#8d84a8', spark: '#ffd98a', ring: 'petals', debris: 'shadow', motif: 'swarm', punch: 0.4, wash: 0.3 }),
  quarry_call: BLOOD({ mid: '#c84a5a', ring: 'teeth', debris: 'blood', decal: 'stain', motif: 'wisps', punch: 0.6, wash: 0.4 }),
  plucked_chord: ARCANE({ mid: '#c8b8f0', ring: 'runes', debris: 'star', decal: 'runes', motif: 'echo', punch: 0.5, wash: 0.5 }),
  nightweft: VOID({ mid: '#9aa2c8', spark: '#e8ecff', ring: 'halo', debris: 'star', motif: 'vortex', punch: 0.6, wash: 0.4 }),
  the_anvil: STORM({ mid: '#cfe0ff', deep: '#3e4a66', ring: 'teeth', debris: 'spark', decal: 'cracks', motif: 'quake', punch: 0.9, wash: 0.55 }),

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
  tumble_shot: VERDANT({ mid: '#8a9a5a', deep: '#4e3c28', spark: '#e8d8b0', ring: 'shards', debris: 'spark', decal: undefined, punch: 0.3 }),
  rain_of_arrows: VERDANT({ mid: '#6b8a5a', deep: '#4e3c28', spark: '#e8d8b0', ring: 'shards', debris: 'spark', motif: 'rain', punch: 0.7, wash: 0.45 }),
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
  longshot: VERDANT({ mid: '#7a9a5a', deep: '#4e3c28', spark: '#e8d8b0', ring: 'shards', debris: 'spark', decal: undefined, punch: 0.35 }),
  snare_shot: VERDANT({ mid: '#a08a4a', deep: '#4e3c28', spark: '#e8d8b0', ring: 'shards', debris: 'leaf', decal: undefined, motif: 'cage', punch: 0.25, wash: 0.2 }),
  ricochet: STEEL({ mid: '#8a7a4a', ring: 'shards', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.4 }),
  skyfall_shot: VERDANT({ mid: '#6b8a6a', deep: '#4e3c28', spark: '#e8d8b0', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'rain', punch: 0.8, wash: 0.5 }),
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

  // ------------------ THE VETERAN'S SCHOOL — the combat ladder
  // The school speaks DUST AND BRASS: drill-yard grit kicked off the
  // ground, one brass horn-note where the school raises its voice, and
  // war-red only where blood is the point. No element ever — the
  // veteran's lessons look the same whatever the hand holds.
  first_blood: BLOOD({ mid: '#c4553d', ring: 'shards', debris: 'blood', decal: 'stain', motif: 'wave', punch: 0.4, wash: 0.3 }),
  shoulder_check: STEEL({ mid: '#b09a7a', ring: 'teeth', debris: 'rock', decal: undefined, motif: 'quake', punch: 0.55, wash: 0.3 }),
  war_shout: GOLD({ mid: '#d9b04a', ring: 'halo', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.6, wash: 0.4 }),
  second_breath: STEEL({ mid: '#a8c4b0', ring: 'halo', debris: 'star', decal: undefined, motif: 'bloom', punch: 0.15, wash: 0.25 }),
  loose_iron: STEEL({ mid: '#8a8f98', ring: 'shards', debris: 'spark', decal: undefined, motif: 'swarm', punch: 0.35, wash: 0.25 }),
  hold_fast: STEEL({ mid: '#7a8494', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'cage', punch: 0.3, wash: 0.3 }),
  break_the_line: STEEL({ mid: '#b0623c', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'wave', punch: 0.7, wash: 0.35 }),
  the_opening: RADIANT({ mid: '#e0d0a0', ring: 'shards', debris: 'star', decal: undefined, motif: 'tear', punch: 0.5, wash: 0.35 }),
  no_quarter: BLOOD({ mid: '#a83c32', ring: 'teeth', debris: 'blood', decal: 'stain', motif: 'swarm', punch: 0.55, wash: 0.3 }),
  the_long_fight: GOLD({ mid: '#c9a44a', ring: 'teeth', debris: 'spark', decal: 'cracks', motif: 'echo', punch: 0.75, wash: 0.45 }),

  // ----------------- THE DRAWN BREATH Phase 4c — the loot voices
  // The taught breaths: each face belongs to a teacher weapon's art.
  kept_ground: STEEL({ mid: '#b8c4cc', ring: 'teeth', debris: 'spark', decal: 'runes', motif: 'cage', punch: 0.45, wash: 0.35 }),
  standing_stone: STEEL({ mid: '#8a8a7a', ring: 'runes', debris: 'rock', decal: 'runes', motif: 'pillar', punch: 0.6, wash: 0.3 }),
  full_draw: STEEL({ mid: '#8a6a42', ring: 'shards', debris: 'rock', decal: 'cracks', motif: undefined, punch: 0.75, wash: 0.4 }),
  red_thread: BLOOD({ mid: '#c83a4a', ring: 'shards', debris: 'blood', decal: 'stain', motif: 'vortex', punch: 0.35, wash: 0.3 }),
  vigil: EMBER({ mid: '#e8d8a0', ring: 'halo', debris: 'star', decal: 'glow', motif: 'wisps', punch: 0.15, wash: 0.4 }),

  // ------------------------- THE UNWRITTEN PAGE — deed-earned arts
  // THE NEW VOICES: the channeled pages (THE DRAWN BREATH Phase 4).
  whirling_ruin: STEEL({ mid: '#c8b494', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'vortex', punch: 0.7, wash: 0.4 }),
  winters_fall: FROST({ mid: '#a8d8e8', motif: 'rain', punch: 0.65, wash: 0.5 }),
  riftwalker_step: VOID({ ring: 'runes', debris: 'star', motif: 'tear', punch: 0.5, wash: 0.35 }),
  oathbound_edge: GOLD({ ring: 'halo', debris: 'star', motif: 'crown', punch: 0.7, wash: 0.55 }),
  warden_volley: VERDANT({ mid: '#8a9a78', deep: '#4e3c28', spark: '#e8d8b0', ring: 'teeth', debris: 'spark', decal: undefined, motif: 'rain', punch: 0.55 }),
  whisper_fang: SHADOW({ mid: '#6a5a88', ring: 'shards', debris: 'blood', decal: 'stain', motif: 'wisps', punch: 0.45, wash: 0.15 }),
  champions_wall: GOLD({ mid: '#d8b76a', ring: 'teeth', debris: 'bone', decal: 'cracks', motif: 'crown', punch: 0.7, wash: 0.45 }),
  giantsfall: GOLD({ mid: '#d88a4a', ring: 'shards', debris: 'star', decal: 'cracks', motif: 'pillar', punch: 0.85, wash: 0.5 }),
  two_answers: GOLD({ mid: '#e8c878', ring: 'teeth', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.65, wash: 0.4 }),
  four_roads: GOLD({ mid: '#d8c080', ring: 'halo', debris: 'star', decal: 'glow', motif: 'rays', punch: 0.6, wash: 0.5 }),

  // ------------- THE BREATH BETWEEN RUNGS — the onehand breath wave
  // Ten blade voices seated between the founding rungs, each wearing
  // one element the hand commits to. The casted five read as a gather
  // then ONE answer; the channeled five read as a held working. Every
  // face keeps a unique ring+debris+motif hand within its family.
  // Ember Edge — the kindled cut: a breaking fire crescent, coals left
  // smoldering in the grass where the swing passed.
  ember_edge: EMBER({ mid: '#ff8148', ring: 'shards', debris: 'ember', decal: 'scorch', motif: 'wave', punch: 0.55, wash: 0.55 }),
  // Millwork — the turning stone: chaff-tan grind, the wheel's inward
  // draw, grit thrown off the rim every pass.
  millwork: STEEL({ mid: '#c8b088', deep: '#6a5a40', spark: '#f0e4c8', ring: 'teeth', debris: 'rock', decal: undefined, motif: 'vortex', punch: 0.45, wash: 0.3 }),
  // Levinstroke — the sky off the edge: levin-pale blue, a rent torn
  // down the line of the throw, scorch where it lands.
  levinstroke: STORM({ mid: '#8ab8f0', deep: '#3a4a7a', ring: 'shards', debris: 'spark', decal: 'scorch', motif: 'tear', punch: 0.65, wash: 0.5 }),
  // Red Ledger — the account held open: entry rings repeating down the
  // tether, the stain of what was taken.
  red_ledger: BLOOD({ mid: '#d84858', ring: 'runes', debris: 'blood', decal: 'stain', motif: 'echo', punch: 0.35, wash: 0.35 }),
  // Cold Iron — winter driven in at the mark: hoarfrost spears out of
  // the struck ring, rime that stays.
  cold_iron: FROST({ mid: '#9cc8dc', ring: 'frost', debris: 'ice', decal: 'rime', motif: 'spikes', punch: 0.6, wash: 0.5 }),
  // Frostwork — the pattern taking the ground: pale etch-blue, frost
  // unfurling ring by held ring.
  frostwork: FROST({ mid: '#bce4f0', ring: 'frost', debris: 'ice', decal: 'rime', motif: 'bloom', punch: 0.4, wash: 0.5 }),
  // First Light — the doorway opened: dawn gold torn through the dark,
  // a bright afterline where you passed.
  first_light: RADIANT({ mid: '#ffe9b0', ring: 'halo', debris: 'star', decal: 'glow', motif: 'tear', punch: 0.6, wash: 0.55 }),
  // Live Iron — the standing circuit: hot brass over storm, charge
  // bars caging the ring while the blade sings.
  live_iron: STORM({ mid: '#e8d84a', deep: '#7a6a20', ring: 'runes', debris: 'spark', decal: 'scorch', motif: 'cage', punch: 0.5, wash: 0.45 }),
  // Gloomfall — night poured out: dusk violet, dark falling INTO the
  // ring like rain that puts the light out.
  gloomfall: SHADOW({ mid: '#6a5a88', spark: '#b0a0d0', ring: 'runes', debris: 'shadow', decal: 'stain', motif: 'rain', punch: 0.7, wash: 0.2 }),
  // Noonfall — noon held over a ring: sun-bleached gold, a pillar of
  // light hammering the stake every beat, the turf seared white.
  noonfall: RADIANT({ mid: '#f8e8b0', ring: 'halo', debris: 'star', decal: 'scorch', motif: 'pillar', punch: 0.7, wash: 0.75 }),

  // --------------- THE BREATH BETWEEN RUNGS — the arx breath wave
  // Ten askings of the world seated between the mage school's rungs.
  // Same law as the blade wave: one element per art, a unique face per
  // art, the casted five read gather-then-answer, the channeled five
  // read as a held working.
  // Wickfire — the thrown candle: hungry lamp-orange, little standing
  // flames guttering where the splash licked.
  wickfire: EMBER({ mid: '#ff9a4a', ring: 'shards', debris: 'ember', decal: 'scorch', motif: 'wisps', punch: 0.5, wash: 0.55 }),
  // Rime River — winter poured downhill: milk-blue over deep water,
  // a crest that rolls away downstream and a road of rime left behind.
  rime_river: FROST({ mid: '#9ad4ec', ring: 'frost', debris: 'ice', decal: 'rime', motif: 'wave', punch: 0.4, wash: 0.45 }),
  // Windshear — the sky handed back: mint-pale air, torn leaves, gust
  // fronts breaking outward; the one face here with no mark left.
  windshear: VERDANT({ mid: '#c2e8c8', deep: '#4a7a62', spark: '#f4fff6', ring: 'petals', debris: 'leaf', decal: undefined, motif: 'wave', punch: 0.65, wash: 0.3 }),
  // Stonerise — the quarry answering: sandstone tan, rows of ground
  // teeth, cracks that stay in the earth.
  stonerise: STEEL({ mid: '#c8a25f', deep: '#6a4e2a', spark: '#ffd98a', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'spikes', punch: 0.6, wash: 0.35 }),
  // Geyser — the deep well woken: surf-blue, a standing white column,
  // the wet sheen where it rained back down.
  geyser: TIDE({ mid: '#8ec8dc', ring: 'petals', debris: 'ice', decal: 'glow', motif: 'pillar', punch: 0.7, wash: 0.45 }),
  // Anvil Sky — the forge brought low: hot brass under a flat cloud
  // disc, the hammer falling every held beat.
  anvil_sky: STORM({ mid: '#efe27a', deep: '#6a5f1e', ring: 'halo', debris: 'spark', decal: 'scorch', motif: 'echo', punch: 0.75, wash: 0.3 }),
  // Hollowcall — the small nothing: bruise-violet, everything leaning
  // inward, a stain where light arrives late.
  hollowcall: VOID({ mid: '#8a6ad0', ring: 'runes', debris: 'shadow', decal: 'glow', motif: 'vortex', punch: 0.65, wash: 0.25 }),
  // Burning Glass — noon narrowed: honey gold drawn to a line, embers
  // where the focus crossed, the scorch of a held burn.
  burning_glass: RADIANT({ mid: '#ffce70', ring: 'halo', debris: 'ember', decal: 'scorch', motif: 'rays', punch: 0.45, wash: 0.6 }),
  // Moonrise — the early moon: silver-blue silence, a slow halo, pale
  // moths of light adrift in the glade it leaves.
  moonrise: ARCANE({ mid: '#d8e2f8', deep: '#46548a', spark: '#ffffff', glow: '190, 205, 250', ring: 'halo', debris: 'star', decal: 'glow', motif: 'wisps', punch: 0.55, wash: 0.4 }),
  // Cometfall — visitors from far away: sea-glass teal with a violet
  // fleck, streaks falling in, craters cracked where they land.
  cometfall: ARCANE({ mid: '#9ae8de', deep: '#2a6a7a', spark: '#e8b0ff', glow: '154, 232, 222', ring: 'shards', debris: 'star', decal: 'cracks', motif: 'rain', punch: 0.8, wash: 0.5 }),

  // ------------------- THE SECOND BREATH — the archery breath wave
  // Every ten-art school takes the same wave onehand and arx carry.
  // The law holds: one face per art, unique ring+debris+motif hand
  // within the family, casted arts gather-then-answer, channels hold.
  // Kingshot — the oak-hearted draw: a breaking crest down the lane.
  kingshot: VERDANT({ mid: '#7a9a4a', deep: '#4e3c28', spark: '#e8d8b0', ring: 'shards', debris: 'spark', decal: undefined, motif: 'wave', punch: 0.5, wash: 0.3 }),
  // Stringsong — the held note: rings repeating off the string.
  stringsong: STORM({ mid: '#9ab86a', ring: 'shards', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.35, wash: 0.4 }),
  // Hawk's Hour — the marked field: light blades wheeling like wings.
  hawks_hour: RADIANT({ mid: '#c8a44a', ring: 'halo', debris: 'spark', decal: 'glow', motif: 'rays', punch: 0.6, wash: 0.55 }),
  // Winterflight — the cold line: a crest of winter rolling downwind.
  winterflight: FROST({ mid: '#8ac4e0', ring: 'frost', debris: 'ice', decal: 'rime', motif: 'wave', punch: 0.4, wash: 0.4 }),
  // Emberhead — the fire-tipped pair: a burst that flowers on impact.
  emberhead: EMBER({ mid: '#e08a4a', ring: 'teeth', debris: 'ember', decal: 'scorch', motif: 'bloom', punch: 0.55 }),
  // Skyloom — the stitching shuttle: darting motes trailing thread.
  skyloom: VERDANT({ mid: '#6b9a7a', ring: 'petals', debris: 'leaf', decal: undefined, motif: 'swarm', punch: 0.4, wash: 0.3 }),
  // Gloamshaft — the black line: a rift slit down the corridor.
  gloamshaft: SHADOW({ mid: '#5a5a78', ring: 'runes', debris: 'shadow', decal: 'glow', motif: 'tear', punch: 0.5, wash: 0.2 }),
  // Harrier — the returning wing: an inward-turning circuit.
  harrier: STORM({ mid: '#a8946a', ring: 'shards', debris: 'spark', decal: undefined, motif: 'vortex', punch: 0.4, wash: 0.35 }),
  // Zenith — noon loosed: a pillar of high light hammered down.
  zenith: RADIANT({ mid: '#e8c874', ring: 'halo', debris: 'star', decal: 'scorch', motif: 'pillar', punch: 0.8 }),
  // Crowsong — the dark flock: streaking motes over a stained field.
  crowsong: VOID({ mid: '#4a4458', ring: 'shards', debris: 'shadow', decal: 'stain', motif: 'swarm', punch: 0.5, wash: 0.25 }),

  // --------------------- THE SECOND BREATH — the sneak breath wave
  // Opened Vein — the drawn cut: one red crest, the stain that keeps.
  opened_vein: BLOOD({ ring: 'shards', debris: 'blood', decal: 'stain', motif: 'wave', punch: 0.45, mid: '#9a3040' }),
  // Threadwork — the passing needle: quiet rings on the same seam.
  threadwork: SHADOW({ mid: '#7a6a8a', ring: 'runes', debris: 'blood', decal: undefined, motif: 'echo', punch: 0.3, wash: 0.15 }),
  // Nightshade Kiss — the steeped garden: a bloom nobody plants twice.
  nightshade_kiss: VERDANT({ mid: '#8aa050', ring: 'petals', debris: 'leaf', decal: 'stain', motif: 'bloom', punch: 0.3, wash: 0.2 }),
  // The Quiet Knife — the hush line: a slit of dark held open.
  quiet_knife: SHADOW({ mid: '#6a6480', ring: 'shards', debris: 'shadow', decal: undefined, motif: 'tear', punch: 0.35, wash: 0.12 }),
  // Redwork — the room blooming red: petals of the maker's craft.
  redwork: BLOOD({ mid: '#a84048', ring: 'petals', debris: 'blood', decal: 'stain', motif: 'bloom', punch: 0.5 }),
  // Gallows Thread — the passed noose: bars rising on the rim.
  gallows_thread: VOID({ mid: '#5a5468', ring: 'runes', debris: 'shadow', decal: undefined, motif: 'cage', punch: 0.4, wash: 0.2 }),
  // Widow's Draw — the dealt needles: a seeking scatter of motes.
  widows_draw: VERDANT({ mid: '#b0b47a', ring: 'shards', debris: 'leaf', decal: 'stain', motif: 'swarm', punch: 0.4, wash: 0.25 }),
  // Bloodletting — the old surgery: what is taken drifts to the taker.
  bloodletting: BLOOD({ mid: '#8a2a34', deep: '#4a0e12', ring: 'shards', debris: 'blood', decal: 'stain', motif: 'wisps', punch: 0.35, wash: 0.3 }),
  // Lights Out — the pinched wick: the last rays going under.
  lights_out: SHADOW({ mid: '#3a3450', deep: '#12101e', ring: 'runes', debris: 'shadow', decal: 'glow', motif: 'rays', punch: 0.5, wash: 0.1 }),
  // The Red Hour — the hungry clock: red rings counting the seconds.
  red_hour: BLOOD({ mid: '#c4384a', ring: 'teeth', debris: 'blood', decal: 'stain', motif: 'echo', punch: 0.5, wash: 0.35 }),

  // -------------------- THE SECOND BREATH — the shield breath wave
  // Iron Toll — the struck bell: bright rings off the boss.
  iron_toll: STEEL({ mid: '#8ea4b8', ring: 'halo', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.55, wash: 0.35 }),
  // Grindstone — the turning rim: grit drawn inward, curls thrown off.
  grindstone: STEEL({ mid: '#9a9484', deep: '#565046', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'vortex', punch: 0.4 }),
  // Doorfall — the laid-down wall: slabs upthrown where it lands.
  doorfall: STEEL({ mid: '#7d8a9a', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'quake', punch: 0.7, wash: 0.4 }),
  // Held Gate — the cold lane: bars of winter holding the corridor.
  held_gate: FROST({ mid: '#7ab0cc', ring: 'frost', debris: 'ice', decal: 'rime', motif: 'cage', punch: 0.4, wash: 0.35 }),
  // Sunbrass — noon off the boss: long brass blades of light.
  sunbrass: GOLD({ mid: '#d9b45e', ring: 'halo', debris: 'ember', decal: 'scorch', motif: 'rays', punch: 0.6 }),
  // Millwall — the turning wall: crests thrown back with every pass.
  millwall: STEEL({ mid: '#8a94a4', deep: '#4a525e', ring: 'teeth', debris: 'rock', decal: undefined, motif: 'wave', punch: 0.5, wash: 0.3 }),
  // Anchorfall — the parted sea: the ground split cold where it lands.
  anchorfall: TIDE({ mid: '#6a94b0', ring: 'frost', debris: 'ice', decal: 'rime', motif: 'quake', punch: 0.65 }),
  // The Patient Wall — battlement points riding the advancing ring.
  patient_wall: STEEL({ mid: '#a4988a', deep: '#5a5046', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'crown', punch: 0.35, wash: 0.25 }),
  // The Standing Sun — the planted standard: a column of held day.
  standing_sun: GOLD({ mid: '#e8cc84', ring: 'halo', debris: 'star', decal: 'glow', motif: 'pillar', punch: 0.65 }),
  // Winterhold — the frozen court: ice spears rising on the rim.
  winterhold: FROST({ mid: '#a0c8dc', deep: '#3a5c74', ring: 'frost', debris: 'ice', decal: 'rime', motif: 'spikes', punch: 0.5, wash: 0.35 }),

  // ------------------- THE SECOND BREATH — the twohand breath wave
  // Fell Timber — the felled crown: one green crest coming down.
  fell_timber: VERDANT({ mid: '#8a7a4e', deep: '#463a24', spark: '#d8c8a0', ring: 'shards', debris: 'leaf', decal: 'cracks', motif: 'wave', punch: 0.6, wash: 0.3 }),
  // Quarry Work — the split seam: fissures radiating from the swing.
  quarry_work: STEEL({ mid: '#9a8a78', deep: '#544a3e', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'quake', punch: 0.5 }),
  // Forgefall — the glowing hammer: a pillar of forge-light on landing.
  forgefall: EMBER({ mid: '#d97a3d', ring: 'teeth', debris: 'ember', decal: 'scorch', motif: 'pillar', punch: 0.75 }),
  // The Wheelbreaker — the driven ram: a crest rolling down the lane.
  wheelbreaker: STORM({ mid: '#b09a6a', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'wave', punch: 0.55, wash: 0.4 }),
  // Gravedigger — the hungry pit: bone-dark spiral drawing them in.
  gravedigger: VOID({ mid: '#6a5e6e', deep: '#262030', ring: 'runes', debris: 'bone', decal: 'stain', motif: 'vortex', punch: 0.6, wash: 0.3 }),
  // Ore Song — the singing seam: ring after ring off the struck stone.
  ore_song: STEEL({ mid: '#b8a488', deep: '#5e5442', spark: '#f0e0c0', ring: 'teeth', debris: 'rock', decal: undefined, motif: 'echo', punch: 0.5, wash: 0.3 }),
  // Skyweight — the falling horizon: weight raining inside the ring.
  skyweight: GOLD({ mid: '#c9a24a', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'rain', punch: 0.7, wash: 0.45 }),
  // The Long Lever — the world moved: one long rift down the lane.
  long_lever: STEEL({ mid: '#a08a68', deep: '#54462e', ring: 'shards', debris: 'rock', decal: undefined, motif: 'tear', punch: 0.45, wash: 0.25 }),
  // Sunhammer — swung noon: long blades of heat off the arc.
  sunhammer: RADIANT({ mid: '#e0a04c', ring: 'teeth', debris: 'ember', decal: 'scorch', motif: 'rays', punch: 0.7 }),
  // World's Rim — the grinding edge: cold fissures where it turns.
  worlds_rim: FROST({ mid: '#8a9aa8', deep: '#3e4a56', ring: 'frost', debris: 'rock', decal: 'rime', motif: 'quake', punch: 0.55, wash: 0.35 }),

  // ----------------- THE SECOND BREATH — the dualwield breath wave
  // Two Bells — the double peal: bright rings answering each other.
  two_bells: GOLD({ mid: '#d9c46a', ring: 'halo', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.5, wash: 0.4 }),
  // Ribbonwork — the crossing ribbons: red crests woven over the arc.
  ribbonwork: BLOOD({ mid: '#c45a4a', ring: 'petals', debris: 'blood', decal: 'stain', motif: 'wave', punch: 0.4 }),
  // Twin Moons — the shared orbit: two pale bodies wheeling home.
  twin_moons: RADIANT({ mid: '#b8c4d8', deep: '#5a6a88', ring: 'halo', debris: 'star', decal: undefined, motif: 'vortex', punch: 0.45, wash: 0.4 }),
  // Silver Reel — the cold spin: an inward-wound circle of frost.
  silver_reel: FROST({ mid: '#a8c0cc', ring: 'frost', debris: 'ice', decal: undefined, motif: 'vortex', punch: 0.45, wash: 0.35 }),
  // Matched Flame — the twin wicks: burning motes darting in pairs.
  matched_flame: EMBER({ mid: '#e0854a', ring: 'shards', debris: 'ember', decal: 'scorch', motif: 'swarm', punch: 0.5 }),
  // Stormstitch — the answered throw: a jagged seam torn foe to foe.
  stormstitch: STORM({ mid: '#c8c86a', ring: 'shards', debris: 'spark', decal: undefined, motif: 'tear', punch: 0.5, wash: 0.45 }),
  // Mirrorfall — the double landing: the ring lands twice, rimed.
  mirrorfall: FROST({ mid: '#9ab8c8', deep: '#46687c', ring: 'petals', debris: 'ice', decal: 'rime', motif: 'echo', punch: 0.55, wash: 0.4 }),
  // The Weave — the held loom: warp-bars rising around the work.
  the_weave: ARCANE({ mid: '#b0a4c0', ring: 'runes', debris: 'star', decal: undefined, motif: 'cage', punch: 0.4, wash: 0.3 }),
  // First and Last — the opened door: light blades at the threshold.
  first_and_last: RADIANT({ mid: '#e8d8a0', ring: 'halo', debris: 'star', decal: 'glow', motif: 'rays', punch: 0.55 }),
  // Hummingbird — the blur of wings: green motes too quick to count.
  hummingbird: VERDANT({ mid: '#8ac4a8', ring: 'petals', debris: 'leaf', decal: undefined, motif: 'swarm', punch: 0.35, wash: 0.3 }),

  // ------------------- THE SECOND BREATH — the combat breath wave
  // Measured Blow — the read seam: one clean crest where it parts.
  measured_blow: STEEL({ mid: '#b09a7a', deep: '#5e5040', ring: 'teeth', debris: 'rock', decal: undefined, motif: 'wave', punch: 0.45, wash: 0.25 }),
  // Drumbeat — the old cadence: ground-shaking rings on the count.
  drumbeat: STORM({ mid: '#c4885a', ring: 'teeth', debris: 'rock', decal: undefined, motif: 'echo', punch: 0.5, wash: 0.4 }),
  // Thrown Iron — hurled scrap: sparks scattering off the burst.
  thrown_iron: STEEL({ mid: '#8a8f98', ring: 'shards', debris: 'spark', decal: 'cracks', motif: 'swarm', punch: 0.5 }),
  // Ironbreath — the cold exhale: a crest of winter down the lane.
  ironbreath: FROST({ mid: '#9ab4bc', deep: '#42606a', ring: 'frost', debris: 'ice', decal: 'rime', motif: 'wave', punch: 0.4, wash: 0.3 }),
  // The Fifth Road — the untaught line: a dark rift where you passed.
  fifth_road: SHADOW({ mid: '#7a6a80', ring: 'shards', debris: 'blood', decal: 'stain', motif: 'tear', punch: 0.5, wash: 0.2 }),
  // Old Thunder — the remembered storm: the ground answers the joints.
  old_thunder: STORM({ mid: '#b8a45a', deep: '#6a5a20', ring: 'teeth', debris: 'spark', decal: undefined, motif: 'quake', punch: 0.55, wash: 0.4 }),
  // The Gathered Breath — all at once: a bloom of held gold let go.
  gathered_breath: GOLD({ mid: '#d9c084', ring: 'halo', debris: 'spark', decal: 'glow', motif: 'bloom', punch: 0.6, wash: 0.45 }),
  // The Long Watch — the settled certainty: cold bars on the ground.
  long_watch: FROST({ mid: '#7a8a94', deep: '#38444e', ring: 'runes', debris: 'ice', decal: undefined, motif: 'cage', punch: 0.4, wash: 0.25 }),
  // Scarworn — the collected receipts: what they pay drifts to you.
  scarworn: BLOOD({ mid: '#a05a48', ring: 'teeth', debris: 'blood', decal: 'stain', motif: 'wisps', punch: 0.5 }),
  // Last Lesson — the passed lesson: bright motes leaping student to student.
  last_lesson: GOLD({ mid: '#c9b46a', deep: '#6e5c24', ring: 'runes', debris: 'spark', decal: undefined, motif: 'swarm', punch: 0.5, wash: 0.35 }),

  // ------------------------------------------------------------ sigils
  bone_tempest: BONE({ motif: 'vortex', punch: 0.9, wash: 0.4 }),

  // ------------------------------------------------------ npc specials
  ground_slam: BONE({ debris: 'rock', decal: 'cracks', motif: 'quake', punch: 0.9, wash: 0.45 }),
  rallying_howl: SHADOW({ mid: '#9aa2b8', ring: 'halo', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.6, wash: 0.3 }),
  ravening_cackle: SHADOW({ mid: '#c9a44a', ring: 'teeth', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.65, wash: 0.3 }),
  // Moon-pale over shadow: the scream is a spike, the answer is eyes.
  hushing_screech: SHADOW({ mid: '#b8c4d8', ring: 'halo', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.6, wash: 0.32 }),
  // Ember over shadow: the keen is a needle, the answer is flags.
  vixens_scream: SHADOW({ mid: '#d97a35', ring: 'halo', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.6, wash: 0.3 }),

  // --------------------- THE VOICES (enemy arts, docs/enemy-arts-plan.md)
  // Every kit ability wears an AUTHORED face — the fallback grammar is
  // a safety net, never a costume. Goblinkind burns dirty (camp-fire
  // orange, greasy green), the dead speak bone and crypt-cold, the
  // beasts stay bodily.
  goblin_firebolt: EMBER({ ring: 'teeth', debris: 'ember', decal: 'scorch', punch: 0.45, wash: 0.4 }),
  cinder_ring: EMBER({ mid: '#e06a30', ring: 'teeth', debris: 'ember', decal: 'scorch', motif: 'pillar', punch: 0.7, wash: 0.5 }),
  gloom_spittle: VERDANT({ mid: '#a0c050', ring: 'shards', debris: 'spark', decal: 'stain', punch: 0.35 }),
  miasma_ring: VERDANT({ mid: '#7ac46a', ring: 'halo', debris: 'leaf', decal: 'stain', motif: 'swarm', punch: 0.4, wash: 0.4 }),
  bone_volley: BONE({ ring: 'shards', debris: 'bone', decal: undefined, punch: 0.4, wash: 0.3 }),
  grave_mist: FROST({ mid: '#8ac4e8', ring: 'frost', debris: 'ice', decal: 'rime', motif: 'wisps', punch: 0.45, wash: 0.45 }),
  raise_the_fallen: BONE({ mid: '#9a94b8', ring: 'runes', debris: 'bone', decal: 'runes', motif: 'wisps', punch: 0.6, wash: 0.4 }),
  web_snare: BONE({ mid: '#e8e8e0', ring: 'runes', debris: 'spark', decal: 'glow', motif: 'cage', punch: 0.35, wash: 0.3 }),
  reaping_sweep: STEEL({ mid: '#c9a44a', ring: 'shards', debris: 'spark', decal: undefined, punch: 0.55, wash: 0.3 }),
  rattling_volley: BONE({ ring: 'shards', debris: 'bone', decal: undefined, punch: 0.35, wash: 0.25 }),
  gnawed_mending: VERDANT({ mid: '#7ac46a', ring: 'halo', debris: 'leaf', decal: undefined, motif: 'bloom', punch: 0.4, wash: 0.3 }),
  // THE AUTHORED TIDE (statusBook Phase 5) — the eight crowns' pages,
  // each face speaking its page's ink family (PALETTE-IS-IDENTITY:
  // the ambience the state then wears is the same color story).
  tyrants_frenzy: GOLD({ mid: '#ffd76a', ring: 'halo', motif: 'bloom', punch: 0.5, wash: 0.35 }),
  gravecold_pall: BONE({ mid: '#8a6a9a', ring: 'halo', motif: 'echo', punch: 0.45, wash: 0.45 }),
  barrow_knit: VERDANT({ mid: '#7ad0a0', ring: 'halo', motif: 'bloom', punch: 0.4, wash: 0.35 }),
  tide_grasp: TIDE({ mid: '#a8814f', ring: 'frost', decal: 'stain', motif: 'cage', punch: 0.55, wash: 0.4 }),
  barnacle_plate: STEEL({ mid: '#98a4b0', ring: 'shards', motif: 'bloom', punch: 0.45, wash: 0.3 }),
  matriarchs_howl: SHADOW({ mid: '#8a6a9a', ring: 'halo', motif: 'echo', punch: 0.5, wash: 0.45 }),
  oldfangs_blood: BLOOD({ mid: '#ffd76a', ring: 'halo', motif: 'bloom', punch: 0.5, wash: 0.3 }),
  anvil_toll: STEEL({ mid: '#dcd8f0', ring: 'shards', decal: 'cracks', motif: 'echo', punch: 0.8, wash: 0.4 }),
  marrow_chill: FROST({ mid: '#b8c4d8', ring: 'frost', debris: 'ice', decal: 'rime', motif: 'echo', punch: 0.6, wash: 0.4 }),
  rending_lunge: BLOOD({ mid: '#c9a44a', ring: 'shards', debris: 'blood', decal: 'stain', punch: 0.55, wash: 0.3 }),
  // THE BROTHERHOOD (the wolf crown) — winter-iron over blood: the
  // hamstring is a low cold cut, the call is the howl family's echo
  // in frost-grey, the return lunge is the gnoll's word gone pale
  // and silent (moon-steel mid where the packlord runs amber).
  hamstring_bite: BLOOD({ mid: '#8f96a8', ring: 'shards', debris: 'blood', decal: 'stain', punch: 0.45, wash: 0.25 }),
  call_the_brotherhood: SHADOW({ mid: '#8a94b8', ring: 'halo', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.65, wash: 0.35 }),
  throat_lunge: BLOOD({ mid: '#b8bfd4', ring: 'shards', debris: 'blood', decal: 'stain', punch: 0.6, wash: 0.3 }),
  // THE COURT'S HOUND (the fey wolf) — cold light over dusk: the ring
  // is grown, not cast (rune ring, star grains, a caged floor); the
  // veil is night arriving early in one bloom; the step is a cold
  // seam torn and mended with the bite waiting at the far end.
  faerie_ring: FROST({ mid: '#9ff0d8', deep: '#2e5a4c', ring: 'runes', debris: 'star', decal: 'glow', motif: 'cage', punch: 0.45, wash: 0.4 }),
  gloaming_veil: SHADOW({ mid: '#8a7fb0', ring: 'halo', debris: 'star', decal: undefined, motif: 'bloom', punch: 0.6, wash: 0.35 }),
  glimmer_step: ARCANE({ mid: '#b8ecdc', deep: '#3c6a5e', ring: 'shards', debris: 'star', decal: 'glow', motif: 'tear', punch: 0.6, wash: 0.3 }),
  shrilling_dart: SHADOW({ mid: '#8a7458', ring: 'halo', debris: 'spark', decal: undefined, punch: 0.35, wash: 0.2 }),
  // THE TIDE'S RAMPART (the giant crab) — cold harbor water over
  // keratin: the grip is TIDE gone hard (teeth ring, the clamp's
  // heavy punch), the jet is the same water at pressure with a
  // frost-pale spray. Kelp-dark deeps keep the pair off the golem
  // glacier and the crypt cold alike.
  breakwater_grip: TIDE({ mid: '#6d8577', deep: '#22403a', spark: '#d8ecdf', ring: 'teeth', debris: 'ice', decal: 'stain', punch: 0.75, wash: 0.4 }),
  brine_jet: TIDE({ mid: '#7ab0b8', deep: '#28454e', ring: 'shards', debris: 'ice', decal: 'stain', motif: 'wave', punch: 0.4, wash: 0.35 }),
  // THE STONE COURT (the basilisks) — petrification's own register:
  // grey stone under pale-green gaze-fire. The gaze is the golems'
  // STEEL earth lit by the eyes (cage motif — a hold you were warned
  // about, rock debris, the cracked-ground decal); the spit is fen
  // rot on the verdant brand; the mantle is the same stone turned
  // inward, spikes rising off a body going to rock.
  stone_gaze: STEEL({ mid: '#b9d18c', deep: '#4c5142', spark: '#dff0b0', glow: '150, 176, 108', ring: 'shards', debris: 'rock', decal: 'cracks', motif: 'cage', punch: 0.55, wash: 0.4 }),
  mire_spit: VERDANT({ mid: '#7a8b4f', deep: '#39432a', ring: 'shards', debris: 'spark', decal: 'stain', motif: 'wave', punch: 0.35, wash: 0.3 }),
  stone_mantle: STEEL({ mid: '#8f8a76', deep: '#46443a', spark: '#d8d2b4', ring: 'halo', debris: 'rock', decal: 'cracks', motif: 'spikes', punch: 0.5, wash: 0.35 }),
  // THE SKRAL (docs/skral-plan.md) — the same cold harbor family in a
  // kelp-green register: the lash is thin quick water (light punch,
  // whip spray), the riptide is the crab's TIDE turned undertow (halo
  // ring — a ring you should not be inside — with the drag's stain),
  // and the croak is the ECHO family spoken in brine: rings out of a
  // throat, not a spell, gurgle-green over deep water.
  tide_lash: TIDE({ mid: '#6fa8a0', deep: '#24443e', ring: 'shards', debris: 'ice', decal: 'stain', motif: 'wave', punch: 0.35, wash: 0.3 }),
  riptide_ring: TIDE({ mid: '#54889c', deep: '#1e3a48', ring: 'halo', debris: 'ice', decal: 'stain', motif: 'vortex', punch: 0.6, wash: 0.45 }),
  shoal_call: TIDE({ mid: '#7c9c8a', deep: '#28443c', spark: '#d8ecdf', ring: 'halo', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.6, wash: 0.32 }),
  // THE BRINE CROWNS (docs/boss-system-plan.md) — the boss words wear
  // the same cold family a register DEEPER. The tidelord's four: the
  // surge is standing floodwater (wave crests over the heaviest tide
  // stain), the jet is trench water at pressure (a TEAR — the deep
  // slit open, not a spell drawn), the court is the croak grown a
  // CAGE of spear-shafts on its rim, and the geyser is the pool gone
  // vertical (pillar, frost-ringed). The deepmaw's four: the rush is
  // a clean bow-wave with no lingering mark (water that ARRIVES), the
  // snap is teeth-and-bone with the cracked-guard decal (the sunder
  // made visible), the spray is the one rot in the dialect (kelp-bile
  // olive, gobbets raining), and the breach is the family's loudest
  // word — a quake wearing spray, punch near the ceiling.
  drowning_surge: TIDE({ mid: '#4a7ea0', deep: '#1c3a50', ring: 'halo', debris: 'ice', decal: 'stain', motif: 'wave', punch: 0.5, wash: 0.5 }),
  abyssal_jet: TIDE({ mid: '#3a6a8c', deep: '#132c40', spark: '#bfe6ee', ring: 'shards', debris: 'ice', decal: 'stain', motif: 'tear', punch: 0.7, wash: 0.4 }),
  court_of_spears: TIDE({ mid: '#6a8ea8', deep: '#24404e', spark: '#d8ecdf', ring: 'halo', debris: 'spark', decal: undefined, motif: 'cage', punch: 0.6, wash: 0.35 }),
  kingspool_geyser: TIDE({ mid: '#7ab8c4', deep: '#2a4e58', ring: 'frost', debris: 'ice', decal: 'stain', motif: 'pillar', punch: 0.65, wash: 0.5 }),
  shallows_rush: TIDE({ mid: '#7e9a8c', deep: '#2c4038', ring: 'shards', debris: 'ice', decal: undefined, motif: 'wave', punch: 0.45, wash: 0.3 }),
  gullet_snap: TIDE({ mid: '#9ab0a0', deep: '#324438', spark: '#e6e8da', ring: 'teeth', debris: 'bone', decal: 'cracks', punch: 0.75, wash: 0.35 }),
  gorge_spray: TIDE({ mid: '#8a9a5c', deep: '#3a4424', spark: '#cfd89a', glow: '150, 160, 90', ring: 'petals', debris: 'leaf', decal: 'stain', motif: 'rain', punch: 0.45, wash: 0.3 }),
  breaching_crash: TIDE({ mid: '#647e6e', deep: '#22342a', spark: '#d8ecdf', ring: 'teeth', debris: 'ice', decal: 'cracks', motif: 'quake', punch: 0.9, wash: 0.5 }),

  // ------------------- THE LEGION (docs/hobgoblin-plan.md): iron and
  // flame with DISCIPLINE in it. The brand is the EMBER family spoken
  // through a forge — struck-metal shards and smithy sparks, never the
  // goblin's loose fire; the ring cracks the ground with banked
  // furnace light; and the horn is not fire at all — brass rings
  // rolling out of one long note, the officer's word made weather.
  iron_brand: EMBER({ mid: '#e08a3c', spark: '#ffe2a4', ring: 'shards', debris: 'spark', decal: 'scorch', punch: 0.45 }),
  forge_ring: EMBER({ mid: '#c25c2e', deep: '#5c2410', ring: 'teeth', debris: 'ember', decal: 'scorch', motif: 'quake', punch: 0.65, wash: 0.55 }),
  warlord_horn: GOLD({ mid: '#c09a44', deep: '#6a4e1a', spark: '#ffe8b0', ring: 'halo', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.6, wash: 0.35 }),

  // ------------- THE SAND AND THE ROAR (arena ceremony, docs/arena-plan.md)
  // Three house moments, not abilities: the gates speak iron over the
  // sand's banner-gold, the laurel and the purse speak the crowd's
  // own gold whole. Faces registered so the signature contract holds
  // (an orphan ceremony key is the same silent debt as an orphan art).
  'arena:gates': STEEL({ mid: '#8d8a96', deep: '#3a3644', spark: '#e8b74a', ring: 'teeth', debris: 'rock', decal: undefined, motif: 'quake', punch: 0.5, wash: 0.3 }),
  'arena:victory': GOLD({ mid: '#e8b74a', deep: '#8a6534', spark: '#f4d98c', ring: 'petals', debris: 'star', decal: undefined, motif: 'crown', punch: 0.7, wash: 0.55 }),
  'arena:purse': GOLD({ mid: '#c98f2e', deep: '#6a4e1a', spark: '#f4d98c', ring: 'halo', debris: 'spark', decal: undefined, motif: 'rays', punch: 0.35, wash: 0.3 }),

  // ------------------- THE EARTH STANDS UP (golem arts, docs/golems-plan.md)
  // Four constructs, four material voices: the rock arts speak dry
  // hillstone (earthed STEEL, dust-pale sparks), the iron arts forged
  // plate with the one brass accent, the fire arts the banked furnace,
  // the ice arts old glacier blue. Heavy punches everywhere — a golem
  // never taps.
  hillstone_throw: STEEL({ mid: '#8a8164', deep: '#4e463c', spark: '#d8ccb0', glow: '160, 148, 110', ring: 'shards', debris: 'rock', decal: 'cracks', punch: 0.6, wash: 0.35 }),
  quarry_ring: STEEL({ mid: '#9a8f72', deep: '#544a38', spark: '#d8ccb0', glow: '160, 148, 110', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'quake', punch: 0.7, wash: 0.4 }),
  anvil_fall: STEEL({ mid: '#aab2c0', ring: 'teeth', debris: 'spark', decal: 'cracks', motif: 'quake', punch: 0.85, wash: 0.45 }),
  drawn_bolt: STEEL({ mid: '#c8b06a', spark: '#ffe8a0', ring: 'shards', debris: 'spark', decal: undefined, punch: 0.55, wash: 0.3 }),
  slag_gobbet: EMBER({ mid: '#ff7a2e', ring: 'teeth', debris: 'ember', decal: 'scorch', punch: 0.5, wash: 0.5 }),
  vent_ring: EMBER({ mid: '#d84c1e', ring: 'teeth', debris: 'ember', decal: 'scorch', motif: 'pillar', punch: 0.75, wash: 0.55 }),
  crust_burst: EMBER({ mid: '#ffb03a', ring: 'halo', debris: 'rock', decal: 'scorch', motif: 'wave', punch: 0.9, wash: 0.65 }),
  calving_volley: FROST({ mid: '#9ad4e8', ring: 'shards', debris: 'ice', decal: 'rime', punch: 0.45, wash: 0.35 }),
  winters_floor: FROST({ mid: '#7ab8d8', ring: 'frost', debris: 'ice', decal: 'rime', motif: 'spikes', punch: 0.6, wash: 0.45 }),

  // ------------------- THE HILL COMES DOWN (ogre arts, docs/ogres-plan.md)
  // The giant-kin speak OLD HIDE AND HILL-EARTH: tallow and dun
  // steels, thrown rock everywhere, and punches near the ceiling —
  // when a giant speaks, the ground repeats it. Only the meal is soft.
  skull_toll: STEEL({ mid: '#b3985e', deep: '#5c4c2e', spark: '#ecdcae', glow: '178, 152, 96', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'quake', punch: 0.8, wash: 0.45 }),
  ogre_tantrum: STEEL({ mid: '#a4552e', deep: '#5a2c18', spark: '#e8b48a', glow: '164, 92, 52', ring: 'shards', debris: 'rock', decal: 'cracks', motif: 'wave', punch: 0.75, wash: 0.4 }),
  millstone_toss: STEEL({ mid: '#8f8672', deep: '#4c463a', spark: '#d8d0ba', glow: '146, 136, 112', ring: 'shards', debris: 'rock', decal: 'cracks', punch: 0.6, wash: 0.35 }),
  gravel_rake: STEEL({ mid: '#9a8a68', deep: '#54492f', spark: '#d8c8a0', glow: '150, 136, 100', ring: 'shards', debris: 'rock', decal: undefined, punch: 0.4, wash: 0.25 }),
  hill_bellow: STEEL({ mid: '#7e7f74', deep: '#3e4038', spark: '#c8cabb', glow: '128, 130, 118', ring: 'halo', debris: 'rock', decal: undefined, motif: 'echo', punch: 0.7, wash: 0.4 }),
  shaken_stones: STEEL({ mid: '#7d7154', deep: '#403a28', spark: '#cfc4a2', glow: '128, 116, 86', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'rain', punch: 0.65, wash: 0.4 }),
  haunch_gnaw: BLOOD({ mid: '#a4763e', deep: '#5a3a1e', spark: '#e8c89a', glow: '164, 120, 66', ring: 'halo', debris: 'blood', decal: 'stain', punch: 0.15, wash: 0.2 }),

  // ---------------------------------------------------- beastcraft arts
  // THE KEEPER'S TONGUE — the school speaks LIVING GREEN AND HIDE:
  // bond-greens, herb and grain, one russet howl and one horn-gold
  // cry. Nothing here detonates; the punches stay near the floor and
  // the washes stay soft — these are words, not blows. Every face
  // keeps a unique ring+debris+motif hand within the family.
  gentle_the_wild: VERDANT({ mid: '#9fd39a', deep: '#4a6e46', spark: '#e8ffe0', ring: 'petals', debris: 'leaf', decal: undefined, motif: 'wisps', punch: 0.1, wash: 0.3 }),
  // Soothe the Wild — the breath let out: pale sage, a soft halo, no
  // motif of its own (the signature's closing ring IS the word).
  // THE GREEN ARTS (farming): the land's own quiet palette — furrow
  // greens, fencepost browns, one gold season. Punch stays low; the
  // school grows, it never strikes.
  sowers_step: VERDANT({ mid: '#79a355', deep: '#4a6a34', spark: '#e8f5d8', ring: 'halo', debris: 'leaf', decal: undefined, punch: 0, wash: 0.18 }),
  gardeners_mend: VERDANT({ mid: '#7ac46a', deep: '#3e6a3a', spark: '#f0ffe8', ring: 'petals', debris: 'leaf', decal: undefined, punch: 0, wash: 0.24 }),
  earthen_brace: VERDANT({ mid: '#8a6a45', deep: '#54432c', spark: '#d8c9a0', ring: 'halo', debris: 'spark', decal: undefined, punch: 0.08, wash: 0.2 }),
  hearthkeepers_calm: VERDANT({ mid: '#c9a86a', deep: '#6e5433', spark: '#f4ead0', ring: 'halo', debris: 'spark', decal: undefined, punch: 0, wash: 0.22 }),
  quickening_touch: VERDANT({ mid: '#e8c04c', deep: '#79a355', spark: '#fff4c8', ring: 'petals', debris: 'leaf', decal: undefined, motif: 'echo', punch: 0.1, wash: 0.26 }),
  soothe_the_wild: VERDANT({ mid: '#b8dcc0', deep: '#4a6a54', spark: '#f0fff0', ring: 'halo', debris: 'leaf', decal: undefined, punch: 0, wash: 0.2 }),
  // Come to Heel — the road folded shut: heel-green echo rings.
  come_to_heel: VERDANT({ mid: '#8fc7a4', deep: '#3e6450', spark: '#e0f8ea', ring: 'petals', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.1, wash: 0.2 }),
  // Point the Fang — blood warmed, not spilled: fang amber, a darting
  // swarm over bared teeth.
  point_the_fang: EMBER({ mid: '#d98a5a', deep: '#7a4630', spark: '#ffe0c0', ring: 'teeth', debris: 'spark', decal: undefined, motif: 'swarm', punch: 0.3, wash: 0.25 }),
  // Keeper's Balm — crushed herb unfurling where it lands.
  keepers_balm: VERDANT({ mid: '#a8d978', deep: '#4a6a2e', spark: '#f0ffd8', ring: 'petals', debris: 'leaf', decal: 'stain', motif: 'bloom', punch: 0.1, wash: 0.25 }),
  // Strewn Bait — grain and drippings scattered from the hand.
  strewn_bait: fx('#fff8e0', '#c4a35a', '#6a5426', '#e8d8a0', '200, 170, 100', 'shards', 'leaf', undefined, 0.1, 'rain'),
  // The Quiet Walk — dawn mist through pines, wisps at the heel.
  the_quiet_walk: VERDANT({ mid: '#9ab8a0', deep: '#3c5044', spark: '#d8e8dc', ring: 'halo', debris: 'leaf', decal: undefined, motif: 'wisps', punch: 0, wash: 0.12 }),
  // Blood of the Pack — the shared howl: pack russet, a breaking wave.
  blood_of_the_pack: BLOOD({ mid: '#c46a4a', deep: '#5c2c20', spark: '#ffcaa8', ring: 'teeth', debris: 'blood', decal: undefined, motif: 'wave', punch: 0.35, wash: 0.3 }),
  // The Keeper's Cry — horn gold; the rise is a pillar, not a blast.
  the_keepers_cry: GOLD({ mid: '#e8d8a0', deep: '#8a7440', spark: '#fffbe8', ring: 'halo', debris: 'star', decal: undefined, motif: 'pillar', punch: 0.3, wash: 0.4 }),
  // Voice of the Wild — the whole tongue: deep wildsong green, rings
  // that keep answering, roots left where the word passed.
  voice_of_the_wild: VERDANT({ mid: '#7ac4a0', deep: '#2c5a48', spark: '#eafff4', ring: 'petals', debris: 'leaf', decal: 'roots', motif: 'echo', punch: 0.5, wash: 0.45 }),

  // ------------- THE FANG FINDS ITS VOICE (docs/pet-arts-plan.md):
  // the companion's own actives. Each family keeps a dialect — gutter
  // browns and plague greens for the skitterkin, tide-steel for the
  // shellbacks, loam and iron for the tuskers, russet and winter-blue
  // for the canids, snow for the cats and the owl, venom green for
  // the adder, pale silk for the weaver — and every face keeps a
  // unique ring+debris+motif hand. Punches stay animal-sized: these
  // are teeth and hide, never spellfire.
  nip_and_dart: SHADOW({ mid: '#b8a888', deep: '#5c5040', spark: '#e8dcc8', ring: 'teeth', debris: 'spark', decal: undefined, punch: 0.15, wash: 0.15 }),
  plague_gnaw: VERDANT({ mid: '#8fb04a', deep: '#465a24', spark: '#d8ecb0', ring: 'teeth', debris: 'blood', decal: 'stain', punch: 0.2, wash: 0.2 }),
  the_rats_hour: VERDANT({ mid: '#8fa050', deep: '#3e4a22', spark: '#e0e8b8', ring: 'teeth', debris: 'blood', decal: 'stain', motif: 'swarm', punch: 0.4, wash: 0.3 }),
  echo_shriek: STORM({ mid: '#9a8ec4', deep: '#463e6a', spark: '#e0d8f4', ring: 'halo', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.25, wash: 0.2 }),
  the_dark_descent: SHADOW({ mid: '#6a5a8c', deep: '#302846', spark: '#c0b0e0', ring: 'shards', debris: 'shadow', decal: undefined, motif: 'wisps', punch: 0.35, wash: 0.15 }),
  set_the_shell: STEEL({ mid: '#8a92a0', deep: '#464c56', spark: '#d8dce4', ring: 'halo', debris: 'rock', decal: undefined, motif: 'cage', punch: 0.1, wash: 0.15 }),
  clatter_challenge: GOLD({ mid: '#c9b45e', deep: '#6a5c2a', spark: '#f4ecc0', ring: 'teeth', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.3, wash: 0.25 }),
  horn_toss: VERDANT({ mid: '#7a8a6a', deep: '#3c4632', spark: '#d0dcc0', ring: 'shards', debris: 'rock', decal: undefined, punch: 0.3, wash: 0.2 }),
  tide_grip: TIDE({ mid: '#5a9aa8', deep: '#2a4c54', spark: '#c8ecf0', ring: 'frost', debris: 'ice', decal: undefined, punch: 0.2, wash: 0.2 }),
  the_undertow: TIDE({ mid: '#3d7a8c', deep: '#1c3a44', spark: '#b0dce8', ring: 'frost', debris: 'ice', decal: 'rime', motif: 'vortex', punch: 0.45, wash: 0.35 }),
  the_standing_stone: STEEL({ mid: '#8a9282', deep: '#44483e', spark: '#d8dcd0', ring: 'runes', debris: 'rock', decal: 'cracks', motif: 'cage', punch: 0.4, wash: 0.3 }),
  riptide_claw: TIDE({ mid: '#4a8a9c', deep: '#22424c', spark: '#c0e4ec', ring: 'shards', debris: 'ice', decal: undefined, punch: 0.35, wash: 0.25 }),
  the_kings_pincer: BLOOD({ mid: '#c46a52', deep: '#5e2c20', spark: '#ffd0c0', ring: 'teeth', debris: 'ice', decal: undefined, motif: 'crown', punch: 0.5, wash: 0.3 }),
  gore_charge: BLOOD({ mid: '#a4744b', deep: '#523823', spark: '#e8cca8', ring: 'teeth', debris: 'rock', decal: 'cracks', punch: 0.35, wash: 0.25 }),
  tusk_sweep: STEEL({ mid: '#b08a5e', deep: '#58432c', spark: '#e8d4b8', ring: 'shards', debris: 'spark', decal: undefined, punch: 0.2, wash: 0.2 }),
  mud_wallow: VERDANT({ mid: '#8a6f4a', deep: '#443624', spark: '#d8c8a8', ring: 'halo', debris: 'leaf', decal: 'stain', punch: 0.1, wash: 0.2 }),
  the_long_furrow: EMBER({ mid: '#8c5a3a', deep: '#442b1a', spark: '#e0b890', ring: 'shards', debris: 'rock', decal: 'cracks', motif: 'quake', punch: 0.6, wash: 0.4 }),
  worry_the_wound: BLOOD({ mid: '#b85a40', deep: '#582a1e', spark: '#ffc8b0', ring: 'teeth', debris: 'blood', decal: 'stain', punch: 0.25, wash: 0.25 }),
  hamstring: FROST({ mid: '#7a9ab8', deep: '#3a4c5c', spark: '#d0e4f4', ring: 'teeth', debris: 'ice', decal: undefined, punch: 0.25, wash: 0.2 }),
  the_first_howl: EMBER({ mid: '#d9925a', deep: '#6e4326', spark: '#ffe4c8', ring: 'halo', debris: 'spark', decal: undefined, motif: 'wave', punch: 0.35, wash: 0.3 }),
  winters_jaw: FROST({ mid: '#9ac8e0', deep: '#48626e', spark: '#e0f4fc', ring: 'teeth', debris: 'ice', decal: 'rime', punch: 0.35, wash: 0.25 }),
  the_cowing_snarl: SHADOW({ mid: '#9ab0c4', deep: '#485564', spark: '#dce8f4', ring: 'runes', debris: 'shadow', decal: undefined, motif: 'echo', punch: 0.4, wash: 0.2 }),
  raking_flurry: BLOOD({ mid: '#c49a6a', deep: '#5e4630', spark: '#f4dcc0', ring: 'shards', debris: 'blood', decal: undefined, punch: 0.25, wash: 0.2 }),
  the_winter_stalk: FROST({ mid: '#a8c8d8', deep: '#4e6270', spark: '#e8f4fa', ring: 'shards', debris: 'ice', decal: 'rime', motif: 'echo', punch: 0.4, wash: 0.3 }),
  maul: BLOOD({ mid: '#8c6a4a', deep: '#443122', spark: '#e0c8a8', ring: 'teeth', debris: 'blood', decal: 'stain', punch: 0.45, wash: 0.3 }),
  the_charge: STEEL({ mid: '#a4845e', deep: '#52402c', spark: '#e8d8c0', ring: 'shards', debris: 'rock', decal: undefined, motif: 'wave', punch: 0.4, wash: 0.25 }),
  stand_tall: GOLD({ mid: '#c9a45e', deep: '#6a542a', spark: '#f4e8c8', ring: 'halo', debris: 'rock', decal: undefined, motif: 'pillar', punch: 0.5, wash: 0.35 }),
  talon_stoop: BONE({ mid: '#e0dccf', deep: '#6e6a5e', spark: '#fbf8f0', ring: 'halo', debris: 'spark', decal: undefined, punch: 0.3, wash: 0.2 }),
  hushing_wing: FROST({ mid: '#8ab8d8', deep: '#405a6e', spark: '#d8ecf8', ring: 'frost', debris: 'ice', decal: undefined, motif: 'wave', punch: 0.25, wash: 0.2 }),
  preen: BONE({ mid: '#e8e0d0', deep: '#736c5c', spark: '#fffcf4', ring: 'petals', debris: 'spark', decal: undefined, punch: 0.05, wash: 0.12 }),
  the_white_hush: FROST({ mid: '#c8dce8', deep: '#5c6c78', spark: '#f4fafd', ring: 'frost', debris: 'ice', decal: 'rime', motif: 'rain', punch: 0.4, wash: 0.35 }),
  venom_spit: VERDANT({ mid: '#9cb84e', deep: '#4c5c22', spark: '#e4f0c0', ring: 'halo', debris: 'leaf', decal: 'stain', punch: 0.2, wash: 0.2 }),
  coiled_strike: VERDANT({ mid: '#8fa04e', deep: '#464e20', spark: '#dfe8b4', ring: 'teeth', debris: 'spark', decal: undefined, punch: 0.3, wash: 0.2 }),
  shed_skin: VERDANT({ mid: '#c8c8a0', deep: '#62624a', spark: '#f4f4e0', ring: 'petals', debris: 'leaf', decal: undefined, motif: 'bloom', punch: 0.05, wash: 0.12 }),
  the_long_fang: VERDANT({ mid: '#6a9a42', deep: '#32491e', spark: '#d0ecb0', ring: 'teeth', debris: 'blood', decal: 'stain', motif: 'tear', punch: 0.45, wash: 0.3 }),
  pale_silk: BONE({ mid: '#f0f0e6', deep: '#787868', spark: '#ffffff', ring: 'runes', debris: 'spark', decal: undefined, motif: 'cage', punch: 0.05, wash: 0.12 }),
  the_venom_lattice: VERDANT({ mid: '#84c95e', deep: '#3c6428', spark: '#dcf8c8', ring: 'runes', debris: 'leaf', decal: 'stain', motif: 'cage', punch: 0.4, wash: 0.3 }),
  // THE STONE COURT AT HEEL (THE GAZE TAKES THE LEASH) — the family's
  // companion register keeps the wild court's voice: dull stone under
  // pale gaze-fire, marsh rot for the fen half. The tail is muscle
  // and thrown earth (no element — a body's own act); the mantle is
  // the elder's stone turned inward at heel; the mire is standing
  // water gone wrong; the pet gaze keeps the wild gaze's exact
  // pale-green fire so the field reads ONE species, two masters.
  tail_sweep: STEEL({ mid: '#8a8468', deep: '#403c2e', spark: '#d8d0ac', ring: 'teeth', debris: 'rock', decal: undefined, motif: 'wave', punch: 0.55, wash: 0.3 }),
  graven_mantle: STEEL({ mid: '#98927c', deep: '#48443a', spark: '#dcd6b8', ring: 'halo', debris: 'rock', decal: 'cracks', punch: 0.4, wash: 0.3 }),
  the_drowning_mire: VERDANT({ mid: '#5c6b3e', deep: '#2c3520', spark: '#a8bc74', ring: 'runes', debris: 'leaf', decal: 'stain', motif: 'vortex', punch: 0.35, wash: 0.35 }),
  the_graven_gaze: STEEL({ mid: '#b9d18c', deep: '#4c5142', spark: '#dff0b0', glow: '150, 176, 108', ring: 'shards', debris: 'rock', decal: 'cracks', motif: 'rays', punch: 0.5, wash: 0.35 }),

  // ------------------ THE TWENTY (docs/polearm-plan.md) — the polearm
  // school. The ladder speaks COLD STEEL, OILED ASH AND GOLD FITTINGS:
  // bright steel for the pierces, oiled wood and kicked dust for the
  // haft work, colder iron where the hook and the hafted blade bite,
  // pale picket steel for the braced walls, and the knight's gold for
  // the charge, the banner and the crown. No element anywhere — the
  // one exception is Stormpoint, whose called strike borrows STORM on
  // the FX side only. Every face keeps a unique ring+debris+motif hand.
  // Lunging Skewer — the opener: a thin bright line, nothing left behind.
  lunging_skewer: STEEL({ mid: '#c8d4e0', ring: 'shards', debris: 'spark', decal: undefined, punch: 0.4, wash: 0.25 }),
  // Haft Strike — the butt of the haft: oiled ash, the ground taking it.
  haft_strike: STEEL({ mid: '#9a7a52', deep: '#4e3a22', spark: '#e8d4b0', ring: 'teeth', debris: 'rock', decal: undefined, motif: 'quake', punch: 0.6, wash: 0.3 }),
  // Hooking Reap — the beak behind the knee: cold iron, an inward pull.
  hooking_reap: STEEL({ mid: '#6e7a86', deep: '#343c46', ring: 'shards', debris: 'blood', decal: 'stain', motif: 'vortex', punch: 0.45, wash: 0.25 }),
  // Vaulting Step — the planted haft: wood and kicked dust, one crest.
  vaulting_step: STEEL({ mid: '#b09468', deep: '#54432c', spark: '#f0e0c0', ring: 'petals', debris: 'rock', decal: undefined, motif: 'wave', punch: 0.35, wash: 0.2 }),
  // Perfect Thrust — one drawn line: blades of light down the reach.
  perfect_thrust: STEEL({ mid: '#e0e8f0', ring: 'shards', debris: 'spark', decal: 'cracks', motif: 'rays', punch: 0.6, wash: 0.3 }),
  // Flurry of Points — the multi-stab: needles too quick to count.
  flurry_of_points: STEEL({ mid: '#aebcc8', ring: 'shards', debris: 'spark', decal: undefined, motif: 'swarm', punch: 0.45, wash: 0.25 }),
  // Crescent Reap — the glaive's answer: one cold crest, the stain of it.
  crescent_reap: STEEL({ mid: '#7c8894', deep: '#3a444e', ring: 'petals', debris: 'blood', decal: 'stain', motif: 'wave', punch: 0.6, wash: 0.3 }),
  // Impaling Drive — the driven corridor: a seam torn down the line.
  impaling_drive: STEEL({ mid: '#9fb0c0', ring: 'teeth', debris: 'spark', decal: 'cracks', motif: 'tear', punch: 0.7, wash: 0.35 }),
  // Wall of Points — the braced pikes: a picket of points on the rim.
  wall_of_points: STEEL({ mid: '#8fa0b0', ring: 'teeth', debris: 'rock', decal: undefined, motif: 'spikes', punch: 0.4, wash: 0.3 }),
  // Knight's Charge — the run: gold arriving as a breaking crest.
  knights_charge: GOLD({ mid: '#e0b455', ring: 'teeth', debris: 'spark', decal: 'cracks', motif: 'wave', punch: 0.8, wash: 0.45 }),
  // Rampart Breaker — the armor opener: dust and steel, the ground splits.
  rampart_breaker: STEEL({ mid: '#a89078', deep: '#4e4234', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'quake', punch: 0.85, wash: 0.5 }),
  // Serpent's Tongue — the flicker: bright steel, ring after held ring.
  serpents_tongue: STEEL({ mid: '#d8e4ec', ring: 'shards', debris: 'spark', decal: undefined, motif: 'echo', punch: 0.5, wash: 0.28 }),
  // Skydriver Fall — point-first out of the air: weight raining down.
  skydriver_fall: STEEL({ mid: '#94a2ae', deep: '#424a54', ring: 'teeth', debris: 'rock', decal: 'cracks', motif: 'rain', punch: 0.75, wash: 0.4 }),
  // Banner Advance — the line moves: a column of held gold, no blow.
  banner_advance: GOLD({ mid: '#d8bc6a', ring: 'halo', debris: 'star', decal: 'glow', motif: 'pillar', punch: 0.3, wash: 0.4 }),
  // Moulinet Guard — the spinning haft: an inward-turning circle of grit.
  moulinet_guard: STEEL({ mid: '#c0a878', deep: '#5e5038', spark: '#f4e8c8', ring: 'petals', debris: 'spark', decal: undefined, motif: 'vortex', punch: 0.5, wash: 0.3 }),
  // Stormpoint — the called strike: the school's one borrowed element.
  stormpoint: STORM({ mid: '#b8cff0', deep: '#3c4c74', ring: 'teeth', debris: 'spark', decal: 'scorch', motif: 'pillar', punch: 0.85, wash: 0.55 }),
  // Gatebreaker — the execute: the coldest iron, the gate torn open.
  gatebreaker: STEEL({ mid: '#5e6a76', deep: '#2c343c', spark: '#dce6f0', ring: 'teeth', debris: 'blood', decal: 'stain', motif: 'tear', punch: 0.8, wash: 0.35 }),
  // Hold the Line — the anchor stance (the id wears the school's suffix:
  // the shield ladder took `hold_the_line` first): a rooted picket of
  // cold, bars of winter standing where nothing gets to walk.
  hold_the_line_polearm: STEEL({ mid: '#7e94a8', deep: '#39444e', ring: 'frost', debris: 'ice', decal: 'rime', motif: 'cage', punch: 0.45, wash: 0.3 }),
  // Sweeping Gyre — the full turn: wood and stone thrown off the rim.
  sweeping_gyre: STEEL({ mid: '#a89060', deep: '#50442a', spark: '#f0dcb0', ring: 'petals', debris: 'rock', decal: undefined, motif: 'vortex', punch: 0.6, wash: 0.3 }),
  // The Sundering Lance — the crown of the school: gold at full weight.
  sundering_lance: GOLD({ mid: '#f0d070', ring: 'teeth', debris: 'star', decal: 'cracks', motif: 'crown', punch: 1.0, wash: 0.6 }),

  // ------------------ THE ARMORY — the four arts the polearm WEAPONS
  // teach (the twenty above are the ladder's; these are the roster's).
  // Same school voice, same COLD STEEL AND OILED ASH: the founding
  // thrust is plain bright steel, the glaive's wheel is colder and
  // heavier than the ladder's reap, the halberd's hook bites iron and
  // leaves a chill, and the knight's short charge is the school's gold
  // spent one rung down from knights_charge.
  // Reaching Thrust — the founding lesson: full extension, nothing else.
  reaching_thrust: STEEL({ mid: '#cddae6', ring: 'shards', debris: 'spark', decal: undefined, motif: 'rays', punch: 0.35, wash: 0.22 }),
  // Reaper's Turn — the hafted blade's wheel: a cold crest that SHOVES.
  reapers_turn: STEEL({ mid: '#8c98a4', deep: '#414b55', ring: 'petals', debris: 'blood', decal: 'stain', motif: 'vortex', punch: 0.55, wash: 0.28 }),
  // Skullhook — the beak that hauls: cold iron in, and the cold stays.
  skullhook: STEEL({ mid: '#6a7c8a', deep: '#313c46', spark: '#dbe9f4', ring: 'frost', debris: 'blood', decal: 'rime', motif: 'vortex', punch: 0.5, wash: 0.26 }),
  // Couched Charge — the knight's short run: gold under the crown's.
  couched_charge: GOLD({ mid: '#d4ac52', ring: 'shards', debris: 'spark', decal: 'cracks', motif: 'wave', punch: 0.6, wash: 0.4 }),
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
