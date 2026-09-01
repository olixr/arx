/**
 * THE TENDED EARTH — crops, alembics, tanning racks, beast pens: farm and craft.
 * Extracted verbatim from renderer.ts's objectItem (THE PROP HALL,
 * foundations F1) — each painter is one former switch case; the frame
 * and host contracts live in ./types.ts.
 */
import { farmBins, farmJobs, farmTroughs } from '../../game/farmCare.js';
import { packTile } from '../interiors.js';
import { HRB_MOON, HRB_MOON_DEEP, HRB_SAGE, HRB_SAGE_DEEP, STRUCT_OUTLINE, TRD_HERB, TRD_HERB_DRY, TWN_ROPE, twinkle } from '../paintVocab.js';
import { shade } from '../rig.js';
import { chamferRect, facetCircle } from '../shapes.js';
import { COMPOST_BATCH_WORTH } from '@arx/content';
import { Tile, hashCoords } from '@arx/shared';
import type { DrawItem } from '../renderer.js';
import type { PropEntries, PropFrame, PropHost } from './types.js';



// THE FULL FIELD (Phase 2): the crop wave rides the same cached
// flora path — staples and herbs walk-through, orchard trees and
// the log beds stand solid (TILE_DEFS carries the collision).
function paintCropSprout(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, t, tile, tx, ty } = env;
  // Farm crops: walk-through rows, y-sorted so you wade behind
  // the tall ripe ones. Same cached-sprite path as wild flora —
  // outline ring baked in, real silhouette shadows (sprouts are
  // too low to bother casting one).
  const syT = s * rend.camera.yScale;
  if (tile === Tile.GrowingFrame) {
    // The bare frame: hoops and rolled cloth waiting on a
    // planting (a planted frame draws its hoops over the crop
    // in drawFlora, off the care mirror's framed fact).
    return {
      sortY: ty + 0.7,
      drawShadow: undefined,
      draw: () => rend.drawGrowingFrame(p.x, p.y + syT * 0.3, h, false),
    };
  }
  return {
    sortY: ty + 0.75,
    drawShadow:
      tile === Tile.CropSprout
        ? undefined
        : () => rend.castFloraShadow(p.x, p.y + syT * 0.3, tile, h),
    draw: () => rend.drawFlora(p.x, p.y, tx, ty, tile, h, t),
  };
}

function paintBerryBush(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, t, tile, tx, ty } = env;
  // Wild forage nodes are landmarks now (render/flora.ts) —
  // grown from the tile hash like trees, swaying on the one
  // shared wind field, twinkling their payload at idle.
  const syT = s * rend.camera.yScale;
  return {
    sortY: ty + 0.78,
    // Ring baked into the cached sprite (drawFlora) — no body.
    drawShadow: () => rend.castFloraShadow(p.x, p.y + syT * 0.3, tile, h),
    draw: () => rend.drawFlora(p.x, p.y, tx, ty, tile, h, t),
  };
}

