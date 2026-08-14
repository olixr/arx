import { Rng, TILE_DEFS, TILE_SKIP, Tile, hashCoords, hashString } from '@arx/shared';
import type { PrefabDef } from '../../maps/prefab.js';
import type { StrongholdDef, StrongholdKnot, StrongholdWard } from './types.js';
import { KNOT_SPACING, STRONGHOLD_BODIES_MAX, STRONGHOLD_BODIES_MIN } from './types.js';
import { WARD_PIECES, type WardPiece } from './pieces.js';

/**
 * THE FOUNDRY (docs/strongholds-plan.md Phase 1 + Second Charter
 * Phase 7) — the generator that PROPOSES stronghold layouts. Pure and
 * deterministic: the same seed and spec always assemble the same
 * walls, wards, and muster plan, on named streams so a tweak to one
 * stage never reshuffles another (the composePoi stream discipline,
 * at layout scale).
 *
 * The Second Charter re-taught it scale (THE ZONE LAW — a citadel is
 * 2.5-3 max-zoom-out screens across), depth (THE DISTRICT LAW — chord
 * walls cut the interior into gated bands; THE STEPPED SUMMIT — the
 * last stand climbs two fenced terraces), and breath (THE BREATHING
 * LAW — wide piece gaps, a hearth plaza per district, neighborhood-
 * scale pieces with open hearts; THE OUTER WORKS — pickets and worn
 * roads in the approach ground, so the fight starts before the walls).
 *
 * The generator builds:
 *   1. THE HULL — an octagonal wall ring (straight runs + 45° corner
 *      cuts) in the family's material: spiked palisade, wolfkin
 *      thicket-and-bone, or the dead's old cairn stones.
 *   2. THE CHORDS — internal walls cutting the yard into districts
 *      (outer bailey → inner bailey → summit), each pierced by its
 *      own gate and sometimes a postern gap.
 *   3. THE DOORS — a great gate on the south run, a lesser gate on
 *      another bearing, and sometimes a breach (THE OPEN GATE LAW:
 *      every leaf stands open; the breach is the meanest way in).
 *   4. THE GROUND — a hearth plaza per district, worn lanes knitting
 *      each district's gates, heart, and wards into one dendritic
 *      network; worn roads running the gates out into the approach.
 *      Courtyards stay TILE_SKIP so the meadow shows through.
 *   5. THE WARDS — dressed pieces from the shelf (pieces.ts), boss
 *      court on the summit opposite the great gate, watch yards
 *      inside the doors, pickets on the roads outside them.
 *   6. THE MUSTER — knots of 1-3 planned per ward at ≥ KNOT_SPACING
 *      (THE PULL LAW is generated true, then validator-pinned).
 *
 * The output is a PROPOSAL: the bench renders it, a curator polishes
 * it in Map Studio if wanted, and only a save banks it into the
 * repository (THE FOUNDRY LAW — nothing ships sight-unseen).
 */

export type StrongholdSizeClass = 'hold' | 'citadel';

export interface StrongholdSpec {
  id: string;
  name: string;
  description?: string;
  family: string;
  tiers: readonly [number, number];
  weight: number;
  sizeClass: StrongholdSizeClass;
  /** Boss champion name pool (the roster/bench supplies it). */
  bossNames: readonly string[];
}

export interface StrongholdProposal {
  def: StrongholdDef;
  prefab: PrefabDef;
}

interface KnotMenuEntry {
  npc: string;
  band: readonly [number, number];
  minTier?: number;
}

interface FamilyStyle {
  wall: 'palisade' | 'thicket' | 'cairn';
  /** Plaza heart: the bonfire, the bone heap, the cold brazier. */
  hearth: Tile;
  wardPieces: readonly string[];
  watchPiece: string;
  bossPiece: string;
  /** Ward muster menu; entry 0 is the line troops. */
  menu: readonly KnotMenuEntry[];
  /** Gate sentries. */
  sentinel: KnotMenuEntry;
  /** The chief's honor guard. */
  guard: KnotMenuEntry;
  bossNpc: string;
  bossOffset: number;
  /** Courtyard scatter accents. */
  accents: readonly Tile[];
}

/**
 * The families the Foundry can build for today. Adding one is a
 * style row + pieces — the generator never learns a special case.
 */
