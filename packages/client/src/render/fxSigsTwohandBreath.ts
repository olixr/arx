/**
 * THE SECOND BREATH SPEAKS — the twohand wave (WEIGHT AND ORE).
 *
 * Ten set-pieces for the great-weapon school's between-rung breath
 * arts, five casted and five channeled. Twohand's breath is mass,
 * earth, and the fall: gravity is the protagonist of every one of
 * these, and the ground keeps the receipts — every art ends in
 * something LYING there, settled, where the weight said it would.
 * Stone chips, ore glints, timber, and iron are the school's own
 * unowned matter; dust, fire, frost, smoke, and storm speak only
 * through the library.
 *
 * Same binding laws as every wave (hard edges, save/restore, squash
 * on ground y-radii, srand geometry with frameDt-gated emission,
 * ≤ ~60 path ops per hook per frame), plus the channel law: one
 * beat's worth of paint per wire, geometry that must hold still
 * across beats hashed from POSITION, growth accumulated through
 * matter — the pile rises because the world keeps what landed.
 *
 * No centerpiece here repeats another's, in this file or any wave:
 * fault_line owns the fissure shelf, open_seam the jagged gold
 * crack, wheel_of_iron the loosed rim, glacier_sunder the falling
 * slab, mournfield the cold plot border — so quarry_work splits by
 * the DRILL LINE, wheelbreaker drives a RAM, worlds_rim grinds a
 * wheel too large to see, and gravedigger's grave is a hole that
 * PULLS, not a border that mourns.
 */

import { shade } from './rig.js';
import { burstStarPath, jaggedRingPath, srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { dust, fire, frost, smoke, storm, asMatter } from './matter/index.js';

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
  opts: {
    life?: number; size?: number;
    fade?: string; fadeAt?: number;
    fade2?: string; fade2At?: number;
    fade3?: string; fade3At?: number;
  } = {},
): void {
  c.particles.burst(wx, wy, 1, [color], {
    speed: 0.06, life: opts.life ?? 8.5, size: opts.size ?? 0.07,
    gravity: 0, drag: 4, layer: 'ground',
    fade: opts.fade, fadeAt: opts.fadeAt,
    fade2: opts.fade2, fade2At: opts.fade2At,
    fade3: opts.fade3, fade3At: opts.fade3At,
  });
}

/**
 * Channel-stable seed: hashed from the wire's POSITION, not its
 * per-beat seed, so geometry holds still while the channel breathes
 * (channels root the caster; ground_aoe channels root the target).
 */
function posSeed(wx: number, wy: number, salt: number): number {
  return (Math.floor(wx * 8) * 73) ^ (Math.floor(wy * 8) * 151) ^ salt;
}

/** The school's unowned matter, named once. */
const BARK = '#6a4a2c';
const BARK_DARK = '#463019';
const HEARTWOOD = '#c9a86a';
const LEAF = '#5f7d3a';
const LEAF_DARK = '#44602a';
const ORE_GOLD = '#e8c04c';
const ORE_UMBER = '#8a6a2e';

// ----------------------------------------------------------- fell_timber

/**
 * FELL_TIMBER — "the down tree."
 * The blow is a felled TRUNK: a grown log with its pale cut face
 * toward the caster hinges up out of the swing and comes down the
 * whole chord — its shadow widening on the grass ahead of it — and
 * lands as one long argument of dust and flying bark. The growth
 * rings on the cut end are the school's honesty: this weight was
 * decades in the making. Leaves flutter down AFTER, on their own
 * slow clocks — the delay is the poetry — and the trunk's record
 * lies in two bark rails of settled grains for nine seconds.
 */
