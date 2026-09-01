/**
 * THE WORKING BENCHES — wells, anvils, furnaces, chests, counters: the stations.
 * Extracted verbatim from renderer.ts's objectItem (THE PROP HALL,
 * foundations F1) — each painter is one former switch case; the frame
 * and host contracts live in ./types.ts.
 */
import { packTile } from '../interiors.js';
import { TWN_IRON, TWN_OAK_LIT, TWN_ROPE } from '../paintVocab.js';
import { shade } from '../rig.js';
import { chamferRect, facetBlob, facetCircle } from '../shapes.js';
import { TWN_STONE_DARK } from './palette.js';
import { Tile, chestInfo, hashCoords } from '@arx/shared';
import type { DrawItem } from '../renderer.js';
import type { PropEntries, PropFrame, PropHost } from './types.js';


function paintWell(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  // THE DRAWN WATER — the well recut from the ground up (user
  // verdict: the old ring was a flat-front rectangle wearing a
  // side-elevation gable, one identical well for every town).
  // The ring is now a TRUE CYLINDER under this camera — the
  // mouth a foreshortened ellipse the camera looks INTO (far
  // inner wall showing as a crescent, the water sunk below it,
  // glint drifting, a ripple ring widening off the last drop)
  // — and THE HASH DEALS THE WELL: masonry or a scavenged
  // iron-banded timber crib for the ring, and three tops (the
  // roofed gantry, the bare weathered windlass, the open ring
  // with its parked pail and dealt half-lid), so no two yards
  // — town, farm, or war camp — draw from the same well twice.
  const yB = p.y + syT * 0.42;
  const ringR = s * 0.46;
  const ery = ringR * 0.36;
  const wallH = s * 0.55;
  const ringTop = yB - wallH;
  const stone = ((h >>> 5) & 7) < 5;
  const tv = (h >>> 2) % 3; // 0 roofed gantry, 1 bare windlass, 2 open ring
  const lid = tv === 2 && ((h >>> 9) & 1) === 0;
  const matC = stone ? '#6e6a75' : '#7d5f36';
  const capC = stone ? shade('#6e6a75', 20) : shade('#7d5f36', 16);
  const timberC = '#7d5a2e';
  const postT = ringTop - s * 1.0;
  return {
    sortY: ty + 0.85,
    body: stationBody(0.9, 2.0, 0.6),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - ringR, yB + syT * 0.05, p.x + ringR, yB + syT * 0.05, 0.6);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // Damp ground ring + the spill puddle on the dealt side:
      // a filling place never dries.
      ctx.fillStyle = 'rgba(64, 82, 108, 0.2)';
      ctx.beginPath();
      ctx.ellipse(p.x, yB + syT * 0.04, ringR * 1.35, syT * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      const spillM = ((h >>> 7) & 1) ? 1 : -1;
      ctx.fillStyle = 'rgba(58, 78, 104, 0.35)';
      ctx.beginPath();
      ctx.ellipse(p.x + spillM * ringR * 0.9, yB + syT * 0.12, ringR * 0.34, syT * 0.09, spillM * 0.3, 0, Math.PI * 2);
      ctx.fill();
      // The cobble apron: a few set stones where every boot
      // lands — hash-scattered, never a paved ring.
      for (let k = 0; k < 3; k++) {
        const aa = ((h >>> (k * 3 + 1)) & 7) * 0.785 + 0.6;
        const ax = p.x + Math.cos(aa) * ringR * (1.15 + ((h >>> (k * 2)) & 1) * 0.14);
        const ay = yB + syT * 0.06 + Math.sin(aa) * syT * 0.1;
        ctx.fillStyle = shade(TWN_STONE_DARK, (((h >>> (k * 4)) & 3) - 1) * 6);
        ctx.beginPath();
        facetBlob(ctx, ax, ay, s * 0.05, h ^ (k * 37), 5, 0.62);
        ctx.fill();
      }
      // THE RING WALL: a cylinder — straight flanks closed by
      // the bottom's forward bow, the cap ellipse above.
      ctx.fillStyle = matC;
      ctx.beginPath();
      ctx.moveTo(p.x - ringR, ringTop);
      ctx.lineTo(p.x - ringR, yB - s * 0.02);
      ctx.quadraticCurveTo(p.x, yB + ery * 0.62, p.x + ringR, yB - s * 0.02);
      ctx.lineTo(p.x + ringR, ringTop);
      ctx.closePath();
      ctx.fill();
      // The turned form: west sun lane, east shade, both
      // running the wall's full height.
      ctx.fillStyle = shade(matC, 12);
      ctx.fillRect(p.x - ringR * 0.92, ringTop + s * 0.02, ringR * 0.3, wallH - s * 0.02);
      ctx.fillStyle = shade(matC, -14);
      ctx.beginPath();
      ctx.moveTo(p.x + ringR * 0.55, ringTop + s * 0.02);
      ctx.lineTo(p.x + ringR * 0.55, yB - s * 0.035);
      ctx.quadraticCurveTo(p.x + ringR * 0.8, yB + ery * 0.28, p.x + ringR, yB - s * 0.02);
      ctx.lineTo(p.x + ringR, ringTop + s * 0.02);
      ctx.closePath();
      ctx.fill();
      if (stone) {
        // COURSED FIELDSTONE: two ranks of blocks, mortar
        // struck dark, widths and tones off the hash so no
        // two rings course alike (a shrine is a cairn
        // somebody squared — jitter or it reads window-frame).
        ctx.strokeStyle = 'rgba(26, 20, 36, 0.42)';
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(p.x - ringR + s * 0.02, ringTop + wallH * 0.48);
        ctx.quadraticCurveTo(p.x, ringTop + wallH * 0.48 + ery * 0.5, p.x + ringR - s * 0.02, ringTop + wallH * 0.46);
        ctx.stroke();
        for (let i = 0; i < 7; i++) {
          const row = i < 4 ? 0 : 1;
          const n = row === 0 ? 4 : 3;
          const j = row === 0 ? i : i - 4;
          const fx = -0.78 + (j + 0.5) * (1.56 / n) + (((h >>> (i * 3)) & 3) - 1.5) * 0.05;
          const y0 = ringTop + wallH * (row === 0 ? 0.1 : 0.52);
          const y1 = ringTop + wallH * (row === 0 ? 0.44 : 0.9);
          ctx.beginPath();
          ctx.moveTo(p.x + fx * ringR, y0 + fx * fx * ery * 0.3);
          ctx.lineTo(p.x + fx * ringR * 0.98, y1 + fx * fx * ery * 0.35);
          ctx.stroke();
        }
        // Two blocks catch the sun a shade brighter.
        ctx.fillStyle = 'rgba(214, 210, 222, 0.14)';
        ctx.fillRect(p.x - ringR * 0.55, ringTop + wallH * 0.12, ringR * 0.34, wallH * 0.3);
        ctx.fillRect(p.x + ringR * 0.05, ringTop + wallH * 0.55, ringR * 0.3, wallH * 0.3);
        // Moss at the shaded damp footing.
        ctx.fillStyle = 'rgba(96, 122, 74, 0.7)';
        ctx.beginPath();
        ctx.ellipse(p.x - ringR * 0.72, yB - s * 0.045, s * 0.055, s * 0.028, 0.2, 0, Math.PI * 2);
        ctx.ellipse(p.x - ringR * 0.2, yB + s * 0.015, s * 0.045, s * 0.022, -0.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // THE SCAVENGED CRIB: vertical staves lashed with the
        // smith's two bands (the standing-hoop law bows them
        // down the belly) — the well a war camp digs first
        // and dresses never.
        ctx.strokeStyle = 'rgba(46, 32, 14, 0.5)';
        ctx.lineWidth = Math.max(1, s * 0.014);
        for (const f of [-0.62, -0.28, 0.08, 0.42, 0.74]) {
          ctx.beginPath();
          ctx.moveTo(p.x + f * ringR, ringTop + s * 0.03 + f * f * ery * 0.3);
          ctx.lineTo(p.x + f * ringR * 0.98, yB - s * 0.03 + f * f * ery * 0.4);
          ctx.stroke();
        }
        // One stave stands proud of the rim — driven, not
        // sawn: the scavenger's tell.
        const pf = ((h >>> 8) & 1) ? -0.45 : 0.25;
        ctx.fillStyle = shade(matC, -6);
        ctx.fillRect(p.x + pf * ringR - s * 0.035, ringTop - s * 0.07, s * 0.07, s * 0.09);
        ctx.fillStyle = shade(matC, 10);
        ctx.fillRect(p.x + pf * ringR - s * 0.035, ringTop - s * 0.07, s * 0.024, s * 0.09);
        for (const fh of [0.26, 0.72] as const) {
          const wk = ringR * 0.99;
          rend.paintStandingHoop(p.x, ringTop + wallH * fh, wk, ery * 0.34, s);
        }
      }
      // THE MOUTH: cap ring, the dark throat, the far inner
      // wall's crescent, and the water the whole prop is for.
      ctx.fillStyle = capC;
      ctx.beginPath();
      ctx.ellipse(p.x, ringTop, ringR * 1.04, ery, 0, 0, Math.PI * 2);
      ctx.fill();
      // The cap's south face keeps a thin under-shadow so the
      // slab reads as a course, not paint.
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1, s * 0.018);
      ctx.beginPath();
      ctx.ellipse(p.x, ringTop + s * 0.012, ringR * 1.03, ery, 0, 0.35, Math.PI - 0.35);
      ctx.stroke();
      // Cap joints: the ring is BUILT even on top.
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.3)';
      ctx.lineWidth = Math.max(1, s * 0.014);
      for (const ja of [0.6, 2.2, 3.6, 5.1]) {
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(ja) * ringR * 0.76, ringTop + Math.sin(ja) * ery * 0.76);
        ctx.lineTo(p.x + Math.cos(ja) * ringR * 1.02, ringTop + Math.sin(ja) * ery * 1.0);
        ctx.stroke();
      }
      // THE MOUTH MODULE (user verdict, round two: the dealt
      // sink OFFSET centered some wells and not others). One
      // anchor — the throat's own center — and every internal
      // draws CONCENTRIC to it: crescent, water, glint, ripple.
      // Depth is dealt by SCALE (a lower water is a smaller
      // disc in a wider dark margin), never by displacement,
      // so the whole mouth swaps as a module with no per-
      // variant nudging.
      const tcx = p.x;
      const tcy = ringTop + s * 0.012;
      const deep = ((h >>> 11) & 3) / 3; // 0 brimming .. 1 low
      // THE SHAFT IS A WALL, NOT A VOID (user round three: the
      // flat near-black throat read as a black hole wherever
      // the water disc was dealt small). The descent is drawn
      // as STEPPED WALL RINGS — the ring's own material walked
      // darker, concentric to the anchor — down to one thin
      // true-shadow line at the waterline. Depth still deals
      // by scale; the eye now reads masonry sinking to water.
      ctx.fillStyle = shade(matC, -24);
      ctx.beginPath();
      ctx.ellipse(tcx, tcy, ringR * 0.72, ery * 0.74, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(matC, -34);
      ctx.beginPath();
      ctx.ellipse(tcx, tcy, ringR * 0.66, ery * 0.66, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(matC, -44);
      ctx.beginPath();
      ctx.ellipse(tcx, tcy, ringR * 0.6, ery * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
      // The far inner wall's top catches what sky reaches in.
      ctx.strokeStyle = 'rgba(198, 204, 216, 0.18)';
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.ellipse(tcx, tcy + s * 0.004, ringR * 0.7, ery * 0.72, 0, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
      // THE WATER: concentric in the shaft, its size the
      // depth — one thin waterline shadow, dark base, a truer
      // blue heart, the drifting sky glint, a ripple ring off
      // the last drop.
      const wR = ringR * (0.585 - deep * 0.045);
      const wRy = ery * (0.51 - deep * 0.04);
      ctx.fillStyle = '#16121c';
      ctx.beginPath();
      ctx.ellipse(tcx, tcy, wR + s * 0.022, wRy + s * 0.016, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22384e';
      ctx.beginPath();
      ctx.ellipse(tcx, tcy, wR, wRy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c4a6e';
      ctx.beginPath();
      ctx.ellipse(tcx, tcy, wR * 0.78, wRy * 0.74, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(160, 196, 232, 0.5)';
      ctx.beginPath();
      ctx.ellipse(
        tcx + Math.sin(t * 0.7 + h) * wR * 0.38,
        tcy,
        wR * 0.24,
        wRy * 0.2,
        0, 0, Math.PI * 2,
      );
      ctx.fill();
      const rp = (t * 0.32 + ((h >>> 3) & 3) * 0.25) % 1;
      ctx.strokeStyle = `rgba(150, 186, 220, ${(0.4 * (1 - rp)).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.ellipse(tcx, tcy, wR * (0.25 + rp * 0.72), wRy * (0.25 + rp * 0.72), 0, 0, Math.PI * 2);
      ctx.stroke();
      // THE PAIL, one small painter parked or hung: staves, a
      // rim band, the bail arc — edged in its own thin dark
      // line (clipped to what it laps, never the open air).
      const pail = (bx: number, by: number, sway: number) => {
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(sway);
        ctx.fillStyle = shade(timberC, -6);
        ctx.beginPath();
        ctx.moveTo(-s * 0.075, -s * 0.115);
        ctx.lineTo(s * 0.075, -s * 0.115);
        ctx.lineTo(s * 0.058, s * 0.02);
        ctx.lineTo(-s * 0.058, s * 0.02);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(timberC, 12);
        ctx.beginPath();
        ctx.moveTo(-s * 0.075, -s * 0.115);
        ctx.lineTo(-s * 0.028, -s * 0.115);
        ctx.lineTo(-s * 0.02, s * 0.02);
        ctx.lineTo(-s * 0.058, s * 0.02);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#2c3140';
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.115, s * 0.075, s * 0.026, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22384e';
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.113, s * 0.058, s * 0.019, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = TWN_IRON;
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(-s * 0.062, -s * 0.03);
        ctx.lineTo(s * 0.062, -s * 0.03);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(26, 20, 36, 0.55)';
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(-s * 0.075, -s * 0.11);
        ctx.lineTo(-s * 0.058, s * 0.02);
        ctx.lineTo(s * 0.058, s * 0.02);
        ctx.lineTo(s * 0.075, -s * 0.11);
        ctx.stroke();
        ctx.strokeStyle = shade(TWN_IRON, 10);
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.beginPath();
        ctx.arc(0, -s * 0.1, s * 0.078, -Math.PI * 0.92, -Math.PI * 0.08);
        ctx.stroke();
        ctx.restore();
      };
      if (tv < 2) {
        // THE GANTRY: two squared posts seated on the cap's
        // flanks — lit west arris, pegged feet — carrying the
        // WINDLASS: a true roller cylinder whose rope wraps
        // read as vertical coils (the lying-hoop law), the
        // crank dropped at rest on the east.
        for (const m of [-1, 1] as const) {
          const px2 = p.x + m * ringR * 0.84;
          ctx.fillStyle = shade(timberC, -12);
          ctx.fillRect(px2 - s * 0.05, postT, s * 0.1, ringTop - postT + ery * (m < 0 ? 0.5 : 0.3));
          ctx.fillStyle = shade(timberC, 16);
          ctx.fillRect(px2 - s * 0.05, postT, s * 0.036, ringTop - postT + ery * (m < 0 ? 0.5 : 0.3));
          ctx.fillStyle = 'rgba(58, 40, 20, 0.8)';
          ctx.beginPath();
          ctx.ellipse(px2, ringTop + ery * (m < 0 ? 0.28 : 0.1), s * 0.013, s * 0.011, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // The roller between the posts.
        const rollY = postT + s * 0.16;
        ctx.fillStyle = shade(timberC, -4);
        ctx.fillRect(p.x - ringR * 0.8, rollY - s * 0.055, ringR * 1.6, s * 0.11);
        ctx.fillStyle = shade(timberC, 10);
        ctx.fillRect(p.x - ringR * 0.8, rollY - s * 0.055, ringR * 1.6, s * 0.036);
        for (const m of [-1, 1] as const) {
          ctx.fillStyle = shade(timberC, -18);
          ctx.beginPath();
          ctx.ellipse(p.x + m * ringR * 0.8, rollY, s * 0.032, s * 0.058, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // The rope wound on the roller: coils as vertical
        // bands, never rings on a lying cylinder.
        ctx.strokeStyle = TWN_ROPE;
        ctx.lineWidth = Math.max(1, s * 0.018);
        for (let k = 0; k < 4; k++) {
          const cxk = p.x - s * 0.05 + k * s * 0.026;
          ctx.beginPath();
          ctx.moveTo(cxk, rollY - s * 0.055);
          ctx.lineTo(cxk + s * 0.004, rollY + s * 0.055);
          ctx.stroke();
        }
        // The crank: iron drop-arm and worn grip, at rest.
        ctx.strokeStyle = TWN_IRON;
        ctx.lineWidth = Math.max(1.5, s * 0.024);
        ctx.beginPath();
        ctx.moveTo(p.x + ringR * 0.84, rollY);
        ctx.lineTo(p.x + ringR * 1.02, rollY + s * 0.1);
        ctx.stroke();
        ctx.fillStyle = TWN_OAK_LIT;
        ctx.fillRect(p.x + ringR * 1.02 - s * 0.016, rollY + s * 0.1, s * 0.032, s * 0.085);
        // The rope down the shaft: it ENTERS the dark — the
        // read that the water is far below.
        const sway = tv === 0 ? Math.sin(t * 0.8 + tx * 1.3 + ty * 0.9) * 0.045 : 0;
        const dropX = p.x - s * 0.037;
        if (tv === 0) {
          // Roofed gantry: the pail hangs mid-draw.
          const hangY = ringTop - s * 0.18;
          ctx.strokeStyle = TWN_ROPE;
          ctx.lineWidth = Math.max(1, s * 0.018);
          ctx.beginPath();
          ctx.moveTo(dropX, rollY + s * 0.05);
          ctx.quadraticCurveTo(dropX + sway * s * 2.2, (rollY + hangY) / 2, dropX + sway * s * 4, hangY - s * 0.1);
          ctx.stroke();
          pail(dropX + sway * s * 4, hangY, sway * 0.8);
        } else {
          // Bare windlass: rope run out, pail parked on the
          // rim where the last hand left it.
          ctx.strokeStyle = TWN_ROPE;
          ctx.lineWidth = Math.max(1, s * 0.018);
          ctx.beginPath();
          ctx.moveTo(dropX, rollY + s * 0.05);
          ctx.lineTo(dropX - ringR * 0.32, ringTop - s * 0.02);
          ctx.stroke();
          pail(p.x - ringR * 0.44, ringTop - ery * 0.1, 0);
          // The rope's slack coiled on the cap (coils, never
          // loops).
          ctx.strokeStyle = TWN_ROPE;
          ctx.lineWidth = Math.max(1, s * 0.016);
          ctx.beginPath();
          ctx.ellipse(p.x - ringR * 0.42, ringTop + ery * 0.42, s * 0.055, s * 0.024, 0.1, 0, Math.PI * 1.7);
          ctx.stroke();
        }
        // Rope-wear: the cap's south rim polished pale where
        // the draw always rides.
        ctx.strokeStyle = 'rgba(226, 222, 232, 0.35)';
        ctx.lineWidth = Math.max(1, s * 0.02);
        ctx.beginPath();
        ctx.ellipse(p.x, ringTop, ringR * 0.74, ery * 0.76, 0, Math.PI * 0.42, Math.PI * 0.58);
        ctx.stroke();
      }
      if (tv === 0) {
        // THE ROOF: two true pitches and the foreshortened
        // ridge plane (the bell-cap law) — shakes seamed down
        // the south faces, wide enough to keep rain out of
        // the draw.
        const roofY = postT - s * 0.07;
        ctx.fillStyle = shade(timberC, -18);
        ctx.beginPath();
        ctx.moveTo(p.x - ringR * 1.18, roofY + s * 0.2);
        ctx.lineTo(p.x, roofY - s * 0.22);
        ctx.lineTo(p.x + ringR * 1.18, roofY + s * 0.2);
        ctx.lineTo(p.x + ringR * 1.0, roofY + s * 0.3);
        ctx.lineTo(p.x, roofY - s * 0.1);
        ctx.lineTo(p.x - ringR * 1.0, roofY + s * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(timberC, 14);
        ctx.beginPath();
        ctx.moveTo(p.x - ringR * 1.0, roofY + s * 0.3);
        ctx.lineTo(p.x, roofY - s * 0.1);
        ctx.lineTo(p.x + ringR * 1.0, roofY + s * 0.3);
        ctx.lineTo(p.x + ringR * 0.84, roofY + s * 0.37);
        ctx.lineTo(p.x, roofY - s * 0.035);
        ctx.lineTo(p.x - ringR * 0.84, roofY + s * 0.37);
        ctx.closePath();
        ctx.fill();
        // Shake seams down the near pitch.
        ctx.strokeStyle = 'rgba(46, 32, 14, 0.4)';
        ctx.lineWidth = Math.max(1, s * 0.012);
        for (const f of [-0.66, -0.33, 0.33, 0.66]) {
          ctx.beginPath();
          ctx.moveTo(p.x + f * ringR * 0.95, roofY + s * 0.35 - Math.abs(f) * s * 0.0 + (Math.abs(f) - 1) * s * -0.0);
          ctx.moveTo(p.x + f * ringR * 0.95, roofY + s * 0.34);
          ctx.lineTo(p.x + f * ringR * 0.6, roofY + s * 0.1 - (1 - Math.abs(f)) * s * 0.12);
          ctx.stroke();
        }
      }
      if (tv === 2) {
        // THE OPEN RING: no gantry — the pail parked on the
        // rim, its rope coiled beside it, and half the mouth
        // dealt a plank lid (kept, or drawn clean off).
        if (lid) {
          ctx.fillStyle = shade(timberC, 2);
          ctx.beginPath();
          ctx.ellipse(p.x, ringTop + s * 0.004, ringR * 0.73, ery * 0.75, 0, Math.PI, Math.PI * 2);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = shade(timberC, 14);
          ctx.beginPath();
          ctx.ellipse(p.x, ringTop - s * 0.006, ringR * 0.7, ery * 0.7, 0, Math.PI * 1.02, Math.PI * 1.98);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(46, 32, 14, 0.5)';
          ctx.lineWidth = Math.max(1, s * 0.012);
          for (const f of [-0.42, 0, 0.4]) {
            ctx.beginPath();
            ctx.moveTo(p.x + f * ringR * 0.7, ringTop - s * 0.004 - Math.sqrt(Math.max(0, 1 - f * f)) * ery * 0.1);
            ctx.lineTo(p.x + f * ringR * 0.66, ringTop - ery * 0.68 * Math.sqrt(Math.max(0.05, 1 - f * f)));
            ctx.stroke();
          }
          // The lid's grab rope, a short loop lying flat.
          ctx.strokeStyle = TWN_ROPE;
          ctx.lineWidth = Math.max(1, s * 0.014);
          ctx.beginPath();
          ctx.ellipse(p.x + ringR * 0.1, ringTop - ery * 0.4, s * 0.03, s * 0.014, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        pail(p.x + ringR * 0.46, ringTop + ery * 0.28, 0);
        ctx.strokeStyle = TWN_ROPE;
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.beginPath();
        ctx.ellipse(p.x + ringR * 0.14, ringTop + ery * 0.55, s * 0.06, s * 0.026, -0.15, 0, Math.PI * 1.75);
        ctx.stroke();
      }
    },
  };
}

function paintSawhorse(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  // The sawyer's stand: two X-trestles at the hip, a whole log
  // racked across them mid-rip, the saw parked upright in its
  // kerf, a fresh stack of boards by the west legs and sawdust
  // drifted under the cut — the station reads as work
  // interrupted, never as furniture.
  const xL = p.x - s * 0.5;
  const xR = p.x + s * 0.5;
  const yB = p.y + syT * 0.42;
  const barkC = '#7a5329';
  const sawnC = '#b5854f';
  const legC = '#5b4028';
  const logMid = yB - s * 0.48; // the racked log's midline: hip height
  const logR = s * 0.155;
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
      // Contact shade under the whole stand.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.fillRect(xL + s * 0.04, yB + s * 0.005, xR - xL - s * 0.08, s * 0.04);
      // X-trestles: a shadowed rear leg and a lit fore leg so
      // the crossing reads in depth, feet planted wide, and a
      // saddle block where the log rides.
      const trestle = (cx: number) => {
        const top = logMid + logR * 0.5;
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(2.6, s * 0.078);
        ctx.strokeStyle = shade(legC, -12);
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.14, yB - s * 0.03);
        ctx.lineTo(cx + s * 0.1, top);
        ctx.stroke();
        ctx.strokeStyle = legC;
        ctx.beginPath();
        ctx.moveTo(cx + s * 0.14, yB);
        ctx.lineTo(cx - s * 0.1, top);
        ctx.stroke();
        ctx.lineCap = 'butt';
        ctx.fillStyle = shade(legC, 8);
        ctx.fillRect(cx - s * 0.085, top - s * 0.02, s * 0.17, s * 0.045);
      };
      trestle(xL + s * 0.18);
      trestle(xR - s * 0.18);
      // The racked log, overhanging both trestles: bark barrel
      // with a sky-lit top band (the 2.5D top-plane law), a
      // belly shadow, and a sawn end disc facing the camera side.
      const lx0 = xL - s * 0.06;
      const lx1 = xR + s * 0.06;
      ctx.fillStyle = barkC;
      ctx.beginPath();
      ctx.roundRect(lx0, logMid - logR, lx1 - lx0, logR * 2, logR * 0.9);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.55)';
      ctx.lineWidth = Math.max(1.4, s * 0.032);
      ctx.stroke();
      ctx.fillStyle = shade(barkC, 22);
      ctx.fillRect(lx0 + s * 0.05, logMid - logR + s * 0.012, lx1 - lx0 - s * 0.1, logR * 0.55);
      ctx.fillStyle = 'rgba(26, 16, 8, 0.3)';
      ctx.fillRect(lx0 + s * 0.04, logMid + logR - s * 0.045, lx1 - lx0 - s * 0.08, s * 0.035);
      // One long grain streak, hash-jittered per stand.
      ctx.strokeStyle = shade(barkC, -14);
      ctx.lineWidth = Math.max(1, s * 0.018);
      ctx.beginPath();
      ctx.moveTo(lx0 + s * 0.12, logMid + s * ((h % 5) * 0.008));
      ctx.quadraticCurveTo(p.x, logMid + s * 0.03, lx1 - s * 0.18, logMid - s * 0.01);
      ctx.stroke();
      // Sawn end disc on the east tip: growth rings drifted
      // off-centre — never machined-concentric.
      ctx.fillStyle = shade(sawnC, 30);
      ctx.beginPath();
      ctx.ellipse(lx1 - s * 0.012, logMid, s * 0.045, logR * 0.92, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shade(sawnC, -18);
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.ellipse(lx1 - s * 0.014, logMid + s * 0.01, s * 0.026, logR * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      // THE KERF: the rip already run from the east end to just
      // past centre — a dark true line with a pale fresh-sawn
      // shoulder under it, and the freed board's leading edge
      // sagging a whisker below the log's belly.
      const kx = p.x - s * 0.04;
      ctx.strokeStyle = 'rgba(30, 18, 8, 0.75)';
      ctx.lineWidth = Math.max(1.2, s * 0.024);
      ctx.beginPath();
      ctx.moveTo(kx, logMid - s * 0.012);
      ctx.lineTo(lx1 - s * 0.02, logMid + s * 0.004);
      ctx.stroke();
      ctx.fillStyle = shade(sawnC, 16);
      ctx.beginPath();
      ctx.moveTo(kx, logMid + s * 0.012);
      ctx.lineTo(lx1 - s * 0.02, logMid + s * 0.028);
      ctx.lineTo(lx1 - s * 0.02, logMid + logR * 0.9 + s * 0.05);
      ctx.lineTo(kx + s * 0.06, logMid + logR * 0.9 + s * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.3)';
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.stroke();
      // The rip saw parked in the kerf, blade up, its wooden
      // grip catching the sun — it rocks with the work.
      const rock = act > 0.05 ? Math.sin(t * 9 + h) * 0.05 * act : 0;
      ctx.save();
      ctx.translate(kx + s * 0.02, logMid);
      ctx.rotate(rock);
      ctx.fillStyle = '#9aa2ac';
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.55)';
      ctx.lineWidth = Math.max(1.2, s * 0.024);
      ctx.beginPath();
      ctx.moveTo(-s * 0.036, 0);
      ctx.lineTo(-s * 0.008, -s * 0.52);
      ctx.lineTo(s * 0.075, -s * 0.5);
      ctx.lineTo(s * 0.062, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = shade('#9aa2ac', 22);
      ctx.fillRect(-s * 0.024, -s * 0.52, s * 0.026, s * 0.52);
      ctx.fillStyle = shade(legC, 20);
      ctx.beginPath();
      ctx.roundRect(-s * 0.045, -s * 0.615, s * 0.165, s * 0.095, s * 0.038);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.022);
      ctx.stroke();
      ctx.restore();
      // The take so far: a low stagger-stacked board pile by the
      // west trestle, every course with its lit top arris.
      const bw = s * 0.46;
      for (let k = 0; k < 3; k++) {
        const off = ((hashCoords(83 + k, tx, ty) % 9) - 4) * s * 0.014;
        const by = yB - s * 0.042 * (k + 1);
        ctx.fillStyle = shade(sawnC, k * 6 - 4);
        ctx.fillRect(xL + s * 0.01 + off, by, bw, s * 0.046);
        ctx.fillStyle = shade(sawnC, k * 6 + 24);
        ctx.fillRect(xL + s * 0.01 + off, by, bw, s * 0.015);
      }
      // Sawdust drifted beneath the kerf — a settled pale mound
      // plus scattered motes.
      ctx.fillStyle = 'rgba(216, 192, 138, 0.8)';
      ctx.beginPath();
      ctx.ellipse(kx + s * 0.14, yB - s * 0.008, s * 0.16, s * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let k = 0; k < 4; k++) {
        const hh = hashCoords(91 + k, tx, ty);
        ctx.fillRect(
          kx - s * 0.06 + ((hh % 40) / 100) * s,
          yB - s * 0.05 - ((hh >> 5) % 12) * s * 0.004,
          s * 0.022,
          s * 0.014,
        );
      }
      // While someone saws, dust falls from the cut in a slow
      // drift — the working read, cheap and honest.
      if (act > 0.05) {
        for (let i = 0; i < 3; i++) {
          const ct2 = (t * (0.9 + i * 0.25) + h * 0.31 + i * 0.37) % 1;
          ctx.fillStyle = `rgba(216, 192, 138, ${0.7 * (1 - ct2) * act})`;
          ctx.fillRect(
            kx + s * 0.05 + i * s * 0.05 + Math.sin(t * 3 + i) * s * 0.015,
            logMid + logR + ct2 * (yB - logMid - logR),
            s * 0.02,
            s * 0.02,
          );
        }
      }
    },
  };
}

function paintEnchantingTable(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  // The enchanter's worktable on the table grammar: a dark
  // arcane slab in full plan, a rune ring carved INTO the top
  // plane, tome and focus stone standing on their own spots.
  const th = s * 0.54;
  const xL = p.x - s * 0.47;
  const xR = p.x + s * 0.47;
  const yT = p.y - syT * 0.34;
  const yB = p.y + syT * 0.42;
  const topC = '#4f4468';
  const legC = '#372f47';
  return {
    sortY: ty + 0.85,
    body: stationBody(1.0, 1.5, 0.7),
    drawShadow: () => {
      rend.castEdgeQuad(xL, yB + syT * 0.06, xR, yB + syT * 0.06, 0.7);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      const act = rend.stationHeat.get(packTile(tx, ty)) ?? 0;
      // Magelight pools under the table — dim at rest, surging
      // while an inscription is worked. Never fully dark: bound
      // Arx doesn't sleep, it waits.
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.7 + h);
      const might = 0.16 + 0.1 * pulse + act * (0.3 + 0.2 * Math.sin(t * 4.2));
      ctx.fillStyle = `rgba(146, 122, 220, ${might * 0.5})`;
      ctx.beginPath();
      facetCircle(ctx, p.x, yB + s * 0.06, s * 0.5, 8, 0.4, 0.4);
      ctx.fill();
      rend.queueGlow(tx + 0.5, ty + 0.5, 0.9 + act * 0.4, '146, 122, 220', might * 0.5);
      // Stout dark legs — carved claw feet — and the apron.
      const leg = (lx: number, ly: number, hgt: number) => {
        ctx.fillStyle = legC;
        ctx.beginPath();
        ctx.moveTo(lx - s * 0.045, ly - hgt);
        ctx.lineTo(lx + s * 0.045, ly - hgt);
        ctx.lineTo(lx + s * 0.03, ly - s * 0.07);
        ctx.lineTo(lx + s * 0.06, ly);
        ctx.lineTo(lx - s * 0.06, ly);
        ctx.lineTo(lx - s * 0.03, ly - s * 0.07);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(legC, -14);
        ctx.fillRect(lx - s * 0.06, ly - s * 0.02, s * 0.12, s * 0.02);
      };
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.fillRect(xL + s * 0.02, yB + s * 0.005, xR - xL - s * 0.04, s * 0.04);
      leg(xL + s * 0.09, yB, th + syT * 0.05);
      leg(xR - s * 0.09, yB, th + syT * 0.05);
      leg(xL + s * 0.09, yT + syT * 0.18, (th + syT * 0.05) * 0.92);
      leg(xR - s * 0.09, yT + syT * 0.18, (th + syT * 0.05) * 0.92);
      ctx.fillStyle = shade(legC, 6);
      ctx.fillRect(xL + s * 0.02, yB - th, xR - xL - s * 0.04, s * 0.085);
      // Carved runes along the apron — they light in sequence
      // while the table works, a thought walking the wood.
      for (let i = 0; i < 5; i++) {
        const lit = act > 0.05 ? Math.max(0, Math.sin(t * 3.1 - i * 0.9)) * act : 0;
        ctx.fillStyle = `rgba(186, 162, 255, ${0.25 + 0.6 * lit})`;
        ctx.fillRect(p.x - s * 0.3 + i * s * 0.14, yB - th + s * 0.02, s * 0.05, s * 0.05);
      }
      // The slab: full plan-space top, rimmed dark, south lip
      // lit — the camera looks DOWN onto the enchanter's work.
      ctx.fillStyle = topC;
      ctx.beginPath();
      chamferRect(ctx, xL, yT - th, xR - xL, yB - yT, s * 0.05);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.4)';
      ctx.lineWidth = Math.max(1.2, s * 0.028);
      ctx.stroke();
      ctx.fillStyle = shade(topC, 14);
      ctx.fillRect(xL + s * 0.01, yB - th - s * 0.042, xR - xL - s * 0.02, s * 0.042);
      ctx.fillStyle = shade(topC, -8);
      ctx.fillRect(xL + s * 0.01, yT - th, xR - xL - s * 0.02, s * 0.028);
      // The rune ring carved into the top plane — an ellipse in
      // plan, glyph ticks around it, breathing with the pool
      // and walking bright while the table works.
      const rcx = p.x + s * 0.03;
      const rcy = yT - th + (yB - yT) * 0.52;
      ctx.fillStyle = `rgba(146, 122, 220, ${0.1 + 0.08 * pulse + act * 0.12})`;
      ctx.beginPath();
      ctx.ellipse(rcx, rcy, s * 0.3, s * 0.3 * rend.camera.yScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(186, 162, 255, ${0.55 + 0.3 * pulse + act * 0.25})`;
      ctx.lineWidth = Math.max(1.4, s * 0.03);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a2 = (i / 8) * Math.PI * 2 + t * (act > 0.05 ? 0.35 : 0.06);
        const gx = rcx + Math.cos(a2) * s * 0.3;
        const gy = rcy + Math.sin(a2) * s * 0.3 * rend.camera.yScale;
        const lit = act > 0.05 ? Math.max(0, Math.sin(t * 3.1 - i * 0.8)) * act : 0.25 * pulse;
        ctx.fillStyle = `rgba(206, 186, 255, ${0.45 + 0.55 * lit})`;
        ctx.fillRect(gx - s * 0.022, gy - s * 0.022, s * 0.044, s * 0.044);
      }
      // The open tome stands at the ring's west edge: dark
      // cover, two pale page-blocks, ribbon marker — and while
      // working, a mid-turn page arcing between them.
      const tmx = p.x - s * 0.22;
      const tmy = yT - th + (yB - yT) * 0.56;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
      ctx.beginPath();
      ctx.ellipse(tmx + s * 0.04, tmy + s * 0.035, s * 0.21, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2e2740';
      ctx.beginPath();
      chamferRect(ctx, tmx - s * 0.2, tmy - s * 0.115, s * 0.42, s * 0.15, s * 0.02);
      ctx.fill();
      ctx.fillStyle = '#e8dfc8';
      ctx.fillRect(tmx - s * 0.175, tmy - s * 0.1, s * 0.17, s * 0.11);
      ctx.fillRect(tmx + s * 0.015, tmy - s * 0.1, s * 0.17, s * 0.11);
      ctx.fillStyle = shade('#e8dfc8', -10);
      ctx.fillRect(tmx - s * 0.005, tmy - s * 0.1, s * 0.02, s * 0.11);
      ctx.fillStyle = '#8a4a52';
      ctx.fillRect(tmx - s * 0.015, tmy + s * 0.01, s * 0.035, s * 0.05);
      // Faint script lines on the pages.
      ctx.fillStyle = 'rgba(74, 63, 94, 0.55)';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(tmx - s * 0.155, tmy - s * (0.08 - i * 0.03), s * 0.13, s * 0.012);
        ctx.fillRect(tmx + s * 0.035, tmy - s * (0.08 - i * 0.03), s * 0.13, s * 0.012);
      }
      if (act > 0.05) {
        const turn = (t * 0.9 + h * 0.17) % 1;
        ctx.strokeStyle = `rgba(232, 223, 200, ${0.85 * act * Math.sin(turn * Math.PI)})`;
        ctx.lineWidth = Math.max(1, s * 0.02);
        ctx.beginPath();
        ctx.moveTo(tmx + s * 0.015, tmy + s * 0.01);
        ctx.quadraticCurveTo(
          tmx - s * 0.14 * turn,
          tmy - s * 0.16,
          tmx - s * (0.02 + 0.15 * turn),
          tmy + s * 0.005,
        );
        ctx.stroke();
      }
      // The focus crystal hovers over a claw cradle standing at
      // the ring's east edge — a cut stone that bobs on
      // nothing, spins slowly, and drinks the work.
      const bob = Math.sin(t * 1.6 + h) * 0.03 + act * Math.sin(t * 5.2) * 0.02;
      const cx = p.x + s * 0.28;
      const cdy = yT - th + (yB - yT) * 0.56;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
      ctx.beginPath();
      ctx.ellipse(cx, cdy + s * 0.012, s * 0.075, s * 0.03, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = legC;
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.06, cdy);
      ctx.lineTo(cx + s * 0.06, cdy);
      ctx.lineTo(cx + s * 0.032, cdy - s * 0.1);
      ctx.lineTo(cx - s * 0.032, cdy - s * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(legC, 16);
      ctx.fillRect(cx - s * 0.032, cdy - s * 0.105, s * 0.064, s * 0.02);
      // The stone floats LOW over its cradle — always read as
      // one piece with the table, never a chip off its edge.
      const cy = cdy - s * (0.2 + bob);
      ctx.fillStyle = `rgba(146, 122, 220, ${0.2 + 0.15 * pulse + act * 0.2})`;
      ctx.beginPath();
      facetCircle(ctx, cx, cy, s * 0.13, 6, t * 0.4, 1.2);
      ctx.fill();
      ctx.fillStyle = `rgba(196, 174, 255, ${0.85 + act * 0.15})`;
      ctx.beginPath();
      facetCircle(ctx, cx, cy, s * (0.08 + act * 0.012), 4, t * 0.8, 1.4);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 252, 240, 0.9)';
      ctx.fillRect(cx - s * 0.014, cy - s * (0.045 + bob * 0.4), s * 0.028, s * 0.028);
      // An ink pot and quill at the south rim: the enchanter
      // writes, the table remembers.
      const iqx = p.x - s * 0.02;
      const iqy = yT - th + (yB - yT) * 0.85;
      ctx.fillStyle = '#2e2740';
      ctx.beginPath();
      facetCircle(ctx, iqx, iqy - s * 0.03, s * 0.045, 6, 0.3, 0.6);
      ctx.fill();
      ctx.strokeStyle = '#d8cbb0';
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(iqx + s * 0.02, iqy - s * 0.05);
      ctx.quadraticCurveTo(iqx + s * 0.1, iqy - s * 0.14, iqx + s * 0.14, iqy - s * 0.12);
      ctx.stroke();
      // Rising rune motes while the enchanter works — glyphs
      // shaken loose from the page, fading as they climb.
      if (act > 0.05) {
        for (let i = 0; i < 4; i++) {
          const mt = (t * (0.5 + i * 0.13) + i * 0.29 + h * 0.41) % 1;
          const mx = p.x - s * 0.2 + ((i * 47 + h) % 10) * s * 0.045;
          ctx.fillStyle = `rgba(186, 162, 255, ${0.75 * (1 - mt) * act})`;
          ctx.fillRect(
            mx + Math.sin(t * 2 + i * 2.1) * s * 0.03,
            yT - th - s * (0.1 + mt * 0.5),
            s * 0.035,
            s * 0.035,
          );
        }
      }
    },
  };
}

function paintFurnace(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.34;
  const glow = 0.7 + Math.sin(t * 5 + h) * 0.22 + Math.sin(t * 11) * 0.08;
  // A smelter with the mass of real masonry: broad firebox,
  // sloped shoulder planes, and a crowned stack whose flue
  // mouth the tilted camera looks into. Head-and-a-half tall
  // beside the body — industry, not furniture.
  const stone = '#5b5566';
  const shoY = baseY - s * 0.78;
  const topY = baseY - s * 1.52;
  return {
    sortY: ty + 1,
    body: stationBody(1.1, 2.1, 0.8),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - s * 0.52, baseY, p.x + s * 0.52, baseY, 1.4);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // STOKED: while someone smelts, the whole piece surges —
      // the pool, the mouth, the coals, the smoke all breathe
      // harder on one shared flare envelope.
      const act = rend.stationHeat.get(packTile(tx, ty)) ?? 0;
      const flare = act * (0.55 + 0.45 * Math.sin(t * 2.3 + h));
      // Firelight pools on the ground before any masonry — the
      // working glow you can read from across the smithy yard.
      ctx.fillStyle = `rgba(232, 122, 51, ${0.1 * glow + 0.08 * flare})`;
      ctx.beginPath();
      facetCircle(ctx, p.x, baseY + syT * 0.12, s * 0.56, 8, 0.2, 0.42);
      ctx.fill();
      // A worn stone working apron in plan at the foot — the
      // slab the smelter stands on, mold and ash living on it.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
      ctx.fillRect(p.x - s * 0.53, baseY - s * 0.015, s * 1.06, s * 0.05);
      ctx.fillStyle = shade(stone, 4);
      ctx.beginPath();
      chamferRect(ctx, p.x - s * 0.5, baseY - s * 0.02, s, syT * 0.32, s * 0.04);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1.2, s * 0.026);
      ctx.stroke();
      ctx.fillStyle = shade(stone, 16);
      ctx.fillRect(p.x - s * 0.5, baseY + syT * 0.27, s, s * 0.032);
      ctx.fillStyle = 'rgba(20, 14, 28, 0.25)';
      ctx.fillRect(p.x - s * 0.16, baseY + s * 0.01, s * 0.02, syT * 0.28);
      ctx.fillRect(p.x + s * 0.2, baseY + s * 0.01, s * 0.02, syT * 0.28);
      // The kiln: a broad firebox shouldering in to a chimney
      // stack, all cut stone in one silhouette, rimmed dark.
      ctx.fillStyle = stone;
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.52, baseY);
      ctx.lineTo(p.x - s * 0.52, shoY);
      ctx.lineTo(p.x - s * 0.29, shoY - s * 0.2);
      ctx.lineTo(p.x - s * 0.29, topY);
      ctx.lineTo(p.x + s * 0.29, topY);
      ctx.lineTo(p.x + s * 0.29, shoY - s * 0.2);
      ctx.lineTo(p.x + s * 0.52, shoY);
      ctx.lineTo(p.x + s * 0.52, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1.2, s * 0.026);
      ctx.stroke();
      // Sun keeps the west flank and loses the east — the same
      // law as every wall in town.
      ctx.fillStyle = shade(stone, 10);
      ctx.fillRect(p.x - s * 0.52, shoY, s * 0.09, baseY - shoY);
      ctx.fillRect(p.x - s * 0.29, topY, s * 0.075, shoY - s * 0.2 - topY);
      ctx.fillStyle = shade(stone, -10);
      ctx.fillRect(p.x + s * 0.43, shoY, s * 0.09, baseY - shoY);
      ctx.fillRect(p.x + s * 0.215, topY, s * 0.075, shoY - s * 0.2 - topY);
      // The shoulder slopes: two planes catching the sky where
      // the firebox steps in to the stack — the cut the
      // silhouette makes, shown as lit surface.
      for (const sd of [-1, 1] as const) {
        ctx.fillStyle = shade(stone, sd < 0 ? 22 : 14);
        ctx.beginPath();
        ctx.moveTo(p.x + sd * s * 0.52, shoY);
        ctx.lineTo(p.x + sd * s * 0.29, shoY - s * 0.2);
        ctx.lineTo(p.x + sd * s * 0.29, shoY - s * 0.2 + s * 0.05);
        ctx.lineTo(p.x + sd * s * 0.52, shoY + s * 0.05);
        ctx.closePath();
        ctx.fill();
      }
      // Cut-stone coursing: staggered header ticks on firebox
      // and stack, not floating lines.
      ctx.fillStyle = 'rgba(20, 14, 28, 0.3)';
      ctx.fillRect(p.x - s * 0.52, baseY - s * 0.56, s * 1.04, s * 0.026);
      for (let c2 = 0; c2 < 4; c2++) {
        ctx.fillRect(p.x - s * 0.44 + c2 * s * 0.26, baseY - s * 0.56 + s * 0.026, s * 0.02, s * 0.06);
      }
      ctx.fillRect(p.x - s * 0.29, shoY - s * 0.42, s * 0.58, s * 0.026);
      ctx.fillRect(p.x - s * 0.29, topY + s * 0.16, s * 0.58, s * 0.026);
      for (let c2 = 0; c2 < 2; c2++) {
        ctx.fillRect(p.x - s * 0.16 + c2 * s * 0.22, shoY - s * 0.42 + s * 0.026, s * 0.02, s * 0.055);
        ctx.fillRect(p.x - s * 0.08 + c2 * s * 0.14, topY + s * 0.186, s * 0.02, s * 0.055);
      }
      // An iron reinforcing band strapped around the stack,
      // riveted — masonry that has taken years of heat.
      ctx.fillStyle = '#3a3544';
      ctx.fillRect(p.x - s * 0.3, shoY - s * 0.56, s * 0.6, s * 0.06);
      ctx.fillStyle = '#767181';
      ctx.fillRect(p.x - s * 0.3, shoY - s * 0.56, s * 0.6, s * 0.018);
      ctx.fillRect(p.x - s * 0.22, shoY - s * 0.545, s * 0.03, s * 0.03);
      ctx.fillRect(p.x + s * 0.19, shoY - s * 0.545, s * 0.03, s * 0.03);
      // The crown: a foreshortened cap plane the camera looks
      // onto, its flue mouth a dark sunk ellipse the smoke
      // actually stands in. Sunlit front arris below it.
      const crD = syT * 0.28;
      ctx.fillStyle = shade(stone, 16);
      ctx.beginPath();
      chamferRect(ctx, p.x - s * 0.34, topY - crD, s * 0.68, crD + s * 0.02, s * 0.04);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1.2, s * 0.024);
      ctx.stroke();
      ctx.fillStyle = shade(stone, 4);
      ctx.fillRect(p.x - s * 0.3, topY - crD + s * 0.016, s * 0.6, s * 0.026);
      ctx.fillStyle = '#1c1524';
      ctx.beginPath();
      ctx.ellipse(p.x, topY - crD * 0.42, s * 0.19, crD * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(232, 108, 45, ${0.2 * glow + 0.3 * flare})`;
      ctx.beginPath();
      ctx.ellipse(p.x, topY - crD * 0.42, s * 0.13, crD * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(stone, 28);
      ctx.fillRect(p.x - s * 0.34, topY - s * 0.012, s * 0.68, s * 0.032);
      // Smoke: two puffs climbing out of the flue (a third
      // while stoked), thinning as they drift east on the
      // yard's air.
      for (let i = 0; i < 2 + (act > 0.3 ? 1 : 0); i++) {
        const ph = (t * (0.26 + i * 0.09) + i * 0.5 + h * 0.11) % 1;
        ctx.fillStyle = `rgba(146, 140, 152, ${(1 - ph) * 0.28})`;
        ctx.beginPath();
        facetCircle(
          ctx,
          p.x + Math.sin(t * 0.9 + i * 2.1 + h) * s * 0.05 + ph * s * 0.16,
          topY - crD * 0.5 - s * 0.04 - ph * s * 0.55,
          s * (0.06 + ph * 0.1),
          6,
          ph * 2 + i,
          0.8,
        );
        ctx.fill();
      }
      // The mouth: arched-hexagon opening, coal bed banked at
      // its floor, iron grate bars standing over the fire.
      ctx.fillStyle = '#1c1524';
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.22, baseY - s * 0.02);
      ctx.lineTo(p.x - s * 0.22, baseY - s * 0.4);
      ctx.lineTo(p.x - s * 0.11, baseY - s * 0.55);
      ctx.lineTo(p.x + s * 0.11, baseY - s * 0.55);
      ctx.lineTo(p.x + s * 0.22, baseY - s * 0.4);
      ctx.lineTo(p.x + s * 0.22, baseY - s * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(232, 108, 45, ${Math.min(1, glow * 0.9 + flare * 0.5)})`;
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.19, baseY - s * 0.03);
      ctx.lineTo(p.x - s * 0.19, baseY - s * 0.37);
      ctx.lineTo(p.x - s * 0.09, baseY - s * 0.5);
      ctx.lineTo(p.x + s * 0.09, baseY - s * 0.5);
      ctx.lineTo(p.x + s * 0.19, baseY - s * 0.37);
      ctx.lineTo(p.x + s * 0.19, baseY - s * 0.03);
      ctx.closePath();
      ctx.fill();
      // A keystone arch of dressed voussoirs framing the mouth.
      ctx.fillStyle = shade(stone, 14);
      for (const [vx2, vy2, vr] of [
        [-0.24, -0.38, 0.12],
        [-0.13, -0.52, -0.35],
        [0, -0.575, 0],
        [0.13, -0.52, 0.35],
        [0.24, -0.38, -0.12],
      ] as const) {
        ctx.save();
        ctx.translate(p.x + vx2 * s, baseY + vy2 * s);
        ctx.rotate(vr);
        ctx.fillRect(-s * 0.045, -s * 0.04, s * 0.09, s * 0.08);
        ctx.restore();
      }
      // Coals pulse out of phase with one another — a banked
      // fire is never one flat brightness.
      for (let i = 0; i < 3; i++) {
        const pulse = 0.5 + Math.sin(t * 3 + i * 2.4 + h) * 0.5;
        ctx.fillStyle = `rgba(255, 201, 92, ${Math.min(1, 0.35 + pulse * 0.55 + flare * 0.3)})`;
        ctx.beginPath();
        facetCircle(ctx, p.x + (i - 1) * s * 0.11, baseY - s * 0.08, s * 0.06, 6, i * 1.1, 0.7);
        ctx.fill();
      }
      // A white heart forms in the fire while it is being fed.
      if (act > 0.04) {
        ctx.fillStyle = `rgba(255, 232, 160, ${flare * 0.5})`;
        ctx.beginPath();
        facetCircle(ctx, p.x, baseY - s * 0.1, s * 0.07, 6, 0.5, 0.7);
        ctx.fill();
      }
      ctx.fillStyle = '#2c2836';
      for (const gx of [-0.11, 0, 0.11]) {
        ctx.fillRect(p.x + gx * s - s * 0.018, baseY - s * 0.5, s * 0.036, s * 0.48);
      }
      // Sparks escape past the grate and climb the stack face.
      if (act > 0.04) {
        for (let i = 0; i < 2; i++) {
          const ph = (t * (0.9 + i * 0.33) + h * 0.21 + i * 0.5) % 1;
          ctx.fillStyle = `rgba(255, 205, 120, ${(1 - ph) * act * 0.8})`;
          ctx.fillRect(
            p.x + Math.sin(t * 3.1 + i * 2.4 + h) * s * 0.06,
            baseY - s * 0.38 - ph * s * 0.55,
            s * 0.024,
            s * 0.024,
          );
        }
      }
      // The pour station on the apron's east: a stone ingot
      // mold, one bar still sun-bright from the pour, one gone
      // gray — the smelting story told in plan.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
      ctx.beginPath();
      ctx.ellipse(p.x + s * 0.38, baseY + syT * 0.16, s * 0.15, s * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6e6879';
      ctx.beginPath();
      chamferRect(ctx, p.x + s * 0.25, baseY + syT * 0.04, s * 0.26, s * 0.12, s * 0.02);
      ctx.fill();
      ctx.fillStyle = shade('#6e6879', 12);
      ctx.fillRect(p.x + s * 0.25, baseY + syT * 0.04, s * 0.26, s * 0.02);
      ctx.fillStyle = `rgba(240, 150, 60, ${0.55 + glow * 0.4})`;
      ctx.fillRect(p.x + s * 0.28, baseY + syT * 0.06, s * 0.2, s * 0.032);
      ctx.fillStyle = '#8f96a3';
      ctx.fillRect(p.x + s * 0.28, baseY + syT * 0.1, s * 0.2, s * 0.032);
      // Ash drift swept to the apron's west edge.
      ctx.fillStyle = '#8a8494';
      ctx.beginPath();
      facetCircle(ctx, p.x - s * 0.38, baseY + syT * 0.12, s * 0.11, 6, 0.4, 0.45);
      ctx.fill();
      ctx.fillStyle = shade('#8a8494', -10);
      ctx.beginPath();
      facetCircle(ctx, p.x - s * 0.32, baseY + syT * 0.16, s * 0.05, 6, 0.8, 0.45);
      ctx.fill();
    },
  };
}

