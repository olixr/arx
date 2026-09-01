/**
 * THE ELVEN COURT — beacons, harps, looms, moonwells: the arcane and elven set.
 * Extracted verbatim from renderer.ts's objectItem (THE PROP HALL,
 * foundations F1) — each painter is one former switch case; the frame
 * and host contracts live in ./types.ts.
 */
import { shade } from '../rig.js';
import { facetCircle } from '../shapes.js';
import { Tile } from '@arx/shared';
import type { DrawItem } from '../renderer.js';
import type { PropEntries, PropFrame, PropHost } from './types.js';

// THE FAIR HOUSE FURNISHED: the elven material trinity. Silverbark
// timber (pale and cool — never the camp's mud), mithril (the ore's
// canonical sky-blue #7fa8d9 for veins and devices, a greyer body
// tone for worked fittings, and the one HARD lit edge the kit allows
// itself — metal earns it), and moonglass (the cool light-carrier).
// Silks are moonpale; the single warm accent is gold thread, used
// small, so the whole kit stays cold against the war camp's amber.
const ELF_WOOD = '#a39072';
const ELF_MITHRIL = '#8fa3bd';
const ELF_MITHRIL_LIT = '#dce9f8';
const ELF_VEIN = '#7fa8d9';
const ELF_GLASS = '#9fe0d8';
const ELF_SILK = '#cdd8ec';
const ELF_GOLD = '#c8a95e';
const ELF_MARBLE = '#ded8ce';
const ELF_LEAF = '#5d8a6e';
// THE IMBUED LANE: worked magic — stone that floats, glyphs that
// orbit. Two arcanes ONLY: violet (the enchanting table's own
// family) leads, mana-green answers. Auroras breathe, beams are
// banned, and every float/orbit/pulse clock stays under 4Hz.
const ARC_VIOLET = '#b48fe8';
const ARC_VIOLET_DEEP = '#7a6aa8';
const ARC_GREEN = '#7fe8a8';
const ARC_GREEN_DEEP = '#3fae6e';


// ---------------------------------- THE FAIR HOUSE FURNISHED
// The elven decor kit (docs/elven-decor-plan.md). Where the war
// camp above is crooked, lashed, and amber-lit, everything here
// is swept, sprung, and moonlit: one long bow per silhouette
// (THE SWEPT LINE), joinery that forks and grows instead of
// kinking (GROWN, NEVER LASHED — no rope anywhere in the kit),
// and every glow cool silver-blue (the camp owns orange). Same
// laws as every prop: measured against the 1.15-tile body, top
// planes shown to the tilted bird's eye, cached ring for ink.
function paintArcaneBeacon(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // THE STONE FLOATS: the master crystal rides a slow bob and
  // three glyph shards orbit it — the front pass burns bright,
  // the rear pass dims behind the crystal (the orbit sells the
  // depth). Every clock in here is <4Hz, cadence-safe.
  const bob = Math.sin(t * 0.8 + h * 0.4) * s * 0.035;
  const cx2 = p.x;
  const cy2 = baseY - s * 0.98 + bob;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.62, 1.9, 0.45),
    drawShadow: () => rend.castContact(p.x, baseY + s * 0.02, s * 0.3, s * 0.1),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      const pulse = 0.75 + 0.25 * Math.sin(t * 1.1 + h * 0.7);
      // The ground remembers the working: a faint rune circle
      // with four way-marks.
      ctx.strokeStyle = `rgba(180, 143, 232, ${0.16 + 0.1 * pulse})`;
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.beginPath();
      ctx.ellipse(p.x, baseY, s * 0.4, syT * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(180, 143, 232, ${0.3 + 0.2 * pulse})`;
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI / 2) * i + 0.4;
        ctx.fillRect(
          p.x + Math.cos(a) * s * 0.4 - s * 0.012,
          baseY + Math.sin(a) * syT * 0.22 - s * 0.012,
          s * 0.024,
          s * 0.024,
        );
      }
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, s * 0.3, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      // Three tilted rune-stones lean toward the light they
      // raised — dark stone, one carved glyph each, glowing.
      const stone = (sx2: number, lean: number, sh2: number, tone: number) => {
        ctx.fillStyle = shade('#57535f', tone);
        ctx.beginPath();
        ctx.moveTo(sx2 - s * 0.07, baseY);
        ctx.lineTo(sx2 + s * 0.07, baseY);
        ctx.lineTo(sx2 + lean + s * 0.035, baseY - sh2);
        ctx.lineTo(sx2 + lean - s * 0.035, baseY - sh2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = `rgba(180, 143, 232, ${0.5 + 0.3 * pulse})`;
        ctx.fillRect(sx2 + lean * 0.55 - s * 0.012, baseY - sh2 * 0.62, s * 0.024, sh2 * 0.3);
      };
      stone(p.x, s * 0.01, s * 0.3, -26);
      stone(p.x - s * 0.24, s * 0.09, s * 0.42, -6);
      stone(p.x + s * 0.24, -s * 0.09, s * 0.44, -14);
      // THE AURORA BREATHES: two translucent veils above the
      // crystal on offset clocks — never a hard beam.
      const veil = (ph: number, wide: number, tone: string) => {
        const wob = Math.sin(t * 0.5 + ph) * s * 0.05;
        ctx.fillStyle = tone;
        ctx.beginPath();
        ctx.moveTo(cx2 - wide + wob, cy2 - s * 0.1);
        ctx.quadraticCurveTo(cx2 - wide * 0.4 - wob, cy2 - s * 0.5, cx2 - wide * 0.7 + wob, cy2 - s * 0.86);
        ctx.lineTo(cx2 + wide * 0.5 + wob, cy2 - s * 0.8);
        ctx.quadraticCurveTo(cx2 + wide * 0.3 - wob, cy2 - s * 0.42, cx2 + wide + wob * 0.5, cy2 - s * 0.06);
        ctx.closePath();
        ctx.fill();
      };
      veil(1.2, s * 0.16, `rgba(180, 143, 232, ${0.1 + 0.06 * pulse})`);
      veil(3.8, s * 0.1, `rgba(127, 232, 168, ${0.08 + 0.05 * pulse})`);
      // THE GLYPH ORBITS: three shards on an elliptical track —
      // one runs green (THE TWO ARCANES answer each other).
      const orbiter = (k: number, front: boolean) => {
        const a = t * 0.7 + (k * Math.PI * 2) / 3 + h * 0.3;
        const ox = cx2 + Math.cos(a) * s * 0.3;
        const oy = cy2 + Math.sin(a) * syT * 0.16;
        if (Math.sin(a) > 0 !== front) return;
        // The rear pass stays LIGHT at low alpha — a dark dim
        // shard on grass read as grit, not magic.
        const al = front ? 0.95 : 0.5;
        ctx.fillStyle = k === 1 ? `rgba(178, 244, 205, ${al})` : `rgba(216, 196, 250, ${al})`;
        ctx.beginPath();
        ctx.moveTo(ox, oy - s * 0.058);
        ctx.lineTo(ox + s * 0.038, oy);
        ctx.lineTo(ox, oy + s * 0.058);
        ctx.lineTo(ox - s * 0.038, oy);
        ctx.closePath();
        ctx.fill();
      };
      for (let k = 0; k < 3; k++) orbiter(k, false);
      // THE MASTER CRYSTAL: one great faceted shard, point down
      // — lit west facet, deep east, a burning core seam.
      const cw = s * 0.14;
      const chh = s * 0.3;
      ctx.fillStyle = ARC_VIOLET_DEEP;
      ctx.beginPath();
      ctx.moveTo(cx2, cy2 + chh);
      ctx.lineTo(cx2 + cw, cy2 + chh * 0.25);
      ctx.lineTo(cx2 + cw * 0.55, cy2 - chh);
      ctx.lineTo(cx2 - cw * 0.55, cy2 - chh);
      ctx.lineTo(cx2 - cw, cy2 + chh * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = ARC_VIOLET;
      ctx.beginPath();
      ctx.moveTo(cx2, cy2 + chh);
      ctx.lineTo(cx2 - cw, cy2 + chh * 0.25);
      ctx.lineTo(cx2 - cw * 0.55, cy2 - chh);
      ctx.lineTo(cx2 - cw * 0.1, cy2 - chh);
      ctx.lineTo(cx2 - cw * 0.15, cy2 + chh * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(239, 230, 255, ${0.55 + 0.35 * pulse})`;
      ctx.fillRect(cx2 - s * 0.016, cy2 - chh * 0.8, s * 0.032, chh * 1.6);
      // Light spills from the point onto the stones below.
      ctx.fillStyle = `rgba(180, 143, 232, ${0.14 + 0.1 * pulse})`;
      ctx.beginPath();
      ctx.ellipse(cx2, baseY - s * 0.3, s * 0.24, s * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let k = 0; k < 3; k++) orbiter(k, true);
      // Motes drift UP into the aurora and go out.
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.3 + k * 0.33 + h * 0.11) % 1;
        const mx = cx2 + Math.sin(ph * 6 + k * 2.1) * s * 0.14;
        const my = cy2 - s * 0.2 - ph * s * 0.6;
        ctx.fillStyle = k === 1 ? `rgba(127, 232, 168, ${0.7 * (1 - ph)})` : `rgba(216, 196, 250, ${0.7 * (1 - ph)})`;
        ctx.fillRect(mx - s * 0.012, my - s * 0.012, s * 0.024, s * 0.024);
      }
    },
  };
}

function paintElvenBanner(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.14;
  const bx = p.x - s * 0.14;
  const topY = baseY - s * 2.02;
  const { sway, lag } = rend.breezeAt(tx, ty, t, tx * 1.9 + ty * 1.3, s, 0.02, 0.038);
  return {
    sortY: ty + 0.7,
    body: stationBody(0.72, 2.45, 0.45),
    drawShadow: () => {
      rend.castEdgeQuad(bx - s * 0.05, baseY, bx + s * 0.05, baseY, 1.9);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(bx, baseY + s * 0.015, s * 0.13, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      // Where the war standard kinks and mends, this pole stands
      // TRUE — one plumb silverbark taper, foot to finial.
      ctx.fillStyle = shade(ELF_WOOD, 4);
      ctx.beginPath();
      ctx.moveTo(bx - s * 0.042, baseY);
      ctx.lineTo(bx + s * 0.042, baseY);
      ctx.lineTo(bx + s * 0.02, topY);
      ctx.lineTo(bx - s * 0.02, topY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(ELF_WOOD, 18);
      ctx.fillRect(bx - s * 0.032, baseY - s * 1.9, s * 0.018, s * 1.9);
      // Mithril ferrule collars — the grown joint's silver ring
      // where the camp would knot a rope.
      ctx.fillStyle = shade(ELF_MITHRIL, -6);
      ctx.fillRect(bx - s * 0.045, baseY - s * 0.62, s * 0.09, s * 0.05);
      ctx.fillRect(bx - s * 0.04, baseY - s * 1.38, s * 0.08, s * 0.045);
      ctx.fillStyle = ELF_MITHRIL_LIT;
      ctx.fillRect(bx - s * 0.045, baseY - s * 0.62, s * 0.09, s * 0.014);
      ctx.fillRect(bx - s * 0.04, baseY - s * 1.38, s * 0.08, s * 0.013);
      // The crescent finial rides above the cloth.
      ctx.fillStyle = ELF_MITHRIL;
      ctx.beginPath();
      ctx.arc(bx, topY - s * 0.1, s * 0.095, -0.35, Math.PI + 0.35);
      ctx.arc(bx, topY - s * 0.145, s * 0.062, Math.PI + 0.55, -0.55, true);
      ctx.closePath();
      ctx.fill();
      // The crossbar carries the silk east.
      ctx.fillStyle = shade(ELF_MITHRIL, -10);
      ctx.fillRect(bx - s * 0.02, topY + s * 0.1, s * 0.56, s * 0.036);
      ctx.fillStyle = ELF_MITHRIL_LIT;
      ctx.fillRect(bx - s * 0.02, topY + s * 0.1, s * 0.56, s * 0.012);
      // THE SEWN BORDER (the herald's-row law): the border is a
      // trim-colored fill of the FULL silhouette with the field
      // inset within it — never a stroked line. The drop swings
      // as one body; only the swallow points trail the beat.
      const cx0 = bx + s * 0.09;
      const cw = s * 0.4;
      const cy0 = topY + s * 0.155;
      const cl = s * 1.22;
      const inset = s * 0.036;
      const silhouette = (inX: number) => {
        const x0 = cx0 + inX;
        const x1 = cx0 + cw - inX;
        const yb = cy0 + cl - inX * 1.6;
        ctx.beginPath();
        ctx.moveTo(x0, cy0 + inX);
        ctx.lineTo(x1, cy0 + inX);
        ctx.lineTo(x1 + sway * 0.55, cy0 + cl * 0.6);
        ctx.lineTo(x1 + sway * 0.8 + lag, yb);
        ctx.lineTo(cx0 + cw * 0.5 + sway * 0.7 + lag * 0.5, cy0 + cl * 0.78 + inX);
        ctx.lineTo(x0 + sway * 0.8 + lag, yb);
        ctx.lineTo(x0 + sway * 0.55, cy0 + cl * 0.6);
        ctx.closePath();
      };
      ctx.fillStyle = ELF_VEIN;
      silhouette(0);
      ctx.fill();
      ctx.fillStyle = ELF_SILK;
      silhouette(inset);
      ctx.fill();
      // The device: crescent over willow leaf, one gold star —
      // the four-motif heraldry and nothing else.
      const dx = cx0 + cw * 0.5 + sway * 0.3;
      const dy = cy0 + cl * 0.3;
      ctx.fillStyle = '#7ec4a8';
      ctx.beginPath();
      ctx.arc(dx, dy, s * 0.085, -0.3, Math.PI + 0.3);
      ctx.arc(dx, dy - s * 0.04, s * 0.058, Math.PI + 0.5, -0.5, true);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(dx, dy + s * 0.07);
      ctx.quadraticCurveTo(dx + s * 0.09, dy + s * 0.16, dx, dy + s * 0.3);
      ctx.quadraticCurveTo(dx - s * 0.09, dy + s * 0.16, dx, dy + s * 0.07);
      ctx.fill();
      ctx.fillStyle = ELF_GOLD;
      ctx.beginPath();
      facetCircle(ctx, dx, dy - s * 0.16, s * 0.028, 4, 0.79, 1);
      ctx.fill();
    },
  };
}

function paintElvenBench(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.3;
  const hw = s * 0.48;
  const seatY = baseY - s * 0.36;
  return {
    sortY: ty + 0.66,
    body: stationBody(0.68, 0.95, 0.5),
    drawShadow: () => rend.castContact(p.x, baseY + s * 0.02, s * 0.5, s * 0.12),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, hw * 1.08, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // Legs first: four swept arcs splaying to the floor — the
      // wood bowed once and held (THE SWEPT LINE).
      const leg = (lx: number, sgn: number, tone: number) => {
        ctx.fillStyle = shade(ELF_WOOD, tone);
        ctx.beginPath();
        ctx.moveTo(lx - s * 0.028, seatY + s * 0.05);
        ctx.lineTo(lx + s * 0.028, seatY + s * 0.05);
        ctx.quadraticCurveTo(lx + sgn * s * 0.06 + s * 0.02, baseY - s * 0.14, lx + sgn * s * 0.1 + s * 0.024, baseY);
        ctx.lineTo(lx + sgn * s * 0.1 - s * 0.024, baseY);
        ctx.quadraticCurveTo(lx + sgn * s * 0.06 - s * 0.02, baseY - s * 0.14, lx - s * 0.028, seatY + s * 0.05);
        ctx.closePath();
        ctx.fill();
      };
      leg(p.x - hw * 0.82, -1, -8);
      leg(p.x + hw * 0.82, 1, -8);
      leg(p.x - hw * 0.68, -1, 8);
      leg(p.x + hw * 0.68, 1, 2);
      // The apron under the seat holds the shadow line.
      ctx.fillStyle = shade(ELF_WOOD, -14);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.86, seatY + s * 0.02);
      ctx.quadraticCurveTo(p.x, seatY + s * 0.085, p.x + hw * 0.86, seatY + s * 0.02);
      ctx.lineTo(p.x + hw * 0.86, seatY + s * 0.08);
      ctx.quadraticCurveTo(p.x, seatY + s * 0.145, p.x - hw * 0.86, seatY + s * 0.08);
      ctx.closePath();
      ctx.fill();
      // The seat is a crescent in plan, so its top plane reads
      // as a bowed band — the brightest surface, sky-lit. The
      // whole piece keeps the SILVERBARK value key: pale enough
      // that it could never be mistaken for camp joinery.
      ctx.fillStyle = shade(ELF_WOOD, 32);
      ctx.beginPath();
      ctx.moveTo(p.x - hw, seatY);
      ctx.quadraticCurveTo(p.x, seatY - syT * 0.14, p.x + hw, seatY);
      ctx.lineTo(p.x + hw * 0.94, seatY + s * 0.05);
      ctx.quadraticCurveTo(p.x, seatY - syT * 0.14 + s * 0.055, p.x - hw * 0.94, seatY + s * 0.05);
      ctx.closePath();
      ctx.fill();
      // Sunlit front arris breaking over the seat edge.
      ctx.fillStyle = shade(ELF_WOOD, 16);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.94, seatY + s * 0.05);
      ctx.quadraticCurveTo(p.x, seatY - syT * 0.14 + s * 0.055, p.x + hw * 0.94, seatY + s * 0.05);
      ctx.lineTo(p.x + hw * 0.9, seatY + s * 0.095);
      ctx.quadraticCurveTo(p.x, seatY - syT * 0.14 + s * 0.1, p.x - hw * 0.9, seatY + s * 0.095);
      ctx.closePath();
      ctx.fill();
      // Vine-scroll armrests: each end curls ONCE and stops —
      // restraint is the luxury.
      for (const sgn of [-1, 1]) {
        const ax = p.x + sgn * hw * 0.98;
        ctx.fillStyle = shade(ELF_WOOD, 2);
        ctx.beginPath();
        ctx.moveTo(ax - sgn * s * 0.08, seatY + s * 0.02);
        ctx.quadraticCurveTo(ax + sgn * s * 0.06, seatY - s * 0.1, ax, seatY - s * 0.185);
        ctx.quadraticCurveTo(ax - sgn * s * 0.085, seatY - s * 0.23, ax - sgn * s * 0.1, seatY - s * 0.155);
        ctx.quadraticCurveTo(ax - sgn * s * 0.06, seatY - s * 0.18, ax - sgn * s * 0.02, seatY - s * 0.155);
        ctx.quadraticCurveTo(ax + sgn * s * 0.012, seatY - s * 0.08, ax - sgn * s * 0.045, seatY + s * 0.02);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(ELF_WOOD, 20);
        ctx.beginPath();
        ctx.moveTo(ax - sgn * s * 0.075, seatY + s * 0.02);
        ctx.quadraticCurveTo(ax + sgn * s * 0.045, seatY - s * 0.1, ax - sgn * s * 0.005, seatY - s * 0.175);
        ctx.lineTo(ax - sgn * s * 0.02, seatY - s * 0.145);
        ctx.quadraticCurveTo(ax + sgn * s * 0.005, seatY - s * 0.08, ax - sgn * s * 0.055, seatY + s * 0.02);
        ctx.closePath();
        ctx.fill();
      }
      // One thread of mithril inlay rides the seat's front edge.
      ctx.strokeStyle = ELF_VEIN;
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.82, seatY + s * 0.075);
      ctx.quadraticCurveTo(p.x, seatY - syT * 0.14 + s * 0.08, p.x + hw * 0.82, seatY + s * 0.075);
      ctx.stroke();
    },
  };
}