const fell_timber: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0xfe117);
    const midx = c.wx + Math.cos(c.dir) * c.radius * 0.55;
    const midy = c.wy + Math.sin(c.dir) * c.radius * 0.55;
    // The landing tears the turf down the chord.
    dust.deployments.gouge!(m, midx, midy, { dir: c.dir, scale: 0.85 });
    // Bark and splinters off the landing line: true arcs, dead bounces.
    for (let k = 0; k < 7; k++) {
      const f = 0.25 + rand() * 0.7;
      const side = k % 2 === 0 ? 1 : -1;
      c.particles.burst(
        c.wx + Math.cos(c.dir) * c.radius * f,
        c.wy + Math.sin(c.dir) * c.radius * f, 1,
        [BARK, k % 3 === 0 ? HEARTWOOD : shade(BARK, 10)], {
          speed: 1.2 + rand() * 1.4, life: 8, size: 0.04 + rand() * 0.015,
          gravity: 0, dir: c.dir + side * (1.1 + rand() * 0.5), spread: 0.3,
          shape: 'shard', spin: 8,
          z: 0.12, vz: 2.2 + rand() * 1.8, zg: 8.5, land: 'bounce', bounce: 0.4,
          layer: 'world', fade: BARK, fadeAt: 0.45,
        });
    }
    // THE TRUNK'S RECORD: two bark rails down the chord, and a knot
    // of ring-grains at the cut end — the log legible after the paint.
    const nx = Math.cos(c.dir + Math.PI / 2);
    const ny = Math.sin(c.dir + Math.PI / 2);
    for (let k = 0; k < 6; k++) {
      const f = 0.18 + (k / 5) * 0.78;
      const bx = c.wx + Math.cos(c.dir) * c.radius * f;
      const by = c.wy + Math.sin(c.dir) * c.radius * f;
      const w = 0.14 + rand() * 0.03;
      lay(c, bx + nx * w, by + ny * w, BARK, { life: 9, size: 0.04 + rand() * 0.012 });
      lay(c, bx - nx * w, by - ny * w, shade(BARK, 8), { life: 9, size: 0.04 + rand() * 0.012 });
    }
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI * 2;
      lay(c, c.wx + Math.cos(c.dir) * c.radius * 0.14 + Math.cos(a) * 0.1,
        c.wy + Math.sin(c.dir) * c.radius * 0.14 + Math.sin(a) * 0.1,
        HEARTWOOD, { life: 9.5, size: 0.05 });
    }
    // The leaves: shaken loose HIGH, arriving long after the trunk —
    // slow z-fall, wobbling, settling where the wind lets go.
    for (let k = 0; k < 8; k++) {
      const f = 0.3 + rand() * 0.65;
      c.particles.burst(
        c.wx + Math.cos(c.dir) * c.radius * f + (rand() - 0.5) * 0.7,
        c.wy + Math.sin(c.dir) * c.radius * f + (rand() - 0.5) * 0.7, 1,
        [LEAF, k % 3 === 0 ? shade(LEAF, 14) : LEAF_DARK], {
          speed: 0.15, life: 7, size: 0.07 + rand() * 0.03,
          gravity: 0, shape: 'square', spin: 3, wobble: 1.3,
          z: 1.3 + rand() * 0.8, vz: -0.15, zg: 0.4, land: 'settle',
          layer: 'world', shadow: 0.3, fade: LEAF_DARK, fadeAt: 0.6,
        });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, px, py, rPx } = c;
    const u = Math.min(1, t / 0.58); // the fall
    const down = u >= 1;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    ctx.save();
    ctx.lineCap = 'butt';
    // The widening shadow: the trunk announces itself on the grass
    // before it arrives — a chord band growing darker and wider.
    const reach = 0.15 + 0.85 * u;
    const ex = px + Math.cos(dir) * rPx * reach;
    const ey = py + Math.sin(dir) * rPx * reach * squash;
    ctx.globalAlpha = (down ? 0.5 : 0.25 + 0.3 * u) * fade;
    ctx.strokeStyle = shade(st.deep, -10);
    ctx.lineWidth = Math.max(4, sc * (0.12 + 0.16 * u));
    ctx.beginPath();
    ctx.moveTo(px + Math.cos(dir) * rPx * 0.12, py + Math.sin(dir) * rPx * 0.12 * squash);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    if (down) {
      // The landing's pressure: a lit edge down the chord and two
      // short cross-cracks kicked off it.
      ctx.globalAlpha = 0.8 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(dir) * rPx * 0.12, py + Math.sin(dir) * rPx * 0.12 * squash);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      const rand = srand(c.seed ^ 0xfe118);
      for (let k = 0; k < 2; k++) {
        const f = 0.35 + rand() * 0.45;
        const a = dir + (k === 0 ? 1 : -1) * (0.9 + rand() * 0.4);
        const p0 = pt(c, rPx * f, dir);
        const p1 = pt(c, rPx * (f + 0.22), a);
        ctx.globalAlpha = 0.7 * fade;
        ctx.strokeStyle = st.deep;
        ctx.lineWidth = Math.max(2, sc * 0.055);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
    }
    ctx.restore();
    if (down) c.glow(c.wx + Math.cos(dir) * c.radius * 0.5, c.wy + Math.sin(dir) * c.radius * 0.5, 1.2, 0.4 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, dir, px, py, rPx } = c;
    const u = Math.min(1, t / 0.58);
    const ease = u * u; // gravity's ease — slow leave, hard arrive
    const phi = 1.15 * (1 - ease); // fall angle off the ground
    const hx = px + Math.cos(dir) * rPx * 0.12;
    const hy = py + Math.sin(dir) * rPx * 0.12 * squash;
    const L = rPx * 0.86;
    // The trunk: hinge at the near chord point, tip swinging down.
    const tipX = hx + Math.cos(dir) * L * Math.cos(phi);
    const tipY = hy + Math.sin(dir) * L * Math.cos(phi) * squash - L * Math.sin(phi) * 0.9;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE TIMBER: a tapered log, not a line — bark bed at full width,
    // mid body inset, one pale top edge riding the upper flank. Built
    // as quads off the trunk axis so the taper reads butt-to-tip.
    const ax = tipX - hx;
    const ay = tipY - hy;
    const aL = Math.hypot(ax, ay) || 1;
    const tnx = -ay / aL;
    const tny = ax / aL;
    const w0 = Math.max(6, sc * 0.15); // half-width at the cut face
    const w1 = Math.max(3.5, sc * 0.095); // half-width at the tip
    const quad = (s0: number, s1: number, col: string, al: number): void => {
      ctx.globalAlpha = al * fade;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(hx + tnx * s0, hy + tny * s0);
      ctx.lineTo(tipX + tnx * s1, tipY + tny * s1);
      ctx.lineTo(tipX - tnx * s1, tipY - tny * s1);
      ctx.lineTo(hx - tnx * s0, hy - tny * s0);
      ctx.closePath();
      ctx.fill();
    };
    quad(w0, w1, BARK_DARK, 1);
    quad(w0 * 0.66, w1 * 0.66, BARK, 1);
    // The pale top edge: the light the trunk carries down with it.
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = HEARTWOOD;
    ctx.lineWidth = Math.max(2.5, sc * 0.06);
    ctx.beginPath();
    ctx.moveTo(hx + tnx * w0 * 0.5, hy + tny * w0 * 0.5 - w0 * 0.35);
    ctx.lineTo(tipX + tnx * w1 * 0.5, tipY + tny * w1 * 0.5 - w1 * 0.35);
    ctx.stroke();
    // The cut face at the hinge: pale disc with two growth rings —
    // the decades this weight took, shown once per swing.
    const R = Math.max(3, sc * 0.16);
    ctx.globalAlpha = 0.97 * fade;
    ctx.fillStyle = HEARTWOOD;
    ctx.beginPath();
    ctx.ellipse(hx, hy, R, R * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = BARK;
    ctx.lineWidth = Math.max(1.2, sc * 0.025);
    for (let k = 0; k < 2; k++) {
      ctx.beginPath();
      ctx.ellipse(hx, hy, R * (0.35 + k * 0.3), R * (0.35 + k * 0.3) * 0.8, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // THE CRASH: a hard white flash down the whole landing line plus
    // a star at the tip — the frame the timber arrives, unmissable.
    if (u >= 1 && t < 0.72) {
      const k = Math.max(0, 1 - (t - 0.58) / 0.14);
      ctx.globalAlpha = 0.95 * k;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.5, sc * 0.07);
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, tipX, tipY, sc * 0.42, sc * 0.15, 4, dir, squash);
      ctx.fill();
      c.glow(c.wx + Math.cos(dir) * c.radius * 0.9, c.wy + Math.sin(dir) * c.radius * 0.9, 1.1, 0.6 * k);
    }
    // Falling still: bark flecks shake off the swinging trunk, gated.
    if (u < 1 && Math.random() < c.frameDt * 20) {
      const f = 0.3 + Math.random() * 0.6;
      c.particles.burst(
        c.wx + Math.cos(dir) * c.radius * f * Math.cos(phi),
        c.wy + Math.sin(dir) * c.radius * f * Math.cos(phi), 1, [BARK, BARK_DARK], {
          speed: 0.4, life: 0.7, size: 0.05, gravity: 0, shape: 'square', spin: 6,
          z: f * 0.9 * Math.sin(phi), vz: 0.2, zg: 6, land: 'die', layer: 'world', shadow: 0,
        });
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- quarry_work

/**
 * QUARRY_WORK — "the drill line."
 * Not a wild crack — a QUARRYMAN'S split: a row of drill holes
 * stands in the stone across the swing's face (hashed from the
 * ground, so the row holds still while the channel works), and each
 * beat the pick comes down on ONE of them — spark star, stone chips
 * on true arcs. The centerpiece is THE SEAM: a black fissure with
 * two pale broken lips that runs the row from its head to whichever
 * hole the pick is on, so the split LENGTHENS as the work walks the
 * line (its kinks hashed from the ground, one crack all channel
 * long). The channel's growth is all in the world's
 * keeping: every beat lays split-grains along its segment and adds
 * to the rubble pile below the row, which RISES beat over beat.
 */
const quarry_work: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const prand = srand(posSeed(c.wx, c.wy, 0x9a221));
    const beat = srand(c.seed ^ 0x9a222);
    const rowR = c.radius * 0.62;
    const a0 = c.dir - 0.72;
    // The row's six stations (position-stable), and this beat's pick.
    const jit: number[] = [];
    for (let k = 0; k < 6; k++) jit.push((prand() - 0.5) * 0.08);
    const struck = Math.floor(beat() * 6);
    const sa = a0 + (struck / 5) * 1.44 + jit[struck]!;
    const sx = c.wx + Math.cos(sa) * rowR;
    const sy = c.wy + Math.sin(sa) * rowR;
    dust.deployments.kick!(m, sx, sy, { scale: 0.4 });
    // Chips off the struck hole: the school's canonical fall — fine
    // and BRIGHT, so the stone that leaves is the stone that reads.
    for (let k = 0; k < 5; k++) {
      c.particles.burst(sx, sy, 1, [c.st.spark, c.st.mid, shade(c.st.deep, 14)], {
        speed: 1.1 + beat() * 1.2, life: 7.5, size: 0.04 + beat() * 0.014,
        gravity: 0, dir: sa + (beat() - 0.5) * 2.4, spread: 0.4,
        shape: 'shard', spin: 9,
        z: 0.1, vz: 2 + beat() * 1.6, zg: 8.5, land: 'bounce', bounce: 0.4,
        layer: 'world', fade: shade(c.st.deep, 10), fadeAt: 0.45,
      });
    }
    // The split's record: grains along this hole's segment toward its
    // neighbor — the dressed line grows hole by hole across beats.
    const na = a0 + (Math.min(5, struck + 1) / 5) * 1.44;
    for (let k = 0; k < 4; k++) {
      const f = (k + 0.5) / 4;
      const ga = sa + (na - sa) * f;
      lay(c, c.wx + Math.cos(ga) * rowR, c.wy + Math.sin(ga) * rowR,
        k % 2 === 0 ? c.st.spark : shade(c.st.mid, -6), { life: 9, size: 0.045 });
    }
    // The rubble pile: below the row's center, densifying per beat —
    // fewer dark stones, and every one of them lit enough to see.
    const pa = c.dir;
    for (let k = 0; k < 3; k++) {
      lay(c, c.wx + Math.cos(pa) * rowR * 0.62 + (beat() - 0.5) * 0.3,
        c.wy + Math.sin(pa) * rowR * 0.62 + (beat() - 0.5) * 0.3,
        k === 0 ? c.st.mid : shade(c.st.deep, 12),
        { life: 10, size: 0.04 + beat() * 0.015 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    const prand = srand(posSeed(c.wx, c.wy, 0x9a221));
    const beat = srand(c.seed ^ 0x9a223);
    const rowR = rPx * 0.62;
    const a0 = dir - 0.72;
    const struck = Math.floor(beat() * 6);
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    ctx.save();
    // The drill line: six round holes, each a dark mouth with a lit
    // lower lip — the row that makes the mountain negotiable.
    for (let k = 0; k < 6; k++) {
      const a = a0 + (k / 5) * 1.44 + (prand() - 0.5) * 0.08;
      const p = pt(c, rowR, a);
      const s = Math.max(2.5, sc * 0.075);
      ctx.globalAlpha = 0.85 * fade;
      ctx.fillStyle = shade(st.deep, -16);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, s, s * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.7 * fade;
      ctx.strokeStyle = k === struck ? st.spark : st.mid;
      ctx.lineWidth = Math.max(1.4, sc * 0.032);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + s * 0.35 * squash, s * 0.8, s * 0.5 * squash, 0, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
    // THE SEAM: the centerpiece. A bold black fissure runs the row
    // from its head to the hole the pick is on — so the crack LENGTHENS
    // beat over beat as the work walks the line. Its kinks are hashed
    // from the ground, so the same crack is the same crack every beat.
    const crack = srand(posSeed(c.wx, c.wy, 0x9a225));
    const segs = Math.max(1, struck) + 1;
    const kinks: { x: number; y: number }[] = [];
    for (let k = 0; k <= segs; k++) {
      const a = a0 + (k / 5) * 1.44;
      const jr = rowR * (1 + (crack() - 0.5) * 0.14);
      kinks.push(pt(c, jr, a + (crack() - 0.5) * 0.05));
    }
    const runCrack = (): void => {
      ctx.beginPath();
      ctx.moveTo(kinks[0]!.x, kinks[0]!.y);
      for (let k = 1; k < kinks.length; k++) ctx.lineTo(kinks[k]!.x, kinks[k]!.y);
      ctx.stroke();
    };
    // The ink bed: the split itself, wide and dark and unarguable.
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = shade(st.deep, -20);
    ctx.lineWidth = Math.max(4, sc * 0.115);
    runCrack();
    // The rims: two pale lips of freshly broken stone riding its edges.
    const lip = Math.max(1.6, sc * 0.045);
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(0, s * lip);
      ctx.globalAlpha = (s < 0 ? 0.85 : 0.5) * fade;
      ctx.strokeStyle = s < 0 ? st.spark : st.mid;
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      runCrack();
      ctx.restore();
    }
    // This beat's live tip: the newest length, white while it splits.
    ctx.globalAlpha = 0.95 * fade * (t < 0.4 ? 1 : (1 - t) / 0.6);
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2.5, sc * 0.06);
    ctx.beginPath();
    ctx.moveTo(kinks[kinks.length - 2]!.x, kinks[kinks.length - 2]!.y);
    ctx.lineTo(kinks[kinks.length - 1]!.x, kinks[kinks.length - 1]!.y);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    const prand = srand(posSeed(c.wx, c.wy, 0x9a221));
    const beat = srand(c.seed ^ 0x9a224);
    const a0 = dir - 0.72;
    const jit: number[] = [];
    for (let k = 0; k < 6; k++) jit.push((prand() - 0.5) * 0.08);
    const struck = Math.floor(beat() * 6);
    const sa = a0 + (struck / 5) * 1.44 + jit[struck]!;
    const p = pt(c, rPx * 0.62, sa);
    ctx.save();
    if (t < 0.3) {
      // The pick: one short diagonal stroke driving into the hole.
      const k = t / 0.3;
      const drop = (1 - k) * (1 - k);
      const x0 = p.x + sc * 0.55 * drop + sc * 0.18;
      const y0 = p.y - sc * (0.9 * drop + 0.55);
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = shade(st.deep, -14);
      ctx.lineWidth = Math.max(3, sc * 0.08);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(p.x, p.y - sc * 0.06);
      ctx.stroke();
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.6, sc * 0.04);
      ctx.beginPath();
      ctx.moveTo(x0 - sc * 0.02, y0);
      ctx.lineTo(p.x - sc * 0.02, p.y - sc * 0.06);
      ctx.stroke();
      // Contact: the spark star as the steel finds the stone.
      if (k > 0.75) {
        ctx.globalAlpha = 0.97;
        ctx.fillStyle = st.core;
        ctx.beginPath();
        burstStarPath(ctx, p.x, p.y - sc * 0.04, sc * 0.42, sc * 0.15, 5, sa, squash);
        ctx.fill();
        c.glow(c.wx + Math.cos(sa) * c.radius * 0.62, c.wy + Math.sin(sa) * c.radius * 0.62, 1.1, 0.7);
      }
    } else if (Math.random() < c.frameDt * 14) {
      // Between blows: stone dust glints sift off the fresh split.
      c.particles.burst(c.wx + Math.cos(sa) * c.radius * 0.62, c.wy + Math.sin(sa) * c.radius * 0.62, 1,
        [st.core, st.spark], {
          speed: 0.35, life: 0.5, size: 0.055, gravity: 1.6, shape: 'glint', flicker: 0.6,
          z: 0.15, vz: 0.4, zg: 4, land: 'die', layer: 'world', shadow: 0,
        });
    }
    ctx.restore();
  },
};

// ------------------------------------------------------------ forgefall

/**
 * FORGEFALL — "the cooling brand."
 * The leap carries forge heat down with it — the hammer-mass rides
 * the arc shedding sparks and a true fire path along the ground it
 * crosses. The landing is the verdict: fire and dust at once, a
 * shower of high-bounce forge sparks — and then the centerpiece,
 * which is what the verdict LEAVES: a hammer-head BRAND pressed
 * into the dirt, cooling through three honest stops — white-gold,
 * ember orange, char — both in paint and in the ten-second grains
 * that keep its shape after the paint has gone cold.
 */
const forgefall: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    if (c.kind === 'dash') {
      // The flight sheds its heat onto the ground it crosses.
      fire.deployments.path!(m, c.wx, c.wy, {
        dir: Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx), scale: 0.5,
      });
      return;
    }
    if (c.kind !== 'blast') return;
    const rand = srand(c.seed ^ 0xf0426);
    fire.deployments.burst!(m, c.wx, c.wy, { scale: 0.65 });
    dust.deployments.slam!(m, c.wx, c.wy, { scale: 0.7 });
    smoke.deployments.plume!(m, c.wx, c.wy, { scale: 0.4, dur: 3 });
    // Forge sparks: the anvil's own iron — hard bounces, long flicker.
    for (let k = 0; k < 10; k++) {
      c.particles.burst(c.wx, c.wy, 1, [c.st.core, c.st.spark], {
        speed: 1.8 + rand() * 2, life: 2.4, size: 0.05 + rand() * 0.02,
        gravity: 0, shape: 'glint', flicker: 0.8,
        z: 0.15, vz: 2.6 + rand() * 2, zg: 9, land: 'bounce', bounce: 0.6,
        layer: 'world', fade: '#e8843c', fadeAt: 0.45, fade2: '#8a5a3c', fade2At: 0.8,
      });
    }
    // THE BRAND'S GRAINS: the hammer-head outline (face and a short
    // haft-wedge) laid hot and cooling in three stops for ten seconds.
    const ba = rand() * Math.PI * 2;
    const bx = Math.cos(ba);
    const by = Math.sin(ba);
    const nx = -by;
    const ny = bx;
    for (let k = 0; k < 8; k++) {
      const f = (k / 7 - 0.5) * 0.9;
      for (const s of [-1, 1]) {
        lay(c, c.wx + bx * f + nx * 0.24 * s, c.wy + by * f + ny * 0.24 * s, '#fff3c4', {
          life: 10, size: 0.042,
          fade: '#f09a48', fadeAt: 0.16, fade2: '#9a5a34', fade2At: 0.45,
          fade3: '#4e3a30', fade3At: 0.75,
        });
      }
    }
    for (let k = 0; k < 3; k++) {
      lay(c, c.wx - bx * (0.55 + k * 0.18), c.wy - by * (0.55 + k * 0.18), '#fff3c4', {
        life: 10, size: 0.038,
        fade: '#f09a48', fadeAt: 0.16, fade2: '#9a5a34', fade2At: 0.45,
        fade3: '#4e3a30', fade3At: 0.75,
      });
    }
  },
  ground(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xf0427);
    const ba = rand() * Math.PI * 2;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    // The brand cools in hard bands, never a blend.
    const body = t < 0.3 ? '#ffe9a0' : t < 0.6 ? '#e8843c' : '#8a4a2a';
    const rim = t < 0.3 ? st.core : t < 0.6 ? '#ffe9a0' : '#e8843c';
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(1, squash);
    ctx.rotate(ba);
    // The head: a rectangle of pressed heat with its darker frame.
    const hw = rPx * 0.46;
    const hh = rPx * 0.24;
    ctx.globalAlpha = 0.6 * fade;
    ctx.fillStyle = shade(st.deep, -12);
    ctx.fillRect(-hw * 1.12, -hh * 1.18, hw * 2.24, hh * 2.36);
    ctx.globalAlpha = 0.85 * fade;
    ctx.fillStyle = body;
    ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = rim;
    ctx.lineWidth = Math.max(1.8, sc * 0.045);
    ctx.strokeRect(-hw * 0.78, -hh * 0.68, hw * 1.56, hh * 1.36);
    // The haft-wedge behind the head.
    ctx.globalAlpha = 0.7 * fade;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-hw * 1.12, -hh * 0.32);
    ctx.lineTo(-hw * 1.95, -hh * 0.14);
    ctx.lineTo(-hw * 1.95, hh * 0.14);
    ctx.lineTo(-hw * 1.12, hh * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // The arrival ring, young and quick.
    if (t < 0.3) {
      const k = t / 0.3;
      ctx.save();
      ctx.globalAlpha = (1 - k) * 0.8;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.5, sc * 0.07);
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * (0.4 + 0.65 * k), rPx * (0.4 + 0.65 * k) * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    c.glow(c.wx, c.wy, c.radius, (t < 0.3 ? 0.75 : 0.35) * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    if (c.kind === 'dash') {
      // The hammer-mass rides the arc: dark iron face, lit top plane,
      // trailing its own sparks — the forge airborne.
      const fx = px + (c.px2 - px) * t;
      const fy = py + (c.py2 - py) * t - sc * Math.sin(Math.min(1, t) * Math.PI) * 1.5;
      ctx.save();
      const w = sc * 0.4;
      const h = sc * 0.2;
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = shade(st.deep, -14);
      ctx.fillRect(fx - w / 2, fy - h, w, h);
      ctx.fillStyle = '#e8843c';
      ctx.beginPath();
      ctx.ellipse(fx, fy - h, w / 2, h * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.ellipse(fx, fy - h, w * 0.24, h * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (Math.random() < c.frameDt * 22) {
        c.particles.burst(c.wx + (c.wx2 - c.wx) * t, c.wy + (c.wy2 - c.wy) * t, 1, [st.spark, '#e8843c'], {
          speed: 0.6, life: 0.5, size: 0.05, gravity: 0, shape: 'glint', flicker: 0.7,
          z: Math.sin(Math.min(1, t) * Math.PI) * 1.5, vz: -0.6, zg: 3, land: 'die',
          layer: 'world', shadow: 0,
        });
      }
      c.glow(c.wx + (c.wx2 - c.wx) * t, c.wy + (c.wy2 - c.wy) * t, 0.8, 0.4);
      return;
    }
    if (c.kind !== 'blast') return;
    ctx.save();
    // The strike flash: the first 120 ms is the whole argument.
    if (t < 0.16) {
      const k = 1 - t / 0.16;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py - sc * 0.1, sc * (0.5 + (1 - k) * 0.3), sc * 0.18, 6, c.now / 400, squash);
      ctx.fill();
      c.glow(c.wx, c.wy, 1.5, 0.85 * k);
    }
    // Heat climbs off the brand while it holds its color.
    if (t < 0.7 && Math.random() < c.frameDt * 18) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.35, c.wy + Math.sin(a) * c.radius * 0.35, 1,
        [st.spark, '#e8843c'], {
          speed: 0.3, life: 0.6, size: 0.06, gravity: -1.6, shape: 'streak', flicker: 0.5,
        });
    }
    ctx.restore();
  },
};

