/**
 * THE VIEW ADAPTER — the one seam between the DOM chrome and whatever
 * draws the world. The HUD pieces that pin themselves to world points
 * (speech bubbles, the waypoint pill, party pointers) used to take the
 * concrete 2D `Renderer`; now they take THIS, the MINIMAL surface they
 * actually read (an anchor, a pick, px-per-tile — nothing else; a
 * member nothing reads does not belong here). The 2D Renderer
 * satisfies it structurally (main.ts still hands the Renderer over,
 * unchanged); the 3D client (src/play3d) hands over its own view.
 *
 * `ViewDisplayFlags` is the Display bench's SEPARATE contract: the
 * canvas2d lanes it switches (stage/res/water). The 2D Renderer
 * carries them; a view that has no such lanes hands the bench null and
 * those rows are not built. Type-only: no runtime lives here.
 */
import type { Vec2 } from '@arx/shared';
import type { StageResTier } from '../render/stage/renderScale.js';

/** The camera facts the chrome reads. */
export interface ViewCamera {
  /** Screen pixels per world tile at the look-at point. */
  readonly scale: number;
}

/** The Display bench's canvas2d lane switches (the 2D Renderer's). */
export interface ViewDisplayFlags {
  stageGround: boolean;
  stageWorld: boolean;
  stageResTier: StageResTier;
  reflectionsOn: boolean;
  waterFxFull: boolean;
  /** Drop backend-specific caches after a stage switch. */
  onBackendSwitch(): void;
}

export interface ViewAdapter {
  readonly camera: ViewCamera;
  /**
   * Screen position (CSS px, viewport w×h) of a world ground point,
   * terrain lift applied — where a label's foot should sit.
   */
  screenAnchor(wx: number, wy: number, w: number, h: number): { x: number; y: number };
  /** The world ground point under a screen pixel. */
  pickWorld(sx: number, sy: number): Vec2;
}
