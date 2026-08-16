/**
 * THE SECOND BREATH SPEAKS — the shield wave (THE STANDING LAW).
 *
 * Ten set-pieces for the shield school's between-rung breath arts,
 * five casted and five channeled. The school's doctrine: brass,
 * bells, and walls — sound made visible, weight made patient. The
 * shield does not slash or scorch on its own authority; it RINGS,
 * it GRINDS, it PLANTS, and what it builds it builds one course at
 * a time. Brass glints, masonry crumbs, and chain links are the
 * school's own unowned matter; dust, frost, water, radiance, storm,
 * and fire speak only through the library (ONE-VOICE).
 *
 * Same binding laws as every wave: hard edges, save/restore hygiene,
 * squash on ground y-radii, srand geometry with frameDt-gated
 * emission, ≤ ~60 path ops per hook per frame, and the breath-wave
 * additions — deep under-strokes beneath every pale element, area
 * fills over hairlines, hold-then-release fades, a lasting mark for
 * every aftermath. Channel signatures are ONE BEAT'S WORTH; what
 * must accumulate across beats accumulates through matter (settled
 * grains, thrown crumbs), never through paint.
 *
 * No centerpiece here repeats another's, in this file or any other:
 * shield_bash owns the swung door-slab, draw_iron the iron hexagon,
 * no_quarter the chisel-and-grinder, road_opens the snapped toll
 * bar, anvil_sky the falling hammer — so the bell here goes OVAL
 * the way struck bronze truly does, the door here falls FLAT out
 * of the sky, the gate here is a full portcullis, and the sunder
 * here reads in the CURLS it peels, not the wheel that peeled them.
 */