// --------------------------------------------------------- wheelbreaker

/**
 * WHEELBREAKER — "the ram takes the lane."
 * Each beat a blunt WAVEFRONT drives the corridor end to end — a
 * standing pale crest the full width of the wire, white along its
 * top edge, a bowed line of compressed air stood off its face — and
 * the lane itself is told by its two rut rails, never by fill. At the
 * far end the shock answers through the library while the broken
 * cart gives up its spokes: wood shards arcing to both sides on
 * true z. The lane's record is a pair of wheel-rut rails, hashed
 * from the ground so every beat deepens the SAME two lines.
 */
const wheelbreaker: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x33b12);
    const ang = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang);
    // The shock at the far wall.
    storm.deployments.impact!(m, c.wx2, c.wy2, { scale: 0.6 });
    dust.deployments.kick!(m, c.wx2, c.wy2, { scale: 0.5 });
    // Spokes: the wheel's wood leaving sideways, both flanks.
    for (let k = 0; k < 6; k++) {
      const f = 0.45 + rand() * 0.5;
      const side = k % 2 === 0 ? 1 : -1;
      c.particles.burst(
        c.wx + (c.wx2 - c.wx) * f, c.wy + (c.wy2 - c.wy) * f, 1,
        [BARK, k % 3 === 0 ? HEARTWOOD : shade(BARK, 12)], {
          speed: 1.6 + rand() * 1.4, life: 7, size: 0.04 + rand() * 0.015,
          gravity: 0, dir: ang + side * (Math.PI / 2 + (rand() - 0.5) * 0.6), spread: 0.25,
          shape: 'shard', spin: 10,
          z: 0.15, vz: 2 + rand() * 1.6, zg: 8.5, land: 'bounce', bounce: 0.4,
          layer: 'world', fade: BARK, fadeAt: 0.5,
        });
    }
    // The ruts: two rails hashed from the lane's own ground — every
    // beat lays into the same lines, and the road remembers the ram.
    const prand = srand(posSeed(c.wx2, c.wy2, 0x33b13));
    for (let k = 0; k < 5; k++) {
      const f = 0.15 + (k / 4) * 0.75 + (prand() - 0.5) * 0.05;
      const bx = c.wx + (c.wx2 - c.wx) * f;
      const by = c.wy + (c.wy2 - c.wy) * f;
      lay(c, bx + nx * 0.36, by + ny * 0.36, shade(c.st.deep, 10), { life: 9.5, size: 0.045 + (rand() - 0.5) * 0.014 });
      lay(c, bx - nx * 0.36, by - ny * 0.36, shade(c.st.mid, -8), { life: 9.5, size: 0.045 + (rand() - 0.5) * 0.014 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const drive = Math.min(1, t / 0.44); // the ram is FAST
    const front = 0.08 + drive * 0.92;
    const fx = px + dx * front;
    const fy = py + dy * front;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    ctx.save();
    ctx.lineCap = 'butt';
    // The lane: a whisper of pressed ground, no more — the corridor
    // is told through its RAILS and its wavefront, never through fill.
    ctx.globalAlpha = 0.16 * fade;
    ctx.strokeStyle = shade(st.deep, -8);
    ctx.lineWidth = Math.max(6, sc * 0.75);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    // The two ruts: the lane's real edges, and the road's own record.
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.5, sc * 0.06);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(px + nx * sc * 0.36 * s, py + ny * sc * 0.36 * s);
      ctx.lineTo(fx + nx * sc * 0.36 * s, fy + ny * sc * 0.36 * s);
      ctx.stroke();
    }
    // The wavefront's footprint: a blunt bright bar across the lane,
    // with its own dark pressure shadow a step behind it.
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = shade(st.deep, -12);
    ctx.lineWidth = Math.max(2.5, sc * 0.07);
    ctx.beginPath();
    ctx.moveTo(fx + nx * sc * 0.36 - dx / len * sc * 0.1, fy + ny * sc * 0.36 - dy / len * sc * 0.1);
    ctx.lineTo(fx - nx * sc * 0.36 - dx / len * sc * 0.1, fy - ny * sc * 0.36 - dy / len * sc * 0.1);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2.5, sc * 0.075);
    ctx.beginPath();
    ctx.moveTo(fx + nx * sc * 0.36, fy + ny * sc * 0.36);
    ctx.lineTo(fx - nx * sc * 0.36, fy - ny * sc * 0.36);
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx + (c.wx2 - c.wx) * front, c.wy + (c.wy2 - c.wy) * front, 0.8, 0.4 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const drive = Math.min(1, t / 0.44);
    const front = 0.08 + drive * 0.92;
    const fx = px + dx * front;
    const fy = py + dy * front;
    ctx.save();
    ctx.lineCap = 'butt';
    if (t < 0.56) {
      // THE WAVEFRONT: the blunt crest of driven air and iron, a
      // standing wall across the lane running it end to end — deep
      // sleeve, pale body, one white edge along the very top.
      const hw = sc * 0.36; // half the lane — the crest spans the wire
      const H = sc * 0.62;
      const ax0 = fx + nx * hw;
      const ay0 = fy + ny * hw;
      const ax1 = fx - nx * hw;
      const ay1 = fy - ny * hw;
      const crest = (lift: number, col: string, lw: number, al: number): void => {
        ctx.globalAlpha = al;
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(ax0, ay0 - lift);
        ctx.lineTo(ax1, ay1 - lift);
        ctx.stroke();
      };
      crest(H * 0.5, shade(st.deep, -14), Math.max(6, sc * 0.5), 0.85);
      crest(H * 0.5, st.mid, Math.max(4, sc * 0.34), 0.9);
      crest(H, st.core, Math.max(2.5, sc * 0.07), 0.95);
      // The bow line: compressed air standing off the crest's face,
      // bowed forward — the lane knows it is coming.
      const bow = sc * 0.3;
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      ctx.beginPath();
      ctx.moveTo(ax0 + dx / len * bow * 0.3, ay0 + dy / len * bow * 0.3 - H * 0.35);
      ctx.quadraticCurveTo(
        fx + dx / len * bow * 1.5, fy + dy / len * bow * 1.5 - H * 0.5,
        ax1 + dx / len * bow * 0.3, ay1 + dy / len * bow * 0.3 - H * 0.35);
      ctx.stroke();
      // Splinters shed off the crest as it drives — gated.
      if (Math.random() < c.frameDt * 22) {
        const side = Math.random() < 0.5 ? 1 : -1;
        c.particles.burst(c.wx + (c.wx2 - c.wx) * front, c.wy + (c.wy2 - c.wy) * front, 1,
          [BARK, HEARTWOOD, st.spark], {
            speed: 1.4, life: 0.6, size: 0.045, gravity: 0, shape: 'shard', spin: 10,
            dir: Math.atan2(dy, dx) + side * (Math.PI / 2), spread: 0.4,
            z: 0.35, vz: 1.6, zg: 7.5, land: 'die', layer: 'world', shadow: 0,
          });
      }
      c.glow(c.wx + (c.wx2 - c.wx) * front, c.wy + (c.wy2 - c.wy) * front, 0.9, 0.45);
    } else if (t >= 0.72) {
      // Arrival: the far wall takes it — one hard star, brief.
      const k = Math.max(0, 1 - (t - 0.72) / 0.2);
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px2, py2 - sc * 0.2, sc * 0.42, sc * 0.15, 5, c.now / 300, c.squash);
      ctx.fill();
      c.glow(c.wx2, c.wy2, 1.1, 0.6 * k);
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- gravedigger

