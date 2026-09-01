/**
 * THE SIGNATURE LAW — the colossus's voice.
 *
 * The great school's ladder plus the founding pair's weapon arts.
 * Same binding laws as fxSignatures.ts: hard edges, save/restore
 * hygiene, squash on the ground, srand-deterministic geometry,
 * frameDt-gated emission, ≤60 path ops per hook per frame. The
 * school's grammar is WEIGHT AND AFTERMATH: everything here is
 * thrown, dropped, or split — dust falls in banks, stone leaves the
 * ground in slabs, and every centerpiece is the moment AFTER the
 * mass arrives.
 *
 * Refit to the breath-wave bar: the sweep is a RIBBON of steel now —
 * a filled band with a belly shadow, a white leading edge, and its
 * own shadow racing the turf below it — and every stone is a chunk
 * with a top plane and a dark cheek. Craters light their far rims,
 * blades bury and QUIVER, and the ground keeps what the school does
 * to it for as long as the wire allows.
 *
 * FX v5 wave 3e: this is dust's home school, and its earth now
 * lands TRUE — dust.slam under every great landing, gouges down the
 * furrows, fog for the school's three colds, plumes for its two
 * forges (ONE-VOICE LAW; gates retired where a sustained emitter
 * covers them). Steel sweeps, wood chips, gold, brass, bone, and
 * the elsewhere-sky stay bespoke.
 */

import { shade } from './tint.js';
import { srand, burstStarPath } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { dust, fire, frost, storm, blood, asMatter } from './matter/index.js';

/** Screen point r px from the heart along ground angle a. */
function groundPt(c: SigCtx, r: number, a: number): { x: number; y: number } {
  return { x: c.px + Math.cos(a) * r, y: c.py + Math.sin(a) * r * c.squash };
}

/**
 * An upthrown stone with FACES: dark body, a lit top plane, and a
 * shadowed right cheek — a chunk, not a pixel. Same call the armory
 * arts have always made; they inherit the volume for free.
 */
function stone(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  col: string,
  lit: string,
  rot = 0,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = col;
  ctx.fillRect(-s / 2, -s / 2, s, s);
  // The cheek: the face turned from the light.
  ctx.fillStyle = shade(col, -18);
  ctx.fillRect(s * 0.14, -s / 2, s * 0.36, s);
  // The top plane: what the sky sees.
  ctx.fillStyle = lit;
  ctx.beginPath();
  ctx.moveTo(-s / 2, -s / 2);
  ctx.lineTo(s / 2, -s / 2);
  ctx.lineTo(s * 0.32, -s * 0.14);
  ctx.lineTo(-s * 0.36, -s * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * The school's shared sweep: a RIBBON of greatsteel at hip height —
 * filled band with a deep belly shadow on its inner rim, a hard
 * white leading edge, a blade-mass knot at the head shedding speed
 * slivers, and the stroke's own shadow racing along the turf under
 * it. Sweeps `from`→`to` (ground angles), alive through `f` 0..1 of
 * its own little life. Every caller in the school inherits this.
 */
function sweepBand(c: SigCtx, from: number, to: number, f: number, rFrac = 0.8): void {
  const { ctx, st, sc } = c;
  const r = c.rPx * rFrac;
  const lift = sc * 0.42;
  const dirSign = to < from;
  const head = from + (to - from) * Math.min(1, f * 1.25);
  const span = Math.min(Math.abs(head - from), 0.95) * Math.sign(to - from);
  const tail = head - span;
  ctx.save();
  ctx.lineCap = 'butt';
  // The stroke's shadow: a thin dark arc racing the turf below the
  // steel — the 2.5D seller; the blade is UP there, the ground knows.
  ctx.globalAlpha = 0.3 * (1 - f);
  ctx.strokeStyle = shade(st.deep, -14);
  ctx.lineWidth = Math.max(2, sc * 0.09);
  ctx.beginPath();
  ctx.ellipse(c.px, c.py, r * 0.96, r * 0.96 * c.squash, 0, tail, head, dirSign);
  ctx.stroke();
  // The belly: the ribbon's underside holds its own dark.
  ctx.globalAlpha = 0.55 * (1 - f);
  ctx.strokeStyle = shade(st.mid, -24);
  ctx.lineWidth = Math.max(3, sc * 0.17);
  ctx.beginPath();
  ctx.ellipse(c.px, c.py - lift + sc * 0.045, r, r * c.squash, 0, tail, head, dirSign);
  ctx.stroke();
  // The body: the steel itself, fat and level.
  ctx.globalAlpha = 0.72 * (1 - f);
  ctx.strokeStyle = st.mid;
  ctx.lineWidth = Math.max(2.5, sc * 0.13);
  ctx.beginPath();
  ctx.ellipse(c.px, c.py - lift, r, r * c.squash, 0, tail, head, dirSign);
  ctx.stroke();
  // The leading edge: one hard white line on the outer rim.
  ctx.globalAlpha = 0.95 * (1 - f);
  ctx.strokeStyle = st.core;
  ctx.lineWidth = Math.max(1.5, sc * 0.045);
  ctx.beginPath();
  ctx.ellipse(c.px, c.py - lift, r + sc * 0.075, (r + sc * 0.075) * c.squash, 0, tail, head, dirSign);
  ctx.stroke();
  // The head knot: the blade mass itself at the front of the stroke,
  // a filled wedge with two speed slivers peeling off behind it.
  const hx = c.px + Math.cos(head) * r;
  const hy = c.py + Math.sin(head) * r * c.squash - lift;
  const ta = Math.atan2(Math.sin(head + Math.sign(span) * 0.35) * c.squash, Math.cos(head + Math.sign(span) * 0.35));
  ctx.globalAlpha = 0.9 * (1 - f);
  ctx.fillStyle = shade(st.mid, 16);
  ctx.beginPath();
  ctx.moveTo(hx + Math.cos(ta) * sc * 0.22, hy + Math.sin(ta) * sc * 0.22);
  ctx.lineTo(hx - Math.cos(ta) * sc * 0.1 - Math.sin(ta) * sc * 0.09, hy - Math.sin(ta) * sc * 0.1 + Math.cos(ta) * sc * 0.09);
  ctx.lineTo(hx - Math.cos(ta) * sc * 0.1 + Math.sin(ta) * sc * 0.09, hy - Math.sin(ta) * sc * 0.1 - Math.cos(ta) * sc * 0.09);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = st.spark;
  ctx.lineWidth = Math.max(1, sc * 0.028);
  ctx.beginPath();
  for (const off of [0.05, 0.11]) {
    ctx.moveTo(hx - Math.cos(ta) * sc * 0.14 - Math.sin(ta) * sc * off, hy - Math.sin(ta) * sc * 0.14 + Math.cos(ta) * sc * off);
    ctx.lineTo(hx - Math.cos(ta) * sc * 0.34 - Math.sin(ta) * sc * off, hy - Math.sin(ta) * sc * 0.34 + Math.cos(ta) * sc * off);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * WIDE_SWATH — "the horizon line."
 * One level stroke drawn as a single long ribbon across the whole
 * arc, hip height, white-edged, its shadow racing the turf beneath —
 * and behind it the MOWN LINE: a swept skirt of pressed grass with
 * lying chips scattered where the front rank used to be standing.
 */
const wide_swath: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2b1);
    for (let k = 0; k < 6; k++) {
      const a = c.dir + (rand() - 0.5) * 2.0;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.75,
        c.wy + Math.sin(a) * c.radius * 0.75 * c.squash - 0.4,
        1,
        [c.st.spark, c.st.core],
        { speed: 1.6 + rand(), life: 0.4, size: 0.07, gravity: 5, dir: a + 0.5, spread: 0.3, shape: 'glint' },
      );
    }
  },
  air(c) {
    if (c.t > 0.5) return;
    sweepBand(c, c.dir - 1.2, c.dir + 1.2, c.t / 0.5);
  },
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    if (t > 0.85) return;
    const rand = srand(c.seed ^ 0x2f1);
    const f = t / 0.85;
    const reach = Math.min(1, t / 0.4); // the skirt follows the stroke
    ctx.save();
    // The mown skirt: a filled sector of pressed turf, dark where the
    // sweep flattened it, its far edge ruled by the stroke's radius.
    ctx.globalAlpha = 0.28 * (1 - f);
    ctx.fillStyle = shade(st.deep, -8);
    ctx.beginPath();
    ctx.moveTo(c.px, c.py);
    const a0 = c.dir - 1.1;
    const a1 = c.dir - 1.1 + 2.2 * reach;
    ctx.ellipse(c.px, c.py, c.rPx * 0.82, c.rPx * 0.82 * squash, 0, a0, a1);
    ctx.closePath();
    ctx.fill();
    // The swath's rule: a lit line along the skirt's outer hem.
    ctx.globalAlpha = 0.4 * (1 - f);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, c.rPx * 0.82, c.rPx * 0.82 * squash, 0, a0, a1);
    ctx.stroke();
    // Lying chips: what the stroke sheared, scattered in the sector,
    // each a small flat blade of turf with a paler cut end.
    for (let k = 0; k < 6; k++) {
      const a = c.dir + (rand() - 0.5) * 2.0;
      if (a > a1) continue;
      const rr = c.rPx * (0.35 + rand() * 0.5);
      const p = groundPt(c, rr, a);
      const la = rand() * Math.PI;
      const len = sc * (0.07 + rand() * 0.05);
      ctx.globalAlpha = 0.55 * (1 - f);
      ctx.strokeStyle = k % 2 === 0 ? st.deep : shade(st.deep, 14);
      ctx.lineWidth = Math.max(1.5, sc * 0.028);
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(la) * len, p.y - Math.sin(la) * len * squash);
      ctx.lineTo(p.x + Math.cos(la) * len, p.y + Math.sin(la) * len * squash);
      ctx.stroke();
      ctx.fillStyle = st.spark;
      const g = Math.max(1, sc * 0.016);
      ctx.fillRect(p.x + Math.cos(la) * len - g / 2, p.y + Math.sin(la) * len * squash - g / 2, g, g);
    }
    ctx.restore();
  },
};

/**
 * HAFT_CHECK — "the rude period."
 * The shortest sentence in the school, said with the whole haft: the
 * butt-cap itself drives forward — a steel disc seen edge-on, dark
 * rim, lit face, haft stub behind it — into a square pressure frame
 * that stamps, tilts with the ground, and is gone. The restraint IS
 * the signature next to the school's mountains.
 */