import { shade } from './rig.js';
import { burstStarPath, srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { dust, fire, frost, radiance, storm, water, asMatter } from './matter/index.js';

/** Screen point r px from the heart along ground angle a. */
function pt(c: SigCtx, r: number, a: number): { x: number; y: number } {
  return { x: c.px + Math.cos(a) * r, y: c.py + Math.sin(a) * r * c.squash };
}

/**
 * THE LASTING MARK — one settled grain laid deliberately at a world
 * point. Near-still, ground layer, long life: the tertiary stratum.
 * Every art's lingering record goes through here so the budget stays
 * legible — a cast lays a few dozen grains at most.
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

/** Channel-stable PRNG — rooted in the caster's position, not the beat. */
function posRand(c: SigCtx, salt: number): () => number {
  return srand((Math.floor(c.wx * 8) * 73) ^ (Math.floor(c.wy * 8) * 151) ^ salt);
}

// ------------------------------------------------------------ iron_toll

/**
 * IRON_TOLL — "the oval mouth."
 * The shield is struck and answers as a BELL answers: its bronze
 * mouth rings visibly out-of-round, flexing oval along one axis then
 * the other at a decaying tremble — the mode a founder reads with
 * his thumb — while three sound rings peel off it and cross the
 * yard, each shivering at the same dying pitch. The clapper is a
 * hanging tongue that swings once in the first blink. Brass shaken
 * off the boss bounces true, and a circle of brass grains lies at
 * the rim for nine seconds: exactly where the sound stopped. Two
 * faint echoes peel later and cross the yard after the first three
 * have died — the yard answering the note a second on, and again.
 */
const iron_toll: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0xbe11);
    // The shock arrives as charge — struck metal ionizes the air.
    storm.deployments.impact!(m, c.wx, c.wy, { scale: 0.75 });
    // Bodies thrown: the knockback's honest dust skirt.
    dust.deployments.skirt!(m, c.wx, c.wy, { radius: 0.5, scale: 0.8 });
    // Brass shaken off the boss — unowned matter, canonical fall.
    for (let k = 0; k < 7; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(c.wx, c.wy, 1, [c.st.spark, c.st.core], {
        speed: 1.3 + rand() * 1.2, life: 6.5, size: 0.055, gravity: 0,
        dir: a, spread: 0.3, shape: 'glint',
        z: 0.35, vz: 2.0 + rand() * 1.6, zg: 8.5, land: 'bounce', bounce: 0.5,
        layer: 'world', fade: shade(c.st.spark, -22), fadeAt: 0.4,
      });
    }
    // Where the sound stopped: brass grains ringing the reach.
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + rand() * 0.3;
      const rr = c.radius * (0.88 + (rand() - 0.5) * 0.08);
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        k % 3 === 0 ? c.st.spark : shade(c.st.mid, -6),
        { life: 9, size: 0.04 + rand() * 0.015, fade: shade(c.st.deep, 12), fadeAt: 0.5 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    // The tremble: mode-2 ovalization, decaying as the note dies.
    const hum = Math.sin(c.now / 24) * Math.max(0, 1 - t * 1.5);
    const q = 0.11 * hum;
    const r0 = rPx * 0.34;
    ctx.save();
    ctx.lineCap = 'butt';
    // The mouth: bronze annulus flexing out-of-round — deep bed,
    // bronze body, bright lip, all sharing the same oval.
    const mouth = (m0: number, col: string, lw: number, al: number): void => {
      ctx.globalAlpha = al;
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.ellipse(px, py, r0 * m0 * (1 + q), r0 * m0 * (1 - q) * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    };
    mouth(1.12, shade(st.deep, -10), Math.max(4.5, sc * 0.15), 0.65 * fade);
    mouth(1.0, st.mid, Math.max(3, sc * 0.09), 0.9 * fade);
    mouth(0.88, st.spark, Math.max(1.8, sc * 0.045), 0.95 * fade);
    // Three sound rings peel off the mouth and cross the yard, each
    // shivering at the mouth's own dying pitch.
    for (let k = 0; k < 3; k++) {
      const kt = t * 1.45 - k * 0.17;
      if (kt <= 0 || kt >= 1) continue;
      const shiver = sc * 0.035 * Math.sin(c.now / 22 + k * 2.1) * (1 - kt);
      const rr = r0 + (rPx - r0) * kt + shiver;
      const al = Math.sin(kt * Math.PI);
      ctx.globalAlpha = al * 0.5;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(3.5, sc * 0.1);
      ctx.beginPath();
      ctx.ellipse(px, py, rr * 1.02, rr * 1.02 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = al * 0.9;
      ctx.strokeStyle = k === 1 ? st.core : st.mid;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The echoes: two faint rings peel a beat and two beats later,
    // on their own envelopes so they outlive the first three and
    // die at the yard's edge — the note still crossing the ground.
    for (let k = 0; k < 2; k++) {
      const kt = (t - (0.40 + k * 0.28)) / 0.5;
      if (kt <= 0 || kt >= 1) continue;
      const rr = r0 + (rPx * 1.14 - r0) * kt;
      const al = Math.sin(kt * Math.PI) * 0.45;
      ctx.globalAlpha = al * 0.55;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(3, sc * 0.08);
      ctx.beginPath();
      ctx.ellipse(px, py, rr * 1.02, rr * 1.02 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = al;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.8, sc * 0.042);
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, (0.2 + 0.35 * Math.abs(hum)) * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0xbe12);
    ctx.save();
    if (t < 0.14) {
      // The clapper: a hanging bronze tongue swings once and meets
      // the mouth — the strike that buys the whole note.
      const k = t / 0.14;
      const swing = Math.sin(k * Math.PI * 0.5) * sc * 0.42;
      const topY = py - sc * 1.15;
      const tipX = px - sc * 0.42 + swing;
      const tipY = py - sc * 0.3;
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = shade(st.deep, -8);
      ctx.lineWidth = Math.max(3.5, sc * 0.1);
      ctx.beginPath();
      ctx.moveTo(px, topY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2, sc * 0.055);
      ctx.beginPath();
      ctx.moveTo(px, topY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      ctx.ellipse(tipX, tipY, sc * 0.11, sc * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
      // Contact: the white star the ear would draw.
      if (k > 0.8) {
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = st.core;
        ctx.beginPath();
        burstStarPath(ctx, px, py - sc * 0.25, sc * 0.4, sc * 0.14, 5, k * 2, squash);
        ctx.fill();
        c.glow(c.wx, c.wy, 1.4, 0.8);
      }
    } else {
      // The hum: tremor ticks standing on the mouth rim, their height
      // the note's dying amplitude — sound made visible, then gone.
      const amp = Math.max(0, 1 - t * 1.5) * Math.abs(Math.sin(c.now / 24));
      const die = t < 0.62 ? 1 : (1 - t) / 0.38;
      for (let i = 0; i < 6; i++) {
        const a = rand() * Math.PI * 2;
        const p = pt(c, c.rPx * 0.34, a);
        const h = sc * (0.1 + 0.3 * amp);
        const w = Math.max(1.5, sc * 0.04);
        ctx.globalAlpha = 0.5 * die;
        ctx.fillStyle = st.deep;
        ctx.fillRect(p.x - w, p.y - h, w * 2, h);
        ctx.globalAlpha = 0.9 * die * (0.4 + 0.6 * amp);
        ctx.fillStyle = i % 2 === 0 ? st.core : st.spark;
        ctx.fillRect(p.x - w / 2, p.y - h, w, h);
      }
    }
    ctx.restore();
  },
};

// ----------------------------------------------------------- grindstone

/**
 * GRINDSTONE — "the peeled curl."
 * Sunder read the way a machinist reads it: armor comes off in
 * CURLS. Each beat the shield's edge bites a short bright crescent
 * into the arc, a directional fan of hot glints throws a tile and a
 * half downfield on the bounce, and four bright steel shards peel
 * forward off the bite, spinning as they go. What lasts is the
 * litter — curls that land, settle, and lie glinting in the grass
 * for eight seconds, more of them every beat, the way a real
 * grinding bench keeps its floor.
 */
const grindstone: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x6a1d);
    const bx = c.wx + Math.cos(c.dir) * c.radius * 0.6;
    const by = c.wy + Math.sin(c.dir) * c.radius * 0.6;
    // THE FAN: hot glints thrown a tile and a half downfield in a
    // tight directional spray, bouncing once off the dirt. Two
    // cohorts — the long throw and the low skip — so the fan has
    // depth instead of one flat line of dots.
    c.particles.burst(bx, by, 10, [c.st.spark, c.st.core], {
      speed: 3.2, life: 0.55, size: 0.045, gravity: 0,
      dir: c.dir, spread: 0.5, shape: 'glint',
      z: 0.1, vz: 2.0, zg: 9, land: 'bounce', bounce: 0.5,
      layer: 'world', fade: shade(c.st.spark, -18), fadeAt: 0.6, flicker: 0.35,
    });
    c.particles.burst(bx, by, 6, [c.st.core, c.st.spark], {
      speed: 2.1, life: 0.42, size: 0.035, gravity: 0,
      dir: c.dir, spread: 0.85, shape: 'glint',
      z: 0.06, vz: 0.9, zg: 10, land: 'bounce', bounce: 0.6,
      layer: 'world', fade: shade(c.st.mid, 10), fadeAt: 0.55,
    });
    // THE LITTER: four armor curls peel off the bite as bright steel
    // shards, spinning hard, and they LAND — settled, glinting for
    // eight seconds. The pile grows per beat because the world keeps
    // what landed.
    for (let k = 0; k < 4; k++) {
      const a = c.dir + (rand() - 0.5) * 1.0;
      c.particles.burst(bx, by, 1, [c.st.spark, c.st.core], {
        speed: 1.4 + rand() * 1.3, life: 8, size: 0.06, gravity: 0,
        dir: a, spread: 0.18, shape: 'shard', spin: 15,
        z: 0.14, vz: 1.8 + rand() * 1.5, zg: 8.5, land: 'settle',
        layer: 'world', flicker: 0.25,
        fade: shade(c.st.mid, 8), fadeAt: 0.55,
      });
    }
    // Fine filings lie along the bite's chord.
    for (let k = 0; k < 3; k++) {
      const a = c.dir + (rand() - 0.5) * 0.9;
      const rr = c.radius * (0.5 + rand() * 0.3);
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        c.st.spark, { life: 8, size: 0.03 + rand() * 0.015 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    const rand = srand(c.seed ^ 0x6a1e);
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    ctx.save();
    ctx.lineCap = 'butt';
    // The bite: a short crescent where the edge is working — deep
    // gouge bed under a bright abrasive lip.
    const rr = rPx * 0.6;
    const bite = (m0: number, col: string, lw: number, al: number): void => {
      ctx.globalAlpha = al;
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.ellipse(px, py, rr * m0, rr * m0 * squash, 0, dir - 0.65, dir + 0.65);
      ctx.stroke();
    };
    bite(1.0, shade(st.deep, -10), Math.max(5.5, sc * 0.18), 0.75 * fade);
    bite(0.97, st.mid, Math.max(3.5, sc * 0.105), 0.9 * fade);
    bite(1.05, st.core, Math.max(2.5, sc * 0.06), 0.95 * fade);
    // The curls: three swarf spirals peeling forward off the bite,
    // scooting outward as the beat works — each a tight double arc
    // on a deep setting, the read no other art owns.
    for (let i = 0; i < 3; i++) {
      const a = dir + (i - 1) * 0.42 + (rand() - 0.5) * 0.2;
      const p = pt(c, rPx * (0.64 + t * 0.22 + rand() * 0.06), a);
      const s = sc * (0.11 + rand() * 0.04);
      const rot = rand() * Math.PI * 2 + t * 5;
      ctx.globalAlpha = 0.6 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(3.6, sc * 0.095);
      ctx.beginPath();
      ctx.arc(p.x, p.y, s * 1.12, rot, rot + 4.4);
      ctx.stroke();
      ctx.globalAlpha = 0.95 * fade;
      ctx.strokeStyle = i === 1 ? st.core : st.spark;
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      ctx.beginPath();
      ctx.arc(p.x, p.y, s, rot, rot + 4.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.x, p.y, s * 0.55, rot + 1.4, rot + 5.6);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.5, c.wy + Math.sin(dir) * c.radius * 0.5,
      0.7, 0.3 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, dir } = c;
    // THE SPARK FAN: seven hot rays throw a tile and a half off the
    // bite point, wide and warm — the beat's loudest read.
    if (t < 0.2) {
      const k = 1 - t / 0.2;
      const rand = srand(c.seed ^ 0x6a1f);
      const b = pt(c, c.rPx * 0.6, dir);
      ctx.save();
      ctx.lineCap = 'butt';
      for (let i = 0; i < 7; i++) {
        const a = dir + (rand() - 0.5) * 1.0;
        const len = sc * (0.85 + rand() * 0.65) * k;
        ctx.globalAlpha = 0.95 * k;
        ctx.strokeStyle = i % 2 === 0 ? st.core : st.spark;
        ctx.lineWidth = Math.max(2.5, sc * 0.06);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y - sc * 0.12);
        ctx.lineTo(b.x + Math.cos(a) * len, b.y - sc * 0.12 + Math.sin(a) * len * 0.5);
        ctx.stroke();
      }
      ctx.restore();
    }
    // Grind-shed: stray filings hop off the working edge, gated.
    if (t < 0.8 && Math.random() < c.frameDt * 16) {
      c.particles.burst(c.wx + Math.cos(dir) * c.radius * 0.6, c.wy + Math.sin(dir) * c.radius * 0.6,
        1, [st.spark, st.core], {
          speed: 1.6, life: 0.4, size: 0.04, gravity: 0, dir, spread: 0.7, shape: 'glint',
          z: 0.1, vz: 1.0, zg: 9, land: 'die', layer: 'world', shadow: 0,
        });
    }
  },
};

// ------------------------------------------------------------- doorfall

/**
 * DOORFALL — "the door in the dirt."
 * Doors open both ways: this one arrives lying down. A full paneled
 * slab — rails, stiles, three hinge straps — drops flat out of the
 * sky in the blast's opening blink and lands across the ring, dust
 * blasting from under its edges, hinge-bolts flying and bouncing.
 * Then the wood forgets itself: the paint dissolves and what stays
 * is a DOOR-OUTLINE OF GRAINS lying in the dirt for nine seconds —
 * two long rails, two short ends, two hinges and one handle, in the
 * slab's own heading — the threshold nobody built.
 */
const doorfall: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0xd0e4);
    const ang = rand() * Math.PI;
    // The landing breath: slam under the slab, shove past its edges.
    dust.deployments.slam!(m, c.wx, c.wy, { scale: 0.85 });
    dust.deployments.skirt!(m, c.wx, c.wy, { radius: 0.7, scale: 0.7 });
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const at = (u: number, v: number): { x: number; y: number } => ({
      x: c.wx + u * ca - v * sa, y: c.wy + u * sa + v * ca,
    });
    // Hinge-bolts sheared loose — they shear ACROSS the slab, not in
    // a radial star, so the litter never argues with the outline.
    for (let k = 0; k < 5; k++) {
      const a = ang + Math.PI * 0.5 + (k % 2 === 0 ? 0 : Math.PI) + (rand() - 0.5) * 0.5;
      c.particles.burst(c.wx, c.wy, 1, [c.st.spark, shade(c.st.deep, 16)], {
        speed: 1.5 + rand() * 1.5, life: 8, size: 0.05, gravity: 0,
        dir: a, spread: 0.25, shape: 'square', spin: 9,
        z: 0.12, vz: 2.2 + rand() * 1.8, zg: 8.5, land: 'bounce', bounce: 0.4,
        layer: 'world', fade: shade(c.st.deep, 12), fadeAt: 0.4,
      });
    }
    // THE THRESHOLD: the door's outline laid in grains — the mark
    // that outlives the wood, and it is a RECTANGLE, never a star.
    // Two long rails walked first, then the two short ends, so the
    // slab's own shape survives even at half the grain count.
    const hw = 0.62;
    const hl = 1.0;
    const grain = (u: number, v: number, bright: boolean): void => {
      const p = at(u + (rand() - 0.5) * 0.05, v + (rand() - 0.5) * 0.05);
      lay(c, p.x, p.y, bright ? c.st.spark : shade(c.st.mid, -4),
        { life: 9.5, size: 0.04 + rand() * 0.015 });
    };
    for (let k = 0; k < 7; k++) {
      const u = -hl + (k / 6) * hl * 2;
      grain(u, -hw, k % 3 === 0); // the hinge rail
      grain(u, hw, k % 3 === 1); // the handle rail
    }
    for (let k = 1; k < 3; k++) {
      const v = -hw + (k / 3) * hw * 2;
      grain(-hl, v, false); // the head end
      grain(hl, v, false); // the foot end
    }
    // Two hinges on one long rail, a handle on the other — bright.
    const h1 = at(-hl * 0.55, -hw);
    const h2 = at(hl * 0.55, -hw);
    const hd = at(0, hw * 0.75);
    lay(c, h1.x, h1.y, c.st.spark, { life: 9.5, size: 0.055 });
    lay(c, h2.x, h2.y, c.st.spark, { life: 9.5, size: 0.055 });
    lay(c, hd.x, hd.y, c.st.core, { life: 9.5, size: 0.05 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    if (t < 0.1) return; // still in the air
    const rand = srand(c.seed ^ 0xd0e4);
    const ang = rand() * Math.PI;
    // The slab holds, then dissolves into its grain outline.
    const fade = t < 0.45 ? 1 : Math.max(0, (1 - t) / 0.55) * 0.9;
    const hw = sc * 0.62;
    const hl = sc * 1.0;
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(1, squash);
    ctx.rotate(ang);
    ctx.lineCap = 'butt';
    // Press stamp: the blunt rectangular bruise past the door's edge.
    if (t < 0.4) {
      ctx.globalAlpha = 0.4 * (1 - t / 0.4);
      ctx.strokeStyle = shade(st.deep, -12);
      ctx.lineWidth = Math.max(4, sc * 0.12);
      ctx.strokeRect(-hl * 1.12, -hw * 1.16, hl * 2.24, hw * 2.32);
    }
    // The door, lying where it fell: bed, boards, rails, hinges.
    ctx.globalAlpha = 0.7 * fade;
    ctx.fillStyle = shade(st.deep, -8);
    ctx.fillRect(-hl * 1.04, -hw * 1.06, hl * 2.08, hw * 2.12);
    ctx.globalAlpha = 0.85 * fade;
    ctx.fillStyle = st.mid;
    ctx.fillRect(-hl, -hw, hl * 2, hw * 2);
    // Two sunken panels read the carpentry.
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.strokeRect(-hl * 0.72, -hw * 0.55, hl * 0.62, hw * 1.1);
    ctx.strokeRect(hl * 0.1, -hw * 0.55, hl * 0.62, hw * 1.1);
    // Hinge straps on the hinge side, bright iron.
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = st.spark;
    ctx.fillRect(-hl * 0.62, -hw * 1.0, hl * 0.14, hw * 0.22);
    ctx.fillRect(hl * 0.48, -hw * 1.0, hl * 0.14, hw * 0.22);
    ctx.fillStyle = st.core;
    ctx.fillRect(-hl * 0.06, hw * 0.62, hl * 0.12, hw * 0.16);
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.7, 0.35 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0xd0e4);
    const ang = rand() * Math.PI;
    if (t >= 0.14) return;
    // The fall: the slab drops flat out of the sky — top face to
    // camera, growing as it comes, dead vertical.
    const k = t / 0.12;
    const drop = Math.max(0, 1 - k) * Math.max(0, 1 - k);
    const liftPx = sc * 2.6 * drop;
    const grow = 0.82 + 0.18 * Math.min(1, k);
    const hw = sc * 0.62 * grow;
    const hl = sc * 1.0 * grow;
    ctx.save();
    ctx.translate(px, py - liftPx);
    ctx.scale(1, squash);
    ctx.rotate(ang);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = shade(st.deep, -8);
    ctx.fillRect(-hl * 1.04, -hw * 1.06, hl * 2.08, hw * 2.12);
    ctx.fillStyle = st.mid;
    ctx.fillRect(-hl, -hw, hl * 2, hw * 2);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.strokeRect(-hl * 0.72, -hw * 0.55, hl * 0.62, hw * 1.1);
    ctx.strokeRect(hl * 0.1, -hw * 0.55, hl * 0.62, hw * 1.1);
    ctx.fillStyle = st.spark;
    ctx.fillRect(-hl * 0.62, -hw * 1.0, hl * 0.14, hw * 0.22);
    ctx.fillRect(hl * 0.48, -hw * 1.0, hl * 0.14, hw * 0.22);
    ctx.restore();
    // Contact: one white edge-flash the frame it meets the dirt.
    if (k > 0.85) {
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py, sc * 0.5, sc * 0.18, 4, ang, squash);
      ctx.fill();
      ctx.restore();
      c.glow(c.wx, c.wy, 1.5, 0.8);
    }
  },
};

