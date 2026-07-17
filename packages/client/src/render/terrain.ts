import {
  CHUNK_SIZE,
  Detail,
  Tile,
  hashCoords,
  valueNoise,
} from '@devcraft/shared';
import { chamferRect } from './shapes.js';

/**
 * Faceted terrain rendering. Tiles are authored on a grid but drawn as
 * unions of CHAMFERED cells: every material region gets crisp 45°-cut
 * coastlines — angular and deliberate, never pixel-grid, never soft
 * pills. Ground shading comes from low-frequency noise — big soft
 * meadows, no checkerboard.
 */

export type GroundSampler = (tx: number, ty: number) => number | undefined;
export type DetailSampler = (tx: number, ty: number) => number;
export type ElevSampler = (tx: number, ty: number) => number;

// ---------------------------------------------------------------- palette

const GRASS_TONES = ['#5c8941', '#588440', '#608e45', '#55813e'];
const CAVE_TONES = ['#5a5468', '#554f62', '#5f5870'];

interface BlobLayer {
  /** Does this ground id belong to the layer? */
  match: (t: number) => boolean;
  color: (t: number, tx: number, ty: number) => string;
}

/** Region-scale two-tone variation — smooth patches, never per-tile. */
function patch(base: string, alt: string, tx: number, ty: number, salt: number): string {
  return valueNoise(salt, tx * 0.09, ty * 0.09) > 0.55 ? alt : base;
}

/** Painted lowest → highest; later layers' rounding overlaps earlier. */
const BLOB_LAYERS: BlobLayer[] = [
  {
    match: (t) => t === Tile.Dirt,
    color: (_t, tx, ty) => patch('#96744c', '#8f6e47', tx, ty, 31),
  },
  {
    match: (t) => t === Tile.Swamp,
    color: () => '#556b3e',
  },
  {
    match: (t) => t === Tile.Path,
    color: (_t, tx, ty) => patch('#c2a26e', '#bc9d69', tx, ty, 33),
  },
  {
    match: (t) => t === Tile.Sand,
    color: (_t, tx, ty) => patch('#ddc98d', '#d6c286', tx, ty, 35),
  },
  {
    match: (t) => t === Tile.StoneFloor,
    color: (_t, tx, ty) => patch('#a09aa8', '#99939f', tx, ty, 37),
  },
  {
    match: (t) => t === Tile.WoodFloor || t === Tile.Bridge,
    color: (_t, tx, ty) => patch('#a87e46', '#a37943', tx, ty, 39),
  },
  {
    match: (t) => t === Tile.CaveFloor || t === Tile.PortalDown || t === Tile.PortalUp,
    color: (_t, tx, ty) => patch(CAVE_TONES[0]!, CAVE_TONES[1]!, tx, ty, 41),
  },
  {
    match: (t) => t === Tile.Snow,
    color: () => '#e9edf3',
  },
  {
    match: (t) => t === Tile.Water || t === Tile.FishingSpot,
    color: () => '#4979b8',
  },
  {
    match: (t) => t === Tile.WaterDeep,
    color: () => '#3a629e',
  },
];

const GRASS_LIKE = new Set<number>([
  Tile.Grass,
  Tile.GrassTall,
  Tile.Tree,
  Tile.TreeOak,
  Tile.Stump,
  Tile.Fence,
  Tile.Campfire,
]);

const ROCKY = new Set<number>([
  Tile.Rock,
  Tile.RockCopper,
  Tile.RockTin,
  Tile.RockIron,
  Tile.RockCoal,
  Tile.RockGold,
  Tile.RockDepleted,
]);

/** What lies visually beneath objects that sit on the ground. */
function isCaveGround(t: number | undefined): boolean {
  return (
    t === Tile.CaveWall ||
    t === Tile.CaveFloor ||
    t === Tile.PortalDown ||
    t === Tile.PortalUp
  );
}

// ---------------------------------------------------------------- baking

/** Effective ground for blob purposes: objects show what's under them. */
function effectiveGround(ground: GroundSampler): GroundSampler {
  const g = (tx: number, ty: number): number => {
    const t = ground(tx, ty);
    if (t === undefined) return Tile.Grass;
    if (GRASS_LIKE.has(t)) return Tile.Grass;
    if (ROCKY.has(t)) {
      // Rocks sit on whatever region they're in.
      return isCaveGround(ground(tx, ty + 1)) || isCaveGround(ground(tx, ty - 1))
        ? Tile.CaveFloor
        : neighborsStone(ground, tx, ty)
          ? Tile.StoneFloor
          : Tile.Grass;
    }
    if (t === Tile.Furnace || t === Tile.Anvil) {
      return isCaveGround(ground(tx, ty + 1)) ? Tile.CaveFloor : nearestFloor(ground, tx, ty);
    }
    if (t === Tile.Workbench || t === Tile.BankChest || t === Tile.ShopCounter) {
      return nearestFloor(ground, tx, ty);
    }
    // Floors run UNDER walls: the prism covers its own tile, and the
    // floor skin meeting the wall base edge-on leaves no gap to peek
    // through beside it.
    if (t === Tile.WallWood) return Tile.WoodFloor;
    if (t === Tile.WallStone) return Tile.StoneFloor;
    if (t === Tile.CaveWall) return Tile.CaveFloor;
    // Stairs read as stone; the bespoke step prop draws over it.
    if (t === Tile.Ramp) return Tile.StoneFloor;
    if (t === Tile.Cliff) return Tile.StoneFloor;
    return t;
  };
  return g;
}

