/**
 * THE SECOND BREATH SPEAKS — the sneak wave (THE OPENED DARK).
 *
 * Ten set-pieces for the rogue school's between-rung breath arts,
 * five casted and five channeled. Sneak's breath is hush, thin red
 * lines, and what leaks after: quiet, then sudden, then quietly
 * relentless. Nothing here announces itself — the loudest moment in
 * this file is a bell coming down over a candle.
 *
 * Same binding laws as every wave (hard edges, save/restore hygiene,
 * squash on ground y-radii, srand geometry with frameDt-gated
 * emission, ≤ ~60 path ops per hook per frame), plus this school's
 * own discipline:
 *
 *  - Blood, venom, shadow, smoke, and frost speak ONLY through the
 *    matter library (ONE-VOICE). The hand-drawn matter here is the
 *    unowned kind a cutthroat carries: thread, needles, chalk-pale
 *    seams, hemp rope, playing cards, candle-brass.
 *  - THE AFTERMATH IS THE ART: every signature's longest-lived
 *    stratum is what leaks, drips, settles, or stains after the
 *    paint dies — drops fall on true z and SPLAT; grains lie 8-10 s.
 *  - Channel signatures are ONE BEAT'S WORTH; geometry that must
 *    hold still across beats derives from position, not seed, and
 *    cross-beat growth accumulates through settled matter only.
 *
 * No signature here shares a centerpiece with any other, in this
 * file or any other wave — whisper_fang owns the hush line and
 * wickfire owns the standing candles, so the quiet here is a paper
 * cut and the snuffing is the BELL, not the flame.
 */

import { shade } from './rig.js';
import { burstStarPath, srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { asMatter, blood, frost, shadow, smoke, venom } from './matter/index.js';

// Deliberate unowned-matter hexes (the school's pocket litter — the
// literal-hex law's soot/ink/chalk allowance, plus the doctrine's
// granted thread, hemp, and candle-brass).
const INK = '#241a2e'; // the world's own outline ink
const CHALK = '#e6dfcf'; // chalk-pale seams, card stock, linen thread
const CHALK_DIM = '#b8b0a0';
const HEMP = '#8a6f4d'; // rope body
const HEMP_SHADE = '#5c4832';
const BRASS = '#a8823c'; // the snuffer bell
const BRASS_LIT = '#d4b06a';
const BRASS_SHADE = '#6e5426';
const WICK_FLAME = '#e8b64d'; // candle warmth (painted, never particle fire)
const WICK_CORE = '#f6e3b0';

/** Screen point r px from the heart along ground angle a. */
function pt(c: SigCtx, r: number, a: number): { x: number; y: number } {
  return { x: c.px + Math.cos(a) * r, y: c.py + Math.sin(a) * r * c.squash };
}

/**
 * THE LASTING MARK — one settled grain laid deliberately at a world
 * point. Near-still, ground layer, long life (the ~10 s tertiary
 * stratum). Every art's lingering record goes through here so the
 * budget stays legible: a cast lays a few dozen grains at most.
 */
function lay(
  c: SigCtx, wx: number, wy: number, color: string,
  opts: { life?: number; size?: number; fade?: string; fadeAt?: number; fade2?: string; fade2At?: number } = {},
): void {
  c.particles.burst(wx, wy, 1, [color], {
    speed: 0.06, life: opts.life ?? 8.5, size: opts.size ?? 0.07,
    gravity: 0, drag: 4, layer: 'ground',
    fade: opts.fade, fadeAt: opts.fadeAt,
    fade2: opts.fade2, fade2At: opts.fade2At,
  });
}

/**
 * Position-rooted PRNG — channels re-seed every beat, but a channel
 * roots the caster, so geometry hashed from the heart's position
 * holds still across beats (the accumulation law).
 */
function rooted(c: SigCtx, salt: number): () => number {
  return srand((Math.floor(c.wx * 8) * 73) ^ (Math.floor(c.wy * 8) * 151) ^ salt);
}

// ---------------------------------------------------------- opened_vein

/**
 * OPENED_VEIN — "the beaded crescent."
 * One clean cut, and then the part that matters: five bead-wells
 * swell along the crescent like drops on a razor's edge, and the
 * wound keeps GIVING — true drops fall from the cut line for three
 * seconds after the paint is gone, splatting where they land. The
 * settled crescent of stain under the chord is the receipt.
 */
const opened_vein: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x0e11a);
    const hx = c.wx + Math.cos(c.dir) * c.radius * 0.6;
    const hy = c.wy + Math.sin(c.dir) * c.radius * 0.6;
    // The cut itself: a directed exit along the blow.
    blood.deployments.spray!(m, hx, hy, { dir: c.dir, scale: 0.7 });
    // THE LEAK — the aftermath IS the art. Two wells at different
    // spots on the crescent, on different clocks, dropping true
    // drops that fall on z and SPLAT.
    blood.deployments.drip!(m, hx, hy, { dur: 3.0, scale: 1.5 });
    const a2 = c.dir + (rand() - 0.5) * 1.0;
    blood.deployments.drip!(
      m, c.wx + Math.cos(a2) * c.radius * 0.5, c.wy + Math.sin(a2) * c.radius * 0.5,
      { dur: 2.2, scale: 1.0 });
    // What the drops make where they land: a low spatter under the
    // crescent so the splat flecks read as landings, not dust.
    blood.deployments.spatter!(m, hx, hy, { radius: 0.7, scale: 0.55 });
    // The lasting mark: the cut's own line, written in settled
    // grains under the crescent — a curve, not a scatter. Fines,
    // and lit — the stain is present without going black.
    for (let k = 0; k < 12; k++) {
      const a = c.dir - 0.68 + (k / 11) * 1.36;
      const rr = c.radius * (0.6 + (rand() - 0.5) * 0.1);
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        k % 3 === 0 ? c.st.spark : k % 3 === 1 ? c.st.mid : shade(c.st.deep, 12),
        { life: 9, size: 0.035 + rand() * 0.015 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    const rand = srand(c.seed ^ 0x0e11a);
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const a0 = dir - 0.72;
    const a1 = dir + 0.72;
    const open = Math.min(1, t / 0.22); // the cut writes fast
    ctx.save();
    ctx.lineCap = 'butt';
    // The seam: deep under-stroke, crimson body, and a white
    // hairline heart down the middle of the cut — at 40 px/tile
    // thinner paint vanishes, so the crescent carries real weight.
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(5, sc * 0.15);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.62, rPx * 0.62 * squash, 0, a0, a1);
    ctx.stroke();
    ctx.globalAlpha = 1 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(3.2, sc * 0.09);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.62, rPx * 0.62 * squash, 0, a0, a0 + (a1 - a0) * open);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2.5, sc * 0.03);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.62, rPx * 0.62 * squash, 0, a0, a0 + (a1 - a0) * open);
    ctx.stroke();
    if (open < 1) {
      // The writing point: one hot pixel-star at the crescent's tip.
      const tip = pt(c, rPx * 0.62, a0 + (a1 - a0) * open);
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = st.core;
      ctx.fillRect(tip.x - sc * 0.04, tip.y - sc * 0.04, sc * 0.08, sc * 0.08);
    }
    // The bead-wells: five drops swelling on the edge, each on its
    // own clock — deep setting first, then the wet body, then the
    // pin of light that says LIQUID.
    for (let i = 0; i < 5; i++) {
      const a = dir - 0.58 + (i / 4) * 1.16 + (rand() - 0.5) * 0.12;
      const p = pt(c, rPx * (0.6 + (rand() - 0.5) * 0.06), a);
      const swell = Math.max(0, Math.min(1, (t - 0.08 - i * 0.06) / 0.3));
      if (swell <= 0) continue;
      const s = Math.max(2.4, sc * (0.06 + 0.055 * swell));
      ctx.globalAlpha = 0.7 * fade;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, s * 1.5, s * 1.5 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, s, s * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = st.spark;
      ctx.fillRect(p.x - s * 0.25, p.y - s * 0.4, s * 0.5, s * 0.35);
    }
    ctx.restore();
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.5, c.wy + Math.sin(dir) * c.radius * 0.5,
      0.8, 0.45 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    if (t >= 0.5) return;
    const k = 1 - t / 0.5;
    const sweep = (1 - k) * 0.18;
    ctx.save();
    // The flash: the blade's crescent hanging over the cut for one
    // blink, still sliding the way it swung.
    ctx.globalAlpha = 0.55 * k;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(4, sc * 0.13);
    ctx.beginPath();
    ctx.ellipse(px, py - sc * 0.4, rPx * 0.66, rPx * 0.66 * squash, 0, dir - 0.7 + sweep, dir + 0.7 + sweep);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * k;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2.5, sc * 0.06);
    ctx.beginPath();
    ctx.ellipse(px, py - sc * 0.4, rPx * 0.64, rPx * 0.64 * squash, 0, dir - 0.66 + sweep, dir + 0.66 + sweep);
    ctx.stroke();
    ctx.restore();
  },
};