function paintElvenTable(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.34;
  const topY = baseY - s * 0.54;
  const rx = s * 0.52;
  const ry = syT * 0.3;
  const glintPh = (t * 0.16 + h * 0.05) % 1;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.75, 1.05, 0.55),
    drawShadow: () => rend.castContact(p.x, baseY + s * 0.02, s * 0.5, s * 0.14),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, rx * 1.02, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // Three swept legs — two catch the light, the far third
      // reads tucked in shadow under the north rim.
      const leg = (lx0: number, sgn: number, footY: number, tone: number) => {
        ctx.fillStyle = shade(ELF_WOOD, tone);
        ctx.beginPath();
        ctx.moveTo(lx0 - s * 0.032, topY + ry * 0.5);
        ctx.lineTo(lx0 + s * 0.032, topY + ry * 0.5);
        ctx.quadraticCurveTo(lx0 + sgn * s * 0.09, footY - s * 0.2, lx0 + sgn * s * 0.15 + s * 0.026, footY);
        ctx.lineTo(lx0 + sgn * s * 0.15 - s * 0.026, footY);
        ctx.quadraticCurveTo(lx0 + sgn * s * 0.055, footY - s * 0.2, lx0 - s * 0.032, topY + ry * 0.5);
        ctx.closePath();
        ctx.fill();
      };
      leg(p.x, 0.15, baseY - s * 0.16, -24);
      leg(p.x - rx * 0.62, -1, baseY, -4);
      leg(p.x + rx * 0.62, 1, baseY, -12);
      // The slab's thickness: dark under the lip.
      ctx.fillStyle = shade(ELF_WOOD, -16);
      ctx.beginPath();
      ctx.ellipse(p.x, topY + s * 0.055, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      // The top plane is the brightest surface in the piece
      // (THE PLANE SPEAKS IN VALUE) — the bird's eye owns it.
      ctx.fillStyle = shade(ELF_WOOD, 26);
      ctx.beginPath();
      ctx.ellipse(p.x, topY, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      // A cooler polish pool toward the north rim.
      ctx.fillStyle = shade(ELF_WOOD, 34);
      ctx.beginPath();
      ctx.ellipse(p.x - rx * 0.1, topY - ry * 0.28, rx * 0.62, ry * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE LEAF VEIN: mithril inlay branching across the slab —
      // the elves sign their carpentry in silver.
      ctx.strokeStyle = ELF_VEIN;
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.moveTo(p.x - rx * 0.72, topY + ry * 0.3);
      ctx.quadraticCurveTo(p.x - rx * 0.1, topY - ry * 0.1, p.x + rx * 0.74, topY - ry * 0.24);
      ctx.moveTo(p.x - rx * 0.28, topY + ry * 0.06);
      ctx.quadraticCurveTo(p.x - rx * 0.05, topY - ry * 0.45, p.x + rx * 0.2, topY - ry * 0.62);
      ctx.moveTo(p.x + rx * 0.05, topY - ry * 0.02);
      ctx.quadraticCurveTo(p.x + rx * 0.35, topY + ry * 0.28, p.x + rx * 0.62, topY + ry * 0.3);
      ctx.stroke();
      // The glint walks the main vein, slow as a thought.
      if (glintPh < 0.12) {
        const gp = glintPh / 0.12;
        const gvx = p.x - rx * 0.72 + rx * 1.46 * gp;
        const gvy = topY + ry * 0.3 - ry * 0.54 * Math.sin(gp * Math.PI);
        ctx.fillStyle = `rgba(234, 246, 255, ${0.75 * (1 - Math.abs(gp - 0.5) * 2)})`;
        ctx.fillRect(gvx - s * 0.02, gvy - s * 0.012, s * 0.04, s * 0.024);
      }
    },
  };
}

function paintElvenChair(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.28;
  const seatY = baseY - s * 0.36;
  const backTop = baseY - s * 1.16;
  const hw = s * 0.26;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.52, 1.5, 0.45),
    drawShadow: () => rend.castContact(p.x, baseY + s * 0.02, s * 0.3, s * 0.1),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, hw * 1.3, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      // Four swept legs, front pair splaying wider.
      const leg = (lx: number, sgn: number, tone: number) => {
        ctx.fillStyle = shade(ELF_WOOD, tone);
        ctx.beginPath();
        ctx.moveTo(lx - s * 0.024, seatY + s * 0.04);
        ctx.lineTo(lx + s * 0.024, seatY + s * 0.04);
        ctx.quadraticCurveTo(lx + sgn * s * 0.05 + s * 0.016, baseY - s * 0.12, lx + sgn * s * 0.08 + s * 0.02, baseY);
        ctx.lineTo(lx + sgn * s * 0.08 - s * 0.02, baseY);
        ctx.quadraticCurveTo(lx + sgn * s * 0.05 - s * 0.016, baseY - s * 0.12, lx - s * 0.024, seatY + s * 0.04);
        ctx.closePath();
        ctx.fill();
      };
      leg(p.x - hw * 0.62, -1, -18);
      leg(p.x + hw * 0.62, 1, -18);
      leg(p.x - hw * 0.72, -1, -2);
      leg(p.x + hw * 0.72, 1, -8);
      // THE FROND BACK, second pass (the first read as a tent
      // from across the green): a SLENDER splat rising from the
      // seat's back edge, waisted like a wand, crowned with a
      // real crozier coil. Silhouette-first design — at map
      // scale the eye gets "slim stem, curled head", nothing
      // else, and that pairing is unmistakably fern.
      ctx.fillStyle = shade(ELF_WOOD, 4);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.52, seatY + s * 0.02);
      ctx.quadraticCurveTo(p.x - hw * 0.3, seatY - s * 0.36, p.x - s * 0.05, backTop + s * 0.16);
      ctx.quadraticCurveTo(p.x - s * 0.045, backTop + s * 0.04, p.x + s * 0.01, backTop - s * 0.035);
      ctx.quadraticCurveTo(p.x + s * 0.1, backTop - s * 0.12, p.x + s * 0.155, backTop - s * 0.03);
      ctx.quadraticCurveTo(p.x + s * 0.16, backTop + s * 0.07, p.x + s * 0.075, backTop + s * 0.1);
      ctx.quadraticCurveTo(p.x + s * 0.045, backTop + s * 0.16, p.x + s * 0.05, backTop + s * 0.24);
      ctx.quadraticCurveTo(p.x + hw * 0.3, seatY - s * 0.3, p.x + hw * 0.52, seatY + s * 0.02);
      ctx.closePath();
      ctx.fill();
      // The coil's eye: a deep notch that makes the crozier a
      // SPIRAL, not a knob — negative space does the drawing.
      ctx.fillStyle = shade(ELF_WOOD, -26);
      ctx.beginPath();
      ctx.ellipse(p.x + s * 0.085, backTop + s * 0.005, s * 0.042, s * 0.036, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(ELF_WOOD, 18);
      ctx.beginPath();
      ctx.ellipse(p.x + s * 0.095, backTop - s * 0.005, s * 0.02, s * 0.017, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // Carved leaf pierce: daylight through the splat's heart.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.5)';
      ctx.beginPath();
      ctx.moveTo(p.x, seatY - s * 0.22);
      ctx.quadraticCurveTo(p.x + s * 0.048, seatY - s * 0.35, p.x, seatY - s * 0.5);
      ctx.quadraticCurveTo(p.x - s * 0.048, seatY - s * 0.35, p.x, seatY - s * 0.22);
      ctx.fill();
      // The splat's lit west edge rides the whole sweep.
      ctx.fillStyle = shade(ELF_WOOD, 22);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.48, seatY);
      ctx.quadraticCurveTo(p.x - hw * 0.27, seatY - s * 0.34, p.x - s * 0.046, backTop + s * 0.16);
      ctx.lineTo(p.x - s * 0.014, backTop + s * 0.18);
      ctx.quadraticCurveTo(p.x - hw * 0.2, seatY - s * 0.28, p.x - hw * 0.36, seatY);
      ctx.closePath();
      ctx.fill();
      // The seat: bowed top plane with a moonpale cushion.
      ctx.fillStyle = shade(ELF_WOOD, 20);
      ctx.beginPath();
      ctx.moveTo(p.x - hw, seatY);
      ctx.quadraticCurveTo(p.x, seatY - syT * 0.1, p.x + hw, seatY);
      ctx.lineTo(p.x + hw * 0.92, seatY + s * 0.06);
      ctx.quadraticCurveTo(p.x, seatY - syT * 0.1 + s * 0.065, p.x - hw * 0.92, seatY + s * 0.06);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(ELF_SILK, -8);
      ctx.beginPath();
      ctx.ellipse(p.x, seatY - s * 0.015, hw * 0.56, syT * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(ELF_SILK, -24);
      ctx.beginPath();
      ctx.ellipse(p.x, seatY + s * 0.005, hw * 0.56, syT * 0.09, 0, 0, Math.PI);
      ctx.fill();
      // A gold thread button centers the cushion.
      ctx.fillStyle = ELF_GOLD;
      ctx.fillRect(p.x - s * 0.012, seatY - s * 0.025, s * 0.024, s * 0.024);
    },
  };
}

function paintElvenDaybed(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  // A daybed is LONGER than the body (the body-ruler law) — it
  // overdraws its tile south and lets the y-sort keep it honest.
  const baseY = p.y + syT * 0.5;
  const hw = s * 0.58;
  const deckY = baseY - s * 0.3;
  const { sway, lag } = rend.breezeAt(tx, ty, t, tx * 1.4 + ty * 2.2, s, 0.012, 0.026);
  return {
    sortY: ty + 0.76,
    body: stationBody(0.82, 1.8, 0.62),
    drawShadow: () => rend.castContact(p.x, baseY + s * 0.02, s * 0.62, s * 0.14),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, hw * 1.06, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // Curled runner feet: the frame ends roll under like a
      // fern tip instead of standing on posts.
      for (const sgn of [-1, 1]) {
        const fx2 = p.x + sgn * (hw - s * 0.06);
        ctx.fillStyle = shade(ELF_WOOD, -8);
        ctx.beginPath();
        ctx.moveTo(fx2 - sgn * s * 0.1, deckY + s * 0.1);
        ctx.quadraticCurveTo(fx2 + sgn * s * 0.09, deckY + s * 0.12, fx2 + sgn * s * 0.08, baseY - s * 0.07);
        ctx.quadraticCurveTo(fx2 + sgn * s * 0.07, baseY, fx2 - sgn * s * 0.015, baseY);
        ctx.quadraticCurveTo(fx2 - sgn * s * 0.06, baseY - s * 0.005, fx2 - sgn * s * 0.05, baseY - s * 0.06);
        ctx.lineTo(fx2 - sgn * s * 0.1, deckY + s * 0.14);
        ctx.closePath();
        ctx.fill();
      }
      // The frame rail under the mattress.
      ctx.fillStyle = shade(ELF_WOOD, -18);
      ctx.beginPath();
      ctx.moveTo(p.x - hw, deckY + s * 0.04);
      ctx.quadraticCurveTo(p.x, deckY + s * 0.1, p.x + hw, deckY + s * 0.04);
      ctx.lineTo(p.x + hw, deckY + s * 0.14);
      ctx.quadraticCurveTo(p.x, deckY + s * 0.2, p.x - hw, deckY + s * 0.14);
      ctx.closePath();
      ctx.fill();
      // The mattress: moonpale top plane, brightest surface,
      // with the front tick of three tuft seams.
      ctx.fillStyle = shade(ELF_SILK, 10);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.98, deckY + s * 0.05);
      ctx.quadraticCurveTo(p.x, deckY - syT * 0.16, p.x + hw * 0.98, deckY + s * 0.05);
      ctx.lineTo(p.x + hw * 0.94, deckY + s * 0.05 + s * 0.02);
      ctx.quadraticCurveTo(p.x, deckY - syT * 0.16 + s * 0.02, p.x - hw * 0.94, deckY + s * 0.07);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(ELF_SILK, 10);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.98, deckY + s * 0.05);
      ctx.quadraticCurveTo(p.x, deckY - syT * 0.16, p.x + hw * 0.98, deckY + s * 0.05);
      ctx.quadraticCurveTo(p.x, deckY - syT * 0.16 + s * 0.09, p.x - hw * 0.98, deckY + s * 0.05);
      ctx.fill();
      ctx.fillStyle = shade(ELF_SILK, -14);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.98, deckY + s * 0.05);
      ctx.quadraticCurveTo(p.x, deckY - syT * 0.16 + s * 0.09, p.x + hw * 0.98, deckY + s * 0.05);
      ctx.lineTo(p.x + hw * 0.94, deckY + s * 0.11);
      ctx.quadraticCurveTo(p.x, deckY - syT * 0.16 + s * 0.15, p.x - hw * 0.94, deckY + s * 0.11);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(ELF_SILK, -26);
      for (let i = -1; i <= 1; i++) {
        ctx.fillRect(p.x + i * hw * 0.44 - s * 0.008, deckY + s * 0.015, s * 0.016, s * 0.05);
      }
      // The bolster at the west end — leaf-green with a gold
      // button in the end cap.
      ctx.fillStyle = ELF_LEAF;
      ctx.beginPath();
      ctx.ellipse(p.x - hw * 0.68, deckY - s * 0.06, s * 0.19, s * 0.1, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(ELF_LEAF, 16);
      ctx.beginPath();
      ctx.ellipse(p.x - hw * 0.68, deckY - s * 0.085, s * 0.17, s * 0.06, -0.08, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = shade(ELF_LEAF, -14);
      ctx.beginPath();
      ctx.ellipse(p.x - hw * 0.5, deckY - s * 0.055, s * 0.045, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ELF_GOLD;
      ctx.fillRect(p.x - hw * 0.5 - s * 0.01, deckY - s * 0.065, s * 0.02, s * 0.02);
      // THE CANE: one bowed silverbark rod from the head end,
      // arcing over the bed to carry the drape.
      const caneTip = { x: p.x + s * 0.18, y: deckY - s * 1.08 };
      ctx.fillStyle = shade(ELF_WOOD, -4);
      ctx.beginPath();
      ctx.moveTo(p.x - hw + s * 0.02, deckY + s * 0.06);
      ctx.quadraticCurveTo(p.x - hw - s * 0.04, deckY - s * 0.9, caneTip.x, caneTip.y);
      ctx.lineTo(caneTip.x + s * 0.005, caneTip.y + s * 0.035);
      ctx.quadraticCurveTo(p.x - hw + s * 0.005, deckY - s * 0.86, p.x - hw + s * 0.065, deckY + s * 0.06);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(ELF_WOOD, 14);
      ctx.beginPath();
      ctx.moveTo(p.x - hw + s * 0.03, deckY - s * 0.1);
      ctx.quadraticCurveTo(p.x - hw - s * 0.02, deckY - s * 0.88, caneTip.x - s * 0.02, caneTip.y + s * 0.012);
      ctx.lineTo(caneTip.x - s * 0.02, caneTip.y + s * 0.028);
      ctx.quadraticCurveTo(p.x - hw + s * 0.01, deckY - s * 0.84, p.x - hw + s * 0.05, deckY - s * 0.1);
      ctx.closePath();
      ctx.fill();
      // The drape falls from the cane tip: sheer moonpale silk,
      // body swinging as one, hem trailing the beat. Sheer means
      // SHEER — the mattress reads through it.
      const dTop = caneTip.y + s * 0.02;
      const dx0 = caneTip.x - s * 0.02;
      const hemY = deckY + s * 0.02;
      ctx.fillStyle = 'rgba(205, 216, 236, 0.72)';
      ctx.beginPath();
      ctx.moveTo(dx0, dTop);
      ctx.lineTo(dx0 + s * 0.06, dTop);
      ctx.quadraticCurveTo(dx0 + s * 0.3 + sway, dTop + s * 0.5, dx0 + s * 0.26 + sway + lag, hemY);
      ctx.lineTo(dx0 + s * 0.06 + sway + lag * 0.7, hemY + s * 0.04);
      ctx.lineTo(dx0 - s * 0.12 + sway + lag, hemY - s * 0.02);
      ctx.quadraticCurveTo(dx0 - s * 0.06 + sway * 0.5, dTop + s * 0.5, dx0, dTop);
      ctx.closePath();
      ctx.fill();
      // One fold catches shadow; the hem carries a gold thread.
      ctx.fillStyle = 'rgba(143, 163, 189, 0.4)';
      ctx.beginPath();
      ctx.moveTo(dx0 + s * 0.03, dTop + s * 0.06);
      ctx.quadraticCurveTo(dx0 + s * 0.1 + sway * 0.7, dTop + s * 0.55, dx0 + s * 0.06 + sway + lag * 0.8, hemY + s * 0.02);
      ctx.lineTo(dx0 + s * 0.015 + sway + lag * 0.8, hemY);
      ctx.quadraticCurveTo(dx0 + s * 0.04 + sway * 0.6, dTop + s * 0.5, dx0 + s * 0.01, dTop + s * 0.06);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ELF_GOLD;
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(dx0 - s * 0.12 + sway + lag, hemY - s * 0.02);
      ctx.lineTo(dx0 + s * 0.06 + sway + lag * 0.7, hemY + s * 0.04);
      ctx.lineTo(dx0 + s * 0.26 + sway + lag, hemY);
      ctx.stroke();
    },
  };
}

