/**
 * THE HEARTH ROOM — tables, thrones, beds, bookshelves: house furniture.
 * Extracted verbatim from renderer.ts's objectItem (THE PROP HALL,
 * foundations F1) — each painter is one former switch case; the frame
 * and host contracts live in ./types.ts.
 */
import { windAtInto } from '../grass.js';
import { packTile } from '../interiors.js';
import { AWNING_CLOTHS, STALL_BANNERS, TRD_STEEL, TRD_STEEL_LIT, WALL_TILES, WIND_TMP, twinkle } from '../paintVocab.js';
import { shade } from '../rig.js';
import { chamferRect, facetBlob, facetCircle } from '../shapes.js';
import { GARDEN_DYES } from './palette.js';
import { BED_RUN_CAP, Tile, bannerStandInfo, hashCoords } from '@arx/shared';
import type { DrawItem } from '../renderer.js';
import type { PropEntries, PropFrame, PropHost } from './types.js';


function paintTable(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, game, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const isRun = (t2: number | undefined) => t2 === Tile.Table;
  const jn = isRun(game.world.groundAt(tx, ty - 1));
  const je = isRun(game.world.groundAt(tx + 1, ty));
  const js = isRun(game.world.groundAt(tx, ty + 1));
  const jw = isRun(game.world.groundAt(tx - 1, ty));
  // A dining board just under the waist; adjacent tiles merge so
  // a hall's long table reads as ONE built piece of furniture.
  // The top is a deeper honey than the floorboards — furniture
  // must separate from the floor it stands on.
  const th = s * 0.52;
  const topC = '#9c7040';
  const legC = '#6f4d26';
  const xL = p.x - s * 0.5 + (jw ? -0.5 : s * 0.09);
  const xR = p.x + s * 0.5 + (je ? 0.5 : -s * 0.09);
  const yT = p.y - syT * 0.5 + (jn ? -0.5 : syT * 0.12);
  const yB = p.y + syT * 0.5 + (js ? 0.5 : -syT * 0.1);
  return {
    sortY: ty + 0.72,
    body: jn || je || js || jw ? undefined : stationBody(0.85, 1.1, 0.5),
    drawShadow: js
      ? undefined
      : () => rend.castEdgeQuad(xL, yB + syT * 0.08, xR, yB + syT * 0.08, 0.4),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      const lh = th + syT * 0.05;
      // A trestle leg: tapered post flaring into a splayed foot
      // with a shaded pad — carpentry, not table-shaped sticks.
      const leg = (lx: number, ly: number, hgt: number) => {
        ctx.fillStyle = legC;
        ctx.beginPath();
        ctx.moveTo(lx - s * 0.038, ly - hgt);
        ctx.lineTo(lx + s * 0.038, ly - hgt);
        ctx.lineTo(lx + s * 0.028, ly - s * 0.06);
        ctx.lineTo(lx + s * 0.052, ly);
        ctx.lineTo(lx - s * 0.052, ly);
        ctx.lineTo(lx - s * 0.028, ly - s * 0.06);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(legC, -14);
        ctx.fillRect(lx - s * 0.052, ly - s * 0.02, s * 0.104, s * 0.02);
      };
      // Contact shade under the standing edge.
      if (!js) {
        ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
        ctx.fillRect(xL + s * 0.01, yB + s * 0.005, xR - xL - s * 0.02, s * 0.04);
      }
      if (!jw) {
        leg(xL + s * 0.06, yB, lh);
        if (!jn) leg(xL + s * 0.06, yT + syT * 0.16, lh * 0.92);
      }
      if (!je) {
        leg(xR - s * 0.06, yB, lh);
        if (!jn) leg(xR - s * 0.06, yT + syT * 0.16, lh * 0.92);
      }
      // A low stretcher ties a lone table's trestles together.
      if (!jw && !je) {
        ctx.fillStyle = shade(legC, -8);
        ctx.fillRect(xL + s * 0.09, yB - th * 0.42, xR - xL - s * 0.18, s * 0.045);
      }
      // Pegged apron under the front rim.
      if (!js) {
        ctx.fillStyle = shade(legC, -4);
        ctx.fillRect(xL, yB - th, xR - xL, s * 0.09);
        ctx.fillStyle = 'rgba(36, 22, 10, 0.5)';
        ctx.fillRect(xL + s * 0.14, yB - th + s * 0.032, s * 0.025, s * 0.025);
        ctx.fillRect(xR - s * 0.165, yB - th + s * 0.032, s * 0.025, s * 0.025);
      }
      // The top: one long slab, grounded by a dark rim so it
      // never melts into same-lumber floorboards (the ore law:
      // masses get a grounding outline or they vanish).
      ctx.fillStyle = topC;
      ctx.beginPath();
      chamferRect(ctx, xL - s * 0.02, yT - th, xR - xL + s * 0.04, yB - yT, [
        jn || jw ? 0 : s * 0.05,
        jn || je ? 0 : s * 0.05,
        js || je ? 0 : s * 0.05,
        js || jw ? 0 : s * 0.05,
      ]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1.2, s * 0.028);
      ctx.stroke();
      // ...built of long boards: two seams run with the grain,
      // and free ends wear a breadboard cap across it.
      const seamL = xL + (jw ? 0 : s * 0.1);
      const seamR = xR - (je ? 0 : s * 0.1);
      ctx.fillStyle = 'rgba(36, 22, 10, 0.2)';
      for (const fy of [0.36, 0.68] as const) {
        ctx.fillRect(seamL, yT - th + (yB - yT) * fy, seamR - seamL, s * 0.018);
      }
      if (!jw) {
        ctx.fillStyle = shade(topC, -6);
        ctx.fillRect(xL - s * 0.02, yT - th, s * 0.1, yB - yT);
        ctx.fillStyle = 'rgba(36, 22, 10, 0.3)';
        ctx.fillRect(xL + s * 0.08, yT - th + s * 0.02, s * 0.018, yB - yT - s * 0.04);
      }
      if (!je) {
        ctx.fillStyle = shade(topC, -6);
        ctx.fillRect(xR - s * 0.08, yT - th, s * 0.1, yB - yT);
        ctx.fillStyle = 'rgba(36, 22, 10, 0.3)';
        ctx.fillRect(xR - s * 0.098, yT - th + s * 0.02, s * 0.018, yB - yT - s * 0.04);
      }
      // Faint grain streaks, hash-strewn so no two boards match.
      ctx.fillStyle = 'rgba(36, 22, 10, 0.12)';
      for (let k = 0; k < 3; k++) {
        const hh = hashCoords(67 + k, tx, ty);
        const gy2 = yT - th + (0.12 + ((hh >> 3) % 70) / 100) * (yB - yT);
        ctx.fillRect(p.x - s * 0.36 + ((hh % 40) / 100) * s, gy2, s * (0.12 + (hh % 3) * 0.05), s * 0.014);
      }
      // Lit south lip carries the slab's thickness; the far edge
      // falls away into shade.
      if (!js) {
        ctx.fillStyle = shade(topC, 14);
        ctx.fillRect(xL - s * 0.02, yB - th - s * 0.045, xR - xL + s * 0.04, s * 0.045);
      }
      if (!jn) {
        ctx.fillStyle = shade(topC, -8);
        ctx.fillRect(xL - s * 0.02, yT - th, xR - xL + s * 0.04, s * 0.03);
      }
      // What's ON the table — hash-dealt per tile, so a long inn
      // board is set with different life at every seat. Candles
      // roll separately: about a third of tables keep one, so
      // evening halls always have flames on the boards.
      const cx = p.x + ((((h >> 5) % 24) - 12) / 100) * s;
      const cy = p.y - th + ((((h >> 8) % 20) - 10) / 100) * syT;
      const dress = h % 4;
      if ((h >> 11) % 3 === 0) {
        // A brass candlestick — the keeper lights it at dusk.
        const ccx = p.x + (h & 1 ? s * 0.29 : -s * 0.29);
        const ccy = p.y - th + (h & 2 ? syT * 0.12 : -syT * 0.12);
        const lit = rend.sky.flame;
        ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
        ctx.beginPath();
        ctx.ellipse(ccx, ccy + s * 0.015, s * 0.075, s * 0.028, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c9962e';
        ctx.beginPath();
        facetCircle(ctx, ccx, ccy, s * 0.065, 6, 0.3, 0.5);
        ctx.fill();
        ctx.fillStyle = shade('#c9962e', -14);
        ctx.fillRect(ccx - s * 0.02, ccy - s * 0.035, s * 0.04, s * 0.035);
        ctx.fillStyle = '#e8dfc8';
        ctx.fillRect(ccx - s * 0.024, ccy - s * 0.15, s * 0.048, s * 0.12);
        ctx.fillStyle = shade('#e8dfc8', -12);
        ctx.fillRect(ccx + s * 0.006, ccy - s * 0.15, s * 0.018, s * 0.12);
        // A wax drip run down the shoulder.
        ctx.fillStyle = '#f4efe0';
        ctx.fillRect(ccx - s * 0.032, ccy - s * 0.13, s * 0.014, s * 0.05);
        if (lit > 0.05) {
          const flick = 0.85 + Math.sin(t * 11 + h) * 0.12 + Math.sin(t * 23 + h * 3) * 0.05;
          ctx.fillStyle = `rgba(255, 205, 120, ${Math.min(1, 0.95 * lit * flick)})`;
          ctx.beginPath();
          ctx.moveTo(ccx, ccy - s * 0.15);
          ctx.quadraticCurveTo(ccx - s * 0.042, ccy - s * 0.21, ccx, ccy - s * (0.3 + 0.025 * flick));
          ctx.quadraticCurveTo(ccx + s * 0.042, ccy - s * 0.21, ccx, ccy - s * 0.15);
          ctx.fill();
          ctx.fillStyle = `rgba(255, 246, 214, ${Math.min(1, 0.9 * lit * flick)})`;
          ctx.beginPath();
          facetCircle(ctx, ccx, ccy - s * 0.195, s * 0.022, 6, 0.4);
          ctx.fill();
          // No queueGlow here: this paint runs only on re-bake
          // frames (Table is a run-ring baked prop), so a glow
          // queued from it strobes at cadence rate. The candle's
          // bloom lives in collectStaticLights — the live pass.
        } else {
          // Daylight: a cold black wick.
          ctx.fillStyle = '#2c2836';
          ctx.fillRect(ccx - s * 0.005, ccy - s * 0.178, s * 0.01, s * 0.03);
        }
      }
      if (dress === 0) {
        // Stoneware left mid-conversation: a jug and a cup.
        ctx.fillStyle = '#7d84a0';
        ctx.beginPath();
        chamferRect(ctx, cx - s * 0.14, cy - s * 0.17, s * 0.11, s * 0.16, [s * 0.025, s * 0.025, 0, 0]);
        ctx.fill();
        ctx.fillStyle = shade('#7d84a0', 12);
        ctx.fillRect(cx - s * 0.14, cy - s * 0.17, s * 0.035, s * 0.16);
        ctx.fillStyle = shade('#7d84a0', -16);
        ctx.fillRect(cx - s * 0.125, cy - s * 0.185, s * 0.08, s * 0.03);
        ctx.fillStyle = '#96746a';
        ctx.fillRect(cx + s * 0.03, cy - s * 0.1, s * 0.075, s * 0.09);
        ctx.fillStyle = shade('#96746a', -14);
        ctx.fillRect(cx + s * 0.03, cy - s * 0.1, s * 0.075, s * 0.02);
      } else if (dress === 1) {
        // A turned wooden bowl; some nights it still holds fruit.
        ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + s * 0.01, s * 0.13, s * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8a6534';
        ctx.beginPath();
        facetCircle(ctx, cx, cy - s * 0.035, s * 0.13, 7, 0.2, 0.55);
        ctx.fill();
        ctx.fillStyle = '#5e3f1e';
        ctx.beginPath();
        facetCircle(ctx, cx, cy - s * 0.04, s * 0.095, 7, 0.2, 0.55);
        ctx.fill();
        if ((h >> 6) & 1) {
          for (const [ox, oy, tone] of [
            [-0.045, -0.055, '#b5493e'],
            [0.04, -0.05, '#a33d33'],
            [0, -0.085, '#c96a28'],
          ] as const) {
            ctx.fillStyle = tone;
            ctx.beginPath();
            facetCircle(ctx, cx + ox * s, cy + oy * s, s * 0.042, 6, 0.4);
            ctx.fill();
          }
        }
      } else if (dress === 2) {
        // A good cloth runner laid across the boards.
        ctx.fillStyle = '#8a3d3d';
        ctx.fillRect(cx - s * 0.3, cy - syT * 0.16, s * 0.6, syT * 0.32);
        ctx.fillStyle = shade('#8a3d3d', -12);
        ctx.fillRect(cx - s * 0.3, cy + syT * 0.1, s * 0.6, s * 0.03);
        ctx.fillStyle = shade('#8a3d3d', 8);
        ctx.fillRect(cx - s * 0.3, cy - syT * 0.16, s * 0.6, s * 0.022);
        // End fringe ticks.
        ctx.fillStyle = '#d8c9a0';
        for (let k = 0; k < 4; k++) {
          const fy2 = cy - syT * 0.13 + k * syT * 0.075;
          ctx.fillRect(cx - s * 0.34, fy2, s * 0.04, s * 0.02);
          ctx.fillRect(cx + s * 0.3, fy2, s * 0.04, s * 0.02);
        }
      }
    },
  };
}

function paintCounter(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, game, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const isRun = (t2: number | undefined) => t2 === Tile.Counter;
  const jn = isRun(game.world.groundAt(tx, ty - 1));
  const je = isRun(game.world.groundAt(tx + 1, ty));
  const js = isRun(game.world.groundAt(tx, ty + 1));
  const jw = isRun(game.world.groundAt(tx - 1, ty));
  // Waist-high service joinery from the ShopCounter's family:
  // dark plinth, recessed panels, a bright overhung slab.
  const th = s * 0.82;
  const bodyC = '#5e3f1e';
  const topC = '#a5793f';
  const xL = p.x - s * 0.5 + (jw ? -0.5 : s * 0.09);
  const xR = p.x + s * 0.5 + (je ? 0.5 : -s * 0.09);
  const yT = p.y - syT * 0.5 + (jn ? -0.5 : syT * 0.12);
  const yB = p.y + syT * 0.5 + (js ? 0.5 : -syT * 0.1);
  return {
    sortY: ty + 0.72,
    body: jn || je || js || jw ? undefined : stationBody(0.85, 1.4, 0.5),
    drawShadow: js
      ? undefined
      : () => rend.castEdgeQuad(xL, yB + syT * 0.08, xR, yB + syT * 0.08, 0.55),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      if (!js) {
        // Contact shade, then the south face's joinery stack.
        ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
        ctx.fillRect(xL, yB + s * 0.012, xR - xL, s * 0.045);
        ctx.fillStyle = '#4a3116';
        ctx.fillRect(xL, yB - s * 0.09, xR - xL, s * 0.09 + syT * 0.08);
        ctx.fillStyle = bodyC;
        ctx.fillRect(xL, yB - th, xR - xL, th - s * 0.09);
        // Two shallow recessed panels per tile keep the run's
        // rhythm — set in, never so deep they read as openings.
        const panL = p.x - s * 0.32 + (jw ? 0 : s * 0.045);
        const panR = p.x + s * 0.32 - (je ? 0 : s * 0.045);
        const panW = (panR - panL - s * 0.07) / 2;
        for (const px2 of [panL, panL + panW + s * 0.07] as const) {
          ctx.fillStyle = shade(bodyC, -9);
          ctx.fillRect(px2, yB - th + s * 0.16, panW, th - s * 0.46);
          ctx.fillStyle = shade(bodyC, 9);
          ctx.fillRect(px2, yB - th + s * 0.16, panW, s * 0.022);
          ctx.fillStyle = 'rgba(36, 22, 10, 0.28)';
          ctx.fillRect(px2, yB - s * 0.32, panW, s * 0.02);
        }
        // A brass foot rail on brackets — patrons rest a boot on
        // it and it wears bright.
        ctx.fillStyle = '#8a6534';
        ctx.fillRect(xL + s * 0.05, yB - s * 0.17, s * 0.03, s * 0.1);
        ctx.fillRect(xR - s * 0.08, yB - s * 0.17, s * 0.03, s * 0.1);
        ctx.fillStyle = '#c9962e';
        ctx.fillRect(xL + s * 0.02, yB - s * 0.185, xR - xL - s * 0.04, s * 0.035);
        ctx.fillStyle = shade('#c9962e', 18);
        ctx.fillRect(xL + s * 0.02, yB - s * 0.185, xR - xL - s * 0.04, s * 0.014);
      }
      // Free ends close with a lit west / shaded east stile.
      if (!jw) {
        ctx.fillStyle = shade(bodyC, 8);
        ctx.fillRect(xL, yB - th, s * 0.05, th);
      }
      if (!je) {
        ctx.fillStyle = shade(bodyC, -14);
        ctx.fillRect(xR - s * 0.05, yB - th, s * 0.05, th);
      }
      // The slab overhangs its casework all round, rimmed dark
      // so it reads over floorboards.
      ctx.fillStyle = topC;
      ctx.beginPath();
      chamferRect(ctx, xL - s * 0.035, yT - th, xR - xL + s * 0.07, yB - yT, [
        jn || jw ? 0 : s * 0.05,
        jn || je ? 0 : s * 0.05,
        js || je ? 0 : s * 0.05,
        js || jw ? 0 : s * 0.05,
      ]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1.2, s * 0.028);
      ctx.stroke();
      // A board seam runs the slab's length.
      ctx.fillStyle = 'rgba(36, 22, 10, 0.18)';
      ctx.fillRect(
        xL + (jw ? 0 : s * 0.05),
        yT - th + (yB - yT) * 0.52,
        xR - xL - (jw ? 0 : s * 0.05) - (je ? 0 : s * 0.05),
        s * 0.018,
      );
      if (!js) {
        ctx.fillStyle = shade(topC, 14);
        ctx.fillRect(xL - s * 0.035, yB - th - s * 0.045, xR - xL + s * 0.07, s * 0.045);
      }
      if (!jn) {
        // Back-edge shading: the keeper's side falls away.
        ctx.fillStyle = shade(topC, -8);
        ctx.fillRect(xL - s * 0.035, yT - th, xR - xL + s * 0.07, s * 0.035);
      }
      // Barwork on top, dealt per tile: a folded service cloth
      // under a pewter tankard, stray mugs, or wiped clean.
      const cx = p.x + ((((h >> 6) % 28) - 14) / 100) * s;
      const cy = p.y - th + ((((h >> 9) % 20) - 10) / 100) * syT;
      const dress = h % 3;
      if (dress === 0) {
        ctx.fillStyle = '#e8dfc8';
        ctx.beginPath();
        chamferRect(ctx, cx - s * 0.16, cy - s * 0.05, s * 0.24, s * 0.1, s * 0.02);
        ctx.fill();
        ctx.fillStyle = shade('#e8dfc8', -10);
        ctx.fillRect(cx - s * 0.16, cy - s * 0.005, s * 0.24, s * 0.045);
        const mx = cx + s * 0.14;
        ctx.fillStyle = '#6a6577';
        ctx.fillRect(mx - s * 0.045, cy - s * 0.15, s * 0.09, s * 0.13);
        ctx.fillStyle = shade('#6a6577', 12);
        ctx.fillRect(mx - s * 0.045, cy - s * 0.15, s * 0.03, s * 0.13);
        ctx.fillStyle = shade('#6a6577', -16);
        ctx.fillRect(mx - s * 0.045, cy - s * 0.155, s * 0.09, s * 0.022);
        ctx.strokeStyle = '#6a6577';
        ctx.lineWidth = Math.max(1, s * 0.022);
        ctx.beginPath();
        ctx.arc(mx + s * 0.055, cy - s * 0.085, s * 0.035, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
      } else if (dress === 1) {
        // Two stoneware mugs left by the last pair of patrons.
        for (const [ox, tone] of [
          [-0.07, '#7d84a0'],
          [0.06, '#96746a'],
        ] as const) {
          ctx.fillStyle = tone;
          ctx.fillRect(cx + ox * s - s * 0.038, cy - s * 0.11, s * 0.076, s * 0.1);
          ctx.fillStyle = shade(tone, -14);
          ctx.fillRect(cx + ox * s - s * 0.038, cy - s * 0.11, s * 0.076, s * 0.02);
          ctx.fillStyle = shade(tone, 10);
          ctx.fillRect(cx + ox * s - s * 0.038, cy - s * 0.09, s * 0.022, s * 0.08);
        }
      }
    },
  };
}

function paintBench(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, stationBody, game, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const isRun = (t2: number | undefined) => t2 === Tile.Bench;
  const je = isRun(game.world.groundAt(tx + 1, ty));
  const jw = isRun(game.world.groundAt(tx - 1, ty));
  // Knee height — a seat, not a curb. THE HONEST-ANGLE LAW (the
  // chair's law) applies to the pew too: the seat is a receding
  // quad between TWO floor lines, and each free end stands a
  // NEAR trestle on the low line with a FAR trestle peeking in
  // the under-seat gap behind it.
  const th = s * 0.36;
  const dz = syT * 0.34; // seat depth, foreshortened
  const yNr = p.y + syT * 0.3; // near feet floor line
  const yFr = yNr - dz; // far feet floor line
  const seatC = '#94693a';
  const legC = '#6f4d26';
  const xL = p.x - s * 0.5 + (jw ? -0.5 : s * 0.12);
  const xR = p.x + s * 0.5 + (je ? 0.5 : -s * 0.12);
  return {
    sortY: ty + 0.68,
    body: je || jw ? undefined : stationBody(0.75, 0.75, 0.45),
    drawShadow: () => rend.castEdgeQuad(xL, yNr, xR, yNr, 0.28),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // Splayed trestle ends — a pew stands on real feet, four
      // of them, two per end on their own floor lines. flip
      // mirrors the splay so both ends lean outward.
      const trestle = (lx: number, flip: number, footY: number, tone: string) => {
        ctx.fillStyle = tone;
        ctx.beginPath();
        ctx.moveTo(lx - s * 0.035 * flip, footY - th);
        ctx.lineTo(lx + s * 0.045 * flip, footY - th);
        ctx.lineTo(lx + s * 0.075 * flip, footY);
        ctx.lineTo(lx - s * 0.005 * flip, footY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(tone, -14);
        const fx0 = flip > 0 ? lx - s * 0.01 : lx - s * 0.075;
        ctx.fillRect(fx0, footY - s * 0.02, s * 0.085, s * 0.02);
      };
      // Contact pool under the whole standing footprint.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse((xL + xR) / 2, yNr - dz * 0.4, (xR - xL) * 0.52, dz * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
      // Far trestles first — their stubs live in the under-seat
      // gap; the seat buries the rest.
      if (!jw) trestle(xL + s * 0.05, 1, yFr, shade(legC, -10));
      if (!je) trestle(xR - s * 0.05, -1, yFr, shade(legC, -10));
      // Stretcher rails tie the ends: the near rail full, the
      // far rail a dim line above it in the gap.
      if (!jw && !je) {
        ctx.fillStyle = shade(legC, -14);
        ctx.fillRect(xL + s * 0.1, yFr - th * 0.42, xR - xL - s * 0.2, s * 0.032);
        ctx.fillStyle = shade(legC, -8);
        ctx.fillRect(xL + s * 0.1, yNr - th * 0.46, xR - xL - s * 0.2, s * 0.04);
      }
      if (!jw) trestle(xL + s * 0.05, 1, yNr, legC);
      if (!je) trestle(xR - s * 0.05, -1, yNr, legC);
      // The seat: a thick slab — edge face below, RECEDING top
      // above, spanning the two floor lines.
      ctx.fillStyle = shade(seatC, -14);
      ctx.fillRect(xL, yNr - th, xR - xL, s * 0.065);
      ctx.fillStyle = seatC;
      ctx.beginPath();
      chamferRect(ctx, xL, yNr - th - dz, xR - xL, dz, [
        jw ? 0 : s * 0.04,
        je ? 0 : s * 0.04,
        je ? 0 : s * 0.04,
        jw ? 0 : s * 0.04,
      ]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.3)';
      ctx.lineWidth = Math.max(1, s * 0.024);
      ctx.stroke();
      // End-grain caps at free ends; a seam runs with the grain;
      // the far rim falls to shade; the near arris is sat-smooth
      // and catches the light.
      if (!jw) {
        ctx.fillStyle = shade(seatC, -8);
        ctx.fillRect(xL, yNr - th - dz, s * 0.055, dz);
      }
      if (!je) {
        ctx.fillStyle = shade(seatC, -8);
        ctx.fillRect(xR - s * 0.055, yNr - th - dz, s * 0.055, dz);
      }
      ctx.fillStyle = 'rgba(36, 22, 10, 0.16)';
      ctx.fillRect(xL + s * 0.06, yNr - th - dz * 0.42, xR - xL - s * 0.12, s * 0.016);
      ctx.fillStyle = 'rgba(36, 22, 10, 0.2)';
      ctx.fillRect(xL, yNr - th - dz, xR - xL, s * 0.02);
      ctx.fillStyle = shade(seatC, 14);
      ctx.fillRect(
        xL + (jw ? 0 : s * 0.03),
        yNr - th - s * 0.036,
        xR - xL - (jw ? 0 : s * 0.03) - (je ? 0 : s * 0.03),
        s * 0.036,
      );
    },
  };
}