// ------------------------------------------------------------ held_gate

/**
 * HELD_GATE — "the portcullis."
 * Nothing crosses. A full lattice gate — four spiked verticals, two
 * crossbars, hanging chains — DROPS across the corridor's waist and
 * clangs home each beat, its barred shadow striping the lane while
 * rime rails freeze along both edges toward the far mouth. The rails
 * keep grains per beat, so a held gate leaves a written border after
 * the beam lets go: the cold remembers where the line was.
 */
const held_gate: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    // The chill lane: a freezing line the corridor's whole length,
    // cold pooling at the far mouth where the shove ends.
    frost.deployments.lance!(m, c.wx, c.wy, { x2: c.wx2, y2: c.wy2, scale: 0.5 });
    frost.deployments.fog!(m,
      c.wx + (c.wx2 - c.wx) * 0.75, c.wy + (c.wy2 - c.wy) * 0.75,
      { radius: 0.7, scale: 0.45, dur: 2.2 });
    // The rails take their beat's grains — the border accumulates.
    const rand = srand(c.seed ^ 0x9a7e5);
    const dx = c.wx2 - c.wx;
    const dy = c.wy2 - c.wy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const off = Math.max(c.radius * 0.9, 0.32);
    for (let k = 0; k < 6; k++) {
      const f = 0.15 + rand() * 0.8;
      const s = k % 2 === 0 ? 1 : -1;
      lay(c, c.wx + dx * f + nx * off * s, c.wy + dy * f + ny * off * s,
        k % 3 === 0 ? c.st.core : shade(c.st.mid, 6),
        { life: 8.5, size: 0.04 + rand() * 0.015, fade: c.st.deep, fadeAt: 0.6 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const off = Math.max(c.rPx * 0.9, sc * 0.32);
    const reach = Math.min(1, t / 0.4);
    ctx.save();
    ctx.lineCap = 'butt';
    // The rails: rime freezing down both edges toward the far mouth,
    // each pale line on its deep bed (the contrast law).
    for (const s of [-1, 1] as const) {
      const x0 = px + nx * off * s;
      const y0 = py + ny * off * s;
      const x1 = x0 + dx * reach;
      const y1 = y0 + dy * reach;
      ctx.globalAlpha = 0.55 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(3, sc * 0.09);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    // The barred shadow: the gate's stripes lying on the lane — a
    // whisper on the floor, never a painted band. The story is the
    // rails' edges and the bars overhead; the floor only hints.
    const gx = px + dx * 0.5;
    const gy = py + dy * 0.5;
    ctx.globalAlpha = 0.2 * fade;
    ctx.strokeStyle = shade(st.deep, -10);
    ctx.lineWidth = Math.max(2.5, sc * 0.06);
    for (let i = 0; i < 4; i++) {
      const u = (i / 3 - 0.5) * 0.9;
      const bx = gx + nx * off * 2 * u;
      const by = gy + ny * off * 2 * u;
      ctx.beginPath();
      ctx.moveTo(bx - dx / len * sc * 0.16, by - dy / len * sc * 0.16);
      ctx.lineTo(bx + dx / len * sc * 0.16, by + dy / len * sc * 0.16);
      ctx.stroke();
    }
    ctx.restore();
    c.glow((c.wx + c.wx2) / 2, (c.wy + c.wy2) / 2, 0.9, 0.25 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const gx = px + dx * 0.5;
    const gy = py + dy * 0.5;
    const W = Math.max(c.rPx * 1.8, sc * 0.9); // half-span across the lane
    const H = sc * 1.25;
    // The drop: the lattice slides home in the beat's first fifth.
    const k = Math.min(1, t / 0.18);
    const raise = (1 - k) * (1 - k) * sc * 0.85;
    ctx.save();
    ctx.lineCap = 'butt';
    // Hanging chains to the gate's top corners.
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = shade(st.deep, -6);
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    for (const s of [-1, 1] as const) {
      const cx0 = gx + nx * W * 0.9 * s;
      const cy0 = gy + ny * W * 0.9 * s;
      ctx.beginPath();
      ctx.moveTo(cx0, cy0 - H - raise);
      ctx.lineTo(cx0, cy0 - H - raise - sc * 0.5);
      ctx.stroke();
    }
    // Four spiked verticals: deep bar then iced brass face.
    for (let i = 0; i < 4; i++) {
      const u = (i / 3 - 0.5) * 0.9;
      const bx = gx + nx * W * 2 * u * 0.5;
      const by = gy + ny * W * 2 * u * 0.5;
      const top = by - H - raise;
      const bot = by - raise + sc * 0.08; // spike tip reaching for the dirt
      ctx.globalAlpha = 0.6 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(3.2, sc * 0.09);
      ctx.beginPath();
      ctx.moveTo(bx, top);
      ctx.lineTo(bx, bot);
      ctx.stroke();
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = i % 2 === 0 ? st.mid : st.spark;
      ctx.lineWidth = Math.max(1.8, sc * 0.045);
      ctx.beginPath();
      ctx.moveTo(bx, top);
      ctx.lineTo(bx, bot);
      ctx.stroke();
    }
    // Two crossbars lace the verticals.
    for (const hf of [0.32, 0.78] as const) {
      const yb = -H * hf - raise;
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.2, sc * 0.055);
      ctx.beginPath();
      ctx.moveTo(gx - nx * W * 0.95, gy - ny * W * 0.95 + yb);
      ctx.lineTo(gx + nx * W * 0.95, gy + ny * W * 0.95 + yb);
      ctx.stroke();
    }
    // The clang: a white base-flash the frame the spikes seat.
    if (k > 0.85 && t < 0.3) {
      ctx.globalAlpha = 0.9 * (1 - (t - 0.18) / 0.12);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      ctx.beginPath();
      ctx.moveTo(gx - nx * W, gy - ny * W);
      ctx.lineTo(gx + nx * W, gy + ny * W);
      ctx.stroke();
      c.glow((c.wx + c.wx2) / 2, (c.wy + c.wy2) / 2, 1.1, 0.6);
    }
    ctx.restore();
    // Cold breath drifts off the seated bars — gated, brief.
    if (t > 0.2 && Math.random() < c.frameDt * 12) {
      c.particles.burst((c.wx + c.wx2) / 2, (c.wy + c.wy2) / 2, 1, [st.core, st.spark], {
        speed: 0.3, life: 0.6, size: 0.06, gravity: 0, shape: 'glint',
        z: 0.5 + Math.random() * 0.6, vz: -0.3, zg: 0.5, land: 'die',
        layer: 'world', shadow: 0,
      });
    }
  },
};

// ------------------------------------------------------------- sunbrass

/**
 * SUNBRASS — "the traveling polish."
 * Brass remembers the sun and hands it back: the wavefront is a
 * POLISHED ring, and riding its rim is the thing polished metal
 * alone can do — a specular flare that TRAVELS, one bright arc
 * sweeping around the circumference with its lesser twin opposite,
 * the way a turned kettle throws the lamp around the room. Radiance
 * stands in the ring, fire takes the rim, and a small sun of gold
 * grains lies stamped in the grass when the shine moves on.
 */
const sunbrass: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x5b8a);
    // The blessing and the burn: light stands, the rim ignites.
    radiance.deployments.bloom!(m, c.wx, c.wy, { scale: 0.85 });
    radiance.deployments.shafts!(m, c.wx, c.wy, { radius: c.radius * 0.5, scale: 0.8, dur: 1.8 });
    fire.deployments.ring!(m, c.wx, c.wy, { radius: c.radius * 0.85, scale: 0.5, dur: 1.5 });
    // The stamp: a small sun — disc of grains and four rays — lying
    // where the brass was proudest.
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + rand() * 0.2;
      lay(c, c.wx + Math.cos(a) * 0.4, c.wy + Math.sin(a) * 0.4,
        k % 2 === 0 ? c.st.spark : c.st.core,
        { life: 9, size: 0.055, fade: shade(c.st.mid, -8), fadeAt: 0.55 });
    }
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      lay(c, c.wx + Math.cos(a) * 0.75, c.wy + Math.sin(a) * 0.75,
        c.st.spark, { life: 9, size: 0.05, fade: shade(c.st.mid, -8), fadeAt: 0.55 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const re = rPx * (0.15 + 0.9 * Math.min(1, t * 1.25));
    ctx.save();
    ctx.lineCap = 'butt';
    // The gilded court: interior wash while the wave is young.
    if (t < 0.45) {
      ctx.globalAlpha = 0.22 * (1 - t / 0.45);
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.ellipse(px, py, re * 0.95, re * 0.95 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // The wavefront: deep bed, brass body, white seam.
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = shade(st.deep, -8);
    ctx.lineWidth = Math.max(6, sc * 0.2);
    ctx.beginPath();
    ctx.ellipse(px, py, re, re * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(3.6, sc * 0.115);
    ctx.beginPath();
    ctx.ellipse(px, py, re * 0.98, re * 0.98 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.beginPath();
    ctx.ellipse(px, py, re * 0.92, re * 0.92 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // THE POLISH: the specular flare sweeping the rim, and its
    // lesser twin chasing from the far side — hot arc segments
    // whose position is the wall clock's, not the cast's.
    const aP = c.now / 170;
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(4.5, sc * 0.14);
    ctx.beginPath();
    ctx.ellipse(px, py, re * 0.98, re * 0.98 * squash, 0, aP, aP + 1.05);
    ctx.stroke();
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(3, sc * 0.09);
    ctx.beginPath();
    ctx.ellipse(px, py, re * 0.98, re * 0.98 * squash, 0, aP + Math.PI, aP + Math.PI + 0.55);
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.9, (0.3 + 0.25 * (1 - t)) * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    if (t >= 0.18) return;
    // The catch: the instant the face takes the sun — an eight-point
    // flare star over one hard horizontal glint line.
    const k = 1 - t / 0.18;
    ctx.save();
    ctx.globalAlpha = 0.55 * k;
    ctx.fillStyle = st.spark;
    ctx.beginPath();
    burstStarPath(ctx, px, py - sc * 0.45, sc * (0.55 + 0.25 * k), sc * 0.16, 8, 0.2, squash);
    ctx.fill();
    ctx.globalAlpha = 0.95 * k;
    ctx.fillStyle = st.core;
    ctx.beginPath();
    burstStarPath(ctx, px, py - sc * 0.45, sc * (0.36 + 0.18 * k), sc * 0.1, 8, 0.2, squash);
    ctx.fill();
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.beginPath();
    ctx.moveTo(px - sc * 1.1 * k, py - sc * 0.45);
    ctx.lineTo(px + sc * 1.1 * k, py - sc * 0.45);
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx, c.wy, 1.5, 0.8 * k);
  },
};

// ------------------------------------------------------------- millwall

/**
 * MILLWALL — "the turning spokes."
 * The wheel turns and the walls go with it: four SHORT masonry
 * wall-segments orbit the caster out at the rim on the wall clock —
 * continuous across beats — passing BEHIND the body when they swing
 * upfield and IN FRONT when they come around (the ground hook takes
 * the far half, the air hook the near). They never meet at the hub,
 * so four walls read as four walls and never fuse into one bar
 * through the middle. Each beat one segment SLAPS outward, kicking
 * dust off its outer tip, and the rim wears a little more: a worn
 * dashed track grooves the circle and keeps grains where the work
 * was done. The court itself stays unpainted — no disc, ever.
 */
function millSpoke(
  c: SigCtx, ak: number, hot: boolean, fade: number,
): void {
  const { ctx, st, sc, squash, px, py, rPx } = c;
  const ri = rPx * 0.56;
  const ro = rPx * 0.98;
  const h = sc * 0.5;
  const x1 = px + Math.cos(ak) * ri;
  const y1 = py + Math.sin(ak) * ri * squash;
  const x2 = px + Math.cos(ak) * ro;
  const y2 = py + Math.sin(ak) * ro * squash;
  // The bed: the segment's dark body, a wall standing in its own
  // shadow. Deep so the pale coping above it has something to sit on.
  ctx.globalAlpha = (hot ? 0.9 : 0.78) * fade;
  ctx.fillStyle = shade(st.deep, hot ? 16 : 8);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x2, y2 - h);
  ctx.lineTo(x1, y1 - h);
  ctx.closePath();
  ctx.fill();
  // Coping: the pale top edge — the wall's whole story, and heavy
  // enough to hold it at any zoom.
  ctx.globalAlpha = 0.95 * fade;
  ctx.strokeStyle = hot ? st.core : st.spark;
  ctx.lineWidth = Math.max(2.5, sc * 0.06);
  ctx.beginPath();
  ctx.moveTo(x1, y1 - h);
  ctx.lineTo(x2, y2 - h);
  ctx.stroke();
  // Two end stiles: the segment's cut ends, so each wall is plainly
  // a wall of finite length and not a spoke reaching for the hub.
  ctx.globalAlpha = 0.85 * fade;
  ctx.strokeStyle = st.mid;
  ctx.lineWidth = Math.max(2.5, sc * 0.055);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1, y1 - h);
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2, y2 - h);
  ctx.stroke();
  // One mortar course line across the face.
  ctx.globalAlpha = 0.5 * fade;
  ctx.strokeStyle = st.deep;
  ctx.lineWidth = Math.max(1.5, sc * 0.035);
  ctx.beginPath();
  ctx.moveTo(x1, y1 - h * 0.5);
  ctx.lineTo(x2, y2 - h * 0.5);
  ctx.stroke();
}

const millwall: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x311d);
    const rot = posRand(c, 0x311d)() * Math.PI * 2;
    // This beat's slap: one spoke, chosen by the beat, throws earth
    // outward from its outer end — the knockback's argument.
    const slap = c.seed & 3;
    const ak = c.now / 650 + rot + slap * Math.PI * 0.5;
    const ox = c.wx + Math.cos(ak) * c.radius * 0.98;
    const oy = c.wy + Math.sin(ak) * c.radius * 0.98;
    // The tip kicks: dust thrown off the OUTER end of the slapping
    // wall, where a turning wall actually meets the ground.
    dust.deployments.kick!(m, ox, oy, { scale: 0.7 });
    dust.deployments.gouge!(m, ox, oy, { dir: ak, scale: 0.6 });
    // Masonry crumbs off the working wall — they land and stay.
    for (let k = 0; k < 3; k++) {
      c.particles.burst(ox, oy, 1, [shade(c.st.deep, 14), shade(c.st.mid, -10)], {
        speed: 1.2 + rand() * 1.2, life: 7, size: 0.05, gravity: 0,
        dir: ak, spread: 0.5, shape: 'shard', spin: 8,
        z: 0.4, vz: 1.6 + rand() * 1.2, zg: 8.5, land: 'bounce', bounce: 0.35,
        layer: 'world', fade: shade(c.st.deep, 10), fadeAt: 0.4,
      });
    }
    // The track wears: grains ground into the circle near the slap.
    for (let k = 0; k < 3; k++) {
      const a = ak + (rand() - 0.5) * 0.7;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.94, c.wy + Math.sin(a) * c.radius * 0.94,
        k === 0 ? c.st.spark : shade(c.st.mid, -6),
        { life: 9, size: 0.04 + rand() * 0.015 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const rot = posRand(c, 0x311d)() * Math.PI * 2;
    const slap = c.seed & 3;
    ctx.save();
    ctx.lineCap = 'butt';
    // The millstone track: a worn dashed groove on the circle — the
    // ONE painted mark on the court floor, and it is a rim, not a
    // disc. Nothing fills the middle; the walls own the read.
    ctx.globalAlpha = 0.2 * fade;
    ctx.strokeStyle = shade(st.deep, -10);
    ctx.lineWidth = Math.max(3, sc * 0.09);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.94, rPx * 0.94 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.6, sc * 0.04);
    ctx.setLineDash([sc * 0.12, sc * 0.16]);
    ctx.lineDashOffset = -c.now / 45;
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.94, rPx * 0.94 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // The far spokes: walls swinging behind the body paint UNDER the
    // y-sorted world, so the wheel truly wraps its miller.
    for (let k = 0; k < 4; k++) {
      const ak = c.now / 650 + rot + k * Math.PI * 0.5;
      if (Math.sin(ak) < 0) millSpoke(c, ak, k === slap && t < 0.25, fade);
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.7, 0.14 * fade);
  },
  air(c) {
    const { ctx, t } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const rot = posRand(c, 0x311d)() * Math.PI * 2;
    const slap = c.seed & 3;
    ctx.save();
    // The near spokes: walls coming around the front pass OVER.
    for (let k = 0; k < 4; k++) {
      const ak = c.now / 650 + rot + k * Math.PI * 0.5;
      if (Math.sin(ak) >= 0) millSpoke(c, ak, k === slap && t < 0.25, fade);
    }
    ctx.restore();
    // Grit off the turning rim — gated, low.
    if (Math.random() < c.frameDt * 10) {
      const a = c.now / 650 + rot + Math.floor(Math.random() * 4) * Math.PI * 0.5;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.9, c.wy + Math.sin(a) * c.radius * 0.9,
        1, [c.st.spark, c.st.mid], {
          speed: 0.8, life: 0.5, size: 0.05, gravity: 0, dir: a, spread: 0.4,
          shape: 'square', z: 0.3, vz: 0.6, zg: 6, land: 'die', layer: 'world', shadow: 0,
        });
    }
  },
};

