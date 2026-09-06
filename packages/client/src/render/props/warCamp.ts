/**
 * THE WAR CAMP — torches, tents, cages, drums: the warband's ground dressing.
 * Extracted verbatim from renderer.ts's objectItem (THE PROP HALL,
 * foundations F1) — each painter is one former switch case; the frame
 * and host contracts live in ./types.ts.
 */
import { PALI_BONE, PALI_LOG, PALI_ROPE, PALI_ROPE_DARK } from '../paintVocab.js';
import { shade } from '../rig.js';
import { chamferRect, facetCircle } from '../shapes.js';
import { Tile } from '@arx/shared';
import type { DrawItem } from '../renderer.js';
import type { PropEntries, PropFrame, PropHost } from './types.js';



// ------------------------------------- THE CLIPPED GREEN props
// The gardener's showpieces. Both ride the cached ring on the
// tree cadence — their painters sample the wind, so the sprite
// re-bake IS the sway (the soft-tree law: animation at cadence
// rate, blit at frame rate).
// ---------------------------------- THE CAMP BARES ITS TEETH
// The war camp's own material culture (docs/war-camp-decor-plan
// .md). Every piece measures against the 1.15-tile body, shows
// its top plane to the tilted bird's eye, and rides the cached
// ring for its brand outline.
function paintStandingTorch(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.16;
  // The stake leans the way it was driven — never plumb.
  const lean = (((h >> 3) & 1) ? 1 : -1) * (0.09 + ((h >> 5) & 3) * 0.02);
  const tipX = p.x + lean * s;
  const tipY = baseY - 1.0 * s;
  const flick = 0.8 + Math.sin(t * 13 + h) * 0.13 + Math.sin(t * 29 + h * 0.3) * 0.07;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.6, 1.7, 0.4),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // THE COLD TORCH BY DAY (contested lands band 7 fix pass 1, the
      // brazier's E6 gate extended): the painted flame rides sky.flame
      // exactly as the brazier's blaze does — a charred rag on its
      // stake at noon, the fire climbing with the dusk clock on the
      // same smooth ramp (cold under 0.05, full at 0.4, never a pop
      // between the ring cache and the live lane), burning through the
      // night. The light row in shared/world/lights.ts was flame-gated
      // from the first; only the painter still burned at noon, which
      // is the fault this gate closes. Underground the frame's flame
      // gate rides to 1, so a dungeon torch never goes cold.
      const lit = rend.sky.flame;
      const rampT = Math.max(0, Math.min(1, (lit - 0.05) / 0.35));
      const fire = rampT * rampT * (3 - 2 * rampT);
      const cold = fire <= 0;
      // Firelight laps the ground first (only while the rag burns).
      if (!cold) {
        ctx.fillStyle = `rgba(232, 122, 51, ${0.07 * flick * fire})`;
        ctx.beginPath();
        facetCircle(ctx, p.x, baseY - s * 0.04, s * 0.42, 8, 0.3, 0.55);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.015, s * 0.11, s * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
      // The driven stake: a tapered squared timber with one lit
      // facet, a rag lashing wound below the head.
      ctx.fillStyle = shade(PALI_LOG, -4);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.055, baseY);
      ctx.lineTo(p.x + s * 0.055, baseY);
      ctx.lineTo(tipX + s * 0.035, tipY);
      ctx.lineTo(tipX - s * 0.035, tipY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(PALI_LOG, 12);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.055, baseY);
      ctx.lineTo(p.x - s * 0.02, baseY);
      ctx.lineTo(tipX - s * 0.012, tipY);
      ctx.lineTo(tipX - s * 0.035, tipY);
      ctx.closePath();
      ctx.fill();
      // The rag head: wound cloth, charred at the crown.
      ctx.fillStyle = '#6e4a33';
      ctx.fillRect(tipX - s * 0.075, tipY - s * 0.1, s * 0.15, s * 0.14);
      ctx.fillStyle = shade('#6e4a33', 14);
      ctx.fillRect(tipX - s * 0.075, tipY - s * 0.055, s * 0.15, s * 0.028);
      ctx.fillStyle = '#2c2430';
      ctx.fillRect(tipX - s * 0.06, tipY - s * 0.13, s * 0.12, s * 0.045);
      if (cold) {
        // By day: the rag head, charred black at the crown, and no
        // flame — the stake reads as a torch by its shape alone.
        ctx.fillStyle = '#1e1822';
        ctx.fillRect(tipX - s * 0.05, tipY - s * 0.17, s * 0.1, s * 0.05);
        return;
      }
      // Flame: one ragged lick and its hot core, flickering hard,
      // scaled by the dusk ramp so it grows in rather than pops.
      ctx.save();
      ctx.globalAlpha *= fire;
      ctx.fillStyle = '#e8823d';
      ctx.beginPath();
      ctx.moveTo(tipX - s * 0.09 * flick, tipY - s * 0.1);
      ctx.quadraticCurveTo(tipX - s * 0.07, tipY - s * 0.3 * flick, tipX + s * 0.015, tipY - s * 0.4 * flick);
      ctx.quadraticCurveTo(tipX + s * 0.08, tipY - s * 0.22, tipX + s * 0.09 * flick, tipY - s * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f2c94c';
      ctx.beginPath();
      ctx.moveTo(tipX - s * 0.04 * flick, tipY - s * 0.11);
      ctx.quadraticCurveTo(tipX - s * 0.01, tipY - s * 0.22 * flick, tipX + s * 0.02, tipY - s * 0.26 * flick);
      ctx.quadraticCurveTo(tipX + s * 0.045, tipY - s * 0.16, tipX + s * 0.04 * flick, tipY - s * 0.11);
      ctx.closePath();
      ctx.fill();
      // One ember spitting off the rag.
      const ph = (t * 0.8 + h * 0.11) % 1;
      ctx.fillStyle = `rgba(255, 190, 110, ${(1 - ph) * 0.7})`;
      ctx.fillRect(
        tipX + Math.sin(t * 2.9 + h) * s * 0.05,
        tipY - s * 0.24 - ph * s * 0.3,
        s * 0.022,
        s * 0.022,
      );
      ctx.restore();
    },
  };
}

function paintBonfire(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.16;
  const roar = 0.9 + Math.sin(t * 1.1 + h) * 0.08;
  const flick = (0.85 + Math.sin(t * 9 + h) * 0.1 + Math.sin(t * 21 + h * 0.7) * 0.05) * roar;
  return {
    sortY: ty + 0.72,
    body: stationBody(1.0, 2.3, 0.6),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // The great fire owns its ground: a wide breathing pool.
      ctx.fillStyle = `rgba(232, 122, 51, ${0.1 * flick})`;
      ctx.beginPath();
      facetCircle(ctx, p.x, baseY - s * 0.02, s * 0.78, 9, 0.3, 0.55);
      ctx.fill();
      // A ring of nine fire-blackened stones.
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + 0.2;
        const rx = p.x + Math.cos(a) * s * 0.46;
        const ry = baseY + Math.sin(a) * syT * 0.42 - s * 0.02;
        ctx.fillStyle = i % 3 === 0 ? '#57535f' : '#6e6879';
        ctx.beginPath();
        facetCircle(ctx, rx, ry, s * (0.075 + ((h >> i) & 1) * 0.02), 5, a, 0.72);
        ctx.fill();
      }
      // The log tepee: squared timbers leaned into a stack,
      // charred where the fire has been eating them.
      for (const [rot, tone] of [
        [-0.62, -6],
        [0.55, 0],
        [-0.18, -12],
        [0.2, -2],
      ] as const) {
        ctx.save();
        ctx.translate(p.x, baseY - s * 0.16);
        ctx.rotate(rot);
        ctx.fillStyle = shade('#6b4a26', tone);
        ctx.beginPath();
        chamferRect(ctx, -s * 0.06, -s * 0.42, s * 0.12, s * 0.5, s * 0.035);
        ctx.fill();
        ctx.fillStyle = '#3a2a20';
        ctx.fillRect(-s * 0.06, -s * 0.08, s * 0.12, s * 0.16);
        ctx.restore();
      }
      // The coal bed pulses under everything.
      for (let i = 0; i < 5; i++) {
        const pulse = 0.45 + Math.sin(t * 3.2 + i * 1.7 + h) * 0.45;
        ctx.fillStyle = `rgba(240, 130, 50, ${Math.min(1, 0.4 + pulse * 0.5)})`;
        ctx.beginPath();
        facetCircle(ctx, p.x + (i - 2) * s * 0.11, baseY - s * 0.02, s * 0.06, 5, i * 1.3, 0.6);
        ctx.fill();
      }
      // THE ROAR: three flame tongues — deep body, mid lick,
      // white-gold heart — each flickering on its own beat.
      const tongue = (ox: number, w: number, hgt: number, phase: number, col: string) => {
        const f = (0.82 + Math.sin(t * 8 + phase) * 0.12 + Math.sin(t * 19 + phase * 2.3) * 0.06) * roar;
        const bx = p.x + ox * s;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(bx - w * s * f, baseY - s * 0.06);
        ctx.quadraticCurveTo(
          bx - w * s * 0.6,
          baseY - hgt * s * 0.55 * f,
          bx + Math.sin(t * 2.2 + phase) * s * 0.06,
          baseY - hgt * s * f,
        );
        ctx.quadraticCurveTo(bx + w * s * 0.75, baseY - hgt * s * 0.5, bx + w * s * f, baseY - s * 0.06);
        ctx.closePath();
        ctx.fill();
      };
      tongue(-0.16, 0.24, 1.05, 1.1, '#c1502e');
      tongue(0.17, 0.26, 1.2, 2.6, '#e8823d');
      tongue(0, 0.3, 1.55, 0.3, '#e8823d');
      tongue(0, 0.16, 0.95, 4.1, '#f2c94c');
      tongue(0, 0.08, 0.6, 5.3, '#faf0b8');
      // The ember column: sparks climb high and die in the dark.
      for (let i = 0; i < 5; i++) {
        const ph = (t * (0.5 + i * 0.17) + h * 0.09 + i * 0.37) % 1;
        ctx.fillStyle = `rgba(255, 190, 110, ${(1 - ph) * 0.8})`;
        ctx.fillRect(
          p.x + Math.sin(t * 2.1 + i * 2.4 + h) * s * (0.1 + ph * 0.14),
          baseY - s * 0.6 - ph * s * 1.1,
          s * (0.03 - ph * 0.012),
          s * (0.03 - ph * 0.012),
        );
      }
      // Smoke: two stacked puffs shearing off with the heat.
      for (let i = 0; i < 2; i++) {
        const sp = (t * 0.26 + i * 0.5 + h * 0.13) % 1;
        ctx.fillStyle = `rgba(146, 140, 152, ${(1 - sp) * 0.24})`;
        ctx.beginPath();
        facetCircle(
          ctx,
          p.x + Math.sin(t * 0.7 + i * 2 + h) * s * 0.1 + sp * s * 0.22,
          baseY - s * 1.35 - sp * s * 0.7,
          s * (0.09 + sp * 0.12),
          6,
          sp * 2 + i,
          0.8,
        );
        ctx.fill();
      }
    },
  };
}