// ----------------------------------------------------------- threadwork

/**
 * THREADWORK — "the running stitch."
 * The wound is sewn shut in front of everyone: a bowed seam crosses
 * the arc's face and a bright needle DIVES along it, over-under-
 * over, the linen thread showing only where it rides on top. Each
 * beat bites one puncture red and lays a settled red grain there —
 * the channel's whole record is the dotted line it leaves. Snipped
 * thread ends fall on true z and lie where they drop.
 */
const threadwork: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const beat = srand(c.seed ^ 0x5717c);
    // The fresh puncture this beat bites (per-beat choice — the
    // seam itself is position-rooted and holds still).
    const fp = Math.floor(beat() * 7);
    const a = c.dir - 0.75 + (fp / 6) * 1.5;
    const hx = c.wx + Math.cos(a) * c.radius * 0.8;
    const hy = c.wy + Math.sin(a) * c.radius * 0.8;
    blood.deployments.spray!(m, hx, hy, { dir: a, scale: 0.28 });
    // The dotted line accumulates: one settled red grain per beat,
    // laid bright so the seam is readable on any ground.
    lay(c, hx, hy, c.st.spark, { life: 9, size: 0.05 });
    lay(c, hx + (beat() - 0.5) * 0.1, hy + (beat() - 0.5) * 0.1, c.st.mid,
      { life: 9, size: 0.04 });
    // Snipped thread ends: linen falls, lands, lies.
    c.particles.burst(c.wx + Math.cos(c.dir) * c.radius * 0.7, c.wy + Math.sin(c.dir) * c.radius * 0.7,
      3, [CHALK, CHALK_DIM], {
        speed: 0.5, life: 4.5, size: 0.055, gravity: 0, shape: 'streak',
        z: 0.4, vz: 0.6 + beat() * 0.5, zg: 6.5, land: 'settle',
        layer: 'world', fade: CHALK_DIM, fadeAt: 0.4,
      });
  },
  ground(c) {
    const { ctx, st, t, sc, dir } = c;
    const anchor = rooted(c, 0x5717c);
    const beat = srand(c.seed ^ 0x5717c);
    const fp = Math.floor(beat() * 7);
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    // Seven punctures on a bowed chord across the arc face —
    // position-rooted, so the seam never jumps between beats.
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const a = dir - 0.75 + (i / 6) * 1.5;
      const rr = c.rPx * (0.8 + (anchor() - 0.5) * 0.08);
      pts.push(pt(c, rr, a));
    }
    ctx.save();
    ctx.lineCap = 'butt';
    // The seam bed: one deep polyline under everything.
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(4.5, sc * 0.12);
    ctx.beginPath();
    ctx.moveTo(pts[0]!.x, pts[0]!.y);
    for (let i = 1; i < 7; i++) ctx.lineTo(pts[i]!.x, pts[i]!.y);
    ctx.stroke();
    // The thread, only where it rides ON TOP: segments 0-1, 2-3, 4-5.
    // The silver dashes carry the whole read, so they carry weight.
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = CHALK;
    ctx.lineWidth = Math.max(3, sc * 0.075);
    for (let i = 0; i < 6; i += 2) {
      ctx.beginPath();
      ctx.moveTo(pts[i]!.x, pts[i]!.y);
      ctx.lineTo(pts[i + 1]!.x, pts[i + 1]!.y);
      ctx.stroke();
    }
    // The punctures: red dots, the fresh one bitten bright.
    for (let i = 0; i < 7; i++) {
      const s = Math.max(2.6, sc * (i === fp ? 0.08 : 0.055));
      ctx.globalAlpha = (i === fp ? 1 : 0.85) * fade;
      ctx.fillStyle = i === fp ? st.spark : st.mid;
      ctx.fillRect(pts[i]!.x - s, pts[i]!.y - s, s * 2, s * 2);
    }
    ctx.restore();
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.7, c.wy + Math.sin(dir) * c.radius * 0.7,
      0.6, 0.3 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, dir } = c;
    const anchor = rooted(c, 0x5717c);
    // Rebuild the seam (same rooted walk as ground).
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const a = dir - 0.75 + (i / 6) * 1.5;
      const rr = c.rPx * (0.8 + (anchor() - 0.5) * 0.08);
      pts.push(pt(c, rr, a));
    }
    // THE NEEDLE: dives along the seam through the beat — visible
    // only on the over-halves of its sine, trailing thread back to
    // the last puncture it cleared.
    const u = Math.min(1, t / 0.85);
    const seg = Math.min(5.999, u * 6);
    const i0 = Math.floor(seg);
    const f = seg - i0;
    const p0 = pts[i0]!;
    const p1 = pts[i0 + 1]!;
    const nx = p0.x + (p1.x - p0.x) * f;
    const ny = p0.y + (p1.y - p0.y) * f;
    const wave = Math.sin(u * Math.PI * 6); // 6 half-waves, 7 punctures
    ctx.save();
    if (wave > 0.05) {
      const liftY = ny - sc * (0.1 + 0.26 * wave);
      const tx = p1.x - p0.x;
      const ty = p1.y - p0.y;
      const tl = Math.hypot(tx, ty) || 1;
      const nlen = sc * 0.36;
      // Trailing thread: from the eye back down to the last puncture.
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = CHALK;
      ctx.lineWidth = Math.max(2.2, sc * 0.045);
      ctx.beginPath();
      ctx.moveTo(nx - (tx / tl) * nlen * 0.5, liftY);
      ctx.lineTo(p0.x, p0.y);
      ctx.stroke();
      // The needle: a bright sliver on a deep sleeve, pitched along
      // the seam.
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(4, sc * 0.1);
      ctx.beginPath();
      ctx.moveTo(nx - (tx / tl) * nlen * 0.5, liftY + sc * 0.03);
      ctx.lineTo(nx + (tx / tl) * nlen * 0.5, liftY - sc * 0.05);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.6, sc * 0.055);
      ctx.beginPath();
      ctx.moveTo(nx - (tx / tl) * nlen * 0.5, liftY + sc * 0.03);
      ctx.lineTo(nx + (tx / tl) * nlen * 0.5, liftY - sc * 0.05);
      ctx.stroke();
      // The eye glint.
      ctx.fillStyle = st.spark;
      ctx.fillRect(nx + (tx / tl) * nlen * 0.4 - sc * 0.04, liftY - sc * 0.095, sc * 0.08, sc * 0.08);
    } else if (Math.abs(wave) <= 0.05) {
      // The bite: a red spark at the puncture as the needle passes
      // through the world.
      ctx.globalAlpha = 1;
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      burstStarPath(ctx, nx, ny, sc * 0.17, sc * 0.065, 4, u * 2, c.squash);
      ctx.fill();
    }
    ctx.restore();
  },
};

