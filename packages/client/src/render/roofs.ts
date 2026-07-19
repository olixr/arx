/**
 * ROOFS — stepped-hip masses derived from a building's footprint, the
 * same way the terrain derives plateau crowns: a BFS distance field
 * from the perimeter insets the footprint into rings; each ring is a
 * chamfered slab lifted one step higher. Rectangles read as classic
 * hipped roofs, L-shapes grow valleys for free, and 1-tile wings stay
 * low — all without a straight-skeleton in sight.
 *
 * Each ring bakes to its own flat canvas (plan coords, y foreshortened)
 * and the renderer blits it in per-row strips with the ring's lift —
 * the identical machinery to plateau crowns, so walk-behind occlusion
 * and roof-over-entity sorting come from the proven per-row y-sort law.
 */
import { Tile, hashCoords } from '@devcraft/shared';
import type { InteriorRegion } from './interiors.js';
import { packTile } from './interiors.js';
import { chamferRect } from './shapes.js';

/** Vertical rise of each roof ring, in tiles of screen height. */
export const ROOF_STEP = 0.5;
/**
 * PERSPECTIVE LAW: each ring also steps NORTH in plan. The camera
 * tilts from the south, so a real sloped roof shows a WIDE south
 * slope and a ridge set back toward the far edge — concentric rings
 * read as a flat ziggurat; receding rings read as pitch.
 */
export const ROOF_RECEDE = 0.55;
/** Fascia board depth under each ring's south edges. */
export const ROOF_FASCIA = 0.16;
/** Eave overhang past the wall face, in tiles. */
const EAVE = 0.16;

export interface RoofBake {
  rings: RoofRing[];
  /** World-tile origin of every ring canvas (1-tile margin). */
  origX: number;
  origY: number;
  /** Canvas width/height in world tiles. */
  wTiles: number;
  hTiles: number;
  px: number;
  yScale: number;
}

export interface RoofRing {
  canvas: HTMLCanvasElement;
  /** Ring index: lift = wallH + k * ROOF_STEP. */
  k: number;
  /** Which canvas rows (world rows) hold content, for strip culling. */
  rows: boolean[];
}

/** Roof cloth per wall material: [surface, fascia, detail]. */
const PALETTES: Record<number, [string, string, string]> = {
  [Tile.WallWood]: ['#b3925a', '#7d6236', 'rgba(74, 56, 26, 0.35)'], // thatch
  [Tile.WallStone]: ['#67617a', '#443f52', 'rgba(28, 24, 42, 0.4)'], // slate
};

/** Sun-side brink tone for a surface color. */
function lightTone(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + 26);
  const g = Math.min(255, ((n >> 8) & 0xff) + 24);
  const b = Math.min(255, (n & 0xff) + 18);
  return `rgb(${r}, ${g}, ${b})`;
}

