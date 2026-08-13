import { Rng, TILE_DEFS, TILE_SKIP, Tile, hashCoords, hashString } from '@arx/shared';
import type { PrefabDef } from '../../maps/prefab.js';
import type { StrongholdDef, StrongholdKnot, StrongholdWard } from './types.js';
import { KNOT_SPACING, STRONGHOLD_BODIES_MAX, STRONGHOLD_BODIES_MIN } from './types.js';
import { WARD_PIECES, type WardPiece } from './pieces.js';

/**
 * THE FOUNDRY (docs/strongholds-plan.md Phase 1) — the generator that
 * PROPOSES stronghold layouts. Pure and deterministic: the same seed
 * and spec always assemble the same walls, wards, and muster plan, on
 * named streams so a tweak to one stage never reshuffles another
 * (the composePoi stream discipline, at layout scale).
 *
 * The generator builds:
 *   1. THE HULL — an octagonal wall ring (straight runs + 45° corner
 *      cuts) in the family's material: spiked palisade, wolfkin
 *      thicket-and-bone, or the dead's old cairn stones.
 *   2. THE DOORS — a great gate on the south run, a lesser gate on
 *      another bearing, and sometimes a breach (THE OPEN GATE LAW:
 *      every leaf stands open; the breach is the meanest way in).
 *   3. THE GROUND — a hearth plaza, worn dirt lanes gate → plaza →
 *      wards. Courtyards stay TILE_SKIP so the meadow shows through.
 *   4. THE WARDS — dressed pieces from the shelf (pieces.ts), boss
 *      court opposite the great gate, watch yards inside the doors.
 *   5. THE MUSTER — knots of 1-3 planned per ward at ≥ KNOT_SPACING
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
      wardPieces: ['ward_gs_tents', 'ward_gs_cookyard', 'ward_gs_totem', 'ward_gs_pens', 'ward_gs_muster'],
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
      wardPieces: ['ward_gs_tents', 'ward_gs_cookyard', 'ward_gs_totem', 'ward_gs_muster'],
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
      wardPieces: ['ward_br_tents', 'ward_br_stores', 'ward_br_pen', 'ward_gs_muster'],
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
      wardPieces: ['ward_wk_nests', 'ward_wk_racks', 'ward_wk_bonefield'],
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
      wardPieces: ['ward_dd_stones', 'ward_dd_shrine', 'ward_dd_graves'],
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

/** Transparent margin around the walls; the outermost ring stays skip. */
const FRINGE = 3;

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