function paintAnvil(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.3;
  // Work heat: the bar on the face breathes like real forge stock.
  const heat = 0.62 + Math.sin(t * 5.5 + h) * 0.2 + Math.sin(t * 13) * 0.08;
  return {
    sortY: ty + 0.85,
    body: stationBody(1.05, 1.2, 0.6),
    drawShadow: () => {
      rend.castBlob(p.x, p.y + s * 0.22, 0.52, s * 0.4, tx ^ (ty << 3));
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // Contact shade, then the hewn oak round every smith sets
      // an anvil on — wood makes the blow ring, not crack. The
      // round shows its sawn TOP: an elliptical plane of growth
      // rings the anvil's foot stands in the middle of.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
      ctx.fillRect(p.x - s * 0.36, baseY - s * 0.015, s * 0.72, s * 0.05);
      const stumpTop = baseY - s * 0.36;
      ctx.fillStyle = '#6b4a26';
      ctx.beginPath();
      chamferRect(ctx, p.x - s * 0.32, stumpTop, s * 0.64, s * 0.36, [s * 0.03, s * 0.03, s * 0.08, s * 0.08]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1.2, s * 0.026);
      ctx.stroke();
      ctx.fillStyle = shade('#6b4a26', 8);
      ctx.fillRect(p.x - s * 0.3, stumpTop + s * 0.03, s * 0.08, s * 0.3);
      ctx.fillStyle = shade('#6b4a26', -12);
      ctx.fillRect(p.x + s * 0.2, stumpTop + s * 0.03, s * 0.1, s * 0.3);
      // Bark checks down the flank.
      ctx.fillStyle = 'rgba(36, 22, 10, 0.4)';
      ctx.fillRect(p.x - s * 0.12, stumpTop + s * 0.08, s * 0.022, s * 0.2);
      ctx.fillRect(p.x + s * 0.08, stumpTop + s * 0.12, s * 0.022, s * 0.16);
      // The sawn top plane: pale end-grain with ring arcs,
      // proud of the flank on both sides.
      ctx.fillStyle = '#94693a';
      ctx.beginPath();
      ctx.ellipse(p.x, stumpTop, s * 0.34, syT * 0.21, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1.2, s * 0.024);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(107, 74, 38, 0.55)';
      ctx.lineWidth = Math.max(1, s * 0.02);
      for (const rr of [0.24, 0.15] as const) {
        ctx.beginPath();
        ctx.ellipse(p.x + s * 0.03, stumpTop + syT * 0.01, s * rr, syT * rr * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // An iron strap keeps the round from splitting under years
      // of blows — riveted, sitting a little proud of the wood.
      ctx.fillStyle = '#3a3544';
      ctx.fillRect(p.x - s * 0.33, baseY - s * 0.2, s * 0.66, s * 0.075);
      ctx.fillStyle = '#565162';
      ctx.fillRect(p.x - s * 0.33, baseY - s * 0.2, s * 0.66, s * 0.022);
      ctx.fillStyle = '#767181';
      ctx.fillRect(p.x - s * 0.24, baseY - s * 0.185, s * 0.038, s * 0.038);
      ctx.fillRect(p.x + s * 0.2, baseY - s * 0.185, s * 0.038, s * 0.038);
      // The anvil in profile — horn west, heel step east, one
      // unbroken silhouette so the tool reads at any zoom.
      // Bigger than a stool: nose-to-heel it spans the tile.
      const yF = baseY - s * 0.74;
      const bodyB = yF + s * 0.2;
      ctx.fillStyle = '#565162';
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.3, bodyB);
      ctx.lineTo(p.x - s * 0.3, yF + s * 0.06);
      ctx.quadraticCurveTo(p.x - s * 0.46, yF + s * 0.065, p.x - s * 0.58, yF + s * 0.018);
      ctx.quadraticCurveTo(p.x - s * 0.42, yF - s * 0.024, p.x - s * 0.28, yF - s * 0.012);
      ctx.lineTo(p.x + s * 0.38, yF - s * 0.012);
      ctx.lineTo(p.x + s * 0.38, yF + s * 0.07);
      ctx.lineTo(p.x + s * 0.28, yF + s * 0.12);
      ctx.lineTo(p.x + s * 0.28, bodyB);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1.2, s * 0.026);
      ctx.stroke();
      // Waist: concave flanks pinching down to the foot plate.
      ctx.fillStyle = '#4a4554';
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.22, bodyB - s * 0.01);
      ctx.quadraticCurveTo(p.x - s * 0.12, bodyB + s * 0.06, p.x - s * 0.17, stumpTop - s * 0.06);
      ctx.lineTo(p.x + s * 0.2, stumpTop - s * 0.06);
      ctx.quadraticCurveTo(p.x + s * 0.14, bodyB + s * 0.06, p.x + s * 0.24, bodyB - s * 0.01);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#565162';
      ctx.beginPath();
      chamferRect(ctx, p.x - s * 0.25, stumpTop - s * 0.07, s * 0.52, s * 0.08, s * 0.02);
      ctx.fill();
      ctx.fillStyle = shade('#565162', 10);
      ctx.fillRect(p.x - s * 0.25, stumpTop - s * 0.07, s * 0.52, s * 0.022);
      // THE FACE TAKES THE SKY: a real foreshortened top plane,
      // bright milled steel the camera looks down onto — the
      // hot bar LIES ON it, the hardy and pritchel holes are
      // sunk INTO it, and the horn's spine carries it west.
      const fD = syT * 0.17;
      ctx.fillStyle = '#8b8697';
      ctx.beginPath();
      chamferRect(ctx, p.x - s * 0.28, yF - fD, s * 0.66, fD + s * 0.035, s * 0.025);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.3)';
      ctx.lineWidth = Math.max(1, s * 0.022);
      ctx.stroke();
      ctx.fillStyle = shade('#8b8697', 14);
      ctx.fillRect(p.x - s * 0.26, yF + s * 0.002, s * 0.62, s * 0.026);
      ctx.fillStyle = shade('#8b8697', -8);
      ctx.fillRect(p.x - s * 0.26, yF - fD + s * 0.012, s * 0.62, s * 0.02);
      // The horn: its lit spine runs out along the curve, and a
      // sliver of top plane tapers with it to the nose.
      ctx.fillStyle = shade('#8b8697', 4);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.28, yF - fD * 0.5);
      ctx.quadraticCurveTo(p.x - s * 0.44, yF - fD * 0.3, p.x - s * 0.57, yF + s * 0.012);
      ctx.quadraticCurveTo(p.x - s * 0.42, yF + s * 0.02, p.x - s * 0.28, yF + s * 0.03);
      ctx.closePath();
      ctx.fill();
      // Hardy (square) and pritchel (round) holes on the heel,
      // sunk in the plane where a smith would find them.
      ctx.fillStyle = '#2c2836';
      ctx.fillRect(p.x + s * 0.24, yF - fD * 0.55, s * 0.05, s * 0.045);
      ctx.beginPath();
      facetCircle(ctx, p.x + s * 0.33, yF - fD * 0.35, s * 0.02, 6, 0.3, 0.7);
      ctx.fill();
      // Work in progress: an orange-hot bar lying ON the face
      // plane, its core brighter than its skin, breathing with
      // the forge.
      ctx.save();
      ctx.translate(p.x + s * 0.02, yF - fD * 0.45);
      ctx.rotate(-0.06);
      ctx.fillStyle = `rgba(226, 106, 44, ${0.75 + heat * 0.25})`;
      ctx.fillRect(-s * 0.19, -s * 0.03, s * 0.38, s * 0.06);
      ctx.fillStyle = `rgba(255, 196, 110, ${heat * 0.85})`;
      ctx.fillRect(-s * 0.12, -s * 0.017, s * 0.17, s * 0.034);
      ctx.restore();
      // Forge sparks: short-lived motes popping off the bar.
      for (let i = 0; i < 2; i++) {
        const ph = (t * (1.3 + i * 0.41) + h * 0.17 + i * 0.53) % 1;
        if (ph < 0.4) {
          const k = ph / 0.4;
          ctx.fillStyle = `rgba(255, 205, 120, ${(1 - k) * 0.85})`;
          ctx.fillRect(
            p.x + s * (0.04 + i * 0.05) + k * s * (i === 0 ? -0.14 : 0.12),
            yF - fD * 0.45 - s * 0.04 - k * s * 0.16 + k * k * s * 0.1,
            s * 0.024,
            s * 0.024,
          );
        }
      }
      // WORKING THE METAL: while someone hammers, the bar
      // flashes white on each strike beat and throws a fan of
      // sparks off the face — the strike you hear, seen. THE
      // IMPACT IS ONE TRUTH: the beat is the swung hammer's own
      // clang instant (stationClang, latched by the smith's
      // impact gate) — the seen strike and the swung hammer can
      // no longer drift apart on separate clocks.
      const act = rend.stationHeat.get(packTile(tx, ty)) ?? 0;
      const clangMs = rend.stationClang.get(packTile(tx, ty));
      if (act > 0.04 && clangMs !== undefined) {
        const sinceS = (performance.now() - clangMs) / 1000;
        const beat = Math.min(1, sinceS / 0.42);
        const seed = hashCoords(211 + (Math.floor(clangMs / 64) % 8), tx, ty);
        if (beat < 0.16) {
          const flash = (1 - beat / 0.16) * act;
          ctx.save();
          ctx.translate(p.x + s * 0.02, yF - fD * 0.45);
          ctx.rotate(-0.06);
          ctx.fillStyle = `rgba(255, 244, 214, ${flash * 0.85})`;
          ctx.fillRect(-s * 0.2, -s * 0.036, s * 0.4, s * 0.072);
          ctx.restore();
        }
        if (beat < 0.45) {
          const k = beat / 0.45;
          ctx.fillStyle = `rgba(255, 205, 120, ${(1 - k) * act * 0.9})`;
          for (let i = 0; i < 5; i++) {
            const a2 = -Math.PI * (0.12 + 0.76 * (((seed >>> (i * 4)) % 17) / 16));
            const r2 = k * s * (0.18 + (((seed >>> (i * 3)) % 7) / 7) * 0.2);
            ctx.fillRect(
              p.x + s * 0.02 + Math.cos(a2) * r2,
              yF - fD * 0.45 + Math.sin(a2) * r2 + k * k * s * 0.12,
              s * 0.026,
              s * 0.026,
            );
          }
        }
      }
      // Tongs lean on the stump's east shoulder, jaws up; the
      // smith's hammer rests head-down on the sawn top beside
      // the anvil's foot.
      ctx.save();
      ctx.translate(p.x + s * 0.36, baseY - s * 0.05);
      ctx.rotate(-0.45);
      ctx.fillStyle = '#6a6577';
      ctx.fillRect(-s * 0.015, -s * 0.38, s * 0.03, s * 0.4);
      ctx.fillRect(-s * 0.048, -s * 0.38, s * 0.033, s * 0.11);
      ctx.restore();
      ctx.fillStyle = '#8b8697';
      ctx.fillRect(p.x - s * 0.335, stumpTop - s * 0.045, s * 0.09, s * 0.065);
      ctx.fillStyle = shade('#8b8697', 14);
      ctx.fillRect(p.x - s * 0.335, stumpTop - s * 0.045, s * 0.09, s * 0.02);
      ctx.save();
      ctx.translate(p.x - s * 0.29, stumpTop + s * 0.015);
      ctx.rotate(0.5);
      ctx.fillStyle = '#8a6534';
      ctx.fillRect(-s * 0.018, 0, s * 0.036, s * 0.24);
      ctx.restore();
    },
  };
}