function paintWarBrazier(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.16;
  const flick = 0.8 + Math.sin(t * 12 + h) * 0.13 + Math.sin(t * 27 + h * 0.5) * 0.06;
  const IRON = '#3a3444';
  return {
    sortY: ty + 0.7,
    body: stationBody(0.7, 1.8, 0.45),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = `rgba(232, 122, 51, ${0.07 * flick})`;
      ctx.beginPath();
      facetCircle(ctx, p.x, baseY - s * 0.03, s * 0.5, 8, 0.4, 0.55);
      ctx.fill();
      ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, s * 0.3, s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      // The tripod: three scavenged spears planted butt-down,
      // heads crossing high — the camp made a lamp of its arms.
      const apexY = baseY - s * 1.22;
      for (const [ox, oy, tone] of [
        [-0.3, 0.06, -8],
        [0.3, 0.06, 0],
        [0.02, -0.14, -14],
      ] as const) {
        const bx = p.x + ox * s;
        const by = baseY + oy * syT;
        ctx.fillStyle = shade('#6b4a26', tone);
        ctx.beginPath();
        ctx.moveTo(bx - s * 0.028, by);
        ctx.lineTo(bx + s * 0.028, by);
        ctx.lineTo(p.x + ox * s * 0.12 + s * 0.02, apexY);
        ctx.lineTo(p.x + ox * s * 0.12 - s * 0.02, apexY);
        ctx.closePath();
        ctx.fill();
        // The spearhead past the crossing.
        ctx.fillStyle = '#8b93a4';
        ctx.beginPath();
        ctx.moveTo(p.x + ox * s * 0.08 - s * 0.035, apexY - s * 0.02);
        ctx.lineTo(p.x + ox * s * 0.06, apexY - s * 0.16);
        ctx.lineTo(p.x + ox * s * 0.08 + s * 0.035, apexY - s * 0.02);
        ctx.closePath();
        ctx.fill();
      }
      // The rope lash at the crossing.
      ctx.fillStyle = PALI_ROPE;
      ctx.fillRect(p.x - s * 0.07, apexY + s * 0.01, s * 0.14, s * 0.045);
      // Chain: three links down to the basket bail.
      ctx.fillStyle = IRON;
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(p.x - s * 0.016, apexY + s * 0.06 + i * s * 0.075, s * 0.032, s * 0.055);
      }
      // The fire cage: a riveted iron basket, coals burning
      // through the bars — the bars chop the light into stripes.
      const cy = baseY - s * 0.62;
      const cw2 = s * 0.21;
      ctx.fillStyle = `rgba(240, 130, 50, ${0.55 + flick * 0.3})`;
      ctx.fillRect(p.x - cw2 + s * 0.02, cy - s * 0.1, cw2 * 2 - s * 0.04, s * 0.26);
      ctx.fillStyle = '#f2c94c';
      ctx.fillRect(p.x - cw2 + s * 0.05, cy - s * 0.06, cw2 * 2 - s * 0.1, s * 0.1);
      ctx.fillStyle = IRON;
      // Rim hoop, belly hoop, foot cup + four cage bars.
      ctx.fillRect(p.x - cw2 - s * 0.015, cy - s * 0.13, cw2 * 2 + s * 0.03, s * 0.05);
      ctx.fillRect(p.x - cw2 + s * 0.01, cy + s * 0.1, cw2 * 2 - s * 0.02, s * 0.045);
      for (const fx of [-0.66, -0.22, 0.22, 0.66]) {
        ctx.fillRect(p.x + fx * cw2 - s * 0.018, cy - s * 0.12, s * 0.036, s * 0.28);
      }
      ctx.fillStyle = shade(IRON, 14);
      ctx.fillRect(p.x - cw2 - s * 0.015, cy - s * 0.13, cw2 * 2 + s * 0.03, s * 0.016);
      // Flame licking over the rim.
      ctx.fillStyle = '#e8823d';
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.1 * flick, cy - s * 0.11);
      ctx.quadraticCurveTo(p.x - s * 0.06, cy - s * 0.3 * flick, p.x + s * 0.01, cy - s * 0.38 * flick);
      ctx.quadraticCurveTo(p.x + s * 0.09, cy - s * 0.2, p.x + s * 0.1 * flick, cy - s * 0.11);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f2c94c';
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.045 * flick, cy - s * 0.12);
      ctx.quadraticCurveTo(p.x, cy - s * 0.2 * flick, p.x + s * 0.02, cy - s * 0.24 * flick);
      ctx.quadraticCurveTo(p.x + s * 0.05, cy - s * 0.16, p.x + s * 0.045 * flick, cy - s * 0.12);
      ctx.closePath();
      ctx.fill();
      // Embers escape between the bars.
      for (let i = 0; i < 2; i++) {
        const ph = (t * (0.6 + i * 0.23) + h * 0.07 + i * 0.5) % 1;
        ctx.fillStyle = `rgba(255, 190, 110, ${(1 - ph) * 0.7})`;
        ctx.fillRect(
          p.x + Math.sin(t * 2.6 + i * 3 + h) * s * 0.07,
          cy - s * 0.2 - ph * s * 0.38,
          s * 0.022,
          s * 0.022,
        );
      }
    },
  };
}

function paintTentHide(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.42;
  const HIDE = ['#8f6e4a', '#7a5c3e', '#84644a', '#6e523a'] as const;
  const base = HIDE[h % 4]!;
  const hw = s * 0.66;
  const apexY = baseY - s * 1.32;
  return {
    sortY: ty + 0.78,
    body: stationBody(0.85, 1.9, 0.65),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - hw * 0.8, baseY, p.x + hw * 0.8, baseY, 0.9);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.03, hw * 1.05, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // Bent lodge-poles cross out of the smoke hole.
      ctx.fillStyle = shade(PALI_LOG, -8);
      for (const [ox, rot] of [
        [-0.05, -0.32],
        [0.05, 0.3],
      ] as const) {
        ctx.save();
        ctx.translate(p.x + ox * s, apexY + s * 0.1);
        ctx.rotate(rot);
        ctx.fillRect(-s * 0.018, -s * 0.24, s * 0.036, s * 0.3);
        ctx.restore();
      }
      // The cover: one hide cone with softly bowed sides. The
      // south face is the sun side — value breaks at the seams
      // tell the pitch (FLAT FORGE: planes, never lines).
      ctx.fillStyle = base;
      ctx.beginPath();
      ctx.moveTo(p.x - hw, baseY);
      ctx.quadraticCurveTo(p.x - hw * 0.62, baseY - s * 0.86, p.x - s * 0.06, apexY);
      ctx.lineTo(p.x + s * 0.06, apexY);
      ctx.quadraticCurveTo(p.x + hw * 0.62, baseY - s * 0.86, p.x + hw, baseY);
      ctx.closePath();
      ctx.fill();
      // Panel seams: the east slope falls off dark, a lit crown
      // band under the apex sells the foreshortened top.
      ctx.fillStyle = shade(base, -14);
      ctx.beginPath();
      ctx.moveTo(p.x + hw, baseY);
      ctx.quadraticCurveTo(p.x + hw * 0.62, baseY - s * 0.86, p.x + s * 0.06, apexY);
      ctx.lineTo(p.x + s * 0.02, apexY);
      ctx.quadraticCurveTo(p.x + hw * 0.34, baseY - s * 0.72, p.x + hw * 0.52, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(base, 16);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.06, apexY);
      ctx.lineTo(p.x + s * 0.06, apexY);
      ctx.quadraticCurveTo(p.x + s * 0.16, apexY + s * 0.22, p.x + s * 0.13, apexY + s * 0.3);
      ctx.quadraticCurveTo(p.x, apexY + s * 0.24, p.x - s * 0.13, apexY + s * 0.3);
      ctx.quadraticCurveTo(p.x - s * 0.16, apexY + s * 0.22, p.x - s * 0.06, apexY);
      ctx.closePath();
      ctx.fill();
      // The patchwork: two stitched patches, ticks and all.
      const patch = (px2: number, py2: number, pw2: number, tone: number) => {
        ctx.fillStyle = shade(base, tone);
        ctx.beginPath();
        chamferRect(ctx, px2, py2, pw2, pw2 * 0.8, pw2 * 0.22);
        ctx.fill();
        ctx.fillStyle = shade(base, tone - 18);
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(px2 + pw2 * (0.15 + i * 0.3), py2 - s * 0.012, s * 0.014, s * 0.03);
        }
      };
      patch(p.x - hw * 0.58, baseY - s * 0.42, s * 0.17, 8);
      patch(p.x + hw * 0.18, baseY - s * 0.68, s * 0.14, -8);
      // The door mouth: a dark hide flap thrown over one lash —
      // the inside of a goblin tent keeps its own counsel.
      ctx.fillStyle = '#241a2e';
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.17, baseY);
      ctx.quadraticCurveTo(p.x - s * 0.15, baseY - s * 0.52, p.x + s * 0.02, baseY - s * 0.56);
      ctx.quadraticCurveTo(p.x + s * 0.16, baseY - s * 0.5, p.x + s * 0.17, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(base, 6);
      ctx.beginPath();
      ctx.moveTo(p.x + s * 0.02, baseY - s * 0.56);
      ctx.quadraticCurveTo(p.x + s * 0.16, baseY - s * 0.5, p.x + s * 0.17, baseY);
      ctx.lineTo(p.x + s * 0.06, baseY);
      ctx.quadraticCurveTo(p.x + s * 0.05, baseY - s * 0.4, p.x + s * 0.02, baseY - s * 0.56);
      ctx.closePath();
      ctx.fill();
      // Bone toggles pin the door hide back.
      ctx.fillStyle = PALI_BONE;
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(p.x + s * (0.08 + i * 0.005), baseY - s * (0.44 - i * 0.14), s * 0.045, s * 0.02);
      }
    },
  };
}

function paintTentWar(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.42;
  const base = '#6e4a33';
  const ridgeY = baseY - s * 1.18;
  const hw = s * 0.72;
  return {
    sortY: ty + 0.78,
    body: stationBody(0.95, 1.9, 0.65),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - hw * 0.85, baseY, p.x + hw * 0.85, baseY, 0.85);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.03, hw * 1.08, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // Ridge pole: only short nub ends peek past the cloth —
      // the pole lives UNDER the hides, not floating over them.
      ctx.fillStyle = shade(PALI_LOG, -6);
      ctx.fillRect(p.x - hw - s * 0.06, ridgeY + s * 0.02, s * 0.14, s * 0.05);
      ctx.fillRect(p.x + hw - s * 0.08, ridgeY + s * 0.02, s * 0.14, s * 0.05);
      // The cover: hide panels draped over the ridge. The roof
      // slope facing the sky is the BRIGHT plane (the bird's-eye
      // read); the south gable hangs in the unlit tone.
      ctx.fillStyle = shade(base, 18);
      ctx.beginPath();
      ctx.moveTo(p.x - hw, baseY - syT * 0.4);
      ctx.lineTo(p.x - hw * 0.92, baseY - syT * 0.4 - s * 0.06);
      ctx.lineTo(p.x, ridgeY - s * 0.02);
      ctx.lineTo(p.x + hw * 0.92, baseY - syT * 0.4 - s * 0.06);
      ctx.lineTo(p.x + hw, baseY - syT * 0.4);
      ctx.lineTo(p.x, ridgeY + s * 0.16);
      ctx.closePath();
      ctx.fill();
      // The south gable: a hide triangle, sagging hem.
      ctx.fillStyle = base;
      ctx.beginPath();
      ctx.moveTo(p.x - hw, baseY - syT * 0.4);
      ctx.quadraticCurveTo(p.x - hw * 0.9, baseY - s * 0.06, p.x - hw * 0.78, baseY);
      ctx.lineTo(p.x + hw * 0.78, baseY);
      ctx.quadraticCurveTo(p.x + hw * 0.9, baseY - s * 0.06, p.x + hw, baseY - syT * 0.4);
      ctx.lineTo(p.x, ridgeY + s * 0.16);
      ctx.closePath();
      ctx.fill();
      // Seam shading folds the gable around the door.
      ctx.fillStyle = shade(base, -12);
      ctx.beginPath();
      ctx.moveTo(p.x + hw, baseY - syT * 0.4);
      ctx.lineTo(p.x, ridgeY + s * 0.16);
      ctx.lineTo(p.x + s * 0.05, ridgeY + s * 0.3);
      ctx.lineTo(p.x + hw * 0.72, baseY);
      ctx.lineTo(p.x + hw * 0.78, baseY);
      ctx.quadraticCurveTo(p.x + hw * 0.9, baseY - s * 0.06, p.x + hw, baseY - syT * 0.4);
      ctx.closePath();
      ctx.fill();
      // The door: pulled-back flaps over a dark mouth.
      ctx.fillStyle = '#241a2e';
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.2, baseY);
      ctx.lineTo(p.x - s * 0.14, baseY - s * 0.62);
      ctx.lineTo(p.x + s * 0.14, baseY - s * 0.62);
      ctx.lineTo(p.x + s * 0.2, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(base, 8);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.2, baseY);
      ctx.lineTo(p.x - s * 0.14, baseY - s * 0.62);
      ctx.lineTo(p.x - s * 0.05, baseY - s * 0.6);
      ctx.lineTo(p.x - s * 0.12, baseY);
      ctx.closePath();
      ctx.fill();
      // THE TROPHY: a long-snouted beast skull over the door —
      // the chief hangs what he hunted.
      const sy2 = baseY - s * 0.78;
      ctx.fillStyle = PALI_BONE;
      ctx.beginPath();
      facetCircle(ctx, p.x, sy2, s * 0.08, 7, 0.3, 0.8);
      ctx.fill();
      ctx.fillStyle = shade(PALI_BONE, -8);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.045, sy2 + s * 0.04);
      ctx.lineTo(p.x, sy2 + s * 0.16);
      ctx.lineTo(p.x + s * 0.045, sy2 + s * 0.04);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#241a2e';
      ctx.fillRect(p.x - s * 0.05, sy2 - s * 0.02, s * 0.032, s * 0.03);
      ctx.fillRect(p.x + s * 0.018, sy2 - s * 0.02, s * 0.032, s * 0.03);
      // Guy ropes stake the corners down.
      ctx.strokeStyle = PALI_ROPE_DARK;
      ctx.lineWidth = Math.max(1, s * 0.022);
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(p.x + sgn * hw * 0.94, baseY - syT * 0.38);
        ctx.lineTo(p.x + sgn * (hw + s * 0.22), baseY + s * 0.05);
        ctx.stroke();
        ctx.fillStyle = shade(PALI_LOG, -10);
        ctx.fillRect(p.x + sgn * (hw + s * 0.2), baseY - s * 0.03, s * 0.035, s * 0.1);
      }
      // The chief's pennon rides the west ridge nub.
      const { sway, lag } = rend.breezeAt(tx, ty, t, tx * 1.9 + ty, s, 0.05, 0.06);
      ctx.fillStyle = '#8a3b34';
      ctx.beginPath();
      ctx.moveTo(p.x - hw - s * 0.04, ridgeY + s * 0.03);
      ctx.lineTo(p.x - hw - s * 0.04, ridgeY - s * 0.12);
      ctx.lineTo(p.x - hw - s * 0.3 + sway, ridgeY - s * 0.05 + lag * 0.4);
      ctx.closePath();
      ctx.fill();
    },
  };
}

