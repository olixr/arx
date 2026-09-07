import { TILE_SKIP, tileDef } from '@arx/shared';
import {
  buildAmberford,
  buildAshlamp,
  buildDawnmead,
  buildFenside,
  buildPicket,
  buildTurnoff,
  buildWardthread,
  buildSett,
  buildCourseA,
  buildCourseB,
  buildCourseC,
  buildMeadow,
  buildPinewatch,
  buildHartfell,
  buildKingsdelf,
  buildEvenfall,
  buildSaltmere,
  buildSilverfall,
  buildUndercroft,
  buildLowhall,
  type ZoneDef,
} from '@arx/content';

/**
 * Authored-zone ground art for the player map, baked from the BUNDLED
 * zone builders — no network, no dev API (which is 403 in prod). Live
 * streamed chunks draw OVER this (they carry the server's edited/built
 * truth), so bundled art only ever fills ground the session hasn't
 * received — a fine cartographic approximation.
 */

export interface ZoneArt {
  canvas: HTMLCanvasElement;
  /**
   * THE WORLDS APART: the plane whose chart this art belongs on.
   * Planes legitimately overlap in coordinates — the Undercroft lies
   * over open surface wilderness — so the drawer must match plane,
   * never just rectangle.
   */
  plane: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const colorCache = new Map<number, number>();
function tileRgb(t: number): number {
  let v = colorCache.get(t);
  if (v === undefined) {
    v = parseInt(tileDef(t).color.slice(1), 16);
    colorCache.set(t, v);
  }
  return v;
}

function bakeZone(zone: ZoneDef): ZoneArt {
  const { width: w, height: h } = zone;
  const cnv = document.createElement('canvas');
  cnv.width = w;
  cnv.height = h;
  const ctx = cnv.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const t = zone.ground[i]!;
    // TILE_SKIP keeps the procedural ground — stays transparent.
    if (t === TILE_SKIP) continue;
    const v = tileRgb(t);
    const lv = zone.elev ? zone.elev[i]! : 0;
    const shade = lv > 0 ? 1 + lv * 0.1 : lv < 0 ? 1 + lv * 0.09 : 1;
    img.data[i * 4] = Math.min(255, ((v >> 16) & 0xff) * shade);
    img.data[i * 4 + 1] = Math.min(255, ((v >> 8) & 0xff) * shade);
    img.data[i * 4 + 2] = Math.min(255, (v & 0xff) * shade);
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return { canvas: cnv, plane: zone.plane ?? 'surface', x: zone.origin.x, y: zone.origin.y, w, h };
}

let cache: ZoneArt[] | null = null;

/** All bundled authored zones, baked once on first ask. */
export function authoredZoneArt(): ZoneArt[] {
  if (!cache) {
    cache = [
      buildDawnmead(),
      buildAmberford(),
      buildSilverfall(),
      buildSaltmere(),
      buildPinewatch(),
      buildHartfell(),
      buildKingsdelf(),
      buildEvenfall(),
      buildUndercroft(),
      buildLowhall(),
      // THE CONTESTED LANDS (band 7): the two First Road patches; their
      // TILE_SKIP stays transparent, so only the authored cells chart.
      buildAshlamp(),
      buildFenside(),
      // THE CONTESTED LANDS (band 8): the three north patches; their
      // TILE_SKIP stays transparent, so only the authored cells chart.
      buildWardthread(),
      buildPicket(),
      buildTurnoff(),
      // THE CONTESTED LANDS (band 9d): the Sett; its sunk floors chart
      // darker by the elev shade above, its TILE_SKIP stays transparent.
      buildSett(),
      // THE CONTESTED LANDS (band 9e): the Course's four frames; only
      // the line of set stone and the meadow's sheets chart.
      buildCourseA(),
      buildCourseB(),
      buildCourseC(),
      buildMeadow(),
    ].map(bakeZone);
  }
  return cache;
}
