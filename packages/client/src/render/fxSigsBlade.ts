/**
 * THE SIGNATURE LAW — the blade wave.
 *
 * Thirteen bespoke set-pieces for the sword-art roster, composed on
 * top of the v3 grammar in the renderer's three strata. Same binding
 * laws as fxSignatures.ts: hard edges, save/restore hygiene, squash
 * on the ground, srand-deterministic geometry, frameDt-gated emission,
 * ≤60 path ops per hook per frame. The signature must SAY the
 * mechanic — a stagger splits, a bleed leaves barbs, an oath cinches.
 * No centerpiece here repeats another's, nor any other file's.
 *
 * Wire kinds served: the arc arts read c.dir; Riptide rides 'dash'
 * (heart = departure, far end = arrival); Storm Brand rides 'bolt'
 * (far end = the strike point, one fx per hop); Quicksilver's flurry
 * arrives as three 'arc' beats, so its signature is one beat's worth;
 * Starfall lands as 'blast' after its telegraph; the vow is a 'buff'.
 * Every hook stays graceful for any kind — far-end fields collapse
 * to the heart when a cast carries no second point.
 */

import { shade } from './rig.js';
import { srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';

/** Screen point r px from the heart along ground angle a. */
function pt(c: SigCtx, r: number, a: number): { x: number; y: number } {
  return { x: c.px + Math.cos(a) * r, y: c.py + Math.sin(a) * r * c.squash };
}

/**
 * SUNDERING_CHOP — "the kerf."
 * An axe answer, not a sword one: the committed edge falls straight
 * out of the sky onto the aim line and leaves a KERF — one dead-
 * straight groove whose two lit lips are shoved apart while the
 * split runs ahead of the steel. The stagger is the ground giving.
 */
const sundering_chop: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x61);
    // Chips leap sideways out of the cut — matter the edge displaced.
    for (let k = 0; k < 6; k++) {
      const f = 0.3 + rand() * 0.65;
      c.particles.burst(
        c.wx + Math.cos(c.dir) * c.radius * f,
        c.wy + Math.sin(c.dir) * c.radius * f * c.squash,
        1, [c.st.deep, c.st.mid, '#6a6375'], {
          speed: 2.0 + rand() * 1.2, life: 0.5, size: 0.09, gravity: 8,
          dir: c.dir + (rand() < 0.5 ? 1 : -1) * (0.9 + rand() * 0.5),
          spread: 0.3, shape: 'shard', spin: 11,
        },
      );
    }
    // The halves take the shove: dust rolls off both flanks at once.
    for (const side of [-1, 1]) {
      c.particles.burst(
        c.wx + Math.cos(c.dir) * c.radius * 0.55,
        c.wy + Math.sin(c.dir) * c.radius * 0.55 * c.squash,
        2, ['#4a4252', c.st.deep], {
          speed: 1.1, life: 0.8, size: 0.12, gravity: 0.4, drag: 1.7,
          grow: 0.28, dir: c.dir + (side * Math.PI) / 2, spread: 0.4,
          shape: 'puff', wobble: 0.4, ground: true,
        },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    const rand = srand(c.seed ^ 0x62);
    const fade = t < 0.5 ? 1 : (1 - t) / 0.5;
    const part = Math.min(1, t / 0.45); // the halves slide apart
    ctx.save();
    ctx.lineCap = 'butt';
    // The kerf: one straight groove down the aim — an axe cut.
    const p0 = pt(c, rPx * 0.2, dir);
    const p1 = pt(c, rPx * 0.98, dir);
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, sc * 0.09);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    // The parted halves: a lit lip each side, shoved apart over life.
    for (const side of [-1, 1]) {
      const off = (sc * 0.045 + sc * 0.11 * part) * side;
      ctx.globalAlpha = 0.5 * fade;
      ctx.strokeStyle = side < 0 ? st.mid : shade(st.mid, -14);
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.moveTo(p0.x - Math.sin(dir) * off, p0.y + Math.cos(dir) * off * squash);
      ctx.lineTo(p1.x - Math.sin(dir) * off, p1.y + Math.cos(dir) * off * squash);
      ctx.stroke();
    }
    // The split runs ahead of the steel: two forks past the far tip.
    ctx.globalAlpha = 0.6 * fade * part;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1.5, sc * 0.045);
    for (let k = 0; k < 2; k++) {
      const fa = dir + (k === 0 ? 1 : -1) * (0.35 + rand() * 0.25);
      const fp = pt(c, rPx * (1.0 + 0.2 * part + rand() * 0.1), fa);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(fp.x, fp.y);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, dir, rPx } = c;
    const hit = pt(c, rPx * 0.55, dir);
    ctx.save();
    if (t < 0.22) {
      // The committed edge: a straight blade-line drops onto the cut —
      // no wind-up shown, only the verdict arriving.
      const dt = t / 0.22;
      const drop = (1 - dt) * sc * 1.5;
      const h = sc * (0.95 - 0.35 * dt);
      const w = Math.max(2, sc * 0.07);
      ctx.globalAlpha = 0.35 + 0.6 * dt;
      ctx.fillStyle = st.mid;
      ctx.fillRect(hit.x - w / 2, hit.y - drop - h, w, h);
      ctx.fillStyle = st.core;
      ctx.fillRect(hit.x - w * 0.22, hit.y - drop - h, w * 0.44, h);
    } else if (t < 0.36) {
      // The landing splat: one flat white tick where the edge bit.
      const ft = 1 - (t - 0.22) / 0.14;
      ctx.globalAlpha = ft * 0.9;
      ctx.fillStyle = st.core;
      const w = sc * 0.3 * (1.4 - ft * 0.4);
      ctx.fillRect(hit.x - w / 2, hit.y - Math.max(2, sc * 0.05), w, Math.max(3, sc * 0.09));
    }
    ctx.restore();
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.55, c.wy + Math.sin(dir) * c.radius * 0.55, c.radius * 0.6, 0.35 * (1 - t));
  },
};

/**
 * THORN_LASH — "the barb row."
 * The briar uncoils tip-first across the fan — a kinked green cane
 * that dies fast, but the barbs it planted DON'T: a row of thorn Vs
 * outlives the swing, each welling red at the point. The bleed is
 * what stayed in the wound.
 */
const thorn_lash: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x65);
    // The rake: leaves and sap fleck off the whole sweep at once.
    for (let k = 0; k < 6; k++) {
      const a = c.dir + (k / 5 - 0.5) * 1.2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * (0.5 + rand() * 0.4),
        c.wy + Math.sin(a) * c.radius * (0.5 + rand() * 0.4) * c.squash,
        1, [c.st.mid, c.st.deep, c.st.spark], {
          speed: 1.6, life: 0.7, size: 0.09, gravity: 3, dir: a,
          spread: 0.4, shape: 'shard', spin: 6, wobble: 0.5, fade: c.st.deep,
        },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, sc, dir, rPx } = c;
    const rand = srand(c.seed ^ 0x66);
    const half = 0.6;
    const n = 7;
    const reach = Math.min(1, t / 0.35); // the cane uncoils tip-first
    const cane = t < 0.5 ? 1 : Math.max(0, (0.68 - t) / 0.18);
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    ctx.save();
    ctx.lineCap = 'butt';
    let prev: { x: number; y: number } | null = null;
    for (let k = 0; k <= n; k++) {
      const f = k / n;
      const a = dir - half + f * 2 * half;
      // The coil: the cane's radius breathes station to station.
      const rr = rPx * (0.72 + 0.14 * Math.sin(f * 9 + (c.seed % 7)));
      const p = pt(c, rr, a);
      if (f <= reach) {
        // The cane segment — it browns out and dies under the barbs.
        if (prev && cane > 0) {
          ctx.globalAlpha = 0.7 * cane;
          ctx.strokeStyle = k % 2 === 0 ? st.mid : st.deep;
          ctx.lineWidth = Math.max(2, sc * 0.05);
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
        // The barb: a V planted at the station — it OUTLIVES the cane.
        if (k > 0 && k < n) {
          const side = k % 2 === 0 ? 1 : -1;
          const ba = a + side * 1.1 + (rand() - 0.5) * 0.3;
          const bl = sc * (0.1 + rand() * 0.05);
          const tipX = p.x + Math.cos(ba) * bl;
          const tipY = p.y + Math.sin(ba) * bl * c.squash;
          ctx.globalAlpha = 0.85 * fade;
          ctx.strokeStyle = st.deep;
          ctx.lineWidth = Math.max(1.5, sc * 0.035);
          ctx.beginPath();
          ctx.moveTo(p.x - Math.cos(a) * bl * 0.4, p.y - Math.sin(a) * bl * 0.4 * c.squash);
          ctx.lineTo(tipX, tipY);
          ctx.lineTo(p.x + Math.cos(a) * bl * 0.4, p.y + Math.sin(a) * bl * 0.4 * c.squash);
          ctx.stroke();
          // The point wells red once the cane is gone — the bleed.
          const well = Math.min(1, Math.max(0, (t - 0.35 - rand() * 0.2) / 0.15));
          if (well > 0) {
            ctx.globalAlpha = well * fade;
            ctx.fillStyle = '#c4372a';
            const g = Math.max(2, sc * 0.05);
            ctx.fillRect(tipX - g / 2, tipY - g / 2, g, g);
          }
        }
      }
      prev = p;
    }
    ctx.restore();
  },
  air(c) {
    // The barbs drip: red beads tick off the row, late and unhurried.
    if (c.t > 0.45 && Math.random() < c.frameDt * 8) {
      const a = c.dir + (Math.random() - 0.5) * 1.2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.72,
        c.wy + Math.sin(a) * c.radius * 0.72 * c.squash,
        1, ['#c4372a', '#6a1518'], {
          speed: 0.4, life: 0.4, size: 0.05, gravity: 6, fade: '#6a1518',
        },
      );
    }
  },
};

