/**
 * THE STRUCTURE GRAMMAR (play3d W2 scaffold) — per-tile classification
 * of everything that stands: which FAMILY a tile belongs to, what it is
 * made of, what pierces it (window / door / awning / wall-hung art),
 * and — the part every mesh lane hangs off — RUN CONTINUITY: which of
 * its four neighbours continue the same run, so a face is emitted only
 * on an EXPOSED side and a run reads as one mass with no z-fighting.
 *
 * This module is PURE: it reads a minimal sampler {groundAt, detailAt,
 * elevAt} and returns plain records. No DOM, no Three, no Renderer —
 * node:test proves it. Every rule here is a PORT of the 2D client's
 * own continuity law (docs/play3d-w2-map.md §1.4-1.5), named at the
 * site:
 *
 *  - WALL runs: `wallish` (renderer.ts:8718) = WALL_RUN_TILES minus
 *    SIDE doorways (renderer.ts:~8695 isSideDoorway). A doorway in a
 *    N-S run ENDS the run so the jamb shows a face; a south-facing
 *    doorway carries the run through. Naive WALL_TILES.has on the
 *    neighbour is exactly the bug wallish was written to fix.
 *  - GARRISON: `garrisonish` (renderer.ts:11514) = GARRISON_TILES
 *    minus SIDE gates (the same side law spoken in curtain wall).
 *  - FENCE / PALISADE / HEDGE / IRON: THE SEPARATE-MASONRY LAW —
 *    each family merges ONLY with its own set (barrierArt.ts
 *    palisadeish/ironish/hedgeish :3050-3073). NOTE the 2D `fenceish`
 *    (barrierArt.ts:64) also reaches rails toward house walls; that is
 *    a rail-length choice for the barriers lane, not run continuity —
 *    a fence beside a wall is TWO exposed masses here (both end).
 *  - Barrier DIAGONALS are corner-continuous, not cardinal: DiagNE is
 *    the "/" stroke from the NE corner to the SW corner, DiagNW the
 *    "\" from NW to SE (tiles.ts:628). `corner*` flags say which
 *    diagonal neighbours are same-family so a lane can stride a turn.
 *  - DECK: bridge + dock are one class (terrain.ts:5363 isDeckGround,
 *    exposed = !isDeckGround(neighbour)); the porch ashore is its own.
 *    Whether a dock/bridge LIFTS is a whole-structure flood verdict
 *    (terrain.ts isDockTile/isBridgeTile) — the terrainForms lane
 *    calls those; this classifier never guesses it.
 *  - CLIFF: the Tile.Cliff rim strip; the real faces are derived from
 *    the elev field (heightfield.ts already emits them). Listed so the
 *    terrainForms lane can find its rims per chunk.
 *
 * Coordinates: tile x grows EAST, tile y grows SOUTH (the 2D frame).
 * N = ty-1, S = ty+1, E = tx+1, W = tx-1.
 */
import {
  CHUNK_SIZE,
  FENCE_TILES,
  GARRISON_TILES,
  HEDGE_TILES,
  IRON_FENCE_TILES,
  PALISADE_TILES,
  Tile,
  WALL_RUN_TILES,
  awningInfo,
  diagWallInfo,
  doorInfo,
  wallHungInfo,
  type AwningInfo,
  type DiagWallMass,
  type DiagWallMaterial,
  type DoorInfo,
  type WallHungInfo,
} from '@arx/shared';

// ------------------------------------------------------------ heights
// THE 2D CONSTANTS, restated with their sources so a lane never guesses.
// A test asserts the ones that are importable without a DOM against
// their 2D homes.