function paintChair(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, game, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  // The back turns away from an adjacent table — a chair is FOR
  // sitting at something. PARITY: this family is the registry's
  // isSitAtTable (shared seats.ts) — widen them together.
  const isT = (t2: number | undefined) =>
    t2 === Tile.Table ||
    t2 === Tile.Counter ||
    t2 === Tile.ElvenTable;
  const back = isT(game.world.groundAt(tx, ty - 1))
    ? 's'
    : isT(game.world.groundAt(tx, ty + 1))
      ? 'n'
      : isT(game.world.groundAt(tx + 1, ty))
        ? 'w'
        : isT(game.world.groundAt(tx - 1, ty))
          ? 'e'
          : 'n';
  // THE HONEST-ANGLE LAW: the camera is a tilted bird's eye
  // (yScale 0.6), so every facing carries its foreshortened top
  // planes — the seat is a receding quad in ALL FOUR views, near
  // feet stand LOWER on screen than far feet, and a side-on
  // crest rail shows its lit top running away from the camera.
  // A pure-elevation chair is a paper cutout; these are joined
  // casework seen from above.
  const yNr = p.y + syT * 0.24; // near feet floor line
  const dz = syT * 0.42; // seat depth, foreshortened
  const yFr = yNr - dz; // far feet floor line
  const sw = s * 0.46; // seat width
  const sh = s * 0.34; // seat height — the knee
  const bhh = s * 0.88; // crest height — the shoulder blades
  // Three village builds, hash-dealt so no two rooms furnish
  // alike: ladder-back, spindle-back, and a solid splat with a
  // carved lozenge. About half wear a tied cushion in a house
  // dye; the lumber tone drifts a hair per chair.
  const kind = (h >> 5) % 3;
  const toneDrift = (((h >> 9) % 3) - 1) * 5;
  const wood = shade('#7a552e', toneDrift);
  const dark = shade('#6f4d26', toneDrift);
  const CUSHIONS = ['#8a3d46', '#3d5a8a', '#4d6b3c', '#75588a'] as const;
  const cush = (h & 4) !== 0 ? CUSHIONS[(h >> 3) % 4]! : null;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.6, 1.05, 0.5),
    drawShadow: () => rend.castEdgeQuad(p.x - sw / 2, yNr, p.x + sw / 2, yNr, 0.5),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // The contact pool spans the honest footprint: four feet
      // on two floor lines, not a rug under a cutout.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
      ctx.beginPath();
      ctx.ellipse(p.x, yNr - dz * 0.42, sw * 0.68, dz * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // A tapered leg standing on its own floor line.
      const leg = (lx: number, footY: number, hgt: number, c3: string) => {
        ctx.fillStyle = c3;
        ctx.beginPath();
        ctx.moveTo(lx - s * 0.028, footY - hgt);
        ctx.lineTo(lx + s * 0.028, footY - hgt);
        ctx.lineTo(lx + s * 0.019, footY);
        ctx.lineTo(lx - s * 0.019, footY);
        ctx.closePath();
        ctx.fill();
      };
      // A side stretcher runs front-to-back — near-vertical on
      // screen, the depth cue tying the two floor lines.
      const sideRail = (rx: number) => {
        ctx.fillStyle = shade(dark, -4);
        ctx.fillRect(rx - s * 0.014, yFr - sh * 0.44, s * 0.028, dz);
      };
      // The seat: a foreshortened top receding yNr->yFr over a
      // thick front edge; the cushion sits INTO the frame.
      const seatTop = (x0: number, w2: number) => {
        ctx.fillStyle = shade(wood, -12);
        ctx.fillRect(x0, yNr - sh, w2, s * 0.055);
        ctx.fillStyle = shade(wood, 6);
        ctx.beginPath();
        chamferRect(ctx, x0 - s * 0.012, yNr - sh - dz, w2 + s * 0.024, dz, s * 0.032);
        ctx.fill();
        // The near arris is sat-smooth and catches the light;
        // the far rim falls into the back's shade.
        ctx.fillStyle = shade(wood, 16);
        ctx.fillRect(x0 + s * 0.01, yNr - sh - s * 0.03, w2 - s * 0.02, s * 0.03);
        ctx.fillStyle = 'rgba(36, 22, 10, 0.22)';
        ctx.fillRect(x0, yNr - sh - dz, w2, s * 0.022);
        if (cush) {
          ctx.fillStyle = cush;
          ctx.beginPath();
          chamferRect(ctx, x0 + s * 0.016, yNr - sh - dz + s * 0.03, w2 - s * 0.032, dz - s * 0.055, s * 0.035);
          ctx.fill();
          // Piped near edge, lit crown, one tie-button dimple.
          ctx.fillStyle = shade(cush, -14);
          ctx.fillRect(x0 + s * 0.016, yNr - sh - s * 0.052, w2 - s * 0.032, s * 0.026);
          ctx.fillStyle = shade(cush, 10);
          ctx.fillRect(x0 + s * 0.045, yNr - sh - dz + s * 0.03, w2 - s * 0.09, s * 0.02);
          ctx.fillStyle = shade(cush, -20);
          ctx.fillRect(x0 + w2 / 2 - s * 0.012, yNr - sh - dz * 0.52, s * 0.024, s * 0.018);
        } else {
          // Bare boards keep a sat-worn sheen line.
          ctx.fillStyle = 'rgba(36, 22, 10, 0.18)';
          ctx.fillRect(x0 + s * 0.03, yNr - sh - dz * 0.46, w2 - s * 0.06, s * 0.015);
        }
      };
      // The back panel's inner build between the stiles.
      const panelArt = (x0: number, w2: number, yT2: number, yB2: number, c3: string) => {
        ctx.fillStyle = c3;
        if (kind === 0) {
          // Ladder-back: three steam-bent slats.
          for (const f of [0.14, 0.44, 0.74] as const) {
            ctx.fillRect(x0, yT2 + (yB2 - yT2) * f, w2, s * 0.055);
          }
        } else if (kind === 1) {
          // Spindle-back: three turned spindles.
          for (const f of [0.25, 0.5, 0.75] as const) {
            ctx.fillRect(x0 + w2 * f - s * 0.016, yT2 + s * 0.02, s * 0.032, yB2 - yT2 - s * 0.04);
          }
        } else {
          // Splat-back: one shaped board, a lozenge carved at
          // its heart.
          ctx.beginPath();
          chamferRect(ctx, x0 + w2 * 0.29, yT2, w2 * 0.42, yB2 - yT2, s * 0.022);
          ctx.fill();
          const mx = x0 + w2 / 2;
          const my = (yT2 + yB2) / 2;
          ctx.fillStyle = shade(c3, -16);
          ctx.beginPath();
          ctx.moveTo(mx, my - s * 0.052);
          ctx.lineTo(mx + s * 0.038, my);
          ctx.lineTo(mx, my + s * 0.052);
          ctx.lineTo(mx - s * 0.038, my);
          ctx.closePath();
          ctx.fill();
        }
      };
      // Crest rail under a lit top cap — the top plane is what
      // says "you are ABOVE this chair"; every facing shows it.
      const crest = (x0: number, w2: number, yT2: number) => {
        ctx.fillStyle = wood;
        ctx.beginPath();
        chamferRect(ctx, x0, yT2, w2, s * 0.115, [s * 0.035, s * 0.035, 0, 0]);
        ctx.fill();
        ctx.fillStyle = shade(wood, 18);
        ctx.fillRect(x0 + s * 0.018, yT2 + s * 0.012, w2 - s * 0.036, s * 0.036);
      };
      if (back === 'n') {
        // FACING THE CAMERA. The rear stiles ARE the rear legs —
        // one piece from the FAR floor line to the crest, the
        // ladder-chair truth; the seat then buries their middles.
        const bw = sw - s * 0.02;
        ctx.fillStyle = shade(dark, -8);
        ctx.fillRect(p.x - bw / 2, yFr - bhh + s * 0.06, s * 0.05, bhh - s * 0.06);
        ctx.fillRect(p.x + bw / 2 - s * 0.05, yFr - bhh + s * 0.06, s * 0.05, bhh - s * 0.06);
        panelArt(p.x - bw / 2 + s * 0.05, bw - s * 0.1, yFr - bhh + s * 0.135, yFr - sh - s * 0.07, shade(dark, -4));
        crest(p.x - bw / 2 - s * 0.012, bw + s * 0.024, yFr - bhh);
        // Lower back rail ties the stiles just above the seat.
        ctx.fillStyle = dark;
        ctx.fillRect(p.x - bw / 2 + s * 0.02, yFr - sh - s * 0.065, bw - s * 0.04, s * 0.042);
        sideRail(p.x - sw / 2 + s * 0.045);
        sideRail(p.x + sw / 2 - s * 0.045);
        seatTop(p.x - sw / 2, sw);
        leg(p.x - sw / 2 + s * 0.045, yNr, sh, wood);
        leg(p.x + sw / 2 - s * 0.045, yNr, sh, wood);
        // Front H-stretcher at the shins.
        ctx.fillStyle = shade(wood, -8);
        ctx.fillRect(p.x - sw / 2 + s * 0.055, yNr - sh * 0.44, sw - s * 0.11, s * 0.03);
      } else if (back === 's') {
        // SEEN FROM BEHIND. Far feet peek beneath the seat, the
        // seat's flanks run a sliver proud of the back panel,
        // and the panel's gaps glimpse the cushion — that
        // layered read IS the depth.
        const bw = sw - s * 0.06;
        leg(p.x - sw / 2 + s * 0.045, yFr, sh, shade(dark, -10));
        leg(p.x + sw / 2 - s * 0.045, yFr, sh, shade(dark, -10));
        sideRail(p.x - sw / 2 + s * 0.045);
        sideRail(p.x + sw / 2 - s * 0.045);
        seatTop(p.x - sw / 2, sw);
        // Here the stiles stand on the NEAR floor line — the
        // whole back is the closest thing to the camera.
        ctx.fillStyle = shade(dark, -6);
        ctx.fillRect(p.x - bw / 2, yNr - bhh + s * 0.06, s * 0.05, bhh - s * 0.06);
        ctx.fillRect(p.x + bw / 2 - s * 0.05, yNr - bhh + s * 0.06, s * 0.05, bhh - s * 0.06);
        panelArt(p.x - bw / 2 + s * 0.05, bw - s * 0.1, yNr - bhh + s * 0.135, yNr - sh - s * 0.02, shade(dark, -10));
        crest(p.x - bw / 2 - s * 0.012, bw + s * 0.024, yNr - bhh);
        // The outward face sits in its own shade.
        ctx.fillStyle = 'rgba(26, 20, 36, 0.12)';
        ctx.fillRect(p.x - bw / 2, yNr - bhh + s * 0.05, bw, s * 0.09);
      } else {
        // SIDE-ON — and still seen from above: the crest's top
        // runs AWAY from the camera as a tall lit ribbon, the
        // seat recedes to meet it, and both leg pairs stand on
        // their own floor lines. This is the view that used to
        // read as a flat cutout.
        const sgn = back === 'e' ? 1 : -1;
        const bx = p.x + sgn * s * 0.24; // back-post center
        const fx = p.x - sgn * s * 0.26; // front leg line
        const sxA = fx - sgn * s * 0.04;
        const sxB = bx + sgn * s * 0.03;
        const x0 = Math.min(sxA, sxB);
        const wSeat = Math.abs(sxB - sxA);
        // Far pair first — feet on the high floor line.
        leg(fx, yFr, sh, shade(dark, -10));
        ctx.fillStyle = shade(dark, -8);
        ctx.fillRect(x0 + s * 0.05, yFr - sh * 0.44, wSeat - s * 0.1, s * 0.026);
        seatTop(x0, wSeat);
        leg(fx, yNr, sh, wood);
        // Near stretcher runs the chair's length at the shins.
        ctx.fillStyle = shade(wood, -8);
        ctx.fillRect(x0 + s * 0.045, yNr - sh * 0.44, wSeat - s * 0.09, s * 0.03);
        // The back: one tall slab from the far crest corner to
        // its near foot. Its upper reach is the CREST'S TOP —
        // a lit ribbon the full depth of the chair — over the
        // near end-grain cap; the seat tucks in beneath.
        const bw2 = s * 0.1;
        ctx.fillStyle = dark;
        ctx.beginPath();
        chamferRect(ctx, bx - bw2 / 2, yFr - bhh, bw2, bhh + dz, [s * 0.03, s * 0.03, 0, 0]);
        ctx.fill();
        ctx.fillStyle = shade(wood, 18);
        ctx.fillRect(bx - bw2 / 2 + s * 0.014, yFr - bhh + s * 0.012, bw2 - s * 0.028, dz - s * 0.012);
        ctx.fillStyle = wood;
        ctx.fillRect(bx - bw2 / 2, yNr - bhh, bw2, s * 0.115);
        // The crest horns over toward the sitter.
        ctx.beginPath();
        chamferRect(
          ctx,
          sgn > 0 ? bx - bw2 / 2 - s * 0.05 : bx + bw2 / 2,
          yNr - bhh + s * 0.01,
          s * 0.05,
          s * 0.07,
          [s * 0.02, s * 0.02, 0, 0],
        );
        ctx.fill();
        // The panel's inner face catches the room's light on
        // the seat side.
        ctx.fillStyle = shade(dark, 10);
        ctx.fillRect(
          sgn > 0 ? bx - bw2 / 2 : bx + bw2 / 2 - s * 0.016,
          yNr - bhh + s * 0.115,
          s * 0.016,
          bhh - sh - s * 0.175,
        );
      }
    },
  };
}

function paintThrone(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, stationBody, game, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const isTh = (t2: number | undefined) => t2 === Tile.Throne;
  // THE PAIRED-SEAT LAW: thrones crown a dais in pairs — the
  // WEST seat is the King's, gilded oak under crimson; the EAST
  // the Queen's, silvered ash under moonpale blue. A lone
  // throne stands in the King's dress. The back addresses the
  // hall: a throne always faces the camera, and it is CROWN
  // FURNITURE — never harvestable, never a chair with airs.
  const queen = isTh(game.world.groundAt(tx - 1, ty)) && !isTh(game.world.groundAt(tx + 1, ty));
  const frame = queen ? '#8b8b96' : '#8a6534';
  const metal = queen ? '#b4c0d2' : '#c9962e';
  const cloth = queen ? '#5a6f9c' : '#7a2430';
  const gemC = queen ? '#cfe0f0' : '#e0b84a';
  const yNr = p.y + syT * 0.3; // dais front floor line
  const dz = syT * 0.5; // a throne is DEEP — the honest angle shows it
  const yFr = yNr - dz;
  const ph = s * 0.09; // plinth riser
  const yP = yNr - ph; // plinth top, near edge
  const sw = s * 0.62; // seat width between the arms
  const sh = s * 0.4; // seat height above the plinth
  const bw = s * 0.58; // back width
  const bh = s * 1.5; // crest height — royal, not domestic
  const backFoot = yFr - ph + s * 0.03;
  const yCrest = backFoot - bh;
  return {
    // The tall back must stand BEHIND whoever holds the seat:
    // the sitter (at tile center) sorts after the throne and
    // paints over the cushion, framed by the crest — while a
    // walker passing north still slips behind the whole piece.
    sortY: ty + 0.42,
    body: stationBody(0.85, 1.95, 0.6),
    drawShadow: () => rend.castEdgeQuad(p.x - s * 0.47, yNr, p.x + s * 0.47, yNr, 0.55),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
      ctx.fillRect(p.x - s * 0.48, yNr + s * 0.004, s * 0.96, s * 0.04);
      // The plinth: one broad step claims the floor — a lit top
      // plane receding to the back's foot over a shadowed riser,
      // its nosing struck in the house metal.
      ctx.fillStyle = shade(frame, -18);
      ctx.fillRect(p.x - s * 0.46, yP, s * 0.92, ph);
      ctx.fillStyle = shade(frame, -4);
      ctx.beginPath();
      chamferRect(ctx, p.x - s * 0.46, yFr - ph, s * 0.92, dz, s * 0.045);
      ctx.fill();
      ctx.fillStyle = shade(metal, -8);
      ctx.fillRect(p.x - s * 0.44, yP - s * 0.02, s * 0.88, s * 0.02);
      // The high back: framed stiles around a tufted panel.
      ctx.fillStyle = shade(frame, -10);
      ctx.beginPath();
      chamferRect(ctx, p.x - bw / 2, yCrest, bw, backFoot - yCrest, [s * 0.05, s * 0.05, 0, 0]);
      ctx.fill();
      ctx.fillStyle = frame;
      ctx.fillRect(p.x - bw / 2 + s * 0.012, yCrest + s * 0.06, s * 0.045, backFoot - yCrest - s * 0.09);
      ctx.fillRect(p.x + bw / 2 - s * 0.057, yCrest + s * 0.06, s * 0.045, backFoot - yCrest - s * 0.09);
      // The tufted panel: deep dye under a lit heart, buttons
      // dimpled in a diamond walk.
      const px0 = p.x - bw / 2 + s * 0.075;
      const pw = bw - s * 0.15;
      const py0 = yCrest + s * 0.1;
      const phh = bh - sh - s * 0.08;
      ctx.fillStyle = cloth;
      ctx.beginPath();
      chamferRect(ctx, px0, py0, pw, phh, s * 0.04);
      ctx.fill();
      ctx.fillStyle = shade(cloth, 8);
      ctx.beginPath();
      chamferRect(ctx, px0 + s * 0.05, py0 + s * 0.05, pw - s * 0.1, phh - s * 0.1, s * 0.03);
      ctx.fill();
      ctx.fillStyle = shade(cloth, -18);
      for (let r2 = 0; r2 < 3; r2++) {
        for (let c3 = 0; c3 < 2; c3++) {
          const bxx = px0 + pw * (0.33 + c3 * 0.34);
          const byy = py0 + phh * (0.22 + r2 * 0.28);
          ctx.fillRect(bxx - s * 0.013, byy - s * 0.011, s * 0.026, s * 0.022);
        }
      }
      // The crown of the piece: the King's back peaks in three
      // gilded points; the Queen's sweeps one silver arch. Both
      // carry the stone of the house at the heart.
      ctx.fillStyle = metal;
      if (queen) {
        ctx.beginPath();
        ctx.moveTo(p.x - bw / 2 + s * 0.02, yCrest + s * 0.06);
        ctx.quadraticCurveTo(p.x, yCrest - s * 0.24, p.x + bw / 2 - s * 0.02, yCrest + s * 0.06);
        ctx.lineTo(p.x + bw / 2 - s * 0.02, yCrest + s * 0.1);
        ctx.lineTo(p.x - bw / 2 + s * 0.02, yCrest + s * 0.1);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(p.x - bw / 2, yCrest + s * 0.09);
        ctx.lineTo(p.x - bw * 0.34, yCrest - s * 0.02);
        ctx.lineTo(p.x - bw * 0.2, yCrest + s * 0.05);
        ctx.lineTo(p.x, yCrest - s * 0.16);
        ctx.lineTo(p.x + bw * 0.2, yCrest + s * 0.05);
        ctx.lineTo(p.x + bw * 0.34, yCrest - s * 0.02);
        ctx.lineTo(p.x + bw / 2, yCrest + s * 0.09);
        ctx.closePath();
        ctx.fill();
      }
      // A struck fillet where the crown meets the frame.
      ctx.fillStyle = shade(metal, 14);
      ctx.fillRect(p.x - bw / 2 + s * 0.03, yCrest + s * 0.055, bw - s * 0.06, s * 0.022);
      // The house stone.
      ctx.fillStyle = gemC;
      ctx.beginPath();
      if (queen) {
        // The moonpale drop.
        ctx.moveTo(p.x, yCrest - s * 0.15);
        ctx.quadraticCurveTo(p.x + s * 0.05, yCrest - s * 0.03, p.x, yCrest + s * 0.04);
        ctx.quadraticCurveTo(p.x - s * 0.05, yCrest - s * 0.03, p.x, yCrest - s * 0.15);
      } else {
        facetCircle(ctx, p.x, yCrest - s * 0.03, s * 0.05, 6, 0.3);
      }
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fillRect(p.x - s * 0.026, yCrest - s * 0.06, s * 0.018, s * 0.018);
      // Post finials — orbs in the house metal.
      ctx.fillStyle = metal;
      ctx.beginPath();
      facetCircle(ctx, p.x - bw / 2 + s * 0.034, yCrest + s * 0.02, s * 0.048, 6, 0.3);
      ctx.fill();
      ctx.beginPath();
      facetCircle(ctx, p.x + bw / 2 - s * 0.034, yCrest + s * 0.02, s * 0.048, 6, 0.3);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(p.x - bw / 2 + s * 0.014, yCrest + s * 0.002, s * 0.016, s * 0.016);
      ctx.fillRect(p.x + bw / 2 - s * 0.054, yCrest + s * 0.002, s * 0.016, s * 0.016);
      // The seat: a deep cushion recedes to the back over a
      // rolled front, braid struck in the metal, and a skirt of
      // two carved panels dropping to the plinth.
      const stN = yP - sh;
      const stF = backFoot - sh;
      ctx.fillStyle = cloth;
      ctx.beginPath();
      chamferRect(ctx, p.x - sw / 2, stF, sw, stN - stF, s * 0.035);
      ctx.fill();
      ctx.fillStyle = shade(cloth, 10);
      ctx.fillRect(p.x - sw / 2 + s * 0.04, stF + s * 0.02, sw - s * 0.08, s * 0.03);
      ctx.fillStyle = shade(cloth, -12);
      ctx.fillRect(p.x - sw / 2, stN, sw, s * 0.05);
      ctx.fillStyle = shade(metal, 6);
      ctx.fillRect(p.x - sw / 2, stN + s * 0.05, sw, s * 0.02);
      ctx.fillStyle = shade(frame, -8);
      ctx.fillRect(p.x - sw / 2, stN + s * 0.07, sw, yP - stN - s * 0.07);
      ctx.fillStyle = shade(frame, -18);
      ctx.beginPath();
      chamferRect(ctx, p.x - sw / 2 + s * 0.05, stN + s * 0.11, sw * 0.5 - s * 0.08, yP - stN - s * 0.16, s * 0.02);
      ctx.fill();
      ctx.beginPath();
      chamferRect(ctx, p.x + s * 0.03, stN + s * 0.11, sw * 0.5 - s * 0.08, yP - stN - s * 0.16, s * 0.02);
      ctx.fill();
      // The arms ride toward the camera — twin lit top planes
      // ending in scrolled fists, posts dropped to the plinth.
      // Nothing sells the tilted bird's eye like an arm rail
      // running its whole length AT you.
      for (const sgn of [-1, 1] as const) {
        const ax = p.x + sgn * (sw / 2 + s * 0.052);
        const aw = s * 0.088;
        const ah = s * 0.66; // arm height above the plinth
        const aFar = backFoot - ah;
        const aNear = yP - ah + s * 0.02;
        ctx.fillStyle = shade(frame, -14);
        ctx.fillRect(ax - aw / 2, aNear, aw, s * 0.05);
        ctx.fillStyle = shade(frame, 14);
        ctx.beginPath();
        chamferRect(ctx, ax - aw / 2, aFar, aw, aNear - aFar, s * 0.03);
        ctx.fill();
        // The scrolled fist at the near end.
        ctx.fillStyle = frame;
        ctx.beginPath();
        facetCircle(ctx, ax, aNear + s * 0.02, s * 0.058, 6, 0.3);
        ctx.fill();
        ctx.fillStyle = shade(frame, 18);
        ctx.beginPath();
        facetCircle(ctx, ax - sgn * s * 0.012, aNear + s * 0.008, s * 0.022, 6, 0.3);
        ctx.fill();
        // The support post drops to the plinth.
        ctx.fillStyle = shade(frame, -10);
        ctx.fillRect(ax - s * 0.03, aNear + s * 0.07, s * 0.06, yP - aNear - s * 0.07);
      }
    },
  };
}

