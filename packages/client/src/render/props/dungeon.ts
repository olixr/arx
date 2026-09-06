/**
 * THE LONG DARK — barrels, stalagmites, bone piles, mine carts: the underworld set.
 * Extracted verbatim from renderer.ts's objectItem (THE PROP HALL,
 * foundations F1) — each painter is one former switch case; the frame
 * and host contracts live in ./types.ts.
 */
import { PALI_LOG } from '../paintVocab.js';
import { shade } from '../rig.js';
import { chamferRect, facetBlob, facetCircle } from '../shapes.js';
import { DGN_BONE, DGN_BONE_DIM, DGN_IRON, DGN_IRON_LIT, DGN_RUST_LIT } from './palette.js';
import { Tile, hashCoords } from '@arx/shared';
import type { DrawItem } from '../renderer.js';
import type { PropEntries, PropFrame, PropHost } from './types.js';

const DGN_RUST = '#7a4a30';
const DGN_CLAY = '#8a6644';
const DGN_CLAY_LIT = '#b08655';
const DGN_MOSS = '#4a6138';
const DGN_MOSS_LIT = '#5e7a44';

function paintBarrel(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // THE STREET BARREL, recut at the root (user verdict): the
  // old cask was a straight-cut hexagon wearing dead-flat
  // rectangle bands under a flat facet lid — a side elevation
  // with a cap pasted on, the exact read this camera cannot
  // honestly produce. It now casts from paintStreetCask (the
  // ONE COOPER law): true coopered bulge, bowed staves, the
  // standing-hoop law's down-bowed riveted bands, the chimed
  // foreshortened head — and it keeps its rain-butt fate: one
  // street barrel in three stands open to the sky, a glint
  // drifting its caught water.
  const wr = s * 0.28;
  const bh = s * 0.78;
  const water = h % 3 === 0;
  const tone = (((h >>> 5) & 3) - 1) * 5;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.6, 1.0, 0.55),
    drawShadow: () => rend.castBlob(p.x, baseY, 0.34, s * 0.24, h ^ 0x21),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.015, wr * 1.08, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      rend.paintStreetCask(p.x, baseY, wr, bh, s, tone, h, { water, t });
    },
  };
}

function paintCrate(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, tile, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // Knee-to-thigh height, shoulder-wide — cargo, not a hatbox.
  const cw = s * 0.66;
  const chh = s * 0.56;
  const goods = tile === Tile.CrateGoods;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.65, 1.05, 0.55),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - cw / 2, baseY, p.x + cw / 2, baseY, 0.55);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // Contact shade under the box edge.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
      ctx.fillRect(p.x - cw / 2 - s * 0.02, baseY - s * 0.015, cw + s * 0.04, s * 0.05);
      // Front face: planks, corner posts, and a diagonal brace —
      // built joinery, with shaded east edge and lit west.
      ctx.fillStyle = '#8a6534';
      ctx.fillRect(p.x - cw / 2, baseY - chh, cw, chh);
      ctx.fillStyle = 'rgba(36, 22, 10, 0.3)';
      ctx.fillRect(p.x - cw / 2, baseY - chh * 0.62, cw, s * 0.03);
      ctx.fillRect(p.x - cw / 2, baseY - chh * 0.28, cw, s * 0.03);
      ctx.save();
      ctx.beginPath();
      ctx.rect(p.x - cw / 2, baseY - chh, cw, chh);
      ctx.clip();
      ctx.translate(p.x, baseY - chh / 2);
      ctx.rotate(-0.5);
      ctx.fillRect(-cw, -s * 0.02, cw * 2, s * 0.04);
      ctx.restore();
      ctx.fillStyle = shade('#8a6534', 10);
      ctx.fillRect(p.x - cw / 2, baseY - chh, s * 0.055, chh);
      ctx.fillStyle = shade('#8a6534', -12);
      ctx.fillRect(p.x + cw / 2 - s * 0.055, baseY - chh, s * 0.055, chh);
      // Top: lit lid slab.
      ctx.fillStyle = '#a5793f';
      ctx.beginPath();
      chamferRect(ctx, p.x - cw / 2 - s * 0.02, baseY - chh - syT * 0.32, cw + s * 0.04, syT * 0.32, s * 0.03);
      ctx.fill();
      ctx.fillStyle = shade('#a5793f', 14);
      ctx.fillRect(p.x - cw / 2, baseY - chh - s * 0.035, cw, s * 0.035);
      if (goods) {
        // Market produce heaped over the rim.
        const carrots = h % 2 === 0;
        for (let k = 0; k < 6; k++) {
          const hh = hashCoords(53 + k, tx, ty);
          const ox = p.x + ((hh % 100) / 100 - 0.5) * cw * 0.72;
          const oy = baseY - chh - syT * 0.2 - ((hh >> 7) % 40) / 100 * s * 0.12;
          if (carrots) {
            ctx.fillStyle = hh & 1 ? '#d9772e' : '#c96a28';
            ctx.beginPath();
            ctx.moveTo(ox - s * 0.08, oy - s * 0.045);
            ctx.lineTo(ox + s * 0.08, oy - s * 0.02);
            ctx.lineTo(ox - s * 0.06, oy + s * 0.045);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillStyle = hh & 1 ? '#b5493e' : '#a33d33';
            ctx.beginPath();
            facetCircle(ctx, ox, oy, s * 0.07, 6, (hh % 7) * 0.3);
            ctx.fill();
          }
        }
      } else {
        // Stencil mark: a shipped crate, not a prop cube.
        ctx.fillStyle = 'rgba(36, 22, 10, 0.4)';
        ctx.fillRect(p.x - s * 0.09, baseY - chh * 0.36, s * 0.18, s * 0.035);
        ctx.fillRect(p.x - s * 0.06, baseY - chh * 0.24, s * 0.12, s * 0.035);
      }
    },
  };
}

