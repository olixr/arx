/**
 * THE SECOND BREATH SPEAKS — the dualwield wave, TWIN SILVER.
 *
 * Ten set-pieces for the twin school's between-rung breath arts.
 * The doctrine: dualwield's breath happens TWICE — pairs, mirrors,
 * crossings, and what the second hand answers. Nothing here arrives
 * alone and nothing repeats another wave's centerpiece: the ladder
 * file owns the crossing X, the glass seam, the body-wrapped spool,
 * the counter-round and the echo ring — this wave speaks in bells,
 * knots, facing moons, bobbins, staples, looms and doors instead.
 *
 * Silver glints, ribbon, thread and glass are the school's own
 * unowned matter; frost, fire, storm, blood and dust arrive through
 * the library only (ONE-VOICE). Same binding laws as every wave:
 * hard edges, save/restore hygiene, squash on ground y-radii, srand
 * geometry with frameDt-gated emission, ≤ ~60 path ops per hook per
 * frame, and THE LASTING MARK — every art leaves a deliberate
 * formation that outlives the paint.
 *
 * Channel signatures are ONE BEAT'S WORTH; geometry that must hold
 * still across beats derives from POSITION, not seed (channels root
 * the caster), and cross-beat growth accumulates through matter —
 * the world keeps what landed.
 */

import { shade } from './tint.js';
import { boltPath, burstStarPath, jaggedRingPath, srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { blood, dust, fire, frost, storm, asMatter } from './matter/index.js';

/** Screen point r px from the heart along ground angle a. */
function pt(c: SigCtx, r: number, a: number): { x: number; y: number } {
  return { x: c.px + Math.cos(a) * r, y: c.py + Math.sin(a) * r * c.squash };
}

/**
 * THE LASTING MARK — one settled grain laid deliberately at a world
 * point (ground layer, near-still, ~8-10 s). Every art's lingering
 * record goes through here so the budget stays legible.
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
 * Channel-stable seed: derived from the wire's world anchor, not the
 * per-beat seed — a rooted channel re-broadcasts onto the SAME
 * geometry every beat (the accumulation law).
 */
function posSeed(wx: number, wy: number, salt: number): number {
  return ((Math.floor(wx * 8) * 73) ^ (Math.floor(wy * 8) * 151) ^ salt) | 0;
}

/** Which beat of a re-broadcast flurry this fx is: bornAt / cadence. */
function beatIndex(c: SigCtx, cadenceMs: number): number {
  return Math.floor((c.now - c.age) / cadenceMs);
}

// ------------------------------------------------------------ two_bells

/**
 * TWO_BELLS — "the second toll."
 * Both edges ring. Twin crescents sweep from opposite shoulders of
 * the aim, and as each completes, its TIP rings — a hard double
 * sound-ring snapping out of the point, the second bell tolling
 * ~80 ms after the first. Storm crackle jumps at the chord where the
 * sweeps pass; chime glints fall on true arcs and lie along the
 * chord like dropped clapper filings.
 */
const two_bells: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0xbe11);
    const kx = c.wx + Math.cos(c.dir) * c.radius * 0.7;
    const ky = c.wy + Math.sin(c.dir) * c.radius * 0.7;
    // The shock at the crossing chord — library voice.
    storm.deployments.crackle!(m, kx, ky, { radius: 0.55, scale: 0.5 });
    // Chime filings: silver glints struck loose, bouncing dead and
    // LYING there — the toll's residue.
    for (let k = 0; k < 5; k++) {
      const a = c.dir + (rand() - 0.5) * 1.6;
      c.particles.burst(kx, ky, 1, [c.st.spark, c.st.core], {
        speed: 0.9 + rand() * 0.9, life: 6.5, size: 0.035 + rand() * 0.015,
        gravity: 0, dir: a, spread: 0.4, shape: 'glint',
        z: 0.5, vz: 1.6 + rand() * 1.2, zg: 8.5, land: 'bounce', bounce: 0.42,
        layer: 'world', fade: shade(c.st.mid, -14), fadeAt: 0.35,
      });
    }
    // The chord keeps a soft silver arc of grains — where the sound landed.
    for (let k = 0; k < 5; k++) {
      const a = c.dir - 0.7 + (k / 4) * 1.4;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.72, c.wy + Math.sin(a) * c.radius * 0.72,
        k % 2 === 0 ? c.st.spark : shade(c.st.deep, 12),
        { life: 8, size: 0.04 + rand() * 0.012 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    ctx.save();
    ctx.lineCap = 'butt';
    // The pressed chord: a dim double arc where both edges spoke.
    ctx.globalAlpha = 0.45 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(3, sc * 0.09);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.74, rPx * 0.74 * squash, 0, dir - 0.8, dir + 0.8);
    ctx.stroke();
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.7, rPx * 0.7 * squash, 0, dir - 0.75, dir + 0.75);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, age, sc, squash, px, py, rPx, dir } = c;
    const lift = sc * 0.38;
    const R = rPx * 0.85;
    const sweep = Math.min(1, t / 0.4) * 1.95;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    ctx.save();
    ctx.lineCap = 'round';
    // The twin crescents: one from each shoulder, sweeping PAST each
    // other so the pair reads as a true crossing X — heavy silver body
    // under a bright edge, both hands, nothing thread-thin.
    for (const s of [-1, 1]) {
      const a0 = dir - s * 1.05;
      const a1 = a0 + s * sweep;
      ctx.globalAlpha = 0.6 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(5, sc * 0.17);
      ctx.beginPath();
      ctx.ellipse(px, py - lift, R, R * squash, 0, Math.min(a0, a1), Math.max(a0, a1));
      ctx.stroke();
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(3.5, sc * 0.1);
      ctx.beginPath();
      ctx.ellipse(px, py - lift, R * 0.97, R * 0.97 * squash, 0, Math.min(a0, a1), Math.max(a0, a1));
      ctx.stroke();
      ctx.globalAlpha = 0.95 * fade;
      ctx.strokeStyle = s < 0 ? st.core : st.spark;
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      ctx.beginPath();
      ctx.ellipse(px, py - lift, R * 0.93, R * 0.93 * squash, 0, Math.min(a0, a1), Math.max(a0, a1));
      ctx.stroke();
    }
    // THE BELLS: each completed tip rings a hard double ring — the
    // first at ~110 ms, the second answering ~80 ms later.
    for (const [bornMs, s] of [[110, -1], [190, 1]] as const) {
      if (age < bornMs || age > bornMs + 130) continue;
      const k = (age - bornMs) / 130;
      const tip = pt(c, R * 0.98, dir + s * 0.8);
      tip.y -= lift;
      const rr = sc * (0.14 + k * 0.62);
      ctx.globalAlpha = Math.max(0.8, 1 - k) * (1 - k * 0.15);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.5, sc * 0.075);
      ctx.beginPath();
      ctx.ellipse(tip.x, tip.y, rr, rr * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = (1 - k) * 0.8;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(2.5, sc * 0.055);
      ctx.beginPath();
      ctx.ellipse(tip.x, tip.y, rr * 0.6, rr * 0.6 * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
      // The clapper: a small white strike star at the ring's birth.
      if (k < 0.35) {
        ctx.globalAlpha = 1 - k / 0.35;
        ctx.fillStyle = st.core;
        ctx.beginPath();
        burstStarPath(ctx, tip.x, tip.y, sc * 0.18, sc * 0.065, 4, s, squash);
        ctx.fill();
        c.glow(c.wx + Math.cos(dir + s * 0.8) * c.radius, c.wy + Math.sin(dir + s * 0.8) * c.radius, 0.9, 0.6 * (1 - k));
      }
    }
    ctx.restore();
  },
};

