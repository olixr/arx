/**
 * THE OPEN STREET — lanterns, shrines, casks, gongs: street and warband dressing.
 * Extracted verbatim from renderer.ts's objectItem (THE PROP HALL,
 * foundations F1) — each painter is one former switch case; the frame
 * and host contracts live in ./types.ts.
 */
import { AWNING_CLOTHS, HRB_MOON, HRB_SAGE, HRB_SAGE_DEEP, HRB_SOIL_WET, PALI_BONE, PALI_LOG, PALI_ROPE, PALI_ROPE_DARK, TRD_CRUST, TRD_CRUST_LIT, TRD_HERB, TRD_HERB_DRY, TRD_LEATHER_LIT, TRD_STEEL, TRD_STEEL_LIT, TWN_BRONZE, TWN_BRONZE_LIT, TWN_IRON, TWN_OAK, TWN_OAK_DARK, TWN_OAK_LIT, TWN_ROPE } from '../paintVocab.js';
import { shade } from '../rig.js';
import { facetCircle } from '../shapes.js';
import { CMN_FLAME, CMN_FLAME_CORE, TRD_LEATHER, TRD_WAX, TRD_WAX_LIT, TWN_BURLAP, TWN_BURLAP_LIT, TWN_PAPER, TWN_STONE, TWN_STONE_DARK, TWN_STONE_LIT } from './palette.js';
import { Tile, hashCoords } from '@arx/shared';
import type { DrawItem } from '../renderer.js';
import type { PropEntries, PropFrame, PropHost } from './types.js';

// THE WARREN'S RAGS: the one dye deal every stolen cloth in the
// camps draws from — madder gone dull, drab field green, mustard,
// and a gray-woad blue. Four WIDE values (the hide-cluster law:
// close hues read as one coat), all mud-tempered: a goblin's cloth
// was somebody else's before the raid. The legion's crimson is NOT
// here — THE BANNER IS ONE, and the officer's ink never varies.
const CAMP_RAG = ['#8a3b34', '#5d6a42', '#9a7a35', '#4a5a6e'] as const;
const CAMP_IRON = '#3a3444';
const CAMP_BRONZE = '#b08d3c';
const CAMP_BRONZE_DARK = '#7a6128';
const LEGION_CRIMSON = '#8f2f2a';
const TWN_VERDIGRIS = '#5f9b84';
const HRB_STUBBLE = '#7a8a55';
// THE SECOND SHIFT: the wave's own materials — thrown clay wet on
// the wheel and fired in the kiln, the chandler's cured wax, the
// fish market's silver. Street water reuses TWN_WATER (one river).
const TRD_CLAY = '#b07850';
// THE COMMONS — the general shelf's own keys: painted candle flame
// (amber lick over a bright core — PAINT, never a light entry: the
// LampPost owns the town night), basket wicker, dock tar, and the
// bay-leaf green of the doorstep tub. Everything else this shelf
// paints buys from TWN_/TRD_ — one town, one dyer, one river.
const CMN_WICKER = '#a88f5c';
const CMN_WICKER_LIT = '#cdb078';
const CMN_WICKER_DARK = '#7d6840';
const CMN_TAR = '#4e4438';
const CMN_TAR_LIT = '#6e614c';
const CMN_HORN = '#e0b060';

function paintStreetLantern(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The porch lantern: a crook-hook post at HOUSE scale (the
  // LampPost keeps the civic streets), a smith's hooded
  // candle-lantern hung from the hook — horn panes glowing
  // warm PAINT, the whole box swaying on its ring in the
  // breeze. The post leans a dealt hair, the way a post the
  // whole lane brushes past always does.
  const m = ((h >>> 3) & 1) ? 1 : -1;
  const postTop = baseY - s * 1.18;
  const lean = m * s * 0.05;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.58, 1.65, 0.35),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.22, s * 0.045),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // The worn ring where every boot pivots at the light.
      ctx.fillStyle = 'rgba(24, 20, 14, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY, s * 0.24, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      // The post: chamfered oak, leaning its dealt hair,
      // one lit arris, a peg-stub low where the lamplighter's
      // ladder once rested.
      ctx.strokeStyle = TWN_OAK_DARK;
      ctx.lineWidth = Math.max(3, s * 0.075);
      ctx.beginPath();
      ctx.moveTo(p.x, baseY);
      ctx.lineTo(p.x + lean, postTop);
      ctx.stroke();
      ctx.strokeStyle = TWN_OAK;
      ctx.lineWidth = Math.max(1.5, s * 0.03);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.018, baseY - s * 0.02);
      ctx.lineTo(p.x + lean - s * 0.018, postTop + s * 0.02);
      ctx.stroke();
      ctx.fillStyle = TWN_OAK;
      ctx.fillRect(p.x + lean * 0.35 - s * 0.052, baseY - s * 0.42, s * 0.03, s * 0.05);
      // THE CROOK: the smith's curl reaching over the lane,
      // a leaf-tip finial where the forge showed off.
      const hookX = p.x + lean + m * s * 0.34;
      const hookY = postTop + s * 0.1;
      ctx.strokeStyle = TWN_IRON;
      ctx.lineWidth = Math.max(2, s * 0.032);
      ctx.beginPath();
      ctx.moveTo(p.x + lean, postTop + s * 0.06);
      ctx.quadraticCurveTo(p.x + lean + m * s * 0.05, postTop - s * 0.14, hookX, hookY - s * 0.1);
      ctx.quadraticCurveTo(hookX + m * s * 0.05, hookY - s * 0.02, hookX, hookY);
      ctx.stroke();
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.arc(hookX - m * s * 0.02, postTop - s * 0.12, s * 0.024, 0, Math.PI * 1.6);
      ctx.stroke();
      // THE LANTERN (<4Hz): the whole box swings on its ring
      // from the hook — hood, horn panes, smoke slit. Paint
      // only; the glow lives in the horn's own tone.
      const sway = Math.sin(t * 0.85 + ((h >>> 5) & 7) * 0.8) * 0.075;
      ctx.save();
      ctx.translate(hookX, hookY);
      ctx.rotate(sway);
      // Ring and swivel.
      ctx.strokeStyle = TWN_IRON;
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.arc(0, s * 0.022, s * 0.022, 0, Math.PI * 2);
      ctx.stroke();
      const lw = s * 0.105;
      const lTop = s * 0.06;
      const lBot = s * 0.34;
      // The hood: a forged cone, smoke slit dark at the peak.
      ctx.fillStyle = TWN_IRON;
      ctx.beginPath();
      ctx.moveTo(-lw * 1.25, lTop + s * 0.06);
      ctx.lineTo(0, lTop - s * 0.02);
      ctx.lineTo(lw * 1.25, lTop + s * 0.06);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(210, 218, 226, 0.25)';
      ctx.beginPath();
      ctx.moveTo(-lw * 1.05, lTop + s * 0.05);
      ctx.lineTo(0, lTop - s * 0.012);
      ctx.lineTo(-lw * 0.1, lTop + s * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#1c1c22';
      ctx.fillRect(-s * 0.016, lTop - s * 0.036, s * 0.032, s * 0.022);
      // The body: horn panes between forged corner bars —
      // warm through the horn, brighter where the flame
      // stands, never a light entry.
      ctx.fillStyle = CMN_HORN;
      ctx.beginPath();
      ctx.moveTo(-lw, lTop + s * 0.07);
      ctx.lineTo(-lw * 0.82, lBot);
      ctx.lineTo(lw * 0.82, lBot);
      ctx.lineTo(lw, lTop + s * 0.07);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(120, 74, 24, 0.28)';
      ctx.beginPath();
      ctx.moveTo(lw * 0.3, lTop + s * 0.07);
      ctx.lineTo(lw * 0.28, lBot);
      ctx.lineTo(lw * 0.82, lBot);
      ctx.lineTo(lw, lTop + s * 0.07);
      ctx.closePath();
      ctx.fill();
      // The flame lick behind the horn (soft, small).
      const lk = Math.sin(t * 2.6 + (h % 5));
      ctx.fillStyle = 'rgba(248, 232, 176, 0.85)';
      ctx.beginPath();
      ctx.ellipse(lk * s * 0.008 - lw * 0.15, lBot - s * 0.1, s * 0.02, s * 0.05 + lk * s * 0.006, 0, 0, Math.PI * 2);
      ctx.fill();
      // Corner bars and foot.
      ctx.strokeStyle = TWN_IRON;
      ctx.lineWidth = Math.max(1, s * 0.014);
      for (const e of [-1, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(e * lw, lTop + s * 0.07);
        ctx.lineTo(e * lw * 0.82, lBot);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-lw * 0.35, lTop + s * 0.07);
      ctx.lineTo(-lw * 0.3, lBot);
      ctx.stroke();
      ctx.fillStyle = TWN_IRON;
      ctx.fillRect(-lw * 0.9, lBot, lw * 1.8, s * 0.028);
      ctx.fillRect(-lw * 1.06, lTop + s * 0.055, lw * 2.12, s * 0.026);
      ctx.restore();
    },
  };
}