function paintStalagmite(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // Drip-stone grows one bead at a time: every column rolls its
  // own height and lean off the world hash, torso-high beside
  // the body and always shorter than the wall mass around it.
  const ht = s * (0.92 + ((h >> 3) & 7) * 0.05); // 0.92..1.27
  const lean = (((h >> 9) & 7) / 7 - 0.5) * s * 0.16;
  const m = ((h >> 6) & 1) === 0 ? 1 : -1; // wet-flank side
  const bw = s * 0.3 * (0.92 + ((h >> 13) & 3) * 0.05);
  return {
    sortY: ty + 0.7,
    body: stationBody(0.55, 1.55, 0.5),
    drawShadow: () => rend.castBlob(p.x, baseY, ht / s, s * 0.22, h ^ 0x2f),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // Contact shade roots the column to the cave floor.
      ctx.fillStyle = 'rgba(12, 8, 20, 0.28)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, bw * 1.15, s * 0.085, 0, 0, Math.PI * 2);
      ctx.fill();
      // Stacked-bead silhouette: three ages of drip-stone, each
      // new bead starting a touch PROUD of the taper below it —
      // a stepped column, never a smooth traffic cone (and never
      // a snowman of circles). CaveWall palette family.
      const beads: Array<{ f0: number; f1: number; wb: number; wt: number; col: string }> = [
        { f0: 0, f1: 0.42, wb: 1, wt: 0.58, col: '#3a3444' },
        { f0: 0.42, f1: 0.74, wb: 0.76, wt: 0.42, col: '#4a4458' },
        { f0: 0.74, f1: 1, wb: 0.56, wt: 0.14, col: '#5a5370' },
      ];
      const wAt = (f: number): number => {
        const b = beads.find((bd) => f <= bd.f1) ?? beads[2]!;
        return bw * (b.wb + ((f - b.f0) / (b.f1 - b.f0)) * (b.wt - b.wb));
      };
      const xAt = (f: number): number => p.x + lean * f;
      for (let bi = 0; bi < beads.length; bi++) {
        const b = beads[bi]!;
        // Each flank carries one hash-jogged shoulder partway up
        // so the edges read grown, not machined.
        const hj = hashCoords(83 + bi, tx, ty);
        const fm = b.f0 + (b.f1 - b.f0) * (0.4 + ((hj >>> 3) % 30) / 100);
        const wm = bw * (b.wb + ((fm - b.f0) / (b.f1 - b.f0)) * (b.wt - b.wb));
        const jog = ((hj & 1) === 0 ? 1 : -1) * bw * 0.09;
        ctx.fillStyle = b.col;
        ctx.beginPath();
        ctx.moveTo(xAt(b.f0) - bw * b.wb, baseY - ht * b.f0);
        ctx.lineTo(xAt(fm) - wm - jog, baseY - ht * fm);
        ctx.lineTo(xAt(b.f1) - bw * b.wt, baseY - ht * b.f1);
        ctx.lineTo(xAt(b.f1) + bw * b.wt, baseY - ht * b.f1);
        ctx.lineTo(xAt(fm) + wm - jog * 0.5, baseY - ht * fm);
        ctx.lineTo(xAt(b.f0) + bw * b.wb, baseY - ht * b.f0);
        ctx.closePath();
        ctx.fill();
        // Drip lip where the bead beds on the taper below:
        // shadow tucked under the overhang, wet light on top.
        if (bi > 0) {
          ctx.fillStyle = 'rgba(14, 10, 22, 0.4)';
          ctx.fillRect(xAt(b.f0) - bw * b.wb, baseY - ht * b.f0, bw * b.wb * 2, Math.max(1, s * 0.032));
          ctx.fillStyle = 'rgba(186, 180, 212, 0.2)';
          ctx.fillRect(xAt(b.f0) - bw * b.wb * 0.85, baseY - ht * b.f0 - Math.max(1, s * 0.028), bw * b.wb * 1.7, Math.max(1, s * 0.028));
        }
      }
      // The blunt drip tip, still forming.
      ctx.fillStyle = '#655e7c';
      ctx.beginPath();
      facetCircle(ctx, xAt(1), baseY - ht, wAt(1) * 1.1, 6, 0.3, 0.6);
      ctx.fill();
      // Wet highlight: one flank still runs with seep water — a
      // narrow bright lane sliding the full height, hard-edged
      // like every other flat fill in the dialect.
      ctx.fillStyle = 'rgba(178, 196, 228, 0.2)';
      ctx.beginPath();
      ctx.moveTo(p.x + m * bw * 0.5, baseY - s * 0.04);
      ctx.lineTo(p.x + m * bw * 0.72, baseY - ht * 0.3);
      ctx.lineTo(xAt(0.92) + m * wAt(0.92) * 0.5, baseY - ht * 0.92);
      ctx.lineTo(xAt(0.92) + m * wAt(0.92) * 0.1, baseY - ht * 0.92);
      ctx.lineTo(p.x + m * bw * 0.4, baseY - ht * 0.3);
      ctx.lineTo(p.x + m * bw * 0.24, baseY - s * 0.04);
      ctx.closePath();
      ctx.fill();
      // A drip bead catching what light the cave has.
      if (((h >> 15) & 3) !== 3) {
        ctx.fillStyle = 'rgba(214, 226, 248, 0.5)';
        ctx.beginPath();
        ctx.ellipse(p.x + m * bw * 0.55, baseY - ht * 0.5, s * 0.018, s * 0.026, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Shade flank opposite the wet lane — a turned form.
      ctx.fillStyle = 'rgba(20, 14, 30, 0.22)';
      ctx.beginPath();
      ctx.moveTo(p.x - m * bw * 0.95, baseY);
      ctx.lineTo(xAt(0.85) - m * wAt(0.85), baseY - ht * 0.85);
      ctx.lineTo(xAt(0.85) - m * wAt(0.85) * 0.55, baseY - ht * 0.85);
      ctx.lineTo(p.x - m * bw * 0.6, baseY);
      ctx.closePath();
      ctx.fill();
      // Parting shadow where stone meets floor (grounding law).
      ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
      ctx.fillRect(p.x - bw * 0.8, baseY - Math.max(1.5, s * 0.03), bw * 1.6, Math.max(1.5, s * 0.03));
    },
  };
}

function paintBonePile(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // Kickable clutter: a knee-high heap in the barrel/crate mass
  // language — long-bones thrown criss-cross under a skull dome,
  // every pile scattered differently by its hash.
  const m = ((h >> 4) & 1) === 0 ? 1 : -1;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.65, 0.75, 0.5),
    drawShadow: () => rend.castBlob(p.x, baseY, 0.22, s * 0.26, h ^ 0x53),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // Contact shade under the heap.
      ctx.fillStyle = 'rgba(12, 8, 20, 0.26)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY, s * 0.42, s * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
      // The under-heap: a low mound of older, duller bone the
      // fresh pieces lie on — mass first, detail on top.
      ctx.fillStyle = '#8b8272';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.06, s * 0.36, s * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      // One long-bone: shaft plus two knuckle ends, laid flat.
      const bone = (cx: number, cy: number, len: number, ang: number, col: string): void => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang);
        ctx.fillStyle = col;
        ctx.fillRect(-len / 2, -s * 0.032, len, s * 0.064);
        ctx.beginPath();
        ctx.ellipse(-len / 2, 0, s * 0.052, s * 0.045, 0, 0, Math.PI * 2);
        ctx.ellipse(len / 2, 0, s * 0.052, s * 0.045, 0, 0, Math.PI * 2);
        ctx.fill();
        // Shaft shadow line keeps it a cylinder, not a stripe.
        ctx.fillStyle = 'rgba(90, 82, 66, 0.4)';
        ctx.fillRect(-len / 2 + s * 0.02, s * 0.008, len - s * 0.04, s * 0.02);
        ctx.restore();
      };
      // Three to four bones dealt by hash, criss-crossed low.
      const nB = 3 + ((h >> 7) & 1);
      for (let k = 0; k < nB; k++) {
        const hb = hashCoords(59 + k, tx, ty);
        const bx = p.x + (((hb % 100) / 100 - 0.5) * s * 0.5) * m;
        const by = baseY - s * 0.05 - ((hb >>> 8) % 12) / 100 * s;
        const ang = (((hb >>> 5) % 100) / 100 - 0.5) * 1.1;
        bone(bx, by, s * (0.3 + ((hb >>> 11) % 20) / 100), ang, (hb & 1) === 0 ? '#cfc7ae' : '#c2b99d');
      }
      // The skull: a dome with a hard brow, two socket voids and
      // a broken jaw line — sits ON the heap, hash picks a side.
      const sx = p.x + m * s * (0.1 + ((h >> 10) & 3) * 0.03);
      const sy = baseY - s * 0.16;
      ctx.fillStyle = '#cfc7ae';
      ctx.beginPath();
      facetCircle(ctx, sx, sy, s * 0.13, 6, 0.4, 0.85);
      ctx.fill();
      ctx.fillStyle = '#ddd6c0';
      ctx.beginPath();
      facetCircle(ctx, sx - s * 0.02, sy - s * 0.03, s * 0.095, 6, 0.4, 0.8);
      ctx.fill();
      // Sockets stare wherever the hash left them facing.
      ctx.fillStyle = '#241a2e';
      ctx.beginPath();
      ctx.ellipse(sx - m * s * 0.055, sy + s * 0.005, s * 0.028, s * 0.034, 0, 0, Math.PI * 2);
      ctx.ellipse(sx + m * s * 0.015, sy + s * 0.005, s * 0.028, s * 0.034, 0, 0, Math.PI * 2);
      ctx.fill();
      // Nasal notch + tooth row under the dome.
      ctx.fillRect(sx - m * s * 0.02 - s * 0.011, sy + s * 0.05, s * 0.022, s * 0.03);
      ctx.fillStyle = '#b5ac91';
      ctx.fillRect(sx - s * 0.075, sy + s * 0.095, s * 0.15, s * 0.028);
      ctx.fillStyle = 'rgba(36, 26, 46, 0.5)';
      for (const fx of [-0.045, -0.005, 0.035]) {
        ctx.fillRect(sx + fx * s, sy + s * 0.095, Math.max(1, s * 0.012), s * 0.028);
      }
      // A rib arc leaning out of the heap when the hash allows.
      if (((h >> 12) & 3) !== 0) {
        ctx.strokeStyle = '#c2b99d';
        ctx.lineWidth = Math.max(1.5, s * 0.04);
        ctx.beginPath();
        ctx.arc(p.x - m * s * 0.24, baseY - s * 0.02, s * 0.15, Math.PI * 1.05, Math.PI * 1.75);
        ctx.stroke();
      }
      // Bone chips scattered at the skirt.
      rend.rubble(p.x, p.y - s * 0.12, s * 0.8, h ^ 0x77, ['#cfc7ae', '#8b8272', '#b5ac91']);
    },
  };
}