// ----------------------------------------------------------- ribbonwork

/**
 * RIBBONWORK — "the dropped knot."
 * Each beat two ribbons cross the cut — one silver, one dyed red —
 * tie a knot glint where they meet, and then the knot DROPS: it
 * falls to the dirt and lies there, so a held channel leaves a line
 * of dropped knots growing under the work. Blood spatters where the
 * red one bit; both ribbons fall as sinuous settled grain trails.
 */
const ribbonwork: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x51b1);
    const kx = c.wx + Math.cos(c.dir) * c.radius * 0.6;
    const ky = c.wy + Math.sin(c.dir) * c.radius * 0.6;
    // The bite: light spatter, library-voiced.
    blood.deployments.spatter!(m, kx, ky, { scale: 0.45, dir: c.dir });
    // The knot falls as three tight glints that SETTLE — every beat
    // adds one more knot to the ground's tally.
    for (let k = 0; k < 3; k++) {
      c.particles.burst(kx + (rand() - 0.5) * 0.12, ky + (rand() - 0.5) * 0.1, 1, [c.st.spark, c.st.core], {
        speed: 0.15, life: 7.5, size: 0.055, gravity: 0, shape: 'glint',
        z: 0.55, vz: -0.3, zg: 7.5, land: 'settle',
        layer: 'world', fade: shade(c.st.mid, -12), fadeAt: 0.4,
      });
    }
    // The fallen ribbons: two sinuous grain trails, silver and red.
    for (let r = 0; r < 2; r++) {
      const wobPh = rand() * Math.PI * 2;
      for (let k = 0; k < 5; k++) {
        const f = k / 4;
        const a = c.dir + (r === 0 ? -0.55 : 0.55) * (1 - f) + Math.sin(wobPh + f * 4.2) * 0.2;
        const rr = c.radius * (0.25 + f * 0.65);
        lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
          r === 0 ? c.st.spark : '#c23a4e',
          { life: 8, size: 0.04 + rand() * 0.013, fade: r === 0 ? shade(c.st.deep, 14) : '#9b2c3c', fadeAt: 0.5 });
      }
    }
  },
  air(c) {
    const { ctx, st, t, sc, squash, dir } = c;
    const rand = srand(c.seed ^ 0x51bb0);
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const kP = pt(c, c.rPx * 0.6, dir);
    const lift = sc * 0.42;
    ctx.save();
    ctx.lineCap = 'round';
    // Two ribbons whip across the cut and cross at the knot — each a
    // deep bed with a colored body, per-beat seeded so every beat's
    // pair falls differently.
    const flow = Math.min(1, t / 0.45);
    for (const s of [-1, 1]) {
      const a0 = dir + s * (1.15 + rand() * 0.3);
      const from = pt(c, c.rPx * 0.35, a0);
      const ctrl = pt(c, c.rPx * (0.75 + rand() * 0.3), dir + s * 0.5);
      const toX = kP.x + Math.cos(dir) * c.rPx * 0.28 * flow;
      const toY = kP.y + Math.sin(dir) * c.rPx * 0.28 * flow * squash;
      // One silver, one dyed red — each a broad ribbon, not a thread.
      const body = s < 0 ? st.spark : '#c23a4e';
      const edge = s < 0 ? st.core : '#e0697a';
      ctx.globalAlpha = 0.6 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(5, sc * 0.16);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y - lift * 0.6);
      ctx.quadraticCurveTo(ctrl.x, ctrl.y - lift * 1.25, toX, toY - lift);
      ctx.stroke();
      ctx.globalAlpha = 0.95 * fade;
      ctx.strokeStyle = body;
      ctx.lineWidth = Math.max(3.5, sc * 0.105);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y - lift * 0.6);
      ctx.quadraticCurveTo(ctrl.x, ctrl.y - lift * 1.25, toX, toY - lift);
      ctx.stroke();
      // The ribbon's lit edge — the fold catching the noon.
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y - lift * 0.6 - sc * 0.03);
      ctx.quadraticCurveTo(ctrl.x, ctrl.y - lift * 1.25 - sc * 0.04, toX, toY - lift - sc * 0.03);
      ctx.stroke();
    }
    // THE KNOT: tied at the crossing, then dropped — it slides from
    // the tie height down to the dirt through the beat's back half.
    const dropK = t < 0.55 ? 0 : Math.min(1, (t - 0.55) / 0.3);
    const knotY = kP.y - lift * (1 - dropK);
    const knotA = t < 0.85 ? 1 : (1 - t) / 0.15;
    ctx.globalAlpha = 0.8 * knotA;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    burstStarPath(ctx, kP.x, knotY, sc * 0.23, sc * 0.1, 4, t * 2, squash);
    ctx.fill();
    ctx.globalAlpha = 0.95 * knotA;
    ctx.fillStyle = st.core;
    ctx.beginPath();
    burstStarPath(ctx, kP.x, knotY, sc * 0.17, sc * 0.07, 4, t * 2, squash);
    ctx.fill();
    ctx.restore();
    if (t < 0.2) c.glow(c.wx + Math.cos(dir) * c.radius * 0.6, c.wy + Math.sin(dir) * c.radius * 0.6, 0.7, 0.4);
  },
};

// ----------------------------------------------------------- twin_moons

/**
 * TWIN_MOONS — "the facing crescents."
 * Every wound the pair opens gets its sky: two small silver
 * crescents — one waxing, one waning, horns turned toward each
 * other — rise out of the strike in counter-orbit, stand facing
 * across the wound, and set again. The dirt keeps a moon-dust ring
 * where they stood, and silver falls on true arcs between them.
 */