function paintSkullPile(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.3;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.7, 1.1, 0.5),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, s * 0.48, s * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
      // The long-bone bed the heap sits on.
      ctx.fillStyle = shade(PALI_BONE, -16);
      for (const [ox, oy, rot, len] of [
        [-0.3, 0.02, 0.3, 0.34],
        [0.26, 0.04, -0.2, 0.3],
        [0.02, 0.07, 0.06, 0.4],
      ] as const) {
        ctx.save();
        ctx.translate(p.x + ox * s, baseY + oy * s);
        ctx.rotate(rot);
        ctx.fillRect(-len * s * 0.5, -s * 0.03, len * s, s * 0.06);
        ctx.fillRect(len * s * 0.5 - s * 0.02, -s * 0.045, s * 0.045, s * 0.09);
        ctx.restore();
      }
      // The heap: skulls stacked two courses high, every one a
      // dome with its own jaw and pits — no two facing alike.
      const skull = (ox: number, oy: number, r: number, tone: number, look: number, tusks: boolean) => {
        const sx = p.x + ox * s;
        const sy2 = baseY + oy * s;
        ctx.fillStyle = shade(PALI_BONE, tone);
        ctx.beginPath();
        facetCircle(ctx, sx, sy2, r, 7, look, 0.8);
        ctx.fill();
        // The brow shadow seats the dome; the jaw hangs under.
        ctx.fillStyle = shade(PALI_BONE, tone - 14);
        ctx.fillRect(sx - r * 0.62, sy2 + r * 0.4, r * 1.24, r * 0.5);
        ctx.fillStyle = '#241a2e';
        const eo = look * 0.1;
        ctx.fillRect(sx - r * 0.52 + eo * r, sy2 - r * 0.18, r * 0.36, r * 0.36);
        ctx.fillRect(sx + r * 0.16 + eo * r, sy2 - r * 0.18, r * 0.36, r * 0.36);
        if (tusks) {
          ctx.fillStyle = shade(PALI_BONE, tone + 14);
          ctx.beginPath();
          ctx.moveTo(sx - r * 0.6, sy2 + r * 0.8);
          ctx.lineTo(sx - r * 0.75, sy2 + r * 0.15);
          ctx.lineTo(sx - r * 0.45, sy2 + r * 0.6);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(sx + r * 0.6, sy2 + r * 0.8);
          ctx.lineTo(sx + r * 0.75, sy2 + r * 0.15);
          ctx.lineTo(sx + r * 0.45, sy2 + r * 0.6);
          ctx.closePath();
          ctx.fill();
        }
      };
      // Bottom course, then the crown pair riding it.
      skull(-0.27, -0.14, s * 0.14, -6, -0.4, false);
      skull(0.05, -0.1, s * 0.155, 0, 0.3, ((h >> 2) & 1) === 1);
      skull(0.33, -0.16, s * 0.13, -10, 0.8, false);
      skull(-0.08, -0.38, s * 0.14, 8, -0.2, false);
      skull(0.19, -0.36, s * 0.125, 4, 0.5, ((h >> 5) & 1) === 1);
      // Loose teeth and chips catch the light around the foot.
      ctx.fillStyle = shade(PALI_BONE, 10);
      for (let i = 0; i < 4; i++) {
        const a = ((h >> (i * 2)) & 7) / 7;
        ctx.fillRect(p.x + (a - 0.5) * s * 0.8, baseY + s * (0.04 + (i % 2) * 0.04), s * 0.03, s * 0.024);
      }
    },
  };
}

function paintSkullTotem(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.16;
  const topY = baseY - s * 1.58;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.6, 2.1, 0.4),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - s * 0.06, baseY, p.x + s * 0.06, baseY, 1.5);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.015, s * 0.14, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      // Stone packing at the foot holds the stake.
      ctx.fillStyle = '#6e6879';
      for (const [ox, r] of [
        [-0.11, 0.055],
        [0.1, 0.05],
        [0, 0.045],
      ] as const) {
        ctx.beginPath();
        facetCircle(ctx, p.x + ox * s, baseY - s * 0.01, r * s, 5, ox * 9, 0.7);
        ctx.fill();
      }
      // The carved stake: notch bands cut the shaft — the
      // maker's tally marching up the wood.
      ctx.fillStyle = shade(PALI_LOG, -4);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.065, baseY);
      ctx.lineTo(p.x + s * 0.065, baseY);
      ctx.lineTo(p.x + s * 0.045, topY);
      ctx.lineTo(p.x - s * 0.045, topY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(PALI_LOG, 11);
      ctx.fillRect(p.x - s * 0.055, baseY - s * 1.5, s * 0.024, s * 1.5);
      ctx.fillStyle = shade(PALI_LOG, -22);
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(p.x - s * 0.05, baseY - s * (0.24 + i * 0.14), s * 0.1, s * 0.035);
      }
      // The crossbar the fetishes hang from.
      ctx.fillStyle = shade(PALI_LOG, -10);
      ctx.fillRect(p.x - s * 0.3, baseY - s * 1.06, s * 0.6, s * 0.05);
      ctx.fillStyle = PALI_ROPE;
      ctx.fillRect(p.x - s * 0.045, baseY - s * 1.08, s * 0.09, s * 0.09);
      // THE FETISHES: rag strips and a feather ride the breeze —
      // the totem is never quite still.
      const { sway, lag } = rend.breezeAt(tx, ty, t, tx * 2.3 + ty * 1.1, s, 0.04, 0.055);
      const rag = (ox: number, col: string, len: number, ph: number) => {
        const rx = p.x + ox * s;
        const ry = baseY - s * 1.03;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(rx - s * 0.028, ry);
        ctx.lineTo(rx + s * 0.028, ry);
        ctx.lineTo(rx + s * 0.02 + sway * ph, ry + len * s * 0.6 + Math.abs(lag) * 0.2);
        ctx.lineTo(rx - s * 0.008 + lag * ph, ry + len * s);
        ctx.lineTo(rx - s * 0.032 + sway * ph * 0.6, ry + len * s * 0.55);
        ctx.closePath();
        ctx.fill();
      };
      rag(-0.24, '#8a3b34', 0.34, 1);
      rag(0.22, '#6e4a33', 0.28, 1.3);
      // The feather: a pale barb on a thong.
      ctx.fillStyle = '#ddd6c2';
      ctx.beginPath();
      ctx.ellipse(
        p.x + s * 0.09 + sway * 0.8,
        baseY - s * 0.86 + Math.abs(lag) * 0.3,
        s * 0.026,
        s * 0.09,
        0.3 + sway * 0.02,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      // THE SKULLS: three ranks impaled up the stake, the crown
      // wearing a long-jawed beast skull — the pack's own sign.
      const impaled = (oy: number, r: number, tone: number) => {
        const sy2 = baseY - oy * s;
        ctx.fillStyle = shade(PALI_BONE, tone);
        ctx.beginPath();
        facetCircle(ctx, p.x, sy2, r, 7, 0.3, 0.8);
        ctx.fill();
        ctx.fillStyle = shade(PALI_BONE, tone - 14);
        ctx.fillRect(p.x - r * 0.6, sy2 + r * 0.42, r * 1.2, r * 0.42);
        ctx.fillStyle = '#241a2e';
        ctx.fillRect(p.x - r * 0.5, sy2 - r * 0.16, r * 0.34, r * 0.34);
        ctx.fillRect(p.x + r * 0.16, sy2 - r * 0.16, r * 0.34, r * 0.34);
      };
      impaled(0.44, s * 0.135, -8);
      impaled(0.78, s * 0.12, 0);
      // The beast crown: dome + long snout + back-swept jaw.
      const cy2 = topY + s * 0.02;
      ctx.fillStyle = shade(PALI_BONE, 10);
      ctx.beginPath();
      facetCircle(ctx, p.x, cy2, s * 0.115, 7, 0.5, 0.8);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.02, cy2 - s * 0.02);
      ctx.lineTo(p.x - s * 0.26, cy2 + s * 0.06);
      ctx.lineTo(p.x - s * 0.24, cy2 + s * 0.12);
      ctx.lineTo(p.x - s * 0.01, cy2 + s * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(PALI_BONE, -10);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.22, cy2 + s * 0.13);
      ctx.lineTo(p.x - s * 0.02, cy2 + s * 0.12);
      ctx.lineTo(p.x - s * 0.01, cy2 + s * 0.17);
      ctx.lineTo(p.x - s * 0.18, cy2 + s * 0.18);
      ctx.closePath();
      ctx.fill();
      // Fangs bite the light along the snout.
      ctx.fillStyle = '#f4efdf';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(p.x - s * (0.06 + i * 0.06), cy2 + s * 0.11);
        ctx.lineTo(p.x - s * (0.075 + i * 0.06), cy2 + s * 0.155);
        ctx.lineTo(p.x - s * (0.09 + i * 0.06), cy2 + s * 0.11);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#241a2e';
      ctx.fillRect(p.x - s * 0.075, cy2 - s * 0.035, s * 0.035, s * 0.035);
      ctx.fillRect(p.x + s * 0.03, cy2 - s * 0.035, s * 0.035, s * 0.035);
    },
  };
}