export function bakeChunk(
  ground: GroundSampler,
  detail: DetailSampler,
  elev: ElevSampler,
  cx: number,
  cy: number,
  px: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = CHUNK_SIZE * px;
  canvas.height = CHUNK_SIZE * px;
  const ctx = canvas.getContext('2d')!;
  const baseX = cx * CHUNK_SIZE;
  const baseY = cy * CHUNK_SIZE;

  const g = effectiveGround(ground);

  // 1. Meadow base: large soft noise patches, no per-tile checker.
  const cell = Math.max(4, Math.floor(px / 4));
  for (let y = 0; y < canvas.height; y += cell) {
    for (let x = 0; x < canvas.width; x += cell) {
      const wx = baseX + x / px;
      const wy = baseY + y / px;
      const n = valueNoise(1234, wx * 0.055, wy * 0.055) * 0.7 + valueNoise(777, wx * 0.021, wy * 0.021) * 0.3;
      const idx = n < 0.38 ? 3 : n < 0.52 ? 1 : n < 0.72 ? 0 : 2;
      ctx.fillStyle = GRASS_TONES[idx]!;
      ctx.fillRect(x, y, cell, cell);
    }
  }
  // Dark band chunks get a cave-rock base instead.
  if (baseY >= 512) {
    ctx.fillStyle = '#2e2938';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 2. Material skins, lowest to highest, contoured on the dual grid.
  drawLayerSkins(ctx, g, baseX, baseY, px);

  // 2b. Ground under raised terrain: the lifted plateau surface and the
  // cliff faces cover almost all of it, but any sliver that survives a
  // seam must read as shadowed rock — never sunny grass peeking out
  // from inside a mountain.
  fillMask(
    ctx,
    (tx, ty) => elev(tx, ty) > 0,
    baseX,
    baseY,
    px,
    '#282334',
  );

  // 3. Wood-floor plank seams (subtle, flat).
  drawPlanks(ctx, g, baseX, baseY, px);

  // 4. Baked micro-details (static ones only; swaying ones are live).
  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const tx = baseX + lx;
      const ty = baseY + ly;
      // Raised tiles' details belong to the lifted layer, not the base.
      if (elev(tx, ty) > 0) continue;
      drawTileDetail(ctx, g(tx, ty) ?? Tile.Grass, detail(tx, ty), tx, ty, lx, ly, px);
    }
  }

  return canvas;
}

/**
 * Material grain + static micro-props for one tile: sparse deterministic
 * flecks so the ground carries the same detail density as the props
 * above it. Shared by the base and lifted-terrain bakes.
 */
function drawTileDetail(
  ctx: CanvasRenderingContext2D,
  m: number,
  d: number,
  tx: number,
  ty: number,
  lx: number,
  ly: number,
  px: number,
): void {
  const hg = hashCoords(83, tx, ty);
  const gx = lx * px;
  const gy = ly * px;
      if (m === Tile.StoneFloor && hg % 3 === 0) {
        ctx.fillStyle = 'rgba(28, 24, 42, 0.09)';
        ctx.fillRect(gx + ((hg >> 3) % 60) / 100 * px, gy + ((hg >> 8) % 60) / 100 * px, px * 0.16, px * 0.05);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(gx + ((hg >> 5) % 60) / 100 * px, gy + ((hg >> 11) % 60) / 100 * px, px * 0.1, px * 0.04);
      } else if (m === Tile.Path && hg % 4 === 0) {
        ctx.fillStyle = 'rgba(94, 70, 40, 0.18)';
        for (let k = 0; k < 2; k++) {
          const hh = hashCoords(89 + k, tx, ty);
          ctx.fillRect(gx + (hh % 70) / 100 * px, gy + ((hh >> 7) % 70) / 100 * px, px * 0.06, px * 0.05);
        }
      } else if (m === Tile.Sand && hg % 3 === 0) {
        ctx.fillStyle = 'rgba(150, 116, 62, 0.2)';
        for (let k = 0; k < 3; k++) {
          const hh = hashCoords(97 + k, tx, ty);
          ctx.fillRect(gx + (hh % 80) / 100 * px, gy + ((hh >> 7) % 80) / 100 * px, px * 0.04, px * 0.04);
        }
      } else if (m === Tile.CaveFloor && hg % 5 === 0) {
        ctx.strokeStyle = 'rgba(20, 16, 32, 0.22)';
        ctx.lineWidth = Math.max(1, px * 0.03);
        ctx.beginPath();
        ctx.moveTo(gx + (hg % 50) / 100 * px, gy + ((hg >> 6) % 60) / 100 * px);
        ctx.lineTo(gx + ((hg % 50) + 30) / 100 * px, gy + (((hg >> 6) % 60) + 25) / 100 * px);
        ctx.stroke();
      }
      if (d === Detail.Pebbles) {
        // Angular stone chips, rotated apart so they never tile.
        const h = hashCoords(29, tx, ty);
        ctx.fillStyle = '#8b8494';
        for (const [ox, oy, pw, rot] of [
          [0.4, 0.55, 0.16, 0.4],
          [0.62, 0.38, 0.11, -0.5],
        ] as const) {
          ctx.save();
          ctx.translate(lx * px + px * ox, ly * px + px * oy);
          ctx.rotate(rot + (h % 7) * 0.1);
          ctx.beginPath();
          chamferRect(ctx, (-pw / 2) * px, (-pw * 0.4) * px, pw * px, pw * 0.8 * px, pw * px * 0.3);
          ctx.fill();
          ctx.restore();
        }
      } else if (d === Detail.Mushroom) {
        // Trapezoid cap — a faceted little roof.
        const mx = lx * px + px * 0.5;
        const my = ly * px + px * 0.55;
        ctx.fillStyle = '#efe3c2';
        ctx.fillRect(mx - px * 0.035, my - px * 0.02, px * 0.07, px * 0.14);
        ctx.fillStyle = '#c65b52';
        ctx.beginPath();
        ctx.moveTo(mx - px * 0.13, my - px * 0.02);
        ctx.lineTo(mx - px * 0.07, my - px * 0.11);
        ctx.lineTo(mx + px * 0.07, my - px * 0.11);
        ctx.lineTo(mx + px * 0.13, my - px * 0.02);
        ctx.closePath();
        ctx.fill();
      }
}

