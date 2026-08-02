/**
 * THE SIGNATURE LAW — the veteran's voice.
 *
 * Eleven bespoke set-pieces for the combat ladder. Same binding laws
 * as fxSignatures.ts: hard edges, save/restore hygiene, squash on the
 * ground, srand-deterministic geometry, frameDt-gated emission, ≤60
 * path ops per hook per frame. The school's grammar is DUST AND
 * BRASS: drill-yard grit kicked off the ground, one brass note where
 * the school raises its voice, war-red only where blood is the point.
 * No element ever — the veteran's lessons look the same whatever the
 * hand holds, and no centerpiece is shared with any other school.
 *
 * FX v5 wave 3g: the school's two true matters route through the
 * MATTER LIBRARY (ONE-VOICE LAW) — drill-yard dust (kicks, one
 * gouge) and the war-red of first_blood and no_quarter, where blood
 * IS the point. Brass, breath, daylight, and milestones stay the
 * veteran's own; no element ever still holds.
 */

import { srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { dust, blood, asMatter } from './matter/index.js';

/** Screen point r px from the heart along ground angle a. */
function groundPt(c: SigCtx, r: number, a: number): { x: number; y: number } {
  return { x: c.px + Math.cos(a) * r, y: c.py + Math.sin(a) * r * c.squash };
}

/**
 * The school's brick: a low dust slab — a squat ground-hugging quad of
 * kicked grit, wider than tall, lying ON the ground plane. Everything
 * this school does disturbs the yard it happens in.
 */
function dustSlab(
  c: SigCtx,
  x: number,
  y: number,
  w: number,
  a: number,
  col: string,
  alpha: number,
): void {
  const { ctx } = c;
  const dx = Math.cos(a);
  const dy = Math.sin(a) * c.squash;
  const nx = -Math.sin(a) * 0.4;
  const ny = Math.cos(a) * 0.4 * c.squash;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x - dx * w * 0.5 + nx * w * 0.3, y - dy * w * 0.5 + ny * w * 0.3);
  ctx.lineTo(x + dx * w * 0.55, y + dy * w * 0.55);
  ctx.lineTo(x - dx * w * 0.4 - nx * w * 0.3, y - dy * w * 0.4 - ny * w * 0.3);
  ctx.closePath();
  ctx.fill();
}

/**
 * FIRST_BLOOD — "the first drop."
 * One clean opening cut hangs across the aim, and the fight's ledger
 * opens: two or three heavy red drops arc off the mark and land dark.
 * Understated on purpose — the rung-5 art is a statement of intent,
 * not a detonation.
 */
const first_blood: AbilitySig = {
  spawn(c) {
    // The ledger opens in TRUE red: a small directed spray off the
    // mark — streaks along the cut, heavy drops that arc low, land,
    // and dry dark. Understated on purpose; blood IS the point here.
    blood.deployments.spray!(asMatter(c),
      c.wx + Math.cos(c.dir) * c.radius * 0.5,
      c.wy + Math.sin(c.dir) * c.radius * 0.5 * c.squash,
      { dir: c.dir, scale: 0.4 });
  },
  air(c) {
    if (c.t > 0.55) return;
    const f = c.t / 0.55;
    const { ctx } = c;
    ctx.save();
    // The opening cut: one slim rising slash, lit edge up.
    const p = groundPt(c, c.rPx * 0.55, c.dir);
    const L = c.sc * (0.8 - 0.2 * f);
    const a = c.dir - 0.5;
    ctx.globalAlpha = 0.85 * (1 - f);
    ctx.strokeStyle = c.st.core;
    ctx.lineWidth = Math.max(1.5, c.sc * 0.05);
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(a) * L * 0.5, p.y - c.sc * 0.55 - Math.sin(a) * L * 0.3);
    ctx.lineTo(p.x + Math.cos(a) * L * 0.5, p.y - c.sc * 0.55 + Math.sin(a) * L * 0.3);
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx, c.wy, 0.5, 0.14 * (1 - f));
  },
};

/**
 * SHOULDER_CHECK — "the dust arrives with you."
 * The whole run is written on the ground: a wake of squat dust slabs
 * marching the dash line, and at the landing the yard's grit jumps —
 * no blade streak anywhere, because none was used.
 */
