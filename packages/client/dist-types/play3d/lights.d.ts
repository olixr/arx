/**
 * THE LIGHT LIVES IN THE WORLD, FOR REAL (play3d S1 seed of Workstream 3).
 *
 * One sun (DirectionalLight, PCF-soft shadow map, a TIGHT orthographic
 * frustum that follows the camera target and SNAPS to shadow texels so
 * the shadow edge does not swim as the player walks), one hemisphere
 * fill (sky over ground — the painted art carries its own shading, so
 * the fill is generous and the sun moderate: 3D light GROUNDS the
 * scene, it does not re-shade art that is already shaded), a soft
 * opposing fill so cliff faces never read ambient-flat, depth fog in
 * the sky colour, and a POOL of point lights that is re-dealt to the
 * nearest lamp posts / campfires. The pool is fixed-size on purpose:
 * a forward renderer recompiles every lit shader when the light count
 * changes, so the count never changes — lights move, they are not
 * created.
 *
 * Day/night is ONE number: sun elevation + tint + fog + billboard tint
 * follow `setDay(k)`. Cascaded shadows (CSM) are S3.
 */
import * as THREE from 'three';
import type { BillboardClock } from './billboardMaterial.js';
import type { LampSpot } from './ground.js';
export declare class SkyRig {
    private readonly scene;
    private readonly clock;
    readonly sun: THREE.DirectionalLight;
    readonly hemi: THREE.HemisphereLight;
    readonly fill: THREE.DirectionalLight;
    readonly fog: THREE.Fog;
    private readonly pool;
    private lamps;
    private readonly sky;
    private readonly tmp;
    private lampDealAt;
    /** 0 = midnight, 1 = noon. */
    day: number;
    constructor(scene: THREE.Scene, clock: BillboardClock);
    setDay(k: number): void;
    setLamps(lamps: LampSpot[]): void;
    /** Follow the camera target: sun frustum + lamp pool. Call per frame. */
    follow(tx: number, ty: number, tz: number, nowMs: number): void;
    private dealLamps;
    dispose(): void;
}
//# sourceMappingURL=lights.d.ts.map