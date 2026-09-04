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

const DAY_SKY = new THREE.Color(0x9fb9d8);
const NIGHT_SKY = new THREE.Color(0x141a30);
const DAY_SUN = new THREE.Color(0xfff1d6);
const NIGHT_SUN = new THREE.Color(0x7d8fc4);
const DAY_TINT = new THREE.Color(1, 1, 1);
const NIGHT_TINT = new THREE.Color(0.5, 0.56, 0.82);

/** Shadow ortho half-span in tiles: base + orbit distance, in coarse steps. */
const SHADOW_SPAN_MIN = 24;
const SHADOW_SPAN_MAX = 56;
const SHADOW_SPAN_STEP = 8;
const SHADOW_MAP = 2048;
const LAMP_POOL = 8;
/** Sun direction (toward the sun), fixed for S1: west-north-west, high. */
const SUN_DIR = new THREE.Vector3(-0.55, 0.9, 0.38).normalize();
const SUN_REACH = 80;

/** The shadow span for an orbit distance, quantised. */
export function shadowSpanFor(dist: number): number {
  const raw = 12 + dist * 1.25;
  const q = Math.ceil(raw / SHADOW_SPAN_STEP) * SHADOW_SPAN_STEP;
  return Math.max(SHADOW_SPAN_MIN, Math.min(SHADOW_SPAN_MAX, q));
}

/**
 * Snap a world point to the shadow texel grid in LIGHT space. `right`
 * and `up` are the light's screen axes (unit, orthogonal to `dir`);
 * `texel` is the world size of one shadow texel. Writes into `out`.
 */
export function snapToLightTexel(
  x: number,
  y: number,
  z: number,
  right: { x: number; y: number; z: number },
  up: { x: number; y: number; z: number },
  texel: number,
  out: { x: number; y: number; z: number },
): void {
  const pr = x * right.x + y * right.y + z * right.z;
  const pu = x * up.x + y * up.y + z * up.z;
  const dr = Math.round(pr / texel) * texel - pr;
  const du = Math.round(pu / texel) * texel - pu;
  out.x = x + dr * right.x + du * up.x;
  out.y = y + dr * right.y + du * up.y;
  out.z = z + dr * right.z + du * up.z;
}

export class SkyRig {
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  readonly fill: THREE.DirectionalLight;
  readonly fog: THREE.Fog;
  private readonly pool: THREE.PointLight[] = [];
  /** Which pool slots stand at a lamp this deal (the rest are parked). */
  private readonly dealt: boolean[] = [];
  private lamps: LampSpot[] = [];
  private readonly scored: Array<{ l: LampSpot; d: number }> = [];
  private readonly sky = new THREE.Color();
  private readonly snapped = { x: 0, y: 0, z: 0 };
  /** The light's screen axes — constant while SUN_DIR is fixed. */
  private readonly lightRight = new THREE.Vector3();
  private readonly lightUp = new THREE.Vector3();
  private span = 0;
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
    cam.far = SUN_REACH * 2;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.05;
    this.sun.shadow.radius = 2;
    scene.add(this.sun);
    scene.add(this.sun.target);
    this.setSpan(SHADOW_SPAN_MIN);
    // The light's basis, as three's lookAt builds it for a light
    // standing at target + SUN_DIR looking at the target with world up.
    this.lightRight.set(0, 1, 0).cross(SUN_DIR).normalize();
    this.lightUp.copy(SUN_DIR).cross(this.lightRight).normalize();

    this.hemi = new THREE.HemisphereLight(0xdde8f8, 0x6f7a55, 2.4);
    scene.add(this.hemi);

    this.fill = new THREE.DirectionalLight(0xc8d4ee, 0.5);
    this.fill.position.set(30, 40, 60);
    scene.add(this.fill);

    this.fog = new THREE.Fog(DAY_SKY.clone(), 70, 170);
    scene.fog = this.fog;
    scene.background = this.sky.copy(DAY_SKY);

    for (let i = 0; i < LAMP_POOL; i++) {
      // Visible from birth, parked dark: the light COUNT never moves.
      const l = new THREE.PointLight(0xffb35c, 0, 9, 1.8);
      l.position.set(0, -1000, 0);
      scene.add(l);
      this.pool.push(l);
      this.dealt.push(false);
    }
    // THE SHADOW PROXY yaw: the billboard yaw whose quad normal faces the sun.
    clock.uSunYaw.value = Math.atan2(SUN_DIR.x, SUN_DIR.z);
    this.setDay(1);
  }

  private setSpan(span: number): void {
    if (span === this.span) return;
    this.span = span;
    const cam = this.sun.shadow.camera;
    cam.left = -span;
    cam.right = span;
    cam.top = span;
    cam.bottom = -span;
    cam.updateProjectionMatrix();
  }

  private lampK(): number {
    return Math.max(0, Math.min(1, (0.55 - this.day) / 0.35));
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
    const lampK = this.lampK();
    for (let i = 0; i < this.pool.length; i++) this.pool[i]!.intensity = this.dealt[i] ? 14 * lampK : 0;
  }

  setLamps(lamps: LampSpot[]): void {
    this.lamps = lamps;
    this.lampDealAt = -1;
  }

  /**
   * Follow the camera target: sun frustum (span from the orbit
   * distance, snapped in light space) + lamp pool. Call per frame.
   */
  follow(tx: number, ty: number, tz: number, orbitDist: number, nowMs: number): void {
    this.setSpan(shadowSpanFor(orbitDist));
    const texel = (this.span * 2) / SHADOW_MAP;
    snapToLightTexel(tx, ty, tz, this.lightRight, this.lightUp, texel, this.snapped);
    const s = this.snapped;
    this.sun.target.position.set(s.x, s.y, s.z);
    this.sun.position.set(s.x + SUN_DIR.x * SUN_REACH, s.y + SUN_DIR.y * SUN_REACH, s.z + SUN_DIR.z * SUN_REACH);
    if (nowMs - this.lampDealAt > 500) {
      this.lampDealAt = nowMs;
      this.dealLamps(tx, tz);
    }
  }

  private dealLamps(tx: number, tz: number): void {
    // Nearest LAMP_POOL lamps take a light each; the rest wait their turn.
    const scored = this.scored;
    const lamps = this.lamps;
    scored.length = lamps.length;
    for (let i = 0; i < lamps.length; i++) {
      const l = lamps[i]!;
      const d = (l.x - tx) * (l.x - tx) + (l.z - tz) * (l.z - tz);
      const slot = scored[i];
      if (slot) {
        slot.l = l;
        slot.d = d;
      } else scored[i] = { l, d };
    }
    scored.sort((a, b) => a.d - b.d);
    const lampK = this.lampK();
    for (let i = 0; i < this.pool.length; i++) {
      const light = this.pool[i]!;
      const pick = scored[i];
      if (!pick) {
        // Parked: still visible (the count law), dark, out of the way.
        this.dealt[i] = false;
        light.intensity = 0;
        light.position.set(0, -1000, 0);
        continue;
      }
      this.dealt[i] = true;
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
