export * from './tilesEnum.js';
export * from './tilesDefs.js';
import { Detail, DYE_COUNT, Tile } from './tilesEnum.js';
import { AWNING_BASES, AWNING_SHAPES, TILE_DEFS, type AwningShape, type TileDef } from './tilesDefs.js';

/**
 * THE DYE LAW (exterior decor): shape is structure, color is dye — one
 * ten-dye roster shared by every dyeable piece, carried in the id band
 * (detail or tile) as `base + dye`. Index order is FOREVER (rename a
 * dye in place, never reorder — the affix-pool law). Player-facing
 * names live in content's DYES table, pinned to this count.
 */
/** Stride of every banded decor family — room for dyes yet unmixed. */
export const DETAIL_BAND = 16;
/** Carved trade motifs on the bracket sign, index order FOREVER. */
export const SIGN_MOTIF_COUNT = 8;
/** Climbing species on the trellis, index order FOREVER. */
export const TRELLIS_SPECIES_COUNT = 3;
/** Herb mixes potted on the window sill, index order FOREVER. */
export const SILL_MIX_COUNT = 3;
/** Bundle mixes tied to the drying batten, index order FOREVER. */
export const BUNDLE_MIX_COUNT = 3;
/**
 * Mounted-arms forms on the armory wall, index order FOREVER:
 * 0 sword & shield, 1 crossed axes, 2 the halberd, 3 the great crest.
 */
export const ARMS_FORM_COUNT = 4;
/**
 * Woven charges on the great cloth (banner + standing standard),
 * index order FOREVER: 0 the tower, 1 crossed swords, 2 the double
 * chevron, 3 the rayed sun. Authored cloth deals its charge by tile
 * hash; the count is here so every dealer draws from one deck.
 */
export const BANNER_EMBLEM_COUNT = 4;

export type WallHungKind =
  | 'crown'
  | 'moon'
  | 'tapestry'
  | 'banner'
  | 'pennant'
  | 'sign'
  | 'trellis'
  | 'basket'
  | 'sill'
  | 'bundles'
  | 'arms'
  | 'greatbanner'
  | 'drape';

export interface WallHungInfo {
  kind: WallHungKind;
  /** Dye index (banner/pennant/greatbanner/drape families). */
  dye?: number;
  /** Mounted-arms form index (wall arms). */
  form?: number;
  /** Trade-motif index (bracket sign). */
  motif?: number;
  /** Climbing-plant species index (trellis). */
  species?: number;
  /** Herb-mix index (sill pots / drying bundles). */
  mix?: number;
}

/**
 * Read any wall-hung detail id back to its family + variant. Null for
 * ground details and unused band slots — the one gate every consumer
 * (painters, build lane, editors) resolves through.
 */
export function wallHungInfo(d: number): WallHungInfo | null {
  switch (d) {
    case Detail.BannerCrown:
      return { kind: 'crown' };
    case Detail.BannerMoon:
      return { kind: 'moon' };
    case Detail.Tapestry:
      return { kind: 'tapestry' };
  }
  if (d >= Detail.WallBanner && d < Detail.WallBanner + DYE_COUNT)
    return { kind: 'banner', dye: d - Detail.WallBanner };
  if (d >= Detail.Pennant && d < Detail.Pennant + DYE_COUNT)
    return { kind: 'pennant', dye: d - Detail.Pennant };
  if (d >= Detail.BracketSign && d < Detail.BracketSign + SIGN_MOTIF_COUNT)
    return { kind: 'sign', motif: d - Detail.BracketSign };
  if (d >= Detail.Trellis && d < Detail.Trellis + TRELLIS_SPECIES_COUNT)
    return { kind: 'trellis', species: d - Detail.Trellis };
  if (d === Detail.WallBasket) return { kind: 'basket' };
  if (d >= Detail.SillHerbs && d < Detail.SillHerbs + SILL_MIX_COUNT)
    return { kind: 'sill', mix: d - Detail.SillHerbs };
  if (d >= Detail.HerbBundles && d < Detail.HerbBundles + BUNDLE_MIX_COUNT)
    return { kind: 'bundles', mix: d - Detail.HerbBundles };
  if (d >= Detail.WallArms && d < Detail.WallArms + ARMS_FORM_COUNT)
    return { kind: 'arms', form: d - Detail.WallArms };
  if (d >= Detail.GreatBanner && d < Detail.GreatBanner + DYE_COUNT)
    return { kind: 'greatbanner', dye: d - Detail.GreatBanner };
  if (d >= Detail.DrapeFall && d < Detail.DrapeFall + DYE_COUNT)
    return { kind: 'drape', dye: d - Detail.DrapeFall };
  return null;
}

/** The banner detail wearing this dye (validated — bad dye throws). */
export function wallBannerDetail(dye: number): Detail {
  if (!Number.isInteger(dye) || dye < 0 || dye >= DYE_COUNT) throw new Error(`bad dye ${dye}`);
  return Detail.WallBanner + dye;
}

/** The pennant-string detail wearing this dye. */
export function pennantDetail(dye: number): Detail {
  if (!Number.isInteger(dye) || dye < 0 || dye >= DYE_COUNT) throw new Error(`bad dye ${dye}`);
  return Detail.Pennant + dye;
}

/** The bracket sign carrying this trade motif. */
export function bracketSignDetail(motif: number): Detail {
  if (!Number.isInteger(motif) || motif < 0 || motif >= SIGN_MOTIF_COUNT)
    throw new Error(`bad motif ${motif}`);
  return Detail.BracketSign + motif;
}

/** The trellis growing this climbing species. */
export function trellisDetail(species: number): Detail {
  if (!Number.isInteger(species) || species < 0 || species >= TRELLIS_SPECIES_COUNT)
    throw new Error(`bad species ${species}`);
  return Detail.Trellis + species;
}

/** The sill pots growing this herb mix. */
export function sillHerbsDetail(mix: number): Detail {
  if (!Number.isInteger(mix) || mix < 0 || mix >= SILL_MIX_COUNT)
    throw new Error(`bad mix ${mix}`);
  return Detail.SillHerbs + mix;
}

/** The drying batten tied with this bundle mix. */
export function herbBundlesDetail(mix: number): Detail {
  if (!Number.isInteger(mix) || mix < 0 || mix >= BUNDLE_MIX_COUNT)
    throw new Error(`bad mix ${mix}`);
  return Detail.HerbBundles + mix;
}

/** The mounted arms wearing this form. */
export function wallArmsDetail(form: number): Detail {
  if (!Number.isInteger(form) || form < 0 || form >= ARMS_FORM_COUNT)
    throw new Error(`bad form ${form}`);
  return Detail.WallArms + form;
}

/** The great hall banner wearing this dye. */
export function greatBannerDetail(dye: number): Detail {
  if (!Number.isInteger(dye) || dye < 0 || dye >= DYE_COUNT) throw new Error(`bad dye ${dye}`);
  return Detail.GreatBanner + dye;
}

/** The floor-length drape wearing this dye. */
export function drapeFallDetail(dye: number): Detail {
  if (!Number.isInteger(dye) || dye < 0 || dye >= DYE_COUNT) throw new Error(`bad dye ${dye}`);
  return Detail.DrapeFall + dye;
}

/** Read a dyed banner stand back to its dye; null for everything else. */
export function bannerStandInfo(t: number): { dye: number } | null {
  if (t >= Tile.BannerStand && t < Tile.BannerStand + DYE_COUNT)
    return { dye: t - Tile.BannerStand };
  return null;
}

/** The standing banner frame flying this dye. */
export function bannerStandTile(dye: number): Tile {
  if (!Number.isInteger(dye) || dye < 0 || dye >= DYE_COUNT) throw new Error(`bad dye ${dye}`);
  return Tile.BannerStand + dye;
}

/**
 * Details that hang on wall faces instead of lying on the ground —
 * the terrain bake skips them; wall painters own their art. Built
 * from wallHungInfo so the set and the reader can never disagree.
 */
export const WALL_HUNG_DETAILS: ReadonlySet<Detail> = new Set(
  Array.from({ length: 256 }, (_, d) => d).filter((d) => wallHungInfo(d) !== null),
) as ReadonlySet<Detail>;

/**
 * THE HANGING LAW's footing: only walls whose painters actually dress
 * a south face may carry a hanging — plain full walls (wallItem) and
 * the garrison curtain. Doorways, window walls, and 45° corners are
 * wall-run members whose painters never call the hangings pass, so a
 * detail written there would be INVISIBLE orphan state; the build
 * lane refuses them here, at the one shared gate.
 */
export const HANGABLE_WALL_TILES: ReadonlySet<Tile> = new Set([
  Tile.WallStone,
  Tile.WallWood,
  Tile.CaveWall,
  Tile.CrackedCaveWall,
  Tile.WallGarrison,
]);

/**
 * THE SILL LAW: the herb pots are the ONE hanging that lives on
 * glazed walls — they stand on the sill course the window painters
 * already dress. The classic hangable set (whose bare faces would
 * leave the pots floating) refuses them, and the window walls, which
 * refuse everything else, are exactly their home.
 */
export const SILL_HOST_TILES: ReadonlySet<Tile> = new Set([
  Tile.WallStoneWindow,
  Tile.WallWoodWindow,
]);

/**
 * The ONE host resolver for any wall-hung detail — the build lane,
 * the dev lever, and both client previews all read through this, so
 * the sill exception can never drift out of step with the law.
 */
export function hangHostTiles(detail: number): ReadonlySet<Tile> {
  return wallHungInfo(detail)?.kind === 'sill' ? SILL_HOST_TILES : HANGABLE_WALL_TILES;
}

/**
 * Walls an awning may bolt to (the tile NORTH of the awning): full
 * building walls, glazed walls, and straight doorways — every classic
 * shopfront host presents a framed south face for the brackets. 45°
 * corners never host (no full south face to bolt into), and the
 * garrison curtain keeps its martial bareness.
 */
export const AWNING_HOST_TILES: ReadonlySet<Tile> = new Set([
  Tile.WallStone,
  Tile.WallWood,
  Tile.WallStoneWindow,
  Tile.WallWoodWindow,
  Tile.DoorwayStone,
  Tile.DoorwayWood,
  Tile.DoorwayStoneWide,
  Tile.DoorwayWoodWide,
  Tile.DoorwayStoneShut,
  Tile.DoorwayWoodShut,
  Tile.DoorwayStoneWideShut,
  Tile.DoorwayWoodWideShut,
]);


export interface AwningInfo {
  shape: AwningShape;
  /** Index into AWNING_SHAPES — the buildable/painter family key. */
  shapeIndex: number;
  /** Index into the shared dye roster (THE DYE LAW). */
  dye: number;
}

/** Read any awning tile back to {shape, dye}; null for everything else. */
export function awningInfo(t: number): AwningInfo | null {
  for (let i = 0; i < AWNING_BASES.length; i++) {
    const base = AWNING_BASES[i]!;
    if (t >= base && t < base + DYE_COUNT)
      return { shape: AWNING_SHAPES[i]!, shapeIndex: i, dye: t - base };
  }
  return null;
}

/** The tile of this shape wearing this dye (validated — bad input throws). */
export function awningTile(shape: AwningShape, dye: number): Tile {
  const i = AWNING_SHAPES.indexOf(shape);
  if (i < 0) throw new Error(`bad awning shape ${shape}`);
  if (!Number.isInteger(dye) || dye < 0 || dye >= DYE_COUNT) throw new Error(`bad dye ${dye}`);
  return AWNING_BASES[i]! + dye;
}