/**
 * Bake the LIFTED terrain surface of one chunk at one elevation level:
 * every tile at `level` or higher (ramps excluded — they get bespoke
 * stair props) painted with the full material-skin pipeline, clipped to
 * a marching-squares contour so the plateau top has the same crisp
 * 45°-cut coastline as every other material — then finished with a
 * sunlit brink line along the rim. The renderer draws this canvas
 * shifted UP by level·ELEV_H and y-sorted, which is what makes the
 * plateau a solid mass you can walk behind.
 */
export interface ElevatedBake {
  canvas: HTMLCanvasElement;
  /** Chunk rows (local ly) containing any lifted content at this level. */
  rows: boolean[];
}

export function bakeElevated(
  ground: GroundSampler,
  detail: DetailSampler,
  elev: ElevSampler,
  cx: number,
  cy: number,
  px: number,
  level: number,
): ElevatedBake | null {
  const baseX = cx * CHUNK_SIZE;
  const baseY = cy * CHUNK_SIZE;
  // Ramps count as mass, matching the cliff-face contour EXACTLY: the
  // flight repaints its own tile top-to-base after this band, so the
  // crown never shows through — but the shared silhouette means no
  // pinched notch above a stair, and the crown edge lands flush on the
  // faces beside it.
  const member = (tx: number, ty: number): boolean => elev(tx, ty) >= level;

  const rows: boolean[] = new Array(CHUNK_SIZE).fill(false);
  let any = false;
  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      if (member(baseX + lx, baseY + ly)) {
        rows[ly] = true;
        any = true;
      }
    }
  }
  if (!any) return null;

  const canvas = document.createElement('canvas');
  canvas.width = CHUNK_SIZE * px;
  canvas.height = CHUNK_SIZE * px;
  const ctx = canvas.getContext('2d')!;

  // The plateau-top silhouette, contoured between tile centers.
  // Cells touching a stair of THIS level turn with square corners
  // (quadrant rects) — a beveled crown would overhang the flight's
  // column with no face beneath it. Must match collectCliffFaces.
  const ownRamp = (tx: number, ty: number): boolean =>
    ground(tx, ty) === Tile.Ramp && elev(tx, ty) === level;
  const nearStair = (i: number, j: number): boolean =>
    ownRamp(baseX + i - 1, baseY + j - 1) ||
    ownRamp(baseX + i, baseY + j - 1) ||
    ownRamp(baseX + i, baseY + j) ||
    ownRamp(baseX + i - 1, baseY + j);
  const path = new Path2D();
  const maskAt = (i: number, j: number): number =>
    (member(baseX + i - 1, baseY + j - 1) ? 1 : 0) |
    (member(baseX + i, baseY + j - 1) ? 2 : 0) |
    (member(baseX + i, baseY + j) ? 4 : 0) |
    (member(baseX + i - 1, baseY + j) ? 8 : 0);
  for (let j = 0; j <= CHUNK_SIZE; j++) {
    for (let i = 0; i <= CHUNK_SIZE; i++) {
      const mask = maskAt(i, j);
      if (mask === 0) continue;
      if (nearStair(i, j)) maskQuadrants(path, mask, (i - 0.5) * px, (j - 0.5) * px, px);
      else maskPolygon(path, mask, (i - 0.5) * px, (j - 0.5) * px, px);
    }
  }

  // Cliff crowns and stairs read as the surface they carry.
  const gInner = (tx: number, ty: number): number | undefined => {
    const t = ground(tx, ty);
    if (t === Tile.Cliff || t === Tile.Ramp) {
      for (const [dx, dy] of [[0, -1], [1, 0], [-1, 0], [0, 1]] as const) {
        const t2 = ground(tx + dx, ty + dy);
        if (
          t2 !== undefined &&
          t2 !== Tile.Cliff &&
          t2 !== Tile.Ramp &&
          elev(tx + dx, ty + dy) >= level
        ) {
          return t2;
        }
      }
      return Tile.StoneFloor;
    }
    return t;
  };
  const g = effectiveGround(gInner);

  ctx.save();
  ctx.clip(path);

  // Meadow base under the skins, same recipe as the ground floor.
  const cell = Math.max(4, Math.floor(px / 4));
  for (let y = 0; y < canvas.height; y += cell) {
    for (let x = 0; x < canvas.width; x += cell) {
      const wx = baseX + x / px;
      const wy = baseY + y / px;
      const n = valueNoise(1234, wx * 0.055, wy * 0.055) * 0.7 + valueNoise(777, wx * 0.021, wy * 0.021) * 0.3;
      const idx = n < 0.38 ? 3 : n < 0.52 ? 1 : n < 0.72 ? 0 : 2;
      ctx.fillStyle = GRASS_TONES[idx]!;
      ctx.fillRect(x, y, cell, cell);
    }
  }
  drawLayerSkins(ctx, g, baseX, baseY, px);
  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const tx = baseX + lx;
      const ty = baseY + ly;
      if (!member(tx, ty)) continue;
      drawTileDetail(ctx, g(tx, ty) ?? Tile.Grass, detail(tx, ty), tx, ty, lx, ly, px);
    }
  }
  ctx.restore();

  // The rim SHOULDER: a chunky bordered edge along the whole crown
  // contour — the exposed-rock lip every classic cliff tileset gives
  // its edges. This is what makes a level change read as a ledge on
  // ALL sides, including the north back edge and east/west edges that
  // are edge-on to the camera (where the wall face itself is nearly
  // invisible). Layered strokes clipped to the crown: only the inner
  // half of each stroke shows, so the band sits entirely on top.
  const rim = new Path2D();
  for (let j = 0; j <= CHUNK_SIZE; j++) {
    for (let i = 0; i <= CHUNK_SIZE; i++) {
      const mask = maskAt(i, j);
      if (mask === 0 || mask === 15) continue;
      const segs = nearStair(i, j) ? contourSegsSquare(mask) : contourSegs(mask);
      for (const [x0, y0, x1, y1] of segs) {
        rim.moveTo((i + x0) * px, (j + y0) * px);
        rim.lineTo((i + x1) * px, (j + y1) * px);
      }
    }
  }
  ctx.save();
  ctx.clip(path);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Soft shade band fading in from the edge (inner ~0.26 tile).
  ctx.strokeStyle = 'rgba(45, 38, 58, 0.18)';
  ctx.lineWidth = px * 0.52;
  ctx.stroke(rim);
  // Rock shoulder: the worn stone border itself (inner ~0.16 tile).
  ctx.strokeStyle = 'rgba(74, 67, 88, 0.5)';
  ctx.lineWidth = px * 0.32;
  ctx.stroke(rim);
  // Dark crease just inside the lip (inner ~0.08 tile).
  ctx.strokeStyle = 'rgba(28, 22, 40, 0.35)';
  ctx.lineWidth = px * 0.16;
  ctx.stroke(rim);
  // Sunlit lip at the very edge.
  ctx.strokeStyle = 'rgba(255, 244, 214, 0.3)';
  ctx.lineWidth = Math.max(2, px * 0.07);
  ctx.stroke(rim);
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.restore();

  return { canvas, rows };
}

