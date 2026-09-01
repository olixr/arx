/**
 * THE TOWN SQUARE — fountains, bells, carts, shop dressing and trade goods.
 * Extracted verbatim from renderer.ts's objectItem (THE PROP HALL,
 * foundations F1) — each painter is one former switch case; the frame
 * and host contracts live in ./types.ts.
 */
import { fire } from '../matter/fire.js';
import { AWNING_CLOTHS, TRD_HERB, TRD_HERB_DRY, TRD_LEATHER_LIT, TRD_STEEL, TRD_STEEL_LIT, TWN_BRONZE, TWN_BRONZE_LIT, TWN_IRON, TWN_OAK, TWN_OAK_DARK, TWN_OAK_LIT, TWN_ROPE } from '../paintVocab.js';
import { shade } from '../rig.js';
import { chamferRect, facetBlob, facetCircle } from '../shapes.js';
import { CMN_FLAME, CMN_FLAME_CORE, GARDEN_DYES, TRD_LEATHER, TRD_WAX, TRD_WAX_LIT, TWN_BURLAP, TWN_BURLAP_LIT, TWN_PAPER, TWN_STONE, TWN_STONE_DARK, TWN_STONE_LIT } from './palette.js';
import { Tile, hashCoords } from '@arx/shared';
import type { DrawItem } from '../renderer.js';
import type { PropEntries, PropFrame, PropHost } from './types.js';

const TWN_WATER = '#5f87a8';
const TWN_WATER_LIT = '#9fc4d8';
const TWN_GRAIN = '#d8b878';
const TRD_GRIT = '#8f887a';
const TRD_GRIT_LIT = '#b3ada0';
const TRD_MEAT = '#a4524a';
const TRD_LAVENDER = '#8a7aa8';
const TRD_FISH = '#9fb0bc';
const TRD_FISH_LIT = '#d3dfe6';
// THE KEPT FLAME — the candle family's own wax keys (grown from the
// grave-candle shrine's palette so every candle in the game is dipped
// from one vat): body, lit face, cooled rim, and the dead wick.
const WAX = '#d8cba8';
const WAX_LIT = '#efe6cf';
const WAX_RIM = '#c9bd9e';
const WAX_POOL = '#e6dcc0';
const WICK_DEAD = '#241d18';
/**
 * THE KEPT FLAME's one fire — every candle in the game burns exactly
 * this flame, so a hall dressed in dozens reads as ONE order keeping
 * ONE vigil. Calm by construction: the sway layers two beats UNDER
 * 2Hz (a draftless room, never a torch's gutter), the breath sits
 * under 1Hz, and the halo breathes half a beat behind the flame so
 * the light feels alive without ever flickering hard. Four layers,
 * back to front: breathing halo, amber lick leaning on the sway, the
 * molten root where wax drinks fire, and the bright core. PAINT,
 * never a light entry — the LampPost owns the town night.
 */