/**
 * QUICKSILVER — "the mercury dart."
 * Each beat of the flurry is one liquid-metal thrust: a hair-thin
 * lance that runs out and reels back inside the beat, weeping bright
 * beads off its tip — and the beads don't scatter, they POOL: one
 * shivering drop of mercury sits where the point reached, then is
 * gone before the next thrust lands.
 */
const quicksilver: AbilitySig = {
  spawn(c) {
    // The tip weeps: beads split off the point of the thrust.
    c.particles.burst(
      c.wx + Math.cos(c.dir) * c.radius * 0.9,
      c.wy + Math.sin(c.dir) * c.radius * 0.9 * c.squash - 0.35,
      4, ['#ffffff', c.st.mid], {
        speed: 1.4, life: 0.35, size: 0.07, gravity: 5, dir: c.dir,
        spread: 0.7, shape: 'glint',
      },
    );
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    // The pool: the shed beads gather into ONE mercury drop at the
    // reach point — it shivers on its own clock and drains away.
    if (t < 0.35) return;
    const pool = Math.max(0, 1 - (t - 0.35) / 0.65);
    const p = pt(c, rPx * 0.88, dir);
    const shiver = 1 + 0.18 * Math.sin(c.now / 55 + c.seed);
    ctx.save();
    ctx.globalAlpha = 0.85 * pool;
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, sc * 0.11 * pool * shiver, sc * 0.11 * pool * shiver * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5 * pool;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, sc * 0.17 * pool, sc * 0.17 * pool * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, dir, rPx } = c;
    const lift = sc * 0.42;
    // The lance runs out (t<0.35) and reels back (t>0.6) — a thrust
    // that exists as a moving span, never a standing line.
    const ext = Math.min(1, t / 0.35);
    const ret = t > 0.6 ? Math.min(1, (t - 0.6) / 0.35) : 0;
    if (ret >= ext) return;
    const o = pt(c, rPx * 0.12, dir);
    const e = pt(c, rPx * 0.95, dir);
    const ax = o.x + (e.x - o.x) * ret;
    const ay = o.y + (e.y - o.y) * ret - lift;
    const bx = o.x + (e.x - o.x) * ext;
    const by = o.y + (e.y - o.y) * ext - lift;
    ctx.save();
    ctx.lineCap = 'butt';
    // Bone-pale shaft under a white forward half — quicksilver sheen.
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1, sc * 0.025);
    ctx.beginPath();
    ctx.moveTo((ax + bx) / 2, (ay + by) / 2);
    ctx.lineTo(bx, by);
    ctx.stroke();
    // The guard: one small cross tick at the origin of the thrust.
    if (ret <= 0) {
      const g = sc * 0.09;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(o.x - Math.sin(dir) * g, o.y + Math.cos(dir) * g - lift);
      ctx.lineTo(o.x + Math.sin(dir) * g, o.y - Math.cos(dir) * g - lift);
      ctx.stroke();
    }
    ctx.restore();
    // Beads shed off the running tip while the lance extends.
    if (ext < 1 && Math.random() < c.frameDt * 20) {
      c.particles.burst(
        c.wx + Math.cos(dir) * c.radius * 0.95 * ext,
        c.wy + Math.sin(dir) * c.radius * 0.95 * ext * c.squash - 0.35,
        1, ['#ffffff', st.mid], {
          speed: 0.8, life: 0.3, size: 0.05, gravity: 6, shape: 'glint',
        },
      );
    }
  },
};

/**
 * RIPTIDE — "the undertow."
 * The dash reads as water going OUT: foam combs stand across the
 * wake and drag BACKWARD toward the departure, the drained bed
 * thins behind them, and the arrival throws its spray against the
 * direction of travel. The cold rides the receding water.
 */
const riptide: AbilitySig = {
  spawn(c) {
    const ang = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    // The arrival splashes AGAINST the run — tide over the shoulder.
    c.particles.burst(c.wx2, c.wy2 - 0.3, 6, [c.st.core, c.st.mid, '#ffffff'], {
      speed: 2.6, life: 0.35, size: 0.06, gravity: 3, dir: ang + Math.PI,
      spread: 0.5, shape: 'streak',
    });
    // Cold hangs where the body passed: brine glints down the line.
    c.particles.burst(
      (c.wx + c.wx2) / 2, (c.wy + c.wy2) / 2 - 0.4,
      4, ['#ffffff', c.st.core], {
        speed: 0.5, life: 0.8, size: 0.09, gravity: 0.4, drag: 2.0, shape: 'glint',
      },
    );
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy);
    if (len < 1) return;
    const ux = dx / len;
    const uy = dy / len;
    const fade = 1 - t;
    ctx.save();
    ctx.lineCap = 'butt';
    // The drained bed: one thin dark line the water left behind.
    ctx.globalAlpha = 0.4 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1.5, sc * 0.045);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px2, py2);
    ctx.stroke();
    // Foam combs: four crests spanning the wake, each sliding back
    // toward the departure — the tide going out, drawn as motion.
    for (let k = 0; k < 4; k++) {
      let f = (0.25 + k * 0.22) - t * 0.85;
      if (f <= 0.02) continue;
      f = Math.min(f, 0.98);
      const cx = px + dx * f;
      const cy = py + dy * f;
      const w = sc * (0.16 + 0.06 * (k % 2)) * (0.5 + f * 0.5);
      const bow = w * 0.6; // the comb bows toward the arrival
      ctx.globalAlpha = 0.65 * fade * f;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(cx - uy * -w, cy + ux * -w * squash);
      ctx.lineTo(cx + ux * bow, cy + uy * bow * squash);
      ctx.lineTo(cx - uy * w, cy + ux * w * squash);
      ctx.stroke();
      // The white lip rides the crest's leading bow.
      ctx.globalAlpha = 0.8 * fade * f;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, sc * 0.025);
      ctx.beginPath();
      ctx.moveTo(cx - uy * -w * 0.55, cy + ux * -w * 0.55 * squash);
      ctx.lineTo(cx + ux * bow * 1.1, cy + uy * bow * 1.1 * squash);
      ctx.lineTo(cx - uy * w * 0.55, cy + ux * w * 0.55 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    // Chill mist beads off the receding water while the wake lives.
    if (Math.random() < c.frameDt * 10 * (1 - c.t)) {
      const f = Math.random();
      c.particles.burst(
        c.wx + (c.wx2 - c.wx) * f,
        c.wy + (c.wy2 - c.wy) * f - 0.2,
        1, [c.st.mid, c.st.core], {
          speed: 0.4, life: 0.7, size: 0.1, gravity: 0.3, drag: 1.6,
          grow: 0.18, shape: 'puff', fade: '#ffffff', wobble: 0.4,
        },
      );
    }
  },
};

/**
 * CINDER_ARC — "the ember rind."
 * The cut leaves a crescent rind of coals hanging exactly where the
 * blade passed — and the rind burns DOWN like a fuse: a white front
 * eats horn to horn, and every segment it crosses flares, drops as
 * a dying coal, and is gone. The burn is watching it happen.
 */
