/**
 * THE STRUCTURE SINK (play3d W2 scaffold) — where every lane's quads
 * land, bucketed by MATERIAL so a chunk ends up as one merged geometry
 * per (kind, atlas page) and the draw count stays under six.
 *
 * PURE: numbers in, typed arrays out (heightfield.ts's MeshSink law,
 * generalised). structures.ts wraps each bucket in a BufferGeometry.
 *
 * Laws:
 *  - WORLD COORDINATES, like the heightfield and the statics: x = world
 *    tile x, y = height in tiles, z = world tile y (south). A lane never
 *    subtracts a chunk origin.
 *  - WINDING IS CORRECTED against the normal the caller declares, so a
 *    quad is front-facing whichever way its corners were handed in.
 *  - UV CONVENTION for a face: u = West→East along the run, v = 0 at
 *    the ground base → 1 at the crown (structureFace.ts faceUV). The
 *    sink takes per-corner uv pairs and does not care, but every lane
 *    passes a FaceRef's (u0,v0)-(u1,v1) in that orientation.
 *  - Two material kinds: 'opaque' (prisms: walls, garrison, hedge mass,
 *    deck fascia, cliff) and 'cutout' (alpha-tested cards: fence
 *    posts/rails, iron bars, hedge lobes) — never a third sort bucket.
 */

export type StructMaterialKind = 'opaque' | 'cutout';

/** Bucket key: kind × atlas page. */
export function bucketKey(kind: StructMaterialKind, page: number): number {
  return page * 2 + (kind === 'cutout' ? 1 : 0);
}
export function bucketKind(key: number): StructMaterialKind {
  return key & 1 ? 'cutout' : 'opaque';
}
export function bucketPage(key: number): number {
  return key >> 1;
}

export interface SinkBucket {
  key: number;
  kind: StructMaterialKind;
  page: number;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  vertexCount: number;
  triangles: number;
  /** THE BUCKET KNOWS ITS OWN EXTENT: the AABB of every vertex landed (world units), for a bounding sphere that never culls a flared awning or a gatehouse reaching past the chunk. */
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

class Bucket {
  positions: number[] = [];
  normals: number[] = [];
  uvs: number[] = [];
  indices: number[] = [];
  minX = Infinity;
  maxX = -Infinity;
  minY = Infinity;
  maxY = -Infinity;
  minZ = Infinity;
  maxZ = -Infinity;

  /** Fold a vertex into the extent. */
  extend(x: number, y: number, z: number): void {
    if (x < this.minX) this.minX = x;
    if (x > this.maxX) this.maxX = x;
    if (y < this.minY) this.minY = y;
    if (y > this.maxY) this.maxY = y;
    if (z < this.minZ) this.minZ = z;
    if (z > this.maxZ) this.maxZ = z;
  }
}

export class StructSink {
  private readonly buckets = new Map<number, Bucket>();
  /** Quads landed (the lane confession). */
  quads = 0;
  /** Scratch for callers that build corners in place. */
  readonly p = new Float64Array(12);
  readonly uv = new Float64Array(8);

  private bucket(kind: StructMaterialKind, page: number): Bucket {
    const key = bucketKey(kind, page);
    let b = this.buckets.get(key);
    if (!b) this.buckets.set(key, (b = new Bucket()));
    return b;
  }

  /**
   * Push a quad: `p` = 4 corners as flat xyz (12 numbers), `uv` = 4
   * uv pairs (8 numbers), oriented so its geometric normal agrees with
   * (nx,ny,nz). Corners may be in either winding.
   */
  quad(kind: StructMaterialKind, page: number, p: ArrayLike<number>, uv: ArrayLike<number>, nx: number, ny: number, nz: number): void {
    const b = this.bucket(kind, page);
    const base = b.positions.length / 3;
    for (let i = 0; i < 4; i++) {
      const x = p[i * 3]!;
      const y = p[i * 3 + 1]!;
      const z = p[i * 3 + 2]!;
      b.positions.push(x, y, z);
      b.normals.push(nx, ny, nz);
      b.uvs.push(uv[i * 2]!, uv[i * 2 + 1]!);
      b.extend(x, y, z);
    }
    if (orientation(p, 0, 1, 2, nx, ny, nz) >= 0) b.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    else b.indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
    this.quads++;
  }