/**
 * GRAVEDIGGER — "the grave that pulls."
 * The school's showpiece, and its only hole. A grave-rectangle cuts
 * itself into the turf — bright seam over dark, drawn in the first
 * blink — then YAWNS true black, and the world starts arriving:
 * four drag-furrows curve in from the ring's rim, clods tip over
 * the long edges and fall IN, a converging rim of soil pours home.
 * At the end the grave exhales one breath of dust and closes; what
 * remains is the filled plot — a mounded rectangle of settled soil
 * grains laid in the closing seconds, plus the seam's own frame,
 * legible in the grass for ten seconds. The ground wanted filling.
 */
const gravedigger: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x64a7e);
    const ga = rand() * Math.PI; // the plot's heading
    const bx = Math.cos(ga);
    const by = Math.sin(ga);
    const nx = -by;
    const ny = bx;
    const L = c.radius * 0.62; // half-length
    const W = c.radius * 0.3; // half-width
    // The cut's first breath.
    dust.deployments.kick!(m, c.wx, c.wy, { scale: 0.45 });
    // THE PULL made matter: a rim of soil converging on the heart.
    c.particles.emit({
      kind: 'rim', x: c.wx, y: c.wy, radius: c.radius * 0.95,
      rate: 60, dur: 0.55, attack: 0.05, release: 0.15, outward: -2.6,
      pops: [
        { colors: [shade(c.st.deep, 10), shade(c.st.deep, 16)], opts: { life: 0.55, size: 0.05, gravity: 0, shape: 'square', drag: 0.4 }, weight: 2 },
        { colors: [shade(c.st.mid, -8)], opts: { life: 0.5, size: 0.05, gravity: 0, shape: 'mote', drag: 0.4 }, weight: 1 },
      ],
    });
    // Clods tip over the long edges and fall IN — short lives, they
    // vanish into the dark (the grave keeps what it takes).
    for (let k = 0; k < 8; k++) {
      const f = (rand() - 0.5) * 1.7;
      const side = k % 2 === 0 ? 1 : -1;
      c.particles.burst(
        c.wx + bx * L * f + nx * W * 1.15 * side,
        c.wy + by * L * f + ny * W * 1.15 * side, 1,
        [shade(c.st.deep, 10), shade(c.st.mid, -8)], {
          speed: 0.9 + rand() * 0.5, life: 0.5 + rand() * 0.25,
          size: 0.045 + rand() * 0.01, gravity: 0,
          dir: Math.atan2(-ny * side, -nx * side), spread: 0.3,
          shape: 'shard', spin: 6,
          z: 0.2, vz: 0.6, zg: 7, land: 'die', layer: 'world',
        });
    }
    // The seam's frame: grains along the rectangle's perimeter —
    // the plot's outline outlasting everything painted.
    for (let k = 0; k < 7; k++) {
      const f = (k / 6 - 0.5) * 1.9;
      for (const s of [-1, 1]) {
        lay(c, c.wx + bx * L * f + nx * W * s, c.wy + by * L * f + ny * W * s,
          k % 3 === 0 ? shade(c.st.mid, -10) : c.st.deep, { life: 9.5, size: 0.05 });
      }
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x64a7e);
    const ga = rand() * Math.PI;
    const bx = Math.cos(ga);
    const byv = Math.sin(ga);
    const nx = -byv;
    const ny = bx;
    const L = rPx * 0.62;
    const W = rPx * 0.3;
    const corner = (lf: number, wf: number): { x: number; y: number } => ({
      x: px + (bx * L * lf + nx * W * wf),
      y: py + (byv * L * lf + ny * W * wf) * squash,
    });
    const open = t < 0.2 ? t / 0.2 : t < 0.72 ? 1 : Math.max(0, 1 - (t - 0.72) / 0.2);
    const cutK = Math.min(1, t / 0.14);
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    // THE YAWN: the rectangle's interior, true black, breathing open
    // and snapping shut — the one hole the school digs.
    if (open > 0) {
      const p0 = corner(-1, -open);
      const p1 = corner(1, -open);
      const p2 = corner(1, open);
      const p3 = corner(-1, open);
      ctx.globalAlpha = 0.55 + 0.4 * open;
      ctx.fillStyle = '#120d1a';
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.fill();
    }
    // The cut seam: bright over dark, drawn around the perimeter in
    // the first blink — the punch that reads in 120 ms.
    const per = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
    const segs = Math.max(1, Math.ceil(cutK * 4));
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalAlpha = (pass === 0 ? 0.8 : 0.85 * (t < 0.5 ? 1 : (1 - t) / 0.5));
      ctx.strokeStyle = pass === 0 ? shade(st.deep, -16) : st.spark;
      ctx.lineWidth = Math.max(pass === 0 ? 3.2 : 1.6, sc * (pass === 0 ? 0.085 : 0.04));
      ctx.beginPath();
      ctx.moveTo(per[0]!.x, per[0]!.y);
      for (let k = 1; k <= segs; k++) {
        const q = per[k % 4]!;
        ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
    }
    // The drag-furrows: four curved grooves hauled in from the rim —
    // the pull written in the turf itself, crumb ticks riding them.
    if (t > 0.12 && t < 0.85) {
      const fk = Math.min(1, (t - 0.12) / 0.2);
      for (let k = 0; k < 4; k++) {
        const a = ga + Math.PI / 4 + (k * Math.PI) / 2 + (rand() - 0.5) * 0.3;
        const r0 = rPx * (0.95 + rand() * 0.1);
        const p0 = pt(c, r0, a);
        const pmYaw = a + (k % 2 === 0 ? 0.35 : -0.35);
        const pm = pt(c, r0 * 0.55, pmYaw);
        const pe = corner(Math.cos(a - ga) > 0 ? 0.7 : -0.7, Math.sin(a - ga) > 0 ? 1 : -1);
        ctx.globalAlpha = 0.65 * fk * (t < 0.62 ? 1 : (1 - t) / 0.38);
        ctx.strokeStyle = shade(st.deep, -10);
        ctx.lineWidth = Math.max(2.5, sc * 0.07);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.quadraticCurveTo(pm.x, pm.y, pe.x, pe.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const m = asMatter(c);
    ctx.save();
    // Soil streams: gated crumbs sliding in over the rim and dropping
    // into the dark while the grave is open.
    if (t > 0.2 && t < 0.7 && Math.random() < c.frameDt * 26) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.75, c.wy + Math.sin(a) * c.radius * 0.75, 2,
        [st.deep, shade(st.deep, 10)], {
          speed: 1.6, life: 0.45, size: 0.05, gravity: 0, dir: a + Math.PI, spread: 0.15,
          shape: 'mote', drag: 0.3,
        });
    }
    // The exhale: one breath of dust as the plot closes — gated to
    // fire once-ish in its narrow window (the library's voice).
    if (t > 0.74 && t < 0.8 && Math.random() < c.frameDt * 16) {
      dust.deployments.billow!(m, c.wx, c.wy, { radius: c.radius * 0.35, scale: 0.45 });
    }
    // THE FILLED PLOT: in the closing window the mound arrives — soil
    // grains laid in THREE NEAT ROWS down the inside of the rectangle,
    // never scattered, so what remains reads as a mound and not as
    // spilled dirt. The ten-second record of a hole that got its way.
    if (t > 0.78 && t < 0.97 && Math.random() < c.frameDt * 30) {
      const rand = srand(c.seed ^ 0x64a7e);
      const ga = rand() * Math.PI;
      const bx = Math.cos(ga);
      const by = Math.sin(ga);
      const nx = -by;
      const ny = bx;
      const lf = (Math.random() - 0.5) * 1.05 * c.radius;
      for (let k = 0; k < 3; k++) {
        const wf = (k - 1) * 0.19 * c.radius;
        lay(c, c.wx + bx * lf + nx * wf, c.wy + by * lf + ny * wf,
          k === 1 ? shade(st.mid, -6) : shade(st.deep, 12),
          { life: 9.5, size: k === 1 ? 0.05 : 0.042 });
      }
    }
    // The closing wisp: a small pale star as the seam snaps shut.
    if (t > 0.9 && t < 0.98) {
      const k = 1 - (t - 0.9) / 0.08;
      ctx.globalAlpha = 0.8 * k;
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      burstStarPath(ctx, px, py - sc * 0.15, sc * 0.24, sc * 0.08, 4, 0.4, c.squash);
      ctx.fill();
      c.glow(c.wx, c.wy, 0.8, 0.35 * k);
    }
    ctx.restore();
  },
};

