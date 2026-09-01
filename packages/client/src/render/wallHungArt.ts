/**
 * THE WALL WEARS ITS KEEPING — the sixteen wall-hung painters: banners,
 * arms, drapes, pennants, signs, trellises, baskets, sill herbs, tapestries.
 * Moved verbatim off the Renderer class (foundations F2 wave A); the
 * painters reach the engine through the shared PaintHost slice.
 */
import { ClientGame } from '../game/clientGame.js';
import { AWNING_CLOTHS, HRB_MOON, HRB_MOON_DEEP, HRB_SAGE, HRB_SAGE_DEEP, HRB_SOIL_WET, PANEL_DOOR_TILES, STRUCT_OUTLINE, TRD_HERB, TRD_HERB_DRY, TRD_STEEL, TRD_STEEL_LIT, TWN_IRON, TWN_OAK, TWN_OAK_DARK, TWN_ROPE, WALL_TILES } from './paintVocab.js';
import { shade } from './tint.js';
import { facetCircle } from './shapes.js';
import { BANNER_EMBLEM_COUNT, Detail, hashCoords, wallHungInfo } from '@arx/shared';
import type { PaintHost } from './paintHost.js';

/**
 * THE HANGING LAW — wall-hung cloth. Detail.BannerCrown, BannerMoon,
 * and Tapestry are authored ON a wall tile and painted by that
 * wall's own face pass, inside the face frame: the cloth leans,
 * sinks, and sorts with the masonry it hangs from, and like glazing
 * it sheds when the reveal eases the wall below hanging height — a
 * sinking wall drops its rod before the crown could swallow it. The
 * ground bake draws nothing for these details (WALL_HUNG_DETAILS).
 * Coordinates are face-local: x in screen px, y rising NEGATIVE
 * from 0 at the wall's south base.
 */
export function wallHangings(rend: PaintHost, 
  game: ClientGame,
  tx: number,
  ty: number,
  px0: number,
  s: number,
  whT: number,
  garrison: boolean,
): void {
  const d = game.world.detailAt(tx, ty);
  const info = wallHungInfo(d);
  if (!info) return;
  if (whT < (garrison ? 2.7 : 1.9)) return;
  // THE WALL TAKES A HANGING: the player families dispatch to their
  // own painters; the authored royals keep the code below.
  switch (info.kind) {
    case 'tapestry':
      tapestryOnFace(rend, game, tx, ty, px0, s, garrison);
      return;
    case 'banner':
      playerBannerOnFace(rend, tx, ty, px0, s, info.dye ?? 0);
      return;
    case 'pennant':
      pennantOnFace(rend, game, tx, ty, px0, s, info.dye ?? 0);
      return;
    case 'sign':
      bracketSignOnFace(rend, tx, ty, px0, s, info.motif ?? 0);
      return;
    case 'trellis':
      trellisOnFace(rend, tx, ty, px0, s, info.species ?? 0);
      return;
    case 'basket':
      wallBasketOnFace(rend, tx, ty, px0, s);
      return;
    case 'bundles':
      herbBundlesOnFace(rend, tx, ty, px0, s, info.mix ?? 0);
      return;
    // THE KNIGHT'S KEEPING: the armory wall's three families.
    case 'arms':
      wallArmsOnFace(rend, tx, ty, px0, s, info.form ?? 0, garrison);
      return;
    case 'greatbanner':
      greatBannerOnFace(rend, tx, ty, px0, s, info.dye ?? 0, garrison);
      return;
    case 'drape':
      drapeFallOnFace(rend, tx, ty, px0, s, info.dye ?? 0, garrison);
      return;
    case 'sill':
      // The sill pots never route here: their host gate keeps them
      // on glazed walls, and the window stack paints them itself
      // (after the glass, so they stand proud of the pane).
      return;
    default:
      break; // crown/moon fall through to the royal banner below
  }
  const ctx = rend.ctx;
  // ---- The hanging banner: the house sigil on a swallowtail drop.
  // The hoist hangs true; the tails trail a beat behind the breath
  // of air off the hall floor, so the cloth ripples instead of
  // stiffly tilting (the BannerPole's two-beat law).
  const moon = d === Detail.BannerMoon;
  const cloth = moon ? '#54689c' : '#7a2430';
  const metal = moon ? '#b4c0d2' : '#c9962e';
  const cx = px0 + s * 0.5;
  const rodY = -s * (garrison ? 2.75 : 1.78);
  const bw = s * (garrison ? 0.56 : 0.5);
  const bl = s * (garrison ? 1.6 : 1.18);
  const t = performance.now() / 1000;
  const ph = tx * 1.7 + ty * 0.9;
  const { sway, lag } = rend.breezeAt(tx, ty, t, ph, s, 0.02, 0.03);
  const yTop = rodY + s * 0.035;
  const yMid = yTop + bl * 0.66;
  const yBot = yTop + bl;
  // The cloth stands a breath proud of the face — its own shadow
  // seats it on the masonry.
  ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
  ctx.fillRect(cx - bw / 2 + s * 0.04, yTop + s * 0.05, bw, bl - s * 0.1);
  const path = new Path2D();
  path.moveTo(cx - bw / 2, yTop);
  path.lineTo(cx + bw / 2, yTop);
  path.lineTo(cx + bw / 2 + sway, yMid);
  path.lineTo(cx + bw / 2 + lag, yBot);
  path.lineTo(cx + lag, yBot - s * 0.18);
  path.lineTo(cx - bw / 2 + lag, yBot);
  path.lineTo(cx - bw / 2 + sway, yMid);
  path.closePath();
  ctx.fillStyle = cloth;
  ctx.fill(path);
  // Everything ON the cloth clips to the cloth.
  ctx.save();
  ctx.clip(path);
  // Header band under the rod, struck with a metal thread.
  ctx.fillStyle = shade(cloth, 14);
  ctx.fillRect(cx - bw / 2, yTop, bw, s * 0.07);
  ctx.fillStyle = metal;
  ctx.fillRect(cx - bw / 2, yTop + s * 0.07, bw, s * 0.022);
  // Side trims falling the drop.
  ctx.fillRect(cx - bw / 2 + s * 0.035, yTop + s * 0.1, s * 0.02, bl);
  ctx.fillRect(cx + bw / 2 - s * 0.055, yTop + s * 0.1, s * 0.02, bl);
  // Fold shading: the cloth is hung, not printed.
  ctx.fillStyle = 'rgba(18, 12, 26, 0.14)';
  ctx.fillRect(cx - bw * 0.2, yTop + s * 0.1, s * 0.045, bl * 0.78);
  ctx.fillRect(cx + bw * 0.13, yTop + s * 0.1, s * 0.045, bl * 0.72);
  // THE SIGIL, at the hoist's heart — the throne's own crown
  // geometry, woven in the house metal.
  const sy2 = yTop + bl * 0.34;
  const w2 = bw * 0.62;
  const h2 = w2 * 0.5;
  ctx.fillStyle = metal;
  if (moon) {
    // The Queen's swept arch, the moonpale drop beneath its crest.
    ctx.beginPath();
    ctx.moveTo(cx - h2, sy2 + h2 * 0.42);
    ctx.quadraticCurveTo(cx, sy2 - h2 * 0.75, cx + h2, sy2 + h2 * 0.42);
    ctx.lineTo(cx + h2, sy2 + h2 * 0.6);
    ctx.quadraticCurveTo(cx, sy2 - h2 * 0.45, cx - h2, sy2 + h2 * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#cfe0f0';
    ctx.beginPath();
    ctx.moveTo(cx, sy2 - h2 * 0.05);
    ctx.quadraticCurveTo(cx + h2 * 0.24, sy2 + h2 * 0.5, cx, sy2 + h2 * 0.82);
    ctx.quadraticCurveTo(cx - h2 * 0.24, sy2 + h2 * 0.5, cx, sy2 - h2 * 0.05);
    ctx.fill();
  } else {
    // The King's three gilded peaks over their band.
    ctx.beginPath();
    ctx.moveTo(cx - h2, sy2 + h2 * 0.31);
    ctx.lineTo(cx - h2 * 0.68, sy2 - h2 * 0.07);
    ctx.lineTo(cx - h2 * 0.4, sy2 + h2 * 0.17);
    ctx.lineTo(cx, sy2 - h2 * 0.55);
    ctx.lineTo(cx + h2 * 0.4, sy2 + h2 * 0.17);
    ctx.lineTo(cx + h2 * 0.68, sy2 - h2 * 0.07);
    ctx.lineTo(cx + h2, sy2 + h2 * 0.31);
    ctx.lineTo(cx + h2, sy2 + h2 * 0.62);
    ctx.lineTo(cx - h2, sy2 + h2 * 0.62);
    ctx.closePath();
    ctx.fill();
    // The house stone at the band, and a struck fillet.
    ctx.fillStyle = shade(metal, 16);
    ctx.fillRect(cx - h2 * 0.92, sy2 + h2 * 0.34, h2 * 1.84, h2 * 0.07);
    ctx.fillStyle = '#7a2430';
    ctx.beginPath();
    ctx.moveTo(cx, sy2 + h2 * 0.38);
    ctx.lineTo(cx + h2 * 0.11, sy2 + h2 * 0.49);
    ctx.lineTo(cx, sy2 + h2 * 0.6);
    ctx.lineTo(cx - h2 * 0.11, sy2 + h2 * 0.49);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(cx - h2 * 0.05, sy2 - h2 * 0.4, h2 * 0.1, h2 * 0.1);
  }
  // Hem thread tracing the swallowtail.
  ctx.strokeStyle = metal;
  ctx.lineWidth = Math.max(1, s * 0.022);
  ctx.beginPath();
  ctx.moveTo(cx - bw / 2 + lag + s * 0.015, yBot - s * 0.05);
  ctx.lineTo(cx + lag, yBot - s * 0.225);
  ctx.lineTo(cx + bw / 2 + lag - s * 0.015, yBot - s * 0.05);
  ctx.stroke();
  ctx.restore();
  // THE HOUSE OUTLINE around the silhouette — at the architecture
  // ring weight (THE RING IS ONE): the royal cloth hangs on the
  // same masonry as the crenellations and must not read lighter.
  rend.beginStructOutline();
  ctx.stroke(path);
  // The iron rod over everything, gold-capped, strapped to the wall.
  ctx.fillStyle = '#454052';
  ctx.fillRect(cx - bw / 2 - s * 0.015, rodY - s * 0.06, s * 0.04, s * 0.045);
  ctx.fillRect(cx + bw / 2 - s * 0.025, rodY - s * 0.06, s * 0.04, s * 0.045);
  ctx.fillStyle = '#2c2836';
  ctx.fillRect(cx - bw / 2 - s * 0.08, rodY - s * 0.022, bw + s * 0.16, s * 0.05);
  // Hoist tabs looping the rod.
  ctx.fillStyle = shade(cloth, -8);
  for (const fx of [-bw * 0.38, 0, bw * 0.38])
    ctx.fillRect(cx + fx - s * 0.034, rodY - s * 0.048, s * 0.068, s * 0.115);
  ctx.fillStyle = metal;
  ctx.beginPath();
  facetCircle(ctx, cx - bw / 2 - s * 0.095, rodY, s * 0.042, 6, 0.3);
  ctx.fill();
  ctx.beginPath();
  facetCircle(ctx, cx + bw / 2 + s * 0.095, rodY, s * 0.042, 6, 0.3);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillRect(cx - bw / 2 - s * 0.108, rodY - s * 0.016, s * 0.015, s * 0.015);
  ctx.fillRect(cx + bw / 2 + s * 0.082, rodY - s * 0.016, s * 0.015, s * 0.015);
}

/**
 * THE WALL TAKES A HANGING — the player's banner: the royal
 * swallowtail grammar in the ten common dyes, a woven diamond
 * where the crown would sit. Two-beat cloth (hoist sways, tails
 * trail), its own shadow seating it on the masonry.
 */
export function playerBannerOnFace(rend: PaintHost, tx: number, ty: number, px0: number, s: number, dye: number): void {
  const ctx = rend.ctx;
  const cloth = AWNING_CLOTHS[dye]!.a;
  const trim = AWNING_CLOTHS[dye]!.b;
  const cx = px0 + s * 0.5;
  const rodY = -s * 1.75;
  const bw = s * 0.46;
  const bl = s * 1.05;
  const t = performance.now() / 1000;
  const ph = tx * 1.7 + ty * 0.9;
  const { sway, lag } = rend.breezeAt(tx, ty, t, ph, s, 0.02, 0.03);
  const yTop = rodY + s * 0.035;
  const yMid = yTop + bl * 0.66;
  const yBot = yTop + bl;
  ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
  ctx.fillRect(cx - bw / 2 + s * 0.04, yTop + s * 0.05, bw, bl - s * 0.1);
  const path = new Path2D();
  path.moveTo(cx - bw / 2, yTop);
  path.lineTo(cx + bw / 2, yTop);
  path.lineTo(cx + bw / 2 + sway, yMid);
  path.lineTo(cx + bw / 2 + lag, yBot);
  path.lineTo(cx + lag, yBot - s * 0.16);
  path.lineTo(cx - bw / 2 + lag, yBot);
  path.lineTo(cx - bw / 2 + sway, yMid);
  path.closePath();
  ctx.fillStyle = cloth;
  ctx.fill(path);
  ctx.save();
  ctx.clip(path);
  // Header band + trim thread; folds so the cloth hangs, not prints.
  ctx.fillStyle = shade(cloth, 14);
  ctx.fillRect(cx - bw / 2, yTop, bw, s * 0.06);
  ctx.fillStyle = trim;
  ctx.fillRect(cx - bw / 2, yTop + s * 0.06, bw, s * 0.02);
  ctx.fillStyle = 'rgba(18, 12, 26, 0.14)';
  ctx.fillRect(cx - bw * 0.2, yTop + s * 0.09, s * 0.04, bl * 0.76);
  ctx.fillRect(cx + bw * 0.14, yTop + s * 0.09, s * 0.04, bl * 0.7);
  // The woven diamond at the hoist's heart, trim on cloth.
  const dy2 = yTop + bl * 0.36;
  const r2 = bw * 0.26;
  ctx.fillStyle = trim;
  ctx.beginPath();
  ctx.moveTo(cx, dy2 - r2);
  ctx.lineTo(cx + r2 * 0.72, dy2);
  ctx.lineTo(cx, dy2 + r2);
  ctx.lineTo(cx - r2 * 0.72, dy2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = cloth;
  ctx.beginPath();
  ctx.moveTo(cx, dy2 - r2 * 0.45);
  ctx.lineTo(cx + r2 * 0.32, dy2);
  ctx.lineTo(cx, dy2 + r2 * 0.45);
  ctx.lineTo(cx - r2 * 0.32, dy2);
  ctx.closePath();
  ctx.fill();
  // Hem thread tracing the swallowtail.
  ctx.strokeStyle = trim;
  ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.beginPath();
  ctx.moveTo(cx - bw / 2 + lag + s * 0.015, yBot - s * 0.045);
  ctx.lineTo(cx + lag, yBot - s * 0.2);
  ctx.lineTo(cx + bw / 2 + lag - s * 0.015, yBot - s * 0.045);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = STRUCT_OUTLINE;
  ctx.lineWidth = Math.max(1, s * 0.028);
  ctx.stroke(path);
  // The iron rod, strapped to the wall, plain caps for plain folk.
  ctx.fillStyle = '#2c2836';
  ctx.fillRect(cx - bw / 2 - s * 0.07, rodY - s * 0.022, bw + s * 0.14, s * 0.045);
  ctx.fillStyle = shade(cloth, -8);
  for (const fx of [-bw * 0.36, 0, bw * 0.36])
    ctx.fillRect(cx + fx - s * 0.03, rodY - s * 0.045, s * 0.06, s * 0.1);
  ctx.fillStyle = '#454052';
  ctx.fillRect(cx - bw / 2 - s * 0.09, rodY - s * 0.035, s * 0.032, s * 0.07);
  ctx.fillRect(cx + bw / 2 + s * 0.058, rodY - s * 0.035, s * 0.032, s * 0.07);
}

/**
 * The woven charge at a great cloth's heart, drawn in the house
 * metal. Features stay at or above the chest-law minimum — bold
 * marks the avenue reads, never embroidery only a zoom sees.
 */
export function paintBannerEmblem(rend: PaintHost, cx: number, cy: number, w: number, metal: string, emblem: number): void {
  const ctx = rend.ctx;
  ctx.fillStyle = metal;
  if (emblem === 0) {
    // THE TOWER: a crenellated keep, base-flared, door struck dark.
    const bw = w * 0.52;
    const bh = w * 0.6;
    ctx.fillRect(cx - bw / 2, cy - bh * 0.42, bw, bh * 0.84);
    ctx.fillRect(cx - bw * 0.68, cy + bh * 0.28, bw * 1.36, bh * 0.16);
    for (const fx of [-1, 0, 1] as const) {
      ctx.fillRect(cx + fx * bw * 0.36 - bw * 0.13, cy - bh * 0.62, bw * 0.26, bh * 0.22);
    }
    ctx.fillStyle = 'rgba(18, 12, 26, 0.5)';
    ctx.beginPath();
    ctx.moveTo(cx - bw * 0.14, cy + bh * 0.44);
    ctx.lineTo(cx - bw * 0.14, cy + bh * 0.1);
    ctx.quadraticCurveTo(cx, cy - bh * 0.08, cx + bw * 0.14, cy + bh * 0.1);
    ctx.lineTo(cx + bw * 0.14, cy + bh * 0.44);
    ctx.closePath();
    ctx.fill();
  } else if (emblem === 1) {
    // CROSSED SWORDS: two blades saltire, points up-out, guards
    // and pommels below — the garrison's own signature.
    for (const sd of [-1, 1] as const) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(sd * 0.66);
      ctx.fillStyle = metal;
      ctx.beginPath();
      ctx.moveTo(-w * 0.045, w * 0.34);
      ctx.lineTo(-w * 0.045, -w * 0.26);
      ctx.lineTo(0, -w * 0.4);
      ctx.lineTo(w * 0.045, -w * 0.26);
      ctx.lineTo(w * 0.045, w * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-w * 0.13, w * 0.16, w * 0.26, w * 0.06);
      ctx.beginPath();
      facetCircle(ctx, 0, w * 0.42, w * 0.05, 6, 0.3);
      ctx.fill();
      ctx.restore();
    }
  } else if (emblem === 2) {
    // THE CHEVRON: two bold rafters stacked — the builder-house.
    for (const off of [0, w * 0.3] as const) {
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.42, cy + w * 0.11 + off);
      ctx.lineTo(cx, cy - w * 0.33 + off);
      ctx.lineTo(cx + w * 0.42, cy + w * 0.11 + off);
      ctx.lineTo(cx + w * 0.42, cy + w * 0.27 + off);
      ctx.lineTo(cx, cy - w * 0.17 + off);
      ctx.lineTo(cx - w * 0.42, cy + w * 0.27 + off);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    // THE RAYED SUN: a faceted disc throwing eight short rays.
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a - 0.16) * w * 0.24, cy + Math.sin(a - 0.16) * w * 0.24);
      ctx.lineTo(cx + Math.cos(a) * w * 0.44, cy + Math.sin(a) * w * 0.44);
      ctx.lineTo(cx + Math.cos(a + 0.16) * w * 0.24, cy + Math.sin(a + 0.16) * w * 0.24);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    facetCircle(ctx, cx, cy, w * 0.22, 8, 0.25);
    ctx.fill();
  }
}