const haft_check: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2b2);
    for (let k = 0; k < 3; k++) {
      c.particles.burst(
        c.wx + Math.cos(c.dir) * c.radius * 0.6,
        c.wy + Math.sin(c.dir) * c.radius * 0.6 * c.squash - 0.45,
        1,
        [c.st.spark],
        { speed: 1.4 + rand() * 0.8, life: 0.3, size: 0.06, gravity: 6, dir: c.dir, spread: 0.5, shape: 'glint' },
      );
    }
    // The rude breath: one cough of dust off the checked chest.
    dust.deployments.kick!(asMatter(c),
      c.wx + Math.cos(c.dir) * c.radius * 0.65,
      c.wy + Math.sin(c.dir) * c.radius * 0.65 * c.squash,
      { scale: 0.4 });
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.45) return;
    const f = t / 0.45;
    // The drive: fast out, brief hold, pull back — a jab, not a throw.
    const punch = f < 0.35 ? f / 0.35 : f < 0.6 ? 1 : 1 - (f - 0.6) * 0.9;
    const p = groundPt(c, c.rPx * (0.35 + 0.32 * punch), c.dir);
    const hy = p.y - sc * 0.5;
    const ca = Math.cos(c.dir);
    const sn = Math.sin(c.dir) * c.squash;
    const nrm = Math.hypot(ca, sn) || 1;
    const ux = ca / nrm;
    const uy = sn / nrm;
    ctx.save();
    ctx.lineCap = 'butt';
    // The haft stub: dark wood driving behind the cap.
    ctx.globalAlpha = 0.9 * (1 - f * f);
    ctx.strokeStyle = '#4a3a2a';
    ctx.lineWidth = Math.max(3, sc * 0.075);
    ctx.beginPath();
    ctx.moveTo(p.x - ux * sc * 0.55, hy - uy * sc * 0.55);
    ctx.lineTo(p.x - ux * sc * 0.12, hy - uy * sc * 0.12);
    ctx.stroke();
    ctx.strokeStyle = '#6a543c';
    ctx.lineWidth = Math.max(1.5, sc * 0.028);
    ctx.beginPath();
    ctx.moveTo(p.x - ux * sc * 0.52, hy - uy * sc * 0.52 - sc * 0.02);
    ctx.lineTo(p.x - ux * sc * 0.14, hy - uy * sc * 0.14 - sc * 0.02);
    ctx.stroke();
    // The butt-cap: a steel disc edge-on — dark rim ellipse with a
    // lit forward face; the whole school's weight behind two shapes.
    ctx.fillStyle = shade(st.mid, -20);
    ctx.beginPath();
    ctx.ellipse(p.x - ux * sc * 0.06, hy - uy * sc * 0.06, sc * 0.075, sc * 0.13, Math.atan2(uy, ux), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(st.mid, 12);
    ctx.beginPath();
    ctx.ellipse(p.x, hy, sc * 0.06, sc * 0.115, Math.atan2(uy, ux), 0, Math.PI * 2);
    ctx.fill();
    // The pressure frame: the flat square stamp, tilted to the ground
    // plane, snapping outward once — the period, printed.
    if (f > 0.28) {
      const ff = (f - 0.28) / 0.72;
      const s = sc * (0.28 + 0.3 * ff);
      ctx.globalAlpha = 0.85 * (1 - ff);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.save();
      ctx.translate(p.x + ux * sc * 0.1, hy + uy * sc * 0.1);
      ctx.scale(1, c.squash);
      ctx.rotate(Math.PI / 4);
      ctx.strokeRect(-s / 2, -s / 2, s, s);
      ctx.restore();
      ctx.globalAlpha = 0.5 * (1 - ff);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.025);
      ctx.save();
      ctx.translate(p.x + ux * sc * 0.1, hy + uy * sc * 0.1);
      ctx.scale(1, c.squash);
      ctx.rotate(Math.PI / 4);
      ctx.strokeRect(-s * 0.72, -s * 0.72, s * 1.44, s * 1.44);
      ctx.restore();
    }
    ctx.restore();
  },
};

/**
 * IRON_PENDULUM — "the tick and the tock."
 * Two opposed ribbons on their own clocks — the first crosses one
 * way, the second answers on the return plane while the first still
 * hangs — and under the turnaround the boots leave two pivot scuffs,
 * dark crescents with lit lips where the stance ground itself in.
 */
const iron_pendulum: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2b3);
    for (let k = 0; k < 4; k++) {
      const side = k % 2 === 0 ? 1 : -1;
      c.particles.burst(
        c.wx + Math.cos(c.dir + side * 1.1) * c.radius * 0.7,
        c.wy + Math.sin(c.dir + side * 1.1) * c.radius * 0.7 * c.squash - 0.4,
        1,
        [c.st.spark, c.st.core],
        { speed: 1.5 + rand(), life: 0.35, size: 0.07, gravity: 5, dir: c.dir + side * 1.4, spread: 0.4, shape: 'glint' },
      );
    }
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t < 0.45) sweepBand(c, c.dir - 1.1, c.dir + 1.1, t / 0.45, 0.75);
    if (t >= 0.3 && t < 0.8) sweepBand(c, c.dir + 1.1, c.dir - 1.1, (t - 0.3) / 0.5, 0.62);
    // The turnaround: at the moment the tock answers the tick, one
    // held flash hangs at the reversal point — the weight, weightless
    // for exactly one beat.
    if (t > 0.26 && t < 0.42) {
      const ff = 1 - Math.abs(t - 0.34) / 0.08;
      const p = groundPt(c, c.rPx * 0.7, c.dir + 1.1);
      ctx.save();
      ctx.globalAlpha = 0.9 * ff;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, p.x, p.y - sc * 0.42, sc * 0.16 * ff + sc * 0.05, sc * 0.055, 4, c.dir);
      ctx.fill();
      ctx.restore();
    }
  },
  ground(c) {
    // The pivot scuffs: the stance grinding in as the plane reverses.
    const { ctx, st, t, sc, squash } = c;
    if (t < 0.2 || t > 0.85) return;
    const f = (t - 0.2) / 0.65;
    ctx.save();
    for (const side of [-1, 1]) {
      const bx = c.px + side * sc * 0.16;
      const by = c.py + sc * 0.04 * squash;
      ctx.globalAlpha = 0.5 * (1 - f);
      ctx.strokeStyle = shade(st.deep, -10);
      ctx.lineWidth = Math.max(2, sc * 0.045);
      ctx.beginPath();
      ctx.ellipse(bx, by, sc * 0.14, sc * 0.14 * squash, 0, side > 0 ? -0.6 : Math.PI - 0.6, side > 0 ? 1.1 : Math.PI + 1.1);
      ctx.stroke();
      ctx.globalAlpha = 0.35 * (1 - f);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.02);
      ctx.beginPath();
      ctx.ellipse(bx, by - sc * 0.015, sc * 0.14, sc * 0.14 * squash, 0, side > 0 ? -0.6 : Math.PI - 0.6, side > 0 ? 1.1 : Math.PI + 1.1);
      ctx.stroke();
    }
    ctx.restore();
  },
};

/**
 * FAULT_LINE — "the ground picks a side."
 * A dark fissure cracks open along the aim and the ground LITERALLY
 * picks a side: the far shelf drops a step — a band of subsided turf
 * hanging below the rim — while the near lip catches light down its
 * whole length. Faceted stones lean out of the near edge, a dust
 * seep breathes from the mouth, and when the crack settles shut the
 * dropped shelf is the last thing to fade.
 */
const fault_line: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    // TRUE earth leaves the crack: a gouge of hopping chunks and
    // billow down the fissure, and a standing bank on the far lip.
    dust.deployments.gouge!(m,
      c.wx + Math.cos(c.dir) * c.radius * 0.4,
      c.wy + Math.sin(c.dir) * c.radius * 0.4 * c.squash,
      { dir: c.dir, scale: 0.8 });
    dust.deployments.billow!(m,
      c.wx + Math.cos(c.dir) * c.radius * 0.8,
      c.wy + Math.sin(c.dir) * c.radius * 0.8 * c.squash,
      { radius: 0.4, dur: 1.0, scale: 0.6 });
  },
  ground(c) {
    const { ctx, st, t, sc } = c;
    const rand = srand(c.seed ^ 0x2b5);
    // The mouth: open fast, hold, settle.
    const open = t < 0.25 ? t / 0.25 : t < 0.7 ? 1 : Math.max(0, 1 - (t - 0.7) / 0.3);
    const segs = 6;
    const nx = -Math.sin(c.dir);
    const ny = Math.cos(c.dir) * c.squash;
    // Station the fissure once; every pass walks the same crack.
    const sx: number[] = [c.px];
    const sy: number[] = [c.py];
    const jags: number[] = [0];
    for (let k = 1; k <= segs; k++) {
      const p = groundPt(c, (k / segs) * c.rPx * 1.3, c.dir);
      sx.push(p.x);
      sy.push(p.y);
      jags.push((rand() - 0.5) * sc * 0.3);
    }
    const w = sc * 0.16 * open;
    ctx.save();
    // The dropped shelf: the far side subsides a step — a band of
    // shadow hanging under the far lip, widest at the mouth's middle.
    ctx.globalAlpha = 0.5 * Math.max(open, t < 0.95 ? 0.45 : (1 - t) * 9);
    ctx.fillStyle = shade(st.deep, -6);
    ctx.beginPath();
    for (let k = 0; k <= segs; k++) {
      const drop = w * 1.9 * Math.sin((k / segs) * Math.PI);
      (k === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, sx[k]! + nx * (jags[k]! - w), sy[k]! + ny * (jags[k]! - w));
      if (k === segs) {
        for (let j = segs; j >= 0; j--) {
          const d2 = w * 1.9 * Math.sin((j / segs) * Math.PI);
          ctx.lineTo(sx[j]! + nx * (jags[j]! - w - d2 / (sc * 0.16)) , sy[j]! + ny * (jags[j]! - w) - d2 * 0.5);
        }
      }
    }
    ctx.closePath();
    ctx.fill();
    // The mouth itself: void-dark, jagged, widening then settling.
    ctx.globalAlpha = 0.9 * open;
    ctx.fillStyle = shade(st.deep, -26);
    ctx.beginPath();
    ctx.moveTo(sx[0]!, sy[0]!);
    for (let k = 1; k <= segs; k++) ctx.lineTo(sx[k]! + nx * (jags[k]! + w), sy[k]! + ny * (jags[k]! + w));
    for (let k = segs; k >= 1; k--) ctx.lineTo(sx[k]! + nx * (jags[k]! - w), sy[k]! + ny * (jags[k]! - w));
    ctx.closePath();
    ctx.fill();
    // The near wall: the inside of the crack catches a little light
    // along the near lip — the hole has a wall, the wall has a face.
    ctx.globalAlpha = 0.6 * open;
    ctx.strokeStyle = shade(st.deep, 12);
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    ctx.beginPath();
    ctx.moveTo(sx[0]!, sy[0]!);
    for (let k = 1; k <= segs; k++) ctx.lineTo(sx[k]! + nx * (jags[k]! + w * 0.75), sy[k]! + ny * (jags[k]! + w * 0.75));
    ctx.stroke();
    // The lit near lip: the rim the light agrees with.
    ctx.globalAlpha = 0.7 * Math.max(open, t < 0.9 ? 0.4 : 0);
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1, sc * 0.028);
    ctx.beginPath();
    ctx.moveTo(sx[0]!, sy[0]!);
    for (let k = 1; k <= segs; k++) ctx.lineTo(sx[k]! + nx * (jags[k]! + w) + nx * sc * 0.02, sy[k]! + ny * (jags[k]! + w) + ny * sc * 0.02);
    ctx.stroke();
    // Stones leaning out of the near lip: two chunks with faces.
    if (open > 0.5) {
      for (let k = 0; k < 2; k++) {
        const i = 2 + k * 2;
        stone(ctx, sx[i]! + nx * (jags[i]! + w + sc * 0.09), sy[i]! + ny * (jags[i]! + w) - sc * 0.05,
          sc * (0.1 + rand() * 0.05), st.deep, st.mid, (rand() - 0.5) * 0.8);
      }
    }
    ctx.restore();
  },
  air(c) {
    // The seep: dust breathes out of the mouth while it stands open.
    if (c.t < 0.7 && Math.random() < c.frameDt * 5) {
      const f = 0.2 + Math.random() * 0.75;
      c.particles.burst(
        c.wx + Math.cos(c.dir) * c.radius * 1.3 * f,
        c.wy + Math.sin(c.dir) * c.radius * 1.3 * f * c.squash,
        1, [c.st.deep, shade(c.st.deep, 10)], {
          speed: 0.2, life: 0.7, size: 0.09, gravity: -0.5, drag: 1.6, grow: 0.3, shape: 'puff',
        },
      );
    }
  },
};