const shoulder_check: AbilitySig = {
  spawn(c) {
    // The yard's grit jumps TRUE at the landing — one breath of
    // earth, fines that land and lie where the shoulder arrived.
    dust.deployments.kick!(asMatter(c), c.wx2, c.wy2, { scale: 0.8 });
  },
  ground(c) {
    if (c.t > 0.5) return;
    const f = c.t / 0.5;
    const { ctx } = c;
    const rand = srand(c.seed ^ 0x2d);
    ctx.save();
    // The wake: dust slabs along the travel line, oldest fading first.
    for (let k = 0; k < 4; k++) {
      const s = (k + rand() * 0.5) / 4;
      const x = c.px + (c.px2 - c.px) * s;
      const y = c.py + (c.py2 - c.py) * s;
      dustSlab(c, x, y, c.sc * (0.5 - 0.08 * k), c.dir + Math.PI + (rand() - 0.5) * 0.5,
        k % 2 ? c.st.mid : c.st.deep, 0.4 * (1 - f) * (1 - s * 0.5));
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  },
};

/**
 * WAR_SHOUT — "the yard stops."
 * The voice made visible: two brass mouth-rings leave the caster a
 * half-beat apart, flattened onto the ground plane, while short
 * note-glints hop off the rim like struck cymbal light.
 */
const war_shout: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x3a);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.5;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.5,
        c.wy + Math.sin(a) * c.radius * 0.5 * c.squash - 0.5,
        1,
        [c.st.spark, c.st.core],
        { speed: 0.9, life: 0.4, size: 0.05, gravity: -1.5, shape: 'glint' },
      );
    }
  },
  air(c) {
    const { ctx } = c;
    ctx.save();
    // Two rings, the echo chasing the call.
    for (const [lag, alpha] of [
      [0, 0.8],
      [0.18, 0.45],
    ] as const) {
      const tt = c.t - lag;
      if (tt < 0 || tt > 0.7) continue;
      const f = tt / 0.7;
      ctx.globalAlpha = alpha * (1 - f);
      ctx.strokeStyle = f < 0.3 ? c.st.core : c.st.mid;
      ctx.lineWidth = Math.max(1.5, c.sc * 0.06 * (1 - f * 0.5));
      ctx.beginPath();
      ctx.ellipse(c.px, c.py - c.sc * 0.5, c.rPx * f, c.rPx * f * c.squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    if (c.t < 0.4) c.glow(c.wx, c.wy, c.radius * 0.8, 0.2 * (1 - c.t / 0.4));
  },
};

/**
 * SECOND_BREATH — "the chest fills."
 * The only signature in the school that moves INWARD: pale breath
 * motes drift to the sternum and vanish, a quiet ring tightens at the
 * feet, and for one frame at the deepest pull the body glints.
 */
const second_breath: AbilitySig = {
  air(c) {
    const { ctx, st, t, sc } = c;
    const fade = t < 0.1 ? t / 0.1 : t > 0.8 ? (1 - t) / 0.2 : 1;
    const rand = srand(c.seed ^ 0x4d);
    ctx.save();
    // Breath motes spiraling home to the chest.
    for (let k = 0; k < 5; k++) {
      const ph = (c.now / 900 + k / 5 + rand()) % 1;
      const a = rand() * Math.PI * 2 + ph * 1.6;
      const r = sc * 0.7 * (1 - ph);
      ctx.globalAlpha = 0.55 * fade * Math.sin(ph * Math.PI);
      ctx.fillStyle = k % 2 ? st.core : st.mid;
      ctx.beginPath();
      ctx.ellipse(
        c.px + Math.cos(a) * r,
        c.py - sc * 0.62 + Math.sin(a) * r * 0.4,
        sc * 0.05,
        sc * 0.035,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, 0.6, 0.1 * fade);
  },
  ground(c) {
    // The inhale ring: tightens instead of expanding — nothing else in
    // the game breathes in.
    const { ctx, st, t } = c;
    const fade = t > 0.85 ? (1 - t) / 0.15 : 1;
    const ph = 1 - ((c.now / 1200) % 1);
    ctx.save();
    ctx.globalAlpha = 0.4 * fade * Math.sin((1 - ph) * Math.PI);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.2, c.sc * 0.035);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, c.sc * 0.75 * ph, c.sc * 0.75 * ph * c.squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * LOOSE_IRON — "camp iron."
 * What flies is visibly junk: squat tumbling nail-squares spin along
 * each flight line, shedding filing-glints, and the hand that threw
 * them kicks a little dust off the yard.
 */
const loose_iron: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x5e);
    for (let k = 0; k < 4; k++) {
      c.particles.burst(c.wx, c.wy - 0.5, 1, [c.st.spark, c.st.core], {
        speed: 2.0 + rand() * 1.2,
        life: 0.35,
        size: 0.05,
        gravity: 4,
        dir: c.dir + (rand() - 0.5) * 0.5,
        spread: 0.2,
        shape: 'glint',
      });
    }
    // The hand that threw them kicks TRUE dust off the yard — the
    // promise the doc always made, now kept.
    dust.deployments.kick!(asMatter(c), c.wx, c.wy, { scale: 0.35 });
  },
  air(c) {
    if (c.t > 0.5) return;
    const f = c.t / 0.5;
    const { ctx } = c;
    const rand = srand(c.seed ^ 0x5f);
    ctx.save();
    // Three tumbling nails down the throw lines.
    for (let k = 0; k < 3; k++) {
      const a = c.dir + (k - 1) * 0.16 + (rand() - 0.5) * 0.06;
      const r = c.rPx * (0.2 + 0.75 * f);
      const p = groundPt(c, r, a);
      const spin = c.now / 90 + k * 2.1;
      const s = c.sc * 0.09;
      ctx.globalAlpha = 0.9 * (1 - f);
      ctx.fillStyle = k === 1 ? c.st.core : c.st.mid;
      ctx.save();
      ctx.translate(p.x, p.y - c.sc * 0.55);
      ctx.rotate(spin);
      ctx.fillRect(-s, -s * 0.4, s * 2, s * 0.8);
      ctx.restore();
    }
    ctx.restore();
  },
};