// ------------------------------------------------------ nightshade_kiss

/**
 * NIGHTSHADE_KISS — "the flower nobody plants twice."
 * The dart's wound grows a five-petal nightshade in the space of a
 * breath — stem, whorl, bright stamen heart — and then the garden
 * fails: petal by petal it WILTS, each one drooping, letting go,
 * and falling on true z to lie where it lands. The venom does the
 * real gardening: a kiss-small burst at the wound, and a drip that
 * keeps beading after the flower is gone.
 */
const nightshade_kiss: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x2155e);
    // A kiss-small burst, not a splash — the wound is intimate.
    venom.deployments.burst!(m, c.wx, c.wy, { scale: 0.4 });
    venom.deployments.drip!(m, c.wx, c.wy, { dur: 2.2, scale: 0.8 });
    // The lasting mark: where the petals will lie — a loose fallen
    // corolla around the wound.
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      const rr = 0.2 + rand() * 0.3;
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        k % 2 === 0 ? shade(c.st.deep, 12) : c.st.mid,
        { life: 8.5, size: 0.04 + rand() * 0.015 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const R = Math.max(c.rPx, sc * 0.5);
    ctx.save();
    // The kiss-stain: a small dark bed the flower stands in, with a
    // thin bright lip while the wound is young.
    ctx.globalAlpha = 0.5 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, R * 0.6, R * 0.6 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    if (t < 0.3) {
      ctx.globalAlpha = 0.85 * (1 - t / 0.3);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(px, py, R * 0.55, R * 0.55 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, 0.6, 0.3 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0x2155e);
    // burn the spawn walk so the flower gets its own numbers
    for (let k = 0; k < 10; k++) rand();
    const H = sc * 0.63; // the bloom's height over the wound (+15%)
    const die = t < 0.9 ? 1 : (1 - t) / 0.1;
    ctx.save();
    // The stem: a bowed dark line with a lit edge.
    const grow = Math.min(1, t / 0.1);
    ctx.globalAlpha = 0.85 * die;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2.5, sc * 0.063);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px + sc * 0.09, py - H * 0.6 * grow, px, py - H * grow);
    ctx.stroke();
    // Five petals: each opens on its own clock, holds, then WILTS —
    // drooping, dimming, and shedding one true falling petal.
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.62 + (rand() - 0.5) * 0.1;
      const openAt = 0.08 + i * 0.035;
      const wiltAt = 0.42 + rand() * 0.33;
      const open = Math.max(0, Math.min(1, (t - openAt) / 0.14));
      if (open <= 0) continue;
      const gone = t > wiltAt + 0.16;
      if (gone) continue;
      const wilt = Math.max(0, Math.min(1, (t - wiltAt) / 0.16));
      // Petal shed: during the wilt window, let go once-ish.
      if (wilt > 0 && wilt < 1 && Math.random() < c.frameDt * 9) {
        c.particles.burst(c.wx, c.wy, 1, [st.mid, st.deep], {
          speed: 0.35, life: 4, size: 0.075, gravity: 0, shape: 'drop',
          z: 0.55, vz: 0.3, zg: 4.5, land: 'settle', layer: 'world',
          spin: 0, fade: st.deep, fadeAt: 0.35,
        });
      }
      const droop = wilt * 0.7; // the petal hangs its head
      const len = sc * (0.39 + 0.069 * ((i * 7) % 3)) * open;
      const pa = a + droop * (a > -Math.PI / 2 ? 0.6 : -0.6);
      const bx = px;
      const by = py - H;
      const tx = bx + Math.cos(pa) * len;
      const ty = by + Math.sin(pa) * len + wilt * sc * 0.21;
      const w = sc * 0.104 * open * (1 - wilt * 0.5);
      const na = pa + Math.PI / 2;
      const petal = (mm: number, col: string, al: number): void => {
        ctx.globalAlpha = al * die;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(
          bx + Math.cos(pa) * len * 0.5 + Math.cos(na) * w * mm,
          by + Math.sin(pa) * len * 0.5 + Math.sin(na) * w * mm, tx, ty);
        ctx.quadraticCurveTo(
          bx + Math.cos(pa) * len * 0.5 - Math.cos(na) * w * mm,
          by + Math.sin(pa) * len * 0.5 - Math.sin(na) * w * mm, bx, by);
        ctx.closePath();
        ctx.fill();
      };
      petal(1.35, st.deep, 0.7);
      petal(1.0, i % 2 === 0 ? st.mid : shade(st.mid, 10), 0.95 * (1 - wilt * 0.55));
    }
    // The stamen heart: bright while any petal lives.
    if (t > 0.1 && t < 0.75) {
      const pulse = 0.75 + 0.25 * Math.sin(c.now / 110);
      ctx.globalAlpha = pulse * die;
      ctx.fillStyle = st.spark;
      ctx.fillRect(px - sc * 0.046, py - H - sc * 0.046, sc * 0.092, sc * 0.092);
      ctx.fillStyle = st.core;
      ctx.fillRect(px - sc * 0.023, py - H - sc * 0.023, sc * 0.046, sc * 0.046);
    }
    ctx.restore();
    if (t < 0.3) c.glow(c.wx, c.wy, 0.7, 0.35);
  },
};

// ---------------------------------------------------------- quiet_knife

/**
 * QUIET_KNIFE — "the paper cut."
 * The corridor is treated like a sheet of paper, and paper is thin:
 * one soundless white slice down the lane on the beat, ONE pale
 * hairline holding the line after it, two ink ticks marking where
 * the lane ends, and under all of it a hush you can barely see — a
 * half-tile breath of smoke-creep, never a painted slab. Thin red
 * threads surface along the edges, beat after beat, until the lane
 * is hemmed in red. (Whisper_fang owns the hush LINE; this is the
 * cut that opens.)
 */
