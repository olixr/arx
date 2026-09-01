/**
 * THE SIGNATURE LAW — the flights wave (THE ARMORY REMEMBERS, wave
 * 7a: the archer's named quivers).
 *
 * Ten flight arts rebuilt ground-up to the three-strata bar. A
 * flight is an arrow that carries a whole world in its fletching,
 * and the world now arrives on all three layers: the painted
 * statement, the matter that falls or flees or settles off it, and
 * THE LASTING MARK — a ring of kiln-fired shards cooling in bands,
 * a stump and its dropped thorns, one feather lying in a snuffed
 * circle of dark.
 *
 * Binding laws as ever: hard edges, save/restore hygiene, squash on
 * ground y-radii, srand determinism, frameDt-gated emission, ≤ ~60
 * path ops per hook per frame. Pulse arts count on bornAt beat
 * parity; field arts accumulate. No centerpiece repeats another's,
 * nor any of this file's former ones (the briar fences its claim,
 * the lark takes the line up, the sky breaks politely, the pond
 * counts the skips, the kiln door opens, the dark opens its wings,
 * the name is read out, the room is strung, the net closes, the
 * storm sets it down — all retired whole).
 *
 * ONE-VOICE stands: fire, frost, storm, and dust speak through the
 * MATTER LIBRARY; year-rings, glass song, dawn's weights, and the
 * loom's weft stay the flights' own.
 */