/**
 * HOLD_FAST — "the staked ground."
 * The stand is surveyed: four short iron stakes rise at the corners of
 * a square around the feet with a taut line low between them — held
 * ground, literally fenced, until the word lapses.
 */
const hold_fast: AbilitySig = {
  spawn(c) {
    // The stakes drive home: one TRUE breath of yard grit at the
    // survey's center.
    dust.deployments.kick!(asMatter(c), c.wx, c.wy, { scale: 0.6 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    const fade = t < 0.06 ? t / 0.06 : t > 0.85 ? (1 - t) / 0.15 : 1;
    const r = sc * 0.66;
    ctx.save();
    // The taut line: a low square strung post to post.
    ctx.globalAlpha = 0.45 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1.2, sc * 0.03);
    ctx.beginPath();
    for (let k = 0; k <= 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      const x = c.px + Math.cos(a) * r;
      const y = c.py + Math.sin(a) * r * squash;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Four stakes, lit on the sun side.
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      const x = c.px + Math.cos(a) * r;
      const y = c.py + Math.sin(a) * r * squash;
      const h = sc * 0.22;
      ctx.globalAlpha = 0.85 * fade;
      ctx.fillStyle = st.mid;
      ctx.fillRect(x - sc * 0.025, y - h, sc * 0.05, h);
      ctx.fillStyle = st.core;
      ctx.fillRect(x - sc * 0.025, y - h, sc * 0.02, h * 0.4);
    }
    ctx.restore();
  },
};

/**
 * BREAK_THE_LINE — "the line bends."
 * The push is a single wide crest: one squat wall-wave of dust and
 * rock chips rolls the breadth of the arc, and where it passes the
 * ground keeps a short bent seam — the line, moved.
 */
const break_the_line: AbilitySig = {
  spawn(c) {
    // The wall-wave rolls TRUE: dust and rock chips gouged the
    // breadth of the arc — chunks hopping, billow rolling, fines
    // raining after the crest.
    dust.deployments.gouge!(asMatter(c),
      c.wx + Math.cos(c.dir) * c.radius * 0.35,
      c.wy + Math.sin(c.dir) * c.radius * 0.35 * c.squash,
      { dir: c.dir, scale: 0.85 });
  },
  air(c) {
    if (c.t > 0.5) return;
    const f = c.t / 0.5;
    const { ctx } = c;
    ctx.save();
    // The crest: a broad low arc-band advancing through the swing.
    const r = c.rPx * (0.35 + 0.6 * f);
    ctx.globalAlpha = 0.75 * (1 - f);
    ctx.lineWidth = Math.max(2, c.sc * 0.14 * (1 - f * 0.4));
    ctx.strokeStyle = c.st.mid;
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, r, r * c.squash, 0, c.dir - 0.7, c.dir + 0.7);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * (1 - f);
    ctx.lineWidth = Math.max(1.2, c.sc * 0.04);
    ctx.strokeStyle = c.st.core;
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, r * 1.06, r * 1.06 * c.squash, 0, c.dir - 0.6, c.dir + 0.6);
    ctx.stroke();
    ctx.restore();
  },
  ground(c) {
    if (c.t < 0.3) return;
    const f = (c.t - 0.3) / 0.7;
    const { ctx } = c;
    ctx.save();
    // The bent seam the line keeps: two dark strokes meeting at a kink.
    const p = groundPt(c, c.rPx * 0.8, c.dir);
    ctx.globalAlpha = 0.5 * (1 - f);
    ctx.strokeStyle = c.st.deep;
    ctx.lineWidth = Math.max(1.5, c.sc * 0.045);
    ctx.beginPath();
    ctx.moveTo(p.x - c.sc * 0.5, p.y + c.sc * 0.1 * c.squash);
    ctx.lineTo(p.x, p.y - c.sc * 0.14 * c.squash);
    ctx.lineTo(p.x + c.sc * 0.5, p.y + c.sc * 0.08 * c.squash);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * THE_OPENING — "daylight in the guard."
 * At the strike point a narrow vertical seam of plain daylight opens,
 * holds one readable beat, and snaps shut — the door the veteran saw.
 * Star-glints slip through while it stands.
 */
const the_opening: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x8c);
    for (let k = 0; k < 3; k++) {
      c.particles.burst(
        c.wx + Math.cos(c.dir) * c.radius * 0.6,
        c.wy + Math.sin(c.dir) * c.radius * 0.6 * c.squash - 0.5,
        1,
        [c.st.core, c.st.spark],
        { speed: 0.7 + rand() * 0.5, life: 0.35, size: 0.05, gravity: -0.5, shape: 'glint' },
      );
    }
  },
  air(c) {
    if (c.t > 0.6) return;
    const f = c.t / 0.6;
    // Open fast, hold, snap: width envelope.
    const w = f < 0.2 ? f / 0.2 : f < 0.75 ? 1 : (1 - f) / 0.25;
    const { ctx } = c;
    const p = groundPt(c, c.rPx * 0.6, c.dir);
    const h = c.sc * 0.85;
    ctx.save();
    ctx.globalAlpha = 0.9 * w;
    ctx.fillStyle = c.st.core;
    ctx.fillRect(p.x - c.sc * 0.05 * w, p.y - c.sc * 0.45 - h * 0.5, c.sc * 0.1 * w, h);
    ctx.globalAlpha = 0.5 * w;
    ctx.strokeStyle = c.st.mid;
    ctx.lineWidth = Math.max(1.2, c.sc * 0.03);
    ctx.strokeRect(p.x - c.sc * 0.09, p.y - c.sc * 0.45 - h * 0.55, c.sc * 0.18, h * 1.1);
    ctx.restore();
    c.glow(c.wx + Math.cos(c.dir) * c.radius * 0.6, c.wy + Math.sin(c.dir) * c.radius * 0.6, 0.5, 0.22 * w);
  },
};