/** Read a dyed banner pole back to its dye; null for everything else. */
export function bannerPoleInfo(t: number): { dye: number } | null {
  if (t >= Tile.BannerPoleDyed && t < Tile.BannerPoleDyed + DYE_COUNT)
    return { dye: t - Tile.BannerPoleDyed };
  return null;
}

/** The dyed pole tile for this dye (validated — bad dye throws). */
export function bannerPoleTile(dye: number): Tile {
  if (!Number.isInteger(dye) || dye < 0 || dye >= DYE_COUNT) throw new Error(`bad dye ${dye}`);
  return Tile.BannerPoleDyed + dye;
}

/** Every awning id, all shapes and dyes — palette/test sweeps. */
export const AWNING_TILES: ReadonlySet<Tile> = new Set(
  AWNING_BASES.flatMap((base) => Array.from({ length: DYE_COUNT }, (_, dye) => base + dye)),
) as ReadonlySet<Tile>;

// Dye 1..9 defs derive from their shape's anchor — same physics, same
// silhouette; the painter reads the dye, the def only names the shape.
for (const base of AWNING_BASES) {
  const anchor = TILE_DEFS[base]!;
  for (let dye = 1; dye < DYE_COUNT; dye++) {
    (TILE_DEFS as Record<number, TileDef>)[base + dye] = anchor;
  }
}
for (let dye = 1; dye < DYE_COUNT; dye++) {
  (TILE_DEFS as Record<number, TileDef>)[Tile.BannerPoleDyed + dye] =
    TILE_DEFS[Tile.BannerPoleDyed]!;
}

/**
 * Tiles that merge into continuous wall runs for the renderer's
 * auto-tiler: solid walls, windowed walls, and walkable doorways all
 * join the same mass so a building reads as one structure.
 */
export const WALL_RUN_TILES: readonly Tile[] = [
  Tile.WallStone,
  Tile.WallWood,
  Tile.CaveWall,
  Tile.CrackedCaveWall,
  Tile.WallStoneWindow,
  Tile.WallWoodWindow,
  Tile.DoorwayStone,
  Tile.DoorwayWood,
  Tile.DoorwayStoneWide,
  Tile.DoorwayWoodWide,
  Tile.DoorwayStoneShut,
  Tile.DoorwayWoodShut,
  Tile.DoorwayStoneWideShut,
  Tile.DoorwayWoodWideShut,
  Tile.WallStoneDiagNE,
  Tile.WallStoneDiagNW,
  Tile.WallStoneDiagSE,
  Tile.WallStoneDiagSW,
  Tile.WallWoodDiagNE,
  Tile.WallWoodDiagNW,
  Tile.WallWoodDiagSE,
  Tile.WallWoodDiagSW,
];

/** Which triangle of a 45° wall tile holds the mass. */
export type DiagWallMass = 'NE' | 'NW' | 'SE' | 'SW';

/** The three wall constructions that can turn a 45° corner. */
export type DiagWallMaterial = 'stone' | 'wood' | 'garrison';

const DIAG_WALL_INFO = new Map<Tile, { material: DiagWallMaterial; mass: DiagWallMass }>([
  [Tile.WallStoneDiagNE, { material: 'stone', mass: 'NE' }],
  [Tile.WallStoneDiagNW, { material: 'stone', mass: 'NW' }],
  [Tile.WallStoneDiagSE, { material: 'stone', mass: 'SE' }],
  [Tile.WallStoneDiagSW, { material: 'stone', mass: 'SW' }],
  [Tile.WallWoodDiagNE, { material: 'wood', mass: 'NE' }],
  [Tile.WallWoodDiagNW, { material: 'wood', mass: 'NW' }],
  [Tile.WallWoodDiagSE, { material: 'wood', mass: 'SE' }],
  [Tile.WallWoodDiagSW, { material: 'wood', mass: 'SW' }],
  [Tile.WallGarrisonDiagNE, { material: 'garrison', mass: 'NE' }],
  [Tile.WallGarrisonDiagNW, { material: 'garrison', mass: 'NW' }],
  [Tile.WallGarrisonDiagSE, { material: 'garrison', mass: 'SE' }],
  [Tile.WallGarrisonDiagSW, { material: 'garrison', mass: 'SW' }],
]);

/** All 45° wall tiles, every material. */
export const DIAG_WALL_TILES: ReadonlySet<Tile> = new Set(DIAG_WALL_INFO.keys());

/** Material + mass triangle of a 45° wall tile, or null. */
export function diagWallInfo(
  id: number,
): { material: DiagWallMaterial; mass: DiagWallMass } | null {
  return DIAG_WALL_INFO.get(id as Tile) ?? null;
}

/**
 * The 45° wall tile for a material + mass — the inverse of
 * diagWallInfo, and the door THE TRUE GHOST's explicit rotation walks
 * through: the player's chosen orient resolves here on both ends of
 * the wire, so the ghost's triangle IS the tile that lands.
 */
export function diagWallTile(material: DiagWallMaterial, mass: DiagWallMass): Tile {
  for (const [tile, info] of DIAG_WALL_INFO) {
    if (info.material === material && info.mass === mass) return tile;
  }
  return material === 'stone'
    ? Tile.WallStoneDiagNE
    : material === 'garrison'
      ? Tile.WallGarrisonDiagNE
      : Tile.WallWoodDiagNE;
}

/**
 * AUTO-ORIENT LAW: a diagonal wall spans the corner between the two
 * perpendicular wall neighbours present at placement time — N+E cuts
 * a SW corner, and so on. With no unambiguous pair it defaults to NE;
 * build the adjoining walls first, then the corner.
 */
export function orientDiagWall(
  material: DiagWallMaterial,
  n: boolean,
  e: boolean,
  s: boolean,
  w: boolean,
): Tile {
  const mass: DiagWallMass =
    n && e ? 'NE' : n && w ? 'NW' : s && e ? 'SE' : s && w ? 'SW' : 'NE';
  return diagWallTile(material, mass);
}

/**
 * THE GARRISON FAMILY — every tile of the fortification dialect:
 * straight curtain runs, the four 45° turns, and the gate in both
 * postures. THE SEPARATE-MASONRY LAW: garrison runs merge only with
 * this set — a curtain wall never joins a building's wall run (two
 * constructions abutting show two honest ends), and it never bounds
 * an interior region (a walled bailey is open sky, not a room). Run
 * connectivity, the renderer's rampart auto-tiler, and the build
 * auto-orient all key off this one set.
 */
export const GARRISON_TILES: ReadonlySet<Tile> = new Set([
  Tile.WallGarrison,
  Tile.WallGarrisonDiagNE,
  Tile.WallGarrisonDiagNW,
  Tile.WallGarrisonDiagSE,
  Tile.WallGarrisonDiagSW,
  Tile.GateGarrison,
  Tile.GateGarrisonShut,
]);

/**
 * Tiles that bound an interior region (the room enclosure test).
 * Doorways count — a doorway-closed ring encloses. Arches and
 * railings deliberately do NOT: a colonnade plaza is never a room.
 */
export const INTERIOR_BOUNDARY_TILES: readonly Tile[] = [...WALL_RUN_TILES];

/**
 * Tiles that stop lamplight in the lightmap. Doorways and arches let
 * light spill through openings; windows block (their glow is faked
 * with placed emitters instead).
 */
export const LIGHT_BLOCKING_TILES: readonly Tile[] = [
  Tile.WallStone,
  Tile.WallWood,
  Tile.CaveWall,
  Tile.CrackedCaveWall,
  Tile.WallStoneWindow,
  Tile.WallWoodWindow,
  Tile.PillarStone,
  // The grand pillar is the underworld's PillarStone: a column of
  // real girth throws a real shadow.
  Tile.GrandPillar,
  ...DIAG_WALL_TILES,
  // A shut leaf stops lamplight; the open doorway spills it.
  Tile.DoorwayStoneShut,
  Tile.DoorwayWoodShut,
  Tile.DoorwayStoneWideShut,
  Tile.DoorwayWoodWideShut,
  // The curtain wall throws the longest shadow in town; an open gate
  // spills torchlight through the passage, a shut one seals it.
  Tile.WallGarrison,
  Tile.GateGarrisonShut,
  // Head-high sharpened logs: a war camp's wall hides what it guards.
  // The open gate spills firelight; the barred one seals it.
  Tile.Palisade,
  Tile.PalisadeDiagNE,
  Tile.PalisadeDiagNW,
  Tile.PalisadeGateShut,
  // THE WAIST LAW: the hedgerow runs hip-high — lamplight clears a
  // clipped cushion bed the way it clears a fence, so NO hedge tile
  // blocks. The gate lost its towering arch (round four: a 1.4-tile
  // span over a 0.5-tile hedge read wildly out of scale) — a shut
  // waist-high timber wicket no more stops lamplight than the
  // hedgerow beside it.
  // THE SCARRED LAND: the chimney is the ONE piece of the kit tall
  // and massed enough to stop lamplight — a masonry column a head
  // and a half over the rig. The stone ruin wall is a waist- to
  // chest-high tumble (lamplight clears it like a fence); the timber
  // ruin wall is an OPEN frame — rig-tall charred studs on a sill
  // with the wall between them burnt away, so lamplight passes
  // between the studs the way it passes a fence's pales (the
  // palisade's opposite: that is a closed line of logs); the dead
  // tree is a trunk-mass ('cover', by collider radius), and nothing
  // else in the kit is architecture.
  Tile.ChimneyStack,
];

/**
 * DOOR LAW — the tile is the state. Every doorway tile maps to its
 * material, width, and posture; `shutDoorTile`/`openDoorTile` are the
 * two halves of the toggle. Frame material tracks the wall it pierces
 * (the leaf itself is always timber — stone shells hang oak doors).
 * Material 'fence' is the waist-high field gate: it rides ALL the
 * door machinery (interact, locks, occupancy, auto-close) but the
 * renderer keeps it out of the wall-doorway pipeline — a gate is a
 * fence prop, never a wall member. Material 'garrison' is the
 * gatehouse passage: the same carve-out from the BUILDING doorway
 * pipeline (it lives in the garrison run family instead), but unlike
 * a fence gate its shut leaves are full-height mass — they block
 * lamplight and read as fortification.
 */
export type DoorMaterial =
  | 'stone'
  | 'wood'
  | 'fence'
  | 'garrison'
  | 'palisade'
  | 'hedge'
  | 'iron';

export interface DoorInfo {
  material: DoorMaterial;
  /** Wide doorways merge into one opening and hang a French pair. */
  wide: boolean;
  /** True when a body can walk through — the leaf stands open. */
  open: boolean;
}