const quiet_knife: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x8d1f5);
    const mx = (c.wx + c.wx2) / 2;
    const my = (c.wy + c.wy2) / 2;
    const len = Math.hypot(c.wx2 - c.wx, c.wy2 - c.wy) || 1;
    // Hush smoke: low, clinging, the whole corridor breathes it.
    smoke.deployments.creep!(m, mx, my, {
      radius: Math.max(0.6, Math.min(1.6, len * 0.5)), scale: 0.45, dur: 1.5,
    });
    // Red threads surface along the corridor's edges — the hem
    // accumulates across beats (position of the rails re-derives
    // from the live corridor; the grains stay where they were laid).
    const ux = (c.wx2 - c.wx) / len;
    const uy = (c.wy2 - c.wy) / len;
    for (let k = 0; k < 4; k++) {
      const f = 0.15 + rand() * 0.7;
      const side = k % 2 === 0 ? 1 : -1;
      lay(c, c.wx + ux * len * f - uy * 0.15 * side, c.wy + uy * len * f + ux * 0.15 * side,
        k % 3 === 0 ? c.st.spark : c.st.mid,
        { life: 8, size: 0.035 + rand() * 0.01 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    // The lane breathes open and eases shut — the whisper's own
    // clock, no lips, no filled interior.
    const gapK = t < 0.35 ? t / 0.35 : t < 0.7 ? 1 : Math.max(0, 1 - (t - 0.7) / 0.3);
    const breath = gapK * gapK * (3 - 2 * gapK);
    ctx.save();
    ctx.lineCap = 'butt';
    // The hush: one low smoke-creep whisper, the wire's own half-tile
    // width and nothing more — the corridor is felt, not painted.
    ctx.globalAlpha = (0.08 + 0.1 * breath) * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = sc * 0.5;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px2, py2);
    ctx.stroke();
    // ONE pale hairline down the center: the whole lane's story.
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = CHALK;
    ctx.lineWidth = Math.max(2.5, sc * 0.06);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px2, py2);
    ctx.stroke();
    // The endpoints: two short ink ticks across the lane, so the
    // corridor has ends instead of edges.
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(2, sc * 0.04);
    for (const [ex, ey] of [[px, py], [px2, py2]] as const) {
      ctx.beginPath();
      ctx.moveTo(ex + nx * sc * 0.2, ey + ny * sc * 0.2);
      ctx.lineTo(ex - nx * sc * 0.2, ey - ny * sc * 0.2);
      ctx.stroke();
    }
    // The soundless slice: the white flash down the whole lane on
    // the beat, gone in the first blink.
    if (t < 0.12) {
      ctx.globalAlpha = 0.95 * (1 - t / 0.12);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.5, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px2, py2);
      ctx.stroke();
    }
    ctx.restore();
    c.glow((c.wx + c.wx2) / 2, (c.wy + c.wy2) / 2, 0.8, 0.25 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    if (t >= 0.8) return;
    // The knife: a glint traveling the whole corridor, low, with a
    // short pale afterline — the only thing that moves fast here.
    const u = Math.min(1, t / 0.55);
    const eu = u * u * (3 - 2 * u);
    const gx = px + (px2 - px) * eu;
    const gy = py + (py2 - py) * eu - sc * 0.28;
    const die = 1 - t / 0.8;
    const ux = (px2 - px) / (Math.hypot(px2 - px, py2 - py) || 1);
    const uy = (py2 - py) / (Math.hypot(px2 - px, py2 - py) || 1);
    ctx.save();
    ctx.lineCap = 'butt';
    if (eu > 0.06) {
      const bx = px + (px2 - px) * Math.max(0, eu - 0.14);
      const by = py + (py2 - py) * Math.max(0, eu - 0.14) - sc * 0.28;
      ctx.globalAlpha = 0.5 * die;
      ctx.strokeStyle = CHALK;
      ctx.lineWidth = Math.max(1.2, sc * 0.03);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(gx, gy);
      ctx.stroke();
    }
    // THE BLADE: a half-tile sliver riding the lane, thin and bright
    // — never a dark arrowhead planted at the far end.
    const half = sc * 0.25;
    ctx.globalAlpha = 0.45 * die;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, sc * 0.038);
    ctx.beginPath();
    ctx.moveTo(gx - ux * half, gy - uy * half);
    ctx.lineTo(gx + ux * half, gy + uy * half);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * die;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2.5, sc * 0.045);
    ctx.beginPath();
    ctx.moveTo(gx - ux * half * 0.85, gy - uy * half * 0.85);
    ctx.lineTo(gx + ux * half * 0.85, gy + uy * half * 0.85);
    ctx.stroke();
    // The point: one small hot pixel at the sliver's leading tip.
    ctx.globalAlpha = 0.95 * die;
    ctx.fillStyle = st.spark;
    ctx.fillRect(gx + ux * half - sc * 0.03, gy + uy * half - sc * 0.03, sc * 0.06, sc * 0.06);
    ctx.restore();
  },
};

// -------------------------------------------------------------- redwork

/**
 * REDWORK — "the blown rose."
 * The room blooms red: a rose opens flat on the floor around the
 * caster — an inner whorl of three petals, an outer whorl of five,
 * each unfurling in sequence to the nova's rim — while true blood
 * leaves low and lands where the petals point. Three petals tear
 * free and lift away as it withers. The fallen corolla stays
 * written in a settled ring for nine seconds.
 */
const redwork: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x6e0d3);
    blood.deployments.gush!(m, c.wx, c.wy, { scale: 0.8 });
    blood.deployments.spatter!(m, c.wx, c.wy, { radius: 1.5, scale: 0.9 });
    // One well keeps giving after the bloom.
    const da = rand() * Math.PI * 2;
    blood.deployments.drip!(
      m, c.wx + Math.cos(da) * c.radius * 0.4, c.wy + Math.sin(da) * c.radius * 0.4,
      { dur: 2.0, scale: 0.8 });
    // The fallen corolla: a deliberate ring of petal flecks.
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + rand() * 0.3;
      const rr = c.radius * (0.72 + (rand() - 0.5) * 0.14);
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        k % 3 === 0 ? c.st.spark : k % 3 === 1 ? c.st.mid : shade(c.st.deep, 12),
        { life: 9, size: 0.04 + rand() * 0.015 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x6e0d3);
    const rot = rand() * Math.PI * 2;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    ctx.save();
    // One petal: a filled lobe from the heart, drawn in ground
    // perspective (squash on every y).
    const petal = (a: number, len: number, w: number, col: string, al: number): void => {
      const tx = px + Math.cos(a) * len;
      const ty = py + Math.sin(a) * len * squash;
      const na = a + Math.PI / 2;
      const cx1 = px + Math.cos(a) * len * 0.55 + Math.cos(na) * w;
      const cy1 = py + (Math.sin(a) * len * 0.55 + Math.sin(na) * w) * squash;
      const cx2 = px + Math.cos(a) * len * 0.55 - Math.cos(na) * w;
      const cy2 = py + (Math.sin(a) * len * 0.55 - Math.sin(na) * w) * squash;
      ctx.globalAlpha = al;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(cx1, cy1, tx, ty);
      ctx.quadraticCurveTo(cx2, cy2, px, py);
      ctx.closePath();
      ctx.fill();
    };
    // Outer whorl: five petals to the nova's rim, unfurling second.
    for (let i = 0; i < 5; i++) {
      const a = rot + (i / 5) * Math.PI * 2;
      const open = Math.max(0, Math.min(1, (t - 0.12 - i * 0.03) / 0.2));
      if (open <= 0) continue;
      const ease = open * open * (3 - 2 * open);
      const len = rPx * 0.88 * ease;
      petal(a, len * 1.06, rPx * 0.24, st.deep, 0.6 * fade);
      petal(a, len, rPx * 0.19, st.mid, 0.85 * fade);
    }
    // Inner whorl: three petals, first to open, a shade brighter.
    for (let i = 0; i < 3; i++) {
      const a = rot + Math.PI / 5 + (i / 3) * Math.PI * 2;
      const open = Math.max(0, Math.min(1, (t - 0.02) / 0.16));
      if (open <= 0) continue;
      const ease = open * open * (3 - 2 * open);
      const len = rPx * 0.42 * ease;
      petal(a, len * 1.1, rPx * 0.15, st.deep, 0.65 * fade);
      petal(a, len, rPx * 0.12, shade(st.mid, 14), 0.9 * fade);
    }
    // The heart.
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.1, sc * 0.1 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, (t < 0.25 ? 0.6 : 0.35) * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x6e0d3);
    const rot = rand() * Math.PI * 2;
    ctx.save();
    // Three petals tear free and lift away as the rose withers.
    for (let k = 0; k < 3; k++) {
      const off = 0.34 + k * 0.14;
      if (t < off) continue;
      const fly = Math.min(1, (t - off) / 0.3);
      if (fly >= 1) continue;
      const a = rot + k * 2.2;
      const r = rPx * (0.5 + fly * 0.55);
      const lift = sc * (0.25 + fly * 0.85);
      const x = px + Math.cos(a) * r;
      const y = py + Math.sin(a) * r * squash - lift;
      const s = sc * 0.13 * (1 - fly * 0.35);
      const al = 1 - fly;
      ctx.translate(x, y);
      ctx.rotate(a + fly * 2.4);
      ctx.globalAlpha = 0.6 * al;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 1.25, s * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.95 * al;
      ctx.fillStyle = k === 1 ? shade(st.mid, 10) : st.mid;
      ctx.beginPath();
      ctx.ellipse(0, 0, s, s * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.restore();
  },
};