/**
 * NO_QUARTER — "the grindstone."
 * Every beat of the flurry throws a short alternating cut off one side
 * of the mark then the other — the wheel grinding — while red flecks
 * tick away and a faint ring closes in as the refusals stack.
 */
const no_quarter: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x9d);
    const side = rand() < 0.5 ? 1 : -1;
    // The grindstone throws TRUE red off alternating sides — war-red
    // where blood is the point, each beat a small directed spray.
    blood.deployments.spray!(asMatter(c),
      c.wx + Math.cos(c.dir) * c.radius * 0.5,
      c.wy + Math.sin(c.dir) * c.radius * 0.5 * c.squash,
      { dir: c.dir + side * 1.1, scale: 0.3 });
  },
  air(c) {
    if (c.t > 0.45) return;
    const f = c.t / 0.45;
    const rand = srand(c.seed ^ 0x9e);
    const side = rand() < 0.5 ? 1 : -1;
    const { ctx } = c;
    const p = groundPt(c, c.rPx * 0.5, c.dir);
    const a = c.dir + side * (0.9 - 0.3 * f);
    const L = c.sc * 0.55;
    ctx.save();
    ctx.globalAlpha = 0.85 * (1 - f);
    ctx.strokeStyle = c.st.spark;
    ctx.lineWidth = Math.max(1.5, c.sc * 0.045);
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(a) * L * 0.5, p.y - c.sc * 0.5 - Math.sin(a) * L * 0.25);
    ctx.lineTo(p.x + Math.cos(a) * L * 0.5, p.y - c.sc * 0.5 + Math.sin(a) * L * 0.25);
    ctx.stroke();
    // The tightening ring: the fight closing.
    ctx.globalAlpha = 0.35 * (1 - f);
    ctx.strokeStyle = c.st.deep;
    ctx.lineWidth = Math.max(1.2, c.sc * 0.03);
    const rr = c.rPx * (0.9 - 0.25 * f);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, rr, rr * c.squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * THE_LONG_FIGHT — "the wave returns."
 * Each pulse sends one broad brass ground-wave out and leaves a
 * cooling ring where the last one stood — by the third wave the yard
 * is ringed like a felled tree, oldest ring almost gone, and the
 * veteran is still in the middle.
 */
