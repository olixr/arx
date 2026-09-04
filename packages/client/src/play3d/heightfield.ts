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
 *    stretched rect). Honest placeholder — S2 gives cliffs their own
 *    face painter (cliffArt tones) in an atlas.
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
