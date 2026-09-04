/**
 * THE SCARRED LAND — A. the cold hearth's walls: RuinWallStone (505)
 * and RuinWallWood (506), the SIXTH run-merging family. A ruin merges
 * with its OWN kind only (stone with stone, char with char — the
 * separate-masonry law); it never joins a living WALL_RUN, never
 * bounds an interior, and the roofer (keyed on WALL_RUN_TILES) can
 * never grow a roof over it. These two paint their exposed silhouette
 * LIVE like the fence and the palisade (uncapped seamless runs), so
 * they stand outside CACHED_RING_TILES and the renderer's switch calls
 * in here directly.
 *
 * K0 stub: one squared course in the family ink, spanning the tile
 * to meet same-kind neighbours E/W, lit top plane, lit west facet.
 * K1 THE COLD HEARTH replaces the art in place.
 */
import { RUIN_WALL_TILES, Tile } from '@arx/shared';
import { ELEV_H } from '../../elevPick.js';
import { shade } from '../../tint.js';
import { DOCK_LIFT } from '../../terrain.js';
import { SCAR_CHAR } from '../palette.js';
import type { ClientGame } from '../../../game/clientGame.js';
import type { PaintHost } from '../../paintHost.js';
import type { DrawItem } from '../../renderer.js';

const RUIN_STONE = '#5b5566';

/** Own-kind connectivity: a ruin course reaches only for its own tile id. */
function ruinKin(game: ClientGame, tile: Tile, x: number, y: number): boolean {
  const t = game.world.groundAt(x, y);
  return t === tile && RUIN_WALL_TILES.has(t);
}

export function ruinWallItem(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame): DrawItem {
  const ds = rend.camera.depthScale(ty + 0.5); // Epic B (FW): ds=1 at q=0 → byte-identical
  const s = rend.camera.scale * ds;
  const syT = s * rend.camera.yScale;
  const p = rend.camera.worldToScreen(tx + 0.5, ty + 0.5, rend.w, rend.h);
  p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
  if (rend.porchAt(game, tx, ty)) p.y -= DOCK_LIFT * s;
  const stone = tile === Tile.RuinWallStone;
  const ink = stone ? RUIN_STONE : SCAR_CHAR;
  const lit = shade(ink, 22);
  const west = shade(ink, 10);
  const dark = shade(ink, -8);
  const ce = ruinKin(game, tile, tx + 1, ty);
  const cw = ruinKin(game, tile, tx - 1, ty);
  // A tumble stands waist-high (stone) or a little over (the char
  // studs); the top plane sits at TOP-PLANE depth.
  const up = (stone ? 0.5 : 0.62) * s;
  const top = syT * 0.32;
  const baseY = p.y + syT * 0.14;
  // Span to the tile edge toward a same-kind neighbour; inset the free end.
  const x0 = p.x - s * (cw ? 0.5 : 0.42);
  const x1 = p.x + s * (ce ? 0.5 : 0.42);
  return {
    sortY: ty + 0.64,
    body: { x: x0 - s * 0.1, y: baseY - up - top - s * 0.1, w: x1 - x0 + s * 0.2, h: up + top + s * 0.4 },
    drawShadow: () => rend.castEdgeQuad(x0, baseY, x1, baseY, up / s),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = ink;
      ctx.fillRect(x0, baseY - up, x1 - x0, up);
      ctx.fillStyle = dark;
      ctx.fillRect(x1 - s * 0.05, baseY - up, s * 0.05, up);
      if (!cw) {
        // The free west end shows its lit facet to the art sun.
        ctx.fillStyle = west;
        ctx.fillRect(x0, baseY - up, s * 0.07, up);
      }
      ctx.fillStyle = lit;
      ctx.fillRect(x0, baseY - up - top, x1 - x0, top);
    },
  };
}