/**
 * THE GREAT CLOTH — the castle drop shared by the wall's
 * GreatBanner and the standing BannerStand (one cooper: never fork
 * the dialect). A square-bodied drop with a CRENELLATED hem — two
 * square notches biting up between three teeth, the castle-pillar
 * cut; the swallowtail stays the royals' and the street's. TRUE
 * SEWN BORDER law: the border is a trim-colored fill of the full
 * silhouette with the dye field inset, never a stroked line.
 * THE COLOR IS THE HOUSE: the woven charge follows the DYE (dye %
 * BANNER_EMBLEM_COUNT) — never a position hash, whose grid seams
 * once flew two different houses on one authored gatefront. Choose
 * the cloth, choose the charge; a matched pair can never argue.
 * Returns the outer path for the caller's ink.
 */
export function paintGreatCloth(rend: PaintHost, 
  cx: number,
  yTop: number,
  bw: number,
  bl: number,
  dye: number,
  s: number,
  sway: number,
  lag: number,
): Path2D {
  const ctx = rend.ctx;
  // THE GREAT CLOTH IS DYED DEEP (user color pass): monumental wool
  // drinks the vat one register past street canvas, so a madder
  // great banner sits between the town's madder and the royal
  // crimson instead of clashing coral against it — one red family,
  // three depths: street dye > castle deep > royal.
  const cloth = shade(AWNING_CLOTHS[dye]!.a, -14);
  const trim = AWNING_CLOTHS[dye]!.b;
  // Cool dyes fly silver thread; warm dyes fly gold — one rule, so
  // a house's metal never argues with its field.
  const metal = dye === 2 || dye === 4 || dye === 7 || dye === 8 ? '#b4c0d2' : '#c9962e';
  const buildDrop = (inset: number): Path2D => {
    const xL = cx - bw / 2 + inset;
    const xR = cx + bw / 2 - inset;
    const yT = yTop + inset;
    const yHem = yTop + bl - inset;
    const yMid = yT + (yHem - yT) * 0.6;
    const tw = bw * 0.24 - inset * 0.5;
    const nd = bl * 0.13;
    const p = new Path2D();
    p.moveTo(xL, yT);
    p.lineTo(xR, yT);
    p.lineTo(xR + sway, yMid);
    // East tooth, the step up, the center tooth, the step, west
    // tooth — the hem walks a battlement, teeth trailing the beat.
    p.lineTo(xR + lag, yHem);
    p.lineTo(xR - tw + lag, yHem);
    p.lineTo(xR - tw + lag * 0.8, yHem - nd);
    p.lineTo(cx + tw / 2 + lag * 0.8, yHem - nd);
    p.lineTo(cx + tw / 2 + lag * 1.1, yHem);
    p.lineTo(cx - tw / 2 + lag * 1.1, yHem);
    p.lineTo(cx - tw / 2 + lag * 0.8, yHem - nd);
    p.lineTo(xL + tw + lag * 0.8, yHem - nd);
    p.lineTo(xL + tw + lag, yHem);
    p.lineTo(xL + lag, yHem);
    p.lineTo(xL + sway, yMid);
    p.closePath();
    return p;
  };
  const outer = buildDrop(0);
  ctx.fillStyle = trim;
  ctx.fill(outer);
  const field = buildDrop(s * 0.05);
  ctx.fillStyle = cloth;
  ctx.fill(field);
  // Everything woven ON the cloth clips to the field.
  ctx.save();
  ctx.clip(field);
  // Header band under the rod, struck with the house metal.
  ctx.fillStyle = shade(cloth, 14);
  ctx.fillRect(cx - bw / 2, yTop, bw, s * 0.08);
  ctx.fillStyle = metal;
  ctx.fillRect(cx - bw / 2, yTop + s * 0.08, bw, s * 0.024);
  // Fold shading — hung cloth, never a printed card.
  ctx.fillStyle = 'rgba(18, 12, 26, 0.13)';
  ctx.fillRect(cx - bw * 0.24, yTop + s * 0.12, s * 0.05, bl * 0.8);
  ctx.fillRect(cx + bw * 0.1, yTop + s * 0.12, s * 0.05, bl * 0.74);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fillRect(cx - bw * 0.06, yTop + s * 0.12, s * 0.06, bl * 0.82);
  // THE CHARGE at the drop's heart — the dye's own house.
  paintBannerEmblem(rend, cx, yTop + bl * 0.42, bw * 0.6, metal, dye % BANNER_EMBLEM_COUNT);
  ctx.restore();
  return outer;
}

/**
 * THE WALL TAKES THE STEEL — mounted arms on the armory face.
 * Steel is STILL: nothing here samples the breeze but the great
 * crest's mantling ribbons — a mounted sword that swayed would
 * read as hanging by a thread. Every piece throws a soft SE ghost
 * on the masonry (the WeaponRack's iron-off-the-wood law), wears
 * one west light, and rings its own exposed silhouette; lapped
 * steel inks under the piece that laps it (the woodpile law
 * brought to the wall).
 */
