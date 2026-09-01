/**
 * THE SECOND BREATH SPEAKS — the combat wave.
 *
 * Ten set-pieces for the veteran's between-rung breath arts, five
 * casted and five channeled. Same binding laws as every wave (hard
 * edges, save/restore hygiene, squash on ground y-radii, srand
 * geometry with frameDt-gated emission, ≤ ~60 path ops per hook per
 * frame), and the school doctrine on top:
 *
 *  ROAD-WORN GRIT. Combat's breath arts are dust, iron, and the
 *  veteran's economy — nothing ornamental, everything paid for. The
 *  strike is plain and the aftermath is honest: junk lies where it
 *  fell, roads stay rutted, chalk stays on the slate. Iron shards,
 *  chalk, and copper glints are the school's own unowned matter;
 *  dust, storm, water, blood, and frost speak only through the
 *  matter library (ONE-VOICE LAW).
 *
 * Channel signatures are ONE BEAT'S WORTH: the server re-broadcasts
 * the wire per beat with a fresh seed, so geometry that must hold
 * still or accumulate derives from POSITION, never the beat's seed —
 * and cross-beat growth lives in laid grains, because the world
 * keeps what landed.
 *
 * No signature here shares a centerpiece with any other, in this
 * file or any other wave — loose_iron owns the camp-iron wounds, so
 * thrown_iron's bundle is the junk that ARRIVES and LIES; stormcall
 * owns the sky, so old_thunder's bolt never gets off the ground.
 */

import { boltPath, burstStarPath, jaggedRingPath, srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { dust, storm, water, blood, frost, asMatter } from './matter/index.js';
import { shade } from './tint.js';

// The school's unowned matter — deliberate literals, per law 8.
const IRON_LIT = '#c9ced8';
const IRON = '#8a8f98';
const RUST = '#7a5a44';
const COPPER_LIT = '#e89a5a';
const COPPER = '#b8703a';
const COPPER_DARK = '#7a4a28';
const CHALK = '#f2efe6';
const CHALK_BODY = '#d9d5c8';
const CHALK_DUST = '#a9a598';
const SLATE = '#3a3630';

/** Screen point r px from the heart along ground angle a. */
function pt(c: SigCtx, r: number, a: number): { x: number; y: number } {
  return { x: c.px + Math.cos(a) * r, y: c.py + Math.sin(a) * r * c.squash };
}

/**
 * THE LASTING MARK — one settled grain laid deliberately at a world
 * point (near-still, ground layer, long life). Every aftermath in
 * this file goes through here so the budget stays legible.
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
 * Channel-stable seed: derived from where the wire stands, not which
 * beat it is — channels root the caster (and ground_aoe its target),
 * so this holds still while the beats re-roll their own seeds.
 */
function posSeed(c: SigCtx, salt: number): number {
  return (Math.floor(c.wx * 8) * 73) ^ (Math.floor(c.wy * 8) * 151) ^ salt;
}

// -------------------------------------------------------- measured_blow

/**
 * MEASURED_BLOW — "measured twice, paid once."
 * The whole cast is carpentry: the arc is rehearsed as two thin
 * dashed ghost measures — traced quickly, held faint, costing
 * nothing — and only the third pass spends the budget: one heavy
 * filled wavefront rolling to the rim with a hard star at the chord.
 * The ghosts outlast the strike by a breath (the measures close
 * last), and the ground keeps one modest dent of settled crumb
 * exactly where the stroke said it would land.
 */
const measured_blow: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x3ea51);
    const hx = c.wx + Math.cos(c.dir) * c.radius * 0.7;
    const hy = c.wy + Math.sin(c.dir) * c.radius * 0.7;
    dust.deployments.gouge!(m, hx, hy, { dir: c.dir, scale: 0.5 });
    // THE DENT: a single short arc of rammed crumb at the chord — one
    // mark, no scatter. A measured blow wastes nothing, even in debris.
    for (let k = 0; k < 6; k++) {
      const a = c.dir + (k / 5 - 0.5) * 0.5;
      const rr = c.radius * (0.72 + (rand() - 0.5) * 0.08);
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        k % 3 === 0 ? shade(c.st.mid, -8) : c.st.deep,
        { life: 8.5, size: 0.05 + rand() * 0.03 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, px, py, rPx } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const a0 = dir - 0.82;
    const a1 = dir + 0.82;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE TWO MEASURES: thin dashed ghost arcs at two radii, each
    // traced fast and then held faint — the stroke rehearsed twice.
    const ghost = (rr: number, at: number, dash: number): void => {
      const k = Math.max(0, Math.min(1, (t - at) / 0.1));
      if (k <= 0) return;
      ctx.globalAlpha = 0.55 * fade * (t < 0.32 ? 1 : 0.45);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.setLineDash([sc * dash, sc * 0.08]);
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, a0, a0 + (a1 - a0) * k);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    ghost(rPx * 0.9, 0, 0.16);
    ghost(rPx * 0.76, 0.1, 0.11);
    // THE ONE TRUE FRONT: the third pass is the payment — a filled
    // crescent band rolling out to the rim, deep bed under a packed
    // body under a white leading crest.
    if (t >= 0.32) {
      const k = Math.min(1, (t - 0.32) / 0.26);
      const e = k * k * (3 - 2 * k);
      const rr = rPx * (0.3 + 0.68 * e);
      const w = sc * (0.3 - 0.12 * e);
      ctx.globalAlpha = 0.75 * fade;
      ctx.strokeStyle = shade(st.deep, -10);
      ctx.lineWidth = Math.max(3.5, w * 1.5);
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, a0, a1);
      ctx.stroke();
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.5, Math.max(sc * 0.06, w * 0.95));
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, a0, a1);
      ctx.stroke();
      ctx.globalAlpha = 0.95 * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      ctx.beginPath();
      ctx.ellipse(px, py, rr + w * 0.45, (rr + w * 0.45) * squash, 0, a0 + 0.08, a1 - 0.08);
      ctx.stroke();
      c.glow(c.wx + Math.cos(dir) * c.radius * 0.5, c.wy + Math.sin(dir) * c.radius * 0.5, 0.9, 0.45 * fade);
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    // The payment flash: one hard star at the chord the instant the
    // true front lands — the ghosts never flash, only what costs.
    if (t >= 0.32 && t < 0.5) {
      const k = 1 - (t - 0.32) / 0.18;
      const p = pt(c, rPx * 0.72, dir);
      ctx.save();
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, p.x, p.y - sc * 0.12, sc * (0.2 + 0.14 * (1 - k)), sc * 0.08, 4, dir, squash);
      ctx.fill();
      ctx.restore();
    }
    // A few clean glints hop off the strike — gated, brief.
    if (t >= 0.32 && t < 0.6 && Math.random() < c.frameDt * 16) {
      const a = dir + (Math.random() - 0.5) * 1.2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.7, c.wy + Math.sin(a) * c.radius * 0.7, 1, [st.spark, st.core], {
        speed: 0.7, life: 0.45, size: 0.06, gravity: 0, shape: 'glint',
        z: 0.3, vz: 1.2, zg: 6, land: 'die', layer: 'world', shadow: 0,
      });
    }
  },
};