/**
 * COLOSSUS_STANCE — "the standing forge."
 * The buff is a body of heat, whole in one breath: the forge ring
 * lights at the boots — an iron annulus with a lit inner rim — the
 * air over the shoulders takes a mirage shiver, ember glints climb
 * the column, and anvil-sparks pop off the ring on their own clocks
 * before the whole working settles to a coal-glow. A forge lit, not
 * a fire burning.
 */
const colossus_stance: AbilitySig = {
  spawn(c) {
    // The forge lights TRUE: one standing plume at the body — licks
    // through the full combustion story, sparks climbing the column,
    // soot breathing off the top.
    fire.deployments.plume!(asMatter(c), c.wx, c.wy, { dur: 1.3, scale: 0.45 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    const lit = Math.min(1, t / 0.15);
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    // The forge ring: an iron annulus at the boots, dark band with a
    // lit inner rim — heat looks OUT of a forge, not off it.
    ctx.globalAlpha = 0.6 * lit * fade;
    ctx.strokeStyle = shade(st.deep, -12);
    ctx.lineWidth = Math.max(3, sc * 0.09);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, sc * 0.52, sc * 0.52 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    const throb = 0.7 + 0.3 * Math.sin(c.now / 140);
    ctx.globalAlpha = 0.8 * lit * fade * throb;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, sc * 0.44, sc * 0.44 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Anvil sparks: four seats on the ring pop on staggered clocks.
    ctx.fillStyle = st.core;
    for (let k = 0; k < 4; k++) {
      const popT = 0.2 + k * 0.16;
      const u = (t - popT) / 0.1;
      if (u < 0 || u > 1) continue;
      const a = (k / 4) * Math.PI * 2 + 0.7;
      const p = groundPt(c, sc * 0.5, a);
      ctx.globalAlpha = (1 - u) * fade;
      ctx.beginPath();
      burstStarPath(ctx, p.x, p.y - sc * 0.06 - u * sc * 0.14, sc * 0.08 * (1 - u * 0.4), sc * 0.03, 4, k * 1.3);
      ctx.fill();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    // The mirage: two shivering verticals flanking the shoulders —
    // heat bending the air where the body stands.
    for (const side of [-1, 1]) {
      const wob = Math.sin(c.now / 90 + side * 2) * sc * 0.025;
      ctx.globalAlpha = 0.3 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      ctx.beginPath();
      ctx.moveTo(c.px + side * sc * 0.3 + wob, c.py - sc * 0.25);
      ctx.quadraticCurveTo(
        c.px + side * sc * 0.34 - wob, c.py - sc * 0.65,
        c.px + side * sc * 0.28 + wob, c.py - sc * 1.05,
      );
      ctx.stroke();
    }
    // Embers climb the column, gated to the frame.
    if (Math.random() < c.frameDt * 9 * fade) {
      c.particles.burst(c.wx + (Math.random() - 0.5) * 0.5, c.wy - Math.random() * 0.6, 1, [st.spark, st.core], {
        speed: 0.4, life: 0.6, size: 0.06, gravity: -1.6, drag: 1.5, shape: 'glint', flicker: 0.4,
      });
    }
    ctx.restore();
    c.glow(c.wx, c.wy, 0.9, 0.2 * fade);
  },
};

/**
 * SKYSUNDER — "the meteor step."
 * Two wires, one verdict. The leap (dash): the body leaves — a rising
 * smear off the launch point while the caster's SHADOW slides along
 * the ground to the landing mark and waits there, growing. The
 * landing (blast): a comet mass snaps down the last height into a
 * crater bowl with a LIT FAR RIM, stones with faces topple outward,
 * and the dust curtain stands and falls. A verdict, then its echo.
 */
const skysunder: AbilitySig = {
  spawn(c) {
    if (c.kind === 'dash') return; // the leap borrows no earth
    // The landing is TRUE: the library's four-voice ground smash.
    dust.deployments.slam!(asMatter(c), c.wx, c.wy, { scale: 1.1 });
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (c.kind === 'dash') {
      // The ascent: a rising smear where the body left the world.
      if (t > 0.5) return;
      const f = t / 0.5;
      ctx.save();
      ctx.globalAlpha = 0.6 * (1 - f);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.5, sc * 0.09);
      ctx.beginPath();
      ctx.moveTo(c.px, c.py - sc * 0.3);
      ctx.lineTo(c.px + sc * 0.06, c.py - sc * (0.3 + 1.4 * f) - sc * 0.5);
      ctx.stroke();
      ctx.globalAlpha = 0.85 * (1 - f);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.moveTo(c.px, c.py - sc * 0.35);
      ctx.lineTo(c.px + sc * 0.04, c.py - sc * (0.35 + 1.1 * f) - sc * 0.5);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (t > 0.34) return;
    const f = t / 0.34;
    // The comet: a filled falling mass — white heart in a steel
    // sheath, convergence lines pulled in behind it — snapping down
    // the last height onto the mark.
    const h = sc * 3.4 * (1 - f);
    const cy = c.py - sc * 0.45 - h;
    ctx.save();
    ctx.globalAlpha = 0.55 * (1 - f * 0.5);
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.moveTo(c.px - sc * 0.17, cy - sc * 1.1);
    ctx.lineTo(c.px + sc * 0.17, cy - sc * 1.1);
    ctx.lineTo(c.px + sc * 0.07, cy + sc * 0.15);
    ctx.lineTo(c.px - sc * 0.07, cy + sc * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.9 * (1 - f * 0.3);
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.moveTo(c.px - sc * 0.075, cy - sc * 0.95);
    ctx.lineTo(c.px + sc * 0.075, cy - sc * 0.95);
    ctx.lineTo(c.px, cy + sc * 0.18);
    ctx.closePath();
    ctx.fill();
    // Convergence: the air pulled in after the mass.
    ctx.globalAlpha = 0.5 * (1 - f);
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1, sc * 0.025);
    ctx.beginPath();
    for (const off of [-0.3, 0.32]) {
      ctx.moveTo(c.px + sc * off, cy - sc * 1.5);
      ctx.lineTo(c.px + sc * off * 0.4, cy - sc * 0.4);
    }
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx, c.wy, 1.2, 0.35 * (1 - f));
  },
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    if (c.kind === 'dash') {
      // The traveling shadow: the verdict's address, telegraphed —
      // slides from the launch to the mark and grows as the body
      // climbs toward its turn.
      const f = Math.min(1, t / 0.75);
      const gx = c.px + (c.px2 - c.px) * f;
      const gy = c.py + (c.py2 - c.py) * f;
      ctx.save();
      ctx.globalAlpha = 0.4 + 0.25 * f;
      ctx.fillStyle = shade(st.deep, -16);
      ctx.beginPath();
      ctx.ellipse(gx, gy, sc * (0.2 + 0.22 * f), sc * (0.2 + 0.22 * f) * squash * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    if (t > 0.75) return;
    const f = t / 0.75;
    const rand = srand(c.seed ^ 0x2b9);
    ctx.save();
    // The crater bowl: near rim in shadow, FAR RIM LIT — the bowl
    // faces the sky and the sky answers.
    const R = c.rPx * (0.5 + 0.2 * Math.min(1, f * 3));
    ctx.globalAlpha = 0.55 * (1 - f);
    ctx.strokeStyle = shade(st.deep, -14);
    ctx.lineWidth = Math.max(3, sc * 0.1);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, R, R * squash, 0, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
    ctx.globalAlpha = 0.6 * (1 - f);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.06);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py - sc * 0.03, R, R * squash, 0, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    // Rim stones: chunks with faces riding the ring outward, each
    // toppling as it slows.
    ctx.globalAlpha = 0.85 * (1 - f);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.6;
      const p = groundPt(c, c.rPx * (0.5 + 0.45 * f), a);
      stone(ctx, p.x, p.y - c.sc * 0.2 * (1 - f), c.sc * (0.1 + rand() * 0.08), st.deep, st.mid, rand() * 1.2 + f * (k % 2 === 0 ? 1.4 : -1.4));
    }
    ctx.restore();
  },
};

/**
 * EXECUTIONERS_ARC — "the low lantern."
 * A narrow, DARK, waist-low ribbon — the one sweep in the school that
 * refuses to shine — until its terminal third, where the edge finds
 * one white line and ends in a burst: the lantern, lit low and last.
 * The glint it leaves hangs longest of anything in the arc, and the
 * droplets that follow fall dark and dry.
 */
const executioners_arc: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2ba);
    for (let k = 0; k < 4; k++) {
      c.particles.burst(
        c.wx + Math.cos(c.dir + 0.5) * c.radius * 0.7,
        c.wy + Math.sin(c.dir + 0.5) * c.radius * 0.7 * c.squash - 0.3,
        1,
        [c.st.mid, c.st.deep],
        { speed: 1.0 + rand() * 0.8, life: 0.5, size: 0.07, gravity: 8, dir: c.dir + 0.6, spread: 0.4, fade: c.st.deep },
      );
    }
  },
  air(c) {
    const { ctx, st, t, sc, squash } = c;
    if (t > 0.75) {
      // Even gone, the lantern: the terminal glint outlives the arc.
      const lf = (1 - t) / 0.25;
      const p = groundPt(c, c.rPx * 0.72, c.dir + 0.7);
      ctx.save();
      ctx.globalAlpha = 0.85 * lf;
      ctx.fillStyle = st.core;
      const g = Math.max(1.5, sc * 0.032);
      ctx.fillRect(p.x - g / 2, p.y - sc * 0.42 - g * 1.6, g, g * 3.2);
      ctx.fillRect(p.x - g * 1.6, p.y - sc * 0.42 - g / 2, g * 3.2, g);
      ctx.restore();
      return;
    }
    const f = t / 0.55;
    const lift = sc * 0.36; // waist-low, lower than the school's hip
    const r = c.rPx * 0.72;
    const head = c.dir - 0.7 + 1.4 * Math.min(1, f * 1.25);
    const tail = Math.max(c.dir - 0.7, head - 0.8);
    ctx.save();
    ctx.lineCap = 'butt';
    // The dark stroke: deep-bodied, no shine — the executioner works
    // without an audience.
    ctx.globalAlpha = 0.7 * (1 - f * 0.5);
    ctx.strokeStyle = shade(st.deep, -8);
    ctx.lineWidth = Math.max(3, sc * 0.15);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py - lift, r, r * squash, 0, tail, head);
    ctx.stroke();
    ctx.globalAlpha = 0.55 * (1 - f * 0.5);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.07);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py - lift, r, r * squash, 0, tail, head);
    ctx.stroke();
    // The terminal third earns the edge: white joins only at the end.
    if (head > c.dir + 0.23) {
      ctx.globalAlpha = 0.95 * (1 - f * 0.3);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py - lift, r + sc * 0.06, (r + sc * 0.06) * squash, 0, Math.max(tail, c.dir + 0.23), head);
      ctx.stroke();
    }
    // The lantern: the arc's end learns it was the point.
    if (f > 0.6) {
      const p = groundPt(c, r, c.dir + 0.7);
      const ff = (f - 0.6) / 0.4;
      ctx.globalAlpha = 0.95 * (1 - ff * 0.4);
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, p.x, p.y - lift, sc * 0.22 * (0.5 + ff), sc * 0.07, 4, 0.5);
      ctx.fill();
    }
    ctx.restore();
  },
  ground(c) {
    // The stroke only mattered at its end: a short dark mow line
    // under the terminal third, nothing anywhere else.
    const { ctx, st, t, sc, squash } = c;
    if (t < 0.3 || t > 0.8) return;
    const f = (t - 0.3) / 0.5;
    ctx.save();
    ctx.globalAlpha = 0.45 * (1 - f);
    ctx.strokeStyle = shade(st.deep, -10);
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, c.rPx * 0.72, c.rPx * 0.72 * squash, 0, c.dir + 0.25, c.dir + 0.72);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * AVALANCHE — "three stones down the hill."
 * The flurry's beats each get their own BOULDER: a faceted chunk
 * bounding into the arc — tumbling as it falls, landing with a true
 * dust stamp and a splash of shards, then LYING there, settling with
 * one last rock of its mass — each volley a step farther downhill.
 * The hill keeps arriving until it is finished.
 */