// ------------------------------------------------------------- ore_song

/**
 * ORE_SONG — "the singing vein."
 * The seam sings back: three branching ore veins live under the
 * caster's feet (hashed from the ground — the channel stands on the
 * same veins every beat) and each beat the SONG runs them root to
 * tip, a bright pulse racing the groove while one hammered ring —
 * its rim notched like struck metal — rolls outward. The struck ore
 * answers in kind: gold glints leap on true arcs, bounce, and then
 * KEEP CATCHING LIGHT where they lie, flickering in the grass for
 * eight seconds. The vein itself darkens beat over beat.
 */
const ore_song: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x03e50);
    const prand = srand(posSeed(c.wx, c.wy, 0x03e51));
    // The struck ore: glints out of the vein tips, bouncing, then
    // lying lit — flicker keeps them alive long after they land.
    for (let b = 0; b < 3; b++) {
      const a = prand() * Math.PI * 2;
      const tipR = c.radius * (0.55 + prand() * 0.35);
      prand(); prand(); // keep walk in step with the paint hooks
      // Two glints per branch — six a beat, thrown HIGH, bouncing,
      // and still catching light in the grass eight seconds later.
      for (let k = 0; k < 2; k++) {
        c.particles.burst(c.wx + Math.cos(a) * tipR, c.wy + Math.sin(a) * tipR, 1,
          [k % 2 === 0 ? c.st.core : ORE_GOLD, c.st.spark], {
            speed: 0.8 + rand() * 1, life: 8, size: 0.055,
            gravity: 0, dir: a + (rand() - 0.5) * 1.2, spread: 0.4,
            shape: 'glint', flicker: 1,
            z: 0.1, vz: 2.8 + rand() * 1.8, zg: 8.5, land: 'bounce', bounce: 0.55,
            layer: 'world', fade: ORE_GOLD, fadeAt: 0.8,
          });
      }
      // The vein darkens: one grain per branch per beat, on the line.
      lay(c, c.wx + Math.cos(a) * tipR * 0.6, c.wy + Math.sin(a) * tipR * 0.6,
        ORE_UMBER, { life: 10, size: 0.05 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const prand = srand(posSeed(c.wx, c.wy, 0x03e51));
    const beat = srand(c.seed ^ 0x03e52);
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    // The three veins, and the song racing each one root → tip —
    // each branch offset on its own start so the chord rings arpeggio.
    for (let b = 0; b < 3; b++) {
      const a = prand() * Math.PI * 2;
      const tipR = rPx * (0.55 + prand() * 0.35);
      const kink = (prand() - 0.5) * 0.8;
      const kink2 = (prand() - 0.5) * 0.8;
      const p1 = pt(c, tipR * 0.4, a + kink * 0.4);
      const p2 = pt(c, tipR * 0.72, a + kink2 * 0.25);
      const p3 = pt(c, tipR, a);
      // The groove: deep bed always.
      ctx.globalAlpha = 0.7 * fade;
      ctx.strokeStyle = shade(st.deep, -12);
      ctx.lineWidth = Math.max(2.8, sc * 0.075);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.stroke();
      // The song: a bright reach running the vein through the beat.
      const start = beat() * 0.25;
      const run = Math.max(0, Math.min(1, (t - start) / 0.5));
      if (run > 0) {
        const pts = [{ x: px, y: py }, p1, p2, p3];
        const reach = run * 3;
        const nFull = Math.floor(reach);
        ctx.globalAlpha = 0.95 * fade;
        ctx.strokeStyle = ORE_GOLD;
        ctx.lineWidth = Math.max(2.5, sc * 0.06);
        ctx.beginPath();
        ctx.moveTo(px, py);
        for (let k = 1; k <= Math.min(3, nFull); k++) ctx.lineTo(pts[k]!.x, pts[k]!.y);
        if (nFull < 3) {
          const f = reach - nFull;
          const q0 = pts[nFull]!;
          const q1 = pts[nFull + 1]!;
          ctx.lineTo(q0.x + (q1.x - q0.x) * f, q0.y + (q1.y - q0.y) * f);
        }
        ctx.stroke();
        // The running note: a white tick at the song's live point.
        if (run < 1) {
          const f = reach - nFull;
          const q0 = pts[Math.min(2, nFull)]!;
          const q1 = pts[Math.min(3, nFull + 1)]!;
          const gx = q0.x + (q1.x - q0.x) * f;
          const gy = q0.y + (q1.y - q0.y) * f;
          ctx.globalAlpha = 0.97;
          ctx.fillStyle = st.core;
          ctx.fillRect(gx - sc * 0.04, gy - sc * 0.04, sc * 0.08, sc * 0.08);
        }
      }
    }
    // The hammered ring: one expanding circle whose rim is notched —
    // struck metal, not a bell — gold over its dark twin.
    const rk = Math.min(1, t / 0.7);
    const R = rPx * (0.3 + rk * 0.68);
    ctx.globalAlpha = 0.7 * (1 - rk * 0.7) * fade;
    ctx.strokeStyle = shade(st.deep, -10);
    ctx.lineWidth = Math.max(4, sc * 0.11);
    ctx.beginPath();
    jaggedRingPath(ctx, px, py, R, squash, 8, 0.07, beat() * Math.PI, c.seed ^ 3);
    ctx.stroke();
    ctx.globalAlpha = Math.max(0.8, 1 - rk * 0.2) * (rk < 0.85 ? 1 : (1 - rk) / 0.15);
    ctx.strokeStyle = ORE_GOLD;
    ctx.lineWidth = Math.max(2.5, sc * 0.07);
    ctx.beginPath();
    jaggedRingPath(ctx, px, py, R * 0.96, squash, 8, 0.07, beat() * Math.PI, c.seed ^ 4);
    ctx.stroke();
    // The ring's own bright lip: white while the note is young.
    if (rk < 0.5) {
      ctx.globalAlpha = 0.9 * (1 - rk / 0.5);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      ctx.beginPath();
      jaggedRingPath(ctx, px, py, R * 0.9, squash, 8, 0.07, beat() * Math.PI, c.seed ^ 5);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.7, 0.4 * (1 - t * 0.6));
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    ctx.save();
    // The strike: the maul meets the seam — one gold star, first 15%.
    if (t < 0.15) {
      const k = 1 - t / 0.15;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py - sc * 0.15, sc * 0.36, sc * 0.13, 5, c.now / 350, squash);
      ctx.fill();
      c.glow(c.wx, c.wy, 1, 0.6 * k);
    }
    // Resonance: note-motes rise off the veins between strikes.
    if (t > 0.2 && Math.random() < c.frameDt * 22) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.5, c.wy + Math.sin(a) * c.radius * 0.5, 1,
        [ORE_GOLD, st.core], {
          speed: 0.25, life: 0.7, size: 0.055, gravity: -1.2, shape: 'glint', flicker: 0.8,
        });
    }
    ctx.restore();
  },
};

