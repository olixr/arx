/**
 * THE LIGHT LIVES IN THE WORLD, FOR REAL (play3d S1 seed of Workstream 3;
 * S3 review fixes).
 *
 * One sun (DirectionalLight, PCF shadow map, a TIGHT orthographic
 * frustum that follows the camera target), one hemisphere fill (sky
 * over ground — the painted art carries its own shading, so the fill
 * is generous and the sun moderate: 3D light GROUNDS the scene, it
 * does not re-shade art that is already shaded), a soft opposing fill
 * so cliff faces never read ambient-flat, depth fog in the sky colour,
 * and a POOL of point lights re-dealt to the nearest lamp posts /
 * campfires.
 *
 * Laws:
 *  - THE POOL NEVER CHANGES SIZE. A forward renderer counts the lights
 *    it can SEE (three skips `visible = false` before it pushes a light)
 *    and recompiles every lit shader when that count moves. So every
 *    pool light stays visible from construction to dispose; a light
 *    with no lamp to stand at is parked at intensity 0. The count is a
 *    compile-time constant of the scene.
 *  - THE SHADOW SNAPS IN LIGHT SPACE. The sun is tilted, so a step on
 *    the world XZ grid is not a step on the shadow map's texel grid.
 *    The follow point is projected onto the light's own right/up
 *    axes (constant: the sun direction is fixed), rounded to a texel
 *    there, and projected back — the shadow edge holds still as the
 *    player walks. The ortho span follows the orbit distance (in
 *    coarse steps, so the texel size does not breathe every frame) —
 *    a far, low orbit does not see the box's edge. CSM is still W3.
 *
 * Day/night is ONE number: sun elevation + tint + fog + billboard tint
 * follow `setDay(k)`.
 */
import * as THREE from 'three';
import type { BillboardClock } from './billboard.js';
import type { LampSpot } from './ground.js';
/** The shadow span for an orbit distance, quantised. */
export declare function shadowSpanFor(dist: number): number;
/**
 * Snap a world point to the shadow texel grid in LIGHT space. `right`
 * and `up` are the light's screen axes (unit, orthogonal to `dir`);
 * `texel` is the world size of one shadow texel. Writes into `out`.
 */
export declare function snapToLightTexel(x: number, y: number, z: number, right: {
    x: number;
    y: number;
    z: number;
}, up: {
    x: number;
    y: number;
    z: number;
}, texel: number, out: {
    x: number;
    y: number;
    z: number;
}): void;
export declare class SkyRig {
    private readonly scene;
    private readonly clock;
    readonly sun: THREE.DirectionalLight;
    readonly hemi: THREE.HemisphereLight;
    readonly fill: THREE.DirectionalLight;
    readonly fog: THREE.Fog;
    private readonly pool;
    /** Which pool slots stand at a lamp this deal (the rest are parked). */
    private readonly dealt;
    private lamps;
    private readonly scored;
    private readonly sky;
    private readonly snapped;
    /** The light's screen axes — constant while SUN_DIR is fixed. */
    private readonly lightRight;
    private readonly lightUp;
    private span;
    private lampDealAt;
    /** 0 = midnight, 1 = noon. */
    day: number;
    constructor(scene: THREE.Scene, clock: BillboardClock);
    private setSpan;
    private lampK;
    setDay(k: number): void;
    setLamps(lamps: LampSpot[]): void;
    /**
     * Follow the camera target: sun frustum (span from the orbit
     * distance, snapped in light space) + lamp pool. Call per frame.
     */
    follow(tx: number, ty: number, tz: number, orbitDist: number, nowMs: number): void;
    private dealLamps;
    dispose(): void;
}
//# sourceMappingURL=lights.d.ts.map