const the_long_fight: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xaf);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.4;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.7,
        c.wy + Math.sin(a) * c.radius * 0.7 * c.squash,
        1,
        [c.st.spark, c.st.mid],
        { speed: 1.1, life: 0.5, size: 0.07, gravity: 4, dir: a, spread: 0.3, up: false },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, squash } = c;
    ctx.save();
    // Standing rings: each pulse's wave cools in place. Three cohorts
    // on the cast clock, oldest faintest.
    for (let k = 0; k < 3; k++) {
      const born = k * 0.3;
      if (t < born) continue;
      const age = (t - born) / (1 - born);
      const r = c.rPx * (0.4 + 0.55 * Math.min(1, age * 2.2));
      ctx.globalAlpha = 0.55 * (1 - age);
      ctx.strokeStyle = age < 0.25 ? st.core : k % 2 ? st.mid : st.spark;
      ctx.lineWidth = Math.max(1.3, c.sc * (0.06 - 0.015 * k));
      ctx.beginPath();
      ctx.ellipse(c.px, c.py, r, r * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    if (t < 0.5) c.glow(c.wx, c.wy, c.radius * 0.7, 0.16 * (1 - t / 0.5));
  },
};

/**
 * FOUR_ROADS — "the crossroads."
 * The deed's own map: four plain road-strokes flash outward at the
 * compass of the aim, a milestone light standing at the end of each,
 * and the nova rolls out over the crossing they make.
 */
const four_roads: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xb1);
    for (let k = 0; k < 4; k++) {
      const a = c.dir + Math.PI / 4 + (k * Math.PI) / 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.8,
        c.wy + Math.sin(a) * c.radius * 0.8 * c.squash - 0.2,
        1,
        [c.st.core, c.st.spark],
        { speed: 0.6 + rand() * 0.4, life: 0.5, size: 0.06, gravity: -1.2, shape: 'glint' },
      );
    }
  },
  ground(c) {
    if (c.t > 0.75) return;
    const f = c.t / 0.75;
    const { ctx, st, squash } = c;
    ctx.save();
    for (let k = 0; k < 4; k++) {
      const a = c.dir + Math.PI / 4 + (k * Math.PI) / 2;
      const reach = c.rPx * (0.25 + 0.75 * Math.min(1, f * 1.6));
      const x1 = c.px + Math.cos(a) * reach;
      const y1 = c.py + Math.sin(a) * reach * squash;
      // The road: a plain double stroke.
      ctx.globalAlpha = 0.7 * (1 - f);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.6, c.sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(c.px + Math.cos(a) * c.rPx * 0.18, c.py + Math.sin(a) * c.rPx * 0.18 * squash);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      // The milestone light at its end.
      ctx.globalAlpha = 0.85 * (1 - f);
      ctx.fillStyle = st.core;
      ctx.fillRect(x1 - c.sc * 0.03, y1 - c.sc * 0.16, c.sc * 0.06, c.sc * 0.16);
    }
    ctx.restore();
    if (c.t < 0.4) c.glow(c.wx, c.wy, c.radius * 0.8, 0.2 * (1 - c.t / 0.4));
  },
};

export const COMBAT_SIGS: Record<string, AbilitySig> = {
  first_blood,
  shoulder_check,
  war_shout,
  second_breath,
  loose_iron,
  hold_fast,
  break_the_line,
  the_opening,
  no_quarter,
  the_long_fight,
  four_roads,
};