function paintElvenBookcase(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.42;
  const hw = s * 0.44;
  // The lancet arch: the case rises past head height and closes
  // in a point — elven casework refuses the flat crate top.
  const archSpring = baseY - s * 1.42;
  const apexY = baseY - s * 1.86;
  const capD = syT * 0.26;
  return {
    sortY: ty + 0.74,
    body: stationBody(0.62, 2.15, 0.5),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - hw * 0.9, baseY, p.x + hw * 0.9, baseY, 1.55);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.025, hw * 1.12, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      const archTo = (yShift: number) => {
        ctx.moveTo(p.x - hw, baseY + yShift);
        ctx.lineTo(p.x - hw, archSpring + yShift);
        ctx.quadraticCurveTo(p.x - hw, apexY + s * 0.09 + yShift, p.x, apexY + yShift);
        ctx.quadraticCurveTo(p.x + hw, apexY + s * 0.09 + yShift, p.x + hw, archSpring + yShift);
        ctx.lineTo(p.x + hw, baseY + yShift);
        ctx.closePath();
      };
      // THE TOP PLANE (2.5D law): the crown band rises behind
      // the front arch — the bird's eye sees the case has depth.
      ctx.fillStyle = shade(ELF_WOOD, 18);
      ctx.beginPath();
      archTo(-capD);
      ctx.fill();
      ctx.fillStyle = shade(ELF_WOOD, -30);
      ctx.beginPath();
      ctx.moveTo(p.x - hw, archSpring - capD);
      ctx.quadraticCurveTo(p.x - hw, apexY + s * 0.09 - capD, p.x, apexY - capD);
      ctx.quadraticCurveTo(p.x + hw, apexY + s * 0.09 - capD, p.x + hw, archSpring - capD);
      ctx.lineTo(p.x + hw - s * 0.02, archSpring - capD + s * 0.02);
      ctx.quadraticCurveTo(p.x + hw - s * 0.02, apexY + s * 0.1 - capD + s * 0.02, p.x, apexY - capD + s * 0.024);
      ctx.quadraticCurveTo(p.x - hw + s * 0.02, apexY + s * 0.1 - capD + s * 0.02, p.x - hw + s * 0.02, archSpring - capD + s * 0.02);
      ctx.closePath();
      ctx.fill();
      // The case's face frame.
      ctx.fillStyle = shade(ELF_WOOD, -4);
      ctx.beginPath();
      archTo(0);
      ctx.fill();
      // Sunlit arris where the front face breaks over the crown.
      ctx.fillStyle = shade(ELF_WOOD, 30);
      ctx.beginPath();
      ctx.moveTo(p.x - hw, archSpring);
      ctx.quadraticCurveTo(p.x - hw, apexY + s * 0.09, p.x, apexY);
      ctx.quadraticCurveTo(p.x + hw, apexY + s * 0.09, p.x + hw, archSpring);
      ctx.lineTo(p.x + hw - s * 0.02, archSpring + s * 0.01);
      ctx.quadraticCurveTo(p.x + hw - s * 0.02, apexY + s * 0.1, p.x, apexY + s * 0.024);
      ctx.quadraticCurveTo(p.x - hw + s * 0.02, apexY + s * 0.1, p.x - hw + s * 0.02, archSpring + s * 0.01);
      ctx.closePath();
      ctx.fill();
      // The recess: dark, so shelf goods read against it.
      const inW = hw - s * 0.075;
      ctx.fillStyle = '#2a2536';
      ctx.beginPath();
      ctx.moveTo(p.x - inW, baseY - s * 0.1);
      ctx.lineTo(p.x - inW, archSpring);
      ctx.quadraticCurveTo(p.x - inW, apexY + s * 0.2, p.x, apexY + s * 0.12);
      ctx.quadraticCurveTo(p.x + inW, apexY + s * 0.2, p.x + inW, archSpring);
      ctx.lineTo(p.x + inW, baseY - s * 0.1);
      ctx.closePath();
      ctx.fill();
      // Three shelves of tomes — spines in the cool library
      // palette, one gold spine per case, heights honest.
      const shelfAt = (sy2: number) => {
        ctx.fillStyle = shade(ELF_WOOD, -12);
        ctx.fillRect(p.x - inW, sy2, inW * 2, s * 0.045);
        ctx.fillStyle = shade(ELF_WOOD, 10);
        ctx.fillRect(p.x - inW, sy2, inW * 2, s * 0.014);
      };
      const books = (sy2: number, seed: number) => {
        const tones = ['#3f6e58', '#5f7ea6', '#5d5169', '#7a9a8a', '#46608a'];
        let bx2 = p.x - inW + s * 0.03;
        for (let i = 0; i < 6 && bx2 < p.x + inW - s * 0.1; i++) {
          const bh2 = s * (0.22 + (((seed >> (i * 2)) & 3) * 0.02));
          const bw2 = s * (0.055 + (((seed >> i) & 1) * 0.02));
          const lean = ((seed >> (i * 3)) & 3) === 3;
          ctx.fillStyle = i === 4 ? ELF_GOLD : tones[(seed + i) % tones.length]!;
          if (lean) {
            ctx.beginPath();
            ctx.moveTo(bx2, sy2);
            ctx.lineTo(bx2 + bw2, sy2);
            ctx.lineTo(bx2 + bw2 + s * 0.035, sy2 - bh2);
            ctx.lineTo(bx2 + s * 0.035, sy2 - bh2);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillRect(bx2, sy2 - bh2, bw2, bh2);
            ctx.fillStyle = 'rgba(234, 246, 255, 0.2)';
            ctx.fillRect(bx2, sy2 - bh2, bw2, s * 0.014);
          }
          bx2 += bw2 + s * 0.014;
        }
      };
      const sh1 = baseY - s * 0.62;
      const sh2 = baseY - s * 1.08;
      const sh3 = baseY - s * 1.5;
      books(sh1 - s * 0.005, h);
      shelfAt(sh1);
      books(sh2 - s * 0.005, h >> 3);
      shelfAt(sh2);
      // The top shelf under the arch keeps a single treasure:
      // one tome laid FLAT (its long edge to the reader) and a
      // moonglass paperweight.
      ctx.fillStyle = '#46608a';
      ctx.fillRect(p.x - s * 0.16, sh3 - s * 0.06, s * 0.3, s * 0.06);
      ctx.fillStyle = 'rgba(234, 246, 255, 0.25)';
      ctx.fillRect(p.x - s * 0.16, sh3 - s * 0.06, s * 0.3, s * 0.016);
      ctx.fillStyle = ELF_GLASS;
      ctx.beginPath();
      facetCircle(ctx, p.x + s * 0.22, sh3 - s * 0.045, s * 0.035, 5, 0.5, 0.9);
      ctx.fill();
      shelfAt(sh3);
      // The scroll bay: an X-divided base cell, rolled ends out.
      ctx.fillStyle = shade(ELF_WOOD, -12);
      ctx.beginPath();
      ctx.moveTo(p.x - inW, baseY - s * 0.1);
      ctx.lineTo(p.x + inW, sh1 + s * 0.05);
      ctx.lineTo(p.x + inW, sh1 + s * 0.09);
      ctx.lineTo(p.x - inW, baseY - s * 0.06);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p.x + inW, baseY - s * 0.1);
      ctx.lineTo(p.x - inW, sh1 + s * 0.05);
      ctx.lineTo(p.x - inW, sh1 + s * 0.09);
      ctx.lineTo(p.x + inW, baseY - s * 0.06);
      ctx.closePath();
      ctx.fill();
      const scroll = (sx2: number, sy2: number, r: number) => {
        ctx.fillStyle = shade(ELF_MARBLE, 6);
        ctx.beginPath();
        ctx.ellipse(sx2, sy2, r, r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(ELF_MARBLE, -30);
        ctx.beginPath();
        ctx.ellipse(sx2, sy2, r * 0.45, r * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      };
      scroll(p.x - inW * 0.52, baseY - s * 0.26, s * 0.05);
      scroll(p.x - inW * 0.28, baseY - s * 0.22, s * 0.045);
      scroll(p.x + inW * 0.42, baseY - s * 0.25, s * 0.05);
      // Plinth: the case lands on a lit step.
      ctx.fillStyle = shade(ELF_WOOD, -22);
      ctx.fillRect(p.x - hw - s * 0.03, baseY - s * 0.08, hw * 2 + s * 0.06, s * 0.08);
      ctx.fillStyle = shade(ELF_WOOD, 6);
      ctx.fillRect(p.x - hw - s * 0.03, baseY - s * 0.08, hw * 2 + s * 0.06, s * 0.02);
      // A gold leaf keystone signs the arch.
      ctx.fillStyle = ELF_GOLD;
      ctx.beginPath();
      ctx.moveTo(p.x, apexY + s * 0.03);
      ctx.quadraticCurveTo(p.x + s * 0.05, apexY + s * 0.1, p.x, apexY + s * 0.17);
      ctx.quadraticCurveTo(p.x - s * 0.05, apexY + s * 0.1, p.x, apexY + s * 0.03);
      ctx.fill();
    },
  };
}

function paintElvenLectern(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  const deskS = baseY - s * 0.76;
  const deskN = baseY - s * 0.98;
  const pagePh = (t * 0.3 + h * 0.13) % 1;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.52, 1.4, 0.4),
    drawShadow: () => rend.castContact(p.x, baseY + s * 0.02, s * 0.24, s * 0.09),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.015, s * 0.2, s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      // Faceted foot, then ONE swept stem that forks under the
      // desk — grown joinery, told in two branch splits.
      ctx.fillStyle = shade(ELF_WOOD, -16);
      ctx.beginPath();
      facetCircle(ctx, p.x, baseY - s * 0.02, s * 0.13, 6, 0.3, 0.5);
      ctx.fill();
      ctx.fillStyle = shade(ELF_WOOD, -2);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.045, baseY - s * 0.03);
      ctx.quadraticCurveTo(p.x - s * 0.02, baseY - s * 0.45, p.x + s * 0.035, deskS + s * 0.1);
      ctx.lineTo(p.x + s * 0.085, deskS + s * 0.1);
      ctx.quadraticCurveTo(p.x + s * 0.045, baseY - s * 0.45, p.x + s * 0.05, baseY - s * 0.03);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(ELF_WOOD, 12);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.03, baseY - s * 0.06);
      ctx.quadraticCurveTo(p.x - s * 0.012, baseY - s * 0.44, p.x + s * 0.045, deskS + s * 0.1);
      ctx.lineTo(p.x + s * 0.062, deskS + s * 0.1);
      ctx.quadraticCurveTo(p.x - s * 0.002, baseY - s * 0.44, p.x - s * 0.012, baseY - s * 0.06);
      ctx.closePath();
      ctx.fill();
      // The fork: two branches take the desk corners.
      ctx.strokeStyle = shade(ELF_WOOD, -8);
      ctx.lineWidth = Math.max(1, s * 0.035);
      ctx.beginPath();
      ctx.moveTo(p.x + s * 0.05, deskS + s * 0.1);
      ctx.quadraticCurveTo(p.x - s * 0.1, deskS + s * 0.06, p.x - s * 0.2, deskS + s * 0.02);
      ctx.moveTo(p.x + s * 0.05, deskS + s * 0.1);
      ctx.quadraticCurveTo(p.x + s * 0.16, deskS + s * 0.06, p.x + s * 0.22, deskS + s * 0.02);
      ctx.stroke();
      // The desk: a foreshortened slab leaning toward the
      // reader — its lit top plane IS the piece.
      ctx.fillStyle = shade(ELF_WOOD, -20);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.28, deskS + s * 0.05);
      ctx.lineTo(p.x + s * 0.28, deskS + s * 0.05);
      ctx.lineTo(p.x + s * 0.31, deskN + s * 0.05);
      ctx.lineTo(p.x - s * 0.31, deskN + s * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(ELF_WOOD, 22);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.28, deskS);
      ctx.lineTo(p.x + s * 0.28, deskS);
      ctx.lineTo(p.x + s * 0.31, deskN);
      ctx.lineTo(p.x - s * 0.31, deskN);
      ctx.closePath();
      ctx.fill();
      // The open tome: two leaves, a dark gutter, script rows.
      const page = (sgn: number) => {
        ctx.fillStyle = sgn < 0 ? '#ece8dc' : '#e2ddd0';
        ctx.beginPath();
        ctx.moveTo(p.x + sgn * s * 0.015, deskS - s * 0.02);
        ctx.lineTo(p.x + sgn * s * 0.23, deskS - s * 0.035);
        ctx.lineTo(p.x + sgn * s * 0.25, deskN + s * 0.02);
        ctx.lineTo(p.x + sgn * s * 0.015, deskN + s * 0.035);
        ctx.closePath();
        ctx.fill();
      };
      page(-1);
      page(1);
      ctx.fillStyle = 'rgba(42, 37, 54, 0.55)';
      ctx.fillRect(p.x - s * 0.012, deskN + s * 0.02, s * 0.024, deskS - deskN - s * 0.045);
      ctx.strokeStyle = 'rgba(74, 63, 94, 0.4)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      for (let i = 0; i < 3; i++) {
        const ly = deskN + s * 0.075 + i * s * 0.05;
        ctx.beginPath();
        ctx.moveTo(p.x - s * 0.2, ly + s * 0.01);
        ctx.lineTo(p.x - s * 0.05, ly);
        ctx.moveTo(p.x + s * 0.05, ly);
        ctx.lineTo(p.x + s * 0.2, ly + s * 0.01);
        ctx.stroke();
      }
      // One page forever lifting — the reader just stepped away.
      if (pagePh < 0.16) {
        const lift = Math.sin((pagePh / 0.16) * Math.PI);
        ctx.fillStyle = `rgba(248, 245, 235, ${0.5 + 0.4 * lift})`;
        ctx.beginPath();
        ctx.moveTo(p.x + s * 0.02, deskS - s * 0.03);
        ctx.quadraticCurveTo(p.x + s * 0.1, deskS - s * 0.06 - s * 0.12 * lift, p.x + s * 0.2, deskS - s * 0.05 - s * 0.05 * lift);
        ctx.lineTo(p.x + s * 0.16, deskS - s * 0.025);
        ctx.closePath();
        ctx.fill();
      }
      // The mithril leaf clasp holds the place.
      ctx.fillStyle = ELF_VEIN;
      ctx.beginPath();
      ctx.moveTo(p.x, deskS + s * 0.005);
      ctx.quadraticCurveTo(p.x + s * 0.035, deskS + s * 0.035, p.x, deskS + s * 0.07);
      ctx.quadraticCurveTo(p.x - s * 0.035, deskS + s * 0.035, p.x, deskS + s * 0.005);
      ctx.fill();
    },
  };
}