/**
 * Contour segments of a marching-squares cell in cell-local units
 * (edge midpoints at ±0.5 around the cell center at 0,0).
 */
function contourSegs(mask: number): Array<[number, number, number, number]> {
  const T: [number, number] = [0, -0.5];
  const R: [number, number] = [0.5, 0];
  const B: [number, number] = [0, 0.5];
  const L: [number, number] = [-0.5, 0];
  const seg = (a: [number, number], b: [number, number]): [number, number, number, number] =>
    [a[0], a[1], b[0], b[1]];
  switch (mask) {
    case 1: case 14: return [seg(T, L)];
    case 2: case 13: return [seg(T, R)];
    case 4: case 11: return [seg(R, B)];
    case 8: case 7: return [seg(L, B)];
    case 3: case 12: return [seg(L, R)];
    case 6: case 9: return [seg(T, B)];
    case 5: return [seg(T, R), seg(B, L)];
    default: return [seg(T, L), seg(R, B)]; // 10
  }
}

/**
 * Square-corner contour of a marching-squares cell: a boundary piece
 * exists wherever two adjacent quadrants differ in membership. Cell-
 * local units matching contourSegs (center at 0,0, edge midpoints ±0.5).
 */
function contourSegsSquare(mask: number): Array<[number, number, number, number]> {
  const bit = (b: number): boolean => (mask & b) !== 0;
  const out: Array<[number, number, number, number]> = [];
  if (bit(1) !== bit(2)) out.push([0, -0.5, 0, 0]);
  if (bit(8) !== bit(4)) out.push([0, 0, 0, 0.5]);
  if (bit(1) !== bit(8)) out.push([-0.5, 0, 0, 0]);
  if (bit(2) !== bit(4)) out.push([0, 0, 0.5, 0]);
  return out;
}