function paintWayShrine(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The road's small faith: a fieldstone niche — rubble the
  // mason FOUND, the spring fount's masonry — holding the
  // OLD HOUND carved worn (the spout-stone's hound, the one
  // beast this kingdom ever carves), a sill of dealt
  // offerings, two stub candles guttering. Roads, gates,
  // bridges, fords: the traveler's nod, everywhere.
  const hw = s * 0.38;
  const topY = baseY - s * 0.98;
  const offer = (h >>> 9) & 3;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.55, 1.35, 0.4),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.05, s * 0.06),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.2)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.02, s * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE RUBBLE BODY — pass two: the first paint's neat
      // rectangle read as a WINDOW FRAME. A wayside shrine
      // is a CAIRN somebody squared: chunky dealt boulders
      // with a jittered outer edge, gable-stacked toward
      // the capstone, every joint dark.
      ctx.fillStyle = '#3e382c';
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 1.08, baseY);
      ctx.lineTo(p.x - hw * 1.0, baseY - s * 0.34);
      ctx.lineTo(p.x - hw * 0.86, baseY - s * 0.62);
      ctx.lineTo(p.x - hw * 0.62, topY + s * 0.06);
      ctx.lineTo(p.x + hw * 0.58, topY + s * 0.04);
      ctx.lineTo(p.x + hw * 0.9, baseY - s * 0.56);
      ctx.lineTo(p.x + hw * 1.04, baseY - s * 0.3);
      ctx.lineTo(p.x + hw * 1.06, baseY);
      ctx.closePath();
      ctx.fill();
      // The dealt boulders riding that mass, brows sunlit.
      for (const [bxf, byf, brx, bry, sd] of [
        [-0.78, 0.1, 0.3, 0.14, 3], [0.74, 0.12, 0.32, 0.15, 9],
        [-0.7, 0.36, 0.26, 0.13, 5], [0.66, 0.4, 0.27, 0.14, 12],
        [-0.5, 0.62, 0.24, 0.12, 7], [0.46, 0.64, 0.25, 0.12, 2],
        [-0.06, 0.85, 0.3, 0.11, 10],
      ] as const) {
        const tone = shade(TWN_STONE, -16 + (((h >>> sd) & 7) * 5));
        const bx2 = p.x + hw * bxf;
        const by2 = baseY - (baseY - topY) * byf;
        ctx.fillStyle = tone;
        ctx.beginPath();
        ctx.ellipse(bx2, by2 - s * bry, hw * brx, s * bry, ((h >>> sd) & 3 - 1.5) * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(tone, 15);
        ctx.beginPath();
        ctx.ellipse(bx2 - hw * 0.05, by2 - s * bry * 1.4, hw * brx * 0.7, s * bry * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // THE CAPSTONE: one found slab laid tilted, its top
      // plane full to the camera, drip edge dark below.
      ctx.fillStyle = TWN_STONE_DARK;
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.92, topY + s * 0.1);
      ctx.lineTo(p.x - hw * 0.98, topY + s * 0.015);
      ctx.lineTo(p.x + hw * 0.94, topY - s * 0.02);
      ctx.lineTo(p.x + hw * 0.86, topY + s * 0.095);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TWN_STONE_LIT;
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.98, topY + s * 0.015);
      ctx.lineTo(p.x - hw * 0.8, topY - s * 0.055);
      ctx.lineTo(p.x + hw * 1.02, topY - s * 0.08);
      ctx.lineTo(p.x + hw * 0.94, topY - s * 0.02);
      ctx.closePath();
      ctx.fill();
      // THE NICHE: a true ARCH of dark — round-shouldered,
      // deep, the one worked shape in the pile.
      const nw = hw * 0.52;
      const nBot = baseY - s * 0.3;
      const nTop = topY + s * 0.26;
      ctx.fillStyle = '#1c1811';
      ctx.beginPath();
      ctx.moveTo(p.x - nw, nBot);
      ctx.lineTo(p.x - nw, nTop + nw * 0.9);
      ctx.arc(p.x, nTop + nw * 0.9, nw, Math.PI, 0);
      ctx.lineTo(p.x + nw, nBot);
      ctx.closePath();
      ctx.fill();
      // The arch ring: worn voussoir edge catching light.
      ctx.strokeStyle = shade(TWN_STONE_LIT, -4);
      ctx.lineWidth = Math.max(1.5, s * 0.026);
      ctx.beginPath();
      ctx.arc(p.x, nTop + nw * 0.9, nw + s * 0.012, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      // THE OLD HOUND — the wayshrine keeps the statue's
      // composed masses at keepsake scale: rump, chest,
      // head, EARS, muzzle — PALE against the arch dark.
      const hx = p.x - s * 0.01;
      const hb = nBot - s * 0.01;
      const htone = shade(TWN_STONE_LIT, 6);
      ctx.fillStyle = htone;
      ctx.beginPath();
      ctx.ellipse(hx - s * 0.045, hb - s * 0.1, s * 0.085, s * 0.105, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(hx + s * 0.04, hb - s * 0.17, s * 0.055, s * 0.08, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hx + s * 0.06, hb - s * 0.33, s * 0.048, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hx + s * 0.02, hb - s * 0.36);
      ctx.lineTo(hx + s * 0.005, hb - s * 0.43);
      ctx.lineTo(hx + s * 0.045, hb - s * 0.375);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hx + s * 0.065, hb - s * 0.375);
      ctx.lineTo(hx + s * 0.065, hb - s * 0.44);
      ctx.lineTo(hx + s * 0.1, hb - s * 0.38);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(hx + s * 0.085, hb - s * 0.35, s * 0.045, s * 0.028);
      ctx.fillRect(hx + s * 0.04 - s * 0.016, hb - s * 0.14, s * 0.032, s * 0.14);
      // The shade turn on the rump.
      ctx.fillStyle = shade(htone, -16);
      ctx.beginPath();
      ctx.ellipse(hx - s * 0.09, hb - s * 0.09, s * 0.032, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE SILL: the offering shelf, its lip bright.
      ctx.fillStyle = TWN_STONE;
      ctx.fillRect(p.x - nw - s * 0.05, nBot, (nw + s * 0.05) * 2, s * 0.075);
      ctx.fillStyle = TWN_STONE_LIT;
      ctx.fillRect(p.x - nw - s * 0.05, nBot, (nw + s * 0.05) * 2, s * 0.024);
      // Dealt offerings: a posy, a bread heel, or two coins
      // — somebody passed THIS morning.
      if (offer === 0 || offer === 3) {
        ctx.strokeStyle = TRD_HERB;
        ctx.lineWidth = Math.max(1, s * 0.01);
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(p.x - s * 0.09 + k * s * 0.02, nBot + s * 0.005);
          ctx.lineTo(p.x - s * 0.11 + k * s * 0.024, nBot - s * 0.05 - (k % 2) * s * 0.012);
          ctx.stroke();
        }
        const petals = ['#c95a74', '#e8dcc4', '#c9a13c'];
        for (let k = 0; k < 3; k++) {
          ctx.fillStyle = petals[(((h >>> 11) & 3) + k) % 3]!;
          ctx.beginPath();
          ctx.arc(p.x - s * 0.11 + k * s * 0.024, nBot - s * 0.055 - (k % 2) * s * 0.012, s * 0.016, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (offer === 1 || offer === 3) {
        ctx.fillStyle = TRD_CRUST;
        ctx.beginPath();
        ctx.ellipse(p.x + s * 0.1, nBot - s * 0.02, s * 0.05, s * 0.032, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = TRD_CRUST_LIT;
        ctx.beginPath();
        ctx.ellipse(p.x + s * 0.09, nBot - s * 0.032, s * 0.032, s * 0.017, -0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (offer === 2) {
        for (const e of [-0.02, 0.05]) {
          ctx.fillStyle = TWN_BRONZE_LIT;
          ctx.beginPath();
          ctx.ellipse(p.x + s * e + s * 0.06, nBot - s * 0.008, s * 0.016, s * 0.008, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // TWO STUB CANDLES on the sill corners, guttering on
      // their own slow drafts — wax run over the sill lip.
      for (const e of [-1, 1] as const) {
        const cx2 = p.x + e * (nw - s * 0.02);
        const cl = s * (0.045 + (((h >>> (e + 7)) & 3) * 0.012));
        ctx.fillStyle = TRD_WAX;
        ctx.fillRect(cx2 - s * 0.016, nBot - cl, s * 0.032, cl);
        ctx.fillStyle = TRD_WAX_LIT;
        ctx.fillRect(cx2 - s * 0.016, nBot - cl, s * 0.011, cl);
        ctx.strokeStyle = TRD_WAX;
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(cx2 + e * s * 0.01, nBot + s * 0.01);
        ctx.lineTo(cx2 + e * s * 0.014, nBot + s * 0.06);
        ctx.stroke();
        const lk = Math.sin(t * (2.3 + (e > 0 ? 0.7 : 0)) + (h % 9) + e);
        const fh = s * (0.042 + 0.01 * Math.sin(t * 1.5 + e * 2));
        ctx.fillStyle = CMN_FLAME;
        ctx.beginPath();
        ctx.moveTo(cx2 - s * 0.011, nBot - cl);
        ctx.quadraticCurveTo(cx2 - s * 0.013, nBot - cl - fh * 0.5, cx2 + lk * s * 0.01, nBot - cl - fh);
        ctx.quadraticCurveTo(cx2 + s * 0.013, nBot - cl - fh * 0.5, cx2 + s * 0.011, nBot - cl);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = CMN_FLAME_CORE;
        ctx.beginPath();
        ctx.ellipse(cx2 + lk * s * 0.003, nBot - cl - fh * 0.3, s * 0.006, fh * 0.26, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Moss in the shaded seams — the shrine is OLD.
      ctx.fillStyle = 'rgba(95, 155, 132, 0.5)';
      for (let k = 0; k < 4; k++) {
        const sd = (h >>> (k * 4 + 5)) & 15;
        ctx.beginPath();
        ctx.ellipse(
          p.x - hw + (sd / 15) * hw * 1.9,
          baseY - s * (0.12 + ((sd >>> 2) & 3) * 0.2),
          s * (0.024 + (sd & 3) * 0.008),
          s * 0.014,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    },
  };
}

function paintGuardianStatue(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The gate's stone hound — the old hound's THIRD sighting
  // (spout-stone, wayshrine, and now full size), seated
  // higher than any head that walks past it. FACES BY
  // PARITY: odd columns mirror, so a flanked gate reads as
  // a carved PAIR by construction, no second id spent.
  const m = (tx & 1) ? -1 : 1;
  const plinthTop = baseY - s * 0.5;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.55, 1.95, 0.45),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.44, s * 0.07),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, s * 0.42, s * 0.065, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE PLINTH: two courses and a cap the camera sees
      // the top of. Statue stone reads DARKER than plinth
      // stone (the bronze-is-not-sandstone law, in granite).
      ctx.fillStyle = TWN_STONE_DARK;
      ctx.fillRect(p.x - s * 0.36, baseY - s * 0.14, s * 0.72, s * 0.14);
      ctx.fillStyle = TWN_STONE;
      ctx.fillRect(p.x - s * 0.36, baseY - s * 0.14, s * 0.72, s * 0.038);
      ctx.fillStyle = TWN_STONE;
      ctx.fillRect(p.x - s * 0.3, plinthTop + s * 0.06, s * 0.6, baseY - s * 0.14 - plinthTop - s * 0.06);
      ctx.fillStyle = TWN_STONE_LIT;
      ctx.fillRect(p.x - s * 0.3, plinthTop + s * 0.06, s * 0.2, baseY - s * 0.14 - plinthTop - s * 0.06);
      ctx.strokeStyle = shade(TWN_STONE, -18);
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.3, plinthTop + s * 0.06 + (baseY - s * 0.14 - plinthTop - s * 0.06) * 0.5);
      ctx.lineTo(p.x + s * 0.3, plinthTop + s * 0.06 + (baseY - s * 0.14 - plinthTop - s * 0.06) * 0.5);
      ctx.stroke();
      // The cap: chamfered, lit plane, dark far edge.
      ctx.fillStyle = TWN_STONE_DARK;
      ctx.fillRect(p.x - s * 0.34, plinthTop, s * 0.68, s * 0.075);
      ctx.fillStyle = TWN_STONE_LIT;
      ctx.beginPath();
      ctx.ellipse(p.x, plinthTop, s * 0.34, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(TWN_STONE_LIT, 10);
      ctx.beginPath();
      ctx.ellipse(p.x - s * 0.03, plinthTop - s * 0.008, s * 0.27, s * 0.036, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE BRONZE PLAQUE on the south face — verdigris
      // creeping from the fixing pins.
      ctx.fillStyle = TWN_BRONZE;
      ctx.fillRect(p.x - s * 0.11, plinthTop + s * 0.16, s * 0.22, s * 0.12);
      ctx.fillStyle = TWN_BRONZE_LIT;
      ctx.fillRect(p.x - s * 0.11, plinthTop + s * 0.16, s * 0.22, s * 0.02);
      ctx.fillStyle = TWN_VERDIGRIS;
      ctx.fillRect(p.x - s * 0.11, plinthTop + s * 0.245, s * 0.06, s * 0.035);
      // THE HOUND, seated, facing its parity — rebuilt from
      // COMPOSED MASSES after pass one melted into a slug:
      // rump disc, chest disc, head disc, EARS, muzzle
      // wedge, straight forelegs, tail curl. A silhouette
      // is a sum of readable circles, never one long path.
      const gx = p.x;
      const gb = plinthTop - s * 0.01;
      const tone = shade(TWN_STONE, -26);
      const lit = shade(tone, 22);
      // The tail: one bold curl wrapping the rump base.
      ctx.strokeStyle = tone;
      ctx.lineWidth = Math.max(2, s * 0.05);
      ctx.beginPath();
      ctx.arc(gx - m * s * 0.24, gb - s * 0.07, s * 0.1, m > 0 ? Math.PI * 0.2 : Math.PI * 0.55, m > 0 ? Math.PI * 1.25 : Math.PI * 2.55);
      ctx.stroke();
      // The rump: the big grounded disc.
      ctx.fillStyle = tone;
      ctx.beginPath();
      ctx.ellipse(gx - m * s * 0.1, gb - s * 0.24, s * 0.19, s * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      // The chest, higher and forward.
      ctx.beginPath();
      ctx.ellipse(gx + m * s * 0.1, gb - s * 0.44, s * 0.135, s * 0.19, m * 0.15, 0, Math.PI * 2);
      ctx.fill();
      // The neck bridge up to the head.
      ctx.beginPath();
      ctx.moveTo(gx + m * s * 0.005, gb - s * 0.56);
      ctx.lineTo(gx + m * s * 0.09, gb - s * 0.84);
      ctx.lineTo(gx + m * s * 0.2, gb - s * 0.8);
      ctx.lineTo(gx + m * s * 0.21, gb - s * 0.5);
      ctx.closePath();
      ctx.fill();
      // THE HEAD, high and proud.
      ctx.beginPath();
      ctx.arc(gx + m * s * 0.15, gb - s * 0.92, s * 0.115, 0, Math.PI * 2);
      ctx.fill();
      // THE EARS — the two ticks that say DOG at any scale.
      ctx.beginPath();
      ctx.moveTo(gx + m * s * 0.065, gb - s * 0.99);
      ctx.lineTo(gx + m * s * 0.035, gb - s * 1.14);
      ctx.lineTo(gx + m * s * 0.115, gb - s * 1.025);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(gx + m * s * 0.13, gb - s * 1.02);
      ctx.lineTo(gx + m * s * 0.13, gb - s * 1.16);
      ctx.lineTo(gx + m * s * 0.195, gb - s * 1.03);
      ctx.closePath();
      ctx.fill();
      // THE MUZZLE, squared off forward.
      ctx.beginPath();
      ctx.moveTo(gx + m * s * 0.21, gb - s * 0.97);
      ctx.lineTo(gx + m * s * 0.3, gb - s * 0.94);
      ctx.lineTo(gx + m * s * 0.3, gb - s * 0.87);
      ctx.lineTo(gx + m * s * 0.21, gb - s * 0.85);
      ctx.closePath();
      ctx.fill();
      // Straight forelegs down to paws on the cap.
      ctx.fillRect(gx + m * s * 0.1 - s * 0.038, gb - s * 0.4, s * 0.076, s * 0.4);
      ctx.fillRect(gx + m * s * 0.2 - s * 0.034, gb - s * 0.38, s * 0.068, s * 0.38);
      // THE LIT FLANK: chest, brow, muzzle top, and the
      // near foreleg catch the afternoon — the carve TURNS.
      ctx.fillStyle = lit;
      ctx.beginPath();
      ctx.ellipse(gx + m * s * 0.135, gb - s * 0.47, s * 0.075, s * 0.15, m * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(gx + m * s * 0.175, gb - s * 0.95, s * 0.065, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(gx + m * s * 0.21, gb - s * 0.97, m * s * 0.07, s * 0.045);
      ctx.fillRect(gx + m * s * 0.2 - s * 0.034, gb - s * 0.36, s * 0.028, s * 0.34);
      ctx.beginPath();
      ctx.ellipse(gx - m * s * 0.06, gb - s * 0.33, s * 0.06, s * 0.12, -m * 0.2, 0, Math.PI * 2);
      ctx.fill();
      // The eye notch, the jaw rain-streak, the paws, and
      // the nose worn BRIGHT by ten thousand passing hands.
      ctx.fillStyle = shade(tone, -18);
      ctx.beginPath();
      ctx.ellipse(gx + m * s * 0.125, gb - s * 0.945, s * 0.02, s * 0.026, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shade(tone, -16);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(gx + m * s * 0.235, gb - s * 0.84);
      ctx.quadraticCurveTo(gx + m * s * 0.25, gb - s * 0.7, gx + m * s * 0.225, gb - s * 0.56);
      ctx.stroke();
      ctx.fillStyle = shade(tone, 12);
      for (const e of [0.1, 0.2]) {
        ctx.beginPath();
        ctx.ellipse(gx + m * s * e, gb + s * 0.005, s * 0.042, s * 0.022, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = shade(tone, 40);
      ctx.beginPath();
      ctx.ellipse(gx + m * s * 0.295, gb - s * 0.925, s * 0.02, s * 0.016, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

function paintTapCask(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The tavern front: a cask ON ITS BELLY (the lying-cask
  // law: long bulged body, staves running the LENGTH, hoops
  // standing UPRIGHT) up on a straight-post trestle, the
  // wooden tap in the head, the drip beading on the slow
  // clock, two horn mugs waiting their turn, and the
  // morning's tally carved where the taproom can read it.
  const m = ((h >>> 3) & 1) ? 1 : -1;
  const ckL = s * 0.44;
  const ckR2 = s * 0.24;
  const cy = baseY - s * 0.52;
  const headX = p.x + m * ckL;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.62, 1.15, 0.4),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.5, s * 0.065),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // The taproom slop: ale never all lands in the mug.
      ctx.fillStyle = 'rgba(24, 30, 40, 0.2)';
      ctx.beginPath();
      ctx.ellipse(p.x + m * s * 0.2, baseY + s * 0.012, s * 0.34, s * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE STAND — pass two: four bare posts under a belly
      // read as LEGS (the barrel-pig verdict). A cask stand
      // is JOINERY: two wide plank cheeks with splayed feet,
      // a bearer plank running the length between them, and
      // the notch visibly cradling the belly.
      ctx.fillStyle = TWN_OAK_DARK;
      for (const e of [-1, 1] as const) {
        const chx = p.x + e * ckL * 0.6;
        ctx.beginPath();
        ctx.moveTo(chx - s * 0.075, cy + ckR2 * 0.62);
        ctx.lineTo(chx - s * 0.115, baseY);
        ctx.lineTo(chx + s * 0.115, baseY);
        ctx.lineTo(chx + s * 0.075, cy + ckR2 * 0.62);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = TWN_OAK;
      for (const e of [-1, 1] as const) {
        const chx = p.x + e * ckL * 0.6;
        ctx.beginPath();
        ctx.moveTo(chx - s * 0.062, cy + ckR2 * 0.64);
        ctx.lineTo(chx - s * 0.1, baseY - s * 0.012);
        ctx.lineTo(chx - s * 0.02, baseY - s * 0.012);
        ctx.lineTo(chx - s * 0.008, cy + ckR2 * 0.64);
        ctx.closePath();
        ctx.fill();
      }
      // The bearer plank between the cheeks, lit edge up.
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.fillRect(p.x - ckL * 0.62, cy + ckR2 * 0.78, ckL * 1.24, s * 0.05);
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.fillRect(p.x - ckL * 0.62, cy + ckR2 * 0.78, ckL * 1.24, s * 0.016);
      // THE CASK: belly proud, dark carcass, lit upper run.
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.beginPath();
      ctx.moveTo(p.x - ckL, cy - ckR2 * 0.82);
      ctx.quadraticCurveTo(p.x, cy - ckR2 * 1.18, p.x + ckL, cy - ckR2 * 0.82);
      ctx.lineTo(p.x + ckL, cy + ckR2 * 0.82);
      ctx.quadraticCurveTo(p.x, cy + ckR2 * 1.18, p.x - ckL, cy + ckR2 * 0.82);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TWN_OAK;
      ctx.beginPath();
      ctx.moveTo(p.x - ckL * 0.96, cy - ckR2 * 0.8);
      ctx.quadraticCurveTo(p.x, cy - ckR2 * 1.14, p.x + ckL * 0.96, cy - ckR2 * 0.8);
      ctx.lineTo(p.x + ckL * 0.96, cy - ckR2 * 0.12);
      ctx.quadraticCurveTo(p.x, cy - ckR2 * 0.34, p.x - ckL * 0.96, cy - ckR2 * 0.12);
      ctx.closePath();
      ctx.fill();
      // Stave seams RUN THE LENGTH, bowing with the belly.
      ctx.strokeStyle = 'rgba(50, 36, 18, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (const k of [-0.55, -0.1, 0.35, 0.75]) {
        ctx.beginPath();
        ctx.moveTo(p.x - ckL * 0.97, cy + ckR2 * k * 0.82);
        ctx.quadraticCurveTo(p.x, cy + ckR2 * k * 1.16, p.x + ckL * 0.97, cy + ckR2 * k * 0.82);
        ctx.stroke();
      }
      // THE HOOPS stand upright at the quarters — and this
      // camera NEVER sees a hoop on a lying cask as a ring
      // (user verdict: the full ellipses read as hula hoops
      // floating over the belly). THE LYING-HOOP LAW: a
      // cross-section circle projects to a vertical BAND
      // wrapping the visible surface — silhouette to
      // silhouette, bowed a hair outboard with the head's own
      // curvature, poking a touch proud of the crown so the
      // outline pass inks its crest, a lit west edge, and one
      // rivet where the band crosses the top.
      for (const hx2 of [-0.62, -0.22, 0.22, 0.62]) {
        const wx2 = p.x + hx2 * ckL;
        const tt = (hx2 + 1) / 2;
        const rr = ckR2 * (0.82 + 0.72 * tt * (1 - tt)) + s * 0.014;
        const bow = hx2 * s * 0.06;
        ctx.strokeStyle = TWN_IRON;
        ctx.lineWidth = Math.max(2, s * 0.05);
        ctx.beginPath();
        ctx.moveTo(wx2 - bow * 0.2, cy + rr);
        ctx.quadraticCurveTo(wx2 + bow, cy, wx2 - bow * 0.2, cy - rr);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(210, 218, 226, 0.35)';
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(wx2 - bow * 0.2 - s * 0.017, cy + rr * 0.86);
        ctx.quadraticCurveTo(wx2 + bow - s * 0.017, cy, wx2 - bow * 0.2 - s * 0.017, cy - rr * 0.86);
        ctx.stroke();
        ctx.fillStyle = '#6e6a78';
        ctx.beginPath();
        ctx.ellipse(wx2 - bow * 0.2, cy - rr + s * 0.024, s * 0.011, s * 0.01, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // THE HEAD: the tap end faces the dealt street side —
      // carved tally above the tap, because the keeper counts
      // in knife notches (no chalk in this world).
      ctx.fillStyle = shade(TWN_OAK, 8);
      ctx.beginPath();
      ctx.ellipse(headX, cy, s * 0.075, ckR2 * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();
      // The chime hoop rings the head — at the END the ring
      // truly faces the camera, so a ring is honest here.
      ctx.strokeStyle = TWN_IRON;
      ctx.lineWidth = Math.max(1.5, s * 0.03);
      ctx.beginPath();
      ctx.ellipse(headX, cy, s * 0.082, ckR2 * 0.99, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(50, 36, 18, 0.45)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(headX - s * 0.02, cy - ckR2 * 0.62);
      ctx.lineTo(headX + s * 0.03, cy - ckR2 * 0.58);
      ctx.moveTo(headX - s * 0.035, cy - ckR2 * 0.1);
      ctx.lineTo(headX + s * 0.045, cy - ckR2 * 0.06);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(58, 40, 20, 0.8)';
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(headX - s * 0.028 + k * s * 0.017, cy - ckR2 * 0.42);
        ctx.lineTo(headX - s * 0.024 + k * s * 0.017, cy - ckR2 * 0.24);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(232, 208, 160, 0.5)';
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.beginPath();
        ctx.moveTo(headX - s * 0.022 + k * s * 0.017, cy - ckR2 * 0.41);
        ctx.lineTo(headX - s * 0.018 + k * s * 0.017, cy - ckR2 * 0.25);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(58, 40, 20, 0.8)';
        ctx.lineWidth = Math.max(1, s * 0.012);
      }
      ctx.beginPath();
      ctx.moveTo(headX - s * 0.034, cy - ckR2 * 0.4);
      ctx.lineTo(headX + s * 0.036, cy - ckR2 * 0.26);
      ctx.stroke();
      // THE TAP: whittled, low in the head, a LONG spout
      // (pass two — the short curl read as a pig's tail),
      // its handle peg upright and worn pale.
      const tapY = cy + ckR2 * 0.45;
      ctx.strokeStyle = TWN_OAK_DARK;
      ctx.lineWidth = Math.max(2, s * 0.04);
      ctx.beginPath();
      ctx.moveTo(headX + m * s * 0.01, tapY);
      ctx.lineTo(headX + m * s * 0.15, tapY + s * 0.02);
      ctx.stroke();
      ctx.strokeStyle = shade(TWN_OAK_LIT, 6);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(headX + m * s * 0.02, tapY - s * 0.012);
      ctx.lineTo(headX + m * s * 0.14, tapY + s * 0.008);
      ctx.stroke();
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.fillRect(headX + m * s * 0.05 - s * 0.013, tapY - s * 0.065, s * 0.026, s * 0.06);
      ctx.fillStyle = '#1c1c22';
      ctx.beginPath();
      ctx.ellipse(headX + m * s * 0.15, tapY + s * 0.032, s * 0.013, s * 0.01, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE PAIL under the spout — every taproom keeps one
      // for the tap that never quite seats.
      const plx = headX + m * s * 0.15;
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.beginPath();
      ctx.moveTo(plx - s * 0.075, baseY - s * 0.16);
      ctx.lineTo(plx - s * 0.06, baseY);
      ctx.lineTo(plx + s * 0.06, baseY);
      ctx.lineTo(plx + s * 0.075, baseY - s * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TWN_OAK;
      ctx.beginPath();
      ctx.moveTo(plx - s * 0.075, baseY - s * 0.16);
      ctx.lineTo(plx - s * 0.06, baseY);
      ctx.lineTo(plx - s * 0.01, baseY);
      ctx.lineTo(plx - s * 0.018, baseY - s * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TWN_IRON;
      ctx.fillRect(plx - s * 0.072, baseY - s * 0.125, s * 0.144, s * 0.022);
      ctx.fillStyle = '#3a2c1a';
      ctx.beginPath();
      ctx.ellipse(plx, baseY - s * 0.157, s * 0.068, s * 0.022, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE DRIP (<4Hz): amber — this cask never held water.
      const dph = (t * 0.5 + ((h >>> 7) & 3) * 0.23) % 1;
      if (dph < 0.7) {
        const dy = tapY + s * 0.05 + (baseY - s * 0.17 - tapY) * (dph / 0.7) ** 1.6;
        ctx.fillStyle = 'rgba(201, 149, 92, 0.85)';
        ctx.beginPath();
        ctx.ellipse(plx, dy, s * 0.011, s * 0.017, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const rph = (dph - 0.7) / 0.3;
        ctx.strokeStyle = `rgba(201, 149, 92, ${(0.5 * (1 - rph)).toFixed(3)})`;
        ctx.lineWidth = Math.max(1, s * 0.009);
        ctx.beginPath();
        ctx.ellipse(plx, baseY - s * 0.157, s * (0.014 + rph * 0.04), s * (0.006 + rph * 0.013), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // TWO HORN MUGS waiting ON THE BEARER by the far
      // cheek — one upright, one on its side, both proud of
      // the shadow that ate them at the trestle foot.
      const mgx = p.x - m * ckL * 0.42;
      const mgY = cy + ckR2 * 0.78;
      ctx.fillStyle = '#8a5a36';
      ctx.beginPath();
      ctx.moveTo(mgx - s * 0.034, mgY - s * 0.105);
      ctx.lineTo(mgx - s * 0.028, mgY);
      ctx.lineTo(mgx + s * 0.028, mgY);
      ctx.lineTo(mgx + s * 0.034, mgY - s * 0.105);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade('#8a5a36', 24);
      ctx.fillRect(mgx - s * 0.029, mgY - s * 0.1, s * 0.012, s * 0.095);
      ctx.strokeStyle = shade('#8a5a36', 14);
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.arc(mgx + s * 0.038, mgY - s * 0.058, s * 0.021, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();
      ctx.fillStyle = '#26323e';
      ctx.beginPath();
      ctx.ellipse(mgx, mgY - s * 0.104, s * 0.03, s * 0.012, 0, 0, Math.PI * 2);
      ctx.fill();
      const mg2 = mgx + m * s * 0.095;
      ctx.fillStyle = shade('#8a5a36', -8);
      ctx.beginPath();
      ctx.ellipse(mg2, mgY - s * 0.028, s * 0.052, s * 0.027, 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1c1c22';
      ctx.beginPath();
      ctx.ellipse(mg2 + s * 0.042, mgY - s * 0.038, s * 0.015, s * 0.021, 0.25, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

function paintWoodStool(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // THE STOOL, recut twice: the first build shipped spider
  // legs — three dark hairlines under a thin wafer. The first
  // recut overcorrected into a STUMP: a thick dark rim wall
  // plus an underside blob filled the leg air, and the street
  // read a sawn trunk (pass-two verdict: A SEAT NEEDS AIR
  // UNDER IT — ground must show between the legs). Now it is
  // JOINERY WITH A BODY on a light stance:
  // a thick slab seat whose top plane takes the sky (the
  // crate-lid law), a true rim wall under it, and three
  // SPLAYED TURNED legs with real meat — each leg keeps a lit
  // west arris, a bead ring at the turning's swell, and an
  // honest planted foot. Seat height and leg turn stay on the
  // registry hash (salt-41 PARITY with shared/seats.ts —
  // change either side and the sitter floats).
  const sd0 = (h >>> 4) & 7;
  const seatY = baseY - s * (0.3 + (sd0 & 3) * 0.014);
  const rot = ((h >>> 7) & 3) * 0.5;
  const rx = s * 0.17; // a seat, not a saucer
  const ry = rx * 0.44; // the camera's foreshortening of the round
  const th = s * 0.038; // slab thickness — a board, not a stump collar
  return {
    sortY: ty + 0.68,
    body: stationBody(0.42, 0.72, 0.36),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.21, s * 0.045),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.14)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.008, s * 0.17, s * 0.032, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE LEGS, far to near so the near leg overdraws the
      // pair behind: turned posts splayed from the seat's
      // underside to feet planted WIDER than the rim — the
      // stance that says this seat holds a farmer.
      const legs: { a: number; depth: number }[] = [];
      for (let k = 0; k < 3; k++) {
        const a = rot + k * 2.094 + 0.52;
        legs.push({ a, depth: Math.sin(a) });
      }
      legs.sort((u, v) => u.depth - v.depth);
      for (const leg of legs) {
        const fx2 = Math.cos(leg.a);
        const topX = p.x + fx2 * rx * 0.48;
        const legTopY = seatY + th + leg.depth * ry * 0.4;
        const footX = p.x + fx2 * rx * 1.3;
        const footY = baseY + leg.depth * s * 0.06;
        const near = leg.depth > 0.1;
        const w1 = s * 0.032; // the leg at the seat
        const w2 = s * 0.044; // the turned swell at the ankle
        // Each foot grounds on its own contact — three
        // touches, not one floating tripod.
        ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
        ctx.beginPath();
        ctx.ellipse(footX, footY + s * 0.014, w2 * 1.2, s * 0.016, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = near ? shade(TWN_OAK, 6) : TWN_OAK_DARK;
        ctx.beginPath();
        ctx.moveTo(topX - w1, legTopY);
        ctx.lineTo(footX - w2, footY - s * 0.02);
        ctx.quadraticCurveTo(footX - w2 * 0.92, footY + s * 0.008, footX - w2 * 0.5, footY + s * 0.012);
        ctx.lineTo(footX + w2 * 0.5, footY + s * 0.012);
        ctx.quadraticCurveTo(footX + w2 * 0.92, footY + s * 0.008, footX + w2, footY - s * 0.02);
        ctx.lineTo(topX + w1, legTopY);
        ctx.closePath();
        ctx.fill();
        // The turning: a bead ring where the leg swells.
        ctx.strokeStyle = near ? shade(TWN_OAK, -18) : shade(TWN_OAK_DARK, -10);
        ctx.lineWidth = Math.max(1, s * 0.011);
        const bx2 = topX + (footX - topX) * 0.6;
        const by2 = legTopY + (footY - legTopY) * 0.6;
        const bw2 = (w1 + (w2 - w1) * 0.6) * 0.95;
        ctx.beginPath();
        ctx.moveTo(bx2 - bw2, by2);
        ctx.quadraticCurveTo(bx2, by2 + s * 0.012, bx2 + bw2, by2);
        ctx.stroke();
        // The lit arris up the sun side of the near legs.
        if (near || fx2 < -0.3) {
          ctx.strokeStyle = TWN_OAK_LIT;
          ctx.lineWidth = Math.max(1, s * 0.012);
          ctx.beginPath();
          ctx.moveTo(topX - w1 * 0.5, legTopY + s * 0.012);
          ctx.lineTo(footX - w2 * 0.55, footY - s * 0.02);
          ctx.stroke();
        }
      }
      // THE SEAT: a slab with a BODY. Underside shadow first,
      // then the rim wall's full lower round, then the top
      // plane lit to the sky — the bottom ellipse peeking
      // below the top IS the thickness (the slab idiom).
      ctx.fillStyle = shade(TWN_OAK_DARK, -10);
      ctx.beginPath();
      ctx.ellipse(p.x, seatY + th + s * 0.008, rx * 0.9, ry * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(TWN_OAK, -8);
      ctx.beginPath();
      ctx.ellipse(p.x, seatY + th, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      // The rim wall shades only at its south belly — a slab
      // edge, never a stump's bark collar.
      ctx.strokeStyle = TWN_OAK_DARK;
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.ellipse(p.x, seatY + th * 0.6, rx * 0.98, ry, 0, 0.5, Math.PI - 0.5);
      ctx.stroke();
      // The top plane.
      ctx.fillStyle = TWN_OAK;
      ctx.beginPath();
      ctx.ellipse(p.x, seatY, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.beginPath();
      ctx.ellipse(p.x - rx * 0.08, seatY - ry * 0.1, rx * 0.82, ry * 0.76, 0, 0, Math.PI * 2);
      ctx.fill();
      // The worn sheen where the sitter always sits.
      ctx.fillStyle = shade(TWN_OAK_LIT, 10);
      ctx.beginPath();
      ctx.ellipse(p.x + s * ((sd0 & 1) ? 0.025 : -0.03), seatY - ry * 0.08, rx * 0.42, ry * 0.4, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // One seasoning check across the slab, stopped at the rim.
      ctx.strokeStyle = 'rgba(110, 84, 48, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.008);
      ctx.beginPath();
      ctx.moveTo(p.x - rx * 0.55, seatY + ry * ((sd0 & 2) ? 0.25 : -0.2));
      ctx.lineTo(p.x + rx * 0.62, seatY + ry * ((sd0 & 2) ? 0.12 : -0.32));
      ctx.stroke();
      // The sunlit front arris where the top meets the wall.
      ctx.strokeStyle = 'rgba(232, 208, 160, 0.6)';
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.ellipse(p.x, seatY, rx * 0.99, ry * 0.98, 0, Math.PI + 0.5, Math.PI * 2 - 0.5);
      ctx.stroke();
      // THE WEDGED TENONS: the joiner's signature the camera
      // actually sees — three pale ovals over the leg stations,
      // each struck through with its wedge line.
      for (const leg of legs) {
        const tX = p.x + Math.cos(leg.a) * rx * 0.52;
        const tY = seatY + Math.sin(leg.a) * ry * 0.52;
        ctx.fillStyle = shade(TWN_OAK, 20);
        ctx.beginPath();
        ctx.ellipse(tX, tY, s * 0.019, s * 0.012, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = TWN_OAK_DARK;
        ctx.lineWidth = Math.max(1, s * 0.007);
        ctx.beginPath();
        ctx.moveTo(tX - s * 0.015, tY - s * 0.005);
        ctx.lineTo(tX + s * 0.015, tY + s * 0.005);
        ctx.stroke();
      }
    },
  };
}

function paintBasketStack(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The wicker family, recut — PASS-TWO VERDICT: pure
  // horizontal courses on a straight column read as ROPE
  // WRAPS, and two like-sized drums fuse into one lumpy
  // tower. A basket is a FLARE (narrow foot, wide mouth), a
  // BRICK-PATTERN weave (lit over-strands offset every other
  // course), a BRAIDED RIM, and twist HANDLES. So: one fat
  // flared hamper wearing its woven lid, a clearly smaller
  // open basket riding one shoulder of that lid (dealt
  // contents — apples, wool, or roots — its own lid tipped
  // ajar), clear air and a tone step between the two masses,
  // the whole stack on two skid slats (the pallet law).
  const m = ((h >>> 3) & 1) ? 1 : -1;
  const load = (h >>> 6) & 3;
  const bR = s * 0.27;
  const bTop = baseY - s * 0.44;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.48, 1.05, 0.35),
    drawShadow: () => rend.castContact(p.x, baseY, bR * 1.25, s * 0.055),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // The skid slats: feet on dirt, ground between.
      ctx.fillStyle = TWN_OAK_DARK;
      for (const e of [-1, 1] as const) {
        ctx.fillRect(p.x + e * bR * 0.6 - s * 0.05, baseY - s * 0.028, s * 0.1, s * 0.028);
      }
      ctx.fillStyle = TWN_OAK;
      for (const e of [-1, 1] as const) {
        ctx.fillRect(p.x + e * bR * 0.6 - s * 0.05, baseY - s * 0.028, s * 0.1, s * 0.009);
      }
      // Straw drifted against the skids.
      ctx.strokeStyle = 'rgba(216, 196, 154, 0.75)';
      ctx.lineWidth = Math.max(1, s * 0.009);
      for (let k = 0; k < 5; k++) {
        const sd = (h >>> (k * 3 + 2)) & 15;
        const wx2 = p.x + ((sd & 7) - 3.5) * bR * 0.28;
        ctx.beginPath();
        ctx.moveTo(wx2 - s * 0.03, baseY - s * 0.004);
        ctx.lineTo(wx2 + s * 0.028, baseY - s * 0.018 - (sd >>> 3) * s * 0.004);
        ctx.stroke();
      }
      // ONE basket painter, two castings: flared body, faint
      // upright stakes, coursed rounds with the brick-offset
      // lit over-strands, and the two-tone braided rim.
      const basket = (cx: number, byBase: number, byTop: number, fr: number, mr: number, rows: number, tone: number) => {
        // The flared body: foot narrower than mouth — the
        // silhouette that says BASKET before any texture does.
        ctx.fillStyle = shade(CMN_WICKER_DARK, tone);
        ctx.beginPath();
        ctx.moveTo(cx - fr, byBase);
        ctx.quadraticCurveTo(cx - (fr + mr) * 0.56, (byBase + byTop) / 2, cx - mr, byTop);
        ctx.lineTo(cx + mr, byTop);
        ctx.quadraticCurveTo(cx + (fr + mr) * 0.56, (byBase + byTop) / 2, cx + fr, byBase);
        ctx.closePath();
        ctx.fill();
        // West half catches the sun — a turned form.
        ctx.fillStyle = shade(CMN_WICKER, tone);
        ctx.beginPath();
        ctx.moveTo(cx - fr * 0.92, byBase - s * 0.006);
        ctx.quadraticCurveTo(cx - (fr + mr) * 0.52, (byBase + byTop) / 2, cx - mr * 0.92, byTop + s * 0.008);
        ctx.lineTo(cx + mr * 0.06, byTop + s * 0.008);
        ctx.quadraticCurveTo(cx + (fr + mr) * 0.03, (byBase + byTop) / 2, cx + fr * 0.04, byBase - s * 0.006);
        ctx.closePath();
        ctx.fill();
        // The upright stakes, fanning with the flare.
        ctx.strokeStyle = 'rgba(80, 62, 34, 0.4)';
        ctx.lineWidth = Math.max(1, s * 0.011);
        for (let k = -2; k <= 2; k++) {
          const f = k / 2.9;
          ctx.beginPath();
          ctx.moveTo(cx + f * fr, byBase - s * 0.01);
          ctx.lineTo(cx + f * mr, byTop + s * 0.015);
          ctx.stroke();
        }
        // The courses, sagging a hair mid-run; every other
        // course offsets its lit over-strands half a step —
        // the brick pattern that says WOVEN at map scale.
        const segs = 6;
        for (let k = 0; k < rows; k++) {
          const fy = (k + 0.72) / (rows + 0.55);
          const yy = byTop + (byBase - s * 0.015 - byTop) * fy;
          const wk = mr + (fr - mr) * fy;
          const sag = s * 0.02;
          ctx.strokeStyle = 'rgba(80, 62, 34, 0.55)';
          ctx.lineWidth = Math.max(1, s * 0.016);
          ctx.beginPath();
          ctx.moveTo(cx - wk, yy);
          ctx.quadraticCurveTo(cx, yy + sag * 2, cx + wk, yy);
          ctx.stroke();
          ctx.strokeStyle = `rgba(205, 176, 120, ${0.75 + tone * 0.01})`;
          ctx.lineWidth = Math.max(1, s * 0.018);
          for (let j = 0; j < segs; j++) {
            if ((j + k) % 2) continue;
            const u0 = -1 + (j + 0.12) * (2 / segs);
            const u1 = -1 + (j + 0.88) * (2 / segs);
            ctx.beginPath();
            ctx.moveTo(cx + u0 * wk, yy + (1 - u0 * u0) * sag);
            ctx.lineTo(cx + u1 * wk, yy + (1 - u1 * u1) * sag);
            ctx.stroke();
          }
        }
        // The braided rim: dark round under a lit round.
        ctx.strokeStyle = shade(CMN_WICKER_DARK, tone - 4);
        ctx.lineWidth = Math.max(1.5, s * 0.032);
        ctx.beginPath();
        ctx.ellipse(cx, byTop, mr * 1.02, s * 0.055, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = shade(CMN_WICKER_LIT, tone);
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.ellipse(cx, byTop - s * 0.008, mr * 1.0, s * 0.05, 0, 0, Math.PI * 2);
        ctx.stroke();
      };
      // THE HAMPER, wearing its lid.
      basket(p.x, baseY - s * 0.028, bTop, s * 0.185, bR, 4, 0);
      // Twist handles at the rim — the carrying truth. Thin
      // wisps half-buried in the body (PASS-TWO: fat freestanding
      // loops swelled into pig ears under the outline dilate).
      ctx.strokeStyle = shade(CMN_WICKER_DARK, 8);
      ctx.lineWidth = Math.max(1, s * 0.016);
      for (const e of [-1, 1] as const) {
        ctx.beginPath();
        ctx.ellipse(p.x + e * bR * 0.98, bTop + s * 0.055, s * 0.026, s * 0.042, e * 0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
      // The hamper's woven lid: a bright plane with radial
      // strands — it carries the small basket, so it sits SNUG.
      ctx.fillStyle = CMN_WICKER;
      ctx.beginPath();
      ctx.ellipse(p.x, bTop - s * 0.014, bR * 0.94, s * 0.052, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = CMN_WICKER_LIT;
      ctx.beginPath();
      ctx.ellipse(p.x - m * bR * 0.16, bTop - s * 0.022, bR * 0.6, s * 0.032, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(80, 62, 34, 0.35)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2 + 0.4;
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(a) * bR * 0.3, bTop - s * 0.014 + Math.sin(a) * s * 0.016);
        ctx.lineTo(p.x + Math.cos(a) * bR * 0.86, bTop - s * 0.014 + Math.sin(a) * s * 0.047);
        ctx.stroke();
      }
      // THE SHOULDER BASKET: clearly smaller, dealt far enough
      // aside that its silhouette BREAKS OUT of the hamper's
      // outline (PASS-TWO: centered it read as one urn with a
      // raised neck), a shade lighter — two pieces, never one
      // tower.
      const sx2 = p.x + m * bR * 0.55;
      const sR = bR * 0.55;
      const sBase = bTop - s * 0.035;
      const sTop = sBase - s * 0.27;
      // Contact shade seats it on the lid plane.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
      ctx.beginPath();
      ctx.ellipse(sx2, sBase, sR * 0.72, s * 0.028, 0, 0, Math.PI * 2);
      ctx.fill();
      basket(sx2, sBase, sTop, sR * 0.68, sR, 2, 9);
      // DEALT CONTENTS in the open mouth: apples, wool, or
      // roots — the lid leans on what it can't cover.
      const mouthY = sTop + s * 0.008;
      ctx.fillStyle = '#3a3020';
      ctx.beginPath();
      ctx.ellipse(sx2, mouthY, sR * 0.8, s * 0.042, 0, 0, Math.PI * 2);
      ctx.fill();
      if (load !== 3) {
        for (let k = 0; k < 3; k++) {
          const sd = (h >>> (k * 4 + 9)) & 7;
          const cx2 = sx2 + (k - 1) * sR * 0.42 + (sd & 1) * s * 0.012;
          if (load === 0) {
            ctx.fillStyle = k === 1 ? '#c05a3a' : '#a84a34';
            ctx.beginPath();
            ctx.arc(cx2, mouthY - s * 0.016, s * 0.032, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(232, 220, 196, 0.5)';
            ctx.beginPath();
            ctx.arc(cx2 - s * 0.01, mouthY - s * 0.026, s * 0.009, 0, Math.PI * 2);
            ctx.fill();
          } else if (load === 1) {
            ctx.fillStyle = k === 1 ? '#efe9de' : '#ded8ce';
            ctx.beginPath();
            ctx.ellipse(cx2, mouthY - s * 0.014, s * 0.036, s * 0.026, k * 0.4, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = k === 1 ? '#c9a13c' : '#b08a45';
            ctx.beginPath();
            ctx.ellipse(cx2, mouthY - s * 0.012, s * 0.018, s * 0.032, (k - 1) * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      // The small lid, tipped ajar against the far rim.
      ctx.fillStyle = CMN_WICKER;
      ctx.beginPath();
      ctx.ellipse(sx2 - m * sR * 0.62, mouthY - s * 0.05, sR * 0.62, s * 0.034, m * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = CMN_WICKER_LIT;
      ctx.beginPath();
      ctx.ellipse(sx2 - m * sR * 0.65, mouthY - s * 0.058, sR * 0.45, s * 0.022, m * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = CMN_WICKER_DARK;
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.ellipse(sx2 - m * sR * 0.62, mouthY - s * 0.05, sR * 0.62, s * 0.034, m * 0.42, 0, Math.PI * 2);
      ctx.stroke();
      // The lid knob.
      ctx.fillStyle = CMN_WICKER_DARK;
      ctx.beginPath();
      ctx.arc(sx2 - m * sR * 0.62, mouthY - s * 0.075, s * 0.014, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

function paintGlazedJars(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The potter's wares IN SERVICE — the second shift made
  // them, the commons keeps them. Three jars ranked tall to
  // small: the tall one corked and wax-capped, the middle
  // one cloth-sealed and strung, the small one OPEN (a
  // vessel shows its mouth: dark hollow, bright lip). Every
  // glaze dealt — GLAZED WARE, NEVER BARE CLAY.
  const glazes = ['#6f8a5c', '#5c748a', '#a3703c', '#c9ab8e'];
  const g0 = (h >>> 4) & 3;
  const m = ((h >>> 9) & 1) ? 1 : -1;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.5, 0.95, 0.35),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.36, s * 0.055),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.18)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.006, s * 0.34, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      // One jar painter, three castings.
      const jar = (jx: number, jw: number, jh: number, glaze: string, kind: number) => {
        const neckY = baseY - jh;
        // Belly silhouette: foot, swell, shoulder, neck.
        ctx.fillStyle = shade(glaze, -14);
        ctx.beginPath();
        ctx.moveTo(jx - jw * 0.5, baseY);
        ctx.quadraticCurveTo(jx - jw * 1.1, baseY - jh * 0.55, jx - jw * 0.42, neckY + jh * 0.16);
        ctx.lineTo(jx - jw * 0.3, neckY);
        ctx.lineTo(jx + jw * 0.3, neckY);
        ctx.lineTo(jx + jw * 0.42, neckY + jh * 0.16);
        ctx.quadraticCurveTo(jx + jw * 1.1, baseY - jh * 0.55, jx + jw * 0.5, baseY);
        ctx.closePath();
        ctx.fill();
        // The lit flank: glaze runs BRIGHT down one side.
        ctx.fillStyle = glaze;
        ctx.beginPath();
        ctx.moveTo(jx - jw * 0.46, baseY - s * 0.008);
        ctx.quadraticCurveTo(jx - jw * 1.0, baseY - jh * 0.55, jx - jw * 0.38, neckY + jh * 0.17);
        ctx.lineTo(jx - jw * 0.1, neckY + jh * 0.1);
        ctx.quadraticCurveTo(jx - jw * 0.42, baseY - jh * 0.5, jx - jw * 0.06, baseY - s * 0.008);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(246, 242, 230, 0.35)';
        ctx.beginPath();
        ctx.ellipse(jx - jw * 0.42, baseY - jh * 0.52, jw * 0.1, jh * 0.26, 0.12, 0, Math.PI * 2);
        ctx.fill();
        // The slip band at the shoulder — the potter's
        // signature stripe.
        ctx.strokeStyle = shade(glaze, 26);
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(jx - jw * 0.58, neckY + jh * 0.22);
        ctx.quadraticCurveTo(jx, neckY + jh * 0.3, jx + jw * 0.58, neckY + jh * 0.22);
        ctx.stroke();
        // The dark foot ring.
        ctx.strokeStyle = 'rgba(40, 30, 22, 0.5)';
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(jx - jw * 0.48, baseY - s * 0.012);
        ctx.quadraticCurveTo(jx, baseY + s * 0.008, jx + jw * 0.48, baseY - s * 0.012);
        ctx.stroke();
        if (kind === 0) {
          // Corked and wax-capped: the seal drips bright.
          ctx.fillStyle = '#b89a68';
          ctx.fillRect(jx - jw * 0.26, neckY - s * 0.03, jw * 0.52, s * 0.032);
          ctx.fillStyle = '#a83c34';
          ctx.beginPath();
          ctx.ellipse(jx, neckY - s * 0.026, jw * 0.34, s * 0.02, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = shade('#a83c34', 20);
          ctx.beginPath();
          ctx.ellipse(jx - jw * 0.08, neckY - s * 0.032, jw * 0.18, s * 0.011, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#a83c34';
          ctx.lineWidth = Math.max(1, s * 0.012);
          ctx.beginPath();
          ctx.moveTo(jx + jw * 0.3, neckY - s * 0.018);
          ctx.quadraticCurveTo(jx + jw * 0.34, neckY + s * 0.02, jx + jw * 0.3, neckY + s * 0.05);
          ctx.stroke();
        } else if (kind === 1) {
          // Cloth-capped and strung.
          ctx.fillStyle = TWN_PAPER;
          ctx.beginPath();
          ctx.ellipse(jx, neckY - s * 0.012, jw * 0.4, s * 0.026, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = shade(TWN_PAPER, -14);
          ctx.beginPath();
          ctx.moveTo(jx + jw * 0.28, neckY - s * 0.005);
          ctx.lineTo(jx + jw * 0.42, neckY + s * 0.035);
          ctx.lineTo(jx + jw * 0.24, neckY + s * 0.02);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = TWN_ROPE;
          ctx.lineWidth = Math.max(1, s * 0.01);
          ctx.beginPath();
          ctx.moveTo(jx - jw * 0.34, neckY + s * 0.008);
          ctx.quadraticCurveTo(jx, neckY + s * 0.022, jx + jw * 0.34, neckY + s * 0.008);
          ctx.stroke();
        } else {
          // OPEN: dark mouth, bright lip — the vessel law.
          ctx.fillStyle = '#241f18';
          ctx.beginPath();
          ctx.ellipse(jx, neckY, jw * 0.3, s * 0.02, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = shade(glaze, 30);
          ctx.lineWidth = Math.max(1, s * 0.013);
          ctx.beginPath();
          ctx.ellipse(jx, neckY, jw * 0.32, s * 0.022, 0, Math.PI * 0.95, Math.PI * 2.05);
          ctx.stroke();
        }
      };
      // Ranked tall-to-small along the dealt march; the
      // small open one stands proud in front.
      jar(p.x - m * s * 0.19, s * 0.15, s * 0.6, glazes[g0]!, 0);
      jar(p.x + m * s * 0.13, s * 0.125, s * 0.42, glazes[(g0 + 1) & 3]!, 1);
      jar(p.x + m * s * 0.31, s * 0.095, s * 0.27, glazes[(g0 + 2) & 3]!, 2);
      // One honest chip on the tall jar's foot — these are
      // WORKING vessels, not the shop's shelf stock.
      ctx.fillStyle = TRD_CLAY;
      ctx.beginPath();
      ctx.moveTo(p.x - m * s * 0.13, baseY - s * 0.05);
      ctx.lineTo(p.x - m * s * 0.105, baseY - s * 0.075);
      ctx.lineTo(p.x - m * s * 0.095, baseY - s * 0.045);
      ctx.closePath();
      ctx.fill();
    },
  };
}

function paintBroomAndPail(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The chore MID-DONE — the town voice in one prop. A
  // birch besom leans on its peg-post (a broom needs
  // something to lean on; the post is the peg the yard
  // hangs its day from), the pail waits with the rag over
  // its rim, and the morning's sweepings sit in a neat pile
  // nobody has fetched the pan for yet.
  const m = ((h >>> 3) & 1) ? 1 : -1;
  const postX = p.x - m * s * 0.12;
  const postTop = baseY - s * 0.72;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.52, 1.05, 0.35),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.3, s * 0.05),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // THE POST: squat, chamfer-crowned, one peg out the
      // dealt side, a knot eye low.
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.fillRect(postX - s * 0.042, postTop, s * 0.084, baseY - postTop);
      ctx.fillStyle = TWN_OAK;
      ctx.fillRect(postX - s * 0.042, postTop, s * 0.032, baseY - postTop);
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.beginPath();
      ctx.moveTo(postX - s * 0.042, postTop);
      ctx.lineTo(postX - s * 0.022, postTop - s * 0.022);
      ctx.lineTo(postX + s * 0.022, postTop - s * 0.022);
      ctx.lineTo(postX + s * 0.042, postTop);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TWN_OAK;
      ctx.fillRect(postX + m * s * 0.04, postTop + s * 0.14, m * s * 0.06, s * 0.026);
      ctx.fillStyle = '#4e3a2c';
      ctx.beginPath();
      ctx.ellipse(postX - m * s * 0.012, baseY - s * 0.24, s * 0.014, s * 0.02, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE BESOM leaning into the peg: waxed handle, two
      // lashings, and a bound birch head SPLAYED at the
      // floor — mid-chore, not parked in a rack.
      const hx2 = postX + m * s * 0.05;
      const footX = postX + m * s * 0.34;
      ctx.strokeStyle = shade(TWN_OAK_LIT, -6);
      ctx.lineWidth = Math.max(1.5, s * 0.024);
      ctx.beginPath();
      ctx.moveTo(hx2, postTop + s * 0.1);
      ctx.lineTo(footX - m * s * 0.05, baseY - s * 0.2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(50, 36, 18, 0.4)';
      ctx.lineWidth = Math.max(1, s * 0.008);
      ctx.beginPath();
      ctx.moveTo(hx2 + s * 0.006, postTop + s * 0.11);
      ctx.lineTo(footX - m * s * 0.05 + s * 0.006, baseY - s * 0.21);
      ctx.stroke();
      // The head: bound twigs fanning to the floor.
      ctx.fillStyle = '#8a7448';
      ctx.beginPath();
      ctx.moveTo(footX - m * s * 0.08, baseY - s * 0.21);
      ctx.lineTo(footX + m * s * 0.1, baseY);
      ctx.lineTo(footX - m * s * 0.16, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#6f5a38';
      ctx.lineWidth = Math.max(1, s * 0.008);
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.moveTo(footX - m * s * 0.05, baseY - s * 0.17);
        ctx.lineTo(footX + m * s * (0.08 - k * 0.05), baseY - s * 0.004);
        ctx.stroke();
      }
      ctx.strokeStyle = TWN_ROPE;
      ctx.lineWidth = Math.max(1, s * 0.014);
      for (const ly of [0.185, 0.145]) {
        ctx.beginPath();
        ctx.moveTo(footX - m * s * 0.075, baseY - s * ly);
        ctx.lineTo(footX - m * s * 0.02, baseY - s * (ly + 0.012));
        ctx.stroke();
      }
      // THE PAIL at the post foot, rag thrown over the rim.
      const plx = postX - m * s * 0.2;
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.beginPath();
      ctx.moveTo(plx - s * 0.085, baseY - s * 0.19);
      ctx.lineTo(plx - s * 0.068, baseY);
      ctx.lineTo(plx + s * 0.068, baseY);
      ctx.lineTo(plx + s * 0.085, baseY - s * 0.19);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TWN_OAK;
      ctx.beginPath();
      ctx.moveTo(plx - s * 0.085, baseY - s * 0.19);
      ctx.lineTo(plx - s * 0.068, baseY);
      ctx.lineTo(plx - s * 0.012, baseY);
      ctx.lineTo(plx - s * 0.022, baseY - s * 0.19);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TWN_IRON;
      ctx.fillRect(plx - s * 0.082, baseY - s * 0.15, s * 0.164, s * 0.024);
      ctx.fillStyle = 'rgba(210, 218, 226, 0.35)';
      ctx.fillRect(plx - s * 0.082, baseY - s * 0.15, s * 0.164, s * 0.008);
      ctx.fillStyle = '#26323e';
      ctx.beginPath();
      ctx.ellipse(plx, baseY - s * 0.187, s * 0.078, s * 0.026, 0, 0, Math.PI * 2);
      ctx.fill();
      // The rag: wrung and hung to remember its twist.
      ctx.fillStyle = TWN_PAPER;
      ctx.beginPath();
      ctx.moveTo(plx - s * 0.06, baseY - s * 0.2);
      ctx.quadraticCurveTo(plx - s * 0.02, baseY - s * 0.225, plx + s * 0.025, baseY - s * 0.2);
      ctx.lineTo(plx + s * 0.012, baseY - s * 0.1);
      ctx.quadraticCurveTo(plx - s * 0.008, baseY - s * 0.085, plx - s * 0.028, baseY - s * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shade(TWN_PAPER, -16);
      ctx.lineWidth = Math.max(1, s * 0.008);
      ctx.beginPath();
      ctx.moveTo(plx - s * 0.02, baseY - s * 0.21);
      ctx.quadraticCurveTo(plx - s * 0.012, baseY - s * 0.15, plx - s * 0.01, baseY - s * 0.105);
      ctx.stroke();
      // THE SWEEPINGS: the neat pile, two strays, and the
      // clean arc the besom already claimed.
      ctx.fillStyle = 'rgba(88, 70, 42, 0.55)';
      ctx.beginPath();
      ctx.ellipse(postX + m * s * 0.16, baseY - s * 0.012, s * 0.07, s * 0.026, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(120, 96, 56, 0.6)';
      ctx.beginPath();
      ctx.ellipse(postX + m * s * 0.15, baseY - s * 0.026, s * 0.05, s * 0.017, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const e of [0.26, 0.34]) {
        ctx.fillStyle = '#8a7448';
        ctx.beginPath();
        ctx.ellipse(postX + m * s * e, baseY - s * 0.008, s * 0.013, s * 0.007, e, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(58, 46, 26, 0.14)';
      ctx.lineWidth = Math.max(2, s * 0.05);
      ctx.beginPath();
      ctx.arc(postX + m * s * 0.05, baseY + s * 0.02, s * 0.24, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    },
  };
}

function paintLeanLadder(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The joiner's ladder, leaned NORTH against whatever the
  // tile behind it stands (wall, eave, loft — the placement
  // reads the scene): rails converging as they climb (the
  // camera's own foreshortening, honest), dealt rung count,
  // feet slid the dealt way, and a hand-sickle hung on the
  // third rung — harvest passed through and will be back.
  const m = ((h >>> 3) & 1) ? 1 : -1;
  const rungs = 5 + ((h >>> 6) & 3);
  const footW = s * 0.21;
  const topW = s * 0.13;
  const topY = baseY - s * 1.62;
  const skew = m * s * 0.07;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.48, 1.95, 0.35),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.24, s * 0.04),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // The rails: dark carcass, lit inner edge, feet shod
      // with the little skid cuts a real ladder earns.
      for (const e of [-1, 1] as const) {
        const fx2 = p.x + e * footW + (e < 0 ? skew * 0.4 : skew * 0.4);
        const tx2 = p.x + e * topW + skew;
        ctx.strokeStyle = TWN_OAK_DARK;
        ctx.lineWidth = Math.max(2, s * 0.042);
        ctx.beginPath();
        ctx.moveTo(fx2, baseY);
        ctx.lineTo(tx2, topY);
        ctx.stroke();
        ctx.strokeStyle = TWN_OAK;
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(fx2 - s * 0.012, baseY - s * 0.01);
        ctx.lineTo(tx2 - s * 0.012, topY + s * 0.01);
        ctx.stroke();
        ctx.fillStyle = shade(TWN_OAK_DARK, -10);
        ctx.fillRect(fx2 - s * 0.026, baseY - s * 0.02, s * 0.052, s * 0.02);
      }
      // The rungs: through-tenoned, each catching light on
      // its top edge; spacing tightens with the climb.
      for (let k = 0; k < rungs; k++) {
        const fy = (k + 0.7) / (rungs + 0.7);
        const yy = baseY - (baseY - topY) * fy;
        const w2 = footW + (topW - footW) * fy;
        const xoff = skew * (0.4 + 0.6 * fy);
        ctx.strokeStyle = TWN_OAK;
        ctx.lineWidth = Math.max(1.5, s * 0.026);
        ctx.beginPath();
        ctx.moveTo(p.x - w2 + xoff, yy);
        ctx.lineTo(p.x + w2 + xoff, yy - s * 0.008);
        ctx.stroke();
        ctx.strokeStyle = TWN_OAK_LIT;
        ctx.lineWidth = Math.max(1, s * 0.009);
        ctx.beginPath();
        ctx.moveTo(p.x - w2 + xoff, yy - s * 0.01);
        ctx.lineTo(p.x + w2 + xoff, yy - s * 0.018);
        ctx.stroke();
      }
      // One rung's old crack, wrapped in the joiner's cord.
      const cy2 = baseY - (baseY - topY) * ((2.7) / (rungs + 0.7));
      ctx.strokeStyle = TWN_ROPE;
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(p.x - m * s * 0.03 + skew * 0.6, cy2 - s * 0.02);
      ctx.lineTo(p.x - m * s * 0.045 + skew * 0.6, cy2 + s * 0.015);
      ctx.moveTo(p.x - m * s * 0.018 + skew * 0.6, cy2 - s * 0.018);
      ctx.lineTo(p.x - m * s * 0.033 + skew * 0.6, cy2 + s * 0.017);
      ctx.stroke();
      // THE SICKLE on the third rung: crescent down, edge
      // bright, the grip worn — harvest's bookmark.
      const sy2 = baseY - (baseY - topY) * ((3.7) / (rungs + 0.7));
      const sx2 = p.x + m * s * 0.075 + skew * 0.65;
      ctx.strokeStyle = TRD_STEEL;
      ctx.lineWidth = Math.max(1.5, s * 0.02);
      ctx.beginPath();
      ctx.arc(sx2, sy2 + s * 0.1, s * 0.085, Math.PI * 0.15, Math.PI * 1.05);
      ctx.stroke();
      ctx.strokeStyle = TRD_STEEL_LIT;
      ctx.lineWidth = Math.max(1, s * 0.008);
      ctx.beginPath();
      ctx.arc(sx2, sy2 + s * 0.1, s * 0.078, Math.PI * 0.25, Math.PI * 0.95);
      ctx.stroke();
      ctx.strokeStyle = TRD_LEATHER;
      ctx.lineWidth = Math.max(1.5, s * 0.024);
      ctx.beginPath();
      ctx.moveTo(sx2 + s * 0.075, sy2 + s * 0.055);
      ctx.lineTo(sx2 + s * 0.1, sy2 - s * 0.005);
      ctx.stroke();
    },
  };
}

function paintWheelbarrow(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The yard's one-wheeled mule, parked on its legs with
  // the handles raked toward the street. The box is an OPEN
  // VESSEL (the scoop law at barrow scale: dark hollow,
  // bright lip), the wheel iron-shod by the smith, and the
  // load deals — soil, cordwood, sacks, or honest emptiness.
  const m = ((h >>> 3) & 1) ? 1 : -1;
  const load = (h >>> 6) & 3;
  const boxY = baseY - s * 0.34;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.64, 0.95, 0.42),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.44, s * 0.06),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.18)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.008, s * 0.42, s * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
      // Pass two: the first paint read as a BREAD TROUGH —
      // the wheel had vanished edge-on and the box sat too
      // low. The wheel now stands PROUD of the box line and
      // the box rides high enough to read as a barrow bed.
      // THE LEGS at the parked end first, shod feet.
      for (const off of [0.06, 0.18]) {
        ctx.fillStyle = TWN_OAK_DARK;
        ctx.fillRect(p.x - m * s * (0.26 + off) - s * 0.02, boxY + s * 0.12, s * 0.04, baseY - boxY - s * 0.12);
        ctx.fillStyle = shade(TWN_OAK_DARK, -8);
        ctx.fillRect(p.x - m * s * (0.26 + off) - s * 0.032, baseY - s * 0.022, s * 0.064, s * 0.022);
        ctx.fillStyle = TWN_OAK_DARK;
      }
      // THE HANDLES: two clear poles raked back, grips worn
      // PALE — drawn under the box so the joins bury.
      for (const e of [-0.11, 0.11]) {
        ctx.strokeStyle = TWN_OAK;
        ctx.lineWidth = Math.max(2, s * 0.03);
        ctx.beginPath();
        ctx.moveTo(p.x + m * s * 0.2 + e * s * 0.9, boxY + s * 0.14);
        ctx.lineTo(p.x - m * s * 0.56 + e * s * 1.2, baseY - s * 0.34);
        ctx.stroke();
        ctx.strokeStyle = shade(TWN_OAK_LIT, 12);
        ctx.lineWidth = Math.max(2, s * 0.028);
        ctx.beginPath();
        ctx.moveTo(p.x - m * s * 0.47 + e * s * 1.16, baseY - s * 0.355);
        ctx.lineTo(p.x - m * s * 0.56 + e * s * 1.2, baseY - s * 0.34);
        ctx.stroke();
      }
      // THE BOX: flared plank bed, iron strap, bright rim.
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.beginPath();
      ctx.moveTo(p.x - m * s * 0.4, boxY - s * 0.02);
      ctx.lineTo(p.x - m * s * 0.3, baseY - s * 0.24);
      ctx.lineTo(p.x + m * s * 0.32, baseY - s * 0.24);
      ctx.lineTo(p.x + m * s * 0.42, boxY - s * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TWN_OAK;
      ctx.beginPath();
      ctx.moveTo(p.x - m * s * 0.4, boxY - s * 0.02);
      ctx.lineTo(p.x - m * s * 0.3, baseY - s * 0.24);
      ctx.lineTo(p.x - m * s * 0.01, baseY - s * 0.24);
      ctx.lineTo(p.x - m * s * 0.05, boxY - s * 0.02);
      ctx.closePath();
      ctx.fill();
      // Side plank seam + the smith's strap.
      ctx.strokeStyle = 'rgba(50, 36, 18, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(p.x - m * s * 0.35, boxY + s * 0.09);
      ctx.lineTo(p.x + m * s * 0.37, boxY + s * 0.09);
      ctx.stroke();
      ctx.strokeStyle = TWN_IRON;
      ctx.lineWidth = Math.max(1.5, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(p.x + m * s * 0.02, boxY - s * 0.01);
      ctx.lineTo(p.x + m * s * 0.005, baseY - s * 0.245);
      ctx.stroke();
      // The hollow and the bright lip — the vessel law.
      ctx.fillStyle = '#2a2218';
      ctx.beginPath();
      ctx.ellipse(p.x + m * s * 0.01, boxY - s * 0.025, s * 0.38, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = TWN_OAK_LIT;
      ctx.lineWidth = Math.max(1.5, s * 0.022);
      ctx.beginPath();
      ctx.ellipse(p.x + m * s * 0.01, boxY - s * 0.028, s * 0.39, s * 0.084, 0, Math.PI * 0.92, Math.PI * 2.08);
      ctx.stroke();
      // THE DEALT LOAD, mounded over the hollow.
      if (load === 1) {
        ctx.fillStyle = '#4e3a2c';
        ctx.beginPath();
        ctx.ellipse(p.x + m * s * 0.01, boxY - s * 0.008, s * 0.28, s * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5f4a38';
        ctx.beginPath();
        ctx.ellipse(p.x - m * s * 0.05, boxY - s * 0.028, s * 0.17, s * 0.045, 0, 0, Math.PI * 2);
        ctx.fill();
        for (let k = 0; k < 3; k++) {
          const sd = (h >>> (k * 4 + 9)) & 7;
          ctx.fillStyle = k === 1 ? '#6f5a44' : '#443328';
          ctx.beginPath();
          ctx.arc(p.x + ((sd & 3) - 1.5) * s * 0.1, boxY - s * 0.03 - (sd >>> 2) * s * 0.008, s * 0.016, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (load === 2) {
        for (let k = 0; k < 4; k++) {
          const sd = (h >>> (k * 3 + 8)) & 7;
          const bx2 = p.x + (k - 1.5) * m * s * 0.13;
          const by2 = boxY - s * 0.01 - (k % 2) * s * 0.02;
          ctx.strokeStyle = k === 2 ? '#8a6534' : '#6f4d26';
          ctx.lineWidth = Math.max(2.5, s * 0.055);
          ctx.beginPath();
          ctx.moveTo(bx2 - s * 0.02, by2 + s * 0.01);
          ctx.lineTo(bx2 + s * 0.075, by2 - s * 0.016 - (sd & 1) * s * 0.008);
          ctx.stroke();
          ctx.fillStyle = '#d4b98a';
          ctx.beginPath();
          ctx.ellipse(bx2 - s * 0.022, by2 + s * 0.01, s * 0.02, s * 0.026, 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(90, 66, 32, 0.6)';
          ctx.lineWidth = Math.max(1, s * 0.008);
          ctx.beginPath();
          ctx.arc(bx2 - s * 0.022, by2 + s * 0.01, s * 0.01, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (load === 3) {
        for (const e of [-1, 0.6] as const) {
          ctx.fillStyle = e < 0 ? TWN_BURLAP : shade(TWN_BURLAP, -10);
          ctx.beginPath();
          ctx.ellipse(p.x + m * e * s * 0.14, boxY - s * 0.02, s * 0.13, s * 0.07, m * e * 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = TWN_ROPE;
          ctx.lineWidth = Math.max(1, s * 0.01);
          ctx.beginPath();
          ctx.moveTo(p.x + m * e * s * 0.14 - s * 0.02, boxY - s * 0.075);
          ctx.lineTo(p.x + m * e * s * 0.14 + s * 0.02, boxY - s * 0.082);
          ctx.stroke();
        }
        ctx.fillStyle = TWN_BURLAP_LIT;
        ctx.beginPath();
        ctx.ellipse(p.x - m * s * 0.16, boxY - s * 0.05, s * 0.05, s * 0.024, -m * 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Empty: the dried soil line the last load left.
        ctx.strokeStyle = 'rgba(94, 74, 56, 0.5)';
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.ellipse(p.x + m * s * 0.01, boxY + s * 0.02, s * 0.24, s * 0.05, 0, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      }
      // THE WHEEL, drawn LAST and standing proud of the box
      // — iron shoe, oak felloe, four spokes, hub boss.
      const wx2 = p.x + m * s * 0.46;
      const wR = s * 0.23;
      const wy2 = baseY - wR;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.16)';
      ctx.beginPath();
      ctx.ellipse(wx2, baseY, s * 0.1, s * 0.028, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = TWN_IRON;
      ctx.lineWidth = Math.max(2.5, s * 0.036);
      ctx.beginPath();
      ctx.ellipse(wx2, wy2, wR * 0.52, wR, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = TWN_OAK;
      ctx.lineWidth = Math.max(2, s * 0.028);
      ctx.beginPath();
      ctx.ellipse(wx2, wy2, wR * 0.42, wR * 0.84, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = TWN_OAK_DARK;
      ctx.lineWidth = Math.max(1.5, s * 0.02);
      for (const a of [0.3, 1.1, 1.9, 2.7]) {
        ctx.beginPath();
        ctx.moveTo(wx2, wy2);
        ctx.lineTo(wx2 + Math.cos(a) * wR * 0.4, wy2 + Math.sin(a) * wR * 0.8);
        ctx.stroke();
      }
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.beginPath();
      ctx.ellipse(wx2, wy2, s * 0.034, s * 0.042, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.beginPath();
      ctx.ellipse(wx2 - s * 0.008, wy2 - s * 0.009, s * 0.013, s * 0.016, 0, 0, Math.PI * 2);
      ctx.fill();
      // The iron shoe's ground glint.
      ctx.strokeStyle = 'rgba(210, 218, 226, 0.4)';
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.ellipse(wx2, wy2, wR * 0.52, wR, 0, Math.PI * 1.2, Math.PI * 1.75);
      ctx.stroke();
    },
  };
}

function paintWayfarersRest(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The RPG doorstep: somebody's whole road life dropped by
  // the wall — bedroll cinched twice, pack with one buckle
  // open, the walking staff leaned, the waterskin flopped
  // flat. Its owner is inside paying for ale, and every
  // player who sees it knows EXACTLY whose it is: theirs.
  const m = ((h >>> 3) & 1) ? 1 : -1;
  const cloth = AWNING_CLOTHS[(h >>> 6) % 10]!;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.56, 0.9, 0.4),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.4, s * 0.055),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // Road dust: the patch a dropped kit stamps.
      ctx.fillStyle = 'rgba(122, 100, 70, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY, s * 0.4, s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      // Pass two: the first paint MERGED into one lump. The
      // kit now keeps clear air between its four pieces —
      // pack UPRIGHT and proud, bedroll a clean cylinder
      // beside it, the staff STANDING against the pack, the
      // waterskin small and separate at the front.
      // THE PACK, upright: the tall silhouette that anchors.
      const px2 = p.x + m * s * 0.18;
      ctx.fillStyle = TWN_BURLAP;
      ctx.beginPath();
      ctx.moveTo(px2 - s * 0.15, baseY);
      ctx.lineTo(px2 - s * 0.145, baseY - s * 0.38);
      ctx.quadraticCurveTo(px2 - s * 0.13, baseY - s * 0.5, px2, baseY - s * 0.52);
      ctx.quadraticCurveTo(px2 + s * 0.13, baseY - s * 0.5, px2 + s * 0.145, baseY - s * 0.36);
      ctx.lineTo(px2 + s * 0.15, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TWN_BURLAP_LIT;
      ctx.beginPath();
      ctx.moveTo(px2 - s * 0.13, baseY - s * 0.01);
      ctx.lineTo(px2 - s * 0.125, baseY - s * 0.37);
      ctx.quadraticCurveTo(px2 - s * 0.11, baseY - s * 0.48, px2 - s * 0.02, baseY - s * 0.5);
      ctx.lineTo(px2 - s * 0.035, baseY - s * 0.01);
      ctx.closePath();
      ctx.fill();
      // THE FLAP over the top, its strap hanging OPEN —
      // the coin purse went inside with its owner.
      ctx.fillStyle = shade(TWN_BURLAP, -14);
      ctx.beginPath();
      ctx.moveTo(px2 - s * 0.15, baseY - s * 0.36);
      ctx.quadraticCurveTo(px2, baseY - s * 0.56, px2 + s * 0.15, baseY - s * 0.34);
      ctx.quadraticCurveTo(px2 + s * 0.1, baseY - s * 0.27, px2, baseY - s * 0.28);
      ctx.quadraticCurveTo(px2 - s * 0.1, baseY - s * 0.27, px2 - s * 0.15, baseY - s * 0.36);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(216, 196, 154, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(px2 - s * 0.13, baseY - s * 0.35);
      ctx.quadraticCurveTo(px2, baseY - s * 0.53, px2 + s * 0.13, baseY - s * 0.33);
      ctx.stroke();
      ctx.strokeStyle = TRD_LEATHER;
      ctx.lineWidth = Math.max(1.5, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(px2 + s * 0.015, baseY - s * 0.29);
      ctx.quadraticCurveTo(px2 + s * 0.05, baseY - s * 0.17, px2 + s * 0.035, baseY - s * 0.05);
      ctx.stroke();
      ctx.strokeStyle = TWN_BRONZE_LIT;
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.strokeRect(px2 + s * 0.02, baseY - s * 0.13, s * 0.03, s * 0.024);
      // The side pocket and the tin cup hooked to it.
      ctx.fillStyle = shade(TWN_BURLAP, -8);
      ctx.fillRect(px2 + m * s * 0.09, baseY - s * 0.24, m * s * 0.055, s * 0.15);
      ctx.strokeStyle = TRD_STEEL;
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.arc(px2 + m * s * 0.155, baseY - s * 0.14, s * 0.032, -0.6, 2.4);
      ctx.stroke();
      // THE BEDROLL beside it: clean cylinder, spiral end,
      // two straps biting, dealt blanket dye.
      const rx = p.x - m * s * 0.26;
      const ry2 = baseY - s * 0.085;
      ctx.fillStyle = cloth.a;
      ctx.beginPath();
      ctx.ellipse(rx, ry2, s * 0.22, s * 0.088, m * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(cloth.a, 16);
      ctx.beginPath();
      ctx.ellipse(rx - s * 0.015, ry2 - s * 0.03, s * 0.185, s * 0.045, m * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(cloth.a, -14);
      ctx.beginPath();
      ctx.ellipse(rx + m * s * 0.2, ry2, s * 0.042, s * 0.078, m * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shade(cloth.a, 24);
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.beginPath();
      ctx.arc(rx + m * s * 0.2, ry2, s * 0.05, 0.4, 4.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rx + m * s * 0.196, ry2 + s * 0.006, s * 0.024, 1.1, 5.8);
      ctx.stroke();
      ctx.strokeStyle = TRD_LEATHER;
      ctx.lineWidth = Math.max(1.5, s * 0.02);
      for (const e of [-0.08, 0.07]) {
        ctx.beginPath();
        ctx.ellipse(rx + m * e * s, ry2, s * 0.018, s * 0.085, m * 0.05, 0, Math.PI * 2);
        ctx.stroke();
      }
      // THE STAFF, standing into clear air against the
      // pack's shoulder — knob, thong, iron heel tick.
      ctx.strokeStyle = shade(TWN_OAK_LIT, -6);
      ctx.lineWidth = Math.max(2, s * 0.03);
      ctx.beginPath();
      ctx.moveTo(px2 + m * s * 0.24, baseY);
      ctx.lineTo(px2 + m * s * 0.02, baseY - s * 0.92);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(50, 36, 18, 0.4)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(px2 + m * s * 0.247, baseY - s * 0.02);
      ctx.lineTo(px2 + m * s * 0.028, baseY - s * 0.9);
      ctx.stroke();
      ctx.fillStyle = TWN_OAK;
      ctx.beginPath();
      ctx.arc(px2 + m * s * 0.02, baseY - s * 0.93, s * 0.03, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.beginPath();
      ctx.arc(px2 + m * s * 0.012, baseY - s * 0.94, s * 0.011, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = TRD_LEATHER;
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(px2 + m * s * 0.005, baseY - s * 0.89);
      ctx.quadraticCurveTo(px2 - m * s * 0.03, baseY - s * 0.83, px2 - m * s * 0.005, baseY - s * 0.78);
      ctx.stroke();
      // THE WATERSKIN at the front, plug bright, apart.
      const wx2 = p.x - m * s * 0.02;
      ctx.fillStyle = TRD_LEATHER;
      ctx.beginPath();
      ctx.moveTo(wx2 - s * 0.085, baseY - s * 0.005);
      ctx.quadraticCurveTo(wx2 - s * 0.105, baseY - s * 0.08, wx2 - s * 0.01, baseY - s * 0.088);
      ctx.quadraticCurveTo(wx2 + s * 0.09, baseY - s * 0.085, wx2 + s * 0.08, baseY - s * 0.025);
      ctx.quadraticCurveTo(wx2 + s * 0.06, baseY + s * 0.012, wx2 - s * 0.085, baseY - s * 0.005);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TRD_LEATHER_LIT;
      ctx.beginPath();
      ctx.ellipse(wx2 - s * 0.03, baseY - s * 0.06, s * 0.048, s * 0.02, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.beginPath();
      ctx.ellipse(wx2 + s * 0.088, baseY - s * 0.055, s * 0.015, s * 0.021, 0.5, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

function paintMooringPost(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The water edge's handshake: a tarred oak bollard
  // leaning a hair seaward from years of taking the strain,
  // bronze cap band, the lead COILED around the member (a
  // lead coils, NEVER loops — the gallows law), weed and
  // barnacle at the foot, wet dark to the waterline mark.
  const m = ((h >>> 3) & 1) ? 1 : -1;
  const postTop = baseY - s * 0.82;
  const lean = m * s * 0.07;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.45, 1.05, 0.35),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.2, s * 0.045),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // THE BOLLARD: stout, tarred, one pale arris where
      // the tar wore through, wet-dark to the tide mark.
      ctx.strokeStyle = CMN_TAR;
      ctx.lineWidth = Math.max(3.5, s * 0.105);
      ctx.beginPath();
      ctx.moveTo(p.x, baseY);
      ctx.lineTo(p.x + lean, postTop);
      ctx.stroke();
      ctx.strokeStyle = CMN_TAR_LIT;
      ctx.lineWidth = Math.max(1.5, s * 0.03);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.03, baseY - s * 0.02);
      ctx.lineTo(p.x + lean - s * 0.03, postTop + s * 0.03);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(20, 24, 30, 0.5)';
      ctx.lineWidth = Math.max(3.5, s * 0.107);
      ctx.beginPath();
      ctx.moveTo(p.x, baseY);
      ctx.lineTo(p.x + lean * 0.35, baseY - s * 0.26);
      ctx.stroke();
      // The waterline ring the tide keeps repainting.
      ctx.strokeStyle = 'rgba(159, 196, 216, 0.4)';
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(p.x + lean * 0.32 - s * 0.055, baseY - s * 0.26);
      ctx.lineTo(p.x + lean * 0.32 + s * 0.055, baseY - s * 0.27);
      ctx.stroke();
      // THE CAP: bronze band and the worn crown plane every
      // gull in the county has claimed once.
      ctx.fillStyle = TWN_BRONZE;
      ctx.fillRect(p.x + lean - s * 0.058, postTop + s * 0.035, s * 0.116, s * 0.045);
      ctx.fillStyle = TWN_BRONZE_LIT;
      ctx.fillRect(p.x + lean - s * 0.058, postTop + s * 0.035, s * 0.116, s * 0.014);
      ctx.fillStyle = TWN_VERDIGRIS;
      ctx.fillRect(p.x + lean - s * 0.058, postTop + s * 0.062, s * 0.036, s * 0.018);
      ctx.fillStyle = CMN_TAR_LIT;
      ctx.beginPath();
      ctx.ellipse(p.x + lean, postTop + s * 0.005, s * 0.054, s * 0.026, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(CMN_TAR_LIT, 14);
      ctx.beginPath();
      ctx.ellipse(p.x + lean - s * 0.012, postTop, s * 0.036, s * 0.017, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE LEAD: coiled around the member — four honest
      // wraps biting into each other, the working end
      // falling to a loose S on the ground, seaward.
      ctx.strokeStyle = TWN_ROPE;
      ctx.lineWidth = Math.max(1.5, s * 0.028);
      for (let k = 0; k < 4; k++) {
        const wy2 = baseY - s * (0.52 - k * 0.052);
        const wx3 = p.x + lean * ((0.52 - k * 0.05) / 0.82) * 0.8;
        ctx.beginPath();
        ctx.ellipse(wx3, wy2, s * 0.062, s * 0.025, -0.06 * m, Math.PI * 0.94, Math.PI * 2.09);
        ctx.stroke();
      }
      ctx.strokeStyle = shade(TWN_ROPE, -16);
      ctx.lineWidth = Math.max(1, s * 0.01);
      for (let k = 0; k < 3; k++) {
        const wy2 = baseY - s * (0.508 - k * 0.052);
        const wx3 = p.x + lean * ((0.508 - k * 0.05) / 0.82) * 0.8;
        ctx.beginPath();
        ctx.ellipse(wx3, wy2, s * 0.06, s * 0.023, -0.06 * m, Math.PI * 1.25, Math.PI * 1.8);
        ctx.stroke();
      }
      // The working end: down, then the tired S.
      ctx.strokeStyle = TWN_ROPE;
      ctx.lineWidth = Math.max(1.5, s * 0.024);
      ctx.beginPath();
      ctx.moveTo(p.x + m * s * 0.055, baseY - s * 0.35);
      ctx.quadraticCurveTo(p.x + m * s * 0.13, baseY - s * 0.16, p.x + m * s * 0.12, baseY - s * 0.02);
      ctx.quadraticCurveTo(p.x + m * s * 0.2, baseY + s * 0.028, p.x + m * s * 0.28, baseY - s * 0.005);
      ctx.stroke();
      ctx.strokeStyle = shade(TWN_ROPE, 12);
      ctx.lineWidth = Math.max(1, s * 0.009);
      ctx.beginPath();
      ctx.moveTo(p.x + m * s * 0.062, baseY - s * 0.34);
      ctx.quadraticCurveTo(p.x + m * s * 0.135, baseY - s * 0.16, p.x + m * s * 0.126, baseY - s * 0.03);
      ctx.stroke();
      // The frayed bitter end.
      ctx.strokeStyle = shade(TWN_ROPE, -10);
      ctx.lineWidth = Math.max(1, s * 0.008);
      for (const e of [-0.01, 0.008, 0.024]) {
        ctx.beginPath();
        ctx.moveTo(p.x + m * s * 0.28, baseY - s * 0.005);
        ctx.lineTo(p.x + m * s * (0.31 + e), baseY - s * 0.01 + e * s);
        ctx.stroke();
      }
      // THE FOOT: weed drape and barnacle crust, dealt.
      ctx.fillStyle = 'rgba(74, 94, 62, 0.75)';
      for (let k = 0; k < 3; k++) {
        const sd = (h >>> (k * 4 + 6)) & 7;
        const wx3 = p.x + ((sd & 3) - 1.5) * s * 0.045;
        ctx.beginPath();
        ctx.moveTo(wx3 - s * 0.018, baseY - s * 0.1 - (sd >>> 2) * s * 0.012);
        ctx.quadraticCurveTo(wx3 + s * 0.006, baseY - s * 0.04, wx3 - s * 0.006, baseY + s * 0.006);
        ctx.quadraticCurveTo(wx3 + s * 0.018, baseY - s * 0.05, wx3 + s * 0.02, baseY - s * 0.095 - (sd >>> 2) * s * 0.01);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#ded8ce';
      for (let k = 0; k < 3; k++) {
        const sd = (h >>> (k * 5 + 9)) & 15;
        ctx.beginPath();
        ctx.arc(p.x + ((sd & 7) - 3.5) * s * 0.022, baseY - s * 0.05 - ((sd >>> 3) & 1) * s * 0.05, s * 0.008, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
}

function paintBeachedSkiff(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The kit's anchor: a clinker skiff hauled out ON ITS
  // KEEL, listing a dealt hair — every strake LAPPED over
  // the one below (each board its own lit edge: that's what
  // clinker MEANS), the sheer strake wearing the owner's
  // dye, oars SHIPPED across the thwarts, the painter
  // coiled over the stem, and the keel's drag furrow still
  // kicked up behind the stern. Overdraws its tile the
  // lone-bed way; y-sort keeps the occlusion honest.
  const m = ((h >>> 3) & 1) ? 1 : -1;
  const cloth = AWNING_CLOTHS[(h >>> 6) % 10]!;
  const hullL = s * 0.66;
  const gunY = baseY - s * 0.4;
  const bowX = p.x + m * hullL;
  const stX = p.x - m * hullL;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.88, 1.1, 0.5),
    drawShadow: () => rend.castContact(p.x, baseY, hullL * 1.05, s * 0.075),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // THE DRAG FURROW first: two grooves and the kicked
      // ground behind the stern — she was HAULED, recently.
      ctx.strokeStyle = 'rgba(58, 46, 26, 0.28)';
      ctx.lineWidth = Math.max(2, s * 0.05);
      for (const e of [-0.045, 0.045]) {
        ctx.beginPath();
        ctx.moveTo(stX - m * s * 0.3, baseY + s * 0.055 + e * s * 0.5);
        ctx.quadraticCurveTo(stX - m * s * 0.1, baseY + s * 0.045 + e * s, stX + m * s * 0.1, baseY + s * 0.03 + e * s);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(122, 100, 70, 0.5)';
      for (let k = 0; k < 4; k++) {
        const sd = (h >>> (k * 3 + 8)) & 7;
        ctx.beginPath();
        ctx.ellipse(
          stX - m * s * (0.16 + (sd & 3) * 0.05),
          baseY + s * 0.05 + ((sd >>> 2) - 0.5) * s * 0.03,
          s * 0.02,
          s * 0.009,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(12, 8, 20, 0.2)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, hullL * 1.02, s * 0.075, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE HULL, stern to bow — pass two lifted the whole
      // boat out of the tar pit: warm oak strakes (tar only
      // in the garboard's shadow), a true SHEER curve (both
      // ends rise), and every lap edge bright enough to
      // count the boards from the saddle.
      const strakes = [
        { c: '#5f4c30', y0: 0.02, y1: 0.14 },
        { c: '#7d6840', y0: 0.14, y1: 0.26 },
        { c: '#967a48', y0: 0.26, y1: 0.36 },
        { c: cloth.a, y0: 0.36, y1: 0.44 },
      ];
      for (const st of strakes) {
        const yLo = baseY - s * st.y0;
        const yHi = baseY - s * st.y1;
        const rise = s * (0.06 + st.y1 * 0.22);
        ctx.fillStyle = st.c;
        ctx.beginPath();
        ctx.moveTo(stX, yHi - rise);
        ctx.quadraticCurveTo(p.x - m * hullL * 0.4, yHi + s * 0.016, p.x, yHi + s * 0.024);
        ctx.quadraticCurveTo(p.x + m * hullL * 0.5, yHi + s * 0.014, bowX, yHi - rise * 1.25);
        ctx.lineTo(bowX, yLo - rise * 1.1);
        ctx.quadraticCurveTo(p.x + m * hullL * 0.5, yLo + s * 0.024, p.x, yLo + s * 0.032);
        ctx.quadraticCurveTo(p.x - m * hullL * 0.4, yLo + s * 0.024, stX, yLo - rise * 0.85);
        ctx.closePath();
        ctx.fill();
        // The lap: each strake's lit lower edge over the
        // board below — the clinker signature, BOLD.
        ctx.strokeStyle = shade(st.c, 24);
        ctx.lineWidth = Math.max(1.5, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(stX + m * s * 0.02, yLo - rise * 0.8);
        ctx.quadraticCurveTo(p.x, yLo + s * 0.026, bowX - m * s * 0.02, yLo - rise * 1.02);
        ctx.stroke();
      }
      // The gunwale rail: the boat's one long bright line.
      ctx.strokeStyle = TWN_OAK_LIT;
      ctx.lineWidth = Math.max(1.5, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(stX, baseY - s * 0.44 - s * 0.14);
      ctx.quadraticCurveTo(p.x, baseY - s * 0.44 + s * 0.028, bowX, baseY - s * 0.44 - s * 0.17);
      ctx.stroke();
      // Plank nails ticking along the middle strake.
      ctx.fillStyle = 'rgba(40, 36, 30, 0.7)';
      for (let k = 0; k < 6; k++) {
        ctx.beginPath();
        ctx.arc(p.x + (k - 2.5) * m * hullL * 0.3, baseY - s * 0.2 + Math.abs(k - 2.5) * s * 0.008, s * 0.006, 0, Math.PI * 2);
        ctx.fill();
      }
      // THE INTERIOR over the near gunwale: bilge warm-dark
      // (planked, never a void), two thwarts with lit tops,
      // the shipped oars crossing.
      ctx.fillStyle = '#3a2e1e';
      ctx.beginPath();
      ctx.moveTo(stX + m * s * 0.055, gunY + s * 0.005);
      ctx.quadraticCurveTo(p.x, gunY - s * 0.075, bowX - m * s * 0.075, gunY - s * 0.005);
      ctx.quadraticCurveTo(p.x + m * hullL * 0.45, gunY + s * 0.035, p.x, gunY + s * 0.04);
      ctx.quadraticCurveTo(p.x - m * hullL * 0.4, gunY + s * 0.035, stX + m * s * 0.055, gunY + s * 0.005);
      ctx.closePath();
      ctx.fill();
      for (const e of [-0.42, 0.3]) {
        const tx2 = p.x + m * e * hullL;
        ctx.fillStyle = TWN_OAK;
        ctx.fillRect(tx2 - s * 0.032, gunY - s * 0.048, s * 0.064, s * 0.05);
        ctx.fillStyle = TWN_OAK_LIT;
        ctx.beginPath();
        ctx.ellipse(tx2, gunY - s * 0.048, s * 0.034, s * 0.014, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // THE OARS, shipped: looms crossing the thwarts,
      // blades resting over the stern quarter.
      for (const e of [0, 1] as const) {
        const oy = gunY - s * 0.035 - e * s * 0.028;
        ctx.strokeStyle = e ? shade(TWN_OAK_LIT, 6) : shade(TWN_OAK_LIT, 14);
        ctx.lineWidth = Math.max(2, s * 0.026);
        ctx.beginPath();
        ctx.moveTo(bowX - m * hullL * 0.42, oy - s * 0.02);
        ctx.lineTo(stX + m * hullL * 0.18 - m * e * s * 0.06, oy + s * 0.03);
        ctx.stroke();
        ctx.fillStyle = e ? shade(TWN_OAK, -6) : TWN_OAK;
        ctx.beginPath();
        ctx.ellipse(
          stX + m * hullL * 0.1 - m * e * s * 0.08,
          oy + s * 0.038,
          s * 0.085,
          s * 0.026,
          -m * 0.08,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      // THE STEM AND STERN POSTS: proud, capped.
      for (const [ex, hgt] of [[bowX, 0.68], [stX, 0.56]] as const) {
        const isBow = ex === bowX;
        ctx.strokeStyle = isBow ? '#6f5a38' : shade('#6f5a38', -8);
        ctx.lineWidth = Math.max(2, s * 0.04);
        ctx.beginPath();
        ctx.moveTo(ex, baseY - s * 0.06);
        ctx.quadraticCurveTo(
          ex + (isBow ? m : -m) * s * 0.03,
          baseY - s * hgt * 0.6,
          ex + (isBow ? m : -m) * s * 0.045,
          baseY - s * hgt,
        );
        ctx.stroke();
        ctx.fillStyle = TWN_OAK_LIT;
        ctx.beginPath();
        ctx.ellipse(ex + (isBow ? m : -m) * s * 0.045, baseY - s * hgt, s * 0.02, s * 0.012, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Two tholepins on the near gunwale.
      ctx.fillStyle = TWN_OAK_DARK;
      for (const e of [-0.36, 0.24]) {
        ctx.fillRect(p.x + m * e * hullL - s * 0.008, gunY - s * 0.005, s * 0.016, s * 0.045);
      }
      // THE PAINTER: coiled on the foredeck, tail to the
      // little ground stake — she's TIED, not forgotten.
      const cpx = bowX - m * s * 0.14;
      ctx.strokeStyle = TWN_ROPE;
      ctx.lineWidth = Math.max(1.5, s * 0.02);
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.ellipse(cpx, gunY - s * 0.035 - k * s * 0.012, s * 0.055 - k * s * 0.008, s * 0.024 - k * s * 0.004, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cpx + m * s * 0.05, gunY - s * 0.02);
      ctx.quadraticCurveTo(bowX + m * s * 0.1, baseY - s * 0.14, bowX + m * s * 0.16, baseY - s * 0.01);
      ctx.stroke();
      ctx.fillStyle = TWN_OAK_DARK;
      ctx.fillRect(bowX + m * s * 0.15 - s * 0.012, baseY - s * 0.06, s * 0.024, s * 0.06);
      // The tide's last lick: a wet sheen under the bow.
      ctx.fillStyle = 'rgba(159, 196, 216, 0.14)';
      ctx.beginPath();
      ctx.ellipse(bowX + m * s * 0.05, baseY + s * 0.04, s * 0.2, s * 0.035, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}


// ── THE WARREN AND THE LEGION (449-460) ─────────────────────
// The camps' second dressing wave: the goblin's day (sleep,
// drink, gamble, brag, beast-keeping) and the legion's order
// (signal, command). Same laws as the first shelf: raw hewn
// timber, rope lash, scrap iron; every flame already burns on
// shelf one, so this wave queues NO light. Clocked terms all
// sit under 4Hz for the ring cache.
function paintBoneMidden(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.3;
  const m = ((h >>> 4) & 1) ? 1 : -1;
  return {
    sortY: ty + 0.64,
    body: stationBody(0.7, 1.0, 0.5),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // The grease ring first: dinner has been thrown here for
      // a season — the ground remembers every meal.
      ctx.fillStyle = 'rgba(52, 40, 24, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, s * 0.5, s * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(18, 12, 26, 0.14)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, s * 0.4, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // The long-bone bed: cracked femurs thrown any way they
      // landed, every one with its knuckle ends — and half of
      // them SNAPPED for the marrow (a goblin wastes nothing).
      const bone = (ox: number, oy: number, rot: number, len: number, tone: number, snapped: boolean) => {
        ctx.save();
        ctx.translate(p.x + ox * s * m, baseY + oy * s);
        ctx.rotate(rot * m);
        ctx.fillStyle = shade(PALI_BONE, tone);
        if (snapped) {
          // Two halves, hinged apart at the break — jagged ends.
          ctx.fillRect(-len * s * 0.5, -s * 0.028, len * s * 0.34, s * 0.056);
          ctx.beginPath();
          ctx.moveTo(-len * s * 0.16, -s * 0.028);
          ctx.lineTo(-len * s * 0.09, 0);
          ctx.lineTo(-len * s * 0.16, s * 0.028);
          ctx.closePath();
          ctx.fill();
          ctx.save();
          ctx.translate(len * s * 0.08, s * 0.02);
          ctx.rotate(0.24);
          ctx.fillRect(-len * s * 0.16, -s * 0.028, len * s * 0.4, s * 0.056);
          ctx.fillRect(len * s * 0.24 - s * 0.02, -s * 0.042, s * 0.045, s * 0.084);
          ctx.restore();
        } else {
          ctx.fillRect(-len * s * 0.5, -s * 0.03, len * s, s * 0.06);
          ctx.fillRect(-len * s * 0.5 - s * 0.02, -s * 0.045, s * 0.045, s * 0.09);
          ctx.fillRect(len * s * 0.5 - s * 0.024, -s * 0.045, s * 0.045, s * 0.09);
        }
        ctx.restore();
      };
      bone(-0.26, 0.0, 0.35, 0.36, -16, false);
      bone(0.24, 0.03, -0.2, 0.32, -8, true);
      bone(-0.02, 0.06, 0.08, 0.4, -22, false);
      bone(0.1, -0.06, -0.5, 0.28, -12, true);
      // The burst rib cage crowns the heap: a spine ridge and
      // four sprung ribs still holding their curve — the one
      // shape that says CARCASS at any zoom.
      const rx = p.x - m * s * 0.06;
      const ry = baseY - s * 0.2;
      ctx.strokeStyle = shade(PALI_BONE, 4);
      ctx.lineWidth = Math.max(1.5, s * 0.035);
      for (let i = 0; i < 4; i++) {
        const rr = s * (0.3 - i * 0.052);
        ctx.beginPath();
        ctx.arc(rx + m * i * s * 0.085, ry + s * 0.02, rr, Math.PI * 1.05, Math.PI * 1.78);
        ctx.stroke();
      }
      ctx.fillStyle = shade(PALI_BONE, -6);
      ctx.beginPath();
      ctx.moveTo(rx - m * s * 0.3, ry + s * 0.06);
      ctx.quadraticCurveTo(rx, ry - s * 0.02, rx + m * s * 0.34, ry + s * 0.1);
      ctx.lineTo(rx + m * s * 0.34, ry + s * 0.15);
      ctx.quadraticCurveTo(rx, ry + s * 0.03, rx - m * s * 0.3, ry + s * 0.11);
      ctx.closePath();
      ctx.fill();
      // The prize haunch bone leans on the cage, bites
      // scalloped out of its shank — somebody was interrupted.
      ctx.save();
      ctx.translate(p.x + m * s * 0.24, baseY - s * 0.14);
      ctx.rotate(-0.7 * m);
      ctx.fillStyle = shade(PALI_BONE, 12);
      ctx.beginPath();
      ctx.moveTo(-s * 0.035, -s * 0.2);
      ctx.lineTo(s * 0.035, -s * 0.2);
      // The gnawed edge: three bite scallops down one side.
      ctx.lineTo(s * 0.03, -s * 0.08);
      ctx.arc(s * 0.014, -s * 0.05, s * 0.026, -Math.PI * 0.4, Math.PI * 0.5);
      ctx.arc(s * 0.012, s * 0.015, s * 0.024, -Math.PI * 0.45, Math.PI * 0.5);
      ctx.lineTo(s * 0.03, s * 0.1);
      ctx.lineTo(-s * 0.03, s * 0.1);
      ctx.closePath();
      ctx.fill();
      // The double knob head.
      ctx.beginPath();
      facetCircle(ctx, -s * 0.02, -s * 0.22, s * 0.038, 5, -0.3, 0.9);
      ctx.fill();
      ctx.beginPath();
      facetCircle(ctx, s * 0.025, -s * 0.225, s * 0.033, 5, 0.4, 0.9);
      ctx.fill();
      ctx.restore();
      // Teeth and chips around the foot.
      ctx.fillStyle = shade(PALI_BONE, 16);
      for (let i = 0; i < 5; i++) {
        const a = ((h >>> (i * 3)) & 7) / 7;
        ctx.fillRect(p.x + (a - 0.5) * s * 0.86, baseY + s * (0.03 + (i % 2) * 0.05), s * 0.028, s * 0.022);
      }
      // The flies: three specks on lazy crossing orbits, low
      // over the heap — dark motes, never leaving the mass's
      // silhouette (the ring bakes clean).
      ctx.fillStyle = 'rgba(24, 18, 16, 0.75)';
      for (let i = 0; i < 3; i++) {
        const fa = t * (1.1 + i * 0.35) + h * 0.3 + i * 2.1;
        ctx.fillRect(
          p.x + Math.sin(fa) * s * (0.14 + i * 0.05),
          baseY - s * 0.24 - Math.abs(Math.sin(fa * 0.7 + i)) * s * 0.12,
          s * 0.018,
          s * 0.018,
        );
      }
    },
  };
}

function paintTrophyStake(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.16;
  const m = ((h >>> 3) & 1) ? 1 : -1;
  const lean = m * 0.05;
  const topY = baseY - s * 1.46;
  const rag = CAMP_RAG[(h >>> 6) % 4]!;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.75, 2.0, 0.4),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - s * 0.06, baseY, p.x + s * 0.06, baseY, 1.4);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.015, s * 0.14, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      const tipX = p.x + lean * s;
      // The driven stake: squared, tapered, one lit facet —
      // the torch's timber without the fire.
      ctx.fillStyle = shade(PALI_LOG, -4);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.06, baseY);
      ctx.lineTo(p.x + s * 0.06, baseY);
      ctx.lineTo(tipX + s * 0.04, topY);
      ctx.lineTo(tipX - s * 0.04, topY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(PALI_LOG, 12);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.06, baseY);
      ctx.lineTo(p.x - s * 0.022, baseY);
      ctx.lineTo(tipX - s * 0.014, topY);
      ctx.lineTo(tipX - s * 0.04, topY);
      ctx.closePath();
      ctx.fill();
      // The crossbar, lashed at the meeting — the gallows-tree
      // shape every traveler reads at a hundred yards.
      const barY = topY + s * 0.34;
      ctx.fillStyle = shade(PALI_LOG, -10);
      ctx.save();
      ctx.translate(tipX, barY);
      ctx.rotate(-0.06 * m);
      ctx.fillRect(-s * 0.4, -s * 0.035, s * 0.8, s * 0.07);
      ctx.restore();
      ctx.fillStyle = PALI_ROPE;
      ctx.fillRect(tipX - s * 0.055, barY - s * 0.06, s * 0.11, s * 0.12);
      ctx.fillStyle = PALI_ROPE_DARK;
      ctx.fillRect(tipX - s * 0.055, barY - s * 0.012, s * 0.11, s * 0.024);
      // The torn tabard hangs from the bar's far arm — the
      // warren's rag deal, hem ripped to points.
      const tabX = tipX - m * s * 0.28;
      ctx.fillStyle = rag;
      ctx.beginPath();
      ctx.moveTo(tabX - s * 0.09, barY + s * 0.03);
      ctx.lineTo(tabX + s * 0.09, barY + s * 0.03);
      ctx.lineTo(tabX + s * 0.075, barY + s * 0.42);
      ctx.lineTo(tabX + s * 0.03, barY + s * 0.34);
      ctx.lineTo(tabX - s * 0.005, barY + s * 0.44);
      ctx.lineTo(tabX - s * 0.045, barY + s * 0.33);
      ctx.lineTo(tabX - s * 0.08, barY + s * 0.4);
      ctx.closePath();
      ctx.fill();
      // One shaded fold and the ghost of its owner's blazon.
      ctx.fillStyle = shade(rag, -12);
      ctx.fillRect(tabX - s * 0.014, barY + s * 0.03, s * 0.028, s * 0.34);
      ctx.fillStyle = shade(rag, 18);
      ctx.beginPath();
      facetCircle(ctx, tabX + s * 0.035, barY + s * 0.15, s * 0.035, 5, 0.2, 1);
      ctx.fill();
      // The cracked shield on the near arm: boss, rim rivets,
      // and one long split — hung by its own cut strap.
      const shX = tipX + m * s * 0.27;
      const shY = barY + s * 0.24;
      ctx.fillStyle = PALI_ROPE_DARK;
      ctx.fillRect(shX - s * 0.012, barY + s * 0.02, s * 0.024, s * 0.1);
      ctx.fillStyle = shade('#7d5a2e', -6);
      ctx.beginPath();
      facetCircle(ctx, shX, shY, s * 0.17, 8, 0.3 * m, 1);
      ctx.fill();
      ctx.fillStyle = shade('#7d5a2e', 10);
      ctx.beginPath();
      facetCircle(ctx, shX - s * 0.04 * m, shY - s * 0.04, s * 0.12, 8, 0.3 * m, 1);
      ctx.fill();
      ctx.fillStyle = '#8b93a4';
      ctx.beginPath();
      facetCircle(ctx, shX, shY, s * 0.05, 6, 0, 1);
      ctx.fill();
      // The split: a dark lightning line clean through.
      ctx.strokeStyle = 'rgba(30, 22, 16, 0.85)';
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(shX - s * 0.06 * m, shY - s * 0.16);
      ctx.lineTo(shX - s * 0.015 * m, shY - s * 0.04);
      ctx.lineTo(shX - s * 0.07 * m, shY + s * 0.02);
      ctx.lineTo(shX - s * 0.03 * m, shY + s * 0.15);
      ctx.stroke();
      // The dented pot-helm crowns the stake, knocked askew.
      const hx = tipX + s * 0.012;
      const hy = topY - s * 0.02;
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(0.14 * m);
      ctx.fillStyle = '#57535f';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.11, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade('#57535f', 14);
      ctx.beginPath();
      ctx.arc(-s * 0.025, -s * 0.012, s * 0.075, Math.PI * 1.1, Math.PI * 1.75);
      ctx.stroke();
      ctx.fillRect(-s * 0.11, 0, s * 0.22, s * 0.035);
      // The dent: one dark crease in the dome.
      ctx.fillStyle = 'rgba(28, 24, 34, 0.7)';
      ctx.beginPath();
      ctx.ellipse(s * 0.045 * m, -s * 0.055, s * 0.032, s * 0.018, 0.5 * m, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // A snapped blade lashed low on the shaft — point down,
      // the way a brag is nailed, with rust bleeding off it.
      ctx.save();
      ctx.translate(p.x - m * s * 0.02, baseY - s * 0.42);
      ctx.rotate(0.5 * m);
      ctx.fillStyle = '#8b93a4';
      ctx.beginPath();
      ctx.moveTo(-s * 0.026, -s * 0.16);
      ctx.lineTo(s * 0.026, -s * 0.16);
      ctx.lineTo(s * 0.018, s * 0.1);
      ctx.lineTo(0, s * 0.16);
      ctx.lineTo(-s * 0.018, s * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade('#8b93a4', -18);
      ctx.fillRect(-s * 0.006, -s * 0.16, s * 0.012, s * 0.26);
      ctx.restore();
      ctx.fillStyle = PALI_ROPE;
      ctx.fillRect(p.x - s * 0.065, baseY - s * 0.46, s * 0.13, s * 0.04);
      ctx.fillStyle = 'rgba(122, 62, 30, 0.35)';
      ctx.fillRect(p.x - m * s * 0.03 - s * 0.01, baseY - s * 0.3, s * 0.02, s * 0.16);
    },
  };
}

function paintGrogTub(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.32;
  const m = ((h >>> 5) & 1) ? 1 : -1;
  // Pass-two proportions: the first cut read as a STUMP — too
  // wide for its height, mouth staring at the sky. A tub is
  // TALLER than it is wide and the camera grazes its rim.
  const tw = s * 0.36;
  const topY = baseY - s * 0.8;
  const leak = ((h >>> 7) % 3) - 1;
  return {
    sortY: ty + 0.68,
    body: stationBody(0.8, 1.2, 0.5),
    drawShadow: () => rend.castContact(p.x, baseY, tw * 1.1, s * 0.07),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, tw * 1.06, s * 0.085, 0, 0, Math.PI * 2);
      ctx.fill();
      // The tub: seven staves with a true BARREL BELLY — the
      // sides bow out at the waist (a stump has straight
      // sides; the bulge is what says COOPERED at any zoom).
      // This cooper was a goblin with an axe and somebody's
      // barrel.
      const tones = [-16, 4, -8, 12, -2, 8, -12];
      const belly = s * 0.075;
      for (let i = 0; i < 7; i++) {
        const f0 = i / 7 - 0.5;
        const f1 = (i + 1) / 7 - 0.5;
        const bow0 = Math.cos(f0 * Math.PI) * belly;
        const bow1 = Math.cos(f1 * Math.PI) * belly;
        const x0 = p.x + f0 * tw * 2;
        const x1 = p.x + f1 * tw * 2;
        // Stave tops wander: an uneven crown, cut by eye.
        const dy = ((h >>> (i * 2)) & 3) * s * 0.018;
        const midY = (baseY + topY) * 0.5;
        ctx.fillStyle = shade('#5e4023', tones[i]!);
        ctx.beginPath();
        ctx.moveTo(x0, baseY + s * 0.02);
        ctx.quadraticCurveTo(x0 - bow0, midY, x0, topY + dy);
        ctx.lineTo(x1, topY + dy - s * 0.008);
        ctx.quadraticCurveTo(x1 - bow1, midY, x1, baseY + s * 0.02);
        ctx.closePath();
        ctx.fill();
      }
      // One lit stave edge sells the turn of the belly.
      ctx.strokeStyle = shade('#5e4023', 22);
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.moveTo(p.x - tw * 0.72, baseY - s * 0.02);
      ctx.quadraticCurveTo(p.x - tw * 0.72 - belly * 0.8, (baseY + topY) * 0.5, p.x - tw * 0.72, topY + s * 0.03);
      ctx.stroke();
      // Two scavenged hoops riding the bulge: the lower true,
      // the upper a BENT strap nailed on where it gave — the
      // mend is the story.
      ctx.fillStyle = CAMP_IRON;
      ctx.fillRect(p.x - tw - belly * 0.5 - s * 0.012, baseY - s * 0.18, (tw + belly * 0.5) * 2 + s * 0.024, s * 0.055);
      ctx.fillStyle = shade(CAMP_IRON, 16);
      ctx.fillRect(p.x - tw - belly * 0.5 - s * 0.012, baseY - s * 0.18, (tw + belly * 0.5) * 2 + s * 0.024, s * 0.016);
      ctx.save();
      ctx.translate(p.x, topY + s * 0.16);
      ctx.rotate(0.03 * m);
      ctx.fillStyle = CAMP_IRON;
      ctx.fillRect(-tw - belly * 0.7 - s * 0.012, -s * 0.026, (tw + belly * 0.7) * 2 + s * 0.024, s * 0.052);
      ctx.fillStyle = shade(CAMP_IRON, 20);
      for (const nx of [-0.72, -0.2, 0.35, 0.78]) {
        ctx.fillRect(nx * tw - s * 0.011, -s * 0.011, s * 0.022, s * 0.022);
      }
      ctx.restore();
      // The top plane: a tight foreshortened mouth (the tub is
      // TALL — the camera grazes the rim, never stares into
      // it), dark staved rim, then THE GROG: olive-bright,
      // scum crescent, bubbles — unmistakably liquid.
      ctx.fillStyle = shade('#5e4023', -10);
      ctx.beginPath();
      ctx.ellipse(p.x, topY, tw * 0.98, tw * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a7a30';
      ctx.beginPath();
      ctx.ellipse(p.x, topY + s * 0.012, tw * 0.82, tw * 0.23, 0, 0, Math.PI * 2);
      ctx.fill();
      // The swirl: a lighter olive sweep off the last stir.
      ctx.fillStyle = shade('#7a7a30', 16);
      ctx.beginPath();
      ctx.ellipse(p.x - m * tw * 0.22, topY + s * 0.012, tw * 0.38, tw * 0.1, 0.25 * m, 0, Math.PI * 2);
      ctx.fill();
      // Scum foam: a bold broken crescent hugging one side,
      // with two stray islands.
      ctx.strokeStyle = 'rgba(222, 212, 156, 0.85)';
      ctx.lineWidth = Math.max(1.5, s * 0.032);
      ctx.beginPath();
      ctx.ellipse(p.x, topY + s * 0.012, tw * 0.6, tw * 0.16, 0, Math.PI * (0.15 + 0.25 * m), Math.PI * (0.85 + 0.25 * m));
      ctx.stroke();
      ctx.fillStyle = 'rgba(222, 212, 156, 0.75)';
      ctx.beginPath();
      ctx.ellipse(p.x + m * tw * 0.3, topY + s * 0.005, s * 0.035, s * 0.014, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(p.x - m * tw * 0.42, topY + s * 0.024, s * 0.024, s * 0.01, 0, 0, Math.PI * 2);
      ctx.fill();
      // The ladle: gourd bowl floating ON the grog, handle
      // leaned out over the rim — mid-pour, never left.
      const lx = p.x + m * tw * 0.5;
      ctx.strokeStyle = shade(PALI_LOG, 10);
      ctx.lineWidth = Math.max(2, s * 0.04);
      ctx.beginPath();
      ctx.moveTo(lx, topY + s * 0.01);
      ctx.lineTo(lx + m * s * 0.2, topY - s * 0.34);
      ctx.stroke();
      ctx.fillStyle = shade(PALI_LOG, -6);
      ctx.beginPath();
      facetCircle(ctx, lx - m * s * 0.04, topY + s * 0.025, s * 0.075, 6, 0.3, 0.5);
      ctx.fill();
      ctx.fillStyle = shade(PALI_LOG, 12);
      ctx.beginPath();
      ctx.ellipse(lx - m * s * 0.04, topY + s * 0.015, s * 0.05, s * 0.018, 0, 0, Math.PI * 2);
      ctx.fill();
      // The leak: one stave weeps — a dark streak, a hanging
      // bead on the slow clock, and the puddle it has earned.
      const wx = p.x + leak * tw * 0.5;
      ctx.fillStyle = 'rgba(60, 48, 20, 0.5)';
      ctx.fillRect(wx - s * 0.014, baseY - s * 0.34, s * 0.028, s * 0.34);
      const ph = (t * 0.6 + h * 0.13) % 1;
      ctx.fillStyle = 'rgba(150, 136, 66, 0.8)';
      ctx.fillRect(wx - s * 0.011, baseY - s * 0.34 + ph * s * 0.32, s * 0.022, s * 0.035);
      ctx.fillStyle = 'rgba(109, 100, 40, 0.4)';
      ctx.beginPath();
      ctx.ellipse(wx, baseY + s * 0.045, s * 0.11, s * 0.032, 0, 0, Math.PI * 2);
      ctx.fill();
      // Two dented tin cups at the foot — one tipped: the
      // drinker left mid-swallow, or under it.
      ctx.fillStyle = '#8b93a4';
      ctx.fillRect(p.x - m * tw * 0.9 - s * 0.045, baseY - s * 0.09, s * 0.09, s * 0.09);
      ctx.fillStyle = shade('#8b93a4', -16);
      ctx.fillRect(p.x - m * tw * 0.9 - s * 0.045, baseY - s * 0.09, s * 0.09, s * 0.022);
      ctx.save();
      ctx.translate(p.x - m * tw * 0.62, baseY + s * 0.015);
      ctx.rotate(1.32 * m);
      ctx.fillStyle = shade('#8b93a4', -8);
      ctx.fillRect(-s * 0.042, -s * 0.042, s * 0.084, s * 0.084);
      ctx.restore();
    },
  };
}

function paintKnucklePit(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.3;
  const m = ((h >>> 2) & 1) ? 1 : -1;
  return {
    sortY: ty + 0.6,
    body: stationBody(0.75, 0.9, 0.5),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.14)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY, s * 0.5, s * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      // The board: somebody's DOOR, laid flat — plank seams,
      // a torn hinge still nailed to one edge, top plane
      // foreshortened per the camera.
      const bw = s * 0.46;
      const bd = syT * 0.5;
      const by = baseY - s * 0.09;
      ctx.fillStyle = shade('#8a6534', -4);
      ctx.beginPath();
      ctx.moveTo(p.x - bw, by + bd * 0.4);
      ctx.lineTo(p.x - bw * 0.86, by - bd * 0.42);
      ctx.lineTo(p.x + bw * 0.94, by - bd * 0.4);
      ctx.lineTo(p.x + bw, by + bd * 0.44);
      ctx.closePath();
      ctx.fill();
      // The front edge: the board's thickness, lit.
      ctx.fillStyle = shade('#8a6534', -20);
      ctx.beginPath();
      ctx.moveTo(p.x - bw, by + bd * 0.4);
      ctx.lineTo(p.x + bw, by + bd * 0.44);
      ctx.lineTo(p.x + bw, by + bd * 0.44 + s * 0.07);
      ctx.lineTo(p.x - bw, by + bd * 0.4 + s * 0.07);
      ctx.closePath();
      ctx.fill();
      // Plank seams, running with the perspective.
      ctx.strokeStyle = 'rgba(58, 40, 20, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.014);
      for (const f of [-0.33, 0.05, 0.44]) {
        ctx.beginPath();
        ctx.moveTo(p.x - bw + (f + 0.5) * bw * 0.3, by + bd * 0.4);
        ctx.lineTo(p.x - bw * 0.86 + (f + 0.52) * bw * 1.78, by - bd * 0.41);
        ctx.stroke();
      }
      // The torn hinge: a rusted strap on the near edge.
      ctx.fillStyle = shade(CAMP_IRON, -4);
      ctx.fillRect(p.x - m * bw * 0.7 - s * 0.07, by + bd * 0.4 - s * 0.012, s * 0.14, s * 0.05);
      ctx.fillStyle = 'rgba(122, 62, 30, 0.5)';
      ctx.fillRect(p.x - m * bw * 0.7 - s * 0.05, by + bd * 0.4 + s * 0.03, s * 0.1, s * 0.03);
      // The scratched ring: the game's circle, scored and
      // re-scored so many nights it's worn INTO the wood. Pass two:
      // BOLD — at street zoom the ring is the game's whole
      // advertisement.
      ctx.strokeStyle = 'rgba(232, 224, 202, 0.85)';
      ctx.lineWidth = Math.max(1.5, s * 0.028);
      ctx.beginPath();
      ctx.ellipse(p.x + m * s * 0.04, by + s * 0.01, s * 0.25, s * 0.105, 0, 0.3, Math.PI * 2 + 0.1);
      ctx.stroke();
      // The knucklebones mid-throw: five bone dice inside and
      // one BOUNCED OUT — the throw is still being argued.
      // Pass two sized them up: a die the eye can't find is
      // a game the street can't read.
      const die = (ox: number, oy: number, rot: number, tone: number) => {
        ctx.save();
        ctx.translate(p.x + ox * s, by + oy * s);
        ctx.rotate(rot);
        ctx.fillStyle = shade(PALI_BONE, tone + 8);
        ctx.fillRect(-s * 0.044, -s * 0.044, s * 0.088, s * 0.088);
        ctx.fillStyle = shade(PALI_BONE, tone - 22);
        ctx.fillRect(-s * 0.044, s * 0.022, s * 0.088, s * 0.022);
        ctx.fillStyle = '#241a2e';
        ctx.fillRect(-s * 0.011, -s * 0.026, s * 0.022, s * 0.022);
        if (rot > 0) {
          ctx.fillRect(-s * 0.032, -s * 0.002, s * 0.018, s * 0.018);
          ctx.fillRect(s * 0.014, -s * 0.002, s * 0.018, s * 0.018);
        }
        ctx.restore();
      };
      die(m * -0.11, -0.02, 0.3, 14);
      die(m * 0.03, 0.055, -0.2, 6);
      die(m * 0.16, -0.05, 0.7, 18);
      die(m * 0.07, -0.11, 0, 10);
      die(m * -0.03, -0.065, 0.5, 2);
      die(m * 0.6, 0.15, 0.9, 8);
      // The pot: a heap of coppers claimed by a DAGGER stood
      // through the board — the only rule a goblin respects.
      // The coins burn bright (a pot nobody covets is set
      // dressing, not a stake).
      const px2 = p.x - m * s * 0.28;
      const py2 = by - s * 0.03;
      for (let i = 0; i < 8; i++) {
        const ca = ((h >>> (i * 2 + 3)) & 3) / 3;
        ctx.fillStyle = shade('#c9803a', ((i * 7) % 3) * 8 - 4);
        ctx.beginPath();
        ctx.ellipse(px2 + (ca - 0.5) * s * 0.16, py2 + (i % 3) * s * 0.024 - s * 0.024, s * 0.042, s * 0.019, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = shade('#c9803a', 30);
      ctx.beginPath();
      ctx.ellipse(px2 + s * 0.02, py2 - s * 0.042, s * 0.042, s * 0.019, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d4d8e0';
      ctx.beginPath();
      ctx.ellipse(px2 - s * 0.055, py2 - s * 0.032, s * 0.04, s * 0.018, 0, 0, Math.PI * 2);
      ctx.fill();
      // The claiming dagger: blade in the wood, grip up —
      // pass-two size, with a lit edge so the iron reads.
      ctx.fillStyle = '#8b93a4';
      ctx.beginPath();
      ctx.moveTo(px2 - s * 0.02, py2 - s * 0.05);
      ctx.lineTo(px2 + s * 0.02, py2 - s * 0.05);
      ctx.lineTo(px2 + s * 0.007, py2 - s * 0.26);
      ctx.lineTo(px2 - s * 0.007, py2 - s * 0.26);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#aeb6c6';
      ctx.fillRect(px2 - s * 0.007, py2 - s * 0.26, s * 0.007, s * 0.21);
      ctx.fillStyle = CAMP_IRON;
      ctx.fillRect(px2 - s * 0.06, py2 - s * 0.28, s * 0.12, s * 0.028);
      ctx.fillStyle = shade(PALI_LOG, 20);
      ctx.fillRect(px2 - s * 0.02, py2 - s * 0.37, s * 0.04, s * 0.09);
      ctx.fillStyle = CAMP_BRONZE;
      ctx.beginPath();
      facetCircle(ctx, px2, py2 - s * 0.385, s * 0.024, 5, 0, 1);
      ctx.fill();
      // Two seat stones, butt-polished on top.
      for (const [ox, r] of [
        [-0.62, 0.13],
        [0.66, 0.145],
      ] as const) {
        ctx.fillStyle = '#6e6879';
        ctx.beginPath();
        facetCircle(ctx, p.x + ox * s * m, baseY - s * 0.03, r * s, 6, ox, 0.6);
        ctx.fill();
        ctx.fillStyle = shade('#6e6879', 12);
        ctx.beginPath();
        ctx.ellipse(p.x + ox * s * m, baseY - s * 0.03 - r * s * 0.32, r * s * 0.6, r * s * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
}

function paintRagNest(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.32;
  const m = ((h >>> 6) & 1) ? 1 : -1;
  const deal = (h >>> 8) % 4;
  return {
    sortY: ty + 0.6,
    body: stationBody(0.8, 0.9, 0.55),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // The trampled hollow: a goblin sleeps in a SCRAPE, like
      // its beast — packed rim lit, bowl in shadow.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, s * 0.52, s * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade('#6e5a44', -14);
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.04, s * 0.5, s * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade('#6e5a44', 4);
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.075, s * 0.44, s * 0.115, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      // The rag bed: three stolen cloths in the warren's deal,
      // each a jagged-edged layer thrown over the last —
      // ragged POINTS, never straight hems.
      const rags = [CAMP_RAG[deal]!, CAMP_RAG[(deal + 1) % 4]!, CAMP_RAG[(deal + 2) % 4]!];
      const layer = (cx: number, cy: number, rw: number, rh: number, col: string, seed: number) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        const pts = 9;
        for (let i = 0; i <= pts; i++) {
          const a = (i / pts) * Math.PI * 2;
          const jag = 1 + (((seed >>> (i * 2)) & 3) - 1.5) * 0.14;
          const x2 = cx + Math.cos(a) * rw * jag;
          const y2 = cy + Math.sin(a) * rh * jag;
          if (i === 0) ctx.moveTo(x2, y2);
          else ctx.lineTo(x2, y2);
        }
        ctx.closePath();
        ctx.fill();
      };
      // Pass two: the first cut sank into a dirt underlay —
      // same browns, no rim. The bed now KEEPS ITS EDGE (a
      // dark outline seat under the cloth) and the top layers
      // run BRIGHT, so bedding separates from any ground the
      // camp tramples it into.
      ctx.strokeStyle = 'rgba(30, 22, 16, 0.55)';
      ctx.lineWidth = Math.max(1.5, s * 0.03);
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.08, s * 0.4, s * 0.12, 0, 0, Math.PI * 2);
      ctx.stroke();
      layer(p.x - m * s * 0.06, baseY - s * 0.07, s * 0.36, s * 0.1, shade(rags[0]!, -10), h);
      layer(p.x + m * s * 0.05, baseY - s * 0.1, s * 0.3, s * 0.085, shade(rags[1]!, 6), h >>> 3);
      layer(p.x - m * s * 0.03, baseY - s * 0.13, s * 0.23, s * 0.07, shade(rags[2]!, 16), h >>> 6);
      // The quilt corner: ONE piece of real bedding in the
      // heap — TWO patch squares, stitch ticks — stolen off a
      // farmhouse line and prized above everything. The bright
      // note that says BED, not litter.
      const qx = p.x + m * s * 0.18;
      const qy = baseY - s * 0.16;
      ctx.fillStyle = shade(rags[0]!, 30);
      ctx.beginPath();
      ctx.moveTo(qx - s * 0.16, qy + s * 0.06);
      ctx.lineTo(qx + s * 0.11, qy - s * 0.03);
      ctx.lineTo(qx + s * 0.19, qy + s * 0.075);
      ctx.lineTo(qx - s * 0.06, qy + s * 0.155);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(rags[1]!, 34);
      ctx.fillRect(qx - s * 0.03, qy + s * 0.012, s * 0.085, s * 0.058);
      ctx.fillStyle = shade(rags[2]!, 28);
      ctx.fillRect(qx + s * 0.075, qy + s * 0.05, s * 0.06, s * 0.045);
      ctx.strokeStyle = 'rgba(238, 232, 216, 0.8)';
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.setLineDash([s * 0.022, s * 0.022]);
      ctx.beginPath();
      ctx.moveTo(qx - s * 0.13, qy + s * 0.068);
      ctx.lineTo(qx + s * 0.13, qy - s * 0.008);
      ctx.stroke();
      ctx.setLineDash([]);
      // The pillow: a plunder sack, cinched, head-dented —
      // plumped up a size so the head-end reads at once.
      const sx2 = p.x - m * s * 0.3;
      const sy2 = baseY - s * 0.19;
      ctx.fillStyle = shade('#9c8a62', 10);
      ctx.beginPath();
      facetCircle(ctx, sx2, sy2, s * 0.17, 7, -0.3 * m, 0.66);
      ctx.fill();
      ctx.fillStyle = shade('#9c8a62', -12);
      ctx.beginPath();
      ctx.ellipse(sx2 + m * s * 0.035, sy2 + s * 0.015, s * 0.085, s * 0.036, 0.3 * m, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade('#9c8a62', 26);
      ctx.beginPath();
      ctx.ellipse(sx2 - m * s * 0.05, sy2 - s * 0.07, s * 0.07, s * 0.03, -0.2 * m, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALI_ROPE_DARK;
      ctx.fillRect(sx2 - m * s * 0.16 - s * 0.02, sy2 - s * 0.05, s * 0.04, s * 0.055);
      // Bedside crumbs: one gnawed bone within arm's reach —
      // breakfast in bed, warren style.
      ctx.save();
      ctx.translate(p.x + m * s * 0.42, baseY + s * 0.02);
      ctx.rotate(0.4 * m);
      ctx.fillStyle = shade(PALI_BONE, -8);
      ctx.fillRect(-s * 0.09, -s * 0.022, s * 0.18, s * 0.044);
      ctx.fillRect(s * 0.07, -s * 0.036, s * 0.036, s * 0.072);
      ctx.restore();
    },
  };
}

function paintBeastStake(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.3;
  const m = ((h >>> 4) & 1) ? 1 : -1;
  return {
    sortY: ty + 0.62,
    body: stationBody(0.75, 1.1, 0.5),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // The pace-ring first: a beast on a chain walks ONE
      // circle ten thousand times — the ground confesses it.
      ctx.strokeStyle = 'rgba(74, 58, 34, 0.4)';
      ctx.lineWidth = Math.max(2.5, s * 0.08);
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.02, s * 0.44, s * 0.13, 0, 0.2, Math.PI * 2 - 0.4);
      ctx.stroke();
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.015, s * 0.1, s * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
      // The stake: forged iron, driven at the angle the last
      // lunge left it, an eye-ring at the head.
      const topX = p.x + m * s * 0.08;
      const topY = baseY - s * 0.52;
      ctx.fillStyle = CAMP_IRON;
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.045, baseY);
      ctx.lineTo(p.x + s * 0.045, baseY);
      ctx.lineTo(topX + s * 0.028, topY);
      ctx.lineTo(topX - s * 0.028, topY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(CAMP_IRON, 14);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.045, baseY);
      ctx.lineTo(p.x - s * 0.02, baseY);
      ctx.lineTo(topX - s * 0.01, topY);
      ctx.lineTo(topX - s * 0.028, topY);
      ctx.closePath();
      ctx.fill();
      // Hammer-burr at the head: the stake has been re-driven
      // after every escape attempt.
      ctx.fillStyle = shade(CAMP_IRON, -10);
      ctx.fillRect(topX - s * 0.045, topY - s * 0.028, s * 0.09, s * 0.036);
      ctx.strokeStyle = shade(CAMP_IRON, 18);
      ctx.lineWidth = Math.max(1.5, s * 0.03);
      ctx.beginPath();
      ctx.arc(topX, topY - s * 0.075, s * 0.05, 0, Math.PI * 2);
      ctx.stroke();
      // The chain: caught on the ring, swagging to the ground,
      // then COILED where the beast dragged it round — every
      // link its own iron.
      const link = (lx: number, ly: number, rot: number) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.strokeStyle = shade(CAMP_IRON, 6);
        ctx.lineWidth = Math.max(1.2, s * 0.022);
        ctx.strokeRect(-s * 0.026, -s * 0.017, s * 0.052, s * 0.034);
        ctx.restore();
      };
      // The hanging swag off the ring.
      const gx = topX + m * s * 0.05;
      for (let i = 0; i < 5; i++) {
        const f2 = i / 4;
        link(
          gx + m * f2 * s * 0.16,
          topY - s * 0.06 + f2 * s * 0.44 + Math.sin(f2 * Math.PI) * s * 0.05,
          0.5 * m + f2 * 0.8 * m,
        );
      }
      // The ground coil: two lapped loops.
      const cx2 = p.x + m * s * 0.34;
      const cy2 = baseY + s * 0.015;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        link(cx2 + Math.cos(a) * s * 0.13, cy2 + Math.sin(a) * s * 0.045, a + Math.PI / 2);
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.4;
        link(cx2 - m * s * 0.05 + Math.cos(a) * s * 0.08, cy2 - s * 0.03 + Math.sin(a) * s * 0.03, a + Math.PI / 2);
      }
      // The collar: open on the ground, spiked, hasp thrown —
      // an empty collar is a LOOSE BEAST, and the camp knows.
      const kx = cx2 + m * s * 0.16;
      const ky = cy2 + s * 0.02;
      ctx.strokeStyle = '#57535f';
      ctx.lineWidth = Math.max(2, s * 0.045);
      ctx.beginPath();
      ctx.ellipse(kx, ky, s * 0.11, s * 0.055, 0.2 * m, Math.PI * 0.2, Math.PI * 1.75);
      ctx.stroke();
      ctx.fillStyle = shade('#57535f', 10);
      for (let i = 0; i < 4; i++) {
        const a = Math.PI * 0.3 + (i / 3) * Math.PI * 1.2;
        const vx = kx + Math.cos(a) * s * 0.11;
        const vy = ky + Math.sin(a) * s * 0.055;
        ctx.beginPath();
        ctx.moveTo(vx - s * 0.014, vy);
        ctx.lineTo(vx + Math.cos(a) * s * 0.045, vy + Math.sin(a) * s * 0.045);
        ctx.lineTo(vx + s * 0.014, vy);
        ctx.closePath();
        ctx.fill();
      }
      // What the beast left: two stripped bones and the claw
      // rakes where it strained against the iron.
      ctx.fillStyle = shade(PALI_BONE, -10);
      ctx.save();
      ctx.translate(p.x - m * s * 0.32, baseY + s * 0.04);
      ctx.rotate(-0.3 * m);
      ctx.fillRect(-s * 0.08, -s * 0.02, s * 0.16, s * 0.04);
      ctx.fillRect(s * 0.06, -s * 0.032, s * 0.032, s * 0.064);
      ctx.restore();
      ctx.strokeStyle = 'rgba(74, 58, 34, 0.55)';
      ctx.lineWidth = Math.max(1, s * 0.018);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(p.x - m * s * (0.12 + i * 0.05), baseY - s * 0.1);
        ctx.lineTo(p.x - m * s * (0.2 + i * 0.05), baseY + s * 0.02);
        ctx.stroke();
      }
    },
  };
}

function paintCritterCage(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.3;
  const m = ((h >>> 3) & 1) ? 1 : -1;
  const swap = ((h >>> 9) & 1) === 1;
  return {
    sortY: ty + 0.66,
    body: stationBody(0.6, 1.4, 0.45),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, s * 0.32, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      // Two lashed withy cages, stacked CROOKED — the larder
      // and the alarm in one: nothing sneaks past a penned
      // bird. Frame sticks, vertical withies, bone latch pegs.
      const cage = (cx: number, cy: number, cw: number, chh: number, tilt: number, dark: boolean) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tilt);
        // The dark inside first — the withies read against it.
        ctx.fillStyle = dark ? '#241c22' : '#2c2426';
        ctx.fillRect(-cw, -chh, cw * 2, chh * 2);
        // Frame: corner sticks and rails.
        ctx.fillStyle = shade('#8a713f', -8);
        ctx.fillRect(-cw - s * 0.02, -chh - s * 0.02, cw * 2 + s * 0.04, s * 0.04);
        ctx.fillRect(-cw - s * 0.02, chh - s * 0.02, cw * 2 + s * 0.04, s * 0.045);
        ctx.fillStyle = shade('#8a713f', 4);
        ctx.fillRect(-cw - s * 0.02, -chh, s * 0.04, chh * 2);
        ctx.fillRect(cw - s * 0.02, -chh, s * 0.04, chh * 2);
        // The withies: sprung verticals, no two straight.
        ctx.strokeStyle = '#a88f5c';
        ctx.lineWidth = Math.max(1, s * 0.02);
        for (let i = 1; i < 5; i++) {
          const wx = -cw + (i / 5) * cw * 2;
          const bow = (((h >>> (i * 3)) & 3) - 1.5) * s * 0.014;
          ctx.beginPath();
          ctx.moveTo(wx, -chh);
          ctx.quadraticCurveTo(wx + bow, 0, wx, chh);
          ctx.stroke();
        }
        // Bone latch peg on the lit rail.
        ctx.fillStyle = shade(PALI_BONE, 8);
        ctx.fillRect(cw - s * 0.045, -s * 0.02, s * 0.07, s * 0.032);
        ctx.restore();
      };
      const lowY = baseY - s * 0.2;
      const upY = baseY - s * 0.58;
      cage(p.x, lowY, s * 0.26, s * 0.18, 0, true);
      cage(p.x + m * s * 0.05, upY, s * 0.22, s * 0.16, 0.09 * m, false);
      // The lash holding the stack — one honest rope X.
      ctx.strokeStyle = PALI_ROPE;
      ctx.lineWidth = Math.max(1.5, s * 0.026);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.2, upY + s * 0.18);
      ctx.lineTo(p.x + s * 0.24, upY + s * 0.3);
      ctx.moveTo(p.x + s * 0.22, upY + s * 0.18);
      ctx.lineTo(p.x - s * 0.2, upY + s * 0.32);
      ctx.stroke();
      // THE TENANTS. Lower cage: two ember eyes in the dark,
      // blinking on the slow clock. Upper: a rattled bird —
      // a feathered wedge that jumps between two perches.
      const blink = ((t * 0.5 + h * 0.17) % 1) > 0.12;
      const eyeCy = swap ? upY : lowY;
      const birdCy = swap ? lowY : upY;
      if (blink) {
        ctx.fillStyle = '#e8a13c';
        ctx.fillRect(p.x - s * 0.06, eyeCy - s * 0.01, s * 0.026, s * 0.026);
        ctx.fillRect(p.x + s * 0.015, eyeCy - s * 0.008, s * 0.026, s * 0.026);
      }
      const hop = ((t * 0.9 + h * 0.07) % 1) > 0.5 ? 1 : -1;
      const bx = p.x + hop * m * s * 0.06;
      ctx.fillStyle = '#57626e';
      ctx.beginPath();
      ctx.moveTo(bx - s * 0.07, birdCy + s * 0.03);
      ctx.quadraticCurveTo(bx - s * 0.02, birdCy - s * 0.05, bx + s * 0.05, birdCy - s * 0.015);
      ctx.lineTo(bx + s * 0.1, birdCy + s * 0.01);
      ctx.lineTo(bx + s * 0.05, birdCy + s * 0.025);
      ctx.quadraticCurveTo(bx - s * 0.02, birdCy + s * 0.055, bx - s * 0.07, birdCy + s * 0.03);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c9803a';
      ctx.beginPath();
      ctx.moveTo(bx + s * 0.1, birdCy + s * 0.002);
      ctx.lineTo(bx + s * 0.14, birdCy + s * 0.012);
      ctx.lineTo(bx + s * 0.1, birdCy + s * 0.02);
      ctx.closePath();
      ctx.fill();
      // Shed feathers drift at the foot — the only soft thing
      // in the camp.
      ctx.fillStyle = 'rgba(120, 130, 140, 0.8)';
      for (let i = 0; i < 3; i++) {
        const fx2 = p.x + (((h >>> (i * 4)) & 7) / 7 - 0.5) * s * 0.5;
        ctx.save();
        ctx.translate(fx2, baseY + s * (0.02 + (i % 2) * 0.03));
        ctx.rotate(((h >>> (i * 2)) & 3) * 0.5);
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.045, s * 0.014, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    },
  };
}

function paintAlarmGong(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.16;
  const m = ((h >>> 5) & 1) ? 1 : -1;
  const beamY = baseY - s * 1.28;
  const sway = Math.sin(t * 1.3 + h * 0.4) * 0.05;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.85, 1.9, 0.45),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - s * 0.4, baseY, p.x + s * 0.4, baseY, 1.25);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, s * 0.42, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      // The frame: two driven posts and a beam — LEGION work,
      // square and true, nothing the warren would build.
      for (const px3 of [-0.36, 0.36]) {
        ctx.fillStyle = shade(PALI_LOG, px3 < 0 ? 8 : -6);
        ctx.fillRect(p.x + px3 * s - s * 0.045, beamY, s * 0.09, baseY - beamY);
      }
      ctx.fillStyle = shade(PALI_LOG, -12);
      ctx.fillRect(p.x - s * 0.46, beamY - s * 0.07, s * 0.92, s * 0.09);
      ctx.fillStyle = shade(PALI_LOG, 4);
      ctx.fillRect(p.x - s * 0.46, beamY - s * 0.07, s * 0.92, s * 0.026);
      // Rope lashings square each joint.
      ctx.fillStyle = PALI_ROPE;
      for (const px3 of [-0.36, 0.36]) {
        ctx.fillRect(p.x + px3 * s - s * 0.06, beamY - s * 0.02, s * 0.12, s * 0.07);
      }
      // The gong: scrap bronze beaten round, hung on two hide
      // cords — hammered facet rings, an off-center boss, the
      // patina of a hundred rains, and two mallet-dents.
      const gy = beamY + s * 0.52;
      const gr = s * 0.34;
      ctx.strokeStyle = '#6e5a3a';
      ctx.lineWidth = Math.max(1.5, s * 0.024);
      for (const cx3 of [-0.16, 0.16]) {
        ctx.beginPath();
        ctx.moveTo(p.x + cx3 * s * 1.4, beamY + s * 0.02);
        ctx.lineTo(p.x + cx3 * s + sway * s, gy - gr * 0.86);
        ctx.stroke();
      }
      const gx2 = p.x + sway * s;
      ctx.fillStyle = CAMP_BRONZE;
      ctx.beginPath();
      facetCircle(ctx, gx2, gy, gr, 9, 0.2, 1);
      ctx.fill();
      // Hammered rings: the smith went round and round.
      ctx.strokeStyle = CAMP_BRONZE_DARK;
      ctx.lineWidth = Math.max(1, s * 0.016);
      for (const rr of [0.78, 0.55]) {
        ctx.beginPath();
        facetCircle(ctx, gx2, gy, gr * rr, 9, 0.2, 1);
        ctx.stroke();
      }
      // The boss: struck a thumb off center — a field piece.
      ctx.fillStyle = shade(CAMP_BRONZE, -18);
      ctx.beginPath();
      facetCircle(ctx, gx2 + m * gr * 0.08, gy + gr * 0.05, gr * 0.22, 7, 0.3, 1);
      ctx.fill();
      ctx.fillStyle = shade(CAMP_BRONZE, 26);
      ctx.beginPath();
      facetCircle(ctx, gx2 + m * gr * 0.04, gy - gr * 0.02, gr * 0.11, 6, 0.2, 1);
      ctx.fill();
      // The west light catches the upper-left face.
      ctx.fillStyle = 'rgba(240, 220, 150, 0.18)';
      ctx.beginPath();
      ctx.arc(gx2 - gr * 0.3, gy - gr * 0.3, gr * 0.42, 0, Math.PI * 2);
      ctx.fill();
      // Verdigris: two teal patches eating in from the rim.
      ctx.fillStyle = 'rgba(94, 158, 140, 0.5)';
      ctx.beginPath();
      ctx.ellipse(gx2 + gr * 0.55 * m, gy - gr * 0.42, gr * 0.16, gr * 0.1, 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(gx2 - gr * 0.5 * m, gy + gr * 0.5, gr * 0.12, gr * 0.08, -0.4, 0, Math.PI * 2);
      ctx.fill();
      // Mallet dents: the crescent bruises of a hard year.
      ctx.strokeStyle = 'rgba(74, 58, 24, 0.6)';
      ctx.lineWidth = Math.max(1, s * 0.018);
      ctx.beginPath();
      ctx.arc(gx2 + m * gr * 0.3, gy + gr * 0.28, gr * 0.12, Math.PI * 0.2, Math.PI * 1.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(gx2 - m * gr * 0.15, gy - gr * 0.35, gr * 0.09, Math.PI * 0.4, Math.PI * 1.3);
      ctx.stroke();
      // THE ONE CRIMSON: the legion's tassel off the rim knot
      // — never varies, never faded (THE BANNER IS ONE).
      const tx2 = gx2 + gr * 0.62 * m + sway * s * 1.6;
      ctx.fillStyle = LEGION_CRIMSON;
      ctx.beginPath();
      ctx.moveTo(tx2 - s * 0.025, gy + gr * 0.6);
      ctx.lineTo(tx2 + s * 0.025, gy + gr * 0.6);
      ctx.lineTo(tx2 + s * 0.04 + sway * s * 2, gy + gr * 0.98);
      ctx.lineTo(tx2 - s * 0.04 + sway * s * 2, gy + gr * 0.98);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(LEGION_CRIMSON, 16);
      ctx.fillRect(tx2 - s * 0.02, gy + gr * 0.56, s * 0.04, s * 0.045);
      // The striker: a wrapped-head mallet leaned on the post
      // — ready, because a watch that hunts its mallet dies.
      const mx = p.x + m * s * 0.48;
      ctx.save();
      ctx.translate(mx, baseY - s * 0.02);
      ctx.rotate(-0.5 * m);
      ctx.fillStyle = shade(PALI_LOG, 10);
      ctx.fillRect(-s * 0.022, -s * 0.52, s * 0.044, s * 0.52);
      ctx.fillStyle = '#6e5a44';
      ctx.beginPath();
      facetCircle(ctx, 0, -s * 0.56, s * 0.075, 6, 0.2, 0.85);
      ctx.fill();
      ctx.strokeStyle = PALI_ROPE_DARK;
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.arc(0, -s * 0.56, s * 0.05, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    },
  };
}

function paintWarTable(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.34;
  const m = ((h >>> 7) & 1) ? 1 : -1;
  return {
    sortY: ty + 0.64,
    body: stationBody(0.9, 1.2, 0.5),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, s * 0.56, s * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
      const tw2 = s * 0.52;
      const topY = baseY - s * 0.5;
      const depth = syT * 0.42;
      // The trestles: two A-frames — field furniture, made to
      // march. Far legs first, dimmer.
      for (const tx3 of [-0.36, 0.36]) {
        const lx = p.x + tx3 * s * 1.16;
        ctx.fillStyle = shade(PALI_LOG, -16);
        ctx.beginPath();
        ctx.moveTo(lx - s * 0.03, topY - depth * 0.3);
        ctx.lineTo(lx + s * 0.16, baseY - s * 0.06);
        ctx.lineTo(lx + s * 0.1, baseY - s * 0.06);
        ctx.lineTo(lx - s * 0.06, topY - depth * 0.24);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(PALI_LOG, -4);
        ctx.beginPath();
        ctx.moveTo(lx - s * 0.02, topY + s * 0.04);
        ctx.lineTo(lx - s * 0.18, baseY + s * 0.02);
        ctx.lineTo(lx - s * 0.11, baseY + s * 0.02);
        ctx.lineTo(lx + s * 0.03, topY + s * 0.06);
        ctx.closePath();
        ctx.fill();
      }
      // The top: three planks with a true foreshortened plane
      // — far edge shaded, front arris lit (the crate-lid law).
      ctx.fillStyle = shade(PALI_LOG, -8);
      ctx.beginPath();
      ctx.moveTo(p.x - tw2, topY + depth * 0.4);
      ctx.lineTo(p.x - tw2 * 0.94, topY - depth * 0.42);
      ctx.lineTo(p.x + tw2 * 0.96, topY - depth * 0.4);
      ctx.lineTo(p.x + tw2, topY + depth * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(50, 34, 16, 0.55)';
      ctx.lineWidth = Math.max(1, s * 0.014);
      for (const f of [-0.15, 0.14]) {
        ctx.beginPath();
        ctx.moveTo(p.x - tw2 * 0.96, topY + depth * f + depth * 0.02);
        ctx.lineTo(p.x + tw2 * 0.97, topY + depth * f);
        ctx.stroke();
      }
      ctx.fillStyle = shade(PALI_LOG, 8);
      ctx.beginPath();
      ctx.moveTo(p.x - tw2, topY + depth * 0.4);
      ctx.lineTo(p.x + tw2, topY + depth * 0.42);
      ctx.lineTo(p.x + tw2, topY + depth * 0.42 + s * 0.07);
      ctx.lineTo(p.x - tw2, topY + depth * 0.4 + s * 0.07);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(PALI_LOG, 18);
      ctx.fillRect(p.x - tw2, topY + depth * 0.41, tw2 * 2, s * 0.016);
      // THE MAP: a cured hide, edges the shape the animal
      // left them, one corner CURLING off the boards.
      const hide = '#c9b684';
      ctx.fillStyle = hide;
      ctx.beginPath();
      ctx.moveTo(p.x - tw2 * 0.62, topY + depth * 0.22);
      ctx.quadraticCurveTo(p.x - tw2 * 0.72, topY - depth * 0.05, p.x - tw2 * 0.5, topY - depth * 0.26);
      ctx.quadraticCurveTo(p.x - tw2 * 0.1, topY - depth * 0.34, p.x + tw2 * 0.4, topY - depth * 0.24);
      ctx.quadraticCurveTo(p.x + tw2 * 0.66, topY - depth * 0.12, p.x + tw2 * 0.58, topY + depth * 0.1);
      ctx.quadraticCurveTo(p.x + tw2 * 0.5, topY + depth * 0.3, p.x + tw2 * 0.14, topY + depth * 0.26);
      ctx.quadraticCurveTo(p.x - tw2 * 0.3, topY + depth * 0.34, p.x - tw2 * 0.62, topY + depth * 0.22);
      ctx.closePath();
      ctx.fill();
      // The curl: underside darker, rolled at the near corner.
      ctx.fillStyle = shade(hide, -22);
      ctx.beginPath();
      ctx.moveTo(p.x - m * tw2 * 0.52, topY + depth * 0.24);
      ctx.quadraticCurveTo(p.x - m * tw2 * 0.42, topY + depth * 0.3, p.x - m * tw2 * 0.32, topY + depth * 0.24);
      ctx.quadraticCurveTo(p.x - m * tw2 * 0.42, topY + depth * 0.12, p.x - m * tw2 * 0.52, topY + depth * 0.24);
      ctx.closePath();
      ctx.fill();
      // The country on the hide: a river, a ridge, and the
      // legion's argument drawn in its one crimson — the
      // advance arrow and the X where somebody dies.
      ctx.strokeStyle = '#5c748a';
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(p.x - tw2 * 0.44, topY - depth * 0.16);
      ctx.quadraticCurveTo(p.x - tw2 * 0.1, topY + depth * (0.04 * m), p.x + tw2 * 0.1, topY - depth * 0.02);
      ctx.quadraticCurveTo(p.x + tw2 * 0.3, topY + depth * 0.06, p.x + tw2 * 0.46, topY + depth * 0.02);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(90, 74, 46, 0.8)';
      ctx.lineWidth = Math.max(1, s * 0.016);
      for (let i = 0; i < 3; i++) {
        const mx2 = p.x - tw2 * 0.2 + i * s * 0.09;
        const my2 = topY - depth * 0.22 + (i % 2) * s * 0.02;
        ctx.beginPath();
        ctx.moveTo(mx2 - s * 0.03, my2 + s * 0.02);
        ctx.lineTo(mx2, my2 - s * 0.015);
        ctx.lineTo(mx2 + s * 0.03, my2 + s * 0.02);
        ctx.stroke();
      }
      ctx.strokeStyle = LEGION_CRIMSON;
      ctx.lineWidth = Math.max(1.2, s * 0.022);
      const ax = p.x + m * tw2 * 0.06;
      const ay = topY + depth * 0.08;
      ctx.beginPath();
      ctx.moveTo(ax - m * s * 0.2, ay + s * 0.05);
      ctx.quadraticCurveTo(ax, ay + s * 0.01, ax + m * s * 0.18, ay - s * 0.04);
      ctx.stroke();
      ctx.fillStyle = LEGION_CRIMSON;
      ctx.beginPath();
      ctx.moveTo(ax + m * s * 0.24, ay - s * 0.06);
      ctx.lineTo(ax + m * s * 0.12, ay - s * 0.065);
      ctx.lineTo(ax + m * s * 0.19, ay + s * 0.005);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = LEGION_CRIMSON;
      ctx.beginPath();
      ctx.moveTo(ax + m * s * 0.3, ay - s * 0.11);
      ctx.lineTo(ax + m * s * 0.36, ay - s * 0.05);
      ctx.moveTo(ax + m * s * 0.36, ay - s * 0.11);
      ctx.lineTo(ax + m * s * 0.3, ay - s * 0.05);
      ctx.stroke();
      // The dagger pins the far corner — the map ARGUES back
      // in a field wind; the officer won.
      const dx = p.x + m * tw2 * 0.44;
      const dy = topY - depth * 0.18;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
      ctx.beginPath();
      ctx.ellipse(dx + s * 0.02, dy + s * 0.02, s * 0.045, s * 0.018, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8b93a4';
      ctx.beginPath();
      ctx.moveTo(dx - s * 0.012, dy);
      ctx.lineTo(dx + s * 0.012, dy);
      ctx.lineTo(dx + s * 0.004, dy - s * 0.1);
      ctx.lineTo(dx - s * 0.004, dy - s * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = CAMP_IRON;
      ctx.fillRect(dx - s * 0.038, dy - s * 0.112, s * 0.076, s * 0.02);
      ctx.fillStyle = shade(PALI_LOG, 16);
      ctx.fillRect(dx - s * 0.013, dy - s * 0.17, s * 0.026, s * 0.06);
      // Cup markers: two iron for the legion's own columns,
      // one CRIMSON-daubed for the enemy — mid-argument.
      for (const [ox, oy, foe] of [
        [-0.26, -0.06, false],
        [0.1, 0.14, false],
        [0.3, -0.02, true],
      ] as const) {
        const cx3 = p.x + ox * tw2 * m;
        const cy3 = topY + oy * depth;
        ctx.fillStyle = foe ? LEGION_CRIMSON : '#57535f';
        ctx.fillRect(cx3 - s * 0.032, cy3 - s * 0.05, s * 0.064, s * 0.05);
        ctx.fillStyle = foe ? shade(LEGION_CRIMSON, 18) : shade('#57535f', 16);
        ctx.beginPath();
        ctx.ellipse(cx3, cy3 - s * 0.05, s * 0.032, s * 0.014, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // The second campaign, rolled and bound at the table's
      // end — this war has a NEXT map.
      ctx.save();
      ctx.translate(p.x - m * tw2 * 0.8, topY + depth * 0.05);
      ctx.rotate(0.12 * m);
      ctx.fillStyle = shade(hide, -8);
      ctx.fillRect(-s * 0.05, -s * 0.16, s * 0.1, s * 0.32);
      ctx.fillStyle = shade(hide, 10);
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.16, s * 0.05, s * 0.02, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALI_ROPE_DARK;
      ctx.fillRect(-s * 0.055, -s * 0.04, s * 0.11, s * 0.024);
      ctx.restore();
    },
  };
}

function paintPlunderCart(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.34;
  const m = ((h >>> 6) & 1) ? 1 : -1;
  const kettle = ((h >>> 10) & 1) === 1;
  return {
    sortY: ty + 0.72,
    body: stationBody(1.0, 1.5, 0.6),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.66, s * 0.085),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, s * 0.64, s * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
      // The cart lists toward its dead corner — the tip is
      // the whole silhouette's story, read at any zoom.
      const tilt = -0.07 * m;
      ctx.save();
      ctx.translate(p.x, baseY - s * 0.3);
      ctx.rotate(tilt);
      const cw = s * 0.56;
      // The shafts trail on the ground behind: the horse is
      // long eaten — this cart was PULLED here by goblins.
      ctx.fillStyle = shade('#6e4a33', -10);
      ctx.save();
      ctx.translate(-m * cw, s * 0.1);
      ctx.rotate(0.38 * m);
      ctx.fillRect(-s * 0.5, -s * 0.026, s * 0.5, s * 0.052);
      ctx.restore();
      ctx.save();
      ctx.translate(-m * cw, s * 0.16);
      ctx.rotate(0.52 * m);
      ctx.fillStyle = shade('#6e4a33', -18);
      ctx.fillRect(-s * 0.46, -s * 0.026, s * 0.46, s * 0.052);
      ctx.restore();
      // Far sideboard peeking over the load.
      ctx.fillStyle = shade('#6e4a33', -20);
      ctx.fillRect(-cw * 0.92, -s * 0.34, cw * 1.84, s * 0.12);
      // THE LOOT under its net — four readable masses (the
      // silhouette-of-circles law): a grain sack, the banded
      // chest corner, a rolled rug in stolen dye, and the
      // bright one — kettle or candlestick by the world's coin.
      const sackX = -cw * 0.42;
      ctx.fillStyle = '#9c8a62';
      ctx.beginPath();
      facetCircle(ctx, sackX, -s * 0.36, s * 0.17, 7, -0.3, 0.8);
      ctx.fill();
      ctx.fillStyle = shade('#9c8a62', -14);
      ctx.fillRect(sackX - s * 0.03, -s * 0.5, s * 0.06, s * 0.05);
      const chX = cw * 0.34;
      ctx.fillStyle = '#7d5a2e';
      ctx.fillRect(chX - s * 0.17, -s * 0.44, s * 0.34, s * 0.2);
      ctx.fillStyle = shade('#7d5a2e', 12);
      ctx.fillRect(chX - s * 0.17, -s * 0.44, s * 0.34, s * 0.05);
      ctx.fillStyle = CAMP_IRON;
      ctx.fillRect(chX - s * 0.06, -s * 0.45, s * 0.12, s * 0.21);
      const rug = CAMP_RAG[(h >>> 12) % 4]!;
      ctx.save();
      ctx.translate(-cw * 0.02, -s * 0.32);
      ctx.rotate(-0.16 * m);
      ctx.fillStyle = rug;
      ctx.fillRect(-s * 0.24, -s * 0.07, s * 0.48, s * 0.14);
      ctx.fillStyle = shade(rug, 14);
      ctx.beginPath();
      ctx.ellipse(m * s * 0.24, 0, s * 0.028, s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (kettle) {
        // The copper kettle rides the top — the one glint.
        ctx.fillStyle = '#b06a30';
        ctx.beginPath();
        facetCircle(ctx, cw * 0.04, -s * 0.52, s * 0.1, 7, 0.2, 0.85);
        ctx.fill();
        ctx.fillStyle = shade('#b06a30', 26);
        ctx.beginPath();
        ctx.ellipse(cw * 0.02, -s * 0.56, s * 0.045, s * 0.022, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = shade('#b06a30', -16);
        ctx.lineWidth = Math.max(1, s * 0.02);
        ctx.beginPath();
        ctx.arc(cw * 0.04, -s * 0.56, s * 0.07, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      } else {
        // A silver candlestick lies tipped across the sack.
        ctx.save();
        ctx.translate(cw * 0.02, -s * 0.5);
        ctx.rotate(1.2 * m);
        ctx.fillStyle = '#c9ccd4';
        ctx.fillRect(-s * 0.02, -s * 0.14, s * 0.04, s * 0.24);
        ctx.beginPath();
        ctx.ellipse(0, s * 0.1, s * 0.055, s * 0.024, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.14, s * 0.035, s * 0.016, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // The net: lashed cross-lines over the whole heap,
      // hitched to the sideboard cleats.
      ctx.strokeStyle = 'rgba(74, 58, 34, 0.75)';
      ctx.lineWidth = Math.max(1, s * 0.016);
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-cw * 0.8 + i * cw * 0.44, -s * 0.2);
        ctx.quadraticCurveTo(-cw * 0.5 + i * cw * 0.44, -s * 0.62, -cw * 0.1 + i * cw * 0.38, -s * 0.2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-cw * 0.88, -s * 0.38);
      ctx.quadraticCurveTo(0, -s * 0.6, cw * 0.88, -s * 0.4);
      ctx.stroke();
      for (const cx4 of [-0.86, -0.3, 0.3, 0.86]) {
        ctx.fillStyle = PALI_ROPE_DARK;
        ctx.fillRect(cx4 * cw - s * 0.018, -s * 0.2, s * 0.036, s * 0.05);
      }
      // The near sideboard: planked, one plank SPRUNG at the
      // dead corner, iron strap rusted mid-board.
      ctx.fillStyle = '#6e4a33';
      ctx.fillRect(-cw, -s * 0.22, cw * 2, s * 0.3);
      ctx.strokeStyle = 'rgba(46, 30, 16, 0.6)';
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.moveTo(-cw, -s * 0.07);
      ctx.lineTo(cw, -s * 0.07);
      ctx.stroke();
      ctx.fillStyle = shade('#6e4a33', 10);
      ctx.fillRect(-cw, -s * 0.22, cw * 2, s * 0.045);
      ctx.save();
      ctx.translate(-m * cw * 0.78, s * 0.04);
      ctx.rotate(-0.14 * m);
      ctx.fillStyle = shade('#6e4a33', -8);
      ctx.fillRect(-s * 0.16, -s * 0.035, s * 0.32, s * 0.07);
      ctx.restore();
      ctx.fillStyle = shade(CAMP_IRON, -6);
      ctx.fillRect(m * cw * 0.4 - s * 0.02, -s * 0.22, s * 0.04, s * 0.3);
      ctx.fillStyle = 'rgba(122, 62, 30, 0.45)';
      ctx.fillRect(m * cw * 0.4 - s * 0.014, -s * 0.02, s * 0.028, s * 0.1);
      ctx.restore();
      // THE WHEELS, outside the tilt so they sit the ground.
      // Dead side first: the smashed wheel — a rim fragment
      // against the axle stub and two snapped spokes flat on
      // the dirt. Then the prop stone doing the wheel's job.
      const dwx = p.x - m * s * 0.44;
      ctx.strokeStyle = '#57402a';
      ctx.lineWidth = Math.max(2, s * 0.05);
      ctx.beginPath();
      ctx.arc(dwx, baseY - s * 0.1, s * 0.2, Math.PI * 0.75, Math.PI * 1.6);
      ctx.stroke();
      ctx.fillStyle = shade('#57402a', -8);
      ctx.save();
      ctx.translate(dwx + m * s * 0.1, baseY + s * 0.02);
      ctx.rotate(0.3 * m);
      ctx.fillRect(-s * 0.13, -s * 0.02, s * 0.26, s * 0.04);
      ctx.restore();
      ctx.save();
      ctx.translate(dwx - m * s * 0.04, baseY + s * 0.05);
      ctx.rotate(-0.5 * m);
      ctx.fillRect(-s * 0.1, -s * 0.018, s * 0.2, s * 0.036);
      ctx.restore();
      ctx.fillStyle = '#6e6879';
      ctx.beginPath();
      facetCircle(ctx, dwx + m * s * 0.06, baseY - s * 0.06, s * 0.1, 6, 0.3, 0.75);
      ctx.fill();
      // The live wheel STANDS PROUD (the barrow law): spoked,
      // iron-tyred, drawn last, rising over the box line.
      const wx2 = p.x + m * s * 0.46;
      const wy2 = baseY - s * 0.26;
      const wr = s * 0.3;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.14)';
      ctx.beginPath();
      ctx.ellipse(wx2, baseY + s * 0.02, wr * 0.8, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = CAMP_IRON;
      ctx.lineWidth = Math.max(2.5, s * 0.06);
      ctx.beginPath();
      ctx.arc(wx2, wy2, wr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#7d5a2e';
      ctx.lineWidth = Math.max(2, s * 0.045);
      ctx.beginPath();
      ctx.arc(wx2, wy2, wr * 0.82, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = Math.max(1.5, s * 0.035);
      const spin = ((h >>> 3) & 7) * 0.12;
      for (let i = 0; i < 6; i++) {
        const a = spin + (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(wx2, wy2);
        ctx.lineTo(wx2 + Math.cos(a) * wr * 0.8, wy2 + Math.sin(a) * wr * 0.8);
        ctx.stroke();
      }
      ctx.fillStyle = shade('#7d5a2e', 14);
      ctx.beginPath();
      facetCircle(ctx, wx2, wy2, wr * 0.18, 6, 0.2, 1);
      ctx.fill();
    },
  };
}

function paintBossEffigy(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.16;
  const m = ((h >>> 8) & 1) ? 1 : -1;
  const topY = baseY - s * 1.5;
  const sway = Math.sin(t * 1.1 + h * 0.5) * 0.04;
  const rag1 = CAMP_RAG[(h >>> 4) % 4]!;
  const rag2 = CAMP_RAG[((h >>> 4) + 2) % 4]!;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.85, 2.0, 0.45),
    drawShadow: () => {
      rend.castEdgeQuad(p.x - s * 0.06, baseY, p.x + s * 0.06, baseY, 1.45);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.015, s * 0.15, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      // Stone packing holds the pole (the totem's footing).
      ctx.fillStyle = '#6e6879';
      for (const [ox, r] of [
        [-0.1, 0.05],
        [0.09, 0.045],
      ] as const) {
        ctx.beginPath();
        facetCircle(ctx, p.x + ox * s, baseY - s * 0.01, r * s, 5, ox * 8, 0.7);
        ctx.fill();
      }
      // The cross-pole skeleton.
      ctx.fillStyle = shade(PALI_LOG, -6);
      ctx.fillRect(p.x - s * 0.04, topY, s * 0.08, baseY - topY);
      ctx.fillStyle = shade(PALI_LOG, 8);
      ctx.fillRect(p.x - s * 0.04, topY, s * 0.028, baseY - topY);
      const armY = topY + s * 0.42;
      ctx.save();
      ctx.translate(p.x, armY);
      ctx.rotate(-0.07 * m);
      ctx.fillStyle = shade(PALI_LOG, -12);
      ctx.fillRect(-s * 0.44, -s * 0.032, s * 0.88, s * 0.064);
      ctx.restore();
      ctx.fillStyle = PALI_ROPE;
      ctx.fillRect(p.x - s * 0.055, armY - s * 0.055, s * 0.11, s * 0.11);
      // The straw skirt under the body: a tied fringe.
      ctx.fillStyle = '#b09a52';
      for (let i = 0; i < 7; i++) {
        const fx3 = p.x + (i - 3) * s * 0.055;
        ctx.save();
        ctx.translate(fx3, baseY - s * 0.52);
        ctx.rotate((i - 3) * 0.09 + sway);
        ctx.fillRect(-s * 0.016, 0, s * 0.032, s * 0.24 + ((h >>> i) & 3) * s * 0.02);
        ctx.restore();
      }
      // THE BODY: a stuffed grain sack, straw bursting at the
      // seams, one patch sewn on with ROPE — goblin tailoring.
      const bodyY = baseY - s * 0.78;
      ctx.fillStyle = '#9c8a62';
      ctx.beginPath();
      facetCircle(ctx, p.x, bodyY, s * 0.26, 8, 0.15 * m, 1.15);
      ctx.fill();
      ctx.fillStyle = shade('#9c8a62', -12);
      ctx.beginPath();
      facetCircle(ctx, p.x + m * s * 0.08, bodyY + s * 0.06, s * 0.15, 7, 0.3, 1);
      ctx.fill();
      ctx.fillStyle = shade(rag2, -6);
      ctx.fillRect(p.x - m * s * 0.16 - s * 0.07, bodyY - s * 0.1, s * 0.14, s * 0.12);
      ctx.strokeStyle = PALI_ROPE;
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.setLineDash([s * 0.024, s * 0.03]);
      ctx.strokeRect(p.x - m * s * 0.16 - s * 0.08, bodyY - s * 0.11, s * 0.16, s * 0.14);
      ctx.setLineDash([]);
      // Straw tufts spitting from the shoulder seams.
      ctx.strokeStyle = '#c9b26a';
      ctx.lineWidth = Math.max(1, s * 0.016);
      for (const [ox, oy, a0] of [
        [-0.24, -0.14, 2.6],
        [0.22, -0.16, 0.5],
        [0.26, 0.08, 0.2],
      ] as const) {
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(p.x + ox * s, bodyY + oy * s);
          ctx.lineTo(
            p.x + ox * s + Math.cos(a0 + k * 0.35) * s * 0.09,
            bodyY + oy * s - Math.abs(Math.sin(a0 + k * 0.35)) * s * 0.08,
          );
          ctx.stroke();
        }
      }
      // The belt: a real sword-belt, cinched — the one piece
      // of the costume that fits, because it's the boss's own
      // spare and everybody knows it.
      ctx.fillStyle = '#4a3626';
      ctx.fillRect(p.x - s * 0.25, bodyY + s * 0.1, s * 0.5, s * 0.06);
      ctx.fillStyle = CAMP_BRONZE;
      ctx.fillRect(p.x - s * 0.035, bodyY + s * 0.095, s * 0.07, s * 0.07);
      // THE HEAD: a pot-helm on a stump neck — dent, painted
      // EYES, and the jagged white GRIN nobody painted twice
      // the same. Part brag, part warning, all goblin.
      const hy2 = topY + s * 0.1;
      ctx.fillStyle = shade('#9c8a62', -6);
      ctx.fillRect(p.x - s * 0.05, hy2 + s * 0.1, s * 0.1, s * 0.1);
      ctx.fillStyle = '#57535f';
      ctx.beginPath();
      ctx.arc(p.x, hy2, s * 0.14, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade('#57535f', -12);
      ctx.fillRect(p.x - s * 0.14, hy2, s * 0.28, s * 0.12);
      ctx.fillStyle = shade('#57535f', 14);
      ctx.beginPath();
      ctx.arc(p.x - s * 0.03, hy2 - s * 0.02, s * 0.09, Math.PI * 1.15, Math.PI * 1.7);
      ctx.stroke();
      ctx.fillStyle = 'rgba(28, 24, 34, 0.7)';
      ctx.beginPath();
      ctx.ellipse(p.x + m * s * 0.06, hy2 - s * 0.07, s * 0.035, s * 0.02, 0.5 * m, 0, Math.PI * 2);
      ctx.fill();
      // The painted face: white eye-rings, uneven; the grin a
      // zigzag of TEETH slashed on in one sitting.
      ctx.strokeStyle = '#e8e2d4';
      ctx.lineWidth = Math.max(1.2, s * 0.022);
      ctx.beginPath();
      ctx.arc(p.x - s * 0.055, hy2 + s * 0.035, s * 0.03, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.x + s * 0.055, hy2 + s * 0.03, s * 0.038, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      const gy2 = hy2 + s * 0.09;
      ctx.moveTo(p.x - s * 0.1, gy2);
      for (let i = 0; i < 5; i++) {
        ctx.lineTo(p.x - s * 0.08 + i * s * 0.045, gy2 + (i % 2 === 0 ? s * 0.03 : -s * 0.004));
      }
      ctx.lineTo(p.x + s * 0.1, gy2 - s * 0.01);
      ctx.stroke();
      // The hide wing-ears lashed to the helm: the SPECIES
      // read — no scarecrow of a man gets ears like these.
      for (const side of [-1, 1]) {
        const ex = p.x + side * s * 0.13;
        ctx.fillStyle = side * m > 0 ? '#84644a' : shade('#84644a', -10);
        ctx.beginPath();
        ctx.moveTo(ex, hy2 - s * 0.02);
        ctx.lineTo(ex + side * s * 0.2, hy2 - s * 0.1 - sway * side * s * 0.5);
        ctx.lineTo(ex + side * s * 0.16, hy2 + s * 0.04);
        ctx.closePath();
        ctx.fill();
      }
      // The jaw trophy on a twine necklace.
      ctx.strokeStyle = PALI_ROPE_DARK;
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.12, bodyY - s * 0.2);
      ctx.quadraticCurveTo(p.x, bodyY - s * 0.08, p.x + s * 0.12, bodyY - s * 0.2);
      ctx.stroke();
      ctx.fillStyle = shade(PALI_BONE, -4);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.07, bodyY - s * 0.12);
      ctx.quadraticCurveTo(p.x, bodyY - s * 0.02, p.x + s * 0.07, bodyY - s * 0.12);
      ctx.lineTo(p.x + s * 0.05, bodyY - s * 0.06);
      ctx.quadraticCurveTo(p.x, bodyY + s * 0.01, p.x - s * 0.05, bodyY - s * 0.06);
      ctx.closePath();
      ctx.fill();
      // The spear arm: a REAL spear lashed to the crossbar's
      // near fist — bent shaft, true head. The other arm ends
      // in rag streamers that never stop moving.
      const spX = p.x + m * s * 0.42;
      ctx.save();
      ctx.translate(spX, armY);
      ctx.rotate(0.16 * m);
      ctx.fillStyle = shade(PALI_LOG, 2);
      ctx.fillRect(-s * 0.022, -s * 0.5, s * 0.044, s * 0.86);
      ctx.fillStyle = '#8b93a4';
      ctx.beginPath();
      ctx.moveTo(-s * 0.045, -s * 0.5);
      ctx.lineTo(0, -s * 0.68);
      ctx.lineTo(s * 0.045, -s * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = PALI_ROPE;
      ctx.fillRect(spX - s * 0.05, armY - s * 0.04, s * 0.1, s * 0.08);
      const stX2 = p.x - m * s * 0.42;
      for (const [col, off] of [
        [rag1, -0.03],
        [rag2, 0.035],
      ] as const) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(stX2 + off * s - s * 0.03, armY + s * 0.02);
        ctx.lineTo(stX2 + off * s + s * 0.03, armY + s * 0.02);
        ctx.lineTo(stX2 + off * s + s * 0.05 + sway * m * s * 2.2, armY + s * 0.44);
        ctx.lineTo(stX2 + off * s - s * 0.02 + sway * m * s * 2.2, armY + s * 0.4);
        ctx.closePath();
        ctx.fill();
      }
    },
  };
}

function paintGnawTrough(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.32;
  const m = ((h >>> 5) & 1) ? 1 : -1;
  const slop = ((h >>> 9) & 1) ? '#5d6a34' : '#6a5f2e';
  return {
    sortY: ty + 0.6,
    body: stationBody(0.85, 0.9, 0.5),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, s * 0.54, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      const tw3 = s * 0.5;
      const rimY = baseY - s * 0.3;
      // The stake cradles: crossed short legs at each end.
      for (const ex of [-0.78, 0.78]) {
        for (const flip of [-1, 1]) {
          ctx.save();
          ctx.translate(p.x + ex * tw3, baseY - s * 0.1);
          ctx.rotate(flip * 0.34);
          ctx.fillStyle = shade(PALI_LOG, flip < 0 ? -12 : 0);
          ctx.fillRect(-s * 0.028, -s * 0.1, s * 0.056, s * 0.24);
          ctx.restore();
        }
      }
      // The half-log: bark belly under, hewn faces above —
      // one tree, one tool, one afternoon.
      ctx.fillStyle = '#4a3420';
      ctx.beginPath();
      ctx.moveTo(p.x - tw3, rimY);
      ctx.quadraticCurveTo(p.x, rimY + s * 0.38, p.x + tw3, rimY);
      ctx.lineTo(p.x + tw3, rimY + s * 0.02);
      ctx.quadraticCurveTo(p.x, rimY + s * 0.42, p.x - tw3, rimY + s * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#5e4023';
      ctx.beginPath();
      ctx.moveTo(p.x - tw3, rimY);
      ctx.quadraticCurveTo(p.x, rimY + s * 0.34, p.x + tw3, rimY);
      ctx.quadraticCurveTo(p.x, rimY + s * 0.12, p.x - tw3, rimY);
      ctx.closePath();
      ctx.fill();
      // Adze tick-marks along the hewn face.
      ctx.strokeStyle = 'rgba(40, 26, 12, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.016);
      for (let i = 0; i < 5; i++) {
        const ax2 = p.x - tw3 * 0.7 + i * tw3 * 0.35;
        ctx.beginPath();
        ctx.moveTo(ax2 - s * 0.03, rimY + s * 0.14);
        ctx.lineTo(ax2 + s * 0.03, rimY + s * 0.18);
        ctx.stroke();
      }
      // The hollow: interior wall shadowed, then THE SLOP —
      // a murky surface with a leg bone standing out of it
      // and a slick catching what light gets in.
      ctx.fillStyle = shade('#4a3420', -16);
      ctx.beginPath();
      ctx.ellipse(p.x, rimY - s * 0.005, tw3 * 0.94, s * 0.115, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = slop;
      ctx.beginPath();
      ctx.ellipse(p.x + s * 0.01, rimY, tw3 * 0.86, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(slop, 12);
      ctx.beginPath();
      ctx.ellipse(p.x - m * tw3 * 0.3, rimY - s * 0.008, tw3 * 0.3, s * 0.035, 0.15 * m, 0, Math.PI * 2);
      ctx.fill();
      // Lumps in the slop — dinner is IN there somewhere.
      ctx.fillStyle = shade(slop, -14);
      for (const [ox, r] of [
        [0.34, 0.05],
        [-0.06, 0.04],
        [0.14, 0.032],
      ] as const) {
        ctx.beginPath();
        facetCircle(ctx, p.x + ox * tw3 * m, rimY - s * 0.005, r * s * 2, 5, ox, 0.5);
        ctx.fill();
      }
      // The standing leg bone, licked clean to the knob.
      ctx.save();
      ctx.translate(p.x + m * tw3 * 0.5, rimY - s * 0.02);
      ctx.rotate(-0.3 * m);
      ctx.fillStyle = shade(PALI_BONE, 2);
      ctx.fillRect(-s * 0.024, -s * 0.24, s * 0.048, s * 0.26);
      ctx.beginPath();
      facetCircle(ctx, 0, -s * 0.26, s * 0.04, 5, 0.3, 0.9);
      ctx.fill();
      ctx.restore();
      // THE GNAW: bite scallops chewed out of the near rim —
      // the beasts eat the TROUGH when the slop runs out.
      ctx.fillStyle = shade('#5e4023', 22);
      for (const gx3 of [-0.5, -0.1, 0.32]) {
        const bx2 = p.x + gx3 * tw3 * m;
        const by2 = rimY + s * (0.1 + Math.abs(gx3) * 0.12);
        ctx.beginPath();
        ctx.arc(bx2, by2, s * 0.045, Math.PI * 1.05, Math.PI * 1.95);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade('#5e4023', 22);
      }
      // Tooth-rake ticks beside the deepest scallop.
      ctx.strokeStyle = 'rgba(140, 110, 70, 0.7)';
      ctx.lineWidth = Math.max(1, s * 0.014);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(p.x - m * tw3 * 0.1 + i * s * 0.03, rimY + s * 0.2);
        ctx.lineTo(p.x - m * tw3 * 0.1 + i * s * 0.03 + s * 0.012, rimY + s * 0.27);
        ctx.stroke();
      }
      // The spill: slop down the belly and two dropped bones
      // where an argument happened.
      ctx.fillStyle = `rgba(${slop === '#5d6a34' ? '93, 106, 52' : '106, 95, 46'}, 0.5)`;
      ctx.beginPath();
      ctx.ellipse(p.x - m * tw3 * 0.34, baseY + s * 0.04, s * 0.13, s * 0.038, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(PALI_BONE, -12);
      ctx.save();
      ctx.translate(p.x - m * tw3 * 0.9, baseY + s * 0.02);
      ctx.rotate(0.5 * m);
      ctx.fillRect(-s * 0.07, -s * 0.018, s * 0.14, s * 0.036);
      ctx.fillRect(s * 0.05, -s * 0.03, s * 0.03, s * 0.06);
      ctx.restore();
      ctx.save();
      ctx.translate(p.x + m * tw3 * 1.02, baseY - s * 0.01);
      ctx.rotate(-0.2 * m);
      ctx.fillRect(-s * 0.06, -s * 0.016, s * 0.12, s * 0.032);
      ctx.restore();
    },
  };
}

function paintHerbPlanter(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.16;
  // THE PHYSIC TUB (docs/herbalist-decor-plan.md): a sawn
  // half-cask planted in three WORKED rows of the game's own
  // botany — sagewort rosettes, nodding moonbell, and one row
  // harvested to stubble THIS morning, its tied bundle lying on
  // the rim beside the iron snips. Reads working where the
  // StreetPlanter reads civic: rows and markers, never blooms.
  // The moonbell stems ride the shared breeze under 4Hz; zero
  // lights, zero particles — the life is wind and fiction.
  const r = s * 0.38;
  const rimY = baseY - s * 0.5;
  return {
    sortY: ty + 0.64,
    body: stationBody(0.62, 1.05, 0.44),
    drawShadow: () => rend.castContact(p.x, baseY, r * 1.3, s * 0.055),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, r * 1.32, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      // The sawn cask: gentler flare than the street barrel —
      // this one was CUT DOWN, not coopered proud.
      ctx.fillStyle = TWN_OAK;
      ctx.beginPath();
      ctx.moveTo(p.x - r * 0.94, baseY);
      ctx.lineTo(p.x - r * 1.04, rimY);
      ctx.lineTo(p.x + r * 1.04, rimY);
      ctx.lineTo(p.x + r * 0.94, baseY);
      ctx.closePath();
      ctx.fill();
      // Stave part-lines and one lit stave.
      ctx.strokeStyle = 'rgba(60, 44, 24, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.011);
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(p.x + k * r * 0.52, rimY + s * 0.012);
        ctx.lineTo(p.x + k * r * 0.46, baseY - s * 0.01);
        ctx.stroke();
      }
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.fillRect(p.x - r * 0.9, rimY + s * 0.025, r * 0.26, baseY - rimY - s * 0.06);
      // Hoops: the upper worn BRIGHT by hands, the lower gone
      // to rust at the damp — iron tells the tub's age.
      ctx.strokeStyle = TWN_IRON;
      ctx.lineWidth = Math.max(1.5, s * 0.026);
      ctx.beginPath();
      ctx.moveTo(p.x - r * 1.02, rimY + s * 0.06);
      ctx.lineTo(p.x + r * 1.02, rimY + s * 0.06);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(214, 224, 236, 0.4)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(p.x - r * 0.5, rimY + s * 0.052);
      ctx.lineTo(p.x + r * 0.3, rimY + s * 0.052);
      ctx.stroke();
      ctx.strokeStyle = '#6e4a3a';
      ctx.lineWidth = Math.max(1.5, s * 0.026);
      ctx.beginPath();
      ctx.moveTo(p.x - r * 0.96, baseY - s * 0.09);
      ctx.lineTo(p.x + r * 0.96, baseY - s * 0.09);
      ctx.stroke();
      // The damp tide mark: watered THIS morning.
      ctx.fillStyle = 'rgba(60, 44, 30, 0.3)';
      ctx.fillRect(p.x - r * 0.97, baseY - s * 0.055, r * 1.94, s * 0.045);
      // The sawn rim: lit edge, two shallow saw notches — a
      // rim cut by hand, never a cooper's turned croze.
      ctx.fillStyle = TWN_OAK_LIT;
      ctx.beginPath();
      ctx.ellipse(p.x, rimY, r * 1.04, r * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(60, 44, 24, 0.45)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      for (const nm of [-0.55, 0.35]) {
        ctx.beginPath();
        ctx.moveTo(p.x + nm * r - s * 0.02, rimY - r * 0.34);
        ctx.lineTo(p.x + nm * r + s * 0.02, rimY - r * 0.33);
        ctx.stroke();
      }
      // The wet bed, and THE ROWS: three worked furrows across
      // the plan ellipse — the top plane TELLS the fiction.
      ctx.fillStyle = HRB_SOIL_WET;
      ctx.beginPath();
      ctx.ellipse(p.x, rimY, r * 0.86, r * 0.27, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const fy of [-0.1, 0.02, 0.14]) {
        ctx.strokeStyle = 'rgba(20, 14, 8, 0.55)';
        ctx.lineWidth = Math.max(1.2, s * 0.018);
        ctx.beginPath();
        ctx.moveTo(p.x - r * 0.7, rimY + r * fy);
        ctx.quadraticCurveTo(p.x, rimY + r * (fy + 0.05), p.x + r * 0.7, rimY + r * fy);
        ctx.stroke();
        // The turned ridge catches the light on its crest.
        ctx.strokeStyle = 'rgba(122, 96, 66, 0.5)';
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        ctx.moveTo(p.x - r * 0.66, rimY + r * fy - s * 0.014);
        ctx.quadraticCurveTo(p.x, rimY + r * (fy + 0.05) - s * 0.014, p.x + r * 0.66, rimY + r * fy - s * 0.014);
        ctx.stroke();
      }
      // Rows dealt by the hash: sagewort, moonbell, and the
      // harvested stubble walk their three seats per tile.
      const perm = [
        [0, 1, 2],
        [2, 0, 1],
        [1, 2, 0],
      ][(h >>> 4) % 3]!;
      const rowY = [rimY - r * 0.16, rimY, rimY + r * 0.17];
      for (let ri = 0; ri < 3; ri++) {
        const kind = perm[ri]!;
        const ry = rowY[ri]!;
        const back = ri === 0;
        if (kind === 0) {
          // Sagewort: three silver rosettes down the row.
          for (let k2 = 0; k2 < 3; k2++) {
            const hs2 = hashCoords(191 + k2 + ri * 7, tx, ty);
            const sx2 = p.x + (k2 - 1) * r * 0.44 + ((hs2 % 5) - 2) * s * 0.01;
            ctx.fillStyle = HRB_SAGE_DEEP;
            ctx.beginPath();
            ctx.ellipse(sx2, ry - s * 0.022, s * 0.075, s * 0.036, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = HRB_SAGE;
            for (let b = 0; b < 4; b++) {
              const a = -Math.PI * 0.8 + b * Math.PI * 0.2 + ((hs2 >>> b) & 1) * 0.1;
              ctx.beginPath();
              ctx.ellipse(
                sx2 + Math.cos(a) * s * 0.042,
                ry - s * 0.036 + Math.sin(a) * s * 0.024,
                s * 0.04,
                s * 0.017,
                a,
                0,
                Math.PI * 2,
              );
              ctx.fill();
            }
            ctx.fillStyle = 'rgba(240, 244, 236, 0.75)';
            ctx.fillRect(sx2 - s * 0.008, ry - s * 0.042, s * 0.016, s * 0.012);
          }
        } else if (kind === 1) {
          // Moonbell: nodding stems, dusk-blue bells riding the
          // shared breeze — the tub's one clocked motion.
          for (let k2 = 0; k2 < 3; k2++) {
            const hs2 = hashCoords(211 + k2 + ri * 7, tx, ty);
            const sx2 = p.x + (k2 - 1) * r * 0.42 + ((hs2 % 5) - 2) * s * 0.012;
            const rise = s * (0.2 + ((hs2 >>> 4) % 3) * 0.035);
            const nod = rend.breezeAt(tx, ty, t, hs2 * 0.37, s, 0.011, 0.011).sway;
            ctx.strokeStyle = HRB_SAGE_DEEP;
            ctx.lineWidth = Math.max(1.2, s * 0.017);
            ctx.beginPath();
            ctx.moveTo(sx2, ry);
            ctx.quadraticCurveTo(sx2 + nod * 0.5, ry - rise * 0.6, sx2 + nod + s * 0.02, ry - rise);
            ctx.stroke();
            const bx = sx2 + nod + s * 0.036;
            const by = ry - rise + s * 0.018;
            ctx.fillStyle = k2 === 1 ? '#a6b4e8' : HRB_MOON;
            ctx.beginPath();
            ctx.moveTo(bx - s * 0.022, by);
            ctx.quadraticCurveTo(bx, by - s * 0.028, bx + s * 0.022, by);
            ctx.quadraticCurveTo(bx + s * 0.017, by + s * 0.032, bx, by + s * 0.038);
            ctx.quadraticCurveTo(bx - s * 0.017, by + s * 0.032, bx - s * 0.022, by);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(238, 240, 252, 0.85)';
            ctx.fillRect(bx - s * 0.008, by + s * 0.027, s * 0.016, s * 0.01);
          }
        } else {
          // The harvested row: cut stubble over fresh-turned
          // earth — the morning's work, visible.
          ctx.fillStyle = 'rgba(90, 70, 50, 0.55)';
          ctx.beginPath();
          ctx.ellipse(p.x + r * 0.05, ry, r * 0.6, s * 0.03, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = HRB_STUBBLE;
          ctx.lineWidth = Math.max(1.2, s * 0.017);
          for (let k2 = 0; k2 < 5; k2++) {
            const hx = p.x + (k2 - 2) * r * 0.26 + (((h >>> (k2 + ri)) & 3) - 1.5) * s * 0.008;
            ctx.beginPath();
            ctx.moveTo(hx, ry + s * 0.008);
            ctx.lineTo(hx + s * 0.009, ry - s * 0.032);
            ctx.stroke();
          }
        }
        // Carved row markers stand the back two rows' west ends.
        if (!back || ri === 0) {
          const mk = hashCoords(227 + ri, tx, ty);
          if ((mk & 3) !== 3 && ri < 2) {
            const mx = p.x - r * (0.8 - ri * 0.06);
            ctx.fillStyle = TWN_OAK_DARK;
            ctx.fillRect(mx - s * 0.013, ry - s * 0.13, s * 0.026, s * 0.13);
            ctx.fillStyle = '#e8dcc4';
            ctx.fillRect(mx - s * 0.021, ry - s * 0.158, s * 0.042, s * 0.034);
            ctx.fillStyle = 'rgba(60, 50, 40, 0.65)';
            ctx.fillRect(mx - s * 0.012, ry - s * 0.147, s * 0.024, s * 0.007);
          }
        }
      }
      // THE RIM FURNITURE (tended, never left): the iron snips
      // resting at the east rim, the morning's tied bundle
      // lying at the west — ready for the batten.
      ctx.save();
      ctx.translate(p.x + r * 0.68, rimY + r * 0.3);
      ctx.rotate(0.5);
      ctx.strokeStyle = TWN_IRON;
      ctx.lineWidth = Math.max(1.4, s * 0.021);
      for (const m of [-1, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(m * s * 0.011, s * 0.04);
        ctx.lineTo(m * s * 0.038, -s * 0.068);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(m * s * 0.019, s * 0.056, s * 0.019, s * 0.015, m * 0.4, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(214, 224, 236, 0.6)';
      ctx.lineWidth = Math.max(1, s * 0.009);
      ctx.beginPath();
      ctx.moveTo(-s * 0.008, s * 0.032);
      ctx.lineTo(-s * 0.03, -s * 0.057);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.translate(p.x - r * 0.64, rimY + r * 0.34);
      ctx.rotate(-1.15);
      ctx.fillStyle = shade(TRD_HERB_DRY, -12);
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.068);
      ctx.quadraticCurveTo(s * 0.04, 0, s * 0.019, s * 0.068);
      ctx.quadraticCurveTo(0, s * 0.084, -s * 0.019, s * 0.068);
      ctx.quadraticCurveTo(-s * 0.04, 0, 0, -s * 0.068);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TRD_HERB_DRY;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.054);
      ctx.quadraticCurveTo(s * 0.027, 0, s * 0.011, s * 0.057);
      ctx.quadraticCurveTo(-s * 0.008, s * 0.04, -s * 0.011, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = TWN_ROPE;
      ctx.lineWidth = Math.max(1.2, s * 0.016);
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.043, s * 0.022, s * 0.016, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      // Two fallen leaves at the foot — the work leaves traces.
      ctx.fillStyle = 'rgba(125, 140, 88, 0.5)';
      for (let k2 = 0; k2 < 2; k2++) {
        ctx.beginPath();
        ctx.ellipse(
          p.x - r * 0.5 + ((h >>> (k2 * 3)) & 3) * r * 0.35,
          baseY - s * 0.01 + ((h >>> (k2 + 5)) & 1) * s * 0.018,
          s * 0.02,
          s * 0.009,
          k2 * 0.9,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    },
  };
}

export const STREET_PROPS: PropEntries = [
  [[Tile.StreetLantern], paintStreetLantern],
  [[Tile.WayShrine], paintWayShrine],
  [[Tile.GuardianStatue], paintGuardianStatue],
  [[Tile.TapCask], paintTapCask],
  [[Tile.WoodStool], paintWoodStool],
  [[Tile.BasketStack], paintBasketStack],
  [[Tile.GlazedJars], paintGlazedJars],
  [[Tile.BroomAndPail], paintBroomAndPail],
  [[Tile.LeanLadder], paintLeanLadder],
  [[Tile.Wheelbarrow], paintWheelbarrow],
  [[Tile.WayfarersRest], paintWayfarersRest],
  [[Tile.MooringPost], paintMooringPost],
  [[Tile.BeachedSkiff], paintBeachedSkiff],
  [[Tile.BoneMidden], paintBoneMidden],
  [[Tile.TrophyStake], paintTrophyStake],
  [[Tile.GrogTub], paintGrogTub],
  [[Tile.KnucklePit], paintKnucklePit],
  [[Tile.RagNest], paintRagNest],
  [[Tile.BeastStake], paintBeastStake],
  [[Tile.CritterCage], paintCritterCage],
  [[Tile.AlarmGong], paintAlarmGong],
  [[Tile.WarTable], paintWarTable],
  [[Tile.PlunderCart], paintPlunderCart],
  [[Tile.BossEffigy], paintBossEffigy],
  [[Tile.GnawTrough], paintGnawTrough],
  [[Tile.HerbPlanter], paintHerbPlanter],
];