function paintBed(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, stationBody, game, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const isBed = (t2: number | undefined) => t2 === Tile.Bed;
  const bn = isBed(game.world.groundAt(tx, ty - 1));
  const bs = isBed(game.world.groundAt(tx, ty + 1));
  const be2 = isBed(game.world.groundAt(tx + 1, ty));
  const bw2 = isBed(game.world.groundAt(tx - 1, ty));
  const isWall = (t2: number | undefined) => t2 !== undefined && WALL_TILES.has(t2);
  // A bed sleeps with its head to the wall — the side-on variant
  // is what keeps an inn's row of beds from reading stamped.
  // Orientation priority (PARITY LAW with shared seats.ts): a
  // N-S run wins, then an E-W run — the FULL-LENGTH side-on bed,
  // proportioned to the body (user law: a one-tile cot reads
  // half a bed) — then the lone bed's wall scan.
  const horiz = !bn && !bs && (be2 || bw2);
  let runX0 = tx;
  let runX1 = tx;
  let head: 'n' | 'e' | 'w';
  if (horiz) {
    // PARITY LAW: the walk window is the registry's own
    // (BED_RUN_CAP, shared seats.ts) — an uncapped walk here
    // gave a long player-built run a different bed than the
    // one the sim mounts the sleeper on.
    while (runX0 > tx - BED_RUN_CAP && isBed(game.world.groundAt(runX0 - 1, ty))) runX0--;
    while (runX1 < runX0 + BED_RUN_CAP - 1 && isBed(game.world.groundAt(runX1 + 1, ty)))
      runX1++;
    head = isWall(game.world.groundAt(runX1 + 1, ty))
      ? 'e'
      : isWall(game.world.groundAt(runX0 - 1, ty))
        ? 'w'
        : 'e';
    // The head-end tile draws the WHOLE bed; run-mates yield
    // (the run ring still counts them for the outline box).
    if (tx !== (head === 'e' ? runX1 : runX0)) {
      return { sortY: ty + 0.72, draw: () => {} };
    }
  } else {
    head =
      bn || bs || isWall(game.world.groundAt(tx, ty - 1))
        ? 'n'
        : isWall(game.world.groundAt(tx + 1, ty))
          ? 'e'
          : isWall(game.world.groundAt(tx - 1, ty))
            ? 'w'
            : 'n';
  }
  // THE WHOLE BED (v3): vertical beds draw as ONE piece from
  // the head tile too — run-mates yield. And the piece is sized
  // to the BODY (the rig is the unit of measure, user law): the
  // deck runs a full body-length south of the pillow, past the
  // tile footprint if it must — unless a wall stands at the
  // foot, where the frame keeps its compact cot proportions.
  let runY1 = ty;
  if (head === 'n' && (bn || bs)) {
    if (bn) return { sortY: ty + 0.72, draw: () => {} };
    // PARITY LAW: capped exactly like the registry's N-S walk.
    while (runY1 < ty + BED_RUN_CAP - 1 && isBed(game.world.groundAt(tx, runY1 + 1)))
      runY1++;
  }
  const runV = runY1 - ty;
  // N-S runs merge into one long bed; the quilt colorway is keyed
  // to the run's head tile so both halves wear the same cloth.
  let ay = ty;
  while (isBed(game.world.groundAt(tx, ay - 1))) ay--;
  const QUILTS = [
    ['#8a3d46', '#a34b52'],
    ['#3d5a8a', '#4a6a9c'],
    ['#4d6b3c', '#5a7d4a'],
    ['#75588a', '#8a6aa0'],
  ] as const;
  const [qDark, qMain] = QUILTS[hashCoords(41, tx, ay) % 4]!;
  // Sized against the 1.15-tile body: the tick runs the full
  // tile plan so a sleeper fits between the boards.
  const frameC = '#6f4d26';
  const postC = '#5e3f1e';
  const tickC = '#e8dfc8';
  // An E-W run stretches the piece footward from the head tile.
  const x0 = p.x - s * 0.46 - (horiz && head === 'e' ? (runX1 - runX0) * s : 0);
  const x1 = p.x + s * 0.46 + (horiz && head === 'w' ? (runX1 - runX0) * s : 0);
  // THE HONEST-ANGLE LAW, bed edition: a bed is a RAISED DECK —
  // the tick rides bedH above the floor, so the plan-view quilt
  // sits on a visible south face (frame boards, an under-bed
  // shadow gap, corner feet) instead of lying printed on the
  // floorboards. The lift is also the CLIPPING fix: a footboard
  // standing shin-high clears the crown of a reveal-sunken wall
  // south of the bed, where the old floor-level foot art was
  // legitimately occluded and read as cut off.
  const bedH = s * 0.3;
  const wallS = isWall(game.world.groundAt(tx, runY1 + 1));
  const vert = head === 'n';
  // Floor lines: THE BODY-SCALE DECK. The pillow sits at the
  // head tile's north line and the deck runs a full body-length
  // south (1.62 tiles past a lone tile's centre, 0.75 past a
  // run's foot) so a full-size sleeper lies out whole — art
  // greater than footprint, exactly like a tall tree's canopy.
  // A wall at the foot caps it at the compact cot. PARITY: the
  // seat registry's `span` mirrors these constants.
  const yFf = vert ? p.y - syT * 0.5 : p.y - syT * 0.5;
  const yFn = vert
    ? p.y + syT * (runV + (wallS ? 0.4 : runV > 0 ? 0.75 : 1.62))
    : p.y + syT * 0.58;
  const dTop = yFf - bedH;
  const dBot = yFn - bedH;
  return {
    sortY: ty + 0.72,
    // Run mates never reach here (they yield above), so every
    // drawn bed is a whole piece: full shadow, and the lone
    // body pads DOWN for the body-length deck (rings cover runs).
    body: bn || bs || horiz ? undefined : stationBody(0.85, 1.35, 1.35),
    drawShadow: () => rend.castEdgeQuad(x0, yFn, x1, yFn, 0.3),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past
      // it. The quilt/finialPost helpers live IN here for the
      // same reason — defined at case level they'd seal in the
      // stale ctx and split the bed across two canvases.
      const ctx = rend.ctx;
      // Patchwork blocks under seam lines — a quilt sewn from
      // scraps, softened by a white fold-back of the sheet.
      // A bedpost capped with a turned finial.
      const finialPost = (fx2: number, fy2: number, ph2: number) =>
        rend.bedFinialPost(fx2, fy2, ph2);
      if (head === 'n') {
        // FACING THE CAMERA. Everything soft rides the raised
        // deck [dTop..dBot]; everything structural stands on the
        // floor lines and shows honest height below the deck.
        {
          // Contact pool + open under-bed shadow first — the
          // gap under a real frame is darker than the room.
          ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
          ctx.fillRect(x0 - s * 0.01, yFn - s * 0.02, x1 - x0 + s * 0.02, s * 0.05);
          ctx.fillStyle = 'rgba(18, 12, 26, 0.13)';
          ctx.fillRect(x0 + s * 0.01, dBot + s * 0.15, x1 - x0 - s * 0.02, yFn - dBot - s * 0.16);
        }
        {
          // Headboard first — the far plane. Posts stand ON the
          // far floor line; the board of matched planks spans
          // them (boards, not a void — a dark recess reads as an
          // empty picture frame from this camera).
          finialPost(x0 + s * 0.005, yFf, bedH + s * 0.62);
          finialPost(x1 - s * 0.005, yFf, bedH + s * 0.62);
          ctx.fillStyle = postC;
          ctx.beginPath();
          chamferRect(ctx, x0 + s * 0.02, dTop - s * 0.58, x1 - x0 - s * 0.04, s * 0.62, [s * 0.05, s * 0.05, 0, 0]);
          ctx.fill();
          ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
          ctx.lineWidth = Math.max(1, s * 0.024);
          ctx.stroke();
          ctx.fillStyle = shade(postC, -5);
          ctx.fillRect(x0 + s * 0.09, dTop - s * 0.48, x1 - x0 - s * 0.18, s * 0.38);
          ctx.fillStyle = 'rgba(36, 22, 10, 0.35)';
          for (const fx of [0.35, 0.53, 0.71] as const) {
            ctx.fillRect(x0 + (x1 - x0) * fx, dTop - s * 0.47, s * 0.018, s * 0.36);
          }
          // The board's top edge foreshortens into view.
          ctx.fillStyle = shade(postC, 18);
          ctx.fillRect(x0 + s * 0.04, dTop - s * 0.58, x1 - x0 - s * 0.08, s * 0.075);
        }
        // Side rails frame the tick along the deck, a lit lip
        // proud of the mattress, rimmed dark so the frame
        // separates from same-lumber floorboards.
        const railH = dBot - dTop + s * 0.02;
        ctx.fillStyle = frameC;
        ctx.fillRect(x0 - s * 0.055, dTop - s * 0.035, s * 0.055, railH + s * 0.035);
        ctx.fillRect(x1, dTop - s * 0.035, s * 0.055, railH + s * 0.035);
        ctx.fillStyle = shade(frameC, 10);
        ctx.fillRect(x0 - s * 0.055, dTop - s * 0.035, s * 0.02, railH + s * 0.035);
        ctx.fillStyle = shade(frameC, -12);
        ctx.fillRect(x1 + s * 0.035, dTop - s * 0.035, s * 0.02, railH + s * 0.035);
        ctx.fillStyle = 'rgba(26, 20, 36, 0.3)';
        ctx.fillRect(x0 - s * 0.073, dTop - s * 0.03, s * 0.018, railH + s * 0.03);
        ctx.fillRect(x1 + s * 0.055, dTop - s * 0.03, s * 0.018, railH + s * 0.03);
        // Mattress on the deck, dimpled darker along the rails;
        // the head end falls away into the board's shade.
        ctx.fillStyle = tickC;
        ctx.fillRect(x0, dTop, x1 - x0, dBot - dTop);
        ctx.fillStyle = shade(tickC, -8);
        ctx.fillRect(x0, dTop, s * 0.045, dBot - dTop);
        ctx.fillRect(x1 - s * 0.045, dTop, s * 0.045, dBot - dTop);
        {
          ctx.fillStyle = 'rgba(36, 22, 10, 0.09)';
          ctx.fillRect(x0, dTop, x1 - x0, (dBot - dTop) * 0.2);
        }
        {
          // Pillow: plumped against the board, creased, casting
          // its own soft line on the sheet.
          ctx.fillStyle = '#f4efe0';
          ctx.beginPath();
          chamferRect(ctx, p.x - s * 0.24, dTop + syT * 0.05, s * 0.48, syT * 0.24, s * 0.06);
          ctx.fill();
          ctx.fillStyle = shade('#f4efe0', -9);
          ctx.fillRect(p.x - s * 0.2, dTop + syT * 0.05 + syT * 0.19, s * 0.4, s * 0.026);
          ctx.fillStyle = 'rgba(36, 22, 10, 0.1)';
          ctx.fillRect(p.x - s * 0.24, dTop + syT * 0.05 + syT * 0.24, s * 0.48, s * 0.02);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.fillRect(p.x - s * 0.2, dTop + syT * 0.07, s * 0.14, s * 0.02);
        }
        // SOUTH FACE (the fix): below the deck's near edge the
        // frame shows its boards, then the shadow gap, then
        // corner feet standing on the near floor line.
        {
          ctx.fillStyle = shade(frameC, -4);
          ctx.fillRect(x0 - s * 0.02, dBot, x1 - x0 + s * 0.04, s * 0.15);
          ctx.fillStyle = 'rgba(36, 22, 10, 0.3)';
          ctx.fillRect(x0 + (x1 - x0) * 0.36, dBot + s * 0.02, s * 0.018, s * 0.11);
          ctx.fillRect(x0 + (x1 - x0) * 0.64, dBot + s * 0.02, s * 0.018, s * 0.11);
          ctx.fillStyle = shade(frameC, -18);
          ctx.fillRect(x0 - s * 0.015, yFn - s * 0.13, s * 0.065, s * 0.13);
          ctx.fillRect(x1 - s * 0.05, yFn - s * 0.13, s * 0.065, s * 0.13);
        }
        // The quilt on the deck…
        const yQ = dTop + (dBot - dTop) * 0.4;
        rend.bedCoversVert(x0, x1, yQ, dBot, qMain, qDark);
        {
          // …DRAPING over the south face — cloth falling over an
          // edge is what makes the lift read.
          ctx.fillStyle = shade(qMain, -10);
          ctx.fillRect(x0 - s * 0.03, dBot, x1 - x0 + s * 0.06, s * 0.085);
          ctx.fillStyle = shade(qDark, -14);
          ctx.fillRect(x0 - s * 0.03, dBot + s * 0.085, x1 - x0 + s * 0.06, s * 0.028);
          ctx.beginPath();
          ctx.moveTo(x0 - s * 0.03, dBot + s * 0.06);
          ctx.lineTo(x0 + s * 0.08, dBot + s * 0.06);
          ctx.lineTo(x0 - s * 0.005, dBot + s * 0.16);
          ctx.closePath();
          ctx.fill();
          // Footboard: its own LAYER (shared painter) — every
          // cloth pass repaints it on top, so the posts always
          // stand in front of the blanket.
          rend.bedFootboardVert(x0, x1, dBot, yFn);
        }
      } else {
        // SIDE-ON: head against the east or west wall, the whole
        // bed in profile — and still seen from above. The deck
        // recedes between the floor lines, the long south rail
        // carries the frame's height, and the head/foot boards
        // are depth-true slabs whose LIT TOPS run away from the
        // camera the bed's full width (the chair-side law).
        const sgn = head === 'e' ? 1 : -1;
        const hx = head === 'e' ? x1 : x0;
        const fx0 = head === 'e' ? x0 : x1;
        // Contact pool + open under-bed shadow.
        ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
        ctx.fillRect(x0 - s * 0.01, yFn - s * 0.02, x1 - x0 + s * 0.02, s * 0.05);
        ctx.fillStyle = 'rgba(18, 12, 26, 0.13)';
        ctx.fillRect(x0 + s * 0.01, dBot + s * 0.14, x1 - x0 - s * 0.02, yFn - dBot - s * 0.15);
        // Far rail lip proud of the tick, then the FAR posts of
        // both boards — their orbs peek over the slabs' lit tops
        // from the high floor line.
        ctx.fillStyle = frameC;
        ctx.fillRect(x0 - s * 0.02, dTop - s * 0.035, x1 - x0 + s * 0.04, s * 0.055);
        finialPost(hx + sgn * s * 0.02, yFf, bedH + s * 0.56);
        finialPost(fx0 - sgn * s * 0.005, yFf, bedH + s * 0.3);
        // Mattress on the deck.
        ctx.fillStyle = tickC;
        ctx.fillRect(x0, dTop, x1 - x0, dBot - dTop);
        ctx.fillStyle = shade(tickC, -8);
        ctx.fillRect(x0, dTop, x1 - x0, s * 0.04);
        // SOUTH LONG FACE: rail boards under the deck's near
        // edge, a seam between them, feet at the corners.
        ctx.fillStyle = shade(frameC, -4);
        ctx.fillRect(x0 - s * 0.02, dBot, x1 - x0 + s * 0.04, s * 0.14);
        ctx.fillStyle = 'rgba(36, 22, 10, 0.3)';
        ctx.fillRect(x0 + (x1 - x0) * 0.5 - s * 0.009, dBot + s * 0.02, s * 0.018, s * 0.1);
        ctx.fillStyle = shade(frameC, -18);
        ctx.fillRect(x0 - s * 0.015, yFn - s * 0.12, s * 0.06, s * 0.12);
        ctx.fillRect(x1 - s * 0.045, yFn - s * 0.12, s * 0.06, s * 0.12);
        // The deck recedes: its far third falls away into shade
        // — without this the raised plan reads as a flat one.
        ctx.fillStyle = 'rgba(36, 22, 10, 0.09)';
        ctx.fillRect(x0, dTop, x1 - x0, (dBot - dTop) * 0.32);
        // Headboard: one broad slab from the far top corner to
        // its near foot — the upper reach is the board's TOP, a
        // lit ribbon the bed's whole depth, over the near
        // end-grain cap; the deck tucks in beneath.
        ctx.fillStyle = postC;
        ctx.beginPath();
        chamferRect(ctx, hx - s * 0.1, dTop - s * 0.6, s * 0.2, yFn - dTop + s * 0.6, [
          s * 0.04,
          s * 0.04,
          0,
          0,
        ]);
        ctx.fill();
        ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
        ctx.lineWidth = Math.max(1, s * 0.024);
        ctx.stroke();
        ctx.fillStyle = shade(postC, 18);
        ctx.fillRect(hx - s * 0.1 + s * 0.016, dTop - s * 0.59, s * 0.2 - s * 0.032, dBot - dTop);
        ctx.fillStyle = shade(postC, 4);
        ctx.fillRect(hx - s * 0.1, dBot - s * 0.6, s * 0.2, s * 0.09);
        // A plank seam down the near face, and the board's inner
        // face catching the room's light on the mattress side.
        ctx.fillStyle = 'rgba(36, 22, 10, 0.3)';
        ctx.fillRect(hx - s * 0.009, dBot - s * 0.49, s * 0.018, s * 0.42);
        ctx.fillStyle = shade(postC, 10);
        ctx.fillRect(sgn > 0 ? hx - s * 0.1 : hx + s * 0.084, dBot - s * 0.5, s * 0.016, s * 0.42);
        // Pillow: a plump bolster laid against the head end —
        // wider than tall, creased where a head has been.
        const pyMid = (dTop + dBot) / 2;
        const pw2 = s * 0.27;
        const ph3 = (dBot - dTop) * 0.52;
        const px2 = hx - sgn * s * 0.33 - pw2 / 2;
        ctx.fillStyle = '#f4efe0';
        ctx.beginPath();
        chamferRect(ctx, px2, pyMid - ph3 * 0.58, pw2, ph3, s * 0.05);
        ctx.fill();
        ctx.fillStyle = shade('#f4efe0', -9);
        ctx.fillRect(px2 + (sgn > 0 ? 0 : pw2 - s * 0.045), pyMid - ph3 * 0.5, s * 0.045, ph3 * 0.84);
        ctx.fillStyle = 'rgba(36, 22, 10, 0.1)';
        ctx.fillRect(px2 + s * 0.02, pyMid + ph3 * 0.42 - s * 0.02, pw2 - s * 0.04, s * 0.022);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(px2 + pw2 * 0.3, pyMid - ph3 * 0.44, s * 0.09, s * 0.024);
        // The quilt claims the foot 58% of the deck (one shared
        // painter — the sleeper's tuck repaints the SAME art),
        // stopping a hand short of the foot end: cloth never
        // rides the footboard post (user catch).
        const qw2 = (x1 - x0) * 0.58;
        const qx0 = sgn > 0 ? fx0 + s * 0.1 : fx0 - qw2 - s * 0.1;
        rend.bedCoversSide(qx0, qw2, dTop, dBot, sgn, qMain, qDark);
        // …and DRAPES over the south rail: hem shadow + the
        // hanging corner falling down the face.
        ctx.fillStyle = shade(qMain, -10);
        ctx.fillRect(qx0, dBot, qw2, s * 0.08);
        ctx.fillStyle = shade(qDark, -14);
        ctx.fillRect(qx0, dBot + s * 0.08, qw2, s * 0.026);
        ctx.beginPath();
        const cnr = sgn > 0 ? qx0 + s * 0.02 : qx0 + qw2 - s * 0.02;
        ctx.moveTo(cnr - s * 0.055, dBot + s * 0.05);
        ctx.lineTo(cnr + s * 0.055, dBot + s * 0.05);
        ctx.lineTo(cnr, dBot + s * 0.15);
        ctx.closePath();
        ctx.fill();
        // Footboard: the shorter slab at the foot end — same
        // depth-true build, lit top ribbon over the end cap.
        ctx.fillStyle = frameC;
        ctx.beginPath();
        chamferRect(ctx, fx0 - s * 0.055, dTop - s * 0.3, s * 0.11, yFn - dTop + s * 0.3, [
          s * 0.025,
          s * 0.025,
          0,
          0,
        ]);
        ctx.fill();
        ctx.strokeStyle = 'rgba(26, 20, 36, 0.3)';
        ctx.lineWidth = Math.max(1, s * 0.02);
        ctx.stroke();
        ctx.fillStyle = shade(frameC, 16);
        ctx.fillRect(fx0 - s * 0.055 + s * 0.012, dTop - s * 0.29, s * 0.11 - s * 0.024, dBot - dTop);
        ctx.fillStyle = shade(frameC, 2);
        ctx.fillRect(fx0 - s * 0.055, dBot - s * 0.3, s * 0.11, s * 0.075);
        // Near-corner posts stand over everything, feet on the
        // low floor line.
        finialPost(fx0 - sgn * s * 0.005, yFn, bedH + s * 0.34);
        finialPost(hx + sgn * s * 0.02, yFn, bedH + s * 0.58);
      }
    },
  };
}