const DOOR_INFO = new Map<Tile, DoorInfo>([
  [Tile.DoorwayStone, { material: 'stone', wide: false, open: true }],
  [Tile.DoorwayWood, { material: 'wood', wide: false, open: true }],
  [Tile.DoorwayStoneWide, { material: 'stone', wide: true, open: true }],
  [Tile.DoorwayWoodWide, { material: 'wood', wide: true, open: true }],
  [Tile.DoorwayStoneShut, { material: 'stone', wide: false, open: false }],
  [Tile.DoorwayWoodShut, { material: 'wood', wide: false, open: false }],
  [Tile.DoorwayStoneWideShut, { material: 'stone', wide: true, open: false }],
  [Tile.DoorwayWoodWideShut, { material: 'wood', wide: true, open: false }],
  [Tile.FenceGate, { material: 'fence', wide: false, open: true }],
  [Tile.FenceGateShut, { material: 'fence', wide: false, open: false }],
  // Garrison gates are wide BY CONSTRUCTION: adjacent tiles merge
  // into one arched opening and the server flips the unit atomically.
  [Tile.GateGarrison, { material: 'garrison', wide: true, open: true }],
  [Tile.GateGarrisonShut, { material: 'garrison', wide: true, open: false }],
  // The camp gate: rides ALL the door machinery like the fence gate,
  // rendered by the palisade family (never the wall-doorway pipeline).
  // Unlike a field gate its shut leaf is full-height lashed logs —
  // it blocks lamplight and reads as fortification.
  [Tile.PalisadeGate, { material: 'palisade', wide: false, open: true }],
  [Tile.PalisadeGateShut, { material: 'palisade', wide: false, open: false }],
  // The garden arch: rides ALL the door machinery like the fence
  // gate, rendered by the hedge family (never the wall-doorway
  // pipeline). The wicket under the living arch is waist-high timber,
  // but the arch above it is full green mass — shut, the whole
  // opening blocks lamplight and reads as a sealed garden.
  [Tile.HedgeGate, { material: 'hedge', wide: false, open: true }],
  [Tile.HedgeGateShut, { material: 'hedge', wide: false, open: false }],
  // The graveyard gate: rides ALL the door machinery like the fence
  // gate, rendered by the iron-fence family (never the wall-doorway
  // pipeline). Its leaves are open bars — shut, it still lets the
  // lamplight and the eye through; what it stops is the body.
  [Tile.IronGate, { material: 'iron', wide: false, open: true }],
  [Tile.IronGateShut, { material: 'iron', wide: false, open: false }],
]);

/** Every doorway tile, open and shut, both widths and materials. */
export const DOOR_TILES: ReadonlySet<Tile> = new Set(DOOR_INFO.keys());

/** Material/width/posture of a doorway tile, or null. */
export function doorInfo(id: number): DoorInfo | null {
  return DOOR_INFO.get(id as Tile) ?? null;
}

const SHUT_OF = new Map<Tile, Tile>([
  [Tile.DoorwayStone, Tile.DoorwayStoneShut],
  [Tile.DoorwayWood, Tile.DoorwayWoodShut],
  [Tile.DoorwayStoneWide, Tile.DoorwayStoneWideShut],
  [Tile.DoorwayWoodWide, Tile.DoorwayWoodWideShut],
  [Tile.FenceGate, Tile.FenceGateShut],
  [Tile.GateGarrison, Tile.GateGarrisonShut],
  [Tile.PalisadeGate, Tile.PalisadeGateShut],
  [Tile.HedgeGate, Tile.HedgeGateShut],
  [Tile.IronGate, Tile.IronGateShut],
]);
const OPEN_OF = new Map<Tile, Tile>([...SHUT_OF].map(([o, s]) => [s, o]));

/** The shut counterpart of a doorway tile (identity if already shut). */
export function shutDoorTile(id: number): Tile | null {
  const t = id as Tile;
  if (OPEN_OF.has(t)) return t;
  return SHUT_OF.get(t) ?? null;
}

/** The open counterpart of a doorway tile (identity if already open). */
export function openDoorTile(id: number): Tile | null {
  const t = id as Tile;
  if (SHUT_OF.has(t)) return t;
  return OPEN_OF.get(t) ?? null;
}

/**
 * THE KEPT FLAME — every candle prop stands in two postures, lit and
 * snuffed, and the tile IS the state (the chest law): posture syncs
 * like any patch, survives the chunk, and stays exactly as the last
 * hand left it. The candles keep their OWN map, apart from the
 * doors' — an NPC working latches down a lane must never "open" a
 * candle, and a candle never auto-closes.
 */
const CANDLE_OUT_OF = new Map<Tile, Tile>([
  [Tile.CandleStand, Tile.CandleStandOut],
  [Tile.CandleCluster, Tile.CandleClusterOut],
  [Tile.MeltedCandles, Tile.MeltedCandlesOut],
  [Tile.CandleTable, Tile.CandleTableOut],
  [Tile.PillarCandle, Tile.PillarCandleOut],
  [Tile.TripleCandles, Tile.TripleCandlesOut],
]);
const CANDLE_LIT_OF = new Map<Tile, Tile>([...CANDLE_OUT_OF].map(([lit, out]) => [out, lit]));

/** Every candle tile, both postures. */
export const CANDLE_TILES: ReadonlySet<Tile> = new Set([
  ...CANDLE_OUT_OF.keys(),
  ...CANDLE_LIT_OF.keys(),
]);

export interface CandleInfo {
  /** True when the wicks burn; false when the prop stands snuffed. */
  lit: boolean;
}

/** What a candle tile is (null for everything that isn't one). */
export function candleInfo(id: number): CandleInfo | null {
  const t = id as Tile;
  if (CANDLE_OUT_OF.has(t)) return { lit: true };
  if (CANDLE_LIT_OF.has(t)) return { lit: false };
  return null;
}

/** The other posture of a candle tile (null for non-candles). */
export function candleToggleTile(id: number): Tile | null {
  const t = id as Tile;
  return CANDLE_OUT_OF.get(t) ?? CANDLE_LIT_OF.get(t) ?? null;
}

/**
 * THE FENCE FAMILY — every tile that reads as post-and-rail fencing:
 * straight runs, the two 45° turns, and gates in both postures. Rail
 * connectivity, arrow-stick height, and the grass underlay all key
 * off this one set so a pen always reads as one built line.
 */
export const FENCE_TILES: ReadonlySet<Tile> = new Set([
  Tile.Fence,
  Tile.FenceDiagNE,
  Tile.FenceDiagNW,
  Tile.FenceGate,
  Tile.FenceGateShut,
  // THE SCARRED LAND: the broken fence is Fence-kin in the run mask
  // — its neighbours' rails still reach for its posts, so a gap in a
  // pen reads as a BREAK in one built line, never two fences ending.
  // Passability is the state (solid: false), not a door.
  Tile.FenceBroken,
]);

/**
 * AUTO-ORIENT LAW for the 45° fence: the turn spans whichever
 * diagonal already carries fencing — a fence-family neighbour on the
 * NE or SW corner deals "/" (DiagNE), on the NW or SE corner "\"
 * (DiagNW). With nothing to join it defaults to "/"; build the
 * adjoining runs first, then the turn.
 */
export function orientDiagFence(
  ne: boolean,
  nw: boolean,
  se: boolean,
  sw: boolean,
): Tile {
  if (ne || sw) return Tile.FenceDiagNE;
  if (nw || se) return Tile.FenceDiagNW;
  return Tile.FenceDiagNE;
}

/**
 * THE SPIKED WALL — the war camp's fortification family: straight
 * runs, the two 45° turns, and the lashed-log gate in both postures.
 * A THIRD wall family beside buildings and the garrison (the
 * separate-masonry law): palisades never join a WALL_RUN, never
 * bound an interior, and merge only with their own kind — a goblin
 * stockade dying into a town wall would read as one builder's work,
 * and they are not.
 */
export const PALISADE_TILES: ReadonlySet<Tile> = new Set([
  Tile.Palisade,
  Tile.PalisadeDiagNE,
  Tile.PalisadeDiagNW,
  Tile.PalisadeGate,
  Tile.PalisadeGateShut,
]);

/** The fence family's auto-orient law, spoken in sharpened logs. */
export function orientDiagPalisade(
  ne: boolean,
  nw: boolean,
  se: boolean,
  sw: boolean,
): Tile {
  if (ne || sw) return Tile.PalisadeDiagNE;
  if (nw || se) return Tile.PalisadeDiagNW;
  return Tile.PalisadeDiagNE;
}

/**
 * THE CLIPPED GREEN — the garden's living wall: straight runs, the
 * two 45° turns, and the arched gate in both postures. A FOURTH
 * run-merging family (the separate-masonry law): hedges never join a
 * WALL_RUN, never bound an interior, and merge only with their own
 * kind — clipped green dying into a timber fence would read as one
 * builder's work, and a gardener is not a carpenter.
 */
export const HEDGE_TILES: ReadonlySet<Tile> = new Set([
  Tile.Hedge,
  Tile.HedgeDiagNE,
  Tile.HedgeDiagNW,
  Tile.HedgeGate,
  Tile.HedgeGateShut,
  // THE SCARRED LAND: the dead hedge joins the coalesce class — a
  // brown stretch in a living hedgerow is ONE hedge with a dead
  // length, and the living green beside it still sways.
  Tile.HedgeDead,
]);

/**
 * THE IRON REST — the graveyard's wall: straight runs, the two 45°
 * turns, and the barred gate in both postures. A FIFTH run-merging
 * family (the separate-masonry law): wrought iron never joins a
 * WALL_RUN, never bounds an interior, and merges only with its own
 * kind — a smith's railing dying into a carpenter's fence would read
 * as one builder's work, and they are not.
 */
export const IRON_FENCE_TILES: ReadonlySet<Tile> = new Set([
  Tile.IronFence,
  Tile.IronFenceDiagNE,
  Tile.IronFenceDiagNW,
  Tile.IronGate,
  Tile.IronGateShut,
]);

/**
 * THE SCARRED LAND — the ruin walls: tumbled masonry and the burnt
 * frame, the SIXTH run-merging family (the separate-masonry law): a
 * ruin merges with its OWN kind only — stone with stone, char with
 * char — never with a living WALL_RUN (a standing house never dies
 * into a ruin mid-wall), never a fence, never the garrison. They
 * never bound an interior and never grow a roof: the roofer keys on
 * WALL_RUN_TILES, and these ids are not in it.
 */
export const RUIN_WALL_TILES: ReadonlySet<Tile> = new Set([
  Tile.RuinWallStone,
  Tile.RuinWallWood,
]);

/** The kit's contiguous id band, anchored on LIVING endpoints (never
 *  a literal) — the terrain underlay and the museum wing read it.
 *  Band 8's clamp (548) stands PAST the band on purpose: 546 and 547
 *  are reserved for the living ground's two true tiles (AshGround,
 *  GrassBlighted — plan §12.5), which are floors, never props, and
 *  must never answer here. So the clamp is named, not ranged. */
export function isScarredTile(id: number): boolean {
  return (id >= Tile.RuinWallStone && id <= Tile.SluiceGateStrung) || id === Tile.SmolderHeap;
}

/** The fence family's auto-orient law, spoken in wrought iron. */
export function orientDiagIronFence(
  ne: boolean,
  nw: boolean,
  se: boolean,
  sw: boolean,
): Tile {
  if (ne || sw) return Tile.IronFenceDiagNE;
  if (nw || se) return Tile.IronFenceDiagNW;
  return Tile.IronFenceDiagNE;
}

/** The fence family's auto-orient law, spoken in clipped leaves. */
export function orientDiagHedge(
  ne: boolean,
  nw: boolean,
  se: boolean,
  sw: boolean,
): Tile {
  if (ne || sw) return Tile.HedgeDiagNE;
  if (nw || se) return Tile.HedgeDiagNW;
  return Tile.HedgeDiagNE;
}

