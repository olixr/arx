/**
 * THE BILLBOARD LAW (play3d S1, split from the shaders in S3) — the
 * backend-NEUTRAL half of every painted sprite in the 3D client:
 * bodies, trees, flora, later props and FX.
 *
 * A billboard here is a feet-anchored quad that turns about the world
 * up-axis to face the camera (YAW-ONLY: bodies stay upright, they
 * never tip toward a high camera). The turn happens IN THE VERTEX
 * STAGE from one shared `uYaw` uniform, so a thousand instanced trees
 * cost one uniform write per frame, not a thousand matrix updates.
 *
 * Depth is real: the material is opaque, depth-tested AND depth-written,
 * with an alpha CUT in the fragment (discard) — so occlusion is
 * per-pixel against terrain, walls and each other, and there is no
 * painter's sort anywhere in this client.
 *
 * THE SHADOW PROXY: a camera-facing quad is edge-on to the sun and casts
 * a sliver. The depth variant used by the shadow pass reads `uSunYaw`
 * instead of `uYaw`, so in the light's eye every billboard has turned to
 * face the sun and casts its full alpha-cut silhouette. Same buffers,
 * same texture, no second mesh.
 *
 * Billboards are UNLIT: the painters bake their own shading (lambert on
 * a camera-facing plane goes black when the sun is behind it). The
 * scene mood reaches them through `uTint`, set by the sky rig.
 *
 * What lives HERE: the clock (the shared uniforms), the instance buffer
 * (the per-instance record), and the `BillboardFactory` seam the lanes
 * ask for materials through. What lives in backend/webglBillboard.ts:
 * the GLSL that realises the law on WebGL. A WebGPU backend realises
 * the same law in TSL behind the same factory (stageBackend.ts).
 *
 * Per-instance record (InstancedBufferGeometry): origin (feet, world),
 * size (w, h in world tiles), uv rect (u0 v0 at the foot-left corner,
 * u1 v1 at the top-right), anchor (x fraction of the width the feet sit
 * under; y fraction of the height BELOW the feet — root flare), and a
 * wind phase for the sway.
 */
import * as THREE from 'three';

export interface BillboardClock {
  uYaw: { value: number };
  uSunYaw: { value: number };
  uTint: { value: THREE.Color };
  uTime: { value: number };
  /** Sway amplitude in tiles at the crown (0 for bodies). */
  uSway: { value: number };
}

export function makeBillboardClock(): BillboardClock {
  return {
    uYaw: { value: 0 },
    uSunYaw: { value: 0 },
    uTint: { value: new THREE.Color(1, 1, 1) },
    uTime: { value: 0 },
    uSway: { value: 0 },
  };
}

export interface BillboardMaterialOpts {
  alphaTest?: number;
  /** Trees sway; bodies do not. */
  sway?: boolean;
}

/**
 * THE MATERIAL SEAM: the lanes (sprites, bodies) never name a shader
 * language; they ask the backend for the colour pass and the shadow
 * pass of the billboard law.
 */
export interface BillboardFactory {
  /** The colour pass material. Shares the clock's uniform objects. */
  material(map: THREE.Texture, clock: BillboardClock, opts?: BillboardMaterialOpts): THREE.Material;
  /** The shadow-pass depth material: same quad, turned to face the sun. */
  depthMaterial(map: THREE.Texture, clock: BillboardClock, opts?: BillboardMaterialOpts): THREE.Material;
}

/** Floats per instance, by attribute. */
const F_ORIGIN = 3;
const F_SIZE = 2;
const F_UV = 4;
const F_ANCHOR = 2;
const F_PHASE = 1;

/**
 * A fixed-capacity instance buffer + the InstancedBufferGeometry over
 * it. Filled once per chunk (statics) or once per entity; `commit()`
 * uploads the used prefix. Capacity is final: a chunk's standing count
 * is known at build time, and an entity is one instance.
 */
export class BillboardBuffer {
  readonly geometry: THREE.InstancedBufferGeometry;
  private readonly origin: Float32Array;
  private readonly size: Float32Array;
  private readonly uv: Float32Array;
  private readonly anchor: Float32Array;
  private readonly phase: Float32Array;
  private readonly aOrigin: THREE.InstancedBufferAttribute;
  private readonly aSize: THREE.InstancedBufferAttribute;
  private readonly aUv: THREE.InstancedBufferAttribute;
  private readonly aAnchor: THREE.InstancedBufferAttribute;
  private readonly aPhase: THREE.InstancedBufferAttribute;
  count = 0;