const avalanche: AbilitySig = {
  air(c) {
    const { ctx, st, t, sc } = c;
    const rand = srand(c.seed ^ 0x2bb);
    // Three boulders on staggered windows, each farther out.
    for (let v = 0; v < 3; v++) {
      const start = v * 0.2;
      const end = start + 0.55;
      if (t < start || t > end) continue;
      const f = (t - start) / (end - start);
      const a = c.dir + (rand() - 0.5) * 1.1;
      const reach = 0.35 + v * 0.22 + rand() * 0.15;
      const p = groundPt(c, c.rPx * reach, a);
      const s = sc * (0.16 + rand() * 0.06);
      ctx.save();
      if (f < 0.45) {
        // The fall: tumbling down from height, shadow waiting below.
        const ff = f / 0.45;
        const drop = sc * 1.9 * (1 - ff * ff);
        ctx.globalAlpha = 0.35 * ff;
        ctx.fillStyle = shade(st.deep, -16);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, s * (0.5 + ff * 0.5), s * 0.4 * c.squash, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.95;
        stone(ctx, p.x, p.y - sc * 0.12 - drop, s, st.deep, st.mid, rand() * 1.5 + ff * 5);
      } else {
        // Landed: the boulder LIES there, rocking once to rest.
        const ff = (f - 0.45) / 0.55;
        const rock = Math.sin(ff * Math.PI * 2.5) * 0.12 * (1 - ff);
        ctx.globalAlpha = 0.4 * (1 - ff * 0.5);
        ctx.fillStyle = shade(st.deep, -16);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, s * 1.05, s * 0.42 * c.squash, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.95 * (1 - ff * ff);
        stone(ctx, p.x, p.y - sc * 0.11, s, st.deep, st.mid, rand() * 1.5 + rock);
      }
      ctx.restore();
    }
    // Each boulder LANDS on its crossing frame: one TRUE dust stamp
    // and a splash of shards as the mass touches down.
    const lifeMs = t > 0 ? c.age / t : 0;
    const tPrev = lifeMs > 0 ? (c.age - c.frameDt * 1000) / lifeMs : 0;
    for (let v = 0; v < 3; v++) {
      const landT = v * 0.2 + 0.25;
      if (tPrev < landT && t >= landT) {
        const rand2 = srand(c.seed ^ (0x2cc + v));
        const a = c.dir + (rand2() - 0.5) * 1.1;
        const wx = c.wx + Math.cos(a) * c.radius * (0.35 + v * 0.22);
        const wy = c.wy + Math.sin(a) * c.radius * (0.35 + v * 0.22) * c.squash;
        dust.deployments.kick!(asMatter(c), wx, wy, { scale: 0.6 });
        c.particles.burst(wx, wy - 0.1, 4, [c.st.deep, c.st.mid], {
          speed: 1.4, life: 0.4, size: 0.07, gravity: 7, shape: 'shard', spin: 9,
        });
      }
    }
  },
  spawn(c) {
    // The hill announces itself: a rolling TRUE dust cloud over the
    // arc while the boulders arrive.
    dust.deployments.billow!(asMatter(c),
      c.wx + Math.cos(c.dir) * c.radius * 0.5,
      c.wy + Math.sin(c.dir) * c.radius * 0.5 * c.squash,
      { radius: 0.5, dur: 1.0, scale: 0.7 });
  },
};

/**
 * BREAKER_CHARGE — "the plow line."
 * The dash goes THROUGH: a blunt shoulder-wedge with a lit top facet
 * drives the front, peeling two curls of turned earth off its point —
 * rolled sod ridges with pale top edges angling back like water off
 * a prow — while the lane behind is pressed FLAT into a dark band.
 * At the far end the wedge arrives in a burst star. Not around.
 */
const breaker_charge: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const dx = c.wx2 - c.wx;
    const dy = c.wy2 - c.wy;
    const ang = Math.atan2(dy, dx);
    // The plow throws TRUE clods to both sides along the run.
    for (const [f, side] of [[0.3, 1], [0.7, -1]] as const) {
      dust.deployments.gouge!(m, c.wx + dx * f, c.wy + dy * f, {
        dir: ang + side * (Math.PI / 2), scale: 0.5,
      });
    }
    // The shoulder arrives: one true breath at the far end.
    dust.deployments.kick!(m, c.wx2, c.wy2, { scale: 0.6 });
  },
  ground(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.7) return;
    const f = t / 0.7;
    const ang = Math.atan2(c.py2 - c.py, c.px2 - c.px);
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang);
    const reach = Math.min(1, t / 0.3);
    const hx = c.px + (c.px2 - c.px) * reach;
    const hy = c.py + (c.py2 - c.py) * reach;
    ctx.save();
    // The pressed lane: the run flattened into one dark band — the
    // ground remembers being walked THROUGH.
    const w = sc * 0.2;
    ctx.globalAlpha = 0.75 * (1 - f);
    ctx.fillStyle = shade(st.deep, -16);
    ctx.beginPath();
    ctx.moveTo(c.px + nx * w, c.py + ny * w);
    ctx.lineTo(hx + nx * w, hy + ny * w);
    ctx.lineTo(hx - nx * w, hy - ny * w);
    ctx.lineTo(c.px - nx * w, c.py - ny * w);
    ctx.closePath();
    ctx.fill();
    // The lane's rims: a pale pressed edge down both sides — the
    // band reads as a PRINT, not a shadow.
    ctx.globalAlpha = 0.5 * (1 - f);
    ctx.strokeStyle = shade(st.mid, 8);
    ctx.lineWidth = Math.max(1, sc * 0.022);
    ctx.beginPath();
    ctx.moveTo(c.px + nx * w, c.py + ny * w);
    ctx.lineTo(hx + nx * w, hy + ny * w);
    ctx.moveTo(c.px - nx * w, c.py - ny * w);
    ctx.lineTo(hx - nx * w, hy - ny * w);
    ctx.stroke();
    // The turned curls: two sod ridges peeling back from the head,
    // dark rolls with pale top edges — the prow's work.
    for (const side of [-1, 1]) {
      ctx.globalAlpha = 0.75 * (1 - f);
      ctx.strokeStyle = shade(st.deep, -8);
      ctx.lineWidth = Math.max(3, sc * 0.09);
      ctx.beginPath();
      ctx.moveTo(hx + nx * side * w * 0.8, hy + ny * side * w * 0.8);
      ctx.quadraticCurveTo(
        hx - Math.cos(ang) * sc * 0.5 + nx * side * w * 2.2, hy - Math.sin(ang) * sc * 0.5 + ny * side * w * 2.2,
        hx - Math.cos(ang) * sc * 1.1 + nx * side * w * 2.8, hy - Math.sin(ang) * sc * 1.1 + ny * side * w * 2.8,
      );
      ctx.stroke();
      ctx.globalAlpha = 0.5 * (1 - f);
      ctx.strokeStyle = shade(st.mid, 10);
      ctx.lineWidth = Math.max(1, sc * 0.024);
      ctx.beginPath();
      ctx.moveTo(hx + nx * side * w * 0.8, hy + ny * side * w * 0.8 - sc * 0.03);
      ctx.quadraticCurveTo(
        hx - Math.cos(ang) * sc * 0.5 + nx * side * w * 2.2, hy - Math.sin(ang) * sc * 0.5 + ny * side * w * 2.2 - sc * 0.03,
        hx - Math.cos(ang) * sc * 1.1 + nx * side * w * 2.8, hy - Math.sin(ang) * sc * 1.1 + ny * side * w * 2.8 - sc * 0.03,
      );
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.45) return;
    const f = t / 0.45;
    const ang = Math.atan2(c.py2 - c.py, c.px2 - c.px);
    const reach = Math.min(1, t / 0.3);
    const hx = c.px + (c.px2 - c.px) * reach;
    const hy = c.py + (c.py2 - c.py) * reach - sc * 0.5;
    ctx.save();
    // The shoulder-wedge: a filled blunt prow with a lit top facet
    // and a dark keel, driving the front of the line.
    const s = sc * 0.62;
    ctx.globalAlpha = 0.9 * (1 - f * f);
    ctx.fillStyle = shade(st.mid, -18);
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(ang) * s, hy + Math.sin(ang) * s);
    ctx.lineTo(hx + Math.cos(ang + 2.5) * s * 0.62, hy + Math.sin(ang + 2.5) * s * 0.62);
    ctx.lineTo(hx + Math.cos(ang - 2.5) * s * 0.62, hy + Math.sin(ang - 2.5) * s * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(ang) * s * 0.92, hy + Math.sin(ang) * s * 0.92 - sc * 0.05);
    ctx.lineTo(hx + Math.cos(ang + 2.45) * s * 0.5, hy + Math.sin(ang + 2.45) * s * 0.5 - sc * 0.09);
    ctx.lineTo(hx + Math.cos(ang - 2.45) * s * 0.5, hy + Math.sin(ang - 2.45) * s * 0.5 - sc * 0.09);
    ctx.closePath();
    ctx.fill();
    // The arrival: at full reach, the star says THROUGH.
    if (reach >= 1) {
      const ff = Math.min(1, (t - 0.3) / 0.15);
      ctx.globalAlpha = 0.95 * (1 - ff);
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      burstStarPath(ctx, c.px2 + Math.cos(ang) * s, c.py2 - sc * 0.5 + Math.sin(ang) * s, sc * 0.3 * (0.4 + ff), sc * 0.1, 5, ang);
      ctx.fill();
    }
    ctx.restore();
    c.glow(c.wx2, c.wy2, 0.9, 0.25 * (1 - f));
  },
};

/**
 * TITANS_VERDICT — "the gavel rings."
 * Every pulse is a spoken ring: the expanding band CRACKS into flat
 * slab segments as it travels — each a course of earth with a lit
 * top edge and a dark leading face, hinged up a hand's width by the
 * word passing under it — while faceted stones stand briefly on the
 * ring and a white strike-mark burns down at the gavel-point. The
 * earth agreeing in courses, not in fire.
 */