function paintWorkbench(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  // The joiner's bench on the table grammar: a thick working
  // slab in full plan — the camera looks DOWN on the tools of
  // the trade, each standing or lying on its own spot.
  const th = s * 0.52;
  const xL = p.x - s * 0.49;
  const xR = p.x + s * 0.49;
  const yT = p.y - syT * 0.34;
  const yB = p.y + syT * 0.42;
  const topC = '#a5793f';
  const legC = '#5b4028';
  return {
    sortY: ty + 0.9,
    body: stationBody(1.05, 1.55, 0.7),
    drawShadow: () => {
      rend.castEdgeQuad(xL, yB + syT * 0.06, xR, yB + syT * 0.06, 0.68);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // AT WORK: the mallet taps its own beat, dust rises off
      // the cut, and the plumb line swings with the bench.
      const act = rend.stationHeat.get(packTile(tx, ty)) ?? 0;
      const tap = act * Math.max(0, Math.sin(t * 3.6 + h));
      // Contact shade, trestle legs splayed a hair.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.fillRect(xL + s * 0.02, yB + s * 0.005, xR - xL - s * 0.04, s * 0.04);
      const leg = (lx: number, ly: number, hgt: number, lean: number) => {
        ctx.save();
        ctx.translate(lx, ly - hgt);
        ctx.rotate(lean);
        ctx.fillStyle = legC;
        ctx.fillRect(-s * 0.047, 0, s * 0.094, hgt);
        ctx.restore();
        ctx.fillStyle = shade(legC, -14);
        ctx.fillRect(lx - s * 0.06, ly - s * 0.02, s * 0.12, s * 0.02);
      };
      leg(xL + s * 0.1, yB, th + syT * 0.05, -0.05);
      leg(xR - s * 0.1, yB, th + syT * 0.05, 0.05);
      leg(xL + s * 0.1, yT + syT * 0.18, (th + syT * 0.05) * 0.92, -0.05);
      leg(xR - s * 0.1, yT + syT * 0.18, (th + syT * 0.05) * 0.92, 0.05);
      // The under-shelf carries the wood store: a plank stack
      // and a coil of lashing rope.
      ctx.fillStyle = legC;
      ctx.fillRect(xL + s * 0.09, yB - th * 0.48, xR - xL - s * 0.18, s * 0.05);
      ctx.fillStyle = '#8a6534';
      ctx.fillRect(xL + s * 0.16, yB - th * 0.48 - s * 0.055, s * 0.46, s * 0.055);
      ctx.fillStyle = '#7a552e';
      ctx.fillRect(xL + s * 0.2, yB - th * 0.48 - s * 0.105, s * 0.4, s * 0.05);
      ctx.strokeStyle = '#a08a5a';
      ctx.lineWidth = Math.max(1.5, s * 0.04);
      ctx.beginPath();
      ctx.arc(xR - s * 0.17, yB - th * 0.48 - s * 0.06, s * 0.055, 0, Math.PI * 2);
      ctx.stroke();
      // The top: one thick slab in plan, rimmed dark, its south
      // lip lit, grain seams running with the boards.
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
      ctx.fillStyle = 'rgba(58, 40, 22, 0.22)';
      for (const fy of [0.38, 0.68] as const) {
        ctx.fillRect(xL + s * 0.08, yT - th + (yB - yT) * fy, xR - xL - s * 0.16, s * 0.017);
      }
      // Dog holes marching along the south rim of the plan.
      ctx.fillStyle = '#3f2c14';
      for (const dx of [-0.32, -0.14, 0.04, 0.22]) {
        ctx.fillRect(p.x + dx * s, yB - th - s * 0.09, s * 0.035, s * 0.03);
      }
      // The end vise stands up from the east end of the plan, a
      // board clamped upright in its jaws with the saw kerf
      // already started; its screw handle pokes east.
      const vx = xR - s * 0.09;
      const vy = yT - th + (yB - yT) * 0.5;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
      ctx.beginPath();
      ctx.ellipse(vx, vy + s * 0.012, s * 0.09, s * 0.03, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6f4d26';
      ctx.beginPath();
      chamferRect(ctx, vx - s * 0.075, vy - s * 0.16, s * 0.15, s * 0.16, s * 0.025);
      ctx.fill();
      ctx.fillStyle = shade('#6f4d26', 12);
      ctx.fillRect(vx - s * 0.075, vy - s * 0.16, s * 0.05, s * 0.16);
      ctx.fillStyle = '#8a6534';
      ctx.fillRect(vx - s * 0.034, vy - s * 0.46, s * 0.068, s * 0.3);
      ctx.fillStyle = shade('#8a6534', 12);
      ctx.fillRect(vx - s * 0.034, vy - s * 0.46, s * 0.022, s * 0.3);
      ctx.fillStyle = 'rgba(40, 26, 12, 0.6)';
      ctx.fillRect(vx - s * 0.008, vy - s * 0.46, s * 0.018, s * 0.11);
      ctx.strokeStyle = '#4a3116';
      ctx.lineWidth = Math.max(1.5, s * 0.035);
      ctx.beginPath();
      ctx.moveTo(vx + s * 0.07, vy - s * 0.05);
      ctx.lineTo(vx + s * 0.16, vy + s * 0.03);
      ctx.stroke();
      // Tools ON the plan: a handsaw lying flat across the west
      // end (blade, spine shine, tote), mallet and chisel
      // mid-bench — the mallet lifts and knocks while working.
      const swy = yT - th + (yB - yT) * 0.42;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(xL + s * 0.24, swy + s * 0.05, s * 0.2, s * 0.035, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9aa2ac';
      ctx.beginPath();
      ctx.moveTo(xL + s * 0.06, swy - s * 0.02);
      ctx.lineTo(xL + s * 0.38, swy - s * 0.045);
      ctx.lineTo(xL + s * 0.38, swy + s * 0.02);
      ctx.lineTo(xL + s * 0.1, swy + s * 0.035);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(xL + s * 0.08, swy - s * 0.018, s * 0.28, s * 0.014);
      ctx.fillStyle = '#6f4d26';
      ctx.fillRect(xL + s * 0.38, swy - s * 0.06, s * 0.07, s * 0.075);
      ctx.fillStyle = 'rgba(40, 26, 12, 0.5)';
      ctx.fillRect(xL + s * 0.4, swy - s * 0.04, s * 0.03, s * 0.035);
      const mlx = p.x + s * 0.1;
      const mly = yT - th + (yB - yT) * 0.72;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(mlx + s * 0.03, mly + s * 0.03, s * 0.1, s * 0.03, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(mlx, mly - tap * s * 0.08);
      ctx.rotate(0.4 - tap * 0.35);
      ctx.fillStyle = '#8a6a45';
      ctx.fillRect(-s * 0.016, 0, s * 0.032, s * 0.15);
      ctx.fillStyle = '#7a552e';
      ctx.beginPath();
      chamferRect(ctx, -s * 0.055, -s * 0.1, s * 0.11, s * 0.1, s * 0.02);
      ctx.fill();
      ctx.fillStyle = shade('#7a552e', 14);
      ctx.fillRect(-s * 0.055, -s * 0.1, s * 0.11, s * 0.025);
      ctx.restore();
      ctx.fillStyle = '#9aa2ac';
      ctx.fillRect(mlx + s * 0.12, mly - s * 0.02, s * 0.11, s * 0.026);
      ctx.fillStyle = '#6f4d26';
      ctx.fillRect(mlx + s * 0.23, mly - s * 0.026, s * 0.045, s * 0.038);
      // Shaving litter where the plane last ran — filled curl
      // chips on the plan, a few fallen to the floor.
      ctx.fillStyle = 'rgba(216, 192, 138, 0.85)';
      for (const [cx2, cy2, rot] of [
        [p.x - s * 0.04, yT - th + (yB - yT) * 0.6, 0.4],
        [p.x + s * 0.28, yT - th + (yB - yT) * 0.82, 1.8],
        [p.x - s * 0.22, yT - th + (yB - yT) * 0.76, 2.6],
        [xL + s * 0.1, yB + s * 0.03, 1.1],
      ] as const) {
        ctx.save();
        ctx.translate(cx2, cy2);
        ctx.rotate(rot);
        ctx.fillRect(-s * 0.032, -s * 0.011, s * 0.064, s * 0.022);
        ctx.restore();
      }
      // Sawdust lifts off the vise cut while the work is live.
      if (act > 0.04) {
        for (let i = 0; i < 3; i++) {
          const ph = (t * (0.8 + i * 0.27) + h * 0.13 + i * 0.37) % 1;
          ctx.fillStyle = `rgba(216, 192, 138, ${(1 - ph) * act * 0.6})`;
          ctx.fillRect(
            vx - s * 0.1 + Math.sin(t * 2 + i * 2.2) * s * 0.03 + i * s * 0.04,
            vy - s * 0.4 - ph * s * 0.22,
            s * 0.022,
            s * 0.022,
          );
        }
      }
      // A plumb line hangs off the south rim, never quite
      // still — the maker's mark of a bench in use.
      const sway =
        Math.sin(t * 1.6 + h) * s * 0.03 * (1 + act * 1.6) +
        Math.sin(t * 4.3 + h * 2) * s * 0.02 * act;
      const nx = xL + s * 0.12;
      const ny = yB - th + s * 0.02;
      ctx.strokeStyle = 'rgba(224, 214, 186, 0.7)';
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.quadraticCurveTo(nx + sway * 0.4, ny + s * 0.1, nx + sway, ny + s * 0.19);
      ctx.stroke();
      ctx.fillStyle = '#3a3544';
      ctx.beginPath();
      facetCircle(ctx, nx + sway, ny + s * 0.22, s * 0.028, 4, Math.PI / 4);
      ctx.fill();
    },
  };
}

function paintChestWood(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, t, stationBody, tile, tx, ty } = env;
  // Loot chests — see THE CHEST GRAMMAR v2 above the painters.
  // The tile is the state; chestOpenness eases the two-beat
  // swing between the closed and open tiles.
  const info = chestInfo(tile)!;
  const kind = info.kind;
  const baseY = p.y + s * rend.camera.yScale * 0.3;
  const halfW = kind === 'boss' ? 0.5 : 0.44;
  return {
    sortY: ty + 0.85,
    body: stationBody(halfW + 0.42, kind === 'boss' ? 1.6 : 1.4, 0.6),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - halfW * s, baseY, p.x + halfW * s, baseY, kind === 'boss' ? 0.66 : 0.55);
    },
    draw: () => {
      // Draw-time ctx capture: the ring bake swaps rend.ctx to
      // its scratch — a build-time capture paints past it.
      const ctx2 = rend.ctx;
      const o = rend.chestOpenness(tx, ty, info.open);
      // Every chest owns its ground.
      ctx2.fillStyle = 'rgba(18, 12, 26, 0.24)';
      ctx2.fillRect(p.x - halfW * s, baseY - s * 0.015, halfW * 2 * s, s * 0.05);
      if (kind === 'wood') rend.drawChestWood(ctx2, p.x, baseY, s, o);
      else if (kind === 'mossy') rend.drawChestMossy(ctx2, p.x, baseY, s, o);
      else if (kind === 'iron') rend.drawChestIron(ctx2, p.x, baseY, s, o);
      else if (kind === 'gilded') rend.drawChestGilded(ctx2, p.x, baseY, s, o, t, h);
      else rend.drawChestBoss(ctx2, p.x, baseY, s, o, t, h);
    },
  };
}