function paintElvenHarp(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.24;
  // The three members of a harp: bowed pillar (west), the neck's
  // wave, the soundboard's slant — one instrument, three sweeps.
  const pillarTop = { x: p.x - s * 0.31, y: baseY - s * 1.28 };
  const boardTop = { x: p.x + s * 0.35, y: baseY - s * 0.86 };
  const stringIdx = Math.floor((t * 0.6 + h * 0.1) % 6);
  return {
    sortY: ty + 0.7,
    body: stationBody(0.62, 1.7, 0.45),
    drawShadow: () => rend.castContact(p.x, baseY + s * 0.02, s * 0.4, s * 0.11),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, s * 0.42, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // The base shoe both feet grow from.
      ctx.fillStyle = shade(ELF_WOOD, -18);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.4, baseY);
      ctx.quadraticCurveTo(p.x, baseY + s * 0.06, p.x + s * 0.44, baseY);
      ctx.lineTo(p.x + s * 0.4, baseY - s * 0.09);
      ctx.quadraticCurveTo(p.x, baseY - s * 0.04, p.x - s * 0.36, baseY - s * 0.09);
      ctx.closePath();
      ctx.fill();
      // The soundboard: a slanted tapered box from shoe to neck,
      // its face the lit plane the strings will read against.
      ctx.fillStyle = shade(ELF_WOOD, -6);
      ctx.beginPath();
      ctx.moveTo(p.x + s * 0.24, baseY - s * 0.04);
      ctx.lineTo(p.x + s * 0.46, baseY - s * 0.1);
      ctx.lineTo(boardTop.x + s * 0.045, boardTop.y);
      ctx.lineTo(boardTop.x - s * 0.035, boardTop.y - s * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(ELF_WOOD, 16);
      ctx.beginPath();
      ctx.moveTo(p.x + s * 0.24, baseY - s * 0.04);
      ctx.lineTo(p.x + s * 0.35, baseY - s * 0.07);
      ctx.lineTo(boardTop.x - s * 0.005, boardTop.y - s * 0.01);
      ctx.lineTo(boardTop.x - s * 0.035, boardTop.y - s * 0.02);
      ctx.closePath();
      ctx.fill();
      // The pillar: one bowed column, gold-lined.
      ctx.fillStyle = shade(ELF_WOOD, 0);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.24, baseY - s * 0.02);
      ctx.quadraticCurveTo(p.x - s * 0.42, baseY - s * 0.66, pillarTop.x - s * 0.015, pillarTop.y);
      ctx.lineTo(pillarTop.x + s * 0.05, pillarTop.y + s * 0.03);
      ctx.quadraticCurveTo(p.x - s * 0.33, baseY - s * 0.6, p.x - s * 0.16, baseY - s * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ELF_GOLD;
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.21, baseY - s * 0.06);
      ctx.quadraticCurveTo(p.x - s * 0.38, baseY - s * 0.64, pillarTop.x + s * 0.01, pillarTop.y + s * 0.015);
      ctx.stroke();
      // The neck: the wave from pillar crown to soundboard top.
      ctx.fillStyle = shade(ELF_WOOD, 6);
      ctx.beginPath();
      ctx.moveTo(pillarTop.x - s * 0.015, pillarTop.y);
      ctx.quadraticCurveTo(p.x + s * 0.02, pillarTop.y - s * 0.14, boardTop.x + s * 0.01, boardTop.y - s * 0.04);
      ctx.lineTo(boardTop.x + s * 0.035, boardTop.y + s * 0.02);
      ctx.quadraticCurveTo(p.x + s * 0.02, pillarTop.y - s * 0.04, pillarTop.x + s * 0.05, pillarTop.y + s * 0.03);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(ELF_WOOD, 22);
      ctx.beginPath();
      ctx.moveTo(pillarTop.x, pillarTop.y + s * 0.005);
      ctx.quadraticCurveTo(p.x + s * 0.02, pillarTop.y - s * 0.12, boardTop.x, boardTop.y - s * 0.03);
      ctx.lineTo(boardTop.x, boardTop.y - s * 0.005);
      ctx.quadraticCurveTo(p.x + s * 0.02, pillarTop.y - s * 0.085, pillarTop.x + s * 0.02, pillarTop.y + s * 0.02);
      ctx.closePath();
      ctx.fill();
      // SIX MITHRIL STRINGS: parallel light, and one of them is
      // always singing — the glint walks string to string.
      for (let i = 0; i < 6; i++) {
        const f = i / 5;
        const topX = pillarTop.x + s * 0.09 + (boardTop.x - pillarTop.x - s * 0.12) * f;
        const topYs = pillarTop.y - s * 0.02 - s * 0.1 * Math.sin(Math.PI * (0.25 + f * 0.6)) + (boardTop.y - pillarTop.y) * f * 0.7;
        const botX = p.x + s * 0.27 + s * 0.13 * f;
        const botY = baseY - s * 0.08 - s * 0.66 * f;
        const singing = i === stringIdx;
        ctx.strokeStyle = singing ? 'rgba(240, 250, 255, 0.95)' : 'rgba(220, 233, 248, 0.55)';
        ctx.lineWidth = Math.max(1, s * (singing ? 0.016 : 0.011));
        ctx.beginPath();
        ctx.moveTo(topX, topYs);
        ctx.lineTo(botX, botY);
        ctx.stroke();
        if (singing) {
          ctx.fillStyle = 'rgba(240, 250, 255, 0.8)';
          ctx.beginPath();
          ctx.ellipse((topX + botX) / 2, (topYs + botY) / 2, s * 0.018, s * 0.018, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // The crown scroll on the pillar — one curl, gold bead.
      ctx.fillStyle = shade(ELF_WOOD, -8);
      ctx.beginPath();
      facetCircle(ctx, pillarTop.x + s * 0.01, pillarTop.y - s * 0.02, s * 0.05, 6, 0.2, 1);
      ctx.fill();
      ctx.fillStyle = ELF_GOLD;
      ctx.beginPath();
      facetCircle(ctx, pillarTop.x + s * 0.01, pillarTop.y - s * 0.02, s * 0.02, 5, 0.4, 1);
      ctx.fill();
    },
  };
}

function paintElvenLoom(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.3;
  const hw = s * 0.42;
  const topBeam = baseY - s * 1.26;
  const breastBeam = baseY - s * 0.34;
  const { sway, lag } = rend.breezeAt(tx, ty, t, tx * 2.1 + ty * 1.1, s, 0.008, 0.02);
  return {
    sortY: ty + 0.72,
    body: stationBody(0.7, 1.6, 0.5),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - hw * 0.9, baseY, p.x + hw * 0.9, baseY, 1.15);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, hw * 1.15, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // Two swept uprights, feet padded, bowing gently OUT — a
      // frame sprung to hold tension, not nailed to fight it.
      for (const sgn of [-1, 1]) {
        const ux = p.x + sgn * hw;
        ctx.fillStyle = shade(ELF_WOOD, sgn < 0 ? 2 : -10);
        ctx.beginPath();
        ctx.moveTo(ux - s * 0.038, baseY);
        ctx.lineTo(ux + s * 0.038, baseY);
        ctx.quadraticCurveTo(ux + sgn * s * 0.05 + s * 0.026, baseY - s * 0.7, ux + sgn * s * 0.02 + s * 0.022, topBeam - s * 0.06);
        ctx.lineTo(ux + sgn * s * 0.02 - s * 0.022, topBeam - s * 0.06);
        ctx.quadraticCurveTo(ux + sgn * s * 0.05 - s * 0.026, baseY - s * 0.7, ux - s * 0.038, baseY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(ELF_WOOD, -22);
        ctx.fillRect(ux - s * 0.06, baseY - s * 0.03, s * 0.12, s * 0.03);
      }
      // Top beam and breast beam, lit along their top edges.
      ctx.fillStyle = shade(ELF_WOOD, -8);
      ctx.fillRect(p.x - hw - s * 0.05, topBeam, hw * 2 + s * 0.1, s * 0.055);
      ctx.fillStyle = shade(ELF_WOOD, 16);
      ctx.fillRect(p.x - hw - s * 0.05, topBeam, hw * 2 + s * 0.1, s * 0.016);
      ctx.fillStyle = shade(ELF_WOOD, -8);
      ctx.fillRect(p.x - hw - s * 0.02, breastBeam, hw * 2 + s * 0.04, s * 0.05);
      ctx.fillStyle = shade(ELF_WOOD, 14);
      ctx.fillRect(p.x - hw - s * 0.02, breastBeam, hw * 2 + s * 0.04, s * 0.014);
      // THE CLOTH IN PROGRESS: moonpale field woven from the top
      // beam down, two seafoam bands and a gold selvage thread
      // at the working edge — half done, honest about it.
      const clothBot = baseY - s * 0.76;
      const inW = hw - s * 0.06;
      ctx.fillStyle = ELF_SILK;
      ctx.beginPath();
      ctx.moveTo(p.x - inW, topBeam + s * 0.055);
      ctx.lineTo(p.x + inW, topBeam + s * 0.055);
      ctx.lineTo(p.x + inW - s * 0.012 + sway * 0.4, clothBot);
      ctx.quadraticCurveTo(p.x + sway * 0.5, clothBot + s * 0.035, p.x - inW + s * 0.012 + sway * 0.4, clothBot);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#7ec4a8';
      ctx.fillRect(p.x - inW + s * 0.01, topBeam + s * 0.14, inW * 2 - s * 0.02, s * 0.045);
      ctx.fillRect(p.x - inW + s * 0.008, topBeam + s * 0.27, inW * 2 - s * 0.016, s * 0.028);
      ctx.strokeStyle = ELF_GOLD;
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(p.x - inW + s * 0.012 + sway * 0.4, clothBot);
      ctx.quadraticCurveTo(p.x + sway * 0.5, clothBot + s * 0.035, p.x + inW - s * 0.012 + sway * 0.4, clothBot);
      ctx.stroke();
      // The warp: unwoven threads running on to the breast beam.
      ctx.strokeStyle = 'rgba(222, 216, 206, 0.55)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      for (let i = 0; i < 9; i++) {
        const f = i / 8;
        const wx = p.x - inW + s * 0.02 + (inW * 2 - s * 0.04) * f;
        ctx.beginPath();
        ctx.moveTo(wx + sway * 0.4, clothBot + s * 0.01);
        ctx.lineTo(wx, breastBeam + s * 0.005);
        ctx.stroke();
      }
      // Warp weights: four teardrop stones keep the tension,
      // each swinging on its own small clock.
      for (let i = 0; i < 4; i++) {
        const f = i / 3;
        const wx = p.x - inW * 0.72 + inW * 1.44 * f + sway * (0.6 + f * 0.5) + lag * (i % 2 === 0 ? 0.5 : -0.4);
        const wy = clothBot + s * 0.15 + (i % 2) * s * 0.03;
        ctx.strokeStyle = 'rgba(222, 216, 206, 0.5)';
        ctx.beginPath();
        ctx.moveTo(wx - sway * 0.3, clothBot + s * 0.01);
        ctx.lineTo(wx, wy);
        ctx.stroke();
        ctx.fillStyle = shade(ELF_MARBLE, -34 + i * 4);
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.quadraticCurveTo(wx + s * 0.035, wy + s * 0.04, wx, wy + s * 0.085);
        ctx.quadraticCurveTo(wx - s * 0.035, wy + s * 0.04, wx, wy);
        ctx.fill();
      }
      // The weaver's basket waits at the east foot: three spools
      // in the kit's thread colors.
      ctx.fillStyle = shade(ELF_WOOD, -14);
      ctx.beginPath();
      ctx.moveTo(p.x + hw * 0.52, baseY);
      ctx.lineTo(p.x + hw * 1.06, baseY);
      ctx.lineTo(p.x + hw * 1.0, baseY - s * 0.16);
      ctx.lineTo(p.x + hw * 0.58, baseY - s * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(ELF_WOOD, 4);
      ctx.fillRect(p.x + hw * 0.56, baseY - s * 0.17, hw * 0.46, s * 0.025);
      const spool = (sx2: number, tone: string) => {
        ctx.fillStyle = tone;
        ctx.beginPath();
        ctx.ellipse(sx2, baseY - s * 0.19, s * 0.036, s * 0.045, 0, 0, Math.PI * 2);
        ctx.fill();
      };
      spool(p.x + hw * 0.66, '#7ec4a8');
      spool(p.x + hw * 0.79, ELF_SILK);
      spool(p.x + hw * 0.92, ELF_GOLD);
    },
  };
}

function paintElvenFountain(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.4;
  const rx = s * 0.5;
  const ry = syT * 0.3;
  const rimY = baseY - s * 0.22;
  const midY = baseY - s * 0.72;
  const topBowlY = baseY - s * 1.08;
  return {
    sortY: ty + 0.72,
    body: stationBody(0.72, 1.55, 0.55),
    drawShadow: () => rend.castContact(p.x, baseY + s * 0.02, s * 0.52, s * 0.15),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, rx * 1.06, s * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      // The basin wall: a marble drum with scallop facets — the
      // bird's eye must see INTO the bowl, so wall first, water
      // after, rim arris last.
      ctx.fillStyle = shade(ELF_MARBLE, -18);
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.06, rx, ry, 0, 0, Math.PI);
      ctx.ellipse(p.x, rimY, rx, ry, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = shade(ELF_MARBLE, -4);
      for (let i = 0; i < 5; i++) {
        const f = (i + 0.5) / 5;
        const sx2 = p.x - rx + rx * 2 * f;
        const sw2 = (rx * 2) / 5 - s * 0.03;
        ctx.beginPath();
        ctx.moveTo(sx2 - sw2 / 2, rimY + ry * Math.sin(Math.PI * f) * 0.24);
        ctx.lineTo(sx2 + sw2 / 2, rimY + ry * Math.sin(Math.PI * f) * 0.24);
        ctx.lineTo(sx2 + sw2 / 2 - s * 0.014, baseY - s * 0.05 + ry * Math.sin(Math.PI * f) * 0.3);
        ctx.lineTo(sx2 - sw2 / 2 + s * 0.014, baseY - s * 0.05 + ry * Math.sin(Math.PI * f) * 0.3);
        ctx.closePath();
        ctx.fill();
      }
      // The pool: cool water, and the slow rings of a fountain
      // that has been singing for three hundred years.
      ctx.fillStyle = '#5f93ab';
      ctx.beginPath();
      ctx.ellipse(p.x, rimY, rx - s * 0.06, ry - s * 0.035, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7ec4d8';
      ctx.beginPath();
      ctx.ellipse(p.x - rx * 0.08, rimY - ry * 0.1, rx * 0.7, ry * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let k = 0; k < 2; k++) {
        const ph = (t * 0.42 + k * 0.5 + h * 0.07) % 1;
        ctx.strokeStyle = `rgba(223, 242, 250, ${0.4 * (1 - ph)})`;
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.ellipse(p.x, rimY, (rx - s * 0.1) * (0.25 + 0.75 * ph), (ry - s * 0.05) * (0.25 + 0.75 * ph), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Rim arris: the sunlit marble lip closes the bowl.
      ctx.strokeStyle = shade(ELF_MARBLE, 14);
      ctx.lineWidth = Math.max(1, s * 0.035);
      ctx.beginPath();
      ctx.ellipse(p.x, rimY, rx - s * 0.015, ry - s * 0.01, 0, 0, Math.PI * 2);
      ctx.stroke();
      // The stem and middle bowl.
      ctx.fillStyle = shade(ELF_MARBLE, -10);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.05, rimY - s * 0.02);
      ctx.lineTo(p.x + s * 0.05, rimY - s * 0.02);
      ctx.lineTo(p.x + s * 0.035, midY);
      ctx.lineTo(p.x - s * 0.035, midY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(ELF_MARBLE, -6);
      ctx.beginPath();
      ctx.ellipse(p.x, midY, s * 0.24, syT * 0.13, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#7ec4d8';
      ctx.beginPath();
      ctx.ellipse(p.x, midY - s * 0.015, s * 0.2, syT * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shade(ELF_MARBLE, 12);
      ctx.lineWidth = Math.max(1, s * 0.025);
      ctx.beginPath();
      ctx.ellipse(p.x, midY - s * 0.015, s * 0.22, syT * 0.115, 0, 0, Math.PI * 2);
      ctx.stroke();
      // The top cup and its crescent finial.
      ctx.fillStyle = shade(ELF_MARBLE, -8);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.03, midY - s * 0.02);
      ctx.lineTo(p.x + s * 0.03, midY - s * 0.02);
      ctx.lineTo(p.x + s * 0.022, topBowlY);
      ctx.lineTo(p.x - s * 0.022, topBowlY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(ELF_MARBLE, 4);
      ctx.beginPath();
      ctx.ellipse(p.x, topBowlY, s * 0.1, syT * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ELF_MITHRIL;
      ctx.beginPath();
      ctx.arc(p.x, topBowlY - s * 0.1, s * 0.055, -0.3, Math.PI + 0.3);
      ctx.arc(p.x, topBowlY - s * 0.125, s * 0.036, Math.PI + 0.5, -0.5, true);
      ctx.closePath();
      ctx.fill();
      // THE SONG: thin falls from cup to bowl to pool — a bright
      // pulse slides down each thread (slow, cadence-safe), and
      // a white tick marks where the water lands.
      const fall = (fx2: number, y0: number, y1: number, phOff: number) => {
        ctx.strokeStyle = 'rgba(223, 242, 250, 0.55)';
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(fx2, y0);
        ctx.lineTo(fx2, y1);
        ctx.stroke();
        const ph = (t * 0.9 + phOff) % 1;
        ctx.fillStyle = 'rgba(240, 250, 255, 0.7)';
        ctx.fillRect(fx2 - s * 0.012, y0 + (y1 - y0) * ph - s * 0.03, s * 0.024, s * 0.06);
        ctx.fillStyle = 'rgba(240, 250, 255, 0.5)';
        ctx.fillRect(fx2 - s * 0.028, y1 - s * 0.012, s * 0.056, s * 0.016);
      };
      fall(p.x - s * 0.14, midY + s * 0.01, rimY - s * 0.04, 0.2);
      fall(p.x + s * 0.15, midY + s * 0.015, rimY - s * 0.03, 0.65);
      fall(p.x + s * 0.02, topBowlY + s * 0.02, midY - s * 0.04, 0.45);
    },
  };
}

function paintElvenStatue(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.38;
  const hw = s * 0.28;
  const plinthTop = baseY - s * 0.3;
  const headY = baseY - s * 1.5;
  return {
    sortY: ty + 0.74,
    body: stationBody(0.56, 1.95, 0.5),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - hw * 0.8, baseY, p.x + hw * 0.8, baseY, 1.35);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, hw * 1.5, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // The plinth: a marble block with its crate-lid top plane.
      ctx.fillStyle = shade(ELF_MARBLE, -20);
      ctx.fillRect(p.x - hw * 1.15, plinthTop + syT * 0.2, hw * 2.3, baseY - plinthTop - syT * 0.2);
      ctx.fillStyle = shade(ELF_MARBLE, 8);
      ctx.fillRect(p.x - hw * 1.15, plinthTop, hw * 2.3, syT * 0.2);
      ctx.fillStyle = shade(ELF_MARBLE, -34);
      ctx.fillRect(p.x - hw * 1.15, plinthTop, hw * 2.3, s * 0.016);
      ctx.fillStyle = shade(ELF_MARBLE, 20);
      ctx.fillRect(p.x - hw * 1.15, plinthTop + syT * 0.2 - s * 0.014, hw * 2.3, s * 0.014);
      // Moss takes the shaded south-west corner — the grove
      // reclaims what stands still long enough.
      ctx.fillStyle = 'rgba(93, 138, 110, 0.55)';
      ctx.beginPath();
      ctx.ellipse(p.x - hw * 0.9, baseY - s * 0.04, s * 0.1, s * 0.05, 0.3, 0, Math.PI * 2);
      ctx.ellipse(p.x - hw * 0.55, baseY - s * 0.015, s * 0.06, s * 0.03, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE WARDEN: robe falling in two long folds, hands folded
      // on the pommel of a leaf-blade set point-down. The face
      // is planes, not features — marble keeps its distance.
      ctx.fillStyle = shade(ELF_MARBLE, -8);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.62, plinthTop);
      ctx.quadraticCurveTo(p.x - hw * 0.7, headY + s * 0.52, p.x - hw * 0.42, headY + s * 0.26);
      ctx.lineTo(p.x + hw * 0.42, headY + s * 0.26);
      ctx.quadraticCurveTo(p.x + hw * 0.66, headY + s * 0.54, p.x + hw * 0.56, plinthTop);
      ctx.closePath();
      ctx.fill();
      // The lit west fold and the deep east fold — two values
      // carry the whole figure.
      ctx.fillStyle = shade(ELF_MARBLE, 12);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.52, plinthTop);
      ctx.quadraticCurveTo(p.x - hw * 0.56, headY + s * 0.56, p.x - hw * 0.3, headY + s * 0.3);
      ctx.lineTo(p.x - hw * 0.12, headY + s * 0.3);
      ctx.quadraticCurveTo(p.x - hw * 0.26, headY + s * 0.6, p.x - hw * 0.2, plinthTop);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(ELF_MARBLE, -26);
      ctx.beginPath();
      ctx.moveTo(p.x + hw * 0.28, plinthTop);
      ctx.quadraticCurveTo(p.x + hw * 0.34, headY + s * 0.6, p.x + hw * 0.24, headY + s * 0.34);
      ctx.lineTo(p.x + hw * 0.38, headY + s * 0.32);
      ctx.quadraticCurveTo(p.x + hw * 0.52, headY + s * 0.58, p.x + hw * 0.46, plinthTop);
      ctx.closePath();
      ctx.fill();
      // Shoulders and the quiet head; the hood line breaks the
      // silhouette the way the ears would.
      ctx.fillStyle = shade(ELF_MARBLE, -2);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.44, headY + s * 0.28);
      ctx.quadraticCurveTo(p.x, headY + s * 0.14, p.x + hw * 0.44, headY + s * 0.28);
      ctx.lineTo(p.x + hw * 0.42, headY + s * 0.4);
      ctx.lineTo(p.x - hw * 0.42, headY + s * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(ELF_MARBLE, 2);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.075, headY + s * 0.2);
      ctx.quadraticCurveTo(p.x - s * 0.09, headY - s * 0.02, p.x, headY - s * 0.05);
      ctx.quadraticCurveTo(p.x + s * 0.09, headY - s * 0.02, p.x + s * 0.075, headY + s * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(ELF_MARBLE, 14);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.055, headY + s * 0.18);
      ctx.quadraticCurveTo(p.x - s * 0.065, headY, p.x - s * 0.01, headY - s * 0.035);
      ctx.lineTo(p.x - s * 0.01, headY + s * 0.18);
      ctx.closePath();
      ctx.fill();
      // The upswept ears — this is an ELF in marble, read at a
      // glance from across the square.
      for (const sgn of [-1, 1]) {
        ctx.fillStyle = shade(ELF_MARBLE, sgn < 0 ? 10 : -12);
        ctx.beginPath();
        ctx.moveTo(p.x + sgn * s * 0.06, headY + s * 0.06);
        ctx.lineTo(p.x + sgn * s * 0.135, headY - s * 0.045);
        ctx.lineTo(p.x + sgn * s * 0.07, headY + s * 0.11);
        ctx.closePath();
        ctx.fill();
      }
      // The leaf-blade, point down: mithril earns the kit's one
      // hard edge even in stone company.
      ctx.fillStyle = ELF_MITHRIL;
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.035, headY + s * 0.62);
      ctx.quadraticCurveTo(p.x - s * 0.05, plinthTop - s * 0.22, p.x, plinthTop - s * 0.02);
      ctx.quadraticCurveTo(p.x + s * 0.05, plinthTop - s * 0.22, p.x + s * 0.035, headY + s * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = ELF_MITHRIL_LIT;
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.012, headY + s * 0.62);
      ctx.quadraticCurveTo(p.x - s * 0.02, plinthTop - s * 0.2, p.x, plinthTop - s * 0.03);
      ctx.lineTo(p.x, headY + s * 0.62);
      ctx.closePath();
      ctx.fill();
      // Crossguard leaves and the folded hands above them.
      ctx.fillStyle = ELF_GOLD;
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.09, headY + s * 0.6);
      ctx.quadraticCurveTo(p.x, headY + s * 0.52, p.x + s * 0.09, headY + s * 0.6);
      ctx.quadraticCurveTo(p.x, headY + s * 0.68, p.x - s * 0.09, headY + s * 0.6);
      ctx.fill();
      ctx.fillStyle = shade(ELF_MARBLE, 6);
      ctx.beginPath();
      ctx.ellipse(p.x, headY + s * 0.52, s * 0.07, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

function paintMoonwell(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  const rx = s * 0.46;
  const ry = syT * 0.3;
  const rimY = baseY - s * 0.16;
  return {
    sortY: ty + 0.62,
    body: stationBody(0.66, 0.85, 0.5),
    drawShadow: () => rend.castContact(p.x, baseY + s * 0.03, s * 0.48, s * 0.13),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.03, rx * 1.1, s * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
      // Seven fitted rim stones — a low ring, mortarless, laid
      // by hands that had the centuries to get it right.
      ctx.fillStyle = shade(ELF_MARBLE, -24);
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.05, rx, ry, 0, 0, Math.PI);
      ctx.ellipse(p.x, rimY, rx, ry, 0, Math.PI, 0);
      ctx.fill();
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (0.08 + (i / 7) * 0.84);
        const sx2 = p.x + Math.cos(a) * rx * 0.96;
        const sy2 = rimY + Math.sin(a) * ry * 0.9;
        ctx.fillStyle = shade(ELF_MARBLE, -10 + ((h >> i) & 3) * 4);
        ctx.beginPath();
        ctx.moveTo(sx2 - s * 0.085, sy2);
        ctx.lineTo(sx2 + s * 0.085, sy2);
        ctx.lineTo(sx2 + s * 0.065, sy2 + s * 0.1);
        ctx.lineTo(sx2 - s * 0.065, sy2 + s * 0.1);
        ctx.closePath();
        ctx.fill();
      }
      // THE LIT WATER: the bird's eye looks INTO the well. The
      // glow grades from seafoam rim to a pale heart — this is
      // the light source, and the painter never hides it.
      ctx.fillStyle = '#4f9a8e';
      ctx.beginPath();
      ctx.ellipse(p.x, rimY, rx - s * 0.09, ry - s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ELF_GLASS;
      ctx.beginPath();
      ctx.ellipse(p.x, rimY - s * 0.005, rx * 0.66, ry * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
      const swell = 0.8 + 0.2 * Math.sin(t * 0.9 + h * 0.4);
      ctx.fillStyle = `rgba(217, 255, 244, ${0.55 + 0.25 * swell})`;
      ctx.beginPath();
      ctx.ellipse(p.x - rx * 0.06, rimY - s * 0.01, rx * 0.34, ry * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Two shimmer bands drift across the surface.
      for (let k = 0; k < 2; k++) {
        const ph = (t * 0.16 + k * 0.5 + h * 0.11) % 1;
        const bx2 = p.x - rx * 0.5 + rx * ph;
        ctx.fillStyle = `rgba(234, 252, 255, ${0.3 * Math.sin(ph * Math.PI)})`;
        ctx.beginPath();
        ctx.ellipse(bx2, rimY + ry * 0.12 - k * ry * 0.3, rx * 0.2, ry * 0.08, -0.15, 0, Math.PI * 2);
        ctx.fill();
      }
      // The rim arris closes the bowl over the glow.
      ctx.strokeStyle = shade(ELF_MARBLE, 10);
      ctx.lineWidth = Math.max(1, s * 0.032);
      ctx.beginPath();
      ctx.ellipse(p.x, rimY, rx - s * 0.04, ry - s * 0.025, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Runes on the two south stones answer the water, and the
      // mist stands up off the surface in slow wisps.
      const runePulse = 0.5 + 0.3 * Math.sin(t * 0.7 + h);
      ctx.fillStyle = `rgba(191, 255, 233, ${runePulse})`;
      ctx.fillRect(p.x - s * 0.16, baseY - s * 0.015, s * 0.02, s * 0.05);
      ctx.fillRect(p.x - s * 0.12, baseY - s * 0.005, s * 0.035, s * 0.016);
      ctx.fillRect(p.x + s * 0.1, baseY - s * 0.02, s * 0.016, s * 0.055);
      ctx.fillRect(p.x + s * 0.14, baseY - s * 0.02, s * 0.03, s * 0.014);
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.2 + k * 0.37 + h * 0.09) % 1;
        const mx = p.x - rx * 0.4 + rx * 0.8 * ((k * 0.41 + 0.15) % 1) + Math.sin(ph * 5 + k) * s * 0.05;
        const my = rimY - s * 0.06 - ph * s * 0.42;
        ctx.strokeStyle = `rgba(217, 255, 244, ${0.25 * (1 - ph)})`;
        ctx.lineWidth = Math.max(1, s * 0.025);
        ctx.beginPath();
        ctx.moveTo(mx, my + s * 0.1);
        ctx.quadraticCurveTo(mx + s * 0.045, my + s * 0.05, mx, my);
        ctx.stroke();
      }
    },
  };
}

function paintEverflame(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.24;
  const bowlY = baseY - s * 0.78;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.62, 1.65, 0.45),
    drawShadow: () => rend.castContact(p.x, baseY + s * 0.02, s * 0.36, s * 0.11),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, s * 0.38, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // Three swept legs — two read, the third peeks between.
      const legTo = (x0: number, foot: number, tone: number) => {
        ctx.fillStyle = shade(ELF_MITHRIL, tone);
        ctx.beginPath();
        ctx.moveTo(x0 - s * 0.026, bowlY + s * 0.1);
        ctx.lineTo(x0 + s * 0.026, bowlY + s * 0.1);
        ctx.quadraticCurveTo(x0 + (foot - x0) * 0.4, baseY - s * 0.3, foot + s * 0.024, baseY);
        ctx.lineTo(foot - s * 0.024, baseY);
        ctx.quadraticCurveTo(x0 + (foot - x0) * 0.34, baseY - s * 0.32, x0 - s * 0.026, bowlY + s * 0.1);
        ctx.closePath();
        ctx.fill();
      };
      legTo(p.x + s * 0.02, p.x, -30);
      legTo(p.x - s * 0.1, p.x - s * 0.3, -10);
      legTo(p.x + s * 0.12, p.x + s * 0.3, -18);
      // The basin: a wide shallow mithril bowl, rim arris LIT —
      // the one hard edge, holding the hall's oldest light.
      ctx.fillStyle = shade(ELF_MITHRIL, -22);
      ctx.beginPath();
      ctx.ellipse(p.x, bowlY, s * 0.34, syT * 0.19, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = shade(ELF_MITHRIL, -8);
      ctx.beginPath();
      ctx.ellipse(p.x, bowlY, s * 0.34, syT * 0.17, 0, 0, Math.PI * 2);
      ctx.fill();
      // The silver coal bed inside.
      ctx.fillStyle = '#9fc8e8';
      ctx.beginPath();
      ctx.ellipse(p.x, bowlY - s * 0.01, s * 0.27, syT * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      const beat = 0.85 + 0.15 * Math.sin(t * 1.6 + h * 0.5);
      ctx.fillStyle = `rgba(223, 242, 255, ${0.55 + 0.25 * beat})`;
      ctx.beginPath();
      ctx.ellipse(p.x - s * 0.03, bowlY - s * 0.02, s * 0.16, syT * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE FLAME: three tongues of silver-white — the tall
      // heart and two leaning answers, wavering on slow clocks.
      // Cool fire: the camp's bonfire is its opposite number.
      const tongue = (
        fx2: number,
        fh: number,
        fw: number,
        lean: number,
        tone: string,
        ph: number,
      ) => {
        const wob = Math.sin(t * 2.6 + ph) * s * 0.03;
        ctx.fillStyle = tone;
        ctx.beginPath();
        ctx.moveTo(fx2 - fw, bowlY - s * 0.02);
        ctx.quadraticCurveTo(fx2 - fw * 0.7 + lean * 0.4, bowlY - fh * 0.55, fx2 + lean + wob, bowlY - fh);
        ctx.quadraticCurveTo(fx2 + fw * 0.7 + lean * 0.4, bowlY - fh * 0.5, fx2 + fw, bowlY - s * 0.02);
        ctx.closePath();
        ctx.fill();
      };
      tongue(p.x - s * 0.11, s * 0.42, s * 0.075, -s * 0.05, 'rgba(159, 200, 232, 0.85)', 1.7);
      tongue(p.x + s * 0.12, s * 0.5, s * 0.08, s * 0.06, 'rgba(159, 200, 232, 0.85)', 3.9);
      tongue(p.x, s * 0.74, s * 0.11, s * 0.015, '#dff2ff', 0.6);
      tongue(p.x, s * 0.46, s * 0.06, s * 0.005, '#ffffff', 2.8);
      // Motes rise off the flame and go out like small stars.
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.34 + k * 0.33 + h * 0.13) % 1;
        const mx = p.x + Math.sin(ph * 7 + k * 2) * s * 0.09;
        const my = bowlY - s * 0.5 - ph * s * 0.55;
        ctx.fillStyle = `rgba(234, 252, 255, ${0.75 * (1 - ph)})`;
        ctx.fillRect(mx - s * 0.012, my - s * 0.012, s * 0.024, s * 0.024);
      }
      // The rim's lit arris, drawn over the flame roots.
      ctx.strokeStyle = ELF_MITHRIL_LIT;
      ctx.lineWidth = Math.max(1, s * 0.03);
      ctx.beginPath();
      ctx.ellipse(p.x, bowlY, s * 0.335, syT * 0.165, 0, 0.15, Math.PI - 0.15);
      ctx.stroke();
    },
  };
}