// ------------------------------------------------------------ drumbeat

/**
 * DRUMBEAT — "the drumhead."
 * The ground is the skin. Each beat strikes it and the whole circle
 * FLEXES — three taut hoops bowing outward on one damped wave, still
 * again by mid-beat — while loose grit hops off the struck surface
 * and heel dust kicks at the drummer's stance (position-hashed, so
 * the feet never wander between beats). Every beat rams a few more
 * grains into the same circle: by the last measure the yard wears a
 * tamped-earth round that outlives the song by ten seconds.
 */
const drumbeat: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0xd2b3a7);
    const hash = srand(posSeed(c, 0xd2b3a7));
    // Heel dust on the held stance — the drummer keeps time with the
    // feet, and the feet do not move.
    const stance = hash() * Math.PI * 2;
    for (let s = 0; s < 2; s++) {
      const a = stance + (s === 0 ? 0.5 : Math.PI - 0.5);
      dust.deployments.kick!(m, c.wx + Math.cos(a) * 0.22, c.wy + Math.sin(a) * 0.22, { scale: 0.45 });
    }
    dust.deployments.skirt!(m, c.wx, c.wy, { radius: 0.4, scale: 0.5, dur: 0.4 });
    // TAMPED EARTH: the world keeps what landed — each beat's grains
    // join the last beat's, and the circle fills in as the cadence runs.
    for (let k = 0; k < 7; k++) {
      const a = rand() * Math.PI * 2;
      const rr = c.radius * (0.8 + (rand() - 0.5) * 0.1);
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        k % 3 === 0 ? shade(c.st.mid, -6) : c.st.deep,
        { life: 9, size: 0.05 + rand() * 0.03 });
    }
    c.glow(c.wx, c.wy, c.radius * 0.7, 0.4);
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    // The flex: one damped wave through the skin, struck at t=0.
    const wave = Math.exp(-t * 5.5) * Math.sin(t * Math.PI * 6);
    ctx.save();
    ctx.lineCap = 'butt';
    for (let i = 0; i < 3; i++) {
      const f = [0.42, 0.68, 0.94][i]!;
      const bow = 1 + wave * 0.07 * (1.3 - Math.abs(f - 0.6));
      const rr = rPx * f * bow;
      ctx.globalAlpha = (i === 2 ? 0.7 : 0.5) * fade;
      ctx.strokeStyle = shade(st.deep, -8);
      ctx.lineWidth = Math.max(3, sc * (0.1 - i * 0.015));
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = (i === 2 ? 0.9 : 0.7) * fade;
      ctx.strokeStyle = i === 1 ? st.mid : shade(st.mid, 8);
      ctx.lineWidth = Math.max(1.8, sc * 0.045);
      ctx.beginPath();
      ctx.ellipse(px, py, rr * 0.97, rr * 0.97 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The stroke point: hot only in the strike window.
    const hot = Math.max(0, 1 - t / 0.2);
    if (hot > 0) {
      ctx.globalAlpha = 0.9 * hot;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.12 * (1 + (1 - hot) * 0.6), rPx * 0.12 * (1 + (1 - hot) * 0.6) * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, (0.15 + 0.35 * hot) * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xd2b3a8);
    ctx.save();
    // Loose grit hops off the struck skin: eight seeded specks, each
    // thrown at the beat and falling back on its own little arc —
    // painted, so the drum can afford them every single beat.
    for (let i = 0; i < 8; i++) {
      const a = rand() * Math.PI * 2;
      const rr = rPx * (0.2 + rand() * 0.7);
      const vz0 = 0.5 + rand() * 0.6; // tiles/s
      const tt = t * 0.68; // this beat's seconds
      const zz = Math.max(0, vz0 * tt - 4 * tt * tt);
      if (zz <= 0 && t > 0.3) continue;
      const s = Math.max(1.5, sc * (0.035 + rand() * 0.02));
      const x = px + Math.cos(a) * rr;
      const y = py + Math.sin(a) * rr * squash - zz * sc;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = i % 3 === 0 ? st.spark : shade(st.mid, -4);
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- thrown_iron

/**
 * THROWN_IRON — "the junk that stays."
 * Everything is a weapon: the bundle arrives WITH the blast — three
 * or four honest pieces of camp scrap still spinning, still airborne,
 * that clang off the dent, bounce on true arcs, and then just LIE
 * THERE for ten seconds. The dent itself is a small bitten ring with
 * skid scratches where the pieces got away; a clang star and one
 * rising sound-hoop are the only ceremony the throw gets.
 */
const thrown_iron: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x71e0f);
    dust.deployments.kick!(m, c.wx, c.wy, { scale: 0.7 });
    // THE JUNK: spinning shards on true altitude, bouncing wide,
    // cooling from bright steel to a lit rust as they lie. The story
    // is that the junk LIES THERE, so two or three pieces stay a hair
    // over chunk size (0.06-0.07) — recognizable iron, never black —
    // and the rest are honest fines off the same bundle.
    const n = 3 + (c.seed & 1);
    for (let k = 0; k < n; k++) {
      const a = rand() * Math.PI * 2;
      const big = k < 2 + (c.seed & 1);
      c.particles.burst(c.wx, c.wy, 1, big ? [IRON_LIT, IRON] : [IRON, IRON_LIT], {
        speed: 0.9 + rand() * 1.1, life: 10,
        size: big ? 0.06 + rand() * 0.01 : 0.032 + rand() * 0.013,
        gravity: 0, dir: a, spread: 0.3, shape: 'shard', spin: 9 + rand() * 4,
        z: 0.5 + rand() * 0.4, vz: 0.6 + rand() * 0.8, zg: 8.5,
        land: 'bounce', bounce: 0.5, drag: 1.6, layer: 'world',
        fade: IRON, fadeAt: 0.5, fade2: shade(RUST, 16), fade2At: 0.85,
      });
    }
    // Clang glints off the first contact.
    c.particles.burst(c.wx, c.wy, 6, [IRON_LIT, c.st.core], {
      speed: 2.4, life: 0.4, size: 0.06, gravity: 0, shape: 'glint',
      z: 0.2, vz: 1.4, zg: 8, land: 'die', layer: 'world', shadow: 0,
    });
    // The dent keeps a fleck ring under the junk — thinned, and lit
    // enough to read as filings rather than holes.
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * 0.3, c.wy + Math.sin(a) * 0.3,
        k % 2 === 0 ? IRON : shade(c.st.deep, 12), { life: 9, size: 0.04 });
    }
    c.glow(c.wx, c.wy, 1.1, 0.55);
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x71e10);
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    ctx.save();
    ctx.lineCap = 'butt';
    // The dent: a small bitten ring where the bundle first hit.
    ctx.globalAlpha = 0.6 * fade;
    ctx.fillStyle = shade(st.deep, -10);
    ctx.beginPath();
    jaggedRingPath(ctx, px, py, rPx * 0.32, squash, 9, 0.22, rand() * Math.PI, c.seed ^ 3);
    ctx.fill();
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.8, sc * 0.045);
    ctx.beginPath();
    jaggedRingPath(ctx, px, py, rPx * 0.28, squash, 9, 0.18, rand() * Math.PI, c.seed ^ 4);
    ctx.stroke();
    // Skid scratches: where pieces bounced away — short seeded gouges
    // pointing out of the dent, each a dark score with a lit lip.
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI * 2;
      const p0 = pt(c, rPx * 0.3, a);
      const p1 = pt(c, rPx * (0.55 + rand() * 0.3), a + (rand() - 0.5) * 0.2);
      ctx.globalAlpha = 0.75 * fade;
      ctx.strokeStyle = shade(st.deep, -14);
      ctx.lineWidth = Math.max(2.5, sc * 0.065);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
      ctx.globalAlpha = 0.6 * fade;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.2, sc * 0.028);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y - sc * 0.02);
      ctx.lineTo(p1.x, p1.y - sc * 0.02);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    ctx.save();
    if (t < 0.14) {
      // The clang: one hard star, gone fast.
      const k = 1 - t / 0.14;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py - sc * 0.2, sc * (0.3 + 0.2 * (1 - k)), sc * 0.1, 5, c.seed % 7, squash);
      ctx.fill();
      c.glow(c.wx, c.wy, 1.2, 0.6 * k);
    } else if (t < 0.36) {
      // The sound of it: one iron hoop rising off the dent — a
      // circle-in-perspective climbing and thinning as it goes.
      const k = (t - 0.14) / 0.22;
      const rr = sc * (0.25 + k * 0.5);
      ctx.globalAlpha = (1 - k) * 0.7;
      ctx.strokeStyle = IRON_LIT;
      ctx.lineWidth = Math.max(1.5, sc * 0.04 * (1 - k * 0.5));
      ctx.beginPath();
      ctx.ellipse(px, py - sc * (0.3 + k * 0.5), rr, rr * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },
};