function paintBankChest(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.26;
  // Treasure breathes: the lid seam leaks a slow pulse of gold.
  const gleam = 0.5 + Math.sin(t * 2.1 + h) * 0.3;
  return {
    sortY: ty + 0.85,
    body: stationBody(0.95, 1.2, 0.6),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - s * 0.38, baseY, p.x + s * 0.38, baseY, 0.68);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // A cut-stone plinth — the bank does not set gold on dirt.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
      ctx.fillRect(p.x - s * 0.44, baseY - s * 0.01, s * 0.88, s * 0.045);
      ctx.fillStyle = '#6e6879';
      ctx.beginPath();
      chamferRect(ctx, p.x - s * 0.42, baseY - s * 0.1, s * 0.84, s * 0.1, s * 0.03);
      ctx.fill();
      ctx.fillStyle = shade('#6e6879', 12);
      ctx.fillRect(p.x - s * 0.4, baseY - s * 0.1, s * 0.8, s * 0.03);
      // The strongbox: oak body under a barrel lid. While the
      // bank is open the lid rides the heat envelope up over its
      // back hinge — negative y-scale past halfway means you see
      // its underside standing behind the box, like a real chest.
      const act = rend.stationHeat.get(packTile(tx, ty)) ?? 0;
      const o = act;
      const bodyT = baseY - s * 0.44;
      const lidT = bodyT - s * 0.24;
      ctx.fillStyle = '#7a552e';
      ctx.beginPath();
      chamferRect(ctx, p.x - s * 0.34, bodyT, s * 0.68, s * 0.34, s * 0.03);
      ctx.fill();
      ctx.fillStyle = shade('#7a552e', -10);
      ctx.fillRect(p.x - s * 0.34, baseY - s * 0.16, s * 0.68, s * 0.06);
      // The open mouth: dark felt and the customer's gold.
      if (o > 0.1) {
        ctx.fillStyle = '#241a10';
        ctx.fillRect(p.x - s * 0.31, bodyT + s * 0.005, s * 0.62, s * 0.1);
        ctx.fillStyle = '#d9a441';
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          facetCircle(ctx, p.x - s * 0.21 + i * s * 0.14, bodyT + s * 0.055, s * 0.045, 6, i * 1.2, 0.6);
          ctx.fill();
        }
      }
      const hingeY = lidT + s * 0.01;
      ctx.save();
      ctx.translate(0, hingeY);
      ctx.scale(1, 1 - o * 1.5);
      ctx.translate(0, -hingeY);
      ctx.fillStyle = '#94693a';
      ctx.beginPath();
      chamferRect(ctx, p.x - s * 0.37, lidT, s * 0.74, s * 0.26, [s * 0.1, s * 0.1, s * 0.02, s * 0.02]);
      ctx.fill();
      ctx.fillStyle = shade('#94693a', 14);
      ctx.fillRect(p.x - s * 0.28, lidT + s * 0.02, s * 0.56, s * 0.05);
      ctx.fillStyle = '#3a3544';
      for (const bx of [-0.24, 0.185] as const) {
        ctx.fillRect(p.x + bx * s, lidT + s * 0.015, s * 0.055, s * 0.23);
      }
      ctx.fillStyle = '#8f96a3';
      for (const bx of [-0.24, 0.185] as const) {
        ctx.fillRect(p.x + bx * s + s * 0.014, lidT + s * 0.06, s * 0.028, s * 0.028);
      }
      ctx.fillStyle = '#d9a441';
      ctx.fillRect(p.x - s * 0.37, lidT + s * 0.22, s * 0.74, s * 0.028);
      if (o > 0.5) {
        // Past vertical we're looking at the underside.
        ctx.fillStyle = `rgba(24, 15, 6, ${(o - 0.5) * 0.55})`;
        ctx.fillRect(p.x - s * 0.37, lidT - s * 0.01, s * 0.74, s * 0.28);
      }
      ctx.restore();
      // The seam: lamplight off coin escaping where lid meets
      // box — swallowed by the real light once the lid is up.
      ctx.fillStyle = `rgba(255, 208, 110, ${(0.25 + gleam * 0.3) * (1 - o)})`;
      ctx.fillRect(p.x - s * 0.31, bodyT - s * 0.012, s * 0.62, s * 0.024);
      // Body straps, rivets, and the gold edge band.
      ctx.fillStyle = '#3a3544';
      for (const bx of [-0.24, 0.185] as const) {
        ctx.fillRect(p.x + bx * s, bodyT + s * 0.02, s * 0.055, s * 0.3);
      }
      ctx.fillStyle = '#8f96a3';
      for (const bx of [-0.24, 0.185] as const) {
        for (const by of [bodyT + s * 0.08, bodyT + s * 0.24]) {
          ctx.fillRect(p.x + bx * s + s * 0.014, by, s * 0.028, s * 0.028);
        }
      }
      ctx.fillStyle = '#d9a441';
      ctx.fillRect(p.x - s * 0.34, baseY - s * 0.13, s * 0.68, s * 0.028);
      // Treasure light climbs out of the open box, motes riding
      // it — drawn over the lid so the beam owns the frame.
      if (o > 0.1) {
        ctx.fillStyle = `rgba(255, 208, 110, ${0.2 * o})`;
        ctx.fillRect(p.x - s * 0.26, bodyT - s * 0.46, s * 0.52, s * 0.46);
        ctx.fillStyle = `rgba(255, 232, 168, ${0.11 * o})`;
        ctx.fillRect(p.x - s * 0.15, bodyT - s * 0.72, s * 0.3, s * 0.72);
        for (let i = 0; i < 2; i++) {
          const ph = (t * (0.6 + i * 0.23) + h * 0.11 + i * 0.5) % 1;
          ctx.fillStyle = `rgba(255, 226, 150, ${(1 - ph) * o * 0.8})`;
          ctx.fillRect(
            p.x + Math.sin(t * 1.8 + i * 2.6 + h) * s * 0.12,
            bodyT - ph * s * 0.55,
            s * 0.024,
            s * 0.024,
          );
        }
      }
      // Hasp and padlock: the lock IS the promise. The plate
      // slides off the seam as the lid lifts away from it.
      ctx.fillStyle = '#d9a441';
      ctx.beginPath();
      chamferRect(ctx, p.x - s * 0.065, bodyT - s * 0.07 * (1 - o), s * 0.13, s * 0.15, s * 0.03);
      ctx.fill();
      ctx.strokeStyle = '#c9962e';
      ctx.lineWidth = Math.max(1.5, s * 0.035);
      ctx.beginPath();
      ctx.arc(p.x, bodyT + s * 0.1, s * 0.05, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = '#c9962e';
      ctx.beginPath();
      chamferRect(ctx, p.x - s * 0.055, bodyT + s * 0.1, s * 0.11, s * 0.1, s * 0.02);
      ctx.fill();
      ctx.fillStyle = '#2c2836';
      ctx.fillRect(p.x - s * 0.012, bodyT + s * 0.125, s * 0.024, s * 0.045);
      // Spilled takings on the plinth: coins and one teal gem.
      ctx.fillStyle = '#d9a441';
      for (const [cx2, cy2] of [
        [0.28, -0.035],
        [0.34, -0.055],
        [0.24, -0.07],
      ] as const) {
        ctx.beginPath();
        facetCircle(ctx, p.x + cx2 * s, baseY + cy2 * s - s * 0.02, s * 0.035, 6, cx2 * 9, 0.6);
        ctx.fill();
      }
      ctx.fillStyle = '#7fc9b3';
      ctx.beginPath();
      facetCircle(ctx, p.x - s * 0.3, baseY - s * 0.05, s * 0.035, 5, 0.5, 0.75);
      ctx.fill();
      // Every few beats a glint stars off the gold work.
      const gp = (t * 0.42 + h * 0.19) % 1;
      if (gp < 0.16) {
        const k = Math.sin((gp / 0.16) * Math.PI);
        const gx = p.x + s * ((((h >>> 3) % 5) - 2) * 0.09);
        const gy = lidT + s * 0.23;
        ctx.fillStyle = `rgba(255, 240, 190, ${k * 0.9})`;
        ctx.fillRect(gx - s * 0.05, gy - s * 0.011, s * 0.1, s * 0.022);
        ctx.fillRect(gx - s * 0.011, gy - s * 0.05, s * 0.022, s * 0.1);
      }
    },
  };
}