const titans_verdict: AbilitySig = {
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    if (t > 0.85) return;
    const rand = srand(c.seed ^ 0x2be);
    const f = t / 0.85;
    const r = c.rPx * (0.3 + 0.7 * f);
    const segs = 10;
    ctx.save();
    // The ring in courses: each segment a slab with a dark leading
    // face below and a lit top edge above — the ground, shelving.
    for (let k = 0; k < segs; k++) {
      const a0 = (k / segs) * Math.PI * 2 + f * 0.4;
      const gap = 0.12 + f * 0.3;
      const from = a0 + gap / 2;
      const to = a0 + (Math.PI * 2) / segs - gap / 2;
      const hinge = sc * 0.05 * Math.sin(Math.min(1, f * 2) * Math.PI);
      ctx.globalAlpha = 0.75 * (1 - f);
      ctx.strokeStyle = shade(st.deep, -12);
      ctx.lineWidth = Math.max(3, sc * 0.1);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py, r, r * squash, 0, from, to);
      ctx.stroke();
      ctx.globalAlpha = 0.8 * (1 - f);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py - hinge, r, r * squash, 0, from, to);
      ctx.stroke();
    }
    // Standing stones on the mid-life ring: chunks with faces.
    if (f > 0.3 && f < 0.8) {
      ctx.globalAlpha = 0.9 * (1 - f);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.5 + rand() * 0.4;
        const p = groundPt(c, r, a);
        stone(ctx, p.x, p.y - sc * 0.12, sc * 0.12, st.deep, st.mid, (rand() - 0.5) * 0.6);
      }
    }
    // The gavel-point: the strike mark at the center, burning down
    // through the pulse — where the word was said.
    ctx.globalAlpha = 0.85 * (1 - f);
    ctx.fillStyle = st.core;
    ctx.beginPath();
    burstStarPath(ctx, c.px, c.py - sc * 0.06, sc * 0.16 * (1 - f * 0.5), sc * 0.06, 4, f, squash);
    ctx.fill();
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * (0.4 + 0.6 * f), 0.2 * (1 - f));
  },
  spawn(c) {
    // The gavel falls TRUE: the four-voice ground smash under the
    // spoken rings.
    dust.deployments.slam!(asMatter(c), c.wx, c.wy, { scale: 0.8 });
  },
};

/**
 * WHIRLING_RUIN — "the steel weather."
 * The channel plants its feet and becomes a storm with a quiet at
 * its heart: each beat, one full-turn ribbon cones around the hub —
 * higher on the far side, the tent of steel — while sheared debris
 * leaves the rim on tangents and a scoured ring grinds into the
 * turf. At the center the haft stands DEAD STILL, a vertical calm
 * the whole ruin turns around. Be the calm; everything else is the
 * weather.
 */
const whirling_ruin: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2c5);
    // Each beat sheds shorn matter off the rim on tangents.
    for (let k = 0; k < 4; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.85,
        c.wy + Math.sin(a) * c.radius * 0.85 * c.squash - 0.4,
        1, [c.st.spark, c.st.mid],
        { speed: 2.2 + rand(), life: 0.4, size: 0.07, gravity: 4, dir: a + Math.PI / 2, spread: 0.2, shape: 'streak' },
      );
    }
  },
  air(c) {
    const { ctx, st, t, sc, squash } = c;
    const r = c.rPx * 0.85;
    const spin = c.now / 130 + (c.seed % 9);
    ctx.save();
    ctx.lineCap = 'butt';
    // The tent of steel: the ribbon runs the full turn, riding higher
    // on the far side — a cone, not a hoop. Drawn as two half-arcs
    // with their own lifts so the far pass reads BEHIND the hub.
    for (const [a0, a1, lift, alpha] of [
      [Math.PI * 0.05, Math.PI * 0.95, 0.34, 0.8],   // near pass, low
      [Math.PI * 1.05, Math.PI * 1.95, 0.58, 0.55],  // far pass, high
    ] as const) {
      const fade = 1 - t * 0.5;
      ctx.globalAlpha = 0.5 * alpha * fade;
      ctx.strokeStyle = shade(st.mid, -22);
      ctx.lineWidth = Math.max(3, sc * 0.15);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py - sc * lift + sc * 0.04, r, r * squash * 0.92, 0, a0 + spin % 0.5, a1 + spin % 0.5);
      ctx.stroke();
      ctx.globalAlpha = alpha * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.5, sc * 0.11);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py - sc * lift, r, r * squash * 0.92, 0, a0 + spin % 0.5, a1 + spin % 0.5);
      ctx.stroke();
      ctx.globalAlpha = alpha * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py - sc * lift, r + sc * 0.06, (r + sc * 0.06) * squash * 0.92, 0, a0 + spin % 0.5, a1 + spin % 0.5);
      ctx.stroke();
    }
    // The blade masses: two knots riding the turn opposite each
    // other — the steel you can actually SEE moving.
    for (const off of [0, Math.PI]) {
      const a = spin * 2.2 + off;
      const bx = c.px + Math.cos(a) * r;
      const lift = sc * (0.46 - 0.12 * Math.sin(a)); // low near, high far
      const by = c.py + Math.sin(a) * r * squash * 0.92 - lift;
      const ta = a + Math.PI / 2;
      ctx.globalAlpha = 0.9 * (1 - t * 0.4) * (0.7 + 0.3 * Math.sin(a));
      ctx.fillStyle = shade(st.mid, 16);
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(ta) * sc * 0.24, by + Math.sin(ta) * sc * 0.24 * squash);
      ctx.lineTo(bx - Math.cos(ta) * sc * 0.1 - Math.sin(ta) * sc * 0.08, by - (Math.sin(ta) * sc * 0.1 - Math.cos(ta) * sc * 0.08) * squash);
      ctx.lineTo(bx - Math.cos(ta) * sc * 0.1 + Math.sin(ta) * sc * 0.08, by - (Math.sin(ta) * sc * 0.1 + Math.cos(ta) * sc * 0.08) * squash);
      ctx.closePath();
      ctx.fill();
    }
    // The calm: the haft stands vertical and still at the hub — a
    // dark line with one lit edge and the hands' knot at the grip.
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = '#4a3a2a';
    ctx.lineWidth = Math.max(3, sc * 0.07);
    ctx.beginPath();
    ctx.moveTo(c.px, c.py - sc * 0.15);
    ctx.lineTo(c.px, c.py - sc * 1.0);
    ctx.stroke();
    ctx.strokeStyle = '#6a543c';
    ctx.lineWidth = Math.max(1, sc * 0.022);
    ctx.beginPath();
    ctx.moveTo(c.px + sc * 0.02, c.py - sc * 0.2);
    ctx.lineTo(c.px + sc * 0.02, c.py - sc * 0.95);
    ctx.stroke();
    ctx.fillStyle = shade(st.mid, -14);
    ctx.fillRect(c.px - sc * 0.055, c.py - sc * 0.68, sc * 0.11, sc * 0.09);
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.7, 0.14 * (1 - t * 0.5));
  },
  ground(c) {
    // The scoured ring: the turn grinding its circle into the turf,
    // nicked by the passes, with chips lying on the rim tangents.
    const { ctx, st, t, sc, squash } = c;
    const rand = srand(c.seed ^ 0x2c6);
    const r = c.rPx * 0.85;
    ctx.save();
    ctx.globalAlpha = 0.35 * (1 - t * 0.6);
    ctx.strokeStyle = shade(st.deep, -10);
    ctx.lineWidth = Math.max(3, sc * 0.09);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, r, r * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Scour nicks travel the ring with the spin.
    ctx.globalAlpha = 0.55 * (1 - t * 0.5);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    for (let k = 0; k < 5; k++) {
      const a = c.now / 130 + (k / 5) * Math.PI * 2;
      const p = groundPt(c, r, a);
      const ta = a + Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(ta) * sc * 0.09, p.y - Math.sin(ta) * sc * 0.09 * squash);
      ctx.lineTo(p.x + Math.cos(ta) * sc * 0.09, p.y + Math.sin(ta) * sc * 0.09 * squash);
      ctx.stroke();
    }
    // Lying chips shed past the rim, pale cut ends out.
    ctx.globalAlpha = 0.5 * (1 - t * 0.6);
    for (let k = 0; k < 4; k++) {
      const a = rand() * Math.PI * 2;
      const p = groundPt(c, r * (1.1 + rand() * 0.25), a);
      const la = a + Math.PI / 2 + (rand() - 0.5) * 0.5;
      const len = sc * (0.06 + rand() * 0.04);
      ctx.strokeStyle = k % 2 === 0 ? st.deep : shade(st.deep, 14);
      ctx.lineWidth = Math.max(1.5, sc * 0.026);
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(la) * len, p.y - Math.sin(la) * len * squash);
      ctx.lineTo(p.x + Math.cos(la) * len, p.y + Math.sin(la) * len * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
};

/**
 * GIANTSFALL — "the felling stroke."
 * The page remembers one thing: how the tall come down. An actual
 * greatblade — spine, edge-light, crossguard bar, long grip — drops
 * out of the sky onto the mark, its contact shadow tightening under
 * it as it falls, and BURIES: held quivering a beat over a cleft
 * that parts both ways, chips and one bright star at the bite. The
 * whole signature is vertical.
 */