// ----------------------------------------------------------- ironbreath

/**
 * IRONBREATH — "the winter exhale."
 * One breath per beat: a fog wedge swells out of the mouth and rolls
 * down the corridor — wide at the far end, a pale seam down the
 * middle, always on its deep bed, and held THIN, its edges broken
 * into staggered cold flecks so the lane reads as breath rather than
 * a painted band — while motes crystallize midair
 * over the lane and come down as chill drops. Every exhale lays its
 * rime on the SAME two rails (position-held), so a held breath
 * thickens the same winter instead of scattering a new one.
 */
const ironbreath: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const dx = c.wx2 - c.wx;
    const dy = c.wy2 - c.wy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const hash = srand(posSeed(c, 0x1cebf) ^ (Math.floor(c.wx2 * 8) * 31) ^ (Math.floor(c.wy2 * 8) * 57));
    frost.deployments.lance!(m, c.wx, c.wy, { x2: c.wx2, y2: c.wy2, scale: 0.55 });
    // The breath hangs: sinking fog over the far half, outliving the beat.
    frost.deployments.fog!(m, c.wx + dx * 0.6, c.wy + dy * 0.6, { radius: Math.min(1.3, len * 0.45), scale: 0.5, dur: 2.6 });
    // THE RAILS: rime laid down both edges of the corridor, on the
    // same stations every exhale.
    for (let s = -1; s <= 1; s += 2) {
      for (let k = 0; k < 5; k++) {
        const f = (k + 0.5 + (hash() - 0.5) * 0.5) / 5;
        lay(c, c.wx + dx * f + nx * 0.24 * s, c.wy + dy * f + ny * 0.24 * s,
          k % 2 === 0 ? c.st.spark : c.st.mid,
          { life: 8, size: 0.045, fade: shade(c.st.mid, -14), fadeAt: 0.5 });
      }
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
    // The exhale: out and back once per beat.
    const swell = Math.sin(Math.min(1, t / 0.7) * Math.PI);
    const reach = Math.min(1, t / 0.45);
    const ex = px + dx * reach;
    const ey = py + dy * reach;
    const w0 = sc * 0.12;
    const w1 = sc * (0.34 + 0.22 * swell);
    ctx.save();
    const wedge = (m0: number, col: string, al: number): void => {
      ctx.globalAlpha = al;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(px + nx * w0 * m0, py + ny * w0 * m0);
      ctx.lineTo(ex + nx * w1 * m0, ey + ny * w1 * m0);
      ctx.lineTo(ex - nx * w1 * m0, ey - ny * w1 * m0);
      ctx.lineTo(px - nx * w0 * m0, py - ny * w0 * m0);
      ctx.closePath();
      ctx.fill();
    };
    // Deep bed first (the contrast law), then the fog body — both held
    // THIN. A breath is not a painted slab: the corridor is stated at
    // the faintest weight that still reads, and the story is carried by
    // the edges below and the seam above.
    wedge(1.16, shade(st.deep, -6), 0.14 * fade);
    wedge(0.9, st.mid, 0.18 * fade);
    // THE FEATHERED EDGES: staggered cold flecks stepping down both
    // rails of the lane, thinning to nothing at the far end — the fog's
    // boundary reads as breath breaking up, never as a ruled band.
    const hash = srand(posSeed(c, 0x1cec0));
    for (let k = 0; k < 9; k++) {
      const f = (k + 0.5) / 9;
      const ww = (w0 + (w1 - w0) * f) * (0.86 + hash() * 0.4);
      const cx = px + dx * reach * f;
      const cy = py + dy * reach * f;
      for (let s = -1; s <= 1; s += 2) {
        const g = Math.max(1.5, sc * (0.045 + hash() * 0.045));
        ctx.globalAlpha = 0.2 * fade * (1 - f * 0.45) * (0.6 + swell * 0.4);
        ctx.fillStyle = k % 3 === 0 ? st.spark : st.mid;
        ctx.fillRect(cx + nx * ww * s - g / 2, cy + ny * ww * s - g / 2, g, g);
      }
    }
    // The breath-seam: one pale line down the center of the cone.
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.8, sc * 0.045);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx + (c.wx2 - c.wx) * 0.55, c.wy + (c.wy2 - c.wy) * 0.55, 1.0, 0.3 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    // Crystallizing motes: born midair over the lane, falling as
    // chill drops — gated, style-color glints (the breath's own ice
    // dust; the true fog is the library's).
    if (t < 0.8 && Math.random() < c.frameDt * 30) {
      const f = 0.25 + Math.random() * 0.7;
      c.particles.burst(c.wx + (c.wx2 - c.wx) * f, c.wy + (c.wy2 - c.wy) * f, 1, [st.spark, st.core], {
        speed: 0.15, life: 0.8, size: 0.055, gravity: 0, shape: 'glint',
        z: 0.7 + Math.random() * 0.3, vz: -0.1, zg: 3.2, land: 'die',
        layer: 'world', shadow: 0, flicker: 0.3,
      });
    }
    // The mouth-curl: a small cold coil where the breath leaves.
    if (t < 0.35) {
      const k = 1 - t / 0.35;
      ctx.save();
      ctx.globalAlpha = 0.5 * k;
      ctx.strokeStyle = shade(st.deep, -8);
      ctx.lineWidth = Math.max(2.2, sc * 0.06);
      ctx.beginPath();
      ctx.ellipse(px, py - sc * 0.55, sc * 0.14, sc * 0.11, 0.5, 0.4, Math.PI * 1.6);
      ctx.stroke();
      ctx.globalAlpha = 0.85 * k;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.3, sc * 0.032);
      ctx.beginPath();
      ctx.ellipse(px, py - sc * 0.55, sc * 0.12, sc * 0.09, 0.5, 0.4, Math.PI * 1.6);
      ctx.stroke();
      ctx.restore();
    }
  },
};

