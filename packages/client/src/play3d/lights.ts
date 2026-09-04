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

const DAY_SKY = new THREE.Color(0x9fb9d8);
const NIGHT_SKY = new THREE.Color(0x141a30);
const DAY_SUN = new THREE.Color(0xfff1d6);
const NIGHT_SUN = new THREE.Color(0x7d8fc4);
const DAY_TINT = new THREE.Color(1, 1, 1);
const NIGHT_TINT = new THREE.Color(0.5, 0.56, 0.82);

/** Shadow ortho half-span in tiles — tight around the view. */
const SHADOW_SPAN = 30;
const SHADOW_MAP = 2048;
const LAMP_POOL = 8;
/** Sun direction (toward the sun), fixed for S1: west-north-west, high. */
const SUN_DIR = new THREE.Vector3(-0.55, 0.9, 0.38).normalize();

export class SkyRig {
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  readonly fill: THREE.DirectionalLight;
  readonly fog: THREE.Fog;
  private readonly pool: THREE.PointLight[] = [];
  private lamps: LampSpot[] = [];
  private readonly sky = new THREE.Color();
  private readonly tmp = new THREE.Vector3();
  private lampDealAt = -1;
  /** 0 = midnight, 1 = noon. */
  day = 1;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly clock: BillboardClock,
  ) {
    this.sun = new THREE.DirectionalLight(DAY_SUN, 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
    const cam = this.sun.shadow.camera;
    cam.near = 1;
    cam.far = 160;
    cam.left = -SHADOW_SPAN;
    cam.right = SHADOW_SPAN;
    cam.top = SHADOW_SPAN;
    cam.bottom = -SHADOW_SPAN;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.05;
    this.sun.shadow.radius = 2;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xdde8f8, 0x6f7a55, 2.4);
    scene.add(this.hemi);

    this.fill = new THREE.DirectionalLight(0xc8d4ee, 0.5);
    this.fill.position.set(30, 40, 60);
    scene.add(this.fill);

    this.fog = new THREE.Fog(DAY_SKY.clone(), 70, 170);
    scene.fog = this.fog;
    scene.background = this.sky.copy(DAY_SKY);

    for (let i = 0; i < LAMP_POOL; i++) {
      const l = new THREE.PointLight(0xffb35c, 0, 9, 1.8);
      l.visible = false;
      scene.add(l);
      this.pool.push(l);
    }
    // THE SHADOW PROXY yaw: the billboard yaw whose quad normal faces the sun.
    clock.uSunYaw.value = Math.atan2(SUN_DIR.x, SUN_DIR.z);
    this.setDay(1);
  }

  setDay(k: number): void {
    this.day = k;
    const night = 1 - k;
    this.sky.copy(DAY_SKY).lerp(NIGHT_SKY, night);
    this.fog.color.copy(this.sky);
    this.scene.background = this.sky;
    this.sun.color.copy(DAY_SUN).lerp(NIGHT_SUN, night);
    this.sun.intensity = 0.25 + 1.95 * k;
    this.hemi.intensity = 0.35 + 2.05 * k;
    this.fill.intensity = 0.08 + 0.42 * k;
    this.clock.uTint.value.copy(DAY_TINT).lerp(NIGHT_TINT, night);
    const lampK = Math.max(0, Math.min(1, (0.55 - k) / 0.35));
    for (const l of this.pool) l.intensity = l.visible ? 14 * lampK : 0;
  }

  setLamps(lamps: LampSpot[]): void {
    this.lamps = lamps;
    this.lampDealAt = -1;
  }

  /** Follow the camera target: sun frustum + lamp pool. Call per frame. */
  follow(tx: number, ty: number, tz: number, nowMs: number): void {
    // Snap the target to the shadow texel grid so edges do not shimmer.
    const texel = (SHADOW_SPAN * 2) / SHADOW_MAP;
    const sx = Math.round(tx / texel) * texel;
    const sz = Math.round(tz / texel) * texel;
    this.sun.target.position.set(sx, ty, sz);
    this.tmp.copy(SUN_DIR).multiplyScalar(80);
    this.sun.position.set(sx + this.tmp.x, ty + this.tmp.y, sz + this.tmp.z);
    if (nowMs - this.lampDealAt > 500) {
      this.lampDealAt = nowMs;
      this.dealLamps(tx, tz);
    }
  }

  private dealLamps(tx: number, tz: number): void {
    // Nearest LAMP_POOL lamps take a light each; the rest wait their turn.
    const lamps = this.lamps;
    const scored = lamps
      .map((l) => ({ l, d: (l.x - tx) * (l.x - tx) + (l.z - tz) * (l.z - tz) }))
      .sort((a, b) => a.d - b.d);
    const lampK = Math.max(0, Math.min(1, (0.55 - this.day) / 0.35));
    for (let i = 0; i < this.pool.length; i++) {
      const light = this.pool[i]!;
      const pick = scored[i];
      if (!pick) {
        light.visible = false;
        light.intensity = 0;
        continue;
      }
      light.visible = true;
      light.position.set(pick.l.x, pick.l.y, pick.l.z);
      light.color.set(pick.l.kind === 'fire' ? 0xff9a3c : 0xffc46a);
      light.distance = pick.l.kind === 'fire' ? 8 : 10;
      light.intensity = 14 * lampK;
    }
  }

  dispose(): void {
    this.sun.dispose();
    this.hemi.dispose();
    this.fill.dispose();
    for (const l of this.pool) l.dispose();
  }
}