/** Every mineable/mined rock formation tile, ore-bearing or not. */
export const ROCK_TILES: readonly Tile[] = [
  Tile.Rock,
  Tile.RockCopper,
  Tile.RockTin,
  Tile.RockIron,
  Tile.RockCoal,
  Tile.RockGold,
  Tile.RockSilver,
  Tile.RockMithril,
  Tile.RockAdamant,
  Tile.RockObsidian,
  Tile.RockStarfall,
  Tile.RockDepleted,
];

/** Ore-bearing rocks only — the ones a pickaxe gets something out of. */
export const ORE_TILES: readonly Tile[] = [
  Tile.RockCopper,
  Tile.RockTin,
  Tile.RockIron,
  Tile.RockCoal,
  Tile.RockGold,
  Tile.RockSilver,
  Tile.RockMithril,
  Tile.RockAdamant,
  Tile.RockObsidian,
  Tile.RockStarfall,
];

/** Crafting stations, keyed by what recipes call them. */
export type StationType =
  | 'fire'
  | 'furnace'
  | 'anvil'
  | 'workbench'
  | 'alembic'
  | 'tanning_rack'
  | 'loom'
  | 'carving_bench'
  | 'enchanting_table'
  | 'sawhorse';

export const STATION_TILES: Record<StationType, Tile> = {
  fire: Tile.Campfire,
  furnace: Tile.Furnace,
  anvil: Tile.Anvil,
  workbench: Tile.Workbench,
  alembic: Tile.Alembic,
  tanning_rack: Tile.TanningRack,
  loom: Tile.Loom,
  carving_bench: Tile.CarvingBench,
  enchanting_table: Tile.EnchantingTable,
  sawhorse: Tile.Sawhorse,
};

export function stationAtTile(tile: number): StationType | null {
  for (const [station, t] of Object.entries(STATION_TILES)) {
    if (t === tile) return station as StationType;
  }
  return null;
}

export function tileDef(id: number): TileDef {
  return TILE_DEFS[id as Tile] ?? TILE_DEFS[Tile.Void];
}

export function isSolidTile(id: number): boolean {
  return tileDef(id).solid;
}

/**
 * THE WADE LAW: shallow water slows every body that walks it, applied
 * inside the shared movement step so server, client prediction, and
 * NPC chases all agree by construction — never re-apply it elsewhere.
 */
export const WADE_SPEED_FACTOR = 0.55;

export function isWadeTile(id: number | undefined): boolean {
  return id === Tile.WaterShallow;
}

/**
 * Sub-tile colliders: solid tiles whose visual mass is a centered
 * column (tree trunks, the lamp post) or boulder pile rather than a
 * full block. Movement and projectiles collide with a circle of this
 * radius at the tile centre — bodies brush past the canopy's tile
 * corners and arrows bury in the trunk, not an invisible box.
 * Pathfinding still treats the whole tile as blocked.
 */
const TILE_COLLIDER_RADIUS = new Map<Tile, number>([
  // Tree radii track the DRAWN flared trunk base (client
  // render/trees.ts maxTrunkBaseRadius — a test pins the pairing):
  // tight groves stay walkable because you collide with exactly the
  // wood you see, never an invisible box around the canopy.
  [Tile.Tree, 0.26],
  [Tile.TreeOak, 0.38],
  [Tile.TreeWillow, 0.26],
  [Tile.TreeYew, 0.34],
  [Tile.TreePine, 0.28],
  // The snag grows every species by hash: its widest base is the
  // oak's (trees.ts maxTrunkBaseRadius(DeadTree)); a full-block solid
  // under a drawn trunk was the K4 first cut's gap.
  [Tile.DeadTree, 0.42],
  [Tile.Rock, 0.4],
  [Tile.RockCopper, 0.46],
  [Tile.RockTin, 0.46],
  [Tile.RockIron, 0.46],
  [Tile.RockCoal, 0.46],
  [Tile.RockGold, 0.46],
  [Tile.RockSilver, 0.46],
  [Tile.RockMithril, 0.46],
  [Tile.RockAdamant, 0.46],
  [Tile.RockObsidian, 0.46],
  [Tile.RockStarfall, 0.46],
  [Tile.RockDepleted, 0.36],
  [Tile.LampPost, 0.2],
  // Forage flora radii track the drawn base mass (client
  // render/flora.ts floraBaseRadius — a test pins the pairing):
  // outer foliage overhangs, but you collide with the plant's core.
  [Tile.BerryBush, 0.34],
  [Tile.FibrePlant, 0.24],
  [Tile.WildSagewort, 0.3],
  [Tile.WildMoonbell, 0.24],
  // Dungeon props: centered masses you brush past, not full blocks.
  [Tile.Stalagmite, 0.34],
  [Tile.BonePile, 0.34],
  [Tile.Brazier, 0.28],
  [Tile.GlowShroom, 0.3],
  // War-camp props: you shoulder past the stake, not an invisible
  // crate around it. Walls, gates, tents, cages, and the spike
  // barrier stay full-block — they are the camp's architecture.
  [Tile.StandingTorch, 0.18],
  [Tile.Bonfire, 0.44],
  [Tile.WarBrazier, 0.3],
  [Tile.SkullPile, 0.34],
  [Tile.SkullTotem, 0.2],
  [Tile.WarBanner, 0.2],
  [Tile.MeatSpit, 0.35],
  [Tile.MeatRack, 0.35],
  [Tile.CookPot, 0.3],
  [Tile.PotionRack, 0.32],
  [Tile.BeastNest, 0.34],
  [Tile.PlunderSacks, 0.36],
  [Tile.SpearRack, 0.3],
  [Tile.TargetDummy, 0.2],
  [Tile.WarDrum, 0.32],
  [Tile.HideFrame, 0.25],
  // Elven props: fine-limbed pieces you slip past — the kit's grace
  // extends to its footprints. Bulk furniture (bench, table, daybed,
  // chair, bookcase) stays full-block like its human cousins.
  [Tile.ArcaneBeacon, 0.3],
  [Tile.ElvenBanner, 0.2],
  [Tile.ElvenLectern, 0.22],
  [Tile.ElvenHarp, 0.3],
  [Tile.ElvenLoom, 0.35],
  [Tile.ElvenFountain, 0.44],
  [Tile.ElvenStatue, 0.34],
  [Tile.Moonwell, 0.42],
  [Tile.Everflame, 0.34],
  [Tile.MithrilAnvil, 0.32],
  [Tile.ElvenArmsRack, 0.3],
  [Tile.ElvenPlanter, 0.28],
  [Tile.ElvenMirror, 0.22],
  [Tile.ElvenWaystone, 0.3],
  [Tile.ElvenChimes, 0.2],
  // Imbued works: you walk around the stone, not the magic.
  [Tile.Runestone, 0.32],
  [Tile.CrystalCluster, 0.34],
  [Tile.WardArch, 0.38],
  [Tile.ArcaneTome, 0.24],
  [Tile.RunePillar, 0.2],
  // THE LONG DARK FURNISHED: centered masses you squeeze past in a
  // tight corridor — round columns especially (you shoulder around
  // the drum, never an invisible crate). The sarcophagus keeps its
  // full block: it is a coffin, not a bollard.
  [Tile.MossBarrel, 0.3],
  [Tile.MineCart, 0.36],
  [Tile.ChainedSkeleton, 0.28],
  [Tile.BrokenPillar, 0.34],
  [Tile.GrandPillar, 0.38],
  [Tile.BurialUrns, 0.3],
  [Tile.AncientStatue, 0.34],
  // THE LONG DARK PEOPLED: the gallows post, the pillory platform,
  // the camp ring, the wrecked chest, and the candle stone are all
  // masses you step around, never full blocks.
  [Tile.GibbetCage, 0.3],
  [Tile.Stocks, 0.34],
  [Tile.ColdCamp, 0.3],
  [Tile.LootedChest, 0.28],
  [Tile.CandleShrine, 0.26],
  // THE BANKS GET THEIR GOODS: bank-stuff is lashed sticks and heaps
  // — you shoulder past the pole, wade around the hull, never bump an
  // invisible crate. The dugout and the ribs keep the widest stance.
  [Tile.FishRack, 0.35],
  [Tile.TideTotem, 0.2],
  [Tile.NetFrame, 0.35],
  [Tile.Dugout, 0.45],
  [Tile.HarpoonRack, 0.3],
  [Tile.ShellMidden, 0.34],
  [Tile.FishTrap, 0.32],
  [Tile.RoeNest, 0.34],
  [Tile.LurePole, 0.18],
  [Tile.TideAltar, 0.4],
  [Tile.CatchBasket, 0.32],
  [Tile.WhaleRibs, 0.42],
  // The craftsmen's gear: benches you lean over, lines you duck
  // under, the shelter and the keep-pool keep the widest stance.
  [Tile.ReedShelter, 0.42],
  [Tile.SmokeTripod, 0.3],
  [Tile.MendingBench, 0.34],
  [Tile.WeirPanels, 0.36],
  [Tile.KelpLine, 0.32],
  [Tile.SaltPan, 0.36],
  [Tile.ShellBench, 0.32],
  [Tile.WithyStore, 0.3],
  [Tile.KeepPool, 0.38],
  [Tile.TideChimes, 0.18],
  // THE TOWN KEEPS ITS DAY: street furniture you brush past — the
  // fountain and the cart keep the widest stance, the planter and
  // the hitch rail are things you lean on, not walls you hit.
  [Tile.TownFountain, 0.45],
  [Tile.FounderStatue, 0.36],
  [Tile.NoticeBoard, 0.3],
  [Tile.TownBell, 0.4],
  [Tile.HandCart, 0.4],
  [Tile.GrainSacks, 0.32],
  [Tile.BarrelStack, 0.38],
  [Tile.CrateStack, 0.34],
  [Tile.HitchingPost, 0.28],
  [Tile.Woodpile, 0.36],
  [Tile.StreetPlanter, 0.24],
  [Tile.StoneBench, 0.34],
  // THE TRADES KEEP SHOP: workshop gear you work AROUND — the oven
  // is the yard's one true mass, the dress form a pole you sidle
  // past, the racks and vats the shoulder-width of the aisles they
  // stand in.
  [Tile.QuenchTrough, 0.4],
  [Tile.Grindstone, 0.34],
  [Tile.IngotRack, 0.34],
  [Tile.LumberRack, 0.36],
  [Tile.DyeVats, 0.36],
  [Tile.TailorsDummy, 0.24],
  [Tile.ClothBolts, 0.32],
  [Tile.ButcherBlock, 0.32],
  [Tile.HerbRack, 0.28],
  [Tile.ShopShelf, 0.38],
  // THE SECOND SHIFT: the wall fountain and the kiln are the wave's
  // two true masses; the pump and the scale are poles you sidle
  // past; the trough runs long and low like the rail it serves.
  [Tile.WallFountain, 0.42],
  [Tile.WaterTrough, 0.42],
  [Tile.ScribesDesk, 0.32],
  [Tile.CandleRack, 0.28],
  [Tile.FletchersBench, 0.34],
  [Tile.FishmongerSlab, 0.36],
  [Tile.DisplayTable, 0.38],
  // THE COMMONS: the guardian and the skiff are the shelf's two
  // true masses; the stands and posts are poles you brush past;
  // the stool barely owns its shadow.
  [Tile.CandleStand, 0.22],
  [Tile.StreetLantern, 0.24],
  [Tile.WayShrine, 0.38],
  [Tile.GuardianStatue, 0.4],
  [Tile.TapCask, 0.38],
  [Tile.WoodStool, 0.2],
  [Tile.BasketStack, 0.3],
  [Tile.GlazedJars, 0.28],
  [Tile.BroomAndPail, 0.24],
  [Tile.LeanLadder, 0.26],
  [Tile.Wheelbarrow, 0.36],
  [Tile.WayfarersRest, 0.3],
  [Tile.MooringPost, 0.24],
  [Tile.BeachedSkiff, 0.45],
  // THE WARREN AND THE LEGION: the cart is the wave's one true
  // mass; the stakes are poles you brush past; the midden, nest,
  // and pit barely own their shadows.
  [Tile.BoneMidden, 0.32],
  [Tile.TrophyStake, 0.22],
  [Tile.GrogTub, 0.34],
  [Tile.KnucklePit, 0.3],
  [Tile.RagNest, 0.32],
  [Tile.BeastStake, 0.22],
  [Tile.CritterCage, 0.28],
  [Tile.AlarmGong, 0.34],
  [Tile.WarTable, 0.4],
  [Tile.PlunderCart, 0.45],
  [Tile.BossEffigy, 0.24],
  [Tile.GnawTrough, 0.36],
  // THE HERBALIST'S SHELF: waist furniture you brush past.
  [Tile.HerbPlanter, 0.3],
  // THE CHORE STANDS ALONE: a knee-high round you step around.
  // THE LOG YARD: mill timber is MASS — the deck keeps the widest
  // working stance in the yard.
  [Tile.FelledLog, 0.42],
  [Tile.LogPile, 0.46],
  [Tile.LogPileEndOn, 0.4],
  // THE PACKED ORDER: a knee-high stack you lean over, not walk through.
  [Tile.TiedParcels, 0.3],
  // THE KEPT FLAME: knee-high wax you step around; both postures of
  // a pair keep ONE stance — toggling a candle must never shove the
  // body standing beside it.
  [Tile.CandleCluster, 0.24],
  [Tile.CandleClusterOut, 0.24],
  // THE KNIGHT'S KEEPING: a stand is a mast on splayed feet — you
  // brush past the yoke, never the whole tile; the standard's forged
  // foot is narrower still. Empty and dressed keep ONE stance (the
  // candle-pair law: dressing a stand must never shove a body).
  [Tile.ArmorStand, 0.3],
  [Tile.ArmorStandFull, 0.3],
  ...Array.from({ length: DYE_COUNT }, (_, d) => [Tile.BannerStand + d, 0.24] as [Tile, number]),
  [Tile.MeltedCandles, 0.22],
  [Tile.MeltedCandlesOut, 0.22],
  [Tile.CandleTable, 0.26],
  [Tile.CandleTableOut, 0.26],
  [Tile.CandleStandOut, 0.22],
  [Tile.PillarCandle, 0.2],
  [Tile.PillarCandleOut, 0.2],
  [Tile.TripleCandles, 0.24],
  [Tile.TripleCandlesOut, 0.24],
  // THE SCARRED LAND: centered masses you brush past. The fallen
  // beam and the ribcage are long low things (r .4 — you step over
  // the ends); the cairn is a knee-high pile (.34, and 'cover' for
  // the sight law — a body lies flat behind it); the posts, the
  // stake, and the bone tree are driven sticks (.15–.25); the spoil
  // heap is a mound (.4); the root and the tally stone are
  // stone-and-knot you skirt (.3).
  [Tile.CharredBeam, 0.4],
  [Tile.ArrowPost, 0.2],
  [Tile.FieldCairn, 0.34],
  [Tile.BeastBones, 0.4],
  [Tile.SpoilHeap, 0.4],
  [Tile.CreepRoot, 0.3],
  [Tile.CharterPost, 0.2],
  [Tile.BoneTree, 0.25],
  [Tile.TallyStone, 0.3],
  [Tile.RedRagStake, 0.15],
  // Band 8: the charcoal clamp is a turfed mound a body walks round
  // (.42 — wider than the spoil heap; a clamp is banked to burn for
  // days and nobody leans on it).
  [Tile.SmolderHeap, 0.42],
]);