// ----------------------------------------------------------- fifth_road

/**
 * FIFTH_ROAD — "the fifth milestone."
 * The dash line paints as ROAD: a graded bed, a packed body, and the
 * worn center line dashed like paint gone to gravel — written under
 * the runner as they go. A squat milestone stands up at each end,
 * dark cheek, lit face, foreshortened cap; the near one carries the
 * tally, four strokes and the cross-cut, because this road has been
 * taken five times and the fifth goes THROUGH. Blood sprays at the
 * pass-through, and the road remains: two wheel-rut grain lines the
 * length of the stride, eight seconds after the runner is gone.
 */
const fifth_road: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x5f17d);
    const dx = c.wx2 - c.wx;
    const dy = c.wy2 - c.wy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    dust.deployments.kick!(m, c.wx, c.wy, { scale: 0.5 });
    // The pass-through: the fifth road goes through somebody.
    blood.deployments.spray!(m, c.wx + dx * 0.55, c.wy + dy * 0.55, { dir: Math.atan2(dy, dx), scale: 0.6 });
    // THE ROAD REMAINS: two wheel-rut grain lines the length of the
    // dash, and a bright grain at the foot of each milestone.
    for (let s = -1; s <= 1; s += 2) {
      for (let k = 0; k < 7; k++) {
        const f = (k + 0.5) / 7 + (rand() - 0.5) * 0.06;
        lay(c, c.wx + dx * f + nx * 0.15 * s, c.wy + dy * f + ny * 0.15 * s,
          k % 3 === 0 ? shade(c.st.mid, -10) : c.st.deep,
          { life: 8.5, size: 0.045 + rand() * 0.02 });
      }
    }
    lay(c, c.wx, c.wy, c.st.spark, { life: 9, size: 0.06 });
    lay(c, c.wx2, c.wy2, c.st.spark, { life: 9, size: 0.06 });
  },
  ground(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const head = Math.min(1, t / 0.55);
    const ex = px + dx * head;
    const ey = py + dy * head;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE PACKED SEAM: bed, body, and the worn center line.
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = shade(st.deep, -8);
    ctx.lineWidth = Math.max(5, sc * 0.5);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(3.5, sc * 0.34);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.setLineDash([sc * 0.22, sc * 0.14]);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);
    // The ruts: two dark hairlines inside the band.
    for (let s = -1; s <= 1; s += 2) {
      ctx.globalAlpha = 0.6 * fade;
      ctx.strokeStyle = shade(st.deep, -16);
      ctx.lineWidth = Math.max(1.3, sc * 0.032);
      ctx.beginPath();
      ctx.moveTo(px + nx * sc * 0.15 * s, py + ny * sc * 0.15 * s);
      ctx.lineTo(ex + nx * sc * 0.15 * s, ey + ny * sc * 0.15 * s);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx + (c.wx2 - c.wx) * head, c.wy + (c.wy2 - c.wy) * head, 0.8, 0.35 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    ctx.save();
    // THE MILESTONES: dark cheek, lit face, foreshortened cap. The
    // near stone carries the tally — four strokes and the cross-cut.
    const stone = (x: number, y: number, k: number, tally: boolean): void => {
      if (k <= 0) return;
      const h = sc * 0.52 * k;
      const w = sc * 0.13;
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillStyle = shade(st.deep, -14);
      ctx.fillRect(x - w, y - h, w, h);
      ctx.fillStyle = shade(st.mid, 6);
      ctx.fillRect(x, y - h, w, h);
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      ctx.ellipse(x, y - h, w, w * 0.45 * squash + w * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      if (tally && k >= 1) {
        ctx.globalAlpha = 0.95 * fade;
        ctx.strokeStyle = st.core;
        ctx.lineWidth = Math.max(1.2, sc * 0.028);
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const tx = x + w * 0.15 + i * w * 0.22;
          ctx.moveTo(tx, y - h * 0.72);
          ctx.lineTo(tx, y - h * 0.3);
        }
        ctx.moveTo(x + w * 0.05, y - h * 0.66);
        ctx.lineTo(x + w * 0.92, y - h * 0.34);
        ctx.stroke();
      }
    };
    stone(px, py, Math.min(1, t / 0.12), true);
    stone(px2, py2, Math.max(0, Math.min(1, (t - 0.5) / 0.12)), false);
    ctx.restore();
    // Speed slivers peel off the runner while the road writes.
    if (t < 0.5 && Math.random() < c.frameDt * 24) {
      const f = Math.min(1, t / 0.55);
      const a = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
      c.particles.burst(c.wx + (c.wx2 - c.wx) * f, c.wy + (c.wy2 - c.wy) * f, 1, [st.spark, st.core], {
        speed: 2.6, life: 0.3, size: 0.08, gravity: 0, dir: a + Math.PI, spread: 0.2, shape: 'streak',
        z: 0.3, vz: 0, zg: 0, land: 'none', layer: 'world', shadow: 0,
      });
    }
  },
};

// ---------------------------------------------------------- old_thunder

/**
 * OLD_THUNDER — "the bolt that never gets up."
 * The joints remember the storm. Each beat one dry LOW crack of
 * lightning walks fist to target HUGGING the dirt — a ground-layer
 * bolt that re-kinks twice as it holds, old and slow and absolutely
 * certain — while a rumble half-ring shrugs out through the reach,
 * thunder felt through boot soles rather than heard. Then the old
 * storm's memory arrives late: sparse rain over the zone for two
 * seconds after the arc dies, and dark petrichor flecks where it
 * finds the dust.
 */