  constructor(readonly capacity: number) {
    const g = new THREE.InstancedBufferGeometry();
    // Unit quad: x 0..1, y 0..1 (feet at y=0 before the anchor shift).
    g.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0], 3),
    );
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.origin = new Float32Array(capacity * F_ORIGIN);
    this.size = new Float32Array(capacity * F_SIZE);
    this.uv = new Float32Array(capacity * F_UV);
    this.anchor = new Float32Array(capacity * F_ANCHOR);
    this.phase = new Float32Array(capacity * F_PHASE);
    this.aOrigin = new THREE.InstancedBufferAttribute(this.origin, F_ORIGIN);
    this.aSize = new THREE.InstancedBufferAttribute(this.size, F_SIZE);
    this.aUv = new THREE.InstancedBufferAttribute(this.uv, F_UV);
    this.aAnchor = new THREE.InstancedBufferAttribute(this.anchor, F_ANCHOR);
    this.aPhase = new THREE.InstancedBufferAttribute(this.phase, F_PHASE);
    // Entities rewrite their one record every frame they move.
    this.aOrigin.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iOrigin', this.aOrigin);
    g.setAttribute('iSize', this.aSize);
    g.setAttribute('iUv', this.aUv);
    g.setAttribute('iAnchor', this.aAnchor);
    g.setAttribute('iPhase', this.aPhase);
    g.instanceCount = 0;
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1);
    this.geometry = g;
  }

  /** Write instance i (must be < capacity). */
  set(
    i: number,
    ox: number,
    oy: number,
    oz: number,
    w: number,
    h: number,
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    ax: number,
    ay: number,
    phase: number,
  ): void {
    this.origin[i * 3] = ox;
    this.origin[i * 3 + 1] = oy;
    this.origin[i * 3 + 2] = oz;
    this.size[i * 2] = w;
    this.size[i * 2 + 1] = h;
    this.uv[i * 4] = u0;
    this.uv[i * 4 + 1] = v0;
    this.uv[i * 4 + 2] = u1;
    this.uv[i * 4 + 3] = v1;
    this.anchor[i * 2] = ax;
    this.anchor[i * 2 + 1] = ay;
    this.phase[i] = phase;
    if (i >= this.count) this.count = i + 1;
  }

  /** Move instance i's feet (entities): origin only, cheapest upload. */
  setOrigin(i: number, ox: number, oy: number, oz: number): void {
    this.origin[i * 3] = ox;
    this.origin[i * 3 + 1] = oy;
    this.origin[i * 3 + 2] = oz;
    this.aOrigin.needsUpdate = true;
  }

  /** Flag every attribute for upload and set the draw count. */
  commit(): void {
    this.aOrigin.needsUpdate = true;
    this.aSize.needsUpdate = true;
    this.aUv.needsUpdate = true;
    this.aAnchor.needsUpdate = true;
    this.aPhase.needsUpdate = true;
    this.geometry.instanceCount = this.count;
  }

  /** Bounding sphere over the committed instances (for frustum culling). */
  computeBounds(): void {
    if (this.count === 0) {
      this.geometry.boundingSphere!.set(new THREE.Vector3(), 0);
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < this.count; i++) {
      const x = this.origin[i * 3]!;
      const y = this.origin[i * 3 + 1]!;
      const z = this.origin[i * 3 + 2]!;
      const w = this.size[i * 2]!;
      const h = this.size[i * 2 + 1]!;
      if (x - w < minX) minX = x - w;
      if (x + w > maxX) maxX = x + w;
      if (z - w < minZ) minZ = z - w;
      if (z + w > maxZ) maxZ = z + w;
      if (y - h < minY) minY = y - h;
      if (y + h > maxY) maxY = y + h;
    }
    const s = this.geometry.boundingSphere!;
    s.center.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
    s.radius = Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) / 2;
  }

  dispose(): void {
    this.geometry.dispose();
  }
}
