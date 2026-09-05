/**
 * THE GROUND HAS SIDES (play3d S1) — a chunk's tile elevation levels
 * become a real mesh: one flat quad per tile at its level, and a real
 * VERTICAL FACE wherever a tile stands higher than its neighbour.
 *
 * This module is PURE: numbers in, typed arrays out. No DOM, no
 * Three.js — the node test runner proves it, and ground.ts merely
 * wraps the arrays in a BufferGeometry.
 *
 * Laws:
 *  - Tops are FLAT per tile (levels are integers on the wire; the 2D
 *    game paints plateau tops flat, so does this). Only Ramp tiles
 *    slope: their corners toward the higher cardinal neighbour take the
 *    high level, the far corners the low one.
 *  - THE HIGH TILE OWNS THE FACE. A vertical face is emitted by the tile
 *    whose edge is higher, once, with THAT tile's texture rect — so a
 *    cliff wall wears the cliff tile's baked art, chunk borders never
 *    double-emit, and the low side never paints a grass wall.
 *  - Faces stretch the tile rect vertically (a 3-level drop is one
 *    stretched rect). THE CURTAIN IS THE FACE (W2 fixes): with the
 *    terrain-forms lane mounted, the heightfield emits NO faces of its
 *    own (`faces: false`) — the lane's cliff curtains, read from the
 *    SAME edge law through `collectStepFaces` below, are the only
 *    geometry there; nothing is drawn twice. Labs and tests without
 *    the lane keep the stretched-rect placeholder (`faces` defaults
 *    true).
 *  - UVs address the baked chunk canvas INSIDE its gutter, so the
 *    gutter's real neighbour content feeds the sampler at chunk edges
 *    (the same reason the 2D blit insets) and nothing is cropped.
 *  - Winding is corrected against the intended normal, so every quad is
 *    front-facing whichever way the caller hands its corners.
 */

export interface HeightfieldInput {
  cx: number;
  cy: number;
  /** Tiles per chunk side. */
  size: number;
  /** Elevation LEVEL of any world tile (neighbours included). */
  levelAt: (tx: number, ty: number) => number;
  /** True when the world tile is a walkable Ramp. */
  isRamp: (tx: number, ty: number) => boolean;
  /** World height of one level, in tiles. */
  levelH: number;
  /** Bake pixels per tile and the bake gutter, for the UV inset. */
  px: number;
  gutter: number;
  /** Emit the placeholder vertical faces (default true; false when the terrain-forms lane owns the cliffs). */
  faces?: boolean;
}

export interface HeightfieldMesh {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  vertexCount: number;
  /** Vertical faces emitted (cliff walls). */
  faceCount: number;
  /** Tallest vertex (world units) — the streamer's bounding box. */
  maxY: number;
  minY: number;
}

/** Corner levels of a tile: [nw, ne, se, sw], sloped for ramps. */
export function cornerLevels(
  tx: number,
  ty: number,
  levelAt: HeightfieldInput['levelAt'],
  isRamp: HeightfieldInput['isRamp'],
  out: Float64Array,
): Float64Array {
  const own = levelAt(tx, ty);
  if (!isRamp(tx, ty)) {
    out[0] = out[1] = out[2] = out[3] = own;
    return out;
  }
  const n = levelAt(tx, ty - 1);
  const s = levelAt(tx, ty + 1);
  const e = levelAt(tx + 1, ty);
  const w = levelAt(tx - 1, ty);
  const hi = Math.max(n, s, e, w);
  const lo = Math.min(n, s, e, w);
  if (hi === lo) {
    out[0] = out[1] = out[2] = out[3] = own;
    return out;
  }
  if (n === hi) {
    out[0] = out[1] = hi;
    out[2] = out[3] = lo;
  } else if (s === hi) {
    out[2] = out[3] = hi;
    out[0] = out[1] = lo;
  } else if (e === hi) {
    out[1] = out[2] = hi;
    out[0] = out[3] = lo;
  } else {
    out[0] = out[3] = hi;
    out[1] = out[2] = lo;
  }
  return out;
}

/**
 * Bilinear height (world units) at a world point — entities stand on
 * this. Flat tiles return their level; ramps slope between corners.
 */