function paintMithrilAnvil(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.26;
  const faceY = baseY - s * 0.74;
  const sparkPh = (t * 0.5 + h * 0.17) % 1;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.66, 1.2, 0.5),
    drawShadow: () => rend.castContact(p.x, baseY + s * 0.02, s * 0.4, s * 0.12),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, s * 0.42, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // The carved root plinth: stone that was ASKED to hold an
      // anvil — three root toes grip the ground.
      ctx.fillStyle = shade(ELF_MARBLE, -30);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.26, baseY);
      ctx.quadraticCurveTo(p.x - s * 0.22, baseY - s * 0.3, p.x - s * 0.17, baseY - s * 0.4);
      ctx.lineTo(p.x + s * 0.17, baseY - s * 0.4);
      ctx.quadraticCurveTo(p.x + s * 0.22, baseY - s * 0.3, p.x + s * 0.26, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(ELF_MARBLE, -14);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.22, baseY);
      ctx.quadraticCurveTo(p.x - s * 0.18, baseY - s * 0.28, p.x - s * 0.13, baseY - s * 0.38);
      ctx.lineTo(p.x - s * 0.02, baseY - s * 0.38);
      ctx.quadraticCurveTo(p.x - s * 0.06, baseY - s * 0.2, p.x - s * 0.04, baseY);
      ctx.closePath();
      ctx.fill();
      for (const [tx2, tw] of [
        [-0.3, 0.1],
        [0.02, 0.08],
        [0.24, 0.1],
      ] as const) {
        ctx.fillStyle = shade(ELF_MARBLE, -22);
        ctx.beginPath();
        ctx.moveTo(p.x + s * tx2, baseY);
        ctx.quadraticCurveTo(p.x + s * (tx2 + tw * 0.4), baseY - s * 0.12, p.x + s * (tx2 + tw), baseY - s * 0.04);
        ctx.lineTo(p.x + s * (tx2 + tw), baseY);
        ctx.closePath();
        ctx.fill();
      }
      // The anvil: waist, then the long swept horn — a smith's
      // tool drawn with a jeweler's line.
      ctx.fillStyle = shade(ELF_MITHRIL, -16);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.13, faceY + s * 0.34);
      ctx.quadraticCurveTo(p.x, faceY + s * 0.26, p.x + s * 0.13, faceY + s * 0.34);
      ctx.lineTo(p.x + s * 0.15, faceY + s * 0.12);
      ctx.lineTo(p.x - s * 0.15, faceY + s * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(ELF_MITHRIL, -6);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.3, faceY + s * 0.12);
      ctx.lineTo(p.x + s * 0.28, faceY + s * 0.12);
      ctx.lineTo(p.x + s * 0.28, faceY + s * 0.02);
      ctx.quadraticCurveTo(p.x + s * 0.52, faceY - s * 0.02, p.x + s * 0.58, faceY - s * 0.18);
      ctx.quadraticCurveTo(p.x + s * 0.42, faceY - s * 0.06, p.x + s * 0.26, faceY - s * 0.05);
      ctx.lineTo(p.x - s * 0.3, faceY - s * 0.05);
      ctx.closePath();
      ctx.fill();
      // The face: the brightest plane in the piece — mithril
      // polished by ten thousand true blows.
      ctx.fillStyle = ELF_MITHRIL_LIT;
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.3, faceY - s * 0.05);
      ctx.lineTo(p.x + s * 0.26, faceY - s * 0.05);
      ctx.quadraticCurveTo(p.x + s * 0.42, faceY - s * 0.06, p.x + s * 0.56, faceY - s * 0.185);
      ctx.lineTo(p.x + s * 0.5, faceY - s * 0.21);
      ctx.quadraticCurveTo(p.x + s * 0.38, faceY - s * 0.1, p.x + s * 0.24, faceY - s * 0.095);
      ctx.lineTo(p.x - s * 0.28, faceY - s * 0.095);
      ctx.closePath();
      ctx.fill();
      // The hardy hole: one dark socket in the bright face.
      ctx.fillStyle = shade(ELF_MITHRIL, -34);
      ctx.fillRect(p.x - s * 0.2, faceY - s * 0.085, s * 0.045, s * 0.03);
      // A slim hammer rests against the plinth, head down —
      // work paused, never abandoned.
      ctx.save();
      ctx.translate(p.x - s * 0.34, baseY - s * 0.1);
      ctx.rotate(0.5);
      ctx.fillStyle = shade(ELF_WOOD, 6);
      ctx.fillRect(-s * 0.014, -s * 0.34, s * 0.028, s * 0.34);
      ctx.fillStyle = ELF_MITHRIL;
      ctx.fillRect(-s * 0.055, -s * 0.4, s * 0.11, s * 0.07);
      ctx.fillStyle = ELF_MITHRIL_LIT;
      ctx.fillRect(-s * 0.055, -s * 0.4, s * 0.11, s * 0.018);
      ctx.restore();
      // A cooling spark pops off the horn now and then — the
      // forge's heartbeat, one bright pixel at a time.
      if (sparkPh < 0.1) {
        const sp = sparkPh / 0.1;
        ctx.fillStyle = `rgba(240, 250, 255, ${0.9 * (1 - sp)})`;
        const sx2 = p.x + s * 0.54 + sp * s * 0.1;
        const sy2 = faceY - s * 0.2 - Math.sin(sp * Math.PI) * s * 0.12;
        ctx.fillRect(sx2 - s * 0.014, sy2 - s * 0.014, s * 0.028, s * 0.028);
      }
    },
  };
}