const cinder_arc: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x71);
    // The swing torches the fan: tongues stand where the edge went.
    for (let k = 0; k < 5; k++) {
      const a = c.dir + (k / 4 - 0.5) * 1.1;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * (0.6 + rand() * 0.25),
        c.wy + Math.sin(a) * c.radius * (0.6 + rand() * 0.25) * c.squash,
        1, [c.st.mid, c.st.core], {
          speed: 0.7, life: 0.5, size: 0.12, gravity: -3.0, shape: 'lick',
          flicker: 0.3, fade: c.st.deep, wobble: 0.5,
        },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, px, py, rPx } = c;
    // Scorch dashes under the hanging rind — the heat's shadow.
    const fade = 1 - t;
    ctx.save();
    ctx.globalAlpha = 0.35 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.setLineDash([sc * 0.09, sc * 0.08]);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.85, rPx * 0.85 * squash, 0, dir - 0.55, dir + 0.55);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, dir, px, py, rPx } = c;
    const lift = sc * 0.42;
    const half = 0.55;
    const n = 7;
    ctx.save();
    ctx.lineCap = 'butt';
    for (let k = 0; k < n; k++) {
      const a0 = dir - half + (k / n) * 2 * half;
      const a1 = dir - half + ((k + 1) / n) * 2 * half;
      const burnT = ((k + 0.5) / n) * 0.8; // when the front eats it
      if (t < burnT) {
        // Unburnt rind: an ember band waiting its turn.
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = st.mid;
        ctx.lineWidth = Math.max(2.5, sc * 0.09);
        ctx.beginPath();
        ctx.ellipse(px, py - lift, rPx * 0.85, rPx * 0.85 * squash, 0, a0, a1);
        ctx.stroke();
        // The front flares white on the segment it's about to take.
        if (burnT - t < 0.09) {
          ctx.globalAlpha = 0.95;
          ctx.strokeStyle = st.core;
          ctx.lineWidth = Math.max(1.5, sc * 0.045);
          ctx.beginPath();
          ctx.ellipse(px, py - lift, rPx * 0.85, rPx * 0.85 * squash, 0, a0, a1);
          ctx.stroke();
        }
      } else {
        // The spent segment drops as a coal — flaring, falling, dark.
        const drop = t - burnT;
        const da = Math.max(0, 1 - drop / 0.3);
        if (da <= 0) continue;
        const am = (a0 + a1) / 2;
        const gx = px + Math.cos(am) * rPx * 0.85;
        const gy = py - lift + Math.sin(am) * rPx * 0.85 * squash + drop * sc * 2.2;
        const g = Math.max(2, sc * 0.07 * da);
        ctx.globalAlpha = da;
        ctx.fillStyle = drop < 0.1 ? st.spark : st.deep;
        ctx.fillRect(gx - g / 2, gy - g / 2, g, g);
      }
    }
    ctx.restore();
    // Sparks pop off the eating front — the fuse spits as it goes.
    if (t < 0.8 && Math.random() < c.frameDt * 16) {
      const fa = dir - half + (t / 0.8) * 2 * half;
      c.particles.burst(
        c.wx + Math.cos(fa) * c.radius * 0.85,
        c.wy + Math.sin(fa) * c.radius * 0.85 * c.squash - 0.4,
        1, [st.spark, st.core], {
          speed: 1.2, life: 0.3, size: 0.05, gravity: 4, shape: 'streak', flicker: 0.5,
        },
      );
    }
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.6, c.wy + Math.sin(dir) * c.radius * 0.6, c.radius * 0.7, 0.35 * (1 - t));
  },
};

/**
 * WINTERS_EDGE — "the icicle fringe."
 * The slow cut freezes the air it moved through: a pale arc line
 * hangs at reach and grows a fringe of icicle teeth beneath it,
 * each on its own clock — then the whole comb RELEASES at once
 * and falls to glitter. The cold stays where the teeth dropped.
 */
const winters_edge: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x75);
    // The cut shatters what it touched: facets and hanging twinkle.
    for (let k = 0; k < 4; k++) {
      const a = c.dir + (k / 3 - 0.5) * 1.0;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * (0.55 + rand() * 0.3),
        c.wy + Math.sin(a) * c.radius * (0.55 + rand() * 0.3) * c.squash,
        1, [c.st.mid, c.st.core, '#ffffff'], {
          speed: 1.8, life: 0.5, size: 0.08, gravity: 6, dir: a,
          spread: 0.4, shape: 'shard', spin: 10, fade: c.st.core,
        },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, px, py, rPx } = c;
    // Rime: the ground under the fringe pales in a dashed band.
    const fade = 1 - t;
    ctx.save();
    ctx.globalAlpha = 0.45 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.setLineDash([sc * 0.06, sc * 0.1]);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.88, rPx * 0.88 * squash, 0, dir - 0.5, dir + 0.5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, dir, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x76);
    const lift = sc * 0.45;
    const half = 0.5;
    const release = 0.62; // the comb lets go here
    const lineA = t < release ? 1 : Math.max(0, 1 - (t - release) / 0.2);
    ctx.save();
    // The frozen swing-line: pale over white, hanging at reach.
    if (lineA > 0) {
      ctx.globalAlpha = 0.7 * lineA;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2, sc * 0.055);
      ctx.beginPath();
      ctx.ellipse(px, py - lift, rPx * 0.88, rPx * 0.88 * squash, 0, dir - half, dir + half);
      ctx.stroke();
      ctx.globalAlpha = 0.85 * lineA;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, sc * 0.02);
      ctx.beginPath();
      ctx.ellipse(px, py - lift - sc * 0.03, rPx * 0.88, rPx * 0.88 * squash, 0, dir - half, dir + half);
      ctx.stroke();
    }
    // The fringe: six teeth grow beneath the line, then all drop.
    for (let k = 0; k < 6; k++) {
      const a = dir - half + ((k + 0.5) / 6) * 2 * half;
      const bx = px + Math.cos(a) * rPx * 0.88;
      const by = py - lift + Math.sin(a) * rPx * 0.88 * squash;
      const full = sc * (0.14 + rand() * 0.14);
      const grow = Math.min(1, t / (0.3 + rand() * 0.25));
      const drop = t > release ? (t - release) * sc * 2.4 : 0;
      const da = t > release ? Math.max(0, 1 - (t - release) / 0.28) : 1;
      if (da <= 0) continue;
      const len = full * grow;
      const w = Math.max(1.5, sc * 0.035);
      ctx.globalAlpha = 0.85 * da;
      ctx.fillStyle = k % 2 === 0 ? '#ffffff' : st.core;
      ctx.beginPath();
      ctx.moveTo(bx - w, by + drop);
      ctx.lineTo(bx + w, by + drop);
      ctx.lineTo(bx, by + drop + len);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // The fall glitters: glints wink where the teeth let go.
    if (t > release && Math.random() < c.frameDt * 14) {
      const a = dir + (Math.random() - 0.5) * 1.0;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.88,
        c.wy + Math.sin(a) * c.radius * 0.88 * c.squash - 0.15,
        1, ['#ffffff', st.core], {
          speed: 0.4, life: 0.5, size: 0.09, gravity: 1.2, shape: 'glint',
        },
      );
    }
  },
};

/**
 * REAPERS_ARC — "the windrow."
 * The harvest-wide sweep MOWS: felled stalk-ticks lie combed flat
 * across the sector in the order the blade crossed them, and the
 * cut matter rakes up into a windrow — a piled crescent row at
 * full reach. A few stalks are red-tipped; the marsh took its tithe.
 */