/**
 * Square-corner variant of maskPolygon: one quadrant rect per set
 * corner bit. Used for cells touching a stair, where a beveled corner
 * would encroach on the flight's column.
 */
function maskQuadrants(
  ctx: CanvasRenderingContext2D | Path2D,
  mask: number,
  x0: number,
  y0: number,
  size: number,
): void {
  const m = size / 2;
  if (mask & 1) ctx.rect(x0, y0, m, m);
  if (mask & 2) ctx.rect(x0 + m, y0, m, m);
  if (mask & 4) ctx.rect(x0 + m, y0 + m, m, m);
  if (mask & 8) ctx.rect(x0, y0 + m, m, m);
}

/** Fill the marching-squares union of `member` tiles with one color. */
function fillMask(
  ctx: CanvasRenderingContext2D,
  member: (tx: number, ty: number) => boolean,
  baseX: number,
  baseY: number,
  px: number,
  color: string,
): void {
  const path = new Path2D();
  let any = false;
  for (let j = 0; j <= CHUNK_SIZE; j++) {
    for (let i = 0; i <= CHUNK_SIZE; i++) {
      const mask =
        (member(baseX + i - 1, baseY + j - 1) ? 1 : 0) |
        (member(baseX + i, baseY + j - 1) ? 2 : 0) |
        (member(baseX + i, baseY + j) ? 4 : 0) |
        (member(baseX + i - 1, baseY + j) ? 8 : 0);
      if (mask === 0) continue;
      any = true;
      maskPolygon(path, mask, (i - 0.5) * px, (j - 0.5) * px, px);
    }
  }
  if (!any) return;
  ctx.fillStyle = color;
  ctx.fill(path);
}

function neighborsStone(ground: GroundSampler, tx: number, ty: number): boolean {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    if (ground(tx + dx, ty + dy) === Tile.StoneFloor) return true;
  }
  return false;
}

function nearestFloor(ground: GroundSampler, tx: number, ty: number): number {
  for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]] as const) {
    const t = ground(tx + dx, ty + dy);
    if (t === Tile.WoodFloor || t === Tile.StoneFloor || t === Tile.CaveFloor || t === Tile.Dirt) {
      return t;
    }
  }
  return Tile.Grass;
}

/** Which skin layer a tile belongs to, or -1 for the grass base. */
function layerIndexOf(t: number): number {
  for (let i = 0; i < BLOB_LAYERS.length; i++) {
    if (BLOB_LAYERS[i]!.match(t)) return i;
  }
  return -1;
}

/**
 * DUAL-GRID MARCHING SQUARES — the terrain skin.
 *
 * Regions are contoured from the corners BETWEEN tiles: each dual cell
 * (a square spanning four tile centers) looks at which of its corner
 * tiles belong to the layer and draws one of 16 polygons. Diagonal
 * steps in the tile data become clean 45° edges instead of staircases,
 * straight edges stay straight, and the grid disappears while the
 * geometry stays deliberately blocky.
 *
 * Layer membership is CUMULATIVE: a layer counts every tile whose
 * material paints ABOVE it as its own, so lower materials extend under
 * higher ones and the base can never peek through a boundary. Painted
 * lowest → highest, higher skins cover the underlap.
 */