const giantsfall: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2c3);
    for (let k = 0; k < 6; k++) {
      const a = c.dir + (rand() - 0.5) * 0.8;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.6,
        c.wy + Math.sin(a) * c.radius * 0.6 * c.squash - 0.3,
        1,
        [c.st.spark, c.st.core],
        { speed: 2.0 + rand() * 1.4, life: 0.5, size: 0.08, gravity: 6, dir: a, spread: 0.5, shape: 'glint' },
      );
    }
    // The ground answers the felling: one TRUE breath at the mark.
    dust.deployments.kick!(asMatter(c),
      c.wx + Math.cos(c.dir) * c.radius * 0.6,
      c.wy + Math.sin(c.dir) * c.radius * 0.6 * c.squash,
      { scale: 0.6 });
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.85) return;
    const p = groundPt(c, c.rPx * 0.6, c.dir);
    const drop = Math.min(1, t / 0.18); // the fall is FAST
    const held = t > 0.18;
    const quiver = held ? Math.sin(c.now / 34) * 0.05 * Math.max(0, 1 - (t - 0.18) / 0.4) : 0;
    const fade = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.25;
    const h = sc * 3.2 * (1 - drop); // height still to fall
    const L = sc * 1.5; // the blade's length
    ctx.save();
    ctx.translate(p.x, p.y - sc * 0.15 - h);
    ctx.rotate(quiver);
    ctx.globalAlpha = 0.95 * Math.max(0, fade);
    // The blade: a tapered greatsword body, point down — dark cheek
    // and steel cheek meeting at the spine, one white edge-light.
    ctx.fillStyle = shade(st.mid, -20);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-sc * 0.1, -L * 0.2);
    ctx.lineTo(-sc * 0.085, -L);
    ctx.lineTo(0, -L);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(sc * 0.1, -L * 0.2);
    ctx.lineTo(sc * 0.085, -L);
    ctx.lineTo(0, -L);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1, sc * 0.022);
    ctx.beginPath();
    ctx.moveTo(sc * 0.09, -L * 0.22);
    ctx.lineTo(sc * 0.078, -L * 0.96);
    ctx.stroke();
    // The crossguard: one heavy bar; the grip and pommel above it.
    ctx.fillStyle = shade(st.deep, -8);
    ctx.fillRect(-sc * 0.26, -L - sc * 0.05, sc * 0.52, sc * 0.09);
    ctx.strokeStyle = '#4a3a2a';
    ctx.lineWidth = Math.max(2.5, sc * 0.06);
    ctx.beginPath();
    ctx.moveTo(0, -L - sc * 0.05);
    ctx.lineTo(0, -L - sc * 0.42);
    ctx.stroke();
    ctx.fillStyle = shade(st.mid, 10);
    ctx.fillRect(-sc * 0.05, -L - sc * 0.52, sc * 0.1, sc * 0.1);
    ctx.restore();
    // The contact shadow: tightens under the falling mass — height,
    // read from the ground up.
    if (!held) {
      ctx.save();
      ctx.globalAlpha = 0.3 + 0.3 * drop;
      ctx.fillStyle = shade(st.deep, -16);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, sc * (0.34 - 0.16 * drop), sc * (0.34 - 0.16 * drop) * c.squash * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // The bite: the star at the burial instant, then the held beat.
    if (held && t < 0.5) {
      const ff = (t - 0.18) / 0.32;
      ctx.save();
      ctx.globalAlpha = 0.95 * (1 - ff);
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      burstStarPath(ctx, p.x, p.y - sc * 0.16, sc * 0.34 * (0.5 + ff * 0.5), sc * 0.11, 5, 0.4, c.squash);
      ctx.fill();
      ctx.restore();
    }
    c.glow(c.wx + Math.cos(c.dir) * c.radius * 0.6, c.wy + Math.sin(c.dir) * c.radius * 0.6, 0.9, 0.3 * Math.max(0, fade));
  },
  ground(c) {
    // The cleft: under the buried edge the ground parts both ways —
    // a short seam with lips, opening with the bite and staying.
    const { ctx, st, t, sc, squash } = c;
    if (t < 0.18 || t > 0.9) return;
    const f = Math.min(1, (t - 0.18) / 0.2);
    const fade = t < 0.65 ? 1 : (0.9 - t) / 0.25;
    const p = groundPt(c, c.rPx * 0.6, c.dir);
    const ta = Math.atan2(Math.sin(c.dir) * squash, Math.cos(c.dir)) + Math.PI / 2;
    const len = sc * 0.42 * f;
    ctx.save();
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = shade(st.deep, -22);
    ctx.lineWidth = Math.max(2.5, sc * 0.06 * f);
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(ta) * len, p.y - Math.sin(ta) * len);
    ctx.lineTo(p.x + Math.cos(ta) * len, p.y + Math.sin(ta) * len);
    ctx.stroke();
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1, sc * 0.022);
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(ta) * len * 0.9, p.y - Math.sin(ta) * len * 0.9 - sc * 0.025);
    ctx.lineTo(p.x + Math.cos(ta) * len * 0.9, p.y + Math.sin(ta) * len * 0.9 - sc * 0.025);
    ctx.stroke();
    ctx.restore();
  },
};


/**
 * COLOSSUS_ARC — "the full turn."
 * The greatblade's weapon art closes the circle: one sweep band that
 * runs the whole way around the caster, glints shed on the far side
 * where the eye least expects steel to still be moving.
 */
const colossus_arc: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2c0);
    for (let k = 0; k < 6; k++) {
      const a = c.dir + Math.PI + (rand() - 0.5) * 1.6;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.7,
        c.wy + Math.sin(a) * c.radius * 0.7 * c.squash - 0.4,
        1,
        [c.st.spark, c.st.core],
        { speed: 1.5 + rand(), life: 0.4, size: 0.07, gravity: 5, dir: a + 0.6, spread: 0.3, shape: 'glint' },
      );
    }
  },
  air(c) {
    if (c.t > 0.6) return;
    sweepBand(c, c.dir - Math.PI, c.dir + Math.PI, c.t / 0.6, 0.78);
  },
};

/**
 * QUAKEFALL — "the county line."
 * The maul's word: one massive stamp — a broad flat shock ellipse,
 * long fissures walking out of the print, a heavy slow dust bank,
 * and the deepest glow the school owns. Nothing rises; everything
 * SETTLES.
 */
const quakefall: AbilitySig = {
  spawn(c) {
    // The county line: the library's ground smash at the school's
    // heaviest working weight — everything lands, everything LIES.
    dust.deployments.slam!(asMatter(c), c.wx, c.wy, { scale: 1.3 });
  },
  ground(c) {
    const { ctx, st, t, sc } = c;
    const rand = srand(c.seed ^ 0x2c2);
    const f = Math.min(1, t / 0.8);
    ctx.save();
    // The print: a broad flat shock band.
    ctx.globalAlpha = 0.7 * (1 - f);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(3, sc * 0.14);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, c.rPx * (0.4 + 0.5 * f), c.rPx * (0.4 + 0.5 * f) * c.squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Fissures walking out of it.
    ctx.globalAlpha = 0.8 * (1 - f * 0.7);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + 0.3 + rand() * 0.3;
      const len = c.rPx * (0.5 + rand() * 0.6) * (0.4 + 0.6 * f);
      const mid = groundPt(c, len * 0.55, a);
      const tip = groundPt(c, len, a + (rand() - 0.5) * 0.3);
      ctx.beginPath();
      ctx.moveTo(c.px, c.py);
      ctx.lineTo(mid.x, mid.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius, 0.3 * (1 - f));
  },
};


// ============================================= THE ARMORY's weapon arts

/**
 * HEWERS_WHEEL — "the round."
 * The axe's answer to the colossus arc: the full circle, but rougher —
 * the band judders (an axe bites where a blade glides) and wood-pale
 * chips shear off the whole circumference instead of glints.
 */
const hewers_wheel: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2d0);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + rand() * 0.5;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.7,
        c.wy + Math.sin(a) * c.radius * 0.7 * c.squash - 0.35,
        1,
        [c.st.mid, c.st.deep],
        { speed: 1.6 + rand(), life: 0.45, size: 0.08, gravity: 6, dir: a + 0.5, spread: 0.4 },
      );
    }
  },
  air(c) {
    if (c.t > 0.6) return;
    sweepBand(c, c.dir - Math.PI, c.dir + Math.PI, c.t / 0.6, 0.74);
  },
};

/**
 * REAVERS_DUE — "the toll arm."
 * A short flat shove of a sweep, then the payment: a handful of
 * coin-bright glints thrown PAST the arc's end, the direction the
 * argument left in.
 */
const reavers_due: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2d1);
    for (let k = 0; k < 5; k++) {
      c.particles.burst(
        c.wx + Math.cos(c.dir) * c.radius * 0.6,
        c.wy + Math.sin(c.dir) * c.radius * 0.6 * c.squash - 0.4,
        1,
        [c.st.spark, c.st.core],
        { speed: 2.4 + rand() * 1.2, life: 0.5, size: 0.06, gravity: 7, dir: c.dir, spread: 0.5, shape: 'glint' },
      );
    }
  },
  air(c) {
    if (c.t > 0.45) return;
    sweepBand(c, c.dir - 0.55, c.dir + 0.55, c.t / 0.45, 0.78);
  },
};

/**
 * MOURNFIELD — "the plot."
 * Grave-quiet: a cold border breathes around the marked ground and
 * slow pale wisps stand up out of it and hang. Nothing bursts —
 * this is the school's one patient signature.
 */
const mournfield: AbilitySig = {
  ground(c) {
    const { ctx, st, t } = c;
    const breathe = 0.86 + 0.08 * Math.sin(c.age * 2.4);
    ctx.save();
    ctx.globalAlpha = 0.4 * (1 - t * 0.6);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, c.sc * 0.08);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, c.rPx * breathe, c.rPx * breathe * c.squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  spawn(c) {
    // The plot breathes TRUE cold: standing frost fog for the grave's
    // whole watch — sinking motes, patient sparkle. (The gated wisps
    // retired into it — one quiet, not two.)
    frost.deployments.fog!(asMatter(c), c.wx, c.wy, {
      radius: c.radius * 0.7, dur: 2.0, scale: 0.6,
    });
  },
};

/**
 * ASH_HARVEST — "the ember row."
 * The reap leaves a row: embers keep standing up out of the swept
 * ground for a beat after the stroke, born exactly where the band
 * passed — the harvest smoulders where it fell.
 */
const ash_harvest: AbilitySig = {
  spawn(c) {
    // The harvest smoulders where it fell: TRUE burning ground —
    // low hungry flame carpeting the swept side, embers standing up
    // out of it for a beat after the stroke. (The gated licks
    // retired into the pool — one smoulder.)
    fire.deployments.pool!(asMatter(c),
      c.wx + Math.cos(c.dir) * c.radius * 0.3,
      c.wy + Math.sin(c.dir) * c.radius * 0.3 * c.squash,
      { radius: c.radius * 0.55, dur: 1.2, scale: 0.55 });
  },
  air(c) {
    if (c.t < 0.55) sweepBand(c, c.dir - 1.1, c.dir + 1.1, c.t / 0.55, 0.76);
  },
};

/**
 * GLACIER_SUNDER — "the shelf calves."
 * Not a point-fall like the skysunder — a whole flat SLAB of cold
 * drops across the mark at once, and the landing throws pale shards
 * and one hard frost ring.
 */
const glacier_sunder: AbilitySig = {
  spawn(c) {
    // The shelf calves TRUE: shard heroes snap outward tumbling,
    // crystal dust flashes, and the cold sinks to the floor after.
    frost.deployments.shatter!(asMatter(c), c.wx, c.wy, { scale: 0.9 });
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.28) return;
    const f = t / 0.28;
    // The slab: wide and flat, arriving whole.
    const h = sc * 2.6 * (1 - f);
    ctx.save();
    ctx.globalAlpha = 0.7 * (1 - f * 0.5);
    ctx.fillStyle = st.core;
    ctx.fillRect(c.px - c.rPx * 0.5, c.py - sc * 0.5 - h - sc * 0.35, c.rPx, sc * 0.35);
    ctx.globalAlpha = 0.35 * (1 - f);
    ctx.fillStyle = st.mid;
    ctx.fillRect(c.px - c.rPx * 0.38, c.py - sc * 0.42 - h * 0.85 - sc * 0.5, c.rPx * 0.76, sc * 0.5);
    ctx.restore();
    c.glow(c.wx, c.wy, 1.1, 0.3 * (1 - f));
  },
  ground(c) {
    const { ctx, st, t } = c;
    if (t < 0.2 || t > 0.75) return;
    const f = (t - 0.2) / 0.55;
    ctx.save();
    ctx.globalAlpha = 0.7 * (1 - f);
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2, c.sc * 0.09);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, c.rPx * (0.35 + 0.6 * f), c.rPx * (0.35 + 0.6 * f) * c.squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * CROWNS_WORD — "spoken twice."
 * Two gold rings, one per pulse, each cresting with a brief crown of
 * upward sparks at its rim — the court hears it, then the stragglers.
 */