/** Story wall height in tiles — renderer.ts:578 (module-private there). */
export const WALL_H = 2.05;
/** The knee-high stub a revealed wall sinks to — paintVocab.ts:167. */
export const WALL_STUB = 0.62;
/** Curtain wall height — paintVocab.ts:178. */
export const GARRISON_H = 3.4;
/** Parapet tooth above the wall-walk — paintVocab.ts:180. */
export const MERLON_H = 0.5;
/** Hedge mass height — barrierArt.ts:2632 (local const HED_H). */
export const HED_H = 0.95;
/** The wood fence post (drawFencePost s·0.92) — barrierArt.ts:353. */
export const FENCE_POST_H = 0.92;
/** The palisade GATE's towering post (POST_H = s·1.72) — barrierArt.ts:905 (inside palisadeGateItem). */
export const PALI_GATE_POST_H = 1.72;
/** The iron GATE's orb pier (PIER_H = s·1.66) — barrierArt.ts:1783 (inside ironGateItem); run/corner piers are 1.52 (:1734). */
export const IRON_GATE_PIER_H = 1.66;
/** One elevation level's rise — elevPick.ts:8. */
export const ELEV_H = 1.35;
/** A water-touching deck's lift — terrain.ts:5360. */
export const DOCK_LIFT = 0.22;

// ---------------------------------------------------------- families

export type StructFamily =
  | 'wall'
  | 'garrison'
  | 'fence'
  | 'palisade'
  | 'hedge'
  | 'iron'
  | 'deck'
  | 'cliff'
  | 'none';

/** A building wall's construction (window variants fold to their base). */
export type WallMaterial = 'stone' | 'wood' | 'cave';

/** Which deck painter owns a deck tile. */
export type DeckKind = 'bridge' | 'dock' | 'porch';

/** A barrier 45° turn: "/" = NE corner to SW corner; "\" = NW to SE. */
export type BarrierDiag = 'NE' | 'NW';

/** The smallest world any classifier needs. WorldSource3D satisfies it. */
export interface StructSampler {
  /** Ground tile id, or undefined off the loaded world (= not a member). */
  groundAt(tx: number, ty: number): number | undefined;
  detailAt(tx: number, ty: number): number;
  elevAt(tx: number, ty: number): number;
}

export interface TileStruct {
  tx: number;
  ty: number;
  /** Ground tile id. */
  tile: number;
  family: StructFamily;
  /** Walls only (null elsewhere). Doorways answer by their door material. */
  material: WallMaterial | null;
  /** WallStoneWindow / WallWoodWindow. */
  isWindow: boolean;
  /** 45° building/garrison wall: which triangle holds the mass. */
  diag: { material: DiagWallMaterial; mass: DiagWallMass } | null;
  /** Barrier 45° stroke (fence/palisade/hedge/iron). */
  barrierDiag: BarrierDiag | null;
  /** Any door/gate posture, every family (tiles.ts doorInfo). */
  door: DoorInfo | null;
  /** True for a panel doorway that stands edge-on in a N-S wall run,
   *  or a garrison gate edge-on in a N-S curtain. */
  sideDoorway: boolean;
  /** An awning tile IS the awning; the host wall stands north of it. */
  awning: AwningInfo | null;
  /** Wall-hung art on this tile's south face (detail layer). */
  wallHung: WallHungInfo | null;
  deckKind: DeckKind | null;
  /** Run continuity: the neighbour continues THIS family's run. */
  runN: boolean;
  runE: boolean;
  runS: boolean;
  runW: boolean;
  /** Diagonal same-family neighbours (barrier turns stride these). */
  cornerNE: boolean;
  cornerNW: boolean;
  cornerSE: boolean;
  cornerSW: boolean;
  /** Elevation level and its world lift (level · elevH). */
  elev: number;
  lift: number;
}

const WALL_SET: ReadonlySet<number> = new Set<number>(WALL_RUN_TILES);
const DECK_GROUND: ReadonlySet<number> = new Set<number>([Tile.Bridge, Tile.Dock]);

const STONE_WALLS: ReadonlySet<number> = new Set<number>([
  Tile.WallStone,
  Tile.WallStoneWindow,
  Tile.WallStoneDiagNE,
  Tile.WallStoneDiagNW,
  Tile.WallStoneDiagSE,
  Tile.WallStoneDiagSW,
]);
const WOOD_WALLS: ReadonlySet<number> = new Set<number>([
  Tile.WallWood,
  Tile.WallWoodWindow,
  Tile.WallWoodDiagNE,
  Tile.WallWoodDiagNW,
  Tile.WallWoodDiagSE,
  Tile.WallWoodDiagSW,
]);
const CAVE_WALLS: ReadonlySet<number> = new Set<number>([Tile.CaveWall, Tile.CrackedCaveWall]);