const twin_moons: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x230d);
    // Moon-silver struck off the wound — unowned matter, true falls.
    for (let k = 0; k < 3; k++) {
      c.particles.burst(c.wx, c.wy, 1, [c.st.core, c.st.spark], {
        speed: 0.7 + rand() * 0.7, life: 0.9, size: 0.05,
        gravity: 0, shape: 'glint',
        z: 0.35, vz: 1.8 + rand() * 1.0, zg: 7, land: 'die',
        layer: 'world', shadow: 0.4,
      });
    }
    // The moon-dust ring: settled motes tracing the orbit's ground
    // track — silver fines, the dark cohort thinned so the ring reads
    // as dust and never as a pile.
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rand() * 0.3;
      lay(c, c.wx + Math.cos(a) * 0.48, c.wy + Math.sin(a) * 0.48,
        k % 2 === 0 ? c.st.spark : shade(c.st.deep, 14),
        { life: 8, size: 0.035 + rand() * 0.012, fade: shade(c.st.deep, 10), fadeAt: 0.55 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const R = Math.max(c.rPx, sc * 0.5);
    ctx.save();
    // The orbit track: a dashed silver ellipse — the two moons' path
    // printed on the dirt, deep bed under it.
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2.5, sc * 0.07);
    ctx.beginPath();
    ctx.ellipse(px, py, R * 0.92, R * 0.92 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    ctx.setLineDash([sc * 0.1, sc * 0.08]);
    ctx.lineDashOffset = -c.now / 40;
    ctx.beginPath();
    ctx.ellipse(px, py, R * 0.88, R * 0.88 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    c.glow(c.wx, c.wy, 0.8, 0.3 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0x2300d);
    const R = Math.max(c.rPx, sc * 0.5);
    const th0 = rand() * Math.PI * 2;
    // Rise fast, stand, set at the tail — the pair always leaves together.
    const riseK = t < 0.18 ? t / 0.18 : t > 0.72 ? Math.max(0, 1 - (t - 0.72) / 0.28) : 1;
    const rise = riseK * riseK * (3 - 2 * riseK);
    if (rise <= 0.02) return;
    const th = th0 + t * Math.PI * 0.9; // counter-orbit: half a turn over the life
    ctx.save();
    ctx.lineCap = 'round';
    for (const s of [0, 1]) {
      const a = th + s * Math.PI;
      const mx = px + Math.cos(a) * R * 0.95;
      const my = py + Math.sin(a) * R * 0.95 * 0.5 - sc * (0.35 + 0.55 * rise);
      const mr = sc * 0.17;
      // Horns face the sibling: the open side points across the wound.
      const open = Math.atan2(py - sc * 0.7 - my, px - mx);
      // Deep sleeve, then the lit lune — one waxes white, one wanes silver.
      ctx.globalAlpha = 0.55 * rise;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(3.5, sc * 0.1);
      ctx.beginPath();
      ctx.arc(mx, my, mr, open + 0.75, open - 0.75 + Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.95 * rise;
      ctx.strokeStyle = s === 0 ? st.core : st.spark;
      ctx.lineWidth = Math.max(2, sc * 0.055);
      ctx.beginPath();
      ctx.arc(mx, my, mr, open + 0.85, open - 0.85 + Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    // NOTHING ELSE FLOATS HERE. The sky over this wound holds exactly
    // two moons — the drifting minor glyphs that used to hang between
    // them read as clutter and are gone.
  },
};

// ---------------------------------------------------------- silver_reel

/**
 * SILVER_REEL — "the winding bobbin."
 * One cold circle, reeled IN: a silver thread lies in a spiral from
 * the ring's rim to a small standing bobbin at the caster's feet,
 * and each beat the live end winds inward onto the spool, frost
 * blooming as it takes up the slack. The spiral is rooted in the
 * WORLD, not the beat — every beat winds the same thread, and the
 * rime grains it sheds pile up along the same curve.
 */
const silver_reel: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x5ee1);
    frost.deployments.bloom!(m, c.wx, c.wy, { radius: Math.min(1.4, c.radius * 0.7), scale: 0.4, dur: 1.1 });
    // Rime shed onto the spiral itself: position-rooted stations, so
    // every beat thickens the SAME settled spiral.
    const rot = srand(posSeed(c.wx, c.wy, 0x5ee1b))() * Math.PI * 2;
    for (let k = 0; k < 4; k++) {
      const f = rand();
      const a = rot + f * Math.PI * 3.5;
      const rr = c.radius * (1.0 - 0.72 * f);
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        k % 2 === 0 ? c.st.core : c.st.mid,
        { life: 9, size: 0.035 + rand() * 0.012, fade: shade(c.st.deep, 12), fadeAt: 0.6 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rot = srand(posSeed(c.wx, c.wy, 0x5ee1b))() * Math.PI * 2;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const N = 14;
    // The live end travels inward through the beat.
    const head = Math.min(1, t / 0.8);
    ctx.save();
    ctx.lineCap = 'round';
    // The lying thread: full spiral, dim silver over a deep bed.
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalAlpha = (pass === 0 ? 0.5 : 0.7) * fade;
      ctx.strokeStyle = pass === 0 ? st.deep : st.mid;
      ctx.lineWidth = Math.max(pass === 0 ? 3 : 1.5, sc * (pass === 0 ? 0.08 : 0.035));
      ctx.beginPath();
      for (let k = 0; k <= N; k++) {
        const f = k / N;
        const a = rot + f * Math.PI * 3.5;
        const rr = rPx * (1.0 - 0.72 * f);
        const x = px + Math.cos(a) * rr;
        const y = py + Math.sin(a) * rr * squash;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // The take-up: a bright segment racing inward at the live point.
    const f0 = Math.max(0, head - 0.12);
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    for (let k = 0; k <= 4; k++) {
      const f = f0 + (head - f0) * (k / 4);
      const a = rot + f * Math.PI * 3.5;
      const rr = rPx * (1.0 - 0.72 * f);
      const x = px + Math.cos(a) * rr;
      const y = py + Math.sin(a) * rr * squash;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.6, 0.28 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const h = sc * 0.44;
    const w = Math.max(2.5, sc * 0.075);
    ctx.save();
    // THE BOBBIN: a small standing spindle at the caster's feet —
    // shadow flank, lit flank, foreshortened top — its thread wraps
    // thickening as the beat winds home.
    ctx.globalAlpha = 0.9 * fade;
    ctx.fillStyle = st.deep;
    ctx.fillRect(px - w, py - h, w, h);
    ctx.fillStyle = shade(st.mid, -4);
    ctx.fillRect(px, py - h, w, h);
    ctx.fillStyle = st.spark;
    ctx.beginPath();
    ctx.ellipse(px, py - h, w, w * 0.5 * squash + 1, 0, 0, Math.PI * 2);
    ctx.fill();
    // The wraps: two thread bands riding up the spindle with t — the
    // third only crowded the middle and is gone.
    const wound = Math.min(1, t / 0.8);
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.03);
    for (let k = 0; k < 2; k++) {
      const on = wound > (k + 1) / 2.6;
      if (!on) continue;
      const y = py - h * (0.3 + k * 0.3);
      ctx.globalAlpha = 0.85 * fade;
      ctx.beginPath();
      ctx.moveTo(px - w * 1.15, y);
      ctx.lineTo(px + w * 1.15, y);
      ctx.stroke();
    }
    // A glint rides the incoming thread just off the ground.
    if (t < 0.8) {
      const glX = px + Math.cos(c.now / 150) * sc * 0.3;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = st.core;
      ctx.fillRect(glX - sc * 0.03, py - h * 0.5 - sc * 0.03, sc * 0.06, sc * 0.06);
    }
    ctx.restore();
  },
};

// -------------------------------------------------------- matched_flame

/**
 * MATCHED_FLAME — "two wicks, one breath."
 * Three strikes, ~300 ms apart, each its own wire: the left wick
 * fans first, the right answers, and on the third both hands speak
 * at once and the pair IGNITES — a true fire burst where the wicks
 * meet. Heat builds strike over strike (the fan grows with the
 * beat's ordinal, read off bornAt), and every strike lays scorch
 * flecks that keep the chord warm after the breath is spent.
 */
const matched_flame: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0xf1a3e);
    const k3 = ((beatIndex(c, 300) % 3) + 3) % 3; // heat stage 0..2
    // The fans carry the whole read — they arrive at real size and the
    // heat ladder rides on top of that, never up from nothing.
    const heat = 0.62 + k3 * 0.2;
    const sides = k3 === 2 ? [-1, 1] : [k3 === 0 ? -1 : 1];
    for (const s of sides) {
      const a = c.dir + s * 0.42;
      fire.deployments.fan!(m, c.wx + Math.cos(a) * 0.2, c.wy + Math.sin(a) * 0.2, { dir: a, scale: heat });
    }
    // The third strike: both wicks touch and the breath catches.
    if (k3 === 2) {
      fire.deployments.burst!(m, c.wx + Math.cos(c.dir) * c.radius * 0.55, c.wy + Math.sin(c.dir) * c.radius * 0.55, { scale: 0.8 });
    }
    // Scorch flecks along the chord — the pair's cooling tally, ember
    // and warm ash only; nothing darker than the school's own deep.
    for (let k = 0; k < 2 + k3; k++) {
      const a = c.dir + (rand() - 0.5) * 1.1;
      const rr = c.radius * (0.4 + rand() * 0.45);
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        k % 2 === 0 ? '#d0752f' : shade(c.st.deep, 12),
        { life: 7.5, size: 0.04, fade: '#8a4c26', fadeAt: 0.4 });
    }
  },
  air(c) {
    const { ctx, st, t, sc, dir } = c;
    const k3 = ((beatIndex(c, 300) % 3) + 3) % 3;
    const grow = 1.15 + k3 * 0.3;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const sweep = Math.min(1, t / 0.35);
    const sides = k3 === 2 ? [-1, 1] : [k3 === 0 ? -1 : 1];
    ctx.save();
    // The wick: an area flame-lick riding the striking hand's arc —
    // deep sleeve, hot body, white heart — mirrored on the last beat.
    for (const s of sides) {
      const a = dir + s * (0.55 - sweep * 0.35);
      const base = pt(c, c.rPx * 0.68, a);
      base.y -= sc * 0.4;
      const h = sc * (0.5 + 0.3 * Math.sin(c.now / 80 + s)) * grow;
      const w = sc * 0.11 * grow;
      const leanX = Math.cos(a) * sc * 0.18;
      const wick = (mw: number, mh: number, col: string, al: number): void => {
        ctx.globalAlpha = al * fade;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(base.x - w * mw, base.y);
        ctx.lineTo(base.x + leanX * mh, base.y - h * mh);
        ctx.lineTo(base.x + w * mw, base.y);
        ctx.closePath();
        ctx.fill();
      };
      wick(1.35, 1.08, st.deep, 0.6);
      wick(1.0, 1.0, s < 0 ? st.mid : st.spark, 0.9);
      wick(0.45, 0.62, st.core, 0.95);
      // The wick's cut edge: the fan silhouette drawn, not just filled,
      // so the mirrored pair holds its shape against noon ground.
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      ctx.beginPath();
      ctx.moveTo(base.x - w, base.y);
      ctx.lineTo(base.x + leanX, base.y - h);
      ctx.lineTo(base.x + w, base.y);
      ctx.stroke();
    }
    ctx.restore();
    if (t < 0.25) {
      c.glow(c.wx + Math.cos(dir) * c.radius * 0.5, c.wy + Math.sin(dir) * c.radius * 0.5, 0.7 + k3 * 0.25, (0.35 + k3 * 0.15) * (1 - t / 0.25));
    }
  },
};