const reapers_arc: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x81);
    // Chaff flies off the sweep, fluttering down all across the fan.
    for (let k = 0; k < 6; k++) {
      const a = c.dir + (k / 5 - 0.5) * 1.6;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * (0.4 + rand() * 0.5),
        c.wy + Math.sin(a) * c.radius * (0.4 + rand() * 0.5) * c.squash,
        1, [c.st.mid, c.st.deep, c.st.spark], {
          speed: 1.4, life: 0.9, size: 0.09, gravity: 1.4, drag: 1.6,
          dir: a, spread: 0.5, shape: 'shard', spin: 5, wobble: 0.7, fade: c.st.deep,
        },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    const rand = srand(c.seed ^ 0x82);
    const half = 0.8;
    const swept = -half + 2 * half * Math.min(1, t / 0.3); // the blade's clock
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    ctx.save();
    ctx.lineCap = 'butt';
    // Felled stalks: ticks lying combed along the swing, appearing
    // in the order the edge crossed them — a mown swath, not debris.
    for (let k = 0; k < 9; k++) {
      const a = dir + (rand() - 0.5) * 1.5;
      const rr = rPx * (0.3 + rand() * 0.5);
      const tilt = (rand() - 0.5) * 0.5;
      if (a - dir > swept) continue;
      const p = pt(c, rr, a);
      const la = a + Math.PI / 2 + tilt; // lying along the sweep
      const len = sc * (0.12 + rand() * 0.07);
      ctx.globalAlpha = 0.6 * fade;
      ctx.strokeStyle = k % 2 === 0 ? st.deep : st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(la) * len, p.y - Math.sin(la) * len * squash);
      ctx.lineTo(p.x + Math.cos(la) * len, p.y + Math.sin(la) * len * squash);
      ctx.stroke();
      // The tithe: every third stalk cut something that bled.
      if (k % 3 === 0) {
        ctx.globalAlpha = 0.8 * fade;
        ctx.fillStyle = '#c4372a';
        const g = Math.max(2, sc * 0.04);
        ctx.fillRect(p.x + Math.cos(la) * len - g / 2, p.y + Math.sin(la) * len * squash - g / 2, g, g);
      }
    }
    // The windrow: cut matter raked into a piled row at full reach.
    for (let k = 0; k < 6; k++) {
      const a = dir - half * 0.85 + (k / 5) * 2 * half * 0.85;
      if (a - dir > swept) continue;
      const p = pt(c, rPx * 0.95, a);
      const la = a + Math.PI / 2;
      const len = sc * (0.1 + (k % 2) * 0.04);
      ctx.globalAlpha = 0.7 * fade;
      ctx.strokeStyle = k % 2 === 0 ? shade(st.deep, -10) : st.deep;
      ctx.lineWidth = Math.max(2.5, sc * 0.07);
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(la) * len, p.y - Math.sin(la) * len * squash);
      ctx.lineTo(p.x + Math.cos(la) * len, p.y + Math.sin(la) * len * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    // Late chaff keeps sifting down over the swath while it settles.
    if (c.t < 0.7 && Math.random() < c.frameDt * 9) {
      const a = c.dir + (Math.random() - 0.5) * 1.5;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.6,
        c.wy + Math.sin(a) * c.radius * 0.6 * c.squash - 0.5,
        1, [c.st.mid, c.st.deep], {
          speed: 0.3, life: 0.7, size: 0.07, gravity: 1.0, drag: 1.2,
          shape: 'shard', spin: 4, wobble: 0.6,
        },
      );
    }
  },
};

/**
 * RED_HARVEST — "the threshing ring."
 * Every edge at once: a circle of upright blade-slivers flashes at
 * the rim, and what remains is a threshing floor — a dark circular
 * groove crossed by radial nicks that each well red on their own
 * clock, while beads of the harvest roll the groove like grain.
 */
const red_harvest: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x85);
    // Steel flashes outward at the rim; the first red follows it.
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + rand() * 0.4;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.75,
        c.wy + Math.sin(a) * c.radius * 0.75 * c.squash,
        1, [c.st.spark, '#c4372a', c.st.mid], {
          speed: 1.8, life: 0.45, size: 0.07, gravity: 5, dir: a,
          spread: 0.3, shape: 'streak', fade: '#6a1518',
        },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x86);
    const fade = t < 0.65 ? 1 : (1 - t) / 0.35;
    ctx.save();
    ctx.lineCap = 'butt';
    // The groove: the circle the edges cut, dark and exact.
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, sc * 0.06);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.78, rPx * 0.78 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Eight radial nicks cross the groove — each wells red on its
    // own clock. The tally runs red one mark at a time.
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + (c.seed % 5) * 0.25;
      const i0 = pt(c, rPx * 0.66, a);
      const i1 = pt(c, rPx * 0.9, a);
      ctx.globalAlpha = 0.65 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.moveTo(i0.x, i0.y);
      ctx.lineTo(i1.x, i1.y);
      ctx.stroke();
      const well = Math.min(1, Math.max(0, (t - 0.12 - rand() * 0.35) / 0.18));
      if (well > 0) {
        ctx.globalAlpha = 0.8 * well * fade;
        ctx.strokeStyle = '#c4372a';
        ctx.lineWidth = Math.max(1.5, sc * 0.03);
        ctx.beginPath();
        ctx.moveTo(i0.x, i0.y);
        ctx.lineTo(i0.x + (i1.x - i0.x) * well, i0.y + (i1.y - i0.y) * well);
        ctx.stroke();
      }
    }
    // Beads roll the groove like grain on the threshing floor.
    ctx.fillStyle = '#c4372a';
    for (let j = 0; j < 3; j++) {
      const a = j * 2.1 + t * (1.8 + j * 0.5) * (j % 2 === 0 ? 1 : -1);
      const p = pt(c, rPx * 0.78, a);
      const g = Math.max(2, sc * 0.045);
      ctx.globalAlpha = 0.85 * fade;
      ctx.fillRect(p.x - g / 2, p.y - g / 2, g, g);
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    // The instant of every-edge-at-once: upright slivers at the rim.
    if (t < 0.16) {
      const ft = 1 - t / 0.16;
      ctx.save();
      ctx.fillStyle = st.core;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + (c.seed % 5) * 0.25;
        const bx = px + Math.cos(a) * rPx * 0.78;
        const by = py + Math.sin(a) * rPx * 0.78 * squash;
        const h = sc * 0.45 * ft;
        ctx.globalAlpha = 0.9 * ft;
        ctx.fillRect(bx - Math.max(1, sc * 0.02), by - h, Math.max(2, sc * 0.04), h);
      }
      ctx.restore();
    }
    // The floor keeps giving: red drips tick off the nicks, late.
    if (t > 0.35 && Math.random() < c.frameDt * 8) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.78,
        c.wy + Math.sin(a) * c.radius * 0.78 * c.squash,
        1, ['#c4372a', '#6a1518'], {
          speed: 0.5, life: 0.4, size: 0.05, gravity: 6, up: true, fade: '#6a1518',
        },
      );
    }
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.3 * (1 - t));
  },
};

/**
 * STORM_BRAND — "the seared sigil."
 * Each hop of the bolt BRANDS its target: a jagged storm-rune seared
 * into the air at the strike point that re-strobes with aftershock,
 * while a pale return-stroke flickers back up the hop line — the
 * charge going home the way it came.
 */
const storm_brand: AbilitySig = {
  spawn(c) {
    // The strike spits: hot slivers off the point of contact.
    c.particles.burst(c.wx2, c.wy2 - 0.4, 6, [c.st.spark, c.st.core, '#ffffff'], {
      speed: 2.6, life: 0.3, size: 0.06, gravity: 4, shape: 'streak', flicker: 0.6,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px2, py2 } = c;
    const rand = srand(c.seed ^ 0x91);
    const fade = 1 - t;
    ctx.save();
    ctx.lineCap = 'butt';
    // The foot of the strike: a scorch pool and three earthing forks.
    ctx.globalAlpha = 0.4 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px2, py2, sc * 0.28, sc * 0.28 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1.5, sc * 0.03);
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI * 2;
      const r1 = sc * (0.3 + rand() * 0.25);
      const kink = a + (rand() - 0.5) * 0.8;
      ctx.beginPath();
      ctx.moveTo(px2, py2);
      ctx.lineTo(px2 + Math.cos(a) * r1 * 0.55, py2 + Math.sin(a) * r1 * 0.55 * squash);
      ctx.lineTo(px2 + Math.cos(kink) * r1, py2 + Math.sin(kink) * r1 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const rand = srand(c.seed ^ 0x92);
    ctx.save();
    ctx.lineCap = 'butt';
    // The return stroke: a pale offset jag flickers BACK up the hop
    // line — the charge leaving the way it arrived.
    if (t < 0.25 && (px !== px2 || py !== py2)) {
      const ra = (1 - t / 0.25) * 0.55;
      const mx = (px + px2) / 2 + (rand() - 0.5) * sc * 0.3;
      const my = (py + py2) / 2 - sc * 0.35 + (rand() - 0.5) * sc * 0.3;
      ctx.globalAlpha = ra * (0.6 + 0.4 * Math.sin(c.now / 24));
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1, sc * 0.02);
      ctx.beginPath();
      ctx.moveTo(px2, py2 - sc * 0.35);
      ctx.lineTo(mx, my);
      ctx.lineTo(px, py - sc * 0.35);
      ctx.stroke();
    }
    // The brand: a jagged storm-rune hanging at the strike point,
    // re-strobing as the aftershock walks it.
    const strobe = (0.55 + 0.45 * Math.sin(c.now / 38 + c.seed)) * (1 - t * 0.7);
    const s = sc * 0.3;
    const bx = px2;
    const by = py2 - sc * 0.55;
    const j1 = (rand() - 0.5) * s * 0.5;
    const j2 = (rand() - 0.5) * s * 0.5;
    ctx.globalAlpha = strobe;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.moveTo(bx - s * 0.35, by - s * 0.6);
    ctx.lineTo(bx + j1, by - s * 0.15);
    ctx.lineTo(bx - s * 0.15 + j2, by + s * 0.1);
    ctx.lineTo(bx + s * 0.35, by + s * 0.6);
    ctx.stroke();
    // The white heart of the mark rides its middle stroke.
    ctx.globalAlpha = strobe * 0.9;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, sc * 0.02);
    ctx.beginPath();
    ctx.moveTo(bx + j1, by - s * 0.15);
    ctx.lineTo(bx - s * 0.15 + j2, by + s * 0.1);
    ctx.stroke();
    ctx.restore();
    // Static ticks off the brand while it holds.
    if (Math.random() < c.frameDt * 12 * (1 - t)) {
      c.particles.burst(c.wx2, c.wy2 - 0.5, 1, [st.spark, st.core], {
        speed: 1.0, life: 0.25, size: 0.04, gravity: 2, shape: 'streak', flicker: 0.7,
      });
    }
    c.glow(c.wx2, c.wy2, 0.8, 0.4 * (1 - t));
  },
};