const BARRIER_DIAG = new Map<number, BarrierDiag>([
  [Tile.FenceDiagNE, 'NE'],
  [Tile.FenceDiagNW, 'NW'],
  [Tile.PalisadeDiagNE, 'NE'],
  [Tile.PalisadeDiagNW, 'NW'],
  [Tile.HedgeDiagNE, 'NE'],
  [Tile.HedgeDiagNW, 'NW'],
  [Tile.IronFenceDiagNE, 'NE'],
  [Tile.IronFenceDiagNW, 'NW'],
]);

/**
 * The renderer's PANEL_DOOR_TILES (paintVocab.ts:145) restated from the
 * shared door table: building doorways only — fence/garrison/palisade/
 * hedge/iron gates belong to their own family pipelines.
 */
export function isPanelDoor(t: number | undefined): boolean {
  if (t === undefined) return false;
  const d = doorInfo(t);
  return d !== null && (d.material === 'stone' || d.material === 'wood');
}

/** The family a bare tile id belongs to (no neighbour reads). */
export function familyOf(t: number | undefined): StructFamily {
  if (t === undefined) return 'none';
  if (WALL_SET.has(t)) return 'wall';
  if (GARRISON_TILES.has(t as Tile)) return 'garrison';
  if (FENCE_TILES.has(t as Tile)) return 'fence';
  if (PALISADE_TILES.has(t as Tile)) return 'palisade';
  if (HEDGE_TILES.has(t as Tile)) return 'hedge';
  if (IRON_FENCE_TILES.has(t as Tile)) return 'iron';
  if (DECK_GROUND.has(t) || t === Tile.PorchDeck) return 'deck';
  if (t === Tile.Cliff) return 'cliff';
  return 'none';
}

/** A building wall's material; doorways answer by their door. */
export function wallMaterialOf(t: number): WallMaterial | null {
  if (STONE_WALLS.has(t)) return 'stone';
  if (WOOD_WALLS.has(t)) return 'wood';
  if (CAVE_WALLS.has(t)) return 'cave';
  const d = doorInfo(t);
  if (d && (d.material === 'stone' || d.material === 'wood')) return d.material;
  return null;
}

/**
 * SIDE-DOORWAY LAW (renderer.ts isSideDoorway, ported verbatim): a
 * panel doorway with wall (or more of the same doorway) north AND
 * south and NOT east-and-west stands edge-on — you walk through it
 * east-west, and the run it pierces ends at it.
 */
export function isSideDoorway(s: StructSampler, tx: number, ty: number): boolean {
  const t = s.groundAt(tx, ty);
  if (t === undefined || !isPanelDoor(t)) return false;
  const solidWall = (tt: number | undefined): boolean => tt !== undefined && WALL_SET.has(tt) && !isPanelDoor(tt);
  const along = (tt: number | undefined): boolean => solidWall(tt) || tt === t;
  const vert = along(s.groundAt(tx, ty - 1)) && along(s.groundAt(tx, ty + 1));
  const horiz = along(s.groundAt(tx + 1, ty)) && along(s.groundAt(tx - 1, ty));
  return vert && !horiz;
}

/** SIDE-GATE LAW (renderer.ts isGarrisonSideGate, ported verbatim). */
export function isGarrisonSideGate(s: StructSampler, tx: number, ty: number): boolean {
  const t = s.groundAt(tx, ty);
  if (t === undefined) return false;
  const info = doorInfo(t);
  if (info === null || info.material !== 'garrison') return false;
  const curtain = (tt: number | undefined): boolean =>
    tt !== undefined && GARRISON_TILES.has(tt as Tile) && doorInfo(tt) === null;
  const along = (tt: number | undefined): boolean => curtain(tt) || tt === t;
  const vert = along(s.groundAt(tx, ty - 1)) && along(s.groundAt(tx, ty + 1));
  const horiz = along(s.groundAt(tx + 1, ty)) && along(s.groundAt(tx - 1, ty));
  return vert && !horiz;
}