// ------------------------------------------------------- gallows_thread

/**
 * GALLOWS_THREAD — "the rope pulls taut."
 * Each hop of the chain is ONE length of hemp slung neck to neck and
 * nothing else: it arrives SAGGING, a knot-glint runs it, and then it
 * SNAPS taut on the beat, while shaken fibers fall on true z and
 * venom beads at the far throat, drop after drop. The rope's shadow
 * sags on the ground beneath it the whole while. No posts, no
 * twist-work, no shiver lines — one rope reads; a thicket does not.
 */
const gallows_thread: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x9a770);
    // The far throat takes its beads — two deliberate drops.
    venom.deployments.bead!(m, c.wx2, c.wy2, { z: 0.6 });
    venom.deployments.bead!(m, c.wx2 + (rand() - 0.5) * 0.2, c.wy2 + (rand() - 0.5) * 0.2, { z: 0.5 });
    // Shaken hemp: fibers fall from the line's belly and lie there.
    const mx = (c.wx + c.wx2) / 2;
    const my = (c.wy + c.wy2) / 2;
    c.particles.burst(mx, my, 4, [HEMP, HEMP_SHADE], {
      speed: 0.3, life: 4.5, size: 0.05, gravity: 0, shape: 'streak',
      z: 0.5, vz: 0.2, zg: 6, land: 'settle', layer: 'world',
      fade: HEMP_SHADE, fadeAt: 0.45,
    });
    lay(c, mx + (rand() - 0.5) * 0.2, my + (rand() - 0.5) * 0.2, HEMP_SHADE,
      { life: 7, size: 0.045 });
  },
  ground(c) {
    const { ctx, t, sc, px, py, px2, py2 } = c;
    // The rope's shadow: a sagging ink line under the hop, going
    // straight as the rope does.
    const sag = Math.pow(Math.max(0, 1 - t / 0.38), 1.5);
    const lenT = Math.hypot(c.wx2 - c.wx, c.wy2 - c.wy);
    const drop = sc * 0.5 * sag * Math.min(1, lenT / 3) * c.squash;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    ctx.save();
    ctx.globalAlpha = 0.18 * fade;
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo((px + px2) / 2, (py + py2) / 2 + drop, px2, py2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const lift = sc * 0.55; // the rope rides throat-high
    const y1 = py - lift;
    const y2 = py2 - lift;
    const lenT = Math.hypot(c.wx2 - c.wx, c.wy2 - c.wy);
    const sag = Math.pow(Math.max(0, 1 - t / 0.38), 1.5);
    const drop = sc * 0.85 * sag * Math.min(1, lenT / 3);
    const cxm = (px + px2) / 2;
    const cym = (y1 + y2) / 2 + drop;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    ctx.save();
    ctx.lineCap = 'butt';
    // ONE ROPE, and nothing standing beside it: deep sleeve, hemp
    // body, sagging then taut. No posts, no twist ticks, no ghost
    // lines — the simplicity IS the art here.
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = HEMP_SHADE;
    ctx.lineWidth = Math.max(4, sc * 0.11);
    ctx.beginPath();
    ctx.moveTo(px, y1);
    ctx.quadraticCurveTo(cxm, cym, px2, y2);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = HEMP;
    ctx.lineWidth = Math.max(2.6, sc * 0.065);
    ctx.beginPath();
    ctx.moveTo(px, y1);
    ctx.quadraticCurveTo(cxm, cym, px2, y2);
    ctx.stroke();
    // The knot: a glint running the rope, arriving at the throat as
    // it snaps.
    const u = Math.min(1, t / 0.42);
    const omu = 1 - u;
    const kx = omu * omu * px + 2 * omu * u * cxm + u * u * px2;
    const ky = omu * omu * y1 + 2 * omu * u * cym + u * u * y2;
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = HEMP_SHADE;
    ctx.fillRect(kx - sc * 0.06, ky - sc * 0.06, sc * 0.12, sc * 0.12);
    ctx.fillStyle = st.spark;
    ctx.fillRect(kx - sc * 0.028, ky - sc * 0.028, sc * 0.056, sc * 0.056);
    // The twang: one small star at the belly the instant it goes taut.
    if (t > 0.38 && t < 0.5) {
      const k = 1 - (t - 0.38) / 0.12;
      ctx.globalAlpha = 0.9 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, cxm, (y1 + y2) / 2, sc * 0.2 * k + sc * 0.06, sc * 0.05, 4, 0.6, 1);
      ctx.fill();
      c.glow((c.wx + c.wx2) / 2, (c.wy + c.wy2) / 2, 0.7, 0.4 * k);
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- widows_draw

/**
 * WIDOWS_DRAW — "the dealt hand."
 * Three darts, three wounds, and at every wound a CARD lands — a
 * chalk-pale playing card flipping flat onto the ground where the
 * needle struck, wearing its seeded suit (the red suits and the ink
 * suits both; the widow deals fair). The venom does the scoring:
 * a kiss of burst at the wound, one deliberate bead, and a stain
 * that outlives the hand. The card's four corners stay marked in
 * settled grains after the stock dissolves.
 */
const widows_draw: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0xd3a17);
    venom.deployments.burst!(m, c.wx, c.wy, { scale: 0.35 });
    venom.deployments.bead!(m, c.wx, c.wy, { z: 0.5 });
    // The card's ghost: four corner grains + one center stain.
    const rot = rand() * Math.PI * 2;
    const w = 0.28;
    const h = 0.4;
    for (let k = 0; k < 4; k++) {
      const sx = k % 2 === 0 ? 1 : -1;
      const sy = k < 2 ? 1 : -1;
      const lx = Math.cos(rot) * w * sx - Math.sin(rot) * h * sy;
      const ly = Math.sin(rot) * w * sx + Math.cos(rot) * h * sy;
      lay(c, c.wx + lx, c.wy + ly, CHALK_DIM, { life: 8, size: 0.045 });
    }
    lay(c, c.wx, c.wy, shade(c.st.deep, 12), { life: 9, size: 0.055 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0xd3a17);
    const rot = rand() * Math.PI * 2;
    // burn the corner walk
    const suit = Math.floor(rand() * 4); // 0 heart, 1 diamond, 2 spade, 3 club
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    // The deal: the card flips down flat in the first blink.
    const flip = t < 0.12 ? Math.sin((t / 0.12) * Math.PI * 0.5) : 1;
    const w = sc * 0.56;
    const h = sc * 0.8;
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(1, squash);
    ctx.rotate(rot);
    ctx.scale(1, flip);
    // Stock: deep edge, chalk face.
    ctx.globalAlpha = 0.75 * fade;
    ctx.fillStyle = st.deep;
    ctx.fillRect(-w / 2 - sc * 0.03, -h / 2 - sc * 0.03, w + sc * 0.06, h + sc * 0.06);
    ctx.globalAlpha = 0.92 * fade;
    ctx.fillStyle = CHALK;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    // The pip: red suits in the school's crimson, ink suits in ink.
    const pipCol = suit < 2 ? st.mid : INK;
    ctx.fillStyle = pipCol;
    ctx.globalAlpha = 0.95 * fade;
    const s = sc * 0.13;
    if (suit === 0 || suit === 2) {
      // Heart / spade: two lobes and a point (the spade points up).
      const flipY = suit === 2 ? -1 : 1;
      ctx.beginPath();
      ctx.ellipse(-s * 0.42, -s * 0.3 * flipY, s * 0.45, s * 0.45, 0, 0, Math.PI * 2);
      ctx.ellipse(s * 0.42, -s * 0.3 * flipY, s * 0.45, s * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.82, -s * 0.18 * flipY);
      ctx.lineTo(0, s * 0.95 * flipY);
      ctx.lineTo(s * 0.82, -s * 0.18 * flipY);
      ctx.closePath();
      ctx.fill();
    } else if (suit === 1) {
      // Diamond.
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.7, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.7, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      // Club: three lobes and a stem.
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.5, s * 0.4, s * 0.4, 0, 0, Math.PI * 2);
      ctx.ellipse(-s * 0.45, s * 0.15, s * 0.4, s * 0.4, 0, 0, Math.PI * 2);
      ctx.ellipse(s * 0.45, s * 0.15, s * 0.4, s * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-s * 0.1, s * 0.2, s * 0.2, s * 0.7);
    }
    // Corner index pips.
    ctx.fillStyle = pipCol;
    ctx.globalAlpha = 0.8 * fade;
    ctx.fillRect(-w / 2 + sc * 0.045, -h / 2 + sc * 0.05, sc * 0.05, sc * 0.07);
    ctx.fillRect(w / 2 - sc * 0.095, h / 2 - sc * 0.12, sc * 0.05, sc * 0.07);
    ctx.restore();
    c.glow(c.wx, c.wy, 0.55, 0.3 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    if (t >= 0.14) return;
    // The arrival: the needle's last hand-span, and the strike star.
    const rand = srand(c.seed ^ 0xd3a17 ^ 0x7);
    const k = t / 0.14;
    const a = -Math.PI / 2 + (rand() - 0.5) * 1.2; // in from up-sky
    const d = sc * 1.1 * (1 - k);
    ctx.save();
    ctx.globalAlpha = 0.85 * (1 - k * 0.4);
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.3, sc * 0.032);
    ctx.beginPath();
    ctx.moveTo(px + Math.cos(a) * (d + sc * 0.4), py - sc * 0.2 + Math.sin(a) * (d + sc * 0.4));
    ctx.lineTo(px + Math.cos(a) * d, py - sc * 0.2 + Math.sin(a) * d);
    ctx.stroke();
    if (k > 0.7) {
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      burstStarPath(ctx, px, py - sc * 0.1, sc * 0.16, sc * 0.055, 4, k * 2, c.squash);
      ctx.fill();
    }
    ctx.restore();
  },
};