export function heightAtPoint(
  wx: number,
  wy: number,
  levelAt: HeightfieldInput['levelAt'],
  isRamp: HeightfieldInput['isRamp'],
  levelH: number,
  scratch: Float64Array,
): number {
  const tx = Math.floor(wx);
  const ty = Math.floor(wy);
  const c = cornerLevels(tx, ty, levelAt, isRamp, scratch);
  const fx = wx - tx;
  const fy = wy - ty;
  const top = c[0]! + (c[1]! - c[0]!) * fx;
  const bot = c[3]! + (c[2]! - c[3]!) * fx;
  return (top + (bot - top) * fy) * levelH;
}

const EPS = 1e-4;

class MeshSink {
  positions: number[] = [];
  normals: number[] = [];
  uvs: number[] = [];
  indices: number[] = [];
  faceCount = 0;
  maxY = -Infinity;
  minY = Infinity;

  /**
   * Push a quad (p0..p3 as flat xyz triples in `p`), with per-corner uv
   * pairs in `uv`, oriented so its geometric normal agrees with `n`.
   */
  quad(p: Float64Array, uv: Float64Array, nx: number, ny: number, nz: number): void {
    const base = this.positions.length / 3;
    for (let i = 0; i < 4; i++) {
      const y = p[i * 3 + 1]!;
      this.positions.push(p[i * 3]!, y, p[i * 3 + 2]!);
      this.normals.push(nx, ny, nz);
      this.uvs.push(uv[i * 2]!, uv[i * 2 + 1]!);
      if (y > this.maxY) this.maxY = y;
      if (y < this.minY) this.minY = y;
    }
    // Orientation check: (p1-p0) x (p2-p0) · n must be positive.
    const ax = p[3]! - p[0]!;
    const ay = p[4]! - p[1]!;
    const az = p[5]! - p[2]!;
    const bx = p[6]! - p[0]!;
    const by = p[7]! - p[1]!;
    const bz = p[8]! - p[2]!;
    const cx = ay * bz - az * by;
    const cy = az * bx - ax * bz;
    const cz = ax * by - ay * bx;
    const dot = cx * nx + cy * ny + cz * nz;
    if (dot >= 0) this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    else this.indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
}

/** Build the chunk mesh. Vertex count stays well under 2^32 (uint32 indices). */
export function buildHeightfield(inp: HeightfieldInput): HeightfieldMesh {
  const { cx, cy, size, levelAt, isRamp, levelH, px, gutter } = inp;
  // THE CURTAIN IS THE FACE: the caller says whether the placeholder faces stand.
  const faces = inp.faces !== false;
  const sink = new MeshSink();
  const x0 = cx * size;
  const y0 = cy * size;
  const canvasPx = size * px + gutter * 2;
  const c = new Float64Array(4);
  const nb = new Float64Array(4);
  const p = new Float64Array(12);
  const uv = new Float64Array(8);

  // UV of a tile-local corner (lx, ly in 0..size) inside the gutter.
  const u = (lx: number): number => (gutter + lx * px) / canvasPx;
  const v = (ly: number): number => 1 - (gutter + ly * px) / canvasPx;

  const setP = (i: number, x: number, y: number, z: number): void => {
    p[i * 3] = x;
    p[i * 3 + 1] = y;
    p[i * 3 + 2] = z;
  };
  const setUv = (i: number, uu: number, vv: number): void => {
    uv[i * 2] = uu;
    uv[i * 2 + 1] = vv;
  };

  for (let ly = 0; ly < size; ly++) {
    for (let lx = 0; lx < size; lx++) {
      const tx = x0 + lx;
      const ty = y0 + ly;
      cornerLevels(tx, ty, levelAt, isRamp, c);
      const hNw = c[0]! * levelH;
      const hNe = c[1]! * levelH;
      const hSe = c[2]! * levelH;
      const hSw = c[3]! * levelH;
      // Top quad: nw, ne, se, sw.
      setP(0, tx, hNw, ty);
      setP(1, tx + 1, hNe, ty);
      setP(2, tx + 1, hSe, ty + 1);
      setP(3, tx, hSw, ty + 1);
      setUv(0, u(lx), v(ly));
      setUv(1, u(lx + 1), v(ly));
      setUv(2, u(lx + 1), v(ly + 1));
      setUv(3, u(lx), v(ly + 1));
      // Ramps get a sloped normal from the actual corner plane.
      let nx = 0;
      let ny = 1;
      let nz = 0;
      if (hNw !== hNe || hNw !== hSw) {
        const ax = 1;
        const ay = hNe - hNw;
        const az = 0;
        const bx = 0;
        const by = hSw - hNw;
        const bz = 1;
        // cross(b, a) points up for this corner order.
        nx = by * az - bz * ay;
        ny = bz * ax - bx * az;
        nz = bx * ay - by * ax;
        const len = Math.hypot(nx, ny, nz) || 1;
        nx /= len;
        ny /= len;
        nz /= len;
      }
      sink.quad(p, uv, nx, ny, nz);

      if (faces) {
        // Vertical faces: THE HIGH TILE OWNS THE FACE. Each edge compares
        // this tile's two edge corners against the neighbour's matching
        // pair and emits when this side is (strictly) higher on average.
        // East edge: own ne/se vs neighbour nw/sw.
        cornerLevels(tx + 1, ty, levelAt, isRamp, nb);
        if (c[1]! + c[2]! > nb[0]! + nb[3]! + EPS) {
          setP(0, tx + 1, hNe, ty);
          setP(1, tx + 1, hSe, ty + 1);
          setP(2, tx + 1, nb[3]! * levelH, ty + 1);
          setP(3, tx + 1, nb[0]! * levelH, ty);
          setUv(0, u(lx), v(ly));
          setUv(1, u(lx + 1), v(ly));
          setUv(2, u(lx + 1), v(ly + 1));
          setUv(3, u(lx), v(ly + 1));
          sink.quad(p, uv, 1, 0, 0);
          sink.faceCount++;
        }
        // West edge: own nw/sw vs neighbour ne/se.
        cornerLevels(tx - 1, ty, levelAt, isRamp, nb);
        if (c[0]! + c[3]! > nb[1]! + nb[2]! + EPS) {
          setP(0, tx, hSw, ty + 1);
          setP(1, tx, hNw, ty);
          setP(2, tx, nb[1]! * levelH, ty);
          setP(3, tx, nb[2]! * levelH, ty + 1);
          setUv(0, u(lx), v(ly));
          setUv(1, u(lx + 1), v(ly));
          setUv(2, u(lx + 1), v(ly + 1));
          setUv(3, u(lx), v(ly + 1));
          sink.quad(p, uv, -1, 0, 0);
          sink.faceCount++;
        }
        // South edge: own sw/se vs neighbour nw/ne.
        cornerLevels(tx, ty + 1, levelAt, isRamp, nb);
        if (c[3]! + c[2]! > nb[0]! + nb[1]! + EPS) {
          setP(0, tx, hSw, ty + 1);
          setP(1, tx + 1, hSe, ty + 1);
          setP(2, tx + 1, nb[1]! * levelH, ty + 1);
          setP(3, tx, nb[0]! * levelH, ty + 1);
          setUv(0, u(lx), v(ly));
          setUv(1, u(lx + 1), v(ly));
          setUv(2, u(lx + 1), v(ly + 1));
          setUv(3, u(lx), v(ly + 1));
          sink.quad(p, uv, 0, 0, 1);
          sink.faceCount++;
        }
        // North edge: own ne/nw vs neighbour se/sw.
        cornerLevels(tx, ty - 1, levelAt, isRamp, nb);
        if (c[0]! + c[1]! > nb[3]! + nb[2]! + EPS) {
          setP(0, tx + 1, hNe, ty);
          setP(1, tx, hNw, ty);
          setP(2, tx, nb[3]! * levelH, ty);
          setP(3, tx + 1, nb[2]! * levelH, ty);
          setUv(0, u(lx), v(ly));
          setUv(1, u(lx + 1), v(ly));
          setUv(2, u(lx + 1), v(ly + 1));
          setUv(3, u(lx), v(ly + 1));
          sink.quad(p, uv, 0, 0, -1);
          sink.faceCount++;
        }
      }
    }
  }

  return {
    positions: Float32Array.from(sink.positions),
    normals: Float32Array.from(sink.normals),
    uvs: Float32Array.from(sink.uvs),
    indices: Uint32Array.from(sink.indices),
    vertexCount: sink.positions.length / 3,
    faceCount: sink.faceCount,
    maxY: sink.maxY,
    minY: sink.minY,
  };
}

// ------------------------------------------------- per-face metadata (W2)

/** Which tile edge a step face stands on (the HIGH tile's edge). */
export type StepSide = 'N' | 'E' | 'S' | 'W';

/**
 * One vertical step face of the heightfield, as the TERRAIN-FORMS lane
 * reads it: the owning (high) tile, the edge, the run a→b (west→east
 * for N/S faces, north→south for E/W faces), the four corner heights
 * in world units and the outward normal. `levels` is the drop in
 * whole elevation levels (the tallest corner over the lowest — a
 * ramp's sloped skirt rounds up).
 */
export interface StepFace {
  tx: number;
  ty: number;
  side: StepSide;
  ax: number;
  az: number;
  bx: number;
  bz: number;
  yTopA: number;
  yTopB: number;
  yBotA: number;
  yBotB: number;
  nx: number;
  nz: number;
  levels: number;
}

/**
 * THE SAME FACES, LISTED: every vertical face `buildHeightfield` emits
 * for the chunk, with its metadata, under the identical law (THE HIGH
 * TILE OWNS THE FACE; average-of-corners strictly higher; ramps slope).
 * Pure; a test holds its count equal to `buildHeightfield`'s
 * `faceCount`. The W2 terrain-forms lane re-textures these faces from
 * a cliff atlas; nothing here changes the geometry the ground wears.
 */
export function collectStepFaces(
  inp: Pick<HeightfieldInput, 'cx' | 'cy' | 'size' | 'levelAt' | 'isRamp' | 'levelH'>,
  out: StepFace[] = [],
): StepFace[] {
  const { cx, cy, size, levelAt, isRamp, levelH } = inp;
  const x0 = cx * size;
  const y0 = cy * size;
  const c = new Float64Array(4);
  const nb = new Float64Array(4);
  const push = (
    tx: number,
    ty: number,
    side: StepSide,
    ax: number,
    az: number,
    bx: number,
    bz: number,
    tA: number,
    tB: number,
    bA: number,
    bB: number,
    nx: number,
    nz: number,
  ): void => {
    const yTopA = tA * levelH;
    const yTopB = tB * levelH;
    const yBotA = bA * levelH;
    const yBotB = bB * levelH;
    const levels = Math.max(1, Math.ceil(Math.max(tA, tB) - Math.min(bA, bB) - EPS));
    out.push({ tx, ty, side, ax, az, bx, bz, yTopA, yTopB, yBotA, yBotB, nx, nz, levels });
  };
  for (let ly = 0; ly < size; ly++) {
    for (let lx = 0; lx < size; lx++) {
      const tx = x0 + lx;
      const ty = y0 + ly;
      cornerLevels(tx, ty, levelAt, isRamp, c);
      // East edge: own ne/se vs neighbour nw/sw (a = north end).
      cornerLevels(tx + 1, ty, levelAt, isRamp, nb);
      if (c[1]! + c[2]! > nb[0]! + nb[3]! + EPS) {
        push(tx, ty, 'E', tx + 1, ty, tx + 1, ty + 1, c[1]!, c[2]!, nb[0]!, nb[3]!, 1, 0);
      }
      // West edge: own nw/sw vs neighbour ne/se (a = north end).
      cornerLevels(tx - 1, ty, levelAt, isRamp, nb);
      if (c[0]! + c[3]! > nb[1]! + nb[2]! + EPS) {
        push(tx, ty, 'W', tx, ty, tx, ty + 1, c[0]!, c[3]!, nb[1]!, nb[2]!, -1, 0);
      }
      // South edge: own sw/se vs neighbour nw/ne (a = west end).
      cornerLevels(tx, ty + 1, levelAt, isRamp, nb);
      if (c[3]! + c[2]! > nb[0]! + nb[1]! + EPS) {
        push(tx, ty, 'S', tx, ty + 1, tx + 1, ty + 1, c[3]!, c[2]!, nb[0]!, nb[1]!, 0, 1);
      }
      // North edge: own nw/ne vs neighbour sw/se (a = west end).
      cornerLevels(tx, ty - 1, levelAt, isRamp, nb);
      if (c[0]! + c[1]! > nb[3]! + nb[2]! + EPS) {
        push(tx, ty, 'N', tx, ty, tx + 1, ty, c[0]!, c[1]!, nb[3]!, nb[2]!, 0, -1);
      }
    }
  }
  return out;
}