/** Collider radius for a centered-mass tile, or null for full-block solids. */
export function tileColliderRadius(id: number): number | null {
  return TILE_COLLIDER_RADIUS.get(id as Tile) ?? null;
}

/**
 * THE CART HAS TWO FEET (contested lands band 7, owed E5 / A6). Four
 * scarred-land props paint wider than the one tile they own, and a
 * body used to walk straight through the painted half: the
 * belongings cart rests its shafts 0.36 of a tile past its WEST edge
 * (displaced.ts: "the shafts' tips at −0.86s"); the field cot's far
 * trestle splays 0.15 past its EAST edge ("the far east trestle's
 * splayed foot at +0.65s"); the lean-to pegs its skirts 0.31 past
 * BOTH flanks, the west one carrying the sun strip that reads as the
 * solid wall (the east fold sits a step under, in shade); the broken
 * cart spills its sacks on the tie side, WEST ("the sacks' seat
 * reaches past the burst sack's mouth on the tie side"). Each of the
 * four owns a SECOND FOOT: the one cardinal neighbour its painter
 * reaches into. The walk collider (collision.ts) and the nav grid
 * (pathfind.ts) hold that neighbour as a full block while the prop
 * stands, exactly as if it were solid, so feet stop at the canvas and
 * the shafts instead of inside them. The side is the PAINTER's fixed
 * side, never a guess: read the painter before changing a number,
 * because a footprint the art does not draw is an invisible wall. The
 * content lint (content maps/lint/footprint.ts) refuses any placement
 * whose second foot is solid, a route or a routine waypoint, so the
 * blocked tile is always open ground the author gave the prop. Shots
 * ignore the second foot (an arrow crosses a resting shaft at chest
 * height, the canopy law's cousin); the prop's own tile keeps its
 * full block for both.
 */
export interface Footprint {
  readonly dx: -1 | 0 | 1;
  readonly dy: -1 | 0 | 1;
}
export const FOOTPRINT: ReadonlyMap<Tile, Footprint> = new Map<Tile, Footprint>([
  [Tile.LeanTo, { dx: -1, dy: 0 }],
  [Tile.FieldCot, { dx: 1, dy: 0 }],
  [Tile.BelongingsCart, { dx: -1, dy: 0 }],
  [Tile.BrokenCart, { dx: -1, dy: 0 }],
]);

/** The second foot of a two-foot prop, or null for every one-tile tile. */
export function tileFootprint(id: number): Footprint | null {
  return FOOTPRINT.get(id as Tile) ?? null;
}

/**
 * Is (tx, ty) the SECOND FOOT of a two-foot prop standing beside it?
 * Reads the four cardinal neighbours through the given sampler; an
 * unknown neighbour (undefined) never covers.
 */
export function footprintCoveredAt(
  tileAt: (tx: number, ty: number) => number | undefined,
  tx: number,
  ty: number,
): boolean {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const t = tileAt(tx + dx, ty + dy);
    if (t === undefined) continue;
    const f = FOOTPRINT.get(t as Tile);
    if (f !== undefined && dx + f.dx === 0 && dy + f.dy === 0) return true;
  }
  return false;
}

/**
 * THE SIGHT LAW — what a watching eye sees past. Three masses:
 * 'wall' seals the sight-line outright: every lamplight blocker plus
 * the cliff face (nobody looks through the hill). 'cover' is a
 * centered trunk-mass the eye sees PAST but not cleanly THROUGH —
 * trees, ore rocks, stalagmites, the berry bush: one on the line
 * dulls the watcher, two seal it (a body deep in the grove is as
 * good as gone). Fences, furniture, and waist-high clutter are
 * 'clear' — sight is not walk-clearance, and a fence hides nobody.
 */
export type SightMass = 'clear' | 'cover' | 'wall';

const SIGHT_WALL_TILES: ReadonlySet<Tile> = new Set([...LIGHT_BLOCKING_TILES, Tile.Cliff]);

/** Trunk-masses slim enough to peek past but thick enough to matter. */
const SIGHT_COVER_MIN_RADIUS = 0.25;

export function sightMass(id: number): SightMass {
  if (SIGHT_WALL_TILES.has(id as Tile)) return 'wall';
  if (!isSolidTile(id)) return 'clear';
  const r = tileColliderRadius(id);
  return r !== null && r >= SIGHT_COVER_MIN_RADIUS ? 'cover' : 'clear';
}

/**
 * Tree regrowth staging: a felled tree leaves a stump, the stump
 * sprouts the species' sapling partway through the respawn wait, and
 * the sapling stands up into the full tree. One law source for the
 * server's respawn queue and the client's transition effects.
 */
const SAPLING_OF = new Map<Tile, Tile>([
  [Tile.Tree, Tile.Sapling],
  [Tile.TreeOak, Tile.SaplingOak],
  [Tile.TreeWillow, Tile.SaplingWillow],
  [Tile.TreeYew, Tile.SaplingYew],
  [Tile.TreePine, Tile.SaplingPine],
]);
const TREE_OF_SAPLING = new Map<Tile, Tile>(
  [...SAPLING_OF].map(([tree, sap]) => [sap, tree]),
);

/** The tree tiles that fell, stump, and regrow. */
export const TREE_TILES: ReadonlySet<Tile> = new Set(SAPLING_OF.keys());

/**
 * The fishing ladder: every fishing-spot tile shares one water dialect
 * (shoreline, reflections, waterfalls, the deck's never-board-over
 * law) — client and worldgen read this set, never a tile equality.
 */
export const FISHING_TILES: ReadonlySet<Tile> = new Set([
  Tile.FishingSpot,
  Tile.PikeHole,
  Tile.EelRun,
  Tile.SalmonRun,
  Tile.GlimmerShoal,
]);

export function isFishingTile(t: number | undefined): boolean {
  return t !== undefined && FISHING_TILES.has(t as Tile);
}

/** The sapling stage for a tree tile, or null if it isn't a tree. */
export function saplingOf(id: number): Tile | null {
  return SAPLING_OF.get(id as Tile) ?? null;
}

/** The grown tree a sapling becomes, or null if it isn't a sapling. */
export function treeOfSapling(id: number): Tile | null {
  return TREE_OF_SAPLING.get(id as Tile) ?? null;
}

/**
 * Loot chests: one law source for the five kinds and their two
 * postures. The wood chest is the everyday find; the mossgrown chest
 * is its forest-claimed elder; the ironbound strongchest is often
 * locked and wants a brass key; the gilded coffer is treasure-house
 * work; and the black boss chest holds the champion's cache behind
 * the champion.
 */
export type ChestKind = 'wood' | 'iron' | 'gilded' | 'mossy' | 'boss';

export interface ChestInfo {
  kind: ChestKind;
  open: boolean;
}

const CHEST_INFO = new Map<Tile, ChestInfo>([
  [Tile.ChestWood, { kind: 'wood', open: false }],
  [Tile.ChestWoodOpen, { kind: 'wood', open: true }],
  [Tile.ChestIron, { kind: 'iron', open: false }],
  [Tile.ChestIronOpen, { kind: 'iron', open: true }],
  [Tile.ChestGilded, { kind: 'gilded', open: false }],
  [Tile.ChestGildedOpen, { kind: 'gilded', open: true }],
  [Tile.ChestMossy, { kind: 'mossy', open: false }],
  [Tile.ChestMossyOpen, { kind: 'mossy', open: true }],
  [Tile.ChestBoss, { kind: 'boss', open: false }],
  [Tile.ChestBossOpen, { kind: 'boss', open: true }],
]);