/**
 * KINGS_DECREE — "the court rail."
 * The decree draws the boundary of the court: a gilded octagonal
 * rail snaps taut at full radius — overshooting once, settling like
 * struck metal — with finials at every post, while ejection bars
 * hurl outward past it and a coronet flashes over the king's head.
 * Everything beyond the rail has been dismissed.
 */
const kings_decree: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x95);
    // The court empties: gold flung outward, dust where it stood.
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + rand() * 0.4;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.5,
        c.wy + Math.sin(a) * c.radius * 0.5 * c.squash,
        1, [c.st.spark, c.st.mid], {
          speed: 3.0, life: 0.5, size: 0.08, gravity: 5, dir: a,
          spread: 0.2, shape: 'shard', spin: 8, trail: 8, trailColor: c.st.deep,
        },
      );
    }
    c.particles.burst(c.wx, c.wy, 4, ['#4a4252', c.st.deep], {
      speed: 1.0, life: 0.9, size: 0.13, gravity: 0.4, drag: 1.6,
      grow: 0.3, shape: 'puff', wobble: 0.4, ground: true,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    // The rail's radius: out fast, one overshoot, then dead taut.
    const s =
      t < 0.2 ? (t / 0.2) * 1.07
      : t < 0.34 ? 1.07 - 0.07 * ((t - 0.2) / 0.14)
      : 1;
    const rr = rPx * 0.95 * s;
    if (rr < 2) return;
    ctx.save();
    ctx.lineCap = 'butt';
    // The octagonal rail — gold over a white sighting line.
    const base = (c.seed % 5) * 0.2;
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.5, sc * 0.07);
    ctx.beginPath();
    for (let k = 0; k <= 8; k++) {
      const a = base + (k / 8) * Math.PI * 2;
      const x = px + Math.cos(a) * rr;
      const y = py + Math.sin(a) * rr * squash;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Finials: a gold stud crowns every post of the rail.
    ctx.fillStyle = st.spark;
    for (let k = 0; k < 8; k++) {
      const a = base + (k / 8) * Math.PI * 2;
      const g = Math.max(2.5, sc * 0.055);
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillRect(px + Math.cos(a) * rr - g / 2, py + Math.sin(a) * rr * squash - g / 2, g, g);
    }
    // Ejection bars: the dismissed, still leaving.
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    for (let k = 0; k < 6; k++) {
      const a = base + 0.35 + (k / 6) * Math.PI * 2;
      const r0 = rr * (1.05 + t * 0.5);
      const r1 = r0 + rPx * 0.18 * (1 - t * 0.5);
      ctx.globalAlpha = 0.7 * (1 - t);
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0 * squash);
      ctx.lineTo(px + Math.cos(a) * r1, py + Math.sin(a) * r1 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    // The coronet: a five-point flash over the caster's head, rising
    // as it fades — the authority behind the decree, briefly visible.
    if (t >= 0.35) return;
    const ft = 1 - t / 0.35;
    const rise = (1 - ft) * sc * 0.3;
    const cw = sc * 0.42;
    const cy = py - sc * 1.55 - rise;
    ctx.save();
    ctx.globalAlpha = 0.9 * ft;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1.5, sc * 0.045);
    ctx.beginPath();
    ctx.moveTo(px - cw / 2, cy);
    for (let k = 0; k < 5; k++) {
      const fx0 = -cw / 2 + ((k + 0.5) / 5) * cw;
      const fx1 = -cw / 2 + ((k + 1) / 5) * cw;
      ctx.lineTo(px + fx0, cy - sc * (k === 2 ? 0.26 : 0.16));
      ctx.lineTo(px + fx1, cy);
    }
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius, 0.5 * (1 - t));
  },
};

/**
 * SUNBURST — "the thrown shadows."
 * Dawn happens HERE, so the light behaves like a sun at ground
 * level: the circle floods gold while every point on the rim casts
 * a long OUTWARD shadow-wedge — darkness thrown by the flash — and
 * a glare cross stands over the heart until the light spends itself.
 */
const sunburst: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xa1);
    // The flash ignites the air over the circle: tongues and motes.
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.4,
        c.wy + Math.sin(a) * c.radius * 0.4 * c.squash - 0.2,
        1, [c.st.mid, c.st.core], {
          speed: 0.8, life: 0.5, size: 0.12, gravity: -3.2, shape: 'lick',
          flicker: 0.3, fade: c.st.deep, wobble: 0.5,
        },
      );
    }
    c.particles.burst(c.wx, c.wy - 0.5, 5, [c.st.spark, '#ffffff'], {
      speed: 1.2, life: 0.7, size: 0.1, gravity: 0.4, drag: 1.8, shape: 'glint',
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    ctx.save();
    // The flood: the circle fills with morning gold, then cools.
    if (t < 0.45) {
      const ft = 1 - t / 0.45;
      ctx.globalAlpha = 0.3 * ft;
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.95, rPx * 0.95 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5 * ft;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.35 * ft, rPx * 0.35 * ft * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      // The thrown shadows: darkness cast OUTWARD from the rim by a
      // sun standing at ground level — wedges that widen with reach.
      const base = (c.seed % 5) * 0.3;
      ctx.fillStyle = '#241d2c';
      for (let k = 0; k < 7; k++) {
        const a = base + (k / 7) * Math.PI * 2;
        const p0 = pt(c, rPx * 0.95, a);
        const reach = rPx * (0.35 + 0.25 * (k % 2)) * (1 - ft * 0.4);
        const w0 = sc * 0.05;
        const w1 = w0 * 2.1;
        ctx.globalAlpha = 0.35 * ft;
        ctx.beginPath();
        ctx.moveTo(p0.x - Math.sin(a) * w0, p0.y + Math.cos(a) * w0 * squash);
        ctx.lineTo(p0.x + Math.cos(a) * reach - Math.sin(a) * w1, p0.y + (Math.sin(a) * reach + Math.cos(a) * w1) * squash);
        ctx.lineTo(p0.x + Math.cos(a) * reach + Math.sin(a) * w1, p0.y + (Math.sin(a) * reach - Math.cos(a) * w1) * squash);
        ctx.lineTo(p0.x + Math.sin(a) * w0, p0.y - Math.cos(a) * w0 * squash);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 1.1, 0.6 * (1 - t));
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    // The glare cross: two crossed slivers stand over the heart,
    // pulsing like a sun stared at too long.
    if (t >= 0.5) return;
    const ft = 1 - t / 0.5;
    const pulse = 0.7 + 0.3 * Math.sin(c.now / 70 + c.seed);
    const L = sc * 0.8 * ft * pulse;
    const w = Math.max(1.5, sc * 0.05);
    const cy = py - sc * 0.55;
    ctx.save();
    ctx.globalAlpha = 0.9 * ft;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px - w / 2, cy - L, w, L * 2);
    ctx.fillRect(px - L, cy - w / 2, L * 2, w);
    ctx.globalAlpha = 0.6 * ft;
    ctx.fillStyle = st.spark;
    const d = L * 0.55;
    ctx.fillRect(px - w * 0.4 - d, cy - w * 0.4 - d * 0.5, w * 0.8, w * 0.8);
    ctx.fillRect(px - w * 0.4 + d, cy - w * 0.4 - d * 0.5, w * 0.8, w * 0.8);
    ctx.restore();
  },
};