/** `wallish` (renderer.ts:8718): a wall-run member that is not a side doorway. */
export function wallish(s: StructSampler, tx: number, ty: number): boolean {
  const t = s.groundAt(tx, ty);
  if (t === undefined || !WALL_SET.has(t)) return false;
  return !(isPanelDoor(t) && isSideDoorway(s, tx, ty));
}

/** `garrisonish` (renderer.ts:11514): curtain mass that is not a side gate. */
export function garrisonish(s: StructSampler, tx: number, ty: number): boolean {
  const t = s.groundAt(tx, ty);
  if (t === undefined || !GARRISON_TILES.has(t as Tile)) return false;
  return !(doorInfo(t) !== null && isGarrisonSideGate(s, tx, ty));
}

/**
 * THE DIAGONAL TOUCHES ONLY TWO EDGES: a diagonal wall's solid
 * triangle covers two of its four edges; the other two are open air
 * behind the hypotenuse. A neighbour reached by stepping (dx,dy) from
 * the caller shares the edge on ITS opposite side — and only a mass
 * that includes that edge continues the caller's run (a wall west of a
 * DiagNE abuts the diag's open W edge and must show its own end face).
 */
export function diagMassTouches(mass: DiagWallMass, dx: number, dy: number): boolean {
  if (dx === 1) return mass === 'NW' || mass === 'SW'; // the neighbour's W edge
  if (dx === -1) return mass === 'NE' || mass === 'SE'; // its E edge
  if (dy === 1) return mass === 'NE' || mass === 'NW'; // its N edge
  if (dy === -1) return mass === 'SE' || mass === 'SW'; // its S edge
  return true;
}

/**
 * Does the tile at (tx,ty) CONTINUE a run of `family` seeded from a
 * tile of `kind` (the deck kind, for the deck family's two classes)?
 * This is the one shared-edge question: a face is emitted on a side
 * whose neighbour answers false. `(dx,dy)` is the step the caller took
 * to reach (tx,ty) — a diagonal wall or curtain continues only across
 * an edge its mass touches (diagMassTouches); (0,0) asks without a side.
 */
export function continues(s: StructSampler, family: StructFamily, kind: DeckKind | null, tx: number, ty: number, dx = 0, dy = 0): boolean {
  switch (family) {
    case 'wall': {
      if (!wallish(s, tx, ty)) return false;
      const d = diagWallInfo(s.groundAt(tx, ty) ?? -1);
      return d === null || diagMassTouches(d.mass, dx, dy);
    }
    case 'garrison': {
      if (!garrisonish(s, tx, ty)) return false;
      const d = diagWallInfo(s.groundAt(tx, ty) ?? -1);
      return d === null || diagMassTouches(d.mass, dx, dy);
    }
    case 'fence':
    case 'palisade':
    case 'hedge':
    case 'iron':
      return familyOf(s.groundAt(tx, ty)) === family;
    case 'deck': {
      const t = s.groundAt(tx, ty);
      if (kind === 'porch') return t === Tile.PorchDeck;
      return t !== undefined && DECK_GROUND.has(t);
    }
    case 'cliff':
      return s.groundAt(tx, ty) === Tile.Cliff;
    case 'none':
      return false;
  }
}

function deckKindOf(t: number): DeckKind | null {
  if (t === Tile.Bridge) return 'bridge';
  if (t === Tile.Dock) return 'dock';
  if (t === Tile.PorchDeck) return 'porch';
  return null;
}