/** Every chest tile, closed or open. */
export const CHEST_TILES: ReadonlySet<Tile> = new Set(CHEST_INFO.keys());

/** Kind + posture of a chest tile, or null for anything else. */
export function chestInfo(id: number): ChestInfo | null {
  return CHEST_INFO.get(id as Tile) ?? null;
}

/** The closed tile for a chest kind. */
export function closedChestTile(kind: ChestKind): Tile {
  for (const [tile, info] of CHEST_INFO) {
    if (info.kind === kind && !info.open) return tile;
  }
  return Tile.ChestWood;
}

/** The open tile for a chest kind. */
export function openChestTile(kind: ChestKind): Tile {
  for (const [tile, info] of CHEST_INFO) {
    if (info.kind === kind && info.open) return tile;
  }
  return Tile.ChestWoodOpen;
}

/**
 * Destructible props: the clutter you can SMASH. One swing (or a
 * spent arrow) bursts the prop into client-side debris and the tile
 * becomes the floor beneath it — the tile IS the state, exactly the
 * chest/door law, so collision, pathing, and lamplight all follow the
 * ordinary tile patch. The respawn queue quietly stands the prop back
 * up a few minutes later, never onto a body and never over something
 * newly built there.
 */
export type DestructibleKind =
  | 'barrel'
  | 'crate'
  | 'goods'
  | 'chair'
  | 'table'
  | 'bench'
  | 'bonepile'
  | 'crackedwall'
  // THE CAMP BARES ITS TEETH: nearly every war-camp piece can be
  // beaten apart — clearing the camp is the fantasy.
  | 'palisade'
  | 'torch'
  | 'brazier'
  | 'tent'
  | 'skulls'
  | 'totem'
  | 'banner'
  | 'cage'
  | 'stakes'
  | 'spit'
  | 'meatrack'
  | 'pot'
  | 'potions'
  | 'nest'
  | 'sacks'
  | 'spears'
  | 'dummy'
  | 'drum'
  | 'hide'
  // THE FAIR HOUSE FURNISHED: elven finery — pale splinters, silk
  // scraps, and moonglass glitter, never the camp's brown wreckage.
  | 'beacon'
  | 'elfbanner'
  | 'elfbench'
  | 'elftable'
  | 'elfchair'
  | 'daybed'
  | 'bookcase'
  | 'lectern'
  | 'harp'
  | 'loom'
  | 'fountain'
  | 'statue'
  | 'moonwell'
  | 'anvil'
  | 'armsrack'
  | 'planter'
  | 'mirror'
  | 'waystone'
  | 'chimes'
  // The imbued works: crystal light that shatters bright.
  | 'runestone'
  | 'crystals'
  | 'wardarch'
  | 'tome'
  | 'runepillar'
  // THE LONG DARK FURNISHED: rotten wood folds wet, clay rings dry,
  // old bone scatters, and worked stone cracks in slabs.
  | 'mossbarrel'
  | 'minecart'
  | 'chainedbones'
  | 'sarcophagus'
  | 'brokenpillar'
  | 'urns'
  | 'oldstatue'
  // THE LONG DARK PEOPLED: the gibbet comes down chain-first, timber
  // splits dry, a dead camp scatters in ash, and wax snuffs soft.
  | 'gibbet'
  | 'stocks'
  | 'coldcamp'
  | 'lootchest'
  | 'candles'
  // THE BANKS GET THEIR GOODS: bank-stuff comes apart wet — lashings
  // let go, wicker springs, the catch escapes, old bone falls heavy.
  | 'fishrack'
  | 'tidetotem'
  | 'net'
  | 'dugout'
  | 'harpoons'
  | 'midden'
  | 'fishtrap'
  | 'roe'
  | 'lure'
  | 'catch'
  | 'greatribs'
  // THE CRAFTSMEN OF THE BANKS: the working gear's own wreckage —
  // reed walls sigh apart, smoke scatters, brine and salt spill.
  | 'shelter'
  | 'smoker'
  | 'mendbench'
  | 'weir'
  | 'kelpline'
  | 'saltpan'
  | 'shellbench'
  | 'withies'
  | 'keeppool'
  | 'shellchimes'
  // THE TOWN KEEPS ITS DAY: street timber coughs the joinery amber
  // it was built from; the NEW voices are town limestone, bronze
  // (the bell's break is the loudest note it ever plays), spilled
  // grain, flying laundry, and produce rolling for the gutter.
  | 'townfountain'
  | 'founder'
  | 'notices'
  | 'townbell'
  | 'handcart'
  | 'grainsacks'
  | 'barrelstack'
  | 'cratestack'
  | 'hitchpost'
  | 'woodpile'
  | 'streetplanter'
  | 'stonebench'
  // THE TRADES KEEP SHOP: each trade breaks in its own material —
  // the quench sloshes out, the grindstone disc ROLLS FREE, the
  // oven lands like the masonry it is, the bolts unroll in flight,
  // and a smashed shelf is a rain of crockery.
  | 'quench'
  | 'grindstone'
  | 'ingots'
  | 'lumber'
  | 'dyevat'
  | 'dressform'
  | 'clothbolts'
  | 'butcherblock'
  | 'herbs'
  | 'shopshelf'
  // THE SECOND SHIFT: falling water and limestone, ringing pump
  // iron, slosh, wet clay, fired kiln brick, paper and ink, soft
  // wax, feather and shaft, leather, market silver, brass chain,
  // and the display table's rain of dealt goods.
  | 'wallfountain'
  | 'watertrough'
  | 'scribedesk'
  | 'candlerack'
  | 'fletcher'
  | 'fishslab'
  | 'parcels'
  | 'displaytable'
  // THE COMMONS: the general shelf breaks in the town's own
  // materials — snuffed wax and iron, wayside stone,
  // spilled ale, scattered game pegs, flying cloaks, and
  // the skiff's long lapped strakes cartwheeling up the shore.
  | 'candlestand'
  | 'streetlantern'
  | 'wayshrine'
  | 'guardian'
  | 'tapcask'
  | 'stool'
  | 'baskets'
  | 'glazedjars'
  | 'broompail'
  | 'ladder'
  | 'barrow'
  | 'wayfarer'
  | 'mooring'
  | 'skiff'
  // THE WARREN AND THE LEGION: the camps' second wreckage shelf.
  | 'gnawbones'
  | 'trophies'
  | 'grogtub'
  | 'knuckles'
  | 'ragnest'
  | 'beaststake'
  | 'critters'
  | 'gong'
  | 'wartable'
  | 'plundercart'
  | 'effigy'
  | 'gnawtrough'
  // THE HERBALIST'S SHELF: staves clap out, the wet soil goes DOWN,
  // a green shower, the snips ping bright, the tied bundle flies whole.
  | 'herbplanter'
  // THE CHORE STANDS ALONE: the great round topples heavy, the
  // standing axe cartwheels free, chips everywhere.
  // THE LOG YARD: whole trunks break as TRUNKS — long heavy sections
  // that barely fly, great rounds that roll, bark sheeting off.
  | 'greatlog'
  | 'logdeck'
  | 'logstack'
  // THE KEPT FLAME: candles break as WAX — soft stubs showering
  // pale, the table adds its joinery, nothing here rings iron but
  // the chamberstick.
  | 'candlecluster'
  | 'meltwax'
  | 'candletable'
  // THE BOLD WICK: the lone column falls as ONE heavy piece.
  | 'pillarcandle'
  // THE KNIGHT'S KEEPING: bare oak claps out; a dressed stand adds
  // the harness ringing off it plate by plate; the standard breaks
  // at the staff and the cloth flies as one great flap.
  | 'armorstand'
  | 'armorstandfull'
  | 'bannerstand'
  // THE SCARRED LAND: what a ruin gives up when struck — charcoal
  // and char-checked timber, a burnt roof folding into rubble, a
  // root that bleeds sap and COMES BACK, a thread that parts, a cot's
  // canvas and poles — and the plain kinds the field shares: a cart
  // (broken or belongings), a driven post, old bone, a marked stone,
  // spoil rubble.
  | 'charbeam'
  | 'roofheap'
  | 'root'
  | 'thread'
  | 'cot'
  | 'cart'
  | 'post'
  | 'bones'
  | 'stone'
  | 'rubble';

export interface DestructibleInfo {
  kind: DestructibleKind;
  /** Seconds of satisfying absence before the prop stands back up. */
  respawnSec: number;
  /**
   * DURABILITY — how many HITS the prop absorbs before bursting.
   * Counted in blows, never damage: a level-1 fist and an endgame
   * blade chew through a table in the same three strikes, so bulk
   * reads as bulk at every scale. Light clutter pops on the first
   * hit; big joined furniture holds a beat or two (the shudder tells
   * you it's working). This is the knob future barricades turn.
   */
  hits: number;
}