// --------------------------------------------------------- bloodletting

/**
 * BLOODLETTING — "the graduated draw."
 * The old physician's arithmetic, read at a glance: every beat, red
 * streams leave the wound the WRONG way — blood.drink converging out
 * of the arc zone into the caster — and a painted file of five fat
 * motes walks that same road home, big enough to see at forty pixels
 * a tile. At the caster's wrist a glint TICKS once a beat, the
 * metronome of the draw. What spills builds a settled stain at the
 * same hip, beat after beat, and that pile is the receipt.
 */
const bloodletting: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const anchor = rooted(c, 0xb100d);
    const beat = srand(c.seed ^ 0xb100d);
    // The wrong-way flow: the whole arc zone pays inward, on the
    // cast's own radius so the drain covers the ground it takes from.
    blood.deployments.drink!(
      m, c.wx, c.wy,
      { radius: Math.max(1.0, c.radius * 0.9), dur: 0.75, scale: 1.15 });
    // The cut that opens the account, small and directed.
    blood.deployments.spray!(
      m, c.wx + Math.cos(c.dir) * c.radius * 0.6, c.wy + Math.sin(c.dir) * c.radius * 0.6,
      { dir: c.dir, scale: 0.4 });
    // The spilled measure: 3 grains per beat at the SAME hip spot
    // (position-rooted) — the stain grows because the world keeps
    // what landed.
    const side = anchor() > 0.5 ? 1 : -1;
    const va = c.dir + 2.35 * side;
    const vx = c.wx + Math.cos(va) * 0.55;
    const vy = c.wy + Math.sin(va) * 0.55;
    for (let k = 0; k < 3; k++) {
      lay(c, vx + (beat() - 0.5) * 0.24, vy + (beat() - 0.5) * 0.24,
        k === 0 ? c.st.spark : k === 1 ? c.st.mid : shade(c.st.deep, 12),
        { life: 9, size: 0.04 + beat() * 0.015 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    ctx.save();
    ctx.lineCap = 'butt';
    // The cut: a modest seam at the arc's face (the statement here
    // is the vial, not the wound).
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(4, sc * 0.11);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.6, rPx * 0.6 * squash, 0, dir - 0.5, dir + 0.5);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.6, sc * 0.065);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.6, rPx * 0.6 * squash, 0, dir - 0.5, dir + 0.5 * Math.min(1, t / 0.2));
    ctx.stroke();
    // The taking ring: the circle at the caster's feet that brightens
    // as the measure fills — the drain's own edge.
    ctx.globalAlpha = (0.25 + 0.4 * t) * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.5, sc * 0.055);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.42, sc * 0.42 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx, c.wy, 0.7, 0.3 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    const anchor = rooted(c, 0xb100d);
    const side = anchor() > 0.5 ? 1 : -1;
    // The wrist: a fixed offset off the caster's own point (wire x,y),
    // held on the drawing side through the whole channel.
    const wrx = px + Math.cos(dir + 1.5 * side) * sc * 0.34;
    const wry = py - sc * 0.62;
    const die = t < 0.85 ? 1 : (1 - t) / 0.15;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE DRINK, painted: five fat motes walking the wrong way — out
    // of the arc zone, home to the wrist — each on its own phase so
    // the file never bunches. This is the mechanic made visible.
    for (let i = 0; i < 5; i++) {
      const u = (t * 1.35 + i / 5) % 1;
      const a = dir + (i - 2) * 0.26;
      const sx = px + Math.cos(a) * rPx * 0.82;
      const sy = py + Math.sin(a) * rPx * 0.82 * squash - sc * 0.12;
      const ease = u * u * (3 - 2 * u);
      const mx = sx + (wrx - sx) * ease;
      const my = sy + (wry - sy) * ease;
      const s = sc * (0.075 + 0.03 * ease); // it fattens as it nears
      const al = (u < 0.12 ? u / 0.12 : 1) * die;
      ctx.globalAlpha = 0.65 * al;
      ctx.fillStyle = st.deep;
      ctx.fillRect(mx - s * 1.35, my - s * 1.35, s * 2.7, s * 2.7);
      ctx.globalAlpha = 0.95 * al;
      ctx.fillStyle = ease > 0.6 ? st.spark : st.mid;
      ctx.fillRect(mx - s, my - s, s * 2, s * 2);
    }
    // The road home: one dim guide line from the arc's face to the
    // wrist, so the file reads as a stream and not as loose sparks.
    const fx = px + Math.cos(dir) * rPx * 0.82;
    const fy = py + Math.sin(dir) * rPx * 0.82 * squash - sc * 0.12;
    ctx.globalAlpha = 0.3 * die;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2.5, sc * 0.06);
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(wrx, wry);
    ctx.stroke();
    // THE METRONOME: the wrist glint ticks once a beat — a hard
    // bright bead that flares as the measure lands.
    const tick = t < 0.14 ? 1 - t / 0.14 : 0;
    ctx.globalAlpha = 0.7 * die;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(wrx, wry, sc * 0.15, sc * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = (0.8 + 0.2 * tick) * die;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.ellipse(wrx, wry, sc * 0.095, sc * 0.095, 0, 0, Math.PI * 2);
    ctx.fill();
    if (tick > 0) {
      ctx.globalAlpha = 0.95 * tick;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, wrx, wry, sc * (0.14 + 0.16 * tick), sc * 0.05, 4, 0.4, squash);
      ctx.fill();
    }
    ctx.restore();
  },
};