function paintBookshelf(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.22;
  // A bookcase stands OVER the body — a landmark of learning.
  const uw = s * 0.84;
  const uh = s * 1.68;
  const frame = '#5e3f1e';
  const xw = p.x - uw / 2;
  return {
    sortY: ty + 0.72,
    body: stationBody(0.65, 2.1, 0.5),
    drawShadow: () => rend.castEdgeQuad(xw, baseY, p.x + uw / 2, baseY, 1.55),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // Contact shade under a kicked plinth foot.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
      ctx.fillRect(xw - s * 0.02, baseY - s * 0.015, uw + s * 0.04, s * 0.05);
      ctx.fillStyle = '#4a3116';
      ctx.fillRect(xw + s * 0.015, baseY - s * 0.07, uw - s * 0.03, s * 0.07);
      // Carcass with lit west / shaded east stiles, rimmed dark
      // so the casework separates from wood floors.
      ctx.fillStyle = frame;
      ctx.beginPath();
      ctx.rect(xw, baseY - uh, uw, uh - s * 0.06);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1.2, s * 0.026);
      ctx.stroke();
      ctx.fillStyle = shade(frame, 10);
      ctx.fillRect(xw, baseY - uh, s * 0.05, uh - s * 0.06);
      ctx.fillStyle = shade(frame, -12);
      ctx.fillRect(p.x + uw / 2 - s * 0.05, baseY - uh, s * 0.05, uh - s * 0.06);
      // Four cavities. Three hold hand-bound books — leaning
      // volumes, flat-lying stacks, gilt bands — and one keeps
      // the owner's curios: hourglass, scrolls, a stoppered
      // bottle and a bookend holding nothing up.
      const SPINES = ['#97322f', '#31589c', '#4d6b3c', '#c9962e', '#7a3f8f', '#996242'];
      const curioRow = (h >> 2) % 4;
      for (let row = 0; row < 4; row++) {
        const cy0 = baseY - uh + s * (0.12 + row * 0.375);
        const cavL = xw + s * 0.07;
        const cavW = uw - s * 0.14;
        const floor = cy0 + s * 0.3;
        ctx.fillStyle = '#241a28';
        ctx.fillRect(cavL, cy0, cavW, s * 0.3);
        if (row === curioRow) {
          const hc = hashCoords(83, tx, ty);
          // Hourglass on turned posts.
          const hgx = cavL + cavW * 0.18;
          ctx.fillStyle = '#8a6534';
          ctx.fillRect(hgx - s * 0.055, floor - s * 0.025, s * 0.11, s * 0.025);
          ctx.fillRect(hgx - s * 0.055, floor - s * 0.2, s * 0.11, s * 0.022);
          ctx.fillRect(hgx - s * 0.05, floor - s * 0.19, s * 0.018, s * 0.17);
          ctx.fillRect(hgx + s * 0.032, floor - s * 0.19, s * 0.018, s * 0.17);
          ctx.fillStyle = '#e8c876';
          ctx.beginPath();
          ctx.moveTo(hgx - s * 0.032, floor - s * 0.175);
          ctx.lineTo(hgx + s * 0.032, floor - s * 0.175);
          ctx.lineTo(hgx, floor - s * 0.105);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(hgx, floor - s * 0.095);
          ctx.lineTo(hgx + s * 0.036, floor - s * 0.028);
          ctx.lineTo(hgx - s * 0.036, floor - s * 0.028);
          ctx.closePath();
          ctx.fill();
          // A pair of rolled scrolls, pith dots on the ends.
          const scx = cavL + cavW * (0.42 + ((hc >> 2) % 10) / 100);
          ctx.fillStyle = '#d8c9a0';
          ctx.fillRect(scx, floor - s * 0.055, s * 0.19, s * 0.05);
          ctx.fillRect(scx + s * 0.025, floor - s * 0.105, s * 0.19, s * 0.05);
          ctx.fillStyle = '#b0a078';
          ctx.beginPath();
          facetCircle(ctx, scx + s * 0.008, floor - s * 0.03, s * 0.022, 6, 0.3);
          facetCircle(ctx, scx + s * 0.033, floor - s * 0.08, s * 0.022, 6, 0.3);
          ctx.fill();
          // The stoppered bottle, something teal inside.
          const btx = cavL + cavW * 0.82;
          ctx.fillStyle = 'rgba(214, 228, 240, 0.55)';
          ctx.fillRect(btx - s * 0.04, floor - s * 0.14, s * 0.08, s * 0.14);
          ctx.fillStyle = '#7fc9b3';
          ctx.fillRect(btx - s * 0.032, floor - s * 0.08, s * 0.064, s * 0.072);
          ctx.fillStyle = '#8a6534';
          ctx.fillRect(btx - s * 0.016, floor - s * 0.17, s * 0.032, s * 0.035);
        } else {
          let bx = cavL + s * 0.02;
          for (let k = 0; bx < cavL + cavW - s * 0.07; k++) {
            const hh = hashCoords(59 + row * 7 + k, tx, ty);
            if ((hh & 15) === 3) {
              // A short stack lying flat.
              const stW = s * (0.15 + (hh % 3) * 0.02);
              for (let j2 = 0; j2 < 3; j2++) {
                ctx.fillStyle = SPINES[(hh >> (j2 * 3)) % SPINES.length]!;
                ctx.fillRect(
                  bx + (((hh >> j2) % 3) - 1) * s * 0.01,
                  floor - s * 0.045 * (j2 + 1),
                  stW - j2 * s * 0.018,
                  s * 0.04,
                );
              }
              bx += stW + s * 0.02;
              continue;
            }
            const bw2 = s * (0.055 + (hh % 3) * 0.02);
            const bh2 = s * (0.22 + ((hh >> 4) % 4) * 0.022);
            ctx.fillStyle = SPINES[hh % SPINES.length]!;
            if ((hh & 7) === 0) {
              // The odd leaning volume breaks the soldier row.
              ctx.save();
              ctx.translate(bx + bw2 / 2, floor);
              ctx.rotate(0.16);
              ctx.fillRect(-bw2 / 2, -bh2, bw2, bh2);
              ctx.restore();
            } else {
              ctx.fillRect(bx, floor - bh2, bw2, bh2);
              if ((hh & 3) === 1) {
                // Gilt tooling bands on the finer bindings.
                ctx.fillStyle = 'rgba(242, 217, 138, 0.75)';
                ctx.fillRect(bx + s * 0.008, floor - bh2 + s * 0.035, bw2 - s * 0.016, s * 0.014);
                ctx.fillRect(bx + s * 0.008, floor - s * 0.05, bw2 - s * 0.016, s * 0.014);
              }
            }
            bx += bw2 + s * 0.014;
          }
        }
        // The shelf board: lit front edge over a lip shadow.
        ctx.fillStyle = shade(frame, 14);
        ctx.fillRect(cavL - s * 0.01, floor, cavW + s * 0.02, s * 0.028);
        ctx.fillStyle = 'rgba(18, 12, 26, 0.28)';
        ctx.fillRect(cavL, floor + s * 0.028, cavW, s * 0.022);
      }
      // The TOP — our camera is a tilted bird's eye, never a
      // straight-on elevation: tall casework must show a
      // foreshortened top plane (the crate-lid law), crowned by
      // a sunlit cornice lip along its front arris.
      const topD = syT * 0.34;
      ctx.fillStyle = shade(frame, 16);
      ctx.beginPath();
      chamferRect(ctx, xw - s * 0.035, baseY - uh - topD, uw + s * 0.07, topD + s * 0.015, s * 0.035);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1.2, s * 0.024);
      ctx.stroke();
      // Far edge falls away into shade; dust of the years.
      ctx.fillStyle = shade(frame, 6);
      ctx.fillRect(xw - s * 0.005, baseY - uh - topD + s * 0.012, uw + s * 0.01, s * 0.03);
      ctx.fillStyle = shade(frame, 26);
      ctx.fillRect(xw - s * 0.035, baseY - uh - s * 0.02, uw + s * 0.07, s * 0.035);
      ctx.fillStyle = 'rgba(18, 12, 26, 0.25)';
      ctx.fillRect(xw - s * 0.02, baseY - uh + s * 0.03, uw + s * 0.04, s * 0.022);
      // A gilt spine catches the lamplight now and then.
      const tw = twinkle(t, h, 3.6);
      if (tw > 0) rend.sparkle(p.x - uw * 0.18, baseY - uh * 0.62, s * 0.05, 0.5 * tw, '#f2d98a');
    },
  };
}

function paintCabinet(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.22;
  // Chest-high casework; the tile hash deals a two-door cupboard
  // or a chest of drawers, so cabinetry never repeats door-for-
  // door across a room.
  const uw = s * 0.78;
  const uh = s * 0.98;
  const frame = '#6f4d26';
  const xw = p.x - uw / 2;
  const dresser = ((h >> 1) & 1) === 1;
  return {
    sortY: ty + 0.72,
    body: stationBody(0.62, 1.55, 0.5),
    drawShadow: () => rend.castEdgeQuad(xw, baseY, p.x + uw / 2, baseY, 0.9),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // Bracket feet under the carcass.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
      ctx.fillRect(xw - s * 0.02, baseY - s * 0.015, uw + s * 0.04, s * 0.05);
      ctx.fillStyle = '#4a3116';
      ctx.fillRect(xw + s * 0.02, baseY - s * 0.05, s * 0.09, s * 0.05);
      ctx.fillRect(p.x + uw / 2 - s * 0.11, baseY - s * 0.05, s * 0.09, s * 0.05);
      // Carcass with lit west / shaded east stiles, dark-rimmed.
      ctx.fillStyle = frame;
      ctx.beginPath();
      ctx.rect(xw, baseY - uh, uw, uh - s * 0.045);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1.2, s * 0.026);
      ctx.stroke();
      ctx.fillStyle = shade(frame, 10);
      ctx.fillRect(xw, baseY - uh, s * 0.045, uh - s * 0.045);
      ctx.fillStyle = shade(frame, -12);
      ctx.fillRect(p.x + uw / 2 - s * 0.045, baseY - uh, s * 0.045, uh - s * 0.045);
      if (dresser) {
        // A chest of drawers, the top one not quite pushed home.
        for (let d2 = 0; d2 < 3; d2++) {
          const dy0 = baseY - uh + s * (0.1 + d2 * 0.27);
          const ajar = d2 === 0 && (h & 8) !== 0;
          const off = ajar ? s * 0.035 : 0;
          if (ajar) {
            ctx.fillStyle = '#241a28';
            ctx.fillRect(xw + s * 0.06, dy0, uw - s * 0.12, s * 0.05);
          }
          ctx.fillStyle = shade(frame, -8 + d2 * 2);
          ctx.fillRect(xw + s * 0.06, dy0 + off, uw - s * 0.12, s * 0.22);
          ctx.fillStyle = shade(frame, 8);
          ctx.fillRect(xw + s * 0.06, dy0 + off, uw - s * 0.12, s * 0.02);
          ctx.fillStyle = '#c9962e';
          for (const kx of [-0.16, 0.16] as const) {
            ctx.beginPath();
            facetCircle(ctx, p.x + kx * s, dy0 + off + s * 0.115, s * 0.022, 6, 0.3);
            ctx.fill();
          }
          if (ajar) {
            // A sleeve of linen caught in the gap.
            ctx.fillStyle = '#e8dfc8';
            ctx.fillRect(p.x - s * 0.04, dy0 + s * 0.012, s * 0.1, s * 0.032);
          }
        }
      } else {
        // Rail-and-stile doors hung on strap hinges. The door
        // leaf sits LIGHTER than the carcass with a deep-set
        // panel — contrast, or the front reads as one dark slab.
        ctx.fillStyle = 'rgba(26, 20, 36, 0.4)';
        ctx.fillRect(p.x - s * 0.012, baseY - uh + s * 0.09, s * 0.024, uh - s * 0.22);
        for (const sideK of [-1, 1] as const) {
          const dx0 = sideK < 0 ? xw + s * 0.06 : p.x + s * 0.015;
          const dw = uw / 2 - s * 0.075;
          ctx.fillStyle = shade(frame, sideK < 0 ? 5 : -1);
          ctx.fillRect(dx0, baseY - uh + s * 0.09, dw, uh - s * 0.22);
          ctx.fillStyle = shade(frame, -18);
          ctx.fillRect(dx0 + s * 0.05, baseY - uh + s * 0.17, dw - s * 0.1, uh - s * 0.38);
          ctx.fillStyle = shade(frame, 8);
          ctx.fillRect(dx0 + s * 0.05, baseY - uh + s * 0.17, dw - s * 0.1, s * 0.022);
          // Strap hinges reaching in from the stiles.
          ctx.fillStyle = '#3a3444';
          const hx0 = sideK < 0 ? dx0 - s * 0.01 : dx0 + dw - s * 0.1;
          for (const hy of [0.2, 0.62] as const) {
            const hyy = baseY - uh + uh * hy;
            ctx.fillRect(hx0, hyy, s * 0.11, s * 0.028);
            ctx.beginPath();
            facetCircle(
              ctx,
              sideK < 0 ? hx0 + s * 0.115 : hx0 - s * 0.006,
              hyy + s * 0.014,
              s * 0.021,
              6,
              0.2,
            );
            ctx.fill();
          }
        }
        // Knobs + a keyhole plate — someone owns this cupboard.
        ctx.fillStyle = '#c9962e';
        ctx.fillRect(p.x - s * 0.065, baseY - uh * 0.52, s * 0.035, s * 0.035);
        ctx.fillRect(p.x + s * 0.03, baseY - uh * 0.52, s * 0.035, s * 0.035);
        ctx.fillStyle = shade('#c9962e', -18);
        ctx.fillRect(p.x + s * 0.032, baseY - uh * 0.52 + s * 0.055, s * 0.03, s * 0.04);
      }
      // The TOP: a foreshortened plane, not a lip — the tilted
      // bird's-eye camera must see the boards a household sets
      // its crockery on (crate-lid law).
      const topD = syT * 0.32;
      ctx.fillStyle = shade(frame, 16);
      ctx.beginPath();
      chamferRect(ctx, xw - s * 0.03, baseY - uh - topD, uw + s * 0.06, topD + s * 0.015, s * 0.03);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1.2, s * 0.024);
      ctx.stroke();
      ctx.fillStyle = shade(frame, 6);
      ctx.fillRect(xw - s * 0.005, baseY - uh - topD + s * 0.012, uw + s * 0.01, s * 0.028);
      ctx.fillStyle = shade(frame, 26);
      ctx.fillRect(xw - s * 0.03, baseY - uh - s * 0.02, uw + s * 0.06, s * 0.032);
      ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
      ctx.fillRect(xw - s * 0.015, baseY - uh + s * 0.035, uw + s * 0.03, s * 0.02);
      // What lives on top — a jug and bowl, a plate stack,
      // folded linens, or bare boards — dealt by the tile,
      // standing ON the top plane, not perched on its front lip.
      const c2 = (h >> 4) % 4;
      const cyT = baseY - uh - topD * 0.45;
      if (c2 === 0) {
        // Stoneware jug + wash bowl.
        ctx.fillStyle = '#7d94a0';
        ctx.beginPath();
        chamferRect(ctx, p.x - s * 0.17, cyT - s * 0.17, s * 0.11, s * 0.17, [s * 0.02, s * 0.02, 0, 0]);
        ctx.fill();
        ctx.fillStyle = shade('#7d94a0', 12);
        ctx.fillRect(p.x - s * 0.17, cyT - s * 0.17, s * 0.035, s * 0.17);
        ctx.fillRect(p.x - s * 0.145, cyT - s * 0.205, s * 0.06, s * 0.04);
        ctx.strokeStyle = '#7d94a0';
        ctx.lineWidth = Math.max(1, s * 0.02);
        ctx.beginPath();
        ctx.arc(p.x - s * 0.045, cyT - s * 0.12, s * 0.03, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        ctx.fillStyle = '#e8dfc8';
        ctx.beginPath();
        facetCircle(ctx, p.x + s * 0.12, cyT - s * 0.035, s * 0.085, 6, 0.3, 0.5);
        ctx.fill();
        ctx.fillStyle = shade('#e8dfc8', -12);
        ctx.beginPath();
        facetCircle(ctx, p.x + s * 0.12, cyT - s * 0.038, s * 0.055, 6, 0.3, 0.5);
        ctx.fill();
      } else if (c2 === 1) {
        // Plates, stacked not quite square.
        for (let j2 = 0; j2 < 3; j2++) {
          ctx.fillStyle = j2 === 2 ? '#f4efe0' : '#e8dfc8';
          ctx.fillRect(
            p.x - s * 0.1 + ((h >> j2) % 3) * s * 0.008,
            cyT - s * 0.035 * (j2 + 1),
            s * 0.2 - j2 * s * 0.015,
            s * 0.032,
          );
        }
      } else if (c2 === 2) {
        // Folded linens: house cloth over bleached sheet.
        ctx.fillStyle = '#96586a';
        ctx.fillRect(p.x - s * 0.14, cyT - s * 0.06, s * 0.28, s * 0.06);
        ctx.fillStyle = '#e8dfc8';
        ctx.fillRect(p.x - s * 0.14, cyT - s * 0.115, s * 0.28, s * 0.055);
        ctx.fillStyle = shade('#e8dfc8', -10);
        ctx.fillRect(p.x - s * 0.14, cyT - s * 0.075, s * 0.28, s * 0.016);
      }
    },
  };
}