function paintElvenArmsRack(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.28;
  const hw = s * 0.4;
  const topRail = baseY - s * 1.08;
  const midRail = baseY - s * 0.66;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.68, 1.55, 0.45),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - hw * 0.9, baseY, p.x + hw * 0.9, baseY, 1.0);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, hw * 1.15, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      // The frame: this is a GALLERY, not the camp's leaning
      // pyramid — two swept uprights, two true rails.
      for (const sgn of [-1, 1]) {
        const ux = p.x + sgn * hw;
        ctx.fillStyle = shade(ELF_WOOD, sgn < 0 ? 2 : -10);
        ctx.beginPath();
        ctx.moveTo(ux - s * 0.036, baseY);
        ctx.lineTo(ux + s * 0.036, baseY);
        ctx.quadraticCurveTo(ux + sgn * s * 0.045 + s * 0.022, baseY - s * 0.6, ux + sgn * s * 0.015 + s * 0.02, topRail - s * 0.14);
        ctx.lineTo(ux + sgn * s * 0.015 - s * 0.02, topRail - s * 0.14);
        ctx.quadraticCurveTo(ux + sgn * s * 0.045 - s * 0.022, baseY - s * 0.6, ux - s * 0.036, baseY);
        ctx.closePath();
        ctx.fill();
        // The upright's crown curls once — the maker's mark.
        ctx.fillStyle = shade(ELF_WOOD, -4);
        ctx.beginPath();
        facetCircle(ctx, ux + sgn * s * 0.015, topRail - s * 0.16, s * 0.038, 6, 0.3, 1);
        ctx.fill();
        ctx.fillStyle = shade(ELF_WOOD, -22);
        ctx.fillRect(ux - s * 0.055, baseY - s * 0.028, s * 0.11, s * 0.028);
      }
      const rail = (ry2: number) => {
        ctx.fillStyle = shade(ELF_WOOD, -12);
        ctx.fillRect(p.x - hw, ry2, hw * 2, s * 0.04);
        ctx.fillStyle = shade(ELF_WOOD, 10);
        ctx.fillRect(p.x - hw, ry2, hw * 2, s * 0.013);
      };
      rail(topRail);
      rail(midRail);
      // Silver pegs cradle each piece.
      ctx.fillStyle = ELF_MITHRIL_LIT;
      for (const px2 of [p.x - hw * 0.55, p.x + hw * 0.4]) {
        ctx.fillRect(px2 - s * 0.012, topRail - s * 0.05, s * 0.024, s * 0.05);
        ctx.fillRect(px2 - s * 0.012, midRail - s * 0.05, s * 0.024, s * 0.05);
      }
      // THE LONG BLADE rests on the top pegs — second pass: at
      // map scale the first draft's blade vanished into the
      // rail, so the display pieces now carry REAL mass. A dark
      // seat shadow lifts the blade off the rail, the blade is
      // twice the weight, and the lit edge is a painted facet,
      // not a hairline.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
      ctx.fillRect(p.x - hw * 0.8, topRail - s * 0.03, hw * 1.66, s * 0.03);
      ctx.fillStyle = ELF_MITHRIL;
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.82, topRail - s * 0.12);
      ctx.quadraticCurveTo(p.x - hw * 0.2, topRail - s * 0.185, p.x + hw * 0.5, topRail - s * 0.135);
      ctx.quadraticCurveTo(p.x + hw * 0.74, topRail - s * 0.115, p.x + hw * 0.9, topRail - s * 0.175);
      ctx.lineTo(p.x + hw * 0.86, topRail - s * 0.045);
      ctx.quadraticCurveTo(p.x - hw * 0.2, topRail - s * 0.075, p.x - hw * 0.78, topRail - s * 0.035);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = ELF_MITHRIL_LIT;
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.82, topRail - s * 0.12);
      ctx.quadraticCurveTo(p.x - hw * 0.2, topRail - s * 0.185, p.x + hw * 0.5, topRail - s * 0.135);
      ctx.quadraticCurveTo(p.x + hw * 0.74, topRail - s * 0.115, p.x + hw * 0.9, topRail - s * 0.175);
      ctx.lineTo(p.x + hw * 0.88, topRail - s * 0.125);
      ctx.quadraticCurveTo(p.x + hw * 0.72, topRail - s * 0.155, p.x + hw * 0.5, topRail - s * 0.175);
      ctx.quadraticCurveTo(p.x - hw * 0.2, topRail - s * 0.225, p.x - hw * 0.8, topRail - s * 0.155);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = ELF_GOLD;
      ctx.fillRect(p.x - hw * 0.74, topRail - s * 0.16, s * 0.13, s * 0.1);
      ctx.fillStyle = shade(ELF_GOLD, 20);
      ctx.fillRect(p.x - hw * 0.74, topRail - s * 0.16, s * 0.13, s * 0.026);
      // THE SHORT BLADE on the mid pegs, sheathed in leaf-green
      // with a mithril chape and locket — the pair reads a set.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
      ctx.fillRect(p.x - hw * 0.6, midRail - s * 0.03, hw * 1.2, s * 0.03);
      ctx.fillStyle = ELF_LEAF;
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.62, midRail - s * 0.13);
      ctx.quadraticCurveTo(p.x, midRail - s * 0.165, p.x + hw * 0.56, midRail - s * 0.115);
      ctx.lineTo(p.x + hw * 0.56, midRail - s * 0.035);
      ctx.quadraticCurveTo(p.x, midRail - s * 0.085, p.x - hw * 0.62, midRail - s * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(ELF_LEAF, 18);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.62, midRail - s * 0.13);
      ctx.quadraticCurveTo(p.x, midRail - s * 0.165, p.x + hw * 0.56, midRail - s * 0.115);
      ctx.lineTo(p.x + hw * 0.56, midRail - s * 0.09);
      ctx.quadraticCurveTo(p.x, midRail - s * 0.14, p.x - hw * 0.62, midRail - s * 0.105);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = ELF_MITHRIL_LIT;
      ctx.beginPath();
      ctx.moveTo(p.x + hw * 0.56, midRail - s * 0.125);
      ctx.lineTo(p.x + hw * 0.74, midRail - s * 0.09);
      ctx.lineTo(p.x + hw * 0.56, midRail - s * 0.03);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = ELF_MITHRIL;
      ctx.fillRect(p.x - hw * 0.2, midRail - s * 0.15, s * 0.05, s * 0.12);
      ctx.fillStyle = ELF_GOLD;
      ctx.fillRect(p.x - hw * 0.54, midRail - s * 0.15, s * 0.1, s * 0.11);
      // THE GREAT BOW stands west of the east upright, full and
      // clear of the frame — a drawn arc the eye can string.
      const bowX = p.x + hw * 0.7;
      ctx.fillStyle = shade(ELF_WOOD, 22);
      ctx.beginPath();
      ctx.moveTo(bowX - s * 0.13, baseY - s * 0.02);
      ctx.quadraticCurveTo(bowX - s * 0.36, baseY - s * 0.7, bowX - s * 0.05, topRail - s * 0.3);
      ctx.lineTo(bowX + s * 0.005, topRail - s * 0.26);
      ctx.quadraticCurveTo(bowX - s * 0.26, baseY - s * 0.66, bowX - s * 0.06, baseY - s * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = ELF_MITHRIL_LIT;
      ctx.fillRect(bowX - s * 0.07, topRail - s * 0.31, s * 0.06, s * 0.03);
      ctx.fillRect(bowX - s * 0.135, baseY - s * 0.05, s * 0.06, s * 0.03);
      ctx.strokeStyle = 'rgba(222, 233, 248, 0.7)';
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(bowX - s * 0.03, topRail - s * 0.28);
      ctx.lineTo(bowX - s * 0.1, baseY - s * 0.04);
      ctx.stroke();
    },
  };
}

function paintElvenPlanter(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  const rimY = baseY - s * 0.62;
  const { sway, lag } = rend.breezeAt(tx, ty, t, tx * 1.6 + ty * 2.4, s, 0.008, 0.018);
  return {
    sortY: ty + 0.64,
    body: stationBody(0.55, 1.45, 0.4),
    drawShadow: () => rend.castContact(p.x, baseY + s * 0.02, s * 0.26, s * 0.09),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.015, s * 0.28, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      // The urn: foot, swelling belly, drawn-in neck — marble
      // with a carved leaf band riding the widest course.
      ctx.fillStyle = shade(ELF_MARBLE, -18);
      ctx.fillRect(p.x - s * 0.12, baseY - s * 0.07, s * 0.24, s * 0.07);
      ctx.fillStyle = shade(ELF_MARBLE, -6);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.1, baseY - s * 0.07);
      ctx.quadraticCurveTo(p.x - s * 0.3, baseY - s * 0.26, p.x - s * 0.19, rimY + s * 0.1);
      ctx.lineTo(p.x + s * 0.19, rimY + s * 0.1);
      ctx.quadraticCurveTo(p.x + s * 0.3, baseY - s * 0.26, p.x + s * 0.1, baseY - s * 0.07);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(ELF_MARBLE, 10);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.08, baseY - s * 0.08);
      ctx.quadraticCurveTo(p.x - s * 0.24, baseY - s * 0.26, p.x - s * 0.15, rimY + s * 0.11);
      ctx.lineTo(p.x - s * 0.06, rimY + s * 0.11);
      ctx.quadraticCurveTo(p.x - s * 0.13, baseY - s * 0.24, p.x - s * 0.03, baseY - s * 0.08);
      ctx.closePath();
      ctx.fill();
      // The carved leaf band: alternating chevron leaves.
      ctx.fillStyle = shade(ELF_MARBLE, -26);
      for (let i = 0; i < 5; i++) {
        const lx = p.x - s * 0.18 + i * s * 0.09;
        ctx.beginPath();
        ctx.moveTo(lx, baseY - s * 0.3);
        ctx.lineTo(lx + s * 0.035, baseY - s * 0.36);
        ctx.lineTo(lx + s * 0.07, baseY - s * 0.3);
        ctx.lineTo(lx + s * 0.035, baseY - s * 0.33);
        ctx.closePath();
        ctx.fill();
      }
      // The mouth: the eye looks INTO it — dark soil, lit rim.
      ctx.fillStyle = shade(ELF_MARBLE, -2);
      ctx.beginPath();
      ctx.ellipse(p.x, rimY + s * 0.1, s * 0.2, syT * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a3020';
      ctx.beginPath();
      ctx.ellipse(p.x, rimY + s * 0.1, s * 0.15, syT * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      // SILVERBELL TRACERY: the fair house does not MOUND its
      // planting — it TRAINS it. Five pale fronds rise from the
      // mouth and weep outward in one drawn fan; moon-white
      // bells hang from the two tallest arcs; the whole piece
      // carries a breath of cool light (paint, never a lamp).
      const leaf = (lx: number, ly: number, ang: number, tone: string) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(ang);
        ctx.fillStyle = tone;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(s * 0.05, -s * 0.07, 0, -s * 0.16);
        ctx.quadraticCurveTo(-s * 0.05, -s * 0.07, 0, 0);
        ctx.fill();
        ctx.restore();
      };
      // The moon-breath: one soft cool wash behind the crown.
      ctx.fillStyle = 'rgba(196, 224, 255, 0.12)';
      ctx.beginPath();
      facetCircle(ctx, p.x + sway * 0.4, rimY - s * 0.32, s * 0.34, 8, 0.4, 0.85);
      ctx.fill();
      // The frond fan: each arc its own reach and droop, the
      // silver tones dealt symmetrically — drawn tracery, not
      // a spill. Tips carry the wind; roots hold the mouth.
      const fronds: ReadonlyArray<readonly [number, number, number, string]> = [
        [-0.3, -0.34, -0.24, '#a8c4b0'],
        [-0.16, -0.52, -0.1, '#cfe0d4'],
        [0.0, -0.62, 0.03, '#b8d4c0'],
        [0.16, -0.5, 0.12, '#cfe0d4'],
        [0.3, -0.3, 0.26, '#a8c4b0'],
      ];
      for (const [reach, rise, tipDx, tone] of fronds) {
        const rootX = p.x + reach * s * 0.24;
        const apexX = p.x + reach * s * 0.7 + sway * 0.35;
        const apexY = rimY + rise * s;
        const tipX = p.x + (reach + tipDx) * s + sway * 0.6;
        const tipY = apexY + s * 0.14;
        // A FILLED blade, wide at the root, drawn to a point —
        // stroke-thin fronds drown in the outline pass's ink
        // and read as dark tentacles (shipped once; the blade
        // fill is what survives the ring).
        const bw2 = s * 0.05;
        ctx.fillStyle = tone;
        ctx.beginPath();
        ctx.moveTo(rootX - bw2, rimY + s * 0.09);
        ctx.quadraticCurveTo(apexX - bw2 * 0.7, apexY - s * 0.012, tipX, tipY);
        ctx.quadraticCurveTo(apexX + bw2 * 0.7, apexY + s * 0.03, rootX + bw2, rimY + s * 0.1);
        ctx.closePath();
        ctx.fill();
        // The blade's shaded keel — the fold that turns it.
        ctx.strokeStyle = shade(tone, -16);
        ctx.lineWidth = Math.max(1, s * 0.011);
        ctx.beginPath();
        ctx.moveTo(rootX, rimY + s * 0.095);
        ctx.quadraticCurveTo(apexX, apexY + s * 0.008, tipX, tipY);
        ctx.stroke();
        leaf(tipX, tipY, reach * 2.2, shade(tone, -8));
      }
      // The bells: two hung from the tall arcs, one budding
      // upright at the crown — moonglass white with a cool
      // shaded cheek and the gold clapper pip earning its glint.
      const bell = (bx: number, by: number, r: number, hang: number) => {
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(hang);
        ctx.fillStyle = '#e8f4ff';
        ctx.beginPath();
        ctx.moveTo(-r * 0.4, 0);
        ctx.quadraticCurveTo(-r * 0.5, r * 0.75, -r * 0.85, r * 1.15);
        ctx.lineTo(r * 0.85, r * 1.15);
        ctx.quadraticCurveTo(r * 0.5, r * 0.75, r * 0.4, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(140, 170, 210, 0.4)';
        ctx.beginPath();
        ctx.moveTo(r * 0.2, r * 0.05);
        ctx.quadraticCurveTo(r * 0.4, r * 0.7, r * 0.8, r * 1.12);
        ctx.lineTo(r * 0.3, r * 1.12);
        ctx.quadraticCurveTo(r * 0.12, r * 0.6, r * 0.05, r * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = ELF_GOLD;
        ctx.fillRect(-r * 0.14, r * 1.05, r * 0.28, r * 0.32);
        ctx.restore();
      };
      bell(p.x - s * 0.24 + sway * 0.5, rimY - s * 0.36, s * 0.068, -0.18 + sway * 0.02);
      bell(p.x + s * 0.26 + sway * 0.55, rimY - s * 0.34, s * 0.068, 0.22 + sway * 0.02);
      // The crown bud: closed, upright, waiting its night.
      ctx.fillStyle = '#dcecfc';
      ctx.beginPath();
      ctx.ellipse(p.x + s * 0.005 + sway * 0.6, rimY - s * 0.66, s * 0.028, s * 0.044, sway * 0.02, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ELF_GOLD;
      ctx.fillRect(p.x - s * 0.006 + sway * 0.6, rimY - s * 0.71, s * 0.012, s * 0.012);
      // One staggered star over the crown — the imbued lane's
      // quiet signature, a breath, never a beacon.
      const tw = Math.max(0, Math.sin(t * 0.7 + h * 0.4) - 0.92) / 0.08;
      if (tw > 0) rend.sparkle(p.x + s * 0.14, rimY - s * 0.72, s * 0.055, 0.55 * tw, '#dce8ff');
      // The trained tendril: one deliberate S down the east
      // flank, paired leaves, ending in a gardener's curl — a
      // TRAINED line, not an escape (the spill read as a stain).
      ctx.strokeStyle = ELF_LEAF;
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.moveTo(p.x + s * 0.17, rimY + s * 0.1);
      ctx.quadraticCurveTo(p.x + s * 0.3, baseY - s * 0.34, p.x + s * 0.22, baseY - s * 0.16);
      ctx.quadraticCurveTo(p.x + s * 0.16, baseY - s * 0.06, p.x + s * 0.26 + lag * 0.5, baseY - s * 0.05);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.x + s * 0.29 + lag * 0.5, baseY - s * 0.075, s * 0.028, 0.6, 3.6);
      ctx.stroke();
      leaf(p.x + s * 0.27, baseY - s * 0.34, 1.1, ELF_LEAF);
      leaf(p.x + s * 0.2, baseY - s * 0.18, 1.5, shade(ELF_LEAF, 12));
    },
  };
}