function paintCandleFlame(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  s: number,
  t: number,
  phase: number,
  scale = 1,
): void {
  const sway = Math.sin(t * 1.7 + phase) * 0.55 + Math.sin(t * 0.83 + phase * 1.7) * 0.45;
  const breath = 1 + 0.08 * Math.sin(t * 0.63 + phase * 0.9);
  const fh = s * 0.105 * scale * breath;
  const tipX = cx + sway * s * 0.02 * scale;
  // No painted halo HERE: a translucent aura inside draw() gets its
  // alpha dilated by the outline pass into a sooty ring (the live rig
  // caught the crown wearing a dirty cloud). The family's bloom rides
  // the glow overlay instead — collectStaticLights, THE KEPT FLAME
  // branch — where no outline can follow it.
  ctx.fillStyle = CMN_FLAME;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.019 * scale, topY);
  ctx.quadraticCurveTo(cx - s * 0.024 * scale, topY - fh * 0.5, tipX, topY - fh);
  ctx.quadraticCurveTo(cx + s * 0.024 * scale, topY - fh * 0.5, cx + s * 0.019 * scale, topY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(201, 92, 42, 0.6)';
  ctx.beginPath();
  ctx.ellipse(cx, topY - s * 0.004 * scale, s * 0.014 * scale, s * 0.008 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = CMN_FLAME_CORE;
  ctx.beginPath();
  ctx.ellipse(cx + sway * s * 0.007 * scale, topY - fh * 0.36, s * 0.011 * scale, fh * 0.33, 0, 0, Math.PI * 2);
  ctx.fill();
}
/** A snuffed wick: the little black curl a dead candle keeps. */
function paintDeadWick(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  s: number,
  scale = 1,
): void {
  ctx.strokeStyle = WICK_DEAD;
  ctx.lineWidth = Math.max(1, s * 0.012 * scale);
  ctx.beginPath();
  ctx.moveTo(cx, topY);
  ctx.quadraticCurveTo(cx + s * 0.004 * scale, topY - s * 0.022 * scale, cx + s * 0.014 * scale, topY - s * 0.024 * scale);
  ctx.stroke();
}
/**
 * One dipped candle standing on whatever holds it: wax body with the
 * lit west face and the turned shade edge, a cooled rim at the crown,
 * and 0-2 dealt runnels frozen down the body. The crown Y comes back
 * so the caller can seat a flame or a dead wick on it.
 */
function paintCandleStick(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  w: number,
  hgt: number,
  s: number,
  seed: number,
): number {
  const topY = baseY - hgt;
  ctx.fillStyle = WAX;
  ctx.fillRect(cx - w / 2, topY, w, hgt);
  ctx.fillStyle = WAX_LIT;
  ctx.fillRect(cx - w / 2, topY, w * 0.38, hgt);
  ctx.fillStyle = shade(WAX, -18);
  ctx.fillRect(cx + w / 2 - w * 0.16, topY + s * 0.006, w * 0.16, Math.max(0, hgt - s * 0.01));
  // Dealt runnels: the falls this candle has already cried — on
  // HALF the candles only (the simplicity law: melt is seasoning,
  // never the dish).
  if ((seed & 3) < 2) {
    ctx.strokeStyle = WAX_LIT;
    ctx.lineWidth = Math.max(1, w * 0.22);
    const rm = (seed & 4) ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(cx + rm * w * 0.28, topY + s * 0.012);
    ctx.quadraticCurveTo(cx + rm * w * 0.42, topY + hgt * 0.45, cx + rm * w * 0.34, topY + hgt * 0.78);
    ctx.stroke();
    ctx.fillStyle = WAX_LIT;
    ctx.beginPath();
    ctx.ellipse(cx + rm * w * 0.34, topY + hgt * 0.8, w * 0.14, w * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // The cooled crown rim, sunken toward the wick.
  ctx.fillStyle = WAX_RIM;
  ctx.beginPath();
  ctx.ellipse(cx, topY, w / 2, w * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(WAX_RIM, -10);
  ctx.beginPath();
  ctx.ellipse(cx, topY + w * 0.03, w * 0.3, w * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  return topY;
}


// ================================================================
// THE TOWN KEEPS ITS DAY — the town-life kit (391-404). The
// deliberate inversion of the long dark: nothing here was LEFT.
// The fountain runs because someone dredges it, the bills are
// fresh because someone pins them, the woodpile is ranked
// because winter is real. Zero light entries — the LampPost
// owns the town night (the craftsmen-shelf precedent).
// ================================================================
function paintTownFountain(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.24;
  // The plaza's heart: a two-tier limestone fountain the camera
  // sees INTO (the basket law — a bird's eye looks into the
  // bowl). Four thin falls off the upper bowl, drift rings on
  // the pool, and two wish-coins on the basin floor: the town
  // still believes in something, one copper at a time.
  // PASS-ONE VERDICT — THE FOUNTAIN MUST ANCHOR: the first
  // build read as a birdbath beside the ruler; a civic
  // fountain outweighs the body, so the basin, stem, and bowl
  // all grew a third and the crown clears head height.
  const rx = s * 0.8;
  const ry = rx * 0.5;
  const poolY = baseY - ry * 0.5;
  const bowlY = baseY - s * 1.14;
  return {
    sortY: ty + 0.72,
    body: stationBody(0.95, 1.65, 0.6),
    drawShadow: () => rend.castContact(p.x, baseY, rx * 1.08, s * 0.075),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, rx * 1.1, ry * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // The ground basin: a wide worked-stone ring. Outer wall
      // face first (the plumb face the street sees), then the
      // rim's sunlit top ring, then the water INSIDE it.
      ctx.fillStyle = TWN_STONE_DARK;
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - ry * 0.28, rx, ry * 0.66, 0, 0, Math.PI);
      ctx.lineTo(p.x - rx, poolY);
      ctx.ellipse(p.x, poolY, rx, ry, 0, Math.PI, 0, true);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TWN_STONE;
      ctx.beginPath();
      ctx.ellipse(p.x, poolY, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = TWN_STONE_LIT;
      ctx.beginPath();
      ctx.ellipse(p.x, poolY - s * 0.015, rx * 0.97, ry * 0.94, 0, Math.PI * 1.05, Math.PI * 1.95);
      ctx.lineWidth = Math.max(1.5, s * 0.05);
      ctx.strokeStyle = TWN_STONE_LIT;
      ctx.stroke();
      // Coping blocks: seam ticks around the rim so the ring
      // reads as LAID stone, not a poured curb.
      ctx.strokeStyle = 'rgba(90, 82, 66, 0.55)';
      ctx.lineWidth = Math.max(1, s * 0.016);
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 + 0.31;
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(a) * rx * 0.86, poolY + Math.sin(a) * ry * 0.86);
        ctx.lineTo(p.x + Math.cos(a) * rx * 1.0, poolY + Math.sin(a) * ry * 1.0);
        ctx.stroke();
      }
      // The pool: town water holding a little sky.
      ctx.fillStyle = TWN_WATER;
      ctx.beginPath();
      ctx.ellipse(p.x, poolY, rx * 0.82, ry * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(159, 196, 216, 0.5)';
      ctx.beginPath();
      ctx.ellipse(p.x - rx * 0.2, poolY - ry * 0.14, rx * 0.34, ry * 0.22, -0.2, 0, Math.PI * 2);
      ctx.fill();
      // Wish-coins on the basin floor — two glints, one gold.
      ctx.fillStyle = 'rgba(200, 169, 94, 0.9)';
      ctx.beginPath();
      ctx.ellipse(p.x + rx * 0.3, poolY + ry * 0.22, s * 0.022, s * 0.013, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(196, 188, 168, 0.75)';
      ctx.beginPath();
      ctx.ellipse(p.x - rx * 0.34, poolY + ry * 0.3, s * 0.018, s * 0.011, -0.4, 0, Math.PI * 2);
      ctx.fill();
      // Drift rings: the falls keep the pool alive — two rings
      // breathing outward on offset phases (<4Hz, cache-safe).
      for (let k = 0; k < 2; k++) {
        const ph = ((t * 0.45 + k * 0.5) % 1);
        ctx.strokeStyle = `rgba(198, 222, 232, ${(0.4 * (1 - ph)).toFixed(3)})`;
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.ellipse(p.x, poolY, rx * (0.2 + ph * 0.56), ry * (0.18 + ph * 0.52), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // The stem: a carved column with an entasis swell.
      ctx.fillStyle = TWN_STONE;
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.115, poolY);
      ctx.quadraticCurveTo(p.x - s * 0.15, baseY - s * 0.6, p.x - s * 0.09, bowlY + s * 0.06);
      ctx.lineTo(p.x + s * 0.09, bowlY + s * 0.06);
      ctx.quadraticCurveTo(p.x + s * 0.15, baseY - s * 0.6, p.x + s * 0.115, poolY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TWN_STONE_LIT;
      ctx.fillRect(p.x - s * 0.095, bowlY + s * 0.08, s * 0.045, poolY - bowlY - s * 0.12);
      // The upper bowl: a smaller ring the camera also sees
      // into, brim-full — the top plane is the BRIGHT surface.
      const brx = s * 0.38;
      const bry = brx * 0.48;
      ctx.fillStyle = TWN_STONE_DARK;
      ctx.beginPath();
      ctx.ellipse(p.x, bowlY + s * 0.1, brx, bry * 0.8, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = TWN_STONE;
      ctx.beginPath();
      ctx.ellipse(p.x, bowlY, brx, bry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = TWN_WATER_LIT;
      ctx.beginPath();
      ctx.ellipse(p.x, bowlY, brx * 0.78, bry * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      // The crown finial — clears the ruler's head.
      ctx.fillStyle = TWN_STONE;
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.045, bowlY - s * 0.02);
      ctx.quadraticCurveTo(p.x, bowlY - s * 0.34, p.x + s * 0.045, bowlY - s * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TWN_STONE_LIT;
      ctx.beginPath();
      ctx.ellipse(p.x, bowlY - s * 0.31, s * 0.028, s * 0.028, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE FALLS: four thin threads off the bowl lip into the
      // pool, each shimmering on its own slow phase; a wet
      // stain darkens the stem shoulder they splash past.
      for (let k = 0; k < 4; k++) {
        const fx = p.x + (k - 1.5) * brx * 0.52;
        const topY = bowlY + bry * (0.5 + Math.abs(k - 1.5) * 0.2);
        const glint = 0.55 + Math.sin(t * 2.2 + k * 1.7) * 0.2;
        ctx.strokeStyle = `rgba(206, 230, 240, ${glint.toFixed(3)})`;
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(fx, topY);
        ctx.quadraticCurveTo(fx + (k < 2 ? -1 : 1) * s * 0.01, (topY + poolY) / 2, fx + (k - 1.5) * s * 0.05, poolY - ry * 0.1);
        ctx.stroke();
        // The splash bead where the thread lands.
        ctx.fillStyle = `rgba(220, 238, 244, ${(glint * 0.8).toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(fx + (k - 1.5) * s * 0.05, poolY - ry * 0.08, s * 0.02, s * 0.01, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(74, 88, 98, 0.28)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.52, s * 0.1, s * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

function paintFounderStatue(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.22;
  // The founder in bronze gone green: sword point-down, hands
  // on the pommel, watching the street they laid out. A NEW
  // material story — never the fair house's marble, never the
  // swallowed kingdom's mossy gray — and the wreath at the
  // plinth foot proves the town still tends its past.
  const pw = s * 0.46;
  const plinthTop = baseY - s * 0.52;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.6, 1.85, 0.5),
    drawShadow: () => rend.castContact(p.x, baseY, pw * 1.1, s * 0.07),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, pw * 1.15, s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      // The base step, then the plinth block — both squared,
      // both showing the camera a foreshortened top plane.
      ctx.fillStyle = TWN_STONE_DARK;
      ctx.fillRect(p.x - pw, baseY - s * 0.14, pw * 2, s * 0.14);
      ctx.fillStyle = TWN_STONE;
      ctx.beginPath();
      ctx.moveTo(p.x - pw, baseY - s * 0.14);
      ctx.lineTo(p.x - pw * 0.82, baseY - s * 0.2);
      ctx.lineTo(p.x + pw * 0.82, baseY - s * 0.2);
      ctx.lineTo(p.x + pw, baseY - s * 0.14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TWN_STONE;
      ctx.fillRect(p.x - pw * 0.62, plinthTop, pw * 1.24, baseY - s * 0.2 - plinthTop);
      ctx.fillStyle = TWN_STONE_LIT;
      ctx.fillRect(p.x - pw * 0.62, plinthTop, pw * 0.2, baseY - s * 0.2 - plinthTop);
      // The plinth's own top plane: the sunlit cap the figure
      // stands on.
      ctx.fillStyle = TWN_STONE_LIT;
      ctx.beginPath();
      ctx.moveTo(p.x - pw * 0.62, plinthTop);
      ctx.lineTo(p.x - pw * 0.5, plinthTop - s * 0.06);
      ctx.lineTo(p.x + pw * 0.5, plinthTop - s * 0.06);
      ctx.lineTo(p.x + pw * 0.62, plinthTop);
      ctx.closePath();
      ctx.fill();
      // The dedication: a darker inset panel on the face.
      ctx.fillStyle = 'rgba(90, 82, 66, 0.45)';
      ctx.fillRect(p.x - pw * 0.34, plinthTop + s * 0.1, pw * 0.68, s * 0.16);
      ctx.strokeStyle = 'rgba(60, 54, 44, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        ctx.moveTo(p.x - pw * 0.26, plinthTop + s * (0.145 + k * 0.05));
        ctx.lineTo(p.x + pw * (0.26 - k * 0.12), plinthTop + s * (0.145 + k * 0.05));
        ctx.stroke();
      }
      // THE FIGURE: bronze mass with ONE lit facet (the block
      // law) — legs planted, cloak line behind, hands stacked
      // on the pommel, the blade down between the feet.
      // PASS-ONE VERDICT — BRONZE IS NOT SANDSTONE: the first
      // figure read tan against its own limestone plinth; the
      // metal darkened two steps and the verdigris doubled so
      // stone and statue can never trade places.
      const fy = plinthTop - s * 0.06; // feet line
      const headY = fy - s * 1.06;
      ctx.fillStyle = '#55462a';
      ctx.beginPath();
      // Cloak + legs as one grounded silhouette, waist, then
      // shoulders — a statue reads by mass, not by anatomy.
      ctx.moveTo(p.x - s * 0.2, fy);
      ctx.lineTo(p.x - s * 0.24, fy - s * 0.42);
      ctx.lineTo(p.x - s * 0.17, fy - s * 0.68);
      ctx.lineTo(p.x - s * 0.21, fy - s * 0.82);
      ctx.lineTo(p.x - s * 0.1, headY + s * 0.1);
      ctx.lineTo(p.x + s * 0.1, headY + s * 0.1);
      ctx.lineTo(p.x + s * 0.21, fy - s * 0.82);
      ctx.lineTo(p.x + s * 0.17, fy - s * 0.68);
      ctx.lineTo(p.x + s * 0.24, fy - s * 0.42);
      ctx.lineTo(p.x + s * 0.2, fy);
      ctx.closePath();
      ctx.fill();
      // The head under a simple crown band.
      ctx.fillStyle = '#55462a';
      ctx.beginPath();
      ctx.ellipse(p.x, headY, s * 0.095, s * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = TWN_BRONZE_LIT;
      ctx.fillRect(p.x - s * 0.09, headY - s * 0.075, s * 0.18, s * 0.028);
      // The west light: one lit facet down the whole figure.
      ctx.fillStyle = 'rgba(194, 164, 92, 0.5)';
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.19, fy);
      ctx.lineTo(p.x - s * 0.22, fy - s * 0.42);
      ctx.lineTo(p.x - s * 0.12, fy - s * 0.8);
      ctx.lineTo(p.x - s * 0.06, fy - s * 0.8);
      ctx.lineTo(p.x - s * 0.1, fy);
      ctx.closePath();
      ctx.fill();
      // The sword: pommel at the hands, blade to the cap.
      ctx.fillStyle = TWN_BRONZE_LIT;
      ctx.fillRect(p.x - s * 0.016, fy - s * 0.52, s * 0.032, s * 0.52);
      ctx.fillRect(p.x - s * 0.09, fy - s * 0.56, s * 0.18, s * 0.035);
      ctx.beginPath();
      ctx.ellipse(p.x, fy - s * 0.62, s * 0.035, s * 0.035, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE VERDIGRIS: green runs where the rain runs — off
      // the shoulders, down the cloak folds, over the crown —
      // heavy enough to read at map scale.
      ctx.fillStyle = 'rgba(95, 155, 132, 0.75)';
      ctx.fillRect(p.x - s * 0.2, fy - s * 0.8, s * 0.055, s * 0.4);
      ctx.fillRect(p.x + s * 0.13, fy - s * 0.76, s * 0.05, s * 0.32);
      ctx.fillRect(p.x - s * 0.04, headY - s * 0.065, s * 0.07, s * 0.055);
      ctx.fillStyle = 'rgba(95, 155, 132, 0.5)';
      ctx.fillRect(p.x - s * 0.06, fy - s * 0.5, s * 0.045, s * 0.3);
      ctx.fillRect(p.x - pw * 0.5, plinthTop + s * 0.02, s * 0.05, s * 0.2);
      // The laid wreath: a small green ring with three blooms
      // at the plinth foot — somebody still remembers.
      ctx.strokeStyle = '#4a6b3d';
      ctx.lineWidth = Math.max(1.5, s * 0.035);
      ctx.beginPath();
      ctx.ellipse(p.x - pw * 0.4, baseY - s * 0.02, s * 0.075, s * 0.04, 0.2, 0, Math.PI * 2);
      ctx.stroke();
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = k === 1 ? '#c95a74' : '#d8c454';
        ctx.beginPath();
        ctx.ellipse(p.x - pw * 0.4 + (k - 1) * s * 0.05, baseY - s * 0.025 - ((k & 1) === 1 ? s * 0.02 : 0), s * 0.016, s * 0.014, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
}

function paintNoticeBoard(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The town's voice: every rumor, bounty, and market day pinned
  // under one shingle cap. The bills are LAYERED — torn corners,
  // one wax seal, one sketch — and the newest one lifts at its
  // corner on the breeze: fresh paper, kept board.
  const hw = s * 0.5;
  const boardTop = baseY - s * 1.06;
  const boardBot = baseY - s * 0.38;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.62, 1.5, 0.4),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.0, s * 0.065),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.02, s * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      // Two oak posts with heel wedges.
      for (const m of [-1, 1] as const) {
        ctx.fillStyle = TWN_OAK_DARK;
        ctx.fillRect(p.x + m * hw * 0.86 - s * 0.032, boardTop - s * 0.1, s * 0.064, baseY - boardTop + s * 0.1);
        ctx.fillStyle = TWN_OAK;
        ctx.fillRect(p.x + m * hw * 0.86 - s * 0.032, boardTop - s * 0.1, s * 0.026, baseY - boardTop + s * 0.1);
        ctx.fillStyle = TWN_OAK_DARK;
        ctx.beginPath();
        ctx.moveTo(p.x + m * hw * 0.86 - s * 0.06, baseY);
        ctx.lineTo(p.x + m * hw * 0.86, baseY - s * 0.07);
        ctx.lineTo(p.x + m * hw * 0.86 + s * 0.06, baseY);
        ctx.closePath();
        ctx.fill();
      }
      // The board: a weathered plank panel IN PLANE (the sign
      // law: face-on is the legitimate form for a south face).
      ctx.fillStyle = shade(TWN_OAK, -20);
      ctx.fillRect(p.x - hw * 0.95, boardTop, hw * 1.9, boardBot - boardTop);
      ctx.strokeStyle = 'rgba(60, 44, 24, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (let k = 1; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(p.x - hw * 0.95, boardTop + (boardBot - boardTop) * (k / 3));
        ctx.lineTo(p.x + hw * 0.95, boardTop + (boardBot - boardTop) * (k / 3));
        ctx.stroke();
      }
      // THE BILLS: five pinned papers on hash-dealt tilts, each
      // with its own pale and its own story. Painted before the
      // cap so the roof overhang reads OVER the paper.
      const bills = [
        { bx: -0.55, by: 0.16, w: 0.42, hgt: 0.34, tone: TWN_PAPER },
        { bx: 0.08, by: 0.1, w: 0.5, hgt: 0.42, tone: '#ede4cc' },
        { bx: 0.56, by: 0.2, w: 0.36, hgt: 0.3, tone: '#d9cfb4' },
        { bx: -0.18, by: 0.52, w: 0.4, hgt: 0.32, tone: '#e6dbc0' },
        { bx: 0.38, by: 0.56, w: 0.34, hgt: 0.28, tone: TWN_PAPER },
      ];
      for (let k = 0; k < bills.length; k++) {
        const b = bills[k]!;
        const bx = p.x + b.bx * hw;
        const by = boardTop + b.by * (boardBot - boardTop);
        const bw = b.w * hw;
        const bh = b.hgt * (boardBot - boardTop);
        const tilt = (((h >> (k * 3)) & 7) - 3.5) * 0.03;
        ctx.save();
        ctx.translate(bx + bw / 2, by + bh / 2);
        ctx.rotate(tilt);
        ctx.fillStyle = b.tone;
        ctx.beginPath();
        ctx.moveTo(-bw / 2, -bh / 2);
        ctx.lineTo(bw / 2, -bh / 2);
        ctx.lineTo(bw / 2, bh / 2 - s * 0.015);
        // Torn bottom edge: two bites out of the hem.
        ctx.lineTo(bw * 0.1, bh / 2);
        ctx.lineTo(-bw * 0.15, bh / 2 - s * 0.02);
        ctx.lineTo(-bw / 2, bh / 2);
        ctx.closePath();
        ctx.fill();
        // Script lines; the second bill carries a sketch.
        if (k === 1) {
          ctx.strokeStyle = 'rgba(74, 60, 40, 0.7)';
          ctx.lineWidth = Math.max(1, s * 0.012);
          ctx.beginPath();
          ctx.ellipse(0, -bh * 0.12, bw * 0.2, bh * 0.22, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-bw * 0.28, bh * 0.3);
          ctx.lineTo(bw * 0.28, bh * 0.3);
          ctx.stroke();
        } else {
          ctx.strokeStyle = 'rgba(74, 60, 40, 0.55)';
          ctx.lineWidth = Math.max(1, s * 0.01);
          const rows = Math.max(2, Math.round(bh / (s * 0.055)));
          for (let r = 0; r < rows; r++) {
            const ry2 = -bh / 2 + bh * ((r + 0.7) / (rows + 0.6));
            ctx.beginPath();
            ctx.moveTo(-bw * 0.34, ry2);
            ctx.lineTo(bw * (0.34 - ((h >> (r + k)) & 1) * 0.14), ry2);
            ctx.stroke();
          }
        }
        // The pin.
        ctx.fillStyle = TWN_IRON;
        ctx.beginPath();
        ctx.ellipse(0, -bh / 2 + s * 0.014, s * 0.011, s * 0.011, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // The wax seal on the third bill — the crown's business.
      ctx.fillStyle = '#97322f';
      ctx.beginPath();
      ctx.ellipse(p.x + hw * 0.66, boardTop + (boardBot - boardTop) * 0.42, s * 0.024, s * 0.024, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE FRESH BILL: the newest paper lifts at its corner on
      // the breeze clock (<4Hz) — somebody pinned it this morning.
      const lift = Math.max(0, Math.sin(t * 1.6 + tx * 1.3 + ty * 2.1)) * s * 0.045;
      ctx.fillStyle = '#f2ead6';
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.5, boardTop + (boardBot - boardTop) * 0.58);
      ctx.lineTo(p.x - hw * 0.14, boardTop + (boardBot - boardTop) * 0.58);
      ctx.lineTo(p.x - hw * 0.14 + lift * 0.4, boardTop + (boardBot - boardTop) * 0.9 - lift);
      ctx.lineTo(p.x - hw * 0.5, boardTop + (boardBot - boardTop) * 0.92);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(196, 186, 160, 0.6)';
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.14 + lift * 0.4, boardTop + (boardBot - boardTop) * 0.9 - lift);
      ctx.lineTo(p.x - hw * 0.14, boardTop + (boardBot - boardTop) * 0.9);
      ctx.lineTo(p.x - hw * 0.32, boardTop + (boardBot - boardTop) * 0.91);
      ctx.closePath();
      ctx.fill();
      // The shingle cap: two courses + a foreshortened top
      // plane (the 2.5D law — the rain cap shows its lid).
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.fillRect(p.x - hw * 1.08, boardTop - s * 0.16, hw * 2.16, s * 0.09);
      ctx.fillStyle = TWN_OAK;
      ctx.fillRect(p.x - hw * 1.08, boardTop - s * 0.23, hw * 2.16, s * 0.07);
      ctx.strokeStyle = 'rgba(60, 44, 24, 0.45)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      for (let k = 0; k < 7; k++) {
        const kx = p.x - hw * 0.96 + k * hw * 0.32;
        ctx.beginPath();
        ctx.moveTo(kx, boardTop - s * 0.23);
        ctx.lineTo(kx, boardTop - s * 0.07);
        ctx.stroke();
      }
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 1.08, boardTop - s * 0.23);
      ctx.lineTo(p.x - hw * 0.98, boardTop - s * 0.29);
      ctx.lineTo(p.x + hw * 0.98, boardTop - s * 0.29);
      ctx.lineTo(p.x + hw * 1.08, boardTop - s * 0.23);
      ctx.closePath();
      ctx.fill();
    },
  };
}

function paintTownBell(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // THE BELL SPEAKS FIRST (recut, user round two): the pass-one
  // rework grew the bell, but it was still cast in the street's
  // own browns — TWN_BRONZE sits one shade off TWN_OAK, so at
  // map scale the metal read as one more plank and the whole
  // rig as a ladder wearing a bucket. Recut root to crown: the
  // bell nearly doubles again and is cast in TRUE BELL METAL —
  // golden bronze with one hard west light and a thick sound
  // bow — hung from a plain heavy gallows any pair of hands
  // could raise: two squared posts on stone heels, a deep
  // headstock with trenail pips, knee braces, a rough plank
  // cap. NO CIVIC TRIM by design: the same rig calls a market
  // day, a curfew, or a war-camp muster.
  const hw = s * 0.56;
  const beamY = baseY - s * 1.66;
  const BZ = '#a8873c';
  const BZ_LIT = '#e8c46a';
  const BZ_DARK = '#77602a';
  return {
    sortY: ty + 0.72,
    body: stationBody(0.68, 2.2, 0.5),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.08, s * 0.075),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.12, s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      // Stone heels: the frame never stands in mud.
      for (const m of [-1, 1] as const) {
        ctx.fillStyle = TWN_STONE_DARK;
        ctx.beginPath();
        facetBlob(ctx, p.x + m * hw * 0.86, baseY - s * 0.02, s * 0.075, h ^ (m * 53), 5, 0.7);
        ctx.fill();
      }
      // THE POSTS: two squared members with real meat — dark
      // east face, oak body, lit west arris — battered a hair
      // inward so the frame stands braced, not parallel-bar.
      const postW = s * 0.1;
      for (const m of [-1, 1] as const) {
        const footX = p.x + m * hw * 0.86;
        const headX = p.x + m * hw * 0.74;
        ctx.fillStyle = TWN_OAK_DARK;
        ctx.beginPath();
        ctx.moveTo(footX - postW * 0.5, baseY);
        ctx.lineTo(headX - postW * 0.46, beamY + s * 0.02);
        ctx.lineTo(headX + postW * 0.46, beamY + s * 0.02);
        ctx.lineTo(footX + postW * 0.5, baseY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = TWN_OAK;
        ctx.beginPath();
        ctx.moveTo(footX - postW * 0.5, baseY);
        ctx.lineTo(headX - postW * 0.46, beamY + s * 0.02);
        ctx.lineTo(headX - postW * 0.08, beamY + s * 0.02);
        ctx.lineTo(footX - postW * 0.1, baseY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = TWN_OAK_LIT;
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(footX - postW * 0.46, baseY - s * 0.02);
        ctx.lineTo(headX - postW * 0.42, beamY + s * 0.04);
        ctx.stroke();
      }
      // Knee braces: the joint that keeps the gallows square —
      // short struts from post into headstock.
      ctx.fillStyle = TWN_OAK_DARK;
      for (const m of [-1, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(p.x + m * hw * 0.7, beamY + s * 0.34);
        ctx.lineTo(p.x + m * hw * 0.38, beamY + s * 0.05);
        ctx.lineTo(p.x + m * hw * 0.46, beamY + s * 0.05);
        ctx.lineTo(p.x + m * hw * 0.76, beamY + s * 0.34);
        ctx.closePath();
        ctx.fill();
      }
      // THE HEADSTOCK: a deep beam worth hanging weight from —
      // lit top arris, trenail pips over each post.
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.fillRect(p.x - hw * 1.04, beamY - s * 0.06, hw * 2.08, s * 0.13);
      ctx.fillStyle = TWN_OAK;
      ctx.fillRect(p.x - hw * 1.04, beamY - s * 0.06, hw * 2.08, s * 0.055);
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.fillRect(p.x - hw * 1.04, beamY - s * 0.06, hw * 2.08, s * 0.02);
      ctx.fillStyle = 'rgba(58, 40, 20, 0.8)';
      for (const m of [-1, 1] as const) {
        ctx.beginPath();
        ctx.ellipse(p.x + m * hw * 0.74, beamY + s * 0.005, s * 0.014, s * 0.012, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // THE CAP: rough planks pitched over the beam — shelter,
      // not architecture. Two true pitches + the foreshortened
      // ridge plane the camera is owed.
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 1.12, beamY - s * 0.05);
      ctx.lineTo(p.x, beamY - s * 0.5);
      ctx.lineTo(p.x + hw * 1.12, beamY - s * 0.05);
      ctx.lineTo(p.x + hw * 0.92, beamY - s * 0.17);
      ctx.lineTo(p.x, beamY - s * 0.53);
      ctx.lineTo(p.x - hw * 0.92, beamY - s * 0.17);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.92, beamY - s * 0.17);
      ctx.lineTo(p.x, beamY - s * 0.53);
      ctx.lineTo(p.x + hw * 0.92, beamY - s * 0.17);
      ctx.lineTo(p.x + hw * 0.78, beamY - s * 0.24);
      ctx.lineTo(p.x, beamY - s * 0.575);
      ctx.lineTo(p.x - hw * 0.78, beamY - s * 0.24);
      ctx.closePath();
      ctx.fill();
      // Plank seams down the near pitch.
      ctx.strokeStyle = 'rgba(58, 40, 20, 0.45)';
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (const f of [-0.62, -0.24, 0.18, 0.56]) {
        ctx.beginPath();
        ctx.moveTo(p.x + f * hw, beamY - s * 0.05 - Math.abs(f) * 0 - (1 - Math.abs(f)) * s * 0.0);
        ctx.moveTo(p.x + f * hw * 1.06, beamY - s * 0.06 + Math.abs(f) * s * 0.0);
        ctx.lineTo(p.x + f * hw * 0.8, beamY - s * 0.2 - (1 - Math.abs(f)) * s * 0.14);
        ctx.stroke();
      }
      // THE YOKE: an iron crown strap — the bell hangs from
      // metal, and the eye reads the joint.
      ctx.fillStyle = TWN_IRON;
      ctx.fillRect(p.x - s * 0.05, beamY + s * 0.055, s * 0.1, s * 0.075);
      ctx.fillStyle = shade(TWN_IRON, 18);
      ctx.fillRect(p.x - s * 0.05, beamY + s * 0.055, s * 0.032, s * 0.075);
      // THE BELL: the piece's whole argument, and now its whole
      // silhouette — crown dome, waisted body, and a THICK
      // flared sound bow, cast in golden bronze no oak could
      // fake. Ink underlay first (the cart-wheel law) so the
      // bell keeps its flat-art line where it laps the braces.
      const bx = p.x;
      const bellTop = beamY + s * 0.12;
      const mouthY = bellTop + s * 0.74;
      const bellPath = (grow: number) => {
        ctx.beginPath();
        ctx.moveTo(bx - s * 0.13 - grow, bellTop - grow * 0.5);
        ctx.quadraticCurveTo(bx - s * 0.24 - grow, bellTop + s * 0.06, bx - s * 0.245 - grow, bellTop + s * 0.26);
        ctx.quadraticCurveTo(bx - s * 0.25 - grow, bellTop + s * 0.5, bx - s * 0.34 - grow, mouthY - s * 0.1);
        ctx.quadraticCurveTo(bx - s * 0.375 - grow, mouthY - s * 0.015, bx - s * 0.36 - grow, mouthY + grow);
        ctx.lineTo(bx + s * 0.36 + grow, mouthY + grow);
        ctx.quadraticCurveTo(bx + s * 0.375 + grow, mouthY - s * 0.015, bx + s * 0.34 + grow, mouthY - s * 0.1);
        ctx.quadraticCurveTo(bx + s * 0.25 + grow, bellTop + s * 0.5, bx + s * 0.245 + grow, bellTop + s * 0.26);
        ctx.quadraticCurveTo(bx + s * 0.24 + grow, bellTop + s * 0.06, bx + s * 0.13 + grow, bellTop - grow * 0.5);
        ctx.closePath();
      };
      // No ink underlay here (outline-consistency law): the
      // bell hangs in air on every side, and the outline pass
      // already rings air-facing edges — a bed under it just
      // doubled the line weight against the rest of the town.
      ctx.fillStyle = BZ;
      bellPath(0);
      ctx.fill();
      // The east shade: the body rolls off the light.
      ctx.fillStyle = BZ_DARK;
      ctx.beginPath();
      ctx.moveTo(bx + s * 0.13, bellTop);
      ctx.quadraticCurveTo(bx + s * 0.245, bellTop + s * 0.1, bx + s * 0.245, bellTop + s * 0.26);
      ctx.quadraticCurveTo(bx + s * 0.25, bellTop + s * 0.5, bx + s * 0.34, mouthY - s * 0.1);
      ctx.quadraticCurveTo(bx + s * 0.355, mouthY - s * 0.03, bx + s * 0.35, mouthY - s * 0.005);
      ctx.lineTo(bx + s * 0.21, mouthY - s * 0.005);
      ctx.quadraticCurveTo(bx + s * 0.16, bellTop + s * 0.42, bx + s * 0.1, bellTop + s * 0.02);
      ctx.closePath();
      ctx.fill();
      // The one hard west light (the mithril lesson): a bold
      // band riding the crown-to-bow curve.
      ctx.fillStyle = BZ_LIT;
      ctx.beginPath();
      ctx.moveTo(bx - s * 0.1, bellTop + s * 0.015);
      ctx.quadraticCurveTo(bx - s * 0.2, bellTop + s * 0.1, bx - s * 0.2, bellTop + s * 0.28);
      ctx.quadraticCurveTo(bx - s * 0.2, bellTop + s * 0.5, bx - s * 0.285, mouthY - s * 0.09);
      ctx.lineTo(bx - s * 0.2, mouthY - s * 0.09);
      ctx.quadraticCurveTo(bx - s * 0.135, bellTop + s * 0.42, bx - s * 0.13, bellTop + s * 0.24);
      ctx.quadraticCurveTo(bx - s * 0.128, bellTop + s * 0.1, bx - s * 0.04, bellTop + s * 0.02);
      ctx.closePath();
      ctx.fill();
      // The incised bands a founder strikes: shoulder and bow.
      ctx.strokeStyle = 'rgba(74, 58, 26, 0.65)';
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.moveTo(bx - s * 0.24, bellTop + s * 0.2);
      ctx.quadraticCurveTo(bx, bellTop + s * 0.27, bx + s * 0.24, bellTop + s * 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx - s * 0.315, mouthY - s * 0.14);
      ctx.quadraticCurveTo(bx, mouthY - s * 0.06, bx + s * 0.315, mouthY - s * 0.14);
      ctx.stroke();
      // The sound bow's lip: one bright struck edge.
      ctx.strokeStyle = BZ_LIT;
      ctx.lineWidth = Math.max(1, s * 0.018);
      ctx.beginPath();
      ctx.moveTo(bx - s * 0.34, mouthY - s * 0.03);
      ctx.quadraticCurveTo(bx, mouthY + s * 0.03, bx + s * 0.34, mouthY - s * 0.03);
      ctx.stroke();
      // THE MOUTH: the dark the camera looks into, and the
      // clapper hanging past the lip — the read that this
      // thing RINGS.
      ctx.fillStyle = '#3a2e16';
      ctx.beginPath();
      ctx.ellipse(bx, mouthY, s * 0.36, s * 0.085, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#241a2e';
      ctx.beginPath();
      ctx.ellipse(bx, mouthY, s * 0.28, s * 0.06, 0, 0, Math.PI);
      ctx.fill();
      ctx.strokeStyle = TWN_IRON;
      ctx.lineWidth = Math.max(1, s * 0.022);
      ctx.beginPath();
      ctx.moveTo(bx, mouthY);
      ctx.lineTo(bx, mouthY + s * 0.075);
      ctx.stroke();
      ctx.fillStyle = TWN_IRON;
      ctx.beginPath();
      ctx.ellipse(bx, mouthY + s * 0.1, s * 0.05, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(TWN_IRON, 22);
      ctx.beginPath();
      ctx.ellipse(bx - s * 0.016, mouthY + s * 0.088, s * 0.018, s * 0.018, 0, 0, Math.PI * 2);
      ctx.fill();
      // Verdigris in the crown seam — kept, but old.
      ctx.fillStyle = 'rgba(95, 155, 132, 0.45)';
      ctx.beginPath();
      ctx.moveTo(bx + s * 0.05, bellTop + s * 0.03);
      ctx.quadraticCurveTo(bx + s * 0.1, bellTop + s * 0.12, bx + s * 0.08, bellTop + s * 0.24);
      ctx.lineTo(bx + s * 0.045, bellTop + s * 0.24);
      ctx.quadraticCurveTo(bx + s * 0.06, bellTop + s * 0.12, bx + s * 0.02, bellTop + s * 0.03);
      ctx.closePath();
      ctx.fill();
      // THE PULL ROPE: off the headstock end, swaying on the
      // breeze clock, a grip knot at reach height.
      const sway = Math.sin(t * 0.9 + tx * 1.7 + ty * 1.1) * 0.06;
      ctx.save();
      ctx.translate(p.x + hw * 0.52, beamY + s * 0.06);
      ctx.rotate(sway);
      ctx.strokeStyle = TWN_ROPE;
      ctx.lineWidth = Math.max(1, s * 0.022);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(s * 0.022, s * 0.55, 0, s * 1.06);
      ctx.stroke();
      ctx.fillStyle = TWN_ROPE;
      ctx.beginPath();
      ctx.ellipse(0, s * 0.92, s * 0.03, s * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(TWN_ROPE, 14);
      ctx.beginPath();
      ctx.ellipse(-s * 0.008, s * 0.905, s * 0.013, s * 0.028, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
  };
}

function paintHandCart(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // THE MERCHANT'S CART, parked mid-round: the camera finally
  // gets what it is owed — a DEEP foreshortened deck (the
  // crate-lid treatment at cart scale) carrying a merchant's
  // goods you read from above: dyed bolts, an iron-banded
  // chest, the plump sack. One true axle: the near wheel a
  // full shod ring proud of the bed, the far wheel's crown
  // showing over the deck's back edge. Shafts down and
  // resting, a stone chocking the wheel — somebody is coming
  // BACK for this (the kept law).
  const hw = s * 0.62;
  const bedY = baseY - s * 0.46;
  const deep = s * 0.26;
  const skew = s * 0.09;
  const railH = s * 0.15;
  const cloths = AWNING_CLOTHS;
  const trim = cloths[(h >>> 4) % 10]!;
  const boltA = cloths[(((h >>> 4) % 10) + 3) % 10]!;
  const boltB = cloths[(((h >>> 4) % 10) + 6) % 10]!;
  return {
    sortY: ty + 0.7,
    body: stationBody(1.1, 1.05, 0.5),
    drawShadow: () => rend.castContact(p.x - s * 0.06, baseY, s * 0.85, s * 0.08),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x - s * 0.04, baseY + s * 0.02, s * 0.92, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE FAR WHEEL first: its crown rides above the deck's
      // back edge — the axle's honest second half.
      const wxF = p.x + s * 0.1 + skew;
      const wyF = baseY - s * 0.3 - deep * 0.85;
      const wrF = s * 0.32;
      // THE WHEEL WEARS ITS OWN LINE (user verdict): the
      // outline pass inks only the sprite's outer silhouette,
      // so a wheel lapping the bed lost its edge mid-arc.
      // Wheels are external items — each rim rides its own
      // full ring, painted in the pass's own ink so the two
      // lines are one voice.
      ctx.strokeStyle = '#241a2e';
      ctx.lineWidth = Math.max(3, s * 0.125);
      ctx.beginPath();
      ctx.ellipse(wxF, wyF, wrF, wrF * 1.02, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = shade(TWN_OAK_DARK, -12);
      ctx.lineWidth = Math.max(1.5, s * 0.048);
      ctx.beginPath();
      ctx.ellipse(wxF, wyF, wrF, wrF * 1.02, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = shade(TWN_OAK, -14);
      ctx.lineWidth = Math.max(1, s * 0.02);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI + 0.4;
        ctx.beginPath();
        ctx.moveTo(wxF - Math.cos(a) * wrF * 0.85, wyF - Math.sin(a) * wrF * 0.85);
        ctx.lineTo(wxF + Math.cos(a) * wrF * 0.85, wyF + Math.sin(a) * wrF * 0.85);
        ctx.stroke();
      }
      // THE DECK: the cart's top plane, deep enough to stand
      // goods on (the 2.5D law) — planked lengthwise, back
      // edge drifting east with the camera.
      ctx.fillStyle = shade(TWN_OAK_LIT, -6);
      ctx.beginPath();
      ctx.moveTo(p.x - hw, bedY);
      ctx.lineTo(p.x - hw + skew, bedY - deep);
      ctx.lineTo(p.x + hw + skew, bedY - deep);
      ctx.lineTo(p.x + hw, bedY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(90, 64, 34, 0.45)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      for (let k = 1; k < 3; k++) {
        const f = k / 3;
        ctx.beginPath();
        ctx.moveTo(p.x - hw + skew * f, bedY - deep * f);
        ctx.lineTo(p.x + hw + skew * f, bedY - deep * f);
        ctx.stroke();
      }
      // The far rail: a low carved lip on the deck's back edge.
      ctx.fillStyle = shade(TWN_OAK, -10);
      ctx.fillRect(p.x - hw + skew, bedY - deep - s * 0.05, hw * 2, s * 0.05);
      // The east end cap: the bed's thickness turned to the camera.
      ctx.fillStyle = shade(TWN_OAK, -8);
      ctx.beginPath();
      ctx.moveTo(p.x + hw, bedY);
      ctx.lineTo(p.x + hw + skew, bedY - deep);
      ctx.lineTo(p.x + hw + skew, bedY - deep + railH);
      ctx.lineTo(p.x + hw, bedY + railH);
      ctx.closePath();
      ctx.fill();
      // THE SIDE BOARD: low, carved, and PAINTED — the trim
      // stripe wears a town dye (a merchant advertises), iron
      // corner brackets holding the joinery.
      ctx.fillStyle = TWN_OAK;
      ctx.fillRect(p.x - hw, bedY, hw * 2, railH);
      ctx.strokeStyle = 'rgba(60, 44, 24, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.011);
      ctx.beginPath();
      ctx.moveTo(p.x - hw, bedY + railH * 0.52);
      ctx.lineTo(p.x + hw, bedY + railH * 0.52);
      ctx.stroke();
      ctx.fillStyle = trim.a;
      ctx.fillRect(p.x - hw + s * 0.05, bedY + railH * 0.3, hw * 2 - s * 0.1, s * 0.032);
      for (const m of [-1, 1] as const) {
        ctx.strokeStyle = TWN_IRON;
        ctx.lineWidth = Math.max(1, s * 0.018);
        ctx.beginPath();
        ctx.moveTo(p.x + m * (hw - s * 0.02), bedY + s * 0.015);
        ctx.lineTo(p.x + m * (hw - s * 0.02), bedY + railH - s * 0.015);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x + m * (hw - s * 0.06), bedY + s * 0.02);
        ctx.lineTo(p.x + m * (hw - s * 0.015), bedY + s * 0.02);
        ctx.stroke();
      }
      // The deck's front arris catches the sun.
      ctx.fillStyle = '#d8b988';
      ctx.fillRect(p.x - hw, bedY - s * 0.012, hw * 2, s * 0.018);
      // THE LOAD, read from above on the deck plane:
      // the sack at the west end, leaning into the corner.
      {
        const sx2 = p.x - hw * 0.68;
        const sy2 = bedY - deep * 0.45;
        ctx.fillStyle = 'rgba(40, 28, 14, 0.3)';
        ctx.beginPath();
        ctx.ellipse(sx2 + s * 0.02, sy2 + s * 0.055, s * 0.14, s * 0.045, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = TWN_BURLAP;
        ctx.beginPath();
        ctx.moveTo(sx2 - s * 0.13, sy2 + s * 0.06);
        ctx.quadraticCurveTo(sx2 - s * 0.17, sy2 - s * 0.12, sx2 - s * 0.05, sy2 - s * 0.2);
        ctx.quadraticCurveTo(sx2 + s * 0.02, sy2 - s * 0.26, sx2 + s * 0.07, sy2 - s * 0.2);
        ctx.quadraticCurveTo(sx2 + s * 0.16, sy2 - s * 0.1, sx2 + s * 0.13, sy2 + s * 0.06);
        ctx.quadraticCurveTo(sx2, sy2 + s * 0.1, sx2 - s * 0.13, sy2 + s * 0.06);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = TWN_BURLAP_LIT;
        ctx.beginPath();
        ctx.ellipse(sx2 - s * 0.05, sy2 - s * 0.14, s * 0.05, s * 0.035, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = TWN_ROPE;
        ctx.lineWidth = Math.max(1, s * 0.013);
        ctx.beginPath();
        ctx.moveTo(sx2 - s * 0.02, sy2 - s * 0.225);
        ctx.lineTo(sx2 + s * 0.05, sy2 - s * 0.215);
        ctx.stroke();
      }
      // Two bolts of dyed cloth lying across the bed — the
      // rolls read from above: long bodies, wound ends facing
      // the street, no two dyes in the same family.
      for (const [bi, dye] of [boltA, boltB].entries()) {
        const bx2 = p.x - hw * 0.02 + bi * s * 0.16;
        const by2 = bedY - deep * (0.88 - bi * 0.3);
        const bl = s * 0.24;
        const br2 = s * 0.075;
        ctx.fillStyle = 'rgba(40, 28, 14, 0.28)';
        ctx.beginPath();
        ctx.ellipse(bx2 + s * 0.01, by2 + br2 * 0.9, bl * 0.9, s * 0.03, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(bx2, by2);
        ctx.rotate(-0.06 + bi * 0.1);
        ctx.fillStyle = dye.a;
        ctx.beginPath();
        ctx.moveTo(-bl, -br2);
        ctx.lineTo(bl * 0.92, -br2);
        ctx.quadraticCurveTo(bl * 1.12, 0, bl * 0.92, br2);
        ctx.lineTo(-bl, br2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(250, 244, 228, 0.28)';
        ctx.fillRect(-bl, -br2, bl * 1.9, br2 * 0.55);
        ctx.fillStyle = dye.b;
        ctx.beginPath();
        ctx.ellipse(bl * 0.98, 0, br2 * 0.5, br2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = dye.a;
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.ellipse(bl * 0.98, 0, br2 * 0.22, br2 * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      // The strongbox at the east end: iron-banded, hasped —
      // its own small lid plane keeps the law.
      {
        const cx2 = p.x + hw * 0.72;
        const cy2 = bedY - deep * 0.55;
        const cw2 = s * 0.17;
        const chh = s * 0.17;
        ctx.fillStyle = 'rgba(40, 28, 14, 0.3)';
        ctx.beginPath();
        ctx.ellipse(cx2, cy2 + s * 0.02, cw2 * 1.1, s * 0.035, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(TWN_OAK, -4);
        ctx.fillRect(cx2 - cw2, cy2 - chh, cw2 * 2, chh);
        ctx.fillStyle = shade(TWN_OAK_LIT, -2);
        ctx.beginPath();
        ctx.moveTo(cx2 - cw2, cy2 - chh);
        ctx.lineTo(cx2 - cw2 + s * 0.05, cy2 - chh - s * 0.07);
        ctx.lineTo(cx2 + cw2 + s * 0.05, cy2 - chh - s * 0.07);
        ctx.lineTo(cx2 + cw2, cy2 - chh);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = TWN_IRON;
        ctx.lineWidth = Math.max(1, s * 0.02);
        for (const fx2 of [-0.55, 0.55] as const) {
          ctx.beginPath();
          ctx.moveTo(cx2 + fx2 * cw2, cy2 - chh - s * 0.055);
          ctx.lineTo(cx2 + fx2 * cw2, cy2);
          ctx.stroke();
        }
        ctx.fillStyle = TWN_BRONZE_LIT;
        ctx.fillRect(cx2 - s * 0.02, cy2 - chh * 0.62, s * 0.04, s * 0.05);
      }
      // Straw wisps drifted between the goods.
      ctx.strokeStyle = 'rgba(216, 196, 154, 0.7)';
      ctx.lineWidth = Math.max(1, s * 0.009);
      for (let k = 0; k < 3; k++) {
        const kx = p.x - hw * 0.3 + ((h >>> (k + 2)) & 7) * hw * 0.12;
        const ky = bedY - deep * (0.2 + ((h >>> k) & 1) * 0.25);
        ctx.beginPath();
        ctx.moveTo(kx, ky);
        ctx.quadraticCurveTo(kx + s * 0.03, ky - s * 0.02, kx + s * 0.06, ky - s * 0.005);
        ctx.stroke();
      }
      // THE SHAFTS: down and resting — near and far, joined by
      // the pull bar, iron ferrules at the tips.
      for (const [si, lift] of [0, 1].entries()) {
        const y0 = bedY + railH * 0.6 - lift * s * 0.12;
        const x0 = p.x - hw + s * 0.03 + lift * skew * 0.6;
        const x1 = p.x - hw - s * 0.36 + lift * skew * 0.6;
        const y1 = baseY - s * 0.015 - lift * s * 0.1;
        ctx.strokeStyle = si === 0 ? TWN_OAK : shade(TWN_OAK, -12);
        ctx.lineWidth = Math.max(1.5, s * 0.034);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.strokeStyle = TWN_IRON;
        ctx.lineWidth = Math.max(1, s * 0.02);
        ctx.beginPath();
        ctx.moveTo(x1 + s * 0.015, y1 - s * 0.008);
        ctx.lineTo(x1 - s * 0.012, y1 + s * 0.006);
        ctx.stroke();
      }
      ctx.strokeStyle = shade(TWN_OAK, 8);
      ctx.lineWidth = Math.max(1.5, s * 0.026);
      ctx.beginPath();
      ctx.moveTo(p.x - hw - s * 0.36, baseY - s * 0.015);
      ctx.lineTo(p.x - hw - s * 0.36 + skew * 0.6, baseY - s * 0.115);
      ctx.stroke();
      // THE NEAR WHEEL: the cart's proud read — iron-shod
      // felloe ring, eight spokes, hub with an iron cap.
      const wx = p.x + s * 0.1;
      const wy = baseY - s * 0.3;
      const wr = s * 0.34;
      // The near wheel's own ring first (the wheel-wears-its-
      // own-line law): one wide band of the outline ink under
      // the rim, so both the tyre's outer edge and the
      // felloe's inner edge stay inked across the bed and the
      // cargo, full circle.
      ctx.strokeStyle = '#241a2e';
      ctx.lineWidth = Math.max(3, s * 0.175);
      ctx.beginPath();
      ctx.ellipse(wx, wy, wr - s * 0.02, (wr - s * 0.02) * 1.03, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = TWN_IRON;
      ctx.lineWidth = Math.max(2, s * 0.05);
      ctx.beginPath();
      ctx.ellipse(wx, wy, wr, wr * 1.03, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = TWN_OAK;
      ctx.lineWidth = Math.max(1.5, s * 0.045);
      ctx.beginPath();
      ctx.ellipse(wx, wy, wr - s * 0.045, (wr - s * 0.045) * 1.03, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = shade(TWN_OAK, 6);
      ctx.lineWidth = Math.max(1, s * 0.022);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI + 0.2;
        ctx.beginPath();
        ctx.moveTo(wx - Math.cos(a) * (wr - s * 0.07), wy - Math.sin(a) * (wr - s * 0.07) * 1.03);
        ctx.lineTo(wx + Math.cos(a) * (wr - s * 0.07), wy + Math.sin(a) * (wr - s * 0.07) * 1.03);
        ctx.stroke();
      }
      // The hub takes its own ink disc under the wood — the
      // wheel's center reads as an object even over the bolts.
      ctx.fillStyle = '#241a2e';
      ctx.beginPath();
      ctx.ellipse(wx, wy, s * 0.095, s * 0.095, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.beginPath();
      ctx.ellipse(wx, wy, s * 0.075, s * 0.075, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = TWN_IRON;
      ctx.beginPath();
      ctx.ellipse(wx, wy, s * 0.036, s * 0.036, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(222, 226, 234, 0.7)';
      ctx.beginPath();
      ctx.ellipse(wx - s * 0.012, wy - s * 0.012, s * 0.011, s * 0.011, 0, 0, Math.PI * 2);
      ctx.fill();
      // The shod tyre's sun arc.
      ctx.strokeStyle = 'rgba(210, 212, 220, 0.45)';
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.ellipse(wx, wy, wr, wr * 1.03, 0, Math.PI * 1.1, Math.PI * 1.65);
      ctx.stroke();
      // The chock: a stone wedged at the wheel's foot.
      ctx.fillStyle = TWN_STONE_DARK;
      ctx.beginPath();
      facetBlob(ctx, wx + wr * 0.75, baseY - s * 0.025, s * 0.05, h ^ 91, 5, 0.65);
      ctx.fill();
      ctx.fillStyle = TWN_STONE;
      ctx.beginPath();
      facetBlob(ctx, wx + wr * 0.73, baseY - s * 0.04, s * 0.028, h ^ 47, 4, 0.6);
      ctx.fill();
    },
  };
}

function paintGrainSacks(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.16;
  // Kept stores — the town's clean answer to the war camp's
  // plunder: the miller's court. Plump sacks TIED and standing
  // on a duckboard pallet (grain never sits on wet ground), one
  // open with the wooden scoop lying in the heap, the mill's
  // mark stenciled on the proudest. Wealth you can eat, stacked
  // the way a miller stacks it.
  const hw = s * 0.5;
  return {
    sortY: ty + 0.65,
    body: stationBody(0.85, 0.85, 0.45),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.3, s * 0.075),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.015, hw * 1.35, s * 0.075, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE PALLET: a LOW duckboard on two skid feet — deck top
      // lit (the 2.5D law: a flat stage the sacks stand ON), a
      // thin board edge, and ground showing between the skids
      // so it reads as a pallet SET DOWN, never a shelf afloat.
      const pw = hw * 1.2;
      const pTop = baseY - s * 0.062;
      ctx.fillStyle = TWN_OAK_DARK;
      for (const m of [-1, 1] as const) {
        ctx.fillRect(p.x + m * pw * 0.8 - s * 0.045, pTop + s * 0.028, s * 0.09, baseY - pTop - s * 0.018);
      }
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.fillRect(p.x - pw, pTop, pw * 2, s * 0.03);
      ctx.fillStyle = TWN_OAK;
      ctx.fillRect(p.x - pw, pTop - s * 0.028, pw * 2, s * 0.032);
      ctx.strokeStyle = 'rgba(60, 42, 22, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      for (const gx of [-0.45, 0.05, 0.55] as const) {
        ctx.beginPath();
        ctx.moveTo(p.x + pw * gx, pTop - s * 0.028);
        ctx.lineTo(p.x + pw * gx, pTop + s * 0.002);
        ctx.stroke();
      }
      // Loose straw drifted against the skids — the ground
      // holding what stands on it.
      ctx.strokeStyle = 'rgba(216, 196, 154, 0.75)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      for (let k = 0; k < 4; k++) {
        const wx = p.x - pw * 0.9 + ((h >>> (k + 3)) & 7) * pw * 0.26;
        const wy = baseY + s * 0.01 - ((h >>> (k + 1)) & 1) * s * 0.015;
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.quadraticCurveTo(wx + s * 0.035, wy - s * 0.03, wx + s * 0.07, wy - s * 0.008);
        ctx.stroke();
      }
      // THE SACKS: three tied, one open. Each tied sack is a
      // plump gourd — belly widest at the bottom third, a
      // rounded shoulder, a rope-whipped neck, and two soft
      // ears above the tie. The rear pair lean into each other;
      // the front one stands proud and wears the mill's mark.
      const sackAt = (
        sx: number,
        sy: number,
        r: number,
        lean: number,
        lit: boolean,
        marked: boolean,
      ) => {
        const cx = p.x + sx * hw * 2;
        const cy = pTop - s * 0.024 + sy * s;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(lean);
        const body = lit ? TWN_BURLAP_LIT : TWN_BURLAP;
        // The body: belly, shoulder, and a short cinched neck.
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.moveTo(-r * 0.6, 0);
        ctx.quadraticCurveTo(-r * 0.74, -r * 0.42, -r * 0.5, -r * 0.78);
        ctx.quadraticCurveTo(-r * 0.34, -r * 0.98, -r * 0.14, -r * 1.02);
        ctx.lineTo(r * 0.14, -r * 1.02);
        ctx.quadraticCurveTo(r * 0.34, -r * 0.98, r * 0.5, -r * 0.78);
        ctx.quadraticCurveTo(r * 0.74, -r * 0.42, r * 0.6, 0);
        ctx.quadraticCurveTo(0, r * 0.08, -r * 0.6, 0);
        ctx.closePath();
        ctx.fill();
        // Base crease: the weight settling into the boards.
        ctx.fillStyle = 'rgba(60, 42, 22, 0.28)';
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.02, r * 0.56, r * 0.09, 0, 0, Math.PI);
        ctx.fill();
        // The lit flank and the shade flank: cloth is round.
        ctx.fillStyle = 'rgba(244, 228, 188, 0.32)';
        ctx.beginPath();
        ctx.moveTo(-r * 0.52, -r * 0.24);
        ctx.quadraticCurveTo(-r * 0.62, -r * 0.56, -r * 0.4, -r * 0.84);
        ctx.quadraticCurveTo(-r * 0.44, -r * 0.5, -r * 0.36, -r * 0.24);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(70, 50, 26, 0.2)';
        ctx.beginPath();
        ctx.moveTo(r * 0.56, -r * 0.16);
        ctx.quadraticCurveTo(r * 0.68, -r * 0.48, r * 0.44, -r * 0.82);
        ctx.quadraticCurveTo(r * 0.56, -r * 0.44, r * 0.4, -r * 0.14);
        ctx.closePath();
        ctx.fill();
        // The center seam, stitched (dashes, never a hard rule).
        ctx.strokeStyle = 'rgba(120, 96, 58, 0.55)';
        ctx.lineWidth = Math.max(1, s * 0.008);
        for (let d = 0; d < 4; d++) {
          ctx.beginPath();
          ctx.moveTo(-r * 0.02, -r * (0.16 + d * 0.2));
          ctx.lineTo(r * 0.02, -r * (0.22 + d * 0.2));
          ctx.stroke();
        }
        // THE TIE: rope whipping in two snug turns + the knot
        // tail, then the ears fanning soft above it.
        ctx.strokeStyle = TWN_ROPE;
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(-r * 0.17, -r * 1.0);
        ctx.lineTo(r * 0.17, -r * 1.0);
        ctx.moveTo(-r * 0.16, -r * 1.05);
        ctx.lineTo(r * 0.16, -r * 1.05);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(r * 0.14, -r * 1.02);
        ctx.quadraticCurveTo(r * 0.26, -r * 0.96, r * 0.22, -r * 0.86);
        ctx.stroke();
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.moveTo(-r * 0.13, -r * 1.06);
        ctx.quadraticCurveTo(-r * 0.26, -r * 1.3, -r * 0.05, -r * 1.16);
        ctx.quadraticCurveTo(-r * 0.02, -r * 1.08, -r * 0.13, -r * 1.06);
        ctx.moveTo(r * 0.13, -r * 1.06);
        ctx.quadraticCurveTo(r * 0.24, -r * 1.32, r * 0.03, -r * 1.16);
        ctx.quadraticCurveTo(r * 0.01, -r * 1.08, r * 0.13, -r * 1.06);
        ctx.fill();
        // The mill's mark: a stenciled wheat sheaf — three
        // stalks fanning from a tie bar, rust madder gone soft
        // with handling. Only the proud front sack wears it.
        if (marked) {
          ctx.strokeStyle = 'rgba(154, 82, 64, 0.7)';
          ctx.lineWidth = Math.max(1, s * 0.014);
          for (const a of [-0.45, 0, 0.45] as const) {
            ctx.beginPath();
            ctx.moveTo(0, -r * 0.34);
            ctx.lineTo(Math.sin(a) * r * 0.2, -r * 0.62);
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.moveTo(-r * 0.12, -r * 0.4);
          ctx.lineTo(r * 0.12, -r * 0.4);
          ctx.stroke();
        }
        ctx.restore();
      };
      // Rear pair leaning together, then the marked front sack.
      sackAt(-0.4, 0, s * 0.2, -0.09, false, false);
      sackAt(-0.06, -0.01, s * 0.19, 0.11, true, false);
      sackAt(-0.23, 0.01, s * 0.23, 0.015, true, true);
      // THE OPEN SACK: cuff rolled fat, the grain heaped to a
      // crest, and the SCOOP planted working — iron pan half
      // buried, oak handle raked, one crisp light on the rim
      // (metal earns its read with an edge, not a gradient).
      const ox = p.x + hw * 0.82;
      const oTop = pTop - s * 0.36;
      ctx.fillStyle = TWN_BURLAP;
      ctx.beginPath();
      ctx.moveTo(ox - s * 0.16, pTop - s * 0.02);
      ctx.quadraticCurveTo(ox - s * 0.19, oTop + s * 0.16, ox - s * 0.14, oTop);
      ctx.lineTo(ox + s * 0.14, oTop);
      ctx.quadraticCurveTo(ox + s * 0.19, oTop + s * 0.16, ox + s * 0.16, pTop - s * 0.02);
      ctx.quadraticCurveTo(ox, pTop + s * 0.015, ox - s * 0.16, pTop - s * 0.02);
      ctx.closePath();
      ctx.fill();
      // One soft slump fold down the cylinder's west side.
      ctx.strokeStyle = 'rgba(120, 96, 58, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(ox - s * 0.1, oTop + s * 0.07);
      ctx.quadraticCurveTo(ox - s * 0.13, oTop + s * 0.2, ox - s * 0.09, pTop - s * 0.05);
      ctx.stroke();
      // The rolled cuff: a fat lit torus over a shaded throat.
      ctx.fillStyle = 'rgba(70, 50, 26, 0.5)';
      ctx.beginPath();
      ctx.ellipse(ox, oTop, s * 0.15, s * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = TWN_BURLAP_LIT;
      ctx.lineWidth = Math.max(1.5, s * 0.036);
      ctx.beginPath();
      ctx.ellipse(ox, oTop + s * 0.012, s * 0.155, s * 0.06, 0, 0, Math.PI * 2);
      ctx.stroke();
      // The grain: heaped past the rim, crest lit, kernels
      // speckled dark and light down the mound.
      ctx.fillStyle = TWN_GRAIN;
      ctx.beginPath();
      ctx.ellipse(ox, oTop - s * 0.012, s * 0.115, s * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ecd8a4';
      ctx.beginPath();
      ctx.ellipse(ox - s * 0.02, oTop - s * 0.026, s * 0.06, s * 0.022, -0.1, 0, Math.PI * 2);
      ctx.fill();
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = ((h >>> k) & 1) === 0 ? '#c9a25c' : '#ecd8a4';
        ctx.beginPath();
        ctx.ellipse(
          ox - s * 0.08 + ((h >>> (k + 2)) & 7) * s * 0.021,
          oTop - s * 0.03 + ((h >>> (k + 5)) & 3) * s * 0.012,
          s * 0.009,
          s * 0.007,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      // THE SCOOP: the miller's grain scoop lying half-sunk in
      // the heap — pale carved bowl with its open MOUTH toward
      // the street (dark hollow, bright lip: a scoop is a
      // vessel, and the void is what says so), iron ferrule at
      // the heel, short oak handle raked up-east with a knob.
      // Never a blade silhouette: the butcher's cleaver two
      // doors down already owns that read.
      ctx.strokeStyle = TWN_OAK;
      ctx.lineWidth = Math.max(1.5, s * 0.024);
      ctx.beginPath();
      ctx.moveTo(ox + s * 0.05, oTop - s * 0.08);
      ctx.lineTo(ox + s * 0.125, oTop - s * 0.25);
      ctx.stroke();
      ctx.strokeStyle = TWN_OAK_LIT;
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(ox + s * 0.043, oTop - s * 0.084);
      ctx.lineTo(ox + s * 0.118, oTop - s * 0.25);
      ctx.stroke();
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.beginPath();
      ctx.ellipse(ox + s * 0.13, oTop - s * 0.262, s * 0.02, s * 0.015, 0.9, 0, Math.PI * 2);
      ctx.fill();
      // The bowl shell, heel under the handle, belly in the grain.
      ctx.fillStyle = '#d9bd8d';
      ctx.beginPath();
      ctx.moveTo(ox - s * 0.09, oTop - s * 0.078);
      ctx.quadraticCurveTo(ox - s * 0.005, oTop - s * 0.118, ox + s * 0.052, oTop - s * 0.088);
      ctx.quadraticCurveTo(ox + s * 0.068, oTop - s * 0.05, ox + s * 0.03, oTop - s * 0.016);
      ctx.quadraticCurveTo(ox - s * 0.03, oTop + s * 0.002, ox - s * 0.078, oTop - s * 0.028);
      ctx.closePath();
      ctx.fill();
      // The open mouth: dark hollow, bright near lip.
      ctx.fillStyle = 'rgba(74, 52, 28, 0.8)';
      ctx.beginPath();
      ctx.ellipse(ox - s * 0.078, oTop - s * 0.052, s * 0.02, s * 0.033, 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#efd9a8';
      ctx.lineWidth = Math.max(1, s * 0.011);
      ctx.beginPath();
      ctx.ellipse(ox - s * 0.082, oTop - s * 0.053, s * 0.019, s * 0.033, 0.35, Math.PI * 0.7, Math.PI * 1.8);
      ctx.stroke();
      // The iron ferrule where handle meets heel — one dark
      // band, one crisp light (metal earns its read with an edge).
      ctx.save();
      ctx.translate(ox + s * 0.048, oTop - s * 0.078);
      ctx.rotate(-1.15);
      ctx.fillStyle = TWN_IRON;
      ctx.fillRect(-s * 0.02, -s * 0.016, s * 0.04, s * 0.032);
      ctx.strokeStyle = 'rgba(222, 226, 234, 0.85)';
      ctx.lineWidth = Math.max(1, s * 0.009);
      ctx.beginPath();
      ctx.moveTo(-s * 0.016, -s * 0.012);
      ctx.lineTo(s * 0.016, -s * 0.012);
      ctx.stroke();
      ctx.restore();
      // Two kernels resting on the bowl's back.
      ctx.fillStyle = '#c9a25c';
      ctx.beginPath();
      ctx.ellipse(ox - s * 0.02, oTop - s * 0.09, s * 0.009, s * 0.007, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ecd8a4';
      ctx.beginPath();
      ctx.ellipse(ox + s * 0.005, oTop - s * 0.1, s * 0.008, s * 0.006, 0, 0, Math.PI * 2);
      ctx.fill();
      // The pour that missed: kernels arcing off the pallet's
      // east corner and onto the street.
      for (let k = 0; k < 7; k++) {
        ctx.fillStyle = ((h >>> (k + 1)) & 1) === 0 ? TWN_GRAIN : '#c9a25c';
        ctx.beginPath();
        ctx.ellipse(
          ox - s * 0.02 + ((h >>> k) & 7) * s * 0.028,
          baseY + s * 0.005 + ((h >>> (k + 3)) & 3) * s * 0.014,
          s * 0.011,
          s * 0.008,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    },
  };
}

function paintBarrelStack(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The cellar's street face — recast with the street barrel
  // from the ONE COOPER's own hand (paintStreetCask): two
  // upright casks shoulder to shoulder, a bearer plank across
  // their chimes, and a third cask crowning the middle. The
  // crown cask LAPS the pair, so it rides its own ink bed
  // (the cart-wheel law) and keeps its flat-art line where
  // the outline pass cannot reach.
  const hw = s * 0.5;
  // The cooper's variety, dealt: tone per cask, a lean for
  // the crown — never three rubber stamps.
  const tones: [number, number, number] =
    h % 3 === 0 ? [0, 6, -6] : h % 3 === 1 ? [6, -6, 0] : [-6, 0, 6];
  const lean = (((h >>> 4) & 3) - 1.5) * s * 0.02;
  const wr = s * 0.235;
  const bh = s * 0.6;
  return {
    sortY: ty + 0.7,
    // THE BOUNDS ARE THE CANVAS: the crown's chimed head tops
    // out near p.y - 1.3s — size the scratch for it or the
    // stack ships decapitated at the bake edge.
    body: stationBody(0.62, 1.45, 0.45),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.1, s * 0.075),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.12, s * 0.075, 0, 0, Math.PI * 2);
      ctx.fill();
      // The pair on the ground, a hair of settle between them.
      rend.paintStreetCask(p.x - s * 0.26, baseY, wr, bh, s, tones[0], h, {});
      rend.paintStreetCask(p.x + s * 0.26, baseY - s * 0.012, wr, bh, s, tones[1], h >>> 7, {});
      // The crevice where the bulges meet — two casks, not one.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
      ctx.fillRect(p.x - s * 0.012, baseY - bh * 0.86, s * 0.024, bh * 0.78);
      // The bearer plank across both chimes: the joinery that
      // makes the crown believable — nobody stands a cask on
      // two round rims.
      const plankY = baseY - bh - wr * 0.34 - s * 0.045;
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.fillRect(p.x - s * 0.46, plankY, s * 0.92, s * 0.05);
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.fillRect(p.x - s * 0.46, plankY, s * 0.92, s * 0.018);
      // Contact shade roots the crown to its plank.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x + lean, plankY + s * 0.008, wr * 0.82, s * 0.035, 0, 0, Math.PI * 2);
      ctx.fill();
      // The crown cask, leaned a dealt hair off true, on its
      // own ink bed where it laps the plank and the pair below
      // — clipped there, so its crown keeps the pass's line.
      rend.paintStreetCask(p.x + lean, plankY + s * 0.005, wr * 0.96, bh * 0.94, s, tones[2], h >>> 13, { ink: true, inkBelowY: plankY - s * 0.015 });
    },
  };
}

function paintCrateStack(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // Freight waiting to move — and CARPENTERED, never folded:
  // a crate is corner battens and slats with dark air between
  // them (the gaps are what say WOOD; a sealed face reads as
  // pasteboard, which this world has never made). Two crates
  // staggered so the bottom one's top plane shows, the coiled
  // lashing rope waiting on it, the top crate open over its
  // straw with the pried slat lid leaning back where the
  // inspector left it.
  const hw = s * 0.46;
  const midY = baseY - s * 0.4;
  const deep = s * 0.13;
  const skew = s * 0.07;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.72, 1.05, 0.45),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.15, s * 0.07),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.25, s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      // One slatted face: interior dark first, then slats with
      // true gaps, then the corner battens over the slat ends,
      // nail dots at every crossing.
      const crateFace = (x0: number, y0: number, w2: number, h2: number, tone: number, slats: number) => {
        ctx.fillStyle = 'rgba(22, 15, 8, 0.9)';
        ctx.fillRect(x0, y0, w2, h2);
        const gap = s * 0.018;
        const slatH = (h2 - gap * (slats - 1)) / slats;
        for (let k = 0; k < slats; k++) {
          ctx.fillStyle = shade(TWN_OAK, tone + (((h >>> (k * 3 + 1)) & 3) - 1) * 5);
          ctx.fillRect(x0, y0 + k * (slatH + gap), w2, slatH);
          ctx.fillStyle = 'rgba(250, 240, 214, 0.14)';
          ctx.fillRect(x0, y0 + k * (slatH + gap), w2, slatH * 0.28);
        }
        const bw2 = s * 0.055;
        for (const bx3 of [x0, x0 + w2 - bw2] as const) {
          ctx.fillStyle = shade(TWN_OAK_LIT, tone - 4);
          ctx.fillRect(bx3, y0, bw2, h2);
          ctx.fillStyle = 'rgba(60, 42, 22, 0.55)';
          ctx.fillRect(bx3 + (bx3 === x0 ? bw2 - s * 0.012 : 0), y0, s * 0.012, h2);
          ctx.fillStyle = TWN_IRON;
          for (const fy of [0.14, 0.86] as const) {
            ctx.beginPath();
            ctx.ellipse(bx3 + bw2 / 2, y0 + h2 * fy, s * 0.011, s * 0.011, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      };
      // THE BOTTOM CRATE: face, then its top plane — planked,
      // lit, the far edge shaded — with the lashing rope
      // coiled on the exposed east half (a lead coils, never
      // loops).
      crateFace(p.x - hw, midY, hw * 2, baseY - midY, 0, 3);
      ctx.fillStyle = shade(TWN_OAK_LIT, 4);
      ctx.beginPath();
      ctx.moveTo(p.x - hw, midY);
      ctx.lineTo(p.x - hw + skew, midY - deep);
      ctx.lineTo(p.x + hw + skew, midY - deep);
      ctx.lineTo(p.x + hw, midY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(70, 48, 24, 0.4)';
      ctx.beginPath();
      ctx.moveTo(p.x - hw + skew, midY - deep);
      ctx.lineTo(p.x + hw + skew, midY - deep);
      ctx.lineTo(p.x + hw + skew - s * 0.02, midY - deep + s * 0.025);
      ctx.lineTo(p.x - hw + skew - s * 0.02, midY - deep + s * 0.025);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(90, 64, 34, 0.45)';
      ctx.lineWidth = Math.max(1, s * 0.009);
      for (const fx3 of [-0.33, 0.33] as const) {
        ctx.beginPath();
        ctx.moveTo(p.x + fx3 * hw * 2 * 0.5, midY);
        ctx.lineTo(p.x + fx3 * hw * 2 * 0.5 + skew, midY - deep);
        ctx.stroke();
      }
      // The stencil rides the SLATS: the miller's ringed wheat
      // mark, paint worn where the grain of the boards breaks it.
      ctx.strokeStyle = 'rgba(52, 40, 24, 0.68)';
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.ellipse(p.x + hw * 0.5, (midY + baseY) / 2, s * 0.075, s * 0.075, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (const a of [-0.5, 0, 0.5] as const) {
        ctx.beginPath();
        ctx.moveTo(p.x + hw * 0.5, (midY + baseY) / 2 + s * 0.04);
        ctx.lineTo(p.x + hw * 0.5 + Math.sin(a) * s * 0.038, (midY + baseY) / 2 - s * 0.035);
        ctx.stroke();
      }
      // The coiled rope on the exposed plane.
      ctx.strokeStyle = TWN_ROPE;
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.ellipse(p.x + hw * 0.58 + skew * 0.6, midY - deep * 0.5, s * 0.062, s * 0.026, 0.05, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(p.x + hw * 0.58 + skew * 0.6, midY - deep * 0.55, s * 0.04, s * 0.017, 0.05, 0, Math.PI * 2);
      ctx.stroke();
      // THE TOP CRATE: smaller, seated west on the plane —
      // same carpentry, open over its straw.
      const tw = s * 0.3;
      const tx2 = p.x - hw * 0.32;
      const tBase = midY - deep * 0.5;
      const topY = tBase - s * 0.34;
      crateFace(tx2 - tw, topY, tw * 2, tBase - topY, 6, 2);
      // The open mouth: rim planks, dark void, straw heaped.
      ctx.fillStyle = shade(TWN_OAK, -14);
      ctx.beginPath();
      ctx.moveTo(tx2 - tw, topY);
      ctx.lineTo(tx2 - tw + skew, topY - deep * 0.8);
      ctx.lineTo(tx2 + tw + skew, topY - deep * 0.8);
      ctx.lineTo(tx2 + tw, topY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(20, 14, 8, 0.85)';
      ctx.beginPath();
      ctx.moveTo(tx2 - tw * 0.78, topY - s * 0.012);
      ctx.lineTo(tx2 - tw * 0.78 + skew * 0.7, topY - deep * 0.62);
      ctx.lineTo(tx2 + tw * 0.82 + skew * 0.7, topY - deep * 0.62);
      ctx.lineTo(tx2 + tw * 0.82, topY - s * 0.012);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TWN_GRAIN;
      ctx.beginPath();
      ctx.ellipse(tx2 + skew * 0.4, topY - deep * 0.34, tw * 0.6, s * 0.035, -0.03, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shade(TWN_GRAIN, -26);
      ctx.lineWidth = Math.max(1, s * 0.008);
      for (let k = 0; k < 3; k++) {
        const kx = tx2 - tw * 0.35 + k * tw * 0.35;
        ctx.beginPath();
        ctx.moveTo(kx, topY - deep * 0.42);
        ctx.lineTo(kx + s * 0.04, topY - deep * 0.18);
        ctx.stroke();
      }
      // One straw tuft escaping a face gap — the packing
      // showing through the carpentry.
      ctx.strokeStyle = 'rgba(216, 196, 154, 0.8)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(tx2 + tw * 0.55, topY + (tBase - topY) * 0.46);
      ctx.quadraticCurveTo(tx2 + tw * 0.75, topY + (tBase - topY) * 0.42, tx2 + tw * 0.85, topY + (tBase - topY) * 0.52);
      ctx.stroke();
      // THE LID, pried and leaning: a two-board slatted panel
      // with its cross batten, one nail still standing proud —
      // set back half-on where the inspector left it.
      ctx.save();
      ctx.translate(tx2 + tw * 0.72 + skew, topY - deep * 0.55);
      ctx.rotate(0.34);
      ctx.fillStyle = 'rgba(22, 15, 8, 0.85)';
      ctx.fillRect(-tw * 0.8, -s * 0.052, tw * 1.6, s * 0.104);
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.fillRect(-tw * 0.8, -s * 0.052, tw * 1.6, s * 0.044);
      ctx.fillStyle = shade(TWN_OAK_LIT, -7);
      ctx.fillRect(-tw * 0.8, s * 0.008, tw * 1.6, s * 0.044);
      ctx.fillStyle = shade(TWN_OAK, -4);
      ctx.fillRect(-tw * 0.14, -s * 0.052, s * 0.05, s * 0.104);
      ctx.strokeStyle = TWN_IRON;
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.beginPath();
      ctx.moveTo(tw * 0.58, -s * 0.052);
      ctx.lineTo(tw * 0.63, -s * 0.095);
      ctx.stroke();
      ctx.restore();
    },
  };
}

function paintHitchingPost(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.16;
  // The mounts' street furniture: a rail chewed by every horse
  // that ever waited here, two iron rings, one lead rope tied
  // off. Hay wisps and hoof-churn below — used TODAY, not once.
  const hw = s * 0.5;
  const railY = baseY - s * 0.68;
  return {
    sortY: ty + 0.65,
    body: stationBody(0.62, 0.9, 0.4),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.0, s * 0.055),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.2)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.05, s * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
      // The hoof-churn: dark dabs where the street gave up.
      ctx.fillStyle = 'rgba(74, 58, 38, 0.35)';
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.ellipse(p.x - hw * 0.6 + ((h >> k) & 7) * hw * 0.17, baseY - s * 0.02 + ((h >> (k + 3)) & 1) * s * 0.03, s * 0.05, s * 0.024, ((h >> k) & 3) * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      // Two posts with chamfered tops.
      for (const m of [-1, 1] as const) {
        ctx.fillStyle = TWN_OAK_DARK;
        ctx.fillRect(p.x + m * hw * 0.82 - s * 0.032, railY - s * 0.1, s * 0.064, baseY - railY + s * 0.1);
        ctx.fillStyle = TWN_OAK;
        ctx.fillRect(p.x + m * hw * 0.82 - s * 0.032, railY - s * 0.1, s * 0.025, baseY - railY + s * 0.1);
        ctx.fillStyle = TWN_OAK_LIT;
        ctx.beginPath();
        ctx.moveTo(p.x + m * hw * 0.82 - s * 0.032, railY - s * 0.1);
        ctx.lineTo(p.x + m * hw * 0.82, railY - s * 0.135);
        ctx.lineTo(p.x + m * hw * 0.82 + s * 0.032, railY - s * 0.1);
        ctx.closePath();
        ctx.fill();
      }
      // THE RAIL: one spanning member with chew notches bitten
      // out of the top edge — the silhouette tells the story.
      ctx.fillStyle = TWN_OAK;
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.94, railY);
      ctx.lineTo(p.x - hw * 0.4, railY);
      ctx.lineTo(p.x - hw * 0.33, railY + s * 0.022);
      ctx.lineTo(p.x - hw * 0.26, railY);
      ctx.lineTo(p.x + hw * 0.1, railY);
      ctx.lineTo(p.x + hw * 0.17, railY + s * 0.026);
      ctx.lineTo(p.x + hw * 0.25, railY);
      ctx.lineTo(p.x + hw * 0.94, railY);
      ctx.lineTo(p.x + hw * 0.94, railY + s * 0.075);
      ctx.lineTo(p.x - hw * 0.94, railY + s * 0.075);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.fillRect(p.x - hw * 0.94, railY + s * 0.052, hw * 1.88, s * 0.02);
      // Two iron rings staple-hung under the rail.
      ctx.strokeStyle = TWN_IRON;
      ctx.lineWidth = Math.max(1.5, s * 0.02);
      for (const rx2 of [-0.45, 0.35] as const) {
        ctx.beginPath();
        ctx.moveTo(p.x + hw * rx2, railY + s * 0.075);
        ctx.lineTo(p.x + hw * rx2, railY + s * 0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(p.x + hw * rx2, railY + s * 0.15, s * 0.04, s * 0.05, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // THE TIED LEAD — PASS-ONE VERDICT, A LEAD COILS, NEVER
      // LOOPS: the first build hung the rope in an open loop
      // under the rail and the whole prop read as a gallows.
      // The lead now wraps the rail in three snug turns with
      // one short frayed tail — a horseman's hitch, nothing
      // else.
      ctx.strokeStyle = TWN_ROPE;
      ctx.lineWidth = Math.max(1.5, s * 0.022);
      for (let k = 0; k < 3; k++) {
        const cx2 = p.x + hw * 0.55 + k * s * 0.035;
        ctx.beginPath();
        ctx.ellipse(cx2, railY + s * 0.038, s * 0.02, s * 0.055, 0.12, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(p.x + hw * 0.62, railY + s * 0.09);
      ctx.quadraticCurveTo(p.x + hw * 0.68, railY + s * 0.2, p.x + hw * 0.6, railY + s * 0.26);
      ctx.stroke();
      ctx.fillStyle = TWN_ROPE;
      ctx.beginPath();
      ctx.ellipse(p.x + hw * 0.6, railY + s * 0.28, s * 0.024, s * 0.03, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // Hay wisps: pale strokes drifted against the west post.
      ctx.strokeStyle = 'rgba(216, 196, 154, 0.8)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      for (let k = 0; k < 6; k++) {
        const kx = p.x - hw * (0.6 + ((h >> k) & 3) * 0.08);
        const ky = baseY - s * 0.02 - ((h >> (k + 2)) & 1) * s * 0.02;
        ctx.beginPath();
        ctx.moveTo(kx, ky);
        ctx.quadraticCurveTo(kx + s * 0.04, ky - s * 0.035, kx + s * 0.08, ky - s * 0.01);
        ctx.stroke();
      }
    },
  };
}

function paintWoodpile(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // THE PLAIN CORD, recut at the TRUE ROUND (user verdict): the
  // first cord stacked eighteen wrist-thin sticks — kindling,
  // not firewood — and the outline pass ringed only the pile's
  // outer silhouette, so the inner rounds fused into one brown
  // wall. Now the pile is NINE great seasoned rounds in three
  // courses, each log nearly double the old girth, and EVERY
  // ROUND WEARS ITS OWN LINE: an ink underlay beneath each end
  // face and flank, CLIPPED to the region earlier logs painted
  // (the outline-consistency law) — interior separation at the
  // pass's weight, the outer silhouette left to the pass.
  // The bird's eye still earns its keep: every course lays its
  // barked flank RUNNING NORTH as a foreshortened top plane and
  // the course above overdraws all but the honest slivers.
  const rcx = p.x;
  const pitch = s * 0.285;
  const depth = syT * 0.56;
  const ink = s * 0.038; // the outline pass's own ring weight
  const courses = [
    { y: -0.1, n: 4 },
    { y: -0.345, n: 3 },
    { y: -0.585, n: 2 },
  ] as const;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.66, 0.98, 0.44),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.6, s * 0.075),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(rcx, baseY + s * 0.012, s * 0.64, s * 0.075, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE LINE ONLY WHERE IT LAPS (outline-consistency law):
      // each round's ink is CLIPPED to the region earlier
      // rounds already painted — interior separation at the
      // pass's own weight, while the pile's outer silhouette
      // keeps the single ring the pass draws. `painted` grows
      // log by log.
      const painted = new Path2D();
      for (let ri = 0; ri < courses.length; ri++) {
        const row = courses[ri]!;
        const top = ri === courses.length - 1;
        // Per-log station, shared by flank and end face so the
        // body always lands on its own round.
        const geo = (k: number) => {
          const kx = rcx + (k - (row.n - 1) / 2) * pitch + (((h >>> (ri * 5 + k)) & 3) - 1.5) * s * 0.012;
          const ky = baseY + row.y * s;
          const rr = s * 0.148 * (0.93 + (((h >>> (ri + k * 3)) & 3) / 3) * 0.14);
          const birch = ((h >>> (ri * 4 + k * 5 + 1)) & 7) === 0;
          const split = !birch && ((h >>> (ri * 3 + k * 2)) & 7) < 2;
          return { kx, ky, rr, birch, split };
        };
        // THE TOP PLANE first: every log's receding flank at
        // full length, laid on its own ink bed — occlusion is
        // simply the next course's own paint landing on top.
        for (let k = 0; k < row.n; k++) {
          const g = geo(k);
          const w = g.rr * 1.94;
          const len = depth * (0.9 + (((h >>> (ri * 2 + k + 3)) & 3) / 3) * 0.16);
          // The ink bed under the round's flank — clipped to
          // what earlier logs painted, so it separates without
          // ever fattening the pile's outer edge.
          ctx.save();
          ctx.clip(painted);
          ctx.fillStyle = '#241a2e';
          ctx.beginPath();
          ctx.moveTo(g.kx - w / 2 - ink, g.ky + ink * 0.8);
          ctx.lineTo(g.kx - w * 0.46 - ink, g.ky - len - ink * 0.8);
          ctx.lineTo(g.kx + w * 0.46 + ink, g.ky - len - ink * 0.8);
          ctx.lineTo(g.kx + w / 2 + ink, g.ky + ink * 0.8);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          // The flank rides LIGHTER than the bark ring below it
          // — the top plane is the LIT plane (crate-lid law).
          const bark = g.birch ? '#bdb5a4' : '#96713c';
          ctx.fillStyle = g.split ? '#cdb282' : shade(bark, 6);
          ctx.beginPath();
          ctx.moveTo(g.kx - w / 2, g.ky);
          ctx.lineTo(g.kx - w * 0.46, g.ky - len);
          ctx.lineTo(g.kx + w * 0.46, g.ky - len);
          ctx.lineTo(g.kx + w / 2, g.ky);
          ctx.closePath();
          ctx.fill();
          // The far falloff — the log rolls away from the sun.
          ctx.fillStyle = g.split ? '#a8905e' : shade(bark, -14);
          ctx.beginPath();
          ctx.ellipse(g.kx, g.ky - len + s * 0.014, w * 0.46, s * 0.034, 0, Math.PI, Math.PI * 2);
          ctx.fill();
          if (g.split) {
            // Flat face up: grain running the length.
            ctx.strokeStyle = 'rgba(150, 116, 66, 0.55)';
            ctx.lineWidth = Math.max(1, s * 0.011);
            ctx.beginPath();
            ctx.moveTo(g.kx - w * 0.18, g.ky - s * 0.04);
            ctx.lineTo(g.kx - w * 0.15, g.ky - len + s * 0.07);
            ctx.moveTo(g.kx + w * 0.22, g.ky - s * 0.05);
            ctx.lineTo(g.kx + w * 0.19, g.ky - len + s * 0.08);
            ctx.stroke();
          } else {
            // Bark crown: the WIDE lit plane down the length —
            // a lying cylinder's high line is a band, never a
            // hairline (the lying-cylinder law).
            ctx.strokeStyle = g.birch ? 'rgba(240, 234, 218, 0.6)' : 'rgba(232, 208, 160, 0.5)';
            ctx.lineWidth = Math.max(1.5, s * 0.03);
            ctx.beginPath();
            ctx.moveTo(g.kx - w * 0.12, g.ky - s * 0.03);
            ctx.lineTo(g.kx - w * 0.09, g.ky - len + s * 0.06);
            ctx.stroke();
            // One bark furrow riding the shade side.
            ctx.strokeStyle = 'rgba(74, 52, 26, 0.4)';
            ctx.lineWidth = Math.max(1, s * 0.012);
            ctx.beginPath();
            ctx.moveTo(g.kx + w * 0.26, g.ky - s * 0.05);
            ctx.lineTo(g.kx + w * 0.22, g.ky - len + s * 0.08);
            ctx.stroke();
            if (g.birch) {
              ctx.strokeStyle = 'rgba(60, 54, 44, 0.55)';
              ctx.lineWidth = Math.max(1, s * 0.01);
              ctx.beginPath();
              ctx.moveTo(g.kx + w * 0.1, g.ky - len * 0.45);
              ctx.lineTo(g.kx + w * 0.3, g.ky - len * 0.42);
              ctx.stroke();
            }
          }
          painted.moveTo(g.kx - w / 2, g.ky);
          painted.lineTo(g.kx - w * 0.46, g.ky - len);
          painted.lineTo(g.kx + w * 0.46, g.ky - len);
          painted.lineTo(g.kx + w / 2, g.ky);
          painted.closePath();
        }
        // THE END GRAIN: the front face on its own ink ring —
        // bark collar, pale face, ONE quiet growth ring around
        // an off-center heart, ONE short check (the pass-two
        // verdict: more rings at road distance read as a tray
        // of buns). The odd billet rides split, flat side up.
        for (let k = 0; k < row.n; k++) {
          const g = geo(k);
          const bark = g.birch ? '#b3ac9c' : TWN_OAK_DARK;
          const face = g.birch ? '#e4d6b2' : '#d4b98a';
          // The ink ring under the round — clipped to what is
          // already painted (its own flank included: that arris
          // ring is what makes every round read), never the
          // open air the pass already rings.
          ctx.save();
          ctx.clip(painted);
          ctx.fillStyle = '#241a2e';
          ctx.beginPath();
          ctx.ellipse(g.kx, g.ky, g.rr + ink, (g.rr + ink) * 0.94, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          ctx.fillStyle = bark;
          ctx.beginPath();
          ctx.ellipse(g.kx, g.ky, g.rr, g.rr * 0.94, 0, 0, Math.PI * 2);
          ctx.fill();
          if (g.birch) {
            // Birch wears its dark lenticel ticks on the collar.
            ctx.strokeStyle = 'rgba(60, 54, 44, 0.6)';
            ctx.lineWidth = Math.max(1, s * 0.012);
            ctx.beginPath();
            ctx.moveTo(g.kx - g.rr * 0.72, g.ky + g.rr * 0.42);
            ctx.lineTo(g.kx - g.rr * 0.48, g.ky + g.rr * 0.52);
            ctx.moveTo(g.kx + g.rr * 0.52, g.ky - g.rr * 0.56);
            ctx.lineTo(g.kx + g.rr * 0.74, g.ky - g.rr * 0.44);
            ctx.stroke();
          }
          ctx.fillStyle = face;
          if (g.split) {
            ctx.beginPath();
            ctx.moveTo(g.kx - g.rr * 0.8, g.ky + g.rr * 0.04);
            ctx.arc(g.kx, g.ky, g.rr * 0.8, Math.PI, 0);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(150, 116, 66, 0.5)';
            ctx.lineWidth = Math.max(1, s * 0.01);
            ctx.beginPath();
            ctx.moveTo(g.kx - g.rr * 0.62, g.ky + g.rr * 0.22);
            ctx.lineTo(g.kx + g.rr * 0.6, g.ky + g.rr * 0.22);
            ctx.moveTo(g.kx - g.rr * 0.46, g.ky + g.rr * 0.44);
            ctx.lineTo(g.kx + g.rr * 0.42, g.ky + g.rr * 0.44);
            ctx.stroke();
          } else {
            // A round: full pale face, sap shading toward the
            // shade side, one off-center ring, the heart, and
            // one seasoning check off the heart.
            ctx.beginPath();
            ctx.ellipse(g.kx, g.ky, g.rr * 0.76, g.rr * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = shade(face, -7);
            ctx.beginPath();
            ctx.ellipse(g.kx + g.rr * 0.16, g.ky + g.rr * 0.1, g.rr * 0.52, g.rr * 0.46, 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = face;
            ctx.beginPath();
            ctx.ellipse(g.kx - g.rr * 0.08, g.ky - g.rr * 0.04, g.rr * 0.42, g.rr * 0.38, 0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(140, 108, 62, 0.6)';
            ctx.lineWidth = Math.max(1, s * 0.012);
            ctx.beginPath();
            ctx.ellipse(g.kx - g.rr * 0.06, g.ky + g.rr * 0.04, g.rr * 0.44, g.rr * 0.38, 0.1, 0, Math.PI * 2);
            ctx.stroke();
            // The heart, a shade off true center.
            ctx.fillStyle = 'rgba(122, 92, 52, 0.7)';
            ctx.beginPath();
            ctx.ellipse(g.kx - g.rr * 0.08, g.ky + g.rr * 0.02, g.rr * 0.07, g.rr * 0.06, 0, 0, Math.PI * 2);
            ctx.fill();
            // ONE check crack, radiating from the heart.
            const ca = ((h >>> (k + ri * 3)) & 7) * 0.785;
            ctx.strokeStyle = 'rgba(110, 84, 48, 0.6)';
            ctx.lineWidth = Math.max(1, s * 0.011);
            ctx.beginPath();
            ctx.moveTo(g.kx + Math.cos(ca) * g.rr * 0.12 - g.rr * 0.08, g.ky + Math.sin(ca) * g.rr * 0.1);
            ctx.lineTo(g.kx + Math.cos(ca) * g.rr * 0.66 - g.rr * 0.08, g.ky + Math.sin(ca) * g.rr * 0.6);
            ctx.stroke();
          }
          // The sunlit front arris where flank meets face —
          // only where the sky actually touches the log.
          if (top || k === 0 || k === row.n - 1) {
            ctx.strokeStyle = 'rgba(232, 208, 160, 0.55)';
            ctx.lineWidth = Math.max(1, s * 0.014);
            ctx.beginPath();
            ctx.ellipse(g.kx, g.ky, g.rr * 0.98, g.rr * 0.92, 0, Math.PI * 1.15, Math.PI * 1.85);
            ctx.stroke();
          }
          painted.moveTo(g.kx + g.rr, g.ky);
          painted.ellipse(g.kx, g.ky, g.rr, g.rr * 0.94, 0, 0, Math.PI * 2);
        }
      }
    },
  };
}

function paintFelledLog(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, tile, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.16;
  const deck = tile === Tile.LogPile;
  // THE LOG YARD, LYING LONG: whole trunks at mill scale — the
  // supply the firewood pile is too small to speak for. One
  // trunk alone, or the sawyer's deck: two bearers and a crown
  // log NESTED in their valley (mass stacks the way mass
  // settles — nothing floats). A lying trunk is a CYLINDER
  // under this camera: the crown band along its top is the
  // foreshortened top plane, the belly rides a standing
  // shadow, and the cut end wears the end grain that says a
  // saw did this, not time.
  const hl = s * (deck ? 0.8 : 0.74) * (0.94 + ((h >>> 2) & 3) * 0.03);
  return {
    sortY: ty + (deck ? 0.7 : 0.62),
    body: deck ? stationBody(1.02, 0.85, 0.4) : stationBody(0.98, 0.6, 0.38),
    drawShadow: () => rend.castContact(p.x, baseY, s * (deck ? 0.95 : 0.85), s * 0.08),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, hl * 1.08, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      // One trunk, drawn honestly: bark barrel, standing belly
      // shadow, lit crown band, long bark seams, the flush-cut
      // knot a felled tree keeps, and the bright east cut face.
      const trunk = (cx: number, cy: number, half: number, R: number, tone: number, seed: number) => {
        const yT = cy - R * 1.05;
        const yB = cy + R * 0.95;
        const bodyH = yB - yT;
        // Bark barrel with rounded ends.
        ctx.fillStyle = shade(TWN_OAK_DARK, tone);
        ctx.beginPath();
        ctx.ellipse(cx - half, cy, s * 0.06, bodyH / 2, 0, Math.PI / 2, (Math.PI * 3) / 2);
        ctx.lineTo(cx + half, yT);
        ctx.ellipse(cx + half, cy, s * 0.06, bodyH / 2, 0, -Math.PI / 2, Math.PI / 2);
        ctx.closePath();
        ctx.fill();
        // The belly: the cylinder's standing shadow.
        ctx.fillStyle = shade('#4a3420', tone);
        ctx.fillRect(cx - half, yB - bodyH * 0.22, half * 2, bodyH * 0.22);
        // The crown band: the camera SEES the trunk's top — a
        // wide lit plane, not a hairline (the crate-lid law
        // spoken in cylinder).
        ctx.fillStyle = shade(TWN_OAK, tone + 4);
        ctx.fillRect(cx - half, yT + bodyH * 0.08, half * 2, bodyH * 0.3);
        ctx.fillStyle = shade(TWN_OAK_LIT, tone - 6);
        ctx.fillRect(cx - half, yT + bodyH * 0.08, half * 2, bodyH * 0.1);
        // Long bark seams riding the length, dealt by hash.
        ctx.strokeStyle = 'rgba(40, 26, 12, 0.5)';
        ctx.lineWidth = Math.max(1, s * 0.012);
        for (let k = 0; k < 3; k++) {
          const sy = yT + bodyH * (0.42 + k * 0.16) + (((h >>> (seed + k * 2)) & 3) - 1.5) * s * 0.01;
          const x0 = cx - half + (((h >>> (seed + k)) & 7) / 7) * half * 0.4;
          const x1 = cx + half - (((h >>> (seed + k + 3)) & 7) / 7) * half * 0.5;
          ctx.beginPath();
          ctx.moveTo(x0, sy);
          ctx.quadraticCurveTo((x0 + x1) / 2, sy + s * 0.012, x1, sy + s * 0.004);
          ctx.stroke();
        }
        // Short check ticks down the shadowed flank.
        ctx.strokeStyle = 'rgba(30, 20, 10, 0.45)';
        for (let k = 0; k < 4; k++) {
          const tx2 = cx - half * 0.7 + (((h >>> (seed + k * 3)) & 15) / 15) * half * 1.4;
          ctx.beginPath();
          ctx.moveTo(tx2, yB - bodyH * 0.3);
          ctx.lineTo(tx2 + s * 0.008, yB - bodyH * 0.12);
          ctx.stroke();
        }
        // The flush-cut knot: the branch the feller took.
        const kx = cx + ((((h >>> (seed + 1)) & 7) / 7) - 0.5) * half * 1.1;
        ctx.fillStyle = shade('#4a3420', tone);
        ctx.beginPath();
        ctx.ellipse(kx, yT + bodyH * 0.3, s * 0.035, s * 0.024, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade('#c9ab74', tone - 8);
        ctx.beginPath();
        ctx.ellipse(kx, yT + bodyH * 0.3, s * 0.02, s * 0.013, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // West end: the far rim, turned away — bark ring and a
        // pale sliver only.
        ctx.fillStyle = shade('#4a3420', tone);
        ctx.beginPath();
        ctx.ellipse(cx - half, cy, s * 0.05, bodyH / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = shade('#c9ab74', tone - 10);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.ellipse(cx - half + s * 0.008, cy, s * 0.038, bodyH * 0.4, 0, Math.PI * 0.6, Math.PI * 1.4);
        ctx.stroke();
        // East end: THE CUT FACE — bark rim, bright grain, an
        // off-center heart with its rings, the saw's own truth.
        ctx.fillStyle = shade(TWN_OAK_DARK, tone - 6);
        ctx.beginPath();
        ctx.ellipse(cx + half, cy, s * 0.062, bodyH / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade('#d4b98a', tone);
        ctx.beginPath();
        ctx.ellipse(cx + half, cy, s * 0.048, bodyH * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(140, 108, 62, 0.6)';
        ctx.lineWidth = Math.max(1, s * 0.009);
        ctx.beginPath();
        ctx.ellipse(cx + half, cy + bodyH * 0.05, s * 0.028, bodyH * 0.24, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx + half, cy + bodyH * 0.05, s * 0.013, bodyH * 0.11, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Two radial checks off the heart.
        ctx.strokeStyle = 'rgba(110, 84, 48, 0.55)';
        ctx.beginPath();
        ctx.moveTo(cx + half, cy + bodyH * 0.05);
        ctx.lineTo(cx + half + s * 0.02, cy - bodyH * 0.3);
        ctx.moveTo(cx + half, cy + bodyH * 0.05);
        ctx.lineTo(cx + half - s * 0.016, cy + bodyH * 0.36);
        ctx.stroke();
      };
      if (deck) {
        // North bearer first (behind), south bearer over it,
        // the crown log LAST, nested in their valley — ends
        // staggered a hand's width, the way a deck is thrown.
        const R = s * 0.155;
        trunk(p.x - s * 0.05, baseY - s * 0.3, hl * 0.96, R, -4, 3);
        trunk(p.x + s * 0.03, baseY - R * 0.9, hl, R * 1.04, 0, 7);
        trunk(p.x - s * 0.09, baseY - s * 0.52, hl * 0.88, R * 0.94, 5, 11);
      } else {
        // The lone trunk — and the cut STUB of the one branch
        // left proud, west of center, telling the felling.
        const R = s * 0.17;
        trunk(p.x, baseY - R * 0.9, hl, R, 0, 5);
        const sx = p.x - hl * 0.45;
        ctx.fillStyle = TWN_OAK_DARK;
        ctx.fillRect(sx - s * 0.03, baseY - R * 1.9 - s * 0.15, s * 0.06, s * 0.17);
        ctx.fillStyle = '#c9ab74';
        ctx.beginPath();
        ctx.ellipse(sx, baseY - R * 1.9 - s * 0.15, s * 0.028, s * 0.014, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
}

function paintLogPileEndOn(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // THE LOG YARD, END-ON: great trunks stacked cut-face to the
  // road, bodies running away north — the woodpile's own
  // construction at MILL scale, three and two where the cord
  // stacked six and five. Same laws, heavier voice: the flanks
  // ride LIT (the top plane), the seams stay dark, the far
  // falloff rolls away shaded, and every cut face is big
  // enough to carry rings, checks, and an off-center heart.
  const rcx = p.x;
  const pitch = s * 0.33;
  const depth = syT * 0.78;
  const courses = [
    { y: -0.16, n: 3 },
    { y: -0.43, n: 2 },
  ] as const;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.64, 1.15, 0.42),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.6, s * 0.075),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(rcx, baseY + s * 0.014, s * 0.62, s * 0.075, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let ri = 0; ri < courses.length; ri++) {
        const row = courses[ri]!;
        const top = ri === courses.length - 1;
        const geo = (k: number) => {
          const kx = rcx + (k - (row.n - 1) / 2) * pitch + (((h >>> (ri * 5 + k)) & 3) - 1.5) * s * 0.012;
          const ky = baseY + row.y * s;
          const rr = s * 0.158 * (0.94 + (((h >>> (ri + k * 3)) & 3) / 3) * 0.12);
          return { kx, ky, rr };
        };
        // The receding bodies first — the course above
        // overdraws all but the honest shoulders and seams.
        for (let k = 0; k < row.n; k++) {
          const g = geo(k);
          const w = g.rr * 1.94;
          const len = depth * (0.88 + (((h >>> (ri * 2 + k + 3)) & 3) / 3) * 0.2);
          // The lit flank (crate-lid law: the top plane carries
          // the sun).
          ctx.fillStyle = '#96713c';
          ctx.beginPath();
          ctx.moveTo(g.kx - w / 2, g.ky);
          ctx.lineTo(g.kx - w * 0.45, g.ky - len);
          ctx.lineTo(g.kx + w * 0.45, g.ky - len);
          ctx.lineTo(g.kx + w / 2, g.ky);
          ctx.closePath();
          ctx.fill();
          // Far falloff — the trunk rolls away from the sun.
          ctx.fillStyle = '#6f4d26';
          ctx.beginPath();
          ctx.ellipse(g.kx, g.ky - len + s * 0.016, w * 0.45, s * 0.034, 0, Math.PI, Math.PI * 2);
          ctx.fill();
          // Seams between neighbours.
          ctx.strokeStyle = 'rgba(40, 26, 12, 0.55)';
          ctx.lineWidth = Math.max(1, s * 0.012);
          ctx.beginPath();
          ctx.moveTo(g.kx - w / 2, g.ky);
          ctx.lineTo(g.kx - w * 0.45, g.ky - len);
          ctx.moveTo(g.kx + w / 2, g.ky);
          ctx.lineTo(g.kx + w * 0.45, g.ky - len);
          ctx.stroke();
          // The crown light and one long bark seam riding it.
          ctx.strokeStyle = 'rgba(232, 208, 160, 0.55)';
          ctx.lineWidth = Math.max(1, s * 0.02);
          ctx.beginPath();
          ctx.moveTo(g.kx - w * 0.14, g.ky - s * 0.03);
          ctx.lineTo(g.kx - w * 0.12, g.ky - len + s * 0.06);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(60, 40, 20, 0.4)';
          ctx.lineWidth = Math.max(1, s * 0.01);
          ctx.beginPath();
          ctx.moveTo(g.kx + w * 0.22, g.ky - s * 0.04);
          ctx.lineTo(g.kx + w * 0.19, g.ky - len + s * 0.07);
          ctx.stroke();
          // The odd flush knot on a flank, dealt by hash.
          if (((h >>> (ri * 4 + k * 5 + 2)) & 7) === 0) {
            ctx.fillStyle = '#4a3420';
            ctx.beginPath();
            ctx.ellipse(g.kx + w * 0.16, g.ky - len * 0.55, s * 0.028, s * 0.018, 0.3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // The cut faces: the saw's truth, big enough to read
        // from the road — rim, grain, double ring, checks.
        for (let k = 0; k < row.n; k++) {
          const g = geo(k);
          ctx.fillStyle = TWN_OAK_DARK;
          ctx.beginPath();
          ctx.ellipse(g.kx, g.ky, g.rr, g.rr * 0.94, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#d4b98a';
          ctx.beginPath();
          ctx.ellipse(g.kx, g.ky, g.rr * 0.8, g.rr * 0.74, 0, 0, Math.PI * 2);
          ctx.fill();
          // ONE quiet ring, an off-center heart, ONE short
          // check — pass-two verdict from the live rig: a
          // second ring plus long radials at road distance
          // reads as a SPIRAL, and sawn timber becomes a tray
          // of buns.
          const hx = g.kx - g.rr * 0.08;
          const hy = g.ky + g.rr * 0.08;
          ctx.strokeStyle = 'rgba(140, 108, 62, 0.5)';
          ctx.lineWidth = Math.max(1, s * 0.01);
          ctx.beginPath();
          ctx.ellipse(hx, hy, g.rr * 0.48, g.rr * 0.42, 0.1, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = 'rgba(110, 84, 48, 0.7)';
          ctx.beginPath();
          ctx.ellipse(hx, hy, g.rr * 0.07, g.rr * 0.06, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(110, 84, 48, 0.5)';
          {
            const ca = ((h >>> (k + ri)) & 7) * 0.8;
            ctx.beginPath();
            ctx.moveTo(hx + Math.cos(ca) * g.rr * 0.14, hy + Math.sin(ca) * g.rr * 0.12);
            ctx.lineTo(hx + Math.cos(ca) * g.rr * 0.55, hy + Math.sin(ca) * g.rr * 0.48);
            ctx.stroke();
          }
          // The sunlit arris where flank meets face.
          if (top || k === 0 || k === row.n - 1) {
            ctx.strokeStyle = 'rgba(232, 208, 160, 0.55)';
            ctx.lineWidth = Math.max(1, s * 0.014);
            ctx.beginPath();
            ctx.ellipse(g.kx, g.ky - s * 0.01, g.rr * 0.96, g.rr * 0.9, 0, Math.PI * 1.12, Math.PI * 1.88);
            ctx.stroke();
          }
        }
      }
    },
  };
}

function paintStreetPlanter(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.14;
  // The half-barrel reborn: town color at door scale, planted
  // in LAYERS like a gardener plants — tall spikes at the back,
  // big dealt blooms amidships, greenery spilling the front rim
  // — and the soil still damp at the line: watered THIS morning.
  const r = s * 0.3;
  const rimY = baseY - s * 0.46;
  return {
    sortY: ty + 0.66,
    body: stationBody(0.55, 1.2, 0.4),
    drawShadow: () => rend.castContact(p.x, baseY, r * 1.35, s * 0.055),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, r * 1.4, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      // The half-barrel: staved flare, two hoops, damp foot.
      ctx.fillStyle = TWN_OAK;
      ctx.beginPath();
      ctx.moveTo(p.x - r * 0.92, baseY);
      ctx.lineTo(p.x - r * 1.08, rimY);
      ctx.lineTo(p.x + r * 1.08, rimY);
      ctx.lineTo(p.x + r * 0.92, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(60, 44, 24, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.011);
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(p.x + k * r * 0.5, rimY + s * 0.01);
        ctx.lineTo(p.x + k * r * 0.44, baseY - s * 0.01);
        ctx.stroke();
      }
      ctx.strokeStyle = TWN_IRON;
      ctx.lineWidth = Math.max(1.5, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(p.x - r * 1.05, rimY + s * 0.055);
      ctx.lineTo(p.x + r * 1.05, rimY + s * 0.055);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x - r * 0.96, baseY - s * 0.075);
      ctx.lineTo(p.x + r * 0.96, baseY - s * 0.075);
      ctx.stroke();
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.fillRect(p.x - r * 0.88, rimY + s * 0.02, r * 0.3, baseY - rimY - s * 0.05);
      // The damp line: the water's dark tide mark on the wood.
      ctx.fillStyle = 'rgba(60, 44, 30, 0.3)';
      ctx.fillRect(p.x - r * 0.98, baseY - s * 0.06, r * 1.94, s * 0.05);
      // The rim ellipse + wet soil inside.
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.beginPath();
      ctx.ellipse(p.x, rimY, r * 1.08, r * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a3a28';
      ctx.beginPath();
      ctx.ellipse(p.x, rimY, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE BACK RANK: spike blooms rising behind the mound —
      // foxglove towers in the town's own dye triad, each
      // nodding on its own phase (alive, never plastic).
      const dye = GARDEN_DYES[(h >>> 5) % 3]!;
      for (let k = 0; k < 3; k++) {
        const sd = hashCoords(157 + k, tx, ty);
        const sx2 = p.x + (k - 1) * r * 0.5 + ((sd % 5) - 2) * s * 0.014;
        const rise = s * (0.34 + ((sd >>> 4) % 4) * 0.05);
        const nod = rend.breezeAt(tx, ty, t, sd * 0.4, s, 0.014, 0.014).sway;
        const tipX = sx2 + nod;
        const tipY = rimY - s * 0.1 - rise;
        ctx.strokeStyle = '#4f7a40';
        ctx.lineWidth = Math.max(1, s * 0.02);
        ctx.beginPath();
        ctx.moveTo(sx2, rimY - s * 0.04);
        ctx.quadraticCurveTo(sx2 + nod * 0.4, rimY - s * 0.06 - rise * 0.55, tipX, tipY + s * 0.03);
        ctx.stroke();
        const spikeC = dye[k % 3]!;
        for (let b = 0; b < 4; b++) {
          const f = b / 3;
          const bellX = sx2 + nod * (0.35 + f * 0.65);
          const bellY = rimY - s * 0.09 - rise * (0.3 + f * 0.68);
          const br2 = s * (0.046 - f * 0.018);
          ctx.fillStyle = b === 3 ? shade(spikeC, 24) : shade(spikeC, b * 5 - 4);
          ctx.beginPath();
          ctx.ellipse(bellX, bellY, br2, br2 * 0.82, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // The mound: two greens, shade under the blooms' feet.
      ctx.fillStyle = '#4a6b3d';
      ctx.beginPath();
      ctx.ellipse(p.x, rimY - s * 0.1, r * 0.88, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5d8449';
      ctx.beginPath();
      ctx.ellipse(p.x - r * 0.3, rimY - s * 0.16, r * 0.46, r * 0.3, -0.2, 0, Math.PI * 2);
      ctx.fill();
      // THE MID DEAL: five big petal clusters — BIG enough to
      // read at street scale (the fish law), dark-seated so
      // each head sits IN the green instead of floating on it.
      const blooms = [
        { bx: -0.55, by: -0.36, c: dye[0]! },
        { bx: 0.05, by: -0.5, c: dye[1]! },
        { bx: 0.56, by: -0.32, c: dye[0]! },
        { bx: -0.16, by: -0.2, c: dye[2]! },
        { bx: 0.32, by: -0.14, c: dye[1]! },
      ];
      for (let k = 0; k < blooms.length; k++) {
        const b = blooms[k]!;
        const bx = p.x + b.bx * r;
        const by = rimY + b.by * s;
        ctx.fillStyle = 'rgba(24, 40, 22, 0.5)';
        ctx.beginPath();
        ctx.ellipse(bx + s * 0.01, by + s * 0.024, s * 0.075, s * 0.045, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = b.c;
        for (let pt = 0; pt < 5; pt++) {
          const a = (pt / 5) * Math.PI * 2 + k;
          ctx.beginPath();
          ctx.ellipse(bx + Math.cos(a) * s * 0.045, by + Math.sin(a) * s * 0.035, s * 0.03, s * 0.022, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = shade(b.c, 30);
        ctx.beginPath();
        ctx.ellipse(bx, by, s * 0.018, s * 0.015, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // THE FRONT SPILL: trailing greenery tumbling the south
      // rim in three tongues — the pot overflows, the street
      // side wears the show. One tongue carries a stray bloom.
      ctx.strokeStyle = '#4a6b3d';
      ctx.lineWidth = Math.max(1, s * 0.016);
      const tongues: ReadonlyArray<readonly [number, number, number]> = [
        [-0.62, 0.3, -0.1],
        [0.08, 0.42, 0.06],
        [0.6, 0.26, 0.12],
      ];
      for (let k = 0; k < tongues.length; k++) {
        const [ox, drop, bow] = tongues[k]!;
        const x0 = p.x + ox * r;
        ctx.beginPath();
        ctx.moveTo(x0, rimY + s * 0.03);
        ctx.quadraticCurveTo(x0 + bow * s + s * 0.05, rimY + drop * s * 0.6, x0 + bow * s, rimY + drop * s);
        ctx.stroke();
        ctx.fillStyle = k === 1 ? '#5d8449' : '#527a44';
        for (let l = 0; l < 3; l++) {
          const f = 0.3 + l * 0.3;
          const lx = x0 + bow * s * f + ((l & 1) ? s * 0.034 : -s * 0.03);
          const ly = rimY + drop * s * f + s * 0.01;
          ctx.beginPath();
          ctx.ellipse(lx, ly, s * 0.036, s * 0.022, (l & 1) ? 0.5 : -0.4, 0, Math.PI * 2);
          ctx.fill();
        }
        if (k === 2) {
          ctx.fillStyle = dye[2]!;
          ctx.beginPath();
          facetCircle(ctx, x0 + bow * s, rimY + drop * s + s * 0.02, s * 0.02, 5, 0.3, 0.85);
          ctx.fill();
        }
      }
    },
  };
}

function paintStoneBench(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.14;
  // The civic seat: a carved slab on scroll feet, knee-high to
  // the ruler (the bench law), and WORN — two hollows polished
  // into the seat where a hundred years of markets sat down.
  const hw = s * 0.52;
  const seatY = baseY - s * 0.3;
  return {
    sortY: ty + 0.62,
    body: stationBody(0.62, 0.6, 0.4),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.1, s * 0.06),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.12, s * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      // Scroll feet: squared blocks with a curl bitten out.
      for (const m of [-1, 1] as const) {
        ctx.fillStyle = TWN_STONE_DARK;
        ctx.beginPath();
        ctx.moveTo(p.x + m * hw * 0.78 - s * 0.07, baseY);
        ctx.lineTo(p.x + m * hw * 0.78 - s * 0.07, seatY + s * 0.05);
        ctx.lineTo(p.x + m * hw * 0.78 + s * 0.07, seatY + s * 0.05);
        ctx.lineTo(p.x + m * hw * 0.78 + s * 0.07, baseY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = TWN_STONE;
        ctx.beginPath();
        ctx.arc(p.x + m * hw * 0.78 - m * s * 0.015, baseY - s * 0.1, s * 0.045, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = TWN_STONE_DARK;
        ctx.beginPath();
        ctx.arc(p.x + m * hw * 0.78 - m * s * 0.015, baseY - s * 0.1, s * 0.02, 0, Math.PI * 2);
        ctx.fill();
      }
      // The slab: plumb front face + the bright seat plane.
      ctx.fillStyle = TWN_STONE;
      ctx.fillRect(p.x - hw, seatY, hw * 2, s * 0.09);
      ctx.fillStyle = TWN_STONE_LIT;
      ctx.beginPath();
      ctx.moveTo(p.x - hw, seatY);
      ctx.lineTo(p.x - hw * 0.9, seatY - s * 0.075);
      ctx.lineTo(p.x + hw * 0.9, seatY - s * 0.075);
      ctx.lineTo(p.x + hw, seatY);
      ctx.closePath();
      ctx.fill();
      // The worn hollows: two soft dishes where people SIT.
      ctx.fillStyle = 'rgba(120, 112, 93, 0.3)';
      for (const m of [-0.42, 0.4] as const) {
        ctx.beginPath();
        ctx.ellipse(p.x + m * hw, seatY - s * 0.038, s * 0.13, s * 0.026, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // The mason's chamfer line and one honest crack.
      ctx.strokeStyle = 'rgba(90, 82, 66, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.96, seatY + s * 0.055);
      ctx.lineTo(p.x + hw * 0.96, seatY + s * 0.055);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x + hw * 0.55, seatY + s * 0.01);
      ctx.lineTo(p.x + hw * 0.48, seatY + s * 0.05);
      ctx.lineTo(p.x + hw * 0.52, seatY + s * 0.085);
      ctx.stroke();
    },
  };
}

function paintQuenchTrough(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The smith's slack tub: an iron-banded timber trough of
  // black water, a finished blade left hilt-up to cool, the
  // tongs parked across the rim — steam still lifting off the
  // last dip. Mid-shift, never abandoned.
  const hw = s * 0.46;
  const rimY = baseY - s * 0.36;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.6, 0.8, 0.4),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.12, s * 0.07),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // The quench splashes: a dark wet apron around the tub.
      ctx.fillStyle = 'rgba(24, 30, 40, 0.26)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.28, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      // The trough: staved timber, belly bulged, on two feet.
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.fillRect(p.x - hw * 0.7, baseY - s * 0.06, s * 0.09, s * 0.06);
      ctx.fillRect(p.x + hw * 0.61, baseY - s * 0.06, s * 0.09, s * 0.06);
      ctx.beginPath();
      ctx.moveTo(p.x - hw, rimY);
      ctx.quadraticCurveTo(p.x - hw * 1.1, baseY - s * 0.14, p.x - hw * 0.78, baseY - s * 0.04);
      ctx.lineTo(p.x + hw * 0.78, baseY - s * 0.04);
      ctx.quadraticCurveTo(p.x + hw * 1.1, baseY - s * 0.14, p.x + hw, rimY);
      ctx.closePath();
      ctx.fill();
      // Lit stave faces + seams.
      ctx.fillStyle = TWN_OAK;
      ctx.beginPath();
      ctx.moveTo(p.x - hw, rimY);
      ctx.quadraticCurveTo(p.x - hw * 1.08, baseY - s * 0.15, p.x - hw * 0.8, baseY - s * 0.05);
      ctx.lineTo(p.x - hw * 0.42, baseY - s * 0.05);
      ctx.lineTo(p.x - hw * 0.38, rimY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(50, 36, 18, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (const k of [-0.38, 0.02, 0.4]) {
        ctx.beginPath();
        ctx.moveTo(p.x + hw * k, rimY + s * 0.02);
        ctx.lineTo(p.x + hw * (k * 0.92), baseY - s * 0.05);
        ctx.stroke();
      }
      // Two iron bands, each with one lit edge.
      ctx.fillStyle = TWN_IRON;
      ctx.fillRect(p.x - hw * 0.98, rimY + s * 0.05, hw * 1.96, s * 0.035);
      ctx.fillRect(p.x - hw * 0.88, baseY - s * 0.12, hw * 1.76, s * 0.032);
      ctx.fillStyle = 'rgba(210, 218, 226, 0.35)';
      ctx.fillRect(p.x - hw * 0.98, rimY + s * 0.05, hw * 1.96, s * 0.012);
      // The rim lip.
      ctx.fillStyle = shade(TWN_OAK, 14);
      ctx.beginPath();
      ctx.ellipse(p.x, rimY, hw, s * 0.085, 0, 0, Math.PI * 2);
      ctx.fill();
      // The water: black at the edge, steel where the sky sits.
      ctx.fillStyle = '#1e2832';
      ctx.beginPath();
      ctx.ellipse(p.x, rimY, hw * 0.88, s * 0.068, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(143, 180, 196, 0.4)';
      ctx.beginPath();
      ctx.ellipse(p.x - hw * 0.2, rimY - s * 0.012, hw * 0.44, s * 0.028, 0, 0, Math.PI * 2);
      ctx.fill();
      // A slow ring where the blade went in (<4Hz).
      const ringK = (t * 0.45 + ((h >> 2) & 3) * 0.25) % 1;
      ctx.strokeStyle = `rgba(159, 196, 216, ${(0.5 * (1 - ringK)).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.ellipse(p.x + hw * 0.24, rimY, hw * 0.5 * ringK + s * 0.02, (s * 0.038) * ringK + s * 0.006, 0, 0, Math.PI * 2);
      ctx.stroke();
      // The cooling blade: hilt-up out of the bath, edge lit.
      const bx = p.x + hw * 0.26;
      ctx.strokeStyle = TRD_STEEL;
      ctx.lineWidth = Math.max(1.5, s * 0.03);
      ctx.beginPath();
      ctx.moveTo(bx, rimY + s * 0.01);
      ctx.lineTo(bx + s * 0.14, rimY - s * 0.3);
      ctx.stroke();
      ctx.strokeStyle = TRD_STEEL_LIT;
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(bx + s * 0.014, rimY);
      ctx.lineTo(bx + s * 0.152, rimY - s * 0.29);
      ctx.stroke();
      // Cross guard + wrapped grip.
      ctx.strokeStyle = TWN_BRONZE;
      ctx.lineWidth = Math.max(1.5, s * 0.024);
      ctx.beginPath();
      ctx.moveTo(bx + s * 0.095, rimY - s * 0.315);
      ctx.lineTo(bx + s * 0.185, rimY - s * 0.285);
      ctx.stroke();
      ctx.strokeStyle = TRD_LEATHER;
      ctx.lineWidth = Math.max(1.5, s * 0.026);
      ctx.beginPath();
      ctx.moveTo(bx + s * 0.14, rimY - s * 0.3);
      ctx.lineTo(bx + s * 0.175, rimY - s * 0.38);
      ctx.stroke();
      // The tongs across the far rim, jaws over the water.
      ctx.strokeStyle = TWN_IRON;
      ctx.lineWidth = Math.max(1, s * 0.016);
      for (const m of [0, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(p.x - hw * 1.06, rimY - s * (0.1 + m * 0.02));
        ctx.quadraticCurveTo(p.x - hw * 0.5, rimY - s * (0.13 + m * 0.03), p.x - hw * 0.18, rimY - s * 0.05);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.ellipse(p.x - hw * 0.92, rimY - s * 0.11, s * 0.022, s * 0.022, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Steam off the bath: two soft puffs on the slow clock.
      for (let k = 0; k < 2; k++) {
        const ph = (t * 0.32 + k * 0.5 + ((h >> k) & 3) * 0.125) % 1;
        const sx = p.x + hw * (0.26 - k * 0.34) + Math.sin(t * 0.9 + k * 2.1) * s * 0.03;
        const sy = rimY - s * 0.08 - ph * s * 0.42;
        const al = 0.26 * (1 - ph) * Math.min(1, ph * 5);
        ctx.fillStyle = `rgba(226, 234, 240, ${al.toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(sx, sy, s * (0.05 + ph * 0.07), s * (0.035 + ph * 0.05), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
}

function paintGrindstone(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // THE GRINDSTONE, recut for the camera it lives under (user
  // verdict): the first build drew the wheel as a FULL SIDE-ON
  // COIN — a flat circle with no top, the one read this tilted
  // bird's eye cannot produce, and the whole station broke the
  // shared viewport angle. Rebuilt as a TUB WHEEL: the stone
  // stands in a stout oak water trough, and the camera gets
  // every plane it is owed — the trough's lit top rim, the
  // dark water inside it, and the wheel's own THICKNESS as a
  // lit crescent riding the top arc (the far rim showing past
  // the near face, the crate-lid law bent around a cylinder).
  // Hand crank on the near face, a blade waiting on the rest,
  // the working rim dark where the water keeps it — mid-shift,
  // never left.
  const cx = p.x - s * 0.01;
  const R = s * 0.34;
  const ryF = R * 0.86;
  const cy = baseY - s * 0.53;
  const te = s * 0.1; // the top-rim setback: the stone's thickness
  const tubW = s * 0.5;
  const tubTopY = baseY - s * 0.34;
  const ink = s * 0.038;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.62, 1.0, 0.44),
    drawShadow: () => rend.castContact(p.x, baseY, tubW * 1.15, s * 0.07),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, tubW * 1.2, s * 0.065, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE TROUGH'S MOUTH first: far rim and the water the
      // wheel dips into — the wheel and then the near wall
      // land on top, so the stone truly stands IN the tub.
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.beginPath();
      ctx.ellipse(p.x, tubTopY, tubW, s * 0.115, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c3a42';
      ctx.beginPath();
      ctx.ellipse(p.x, tubTopY + s * 0.008, tubW * 0.88, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // The water keeps a moving gleam on the slow clock.
      const wp = (t * 0.35 + ((h >>> 3) & 3) * 0.25) % 1;
      ctx.strokeStyle = `rgba(159, 196, 216, ${(0.35 + 0.2 * Math.sin(wp * Math.PI * 2)).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.ellipse(p.x, tubTopY + s * 0.01, tubW * (0.52 + 0.14 * wp), s * 0.055 * (0.6 + 0.4 * wp), 0, 0.4, Math.PI - 0.4);
      ctx.stroke();
      // THE WHEEL: no full ink bed (outline-consistency law —
      // a bed under the whole disc doubled the outer line the
      // pass already draws). The ink lives ONLY where the
      // wheel laps the tub's mouth: a seam clipped below the
      // rim, so the stone visibly enters the water.
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - R * 1.4, tubTopY - s * 0.02, R * 2.8, s);
      ctx.clip();
      ctx.strokeStyle = '#241a2e';
      ctx.lineWidth = Math.max(2, s * 0.045);
      ctx.beginPath();
      ctx.ellipse(cx, cy, R + s * 0.01, ryF + s * 0.01, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      // The far rim: the stone's RUNNING SURFACE catching the
      // sky — the crescent that sells the thickness.
      ctx.fillStyle = TRD_GRIT_LIT;
      ctx.beginPath();
      ctx.ellipse(cx, cy - te, R, ryF, 0, 0, Math.PI * 2);
      ctx.fill();
      // Tool scars across the visible top band: the surface
      // is USED, and the short strokes run with the turn.
      ctx.strokeStyle = 'rgba(122, 116, 104, 0.55)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      for (let k = 0; k < 5; k++) {
        const a = Math.PI * (1.12 + k * 0.19) + (((h >>> k) & 3) - 1.5) * 0.04;
        const ex = cx + Math.cos(a) * R * 0.97;
        const ey = cy - te + Math.sin(a) * ryF * 0.97;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex + Math.cos(a) * s * 0.02, ey + Math.sin(a) * s * 0.02 + te * 0.55);
        ctx.stroke();
      }
      // THE FACE: the near disc, worn true — with one thin
      // shade stroke along its top arc so the crescent above
      // reads as THICKNESS, not a paint band.
      ctx.fillStyle = TRD_GRIT;
      ctx.beginPath();
      ctx.ellipse(cx, cy, R, ryF, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shade(TRD_GRIT, -22);
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.ellipse(cx, cy, R * 0.995, ryF * 0.99, 0, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      // The face rolls off the light toward the east.
      ctx.fillStyle = shade(TRD_GRIT, -8);
      ctx.beginPath();
      ctx.ellipse(cx + R * 0.22, cy + ryF * 0.08, R * 0.66, ryF * 0.7, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(TRD_GRIT, 7);
      ctx.beginPath();
      ctx.ellipse(cx - R * 0.18, cy - ryF * 0.16, R * 0.56, ryF * 0.52, -0.3, 0, Math.PI * 2);
      ctx.fill();
      // The wear groove where a thousand edges rode the rim.
      ctx.strokeStyle = shade(TRD_GRIT, -18);
      ctx.lineWidth = Math.max(1.5, s * 0.028);
      ctx.beginPath();
      ctx.ellipse(cx, cy, R * 0.86, ryF * 0.84, 0, 0, Math.PI * 2);
      ctx.stroke();
      // The wet arc: the tub keeps the working rim dark where
      // the stone meets its water.
      ctx.strokeStyle = 'rgba(40, 52, 62, 0.55)';
      ctx.lineWidth = Math.max(2, s * 0.055);
      ctx.beginPath();
      ctx.ellipse(cx, cy, R * 0.94, ryF * 0.92, 0, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
      // One wet sheet climbing off the water line — the drip
      // term, riding the slow clock down the face.
      const dk = (t * 0.5 + ((h >>> 5) & 3) * 0.25) % 1;
      ctx.fillStyle = `rgba(159, 196, 216, ${(0.5 * (1 - dk * 0.7)).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(cx - R * 0.3, cy + ryF * (0.4 + dk * 0.42), s * 0.013, s * 0.024, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // Grit speckle, hash-dealt so no two wheels pit alike.
      ctx.fillStyle = 'rgba(90, 84, 72, 0.55)';
      for (let k = 0; k < 6; k++) {
        const a = ((h >>> (k * 2)) & 7) * 0.785 + k;
        const rr2 = R * (0.26 + (((h >>> k) & 3) / 3) * 0.5);
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2 * 0.84, s * 0.016, s * 0.013, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Hub, crank, and grip: the iron boss end-on, the square
      // nut, the crank dropped to rest at the hash's angle,
      // the worn grip riding its own small ink ring.
      ctx.fillStyle = '#241a2e';
      ctx.beginPath();
      ctx.ellipse(cx, cy, s * 0.085, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = TWN_IRON;
      ctx.beginPath();
      ctx.ellipse(cx, cy, s * 0.062, s * 0.058, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = TRD_STEEL_LIT;
      ctx.fillRect(cx - s * 0.02, cy - s * 0.02, s * 0.04, s * 0.04);
      const ca = 0.55 + ((h >> 3) & 3) * 0.5;
      const gx2 = cx + Math.cos(ca) * R * 0.66;
      const gy2 = cy + Math.sin(ca) * ryF * 0.64;
      ctx.strokeStyle = '#241a2e';
      ctx.lineWidth = Math.max(2.5, s * 0.055);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(gx2, gy2);
      ctx.stroke();
      ctx.strokeStyle = TWN_IRON;
      ctx.lineWidth = Math.max(1.5, s * 0.026);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(gx2, gy2);
      ctx.stroke();
      ctx.fillStyle = '#241a2e';
      ctx.beginPath();
      ctx.ellipse(gx2, gy2, s * 0.052, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = TWN_OAK;
      ctx.beginPath();
      ctx.ellipse(gx2, gy2, s * 0.034, s * 0.032, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.beginPath();
      ctx.ellipse(gx2 - s * 0.008, gy2 - s * 0.008, s * 0.014, s * 0.013, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE NEAR WALL: the trough's front closes over the
      // stone's dip — coopered staves, one iron band, the lit
      // top rim the camera reads as the tub's mouth.
      ctx.fillStyle = TWN_OAK;
      ctx.beginPath();
      ctx.moveTo(p.x - tubW, tubTopY);
      ctx.quadraticCurveTo(p.x - tubW * 1.06, (tubTopY + baseY) / 2, p.x - tubW * 0.92, baseY);
      ctx.lineTo(p.x + tubW * 0.92, baseY);
      ctx.quadraticCurveTo(p.x + tubW * 1.06, (tubTopY + baseY) / 2, p.x + tubW, tubTopY);
      ctx.ellipse(p.x, tubTopY, tubW, s * 0.115, 0, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      // Stave seams.
      ctx.strokeStyle = 'rgba(58, 40, 20, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (const f of [-0.55, -0.18, 0.2, 0.58]) {
        ctx.beginPath();
        ctx.moveTo(p.x + f * tubW, tubTopY + s * 0.105);
        ctx.lineTo(p.x + f * tubW * 0.94, baseY - s * 0.01);
        ctx.stroke();
      }
      // The iron hoop that keeps the tub a tub.
      ctx.strokeStyle = TWN_IRON;
      ctx.lineWidth = Math.max(1.5, s * 0.026);
      ctx.beginPath();
      ctx.moveTo(p.x - tubW * 1.015, tubTopY + (baseY - tubTopY) * 0.42);
      ctx.quadraticCurveTo(p.x, tubTopY + (baseY - tubTopY) * 0.52, p.x + tubW * 1.015, tubTopY + (baseY - tubTopY) * 0.42);
      ctx.stroke();
      // The mouth's lit front rim: the top plane's near arris.
      ctx.strokeStyle = TWN_OAK_LIT;
      ctx.lineWidth = Math.max(1.5, s * 0.024);
      ctx.beginPath();
      ctx.ellipse(p.x, tubTopY, tubW * 0.99, s * 0.112, 0, 0.25, Math.PI - 0.25);
      ctx.stroke();
      // THE TOOL REST across the mouth's east quarter, a blade
      // waiting flat — somebody's edge is half done.
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.fillRect(p.x + tubW * 0.42, tubTopY - s * 0.055, s * 0.34, s * 0.05);
      ctx.fillStyle = 'rgba(201, 167, 106, 0.5)';
      ctx.fillRect(p.x + tubW * 0.42, tubTopY - s * 0.055, s * 0.34, s * 0.018);
      ctx.strokeStyle = TRD_STEEL;
      ctx.lineWidth = Math.max(1.5, s * 0.026);
      ctx.beginPath();
      ctx.moveTo(p.x + tubW * 0.46, tubTopY - s * 0.075);
      ctx.lineTo(p.x + tubW * 0.46 + s * 0.36, tubTopY - s * 0.125);
      ctx.stroke();
      ctx.strokeStyle = TRD_STEEL_LIT;
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(p.x + tubW * 0.46, tubTopY - s * 0.088);
      ctx.lineTo(p.x + tubW * 0.46 + s * 0.35, tubTopY - s * 0.137);
      ctx.stroke();
      // Skid feet: ground shows under the tub (the pallet law).
      ctx.fillStyle = TWN_OAK_DARK;
      for (const m of [-1, 1] as const) {
        ctx.fillRect(p.x + m * tubW * 0.62 - s * 0.05, baseY - s * 0.01, s * 0.1, s * 0.045);
      }
    },
  };
}

function paintIngotRack(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The smith's larder: ingots pigged up by metal on the low
  // shelf, bar stock leaning on the rail, the coal sack slumped
  // where the shovel left it. Stock IN, work OUT.
  const hw = s * 0.42;
  const shelfY = baseY - s * 0.26;
  const railY = baseY - s * 0.72;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.6, 1.0, 0.4),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.15, s * 0.065),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.2, s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      // Frame: two posts + the leaning rail behind.
      for (const m of [-1, 1] as const) {
        ctx.fillStyle = TWN_OAK_DARK;
        ctx.fillRect(p.x + m * hw * 0.92 - s * 0.03, railY - s * 0.08, s * 0.06, baseY - railY + s * 0.08);
        ctx.fillStyle = TWN_OAK;
        ctx.fillRect(p.x + m * hw * 0.92 - s * 0.03, railY - s * 0.08, s * 0.024, baseY - railY + s * 0.08);
      }
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.fillRect(p.x - hw * 0.95, railY, hw * 1.9, s * 0.045);
      ctx.fillStyle = 'rgba(201, 167, 106, 0.5)';
      ctx.fillRect(p.x - hw * 0.95, railY, hw * 1.9, s * 0.016);
      // BAR STOCK leans on the rail: rods long and short, steel
      // and black iron, dealt by the hash.
      for (let k = 0; k < 4; k++) {
        const kx = p.x - hw * 0.55 + k * hw * 0.3 + (((h >> k) & 3) - 1.5) * s * 0.02;
        const lean = s * (0.1 + (((h >> (k + 3)) & 3) / 3) * 0.08);
        const topY = railY - s * (0.16 + (((h >> (k + 6)) & 3) / 3) * 0.14);
        ctx.strokeStyle = ((h >> (k * 2)) & 1) ? TRD_STEEL : TWN_IRON;
        ctx.lineWidth = Math.max(1.5, s * 0.02);
        ctx.beginPath();
        ctx.moveTo(kx, baseY - s * 0.02);
        ctx.lineTo(kx + lean, topY);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(210, 218, 226, 0.4)';
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.beginPath();
        ctx.moveTo(kx + s * 0.008, baseY - s * 0.03);
        ctx.lineTo(kx + lean + s * 0.008, topY + s * 0.01);
        ctx.stroke();
      }
      // The shelf plank with its lit front arris.
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.fillRect(p.x - hw, shelfY, hw * 2, s * 0.055);
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.fillRect(p.x - hw, shelfY, hw * 2, s * 0.018);
      // THE PIGS: two ingot stacks, metal dealt by the hash —
      // iron, bronze, or copper — each bar a lit-topped keel.
      const metals = [
        { lo: '#5c6068', hi: TRD_STEEL_LIT },
        { lo: '#8a6a2c', hi: TWN_BRONZE_LIT },
        { lo: '#8a5434', hi: '#d29a6a' },
      ];
      for (const st of [0, 1] as const) {
        const met = metals[(h >>> (st * 3)) % 3]!;
        const sx = p.x + (st === 0 ? -hw * 0.5 : hw * 0.34);
        const rows = 2 + ((h >> (st + 8)) & 1);
        for (let r = 0; r < rows; r++) {
          const n = rows - r;
          for (let k = 0; k < n; k++) {
            const ix = sx + (k - (n - 1) / 2) * s * 0.135;
            const iy = shelfY - s * 0.045 - r * s * 0.075;
            ctx.fillStyle = met.lo;
            ctx.beginPath();
            ctx.moveTo(ix - s * 0.062, iy + s * 0.038);
            ctx.lineTo(ix - s * 0.048, iy - s * 0.026);
            ctx.lineTo(ix + s * 0.048, iy - s * 0.026);
            ctx.lineTo(ix + s * 0.062, iy + s * 0.038);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = met.hi;
            ctx.fillRect(ix - s * 0.048, iy - s * 0.026, s * 0.096, s * 0.016);
          }
        }
      }
      // The coal sack: slumped burlap mouth-open, lumps spilled.
      const ckx = p.x + hw * 1.06;
      ctx.fillStyle = '#4a4440';
      ctx.beginPath();
      ctx.moveTo(ckx - s * 0.11, baseY);
      ctx.quadraticCurveTo(ckx - s * 0.13, baseY - s * 0.3, ckx, baseY - s * 0.34);
      ctx.quadraticCurveTo(ckx + s * 0.13, baseY - s * 0.3, ckx + s * 0.11, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#5c5650';
      ctx.beginPath();
      ctx.moveTo(ckx - s * 0.1, baseY);
      ctx.quadraticCurveTo(ckx - s * 0.12, baseY - s * 0.28, ckx - s * 0.02, baseY - s * 0.32);
      ctx.quadraticCurveTo(ckx - s * 0.01, baseY - s * 0.16, ckx - s * 0.03, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2e2c30';
      ctx.beginPath();
      ctx.ellipse(ckx, baseY - s * 0.31, s * 0.075, s * 0.035, -0.1, 0, Math.PI * 2);
      ctx.fill();
      for (let k = 0; k < 4; k++) {
        const lx = ckx - s * 0.06 + ((h >> k) & 3) * s * 0.05;
        const ly = baseY - s * 0.01 - ((h >> (k + 2)) & 1) * s * 0.025;
        ctx.fillStyle = '#34323a';
        ctx.beginPath();
        ctx.ellipse(lx, ly, s * 0.023, s * 0.018, k, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(138, 148, 160, 0.35)';
        ctx.beginPath();
        ctx.ellipse(lx - s * 0.006, ly - s * 0.006, s * 0.008, s * 0.006, k, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
}

function paintLumberRack(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The joiner's stock: planks on edge between peg posts, one
  // pulled and leaning for the next cut, a round log waiting
  // its turn, sawdust drifted where the work happens.
  const hw = s * 0.44;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.6, 1.25, 0.4),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.1, s * 0.065),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.15, s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      // Sawdust drift, pale and soft, before everything.
      ctx.fillStyle = 'rgba(222, 198, 150, 0.4)';
      ctx.beginPath();
      ctx.ellipse(p.x + hw * 0.4, baseY - s * 0.005, s * 0.16, s * 0.045, 0.2, 0, Math.PI * 2);
      ctx.fill();
      // The two peg posts.
      for (const m of [-1, 1] as const) {
        ctx.fillStyle = TWN_OAK_DARK;
        ctx.fillRect(p.x + m * hw * 0.9 - s * 0.032, baseY - s * 1.02, s * 0.064, s * 1.02);
        ctx.fillStyle = TWN_OAK;
        ctx.fillRect(p.x + m * hw * 0.9 - s * 0.032, baseY - s * 1.02, s * 0.025, s * 1.02);
        // Peg stubs jut where the planks lean.
        ctx.fillStyle = TWN_OAK_DARK;
        ctx.fillRect(p.x + m * hw * 0.9 - s * 0.06, baseY - s * 0.68, s * 0.12, s * 0.035);
        ctx.fillRect(p.x + m * hw * 0.9 - s * 0.06, baseY - s * 0.34, s * 0.12, s * 0.035);
      }
      // THE STOCK: five planks on edge, tones and heights dealt
      // by the hash, top ends cut square showing pale end grain.
      const tones = [TWN_OAK, '#96713c', TWN_OAK_LIT, '#7c5a30', '#a3814a'];
      const n = 5;
      for (let k = 0; k < n; k++) {
        const kx = p.x - hw * 0.62 + k * hw * 0.31;
        const ph = s * (0.78 + (((h >> (k * 2)) & 3) / 3) * 0.26);
        const lean = s * (0.03 + (((h >> (k + 5)) & 3) / 3) * 0.025);
        const tone = tones[(h >>> (k * 3)) % tones.length]!;
        ctx.fillStyle = shade(tone, -14);
        ctx.beginPath();
        ctx.moveTo(kx - s * 0.052, baseY);
        ctx.lineTo(kx - s * 0.052 + lean, baseY - ph);
        ctx.lineTo(kx + s * 0.052 + lean, baseY - ph);
        ctx.lineTo(kx + s * 0.052, baseY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = tone;
        ctx.beginPath();
        ctx.moveTo(kx - s * 0.052, baseY);
        ctx.lineTo(kx - s * 0.052 + lean, baseY - ph);
        ctx.lineTo(kx - s * 0.012 + lean, baseY - ph);
        ctx.lineTo(kx - s * 0.012, baseY);
        ctx.closePath();
        ctx.fill();
        // The cut top: pale end grain on the square cut.
        ctx.fillStyle = '#e0c49a';
        ctx.beginPath();
        ctx.moveTo(kx - s * 0.052 + lean, baseY - ph);
        ctx.lineTo(kx - s * 0.038 + lean, baseY - ph - s * 0.022);
        ctx.lineTo(kx + s * 0.062 + lean, baseY - ph - s * 0.022);
        ctx.lineTo(kx + s * 0.052 + lean, baseY - ph);
        ctx.closePath();
        ctx.fill();
      }
      // ONE PLANK PULLED: leaning long against the rack front —
      // the next cut, already chosen. Mid-shift, never left.
      ctx.fillStyle = '#b08a45';
      ctx.beginPath();
      ctx.moveTo(p.x + hw * 0.52, baseY + s * 0.02);
      ctx.lineTo(p.x + hw * 0.98, baseY - s * 0.86);
      ctx.lineTo(p.x + hw * 1.08, baseY - s * 0.84);
      ctx.lineTo(p.x + hw * 0.63, baseY + s * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(111, 77, 38, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(p.x + hw * 0.58, baseY);
      ctx.lineTo(p.x + hw * 1.0, baseY - s * 0.83);
      ctx.stroke();
      // The waiting log: round end grain to the street.
      const lx = p.x - hw * 1.02;
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.fillRect(lx - s * 0.02, baseY - s * 0.2, s * 0.26, s * 0.18);
      ctx.beginPath();
      ctx.ellipse(lx, baseY - s * 0.11, s * 0.095, s * 0.105, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d4b98a';
      ctx.beginPath();
      ctx.ellipse(lx, baseY - s * 0.11, s * 0.072, s * 0.082, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(140, 108, 62, 0.6)';
      ctx.lineWidth = Math.max(1, s * 0.008);
      ctx.beginPath();
      ctx.ellipse(lx, baseY - s * 0.11, s * 0.04, s * 0.045, 0, 0, Math.PI * 2);
      ctx.stroke();
    },
  };
}

function paintDyeVats(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The dyer's pair: two staved vats brimming with the town's
  // own dye roster — no two tiles brew the same two colors —
  // the stir paddle resting, the staves striped with old runs.
  const hw = s * 0.46;
  const d1 = h % 10;
  const d2 = (d1 + 1 + ((h >>> 4) % 9)) % 10;
  const dye1 = AWNING_CLOTHS[d1]!.a;
  const dye2 = AWNING_CLOTHS[d2]!.a;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.62, 0.85, 0.42),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.15, s * 0.07),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.2, s * 0.075, 0, 0, Math.PI * 2);
      ctx.fill();
      // Old spills stain the ground in both colors.
      for (const [m, dye] of [[-1, dye1], [1, dye2]] as const) {
        ctx.fillStyle = dye;
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        ctx.ellipse(p.x + (m as number) * hw * 0.5 + s * 0.06, baseY + s * 0.015, s * 0.09, s * 0.03, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // The two vats, rear one first for the overlap.
      const vats = [
        { vx: p.x + hw * 0.45, vy: baseY - s * 0.05, r: hw * 0.5, dye: dye2, k: 1 },
        { vx: p.x - hw * 0.42, vy: baseY, r: hw * 0.56, dye: dye1, k: 0 },
      ];
      for (const v of vats) {
        const rimY = v.vy - s * 0.42;
        // Staved body with a bulge.
        ctx.fillStyle = TWN_OAK_DARK;
        ctx.beginPath();
        ctx.moveTo(v.vx - v.r, rimY);
        ctx.quadraticCurveTo(v.vx - v.r * 1.16, v.vy - s * 0.2, v.vx - v.r * 0.86, v.vy);
        ctx.lineTo(v.vx + v.r * 0.86, v.vy);
        ctx.quadraticCurveTo(v.vx + v.r * 1.16, v.vy - s * 0.2, v.vx + v.r, rimY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = TWN_OAK;
        ctx.beginPath();
        ctx.moveTo(v.vx - v.r, rimY);
        ctx.quadraticCurveTo(v.vx - v.r * 1.12, v.vy - s * 0.2, v.vx - v.r * 0.88, v.vy);
        ctx.lineTo(v.vx - v.r * 0.34, v.vy);
        ctx.lineTo(v.vx - v.r * 0.3, rimY);
        ctx.closePath();
        ctx.fill();
        // Stave seams.
        ctx.strokeStyle = 'rgba(50, 36, 18, 0.45)';
        ctx.lineWidth = Math.max(1, s * 0.011);
        for (const kk of [-0.3, 0.1, 0.5]) {
          ctx.beginPath();
          ctx.moveTo(v.vx + v.r * kk, rimY + s * 0.02);
          ctx.lineTo(v.vx + v.r * kk * 0.9, v.vy);
          ctx.stroke();
        }
        // Iron hoops.
        ctx.fillStyle = TWN_IRON;
        ctx.fillRect(v.vx - v.r * 1.02, rimY + s * 0.06, v.r * 2.04, s * 0.03);
        ctx.fillRect(v.vx - v.r * 0.92, v.vy - s * 0.12, v.r * 1.84, s * 0.028);
        // THE DYE RUN: drips off the rim in the vat's own color.
        ctx.fillStyle = v.dye;
        ctx.globalAlpha = 0.75;
        const dxk = ((h >> (v.k * 5)) & 3) * 0.3 - 0.45;
        ctx.beginPath();
        ctx.moveTo(v.vx + v.r * dxk - s * 0.012, rimY + s * 0.02);
        ctx.lineTo(v.vx + v.r * dxk + s * 0.012, rimY + s * 0.02);
        ctx.lineTo(v.vx + v.r * dxk * 0.96 + s * 0.008, rimY + s * (0.14 + ((h >> v.k) & 3) * 0.03));
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        // The rim + the brimming surface.
        ctx.fillStyle = shade(TWN_OAK, 10);
        ctx.beginPath();
        ctx.ellipse(v.vx, rimY, v.r, s * 0.078, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(v.dye, -20);
        ctx.beginPath();
        ctx.ellipse(v.vx, rimY, v.r * 0.86, s * 0.062, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = v.dye;
        ctx.beginPath();
        ctx.ellipse(v.vx - v.r * 0.08, rimY - s * 0.006, v.r * 0.68, s * 0.045, 0, 0, Math.PI * 2);
        ctx.fill();
        // The slow stir: a swirl arm turning under 4Hz.
        const sa = t * (0.5 + v.k * 0.13) + v.k * 2.4 + tx * 0.7 + ty * 1.1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = Math.max(1, s * 0.013);
        ctx.beginPath();
        ctx.ellipse(v.vx, rimY, v.r * 0.5, s * 0.033, 0, sa, sa + 2.1);
        ctx.stroke();
        ctx.strokeStyle = shade(v.dye, 26);
        ctx.beginPath();
        ctx.ellipse(v.vx, rimY, v.r * 0.3, s * 0.02, 0, sa + 3.6, sa + 5.2);
        ctx.stroke();
      }
      // The stir paddle resting across the near vat's rim.
      const pv = vats[1]!;
      ctx.strokeStyle = TWN_OAK;
      ctx.lineWidth = Math.max(1.5, s * 0.024);
      ctx.beginPath();
      ctx.moveTo(pv.vx - pv.r * 0.5, pv.vy - s * 0.44);
      ctx.lineTo(pv.vx + pv.r * 1.1, pv.vy - s * 0.72);
      ctx.stroke();
      // The blade end wears the vat's color, deep-soaked.
      ctx.fillStyle = shade(dye1, -14);
      ctx.beginPath();
      ctx.ellipse(pv.vx - pv.r * 0.52, pv.vy - s * 0.435, s * 0.055, s * 0.028, -0.34, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

function paintTailorsDummy(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The tailor's dress form: a pinned garment mid-fitting in
  // one of the town's own dyes, basting still in the cloth,
  // the measure draped where the hands left it.
  const dye = AWNING_CLOTHS[(h >>> 2) % 10]!;
  const shX = p.x;
  return {
    sortY: ty + 0.66,
    body: stationBody(0.5, 1.35, 0.35),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.3, s * 0.05),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, s * 0.28, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      // Three splayed feet + the pole with its set-screw knob.
      ctx.strokeStyle = TWN_OAK_DARK;
      ctx.lineWidth = Math.max(1.5, s * 0.028);
      for (const fa of [-0.9, 0.14, 0.9]) {
        ctx.beginPath();
        ctx.moveTo(shX, baseY - s * 0.22);
        ctx.lineTo(shX + Math.sin(fa) * s * 0.2, baseY + Math.abs(Math.cos(fa)) * s * 0.005);
        ctx.stroke();
      }
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.fillRect(shX - s * 0.022, baseY - s * 0.58, s * 0.044, s * 0.38);
      ctx.fillStyle = TWN_OAK;
      ctx.fillRect(shX - s * 0.022, baseY - s * 0.58, s * 0.017, s * 0.38);
      ctx.fillStyle = TWN_BRONZE_LIT;
      ctx.beginPath();
      ctx.ellipse(shX + s * 0.035, baseY - s * 0.44, s * 0.018, s * 0.018, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE FORM: shoulders, cinched waist, hip flare — wearing
      // the work: bodice in the dealt dye, hem still unpinned.
      const shY = baseY - s * 1.04;
      const waistY = baseY - s * 0.76;
      const hemY = baseY - s * 0.56;
      ctx.fillStyle = shade(dye.a, -16);
      ctx.beginPath();
      ctx.moveTo(shX - s * 0.155, shY);
      ctx.quadraticCurveTo(shX - s * 0.09, waistY - s * 0.02, shX - s * 0.105, waistY);
      ctx.quadraticCurveTo(shX - s * 0.17, hemY - s * 0.02, shX - s * 0.15, hemY);
      ctx.lineTo(shX + s * 0.15, hemY);
      ctx.quadraticCurveTo(shX + s * 0.17, hemY - s * 0.02, shX + s * 0.105, waistY);
      ctx.quadraticCurveTo(shX + s * 0.09, waistY - s * 0.02, shX + s * 0.155, shY);
      ctx.closePath();
      ctx.fill();
      // The lit panel.
      ctx.fillStyle = dye.a;
      ctx.beginPath();
      ctx.moveTo(shX - s * 0.135, shY + s * 0.01);
      ctx.quadraticCurveTo(shX - s * 0.075, waistY - s * 0.02, shX - s * 0.088, waistY);
      ctx.quadraticCurveTo(shX - s * 0.14, hemY - s * 0.02, shX - s * 0.125, hemY - s * 0.01);
      ctx.lineTo(shX - s * 0.01, hemY - s * 0.01);
      ctx.lineTo(shX - s * 0.01, shY + s * 0.01);
      ctx.closePath();
      ctx.fill();
      // The seam under work: center line with pin glints.
      ctx.strokeStyle = shade(dye.a, -30);
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(shX + s * 0.02, shY + s * 0.02);
      ctx.lineTo(shX + s * 0.03, hemY - s * 0.02);
      ctx.stroke();
      ctx.fillStyle = TRD_STEEL_LIT;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.ellipse(shX + s * (0.022 + k * 0.003), shY + s * 0.06 + k * s * 0.1, s * 0.009, s * 0.009, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Basting: pale tacking stitches run where the take-in
      // goes — the tailor SEWS the fitting, never chalks it
      // (period truth: thread survives the rain).
      ctx.strokeStyle = 'rgba(244, 242, 234, 0.85)';
      ctx.lineWidth = Math.max(1, s * 0.011);
      ctx.beginPath();
      ctx.moveTo(shX - s * 0.09, waistY - s * 0.05);
      ctx.lineTo(shX - s * 0.074, waistY - s * 0.054);
      ctx.moveTo(shX - s * 0.063, waistY - s * 0.057);
      ctx.lineTo(shX - s * 0.05, waistY - s * 0.06);
      ctx.moveTo(shX - s * 0.095, waistY + s * 0.01);
      ctx.lineTo(shX - s * 0.079, waistY + s * 0.007);
      ctx.moveTo(shX - s * 0.068, waistY + s * 0.003);
      ctx.lineTo(shX - s * 0.055, waistY);
      ctx.stroke();
      // The hem hangs uneven — pinned on one side only.
      ctx.fillStyle = shade(dye.a, -8);
      ctx.beginPath();
      ctx.moveTo(shX - s * 0.15, hemY - s * 0.005);
      ctx.lineTo(shX + s * 0.15, hemY - s * 0.005);
      ctx.lineTo(shX + s * 0.145, hemY + s * 0.045);
      ctx.lineTo(shX + s * 0.02, hemY + s * 0.02);
      ctx.lineTo(shX - s * 0.13, hemY + s * 0.055);
      ctx.closePath();
      ctx.fill();
      // The neck cap.
      ctx.fillStyle = TWN_OAK;
      ctx.beginPath();
      ctx.ellipse(shX, shY - s * 0.015, s * 0.045, s * 0.026, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.beginPath();
      ctx.ellipse(shX, shY - s * 0.022, s * 0.032, s * 0.016, 0, 0, Math.PI * 2);
      ctx.fill();
      // The measure: a cream tape over the shoulder, ticked.
      ctx.strokeStyle = '#efe8d4';
      ctx.lineWidth = Math.max(1.5, s * 0.022);
      ctx.beginPath();
      ctx.moveTo(shX - s * 0.1, shY + s * 0.005);
      ctx.quadraticCurveTo(shX - s * 0.13, waistY - s * 0.06, shX - s * 0.115, hemY + s * 0.06);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(90, 74, 50, 0.6)';
      ctx.lineWidth = Math.max(1, s * 0.008);
      for (let k = 0; k < 4; k++) {
        const ky = shY + s * 0.1 + k * s * 0.11;
        ctx.beginPath();
        ctx.moveTo(shX - s * 0.128, ky);
        ctx.lineTo(shX - s * 0.105, ky);
        ctx.stroke();
      }
    },
  };
}

function paintClothBolts(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The mercer's crib: bolts standing in the rack, every roll
  // a different dye, the front bolt tongued open for a customer
  // who is coming back — and the shears parked till then.
  const hw = s * 0.44;
  const deckY = baseY - s * 0.34;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.6, 1.1, 0.4),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.1, s * 0.065),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.1, s * 0.065, 0, 0, Math.PI * 2);
      ctx.fill();
      // The crib: four legs and two side rails.
      ctx.fillStyle = TWN_OAK_DARK;
      for (const m of [-1, 1] as const) {
        ctx.fillRect(p.x + m * hw * 0.86 - s * 0.028, deckY, s * 0.056, baseY - deckY);
        ctx.fillRect(p.x + m * hw * 0.6 - s * 0.024, deckY + s * 0.04, s * 0.048, baseY - deckY - s * 0.04);
      }
      ctx.fillStyle = TWN_OAK;
      ctx.fillRect(p.x - hw * 0.92, deckY + s * 0.02, hw * 1.84, s * 0.04);
      // THE BOLTS: four rolls leaning in the crib — A BOLT IS A
      // ROLL, NOT A RAMP (pass-2 verdict): every roll is its own
      // upright cylinder, dyes dealt on a stride of three so
      // neighbors never share a hue family, dark seams parting
      // roll from roll, the wound end fat and readable.
      const base = h % 10;
      for (let k = 3; k >= 0; k--) {
        const cloth = AWNING_CLOTHS[(base + k * 3) % 10]!;
        const kx = p.x - hw * 0.58 + k * hw * 0.42;
        const lean = s * (0.05 + (((h >>> (k * 2)) & 3) / 3) * 0.03);
        const topY = deckY - s * (0.42 + (((h >>> (k + 3)) & 3) / 3) * 0.12);
        const rw = s * 0.075;
        // The standing roll: a leaning cylinder, lit down one
        // flank, its neighbor parted by shadow.
        ctx.fillStyle = shade(cloth.a, -26);
        ctx.beginPath();
        ctx.moveTo(kx - rw, deckY - s * 0.02);
        ctx.lineTo(kx - rw + lean, topY);
        ctx.lineTo(kx + rw + lean, topY);
        ctx.lineTo(kx + rw, deckY - s * 0.02);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = cloth.a;
        ctx.beginPath();
        ctx.moveTo(kx - rw, deckY - s * 0.02);
        ctx.lineTo(kx - rw + lean, topY);
        ctx.lineTo(kx + rw * 0.3 + lean, topY);
        ctx.lineTo(kx + rw * 0.3, deckY - s * 0.02);
        ctx.closePath();
        ctx.fill();
        // The selvage stripe winds the body once.
        ctx.strokeStyle = cloth.b;
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(kx - rw * 0.5, deckY - s * 0.1);
        ctx.lineTo(kx + rw * 0.7 + lean * 0.4, topY + s * 0.12);
        ctx.stroke();
        // THE WOUND END: fat dye disc up top, spiral + dowel.
        ctx.fillStyle = shade(cloth.a, 10);
        ctx.beginPath();
        ctx.ellipse(kx + lean, topY, rw * 1.08, rw * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = shade(cloth.a, -24);
        ctx.lineWidth = Math.max(1, s * 0.011);
        ctx.beginPath();
        ctx.ellipse(kx + lean, topY, rw * 0.68, rw * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(kx + lean, topY, rw * 0.32, rw * 0.19, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#d8c49a';
        ctx.beginPath();
        ctx.ellipse(kx + lean, topY, s * 0.016, s * 0.011, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // THE TONGUE: the front bolt spills open over the rail,
      // trim stripe riding the fold.
      const front = AWNING_CLOTHS[(base + 5) % 10]!;
      ctx.fillStyle = front.a;
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.6, deckY - s * 0.02);
      ctx.lineTo(p.x - hw * 0.18, deckY - s * 0.04);
      ctx.lineTo(p.x - hw * 0.1, baseY - s * 0.02);
      ctx.quadraticCurveTo(p.x - hw * 0.36, baseY + s * 0.02, p.x - hw * 0.56, baseY - s * 0.015);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(front.a, -16);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.6, deckY - s * 0.02);
      ctx.lineTo(p.x - hw * 0.18, deckY - s * 0.04);
      ctx.lineTo(p.x - hw * 0.2, deckY + s * 0.03);
      ctx.lineTo(p.x - hw * 0.58, deckY + s * 0.04);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = front.b;
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.53, deckY + s * 0.06);
      ctx.quadraticCurveTo(p.x - hw * 0.38, baseY - s * 0.1, p.x - hw * 0.33, baseY - s * 0.03);
      ctx.stroke();
      // The shears resting on the tongue: crossed steel, ring
      // handles — the cut is coming.
      const sx = p.x - hw * 0.36;
      const sy = deckY + s * 0.1;
      ctx.strokeStyle = TRD_STEEL;
      ctx.lineWidth = Math.max(1, s * 0.014);
      for (const m of [-1, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(sx + m * s * 0.012, sy + s * 0.05);
        ctx.lineTo(sx - m * s * 0.028, sy - s * 0.06);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(sx + m * s * 0.022, sy + s * 0.062, s * 0.016, s * 0.014, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = TRD_STEEL_LIT;
      ctx.beginPath();
      ctx.ellipse(sx, sy, s * 0.012, s * 0.012, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

function paintButcherBlock(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The butcher's court: links and a ham hung high on iron
  // S-hooks, the round block scarred and stained below, the
  // cleaver STANDING in the wood between customers.
  const hw = s * 0.42;
  const railY = baseY - s * 1.1;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.6, 1.5, 0.4),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.05, s * 0.065),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.12, s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      // Sawdust strewn underfoot — the butcher's clean floor.
      ctx.fillStyle = 'rgba(222, 198, 150, 0.32)';
      ctx.beginPath();
      ctx.ellipse(p.x - hw * 0.2, baseY, s * 0.2, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      // The gallows frame: posts + chamfered rail.
      for (const m of [-1, 1] as const) {
        ctx.fillStyle = TWN_OAK_DARK;
        ctx.fillRect(p.x + m * hw * 0.92 - s * 0.032, railY - s * 0.05, s * 0.064, baseY - railY + s * 0.05);
        ctx.fillStyle = TWN_OAK;
        ctx.fillRect(p.x + m * hw * 0.92 - s * 0.032, railY - s * 0.05, s * 0.025, baseY - railY + s * 0.05);
      }
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.fillRect(p.x - hw * 1.02, railY, hw * 2.04, s * 0.055);
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.fillRect(p.x - hw * 1.02, railY, hw * 2.04, s * 0.02);
      // THE HANG: dealt by the hash — links, the ham, a second
      // string — each on an iron S-hook, never a rope loop.
      const hang = (h >> 2) & 3;
      const hookAt = (hx: number) => {
        ctx.strokeStyle = TRD_STEEL;
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.arc(hx + s * 0.012, railY + s * 0.075, s * 0.018, Math.PI * 0.5, Math.PI * 1.5);
        ctx.arc(hx - s * 0.012, railY + s * 0.115, s * 0.018, Math.PI * 1.5, Math.PI * 0.5);
        ctx.stroke();
      };
      // The sausage string: five links stepped down a curve.
      const linksAt = (hx: number, m: number) => {
        hookAt(hx);
        ctx.strokeStyle = shade(TRD_MEAT, -26);
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        ctx.moveTo(hx, railY + s * 0.13);
        ctx.quadraticCurveTo(hx + m * s * 0.05, railY + s * 0.3, hx + m * s * 0.03, railY + s * 0.46);
        ctx.stroke();
        for (let k = 0; k < 4; k++) {
          const ky = railY + s * (0.17 + k * 0.085);
          const kx = hx + m * Math.sin(k * 1.1) * s * 0.035;
          ctx.fillStyle = k % 2 ? TRD_MEAT : shade(TRD_MEAT, -10);
          ctx.beginPath();
          ctx.ellipse(kx, ky, s * 0.028, s * 0.042, m * 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(232, 196, 142, 0.5)';
          ctx.beginPath();
          ctx.ellipse(kx - s * 0.008, ky - s * 0.012, s * 0.009, s * 0.014, m * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      };
      // The ham: rind-banded, bone stub proud.
      const hamAt = (hx: number) => {
        hookAt(hx);
        ctx.fillStyle = shade(TRD_MEAT, -16);
        ctx.beginPath();
        ctx.moveTo(hx, railY + s * 0.13);
        ctx.quadraticCurveTo(hx - s * 0.09, railY + s * 0.3, hx - s * 0.05, railY + s * 0.44);
        ctx.quadraticCurveTo(hx, railY + s * 0.52, hx + s * 0.05, railY + s * 0.44);
        ctx.quadraticCurveTo(hx + s * 0.09, railY + s * 0.3, hx, railY + s * 0.13);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = TRD_MEAT;
        ctx.beginPath();
        ctx.moveTo(hx - s * 0.002, railY + s * 0.14);
        ctx.quadraticCurveTo(hx - s * 0.07, railY + s * 0.3, hx - s * 0.04, railY + s * 0.43);
        ctx.quadraticCurveTo(hx - s * 0.005, railY + s * 0.48, hx, railY + s * 0.47);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = TRD_LEATHER_LIT;
        ctx.fillRect(hx - s * 0.055, railY + s * 0.34, s * 0.11, s * 0.026);
        ctx.fillStyle = '#e8ddc8';
        ctx.beginPath();
        ctx.ellipse(hx, railY + s * 0.125, s * 0.016, s * 0.012, 0, 0, Math.PI * 2);
        ctx.fill();
      };
      if (hang & 1) {
        linksAt(p.x - hw * 0.55, 1);
        hamAt(p.x + hw * 0.4);
      } else {
        hamAt(p.x - hw * 0.45);
        linksAt(p.x + hw * 0.5, -1);
      }
      if (hang & 2) linksAt(p.x + hw * 0.02, 1);
      // THE BLOCK: a thick round on splayed legs, top scarred.
      const bx = p.x - hw * 0.1;
      const bTop = baseY - s * 0.52;
      ctx.fillStyle = TWN_OAK_DARK;
      for (const m of [-1, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(bx + m * s * 0.13, bTop + s * 0.3);
        ctx.lineTo(bx + m * s * 0.18, baseY);
        ctx.lineTo(bx + m * s * 0.13, baseY);
        ctx.lineTo(bx + m * s * 0.09, bTop + s * 0.3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.fillRect(bx - s * 0.17, bTop, s * 0.34, s * 0.34);
      ctx.fillStyle = TWN_OAK;
      ctx.fillRect(bx - s * 0.17, bTop, s * 0.12, s * 0.34);
      // The top plane: pale, scored, one honest dark stain.
      ctx.fillStyle = '#c9ab74';
      ctx.beginPath();
      ctx.ellipse(bx, bTop, s * 0.175, s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(122, 52, 44, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx + s * 0.03, bTop + s * 0.008, s * 0.08, s * 0.032, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120, 90, 50, 0.6)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      for (let k = 0; k < 3; k++) {
        const a = ((h >> (k * 2)) & 3) * 0.6 - 0.9;
        ctx.beginPath();
        ctx.moveTo(bx - Math.cos(a) * s * 0.12, bTop - Math.sin(a) * s * 0.04);
        ctx.lineTo(bx + Math.cos(a) * s * 0.12, bTop + Math.sin(a) * s * 0.04);
        ctx.stroke();
      }
      // THE CLEAVER: blade bitten in, handle raked, edge lit.
      ctx.fillStyle = TRD_STEEL;
      ctx.beginPath();
      ctx.moveTo(bx - s * 0.1, bTop - s * 0.005);
      ctx.lineTo(bx - s * 0.115, bTop - s * 0.13);
      ctx.lineTo(bx + s * 0.005, bTop - s * 0.145);
      ctx.lineTo(bx + s * 0.01, bTop - s * 0.01);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TRD_STEEL_LIT;
      ctx.beginPath();
      ctx.moveTo(bx - s * 0.115, bTop - s * 0.13);
      ctx.lineTo(bx + s * 0.005, bTop - s * 0.145);
      ctx.lineTo(bx + s * 0.003, bTop - s * 0.118);
      ctx.lineTo(bx - s * 0.108, bTop - s * 0.105);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = TRD_LEATHER;
      ctx.lineWidth = Math.max(1.5, s * 0.026);
      ctx.beginPath();
      ctx.moveTo(bx - s * 0.05, bTop - s * 0.14);
      ctx.lineTo(bx - s * 0.015, bTop - s * 0.245);
      ctx.stroke();
    },
  };
}

function paintHerbRack(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The herbalist's rack: bundles hung heads-down on two rails
  // to dry — sage, lavender, seed-heads dealt by the hash —
  // swinging on the town's one breeze, the mortar waiting below.
  const hw = s * 0.42;
  const railHi = baseY - s * 1.0;
  const railLo = baseY - s * 0.62;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.58, 1.35, 0.38),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 0.95, s * 0.06),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 0.95, s * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
      // The frame: two posts, two rails, pale lashings.
      for (const m of [-1, 1] as const) {
        ctx.fillStyle = TWN_OAK_DARK;
        ctx.fillRect(p.x + m * hw * 0.88 - s * 0.028, railHi - s * 0.08, s * 0.056, baseY - railHi + s * 0.08);
        ctx.fillStyle = TWN_OAK;
        ctx.fillRect(p.x + m * hw * 0.88 - s * 0.028, railHi - s * 0.08, s * 0.022, baseY - railHi + s * 0.08);
      }
      for (const ry of [railHi, railLo]) {
        ctx.fillStyle = TWN_OAK_DARK;
        ctx.fillRect(p.x - hw * 0.92, ry, hw * 1.84, s * 0.035);
        ctx.fillStyle = 'rgba(201, 167, 106, 0.5)';
        ctx.fillRect(p.x - hw * 0.92, ry, hw * 1.84, s * 0.013);
        ctx.strokeStyle = TWN_ROPE;
        ctx.lineWidth = Math.max(1, s * 0.012);
        for (const m of [-1, 1] as const) {
          ctx.beginPath();
          ctx.moveTo(p.x + m * hw * 0.88 - s * 0.03, ry - s * 0.01);
          ctx.lineTo(p.x + m * hw * 0.88 + s * 0.03, ry + s * 0.045);
          ctx.stroke();
        }
      }
      // THE BUNDLES: heads-down bushels, each tied with twine,
      // each swinging its own small swing on the shared breeze.
      // Greens carry the rack (a drying line is a GREEN read);
      // lavender and seed-gold are the accents, never the base.
      const hues = [
        { lo: shade(TRD_HERB, -14), hi: '#6f9450' },
        { lo: shade(TRD_HERB_DRY, -14), hi: TRD_HERB_DRY },
        { lo: shade(TRD_HERB, -10), hi: TRD_HERB_DRY },
        { lo: shade(TRD_LAVENDER, -16), hi: TRD_LAVENDER },
        { lo: shade(TRD_HERB_DRY, -12), hi: '#9aa668' },
        { lo: '#8a6f30', hi: '#a8823f' },
      ];
      const rows = [
        { ry: railHi, n: 4, off: 0 },
        { ry: railLo, n: 3, off: 5 },
      ];
      for (const row of rows) {
        for (let k = 0; k < row.n; k++) {
          const hue = hues[(h >>> (k * 2 + row.off)) % hues.length]!;
          const kx = p.x - hw * 0.62 + k * ((hw * 1.24) / (row.n - 1));
          const sway = Math.sin(t * 1.15 + tx * 1.7 + ty * 1.2 + k * 1.9 + row.off) * 0.09;
          const len = s * (0.2 + (((h >> (k + row.off)) & 3) / 3) * 0.06);
          const tipX = kx + Math.sin(sway) * len;
          const tipY = row.ry + s * 0.04 + Math.cos(sway) * len;
          // Stems from the tie down to the flared heads.
          ctx.strokeStyle = hue.lo;
          ctx.lineWidth = Math.max(1, s * 0.014);
          ctx.beginPath();
          ctx.moveTo(kx, row.ry + s * 0.04);
          ctx.lineTo(tipX, tipY);
          ctx.stroke();
          // The bushel head: layered teardrop, lit on one cheek.
          ctx.fillStyle = hue.lo;
          ctx.beginPath();
          ctx.moveTo(kx + Math.sin(sway) * len * 0.4, row.ry + s * 0.04 + Math.cos(sway) * len * 0.4);
          ctx.quadraticCurveTo(tipX - s * 0.055, tipY, tipX - s * 0.02, tipY + s * 0.1);
          ctx.quadraticCurveTo(tipX, tipY + s * 0.13, tipX + s * 0.02, tipY + s * 0.1);
          ctx.quadraticCurveTo(tipX + s * 0.055, tipY, kx + Math.sin(sway) * len * 0.4, row.ry + s * 0.04 + Math.cos(sway) * len * 0.4);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = hue.hi;
          ctx.beginPath();
          ctx.moveTo(kx + Math.sin(sway) * len * 0.45 - s * 0.01, row.ry + s * 0.06 + Math.cos(sway) * len * 0.45);
          ctx.quadraticCurveTo(tipX - s * 0.04, tipY, tipX - s * 0.012, tipY + s * 0.085);
          ctx.quadraticCurveTo(tipX + s * 0.006, tipY + s * 0.02, kx + Math.sin(sway) * len * 0.45 + s * 0.012, row.ry + s * 0.06 + Math.cos(sway) * len * 0.45);
          ctx.closePath();
          ctx.fill();
          // Sprig strokes give the head its herb TEXTURE.
          ctx.strokeStyle = hue.lo;
          ctx.lineWidth = Math.max(1, s * 0.008);
          for (const m of [-1, 0.2, 1]) {
            ctx.beginPath();
            ctx.moveTo(tipX + m * s * 0.02, tipY + s * 0.02);
            ctx.lineTo(tipX + m * s * 0.035, tipY + s * 0.11);
            ctx.stroke();
          }
          // The twine tie at the rail.
          ctx.strokeStyle = TWN_ROPE;
          ctx.lineWidth = Math.max(1, s * 0.013);
          ctx.beginPath();
          ctx.ellipse(kx, row.ry + s * 0.045, s * 0.014, s * 0.018, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // The bench below: mortar + pestle and the day's strip.
      ctx.fillStyle = TWN_OAK;
      ctx.fillRect(p.x - hw * 0.5, baseY - s * 0.16, hw, s * 0.045);
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.fillRect(p.x - hw * 0.42, baseY - s * 0.115, s * 0.035, s * 0.115);
      ctx.fillRect(p.x + hw * 0.36, baseY - s * 0.115, s * 0.035, s * 0.115);
      ctx.fillStyle = TWN_STONE;
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.075, baseY - s * 0.19);
      ctx.quadraticCurveTo(p.x - s * 0.085, baseY - s * 0.28, p.x - s * 0.05, baseY - s * 0.29);
      ctx.lineTo(p.x + s * 0.05, baseY - s * 0.29);
      ctx.quadraticCurveTo(p.x + s * 0.085, baseY - s * 0.28, p.x + s * 0.075, baseY - s * 0.19);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TWN_STONE_LIT;
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.285, s * 0.052, s * 0.02, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3c4434';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.283, s * 0.036, s * 0.013, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = TWN_STONE;
      ctx.lineWidth = Math.max(1.5, s * 0.024);
      ctx.beginPath();
      ctx.moveTo(p.x + s * 0.02, baseY - s * 0.29);
      ctx.lineTo(p.x + s * 0.09, baseY - s * 0.4);
      ctx.stroke();
      // A few fallen leaves under the rack.
      ctx.fillStyle = 'rgba(125, 140, 88, 0.55)';
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.ellipse(p.x - hw * 0.4 + ((h >> k) & 3) * hw * 0.25, baseY - s * 0.015 + ((h >> (k + 3)) & 1) * s * 0.02, s * 0.02, s * 0.009, k * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
}

function paintShopShelf(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // THE OPEN SHELF: no carcass, no backboard, no box — two
  // chamfered uprights and three laden boards with DAYLIGHT
  // between them. The ground reads straight through the bays,
  // so the outline pass rings every good on the boards
  // INDIVIDUALLY (each stands as its own silhouette; gaps are
  // kept wider than the ring so the dilate never bridges two
  // neighbors into one blob). The stock is dealt by THE HASH:
  // each row draws a THEME, each slot a good, and sizes, hues,
  // leans, and honest sold-out gaps are all positional — no two
  // shelves in a street carry the same stock. paintShelfGood is
  // ONE dispatcher keyed by (kind, seed): the seam a future
  // player-stocked shelf plugs into — deal kinds from a ledger
  // instead of the hash and the same painter shows a player's
  // own wares. The DisplayTable deals from the same contract.
  const hw = s * 0.46;
  const topY = baseY - s * 1.42;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.62, 1.75, 0.42),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.05, s * 0.07),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.06, s * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      // Row themes walk the hash's rotation on a stride of
      // three — three rows, always three different trades'
      // worth of stock. Theme 9 is BRIC-A-BRAC: every slot
      // deals its own kind (the back-room shelf).
      const themeBase = h % 10;
      // ---- The carcassless frame: boards first (behind the
      // posts' front faces), goods on top, posts last so the
      // uprights cap the ends cleanly.
      const boards = [
        { by: baseY - s * 0.44 },
        { by: baseY - s * 0.9 },
        { by: baseY - s * 1.36 },
      ];
      const sag = (bx: number) => {
        const t2 = bx / (hw * 0.92);
        return (1 - t2 * t2) * s * 0.014;
      };
      for (let row = 0; row < 3; row++) {
        const by = boards[row]!.by;
        // The board: front face bowing under its load, top
        // surface a thin lit sliver the goods STAND on.
        ctx.fillStyle = TWN_OAK_DARK;
        ctx.beginPath();
        ctx.moveTo(p.x - hw * 0.98, by);
        ctx.quadraticCurveTo(p.x, by + sag(0) * 1.9, p.x + hw * 0.98, by);
        ctx.lineTo(p.x + hw * 0.98, by + s * 0.052);
        ctx.quadraticCurveTo(p.x, by + s * 0.052 + sag(0) * 1.9, p.x - hw * 0.98, by + s * 0.052);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = TWN_OAK;
        ctx.beginPath();
        ctx.moveTo(p.x - hw * 0.98, by);
        ctx.quadraticCurveTo(p.x, by + sag(0) * 1.9, p.x + hw * 0.98, by);
        ctx.lineTo(p.x + hw * 0.98, by + s * 0.03);
        ctx.quadraticCurveTo(p.x, by + s * 0.03 + sag(0) * 1.9, p.x - hw * 0.98, by + s * 0.03);
        ctx.closePath();
        ctx.fill();
        // The lit top sliver: the camera's tilt on every plank.
        ctx.fillStyle = TWN_OAK_LIT;
        ctx.beginPath();
        ctx.moveTo(p.x - hw * 0.98, by);
        ctx.quadraticCurveTo(p.x, by + sag(0) * 1.9, p.x + hw * 0.98, by);
        ctx.lineTo(p.x + hw * 0.94, by - syT * 0.055);
        ctx.quadraticCurveTo(p.x, by - syT * 0.055 + sag(0) * 1.9, p.x - hw * 0.94, by - syT * 0.055);
        ctx.closePath();
        ctx.fill();
        // One grain stroke rides the front face.
        ctx.strokeStyle = 'rgba(111, 77, 38, 0.4)';
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.beginPath();
        ctx.moveTo(p.x - hw * 0.7, by + s * 0.038);
        ctx.quadraticCurveTo(p.x + hw * 0.1, by + s * 0.03 + sag(0), p.x + hw * 0.8, by + s * 0.04);
        ctx.stroke();
        // THE STOCK: theme per row, good per slot, gaps where
        // the morning's customers already came.
        const theme = (themeBase + row * 3) % 10;
        const slots = [-0.56, 0, 0.56];
        for (let sl = 0; sl < 3; sl++) {
          const sd = (h >>> (row * 7 + sl * 3)) ^ (row * 41 + sl * 17);
          if ((sd & 7) === 0 && !(row === 0 && sl === 1)) {
            // Sold out: a faint stand-ring where the good stood.
            ctx.fillStyle = 'rgba(60, 44, 24, 0.12)';
            ctx.beginPath();
            ctx.ellipse(p.x + slots[sl]! * hw, by - syT * 0.03 + sag(slots[sl]! * hw), s * 0.04, s * 0.014, 0, 0, Math.PI * 2);
            ctx.fill();
            continue;
          }
          const gx = p.x + slots[sl]! * hw + (((sd >>> 4) & 3) - 1.5) * s * 0.016;
          const gy = by - syT * 0.028 + sag(slots[sl]! * hw);
          const kind = theme === 9 ? (sd >>> 2) % 9 : theme;
          rend.paintShelfGood(kind, gx, gy, sd, s);
        }
      }
      // The uprights: chamfered posts capping the board ends,
      // pegged at every joint, feet pads under.
      for (const m of [-1, 1] as const) {
        const px2 = p.x + m * hw;
        ctx.fillStyle = TWN_OAK_DARK;
        ctx.fillRect(px2 - s * 0.034, topY + s * 0.02, s * 0.068, baseY - topY - s * 0.02);
        ctx.fillStyle = TWN_OAK;
        ctx.fillRect(px2 - s * 0.034, topY + s * 0.02, s * 0.027, baseY - topY - s * 0.02);
        // The chamfer: a beveled crown, lit on the sky side.
        ctx.fillStyle = TWN_OAK_LIT;
        ctx.beginPath();
        ctx.moveTo(px2 - s * 0.034, topY + s * 0.02);
        ctx.lineTo(px2 - s * 0.02, topY);
        ctx.lineTo(px2 + s * 0.02, topY);
        ctx.lineTo(px2 + s * 0.034, topY + s * 0.02);
        ctx.closePath();
        ctx.fill();
        // Foot pad.
        ctx.fillStyle = TWN_OAK_DARK;
        ctx.fillRect(px2 - s * 0.048, baseY - s * 0.028, s * 0.096, s * 0.028);
        // Pegs at each board joint.
        ctx.fillStyle = TWN_BRONZE_LIT;
        for (const b2 of boards) {
          ctx.beginPath();
          ctx.ellipse(px2 + (m < 0 ? s * 0.012 : -s * 0.012), b2.by + s * 0.026, s * 0.009, s * 0.009, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // The price tag: one paper slip strung off a board edge.
      const tagX = p.x + hw * (0.24 + ((h >>> 6) & 3) * 0.14);
      const tagY = boards[1]!.by + s * 0.05;
      ctx.strokeStyle = TWN_ROPE;
      ctx.lineWidth = Math.max(1, s * 0.008);
      ctx.beginPath();
      ctx.moveTo(tagX, tagY - s * 0.005);
      ctx.lineTo(tagX + s * 0.014, tagY + s * 0.035);
      ctx.stroke();
      ctx.fillStyle = TWN_PAPER;
      ctx.save();
      ctx.translate(tagX + s * 0.014, tagY + s * 0.035);
      ctx.rotate(0.18);
      ctx.fillRect(-s * 0.022, 0, s * 0.048, s * 0.06);
      ctx.strokeStyle = 'rgba(74, 60, 40, 0.6)';
      ctx.beginPath();
      ctx.moveTo(-s * 0.012, s * 0.022);
      ctx.lineTo(s * 0.016, s * 0.022);
      ctx.moveTo(-s * 0.012, s * 0.04);
      ctx.lineTo(s * 0.01, s * 0.04);
      ctx.stroke();
      ctx.restore();
    },
  };
}

function paintWallFountain(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // THE SPRING FOUNT — the street's water, PERIOD TRUE: no
  // pipe and no pressure, just the hill's own spring led in
  // behind old fieldstone and let FALL. A rough coped stack a
  // mason laid two lifetimes ago, a worn spout-stone (dealt:
  // leaf, ring boss, or the old hound), and a half-round basin
  // the camera sees INTO (the basket law). Moss holds every
  // shaded seam — old water, old stone. Mid-shift: somebody's
  // ewer sits filled and waiting on the basin lip.
  const sw = s * 0.3;
  const steleTop = baseY - s * 1.32;
  const brx = s * 0.44;
  const rimY = baseY - s * 0.4;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.6, 1.55, 0.45),
    drawShadow: () => rend.castContact(p.x, baseY, brx * 1.12, s * 0.075),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // The wet apron: a street that catches spray all day.
      ctx.fillStyle = 'rgba(24, 30, 40, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, brx * 1.24, s * 0.085, 0, 0, Math.PI * 2);
      ctx.fill();
      // The stele: a plumb worked-stone slab, shadow side and
      // sun side, coping cap showing its foreshortened top.
      ctx.fillStyle = TWN_STONE_DARK;
      ctx.fillRect(p.x - sw, steleTop, sw * 2, baseY - steleTop);
      ctx.fillStyle = TWN_STONE;
      ctx.fillRect(p.x - sw, steleTop, sw * 1.32, baseY - steleTop);
      // FIELDSTONE, not ashlar: rubble the mason found, not
      // blocks he sawed — each stone its own size and tone,
      // the dark bedding reading in the gaps between them.
      for (let k = 0; k < 8; k++) {
        const sd = (h >>> (k * 3)) >>> 0;
        const row = k >> 1;
        const col = k & 1;
        const stW = sw * (0.62 + ((sd >>> 2) & 3) * 0.09);
        const stH = s * (0.2 + ((sd >>> 4) & 3) * 0.028);
        const stX = p.x + (col === 0 ? -sw * 0.46 : sw * 0.42) + (((sd & 3) - 1.5) * sw * 0.14);
        const stY = baseY - s * (0.22 + row * 0.28) - ((sd >>> 6) & 1) * s * 0.03;
        ctx.fillStyle = shade(col ? TWN_STONE_DARK : TWN_STONE, (((sd >>> 3) & 7) - 3) * 4);
        ctx.beginPath();
        ctx.moveTo(stX - stW * 0.5, stY);
        ctx.quadraticCurveTo(stX - stW * 0.56, stY - stH * 0.6, stX - stW * 0.2, stY - stH * 0.62);
        ctx.quadraticCurveTo(stX + stW * 0.3, stY - stH * 0.72, stX + stW * 0.5, stY - stH * 0.3);
        ctx.quadraticCurveTo(stX + stW * 0.54, stY + stH * 0.1, stX + stW * 0.2, stY + stH * 0.2);
        ctx.quadraticCurveTo(stX - stW * 0.3, stY + stH * 0.28, stX - stW * 0.5, stY);
        ctx.closePath();
        ctx.fill();
        // One lit brow per stone where the sun grazes it.
        ctx.strokeStyle = 'rgba(198, 189, 166, 0.4)';
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        ctx.moveTo(stX - stW * 0.34, stY - stH * 0.52);
        ctx.quadraticCurveTo(stX, stY - stH * 0.66, stX + stW * 0.32, stY - stH * 0.4);
        ctx.stroke();
      }
      // The coping cap: proud of the slab, lit top plane, its
      // far edge shaded — the 2.5D crown of every tall stone.
      ctx.fillStyle = TWN_STONE_DARK;
      ctx.fillRect(p.x - sw * 1.18, steleTop - s * 0.02, sw * 2.36, s * 0.075);
      ctx.fillStyle = TWN_STONE_LIT;
      ctx.fillRect(p.x - sw * 1.18, steleTop - s * 0.02 - syT * 0.09, sw * 2.36, syT * 0.09);
      ctx.fillStyle = 'rgba(90, 82, 66, 0.45)';
      ctx.fillRect(p.x - sw * 1.18, steleTop - s * 0.02 - syT * 0.09, sw * 2.36, s * 0.014);
      // THE SPOUT-STONE deals by hash: 0 a carved leaf, 1 a
      // ring boss, 2 the old hound's blunt muzzle — cut big
      // and worn soft, two value steps darker than the wall,
      // the one piece of the stack anyone ever CARVED.
      const maskY = baseY - s * 0.86;
      const mask = (h >>> 4) % 3;
      // Two value steps darker than the slab (pass-2: one step
      // read as a smudge), lit accents full-bright.
      const maskTone = shade(TWN_STONE_DARK, -16);
      if (mask === 0) {
        ctx.fillStyle = maskTone;
        ctx.beginPath();
        ctx.moveTo(p.x, maskY - s * 0.12);
        ctx.quadraticCurveTo(p.x - s * 0.115, maskY - s * 0.04, p.x, maskY + s * 0.075);
        ctx.quadraticCurveTo(p.x + s * 0.115, maskY - s * 0.04, p.x, maskY - s * 0.12);
        ctx.fill();
        ctx.strokeStyle = TWN_STONE_LIT;
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(p.x, maskY - s * 0.1);
        ctx.lineTo(p.x, maskY + s * 0.05);
        ctx.moveTo(p.x - s * 0.05, maskY - s * 0.03);
        ctx.lineTo(p.x, maskY + s * 0.015);
        ctx.moveTo(p.x + s * 0.05, maskY - s * 0.03);
        ctx.lineTo(p.x, maskY + s * 0.015);
        ctx.stroke();
      } else if (mask === 1) {
        ctx.strokeStyle = maskTone;
        ctx.lineWidth = Math.max(1.5, s * 0.035);
        ctx.beginPath();
        ctx.ellipse(p.x, maskY - s * 0.02, s * 0.085, s * 0.085, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = TWN_STONE_LIT;
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.ellipse(p.x, maskY - s * 0.02, s * 0.085, s * 0.085, 0, Math.PI * 0.9, Math.PI * 1.7);
        ctx.stroke();
      } else {
        ctx.fillStyle = maskTone;
        ctx.beginPath();
        ctx.moveTo(p.x - s * 0.095, maskY - s * 0.1);
        ctx.quadraticCurveTo(p.x - s * 0.11, maskY + s * 0.02, p.x - s * 0.038, maskY + s * 0.055);
        ctx.lineTo(p.x + s * 0.038, maskY + s * 0.055);
        ctx.quadraticCurveTo(p.x + s * 0.11, maskY + s * 0.02, p.x + s * 0.095, maskY - s * 0.1);
        ctx.quadraticCurveTo(p.x, maskY - s * 0.155, p.x - s * 0.095, maskY - s * 0.1);
        ctx.fill();
        // Ears folded flat, brow ridges lit.
        ctx.fillStyle = TWN_STONE_LIT;
        ctx.beginPath();
        ctx.ellipse(p.x - s * 0.05, maskY - s * 0.075, s * 0.026, s * 0.015, -0.4, 0, Math.PI * 2);
        ctx.ellipse(p.x + s * 0.05, maskY - s * 0.075, s * 0.026, s * 0.015, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      // The spout throat below the mask: a short dark stub.
      ctx.fillStyle = '#2c2a26';
      ctx.beginPath();
      ctx.ellipse(p.x, maskY + s * 0.065, s * 0.026, s * 0.017, 0, 0, Math.PI * 2);
      ctx.fill();
      // The basin: outer wall face, sunlit rim ring, water in.
      ctx.fillStyle = TWN_STONE_DARK;
      ctx.beginPath();
      ctx.ellipse(p.x, rimY, brx, brx * 0.42, 0, 0, Math.PI);
      ctx.lineTo(p.x - brx, rimY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TWN_STONE_DARK;
      ctx.fillRect(p.x - brx, rimY - s * 0.02, brx * 2, s * 0.02);
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.09, brx * 0.96, s * 0.075, 0, 0, Math.PI);
      ctx.lineTo(p.x - brx, rimY);
      ctx.lineTo(p.x + brx, rimY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TWN_STONE;
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.085, brx * 0.9, s * 0.062, 0, 0.12, Math.PI - 0.12);
      ctx.fill();
      ctx.fillStyle = TWN_STONE;
      ctx.beginPath();
      ctx.ellipse(p.x, rimY, brx, brx * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = TWN_STONE_LIT;
      ctx.lineWidth = Math.max(1.5, s * 0.04);
      ctx.beginPath();
      ctx.ellipse(p.x, rimY - s * 0.012, brx * 0.96, brx * 0.31, 0, Math.PI * 1.06, Math.PI * 1.94);
      ctx.stroke();
      // The water inside: street water holding a little sky.
      ctx.fillStyle = TWN_WATER;
      ctx.beginPath();
      ctx.ellipse(p.x, rimY, brx * 0.8, brx * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(159, 196, 216, 0.5)';
      ctx.beginPath();
      ctx.ellipse(p.x - brx * 0.22, rimY - s * 0.015, brx * 0.3, brx * 0.1, -0.15, 0, Math.PI * 2);
      ctx.fill();
      // Drift rings where the rope lands (<4Hz, offset phases).
      for (let k = 0; k < 2; k++) {
        const ph = (t * 0.42 + k * 0.5 + ((h >>> 2) & 3) * 0.12) % 1;
        ctx.strokeStyle = `rgba(198, 222, 232, ${(0.42 * (1 - ph)).toFixed(3)})`;
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.ellipse(p.x + brx * 0.08, rimY, brx * (0.14 + ph * 0.52), brx * (0.05 + ph * 0.17), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // THE ROPE: one bright thread off the mask into the
      // basin, shimmering on its own slow phase; a wet streak
      // darkens the stele it has poured past for years.
      ctx.fillStyle = 'rgba(52, 62, 72, 0.22)';
      ctx.fillRect(p.x - s * 0.035, maskY + s * 0.08, s * 0.07, rimY - maskY - s * 0.12);
      const glint = 0.6 + Math.sin(t * 2.1 + ((h >>> 6) & 7)) * 0.18;
      ctx.strokeStyle = `rgba(206, 230, 240, ${glint.toFixed(3)})`;
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(p.x, maskY + s * 0.07);
      ctx.quadraticCurveTo(p.x + s * 0.035, (maskY + rimY) / 2, p.x + s * 0.055, rimY - s * 0.02);
      ctx.stroke();
      ctx.fillStyle = `rgba(220, 238, 244, ${(glint * 0.8).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(p.x + s * 0.06, rimY - s * 0.012, s * 0.022, s * 0.011, 0, 0, Math.PI * 2);
      ctx.fill();
      // The waiting ewer on the lip — filled, not forgotten.
      const ex = p.x - brx * 0.72;
      ctx.fillStyle = '#5c748a';
      ctx.beginPath();
      ctx.moveTo(ex - s * 0.02, rimY - s * 0.15);
      ctx.quadraticCurveTo(ex - s * 0.075, rimY - s * 0.09, ex - s * 0.052, rimY - s * 0.005);
      ctx.lineTo(ex + s * 0.052, rimY - s * 0.005);
      ctx.quadraticCurveTo(ex + s * 0.075, rimY - s * 0.09, ex + s * 0.02, rimY - s * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade('#5c748a', 24);
      ctx.beginPath();
      ctx.moveTo(ex - s * 0.014, rimY - s * 0.145);
      ctx.quadraticCurveTo(ex - s * 0.055, rimY - s * 0.09, ex - s * 0.04, rimY - s * 0.005);
      ctx.lineTo(ex - s * 0.006, rimY - s * 0.005);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shade('#5c748a', -18);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.arc(ex + s * 0.045, rimY - s * 0.1, s * 0.026, -Math.PI * 0.55, Math.PI * 0.45);
      ctx.stroke();
      // Moss holds the shaded rim quarter AND the stele's wet
      // seams — a spring has run here longer than anyone alive.
      ctx.fillStyle = 'rgba(93, 124, 66, 0.55)';
      for (let k = 0; k < 5; k++) {
        const a = Math.PI * (0.12 + k * 0.11) + ((h >>> (k + 3)) & 3) * 0.05;
        ctx.beginPath();
        ctx.ellipse(p.x + Math.cos(a) * brx * 0.96, rimY + Math.sin(a) * brx * 0.3, s * 0.024, s * 0.014, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(93, 124, 66, 0.45)';
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.ellipse(
          p.x - sw * 0.85 + ((h >>> (k * 2 + 5)) & 3) * sw * 0.16,
          baseY - s * (0.3 + k * 0.34),
          s * 0.02, s * 0.03, 0.3, 0, Math.PI * 2,
        );
        ctx.fill();
      }
      // The fern in the footing crack: green finds the water.
      ctx.strokeStyle = '#5d7c42';
      ctx.lineWidth = Math.max(1, s * 0.012);
      const fnx = p.x + sw * 1.12;
      for (const fa of [-0.5, -0.1, 0.35]) {
        ctx.beginPath();
        ctx.moveTo(fnx, baseY - s * 0.02);
        ctx.quadraticCurveTo(fnx + fa * s * 0.06, baseY - s * 0.1, fnx + fa * s * 0.14, baseY - s * (0.13 + Math.abs(fa) * 0.05));
        ctx.stroke();
      }
    },
  };
}

function paintWaterTrough(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The street trough: a LONG staved run of still water on two
  // trestles, set where the hitching rail wants it. Everything
  // the quench tub is not — low, bright, clean, patient. The
  // dipper hangs off a dealt end; one leaf rides the surface
  // (<4Hz drift); a mossy year shows on one-in-four.
  // PASS-2 VERDICT — THE TROUGH IS TIMBER FIRST: the first
  // build's water ellipse swallowed the body and the whole
  // piece read as an oval pool. The staved run now RISES: a
  // tall front face with real seams, bands with height, end
  // caps, and trestles that show daylight under the belly.
  const hw = s * 0.56;
  const rimY = baseY - s * 0.44;
  const mossy = ((h >>> 7) & 3) === 0;
  const dm = ((h >>> 2) & 1) ? 1 : -1;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.68, 0.9, 0.42),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.1, s * 0.065),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // Hoof-muddled ground: the read of a USED waterer.
      ctx.fillStyle = 'rgba(52, 40, 24, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.015, hw * 1.2, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      // The trestle feet: two splayed pairs, straight posts
      // (the bellows law — X-legs read as barrow struts), with
      // DAYLIGHT under the belly between them.
      ctx.fillStyle = TWN_OAK_DARK;
      for (const e of [-1, 1] as const) {
        ctx.fillRect(p.x + e * hw * 0.66 - s * 0.032, baseY - s * 0.16, s * 0.064, s * 0.16);
        ctx.fillRect(p.x + e * hw * 0.66 - s * 0.085, baseY - s * 0.03, s * 0.17, s * 0.03);
      }
      // The body: a long deep box riding the trestles — the
      // TIMBER is the mass now. Dark carcass, lit stave run on
      // the sun half, bold seams parting the staves.
      const bellyY = baseY - s * 0.13;
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.beginPath();
      ctx.moveTo(p.x - hw, rimY);
      ctx.quadraticCurveTo(p.x - hw * 1.06, (rimY + bellyY) / 2, p.x - hw * 0.94, bellyY);
      ctx.lineTo(p.x + hw * 0.94, bellyY);
      ctx.quadraticCurveTo(p.x + hw * 1.06, (rimY + bellyY) / 2, p.x + hw, rimY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TWN_OAK;
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.97, rimY + s * 0.015);
      ctx.lineTo(p.x - hw * 0.92, bellyY - s * 0.005);
      ctx.lineTo(p.x - hw * 0.05, bellyY - s * 0.005);
      ctx.lineTo(p.x - hw * 0.02, rimY + s * 0.015);
      ctx.closePath();
      ctx.fill();
      // End caps: proud vertical boards capping both ends.
      for (const e of [-1, 1] as const) {
        ctx.fillStyle = e < 0 ? shade(TWN_OAK, 8) : TWN_OAK_DARK;
        ctx.fillRect(p.x + e * hw - (e < 0 ? s * 0.04 : 0), rimY - s * 0.02, s * 0.04, bellyY - rimY + s * 0.02);
        ctx.fillStyle = TWN_OAK_LIT;
        ctx.fillRect(p.x + e * hw - (e < 0 ? s * 0.04 : 0), rimY - s * 0.02, s * 0.04, s * 0.014);
      }
      ctx.strokeStyle = 'rgba(50, 36, 18, 0.55)';
      ctx.lineWidth = Math.max(1, s * 0.013);
      for (const k of [-0.62, -0.3, 0.04, 0.38, 0.68]) {
        ctx.beginPath();
        ctx.moveTo(p.x + hw * k, rimY + s * 0.025);
        ctx.lineTo(p.x + hw * (k * 0.96), bellyY - s * 0.01);
        ctx.stroke();
      }
      // Two iron bands with one lit edge each — real height.
      ctx.fillStyle = TWN_IRON;
      ctx.fillRect(p.x - hw * 0.99, rimY + s * 0.06, hw * 1.98, s * 0.038);
      ctx.fillRect(p.x - hw * 0.96, bellyY - s * 0.075, hw * 1.92, s * 0.034);
      ctx.fillStyle = 'rgba(210, 218, 226, 0.35)';
      ctx.fillRect(p.x - hw * 0.99, rimY + s * 0.06, hw * 1.98, s * 0.012);
      // The rim lip and the LONG water: a slim bright band —
      // sky in a wooden sleeve, never a pool wearing planks.
      ctx.fillStyle = shade(TWN_OAK, 14);
      ctx.beginPath();
      ctx.ellipse(p.x, rimY, hw, s * 0.062, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = TWN_WATER;
      ctx.beginPath();
      ctx.ellipse(p.x, rimY, hw * 0.9, s * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(159, 196, 216, 0.55)';
      ctx.beginPath();
      ctx.ellipse(p.x - hw * 0.3, rimY - s * 0.008, hw * 0.34, s * 0.018, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE LEAF rides its slow beat across the surface, a
      // faint shadow ring under it (<4Hz — one lap, a pause).
      const lph = Math.sin(t * 0.5 + ((h >>> 4) & 7) * 0.8);
      const lx = p.x + lph * hw * 0.52;
      const ly = rimY + Math.cos(t * 0.5 + ((h >>> 4) & 7) * 0.8) * s * 0.016;
      ctx.strokeStyle = 'rgba(30, 46, 58, 0.3)';
      ctx.lineWidth = Math.max(1, s * 0.008);
      ctx.beginPath();
      ctx.ellipse(lx, ly, s * 0.035, s * 0.014, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#8a9058';
      ctx.beginPath();
      ctx.ellipse(lx, ly, s * 0.028, s * 0.012, lph * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5d7c42';
      ctx.beginPath();
      ctx.moveTo(lx - s * 0.024, ly);
      ctx.lineTo(lx + s * 0.024, ly);
      ctx.stroke();
      // The dipper: hung on the dealt end stave, bowl down —
      // the drink somebody offers the road.
      const dx = p.x + dm * hw * 0.94;
      ctx.strokeStyle = TWN_OAK_DARK;
      ctx.lineWidth = Math.max(1.5, s * 0.024);
      ctx.beginPath();
      ctx.moveTo(dx, rimY + s * 0.02);
      ctx.lineTo(dx + dm * s * 0.035, rimY + s * 0.16);
      ctx.stroke();
      ctx.fillStyle = '#5c748a';
      ctx.beginPath();
      ctx.ellipse(dx + dm * s * 0.04, rimY + s * 0.185, s * 0.05, s * 0.038, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade('#5c748a', 22);
      ctx.beginPath();
      ctx.ellipse(dx + dm * s * 0.025, rimY + s * 0.172, s * 0.02, s * 0.015, -0.3, 0, Math.PI * 2);
      ctx.fill();
      if (mossy) {
        // The mossy year: green holds the shade line and the
        // trestle feet — old water never quite dries.
        ctx.fillStyle = 'rgba(93, 124, 66, 0.5)';
        for (let k = 0; k < 4; k++) {
          const mx = p.x + (((h >>> (k * 3)) & 7) - 3.5) * hw * 0.24;
          ctx.beginPath();
          ctx.ellipse(mx, baseY - s * 0.12 - ((h >>> (k + 5)) & 1) * s * 0.05, s * 0.026, s * 0.014, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
  };
}

function paintScribesDesk(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The scribe's standing desk: a slant-top on four square
  // legs, pigeonholes under the slope holding the week's
  // scrolls, the ledger OPEN on the slant with its ink still
  // wet — rubric marks red, quill standing in the horn, wax
  // and seal at the top rail. The town's memory, mid-entry.
  const hw = s * 0.42;
  const deskY = baseY - s * 0.72;
  const ribbons = ['#b8434e', '#4e5e7c', '#5d7c42', '#c9a13c'];
  return {
    sortY: ty + 0.68,
    body: stationBody(0.56, 1.3, 0.42),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.08, s * 0.065),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.2)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.05, s * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      // The legs: two visible pairs, square-sawn, stretcher low.
      ctx.fillStyle = TWN_OAK_DARK;
      for (const e of [-1, 1] as const) {
        ctx.fillRect(p.x + e * hw * 0.82 - s * 0.03, deskY + s * 0.16, s * 0.06, baseY - deskY - s * 0.16);
      }
      ctx.fillRect(p.x - hw * 0.8, baseY - s * 0.16, hw * 1.6, s * 0.035);
      // THE PIGEONHOLES: a rack under the slope — three dark
      // mouths, each holding a rolled scroll by its pale end,
      // ribboned in dealt dyes. The desk's working memory.
      ctx.fillStyle = TWN_OAK;
      ctx.fillRect(p.x - hw * 0.92, deskY, hw * 1.84, s * 0.34);
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.fillRect(p.x - hw * 0.92, deskY, hw * 0.6, s * 0.34);
      ctx.strokeStyle = 'rgba(50, 36, 18, 0.55)';
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.strokeRect(p.x - hw * 0.92, deskY, hw * 1.84, s * 0.34);
      for (let k = 0; k < 3; k++) {
        const cx = p.x + (k - 1) * hw * 0.58;
        ctx.fillStyle = '#241c12';
        ctx.fillRect(cx - hw * 0.22, deskY + s * 0.05, hw * 0.44, s * 0.24);
        if ((h >>> (k * 2 + 2)) & 1 || k === 1) {
          // A scroll rides this hole (the center never empty —
          // a working desk is never OUT of paper).
          ctx.fillStyle = '#efe8d4';
          ctx.beginPath();
          ctx.ellipse(cx, deskY + s * 0.17, hw * 0.15, s * 0.075, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(120, 100, 70, 0.55)';
          ctx.lineWidth = Math.max(1, s * 0.009);
          ctx.beginPath();
          ctx.ellipse(cx, deskY + s * 0.17, hw * 0.075, s * 0.038, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = ribbons[((h >>> (k * 3 + 1)) >>> 0) % 4]!;
          ctx.lineWidth = Math.max(1, s * 0.014);
          ctx.beginPath();
          ctx.moveTo(cx - hw * 0.02, deskY + s * 0.1);
          ctx.lineTo(cx - hw * 0.02, deskY + s * 0.24);
          ctx.stroke();
        }
      }
      // THE SLANT TOP: the desk's whole face is a foreshortened
      // plane climbing away from the camera — front edge low,
      // back rail high, the 2.5D read doing the talking.
      const frontY = deskY;
      const backY = deskY - syT * 0.42;
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.beginPath();
      ctx.moveTo(p.x - hw, frontY);
      ctx.lineTo(p.x + hw, frontY);
      ctx.lineTo(p.x + hw * 0.9, backY);
      ctx.lineTo(p.x - hw * 0.9, backY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TWN_OAK;
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.96, frontY - s * 0.008);
      ctx.lineTo(p.x + hw * 0.96, frontY - s * 0.008);
      ctx.lineTo(p.x + hw * 0.87, backY);
      ctx.lineTo(p.x - hw * 0.87, backY);
      ctx.closePath();
      ctx.fill();
      // The front lip holds the pens: a thin lit rail.
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.fillRect(p.x - hw, frontY - s * 0.008, hw * 2, s * 0.024);
      // The back rail: top plane sliver + inkhorn hole row.
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.fillRect(p.x - hw * 0.9, backY - s * 0.03, hw * 1.8, s * 0.03);
      // THE LEDGER, open on the slope: two pages, ruled lines
      // following the plane's rake, today's entry half-done —
      // and the rubric red where the law wants remembering.
      const lx = p.x - hw * 0.12;
      ctx.fillStyle = '#efe8d4';
      ctx.beginPath();
      ctx.moveTo(lx - hw * 0.56, frontY - s * 0.05);
      ctx.lineTo(lx + hw * 0.56, frontY - s * 0.05);
      ctx.lineTo(lx + hw * 0.5, backY + syT * 0.05);
      ctx.lineTo(lx - hw * 0.5, backY + syT * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f8f2e0';
      ctx.beginPath();
      ctx.moveTo(lx - hw * 0.56, frontY - s * 0.05);
      ctx.lineTo(lx, frontY - s * 0.055);
      ctx.lineTo(lx, backY + syT * 0.05);
      ctx.lineTo(lx - hw * 0.5, backY + syT * 0.05);
      ctx.closePath();
      ctx.fill();
      // The gutter.
      ctx.strokeStyle = 'rgba(120, 100, 70, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(lx, frontY - s * 0.055);
      ctx.lineTo(lx, backY + syT * 0.05);
      ctx.stroke();
      // Ruled entries: left page full, right page HALF — the
      // wet line stops mid-column. Mid-shift, made visible.
      ctx.strokeStyle = 'rgba(74, 60, 40, 0.6)';
      ctx.lineWidth = Math.max(1, s * 0.008);
      for (let k = 0; k < 4; k++) {
        const yy = frontY - s * 0.085 - k * s * 0.045;
        ctx.beginPath();
        ctx.moveTo(lx - hw * 0.46, yy);
        ctx.lineTo(lx - hw * 0.08, yy - s * 0.004);
        ctx.stroke();
        if (k > 1) continue;
        ctx.beginPath();
        ctx.moveTo(lx + hw * 0.08, yy - s * 0.004);
        ctx.lineTo(lx + hw * (k === 1 ? 0.26 : 0.46), yy - s * 0.008);
        ctx.stroke();
      }
      // Rubric marks: two red capitals down the left rule.
      ctx.strokeStyle = '#a83c34';
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(lx - hw * 0.5, frontY - s * 0.09);
      ctx.lineTo(lx - hw * 0.5, frontY - s * 0.12);
      ctx.moveTo(lx - hw * 0.5, frontY - s * 0.175);
      ctx.lineTo(lx - hw * 0.5, frontY - s * 0.205);
      ctx.stroke();
      // THE INKHORN in its bored hole, quill standing at the
      // writing angle — feather catching what light is left.
      const ix = p.x + hw * 0.62;
      ctx.fillStyle = '#2c2420';
      ctx.beginPath();
      ctx.moveTo(ix - s * 0.03, backY - s * 0.005);
      ctx.lineTo(ix - s * 0.02, backY - s * 0.075);
      ctx.lineTo(ix + s * 0.02, backY - s * 0.075);
      ctx.lineTo(ix + s * 0.03, backY - s * 0.005);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4a4038';
      ctx.beginPath();
      ctx.ellipse(ix, backY - s * 0.075, s * 0.02, s * 0.009, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#efe8d4';
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(ix, backY - s * 0.08);
      ctx.quadraticCurveTo(ix + s * 0.05, backY - s * 0.22, ix + s * 0.1, backY - s * 0.3);
      ctx.stroke();
      ctx.fillStyle = '#f6f0dc';
      ctx.beginPath();
      ctx.ellipse(ix + s * 0.085, backY - s * 0.27, s * 0.014, s * 0.05, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120, 100, 70, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.008);
      ctx.beginPath();
      ctx.moveTo(ix + s * 0.06, backY - s * 0.2);
      ctx.lineTo(ix + s * 0.105, backY - s * 0.31);
      ctx.stroke();
      // Sealing wax and the brass seal by the far rail.
      ctx.fillStyle = '#a83c34';
      ctx.save();
      ctx.translate(p.x - hw * 0.68, backY + syT * 0.1);
      ctx.rotate(0.3);
      ctx.fillRect(-s * 0.055, -s * 0.012, s * 0.11, s * 0.024);
      ctx.fillStyle = '#c9564a';
      ctx.fillRect(-s * 0.055, -s * 0.012, s * 0.11, s * 0.008);
      ctx.restore();
      ctx.fillStyle = TWN_BRONZE;
      ctx.fillRect(p.x - hw * 0.58, backY + syT * 0.16, s * 0.022, s * 0.05);
      ctx.fillStyle = TWN_BRONZE_LIT;
      ctx.beginPath();
      ctx.ellipse(p.x - hw * 0.58 + s * 0.011, backY + syT * 0.22, s * 0.026, s * 0.013, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

function paintCandleRack(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The chandler's curing rack: dipped pairs hung over two
  // rails by their shared wick, tallow cream and beeswax honey
  // dealt down the rows, one pair in four dye-dipped at the
  // tip. The tray below keeps every drip the rack ever lost.
  // Reads against the herb rack by MATERIAL: straight pale
  // wax where the herbalist hangs loose green.
  const hw = s * 0.42;
  const railHi = baseY - s * 1.06;
  const railLo = baseY - s * 0.62;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.56, 1.35, 0.4),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.05, s * 0.06),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.2)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.02, s * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE DRIP TRAY: a shallow curb the rack stands in —
      // wax puddles pooled pale where the rows let go.
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.fillRect(p.x - hw * 0.98, baseY - s * 0.075, hw * 1.96, s * 0.075);
      ctx.fillStyle = TWN_OAK;
      ctx.fillRect(p.x - hw * 0.98, baseY - s * 0.075, hw * 1.96, s * 0.024);
      for (let k = 0; k < 3; k++) {
        const wx = p.x + (((h >>> (k * 4 + 2)) & 7) - 3.5) * hw * 0.24;
        ctx.fillStyle = TRD_WAX_LIT;
        ctx.beginPath();
        ctx.ellipse(wx, baseY - s * 0.045, s * (0.03 + ((h >>> (k + 6)) & 1) * 0.014), s * 0.012, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // The posts: straight, chamfer-crowned like the shelf's.
      for (const e of [-1, 1] as const) {
        const px2 = p.x + e * hw * 0.9;
        ctx.fillStyle = TWN_OAK_DARK;
        ctx.fillRect(px2 - s * 0.03, baseY - s * 1.22, s * 0.06, s * 1.16);
        ctx.fillStyle = TWN_OAK;
        ctx.fillRect(px2 - s * 0.03, baseY - s * 1.22, s * 0.024, s * 1.16);
        ctx.fillStyle = TWN_OAK_LIT;
        ctx.beginPath();
        ctx.moveTo(px2 - s * 0.03, baseY - s * 1.22);
        ctx.lineTo(px2 - s * 0.016, baseY - s * 1.24);
        ctx.lineTo(px2 + s * 0.016, baseY - s * 1.24);
        ctx.lineTo(px2 + s * 0.03, baseY - s * 1.22);
        ctx.closePath();
        ctx.fill();
      }
      // Two rails, lit on top.
      for (const ry2 of [railHi, railLo]) {
        ctx.fillStyle = TWN_OAK;
        ctx.fillRect(p.x - hw * 0.9, ry2, hw * 1.8, s * 0.035);
        ctx.fillStyle = TWN_OAK_LIT;
        ctx.fillRect(p.x - hw * 0.9, ry2, hw * 1.8, s * 0.012);
      }
      // THE ROWS: pairs straddle each rail — two straight
      // tapers joined by one wick arc. Tone deals per pair;
      // one-in-four takes the dyer's tip.
      const waxTones = [TRD_WAX, '#e0c98c', TRD_WAX, '#d8bd7a'];
      for (let row = 0; row < 2; row++) {
        const ry2 = row === 0 ? railHi : railLo;
        const n = 3 + ((h >>> (row + 4)) & 1);
        for (let k = 0; k < n; k++) {
          const sd = (h >>> (row * 9 + k * 3)) ^ (row * 23 + k * 11);
          const cx = p.x + ((k + 0.5) / n - 0.5) * hw * 1.7 + ((sd & 3) - 1.5) * s * 0.012;
          const tone = waxTones[(sd >>> 2) % 4]!;
          const dip = (sd & 15) === 3 ? AWNING_CLOTHS[(sd >>> 4) % 10]!.a : null;
          const cl = s * (0.2 + ((sd >>> 3) & 3) * 0.016);
          for (const e of [-1, 1] as const) {
            const cx2 = cx + e * s * 0.026;
            ctx.fillStyle = tone;
            ctx.beginPath();
            ctx.moveTo(cx2 - s * 0.014, ry2 + s * 0.035);
            ctx.lineTo(cx2 - s * 0.009, ry2 + s * 0.035 + cl);
            ctx.lineTo(cx2 + s * 0.009, ry2 + s * 0.035 + cl);
            ctx.lineTo(cx2 + s * 0.014, ry2 + s * 0.035);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = shade(tone, 16);
            ctx.fillRect(cx2 - s * 0.014, ry2 + s * 0.035, s * 0.009, cl - s * 0.004);
            // The shade edge: candles must turn, not stripe.
            ctx.fillStyle = shade(tone, -18);
            ctx.fillRect(cx2 + s * 0.006, ry2 + s * 0.038, s * 0.005, cl - s * 0.01);
            if (dip) {
              // The dyer's tip: the bottom third took color.
              ctx.fillStyle = dip;
              ctx.beginPath();
              ctx.moveTo(cx2 - s * 0.0105, ry2 + s * 0.035 + cl * 0.66);
              ctx.lineTo(cx2 - s * 0.009, ry2 + s * 0.035 + cl);
              ctx.lineTo(cx2 + s * 0.009, ry2 + s * 0.035 + cl);
              ctx.lineTo(cx2 + s * 0.0105, ry2 + s * 0.035 + cl * 0.66);
              ctx.closePath();
              ctx.fill();
            }
            // The hanging wick nub.
            ctx.strokeStyle = '#4a4038';
            ctx.lineWidth = Math.max(1, s * 0.008);
            ctx.beginPath();
            ctx.moveTo(cx2, ry2 + s * 0.035 + cl);
            ctx.lineTo(cx2, ry2 + s * 0.035 + cl + s * 0.014);
            ctx.stroke();
          }
          // The shared wick over the rail.
          ctx.strokeStyle = '#4a4038';
          ctx.lineWidth = Math.max(1, s * 0.012);
          ctx.beginPath();
          ctx.moveTo(cx - s * 0.026, ry2 + s * 0.038);
          ctx.quadraticCurveTo(cx, ry2 - s * 0.012, cx + s * 0.026, ry2 + s * 0.038);
          ctx.stroke();
        }
      }
      // The wick coil on its post peg — tomorrow's rows.
      const wpx = p.x - hw * 0.9;
      ctx.strokeStyle = TWN_ROPE;
      ctx.lineWidth = Math.max(1.5, s * 0.022);
      ctx.beginPath();
      ctx.ellipse(wpx, baseY - s * 0.42, s * 0.05, s * 0.062, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = shade(TWN_ROPE, -18);
      ctx.lineWidth = Math.max(1, s * 0.009);
      ctx.beginPath();
      ctx.ellipse(wpx, baseY - s * 0.42, s * 0.032, s * 0.045, 0, 0, Math.PI * 2);
      ctx.stroke();
      // The bundle crock at the foot: finished dozens, tied.
      const bx2 = p.x + hw * 0.68;
      ctx.fillStyle = '#5c748a';
      ctx.beginPath();
      ctx.moveTo(bx2 - s * 0.06, baseY - s * 0.2);
      ctx.lineTo(bx2 - s * 0.048, baseY - s * 0.06);
      ctx.lineTo(bx2 + s * 0.048, baseY - s * 0.06);
      ctx.lineTo(bx2 + s * 0.06, baseY - s * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade('#5c748a', 22);
      ctx.fillRect(bx2 - s * 0.052, baseY - s * 0.195, s * 0.02, s * 0.13);
      for (let k = 0; k < 3; k++) {
        const cx2 = bx2 + (k - 1) * s * 0.026;
        ctx.fillStyle = k === 1 ? TRD_WAX_LIT : TRD_WAX;
        ctx.fillRect(cx2 - s * 0.009, baseY - s * 0.34 + Math.abs(k - 1) * s * 0.02, s * 0.018, s * 0.15 - Math.abs(k - 1) * s * 0.02);
      }
      ctx.strokeStyle = TWN_ROPE;
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(bx2 - s * 0.038, baseY - s * 0.26);
      ctx.lineTo(bx2 + s * 0.038, baseY - s * 0.265);
      ctx.stroke();
    },
  };
}

function paintFletchersBench(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The fletcher's bench: a low slab with the feather box
  // spilling dealt fletch, the drawknife parked mid-stroke,
  // the day's arrows standing in their ring crate — points
  // down, colors up — and two staves leaning, tomorrow's bows.
  const hw = s * 0.44;
  const benchY = baseY - s * 0.46;
  const fletch = ['#c05a48', '#e8dcc4', '#c9a13c', '#5c748a'];
  return {
    sortY: ty + 0.68,
    body: stationBody(0.62, 1.2, 0.42),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.1, s * 0.065),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.2)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.08, s * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      // Shaving curls where the drawknife has been all morning.
      ctx.strokeStyle = 'rgba(224, 196, 154, 0.7)';
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (let k = 0; k < 3; k++) {
        const cx = p.x + (((h >>> (k * 3 + 2)) & 7) - 3.5) * hw * 0.2;
        ctx.beginPath();
        ctx.arc(cx, baseY - s * 0.02, s * 0.026, Math.PI * 0.2 * k, Math.PI * (1.2 + 0.2 * k));
        ctx.stroke();
      }
      // The bench: thick top, straight legs, lit top plane.
      ctx.fillStyle = TWN_OAK_DARK;
      for (const e of [-1, 1] as const) {
        ctx.fillRect(p.x + e * hw * 0.74 - s * 0.032, benchY, s * 0.064, baseY - benchY);
      }
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.fillRect(p.x - hw * 0.95, benchY - s * 0.055, hw * 1.9, s * 0.055);
      ctx.fillStyle = TWN_OAK;
      ctx.fillRect(p.x - hw * 0.95, benchY - s * 0.055, hw * 1.9, s * 0.03);
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.fillRect(p.x - hw * 0.92, benchY - s * 0.055 - syT * 0.09, hw * 1.84, syT * 0.09);
      ctx.strokeStyle = 'rgba(90, 66, 32, 0.4)';
      ctx.lineWidth = Math.max(1, s * 0.008);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.7, benchY - s * 0.055 - syT * 0.045);
      ctx.lineTo(p.x + hw * 0.75, benchY - s * 0.055 - syT * 0.05);
      ctx.stroke();
      const topY = benchY - s * 0.055 - syT * 0.045;
      // THE FEATHER BOX: an open crate spilling the dealt
      // colors of the trade — the read that says FLETCHER
      // from across the street.
      const fbx = p.x - hw * 0.42;
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.fillRect(fbx - s * 0.115, topY - s * 0.1, s * 0.23, s * 0.1);
      ctx.fillStyle = TWN_OAK;
      ctx.fillRect(fbx - s * 0.115, topY - s * 0.1, s * 0.085, s * 0.1);
      ctx.strokeStyle = 'rgba(50, 36, 18, 0.55)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.strokeRect(fbx - s * 0.115, topY - s * 0.1, s * 0.23, s * 0.1);
      for (let k = 0; k < 5; k++) {
        const sd = (h >>> (k * 3 + 1)) >>> 0;
        const tone = fletch[(sd + k) % 4]!;
        const fx2 = fbx + ((k - 2) * s * 0.038) + ((sd & 3) - 1.5) * s * 0.008;
        ctx.save();
        ctx.translate(fx2, topY - s * 0.095);
        ctx.rotate(((sd & 7) - 3.5) * 0.14);
        ctx.fillStyle = tone;
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.05, s * 0.016, s * 0.055, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = shade(tone, -22);
        ctx.lineWidth = Math.max(1, s * 0.007);
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.005);
        ctx.lineTo(0, -s * 0.1);
        ctx.stroke();
        ctx.restore();
      }
      // One feather ESCAPED — it always does.
      ctx.fillStyle = fletch[(h >>> 9) % 4]!;
      ctx.save();
      ctx.translate(fbx + s * 0.2, topY + s * 0.02);
      ctx.rotate(1.2);
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.013, s * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // THE DRAWKNIFE parked across the bench: blade bright,
      // both handles proud.
      ctx.strokeStyle = TRD_STEEL;
      ctx.lineWidth = Math.max(1.5, s * 0.024);
      ctx.beginPath();
      ctx.moveTo(p.x + hw * 0.08, topY - s * 0.012);
      ctx.quadraticCurveTo(p.x + hw * 0.3, topY - s * 0.045, p.x + hw * 0.52, topY - s * 0.012);
      ctx.stroke();
      ctx.strokeStyle = TRD_STEEL_LIT;
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(p.x + hw * 0.1, topY - s * 0.022);
      ctx.quadraticCurveTo(p.x + hw * 0.3, topY - s * 0.054, p.x + hw * 0.5, topY - s * 0.022);
      ctx.stroke();
      ctx.fillStyle = TWN_OAK_DARK;
      for (const e of [0.04, 0.56] as const) {
        ctx.save();
        ctx.translate(p.x + hw * e, topY - s * 0.008);
        ctx.rotate(e < 0.3 ? 0.9 : -0.9);
        ctx.fillRect(-s * 0.013, -s * 0.05, s * 0.026, s * 0.05);
        ctx.restore();
      }
      // THE RING CRATE of finished arrows at the bench end:
      // shafts lean together, dealt fletch riding the tops.
      const acx = p.x + hw * 0.88;
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.beginPath();
      ctx.moveTo(acx - s * 0.1, baseY - s * 0.3);
      ctx.lineTo(acx - s * 0.085, baseY);
      ctx.lineTo(acx + s * 0.085, baseY);
      ctx.lineTo(acx + s * 0.1, baseY - s * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TWN_OAK;
      ctx.beginPath();
      ctx.moveTo(acx - s * 0.1, baseY - s * 0.3);
      ctx.lineTo(acx - s * 0.085, baseY);
      ctx.lineTo(acx - s * 0.02, baseY);
      ctx.lineTo(acx - s * 0.03, baseY - s * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TWN_IRON;
      ctx.fillRect(acx - s * 0.096, baseY - s * 0.26, s * 0.192, s * 0.022);
      for (let k = 0; k < 4; k++) {
        const sd = (h >>> (k * 4 + 3)) >>> 0;
        const ax = acx + ((k - 1.5) * s * 0.032) + ((sd & 3) - 1.5) * s * 0.006;
        const lean2 = ((sd >>> 2) & 3) * 0.03 - 0.045;
        const ah = s * (0.52 + ((sd >>> 4) & 3) * 0.02);
        ctx.save();
        ctx.translate(ax, baseY - s * 0.28);
        ctx.rotate(lean2);
        ctx.strokeStyle = shade(TWN_OAK_LIT, 8);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -ah);
        ctx.stroke();
        const tone = fletch[(sd >>> 6) % 4]!;
        ctx.fillStyle = tone;
        ctx.beginPath();
        ctx.moveTo(0, -ah + s * 0.016);
        ctx.lineTo(-s * 0.03, -ah + s * 0.09);
        ctx.lineTo(0, -ah + s * 0.07);
        ctx.lineTo(s * 0.03, -ah + s * 0.09);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      // TWO STAVES lean at the bench's west end — clear of
      // the legs (pass-2: they tangled into the frame), long
      // slow bow-curves against open air.
      for (const e of [-1, 1] as const) {
        const sx2 = p.x - hw * (1.22 - (e + 1) * 0.07);
        ctx.strokeStyle = e < 0 ? TWN_OAK : shade(TWN_OAK, 12);
        ctx.lineWidth = Math.max(1.5, s * 0.026);
        ctx.beginPath();
        ctx.moveTo(sx2 + e * s * 0.02, baseY);
        ctx.quadraticCurveTo(sx2 - s * 0.09, baseY - s * 0.55, sx2 + s * 0.02 - e * s * 0.02, baseY - s * 1.0);
        ctx.stroke();
        ctx.strokeStyle = TWN_OAK_LIT;
        ctx.lineWidth = Math.max(1, s * 0.009);
        ctx.beginPath();
        ctx.moveTo(sx2 + e * s * 0.02 - s * 0.008, baseY - s * 0.05);
        ctx.quadraticCurveTo(sx2 - s * 0.098, baseY - s * 0.55, sx2 + s * 0.012 - e * s * 0.02, baseY - s * 0.98);
        ctx.stroke();
      }
    },
  };
}

function paintFishmongerSlab(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The fishmonger's slab: thick cold stone raked toward the
  // street on its piers, the morning catch ranked head-down on
  // crushed ice, the prize fish crosswise where the eye lands
  // first. The scale dish waits, the knife is parked, and the
  // slab lip drips its slow melt into the gutter (<4Hz). The
  // skral smoke their catch on the banks; the TOWN sells it
  // off stone.
  const hw = s * 0.46;
  const slabY = baseY - s * 0.52;
  const nFish = 4 + ((h >>> 6) & 1);
  return {
    sortY: ty + 0.68,
    body: stationBody(0.62, 1.15, 0.42),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.1, s * 0.07),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // The gutter-wet apron: a fish stall never dries.
      ctx.fillStyle = 'rgba(24, 30, 40, 0.26)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.012, hw * 1.16, s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      // The piers: two worked-stone blocks.
      for (const e of [-1, 1] as const) {
        const px2 = p.x + e * hw * 0.62;
        ctx.fillStyle = TWN_STONE_DARK;
        ctx.fillRect(px2 - s * 0.09, slabY, s * 0.18, baseY - slabY);
        ctx.fillStyle = TWN_STONE;
        ctx.fillRect(px2 - s * 0.09, slabY, s * 0.065, baseY - slabY);
        ctx.strokeStyle = 'rgba(90, 82, 66, 0.5)';
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(px2 - s * 0.09, baseY - s * 0.22);
        ctx.lineTo(px2 + s * 0.09, baseY - s * 0.22);
        ctx.stroke();
      }
      // THE SLAB: the display IS the top plane — a deep raked
      // face the camera reads whole. Front edge (thickness)
      // first, then the raked top, then the ice, then the fish.
      ctx.fillStyle = TWN_STONE_DARK;
      ctx.fillRect(p.x - hw, slabY - s * 0.045, hw * 2, s * 0.075);
      ctx.fillStyle = TWN_STONE;
      ctx.fillRect(p.x - hw, slabY - s * 0.045, hw * 2, s * 0.026);
      ctx.fillStyle = TWN_STONE_LIT;
      ctx.beginPath();
      ctx.moveTo(p.x - hw, slabY - s * 0.045);
      ctx.lineTo(p.x + hw, slabY - s * 0.045);
      ctx.lineTo(p.x + hw * 0.93, slabY - s * 0.045 - syT * 0.42);
      ctx.lineTo(p.x - hw * 0.93, slabY - s * 0.045 - syT * 0.42);
      ctx.closePath();
      ctx.fill();
      // THE STRAW BED — PERIOD TRUTH: no fishmonger in this
      // world ever crushed ice. The catch lies on wet straw
      // with dark seaweed laid through it, the way the cart
      // brought it up from the ford at dawn — and the silver
      // reads BRIGHTER against it than it ever did on white.
      ctx.fillStyle = '#a89653';
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.93, slabY - s * 0.055);
      ctx.lineTo(p.x + hw * 0.93, slabY - s * 0.055);
      ctx.lineTo(p.x + hw * 0.87, slabY - s * 0.05 - syT * 0.4);
      ctx.lineTo(p.x - hw * 0.87, slabY - s * 0.05 - syT * 0.4);
      ctx.closePath();
      ctx.fill();
      // Straw strands: lit and shaded stalks crossing the bed.
      ctx.lineWidth = Math.max(1, s * 0.009);
      for (let k = 0; k < 10; k++) {
        const sd = (h >>> ((k * 5) % 27)) >>> 0;
        const sx3 = p.x + (((sd >>> 1) & 15) - 7.5) * hw * 0.115;
        const sy3 = slabY - s * 0.06 - ((sd >>> 5) & 3) * syT * 0.11;
        ctx.strokeStyle = (sd & 1) ? 'rgba(216, 196, 122, 0.85)' : 'rgba(138, 118, 62, 0.8)';
        ctx.beginPath();
        ctx.moveTo(sx3 - s * 0.05, sy3 + ((sd >>> 3) & 3) * s * 0.006);
        ctx.lineTo(sx3 + s * 0.05, sy3 - ((sd >>> 6) & 3) * s * 0.006);
        ctx.stroke();
      }
      // Seaweed laid through the straw: dark wet ribbons.
      for (let k = 0; k < 3; k++) {
        const sd = (h >>> (k * 7 + 3)) >>> 0;
        const wx3 = p.x + (((sd >>> 2) & 7) - 3.5) * hw * 0.2;
        const wy3 = slabY - s * 0.06 - ((sd >>> 5) & 3) * syT * 0.1;
        ctx.strokeStyle = (sd & 1) ? '#3a5540' : '#4a6648';
        ctx.lineWidth = Math.max(1.5, s * 0.02);
        ctx.beginPath();
        ctx.moveTo(wx3 - s * 0.07, wy3);
        ctx.quadraticCurveTo(wx3, wy3 + s * 0.028, wx3 + s * 0.08, wy3 - s * 0.012);
        ctx.stroke();
      }
      // THE CATCH — PASS-2 VERDICT: THE CATCH IS THE READ.
      // The first ranks were slivers a street away from
      // invisible. Every fish grows a full size: fat silver
      // bodies with DARK backs, bold forked tails, gill
      // strokes and black eyes that read across the pad.
      for (let k = 0; k < nFish; k++) {
        const sd = (h >>> (k * 4 + 2)) >>> 0;
        const fx2 = p.x + ((k + 0.5) / nFish - 0.5) * hw * 1.6;
        const fy2 = slabY - s * 0.075 - syT * 0.16;
        const tone = (k & 1) ? TRD_FISH : TRD_FISH_LIT;
        const fl = s * (0.2 + ((sd >>> 2) & 3) * 0.014);
        ctx.save();
        ctx.translate(fx2, fy2);
        ctx.rotate(-0.35 + ((sd & 3) - 1.5) * 0.045);
        // The body: a fat taper from gill to tail root.
        ctx.fillStyle = tone;
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.055, fl, 0, 0, Math.PI * 2);
        ctx.fill();
        // The dark back: a bold dorsal stripe.
        ctx.fillStyle = shade(tone, -30);
        ctx.beginPath();
        ctx.ellipse(-s * 0.024, 0, s * 0.024, fl * 0.95, 0, 0, Math.PI * 2);
        ctx.fill();
        // Belly light.
        ctx.fillStyle = shade(tone, 16);
        ctx.beginPath();
        ctx.ellipse(s * 0.022, s * 0.01, s * 0.018, fl * 0.78, 0, 0, Math.PI * 2);
        ctx.fill();
        // The forked tail: big, dark, unmistakable.
        ctx.fillStyle = shade(tone, -22);
        ctx.beginPath();
        ctx.moveTo(0, fl * 0.88);
        ctx.lineTo(-s * 0.042, fl * 1.3);
        ctx.lineTo(0, fl * 1.08);
        ctx.lineTo(s * 0.042, fl * 1.3);
        ctx.closePath();
        ctx.fill();
        // Gill line + the eye: the fish LOOKS fresh or it
        // doesn't sell.
        ctx.strokeStyle = shade(tone, -32);
        ctx.lineWidth = Math.max(1, s * 0.011);
        ctx.beginPath();
        ctx.arc(0, -fl * 0.6, s * 0.036, Math.PI * 0.2, Math.PI * 0.9);
        ctx.stroke();
        ctx.fillStyle = '#1c242c';
        ctx.beginPath();
        ctx.ellipse(s * 0.014, -fl * 0.76, s * 0.013, s * 0.013, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(246, 252, 254, 0.9)';
        ctx.beginPath();
        ctx.ellipse(s * 0.009, -fl * 0.79, s * 0.005, s * 0.005, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // THE PRIZE: one deep fish crosswise at the front rim —
      // the fishmonger's argument. Deeper body, tall dorsal,
      // scored gill plate, an eye the street meets.
      const pz = slabY - s * 0.08 - syT * 0.03;
      ctx.fillStyle = TRD_FISH;
      ctx.beginPath();
      ctx.ellipse(p.x - hw * 0.08, pz, hw * 0.46, s * 0.078, 0.03, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(TRD_FISH, -26);
      ctx.beginPath();
      ctx.ellipse(p.x - hw * 0.08, pz - s * 0.032, hw * 0.44, s * 0.034, 0.03, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(TRD_FISH, 20);
      ctx.beginPath();
      ctx.ellipse(p.x - hw * 0.06, pz + s * 0.032, hw * 0.38, s * 0.024, 0.03, 0, Math.PI * 2);
      ctx.fill();
      // Tail, dorsal fin, gill and eye.
      ctx.fillStyle = shade(TRD_FISH, -18);
      ctx.beginPath();
      ctx.moveTo(p.x + hw * 0.35, pz - s * 0.014);
      ctx.lineTo(p.x + hw * 0.56, pz - s * 0.07);
      ctx.lineTo(p.x + hw * 0.5, pz + s * 0.004);
      ctx.lineTo(p.x + hw * 0.56, pz + s * 0.065);
      ctx.lineTo(p.x + hw * 0.35, pz + s * 0.016);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.26, pz - s * 0.062);
      ctx.lineTo(p.x - hw * 0.08, pz - s * 0.125);
      ctx.lineTo(p.x + hw * 0.12, pz - s * 0.062);
      ctx.closePath();
      ctx.fill();
      // Fin rays through the dorsal.
      ctx.strokeStyle = shade(TRD_FISH, -30);
      ctx.lineWidth = Math.max(1, s * 0.008);
      for (const kf of [-0.18, -0.08, 0.02]) {
        ctx.beginPath();
        ctx.moveTo(p.x + hw * kf, pz - s * 0.06);
        ctx.lineTo(p.x + hw * (kf - 0.015), pz - s * 0.1);
        ctx.stroke();
      }
      ctx.strokeStyle = shade(TRD_FISH, -30);
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.beginPath();
      ctx.arc(p.x - hw * 0.36, pz, s * 0.044, -Math.PI * 0.42, Math.PI * 0.46);
      ctx.stroke();
      ctx.fillStyle = '#1c242c';
      ctx.beginPath();
      ctx.ellipse(p.x - hw * 0.44, pz - s * 0.016, s * 0.016, s * 0.016, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(246, 252, 254, 0.9)';
      ctx.beginPath();
      ctx.ellipse(p.x - hw * 0.448, pz - s * 0.022, s * 0.006, s * 0.006, 0, 0, Math.PI * 2);
      ctx.fill();
      // The brass scale dish and the parked knife at the rim.
      ctx.fillStyle = TWN_BRONZE;
      ctx.beginPath();
      ctx.ellipse(p.x + hw * 0.72, slabY - s * 0.07 - syT * 0.3, s * 0.06, s * 0.026, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = TWN_BRONZE_LIT;
      ctx.beginPath();
      ctx.ellipse(p.x + hw * 0.72, slabY - s * 0.075 - syT * 0.3, s * 0.06, s * 0.02, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = TRD_STEEL_LIT;
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.62, slabY - s * 0.07 - syT * 0.32);
      ctx.lineTo(p.x - hw * 0.86, slabY - s * 0.055 - syT * 0.26);
      ctx.stroke();
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.save();
      ctx.translate(p.x - hw * 0.58, slabY - s * 0.072 - syT * 0.33);
      ctx.rotate(0.35);
      ctx.fillRect(-s * 0.008, -s * 0.012, s * 0.055, s * 0.022);
      ctx.restore();
      // THE BRINE (<4Hz): the wet bed weeps — one bead
      // gathers at the slab lip, falls, and the gutter keeps
      // its shine.
      const dph = (t * 0.5 + ((h >>> 8) & 3) * 0.22) % 1;
      const dx = p.x + hw * (0.3 - ((h >>> 4) & 3) * 0.2);
      if (dph < 0.3) {
        ctx.fillStyle = `rgba(206, 230, 240, ${(0.5 + dph).toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(dx, slabY + s * 0.032, s * 0.009, s * (0.008 + dph * 0.02), 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (dph < 0.72) {
        const fall = (dph - 0.3) / 0.42;
        ctx.fillStyle = 'rgba(206, 230, 240, 0.75)';
        ctx.beginPath();
        ctx.ellipse(dx, slabY + s * 0.04 + (baseY - slabY - s * 0.05) * fall ** 1.5, s * 0.009, s * 0.016, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const rph = (dph - 0.72) / 0.28;
        ctx.strokeStyle = `rgba(198, 222, 232, ${(0.5 * (1 - rph)).toFixed(3)})`;
        ctx.lineWidth = Math.max(1, s * 0.009);
        ctx.beginPath();
        ctx.ellipse(dx, baseY - s * 0.005, s * (0.012 + rph * 0.045), s * (0.005 + rph * 0.015), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
  };
}

function paintTiedParcels(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // THE PACKED ORDER: wrapped goods twine-tied and stacked —
  // commerce mid-motion, at home beside any counter, pantry,
  // dock, or wagon bed. Two parcels squared and crossed, a
  // dealt third piece leaning with CLEAR AIR between the
  // masses, and a paper tag off the top knot. A parcel is a
  // WRAP, never joinery: fold creases run corner-to-corner
  // where a crate would rule plank lines, and the twine is
  // the one dark line the silhouette owns.
  const m = ((h >>> 3) & 1) ? 1 : -1;
  const wraps: [string, string, string, string] = ['#c4b491', '#b5915e', '#a9a29a', '#a3835c'];
  const wA = wraps[(h >>> 5) & 3] ?? wraps[0];
  const wB = wraps[(((h >>> 5) & 3) + 1 + ((h >>> 7) & 1)) & 3] ?? wraps[1];
  const wC = wraps[(((h >>> 5) & 3) + 3) & 3] ?? wraps[2];
  const bundle = ((h >>> 9) & 1) === 0;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.55, 0.95, 0.45),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.36, s * 0.055),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.2)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, s * 0.36, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      // ONE parcel painter, two castings: front face with its
      // fold creases, west sun and east shade, the chamfered
      // lit top plane, and the twine cross knotted at center.
      const parcel = (cx: number, by: number, pw: number, ph: number, wrap: string) => {
        const topD = syT * 0.26;
        ctx.fillStyle = wrap;
        ctx.fillRect(cx - pw / 2, by - ph, pw, ph);
        // Fold creases: the wrap gathered toward the corners.
        ctx.strokeStyle = 'rgba(60, 48, 30, 0.28)';
        ctx.lineWidth = Math.max(1, s * 0.01);
        for (const e of [-1, 1] as const) {
          ctx.beginPath();
          ctx.moveTo(cx + e * pw * 0.46, by - ph * 0.92);
          ctx.lineTo(cx + e * pw * 0.16, by - ph * 0.4);
          ctx.stroke();
        }
        ctx.fillStyle = shade(wrap, 10);
        ctx.fillRect(cx - pw / 2, by - ph, s * 0.045, ph);
        ctx.fillStyle = shade(wrap, -12);
        ctx.fillRect(cx + pw / 2 - s * 0.045, by - ph, s * 0.045, ph);
        // The lit top plane (the crate-lid law: the bird's eye
        // is where the 2.5D earns its keep).
        ctx.fillStyle = shade(wrap, 18);
        ctx.beginPath();
        chamferRect(ctx, cx - pw / 2 - s * 0.012, by - ph - topD, pw + s * 0.024, topD, s * 0.025);
        ctx.fill();
        // The twine cross: over the top, down the face, knot
        // where they meet the crown.
        ctx.strokeStyle = 'rgba(88, 70, 40, 0.85)';
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(cx, by - ph - topD + s * 0.008);
        ctx.lineTo(cx, by - s * 0.015);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - pw / 2 - s * 0.008, by - ph - topD * 0.42);
        ctx.lineTo(cx + pw / 2 + s * 0.008, by - ph - topD * 0.42);
        ctx.stroke();
        ctx.fillStyle = '#5c4a2c';
        ctx.beginPath();
        ctx.arc(cx, by - ph - topD * 0.42, s * 0.022, 0, Math.PI * 2);
        ctx.fill();
      };
      // The bottom parcel, broad and low; the top one smaller,
      // stepped the dealt way — the stack reads as TWO, and the
      // step stays INSIDE the bottom parcel's shoulders (a top
      // edge past the base edge reads mid-slide, not stacked).
      parcel(p.x - m * s * 0.04, baseY, s * 0.54, s * 0.28, wA);
      parcel(p.x + m * s * 0.04, baseY - s * 0.28 - syT * 0.24, s * 0.36, s * 0.22, wB);
      // The paper tag off the top knot, swung the dealt way.
      const tagX = p.x + m * s * 0.04 + m * s * 0.1;
      const tagY = baseY - s * 0.5 - syT * 0.36;
      ctx.strokeStyle = 'rgba(88, 70, 40, 0.85)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(tagX - m * s * 0.1, tagY - s * 0.02);
      ctx.quadraticCurveTo(tagX - m * s * 0.04, tagY - s * 0.005, tagX, tagY + s * 0.015);
      ctx.stroke();
      ctx.save();
      ctx.translate(tagX, tagY + s * 0.02);
      ctx.rotate(m * 0.3);
      ctx.fillStyle = '#efe8d4';
      ctx.fillRect(-s * 0.035, -s * 0.022, s * 0.07, s * 0.05);
      ctx.fillStyle = 'rgba(74, 62, 44, 0.55)';
      ctx.fillRect(-s * 0.022, -s * 0.004, s * 0.044, s * 0.008);
      ctx.restore();
      // THE LEAN, with clear air off the stack: a knotted
      // cloth bundle or a squat packet tipped on its corner.
      const lx = p.x - m * s * 0.34;
      if (bundle) {
        // The bundle: a squat dome gathered to a tied topknot.
        ctx.fillStyle = shade(wC, -4);
        ctx.beginPath();
        ctx.moveTo(lx - s * 0.13, baseY);
        ctx.quadraticCurveTo(lx - s * 0.15, baseY - s * 0.16, lx - s * 0.045, baseY - s * 0.2);
        ctx.lineTo(lx + s * 0.045, baseY - s * 0.2);
        ctx.quadraticCurveTo(lx + s * 0.15, baseY - s * 0.16, lx + s * 0.13, baseY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(wC, 10);
        ctx.beginPath();
        ctx.moveTo(lx - s * 0.1, baseY - s * 0.01);
        ctx.quadraticCurveTo(lx - s * 0.12, baseY - s * 0.15, lx - s * 0.04, baseY - s * 0.185);
        ctx.lineTo(lx - s * 0.005, baseY - s * 0.185);
        ctx.quadraticCurveTo(lx - s * 0.045, baseY - s * 0.12, lx - s * 0.03, baseY - s * 0.01);
        ctx.closePath();
        ctx.fill();
        // Gather creases rising to the knot.
        ctx.strokeStyle = 'rgba(60, 48, 30, 0.3)';
        ctx.lineWidth = Math.max(1, s * 0.009);
        for (let k = -1; k <= 1; k++) {
          ctx.beginPath();
          ctx.moveTo(lx + k * s * 0.07, baseY - s * 0.03);
          ctx.lineTo(lx + k * s * 0.02, baseY - s * 0.18);
          ctx.stroke();
        }
        // The tied ears above the knot.
        ctx.fillStyle = shade(wC, 6);
        ctx.beginPath();
        ctx.moveTo(lx - s * 0.005, baseY - s * 0.2);
        ctx.lineTo(lx - s * 0.05, baseY - s * 0.26);
        ctx.lineTo(lx - s * 0.012, baseY - s * 0.215);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(lx + s * 0.005, baseY - s * 0.2);
        ctx.lineTo(lx + s * 0.045, baseY - s * 0.255);
        ctx.lineTo(lx + s * 0.014, baseY - s * 0.213);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#5c4a2c';
        ctx.beginPath();
        ctx.arc(lx, baseY - s * 0.2, s * 0.018, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // The packet, tipped against its own corner.
        ctx.save();
        ctx.translate(lx, baseY - s * 0.02);
        ctx.rotate(-m * 0.22);
        ctx.fillStyle = shade(wC, -2);
        ctx.fillRect(-s * 0.115, -s * 0.16, s * 0.23, s * 0.16);
        ctx.fillStyle = shade(wC, 14);
        ctx.fillRect(-s * 0.115, -s * 0.16, s * 0.23, s * 0.035);
        ctx.strokeStyle = 'rgba(88, 70, 40, 0.85)';
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.16);
        ctx.lineTo(0, 0);
        ctx.stroke();
        ctx.restore();
      }
    },
  };
}

function paintDisplayTable(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The merchant's display table: a stout runner-clothed board
  // whose whole top is SHELVING-CONTRACT territory — the same
  // paintShelfGood dispatcher that stocks the open shelf deals
  // three slots here (theme walk, honest sold-out rings), so a
  // street of tables never repeats its wares. The tally board
  // leans on the leg: the count carved, the mark burned.
  const hw = s * 0.46;
  const tableY = baseY - s * 0.66;
  const cloth = AWNING_CLOTHS[(h >>> 5) % 10]!;
  const theme = (h >>> 3) % 10;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.62, 1.25, 0.42),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.08, s * 0.07),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.2)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.04, s * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      // Legs and apron: joinery that means to stay the season.
      ctx.fillStyle = TWN_OAK_DARK;
      for (const e of [-1, 1] as const) {
        ctx.fillRect(p.x + e * hw * 0.78 - s * 0.034, tableY + s * 0.1, s * 0.068, baseY - tableY - s * 0.1);
      }
      ctx.fillRect(p.x - hw * 0.84, tableY + s * 0.045, hw * 1.68, s * 0.07);
      // The top: thick board edge, lit top plane running back.
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.fillRect(p.x - hw, tableY - s * 0.02, hw * 2, s * 0.065);
      ctx.fillStyle = TWN_OAK;
      ctx.fillRect(p.x - hw, tableY - s * 0.02, hw * 2, s * 0.032);
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.beginPath();
      ctx.moveTo(p.x - hw, tableY - s * 0.02);
      ctx.lineTo(p.x + hw, tableY - s * 0.02);
      ctx.lineTo(p.x + hw * 0.94, tableY - s * 0.02 - syT * 0.34);
      ctx.lineTo(p.x - hw * 0.94, tableY - s * 0.02 - syT * 0.34);
      ctx.closePath();
      ctx.fill();
      // THE RUNNER: the dealt dye laid down the middle, tails
      // hanging both ends with the dyer's trim stripe.
      ctx.fillStyle = cloth.a;
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.98, tableY - s * 0.012);
      ctx.lineTo(p.x + hw * 0.98, tableY - s * 0.012);
      ctx.lineTo(p.x + hw * 0.93, tableY - s * 0.022 - syT * 0.3);
      ctx.lineTo(p.x - hw * 0.93, tableY - s * 0.022 - syT * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(cloth.a, -12);
      for (const e of [-1, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(p.x + e * hw * 0.98, tableY - s * 0.012);
        ctx.lineTo(p.x + e * hw, tableY + s * 0.16);
        ctx.lineTo(p.x + e * hw * 0.85, tableY + s * 0.165);
        ctx.lineTo(p.x + e * hw * 0.86, tableY - s * 0.012);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = cloth.b;
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(p.x + e * hw * 0.985, tableY + s * 0.12);
        ctx.lineTo(p.x + e * hw * 0.865, tableY + s * 0.125);
        ctx.stroke();
      }
      // A fold shadow where the runner breaks over the edge.
      ctx.strokeStyle = shade(cloth.a, -18);
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.92, tableY - s * 0.012);
      ctx.lineTo(p.x + hw * 0.92, tableY - s * 0.012);
      ctx.stroke();
      // THE WARES: three dealt slots on the runner — the
      // SHELVING CONTRACT's second customer. Theme walks the
      // hash; theme 9 is BRIC-A-BRAC; the sold-out ring keeps
      // its honest 1-in-8.
      const slots = [-0.56, 0, 0.56];
      for (let sl = 0; sl < 3; sl++) {
        const sd = (h >>> (sl * 5 + 2)) ^ (sl * 29 + 7);
        const gx = p.x + slots[sl]! * hw * 0.9 + (((sd >>> 4) & 3) - 1.5) * s * 0.016;
        const gy = tableY - s * 0.02 - syT * (0.12 + ((sd >>> 6) & 1) * 0.08);
        if ((sd & 7) === 0 && sl !== 1) {
          ctx.fillStyle = 'rgba(60, 44, 24, 0.14)';
          ctx.beginPath();
          ctx.ellipse(gx, gy, s * 0.042, s * 0.015, 0, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        const kind = theme === 9 ? (sd >>> 2) % 9 : (theme + sl * 3) % 9;
        rend.paintShelfGood(kind, gx, gy, sd, s);
      }
      // THE TALLY BOARD: a split plank leaning on the front
      // leg, the count KNIFE-CARVED and the maker's mark
      // BURNED — no chalk and no slate in this world (period
      // truth): a street merchant's arithmetic is notches
      // and scorch.
      const pbx = p.x - hw * 0.55;
      ctx.save();
      ctx.translate(pbx, baseY - s * 0.015);
      ctx.rotate(-0.12);
      // The plank: dark riven back, a paler working face cut
      // a hair off square — a board somebody split, not sawed.
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.fillRect(-s * 0.105, -s * 0.31, s * 0.21, s * 0.31);
      ctx.fillStyle = '#b3905c';
      ctx.beginPath();
      ctx.moveTo(-s * 0.088, -s * 0.295);
      ctx.lineTo(s * 0.082, -s * 0.3);
      ctx.lineTo(s * 0.09, -s * 0.02);
      ctx.lineTo(-s * 0.095, -s * 0.012);
      ctx.closePath();
      ctx.fill();
      // Grain runs the length.
      ctx.strokeStyle = 'rgba(122, 92, 52, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.008);
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, -s * 0.28);
      ctx.lineTo(-s * 0.045, -s * 0.03);
      ctx.moveTo(s * 0.04, -s * 0.285);
      ctx.lineTo(s * 0.048, -s * 0.035);
      ctx.stroke();
      // The carved count: four notches, each cut dark with
      // the lit lip a knife leaves under the stroke.
      for (let k = 0; k < 4; k++) {
        const nx = -s * 0.055 + k * s * 0.034;
        ctx.strokeStyle = 'rgba(58, 40, 20, 0.85)';
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(nx, -s * 0.245);
        ctx.lineTo(nx + s * 0.006, -s * 0.18);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(232, 208, 160, 0.55)';
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.beginPath();
        ctx.moveTo(nx + s * 0.007, -s * 0.24);
        ctx.lineTo(nx + s * 0.012, -s * 0.185);
        ctx.stroke();
      }
      // The fifth stroke cut THROUGH the four — the bundle
      // closed; the morning moved the market.
      ctx.strokeStyle = 'rgba(58, 40, 20, 0.85)';
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.beginPath();
      ctx.moveTo(-s * 0.068, -s * 0.2);
      ctx.lineTo(s * 0.062, -s * 0.235);
      ctx.stroke();
      // The maker's mark burned low: a scorched ring, deeper
      // at its south rim where the iron lingered.
      ctx.strokeStyle = 'rgba(74, 48, 22, 0.8)';
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.ellipse(-s * 0.005, -s * 0.095, s * 0.032, s * 0.03, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(46, 28, 12, 0.7)';
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.ellipse(-s * 0.005, -s * 0.093, s * 0.032, s * 0.028, 0, 0.5, Math.PI - 0.5);
      ctx.stroke();
      ctx.restore();
    },
  };
}


// ── THE COMMONS ──────────────────────────────────────────
// The general shelf every town owns (docs/commons-decor-plan
// .md): flame and faith, stone and festival, tavern and
// table, vessels and chores, yard and water edge. Twenty
// pieces chosen for REPEATED REUSE — each seats in four
// scenes or it didn't make the shelf. TENDED, NEVER LEFT.
// Every flame below is PAINT (zero light entries — the
// LampPost owns the town night).
function paintPillarCandle(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tile, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.14;
  const lit = tile === Tile.PillarCandle;
  // THE BOLD WICK, exclamation form: ONE great column of wax
  // alone on its own spilt base — the family's boldest single
  // mark, a knee-high pillar you can read from across the
  // square. The collar is the story: this candle has burned
  // whole evenings and kept every fall, and the one long
  // runnel that reached the floor froze there.
  const w = s * 0.2;
  const hgt = s * 0.5 * (0.9 + ((h >>> 2) & 3) * 0.07);
  return {
    sortY: ty + 0.52,
    body: stationBody(0.32, 0.9, 0.35),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.22, s * 0.05),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.012, s * 0.24, s * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      // The spilt base it stands in.
      ctx.fillStyle = WAX_RIM;
      ctx.beginPath();
      facetBlob(ctx, p.x, baseY - s * 0.015, s * 0.17, h ^ 0x5c, 6, 0.4);
      ctx.fill();
      ctx.fillStyle = WAX_POOL;
      ctx.beginPath();
      facetBlob(ctx, p.x - s * 0.015, baseY - s * 0.035, s * 0.125, h ^ 0x29, 6, 0.42);
      ctx.fill();
      const topY = paintCandleStick(ctx, p.x, baseY - s * 0.02, w, hgt, s, (h >>> 3) & 7);
      // THE COLLAR: the heavy lobed overhang of every evening
      // it ever kept — brighter than the body, hanging past
      // the crown on both shoulders.
      ctx.fillStyle = WAX_LIT;
      ctx.beginPath();
      ctx.ellipse(p.x - w * 0.42, topY + s * 0.035, w * 0.24, w * 0.3, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(p.x + w * 0.4, topY + s * 0.055, w * 0.2, w * 0.26, -0.25, 0, Math.PI * 2);
      ctx.fill();
      // One short bold drip below the collar — a SHAPE, not a
      // thread (the simplicity law: nothing escapes the wax
      // silhouette to earn its own outline).
      const rm = ((h >>> 6) & 1) ? 1 : -1;
      ctx.fillStyle = WAX_LIT;
      ctx.beginPath();
      ctx.ellipse(p.x + rm * w * 0.36, topY + s * 0.1, w * 0.11, w * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      if (lit) paintCandleFlame(ctx, p.x, topY, s, t, h * 0.23, 1.7);
      else paintDeadWick(ctx, p.x, topY, s, 1.4);
    },
  };
}

function paintTripleCandles(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tile, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.14;
  const lit = tile === Tile.TripleCandles;
  // THE BOLD WICK, trio form: three stepped pillars in one
  // melted base — tall, middle, short, the decorator's classic
  // stair. Three fat columns and nothing else: the form so
  // legible it reads as CANDLES from the far side of a hall,
  // which is exactly the job.
  const trio = [
    { x: -0.15, y: -0.06, w: 0.15, ht: 0.46 },
    { x: 0.07, y: -0.03, w: 0.135, ht: 0.3 },
    { x: 0.21, y: 0.03, w: 0.12, ht: 0.17 },
  ];
  return {
    sortY: ty + 0.54,
    body: stationBody(0.4, 0.85, 0.35),
    drawShadow: () => rend.castContact(p.x + s * 0.02, baseY, s * 0.3, s * 0.055),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x + s * 0.02, baseY + s * 0.012, s * 0.32, s * 0.065, 0, 0, Math.PI * 2);
      ctx.fill();
      // The shared melted base.
      ctx.fillStyle = WAX_RIM;
      ctx.beginPath();
      facetBlob(ctx, p.x + s * 0.03, baseY - s * 0.02, s * 0.24, h ^ 0x63, 7, 0.38);
      ctx.fill();
      ctx.fillStyle = WAX_POOL;
      ctx.beginPath();
      facetBlob(ctx, p.x, baseY - s * 0.04, s * 0.18, h ^ 0x1f, 6, 0.4);
      ctx.fill();
      for (let k = 0; k < trio.length; k++) {
        const c = trio[k]!;
        const cx2 = p.x + c.x * s;
        const cy2 = baseY + c.y * s - s * 0.03;
        const hgt = s * c.ht * (0.9 + (((h >>> (k * 3 + 1)) & 3) / 3) * 0.18);
        const topY = paintCandleStick(ctx, cx2, cy2, s * c.w, hgt, s, (h >>> (k * 4)) & 7);
        if (lit) paintCandleFlame(ctx, cx2, topY, s, t, h * 0.29 + k * 2.1, 1.15 + c.w * 2);
        else paintDeadWick(ctx, cx2, topY, s, 1.2);
      }
    },
  };
}

function paintCandleCluster(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tile, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.16;
  const lit = tile === Tile.CandleCluster;
  // THE KEPT FLAME, congregation form: floor candles grown into
  // their own spilt wax — two ranks, hex-set like the woodpile's
  // courses, heights dealt so no two candles agree on how long
  // they have been burning. One stub stands DROWNED in every
  // cluster (its wick died in its own pool — the prop tells
  // time), and the ground pool is the story: nobody set these
  // down tonight; this corner has been kept for years.
  // THE BOLD WICK verdict: PILLAR-CLASS columns only — the
  // first cut's tapers read as needles at map scale; wax at
  // this camera is THICK or it is invisible.
  const cands = [
    { x: -0.17, y: -0.13, w: 0.115, ht: 0.3, dead: false },
    { x: 0.03, y: -0.15, w: 0.13, ht: 0.44, dead: false },
    { x: 0.21, y: -0.12, w: 0.1, ht: 0.2, dead: false },
    { x: -0.21, y: 0.01, w: 0.12, ht: 0.16, dead: false },
    { x: -0.01, y: 0.02, w: 0.105, ht: 0.09, dead: true },
    { x: 0.17, y: 0.015, w: 0.125, ht: 0.26, dead: false },
  ];
  return {
    sortY: ty + 0.55,
    body: stationBody(0.48, 0.85, 0.4),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.38, s * 0.06),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.015, s * 0.42, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // (No painted floor lap: the prop's breathing bloom on
      // the glow overlay warms the boards without ever meeting
      // the outline pass.)
      // The spilt ground pool: years of wax in three cooled
      // tones, spatter beads at the rim.
      ctx.fillStyle = WAX_RIM;
      ctx.beginPath();
      facetBlob(ctx, p.x, baseY - s * 0.02, s * 0.3, h ^ 0x2a, 7, 0.4);
      ctx.fill();
      ctx.fillStyle = WAX_POOL;
      ctx.beginPath();
      facetBlob(ctx, p.x - s * 0.03, baseY - s * 0.045, s * 0.24, h ^ 0x51, 6, 0.42);
      ctx.fill();
      // (No spatter beads: the simplicity law — the pool's two
      // facet tones carry the melt story alone.)
      // Back rank first, then the front — every candle on its
      // own melt ring, every flame on the ONE fire.
      for (let k = 0; k < cands.length; k++) {
        const c = cands[k]!;
        const cx2 = p.x + c.x * s;
        const cy2 = baseY + c.y * s;
        const hgt = s * c.ht * (0.86 + (((h >>> (k * 4 + 1)) & 7) / 7) * 0.28);
        const w = s * c.w;
        ctx.fillStyle = WAX_POOL;
        ctx.beginPath();
        ctx.ellipse(cx2, cy2, w * 0.9, w * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
        const topY = paintCandleStick(ctx, cx2, cy2, w, hgt, s, (h >>> (k * 3)) & 7);
        if (lit && !c.dead) {
          paintCandleFlame(ctx, cx2, topY, s, t, h * 0.13 + k * 1.9, 0.9 + c.w * 4);
        } else {
          paintDeadWick(ctx, cx2, topY, s, 1.1);
        }
      }
    },
  };
}

function paintMeltedCandles(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tile, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.16;
  const lit = tile === Tile.MeltedCandles;
  // THE KEPT FLAME, generations form — RECUT SIMPLE (user
  // verdict: the runnel strings read as spider web; this
  // universe is low-poly with its intricacy in the SHADING,
  // never in threads). One faceted wax base, west-lit like
  // every mass in the world, and three bold cylinders of
  // stepped burn heights standing in it. The melt story is
  // told by the base and the heights alone.
  const surv = [
    { x: -0.12, ht: 0.19, w: 0.115 },
    { x: 0.02, ht: 0.32, w: 0.13 },
    { x: 0.15, ht: 0.13, w: 0.105 },
  ];
  return {
    sortY: ty + 0.5,
    body: stationBody(0.42, 0.75, 0.38),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.32, s * 0.055),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.012, s * 0.32, s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      // The base: one cooled facet mass, shaded rim under a
      // lit crown face — two tones, no threads. (The warmth on
      // the ground is the glow overlay's job.)
      ctx.fillStyle = WAX_RIM;
      ctx.beginPath();
      facetBlob(ctx, p.x, baseY - s * 0.045, s * 0.26, h ^ 0x13, 6, 0.34);
      ctx.fill();
      ctx.fillStyle = WAX_POOL;
      ctx.beginPath();
      facetBlob(ctx, p.x - s * 0.025, baseY - s * 0.075, s * 0.2, h ^ 0x6d, 6, 0.32);
      ctx.fill();
      // The three, stepped and CYLINDRICAL, each seated in a
      // simple foot ring.
      for (let k = 0; k < surv.length; k++) {
        const c = surv[k]!;
        const cx2 = p.x + c.x * s;
        const cy2 = baseY - s * 0.08 - k * s * 0.012;
        const hgt = s * c.ht * (0.9 + (((h >>> (k * 3 + 2)) & 3) / 3) * 0.16);
        ctx.fillStyle = WAX_POOL;
        ctx.beginPath();
        ctx.ellipse(cx2, cy2, s * c.w * 0.72, s * c.w * 0.26, 0, 0, Math.PI * 2);
        ctx.fill();
        const topY = paintCandleStick(ctx, cx2, cy2, s * c.w, hgt, s, (h >>> (k * 4 + 2)) & 7);
        if (lit) paintCandleFlame(ctx, cx2, topY, s, t, h * 0.17 + k * 2.3, 1.0 + c.w * 3);
        else paintDeadWick(ctx, cx2, topY, s, 1.1);
      }
    },
  };
}

function paintCandleTable(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tile, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  const lit = tile === Tile.CandleTable;
  // THE KEPT FLAME, bedside form: a small occasional table in
  // the dining board's own joinery (top a deeper honey than any
  // floor, trestle-tapered legs) bearing the house's evening —
  // a brass chamberstick with its drip collar already over the
  // saucer's edge, and the bare stub beside it standing in the
  // puddle of the night it finished. The pair burns together
  // and dies together: one hand tends this table.
  const th = s * 0.5;
  const topY = baseY - th;
  const deep = syT * 0.3;
  return {
    sortY: ty + 0.62,
    body: stationBody(0.5, 1.05, 0.4),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.32, s * 0.055),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.012, s * 0.34, s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      // Legs: the dining board's taper at side-table scale.
      ctx.fillStyle = '#6f4d26';
      for (const e of [-1, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(p.x + e * s * 0.21 - s * 0.03, topY + s * 0.05);
        ctx.lineTo(p.x + e * s * 0.21 + s * 0.03, topY + s * 0.05);
        ctx.lineTo(p.x + e * s * 0.21 + s * 0.022, baseY - s * 0.05);
        ctx.lineTo(p.x + e * s * 0.21 + s * 0.042, baseY);
        ctx.lineTo(p.x + e * s * 0.21 - s * 0.042, baseY);
        ctx.lineTo(p.x + e * s * 0.21 - s * 0.022, baseY - s * 0.05);
        ctx.closePath();
        ctx.fill();
      }
      // The apron and the top: front edge, then the plane the
      // camera sees (the crate-lid law at furniture scale).
      ctx.fillStyle = '#6f4d26';
      ctx.fillRect(p.x - s * 0.26, topY, s * 0.52, s * 0.05);
      ctx.fillStyle = '#9c7040';
      ctx.fillRect(p.x - s * 0.28, topY - deep, s * 0.56, deep);
      ctx.fillStyle = shade('#9c7040', 14);
      ctx.fillRect(p.x - s * 0.28, topY - deep, s * 0.56, Math.max(1, s * 0.016));
      ctx.fillStyle = 'rgba(30, 20, 10, 0.25)';
      ctx.fillRect(p.x - s * 0.28, topY - s * 0.012, s * 0.56, Math.max(1, s * 0.012));
      const shelfY = topY - deep * 0.45;
      // The chamberstick: saucer, ring handle, socket — brass
      // that has caught wax for years and kept every drop.
      // THE BOLD WICK: a fat squat pillar in the socket, never
      // a taper — table wax reads at scale or not at all.
      const bx = p.x - s * 0.09;
      ctx.fillStyle = '#8a6f2e';
      ctx.beginPath();
      ctx.ellipse(bx, shelfY, s * 0.125, s * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c2a45c';
      ctx.beginPath();
      ctx.ellipse(bx, shelfY - s * 0.009, s * 0.108, s * 0.036, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a6f2e';
      ctx.lineWidth = Math.max(1, s * 0.018);
      ctx.beginPath();
      ctx.arc(bx + s * 0.138, shelfY - s * 0.01, s * 0.03, -0.6, Math.PI * 0.9);
      ctx.stroke();
      // The candle in its socket, drip collar over the saucer.
      const cw = s * 0.115;
      const chgt = s * 0.24 * (0.85 + ((h >>> 3) & 3) * 0.1);
      const cTop = paintCandleStick(ctx, bx, shelfY - s * 0.014, cw, chgt, s, (h >>> 2) & 7);
      ctx.fillStyle = WAX_LIT;
      ctx.beginPath();
      ctx.ellipse(bx - s * 0.05, shelfY + s * 0.016, s * 0.034, s * 0.02, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // The bare stub in the puddle of its own last night.
      const sx2 = p.x + s * 0.15;
      ctx.fillStyle = WAX_POOL;
      ctx.beginPath();
      facetBlob(ctx, sx2, shelfY + s * 0.008, s * 0.07, h ^ 0x77, 5, 0.4);
      ctx.fill();
      const sTop = paintCandleStick(ctx, sx2, shelfY + s * 0.004, s * 0.095, s * 0.1, s, (h >>> 5) & 7);
      if (lit) {
        paintCandleFlame(ctx, bx, cTop, s, t, h * 0.19, 1.3);
        paintCandleFlame(ctx, sx2, sTop, s, t, h * 0.19 + 2.6, 1.05);
      } else {
        paintDeadWick(ctx, bx, cTop, s, 1.2);
        paintDeadWick(ctx, sx2, sTop, s, 1);
      }
    },
  };
}

function paintCandleStand(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tile, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  const lit = tile === Tile.CandleStand;
  // The smith's floor candelabrum: one forged stem on three
  // scrolled feet, a drip pan that keeps every run it ever
  // lost, and a dealt crown of three or five arms — candles
  // at honest burn heights, flames LICKING on the slow
  // clock. The town's indoor evening, planted anywhere — and
  // since THE KEPT FLAME, a hand at the wicks flips the whole
  // crown between its two postures.
  const arms = 3 + ((h >>> 4) & 1) * 2;
  const panY = baseY - s * 0.78;
  const stemW = s * 0.028;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.42, 1.5, 0.3),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.26, s * 0.05),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // Three scrolled feet: two splayed to the camera, one
      // behind — forge work, not casting (PERIOD TRUTH).
      ctx.strokeStyle = TWN_IRON;
      ctx.lineWidth = Math.max(2, s * 0.034);
      for (const e of [-1, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(p.x, baseY - s * 0.16);
        ctx.quadraticCurveTo(p.x + e * s * 0.1, baseY - s * 0.03, p.x + e * s * 0.19, baseY - s * 0.015);
        ctx.stroke();
        // The scroll curl at each toe.
        ctx.lineWidth = Math.max(1, s * 0.018);
        ctx.beginPath();
        ctx.arc(p.x + e * s * 0.185, baseY - s * 0.04, s * 0.026, e > 0 ? -0.4 : Math.PI - 1.2, e > 0 ? Math.PI * 1.1 : Math.PI * 2.2);
        ctx.stroke();
        ctx.lineWidth = Math.max(2, s * 0.034);
      }
      ctx.beginPath();
      ctx.moveTo(p.x, baseY - s * 0.16);
      ctx.lineTo(p.x, baseY - s * 0.075);
      ctx.stroke();
      // The stem: one drawn bar, a swaged knop mid-height,
      // a cold-bright arris up the lit side.
      ctx.fillStyle = TWN_IRON;
      ctx.fillRect(p.x - stemW, panY, stemW * 2, baseY - s * 0.14 - panY);
      ctx.fillStyle = 'rgba(210, 218, 226, 0.3)';
      ctx.fillRect(p.x - stemW, panY, stemW * 0.8, baseY - s * 0.14 - panY);
      const knopY = baseY - s * 0.52;
      ctx.fillStyle = TWN_IRON;
      ctx.beginPath();
      ctx.ellipse(p.x, knopY, s * 0.052, s * 0.038, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(210, 218, 226, 0.35)';
      ctx.beginPath();
      ctx.ellipse(p.x - s * 0.014, knopY - s * 0.008, s * 0.02, s * 0.014, -0.5, 0, Math.PI * 2);
      ctx.fill();
      // The drip pan: a shallow forged dish the camera sees
      // into, its rim bright, old wax pooled at the dealt low
      // side — the pan never lies about the draft.
      ctx.fillStyle = TWN_IRON;
      ctx.beginPath();
      ctx.ellipse(p.x, panY, s * 0.16, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a3842';
      ctx.beginPath();
      ctx.ellipse(p.x, panY - s * 0.008, s * 0.135, s * 0.038, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(210, 218, 226, 0.4)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.ellipse(p.x, panY, s * 0.16, s * 0.05, 0, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      const wm = ((h >>> 6) & 1) ? 1 : -1;
      ctx.fillStyle = TRD_WAX;
      ctx.beginPath();
      ctx.ellipse(p.x + wm * s * 0.07, panY - s * 0.004, s * 0.045, s * 0.017, 0, 0, Math.PI * 2);
      ctx.fill();
      // One long cold run down the stem from the pan lip.
      ctx.strokeStyle = TRD_WAX;
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(p.x + wm * s * 0.045, panY + s * 0.02);
      ctx.quadraticCurveTo(p.x + wm * s * 0.052, panY + s * 0.1, p.x + wm * s * 0.04, panY + s * 0.16);
      ctx.stroke();
      ctx.fillStyle = TRD_WAX_LIT;
      ctx.beginPath();
      ctx.ellipse(p.x + wm * s * 0.04, panY + s * 0.165, s * 0.012, s * 0.016, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE CROWN: dealt arms fan from the pan boss — each a
      // forged S carrying its own small cup, candle, and
      // flame. Burn heights deal per socket: the stand is
      // MID-EVENING, no two candles agree.
      for (let k = 0; k < arms; k++) {
        const fx2 = (k / (arms - 1) - 0.5) * 2;
        const ax = p.x + fx2 * s * (arms === 5 ? 0.26 : 0.2);
        const reach = 1 - Math.abs(fx2) * 0.22;
        const sockY = panY - s * (0.16 + reach * 0.1);
        if (Math.abs(fx2) > 0.01) {
          ctx.strokeStyle = TWN_IRON;
          ctx.lineWidth = Math.max(1, s * 0.02);
          ctx.beginPath();
          ctx.moveTo(p.x, panY - s * 0.06);
          ctx.quadraticCurveTo(p.x + fx2 * s * 0.1, panY - s * 0.18, ax, sockY + s * 0.05);
          ctx.stroke();
        }
        // The socket cup, widened for THE BOLD WICK's columns.
        ctx.fillStyle = TWN_IRON;
        ctx.beginPath();
        ctx.moveTo(ax - s * 0.036, sockY + s * 0.012);
        ctx.lineTo(ax - s * 0.028, sockY + s * 0.05);
        ctx.lineTo(ax + s * 0.028, sockY + s * 0.05);
        ctx.lineTo(ax + s * 0.036, sockY + s * 0.012);
        ctx.closePath();
        ctx.fill();
        // The candle: dealt burn height, PILLAR-FAT (THE BOLD
        // WICK verdict — the first cut's tapers read as
        // needles), one shade edge so it turns.
        const sd = (h >>> (k * 5 + 3)) ^ (k * 17);
        const cl = s * (0.14 + ((sd >>> 1) & 3) * 0.045);
        const cx2 = ax;
        const candTop = sockY + s * 0.012 - cl;
        ctx.fillStyle = TRD_WAX;
        ctx.fillRect(cx2 - s * 0.041, candTop, s * 0.082, cl);
        ctx.fillStyle = TRD_WAX_LIT;
        ctx.fillRect(cx2 - s * 0.041, candTop, s * 0.03, cl);
        ctx.fillStyle = shade(TRD_WAX, -20);
        ctx.fillRect(cx2 + s * 0.028, candTop + s * 0.008, s * 0.013, cl - s * 0.012);
        if (((sd >>> 3) & 3) === 0 && cl > s * 0.18) {
          ctx.strokeStyle = TRD_WAX_LIT;
          ctx.lineWidth = Math.max(1, s * 0.018);
          ctx.beginPath();
          ctx.moveTo(cx2 - s * 0.032, candTop + s * 0.02);
          ctx.quadraticCurveTo(cx2 - s * 0.042, candTop + cl * 0.5, cx2 - s * 0.032, candTop + cl * 0.82);
          ctx.stroke();
        }
        // THE FLAME: since THE KEPT FLAME, every socket burns
        // the family's ONE fire (calm layered sway under 2Hz,
        // breathing halo) — or wears the honest dead curl.
        // PAINT either way, never a light entry.
        if (lit) {
          paintCandleFlame(ctx, cx2, candTop, s, t, h * 0.11 + k * 2.4, 1.15);
        } else {
          paintDeadWick(ctx, cx2, candTop, s, 1.05);
        }
      }
    },
  };
}

export const TOWN_PROPS: PropEntries = [
  [[Tile.TownFountain], paintTownFountain],
  [[Tile.FounderStatue], paintFounderStatue],
  [[Tile.NoticeBoard], paintNoticeBoard],
  [[Tile.TownBell], paintTownBell],
  [[Tile.HandCart], paintHandCart],
  [[Tile.GrainSacks], paintGrainSacks],
  [[Tile.BarrelStack], paintBarrelStack],
  [[Tile.CrateStack], paintCrateStack],
  [[Tile.HitchingPost], paintHitchingPost],
  [[Tile.Woodpile], paintWoodpile],
  [[Tile.FelledLog, Tile.LogPile], paintFelledLog],
  [[Tile.LogPileEndOn], paintLogPileEndOn],
  [[Tile.StreetPlanter], paintStreetPlanter],
  [[Tile.StoneBench], paintStoneBench],
  [[Tile.QuenchTrough], paintQuenchTrough],
  [[Tile.Grindstone], paintGrindstone],
  [[Tile.IngotRack], paintIngotRack],
  [[Tile.LumberRack], paintLumberRack],
  [[Tile.DyeVats], paintDyeVats],
  [[Tile.TailorsDummy], paintTailorsDummy],
  [[Tile.ClothBolts], paintClothBolts],
  [[Tile.ButcherBlock], paintButcherBlock],
  [[Tile.HerbRack], paintHerbRack],
  [[Tile.ShopShelf], paintShopShelf],
  [[Tile.WallFountain], paintWallFountain],
  [[Tile.WaterTrough], paintWaterTrough],
  [[Tile.ScribesDesk], paintScribesDesk],
  [[Tile.CandleRack], paintCandleRack],
  [[Tile.FletchersBench], paintFletchersBench],
  [[Tile.FishmongerSlab], paintFishmongerSlab],
  [[Tile.TiedParcels], paintTiedParcels],
  [[Tile.DisplayTable], paintDisplayTable],
  [[Tile.PillarCandle, Tile.PillarCandleOut], paintPillarCandle],
  [[Tile.TripleCandles, Tile.TripleCandlesOut], paintTripleCandles],
  [[Tile.CandleCluster, Tile.CandleClusterOut], paintCandleCluster],
  [[Tile.MeltedCandles, Tile.MeltedCandlesOut], paintMeltedCandles],
  [[Tile.CandleTable, Tile.CandleTableOut], paintCandleTable],
  [[Tile.CandleStand, Tile.CandleStandOut], paintCandleStand],
];