const crowns_word: AbilitySig = {
  ground(c) {
    const { ctx, st, t } = c;
    for (const start of [0, 0.4] as const) {
      if (t < start || t > start + 0.36) continue;
      const f = (t - start) / 0.36;
      ctx.save();
      ctx.globalAlpha = 0.75 * (1 - f);
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(2, c.sc * 0.1);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py, c.rPx * (0.3 + 0.65 * f), c.rPx * (0.3 + 0.65 * f) * c.squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  },
  air(c) {
    if (c.frameDt <= 0 || c.t > 0.8) return;
    if (srand(c.seed ^ (c.age * 8 | 0))() < c.frameDt * 9) {
      const rand = srand(c.seed ^ 0x2d5 ^ (c.age * 17 | 0));
      const a = rand() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.8,
        c.wy + Math.sin(a) * c.radius * 0.8 * c.squash,
        1,
        [c.st.spark],
        { speed: 0.7, life: 0.45, size: 0.06, gravity: -3.2, shape: 'glint' },
      );
    }
  },
};

/**
 * LAST_ARGUMENT — "the closing line."
 * The widest band the school draws, and at its end the full stop:
 * one bright cross-flash where the sentence ends. Radiant glints
 * shear off BOTH shoulders of the stroke.
 */
const last_argument: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2d6);
    for (const side of [-1, 1] as const) {
      for (let k = 0; k < 3; k++) {
        const a = c.dir + side * (0.9 + rand() * 0.5);
        c.particles.burst(
          c.wx + Math.cos(a) * c.radius * 0.75,
          c.wy + Math.sin(a) * c.radius * 0.75 * c.squash - 0.4,
          1,
          [c.st.core, c.st.spark],
          { speed: 1.8 + rand(), life: 0.5, size: 0.08, gravity: 5, dir: a + side * 0.4, spread: 0.3, shape: 'glint' },
        );
      }
    }
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.6) return;
    const f = t / 0.6;
    sweepBand(c, c.dir - 1.35, c.dir + 1.35, f, 0.82);
    if (f > 0.65) {
      const p = groundPt(c, c.rPx * 0.82, c.dir + 1.35);
      const ff = (f - 0.65) / 0.35;
      ctx.save();
      ctx.globalAlpha = 0.95 * (1 - ff);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2, sc * 0.06);
      const s = sc * 0.42 * (0.4 + ff);
      ctx.beginPath();
      ctx.moveTo(p.x - s, p.y - sc * 0.44);
      ctx.lineTo(p.x + s, p.y - sc * 0.44);
      ctx.moveTo(p.x, p.y - sc * 0.44 - s);
      ctx.lineTo(p.x, p.y - sc * 0.44 + s);
      ctx.stroke();
      ctx.restore();
      c.glow(c.wx + Math.cos(c.dir + 1.35) * c.radius * 0.8, c.wy + Math.sin(c.dir + 1.35) * c.radius * 0.8, 0.8, 0.35 * (1 - ff));
    }
  },
};

/**
 * BARROW_BITE — "the closed jaws."
 * Two short opposing crescents SNAP shut over the arc's heart — an
 * upper and lower tooth-line meeting — and dry bone chips fall out
 * of the bite.
 */
const barrow_bite: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2d7);
    for (let k = 0; k < 5; k++) {
      c.particles.burst(
        c.wx + Math.cos(c.dir) * c.radius * 0.6,
        c.wy + Math.sin(c.dir) * c.radius * 0.6 * c.squash - 0.35,
        1,
        [c.st.core, c.st.deep],
        { speed: 0.9 + rand() * 0.7, life: 0.55, size: 0.07, gravity: 8, dir: c.dir + (rand() - 0.5), spread: 0.6 },
      );
    }
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.4) return;
    const f = t / 0.4;
    const p = groundPt(c, c.rPx * 0.6, c.dir);
    const gap = sc * 0.7 * (1 - f);
    ctx.save();
    ctx.globalAlpha = 0.85 * (1 - f * f);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.09);
    ctx.lineCap = 'round';
    // Upper and lower tooth-lines closing on the heart.
    ctx.beginPath();
    ctx.arc(p.x, p.y - sc * 0.4 - gap, sc * 0.36, 0.4, Math.PI - 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y - sc * 0.4 + gap, sc * 0.36, Math.PI + 0.4, -0.4);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * THUNDER_FELL — "the argument overhead."
 * One hard bolt snaps down onto the mark in the first breath, then
 * the fell: stones and a shock ring arrive while the bolt's afterglow
 * is still deciding whether it was first.
 */
const thunder_fell: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    // The bolt discharges TRUE at the mark, and the fell answers
    // with the four-voice ground smash under it.
    storm.deployments.impact!(m, c.wx, c.wy, { scale: 0.7 });
    dust.deployments.slam!(m, c.wx, c.wy, { scale: 0.8 });
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.22) return;
    const f = t / 0.22;
    // The bolt: a hard zigzag out of the top of the frame.
    ctx.save();
    ctx.globalAlpha = 0.95 * (1 - f);
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2, sc * 0.08);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(c.px + sc * 0.3, c.py - sc * 3.4);
    ctx.lineTo(c.px - sc * 0.12, c.py - sc * 2.1);
    ctx.lineTo(c.px + sc * 0.14, c.py - sc * 1.9);
    ctx.lineTo(c.px - sc * 0.04, c.py - sc * 0.4);
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx, c.wy, 1.3, 0.4 * (1 - f));
  },
  ground(c) {
    const { ctx, st, t } = c;
    if (t < 0.1 || t > 0.6) return;
    const f = (t - 0.1) / 0.5;
    ctx.save();
    ctx.globalAlpha = 0.7 * (1 - f);
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(2, c.sc * 0.09);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, c.rPx * (0.3 + 0.65 * f), c.rPx * (0.3 + 0.65 * f) * c.squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * WHITE_HEAT — "the lit forge."
 * The stance signature: a low warm ring underfoot and a steady rise
 * of forge embers off the body for as long as the metal is willing.
 */
const white_heat: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    // The forge lit TRUE: a burning ring at the boots wrapping the
    // body, and a plume of forge embers climbing off it for as long
    // as the metal is willing. (The gated risers retired — one heat.)
    fire.deployments.ring!(m, c.wx, c.wy, { radius: 0.42, dur: 1.0, scale: 0.45 });
    fire.deployments.plume!(m, c.wx, c.wy, { dur: 1.4, scale: 0.4 });
  },
  air(c) {
    c.glow(c.wx, c.wy, 0.9, 0.2 * (1 - c.t));
  },
};

/**
 * PALE_CRESCENT — "the ebb."
 * One thin, slow, moon-wide band — the quietest stroke in the school
 * — and where it has passed, still frost dots HANG instead of flying.
 */
const pale_crescent: AbilitySig = {
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t < 0.6) {
      // A slimmer band than the school's shared one: quiet on purpose.
      const f = t / 0.6;
      const r = c.rPx * 0.8;
      const head = c.dir - 1.2 + 2.4 * Math.min(1, f * 1.25);
      ctx.save();
      ctx.globalAlpha = 0.7 * (1 - f);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.06);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(c.px, c.py - sc * 0.42, r, r * c.squash, 0, c.dir - 1.2, head);
      ctx.stroke();
      ctx.restore();
    }
  },
  spawn(c) {
    // Where the ebb has passed, the cold HANGS: quiet TRUE frost fog
    // on the swept side — still dots, sinking chill. (The gated
    // hanging glints retired into it.)
    frost.deployments.fog!(asMatter(c),
      c.wx + Math.cos(c.dir) * c.radius * 0.35,
      c.wy + Math.sin(c.dir) * c.radius * 0.35 * c.squash,
      { radius: c.radius * 0.5, dur: 1.2, scale: 0.4 });
  },
};

/**
 * HORIZON_FALL — "the brought mountain."
 * The heaviest landing in the file: the skysunder's column but wider,
 * TWO stone rings leaving the crater a beat apart, and a dust bank
 * that stands and then lies down where the horizon used to be.
 */
const horizon_fall: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    // The brought mountain: the library's ground smash at the FILE'S
    // heaviest weight, and a standing dust bank that lies down where
    // the horizon used to be.
    dust.deployments.slam!(m, c.wx, c.wy, { scale: 1.45 });
    dust.deployments.billow!(m, c.wx, c.wy, { radius: c.radius * 0.6, dur: 1.4, scale: 0.8 });
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.3) return;
    const f = t / 0.3;
    const h = sc * 3.6 * (1 - f);
    ctx.save();
    ctx.globalAlpha = 0.8 * (1 - f * 0.5);
    ctx.fillStyle = st.core;
    ctx.fillRect(c.px - sc * 0.12, c.py - sc * 0.6 - h, sc * 0.24, h);
    ctx.globalAlpha = 0.4 * (1 - f);
    ctx.fillStyle = st.mid;
    ctx.fillRect(c.px - sc * 0.26, c.py - sc * 0.5 - h * 0.85, sc * 0.52, h * 0.85);
    ctx.restore();
    c.glow(c.wx, c.wy, 1.4, 0.4 * (1 - f));
  },
  ground(c) {
    const { ctx, st, t } = c;
    const rand = srand(c.seed ^ 0x2dd);
    // Two stone rings, a beat apart.
    for (const [start, n] of [[0.06, 7], [0.24, 5]] as const) {
      if (t < start || t > start + 0.55) continue;
      const f = (t - start) / 0.55;
      ctx.save();
      ctx.globalAlpha = 0.8 * (1 - f);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + rand() * 0.7;
        const p = groundPt(c, c.rPx * (0.4 + 0.5 * f), a);
        stone(ctx, p.x, p.y - c.sc * 0.24 * (1 - f), c.sc * (0.09 + rand() * 0.09), st.deep, st.mid, rand() * 1.4);
      }
      ctx.restore();
    }
  },
};

/**
 * ROAD_OPENS — "the bar comes down."
 * The toll-bar itself: a beam sprite that SNAPS at the stroke, both
 * halves thrown clear, and the shove band behind it — the one arc in
 * the school where the push is the point.
 */
const road_opens: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x3a1);
    for (const m of [-1, 1] as const) {
      c.particles.burst(
        c.wx + Math.cos(c.dir) * 0.8,
        c.wy + Math.sin(c.dir) * 0.8 * c.squash,
        2,
        [c.st.deep],
        { speed: 2.2 + rand() * 0.8, life: 0.55, size: 0.16, gravity: 5, dir: c.dir + m * 0.9, spread: 0.25 },
      );
    }
    for (let k = 0; k < 6; k++) {
      c.particles.burst(
        c.wx + Math.cos(c.dir) * 0.6,
        c.wy + Math.sin(c.dir) * 0.6 * c.squash,
        1,
        [c.st.core, c.st.spark],
        { speed: 1.6 + rand() * 1.2, life: 0.4, size: 0.08, gravity: 2, dir: c.dir, spread: 0.9 },
      );
    }
    // The push writes itself in TRUE dust: a shock skirt driven out
    // from under the falling bar.
    dust.deployments.skirt!(asMatter(c),
      c.wx + Math.cos(c.dir) * 0.5,
      c.wy + Math.sin(c.dir) * 0.5 * c.squash,
      { radius: 0.35, dur: 0.4, scale: 0.7 });
  },
  air(c) {
    if (c.t < 0.5) sweepBand(c, c.dir - 1.15, c.dir + 1.15, c.t / 0.5, 0.8);
    const { ctx, st, t, sc } = c;
    if (t > 0.55) return;
    // The two halves of the bar, tumbling out of the stroke.
    const f = t / 0.55;
    ctx.save();
    ctx.globalAlpha = 0.9 * (1 - f);
    ctx.fillStyle = st.deep;
    for (const m of [-1, 1] as const) {
      const p = groundPt(c, c.radius * (0.5 + f * 0.5), c.dir + m * (0.35 + f * 0.5));
      ctx.save();
      ctx.translate(p.x, p.y - sc * 0.5);
      ctx.rotate(m * (0.4 + f * 2.2));
      ctx.fillRect(-sc * 0.34, -sc * 0.045, sc * 0.68, sc * 0.09);
      ctx.fillStyle = st.mid;
      ctx.fillRect(-sc * 0.34, -sc * 0.045, sc * 0.68, sc * 0.028);
      ctx.fillStyle = st.deep;
      ctx.restore();
    }
    ctx.restore();
  },
};