function paintShopCounter(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.3;
  const topY = baseY - s * 0.56;
  return {
    sortY: ty + 0.9,
    body: stationBody(),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - s * 0.46, baseY, p.x + s * 0.46, baseY, 0.8);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // The scale beam never quite settles — a shop is never
      // done weighing — and while a sale is on, it works harder.
      const act = rend.stationHeat.get(packTile(tx, ty)) ?? 0;
      const tilt =
        Math.sin(t * 0.8 + h) * 0.09 * (1 + act * 0.8) +
        Math.sin(t * 2.7 + h * 2) * 0.05 * act;
      // Paneled counter: plinth foot, rail-and-stile front, then
      // the slab. Joinery reads as an established business.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
      ctx.fillRect(p.x - s * 0.44, baseY - s * 0.015, s * 0.88, s * 0.045);
      ctx.fillStyle = '#4a3116';
      ctx.fillRect(p.x - s * 0.43, baseY - s * 0.07, s * 0.86, s * 0.07);
      ctx.fillStyle = '#5e3f1e';
      ctx.fillRect(p.x - s * 0.41, topY, s * 0.82, baseY - s * 0.07 - topY);
      ctx.fillStyle = shade('#5e3f1e', -12);
      for (const px2 of [-0.35, 0.05] as const) {
        ctx.fillRect(p.x + px2 * s, topY + s * 0.1, s * 0.3, s * 0.3);
      }
      ctx.fillStyle = shade('#5e3f1e', 10);
      for (const px2 of [-0.35, 0.05] as const) {
        ctx.fillRect(p.x + px2 * s, topY + s * 0.1, s * 0.3, s * 0.025);
      }
      // The slab overhangs with a bright working face.
      ctx.fillStyle = '#a5793f';
      ctx.beginPath();
      chamferRect(ctx, p.x - s * 0.47, topY - s * 0.14, s * 0.94, s * 0.16, s * 0.04);
      ctx.fill();
      ctx.fillStyle = shade('#a5793f', 14);
      ctx.fillRect(p.x - s * 0.43, topY - s * 0.12, s * 0.86, s * 0.045);
      // The merchant's runner: good cloth under the scale says
      // the prices here are honest.
      ctx.fillStyle = '#8a3d3d';
      ctx.fillRect(p.x - s * 0.22, topY - s * 0.145, s * 0.32, s * 0.05);
      ctx.fillRect(p.x - s * 0.18, topY - s * 0.1, s * 0.24, s * 0.2);
      ctx.fillStyle = shade('#8a3d3d', -12);
      ctx.fillRect(p.x - s * 0.18, topY + s * 0.045, s * 0.24, s * 0.055);
      ctx.fillStyle = shade('#8a3d3d', 8);
      ctx.fillRect(p.x - s * 0.18, topY - s * 0.1, s * 0.045, s * 0.2);
      // The balance: post and finial, a tilting beam, pans hung
      // plumb from its tips whatever the beam is doing.
      const bx = p.x - s * 0.06;
      const postT = topY - s * 0.48;
      ctx.fillStyle = '#3a3544';
      ctx.fillRect(bx - s * 0.02, postT, s * 0.04, s * 0.34);
      ctx.beginPath();
      facetCircle(ctx, bx, postT, s * 0.035, 6, 0.3);
      ctx.fill();
      ctx.save();
      ctx.translate(bx, postT + s * 0.03);
      ctx.rotate(tilt);
      ctx.fillStyle = '#6a6577';
      ctx.fillRect(-s * 0.2, -s * 0.016, s * 0.4, s * 0.032);
      for (const side of [-1, 1] as const) {
        ctx.save();
        ctx.translate(side * s * 0.19, 0);
        ctx.rotate(-tilt);
        ctx.strokeStyle = 'rgba(200, 200, 210, 0.6)';
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, s * 0.13);
        ctx.stroke();
        ctx.fillStyle = '#8f96a3';
        ctx.beginPath();
        facetCircle(ctx, 0, s * 0.14, s * 0.065, 6, 0.2, 0.45);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      // Brass weights beside the post; the till's coin columns
      // stacked east, each coin its own struck edge.
      ctx.fillStyle = '#c9962e';
      ctx.fillRect(p.x + s * 0.08, topY - s * 0.18, s * 0.05, s * 0.05);
      ctx.fillRect(p.x + s * 0.14, topY - s * 0.155, s * 0.038, s * 0.038);
      for (const [colX, n] of [
        [0.26, 3],
        [0.36, 2],
        [0.31, 4],
      ] as const) {
        for (let i = 0; i < n; i++) {
          ctx.fillStyle = i === n - 1 ? '#e8bc5a' : '#d9a441';
          ctx.fillRect(
            p.x + colX * s - s * 0.05 + ((h >> i) % 3) * s * 0.006,
            topY - s * 0.15 - i * s * 0.032,
            s * 0.1,
            s * 0.028,
          );
        }
      }
      // The ledger lies open west, quill standing in its pot —
      // every sale gets written down.
      ctx.fillStyle = '#e8dfc8';
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.42, topY - s * 0.14);
      ctx.lineTo(p.x - s * 0.28, topY - s * 0.165);
      ctx.lineTo(p.x - s * 0.26, topY - s * 0.08);
      ctx.lineTo(p.x - s * 0.4, topY - s * 0.06);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(36, 22, 10, 0.4)';
      ctx.fillRect(p.x - s * 0.35, topY - s * 0.15, s * 0.015, s * 0.085);
      ctx.fillStyle = '#2c2836';
      ctx.fillRect(p.x - s * 0.24, topY - s * 0.2, s * 0.05, s * 0.06);
      ctx.strokeStyle = '#d8d2c2';
      ctx.lineWidth = Math.max(1, s * 0.018);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.215, topY - s * 0.2);
      ctx.quadraticCurveTo(p.x - s * 0.19, topY - s * 0.3, p.x - s * 0.14, topY - s * 0.33);
      ctx.stroke();
      // A SALE IN PROGRESS: a coin arcs from the pan to the till
      // and the stacked gold catches the light more often.
      if (act > 0.04) {
        const ph = (t * 0.85 + h * 0.07) % 1;
        ctx.fillStyle = `rgba(232, 188, 90, ${Math.min(1, act * 1.4)})`;
        ctx.beginPath();
        facetCircle(
          ctx,
          p.x - s * 0.25 + ph * s * 0.56,
          topY - s * 0.32 - Math.sin(ph * Math.PI) * s * 0.22 + ph * s * 0.1,
          s * 0.032,
          6,
          ph * 7,
          0.7,
        );
        ctx.fill();
        const gp2 = (t * 0.9 + h * 0.23) % 1;
        if (gp2 < 0.2) {
          const k2 = Math.sin((gp2 / 0.2) * Math.PI) * act;
          ctx.fillStyle = `rgba(255, 240, 190, ${k2 * 0.9})`;
          ctx.fillRect(p.x + s * 0.265, topY - s * 0.27, s * 0.09, s * 0.02);
          ctx.fillRect(p.x + s * 0.3, topY - s * 0.305, s * 0.02, s * 0.09);
        }
      }
    },
  };
}