function paintWarBanner(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.14;
  // The shaft kinks where it was broken and re-lashed.
  const kinkX = p.x + s * 0.06;
  const kinkY = baseY - s * 0.95;
  const topX = p.x - s * 0.03;
  const topY = baseY - s * 1.78;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.7, 2.3, 0.45),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - s * 0.05, baseY, p.x + s * 0.05, baseY, 1.7);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.015, s * 0.13, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      // The war standard's shaft: a spear that lost its fight,
      // two timber runs meeting at a rope-bound kink.
      ctx.fillStyle = shade(PALI_LOG, -6);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.04, baseY);
      ctx.lineTo(p.x + s * 0.04, baseY);
      ctx.lineTo(kinkX + s * 0.03, kinkY);
      ctx.lineTo(kinkX - s * 0.03, kinkY);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(kinkX - s * 0.03, kinkY);
      ctx.lineTo(kinkX + s * 0.03, kinkY);
      ctx.lineTo(topX + s * 0.022, topY);
      ctx.lineTo(topX - s * 0.022, topY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(PALI_LOG, 10);
      ctx.fillRect(p.x - s * 0.03, baseY - s * 0.9, s * 0.018, s * 0.9);
      ctx.fillStyle = PALI_ROPE;
      ctx.fillRect(kinkX - s * 0.045, kinkY - s * 0.035, s * 0.09, s * 0.07);
      // The spearhead survives at the top.
      ctx.fillStyle = '#8b93a4';
      ctx.beginPath();
      ctx.moveTo(topX - s * 0.045, topY + s * 0.01);
      ctx.lineTo(topX, topY - s * 0.17);
      ctx.lineTo(topX + s * 0.045, topY + s * 0.01);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#aeb6c6';
      ctx.beginPath();
      ctx.moveTo(topX - s * 0.045, topY + s * 0.01);
      ctx.lineTo(topX, topY - s * 0.17);
      ctx.lineTo(topX, topY + s * 0.01);
      ctx.closePath();
      ctx.fill();
      // The lashed crossbar carries the hide.
      ctx.fillStyle = shade(PALI_LOG, -12);
      ctx.fillRect(topX - s * 0.02, topY + s * 0.14, s * 0.5, s * 0.045);
      // THE HIDE: stiff painted leather, not silk — the body
      // swings as one, only the torn points trail the beat.
      const { sway, lag } = rend.breezeAt(tx, ty, t, tx * 1.3 + ty * 2.1, s, 0.03, 0.05);
      const bx0 = topX + s * 0.05;
      const bw2 = s * 0.4;
      const by0 = topY + s * 0.2;
      const bl = s * 0.78;
      const HIDE2 = '#8a5c40';
      ctx.fillStyle = HIDE2;
      ctx.beginPath();
      ctx.moveTo(bx0, by0);
      ctx.lineTo(bx0 + bw2, by0);
      ctx.lineTo(bx0 + bw2 + sway * 0.4, by0 + bl * 0.72);
      // Three ragged tear-points instead of a hem.
      ctx.lineTo(bx0 + bw2 * 0.82 + lag, by0 + bl);
      ctx.lineTo(bx0 + bw2 * 0.62 + lag * 0.7, by0 + bl * 0.78);
      ctx.lineTo(bx0 + bw2 * 0.42 + lag, by0 + bl * 0.96);
      ctx.lineTo(bx0 + bw2 * 0.24 + lag * 0.6, by0 + bl * 0.76);
      ctx.lineTo(bx0 + lag * 0.8, by0 + bl * 0.9);
      ctx.lineTo(bx0 + sway * 0.4, by0 + bl * 0.66);
      ctx.closePath();
      ctx.fill();
      // The weathered upper band still holds its old color.
      ctx.fillStyle = shade(HIDE2, 12);
      ctx.fillRect(bx0, by0, bw2, s * 0.09);
      // THE MARK: a crude fang device slashed on in bone-white —
      // the camp paints its threat where the road can read it.
      ctx.fillStyle = '#e8e2d4';
      ctx.beginPath();
      ctx.moveTo(bx0 + bw2 * 0.22, by0 + bl * 0.2);
      ctx.lineTo(bx0 + bw2 * 0.4, by0 + bl * 0.62);
      ctx.lineTo(bx0 + bw2 * 0.5, by0 + bl * 0.28);
      ctx.lineTo(bx0 + bw2 * 0.6, by0 + bl * 0.62);
      ctx.lineTo(bx0 + bw2 * 0.78, by0 + bl * 0.2);
      ctx.lineTo(bx0 + bw2 * 0.64, by0 + bl * 0.2);
      ctx.lineTo(bx0 + bw2 * 0.56, by0 + bl * 0.44);
      ctx.lineTo(bx0 + bw2 * 0.44, by0 + bl * 0.44);
      ctx.lineTo(bx0 + bw2 * 0.36, by0 + bl * 0.2);
      ctx.closePath();
      ctx.fill();
      // A knotted scalp-rag trails off the crossbar's far end.
      ctx.fillStyle = '#6e4a33';
      ctx.beginPath();
      ctx.moveTo(topX + s * 0.44, topY + s * 0.16);
      ctx.lineTo(topX + s * 0.5, topY + s * 0.16);
      ctx.lineTo(topX + s * 0.48 + sway, topY + s * 0.44 + Math.abs(lag) * 0.3);
      ctx.closePath();
      ctx.fill();
    },
  };
}

function paintPrisonCage(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.4;
  const hw = s * 0.5;
  const capD = 0.3 * syT;
  const topY = baseY - s * 1.06;
  return {
    sortY: ty + 0.76,
    body: stationBody(0.75, 1.7, 0.6),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - hw * 0.9, baseY, p.x + hw * 0.9, baseY, 0.95);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.03, hw * 1.15, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // The dark inside first — bars read against it.
      ctx.fillStyle = '#1c1526';
      ctx.fillRect(p.x - hw + s * 0.03, topY + capD, hw * 2 - s * 0.06, baseY - topY - capD);
      // Bone litter on the cage floor: whoever was kept here
      // left their supper behind.
      ctx.fillStyle = shade(PALI_BONE, -22);
      ctx.fillRect(p.x - s * 0.16, baseY - s * 0.1, s * 0.2, s * 0.035);
      ctx.fillRect(p.x + s * 0.02, baseY - s * 0.06, s * 0.14, s * 0.03);
      // Branch bars: uneven, hand-cut, each with a lit sliver.
      for (let i = 0; i < 5; i++) {
        const bx = p.x - hw + s * 0.09 + i * ((hw * 2 - s * 0.18) / 4);
        const wob = (((h >> (i * 2)) & 3) - 1.5) * s * 0.012;
        ctx.fillStyle = shade(PALI_LOG, ((h >> i) & 3) - 3);
        ctx.beginPath();
        ctx.moveTo(bx - s * 0.026, baseY);
        ctx.lineTo(bx + s * 0.026, baseY);
        ctx.lineTo(bx + s * 0.026 + wob, topY + capD * 0.4);
        ctx.lineTo(bx - s * 0.026 + wob, topY + capD * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(PALI_LOG, 10);
        ctx.fillRect(bx - s * 0.022, topY + capD, s * 0.014, baseY - topY - capD);
      }
      // Corner posts + top and bottom lash rails frame the box.
      ctx.fillStyle = shade(PALI_LOG, -8);
      ctx.fillRect(p.x - hw, topY + capD * 0.3, s * 0.07, baseY - topY - capD * 0.3);
      ctx.fillRect(p.x + hw - s * 0.07, topY + capD * 0.3, s * 0.07, baseY - topY - capD * 0.3);
      ctx.fillStyle = shade(PALI_LOG, -2);
      ctx.fillRect(p.x - hw, baseY - s * 0.09, hw * 2, s * 0.07);
      ctx.fillRect(p.x - hw, topY + capD, hw * 2, s * 0.06);
      // THE LID: a foreshortened top plane of cross-lashed bars
      // (crate-lid grammar — the bird's eye must see the cage
      // closes over its prisoner).
      ctx.fillStyle = shade(PALI_LOG, 16);
      ctx.fillRect(p.x - hw, topY, hw * 2, capD);
      ctx.fillStyle = shade(PALI_LOG, -18);
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(p.x - hw + s * 0.1 + i * (hw * 2 - s * 0.2) / 3, topY + s * 0.012, s * 0.045, capD - s * 0.024);
      }
      ctx.fillStyle = shade(PALI_LOG, 30);
      ctx.fillRect(p.x - hw, topY, hw * 2, s * 0.02);
      ctx.fillStyle = shade(PALI_LOG, -24);
      ctx.fillRect(p.x - hw, topY + capD - s * 0.018, hw * 2, s * 0.018);
      // Rope hinge coils + the knotted door lash: the lock is a
      // knot, and the knot is the story.
      ctx.fillStyle = PALI_ROPE;
      ctx.fillRect(p.x + hw - s * 0.1, topY + capD + s * 0.06, s * 0.06, s * 0.08);
      ctx.fillRect(p.x + hw - s * 0.1, baseY - s * 0.2, s * 0.06, s * 0.08);
      ctx.fillStyle = PALI_ROPE_DARK;
      ctx.fillRect(p.x - s * 0.05, baseY - s * 0.58, s * 0.1, s * 0.13);
      ctx.fillStyle = PALI_ROPE;
      ctx.fillRect(p.x - s * 0.032, baseY - s * 0.55, s * 0.064, s * 0.07);
    },
  };
}