const old_thunder: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x01d77);
    const hx = c.wx + Math.cos(c.dir) * c.radius * 0.85;
    const hy = c.wy + Math.sin(c.dir) * c.radius * 0.85;
    storm.deployments.impact!(m, hx, hy, { scale: 0.6 });
    // The rain arrives after the strike, sparse and patient.
    water.deployments.rain!(m, c.wx + Math.cos(c.dir) * c.radius * 0.5, c.wy + Math.sin(c.dir) * c.radius * 0.5,
      { radius: 1.0, scale: 0.42, dur: 2.0 });
    // Petrichor: the dark spots where old rain finds old dust.
    for (let k = 0; k < 3; k++) {
      const a = c.dir + (rand() - 0.5) * 1.4;
      const rr = c.radius * (0.4 + rand() * 0.5);
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        c.st.deep, { life: 7, size: 0.035 + rand() * 0.01 });
    }
    c.glow(hx, hy, 0.9, 0.5);
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, px, py, rPx } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE LOW BOLT: fist to target along the dirt, re-kinking on
    // deterministic bands — never rising, never hurrying.
    if (t < 0.55) {
      const p0 = pt(c, rPx * 0.12, dir);
      const p1 = pt(c, rPx * 0.92, dir);
      const strike = Math.floor(t * 5.5); // re-kink bands
      const flick = strike % 2 === 0 ? 1 : 0.86;
      const bolt = (): void => {
        ctx.beginPath();
        boltPath(ctx, p0.x, p0.y, p1.x, p1.y, (c.seed ^ 0x01d7d) + strike, sc * 0.18);
        ctx.stroke();
      };
      // Sleeve, body, core: the arc has to READ as a bolt at a glance,
      // fist to target, before anything about it can read as old.
      ctx.globalAlpha = 0.8 * fade;
      ctx.strokeStyle = shade(st.deep, -6);
      ctx.lineWidth = Math.max(4.5, sc * 0.15);
      bolt();
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(3, sc * 0.085);
      bolt();
      ctx.globalAlpha = 0.95 * fade * flick;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      bolt();
      // The fist-end rumble: one tight ring where the arc leaves the
      // knuckles, the beat's own thump under the walk.
      const bk = Math.min(1, t / 0.28);
      ctx.globalAlpha = 0.7 * (1 - bk) * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      ctx.beginPath();
      ctx.ellipse(p0.x, p0.y, rPx * (0.1 + 0.22 * bk), rPx * (0.1 + 0.22 * bk) * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The rumble: a half-ring through the reach — felt, not heard.
    const rk = Math.min(1, t / 0.7);
    const rr = rPx * (0.35 + 0.6 * rk);
    ctx.globalAlpha = 0.5 * (1 - rk) * fade;
    ctx.strokeStyle = shade(st.deep, -10);
    ctx.lineWidth = Math.max(3, sc * 0.09);
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, dir - 1.1, dir + 1.1);
    ctx.stroke();
    ctx.globalAlpha = 0.7 * (1 - rk) * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.beginPath();
    ctx.ellipse(px, py, rr * 0.96, rr * 0.96 * squash, 0, dir - 1.05, dir + 1.05);
    ctx.stroke();
    ctx.restore();
    if (t < 0.55) c.glow(c.wx + Math.cos(dir) * c.radius * 0.85, c.wy + Math.sin(dir) * c.radius * 0.85, 0.8, 0.4 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    // The dry snap at the far end — small, low, done.
    if (t < 0.2) {
      const k = 1 - t / 0.2;
      const p = pt(c, rPx * 0.92, dir);
      ctx.save();
      ctx.globalAlpha = 0.9 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, p.x, p.y - sc * 0.1, sc * 0.18, sc * 0.07, 4, dir + 0.5, squash);
      ctx.fill();
      ctx.restore();
    }
    // Static ticks dying out along the reach — the joints settling.
    if (t < 0.6 && Math.random() < c.frameDt * 14) {
      const f = 0.2 + Math.random() * 0.7;
      c.particles.burst(c.wx + Math.cos(dir) * c.radius * f, c.wy + Math.sin(dir) * c.radius * f, 1, [st.spark, st.core], {
        speed: 1.4, life: 0.3, size: 0.05, gravity: 0, shape: 'glint',
        z: 0.15, vz: 0.3, zg: 4, land: 'die', layer: 'world', shadow: 0, flicker: 0.5,
      });
    }
  },
};

// ------------------------------------------------------ gathered_breath

/**
 * GATHERED_BREATH — "all of it at once."
 * The combat showpiece. The long inhale already happened in the
 * wind-up's charge dialect — the field emptied, the quiet held — so
 * the nova owes NO ceremony, only the whole debt at once: one
 * massive clean shockwave front (deep bed, packed body, white
 * crest), a scoured pale interior behind it, the full dust slam, a
 * hard star over the caster — and then the slow drift-back, seeded
 * motes easing down through the late beat as the air refills the
 * yard. The front leaves a full tamped ring at three-quarters reach,
 * rammed grains that outstay everything.
 */
const gathered_breath: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x6a7b3d);
    dust.deployments.slam!(m, c.wx, c.wy, { scale: 1.15 });
    dust.deployments.skirt!(m, c.wx, c.wy, { radius: 0.6, scale: 0.9, dur: 0.5 });
    // THE TAMPED RING: the breath's one signature on the yard.
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + rand() * 0.3;
      const rr = c.radius * (0.76 + (rand() - 0.5) * 0.07);
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        k % 3 === 0 ? shade(c.st.mid, -8) : c.st.deep,
        { life: 9.5, size: 0.055 + rand() * 0.03 });
    }
    c.glow(c.wx, c.wy, c.radius, 0.85);
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const k = Math.min(1, t / 0.5);
    const e = 1 - (1 - k) * (1 - k); // hits hard, eases out
    const rr = rPx * (0.1 + 0.9 * e);
    ctx.save();
    ctx.lineCap = 'butt';
    // The scoured interior: behind the front the ground reads swept —
    // everything loose went with the wave.
    ctx.globalAlpha = 0.2 * fade;
    ctx.fillStyle = shade(st.deep, 22);
    ctx.beginPath();
    ctx.ellipse(px, py, rr * 0.96, rr * 0.96 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // THE FRONT: one wavefront, no echoes — the entire purchase of a
    // twenty-four-tick wind spent in a single clean ring.
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = shade(st.deep, -10);
    ctx.lineWidth = Math.max(4.5, sc * 0.34);
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.8, sc * 0.2);
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.8, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(px, py, rr + sc * 0.12, (rr + sc * 0.12) * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * (0.3 + 0.7 * e), 0.7 * (1 - t * 0.5));
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    ctx.save();
    if (t < 0.16) {
      // The punch: a hard star and a low half-shell over the caster —
      // the whole exhale in one frame-read.
      const k = t / 0.16;
      ctx.globalAlpha = 0.95 * (1 - k);
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py - sc * 0.5, sc * (0.4 + k * 0.3), sc * 0.15, 5, c.seed % 7, squash);
      ctx.fill();
      const R = sc * (0.55 + k * 0.6);
      ctx.globalAlpha = (1 - k) * 0.6;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(3, sc * 0.09);
      ctx.beginPath();
      ctx.ellipse(px, py - sc * 0.1, R, R * 0.55, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = (1 - k * 0.6) * 0.9;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.8, sc * 0.045);
      ctx.beginPath();
      ctx.ellipse(px, py - sc * 0.1, R, R * 0.55, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    // THE DRIFT-BACK: late in the beat, what the breath took comes
    // easing back down — seeded motes sinking through the emptied air.
    if (t > 0.45) {
      const rand = srand(c.seed ^ 0x6a7b3e);
      const k = (t - 0.45) / 0.55;
      const al = Math.sin(Math.min(1, k) * Math.PI) * 0.7;
      for (let i = 0; i < 9; i++) {
        const a = rand() * Math.PI * 2;
        const rr = rPx * (0.25 + rand() * 0.75);
        const h = sc * (0.7 + rand() * 0.5) * (1 - k * 0.8);
        const s = Math.max(1.5, sc * (0.03 + rand() * 0.02));
        ctx.globalAlpha = al;
        ctx.fillStyle = i % 3 === 0 ? st.spark : shade(st.mid, -4);
        ctx.fillRect(px + Math.cos(a) * rr - s / 2, py + Math.sin(a) * rr * squash - h - s / 2, s, s);
      }
    }
    ctx.restore();
  },
};