function paintTimberPost(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, stationBody, ty } = env;
  // THE PORCH's corner bones: a hewn post, blocky per the
  // masterwork laws — squared plinth, squared shaft with one
  // sun-law lit facet, a cap whose TOP PLANE foreshortens (the
  // crate-lid grammar). The silhouette ring comes from the
  // cached ring pass alone.
  const syT = s * rend.camera.yScale;
  const base = '#6e4b29';
  const lit = '#8a6534';
  const bx = p.x;
  const footY = p.y + syT * 0.3;
  const shaftW = s * 0.17;
  const plinthW = s * 0.3;
  const capW = s * 0.26;
  const postH = s * 1.68;
  const capH = s * 0.1;
  const plinthH = s * 0.13;
  const capY = footY - postH;
  return {
    sortY: ty + 0.62,
    body: stationBody(0.45, 1.9, 0.5),
    drawShadow: () =>
      rend.castEdgeQuad(bx - shaftW / 2, footY, bx + shaftW / 2, footY, 1.5),
    draw: () => {
      const ctx = rend.ctx;
      // Contact shade seats the post.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.24)';
      ctx.beginPath();
      ctx.ellipse(bx, footY + s * 0.015, plinthW * 0.68, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      // Plinth block.
      ctx.fillStyle = shade(base, -10);
      ctx.fillRect(bx - plinthW / 2, footY - plinthH, plinthW, plinthH);
      ctx.fillStyle = shade(base, 8);
      ctx.fillRect(bx - plinthW / 2, footY - plinthH, plinthW, s * 0.03);
      // Shaft with the sun-law lit west facet and a peg band.
      ctx.fillStyle = base;
      ctx.fillRect(bx - shaftW / 2, capY + capH, shaftW, postH - capH - plinthH);
      ctx.fillStyle = lit;
      ctx.fillRect(bx - shaftW / 2, capY + capH, s * 0.055, postH - capH - plinthH);
      ctx.fillStyle = shade(base, -22);
      ctx.fillRect(bx - shaftW / 2, capY + capH + s * 0.16, shaftW, s * 0.045);
      // Cap block, its top plane foreshortened to the camera.
      ctx.fillStyle = shade(base, -4);
      ctx.fillRect(bx - capW / 2, capY, capW, capH);
      ctx.fillStyle = shade(lit, 18);
      ctx.fillRect(bx - capW / 2, capY - syT * 0.09, capW, syT * 0.09);
      ctx.fillStyle = 'rgba(24, 15, 6, 0.3)';
      ctx.fillRect(bx - capW / 2, capY - syT * 0.09, capW, s * 0.02);
      // NO manual ring: the post rides CACHED_RING_TILES, whose
      // dilate pass already rings the stepped silhouette — the
      // struct stroke on top doubled the ink into a fat crayon
      // edge on a thin post (the museum audit's worst offender).
    },
  };
}

export const STATIONS_PROPS: PropEntries = [
  [[Tile.Well], paintWell],
  [[Tile.Sawhorse], paintSawhorse],
  [[Tile.EnchantingTable], paintEnchantingTable],
  [[Tile.Furnace], paintFurnace],
  [[Tile.Anvil], paintAnvil],
  [[Tile.Workbench], paintWorkbench],
  [[Tile.ChestWood, Tile.ChestWoodOpen, Tile.ChestMossy, Tile.ChestMossyOpen, Tile.ChestIron, Tile.ChestIronOpen, Tile.ChestGilded, Tile.ChestGildedOpen, Tile.ChestBoss, Tile.ChestBossOpen], paintChestWood],
  [[Tile.BankChest], paintBankChest],
  [[Tile.ShopCounter], paintShopCounter],
  [[Tile.TimberPost], paintTimberPost],
];