function paintHearth(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.3;
  // A full chimney piece built to the body-ruler: firebox at the
  // waist, mantel at the chest, breast past head height. Every
  // horizontal — hearthstone, mantel, shoulder ledges, crown —
  // is a foreshortened plane the tilted camera can see.
  const hw = s * 1.02;
  const hh2 = s * 1.78;
  const stone = '#55505e';
  return {
    sortY: ty + 0.78,
    body: stationBody(1.0, 2.3, 0.7),
    drawShadow: () => rend.castEdgeQuad(p.x - hw / 2, baseY, p.x + hw / 2, baseY, 1.65),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // The hearthstone apron: a flagstone plane laid in front of
      // the firebox — the floor the fire lives on, seen in plan.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
      ctx.fillRect(p.x - hw / 2 - s * 0.03, baseY - s * 0.01, hw + s * 0.06, s * 0.05);
      ctx.fillStyle = shade(stone, 6);
      ctx.beginPath();
      chamferRect(ctx, p.x - hw * 0.42, baseY - s * 0.02, hw * 0.84, syT * 0.3, s * 0.045);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1.2, s * 0.026);
      ctx.stroke();
      // Flag seams + a lit south lip on the apron slab.
      ctx.fillStyle = 'rgba(20, 14, 28, 0.28)';
      ctx.fillRect(p.x - hw * 0.14, baseY, s * 0.022, syT * 0.26);
      ctx.fillRect(p.x + hw * 0.12, baseY, s * 0.022, syT * 0.26);
      ctx.fillStyle = shade(stone, 18);
      ctx.fillRect(p.x - hw * 0.42, baseY + syT * 0.25, hw * 0.84, s * 0.035);
      // Chimney breast tapers above the mantel.
      ctx.fillStyle = stone;
      ctx.beginPath();
      ctx.moveTo(p.x - hw / 2, baseY);
      ctx.lineTo(p.x - hw / 2, baseY - hh2 * 0.48);
      ctx.lineTo(p.x - hw * 0.3, baseY - hh2 * 0.62);
      ctx.lineTo(p.x - hw * 0.3, baseY - hh2);
      ctx.lineTo(p.x + hw * 0.3, baseY - hh2);
      ctx.lineTo(p.x + hw * 0.3, baseY - hh2 * 0.62);
      ctx.lineTo(p.x + hw / 2, baseY - hh2 * 0.48);
      ctx.lineTo(p.x + hw / 2, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1.2, s * 0.026);
      ctx.stroke();
      // Sun keeps the west flank and loses the east — breast and
      // stack both, the same law as every wall in town.
      ctx.fillStyle = shade(stone, -10);
      ctx.fillRect(p.x + hw * 0.19, baseY - hh2, hw * 0.11, hh2 * 0.36);
      ctx.fillRect(p.x + hw * 0.38, baseY - hh2 * 0.48, hw * 0.12, hh2 * 0.46);
      ctx.fillStyle = shade(stone, 10);
      ctx.fillRect(p.x - hw * 0.3, baseY - hh2, hw * 0.09, hh2 * 0.36);
      ctx.fillRect(p.x - hw * 0.5, baseY - hh2 * 0.48, hw * 0.1, hh2 * 0.46);
      // Cut-stone coursing: staggered header ticks, not lines.
      ctx.fillStyle = 'rgba(20, 14, 28, 0.3)';
      for (let r2 = 0; r2 < 3; r2++) {
        const cy2 = baseY - hh2 * (0.72 + r2 * 0.09);
        ctx.fillRect(p.x - hw * 0.3, cy2, hw * 0.6, s * 0.024);
        for (let c2 = 0; c2 < 3; c2++) {
          ctx.fillRect(p.x - hw * 0.26 + ((c2 * 2 + (r2 & 1)) * hw * 0.6) / 6, cy2 + s * 0.024, s * 0.02, s * 0.055);
        }
      }
      // The shoulder ledges where the breast steps back to the
      // stack: two sloped planes catching the sky — the cut the
      // silhouette makes, shown as surface.
      for (const sd of [-1, 1] as const) {
        ctx.fillStyle = shade(stone, sd < 0 ? 22 : 14);
        ctx.beginPath();
        ctx.moveTo(p.x + sd * hw * 0.5, baseY - hh2 * 0.48);
        ctx.lineTo(p.x + sd * hw * 0.3, baseY - hh2 * 0.62);
        ctx.lineTo(p.x + sd * hw * 0.3, baseY - hh2 * 0.62 + s * 0.045);
        ctx.lineTo(p.x + sd * hw * 0.5, baseY - hh2 * 0.48 + s * 0.045);
        ctx.closePath();
        ctx.fill();
      }
      // The crown: a foreshortened cap plane on the stack, its
      // dark flue slot sunk in the middle — the top the tilted
      // bird's eye must see on anything this tall.
      const crD = syT * 0.26;
      ctx.fillStyle = shade(stone, 16);
      ctx.beginPath();
      chamferRect(ctx, p.x - hw * 0.345, baseY - hh2 - crD, hw * 0.69, crD + s * 0.02, s * 0.035);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1.2, s * 0.024);
      ctx.stroke();
      ctx.fillStyle = shade(stone, 4);
      ctx.fillRect(p.x - hw * 0.31, baseY - hh2 - crD + s * 0.018, hw * 0.62, s * 0.028);
      ctx.fillStyle = '#1c1524';
      ctx.beginPath();
      chamferRect(ctx, p.x - hw * 0.2, baseY - hh2 - crD * 0.62, hw * 0.4, crD * 0.44, s * 0.025);
      ctx.fill();
      ctx.fillStyle = shade(stone, 28);
      ctx.fillRect(p.x - hw * 0.345, baseY - hh2 - s * 0.012, hw * 0.69, s * 0.032);
      // Warm haze stands over the flue when the fire is drawing.
      const flick = 0.85 + Math.sin(t * 9 + tx * 2.7) * 0.12 + Math.sin(t * 21 + ty) * 0.06;
      for (let i = 0; i < 2; i++) {
        const ph = (t * (0.22 + i * 0.08) + i * 0.5 + h * 0.13) % 1;
        ctx.fillStyle = `rgba(150, 142, 156, ${(1 - ph) * 0.2})`;
        ctx.beginPath();
        facetCircle(
          ctx,
          p.x + Math.sin(t * 0.8 + i * 2.4 + h) * s * 0.04 + ph * s * 0.1,
          baseY - hh2 - crD * 0.5 - ph * s * 0.42,
          s * (0.05 + ph * 0.08),
          6,
          ph * 2 + i,
          0.8,
        );
        ctx.fill();
      }
      // The mantel: a real shelf plane at the chest — deep
      // enough to keep things on, rimmed and lit like casework.
      const manY = baseY - hh2 * 0.48;
      const manD = syT * 0.24;
      ctx.fillStyle = shade(stone, 18);
      ctx.beginPath();
      chamferRect(ctx, p.x - hw / 2 - s * 0.06, manY - manD, hw + s * 0.12, manD + s * 0.055, s * 0.04);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1.2, s * 0.024);
      ctx.stroke();
      ctx.fillStyle = shade(stone, 8);
      ctx.fillRect(p.x - hw / 2 - s * 0.02, manY - manD + s * 0.014, hw + s * 0.04, s * 0.026);
      ctx.fillStyle = shade(stone, 30);
      ctx.fillRect(p.x - hw / 2 - s * 0.06, manY + s * 0.02, hw + s * 0.12, s * 0.035);
      ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
      ctx.fillRect(p.x - hw / 2 - s * 0.04, manY + s * 0.055, hw + s * 0.08, s * 0.028);
      // Mantel keepings, standing ON the shelf plane: a stoneware
      // jug at one end and a pair of old candlesticks at the
      // other — lit with the house at dusk.
      const jx = p.x - hw * 0.34;
      ctx.fillStyle = '#7d84a0';
      ctx.beginPath();
      chamferRect(ctx, jx - s * 0.05, manY - manD * 0.4 - s * 0.15, s * 0.1, s * 0.15, [s * 0.02, s * 0.02, 0, 0]);
      ctx.fill();
      ctx.fillStyle = shade('#7d84a0', -16);
      ctx.fillRect(jx - s * 0.037, manY - manD * 0.4 - s * 0.165, s * 0.074, s * 0.028);
      const lit = rend.sky.flame;
      for (const cnd of [0.3, 0.4] as const) {
        const ccx = p.x + hw * cnd;
        const ccy = manY - manD * 0.42;
        ctx.fillStyle = '#c9962e';
        ctx.fillRect(ccx - s * 0.028, ccy - s * 0.03, s * 0.056, s * 0.03);
        ctx.fillStyle = '#e8dfc8';
        ctx.fillRect(ccx - s * 0.018, ccy - s * (0.1 + cnd * 0.1), s * 0.036, s * (0.07 + cnd * 0.1));
        if (lit > 0.05) {
          ctx.fillStyle = `rgba(255, 205, 120, ${Math.min(1, 0.9 * lit * flick)})`;
          ctx.beginPath();
          ctx.moveTo(ccx, ccy - s * (0.1 + cnd * 0.1));
          ctx.quadraticCurveTo(ccx - s * 0.028, ccy - s * (0.15 + cnd * 0.1), ccx, ccy - s * (0.2 + cnd * 0.1));
          ctx.quadraticCurveTo(ccx + s * 0.028, ccy - s * (0.15 + cnd * 0.1), ccx, ccy - s * (0.1 + cnd * 0.1));
          ctx.fill();
        } else {
          ctx.fillStyle = '#2c2836';
          ctx.fillRect(ccx - s * 0.004, ccy - s * (0.12 + cnd * 0.1), s * 0.008, s * 0.024);
        }
      }
      // Firebox: dark mouth with 45-degree shoulders, tall
      // enough to stack a real fire in.
      ctx.fillStyle = '#1c1524';
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.32, baseY);
      ctx.lineTo(p.x - hw * 0.32, baseY - hh2 * 0.28);
      ctx.lineTo(p.x - hw * 0.2, baseY - hh2 * 0.38);
      ctx.lineTo(p.x + hw * 0.2, baseY - hh2 * 0.38);
      ctx.lineTo(p.x + hw * 0.32, baseY - hh2 * 0.28);
      ctx.lineTo(p.x + hw * 0.32, baseY);
      ctx.closePath();
      ctx.fill();
      // Firelight licks the firebox reveal — the opening glows
      // from within before the flames even draw.
      ctx.fillStyle = `rgba(232, 130, 61, ${0.16 * flick})`;
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.28, baseY);
      ctx.lineTo(p.x - hw * 0.28, baseY - hh2 * 0.3);
      ctx.lineTo(p.x + hw * 0.28, baseY - hh2 * 0.3);
      ctx.lineTo(p.x + hw * 0.28, baseY);
      ctx.closePath();
      ctx.fill();
      // Firelight spills out over the hearthstone plane — the
      // room-side pool that says warmth from across the hall.
      ctx.fillStyle = `rgba(232, 130, 61, ${0.12 * flick})`;
      ctx.beginPath();
      facetCircle(ctx, p.x, baseY + syT * 0.12, hw * 0.36, 8, 0.3, 0.4);
      ctx.fill();
      // Andiron dogs holding the logs off the stone, then the
      // fire: three flickering tongues whose tips wander
      // independently (primary flame, secondary sway).
      ctx.fillStyle = '#3a3544';
      ctx.fillRect(p.x - hw * 0.24, baseY - s * 0.09, s * 0.035, s * 0.09);
      ctx.fillRect(p.x + hw * 0.24 - s * 0.035, baseY - s * 0.09, s * 0.035, s * 0.09);
      ctx.fillStyle = '#6f4d26';
      ctx.fillRect(p.x - hw * 0.22, baseY - s * 0.1, hw * 0.44, s * 0.07);
      ctx.fillStyle = '#5a3d1e';
      ctx.fillRect(p.x - hw * 0.16, baseY - s * 0.16, hw * 0.32, s * 0.07);
      for (const [ox, fh, col] of [
        [-0.11, 0.38, '#e8823d'],
        [0.09, 0.33, '#e8823d'],
        [0, 0.52, '#f4b13d'],
      ] as const) {
        ctx.fillStyle = col;
        const fx = p.x + ox * hw;
        const top = baseY - s * 0.14 - s * fh * flick;
        ctx.beginPath();
        ctx.moveTo(fx - s * 0.08, baseY - s * 0.12);
        ctx.lineTo(fx + s * 0.08, baseY - s * 0.12);
        ctx.lineTo(fx + Math.sin(t * 7 + ox * 20) * s * 0.04, top);
        ctx.closePath();
        ctx.fill();
      }
      // A drifting ember above the flames.
      const ey2 = (t * 0.5 + h * 0.07) % 1;
      ctx.fillStyle = `rgba(255, 190, 110, ${(1 - ey2) * 0.7})`;
      ctx.fillRect(
        p.x + Math.sin(t * 3 + h) * s * 0.06,
        baseY - s * 0.2 - ey2 * s * 0.3,
        s * 0.025,
        s * 0.025,
      );
    },
  };
}

function paintMarketStall(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, t, stationBody, game, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const isRun = (t2: number | undefined) => t2 === Tile.MarketStall;
  const je = isRun(game.world.groundAt(tx + 1, ty));
  const jw = isRun(game.world.groundAt(tx - 1, ty));
  // The banner belongs to the RUN: walk to the west anchor so a
  // merged stall wears one cloth and neighbouring stands each
  // draw a different bolt from the roster.
  let ax = tx;
  for (let i = 0; i < 8 && isRun(game.world.groundAt(ax - 1, ty)); i++) ax--;
  const style =
    STALL_BANNERS[hashCoords(97, ax, ty) % STALL_BANNERS.length]!;
  const hg = hashCoords(53, tx, ty);
  const baseY = p.y + syT * 0.42;
  // THE SHARED-EDGE LAW (the wallItem lesson): run-mates' base
  // fills meet on ONE device-grid edge. The stall used raw
  // float joints — the counter, display top and trim printed a
  // permanent AA seam column at almost every zoom, the one
  // multi-tile painter with neither snap nor bleed. Free ends
  // stay float; the cloth overhead keeps its overlap bleed
  // (same-color run cloth re-covers invisibly).
  const xL = jw ? rend.camera.snapPx(p.x - s * 0.5) : p.x - s * 0.5;
  const xR = je ? rend.camera.snapPx(p.x + s * 0.5) : p.x + s * 0.5;
  // STALL ARCHITECTURE LAW: chest-high counter with a FULL-TILE
  // display top, then open air, then the awning high overhead.
  // The valance hem clears the head of a seller standing one row
  // north, so the merchant shows hips-to-face through the window
  // (the same open-interior thinking that removed roofs); their
  // legs vanish behind the deep top — standing-behind-the-counter
  // falls out of the geometry, not a special case.
  const faceH = s * 0.66;
  const faceTop = baseY - faceH;
  const topBack = faceTop - syT;
  const tipY = baseY - s * 2.08;
  const hemY = baseY - s * 2.3;
  const canTop = baseY - s * 2.6;
  return {
    sortY: ty + 0.78,
    body: je || jw ? undefined : stationBody(1.35, 2.4, 0.8),
    drawShadow: () => rend.castEdgeQuad(xL, baseY + syT * 0.05, xR, baseY + syT * 0.05, 1.0),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      const wind = windAtInto(WIND_TMP, tx + 0.5, ty + 0.5, t);
      // Base fills span edge-to-edge between the SHARED-EDGE
      // joints — a hardcoded `s` width from a snapped left edge
      // would miss the snapped right edge by the snap remainder.
      const tileL = xL;
      const tileR = xR;
      const tw = tileR - tileL;
      // Contact shade under the stand.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
      ctx.fillRect(tileL, baseY - s * 0.01, tw, s * 0.05);
      // Display top first: a full tile of goods room, dimmer at
      // the back where the awning's shade falls.
      ctx.fillStyle = '#9a7040';
      ctx.fillRect(tileL, topBack, tw, syT);
      ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
      ctx.fillRect(tileL, topBack, tw, syT * 0.3);
      // Counter face: the ShopCounter family's joinery — plinth
      // and recessed panels — so stalls, counters, and tables
      // compose into one market vocabulary.
      ctx.fillStyle = '#4a3116';
      ctx.fillRect(tileL, baseY - s * 0.07, tw, s * 0.07);
      ctx.fillStyle = '#5e3f1e';
      ctx.fillRect(tileL, faceTop, tw, faceH - s * 0.07);
      ctx.fillStyle = shade('#5e3f1e', -12);
      for (const px2 of [-0.42, 0.04] as const) {
        ctx.fillRect(p.x + px2 * s, faceTop + s * 0.1, s * 0.38, faceH - s * 0.28);
      }
      ctx.fillStyle = shade('#5e3f1e', 10);
      for (const px2 of [-0.42, 0.04] as const) {
        ctx.fillRect(p.x + px2 * s, faceTop + s * 0.1, s * 0.38, s * 0.025);
      }
      // The bright working lip along the top's south edge.
      ctx.fillStyle = '#b08347';
      ctx.fillRect(tileL, faceTop - s * 0.035, tw, s * 0.05);
      // Wares: two or three goods per tile, hash-picked so no
      // two stalls stock the same shelf.
      const slots = (hg & 1) === 0 ? [-0.28, 0.28] : [-0.3, 0, 0.3];
      for (let i = 0; i < slots.length; i++) {
        rend.drawStallGood(
          (hg >>> (i * 5)) % 6,
          p.x + slots[i]! * s,
          topBack + syT * (0.52 + (((hg >>> (i * 3)) % 5) - 2) * 0.055),
          s,
          hg + i * 977,
        );
      }
      // Corner posts carry the awning — run ends only, so a
      // merged row reads as one long stand.
      if (!jw) {
        ctx.fillStyle = '#5e3f1e';
        ctx.fillRect(xL + s * 0.03, hemY - s * 0.04, s * 0.09, baseY - hemY + s * 0.04);
        ctx.fillStyle = shade('#5e3f1e', 12);
        ctx.fillRect(xL + s * 0.03, hemY - s * 0.04, s * 0.03, baseY - hemY + s * 0.04);
      }
      if (!je) {
        ctx.fillStyle = '#5e3f1e';
        ctx.fillRect(xR - s * 0.12, hemY - s * 0.04, s * 0.09, baseY - hemY + s * 0.04);
        ctx.fillStyle = shade('#5e3f1e', 12);
        ctx.fillRect(xR - s * 0.12, hemY - s * 0.04, s * 0.03, baseY - hemY + s * 0.04);
      }
      // The awning slab, styled per the run's banner.
      const oxL = jw ? tileL - 0.5 : tileL - s * 0.07;
      const oxR = je ? tileR + 0.5 : tileR + s * 0.07;
      // Stripe/valance bands quarter the SNAPPED span, so the
      // last band lands exactly on the shared joint edge.
      const bandW = tw / 4;
      if (style.kind === 'stripes') {
        for (let k = 0; k < 4; k++) {
          ctx.fillStyle = k % 2 === 0 ? style.a : style.b;
          ctx.fillRect(tileL + k * bandW, canTop, bandW + 0.5, hemY - canTop);
        }
        if (!jw) {
          ctx.fillStyle = style.a;
          ctx.fillRect(oxL, canTop, tileL - oxL + 0.5, hemY - canTop);
        }
        if (!je) {
          ctx.fillStyle = style.b;
          ctx.fillRect(tileR, canTop, oxR - tileR, hemY - canTop);
        }
      } else {
        ctx.fillStyle = style.a;
        ctx.fillRect(oxL, canTop, oxR - oxL, hemY - canTop);
        if (style.kind === 'chevron') {
          ctx.fillStyle = style.b;
          ctx.fillRect(oxL, hemY - s * 0.08, oxR - oxL, s * 0.08);
          // The top carries the hem's points north over the band,
          // so both planes read as one sewn cloth.
          for (let k = 0; k < 4; k++) {
            const vx = tileL + k * bandW;
            ctx.beginPath();
            ctx.moveTo(vx + bandW * 0.18, hemY - s * 0.08);
            ctx.lineTo(vx + bandW * 0.82, hemY - s * 0.08);
            ctx.lineTo(vx + bandW * 0.5, hemY - s * 0.26);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
      // Batten seams: the top is four bolts of cloth stretched
      // over ribs — a shade seam at each joint with a sun ridge
      // beside it, so the big plane reads sewn, never painted.
      ctx.fillStyle = 'rgba(20, 14, 28, 0.16)';
      for (let k = 1; k < 4; k++)
        ctx.fillRect(tileL + k * bandW - s * 0.01, canTop, s * 0.02, hemY - canTop);
      ctx.fillStyle = 'rgba(255, 252, 235, 0.1)';
      for (let k = 1; k < 4; k++)
        ctx.fillRect(tileL + k * bandW + s * 0.012, canTop, s * 0.012, hemY - canTop);
      // The cloth answers the same wind the grass feels: broad
      // shimmer swells, a sun-warmed hem, a shaded back lip.
      ctx.fillStyle = `rgba(255, 252, 235, ${0.03 + 0.04 * Math.max(0, wind.l)})`;
      ctx.fillRect(oxL, canTop, oxR - oxL, hemY - canTop);
      ctx.fillStyle = 'rgba(255, 235, 200, 0.1)';
      ctx.fillRect(oxL, hemY - s * 0.05, oxR - oxL, s * 0.05);
      ctx.fillStyle = 'rgba(20, 14, 28, 0.22)';
      ctx.fillRect(oxL, canTop, oxR - oxL, s * 0.04);
      // Valance: the hanging hem. Tips lean with the gusts, each
      // a beat out of phase with its neighbour.
      const gust = 0.6 + 0.35 * Math.max(0, wind.s);
      for (let k = 0; k < 4; k++) {
        const vx = tileL + k * bandW;
        const lean =
          (wind.bx * 0.4 + Math.sin(t * 2.2 + tx * 1.3 + k * 1.9) * 0.5) * s * 0.06 * gust;
        if (style.kind === 'solid') {
          ctx.fillStyle = style.a;
          ctx.beginPath();
          ctx.moveTo(vx, hemY);
          ctx.lineTo(vx + bandW, hemY);
          ctx.lineTo(vx + bandW * 0.78 + lean * 0.6, tipY + s * 0.02);
          ctx.lineTo(vx + bandW * 0.22 + lean, tipY);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle =
            style.kind === 'chevron'
              ? k % 2 === 0
                ? style.b
                : style.a
              : k % 2 === 0
                ? style.a
                : style.b;
          ctx.beginPath();
          ctx.moveTo(vx, hemY);
          ctx.lineTo(vx + bandW, hemY);
          ctx.lineTo(vx + bandW * 0.5 + lean, tipY);
          ctx.closePath();
          ctx.fill();
        }
      }
      if (style.kind === 'solid') {
        // The trim line the merchant sewed on.
        ctx.fillStyle = style.b;
        ctx.fillRect(tileL, hemY - s * 0.018, tw, s * 0.036);
      }
    },
  };
}

function paintBannerPole(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty, poleDye } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.14;
  // THE DYE LAW: a builder's pole flies the dye they chose; the
  // authored pole keeps the town's hash-dealt roster.
  const pal = poleDye
    ? AWNING_CLOTHS[poleDye.dye]!.a
    : (['#7a3f8f', '#97322f', '#2e7d72', '#31589c'] as const)[h % 4]!;
  // A civic standard: the crossarm rides well above head height.
  const ph = s * 1.85;
  return {
    sortY: ty + 0.8,
    body: stationBody(0.7, 2.6, 0.5),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - s * 0.05, baseY, p.x + s * 0.05, baseY, 1.75);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // Contact shade + two-step stone foot.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, s * 0.17, s * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5b5566';
      ctx.beginPath();
      facetCircle(ctx, p.x, baseY, s * 0.14, 6, 0.2, 0.6);
      ctx.fill();
      ctx.fillStyle = '#6a6577';
      ctx.beginPath();
      facetCircle(ctx, p.x, baseY - s * 0.05, s * 0.1, 6, 0.2, 0.6);
      ctx.fill();
      // Tapered iron pole, west edge catching light, crossarm
      // with a brace, gold finial.
      ctx.fillStyle = '#2c2836';
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.045, baseY);
      ctx.lineTo(p.x + s * 0.045, baseY);
      ctx.lineTo(p.x + s * 0.03, baseY - ph);
      ctx.lineTo(p.x - s * 0.03, baseY - ph);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#454052';
      ctx.fillRect(p.x - s * 0.035, baseY - ph * 0.92, s * 0.02, ph * 0.84);
      ctx.fillStyle = '#2c2836';
      ctx.fillRect(p.x - s * 0.03, baseY - ph, s * 0.42, s * 0.05);
      ctx.beginPath();
      ctx.moveTo(p.x + s * 0.03, baseY - ph + s * 0.16);
      ctx.lineTo(p.x + s * 0.22, baseY - ph + s * 0.05);
      ctx.lineTo(p.x + s * 0.22, baseY - ph + s * 0.1);
      ctx.lineTo(p.x + s * 0.05, baseY - ph + s * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c9962e';
      ctx.beginPath();
      facetCircle(ctx, p.x, baseY - ph - s * 0.05, s * 0.05, 6, 0.5);
      ctx.fill();
      // The banner: a long swallowtail drop. The hoist swings as
      // one (primary); the tails trail a beat behind (secondary)
      // so the cloth ripples instead of stiffly tilting.
      const { sway, lag } = rend.breezeAt(tx, ty, t, tx * 1.7 + ty, s, 0.045, 0.055);
      const bx0 = p.x + s * 0.07;
      const bw2 = s * 0.34;
      const by0 = baseY - ph + s * 0.06;
      const bl = s * 1.05;
      ctx.fillStyle = pal;
      ctx.beginPath();
      ctx.moveTo(bx0, by0);
      ctx.lineTo(bx0 + bw2, by0);
      ctx.lineTo(bx0 + bw2 + sway * 0.5, by0 + bl * 0.55);
      ctx.lineTo(bx0 + bw2 + lag, by0 + bl);
      ctx.lineTo(bx0 + bw2 * 0.5 + lag, by0 + bl - s * 0.16);
      ctx.lineTo(bx0 + lag, by0 + bl);
      ctx.lineTo(bx0 + sway * 0.5, by0 + bl * 0.55);
      ctx.closePath();
      ctx.fill();
      // The cloth folds: a shaded inner panel below the emblem.
      ctx.fillStyle = shade(pal, -12);
      ctx.beginPath();
      ctx.moveTo(bx0 + bw2 * 0.32, by0 + bl * 0.55);
      ctx.lineTo(bx0 + bw2 * 0.44, by0 + bl * 0.55);
      ctx.lineTo(bx0 + bw2 * 0.4 + lag * 0.7, by0 + bl * 0.9);
      ctx.lineTo(bx0 + bw2 * 0.28 + lag * 0.7, by0 + bl * 0.9);
      ctx.closePath();
      ctx.fill();
      // A lighter chevron emblem at the hoist.
      ctx.fillStyle = shade(pal, 26);
      ctx.beginPath();
      ctx.moveTo(bx0 + bw2 * 0.2, by0 + bl * 0.18);
      ctx.lineTo(bx0 + bw2 * 0.5, by0 + bl * 0.32);
      ctx.lineTo(bx0 + bw2 * 0.8, by0 + bl * 0.18);
      ctx.lineTo(bx0 + bw2 * 0.8, by0 + bl * 0.27);
      ctx.lineTo(bx0 + bw2 * 0.5, by0 + bl * 0.41);
      ctx.lineTo(bx0 + bw2 * 0.2, by0 + bl * 0.27);
      ctx.closePath();
      ctx.fill();
    },
  };
}