export function wallArmsOnFace(rend: PaintHost, 
  tx: number,
  ty: number,
  px0: number,
  s: number,
  form: number,
  garrison: boolean,
): void {
  const ctx = rend.ctx;
  const cx = px0 + s * 0.5;
  const K = garrison ? 1.15 : 1;
  const my = -s * (garrison ? 1.95 : 1.32);
  const ghost = (p: Path2D): void => {
    ctx.save();
    ctx.translate(s * 0.035, s * 0.05);
    ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
    ctx.fill(p);
    ctx.restore();
  };
  // THE RING IS ONE: mounted steel wears the architecture ring —
  // the same weight the prop pass gives a WeaponRack, so a shield
  // on the wall never reads lighter-lined than the case beside it.
  const ink = (p: Path2D): void => {
    rend.beginStructOutline();
    ctx.stroke(p);
  };
  // The iron wall peg every form hangs from — a forged nub with a
  // struck plate, drawn where each form asks for it.
  const peg = (x: number, y: number): void => {
    ctx.fillStyle = '#2c2836';
    ctx.fillRect(x - s * 0.03, y - s * 0.02, s * 0.06, s * 0.05);
    ctx.fillStyle = TWN_IRON;
    ctx.fillRect(x - s * 0.018, y - s * 0.034, s * 0.036, s * 0.03);
  };
  // A hung longsword blade, built once for forms 0 and 3: a
  // tapered quad running (ang) from the guard point, tip last.
  const swordPath = (x: number, y: number, len: number, ang: number, halfW = s * 0.045): Path2D => {
    const p = new Path2D();
    const c = Math.cos(ang);
    const n = Math.sin(ang);
    const bw2 = halfW;
    const tipX = x + c * len;
    const tipY = y + n * len;
    p.moveTo(x - n * bw2, y + c * bw2);
    p.lineTo(x + n * bw2, y - c * bw2);
    p.lineTo(tipX + n * bw2 * 0.3 - c * len * 0.08, tipY - c * bw2 * 0.3 - n * len * 0.08);
    p.lineTo(tipX, tipY);
    p.lineTo(tipX - n * bw2 * 0.3 - c * len * 0.08, tipY + c * bw2 * 0.3 - n * len * 0.08);
    p.closePath();
    return p;
  };
  // THE STEEL SEATS ON THE WOOD: a tight under-shadow where a piece
  // rests on the board — nearer than the wall ghost, so the stack
  // (steel over oak over masonry) reads in two honest depths.
  const seat = (p: Path2D): void => {
    ctx.save();
    ctx.translate(s * 0.018, s * 0.026);
    ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
    ctx.fill(p);
    ctx.restore();
  };
  // THE TROPHY BOARD (the museum-audit recut): every mount presents
  // ON a shaped oak backboard — floating steel on bare masonry was
  // the first cut's cheapness. The board throws the composition's
  // ONE wall ghost, wears the west light on its bevel, and pins to
  // the wall with forged pips; the steel above stays the star.
  const board = (bx: number, by: number, bw: number, bh: number, rail = false): void => {
    const p = new Path2D();
    const ch = Math.min(bw, bh) * (rail ? 0.4 : 0.18);
    if (rail) {
      p.moveTo(bx - bw / 2 + ch, by - bh / 2);
      p.lineTo(bx + bw / 2 - ch, by - bh / 2);
      p.lineTo(bx + bw / 2, by);
      p.lineTo(bx + bw / 2 - ch, by + bh / 2);
      p.lineTo(bx - bw / 2 + ch, by + bh / 2);
      p.lineTo(bx - bw / 2, by);
    } else {
      p.moveTo(bx - bw / 2 + ch, by - bh / 2);
      p.lineTo(bx + bw / 2 - ch, by - bh / 2);
      p.lineTo(bx + bw / 2, by - bh / 2 + ch);
      p.lineTo(bx + bw / 2, by + bh * 0.18);
      p.lineTo(bx, by + bh / 2);
      p.lineTo(bx - bw / 2, by + bh * 0.18);
      p.lineTo(bx - bw / 2, by - bh / 2 + ch);
    }
    p.closePath();
    ghost(p);
    ctx.fillStyle = TWN_OAK_DARK;
    ctx.fill(p);
    ctx.save();
    ctx.clip(p);
    ctx.fillStyle = TWN_OAK;
    ctx.fillRect(bx - bw / 2, by - bh / 2, s * 0.045, bh);
    ctx.fillRect(bx - bw / 2, by - bh / 2, bw, s * 0.038);
    ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
    ctx.fillRect(bx - bw * 0.17, by - bh / 2, s * 0.012, bh);
    ctx.fillRect(bx + bw * 0.15, by - bh / 2, s * 0.012, bh);
    ctx.restore();
    ink(p);
    const ppx = bw / 2 - ch * 0.75;
    ctx.fillStyle = TWN_IRON;
    const pips: ReadonlyArray<readonly [number, number]> = rail
      ? [[-ppx, 0], [ppx, 0]]
      : [
          [-ppx, -bh / 2 + ch * 0.75],
          [ppx, -bh / 2 + ch * 0.75],
          [-ppx, bh * 0.12],
          [ppx, bh * 0.12],
        ];
    for (const [fx, fy] of pips) {
      ctx.beginPath();
      facetCircle(ctx, bx + fx, by + fy, s * 0.02, 5, 0.4);
      ctx.fill();
    }
  };

  if (form === 0) {
    // THE PANOPLY — one bold diagonal of steel behind one bold
    // heater, presented on the escutcheon board: the knight's
    // front door. Two masses, one line, nothing else.
    board(cx, my, s * 0.72 * K, s * 0.95 * K);
    const ang = Math.PI * 0.5 + 0.44;
    const sx = cx + s * 0.24 * K;
    const sy = my - s * 0.38 * K;
    const blade = swordPath(sx, sy, s * 1.05 * K, ang, s * 0.056);
    seat(blade);
    ctx.fillStyle = TRD_STEEL;
    ctx.fill(blade);
    ctx.save();
    ctx.clip(blade);
    ctx.fillStyle = TRD_STEEL_LIT;
    ctx.fillRect(sx - s * 0.55, sy - s * 0.15, s * 0.45, s * 1.3 * K);
    ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ang);
    ctx.fillRect(s * 0.06, -s * 0.008, s * 0.72 * K, s * 0.016);
    ctx.restore();
    ctx.restore();
    ink(blade);
    // The hilt above the chief: a WIDE gold cross, a real grip, a
    // disc pommel — the one place jewelry is the point.
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ang);
    ctx.fillStyle = shade('#c9962e', -16);
    ctx.fillRect(-s * 0.03, -s * 0.17, s * 0.06, s * 0.34);
    ctx.fillStyle = '#c9962e';
    ctx.fillRect(-s * 0.03, -s * 0.17, s * 0.06, s * 0.3);
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(-s * 0.2, -s * 0.036, s * 0.17, s * 0.072);
    ctx.restore();
    ctx.fillStyle = '#e0c88a';
    ctx.beginPath();
    facetCircle(ctx, sx - Math.cos(ang) * s * 0.25, sy - Math.sin(ang) * s * 0.25, s * 0.055, 6, 0.3);
    ctx.fill();
    // THE HEATER, grown to command the board: crimson field, one
    // gold chief, one boss. The blade reads past both flanks.
    const shw = s * 0.6 * K;
    const shh = s * 0.7 * K;
    const shy = my + s * 0.05;
    const heater = new Path2D();
    heater.moveTo(cx - shw / 2, shy - shh * 0.5);
    heater.lineTo(cx + shw / 2, shy - shh * 0.5);
    heater.lineTo(cx + shw / 2, shy - shh * 0.08);
    heater.quadraticCurveTo(cx + shw * 0.42, shy + shh * 0.34, cx, shy + shh * 0.5);
    heater.quadraticCurveTo(cx - shw * 0.42, shy + shh * 0.34, cx - shw / 2, shy - shh * 0.08);
    heater.closePath();
    seat(heater);
    ctx.fillStyle = '#7a2430';
    ctx.fill(heater);
    ctx.save();
    ctx.clip(heater);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(cx - shw, shy - shh, shw, shh * 2);
    ctx.fillStyle = '#c9962e';
    ctx.fillRect(cx - shw / 2, shy - shh * 0.5, shw, shh * 0.17);
    ctx.fillStyle = shade('#c9962e', -18);
    ctx.fillRect(cx - shw / 2, shy - shh * 0.33, shw, shh * 0.04);
    ctx.restore();
    ctx.fillStyle = shade('#e0c88a', -14);
    ctx.beginPath();
    facetCircle(ctx, cx + s * 0.008, shy + shh * 0.07, s * 0.062, 6, 0.3);
    ctx.fill();
    ctx.fillStyle = '#e0c88a';
    ctx.beginPath();
    facetCircle(ctx, cx, shy + shh * 0.06, s * 0.055, 6, 0.3);
    ctx.fill();
    ink(heater);
  } else if (form === 1) {
    // CROSSED AXES — two BOLD bearded heads saltire over the board,
    // a forged rosette where the hafts cross. The heads are the
    // read; everything else keeps quiet.
    board(cx, my, s * 0.72 * K, s * 0.95 * K);
    const cy = my + s * 0.06;
    for (const sd of [-1, 1] as const) {
      const ang = -Math.PI / 2 + sd * 0.5;
      const c = Math.cos(ang);
      const n = Math.sin(ang);
      const hx = cx - c * s * 0.46 * K;
      const hy = cy - n * s * 0.46 * K + s * 0.34 * K;
      const len = s * 1.0 * K;
      const hw2 = s * 0.038;
      const haft = new Path2D();
      haft.moveTo(hx - n * hw2, hy + c * hw2);
      haft.lineTo(hx + n * hw2, hy - c * hw2);
      haft.lineTo(hx + c * len + n * hw2 * 0.8, hy + n * len - c * hw2 * 0.8);
      haft.lineTo(hx + c * len - n * hw2 * 0.8, hy + n * len + c * hw2 * 0.8);
      haft.closePath();
      seat(haft);
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.fill(haft);
      ctx.save();
      ctx.clip(haft);
      ctx.fillStyle = TWN_OAK;
      ctx.fillRect(hx - s * 0.55, hy - s * 1.2, s * 0.52, s * 1.7);
      ctx.restore();
      ink(haft);
      // Leather grip band at the butt.
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(ang);
      ctx.fillStyle = '#4a3020';
      ctx.fillRect(s * 0.02, -hw2 - s * 0.006, s * 0.14, hw2 * 2 + s * 0.012);
      ctx.restore();
      // THE HEAD: one big bearded crescent, edge-out, its bevel
      // bright — an axe you can name from across the hall.
      const tx2 = hx + c * len;
      const ty2 = hy + n * len;
      const head = new Path2D();
      head.moveTo(tx2 - c * s * 0.16, ty2 - n * s * 0.16);
      head.quadraticCurveTo(
        tx2 + sd * s * 0.38 - c * s * 0.14,
        ty2 - s * 0.38,
        tx2 + sd * s * 0.5,
        ty2 - s * 0.12,
      );
      head.quadraticCurveTo(
        tx2 + sd * s * 0.55,
        ty2 + s * 0.18,
        tx2 + sd * s * 0.26,
        ty2 + s * 0.34,
      );
      head.quadraticCurveTo(
        tx2 + sd * s * 0.12,
        ty2 + s * 0.4,
        tx2 + sd * s * 0.07,
        ty2 + s * 0.24,
      );
      head.lineTo(tx2 - c * s * 0.05, ty2 - n * s * 0.05 + s * 0.12);
      head.closePath();
      seat(head);
      ctx.fillStyle = shade(TRD_STEEL, -9);
      ctx.fill(head);
      ctx.save();
      ctx.clip(head);
      ctx.fillStyle = TRD_STEEL_LIT;
      ctx.beginPath();
      ctx.ellipse(tx2 + sd * s * 0.49, ty2 + s * 0.04, s * 0.042, s * 0.2, sd * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(18, 12, 26, 0.28)';
      ctx.beginPath();
      ctx.ellipse(tx2 + sd * s * 0.06, ty2 + s * 0.06, s * 0.08, s * 0.24, sd * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ink(head);
    }
    // The forged rosette where the hafts cross: iron over gold pip.
    ctx.fillStyle = '#2c2836';
    ctx.beginPath();
    facetCircle(ctx, cx, cy + s * 0.2 * K, s * 0.095, 6, 0.5);
    ctx.fill();
    ctx.fillStyle = TWN_IRON;
    ctx.beginPath();
    facetCircle(ctx, cx, cy + s * 0.2 * K, s * 0.07, 6, 0.5);
    ctx.fill();
    ctx.fillStyle = '#e0c88a';
    ctx.beginPath();
    facetCircle(ctx, cx, cy + s * 0.2 * K, s * 0.028, 5, 0.3);
    ctx.fill();
  } else if (form === 2) {
    // THE HALBERD — the long steel laid on a rail board in two
    // forged cradles: one confident diagonal, one commanding head.
    board(cx, my + s * 0.08, s * 1.0 * K, s * 0.26 * K, true);
    const ang = -0.34;
    const c = Math.cos(ang);
    const n = Math.sin(ang);
    const len = s * 1.2 * K;
    const x0 = cx - c * len * 0.52;
    const y0 = my + s * 0.08 - n * len * 0.52;
    const pw2 = s * 0.036;
    const pole = new Path2D();
    pole.moveTo(x0 - n * pw2, y0 + c * pw2);
    pole.lineTo(x0 + n * pw2, y0 - c * pw2);
    pole.lineTo(x0 + c * len + n * pw2, y0 + n * len - c * pw2);
    pole.lineTo(x0 + c * len - n * pw2, y0 + n * len + c * pw2);
    pole.closePath();
    seat(pole);
    ctx.fillStyle = TWN_OAK_DARK;
    ctx.fill(pole);
    ctx.save();
    ctx.clip(pole);
    ctx.fillStyle = TWN_OAK;
    ctx.fillRect(x0 - s * 0.1, y0 - s * 0.75, s * 1.3, s * 0.4);
    ctx.restore();
    ink(pole);
    // Forged cradles gripping OVER the pole — the rail's own hands.
    for (const fr of [0.26, 0.74] as const) {
      const gx = x0 + c * len * fr;
      const gy = y0 + n * len * fr;
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(ang);
      ctx.fillStyle = '#2c2836';
      ctx.fillRect(-s * 0.024, -pw2 - s * 0.02, s * 0.048, pw2 * 2 + s * 0.05);
      ctx.fillStyle = TWN_IRON;
      ctx.fillRect(-s * 0.014, -pw2 - s * 0.014, s * 0.028, pw2 * 2 + s * 0.038);
      ctx.restore();
    }
    // The butt shoe: a steel cap closing the low end.
    const shoe = new Path2D();
    const bx = x0 - c * s * 0.02;
    const by = y0 - n * s * 0.02;
    shoe.moveTo(bx + n * pw2 * 1.4, by - c * pw2 * 1.4);
    shoe.lineTo(bx - c * s * 0.1, by - n * s * 0.1);
    shoe.lineTo(bx - n * pw2 * 1.4, by + c * pw2 * 1.4);
    shoe.closePath();
    ctx.fillStyle = TRD_STEEL;
    ctx.fill(shoe);
    ink(shoe);
    // THE HEAD in one steel: a big axe crescent above the axis, a
    // hook beak below, the top spike running on — each mass big
    // enough to name. Built in the pole's rotated frame so the
    // geometry stays honest.
    const hx = x0 + c * (len - s * 0.22);
    const hy = y0 + n * (len - s * 0.22);
    const head = new Path2D();
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(ang);
    head.moveTo(s * 0.12, -s * 0.036);
    head.lineTo(s * 0.55, 0);
    head.lineTo(s * 0.12, s * 0.036);
    head.lineTo(s * 0.05, s * 0.07);
    head.quadraticCurveTo(-s * 0.02, s * 0.3, -s * 0.2, s * 0.26);
    head.quadraticCurveTo(-s * 0.08, s * 0.15, -s * 0.1, s * 0.06);
    head.lineTo(-s * 0.28, s * 0.024);
    head.lineTo(-s * 0.28, -s * 0.07);
    head.quadraticCurveTo(-s * 0.34, -s * 0.44, -s * 0.02, -s * 0.46);
    head.quadraticCurveTo(s * 0.13, -s * 0.46, s * 0.1, -s * 0.26);
    head.quadraticCurveTo(s * 0.075, -s * 0.12, s * 0.12, -s * 0.036);
    head.closePath();
    seat(head);
    ctx.fillStyle = shade(TRD_STEEL, -9);
    ctx.fill(head);
    ctx.save();
    ctx.clip(head);
    ctx.fillStyle = TRD_STEEL_LIT;
    ctx.beginPath();
    ctx.ellipse(-s * 0.29, -s * 0.28, s * 0.035, s * 0.17, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(s * 0.12, -s * 0.026, s * 0.42, s * 0.02);
    ctx.fillStyle = 'rgba(18, 12, 26, 0.26)';
    ctx.beginPath();
    ctx.ellipse(-s * 0.08, -s * 0.2, s * 0.09, s * 0.2, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ink(head);
    // Langets: two steel straps riding the pole from the socket.
    ctx.fillStyle = shade(TRD_STEEL, -14);
    ctx.fillRect(-s * 0.44, -s * 0.014, s * 0.28, s * 0.028);
    ctx.restore();
    // The armory cord at the socket: a still crimson tassel — the
    // dressed touch that says KEPT, not stored. Steel is STILL;
    // so is its cord.
    const tas = new Path2D();
    tas.moveTo(hx - c * s * 0.02, hy - n * s * 0.02);
    tas.quadraticCurveTo(hx - s * 0.05, hy + s * 0.12, hx - s * 0.04, hy + s * 0.22);
    tas.lineTo(hx - s * 0.085, hy + s * 0.22);
    tas.quadraticCurveTo(hx - s * 0.1, hy + s * 0.1, hx - c * s * 0.06, hy - n * s * 0.06 + s * 0.02);
    tas.closePath();
    ctx.fillStyle = '#7a2430';
    ctx.fill(tas);
    ink(tas);
    ctx.fillStyle = shade('#7a2430', -16);
    ctx.fillRect(hx - s * 0.095, hy + s * 0.2, s * 0.055, s * 0.024);
  } else {
    // THE GREAT CREST — the hall piece: saltire swords behind the
    // board, the quartered heater on it, and above the chief the
    // BARREL HELM wearing the coronet, mantling trailing the
    // hall's breath. Helm over shield IS the silhouette.
    const cy = my + s * 0.14 * K;
    board(cx, my - s * 0.02, s * 0.82 * K, s * 1.08 * K);
    for (const sd of [-1, 1] as const) {
      const ang = -Math.PI / 2 + sd * 0.66;
      const sx = cx - Math.cos(ang) * s * 0.36 * K;
      const sy = cy - Math.sin(ang) * s * 0.36 * K + s * 0.26 * K;
      const blade = swordPath(sx, sy, s * 0.88 * K, ang, s * 0.045);
      seat(blade);
      ctx.fillStyle = TRD_STEEL;
      ctx.fill(blade);
      ctx.save();
      ctx.clip(blade);
      ctx.fillStyle = TRD_STEEL_LIT;
      ctx.fillRect(cx - s * 0.75, cy - s * 0.85, s * (0.75 - 0.02 * sd), s * 1.7);
      ctx.restore();
      ink(blade);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(ang);
      ctx.fillStyle = '#c9962e';
      ctx.fillRect(-s * 0.022, -s * 0.12, s * 0.05, s * 0.24);
      ctx.restore();
      ctx.fillStyle = '#e0c88a';
      ctx.beginPath();
      facetCircle(ctx, sx - Math.cos(ang) * s * 0.17, sy - Math.sin(ang) * s * 0.17, s * 0.042, 6, 0.3);
      ctx.fill();
    }
    // Mantling ribbons — the crest's one living detail, breathing
    // off the HELM's shoulders now, where mantling belongs.
    const t = performance.now() / 1000;
    const { lag } = rend.breezeAt(tx, ty, t, tx * 2.3 + ty * 1.1, s, 0.015, 0.03);
    const shw = s * 0.58 * K;
    const shh = s * 0.68 * K;
    const hely = cy - shh * 0.5 - s * 0.16 * K;
    for (const sd of [-1, 1] as const) {
      const rx = cx + sd * s * 0.13 * K;
      const ry = hely - s * 0.02;
      const rib = new Path2D();
      rib.moveTo(rx, ry);
      rib.quadraticCurveTo(rx + sd * s * 0.22, ry + s * 0.08, rx + sd * s * 0.28 + lag * sd, ry + s * 0.4);
      rib.lineTo(rx + sd * s * 0.18 + lag * sd, ry + s * 0.38);
      rib.quadraticCurveTo(rx + sd * s * 0.12, ry + s * 0.14, rx - sd * s * 0.01, ry + s * 0.04);
      rib.closePath();
      ctx.fillStyle = '#7a2430';
      ctx.fill(rib);
      rend.beginStructOutline();
      ctx.stroke(rib);
    }
    // The quartered heater on the board.
    const heater = new Path2D();
    heater.moveTo(cx - shw / 2, cy - shh * 0.5);
    heater.lineTo(cx + shw / 2, cy - shh * 0.5);
    heater.lineTo(cx + shw / 2, cy - shh * 0.06);
    heater.quadraticCurveTo(cx + shw * 0.42, cy + shh * 0.36, cx, cy + shh * 0.5);
    heater.quadraticCurveTo(cx - shw * 0.42, cy + shh * 0.36, cx - shw / 2, cy - shh * 0.06);
    heater.closePath();
    seat(heater);
    ctx.fillStyle = '#7a2430';
    ctx.fill(heater);
    ctx.save();
    ctx.clip(heater);
    ctx.fillStyle = '#c9962e';
    ctx.fillRect(cx, cy - shh, shw, shh);
    ctx.fillRect(cx - shw, cy, shw, shh);
    ctx.fillStyle = 'rgba(18, 12, 26, 0.35)';
    ctx.fillRect(cx - s * 0.012, cy - shh, s * 0.024, shh * 2);
    ctx.fillRect(cx - shw, cy - s * 0.012, shw * 2, s * 0.024);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.fillRect(cx - shw, cy - shh, shw * 0.98, shh * 2);
    ctx.restore();
    ink(heater);
    // THE BARREL HELM above the chief — the crest's missing crown
    // piece: flat-crowned riveted steel, one dark sight slit, the
    // coronet riding its brow.
    const hw = s * 0.17 * K;
    const hh = s * 0.17 * K;
    const helm = new Path2D();
    helm.moveTo(cx - hw, hely + hh);
    helm.lineTo(cx - hw, hely - hh * 0.55);
    helm.quadraticCurveTo(cx - hw * 0.9, hely - hh, cx, hely - hh);
    helm.quadraticCurveTo(cx + hw * 0.9, hely - hh, cx + hw, hely - hh * 0.55);
    helm.lineTo(cx + hw, hely + hh);
    helm.closePath();
    seat(helm);
    ctx.fillStyle = TRD_STEEL;
    ctx.fill(helm);
    ctx.save();
    ctx.clip(helm);
    ctx.fillStyle = TRD_STEEL_LIT;
    ctx.fillRect(cx - hw, hely - hh, hw * 0.55, hh * 2.2);
    ctx.fillStyle = 'rgba(18, 12, 26, 0.85)';
    ctx.fillRect(cx - hw * 0.72, hely - hh * 0.08, hw * 1.44, s * 0.028);
    ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
    ctx.fillRect(cx - s * 0.008, hely + hh * 0.25, s * 0.016, hh * 0.7);
    ctx.restore();
    ink(helm);
    // The coronet on the helm's brow: gold band, three points.
    const cw = hw * 2.15;
    const cyy = hely - hh * 0.92;
    ctx.fillStyle = shade('#c9962e', -16);
    ctx.fillRect(cx - cw / 2, cyy, cw, s * 0.06);
    ctx.fillStyle = '#c9962e';
    ctx.fillRect(cx - cw / 2, cyy, cw, s * 0.045);
    for (const fx of [-1, 0, 1] as const) {
      ctx.beginPath();
      ctx.moveTo(cx + fx * cw * 0.32 - s * 0.035, cyy + s * 0.005);
      ctx.lineTo(cx + fx * cw * 0.32, cyy - s * 0.075);
      ctx.lineTo(cx + fx * cw * 0.32 + s * 0.035, cyy + s * 0.005);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#e0c88a';
    ctx.fillRect(cx - cw / 2, cyy + s * 0.008, cw, s * 0.012);
  }
}

/**
 * THE CASTLE DROP — the great hall banner off a lance rod. Taller,
 * wider, and crenel-hemmed against the street banner's swallowtail;
 * garrison faces fly it garrison-tall so the avenue reads the
 * colors from the market. Charge by the sixteen-tile heraldry.
 */
export function greatBannerOnFace(rend: PaintHost, 
  tx: number,
  ty: number,
  px0: number,
  s: number,
  dye: number,
  garrison: boolean,
): void {
  const ctx = rend.ctx;
  const cx = px0 + s * 0.5;
  const rodY = -s * (garrison ? 2.78 : 1.86);
  const bw = s * (garrison ? 0.72 : 0.62);
  const bl = s * (garrison ? 2.1 : 1.48);
  const t = performance.now() / 1000;
  const { sway, lag } = rend.breezeAt(tx, ty, t, tx * 1.7 + ty * 0.9, s, 0.024, 0.04);
  const yTop = rodY + s * 0.04;
  // The cloth's own shadow seats it on the masonry.
  ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
  ctx.fillRect(cx - bw / 2 + s * 0.045, yTop + s * 0.06, bw, bl - s * 0.14);
  const outer = paintGreatCloth(rend, cx, yTop, bw, bl, dye, s, sway, lag);
  // THE RING IS ONE (user outline pass): architecture-scale cloth
  // on architecture wears the architecture ring — the hand-set
  // 0.028 read as a lighter, wrongly-applied line beside the
  // crenellations' 0.055.
  rend.beginStructOutline();
  ctx.stroke(outer);
  // The lance rod: a tourney shaft strapped to the wall, steel
  // end caps — the castle hangs its cloth off war gear.
  ctx.fillStyle = '#454052';
  ctx.fillRect(cx - bw / 2 - s * 0.02, rodY - s * 0.06, s * 0.045, s * 0.05);
  ctx.fillRect(cx + bw / 2 - s * 0.025, rodY - s * 0.06, s * 0.045, s * 0.05);
  ctx.fillStyle = '#5a4a30';
  ctx.fillRect(cx - bw / 2 - s * 0.1, rodY - s * 0.024, bw + s * 0.2, s * 0.052);
  ctx.fillStyle = '#6f5a3a';
  ctx.fillRect(cx - bw / 2 - s * 0.1, rodY - s * 0.024, bw + s * 0.2, s * 0.018);
  // Hoist loops over the rod.
  ctx.fillStyle = shade(AWNING_CLOTHS[dye]!.b, -8);
  for (const fx of [-bw * 0.4, -bw * 0.14, bw * 0.14, bw * 0.4] as const) {
    ctx.fillRect(cx + fx - s * 0.03, rodY - s * 0.05, s * 0.06, s * 0.12);
  }
  ctx.fillStyle = TRD_STEEL_LIT;
  ctx.beginPath();
  facetCircle(ctx, cx - bw / 2 - s * 0.12, rodY, s * 0.038, 6, 0.3);
  ctx.fill();
  ctx.beginPath();
  facetCircle(ctx, cx + bw / 2 + s * 0.12, rodY, s * 0.038, 6, 0.3);
  ctx.fill();
}

/**
 * THE LONG FALL — a floor-length drape off a turned timber rod:
 * gathered at a corded waist, flaring to a hem that PUDDLES on the
 * boards (cloth long enough to spill is the luxury the castle pays
 * for). Interior cloth has weight: the hem barely breathes, the
 * tie tassel swings a touch — never the street banner's ripple.
 */
export function drapeFallOnFace(rend: PaintHost, 
  tx: number,
  ty: number,
  px0: number,
  s: number,
  dye: number,
  garrison: boolean,
): void {
  const ctx = rend.ctx;
  const cloth = AWNING_CLOTHS[dye]!.a;
  const trim = AWNING_CLOTHS[dye]!.b;
  const cx = px0 + s * 0.5;
  const rodY = -s * (garrison ? 2.66 : 1.8);
  const yTop = rodY + s * 0.03;
  const yFloor = -s * 0.05;
  const t = performance.now() / 1000;
  const { lag } = rend.breezeAt(tx, ty, t, tx * 1.3 + ty * 2.7, s, 0.008, 0.014);
  const topW = s * 0.5;
  const waistY = yTop + (yFloor - yTop) * 0.46;
  const waistW = s * 0.3;
  const hemW = s * 0.56;
  // The fall's silhouette: shoulders, the cinch, the flare, and
  // three puddle lobes resting on the floor.
  const path = new Path2D();
  path.moveTo(cx - topW / 2, yTop);
  path.lineTo(cx + topW / 2, yTop);
  path.quadraticCurveTo(cx + topW / 2 + s * 0.01, waistY - s * 0.24, cx + waistW / 2, waistY);
  path.quadraticCurveTo(cx + hemW / 2 + s * 0.02, yFloor - s * 0.34, cx + hemW / 2 + lag, yFloor - s * 0.05);
  path.quadraticCurveTo(cx + hemW / 2 + s * 0.05 + lag, yFloor + s * 0.005, cx + hemW * 0.3 + lag, yFloor);
  path.quadraticCurveTo(cx + lag * 0.6, yFloor - s * 0.045, cx - hemW * 0.12 + lag * 0.5, yFloor);
  path.quadraticCurveTo(cx - hemW * 0.34, yFloor + s * 0.005, cx - hemW / 2 - s * 0.04, yFloor - s * 0.01);
  path.quadraticCurveTo(cx - hemW / 2 - s * 0.015, yFloor - s * 0.1, cx - waistW / 2, waistY);
  path.quadraticCurveTo(cx - topW / 2 - s * 0.01, waistY - s * 0.24, cx - topW / 2, yTop);
  path.closePath();
  // The puddle's contact shadow seats the cloth on the boards.
  ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
  ctx.beginPath();
  ctx.ellipse(cx + s * 0.02, yFloor + s * 0.015, hemW * 0.56, s * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();
  // And its own wall shadow above the waist.
  ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
  ctx.fillRect(cx - topW / 2 + s * 0.04, yTop + s * 0.05, topW, waistY - yTop);
  ctx.fillStyle = cloth;
  ctx.fill(path);
  ctx.save();
  ctx.clip(path);
  // Gathered folds: wedges falling INTO the cinch and spreading
  // out of it — pinched cloth, never a painted column.
  ctx.fillStyle = 'rgba(18, 12, 26, 0.14)';
  for (const fx of [-0.16, 0.02, 0.17] as const) {
    ctx.beginPath();
    ctx.moveTo(cx + fx * s * 1.2, yTop);
    ctx.lineTo(cx + fx * s * 1.2 + s * 0.045, yTop);
    ctx.lineTo(cx + fx * s * 0.42, waistY);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + fx * s * 0.42, waistY);
    ctx.lineTo(cx + fx * s * 1.35 + s * 0.05, yFloor - s * 0.02);
    ctx.lineTo(cx + fx * s * 1.35, yFloor - s * 0.02);
    ctx.closePath();
    ctx.fill();
  }
  // The west selvage carries the light down the whole fall.
  ctx.fillStyle = shade(cloth, 14);
  ctx.fillRect(cx - topW / 2, yTop, s * 0.05, waistY - yTop);
  ctx.fillRect(cx - waistW / 2 - s * 0.02, waistY, s * 0.05, yFloor - waistY);
  // Header pleats under the rod: gathered bumps, shadow-struck.
  ctx.fillStyle = shade(cloth, 10);
  ctx.fillRect(cx - topW / 2, yTop, topW, s * 0.07);
  ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
  for (const fx of [-0.16, -0.05, 0.06, 0.17] as const) {
    ctx.fillRect(cx + fx * s, yTop + s * 0.01, s * 0.016, s * 0.07);
  }
  ctx.restore();
  // The corded tie-back at the waist: trim band dipping with the
  // gather, its tassel hanging free.
  ctx.fillStyle = trim;
  ctx.beginPath();
  ctx.moveTo(cx - waistW / 2 - s * 0.02, waistY - s * 0.03);
  ctx.quadraticCurveTo(cx, waistY + s * 0.035, cx + waistW / 2 + s * 0.02, waistY - s * 0.03);
  ctx.lineTo(cx + waistW / 2 + s * 0.02, waistY + s * 0.015);
  ctx.quadraticCurveTo(cx, waistY + s * 0.08, cx - waistW / 2 - s * 0.02, waistY + s * 0.015);
  ctx.closePath();
  ctx.fill();
  const tasX = cx + waistW / 2 + s * 0.02 + lag * 0.8;
  ctx.strokeStyle = trim;
  ctx.lineWidth = Math.max(1, s * 0.016);
  ctx.beginPath();
  ctx.moveTo(cx + waistW / 2 + s * 0.01, waistY + s * 0.01);
  ctx.quadraticCurveTo(tasX - s * 0.01, waistY + s * 0.08, tasX, waistY + s * 0.15);
  ctx.stroke();
  ctx.fillStyle = trim;
  ctx.beginPath();
  ctx.moveTo(tasX - s * 0.022, waistY + s * 0.14);
  ctx.lineTo(tasX + s * 0.022, waistY + s * 0.14);
  ctx.lineTo(tasX + s * 0.014, waistY + s * 0.22);
  ctx.lineTo(tasX - s * 0.014, waistY + s * 0.22);
  ctx.closePath();
  ctx.fill();
  // THE HOUSE OUTLINE around the true silhouette — puddle included.
  // THE RING IS ONE: floor-length cloth at the architecture weight.
  rend.beginStructOutline();
  ctx.stroke(path);
  // The turned timber rod over everything, knob finials proud.
  ctx.fillStyle = '#4a3524';
  ctx.fillRect(cx - topW / 2 - s * 0.09, rodY - s * 0.022, topW + s * 0.18, s * 0.048);
  ctx.fillStyle = '#5e4530';
  ctx.fillRect(cx - topW / 2 - s * 0.09, rodY - s * 0.022, topW + s * 0.18, s * 0.016);
  for (const sd of [-1, 1] as const) {
    ctx.fillStyle = '#5e4530';
    ctx.beginPath();
    facetCircle(ctx, cx + sd * (topW / 2 + s * 0.115), rodY, s * 0.04, 6, 0.3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(cx + sd * (topW / 2 + s * 0.115) - s * 0.012, rodY - s * 0.014, s * 0.014, s * 0.014);
  }
}

/**
 * THE HERALD'S ROW — hanging pennants: a wrought rail bearing three
 * long tapered pennons in the chosen dye, each bordered in its cream
 * partner (the fill is trim, the inner field cloth — a true sewn
 * border, never a stroked cheat), the center pennon longer and
 * charged with the woven diamond, the points running out solid trim
 * into a bound tassel. Headers are pinned to the rail; the body
 * sways and the tip trails a beat behind (the two-beat law), each
 * pennon a phase out of step with its neighbours. Adjacent pennant
 * tiles merge into one continuous rail — straps only at true free
 * ends (the ONE RAIL law brought to the wall). ONE PATH: each
 * pennon's silhouette is both its fill and its ring.
 */
export function pennantOnFace(rend: PaintHost, 
  game: ClientGame,
  tx: number,
  ty: number,
  px0: number,
  s: number,
  dye: number,
): void {
  const ctx = rend.ctx;
  const cloth = AWNING_CLOTHS[dye]!.a;
  const trim = AWNING_CLOTHS[dye]!.b;
  const t = performance.now() / 1000;
  const cx = px0 + s * 0.5;
  const rodY = -s * 1.76;
  const w = s * 0.3;
  const b = s * 0.05;
  // Run-merge: a neighbouring pennant tile shares the rail.
  const sameKind = (nx: number): boolean =>
    wallHungInfo(game.world.detailAt(nx, ty))?.kind === 'pennant';
  const runW = sameKind(tx - 1);
  const runE = sameKind(tx + 1);
  const rodX0 = runW ? px0 : cx - s * 0.32 - w / 2 - s * 0.07;
  const rodX1 = runE ? px0 + s : cx + s * 0.32 + w / 2 + s * 0.07;
  for (let k = 0; k < 3; k++) {
    const x = cx + (k - 1) * s * 0.32;
    const len = k === 1 ? s * 1.2 : s * 1.0;
    const ph = tx * 1.7 + ty * 0.9 + k * 1.9;
    // A long narrow drop kinks if the mid swings hard — keep the
    // body quiet and let the point do the fluttering.
    const { sway, lag } = rend.breezeAt(tx, ty, t, ph, s, 0.012, 0.03);
    const yTop = rodY + s * 0.035;
    const yMid = yTop + len * 0.55;
    const yTip = yTop + len;
    const midHalf = w * 0.3;
    const tipDx = lag * 1.4;
    const path = new Path2D();
    path.moveTo(x - w / 2, yTop);
    path.lineTo(x + w / 2, yTop);
    path.lineTo(x + midHalf + sway, yMid);
    path.lineTo(x + tipDx, yTip);
    path.lineTo(x - midHalf + sway, yMid);
    path.closePath();
    // Its own shadow seats the cloth on the masonry.
    ctx.save();
    ctx.translate(s * 0.04, s * 0.05);
    ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
    ctx.fill(path);
    ctx.restore();
    // The sewn border: the whole silhouette in trim, the field
    // inset inside it — the point runs out solid cream on purpose.
    ctx.fillStyle = trim;
    ctx.fill(path);
    ctx.fillStyle = cloth;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + b, yTop);
    ctx.lineTo(x + w / 2 - b, yTop);
    ctx.lineTo(x + midHalf - b + sway, yMid);
    ctx.lineTo(x + tipDx, yTip - b * 2.4);
    ctx.lineTo(x - midHalf + b + sway, yMid);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip(path);
    // Header band under the rail, struck with a trim thread.
    ctx.fillStyle = shade(cloth, 18);
    ctx.fillRect(x - w / 2, yTop, w, s * 0.06);
    ctx.fillStyle = trim;
    ctx.fillRect(x - w / 2, yTop + s * 0.06, w, s * 0.02);
    // Folds: the cloth hangs, not prints.
    ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
    ctx.fillRect(x - w * 0.16, yTop + s * 0.09, s * 0.038, len * 0.6);
    ctx.fillRect(x + w * 0.1, yTop + s * 0.09, s * 0.038, len * 0.52);
    // The flanking pennons wear a trim fess bar; the center pennon
    // carries the woven diamond charge (the heraldic grammar).
    if (k !== 1) {
      ctx.fillStyle = trim;
      ctx.fillRect(x - w / 2, yTop + len * 0.3, w, s * 0.05);
    }
    if (k === 1) {
      const dy2 = yTop + len * 0.3;
      const r2 = w * 0.42;
      ctx.fillStyle = trim;
      ctx.beginPath();
      ctx.moveTo(x, dy2 - r2);
      ctx.lineTo(x + r2 * 0.72, dy2);
      ctx.lineTo(x, dy2 + r2);
      ctx.lineTo(x - r2 * 0.72, dy2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = cloth;
      ctx.beginPath();
      ctx.moveTo(x, dy2 - r2 * 0.45);
      ctx.lineTo(x + r2 * 0.32, dy2);
      ctx.lineTo(x, dy2 + r2 * 0.45);
      ctx.lineTo(x - r2 * 0.32, dy2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // Cloth-weight ink — the player banner's own line, not the
    // architecture ring (which would swallow the sewn border).
    ctx.strokeStyle = STRUCT_OUTLINE;
    ctx.lineWidth = Math.max(1, s * 0.028);
    ctx.stroke(path);
    // The bound tassel at the point — trim jewelry, fill-only (no
    // ring on a piece this small; the frame-member law's cousin).
    const tipX = x + tipDx;
    ctx.fillStyle = shade(trim, -22);
    ctx.fillRect(tipX - s * 0.025, yTip, s * 0.05, s * 0.045);
    ctx.fillStyle = trim;
    ctx.beginPath();
    ctx.moveTo(tipX - s * 0.02, yTip + s * 0.045);
    ctx.lineTo(tipX + s * 0.02, yTip + s * 0.045);
    ctx.lineTo(tipX + s * 0.045 + lag * 0.4, yTip + s * 0.145);
    ctx.lineTo(tipX - s * 0.045 + lag * 0.4, yTip + s * 0.145);
    ctx.closePath();
    ctx.fill();
  }
  // The rail: one iron rod over every header, merged across a run,
  // a lit top facet so the bar reads against a dark top plate.
  ctx.fillStyle = '#2c2836';
  ctx.fillRect(rodX0, rodY - s * 0.022, rodX1 - rodX0, s * 0.045);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(rodX0, rodY - s * 0.022, rodX1 - rodX0, s * 0.012);
  // Cloth ties binding each pennon to its rail.
  ctx.fillStyle = shade(cloth, -8);
  for (let k = 0; k < 3; k++) {
    const x = cx + (k - 1) * s * 0.32;
    ctx.fillRect(x - s * 0.03, rodY - s * 0.045, s * 0.06, s * 0.1);
  }
  // Wall straps at true free ends only.
  ctx.fillStyle = '#454052';
  if (!runW) ctx.fillRect(rodX0 - s * 0.02, rodY - s * 0.035, s * 0.032, s * 0.07);
  if (!runE) ctx.fillRect(rodX1 - s * 0.012, rodY - s * 0.035, s * 0.032, s * 0.07);
}

/**
 * The bracket sign — PERSPECTIVE-HONEST: a board hung perpendicular
 * to a south face would show the camera only its edge, so on these
 * faces the trade board hangs FLAT IN THE WALL PLANE — a wrought
 * rod above it, two chains to its corners, the whole sign swinging
 * as a pendulum in that plane (an honest motion for an in-plane
 * board). The face-on read is legitimate carpentry, not a cheat:
 * wall-hung painted boards are period signage. Eight carved motifs,
 * chunky enough to read at street zoom.
 */
export function bracketSignOnFace(rend: PaintHost, tx: number, ty: number, px0: number, s: number, motif: number): void {
  const ctx = rend.ctx;
  const t = performance.now() / 1000;
  const cx = px0 + s * 0.5;
  const rodY = -s * 1.76;
  const rodHalf = s * 0.26;
  // The wrought rod on its wall plates, a center curl for the
  // smith's pride, bolt pips catching light.
  ctx.strokeStyle = '#2c2836';
  ctx.lineWidth = Math.max(1, s * 0.04);
  ctx.beginPath();
  ctx.moveTo(cx - rodHalf - s * 0.05, rodY);
  ctx.lineTo(cx + rodHalf + s * 0.05, rodY);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, s * 0.024);
  ctx.beginPath();
  ctx.arc(cx, rodY - s * 0.045, s * 0.04, Math.PI * 0.15, Math.PI * 1.6);
  ctx.stroke();
  ctx.fillStyle = '#454052';
  for (const dx2 of [-rodHalf - s * 0.05, rodHalf + s * 0.05]) {
    ctx.fillRect(cx + dx2 - s * 0.026, rodY - s * 0.05, s * 0.052, s * 0.1);
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  for (const dx2 of [-rodHalf - s * 0.05, rodHalf + s * 0.05]) {
    ctx.fillRect(cx + dx2 - s * 0.008, rodY - s * 0.014, s * 0.016, s * 0.028);
  }
  // The pendulum: board and chains swing together IN THE PLANE,
  // pivoting at the rod (the HangingSign's beat, made honest).
  const bz = rend.breezeAt(tx, ty, t, tx * 2.3, s, 1, 1);
  const swing = (bz.sway / s) * 0.055;
  const bob = bz.lag * 0.01;
  ctx.save();
  ctx.translate(cx, rodY + bob);
  ctx.rotate(swing);
  const bw = s * 0.56;
  const bh = s * 0.42;
  const by = s * 0.16;
  // Chains: two links each, rod to the board's top corners.
  ctx.strokeStyle = '#454052';
  ctx.lineWidth = Math.max(1, s * 0.02);
  for (const rx of [-rodHalf, rodHalf]) {
    const bxTo = rx * 0.82;
    ctx.beginPath();
    ctx.moveTo(rx, s * 0.01);
    ctx.lineTo((rx + bxTo) / 2, by * 0.55);
    ctx.lineTo(bxTo, by - s * 0.01);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc((rx + bxTo) / 2, by * 0.55, s * 0.022, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Standoff shadow seats the board proud of the masonry.
  ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
  ctx.fillRect(-bw / 2 + s * 0.04, by + s * 0.045, bw, bh);
  // The board: lumber, sunlit top arris, carved border, painted
  // field, and a worn lower edge — layer on layer.
  ctx.fillStyle = '#8a6534';
  ctx.fillRect(-bw / 2, by, bw, bh);
  ctx.fillStyle = shade('#8a6534', 16);
  ctx.fillRect(-bw / 2, by, bw, s * 0.032);
  ctx.fillStyle = shade('#8a6534', -18);
  ctx.fillRect(-bw / 2, by + bh - s * 0.028, bw, s * 0.028);
  ctx.strokeStyle = '#5e4322';
  ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.strokeRect(-bw / 2 + s * 0.04, by + s * 0.04, bw - s * 0.08, bh - s * 0.08);
  signMotif(rend, motif, 0, by + bh / 2, bw * 0.6);
  ctx.strokeStyle = STRUCT_OUTLINE;
  ctx.lineWidth = Math.max(1, s * 0.028);
  ctx.strokeRect(-bw / 2, by, bw, bh);
  ctx.restore();
}

/**
 * One carved trade motif, centered at (mx,my) in a w-wide field —
 * chunky flat-vector, two tones, readable at street zoom. Order is
 * FOREVER (the id math): mug, loaf, blade, fish, sprig, boot, bed,
 * hammer.
 */
export function signMotif(rend: PaintHost, motif: number, mx: number, my: number, w: number): void {
  const ctx = rend.ctx;
  const u = w / 10;
  const ink = '#3a2a16';
  const paint = '#e8dcc4';
  ctx.fillStyle = paint;
  switch (motif) {
    case 0: // mug — the alehouse tankard, foam proud
      ctx.fillRect(mx - u * 2.6, my - u * 2, u * 4.4, u * 4.4);
      ctx.strokeStyle = paint;
      ctx.lineWidth = u * 0.9;
      ctx.beginPath();
      ctx.arc(mx + u * 2.6, my + u * 0.2, u * 1.5, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.fillStyle = '#f4efe2';
      ctx.fillRect(mx - u * 3, my - u * 2.9, u * 5.2, u * 1.2);
      break;
    case 1: // loaf — the baker's crusted oval, three slashes
      ctx.beginPath();
      ctx.ellipse(mx, my + u * 0.3, u * 3.4, u * 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = u * 0.55;
      for (const k of [-1.4, 0, 1.4]) {
        ctx.beginPath();
        ctx.moveTo(mx + k * u - u * 0.7, my - u * 0.8);
        ctx.lineTo(mx + k * u + u * 0.7, my + u * 0.6);
        ctx.stroke();
      }
      break;
    case 2: // blade — the smith-sharpened sword, point high
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(-Math.PI / 4);
      ctx.fillRect(-u * 0.6, -u * 3.4, u * 1.2, u * 4.6);
      ctx.beginPath();
      ctx.moveTo(-u * 0.6, -u * 3.4);
      ctx.lineTo(0, -u * 4.4);
      ctx.lineTo(u * 0.6, -u * 3.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-u * 1.7, u * 1.2, u * 3.4, u * 0.8);
      ctx.fillRect(-u * 0.45, u * 2, u * 0.9, u * 1.6);
      ctx.restore();
      break;
    case 3: // fish — the water's silver, tail flicked
      ctx.beginPath();
      ctx.ellipse(mx - u * 0.6, my, u * 2.6, u * 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(mx + u * 1.7, my);
      ctx.lineTo(mx + u * 3.4, my - u * 1.4);
      ctx.lineTo(mx + u * 3.4, my + u * 1.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(mx - u * 2, my - u * 0.4, u * 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 4: // sprig — the herbalist's three leaves on a stem
      ctx.strokeStyle = paint;
      ctx.lineWidth = u * 0.7;
      ctx.beginPath();
      ctx.moveTo(mx, my + u * 3);
      ctx.lineTo(mx, my - u * 2.6);
      ctx.stroke();
      for (const [lx, ly, rot] of [
        [-u * 1.6, -u * 0.4, -0.8],
        [u * 1.6, -u * 1.2, 0.8],
        [0, -u * 3, 0],
      ] as const) {
        ctx.save();
        ctx.translate(mx + lx, my + ly);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, u * 1.5, u * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    case 5: // boot — the cobbler's tall boot, heel square
      ctx.fillRect(mx - u * 1.8, my - u * 3, u * 1.8, u * 4.6);
      ctx.fillRect(mx - u * 1.8, my + u * 0.6, u * 4.4, u * 1.6);
      ctx.fillStyle = ink;
      ctx.fillRect(mx - u * 1.8, my + u * 1.7, u * 4.4, u * 0.5);
      break;
    case 6: // bed — the inn's rest: headboard, mattress, pillow
      ctx.fillRect(mx - u * 3.4, my - u * 2.4, u * 0.9, u * 4.4);
      ctx.fillRect(mx - u * 3.4, my + u * 0.2, u * 6.8, u * 1.8);
      ctx.fillStyle = '#f4efe2';
      ctx.fillRect(mx - u * 2.2, my - u * 0.7, u * 1.9, u * 1);
      break;
    default: // hammer — the smith's own, head heavy
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(0.5);
      ctx.fillRect(-u * 0.5, -u * 1.2, u, u * 4.4);
      ctx.fillRect(-u * 2.4, -u * 3, u * 4.8, u * 1.9);
      ctx.restore();
      break;
  }
}

/**
 * The trellis: garden lattice up the wall face, a climbing vine
 * choosing its species — ivy's deep green, the madder rose in
 * bloom, the hopvine's pale cones. Leaf tips flutter; the blooms
 * carry a glint (the beacon law, whispered).
 */
export function trellisOnFace(rend: PaintHost, tx: number, ty: number, px0: number, s: number, species: number): void {
  const ctx = rend.ctx;
  const t = performance.now() / 1000;
  const cx = px0 + s * 0.5;
  const half = s * 0.34;
  const yBase = -s * 0.03;
  const yTop = -s * 1.36;
  const rail = '#7a5c34';
  // Soil shade where the lattice meets the ground.
  ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
  ctx.fillRect(cx - half - s * 0.03, yBase - s * 0.02, half * 2 + s * 0.06, s * 0.045);
  // Lattice: two rails, three battens, a diamond weave between.
  ctx.fillStyle = rail;
  ctx.fillRect(cx - half, yTop, s * 0.05, yBase - yTop);
  ctx.fillRect(cx + half - s * 0.05, yTop, s * 0.05, yBase - yTop);
  ctx.strokeStyle = shade(rail, -12);
  ctx.lineWidth = Math.max(1, s * 0.028);
  for (let k = 0; k < 3; k++) {
    const ly = yTop + (yBase - yTop) * (0.18 + k * 0.32);
    ctx.beginPath();
    ctx.moveTo(cx - half + s * 0.04, ly);
    ctx.lineTo(cx + half - s * 0.04, ly);
    ctx.stroke();
  }
  ctx.lineWidth = Math.max(1, s * 0.02);
  for (const dir of [1, -1]) {
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(cx + k * half * 0.9 - dir * half * 0.5, yBase - s * 0.08);
      ctx.lineTo(cx + k * half * 0.9 + dir * half * 0.5, yTop + s * 0.08);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = STRUCT_OUTLINE;
  ctx.lineWidth = Math.max(1, s * 0.024);
  ctx.strokeRect(cx - half, yTop, half * 2, yBase - yTop);
  // The vine: leaf clusters dealt up the lattice, species-toned.
  const leaf = species === 0 ? '#3f7a48' : species === 1 ? '#4a7a44' : '#5c8a4a';
  const leafDark = shade(leaf, -18);
  const h = hashCoords(67, tx, ty);
  for (let k = 0; k < 9; k++) {
    const hk = (h >>> (k * 3)) & 7;
    const lx = cx + ((hk & 3) - 1.5) * half * 0.55;
    const ly = yBase - s * 0.12 - (k / 9) * (yBase - yTop - s * 0.2);
    const flutter =
      k % 3 === 0 ? rend.breezeAt(tx, ty, t, k * 1.3 + tx, s, 0.012, 0.012).sway : 0;
    ctx.fillStyle = (hk & 4) === 0 ? leaf : leafDark;
    ctx.beginPath();
    ctx.ellipse(lx + flutter, ly, s * 0.06, s * 0.042, (hk - 3) * 0.3, 0, Math.PI * 2);
    ctx.fill();
    // The payload: rose blooms glint madder; hop hangs pale cones.
    if (species === 1 && (hk & 5) === 1) {
      ctx.fillStyle = '#97322f';
      ctx.beginPath();
      ctx.arc(lx + flutter + s * 0.03, ly - s * 0.03, s * 0.032, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fillRect(lx + flutter + s * 0.036, ly - s * 0.042, s * 0.012, s * 0.012);
    } else if (species === 2 && (hk & 5) === 4) {
      ctx.fillStyle = '#c9d69a';
      ctx.beginPath();
      ctx.ellipse(lx + flutter + s * 0.02, ly + s * 0.05, s * 0.024, s * 0.038, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * The wall basket: a wicker bowl off a bracket peg, blooms in the
 * FlowerBox's own mixed palette, swaying on its rope like a slow
 * pendulum. The gardener's smallest word.
 */
export function wallBasketOnFace(rend: PaintHost, tx: number, ty: number, px0: number, s: number): void {
  const ctx = rend.ctx;
  const t = performance.now() / 1000;
  const cx = px0 + s * 0.5;
  const pegY = -s * 1.52;
  // The peg: a small iron L bolted to the face.
  ctx.fillStyle = '#454052';
  ctx.fillRect(cx - s * 0.02, pegY - s * 0.05, s * 0.04, s * 0.1);
  ctx.fillRect(cx - s * 0.02, pegY - s * 0.05, s * 0.11, s * 0.035);
  const sway = (rend.breezeAt(tx, ty, t, tx * 1.7 + ty * 0.9, s, 1, 1).sway / s) * 0.05;
  ctx.save();
  ctx.translate(cx + s * 0.07, pegY - s * 0.02);
  ctx.rotate(sway);
  // Rope down to the bowl.
  ctx.strokeStyle = '#6e5638';
  ctx.lineWidth = Math.max(1, s * 0.022);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, s * 0.14);
  ctx.stroke();
  const bw = s * 0.36;
  const by = s * 0.14;
  // Shadow seats the bowl on the masonry behind it.
  ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
  ctx.beginPath();
  ctx.ellipse(s * 0.03, by + s * 0.14, bw * 0.52, s * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
  // THE TOP-PLANE LAW, basket-sized: the tilted bird's eye sees
  // INTO the bowl — a dark soil opening behind the rim, and the
  // blooms rise out of it, not off its front lip.
  ctx.fillStyle = 'rgba(40, 28, 16, 0.85)';
  ctx.beginPath();
  ctx.ellipse(0, by + s * 0.005, bw * 0.46, s * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  const hb = hashCoords(61, tx, ty);
  const BLOOMS = ['#d977a8', '#e8c06a', '#f0ede4', '#8f9ed6'];
  for (let k = 0; k < 4; k++) {
    const hk = (hb >>> (k * 4)) & 15;
    const nod = Math.sin(t * 1.8 + hk * 0.3) * s * 0.01;
    ctx.fillStyle = BLOOMS[hk % BLOOMS.length]!;
    ctx.beginPath();
    ctx.arc((k - 1.5) * bw * 0.24 + nod, by - s * 0.03 - (hk & 3) * s * 0.012, s * 0.038, 0, Math.PI * 2);
    ctx.fill();
  }
  // Greenery trailing off one side.
  ctx.strokeStyle = '#4a7a44';
  ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.beginPath();
  ctx.moveTo(-bw * 0.4, by + s * 0.04);
  ctx.quadraticCurveTo(-bw * 0.62, by + s * 0.16, -bw * 0.5, by + s * 0.26);
  ctx.stroke();
  // The wicker bowl: half-round, two weave bands, cross ticks.
  const bowl = new Path2D();
  bowl.moveTo(-bw / 2, by);
  bowl.lineTo(bw / 2, by);
  bowl.quadraticCurveTo(bw * 0.42, by + s * 0.2, 0, by + s * 0.21);
  bowl.quadraticCurveTo(-bw * 0.42, by + s * 0.2, -bw / 2, by);
  bowl.closePath();
  ctx.fillStyle = '#a8814c';
  ctx.fill(bowl);
  ctx.save();
  ctx.clip(bowl);
  ctx.fillStyle = shade('#a8814c', -14);
  ctx.fillRect(-bw / 2, by + s * 0.065, bw, s * 0.028);
  ctx.fillRect(-bw / 2, by + s * 0.13, bw, s * 0.028);
  ctx.fillStyle = 'rgba(58, 42, 22, 0.35)';
  for (let k = 0; k < 6; k++) {
    ctx.fillRect(-bw / 2 + (k * bw) / 6 + s * 0.01, by, s * 0.014, s * 0.21);
  }
  ctx.fillStyle = 'rgba(255, 236, 200, 0.25)';
  ctx.fillRect(-bw / 2, by + s * 0.01, bw, s * 0.02);
  ctx.restore();
  // The rim's sunlit front lip closes the opening's near edge.
  ctx.strokeStyle = '#c09a5e';
  ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.beginPath();
  ctx.ellipse(0, by + s * 0.005, bw * 0.46, s * 0.05, 0, 0.15, Math.PI - 0.15);
  ctx.stroke();
  ctx.strokeStyle = STRUCT_OUTLINE;
  ctx.lineWidth = Math.max(1, s * 0.024);
  ctx.stroke(bowl);
  ctx.restore();
}

/**
 * THE HERBALIST'S SILL: three glazed pots standing on the window's
 * sill course, herbs by mix — the one hanging painted by the window
 * stack itself. Coordinates arrive in the wall's leaned face frame;
 * sillY is the glass's bottom edge (the sill course paints just
 * below it). GLAZED WARE NEVER BARE CLAY: the pots deal from the
 * jar-glaze roster, each with its slip band and lit cheek, and the
 * row is dealt — heights, jitter, and species stations vary by the
 * world hash so no two sills in a street read as one stamp.
 */
export function sillHerbsOnSill(rend: PaintHost, 
  tx: number,
  ty: number,
  wx: number,
  wxE: number,
  sillY: number,
  s: number,
  mix: number,
): void {
  const ctx = rend.ctx;
  const t = performance.now() / 1000;
  const h = hashCoords(173, tx, ty);
  const cx = (wx + wxE) / 2;
  const span = Math.min(wxE - wx, s * 0.7);
  const baseY = sillY + s * 0.055; // standing on the sill course
  const glazes = ['#6f8a5c', '#5c748a', '#a3703c', '#8a5a6a'];
  // Seat shade: the row's one soft shadow on the sill board.
  ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY + s * 0.014, span * 0.54, s * 0.028, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stations west→east; the middle pot stands a breath forward so
  // the row never reads as a rubber stamp.
  for (const k of [0, 2, 1]) {
    const hp = hashCoords(179 + k, tx, ty);
    const px = cx + (k - 1) * span * 0.37 + (((hp >>> 2) % 5) - 2) * s * 0.012;
    const py = baseY + (k === 1 ? s * 0.018 : 0);
    // THE FISH LAW, pot-sized: a sill pot under this camera must
    // own ~0.16s of width or the whole row reads as sill noise.
    const pw = s * (0.16 + ((hp >>> 5) & 1) * 0.018);
    const ph = s * (0.15 + ((hp >>> 7) & 1) * 0.02);
    const glaze = glazes[(hp >>> 3) & 3]!;
    // The pot: waisted flowerpot silhouette, rolled rim, slip band.
    ctx.fillStyle = glaze;
    ctx.beginPath();
    ctx.moveTo(px - pw * 0.5, py - ph);
    ctx.lineTo(px + pw * 0.5, py - ph);
    ctx.lineTo(px + pw * 0.36, py);
    ctx.lineTo(px - pw * 0.36, py);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(glaze, 18);
    ctx.fillRect(px - pw * 0.56, py - ph - s * 0.024, pw * 1.12, s * 0.034);
    ctx.fillStyle = 'rgba(238, 230, 210, 0.55)';
    ctx.fillRect(px - pw * 0.46, py - ph + s * 0.026, pw * 0.92, s * 0.016);
    // One lit cheek — glaze catches the west light.
    ctx.fillStyle = 'rgba(255, 240, 214, 0.24)';
    ctx.fillRect(px - pw * 0.34, py - ph + s * 0.016, pw * 0.17, ph - s * 0.04);
    // The mouth: dark soil behind the rim's near lip.
    ctx.fillStyle = HRB_SOIL_WET;
    ctx.beginPath();
    ctx.ellipse(px, py - ph - s * 0.005, pw * 0.4, s * 0.02, 0, 0, Math.PI * 2);
    ctx.fill();
    // THE HANGING WEARS ITS LINE (museum audit): glazed ware inks
    // its one outer contour at the wall basket's weight — unlined,
    // the whole row vanished into the sill beside every ringed
    // neighbor. The planting stays soft; ceramic takes the line.
    const pot = new Path2D();
    const rimT = py - ph - s * 0.024;
    const rimB = py - ph + s * 0.01;
    pot.moveTo(px - pw * 0.56, rimB);
    pot.lineTo(px - pw * 0.56, rimT);
    pot.lineTo(px + pw * 0.56, rimT);
    pot.lineTo(px + pw * 0.56, rimB);
    pot.lineTo(px + pw * 0.485, rimB);
    pot.lineTo(px + pw * 0.36, py);
    pot.lineTo(px - pw * 0.36, py);
    pot.lineTo(px - pw * 0.485, rimB);
    pot.closePath();
    ctx.strokeStyle = STRUCT_OUTLINE;
    ctx.lineWidth = Math.max(1, s * 0.024);
    ctx.lineJoin = 'round';
    ctx.stroke(pot);
    // The planting, by mix and station.
    const nod = rend.breezeAt(tx, ty, t, tx * 1.7 + ty + k * 2.1, s, 0.006, 0.006).sway;
    const topY = py - ph - s * 0.008;
    const role = (mix * 3 + k + ((hp >>> 9) & 1)) % 3;
    if (mix === 1) {
      // THE HEALER'S ROW: sagewort rosettes and one moonbell.
      if (k === 1) {
        // The moonbell: one arcing stem, two hanging bells.
        ctx.strokeStyle = HRB_SAGE_DEEP;
        ctx.lineWidth = Math.max(1.2, s * 0.018);
        ctx.beginPath();
        ctx.moveTo(px, topY);
        ctx.quadraticCurveTo(px + s * 0.03 + nod * 0.5, topY - s * 0.14, px + s * 0.06 + nod, topY - s * 0.21);
        ctx.stroke();
        for (const [bx, by] of [
          [px + s * 0.066 + nod, topY - s * 0.19],
          [px + s * 0.03 + nod * 0.7, topY - s * 0.13],
        ] as const) {
          ctx.fillStyle = HRB_MOON;
          ctx.beginPath();
          ctx.moveTo(bx - s * 0.024, by);
          ctx.quadraticCurveTo(bx, by - s * 0.03, bx + s * 0.024, by);
          ctx.quadraticCurveTo(bx + s * 0.018, by + s * 0.036, bx, by + s * 0.042);
          ctx.quadraticCurveTo(bx - s * 0.018, by + s * 0.036, bx - s * 0.024, by);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = 'rgba(238, 240, 252, 0.85)';
          ctx.fillRect(bx - s * 0.009, by + s * 0.03, s * 0.018, s * 0.011);
        }
      } else {
        // Sagewort rosette: silver blades over the deep seat.
        ctx.fillStyle = HRB_SAGE_DEEP;
        ctx.beginPath();
        ctx.ellipse(px, topY - s * 0.03, pw * 0.44, s * 0.038, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = HRB_SAGE;
        for (let b = 0; b < 5; b++) {
          const a = -Math.PI * 0.82 + b * Math.PI * 0.16 + ((hp >>> b) & 1) * 0.08;
          ctx.beginPath();
          ctx.ellipse(
            px + Math.cos(a) * pw * 0.24 + (b === 2 ? nod * 0.5 : 0),
            topY - s * 0.045 + Math.sin(a) * s * 0.04,
            s * 0.055,
            s * 0.022,
            a,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
    } else if (mix === 2) {
      // THE SEEDLING ROW: sprout pairs, one leggy sprig, the tag.
      if (role === 2) {
        ctx.strokeStyle = '#5f8a44';
        ctx.lineWidth = Math.max(1.2, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(px, topY);
        ctx.quadraticCurveTo(px + nod * 0.5, topY - s * 0.1, px + nod, topY - s * 0.18);
        ctx.stroke();
        ctx.fillStyle = '#6f9450';
        for (const [ly, lm] of [[0.07, -1], [0.13, 1]] as const) {
          ctx.beginPath();
          ctx.ellipse(px + nod * (ly / 0.18) + lm * s * 0.03, topY - s * ly, s * 0.034, s * 0.018, lm * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // The paper tag on its stick — somebody KEEPS this row.
        ctx.fillStyle = '#8a6534';
        ctx.fillRect(px + pw * 0.3, topY - s * 0.08, s * 0.012, s * 0.08);
        ctx.fillStyle = '#e8dcc4';
        ctx.fillRect(px + pw * 0.3 - s * 0.028, topY - s * 0.115, s * 0.068, s * 0.04);
        ctx.fillStyle = 'rgba(60, 50, 40, 0.7)';
        ctx.fillRect(px + pw * 0.3 - s * 0.016, topY - s * 0.1, s * 0.038, s * 0.008);
      } else {
        ctx.strokeStyle = '#5f8a44';
        ctx.lineWidth = Math.max(1.2, s * 0.015);
        for (const m of [-1, 1] as const) {
          ctx.beginPath();
          ctx.moveTo(px + m * pw * 0.16, topY);
          ctx.lineTo(px + m * pw * 0.16, topY - s * 0.05);
          ctx.stroke();
          ctx.fillStyle = '#7fae6a';
          ctx.beginPath();
          ctx.ellipse(px + m * pw * 0.16 - s * 0.02, topY - s * 0.06, s * 0.022, s * 0.014, -0.5, 0, Math.PI * 2);
          ctx.ellipse(px + m * pw * 0.16 + s * 0.02, topY - s * 0.06, s * 0.022, s * 0.014, 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      // THE KITCHEN ROW: a clipped mound, chive spikes, a trailer.
      if (role === 0) {
        ctx.fillStyle = shade(TRD_HERB, -12);
        ctx.beginPath();
        ctx.ellipse(px, topY - s * 0.045, pw * 0.46, s * 0.055, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6f9450';
        ctx.beginPath();
        ctx.ellipse(px - pw * 0.12, topY - s * 0.062, pw * 0.3, s * 0.034, -0.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (role === 1) {
        ctx.strokeStyle = '#5f8a44';
        ctx.lineWidth = Math.max(1.2, s * 0.015);
        for (let b = 0; b < 5; b++) {
          const bend = b === 2 ? s * 0.03 : 0;
          ctx.beginPath();
          ctx.moveTo(px + (b - 2) * s * 0.02, topY);
          ctx.quadraticCurveTo(
            px + (b - 2) * s * 0.028 + nod * 0.6,
            topY - s * 0.1,
            px + (b - 2) * s * 0.04 + nod + bend,
            topY - s * (0.15 + (b % 3) * 0.024),
          );
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = TRD_HERB;
        ctx.beginPath();
        ctx.ellipse(px, topY - s * 0.036, pw * 0.38, s * 0.044, 0, 0, Math.PI * 2);
        ctx.fill();
        // The trailer spills the lip — a sprig down the pot cheek.
        ctx.strokeStyle = '#4f7a40';
        ctx.lineWidth = Math.max(1.2, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(px - pw * 0.3, topY);
        ctx.quadraticCurveTo(px - pw * 0.64, topY + s * 0.06, px - pw * 0.54, topY + s * 0.13);
        ctx.stroke();
        ctx.fillStyle = '#6f9450';
        for (const [fy, fm] of [[0.05, -1], [0.1, 1]] as const) {
          ctx.beginPath();
          ctx.ellipse(px - pw * (0.52 + fm * 0.08), topY + s * fy, s * 0.024, s * 0.015, fm * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

/**
 * THE HARVEST ON THE BEAM: a pegged oak batten across the wall
 * face, three heads-down drying bundles and a seed string swinging
 * on the banner's two-beat breeze — the herbalist's overflow where
 * the freestanding rack is the workshop station. Bundle heads reuse
 * the rack's layered-teardrop grammar at wall scale; the mix keys
 * the hues (green harvest / healer's mix / seed heads).
 */
export function herbBundlesOnFace(rend: PaintHost, tx: number, ty: number, px0: number, s: number, mix: number): void {
  const ctx = rend.ctx;
  const t = performance.now() / 1000;
  const h = hashCoords(181, tx, ty);
  const cx = px0 + s * 0.5;
  const batY = -s * 1.5;
  const half = s * 0.4;
  // Shadow seats the batten on the masonry.
  ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
  ctx.fillRect(cx - half + s * 0.025, batY + s * 0.065, half * 2, s * 0.04);
  // The batten: riven oak, lit top arris, two forged nails — inked
  // at the bracket-sign's board weight (THE HANGING WEARS ITS LINE:
  // the museum audit read the bare batten as a paint smear).
  ctx.fillStyle = TWN_OAK;
  ctx.fillRect(cx - half, batY, half * 2, s * 0.065);
  ctx.fillStyle = 'rgba(201, 167, 106, 0.55)';
  ctx.fillRect(cx - half, batY, half * 2, s * 0.02);
  ctx.strokeStyle = STRUCT_OUTLINE;
  ctx.lineWidth = Math.max(1, s * 0.028);
  ctx.strokeRect(cx - half, batY, half * 2, s * 0.065);
  ctx.fillStyle = TWN_IRON;
  for (const m of [-1, 1] as const) {
    ctx.fillRect(cx + m * half * 0.84 - s * 0.016, batY + s * 0.017, s * 0.032, s * 0.032);
    ctx.fillStyle = 'rgba(214, 224, 236, 0.5)';
    ctx.fillRect(cx + m * half * 0.84 - s * 0.016, batY + s * 0.017, s * 0.013, s * 0.013);
    ctx.fillStyle = TWN_IRON;
  }
  // The hue deals, mix-keyed: base greens, the healer's silver and
  // dusk-blue, or the seed harvest's golds.
  const HUES: ReadonlyArray<ReadonlyArray<{ lo: string; hi: string }>> = [
    [
      { lo: shade(TRD_HERB, -14), hi: '#6f9450' },
      { lo: shade(TRD_HERB_DRY, -12), hi: TRD_HERB_DRY },
      { lo: shade(TRD_HERB, -8), hi: TRD_HERB_DRY },
    ],
    [
      { lo: HRB_SAGE_DEEP, hi: HRB_SAGE },
      { lo: HRB_MOON_DEEP, hi: HRB_MOON },
      { lo: shade(TRD_HERB_DRY, -12), hi: TRD_HERB_DRY },
    ],
    [
      { lo: '#8a6f30', hi: '#a8823f' },
      { lo: '#9a8a4a', hi: '#c9b45a' },
      { lo: shade(TRD_HERB_DRY, -12), hi: TRD_HERB_DRY },
    ],
  ];
  const hues = HUES[mix % 3]!;
  for (let k = 0; k < 3; k++) {
    const hue = hues[(k + ((h >>> (k * 3)) & 1)) % 3]!;
    const kx = cx + (k - 1) * half * 0.64 + ((((h >>> (k * 4)) % 5) - 2) * s) / 90;
    const { sway, lag } = rend.breezeAt(tx, ty, t, k * 1.7 + tx * 1.3 + ty, s, 0.016, 0.024);
    // THE FISH LAW again: a drying head under this camera owns a
    // quarter tile or the harvest reads as two leaf ticks.
    const len = s * (0.22 + (((h >>> (k * 2 + 5)) & 3) / 3) * 0.06);
    const tieY = batY + s * 0.07;
    const tipX = kx + lag;
    const tipY = tieY + len;
    // Stems from the tie, fanning a hair.
    ctx.strokeStyle = hue.lo;
    ctx.lineWidth = Math.max(1.2, s * 0.016);
    for (const m of [-1, 1] as const) {
      ctx.beginPath();
      ctx.moveTo(kx, tieY);
      ctx.lineTo(kx + sway * 0.5 + m * s * 0.02, tieY + len * 0.45);
      ctx.stroke();
    }
    // The head: layered teardrop, lit cheek, sprig texture.
    const headP = new Path2D();
    headP.moveTo(kx + sway * 0.5, tieY + len * 0.38);
    headP.quadraticCurveTo(tipX - s * 0.078, tipY - s * 0.03, tipX - s * 0.028, tipY + s * 0.13);
    headP.quadraticCurveTo(tipX, tipY + s * 0.165, tipX + s * 0.028, tipY + s * 0.13);
    headP.quadraticCurveTo(tipX + s * 0.078, tipY - s * 0.03, kx + sway * 0.5, tieY + len * 0.38);
    headP.closePath();
    ctx.fillStyle = hue.lo;
    ctx.fill(headP);
    ctx.fillStyle = hue.hi;
    ctx.beginPath();
    ctx.moveTo(kx + sway * 0.5 - s * 0.012, tieY + len * 0.46);
    ctx.quadraticCurveTo(tipX - s * 0.052, tipY, tipX - s * 0.016, tipY + s * 0.108);
    ctx.quadraticCurveTo(tipX + s * 0.01, tipY + s * 0.03, kx + sway * 0.5 + s * 0.015, tieY + len * 0.46);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hue.lo;
    ctx.lineWidth = Math.max(1, s * 0.011);
    for (const m of [-1, 0.2, 1]) {
      ctx.beginPath();
      ctx.moveTo(tipX + m * s * 0.025, tipY + s * 0.02);
      ctx.lineTo(tipX + m * s * 0.046, tipY + s * 0.14);
      ctx.stroke();
    }
    // THE HANGING WEARS ITS LINE: the dried mass rings its own
    // silhouette at the basket's weight — texture inside the line,
    // never instead of it.
    ctx.strokeStyle = STRUCT_OUTLINE;
    ctx.lineWidth = Math.max(1, s * 0.024);
    ctx.lineJoin = 'round';
    ctx.stroke(headP);
    // The healer's mix hangs one moonbell head: two pale bells
    // still on the stem — dusk-blue reads even dried.
    if (mix === 1 && (k + ((h >>> (k * 3)) & 1)) % 3 === 1) {
      ctx.fillStyle = 'rgba(238, 240, 252, 0.8)';
      ctx.fillRect(tipX - s * 0.026, tipY + s * 0.115, s * 0.02, s * 0.02);
      ctx.fillRect(tipX + s * 0.012, tipY + s * 0.085, s * 0.02, s * 0.02);
    }
    // The twine tie, wrapped twice at the batten.
    ctx.strokeStyle = TWN_ROPE;
    ctx.lineWidth = Math.max(1.2, s * 0.016);
    ctx.beginPath();
    ctx.ellipse(kx, tieY - s * 0.008, s * 0.018, s * 0.022, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(kx, tieY + s * 0.016, s * 0.015, s * 0.018, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // The seed string at the east end: three pods on a cord, lagging
  // the bundles' beat (seed mixes hang a second string west).
  const strings: number[] = [cx + half * 0.94];
  if (mix === 2) strings.push(cx - half * 0.94);
  for (let si = 0; si < strings.length; si++) {
    const sx = strings[si]!;
    const { lag } = rend.breezeAt(tx, ty, t, sx * 0.31 + ty, s, 0.012, 0.018);
    ctx.strokeStyle = TWN_ROPE;
    ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.beginPath();
    ctx.moveTo(sx, batY + s * 0.065);
    ctx.quadraticCurveTo(sx + lag * 0.5, batY + s * 0.17, sx + lag, batY + s * 0.28);
    ctx.stroke();
    const podC = mix === 1 ? HRB_MOON : '#c9a13c';
    for (let pd = 0; pd < 3; pd++) {
      const f = 0.35 + pd * 0.3;
      ctx.fillStyle = pd === 1 ? shade(podC, 14) : podC;
      ctx.beginPath();
      ctx.ellipse(sx + lag * f, batY + s * (0.09 + f * 0.2), s * 0.022, s * 0.03, lag / s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * The grand tapestry — the Silverfall weave. Adjacent wall tiles of
 * the same run carrying Detail.Tapestry merge into ONE wide hanging:
 * every member computes the run's extent, draws the ENTIRE
 * composition, and clips to its own face span, so the picture
 * assembles seamlessly from identical geometry (the one-loom law,
 * raised onto the wall). The scene is the city's own: the silver
 * fall dropping from the ridge saddle past the keep to the water,
 * under a gold sun.
 */
export function tapestryOnFace(rend: PaintHost, 
  game: ClientGame,
  tx: number,
  ty: number,
  px0: number,
  s: number,
  garrison: boolean,
): void {
  const ctx = rend.ctx;
  const member = (x: number): boolean => {
    if (garrison) {
      if (!rend.garrisonish(game, x, ty) || rend.garrisonish(game, x, ty + 1)) return false;
    } else {
      const g2 = game.world.groundAt(x, ty);
      if (g2 === undefined || !WALL_TILES.has(g2) || PANEL_DOOR_TILES.has(g2))
        return false;
      if (rend.wallish(game, x, ty + 1)) return false;
    }
    return game.world.detailAt(x, ty) === Detail.Tapestry;
  };
  let ax = tx;
  while (member(ax - 1)) ax--;
  let ex = tx;
  while (member(ex + 1)) ex++;
  const nT = ex - ax + 1;
  const runL = px0 - (tx - ax) * s;
  const W = nT * s - s * 0.36;
  const x0 = runL + s * 0.18;
  const rodY = -s * 1.88;
  const yTop = rodY + s * 0.04;
  const bl = s * 1.38;
  const yBot = yTop + bl;
  // Our own face span only — run-mates paint their own thirds of
  // the same geometry, and the picture meets itself at the seams.
  ctx.save();
  ctx.beginPath();
  ctx.rect(px0 - 0.5, rodY - s * 0.4, s + 1, -rodY + s * 0.55);
  ctx.clip();
  ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
  ctx.fillRect(x0 + s * 0.045, yTop + s * 0.05, W, bl - s * 0.06);
  // The madder guard border carries the whole cloth.
  ctx.fillStyle = '#6e3440';
  ctx.fillRect(x0, yTop, W, bl);
  ctx.strokeStyle = STRUCT_OUTLINE;
  ctx.lineWidth = Math.max(1, s * 0.028);
  ctx.strokeRect(x0, yTop, W, bl);
  ctx.strokeStyle = 'rgba(240, 232, 210, 0.35)';
  ctx.lineWidth = Math.max(1, s * 0.016);
  ctx.strokeRect(x0 + s * 0.045, yTop + s * 0.045, W - s * 0.09, bl - s * 0.09);
  // The scene field: an evening sky over the falls.
  const fx0 = x0 + s * 0.1;
  const fx1 = x0 + W - s * 0.1;
  const fy0 = yTop + s * 0.1;
  const fy1 = yBot - s * 0.1;
  const fw = fx1 - fx0;
  const fh = fy1 - fy0;
  ctx.fillStyle = '#3a4668';
  ctx.fillRect(fx0, fy0, fw, fh);
  ctx.save();
  ctx.beginPath();
  ctx.rect(fx0, fy0, fw, fh);
  ctx.clip();
  // The gold sun, ringed, high in the east.
  const sunR = Math.min(fw * 0.09, s * 0.11);
  ctx.strokeStyle = 'rgba(201, 150, 46, 0.45)';
  ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.beginPath();
  facetCircle(ctx, fx0 + fw * 0.76, fy0 + fh * 0.24, sunR * 1.55, 8, 0.4);
  ctx.stroke();
  ctx.fillStyle = '#c9962e';
  ctx.beginPath();
  facetCircle(ctx, fx0 + fw * 0.76, fy0 + fh * 0.24, sunR, 8, 0.4);
  ctx.fill();
  // The stepped ridge; the falls leave from the saddle.
  const ry2 = fy0 + fh * 0.5;
  ctx.fillStyle = '#4a4554';
  ctx.beginPath();
  ctx.moveTo(fx0, ry2 + fh * 0.1);
  ctx.lineTo(fx0 + fw * 0.16, ry2 + fh * 0.1);
  ctx.lineTo(fx0 + fw * 0.22, ry2 - fh * 0.12);
  ctx.lineTo(fx0 + fw * 0.38, ry2 - fh * 0.12);
  ctx.lineTo(fx0 + fw * 0.46, ry2);
  ctx.lineTo(fx0 + fw * 0.66, ry2);
  ctx.lineTo(fx0 + fw * 0.74, ry2 - fh * 0.06);
  ctx.lineTo(fx0 + fw * 0.86, ry2 - fh * 0.06);
  ctx.lineTo(fx0 + fw * 0.93, ry2 + fh * 0.08);
  ctx.lineTo(fx1, ry2 + fh * 0.08);
  ctx.lineTo(fx1, fy1);
  ctx.lineTo(fx0, fy1);
  ctx.closePath();
  ctx.fill();
  // The keep on the western shoulder — and one gold fleck flying.
  ctx.fillStyle = '#2f2b3a';
  const kx = fx0 + fw * 0.24;
  const kw = fw * 0.11;
  const kt = ry2 - fh * 0.12;
  ctx.fillRect(kx, kt - fh * 0.17, kw * 0.32, fh * 0.17);
  ctx.fillRect(kx + kw * 0.68, kt - fh * 0.17, kw * 0.32, fh * 0.17);
  ctx.fillRect(kx, kt - fh * 0.09, kw, fh * 0.09);
  ctx.fillStyle = '#c9962e';
  ctx.fillRect(kx + kw * 0.06, kt - fh * 0.215, kw * 0.16, fh * 0.05);
  // The silver fall, saddle to pool, streaked with white water.
  const nx0 = fx0 + fw * 0.52;
  const nx1 = fx0 + fw * 0.6;
  ctx.fillStyle = '#b4c0d2';
  ctx.fillRect(nx0, ry2, nx1 - nx0, fy1 - ry2);
  ctx.fillStyle = 'rgba(240, 246, 252, 0.5)';
  ctx.fillRect(nx0 + (nx1 - nx0) * 0.18, ry2, Math.max(1, s * 0.02), fy1 - ry2);
  ctx.fillRect(nx0 + (nx1 - nx0) * 0.62, ry2 + fh * 0.06, Math.max(1, s * 0.02), fy1 - ry2 - fh * 0.06);
  // The water the fall feeds, ticked with silver light.
  ctx.fillStyle = '#54789c';
  ctx.fillRect(fx0, fy1 - fh * 0.16, fw, fh * 0.16);
  ctx.fillStyle = 'rgba(180, 192, 210, 0.6)';
  for (let k = 0; k < 4; k++)
    ctx.fillRect(
      fx0 + fw * (0.08 + k * 0.24),
      fy1 - fh * (0.09 + (k % 2) * 0.04),
      fw * 0.09,
      Math.max(1, s * 0.018),
    );
  ctx.fillStyle = 'rgba(240, 246, 252, 0.55)';
  ctx.beginPath();
  ctx.ellipse((nx0 + nx1) / 2, fy1 - fh * 0.145, (nx1 - nx0) * 0.9, fh * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Weft texture across the whole cloth — a weave, not a print.
  ctx.fillStyle = 'rgba(240, 232, 210, 0.04)';
  for (let yy = yTop + s * 0.09; yy < yBot - s * 0.05; yy += s * 0.09)
    ctx.fillRect(x0 + s * 0.03, yy, W - s * 0.06, Math.max(1, s * 0.014));
  // Hanging folds at the thirds.
  ctx.fillStyle = 'rgba(18, 12, 26, 0.1)';
  ctx.fillRect(x0 + W / 3 - s * 0.025, yTop + s * 0.06, s * 0.05, bl - s * 0.12);
  ctx.fillRect(x0 + (W * 2) / 3 - s * 0.025, yTop + s * 0.06, s * 0.05, bl - s * 0.12);
  // Bottom fringe past the outline.
  ctx.fillStyle = '#d8c9a0';
  for (let xx = x0 + s * 0.05; xx < x0 + W - s * 0.05; xx += s * 0.06)
    ctx.fillRect(xx, yBot + s * 0.016, s * 0.032, s * 0.052);
  // The iron rod: strapped at every joint, gold orbs at the ends.
  ctx.fillStyle = '#454052';
  for (let k = 1; k < nT; k++)
    ctx.fillRect(runL + k * s - s * 0.02, rodY - s * 0.058, s * 0.04, s * 0.042);
  ctx.fillRect(x0 - s * 0.05, rodY - s * 0.058, s * 0.04, s * 0.042);
  ctx.fillRect(x0 + W + s * 0.01, rodY - s * 0.058, s * 0.04, s * 0.042);
  ctx.fillStyle = '#2c2836';
  ctx.fillRect(x0 - s * 0.08, rodY - s * 0.024, W + s * 0.16, s * 0.05);
  ctx.fillStyle = '#c9962e';
  ctx.beginPath();
  facetCircle(ctx, x0 - s * 0.1, rodY, s * 0.045, 6, 0.3);
  ctx.fill();
  ctx.beginPath();
  facetCircle(ctx, x0 + W + s * 0.1, rodY, s * 0.045, 6, 0.3);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillRect(x0 - s * 0.115, rodY - s * 0.018, s * 0.016, s * 0.016);
  ctx.fillRect(x0 + W + s * 0.085, rodY - s * 0.018, s * 0.016, s * 0.016);
  ctx.restore();
}