/** Classify one tile. `family === 'none'` for everything that does not stand. */
export function classifyTile(s: StructSampler, tx: number, ty: number, elevH = ELEV_H): TileStruct {
  const tile = s.groundAt(tx, ty) ?? -1;
  const family = familyOf(tile === -1 ? undefined : tile);
  const elev = s.elevAt(tx, ty);
  const deckKind = family === 'deck' ? deckKindOf(tile) : null;
  const rec: TileStruct = {
    tx,
    ty,
    tile,
    family,
    material: family === 'wall' ? wallMaterialOf(tile) : null,
    isWindow: tile === Tile.WallStoneWindow || tile === Tile.WallWoodWindow,
    diag: family === 'wall' || family === 'garrison' ? diagWallInfo(tile) : null,
    barrierDiag: BARRIER_DIAG.get(tile) ?? null,
    door: family === 'none' ? null : doorInfo(tile),
    sideDoorway: false,
    awning: awningInfo(tile),
    wallHung: family === 'wall' || family === 'garrison' ? wallHungInfo(s.detailAt(tx, ty)) : null,
    deckKind,
    runN: false,
    runE: false,
    runS: false,
    runW: false,
    cornerNE: false,
    cornerNW: false,
    cornerSE: false,
    cornerSW: false,
    elev,
    lift: elev * elevH,
  };
  if (family === 'none') return rec;
  if (family === 'wall') rec.sideDoorway = isSideDoorway(s, tx, ty);
  else if (family === 'garrison') rec.sideDoorway = isGarrisonSideGate(s, tx, ty);
  // A side doorway is itself NOT a run member (wallish false), yet its
  // own faces still answer to the run it pierces: north/south continue
  // into the wall, east/west are the open passage.
  const own = family === 'wall' ? wallish(s, tx, ty) : family === 'garrison' ? garrisonish(s, tx, ty) : true;
  rec.runN = continues(s, family, deckKind, tx, ty - 1, 0, -1);
  rec.runS = continues(s, family, deckKind, tx, ty + 1, 0, 1);
  rec.runE = own && continues(s, family, deckKind, tx + 1, ty, 1, 0);
  rec.runW = own && continues(s, family, deckKind, tx - 1, ty, -1, 0);
  // A diagonal's OWN open edges continue nothing either (the mirror of diagMassTouches).
  if (rec.diag) {
    const m = rec.diag.mass;
    if (m === 'SE' || m === 'SW') rec.runN = false;
    if (m === 'NE' || m === 'NW') rec.runS = false;
    if (m === 'NW' || m === 'SW') rec.runE = false;
    if (m === 'NE' || m === 'SE') rec.runW = false;
  }
  if (family === 'fence' || family === 'palisade' || family === 'hedge' || family === 'iron') {
    rec.cornerNE = familyOf(s.groundAt(tx + 1, ty - 1)) === family;
    rec.cornerNW = familyOf(s.groundAt(tx - 1, ty - 1)) === family;
    rec.cornerSE = familyOf(s.groundAt(tx + 1, ty + 1)) === family;
    rec.cornerSW = familyOf(s.groundAt(tx - 1, ty + 1)) === family;
  }
  return rec;
}

// --------------------------------------------------------- chunk scan

/** A chunk's standing tiles, listed by family (scan order: row-major, west to east). */
export interface ChunkStructScan {
  cx: number;
  cy: number;
  /** World tile origin of the chunk. */
  x0: number;
  y0: number;
  size: number;
  /** Every tile with a family other than 'none', in scan order. */
  tiles: TileStruct[];
  byFamily: ReadonlyMap<StructFamily, TileStruct[]>;
}

/**
 * List a chunk's structures. The sampler must answer the 1-tile BORDER
 * around the chunk (continuity reads neighbours) — hand it the world,
 * or a `snapshotWithBorder` of it.
 */
export function scanChunkStructs(s: StructSampler, cx: number, cy: number, size = CHUNK_SIZE, elevH = ELEV_H): ChunkStructScan {
  const x0 = cx * size;
  const y0 = cy * size;
  const tiles: TileStruct[] = [];
  const byFamily = new Map<StructFamily, TileStruct[]>();
  for (let ly = 0; ly < size; ly++) {
    for (let lx = 0; lx < size; lx++) {
      const t = s.groundAt(x0 + lx, y0 + ly);
      if (familyOf(t) === 'none') continue;
      const rec = classifyTile(s, x0 + lx, y0 + ly, elevH);
      tiles.push(rec);
      let list = byFamily.get(rec.family);
      if (!list) byFamily.set(rec.family, (list = []));
      list.push(rec);
    }
  }
  return { cx, cy, x0, y0, size, tiles, byFamily };
}