// ------------------------------------------------------------ skyweight

/**
 * SKYWEIGHT — "the stones remember."
 * Two wires, one law, taught twice. Each pulse the ground around
 * the caster gives up its stones: seven flat slabs rise smoothly
 * on seeded clocks — side faces dark, tops catching light — hang
 * one held breath at the apex... and then the ground REMEMBERS
 * them, yanking every one down at once into a slam ring, the
 * library's dust, and a ring of settled fines. The second wire
 * lands on the first one's debris, which is exactly the lesson:
 * gravity repeats itself until the class understands.
 */
const skyweight: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x5c19b);
    // True stones ride the same lift: up hard, down harder, then
    // they bounce dead and LIE — each wire adds its own ring of them.
    for (let k = 0; k < 8; k++) {
      const a = rand() * Math.PI * 2;
      const r = 0.35 + rand() * 0.6;
      c.particles.burst(c.wx + Math.cos(a) * r, c.wy + Math.sin(a) * r, 1,
        [c.st.mid, shade(c.st.deep, 14), shade(c.st.deep, 8)], {
          speed: 0.15, life: 7, size: 0.04 + rand() * 0.015,
          gravity: 0, shape: 'square', spin: 3,
          z: 0.05, vz: 2.5 + rand() * 0.7, zg: 9, land: 'bounce', bounce: 0.3,
          layer: 'world', fade: shade(c.st.deep, 8), fadeAt: 0.5,
        });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const m = asMatter(c);
    ctx.save();
    if (t < 0.42) {
      // The inhale: a thin ring contracting as the field lifts —
      // the hush before the ground speaks.
      const k = t / 0.42;
      const R = rPx * (1.0 - k * 0.45);
      ctx.globalAlpha = 0.5 * k;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.8, sc * 0.045);
      ctx.beginPath();
      ctx.ellipse(px, py, R, R * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // THE FALL: the slam ring, its jagged pressure twin, and the
      // library's dust — gated to the yank's own narrow window.
      if (t < 0.5 && Math.random() < c.frameDt * 30) {
        dust.deployments.slam!(m, c.wx, c.wy, { scale: 0.55 });
        // The fines ring: the pulse's lasting mark, laid at the slam.
        const rand = srand(c.seed ^ 0x5c19c);
        for (let k = 0; k < 9; k++) {
          const a = (k / 9) * Math.PI * 2 + rand() * 0.5;
          const r = c.radius * (0.55 + (rand() - 0.5) * 0.15);
          lay(c, c.wx + Math.cos(a) * r, c.wy + Math.sin(a) * r,
            k % 3 === 0 ? shade(c.st.mid, -6) : shade(c.st.deep, 12), { life: 8.5, size: 0.035 + rand() * 0.01 });
        }
      }
      const k = Math.min(1, (t - 0.42) / 0.4);
      const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
      // The fall's ring: bolder than the lift's hush — the second
      // telling of the lesson is the one that has to land.
      ctx.globalAlpha = Math.max(0.8, 1 - k) * (k < 0.8 ? 1 : (1 - k) / 0.2);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(3, sc * 0.09);
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * (0.3 + k * 0.7), rPx * (0.3 + k * 0.7) * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.7 * fade;
      ctx.strokeStyle = shade(st.deep, -10);
      ctx.lineWidth = Math.max(2.5, sc * 0.07);
      ctx.beginPath();
      jaggedRingPath(ctx, px, py, rPx * (0.25 + k * 0.55), squash, 10, 0.12, c.seed % 7, c.seed ^ 11);
      ctx.stroke();
    }
    ctx.restore();
    if (t > 0.42 && t < 0.6) c.glow(c.wx, c.wy, c.radius, 0.7 * (1 - (t - 0.42) / 0.18));
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x5c19d);
    ctx.save();
    // THE RISEN FIELD: seven slabs on one shared clock — rise, hang,
    // and the yank. Deterministic z, so both wires re-render true.
    for (let i = 0; i < 7; i++) {
      const a = rand() * Math.PI * 2;
      const r = rPx * (0.3 + rand() * 0.6);
      const hMax = sc * (0.55 + rand() * 0.4);
      const w = sc * (0.13 + rand() * 0.06);
      let z: number;
      if (t < 0.34) {
        const k = t / 0.34;
        z = hMax * (1 - (1 - k) * (1 - k)); // ease out — the lift
      } else if (t < 0.42) {
        z = hMax; // the held breath
      } else if (t < 0.52) {
        const k = (t - 0.42) / 0.1;
        z = hMax * (1 - k * k); // the yank
      } else {
        continue; // the ground has them now
      }
      const bx = px + Math.cos(a) * r;
      const bY = py + Math.sin(a) * r * squash;
      // Its shadow stays home while the stone leaves it.
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = shade(st.deep, -12);
      ctx.beginPath();
      ctx.ellipse(bx, bY, w * (1 - 0.3 * (z / hMax)), w * 0.5 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      // The slab: dark side face, lit top plane.
      const y = bY - z;
      const h = w * 0.6;
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = shade(st.deep, -8);
      ctx.fillRect(bx - w, y - h * 0.5, w * 2, h);
      ctx.fillStyle = i % 2 === 0 ? st.mid : shade(st.mid, -6);
      ctx.beginPath();
      ctx.ellipse(bx, y - h * 0.5, w, h * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      // The landing tick: a white jolt the frame each stone returns.
      if (t >= 0.5 && t < 0.56) {
        ctx.globalAlpha = 0.9 * (1 - (t - 0.5) / 0.06);
        ctx.fillStyle = st.core;
        ctx.fillRect(bx - sc * 0.05, bY - sc * 0.03, sc * 0.1, sc * 0.06);
      }
    }
    // Fines drift down late — what the fall shook loose, gated.
    if (t > 0.5 && Math.random() < c.frameDt * 14 * (1 - t)) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.5, c.wy + Math.sin(a) * c.radius * 0.5, 1,
        [st.mid, st.deep], {
          speed: 0.2, life: 0.6, size: 0.045, gravity: 0, shape: 'mote',
          z: 0.5, vz: -0.4, zg: 2, land: 'die', layer: 'world', shadow: 0,
        });
    }
    ctx.restore();
  },
};

// ----------------------------------------------------------- long_lever

/**
 * LONG_LEVER — "the place to stand."
 * The old promise made literal: a fulcrum stone stands a third of
 * the way down the lane, the iron bar lies over it the full
 * corridor, and each beat the near end PRESSES — haft sinking into
 * a deepening dent — while the far end kicks up, hinging a whole
 * slab of torn earth off its socket and shedding crumbs from its
 * lifted lip. Stone chips toss at the far end through the library's
 * gouge, and the pry's record accumulates: two diverging gouge
 * lines of settled grains at the far socket, deeper every beat.
 */
