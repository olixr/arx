/**
 * THE FACES ARE PAINTED ONCE (play3d W2 — WALLS lane) — the 2D wall
 * painters re-emitted as ATLAS TILE painters: each function paints one
 * face tile (origin top-left, base at y = h) that the wall geometry
 * then maps by (u W→E, v base→crown). Nothing here knows Three.js or
 * the world; the lane composes keys and calls `atlas.get(key, spec)`.
 *
 * Laws (ported from renderer.ts wallItem / doorwayItem / awningItem
 * and garrisonArt, docs/play3d-w2-map.md §2.4):
 *  - THE COURSE LAW IS ABSOLUTE: timber lays round(span / 0.42) whole
 *    chinked logs over a 0.22 plinth + 0.11 sill and under a 0.13
 *    plate; masonry lays 0.39-tile courses in running bond. A taller
 *    face stacks MORE courses — never stretched ones.
 *  - LAMBERT EATS A STOP: every 2D tone passes through faceTone.litTone
 *    before it touches a face; the REAR RISER's shade(-14) is the
 *    N/E/W side tone (`'shaded'`), the south face is `'lit'`.
 *  - THE PAINTER IS SEEDED, NOT PLACED: knots, checks, pegs and stone
 *    whispers deal by hashCoords over a VARIANT seed, so a handful of
 *    tiles per material serve a whole town and the atlas stays one
 *    page; geometry picks the variant per world tile.
 *  - Window dressing, door frames and the leaf keep the 2D's own
 *    measures (head 1.62, band 0.7, u 0.28..0.72; jamb 0.15, opening
 *    H − 1.56) so the 2D feature placement carries over 1:1.
 *  - Amber painters (garrisonArt masonry, wallHungArt *OnFace) run
 *    under the stub host and get their stop back as a white wash.
 */
import { Detail, hashCoords } from '@arx/shared';
import { AWNING_CLOTHS, GAR_LEAF, stone01 } from '../../render/paintVocab.js';
import { shade } from '../../render/tint.js';
import { WOOD_SKINS, type WoodSkin } from '../../render/woodSkins.js';
import { paintGarrisonMasonry } from '../../render/garrisonArt.js';
import * as wallHungArt from '../../render/wallHungArt.js';
import type { ClientGame } from '../../game/clientGame.js';
import type { AwningShape, WallHungInfo } from '@arx/shared';
import { FACE_LIFT, litTone } from './faceTone.js';
import { FACE_PX, type FaceSpec } from './faceAtlas.js';
import { GARRISON_H, WALL_H, type WallMaterial } from './structKinds.js';
import { asPaintHost, faceFrame, type StubHost } from './stubHost.js';

// ------------------------------------------------------------- tones

/** The 2D wall tones (renderer.ts:10535-10537, :8738, :11772). */
export const STONE_TOP = '#8c8798';
export const STONE_FACE = '#5b5566';
export const CAVE_TOP = '#3a3444';
export const CAVE_FACE = '#221d2c';
export const PLINTH_COL = '#6e6779';
export const STONE_TRIM = '#8a8496';
/** Garrison palette (garrisonArt.ts:18-33, module-private there). */
export const GAR_FACE = '#544e61';
export const GAR_TOP = '#655f72';
export const GAR_MERLON_TOP = '#847e91';
export const GAR_TRIM = '#7b7590';
/** The REAR RISER's back-face shade (renderer.ts:11031). */
export const REAR_SHADE = -14;
/** A crown faces the sun square-on and needs only a whisper of the stop. */
export const CROWN_LIFT = 0.05;

export type FaceToneKind = 'lit' | 'shaded';

/** A 2D tone made ready for a lit or a shaded 3D face. */
export function toned(hex: string, tone: FaceToneKind): string {
  return litTone(tone === 'shaded' ? shade(hex, REAR_SHADE) : hex);
}

/** The skin's index in WOOD_SKINS (for atlas keys); oak when unknown. */
export function skinIndex(skin: WoodSkin): number {
  const i = WOOD_SKINS.indexOf(skin);
  return i < 0 ? 0 : i;
}

export interface MatTones {
  face: string;
  top: string;
  trim: string;
}

/** Face / crown / trim tones for a wall material, toned for a face side. */
export function matTones(mat: WallMaterial, skin: WoodSkin, tone: FaceToneKind): MatTones {
  if (mat === 'wood') return { face: toned(skin.log, tone), top: toned(skin.top, tone), trim: toned(skin.trim, tone) };
  if (mat === 'stone') return { face: toned(STONE_FACE, tone), top: toned(STONE_TOP, tone), trim: toned(STONE_TRIM, tone) };
  return { face: toned(CAVE_FACE, tone), top: toned(CAVE_TOP, tone), trim: toned(shade(CAVE_FACE, 30), tone) };
}

/** A skin with every tone passed through `toned`. */
export function tonedSkin(skin: WoodSkin, tone: FaceToneKind): WoodSkin {
  return {
    ...skin,
    log: toned(skin.log, tone),
    log2: toned(skin.log2, tone),
    chink: toned(skin.chink, tone),
    top: toned(skin.top, tone),
    plate: toned(skin.plate, tone),
    trim: toned(skin.trim, tone),
  };
}

/** Give an amber painter its stop back: a white wash = litTone's lerp. */
export function lambertWash(ctx: CanvasRenderingContext2D, w: number, h: number, tone: FaceToneKind): void {
  if (tone === 'shaded') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.fillStyle = `rgba(255, 255, 255, ${FACE_LIFT})`;
  ctx.fillRect(0, 0, w, h);
}

// --------------------------------------------------------- tile specs

/** Pixel size of a face `tilesW` tiles wide and `H` tiles tall. */
export function faceTileSize(tilesW: number, H: number): { w: number; h: number; s: number } {
  const h = Math.max(1, Math.round(H * FACE_PX));
  const s = h / H;
  return { w: Math.max(1, Math.round(tilesW * s)), h, s };
}

/** A face spec painted in the 2D face-local frame (y rising negative from the base). */
export function faceSpec(tilesW: number, H: number, paint: (ctx: CanvasRenderingContext2D, w: number, h: number, s: number) => void, bleed = true): FaceSpec {
  const { w, h, s } = faceTileSize(tilesW, H);
  return {
    w,
    h,
    bleed,
    paint: (ctx) => faceFrame(ctx, h, () => paint(ctx, w, h, s)),
  };
}

// --------------------------------------------------- the timber face