export function bakeRoof(region: InteriorRegion, px: number, yScale: number): RoofBake {
  const origX = region.x0 - 2;
  const origY = region.y0 - 2;
  const wTiles = region.x1 - region.x0 + 5;
  const hTiles = region.y1 - region.y0 + 5;

  // Distance-to-outside field over the footprint (walls included —
  // the roof covers the walls, and the eave hangs past them).
  const member = (tx: number, ty: number): boolean =>
    region.tiles.has(packTile(tx, ty)) || region.wallTiles.has(packTile(tx, ty));
  const dist = new Int16Array(wTiles * hTiles).fill(-1);
  const idx = (tx: number, ty: number): number => (ty - origY) * wTiles + (tx - origX);
  let frontier: Array<[number, number]> = [];
  for (let ty = origY; ty < origY + hTiles; ty++) {
    for (let tx = origX; tx < origX + wTiles; tx++) {
      if (!member(tx, ty)) {
        dist[idx(tx, ty)] = 0;
        frontier.push([tx, ty]);
      }
    }
  }
  let d = 0;
  let maxD = 0;
  while (frontier.length > 0) {
    d++;
    const next: Array<[number, number]> = [];
    for (const [fx, fy] of frontier) {
      for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]] as const) {
        const nx = fx + dx;
        const ny = fy + dy;
        if (nx < origX || ny < origY || nx >= origX + wTiles || ny >= origY + hTiles) continue;
        const i = idx(nx, ny);
        if (dist[i] !== -1) continue;
        dist[i] = d;
        maxD = d;
        next.push([nx, ny]);
      }
    }
    frontier = next;
  }

  const K = Math.min(2, Math.max(0, maxD - 1));
  const [surface, fascia, detail] = PALETTES[region.wallMaterial] ?? PALETTES[Tile.WallWood]!;
  const thatch = region.wallMaterial !== Tile.WallStone;
  const rings: RoofRing[] = [];

  for (let k = 0; k <= K; k++) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(wTiles * px);
    canvas.height = Math.ceil(hTiles * px * yScale + px * 0.6);
    const ctx = canvas.getContext('2d')!;
    const rows: boolean[] = new Array(hTiles).fill(false);

    // The ring's silhouette: chamfered outline of {dist > k}, built
    // from per-tile chamferRects unioned in one path — corner cells
    // (no two axis neighbors outside the ring) keep square joins, so
    // the mass reads as one cut slab, not a pile of tiles.
    const inRing = (tx: number, ty: number): boolean => {
      if (tx < origX || ty < origY || tx >= origX + wTiles || ty >= origY + hTiles) return false;
      return dist[idx(tx, ty)]! > k;
    };
    const path = new Path2D();
    let any = false;
    for (let ty = origY; ty < origY + hTiles; ty++) {
      for (let tx = origX; tx < origX + wTiles; tx++) {
        if (!inRing(tx, ty)) continue;
        any = true;
        rows[ty - origY] = true;
        const gx = (tx - origX) * px;
        const gy = (ty - origY) * px * yScale;
        const n = inRing(tx, ty - 1);
        const e = inRing(tx + 1, ty);
        const so = inRing(tx, ty + 1);
        const w = inRing(tx - 1, ty);
        const r = px * 0.3;
        // Overreach half a pixel into joined neighbors: no hairlines.
        chamferRect(
          path,
          gx - (w ? 0.5 : 0),
          gy - (n ? 0.5 : 0),
          px + (w ? 0.5 : 0) + (e ? 0.5 : 0),
          px * yScale + (n ? 0.5 : 0) + (so ? 0.5 : 0),
          [!n && !w ? r : 0, !n && !e ? r : 0, !so && !e ? r : 0, !so && !w ? r : 0],
        );
      }
    }
    if (!any) break;

    // NEVER stroke a union-of-tiles path — the stroke outlines every
    // internal tile edge. Silhouette work is done with DILATED FILLS
    // (the same law the icon outlines use): offset copies of the fill
    // expand the silhouette cleanly whatever its topology.
    ctx.fillStyle = fascia;
    if (k === 0) {
      // Eave overhang: eight offset fills push the fascia past the
      // wall face all around.
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        ctx.save();
        ctx.translate(Math.cos(ang) * EAVE * px, Math.sin(ang) * EAVE * px * yScale);
        ctx.fill(path);
        ctx.restore();
      }
    }
    // Fascia riser: the silhouette dropped by the step depth peeks out
    // under every south-facing edge — the slab's visible thickness.
    // Upper rings drop the FULL step so the riser meets the ring below.
    const riser = (k === 0 ? ROOF_FASCIA : ROOF_STEP + 0.03) * px;
    ctx.save();
    ctx.translate(0, riser);
    ctx.fill(path);
    if (k === 0) {
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        ctx.save();
        ctx.translate(Math.cos(ang) * EAVE * px, Math.sin(ang) * EAVE * px * yScale);
        ctx.fill(path);
        ctx.restore();
      }
    }
    ctx.restore();
    // Sunlit brink: a lit copy shifted up peeks along north edges,
    // then the roof plane covers everything else.
    ctx.fillStyle = lightTone(surface);
    ctx.save();
    ctx.translate(0, -px * 0.07);
    ctx.fill(path);
    ctx.restore();
    ctx.fillStyle = surface;
    ctx.fill(path);

    // SLOPE LIGHT: the sun rakes from the south, so each pitch runs
    // shadowed at its ridge side down to a sunlit hem — a vertical
    // gradient pair clipped to the plane sells the tilt that flat
    // fills never could.
    ctx.save();
    ctx.clip(path);
    const shadeG = ctx.createLinearGradient(0, 0, 0, canvas.height);
    shadeG.addColorStop(0, 'rgba(22, 18, 34, 0.24)');
    shadeG.addColorStop(0.55, 'rgba(22, 18, 34, 0)');
    ctx.fillStyle = shadeG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const sunG = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sunG.addColorStop(0.55, 'rgba(255, 238, 200, 0)');
    sunG.addColorStop(1, 'rgba(255, 238, 200, 0.13)');
    ctx.fillStyle = sunG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Material skin, clipped to the plane.
    ctx.save();
    ctx.clip(path);
    if (thatch) {
      // Combed thatch: sparse strokes raked down-slope, plus a ragged
      // hem shadow along the ring's south edge (the fascia line).
      ctx.strokeStyle = detail;
      ctx.lineWidth = Math.max(1, px * 0.045);
      for (let ty = 0; ty < hTiles; ty++) {
        for (let tx2 = 0; tx2 < wTiles; tx2++) {
          const hh = hashCoords(173 + k, origX + tx2, origY + ty);
          if ((hh & 3) !== 0) continue;
          const cx2 = tx2 * px + ((hh >> 3) % 80) / 100 * px;
          const cy2 = ty * px * yScale + ((hh >> 9) % 80) / 100 * px * yScale;
          ctx.beginPath();
          ctx.moveTo(cx2, cy2);
          ctx.lineTo(cx2 + (((hh >> 5) % 5) - 2) * px * 0.02, cy2 + px * 0.18);
          ctx.stroke();
        }
      }
    } else {
      // Slate courses: horizontal seams with staggered vertical ticks.
      ctx.strokeStyle = detail;
      ctx.lineWidth = Math.max(1, px * 0.035);
      const courseH = px * yScale * 0.5;
      for (let cy2 = 0; cy2 < canvas.height; cy2 += courseH) {
        ctx.beginPath();
        ctx.moveTo(0, cy2);
        ctx.lineTo(canvas.width, cy2);
        ctx.stroke();
        const row = Math.round(cy2 / courseH);
        for (let cx2 = (row % 2) * px * 0.5; cx2 < canvas.width; cx2 += px) {
          ctx.beginPath();
          ctx.moveTo(cx2, cy2);
          ctx.lineTo(cx2, cy2 + courseH * 0.45);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    rings.push({ canvas, k, rows });
  }

  // Chimney garnish on the top ring for hearth-warmed homes.
  if (region.hasHearth && rings.length > 0) {
    const top = rings[rings.length - 1]!;
    const ctx2 = top.canvas.getContext('2d')!;
    let spot: { tx: number; ty: number } | null = null;
    for (let ty = origY; ty < origY + hTiles && !spot; ty++) {
      for (let tx = origX; tx < origX + wTiles && !spot; tx++) {
        if (dist[idx(tx, ty)]! > rings.length - 1 && (hashCoords(191, tx, ty) & 3) === 0) {
          spot = { tx, ty };
        }
      }
    }
    if (spot) {
      const gx = (spot.tx - origX + 0.3) * px;
      const gy = (spot.ty - origY + 0.2) * px * yScale;
      ctx2.fillStyle = '#55505e';
      ctx2.fillRect(gx, gy - px * 0.34, px * 0.32, px * 0.42);
      ctx2.fillStyle = '#67617a';
      ctx2.fillRect(gx - px * 0.03, gy - px * 0.42, px * 0.38, px * 0.1);
      ctx2.fillStyle = '#2c2836';
      ctx2.fillRect(gx + px * 0.04, gy - px * 0.38, px * 0.24, px * 0.05);
    }
  }

  return { rings, origX, origY, wTiles, hTiles, px, yScale };
}