const DESTRUCTIBLE_INFO = new Map<Tile, DestructibleInfo>([
  [Tile.Barrel, { kind: 'barrel', respawnSec: 180, hits: 1 }],
  [Tile.Crate, { kind: 'crate', respawnSec: 180, hits: 1 }],
  [Tile.CrateGoods, { kind: 'goods', respawnSec: 240, hits: 2 }],
  [Tile.Chair, { kind: 'chair', respawnSec: 150, hits: 1 }],
  [Tile.Table, { kind: 'table', respawnSec: 240, hits: 3 }],
  [Tile.Bench, { kind: 'bench', respawnSec: 180, hits: 2 }],
  [Tile.BonePile, { kind: 'bonepile', respawnSec: 600, hits: 1 }],
  // The secret-door law: a cracked wall is a wall until three blows
  // say otherwise. The long respawn means a found passage stays found
  // for the whole run (dungeon instances die before it ever restands).
  [Tile.CrackedCaveWall, { kind: 'crackedwall', respawnSec: 3600, hits: 3 }],
  // THE CAMP BARES ITS TEETH: the war camp is an obstacle course.
  // Walls hold four blows (the barricade knob turned at last), the
  // road-blocker two; camp dressing pops in one or two so clearing a
  // camp FEELS like clearing it. Gates are the door law's, not ours,
  // and the bonfire never breaks (a fire is doused, not smashed).
  // The long wall respawn means a breached ring stays breached for
  // the whole assault; clutter re-dresses on the furniture clock.
  [Tile.Palisade, { kind: 'palisade', respawnSec: 900, hits: 4 }],
  [Tile.PalisadeDiagNE, { kind: 'palisade', respawnSec: 900, hits: 4 }],
  [Tile.PalisadeDiagNW, { kind: 'palisade', respawnSec: 900, hits: 4 }],
  [Tile.StandingTorch, { kind: 'torch', respawnSec: 300, hits: 1 }],
  [Tile.WarBrazier, { kind: 'brazier', respawnSec: 300, hits: 2 }],
  [Tile.TentHide, { kind: 'tent', respawnSec: 600, hits: 3 }],
  [Tile.TentWar, { kind: 'tent', respawnSec: 600, hits: 3 }],
  [Tile.SkullPile, { kind: 'skulls', respawnSec: 600, hits: 1 }],
  [Tile.SkullTotem, { kind: 'totem', respawnSec: 600, hits: 2 }],
  [Tile.WarBanner, { kind: 'banner', respawnSec: 420, hits: 2 }],
  [Tile.PrisonCage, { kind: 'cage', respawnSec: 600, hits: 3 }],
  [Tile.SpikeBarrier, { kind: 'stakes', respawnSec: 600, hits: 2 }],
  [Tile.MeatSpit, { kind: 'spit', respawnSec: 300, hits: 2 }],
  [Tile.MeatRack, { kind: 'meatrack', respawnSec: 300, hits: 2 }],
  [Tile.CookPot, { kind: 'pot', respawnSec: 300, hits: 2 }],
  [Tile.PotionRack, { kind: 'potions', respawnSec: 300, hits: 1 }],
  [Tile.BeastNest, { kind: 'nest', respawnSec: 420, hits: 1 }],
  [Tile.PlunderSacks, { kind: 'sacks', respawnSec: 420, hits: 2 }],
  [Tile.SpearRack, { kind: 'spears', respawnSec: 420, hits: 2 }],
  [Tile.TargetDummy, { kind: 'dummy', respawnSec: 240, hits: 3 }],
  [Tile.WarDrum, { kind: 'drum', respawnSec: 420, hits: 2 }],
  [Tile.HideFrame, { kind: 'hide', respawnSec: 420, hits: 2 }],
  // THE FAIR HOUSE FURNISHED: finery breaks fast — silk tears, glass
  // rings, turned legs snap in one or two blows — but stone and
  // mithril stand long (the statue, fountain, anvil and waystone hold
  // four). The Everflame is deliberately NOT here: a flame this old
  // is not put out by a stick (the bonfire law), so a sacked hall
  // keeps its light.
  [Tile.ArcaneBeacon, { kind: 'beacon', respawnSec: 300, hits: 2 }],
  [Tile.ElvenBanner, { kind: 'elfbanner', respawnSec: 420, hits: 2 }],
  [Tile.ElvenBench, { kind: 'elfbench', respawnSec: 240, hits: 2 }],
  [Tile.ElvenTable, { kind: 'elftable', respawnSec: 240, hits: 2 }],
  [Tile.ElvenChair, { kind: 'elfchair', respawnSec: 240, hits: 1 }],
  [Tile.ElvenDaybed, { kind: 'daybed', respawnSec: 300, hits: 2 }],
  [Tile.ElvenBookcase, { kind: 'bookcase', respawnSec: 300, hits: 3 }],
  [Tile.ElvenLectern, { kind: 'lectern', respawnSec: 240, hits: 1 }],
  [Tile.ElvenHarp, { kind: 'harp', respawnSec: 300, hits: 2 }],
  [Tile.ElvenLoom, { kind: 'loom', respawnSec: 300, hits: 2 }],
  [Tile.ElvenFountain, { kind: 'fountain', respawnSec: 600, hits: 4 }],
  [Tile.ElvenStatue, { kind: 'statue', respawnSec: 600, hits: 4 }],
  [Tile.Moonwell, { kind: 'moonwell', respawnSec: 600, hits: 3 }],
  [Tile.MithrilAnvil, { kind: 'anvil', respawnSec: 600, hits: 4 }],
  [Tile.ElvenArmsRack, { kind: 'armsrack', respawnSec: 420, hits: 2 }],
  [Tile.ElvenPlanter, { kind: 'planter', respawnSec: 240, hits: 1 }],
  [Tile.ElvenMirror, { kind: 'mirror', respawnSec: 240, hits: 1 }],
  [Tile.ElvenWaystone, { kind: 'waystone', respawnSec: 600, hits: 4 }],
  [Tile.ElvenChimes, { kind: 'chimes', respawnSec: 240, hits: 1 }],
  // The imbued works: old magic stands long, wild crystal cracks in
  // two, and a floating book comes down with one good swat.
  [Tile.Runestone, { kind: 'runestone', respawnSec: 600, hits: 4 }],
  [Tile.CrystalCluster, { kind: 'crystals', respawnSec: 420, hits: 2 }],
  [Tile.WardArch, { kind: 'wardarch', respawnSec: 600, hits: 4 }],
  [Tile.ArcaneTome, { kind: 'tome', respawnSec: 240, hits: 1 }],
  [Tile.RunePillar, { kind: 'runepillar', respawnSec: 600, hits: 3 }],
  // THE LONG DARK FURNISHED: rot pops in one blow, joined iron and
  // worked stone hold three or four. The wall fixtures are NOT here —
  // a sconce is bolted into the mountain and a chain shrugs off a
  // club — and the grand pillar never breaks: it holds the roof up
  // (the bonfire law, carried into stone).
  [Tile.MossBarrel, { kind: 'mossbarrel', respawnSec: 300, hits: 1 }],
  [Tile.MineCart, { kind: 'minecart', respawnSec: 600, hits: 3 }],
  [Tile.ChainedSkeleton, { kind: 'chainedbones', respawnSec: 600, hits: 1 }],
  [Tile.Sarcophagus, { kind: 'sarcophagus', respawnSec: 600, hits: 4 }],
  [Tile.BrokenPillar, { kind: 'brokenpillar', respawnSec: 600, hits: 3 }],
  [Tile.BurialUrns, { kind: 'urns', respawnSec: 300, hits: 1 }],
  [Tile.AncientStatue, { kind: 'oldstatue', respawnSec: 600, hits: 4 }],
  // THE LONG DARK PEOPLED: joined timber holds a beat, everything a
  // delver left pops in one. The mine brace is NOT here — it holds
  // the roof, same law as the grand pillar — and the fossil, the
  // webs, the pool, and the grate belong to the mountain itself.
  [Tile.GibbetCage, { kind: 'gibbet', respawnSec: 600, hits: 2 }],
  [Tile.Stocks, { kind: 'stocks', respawnSec: 600, hits: 2 }],
  [Tile.ColdCamp, { kind: 'coldcamp', respawnSec: 300, hits: 1 }],
  [Tile.LootedChest, { kind: 'lootchest', respawnSec: 300, hits: 1 }],
  [Tile.CandleShrine, { kind: 'candles', respawnSec: 300, hits: 1 }],
  // THE BANKS GET THEIR GOODS: lashed bank-stuff pops in a blow, the
  // hollowed hull and joined bone hold a few. The TideAltar is NOT
  // here — the tide keeps its own (the bonfire law reaching the
  // water), and the ribs at 4 are the kit's hardest bones.
  [Tile.FishRack, { kind: 'fishrack', respawnSec: 300, hits: 1 }],
  [Tile.TideTotem, { kind: 'tidetotem', respawnSec: 600, hits: 3 }],
  [Tile.NetFrame, { kind: 'net', respawnSec: 300, hits: 1 }],
  [Tile.Dugout, { kind: 'dugout', respawnSec: 600, hits: 3 }],
  [Tile.HarpoonRack, { kind: 'harpoons', respawnSec: 300, hits: 2 }],
  [Tile.ShellMidden, { kind: 'midden', respawnSec: 300, hits: 1 }],
  [Tile.FishTrap, { kind: 'fishtrap', respawnSec: 300, hits: 1 }],
  [Tile.RoeNest, { kind: 'roe', respawnSec: 300, hits: 1 }],
  [Tile.LurePole, { kind: 'lure', respawnSec: 600, hits: 2 }],
  [Tile.CatchBasket, { kind: 'catch', respawnSec: 300, hits: 1 }],
  [Tile.WhaleRibs, { kind: 'greatribs', respawnSec: 600, hits: 4 }],
  // THE CRAFTSMEN OF THE BANKS: woven walls and worked joinery hold a
  // blow or three; lashed lines, heaps, and crusts pop in one.
  [Tile.ReedShelter, { kind: 'shelter', respawnSec: 600, hits: 3 }],
  [Tile.SmokeTripod, { kind: 'smoker', respawnSec: 300, hits: 1 }],
  [Tile.MendingBench, { kind: 'mendbench', respawnSec: 300, hits: 2 }],
  [Tile.WeirPanels, { kind: 'weir', respawnSec: 300, hits: 2 }],
  [Tile.KelpLine, { kind: 'kelpline', respawnSec: 300, hits: 1 }],
  [Tile.SaltPan, { kind: 'saltpan', respawnSec: 300, hits: 1 }],
  [Tile.ShellBench, { kind: 'shellbench', respawnSec: 300, hits: 2 }],
  [Tile.WithyStore, { kind: 'withies', respawnSec: 300, hits: 1 }],
  [Tile.KeepPool, { kind: 'keeppool', respawnSec: 300, hits: 1 }],
  [Tile.TideChimes, { kind: 'shellchimes', respawnSec: 300, hits: 1 }],
  // THE TOWN KEEPS ITS DAY: street timber holds a blow or two,
  // civic masonry and bronze hold three or four — and a town REPAIRS
  // (the civic pieces restand on the long clock, the small stuff on
  // the short one). Everything here breaks: a kept town is a town
  // somebody can wreck, and that is what the watch is for.
  [Tile.TownFountain, { kind: 'townfountain', respawnSec: 600, hits: 4 }],
  [Tile.FounderStatue, { kind: 'founder', respawnSec: 600, hits: 4 }],
  [Tile.NoticeBoard, { kind: 'notices', respawnSec: 300, hits: 2 }],
  [Tile.TownBell, { kind: 'townbell', respawnSec: 600, hits: 3 }],
  [Tile.HandCart, { kind: 'handcart', respawnSec: 300, hits: 2 }],
  [Tile.GrainSacks, { kind: 'grainsacks', respawnSec: 300, hits: 1 }],
  [Tile.BarrelStack, { kind: 'barrelstack', respawnSec: 300, hits: 2 }],
  [Tile.CrateStack, { kind: 'cratestack', respawnSec: 300, hits: 2 }],
  [Tile.HitchingPost, { kind: 'hitchpost', respawnSec: 300, hits: 2 }],
  [Tile.Woodpile, { kind: 'woodpile', respawnSec: 300, hits: 1 }],
  [Tile.StreetPlanter, { kind: 'streetplanter', respawnSec: 300, hits: 1 }],
  [Tile.StoneBench, { kind: 'stonebench', respawnSec: 600, hits: 3 }],
  // THE TRADES KEEP SHOP: workshop timber holds a blow or two like
  // the street's; the oven is the yard's masonry and holds four.
  // A wrecked shop restocks on the short clock — trade goes on.
  [Tile.QuenchTrough, { kind: 'quench', respawnSec: 300, hits: 2 }],
  [Tile.Grindstone, { kind: 'grindstone', respawnSec: 300, hits: 2 }],
  [Tile.IngotRack, { kind: 'ingots', respawnSec: 300, hits: 2 }],
  [Tile.LumberRack, { kind: 'lumber', respawnSec: 300, hits: 2 }],
  [Tile.DyeVats, { kind: 'dyevat', respawnSec: 300, hits: 2 }],
  [Tile.TailorsDummy, { kind: 'dressform', respawnSec: 300, hits: 1 }],
  [Tile.ClothBolts, { kind: 'clothbolts', respawnSec: 300, hits: 1 }],
  [Tile.ButcherBlock, { kind: 'butcherblock', respawnSec: 300, hits: 2 }],
  [Tile.HerbRack, { kind: 'herbs', respawnSec: 300, hits: 1 }],
  [Tile.ShopShelf, { kind: 'shopshelf', respawnSec: 300, hits: 2 }],
  // THE SECOND SHIFT: street timber holds a blow or two; carved
  // limestone holds three; the kiln is this wave's masonry and
  // holds four on the long clock like the oven before it.
  [Tile.WallFountain, { kind: 'wallfountain', respawnSec: 600, hits: 3 }],
  [Tile.WaterTrough, { kind: 'watertrough', respawnSec: 300, hits: 2 }],
  [Tile.ScribesDesk, { kind: 'scribedesk', respawnSec: 300, hits: 2 }],
  [Tile.CandleRack, { kind: 'candlerack', respawnSec: 300, hits: 1 }],
  [Tile.FletchersBench, { kind: 'fletcher', respawnSec: 300, hits: 2 }],
  [Tile.FishmongerSlab, { kind: 'fishslab', respawnSec: 300, hits: 2 }],
  [Tile.DisplayTable, { kind: 'displaytable', respawnSec: 300, hits: 2 }],
  // THE COMMONS: street timber pops in one or two like the rest
  // of the town's; the wayside stone (shrine, guardian)
  // holds three-and-four on the long clock — the watch notices
  // when somebody wrecks the faith. The skiff is forty seasons
  // of clinker and holds three.
  [Tile.CandleStand, { kind: 'candlestand', respawnSec: 300, hits: 1 }],
  [Tile.StreetLantern, { kind: 'streetlantern', respawnSec: 300, hits: 1 }],
  [Tile.WayShrine, { kind: 'wayshrine', respawnSec: 600, hits: 3 }],
  [Tile.GuardianStatue, { kind: 'guardian', respawnSec: 600, hits: 4 }],
  [Tile.TapCask, { kind: 'tapcask', respawnSec: 300, hits: 2 }],
  [Tile.WoodStool, { kind: 'stool', respawnSec: 150, hits: 1 }],
  [Tile.BasketStack, { kind: 'baskets', respawnSec: 300, hits: 1 }],
  [Tile.GlazedJars, { kind: 'glazedjars', respawnSec: 300, hits: 1 }],
  [Tile.BroomAndPail, { kind: 'broompail', respawnSec: 300, hits: 1 }],
  [Tile.LeanLadder, { kind: 'ladder', respawnSec: 300, hits: 1 }],
  [Tile.Wheelbarrow, { kind: 'barrow', respawnSec: 300, hits: 2 }],
  [Tile.WayfarersRest, { kind: 'wayfarer', respawnSec: 300, hits: 1 }],
  [Tile.MooringPost, { kind: 'mooring', respawnSec: 300, hits: 2 }],
  [Tile.BeachedSkiff, { kind: 'skiff', respawnSec: 600, hits: 3 }],
  // THE WARREN AND THE LEGION: camp litter pops in one, lashed
  // work holds two, and the stolen cart is the wave's barricade at
  // three. Everything here breaks — clearing a camp's LIFE is part
  // of clearing the camp — and re-dresses on the furniture clock,
  // because a warband that survives the raid rebuilds its comforts
  // before its walls.
  [Tile.BoneMidden, { kind: 'gnawbones', respawnSec: 300, hits: 1 }],
  [Tile.TrophyStake, { kind: 'trophies', respawnSec: 420, hits: 2 }],
  [Tile.GrogTub, { kind: 'grogtub', respawnSec: 300, hits: 2 }],
  [Tile.KnucklePit, { kind: 'knuckles', respawnSec: 240, hits: 1 }],
  [Tile.RagNest, { kind: 'ragnest', respawnSec: 300, hits: 1 }],
  [Tile.BeastStake, { kind: 'beaststake', respawnSec: 420, hits: 2 }],
  [Tile.CritterCage, { kind: 'critters', respawnSec: 300, hits: 1 }],
  [Tile.AlarmGong, { kind: 'gong', respawnSec: 420, hits: 2 }],
  [Tile.WarTable, { kind: 'wartable', respawnSec: 420, hits: 2 }],
  [Tile.PlunderCart, { kind: 'plundercart', respawnSec: 600, hits: 3 }],
  [Tile.BossEffigy, { kind: 'effigy', respawnSec: 420, hits: 2 }],
  [Tile.GnawTrough, { kind: 'gnawtrough', respawnSec: 300, hits: 1 }],
  // THE HERBALIST'S SHELF: cooper's timber on the street clock.
  [Tile.HerbPlanter, { kind: 'herbplanter', respawnSec: 300, hits: 2 }],
  // THE CHORE STANDS ALONE: a seasoned round takes two honest blows.
  // THE LOG YARD: whole trunks are the street kit's heaviest timber —
  // the single log holds two, the stacked masses hold three.
  [Tile.FelledLog, { kind: 'greatlog', respawnSec: 420, hits: 2 }],
  [Tile.LogPile, { kind: 'logdeck', respawnSec: 420, hits: 3 }],
  [Tile.LogPileEndOn, { kind: 'logstack', respawnSec: 420, hits: 3 }],
  [Tile.TiedParcels, { kind: 'parcels', respawnSec: 300, hits: 1 }],
  // THE KEPT FLAME: wax pops in a blow, in either posture — the
  // pair shares one break-up kit (dark wax breaks the same as lit).
  [Tile.CandleCluster, { kind: 'candlecluster', respawnSec: 300, hits: 1 }],
  [Tile.CandleClusterOut, { kind: 'candlecluster', respawnSec: 300, hits: 1 }],
  [Tile.MeltedCandles, { kind: 'meltwax', respawnSec: 300, hits: 1 }],
  [Tile.MeltedCandlesOut, { kind: 'meltwax', respawnSec: 300, hits: 1 }],
  [Tile.CandleTable, { kind: 'candletable', respawnSec: 300, hits: 1 }],
  [Tile.CandleTableOut, { kind: 'candletable', respawnSec: 300, hits: 1 }],
  [Tile.CandleStandOut, { kind: 'candlestand', respawnSec: 300, hits: 1 }],
  // THE BOLD WICK: one great column falls heavy; the trio breaks
  // like the cluster it is.
  [Tile.PillarCandle, { kind: 'pillarcandle', respawnSec: 300, hits: 1 }],
  [Tile.PillarCandleOut, { kind: 'pillarcandle', respawnSec: 300, hits: 1 }],
  [Tile.TripleCandles, { kind: 'candlecluster', respawnSec: 300, hits: 1 }],
  [Tile.TripleCandlesOut, { kind: 'candlecluster', respawnSec: 300, hits: 1 }],
  // THE KNIGHT'S KEEPING: bare oak pops in two blows; a full harness
  // is JOINED steel over oak and holds three (the shudder is the
  // armorer's warranty working); the standard is a staff — two.
  [Tile.ArmorStand, { kind: 'armorstand', respawnSec: 300, hits: 2 }],
  [Tile.ArmorStandFull, { kind: 'armorstandfull', respawnSec: 420, hits: 3 }],
  // The whole dyed standard band breaks as one kind.
  ...Array.from(
    { length: DYE_COUNT },
    (_, d) =>
      [Tile.BannerStand + d, { kind: 'bannerstand', respawnSec: 420, hits: 2 }] as [
        Tile,
        DestructibleInfo,
      ],
  ),
  // THE SCARRED LAND. The load-bearing law holds for everything NOT
  // here (see tiles.test.ts, each refusal argued): the stone ruin
  // wall, the ember bed, the chimney, the cairns, the gloom stone,
  // the lamp cairn, the fouled well, the pit lamps, the pool, the ash,
  // the litter, the bedroll. What breaks: the burnt frame (its studs
  // hold three like a wall), fallen timber, the collapsed roof (three
  // — it is a whole roof), the carts (three, the plunder cart's kin),
  // the driven posts (two), the fallen cloth (two), old bone (two),
  // spoil (two), the stones that count (three), and the creep root —
  // three blows, and it comes back on the hour: it says the spine
  // without a word. The ward thread parts at one blow and is the one
  // walkable smashable in the world (a thread you can walk through
  // can also be cut; the patch lays floor under a floor-height tile —
  // no feet are displaced).
  [Tile.RuinWallWood, { kind: 'charbeam', respawnSec: 600, hits: 3 }],
  [Tile.CharredBeam, { kind: 'charbeam', respawnSec: 600, hits: 2 }],
  [Tile.CollapsedRoof, { kind: 'roofheap', respawnSec: 600, hits: 3 }],
  [Tile.BrokenCart, { kind: 'cart', respawnSec: 600, hits: 3 }],
  [Tile.ArrowPost, { kind: 'post', respawnSec: 420, hits: 2 }],
  [Tile.FallenBanner, { kind: 'banner', respawnSec: 420, hits: 2 }],
  [Tile.BeastBones, { kind: 'bones', respawnSec: 600, hits: 2 }],
  [Tile.SpoilHeap, { kind: 'rubble', respawnSec: 600, hits: 2 }],
  [Tile.CreepRoot, { kind: 'root', respawnSec: 3600, hits: 3 }],
  [Tile.LegionStandard, { kind: 'banner', respawnSec: 600, hits: 3 }],
  [Tile.BoneTree, { kind: 'bones', respawnSec: 600, hits: 2 }],
  [Tile.TallyStone, { kind: 'stone', respawnSec: 600, hits: 3 }],
  [Tile.WardThread, { kind: 'thread', respawnSec: 600, hits: 1 }],
  [Tile.RedRagStake, { kind: 'stakes', respawnSec: 420, hits: 1 }],
  [Tile.LeanTo, { kind: 'tent', respawnSec: 420, hits: 2 }],
  [Tile.BelongingsCart, { kind: 'cart', respawnSec: 600, hits: 3 }],
  [Tile.FieldCot, { kind: 'cot', respawnSec: 420, hits: 2 }],
  [Tile.SignpostBurnt, { kind: 'post', respawnSec: 420, hits: 2 }],
  [Tile.SluiceGate, { kind: 'post', respawnSec: 420, hits: 2 }],
  [Tile.SluiceGateStrung, { kind: 'post', respawnSec: 420, hits: 2 }],
]);