// ----------------------------------------------------------- anchorfall

/**
 * ANCHORFALL — "the parted sea."
 * The school showpiece. The descent is an ANCHOR going down — a
 * brass shank, stock, and twin flukes falling ahead of the caster
 * with a chain of alternating links paying out behind, while below
 * two swell-arcs bulge away from the landing point: the water
 * noticing. The landing parts the sea — undertow hauled into the
 * eye, two true rain-curtains standing as walls to either side,
 * painted banks with foam lips flanking one dry lane — and the
 * anchor stamps its glyph in the dirt: brass strokes first, then
 * nine seconds of grains. Cold fog pools in the lane; the sea keeps
 * two wet grain-rails long after it closes.
 */
const anchorfall: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0xa4c2);
    const A = rand() * Math.PI; // the lane's heading
    const nxT = -Math.sin(A);
    const nyT = Math.cos(A);
    // The landing: earth first, then the sea's answer.
    dust.deployments.slam!(m, c.wx, c.wy, { scale: 0.7 });
    water.deployments.undertow!(m, c.wx, c.wy, { radius: c.radius * 0.9, scale: 0.9, dur: 1.4 });
    // THE PARTING: two curtains of true falling water flank the lane.
    for (const s of [-1, 1] as const) {
      water.deployments.curtain!(m,
        c.wx + nxT * c.radius * 0.7 * s, c.wy + nyT * c.radius * 0.7 * s,
        { radius: 0.5, scale: 0.8, dur: 1.8 });
    }
    // The chill: cold pooling in the dry lane.
    frost.deployments.fog!(m, c.wx, c.wy, { radius: 0.6, scale: 0.5, dur: 2.2 });
    // THE STAMP: the anchor's glyph laid in grains along the lane.
    const at = (u: number, v: number): { x: number; y: number } => ({
      x: c.wx + Math.cos(A) * u + nxT * v, y: c.wy + Math.sin(A) * u + nyT * v,
    });
    const glyph: Array<[number, number, boolean]> = [
      [0.45, 0, true], [0.2, 0, false], [-0.05, 0, false], [-0.3, 0, true], // shank
      [0.45, -0.22, false], [0.45, 0.22, false], // stock
      [-0.42, -0.3, true], [-0.42, 0.3, true], // fluke tips
    ];
    for (const [u, v, hot] of glyph) {
      const p = at(u, v);
      lay(c, p.x, p.y, hot ? c.st.spark : shade(c.st.mid, -4), { life: 9.5, size: 0.07 });
    }
    // The wet rails: where the walls stood, the ground stays dark.
    for (let k = 0; k < 12; k++) {
      const s = k % 2 === 0 ? 1 : -1;
      const u = (rand() - 0.5) * c.radius * 1.7;
      const p = at(u, c.radius * 0.72 * s + (rand() - 0.5) * 0.1);
      lay(c, p.x, p.y, k % 4 === 0 ? shade(c.st.mid, -10) : c.st.deep,
        { life: 8.5, size: 0.05 + rand() * 0.025 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    if (c.kind === 'dash') {
      // The sea notices: two swell-arcs bulge away from the landing
      // point, growing as the anchor comes down.
      const k = Math.min(1, t * 1.3);
      ctx.save();
      ctx.lineCap = 'butt';
      for (const s of [-1, 1] as const) {
        const rr = sc * (0.35 + 0.45 * k);
        ctx.globalAlpha = 0.6 * k;
        ctx.strokeStyle = st.deep;
        ctx.lineWidth = Math.max(3, sc * 0.09);
        ctx.beginPath();
        ctx.ellipse(c.px2, c.py2, rr, rr * squash, 0, s > 0 ? -0.7 : Math.PI - 0.7, s > 0 ? 0.7 : Math.PI + 0.7);
        ctx.stroke();
        ctx.globalAlpha = 0.85 * k;
        ctx.strokeStyle = st.core;
        ctx.lineWidth = Math.max(1.6, sc * 0.04);
        ctx.beginPath();
        ctx.ellipse(c.px2, c.py2, rr * 0.94, rr * 0.94 * squash, 0, s > 0 ? -0.7 : Math.PI - 0.7, s > 0 ? 0.7 : Math.PI + 0.7);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    if (c.kind !== 'blast') return;
    const rand = srand(c.seed ^ 0xa4c2);
    const A = rand() * Math.PI;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const ca = Math.cos(A);
    const sa = Math.sin(A) * squash;
    const nx = -Math.sin(A);
    const ny = Math.cos(A) * squash;
    const L = c.rPx * 0.95;
    ctx.save();
    ctx.lineCap = 'butt';
    // The banks: two heavy water bands flanking the dry lane, each
    // with a foam lip on its inner edge.
    for (const s of [-1, 1] as const) {
      const off = c.rPx * 0.62 * s;
      ctx.globalAlpha = 0.6 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(8, sc * 0.3);
      ctx.beginPath();
      ctx.moveTo(px - ca * L + nx * off, py - sa * L + ny * off);
      ctx.lineTo(px + ca * L + nx * off, py + sa * L + ny * off);
      ctx.stroke();
      ctx.globalAlpha = 0.65 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(4.5, sc * 0.16);
      ctx.beginPath();
      ctx.moveTo(px - ca * L * 0.95 + nx * off, py - sa * L * 0.95 + ny * off);
      ctx.lineTo(px + ca * L * 0.95 + nx * off, py + sa * L * 0.95 + ny * off);
      ctx.stroke();
      // The foam lip: dashed white on the lane side.
      const lip = c.rPx * 0.4 * s;
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.8, sc * 0.045);
      ctx.setLineDash([sc * 0.14, sc * 0.1]);
      ctx.lineDashOffset = s * c.now / 40;
      ctx.beginPath();
      ctx.moveTo(px - ca * L * 0.9 + nx * lip, py - sa * L * 0.9 + ny * lip);
      ctx.lineTo(px + ca * L * 0.9 + nx * lip, py + sa * L * 0.9 + ny * lip);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // The anchor, bold in the dry lane: deep setting, brass strokes.
    const seg = (u0: number, v0: number, u1: number, v1: number): void => {
      ctx.beginPath();
      ctx.moveTo(px + ca * sc * u0 + nx * sc * v0, py + sa * sc * u0 + ny * sc * v0);
      ctx.lineTo(px + ca * sc * u1 + nx * sc * v1, py + sa * sc * u1 + ny * sc * v1);
      ctx.stroke();
    };
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalAlpha = (pass === 0 ? 0.7 : 0.95) * fade;
      ctx.strokeStyle = pass === 0 ? shade(st.deep, -12) : st.spark;
      ctx.lineWidth = Math.max(pass === 0 ? 4.4 : 2.2, sc * (pass === 0 ? 0.12 : 0.055));
      seg(0.48, 0, -0.34, 0); // shank
      seg(0.48, -0.24, 0.48, 0.24); // stock
      seg(-0.34, 0, -0.46, -0.3); // fluke arms
      seg(-0.34, 0, -0.46, 0.3);
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius, 0.4 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    if (c.kind === 'dash') {
      // The descent: the anchor leads, the chain pays out behind —
      // alternating links, each read twice (deep then brass).
      const lift = (f: number): number => sc * (1.25 - f) * 1.5;
      const hx = px + (px2 - px) * t;
      const hy = py + (py2 - py) * t - lift(t);
      ctx.save();
      ctx.lineCap = 'butt';
      for (let i = 1; i <= 6; i++) {
        const f = t - i * 0.055;
        if (f <= 0) continue;
        const lx = px + (px2 - px) * f;
        const ly = py + (py2 - py) * f - lift(f) - sc * 0.15;
        const along = i % 2 === 0;
        for (let pass = 0; pass < 2; pass++) {
          ctx.globalAlpha = pass === 0 ? 0.6 : 0.9;
          ctx.strokeStyle = pass === 0 ? st.deep : st.spark;
          ctx.lineWidth = Math.max(pass === 0 ? 2.6 : 1.5, sc * (pass === 0 ? 0.06 : 0.035));
          ctx.beginPath();
          ctx.ellipse(lx, ly, sc * (along ? 0.09 : 0.05), sc * (along ? 0.05 : 0.09), 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // The anchor under the leap: shank, stock, crown arc.
      for (let pass = 0; pass < 2; pass++) {
        ctx.globalAlpha = pass === 0 ? 0.65 : 0.95;
        ctx.strokeStyle = pass === 0 ? st.deep : st.spark;
        ctx.lineWidth = Math.max(pass === 0 ? 3.4 : 2, sc * (pass === 0 ? 0.09 : 0.05));
        ctx.beginPath();
        ctx.moveTo(hx, hy - sc * 0.28);
        ctx.lineTo(hx, hy + sc * 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(hx - sc * 0.18, hy - sc * 0.18);
        ctx.lineTo(hx + sc * 0.18, hy - sc * 0.18);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(hx, hy + sc * 0.14, sc * 0.2, 0.35, Math.PI - 0.35);
        ctx.stroke();
      }
      ctx.restore();
      // Chain glints shed along the fall — gated.
      if (Math.random() < c.frameDt * 12) {
        c.particles.burst(c.wx + (c.wx2 - c.wx) * t, c.wy + (c.wy2 - c.wy) * t, 1,
          [st.spark, st.core], {
            speed: 0.4, life: 0.4, size: 0.05, gravity: 0, shape: 'glint',
            z: (1.25 - t) * 1.5, vz: -0.6, zg: 0, land: 'die', layer: 'world', shadow: 0,
          });
      }
      return;
    }
    if (c.kind !== 'blast') return;
    const rand = srand(c.seed ^ 0xa4c2);
    const A = rand() * Math.PI;
    const ca = Math.cos(A);
    const sa = Math.sin(A) * squash;
    const nx = -Math.sin(A);
    const ny = Math.cos(A) * squash;
    // The standing walls: two sheets of sea rise, hold, and fall
    // back — filled quads with white crests, the parting itself.
    const env = t < 0.15 ? t / 0.15 : t > 0.68 ? Math.max(0, 1 - (t - 0.68) / 0.32) : 1;
    const H = sc * 1.15 * (env * env * (3 - 2 * env));
    if (H > 2) {
      const L = c.rPx * 0.85;
      ctx.save();
      for (const s of [-1, 1] as const) {
        const off = c.rPx * 0.55 * s;
        const x0 = px - ca * L + nx * off;
        const y0 = py - sa * L + ny * off;
        const x1 = px + ca * L + nx * off;
        const y1 = py + sa * L + ny * off;
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = st.deep;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x1, y1 - H * 1.06);
        ctx.lineTo(x0, y0 - H * 1.06);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = st.mid;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x1, y1 - H);
        ctx.lineTo(x0, y0 - H);
        ctx.closePath();
        ctx.fill();
        // The crest: white water riding the wall's top.
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = st.core;
        ctx.lineWidth = Math.max(2.2, sc * 0.055);
        ctx.beginPath();
        ctx.moveTo(x0, y0 - H);
        ctx.lineTo(x1, y1 - H);
        ctx.stroke();
      }
      ctx.restore();
    }
    // Arrival: the white burst the frame the sea splits.
    if (t < 0.1) {
      const k = 1 - t / 0.1;
      ctx.save();
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py, sc * (0.45 + 0.35 * (1 - k)), sc * 0.16, 5, A, squash);
      ctx.fill();
      ctx.restore();
      c.glow(c.wx, c.wy, 1.6, 0.85 * k);
    }
  },
};

// ---------------------------------------------------------- patient_wall

/**
 * PATIENT_WALL — "the mortar tap."
 * One strike at a time, and every strike is a brick LAID: each beat
 * a short wavefront ADVANCES across the arc — a heavy deep bed under
 * a pale crest, walking outward the whole beat so the step is seen,
 * not inferred — dust kicks at the feet, three masonry crumbs tumble
 * forward on true arcs, and behind the front a single brick descends
 * into its slot, takes the mason's tap (a small white star, two
 * squeezes of mortar squirting from under it) and stays. The record
 * accumulates the only way a wall ever has: pale brick marks in
 * brick-shaped clusters tracing every step-line, one more course
 * every beat, lying in the dirt eight seconds deep.
 */
const patient_wall: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0xb41c);
    const slot = c.dir + (rand() - 0.5) * 0.9; // this beat's course slot
    const fx = c.wx + Math.cos(c.dir) * c.radius * 0.55;
    const fy = c.wy + Math.sin(c.dir) * c.radius * 0.55;
    // The step's breath: dust kicked at the feet, where the course
    // is being walked.
    dust.deployments.kick!(m, fx, fy, { scale: 0.85 });
    // Crumbs tumble FORWARD of the course, riding the z-arc so the
    // beat has motion the eye can follow.
    for (let k = 0; k < 3; k++) {
      c.particles.burst(fx, fy, 1, [shade(c.st.deep, 14), shade(c.st.mid, -8)], {
        speed: 1.4 + rand() * 1.1, life: 7, size: 0.05, gravity: 0,
        dir: c.dir, spread: 0.5, shape: 'square', spin: 7,
        z: 0.12, vz: 1.7 + rand() * 1.1, zg: 8.5, land: 'bounce', bounce: 0.3,
        layer: 'world', fade: shade(c.st.deep, 10), fadeAt: 0.45,
      });
    }
    // THE COURSE RECORD: a brick-shaped cluster of PALE marks at
    // this beat's slot — four corners and a heart, plus one mortar
    // grain — so every step-line the wall walked stays readable in
    // the grass for eight seconds.
    const bu = Math.cos(slot) * c.radius * 0.58;
    const bv = Math.sin(slot) * c.radius * 0.58;
    const tx = -Math.sin(slot);
    const ty = Math.cos(slot);
    for (const [du, dv] of [[-0.11, -0.055], [0.11, -0.055], [0.11, 0.055], [-0.11, 0.055], [0, 0]] as const) {
      lay(c, c.wx + bu + tx * du + Math.cos(slot) * dv, c.wy + bv + ty * du + Math.sin(slot) * dv,
        du === 0 ? c.st.spark : shade(c.st.mid, -4),
        { life: 8.5, size: 0.04 + rand() * 0.012 });
    }
    lay(c, c.wx + bu, c.wy + bv + 0.09, shade(c.st.deep, 14), { life: 8, size: 0.035 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    const rand = srand(c.seed ^ 0xb41c);
    const slot = dir + (rand() - 0.5) * 0.9; // SAME walk as spawn
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE STEP WAVEFRONT: a short arc that visibly ADVANCES across
    // the beat — from the caster's shoulder out past the course —
    // heavy deep bed, masonry body, pale crest riding the lead edge.
    const adv = Math.min(1, t / 0.55);
    const rr = rPx * (0.42 + 0.5 * (adv * adv * (3 - 2 * adv)));
    const front = (m0: number, col: string, lw: number, al: number): void => {
      ctx.globalAlpha = al;
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.ellipse(px, py, rr * m0, rr * m0 * squash, 0, dir - 0.6, dir + 0.6);
      ctx.stroke();
    };
    front(1.0, shade(st.deep, -8), Math.max(6, sc * 0.19), 0.75 * fade);
    front(0.97, st.mid, Math.max(4, sc * 0.115), 0.9 * fade);
    front(1.07, st.core, Math.max(2.5, sc * 0.06), 0.9 * fade);
    // THE BRICK: descends into its slot in the first fifth, then
    // sits — side face, lit top plane, deep setting under both.
    const bp = pt(c, rPx * 0.58, slot);
    const k = Math.min(1, t / 0.2);
    const drop = (1 - k) * (1 - k) * sc * 0.5;
    const bw = sc * 0.24;
    const bh = sc * 0.11;
    const topH = sc * 0.07 * squash;
    ctx.globalAlpha = 0.7 * fade;
    ctx.fillStyle = shade(st.deep, -10);
    ctx.fillRect(bp.x - bw * 0.6, bp.y - drop - bh - topH * 1.4, bw * 1.2, bh + topH * 1.8);
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = st.mid;
    ctx.fillRect(bp.x - bw * 0.5, bp.y - drop - bh, bw, bh);
    ctx.fillStyle = st.spark;
    ctx.beginPath();
    ctx.ellipse(bp.x, bp.y - drop - bh, bw * 0.5, topH, 0, 0, Math.PI * 2);
    ctx.fill();
    // The squeeze: mortar squirts sideways as the brick seats.
    if (t > 0.18 && t < 0.5) {
      const sq = 1 - (t - 0.18) / 0.32;
      ctx.globalAlpha = 0.8 * sq;
      ctx.strokeStyle = shade(st.deep, 18);
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(bp.x - bw * 0.5, bp.y + sc * 0.01);
      ctx.lineTo(bp.x - bw * (0.5 + 0.2 * (1 - sq)), bp.y + sc * 0.03);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bp.x + bw * 0.5, bp.y + sc * 0.01);
      ctx.lineTo(bp.x + bw * (0.5 + 0.2 * (1 - sq)), bp.y + sc * 0.03);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.5, c.wy + Math.sin(dir) * c.radius * 0.5,
      0.6, 0.25 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash } = c;
    // The tap: the mason's small white star at the seating moment.
    if (t > 0.18 && t < 0.3) {
      const rand = srand(c.seed ^ 0xb41c);
      const slot = c.dir + (rand() - 0.5) * 0.9;
      const bp = pt(c, c.rPx * 0.58, slot);
      const k = 1 - (t - 0.18) / 0.12;
      ctx.save();
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, bp.x, bp.y - sc * 0.18, sc * 0.16 + sc * 0.08 * k, sc * 0.06, 4, slot, squash);
      ctx.fill();
      ctx.restore();
      c.glow(c.wx + Math.cos(slot) * c.radius * 0.58, c.wy + Math.sin(slot) * c.radius * 0.58,
        0.5, 0.35 * k);
    }
    // Grit drifting off the fresh course — gated, sparse.
    if (t < 0.7 && Math.random() < c.frameDt * 8) {
      c.particles.burst(c.wx + Math.cos(c.dir) * c.radius * 0.55, c.wy + Math.sin(c.dir) * c.radius * 0.55,
        1, [st.spark, shade(st.deep, 14)], {
          speed: 0.5, life: 0.5, size: 0.045, gravity: 0, shape: 'square',
          z: 0.15, vz: 0.8, zg: 7, land: 'die', layer: 'world', shadow: 0,
        });
    }
  },
};

// ---------------------------------------------------------- standing_sun

/**
 * STANDING_SUN — "the planted standard."
 * Plant the light. A standard pole drives down out of the sky and
 * STRIKES the ring's heart — brass shaft, sun-disc finial with four
 * rays — and from its head a pennant of light unfurls and waves at
 * altitude on the wall clock's wind. The rim takes fire, radiance
 * stands in the court, the socket presses six rays into the dirt,
 * and when the day gutters out an ember ring and four gold ray
 * grains hold the claim for eight seconds. Burn where it stands;
 * be moved by it.
 */
const standing_sun: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x57d5);
    // The court lights: rising blessing, a crown at the pole's head,
    // fire at the rim, the shove's dust.
    radiance.deployments.bloom!(m, c.wx, c.wy, { scale: 0.7 });
    radiance.deployments.halo!(m, c.wx, c.wy, { radius: 0.45, dur: 2.2 });
    fire.deployments.ring!(m, c.wx, c.wy, { radius: c.radius * 0.88, scale: 0.55, dur: 1.6 });
    dust.deployments.skirt!(m, c.wx, c.wy, { radius: 0.5, scale: 0.7 });
    // The claim: an ember ring and four gold rays, lying.
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + rand() * 0.25;
      const rr = c.radius * (0.86 + (rand() - 0.5) * 0.06);
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        k % 2 === 0 ? c.st.spark : shade(c.st.deep, 14),
        { life: 8, size: 0.04 + rand() * 0.015, fade: shade(c.st.deep, 8), fadeAt: 0.6 });
    }
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.79;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.4, c.wy + Math.sin(a) * c.radius * 0.4,
        c.st.core, { life: 8.5, size: 0.05, fade: c.st.spark, fadeAt: 0.5 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const rand = srand(c.seed ^ 0x57d6);
    ctx.save();
    ctx.lineCap = 'butt';
    // The gilded court: a wash annulus while the day is young.
    if (t < 0.5) {
      ctx.globalAlpha = 0.25 * (1 - t / 0.5);
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.9, rPx * 0.9 * squash, 0, 0, Math.PI * 2);
      ctx.ellipse(px, py, rPx * 0.3, rPx * 0.3 * squash, 0, Math.PI * 2, 0, true);
      ctx.fill();
    }
    // The socket: a bright collar where the pole took the ground,
    // six press-rays radiating — the plant, not a crater.
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(3.5, sc * 0.1);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.2, rPx * 0.2 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1.8, sc * 0.045);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.17, rPx * 0.17 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rand() * 0.2;
      const p0 = pt(c, rPx * 0.24, a);
      const p1 = pt(c, rPx * (0.38 + rand() * 0.1), a);
      ctx.globalAlpha = 0.65 * fade;
      ctx.strokeStyle = shade(st.deep, -8);
      ctx.lineWidth = Math.max(2.2, sc * 0.055);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.9, 0.35 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const H = sc * 2.15;
    // The strike: the pole descends dead vertical in the first
    // seventh; then it STANDS, and the day holds until the gutter.
    const k = Math.min(1, t / 0.14);
    const botY = py - (1 - k) * (1 - k) * H;
    const topY = botY - H;
    const gutter = t < 0.8 ? 1 : (1 - t) / 0.2;
    ctx.save();
    ctx.lineCap = 'butt';
    // The shaft: deep bed, brass body.
    ctx.globalAlpha = 0.7 * gutter;
    ctx.strokeStyle = shade(st.deep, -8);
    ctx.lineWidth = Math.max(4, sc * 0.11);
    ctx.beginPath();
    ctx.moveTo(px, topY);
    ctx.lineTo(px, botY);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * gutter;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.moveTo(px, topY);
    ctx.lineTo(px, botY);
    ctx.stroke();
    // The finial: a small sun — disc and four hard rays.
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.ellipse(px, topY, sc * 0.1, sc * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * sc * 0.13, topY + Math.sin(a) * sc * 0.13);
      ctx.lineTo(px + Math.cos(a) * sc * 0.22, topY + Math.sin(a) * sc * 0.22);
      ctx.stroke();
    }
    // THE PENNANT: unfurls from the head after the strike, waving on
    // the wall clock; at the gutter it droops before it goes.
    const unfurl = Math.max(0, Math.min(1, (t - 0.15) / 0.2));
    if (unfurl > 0) {
      const L = sc * 0.95 * unfurl;
      const wave = Math.sin(c.now / 140) * sc * 0.1 * unfurl;
      const droop = (1 - gutter) * sc * 0.3;
      const ax = px;
      const ay = topY + sc * 0.12;
      const tipX = ax + L;
      const tipY = ay + sc * 0.1 + wave + droop;
      ctx.globalAlpha = 0.6 * gutter;
      ctx.fillStyle = shade(st.deep, -6);
      ctx.beginPath();
      ctx.moveTo(ax, ay - sc * 0.02);
      ctx.lineTo(tipX + sc * 0.03, tipY);
      ctx.lineTo(ax, ay + sc * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.92 * gutter;
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(ax, ay + sc * 0.26);
      ctx.closePath();
      ctx.fill();
      // One fold line: the cloth is cloth, not a wedge.
      ctx.globalAlpha = 0.7 * gutter;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.moveTo(ax, ay + sc * 0.13);
      ctx.lineTo(ax + L * 0.65, ay + sc * 0.13 + wave * 0.6);
      ctx.stroke();
    }
    // The strike flash.
    if (k > 0.85 && t < 0.2) {
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py, sc * 0.45, sc * 0.16, 6, 0.3, squash);
      ctx.fill();
      c.glow(c.wx, c.wy, 1.6, 0.85);
    }
    ctx.restore();
  },
};