function paintBrazier(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // An iron fire-basket at the waist: three splayed legs under a
  // riveted bowl, a STANDING FIRE banked in the open top.
  // THE COLD BRAZIER BY DAY (contested lands band 7, owed E6 / D3):
  // the painted blaze rides sky.flame exactly like the LampPost's
  // caged flame — cold iron and a dead grey coal bed at noon, the
  // fire climbing with the dusk clock and burning through the night
  // — because the kit law says a brazier is lit AT DUSK (the light
  // row in shared/world/lights.ts has been flame-gated since it was
  // written; only the painter still burned at noon, which is the
  // fault this gate closes). Underground the frame's flame gate
  // rides to 1 (renderer applyUnderground), so a dungeon brazier
  // never goes cold; WarBrazier is its own id and its own painter.
  // Bounds reach past the smoke crown: a too-tight body clips the
  // bake and rings the straight clip edge.
  const rimY = baseY - s * 0.72;
  const rw = s * 0.3; // rim half-width
  return {
    sortY: ty + 0.7,
    body: stationBody(0.7, 2.1, 0.5),
    drawShadow: () => rend.castBlob(p.x, baseY, 0.5, s * 0.2, h ^ 0x35),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      const lit = rend.sky.flame;
      // THE GATE: under 0.05 the basket is cold iron (the LampPost's
      // own threshold); from there the fire CLIMBS with the dusk clock
      // on a smooth ramp to full at 0.4, never a pop — the ring cache
      // re-mints the sprite on its cadence while the live lane draws
      // every frame, and a hard step at the threshold would put the
      // two lanes a whole blaze apart for one cadence (the parity
      // gate's crown scenes measured exactly that).
      const rampT = Math.max(0, Math.min(1, (lit - 0.05) / 0.35));
      const fire = rampT * rampT * (3 - 2 * rampT);
      const cold = fire <= 0;
      const flick = 0.9 + Math.sin(t * 9 + h) * 0.07 + Math.sin(t * 21 + h * 3) * 0.04;
      // Contact shade under the leg stance.
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY, s * 0.3, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      // Firelight laps the ground through the legs — a faceted
      // warm pool, deeper after dark (the campfire's floor law);
      // a cold basket throws none.
      if (!cold) {
        ctx.fillStyle = `rgba(232, 122, 51, ${(0.05 + 0.04 * flick) * fire})`;
        ctx.beginPath();
        facetCircle(ctx, p.x, baseY - s * 0.02, s * 0.46, 8, h * 0.3, 0.5);
        ctx.fill();
      }
      // Three splayed legs: two forward, one behind the bowl —
      // wrought iron with clawed feet.
      ctx.fillStyle = '#211c2b';
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.035, baseY - s * 0.5);
      ctx.lineTo(p.x + s * 0.035, baseY - s * 0.5);
      ctx.lineTo(p.x + s * 0.02, baseY - s * 0.26);
      ctx.lineTo(p.x - s * 0.02, baseY - s * 0.26);
      ctx.closePath();
      ctx.fill();
      for (const lm of [-1, 1]) {
        ctx.fillStyle = '#2c2836';
        ctx.beginPath();
        ctx.moveTo(p.x + lm * s * 0.1, baseY - s * 0.46);
        ctx.lineTo(p.x + lm * s * 0.17, baseY - s * 0.46);
        ctx.lineTo(p.x + lm * s * 0.3, baseY - s * 0.02);
        ctx.lineTo(p.x + lm * s * 0.22, baseY - s * 0.02);
        ctx.closePath();
        ctx.fill();
        // Claw foot pad.
        ctx.fillStyle = '#211c2b';
        ctx.fillRect(p.x + lm * s * 0.22 - (lm < 0 ? s * 0.03 : 0), baseY - s * 0.035, s * 0.11, s * 0.035);
      }
      // The basket: a flaring iron bowl with a riveted mid-band.
      ctx.fillStyle = '#2c2836';
      ctx.beginPath();
      ctx.moveTo(p.x - rw, rimY);
      ctx.lineTo(p.x + rw, rimY);
      ctx.lineTo(p.x + rw * 0.62, baseY - s * 0.4);
      ctx.lineTo(p.x - rw * 0.62, baseY - s * 0.4);
      ctx.closePath();
      ctx.fill();
      // West flank catches what light there is; east falls off.
      ctx.fillStyle = shade('#2c2836', 12);
      ctx.beginPath();
      ctx.moveTo(p.x - rw, rimY);
      ctx.lineTo(p.x - rw * 0.72, rimY);
      ctx.lineTo(p.x - rw * 0.46, baseY - s * 0.4);
      ctx.lineTo(p.x - rw * 0.62, baseY - s * 0.4);
      ctx.closePath();
      ctx.fill();
      // Riveted band around the bowl's waist.
      ctx.fillStyle = '#3a3444';
      ctx.fillRect(p.x - rw * 0.86, rimY + s * 0.13, rw * 1.72, s * 0.05);
      ctx.fillStyle = '#565064';
      for (const fx of [-0.6, -0.2, 0.2, 0.6]) {
        ctx.fillRect(p.x + fx * rw - s * 0.014, rimY + s * 0.142, s * 0.028, s * 0.028);
      }
      // THE TOP PLANE (2.5D law): the basket mouth is a
      // foreshortened ellipse — dark iron rim, coal bed sunk in.
      ctx.fillStyle = '#3a3444';
      ctx.beginPath();
      ctx.ellipse(p.x, rimY, rw, s * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade('#3a3444', 14);
      ctx.beginPath();
      ctx.ellipse(p.x, rimY - s * 0.012, rw * 0.96, s * 0.12, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      // Coals: lit, the banked bed glows and out-of-phase pulses keep
      // it alive, night lifting the painted heat a notch; cold, it is
      // yesterday's bed — grey clinker in a dead brown seat, no pulse.
      const hot = 0.85 + fire * 0.15;
      // The bed warms on the same ramp: dead brown-grey through to
      // the banked red (a value ride, so the dusk lane never steps).
      const bedR = Math.round(58 + (124 - 58) * fire);
      const bedG = Math.round(50 + (48 - 50) * fire);
      const bedB = Math.round(56 + (24 - 56) * fire);
      ctx.fillStyle = `rgb(${bedR}, ${bedG}, ${bedB})`;
      ctx.beginPath();
      ctx.ellipse(p.x, rimY + s * 0.01, rw * 0.74, s * 0.095, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let k = 0; k < 4; k++) {
        const hc = hashCoords(67 + k, tx, ty);
        const cx = p.x + (((hc % 100) / 100 - 0.5) * rw * 1.1);
        const cy = rimY + s * 0.005 - ((hc >>> 6) % 8) / 100 * s;
        const pulse = 0.5 + Math.sin(t * 3.1 + k * 2.2 + h) * 0.5;
        // Grey clinker first (the cold read), the ember over it at
        // the ramp's alpha — the two cross-fade instead of swapping.
        ctx.fillStyle = (hc & 1) === 0 ? '#57505c' : '#6a636e';
        ctx.beginPath();
        facetCircle(ctx, cx, cy, s * (0.036 + ((hc >>> 9) % 4) * 0.007), 6, hc * 0.3);
        ctx.fill();
        if (!cold) {
          ctx.fillStyle =
            (hc & 1) === 0
              ? `rgba(232, 147, 60, ${(0.55 + 0.45 * pulse) * hot * fire})`
              : `rgba(255, 196, 96, ${(0.45 + 0.5 * pulse) * hot * fire})`;
          ctx.beginPath();
          facetCircle(ctx, cx, cy, s * (0.036 + ((hc >>> 9) % 4) * 0.007), 6, hc * 0.3);
          ctx.fill();
        }
      }
      // THE STANDING FIRE: four banked layers of angular flame —
      // deep ember sheath, orange body, gold heart, white-hot
      // core — each a jagged low-poly silhouette swaying on its
      // own phase, roots sunk behind the front lip. Chunky by
      // design: straight facets, no soft curves, so the blaze
      // speaks the same blocky dialect as the prop it rides.
      // Cadence sampling gives it the stop-motion shimmer (the
      // LampPost precedent); the live glow pass carries the
      // actual light. Nothing of it burns while the basket is cold;
      // its height and its heat climb with the dusk clock.
      if (!cold) {
      const fh = s * (0.5 + 0.07 * Math.sin(t * 3.7 + h)) * flick * (0.45 + 0.55 * fire);
      const blaze = (cx: number, bw: number, hgt: number, ph: number): void => {
        const sw = Math.sin(t * 6.3 + ph) * s * 0.028 + Math.sin(t * 11.7 + ph * 2.1) * s * 0.014;
        const tipX = cx + sw * 1.7;
        ctx.beginPath();
        ctx.moveTo(cx - bw, rimY + s * 0.02);
        ctx.lineTo(cx - bw * 0.74, rimY - hgt * 0.3);
        ctx.lineTo(cx - bw * 0.36 + sw * 0.5, rimY - hgt * 0.36);
        ctx.lineTo(cx - bw * 0.52 + sw, rimY - hgt * 0.62);
        ctx.lineTo(tipX - bw * 0.14, rimY - hgt * 0.7);
        ctx.lineTo(tipX, rimY - hgt);
        ctx.lineTo(tipX + bw * 0.18, rimY - hgt * 0.64);
        ctx.lineTo(cx + bw * 0.54 + sw, rimY - hgt * 0.58);
        ctx.lineTo(cx + bw * 0.32, rimY - hgt * 0.32);
        ctx.lineTo(cx + bw * 0.8, rimY - hgt * 0.26);
        ctx.lineTo(cx + bw, rimY + s * 0.02);
        ctx.closePath();
        ctx.fill();
      };
      const heat = hot * fire;
      ctx.fillStyle = `rgba(194, 74, 32, ${0.92 * heat})`;
      blaze(p.x, rw * 0.78, fh * 1.2, h * 0.7);
      ctx.fillStyle = `rgba(232, 130, 61, ${0.95 * heat})`;
      blaze(p.x + s * 0.012, rw * 0.6, fh * 0.94, h * 1.3);
      ctx.fillStyle = `rgba(242, 201, 76, ${0.95 * heat})`;
      blaze(p.x - s * 0.014, rw * 0.42, fh * 0.66, h * 0.4);
      ctx.fillStyle = `rgba(255, 243, 200, ${0.9 * heat})`;
      blaze(p.x, rw * 0.24, fh * 0.4, h * 2.2);
      // Ember motes: square chips shed off the crown, spiraling
      // up and dimming — the fire's own weather.
      for (let i = 0; i < 3; i++) {
        const ph = (t * (0.5 + i * 0.17) + h * 0.11 + i * 0.37) % 1;
        const es = s * (0.05 - ph * 0.022);
        ctx.fillStyle =
          (i & 1) === 0
            ? `rgba(255, 190, 110, ${(1 - ph) * 0.85 * heat})`
            : `rgba(242, 201, 76, ${(1 - ph) * 0.7 * heat})`;
        ctx.fillRect(
          p.x + Math.sin(t * 2.1 + i * 2.6 + h) * s * (0.08 + ph * 0.1) - es / 2,
          rimY - fh * 0.8 - ph * s * 0.55,
          es,
          es,
        );
      }
      // Smoke: faceted puffs climbing off the crown, swelling as
      // they thin — the same gray the campfire breathes.
      for (let i = 0; i < 2; i++) {
        const sp = (t * (0.24 + i * 0.09) + h * 0.13 + i * 0.5) % 1;
        ctx.fillStyle = `rgba(146, 140, 152, ${(1 - sp) * 0.2 * fire})`;
        ctx.beginPath();
        facetCircle(
          ctx,
          p.x + Math.sin(t * 0.9 + h + i * 2.4) * s * 0.06 + sp * s * 0.14,
          rimY - fh * 1.15 - s * 0.08 - sp * s * 0.5,
          s * (0.055 + sp * 0.085),
          6,
          sp * 2 + i,
          0.82,
        );
        ctx.fill();
      }
      } // the gate closes: a cold basket ends at its coals
      // Rim front lip reads over the flame roots.
      ctx.fillStyle = '#2c2836';
      ctx.beginPath();
      ctx.ellipse(p.x, rimY, rw, s * 0.13, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = 'rgba(20, 14, 28, 0.4)';
      ctx.beginPath();
      ctx.ellipse(p.x, rimY + s * 0.02, rw * 0.8, s * 0.08, 0, 0, Math.PI);
      ctx.fill();
    },
  };
}

function paintGlowShroom(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // A shin-high cluster of cave shrooms: teal caps on pale stems,
  // three to five heads dealt by hash. The painted under-glow is
  // a whisper — the live teal light pass does the real work.
  const nS = 3 + (h % 3);
  return {
    sortY: ty + 0.7,
    body: stationBody(0.55, 0.75, 0.5),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.24, s * 0.09),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // Static under-glow disc on the floor (subtle by law).
      ctx.fillStyle = 'rgba(110, 225, 200, 0.09)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY, s * 0.44, s * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(143, 224, 207, 0.08)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY, s * 0.28, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // Deal the cluster back-to-front so caps overlap honestly.
      const heads: Array<[number, number, number, number]> = [];
      for (let k = 0; k < nS; k++) {
        const hs2 = hashCoords(71 + k, tx, ty);
        const ox = (((hs2 % 100) / 100 - 0.5) * s * 0.52);
        const oy = (((hs2 >>> 7) % 40) / 100 - 0.2) * s * 0.3;
        const hgt = s * (0.16 + ((hs2 >>> 11) % 20) / 100); // 0.16..0.36
        heads.push([p.x + ox, baseY + oy, hgt, hs2]);
      }
      heads.sort((a, b) => a[1] - b[1]);
      for (const [cx, cy, hgt, hs2] of heads) {
        const cr = hgt * (0.62 + ((hs2 >>> 4) % 3) * 0.08); // cap radius
        const tilt = (((hs2 >>> 9) % 100) / 100 - 0.5) * 0.16;
        // Stem: pale, slightly leaned, rooted with contact shade.
        ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + s * 0.008, cr * 0.55, s * 0.03, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = (hs2 & 1) === 0 ? '#c8d4cd' : '#bcc9c4';
        ctx.beginPath();
        ctx.moveTo(cx - hgt * 0.14, cy);
        ctx.lineTo(cx + hgt * 0.14, cy);
        ctx.lineTo(cx + hgt * 0.1 + tilt * hgt, cy - hgt * 0.72);
        ctx.lineTo(cx - hgt * 0.1 + tilt * hgt, cy - hgt * 0.72);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(90, 106, 100, 0.35)';
        ctx.fillRect(cx + hgt * 0.03, cy - hgt * 0.66, Math.max(1, hgt * 0.06), hgt * 0.6);
        // Cap: a teal dome with a dark gill line under the brim
        // and a paler crown — the thing that actually glows.
        const capY = cy - hgt * 0.7;
        ctx.fillStyle = 'rgba(24, 42, 40, 0.6)';
        ctx.beginPath();
        ctx.ellipse(cx + tilt * hgt, capY + hgt * 0.03, cr, hgt * 0.16, tilt, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8fe0cf';
        ctx.beginPath();
        ctx.ellipse(cx + tilt * hgt, capY - hgt * 0.1, cr, hgt * 0.3, tilt, Math.PI, Math.PI * 2);
        ctx.ellipse(cx + tilt * hgt, capY, cr, hgt * 0.14, tilt, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = '#b4f0e2';
        ctx.beginPath();
        ctx.ellipse(cx + tilt * hgt - cr * 0.2, capY - hgt * 0.16, cr * 0.5, hgt * 0.14, tilt, Math.PI, Math.PI * 2);
        ctx.fill();
        // Spore freckles on the bigger caps.
        if (cr > s * 0.13) {
          ctx.fillStyle = '#d8f8ee';
          ctx.beginPath();
          ctx.ellipse(cx + tilt * hgt + cr * 0.4, capY - hgt * 0.08, s * 0.016, s * 0.012, 0, 0, Math.PI * 2);
          ctx.ellipse(cx + tilt * hgt - cr * 0.45, capY - hgt * 0.04, s * 0.013, s * 0.01, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
  };
}


// ================= THE LONG DARK FURNISHED =================
// Ten pieces of dungeon dressing, ids 349-358. The kit's voice:
// whatever stood down here was left, not placed — every piece
// carries the century between its makers and the player.
function paintMossBarrel(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.22;
  // A century in the damp: the town cask's silhouette gone soft
  // — staves bowed, hoops bleeding rust, the head holding a skin
  // of black water OR lost under a moss cap (hash deals the
  // fate), and on some casks one sprung stave opens a dark seam.
  const hw = s * (0.27 + ((h >> 3) & 3) * 0.012);
  const ht = s * 0.62;
  const mossy = ((h >> 6) & 3) !== 0;
  const sprung = ((h >> 8) & 3) === 0;
  const m = ((h >> 4) & 1) === 0 ? 1 : -1;
  const topY = baseY - ht;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.55, 1.0, 0.5),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.3, s * 0.1),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.26)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.25, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // The cask: staves bulge at the waist — the cooper's curve
      // still holding under the rot.
      const bw = hw * 1.16;
      ctx.fillStyle = '#55503a';
      ctx.beginPath();
      ctx.moveTo(p.x - hw, baseY);
      ctx.quadraticCurveTo(p.x - bw, baseY - ht * 0.5, p.x - hw * 0.94, topY);
      ctx.lineTo(p.x + hw * 0.94, topY);
      ctx.quadraticCurveTo(p.x + bw, baseY - ht * 0.5, p.x + hw, baseY);
      ctx.closePath();
      ctx.fill();
      // Stave seams bow with the belly; one lit lane keeps the
      // cylinder turned instead of flat.
      ctx.strokeStyle = 'rgba(24, 20, 16, 0.4)';
      ctx.lineWidth = Math.max(1, s * 0.016);
      for (const f of [-0.55, -0.18, 0.2, 0.58]) {
        ctx.beginPath();
        ctx.moveTo(p.x + hw * f, baseY);
        ctx.quadraticCurveTo(p.x + bw * f, baseY - ht * 0.5, p.x + hw * 0.94 * f, topY);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(148, 138, 96, 0.28)';
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.5, baseY);
      ctx.quadraticCurveTo(p.x - bw * 0.52, baseY - ht * 0.5, p.x - hw * 0.47, topY);
      ctx.lineTo(p.x - hw * 0.24, topY);
      ctx.quadraticCurveTo(p.x - bw * 0.26, baseY - ht * 0.5, p.x - hw * 0.26, baseY);
      ctx.closePath();
      ctx.fill();
      // The sprung stave: one plank sheared out of the run over
      // a void seam — rot never breaks clean.
      if (sprung) {
        ctx.fillStyle = '#241a2e';
        ctx.fillRect(p.x + m * hw * 0.38 - s * 0.028, baseY - ht * 0.54, s * 0.056, ht * 0.5);
        ctx.fillStyle = '#4a4632';
        ctx.save();
        ctx.translate(p.x + m * hw * 0.48, baseY - ht * 0.08);
        ctx.rotate(m * 0.22);
        ctx.fillRect(-s * 0.03, -ht * 0.44, s * 0.06, ht * 0.46);
        ctx.restore();
      }
      // Two hoops rusted to the wood, each keeping one lit tick
      // where the damp hasn't eaten the iron yet.
      for (const [f, wf] of [
        [0.16, 1.06],
        [0.72, 1.02],
      ] as const) {
        ctx.strokeStyle = DGN_RUST;
        ctx.lineWidth = Math.max(1.5, s * 0.042);
        ctx.beginPath();
        ctx.moveTo(p.x - hw * wf, baseY - ht * f);
        ctx.quadraticCurveTo(p.x, baseY - ht * f + s * 0.05, p.x + hw * wf, baseY - ht * f);
        ctx.stroke();
        ctx.strokeStyle = DGN_RUST_LIT;
        ctx.lineWidth = Math.max(1, s * 0.02);
        ctx.beginPath();
        ctx.moveTo(p.x - hw * wf * 0.5, baseY - ht * f + s * 0.034);
        ctx.quadraticCurveTo(p.x - hw * wf * 0.1, baseY - ht * f + s * 0.05, p.x + hw * wf * 0.2, baseY - ht * f + s * 0.044);
        ctx.stroke();
      }
      // Rust weeps down from the low hoop.
      ctx.fillStyle = 'rgba(122, 74, 48, 0.35)';
      ctx.fillRect(p.x + m * hw * 0.55, baseY - ht * 0.14, s * 0.035, ht * 0.13);
      // THE TOP PLANE: the cask head is a foreshortened ellipse
      // — a chime-hoop rim around either standing black water or
      // the moss cap that took the lid.
      ctx.fillStyle = '#5f5941';
      ctx.beginPath();
      ctx.ellipse(p.x, topY, hw * 0.94, syT * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = DGN_RUST;
      ctx.lineWidth = Math.max(1, s * 0.028);
      ctx.beginPath();
      ctx.ellipse(p.x, topY, hw * 0.94, syT * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (mossy) {
        ctx.fillStyle = DGN_MOSS;
        ctx.beginPath();
        ctx.ellipse(p.x, topY, hw * 0.78, syT * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = DGN_MOSS_LIT;
        ctx.beginPath();
        ctx.ellipse(p.x - hw * 0.2, topY - syT * 0.06, hw * 0.4, syT * 0.11, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#20262b';
        ctx.beginPath();
        ctx.ellipse(p.x, topY, hw * 0.78, syT * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();
        // One cold reflection tick — standing water, not paint.
        ctx.fillStyle = 'rgba(178, 196, 228, 0.35)';
        ctx.beginPath();
        ctx.ellipse(p.x + hw * 0.22, topY - syT * 0.05, hw * 0.2, syT * 0.05, -0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Moss climbs the shaded flank from the floor's damp.
      ctx.fillStyle = 'rgba(74, 97, 56, 0.75)';
      ctx.beginPath();
      facetBlob(ctx, p.x - m * hw * 0.72, baseY - ht * 0.16, s * 0.1, h ^ 0x19, 5, 0.8);
      ctx.fill();
      ctx.beginPath();
      facetBlob(ctx, p.x - m * hw * 0.48, baseY - ht * 0.04, s * 0.075, h ^ 0x2b, 5, 0.8);
      ctx.fill();
    },
  };
}

function paintMineCart(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.24;
  // The shift that never clocked out: a hopper cart dead on a
  // stub of rail. The stub runs E-W under the wheels and STOPS —
  // the line the cart belonged to is long gone; the hash deals
  // the load (copper glint, coal, or standing empty) and one
  // wheel gone shy of true.
  const loadRoll = (h >> 5) & 3; // 0 empty, 1 coal, 2-3 ore
  const m = ((h >> 3) & 1) === 0 ? 1 : -1;
  const hwB = s * 0.34; // hopper half-width at the rim
  const cartH = s * 0.52; // rim height over the rail
  const wheelY = baseY - s * 0.05;
  const rimY = baseY - cartH;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.72, 1.05, 0.55),
    drawShadow: () => rend.castContact(p.x, baseY, hwB * 1.35, s * 0.11),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // The rail stub: two iron rails on four rotting sleepers,
      // running WIDE past the cart on both sides and stopping
      // dead — the line it belonged to is long gone. The rails
      // keep a full-length lit edge: track must read as track
      // even at map scale (first audit: the v1 stub drowned).
      ctx.fillStyle = 'rgba(12, 8, 20, 0.28)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY, hwB * 1.6, s * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3d3527';
      for (const f of [-0.56, -0.19, 0.19, 0.56]) {
        ctx.fillRect(p.x + f * s * 1.3 - s * 0.05, baseY - s * 0.04 + syT * 0.07, s * 0.1, s * 0.12);
      }
      for (const dy of [-0.085, 0.085]) {
        ctx.fillStyle = DGN_IRON;
        ctx.fillRect(p.x - s * 0.75, baseY + dy * s - s * 0.02, s * 1.5, s * 0.04);
        ctx.fillStyle = DGN_IRON_LIT;
        ctx.fillRect(p.x - s * 0.75, baseY + dy * s - s * 0.02, s * 1.5, s * 0.016);
        // Rust takes both dead ends of the line.
        ctx.fillStyle = 'rgba(122, 74, 48, 0.55)';
        ctx.fillRect(p.x - s * 0.75, baseY + dy * s - s * 0.02, s * 0.18, s * 0.04);
        ctx.fillRect(p.x + s * 0.53, baseY + dy * s - s * 0.02, s * 0.22, s * 0.04);
      }
      // Wheels (behind the hopper but proud BELOW it): rimmed
      // iron discs on rust-bright hubs, the hash's pick leaning
      // off plumb — a cart must show its wheels or it's a tub.
      const wheel = (wx: number, tilt: number): void => {
        ctx.save();
        ctx.translate(wx, wheelY + s * 0.04);
        ctx.rotate(tilt);
        ctx.fillStyle = DGN_IRON;
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.125, s * 0.125, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = DGN_IRON_LIT;
        ctx.lineWidth = Math.max(1, s * 0.022);
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.1, s * 0.1, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = DGN_RUST_LIT;
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.038, s * 0.038, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      wheel(p.x - hwB * 0.72, 0);
      wheel(p.x + hwB * 0.72, m * 0.16);
      // The hopper: a riveted iron tub, wider at the rim — the
      // trapezoid IS the silhouette, held a full value step off
      // the flagstone dark (the kit's value law).
      const hwF = hwB * 0.78; // half-width at the foot
      ctx.fillStyle = '#565060';
      ctx.beginPath();
      ctx.moveTo(p.x - hwF, wheelY - s * 0.06);
      ctx.lineTo(p.x - hwB, rimY);
      ctx.lineTo(p.x + hwB, rimY);
      ctx.lineTo(p.x + hwF, wheelY - s * 0.06);
      ctx.closePath();
      ctx.fill();
      // Two horizontal strap bands with rivet pips; rust maps
      // where the straps trapped the wet.
      for (const f of [0.3, 0.72]) {
        const yb = wheelY - s * 0.06 - (cartH - s * 0.11) * f;
        const wb = hwF + (hwB - hwF) * f;
        ctx.fillStyle = DGN_IRON;
        ctx.fillRect(p.x - wb, yb - s * 0.026, wb * 2, s * 0.052);
        ctx.fillStyle = 'rgba(122, 74, 48, 0.55)';
        ctx.fillRect(p.x - wb, yb - s * 0.026, wb * 0.55, s * 0.052);
        ctx.fillStyle = DGN_IRON_LIT;
        for (const rx of [-0.72, -0.28, 0.24, 0.68]) {
          ctx.fillRect(p.x + wb * rx - s * 0.011, yb - s * 0.011, s * 0.022, s * 0.022);
        }
      }
      // One lit flank lane turns the tub; a dent shadow answers.
      ctx.fillStyle = 'rgba(168, 164, 188, 0.3)';
      ctx.beginPath();
      ctx.moveTo(p.x - hwF * 0.8, wheelY - s * 0.06);
      ctx.lineTo(p.x - hwB * 0.8, rimY);
      ctx.lineTo(p.x - hwB * 0.55, rimY);
      ctx.lineTo(p.x - hwF * 0.5, wheelY - s * 0.06);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
      ctx.beginPath();
      facetBlob(ctx, p.x + m * hwB * 0.5, rimY + cartH * 0.35, s * 0.07, h ^ 0x47, 5, 0.85);
      ctx.fill();
      // THE TOP PLANE: the rim ellipse. Empty carts show the
      // dark tub and the far inner wall catching what light the
      // cave has; loaded ones heap their haul over the rim.
      ctx.fillStyle = DGN_IRON;
      ctx.beginPath();
      ctx.ellipse(p.x, rimY, hwB, syT * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      if (loadRoll === 0) {
        ctx.fillStyle = '#1c1824';
        ctx.beginPath();
        ctx.ellipse(p.x, rimY + s * 0.012, hwB * 0.86, syT * 0.19, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(120, 116, 140, 0.35)';
        ctx.beginPath();
        ctx.ellipse(p.x, rimY - syT * 0.1, hwB * 0.7, syT * 0.07, 0, Math.PI, Math.PI * 2);
        ctx.fill();
      } else {
        const oreC = loadRoll === 1 ? '#2a2530' : '#4f4959';
        const glintC = loadRoll === 1 ? '#4a4456' : '#c77b4a';
        ctx.fillStyle = oreC;
        ctx.beginPath();
        ctx.ellipse(p.x, rimY - s * 0.055, hwB * 0.85, syT * 0.26, 0, 0, Math.PI * 2);
        ctx.fill();
        // The heap reads as CHUNKS, not a mound: faceted lumps
        // dealt across the load, the vein mineral glinting on a
        // stingy few (a full cart nobody hauled out — the find).
        for (let k = 0; k < 6; k++) {
          const hk = hashCoords(101 + k, tx, ty);
          const ox = (((hk % 100) / 100) - 0.5) * hwB * 1.3;
          const oy = -s * 0.05 - ((hk >>> 7) % 14) / 100 * s + Math.abs(ox) * 0.16;
          ctx.fillStyle = (hk & 3) === 0 ? glintC : shade(oreC, ((hk >> 2) & 1) === 0 ? 10 : 20);
          ctx.beginPath();
          facetCircle(ctx, p.x + ox, rimY + oy, s * (0.05 + ((hk >>> 4) & 3) * 0.012), 5, 0.3, 0.7);
          ctx.fill();
        }
      }
    },
  };
}

function paintBurialUrns(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.22;
  // The quiet dead: a huddle of grave urns — one tall amphora
  // and its two small kin, dealt back-to-front by hash. Turned
  // clay with painted grave-bands, wax caps sealed against the
  // damp; on some huddles one small urn lies cracked, its ash
  // and a bone chip spilled — somebody got here first.
  const m = ((h >> 4) & 1) === 0 ? 1 : -1;
  const robbed = ((h >> 7) & 3) === 0;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.6, 0.95, 0.5),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.3, s * 0.1),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.26)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY, s * 0.4, s * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
      // One urn: a turned profile — foot, swollen shoulder, neck
      // — with the dark flank keeping it a cylinder, two painted
      // grave-bands, and the wax seal's pale disc on top.
      const urn = (cx: number, cy: number, ht: number, hs2: number): void => {
        const w = ht * 0.42;
        ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + s * 0.008, w * 1.1, s * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
        const body = (hs2 & 1) === 0 ? DGN_CLAY : '#96704a';
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.5, cy);
        ctx.quadraticCurveTo(cx - w * 1.18, cy - ht * 0.42, cx - w * 0.42, cy - ht * 0.78);
        ctx.lineTo(cx - w * 0.34, cy - ht);
        ctx.lineTo(cx + w * 0.34, cy - ht);
        ctx.lineTo(cx + w * 0.42, cy - ht * 0.78);
        ctx.quadraticCurveTo(cx + w * 1.18, cy - ht * 0.42, cx + w * 0.5, cy);
        ctx.closePath();
        ctx.fill();
        // Turned-form shading: dark flank, lit answer.
        ctx.fillStyle = 'rgba(58, 38, 26, 0.35)';
        ctx.beginPath();
        ctx.moveTo(cx + w * 0.3, cy);
        ctx.quadraticCurveTo(cx + w * 0.95, cy - ht * 0.42, cx + w * 0.3, cy - ht * 0.82);
        ctx.lineTo(cx + w * 0.12, cy - ht * 0.82);
        ctx.quadraticCurveTo(cx + w * 0.6, cy - ht * 0.42, cx + w * 0.14, cy);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(224, 196, 148, 0.3)';
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.42, cy - ht * 0.12);
        ctx.quadraticCurveTo(cx - w * 0.9, cy - ht * 0.42, cx - w * 0.36, cy - ht * 0.7);
        ctx.lineTo(cx - w * 0.2, cy - ht * 0.7);
        ctx.quadraticCurveTo(cx - w * 0.62, cy - ht * 0.42, cx - w * 0.24, cy - ht * 0.12);
        ctx.closePath();
        ctx.fill();
        // Two grave-bands: a wide field with tally ticks (the
        // potter's meander said small) and a thin line under it.
        const bandY = cy - ht * 0.58;
        const bandW = w * (1 + 0.16 * Math.sin(1.2));
        ctx.fillStyle = '#4a3a30';
        ctx.fillRect(cx - bandW * 0.96, bandY - ht * 0.07, bandW * 1.92, ht * 0.11);
        ctx.fillStyle = DGN_CLAY_LIT;
        for (let k2 = -2; k2 <= 2; k2++) {
          ctx.fillRect(cx + k2 * bandW * 0.36 - w * 0.035, bandY - ht * 0.045, w * 0.07, ht * 0.065);
        }
        ctx.fillStyle = '#4a3a30';
        ctx.fillRect(cx - w * 0.88, cy - ht * 0.32, w * 1.76, Math.max(1, ht * 0.03));
        // The mouth ring seats the seal — clay first, then wax.
        ctx.fillStyle = '#4a3a30';
        ctx.beginPath();
        ctx.ellipse(cx, cy - ht, w * 0.4, syT * 0.13, 0, 0, Math.PI * 2);
        ctx.fill();
        // The wax seal: a SMALL warm disc with one drip run —
        // kept quiet so the huddle reads as pots, never as eggs
        // in a basket (the map-scale audit's verdict).
        ctx.fillStyle = '#c9b791';
        ctx.beginPath();
        ctx.ellipse(cx, cy - ht, w * 0.26, syT * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(154, 140, 108, 0.8)';
        ctx.fillRect(cx + w * 0.16, cy - ht + s * 0.008, w * 0.08, ht * 0.09);
      };
      // The kin first (behind), then the tall one owns the front.
      urn(p.x - m * s * 0.24, baseY - syT * 0.1, s * 0.32, hashCoords(113, tx, ty));
      if (robbed) {
        // The cracked kin: on its side, mouth toward the camera,
        // ash fanned out with one bone chip in it.
        const cx = p.x + m * s * 0.26;
        ctx.fillStyle = 'rgba(64, 58, 52, 0.6)';
        ctx.beginPath();
        ctx.ellipse(cx + m * s * 0.1, baseY + s * 0.02, s * 0.14, s * 0.05, m * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(cx, baseY - s * 0.07);
        ctx.rotate(m * 1.35);
        ctx.fillStyle = '#96704a';
        ctx.beginPath();
        ctx.moveTo(-s * 0.055, 0);
        ctx.quadraticCurveTo(-s * 0.14, -s * 0.11, -s * 0.05, -s * 0.2);
        ctx.lineTo(s * 0.05, -s * 0.2);
        ctx.quadraticCurveTo(s * 0.14, -s * 0.11, s * 0.055, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#241a2e';
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.2, s * 0.05, s * 0.02, 0, 0, Math.PI * 2);
        ctx.fill();
        // The crack: a dark lightning line across the shoulder.
        ctx.strokeStyle = 'rgba(36, 26, 46, 0.7)';
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(-s * 0.04, -s * 0.04);
        ctx.lineTo(0, -s * 0.1);
        ctx.lineTo(-s * 0.025, -s * 0.16);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = DGN_BONE;
        ctx.fillRect(cx + m * s * 0.16, baseY - s * 0.015, s * 0.06, s * 0.025);
      } else {
        urn(p.x + m * s * 0.26, baseY - syT * 0.04, s * 0.28, hashCoords(127, tx, ty));
      }
      urn(p.x - m * s * 0.02, baseY, s * 0.52, h);
    },
  };
}

function paintChainedSkeleton(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, game, tile, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  // THE WALL FIXTURES: the prop owns a FLOOR cell, but its iron
  // lives on the wall face NORTH of it — the only face the
  // camera sees. The wall base line is this tile's north edge;
  // heights climb the face from there. With no honest wall
  // behind (a Studio stamp in the open), each piece falls back
  // to a driven timber post so the art never orphans.
  const wn = game.world.groundAt(tx, ty - 1);
  const walled =
    wn === Tile.CaveWall ||
    wn === Tile.CrackedCaveWall ||
    wn === Tile.WallStone ||
    wn === Tile.WallGarrison ||
    wn === Tile.WallWood;
  const wallBase = p.y - syT * 0.5;
  // Fixtures sort with the wall row they cling to: anything
  // standing in the cell (the player included) draws over them,
  // exactly as a body passing a mounted bracket should.
  const fixSort = ty + 0.3;
  const post = (px: number, ht: number): void => {
    const ctx = rend.ctx;
    ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
    ctx.beginPath();
    ctx.ellipse(px, wallBase + s * 0.02, s * 0.11, s * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(PALI_LOG, -6);
    ctx.fillRect(px - s * 0.05, wallBase - ht, s * 0.1, ht);
    ctx.fillStyle = shade(PALI_LOG, 10);
    ctx.fillRect(px - s * 0.05, wallBase - ht, s * 0.032, ht);
  };
  // A run of chain: hard-edged figure-8 links laid along a
  // quadratic sag, alternating tall and flat the way a hung
  // chain actually turns its links to the eye.
  const chainRun = (
    x0: number,
    y0: number,
    cx: number,
    cy: number,
    x1: number,
    y1: number,
    col: string,
  ): void => {
    const ctx = rend.ctx;
    const n = Math.max(5, Math.round(Math.hypot(x1 - x0, y1 - y0) / (s * 0.055)));
    for (let k = 0; k <= n; k++) {
      const f = k / n;
      const g = 1 - f;
      const lx = g * g * x0 + 2 * g * f * cx + f * f * x1;
      const ly = g * g * y0 + 2 * g * f * cy + f * f * y1;
      ctx.fillStyle = col;
      if ((k & 1) === 0) ctx.fillRect(lx - s * 0.014, ly - s * 0.026, s * 0.028, s * 0.052);
      else ctx.fillRect(lx - s * 0.02, ly - s * 0.016, s * 0.04, s * 0.032);
    }
  };

  if (tile === Tile.WallSconce) {
    // A wrought cage bracket: strap plate bolted to the stone,
    // scroll arm, three-rib basket, and the flame that keeps the
    // dark honest — burning at full no matter the surface hour
    // (the lightmap punch stays flame-gated in the light scan).
    const mountY = wallBase - s * 1.02;
    const flick = 0.8 + Math.sin(t * 13 + h) * 0.13 + Math.sin(t * 29 + h * 0.3) * 0.07;
    return {
      sortY: fixSort,
      body: stationBody(0.5, 2.1, 0.15),
      draw: () => {
        // Draw-time ctx capture: the outline pass swaps rend.ctx
        // to its scratch — the build-time capture would paint past it.
        const ctx = rend.ctx;
        if (!walled) post(p.x, s * 1.35);
        const bx = p.x;
        // Firelight laps the floor of the cell below — a
        // whisper only (the live light pass throws the real
        // pool; the first audit read a louder lap as a stain).
        ctx.fillStyle = `rgba(232, 122, 51, ${0.04 * flick})`;
        ctx.beginPath();
        ctx.ellipse(bx, p.y + syT * 0.1, s * 0.5, s * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        // …and washes the stone around the basket.
        ctx.fillStyle = `rgba(232, 140, 62, ${0.1 * flick})`;
        ctx.beginPath();
        ctx.ellipse(bx, mountY - s * 0.1, s * 0.42, s * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
        // Soot fan where a thousand nights went up.
        ctx.fillStyle = 'rgba(16, 12, 20, 0.35)';
        ctx.beginPath();
        ctx.moveTo(bx - s * 0.1, mountY - s * 0.3);
        ctx.quadraticCurveTo(bx, mountY - s * 0.72, bx + s * 0.02, mountY - s * 0.3);
        ctx.closePath();
        ctx.fill();
        // The strap plate and its two bolt pips.
        ctx.fillStyle = DGN_IRON;
        ctx.fillRect(bx - s * 0.045, mountY - s * 0.16, s * 0.09, s * 0.4);
        ctx.fillStyle = DGN_IRON_LIT;
        ctx.fillRect(bx - s * 0.045, mountY - s * 0.16, s * 0.028, s * 0.4);
        for (const dy of [-0.1, 0.18]) {
          ctx.fillStyle = DGN_RUST_LIT;
          ctx.fillRect(bx - s * 0.014, mountY + dy * s - s * 0.014, s * 0.028, s * 0.028);
        }
        // The scroll arm steps the basket off the stone.
        ctx.strokeStyle = DGN_IRON;
        ctx.lineWidth = Math.max(1.5, s * 0.036);
        ctx.beginPath();
        ctx.moveTo(bx, mountY + s * 0.16);
        ctx.quadraticCurveTo(bx + s * 0.02, mountY + s * 0.3, bx, mountY + s * 0.34);
        ctx.stroke();
        // The basket: a flared iron cup, three ribs and two
        // rings, rust taking the down-weather side.
        const ky = mountY + s * 0.02;
        ctx.fillStyle = DGN_IRON;
        ctx.beginPath();
        ctx.moveTo(bx - s * 0.13, ky - s * 0.12);
        ctx.lineTo(bx + s * 0.13, ky - s * 0.12);
        ctx.lineTo(bx + s * 0.055, ky + s * 0.14);
        ctx.lineTo(bx - s * 0.055, ky + s * 0.14);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = DGN_IRON_LIT;
        ctx.lineWidth = Math.max(1, s * 0.018);
        for (const fx of [-0.75, 0, 0.75]) {
          ctx.beginPath();
          ctx.moveTo(bx + s * 0.12 * fx, ky - s * 0.12);
          ctx.lineTo(bx + s * 0.05 * fx, ky + s * 0.13);
          ctx.stroke();
        }
        ctx.strokeStyle = DGN_RUST;
        ctx.beginPath();
        ctx.moveTo(bx - s * 0.13, ky - s * 0.12);
        ctx.lineTo(bx + s * 0.13, ky - s * 0.12);
        ctx.stroke();
        // Flame: one ragged lick and its hot core.
        const fy = ky - s * 0.14;
        ctx.fillStyle = '#e8823d';
        ctx.beginPath();
        ctx.moveTo(bx - s * 0.1 * flick, fy);
        ctx.quadraticCurveTo(bx - s * 0.08, fy - s * 0.26 * flick, bx + s * 0.01, fy - s * 0.36 * flick);
        ctx.quadraticCurveTo(bx + s * 0.09, fy - s * 0.2, bx + s * 0.1 * flick, fy);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#f2c94c';
        ctx.beginPath();
        ctx.moveTo(bx - s * 0.045 * flick, fy);
        ctx.quadraticCurveTo(bx - s * 0.01, fy - s * 0.18 * flick, bx + s * 0.02, fy - s * 0.22 * flick);
        ctx.quadraticCurveTo(bx + s * 0.05, fy - s * 0.12, bx + s * 0.045 * flick, fy);
        ctx.closePath();
        ctx.fill();
        // One ember spitting off the cage.
        const ph = (t * 0.8 + h * 0.11) % 1;
        ctx.fillStyle = `rgba(255, 190, 110, ${(1 - ph) * 0.7})`;
        ctx.fillRect(bx + Math.sin(t * 2.9 + h) * s * 0.05, fy - s * 0.2 - ph * s * 0.3, s * 0.022, s * 0.022);
      },
    };
  }

  if (tile === Tile.WallChains) {
    // Haulage the mountain kept: two bolt plates high on the
    // stone, a heavy swag sagging between them, and a working
    // tail ending in an empty shackle — swinging on air nobody
    // felt move (barely: the deep is still).
    const m = ((h >> 4) & 1) === 0 ? 1 : -1;
    const sway = Math.sin(t * 0.7 + h * 0.5) * s * 0.022;
    const bAx = p.x - s * 0.26 * m;
    const bBx = p.x + s * 0.3 * m;
    const bAy = wallBase - s * 1.42;
    const bBy = wallBase - s * 1.18;
    const cuffX = bBx + m * s * 0.05 + sway;
    const cuffY = wallBase - s * 0.38;
    return {
      sortY: fixSort,
      body: stationBody(0.55, 2.05, 0.15),
      draw: () => {
        // Draw-time ctx capture: the outline pass swaps rend.ctx
        // to its scratch — the build-time capture would paint past it.
        const ctx = rend.ctx;
        if (!walled) {
          post(bAx, s * 1.6);
          post(bBx, s * 1.36);
        }
        // Rust bleeds down the stone from both bolts — the
        // stain is half the story.
        for (const [bx2, by2] of [
          [bAx, bAy],
          [bBx, bBy],
        ] as const) {
          ctx.fillStyle = 'rgba(122, 74, 48, 0.28)';
          ctx.beginPath();
          ctx.moveTo(bx2 - s * 0.045, by2);
          ctx.lineTo(bx2 + s * 0.045, by2);
          ctx.lineTo(bx2 + s * 0.02, by2 + s * 0.55);
          ctx.lineTo(bx2 - s * 0.015, by2 + s * 0.55);
          ctx.closePath();
          ctx.fill();
          // The bolt plate: a square pad and its pin.
          ctx.fillStyle = DGN_IRON;
          ctx.fillRect(bx2 - s * 0.055, by2 - s * 0.055, s * 0.11, s * 0.11);
          ctx.fillStyle = DGN_IRON_LIT;
          ctx.fillRect(bx2 - s * 0.055, by2 - s * 0.055, s * 0.11, s * 0.024);
          ctx.fillStyle = DGN_RUST_LIT;
          ctx.beginPath();
          ctx.ellipse(bx2, by2, s * 0.02, s * 0.02, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // The dead swag between the bolts hangs heavy…
        chainRun(bAx, bAy + s * 0.05, (bAx + bBx) / 2, wallBase - s * 0.72, bBx, bBy + s * 0.05, DGN_IRON);
        chainRun(
          bAx,
          bAy + s * 0.05,
          (bAx + bBx) / 2 + s * 0.01,
          wallBase - s * 0.73,
          (bAx + bBx) / 2 + s * 0.04,
          wallBase - s * 0.7,
          DGN_IRON_LIT,
        );
        // …and the working tail falls to the shackle.
        chainRun(bBx, bBy + s * 0.05, bBx + m * s * 0.02, wallBase - s * 0.76, cuffX, cuffY - s * 0.07, DGN_IRON);
        // The empty cuff: an open shackle with its hinge pip
        // and pin ear — nobody in it, which is its own story.
        ctx.strokeStyle = DGN_RUST;
        ctx.lineWidth = Math.max(1.5, s * 0.032);
        ctx.beginPath();
        ctx.arc(cuffX, cuffY, s * 0.06, Math.PI * 0.75, Math.PI * 2.55);
        ctx.stroke();
        ctx.fillStyle = DGN_IRON_LIT;
        ctx.fillRect(cuffX - s * 0.014, cuffY - s * 0.088, s * 0.028, s * 0.028);
      },
    };
  }

  // Tile.ChainedSkeleton — the prisoner the dark forgot. Bones
  // slumped at the wall's foot, both wrists still up in the
  // irons; the skull has tipped to its shoulder and the ribs
  // have half let go. Hash deals the slump side, and on some,
  // one shackle stands EMPTY with the freed arm fallen in the
  // lap — the crawler's imagination does the rest.
  const m = ((h >> 4) & 1) === 0 ? 1 : -1;
  const freed = ((h >> 9) & 3) === 0;
  const cLx = p.x - s * 0.3;
  const cRx = p.x + s * 0.3;
  const cY = wallBase - s * 0.98;
  const pelvX = p.x + m * s * 0.05;
  const pelvY = wallBase + syT * 0.16;
  return {
    sortY: ty + 0.35,
    body: stationBody(0.55, 1.75, 0.35),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      if (!walled) post(p.x, s * 1.3);
      // Contact shade where the bones bed on the floor.
      ctx.fillStyle = 'rgba(12, 8, 20, 0.26)';
      ctx.beginPath();
      ctx.ellipse(pelvX, pelvY + s * 0.06, s * 0.32, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // Wall bolts and the short chains to each cuff.
      for (const [bx2, cuffX, cuffFull] of [
        [cLx + s * 0.04, cLx, m > 0 || !freed],
        [cRx - s * 0.04, cRx, m < 0 || !freed],
      ] as const) {
        ctx.fillStyle = DGN_IRON;
        ctx.fillRect(bx2 - s * 0.04, cY - s * 0.3 - s * 0.04, s * 0.08, s * 0.08);
        ctx.fillStyle = 'rgba(122, 74, 48, 0.25)';
        ctx.fillRect(bx2 - s * 0.02, cY - s * 0.26, s * 0.045, s * 0.4);
        chainRun(bx2, cY - s * 0.26, bx2 + s * 0.015, cY - s * 0.12, cuffX, cY, DGN_IRON);
        // The cuff — shut on bone, or hanging open and empty.
        ctx.strokeStyle = DGN_RUST;
        ctx.lineWidth = Math.max(1.5, s * 0.03);
        ctx.beginPath();
        if (cuffFull) ctx.arc(cuffX, cY + s * 0.03, s * 0.045, 0, Math.PI * 2);
        else ctx.arc(cuffX, cY + s * 0.04, s * 0.05, Math.PI * 0.7, Math.PI * 2.4);
        ctx.stroke();
      }
      // One arm: humerus to a dropped elbow, forearm up to the
      // cuff — bones read as two straight runs meeting at a
      // knuckle, never a curve.
      const arm = (sx: number, sy: number, ex: number, ey: number, wx: number, wy: number): void => {
        ctx.strokeStyle = DGN_BONE_DIM;
        ctx.lineWidth = Math.max(1.5, s * 0.036);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.strokeStyle = DGN_BONE;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(wx, wy);
        ctx.stroke();
        ctx.fillStyle = DGN_BONE;
        ctx.beginPath();
        ctx.ellipse(ex, ey, s * 0.028, s * 0.028, 0, 0, Math.PI * 2);
        ctx.fill();
      };
      const shY = wallBase - s * 0.52;
      const shLx = pelvX - s * 0.14;
      const shRx = pelvX + s * 0.14;
      if (m > 0 || !freed) arm(shLx, shY, cLx - s * 0.05, cY + s * 0.3, cLx, cY + s * 0.06);
      if (m < 0 || !freed) arm(shRx, shY, cRx + s * 0.05, cY + s * 0.32, cRx, cY + s * 0.06);
      // The freed arm lies across the lap instead.
      if (freed) {
        const fx2 = m > 0 ? shRx : shLx;
        arm(fx2, shY, pelvX + m * s * 0.2, pelvY - s * 0.06, pelvX - m * s * 0.1, pelvY + s * 0.02);
      }
      // The spine leans into the slump; ribs hang off it in
      // three arcs over a chest gone dark.
      ctx.strokeStyle = DGN_BONE_DIM;
      ctx.lineWidth = Math.max(1.5, s * 0.03);
      ctx.beginPath();
      ctx.moveTo(pelvX, pelvY - s * 0.05);
      ctx.quadraticCurveTo(pelvX + m * s * 0.03, wallBase - s * 0.3, pelvX + m * s * 0.09, shY - s * 0.06);
      ctx.stroke();
      ctx.fillStyle = 'rgba(24, 18, 32, 0.55)';
      ctx.beginPath();
      ctx.ellipse(pelvX + m * s * 0.02, wallBase - s * 0.32, s * 0.13, s * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = DGN_BONE;
      ctx.lineWidth = Math.max(1, s * 0.024);
      for (let k = 0; k < 3; k++) {
        const ry = wallBase - s * (0.42 - k * 0.09);
        ctx.beginPath();
        ctx.arc(pelvX + m * s * 0.03, ry, s * (0.15 - k * 0.02), Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      }
      // Collarbones seat the shoulders.
      ctx.beginPath();
      ctx.moveTo(shLx, shY);
      ctx.lineTo(pelvX + m * s * 0.09, shY - s * 0.03);
      ctx.lineTo(shRx, shY);
      ctx.stroke();
      // The pelvis bowl and folded legs: femur out, shin back —
      // knees dropped sideways the way a seated body settles.
      ctx.fillStyle = DGN_BONE_DIM;
      ctx.beginPath();
      facetCircle(ctx, pelvX, pelvY - s * 0.03, s * 0.085, 6, 0.35, 0.6);
      ctx.fill();
      ctx.strokeStyle = DGN_BONE;
      ctx.lineWidth = Math.max(1.5, s * 0.038);
      ctx.beginPath();
      ctx.moveTo(pelvX + m * s * 0.03, pelvY);
      ctx.lineTo(pelvX + m * s * 0.3, pelvY + s * 0.03);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pelvX + m * s * 0.3, pelvY + s * 0.03);
      ctx.lineTo(pelvX + m * s * 0.44, pelvY - s * 0.05);
      ctx.stroke();
      ctx.fillStyle = DGN_BONE;
      ctx.beginPath();
      ctx.ellipse(pelvX + m * s * 0.3, pelvY + s * 0.03, s * 0.026, s * 0.026, 0, 0, Math.PI * 2);
      ctx.ellipse(pelvX + m * s * 0.46, pelvY - s * 0.06, s * 0.03, s * 0.02, 0, 0, Math.PI * 2);
      ctx.fill();
      // What's left of the shift: a rag at the hips, hem torn.
      ctx.fillStyle = ((h >> 11) & 1) === 0 ? '#4a4034' : '#3f4448';
      ctx.beginPath();
      ctx.moveTo(pelvX - s * 0.1, pelvY - s * 0.1);
      ctx.lineTo(pelvX + s * 0.1, pelvY - s * 0.1);
      ctx.lineTo(pelvX + s * 0.13, pelvY + s * 0.05);
      ctx.lineTo(pelvX + s * 0.05, pelvY + s * 0.01);
      ctx.lineTo(pelvX - s * 0.02, pelvY + s * 0.06);
      ctx.lineTo(pelvX - s * 0.12, pelvY + s * 0.02);
      ctx.closePath();
      ctx.fill();
      // The skull, tipped to the slump shoulder: dome, hard
      // brow, socket voids — it looks at the floor, not at you.
      const skx = pelvX + m * s * 0.12;
      const sky = shY - s * 0.14;
      ctx.save();
      ctx.translate(skx, sky);
      ctx.rotate(m * 0.5);
      ctx.fillStyle = DGN_BONE;
      ctx.beginPath();
      facetCircle(ctx, 0, 0, s * 0.105, 6, 0.4, 0.85);
      ctx.fill();
      ctx.fillStyle = '#ddd6c0';
      ctx.beginPath();
      facetCircle(ctx, -s * 0.015, -s * 0.025, s * 0.075, 6, 0.4, 0.8);
      ctx.fill();
      ctx.fillStyle = '#241a2e';
      ctx.beginPath();
      ctx.ellipse(-s * 0.038, s * 0.012, s * 0.023, s * 0.028, 0, 0, Math.PI * 2);
      ctx.ellipse(s * 0.02, s * 0.012, s * 0.023, s * 0.028, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = DGN_BONE_DIM;
      ctx.fillRect(-s * 0.05, s * 0.062, s * 0.1, s * 0.024);
      ctx.restore();
      // A few finger bones where a hand let go.
      rend.rubble(pelvX + m * s * 0.1, p.y - s * 0.1, s * 0.5, h ^ 0x65, [DGN_BONE, DGN_BONE_DIM]);
    },
  };
}

export const DUNGEON_PROPS: PropEntries = [
  [[Tile.Barrel], paintBarrel],
  [[Tile.Crate, Tile.CrateGoods], paintCrate],
  [[Tile.Stalagmite], paintStalagmite],
  [[Tile.BonePile], paintBonePile],
  [[Tile.Brazier], paintBrazier],
  [[Tile.GlowShroom], paintGlowShroom],
  [[Tile.MossBarrel], paintMossBarrel],
  [[Tile.MineCart], paintMineCart],
  [[Tile.BurialUrns], paintBurialUrns],
  [[Tile.ChainedSkeleton, Tile.WallSconce, Tile.WallChains], paintChainedSkeleton],
];