function paintHangingSign(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.14;
  // The shingle hangs above head height, as a shop sign must.
  const ph = s * 1.55;
  return {
    sortY: ty + 0.8,
    body: stationBody(0.85, 2.4, 0.45),
    drawShadow: () => rend.castEdgeQuad(p.x - s * 0.18, baseY, p.x - s * 0.06, baseY, 1.45),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // Contact shade at the post foot.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
      ctx.beginPath();
      ctx.ellipse(p.x - s * 0.12, baseY + s * 0.015, s * 0.12, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      // Post + bracket arm with a 45° knee brace.
      ctx.fillStyle = '#5e3f1e';
      ctx.fillRect(p.x - s * 0.16, baseY - ph, s * 0.09, ph);
      ctx.fillRect(p.x - s * 0.16, baseY - ph, s * 0.5, s * 0.065);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.07, baseY - ph + s * 0.28);
      ctx.lineTo(p.x + s * 0.14, baseY - ph + s * 0.07);
      ctx.lineTo(p.x + s * 0.14, baseY - ph + s * 0.13);
      ctx.lineTo(p.x - s * 0.07, baseY - ph + s * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade('#5e3f1e', 14);
      ctx.fillRect(p.x - s * 0.145, baseY - ph + s * 0.01, s * 0.04, ph - s * 0.02);
      // The shingle swings on two ropes; the board lags a
      // fraction behind the arm's phase so it feels hung, not
      // welded (secondary motion).
      const bz2 = rend.breezeAt(tx, ty, t, tx * 2.3, s, 1, 1);
      const swing = (bz2.sway / s) * 0.07;
      const bob = bz2.lag * 0.012;
      const ax = p.x + s * 0.2;
      const ay = baseY - ph + s * 0.065;
      ctx.save();
      ctx.translate(ax, ay + bob);
      ctx.rotate(swing);
      ctx.strokeStyle = '#b8a888';
      ctx.lineWidth = Math.max(1, s * 0.028);
      ctx.beginPath();
      ctx.moveTo(-s * 0.13, 0);
      ctx.lineTo(-s * 0.13, s * 0.11);
      ctx.moveTo(s * 0.13, 0);
      ctx.lineTo(s * 0.13, s * 0.11);
      ctx.stroke();
      ctx.fillStyle = '#a5793f';
      ctx.beginPath();
      chamferRect(ctx, -s * 0.22, s * 0.11, s * 0.44, s * 0.32, s * 0.04);
      ctx.fill();
      ctx.fillStyle = shade('#a5793f', 14);
      ctx.fillRect(-s * 0.2, s * 0.12, s * 0.4, s * 0.03);
      ctx.fillStyle = shade('#a5793f', -14);
      ctx.beginPath();
      chamferRect(ctx, -s * 0.17, s * 0.16, s * 0.34, s * 0.22, s * 0.025);
      ctx.fill();
      // The device: the trade's mark, hash-dealt so a lane of
      // shingles reads as different shops — tankard, loaf, fish,
      // boot, key — never one tavern cloned down the street.
      const dev = hashCoords(151, tx, ty) % 5;
      ctx.fillStyle = '#e8dfc8';
      if (dev === 0) {
        // The tankard with a handle.
        ctx.fillRect(-s * 0.055, s * 0.2, s * 0.1, s * 0.13);
        ctx.fillRect(s * 0.05, s * 0.23, s * 0.035, s * 0.06);
        ctx.fillStyle = 'rgba(36, 22, 10, 0.35)';
        ctx.fillRect(-s * 0.055, s * 0.215, s * 0.1, s * 0.02);
      } else if (dev === 1) {
        // The loaf: a fat oval wearing three bakers' scores.
        ctx.beginPath();
        ctx.ellipse(0, s * 0.27, s * 0.085, s * 0.055, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(36, 22, 10, 0.4)';
        ctx.lineWidth = Math.max(1, s * 0.012);
        for (const u of [-0.03, 0, 0.03] as const) {
          ctx.beginPath();
          ctx.moveTo(u * s - s * 0.02, s * 0.245);
          ctx.lineTo(u * s + s * 0.02, s * 0.3);
          ctx.stroke();
        }
      } else if (dev === 2) {
        // The fish: body, tail fan, one dark eye.
        ctx.beginPath();
        ctx.ellipse(-s * 0.015, s * 0.27, s * 0.075, s * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(s * 0.05, s * 0.27);
        ctx.lineTo(s * 0.095, s * 0.235);
        ctx.lineTo(s * 0.095, s * 0.305);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(36, 22, 10, 0.5)';
        ctx.fillRect(-s * 0.06, s * 0.258, s * 0.016, s * 0.016);
      } else if (dev === 3) {
        // The boot: shaft and foot with a dark sole line.
        ctx.fillRect(-s * 0.05, s * 0.2, s * 0.055, s * 0.12);
        ctx.fillRect(-s * 0.05, s * 0.29, s * 0.115, s * 0.045);
        ctx.fillStyle = 'rgba(36, 22, 10, 0.35)';
        ctx.fillRect(-s * 0.05, s * 0.322, s * 0.115, s * 0.013);
      } else {
        // The key: bow, shaft, two teeth.
        ctx.beginPath();
        ctx.arc(-s * 0.045, s * 0.245, s * 0.032, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-s * 0.03, s * 0.24, s * 0.11, s * 0.022);
        ctx.fillRect(s * 0.05, s * 0.26, s * 0.018, s * 0.035);
        ctx.fillRect(s * 0.018, s * 0.26, s * 0.018, s * 0.025);
      }
      ctx.restore();
    },
  };
}


/**
 * THE ROADSIDE POST — the sign that stands on its own.
 *
 * The shingle above hangs off a building and names it; this one
 * is planted in the ground at a fork or a gate and carries a
 * board you read head-on. Two planks (a wide name board and a
 * narrower slat under it) on a squared post, each showing its
 * foreshortened TOP plane so the casework reads 2.5D and not as
 * flat elevation. Rigid by nature — a driven post does not sway
 * — which is exactly why it can idle in the static ring cache.
 *
 * Ink strokes only appear on a board that HAS words (the
 * renderer asks signHasText): a freshly raised, unwritten post
 * must read blank, or a player would go read a sign that says
 * nothing.
 */
function paintSignpost(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  const ph = s * 1.18; // post height — board sits at head height
  const written = rend.signHasText?.(tx, ty) ?? false;
  const POST = '#6b4a24';
  const BOARD = '#c2a068';
  return {
    sortY: ty + 0.62,
    body: stationBody(0.9, 1.9, 0.45),
    drawShadow: () => rend.castEdgeQuad(p.x - s * 0.06, baseY, p.x + s * 0.06, baseY, 1.15),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // Contact shade + the little heap of earth it was driven into.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, s * 0.15, s * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a4a34';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.01, s * 0.11, s * 0.042, 0, 0, Math.PI * 2);
      ctx.fill();

      // The post: lit west flank, shaded east flank (the sun law).
      ctx.fillStyle = POST;
      ctx.fillRect(p.x - s * 0.055, baseY - ph, s * 0.11, ph);
      ctx.fillStyle = shade(POST, 14);
      ctx.fillRect(p.x - s * 0.055, baseY - ph, s * 0.035, ph);
      ctx.fillStyle = shade(POST, -16);
      ctx.fillRect(p.x + s * 0.028, baseY - ph, s * 0.027, ph);
      // Sawn cap: the post's own top plane, foreshortened.
      ctx.fillStyle = shade(POST, 26);
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - ph, s * 0.055, s * 0.022, 0, 0, Math.PI * 2);
      ctx.fill();

      /** One plank: face, foreshortened top plane, nails, ink. */
      const plank = (
        cy: number,
        hw: number,
        hh: number,
        inkRows: number,
        inkWide: number,
      ): void => {
        const top = cy - hh;
        // The top plane — a tilted bird's-eye sliver, the law
        // every piece of tall casework here keeps.
        ctx.fillStyle = shade(BOARD, 22);
        ctx.beginPath();
        ctx.moveTo(p.x - hw, top);
        ctx.lineTo(p.x + hw, top);
        ctx.lineTo(p.x + hw * 0.93, top - syT * 0.09);
        ctx.lineTo(p.x - hw * 0.93, top - syT * 0.09);
        ctx.closePath();
        ctx.fill();
        // The face.
        ctx.fillStyle = BOARD;
        ctx.beginPath();
        chamferRect(ctx, p.x - hw, top, hw * 2, hh * 2, s * 0.035);
        ctx.fill();
        // Grain seam + the shaded under-lip that seats the plank.
        ctx.fillStyle = shade(BOARD, -12);
        ctx.fillRect(p.x - hw * 0.94, cy + hh - s * 0.035, hw * 1.88, s * 0.035);
        ctx.fillStyle = shade(BOARD, -22);
        ctx.fillRect(p.x + hw - s * 0.03, top + s * 0.02, s * 0.03, hh * 2 - s * 0.04);
        // Two forged nails holding it to the post.
        ctx.fillStyle = '#3f3730';
        for (const nx of [-hw * 0.72, hw * 0.72]) {
          ctx.beginPath();
          ctx.arc(p.x + nx, cy, s * 0.018, 0, Math.PI * 2);
          ctx.fill();
        }
        if (!written) return;
        // The writing: struck marks, never letters — real glyphs
        // at world scale turn to mud. The HUD carries the words.
        ctx.fillStyle = 'rgba(48, 32, 16, 0.62)';
        for (let r = 0; r < inkRows; r++) {
          const w = hw * inkWide * (r === 0 ? 1 : 0.78 - r * 0.06);
          const ry = cy - hh * 0.42 + r * hh * 0.55;
          ctx.fillRect(p.x - w, ry, w * 2, Math.max(1, s * (r === 0 ? 0.035 : 0.022)));
        }
      };

      // Name board, then the narrower slat beneath it.
      plank(baseY - ph + s * 0.22, s * 0.42, s * 0.18, 2, 0.62);
      plank(baseY - ph + s * 0.58, s * 0.3, s * 0.1, 1, 0.5);
    },
  };
}