// ----------------------------------------------------------- lights_out

/**
 * LIGHTS_OUT — "the snuffer bell."
 * Cold arithmetic for candles: a brass snuffer bell the size of the
 * whole ring drops out of the dark in the blast's opening quarter —
 * the rim's little wick-flames going out one by one under its
 * shadow — and where it seats, the dark and the cold spill out from
 * under the lip. The bell lifts away; the room does not come back.
 * Dead-wick smoke threads rise where flames stood, and a ring of
 * soot stubs stays written on the floor. (Wickfire's candles STAND;
 * these are put out.)
 */
const lights_out: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x50ff2);
    // The dark seats under the bell (attack ramp lands it just as
    // the brass touches down) and the cold pools after.
    shadow.deployments.veil!(m, c.wx, c.wy, { radius: c.radius * 0.75, dur: 2.2, scale: 0.6 });
    frost.deployments.fog!(m, c.wx, c.wy, { radius: c.radius * 0.85, scale: 0.6, dur: 2.6 });
    // Dead wicks breathe: two thin smoke threads where flames stood.
    for (let k = 0; k < 2; k++) {
      const a = rand() * Math.PI * 2;
      smoke.deployments.plume!(
        m, c.wx + Math.cos(a) * c.radius * 0.8, c.wy + Math.sin(a) * c.radius * 0.8,
        { scale: 0.22, dur: 1.4 });
    }
    // The lasting mark: a ring of soot stubs where the candles died —
    // FLECKS, not chunks, and lifted off pure black so they read as
    // char rather than holes — with pale cold wisps inside the ring.
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rand() * 0.3;
      const rr = c.radius * (0.8 + (rand() - 0.5) * 0.08);
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr, shade(c.st.deep, 12),
        { life: 8.5, size: 0.032 + rand() * 0.012 });
    }
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.4, c.wy + Math.sin(a) * c.radius * 0.4,
        CHALK, { life: 7, size: 0.035 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x50ff2);
    ctx.save();
    // The rim candles: six flames around the ring, each snuffed on
    // its own clock inside the opening quarter — painted warmth,
    // never particle fire.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rand() * 0.4;
      const p = pt(c, rPx * (0.8 + (rand() - 0.5) * 0.08), a);
      const snuffAt = 0.04 + (i / 6) * 0.18;
      if (t >= snuffAt) continue;
      const lifeK = 1 - t / snuffAt;
      const flick = 0.75 + 0.25 * Math.sin(c.now / 70 + i * 2.3);
      const fh = sc * 0.22 * flick * Math.min(1, lifeK * 2.5);
      const fw = sc * 0.05;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = WICK_FLAME;
      ctx.beginPath();
      ctx.moveTo(p.x - fw, p.y);
      ctx.lineTo(p.x, p.y - fh);
      ctx.lineTo(p.x + fw, p.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = WICK_CORE;
      ctx.beginPath();
      ctx.moveTo(p.x - fw * 0.4, p.y);
      ctx.lineTo(p.x, p.y - fh * 0.5);
      ctx.lineTo(p.x + fw * 0.4, p.y);
      ctx.closePath();
      ctx.fill();
    }
    // The dark pool: spills out from under the bell's lip once it
    // seats, and DOES NOT leave with the paint — it just thins.
    if (t > 0.16) {
      const spill = Math.min(1, (t - 0.16) / 0.3);
      const r = rPx * (0.45 + 0.6 * spill);
      const dim = t < 0.75 ? 1 : (1 - t) / 0.25;
      ctx.globalAlpha = 0.55 * dim;
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.ellipse(px, py, r, r * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      // The cold seam: one chalk-pale ring at the dark's edge.
      ctx.globalAlpha = 0.6 * dim;
      ctx.strokeStyle = CHALK_DIM;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(px, py, r * 0.98, r * 0.98 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    // Light leaves with the candles: glow only while any flame lives.
    if (t < 0.22) c.glow(c.wx, c.wy, c.radius * 0.9, 0.45 * (1 - t / 0.22));
  },
  air(c) {
    const { ctx, t, sc, squash, px, py } = c;
    if (t >= 0.52) return;
    // THE BELL: descends dead vertical through the opening quarter,
    // seats, holds the dark under itself, then lifts away and fades.
    const seatK = Math.min(1, t / 0.16);
    const drop = (1 - seatK) * (1 - seatK);
    const liftK = t > 0.34 ? (t - 0.34) / 0.18 : 0;
    const y = py - sc * 2.5 * drop - sc * 1.1 * liftK;
    const al = 1 - liftK;
    const w = sc * 0.95; // the bell covers the heart of the ring
    const domeH = sc * 0.62;
    const rimH = sc * 0.19 * squash;
    ctx.save();
    // Rim ellipse first (the mouth), then the dome, then the knob —
    // brass body with a shade side and one lit band, hard edges.
    ctx.globalAlpha = 0.9 * al;
    ctx.fillStyle = BRASS_SHADE;
    ctx.beginPath();
    ctx.ellipse(px, y, w / 2 + sc * 0.04, rimH + sc * 0.025, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = BRASS;
    ctx.beginPath();
    ctx.moveTo(px - w / 2, y);
    ctx.quadraticCurveTo(px - w * 0.42, y - domeH * 0.92, px, y - domeH);
    ctx.quadraticCurveTo(px + w * 0.42, y - domeH * 0.92, px + w / 2, y);
    ctx.closePath();
    ctx.fill();
    // The lit band: one hard highlight down the left of the dome.
    ctx.globalAlpha = 0.85 * al;
    ctx.fillStyle = BRASS_LIT;
    ctx.beginPath();
    ctx.moveTo(px - w * 0.3, y - sc * 0.06);
    ctx.quadraticCurveTo(px - w * 0.26, y - domeH * 0.78, px - w * 0.08, y - domeH * 0.94);
    ctx.lineTo(px - w * 0.16, y - domeH * 0.86);
    ctx.quadraticCurveTo(px - w * 0.2, y - domeH * 0.6, px - w * 0.2, y - sc * 0.06);
    ctx.closePath();
    ctx.fill();
    // The mouth rim and the knob.
    ctx.globalAlpha = 0.95 * al;
    ctx.fillStyle = BRASS_LIT;
    ctx.beginPath();
    ctx.ellipse(px, y, w / 2, rimH, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = BRASS_SHADE;
    ctx.fillRect(px - sc * 0.035, y - domeH - sc * 0.14, sc * 0.07, sc * 0.14);
    ctx.fillStyle = BRASS;
    ctx.beginPath();
    ctx.ellipse(px, y - domeH - sc * 0.16, sc * 0.07, sc * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    // Contact: one dull star at the lip — brass on stone, not a
    // detonation. The loudest thing this school says.
    if (seatK >= 1 && t < 0.24) {
      const k = 1 - (t - 0.16) / 0.08;
      ctx.globalAlpha = 0.85 * k;
      ctx.fillStyle = BRASS_LIT;
      ctx.beginPath();
      burstStarPath(ctx, px, py, sc * 0.4, sc * 0.14, 4, 0.3, squash);
      ctx.fill();
      c.glow(c.wx, c.wy, 1.2, 0.5 * k);
    }
    ctx.restore();
  },
};

// ------------------------------------------------------------- red_hour

/**
 * RED_HOUR — "the midnight round."
 * The school capper keeps time in the open: a clock of twelve red
 * ticks rings the caster — position-rooted, so it stands dead still
 * through the whole channel — and the second-hand SWEEPS on the
 * wall clock itself, one full tick per beat. Each beat the hour
 * takes its due at a fresh bearing: a rim gash, a directed spray,
 * and a settled red tick laid at that bearing — by the last beat
 * the ground wears a second clock made entirely of what was spilled.
 */
const red_hour: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const cutA = srand(c.seed ^ 0xc10c4)() * Math.PI * 2;
    // The cut: blood leaves the rim outward at this beat's bearing.
    blood.deployments.spray!(
      m, c.wx + Math.cos(cutA) * c.radius * 0.9, c.wy + Math.sin(cutA) * c.radius * 0.9,
      { dir: cutA, scale: 0.6 });
    // The spilled clock accumulates: a FINE spray of four settled
    // ticks per beat, quartered around the whole ring off this beat's
    // bearing — the second clock wears the full dial, never one clump.
    const spill = srand(c.seed ^ 0xc10c4 ^ 0x5);
    for (let k = 0; k < 4; k++) {
      const a = cutA + (k / 4) * Math.PI * 2 + (spill() - 0.5) * 0.22;
      const rr = c.radius * (0.88 + spill() * 0.14);
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        k === 0 ? c.st.spark : k % 2 === 1 ? c.st.mid : shade(c.st.deep, 12),
        { life: 10, size: 0.03 + spill() * 0.015 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const anchor = rooted(c, 0xc10c4);
    const cutA = srand(c.seed ^ 0xc10c4)() * Math.PI * 2;
    const fade = t < 0.62 ? 1 : 0.5 + 0.5 * ((1 - t) / 0.38); // the clock never fully leaves mid-channel
    ctx.save();
    ctx.lineCap = 'butt';
    // The dial: one deep circle.
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(3, sc * 0.09);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.95, rPx * 0.95 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Twelve ticks, position-rooted jitter — XII stands proud.
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 + (i / 12) * Math.PI * 2;
      const j = (anchor() - 0.5) * 0.04;
      const r0 = rPx * (i === 0 ? 0.8 : 0.86);
      const r1 = rPx * (0.98 + j);
      const p0 = pt(c, r0, a);
      const p1 = pt(c, r1, a);
      ctx.globalAlpha = 0.6 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(2.5, sc * (i === 0 ? 0.09 : 0.07));
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
      ctx.globalAlpha = (i === 0 ? 0.95 : 0.8) * fade;
      ctx.strokeStyle = i === 0 ? st.core : st.mid;
      ctx.lineWidth = Math.max(1.4, sc * (i === 0 ? 0.05 : 0.035));
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    // THE SECOND-HAND: swept by the wall clock — 9.6 s per round,
    // exactly one tick per 800 ms beat, continuous across beats.
    const aHand = -Math.PI / 2 + ((c.now % 9600) / 9600) * Math.PI * 2;
    const tip = pt(c, rPx * 0.78, aHand);
    const tail = pt(c, rPx * 0.16, aHand + Math.PI);
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2.8, sc * 0.08);
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    // The hand's tip runs hot.
    ctx.fillStyle = st.core;
    ctx.fillRect(tip.x - sc * 0.04, tip.y - sc * 0.04, sc * 0.08, sc * 0.08);
    // The hub.
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.07, sc * 0.07 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // THE CUT: this beat's due — a bright gash crossing the rim at
    // the seeded bearing, plus the rim pulse it lets out.
    if (t < 0.45) {
      const k = 1 - t / 0.45;
      const g0 = pt(c, rPx * 0.82, cutA);
      const g1 = pt(c, rPx * 1.08, cutA);
      ctx.globalAlpha = 0.65 * k;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(3, sc * 0.095);
      ctx.beginPath();
      ctx.moveTo(g0.x, g0.y);
      ctx.lineTo(g1.x, g1.y);
      ctx.stroke();
      ctx.globalAlpha = 0.95 * k;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.6, sc * 0.045);
      ctx.beginPath();
      ctx.moveTo(g0.x, g0.y);
      ctx.lineTo(g1.x, g1.y);
      ctx.stroke();
    }
    if (t < 0.3) {
      const k = t / 0.3;
      const r = rPx * (0.6 + 0.5 * k);
      ctx.globalAlpha = (1 - k) * 0.8;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2, sc * 0.055);
      ctx.beginPath();
      ctx.ellipse(px, py, r, r * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.9, (t < 0.25 ? 0.5 : 0.3) * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    // The blade riding the hand's tip: a lifted glint with a short
    // trailing arc — the only part of the clock that leaves the
    // ground plane.
    const aHand = -Math.PI / 2 + ((c.now % 9600) / 9600) * Math.PI * 2;
    const tx = px + Math.cos(aHand) * rPx * 0.78;
    const ty = py + Math.sin(aHand) * rPx * 0.78 * squash - sc * 0.34;
    const die = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    ctx.globalAlpha = 0.55 * die;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, sc * 0.055);
    ctx.beginPath();
    ctx.ellipse(px, py - sc * 0.34, rPx * 0.78, rPx * 0.78 * squash, 0, aHand - 0.4, aHand);
    ctx.stroke();
    ctx.globalAlpha = 0.85 * die;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1.3, sc * 0.032);
    ctx.beginPath();
    ctx.ellipse(px, py - sc * 0.34, rPx * 0.78, rPx * 0.78 * squash, 0, aHand - 0.32, aHand);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * die;
    ctx.fillStyle = st.core;
    ctx.beginPath();
    burstStarPath(ctx, tx, ty, sc * 0.13, sc * 0.05, 4, aHand, 1);
    ctx.fill();
    ctx.restore();
  },
};

export const SNEAK_BREATH_SIGS: Record<string, AbilitySig> = {
  opened_vein,
  threadwork,
  nightshade_kiss,
  quiet_knife,
  redwork,
  gallows_thread,
  widows_draw,
  bloodletting,
  lights_out,
  red_hour,
};