import { shade } from './tint.js';
import { boltPath, burstStarPath, srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { fire, frost, storm, dust, asMatter } from './matter/index.js';

/** Clamp to 0..1. */
function cl(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * THE LASTING MARK — one settled grain laid deliberately at a world
 * point (the ~10s tertiary stratum).
 */
function lay(
  c: SigCtx, wx: number, wy: number, color: string,
  opts: { life?: number; size?: number; flicker?: number; fade?: string; fadeAt?: number; fade2?: string; fade2At?: number } = {},
): void {
  c.particles.burst(wx, wy, 1, [color], {
    speed: 0.05, life: opts.life ?? 8.5, size: opts.size ?? 0.055,
    gravity: 0, drag: 4, layer: 'ground', flicker: opts.flicker ?? 0,
    fade: opts.fade, fadeAt: opts.fadeAt,
    fade2: opts.fade2, fade2At: opts.fade2At,
  });
}

/**
 * WAKEWOOD — "the tree of years."
 * The arrow takes root and ONE tree lives its decades in seconds:
 * a sapling rises at the strike and ages a year per field beat —
 * trunk thickening in hard steps, a new branch pair snapping out
 * each year, every branch tipped with a thorn — until the field
 * ends and it grays, dropping its thorns all at once. The dropped
 * thorns and the stump's stain stay for nine seconds.
 */
const wakewood: AbilitySig = {
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.88 ? 1 : (1 - t) / 0.12;
    const lifeMs = c.ticks !== undefined ? c.ticks * 50 : 2000;
    const years = Math.min(5, Math.floor((c.age / lifeMs) * 6));
    const yearT = cl(((c.age / lifeMs) * 6 - years) * 3); // fast settle per year
    const gray = t > 0.82;
    const trunkCol = gray ? '#8a8478' : shade(st.mid, -16);
    const leafCol = gray ? '#a8a294' : st.mid;
    ctx.save();
    ctx.lineCap = 'round';
    // Root shade: the claim spreading with age.
    ctx.globalAlpha = 0.35 * fade;
    ctx.fillStyle = shade(st.deep, -10);
    const rootR = sc * (0.3 + years * 0.14);
    ctx.beginPath();
    ctx.ellipse(px, py, rootR, rootR * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // THE TRUNK: thickens one hard step per year.
    const H = sc * (0.5 + years * 0.22 + yearT * 0.1);
    const W = Math.max(2, sc * (0.045 + years * 0.02));
    ctx.globalAlpha = 0.97 * fade;
    ctx.strokeStyle = trunkCol;
    ctx.lineWidth = W;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py - H);
    ctx.stroke();
    // THE BRANCH PAIRS: one pair per year, snapping out with the
    // year's settle, each tipped with a thorn.
    for (let y = 0; y < years + 1; y++) {
      const snap = y < years ? 1 : yearT;
      if (snap <= 0) continue;
      const by = py - H * (0.35 + y * 0.13);
      const L = sc * (0.3 - y * 0.03) * snap;
      const sway = Math.sin(c.now / 300 + y) * 0.06 * (gray ? 0 : 1);
      for (const s of [-1, 1]) {
        const a = -Math.PI / 2 + s * (0.9 - y * 0.08) + sway;
        const tx = px + Math.cos(a) * L;
        const ty = by + Math.sin(a) * L;
        ctx.globalAlpha = 0.95 * fade;
        ctx.strokeStyle = trunkCol;
        ctx.lineWidth = Math.max(1.6, W * 0.55);
        ctx.beginPath();
        ctx.moveTo(px, by);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        // The thorn tip: a hard tick, an opinion.
        if (!gray) {
          ctx.strokeStyle = leafCol;
          ctx.lineWidth = Math.max(1.4, sc * 0.032);
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx + Math.cos(a - s * 0.7) * sc * 0.09, ty + Math.sin(a - s * 0.7) * sc * 0.09);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
    // THE DROP: at the graying, all thorns fall at once (crossing
    // gate) — and the record accumulates every beat before that.
    const tPrev = t - c.frameDt * 1000 / lifeMs;
    if (tPrev < 0.82 && t >= 0.82) {
      for (let k = 0; k < 6; k++) {
        const a = Math.random() * Math.PI * 2;
        lay(c, c.wx + Math.cos(a) * (0.2 + Math.random() * 0.5),
          c.wy + Math.sin(a) * (0.2 + Math.random() * 0.4),
          '#3a4626', { life: 9, size: 0.045 });
      }
      lay(c, c.wx, c.wy, shade(c.st.deep, -14), { life: 9.5, size: 0.075 });
    }
    if (t < 0.8 && Math.random() < c.frameDt * 2) {
      const a = Math.random() * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * 0.3, c.wy + Math.sin(a) * 0.3,
        '#4a5c30', { life: 8.5, size: 0.045 });
    }
  },
  air(c) {
    // Leaf breath off the living crown, gated; none once gray.
    if (c.t < 0.8 && Math.random() < c.frameDt * 7) {
      c.particles.burst(c.wx, c.wy, 1, [c.st.spark, c.st.mid], {
        speed: 0.25, life: 1, size: 0.045, gravity: 0, shape: 'shard', spin: 3,
        z: 0.7 + Math.random() * 0.5, vz: 0.2, zg: 1.4, land: 'settle',
        layer: 'world', shadow: 0, wobble: 0.6, fade: '#4a5c30', fadeAt: 0.5,
      });
    }
  },
};

/**
 * LARKSHOT — "the weight of dawn."
 * Everything on the morning line learns what dawn WEIGHS: gold
 * plumb-bobs lower on threads from above the corridor in sequence,
 * each stamping a disc of light where it touches, until the loaded
 * line visibly BOWS — a shallow sag across the whole band. A line
 * of gold plumb-point stains stays for eight seconds.
 */
const larkshot: AbilitySig = {
  spawn(c) {
    fire.deployments.burst!(asMatter(c), c.wx2, c.wy2, { scale: 0.3 });
    const dx = c.wx2 - c.wx;
    const dy = c.wy2 - c.wy;
    for (let k = 0; k < 5; k++) {
      const f = (k + 0.5) / 5;
      lay(c, c.wx + dx * f, c.wy + dy * f, k % 2 === 0 ? '#ffd98a' : '#c89a3c',
        { life: 8, size: 0.05, fade: '#8a6a2e', fadeAt: 0.45 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2, rPx } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const W = Math.max(rPx, sc * 0.28);
    ctx.save();
    // The lit corridor: a warm band, brightening as weights land.
    const loaded = cl(t / 0.6);
    ctx.globalAlpha = (0.25 + loaded * 0.2) * fade;
    ctx.fillStyle = shade(st.mid, 14);
    ctx.beginPath();
    ctx.moveTo(px + nx * W, py + ny * W * squash);
    ctx.lineTo(px2 + nx * W, py2 + ny * W * squash);
    ctx.lineTo(px2 - nx * W, py2 - ny * W * squash);
    ctx.lineTo(px - nx * W, py - ny * W * squash);
    ctx.closePath();
    ctx.fill();
    // Touch discs where each plumb has landed.
    for (let k = 0; k < 5; k++) {
      const born = 0.08 + k * 0.1;
      const u = cl((t - born) / 0.08);
      if (u <= 0) continue;
      const f = (k + 0.5) / 5;
      ctx.globalAlpha = 0.8 * fade;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.6, sc * 0.038);
      ctx.beginPath();
      ctx.ellipse(px + dx * f, py + dy * f, sc * 0.16 * u, sc * 0.16 * u * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const dx = px2 - px;
    const dy = py2 - py;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE BOWING LINE: the morning line hangs over the corridor and
    // SAGS as the weights load it — a shallow curve deepening.
    const loaded = cl(t / 0.6);
    const sag = sc * 0.22 * loaded;
    const lift = sc * 1.15;
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = '#ffd98a';
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.moveTo(px, py - lift);
    ctx.quadraticCurveTo(px + dx * 0.5, py + dy * 0.5 - lift + sag * 2, px2, py2 - lift);
    ctx.stroke();
    // THE PLUMBS: five gold bobs lower on threads in sequence, each
    // a small diamond with a bright thread above it.
    for (let k = 0; k < 5; k++) {
      const born = 0.02 + k * 0.1;
      const u = cl((t - born) / 0.14);
      if (u <= 0) continue;
      const f = (k + 0.5) / 5;
      const lineY = py + dy * f - lift + Math.sin(f * Math.PI) * sag * 2 * 0.5;
      const bobY = lineY + (py + dy * f - lineY) * u * (2 - u);
      const bx = px + dx * f;
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = '#fff0c0';
      ctx.lineWidth = Math.max(1.2, sc * 0.026);
      ctx.beginPath();
      ctx.moveTo(bx, lineY);
      ctx.lineTo(bx, bobY - sc * 0.07);
      ctx.stroke();
      const g = sc * 0.07;
      ctx.globalAlpha = 0.97 * fade;
      ctx.fillStyle = k % 2 === 0 ? '#ffd98a' : '#fff0c0';
      ctx.beginPath();
      ctx.moveTo(bx, bobY - g);
      ctx.lineTo(bx + g * 0.7, bobY - g * 0.3);
      ctx.lineTo(bx, bobY + g * 0.4);
      ctx.lineTo(bx - g * 0.7, bobY - g * 0.3);
      ctx.closePath();
      ctx.fill();
      // The touch: one soft star as it meets the ground.
      const uPrev = cl((t - c.frameDt * 1000 / 480 - born) / 0.14);
      if (uPrev < 1 && u >= 1) {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#fff0c0';
        ctx.beginPath();
        burstStarPath(ctx, bx, py + dy * f, sc * 0.14, sc * 0.05, 4, k, c.squash);
        ctx.fill();
      }
    }
    if (t < 0.12) c.glow((c.wx + c.wx2) / 2, (c.wy + c.wy2) / 2, c.radius + 1, 0.5 * (1 - t / 0.12));
    ctx.restore();
    void st;
  },
};

/**
 * GLASSHAIL — "the rung splinter."
 * The bow rings once and each answering splinter lands STILL
 * RINGING: the glass shard stands point-first and concentric
 * micro-rings ripple UP it — the note climbing the glass — until
 * the highest ring cracks it and the top slides cleanly off. Two
 * glass grains, base and slid top, twinkle for eight seconds.
 */
const glasshail: AbilitySig = {
  spawn(c) {
    frost.deployments.shatter!(asMatter(c), c.wx, c.wy, { scale: 0.4 });
    lay(c, c.wx, c.wy, '#e8f4fa', { life: 8, size: 0.05, flicker: 0.35 });
    lay(c, c.wx + 0.16, c.wy + 0.08, '#bcd8f0', { life: 8, size: 0.045, flicker: 0.3 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    if (t > 0.5) return;
    // The landing kiss: one hard little ring.
    const k = 1 - t / 0.5;
    ctx.save();
    ctx.globalAlpha = 0.7 * k;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.6, sc * 0.038);
    const rr = sc * (0.1 + (1 - k) * 0.2);
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE SPLINTER: stands point-first from the first frame — a
    // slim glass blade with a pale core line.
    const crack = cl((t - 0.55) / 0.1);
    const H = sc * 0.6;
    const topSlide = crack * sc * 0.3;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    // Base half (always standing until fade).
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = '#bcd8f0';
    ctx.lineWidth = Math.max(2.4, sc * 0.06);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py - H * 0.55);
    ctx.stroke();
    // Top half: slides off along the crack plane once rung apart.
    ctx.globalAlpha = 0.9 * fade * (1 - crack * 0.4);
    ctx.beginPath();
    ctx.moveTo(px + topSlide, py - H * 0.55 - crack * sc * 0.06);
    ctx.lineTo(px + topSlide, py - H - crack * sc * 0.06);
    ctx.stroke();
    ctx.globalAlpha = 0.97 * fade;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.2, sc * 0.026);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py - H * 0.55);
    ctx.moveTo(px + topSlide, py - H * 0.55 - crack * sc * 0.06);
    ctx.lineTo(px + topSlide, py - H - crack * sc * 0.06);
    ctx.stroke();
    // THE RINGING: micro-rings ripple UP the standing glass (0→
    // 0.55) — each a small ellipse climbing the blade.
    if (t < 0.55) {
      for (let k = 0; k < 3; k++) {
        const u = ((t * 2.2 + k * 0.33) % 1);
        const y = py - H * u;
        ctx.globalAlpha = (1 - u) * 0.9;
        ctx.strokeStyle = k % 2 === 0 ? '#ffffff' : st.core;
        ctx.lineWidth = Math.max(1.2, sc * 0.026);
        ctx.beginPath();
        ctx.ellipse(px, y, sc * (0.06 + u * 0.05), sc * 0.028, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // The crack's note: one glint the frame it lets go.
    const crackPrev = cl((t - c.frameDt * 1000 / 780 - 0.55) / 0.1);
    if (crackPrev <= 0 && crack > 0) {
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      burstStarPath(ctx, px, py - H * 0.55, sc * 0.14, sc * 0.05, 4, 0.4, 1);
      ctx.fill();
      c.glow(c.wx, c.wy, 0.5, 0.35);
    }
    ctx.restore();
  },
};

/**
 * STORMSKIP — "the pond overhead."
 * The sky is the pond: at each skip an inverted crown-splash blooms
 * UPSIDE-DOWN from an invisible water ceiling above the strike —
 * droplets falling UP into it — while the skip's wake rings spread
 * across that ceiling edge-on. A wet spot and three fallen-back
 * drops stay under each skip for seven seconds.
 */
const stormskip: AbilitySig = {
  spawn(c) {
    storm.deployments.impact!(asMatter(c), c.wx2, c.wy2, { scale: 0.55 });
    lay(c, c.wx2, c.wy2, shade(c.st.deep, -8), { life: 7, size: 0.065 });
    const rand = srand(c.seed ^ 0x5517);
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI * 2;
      lay(c, c.wx2 + Math.cos(a) * 0.2, c.wy2 + Math.sin(a) * 0.2,
        shade(c.st.deep, -6), { life: 7, size: 0.045 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px2, py2 } = c;
    const fade = 1 - t;
    // The strike's floor: a small hard ring under the skip point.
    ctx.save();
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1.6, sc * 0.038);
    const rr = sc * (0.12 + t * 0.24);
    ctx.beginPath();
    ctx.ellipse(px2, py2, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px2, py2 } = c;
    const ceilY = py2 - sc * 1.6;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    ctx.lineCap = 'round';
    // THE CEILING WAKE: two flattened rings spreading edge-on along
    // the invisible water plane overhead.
    for (let k = 0; k < 2; k++) {
      const u = cl((t - k * 0.12) / 0.5);
      if (u <= 0 || u >= 1) continue;
      const rr = sc * (0.14 + u * 0.7);
      ctx.globalAlpha = (1 - u) * 0.95 * fade;
      ctx.strokeStyle = k === 0 ? '#dff0f2' : st.mid;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.ellipse(px2, ceilY, rr, rr * 0.16, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // THE INVERTED CROWN: the splash hangs mouth-down from the
    // ceiling — five spikes pointing DOWN, drawn upside-down.
    const bloom = cl(t / 0.2);
    if (bloom > 0 && t < 0.55) {
      const decay = cl((t - 0.35) / 0.2);
      const W = sc * 0.42 * bloom;
      const H = sc * 0.34 * bloom * (1 - decay);
      ctx.globalAlpha = 0.97 * (1 - decay) * fade;
      ctx.strokeStyle = '#dff0f2';
      ctx.lineWidth = Math.max(2.2, sc * 0.055);
      ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const f = k / 4 - 0.5;
        ctx.moveTo(px2 + f * W * 2, ceilY);
        ctx.lineTo(px2 + f * W * 2.3, ceilY + H * (0.7 + Math.abs(f) * 0.5));
      }
      ctx.stroke();
      // Crown beads at each spike's low tip.
      ctx.fillStyle = st.core;
      for (let k = 0; k < 5; k++) {
        const f = k / 4 - 0.5;
        const g = Math.max(1.6, sc * 0.04);
        ctx.fillRect(px2 + f * W * 2.3 - g / 2, ceilY + H * (0.7 + Math.abs(f) * 0.5) - g / 2, g, g);
      }
    }
    // DROPLETS FALL UP: three beads rise from the strike into the
    // ceiling and vanish through it.
    for (let k = 0; k < 3; k++) {
      const born = 0.06 + k * 0.09;
      const u = cl((t - born) / 0.3);
      if (u <= 0 || u >= 1) continue;
      const bx = px2 + (k - 1) * sc * 0.14;
      const by = py2 - sc * 0.3 + (ceilY - py2 + sc * 0.3) * u;
      ctx.globalAlpha = (1 - u * 0.5) * 0.95 * fade;
      ctx.fillStyle = '#dff0f2';
      ctx.beginPath();
      ctx.ellipse(bx, by, sc * 0.035, sc * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // The skip flash: the stone touching, once.
    if (t < 0.1) {
      const k = 1 - t / 0.1;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = '#fff9e0';
      ctx.beginPath();
      burstStarPath(ctx, px2, py2 - sc * 0.2, sc * 0.22, sc * 0.08, 4, 0.3, 1);
      ctx.fill();
      c.glow(c.wx2, c.wy2, 0.8, 0.5 * k);
    }
    ctx.restore();
  },
};

/**
 * CHARFALL — "the fired vessel."
 * It comes down a kiln — and the kiln sends its finished work: a
 * glowing clay vessel falls and SHATTERS at the mark, four curved
 * shards landing in a ring, each glowing kiln-hot and cooling in
 * hard pottery bands. The shard ring stays for nine seconds,
 * white → orange → terracotta.
 */
const charfall: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    fire.deployments.burst!(asMatter(c), c.wx, c.wy, { scale: 0.8 });
    // The shard ring's record: four curved pairs, cooling long.
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      for (let s = 0; s < 2; s++) {
        lay(c, c.wx + Math.cos(a + s * 0.3) * c.radius * 0.5,
          c.wy + Math.sin(a + s * 0.3) * c.radius * 0.5,
          '#fff1d8', {
            life: 9.5, size: 0.055, flicker: 0.25,
            fade: '#f0a45a', fadeAt: 0.18, fade2: '#8a4a32', fade2At: 0.55,
          });
      }
    }
  },
  ground(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const heat = t < 0.35 ? '#fff1d8' : t < 0.6 ? '#ffb36a' : '#c07048';
    ctx.save();
    ctx.lineCap = 'round';
    // THE SHARDS: four curved pottery pieces in a ring — each an
    // arc segment with thickness (double stroke), landing at 0.14
    // and cooling in place.
    const land = cl((t - 0.1) / 0.08);
    if (land > 0) {
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.4;
        const p = { x: px + Math.cos(a) * rPx * 0.5, y: py + Math.sin(a) * rPx * 0.5 * squash };
        ctx.globalAlpha = 0.9 * fade;
        ctx.strokeStyle = shade('#8a4a32', -12);
        ctx.lineWidth = Math.max(4, sc * 0.1);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, sc * 0.2, sc * 0.14 * squash, a, 0.4, Math.PI - 0.4);
        ctx.stroke();
        ctx.globalAlpha = 0.95 * fade;
        ctx.strokeStyle = heat;
        ctx.lineWidth = Math.max(2, sc * 0.05);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, sc * 0.2, sc * 0.14 * squash, a, 0.5, Math.PI - 0.5);
        ctx.stroke();
      }
    }
    // The scorch heart where the vessel burst.
    ctx.globalAlpha = 0.7 * fade;
    ctx.fillStyle = shade(st.deep, -14);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.2, rPx * 0.2 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.45 * fade * (t < 0.5 ? 1 : 0.6));
  },
  air(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, px, py } = c;
    ctx.save();
    // THE VESSEL: falls whole (0→0.1) — a kiln-hot amphora
    // silhouette, glowing through its own clay.
    if (t < 0.1) {
      const u = t / 0.1;
      const y = py - sc * 2.2 * (1 - u * u);
      const W = sc * 0.2;
      const H = sc * 0.34;
      ctx.globalAlpha = 0.97;
      ctx.fillStyle = '#ffb36a';
      ctx.beginPath();
      ctx.moveTo(px, y - H);
      ctx.quadraticCurveTo(px + W, y - H * 0.5, px + W * 0.6, y);
      ctx.lineTo(px - W * 0.6, y);
      ctx.quadraticCurveTo(px - W, y - H * 0.5, px, y - H);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff1d8';
      ctx.beginPath();
      ctx.ellipse(px - W * 0.2, y - H * 0.55, W * 0.24, H * 0.2, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // The neck: a small dark mouth at the top.
      ctx.fillStyle = shade('#8a4a32', -10);
      ctx.fillRect(px - W * 0.18, y - H - sc * 0.05, W * 0.36, sc * 0.06);
    }
    // The burst: one wide kiln flash at the shatter.
    if (t > 0.09 && t < 0.22) {
      const k = 1 - (t - 0.09) / 0.13;
      ctx.globalAlpha = 0.97 * k;
      ctx.fillStyle = '#fff1d8';
      ctx.beginPath();
      burstStarPath(ctx, px, py - sc * 0.1, sc * 0.44, sc * 0.16, 6, c.now / 300, c.squash);
      ctx.fill();
      c.glow(c.wx, c.wy, 1.3, 0.8 * k);
    }
    ctx.restore();
    void st;
  },
};

/**
 * HUSHFALL — "the snuffed lamp."
 * The feather arrives and the light goes OUT: a circle of dim
 * stamps at the wound — a lamp snuffed — and inside the dark the
 * only visible thing is one pale feather outline rocking down in
 * absolute slow motion. No flash. No sound. The feather's outline
 * and the dim stain stay for eight seconds.
 */
const hushfall: AbilitySig = {
  spawn(c) {
    lay(c, c.wx, c.wy, shade('#8d84a8', -18), { life: 8, size: 0.08 });
    lay(c, c.wx + 0.06, c.wy + 0.04, '#c8c2d8', { life: 8.5, size: 0.05 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    // THE SNUFF: a soft dark disc — layered dim, no hard flash
    // anywhere. The anti-impact.
    ctx.save();
    ctx.globalAlpha = 0.45 * fade;
    ctx.fillStyle = shade(st.deep, -20);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.44, sc * 0.3 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.3 * fade;
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.6, sc * 0.42 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    ctx.save();
    ctx.lineCap = 'round';
    // THE FEATHER: a pale outline rocking down through the dark —
    // the slowest fall in the game, three seesaws over the wire's
    // whole life.
    const u = cl(t / 0.9);
    const y = py - sc * 0.85 + u * sc * 0.8;
    const rock = Math.sin(u * Math.PI * 3) * 0.5;
    const drift = Math.sin(u * Math.PI * 1.5) * sc * 0.12;
    ctx.save();
    ctx.translate(px + drift, y);
    ctx.rotate(rock);
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = '#c8c2d8';
    ctx.lineWidth = Math.max(1.4, sc * 0.032);
    // The outline: shaft + one smooth vane curve each side.
    ctx.beginPath();
    ctx.moveTo(-sc * 0.16, sc * 0.02);
    ctx.lineTo(sc * 0.14, -sc * 0.02);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-sc * 0.12, 0);
    ctx.quadraticCurveTo(0, -sc * 0.08, sc * 0.12, -sc * 0.02);
    ctx.moveTo(-sc * 0.12, 0.5);
    ctx.quadraticCurveTo(0, sc * 0.06, sc * 0.12, -sc * 0.01);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
    void st;
  },
};

/**
 * QUARRY_CALL — "the marked heart."
 * The called shot names its quarry: a hunting-horn brand paints at
 * the wound and PULSES like a heartbeat — the target's heart made
 * visible and spoken for — while three low wing-glyphs flee the
 * surrounding grass in one synchronized burst: the woods vacating.
 * The horn-brand stain stays for nine seconds.
 */
const quarry_call: AbilitySig = {
  spawn(c) {
    // The brand's record + the vacated grass.
    lay(c, c.wx, c.wy, '#c84a5a', { life: 9, size: 0.06, flicker: 0.3 });
    lay(c, c.wx + 0.14, c.wy - 0.05, shade('#c84a5a', -16), { life: 8.5, size: 0.045 });
    // The fleeing: three low wing pairs burst outward at once.
    const rand = srand(c.seed ^ 0x9c11);
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * 0.8, c.wy + Math.sin(a) * 0.8,
        1, ['#8a8478', '#6a6458'], {
          speed: 2.4, life: 0.7, size: 0.06, gravity: 0,
          dir: a, spread: 0.2, shape: 'streak',
          z: 0.3, vz: 0.35, zg: 0.8, land: 'die', layer: 'world', shadow: 0,
        });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    if (t > 0.4) return;
    // The naming: a red ring presses once under the quarry.
    const k = 1 - t / 0.4;
    ctx.save();
    ctx.globalAlpha = 0.75 * k;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    const rr = sc * (0.34 - (1 - k) * 0.1);
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const hy = py - sc * 0.65;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    ctx.save();
    ctx.lineCap = 'round';
    // The arrival: one lane streak, hard and brief.
    if (t < 0.07) {
      const k = 1 - t / 0.07;
      const a = srand(c.seed ^ 0x9c12)() * Math.PI * 2;
      ctx.globalAlpha = 0.95 * k;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.4, sc * 0.06);
      ctx.beginPath();
      ctx.moveTo(px - Math.cos(a) * sc * 2.4, hy - Math.sin(a) * sc * 1.2);
      ctx.lineTo(px, hy);
      ctx.stroke();
    }
    // THE BRAND: a hunting horn — one curved crescent body with a
    // flared mouth — pulsing on a heartbeat clock (lub-dub), each
    // beat swelling the brand and glowing the mouth.
    const born = cl((t - 0.06) / 0.08);
    if (born > 0) {
      const beat = c.now % 700;
      const pulse = beat < 120 ? 1.18 : beat < 240 ? 1.08 : 1;
      const R = sc * 0.26 * born * pulse;
      ctx.globalAlpha = 0.6 * fade;
      ctx.strokeStyle = shade(st.deep, -10);
      ctx.lineWidth = Math.max(4, sc * 0.1);
      ctx.beginPath();
      ctx.ellipse(px, hy, R, R * 0.85, 0.4, Math.PI * 0.2, Math.PI * 1.5);
      ctx.stroke();
      ctx.globalAlpha = 0.97 * fade;
      ctx.strokeStyle = pulse > 1.1 ? '#ff8a9a' : st.mid;
      ctx.lineWidth = Math.max(2.2, sc * 0.055);
      ctx.beginPath();
      ctx.ellipse(px, hy, R, R * 0.85, 0.4, Math.PI * 0.2, Math.PI * 1.5);
      ctx.stroke();
      // The mouth flare: a small cone at the horn's open end.
      const ma = 0.4 + Math.PI * 1.5;
      const mx = px + Math.cos(ma) * R;
      const my = hy + Math.sin(ma) * R * 0.85;
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = pulse > 1.1 ? '#fff0f0' : st.spark;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + Math.cos(ma + 0.5) * sc * 0.13, my + Math.sin(ma + 0.5) * sc * 0.13);
      ctx.lineTo(mx + Math.cos(ma - 0.5) * sc * 0.13, my + Math.sin(ma - 0.5) * sc * 0.13);
      ctx.closePath();
      ctx.fill();
      if (pulse > 1.1) c.glow(c.wx, c.wy, 0.7, 0.3);
    }
    ctx.restore();
  },
};