function drawLayerSkins(
  ctx: CanvasRenderingContext2D,
  g: GroundSampler,
  baseX: number,
  baseY: number,
  px: number,
): void {
  // Precompute the layer index of every tile touching this chunk once.
  const N = CHUNK_SIZE + 2;
  const idx = new Int8Array(N * N);
  for (let ly = -1; ly <= CHUNK_SIZE; ly++) {
    for (let lx = -1; lx <= CHUNK_SIZE; lx++) {
      idx[lx + 1 + (ly + 1) * N] = layerIndexOf(g(baseX + lx, baseY + ly) ?? Tile.Grass);
    }
  }
  const at = (lx: number, ly: number): number => idx[lx + 1 + (ly + 1) * N]!;

  for (let li = 0; li < BLOB_LAYERS.length; li++) {
    const layer = BLOB_LAYERS[li]!;
    for (let j = 0; j <= CHUNK_SIZE; j++) {
      for (let i = 0; i <= CHUNK_SIZE; i++) {
        // Corner tiles of this dual cell.
        const tl = at(i - 1, j - 1);
        const tr = at(i, j - 1);
        const br = at(i, j);
        const bl = at(i - 1, j);
        const mask =
          (tl >= li && tl !== -1 ? 1 : 0) |
          (tr >= li && tr !== -1 ? 2 : 0) |
          (br >= li && br !== -1 ? 4 : 0) |
          (bl >= li && bl !== -1 ? 8 : 0);
        if (mask === 0) continue;
        // Color from a corner that is truly of this layer if possible
        // (members-by-underlap sit above and will repaint themselves).
        let ctx2 = -1;
        let cty = -1;
        if (tl === li) { ctx2 = i - 1; cty = j - 1; }
        else if (tr === li) { ctx2 = i; cty = j - 1; }
        else if (bl === li) { ctx2 = i - 1; cty = j; }
        else if (br === li) { ctx2 = i; cty = j; }
        else { ctx2 = i; cty = j; }
        ctx.fillStyle = layer.color(0, baseX + ctx2, baseY + cty);
        ctx.beginPath();
        maskPolygon(ctx, mask, (i - 0.5) * px, (j - 0.5) * px, px);
        ctx.fill();
        // Hairline same-color stroke kills antialiasing seams between
        // adjacent cells of one region.
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }
  }
}

/**
 * The 16 marching-squares cases as polygon subpaths. Corner bits:
 * TL=1, TR=2, BR=4, BL=8. Diagonal pairs draw a CONNECTED band so
 * touching-at-a-corner regions read as one flow, never a pinch.
 */
function maskPolygon(
  ctx: CanvasRenderingContext2D | Path2D,
  mask: number,
  x0: number,
  y0: number,
  size: number,
): void {
  const m = size / 2;
  const x1 = x0 + size;
  const y1 = y0 + size;
  const poly = (pts: number[][]): void => {
    ctx.moveTo(pts[0]![0]!, pts[0]![1]!);
    for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k]![0]!, pts[k]![1]!);
    ctx.closePath();
  };
  switch (mask) {
    case 15: ctx.rect(x0, y0, size, size); break;
    case 1: poly([[x0, y0], [x0 + m, y0], [x0, y0 + m]]); break;
    case 2: poly([[x0 + m, y0], [x1, y0], [x1, y0 + m]]); break;
    case 4: poly([[x1, y0 + m], [x1, y1], [x0 + m, y1]]); break;
    case 8: poly([[x0, y0 + m], [x0 + m, y1], [x0, y1]]); break;
    case 3: ctx.rect(x0, y0, size, m); break;
    case 12: ctx.rect(x0, y0 + m, size, m); break;
    case 9: ctx.rect(x0, y0, m, size); break;
    case 6: ctx.rect(x0 + m, y0, m, size); break;
    case 7: poly([[x0, y0], [x1, y0], [x1, y1], [x0 + m, y1], [x0, y0 + m]]); break;
    case 11: poly([[x0, y0], [x1, y0], [x1, y0 + m], [x0 + m, y1], [x0, y1]]); break;
    case 13: poly([[x0, y0], [x0 + m, y0], [x1, y0 + m], [x1, y1], [x0, y1]]); break;
    case 14: poly([[x0 + m, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0 + m]]); break;
    case 5: poly([[x0, y0], [x0 + m, y0], [x1, y0 + m], [x1, y1], [x0 + m, y1], [x0, y0 + m]]); break;
    case 10: poly([[x0 + m, y0], [x1, y0], [x1, y0 + m], [x0 + m, y1], [x0, y1], [x0, y0 + m]]); break;
  }
}

function drawPlanks(
  ctx: CanvasRenderingContext2D,
  g: GroundSampler,
  baseX: number,
  baseY: number,
  px: number,
): void {
  ctx.strokeStyle = 'rgba(58, 40, 22, 0.25)';
  ctx.lineWidth = Math.max(1, px * 0.04);
  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const t = g(baseX + lx, baseY + ly);
      if (t !== Tile.WoodFloor && t !== Tile.Bridge) continue;
      const y = ly * px + px * (0.33 + (hashCoords(43, baseX + lx, baseY + ly) % 3) * 0.17);
      ctx.beginPath();
      ctx.moveTo(lx * px, y);
      ctx.lineTo(lx * px + px, y);
      ctx.stroke();
    }
  }
}

// ------------------------------------------------------ live decorations

/**
 * The breeze layer: swaying grass blades, drifting water glints, pulsing
 * ripples and portal swirls. Drawn every frame over the baked ground —
 * this is what makes the meadow feel alive.
 */