/**
 * THE BORDER IS READ ONCE: copy a chunk plus its 1-tile ring out of the
 * world into flat arrays, so a build reads a consistent snapshot (the
 * live store may be patched mid-build) and never reaches further than
 * one tile past the chunk. Outside the ring: ground undefined, detail
 * 0, elev 0 — the 2D client's absent-chunk answers.
 */
export function snapshotWithBorder(world: StructSampler, cx: number, cy: number, size = CHUNK_SIZE, border = 1): StructSampler {
  const w = size + border * 2;
  const x0 = cx * size - border;
  const y0 = cy * size - border;
  const ground = new Int32Array(w * w);
  const detail = new Uint16Array(w * w);
  const elev = new Int8Array(w * w);
  for (let ly = 0; ly < w; ly++) {
    for (let lx = 0; lx < w; lx++) {
      const i = ly * w + lx;
      const g = world.groundAt(x0 + lx, y0 + ly);
      ground[i] = g === undefined ? -1 : g;
      detail[i] = world.detailAt(x0 + lx, y0 + ly);
      elev[i] = world.elevAt(x0 + lx, y0 + ly);
    }
  }
  const idx = (tx: number, ty: number): number => {
    const lx = tx - x0;
    const ly = ty - y0;
    if (lx < 0 || ly < 0 || lx >= w || ly >= w) return -1;
    return ly * w + lx;
  };
  return {
    groundAt: (tx, ty) => {
      const i = idx(tx, ty);
      if (i < 0) return undefined;
      const g = ground[i]!;
      return g < 0 ? undefined : g;
    },
    detailAt: (tx, ty) => {
      const i = idx(tx, ty);
      return i < 0 ? 0 : detail[i]!;
    },
    elevAt: (tx, ty) => {
      const i = idx(tx, ty);
      return i < 0 ? 0 : elev[i]!;
    },
  };
}

/**
 * THE BORDER WAKES ONLY WHEN IT STANDS (INTEGRATE): when chunk (x0,y0)
 * is built, does the neighbour at offset (dx,dy) — read through this
 * chunk's bordered snapshot — have anything at the shared seam that
 * this chunk's arrival could change? True when any ring cell on that
 * side holds a standing family tile, or steps in elevation against the
 * chunk cell it touches (a cliff face is owned by the high tile, so a
 * step at the seam is a face the neighbour may have to re-decide).
 * Every other seam is grass against grass: nothing to rebuild.
 */
export function ringStands(s: StructSampler, x0: number, y0: number, size: number, dx: number, dy: number): boolean {
  const rx0 = dx < 0 ? x0 - 1 : dx > 0 ? x0 + size : x0;
  const rx1 = dx === 0 ? x0 + size - 1 : rx0;
  const ry0 = dy < 0 ? y0 - 1 : dy > 0 ? y0 + size : y0;
  const ry1 = dy === 0 ? y0 + size - 1 : ry0;
  for (let ry = ry0; ry <= ry1; ry++) {
    for (let rx = rx0; rx <= rx1; rx++) {
      if (familyOf(s.groundAt(rx, ry)) !== 'none') return true;
      if (s.elevAt(rx, ry) !== s.elevAt(rx - dx, ry - dy)) return true;
    }
  }
  return false;
}

/** A sampler over a small authored grid — tests and labs. */
export function gridSampler(rows: ReadonlyArray<ReadonlyArray<number>>, opts?: { detail?: ReadonlyArray<ReadonlyArray<number>>; elev?: ReadonlyArray<ReadonlyArray<number>>; ox?: number; oy?: number }): StructSampler {
  const ox = opts?.ox ?? 0;
  const oy = opts?.oy ?? 0;
  const at = (g: ReadonlyArray<ReadonlyArray<number>> | undefined, tx: number, ty: number): number | undefined => {
    if (!g) return undefined;
    const row = g[ty - oy];
    return row ? row[tx - ox] : undefined;
  };
  return {
    groundAt: (tx, ty) => at(rows, tx, ty),
    detailAt: (tx, ty) => at(opts?.detail, tx, ty) ?? 0,
    elevAt: (tx, ty) => at(opts?.elev, tx, ty) ?? 0,
  };
}