function paintElvenMirror(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.22;
  const cx2 = p.x - s * 0.03;
  const cy2 = baseY - s * 0.78;
  const mrx = s * 0.26;
  const mry = s * 0.46;
  const glintPh = (t * 0.22 + h * 0.09) % 1;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.52, 1.5, 0.4),
    drawShadow: () => rend.castContact(p.x, baseY + s * 0.02, s * 0.26, s * 0.09),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.015, s * 0.28, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      // The rear brace leg tells the tilt (perspective honesty:
      // a standing mirror leans, so its foot steps back east).
      ctx.fillStyle = shade(ELF_WOOD, -20);
      ctx.beginPath();
      ctx.moveTo(cx2 + mrx * 0.5, cy2 + mry * 0.6);
      ctx.lineTo(cx2 + mrx * 0.62, cy2 + mry * 0.55);
      ctx.lineTo(p.x + s * 0.3, baseY - s * 0.02);
      ctx.lineTo(p.x + s * 0.24, baseY);
      ctx.closePath();
      ctx.fill();
      // Two front feet.
      ctx.fillStyle = shade(ELF_WOOD, -10);
      ctx.fillRect(cx2 - mrx * 0.8 - s * 0.03, baseY - s * 0.04, s * 0.1, s * 0.04);
      ctx.fillRect(cx2 + mrx * 0.55 - s * 0.03, baseY - s * 0.028, s * 0.1, s * 0.028);
      ctx.fillStyle = shade(ELF_WOOD, -4);
      ctx.beginPath();
      ctx.moveTo(cx2 - mrx * 0.76, baseY - s * 0.02);
      ctx.lineTo(cx2 - mrx * 0.35, cy2 + mry * 0.72);
      ctx.lineTo(cx2 - mrx * 0.2, cy2 + mry * 0.78);
      ctx.lineTo(cx2 - mrx * 0.62, baseY - s * 0.02);
      ctx.closePath();
      ctx.fill();
      // The oval frame: a full vine ring — drawn as the frame
      // ellipse, the glass laid inside it.
      ctx.fillStyle = shade(ELF_WOOD, -2);
      ctx.beginPath();
      ctx.ellipse(cx2, cy2, mrx + s * 0.05, mry + s * 0.05, -0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(ELF_WOOD, 12);
      ctx.beginPath();
      ctx.ellipse(cx2 - s * 0.012, cy2 - s * 0.012, mrx + s * 0.04, mry + s * 0.04, -0.06, Math.PI * 0.7, Math.PI * 1.6);
      ctx.lineTo(cx2 - s * 0.012 + Math.cos(Math.PI * 1.6) * mrx, cy2 - s * 0.012 + Math.sin(Math.PI * 1.6) * mry);
      ctx.ellipse(cx2 - s * 0.012, cy2 - s * 0.012, mrx + s * 0.015, mry + s * 0.015, -0.06, Math.PI * 1.6, Math.PI * 0.7, true);
      ctx.closePath();
      ctx.fill();
      // THE GLASS: a cool pool standing upright — three value
      // bands, then the slow diagonal glint that makes it glass.
      ctx.fillStyle = '#8ba4b8';
      ctx.beginPath();
      ctx.ellipse(cx2, cy2, mrx, mry, -0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a8bccc';
      ctx.beginPath();
      ctx.ellipse(cx2 - mrx * 0.12, cy2 - mry * 0.1, mrx * 0.78, mry * 0.78, -0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c4d4e0';
      ctx.beginPath();
      ctx.ellipse(cx2 - mrx * 0.22, cy2 - mry * 0.24, mrx * 0.4, mry * 0.46, -0.12, 0, Math.PI * 2);
      ctx.fill();
      // A vague pale figure stands in the glass — never sharp,
      // never anyone: the room's light remembered.
      ctx.fillStyle = 'rgba(222, 233, 248, 0.3)';
      ctx.beginPath();
      ctx.ellipse(cx2 + mrx * 0.1, cy2 + mry * 0.16, mrx * 0.16, mry * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      if (glintPh < 0.14) {
        const gp = glintPh / 0.14;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx2, cy2, mrx, mry, -0.06, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = `rgba(240, 250, 255, ${0.45 * Math.sin(gp * Math.PI)})`;
        const gx2 = cx2 - mrx * 1.4 + mrx * 2.8 * gp;
        ctx.beginPath();
        ctx.moveTo(gx2 - s * 0.05, cy2 + mry * 1.1);
        ctx.lineTo(gx2 + s * 0.09, cy2 - mry * 1.1);
        ctx.lineTo(gx2 + s * 0.16, cy2 - mry * 1.1);
        ctx.lineTo(gx2 + s * 0.02, cy2 + mry * 1.1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      // The crown curl and its gold bead top the frame; two
      // small curls answer at the base.
      ctx.fillStyle = shade(ELF_WOOD, 2);
      ctx.beginPath();
      facetCircle(ctx, cx2 + s * 0.01, cy2 - mry - s * 0.1, s * 0.05, 6, 0.2, 1);
      ctx.fill();
      ctx.fillStyle = ELF_GOLD;
      ctx.beginPath();
      facetCircle(ctx, cx2 + s * 0.01, cy2 - mry - s * 0.1, s * 0.02, 5, 0.5, 1);
      ctx.fill();
      ctx.fillStyle = shade(ELF_WOOD, -8);
      ctx.beginPath();
      facetCircle(ctx, cx2 - mrx * 0.72, cy2 + mry * 0.78, s * 0.038, 6, 0.5, 1);
      ctx.fill();
      ctx.beginPath();
      facetCircle(ctx, cx2 + mrx * 0.66, cy2 + mry * 0.82, s * 0.033, 6, 0.1, 1);
      ctx.fill();
    },
  };
}

function paintElvenWaystone(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.3;
  const topY = baseY - s * 1.42;
  const runePulse = 0.5 + 0.3 * Math.sin(t * 0.8 + h * 0.7);
  return {
    sortY: ty + 0.7,
    body: stationBody(0.52, 1.7, 0.45),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - s * 0.22, baseY, p.x + s * 0.22, baseY, 1.15);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, s * 0.3, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // The earth remembers the raising: a low mound grips the
      // stone's foot.
      ctx.fillStyle = '#6e5c38';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.02, s * 0.3, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // The monolith: one swept west edge, one straight east —
      // even the standing stone carries the kit's line. Three
      // value planes, faceted, never rounded.
      ctx.fillStyle = shade(ELF_MARBLE, -38);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.2, baseY);
      ctx.quadraticCurveTo(p.x - s * 0.3, baseY - s * 0.8, p.x - s * 0.1, topY + s * 0.06);
      ctx.lineTo(p.x + s * 0.12, topY);
      ctx.lineTo(p.x + s * 0.22, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(ELF_MARBLE, -16);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.2, baseY);
      ctx.quadraticCurveTo(p.x - s * 0.3, baseY - s * 0.8, p.x - s * 0.1, topY + s * 0.06);
      ctx.lineTo(p.x + s * 0.04, topY + s * 0.02);
      ctx.lineTo(p.x + s * 0.08, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(ELF_MARBLE, 0);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.185, baseY);
      ctx.quadraticCurveTo(p.x - s * 0.275, baseY - s * 0.78, p.x - s * 0.095, topY + s * 0.07);
      ctx.lineTo(p.x - s * 0.03, topY + s * 0.05);
      ctx.lineTo(p.x - s * 0.06, baseY);
      ctx.closePath();
      ctx.fill();
      // The crown facet: a small foreshortened top plane.
      ctx.fillStyle = shade(ELF_MARBLE, 12);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.1, topY + s * 0.06);
      ctx.lineTo(p.x + s * 0.12, topY);
      ctx.lineTo(p.x + s * 0.1, topY - syT * 0.1);
      ctx.lineTo(p.x - s * 0.08, topY - syT * 0.1 + s * 0.05);
      ctx.closePath();
      ctx.fill();
      // MITHRIL VEINS: the ore the elves opened runs live
      // through their marker stones — two branching threads,
      // wide enough to read from the road.
      ctx.strokeStyle = ELF_VEIN;
      ctx.lineWidth = Math.max(1, s * 0.024);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.06, baseY - s * 0.08);
      ctx.quadraticCurveTo(p.x - s * 0.1, baseY - s * 0.5, p.x + s * 0.01, baseY - s * 0.72);
      ctx.moveTo(p.x - s * 0.055, baseY - s * 0.42);
      ctx.quadraticCurveTo(p.x + s * 0.03, baseY - s * 0.52, p.x + s * 0.075, baseY - s * 0.4);
      ctx.stroke();
      ctx.fillStyle = 'rgba(220, 233, 248, 0.8)';
      ctx.fillRect(p.x + s * 0.002, baseY - s * 0.73, s * 0.018, s * 0.018);
      ctx.fillRect(p.x + s * 0.068, baseY - s * 0.41, s * 0.015, s * 0.015);
      // THE SCRIPT BAND: a carved course of way-signs, lit from
      // within on a slow breath — the road-word still speaking.
      ctx.fillStyle = shade(ELF_MARBLE, -30);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.155, baseY - s * 0.86);
      ctx.lineTo(p.x + s * 0.15, baseY - s * 0.92);
      ctx.lineTo(p.x + s * 0.145, baseY - s * 1.12);
      ctx.lineTo(p.x - s * 0.14, baseY - s * 1.06);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(159, 232, 216, ${runePulse})`;
      const glyphs: ReadonlyArray<readonly [number, number, number, number]> = [
        [-0.115, 0.985, 0.016, 0.09],
        [-0.075, 0.955, 0.05, 0.016],
        [-0.02, 1.0, 0.016, 0.1],
        [0.02, 0.94, 0.04, 0.016],
        [0.075, 1.02, 0.016, 0.07],
        [0.1, 0.96, 0.035, 0.016],
      ];
      for (const [gx2, gy2, gw2, gh2] of glyphs) {
        ctx.fillRect(p.x + s * gx2, baseY - s * gy2 - s * gh2, s * gw2, s * gh2);
      }
      // Moss at the shaded foot; two small stones lean where
      // travelers left them — the waystone is VISITED.
      ctx.fillStyle = 'rgba(93, 138, 110, 0.55)';
      ctx.beginPath();
      ctx.ellipse(p.x + s * 0.14, baseY - s * 0.06, s * 0.07, s * 0.04, 0.4, 0, Math.PI * 2);
      ctx.ellipse(p.x - s * 0.12, baseY - s * 0.6, s * 0.05, s * 0.09, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(ELF_MARBLE, -22);
      ctx.beginPath();
      facetCircle(ctx, p.x - s * 0.26, baseY - s * 0.02, s * 0.04, 5, 0.3, 0.7);
      ctx.fill();
      ctx.fillStyle = shade(ELF_MARBLE, -12);
      ctx.beginPath();
      facetCircle(ctx, p.x - s * 0.31, baseY - s * 0.055, s * 0.03, 5, 0.8, 0.7);
      ctx.fill();
    },
  };
}

function paintElvenChimes(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.12;
  // THE SONG OF THE AIR, imbued: no stand at all. A mithril
  // rune ring floats on a slow breath and five crystal voices
  // hang beneath it on threads of light — the wind still owns
  // their swing, the magic only holds the ring.
  const bob = Math.sin(t * 0.7 + h * 0.5) * s * 0.035;
  const ringX = p.x;
  const ringY = baseY - s * 1.32 + bob;
  const { sway, lag } = rend.breezeAt(tx, ty, t, tx * 2.7 + ty * 1.9, s, 0.014, 0.03);
  return {
    sortY: ty + 0.68,
    body: stationBody(0.55, 1.8, 0.4),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      const pulse = 0.75 + 0.25 * Math.sin(t * 0.9 + h * 0.6);
      // A floating thing throws LIGHT on the ground, never a
      // hard shadow — the first pass's dark ellipse read as a
      // hole in the lawn (audit verdict).
      ctx.fillStyle = `rgba(127, 232, 168, ${0.08 + 0.05 * pulse})`;
      ctx.beginPath();
      ctx.ellipse(p.x, baseY, s * 0.24, syT * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      // FIVE VOICES first (they hang BEHIND the ring's front
      // arc): crystal shards, violet and green answering each
      // other, each on its own pendulum clock. The singing
      // voice burns bright.
      const singIdx = Math.floor((t * 0.5 + h * 0.21) % 5);
      for (let i = 0; i < 5; i++) {
        const f = i / 4;
        const a = Math.PI * (0.12 + f * 0.76);
        const tx2 = ringX + Math.cos(a) * s * 0.19;
        const ty2 = ringY + Math.sin(a) * syT * 0.08;
        const phase = i * 1.7;
        const dx2 = sway * (0.5 + f * 0.6) * Math.cos(phase) + lag * 0.6 * Math.sin(phase + 1.3);
        const len = s * (0.24 - 0.04 * Math.abs(i - 2) + 0.05 * (i % 2));
        const bx2 = tx2 + dx2;
        const topY2 = ty2 + s * 0.05;
        const green = i % 2 === 1;
        // The thread of light.
        ctx.strokeStyle = green
          ? `rgba(127, 232, 168, ${0.3 + 0.25 * pulse})`
          : `rgba(216, 196, 250, ${0.3 + 0.25 * pulse})`;
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        ctx.moveTo(tx2, ty2);
        ctx.lineTo(bx2, topY2);
        ctx.stroke();
        // The crystal voice: slim shard, point down.
        const singing = i === singIdx;
        const bodyTone = green ? (singing ? ARC_GREEN : ARC_GREEN_DEEP) : singing ? ARC_VIOLET : ARC_VIOLET_DEEP;
        ctx.fillStyle = bodyTone;
        ctx.beginPath();
        ctx.moveTo(bx2 - s * 0.026, topY2 + s * 0.03);
        ctx.lineTo(bx2 + s * 0.026, topY2 + s * 0.03);
        ctx.lineTo(bx2 + s * 0.018, topY2 + len);
        ctx.lineTo(bx2, topY2 + len + s * 0.045);
        ctx.lineTo(bx2 - s * 0.018, topY2 + len);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = singing ? 'rgba(245, 240, 255, 0.95)' : 'rgba(239, 230, 255, 0.5)';
        ctx.fillRect(bx2 - s * 0.007, topY2 + s * 0.04, s * 0.014, len - s * 0.02);
        // The cap bead that takes the thread.
        ctx.fillStyle = ELF_MITHRIL_LIT;
        ctx.fillRect(bx2 - s * 0.014, topY2, s * 0.028, s * 0.03);
      }
      // THE RING: floating mithril, three rune-marks riding it.
      // BRIGHT metal — the audit's dark ring read as a hanging
      // basket; the fix is jewelry, not a bucket.
      ctx.strokeStyle = shade(ELF_MITHRIL, 14);
      ctx.lineWidth = Math.max(1, s * 0.028);
      ctx.beginPath();
      ctx.ellipse(ringX, ringY, s * 0.22, syT * 0.095, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = ELF_MITHRIL_LIT;
      ctx.lineWidth = Math.max(1, s * 0.018);
      ctx.beginPath();
      ctx.ellipse(ringX, ringY - s * 0.012, s * 0.21, syT * 0.09, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const a = t * 0.4 + (i * Math.PI * 2) / 3;
        const gx2 = ringX + Math.cos(a) * s * 0.2;
        const gy2 = ringY + Math.sin(a) * syT * 0.09;
        const front = Math.sin(a) > 0;
        ctx.fillStyle = `rgba(180, 143, 232, ${front ? 0.85 : 0.4})`;
        ctx.fillRect(gx2 - s * 0.016, gy2 - s * 0.016, s * 0.032, s * 0.032);
      }
      // One aurora wisp stands off the ring's crown.
      const wob = Math.sin(t * 0.6 + h) * s * 0.03;
      ctx.fillStyle = `rgba(127, 232, 168, ${0.1 + 0.07 * pulse})`;
      ctx.beginPath();
      ctx.moveTo(ringX - s * 0.07 + wob, ringY - s * 0.06);
      ctx.quadraticCurveTo(ringX - wob, ringY - s * 0.34, ringX + s * 0.05 + wob, ringY - s * 0.5);
      ctx.lineTo(ringX + s * 0.09 + wob, ringY - s * 0.44);
      ctx.quadraticCurveTo(ringX + s * 0.04 - wob, ringY - s * 0.24, ringX + s * 0.08 + wob * 0.5, ringY - s * 0.05);
      ctx.closePath();
      ctx.fill();
    },
  };
}

function paintRunestone(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.3;
  const baseTop = baseY - s * 1.02;
  // The crown third floats free — WIDE of the seam and adrift
  // east of plumb (audit verdict: a small aligned gap read as
  // one solid obelisk; the float must break the silhouette).
  const bob = Math.sin(t * 0.75 + h * 0.9 + Math.PI) * s * 0.045;
  const drift = s * 0.06 + Math.sin(t * 0.55 + h) * s * 0.025;
  const crownBot = baseTop - s * 0.3 + bob;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.55, 1.9, 0.45),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - s * 0.24, baseY, p.x + s * 0.24, baseY, 1.2);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      const pulse = 0.7 + 0.3 * Math.sin(t * 1.0 + h * 0.5);
      ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, s * 0.32, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // The base: a tapered monolith, three value planes —
      // lifted out of the mud (+8 on every plane, the audit's
      // too-dark verdict).
      ctx.fillStyle = shade('#57535f', -10);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.24, baseY);
      ctx.lineTo(p.x + s * 0.26, baseY);
      ctx.lineTo(p.x + s * 0.17, baseTop);
      ctx.lineTo(p.x - s * 0.16, baseTop);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade('#57535f', 10);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.24, baseY);
      ctx.lineTo(p.x - s * 0.02, baseY);
      ctx.lineTo(p.x - s * 0.01, baseTop);
      ctx.lineTo(p.x - s * 0.16, baseTop);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade('#57535f', 22);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.16, baseTop);
      ctx.lineTo(p.x + s * 0.17, baseTop);
      ctx.lineTo(p.x + s * 0.15, baseTop - syT * 0.08);
      ctx.lineTo(p.x - s * 0.14, baseTop - syT * 0.08 + s * 0.01);
      ctx.closePath();
      ctx.fill();
      // THE GLYPH COLUMN: four carved marks burning up the west
      // face, brightest where the stone was cut.
      ctx.fillStyle = `rgba(180, 143, 232, ${0.45 + 0.35 * pulse})`;
      ctx.fillRect(p.x - s * 0.1, baseY - s * 0.26, s * 0.05, s * 0.03);
      ctx.fillRect(p.x - s * 0.085, baseY - s * 0.46, s * 0.026, s * 0.1);
      ctx.fillRect(p.x - s * 0.1, baseY - s * 0.66, s * 0.055, s * 0.026);
      ctx.fillRect(p.x - s * 0.075, baseY - s * 0.88, s * 0.026, s * 0.08);
      // THE ENERGY THREAD: the seam of light the split left —
      // two motes climb it and vanish into the crown.
      ctx.fillStyle = `rgba(239, 230, 255, ${0.4 + 0.3 * pulse})`;
      ctx.fillRect(p.x - s * 0.012, crownBot, s * 0.024, baseTop - crownBot - syT * 0.06);
      for (let k = 0; k < 2; k++) {
        const ph = (t * 0.6 + k * 0.5) % 1;
        const my = baseTop - syT * 0.06 - ph * (baseTop - crownBot - syT * 0.06);
        ctx.fillStyle = `rgba(216, 196, 250, ${0.85 * (1 - ph * 0.5)})`;
        ctx.fillRect(p.x - s * 0.018, my - s * 0.015, s * 0.036, s * 0.03);
      }
      // THE FLOATING CROWN: the monolith's own top third, riven
      // free — same taper, same stone, adrift off plumb so the
      // break reads from across the field.
      const ch2 = s * 0.36;
      const cxd = p.x + drift;
      ctx.fillStyle = shade('#57535f', -4);
      ctx.beginPath();
      ctx.moveTo(cxd - s * 0.15, crownBot);
      ctx.lineTo(cxd + s * 0.16, crownBot);
      ctx.lineTo(cxd + s * 0.09, crownBot - ch2);
      ctx.lineTo(cxd - s * 0.07, crownBot - ch2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade('#57535f', 16);
      ctx.beginPath();
      ctx.moveTo(cxd - s * 0.15, crownBot);
      ctx.lineTo(cxd - s * 0.01, crownBot);
      ctx.lineTo(cxd - s * 0.005, crownBot - ch2);
      ctx.lineTo(cxd - s * 0.07, crownBot - ch2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade('#57535f', 28);
      ctx.beginPath();
      ctx.moveTo(cxd - s * 0.07, crownBot - ch2);
      ctx.lineTo(cxd + s * 0.09, crownBot - ch2);
      ctx.lineTo(cxd + s * 0.075, crownBot - ch2 - syT * 0.07);
      ctx.lineTo(cxd - s * 0.06, crownBot - ch2 - syT * 0.07 + s * 0.008);
      ctx.closePath();
      ctx.fill();
      // The crown's own glyph answers in green.
      ctx.fillStyle = `rgba(127, 232, 168, ${0.5 + 0.3 * pulse})`;
      ctx.fillRect(cxd - s * 0.045, crownBot - ch2 * 0.62, s * 0.07, s * 0.026);
      // The riven faces BURN where they look at each other —
      // the brightest paint on the piece lives in the gap.
      ctx.fillStyle = `rgba(180, 143, 232, ${0.45 + 0.3 * pulse})`;
      ctx.fillRect(cxd - s * 0.14, crownBot - s * 0.026, s * 0.29, s * 0.026);
      ctx.fillRect(p.x - s * 0.15, baseTop - syT * 0.08, s * 0.3, s * 0.024);
    },
  };
}

function paintCrystalCluster(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.24;
  return {
    sortY: ty + 0.66,
    body: stationBody(0.6, 1.25, 0.5),
    drawShadow: () => rend.castContact(p.x, baseY + s * 0.02, s * 0.36, s * 0.11),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      const pulse = 0.7 + 0.3 * Math.sin(t * 1.2 + h * 0.8);
      // Cracked earth: the eruption split the ground and the
      // light leaks out of the wound.
      ctx.fillStyle = `rgba(63, 174, 110, ${0.14 + 0.1 * pulse})`;
      ctx.beginPath();
      ctx.ellipse(p.x, baseY, s * 0.4, syT * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(18, 12, 26, 0.4)';
      ctx.lineWidth = Math.max(1, s * 0.018);
      for (let i = 0; i < 4; i++) {
        const a = 0.5 + i * 1.5 + ((h >> i) & 3) * 0.2;
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(a) * s * 0.14, baseY + Math.sin(a) * syT * 0.08);
        ctx.lineTo(p.x + Math.cos(a) * s * 0.42, baseY + Math.sin(a) * syT * 0.22);
        ctx.stroke();
      }
      // One crystal grammar for the whole cluster: deep body,
      // lit west facet, burning core seam.
      const crystal = (cx3: number, cy3: number, w2: number, hgt: number, tilt: number, deep: string, lit: string) => {
        ctx.save();
        ctx.translate(cx3, cy3);
        ctx.rotate(tilt);
        ctx.fillStyle = deep;
        ctx.beginPath();
        ctx.moveTo(-w2, 0);
        ctx.lineTo(-w2 * 0.75, -hgt * 0.72);
        ctx.lineTo(0, -hgt);
        ctx.lineTo(w2 * 0.75, -hgt * 0.68);
        ctx.lineTo(w2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = lit;
        ctx.beginPath();
        ctx.moveTo(-w2, 0);
        ctx.lineTo(-w2 * 0.75, -hgt * 0.72);
        ctx.lineTo(0, -hgt);
        ctx.lineTo(-w2 * 0.1, -hgt * 0.66);
        ctx.lineTo(-w2 * 0.3, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = `rgba(239, 255, 246, ${0.4 + 0.35 * pulse})`;
        ctx.fillRect(-s * 0.012, -hgt * 0.85, s * 0.024, hgt * 0.7);
        ctx.restore();
      };
      // Satellites first (they lean OUT of the master's light),
      // then the master shard owns the middle.
      crystal(p.x - s * 0.26, baseY - s * 0.02, s * 0.09, s * 0.42, -0.38, ARC_GREEN_DEEP, ARC_GREEN);
      crystal(p.x + s * 0.27, baseY - s * 0.01, s * 0.1, s * 0.5, 0.42, ARC_GREEN_DEEP, ARC_GREEN);
      crystal(p.x + s * 0.08, baseY - s * 0.05, s * 0.055, s * 0.24, 0.18, shade(ARC_GREEN_DEEP, -10), shade(ARC_GREEN, -8));
      crystal(p.x - s * 0.04, baseY, s * 0.14, s * 0.88, -0.1, ARC_GREEN_DEEP, ARC_GREEN);
      // One violet runt answers at the rim (THE TWO ARCANES).
      crystal(p.x - s * 0.35, baseY + s * 0.03, s * 0.045, s * 0.16, -0.55, ARC_VIOLET_DEEP, ARC_VIOLET);
      // Motes bleed upward out of the wound.
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.32 + k * 0.33 + h * 0.07) % 1;
        const mx = p.x + Math.sin(ph * 5 + k * 2.4) * s * 0.18;
        const my = baseY - s * 0.5 - ph * s * 0.5;
        ctx.fillStyle = `rgba(127, 232, 168, ${0.65 * (1 - ph)})`;
        ctx.fillRect(mx - s * 0.012, my - s * 0.012, s * 0.024, s * 0.024);
      }
    },
  };
}

function paintWardArch(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.3;
  const pillarTop = baseY - s * 0.92;
  const bob = Math.sin(t * 0.7 + h * 0.6) * s * 0.03;
  const keyY = baseY - s * 1.32 + bob;
  return {
    sortY: ty + 0.72,
    body: stationBody(0.62, 1.85, 0.5),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - s * 0.38, baseY, p.x + s * 0.38, baseY, 1.0);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      const pulse = 0.7 + 0.3 * Math.sin(t * 1.0 + h * 0.4);
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x - s * 0.3, baseY + s * 0.02, s * 0.14, s * 0.06, 0, 0, Math.PI * 2);
      ctx.ellipse(p.x + s * 0.3, baseY + s * 0.02, s * 0.14, s * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE VEIL between the pillars: a sheer curtain of ward-
      // light with two falling shimmer streams — visible even
      // at noon (the audit's invisible-veil verdict).
      ctx.fillStyle = `rgba(127, 232, 168, ${0.1 + 0.07 * pulse})`;
      ctx.fillRect(p.x - s * 0.22, pillarTop + s * 0.06, s * 0.44, baseY - pillarTop - s * 0.06);
      for (let k = 0; k < 2; k++) {
        const ph = (t * 0.5 + k * 0.5 + h * 0.13) % 1;
        const vx = p.x - s * 0.1 + k * s * 0.16;
        ctx.fillStyle = `rgba(213, 255, 232, ${0.3 * (1 - ph)})`;
        ctx.fillRect(vx - s * 0.014, pillarTop + s * 0.08 + ph * (baseY - pillarTop - s * 0.2), s * 0.028, s * 0.1);
      }
      ctx.fillStyle = `rgba(127, 232, 168, ${0.08 + 0.05 * pulse})`;
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.22, pillarTop + s * 0.06);
      ctx.lineTo(p.x + s * 0.22, pillarTop + s * 0.06);
      ctx.lineTo(p.x + s * 0.1, keyY + s * 0.1);
      ctx.lineTo(p.x - s * 0.1, keyY + s * 0.1);
      ctx.closePath();
      ctx.fill();
      // Twin pillars: square-cut, glyph band at the waist, top
      // facet lit — the arch's only stone that touches ground.
      for (const sgn of [-1, 1]) {
        const px2 = p.x + sgn * s * 0.3;
        ctx.fillStyle = shade('#8d8798', sgn < 0 ? -4 : -14);
        ctx.fillRect(px2 - s * 0.085, pillarTop, s * 0.17, baseY - pillarTop);
        ctx.fillStyle = shade('#8d8798', sgn < 0 ? 10 : 0);
        ctx.fillRect(px2 - s * 0.085, pillarTop, s * 0.055, baseY - pillarTop);
        ctx.fillStyle = shade('#8d8798', -26);
        ctx.fillRect(px2 - s * 0.1, baseY - s * 0.05, s * 0.2, s * 0.05);
        ctx.fillStyle = shade('#8d8798', 18);
        ctx.beginPath();
        ctx.moveTo(px2 - s * 0.085, pillarTop);
        ctx.lineTo(px2 + s * 0.085, pillarTop);
        ctx.lineTo(px2 + s * 0.075, pillarTop - syT * 0.07);
        ctx.lineTo(px2 - s * 0.075, pillarTop - syT * 0.07 + s * 0.008);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = `rgba(180, 143, 232, ${0.55 + 0.35 * pulse})`;
        ctx.fillRect(px2 - s * 0.05, baseY - s * 0.52, s * 0.1, s * 0.034);
        ctx.fillRect(px2 - s * 0.017, baseY - s * 0.64, s * 0.034, s * 0.08);
      }
      // THE GLYPH ARC: five marks climb pillar to pillar over
      // the keystone, each breathing on its own beat — sized to
      // read at street distance.
      for (let i = 0; i < 5; i++) {
        const f = i / 4;
        const gx2 = p.x - s * 0.3 + s * 0.6 * f;
        const arcY = pillarTop - s * 0.08 - Math.sin(Math.PI * f) * (pillarTop - keyY + s * 0.02);
        const gp = 0.5 + 0.5 * Math.sin(t * 1.4 + i * 1.3 + h * 0.2);
        ctx.fillStyle = i % 2 === 1 ? `rgba(127, 232, 168, ${0.45 + 0.5 * gp})` : `rgba(180, 143, 232, ${0.45 + 0.5 * gp})`;
        ctx.beginPath();
        ctx.moveTo(gx2, arcY - s * 0.05);
        ctx.lineTo(gx2 + s * 0.038, arcY);
        ctx.lineTo(gx2, arcY + s * 0.05);
        ctx.lineTo(gx2 - s * 0.038, arcY);
        ctx.closePath();
        ctx.fill();
      }
      // THE KEYSTONE floats where an arch would need it least:
      // a faceted lozenge with a halo, lit face west, core
      // burning — the arch's whole argument, so it reads FIRST.
      ctx.fillStyle = `rgba(180, 143, 232, ${0.12 + 0.08 * pulse})`;
      ctx.beginPath();
      ctx.ellipse(p.x, keyY, s * 0.2, s * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ARC_VIOLET_DEEP;
      ctx.beginPath();
      ctx.moveTo(p.x, keyY - s * 0.135);
      ctx.lineTo(p.x + s * 0.11, keyY);
      ctx.lineTo(p.x, keyY + s * 0.135);
      ctx.lineTo(p.x - s * 0.11, keyY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = ARC_VIOLET;
      ctx.beginPath();
      ctx.moveTo(p.x, keyY - s * 0.135);
      ctx.lineTo(p.x - s * 0.11, keyY);
      ctx.lineTo(p.x, keyY + s * 0.135);
      ctx.lineTo(p.x - s * 0.034, keyY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(239, 230, 255, ${0.55 + 0.35 * pulse})`;
      ctx.fillRect(p.x - s * 0.014, keyY - s * 0.075, s * 0.028, s * 0.15);
    },
  };
}