  /** Push a triangle (9 numbers, 6 uv numbers), winding corrected. */
  tri(kind: StructMaterialKind, page: number, p: ArrayLike<number>, uv: ArrayLike<number>, nx: number, ny: number, nz: number): void {
    const b = this.bucket(kind, page);
    const base = b.positions.length / 3;
    for (let i = 0; i < 3; i++) {
      const x = p[i * 3]!;
      const y = p[i * 3 + 1]!;
      const z = p[i * 3 + 2]!;
      b.positions.push(x, y, z);
      b.normals.push(nx, ny, nz);
      b.uvs.push(uv[i * 2]!, uv[i * 2 + 1]!);
      b.extend(x, y, z);
    }
    if (orientation(p, 0, 1, 2, nx, ny, nz) >= 0) b.indices.push(base, base + 1, base + 2);
    else b.indices.push(base, base + 2, base + 1);
  }

  /**
   * An axis-aligned vertical face between world ground points (ax,az)
   * and (bx,bz), rising from `y0` to `y1`, with the atlas rect
   * (u0,v0)-(u1,v1) mapped u along a→b and v base→crown. The normal is
   * the caller's (must be perpendicular to the a→b edge).
   */
  face(
    kind: StructMaterialKind,
    page: number,
    ax: number,
    az: number,
    bx: number,
    bz: number,
    y0: number,
    y1: number,
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    nx: number,
    nz: number,
  ): void {
    const p = this.p;
    const uv = this.uv;
    // a-base, b-base, b-crown, a-crown.
    p[0] = ax;
    p[1] = y0;
    p[2] = az;
    p[3] = bx;
    p[4] = y0;
    p[5] = bz;
    p[6] = bx;
    p[7] = y1;
    p[8] = bz;
    p[9] = ax;
    p[10] = y1;
    p[11] = az;
    uv[0] = u0;
    uv[1] = v0;
    uv[2] = u1;
    uv[3] = v0;
    uv[4] = u1;
    uv[5] = v1;
    uv[6] = u0;
    uv[7] = v1;
    this.quad(kind, page, p, uv, nx, 0, nz);
  }

  /** A horizontal quad (crown / deck top) over tile rect [x0,x1]×[z0,z1] at height y, normal +Y. */
  top(kind: StructMaterialKind, page: number, x0: number, z0: number, x1: number, z1: number, y: number, u0: number, v0: number, u1: number, v1: number): void {
    const p = this.p;
    const uv = this.uv;
    p[0] = x0;
    p[1] = y;
    p[2] = z0;
    p[3] = x1;
    p[4] = y;
    p[5] = z0;
    p[6] = x1;
    p[7] = y;
    p[8] = z1;
    p[9] = x0;
    p[10] = y;
    p[11] = z1;
    uv[0] = u0;
    uv[1] = v1;
    uv[2] = u1;
    uv[3] = v1;
    uv[4] = u1;
    uv[5] = v0;
    uv[6] = u0;
    uv[7] = v0;
    this.quad(kind, page, p, uv, 0, 1, 0);
  }

  get isEmpty(): boolean {
    return this.quads === 0 && this.buckets.size === 0;
  }

  /** Freeze the buckets into typed arrays (one per material). */
  drain(): SinkBucket[] {
    const out: SinkBucket[] = [];
    for (const [key, b] of this.buckets) {
      if (b.indices.length === 0) continue;
      out.push({
        key,
        kind: bucketKind(key),
        page: bucketPage(key),
        positions: Float32Array.from(b.positions),
        normals: Float32Array.from(b.normals),
        uvs: Float32Array.from(b.uvs),
        indices: Uint32Array.from(b.indices),
        vertexCount: b.positions.length / 3,
        triangles: b.indices.length / 3,
        minX: b.minX,
        maxX: b.maxX,
        minY: b.minY,
        maxY: b.maxY,
        minZ: b.minZ,
        maxZ: b.maxZ,
      });
    }
    this.buckets.clear();
    this.quads = 0;
    return out;
  }
}

/** Sign of ((p1-p0) × (p2-p0)) · n. */
function orientation(p: ArrayLike<number>, i0: number, i1: number, i2: number, nx: number, ny: number, nz: number): number {
  const ax = p[i1 * 3]! - p[i0 * 3]!;
  const ay = p[i1 * 3 + 1]! - p[i0 * 3 + 1]!;
  const az = p[i1 * 3 + 2]! - p[i0 * 3 + 2]!;
  const bx = p[i2 * 3]! - p[i0 * 3]!;
  const by = p[i2 * 3 + 1]! - p[i0 * 3 + 1]!;
  const bz = p[i2 * 3 + 2]! - p[i0 * 3 + 2]!;
  const cx = ay * bz - az * by;
  const cy = az * bx - ax * bz;
  const cz = ax * by - ay * bx;
  return cx * nx + cy * ny + cz * nz;
}

/** GPU bytes a bucket's buffers occupy. */
export function bucketBytes(b: SinkBucket): number {
  return b.positions.byteLength + b.normals.byteLength + b.uvs.byteLength + b.indices.byteLength;
}