/**
 * PLUCKED_CHORD — "the three strings."
 * Each pulse strings and PLUCKS one harp-string across the room —
 * the first low and long, the second higher, the third highest and
 * shortest, stacked in the air — each snapping into a vibration
 * lens that decays to straight while its ring rolls out. Three
 * parallel grain-lines stay on the ground for eight seconds.
 */
const plucked_chord: AbilitySig = {
  spawn(c) {
    const beat = Math.floor((c.now - c.age) / 450) % 3;
    const off = (beat - 1) * 0.4;
    for (let k = 0; k < 4; k++) {
      lay(c, c.wx - 0.9 + k * 0.6, c.wy + off, '#c8b8f0',
        { life: 8, size: 0.04, flicker: 0.2 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = 1 - t;
    // The note's ring: one per pluck, rolling out.
    const rr = rPx * (0.25 + cl(t / 0.7) * 0.7);
    ctx.save();
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, rPx } = c;
    const beat = Math.floor((c.now - c.age) / 450) % 3;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    ctx.lineCap = 'round';
    // THE STRING: strung across the circle at its pitch height —
    // lower string longer and lower, higher shorter and higher.
    const H = sc * (0.35 + beat * 0.3);
    const L = rPx * (0.95 - beat * 0.2);
    const y = py - H;
    // The pluck: a decaying vibration — the string drawn as two
    // bowed lines converging to straight.
    const vib = Math.max(0, 1 - t * 2.2);
    const bow = Math.sin(c.now / 30) * sc * 0.08 * vib;
    for (const s of [1, -1]) {
      ctx.globalAlpha = (s === 1 ? 0.97 : 0.5) * fade;
      ctx.strokeStyle = s === 1 ? st.core : st.mid;
      ctx.lineWidth = Math.max(1.6, sc * 0.038);
      ctx.beginPath();
      ctx.moveTo(px - L, y);
      ctx.quadraticCurveTo(px, y + bow * s, px + L, y);
      ctx.stroke();
    }
    // The string's anchor pins.
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = st.spark;
    for (const s of [-1, 1]) {
      const g = Math.max(2.2, sc * 0.055);
      ctx.fillRect(px + s * L - g / 2, y - g / 2, g, g);
    }
    // The pluck point: a bright pick mark at the strike, brief.
    if (t < 0.14) {
      const k = 1 - t / 0.14;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, y, sc * 0.16, sc * 0.06, 4, beat, 1);
      ctx.fill();
      c.glow(c.wx, c.wy, 0.8, 0.4 * k);
    }
    ctx.restore();
  },
};

/**
 * NIGHTWEFT — "the shuttle passes."
 * Weaving, at combat speed: a shuttle-point flies three passes
 * across the circle, each leaving a taut weft thread spanning it —
 * then the whole weave CINCHES: every thread bows toward center at
 * once and vanishes, dragging the catch with it. The bowed
 * thread-lines stay printed for eight seconds.
 */
const nightweft: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x91f7);
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI;
      for (let s = 0; s < 3; s++) {
        const f = (s - 1) * 0.5;
        lay(c, c.wx + Math.cos(a) * c.radius * 0.6 * f, c.wy + Math.sin(a) * c.radius * 0.6 * f,
          k === 0 ? '#c8cee8' : '#9aa2c8', { life: 8, size: 0.04 });
      }
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x91f7);
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    const cinch = cl((t - 0.6) / 0.2);
    ctx.save();
    ctx.lineCap = 'round';
    // THE WEFT: three threads, each laid by its pass (0.05+k*0.18),
    // spanning the circle at a seeded angle; at the cinch they all
    // bow toward center together.
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI;
      const born = 0.05 + k * 0.18;
      const laid = cl((t - born) / 0.14);
      if (laid <= 0) continue;
      const x0 = px - Math.cos(a) * rPx * 0.85;
      const y0 = py - Math.sin(a) * rPx * 0.85 * squash;
      const x1 = px + Math.cos(a) * rPx * 0.85;
      const y1 = py + Math.sin(a) * rPx * 0.85 * squash;
      const hx = x0 + (x1 - x0) * laid;
      const hy = y0 + (y1 - y0) * laid;
      // The thread: taut until the cinch bows it inward.
      const bowX = px * cinch + ((x0 + x1) / 2) * (1 - cinch);
      const bowY = py * cinch + ((y0 + y1) / 2) * (1 - cinch);
      ctx.globalAlpha = 0.9 * fade * (1 - cinch * 0.5);
      ctx.strokeStyle = k === 1 ? '#c8cee8' : st.mid;
      ctx.lineWidth = Math.max(1.8, sc * 0.042);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(bowX, bowY, hx, hy);
      ctx.stroke();
      // THE SHUTTLE: the flying point laying this thread.
      if (laid < 1) {
        ctx.globalAlpha = 0.97;
        ctx.fillStyle = st.core;
        const g = Math.max(2.5, sc * 0.06);
        ctx.save();
        ctx.translate(hx, hy);
        ctx.rotate(a);
        ctx.fillRect(-g, -g * 0.4, g * 2, g * 0.8);
        ctx.restore();
      }
    }
    // THE CINCH: one contracting bright ring as the net closes.
    if (cinch > 0) {
      const rr = rPx * 0.85 * (1 - cinch * 0.8);
      ctx.globalAlpha = 0.9 * (1 - cinch) * fade;
      ctx.strokeStyle = '#c8cee8';
      ctx.lineWidth = Math.max(2.2, sc * 0.055);
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (cinch < 0.3) c.glow(c.wx, c.wy, c.radius * 0.7, 0.4 * (1 - cinch / 0.3));
    }
    ctx.restore();
  },
  air(c) {
    // Night motes drift off the fresh threads, gated and few.
    if (c.t < 0.6 && Math.random() < c.frameDt * 7) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.random() * c.radius * 0.7;
      c.particles.burst(c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        1, ['#c8cee8', c.st.mid], {
          speed: 0.1, life: 0.8, size: 0.04, gravity: 0, shape: 'glint',
          z: 0.1, vz: 0.4, zg: 0, land: 'none', layer: 'world', shadow: 0, wobble: 0.3,
        });
    }
  },
};