// ------------------------------------------------------------ winterhold

/**
 * WINTERHOLD — "the compass towers."
 * The capper: the court freezes and the cold GARRISONS it. Four ice
 * towers stand at the compass points — position-hashed, so they hold
 * their ground beat after beat while the channel lives — dark face
 * north, lit face south, a glimmer breathing in each on its own
 * clock. Nothing is drawn BETWEEN them: no scaffold, no court line,
 * only each tower's own small rime footing, and the thinnest breath
 * of fog at the center. Every beat one tower answers the roll with a
 * small shatter and leaves rime grains at its foot, so the court
 * whitens as the watch wears on — four spires and clear air.
 */
const winterhold: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const pr = posRand(c, 0x1cef);
    const rot = pr() * Math.PI * 0.5;
    // The cold arrives as weather — a breath of it, not a bank. The
    // towers are the read; the middle stays clear enough to see them.
    frost.deployments.bloom!(m, c.wx, c.wy, { radius: c.radius * 0.5, scale: 0.4 });
    frost.deployments.fog!(m, c.wx, c.wy, { radius: c.radius * 0.9, scale: 0.22, dur: 2.6 });
    // This beat's answer: one tower cracks and sheds.
    const idx = c.seed & 3;
    const a = rot + idx * Math.PI * 0.5;
    const tx = c.wx + Math.cos(a) * c.radius * 0.82;
    const ty = c.wy + Math.sin(a) * c.radius * 0.82;
    frost.deployments.shatter!(m, tx, ty, { scale: 0.35 });
    // The court whitens: rime grains at the answering tower's foot.
    const rand = srand(c.seed ^ 0x1cef);
    for (let k = 0; k < 2; k++) {
      lay(c, tx + (rand() - 0.5) * 0.25, ty + (rand() - 0.5) * 0.25,
        k === 0 ? c.st.core : shade(c.st.mid, 8),
        { life: 9, size: 0.04 + rand() * 0.015, fade: c.st.deep, fadeAt: 0.65 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const pr = posRand(c, 0x1cef);
    const rot = pr() * Math.PI * 0.5;
    ctx.save();
    ctx.lineCap = 'butt';
    // NO COURT LINE: nothing is drawn between the towers. The four
    // spires hold the compass on their own; scaffolding between them
    // only clutters the ground the garrison is meant to guard.
    // Each tower's foot: a small rime disc it stands in.
    for (let k = 0; k < 4; k++) {
      const a = rot + k * Math.PI * 0.5;
      const p = pt(c, rPx * 0.82, a);
      ctx.globalAlpha = 0.55 * fade;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, sc * 0.2, sc * 0.2 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.75 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.038);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, sc * 0.16, sc * 0.16 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.85, 0.25 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const pr = posRand(c, 0x1cef);
    const rot = pr() * Math.PI * 0.5;
    const idx = c.seed & 3;
    ctx.save();
    // The towers: four standing spires, position-hashed heights, a
    // breath on the wall clock so the watch reads alive. The beat's
    // answering tower burns brighter while its shatter rings.
    for (let k = 0; k < 4; k++) {
      const hBase = sc * (0.72 + pr() * 0.33);
      const a = rot + k * Math.PI * 0.5;
      const p = pt(c, c.rPx * 0.82, a);
      const h = hBase * (1 + 0.03 * Math.sin(c.now / 280 + k * 1.9));
      const w = sc * 0.14;
      const hot = k === idx && t < 0.3;
      // Dark face, lit face, white tip — the spire's three planes.
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillStyle = shade(st.deep, hot ? 10 : 0);
      ctx.beginPath();
      ctx.moveTo(p.x - w, p.y + sc * 0.02);
      ctx.lineTo(p.x - w * 0.12, p.y - h);
      ctx.lineTo(p.x, p.y + sc * 0.03);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = hot ? st.core : st.mid;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + sc * 0.03);
      ctx.lineTo(p.x - w * 0.12, p.y - h);
      ctx.lineTo(p.x + w, p.y + sc * 0.01);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.ellipse(p.x - w * 0.12, p.y - h, w * 0.3, w * 0.22 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      // The glimmer: each tower's inner light on its own clock.
      const glim = 0.5 + 0.5 * Math.sin(c.now / 90 + k * 2.6);
      ctx.globalAlpha = glim * 0.85 * fade;
      ctx.fillStyle = k % 2 === 0 ? st.spark : st.core;
      ctx.fillRect(p.x - w * 0.18, p.y - h * 0.78, w * 0.32, h * 0.2);
    }
    ctx.restore();
    // Ice sparkle drifting between the towers — gated, sparse.
    if (Math.random() < c.frameDt * 10) {
      const a = rot + Math.floor(Math.random() * 4) * Math.PI * 0.5;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.8, c.wy + Math.sin(a) * c.radius * 0.8,
        1, [st.core, st.spark], {
          speed: 0.25, life: 0.7, size: 0.055, gravity: 0, shape: 'glint',
          z: 0.4 + Math.random() * 0.5, vz: -0.2, zg: 0.4, land: 'die',
          layer: 'world', shadow: 0, flicker: 0.3,
        });
    }
  },
};

export const SHIELD_BREATH_SIGS: Record<string, AbilitySig> = {
  iron_toll,
  grindstone,
  doorfall,
  held_gate,
  sunbrass,
  millwall,
  anchorfall,
  patient_wall,
  standing_sun,
  winterhold,
};