export const FAMILY_STYLES: ReadonlyMap<string, FamilyStyle> = new Map<string, FamilyStyle>([
  [
    'goblin',
    {
      wall: 'palisade',
      hearth: Tile.Bonfire,
      wardPieces: [
        'ward_gs_tents',
        'ward_gs_cookyard',
        'ward_gs_totem',
        'ward_gs_pens',
        'ward_gs_muster',
        'ward_gs_greatring',
        'ward_gs_drillyard',
        'ward_gs_twinpens',
      ],
      watchPiece: 'ward_gs_watch',
      bossPiece: 'ward_gs_bosscourt',
      menu: [
        { npc: 'goblin', band: [2, 3] },
        { npc: 'goblin_thrower', band: [1, 2] },
        { npc: 'goblin_firecaller', band: [1, 1], minTier: 4 },
      ],
      sentinel: { npc: 'goblin_thrower', band: [1, 2] },
      guard: { npc: 'goblin', band: [2, 3] },
      bossNpc: 'goblin',
      bossOffset: 5,
      accents: [Tile.SkullPile, Tile.BonePile, Tile.WarBanner],
    },
  ],
  [
    'gnoll',
    {
      wall: 'palisade',
      hearth: Tile.Bonfire,
      wardPieces: [
        'ward_gs_tents',
        'ward_gs_cookyard',
        'ward_gs_totem',
        'ward_gs_muster',
        'ward_gs_greatring',
        'ward_gs_drillyard',
      ],
      watchPiece: 'ward_gs_watch',
      bossPiece: 'ward_gs_bosscourt',
      menu: [
        { npc: 'gnoll', band: [2, 3] },
        { npc: 'gnoll', band: [1, 2] },
      ],
      sentinel: { npc: 'gnoll', band: [1, 2] },
      guard: { npc: 'gnoll', band: [2, 3] },
      bossNpc: 'gnoll_champion',
      bossOffset: 3,
      accents: [Tile.SkullPile, Tile.BonePile],
    },
  ],
  [
    'brigand',
    {
      wall: 'palisade',
      hearth: Tile.Bonfire,
      wardPieces: [
        'ward_br_tents',
        'ward_br_stores',
        'ward_br_pen',
        'ward_gs_muster',
        'ward_br_wagonyard',
        'ward_br_sparring',
      ],
      watchPiece: 'ward_br_watch',
      bossPiece: 'ward_br_bosscourt',
      menu: [
        { npc: 'brigand', band: [2, 3] },
        { npc: 'brigand_archer', band: [1, 2] },
        { npc: 'brigand_reaver', band: [1, 1], minTier: 4 },
      ],
      sentinel: { npc: 'brigand_archer', band: [1, 2] },
      guard: { npc: 'brigand', band: [2, 3] },
      bossNpc: 'brigand_reaver',
      bossOffset: 5,
      accents: [Tile.Crate, Tile.Barrel, Tile.PlunderSacks],
    },
  ],
  [
    'wolfkin',
    {
      wall: 'thicket',
      hearth: Tile.BonePile,
      wardPieces: [
        'ward_wk_nests',
        'ward_wk_racks',
        'ward_wk_bonefield',
        'ward_wk_hollowfield',
        'ward_wk_greatboneyard',
      ],
      watchPiece: 'ward_wk_bonefield',
      bossPiece: 'ward_wk_denheart',
      menu: [
        { npc: 'wolf', band: [2, 3] },
        { npc: 'worg', band: [1, 2], minTier: 4 },
        { npc: 'wolf', band: [1, 2] },
      ],
      sentinel: { npc: 'worg', band: [1, 1], minTier: 4 },
      guard: { npc: 'wolf', band: [2, 3] },
      bossNpc: 'dire_wolf',
      bossOffset: 4,
      accents: [Tile.BonePile, Tile.SkullPile],
    },
  ],
  [
    'dead',
    {
      wall: 'cairn',
      hearth: Tile.Brazier,
      wardPieces: [
        'ward_dd_stones',
        'ward_dd_shrine',
        'ward_dd_graves',
        'ward_dd_processional',
        'ward_dd_cairnfield',
      ],
      watchPiece: 'ward_dd_graves',
      bossPiece: 'ward_dd_court',
      menu: [
        { npc: 'skeleton', band: [2, 3] },
        { npc: 'skeleton_guard', band: [1, 2] },
        { npc: 'skeleton_archer', band: [1, 1] },
        { npc: 'skeleton_chanter', band: [1, 1], minTier: 5 },
      ],
      sentinel: { npc: 'skeleton_archer', band: [1, 1] },
      guard: { npc: 'skeleton_guard', band: [2, 3] },
      bossNpc: 'skeleton_champion',
      bossOffset: 2,
      accents: [Tile.BonePile, Tile.CaveRubble],
    },
  ],
]);

/** The Foundry's own stream family (beside ST_EXIST..ST_HOLD). */
const ST_FOUNDRY = 0x501e70;

/**
 * Approach ground around the walls (THE OUTER WORKS live here); the
 * outermost ring stays skip (ALL-SKIP-PERIMETER).
 */
const FRINGE = 8;

// The layout id folds into every stream: the same seed under two
// different ids proposes two different strongholds (each roster entry
// is its own line of proposals, not a re-skin of a shared one).
const stream = (seed: number, id: string, n: number): Rng =>
  new Rng(hashCoords((seed ^ ST_FOUNDRY) >>> 0, n, hashString(id)));

function passable(t: number): boolean {
  if (t === TILE_SKIP) return true;
  const def = TILE_DEFS[t as Tile];
  return def ? !def.solid : false;
}

type Edge = 'top' | 'bottom' | 'left' | 'right';