// ---------------------------------------------------------- stormstitch

/**
 * STORMSTITCH — "the suture staple."
 * The left throws, the right answers: every hop of the chain is a
 * seam, and the signature CLOSES it — a bright silver staple presses
 * down into the seam's midpoint, stitch-dashes running the hop line
 * like thread through skin, static riding the closed wound after.
 * Each hop leaves its staple lying in the dirt: a sutured trail.
 */
const stormstitch: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const mx = (c.wx + c.wx2) / 2;
    const my = (c.wy + c.wy2) / 2;
    // The hop's own voice, then the charge that stays on the seam.
    storm.deployments.arc!(m, c.wx, c.wy, { x2: c.wx2, y2: c.wy2, scale: 0.6 });
    storm.deployments.static!(m, mx, my, { radius: 0.4, scale: 0.4, dur: 1.2 });
    // The staple's record: two grains where it pressed, one either
    // side of the seam — hop after hop, the chain reads as sutured.
    const dx = c.wx2 - c.wx;
    const dy = c.wy2 - c.wy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    lay(c, mx + nx * 0.14, my + ny * 0.14, c.st.spark, { life: 8, size: 0.05 });
    lay(c, mx - nx * 0.14, my - ny * 0.14, c.st.spark, { life: 8, size: 0.05 });
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    const mx = px + dx * 0.5;
    const my = py + dy * 0.5;
    ctx.save();
    ctx.lineCap = 'butt';
    // The thread: stitch-dashes running the whole hop — the seam
    // being sewn shut, deep bed under the silver.
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(3, sc * 0.08);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px2, py2);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1.8, sc * 0.045);
    ctx.setLineDash([sc * 0.12, sc * 0.09]);
    ctx.lineDashOffset = -c.now / 25;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px2, py2);
    ctx.stroke();
    ctx.setLineDash([]);
    // THE STAPLE: pressed down into the midpoint through the young
    // life — a bridge across the seam with two bent legs, white over
    // deep, and a press-flash the frame it seats.
    const press = Math.min(1, t / 0.25);
    const seat = press * press;
    const liftY = sc * 0.55 * (1 - seat);
    const g = sc * 0.24; // half-bridge
    const leg = sc * 0.11;
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalAlpha = (pass === 0 ? 0.6 : 0.95) * fade;
      ctx.strokeStyle = pass === 0 ? st.deep : st.core;
      ctx.lineWidth = Math.max(pass === 0 ? 3.5 : 2, sc * (pass === 0 ? 0.09 : 0.05));
      ctx.beginPath();
      ctx.moveTo(mx + nx * g + ux * leg, my + ny * g + uy * leg - liftY);
      ctx.lineTo(mx + nx * g, my + ny * g - liftY);
      ctx.lineTo(mx - nx * g, my - ny * g - liftY);
      ctx.lineTo(mx - nx * g + ux * leg, my - ny * g + uy * leg - liftY);
      ctx.stroke();
    }
    if (press >= 1 && t < 0.4) {
      const k = (t - 0.25) / 0.15;
      ctx.globalAlpha = Math.max(0, 1 - k);
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, mx, my, sc * 0.16, sc * 0.06, 4, 0.6, c.squash);
      ctx.fill();
      c.glow((c.wx + c.wx2) / 2, (c.wy + c.wy2) / 2, 0.7, 0.5 * (1 - k));
    }
    ctx.restore();
  },
};