const long_lever: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x11e4a);
    const ang = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    // The far end's toss.
    dust.deployments.gouge!(m, c.wx2, c.wy2, { dir: ang, scale: 0.65 });
    for (let k = 0; k < 5; k++) {
      c.particles.burst(c.wx2, c.wy2, 1, [c.st.mid, shade(c.st.deep, 12)], {
        speed: 1 + rand() * 1.2, life: 7, size: 0.04 + rand() * 0.015,
        gravity: 0, dir: ang + (rand() - 0.5) * 1.6, spread: 0.4,
        shape: 'shard', spin: 7,
        z: 0.1, vz: 2.4 + rand() * 1.6, zg: 8.5, land: 'bounce', bounce: 0.4,
        layer: 'world', fade: shade(c.st.deep, 8), fadeAt: 0.45,
      });
    }
    // The pry's record: two diverging gouges past the far socket,
    // hashed from the lane so every beat deepens the same marks.
    const prand = srand(posSeed(c.wx2, c.wy2, 0x11e4b));
    for (const s of [-1, 1]) {
      const ga = ang + s * (0.35 + prand() * 0.15);
      for (let k = 0; k < 3; k++) {
        lay(c, c.wx2 + Math.cos(ga) * (0.15 + k * 0.2), c.wy2 + Math.sin(ga) * (0.15 + k * 0.2),
          k === 0 ? shade(c.st.mid, -8) : shade(c.st.deep, 10), { life: 9.5, size: 0.04 + rand() * 0.012 });
      }
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const dx = px2 - px;
    const dy = py2 - py;
    const fx = px + dx * 0.3; // the fulcrum's station
    const fy = py + dy * 0.3;
    const press = t < 0.5 ? t / 0.5 : 1; // the lean into the bar
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    ctx.save();
    ctx.lineCap = 'butt';
    // The bar's shadow across the whole lane: a hint on the ground,
    // never a painted band — the bar itself is the thing to look at.
    ctx.globalAlpha = 0.18 * fade;
    ctx.strokeStyle = shade(st.deep, -10);
    ctx.lineWidth = Math.max(3, sc * 0.09);
    ctx.beginPath();
    ctx.moveTo(px - dx * 0.12, py - dy * 0.12);
    ctx.lineTo(px2, py2);
    ctx.stroke();
    // The press dent at the near end: darker the harder the lean.
    ctx.globalAlpha = (0.25 + 0.45 * press) * fade;
    ctx.fillStyle = shade(st.deep, -14);
    ctx.beginPath();
    ctx.ellipse(px - dx * 0.1, py - dy * 0.1, sc * 0.2, sc * 0.2 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // The far socket: the torn mouth the slab hinged out of.
    ctx.globalAlpha = (0.3 + 0.5 * press) * fade;
    ctx.fillStyle = shade(st.deep, -12);
    ctx.beginPath();
    ctx.ellipse(px2, py2, sc * (0.18 + 0.14 * press), sc * (0.14 + 0.1 * press) * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.7 * press * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.6, sc * 0.04);
    ctx.beginPath();
    ctx.ellipse(px2, py2, sc * (0.2 + 0.14 * press), sc * (0.16 + 0.1 * press) * squash, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    void fx; void fy;
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const dx = px2 - px;
    const dy = py2 - py;
    const fx = px + dx * 0.3;
    const fy = py + dy * 0.3;
    // The pry: the tilt eases in, holds, releases at the tail.
    const th = t < 0.5 ? (t / 0.5) * (t / 0.5) * (3 - 2 * (t / 0.5)) : t < 0.78 ? 1 : Math.max(0, 1 - (t - 0.78) / 0.22);
    const lift = sc * 0.85 * th; // the far tip's height
    const sink = sc * 0.16 * th; // the near haft's press
    ctx.save();
    ctx.lineCap = 'butt';
    // The fulcrum stone: dark side face, lit foreshortened top.
    const fw = sc * 0.2;
    const fh = sc * 0.24;
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = shade(st.deep, -12);
    ctx.fillRect(fx - fw, fy - fh, fw * 2, fh);
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.ellipse(fx, fy - fh, fw, fw * 0.45 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // The bar: haft end pressed low, far end kicked up — one line
    // bent over the stone, iron-dark with a pale top edge.
    const hx = px - dx * 0.12;
    const hy = py - dy * 0.12 + sink;
    const tx = px2;
    const ty = py2 - lift;
    for (const [col, lw, off] of [
      [shade(st.deep, -16), Math.max(4, sc * 0.11), 0],
      [st.mid, Math.max(1.8, sc * 0.045), -Math.max(1.5, sc * 0.035)],
    ] as const) {
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(hx, hy + off);
      ctx.lineTo(fx, fy - fh + off);
      ctx.lineTo(tx, ty + off);
      ctx.stroke();
    }
    // The pried slab: a flat quad hinged off the far socket, its
    // dark underside showing as it stands into the light.
    if (th > 0.05) {
      const ang = Math.atan2(dy, dx);
      const nx = -Math.sin(ang);
      const ny = Math.cos(ang);
      const sl = sc * 0.5;
      const sw = sc * 0.3;
      const tipY = py2 - lift * 0.9;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = shade(st.deep, -10);
      ctx.beginPath();
      ctx.moveTo(px2 + nx * sw, py2 + ny * sw * squash);
      ctx.lineTo(px2 - nx * sw, py2 - ny * sw * squash);
      ctx.lineTo(px2 - nx * sw * 0.8 + Math.cos(ang) * sl * (1 - th * 0.5), tipY - ny * sw * 0.8);
      ctx.lineTo(px2 + nx * sw * 0.8 + Math.cos(ang) * sl * (1 - th * 0.5), tipY + ny * sw * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.6, sc * 0.04);
      ctx.beginPath();
      ctx.moveTo(px2 - nx * sw * 0.8 + Math.cos(ang) * sl * (1 - th * 0.5), tipY - ny * sw * 0.8);
      ctx.lineTo(px2 + nx * sw * 0.8 + Math.cos(ang) * sl * (1 - th * 0.5), tipY + ny * sw * 0.8);
      ctx.stroke();
      // Crumbs drop off the lifted lip — gated, honest gravity.
      if (th > 0.4 && th < 1 && Math.random() < c.frameDt * 24) {
        c.particles.burst(c.wx2, c.wy2, 1, [st.deep, shade(st.deep, 10)], {
          speed: 0.4, life: 0.6, size: 0.05, gravity: 0, shape: 'square', spin: 5,
          z: lift / sc * 0.8, vz: 0.1, zg: 7, land: 'settle', layer: 'world',
        });
      }
    }
    if (t < 0.55) c.glow(c.wx2, c.wy2, 0.8, 0.35 * th);
    ctx.restore();
  },
};

// ------------------------------------------------------------ sunhammer

/**
 * SUNHAMMER — "the held noon."
 * The swing is a broad gold crescent with the library's fire riding
 * the chord — and then the swing REFUSES to leave: the crescent
 * hangs in the air where the blade passed, a curve of hovering
 * grains at shoulder height that cools through three honest stops —
 * white-gold, ember, dusk — for a second and a half after the wire
 * is dead. Below it the scorch crescent lies in settled grains,
 * cooling on the same clock but ten seconds slower. Noon, held.
 */
const sunhammer: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x50a41);
    // The burn along the chord: the library's fan owns the flame.
    fire.deployments.fan!(m,
      c.wx + Math.cos(c.dir) * c.radius * 0.35,
      c.wy + Math.sin(c.dir) * c.radius * 0.35, { dir: c.dir, scale: 0.7 });
    // THE HELD NOON: hovering grains along the swing's arc at
    // shoulder height — zg 0, they hang — cooling in three stops
    // and outliving the paint by a full second.
    for (let k = 0; k < 14; k++) {
      const a = c.dir - 0.95 + (k / 13) * 1.9;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.78, c.wy + Math.sin(a) * c.radius * 0.78, 1,
        [k % 3 === 0 ? c.st.core : '#ffe9a0'], {
          speed: 0.04, life: 1.6, size: 0.075 + rand() * 0.02,
          gravity: 0, shape: 'square', flicker: 0.2,
          z: 0.55, vz: 0, zg: 0, land: 'none', layer: 'world', shadow: 0.15,
          fade: '#e8843c', fadeAt: 0.34, fade2: '#8a5a3c', fade2At: 0.68,
        });
    }
    // Embers off the chord: true falls, brief bounces.
    for (let k = 0; k < 5; k++) {
      const a = c.dir + (rand() - 0.5) * 1.6;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.6, c.wy + Math.sin(a) * c.radius * 0.6, 1,
        [c.st.spark, '#e8843c'], {
          speed: 0.8 + rand() * 0.8, life: 2, size: 0.05, gravity: 0,
          dir: a, spread: 0.5, shape: 'glint', flicker: 0.7,
          z: 0.5, vz: 0.8 + rand(), zg: 7, land: 'bounce', bounce: 0.35,
          layer: 'world', fade: '#8a4a2a', fadeAt: 0.6,
        });
    }
    // The scorch crescent: the ground's copy of the held noon,
    // cooling through the same stops on the ten-second clock.
    for (let k = 0; k < 9; k++) {
      const a = c.dir - 0.85 + (k / 8) * 1.7;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.78, c.wy + Math.sin(a) * c.radius * 0.78, '#ffe9a0', {
        life: 9, size: 0.055,
        fade: '#e8843c', fadeAt: 0.12, fade2: '#8a5a3c', fade2At: 0.4,
        fade3: shade(c.st.deep, -6), fade3At: 0.7,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, px, py, rPx } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    ctx.save();
    ctx.lineCap = 'butt';
    // The heat crescent on the turf: an arc band under the swing —
    // char bed, then the hot body while the strike is young.
    const hot = t < 0.3 ? 1 : Math.max(0, 1 - (t - 0.3) / 0.6);
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = shade(st.deep, -10);
    ctx.lineWidth = Math.max(5, sc * 0.16);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.78, rPx * 0.78 * squash, 0, dir - 0.95, dir + 0.95);
    ctx.stroke();
    ctx.globalAlpha = (0.3 + 0.5 * hot) * fade;
    ctx.strokeStyle = t < 0.4 ? '#ffe9a0' : '#e8843c';
    ctx.lineWidth = Math.max(2.6, sc * 0.075);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.76, rPx * 0.76 * squash, 0, dir - 0.85, dir + 0.85);
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.5, c.wy + Math.sin(dir) * c.radius * 0.5, 1.1, (0.25 + 0.4 * hot) * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, dir, px, py, rPx } = c;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE CRESCENT: the sun taken off the haft and thrown. It sweeps
    // the whole arc in the first third of the wire — deep sleeve, broad
    // gold body, one white-hot leading edge — and then it HANGS,
    // cooling in place through gold, ember, dusk while the hovering
    // grains carry the same afterimage past the wire's own death.
    const a0 = dir - 0.95;
    const sweep = Math.min(1, t / 0.32);
    const lead = a0 + 1.9 * sweep;
    const y = py - sc * 0.4;
    const cool = Math.max(0, (t - 0.32) / 0.68); // 0 at the strike, 1 at dusk
    const body = cool < 0.34 ? '#ffe9a0' : cool < 0.68 ? '#e8843c' : '#8a5a3c';
    const hold = sweep >= 1;
    const R = rPx * 0.78;
    const band = (r: number, col: string, lw: number, al: number, from: number): void => {
      ctx.globalAlpha = al;
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.ellipse(px, y, r, r * squash, 0, Math.max(a0, from), lead);
      ctx.stroke();
    };
    // The sleeve: the dark the gold is cut out of.
    band(R, shade(st.deep, -8), Math.max(8, sc * 0.28), (hold ? 0.5 : 0.7) * (1 - cool * 0.5), a0);
    // The body: BROAD gold, and it stays loud while the swing holds.
    band(R, body, Math.max(5, sc * 0.18), hold ? Math.max(0.8, 1 - cool * 0.2) * (1 - cool * cool * 0.7) : 0.95, a0);
    // The hot edge: white on the leading rim, brightest as it travels.
    band(R * 1.03, hold ? '#ffe9a0' : st.core, Math.max(2.5, sc * 0.07),
      hold ? 0.8 * (1 - cool) : 0.97, hold ? a0 : lead - 0.45);
    if (!hold) {
      // The blade's point, while the arc is still being cut.
      const tipX = px + Math.cos(lead) * R;
      const tipY = y + Math.sin(lead) * R * squash;
      ctx.globalAlpha = 0.97;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, tipX, tipY, sc * 0.34, sc * 0.12, 4, lead, squash);
      ctx.fill();
      c.glow(c.wx + Math.cos(lead) * c.radius * 0.7, c.wy + Math.sin(lead) * c.radius * 0.7, 1.1, 0.65);
    } else {
      c.glow(c.wx + Math.cos(dir) * c.radius * 0.6, c.wy + Math.sin(dir) * c.radius * 0.6, 1, 0.5 * (1 - cool));
    }
    // Heat shimmer climbs off the hanging crescent — gated.
    if (Math.random() < c.frameDt * 16) {
      const a = dir - 0.9 + Math.random() * 1.8;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.78, c.wy + Math.sin(a) * c.radius * 0.78, 1,
        [st.spark, '#e8843c'], {
          speed: 0.2, life: 0.5, size: 0.05, gravity: -1.8, shape: 'streak',
          z: 0.6, vz: 0.5, zg: 0, land: 'none', layer: 'world', shadow: 0,
        });
    }
    ctx.restore();
  },
};