/**
 * STARFALL_STRIKE — "the sky splash."
 * The appointment is kept: a steep white entry streak, then a four-
 * point star sits half-buried in the crater, cooling from white to
 * night-violet — and the splash falls UP: a coronet of star-droplets
 * rises off the impact and keeps rising, the piece of sky going home.
 */
const starfall_strike: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xa5);
    // The impact throws sky-stuff: violet shards under gold sparks.
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(c.wx, c.wy - 0.25, 1, [c.st.mid, c.st.deep, c.st.spark], {
        speed: 2.6 + rand() * 1.2, life: 0.6, size: 0.1, gravity: 7,
        dir: a, spread: 0.2, shape: 'shard', spin: 9, fade: c.st.deep,
      });
    }
    c.particles.burst(c.wx, c.wy - 0.4, 5, [c.st.spark, '#ffffff'], {
      speed: 3.2, life: 0.45, size: 0.06, gravity: 4, up: true,
      shape: 'streak', trail: 9, trailColor: c.st.mid,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xa6);
    const fade = 1 - t;
    ctx.save();
    // The crater the sky made, ringed by a slow violet afterglow.
    ctx.globalAlpha = 0.55 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.3, rPx * 0.3 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    const gr = rPx * (0.4 + 0.55 * Math.min(1, t / 0.6));
    ctx.globalAlpha = 0.45 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.beginPath();
    ctx.ellipse(px, py, gr, gr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Scorch ticks rake outward where the splash grazed the turf.
    ctx.strokeStyle = shade(st.deep, -10);
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      const r0 = rPx * (0.32 + rand() * 0.1);
      const r1 = rPx * (0.5 + rand() * 0.3);
      ctx.globalAlpha = 0.5 * fade;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0 * squash);
      ctx.lineTo(px + Math.cos(a) * r1, py + Math.sin(a) * r1 * squash);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius, 0.45 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0xa7);
    ctx.save();
    // The entry: a steep white streak, already over by the time the
    // eye arrives — the appointment was kept at speed.
    if (t < 0.1) {
      const ft = 1 - t / 0.1;
      ctx.globalAlpha = ft;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.5, sc * 0.08);
      ctx.beginPath();
      ctx.moveTo(px + sc * 0.85, py - sc * 2.4);
      ctx.lineTo(px + sc * 0.08, py - sc * 0.2);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, sc * 0.03);
      ctx.beginPath();
      ctx.moveTo(px + sc * 0.8, py - sc * 2.4);
      ctx.lineTo(px + sc * 0.05, py - sc * 0.2);
      ctx.stroke();
    }
    // The buried star: four points up, the fifth in the ground —
    // cooling white to violet, twinkling as it dies.
    const cool = Math.min(1, t / 0.5);
    const tw = 0.75 + 0.25 * Math.sin(c.now / 120 + c.seed);
    const s = sc * 0.3 * (1 - t * 0.3) * tw;
    ctx.globalAlpha = (1 - t) * 0.95;
    ctx.fillStyle = cool < 0.6 ? st.core : st.mid;
    ctx.beginPath();
    ctx.moveTo(px, py - s * 1.5);
    ctx.lineTo(px + s * 0.3, py - s * 0.4);
    ctx.lineTo(px + s * 1.1, py - s * 0.25);
    ctx.lineTo(px + s * 0.35, py);
    ctx.lineTo(px - s * 0.35, py);
    ctx.lineTo(px - s * 1.1, py - s * 0.25);
    ctx.lineTo(px - s * 0.3, py - s * 0.4);
    ctx.closePath();
    ctx.fill();
    // The splash that falls UP: a coronet of droplets keeps rising
    // off the impact — the sky reclaiming its piece.
    ctx.fillStyle = st.spark;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.5;
      const delay = rand() * 0.3;
      if (t < delay) continue;
      const rise = (t - delay) * sc * 1.6;
      const da = Math.max(0, 1 - (t - delay) / 0.6);
      const gx = px + Math.cos(a) * sc * 0.5;
      const gy = py - sc * 0.25 - rise;
      const g = Math.max(1.5, sc * 0.05 * da);
      ctx.globalAlpha = da * 0.9;
      ctx.fillRect(gx - g / 2, gy - g * 1.6, g, g * 3.2);
    }
    ctx.restore();
    // Stray star-motes join the climb while the splash lives.
    if (Math.random() < c.frameDt * 8 * (1 - t)) {
      c.particles.burst(c.wx, c.wy - 0.4, 1, [st.spark, '#ffffff'], {
        speed: 0.5, life: 0.7, size: 0.08, gravity: -1.4, shape: 'glint',
      });
    }
  },
};

/**
 * VOW_UNBROKEN — "the cinched knot."
 * The oath is tied where the eye can check it: a white ribbon laps
 * the body once — a red thread running through its weave — then
 * CINCHES to the sternum and sets as a bright knot that gleams for
 * the rest of the fx. Stray red motes reel inward along the band:
 * every cut given, coming back.
 */
const vow_unbroken: AbilitySig = {
  spawn(c) {
    // The oath takes: a hush of pale motes lifts off the shoulders.
    c.particles.burst(c.wx, c.wy - 0.9, 5, [c.st.core, c.st.mid], {
      speed: 0.5, life: 0.9, size: 0.08, gravity: -0.6, drag: 1.4,
      shape: 'glint', flicker: 0.3,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    // A quiet halo under the feet, breathing with the vow.
    const breathe = 0.8 + 0.2 * Math.sin(c.now / 260 + c.seed);
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    ctx.globalAlpha = 0.3 * fade * breathe;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.55, sc * 0.55 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const chestY = py - sc * 0.62;
    const cin = Math.min(1, Math.max(0, (t - 0.38) / 0.14)); // the cinch
    const rb = sc * 0.5 * (1 - cin * 0.86);
    ctx.save();
    ctx.lineCap = 'butt';
    if (t < 0.52) {
      // The lap: the ribbon closes around the body over the first
      // beats, its red thread riding inside the white weave.
      const sweep = Math.min(1, t / 0.38) * Math.PI * 2;
      const a0 = -Math.PI / 2 + (c.seed % 5) * 0.3;
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      ctx.beginPath();
      ctx.ellipse(px, chestY, rb, rb * squash, 0, a0, a0 + sweep);
      ctx.stroke();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#c4372a';
      ctx.lineWidth = Math.max(1, sc * 0.018);
      ctx.beginPath();
      ctx.ellipse(px, chestY, rb * 0.93, rb * 0.93 * squash, 0, a0, a0 + sweep);
      ctx.stroke();
    } else {
      // The knot: two interlocked loops set at the sternum, white
      // over red — tied, checked, holding.
      const kfade = t < 0.85 ? 1 : (1 - t) / 0.15;
      const g = sc * 0.13;
      ctx.globalAlpha = 0.9 * kfade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2, sc * 0.045);
      ctx.strokeRect(px - g * 1.05, chestY - g * 0.55, g * 1.25, g * 1.1);
      ctx.strokeStyle = '#c4372a';
      ctx.lineWidth = Math.max(1.5, sc * 0.032);
      ctx.strokeRect(px - g * 0.2, chestY - g * 0.55, g * 1.25, g * 1.1);
      // The gleam: the tied knot catches light on its own clock.
      const tw = Math.max(0, Math.sin(c.now / 160 + c.seed));
      const gl = sc * 0.07 * tw * kfade;
      ctx.globalAlpha = 0.95 * kfade;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - gl / 2, chestY - gl * 2, gl, gl * 4);
      ctx.fillRect(px - gl * 2, chestY - gl / 2, gl * 4, gl);
    }
    ctx.restore();
    // The give-back: red motes reel INWARD to the knot while it holds.
    if (Math.random() < c.frameDt * 10 * (1 - t)) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * 0.85,
        c.wy + Math.sin(a) * 0.85 * c.squash - 0.6,
        1, ['#c4372a', st.core], {
          speed: 1.6, life: 0.45, size: 0.05, gravity: 0, dir: a + Math.PI,
          spread: 0.15, drag: 0.6, shape: 'glint',
        },
      );
    }
    c.glow(c.wx, c.wy, 0.9, 0.25 * (1 - t));
  },
};