function paintAlembic(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  // The herbalist's bench on the table grammar: a full
  // plan-space top the tilted camera looks down onto, every
  // glass standing ON the plane with its own footprint.
  const th = s * 0.56;
  const xL = p.x - s * 0.48;
  const xR = p.x + s * 0.48;
  const yT = p.y - syT * 0.34;
  const yB = p.y + syT * 0.42;
  const topC = '#8f6a3c';
  const legC = '#5b4028';
  return {
    sortY: ty + 0.85,
    body: stationBody(1.0, 1.6, 0.7),
    drawShadow: () => {
      rend.castEdgeQuad(xL, yB + syT * 0.06, xR, yB + syT * 0.06, 0.75);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      const act = rend.stationHeat.get(packTile(tx, ty)) ?? 0;
      // Trestle legs with splayed feet, then the apron.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.fillRect(xL + s * 0.02, yB + s * 0.005, xR - xL - s * 0.04, s * 0.04);
      const leg = (lx: number, ly: number, hgt: number) => {
        ctx.fillStyle = legC;
        ctx.beginPath();
        ctx.moveTo(lx - s * 0.04, ly - hgt);
        ctx.lineTo(lx + s * 0.04, ly - hgt);
        ctx.lineTo(lx + s * 0.03, ly - s * 0.06);
        ctx.lineTo(lx + s * 0.054, ly);
        ctx.lineTo(lx - s * 0.054, ly);
        ctx.lineTo(lx - s * 0.03, ly - s * 0.06);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(legC, -14);
        ctx.fillRect(lx - s * 0.054, ly - s * 0.02, s * 0.108, s * 0.02);
      };
      leg(xL + s * 0.08, yB, th + syT * 0.05);
      leg(xR - s * 0.08, yB, th + syT * 0.05);
      leg(xL + s * 0.08, yT + syT * 0.18, (th + syT * 0.05) * 0.92);
      leg(xR - s * 0.08, yT + syT * 0.18, (th + syT * 0.05) * 0.92);
      ctx.fillStyle = shade(legC, -4);
      ctx.fillRect(xL + s * 0.02, yB - th, xR - xL - s * 0.04, s * 0.085);
      // The top: one stained slab in plan, rimmed dark so the
      // bench never melts into floorboards.
      ctx.fillStyle = topC;
      ctx.beginPath();
      chamferRect(ctx, xL, yT - th, xR - xL, yB - yT, s * 0.05);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1.2, s * 0.028);
      ctx.stroke();
      ctx.fillStyle = shade(topC, 14);
      ctx.fillRect(xL + s * 0.01, yB - th - s * 0.042, xR - xL - s * 0.02, s * 0.042);
      ctx.fillStyle = shade(topC, -8);
      ctx.fillRect(xL + s * 0.01, yT - th, xR - xL - s * 0.02, s * 0.028);
      // Old stain rings and spill marks — years of tinctures.
      ctx.strokeStyle = 'rgba(46, 84, 74, 0.3)';
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.beginPath();
      ctx.arc(p.x + s * 0.12, yT - th + (yB - yT) * 0.62, s * 0.07, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(74, 46, 84, 0.2)';
      ctx.beginPath();
      facetCircle(ctx, xL + s * 0.18, yT - th + (yB - yT) * 0.3, s * 0.05, 6, 0.7, 0.6);
      ctx.fill();
      // The back riser: a narrow raised shelf along the far
      // edge keeping the stock bottles up out of the work.
      const rsY = yT - th;
      const rsH = s * 0.3;
      ctx.fillStyle = shade(legC, 4);
      ctx.fillRect(xL + s * 0.04, rsY - rsH, xR - xL - s * 0.08, rsH * 0.55);
      ctx.fillStyle = shade(topC, 18);
      ctx.beginPath();
      chamferRect(ctx, xL + s * 0.03, rsY - rsH - syT * 0.1, xR - xL - s * 0.06, syT * 0.1 + s * 0.02, s * 0.02);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.3)';
      ctx.lineWidth = Math.max(1, s * 0.022);
      ctx.stroke();
      // Stock bottles standing on the riser, house colors.
      for (const [bx2, bc, bh3] of [
        [-0.3, '#c9a8e8', 0.2],
        [-0.14, '#7fc9b3', 0.16],
        [0.06, '#d65a5a', 0.22],
        [0.24, '#8fd0e8', 0.17],
      ] as const) {
        const vx = p.x + bx2 * s;
        const vy = rsY - rsH * 0.55;
        ctx.fillStyle = 'rgba(214, 228, 240, 0.55)';
        ctx.fillRect(vx - s * 0.038, vy - s * bh3, s * 0.076, s * bh3);
        ctx.fillStyle = bc;
        ctx.fillRect(vx - s * 0.028, vy - s * bh3 * 0.62, s * 0.056, s * bh3 * 0.62 - s * 0.012);
        ctx.fillStyle = '#8a6534';
        ctx.fillRect(vx - s * 0.014, vy - s * bh3 - s * 0.03, s * 0.028, s * 0.03);
      }
      // The burner stands ON the plan: an iron tripod ring with
      // a flame always working softly, roaring while a brew is on.
      const flick = (0.85 + Math.sin(t * 11 + h) * 0.12) * (1 + act * 0.35);
      const bnx = p.x - s * 0.2;
      const bny = yT - th + (yB - yT) * 0.58;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
      ctx.beginPath();
      ctx.ellipse(bnx, bny + s * 0.01, s * 0.1, s * 0.035, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4f4a5c';
      ctx.fillRect(bnx - s * 0.075, bny - s * 0.02, s * 0.03, s * 0.05);
      ctx.fillRect(bnx + s * 0.045, bny - s * 0.02, s * 0.03, s * 0.05);
      ctx.fillStyle = '#8a8494';
      ctx.beginPath();
      facetCircle(ctx, bnx, bny - s * 0.03, s * 0.085, 6, 0.3, 0.5);
      ctx.fill();
      ctx.fillStyle = `rgba(232, 130, 61, ${0.8 * flick})`;
      ctx.beginPath();
      ctx.moveTo(bnx - s * 0.05, bny - s * 0.05);
      ctx.quadraticCurveTo(bnx, bny - s * (0.16 + 0.1 * flick), bnx + s * 0.05, bny - s * 0.05);
      ctx.closePath();
      ctx.fill();
      // The retort rides the burner: a round-bellied flask of
      // teal brew on iron legs, neck climbing to the condenser.
      const rx = bnx;
      const ry = bny - s * 0.28;
      ctx.fillStyle = 'rgba(214, 228, 240, 0.55)';
      ctx.beginPath();
      facetCircle(ctx, rx, ry, s * 0.15, 8, 0.3, 0.85);
      ctx.fill();
      ctx.fillStyle = '#7fc9b3';
      ctx.beginPath();
      ctx.moveTo(rx - s * 0.12, ry + s * 0.02);
      ctx.lineTo(rx + s * 0.12, ry + s * 0.02);
      ctx.lineTo(rx + s * 0.095, ry + s * 0.12);
      ctx.lineTo(rx - s * 0.095, ry + s * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(rx - s * 0.09, ry - s * 0.1, s * 0.03, s * 0.09);
      // Neck and coiled copper condenser arcing east to the
      // receiving vial standing on its own plan spot.
      ctx.fillStyle = 'rgba(214, 228, 240, 0.55)';
      ctx.fillRect(rx - s * 0.03, ry - s * 0.28, s * 0.06, s * 0.15);
      const cvx = p.x + s * 0.31;
      const cvy = yT - th + (yB - yT) * 0.52;
      ctx.strokeStyle = '#b87333';
      ctx.lineWidth = Math.max(1.5, s * 0.045);
      ctx.beginPath();
      ctx.moveTo(rx, ry - s * 0.27);
      ctx.quadraticCurveTo(p.x + s * 0.1, ry - s * 0.44, cvx - s * 0.02, ry - s * 0.2);
      ctx.quadraticCurveTo(cvx + s * 0.05, ry - s * 0.04, cvx, cvy - s * 0.22);
      ctx.stroke();
      // Coil rings on the downpipe.
      ctx.lineWidth = Math.max(1, s * 0.028);
      for (let i = 0; i < 3; i++) {
        const cy2 = ry - s * 0.14 + i * s * 0.1;
        ctx.beginPath();
        ctx.arc(cvx + s * 0.005, cy2, s * 0.048, -0.6, Math.PI + 0.6);
        ctx.stroke();
      }
      // The receiving vial under the condenser's spout.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
      ctx.beginPath();
      ctx.ellipse(cvx, cvy + s * 0.01, s * 0.06, s * 0.025, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(214, 228, 240, 0.5)';
      ctx.fillRect(cvx - s * 0.045, cvy - s * 0.14, s * 0.09, s * 0.14);
      ctx.fillStyle = '#7fc9b3';
      ctx.fillRect(cvx - s * 0.033, cvy - s * 0.075, s * 0.066, s * 0.065);
      // Mortar and pestle mid-bench — the hand work.
      const mx = p.x + s * 0.06;
      const my = yT - th + (yB - yT) * 0.78;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
      ctx.beginPath();
      ctx.ellipse(mx, my + s * 0.012, s * 0.085, s * 0.03, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6e6879';
      ctx.beginPath();
      facetCircle(ctx, mx, my - s * 0.045, s * 0.085, 7, 0.2, 0.6);
      ctx.fill();
      ctx.fillStyle = '#544d64';
      ctx.beginPath();
      facetCircle(ctx, mx, my - s * 0.05, s * 0.058, 7, 0.2, 0.6);
      ctx.fill();
      ctx.fillStyle = '#8a6534';
      ctx.save();
      ctx.translate(mx + s * 0.05, my - s * 0.09);
      ctx.rotate(0.6);
      ctx.fillRect(-s * 0.018, -s * 0.09, s * 0.036, s * 0.11);
      ctx.restore();
      // A tied bundle of cut sagewort lying flat at the west
      // end — dried grey-green stems, twine round the waist.
      const hbx = xL + s * 0.15;
      const hby = yT - th + (yB - yT) * 0.74;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(hbx + s * 0.02, hby + s * 0.02, s * 0.11, s * 0.028, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7a8a5c';
      ctx.lineWidth = Math.max(1.4, s * 0.034);
      for (const dy2 of [-0.026, 0, 0.026] as const) {
        ctx.beginPath();
        ctx.moveTo(hbx - s * 0.1, hby + dy2 * s * 1.3 + s * 0.01);
        ctx.lineTo(hbx + s * 0.1, hby + dy2 * s * 1.3 - s * 0.012);
        ctx.stroke();
      }
      ctx.fillStyle = '#9aab6e';
      for (const [lx2, ly2] of [
        [0.1, -0.045],
        [0.12, 0.005],
        [0.09, 0.04],
      ] as const) {
        ctx.beginPath();
        facetCircle(ctx, hbx + lx2 * s, hby + ly2 * s, s * 0.028, 5, lx2 * 9, 0.7);
        ctx.fill();
      }
      ctx.fillStyle = '#8a7248';
      ctx.fillRect(hbx - s * 0.045, hby - s * 0.035, s * 0.035, s * 0.07);
      // Bubbles climbing out of the retort's brew — a rolling
      // boil of them while the bench is working.
      for (let i = 0; i < (act > 0.05 ? 3 : 1); i++) {
        const bt = (t * (0.7 + i * 0.23) + h * 0.13 + i * 0.4) % 1;
        ctx.fillStyle = `rgba(230, 244, 240, ${0.6 * (1 - bt)})`;
        ctx.beginPath();
        ctx.arc(
          rx + Math.sin(t * 2 + h + i * 2.4) * s * 0.03 + (i - 1) * s * 0.02,
          ry - s * 0.02 - bt * s * 0.1,
          s * 0.022,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      // Distillate drips off the condenser into the vial, and a
      // curl of vapor stands off the retort neck while it works.
      if (act > 0.05) {
        const dp = (t * 1.15 + h * 0.19) % 1;
        ctx.fillStyle = `rgba(127, 201, 179, ${0.85 * act})`;
        ctx.fillRect(cvx - s * 0.011, cvy - s * 0.21 + dp * s * 0.1, s * 0.022, s * 0.035);
        const vp = (t * 0.5 + h * 0.23) % 1;
        ctx.fillStyle = `rgba(214, 236, 230, ${(1 - vp) * 0.3 * act})`;
        ctx.beginPath();
        facetCircle(ctx, rx + Math.sin(t * 1.3 + h) * s * 0.04, ry - s * 0.34 - vp * s * 0.22, s * (0.035 + vp * 0.05), 6, vp * 2, 0.8);
        ctx.fill();
      }
    },
  };
}

function paintTanningRack(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.34;
  // The leatherworker's frame rebuilt with true depth: two
  // A-frame ends whose legs splay north AND south in plan, a
  // round crossbar bridging them, and the hide slung over it.
  // Taller than the body — a hide is a big thing.
  const topY = baseY - s * 1.42;
  const rearY = baseY - syT * 0.44;
  const wood = '#5b4028';
  return {
    sortY: ty + 0.85,
    body: stationBody(0.95, 1.85, 0.7),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - s * 0.46, baseY, p.x + s * 0.46, baseY, 1.35);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      const act = rend.stationHeat.get(packTile(tx, ty)) ?? 0;
      // Contact shade under all four feet.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
      ctx.fillRect(p.x - s * 0.5, baseY - s * 0.015, s, s * 0.045);
      // Each end is an A: the rear leg runs up-and-north (thin,
      // shaded — depth the camera reads), the front leg stout
      // and lit. Feet tucked so the hide FILLS the frame.
      const crotchY = topY + s * 0.06;
      for (const sd of [-1, 1] as const) {
        const ax = p.x + sd * s * 0.46;
        // Rear leg first, falling to the rear ground line.
        ctx.strokeStyle = shade(wood, -16);
        ctx.lineWidth = Math.max(1.6, s * 0.05);
        ctx.beginPath();
        ctx.moveTo(ax - sd * s * 0.06, rearY);
        ctx.lineTo(ax, crotchY);
        ctx.stroke();
        // Front leg, splayed just a hair south, catching sun.
        ctx.strokeStyle = wood;
        ctx.lineWidth = Math.max(2.6, s * 0.09);
        ctx.beginPath();
        ctx.moveTo(ax + sd * s * 0.05, baseY);
        ctx.lineTo(ax, crotchY);
        ctx.stroke();
        ctx.strokeStyle = shade(wood, 12);
        ctx.lineWidth = Math.max(1, s * 0.03);
        ctx.beginPath();
        ctx.moveTo(ax + sd * s * 0.038 - s * 0.012, baseY - s * 0.06);
        ctx.lineTo(ax - s * 0.012, crotchY + s * 0.06);
        ctx.stroke();
        // Lashed crotch wrap where bar meets frame.
        ctx.fillStyle = '#8a7248';
        ctx.fillRect(ax - s * 0.05, crotchY - s * 0.05, s * 0.1, s * 0.085);
        ctx.fillStyle = shade('#8a7248', 14);
        ctx.fillRect(ax - s * 0.05, crotchY - s * 0.05, s * 0.1, s * 0.024);
      }
      // The crossbar: one round timber laid across both ends,
      // lit along its top, its turned ends showing past the
      // frames — the camera sees a real pole, not a line.
      ctx.fillStyle = wood;
      ctx.fillRect(p.x - s * 0.58, topY, s * 1.16, s * 0.09);
      ctx.fillStyle = shade(wood, 18);
      ctx.fillRect(p.x - s * 0.58, topY, s * 1.16, s * 0.032);
      for (const sd of [-1, 1] as const) {
        ctx.fillStyle = shade(wood, sd < 0 ? 22 : -8);
        ctx.beginPath();
        facetCircle(ctx, p.x + sd * s * 0.58, topY + s * 0.045, s * 0.05, 6, 0.3, 1);
        ctx.fill();
      }
      // The hide slung OVER the bar: a fold-over cuff on the
      // far side, then a BROAD taut sheet stretched wall-to-
      // wall inside the frame — the payload is the protagonist.
      // It breathes on the wind at rest and shivers with each
      // scraping pass while someone works it.
      const shiver = act > 0.05 ? Math.sin(t * 9 + h) * s * 0.016 * act : Math.sin(t * 1.4 + h) * s * 0.008;
      const hx = p.x;
      const hyT = topY + s * 0.09;
      const hw = s * 0.82;
      const hh = s * 0.86;
      // Fold-over cuff peeking above/behind the bar.
      ctx.fillStyle = shade('#b08a5c', -12);
      ctx.beginPath();
      chamferRect(ctx, hx - hw / 2 + s * 0.04 + shiver * 0.6, topY - s * 0.09, hw - s * 0.08, s * 0.09, [s * 0.04, s * 0.04, 0, 0]);
      ctx.fill();
      // The sheet: near-straight stretched sides (it is LASHED
      // taut) and a shallow, uneven lower hem — scalloped like
      // a trimmed hide, never notched deep enough to read as
      // anything but one broad skin.
      ctx.fillStyle = '#b8905f';
      ctx.beginPath();
      ctx.moveTo(hx - hw / 2 + shiver, hyT);
      ctx.lineTo(hx + hw / 2 + shiver, hyT);
      ctx.lineTo(hx + hw * 0.46 + shiver, hyT + hh * 0.84);
      ctx.lineTo(hx + hw * 0.32 + shiver, hyT + hh * 0.99);
      ctx.lineTo(hx + hw * 0.12 + shiver, hyT + hh * 0.92);
      ctx.lineTo(hx - hw * 0.08 + shiver, hyT + hh);
      ctx.lineTo(hx - hw * 0.3 + shiver, hyT + hh * 0.93);
      ctx.lineTo(hx - hw * 0.44 + shiver, hyT + hh * 0.86);
      ctx.lineTo(hx - hw / 2 + shiver, hyT + hh * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.32)';
      ctx.lineWidth = Math.max(1.2, s * 0.024);
      ctx.stroke();
      // Hard-shade half + a pale scraped patch growing off-centre.
      ctx.save();
      ctx.beginPath();
      ctx.rect(hx + shiver, hyT, hw, hh);
      ctx.clip();
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.fillRect(hx + shiver, hyT, hw / 2, hh);
      ctx.restore();
      ctx.fillStyle = '#d3b183';
      ctx.beginPath();
      facetCircle(ctx, hx - s * 0.1 + shiver, hyT + hh * 0.38, s * 0.19, 7, h * 0.7, 0.8);
      ctx.fill();
      // Belly speckles — the beast it came from.
      ctx.fillStyle = 'rgba(122, 88, 50, 0.4)';
      for (let i = 0; i < 4; i++) {
        const hh4 = hashCoords(97 + i, tx, ty);
        ctx.fillRect(
          hx - hw * 0.36 + ((hh4 % 60) / 60) * hw * 0.72 + shiver,
          hyT + hh * (0.52 + ((hh4 >> 6) % 28) / 100),
          s * 0.035,
          s * 0.03,
        );
      }
      // Lashing cords: bright twine, corner to frame, the
      // tension you can SEE. Small toggle knots at the hide.
      ctx.strokeStyle = '#d8c08a';
      ctx.lineWidth = Math.max(1.4, s * 0.032);
      for (const [cx2, cy2, fx2, fy2] of [
        [hx - hw * 0.46 + shiver, hyT + hh * 0.58, p.x - s * 0.44, topY + s * 0.66],
        [hx + hw * 0.46 + shiver, hyT + hh * 0.6, p.x + s * 0.44, topY + s * 0.68],
        [hx - hw * 0.34 + shiver, hyT + hh * 0.98, p.x - s * 0.48, baseY - s * 0.08],
        [hx + hw * 0.34 + shiver, hyT + hh * 0.96, p.x + s * 0.48, baseY - s * 0.08],
      ] as const) {
        ctx.beginPath();
        ctx.moveTo(cx2, cy2);
        ctx.lineTo(fx2, fy2);
        ctx.stroke();
        ctx.fillStyle = '#8a7248';
        ctx.fillRect(cx2 - s * 0.022, cy2 - s * 0.022, s * 0.044, s * 0.044);
      }
      // The day's finish: cured hides folded flat on a plank
      // pallet in plan at the west foot — work that's DONE.
      // Wide, layered, lit along each fold.
      const pxl = p.x - s * 0.42;
      const plY = baseY + syT * 0.06;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
      ctx.beginPath();
      ctx.ellipse(pxl, plY + s * 0.015, s * 0.24, s * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6f4d26';
      ctx.beginPath();
      chamferRect(ctx, pxl - s * 0.23, plY - s * 0.055, s * 0.46, s * 0.055, s * 0.018);
      ctx.fill();
      for (const [ly, lw2, tone] of [
        [0.1, 0.4, '#a5793f'],
        [0.145, 0.36, '#b08a5c'],
        [0.19, 0.38, '#d3b183'],
      ] as const) {
        ctx.fillStyle = tone;
        ctx.beginPath();
        chamferRect(ctx, pxl - s * lw2 / 2, plY - s * (ly + 0.045), s * lw2, s * 0.05, s * 0.018);
        ctx.fill();
        ctx.fillStyle = shade(tone, 14);
        ctx.fillRect(pxl - s * lw2 / 2 + s * 0.01, plY - s * (ly + 0.045), s * lw2 - s * 0.02, s * 0.015);
      }
      // Scudding knife leaning on the near east leg, blade up.
      ctx.save();
      ctx.translate(p.x + s * 0.4, baseY - s * 0.05);
      ctx.rotate(-0.5);
      ctx.fillStyle = '#8d9299';
      ctx.fillRect(-s * 0.022, -s * 0.3, s * 0.044, s * 0.22);
      ctx.fillStyle = '#5b4028';
      ctx.fillRect(-s * 0.028, -s * 0.08, s * 0.056, s * 0.09);
      ctx.restore();
      // Flecks fly off the scrape while the rack is worked.
      if (act > 0.05) {
        for (let i = 0; i < 2; i++) {
          const ft = (t * (1.3 + i * 0.4) + h * 0.31 + i * 0.5) % 1;
          ctx.fillStyle = `rgba(211, 177, 131, ${0.7 * (1 - ft) * act})`;
          ctx.fillRect(hx - s * 0.05 + ft * s * 0.16, hyT + hh * 0.45 + ft * s * 0.22, s * 0.03, s * 0.03);
        }
      }
    },
  };
}

function paintLoom(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.34;
  // The tailor's loom rebuilt as a machine with mass: capped
  // posts, a crowned head beam, two ranks of warp through a
  // heddle bar, and the cloth winding onto a turned breast
  // beam. Taller than the weaver who sits at it.
  const topY = baseY - s * 1.52;
  const wood = '#5b4028';
  const beamC = '#7a552e';
  return {
    sortY: ty + 0.85,
    body: stationBody(1.0, 1.95, 0.7),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - s * 0.5, baseY, p.x + s * 0.5, baseY, 1.45);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      const act = rend.stationHeat.get(packTile(tx, ty)) ?? 0;
      // Contact shade + floor frame: two side rails run north in
      // plan — the loom sits on a sled the camera can see.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
      ctx.fillRect(p.x - s * 0.52, baseY - s * 0.015, s * 1.04, s * 0.045);
      for (const sd of [-1, 1] as const) {
        ctx.fillStyle = shade(wood, sd < 0 ? 2 : -10);
        ctx.beginPath();
        ctx.moveTo(p.x + sd * s * 0.5, baseY);
        ctx.lineTo(p.x + sd * s * 0.4, baseY - syT * 0.5);
        ctx.lineTo(p.x + sd * s * 0.32, baseY - syT * 0.5);
        ctx.lineTo(p.x + sd * s * 0.42, baseY);
        ctx.closePath();
        ctx.fill();
      }
      // Treadle boards between the rails, worn bright mid-plank.
      ctx.fillStyle = shade(beamC, -6);
      ctx.beginPath();
      chamferRect(ctx, p.x - s * 0.2, baseY - syT * 0.34, s * 0.4, syT * 0.3, s * 0.02);
      ctx.fill();
      ctx.fillStyle = shade(beamC, 8);
      ctx.fillRect(p.x - s * 0.16, baseY - syT * 0.28, s * 0.32, s * 0.028);
      ctx.fillRect(p.x - s * 0.16, baseY - syT * 0.16, s * 0.32, s * 0.028);
      // Posts: lit west face, shaded east, small cap planes on
      // top — every upright shows its crown to this camera.
      for (const sd of [-1, 1] as const) {
        const px2 = p.x + sd * s * 0.44;
        ctx.fillStyle = wood;
        ctx.fillRect(px2 - s * 0.055, topY + s * 0.04, s * 0.11, baseY - topY - s * 0.04);
        ctx.fillStyle = shade(wood, sd < 0 ? 12 : -12);
        ctx.fillRect(px2 + (sd < 0 ? -s * 0.055 : s * 0.023), topY + s * 0.04, s * 0.032, baseY - topY - s * 0.04);
        ctx.fillStyle = shade(wood, -8);
        ctx.fillRect(px2 - s * 0.08, baseY - s * 0.06, s * 0.16, s * 0.06);
      }
      // The head beam: crowned with a foreshortened cap plane,
      // sunlit along its front arris, rimmed dark.
      const hbD = syT * 0.18;
      ctx.fillStyle = beamC;
      ctx.fillRect(p.x - s * 0.52, topY, s * 1.04, s * 0.12);
      ctx.fillStyle = shade(beamC, 16);
      ctx.beginPath();
      chamferRect(ctx, p.x - s * 0.52, topY - hbD, s * 1.04, hbD + s * 0.02, s * 0.03);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1.2, s * 0.024);
      ctx.stroke();
      ctx.fillStyle = shade(beamC, 4);
      ctx.fillRect(p.x - s * 0.48, topY - hbD + s * 0.014, s * 0.96, s * 0.024);
      ctx.fillStyle = shade(beamC, 26);
      ctx.fillRect(p.x - s * 0.52, topY + s * 0.09, s * 1.04, s * 0.03);
      // Warp: two ranks split by the heddles — odd threads pull
      // forward, even hang plumb. The shed a real loom keeps.
      const fellY = baseY - s * 0.46;
      const hedY = topY + s * 0.62;
      ctx.lineWidth = Math.max(1, s * 0.02);
      for (let i = 0; i < 11; i++) {
        const wx2 = p.x - s * 0.32 + (i / 10) * s * 0.64;
        const lift = i & 1 ? s * 0.03 : -s * 0.008;
        ctx.strokeStyle = i & 1 ? '#e8dfc8' : '#cdbf9f';
        ctx.beginPath();
        ctx.moveTo(wx2, topY + s * 0.1);
        ctx.lineTo(wx2 + lift, hedY);
        ctx.lineTo(wx2, fellY);
        ctx.stroke();
      }
      // The heddle bar riding mid-warp on cords from the beam.
      ctx.strokeStyle = '#8a7248';
      ctx.lineWidth = Math.max(1, s * 0.022);
      for (const cx2 of [-0.3, 0.3] as const) {
        ctx.beginPath();
        ctx.moveTo(p.x + cx2 * s, topY + s * 0.11);
        ctx.lineTo(p.x + cx2 * s, hedY - s * 0.02);
        ctx.stroke();
      }
      ctx.fillStyle = '#8a5a2e';
      ctx.fillRect(p.x - s * 0.36, hedY - s * 0.03, s * 0.72, s * 0.06);
      ctx.fillStyle = shade('#8a5a2e', 14);
      ctx.fillRect(p.x - s * 0.36, hedY - s * 0.03, s * 0.72, s * 0.02);
      // Woven cloth from the fell line down — house teal with
      // weft stripes — winding onto the turned breast beam.
      ctx.fillStyle = '#4e8a7a';
      ctx.beginPath();
      chamferRect(ctx, p.x - s * 0.32, fellY, s * 0.64, s * 0.26, s * 0.02);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(p.x - s * 0.32, fellY + s * 0.05 + i * s * 0.075, s * 0.64, s * 0.02);
      }
      // The breast beam: a rolled bolt of cloth — cylinder with
      // pale end discs and a lit crown line, fat with work done.
      const bbY = fellY + s * 0.26;
      ctx.fillStyle = '#3f7364';
      ctx.fillRect(p.x - s * 0.4, bbY, s * 0.8, s * 0.15);
      ctx.fillStyle = shade('#3f7364', 16);
      ctx.fillRect(p.x - s * 0.4, bbY, s * 0.8, s * 0.045);
      for (const sd of [-1, 1] as const) {
        ctx.fillStyle = '#d8cbb0';
        ctx.beginPath();
        facetCircle(ctx, p.x + sd * s * 0.4, bbY + s * 0.075, s * 0.075, 7, 0.2, 1);
        ctx.fill();
        ctx.fillStyle = 'rgba(78, 138, 122, 0.6)';
        ctx.beginPath();
        facetCircle(ctx, p.x + sd * s * 0.4, bbY + s * 0.075, s * 0.045, 7, 0.2, 1);
        ctx.fill();
      }
      // Ratchet wheel + pawl on the east beam end — the click
      // that holds the tension.
      ctx.fillStyle = '#767181';
      ctx.beginPath();
      facetCircle(ctx, p.x + s * 0.47, bbY + s * 0.075, s * 0.045, 6, t * (act > 0.05 ? 0.8 : 0), 1);
      ctx.fill();
      // The shuttle: glides across the fell while weaving, parked
      // against a post at rest. Its pace rides the work.
      const gt = act > 0.05 ? (Math.sin(t * (2.2 + act * 2)) + 1) / 2 : 0.04;
      const shx = p.x - s * 0.28 + gt * s * 0.56;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
      ctx.beginPath();
      ctx.ellipse(shx, fellY + s * 0.012, s * 0.12, s * 0.028, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a5a2e';
      ctx.beginPath();
      ctx.moveTo(shx - s * 0.1, fellY - s * 0.04);
      ctx.lineTo(shx + s * 0.1, fellY - s * 0.04);
      ctx.lineTo(shx + s * 0.145, fellY);
      ctx.lineTo(shx + s * 0.1, fellY + s * 0.04);
      ctx.lineTo(shx - s * 0.1, fellY + s * 0.04);
      ctx.lineTo(shx - s * 0.145, fellY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade('#8a5a2e', 14);
      ctx.fillRect(shx - s * 0.08, fellY - s * 0.04, s * 0.16, s * 0.016);
      ctx.fillStyle = '#c05a4a';
      ctx.fillRect(shx - s * 0.045, fellY - s * 0.014, s * 0.09, s * 0.028);
      // Weft thread trailing the shuttle while it works.
      if (act > 0.05) {
        ctx.strokeStyle = '#e8dfc8';
        ctx.lineWidth = Math.max(1, s * 0.02);
        ctx.beginPath();
        ctx.moveTo(p.x - s * 0.28, fellY);
        ctx.lineTo(shx, fellY);
        ctx.stroke();
      }
      // A basket of yarn cones stands by the west post — its
      // own footprint, its own contact shadow.
      const ykx = p.x - s * 0.56;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
      ctx.beginPath();
      ctx.ellipse(ykx, baseY - s * 0.005, s * 0.13, s * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a7248';
      ctx.beginPath();
      ctx.moveTo(ykx - s * 0.13, baseY - s * 0.22);
      ctx.lineTo(ykx + s * 0.13, baseY - s * 0.22);
      ctx.lineTo(ykx + s * 0.1, baseY);
      ctx.lineTo(ykx - s * 0.1, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(58, 40, 22, 0.35)';
      ctx.fillRect(ykx - s * 0.115, baseY - s * 0.15, s * 0.23, s * 0.02);
      ctx.fillRect(ykx - s * 0.105, baseY - s * 0.08, s * 0.21, s * 0.02);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = ['#c05a4a', '#4e8a7a', '#d8cbb0'][i]!;
        ctx.beginPath();
        facetCircle(ctx, ykx - s * 0.07 + i * s * 0.07, baseY - s * 0.26, s * 0.045, 5, i, 0.85);
        ctx.fill();
      }
    },
  };
}

function paintCarvingBench(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  // The bowyer's bench on the table grammar: a thick sawyer's
  // slab in full plan, shoulder-wide, with the vise, stave and
  // drawknife all living ON the visible top plane.
  const th = s * 0.5;
  const xL = p.x - s * 0.5;
  const xR = p.x + s * 0.5;
  const yT = p.y - syT * 0.34;
  const yB = p.y + syT * 0.42;
  const topC = '#9b7440';
  const legC = '#5b4028';
  return {
    sortY: ty + 0.85,
    body: stationBody(1.05, 1.5, 0.7),
    drawShadow: () => {
      rend.castEdgeQuad(xL, yB + syT * 0.06, xR, yB + syT * 0.06, 0.7);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      const act = rend.stationHeat.get(packTile(tx, ty)) ?? 0;
      // Contact shade, stout legs with splayed feet, an apron.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.fillRect(xL + s * 0.02, yB + s * 0.005, xR - xL - s * 0.04, s * 0.04);
      const leg = (lx: number, ly: number, hgt: number) => {
        ctx.fillStyle = legC;
        ctx.beginPath();
        ctx.moveTo(lx - s * 0.048, ly - hgt);
        ctx.lineTo(lx + s * 0.048, ly - hgt);
        ctx.lineTo(lx + s * 0.036, ly - s * 0.06);
        ctx.lineTo(lx + s * 0.06, ly);
        ctx.lineTo(lx - s * 0.06, ly);
        ctx.lineTo(lx - s * 0.036, ly - s * 0.06);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(legC, -14);
        ctx.fillRect(lx - s * 0.06, ly - s * 0.02, s * 0.12, s * 0.02);
      };
      leg(xL + s * 0.09, yB, th + syT * 0.05);
      leg(xR - s * 0.09, yB, th + syT * 0.05);
      leg(xL + s * 0.09, yT + syT * 0.18, (th + syT * 0.05) * 0.92);
      leg(xR - s * 0.09, yT + syT * 0.18, (th + syT * 0.05) * 0.92);
      // The billet store on a low stretcher shelf: split limbs
      // waiting to be staves.
      ctx.fillStyle = shade(legC, -8);
      ctx.fillRect(xL + s * 0.1, yB - th * 0.45, xR - xL - s * 0.2, s * 0.045);
      ctx.fillStyle = '#8a6534';
      ctx.fillRect(xL + s * 0.14, yB - th * 0.45 - s * 0.05, s * 0.56, s * 0.05);
      ctx.fillStyle = '#7a552e';
      ctx.fillRect(xL + s * 0.18, yB - th * 0.45 - s * 0.1, s * 0.48, s * 0.05);
      ctx.fillStyle = '#d8cbb0';
      for (const ex of [0.14, 0.7] as const) {
        ctx.fillRect(xL + s * ex, yB - th * 0.45 - s * 0.048, s * 0.028, s * 0.046);
      }
      // The slab: one thick board in plan, rimmed dark, its
      // south lip lit — a top the camera actually sees.
      ctx.fillStyle = topC;
      ctx.beginPath();
      chamferRect(ctx, xL, yT - th, xR - xL, yB - yT, s * 0.05);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1.2, s * 0.028);
      ctx.stroke();
      ctx.fillStyle = shade(topC, 14);
      ctx.fillRect(xL + s * 0.01, yB - th - s * 0.045, xR - xL - s * 0.02, s * 0.045);
      ctx.fillStyle = shade(topC, -8);
      ctx.fillRect(xL + s * 0.01, yT - th, xR - xL - s * 0.02, s * 0.028);
      // Grain seams + old knife scars across the working face.
      ctx.fillStyle = 'rgba(58, 40, 22, 0.25)';
      ctx.fillRect(xL + s * 0.08, yT - th + (yB - yT) * 0.4, xR - xL - s * 0.16, s * 0.018);
      for (let k = 0; k < 3; k++) {
        const hh3 = hashCoords(71 + k, tx, ty);
        ctx.fillRect(
          xL + s * 0.15 + ((hh3 % 50) / 100) * s,
          yT - th + (0.55 + ((hh3 >> 5) % 30) / 100) * (yB - yT),
          s * (0.1 + (hh3 % 3) * 0.04),
          s * 0.014,
        );
      }
      // The leg vise stands up from the west end of the plan:
      // iron jaw plates and a turned wooden screw handle.
      const vx = xL + s * 0.12;
      const vy = yT - th + (yB - yT) * 0.55;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
      ctx.beginPath();
      ctx.ellipse(vx, vy + s * 0.012, s * 0.09, s * 0.03, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6b6470';
      ctx.fillRect(vx - s * 0.07, vy - s * 0.22, s * 0.14, s * 0.22);
      ctx.fillStyle = shade('#6b6470', 12);
      ctx.fillRect(vx - s * 0.07, vy - s * 0.22, s * 0.045, s * 0.22);
      ctx.fillStyle = '#8d9299';
      ctx.fillRect(vx - s * 0.085, vy - s * 0.27, s * 0.17, s * 0.055);
      ctx.fillStyle = shade('#8d9299', 16);
      ctx.fillRect(vx - s * 0.085, vy - s * 0.27, s * 0.17, s * 0.02);
      // The screw handle poking south, a wooden T.
      ctx.fillStyle = '#8a6534';
      ctx.fillRect(vx - s * 0.02, vy - s * 0.06, s * 0.04, s * 0.14);
      ctx.fillRect(vx - s * 0.075, vy + s * 0.065, s * 0.15, s * 0.035);
      // The clamped stave: a long limb laid low across the
      // bench from the vise jaws to past the east rim — flat on
      // the work, not arched over it. It nods with each
      // drawknife pass while someone works.
      const nod = act > 0.05 ? Math.sin(t * 7 + h) * 0.02 * act : 0;
      const stY0 = vy - s * 0.2;
      const stY1 = yT - th + (yB - yT) * 0.3;
      ctx.strokeStyle = '#b08a5c';
      ctx.lineWidth = Math.max(2.4, s * 0.07);
      ctx.beginPath();
      ctx.moveTo(vx + s * 0.02, stY0);
      ctx.quadraticCurveTo(p.x + s * 0.06, stY1 - s * (0.09 + nod), xR + s * 0.02, stY1);
      ctx.stroke();
      // Taper to the east tip — the limb thins where it's been
      // worked down.
      ctx.strokeStyle = shade('#b08a5c', -10);
      ctx.lineWidth = Math.max(1.6, s * 0.045);
      ctx.beginPath();
      ctx.moveTo(p.x + s * 0.24, stY1 - s * (0.035 + nod * 0.4));
      ctx.quadraticCurveTo(xR - s * 0.08, stY1 - s * 0.01, xR + s * 0.02, stY1);
      ctx.stroke();
      // Pale sapwood streak along the worked upper face.
      ctx.strokeStyle = 'rgba(232, 216, 176, 0.55)';
      ctx.lineWidth = Math.max(1, s * 0.024);
      ctx.beginPath();
      ctx.moveTo(vx + s * 0.05, stY0 - s * 0.02);
      ctx.quadraticCurveTo(p.x + s * 0.06, stY1 - s * (0.12 + nod), xR - s * 0.02, stY1 - s * 0.03);
      ctx.stroke();
      // Drawknife lying ON the plan mid-bench, its own shadow.
      const dkx = p.x + s * 0.08;
      const dky = yT - th + (yB - yT) * 0.68;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
      ctx.beginPath();
      ctx.ellipse(dkx + s * 0.12, dky + s * 0.03, s * 0.16, s * 0.03, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8d9299';
      ctx.fillRect(dkx - s * 0.02, dky - s * 0.025, s * 0.28, s * 0.05);
      ctx.fillStyle = shade('#8d9299', 18);
      ctx.fillRect(dkx - s * 0.02, dky - s * 0.025, s * 0.28, s * 0.018);
      ctx.fillStyle = legC;
      ctx.fillRect(dkx - s * 0.065, dky - s * 0.035, s * 0.055, s * 0.07);
      ctx.fillRect(dkx + s * 0.255, dky - s * 0.035, s * 0.055, s * 0.07);
      // Shaving litter on the plan — filled curl chips, not
      // pen-strokes — and a settled drift at the near-east leg.
      ctx.fillStyle = 'rgba(216, 192, 138, 0.85)';
      for (let k = 0; k < 5; k++) {
        const hh5 = hashCoords(77 + k, tx, ty);
        const sx2 = xL + s * 0.14 + ((hh5 % 70) / 100) * (xR - xL - s * 0.3);
        const sy2 = yT - th + (0.4 + ((hh5 >> 6) % 45) / 100) * (yB - yT);
        ctx.save();
        ctx.translate(sx2, sy2);
        ctx.rotate(((hh5 >> 3) % 7) * 0.5);
        ctx.fillRect(-s * 0.035, -s * 0.012, s * 0.07, s * 0.024);
        ctx.restore();
      }
      ctx.fillStyle = '#c9a86a';
      ctx.beginPath();
      facetCircle(ctx, p.x + s * 0.34, yB - s * 0.02, s * 0.13, 7, h * 0.4, 0.45);
      ctx.fill();
      ctx.fillStyle = shade('#c9a86a', -12);
      ctx.fillRect(p.x + s * 0.24, yB - s * 0.055, s * 0.05, s * 0.02);
      ctx.fillRect(p.x + s * 0.36, yB - s * 0.03, s * 0.045, s * 0.02);
      // A finished longbow leans against the east end, strung —
      // proof of what this bench is FOR.
      ctx.strokeStyle = '#8a5a2e';
      ctx.lineWidth = Math.max(2, s * 0.05);
      ctx.beginPath();
      ctx.moveTo(xR + s * 0.1, yB - s * 0.01);
      ctx.quadraticCurveTo(xR + s * 0.22, yB - th - s * 0.35, xR + s * 0.05, yB - th - s * 0.72);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(224, 214, 186, 0.7)';
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.moveTo(xR + s * 0.1, yB - s * 0.01);
      ctx.lineTo(xR + s * 0.05, yB - th - s * 0.72);
      ctx.stroke();
      // Shaving curls fly off the stave while the bench works.
      if (act > 0.05) {
        for (let i = 0; i < 3; i++) {
          const ct2 = (t * (1.1 + i * 0.3) + h * 0.23 + i * 0.33) % 1;
          ctx.strokeStyle = `rgba(201, 168, 106, ${0.8 * (1 - ct2) * act})`;
          ctx.lineWidth = Math.max(1, s * 0.022);
          ctx.beginPath();
          ctx.arc(
            p.x + s * 0.05 + ct2 * s * 0.24 + i * s * 0.05,
            yT - th - s * 0.16 + ct2 * s * 0.34,
            s * 0.035,
            0.4 + ct2 * 3,
            3.4 + ct2 * 3,
          );
          ctx.stroke();
        }
      }
    },
  };
}

function paintBeastPen(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  // THE THREE STALLS: a pen corner, not bare fencing — two set
  // posts carrying doubled rails, a hay manger heaped inside,
  // a water pail by the near post, and ground scuffed bare by
  // hooves and paws. It reads as a kept animal's home corner
  // even when every stall is empty.
  const xL = p.x - s * 0.5;
  const xR = p.x + s * 0.5;
  const yB = p.y + syT * 0.42;
  const postC = '#5f4426';
  const railC = '#8a6234';
  const hayC = '#c9a64b';
  const railY1 = yB - s * 0.58; // upper rail: hip height
  const railY2 = yB - s * 0.32;
  return {
    sortY: ty + 0.85,
    body: stationBody(1.05, 1.5, 0.7),
    drawShadow: () => {
      rend.castEdgeQuad(xL, yB + syT * 0.06, xR, yB + syT * 0.06, 0.7);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      const act = rend.stationHeat.get(packTile(tx, ty)) ?? 0;
      // Hoof-scuffed earth: the pen floor worn bare of grass.
      ctx.fillStyle = 'rgba(94, 70, 44, 0.4)';
      ctx.beginPath();
      ctx.ellipse(p.x, yB - s * 0.04, s * 0.46, syT * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.fillRect(xL + s * 0.04, yB + s * 0.005, xR - xL - s * 0.08, s * 0.04);
      // The two posts: square-set, sun on the sawn tops (the
      // top-plane law), a grain check hash-jittered per pen.
      const post = (cx: number) => {
        ctx.fillStyle = postC;
        ctx.fillRect(cx - s * 0.06, railY1 - s * 0.14, s * 0.12, yB - (railY1 - s * 0.14));
        ctx.fillStyle = shade(postC, -16);
        ctx.fillRect(cx + s * 0.02, railY1 - s * 0.14, s * 0.04, yB - (railY1 - s * 0.14));
        ctx.fillStyle = shade(postC, 30);
        ctx.fillRect(cx - s * 0.06, railY1 - s * 0.14, s * 0.12, s * 0.045);
        ctx.strokeStyle = shade(postC, -26);
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.02, railY1 + s * ((h % 3) * 0.05));
        ctx.lineTo(cx - s * 0.01, railY2 + s * 0.08);
        ctx.stroke();
      };
      post(xL + s * 0.12);
      post(xR - s * 0.12);
      // Doubled rails spanning the posts: lit top band on the
      // upper arris, belly shade under each.
      for (const ry of [railY1, railY2]) {
        ctx.fillStyle = railC;
        ctx.beginPath();
        ctx.roundRect(xL + s * 0.02, ry - s * 0.05, xR - xL - s * 0.04, s * 0.1, s * 0.04);
        ctx.fill();
        ctx.strokeStyle = 'rgba(26, 20, 36, 0.5)';
        ctx.lineWidth = Math.max(1.2, s * 0.026);
        ctx.stroke();
        ctx.fillStyle = shade(railC, ry === railY1 ? 24 : 12);
        ctx.fillRect(xL + s * 0.08, ry - s * 0.04, xR - xL - s * 0.16, s * 0.03);
        ctx.fillStyle = 'rgba(26, 16, 8, 0.28)';
        ctx.fillRect(xL + s * 0.08, ry + s * 0.02, xR - xL - s * 0.16, s * 0.022);
      }
      // The hay manger inside: a low board box heaped over its
      // rim, straws escaping at hash-jittered angles.
      const mx = p.x - s * 0.1;
      const myY = yB - s * 0.1;
      ctx.fillStyle = shade(railC, -18);
      ctx.fillRect(mx - s * 0.24, myY - s * 0.1, s * 0.48, s * 0.12);
      ctx.fillStyle = hayC;
      ctx.beginPath();
      ctx.ellipse(mx, myY - s * 0.1, s * 0.26, s * 0.09, 0, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = shade(hayC, -24);
      ctx.lineWidth = Math.max(1, s * 0.016);
      for (let i = 0; i < 4; i++) {
        const a = -0.6 - ((h >> i) % 5) * 0.28;
        const sx = mx - s * 0.18 + i * s * 0.12;
        ctx.beginPath();
        ctx.moveTo(sx, myY - s * 0.12);
        ctx.lineTo(sx + Math.cos(a) * s * 0.1, myY - s * 0.12 + Math.sin(a) * s * 0.1);
        ctx.stroke();
      }
      // The water pail by the near post: staved, banded, a
      // still disc of sky in the mouth.
      const px2 = xR - s * 0.3;
      const py2 = yB - s * 0.02;
      ctx.fillStyle = '#6b5138';
      ctx.beginPath();
      ctx.moveTo(px2 - s * 0.075, py2 - s * 0.14);
      ctx.lineTo(px2 + s * 0.075, py2 - s * 0.14);
      ctx.lineTo(px2 + s * 0.06, py2);
      ctx.lineTo(px2 - s * 0.06, py2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shade('#6b5138', -24);
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.stroke();
      ctx.fillStyle = '#5a7d9e';
      ctx.beginPath();
      ctx.ellipse(px2, py2 - s * 0.14, s * 0.07, s * 0.024, 0, 0, Math.PI * 2);
      ctx.fill();
      // A warm pen breathes: hay motes drift while the stalls
      // are worked (panel open or a stable-door act running).
      if (act > 0.05) {
        ctx.fillStyle = `rgba(222, 196, 120, ${0.5 * act})`;
        for (let i = 0; i < 3; i++) {
          const ph = t * 0.9 + i * 2.1 + (h % 7);
          const wob = Math.sin(ph) * s * 0.1;
          const rise = (ph % 1.6) / 1.6;
          ctx.fillRect(mx + wob + i * s * 0.14 - s * 0.1, myY - s * 0.16 - rise * s * 0.3, s * 0.03, s * 0.03);
        }
      }
    },
  };
}

function paintCompostBin(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  // THE LIVING SOIL: a slatted timber box, hip-high on the body
  // ruler, open top showing the heap (the top-plane law). The
  // heap is live state from the care mirror: rising as it fills,
  // lidded and steaming while the batch works, dark and glinting
  // when it is ready to turn out. Live-painted on purpose (never
  // in STATION_CACHE_TILES) so the state always reads true.
  const xL = p.x - s * 0.38;
  const xR = p.x + s * 0.38;
  const yB = p.y + syT * 0.4;
  const yT = yB - s * 0.52;
  const slatC = '#6e5433';
  const loamC = '#4a3a28';
  return {
    sortY: ty + 0.8,
    body: stationBody(0.75, 0.95, 0.5),
    drawShadow: () => {
      rend.castEdgeQuad(xL, yB + syT * 0.05, xR, yB + syT * 0.05, 0.55);
    },
    draw: () => {
      // Draw-time ctx capture (the outline-pass scratch law).
      const ctx = rend.ctx;
      const bin = farmBins.get(`${tx},${ty}`);
      const now = Date.now();
      const working = !!bin && bin.readyAt !== 0 && now < bin.readyAt;
      const ready = !!bin && bin.readyAt !== 0 && now >= bin.readyAt;
      const fillFrac = ready || working ? 1 : bin ? Math.min(1, bin.fill / COMPOST_BATCH_WORTH) : 0;
      // Worn earth underfoot: the barrow path to the lid.
      ctx.fillStyle = 'rgba(94, 70, 44, 0.35)';
      ctx.beginPath();
      ctx.ellipse(p.x, yB + syT * 0.02, s * 0.42, syT * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      // The box: front face in three slat bands, dark gaps
      // between, corner posts proud of the slats.
      for (let i = 0; i < 3; i++) {
        const sy0 = yT + s * 0.09 + i * s * 0.15;
        ctx.fillStyle = shade(slatC, i === 0 ? 8 : i === 1 ? 0 : -8);
        ctx.fillRect(xL + s * 0.03, sy0, xR - xL - s * 0.06, s * 0.115);
        ctx.fillStyle = 'rgba(20, 14, 26, 0.5)';
        ctx.fillRect(xL + s * 0.03, sy0 + s * 0.115, xR - xL - s * 0.06, s * 0.028);
      }
      for (const cx of [xL + s * 0.05, xR - s * 0.05]) {
        ctx.fillStyle = shade(slatC, -14);
        ctx.fillRect(cx - s * 0.045, yT - s * 0.03, s * 0.09, yB - yT + s * 0.03);
        ctx.fillStyle = shade(slatC, 26);
        ctx.fillRect(cx - s * 0.045, yT - s * 0.03, s * 0.09, s * 0.035);
      }
      // The open top plane: rim band, then the heap inside —
      // a tilted bird's eye, never pure elevation.
      ctx.fillStyle = shade(slatC, 18);
      ctx.beginPath();
      ctx.ellipse(p.x, yT + syT * 0.02, s * 0.36, syT * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(16, 12, 22, 0.75)';
      ctx.beginPath();
      ctx.ellipse(p.x, yT + syT * 0.03, s * 0.29, syT * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      if (working) {
        // The lid closes over the batch: two planks and a stone
        // weight, sun on the near arris.
        ctx.fillStyle = shade(slatC, 12);
        ctx.beginPath();
        ctx.ellipse(p.x, yT + syT * 0.02, s * 0.33, syT * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(26, 20, 36, 0.5)';
        ctx.lineWidth = Math.max(1, s * 0.02);
        ctx.beginPath();
        ctx.moveTo(p.x - s * 0.3, yT + syT * 0.02);
        ctx.lineTo(p.x + s * 0.3, yT + syT * 0.02);
        ctx.stroke();
        ctx.fillStyle = '#827e8a';
        ctx.beginPath();
        facetCircle(ctx, p.x + s * 0.08, yT - s * 0.015, s * 0.09, 6, h, 0.5);
        ctx.fill();
        // Steam wisps rise on the beat: the heap is alive.
        for (let i = 0; i < 3; i++) {
          const ph = (t * 0.45 + i * 0.37 + ((h >> (i * 3)) % 5) * 0.13) % 1;
          ctx.fillStyle = `rgba(226, 222, 210, ${0.34 * (1 - ph)})`;
          ctx.beginPath();
          ctx.ellipse(
            p.x - s * 0.14 + i * s * 0.14 + Math.sin(ph * 6 + i) * s * 0.05,
            yT - s * 0.1 - ph * s * 0.42,
            s * (0.045 + ph * 0.05),
            s * (0.035 + ph * 0.04),
            0, 0, Math.PI * 2,
          );
          ctx.fill();
        }
      } else if (fillFrac > 0) {
        // The heap: loam mounding toward the rim as it fills;
        // a turned-out-ready batch reads darker and richer.
        const heapC = ready ? '#352a1e' : loamC;
        ctx.fillStyle = heapC;
        ctx.beginPath();
        ctx.ellipse(
          p.x,
          yT + syT * 0.03 - fillFrac * s * 0.05,
          s * (0.16 + fillFrac * 0.12),
          syT * (0.055 + fillFrac * 0.04),
          0, 0, Math.PI * 2,
        );
        ctx.fill();
        ctx.fillStyle = shade(heapC, 14);
        ctx.beginPath();
        ctx.ellipse(
          p.x - s * 0.05,
          yT + syT * 0.01 - fillFrac * s * 0.05,
          s * (0.07 + fillFrac * 0.05),
          syT * 0.03,
          0, 0, Math.PI * 2,
        );
        ctx.fill();
        if (ready) {
          // The turn-out beacon: a warm glint on the finished
          // batch, the ripe-payload law spoken in loam.
          const a = twinkle(t, h, 2.8);
          if (a > 0) rend.sparkle(p.x + s * 0.06, yT - s * 0.06, s * 0.1, a, '#e8c04c');
        }
      }
      // Scrap litter at the foot: peel curls and a dropped leaf.
      ctx.fillStyle = 'rgba(122, 140, 84, 0.8)';
      ctx.fillRect(xL - s * 0.1, yB - s * 0.04, s * 0.07, s * 0.028);
      ctx.fillStyle = 'rgba(158, 120, 66, 0.8)';
      ctx.fillRect(xR + s * 0.03, yB - s * 0.02, s * 0.06, s * 0.026);
    },
  };
}

function paintFeedTrough(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  // THE ANIMALS OF THE YARD: a knee-high manger — two set posts
  // carrying a long board box, feed heaped by the mirror's own
  // count, loose straws escaping, a hoof-worn apron below. The
  // herd's whole economy reads at a glance: heaped, low, bare.
  const xL = p.x - s * 0.46;
  const xR = p.x + s * 0.46;
  const yB = p.y + syT * 0.4;
  const boxTop = yB - s * 0.34;
  const woodC = '#6e5433';
  return {
    sortY: ty + 0.8,
    body: stationBody(0.9, 0.7, 0.5),
    drawShadow: () => {
      rend.castEdgeQuad(xL, yB + syT * 0.05, xR, yB + syT * 0.05, 0.55);
    },
    draw: () => {
      const ctx = rend.ctx;
      const feed = farmTroughs.get(`${tx},${ty}`)?.feed ?? 0;
      // Hoof-worn apron: the herd stands here all day.
      ctx.fillStyle = 'rgba(94, 70, 44, 0.38)';
      ctx.beginPath();
      ctx.ellipse(p.x, yB + syT * 0.03, s * 0.52, syT * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      // The two set posts, sun on the sawn tops.
      for (const px2 of [xL + s * 0.08, xR - s * 0.08]) {
        ctx.fillStyle = shade(woodC, -14);
        ctx.fillRect(px2 - s * 0.05, boxTop - s * 0.02, s * 0.1, yB - boxTop + s * 0.02);
        ctx.fillStyle = shade(woodC, 28);
        ctx.fillRect(px2 - s * 0.05, boxTop - s * 0.02, s * 0.1, s * 0.035);
      }
      // The long box: front board with a lit top arris and a
      // dark seam under the rim.
      ctx.fillStyle = woodC;
      ctx.fillRect(xL + s * 0.02, boxTop, xR - xL - s * 0.04, s * 0.2);
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.5)';
      ctx.lineWidth = Math.max(1.2, s * 0.024);
      ctx.strokeRect(xL + s * 0.02, boxTop, xR - xL - s * 0.04, s * 0.2);
      ctx.fillStyle = shade(woodC, 22);
      ctx.fillRect(xL + s * 0.06, boxTop + s * 0.012, xR - xL - s * 0.12, s * 0.03);
      // The feed: a straw-gold heap rising with the mirror's
      // count; a bare manger shows its dark hollow instead.
      const frac = Math.min(1, feed / 12);
      if (frac > 0) {
        const heapC = '#c9a64b';
        ctx.fillStyle = heapC;
        ctx.beginPath();
        ctx.ellipse(
          p.x,
          boxTop + s * 0.02 - frac * s * 0.07,
          (xR - xL) * 0.36,
          syT * (0.05 + frac * 0.05),
          0, Math.PI, 0,
        );
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(heapC, 20);
        ctx.beginPath();
        ctx.ellipse(p.x - s * 0.1, boxTop - frac * s * 0.06, s * 0.12, syT * 0.03, -0.2, 0, Math.PI * 2);
        ctx.fill();
        // Escaped straws at hash-dealt angles.
        ctx.strokeStyle = shade(heapC, -12);
        ctx.lineWidth = Math.max(1, s * 0.016);
        for (let k = 0; k < 3; k++) {
          const hh = (h >> (k * 5)) & 0xff;
          const sx2 = xL + s * 0.1 + ((hh % 80) / 100) * (xR - xL - s * 0.2);
          ctx.beginPath();
          ctx.moveTo(sx2, boxTop - s * 0.01);
          ctx.lineTo(sx2 + s * 0.05, boxTop - s * 0.05 - ((hh >> 4) % 3) * s * 0.01);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = 'rgba(20, 14, 24, 0.6)';
        ctx.beginPath();
        ctx.ellipse(p.x, boxTop + s * 0.03, (xR - xL) * 0.34, syT * 0.045, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
}

function paintWindmill(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  // THE WORKING YARD's marquee: a stone-footed tower two and a
  // half bodies tall, gallery cap, and four cloth sails that
  // actually TURN while a batch works (live paint; the mirror
  // is the drive shaft). Foreshortened cap plane, grounding
  // outline, strata on the tower — the ore-mass laws in timber.
  const yB = p.y + syT * 0.42;
  const towerW = s * 0.62;
  const towerH = s * 2.1;
  const capY = yB - towerH;
  return {
    sortY: ty + 0.85,
    body: stationBody(0.9, 2.6, 0.6),
    drawShadow: () => rend.castEdgeQuad(p.x - towerW * 0.6, yB + syT * 0.05, p.x + towerW * 0.6, yB + syT * 0.05, 0.65),
    draw: () => {
      const ctx = rend.ctx;
      const job = farmJobs.get(`${tx},${ty}`);
      const working = !!job && job.qty > 0;
      // The tapered tower: lit west lane, mortar courses.
      ctx.fillStyle = '#8d8798';
      ctx.beginPath();
      ctx.moveTo(p.x - towerW * 0.5, yB);
      ctx.lineTo(p.x - towerW * 0.34, capY);
      ctx.lineTo(p.x + towerW * 0.34, capY);
      ctx.lineTo(p.x + towerW * 0.5, yB);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.5)';
      ctx.lineWidth = Math.max(1.4, s * 0.03);
      ctx.stroke();
      ctx.fillStyle = shade('#8d8798', 16);
      ctx.beginPath();
      ctx.moveTo(p.x - towerW * 0.5, yB);
      ctx.lineTo(p.x - towerW * 0.34, capY);
      ctx.lineTo(p.x - towerW * 0.12, capY);
      ctx.lineTo(p.x - towerW * 0.2, yB);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.25)';
      ctx.lineWidth = Math.max(1, s * 0.016);
      for (let k = 1; k < 4; k++) {
        const cy2 = yB - (towerH * k) / 4;
        const w2 = towerW * (0.5 - 0.16 * (k / 4)) * 2;
        ctx.beginPath();
        ctx.moveTo(p.x - w2 / 2, cy2);
        ctx.lineTo(p.x + w2 / 2, cy2 + s * 0.02);
        ctx.stroke();
      }
      // The door at the foot, warm inside when working.
      ctx.fillStyle = working ? '#c98a3c' : '#3a2c18';
      ctx.beginPath();
      ctx.roundRect(p.x - s * 0.1, yB - s * 0.34, s * 0.2, s * 0.34, s * 0.06);
      ctx.fill();
      // The gallery cap: a foreshortened timber dome.
      ctx.fillStyle = '#a8794a';
      ctx.beginPath();
      ctx.ellipse(p.x, capY, towerW * 0.44, syT * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.stroke();
      // The sails: four cloth arms off the cap hub, turning on
      // the clock while the batch runs, still when it rests.
      const hubX = p.x;
      const hubY = capY - s * 0.06;
      const ang = working ? (t * 0.9) % (Math.PI * 2) : 0.4;
      for (let k = 0; k < 4; k++) {
        const a = ang + (k * Math.PI) / 2;
        const ex = hubX + Math.cos(a) * s * 0.78;
        const ey = hubY + Math.sin(a) * s * 0.62;
        ctx.strokeStyle = '#5f4426';
        ctx.lineWidth = Math.max(1.4, s * 0.035);
        ctx.beginPath();
        ctx.moveTo(hubX, hubY);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.save();
        ctx.translate((hubX + ex) / 2, (hubY + ey) / 2);
        ctx.rotate(Math.atan2(ey - hubY, ex - hubX));
        // The cloth: warm laced canvas with a dark tip band so
        // the turning cross reads against sky and field alike.
        ctx.fillStyle = 'rgba(236, 224, 194, 0.95)';
        ctx.fillRect(-s * 0.26, s * 0.015, s * 0.52, s * 0.13);
        ctx.strokeStyle = 'rgba(26, 20, 36, 0.45)';
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.strokeRect(-s * 0.26, s * 0.015, s * 0.52, s * 0.13);
        ctx.strokeStyle = 'rgba(150, 128, 90, 0.5)';
        ctx.lineWidth = Math.max(1, s * 0.012);
        for (const u of [-0.12, 0.02, 0.16]) {
          ctx.beginPath();
          ctx.moveTo(u * s, s * 0.015);
          ctx.lineTo(u * s, s * 0.145);
          ctx.stroke();
        }
        ctx.fillStyle = '#8a4a32';
        ctx.fillRect(s * 0.2, s * 0.015, s * 0.06, s * 0.13);
        ctx.restore();
      }
      ctx.fillStyle = '#3a2c18';
      ctx.beginPath();
      ctx.arc(hubX, hubY, s * 0.05, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

function paintScarecrow(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tile, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const yB = p.y + syT * 0.4;
  // Per-tile headroom: the scratch bounds must contain the TALLEST
  // paint or the pass clips it flat — the silo's whole cap (finial
  // tops yB − 2.16s) and the scarecrow's hat crown (yB − 1.44s)
  // both shipped guillotined under the shared 1.0 rise.
  const bodyUp =
    tile === Tile.Silo ? 2.25
    : tile === Tile.Smoker ? 2.0
    : tile === Tile.FruitPress ? 1.55
    : tile === Tile.DryingRack ? 1.5
    : tile === Tile.Scarecrow ? 1.5
    : tile === Tile.ButterChurn ? 1.45
    : tile === Tile.Apiary ? 1.4
    : 1.0;
  return {
    sortY: ty + 0.8,
    body: stationBody(0.7, bodyUp, 0.5),
    drawShadow: () => rend.castEdgeQuad(p.x - s * 0.36, yB + syT * 0.05, p.x + s * 0.36, yB + syT * 0.05, 0.55),
    draw: () => {
      const ctx = rend.ctx;
      const job = farmJobs.get(`${tx},${ty}`);
      const working = !!job && job.qty > 0;
      if (tile === Tile.Scarecrow) {
        // THE DRESSED FARM: a keeper that LOOMS — the pole
        // stands taller than the body ruler, wide cross-arms, a
        // stuffed patch coat over a straw skirt, sack head with
        // stitched eyes under a broad brim — and one crow who
        // was never fooled, riding the arm.
        ctx.strokeStyle = '#5f4426';
        ctx.lineWidth = Math.max(2, s * 0.065);
        ctx.beginPath();
        ctx.moveTo(p.x, yB);
        ctx.lineTo(p.x, yB - s * 1.3);
        ctx.moveTo(p.x - s * 0.42, yB - s * 0.98);
        ctx.lineTo(p.x + s * 0.42, yB - s * 0.98);
        ctx.stroke();
        // Straw skirt spilling below the coat hem.
        ctx.strokeStyle = '#c9a64b';
        ctx.lineWidth = Math.max(1, s * 0.024);
        for (let i = 0; i < 5; i++) {
          const sx2 = p.x - s * 0.12 + i * s * 0.06;
          const swy = ((h >> i) % 3) * s * 0.02;
          ctx.beginPath();
          ctx.moveTo(sx2, yB - s * 0.62);
          ctx.lineTo(sx2 + (i - 2) * s * 0.02, yB - s * 0.42 + swy);
          ctx.stroke();
        }
        // The coat: a stuffed body with a lit shoulder band and
        // one stitched patch (hash picks the side).
        ctx.fillStyle = '#8a6a45';
        ctx.beginPath();
        ctx.roundRect(p.x - s * 0.22, yB - s * 1.06, s * 0.44, s * 0.46, s * 0.07);
        ctx.fill();
        ctx.strokeStyle = 'rgba(26, 20, 36, 0.5)';
        ctx.lineWidth = Math.max(1.2, s * 0.024);
        ctx.stroke();
        ctx.fillStyle = shade('#8a6a45', 20);
        ctx.fillRect(p.x - s * 0.18, yB - s * 1.03, s * 0.36, s * 0.06);
        const patchX = p.x + ((h & 1) ? -1 : 1) * s * 0.09;
        ctx.fillStyle = '#6e5433';
        ctx.fillRect(patchX - s * 0.05, yB - s * 0.82, s * 0.1, s * 0.09);
        ctx.strokeStyle = 'rgba(26, 20, 36, 0.4)';
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.strokeRect(patchX - s * 0.05, yB - s * 0.82, s * 0.1, s * 0.09);
        // Straw hands bursting off both sleeve ends.
        ctx.strokeStyle = '#c9a64b';
        ctx.lineWidth = Math.max(1, s * 0.022);
        for (const u of [-1, 1]) {
          for (let k = 0; k < 3; k++) {
            ctx.beginPath();
            ctx.moveTo(p.x + u * s * 0.4, yB - s * 0.98);
            ctx.lineTo(p.x + u * (s * 0.48 + k * s * 0.02), yB - s * (0.94 + k * 0.05));
            ctx.stroke();
          }
        }
        // The sack head: stitched eyes and a seam mouth under a
        // broad shading brim.
        ctx.fillStyle = '#d8c9a0';
        ctx.beginPath();
        facetCircle(ctx, p.x, yB - s * 1.22, s * 0.14, 6, h, 0.8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(26, 20, 36, 0.5)';
        ctx.lineWidth = Math.max(1.2, s * 0.022);
        ctx.stroke();
        ctx.strokeStyle = '#6e5433';
        ctx.lineWidth = Math.max(1, s * 0.018);
        for (const u of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(p.x + u * s * 0.07 - s * 0.02, yB - s * 1.25);
          ctx.lineTo(p.x + u * s * 0.07 + s * 0.02, yB - s * 1.21);
          ctx.moveTo(p.x + u * s * 0.07 - s * 0.02, yB - s * 1.21);
          ctx.lineTo(p.x + u * s * 0.07 + s * 0.02, yB - s * 1.25);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(p.x - s * 0.05, yB - s * 1.14);
        ctx.lineTo(p.x + s * 0.05, yB - s * 1.13);
        ctx.stroke();
        ctx.fillStyle = '#6e5433';
        ctx.beginPath();
        ctx.roundRect(p.x - s * 0.2, yB - s * 1.36, s * 0.4, s * 0.055, s * 0.02);
        ctx.fill();
        ctx.fillStyle = shade('#6e5433', 16);
        ctx.fillRect(p.x - s * 0.09, yB - s * 1.44, s * 0.18, s * 0.09);
        // The unfooled crow, glossy black with a bone beak.
        ctx.fillStyle = '#241a2e';
        ctx.beginPath();
        ctx.ellipse(p.x + s * 0.34, yB - s * 1.08, s * 0.07, s * 0.055, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x + s * 0.39, yB - s * 1.13, s * 0.035, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c9b98a';
        ctx.beginPath();
        ctx.moveTo(p.x + s * 0.42, yB - s * 1.14);
        ctx.lineTo(p.x + s * 0.47, yB - s * 1.12);
        ctx.lineTo(p.x + s * 0.42, yB - s * 1.1);
        ctx.closePath();
        ctx.fill();
      } else if (tile === Tile.HayBale) {
        // A rolled bale: spiral end grain, strap twine, loose
        // straws at the skirt.
        ctx.fillStyle = '#c9a64b';
        ctx.beginPath();
        ctx.roundRect(p.x - s * 0.32, yB - s * 0.44, s * 0.64, s * 0.44, s * 0.09);
        ctx.fill();
        ctx.strokeStyle = 'rgba(26, 20, 36, 0.5)';
        ctx.lineWidth = Math.max(1.2, s * 0.022);
        ctx.stroke();
        ctx.fillStyle = shade('#c9a64b', 18);
        ctx.fillRect(p.x - s * 0.28, yB - s * 0.42, s * 0.56, s * 0.06);
        ctx.strokeStyle = shade('#c9a64b', -20);
        ctx.lineWidth = Math.max(1, s * 0.018);
        for (const r of [0.14, 0.08, 0.03]) {
          ctx.beginPath();
          ctx.arc(p.x + s * 0.18, yB - s * 0.22, s * r, 0.4, 5.6);
          ctx.stroke();
        }
        ctx.strokeStyle = '#b0a068';
        ctx.lineWidth = Math.max(1, s * 0.02);
        ctx.beginPath();
        ctx.moveTo(p.x - s * 0.1, yB - s * 0.44);
        ctx.lineTo(p.x - s * 0.1, yB);
        ctx.stroke();
        ctx.fillStyle = shade('#c9a64b', -12);
        ctx.fillRect(p.x - s * 0.4, yB - s * 0.03, s * 0.08, s * 0.025);
        ctx.fillRect(p.x + s * 0.34, yB - s * 0.04, s * 0.07, s * 0.025);
      } else if (tile === Tile.Silo) {
        // The tall keep of the harvest: a TIMBER-staved drum on
        // a stone footing, iron hoops, conical shake cap with a
        // sunlit west face and a grain hatch column — warm
        // casework, never the windmill's grey twin.
        const sh = s * 1.7;
        const staveC = '#96703f';
        ctx.fillStyle = '#6e6a75';
        ctx.fillRect(p.x - s * 0.29, yB - s * 0.16, s * 0.58, s * 0.16);
        ctx.fillStyle = shade('#6e6a75', 18);
        ctx.fillRect(p.x - s * 0.29, yB - s * 0.16, s * 0.58, s * 0.04);
        ctx.fillStyle = staveC;
        ctx.fillRect(p.x - s * 0.26, yB - sh, s * 0.52, sh - s * 0.14);
        ctx.strokeStyle = 'rgba(26, 20, 36, 0.5)';
        ctx.lineWidth = Math.max(1.4, s * 0.026);
        ctx.strokeRect(p.x - s * 0.26, yB - sh, s * 0.52, sh - s * 0.14);
        // Stave seams, then the lit west lane over them.
        ctx.strokeStyle = 'rgba(26, 16, 8, 0.3)';
        ctx.lineWidth = Math.max(1, s * 0.014);
        for (const u of [-0.12, 0.02, 0.15]) {
          ctx.beginPath();
          ctx.moveTo(p.x + u * s * 2 * 0.26, yB - sh + s * 0.04);
          ctx.lineTo(p.x + u * s * 2 * 0.26, yB - s * 0.18);
          ctx.stroke();
        }
        ctx.fillStyle = shade(staveC, 22);
        ctx.fillRect(p.x - s * 0.22, yB - sh, s * 0.12, sh - s * 0.14);
        // Iron hoops binding the drum.
        ctx.fillStyle = '#55505e';
        for (const fy2 of [0.34, 0.78, 1.22]) {
          ctx.fillRect(p.x - s * 0.27, yB - s * fy2, s * 0.54, s * 0.045);
          ctx.fillStyle = '#6e6a78';
          ctx.fillRect(p.x - s * 0.27, yB - s * fy2, s * 0.54, s * 0.016);
          ctx.fillStyle = '#55505e';
        }
        // The grain hatch column: stacked doors up the face,
        // the low one open on the dark hoard.
        ctx.fillStyle = shade(staveC, -22);
        for (const fy2 of [0.62, 1.05]) {
          ctx.fillRect(p.x - s * 0.07, yB - s * fy2, s * 0.14, s * 0.14);
          ctx.strokeStyle = 'rgba(26, 20, 36, 0.45)';
          ctx.lineWidth = Math.max(1, s * 0.016);
          ctx.strokeRect(p.x - s * 0.07, yB - s * fy2, s * 0.14, s * 0.14);
        }
        ctx.fillStyle = '#241a2e';
        ctx.fillRect(p.x - s * 0.07, yB - s * 0.3, s * 0.14, s * 0.16);
        ctx.fillStyle = '#c9a64b';
        ctx.fillRect(p.x - s * 0.05, yB - s * 0.18, s * 0.1, s * 0.03);
        // The conical shake cap, lit west, finial peg on top.
        ctx.fillStyle = '#7d5a2e';
        ctx.beginPath();
        ctx.moveTo(p.x - s * 0.34, yB - sh);
        ctx.lineTo(p.x, yB - sh - s * 0.38);
        ctx.lineTo(p.x + s * 0.34, yB - sh);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(26, 20, 36, 0.5)';
        ctx.stroke();
        ctx.fillStyle = shade('#7d5a2e', 22);
        ctx.beginPath();
        ctx.moveTo(p.x - s * 0.34, yB - sh);
        ctx.lineTo(p.x, yB - sh - s * 0.38);
        ctx.lineTo(p.x - s * 0.02, yB - sh);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#5f4426';
        ctx.fillRect(p.x - s * 0.025, yB - sh - s * 0.46, s * 0.05, s * 0.1);
      } else if (tile === Tile.Dovecote) {
        // A whitewashed house on a post, arched doors, and the
        // tenants circling home.
        ctx.strokeStyle = '#5f4426';
        ctx.lineWidth = Math.max(1.6, s * 0.05);
        ctx.beginPath();
        ctx.moveTo(p.x, yB);
        ctx.lineTo(p.x, yB - s * 0.55);
        ctx.stroke();
        ctx.fillStyle = '#e8e2d4';
        ctx.beginPath();
        ctx.roundRect(p.x - s * 0.22, yB - s * 0.95, s * 0.44, s * 0.42, s * 0.05);
        ctx.fill();
        ctx.strokeStyle = 'rgba(26, 20, 36, 0.5)';
        ctx.lineWidth = Math.max(1, s * 0.02);
        ctx.stroke();
        ctx.fillStyle = '#7d5a2e';
        ctx.beginPath();
        ctx.moveTo(p.x - s * 0.28, yB - s * 0.95);
        ctx.lineTo(p.x, yB - s * 1.12);
        ctx.lineTo(p.x + s * 0.28, yB - s * 0.95);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#4a3a28';
        for (const u of [-0.1, 0.08]) {
          ctx.beginPath();
          ctx.arc(p.x + u * s + s * 0.02, yB - s * 0.72, s * 0.045, Math.PI, 0);
          ctx.rect(p.x + u * s - s * 0.025, yB - s * 0.72, s * 0.09, s * 0.06);
          ctx.fill();
        }
        // The doves: two white flecks on slow home arcs.
        ctx.fillStyle = 'rgba(240, 238, 230, 0.9)';
        for (let i = 0; i < 2; i++) {
          const a = t * 0.9 + i * Math.PI;
          ctx.beginPath();
          ctx.ellipse(
            p.x + Math.cos(a) * s * 0.4,
            yB - s * 1.0 + Math.sin(a * 1.4) * s * 0.14,
            s * 0.035,
            s * 0.02,
            Math.cos(a) * 0.4,
            0, Math.PI * 2,
          );
          ctx.fill();
        }
      } else if (tile === Tile.ButterChurn) {
        // THE WORKING YARD RECUT — the churn earns the dairy:
        // a TALL tapered stave tub at true knee-to-hip mass,
        // brass-hooped, the plunger staff standing head-high
        // through the domed lid, the milk pail waiting at its
        // foot. THE VESSEL SHOWS ITS TRADE AT REST; the batch
        // only adds the pumping and the splash.
        const bw = s * 0.5;
        const th = s * 0.72;
        const topW = bw * 0.78;
        const oak = '#7d5a2e';
        // The staff first — it stands BEHIND the lid.
        const pump = working ? Math.abs(Math.sin(t * 4.2 + h)) * s * 0.09 : 0;
        const staffTop = yB - th - s * 0.5 + pump;
        ctx.fillStyle = '#5f4426';
        ctx.fillRect(p.x - s * 0.026, staffTop, s * 0.052, yB - th - staffTop + s * 0.06);
        ctx.fillStyle = shade('#5f4426', 16);
        ctx.fillRect(p.x - s * 0.026, staffTop, s * 0.02, yB - th - staffTop);
        // T-handle, worn pale where hands live.
        ctx.fillStyle = '#8a6534';
        ctx.fillRect(p.x - s * 0.13, staffTop - s * 0.05, s * 0.26, s * 0.055);
        ctx.fillStyle = '#c9a76a';
        ctx.fillRect(p.x - s * 0.09, staffTop - s * 0.05, s * 0.18, s * 0.02);
        // The tub: tapered staves, wider at the foot.
        ctx.fillStyle = oak;
        ctx.beginPath();
        ctx.moveTo(p.x - bw / 2, yB);
        ctx.lineTo(p.x - topW / 2, yB - th);
        ctx.lineTo(p.x + topW / 2, yB - th);
        ctx.lineTo(p.x + bw / 2, yB);
        ctx.closePath();
        ctx.fill();
        // Stave seams + the west light.
        ctx.fillStyle = shade(oak, 18);
        ctx.beginPath();
        ctx.moveTo(p.x - bw / 2, yB);
        ctx.lineTo(p.x - topW / 2, yB - th);
        ctx.lineTo(p.x - topW / 2 + s * 0.07, yB - th);
        ctx.lineTo(p.x - bw / 2 + s * 0.07, yB);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(26, 20, 36, 0.3)';
        for (const u of [-0.16, 0.02, 0.2]) {
          ctx.fillRect(p.x + u * bw, yB - th * 0.96, s * 0.018, th * 0.92);
        }
        // Two brass hoops, snug to the taper.
        ctx.fillStyle = '#c9a86a';
        ctx.fillRect(p.x - bw * 0.485, yB - th * 0.2, bw * 0.97, s * 0.045);
        ctx.fillRect(p.x - bw * 0.43, yB - th * 0.72, bw * 0.86, s * 0.045);
        ctx.fillStyle = shade('#c9a86a', -20);
        ctx.fillRect(p.x - bw * 0.485, yB - th * 0.2 + s * 0.032, bw * 0.97, s * 0.013);
        ctx.fillRect(p.x - bw * 0.43, yB - th * 0.72 + s * 0.032, bw * 0.86, s * 0.013);
        // The domed lid: a foreshortened top plane, staff through.
        ctx.fillStyle = shade(oak, 26);
        ctx.beginPath();
        ctx.ellipse(p.x, yB - th, topW * 0.56, syT * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(oak, 10);
        ctx.beginPath();
        ctx.ellipse(p.x, yB - th - s * 0.02, topW * 0.44, syT * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
        if (working) {
          // Cream splashes the lid rim on the downstroke.
          ctx.fillStyle = 'rgba(240, 234, 214, 0.85)';
          const sp = Math.max(0, Math.sin(t * 4.2 + h)) * s;
          ctx.beginPath();
          ctx.ellipse(p.x - topW * 0.2, yB - th - s * 0.03, sp * 0.03, sp * 0.02, 0, 0, Math.PI * 2);
          ctx.ellipse(p.x + topW * 0.24, yB - th - s * 0.045, sp * 0.024, sp * 0.016, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // The milk pail at the foot, east — banded, pale-full.
        ctx.fillStyle = '#8a7a58';
        ctx.fillRect(p.x + bw * 0.62, yB - s * 0.2, s * 0.16, s * 0.2);
        ctx.fillStyle = '#e8e2d0';
        ctx.beginPath();
        ctx.ellipse(p.x + bw * 0.62 + s * 0.08, yB - s * 0.2, s * 0.075, syT * 0.035, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#5f4426';
        ctx.lineWidth = Math.max(1, s * 0.018);
        ctx.beginPath();
        ctx.arc(p.x + bw * 0.62 + s * 0.08, yB - s * 0.2, s * 0.085, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      } else if (tile === Tile.FruitPress) {
        // THE GREAT SCREW — a press with the frame of a thing
        // that fights fruit and wins: heavy posts, a pegged
        // crossbeam, the threaded screw with its TURN-BAR, the
        // fat staved basket over a spouted tray, and the jug
        // that catches what the season gives.
        const frameC = '#6e5433';
        const sink = working ? s * 0.09 : 0;
        // Posts with foot chocks.
        for (const u of [-1, 1] as const) {
          const fx2 = p.x + u * s * 0.32;
          ctx.fillStyle = shade(frameC, u < 0 ? 4 : -10);
          ctx.fillRect(fx2 - s * 0.07, yB - s * 1.0, s * 0.14, s * 1.0);
          ctx.fillStyle = shade(frameC, 22);
          ctx.fillRect(fx2 - s * 0.07, yB - s * 1.0, s * 0.04, s * 1.0);
          ctx.fillStyle = shade(frameC, -20);
          ctx.fillRect(fx2 - s * 0.11, yB - s * 0.06, s * 0.22, s * 0.06);
        }
        // The crossbeam, pegged into the posts.
        ctx.fillStyle = frameC;
        ctx.fillRect(p.x - s * 0.44, yB - s * 1.1, s * 0.88, s * 0.13);
        ctx.fillStyle = shade(frameC, 22);
        ctx.fillRect(p.x - s * 0.44, yB - s * 1.1, s * 0.88, s * 0.035);
        ctx.fillStyle = shade(frameC, -24);
        for (const u of [-1, 1] as const) {
          ctx.fillRect(p.x + u * s * 0.32 - s * 0.022, yB - s * 1.07, s * 0.044, s * 0.07);
        }
        // The screw: a threaded shaft read as stacked discs,
        // and the TURN-BAR through its head — the press's name.
        ctx.fillStyle = '#5f4426';
        ctx.fillRect(p.x - s * 0.2, yB - s * 1.16, s * 0.4, s * 0.05);
        ctx.fillStyle = shade('#5f4426', 18);
        ctx.fillRect(p.x - s * 0.2, yB - s * 1.16, s * 0.4, s * 0.02);
        for (let d = 0; d < 4; d++) {
          const dy2 = yB - s * 0.97 + d * s * 0.075 + sink * (d / 4);
          ctx.fillStyle = d % 2 ? '#6a4d2a' : '#7d5c33';
          ctx.beginPath();
          ctx.ellipse(p.x, dy2, s * 0.06, s * 0.028, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // Pressing plate on the spindle's foot.
        ctx.fillStyle = shade(frameC, -8);
        ctx.fillRect(p.x - s * 0.16, yB - s * 0.64 + sink, s * 0.32, s * 0.05);
        // The basket: fat staved round, twin hoops.
        const bkw = s * 0.46;
        ctx.fillStyle = '#96703f';
        ctx.beginPath();
        ctx.moveTo(p.x - bkw / 2, yB - s * 0.1);
        ctx.lineTo(p.x - bkw * 0.44, yB - s * 0.58);
        ctx.lineTo(p.x + bkw * 0.44, yB - s * 0.58);
        ctx.lineTo(p.x + bkw / 2, yB - s * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade('#96703f', 16);
        ctx.fillRect(p.x - bkw * 0.42, yB - s * 0.56, s * 0.05, s * 0.44);
        ctx.fillStyle = 'rgba(26, 20, 36, 0.32)';
        for (const u of [-0.12, 0.02, 0.16]) {
          ctx.fillRect(p.x + u * s, yB - s * 0.54, s * 0.02, s * 0.4);
        }
        ctx.fillStyle = '#c9a86a';
        ctx.fillRect(p.x - bkw * 0.47, yB - s * 0.24, bkw * 0.94, s * 0.035);
        ctx.fillRect(p.x - bkw * 0.44, yB - s * 0.5, bkw * 0.88, s * 0.035);
        // The tray: dark, spouted east, the jug catching.
        ctx.fillStyle = '#3a2c18';
        ctx.beginPath();
        ctx.ellipse(p.x, yB - s * 0.045, s * 0.32, syT * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(p.x + s * 0.28, yB - s * 0.09, s * 0.1, s * 0.035);
        ctx.fillStyle = '#a3703c';
        ctx.beginPath();
        ctx.moveTo(p.x + s * 0.4, yB);
        ctx.quadraticCurveTo(p.x + s * 0.36, yB - s * 0.14, p.x + s * 0.44, yB - s * 0.16);
        ctx.quadraticCurveTo(p.x + s * 0.52, yB - s * 0.14, p.x + s * 0.49, yB);
        ctx.closePath();
        ctx.fill();
        if (working) {
          const dr = (t * 1.6 + h * 0.3) % 1;
          ctx.fillStyle = `rgba(216, 150, 60, ${0.85 * (1 - dr)})`;
          ctx.fillRect(p.x + s * 0.36, yB - s * 0.08 + dr * s * 0.06, s * 0.024, s * 0.05);
          ctx.fillStyle = 'rgba(216, 150, 60, 0.55)';
          ctx.beginPath();
          ctx.ellipse(p.x, yB - s * 0.05, s * 0.14, syT * 0.03, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (tile === Tile.BrewKeg) {
        // THE BREWER'S BELLY — the great cask grown to command
        // its cradle: bulged staves, three iron hoops, the head
        // ringed with pegs, a proud brass tap with its hanging
        // mug and catch pail — and the bung breathes foam only
        // while the wort works. Oak reads OAK.
        const oakC = '#6b4a26';
        const kw = s * 0.74;
        const kr = s * 0.27;
        const kcy = yB - s * 0.4;
        // Cradle bolsters with splayed legs.
        ctx.fillStyle = '#4a3520';
        for (const u of [-1, 1] as const) {
          const bx2 = p.x + u * kw * 0.3;
          ctx.fillRect(bx2 - s * 0.085, yB - s * 0.16, s * 0.17, s * 0.05);
          ctx.fillRect(bx2 - s * 0.1 - u * s * 0.02, yB - s * 0.11, s * 0.06, s * 0.11);
          ctx.fillRect(bx2 + s * 0.04 + u * s * 0.02, yB - s * 0.11, s * 0.06, s * 0.11);
          ctx.fillStyle = shade('#4a3520', 14);
          ctx.fillRect(bx2 - s * 0.085, yB - s * 0.16, s * 0.17, s * 0.018);
          ctx.fillStyle = '#4a3520';
        }
        // The belly: bulged silhouette, one path.
        ctx.fillStyle = oakC;
        ctx.beginPath();
        ctx.moveTo(p.x - kw / 2, kcy - kr * 0.8);
        ctx.quadraticCurveTo(p.x, kcy - kr * 1.28, p.x + kw / 2, kcy - kr * 0.8);
        ctx.lineTo(p.x + kw / 2, kcy + kr * 0.8);
        ctx.quadraticCurveTo(p.x, kcy + kr * 1.28, p.x - kw / 2, kcy + kr * 0.8);
        ctx.closePath();
        ctx.fill();
        // Stave seams follow the bulge; crown light on top.
        ctx.fillStyle = 'rgba(26, 20, 36, 0.3)';
        ctx.beginPath();
        ctx.moveTo(p.x - kw * 0.31, kcy - kr * 1.1);
        ctx.quadraticCurveTo(p.x - kw * 0.34, kcy, p.x - kw * 0.31, kcy + kr * 1.1);
        ctx.lineTo(p.x - kw * 0.29, kcy + kr * 1.08);
        ctx.quadraticCurveTo(p.x - kw * 0.32, kcy, p.x - kw * 0.29, kcy - kr * 1.08);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(oakC, 20);
        ctx.beginPath();
        ctx.moveTo(p.x - kw * 0.44, kcy - kr * 0.86);
        ctx.quadraticCurveTo(p.x, kcy - kr * 1.32, p.x + kw * 0.44, kcy - kr * 0.86);
        ctx.lineTo(p.x + kw * 0.4, kcy - kr * 0.68);
        ctx.quadraticCurveTo(p.x, kcy - kr * 1.1, p.x - kw * 0.4, kcy - kr * 0.68);
        ctx.closePath();
        ctx.fill();
        // Three iron hoops riding the bulge.
        ctx.fillStyle = '#3f3a48';
        for (const u of [-0.32, 0, 0.32] as const) {
          const hr2 = kr * (1.02 + (1 - Math.abs(u) * 2.2) * 0.24);
          ctx.fillRect(p.x + u * kw - s * 0.022, kcy - hr2, s * 0.044, hr2 * 2);
        }
        ctx.fillStyle = 'rgba(214, 224, 236, 0.35)';
        for (const u of [-0.32, 0, 0.32] as const) {
          const hr2 = kr * (1.02 + (1 - Math.abs(u) * 2.2) * 0.24);
          ctx.fillRect(p.x + u * kw - s * 0.022, kcy - hr2, s * 0.016, hr2 * 0.5);
        }
        // The head: east face ringed with pegs, tap low.
        ctx.fillStyle = shade(oakC, -14);
        ctx.beginPath();
        ctx.ellipse(p.x + kw / 2 - s * 0.01, kcy, s * 0.055, kr * 0.82, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(oakC, -30);
        for (let d = 0; d < 5; d++) {
          const a = -Math.PI / 2 + d * (Math.PI / 2.5);
          ctx.fillRect(
            p.x + kw / 2 - s * 0.02 + Math.cos(a) * s * 0.028,
            kcy + Math.sin(a) * kr * 0.62 - s * 0.012,
            s * 0.024,
            s * 0.024,
          );
        }
        // The brass tap, the mug on its hook, the pail below.
        ctx.fillStyle = '#c9962e';
        ctx.fillRect(p.x + kw / 2 + s * 0.02, kcy + kr * 0.36, s * 0.09, s * 0.04);
        ctx.fillRect(p.x + kw / 2 + s * 0.08, kcy + kr * 0.36 + s * 0.03, s * 0.028, s * 0.06);
        ctx.fillStyle = '#8a6534';
        ctx.fillRect(p.x + kw / 2 + s * 0.13, kcy + kr * 0.1, s * 0.09, s * 0.11);
        ctx.fillStyle = shade('#8a6534', 18);
        ctx.fillRect(p.x + kw / 2 + s * 0.13, kcy + kr * 0.1, s * 0.09, s * 0.028);
        ctx.fillStyle = '#8a7a58';
        ctx.fillRect(p.x + kw / 2 + s * 0.02, yB - s * 0.15, s * 0.15, s * 0.15);
        // The bung breathes while the wort works.
        ctx.fillStyle = '#4a3520';
        ctx.fillRect(p.x - s * 0.035, kcy - kr * 1.3, s * 0.07, s * 0.05);
        if (working) {
          const bub = (t * 0.9 + h * 0.2) % 1;
          ctx.fillStyle = `rgba(240, 234, 200, ${0.8 * (1 - bub)})`;
          ctx.beginPath();
          ctx.ellipse(p.x, kcy - kr * 1.34 - bub * s * 0.12, s * (0.02 + bub * 0.02), s * (0.016 + bub * 0.014), 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(240, 234, 200, 0.85)';
          ctx.beginPath();
          ctx.ellipse(p.x, kcy - kr * 1.31, s * 0.045, s * 0.02, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (tile === Tile.Smoker) {
        // THE SMOKEHOUSE — a real house for the smoke: stone
        // footing, a planked cabinet at door height, a peaked
        // cap with its collar — the door AJAR on hams in the
        // dark, vents aglow at the skirt, and a thread of
        // smoke standing even at rest (banked coals; the
        // batch thickens it). THE SMOKE IS THE READ.
        const wallC = '#7a6248';
        const smw = s * 0.48;
        const smh = s * 1.0;
        // Stone footing course.
        ctx.fillStyle = '#6f6a58';
        ctx.fillRect(p.x - smw * 0.58, yB - s * 0.12, smw * 1.16, s * 0.12);
        ctx.fillStyle = shade('#6f6a58', 14);
        ctx.fillRect(p.x - smw * 0.58, yB - s * 0.12, smw * 1.16, s * 0.03);
        // The cabinet: planked, west-lit.
        ctx.fillStyle = wallC;
        ctx.fillRect(p.x - smw / 2, yB - smh, smw, smh - s * 0.12);
        ctx.fillStyle = shade(wallC, 16);
        ctx.fillRect(p.x - smw / 2, yB - smh, s * 0.07, smh - s * 0.12);
        ctx.fillStyle = 'rgba(26, 20, 36, 0.28)';
        for (const u of [-0.3, -0.1, 0.12, 0.32]) {
          ctx.fillRect(p.x + u * smw, yB - smh + s * 0.04, s * 0.016, smh - s * 0.2);
        }
        // The peaked cap: foreshortened planes + smoke collar.
        ctx.fillStyle = shade(wallC, -18);
        ctx.beginPath();
        ctx.moveTo(p.x - smw * 0.62, yB - smh);
        ctx.lineTo(p.x, yB - smh - s * 0.22);
        ctx.lineTo(p.x + smw * 0.62, yB - smh);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(wallC, 4);
        ctx.beginPath();
        ctx.moveTo(p.x - smw * 0.62, yB - smh);
        ctx.lineTo(p.x, yB - smh - s * 0.22);
        ctx.lineTo(p.x + s * 0.01, yB - smh - s * 0.19);
        ctx.lineTo(p.x - smw * 0.5, yB - smh + s * 0.02);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#4a4452';
        ctx.fillRect(p.x - s * 0.05, yB - smh - s * 0.3, s * 0.1, s * 0.12);
        ctx.fillStyle = shade('#4a4452', 16);
        ctx.fillRect(p.x - s * 0.05, yB - smh - s * 0.3, s * 0.1, s * 0.028);
        // The door, ajar on the dark — two hams hang inside.
        ctx.fillStyle = '#241a2e';
        ctx.fillRect(p.x - s * 0.13, yB - s * 0.68, s * 0.26, s * 0.56);
        ctx.fillStyle = '#8a4a3a';
        for (const u of [-0.055, 0.05] as const) {
          ctx.beginPath();
          ctx.ellipse(p.x + u * s, yB - s * 0.5, s * 0.045, s * 0.075, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#a3583f';
        }
        ctx.fillStyle = 'rgba(255, 220, 190, 0.25)';
        ctx.fillRect(p.x - s * 0.05, yB - s * 0.56, s * 0.02, s * 0.05);
        // The door leaf swung west, iron-hinged.
        ctx.fillStyle = shade(wallC, -8);
        ctx.fillRect(p.x - s * 0.24, yB - s * 0.7, s * 0.12, s * 0.58);
        ctx.fillStyle = shade(wallC, 10);
        ctx.fillRect(p.x - s * 0.24, yB - s * 0.7, s * 0.028, s * 0.58);
        ctx.fillStyle = '#3f3a48';
        ctx.fillRect(p.x - s * 0.24, yB - s * 0.64, s * 0.05, s * 0.03);
        ctx.fillRect(p.x - s * 0.24, yB - s * 0.24, s * 0.05, s * 0.03);
        // Vent slits at the skirt, coal-lit; the fire never dies.
        const glow = working ? 0.85 : 0.4;
        ctx.fillStyle = `rgba(226, 120, 60, ${glow})`;
        for (const u of [-0.28, -0.06, 0.18]) {
          ctx.fillRect(p.x + u * smw, yB - s * 0.09, s * 0.055, s * 0.03);
        }
        // The smoke: a thread at rest, a standing plume worked.
        const puffs = working ? 4 : 2;
        for (let d = 0; d < puffs; d++) {
          const ph2 = (t * (working ? 0.34 : 0.22) + d / puffs + h * 0.11) % 1;
          const px2 = p.x + Math.sin(ph2 * 5.2 + h) * s * (0.05 + ph2 * 0.1);
          const py2 = yB - smh - s * 0.32 - ph2 * s * (working ? 0.55 : 0.38);
          ctx.fillStyle = `rgba(154, 148, 160, ${(working ? 0.4 : 0.26) * (1 - ph2)})`;
          ctx.beginPath();
          ctx.ellipse(px2, py2, s * (0.05 + ph2 * (working ? 0.1 : 0.06)), s * (0.04 + ph2 * 0.05), 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (tile === Tile.DryingRack) {
        // THE HARVEST FRAME — a rack that is never bare: two
        // A-leg pairs carry a ridge pole and a lower batten,
        // and the harvest HANGS at rest (the wall bundles'
        // own teardrop dialect, THE HANGING WEARS ITS LINE);
        // a batch fills the rails fuller.
        const wood = '#8a6534';
        const rw = s * 0.88;
        const rh = s * 0.95;
        // A-legs, rear pair first, splayed.
        for (const dz of [1, 0] as const) {
          const off = dz ? s * 0.05 : 0;
          const tone = dz ? shade(wood, -16) : wood;
          for (const u of [-1, 1] as const) {
            const lx = p.x + u * rw * 0.44;
            ctx.strokeStyle = tone;
            ctx.lineWidth = Math.max(2, s * 0.055);
            ctx.beginPath();
            ctx.moveTo(lx - u * s * 0.09, yB - off * 1.4);
            ctx.lineTo(lx, yB - rh + off);
            ctx.moveTo(lx + u * s * 0.07, yB - off * 1.4);
            ctx.lineTo(lx, yB - rh + off);
            ctx.stroke();
          }
        }
        // Ridge pole + lower batten, lit arrises.
        ctx.fillStyle = wood;
        ctx.fillRect(p.x - rw / 2, yB - rh, rw, s * 0.055);
        ctx.fillRect(p.x - rw * 0.46, yB - rh * 0.56, rw * 0.92, s * 0.045);
        ctx.fillStyle = '#c9a76a';
        ctx.fillRect(p.x - rw / 2, yB - rh, rw, s * 0.018);
        ctx.fillRect(p.x - rw * 0.46, yB - rh * 0.56, rw * 0.92, s * 0.015);
        // The harvest: heads-down bundles on both rails —
        // always dressed; the batch adds the fourth and the
        // seed string.
        const heads: Array<readonly [number, number, number, string, string]> = [
          [-0.3, rh, 0.3, HRB_SAGE_DEEP, HRB_SAGE],
          [0.05, rh, 0.34, shade(TRD_HERB, -10), '#6f9450'],
          [0.34, rh, 0.28, shade(TRD_HERB_DRY, -12), TRD_HERB_DRY],
          [-0.12, rh * 0.56, 0.26, '#8a6f30', '#a8823f'],
          [0.2, rh * 0.56, 0.24, HRB_MOON_DEEP, HRB_MOON],
        ];
        if (working) heads.push([-0.34, rh * 0.56, 0.28, shade(TRD_HERB, -14), TRD_HERB]);
        for (const [u, rail, hl, lo, hi] of heads) {
          const hx2 = p.x + u * rw;
          const hy2 = yB - rail + s * 0.06;
          const len2 = s * hl;
          ctx.strokeStyle = lo;
          ctx.lineWidth = Math.max(1.2, s * 0.016);
          ctx.beginPath();
          ctx.moveTo(hx2 - s * 0.02, hy2);
          ctx.lineTo(hx2 - s * 0.035, hy2 + len2 * 0.4);
          ctx.moveTo(hx2 + s * 0.02, hy2);
          ctx.lineTo(hx2 + s * 0.03, hy2 + len2 * 0.4);
          ctx.stroke();
          const headP = new Path2D();
          headP.moveTo(hx2, hy2 + len2 * 0.34);
          headP.quadraticCurveTo(hx2 - s * 0.07, hy2 + len2 * 0.75, hx2 - s * 0.026, hy2 + len2);
          headP.quadraticCurveTo(hx2, hy2 + len2 * 1.12, hx2 + s * 0.026, hy2 + len2);
          headP.quadraticCurveTo(hx2 + s * 0.07, hy2 + len2 * 0.75, hx2, hy2 + len2 * 0.34);
          headP.closePath();
          ctx.fillStyle = lo;
          ctx.fill(headP);
          ctx.fillStyle = hi;
          ctx.beginPath();
          ctx.ellipse(hx2 - s * 0.014, hy2 + len2 * 0.72, s * 0.022, len2 * 0.24, 0.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = STRUCT_OUTLINE;
          ctx.lineWidth = Math.max(1, s * 0.022);
          ctx.stroke(headP);
          ctx.strokeStyle = TWN_ROPE;
          ctx.lineWidth = Math.max(1, s * 0.014);
          ctx.beginPath();
          ctx.ellipse(hx2, hy2 + s * 0.01, s * 0.016, s * 0.018, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        // The cuttings basket at the west foot.
        ctx.fillStyle = '#a88f5c';
        ctx.beginPath();
        ctx.moveTo(p.x - rw * 0.5, yB);
        ctx.lineTo(p.x - rw * 0.47, yB - s * 0.14);
        ctx.lineTo(p.x - rw * 0.31, yB - s * 0.14);
        ctx.lineTo(p.x - rw * 0.28, yB);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = HRB_SAGE;
        ctx.beginPath();
        ctx.ellipse(p.x - rw * 0.39, yB - s * 0.15, s * 0.055, s * 0.028, 0.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // THE SKEP ON ITS STAND — the apiary reads BEE from
        // across the meadow: coiled straw courses to a dome,
        // the dark doorway on its landing board, bees on the
        // hive's own clock (it never stops), and the blossom
        // tuft the grading law smells for.
        const straw = '#c9a86a';
        const standY = yB - s * 0.34;
        // The stand: four short legs, a foreshortened plank top.
        ctx.fillStyle = '#5f4426';
        for (const u of [-1, 1] as const) {
          ctx.fillRect(p.x + u * s * 0.2 - s * 0.03, standY, s * 0.06, yB - standY);
          ctx.fillRect(p.x + u * s * 0.26 - s * 0.03, standY + syT * 0.06, s * 0.06, yB - standY - syT * 0.06);
        }
        ctx.fillStyle = '#8a6534';
        ctx.fillRect(p.x - s * 0.3, standY - s * 0.05, s * 0.6, s * 0.05);
        ctx.fillStyle = '#c9a76a';
        ctx.fillRect(p.x - s * 0.3, standY - s * 0.05, s * 0.6, s * 0.018);
        // The skep: coiled courses, narrowing to the crown.
        const courses: Array<readonly [number, number]> = [
          [0.26, 0.09], [0.24, 0.2], [0.2, 0.31], [0.14, 0.4], [0.07, 0.46],
        ];
        for (const [cw2, ch2] of courses) {
          ctx.fillStyle = straw;
          ctx.beginPath();
          ctx.ellipse(p.x, standY - s * 0.05 - s * ch2, s * cw2, s * 0.075, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = shade(straw, -16);
          ctx.beginPath();
          ctx.ellipse(p.x, standY - s * 0.05 - s * ch2 + s * 0.045, s * cw2 * 0.96, s * 0.028, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // West light on the dome's cheek.
        ctx.fillStyle = 'rgba(255, 240, 200, 0.28)';
        ctx.beginPath();
        ctx.ellipse(p.x - s * 0.12, standY - s * 0.32, s * 0.06, s * 0.16, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // The doorway and its landing board.
        ctx.fillStyle = '#241a2e';
        ctx.beginPath();
        ctx.ellipse(p.x, standY - s * 0.12, s * 0.05, s * 0.06, 0, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = shade('#8a6534', 12);
        ctx.fillRect(p.x - s * 0.07, standY - s * 0.05, s * 0.14, s * 0.03);
        // Bees on the hive's own clock — never still.
        ctx.fillStyle = '#e0b23a';
        for (let d = 0; d < 3; d++) {
          const ph2 = t * (0.5 + d * 0.13) + h * 0.37 + d * 2.1;
          const bx2 = p.x + Math.cos(ph2) * s * (0.24 + d * 0.07);
          const by2 = standY - s * 0.28 + Math.sin(ph2 * 1.7) * s * 0.14;
          ctx.fillRect(bx2, by2, s * 0.024, s * 0.018);
        }
        // The blossom tuft the grade smells for.
        ctx.fillStyle = HRB_SAGE;
        ctx.beginPath();
        ctx.ellipse(p.x + s * 0.34, yB - s * 0.045, s * 0.07, s * 0.04, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c4808a';
        for (const [fx2, fy2] of [[0.3, 0.1], [0.37, 0.075], [0.33, 0.045]] as const) {
          ctx.fillRect(p.x + fx2 * s, yB - fy2 * s, s * 0.022, s * 0.022);
        }
      }
    },
  };
}

export const FARM_PROPS: PropEntries = [
  [[Tile.CropSprout, Tile.CarrotMid, Tile.CarrotRipe, Tile.SagewortMid, Tile.SagewortRipe, Tile.SunflowerMid, Tile.SunflowerRipe, Tile.WheatMid, Tile.WheatRipe, Tile.CottonMid, Tile.CottonRipe, Tile.MoonbellMid, Tile.MoonbellRipe, Tile.PotatoMid, Tile.PotatoRipe, Tile.OnionMid, Tile.OnionRipe, Tile.CabbageMid, Tile.CabbageRipe, Tile.PumpkinMid, Tile.PumpkinRipe, Tile.BarleyMid, Tile.BarleyRipe, Tile.RedrootMid, Tile.RedrootRipe, Tile.KingsquashMid, Tile.KingsquashRipe, Tile.BittercressMid, Tile.BittercressRipe, Tile.SilverleafMid, Tile.SilverleafRipe, Tile.DuskthornMid, Tile.DuskthornRipe, Tile.DawnveilMid, Tile.DawnveilRipe, Tile.AdderstongueMid, Tile.AdderstongueRipe, Tile.AppleTreeMid, Tile.AppleTreeRipe, Tile.BrambleMid, Tile.BrambleRipe, Tile.PlumTreeMid, Tile.PlumTreeRipe, Tile.MirefigMid, Tile.MirefigRipe, Tile.MushroomLogSeeded, Tile.PalegillMid, Tile.PalegillRipe, Tile.GrowingFrame], paintCropSprout],
  [[Tile.BerryBush, Tile.FibrePlant, Tile.WildSagewort, Tile.WildMoonbell], paintBerryBush],
  [[Tile.Alembic], paintAlembic],
  [[Tile.TanningRack], paintTanningRack],
  [[Tile.Loom], paintLoom],
  [[Tile.CarvingBench], paintCarvingBench],
  [[Tile.BeastPen], paintBeastPen],
  [[Tile.CompostBin], paintCompostBin],
  [[Tile.FeedTrough], paintFeedTrough],
  [[Tile.Windmill], paintWindmill],
  [[Tile.Scarecrow, Tile.HayBale, Tile.Silo, Tile.Dovecote, Tile.ButterChurn, Tile.FruitPress, Tile.BrewKeg, Tile.Smoker, Tile.DryingRack, Tile.Apiary], paintScarecrow],
];