// ----------------------------------------------------------- long_watch

/**
 * LONG_WATCH — "the watch-lantern."
 * The watch never lifted: a tin lantern swings over the ring on the
 * WORLD clock — pivot, bail, dark frame, one lit pane — so the
 * pendulum never resets between beats, and its pale pool slides the
 * ground below it, white rim leading on the swing side. Three
 * footprint stations hide inside the ring (position-hashed, fixed
 * for the whole channel); when the light passes over one, the pair
 * flashes — heel and toe, caught. Each beat fixes one pair into
 * settled grains: by the watch's end the ground is a ledger of
 * everyone who stood here.
 */
const long_watch: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x10a7c5);
    const hash = srand(posSeed(c, 0x10a7c4));
    // The stations, hash-held — then this beat picks one pair to fix
    // into the record.
    const sx: number[] = [];
    const sy: number[] = [];
    const sa: number[] = [];
    for (let i = 0; i < 3; i++) {
      const a = hash() * Math.PI * 2;
      const rr = c.radius * (0.3 + hash() * 0.55);
      sx.push(c.wx + Math.cos(a) * rr);
      sy.push(c.wy + Math.sin(a) * rr);
      sa.push(hash() * Math.PI * 2);
    }
    const pick = Math.floor(rand() * 3);
    for (let f = 0; f < 2; f++) {
      const side = f === 0 ? 1 : -1;
      // The settled record wears the same small marks the sweep found:
      // a heel and, ahead of it, a smaller toe.
      lay(c,
        sx[pick]! + Math.cos(sa[pick]! + Math.PI / 2) * 0.07 * side + Math.cos(sa[pick]!) * 0.06 * f,
        sy[pick]! + Math.sin(sa[pick]! + Math.PI / 2) * 0.07 * side + Math.sin(sa[pick]!) * 0.06 * f,
        f === 0 ? c.st.deep : shade(c.st.deep, 12),
        { life: 8, size: f === 0 ? 0.055 : 0.04 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const hash = srand(posSeed(c, 0x10a7c4));
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const pend = Math.sin(c.now / 340) * 0.7;
    const lx = px + Math.sin(pend) * sc * 0.9; // where the light falls
    ctx.save();
    ctx.lineCap = 'butt';
    // The watch ring: the post nobody crosses unseen, held faint.
    ctx.globalAlpha = 0.35 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    ctx.setLineDash([sc * 0.16, sc * 0.12]);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx, rPx * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // THE SWEEP: the pale pool slides with the pendulum — deep bed,
    // pale body, white rim leading on the swing side.
    const pr = sc * 0.85;
    ctx.globalAlpha = 0.35 * fade;
    ctx.fillStyle = shade(st.deep, -6);
    ctx.beginPath();
    ctx.ellipse(lx, py, pr * 1.12, pr * 1.12 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.42 * fade;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.ellipse(lx, py, pr, pr * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    const lead = Math.cos(c.now / 340) >= 0 ? 0 : Math.PI;
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.6, sc * 0.04);
    ctx.beginPath();
    ctx.ellipse(lx, py, pr * 0.96, pr * 0.96 * squash, 0, lead - 0.7, lead + 0.7);
    ctx.stroke();
    // FOOTPRINT PAIRS: when the pool passes a station, the prints
    // flash — heel and toe, a pair, the watch reading the ground.
    // Same hash stream as spawn, so the stations never wander.
    for (let i = 0; i < 3; i++) {
      const a = hash() * Math.PI * 2;
      const rf = 0.3 + hash() * 0.55;
      const wa = hash() * Math.PI * 2;
      const stx = px + Math.cos(a) * rPx * rf;
      const sty = py + Math.sin(a) * rPx * rf * squash;
      // Lit by the sweep: overlap of the pool ellipse with the station.
      const dx = stx - lx;
      const dy = (sty - py) / squash;
      const lit = Math.max(0, 1 - Math.hypot(dx, dy) / pr);
      if (lit <= 0.05) continue;
      const ca = Math.cos(wa);
      const sa2 = Math.sin(wa);
      for (let f2 = -1; f2 <= 1; f2 += 2) {
        // Each foot: a SMALL crisp heel mark behind and a smaller toe
        // mark ahead — pressed ink in the dirt, never a slab of light.
        // Both are inked dark and owe their whole visibility to the
        // sweep, so a print exists only while the lantern is on it.
        const ox = -sa2 * sc * 0.07 * f2;
        const oy = ca * sc * 0.07 * f2 * squash;
        const heel = Math.max(1.4, sc * 0.055);
        const toe = Math.max(1, sc * 0.038);
        ctx.globalAlpha = 0.9 * lit * fade;
        ctx.fillStyle = st.deep;
        ctx.fillRect(stx + ox - heel / 2, sty + oy - heel / 2, heel, heel);
        ctx.globalAlpha = 0.75 * lit * fade;
        ctx.fillStyle = shade(st.deep, 12);
        ctx.fillRect(
          stx + ox + ca * sc * 0.085 - toe / 2,
          sty + oy + sa2 * sc * 0.085 * squash - toe / 2,
          toe, toe,
        );
      }
    }
    ctx.restore();
    c.glow(c.wx + Math.sin(pend) * 0.9, c.wy, 0.9, 0.3 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const fade = t < 0.78 ? 1 : (1 - t) / 0.22; // the gutter at beat's end
    const pend = Math.sin(c.now / 340) * 0.7;
    const pivX = px;
    const pivY = py - sc * 2.6;
    const lx = px + Math.sin(pend) * sc * 0.8;
    const ly = pivY + Math.cos(pend) * sc * 0.8; // z ≈ 1.8 tiles at center
    ctx.save();
    // The bail.
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = shade(st.deep, -10);
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    ctx.beginPath();
    ctx.moveTo(pivX, pivY);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    // THE WATCH-LANTERN: dark tin frame, one lit pane, cap, finial.
    const w = sc * 0.19;
    const h = sc * 0.26;
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = shade(st.deep, -16);
    ctx.fillRect(lx - w * 0.62, ly - h * 0.55, w * 1.24, h * 1.1);
    const flick = 0.82 + 0.18 * Math.sin(c.now / 120);
    ctx.globalAlpha = flick * fade;
    ctx.fillStyle = st.core;
    ctx.fillRect(lx - w * 0.4, ly - h * 0.35, w * 0.8, h * 0.7);
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = shade(st.deep, -16);
    ctx.fillRect(lx - w * 0.45, ly - h * 0.8, w * 0.9, h * 0.22);
    ctx.fillRect(lx - w * 0.08, ly - h * 0.95, w * 0.16, h * 0.15);
    // The thrown light: a pale cone from pane to pool.
    ctx.globalAlpha = 0.22 * fade;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.moveTo(lx - w * 0.3, ly + h * 0.5);
    ctx.lineTo(lx + w * 0.3, ly + h * 0.5);
    ctx.lineTo(px + Math.sin(pend) * sc * 0.9 + sc * 0.8, py);
    ctx.lineTo(px + Math.sin(pend) * sc * 0.9 - sc * 0.8, py);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    c.glow(c.wx + Math.sin(pend) * 0.8, c.wy, 0.8, 0.35 * fade);
    void t;
  },
};

// ------------------------------------------------------------- scarworn

/**
 * SCARWORN — "the copper seams."
 * Where you collect. The strike itself is a modest crescent — this
 * art's spectacle is on the CASTER: four old scars wake copper
 * across the silhouette on fixed body stations, each a kinked seam
 * carrying a dark undercut, a bright copper body at full centerpiece
 * weight, and a white stitch-tick — flashing in sequence, oldest
 * first, all four flaring together on the strike.
 * Blood flows the wrong way home (the library's drink, pulled from
 * the arc as well as the feet), a dashed collection ring closes
 * inward, and the copper fades LAST — slow glints hanging at the
 * seams a second and a half after the arc dies, then settling into a
 * small ring of till at the feet.
 */
const scarworn: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x5ca55);
    dust.deployments.kick!(m, c.wx + Math.cos(c.dir) * c.radius * 0.6, c.wy + Math.sin(c.dir) * c.radius * 0.6, { scale: 0.4 });
    // THE FLOWBACK: what they lose is yours — drawn home twice, once
    // off the arc where the cut landed and once around the feet, so the
    // motes read as travelling BACK along the strike, not just pooling.
    blood.deployments.drink!(m, c.wx, c.wy, { radius: 1.15, scale: 0.8, dur: 0.9 });
    blood.deployments.drink!(m, c.wx + Math.cos(c.dir) * c.radius * 0.72, c.wy + Math.sin(c.dir) * c.radius * 0.72,
      { radius: 0.85, scale: 0.55, dur: 0.8 });
    // THE COPPER GOES LAST: ground-layer glints hanging at the seam
    // stations a second and a half past the paint, cooling as they go.
    for (let k = 0; k < 4; k++) {
      const a = rand() * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * 0.2, c.wy + Math.sin(a) * 0.2, COPPER_LIT,
        { life: 1.5, size: 0.045, fade: COPPER, fadeAt: 0.45, fade2: COPPER_DARK, fade2At: 0.8 });
    }
    // Copper outlives the wire: slow glints hanging at the seams for
    // two seconds after the paint dies, then settling.
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * 0.28, c.wy + Math.sin(a) * 0.28, 1, [COPPER_LIT, COPPER], {
        speed: 0.12, life: 2.2, size: 0.055, gravity: 0, shape: 'glint',
        z: 0.5 + rand() * 0.55, vz: -0.12, zg: 0.7, land: 'settle',
        layer: 'world', shadow: 0, flicker: 0.4,
        fade: COPPER, fadeAt: 0.5, fade2: COPPER_DARK, fade2At: 0.85,
      });
    }
    // The till: copper grains in a small ring at the feet.
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * 0.32, c.wy + Math.sin(a) * 0.32,
        k % 2 === 0 ? COPPER : COPPER_DARK,
        { life: 8, size: 0.045, fade: COPPER_DARK, fadeAt: 0.6 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, px, py, rPx } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    ctx.save();
    ctx.lineCap = 'butt';
    // The strike: fast, plain, businesslike — a two-pass crescent.
    if (t < 0.45) {
      const k = Math.min(1, t / 0.22);
      const rr = rPx * (0.4 + 0.5 * k);
      ctx.globalAlpha = 0.65 * fade;
      ctx.strokeStyle = shade(st.deep, -10);
      ctx.lineWidth = Math.max(3.5, sc * 0.12);
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, dir - 0.7, dir + 0.7);
      ctx.stroke();
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.8, sc * 0.05);
      ctx.beginPath();
      ctx.ellipse(px, py, rr * 0.97, rr * 0.97 * squash, 0, dir - 0.65, dir + 0.65);
      ctx.stroke();
    }
    // The collection: a dashed ring closing INTO the caster, its
    // dashes sliding inward on the offset clock.
    const rr2 = rPx * (1.0 - Math.min(1, t / 0.8) * 0.55);
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = COPPER;
    ctx.lineWidth = Math.max(1.5, sc * 0.038);
    ctx.setLineDash([sc * 0.12, sc * 0.09]);
    ctx.lineDashOffset = c.now / 24;
    ctx.beginPath();
    ctx.ellipse(px, py, rr2, rr2 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    c.glow(c.wx, c.wy, 0.8, 0.3 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, dir, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x5ca56);
    ctx.save();
    // THE SEAMS: four old scars wake copper ACROSS THE CASTER — struck
    // on fixed stations off the wire's own point (small offsets, small
    // jitter), so they land on the body every time instead of wandering
    // off it. Each is a kinked seam carrying real weight: a dark
    // undercut, a bright copper body at centerpiece width, and a white
    // stitch-tick. They wake in sequence, oldest first, all of them
    // flaring together on the strike itself.
    const STATION: readonly (readonly [number, number, number])[] = [
      [-0.30, -1.06, 0.35], [0.28, -0.80, -0.5], [-0.14, -0.52, 0.2], [0.32, -0.32, -0.25],
    ];
    const flare = t < 0.12 ? 1 + (1 - t / 0.12) * 0.5 : 1;
    for (let i = 0; i < 4; i++) {
      const s0 = STATION[i]!;
      const bx = px + (s0[0] + (rand() - 0.5) * 0.1) * sc;
      const by = py + (s0[1] + (rand() - 0.5) * 0.08) * sc;
      const a = s0[2] + (rand() - 0.5) * 0.4;
      const len = sc * (0.3 + rand() * 0.14);
      const kink = (rand() - 0.5) * sc * 0.09;
      const wakeAt = 0.05 + i * 0.09;
      const k = Math.max(0, Math.min(1, (t - wakeAt) / 0.1));
      if (k <= 0) continue;
      // The copper is the LAST thing to go: full heat until the arc is
      // finished, and only then a slow cool over the tail of the beat.
      const heat = k * (t < 0.78 ? 1 : (1 - t) / 0.22) * flare;
      const mx = bx + Math.cos(a) * len * 0.5 + kink;
      const my = by + Math.sin(a) * len * 0.5 - sc * 0.05;
      const ex2 = bx + Math.cos(a) * len;
      const ey2 = by + Math.sin(a) * len;
      const seam = (): void => {
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(mx, my);
        ctx.lineTo(ex2, ey2);
        ctx.stroke();
      };
      ctx.globalAlpha = Math.min(1, 0.8 * heat);
      ctx.strokeStyle = COPPER_DARK;
      ctx.lineWidth = Math.max(4.2, sc * 0.115);
      seam();
      ctx.globalAlpha = Math.min(1, 0.95 * heat);
      ctx.strokeStyle = COPPER_LIT;
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      seam();
      // The stitch-tick across the middle of the seam.
      ctx.globalAlpha = Math.min(1, 0.9 * heat);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.4, sc * 0.032);
      ctx.beginPath();
      ctx.moveTo(mx - Math.sin(a) * sc * 0.06, my + Math.cos(a) * sc * 0.06);
      ctx.lineTo(mx + Math.sin(a) * sc * 0.06, my - Math.cos(a) * sc * 0.06);
      ctx.stroke();
    }
    // The strike flash: small, at the chord, no ceremony.
    if (t < 0.14) {
      const k = 1 - t / 0.14;
      const p = pt(c, rPx * 0.75, dir);
      ctx.globalAlpha = 0.9 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, p.x, p.y - sc * 0.1, sc * 0.16, sc * 0.06, 4, dir, squash);
      ctx.fill();
      c.glow(c.wx + Math.cos(dir) * c.radius * 0.75, c.wy + Math.sin(dir) * c.radius * 0.75, 0.7, 0.4 * k);
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- last_lesson