function bearingOf(dx: number, dy: number): string {
  const angle = Math.atan2(dy, dx);
  const idx = Math.round(angle / (Math.PI / 4)) & 7;
  return ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'][idx]!;
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

  // ---- 1. THE HULL ----------------------------------------------------
  const [dimMin, dimMax] = spec.sizeClass === 'citadel' ? [86, 108] : [58, 80];
  const wallW = rHull.int(dimMin, dimMax);
  let wallH = rHull.int(dimMin, dimMax);
  wallH = Math.max(Math.round(wallW * 0.72), Math.min(Math.round(wallW * 1.25), wallH));
  const pw = wallW + FRINGE * 2;
  const ph = wallH + FRINGE * 2;
  const x0 = FRINGE;
  const y0 = FRINGE;
  const x1 = FRINGE + wallW - 1;
  const y1 = FRINGE + wallH - 1;
  const cMax = Math.min(14, Math.floor(Math.min(wallW, wallH) / 4));
  const cTL = rHull.int(5, cMax);
  const cTR = rHull.int(5, cMax);
  const cBL = rHull.int(5, cMax);
  const cBR = rHull.int(5, cMax);

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

  // ---- 2. THE DOORS ---------------------------------------------------
  const gateTile = style.wall === 'palisade' ? Tile.PalisadeGate : Tile.ArchStone;
  const gates: Gate[] = [];
  const mid = (lo: number, hi: number, r: Rng): number => {
    const span = hi - lo;
    return lo + Math.floor(span / 2) + r.int(-Math.floor(span / 4), Math.floor(span / 4));
  };
  // The great gate faces south — the bearing players arrive from, and
  // the bearing the GREAT GATE art was carved for.
  const ggx = mid(x0 + cBL + 3, x1 - cBR - 3, rGate);
  put(ggx, y1, gateTile);
  gates.push({ x: ggx, y: y1, edge: 'bottom', ox: 0, oy: 1 });
  const lesserEdge: Edge = (['top', 'left', 'right'] as const)[rGate.int(0, 2)]!;
  if (lesserEdge === 'top') {
    const gx = mid(x0 + cTL + 3, x1 - cTR - 3, rGate);
    put(gx, y0, gateTile);
    gates.push({ x: gx, y: y0, edge: 'top', ox: 0, oy: -1 });
  } else if (lesserEdge === 'left') {
    const gy = mid(y0 + cTL + 3, y1 - cBL - 3, rGate);
    put(x0, gy, gateTile);
    gates.push({ x: x0, y: gy, edge: 'left', ox: -1, oy: 0 });
  } else {
    const gy = mid(y0 + cTR + 3, y1 - cBR - 3, rGate);
    put(x1, gy, gateTile);
    gates.push({ x: x1, y: gy, edge: 'right', ox: 1, oy: 0 });
  }
  // The breach — the meanest way in, on a bearing nobody watches.
  const breachTile = style.wall === 'cairn' ? Tile.CaveRubble : Tile.GrassTall;
  if (rGate.chance(0.55)) {
    const edges: Edge[] = (['top', 'left', 'right'] as const).filter((e) => e !== lesserEdge);
    const edge = edges[rGate.int(0, edges.length - 1)]!;
    if (edge === 'top') {
      const bx = mid(x0 + cTL + 3, x1 - cTR - 4, rGate);
      put(bx, y0, breachTile);
      put(bx + 1, y0, breachTile);
      put(bx, y0 - 1, style.accents[0]!);
    } else if (edge === 'left') {
      const by = mid(y0 + cTL + 3, y1 - cBL - 4, rGate);
      put(x0, by, breachTile);
      put(x0, by + 1, breachTile);
      put(x0 - 1, by, style.accents[0]!);
    } else {
      const by = mid(y0 + cTR + 3, y1 - cBR - 4, rGate);
      put(x1, by, breachTile);
      put(x1, by + 1, breachTile);
      put(x1 + 1, by, style.accents[0]!);
    }
  }

  // ---- 4a. WARD GEOMETRY (rects before ground, so lanes know) --------
  const cx = (x0 + x1) >> 1;
  const cy = (y0 + y1) >> 1;
  const pieceOf = (id: string): WardPiece => {
    const p = WARD_PIECES.get(id);
    if (!p) throw new Error(`unknown ward piece '${id}'`);
    return p;
  };
  const placed: Array<{ piece: WardPiece; rect: Rect; watchGate?: Gate }> = [];
  const fits = (r: Rect, gap: number): boolean => {
    const corners: Array<[number, number]> = [
      [r.x, r.y],
      [r.x + r.w - 1, r.y],
      [r.x, r.y + r.h - 1],
      [r.x + r.w - 1, r.y + r.h - 1],
    ];
    if (!corners.every(([px, py]) => insideHull(px, py, 2))) return false;
    return placed.every((p) => !overlaps(r, p.rect, gap));
  };

  // The boss court stands opposite the great gate — the assault walks
  // the whole hold to reach it.
  const bossPiece = pieceOf(style.bossPiece);
  let bossRect: Rect | null = null;
  for (let dy = 0; dy < 18 && !bossRect; dy++) {
    for (let tries = 0; tries < 14; tries++) {
      const r: Rect = {
        x: cx - Math.floor(bossPiece.prefab.width / 2) + rWard.int(-6, 6),
        y: y0 + 3 + dy,
        w: bossPiece.prefab.width,
        h: bossPiece.prefab.height,
      };
      if (fits(r, 2)) {
        bossRect = r;
        break;
      }
    }
  }
  if (!bossRect) throw new Error(`${spec.id}: no ground for the boss court (seed ${seed})`);
  placed.push({ piece: bossPiece, rect: bossRect });

  // Watch yards just inside each gate.
  for (const g of gates) {
    const wp = pieceOf(style.watchPiece);
    const r: Rect = {
      x: g.x - Math.floor(wp.prefab.width / 2) - g.ox * (Math.floor(wp.prefab.width / 2) + 2),
      y: g.y - Math.floor(wp.prefab.height / 2) - g.oy * (Math.floor(wp.prefab.height / 2) + 2),
      w: wp.prefab.width,
      h: wp.prefab.height,
    };
    if (fits(r, 1)) placed.push({ piece: wp, rect: r, watchGate: g });
  }

  // The wards proper — sampled on a ring band around the plaza so the
  // interior reads occupied, not scattered to the corners with a
  // barren middle.
  const wardTarget = spec.sizeClass === 'citadel' ? rWard.int(5, 7) : rWard.int(3, 4);
  const pool = [...style.wardPieces];
  // Deterministic shuffle on the ward stream.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rWard.int(0, i);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const halfSpan = Math.min(wallW, wallH) / 2;
  for (let wi = 0; wi < wardTarget; wi++) {
    const wp = pieceOf(pool[wi % pool.length]!);
    for (let tries = 0; tries < 40; tries++) {
      const angle = rWard.range(0, Math.PI * 2);
      const radius = halfSpan * rWard.range(0.3, 0.72);
      const r: Rect = {
        x: Math.round(cx + Math.cos(angle) * radius - wp.prefab.width / 2),
        y: Math.round(cy + Math.sin(angle) * radius - wp.prefab.height / 2),
        w: wp.prefab.width,
        h: wp.prefab.height,
      };
      // Keep the hearth plaza breathable.
      const plazaBox: Rect = { x: cx - 4, y: cy - 4, w: 9, h: 9 };
      if (overlaps(r, plazaBox, 0)) continue;
      if (fits(r, 2)) {
        placed.push({ piece: wp, rect: r });
        break;
      }
    }
  }

  // ---- 3. THE GROUND --------------------------------------------------
  // Hearth plaza.
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      if (dx * dx + dy * dy <= 9 && insideHull(cx + dx, cy + dy, 2) && at(cx + dx, cy + dy) === TILE_SKIP) {
        put(cx + dx, cy + dy, Tile.Dirt);
      }
    }
  }
  put(cx, cy, style.hearth);
  // Worn lanes: gates → plaza (cart-wide), then each ward joins the
  // NEAREST worn ground (footpath-wide) — one dendritic network, the
  // way real feet wear a yard, never parallel stripes to one center.
  // Lanes only ever paint transparent cells inside the walls.
  const laneCells: Array<[number, number]> = [];
  const lane = (
    fx: number,
    fy: number,
    tx: number,
    ty: number,
    xFirst: boolean,
    wide: boolean,
  ): void => {
    const paint = (x: number, y: number): void => {
      if (!insideHull(x, y, 1)) return;
      if (at(x, y) === TILE_SKIP) {
        put(x, y, Tile.Dirt);
        laneCells.push([x, y]);
      }
      if (!wide) return;
      if (at(x + 1, y) === TILE_SKIP && !xFirst) {
        put(x + 1, y, Tile.Dirt);
        laneCells.push([x + 1, y]);
      }
      if (at(x, y + 1) === TILE_SKIP && xFirst) {
        put(x, y + 1, Tile.Dirt);
        laneCells.push([x, y + 1]);
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
  for (const g of gates) {
    lane(g.x - g.ox, g.y - g.oy, cx, cy, g.edge === 'left' || g.edge === 'right', true);
  }
  // Wards join the network nearest-first so it grows outward.
  const byPlazaDist = [...placed].sort((a, b) => {
    const da = (a.rect.x + a.rect.w / 2 - cx) ** 2 + (a.rect.y + a.rect.h / 2 - cy) ** 2;
    const db = (b.rect.x + b.rect.w / 2 - cx) ** 2 + (b.rect.y + b.rect.h / 2 - cy) ** 2;
    return da - db;
  });
  for (const p of byPlazaDist) {
    const wx = p.rect.x + Math.floor(p.rect.w / 2);
    const wy = p.rect.y + Math.floor(p.rect.h / 2);
    let tx = cx;
    let ty = cy;
    let best = (wx - cx) * (wx - cx) + (wy - cy) * (wy - cy);
    for (const [lx, ly] of laneCells) {
      const d = (wx - lx) * (wx - lx) + (wy - ly) * (wy - ly);
      if (d < best) {
        best = d;
        tx = lx;
        ty = ly;
      }
    }
    lane(wx, wy, tx, ty, rWard.chance(0.5), false);
  }

  // ---- 4b. STAMP THE PIECES ------------------------------------------
  for (const p of placed) {
    const { prefab } = p.piece;
    for (let yy = 0; yy < prefab.height; yy++) {
      for (let xx = 0; xx < prefab.width; xx++) {
        const t = prefab.ground[yy * prefab.width + xx]!;
        if (t !== TILE_SKIP) put(p.rect.x + xx, p.rect.y + yy, t);
      }
    }
  }

  // ---- 5. THE MUSTER --------------------------------------------------
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
    piece: WardPiece;
    rect: Rect;
    watchGate?: Gate;
    knots: StrongholdKnot[];
    isBoss: boolean;
  }
  const plans: WardPlan[] = placed.map((p) => ({
    piece: p.piece,
    rect: p.rect,
    ...(p.watchGate ? { watchGate: p.watchGate } : {}),
    knots: [],
    isBoss: p.rect === bossRect,
  }));

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
  const bossPlan = plans.find((p) => p.isBoss)!;
  {
    const anchor = anchorIn(bossPlan.rect, 40, [bossAt[0], bossAt[1], 5]) ?? anchorIn(bossPlan.rect, 40);
    if (!anchor) throw new Error(`${spec.id}: no ground for the honor guard (seed ${seed})`);
    claim(anchor[0], anchor[1]);
    bossPlan.knots.push(mkKnot(style.guard, anchor, 'holdfast', 2));
    const second = anchorIn(bossPlan.rect, 25);
    if (second) {
      claim(second[0], second[1]);
      bossPlan.knots.push(mkKnot(style.menu[1] ?? style.menu[0]!, second, 'sentry'));
    }
  }
  // Gate sentries at the watch yards; ward knots everywhere else.
  for (const plan of plans) {
    if (plan.isBoss) continue;
    if (plan.watchGate) {
      const g = plan.watchGate;
      const anchor =
        anchorIn(plan.rect, 30, [g.x - g.ox * 3, g.y - g.oy * 3, 4]) ?? anchorIn(plan.rect, 30);
      if (anchor) {
        claim(anchor[0], anchor[1]);
        plan.knots.push(mkKnot(style.sentinel, anchor, 'sentry'));
      }
      continue;
    }
    const wanted = 1 + (plan.rect.w * plan.rect.h >= 78 ? 1 : 0);
    for (let ki = 0; ki < wanted; ki++) {
      const anchor = anchorIn(plan.rect, 30);
      if (!anchor) break;
      claim(anchor[0], anchor[1]);
      const suggestion = plan.piece.knots?.[ki];
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
  // and the geometry answers).
  const musterMark = spec.sizeClass === 'citadel' ? 32 : Math.max(24, STRONGHOLD_BODIES_MIN + 6);
  for (let guardIter = 0; guardIter < 80 && maxBodies() < musterMark; guardIter++) {
    const plan = plans[rKnot.int(0, plans.length - 1)]!;
    if (plan.watchGate) continue;
    const anchor = anchorIn(plan.rect, 20);
    if (!anchor) continue;
    claim(anchor[0], anchor[1]);
    plan.knots.push(mkKnot(style.menu[rKnot.int(0, style.menu.length - 1)]!, anchor, 'holdfast'));
  }
  while (maxBodies() > STRONGHOLD_BODIES_MAX - 4) {
    const donor = plans
      .filter((p) => !p.isBoss && p.knots.length > 1)
      .sort((a, b) => b.knots.length - a.knots.length)[0];
    if (!donor) break;
    donor.knots.pop();
  }

  // ---- 6. THE DRESSING ------------------------------------------------
  if (style.wall === 'palisade') {
    let cadence = rDress.int(0, 6);
    for (const c of wallCells) {
      cadence++;
      if (cadence % 8 !== 0) continue;
      const ix = c.x + Math.sign(cx - c.x);
      const iy = c.y + Math.sign(cy - c.y);
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
  const accentCount = Math.max(10, Math.round((wallW * wallH) / 340)) + rDress.int(0, 6);
  for (let i = 0; i < accentCount; i++) {
    const ax = rDress.int(x0 + 3, x1 - 3);
    const ay = rDress.int(y0 + 3, y1 - 3);
    if (!insideHull(ax, ay, 3)) continue;
    if (at(ax, ay) !== TILE_SKIP) continue;
    put(ax, ay, style.accents[rDress.int(0, style.accents.length - 1)]!);
  }

  // ---- 7. THE DEF -----------------------------------------------------
  const usedKeys = new Set<string>();
  const wards: StrongholdWard[] = plans.map((plan) => {
    const wcx = plan.rect.x + plan.rect.w / 2;
    const wcy = plan.rect.y + plan.rect.h / 2;
    const bearing = bearingOf(wcx - cx, wcy - cy);
    const name = plan.isBoss ? `the ${plan.piece.base}` : `the ${bearing} ${plan.piece.base}`;
    let key = plan.isBoss
      ? 'last_stand'
      : `${bearing.replace(/[^a-z]/g, '')}_${plan.piece.prefab.id.replace(/^ward_[a-z]+_/, '')}`;
    while (usedKeys.has(key)) key = `${key}_x`;
    usedKeys.add(key);
    const optional =
      !plan.isBoss && !plan.watchGate && rWard.chance(0.28) ? { optional: true as const } : {};
    const patrol = plan.watchGate ? { patrol: 'wall' as const } : {};
    return {
      key,
      name,
      rect: { x: plan.rect.x, y: plan.rect.y, w: plan.rect.w, h: plan.rect.h },
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
    elev: new Int8Array(pw * ph),
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