/**
 * MARSH_LIGHT — "the light that collects."
 * The lantern hangs where it was set; wisp motes drift INWARD off the
 * field edge — the fen does not spend its light, it gathers.
 */
const marsh_light: AbilitySig = {
  ground(c) {
    const { ctx, st } = c;
    const breathe = 0.9 + 0.07 * Math.sin(c.age * 3.1);
    ctx.save();
    ctx.globalAlpha = 0.35 * (1 - c.t * 0.6);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, c.sc * 0.07);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, c.rPx * breathe, c.rPx * breathe * c.squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st } = c;
    // The lantern itself: a hanging glow over the field's heart.
    const bob = Math.sin(c.age * 2.2) * c.sc * 0.06;
    ctx.save();
    ctx.globalAlpha = 0.75 * (1 - c.t * 0.5);
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.arc(c.px, c.py - c.sc * 0.7 + bob, c.sc * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    c.glow(c.wx, c.wy, 1.1, 0.3 * (1 - c.t * 0.6));
    if (c.frameDt <= 0 || c.t > 0.9) return;
    if (srand(c.seed ^ (c.age * 8 | 0))() < c.frameDt * 6) {
      const rand = srand(c.seed ^ 0x3a2 ^ (c.age * 17 | 0));
      const a = rand() * Math.PI * 2;
      // Born at the rim, drifting in: dir points back at the heart.
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.9,
        c.wy + Math.sin(a) * c.radius * 0.9 * c.squash,
        1,
        [c.st.core, c.st.mid],
        { speed: 0.5, life: 1.1, size: 0.08, gravity: -0.2, dir: a + Math.PI, spread: 0.2, shape: 'puff', wobble: 0.3, fade: c.st.deep },
      );
    }
  },
};

/**
 * RIFTFALL — "the sky behind the sky."
 * Through the fuse a slit of elsewhere WIDENS over the mark, leaking
 * stars; the strike is that sky arriving edge first, and the stars
 * settle where it landed.
 */
const riftfall: AbilitySig = {
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t < 0.42) {
      // The slit: a lens of deep opening over the target.
      const f = t / 0.42;
      const w = sc * (0.4 + 1.6 * f);
      const h = sc * 0.22 * f;
      ctx.save();
      ctx.translate(c.px, c.py - sc * 2.0);
      ctx.rotate(-0.18);
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.2, sc * 0.05);
      ctx.stroke();
      ctx.restore();
      if (c.frameDt > 0 && srand(c.seed ^ (c.age * 11 | 0))() < c.frameDt * 8) {
        const rand = srand(c.seed ^ 0x3a3 ^ (c.age * 7 | 0));
        c.particles.burst(c.wx + (rand() - 0.5) * 0.8, c.wy - 1.7, 1, [c.st.core], {
          speed: 0.9, life: 0.5, size: 0.07, gravity: 4, shape: 'glint', flicker: 0.5,
        });
      }
    }
    c.glow(c.wx, c.wy, 1.3, 0.35 * (1 - t));
  },
  ground(c) {
    const { ctx, st, t } = c;
    if (t < 0.42 || t > 0.95) return;
    const rand = srand(c.seed ^ 0x3a4);
    const f = (t - 0.42) / 0.53;
    ctx.save();
    ctx.globalAlpha = 0.85 * (1 - f);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.8;
      const p = groundPt(c, c.rPx * (0.35 + 0.55 * f), a);
      // Star shards standing in the crater, not stones.
      ctx.fillStyle = k % 2 === 0 ? st.core : st.mid;
      const r = c.sc * (0.05 + rand() * 0.05);
      ctx.save();
      ctx.translate(p.x, p.y - c.sc * 0.18 * (1 - f));
      ctx.rotate(rand() * Math.PI);
      ctx.fillRect(-r, -r * 0.35, r * 2, r * 0.7);
      ctx.fillRect(-r * 0.35, -r, r * 0.7, r * 2);
      ctx.restore();
    }
    ctx.restore();
  },
};

/**
 * WINTERS_HUNGER — "the empty walk."
 * No burst, no shout: triple claw-rakes keep appearing in the ground
 * beside the walker's trail, and slow blood beads ride the air — the
 * hunger is patient and so is the paint.
 */
const winters_hunger: AbilitySig = {
  spawn(c) {
    // The walker's cold arrives as TRUE frost fog — patient, low,
    // barely a breath.
    frost.deployments.fog!(asMatter(c), c.wx, c.wy, {
      radius: 0.5, dur: 1.2, scale: 0.4,
    });
  },
  ground(c) {
    const { ctx, st, t } = c;
    if (t > 0.85) return;
    const rand = srand(c.seed ^ 0x3a6);
    // Two rake-marks, placed once, fading with the buff's opening.
    ctx.save();
    ctx.globalAlpha = 0.55 * (1 - t);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1.4, c.sc * 0.05);
    for (const [ox, oy, ang] of [[-0.5, 0.25, 0.5], [0.55, 0.4, -0.4]] as const) {
      for (let k = 0; k < 3; k++) {
        const p = groundPt(c, Math.hypot(ox, oy), Math.atan2(oy, ox) + rand() * 0.1);
        ctx.beginPath();
        ctx.moveTo(p.x + k * c.sc * 0.09, p.y - c.sc * 0.16);
        ctx.lineTo(p.x + k * c.sc * 0.09 + Math.cos(ang) * c.sc * 0.1, p.y + c.sc * 0.14);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  air(c) {
    // Slow blood rides the air: on patient gated beats the library
    // wells one TRUE bead that falls, splats, and dries.
    if (c.frameDt <= 0 || c.t > 0.9) return;
    if (srand(c.seed ^ (c.age * 5 | 0))() < c.frameDt * 3) {
      blood.deployments.spatter!(asMatter(c), c.wx, c.wy, { scale: 0.15, radius: 0.15 });
    }
  },
};

/**
 * OPEN_SEAM — "the seam keeps giving."
 * One jagged gold crack owns the field; every pulse it flashes
 * brighter and the floor jumps a stone or two — pay-dirt on a beat.
 */
const open_seam: AbilitySig = {
  ground(c) {
    const { ctx, st, t } = c;
    const rand = srand(c.seed ^ 0x3a8);
    // The crack: fixed jag across the field, gold over dark.
    const pulse = 0.5 + 0.5 * Math.abs(Math.sin(c.age * 3.9));
    ctx.save();
    ctx.globalAlpha = (0.5 + 0.4 * pulse) * (1 - t * 0.7);
    const a0 = rand() * Math.PI * 2;
    let px0 = 0;
    let py0 = 0;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2.2, c.sc * 0.1);
    for (const pass of [0, 1] as const) {
      if (pass === 1) {
        ctx.strokeStyle = st.core;
        ctx.lineWidth = Math.max(1.2, c.sc * 0.05);
      }
      ctx.beginPath();
      for (let k = 0; k <= 4; k++) {
        const r = c.rPx * (k / 4) * 0.92;
        const a = a0 + (k % 2 === 0 ? 0.12 : -0.14);
        const x = c.px + Math.cos(a + Math.PI * (k % 2) * 0.04) * r;
        const y = c.py + Math.sin(a) * r * c.squash;
        if (k === 0) {
          ctx.moveTo(c.px - (x - c.px), c.py - (y - c.py));
          px0 = x; py0 = y;
        } else ctx.lineTo(x, y);
      }
      ctx.lineTo(px0, py0);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    if (c.frameDt <= 0 || c.t > 0.9) return;
    if (srand(c.seed ^ (c.age * 9 | 0))() < c.frameDt * 5) {
      const rand = srand(c.seed ^ 0x3a9 ^ (c.age * 15 | 0));
      const a = rand() * Math.PI * 2;
      const p = groundPt(c, c.rPx * rand() * 0.7, a);
      stone(c.ctx, p.x, p.y, c.sc * (0.06 + rand() * 0.06), c.st.deep, c.st.mid, rand() * 1.2);
      // The floor jumps TRUE on the beat — the painted stone lands
      // in its own breath of earth; the pay-dirt glint stays gold.
      dust.deployments.kick!(asMatter(c),
        c.wx + Math.cos(a) * 0.4, c.wy + Math.sin(a) * 0.4 * c.squash,
        { scale: 0.3 });
      c.particles.burst(c.wx + Math.cos(a) * 0.4, c.wy + Math.sin(a) * 0.4 * c.squash, 1, [c.st.core], {
        speed: 0.8, life: 0.4, size: 0.06, gravity: 3, shape: 'glint', flicker: 0.4,
      });
    }
  },
};

/**
 * LAST_TOLL — "the county answers."
 * Each pulse is a RING of the bell: a hard bright hoop with a dimmer
 * echo hoop chasing it a beat behind — sound drawn as brass.
 */
const last_toll: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x3aa);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + rand() * 0.5;
      c.particles.burst(
        c.wx + Math.cos(a) * 0.4,
        c.wy + Math.sin(a) * 0.4 * c.squash,
        1,
        [c.st.core, c.st.spark],
        { speed: 1.4 + rand() * 0.8, life: 0.45, size: 0.08, gravity: -0.5, dir: a, spread: 0.2, shape: 'glint', flicker: 0.5 },
      );
    }
  },
  ground(c) {
    const { ctx, st, t } = c;
    // The ring and its echo — twice, a beat apart.
    for (const [start, echo] of [[0.0, false], [0.1, true], [0.34, false], [0.44, true], [0.68, false], [0.78, true]] as const) {
      if (t < start || t > start + 0.3) continue;
      const f = (t - start) / 0.3;
      ctx.save();
      ctx.globalAlpha = (echo ? 0.3 : 0.7) * (1 - f);
      ctx.strokeStyle = echo ? st.mid : st.core;
      ctx.lineWidth = Math.max(echo ? 1.4 : 2.2, c.sc * (echo ? 0.06 : 0.1) * (1 - f * 0.5));
      ctx.beginPath();
      ctx.ellipse(c.px, c.py, c.rPx * f, c.rPx * f * c.squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    c.glow(c.wx, c.wy, 1.2, 0.3 * (1 - t));
  },
};

export const TWOHAND_SIGS: Record<string, AbilitySig> = {
  wide_swath,
  haft_check,
  iron_pendulum,
  fault_line,
  colossus_stance,
  skysunder,
  executioners_arc,
  avalanche,
  breaker_charge,
  titans_verdict,
  colossus_arc,
  quakefall,
  giantsfall,
  whirling_ruin,
  hewers_wheel,
  reavers_due,
  mournfield,
  ash_harvest,
  glacier_sunder,
  crowns_word,
  last_argument,
  barrow_bite,
  thunder_fell,
  white_heat,
  pale_crescent,
  horizon_fall,
  road_opens,
  marsh_light,
  riftfall,
  winters_hunger,
  open_seam,
  last_toll,
};