// ----------------------------------------------------------- mirrorfall

/**
 * MIRRORFALL — "the landing that breaks."
 * Only one of you is survivable. The leap SPLITS: the true streak
 * flies with a pale ghost peeling away beside it. Then two landings:
 * dust slams at yours — and at the ghost's point the mirror BREAKS,
 * frost shattering out of a cracked glass pane painted flat on the
 * dirt, glass glints spraying on true arcs and lying where they
 * bounce. A hairline fold-seam joins the two landings; the rime
 * fog pools at the one nobody stood up from. The school showpiece.
 */
const mirrorfall: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x3144a);
    const ma = srand(posSeed(c.wx, c.wy, 0x314))() * Math.PI * 2;
    const gx = c.wx + Math.cos(ma) * 1.15;
    const gy = c.wy + Math.sin(ma) * 1.15;
    // The true landing: honest weight.
    dust.deployments.slam!(m, c.wx, c.wy, { scale: 0.7 });
    // The ghost's landing: the mirror breaks cold.
    frost.deployments.shatter!(m, gx, gy, { scale: 0.7 });
    frost.deployments.fog!(m, gx, gy, { radius: 0.6, scale: 0.4, dur: 2.2 });
    // Glass off the broken pane: pale shards on true arcs, bouncing
    // and LYING there glinting — the school's own unowned matter.
    for (let k = 0; k < 7; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(gx, gy, 1, [c.st.core, c.st.spark, shade(c.st.mid, 8)], {
        speed: 1.2 + rand() * 1.4, life: 8, size: 0.038 + rand() * 0.016,
        gravity: 0, dir: a, spread: 0.5, shape: 'shard', spin: 8,
        z: 0.12, vz: 2.2 + rand() * 1.8, zg: 8.5, land: 'bounce', bounce: 0.4,
        layer: 'world', flicker: 0.45, fade: c.st.spark, fadeAt: 0.5,
      });
    }
    // The fold-seam's record: grains strung between the two landings.
    for (let k = 0; k < 5; k++) {
      const f = (k + 0.5) / 5;
      lay(c, c.wx + Math.cos(ma) * 1.15 * f, c.wy + Math.sin(ma) * 1.15 * f,
        k % 2 === 0 ? c.st.spark : shade(c.st.deep, 12), { life: 8.5, size: 0.042 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    if (c.kind !== 'blast') return;
    const ma = srand(posSeed(c.wx, c.wy, 0x314))() * Math.PI * 2;
    const gP = pt(c, 1.15 * sc, ma);
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE BROKEN PANE: a jagged glass sheet lying flat at the ghost
    // point. ONE faint wash under ONE hard rim — the story is the
    // broken edge and the cracks, never a stack of grey sheets.
    ctx.globalAlpha = 0.2 * fade;
    ctx.fillStyle = shade(st.mid, 10);
    ctx.beginPath();
    jaggedRingPath(ctx, gP.x, gP.y, sc * 0.64, squash, 9, 0.22, ma, c.seed ^ 3);
    ctx.fill();
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(2.5, sc * 0.055);
    ctx.beginPath();
    jaggedRingPath(ctx, gP.x, gP.y, sc * 0.64, squash, 9, 0.22, ma, c.seed ^ 3);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    for (let k = 0; k < 3; k++) {
      const a = ma + k * 2.1;
      ctx.beginPath();
      boltPath(ctx, gP.x, gP.y, gP.x + Math.cos(a) * sc * 0.55, gP.y + Math.sin(a) * sc * 0.55 * squash, c.seed ^ (k + 7), sc * 0.06);
      ctx.stroke();
    }
    // The true landing: a modest press read through its RIM — the dust
    // already spoke, so the ground only needs the ring it left.
    ctx.globalAlpha = 0.18 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.3, sc * 0.3 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = shade(st.deep, 10);
    ctx.lineWidth = Math.max(2.5, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.3, sc * 0.3 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // The fold: one hairline seam joining the two landings.
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1.5, sc * 0.03);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(gP.x, gP.y);
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx, c.wy, 0.9, 0.35 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2, age } = c;
    ctx.save();
    ctx.lineCap = 'round';
    if (c.kind === 'dash') {
      // THE SPLIT: the true streak arcs the leap while a pale ghost
      // peels away toward its own landing, growing apart mid-flight.
      const ma = srand(posSeed(c.wx2, c.wy2, 0x314))() * Math.PI * 2;
      const fx = px + (px2 - px) * t;
      const fy = py + (py2 - py) * t - sc * Math.sin(t * Math.PI) * 1.3;
      const sep = 0.25 + 0.75 * t;
      const gx = fx + Math.cos(ma) * 1.15 * sc * sep;
      const gy = fy + Math.sin(ma) * 1.15 * sc * squash * sep;
      const streak = (x: number, y: number, col: string, al: number, lw: number): void => {
        ctx.globalAlpha = al;
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(x - (px2 - px) * 0.09, y - (py2 - py) * 0.09 + sc * 0.14);
        ctx.lineTo(x, y);
        ctx.stroke();
      };
      streak(fx, fy, st.deep, 0.6, Math.max(4, sc * 0.13));
      streak(fx, fy, st.core, 0.95, Math.max(2.2, sc * 0.06));
      streak(gx, gy, shade(st.mid, 14), 0.5, Math.max(2, sc * 0.05));
      // Mirror-seam ticks between the two selves.
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      ctx.beginPath();
      ctx.moveTo((fx + gx) / 2 - sc * 0.05, (fy + gy) / 2);
      ctx.lineTo((fx + gx) / 2 + sc * 0.05, (fy + gy) / 2);
      ctx.stroke();
      if (Math.random() < c.frameDt * 12) {
        c.particles.burst(c.wx + (c.wx2 - c.wx) * t, c.wy + (c.wy2 - c.wy) * t, 1, [st.core, st.spark], {
          speed: 0.4, life: 0.4, size: 0.05, gravity: 0, shape: 'glint',
          z: Math.sin(t * Math.PI) * 1.3, vz: -0.4, zg: 0, land: 'die', layer: 'world', shadow: 0,
        });
      }
      ctx.restore();
      return;
    }
    if (c.kind !== 'blast') { ctx.restore(); return; }
    // The ghost's last instant: a standing pale lens over the pane
    // that CRACKS and is gone — offset ~80 ms after the true landing.
    const ma = srand(posSeed(c.wx, c.wy, 0x314))() * Math.PI * 2;
    if (age > 60 && age < 240) {
      const k = (age - 60) / 180;
      const gP = pt(c, 1.15 * sc, ma);
      const H = sc * 0.95;
      ctx.globalAlpha = 0.6 * (1 - k);
      ctx.strokeStyle = shade(st.mid, 16);
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      ctx.beginPath();
      ctx.ellipse(gP.x, gP.y - H * 0.55, sc * 0.26, H * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.9 * (1 - k);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      boltPath(ctx, gP.x - sc * 0.16, gP.y - H, gP.x + sc * 0.14, gP.y - sc * 0.08, c.seed ^ 0x1f, sc * 0.09);
      ctx.stroke();
      if (age < 120) c.glow(c.wx + Math.cos(ma) * 1.15, c.wy + Math.sin(ma) * 1.15, 1.0, 0.7 * (1 - k));
    }
    if (t < 0.12) c.glow(c.wx, c.wy, 1.2, 0.7 * (1 - t / 0.12));
    ctx.restore();
  },
};

// ------------------------------------------------------------ the_weave

/**
 * THE_WEAVE — "warp and weft."
 * The cut is a loom. Each beat lays thread ONE way — warp along the
 * aim on even-seeded beats, weft across it on odd — a shuttle glint
 * running the fresh thread while the other direction's threads lie
 * dim beneath, already woven. The lattice itself is rooted in the
 * world, so beat over beat the same cloth thickens; its settled
 * grains keep the crossing points long after the loom stops.
 */
const the_weave: AbilitySig = {
  spawn(c) {
    const rand = srand(posSeed(c.wx, c.wy, 0xeae3));
    const parity = c.seed & 1;
    const ca = Math.cos(c.dir);
    const sa = Math.sin(c.dir);
    const qx = c.wx + ca * c.radius * 0.62;
    const qy = c.wy + sa * c.radius * 0.62;
    const h = c.radius * 0.5;
    // The cloth's record: grains at the lattice's crossing points —
    // world-rooted, so every beat presses the same intersections.
    for (let i = 0; i < 3; i++) {
      const u = (rand() - 0.5) * 2 * h * 0.8;
      const v = (rand() - 0.5) * 2 * h * 0.8;
      lay(c, qx + ca * u - sa * v, qy + sa * u + ca * v,
        (i + parity) % 2 === 0 ? c.st.spark : c.st.mid,
        { life: 9, size: 0.05, fade: shade(c.st.deep, 12), fadeAt: 0.6 });
    }
    // The shuttle enters with a snip of silver.
    c.particles.burst(qx - sa * h * (parity === 0 ? 1 : 0) - ca * h * (parity === 1 ? 1 : 0), qy + ca * h * (parity === 0 ? 1 : 0) - sa * h * (parity === 1 ? 1 : 0), 3, [c.st.core, c.st.spark], {
      speed: 0.5, life: 0.5, size: 0.055, gravity: 0, shape: 'glint',
      z: 0.3, vz: 0.6, zg: 3, land: 'die', layer: 'world', shadow: 0,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    const rand = srand(posSeed(c.wx, c.wy, 0xeae30));
    const parity = c.seed & 1;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    // Screen axes of the loom patch (world-plane, so both squash).
    const ux = Math.cos(dir);
    const uy = Math.sin(dir) * squash;
    const vx = -Math.sin(dir);
    const vy = Math.cos(dir) * squash;
    const qx = px + Math.cos(dir) * rPx * 0.62;
    const qy = py + Math.sin(dir) * rPx * 0.62 * squash;
    const h = rPx * 0.55;
    // Three offsets per direction, hashed once — the standing lattice.
    const offs: number[] = [(rand() - 0.5) * 1.3, (rand() - 0.5) * 1.3, (rand() - 0.5) * 1.3];
    const run = Math.min(1, t / 0.55);
    ctx.save();
    ctx.lineCap = 'butt';
    for (let d = 0; d < 2; d++) {
      const live = d === parity;
      // Warp runs along u (thread axis v-offset); weft the reverse.
      const ax = d === 0 ? ux : vx;
      const ay = d === 0 ? uy : vy;
      const ox = d === 0 ? vx : ux;
      const oy = d === 0 ? vy : uy;
      for (let i = 0; i < 3; i++) {
        const o = offs[i]! * h;
        const cxx = qx + ox * o;
        const cyy = qy + oy * o;
        const ext = live && i === 1 ? h * run : h; // the fresh thread pays out
        // Every thread gets a bed — the woven direction is DIM, never
        // absent; a lattice you cannot see is not a lattice.
        ctx.globalAlpha = (live ? 0.55 : 0.4) * fade;
        ctx.strokeStyle = st.deep;
        ctx.lineWidth = Math.max(2.5, sc * (live ? 0.095 : 0.075));
        ctx.beginPath();
        ctx.moveTo(cxx - ax * ext, cyy - ay * ext);
        ctx.lineTo(cxx + ax * ext, cyy + ay * ext);
        ctx.stroke();
        ctx.globalAlpha = (live ? 0.95 : 0.8) * fade;
        ctx.strokeStyle = live ? (i === 1 ? st.core : st.spark) : st.mid;
        ctx.lineWidth = Math.max(2.5, sc * (live ? 0.06 : 0.045));
        ctx.beginPath();
        ctx.moveTo(cxx - ax * ext, cyy - ay * ext);
        ctx.lineTo(cxx + ax * ext, cyy + ay * ext);
        ctx.stroke();
      }
    }
    // THE WHOLE CLOTH: as the beat closes, the finished patch answers
    // all at once — one bright frame around everything woven so far.
    if (t > 0.82) {
      const fl = 1 - (t - 0.82) / 0.18;
      ctx.globalAlpha = 0.85 * fl;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.5, sc * 0.055);
      ctx.beginPath();
      ctx.moveTo(qx - ux * h - vx * h, qy - uy * h - vy * h);
      ctx.lineTo(qx + ux * h - vx * h, qy + uy * h - vy * h);
      ctx.lineTo(qx + ux * h + vx * h, qy + uy * h + vy * h);
      ctx.lineTo(qx - ux * h + vx * h, qy - uy * h + vy * h);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.62, c.wy + Math.sin(dir) * c.radius * 0.62,
      0.8, (t > 0.82 ? 0.55 * (1 - (t - 0.82) / 0.18) : 0.3) * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    const rand = srand(posSeed(c.wx, c.wy, 0xeae30));
    const parity = c.seed & 1;
    // The shuttle rides the middle fresh thread, a lens-shaped body
    // with the thread paying out behind it.
    const ux = Math.cos(dir);
    const uy = Math.sin(dir) * squash;
    const vx = -Math.sin(dir);
    const vy = Math.cos(dir) * squash;
    const qx = px + Math.cos(dir) * rPx * 0.62;
    const qy = py + Math.sin(dir) * rPx * 0.62 * squash;
    const h = rPx * 0.55;
    rand(); // discard offset 0 — the shuttle rides the middle thread
    const midOff = rand();
    const o = (midOff - 0.5) * 1.3 * h;
    const ax = parity === 0 ? ux : vx;
    const ay = parity === 0 ? uy : vy;
    const ox = parity === 0 ? vx : ux;
    const oy = parity === 0 ? vy : uy;
    const run = Math.min(1, t / 0.55);
    const sx = qx + ox * o + ax * (run * 2 - 1) * h;
    const sy = qy + oy * o + ay * (run * 2 - 1) * h - sc * 0.16;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    ctx.save();
    // The shuttle is the eye's handle on the whole loom — it carries a
    // hard bright body and a struck glint, never a grey lozenge.
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(sx, sy, sc * 0.17, sc * 0.075, Math.atan2(ay, ax), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.ellipse(sx, sy, sc * 0.115, sc * 0.045, Math.atan2(ay, ax), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = st.core;
    ctx.beginPath();
    burstStarPath(ctx, sx, sy, sc * 0.13, sc * 0.045, 4, 0.4, squash);
    ctx.fill();
    // The payout: a hairline from the shuttle down to its thread.
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(2.5, sc * 0.04);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx, sy + sc * 0.16);
    ctx.stroke();
    ctx.restore();
  },
};

// ------------------------------------------------------- first_and_last

/**
 * FIRST_AND_LAST — "the door-seam."
 * The door opens, the door closes — inside one 300 ms arc. The first
 * cut opens a standing seam of light past the aim: two door-edges
 * part, brightness spills through onto the ground. The last cut is
 * the same arc's second half: the edges SLAM back, converging
 * streaks rush the seam, and it shuts to a single dark line with a
 * white hairline heart. A threshold of settled grains marks where
 * the door stood — the line every execute walks somebody across.
 */
const first_and_last: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xd005);
    const sx = c.wx + Math.cos(c.dir) * c.radius * 0.7;
    const sy = c.wy + Math.sin(c.dir) * c.radius * 0.7;
    const nx = -Math.sin(c.dir);
    const ny = Math.cos(c.dir);
    // Light thrown through the opening door: brief rising glints.
    for (let k = 0; k < 4; k++) {
      c.particles.burst(sx + nx * (rand() - 0.5) * 0.5, sy + ny * (rand() - 0.5) * 0.5, 1, [c.st.core, c.st.spark], {
        speed: 0.4, life: 0.7, size: 0.055, gravity: 0, shape: 'glint',
        z: 0.2 + rand() * 0.8, vz: 0.8, zg: 0, land: 'none', layer: 'world', shadow: 0,
      });
    }
    // THE THRESHOLD: grains laid in a clean line across the aim —
    // the mark of where the door stood, long after it shut.
    for (let k = 0; k < 7; k++) {
      const f = (k / 6 - 0.5) * 1.15;
      lay(c, sx + nx * f, sy + ny * f,
        k % 2 === 0 ? c.st.core : shade(c.st.deep, 6),
        { life: 9, size: 0.05, fade: shade(c.st.mid, -12), fadeAt: 0.5 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir } = c;
    const S = pt(c, c.rPx * 0.7, dir);
    // The spill: light through the open door, thrown beyond it —
    // grows with the gap, dies as the door slams.
    const gap = t < 0.45 ? Math.sin((t / 0.45) * Math.PI * 0.5) : Math.max(0, 1 - (t - 0.45) / 0.3);
    if (gap <= 0.02) return;
    ctx.save();
    const reach = sc * (0.6 + 0.5 * gap);
    const half = sc * 0.38 * gap;
    const ex = Math.cos(dir);
    const ey = Math.sin(dir) * squash;
    const nx = -Math.sin(dir);
    const ny = Math.cos(dir) * squash;
    ctx.globalAlpha = 0.3 * gap;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.moveTo(S.x + nx * half * 0.5, S.y + ny * half * 0.5);
    ctx.lineTo(S.x + ex * reach + nx * half, S.y + ey * reach + ny * half);
    ctx.lineTo(S.x + ex * reach - nx * half, S.y + ey * reach - ny * half);
    ctx.lineTo(S.x - nx * half * 0.5, S.y - ny * half * 0.5);
    ctx.closePath();
    ctx.fill();
    // THE SPILL AT THE SILL: a small pool of light on the boards right
    // where the door stands open — the read that says "doorway."
    ctx.globalAlpha = 0.2 * gap;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.ellipse(S.x, S.y, sc * 0.34 * gap + sc * 0.06, (sc * 0.34 * gap + sc * 0.06) * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.6 * gap;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2.5, sc * 0.05);
    ctx.beginPath();
    ctx.moveTo(S.x, S.y);
    ctx.lineTo(S.x + ex * reach, S.y + ey * reach);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    const S = pt(c, rPx * 0.7, dir);
    const H = sc * 1.45;
    const nx = -Math.sin(dir);
    const ny = Math.cos(dir) * squash;
    // Gap: opens through the first half, slams shut by t=0.78.
    const gap = t < 0.45 ? Math.sin((t / 0.45) * Math.PI * 0.5) : Math.max(0, 1 - ((t - 0.45) / 0.33) * ((t - 0.45) / 0.33) * 3);
    const shut = t >= 0.72;
    ctx.save();
    ctx.lineCap = 'butt';
    // The opening crescent: the first cut, bright, young life only.
    if (t < 0.3) {
      const sw = Math.min(1, t / 0.3) * 1.4;
      ctx.globalAlpha = 0.9 * (1 - t / 0.3 * 0.4);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.5, sc * 0.065);
      ctx.beginPath();
      ctx.ellipse(px, py - sc * 0.38, rPx * 0.8, rPx * 0.8 * squash, 0, dir - 0.7, dir - 0.7 + sw);
      ctx.stroke();
    }
    // THE DOOR: two edge verticals parted by the gap, the brightness
    // standing between them — then the dark of the shut.
    const w = sc * 0.3 * Math.max(gap, 0.04);
    // THE FRAME: two faint jambs standing off either side of the seam,
    // open or shut. A doorway needs its posts to read as a doorway.
    const jamb = sc * 0.42;
    ctx.globalAlpha = 0.4 * (t < 0.9 ? 1 : (1 - t) / 0.1);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2.5, sc * 0.05);
    ctx.beginPath();
    ctx.moveTo(S.x - jamb, S.y);
    ctx.lineTo(S.x - jamb, S.y - H * 0.92);
    ctx.moveTo(S.x + jamb, S.y);
    ctx.lineTo(S.x + jamb, S.y - H * 0.92);
    ctx.stroke();
    if (!shut) {
      // The light between the edges: a thin wash, brighter low.
      ctx.globalAlpha = 0.22 * Math.max(gap, 0.1);
      ctx.fillStyle = st.mid;
      ctx.fillRect(S.x - w + nx * 0, S.y - H, w * 2, H);
      ctx.globalAlpha = 0.85 * Math.max(gap, 0.1);
      ctx.fillStyle = st.core;
      ctx.fillRect(S.x - w * 0.4, S.y - H * 0.96, w * 0.8, H * 0.96);
      // The edges: deep jambs either side of the gap.
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(2.5, sc * 0.07);
      ctx.beginPath();
      ctx.moveTo(S.x - w - nx * sc * 0.03, S.y - ny * sc * 0.03);
      ctx.lineTo(S.x - w - nx * sc * 0.03, S.y - H);
      ctx.moveTo(S.x + w + nx * sc * 0.03, S.y + ny * sc * 0.03);
      ctx.lineTo(S.x + w + nx * sc * 0.03, S.y - H);
      ctx.stroke();
    } else {
      // SHUT: one dark line with a white hairline heart — the last
      // light pinched inside the seam.
      const k = Math.min(1, (t - 0.72) / 0.1);
      const die = t < 0.85 ? 1 : (1 - t) / 0.15;
      ctx.globalAlpha = 0.95 * die;
      ctx.strokeStyle = '#241a2e';
      ctx.lineWidth = Math.max(3.5, sc * 0.1);
      ctx.beginPath();
      ctx.moveTo(S.x, S.y);
      ctx.lineTo(S.x, S.y - H);
      ctx.stroke();
      ctx.globalAlpha = 0.9 * (1 - k * 0.6) * die;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.2, sc * 0.02);
      ctx.beginPath();
      ctx.moveTo(S.x, S.y - H * 0.06);
      ctx.lineTo(S.x, S.y - H * 0.94);
      ctx.stroke();
      if (k < 0.6) c.glow(c.wx + Math.cos(dir) * c.radius * 0.7, c.wy + Math.sin(dir) * c.radius * 0.7, 1.1, 0.7 * (1 - k / 0.6));
    }
    // The slam-rush: streaks converging on the seam in the closing act.
    if (t > 0.5 && t < 0.78) {
      const k = (t - 0.5) / 0.28;
      ctx.globalAlpha = 0.8 * Math.sin(k * Math.PI);
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      for (let i = 0; i < 4; i++) {
        const side = i % 2 === 0 ? 1 : -1;
        const yy = S.y - H * (0.2 + (i / 4) * 0.65);
        const far = sc * 0.55 * (1 - k);
        ctx.beginPath();
        ctx.moveTo(S.x + side * (far + sc * 0.18), yy);
        ctx.lineTo(S.x + side * far, yy);
        ctx.stroke();
      }
    }
    // The slam's dark breath: a pinch of grains at the shut moment.
    if (t > 0.72 && t < 0.82 && Math.random() < c.frameDt * 80) {
      c.particles.burst(c.wx + Math.cos(dir) * c.radius * 0.7, c.wy + Math.sin(dir) * c.radius * 0.7, 2, ['#241a2e', st.deep], {
        speed: 0.9, life: 0.5, size: 0.06, gravity: 0, shape: 'square',
        z: 0.6, vz: 0.4, zg: 3, land: 'die', layer: 'world', shadow: 0,
      });
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- hummingbird

/**
 * HUMMINGBIRD — "three ghosts deep."
 * Count the visits. Deliberately the LIGHTEST signature of the
 * sixty: each wound takes a paired needle-blur — two hairline
 * streaks, each trailing three fading afterimages — and one blink
 * of iridescent flutter, wings too fast to hold a color. Two nectar
 * motes drift up; one grain stays. Restraint is the craft.
 */
const hummingbird: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x4b12d);
    // Two nectar motes, and the single settled grain of the visit.
    c.particles.burst(c.wx, c.wy, 2, [c.st.spark, c.st.core], {
      speed: 0.2, life: 1.1, size: 0.045, gravity: -0.3, shape: 'mote', wobble: 0.4,
      z: 0.4, vz: 0.3, zg: 0, land: 'none', layer: 'world', shadow: 0,
    });
    lay(c, c.wx + (rand() - 0.5) * 0.2, c.wy + (rand() - 0.5) * 0.2, c.st.spark, { life: 6, size: 0.04 });
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    if (t > 0.55) return;
    const rand = srand(c.seed ^ 0x4b12e);
    const a = rand() * Math.PI * 2; // each visit comes its own way
    const fade = 1 - t / 0.55;
    const lift = sc * 0.4;
    ctx.save();
    ctx.lineCap = 'round';
    // The paired needles: two hairlines through the wound at a slight
    // vee, each with three ghosts falling back along the flight line.
    // The ghosts LIGHTEN as they age — nothing here darkens toward a
    // blot; the whole visit is a bright scratch on the air.
    for (const s of [-1, 1]) {
      const na = a + s * 0.14;
      const ex = Math.cos(na);
      const ey = Math.sin(na) * 0.55;
      for (let g = 3; g >= 0; g--) {
        const back = g * sc * 0.22;
        const hx = px + ex * sc * 0.3 - ex * back;
        const hy = py - lift + ey * sc * 0.3 - ey * back + s * sc * 0.05;
        ctx.globalAlpha = fade * (g === 0 ? 0.95 : 0.34 - g * 0.07);
        ctx.strokeStyle = g === 0 ? st.core : st.spark;
        ctx.lineWidth = Math.max(1.2, sc * 0.026);
        ctx.beginPath();
        ctx.moveTo(hx - ex * sc * 0.3, hy - ey * sc * 0.3);
        ctx.lineTo(hx, hy);
        ctx.stroke();
      }
    }
    // The flutter: ONE blink of wing-blur at the wound, strobing on the
    // wall clock — a single hairline sliver, never a second slab beside
    // it. Restraint is the craft.
    const wingA = 0.5 + 0.5 * Math.sin(c.now / 24);
    const ws = sc * 0.075;
    ctx.globalAlpha = fade * 0.6 * wingA;
    ctx.fillStyle = st.core;
    ctx.fillRect(px - ws * 0.7, py - lift - ws * 0.35, ws * 1.4, ws * 0.7);
    ctx.restore();
    if (t < 0.1) c.glow(c.wx, c.wy, 0.5, 0.2);
  },
};

/**
 * The twin school's SECOND BREATH wave — merged into the master
 * SIGNATURES table in fxSignatures.ts.
 */
export const DUALWIELD_BREATH_SIGS: Record<string, AbilitySig> = {
  two_bells,
  ribbonwork,
  twin_moons,
  silver_reel,
  matched_flame,
  stormstitch,
  mirrorfall,
  the_weave,
  first_and_last,
  hummingbird,
};