function paintFlowerBox(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.24;
  // THE DOORYARD TROUGH: joined carpentry, not a floor tray —
  // the box stands on two splayed legs so it reads as a made
  // thing beside the body, and the planting PACKS it: a shaded
  // back rank, a lit front rank half a pitch off, and ivy
  // tumbling both ends. Dye triad dealt by world hash — a lane
  // of boxes varies but never clashes (the garden-dye law).
  const dye = GARDEN_DYES[(h >>> 3) % 3]!;
  const boxBot = baseY - s * 0.13;
  const boxTop = boxBot - s * 0.26;
  const hw = s * 0.38;
  return {
    sortY: ty + 0.6,
    body: stationBody(0.7, 1.0, 0.45),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY, hw * 1.15, s * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
      // Splayed legs, oak-dark, feet a hair proud of the box.
      ctx.fillStyle = '#54381c';
      for (const m2 of [-1, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(p.x + m2 * hw * 0.72, boxBot);
        ctx.lineTo(p.x + m2 * (hw * 0.72 + s * 0.05), baseY);
        ctx.lineTo(p.x + m2 * (hw * 0.72 + s * 0.1), baseY);
        ctx.lineTo(p.x + m2 * (hw * 0.72 + s * 0.045), boxBot);
        ctx.closePath();
        ctx.fill();
      }
      // The trough: chamfered body, lit top rail, plank seam,
      // end-grain dovetail ticks at both corners.
      ctx.fillStyle = '#6f4d26';
      ctx.beginPath();
      chamferRect(ctx, p.x - hw, boxTop, hw * 2, boxBot - boxTop, s * 0.028);
      ctx.fill();
      ctx.fillStyle = shade('#6f4d26', 12);
      ctx.fillRect(p.x - hw, boxTop, hw * 2, s * 0.04);
      ctx.strokeStyle = 'rgba(50, 34, 16, 0.45)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(p.x - hw + s * 0.03, boxTop + (boxBot - boxTop) * 0.55);
      ctx.lineTo(p.x + hw - s * 0.03, boxTop + (boxBot - boxTop) * 0.55);
      ctx.stroke();
      for (const m2 of [-1, 1] as const) {
        for (let d2 = 0; d2 < 2; d2++) {
          ctx.fillStyle = d2 ? '#8a6534' : '#54381c';
          ctx.fillRect(
            p.x + m2 * (hw - s * 0.035) - s * 0.015,
            boxTop + s * 0.07 + d2 * s * 0.09,
            s * 0.03,
            s * 0.045,
          );
        }
      }
      // The soil line, damp where it was watered.
      ctx.fillStyle = '#4a3520';
      ctx.fillRect(p.x - hw + s * 0.045, boxTop + s * 0.012, hw * 2 - s * 0.09, s * 0.05);
      // THE BACK RANK: four shaded heads peeking over the rim.
      for (let k = 0; k < 4; k++) {
        const hh = hashCoords(61 + k, tx, ty);
        const nod = rend.breezeAt(tx, ty, t, hh * 0.3, s, 0.01, 0.01).sway;
        const fx = p.x - hw * 0.72 + k * hw * 0.48 + ((hh % 5) - 2) * s * 0.012;
        const fy = boxTop - s * 0.16 - ((hh >> 4) % 3) * s * 0.03;
        ctx.strokeStyle = '#4f7a40';
        ctx.lineWidth = Math.max(1, s * 0.018);
        ctx.beginPath();
        ctx.moveTo(fx, boxTop + s * 0.02);
        ctx.lineTo(fx + nod * 0.7, fy + s * 0.02);
        ctx.stroke();
        const c = dye[(hh >>> 2) % 3]!;
        ctx.fillStyle = shade(c, -14);
        ctx.beginPath();
        facetCircle(ctx, fx + nod * 0.7, fy, s * 0.058, 6, (hh % 7) * 0.3);
        ctx.fill();
      }
      // THE FRONT RANK: four lit heads, half a pitch off, each
      // a petal cluster with its pale eye — street-legible.
      for (let k = 0; k < 4; k++) {
        const hh = hashCoords(97 + k, tx, ty);
        const nod = rend.breezeAt(tx, ty, t, hh * 0.3 + 2, s, 0.012, 0.012).sway;
        const fx = p.x - hw * 0.48 + k * hw * 0.44 + ((hh % 5) - 2) * s * 0.012;
        const fy = boxTop - s * 0.07 - ((hh >> 4) % 4) * s * 0.022;
        ctx.strokeStyle = '#5f8a44';
        ctx.lineWidth = Math.max(1, s * 0.02);
        ctx.beginPath();
        ctx.moveTo(fx, boxTop + s * 0.03);
        ctx.lineTo(fx + nod, fy + s * 0.02);
        ctx.stroke();
        const c = dye[hh % 3]!;
        ctx.fillStyle = c;
        for (let pt = 0; pt < 5; pt++) {
          const a = (pt / 5) * Math.PI * 2 + k * 1.1;
          ctx.beginPath();
          ctx.ellipse(
            fx + nod + Math.cos(a) * s * 0.04,
            fy + Math.sin(a) * s * 0.032,
            s * 0.028,
            s * 0.021,
            a,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(255, 244, 200, 0.85)';
        ctx.beginPath();
        facetCircle(ctx, fx + nod, fy, s * 0.018, 6, (hh % 7) * 0.3);
        ctx.fill();
      }
      // Ivy tumbles both ends — the joinery wears its garden.
      ctx.strokeStyle = '#4a6b3d';
      ctx.lineWidth = Math.max(1, s * 0.02);
      for (const m2 of [-1, 1] as const) {
        const x0 = p.x + m2 * (hw - s * 0.04);
        ctx.beginPath();
        ctx.moveTo(x0, boxTop + s * 0.03);
        ctx.quadraticCurveTo(x0 + m2 * s * 0.12, boxTop + s * 0.2, x0 + m2 * s * 0.09, boxBot + s * 0.1);
        ctx.stroke();
        ctx.fillStyle = '#527a44';
        for (let l = 0; l < 3; l++) {
          const f = 0.25 + l * 0.32;
          ctx.beginPath();
          ctx.ellipse(
            x0 + m2 * s * (0.05 + f * 0.06) + ((l & 1) ? m2 * s * 0.024 : 0),
            boxTop + s * 0.05 + f * s * 0.27,
            s * 0.032,
            s * 0.02,
            m2 * (0.4 + l * 0.3),
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
    },
  };
}

function paintToolRack(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, stationBody, tile, ty } = env;
  const weapons = tile === Tile.WeaponRack;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.28;
  // A built rack, not a painted card: two chunky posts carrying
  // a capped head beam, a recessed pegboard between them, and a
  // footing shelf in plan with the day's stock standing on it.
  // Head beam at the body's crown so the wall of tools reads
  // armory-scale beside the rig.
  const bw = s * 0.98;
  const bh2 = s * 1.48;
  const post = '#5e3f1e';
  const pw = s * 0.11;
  return {
    sortY: ty + 0.74,
    body: stationBody(0.85, 1.85, 0.6),
    drawShadow: () => rend.castEdgeQuad(p.x - bw / 2, baseY, p.x + bw / 2, baseY, 1.35),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // Contact shade under both feet.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
      ctx.fillRect(p.x - bw / 2 - s * 0.02, baseY - s * 0.015, bw + s * 0.04, s * 0.05);
      // The recessed pegboard: clearly darker than the frame so
      // the tools hang IN a case, with plank seams and a shadow
      // reveal under the head beam where the board sets back.
      ctx.fillStyle = shade(post, -26);
      ctx.fillRect(p.x - bw / 2 + pw * 0.6, baseY - bh2 + s * 0.1, bw - pw * 1.2, bh2 - s * 0.42);
      ctx.fillStyle = 'rgba(18, 12, 26, 0.4)';
      ctx.fillRect(p.x - bw / 2 + pw * 0.6, baseY - bh2 + s * 0.1, bw - pw * 1.2, s * 0.05);
      ctx.fillStyle = 'rgba(20, 14, 28, 0.3)';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(p.x - bw / 2 + pw * 0.8 + ((i + 1) * (bw - pw * 1.6)) / 4, baseY - bh2 + s * 0.12, s * 0.018, bh2 - s * 0.46);
      }
      // The footing shelf: a foreshortened plank plane spanning
      // the posts just off the floor — stock stands ON it.
      const shY = baseY - s * 0.12;
      const shD = syT * 0.26;
      ctx.fillStyle = '#7a552e';
      ctx.beginPath();
      chamferRect(ctx, p.x - bw / 2 + s * 0.02, shY - shD, bw - s * 0.04, shD + s * 0.05, s * 0.03);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1.2, s * 0.024);
      ctx.stroke();
      ctx.fillStyle = shade('#7a552e', 14);
      ctx.fillRect(p.x - bw / 2 + s * 0.05, shY + s * 0.015, bw - s * 0.1, s * 0.032);
      if (weapons) {
        // The shelf keeps a quiver drum bristling with arrows.
        const qx = p.x + bw * 0.26;
        ctx.fillStyle = '#6f4d26';
        ctx.fillRect(qx - s * 0.075, shY - shD * 0.5 - s * 0.2, s * 0.15, s * 0.2);
        ctx.fillStyle = shade('#6f4d26', -14);
        ctx.fillRect(qx - s * 0.075, shY - shD * 0.5 - s * 0.21, s * 0.15, s * 0.03);
        ctx.fillStyle = '#8a6534';
        for (const ax of [-0.04, 0.005, 0.045] as const) {
          ctx.fillRect(qx + ax * s - s * 0.01, shY - shD * 0.5 - s * 0.4, s * 0.02, s * 0.2);
        }
        ctx.fillStyle = '#d8cbb0';
        for (const ax of [-0.04, 0.005, 0.045] as const) {
          ctx.fillRect(qx + ax * s - s * 0.022, shY - shD * 0.5 - s * 0.44, s * 0.044, s * 0.045);
        }
      } else {
        // The shelf keeps a slack bucket and a stack of stock
        // bars waiting for the fire.
        const bx2 = p.x - bw * 0.26;
        ctx.fillStyle = '#4f4a5c';
        ctx.beginPath();
        ctx.moveTo(bx2 - s * 0.085, shY - shD * 0.5 - s * 0.17);
        ctx.lineTo(bx2 + s * 0.085, shY - shD * 0.5 - s * 0.17);
        ctx.lineTo(bx2 + s * 0.065, shY - shD * 0.5);
        ctx.lineTo(bx2 - s * 0.065, shY - shD * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#3a629e';
        ctx.beginPath();
        facetCircle(ctx, bx2, shY - shD * 0.5 - s * 0.165, s * 0.062, 6, 0.3, 0.5);
        ctx.fill();
        ctx.fillStyle = '#767181';
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(p.x + bw * 0.1 - i * s * 0.02, shY - shD * 0.5 - s * (0.035 + i * 0.035), s * 0.3, s * 0.035);
          ctx.fillStyle = i === 0 ? '#8b8697' : '#767181';
        }
      }
      // Posts: west face lit, east shaded, each crowned with a
      // little foreshortened cap plane — the tilted camera sees
      // the top of every upright in town.
      for (const sd of [-1, 1] as const) {
        const px2 = p.x + sd * (bw / 2 - pw / 2);
        ctx.fillStyle = shade(post, 8);
        ctx.fillRect(px2 - pw / 2, baseY - bh2, pw, bh2);
        ctx.fillStyle = shade(post, sd < 0 ? 20 : -10);
        ctx.fillRect(px2 + (sd < 0 ? -pw / 2 : pw / 2 - s * 0.032), baseY - bh2, s * 0.032, bh2);
        // Splayed foot pad.
        ctx.fillStyle = shade(post, -8);
        ctx.fillRect(px2 - pw * 0.72, baseY - s * 0.07, pw * 1.44, s * 0.07);
      }
      // The head beam ties the posts, capped with a lit
      // foreshortened top plane and a sunlit front arris.
      const hbY = baseY - bh2;
      const hbD = syT * 0.2;
      ctx.fillStyle = shade(post, 4);
      ctx.fillRect(p.x - bw / 2 - s * 0.045, hbY, bw + s * 0.09, s * 0.13);
      ctx.fillStyle = shade(post, 16);
      ctx.beginPath();
      chamferRect(ctx, p.x - bw / 2 - s * 0.045, hbY - hbD, bw + s * 0.09, hbD + s * 0.02, s * 0.03);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1.2, s * 0.024);
      ctx.stroke();
      ctx.fillStyle = shade(post, 6);
      ctx.fillRect(p.x - bw / 2, hbY - hbD + s * 0.014, bw, s * 0.024);
      ctx.fillStyle = shade(post, 28);
      ctx.fillRect(p.x - bw / 2 - s * 0.045, hbY + s * 0.1, bw + s * 0.09, s * 0.03);
      // Every hung piece throws a soft drop shadow on the board
      // — offset dark ghosts that pull the iron off the wood.
      const midY = baseY - bh2 * 0.52;
      if (weapons) {
        // Crossed spears behind, a longsword hung point-down in
        // front, a round shield leaning on the west post.
        for (const sd of [-1, 1] as const) {
          ctx.save();
          ctx.translate(p.x + sd * s * 0.06, midY);
          ctx.rotate(sd * 0.2);
          ctx.fillStyle = 'rgba(18, 12, 26, 0.28)';
          ctx.fillRect(-s * 0.028 + s * 0.025, -bh2 * 0.4 + s * 0.03, s * 0.056, bh2 * 0.78);
          ctx.fillStyle = '#8a6534';
          ctx.fillRect(-s * 0.028, -bh2 * 0.4, s * 0.056, bh2 * 0.78);
          ctx.fillStyle = shade('#8a6534', 12);
          ctx.fillRect(-s * 0.028, -bh2 * 0.4, s * 0.02, bh2 * 0.78);
          ctx.fillStyle = '#b6bcc6';
          ctx.beginPath();
          ctx.moveTo(-s * 0.055, -bh2 * 0.4);
          ctx.lineTo(s * 0.055, -bh2 * 0.4);
          ctx.lineTo(0, -bh2 * 0.54);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = shade('#b6bcc6', -18);
          ctx.beginPath();
          ctx.moveTo(0, -bh2 * 0.4);
          ctx.lineTo(s * 0.055, -bh2 * 0.4);
          ctx.lineTo(0, -bh2 * 0.54);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        // The longsword: fuller, cross guard, wrapped grip.
        const swx = p.x + bw * 0.3;
        ctx.fillStyle = 'rgba(18, 12, 26, 0.28)';
        ctx.fillRect(swx - s * 0.026 + s * 0.025, midY - bh2 * 0.26 + s * 0.03, s * 0.052, bh2 * 0.5);
        ctx.fillStyle = '#b6bcc6';
        ctx.fillRect(swx - s * 0.026, midY - bh2 * 0.26, s * 0.052, bh2 * 0.46);
        ctx.beginPath();
        ctx.moveTo(swx - s * 0.026, midY + bh2 * 0.2);
        ctx.lineTo(swx + s * 0.026, midY + bh2 * 0.2);
        ctx.lineTo(swx, midY + bh2 * 0.26);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(58, 62, 74, 0.5)';
        ctx.fillRect(swx - s * 0.007, midY - bh2 * 0.24, s * 0.014, bh2 * 0.4);
        ctx.fillStyle = '#c9962e';
        ctx.fillRect(swx - s * 0.085, midY - bh2 * 0.28, s * 0.17, s * 0.045);
        ctx.fillStyle = '#6f4d26';
        ctx.fillRect(swx - s * 0.024, midY - bh2 * 0.28 - s * 0.11, s * 0.048, s * 0.11);
        ctx.fillStyle = '#c9962e';
        ctx.beginPath();
        facetCircle(ctx, swx, midY - bh2 * 0.28 - s * 0.13, s * 0.032, 6, 0.3);
        ctx.fill();
        // The shield rests against the west post, rim lit.
        const shx = p.x - bw * 0.34;
        ctx.fillStyle = 'rgba(18, 12, 26, 0.25)';
        ctx.beginPath();
        ctx.ellipse(shx, baseY - s * 0.01, s * 0.2, s * 0.055, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8a3d3d';
        ctx.beginPath();
        facetCircle(ctx, shx, baseY - s * 0.26, s * 0.24, 8, 0.2, 1);
        ctx.fill();
        ctx.strokeStyle = '#c9962e';
        ctx.lineWidth = Math.max(1.5, s * 0.035);
        ctx.beginPath();
        facetCircle(ctx, shx, baseY - s * 0.26, s * 0.185, 8, 0.2, 1);
        ctx.stroke();
        ctx.fillStyle = '#c9962e';
        ctx.beginPath();
        facetCircle(ctx, shx, baseY - s * 0.26, s * 0.055, 6, 0.3);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.beginPath();
        facetCircle(ctx, shx - s * 0.07, baseY - s * 0.33, s * 0.09, 6, 0.5);
        ctx.fill();
      } else {
        // The smith's wall: cross-peen sledge, long tongs, a
        // file, and a lucky horseshoe on its own peg.
        const hang = (hx: number, hy: number) => {
          ctx.fillStyle = '#2c2836';
          ctx.fillRect(hx - s * 0.02, hy - s * 0.02, s * 0.04, s * 0.04);
        };
        // Sledge: haft angled, head heavy, shadow first.
        ctx.save();
        ctx.translate(p.x - bw * 0.24, midY - bh2 * 0.06);
        ctx.rotate(0.1);
        ctx.fillStyle = 'rgba(18, 12, 26, 0.28)';
        ctx.fillRect(-s * 0.03 + s * 0.025, -bh2 * 0.3 + s * 0.03, s * 0.06, bh2 * 0.58);
        ctx.fillRect(-s * 0.135 + s * 0.025, -bh2 * 0.3 - s * 0.082 + s * 0.03, s * 0.27, s * 0.115);
        ctx.fillStyle = '#8a6534';
        ctx.fillRect(-s * 0.03, -bh2 * 0.3, s * 0.06, bh2 * 0.58);
        ctx.fillStyle = shade('#8a6534', 12);
        ctx.fillRect(-s * 0.03, -bh2 * 0.3, s * 0.022, bh2 * 0.58);
        ctx.fillStyle = '#8b8697';
        ctx.fillRect(-s * 0.135, -bh2 * 0.3 - s * 0.082, s * 0.27, s * 0.115);
        ctx.fillStyle = shade('#8b8697', 14);
        ctx.fillRect(-s * 0.135, -bh2 * 0.3 - s * 0.082, s * 0.27, s * 0.032);
        ctx.fillStyle = shade('#8b8697', -16);
        ctx.fillRect(s * 0.075, -bh2 * 0.3 - s * 0.082, s * 0.06, s * 0.115);
        ctx.restore();
        // Long forge tongs, jaws down, bows slightly apart.
        for (const sd of [-1, 1] as const) {
          ctx.save();
          ctx.translate(p.x + s * 0.09 + sd * s * 0.028, midY - bh2 * 0.02);
          ctx.rotate(sd * 0.1);
          ctx.fillStyle = 'rgba(18, 12, 26, 0.28)';
          ctx.fillRect(-s * 0.021 + s * 0.02, -bh2 * 0.3 + s * 0.03, s * 0.042, bh2 * 0.56);
          ctx.fillStyle = '#767181';
          ctx.fillRect(-s * 0.021, -bh2 * 0.3, s * 0.042, bh2 * 0.56);
          ctx.fillStyle = shade('#767181', sd < 0 ? 10 : -12);
          ctx.fillRect(-s * 0.021, -bh2 * 0.3, s * 0.016, bh2 * 0.56);
          ctx.restore();
        }
        ctx.fillStyle = '#565162';
        ctx.fillRect(p.x + s * 0.055, midY - bh2 * 0.34, s * 0.07, s * 0.05);
        // A broad flat file with a turned wooden handle.
        ctx.save();
        ctx.translate(p.x + bw * 0.3, midY - bh2 * 0.04);
        ctx.rotate(-0.06);
        ctx.fillStyle = 'rgba(18, 12, 26, 0.28)';
        ctx.fillRect(-s * 0.026 + s * 0.022, -bh2 * 0.26 + s * 0.03, s * 0.052, bh2 * 0.44);
        ctx.fillStyle = '#9aa2ac';
        ctx.fillRect(-s * 0.026, -bh2 * 0.26, s * 0.052, bh2 * 0.38);
        ctx.fillStyle = 'rgba(58, 62, 74, 0.45)';
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(-s * 0.026, -bh2 * 0.24 + i * bh2 * 0.085, s * 0.052, s * 0.012);
        }
        ctx.fillStyle = '#6f4d26';
        ctx.fillRect(-s * 0.03, -bh2 * 0.26 - s * 0.085, s * 0.06, s * 0.085);
        ctx.restore();
        // The horseshoe, heels down — luck kept the right way up.
        const hsx = p.x - bw * 0.05;
        const hsy = midY - bh2 * 0.34;
        ctx.strokeStyle = 'rgba(18, 12, 26, 0.28)';
        ctx.lineWidth = Math.max(2, s * 0.05);
        ctx.beginPath();
        ctx.arc(hsx + s * 0.022, hsy + s * 0.028, s * 0.07, Math.PI * 0.85, Math.PI * 2.15);
        ctx.stroke();
        ctx.strokeStyle = '#8b8697';
        ctx.beginPath();
        ctx.arc(hsx, hsy, s * 0.07, Math.PI * 0.85, Math.PI * 2.15);
        ctx.stroke();
        // Pegs above each hung tool.
        hang(p.x - bw * 0.26, midY - bh2 * 0.37);
        hang(p.x + s * 0.09, midY - bh2 * 0.33);
        hang(p.x + bw * 0.29, midY - bh2 * 0.31);
      }
    },
  };
}

function paintArmorStand(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tile, tx, ty } = env;
  const dressed = tile === Tile.ArmorStandFull;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // THE SQUIRE'S STAND: a cross-footed oak mast with a shoulder
  // yoke and helm peg — empty it shows its joinery honestly;
  // dressed it wears a full harness dealt by the tile (three
  // styles, one stance). Scaled by the body ruler: the yoke
  // sits at the rig's own shoulders, the helm crowns its head.
  const style = (h >>> 3) % 3;
  const dye = AWNING_CLOTHS[(h >>> 5) % 10]!;
  return {
    sortY: ty + 0.66,
    body: stationBody(0.5, 1.7, 0.4),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.32, s * 0.055),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      const cx = p.x;
      // Ground seat: soft pool plus per-foot contact darks.
      ctx.fillStyle = 'rgba(12, 8, 20, 0.2)';
      ctx.beginPath();
      ctx.ellipse(cx, baseY + s * 0.008, s * 0.3, s * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
      // Cross feet: two splayed squared quads east-west and a
      // short foreshortened north foot behind the mast (BLOCK
      // LAW — quads with one lit facet, never round strokes).
      for (const sd of [-1, 1] as const) {
        ctx.fillStyle = shade('#5e3f1e', sd < 0 ? 6 : -8);
        ctx.beginPath();
        ctx.moveTo(cx + sd * s * 0.03, baseY - s * 0.2);
        ctx.lineTo(cx + sd * s * 0.075, baseY - s * 0.2);
        ctx.lineTo(cx + sd * s * 0.26, baseY + s * 0.01);
        ctx.lineTo(cx + sd * s * 0.19, baseY + s * 0.01);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(12, 8, 20, 0.28)';
        ctx.fillRect(cx + sd * s * 0.19, baseY + s * 0.002, s * 0.075, s * 0.022);
      }
      ctx.fillStyle = shade('#5e3f1e', -14);
      ctx.fillRect(cx - s * 0.028, baseY - s * 0.26, s * 0.056, s * 0.09);
      // The mast, west face lit.
      ctx.fillStyle = '#5e3f1e';
      ctx.fillRect(cx - s * 0.028, baseY - s * 1.18, s * 0.056, s * 1.0);
      ctx.fillStyle = shade('#5e3f1e', 16);
      ctx.fillRect(cx - s * 0.028, baseY - s * 1.18, s * 0.02, s * 1.0);
      // Hip rail.
      ctx.fillStyle = shade('#5e3f1e', -6);
      ctx.fillRect(cx - s * 0.15, baseY - s * 0.66, s * 0.3, s * 0.045);
      // The shoulder yoke: a squared T-bar with dipped tips and
      // a lit foreshortened top plane (the camera sees the top
      // of every upright in town).
      const yokeY = baseY - s * 1.04;
      ctx.fillStyle = '#6f4d26';
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.23, yokeY + s * 0.09);
      ctx.lineTo(cx - s * 0.19, yokeY);
      ctx.lineTo(cx + s * 0.19, yokeY);
      ctx.lineTo(cx + s * 0.23, yokeY + s * 0.09);
      ctx.lineTo(cx + s * 0.17, yokeY + s * 0.09);
      ctx.lineTo(cx + s * 0.14, yokeY + s * 0.05);
      ctx.lineTo(cx - s * 0.14, yokeY + s * 0.05);
      ctx.lineTo(cx - s * 0.17, yokeY + s * 0.09);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade('#6f4d26', 18);
      ctx.fillRect(cx - s * 0.19, yokeY, s * 0.38, s * 0.02);
      // Helm peg with its capped top plane.
      ctx.fillStyle = '#5e3f1e';
      ctx.fillRect(cx - s * 0.02, baseY - s * 1.3, s * 0.04, s * 0.26);
      ctx.fillStyle = shade('#5e3f1e', 20);
      ctx.beginPath();
      ctx.ellipse(cx, baseY - s * 1.3, s * 0.032, s * 0.014, 0, 0, Math.PI * 2);
      ctx.fill();
      if (!dressed) {
        // The empty stand's story: two slack straps waiting off
        // the yoke tips — the harness is out on a body.
        for (const sd of [-1, 1] as const) {
          ctx.fillStyle = '#4a3020';
          ctx.beginPath();
          ctx.moveTo(cx + sd * s * 0.2, yokeY + s * 0.09);
          ctx.lineTo(cx + sd * s * 0.23, yokeY + s * 0.09);
          ctx.lineTo(cx + sd * s * 0.21, yokeY + s * 0.34);
          ctx.lineTo(cx + sd * s * 0.185, yokeY + s * 0.34);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#b8a86a';
          ctx.fillRect(cx + sd * s * 0.19 - s * 0.012, yokeY + s * 0.3, s * 0.028, s * 0.02);
        }
        return;
      }
      // ---- THE HARNESS. All three styles share the torso box:
      // shoulders at the yoke, waist taper, skirt at the rail.
      const shY = yokeY + s * 0.02;
      const waY = baseY - s * 0.7;
      const skY = baseY - s * 0.52;
      const torso = (wS: number, wW: number): Path2D => {
        const q = new Path2D();
        q.moveTo(cx - s * wS, shY);
        q.lineTo(cx + s * wS, shY);
        q.lineTo(cx + s * wW, waY);
        q.lineTo(cx + s * wW * 1.15, skY);
        q.lineTo(cx - s * wW * 1.15, skY);
        q.lineTo(cx - s * wW, waY);
        q.closePath();
        return q;
      };
      if (style === 0) {
        // STEEL HARNESS: cuirass with a plastron ridge, lobed
        // pauldrons, a great helm — the knight in waiting.
        const body = torso(0.19, 0.125);
        ctx.fillStyle = TRD_STEEL;
        ctx.fill(body);
        ctx.save();
        ctx.clip(body);
        ctx.fillStyle = TRD_STEEL_LIT;
        ctx.fillRect(cx - s * 0.2, shY - s * 0.05, s * 0.13, s * 0.6);
        // The plastron ridge: one dark crease down the center
        // breaking the light in two — plate, not a bib.
        ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
        ctx.fillRect(cx - s * 0.008, shY + s * 0.03, s * 0.016, s * 0.42);
        ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
        ctx.fillRect(cx - s * 0.2, waY - s * 0.015, s * 0.4, s * 0.03);
        ctx.restore();
        // Fauld: two lapped skirt bands below the waist line.
        for (let k = 0; k < 2; k++) {
          ctx.fillStyle = shade(TRD_STEEL, -6 - k * 8);
          ctx.fillRect(cx - s * (0.15 - k * 0.012), waY + s * (0.06 + k * 0.06), s * (0.3 - k * 0.024), s * 0.06);
        }
        // Pauldrons: two lapped lobes riding each yoke tip.
        for (const sd of [-1, 1] as const) {
          ctx.fillStyle = shade(TRD_STEEL, sd < 0 ? 14 : -4);
          ctx.beginPath();
          ctx.ellipse(cx + sd * s * 0.21, shY + s * 0.03, s * 0.075, s * 0.065, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = shade(TRD_STEEL, sd < 0 ? 4 : -14);
          ctx.beginPath();
          ctx.ellipse(cx + sd * s * 0.225, shY + s * 0.1, s * 0.06, s * 0.045, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // Gorget seats the helm; the great helm wears a lit
        // foreshortened crown plane and one dark eye slit.
        ctx.fillStyle = shade(TRD_STEEL, -10);
        ctx.fillRect(cx - s * 0.07, shY - s * 0.045, s * 0.14, s * 0.05);
        const hy = baseY - s * 1.17;
        ctx.fillStyle = TRD_STEEL;
        ctx.fillRect(cx - s * 0.085, hy - s * 0.17, s * 0.17, s * 0.19);
        ctx.fillStyle = TRD_STEEL_LIT;
        ctx.fillRect(cx - s * 0.085, hy - s * 0.17, s * 0.05, s * 0.19);
        ctx.fillStyle = shade(TRD_STEEL, 18);
        ctx.beginPath();
        ctx.ellipse(cx, hy - s * 0.17, s * 0.085, syT * 0.032, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(10, 6, 16, 0.75)';
        ctx.fillRect(cx - s * 0.062, hy - s * 0.1, s * 0.124, s * 0.028);
        // The plume — the stand's one living piece.
        const { lag } = rend.breezeAt(tx, ty, t, tx * 2.1 + ty * 1.7, s, 0.012, 0.025);
        ctx.fillStyle = '#7a2430';
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.01, hy - s * 0.19);
        ctx.lineTo(cx + s * 0.03, hy - s * 0.19);
        ctx.quadraticCurveTo(cx + s * 0.1 + lag, hy - s * 0.26, cx + s * 0.16 + lag * 1.4, hy - s * 0.14);
        ctx.quadraticCurveTo(cx + s * 0.09 + lag, hy - s * 0.18, cx + s * 0.01, hy - s * 0.15);
        ctx.closePath();
        ctx.fill();
      } else if (style === 1) {
        // CHAIN AND TABARD: banded mail under the town's own
        // dye, belted, a kettle hat on the peg.
        const mail = torso(0.185, 0.13);
        ctx.fillStyle = '#5a606c';
        ctx.fill(mail);
        ctx.save();
        ctx.clip(mail);
        ctx.fillStyle = 'rgba(210, 218, 226, 0.16)';
        for (let k = 0; k < 5; k++) {
          ctx.fillRect(cx - s * 0.2, shY + s * (0.05 + k * 0.1), s * 0.4, s * 0.032);
        }
        ctx.restore();
        // Mail hem scallop below the skirt line.
        ctx.fillStyle = '#5a606c';
        for (const fx of [-0.1, -0.033, 0.033, 0.1] as const) {
          ctx.beginPath();
          ctx.arc(cx + fx * s, skY + s * 0.01, s * 0.034, 0, Math.PI);
          ctx.fill();
        }
        // The tabard over it: open-sided, V-necked, belted.
        ctx.fillStyle = dye.a;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.115, shY + s * 0.01);
        ctx.lineTo(cx + s * 0.115, shY + s * 0.01);
        ctx.lineTo(cx + s * 0.095, skY + s * 0.06);
        ctx.lineTo(cx - s * 0.095, skY + s * 0.06);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(dye.a, 12);
        ctx.fillRect(cx - s * 0.115, shY + s * 0.01, s * 0.07, s * 0.55);
        ctx.fillStyle = shade(dye.a, -22);
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.045, shY + s * 0.01);
        ctx.lineTo(cx + s * 0.045, shY + s * 0.01);
        ctx.lineTo(cx, shY + s * 0.09);
        ctx.closePath();
        ctx.fill();
        // The charge: a trim lozenge at the chest.
        ctx.fillStyle = dye.b;
        ctx.beginPath();
        ctx.moveTo(cx, shY + s * 0.16);
        ctx.lineTo(cx + s * 0.05, shY + s * 0.25);
        ctx.lineTo(cx, shY + s * 0.34);
        ctx.lineTo(cx - s * 0.05, shY + s * 0.25);
        ctx.closePath();
        ctx.fill();
        // Belt and buckle.
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(cx - s * 0.12, waY - s * 0.01, s * 0.24, s * 0.04);
        ctx.fillStyle = '#b8a86a';
        ctx.fillRect(cx - s * 0.022, waY - s * 0.014, s * 0.044, s * 0.048);
        // The kettle hat: a brimmed dome, top plane honest.
        const hy = baseY - s * 1.2;
        ctx.fillStyle = shade(TRD_STEEL, -6);
        ctx.beginPath();
        ctx.ellipse(cx, hy, s * 0.11, syT * 0.045, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = TRD_STEEL;
        ctx.beginPath();
        ctx.arc(cx, hy - s * 0.005, s * 0.065, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = TRD_STEEL_LIT;
        ctx.beginPath();
        ctx.arc(cx - s * 0.02, hy - s * 0.01, s * 0.035, Math.PI, 0);
        ctx.fill();
      } else {
        // LEATHER JACK: a riveted brigandine with layered
        // shoulder tabs and a plain sallet — the scout's kit.
        const jack = torso(0.18, 0.12);
        ctx.fillStyle = '#6e4a33';
        ctx.fill(jack);
        ctx.save();
        ctx.clip(jack);
        ctx.fillStyle = shade('#6e4a33', 14);
        ctx.fillRect(cx - s * 0.19, shY - s * 0.05, s * 0.12, s * 0.6);
        // Rivet rows: bronze pips at the chest-law minimum —
        // the plates inside announced on the outside.
        ctx.fillStyle = '#b8a86a';
        for (let r = 0; r < 3; r++) {
          for (let c = -1; c <= 1; c++) {
            ctx.beginPath();
            ctx.arc(cx + c * s * 0.085, shY + s * (0.12 + r * 0.14), s * 0.015, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
        // Studded skirt tabs.
        for (const fx of [-0.105, -0.035, 0.035, 0.105] as const) {
          ctx.fillStyle = shade('#6e4a33', -10);
          ctx.fillRect(cx + fx * s - s * 0.028, skY, s * 0.056, s * 0.08);
          ctx.fillStyle = '#b8a86a';
          ctx.beginPath();
          ctx.arc(cx + fx * s, skY + s * 0.05, s * 0.012, 0, Math.PI * 2);
          ctx.fill();
        }
        // Shoulder tabs: two lapped leather plates per side.
        for (const sd of [-1, 1] as const) {
          for (let k = 0; k < 2; k++) {
            ctx.fillStyle = shade('#6e4a33', sd < 0 ? 10 - k * 8 : -6 - k * 8);
            ctx.beginPath();
            ctx.moveTo(cx + sd * s * (0.14 + k * 0.03), shY - s * 0.01 + k * s * 0.055);
            ctx.lineTo(cx + sd * s * (0.24 + k * 0.02), shY + s * 0.02 + k * s * 0.055);
            ctx.lineTo(cx + sd * s * (0.22 + k * 0.02), shY + s * 0.09 + k * s * 0.055);
            ctx.lineTo(cx + sd * s * (0.13 + k * 0.03), shY + s * 0.06 + k * s * 0.055);
            ctx.closePath();
            ctx.fill();
          }
        }
        // The sallet: a smooth dome with a short tail, its
        // face opening struck dark.
        const hy = baseY - s * 1.16;
        ctx.fillStyle = TRD_STEEL;
        ctx.beginPath();
        ctx.arc(cx, hy - s * 0.03, s * 0.075, Math.PI * 0.9, Math.PI * 2.02);
        ctx.lineTo(cx + s * 0.11, hy + s * 0.035);
        ctx.lineTo(cx - s * 0.075, hy + s * 0.035);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = TRD_STEEL_LIT;
        ctx.beginPath();
        ctx.arc(cx - s * 0.025, hy - s * 0.035, s * 0.04, Math.PI, Math.PI * 1.9);
        ctx.fill();
        ctx.fillStyle = 'rgba(10, 6, 16, 0.7)';
        ctx.fillRect(cx - s * 0.055, hy + s * 0.005, s * 0.09, s * 0.024);
      }
    },
  };
}

function paintBannerStand(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, t, stationBody, tile, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // THE STANDARD FRAME: a forged tripod socket flying the great
  // cloth from a cross-arm — the muster forms on it, the wind
  // owns it. The author dyes the standard (the tile band); the
  // charge follows the dye (THE COLOR IS THE HOUSE).
  const standDye = bannerStandInfo(tile)?.dye ?? 0;
  const topY = baseY - s * 2.38;
  return {
    sortY: ty + 0.72,
    body: stationBody(0.8, 2.7, 0.45),
    drawShadow: () => rend.castEdgeQuad(p.x - s * 0.06, baseY, p.x + s * 0.06, baseY, 1.9),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      const cx = p.x;
      // The forged foot: a socket boss on three splayed legs,
      // the front pair landing in their own contact pools.
      ctx.fillStyle = 'rgba(12, 8, 20, 0.2)';
      ctx.beginPath();
      ctx.ellipse(cx, baseY + s * 0.01, s * 0.24, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade('#454052', -10);
      ctx.fillRect(cx - s * 0.022, baseY - s * 0.3, s * 0.044, s * 0.14);
      for (const sd of [-1, 1] as const) {
        ctx.fillStyle = shade('#454052', sd < 0 ? 8 : -8);
        ctx.beginPath();
        ctx.moveTo(cx + sd * s * 0.02, baseY - s * 0.18);
        ctx.lineTo(cx + sd * s * 0.065, baseY - s * 0.18);
        ctx.lineTo(cx + sd * s * 0.22, baseY + s * 0.005);
        ctx.lineTo(cx + sd * s * 0.16, baseY + s * 0.005);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(12, 8, 20, 0.3)';
        ctx.fillRect(cx + sd * s * 0.16, baseY, s * 0.065, s * 0.02);
      }
      ctx.fillStyle = shade('#454052', -18);
      ctx.fillRect(cx - s * 0.02, baseY - s * 0.24, s * 0.04, s * 0.07);
      // The socket collar with its bolt pips.
      ctx.fillStyle = '#454052';
      ctx.fillRect(cx - s * 0.045, baseY - s * 0.34, s * 0.09, s * 0.09);
      ctx.fillStyle = '#8b8697';
      ctx.beginPath();
      ctx.arc(cx - s * 0.02, baseY - s * 0.3, s * 0.012, 0, Math.PI * 2);
      ctx.arc(cx + s * 0.02, baseY - s * 0.3, s * 0.012, 0, Math.PI * 2);
      ctx.fill();
      // The staff: iron-dark, west sliver lit, collar rings at
      // the thirds — a mast, not a stick.
      ctx.fillStyle = '#3a3444';
      ctx.fillRect(cx - s * 0.024, topY, s * 0.048, s * 2.04);
      ctx.fillStyle = '#5a5468';
      ctx.fillRect(cx - s * 0.024, topY, s * 0.016, s * 2.04);
      ctx.fillStyle = '#454052';
      ctx.fillRect(cx - s * 0.032, baseY - s * 0.95, s * 0.064, s * 0.05);
      ctx.fillRect(cx - s * 0.032, baseY - s * 1.72, s * 0.064, s * 0.05);
      // The cross-arm reaching east, braced to the staff.
      const armY = topY + s * 0.08;
      ctx.fillStyle = '#454052';
      ctx.fillRect(cx - s * 0.02, armY - s * 0.022, s * 0.58, s * 0.044);
      ctx.fillStyle = '#5a5468';
      ctx.fillRect(cx - s * 0.02, armY - s * 0.022, s * 0.58, s * 0.015);
      ctx.fillStyle = shade('#454052', -8);
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.024, armY + s * 0.16);
      ctx.lineTo(cx + s * 0.2, armY + s * 0.022);
      ctx.lineTo(cx + s * 0.2, armY + s * 0.052);
      ctx.lineTo(cx + s * 0.05, armY + s * 0.17);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2c2836';
      ctx.fillRect(cx + s * 0.545, armY - s * 0.032, s * 0.024, s * 0.064);
      // THE CLOTH — the great drop off the arm, freestanding
      // wind (a fuller beat than any wall hanging's).
      const { sway, lag } = rend.breezeAt(tx, ty, t, tx * 1.9 + ty * 1.3, s, 0.03, 0.05);
      const clothCx = cx + s * 0.3;
      const outer = rend.paintGreatCloth(clothCx, armY + s * 0.035, s * 0.5, s * 1.32, standDye, s, sway, lag);
      // THE RING IS ONE: the standard's cloth wears the same
      // architecture ring as its wall-hung kin.
      rend.beginStructOutline();
      ctx.stroke(outer);
      // Hoist loops over the arm.
      ctx.fillStyle = shade(AWNING_CLOTHS[standDye]!.b, -8);
      for (const fx of [0.1, 0.3, 0.5] as const) {
        ctx.fillRect(cx + fx * s - s * 0.026, armY - s * 0.04, s * 0.052, s * 0.1);
      }
      // The finial: a gold leaf-point crowning the staff.
      ctx.fillStyle = '#c9962e';
      ctx.beginPath();
      ctx.moveTo(cx, topY - s * 0.17);
      ctx.lineTo(cx + s * 0.042, topY - s * 0.05);
      ctx.lineTo(cx, topY + s * 0.01);
      ctx.lineTo(cx - s * 0.042, topY - s * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e0c88a';
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.002, topY - s * 0.15);
      ctx.lineTo(cx - s * 0.026, topY - s * 0.05);
      ctx.lineTo(cx - s * 0.002, topY - s * 0.01);
      ctx.closePath();
      ctx.fill();
    },
  };
}

function paintVault(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.24;
  // A strongroom door of a thing — taller than the teller.
  const vw = s * 0.88;
  const vh = s * 1.45;
  return {
    sortY: ty + 0.75,
    body: stationBody(0.8, 1.7, 0.55),
    drawShadow: () => rend.castEdgeQuad(p.x - vw / 2, baseY, p.x + vw / 2, baseY, 1.35),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // Contact shade, then the iron mass on stub feet.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
      ctx.fillRect(p.x - vw / 2 - s * 0.02, baseY - s * 0.01, vw + s * 0.04, s * 0.05);
      ctx.fillStyle = '#2c2836';
      ctx.fillRect(p.x - vw / 2 + s * 0.05, baseY - s * 0.06, s * 0.1, s * 0.06);
      ctx.fillRect(p.x + vw / 2 - s * 0.15, baseY - s * 0.06, s * 0.1, s * 0.06);
      ctx.fillStyle = '#3f3a4a';
      ctx.beginPath();
      chamferRect(ctx, p.x - vw / 2, baseY - vh, vw, vh - s * 0.04, s * 0.06);
      ctx.fill();
      // The door leaf sits recessed in its frame, with a lit
      // reveal along the top of both frame and leaf.
      ctx.fillStyle = shade('#3f3a4a', -8);
      ctx.beginPath();
      chamferRect(ctx, p.x - vw / 2 + s * 0.07, baseY - vh + s * 0.1, vw - s * 0.14, vh - s * 0.22, s * 0.05);
      ctx.fill();
      ctx.fillStyle = shade('#3f3a4a', 14);
      ctx.fillRect(p.x - vw / 2 + s * 0.04, baseY - vh + s * 0.04, vw - s * 0.08, s * 0.05);
      ctx.fillStyle = shade('#3f3a4a', 8);
      ctx.fillRect(p.x - vw / 2 + s * 0.09, baseY - vh + s * 0.12, vw - s * 0.18, s * 0.035);
      // Hinge knuckles on the west jamb — this door swings, and
      // it swings HEAVY.
      ctx.fillStyle = '#2c2836';
      for (const hy of [0.22, 0.52, 0.82]) {
        ctx.beginPath();
        chamferRect(ctx, p.x - vw / 2 - s * 0.035, baseY - vh * hy - s * 0.06, s * 0.09, s * 0.12, s * 0.025);
        ctx.fill();
        ctx.fillStyle = '#6a6577';
        ctx.fillRect(p.x - vw / 2 - s * 0.02, baseY - vh * hy - s * 0.05, s * 0.025, s * 0.1);
        ctx.fillStyle = '#2c2836';
      }
      ctx.fillStyle = '#c9962e';
      ctx.fillRect(p.x - vw / 2, baseY - vh * 0.78, vw, s * 0.05);
      ctx.fillRect(p.x - vw / 2, baseY - vh * 0.3, vw, s * 0.05);
      // The dial and its handle spokes, gold at the hub.
      ctx.fillStyle = '#8f96a3';
      ctx.beginPath();
      facetCircle(ctx, p.x, baseY - vh * 0.54, s * 0.14, 8, 0.4);
      ctx.fill();
      ctx.fillStyle = '#2c2836';
      ctx.beginPath();
      facetCircle(ctx, p.x, baseY - vh * 0.54, s * 0.06, 6, 0.4);
      ctx.fill();
      ctx.fillStyle = '#8f96a3';
      ctx.fillRect(p.x - s * 0.02, baseY - vh * 0.54 - s * 0.2, s * 0.04, s * 0.4);
      ctx.fillRect(p.x - s * 0.2, baseY - vh * 0.54 - s * 0.02, s * 0.4, s * 0.04);
      ctx.fillStyle = '#d9a441';
      ctx.fillRect(p.x - s * 0.016, baseY - vh * 0.54 - s * 0.016, s * 0.032, s * 0.032);
      // A slow glint rides the dial rim — polished steel finds
      // the lamplight from any angle.
      const ga = t * 0.5 + h;
      ctx.fillStyle = 'rgba(235, 240, 255, 0.65)';
      ctx.fillRect(
        p.x + Math.cos(ga) * s * 0.115 - s * 0.014,
        baseY - vh * 0.54 + Math.sin(ga) * s * 0.115 - s * 0.014,
        s * 0.028,
        s * 0.028,
      );
      // Rivet rows down both edges of the frame.
      ctx.fillStyle = '#6a6577';
      for (let i = 0; i < 5; i++) {
        const ry = baseY - vh * (0.14 + i * 0.185);
        ctx.fillRect(p.x - vw / 2 + s * 0.015, ry, s * 0.04, s * 0.04);
        ctx.fillRect(p.x + vw / 2 - s * 0.055, ry, s * 0.04, s * 0.04);
      }
    },
  };
}

function paintLectern(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.6, 1.5, 0.45),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // Foot, tapered column, slanted desk, open tome.
      ctx.fillStyle = '#5e3f1e';
      ctx.beginPath();
      chamferRect(ctx, p.x - s * 0.16, baseY - s * 0.07, s * 0.32, s * 0.07, s * 0.02);
      ctx.fill();
      ctx.fillStyle = '#6f4d26';
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.08, baseY - s * 0.06);
      ctx.lineTo(p.x + s * 0.08, baseY - s * 0.06);
      ctx.lineTo(p.x + s * 0.055, baseY - s * 0.78);
      ctx.lineTo(p.x - s * 0.055, baseY - s * 0.78);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade('#6f4d26', 12);
      ctx.fillRect(p.x - s * 0.055, baseY - s * 0.74, s * 0.03, s * 0.62);
      // Slanted desk plate at the reader's ribs.
      ctx.fillStyle = '#8a6534';
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.26, baseY - s * 0.76);
      ctx.lineTo(p.x + s * 0.26, baseY - s * 0.76);
      ctx.lineTo(p.x + s * 0.22, baseY - s * 0.95);
      ctx.lineTo(p.x - s * 0.22, baseY - s * 0.95);
      ctx.closePath();
      ctx.fill();
      // The open tome: two pages and a dark spine crease.
      ctx.fillStyle = '#e8dfc8';
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.2, baseY - s * 0.8);
      ctx.lineTo(p.x - s * 0.01, baseY - s * 0.83);
      ctx.lineTo(p.x - s * 0.01, baseY - s * 0.95);
      ctx.lineTo(p.x - s * 0.18, baseY - s * 0.92);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p.x + s * 0.01, baseY - s * 0.83);
      ctx.lineTo(p.x + s * 0.2, baseY - s * 0.8);
      ctx.lineTo(p.x + s * 0.18, baseY - s * 0.92);
      ctx.lineTo(p.x + s * 0.01, baseY - s * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(36, 22, 10, 0.4)';
      ctx.fillRect(p.x - s * 0.012, baseY - s * 0.95, s * 0.024, s * 0.13);
    },
  };
}