function paintArcaneTome(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  const bob = Math.sin(t * 0.8 + h * 0.7) * s * 0.03;
  const bookY = baseY - s * 1.0 + bob;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.52, 1.5, 0.4),
    drawShadow: () => rend.castContact(p.x, baseY + s * 0.015, s * 0.22, s * 0.08),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      const pulse = 0.72 + 0.28 * Math.sin(t * 1.1 + h * 0.3);
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.015, s * 0.2, s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      // The pedestal: a waisted stone column with a runed
      // collar — the only part of this piece that obeys gravity.
      ctx.fillStyle = shade('#8d8798', -20);
      ctx.fillRect(p.x - s * 0.15, baseY - s * 0.07, s * 0.3, s * 0.07);
      ctx.fillStyle = shade('#8d8798', -6);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.11, baseY - s * 0.07);
      ctx.quadraticCurveTo(p.x - s * 0.05, baseY - s * 0.3, p.x - s * 0.09, baseY - s * 0.5);
      ctx.lineTo(p.x + s * 0.09, baseY - s * 0.5);
      ctx.quadraticCurveTo(p.x + s * 0.05, baseY - s * 0.3, p.x + s * 0.11, baseY - s * 0.07);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade('#8d8798', 8);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.095, baseY - s * 0.08);
      ctx.quadraticCurveTo(p.x - s * 0.04, baseY - s * 0.3, p.x - s * 0.075, baseY - s * 0.49);
      ctx.lineTo(p.x - s * 0.02, baseY - s * 0.49);
      ctx.quadraticCurveTo(p.x - s * 0.005, baseY - s * 0.3, p.x - s * 0.03, baseY - s * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade('#8d8798', -2);
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.52, s * 0.13, syT * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(180, 143, 232, ${0.4 + 0.3 * pulse})`;
      ctx.fillRect(p.x - s * 0.1, baseY - s * 0.32, s * 0.2, s * 0.024);
      // The pedestal catches the book's under-light.
      ctx.fillStyle = `rgba(180, 143, 232, ${0.12 + 0.1 * pulse})`;
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.54, s * 0.15, syT * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      // Orbiting script behind the book first.
      const letter = (k: number, front: boolean) => {
        const a = t * 0.6 + (k * Math.PI) / 2 + h * 0.4;
        const ox = p.x + Math.cos(a) * s * 0.3;
        const oy = bookY + Math.sin(a) * syT * 0.13;
        if (Math.sin(a) > 0 !== front) return;
        const al = front ? 0.95 : 0.5;
        ctx.fillStyle = k % 2 === 1 ? `rgba(127, 232, 168, ${al})` : `rgba(216, 196, 250, ${al})`;
        ctx.fillRect(ox - s * 0.022, oy - s * 0.028, s * 0.044, s * 0.056);
      };
      for (let k = 0; k < 4; k++) letter(k, false);
      // THE GRIMOIRE floats open — gold-edged covers spread
      // like wings, pages alight with a script that never
      // stays still long enough to be read. Sized UP a third
      // from the first pass: the book is the piece.
      ctx.fillStyle = ELF_GOLD;
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.33, bookY + s * 0.025);
      ctx.lineTo(p.x, bookY + s * 0.12);
      ctx.lineTo(p.x + s * 0.33, bookY + s * 0.025);
      ctx.lineTo(p.x + s * 0.315, bookY + s * 0.07);
      ctx.lineTo(p.x, bookY + s * 0.165);
      ctx.lineTo(p.x - s * 0.315, bookY + s * 0.07);
      ctx.closePath();
      ctx.fill();
      const page = (sgn: number) => {
        ctx.fillStyle = sgn < 0 ? '#efe6ff' : '#e4d9f6';
        ctx.beginPath();
        ctx.moveTo(p.x, bookY + s * 0.115);
        ctx.lineTo(p.x + sgn * s * 0.3, bookY + s * 0.02);
        ctx.lineTo(p.x + sgn * s * 0.275, bookY - s * 0.075);
        ctx.lineTo(p.x, bookY + s * 0.012);
        ctx.closePath();
        ctx.fill();
      };
      page(-1);
      page(1);
      ctx.strokeStyle = `rgba(122, 106, 168, ${0.5 + 0.3 * pulse})`;
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (let i = 0; i < 2; i++) {
        const ly = bookY - s * 0.02 + i * s * 0.035;
        ctx.beginPath();
        ctx.moveTo(p.x - s * 0.17, ly + s * 0.045);
        ctx.lineTo(p.x - s * 0.05, ly + s * 0.02);
        ctx.moveTo(p.x + s * 0.05, ly + s * 0.02);
        ctx.lineTo(p.x + s * 0.17, ly + s * 0.045);
        ctx.stroke();
      }
      // The spine-light: the working that holds it all up.
      ctx.fillStyle = `rgba(239, 230, 255, ${0.5 + 0.35 * pulse})`;
      ctx.fillRect(p.x - s * 0.011, bookY + s * 0.0, s * 0.022, s * 0.1);
      for (let k = 0; k < 4; k++) letter(k, true);
    },
  };
}

function paintRunePillar(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  const capY = baseY - s * 1.42;
  // THE TWO ARCANES: the street deals its own rhythm — this
  // pillar leads green or violet by tile hash, so a lit row
  // alternates voices.
  const green = (h & 1) === 0;
  const lead = green ? ARC_GREEN : ARC_VIOLET;
  const leadRgb = green ? '127, 232, 168' : '180, 143, 232';
  const bob = Math.sin(t * 0.85 + h * 0.5) * s * 0.028;
  const tipY = capY - s * 0.2 + bob;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.5, 1.95, 0.4),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - s * 0.07, baseY, p.x + s * 0.07, baseY, 1.35);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      const pulse = 0.72 + 0.28 * Math.sin(t * 1.05 + h * 0.6);
      // The ground ring: the lamplighter never comes; the
      // circle keeps the light lit.
      ctx.strokeStyle = `rgba(${leadRgb}, ${0.13 + 0.08 * pulse})`;
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.ellipse(p.x, baseY, s * 0.24, syT * 0.13, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, s * 0.13, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      // The pillar: a slender square taper, stepped foot, lit
      // west arris — street furniture first, spellwork second.
      ctx.fillStyle = shade('#8d8798', -24);
      ctx.fillRect(p.x - s * 0.1, baseY - s * 0.06, s * 0.2, s * 0.06);
      ctx.fillStyle = shade('#8d8798', -10);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.07, baseY - s * 0.06);
      ctx.lineTo(p.x + s * 0.07, baseY - s * 0.06);
      ctx.lineTo(p.x + s * 0.05, capY);
      ctx.lineTo(p.x - s * 0.05, capY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade('#8d8798', 8);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.07, baseY - s * 0.06);
      ctx.lineTo(p.x - s * 0.025, baseY - s * 0.06);
      ctx.lineTo(p.x - s * 0.018, capY);
      ctx.lineTo(p.x - s * 0.05, capY);
      ctx.closePath();
      ctx.fill();
      // THE SPIRAL GROOVE: glyph dashes climb the shaft,
      // alternating faces — the carver walked around the stone.
      ctx.fillStyle = `rgba(${leadRgb}, ${0.45 + 0.35 * pulse})`;
      ctx.fillRect(p.x - s * 0.045, baseY - s * 0.32, s * 0.05, s * 0.024);
      ctx.fillRect(p.x + s * 0.0, baseY - s * 0.6, s * 0.045, s * 0.022);
      ctx.fillRect(p.x - s * 0.05, baseY - s * 0.88, s * 0.042, s * 0.022);
      ctx.fillRect(p.x + s * 0.005, baseY - s * 1.16, s * 0.04, s * 0.02);
      // The capital: a small flared block, top plane lit.
      ctx.fillStyle = shade('#8d8798', -16);
      ctx.fillRect(p.x - s * 0.085, capY - s * 0.05, s * 0.17, s * 0.05);
      ctx.fillStyle = shade('#8d8798', 16);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.085, capY - s * 0.05);
      ctx.lineTo(p.x + s * 0.085, capY - s * 0.05);
      ctx.lineTo(p.x + s * 0.07, capY - s * 0.05 - syT * 0.05);
      ctx.lineTo(p.x - s * 0.07, capY - s * 0.05 - syT * 0.05 + s * 0.006);
      ctx.closePath();
      ctx.fill();
      // THE TIP-STONE floats above its capital: a small
      // octahedron burning in the street's lead color, wearing
      // a soft halo — the elven lamp needs no flame and no
      // glass.
      ctx.fillStyle = `rgba(${leadRgb}, ${0.12 + 0.09 * pulse})`;
      ctx.beginPath();
      ctx.ellipse(p.x, tipY, s * 0.17, s * 0.17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = green ? ARC_GREEN_DEEP : ARC_VIOLET_DEEP;
      ctx.beginPath();
      ctx.moveTo(p.x, tipY - s * 0.1);
      ctx.lineTo(p.x + s * 0.07, tipY);
      ctx.lineTo(p.x, tipY + s * 0.1);
      ctx.lineTo(p.x - s * 0.07, tipY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = lead;
      ctx.beginPath();
      ctx.moveTo(p.x, tipY - s * 0.1);
      ctx.lineTo(p.x - s * 0.07, tipY);
      ctx.lineTo(p.x, tipY + s * 0.1);
      ctx.lineTo(p.x - s * 0.022, tipY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(245, 250, 255, ${0.55 + 0.3 * pulse})`;
      ctx.fillRect(p.x - s * 0.01, tipY - s * 0.05, s * 0.02, s * 0.1);
      // One mote falls UP off the tip now and then.
      const ph = (t * 0.4 + h * 0.19) % 1;
      if (ph < 0.6) {
        ctx.fillStyle = `rgba(${leadRgb}, ${0.7 * (1 - ph / 0.6)})`;
        ctx.fillRect(p.x + Math.sin(ph * 8) * s * 0.05 - s * 0.011, tipY - s * 0.16 - ph * s * 0.4, s * 0.022, s * 0.022);
      }
    },
  };
}

export const ELVEN_PROPS: PropEntries = [
  [[Tile.ArcaneBeacon], paintArcaneBeacon],
  [[Tile.ElvenBanner], paintElvenBanner],
  [[Tile.ElvenBench], paintElvenBench],
  [[Tile.ElvenTable], paintElvenTable],
  [[Tile.ElvenChair], paintElvenChair],
  [[Tile.ElvenDaybed], paintElvenDaybed],
  [[Tile.ElvenBookcase], paintElvenBookcase],
  [[Tile.ElvenLectern], paintElvenLectern],
  [[Tile.ElvenHarp], paintElvenHarp],
  [[Tile.ElvenLoom], paintElvenLoom],
  [[Tile.ElvenFountain], paintElvenFountain],
  [[Tile.ElvenStatue], paintElvenStatue],
  [[Tile.Moonwell], paintMoonwell],
  [[Tile.Everflame], paintEverflame],
  [[Tile.MithrilAnvil], paintMithrilAnvil],
  [[Tile.ElvenArmsRack], paintElvenArmsRack],
  [[Tile.ElvenPlanter], paintElvenPlanter],
  [[Tile.ElvenMirror], paintElvenMirror],
  [[Tile.ElvenWaystone], paintElvenWaystone],
  [[Tile.ElvenChimes], paintElvenChimes],
  [[Tile.Runestone], paintRunestone],
  [[Tile.CrystalCluster], paintCrystalCluster],
  [[Tile.WardArch], paintWardArch],
  [[Tile.ArcaneTome], paintArcaneTome],
  [[Tile.RunePillar], paintRunePillar],
];
