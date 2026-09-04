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
    uYaw: {
        value: number;
    };
    uSunYaw: {
        value: number;
    };
    uTint: {
        value: THREE.Color;
    };
    uTime: {
        value: number;
    };
    /** Sway amplitude in tiles at the crown (0 for bodies). */
    uSway: {
        value: number;
    };
}
export declare function makeBillboardClock(): BillboardClock;
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
/**
 * A fixed-capacity instance buffer + the InstancedBufferGeometry over
 * it. Filled once per chunk (statics) or once per entity; `commit()`
 * uploads the used prefix. Capacity is final: a chunk's standing count
 * is known at build time, and an entity is one instance.
 */
export declare class BillboardBuffer {
    readonly capacity: number;
    readonly geometry: THREE.InstancedBufferGeometry;
    private readonly origin;
    private readonly size;
    private readonly uv;
    private readonly anchor;
    private readonly phase;
    private readonly aOrigin;
    private readonly aSize;
    private readonly aUv;
    private readonly aAnchor;
    private readonly aPhase;
    count: number;
    constructor(capacity: number);
    /** Write instance i (must be < capacity). */
    set(i: number, ox: number, oy: number, oz: number, w: number, h: number, u0: number, v0: number, u1: number, v1: number, ax: number, ay: number, phase: number): void;
    /** Move instance i's feet (entities): origin only, cheapest upload. */
    setOrigin(i: number, ox: number, oy: number, oz: number): void;
    /** Flag every attribute for upload and set the draw count. */
    commit(): void;
    /** Bounding sphere over the committed instances (for frustum culling). */
    computeBounds(): void;
    dispose(): void;
}
//# sourceMappingURL=billboard.d.ts.map