// ----------------------------------------------------------- worlds_rim

/**
 * WORLDS_RIM — "the passing wheel."
 * The far edge of the world takes a shortcut through the ring: a
 * colossal curved BAND — the contact arc of a wheel far too large
 * to see — lies across the marked ground, hashed from the target so
 * its chord holds still all channel long, while its tread ticks
 * slide along the band every beat from a fresh phase: the grind,
 * advancing. Above the contact line the wheel's face stands as a
 * curved wall of cold, fading up into the sky it came from. Frost
 * speaks only through the library — shatter at the contact point,
 * fog banking off the line — and the track keeps the toll: worn
 * grains and pale rime laid along the same arc, beat over beat.
 */
const worlds_rim: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const prand = srand(posSeed(c.wx, c.wy, 0x30a1d));
    const beat = srand(c.seed ^ 0x30a1e);
    const A = prand() * Math.PI * 2; // the band's heading — held
    const D = 6; // the colossal wheel's radius, tiles
    // The wheel's center, far off-stage along the band's normal.
    const cx = c.wx + Math.cos(A + Math.PI / 2) * D;
    const cy = c.wy + Math.sin(A + Math.PI / 2) * D;
    // The contact point this beat: hashed phase along the band.
    const span = c.radius / D;
    const pa = Math.atan2(c.wy - cy, c.wx - cx) + (beat() - 0.5) * span * 1.4;
    const kx = cx + Math.cos(pa) * D;
    const ky = cy + Math.sin(pa) * D;
    frost.deployments.shatter!(m, kx, ky, { scale: 0.35 });
    frost.deployments.fog!(m, kx, ky, { radius: 0.7, scale: 0.4, dur: 1.8 });
    // The worn track: grains along the band's arc — grind, recorded.
    for (let k = 0; k < 6; k++) {
      const a = Math.atan2(c.wy - cy, c.wx - cx) + (k / 5 - 0.5) * span * 1.7 + (beat() - 0.5) * 0.03;
      const rr = D + (beat() - 0.5) * 0.12;
      lay(c, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr,
        k % 3 === 0 ? c.st.spark : shade(c.st.deep, 12),
        { life: 9.5, size: 0.04 + beat() * 0.012 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const prand = srand(posSeed(c.wx, c.wy, 0x30a1d));
    const beat = srand(c.seed ^ 0x30a1f);
    const A = prand() * Math.PI * 2;
    const D = 6;
    const Dpx = D * sc;
    const cx = px + Math.cos(A + Math.PI / 2) * Dpx;
    const cy = py + Math.sin(A + Math.PI / 2) * Dpx * squash;
    const mid = Math.atan2((py - cy) / squash, px - cx);
    const span = (rPx / Dpx) * 0.95;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const arc = (r: number, col: string, lw: number, al: number): void => {
      ctx.globalAlpha = al;
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * squash, 0, mid - span, mid + span);
      ctx.stroke();
    };
    ctx.save();
    ctx.lineCap = 'butt';
    // The band: pressed bed, cold body, pale contact seam.
    arc(Dpx, shade(st.deep, -10), Math.max(7, sc * 0.3), 0.22 * fade);
    arc(Dpx, st.mid, Math.max(4.5, sc * 0.18), 0.25 * fade);
    arc(Dpx - sc * 0.06, st.core, Math.max(2.5, sc * 0.06), 0.9 * fade);
    // The tread: ticks sliding along the band through the beat —
    // per-beat phase from fresh seed, so the grind ADVANCES.
    const phase = beat() + t * 0.35;
    for (let k = 0; k < 6; k++) {
      const a = mid - span + ((k + (phase % 1)) / 6) * span * 2;
      if (a > mid + span) continue;
      const x0 = cx + Math.cos(a) * (Dpx - sc * 0.16);
      const y0 = cy + Math.sin(a) * (Dpx - sc * 0.16) * squash;
      const x1 = cx + Math.cos(a) * (Dpx + sc * 0.16);
      const y1 = cy + Math.sin(a) * (Dpx + sc * 0.16) * squash;
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = shade(st.deep, -14);
      ctx.lineWidth = Math.max(2.4, sc * 0.06);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.3 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const prand = srand(posSeed(c.wx, c.wy, 0x30a1d));
    const beat = srand(c.seed ^ 0x30a20);
    const A = prand() * Math.PI * 2;
    const Dpx = 6 * sc;
    const cx = px + Math.cos(A + Math.PI / 2) * Dpx;
    const cy = py + Math.sin(A + Math.PI / 2) * Dpx * squash;
    const mid = Math.atan2((py - cy) / squash, px - cx);
    const span = (rPx / Dpx) * 0.85;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE WHEEL'S FACE: the same arc standing at three heights,
    // fading up — a wall of cold whose top the eye never finds.
    for (let h = 0; h < 3; h++) {
      const lift = sc * (0.5 + h * 0.55);
      ctx.globalAlpha = (0.55 - h * 0.16) * fade;
      ctx.strokeStyle = h === 0 ? st.mid : shade(st.mid, -6 * h);
      ctx.lineWidth = Math.max(2.4 - h * 0.4, sc * (0.07 - h * 0.012));
      ctx.beginPath();
      ctx.ellipse(cx, cy - lift, Dpx, Dpx * squash, 0, mid - span, mid + span);
      ctx.stroke();
    }
    // The face's tread lines: verticals tying ground band to wall,
    // sliding with the same per-beat phase as the ground ticks.
    const phase = beat() + t * 0.35;
    for (let k = 0; k < 4; k++) {
      const a = mid - span + ((k + (phase % 1)) / 4) * span * 2;
      if (a > mid + span) continue;
      const x = cx + Math.cos(a) * Dpx;
      const y = cy + Math.sin(a) * Dpx * squash;
      ctx.globalAlpha = 0.5 * fade;
      ctx.strokeStyle = shade(st.deep, -8);
      ctx.lineWidth = Math.max(1.8, sc * 0.045);
      ctx.beginPath();
      ctx.moveTo(x, y - sc * 0.08);
      ctx.lineTo(x, y - sc * 1.5);
      ctx.stroke();
    }
    // Frost-dust sprays off the contact line — gated glints only
    // (the fog and shatter are the library's; these are the sparks
    // of the grind itself, the wheel's own cold iron).
    if (Math.random() < c.frameDt * 20) {
      const a = mid + (Math.random() - 0.5) * span * 1.6;
      const wx = c.wx + (Math.cos(a) * Dpx - Math.cos(mid) * Dpx) / sc;
      const wy = c.wy + (Math.sin(a) * Dpx - Math.sin(mid) * Dpx) / sc;
      c.particles.burst(wx, wy, 1, [st.core, st.spark], {
        speed: 0.9, life: 0.5, size: 0.045, gravity: 0, shape: 'glint',
        z: 0.1, vz: 1.4, zg: 6, land: 'die', layer: 'world', shadow: 0,
      });
    }
    ctx.restore();
  },
};

// -------------------------------------------------------------- registry

/**
 * The twohand breath wave of THE SIGNATURE LAW — merged into the
 * master registry by the integrator. Keys are ability ids.
 */
export const TWOHAND_BREATH_SIGS: Record<string, AbilitySig> = {
  fell_timber,
  quarry_work,
  forgefall,
  wheelbreaker,
  gravedigger,
  ore_song,
  skyweight,
  long_lever,
  sunhammer,
  worlds_rim,
};