/** Every smashable prop tile. */
export const DESTRUCTIBLE_TILES: ReadonlySet<Tile> = new Set(DESTRUCTIBLE_INFO.keys());

/** Break-up kind + respawn law of a destructible prop, or null. */
export function destructibleInfo(id: number): DestructibleInfo | null {
  return DESTRUCTIBLE_INFO.get(id as Tile) ?? null;
}

/**
 * The floor a prop stands on — the SAME law the client uses to bake
 * the underlay beneath prop tiles, hoisted here so a smashed barrel
 * reveals exactly the floor the player was already seeing. Ring 1
 * first, then ring 2 (diagonals + two-out: a table hemmed in by its
 * own chairs still finds the room's boards), grass as the open-air
 * fallback.
 */
export function nearestFloorTile(
  ground: (tx: number, ty: number) => number | undefined,
  tx: number,
  ty: number,
): Tile {
  const isFloor = (t: number | undefined) =>
    t === Tile.WoodFloor ||
    t === Tile.StoneFloor ||
    t === Tile.PorchDeck ||
    t === Tile.CaveFloor ||
    t === Tile.DungeonFloor ||
    t === Tile.CaveRubble ||
    t === Tile.Dirt;
  for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]] as const) {
    const t = ground(tx + dx, ty + dy);
    if (isFloor(t)) return t as Tile;
  }
  for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1], [0, 2], [2, 0], [-2, 0], [0, -2]] as const) {
    const t = ground(tx + dx, ty + dy);
    if (isFloor(t)) return t as Tile;
  }
  return Tile.Grass;
}