interface Gate {
  x: number;
  y: number;
  edge: Edge;
  /** Outward unit vector. */
  ox: number;
  oy: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const overlaps = (a: Rect, b: Rect, gap: number): boolean =>
  a.x - gap < b.x + b.w && b.x - gap < a.x + a.w && a.y - gap < b.y + b.h && b.y - gap < a.y + a.h;

const pad = (r: Rect, by: number): Rect => ({
  x: r.x - by,
  y: r.y - by,
  w: r.w + by * 2,
  h: r.h + by * 2,
});

function bearingOf(dx: number, dy: number): string {
  const angle = Math.atan2(dy, dx);
  const idx = Math.round(angle / (Math.PI / 4)) & 7;
  return ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'][idx]!;
}

const EDGE_BEARING: Record<Edge, string> = {
  bottom: 'south',
  top: 'north',
  left: 'west',
  right: 'east',
};

/** What a placed rect IS — the def assembly reads this. */
type PlacedKind = 'boss' | 'watch' | 'chordwatch' | 'picket' | 'ward';

interface Placed {
  kind: PlacedKind;
  rect: Rect;
  /** The dressed piece (absent for chord watches and pickets). */
  piece?: WardPiece;
  watchGate?: Gate;
  /** District band index (0 = summit/north … last = gate/south). */
  band: number;
  /** Explicit chapter name (pickets, chord watches). */
  name?: string;
  /** Explicit key hint (chord watches, pickets). */
  keyHint?: string;
}

export function genStronghold(seed: number, spec: StrongholdSpec): StrongholdProposal {
  const style = FAMILY_STYLES.get(spec.family);
  if (!style) {
    throw new Error(
      `the Foundry knows no '${spec.family}' style (families: ${[...FAMILY_STYLES.keys()].join(', ')})`,
    );
  }
  const rHull = stream(seed, spec.id, 1);
  const rGate = stream(seed, spec.id, 2);
  const rWard = stream(seed, spec.id, 3);
  const rKnot = stream(seed, spec.id, 4);
  const rDress = stream(seed, spec.id, 5);
  const rTerrace = stream(seed, spec.id, 6);
  const rDistrict = stream(seed, spec.id, 7);
  const rOuter = stream(seed, spec.id, 8);

  const citadel = spec.sizeClass === 'citadel';

  // ---- 1. THE HULL ----------------------------------------------------
  // THE ZONE LAW: a max-zoom-out screen is ~57 tiles across — a
  // citadel's walls span 2.5-3 screens, a hold's 1.5-2.
  const [dimMin, dimMax] = citadel ? [136, 164] : [84, 108];
  const wallW = rHull.int(dimMin, dimMax);
  let wallH = rHull.int(dimMin, dimMax);
  wallH = Math.max(Math.round(wallW * 0.72), Math.min(Math.round(wallW * 1.25), wallH));
  const pw = wallW + FRINGE * 2;
  const ph = wallH + FRINGE * 2;
  const x0 = FRINGE;
  const y0 = FRINGE;
  const x1 = FRINGE + wallW - 1;
  const y1 = FRINGE + wallH - 1;
  const cMax = Math.min(16, Math.floor(Math.min(wallW, wallH) / 4));
  const cTL = rHull.int(6, cMax);
  const cTR = rHull.int(6, cMax);
  const cBL = rHull.int(6, cMax);
  const cBR = rHull.int(6, cMax);

  const ground = new Uint16Array(pw * ph).fill(TILE_SKIP);
  const put = (x: number, y: number, t: number): void => {
    if (x < 1 || y < 1 || x >= pw - 1 || y >= ph - 1) return; // perimeter stays skip
    ground[y * pw + x] = t;
  };
  const at = (x: number, y: number): number =>
    x >= 0 && y >= 0 && x < pw && y < ph ? ground[y * pw + x]! : TILE_SKIP;

  const insideHull = (x: number, y: number, margin: number): boolean =>
    x >= x0 + margin && x <= x1 - margin && y >= y0 + margin && y <= y1 - margin &&
    x - x0 + (y - y0) >= cTL + margin &&
    x1 - x + (y - y0) >= cTR + margin &&
    x - x0 + (y1 - y) >= cBL + margin &&
    x1 - x + (y1 - y) >= cBR + margin;

  // Wall cells in walk order (dressing paces this list).
  const wallCells: Array<{ x: number; y: number; diag: 'ne' | 'nw' | null }> = [];
  for (let x = x0 + cTL + 1; x <= x1 - cTR - 1; x++) wallCells.push({ x, y: y0, diag: null });
  for (let i = 0; i <= cTR; i++) wallCells.push({ x: x1 - cTR + i, y: y0 + i, diag: 'nw' });
  for (let y = y0 + cTR + 1; y <= y1 - cBR - 1; y++) wallCells.push({ x: x1, y, diag: null });
  for (let i = 0; i <= cBR; i++) wallCells.push({ x: x1 - i, y: y1 - cBR + i, diag: 'ne' });
  for (let x = x1 - cBR - 1; x >= x0 + cBL + 1; x--) wallCells.push({ x, y: y1, diag: null });
  for (let i = 0; i <= cBL; i++) wallCells.push({ x: x0 + cBL - i, y: y1 - i, diag: 'nw' });
  for (let y = y1 - cBL - 1; y >= y0 + cTL + 1; y--) wallCells.push({ x: x0, y, diag: null });
  for (let i = 0; i <= cTL; i++) wallCells.push({ x: x0 + i, y: y0 + cTL - i, diag: 'ne' });

  const wallTile = (diag: 'ne' | 'nw' | null, idx: number): Tile => {
    if (style.wall === 'palisade') {
      if (diag === 'ne') return Tile.PalisadeDiagNE;
      if (diag === 'nw') return Tile.PalisadeDiagNW;
      return Tile.Palisade;
    }
    if (style.wall === 'thicket') return idx % 5 === 4 ? Tile.BonePile : Tile.Tree;
    return idx % 4 === 3 ? Tile.PillarStone : Tile.Rock; // cairn
  };
  wallCells.forEach((c, i) => put(c.x, c.y, wallTile(c.diag, i)));

  // ---- 2. THE CHORDS (THE DISTRICT LAW) ------------------------------
  // Internal walls cut the yard into gated bands: outer bailey (the
  // great gate's), inner bailey, and the summit district. Depth is
  // structural — the assault is a progression of enclosures.
  const gateTile = style.wall === 'palisade' ? Tile.PalisadeGate : Tile.ArchStone;
  const breachTile = style.wall === 'cairn' ? Tile.CaveRubble : Tile.GrassTall;
  const cornerMax = Math.max(cTL, cTR, cBL, cBR);
  const chordFracs = citadel ? [rDistrict.range(0.34, 0.42), rDistrict.range(0.6, 0.68)] : [rDistrict.range(0.42, 0.5)];
  const chords: number[] = [];
  for (const f of chordFracs) {
    const yy = Math.min(y1 - cornerMax - 4, Math.max(y0 + cornerMax + 4, y0 + Math.round(wallH * f)));
    // Two chords never crowd each other — a band is a district, not a
    // corridor.
    if (chords.length > 0 && yy - chords[chords.length - 1]! < 24) continue;
    chords.push(yy);
  }
  const nBands = chords.length + 1;
  const bandOf = (y: number): number => chords.filter((c) => y > c).length;
  const bandLo = (b: number): number => (b === 0 ? y0 + 1 : chords[b - 1]! + 1);
  const bandHi = (b: number): number => (b === nBands - 1 ? y1 - 1 : chords[b]! - 1);

  interface ChordGate {
    x: number;
    y: number;
  }
  const chordGates: ChordGate[] = [];
  const mid = (lo: number, hi: number, r: Rng): number => {
    const span = hi - lo;
    return lo + Math.floor(span / 2) + r.int(-Math.floor(span / 4), Math.floor(span / 4));
  };
  for (const cyy of chords) {
    for (let x = x0; x <= x1; x++) {
      if (insideHull(x, cyy, 0) && at(x, cyy) === TILE_SKIP) put(x, cyy, wallTile(null, x));
    }
    const gx = mid(x0 + 8, x1 - 8, rDistrict);
    put(gx, cyy, gateTile);
    chordGates.push({ x: gx, y: cyy });
    // A postern gap — the quiet way between districts, sometimes.
    if (rDistrict.chance(0.45)) {
      const side = rDistrict.chance(0.5) ? -1 : 1;
      const px = gx + side * rDistrict.int(14, Math.max(15, Math.floor(wallW / 3)));
      if (insideHull(px, cyy, 2)) put(px, cyy, breachTile);
    }
  }

  // ---- 3. THE DOORS ---------------------------------------------------
  const gates: Gate[] = [];
  // The great gate faces south — the bearing players arrive from, and
  // the bearing the GREAT GATE art was carved for.
  const ggx = mid(x0 + cBL + 3, x1 - cBR - 3, rGate);
  put(ggx, y1, gateTile);
  gates.push({ x: ggx, y: y1, edge: 'bottom', ox: 0, oy: 1 });
  // A side gate never opens beside a chord's back.
  const clearOfChords = (gy: number): boolean => chords.every((c) => Math.abs(gy - c) >= 4);
  const lesserEdge: Edge = (['top', 'left', 'right'] as const)[rGate.int(0, 2)]!;
  if (lesserEdge === 'top') {
    const gx = mid(x0 + cTL + 3, x1 - cTR - 3, rGate);
    put(gx, y0, gateTile);
    gates.push({ x: gx, y: y0, edge: 'top', ox: 0, oy: -1 });
  } else if (lesserEdge === 'left') {
    let gy = mid(y0 + cTL + 3, y1 - cBL - 3, rGate);
    for (let tries = 0; tries < 12 && !clearOfChords(gy); tries++) gy = rGate.int(y0 + cTL + 3, y1 - cBL - 3);
    if (clearOfChords(gy)) {
      put(x0, gy, gateTile);
      gates.push({ x: x0, y: gy, edge: 'left', ox: -1, oy: 0 });
    }
  } else {
    let gy = mid(y0 + cTR + 3, y1 - cBR - 3, rGate);
    for (let tries = 0; tries < 12 && !clearOfChords(gy); tries++) gy = rGate.int(y0 + cTR + 3, y1 - cBR - 3);
    if (clearOfChords(gy)) {
      put(x1, gy, gateTile);
      gates.push({ x: x1, y: gy, edge: 'right', ox: 1, oy: 0 });
    }
  }
  // The breach — the meanest way in, on a bearing nobody watches.
  if (rGate.chance(0.55)) {
    const edges: Edge[] = (['top', 'left', 'right'] as const).filter((e) => e !== lesserEdge);
    const edge = edges[rGate.int(0, edges.length - 1)]!;
    if (edge === 'top') {
      const bx = mid(x0 + cTL + 3, x1 - cTR - 4, rGate);
      put(bx, y0, breachTile);
      put(bx + 1, y0, breachTile);
      put(bx, y0 - 1, style.accents[0]!);
    } else if (edge === 'left') {
      let by = mid(y0 + cTL + 3, y1 - cBL - 4, rGate);
      for (let tries = 0; tries < 12 && !clearOfChords(by); tries++) by = rGate.int(y0 + cTL + 3, y1 - cBL - 4);
      if (clearOfChords(by)) {
        put(x0, by, breachTile);
        put(x0, by + 1, breachTile);
        put(x0 - 1, by, style.accents[0]!);
      }
    } else {
      let by = mid(y0 + cTR + 3, y1 - cBR - 4, rGate);
      for (let tries = 0; tries < 12 && !clearOfChords(by); tries++) by = rGate.int(y0 + cTR + 3, y1 - cBR - 4);
      if (clearOfChords(by)) {
        put(x1, by, breachTile);
        put(x1, by + 1, breachTile);
        put(x1 + 1, by, style.accents[0]!);
      }
    }
  }

  // ---- 4a. WARD GEOMETRY (rects before ground, so lanes know) --------
  const cx = (x0 + x1) >> 1;
  const pieceOf = (id: string): WardPiece => {
    const p = WARD_PIECES.get(id);
    if (!p) throw new Error(`unknown ward piece '${id}'`);
    return p;
  };
  const placed: Placed[] = [];
  const plazaBoxes: Rect[] = [];
  // A rect answers to ONE district: it never straddles a chord row.
  const clearOfChordRows = (r: Rect): boolean =>
    chords.every((c) => r.y > c + 1 || r.y + r.h - 1 < c - 1);
  const fits = (r: Rect, gap: number): boolean => {
    const corners: Array<[number, number]> = [
      [r.x, r.y],
      [r.x + r.w - 1, r.y],
      [r.x, r.y + r.h - 1],
      [r.x + r.w - 1, r.y + r.h - 1],
    ];
    if (!corners.every(([px, py]) => insideHull(px, py, 2))) return false;
    if (!clearOfChordRows(r)) return false;
    if (plazaBoxes.some((p) => overlaps(r, p, 0))) return false;
    return placed.every((p) => !overlaps(r, p.rect, gap));
  };

  // The boss court stands on the summit district, opposite the great
  // gate — the assault walks every district to reach it.
  const bossPiece = pieceOf(style.bossPiece);
  let bossRect: Rect | null = null;
  // A citadel's court starts low enough for the stepped summit's
  // apron (pad 7 + hull margin 2) to fit above it.
  const bossY0 = y0 + (citadel ? 10 : 4);
  for (let dy = 0; dy < 26 && !bossRect; dy++) {
    for (let tries = 0; tries < 14; tries++) {
      const r: Rect = {
        x: cx - Math.floor(bossPiece.prefab.width / 2) + rWard.int(-8, 8),
        y: bossY0 + dy,
        w: bossPiece.prefab.width,
        h: bossPiece.prefab.height,
      };
      if (fits(r, 3)) {
        bossRect = r;
        break;
      }
    }
  }
  if (!bossRect) throw new Error(`${spec.id}: no ground for the boss court (seed ${seed})`);
  placed.push({ kind: 'boss', rect: bossRect, piece: bossPiece, band: bandOf(bossRect.y) });

  // Watch yards just inside each gate.
  for (const g of gates) {
    const wp = pieceOf(style.watchPiece);
    const r: Rect = {
      x: g.x - Math.floor(wp.prefab.width / 2) - g.ox * (Math.floor(wp.prefab.width / 2) + 2),
      y: g.y - Math.floor(wp.prefab.height / 2) - g.oy * (Math.floor(wp.prefab.height / 2) + 2),
      w: wp.prefab.width,
      h: wp.prefab.height,
    };
    if (fits(r, 1)) {
      placed.push({
        kind: 'watch',
        rect: r,
        piece: wp,
        watchGate: g,
        band: bandOf(r.y + (r.h >> 1)),
      });
    }
  }

  // Chord-gate watches: every district entrance is guarded from its
  // defended (northern) side.
  chordGates.forEach((cg, ci) => {
    const r: Rect = { x: cg.x - 4, y: cg.y - 6, w: 9, h: 5 };
    if (!clearOfChordRows(r) || !fits(r, 0)) return;
    placed.push({
      kind: 'chordwatch',
      rect: r,
      band: bandOf(r.y + (r.h >> 1)),
      name: ci === 0 && citadel ? 'the high gate' : 'the inner gate',
      keyHint: ci === 0 && citadel ? 'high_gate' : 'inner_gate',
    });
  });

  // ---- 4b. THE STEPPED SUMMIT (Phase 2, grown up) --------------------
  // The last stand climbs in steps: a citadel raises a broad level-1
  // high ward and the level-2 court above it; a hold keeps its single
  // hill. Height is render-only (the shelf law) — each step's
  // Cliff/Ramp ring IS the collision story and a sight wall: the
  // chief's court is hidden until the stairs are won. A summit the
  // walls can't hold is skipped honestly (the land sizes the hill).
  const elev = new Int8Array(pw * ph);
  interface Step {
    rect: Rect;
    level: number;
    rampX: number;
    rampW: number;
  }
  const steps: Step[] = [];
  {
    const stepFits = (r: Rect): boolean => {
      const corners: Array<[number, number]> = [
        [r.x, r.y],
        [r.x + r.w - 1, r.y],
        [r.x, r.y + r.h - 1],
        [r.x + r.w - 1, r.y + r.h - 1],
      ];
      if (!corners.every(([px, py]) => insideHull(px, py, 2))) return false;
      if (!clearOfChordRows(r)) return false;
      return placed.every((p) => p.rect === bossRect || !overlaps(r, p.rect, 1));
    };
    const rampW = citadel ? 2 : 1;
    const wantSteps = citadel ? 2 : rTerrace.chance(0.6) ? 1 : 0;
    if (wantSteps === 2) {
      for (const apronPad of [7, 6, 5]) {
        const outer = pad(bossRect, apronPad);
        const inner = pad(bossRect, 1);
        if (!stepFits(outer)) continue;
        const rampX = Math.min(
          Math.max(bossRect.x + Math.floor(bossRect.w / 2) - (rampW >> 1), inner.x + 2),
          inner.x + inner.w - 2 - rampW,
        );
        steps.push({ rect: outer, level: 1, rampX, rampW });
        steps.push({ rect: inner, level: 2, rampX, rampW });
        break;
      }
    }
    if (steps.length === 0 && wantSteps > 0) {
      for (const p of [2, 1]) {
        const t = pad(bossRect, p);
        if (!stepFits(t)) continue;
        const rampX = Math.min(
          Math.max(bossRect.x + Math.floor(bossRect.w / 2) - (rampW >> 1), t.x + 2),
          t.x + t.w - 2 - rampW,
        );
        steps.push({ rect: t, level: 1, rampX, rampW });
        break;
      }
    }
  }
  for (const s of steps) {
    const t = s.rect;
    for (let y = t.y; y < t.y + t.h; y++) {
      for (let x = t.x; x < t.x + t.w; x++) {
        elev[y * pw + x] = s.level;
        const onRing = x === t.x || y === t.y || x === t.x + t.w - 1 || y === t.y + t.h - 1;
        const isRamp = y === t.y + t.h - 1 && x >= s.rampX && x < s.rampX + s.rampW;
        if (isRamp) put(x, y, Tile.Ramp);
        else if (onRing) put(x, y, Tile.Cliff);
        else if (at(x, y) === TILE_SKIP) put(x, y, Tile.Grass); // opaque hill, no holes
      }
    }
  }
  // Stairs, landings, and the summit path — one processional line.
  for (const s of steps) {
    const t = s.rect;
    for (let i = 0; i < s.rampW; i++) {
      // The landing: honest walkable ground at the stair's foot.
      const lx = s.rampX + i;
      const ly = t.y + t.h;
      if (at(lx, ly) === TILE_SKIP) put(lx, ly, Tile.Dirt);
      else if (at(lx, ly) === Tile.Grass) put(lx, ly, Tile.Dirt);
      // The path above the stair head, toward the court's door.
      for (let y = t.y + t.h - 2; y >= bossRect.y + bossRect.h; y--) {
        if (at(lx, y) === Tile.Grass) put(lx, y, Tile.Dirt);
      }
    }
  }
  const summit = steps.length > 0 ? steps[0]! : null;
  if (summit) {
    // The whole summit is the last stand's chapter — apron included.
    placed[0]!.rect = summit.rect;
  }

  // ---- 5. THE GROUND --------------------------------------------------
  // A hearth plaza per district (THE BREATHING LAW: every district
  // keeps a heart its lanes grow from).
  interface Heart {
    x: number;
    y: number;
    band: number;
  }
  const hearts: Heart[] = [];
  for (let b = 0; b < nBands; b++) {
    let hx = cx + rWard.int(-8, 8);
    let hy = Math.floor((bandLo(b) + bandHi(b)) / 2);
    // The summit band's heart steps south of the hill.
    if (summit && bandOf(summit.rect.y) === b) {
      hy = Math.max(hy, summit.rect.y + summit.rect.h + 5);
    }
    let ok = false;
    for (let tries = 0; tries < 20 && !ok; tries++) {
      const candidate: Rect = { x: hx - 4, y: hy - 4, w: 9, h: 9 };
      if (
        insideHull(hx - 4, hy - 4, 3) &&
        insideHull(hx + 4, hy + 4, 3) &&
        clearOfChordRows(candidate) &&
        placed.every((p) => !overlaps(candidate, p.rect, 1))
      ) {
        ok = true;
        break;
      }
      hx = cx + rWard.int(-Math.floor(wallW / 4), Math.floor(wallW / 4));
      hy = rWard.int(bandLo(b) + 5, Math.max(bandLo(b) + 6, bandHi(b) - 5));
    }
    if (!ok) continue;
    hearts.push({ x: hx, y: hy, band: b });
    plazaBoxes.push({ x: hx - 4, y: hy - 4, w: 9, h: 9 });
    const r = b === nBands - 1 ? 4 : 3;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r && insideHull(hx + dx, hy + dy, 2) && at(hx + dx, hy + dy) === TILE_SKIP) {
          put(hx + dx, hy + dy, Tile.Dirt);
        }
      }
    }
    put(hx, hy, style.hearth);
  }
  const heartOf = (b: number): Heart | null => hearts.find((h) => h.band === b) ?? null;

  // The wards proper — dealt per district so every band reads
  // occupied, sampled wide (gap 4 — THE BREATHING LAW).
  const pool = [...style.wardPieces];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rWard.int(0, i);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  let poolIdx = 0;
  const bandTargets: number[] = [];
  for (let b = 0; b < nBands; b++) {
    if (citadel) bandTargets.push(b === 0 ? rWard.int(1, 2) : rWard.int(2, 3));
    else bandTargets.push(b === 0 ? rWard.int(1, 2) : rWard.int(2, 2));
  }
  for (let b = 0; b < nBands; b++) {
    for (let wi = 0; wi < bandTargets[b]!; wi++) {
      const wp = pieceOf(pool[poolIdx++ % pool.length]!);
      for (let tries = 0; tries < 50; tries++) {
        const rx = rWard.int(x0 + 3, x1 - 3 - wp.prefab.width);
        const ry = rWard.int(bandLo(b) + 2, Math.max(bandLo(b) + 3, bandHi(b) - 1 - wp.prefab.height));
        const r: Rect = { x: rx, y: ry, w: wp.prefab.width, h: wp.prefab.height };
        if (fits(r, 4)) {
          placed.push({ kind: 'ward', rect: r, piece: wp, band: b });
          break;
        }
      }
    }
  }

  // Worn lanes: each district knits its own dendritic network — its
  // gates and its heart first (cart-wide for the great gate and the
  // chord gates: the processional line), then each ward joins the
  // NEAREST worn ground in its own district (footpath-wide), the way
  // real feet wear a yard. Lanes only ever paint transparent cells
  // inside the walls.
  const laneCellsByBand: Array<Array<[number, number]>> = Array.from({ length: nBands }, () => []);
  const lane = (
    band: number,
    fx: number,
    fy: number,
    tx: number,
    ty: number,
    xFirst: boolean,
    wide: boolean,
  ): void => {
    const cells = laneCellsByBand[band]!;
    const paint = (x: number, y: number): void => {
      if (!insideHull(x, y, 1)) return;
      if (at(x, y) === TILE_SKIP) {
        put(x, y, Tile.Dirt);
        cells.push([x, y]);
      }
      if (!wide) return;
      if (at(x + 1, y) === TILE_SKIP && !xFirst) {
        put(x + 1, y, Tile.Dirt);
        cells.push([x + 1, y]);
      }
      if (at(x, y + 1) === TILE_SKIP && xFirst) {
        put(x, y + 1, Tile.Dirt);
        cells.push([x, y + 1]);
      }
    };
    let x = fx;
    let y = fy;
    if (xFirst) {
      for (; x !== tx; x += Math.sign(tx - x)) paint(x, y);
      for (; y !== ty; y += Math.sign(ty - y)) paint(x, y);
    } else {
      for (; y !== ty; y += Math.sign(ty - y)) paint(x, y);
      for (; x !== tx; x += Math.sign(tx - x)) paint(x, y);
    }
    paint(tx, ty);
  };
  /** The band's lane target: its heart, or the summit stair's foot. */
  const bandTarget = (b: number): [number, number] => {
    const h = heartOf(b);
    if (h) return [h.x, h.y];
    if (summit && bandOf(summit.rect.y) === b) {
      return [summit.rampX + (summit.rampW >> 1), summit.rect.y + summit.rect.h];
    }
    return [cx, Math.floor((bandLo(b) + bandHi(b)) / 2)];
  };
  for (const g of gates) {
    const ix = g.x - g.ox;
    const iy = g.y - g.oy;
    const b = bandOf(iy);
    const [tx, ty] = bandTarget(b);
    lane(b, ix, iy, tx, ty, g.edge === 'left' || g.edge === 'right', g.edge === 'bottom');
  }
  for (const cg of chordGates) {
    const bs = bandOf(cg.y + 1);
    const bn = bandOf(cg.y - 1);
    const [sx, sy] = bandTarget(bs);
    const [nx, ny] = bandTarget(bn);
    lane(bs, cg.x, cg.y + 1, sx, sy, false, true);
    lane(bn, cg.x, cg.y - 1, nx, ny, false, true);
  }
  // Wards join their district's network nearest-first, growing outward.
  const byHeartDist = [...placed].sort((a, b) => {
    const ha = bandTarget(a.band);
    const hb = bandTarget(b.band);
    const da = (a.rect.x + a.rect.w / 2 - ha[0]) ** 2 + (a.rect.y + a.rect.h / 2 - ha[1]) ** 2;
    const db = (b.rect.x + b.rect.w / 2 - hb[0]) ** 2 + (b.rect.y + b.rect.h / 2 - hb[1]) ** 2;
    return da - db;
  });
  for (const p of byHeartDist) {
    // The summit joins the network at its stair's foot — the lane
    // walks to the ramp, the ramp walks to the chief.
    const summitWard = summit !== null && p.kind === 'boss';
    const wx = summitWard ? summit!.rampX + (summit!.rampW >> 1) : p.rect.x + Math.floor(p.rect.w / 2);
    const wy = summitWard ? summit!.rect.y + summit!.rect.h : p.rect.y + Math.floor(p.rect.h / 2);
    const b = summitWard ? bandOf(wy) : p.band;
    let [tx, ty] = bandTarget(b);
    let best = (wx - tx) * (wx - tx) + (wy - ty) * (wy - ty);
    for (const [lx, ly] of laneCellsByBand[b]!) {
      const d = (wx - lx) * (wx - lx) + (wy - ly) * (wy - ly);
      if (d < best) {
        best = d;
        tx = lx;
        ty = ly;
      }
    }
    lane(b, wx, wy, tx, ty, rWard.chance(0.5), false);
  }
  // THE OUTER WORKS' roads: each gate's worn road runs out into the
  // approach ground — the road is how the door is found.
  for (const g of gates) {
    const wide = g.edge === 'bottom';
    let x = g.x + g.ox;
    let y = g.y + g.oy;
    while (x >= 1 && y >= 1 && x < pw - 1 && y < ph - 1) {
      if (at(x, y) === TILE_SKIP) put(x, y, Tile.Dirt);
      if (wide) {
        const sx = x + Math.abs(g.oy);
        const sy = y + Math.abs(g.ox);
        if (at(sx, sy) === TILE_SKIP) put(sx, sy, Tile.Dirt);
      }
      x += g.ox;
      y += g.oy;
    }
  }

  // ---- 5b. THE PICKETS (THE OUTER WORKS) -----------------------------
  // The first pull happens on the road: a picket post stands 5-7
  // tiles out from a gate, on trampled ground of its own.
  for (const g of gates) {
    if (!rOuter.chance(0.55)) continue;
    const dist = rOuter.int(5, 7);
    const lat = rOuter.int(-2, 2);
    const px = g.x + g.ox * dist + Math.abs(g.oy) * lat;
    const py = g.y + g.oy * dist + Math.abs(g.ox) * lat;
    if (px < 3 || py < 3 || px >= pw - 3 || py >= ph - 3) continue;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (at(px + dx, py + dy) === TILE_SKIP) put(px + dx, py + dy, Tile.Dirt);
      }
    }
    put(px, py - 1, style.wall === 'palisade' ? Tile.StandingTorch : style.accents[0]!);
    for (let i = 0; i < 3; i++) {
      const sx = px + rOuter.int(-3, 3);
      const sy = py + rOuter.int(-2, 2);
      if (at(sx, sy) === TILE_SKIP) {
        put(sx, sy, style.wall === 'palisade' ? Tile.SpikeBarrier : style.accents[rOuter.int(0, style.accents.length - 1)]!);
      }
    }
    const r: Rect = {
      x: Math.max(1, px - 3),
      y: Math.max(1, py - 2),
      w: 7,
      h: 5,
    };
    placed.push({
      kind: 'picket',
      rect: r,
      band: -1,
      name: `the ${EDGE_BEARING[g.edge]} road picket`,
      keyHint: `picket_${EDGE_BEARING[g.edge]}`,
    });
  }

  // ---- 6. STAMP THE PIECES -------------------------------------------
  for (const p of placed) {
    if (!p.piece) continue;
    const { prefab } = p.piece;
    // The summit ward rect grew to the whole hill — stamp the piece
    // where the court actually sits.
    const sx = p.kind === 'boss' ? bossRect.x : p.rect.x;
    const sy = p.kind === 'boss' ? bossRect.y : p.rect.y;
    for (let yy = 0; yy < prefab.height; yy++) {
      for (let xx = 0; xx < prefab.width; xx++) {
        const t = prefab.ground[yy * prefab.width + xx]!;
        if (t !== TILE_SKIP) put(sx + xx, sy + yy, t);
      }
    }
  }

  // ---- 7. THE MUSTER --------------------------------------------------
  const allAnchors: Array<[number, number]> = [];
  const spaced = (x: number, y: number): boolean =>
    allAnchors.every(([ax, ay]) => (ax - x) * (ax - x) + (ay - y) * (ay - y) >= KNOT_SPACING * KNOT_SPACING);
  const claim = (x: number, y: number): void => {
    allAnchors.push([x, y]);
  };
  const anchorIn = (r: Rect, tries: number, near?: [number, number, number]): [number, number] | null => {
    for (let i = 0; i < tries; i++) {
      const x = rKnot.int(r.x, r.x + r.w - 1);
      const y = rKnot.int(r.y, r.y + r.h - 1);
      if (!passable(at(x, y))) continue;
      if (!spaced(x, y)) continue;
      if (near) {
        const d2 = (x - near[0]) * (x - near[0]) + (y - near[1]) * (y - near[1]);
        if (d2 > near[2] * near[2]) continue;
      }
      return [x, y];
    }
    return null;
  };

  // The boss stands before his cache.
  let bossAt: [number, number] | null = null;
  {
    let zx = -1;
    let zy = -1;
    for (let yy = bossRect.y; yy < bossRect.y + bossRect.h; yy++) {
      for (let xx = bossRect.x; xx < bossRect.x + bossRect.w; xx++) {
        if (at(xx, yy) === Tile.ChestBoss) {
          zx = xx;
          zy = yy;
        }
      }
    }
    const candidates: Array<[number, number]> =
      zx >= 0
        ? [[zx, zy + 1], [zx, zy - 1], [zx - 1, zy], [zx + 1, zy], [zx - 1, zy + 1], [zx + 1, zy + 1]]
        : [[bossRect.x + (bossRect.w >> 1), bossRect.y + (bossRect.h >> 1)]];
    for (const [bx, by] of candidates) {
      if (passable(at(bx, by))) {
        bossAt = [bx, by];
        break;
      }
    }
    if (!bossAt) {
      const fallback = anchorIn(bossRect, 40);
      if (!fallback) throw new Error(`${spec.id}: the chief has no ground (seed ${seed})`);
      bossAt = fallback;
    }
  }

  interface WardPlan {
    placed: Placed;
    knots: StrongholdKnot[];
  }
  const plans: WardPlan[] = placed.map((p) => ({ placed: p, knots: [] }));

  const mkKnot = (
    entry: KnotMenuEntry,
    anchor: [number, number],
    role: 'holdfast' | 'sentry',
    levelOffset?: number,
  ): StrongholdKnot => ({
    at: anchor,
    npc: entry.npc,
    band: entry.band,
    role,
    ...(entry.minTier !== undefined ? { minTier: entry.minTier } : {}),
    ...(levelOffset !== undefined ? { levelOffset } : {}),
  });

  // Honor guard first — the last stand always stands.
  const bossPlan = plans.find((p) => p.placed.kind === 'boss')!;
  {
    const anchor = anchorIn(bossRect, 40, [bossAt[0], bossAt[1], 5]) ?? anchorIn(bossRect, 40);
    if (!anchor) throw new Error(`${spec.id}: no ground for the honor guard (seed ${seed})`);
    claim(anchor[0], anchor[1]);
    bossPlan.knots.push(mkKnot(style.guard, anchor, 'holdfast', 2));
    const second = anchorIn(bossPlan.placed.rect, 25);
    if (second) {
      claim(second[0], second[1]);
      bossPlan.knots.push(mkKnot(style.menu[1] ?? style.menu[0]!, second, 'sentry'));
    }
    // The high ward: a summit apron musters its own watch.
    if (summit && citadel) {
      for (let i = 0; i < 2; i++) {
        const apron = anchorIn(summit.rect, 30);
        if (!apron) break;
        claim(apron[0], apron[1]);
        bossPlan.knots.push(mkKnot(style.menu[i % style.menu.length]!, apron, 'holdfast', 1));
      }
    }
  }
  // Gate sentries at the watch yards and chord gates; picket watches
  // on the roads; ward knots everywhere else.
  for (const plan of plans) {
    const p = plan.placed;
    if (p.kind === 'boss') continue;
    if (p.kind === 'watch' && p.watchGate) {
      const g = p.watchGate;
      const anchor =
        anchorIn(p.rect, 30, [g.x - g.ox * 3, g.y - g.oy * 3, 4]) ?? anchorIn(p.rect, 30);
      if (anchor) {
        claim(anchor[0], anchor[1]);
        plan.knots.push(mkKnot(style.sentinel, anchor, 'sentry'));
      }
      continue;
    }
    if (p.kind === 'chordwatch' || p.kind === 'picket') {
      const anchor = anchorIn(p.rect, 30);
      if (anchor) {
        claim(anchor[0], anchor[1]);
        plan.knots.push(mkKnot(style.sentinel, anchor, 'sentry'));
      }
      continue;
    }
    const area = p.rect.w * p.rect.h;
    const wanted = 1 + (area >= 78 ? 1 : 0) + (area >= 160 ? 1 : 0);
    for (let ki = 0; ki < wanted; ki++) {
      const anchor = anchorIn(p.rect, 30);
      if (!anchor) break;
      claim(anchor[0], anchor[1]);
      const suggestion = p.piece?.knots?.[ki];
      const entry: KnotMenuEntry =
        suggestion ?? (ki === 0 ? style.menu[0]! : style.menu[rKnot.int(1, Math.max(1, style.menu.length - 1))]!);
      plan.knots.push(mkKnot(entry, anchor, 'holdfast'));
    }
  }
  // Balance to the lawful envelope: a thin muster musters again; an
  // overfull one stands its farthest-flung knots down.
  const maxBodies = (): number =>
    plans.reduce((n, p) => n + p.knots.reduce((m, k) => m + k.band[1], 0), 1);
  // A citadel is a siege, a hold is a hard fight — muster to the mark
  // (the spacing law caps how much ground can carry, so the loop asks
  // and the geometry answers). THE ZONE LAW's clear is 20-30 pulls.
  const musterMark = citadel ? 52 : Math.max(32, STRONGHOLD_BODIES_MIN + 6);
  for (let guardIter = 0; guardIter < 200 && maxBodies() < musterMark; guardIter++) {
    const plan = plans[rKnot.int(0, plans.length - 1)]!;
    if (plan.placed.kind === 'watch' || plan.placed.kind === 'picket') continue;
    const anchor = anchorIn(plan.placed.rect, 20);
    if (!anchor) continue;
    claim(anchor[0], anchor[1]);
    plan.knots.push(mkKnot(style.menu[rKnot.int(0, style.menu.length - 1)]!, anchor, 'holdfast'));
  }
  while (maxBodies() > STRONGHOLD_BODIES_MAX - 4) {
    const donor = plans
      .filter((p) => p.placed.kind !== 'boss' && p.knots.length > 1)
      .sort((a, b) => b.knots.length - a.knots.length)[0];
    if (!donor) break;
    donor.knots.pop();
  }

  // ---- 8. THE DRESSING ------------------------------------------------
  if (style.wall === 'palisade') {
    let cadence = rDress.int(0, 6);
    for (const c of wallCells) {
      cadence++;
      if (cadence % 8 !== 0) continue;
      const ix = c.x + Math.sign(cx - c.x);
      const iy = c.y + Math.sign(Math.floor((y0 + y1) / 2) - c.y);
      if (at(ix, iy) === TILE_SKIP) put(ix, iy, Tile.StandingTorch);
    }
    for (const g of gates) {
      const lx = g.oy; // lateral unit
      const ly = g.ox;
      for (const side of [-1, 1]) {
        const bx = g.x + lx * side - g.ox;
        const by = g.y + ly * side - g.oy;
        if (at(bx, by) === TILE_SKIP) put(bx, by, Tile.WarBanner);
        const sx = g.x + lx * side * 2 + g.ox;
        const sy = g.y + ly * side * 2 + g.oy;
        if (at(sx, sy) === TILE_SKIP) put(sx, sy, Tile.SpikeBarrier);
      }
    }
    for (const cg of chordGates) {
      for (const side of [-1, 1]) {
        if (at(cg.x + side, cg.y - 1) === TILE_SKIP) put(cg.x + side, cg.y - 1, Tile.WarBanner);
      }
    }
  } else {
    for (const g of gates) {
      const lx = g.oy;
      const ly = g.ox;
      const flank = style.wall === 'thicket' ? Tile.SkullPile : Tile.CaveRubble;
      for (const side of [-1, 1]) {
        const sx = g.x + lx * side * 2 + g.ox;
        const sy = g.y + ly * side * 2 + g.oy;
        if (at(sx, sy) === TILE_SKIP) put(sx, sy, flank);
      }
    }
  }
  // Litter scales with the yard — a citadel's ground carries a
  // citadel's clutter.
  const accentCount = Math.max(14, Math.round((wallW * wallH) / 340)) + rDress.int(0, 8);
  for (let i = 0; i < accentCount; i++) {
    const ax = rDress.int(x0 + 3, x1 - 3);
    const ay = rDress.int(y0 + 3, y1 - 3);
    if (!insideHull(ax, ay, 3)) continue;
    if (at(ax, ay) !== TILE_SKIP) continue;
    put(ax, ay, style.accents[rDress.int(0, style.accents.length - 1)]!);
  }

  // ---- 9. THE DEF -----------------------------------------------------
  const fortCy = (y0 + y1) >> 1;
  const usedKeys = new Set<string>();
  const wards: StrongholdWard[] = plans.map((plan) => {
    const p = plan.placed;
    const wcx = p.rect.x + p.rect.w / 2;
    const wcy = p.rect.y + p.rect.h / 2;
    const bearing = bearingOf(wcx - cx, wcy - fortCy);
    const name =
      p.name ??
      (p.kind === 'boss' ? `the ${p.piece!.base}` : `the ${bearing} ${p.piece!.base}`);
    let key =
      p.keyHint ??
      (p.kind === 'boss'
        ? 'last_stand'
        : `${bearing.replace(/[^a-z]/g, '')}_${p.piece!.prefab.id.replace(/^ward_[a-z]+_/, '')}`);
    while (usedKeys.has(key)) key = `${key}_x`;
    usedKeys.add(key);
    const optional =
      p.kind === 'picket' || (p.kind === 'ward' && rWard.chance(0.28))
        ? { optional: true as const }
        : {};
    const patrol =
      p.kind === 'watch' || p.kind === 'chordwatch'
        ? { patrol: 'wall' as const }
        : p.kind === 'ward' && rWard.chance(0.22)
          ? { patrol: 'lane' as const }
          : {};
    return {
      key,
      name,
      rect: { x: p.rect.x, y: p.rect.y, w: p.rect.w, h: p.rect.h },
      knots: plan.knots,
      ...optional,
      ...patrol,
    };
  });

  const prefab: PrefabDef = {
    id: spec.id,
    name: spec.name,
    width: pw,
    height: ph,
    ground,
    detail: new Uint16Array(pw * ph),
    elev,
    portals: [],
    spawns: [],
    actorSpawns: [],
  };
  const def: StrongholdDef = {
    id: spec.id,
    name: spec.name,
    ...(spec.description ? { description: spec.description } : {}),
    family: spec.family,
    tiers: spec.tiers,
    weight: spec.weight,
    prefab: spec.id,
    wards,
    boss: {
      ward: 'last_stand',
      npc: style.bossNpc,
      names: spec.bossNames,
      at: bossAt,
      levelOffset: style.bossOffset,
    },
  };
  return { def, prefab };
}