/** The timber course geometry (renderer.ts:10574-10586) — shared by face and jamb painters. */
export function timberCourses(hs: number, s: number, sill = true): { plinthH: number; sillH: number; plateH: number; nLogs: number; chinkG: number; logH: number; spanPx: number } {
  const plinthH = s * 0.22;
  const sillH = sill ? s * 0.11 : 0;
  const plateH = s * 0.13;
  const spanPx = hs - plateH - plinthH - sillH;
  const nLogs = Math.max(1, Math.round(spanPx / (s * 0.42)));
  const chinkG = Math.min(s * 0.055, spanPx * 0.05);
  const logH = (spanPx - chinkG * (nLogs - 1)) / nLogs;
  return { plinthH, sillH, plateH, nLogs, chinkG, logH, spanPx };
}

/**
 * CHINKED-LOG WALL (renderer.ts:10680-10800): plinth, sill beam, whole
 * log courses over limewash chinking, plate beam — with the wood's own
 * character dealt by hash per tile column `c` (seed = variant).
 */
export function paintTimberFace(ctx: CanvasRenderingContext2D, x0: number, x1: number, hs: number, s: number, skin: WoodSkin, seedX: number, seedY: number, plinth = true): void {
  const { plinthH, sillH, plateH, nLogs, chinkG, logH, spanPx } = timberCourses(hs, s, true);
  const w = x1 - x0;
  const cols = Math.max(1, Math.round(w / s));
  ctx.fillStyle = skin.log;
  ctx.fillRect(x0, -hs, w, hs);
  if (plinth) {
    ctx.fillStyle = litTone(PLINTH_COL);
    ctx.fillRect(x0, -plinthH, w, plinthH);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(x0, -plinthH, w, s * 0.03);
    ctx.fillStyle = 'rgba(20, 14, 28, 0.35)';
    for (let c = 0; c < cols; c++) {
      for (let k = 0; k < 2; k++) {
        const hj = hashCoords(211 + k, seedX + c, seedY);
        ctx.fillRect(x0 + c * s + s * (0.12 + (hj % 76) / 100), -plinthH + s * 0.04, Math.max(1, s * 0.03), plinthH - s * 0.07);
      }
    }
  }
  if (sillH > 0) {
    ctx.fillStyle = shade(skin.plate, -10);
    ctx.fillRect(x0, -plinthH - sillH, w, sillH);
    ctx.fillStyle = 'rgba(255, 220, 170, 0.14)';
    ctx.fillRect(x0, -plinthH - sillH, w, s * 0.028);
  }
  const base = plinthH + sillH;
  const topY = -(hs - plateH);
  ctx.fillStyle = skin.chink;
  ctx.fillRect(x0, topY, w, spanPx + 0.5);
  for (let li = 0; li < nLogs; li++) {
    const yb = -base - li * (logH + chinkG);
    const yt = yb - logH;
    ctx.fillStyle = li % 2 === 0 ? skin.log : skin.log2;
    ctx.fillRect(x0, yt, w, logH);
    ctx.fillStyle = 'rgba(255, 214, 150, 0.2)';
    ctx.fillRect(x0, yt + logH * 0.06, w, logH * 0.2);
    ctx.fillStyle = 'rgba(28, 16, 6, 0.22)';
    ctx.fillRect(x0, yb - logH * 0.2, w, logH * 0.2);
    ctx.fillStyle = 'rgba(20, 12, 5, 0.45)';
    ctx.fillRect(x0, yb - Math.max(1, s * 0.022), w, Math.max(1, s * 0.022));
    for (let c = 0; c < cols; c++) {
      const px = x0 + c * s;
      const hg = hashCoords(157 + li, seedX + c, seedY);
      if (hg % 100 < 30 * skin.knotK) {
        const kx = px + s * (0.14 + ((hg >>> 5) % 72) / 100);
        const ky = yt + logH * (0.32 + ((hg >>> 9) % 38) / 100);
        const kr = s * (0.03 + ((hg >>> 13) % 12) / 520);
        ctx.fillStyle = 'rgba(40, 24, 10, 0.45)';
        ctx.beginPath();
        ctx.ellipse(kx, ky, kr * 1.4, kr, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(skin.log, -24);
        ctx.beginPath();
        ctx.ellipse(kx, ky, kr * 0.65, kr * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if ((hg & 3) === 1) {
        ctx.fillStyle = 'rgba(46, 28, 12, 0.2)';
        ctx.fillRect(px + (s * (hg % 40)) / 100, yt + logH * (0.42 + ((hg >>> 11) % 22) / 100), s * (0.4 + ((hg >>> 6) % 45) / 100), Math.max(1, s * 0.026));
      }
      if ((hg >>> 3) % 100 < 13 * skin.checkK) {
        ctx.fillStyle = 'rgba(26, 15, 6, 0.4)';
        ctx.fillRect(px + s * (0.18 + ((hg >>> 7) % 62) / 100), (hg & 8) === 0 ? yt : yb - logH * 0.3, Math.max(1, s * 0.024), logH * 0.3);
      }
    }
  }
  // The wall-plate beam, pinned with trunnels.
  ctx.fillStyle = skin.plate;
  ctx.fillRect(x0, -hs, w, plateH);
  ctx.fillStyle = 'rgba(255, 220, 170, 0.15)';
  ctx.fillRect(x0, -hs, w, s * 0.03);
  ctx.fillStyle = 'rgba(26, 15, 7, 0.4)';
  ctx.fillRect(x0, -hs + plateH - s * 0.028, w, s * 0.028);
  for (let c = 0; c < cols; c++) {
    const hp = hashCoords(173, seedX + c, seedY);
    if ((hp & 3) !== 0) {
      ctx.fillStyle = 'rgba(40, 24, 10, 0.5)';
      const pgx = x0 + c * s + s * (0.18 + (hp % 30) / 100);
      ctx.fillRect(pgx, -hs + plateH * 0.28, s * 0.045, s * 0.045);
      if ((hp & 4) === 0) ctx.fillRect(pgx + s * 0.5, -hs + plateH * 0.28, s * 0.045, s * 0.045);
    }
  }
  // Ambient-occlusion seam where the face meets the ground.
  ctx.fillStyle = 'rgba(18, 12, 26, 0.28)';
  ctx.fillRect(x0, -s * 0.06, w, s * 0.06);
}

// -------------------------------------------------- the masonry face

/**
 * RUNNING-BOND MASONRY (renderer.ts:10805-10830) with the stone hash's
 * per-block whisper: 0.39-tile courses, head joints at 1/4-3/4 on even
 * courses and 1/2 on odd, a heavier foundation band.
 */
export function paintMasonryFace(ctx: CanvasRenderingContext2D, x0: number, x1: number, hs: number, s: number, face: string, seedX: number, seedY: number, cracked = false): void {
  const w = x1 - x0;
  const cols = Math.max(1, Math.round(w / s));
  ctx.fillStyle = face;
  ctx.fillRect(x0, -hs, w, hs);
  const cp = s * 0.39;
  const jw = Math.max(1, s * 0.03);
  const joint = 'rgba(20, 14, 28, 0.35)';
  for (let k = 0; ; k++) {
    const yb = -k * cp;
    if (-yb >= hs * 0.96) break;
    const yt = Math.max(yb - cp, -hs);
    const fr = k % 2 === 0 ? [0.25, 0.75] : [0.5];
    // Block spans across the whole width.
    const xs: number[] = [x0];
    for (let c = 0; c < cols; c++) for (const f of fr) xs.push(x0 + c * s + s * f);
    xs.push(x1);
    for (let i = 0; i + 1 < xs.length; i++) {
      const t01 = stone01(i + seedX * 7, k, 733 + seedY);
      ctx.fillStyle = shade(face, Math.round((t01 - 0.5) * 14));
      ctx.fillRect(xs[i]!, yt, xs[i + 1]! - xs[i]!, yb - yt);
      if (i > 0) {
        ctx.fillStyle = joint;
        ctx.fillRect(xs[i]! - jw / 2, yt, jw, yb - yt);
      }
    }
    if (k > 0) {
      ctx.fillStyle = joint;
      ctx.fillRect(x0, yb - jw / 2, w, jw);
    }
  }
  ctx.fillStyle = 'rgba(20, 12, 26, 0.2)';
  ctx.fillRect(x0, -hs * 0.1, w, hs * 0.1);
  if (cracked) paintSecretSeam(ctx, x0, hs, s, seedX, seedY);
  ctx.fillStyle = 'rgba(18, 12, 26, 0.28)';
  ctx.fillRect(x0, -s * 0.06, w, s * 0.06);
}

/** THE SECRET SEAM (renderer.ts:10840-10900): the cracked cave wall's one old fracture. */
function paintSecretSeam(ctx: CanvasRenderingContext2D, px: number, hs: number, s: number, tx: number, ty: number): void {
  const hc = hashCoords(199, tx, ty);
  const fr = (k: number, lo: number, hi: number): number => lo + (((hc >>> k) % 100) / 100) * (hi - lo);
  const pts: Array<[number, number]> = [
    [px + s * fr(0, 0.38, 0.62), -hs * 0.92],
    [px + s * fr(4, 0.28, 0.48), -hs * 0.72],
    [px + s * fr(8, 0.44, 0.68), -hs * 0.5],
    [px + s * fr(12, 0.3, 0.52), -hs * 0.28],
    [px + s * fr(16, 0.4, 0.6), -hs * 0.08],
  ];
  const bm = (hc & 32) === 0 ? 1 : -1;
  const branch: Array<[number, number]> = [pts[2]!, [pts[2]![0] + bm * s * 0.18, -hs * 0.36], [pts[2]![0] + bm * s * 0.3, -hs * 0.14]];
  const trace = (list: Array<[number, number]>): void => {
    ctx.beginPath();
    list.forEach(([lx, ly], i) => (i === 0 ? ctx.moveTo(lx, ly) : ctx.lineTo(lx, ly)));
  };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(128, 120, 150, 0.18)';
  ctx.lineWidth = Math.max(1.5, s * 0.055);
  trace(pts);
  ctx.stroke();
  trace(branch);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(12, 9, 20, 0.55)';
  ctx.lineWidth = Math.max(1, s * 0.02);
  trace(pts);
  ctx.stroke();
  trace(branch);
  ctx.stroke();
}

/** The base face of a material over [x0,x1] rising hs, seeded. */
export function paintMaterialFace(ctx: CanvasRenderingContext2D, x0: number, x1: number, hs: number, s: number, mat: WallMaterial, skin: WoodSkin, tone: FaceToneKind, seedX: number, seedY: number, cracked = false): void {
  if (mat === 'wood') paintTimberFace(ctx, x0, x1, hs, s, tonedSkin(skin, tone), seedX, seedY);
  else paintMasonryFace(ctx, x0, x1, hs, s, matTones(mat, skin, tone).face, seedX, seedY, cracked);
}

// -------------------------------------------------- the window face

/** The glazed opening's measures (renderer.ts:11148-11150), in tiles from the base. */
export const WINDOW_HEAD = 1.62;
export const WINDOW_BAND = 0.7;
export const WINDOW_SILL = WINDOW_HEAD - WINDOW_BAND;
export const WINDOW_U0 = 0.28;
export const WINDOW_U1 = 0.72;

/**
 * Window dressing AROUND the see-through opening (renderer.ts:10905-
 * 10960) on a 1-tile face: reveal ring, plank shutters / stone lintel
 * and sill, knee braces — end furniture only where the casement truly
 * ends (`mergeL` / `mergeR` = the light continues into the neighbour).
 */
export function paintWindowDressing(ctx: CanvasRenderingContext2D, s: number, mat: WallMaterial, skin: WoodSkin, face: string, mergeL: boolean, mergeR: boolean): void {
  const wx = mergeL ? 0 : s * WINDOW_U0;
  const wxE = mergeR ? s : s * WINDOW_U1;
  const wy = -s * WINDOW_HEAD;
  const wh2 = s * WINDOW_BAND;
  const rvL = mergeL ? wx : wx - s * 0.035;
  const rvR = mergeR ? wxE : wxE + s * 0.035;
  ctx.fillStyle = shade(face, -22);
  ctx.fillRect(rvL, wy - s * 0.035, rvR - rvL, wh2 + s * 0.07);
  const trmL = mergeL ? wx : wx - s * 0.18;
  const trmR = mergeR ? wxE : wxE + s * 0.18;
  if (mat === 'wood') {
    const shutters: number[] = [];
    if (!mergeL) shutters.push(wx - s * 0.15);
    if (!mergeR) shutters.push(wxE + s * 0.03);
    for (const shx of shutters) {
      ctx.fillStyle = shade(skin.log, -20);
      ctx.fillRect(shx, wy - s * 0.02, s * 0.12, wh2 + s * 0.04);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(shx + s * 0.045, wy + s * 0.02, s * 0.025, wh2 - s * 0.04);
    }
    ctx.fillStyle = skin.plate;
    ctx.fillRect(trmL, wy - s * 0.085, trmR - trmL, s * 0.055);
    ctx.fillStyle = 'rgba(40, 24, 10, 0.55)';
    if (!mergeL) ctx.fillRect(wx - s * 0.15, wy - s * 0.078, s * 0.04, s * 0.04);
    if (!mergeR) ctx.fillRect(wxE + s * 0.11, wy - s * 0.078, s * 0.04, s * 0.04);
    ctx.fillStyle = shade(skin.plate, 18);
    ctx.fillRect(trmL, wy + wh2 + s * 0.035, trmR - trmL, s * 0.06);
    ctx.fillStyle = shade(skin.plate, -8);
    const braces: number[] = [];
    if (!mergeL) braces.push(wx - s * 0.08);
    if (!mergeR) braces.push(wxE - s * 0.02);
    for (const bx of braces) {
      ctx.beginPath();
      ctx.moveTo(bx, wy + wh2 + s * 0.095);
      ctx.lineTo(bx + s * 0.1, wy + wh2 + s * 0.095);
      ctx.lineTo(bx + s * 0.1, wy + wh2 + s * 0.21);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    const stnL = mergeL ? wx : wx - s * 0.09;
    const stnR = mergeR ? wxE : wxE + s * 0.09;
    ctx.fillStyle = shade(face, -14);
    ctx.fillRect(stnL, wy - s * 0.1, stnR - stnL, s * 0.07);
    ctx.fillStyle = shade(face, 22);
    ctx.fillRect(stnL, wy + wh2 + s * 0.035, stnR - stnL, s * 0.065);
    ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
    ctx.fillRect(stnL, wy + wh2 + s * 0.1, stnR - stnL, s * 0.03);
  }
  // The hole itself is geometry; paint its rim dark so a mip never
  // bleeds wall tone into the reveal strips.
  ctx.fillStyle = shade(face, -30);
  ctx.fillRect(wx, wy, wxE - wx, wh2);
}

/**
 * THE MULLIONS as a card over the hole (renderer.ts:10985-10995): a
 * single light wears the four-pane cross; a merged light drops the
 * centre post and stands a shared post at the east seam. Painted on a
 * transparent card the size of the opening slice (alpha-cut).
 */
export function paintMullionCard(ctx: CanvasRenderingContext2D, w: number, h: number, s: number, tone: string, mergeL: boolean, mergeR: boolean): void {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = tone;
  if (!mergeL && !mergeR) ctx.fillRect(w / 2 - s * 0.022, 0, s * 0.044, h);
  else if (mergeR) ctx.fillRect(w - s * 0.06, 0, s * 0.06, h);
  ctx.fillRect(0, h * 0.46 - s * 0.02, w, s * 0.04);
  // A breath of glazing glint at the west light.
  if (!mergeL) {
    ctx.fillStyle = 'rgba(214, 228, 248, 0.55)';
    ctx.beginPath();
    ctx.moveTo(s * 0.03, s * 0.03);
    ctx.lineTo(Math.min(w, s * 0.44) * 0.55, s * 0.03);
    ctx.lineTo(s * 0.03, h * 0.6);
    ctx.closePath();
    ctx.fill();
  }
}

// -------------------------------------------------------- the crown

/**
 * The crown top: skin.top with the CAP BEAM read (renderer.ts
 * woodCrownPlate) along the run for timber; stone/cave flat with a
 * faint flag seam. `vert` = the run is N-S (the beam runs down v).
 */
export function paintCrownTile(ctx: CanvasRenderingContext2D, w: number, h: number, mat: WallMaterial, skin: WoodSkin, vert: boolean, seedX: number, seedY: number): void {
  const t = { top: litTone(mat === 'wood' ? skin.top : mat === 'stone' ? STONE_TOP : CAVE_TOP, CROWN_LIFT) };
  const s = w;
  ctx.fillStyle = t.top;
  ctx.fillRect(0, 0, w, h);
  const seam = Math.max(1, s * 0.025);
  const hj = hashCoords(177, seedX, seedY);
  if (mat !== 'wood') {
    // Stone slab: one quiet whisper per tile and a rare bed line.
    ctx.fillStyle = shade(t.top, Math.round((stone01(seedX, seedY, 91) - 0.5) * 10));
    ctx.fillRect(0, 0, w, h);
    if ((hj & 3) === 1) {
      ctx.fillStyle = 'rgba(20, 14, 28, 0.14)';
      if (vert) ctx.fillRect(w * (0.3 + ((hj >>> 6) % 40) / 100), 0, seam, h);
      else ctx.fillRect(0, h * (0.3 + ((hj >>> 6) % 40) / 100), w, seam);
    }
    return;
  }
  if (vert) {
    ctx.fillStyle = 'rgba(30, 18, 8, 0.24)';
    ctx.fillRect(0, 0, w * 0.1, h);
    ctx.fillRect(w - w * 0.1, 0, w * 0.1, h);
    ctx.fillStyle = 'rgba(255, 226, 175, 0.14)';
    ctx.fillRect(w * 0.32, 0, w * 0.36, h);
    if ((hj & 3) === 1) {
      ctx.fillStyle = 'rgba(40, 24, 10, 0.2)';
      ctx.fillRect(w * (0.2 + ((hj >>> 6) % 30) / 100), h * 0.12, seam, h * 0.62);
    }
    if ((hj & 7) === 2) {
      const jy = (h * (20 + (hj % 55))) / 100;
      ctx.fillStyle = 'rgba(40, 24, 10, 0.38)';
      ctx.fillRect(w * 0.08, jy, w * 0.84, seam);
      ctx.fillStyle = 'rgba(40, 24, 10, 0.5)';
      ctx.fillRect(w * 0.28, jy - s * 0.075, s * 0.042, s * 0.042);
      ctx.fillRect(w * 0.6, jy + s * 0.04, s * 0.042, s * 0.042);
    }
  } else {
    ctx.fillStyle = 'rgba(30, 18, 8, 0.24)';
    ctx.fillRect(0, 0, w, h * 0.1);
    ctx.fillRect(0, h * 0.9, w, h * 0.1);
    ctx.fillStyle = 'rgba(255, 226, 175, 0.14)';
    ctx.fillRect(0, h * 0.32, w, h * 0.36);
    if ((hj & 3) === 1) {
      ctx.fillStyle = 'rgba(40, 24, 10, 0.2)';
      ctx.fillRect((s * (hj % 60)) / 100, h * (0.2 + ((hj >>> 6) % 30) / 100), s * 0.5, seam);
    }
    if ((hj & 7) === 2) {
      const jx = (s * (20 + (hj % 55))) / 100;
      ctx.fillStyle = 'rgba(40, 24, 10, 0.38)';
      ctx.fillRect(jx, h * 0.08, seam, h * 0.84);
      ctx.fillStyle = 'rgba(40, 24, 10, 0.5)';
      ctx.fillRect(jx - s * 0.075, h * 0.28, s * 0.042, s * 0.042);
      ctx.fillRect(jx + s * 0.04, h * 0.6, s * 0.042, s * 0.042);
    }
  }
}

// -------------------------------------------------------- the door

/** The doorway's measures (renderer.ts:11787, :11813). */
export const DOOR_JAMB = 0.15;
export const DOOR_CLEAR = 1.56;

/**
 * A doorway's FACE (renderer.ts doorwayItem :11900-11990): the wall's
 * own material, the header across the top (stone: haunches + keystone;
 * timber: pegged lintel), jambs where the frame truly ends
 * (`jambL`/`jambR`), lit inner edges and plinth blocks. The opening
 * between is geometry — painted dark here for the mips.
 */
export function paintDoorFace(ctx: CanvasRenderingContext2D, w: number, hs: number, s: number, mat: WallMaterial, skin: WoodSkin, tone: FaceToneKind, jambL: boolean, jambR: boolean, seedX: number, seedY: number, H = WALL_H, clear = DOOR_CLEAR, jambW = DOOR_JAMB): void {
  const stone = mat !== 'wood';
  const t = matTones(mat, skin, tone);
  const trim = t.trim;
  paintMaterialFace(ctx, 0, w, hs, s, mat, skin, tone, seedX, seedY);
  const hh = Math.max(0, hs - s * clear);
  const jw = s * jambW;
  const x0 = 0;
  const x1 = w;
  // The opening: dark, so nothing pale bleeds into the reveals.
  ctx.fillStyle = 'rgba(14, 10, 22, 1)';
  ctx.fillRect(jambL ? x0 + jw : x0, -hs + hh, (jambR ? x1 - jw : x1) - (jambL ? x0 + jw : x0), hs - hh);
  // Header.
  ctx.fillStyle = trim;
  ctx.fillRect(x0, -hs, x1 - x0, hh);
  if (stone && hh > s * 0.05) {
    ctx.fillStyle = trim;
    const hy = -hs + hh;
    const cut = s * 0.2;
    if (jambL) {
      ctx.beginPath();
      ctx.moveTo(x0 + jw, hy);
      ctx.lineTo(x0 + jw + cut, hy);
      ctx.lineTo(x0 + jw, hy + cut);
      ctx.closePath();
      ctx.fill();
    }
    if (jambR) {
      ctx.beginPath();
      ctx.moveTo(x1 - jw, hy);
      ctx.lineTo(x1 - jw - cut, hy);
      ctx.lineTo(x1 - jw, hy + cut);
      ctx.closePath();
      ctx.fill();
    }
    if (jambL === jambR) {
      // The keystone rides the run's centre: a single tile or a
      // merged middle slice.
      ctx.fillStyle = shade(trim, 14);
      const mid = w / 2;
      ctx.beginPath();
      ctx.moveTo(mid - s * 0.12, -hs + hh + s * 0.02);
      ctx.lineTo(mid + s * 0.12, -hs + hh + s * 0.02);
      ctx.lineTo(mid + s * 0.07, -hs + s * 0.02);
      ctx.lineTo(mid - s * 0.07, -hs + s * 0.02);
      ctx.closePath();
      ctx.fill();
    }
  } else if (hh > s * 0.05) {
    ctx.fillStyle = shade(trim, 12);
    ctx.fillRect(x0 + (jambL ? s * 0.02 : 0), -hs + hh - s * 0.075, x1 - x0 - (jambL ? s * 0.02 : 0) - (jambR ? s * 0.02 : 0), s * 0.075);
    ctx.fillStyle = 'rgba(36, 22, 10, 0.4)';
    if (jambL) ctx.fillRect(x0 + jw + s * 0.02, -hs + hh * 0.45, s * 0.03, hh * 0.35);
    if (jambR) ctx.fillRect(x1 - jw - s * 0.05, -hs + hh * 0.45, s * 0.03, hh * 0.35);
    ctx.fillStyle = 'rgba(40, 24, 10, 0.55)';
    if (jambL) ctx.fillRect(x0 + jw * 0.4, -hs + hh - s * 0.155, s * 0.045, s * 0.045);
    if (jambR) ctx.fillRect(x1 - jw * 0.4 - s * 0.045, -hs + hh - s * 0.155, s * 0.045, s * 0.045);
  }
  ctx.fillStyle = 'rgba(18, 12, 26, 0.35)';
  ctx.fillRect(x0, -hs + hh, x1 - x0, s * 0.05);
  // Jambs.
  ctx.fillStyle = trim;
  if (jambL) ctx.fillRect(x0, -hs, jw, hs);
  if (jambR) ctx.fillRect(x1 - jw, -hs, jw, hs);
  ctx.fillStyle = shade(trim, 16);
  if (jambL) ctx.fillRect(x0 + jw - s * 0.035, -hs * 0.72, s * 0.035, hs * 0.72);
  if (jambR) ctx.fillRect(x1 - jw, -hs * 0.72, s * 0.035, hs * 0.72);
  ctx.fillStyle = shade(trim, -14);
  if (jambL) ctx.fillRect(x0, -hs * 0.12, jw + s * 0.015, hs * 0.12);
  if (jambR) ctx.fillRect(x1 - jw - s * 0.015, -hs * 0.12, jw + s * 0.015, hs * 0.12);
  void H;
}

/**
 * THE LEAF (renderer.ts paintDoorLeaf :11673, at rest): timber board
 * face, lit top rail, two recessed panels, iron straps at the hinge
 * edge (u = 0), the brass knob on the free edge.
 */
export function paintLeafTile(ctx: CanvasRenderingContext2D, w: number, h: number, s: number, base: string): void {
  const yTop = -h;
  ctx.fillStyle = base;
  ctx.fillRect(0, yTop, w, h);
  ctx.fillStyle = 'rgba(255, 224, 170, 0.14)';
  ctx.fillRect(0, yTop, w, s * 0.07);
  ctx.fillStyle = 'rgba(26, 16, 8, 0.35)';
  for (const [py, ph] of [
    [yTop + h * 0.1, h * 0.36],
    [yTop + h * 0.56, h * 0.34],
  ] as const) {
    ctx.fillRect(w * 0.18, py, w * 0.64, ph);
    ctx.fillStyle = 'rgba(255, 224, 170, 0.1)';
    ctx.fillRect(w * 0.18, py + ph - s * 0.03, w * 0.64, s * 0.03);
    ctx.fillStyle = 'rgba(26, 16, 8, 0.35)';
  }
  ctx.fillStyle = '#2e2a38';
  for (const hy of [yTop + h * 0.16, yTop + h * 0.72]) ctx.fillRect(0, hy, w * 0.3, s * 0.05);
  ctx.fillStyle = '#c9a03b';
  ctx.fillRect(w - s * 0.11, yTop + h * 0.48, s * 0.05, s * 0.05);
  ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
  ctx.fillRect(0, -s * 0.05, w, s * 0.05);
}

/** A plain reveal strip (jamb inner faces, header undersides, window reveals). */
export function paintPlainTile(ctx: CanvasRenderingContext2D, w: number, h: number, tone: string): void {
  ctx.fillStyle = tone;
  ctx.fillRect(0, -h, w, h);
  ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
  ctx.fillRect(0, -h, w, Math.max(1, h * 0.08));
}

// ------------------------------------------------------- the awning

/** The awning's measures (renderer.ts awningItem :18930-18960), tiles. */
export const AWNING_ROOT_H = 1.76;
export const AWNING_RAIL_H = 1.7;
export const AWNING_DEPTH = 0.85;
export const AWNING_FLARE = 0.16;
export function awningSkirtDepth(shape: AwningShape): number {
  return shape === 'market' ? 0.3 : shape === 'shed' ? 0.17 : shape === 'bowed' ? 0.15 : 0.12;
}

/** The sky-lit slab (top plane) — stripes for market, seams for shed, the barrel for bowed, slats for board. */
export function paintAwningTop(ctx: CanvasRenderingContext2D, w: number, h: number, shape: AwningShape, dye: number, skin: WoodSkin): void {
  const cloth = AWNING_CLOTHS[dye] ?? AWNING_CLOTHS[0]!;
  const s = w;
  const slabLit = litTone(shade(cloth.a, 16), 0.1);
  const slabLitB = litTone(shade(cloth.b, 8), 0.1);
  if (shape === 'board') {
    const slat = litTone(shade(skin.log, -16));
    const slat2 = litTone(shade(skin.log2, -8));
    for (let c = 0; c < 4; c++) {
      const y0 = (h * c) / 4;
      ctx.fillStyle = c % 2 === 0 ? slat : slat2;
      ctx.fillRect(0, y0, w, h / 4);
      ctx.fillStyle = 'rgba(24, 15, 6, 0.38)';
      ctx.fillRect(0, y0 + h / 4 - s * 0.022, w, s * 0.022);
      ctx.fillStyle = 'rgba(255, 226, 175, 0.18)';
      ctx.fillRect(0, y0, w, s * 0.02);
    }
    ctx.fillStyle = 'rgba(255, 236, 200, 0.14)';
    ctx.fillRect(0, 0, w, h * 0.4);
    return;
  }
  ctx.fillStyle = slabLit;
  ctx.fillRect(0, 0, w, h);
  if (shape === 'market') {
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = (k & 1) === 0 ? slabLit : slabLitB;
      ctx.fillRect((w * k) / 4, 0, w / 4 + 0.5, h);
    }
  } else if (shape === 'bowed') {
    ctx.fillStyle = 'rgba(20, 14, 28, 0.18)';
    ctx.fillRect(0, 0, w, h * 0.24);
    ctx.strokeStyle = 'rgba(255, 246, 224, 0.22)';
    ctx.lineWidth = h * 0.3;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.46);
    ctx.quadraticCurveTo(w / 2, h * 0.32, w, h * 0.46);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(20, 14, 28, 0.14)';
    ctx.lineWidth = Math.max(1, s * 0.026);
    for (let k = 1; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo((w * k) / 3, 0);
      ctx.lineTo((w * k) / 3, h);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = shade(cloth.a, -6);
    for (let k = 0; k < 4; k++) ctx.fillRect(w * (0.12 + k * 0.25) - s * 0.02, 0, s * 0.04, s * 0.055);
    ctx.strokeStyle = 'rgba(20, 14, 28, 0.1)';
    ctx.lineWidth = Math.max(1, s * 0.024);
    for (let k = 1; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo((w * k) / 3, 0);
      ctx.lineTo((w * k) / 3, h);
      ctx.stroke();
    }
  }
  // The tuck at the wall, the sunlit arris over the rail.
  ctx.fillStyle = 'rgba(20, 14, 28, 0.16)';
  ctx.fillRect(0, 0, w, s * 0.09);
  ctx.fillStyle = 'rgba(255, 246, 224, 0.28)';
  ctx.fillRect(0, h - s * 0.045, w, s * 0.045);
}

/** The underside of the slab: the unlit dye, darker toward the wall. */
export function paintAwningUnder(ctx: CanvasRenderingContext2D, w: number, h: number, shape: AwningShape, dye: number, skin: WoodSkin): void {
  const cloth = AWNING_CLOTHS[dye] ?? AWNING_CLOTHS[0]!;
  ctx.fillStyle = shape === 'board' ? shade(skin.log, -26) : shade(cloth.a, -18);
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(18, 12, 26, 0.35)');
  g.addColorStop(1, 'rgba(18, 12, 26, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/**
 * THE SKIRT (renderer.ts :19160-19230), plumb under the rail as an
 * alpha-cut card: market = four half-round scallops in a/b, shed = a
 * folded drop with the sewn thread, bowed = one bow, board = the wood
 * fascia. Painted top-down (y = 0 at the rail).
 */
export function paintAwningSkirt(ctx: CanvasRenderingContext2D, w: number, h: number, shape: AwningShape, dye: number, skin: WoodSkin): void {
  const cloth = AWNING_CLOTHS[dye] ?? AWNING_CLOTHS[0]!;
  const s = w;
  const a = litTone(cloth.a, 0.08);
  const b = litTone(cloth.b, 0.08);
  ctx.clearRect(0, 0, w, h);
  const railH = s * 0.015;
  if (shape === 'board') {
    ctx.fillStyle = litTone(cloth.a, 0.08);
    ctx.fillRect(0, 0, w, s * 0.12);
    ctx.fillStyle = shade(cloth.a, 18);
    ctx.fillRect(0, 0, w, s * 0.026);
    ctx.fillStyle = shade(cloth.a, -26);
    ctx.fillRect(0, s * 0.098, w, s * 0.022);
    return;
  }
  const vTop = railH;
  const vDepth = awningSkirtDepth(shape) * s;
  if (shape === 'market') {
    for (let k = 0; k < 4; k++) {
      const xb = (w * k) / 4;
      const xa = (w * (k + 1)) / 4;
      const cxk = (xa + xb) / 2;
      const rk = (xa - xb) / 2;
      ctx.fillStyle = (k & 1) === 0 ? a : b;
      ctx.beginPath();
      ctx.moveTo(xa, 0);
      ctx.lineTo(xb, 0);
      ctx.lineTo(xb, vTop);
      ctx.arc(cxk, vTop, rk, Math.PI, 0, true);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(20, 14, 28, 0.18)';
      ctx.beginPath();
      ctx.moveTo(xa, vTop);
      ctx.arc(cxk, vTop, rk * 0.55, 0, Math.PI, false);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 246, 224, 0.32)';
      ctx.lineWidth = Math.max(1, s * 0.032);
      ctx.beginPath();
      ctx.arc(cxk, vTop, rk - s * 0.032, 0.35, Math.PI - 0.35, false);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(20, 14, 28, 0.16)';
    ctx.fillRect(0, 0, w, railH + s * 0.02);
  } else if (shape === 'shed') {
    ctx.fillStyle = a;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    let px2 = w;
    for (let k = 2; k >= 0; k--) {
      const xb = (w * k) / 3;
      const dropK = vDepth + ((k & 1) === 0 ? s * 0.012 : -s * 0.012);
      ctx.lineTo(px2, vTop + dropK);
      ctx.lineTo(xb, vTop + dropK);
      px2 = xb;
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(20, 14, 28, 0.16)';
    ctx.fillRect(0, 0, w, railH + s * 0.02);
    ctx.fillStyle = 'rgba(20, 14, 28, 0.14)';
    for (let k = 0; k < 4; k++) ctx.fillRect(w * (0.11 + k * 0.24), vTop, s * 0.048, vDepth);
    ctx.fillStyle = 'rgba(20, 14, 28, 0.2)';
    ctx.fillRect(0, vTop, w, s * 0.03);
    ctx.fillStyle = b;
    ctx.fillRect(0, vTop + vDepth - s * 0.05, w, s * 0.028);
  } else {
    ctx.fillStyle = a;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w, vTop);
    ctx.quadraticCurveTo(w / 2, vTop + vDepth + s * 0.09, 0, vTop);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(20, 14, 28, 0.16)';
    ctx.fillRect(0, 0, w, railH + s * 0.02);
    ctx.fillStyle = 'rgba(20, 14, 28, 0.2)';
    ctx.fillRect(0, vTop, w, s * 0.03);
    ctx.strokeStyle = b;
    ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.beginPath();
    ctx.moveTo(0, vTop + vDepth * 0.5);
    ctx.quadraticCurveTo(w / 2, vTop + vDepth + s * 0.02, w, vTop + vDepth * 0.5);
    ctx.stroke();
  }
}

// ------------------------------------------------------ the garrison

/** The garrison ashlar face via the amber painter, washed a stop. */
export function paintGarrisonFace(host: StubHost, w: number, hs: number, s: number, tone: FaceToneKind, worldX: number, tilesW: number, seedX: number, seedY: number, loops: boolean): void {
  paintGarrisonMasonry(asPaintHost(host), 0, w, hs, s, worldX, tilesW, seedX, seedY, GARRISON_H, loops);
  host.ctx.save();
  host.ctx.translate(0, -hs);
  lambertWash(host.ctx, w, hs, tone);
  host.ctx.restore();
}

/** The wall-walk flags (garrisonArt.ts:280-300). */
export function paintGarrisonCrown(ctx: CanvasRenderingContext2D, w: number, h: number, seedX: number, seedY: number): void {
  const s = w;
  ctx.fillStyle = litTone(GAR_TOP, CROWN_LIFT);
  ctx.fillRect(0, 0, w, h);
  const hf = hashCoords(457, seedX, seedY);
  ctx.fillStyle = 'rgba(20, 14, 28, 0.16)';
  if ((hf & 3) !== 0) ctx.fillRect(s * (0.2 + (hf % 60) / 100), 0, Math.max(1, s * 0.03), h);
  if ((hf & 4) === 0) ctx.fillRect(0, h * (0.3 + ((hf >>> 6) % 40) / 100), w, Math.max(1, s * 0.028));
}

/** One merlon face: the tooth's outward stone with its contact shade. */
export function paintMerlonFace(ctx: CanvasRenderingContext2D, w: number, h: number, k: number): void {
  ctx.fillStyle = litTone(shade(GAR_FACE, k));
  ctx.fillRect(0, -h, w, h);
  ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
  ctx.fillRect(0, -Math.max(1, h * 0.14), w, Math.max(1, h * 0.14));
}

/** The merlon cap. */
export function paintMerlonTop(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = litTone(GAR_MERLON_TOP, CROWN_LIFT);
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
  ctx.fillRect(0, 0, w, h * 0.24);
  ctx.fillStyle = 'rgba(255, 236, 200, 0.18)';
  ctx.fillRect(0, h - h * 0.18, w, h * 0.18);
}

/**
 * A gate slice of the curtain: ashlar with the pier trim (GAR_TRIM)
 * where the pier stands and the dressed head over the passage.
 */
export function paintGarrisonGateFace(host: StubHost, w: number, hs: number, s: number, tone: FaceToneKind, jambL: boolean, jambR: boolean, pierW: number, headH: number, seedX: number, seedY: number): void {
  const ctx = host.ctx;
  paintGarrisonFace(host, w, hs, s, tone, seedX * 3, 1, seedX, seedY, false);
  const pw = pierW * s;
  const head = -headH * s;
  const trim = litTone(GAR_TRIM);
  const ox0 = jambL ? pw : 0;
  const ox1 = jambR ? w - pw : w;
  ctx.fillStyle = 'rgba(10, 8, 16, 1)';
  ctx.fillRect(ox0, head, ox1 - ox0, -head);
  // The voussoir band and the dressed head.
  ctx.fillStyle = trim;
  ctx.fillRect(ox0 - (jambL ? s * 0.06 : 0), head - s * 0.22, ox1 - ox0 + (jambL ? s * 0.06 : 0) + (jambR ? s * 0.06 : 0), s * 0.22);
  ctx.fillStyle = 'rgba(255, 236, 200, 0.14)';
  ctx.fillRect(ox0, head - s * 0.22, ox1 - ox0, s * 0.04);
  ctx.fillStyle = 'rgba(18, 12, 26, 0.35)';
  ctx.fillRect(ox0, head, ox1 - ox0, s * 0.06);
  if (jambL) {
    ctx.fillStyle = trim;
    ctx.fillRect(0, -hs, pw, hs);
    ctx.fillStyle = shade(trim, 14);
    ctx.fillRect(pw - s * 0.04, -hs * 0.7, s * 0.04, hs * 0.7);
  }
  if (jambR) {
    ctx.fillStyle = trim;
    ctx.fillRect(w - pw, -hs, pw, hs);
    ctx.fillStyle = shade(trim, 14);
    ctx.fillRect(w - pw, -hs * 0.7, s * 0.04, hs * 0.7);
  }
}

// ------------------------------------------------- wall-hung details

/** What a hung-art painter needs to know about its run (pennants/tapestries merge). */
export interface HungRun {
  /** This tile's index in its merged run and the run's length (1/1 for singles). */
  index: number;
  length: number;
}

/**
 * A ClientGame-shaped shim over a synthetic neighbourhood: the hung
 * painters read `game.world.detailAt/groundAt` only along their own
 * row, to find run-mates. Answers the run described by `run` around
 * the synthetic (tx, ty) and wall on every member.
 */
function hungShim(tx: number, ty: number, detail: number, run: HungRun, wallTile: number): ClientGame {
  const x0 = tx - run.index;
  const x1 = x0 + run.length - 1;
  const inRun = (x: number, y: number): boolean => y === ty && x >= x0 && x <= x1;
  return {
    world: {
      detailAt: (x: number, y: number): number => (inRun(x, y) ? detail : 0),
      groundAt: (x: number, y: number): number | undefined => (inRun(x, y) ? wallTile : undefined),
      elevAt: (): number => 0,
    },
  } as unknown as ClientGame;
}

/** The royal swallowtail (wallHangings' default branch), re-emitted at rest. */
function royalBannerOnFace(ctx: CanvasRenderingContext2D, s: number, moon: boolean, garrison: boolean): void {
  const cloth = moon ? '#54689c' : '#7a2430';
  const metal = moon ? '#b4c0d2' : '#c9962e';
  const cx = s * 0.5;
  const rodY = -s * (garrison ? 2.75 : 1.78);
  const bw = s * (garrison ? 0.56 : 0.5);
  const bl = s * (garrison ? 1.6 : 1.18);
  const yTop = rodY + s * 0.035;
  const yMid = yTop + bl * 0.66;
  const yBot = yTop + bl;
  ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
  ctx.fillRect(cx - bw / 2 + s * 0.04, yTop + s * 0.05, bw, bl - s * 0.1);
  const path = new Path2D();
  path.moveTo(cx - bw / 2, yTop);
  path.lineTo(cx + bw / 2, yTop);
  path.lineTo(cx + bw / 2, yMid);
  path.lineTo(cx + bw / 2, yBot);
  path.lineTo(cx, yBot - s * 0.18);
  path.lineTo(cx - bw / 2, yBot);
  path.lineTo(cx - bw / 2, yMid);
  path.closePath();
  ctx.fillStyle = cloth;
  ctx.fill(path);
  ctx.save();
  ctx.clip(path);
  ctx.fillStyle = shade(cloth, 14);
  ctx.fillRect(cx - bw / 2, yTop, bw, s * 0.07);
  ctx.fillStyle = metal;
  ctx.fillRect(cx - bw / 2, yTop + s * 0.07, bw, s * 0.022);
  // The sigil: a crown of three points, or the moon's disc.
  ctx.fillStyle = metal;
  if (moon) {
    ctx.beginPath();
    ctx.arc(cx, yTop + bl * 0.42, bw * 0.22, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const cy = yTop + bl * 0.42;
    ctx.beginPath();
    ctx.moveTo(cx - bw * 0.26, cy + bw * 0.14);
    ctx.lineTo(cx - bw * 0.26, cy - bw * 0.14);
    ctx.lineTo(cx - bw * 0.13, cy);
    ctx.lineTo(cx, cy - bw * 0.22);
    ctx.lineTo(cx + bw * 0.13, cy);
    ctx.lineTo(cx + bw * 0.26, cy - bw * 0.14);
    ctx.lineTo(cx + bw * 0.26, cy + bw * 0.14);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#3a3140';
  ctx.fillRect(cx - bw / 2 - s * 0.08, rodY - s * 0.02, bw + s * 0.16, s * 0.04);
}

/**
 * Paint the wall-hung detail on the face under the stub host — the
 * wallHangings dispatch (wallHungArt.ts:25) with the tapestry's
 * ClientGame reads answered by a shim. Must be called in the face
 * frame with the host aimed at the tile; `s` is px per tile.
 */
export function paintHungDetail(host: StubHost, info: WallHungInfo, detail: number, s: number, garrison: boolean, run: HungRun, wallTile: number): void {
  const rend = asPaintHost(host);
  // Synthetic coords: the painters hash by (tx, ty) for character.
  const tx = 40 + run.index;
  const ty = 30;
  const ctx = host.ctx;
  switch (info.kind) {
    case 'tapestry': {
      // tapestryOnFace reads rend.wallish/garrisonish over the game:
      // the run shim answers its row, nothing stands south of it.
      const shim = hungShim(tx, ty, detail, run, wallTile);
      const ext = host as StubHost & { wallish?: (g: ClientGame, x: number, y: number) => boolean; garrisonish?: (g: ClientGame, x: number, y: number) => boolean };
      const hadW = ext.wallish;
      const hadG = ext.garrisonish;
      ext.wallish = (_g, x, y) => y === ty && x >= tx - run.index && x < tx - run.index + run.length;
      ext.garrisonish = ext.wallish;
      wallHungArt.tapestryOnFace(rend, shim, tx, ty, 0, s, garrison);
      ext.wallish = hadW;
      ext.garrisonish = hadG;
      return;
    }
    case 'banner':
      wallHungArt.playerBannerOnFace(rend, tx, ty, 0, s, info.dye ?? 0);
      return;
    case 'pennant':
      wallHungArt.pennantOnFace(rend, hungShim(tx, ty, detail, run, wallTile), tx, ty, 0, s, info.dye ?? 0);
      return;
    case 'sign':
      wallHungArt.bracketSignOnFace(rend, tx, ty, 0, s, info.motif ?? 0);
      return;
    case 'trellis':
      wallHungArt.trellisOnFace(rend, tx, ty, 0, s, info.species ?? 0);
      return;
    case 'basket':
      wallHungArt.wallBasketOnFace(rend, tx, ty, 0, s);
      return;
    case 'bundles':
      wallHungArt.herbBundlesOnFace(rend, tx, ty, 0, s, info.mix ?? 0);
      return;
    case 'arms':
      wallHungArt.wallArmsOnFace(rend, tx, ty, 0, s, info.form ?? 0, garrison);
      return;
    case 'greatbanner':
      wallHungArt.greatBannerOnFace(rend, tx, ty, 0, s, info.dye ?? 0, garrison);
      return;
    case 'drape':
      wallHungArt.drapeFallOnFace(rend, tx, ty, 0, s, info.dye ?? 0, garrison);
      return;
    case 'sill':
      return;
    default:
      royalBannerOnFace(ctx, s, detail === Detail.BannerMoon, garrison);
  }
}

/** THE HERBALIST'S SILL (wallHungArt sillHerbsOnSill) on a window face, under the aimed host. */
export function paintHungSill(host: StubHost, wx: number, wxE: number, sillY: number, s: number, mix: number): void {
  wallHungArt.sillHerbsOnSill(asPaintHost(host), 41, 30, wx, wxE, sillY, s, mix);
}

/** The garrison leaf tone (paintVocab GAR_LEAF) and a house leaf's. */
export function leafTone(mat: WallMaterial | 'garrison', skin: WoodSkin): string {
  if (mat === 'garrison') return litTone(GAR_LEAF);
  return litTone(mat === 'wood' ? shade(skin.log, -8) : '#6a4a26');
}