/**
 * THE_ANVIL — "the forge visits."
 * The storm sets its anvil down where you pointed: a flat-topped
 * cloud-block lowers in three heavy steps — each a jolt with its
 * own dust ring — seats onto the circle, and takes ONE hammer-bolt
 * on its face; the ring of that blow travels down through the iron
 * into the ground wave. The anvil's flat press-print stays in
 * grains for nine seconds.
 */
const the_anvil: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    dust.deployments.slam!(asMatter(c), c.wx, c.wy, { scale: 1 });
    storm.deployments.impact!(asMatter(c), c.wx, c.wy, { scale: 0.7 });
    // The press-print: a flat-topped trapezoid of grains.
    for (let k = 0; k < 4; k++) {
      const f = (k / 3 - 0.5) * 1.4;
      lay(c, c.wx + f * c.radius * 0.6, c.wy - c.radius * 0.28, '#aebcd8', { life: 9, size: 0.05 });
    }
    for (let k = 0; k < 5; k++) {
      const f = (k / 4 - 0.5) * 1.8;
      lay(c, c.wx + f * c.radius * 0.6, c.wy + c.radius * 0.3, shade('#aebcd8', -16), { life: 9, size: 0.05 });
    }
  },
  ground(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    ctx.save();
    // Step-jolt dust rings: one per descent step (0.08/0.2/0.32).
    for (let k = 0; k < 3; k++) {
      const born = 0.08 + k * 0.12;
      const u = cl((t - born) / 0.2);
      if (u <= 0 || u >= 1) continue;
      const rr = rPx * (0.5 + k * 0.16) * (0.5 + u * 0.5);
      ctx.globalAlpha = (1 - u) * 0.6 * fade;
      ctx.strokeStyle = shade(st.deep, -6);
      ctx.lineWidth = Math.max(2.6, sc * 0.065);
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // THE NOTE THROUGH THE IRON: after the hammer (0.55), the ground
    // wave leaves from under the anvil.
    if (t > 0.55) {
      const u = cl((t - 0.55) / 0.4);
      const rr = rPx * (0.6 + u * 0.5);
      ctx.globalAlpha = (1 - u) * 0.9 * fade;
      ctx.strokeStyle = '#dfe8ff';
      ctx.lineWidth = Math.max(2.6, sc * 0.065);
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE ANVIL: lowers in three hard steps (no glide — the forge
    // does not float), seats at 0.44. Flat top, waisted body, horn.
    const step = t < 0.08 ? 0 : t < 0.2 ? 1 : t < 0.32 ? 2 : 3;
    const stepT = step === 3 ? 1 : cl((t - (step === 0 ? 0 : 0.08 + (step - 1) * 0.12)) / 0.04);
    const height = sc * (1.7 - step * 0.5 - stepT * 0.5 + (step === 3 ? 0.5 : 0));
    const seated = t >= 0.44;
    const y = py - Math.max(0, height) - sc * 0.3;
    const W = rPx * 0.6;
    const bodyH = sc * 0.5;
    ctx.globalAlpha = 0.92 * fade;
    // The block: flat top plane, waisted sides, a horn to the left.
    ctx.fillStyle = shade('#7a88a8', -14);
    ctx.beginPath();
    ctx.moveTo(px - W, y - bodyH);
    ctx.lineTo(px + W, y - bodyH);
    ctx.lineTo(px + W * 0.6, y);
    ctx.lineTo(px - W * 0.6, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#aebcd8';
    ctx.fillRect(px - W, y - bodyH - sc * 0.14, W * 2, sc * 0.14);
    // The horn: a curved beak off the left edge.
    ctx.strokeStyle = '#aebcd8';
    ctx.lineWidth = Math.max(3.4, sc * 0.09);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px - W, y - bodyH - sc * 0.07);
    ctx.quadraticCurveTo(px - W - sc * 0.3, y - bodyH - sc * 0.08, px - W - sc * 0.42, y - bodyH - sc * 0.2);
    ctx.stroke();
    // THE HAMMER-BOLT: one strike onto the anvil FACE at 0.5 — not
    // the ground; the iron takes it and passes it down.
    if (seated && t > 0.5 && t < 0.64) {
      const k = 1 - (t - 0.5) / 0.14;
      const flicker = 0.8 + 0.2 * Math.sin(c.now / 40);
      ctx.globalAlpha = 0.97 * k * flicker;
      ctx.strokeStyle = '#fff9e0';
      ctx.lineWidth = Math.max(2.4, sc * 0.06);
      ctx.beginPath();
      boltPath(ctx, px + W * 0.2, y - bodyH - sc * 2, px + W * 0.1, y - bodyH - sc * 0.14,
        c.seed ^ Math.floor(c.now / 90), sc * 0.16);
      ctx.stroke();
      ctx.globalAlpha = 0.97 * k;
      ctx.fillStyle = '#fff9e0';
      ctx.beginPath();
      burstStarPath(ctx, px + W * 0.1, y - bodyH - sc * 0.14, sc * 0.3, sc * 0.11, 5, c.now / 300, 1);
      ctx.fill();
      c.glow(c.wx, c.wy, c.radius, 0.7 * k);
    }
    // The seat: dust and a jolt star the frame it lands.
    const tPrev = t - c.frameDt * 1000 / 780;
    if (tPrev < 0.44 && t >= 0.44) {
      dust.deployments.kick!(asMatter(c), c.wx, c.wy, { scale: 0.8 });
    }
    ctx.restore();
    void squash; void st;
  },
};

// -------------------------------------------------------- the registry

/** The flight signatures, keyed by ability id. */
export const FLIGHTS_SIGS: Record<string, AbilitySig> = {
  wakewood,
  larkshot,
  glasshail,
  stormskip,
  charfall,
  hushfall,
  quarry_call,
  plucked_chord,
  nightweft,
  the_anvil,
};