/**
 * DRAG_UNDER — "the sea takes its turn."
 * The sweep is a WAVE: a foam crest breaks outward along the arc,
 * then the water goes home — inward drag-streaks pull at everything
 * the crest touched. Chill is the cold left in wet boots.
 */
const drag_under: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x5a);
    // Spray leaps off the crest line.
    for (let k = 0; k < 5; k++) {
      const a = c.dir + (rand() - 0.5) * 1.3;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.7,
        c.wy + Math.sin(a) * c.radius * 0.7 * c.squash,
        1, [c.st.core, c.st.mid], {
          speed: 1.4 + rand(), life: 0.5, size: 0.07, gravity: 3,
          dir: a, spread: 0.3, shape: 'glint',
        },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, squash } = c;
    ctx.save();
    ctx.lineCap = 'round';
    if (t < 0.45) {
      // The crest breaks outward: a fat foam arc with a lit lip.
      const r = c.rPx * (0.35 + (t / 0.45) * 0.65);
      ctx.globalAlpha = 0.85 * (1 - t);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.5, c.sc * 0.09 * (1 - t * 0.6));
      ctx.beginPath();
      ctx.ellipse(c.px, c.py, r, r * squash, 0, c.dir - 0.75, c.dir + 0.75);
      ctx.stroke();
      ctx.globalAlpha = 0.5 * (1 - t);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(4, c.sc * 0.16 * (1 - t * 0.6));
      ctx.beginPath();
      ctx.ellipse(c.px, c.py, r * 0.88, r * 0.88 * squash, 0, c.dir - 0.7, c.dir + 0.7);
      ctx.stroke();
    } else {
      // The water goes home: streaks drag INWARD toward the heart.
      const u = (t - 0.45) / 0.55;
      const rand = srand(c.seed ^ 0x77);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, c.sc * 0.035);
      for (let k = 0; k < 5; k++) {
        const a = c.dir + (rand() - 0.5) * 1.4;
        const r0 = c.rPx * (1 - u * 0.75) * (0.7 + rand() * 0.3);
        ctx.globalAlpha = 0.55 * (1 - u);
        ctx.beginPath();
        ctx.moveTo(c.px + Math.cos(a) * r0, c.py + Math.sin(a) * r0 * squash);
        ctx.lineTo(c.px + Math.cos(a) * r0 * 0.55, c.py + Math.sin(a) * r0 * 0.55 * squash);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
};

/**
 * SPOKEN_LIGHT — "the word reads itself."
 * Four script ticks light in sequence around the rim — the blade's
 * own walking runes, spoken outward — and when the last one lights,
 * the circle goes white in one clean flash of rays.
 */
const spoken_light: AbilitySig = {
  ground(c) {
    const { ctx, st, t, squash } = c;
    const r = c.rPx * 0.82;
    ctx.save();
    ctx.lineCap = 'round';
    if (t < 0.55) {
      // The reading: ticks catch light one after another.
      const lit = Math.min(4, Math.floor((t / 0.55) * 5));
      for (let k = 0; k < 4; k++) {
        const a = -Math.PI / 2 + (k / 4) * Math.PI * 2 + (c.seed % 7) * 0.2;
        const x = c.px + Math.cos(a) * r;
        const y = c.py + Math.sin(a) * r * squash;
        const on = k < lit;
        ctx.globalAlpha = on ? 0.95 : 0.3;
        ctx.strokeStyle = on ? st.core : st.mid;
        ctx.lineWidth = Math.max(2, c.sc * 0.05);
        ctx.beginPath();
        ctx.moveTo(x - c.sc * 0.05, y + c.sc * 0.07);
        ctx.lineTo(x + c.sc * 0.05, y - c.sc * 0.07);
        ctx.stroke();
        if (on) {
          ctx.beginPath();
          ctx.moveTo(x - c.sc * 0.04, y - c.sc * 0.04);
          ctx.lineTo(x + c.sc * 0.04, y);
          ctx.stroke();
        }
      }
    } else {
      // The saying: rays wheel out of the circle, then rest.
      const u = (t - 0.55) / 0.45;
      ctx.globalAlpha = 0.85 * (1 - u);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2, c.sc * 0.045);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + u * 0.4;
        ctx.beginPath();
        ctx.moveTo(c.px + Math.cos(a) * r * 0.5, c.py + Math.sin(a) * r * 0.5 * squash);
        ctx.lineTo(c.px + Math.cos(a) * r * (0.9 + u * 0.5), c.py + Math.sin(a) * r * (0.9 + u * 0.5) * squash);
        ctx.stroke();
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius, 0.3 * (1 - t));
  },
  spawn(c) {
    c.particles.burst(c.wx, c.wy - 0.4, 6, [c.st.core, '#ffffff'], {
      speed: 1.2, life: 0.6, size: 0.07, gravity: -1.2, drag: 1.2,
      shape: 'glint', flicker: 0.4,
    });
  },
};

/**
 * SLAGFALL — "the poured mouth."
 * The maw spits a ladleful of forge onto the picked spot: one heavy
 * gobbet drops, the pool spreads with BREATHING veins, and slag
 * spatter cools from white to the deep in plain sight.
 */
