/**
 * THE SCARRED LAND — K0 THE SHEET: the stub grammar.
 *
 * Every id in the kit exists and is painted from day one so the
 * strays gallery is quiet and every registration site is paid before
 * a brush is lifted. A stub is NOT placeholder art in the sense of a
 * coloured square: it obeys the laws the finished piece will obey —
 * BODY-RULER (measured in `s`, the tile), TOP-PLANE (a lit top at
 * ~syT·0.32 on every standing piece), FLAT FORGE / BLOCK LAW (one
 * squared filled block, one lit west facet toward the fixed art sun,
 * depth as value steps, minimum feature 0.03s, never a stroked line),
 * THE ONE RING (silhouette only — the ring pass outlines the block;
 * nothing here strokes), draw-time `const ctx = rend.ctx`, SHADOWS
 * NEVER BAKE (castEdgeQuad / castContact per frame). K1–K4 replace
 * each stub with the finished piece in place; the registration never
 * moves again.
 */
import { shade } from '../../tint.js';
import type { DrawItem } from '../../renderer.js';
import type { PropFrame, PropHost, PropPainter } from '../types.js';

export interface StubSpec {
  /** Half-width of the block, tiles. */
  hw: number;
  /** Face height above the foot line, tiles (0 for a pan on the ground). */
  up: number;
  /** The family's face ink. */
  ink: string;
  /** The lit top plane (default: the ink lifted two value steps). */
  lit?: string;
  /** Depth of the top plane, in syT (default 0.32 — TOP-PLANE law). */
  depth?: number;
  /** Sort row offset within the tile (default 0.7). */
  sortOff?: number;
  /** A walkable pan: contact shade only, no cast edge. */
  flat?: boolean;
}

/** The one stub painter: a squared block with a lit top and a lit west facet. */
export function stubBlock(spec: StubSpec): PropPainter {
  const depth = spec.depth ?? 0.32;
  const lit = spec.lit ?? shade(spec.ink, 22);
  const west = shade(spec.ink, 10);
  const dark = shade(spec.ink, -8);
  return (rend: PropHost, env: PropFrame): DrawItem => {
    const { p, s, stationBody, ty } = env;
    const syT = s * rend.camera.yScale;
    const baseY = p.y + syT * 0.18;
    const hw = spec.hw * s;
    const up = spec.up * s;
    const top = depth * syT;
    return {
      sortY: ty + (spec.sortOff ?? 0.7),
      body: stationBody(spec.hw + 0.12, spec.up + depth + 0.25, 0.3),
      drawShadow: () =>
        spec.flat || spec.up <= 0
          ? rend.castContact(p.x, baseY, hw, syT * 0.16)
          : rend.castEdgeQuad(p.x - hw * 0.8, baseY, p.x + hw * 0.8, baseY, spec.up),
      draw: () => {
        // Draw-time ctx capture: the outline pass swaps rend.ctx.
        const ctx = rend.ctx;
        // Contact shade seats the block in its ground.
        ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
        ctx.beginPath();
        ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.05, syT * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        // The face: one squared block in the family ink.
        ctx.fillStyle = spec.ink;
        ctx.fillRect(p.x - hw, baseY - up, hw * 2, up);
        // The east arris steps darker (depth as a value step).
        ctx.fillStyle = dark;
        ctx.fillRect(p.x + hw - s * 0.05, baseY - up, s * 0.05, up);
        // The one lit facet faces the fixed west art sun.
        ctx.fillStyle = west;
        ctx.fillRect(p.x - hw, baseY - up, s * 0.07, up);
        // The lit top plane, foreshortened.
        ctx.fillStyle = lit;
        ctx.fillRect(p.x - hw, baseY - up - top, hw * 2, top);
      },
    };
  };
}