export function drawLiveGround(
  ctx: CanvasRenderingContext2D,
  ground: GroundSampler,
  detail: DetailSampler,
  bounds: { minTx: number; maxTx: number; minTy: number; maxTy: number },
  worldToScreen: (wx: number, wy: number) => { x: number; y: number },
  s: number,
  timeMs: number,
): void {
  const t = timeMs / 1000;
  drawShorelines(ctx, ground, bounds, worldToScreen, s, t);
  for (let ty = bounds.minTy; ty <= bounds.maxTy; ty++) {
    for (let tx = bounds.minTx; tx <= bounds.maxTx; tx++) {
      const tile = ground(tx, ty);
      if (tile === undefined) continue;
      const h = hashCoords(59, tx, ty);

      if (tile === Tile.Grass || tile === Tile.GrassTall) {
        const isTall = tile === Tile.GrassTall;
        // A fraction of tiles grow visible blades.
        if (!isTall && h % 5 !== 0) {
          // Some of the rest get swaying flowers from the detail layer.
          const d = detail(tx, ty);
          if (d === Detail.Flowers) drawFlowers(ctx, tx, ty, worldToScreen, s, t, h);
          else if (d === Detail.Tuft) drawBlades(ctx, tx, ty, worldToScreen, s, t, h, 2, false);
          continue;
        }
        drawBlades(ctx, tx, ty, worldToScreen, s, t, h, isTall ? 5 : 3, isTall);
      } else if (tile === Tile.Water || tile === Tile.WaterDeep) {
        if (h % 6 === 0) {
          // Drifting glint: a short dash that slides and fades.
          const phase = (t * 0.35 + (h % 100) / 100) % 1;
          const gx = tx + ((h >> 4) % 60) / 100 + phase * 0.35;
          const gy = ty + ((h >> 9) % 60) / 100 + 0.2;
          const p = worldToScreen(gx, gy);
          ctx.globalAlpha = Math.sin(phase * Math.PI) * 0.5;
          ctx.strokeStyle = '#cfe3f7';
          ctx.lineWidth = Math.max(1.5, s * 0.05);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + s * 0.22, p.y);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      } else if (tile === Tile.FishingSpot) {
        const p = worldToScreen(tx + 0.5, ty + 0.5);
        for (let ring = 0; ring < 2; ring++) {
          const phase = (t * 0.6 + ring * 0.5) % 1;
          ctx.globalAlpha = (1 - phase) * 0.6;
          ctx.strokeStyle = '#dcebfb';
          ctx.lineWidth = Math.max(1.5, s * 0.05);
          ctx.beginPath();
          ctx.arc(p.x, p.y, (0.1 + phase * 0.34) * s, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (tile === Tile.PortalDown || tile === Tile.PortalUp) {
        drawPortal(ctx, tx, ty, tile === Tile.PortalUp, worldToScreen, s, t);
      }
    }
  }
}

/** Water tiles that share a shoreline (no foam between each other). */
function isWaterTile(t: number | undefined): boolean {
  return t === Tile.Water || t === Tile.WaterDeep || t === Tile.FishingSpot;
}

/**
 * Shoreline dressing: a dark waterline plus slow-breathing foam dashes
 * that slide along the shore. Runs on the SAME dual-grid contour as
 * the water skin (marching squares over tile corners), so the line
 * follows the drawn diagonals exactly — never staircase ticks.
 */
function drawShorelines(
  ctx: CanvasRenderingContext2D,
  ground: GroundSampler,
  bounds: { minTx: number; maxTx: number; minTy: number; maxTy: number },
  worldToScreen: (wx: number, wy: number) => { x: number; y: number },
  s: number,
  t: number,
): void {
  ctx.lineCap = 'round';
  for (let j = bounds.minTy; j <= bounds.maxTy + 1; j++) {
    for (let i = bounds.minTx; i <= bounds.maxTx + 1; i++) {
      const mask =
        (isWaterTile(ground(i - 1, j - 1)) ? 1 : 0) |
        (isWaterTile(ground(i, j - 1)) ? 2 : 0) |
        (isWaterTile(ground(i, j)) ? 4 : 0) |
        (isWaterTile(ground(i - 1, j)) ? 8 : 0);
      if (mask === 0 || mask === 15) continue;
      // Contour endpoints: midpoints of this dual cell's edges.
      const top: [number, number] = [i, j - 0.5];
      const right: [number, number] = [i + 0.5, j];
      const bottom: [number, number] = [i, j + 0.5];
      const left: [number, number] = [i - 0.5, j];
      let segs: Array<[[number, number], [number, number]]>;
      switch (mask) {
        case 1: case 14: segs = [[top, left]]; break;
        case 2: case 13: segs = [[top, right]]; break;
        case 4: case 11: segs = [[right, bottom]]; break;
        case 8: case 7: segs = [[left, bottom]]; break;
        case 3: case 12: segs = [[left, right]]; break;
        case 6: case 9: segs = [[top, bottom]]; break;
        case 5: segs = [[top, right], [bottom, left]]; break;
        default: segs = [[top, left], [right, bottom]]; break; // 10
      }
      for (let k = 0; k < segs.length; k++) {
        const a = worldToScreen(segs[k]![0]![0], segs[k]![0]![1]);
        const b = worldToScreen(segs[k]![1]![0], segs[k]![1]![1]);
        // Waterline: constant dark edge along the visual shore.
        ctx.strokeStyle = 'rgba(26, 48, 96, 0.32)';
        ctx.lineWidth = Math.max(1.5, s * 0.055);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        // Foam: a dash sliding along the segment, breathing in and out.
        const hh = hashCoords(71 + k, i, j);
        const alpha = Math.sin(((t * 0.45 + (hh % 40) / 40) % 1) * Math.PI);
        if (alpha < 0.12) continue;
        const u = (t * 0.1 + (hh % 100) / 100) % 0.75;
        const u1 = u + 0.25;
        ctx.strokeStyle = '#dcebfb';
        ctx.lineWidth = Math.max(1.5, s * 0.05);
        ctx.globalAlpha = alpha * 0.65;
        ctx.beginPath();
        ctx.moveTo(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u);
        ctx.lineTo(a.x + (b.x - a.x) * u1, a.y + (b.y - a.y) * u1);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }
  ctx.lineCap = 'butt';
}

function drawBlades(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  worldToScreen: (wx: number, wy: number) => { x: number; y: number },
  s: number,
  t: number,
  h: number,
  count: number,
  tall: boolean,
): void {
  ctx.strokeStyle = tall ? '#4a7433' : '#6b9a4e';
  ctx.lineWidth = Math.max(1.2, s * 0.045);
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const hh = hashCoords(61 + i, tx, ty);
    const bx = tx + 0.15 + ((hh >> 3) % 70) / 100;
    const by = ty + 0.2 + ((hh >> 10) % 70) / 100;
    const height = (tall ? 0.3 : 0.2) * (0.8 + ((hh >> 5) % 40) / 100);
    // The breeze: tips sway together on a slow travelling wave.
    const sway = Math.sin(t * 1.6 + bx * 0.7 + by * 0.35 + (hh % 10) * 0.2) * 0.09;
    const base = worldToScreen(bx, by);
    // Blades are VERTICAL: they rise in screen space at full height —
    // only their ground anchor foreshortens with the camera pitch.
    const tipX = base.x + sway * s;
    const tipY = base.y - height * s;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.quadraticCurveTo(base.x, (base.y + tipY) / 2, tipX, tipY);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

function drawFlowers(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  worldToScreen: (wx: number, wy: number) => { x: number; y: number },
  s: number,
  t: number,
  h: number,
): void {
  const colors = ['#e88a9e', '#f0d264', '#efe3c2'];
  for (let i = 0; i < 2; i++) {
    const hh = hashCoords(67 + i, tx, ty);
    const bx = tx + 0.2 + ((hh >> 3) % 60) / 100;
    const by = ty + 0.25 + ((hh >> 9) % 60) / 100;
    const sway = Math.sin(t * 1.6 + bx * 0.7 + (hh % 7) * 0.3) * 0.05;
    const base = worldToScreen(bx, by);
    // Stems are vertical — full screen-space height, like the blades.
    const head = { x: base.x + sway * s, y: base.y - 0.16 * s };
    ctx.strokeStyle = '#4a7433';
    ctx.lineWidth = Math.max(1, s * 0.035);
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(head.x, head.y);
    ctx.stroke();
    // Diamond bloom — four petals as one faceted chip.
    const pr = s * 0.07;
    ctx.fillStyle = colors[hh % colors.length]!;
    ctx.beginPath();
    ctx.moveTo(head.x, head.y - pr);
    ctx.lineTo(head.x + pr, head.y);
    ctx.lineTo(head.x, head.y + pr);
    ctx.lineTo(head.x - pr, head.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f7efd8';
    ctx.fillRect(head.x - s * 0.02, head.y - s * 0.02, s * 0.04, s * 0.04);
  }
}

function drawPortal(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  up: boolean,
  worldToScreen: (wx: number, wy: number) => { x: number; y: number },
  s: number,
  t: number,
): void {
  const p = worldToScreen(tx + 0.5, ty + 0.5);
  const base = up ? '#b8a5e8' : '#7a68b0';
  // Dark pool.
  ctx.fillStyle = up ? 'rgba(65, 56, 98, 0.9)' : 'rgba(26, 22, 38, 0.9)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, s * 0.4, s * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  // Rotating spiral arms.
  ctx.strokeStyle = base;
  ctx.lineWidth = Math.max(1.5, s * 0.06);
  ctx.lineCap = 'round';
  for (let arm = 0; arm < 3; arm++) {
    const a0 = t * 1.4 + (arm * Math.PI * 2) / 3;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const f = i / 8;
      const ang = a0 + f * 2.2;
      const rad = (0.06 + f * 0.28) * s;
      const x = p.x + Math.cos(ang) * rad;
      const y = p.y + Math.sin(ang) * rad * 0.8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // Center glow dot.
  ctx.fillStyle = '#efe3ff';
  ctx.beginPath();
  ctx.arc(p.x, p.y, s * 0.05 + Math.sin(t * 3) * s * 0.015, 0, Math.PI * 2);
  ctx.fill();
}
