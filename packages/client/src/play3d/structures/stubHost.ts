/**
 * THE STUB HOST (play3d W2 scaffold) — the smallest thing the AMBER
 * painters will accept as a PaintHost.
 *
 * The 2D painters that are worth calling for face art rather than
 * re-emitting (docs/play3d-w2-map.md §2.5 amber):
 *   garrisonArt.paintGarrisonMasonry / merlonBox   → rend.ctx only
 *   barrierArt.drawFencePost                        → ctx, camera.scale,
 *                                                     camera.yScale,
 *                                                     outlineOn,
 *                                                     beginStructOutline
 *   barrierArt.giantLog / ironBar / drawPalisadePost
 *     / ironCurbEW / drawGravePier / ironRail       → ctx, camera.scale
 *                                                     (+ yScale, outline)
 *   barrierArt.hedgeMassPaint                       → ctx, camera.scale,
 *                                                     camera.yScale,
 *                                                     outlineOn
 *   wallHungArt *OnFace (13 of 14)                  → ctx, breezeAt,
 *                                                     beginStructOutline
 *   wallHungArt.tapestryOnFace                      → + garrisonish /
 *                                                     wallish over a
 *                                                     ClientGame — NOT
 *                                                     covered; re-emit.
 * Verified 2026-09-04 by grepping each painter's body for `rend.`:
 * NONE of the above reaches particles, queueGlow, castEdgeQuad or the
 * stage — those live in the `*Item` factories, which are RED (never
 * called). A lane that wants a painter outside this list greps its
 * body first and extends StubHost (or re-emits the few lines).
 *
 * `PaintHost` is a Pick<Renderer, ~70 members>; this stub honestly
 * carries the eight it needs, and `asPaintHost` is the ONE cast — at
 * the call site, with the reason — so a painter that grows a new host
 * read fails loudly in a lane's screenshot rather than silently here.
 *
 * The atlas has no clock: `breezeAt` answers still air (sway 0,
 * gust 1), `frameDt` 0 — a baked face does not move. Outline is OFF:
 * the 3D ink ring comes from the post stack (InkPass), not from the
 * painters' stroke.
 */
import type { PaintHost } from '../../render/paintHost.js';
import { FACE_PX } from './faceAtlas.js';

/** The 2.5D ground squash the painters were tuned under. */
export const Y_SQUASH = 0.6;

export interface StubCamera {
  /** px per tile — what `s` means to every painter. */
  scale: number;
  readonly yScale: number;
  snapPx(v: number): number;
  worldToScreen(wx: number, wy: number, w: number, h: number): { x: number; y: number };
  worldToScreenInto(wx: number, wy: number, w: number, h: number, out: { x: number; y: number }): { x: number; y: number };
}

export interface StubHost {
  ctx: CanvasRenderingContext2D;
  camera: StubCamera;
  /** Canvas size the painters may read for culling — the tile's own. */
  w: number;
  h: number;
  outlineOn: boolean;
  frameDt: number;
  frameNo: number;
  /** No game behind a face bake; painters that need one are red. */
  game: null;
  breezeAt(tx: number, ty: number, t: number, ph: number, s: number, ampA: number, ampB: number): { sway: number; lag: number; gust: number };
  beginStructOutline(): void;
}

const STILL_AIR = Object.freeze({ sway: 0, lag: 0, gust: 1 });

/** A stub host over `ctx` at `scale` px/tile. Retarget with `aim`. */
export function makeStubHost(ctx: CanvasRenderingContext2D, scale = FACE_PX): StubHost {
  const camera: StubCamera = {
    scale,
    yScale: Y_SQUASH,
    snapPx: (v) => Math.round(v),
    worldToScreen: (wx, wy) => ({ x: wx * camera.scale, y: wy * camera.scale * Y_SQUASH }),
    worldToScreenInto: (wx, wy, _w, _h, out) => {
      out.x = wx * camera.scale;
      out.y = wy * camera.scale * Y_SQUASH;
      return out;
    },
  };
  const host: StubHost = {
    ctx,
    camera,
    w: ctx.canvas.width,
    h: ctx.canvas.height,
    outlineOn: false,
    frameDt: 0,
    frameNo: 0,
    game: null,
    breezeAt: () => STILL_AIR,
    beginStructOutline: () => {
      const c = host.ctx;
      c.strokeStyle = '#241a2e';
      c.lineWidth = Math.max(1.5, host.camera.scale * 0.055);
      c.lineJoin = 'round';
      c.lineCap = 'round';
    },
  };
  return host;
}

/** Point the host at another canvas (the atlas paints many tiles through one host). */
export function aimStubHost(host: StubHost, ctx: CanvasRenderingContext2D, scale?: number): StubHost {
  host.ctx = ctx;
  host.w = ctx.canvas.width;
  host.h = ctx.canvas.height;
  if (scale !== undefined) host.camera.scale = scale;
  return host;
}

/**
 * THE ONE CAST. PaintHost names ~70 Renderer members; the amber
 * painters listed in the header read eight of them, all present here.
 * Any painter outside that list is the caller's proof to bring.
 */
export function asPaintHost(host: StubHost): PaintHost {
  return host as unknown as PaintHost;
}

/**
 * Run `paint` in the 2D painters' FACE-LOCAL frame: x from the tile's
 * west edge, y rising NEGATIVE from 0 at the ground base (the tile's
 * bottom row). The face's crown is at y = -h.
 */
export function faceFrame(ctx: CanvasRenderingContext2D, h: number, paint: () => void): void {
  ctx.save();
  ctx.translate(0, h);
  paint();
  ctx.restore();
}