/**
 * LAST_LESSON — "the chalk line."
 * The capper, and the chain is CHALK, not lightning: a hand-drawn
 * white line writes student to student — six stations of honest
 * wobble on a slate shadow, skipping where the chalk left the board —
 * and when it arrives the teacher's knuckle raps the far end twice,
 * flash and echo, and the target's feet get chalked in a quick ring:
 * the diagram's next node. Every hop leaves its whole path as
 * settled chalk grains, so the ghost geometry of the lesson
 * accumulates line by line across the slate — six seconds of
 * diagram — and then wipes.
 */
const last_lesson: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xc4a17);
    const dx = c.wx2 - c.wx;
    const dy = c.wy2 - c.wy;
    // THE SLATE KEEPS THE DIAGRAM: this hop's line, laid whole.
    for (let k = 0; k < 9; k++) {
      const f = (k + 0.5) / 9;
      lay(c, c.wx + dx * f + (rand() - 0.5) * 0.08, c.wy + dy * f + (rand() - 0.5) * 0.08,
        k % 3 === 0 ? CHALK : CHALK_BODY,
        { life: 6, size: 0.04 + rand() * 0.02, fade: CHALK_DUST, fadeAt: 0.55 });
    }
    // Knuckle-dust: the rap knocks a puff off the slate.
    c.particles.burst(c.wx2, c.wy2, 4, [CHALK, CHALK_BODY], {
      speed: 0.5, life: 1.1, size: 0.05, gravity: 0, shape: 'mote',
      z: 0.35, vz: 0.7, zg: 3.5, land: 'settle', layer: 'world', shadow: 0,
      fade: CHALK_DUST, fadeAt: 0.5,
    });
    c.glow(c.wx2, c.wy2, 0.7, 0.4);
  },
  ground(c) {
    const { ctx, t, sc, squash, px, py, px2, py2 } = c;
    const rand = srand(c.seed ^ 0xc4a18);
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const head = Math.min(1, t / 0.4);
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    // The hand's wobble: seeded per hop, pinned at both ends.
    const N = 6;
    const wob: number[] = [];
    for (let i = 0; i <= N; i++) {
      wob.push((rand() - 0.5) * sc * 0.12 * (i === 0 || i === N ? 0.2 : 1));
    }
    const path = (): void => {
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= N; i++) {
        const f = i / N;
        if (f > head) {
          // The live writing tip: interpolate to exactly head.
          const f0 = (i - 1) / N;
          const seg = (head - f0) * N;
          const x0 = px + dx * f0 + nx * wob[i - 1]!;
          const y0 = py + dy * f0 + ny * wob[i - 1]!;
          const x1 = px + dx * f + nx * wob[i]!;
          const y1 = py + dy * f + ny * wob[i]!;
          ctx.lineTo(x0 + (x1 - x0) * seg, y0 + (y1 - y0) * seg);
          break;
        }
        const x = px + dx * f + nx * wob[i]!;
        const y = py + dy * f + ny * wob[i]!;
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else ctx.lineTo(x, y);
      }
    };
    ctx.save();
    ctx.lineCap = 'butt';
    // Slate shadow under the stroke (the contrast law).
    ctx.globalAlpha = 0.4 * fade;
    ctx.strokeStyle = SLATE;
    ctx.lineWidth = Math.max(3, sc * 0.085);
    path();
    ctx.stroke();
    // THE CHALK LINE: skipping where the chalk left the board.
    ctx.globalAlpha = 0.92 * fade;
    ctx.strokeStyle = CHALK;
    ctx.lineWidth = Math.max(1.8, sc * 0.05);
    ctx.setLineDash([sc * 0.34, sc * 0.06]);
    path();
    ctx.stroke();
    ctx.setLineDash([]);
    // The start node: where this stroke of the diagram began.
    ctx.globalAlpha = 0.8 * fade;
    ctx.fillStyle = CHALK_BODY;
    ctx.fillRect(px - sc * 0.05, py - sc * 0.05 * squash, sc * 0.1, sc * 0.1 * squash);
    // The pupil's circle: the target's feet get chalked on arrival.
    if (head >= 1) {
      const k = Math.min(1, (t - 0.4) / 0.12);
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = CHALK_BODY;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(px2, py2, sc * 0.34 * k, sc * 0.34 * k * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px2, py2 } = c;
    ctx.save();
    // THE RAP: the knuckle knocks the board twice — flash, then a
    // smaller echo.
    const rap = (at: number, size: number): void => {
      if (t >= at && t < at + 0.1) {
        const k = 1 - (t - at) / 0.1;
        ctx.globalAlpha = 0.95 * k;
        ctx.fillStyle = st.core;
        ctx.beginPath();
        burstStarPath(ctx, px2, py2 - sc * 0.3, sc * size, sc * size * 0.4, 4, 0.4, squash);
        ctx.fill();
      }
    };
    rap(0.42, 0.22);
    rap(0.58, 0.14);
    ctx.restore();
    if (t >= 0.42 && t < 0.52) c.glow(c.wx2, c.wy2, 0.8, 0.5);
    // Chalk dust falls off the writing tip — gated, brief.
    if (t < 0.4 && Math.random() < c.frameDt * 26) {
      const f = Math.min(1, t / 0.4);
      c.particles.burst(c.wx + (c.wx2 - c.wx) * f, c.wy + (c.wy2 - c.wy) * f, 1, [CHALK, CHALK_BODY], {
        speed: 0.2, life: 0.5, size: 0.04, gravity: 0, shape: 'mote',
        z: 0.15, vz: -0.1, zg: 2.5, land: 'die', layer: 'world', shadow: 0,
      });
    }
  },
};

export const COMBAT_BREATH_SIGS: Record<string, AbilitySig> = {
  measured_blow,
  drumbeat,
  thrown_iron,
  ironbreath,
  fifth_road,
  old_thunder,
  gathered_breath,
  long_watch,
  scarworn,
  last_lesson,
};
