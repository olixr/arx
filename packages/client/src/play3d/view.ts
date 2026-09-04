/**
 * THE VIEW BEHIND THE CHROME (play3d S2) — the ViewAdapter the DOM UI
 * reads, implemented over the Three camera.
 *
 *  - `screenAnchor` projects a world ground point (terrain height
 *    applied — the 3D equivalent of the 2D lift) through the
 *    PerspectiveCamera to CSS pixels; a point behind the camera is
 *    pushed far off-screen so the pointers (waypoint/party pills)
 *    still get a bearing.
 *  - `camera.scale` is the px-per-tile at the orbit target's depth, so
 *    a bubble's "tiles above the head" lands roughly right; zoom maps
 *    onto the dolly (zoom 1 = the default 16-tile orbit).
 *  - `pickWorld` shoots the camera ray through a pixel and marches it
 *    onto the heightfield (pick.ts).
 *  - The Display bench's stage/lean/water flags are inert here (the 3D
 *    client has no canvas2d lanes to switch); they exist so the same
 *    bench mounts unchanged.
 */
import * as THREE from 'three';
import type { Vec2 } from '@arx/shared';
import type { ViewAdapter, ViewCamera } from '../ui/viewAdapter.js';
import type { StageResTier } from '../render/stage/renderScale.js';
import type { Engine } from './engine.js';
import { pickGround, type PickHit, type PickRay } from './pick.js';

const DEFAULT_DIST = 16;
const PICK_RANGE = 220;

export class Play3DView implements ViewAdapter {
  readonly camera: ViewCamera;
  stageGround = false;
  stageWorld = false;
  leanTarget = 0;
  stageResTier: StageResTier = 'auto';
  reflectionsOn = true;
  waterFxFull = true;
  private readonly v = new THREE.Vector3();
  private readonly ray: PickRay = { ox: 0, oy: 0, oz: 0, dx: 0, dy: 0, dz: 0 };
  private readonly hit: PickHit = { x: 0, y: 0, z: 0, t: -1 };
  private readonly out: Vec2 = { x: 0, y: 0 };

  constructor(
    private readonly engine: Engine,
    private readonly heightAt: (wx: number, wy: number) => number,
  ) {
    const eng = engine;
    this.camera = {
      get scale(): number {
        const fov = (eng.camera.fov * Math.PI) / 180;
        return eng.cssH / 2 / (eng.pose.dist * Math.tan(fov / 2));
      },
      get zoom(): number {
        return DEFAULT_DIST / eng.pose.dist;
      },
      set zoom(z: number) {
        eng.setOrbit(eng.want.yaw, eng.want.pitch, DEFAULT_DIST / Math.max(0.05, z));
      },
      get targetZoom(): number {
        return DEFAULT_DIST / eng.want.dist;
      },
      set targetZoom(z: number) {
        eng.want.dist = DEFAULT_DIST / Math.max(0.05, z);
      },
      setZoom(z: number): void {
        eng.want.dist = DEFAULT_DIST / Math.max(0.05, z);
      },
      stepZoom(factor: number): void {
        eng.want.dist = eng.want.dist / Math.max(0.05, factor);
      },
    };
  }

  onBackendSwitch(): void {
    /* no canvas2d lanes to drop */
  }

  screenAnchor(wx: number, wy: number, w: number, h: number): { x: number; y: number } {
    const cam = this.engine.camera;
    const v = this.v.set(wx, this.heightAt(wx, wy), wy);
    v.applyMatrix4(cam.matrixWorldInverse);
    const behind = v.z > -1e-3;
    v.applyMatrix4(cam.projectionMatrix);
    if (behind) {
      // Behind the lens: flip so the bearing still points away from centre.
      return { x: w / 2 - v.x * w * 4, y: h / 2 + v.y * h * 4 };
    }
    return { x: (v.x * 0.5 + 0.5) * w, y: (1 - (v.y * 0.5 + 0.5)) * h };
  }

  /** The camera ray through a CSS pixel, written into `ray`. */
  rayThrough(sx: number, sy: number): PickRay {
    const cam = this.engine.camera;
    const nx = (sx / this.engine.cssW) * 2 - 1;
    const ny = 1 - (sy / this.engine.cssH) * 2;
    const v = this.v.set(nx, ny, 0.5).unproject(cam).sub(cam.position).normalize();
    const r = this.ray;
    r.ox = cam.position.x;
    r.oy = cam.position.y;
    r.oz = cam.position.z;
    r.dx = v.x;
    r.dy = v.y;
    r.dz = v.z;
    return r;
  }

  pickWorld(sx: number, sy: number): Vec2 {
    const ray = this.rayThrough(sx, sy);
    if (pickGround(ray, this.heightAt, PICK_RANGE, this.hit)) {
      this.out.x = this.hit.x;
      this.out.y = this.hit.z;
    } else {
      // Sky: the far point of the ray on the meadow plane's heading.
      this.out.x = ray.ox + ray.dx * PICK_RANGE;
      this.out.y = ray.oz + ray.dz * PICK_RANGE;
    }
    return this.out;
  }
}