function paintSpikeBarrier(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.34;
  return {
    sortY: ty + 0.72,
    body: stationBody(0.85, 1.35, 0.55),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // The shadow hugs the FOOTPRINT — the frame's legs bite
      // the ground at its rim, never hover over it.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY, s * 0.46, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      // Ground contact under each front leg.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
      for (const gx of [-0.4, 0.36]) {
        ctx.beginPath();
        ctx.ellipse(p.x + gx * s, baseY - s * 0.01, s * 0.09, s * 0.035, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // One crossed pair of sharpened stakes: each shaft is a
      // squared timber with a lit facet, both ends axe-cut to a
      // bright point. Painted twice — the rear rank first, dim.
      // The crossing sits LOW (0.26 tiles) so the lower points
      // land on the shadow's rim.
      const stake = (rot: number, tone: number, ox: number, oy: number, len: number) => {
        ctx.save();
        ctx.translate(p.x + ox * s, baseY + oy * s - s * 0.26);
        ctx.rotate(rot);
        const hl = len * s * 0.5;
        ctx.fillStyle = shade(PALI_LOG, tone);
        ctx.fillRect(-hl, -s * 0.045, hl * 2, s * 0.09);
        ctx.fillStyle = shade(PALI_LOG, tone + 12);
        ctx.fillRect(-hl, -s * 0.045, hl * 2, s * 0.028);
        // Point facets both ends.
        for (const sgn of [-1, 1]) {
          ctx.fillStyle = shade(PALI_LOG, tone + 30);
          ctx.beginPath();
          ctx.moveTo(sgn * hl, -s * 0.045);
          ctx.lineTo(sgn * (hl + s * 0.16), 0);
          ctx.lineTo(sgn * hl, 0);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = shade(PALI_LOG, tone - 14);
          ctx.beginPath();
          ctx.moveTo(sgn * hl, 0);
          ctx.lineTo(sgn * (hl + s * 0.16), 0);
          ctx.lineTo(sgn * hl, s * 0.045);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      };
      // Rear rank (offset up-screen, dimmer), then the front X.
      stake(-0.62, -16, 0.14, -0.12, 0.78);
      stake(0.66, -20, 0.18, -0.12, 0.74);
      stake(-0.58, 0, -0.06, 0, 0.92);
      stake(0.6, -6, -0.02, 0, 0.9);
      // The carrying beam rides just above the crossing,
      // rope-lashed where it meets the X.
      ctx.fillStyle = shade(PALI_LOG, -10);
      ctx.fillRect(p.x - s * 0.5, baseY - s * 0.32, s, s * 0.07);
      ctx.fillStyle = shade(PALI_LOG, 2);
      ctx.fillRect(p.x - s * 0.5, baseY - s * 0.32, s, s * 0.022);
      ctx.fillStyle = PALI_ROPE;
      ctx.fillRect(p.x - s * 0.1, baseY - s * 0.36, s * 0.07, s * 0.14);
      ctx.fillRect(p.x + s * 0.04, baseY - s * 0.34, s * 0.07, s * 0.12);
      ctx.fillStyle = PALI_ROPE_DARK;
      ctx.fillRect(p.x - s * 0.08, baseY - s * 0.32, s * 0.03, s * 0.1);
    },
  };
}

function paintMeatSpit(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.24;
  const barY = baseY - s * 0.66;
  return {
    sortY: ty + 0.72,
    body: stationBody(0.8, 1.3, 0.5),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.03, s * 0.5, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // The coal bed pulses low and mean under the meat.
      ctx.fillStyle = '#2c2430';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.03, s * 0.3, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const pulse = 0.4 + Math.sin(t * 3.4 + i * 2.2 + h) * 0.4;
        ctx.fillStyle = `rgba(240, 130, 50, ${0.35 + pulse * 0.45})`;
        ctx.beginPath();
        facetCircle(ctx, p.x + (i - 1) * s * 0.12, baseY - s * 0.04, s * 0.05, 5, i, 0.6);
        ctx.fill();
      }
      // Two Y-forked stakes carry the spit rod.
      for (const sgn of [-1, 1]) {
        const fx = p.x + sgn * s * 0.42;
        ctx.fillStyle = shade(PALI_LOG, sgn < 0 ? 0 : -8);
        ctx.beginPath();
        ctx.moveTo(fx - s * 0.035, baseY);
        ctx.lineTo(fx + s * 0.035, baseY);
        ctx.lineTo(fx + s * 0.025, barY - s * 0.03);
        ctx.lineTo(fx - s * 0.025, barY - s * 0.03);
        ctx.closePath();
        ctx.fill();
        // The fork tines.
        ctx.beginPath();
        ctx.moveTo(fx - s * 0.02, barY);
        ctx.lineTo(fx - s * 0.085, barY - s * 0.16);
        ctx.lineTo(fx - s * 0.045, barY - s * 0.17);
        ctx.lineTo(fx, barY - s * 0.04);
        ctx.lineTo(fx + s * 0.045, barY - s * 0.17);
        ctx.lineTo(fx + s * 0.085, barY - s * 0.16);
        ctx.lineTo(fx + s * 0.02, barY);
        ctx.closePath();
        ctx.fill();
      }
      // The spit rod, hand-carved, one lit edge.
      ctx.fillStyle = shade(PALI_LOG, -14);
      ctx.fillRect(p.x - s * 0.56, barY - s * 0.045, s * 1.12, s * 0.045);
      ctx.fillStyle = shade(PALI_LOG, 6);
      ctx.fillRect(p.x - s * 0.56, barY - s * 0.045, s * 1.12, s * 0.015);
      // THE HAUNCH TURNS: the roast rides the spit on a slow
      // clock — its profile squashes as it rolls and the fat
      // side wheels around the meat (the rotisserie read).
      const spin = t * 0.9 + h * 0.3;
      const roll = Math.sin(spin);
      const face = Math.cos(spin);
      const my = barY + s * 0.16;
      const mw = s * 0.3;
      const mh = s * 0.19 * (0.82 + Math.abs(face) * 0.18);
      ctx.save();
      ctx.translate(p.x - s * 0.05, my);
      ctx.rotate(roll * 0.08);
      // The meat body, seared darker each pass.
      ctx.fillStyle = '#8a4130';
      ctx.beginPath();
      ctx.ellipse(0, 0, mw, mh, 0, 0, Math.PI * 2);
      ctx.fill();
      // The fat cap wheels: its lit band rides the roll.
      ctx.fillStyle = '#e8d9b8';
      ctx.beginPath();
      ctx.ellipse(mw * 0.1, -mh * 0.5 * face, mw * 0.82, mh * 0.38, roll * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a3543a';
      ctx.beginPath();
      ctx.ellipse(-mw * 0.12, mh * 0.3, mw * 0.6, mh * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      // The shank bone rides out one end, knuckle and all.
      ctx.fillStyle = PALI_BONE;
      ctx.fillRect(mw * 0.86, -s * 0.026, s * 0.16, s * 0.052);
      ctx.beginPath();
      facetCircle(ctx, mw * 0.86 + s * 0.17, 0, s * 0.045, 5, 0.4, 0.8);
      ctx.fill();
      ctx.restore();
      // Fat drips flare on the coals below.
      const dp = (t * 0.7 + h * 0.17) % 1;
      if (dp < 0.12) {
        ctx.fillStyle = `rgba(255, 214, 120, ${0.85 - dp * 6})`;
        ctx.fillRect(p.x - s * 0.05, baseY - s * 0.1, s * 0.035, s * 0.05);
      }
      // Thin cook-smoke keeps the kitchen honest.
      const sp = (t * 0.32 + h * 0.13) % 1;
      ctx.fillStyle = `rgba(146, 140, 152, ${(1 - sp) * 0.18})`;
      ctx.beginPath();
      facetCircle(ctx, p.x + sp * s * 0.1, barY - s * 0.24 - sp * s * 0.35, s * (0.045 + sp * 0.05), 6, sp * 2, 0.8);
      ctx.fill();
    },
  };
}

function paintMeatRack(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.24;
  const barY = baseY - s * 1.06;
  return {
    sortY: ty + 0.72,
    body: stationBody(0.8, 1.6, 0.5),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.03, s * 0.5, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // Two lashed posts and the hook bar.
      for (const sgn of [-1, 1]) {
        const fx = p.x + sgn * s * 0.44;
        ctx.fillStyle = shade(PALI_LOG, sgn < 0 ? 2 : -8);
        ctx.beginPath();
        ctx.moveTo(fx - s * 0.038, baseY);
        ctx.lineTo(fx + s * 0.038, baseY);
        ctx.lineTo(fx + s * 0.028, barY - s * 0.06);
        ctx.lineTo(fx - s * 0.028, barY - s * 0.06);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = PALI_ROPE;
        ctx.fillRect(fx - s * 0.04, barY - s * 0.01, s * 0.08, s * 0.05);
      }
      ctx.fillStyle = shade(PALI_LOG, -12);
      ctx.fillRect(p.x - s * 0.56, barY - s * 0.05, s * 1.12, s * 0.055);
      ctx.fillStyle = shade(PALI_LOG, 6);
      ctx.fillRect(p.x - s * 0.56, barY - s * 0.05, s * 1.12, s * 0.018);
      // THE LARDER SWAYS: every cut hangs on its own iron curl
      // and answers the breeze a half-beat apart — the camp's
      // supper is never quite still.
      const { sway, lag } = rend.breezeAt(tx, ty, t, tx * 2.1 + ty * 0.7, s, 0.03, 0.045);
      const hook = (ox: number) => {
        ctx.fillStyle = '#3a3444';
        ctx.fillRect(p.x + ox * s - s * 0.012, barY, s * 0.024, s * 0.07);
      };
      // A heavy flank cut: dark meat, fat streaks, rind edge.
      const flank = (ox: number, drop: number, w: number, dh: number, ph: number) => {
        hook(ox);
        const sx = p.x + ox * s + sway * ph;
        const sy2 = barY + s * 0.07;
        ctx.save();
        ctx.translate(sx, sy2);
        ctx.rotate((sway * ph * 0.5 + lag * ph * 0.3) / s);
        ctx.fillStyle = '#7c3a2c';
        ctx.beginPath();
        ctx.moveTo(-w * s * 0.4, 0);
        ctx.lineTo(w * s * 0.4, 0);
        ctx.lineTo(w * s * 0.5, dh * s * 0.55);
        ctx.quadraticCurveTo(w * s * 0.1, dh * s * (1 + drop * 0.1), -w * s * 0.42, dh * s * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#a3543a';
        ctx.beginPath();
        ctx.moveTo(-w * s * 0.28, dh * s * 0.12);
        ctx.lineTo(w * s * 0.3, dh * s * 0.16);
        ctx.lineTo(w * s * 0.34, dh * s * 0.44);
        ctx.lineTo(-w * s * 0.3, dh * s * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#e8d9b8';
        ctx.fillRect(-w * s * 0.4, 0, w * s * 0.8, s * 0.035);
        ctx.restore();
      };
      flank(-0.34, 1, 0.42, 0.52, 1);
      flank(0.3, 0.6, 0.36, 0.44, 1.5);
      // The sausage string: five links on a twine loop.
      hook(0.02);
      const lx = p.x + s * 0.02 + sway * 0.7;
      ctx.strokeStyle = PALI_ROPE_DARK;
      ctx.lineWidth = Math.max(1, s * 0.018);
      ctx.beginPath();
      ctx.moveTo(p.x + s * 0.02, barY + s * 0.06);
      ctx.quadraticCurveTo(lx - s * 0.02, barY + s * 0.2, lx, barY + s * 0.34);
      ctx.stroke();
      ctx.fillStyle = '#8a4a3a';
      for (let i = 0; i < 5; i++) {
        const ly = barY + s * (0.12 + i * 0.09);
        ctx.beginPath();
        ctx.ellipse(lx + Math.sin(i * 2.1) * s * 0.014, ly, s * 0.035, s * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // One thin drying strip twists at the east end.
      hook(0.46);
      ctx.fillStyle = '#96503c';
      ctx.beginPath();
      ctx.moveTo(p.x + s * 0.44, barY + s * 0.07);
      ctx.lineTo(p.x + s * 0.5, barY + s * 0.07);
      ctx.lineTo(p.x + s * 0.49 + sway * 1.2, barY + s * 0.5 + Math.abs(lag) * 0.4);
      ctx.lineTo(p.x + s * 0.45 + sway * 1.2, barY + s * 0.48 + Math.abs(lag) * 0.4);
      ctx.closePath();
      ctx.fill();
    },
  };
}

function paintCookPot(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.24;
  const apexY = baseY - s * 1.16;
  const potY = baseY - s * 0.5;
  return {
    sortY: ty + 0.72,
    body: stationBody(0.75, 1.6, 0.5),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.03, s * 0.44, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // Coals under the pot.
      ctx.fillStyle = '#2c2430';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.02, s * 0.26, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const pulse = 0.4 + Math.sin(t * 3.1 + i * 2 + h) * 0.4;
        ctx.fillStyle = `rgba(240, 130, 50, ${0.3 + pulse * 0.4})`;
        ctx.beginPath();
        facetCircle(ctx, p.x + (i - 1) * s * 0.1, baseY - s * 0.03, s * 0.045, 5, i, 0.6);
        ctx.fill();
      }
      // The wood tripod, legs planted wide.
      for (const [ox, oy] of [
        [-0.4, 0.04],
        [0.4, 0.04],
        [0.05, -0.16],
      ] as const) {
        ctx.fillStyle = shade(PALI_LOG, oy < 0 ? -14 : ox < 0 ? 0 : -8);
        ctx.beginPath();
        ctx.moveTo(p.x + ox * s - s * 0.03, baseY + oy * syT);
        ctx.lineTo(p.x + ox * s + s * 0.03, baseY + oy * syT);
        ctx.lineTo(p.x + ox * s * 0.1 + s * 0.022, apexY);
        ctx.lineTo(p.x + ox * s * 0.1 - s * 0.022, apexY);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = PALI_ROPE;
      ctx.fillRect(p.x - s * 0.06, apexY - s * 0.01, s * 0.12, s * 0.05);
      // Chain to the bail.
      ctx.fillStyle = '#3a3444';
      for (let i = 0; i < 2; i++) {
        ctx.fillRect(p.x - s * 0.014, apexY + s * 0.05 + i * s * 0.07, s * 0.028, s * 0.05);
      }
      // The pot: a fat-bellied blackened kettle. The bird's eye
      // sees INTO it (the basket law): a dark mouth ring and the
      // gruel's surface riding inside the rim.
      const pw = s * 0.3;
      ctx.fillStyle = '#2c2836';
      ctx.beginPath();
      ctx.ellipse(p.x, potY + s * 0.1, pw, s * 0.21, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade('#2c2836', 12);
      ctx.beginPath();
      ctx.ellipse(p.x - pw * 0.4, potY + s * 0.08, pw * 0.28, s * 0.15, -0.2, 0, Math.PI * 2);
      ctx.fill();
      // Bail arms up to the chain.
      ctx.strokeStyle = '#3a3444';
      ctx.lineWidth = Math.max(1, s * 0.026);
      ctx.beginPath();
      ctx.moveTo(p.x - pw * 0.85, potY + s * 0.02);
      ctx.quadraticCurveTo(p.x, potY - s * 0.18, p.x + pw * 0.85, potY + s * 0.02);
      ctx.stroke();
      // The mouth: rim, then the stew.
      ctx.fillStyle = '#1c1526';
      ctx.beginPath();
      ctx.ellipse(p.x, potY - s * 0.02, pw * 0.86, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5d7a42';
      ctx.beginPath();
      ctx.ellipse(p.x, potY - s * 0.01, pw * 0.72, s * 0.078, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE BOIL: bubbles swell and pop on their own clocks.
      for (let i = 0; i < 3; i++) {
        const bp = (t * (0.7 + i * 0.23) + h * 0.11 + i * 0.4) % 1;
        const br = s * 0.028 * (bp < 0.85 ? bp : (1 - bp) * 5.6);
        if (br > 0.5) {
          ctx.fillStyle = shade('#5d7a42', 18);
          ctx.beginPath();
          ctx.ellipse(
            p.x + Math.sin(i * 2.7 + h) * pw * 0.45,
            potY - s * 0.01 + Math.cos(i * 1.9) * s * 0.03,
            br,
            br * 0.7,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
      // The ladle waits against the rim.
      ctx.fillStyle = shade(PALI_LOG, 4);
      ctx.save();
      ctx.translate(p.x + pw * 0.7, potY - s * 0.06);
      ctx.rotate(0.5);
      ctx.fillRect(-s * 0.015, -s * 0.3, s * 0.03, s * 0.32);
      ctx.beginPath();
      facetCircle(ctx, 0, s * 0.045, s * 0.05, 6, 0.3, 0.7);
      ctx.fill();
      ctx.restore();
      // Steam: one pale puff climbing off the boil.
      const sp = (t * 0.36 + h * 0.09) % 1;
      ctx.fillStyle = `rgba(210, 214, 222, ${(1 - sp) * 0.2})`;
      ctx.beginPath();
      facetCircle(ctx, p.x + Math.sin(t * 0.9 + h) * s * 0.05, potY - s * 0.2 - sp * s * 0.4, s * (0.05 + sp * 0.06), 6, sp * 2, 0.8);
      ctx.fill();
    },
  };
}

function paintPotionRack(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.32;
  const hw = s * 0.44;
  return {
    sortY: ty + 0.72,
    body: stationBody(0.7, 1.5, 0.5),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.03, hw * 1.1, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      // A crooked two-shelf rack: the posts lean, the shelves
      // sag — goblin joinery, honest about it.
      const leanK = 0.05;
      const post = (sgn: number, tone: number) => {
        const bx = p.x + sgn * hw;
        ctx.fillStyle = shade(PALI_LOG, tone);
        ctx.beginPath();
        ctx.moveTo(bx - s * 0.035, baseY);
        ctx.lineTo(bx + s * 0.035, baseY);
        ctx.lineTo(bx + s * 0.028 - sgn * leanK * s, baseY - s * 1.02);
        ctx.lineTo(bx - s * 0.028 - sgn * leanK * s, baseY - s * 1.02);
        ctx.closePath();
        ctx.fill();
      };
      post(-1, 2);
      post(1, -8);
      const shelf = (sy2: number, sag: number) => {
        ctx.fillStyle = shade(PALI_LOG, -6);
        ctx.beginPath();
        ctx.moveTo(p.x - hw - s * 0.02, sy2);
        ctx.quadraticCurveTo(p.x, sy2 + sag * s, p.x + hw + s * 0.02, sy2);
        ctx.lineTo(p.x + hw + s * 0.02, sy2 + s * 0.06);
        ctx.quadraticCurveTo(p.x, sy2 + sag * s + s * 0.06, p.x - hw - s * 0.02, sy2 + s * 0.06);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(PALI_LOG, 12);
        ctx.beginPath();
        ctx.moveTo(p.x - hw - s * 0.02, sy2);
        ctx.quadraticCurveTo(p.x, sy2 + sag * s, p.x + hw + s * 0.02, sy2);
        ctx.lineTo(p.x + hw + s * 0.02, sy2 + s * 0.018);
        ctx.quadraticCurveTo(p.x, sy2 + sag * s + s * 0.018, p.x - hw - s * 0.02, sy2 + s * 0.018);
        ctx.closePath();
        ctx.fill();
      };
      const topShelfY = baseY - s * 0.92;
      const lowShelfY = baseY - s * 0.44;
      shelf(lowShelfY, 0.03);
      shelf(topShelfY, 0.045);
      // THE STOCK: every vessel keeps the potion silhouette law
      // — round flask, slim vial, gourd, stoneware jug, horn.
      // Glass carries its brew color; a glint sweeps one bottle.
      const glintPh = (t * 0.22 + h * 0.07) % 1;
      // Top shelf: round flask (green), slim vial (violet),
      // strapped gourd (amber).
      ctx.fillStyle = '#4a8a5e';
      ctx.beginPath();
      facetCircle(ctx, p.x - hw * 0.55, topShelfY - s * 0.09, s * 0.075, 7, 0.3, 0.8);
      ctx.fill();
      ctx.fillStyle = shade('#4a8a5e', -16);
      ctx.fillRect(p.x - hw * 0.55 - s * 0.022, topShelfY - s * 0.22, s * 0.044, s * 0.07);
      ctx.fillStyle = '#8a6f3e';
      ctx.fillRect(p.x - hw * 0.55 - s * 0.016, topShelfY - s * 0.25, s * 0.032, s * 0.03);
      ctx.fillStyle = '#7a5c9e';
      ctx.fillRect(p.x - hw * 0.06, topShelfY - s * 0.26, s * 0.05, s * 0.24);
      ctx.fillStyle = shade('#7a5c9e', 20);
      ctx.fillRect(p.x - hw * 0.06, topShelfY - s * 0.26, s * 0.016, s * 0.24);
      ctx.fillStyle = '#b8862e';
      ctx.beginPath();
      ctx.ellipse(p.x + hw * 0.5, topShelfY - s * 0.1, s * 0.07, s * 0.095, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALI_ROPE_DARK;
      ctx.fillRect(p.x + hw * 0.5 - s * 0.07, topShelfY - s * 0.115, s * 0.14, s * 0.022);
      ctx.fillStyle = shade(PALI_LOG, -4);
      ctx.fillRect(p.x + hw * 0.5 - s * 0.014, topShelfY - s * 0.22, s * 0.028, s * 0.05);
      // Low shelf: stoneware jug (glaze dip) + stoppered horn.
      ctx.fillStyle = '#a89a8a';
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.5 - s * 0.06, lowShelfY);
      ctx.lineTo(p.x - hw * 0.5 - s * 0.05, lowShelfY - s * 0.2);
      ctx.lineTo(p.x - hw * 0.5 + s * 0.05, lowShelfY - s * 0.2);
      ctx.lineTo(p.x - hw * 0.5 + s * 0.06, lowShelfY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#5d4a7a';
      ctx.fillRect(p.x - hw * 0.5 - s * 0.05, lowShelfY - s * 0.2, s * 0.1, s * 0.07);
      ctx.fillStyle = shade('#a89a8a', -14);
      ctx.fillRect(p.x - hw * 0.5 - s * 0.02, lowShelfY - s * 0.24, s * 0.04, s * 0.04);
      // The horn: a curved drinking horn re-purposed, wax seal.
      ctx.fillStyle = '#ddd6c2';
      ctx.beginPath();
      ctx.moveTo(p.x + hw * 0.24, lowShelfY);
      ctx.quadraticCurveTo(p.x + hw * 0.3, lowShelfY - s * 0.22, p.x + hw * 0.62, lowShelfY - s * 0.26);
      ctx.quadraticCurveTo(p.x + hw * 0.44, lowShelfY - s * 0.12, p.x + hw * 0.4, lowShelfY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#8a3b34';
      ctx.beginPath();
      facetCircle(ctx, p.x + hw * 0.62, lowShelfY - s * 0.26, s * 0.03, 5, 0.2, 0.7);
      ctx.fill();
      // The glint: one hard spark walks the glassware.
      if (glintPh < 0.08) {
        ctx.fillStyle = `rgba(255, 255, 240, ${0.8 - glintPh * 9})`;
        ctx.fillRect(p.x - hw * 0.06 + s * 0.004, topShelfY - s * 0.24, s * 0.02, s * 0.05);
      } else if (glintPh > 0.5 && glintPh < 0.58) {
        ctx.fillStyle = `rgba(255, 255, 240, ${0.8 - (glintPh - 0.5) * 9})`;
        ctx.fillRect(p.x - hw * 0.55 - s * 0.03, topShelfY - s * 0.13, s * 0.02, s * 0.045);
      }
      // A dried herb bundle hangs off the west post; something
      // dark has dripped below the low shelf and stained the leg.
      ctx.fillStyle = '#5d6e42';
      ctx.beginPath();
      ctx.moveTo(p.x - hw - s * 0.02, baseY - s * 0.78);
      ctx.lineTo(p.x - hw + s * 0.045, baseY - s * 0.78);
      ctx.lineTo(p.x - hw + s * 0.06, baseY - s * 0.6);
      ctx.lineTo(p.x - hw - s * 0.045, baseY - s * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALI_ROPE_DARK;
      ctx.fillRect(p.x - hw - s * 0.014, baseY - s * 0.8, s * 0.05, s * 0.024);
      ctx.fillStyle = 'rgba(46, 58, 38, 0.5)';
      ctx.fillRect(p.x + hw * 0.28, lowShelfY + s * 0.06, s * 0.035, s * 0.16);
    },
  };
}

function paintBeastNest(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  return {
    sortY: ty + 0.62,
    body: stationBody(0.8, 0.8, 0.55),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // The trampled ring: straw and shed fur wound into a bed,
      // the hollow worn dark where the beast circles and drops.
      ctx.fillStyle = '#8a7444';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.06, s * 0.52, s * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6e5c38';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.04, s * 0.38, s * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4e4230';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.02, s * 0.26, s * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      // Straw wisps break the rim silhouette all the way round.
      ctx.fillStyle = '#a5834f';
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + ((h >> i) & 3) * 0.1;
        const rx = p.x + Math.cos(a) * s * 0.5;
        const ry = baseY - s * 0.06 + Math.sin(a) * s * 0.28;
        ctx.save();
        ctx.translate(rx, ry);
        ctx.rotate(a + Math.PI / 2 + (((h >> i) & 1) - 0.5) * 0.5);
        ctx.fillRect(-s * 0.012, -s * 0.09, s * 0.024, s * 0.1);
        ctx.restore();
      }
      // Shed fur: grey tufts matted into the weave.
      ctx.fillStyle = '#8a8794';
      for (const [ox, oy] of [
        [-0.3, -0.12],
        [0.24, -0.02],
        [-0.05, -0.22],
      ] as const) {
        ctx.beginPath();
        facetCircle(ctx, p.x + ox * s, baseY + oy * s, s * 0.055, 6, ox * 7, 0.65);
        ctx.fill();
      }
      // The larder: a gnawed rib arc and one knuckled long bone.
      ctx.fillStyle = shade(PALI_BONE, -6);
      ctx.save();
      ctx.translate(p.x + s * 0.1, baseY - s * 0.05);
      ctx.rotate(-0.3);
      ctx.fillRect(-s * 0.16, -s * 0.025, s * 0.32, s * 0.05);
      ctx.beginPath();
      facetCircle(ctx, s * 0.18, 0, s * 0.04, 5, 0.3, 0.8);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = shade(PALI_BONE, -14);
      ctx.lineWidth = Math.max(1, s * 0.03);
      ctx.beginPath();
      ctx.arc(p.x - s * 0.16, baseY - s * 0.02, s * 0.12, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    },
  };
}

function paintPlunderSacks(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.3;
  const SACK = '#9c8a62';
  return {
    sortY: ty + 0.68,
    body: stationBody(0.75, 1.1, 0.5),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, s * 0.5, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // Two full sacks leaning together, rope-necked, patched.
      const sack = (ox: number, w: number, hgt: number, leanR: number, tone: number) => {
        const sx = p.x + ox * s;
        ctx.save();
        ctx.translate(sx, baseY);
        ctx.rotate(leanR);
        ctx.fillStyle = shade(SACK, tone);
        ctx.beginPath();
        ctx.moveTo(-w * s * 0.5, 0);
        ctx.quadraticCurveTo(-w * s * 0.58, -hgt * s * 0.55, -w * s * 0.24, -hgt * s * 0.86);
        ctx.lineTo(-w * s * 0.14, -hgt * s);
        ctx.lineTo(w * s * 0.14, -hgt * s);
        ctx.lineTo(w * s * 0.24, -hgt * s * 0.86);
        ctx.quadraticCurveTo(w * s * 0.58, -hgt * s * 0.55, w * s * 0.5, 0);
        ctx.closePath();
        ctx.fill();
        // The cinched neck flops over; rope tie below it.
        ctx.fillStyle = shade(SACK, tone - 12);
        ctx.beginPath();
        ctx.moveTo(-w * s * 0.14, -hgt * s);
        ctx.quadraticCurveTo(0, -hgt * s * 1.12, w * s * 0.2, -hgt * s * 1.02);
        ctx.lineTo(w * s * 0.14, -hgt * s * 0.92);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = PALI_ROPE;
        ctx.fillRect(-w * s * 0.17, -hgt * s * 0.92, w * s * 0.34, s * 0.035);
        // The bulge: one lit belly plane says FULL.
        ctx.fillStyle = shade(SACK, tone + 12);
        ctx.beginPath();
        ctx.ellipse(-w * s * 0.16, -hgt * s * 0.4, w * s * 0.2, hgt * s * 0.28, -0.2, 0, Math.PI * 2);
        ctx.fill();
        // A stitched patch.
        ctx.fillStyle = shade(SACK, tone - 8);
        ctx.fillRect(w * s * 0.06, -hgt * s * 0.5, w * s * 0.22, hgt * s * 0.18);
        ctx.restore();
      };
      sack(-0.22, 0.5, 0.72, -0.07, 0);
      sack(0.2, 0.44, 0.62, 0.1, -10);
      // The third sack tipped and spilling: the raiders count
      // nothing twice. Coins scatter toward the camera.
      ctx.fillStyle = shade(SACK, -4);
      ctx.beginPath();
      ctx.ellipse(p.x + s * 0.34, baseY - s * 0.1, s * 0.2, s * 0.13, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1c1526';
      ctx.beginPath();
      ctx.ellipse(p.x + s * 0.46, baseY - s * 0.02, s * 0.055, s * 0.038, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c9962e';
      for (let i = 0; i < 6; i++) {
        const a = ((h >> (i * 2)) & 7) / 7;
        const cx2 = p.x + s * (0.3 + a * 0.3);
        const cy2 = baseY + s * (0.02 + (i % 3) * 0.035);
        ctx.beginPath();
        ctx.ellipse(cx2, cy2, s * 0.028, s * 0.02, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#e0b84f';
      ctx.beginPath();
      ctx.ellipse(p.x + s * 0.38, baseY + s * 0.03, s * 0.028, s * 0.02, 0, 0, Math.PI * 2);
      ctx.fill();
      // One looted candlestick jams out of the near sack.
      ctx.fillStyle = '#b8963a';
      ctx.fillRect(p.x - s * 0.34, baseY - s * 0.78, s * 0.032, s * 0.18);
      ctx.beginPath();
      facetCircle(ctx, p.x - s * 0.324, baseY - s * 0.8, s * 0.035, 5, 0.3, 0.7);
      ctx.fill();
    },
  };
}

function paintSpearRack(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.3;
  const apexY = baseY - s * 1.24;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.75, 1.8, 0.5),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, s * 0.48, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // The stacked spears: four shafts leaned into a pyramid,
      // heads crossing above the lash point.
      for (const [ox, oy, tone] of [
        [-0.36, 0.02, -12],
        [0.38, 0, -6],
        [-0.3, -0.1, 0],
        [0.28, -0.08, -16],
      ] as const) {
        const bx = p.x + ox * s;
        const by = baseY + oy * syT;
        const hx = p.x + ox * s * 0.08;
        ctx.fillStyle = shade(PALI_LOG, tone + 6);
        ctx.beginPath();
        ctx.moveTo(bx - s * 0.024, by);
        ctx.lineTo(bx + s * 0.024, by);
        ctx.lineTo(hx + s * 0.018, apexY);
        ctx.lineTo(hx - s * 0.018, apexY);
        ctx.closePath();
        ctx.fill();
        // Heads: leaf blades past the crossing, one lit facet.
        const hy = apexY - s * 0.04;
        ctx.fillStyle = '#8b93a4';
        ctx.beginPath();
        ctx.moveTo(hx - s * 0.038, hy);
        ctx.lineTo(hx + ox * 0.14 * s, hy - s * 0.16);
        ctx.lineTo(hx + s * 0.038, hy);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#aeb6c6';
        ctx.beginPath();
        ctx.moveTo(hx - s * 0.038, hy);
        ctx.lineTo(hx + ox * 0.14 * s, hy - s * 0.16);
        ctx.lineTo(hx + ox * 0.05 * s, hy);
        ctx.closePath();
        ctx.fill();
      }
      // The lash binding the stack.
      ctx.fillStyle = PALI_ROPE;
      ctx.fillRect(p.x - s * 0.07, apexY + s * 0.02, s * 0.14, s * 0.055);
      ctx.fillStyle = PALI_ROPE_DARK;
      ctx.fillRect(p.x - s * 0.07, apexY + s * 0.075, s * 0.14, s * 0.02);
      // The chief's shield rests against the stack: a hide-face
      // round with a bone boss and a bitten rim — it has WORKED.
      const shX = p.x + s * 0.24;
      const shY = baseY - s * 0.3;
      const shR = s * 0.26;
      ctx.fillStyle = '#7a5c3e';
      ctx.beginPath();
      facetCircle(ctx, shX, shY, shR, 8, 0.4, 0.85);
      ctx.fill();
      // The notch: a bite taken out of the rim, dark wedge.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.9)';
      ctx.beginPath();
      ctx.moveTo(shX + shR * 0.55, shY - shR * 0.75);
      ctx.lineTo(shX + shR * 0.95, shY - shR * 0.45);
      ctx.lineTo(shX + shR * 0.55, shY - shR * 0.35);
      ctx.closePath();
      ctx.fill();
      // Painted war-ring and the bone boss.
      ctx.strokeStyle = '#8a3b34';
      ctx.lineWidth = Math.max(1, s * 0.035);
      ctx.beginPath();
      ctx.arc(shX, shY, shR * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PALI_BONE;
      ctx.beginPath();
      facetCircle(ctx, shX, shY, shR * 0.24, 6, 0.2, 0.8);
      ctx.fill();
      ctx.fillStyle = shade(PALI_BONE, 16);
      ctx.beginPath();
      facetCircle(ctx, shX - shR * 0.06, shY - shR * 0.06, shR * 0.12, 5, 0.2, 0.8);
      ctx.fill();
    },
  };
}

function paintTargetDummy(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  const STRAW = '#c9b684';
  const postTop = baseY - s * 1.3;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.7, 1.9, 0.45),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - s * 0.06, baseY, p.x + s * 0.06, baseY, 1.25);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.015, s * 0.16, s * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
      // Post + crossarm, the training yard's gallows-frame.
      ctx.fillStyle = shade(PALI_LOG, -6);
      ctx.fillRect(p.x - s * 0.045, postTop, s * 0.09, baseY - postTop);
      ctx.fillStyle = shade(PALI_LOG, 8);
      ctx.fillRect(p.x - s * 0.035, postTop, s * 0.022, baseY - postTop);
      ctx.fillStyle = shade(PALI_LOG, -12);
      ctx.fillRect(p.x - s * 0.34, baseY - s * 0.92, s * 0.68, s * 0.055);
      // Straw arms bound off the crossbar ends.
      ctx.fillStyle = STRAW;
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(p.x + sgn * s * 0.3, baseY - s * 0.91);
        ctx.lineTo(p.x + sgn * s * 0.44, baseY - s * 0.88);
        ctx.lineTo(p.x + sgn * s * 0.42, baseY - s * 0.82);
        ctx.lineTo(p.x + sgn * s * 0.3, baseY - s * 0.86);
        ctx.closePath();
        ctx.fill();
      }
      // The body: a stuffed sack chest cinched at the waist,
      // straw bursting at every seam it has already lost.
      ctx.fillStyle = '#b09c70';
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.26, baseY - s * 0.94);
      ctx.quadraticCurveTo(p.x - s * 0.32, baseY - s * 0.6, p.x - s * 0.2, baseY - s * 0.36);
      ctx.lineTo(p.x + s * 0.2, baseY - s * 0.36);
      ctx.quadraticCurveTo(p.x + s * 0.32, baseY - s * 0.6, p.x + s * 0.26, baseY - s * 0.94);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade('#b09c70', 12);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.26, baseY - s * 0.94);
      ctx.quadraticCurveTo(p.x - s * 0.32, baseY - s * 0.6, p.x - s * 0.2, baseY - s * 0.36);
      ctx.lineTo(p.x - s * 0.1, baseY - s * 0.36);
      ctx.quadraticCurveTo(p.x - s * 0.2, baseY - s * 0.62, p.x - s * 0.14, baseY - s * 0.94);
      ctx.closePath();
      ctx.fill();
      // Rope cinch + straw skirt below the waist.
      ctx.fillStyle = PALI_ROPE;
      ctx.fillRect(p.x - s * 0.21, baseY - s * 0.4, s * 0.42, s * 0.04);
      ctx.fillStyle = STRAW;
      for (let i = 0; i < 5; i++) {
        const fx = p.x + (i - 2) * s * 0.08;
        ctx.beginPath();
        ctx.moveTo(fx - s * 0.03, baseY - s * 0.36);
        ctx.lineTo(fx + s * 0.03, baseY - s * 0.36);
        ctx.lineTo(fx + ((h >> i) & 1 ? 0.02 : -0.015) * s, baseY - s * (0.16 - (i % 2) * 0.04));
        ctx.closePath();
        ctx.fill();
      }
      // THE TARGET: two painted rings, weathered thin — count
      // the rings, swing again.
      ctx.strokeStyle = '#8a3b34';
      ctx.lineWidth = Math.max(1, s * 0.035);
      ctx.beginPath();
      ctx.arc(p.x, baseY - s * 0.64, s * 0.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#b8862e';
      ctx.beginPath();
      ctx.arc(p.x, baseY - s * 0.64, s * 0.075, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#8a3b34';
      ctx.beginPath();
      facetCircle(ctx, p.x, baseY - s * 0.64, s * 0.028, 5, 0.3, 0.8);
      ctx.fill();
      // The sack head: knotted crown, one painted eye — the
      // other wore off a hundred swings ago.
      const hy = baseY - s * 1.12;
      ctx.fillStyle = '#b09c70';
      ctx.beginPath();
      facetCircle(ctx, p.x, hy, s * 0.14, 7, 0.3, 0.85);
      ctx.fill();
      ctx.fillStyle = shade('#b09c70', -14);
      ctx.fillRect(p.x - s * 0.03, hy - s * 0.2, s * 0.06, s * 0.07);
      ctx.fillStyle = PALI_ROPE_DARK;
      ctx.fillRect(p.x - s * 0.05, hy - s * 0.145, s * 0.1, s * 0.028);
      ctx.fillStyle = '#241a2e';
      ctx.fillRect(p.x - s * 0.065, hy - s * 0.03, s * 0.05, s * 0.014);
      ctx.fillRect(p.x - s * 0.048, hy - s * 0.048, s * 0.014, s * 0.05);
      // Arrows that found their mark and stayed: shaft, angled
      // bite, feather fletch.
      const arrow = (ax: number, ay: number, rot: number) => {
        ctx.save();
        ctx.translate(p.x + ax * s, baseY - ay * s);
        ctx.rotate(rot);
        ctx.fillStyle = '#8a6534';
        ctx.fillRect(0, -s * 0.014, s * 0.3, s * 0.028);
        ctx.fillStyle = '#ddd6c2';
        ctx.beginPath();
        ctx.moveTo(s * 0.22, -s * 0.014);
        ctx.lineTo(s * 0.3, -s * 0.05);
        ctx.lineTo(s * 0.3, s * 0.05);
        ctx.lineTo(s * 0.22, s * 0.014);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };
      if (((h >> 2) & 1) === 1) arrow(0.1, 0.7, -0.5);
      arrow(-0.05, 0.58, 0.35 + ((h >> 4) & 3) * 0.1);
    },
  };
}

function paintWarDrum(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.3;
  const dw = s * 0.36;
  const topY = baseY - s * 0.72;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.7, 1.2, 0.5),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.03, dw * 1.25, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // Three stub feet keep the shell off the mud.
      ctx.fillStyle = shade(PALI_LOG, -16);
      for (const ox of [-0.7, 0, 0.7]) {
        ctx.fillRect(p.x + ox * dw - s * 0.03, baseY - s * 0.06, s * 0.06, s * 0.09);
      }
      // The shell: a hide-wrapped barrel, X-laced — the lacing
      // is the drum's muscle, zigzagging shadow and light.
      ctx.fillStyle = '#7a5636';
      ctx.fillRect(p.x - dw, topY + s * 0.1, dw * 2, baseY - topY - s * 0.14);
      ctx.fillStyle = shade('#7a5636', 12);
      ctx.fillRect(p.x - dw, topY + s * 0.1, s * 0.06, baseY - topY - s * 0.14);
      ctx.fillStyle = shade('#7a5636', -14);
      ctx.fillRect(p.x + dw - s * 0.06, topY + s * 0.1, s * 0.06, baseY - topY - s * 0.14);
      ctx.strokeStyle = PALI_ROPE_DARK;
      ctx.lineWidth = Math.max(1, s * 0.026);
      ctx.beginPath();
      const segs2 = 5;
      for (let i = 0; i < segs2; i++) {
        const x0 = p.x - dw + (i / segs2) * dw * 2;
        const x1 = p.x - dw + ((i + 1) / segs2) * dw * 2;
        ctx.moveTo(x0, topY + s * 0.14);
        ctx.lineTo(x1, baseY - s * 0.1);
        ctx.moveTo(x0, baseY - s * 0.1);
        ctx.lineTo(x1, topY + s * 0.14);
      }
      ctx.stroke();
      // THE SKIN: the bird's eye owns the drumhead — a taut
      // lit hide ellipse, pegged rim, the war-glyph painted
      // where the mallets land.
      ctx.fillStyle = '#5e4530';
      ctx.beginPath();
      ctx.ellipse(p.x, topY + s * 0.06, dw * 1.06, s * 0.19, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c9b088';
      ctx.beginPath();
      ctx.ellipse(p.x, topY + s * 0.04, dw * 0.94, s * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade('#c9b088', 14);
      ctx.beginPath();
      ctx.ellipse(p.x - dw * 0.2, topY + s * 0.015, dw * 0.5, s * 0.08, -0.1, 0, Math.PI * 2);
      ctx.fill();
      // Rim pegs march the head's edge.
      ctx.fillStyle = '#4e3a26';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.fillRect(
          p.x + Math.cos(a) * dw * 1.0 - s * 0.016,
          topY + s * 0.06 + Math.sin(a) * s * 0.17 - s * 0.016,
          s * 0.032,
          s * 0.032,
        );
      }
      // The glyph: a red ring broken by three claw slashes.
      ctx.strokeStyle = '#8a3b34';
      ctx.lineWidth = Math.max(1, s * 0.032);
      ctx.beginPath();
      ctx.ellipse(p.x, topY + s * 0.04, dw * 0.5, s * 0.085, 0, 0.6, Math.PI * 2 - 0.4);
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(p.x - dw * 0.2 + i * dw * 0.2, topY - s * 0.03);
        ctx.lineTo(p.x - dw * 0.08 + i * dw * 0.2, topY + s * 0.1);
        ctx.stroke();
      }
      // Crossed mallets lean where the drummer dropped them.
      for (const [rot, ox] of [
        [0.6, 0.3],
        [-0.5, 0.44],
      ] as const) {
        ctx.save();
        ctx.translate(p.x + ox * dw + dw * 0.55, baseY - s * 0.06);
        ctx.rotate(rot);
        ctx.fillStyle = shade(PALI_LOG, 4);
        ctx.fillRect(-s * 0.014, -s * 0.3, s * 0.028, s * 0.3);
        ctx.fillStyle = '#8a7444';
        ctx.beginPath();
        facetCircle(ctx, 0, -s * 0.32, s * 0.05, 6, rot, 0.8);
        ctx.fill();
        ctx.restore();
      }
    },
  };
}

function paintHideFrame(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.26;
  const HIDE = '#b08d62';
  // The frame rocks a hair when the wind leans on the hide.
  const { gust } = rend.breezeAt(tx, ty, t, tx * 1.1 + ty * 1.9, s, 0.02, 0.03);
  const rock = gust * 0.12;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.75, 1.7, 0.5),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - s * 0.42, baseY, p.x + s * 0.42, baseY, 1.05);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, s * 0.46, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      const fy = (yy: number) => yy + rock * (baseY - yy);
      const frameTop = baseY - s * 1.24;
      // The lashed square frame: two legs, two rails, corners
      // crossed and rope-bound. It stands tilted back a breath
      // (the top rail rides up-screen of the feet).
      const railY0 = fy(frameTop);
      const railY1 = fy(baseY - s * 0.26);
      ctx.fillStyle = shade(PALI_LOG, -4);
      for (const sgn of [-1, 1]) {
        const bx = p.x + sgn * s * 0.4;
        const txp = p.x + sgn * s * 0.33;
        ctx.beginPath();
        ctx.moveTo(bx - s * 0.03, baseY);
        ctx.lineTo(bx + s * 0.03, baseY);
        ctx.lineTo(txp + s * 0.025, railY0 - s * 0.1);
        ctx.lineTo(txp - s * 0.025, railY0 - s * 0.1);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = shade(PALI_LOG, -10);
      ctx.fillRect(p.x - s * 0.44, railY0, s * 0.88, s * 0.05);
      ctx.fillRect(p.x - s * 0.42, railY1, s * 0.84, s * 0.05);
      ctx.fillStyle = shade(PALI_LOG, 8);
      ctx.fillRect(p.x - s * 0.44, railY0, s * 0.88, s * 0.016);
      // Corner lashings.
      ctx.fillStyle = PALI_ROPE;
      for (const sgn of [-1, 1]) {
        ctx.fillRect(p.x + sgn * s * 0.33 - s * 0.035, railY0 - s * 0.02, s * 0.07, s * 0.08);
        ctx.fillRect(p.x + sgn * s * 0.36 - s * 0.03, railY1 - s * 0.01, s * 0.06, s * 0.07);
      }
      // THE HIDE: stretched taut inside the frame on tie cords,
      // its edge pulled to points at every anchor — the scraped
      // center pane reads a shade lighter where the work is done.
      const hx0 = p.x - s * 0.3;
      const hx1 = p.x + s * 0.3;
      const hy0 = railY0 + s * 0.14;
      const hy1 = railY1 - s * 0.1;
      ctx.strokeStyle = PALI_ROPE_DARK;
      ctx.lineWidth = Math.max(1, s * 0.018);
      const tie = (ax: number, ay: number, bx2: number, by2: number) => {
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx2, by2);
        ctx.stroke();
      };
      tie(hx0 + s * 0.05, hy0, hx0 + s * 0.02, railY0 + s * 0.04);
      tie(p.x, hy0 - s * 0.01, p.x, railY0 + s * 0.05);
      tie(hx1 - s * 0.05, hy0, hx1 - s * 0.02, railY0 + s * 0.04);
      tie(hx0 + s * 0.03, hy1 - s * 0.03, hx0 - s * 0.06, railY1 + s * 0.02);
      tie(hx1 - s * 0.03, hy1 - s * 0.03, hx1 + s * 0.06, railY1 + s * 0.02);
      ctx.fillStyle = HIDE;
      ctx.beginPath();
      ctx.moveTo(hx0 + s * 0.05, hy0);
      ctx.lineTo(p.x, hy0 - s * 0.01);
      ctx.lineTo(hx1 - s * 0.05, hy0);
      ctx.lineTo(hx1, hy0 + (hy1 - hy0) * 0.45);
      ctx.lineTo(hx1 - s * 0.03, hy1 - s * 0.03);
      ctx.lineTo(p.x + s * 0.02, hy1);
      ctx.lineTo(hx0 + s * 0.03, hy1 - s * 0.03);
      ctx.lineTo(hx0, hy0 + (hy1 - hy0) * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(HIDE, 16);
      ctx.beginPath();
      ctx.ellipse(p.x - s * 0.02, (hy0 + hy1) / 2, s * 0.16, (hy1 - hy0) * 0.3, 0.1, 0, Math.PI * 2);
      ctx.fill();
      // The neck stub keeps it an animal, not a canvas.
      ctx.fillStyle = shade(HIDE, -12);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.06, hy0);
      ctx.quadraticCurveTo(p.x, hy0 - s * 0.09, p.x + s * 0.06, hy0);
      ctx.closePath();
      ctx.fill();
      // The scraper leans on the frame leg, half the job done.
      ctx.save();
      ctx.translate(p.x + s * 0.46, baseY - s * 0.08);
      ctx.rotate(-0.4);
      ctx.fillStyle = '#8b93a4';
      ctx.fillRect(-s * 0.025, -s * 0.16, s * 0.05, s * 0.1);
      ctx.fillStyle = shade(PALI_LOG, 6);
      ctx.fillRect(-s * 0.016, -s * 0.06, s * 0.032, s * 0.2);
      ctx.restore();
    },
  };
}

export const WAR_CAMP_PROPS: PropEntries = [
  [[Tile.StandingTorch], paintStandingTorch],
  [[Tile.Bonfire], paintBonfire],
  [[Tile.WarBrazier], paintWarBrazier],
  [[Tile.TentHide], paintTentHide],
  [[Tile.TentWar], paintTentWar],
  [[Tile.SkullPile], paintSkullPile],
  [[Tile.SkullTotem], paintSkullTotem],
  [[Tile.WarBanner], paintWarBanner],
  [[Tile.PrisonCage], paintPrisonCage],
  [[Tile.SpikeBarrier], paintSpikeBarrier],
  [[Tile.MeatSpit], paintMeatSpit],
  [[Tile.MeatRack], paintMeatRack],
  [[Tile.CookPot], paintCookPot],
  [[Tile.PotionRack], paintPotionRack],
  [[Tile.BeastNest], paintBeastNest],
  [[Tile.PlunderSacks], paintPlunderSacks],
  [[Tile.SpearRack], paintSpearRack],
  [[Tile.TargetDummy], paintTargetDummy],
  [[Tile.WarDrum], paintWarDrum],
  [[Tile.HideFrame], paintHideFrame],
];