const slagfall: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2f);
    // Spatter comets out of the landing.
    for (let k = 0; k < 7; k++) {
      c.particles.burst(c.wx2, c.wy2, 1, [c.st.core, c.st.mid, c.st.spark], {
        speed: 1.6 + rand() * 1.8, life: 0.55 + rand() * 0.3, size: 0.09,
        gravity: 7, dir: rand() * Math.PI * 2, spread: 0.2, shape: 'shard', spin: 8,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, squash } = c;
    const px = c.px2;
    const py = c.py2;
    const r = c.rPx * (0.55 + 0.45 * Math.min(1, t * 3));
    ctx.save();
    // The pool: deep base, then veins that breathe on the clock.
    ctx.globalAlpha = 0.55 * (1 - t * 0.6);
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, r, r * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    const rand = srand(c.seed ^ 0x11);
    ctx.lineCap = 'round';
    for (let k = 0; k < 4; k++) {
      const a = rand() * Math.PI * 2;
      const breathe = 0.6 + 0.4 * Math.sin(c.now / 170 + k * 1.7);
      ctx.globalAlpha = 0.8 * breathe * (1 - t * 0.7);
      ctx.strokeStyle = k % 2 === 0 ? st.core : st.mid;
      ctx.lineWidth = Math.max(1.5, c.sc * 0.04);
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * r * 0.15, py + Math.sin(a) * r * 0.15 * squash);
      const mid = a + (rand() - 0.5) * 0.8;
      ctx.quadraticCurveTo(
        px + Math.cos(mid) * r * 0.5, py + Math.sin(mid) * r * 0.5 * squash,
        px + Math.cos(a + (rand() - 0.5) * 0.5) * r * 0.85,
        py + Math.sin(a + (rand() - 0.5) * 0.5) * r * 0.85 * squash,
      );
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx2, c.wy2, c.radius * 1.1, 0.4 * (1 - t * 0.5));
  },
  air(c) {
    if (c.t > 0.3) return;
    // The gobbet itself, still falling through the first beats.
    const { ctx, st } = c;
    const u = c.t / 0.3;
    const y = c.py2 - c.sc * 2.4 * (1 - u) * (1 - u);
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.arc(c.px2, y, Math.max(2, c.sc * 0.13 * (0.7 + 0.3 * u)), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.arc(c.px2 + c.sc * 0.05, y - c.sc * 0.1, Math.max(1, c.sc * 0.05), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
};

/**
 * SKY_SPLITS — "the bolt goes visiting."
 * One fx per hop: a re-jagged bolt (90ms law) crosses heart → far
 * end, wearing a fading afterimage of its LAST path — the sky never
 * signs the same name twice, and you can see it change its mind.
 */
const sky_splits: AbilitySig = {
  air(c) {
    const { ctx, st, t } = c;
    if (t > 0.85) return;
    const seed = Math.floor(c.now / 90);
    ctx.save();
    ctx.lineCap = 'round';
    // Afterimage first (last frame's seed), then the live bolt.
    for (const [sd, alpha, w] of [[seed - 1, 0.25, 0.05], [seed, 0.9, 0.035]] as const) {
      const rand = srand(sd ^ c.seed);
      for (const [col, lw, al] of [[st.mid, w * 2, alpha * 0.6], [st.core, w, alpha]] as const) {
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(1.5, c.sc * lw);
        ctx.globalAlpha = al * (1 - t);
        ctx.beginPath();
        ctx.moveTo(c.px, c.py - c.sc * 0.5);
        for (let k = 1; k < 5; k++) {
          const f = k / 5;
          ctx.lineTo(
            c.px + (c.px2 - c.px) * f + (rand() - 0.5) * c.sc * 0.4,
            c.py - c.sc * 0.5 + (c.py2 - c.py + c.sc * 0.5) * f + (rand() - 0.5) * c.sc * 0.3,
          );
        }
        ctx.lineTo(c.px2, c.py2 - c.sc * 0.3);
        ctx.stroke();
      }
    }
    // The strike star at the visited door.
    const tw = 0.7 + 0.3 * Math.sin(c.now / 45);
    ctx.globalAlpha = (1 - t) * tw;
    ctx.fillStyle = '#ffffff';
    const g = c.sc * 0.09 * tw;
    ctx.fillRect(c.px2 - g / 3, c.py2 - c.sc * 0.3 - g * 1.6, g * 0.66, g * 3.2);
    ctx.fillRect(c.px2 - g * 1.6, c.py2 - c.sc * 0.3 - g / 3, g * 3.2, g * 0.66);
    ctx.restore();
    c.glow(c.wx2, c.wy2, 0.8, 0.35 * (1 - t));
  },
  spawn(c) {
    c.particles.burst(c.wx2, c.wy2, 5, [c.st.core, c.st.spark], {
      speed: 2.2, life: 0.35, size: 0.06, gravity: 0, drag: 2.2,
      shape: 'glint', flicker: 0.6,
    });
  },
};

/**
 * GREEN_VERSE — "the second bar."
 * The dash is a MEASURE of music: paired serpent dots print the
 * blade's winding path down the travel line like notes on a staff,
 * and the arrival coils once around the target and tightens.
 */
const green_verse: AbilitySig = {
  spawn(c) {
    const dx = c.wx2 - c.wx;
    const dy = c.wy2 - c.wy;
    // The verse: note-pairs along the line just traveled.
    for (let k = 0; k < 5; k++) {
      const f = k / 5;
      const off = Math.sin(f * Math.PI * 3) * 0.3;
      const nx = -dy;
      const ny = dx;
      const nl = Math.hypot(nx, ny) || 1;
      c.particles.burst(
        c.wx + dx * f + (nx / nl) * off,
        c.wy + dy * f + (ny / nl) * off,
        1, [c.st.mid, c.st.spark], {
          speed: 0.15, life: 0.5 + f * 0.25, size: 0.07, gravity: -0.4,
          drag: 2, shape: 'glint',
        },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, squash } = c;
    // The coil tightens at the arrival — one loop, closing.
    const r = c.sc * (0.62 - 0.3 * Math.min(1, t * 1.6));
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.8 * (1 - t);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, c.sc * 0.055);
    ctx.beginPath();
    ctx.ellipse(c.px2, c.py2, r, r * squash, 0, t * 5, t * 5 + Math.PI * 1.6);
    ctx.stroke();
    // The head of the coil: a bright wedge leading the loop.
    const ha = t * 5 + Math.PI * 1.6;
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.arc(c.px2 + Math.cos(ha) * r, c.py2 + Math.sin(ha) * r * squash, Math.max(1.5, c.sc * 0.045), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
};

/**
 * SUN_COURT — "the session."
 * Court convenes: a gold ray-fan OPENS like doors (rays sweep from
 * closed to spread), the rim wears small crowns, and the shove is
 * dust rolling out under the light. Burning is the sentence.
 */
const sun_court: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x0c);
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.8,
        c.wy + Math.sin(a) * c.radius * 0.8 * c.squash,
        1, ['#e8dcc0', c.st.deep], {
          speed: 1.3, life: 0.7, size: 0.12, gravity: 0.3, drag: 1.6,
          grow: 0.3, dir: a, spread: 0.3,
        },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, squash } = c;
    const open = Math.min(1, t * 2.2);
    const r = c.rPx;
    ctx.save();
    ctx.lineCap = 'round';
    // The fan: rays sweep from the aim line outward as the doors open.
    ctx.strokeStyle = st.core;
    for (let k = 0; k < 5; k++) {
      const spread = (k - 2) * 0.55 * open;
      const a = c.dir + spread;
      ctx.globalAlpha = 0.8 * (1 - t) * (k === 2 ? 1 : 0.7);
      ctx.lineWidth = Math.max(2, c.sc * (k === 2 ? 0.06 : 0.04));
      ctx.beginPath();
      ctx.moveTo(c.px + Math.cos(a) * r * 0.25, c.py + Math.sin(a) * r * 0.25 * squash);
      ctx.lineTo(c.px + Math.cos(a) * r * (0.7 + 0.3 * open), c.py + Math.sin(a) * r * (0.7 + 0.3 * open) * squash);
      ctx.stroke();
    }
    // The rim wears its crowns: three points riding the ring.
    if (t < 0.7) {
      ctx.globalAlpha = 0.9 * (1 - t / 0.7);
      ctx.fillStyle = st.spark;
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + t * 0.8;
        const x = c.px + Math.cos(a) * r * 0.92;
        const y = c.py + Math.sin(a) * r * 0.92 * squash;
        ctx.beginPath();
        ctx.moveTo(x - c.sc * 0.05, y);
        ctx.lineTo(x - c.sc * 0.025, y - c.sc * 0.07);
        ctx.lineTo(x, y);
        ctx.lineTo(x + c.sc * 0.025, y - c.sc * 0.09);
        ctx.lineTo(x + c.sc * 0.05, y);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius, 0.45 * (1 - t));
  },
};

/**
 * STILL_AIR — "the held breath."
 * The ring expands and then STOPS — frozen mid-air at three-quarter
 * reach, crystallizing into shard ticks that hang, then drop all at
 * once. Nothing else in the roster stops moving; that is the word.
 */
const still_air: AbilitySig = {
  ground(c) {
    const { ctx, st, t, squash } = c;
    ctx.save();
    if (t < 0.25) {
      // The breath goes out: an ordinary ring, for now.
      const r = c.rPx * (t / 0.25) * 0.75;
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2, c.sc * 0.05);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py, r, r * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (t < 0.75) {
      // The hold: the ring is STUCK at 0.75r, hardening tick by tick.
      const u = (t - 0.25) / 0.5;
      const r = c.rPx * 0.75;
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, c.sc * 0.03);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py, r, r * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      const n = Math.floor(u * 10);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2, c.sc * 0.045);
      ctx.lineCap = 'round';
      for (let k = 0; k < n; k++) {
        const a = (k / 10) * Math.PI * 2 + (c.seed % 5) * 0.3;
        const x = c.px + Math.cos(a) * r;
        const y = c.py + Math.sin(a) * r * squash;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(x, y + c.sc * 0.05);
        ctx.lineTo(x + c.sc * 0.03, y - c.sc * 0.08);
        ctx.stroke();
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.9, 0.25 * (1 - t));
  },
  spawn(c) {
    // Motes hang in the stopped air — near-zero speed, long life.
    const rand = srand(c.seed ^ 0x33);
    for (let k = 0; k < 8; k++) {
      const a = rand() * Math.PI * 2;
      const f = 0.3 + rand() * 0.6;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * f,
        c.wy + Math.sin(a) * c.radius * f * c.squash - 0.5,
        1, [c.st.core, c.st.mid], {
          speed: 0.05, life: 1.1, size: 0.06, gravity: 0.15, drag: 3,
          shape: 'glint', flicker: 0.25,
        },
      );
    }
  },
};

// -------------------------------------------------------- registry

export const BLADE_SIGS: Record<string, AbilitySig> = {
  sundering_chop,
  thorn_lash,
  quicksilver,
  riptide,
  cinder_arc,
  winters_edge,
  reapers_arc,
  red_harvest,
  storm_brand,
  kings_decree,
  sunburst,
  starfall_strike,
  vow_unbroken,
  // The ten crowns' sword arts.
  drag_under,
  spoken_light,
  slagfall,
  sky_splits,
  green_verse,
  sun_court,
  still_air,
};