function paintBasin(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  return {
    sortY: ty + 0.62,
    body: stationBody(0.7, 1.1, 0.5),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // THE TROUGH IS AN OPEN VOLUME (art audit #5): the camera looks
      // INTO the basin — foreshortened rim, the far inner wall showing
      // as a shaded band, water sunk below the lip and darkest at the
      // far edge — the well's own cylinder law in rectangular form.
      // THE HASH DEALS THE STONE: tone, the rim chip and the moss lick
      // vary per placement, so a courtyard of basins never twins.
      const stone = shade('#5b5566', ((h >> 3) & 3) * 4 - 4);
      const hw = s * 0.42;
      const wallT = s * 0.055;
      const rimY = baseY - s * 0.4;
      const rimDepth = syT * 0.16;
      const footH = s * 0.05;
      // Contact shade seats the stone (an ellipse, not a smear).
      ctx.fillStyle = 'rgba(18, 12, 26, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.012, hw * 1.04, syT * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      // Two squat feet — the trough stands on the floor, never floats.
      ctx.fillStyle = shade(stone, -18);
      ctx.fillRect(p.x - hw * 0.72, baseY - footH, s * 0.12, footH);
      ctx.fillRect(p.x + hw * 0.72 - s * 0.12, baseY - footH, s * 0.12, footH);
      // The body: front face with the sun-law lit west arris.
      ctx.fillStyle = stone;
      ctx.beginPath();
      chamferRect(ctx, p.x - hw, rimY, hw * 2, baseY - rimY - footH, s * 0.05);
      ctx.fill();
      ctx.fillStyle = shade(stone, 12);
      ctx.fillRect(p.x - hw + s * 0.015, rimY + s * 0.03, s * 0.05, baseY - rimY - footH - s * 0.06);
      ctx.fillStyle = shade(stone, -12);
      ctx.fillRect(p.x - hw, baseY - footH - s * 0.07, hw * 2, s * 0.07);
      // A tooled seam band low on the face — one quiet secondary read.
      ctx.fillStyle = shade(stone, -7);
      ctx.fillRect(p.x - hw + s * 0.04, baseY - footH - s * 0.16, hw * 2 - s * 0.08, s * 0.02);
      // THE RIM: the sky-lit top plane, foreshortened, brighter than
      // any face (the crate-lid grammar), with a chipped corner dealt
      // by the hash.
      ctx.fillStyle = shade(stone, 22);
      ctx.beginPath();
      chamferRect(ctx, p.x - hw, rimY - rimDepth, hw * 2, rimDepth + s * 0.02, s * 0.03);
      ctx.fill();
      if (((h >> 6) & 3) === 0) {
        const chipX = p.x + (((h >> 8) & 1) ? hw * 0.6 : -hw * 0.7);
        ctx.fillStyle = shade(stone, -6);
        ctx.beginPath();
        facetBlob(ctx, chipX, rimY - rimDepth * 0.4, s * 0.035, h ^ 91, 5, 0.6);
        ctx.fill();
      }
      // THE OPENING: inner walls seen from above — the far (north)
      // band deepest in shadow, thin side lips, then the water SUNK
      // below the rim.
      const ix = p.x - hw + wallT;
      const iw = hw * 2 - wallT * 2;
      const innerTop = rimY - rimDepth + syT * 0.045;
      const innerH = rimDepth + s * 0.1;
      ctx.fillStyle = shade(stone, -26);
      ctx.fillRect(ix, innerTop, iw, innerH);
      ctx.fillStyle = shade(stone, -34);
      ctx.fillRect(ix, innerTop, iw, syT * 0.05);
      // The water, a half-wall down: deep at the far edge, lit toward
      // the near lip, one drifting glint and a still rim reflection.
      const wTop = innerTop + syT * 0.05;
      const wH = innerH - syT * 0.05 - s * 0.02;
      ctx.fillStyle = '#33619e';
      ctx.fillRect(ix + s * 0.008, wTop, iw - s * 0.016, wH);
      ctx.fillStyle = '#3d6fb8';
      ctx.fillRect(ix + s * 0.008, wTop + wH * 0.45, iw - s * 0.016, wH * 0.55);
      ctx.fillStyle = 'rgba(20, 32, 58, 0.5)';
      ctx.fillRect(ix + s * 0.008, wTop, iw - s * 0.016, syT * 0.03);
      const gx2 = ix + s * 0.05 + ((t * 0.15 + h * 0.1) % 1) * (iw - s * 0.2);
      ctx.fillStyle = 'rgba(214, 230, 255, 0.5)';
      ctx.fillRect(gx2, wTop + wH * 0.55, s * 0.09, s * 0.022);
      ctx.fillStyle = 'rgba(214, 230, 255, 0.16)';
      ctx.fillRect(ix + s * 0.02, wTop + wH - s * 0.03, iw - s * 0.04, s * 0.014);
      // The moss lick at one foot, when the hash wills it.
      if (((h >> 10) & 3) === 0) {
        ctx.fillStyle = 'rgba(74, 97, 56, 0.55)';
        ctx.beginPath();
        facetBlob(ctx, p.x - hw * 0.66, baseY - footH - s * 0.02, s * 0.05, h ^ 47, 5, 0.62);
        ctx.fill();
      }
    },
  };
}

function paintCampfire(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const flicker = 0.85 + Math.sin(t * 12 + h) * 0.1 + Math.sin(t * 23) * 0.05;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.8, 1.35, 0.55),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // COOKING: the fed fire roars a head taller, its coals
      // brighten, and it spits an extra ember.
      const act = rend.stationHeat.get(packTile(tx, ty)) ?? 0;
      const fl2 = flicker * (1 + act * 0.28);
      // Warm light laps the ground around the ring first.
      ctx.fillStyle = `rgba(232, 122, 51, ${0.08 * flicker + 0.06 * act})`;
      ctx.beginPath();
      facetCircle(ctx, p.x, p.y + s * 0.08, s * 0.52, 8, 0.3, 0.55);
      ctx.fill();
      // Faceted stone ring + squared crossed logs, charred where
      // the fire has been chewing on them.
      ctx.fillStyle = '#6e6879';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        facetCircle(ctx, p.x + Math.cos(a) * s * 0.3, p.y + Math.sin(a) * s * 0.2 + s * 0.08, s * 0.07, 5, a, 0.72);
        ctx.fill();
      }
      for (const rot of [-0.5, 0.6]) {
        ctx.save();
        ctx.translate(p.x, p.y + s * 0.06);
        ctx.rotate(rot);
        ctx.fillStyle = '#6b4a26';
        ctx.beginPath();
        chamferRect(ctx, -s * 0.22, -s * 0.045, s * 0.44, s * 0.09, s * 0.03);
        ctx.fill();
        ctx.fillStyle = '#3a2a20';
        ctx.fillRect(-s * 0.1, -s * 0.045, s * 0.2, s * 0.09);
        ctx.restore();
      }
      // The coal bed under the flames pulses out of phase.
      for (let i = 0; i < 3; i++) {
        const pulse = 0.45 + Math.sin(t * 3.2 + i * 2.1 + h) * 0.45;
        ctx.fillStyle = `rgba(240, 130, 50, ${Math.min(1, 0.35 + pulse * 0.5 + act * 0.25)})`;
        ctx.beginPath();
        facetCircle(ctx, p.x + (i - 1) * s * 0.09, p.y + s * 0.05, s * 0.05, 5, i * 1.3, 0.6);
        ctx.fill();
      }
      // Flame: two flat licks, flickering.
      ctx.fillStyle = '#e8823d';
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.14 * fl2, p.y + s * 0.04);
      ctx.quadraticCurveTo(p.x - s * 0.1, p.y - s * 0.3 * fl2, p.x, p.y - s * 0.42 * fl2);
      ctx.quadraticCurveTo(p.x + s * 0.12, p.y - s * 0.26 * fl2, p.x + s * 0.14 * fl2, p.y + s * 0.04);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f2c94c';
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.07 * fl2, p.y + s * 0.03);
      ctx.quadraticCurveTo(p.x, p.y - s * 0.18 * fl2, p.x + s * 0.02, p.y - s * 0.22 * fl2);
      ctx.quadraticCurveTo(p.x + s * 0.07, p.y - s * 0.1, p.x + s * 0.07 * fl2, p.y + s * 0.03);
      ctx.closePath();
      ctx.fill();
      // Embers spiral up and out of the light; a thin wisp of
      // smoke keeps going where they give up.
      for (let i = 0; i < 2 + (act > 0.3 ? 1 : 0); i++) {
        const ph = (t * (0.55 + i * 0.21) + h * 0.09 + i * 0.5) % 1;
        ctx.fillStyle = `rgba(255, 190, 110, ${(1 - ph) * 0.75})`;
        ctx.fillRect(
          p.x + Math.sin(t * 2.4 + i * 3 + h) * s * 0.08,
          p.y - s * 0.2 - ph * s * 0.42,
          s * 0.025,
          s * 0.025,
        );
      }
      const sp = (t * 0.3 + h * 0.13) % 1;
      ctx.fillStyle = `rgba(146, 140, 152, ${(1 - sp) * 0.22})`;
      ctx.beginPath();
      facetCircle(
        ctx,
        p.x + Math.sin(t * 0.8 + h) * s * 0.06 + sp * s * 0.1,
        p.y - s * 0.5 - sp * s * 0.4,
        s * (0.05 + sp * 0.07),
        6,
        sp * 2,
        0.8,
      );
      ctx.fill();
    },
  };
}

export const HOUSE_PROPS: PropEntries = [
  [[Tile.Table], paintTable],
  [[Tile.Counter], paintCounter],
  [[Tile.Bench], paintBench],
  [[Tile.Chair], paintChair],
  [[Tile.Throne], paintThrone],
  [[Tile.Bed], paintBed],
  [[Tile.Bookshelf], paintBookshelf],
  [[Tile.Cabinet], paintCabinet],
  [[Tile.Hearth], paintHearth],
  [[Tile.MarketStall], paintMarketStall],
  [[Tile.BannerPole], paintBannerPole],
  [[Tile.HangingSign], paintHangingSign],
  [[Tile.Signpost], paintSignpost],
  [[Tile.FlowerBox], paintFlowerBox],
  [[Tile.ToolRack, Tile.WeaponRack], paintToolRack],
  [[Tile.ArmorStand, Tile.ArmorStandFull], paintArmorStand],
  [[Tile.BannerStand], paintBannerStand],
  [[Tile.Vault], paintVault],
  [[Tile.Lectern], paintLectern],
  [[Tile.Basin], paintBasin],
  [[Tile.Campfire], paintCampfire],
];
