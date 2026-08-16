/**
 * THE SECOND BREATH SPEAKS — THE LOOSED SKY, the archery wave.
 *
 * Ten set-pieces for the bow school's between-rung breath arts.
 * Archery's breath arts live on LANES and ALTITUDE: fletched lines
 * you can read, wind you can see working, and what falls from above.
 * Feathers, chaff, thread, and shafts are the school's own unowned
 * matter (raw bursts lawful); fire, frost, storm, dust, radiance,
 * shadow, and blood speak through the matter library and nowhere
 * else. Same binding laws as every wave: hard edges, save/restore
 * hygiene, squash on ground y-radii, srand-deterministic geometry
 * with frameDt-gated emission, ≤ ~60 path ops per hook per frame,
 * hold-then-release fades, and a lasting mark laid for every
 * aftermath.
 *
 * Wire-kind reality these hooks answer: kingshot / stringsong /
 * harrier / emberhead arrive as small 'blast's at each wound or
 * landing; hawks_hour / zenith / crowsong as 'blast' at the target
 * ring after the telegraph's fuse; winterflight / gloamshaft as
 * 'beam' corridors; skyloom as one 'bolt' per hop. Channels re-run
 * per beat with a fresh seed — crowsong roots its geometry in a
 * POSITION hash so the wheel holds still while the beats pass, and
 * every channel grows its pile through matter, never painted state.
 *
 * No centerpiece here repeats any other wave's: the coronet, the
 * plucked string, the stoop, the great quill, the coal-tipped
 * shaft, the weft through the warp, the displaced light, the
 * hairpin, the arrow of noon, the wheeling murder.
 */

import { shade } from './rig.js';
import { burstStarPath, jaggedRingPath, srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import {
  blood, dust, fire, frost, radiance, shadow as gloom, storm, asMatter,
} from './matter/index.js';

// ------------------------------------------------------------ helpers

/** Screen point r px from the heart along ground angle a. */
function pt(c: SigCtx, r: number, a: number): { x: number; y: number } {
  return { x: c.px + Math.cos(a) * r, y: c.py + Math.sin(a) * r * c.squash };
}

/**
 * THE LASTING MARK — one settled grain laid deliberately at a world
 * point: near-still, ground layer, long life. Every art's lingering
 * record goes through here so the budget stays legible.
 */
function lay(
  c: SigCtx, wx: number, wy: number, color: string,
  opts: {
    life?: number; size?: number; flicker?: number;
    fade?: string; fadeAt?: number; fade2?: string; fade2At?: number;
  } = {},
): void {
  c.particles.burst(wx, wy, 1, [color], {
    speed: 0.06, life: opts.life ?? 8.5, size: opts.size ?? 0.07,
    gravity: 0, drag: 4, layer: 'ground', flicker: opts.flicker,
    fade: opts.fade, fadeAt: opts.fadeAt,
    fade2: opts.fade2, fade2At: opts.fade2At,
  });
}

/**
 * The lane fiction: a wound-wire carries no heading, so the shot's
 * line is a seeded angle — deterministic per cast, honest enough
 * for a school that thinks in lanes (fxSigsArchery precedent).
 */
function entryAngle(c: SigCtx, salt: number): number {
  return srand(c.seed ^ salt)() * Math.PI * 2;
}

/**
 * The channel anchor: geometry derived from WHERE, not from the
 * per-beat seed — a channel re-broadcasts its wire every beat with
 * a new seed, and this hash is what holds the set-piece still.
 */
function posSeed(c: SigCtx, salt: number): number {
  return (Math.floor(c.wx * 8) * 73) ^ (Math.floor(c.wy * 8) * 151) ^ salt;
}

/** The world's ink — crow feathers, cast shadows, spent night. */
const INK = '#1b1424';

// ------------------------------------------------------------ kingshot

/**
 * KINGSHOT — "the coronet."
 * The lane-piercing shot crowns every body it passes through: a
 * five-point gold circlet drops out of the air onto the wound and
 * rings there while the lane itself kneels — chaff bowed flat to
 * both sides of a clean seam the arrow refused to bend from. The
 * parted rails of settled chaff flank the seam for eight seconds:
 * the king's road, walked once.
 */
const kingshot: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const ang = entryAngle(c, 0xc07e);
    const rand = srand(c.seed ^ 0xc07e ^ 0x11);
    dust.deployments.kick!(m, c.wx, c.wy, { scale: 0.45 });
    // Chaff parts off both flanks of the seam — the lane kneeling.
    // Straw, not tar: fine bright stalks, dark cohort thinned.
    for (const s of [-1, 1]) {
      c.particles.burst(c.wx, c.wy, 3, [c.st.spark, c.st.mid], {
        speed: 1.5, life: 0.6, size: 0.042, gravity: 0, drag: 2.2,
        dir: ang + s * 1.15, spread: 0.4, shape: 'streak',
        z: 0.15, vz: 1.3, zg: 7, land: 'die',
      });
    }
    // True-z chaff shards thrown forward, bouncing dead on the road.
    for (let k = 0; k < 3; k++) {
      c.particles.burst(c.wx, c.wy, 1, [c.st.spark, c.st.mid], {
        speed: 1.1 + rand() * 0.9, life: 7, size: 0.05, gravity: 0,
        dir: ang + (rand() - 0.5) * 0.8, spread: 0.2, shape: 'shard',
        spin: 8, z: 0.12, vz: 2.2 + rand() * 1.6, zg: 8.5,
        land: 'bounce', bounce: 0.4, layer: 'world',
      });
    }
    // THE LASTING MARK: two rails of settled chaff flanking the seam.
    const nx = Math.cos(ang + Math.PI / 2);
    const ny = Math.sin(ang + Math.PI / 2) * 0.62;
    for (let i = 0; i < 5; i++) {
      const f = -0.65 + i * 0.33;
      for (const s of [-1, 1]) {
        lay(c,
          c.wx + Math.cos(ang) * f + nx * 0.17 * s,
          c.wy + Math.sin(ang) * f * 0.62 + ny * 0.17 * s,
          s < 0 ? c.st.spark : (i === 2 ? shade(c.st.deep, 14) : c.st.mid),
          { life: 8 + i * 0.3, size: 0.042 });
      }
    }
    c.glow(c.wx, c.wy, 0.9, 0.55);
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const ang = entryAngle(c, 0xc07e);
    const rand = srand(c.seed ^ 0xc07e ^ 0x22);
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const dx = Math.cos(ang) * sc;
    const dy = Math.sin(ang) * sc * squash;
    ctx.save();
    ctx.lineCap = 'butt';
    // The seam: the shot's line, held through and PAST the wound —
    // the arrow does not stop here. Deep bed, then the writing edge.
    const reach = Math.min(1, t / 0.22);
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(3, sc * 0.085);
    ctx.beginPath();
    ctx.moveTo(px - dx * 0.55, py - dy * 0.55);
    ctx.lineTo(px + dx * 1.3, py + dy * 1.3);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.6, sc * 0.04);
    ctx.beginPath();
    ctx.moveTo(px - dx * 0.5, py - dy * 0.5);
    ctx.lineTo(px + dx * (-0.5 + 1.75 * reach), py + dy * (-0.5 + 1.75 * reach));
    ctx.stroke();
    // The kneeling chaff: seeded ticks bowed flat away from the seam
    // on both flanks — the lane, on its knees.
    const nxp = Math.cos(ang + Math.PI / 2);
    const nyp = Math.sin(ang + Math.PI / 2) * squash;
    for (let i = 0; i < 6; i++) {
      const f = -0.5 + rand() * 1.5;
      const s = i % 2 === 0 ? 1 : -1;
      const bx = px + dx * f + nxp * sc * 0.12 * s;
      const by = py + dy * f + nyp * sc * 0.12 * s;
      const lean = ang + s * (Math.PI / 2 - 0.5 + rand() * 0.3);
      const len = sc * (0.14 + rand() * 0.1);
      ctx.globalAlpha = 0.4 * fade;
      ctx.strokeStyle = shade(st.deep, 12);
      ctx.lineWidth = Math.max(1.8, sc * 0.045);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(lean) * len, by + Math.sin(lean) * len * squash);
      ctx.stroke();
      ctx.globalAlpha = 0.8 * fade;
      ctx.strokeStyle = i % 3 === 0 ? st.spark : st.mid;
      ctx.lineWidth = Math.max(1.3, sc * 0.03);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(lean) * len * 0.85, by + Math.sin(lean) * len * 0.85 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    // THE CORONET: the circlet drops onto the wound in the first
    // 28%, rings once, and sits breathing until the wire lets go.
    const k = Math.min(1, t / 0.28);
    const ease = k * k * (3 - 2 * k);
    const h = sc * (1.55 * (1 - ease) + 0.14);
    const bob = ease >= 1 ? Math.sin(c.now / 140) * sc * 0.02 : 0;
    const cy = py - h + bob;
    const rx = sc * (0.5 - 0.08 * ease);
    const ry = rx * 0.5; // a circle in perspective
    ctx.save();
    // Band: deep setting under gold.
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(3.5, sc * 0.1);
    ctx.beginPath();
    ctx.ellipse(px, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(px, cy, rx * 0.94, ry * 0.94, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Five points on the band, each a small raised tine.
    ctx.fillStyle = st.spark;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + c.now / 2400;
      const bx = px + Math.cos(a) * rx * 0.94;
      const by = cy + Math.sin(a) * ry * 0.94;
      ctx.globalAlpha = (Math.sin(a) < 0 ? 0.95 : 0.7) * fade;
      ctx.beginPath();
      ctx.moveTo(bx - sc * 0.045, by);
      ctx.lineTo(bx, by - sc * 0.16);
      ctx.lineTo(bx + sc * 0.045, by);
      ctx.closePath();
      ctx.fill();
    }
    // The ringing: one white flash ring right as the crown seats.
    if (t > 0.28 && t < 0.42) {
      const rk = (t - 0.28) / 0.14;
      ctx.globalAlpha = (1 - rk) * 0.85;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.6, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(px, cy, rx * (1 + rk * 0.8), ry * (1 + rk * 0.8), 0, 0, Math.PI * 2);
      ctx.stroke();
      c.glow(c.wx, c.wy, 1.0, 0.6 * (1 - rk));
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- stringsong

/**
 * STRINGSONG — "the plucked string."
 * Every beat's arrow arrives still singing its bowstring: a taut
 * vertical chord of light stands through the wound and VIBRATES —
 * the fundamental and its second harmonic drawn as decaying waves —
 * while two sound-rings widen off the note and a storm-blue
 * arrowhead hangs at the top of the string like a fermata. The
 * grains it lays keep humming on the ground after the song moves on.
 */
const stringsong: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x57a6);
    // The storm arrow's charge, spoken by the library.
    storm.deployments.crackle!(m, c.wx, c.wy, { radius: 0.5, scale: 0.5 });
    // String fibers let go of the note and settle — the school's own
    // thread, thrown true.
    c.particles.burst(c.wx, c.wy, 2, [c.st.mid, shade(c.st.deep, 16)], {
      speed: 0.4, life: 5, size: 0.042, gravity: 0, shape: 'streak',
      z: 0.4, vz: 1.1, zg: 6, land: 'settle', layer: 'world', wobble: 0.4,
    });
    // THE LASTING MARK: three humming grains in a tiny arc.
    for (let i = 0; i < 3; i++) {
      const a = rand() * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * 0.22, c.wy + Math.sin(a) * 0.22 * 0.62,
        i === 0 ? c.st.core : c.st.spark,
        { life: 8, size: 0.05, flicker: 0.4 });
    }
    c.glow(c.wx, c.wy, 0.8, 0.5);
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    ctx.save();
    // Two sound-rings widening off the note — deep bed, white voice.
    for (let k = 0; k < 2; k++) {
      const kt = t * 1.45 - k * 0.24;
      if (kt <= 0 || kt >= 1) continue;
      const r = sc * (0.3 + kt * 1.1);
      const al = Math.sin(kt * Math.PI);
      ctx.globalAlpha = al * 0.45;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(3, sc * 0.085);
      ctx.beginPath();
      ctx.ellipse(px, py, r * 1.04, r * 1.04 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = al * 0.8;
      ctx.strokeStyle = k === 0 ? st.core : st.mid;
      ctx.lineWidth = Math.max(1.6, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(px, py, r, r * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, 0.7, 0.3 * (1 - t));
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0x57a6 ^ 0x33);
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const H = sc * 1.5;
    // The decay envelope: the note's amplitude dying as it rings out.
    const amp = sc * 0.17 * Math.exp(-t * 3.1);
    const phase = rand() * Math.PI * 2;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE PLUCKED STRING: fundamental mode, deep bed then white
    // chord — a polyline through nine stations of the standing wave.
    const N = 9;
    const chord = (mode: number, a0: number, col: string, lw: number, al: number): void => {
      ctx.globalAlpha = al;
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const f = i / N;
        const x = px + Math.sin(Math.PI * f * mode) * a0 * Math.sin(c.now / 42 + phase + mode);
        const y = py - f * H;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    chord(1, amp, st.deep, Math.max(3, sc * 0.075), 0.55 * fade);
    chord(1, amp, st.core, Math.max(1.6, sc * 0.036), 0.95 * fade);
    // The second harmonic: a ghost overtone, quieter and quicker.
    chord(2, amp * 0.55, st.mid, Math.max(1.2, sc * 0.026), 0.4 * fade);
    // The antinode bead: the note's belly, flickering with the hum.
    const belly = 0.75 + 0.25 * Math.sin(c.now / 60 + phase);
    ctx.globalAlpha = 0.95 * fade * belly;
    ctx.fillStyle = st.spark;
    const bs = sc * 0.06;
    ctx.fillRect(px - bs, py - H * 0.5 - bs, bs * 2, bs * 2);
    // The fermata: the storm arrowhead hanging at the string's top,
    // point down — the arrow that carried the song.
    ctx.globalAlpha = 0.9 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.moveTo(px - sc * 0.11, py - H - sc * 0.16);
    ctx.lineTo(px + sc * 0.11, py - H - sc * 0.16);
    ctx.lineTo(px, py - H + sc * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.moveTo(px - sc * 0.065, py - H - sc * 0.13);
    ctx.lineTo(px + sc * 0.065, py - H - sc * 0.13);
    ctx.lineTo(px, py - H + sc * 0.01);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },
};

// ---------------------------------------------------------- hawks_hour

/**
 * HAWKS_HOUR — "the stoop."
 * The telegraph was the wheeling wait; the blast is the strike. A
 * hawk's shadow flashes across the ring — one fast pass, ink on the
 * grass — and the stoop comes down after it: a steep diagonal dive
 * column slamming the center, three talon gouges raked out of the
 * dirt, and the hour itself ticked around the rim like a clock face.
 * Feathers knocked loose bounce and lie; the gouges stay written.
 */
const hawks_hour: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const dive = entryAngle(c, 0x4a3c);
    const rand = srand(c.seed ^ 0x4a3c ^ 0x11);
    dust.deployments.slam!(m, c.wx, c.wy, { scale: 0.85 });
    dust.deployments.gouge!(m, c.wx, c.wy, { dir: dive, scale: 0.5 });
    // Feathers knocked out of the strike — true arcs, real landings.
    // Few and fine: a scatter of quills, never one dark mass.
    for (let k = 0; k < 4; k++) {
      c.particles.burst(c.wx, c.wy, 1, [c.st.mid, c.st.spark, shade(c.st.deep, 16)], {
        speed: 1.2 + rand() * 1.4, life: 8, size: 0.05, gravity: 0,
        shape: 'shard', spin: 9, wobble: 0.4,
        z: 0.5, vz: 2.2 + rand() * 1.6, zg: 8.5,
        land: 'bounce', bounce: 0.35, layer: 'world',
      });
    }
    // THE LASTING MARK: three talon gouges raked along the dive.
    for (let g = 0; g < 3; g++) {
      const a = dive + (g - 1) * 0.45;
      for (let i = 0; i < 3; i++) {
        const d = 0.22 + i * 0.24;
        lay(c, c.wx + Math.cos(a) * d, c.wy + Math.sin(a) * d * 0.62,
          i === 2 ? c.st.mid : shade(c.st.deep, 12), { life: 9.5, size: 0.048 });
      }
    }
    c.glow(c.wx, c.wy, Math.max(1.2, c.radius * 0.8), 0.7);
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const dive = entryAngle(c, 0x4a3c);
    const rand = srand(c.seed ^ 0x4a3c ^ 0x22);
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    ctx.save();
    ctx.lineCap = 'butt';
    if (t < 0.2) {
      // THE PASSING SHADOW: the hawk crosses the ring once, fast —
      // deliberate ink, because a shadow is ink.
      const k = t / 0.2;
      const sx = px - Math.cos(dive) * rPx * (1.1 - k * 1.1);
      const sy = py - Math.sin(dive) * rPx * (1.1 - k * 1.1) * squash;
      const wing = rPx * 0.42;
      const wx = Math.cos(dive + Math.PI / 2) * wing;
      const wy = Math.sin(dive + Math.PI / 2) * wing * squash;
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.moveTo(sx - wx, sy - wy);
      ctx.quadraticCurveTo(sx - Math.cos(dive) * wing * 0.5, sy - Math.sin(dive) * wing * 0.5 * squash, sx, sy);
      ctx.quadraticCurveTo(sx - Math.cos(dive) * wing * 0.5, sy - Math.sin(dive) * wing * 0.5 * squash, sx + wx, sy + wy);
      ctx.quadraticCurveTo(sx, sy + Math.cos(dive) * wing * 0.18, sx - wx, sy - wy);
      ctx.closePath();
      ctx.fill();
      // The body and fanned tail.
      ctx.beginPath();
      ctx.ellipse(sx, sy, wing * 0.2, wing * 0.32 * squash, dive, 0, Math.PI * 2);
      ctx.fill();
    }
    // The hour: twelve ticks around the rim — the clock the hawk
    // keeps. They hold through the strike and fade with it.
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const p0 = pt(c, rPx * 0.94, a);
      const p1 = pt(c, rPx * 1.04, a);
      ctx.globalAlpha = (i % 3 === 0 ? 0.75 : 0.45) * fade;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    if (t >= 0.2) {
      // The strike's tear: a jagged ring where the ground gave.
      const k = Math.min(1, (t - 0.2) / 0.1);
      ctx.globalAlpha = 0.45 * fade * k;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      jaggedRingPath(ctx, px, py, rPx * 0.34, squash, 9, 0.24, rand() * Math.PI, c.seed ^ 7);
      ctx.fill();
      // Three talon gouges, raked and bright-edged.
      for (let g = 0; g < 3; g++) {
        const a = dive + (g - 1) * 0.45;
        const p0 = pt(c, rPx * 0.08, a);
        const p1 = pt(c, rPx * 0.42, a + (rand() - 0.5) * 0.12);
        ctx.globalAlpha = 0.8 * fade * k;
        ctx.strokeStyle = st.deep;
        ctx.lineWidth = Math.max(3, sc * 0.08);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
        ctx.globalAlpha = 0.85 * fade * k;
        ctx.strokeStyle = g === 1 ? st.spark : st.mid;
        ctx.lineWidth = Math.max(1.4, sc * 0.032);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const dive = entryAngle(c, 0x4a3c);
    ctx.save();
    if (t < 0.2) {
      // THE STOOP: the dive column — a steep diagonal taper falling
      // out of the sky behind its own shadow, accelerating.
      const k = (t / 0.2) * (t / 0.2);
      const hx = px + Math.cos(dive) * sc * 2.2 * (k - 1);
      const hy = py - sc * 2.9 * (1 - k);
      const tx = hx - Math.cos(dive) * sc * 1.1;
      const ty = hy - sc * 1.5;
      const a = Math.atan2(hy - ty, hx - tx);
      const nxp = Math.cos(a + Math.PI / 2);
      const nyp = Math.sin(a + Math.PI / 2);
      const taper = (w: number, col: string, al: number): void => {
        ctx.globalAlpha = al;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(hx + nxp * w, hy + nyp * w);
        ctx.lineTo(tx, ty);
        ctx.lineTo(hx - nxp * w, hy - nyp * w);
        ctx.closePath();
        ctx.fill();
      };
      taper(sc * 0.24, st.deep, 0.55);
      taper(sc * 0.17, st.mid, 0.85);
      taper(sc * 0.08, st.core, 0.95);
      // Folded wings raked back off the head's flanks.
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(hx + nxp * s * sc * 0.1, hy + nyp * s * sc * 0.1);
        ctx.quadraticCurveTo(
          hx - Math.cos(a) * sc * 0.3 + nxp * s * sc * 0.34,
          hy - Math.sin(a) * sc * 0.3 + nyp * s * sc * 0.34 - sc * 0.1,
          hx - Math.cos(a) * sc * 0.55 + nxp * s * sc * 0.4,
          hy - Math.sin(a) * sc * 0.55 + nyp * s * sc * 0.4 - sc * 0.05);
        ctx.stroke();
      }
      // Contact: the white star as the talons meet the dirt.
      if (k > 0.82) {
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = st.core;
        ctx.beginPath();
        burstStarPath(ctx, px, py, sc * 0.5, sc * 0.18, 5, c.now / 180, squash);
        ctx.fill();
        c.glow(c.wx, c.wy, 1.5, 0.85);
      }
    } else if (t < 0.34) {
      // The talon flash: three bright rakes lifting off the gouges.
      const k = 1 - (t - 0.2) / 0.14;
      ctx.globalAlpha = 0.85 * k;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.6, sc * 0.04);
      for (let g = 0; g < 3; g++) {
        const a = dive + (g - 1) * 0.45;
        const p1 = pt(c, sc * 0.5, a);
        ctx.beginPath();
        ctx.moveTo(px, py - sc * 0.25 * (1 - k));
        ctx.lineTo(p1.x, p1.y - sc * 0.1);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
};

// -------------------------------------------------------- winterflight

/**
 * WINTERFLIGHT — "the great quill."
 * One beat of the cold line: the corridor is written as a flight
 * feather laid down the lane, but the feather is drawn in EDGES —
 * two thin rime rails at the lane's true width with a breath of
 * cold wash between them, the quill's white spine hairline down the
 * middle, chevron barbs drifting down-lane like frost carried on
 * the shot, and the quill's point set at the far end — while the
 * arrow's pale ghost glides the length of it at altitude. Down
 * tufts drift onto the lane and settle; the rime rails the grains
 * build grow beat over beat, because the world keeps what landed.
 */
const winterflight: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const a2 = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    const rand = srand(c.seed ^ 0xf117);
    frost.deployments.lance!(m, c.wx, c.wy, { dir: a2, scale: 0.7 });
    frost.deployments.fog!(m,
      c.wx + (c.wx2 - c.wx) * 0.65, c.wy + (c.wy2 - c.wy) * 0.65,
      { radius: 0.85, scale: 0.5, dur: 2.2 });
    // Down feathers shaken off the flight — drifting, settling.
    for (let k = 0; k < 3; k++) {
      const f = 0.25 + rand() * 0.6;
      c.particles.burst(
        c.wx + (c.wx2 - c.wx) * f, c.wy + (c.wy2 - c.wy) * f, 1,
        [c.st.core, c.st.spark], {
          speed: 0.15, life: 4.5, size: 0.07, gravity: 0, shape: 'puff',
          wobble: 0.6, z: 0.9, vz: -0.15, zg: 0.5,
          land: 'settle', layer: 'world',
        });
    }
    // THE LASTING MARK: rime rails flanking the lane — they thicken
    // beat over beat, the channel's pile.
    const nx = Math.cos(a2 + Math.PI / 2);
    const ny = Math.sin(a2 + Math.PI / 2) * 0.62;
    for (let i = 0; i < 3; i++) {
      const f = 0.2 + i * 0.3;
      for (const s of [-1, 1]) {
        lay(c,
          c.wx + (c.wx2 - c.wx) * f + nx * 0.19 * s,
          c.wy + (c.wy2 - c.wy) * f + ny * 0.19 * s,
          s < 0 ? c.st.core : c.st.spark,
          { life: 8.5, size: 0.055, fade: c.st.mid, fadeAt: 0.6 });
      }
    }
    c.glow(c.wx2, c.wy2, 0.9, 0.35);
  },
  ground(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const rand = srand(c.seed ^ 0xf117 ^ 0x22);
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const reach = Math.min(1, t / 0.3);
    const ex0 = px + dx * reach;
    const ey0 = py + dy * reach;
    // THE LANE'S TRUE WIDTH: half of the wire's own 0.6-tile beam.
    const hw = sc * 0.3;
    ctx.save();
    ctx.lineCap = 'butt';
    // The breath between the rails: a wash, never a slab — bodies
    // standing in the corridor must still read through it.
    ctx.globalAlpha = 0.16 * fade;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.moveTo(px + nx * hw, py + ny * hw);
    ctx.lineTo(ex0 + nx * hw, ey0 + ny * hw);
    ctx.lineTo(ex0 - nx * hw, ey0 - ny * hw);
    ctx.lineTo(px - nx * hw, py - ny * hw);
    ctx.closePath();
    ctx.fill();
    // THE RIME RAILS: the two edges that carry the whole corridor.
    for (const s of [-1, 1]) {
      const ox = nx * hw * s;
      const oy = ny * hw * s;
      ctx.globalAlpha = 0.45 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      ctx.beginPath();
      ctx.moveTo(px + ox, py + oy);
      ctx.lineTo(ex0 + ox, ey0 + oy);
      ctx.stroke();
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = s < 0 ? st.core : st.spark;
      ctx.lineWidth = Math.max(1.5, sc * 0.032);
      ctx.beginPath();
      ctx.moveTo(px + ox, py + oy);
      ctx.lineTo(ex0 + ox, ey0 + oy);
      ctx.stroke();
    }
    // The spine: the quill's own hairline, down the middle.
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.4, sc * 0.03);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(ex0, ey0);
    ctx.stroke();
    // THE BARBS, now COLD CHEVRONS: four V's carried down-lane on the
    // shot's own draft — the vane read as motion, not as fill.
    const drift = (c.now / 900) % 1;
    for (let i = 0; i < 4; i++) {
      const f = ((drift + i * 0.25 + rand() * 0.02) % 1) * reach;
      if (f <= 0.02 || f >= reach - 0.01) continue;
      const bx = px + dx * f;
      const by = py + dy * f;
      const back = sc * 0.16;
      ctx.globalAlpha = 0.7 * fade * Math.sin(Math.min(1, f / reach) * Math.PI);
      ctx.strokeStyle = i % 2 === 0 ? st.spark : st.core;
      ctx.lineWidth = Math.max(1.3, sc * 0.028);
      ctx.beginPath();
      ctx.moveTo(bx + nx * hw * 0.92 - (dx / len) * back, by + ny * hw * 0.92 - (dy / len) * back);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx - nx * hw * 0.92 - (dx / len) * back, by - ny * hw * 0.92 - (dy / len) * back);
      ctx.stroke();
    }
    // The quill's point at the far end, once the write arrives.
    if (reach >= 1) {
      const ux = dx / len;
      const uy = dy / len;
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.moveTo(px2 + ux * sc * 0.22, py2 + uy * sc * 0.22);
      ctx.lineTo(px2 + nx * sc * 0.08, py2 + ny * sc * 0.08);
      ctx.lineTo(px2 - nx * sc * 0.08, py2 - ny * sc * 0.08);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    c.glow((c.wx + c.wx2) / 2, (c.wy + c.wy2) / 2, 1.1, 0.3 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    // The gliding ghost: the arrow's pale double runs the corridor
    // at altitude over the whole beat, and is gone at the far end.
    const f = t;
    const gx = px + dx * f;
    const gy = py + dy * f - sc * 0.5;
    const al = Math.sin(t * Math.PI);
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.globalAlpha = 0.5 * al;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(3, sc * 0.075);
    ctx.beginPath();
    ctx.moveTo(gx - ux * sc * 0.3, gy - uy * sc * 0.3);
    ctx.lineTo(gx + ux * sc * 0.24, gy + uy * sc * 0.24);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * al;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    ctx.beginPath();
    ctx.moveTo(gx - ux * sc * 0.3, gy - uy * sc * 0.3);
    ctx.lineTo(gx + ux * sc * 0.2, gy + uy * sc * 0.2);
    ctx.stroke();
    // Head and fletch of the ghost.
    ctx.globalAlpha = 0.9 * al;
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.moveTo(gx + ux * sc * 0.32, gy + uy * sc * 0.32);
    ctx.lineTo(gx + ux * sc * 0.2 + nx * sc * 0.06, gy + uy * sc * 0.2 + ny * sc * 0.06);
    ctx.lineTo(gx + ux * sc * 0.2 - nx * sc * 0.06, gy + uy * sc * 0.2 - ny * sc * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = st.spark;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(gx - ux * sc * 0.22, gy - uy * sc * 0.22);
      ctx.lineTo(gx - ux * sc * 0.34 + nx * s * sc * 0.09, gy - uy * sc * 0.34 + ny * s * sc * 0.09);
      ctx.lineTo(gx - ux * sc * 0.3, gy - uy * sc * 0.3);
      ctx.closePath();
      ctx.fill();
    }
    // Chill glints shed in the ghost's wake — gated, brief.
    if (Math.random() < c.frameDt * 14 * al) {
      c.particles.burst(c.wx + (c.wx2 - c.wx) * f, c.wy + (c.wy2 - c.wy) * f, 1,
        [st.spark, st.core], {
          speed: 0.3, life: 0.45, size: 0.06, gravity: 0.6, shape: 'glint',
        });
    }
    ctx.restore();
  },
};

// ----------------------------------------------------------- emberhead

/**
 * EMBERHEAD — "the coal-tipped shaft."
 * Each of the pair lands and STAYS: the shaft stands quivering in
 * its own scorch with the forged head buried — and the head is a
 * live coal, breathing at ground level, cooling white → orange →
 * dull through the splash's whole life until it snaps out in a last
 * star of sparks. Burn licks radiate on the dirt, gobbets arc out
 * and bounce, and the char ring keeps the landing's address.
 */
const emberhead: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0xe3b0);
    fire.deployments.burst!(m, c.wx, c.wy, { scale: 0.55 });
    fire.deployments.pool!(m, c.wx, c.wy, {
      radius: Math.max(0.5, c.radius * 0.55), scale: 0.4, dur: 2.4,
    });
    fire.deployments.gobbets!(m, c.wx, c.wy, { scale: 0.5 });
    dust.deployments.kick!(m, c.wx, c.wy, { scale: 0.35 });
    // THE LASTING MARK: a ring of scattered embers that COOL into
    // char — small and bright first, soot only at the end of the
    // ramp, so the aftermath never sits as slabs.
    for (let i = 0; i < 4; i++) {
      const a = rand() * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * 0.5, c.wy + Math.sin(a) * 0.5 * 0.62,
        i === 0 ? c.st.core : c.st.spark, {
          life: 9, size: 0.038, flicker: 0.35,
          fade: c.st.mid, fadeAt: 0.3,
          fade2: shade(c.st.deep, 12), fade2At: 0.65,
        });
    }
    c.glow(c.wx, c.wy, Math.max(1.0, c.radius * 0.8), 0.65);
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xe3b0 ^ 0x22);
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const heat = Math.max(0, 1 - t / 0.6);
    const R = Math.max(rPx * 0.75, sc * 0.6);
    ctx.save();
    // The scorch bed and its hot rim.
    ctx.globalAlpha = 0.45 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, R, R * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = (0.3 + 0.5 * heat) * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(px, py, R * 0.82, R * 0.82 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Burn licks: radiating flame tongues that die as the coal cools.
    for (let i = 0; i < 4; i++) {
      const a = rand() * Math.PI * 2;
      const p0 = pt(c, R * 0.5, a);
      const p1 = pt(c, R * (0.95 + rand() * 0.25), a);
      const licky = Math.max(0, heat - rand() * 0.3);
      if (licky <= 0) continue;
      ctx.globalAlpha = 0.8 * licky * fade;
      ctx.strokeStyle = i % 2 === 0 ? st.spark : st.core;
      ctx.lineWidth = Math.max(2, sc * (0.06 - i * 0.008));
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, Math.max(0.9, c.radius * 0.7), (0.2 + 0.4 * heat) * fade);
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0xe3b0 ^ 0x33);
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    // The standing shaft: raked by its arrival, thrumming to rest.
    const lean = (rand() - 0.5) * 0.9;
    const thrum = Math.exp(-t * 6) * Math.sin(c.now / 34) * 0.1;
    const a = lean + thrum;
    const ux = Math.sin(a);
    const uy = -Math.cos(a);
    const H = sc * 0.72;
    const tx = px + ux * H;
    const ty = py + uy * H;
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = shade(st.deep, -10);
    ctx.lineWidth = Math.max(3, sc * 0.07);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.4, sc * 0.032);
    ctx.beginPath();
    ctx.moveTo(px + ux * H * 0.1, py + uy * H * 0.1);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    // Fletch vanes at the nock, raked with the lean.
    ctx.fillStyle = st.deep;
    for (const s of [-1, 1]) {
      ctx.globalAlpha = (s < 0 ? 0.9 : 0.7) * fade;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx - ux * sc * 0.2 + s * sc * 0.11, ty - uy * sc * 0.2 - sc * 0.03);
      ctx.lineTo(tx - ux * sc * 0.26, ty - uy * sc * 0.26);
      ctx.closePath();
      ctx.fill();
    }
    // THE COAL: the buried head breathing at the shaft's foot,
    // cooling through the ramp as the splash lives out.
    const breathe = 0.72 + 0.28 * Math.sin(c.now / 70);
    const coalCol = t < 0.32 ? st.core : t < 0.66 ? st.spark : st.mid;
    const s0 = sc * 0.15 * breathe;
    ctx.globalAlpha = 0.9 * fade;
    ctx.fillStyle = st.deep;
    ctx.translate(px, py);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-s0 * 1.25, -s0 * 1.25, s0 * 2.5, s0 * 2.5);
    ctx.globalAlpha = Math.min(1, (0.55 + 0.45 * breathe)) * fade;
    ctx.fillStyle = coalCol;
    ctx.fillRect(-s0, -s0, s0 * 2, s0 * 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Heat shimmer: two slivers climbing off the coal on a loop.
    const heat = Math.max(0, 1 - t / 0.7);
    if (heat > 0) {
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.2, sc * 0.026);
      for (let i = 0; i < 2; i++) {
        const cyc = (c.now / 520 + i * 0.5) % 1;
        ctx.globalAlpha = (1 - cyc) * 0.7 * heat;
        const hx = px + (i === 0 ? -1 : 1) * sc * 0.1;
        const hy = py - sc * 0.12 - cyc * sc * 0.42;
        ctx.beginPath();
        ctx.moveTo(hx - sc * 0.03, hy + sc * 0.06);
        ctx.lineTo(hx + sc * 0.03, hy - sc * 0.06);
        ctx.stroke();
      }
    }
    // The snap: the coal goes out in one last star.
    if (t > 0.86) {
      const k = (t - 0.86) / 0.14;
      ctx.globalAlpha = (1 - k) * 0.95;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py, sc * 0.26 * (1 + k), sc * 0.09, 4, c.now / 200, c.squash);
      ctx.fill();
      c.glow(c.wx, c.wy, 0.7, 0.5 * (1 - k));
    }
    ctx.restore();
  },
};

// ------------------------------------------------------------- skyloom

/**
 * SKYLOOM — "the weft through the warp."
 * Each hop is one pass of the loom: three fine warp threads sag
 * between the two bodies, and the bolt is the WEFT — a white
 * shuttle-line shot through them that snaps the whole set taut as
 * it passes. Where the weft arrives, a loom-knot glint drops off
 * the work and lies on the ground; the storm speaks the actual
 * zap underneath through the library.
 */
const skyloom: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    storm.deployments.arc!(m, c.wx, c.wy, { x2: c.wx2, y2: c.wy2, scale: 0.7 });
    // The loom-knot: dropped at the far anchor, settling where tied.
    c.particles.burst(c.wx2, c.wy2, 1, [c.st.spark], {
      speed: 0.15, life: 6, size: 0.09, gravity: 0, shape: 'glint',
      flicker: 0.3, z: 0.7, vz: 0.4, zg: 3.5, land: 'settle', layer: 'world',
    });
    // Thread fibers off the pass, drifting down mid-span.
    c.particles.burst(
      (c.wx + c.wx2) / 2, (c.wy + c.wy2) / 2, 2,
      [shade(c.st.deep, 14), c.st.mid], {
        speed: 0.25, life: 3.5, size: 0.055, gravity: 0, shape: 'streak',
        wobble: 0.5, z: 0.6, vz: 0.2, zg: 1.6, land: 'die', layer: 'world',
      });
    // THE LASTING MARK: two tied-off grains at the anchor.
    lay(c, c.wx2 + 0.12, c.wy2 + 0.06, c.st.spark, { life: 7.5, size: 0.055, flicker: 0.25 });
    lay(c, c.wx2 - 0.1, c.wy2 + 0.1, c.st.mid, { life: 7, size: 0.05 });
    c.glow(c.wx2, c.wy2, 0.8, 0.45);
  },
  ground(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const fade = 1 - t;
    ctx.save();
    ctx.lineCap = 'butt';
    // The work's shadow on the dirt, and cross ticks at both anchors.
    ctx.globalAlpha = 0.25 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.moveTo(px, py + sc * 0.08);
    ctx.lineTo(px2, py2 + sc * 0.08);
    ctx.stroke();
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    for (const [ax, ay] of [[px, py], [px2, py2]] as const) {
      ctx.beginPath();
      ctx.moveTo(ax - sc * 0.09, ay);
      ctx.lineTo(ax + sc * 0.09, ay);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ax, ay - sc * 0.06);
      ctx.lineTo(ax, ay + sc * 0.06);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const lift = sc * 0.45;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    // The pass pulls the warp taut: sag dies as the weft crosses.
    const taut = Math.min(1, t / 0.42);
    const sag = len * 0.085 * (1.1 - taut * 0.9);
    ctx.save();
    ctx.lineCap = 'butt';
    // THE WARP: three fine threads sagging between the bodies —
    // the middle one on a deep bed so the set reads against sky.
    for (let i = -1; i <= 1; i++) {
      const ox = nx * sc * 0.1 * i;
      const oy = ny * sc * 0.1 * i;
      const mx = px + dx * 0.5 + ox;
      const my = py + dy * 0.5 + oy - lift + sag * (1 + Math.abs(i) * 0.25);
      if (i === 0) {
        ctx.globalAlpha = 0.5 * fade;
        ctx.strokeStyle = st.deep;
        ctx.lineWidth = Math.max(2.6, sc * 0.06);
        ctx.beginPath();
        ctx.moveTo(px + ox, py + oy - lift);
        ctx.quadraticCurveTo(mx, my, px2 + ox, py2 + oy - lift);
        ctx.stroke();
      }
      ctx.globalAlpha = (i === 0 ? 0.99 : 0.61) * fade;
      ctx.strokeStyle = i === 0 ? st.mid : shade(st.mid, 12);
      ctx.lineWidth = Math.max(1.2, sc * 0.026);
      ctx.beginPath();
      ctx.moveTo(px + ox, py + oy - lift);
      ctx.quadraticCurveTo(mx, my, px2 + ox, py2 + oy - lift);
      ctx.stroke();
    }
    // THE WEFT: the shuttle-line shot through the warp — the head
    // runs the span in the young hop, the line holds behind it.
    const f = Math.min(1, t / 0.42);
    const hxq = px + dx * f;
    const hyq = py + dy * f - lift + sag * 4 * f * (1 - f) * 0.5;
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.8, sc * 0.042);
    ctx.beginPath();
    ctx.moveTo(px, py - lift);
    ctx.lineTo(hxq, hyq);
    ctx.stroke();
    if (f < 1) {
      // The shuttle itself: a four-point glint at the head.
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, hxq, hyq, sc * 0.12, sc * 0.05, 4, c.now / 160, 1);
      ctx.fill();
    } else if (t < 0.56) {
      // Arrival: the knot ties off — a small ring at the far anchor.
      const k = 1 - (t - 0.42) / 0.14;
      ctx.globalAlpha = 0.9 * k;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.ellipse(px2, py2 - lift, sc * 0.09 * (2 - k), sc * 0.09 * (2 - k), 0, 0, Math.PI * 2);
      ctx.stroke();
      c.glow(c.wx2, c.wy2, 0.7, 0.5 * k);
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- gloamshaft

/**
 * GLOAMSHAFT — "the displaced light."
 * The heavy shot travels as night: a VEIL of gloom draws down the
 * corridor at the lane's own width — thin enough that the bodies
 * standing in it still read, because a shadow is a shadow and not
 * a plank — and the light it displaces has to STAND SOMEWHERE:
 * two pale seams pushed out to the rails, brightening at the
 * writing edge where the dark shoulders past. Pale dashes lean in
 * and drain into the band while it writes; gloom tatters curl at
 * the far end; the spent shaft tumbles out of the dark and lies in
 * the stain.
 */
const gloamshaft: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const a2 = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    gloom.deployments.veil!(m,
      c.wx + (c.wx2 - c.wx) * 0.55, c.wy + (c.wy2 - c.wy) * 0.55,
      { radius: 0.9, scale: 0.7, dur: 2.0 });
    gloom.deployments.tendrils!(m, c.wx2, c.wy2, { dir: a2, scale: 0.6 });
    // The spent shaft: wood tumbling out the far end, landing hard.
    c.particles.burst(c.wx2, c.wy2, 2, [c.st.mid, shade(c.st.deep, 12)], {
      speed: 1.1, life: 7, size: 0.05, gravity: 0, shape: 'shard',
      spin: 6, dir: a2, spread: 0.4,
      z: 0.3, vz: 1.8, zg: 8, land: 'bounce', bounce: 0.3, layer: 'world',
    });
    // THE LASTING MARK: the stain where night pooled (deliberate
    // ink), and displaced-light grains lying at the rails.
    const rand = srand(c.seed ^ 0x610d);
    for (let i = 0; i < 3; i++) {
      const a = rand() * Math.PI * 2;
      lay(c, c.wx2 + Math.cos(a) * 0.3, c.wy2 + Math.sin(a) * 0.3 * 0.62,
        shade(c.st.deep, 10), { life: 9, size: 0.05 });
    }
    const nx = Math.cos(a2 + Math.PI / 2);
    const ny = Math.sin(a2 + Math.PI / 2) * 0.62;
    for (let i = 0; i < 4; i++) {
      const f = 0.25 + (i >> 1) * 0.35;
      const s = i % 2 === 0 ? 1 : -1;
      lay(c,
        c.wx + (c.wx2 - c.wx) * f + nx * 0.24 * s,
        c.wy + (c.wy2 - c.wy) * f + ny * 0.24 * s,
        c.st.core, { life: 6, size: 0.05 });
    }
    c.glow(c.wx2, c.wy2, 0.8, 0.3);
  },
  ground(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const rand = srand(c.seed ^ 0x610d ^ 0x22);
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    // The lane's true width: the wire's own 0.6-tile beam, no wider.
    const w = sc * 0.6;
    const reach = Math.min(1, t / 0.24);
    const ex = px + dx * reach;
    const ey = py + dy * reach;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE GLOOM VEIL: one translucent draw of night down the lane —
    // dark-on-light needs a little more body than a pale wash, but
    // it stays a veil, and everything standing in it still reads.
    ctx.globalAlpha = 0.26 * fade;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(px + nx * w * 0.5, py + ny * w * 0.5);
    ctx.lineTo(ex + nx * w * 0.5, ey + ny * w * 0.5);
    ctx.lineTo(ex - nx * w * 0.5, ey - ny * w * 0.5);
    ctx.lineTo(px - nx * w * 0.5, py - ny * w * 0.5);
    ctx.closePath();
    ctx.fill();
    // THE DISPLACED LIGHT: pale seams standing at both rails — the
    // corridor's whole story lives on these two edges.
    for (const s of [-1, 1]) {
      const ox = nx * (w * 0.5 + sc * 0.03) * s;
      const oy = ny * (w * 0.5 + sc * 0.03) * s;
      ctx.globalAlpha = 0.4 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      ctx.beginPath();
      ctx.moveTo(px + ox, py + oy);
      ctx.lineTo(ex + ox, ey + oy);
      ctx.stroke();
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.6, sc * 0.036);
      ctx.beginPath();
      ctx.moveTo(px + ox, py + oy);
      ctx.lineTo(ex + ox, ey + oy);
      ctx.stroke();
    }
    // THE WRITING EDGE: where the dark is shouldering past right
    // now, the seams flare — the one event, not a row of pickets.
    if (reach < 1) {
      const flare = 0.6 + 0.4 * Math.sin(c.now / 90 + rand() * 6.28);
      ctx.globalAlpha = 0.95 * fade * flare;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.6, sc * 0.036);
      ctx.beginPath();
      ctx.moveTo(ex + nx * w * 0.62, ey + ny * w * 0.62);
      ctx.lineTo(ex - nx * w * 0.62, ey - ny * w * 0.62);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const rand = srand(c.seed ^ 0x610d ^ 0x33);
    const dx = px2 - px;
    const dy = py2 - py;
    ctx.save();
    ctx.lineCap = 'butt';
    if (t < 0.3) {
      // The drain: pale dashes around the corridor leaning in and
      // sliding home into the band — the light, invited first.
      const al = 1 - t / 0.3;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.4, sc * 0.032);
      for (let i = 0; i < 6; i++) {
        const f = 0.15 + rand() * 0.7;
        const s = i % 2 === 0 ? 1 : -1;
        const slide = (t * 3 + rand()) % 1;
        const off = sc * (0.55 - slide * 0.35);
        const len2 = Math.hypot(dx, dy) || 1;
        const nx = -dy / len2;
        const ny = dx / len2;
        const bx = px + dx * f + nx * off * s;
        const by = py + dy * f + ny * off * s - sc * 0.2;
        ctx.globalAlpha = 0.6 * al;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx - nx * sc * 0.14 * s, by - ny * sc * 0.14 * s);
        ctx.stroke();
      }
      // Gated glints falling into the writing edge.
      if (Math.random() < c.frameDt * 12) {
        c.particles.burst(
          c.wx + (c.wx2 - c.wx) * Math.min(1, t / 0.24), c.wy + (c.wy2 - c.wy) * Math.min(1, t / 0.24),
          1, [st.core], { speed: 0.6, life: 0.35, size: 0.055, gravity: 0, shape: 'glint' });
      }
    } else {
      // Gloom tatters: three dark curls waving at the far end while
      // the light seeps back in behind the shot.
      const al = (1 - t) / 0.7;
      ctx.strokeStyle = shade(st.deep, 8);
      ctx.lineWidth = Math.max(1.5, sc * 0.034);
      for (let i = 0; i < 3; i++) {
        const bx = px2 + (rand() - 0.5) * sc * 0.5;
        const wave = Math.sin(c.now / 160 + i * 2.1) * sc * 0.1;
        const h = sc * (0.3 + rand() * 0.25);
        ctx.globalAlpha = 0.7 * al;
        ctx.beginPath();
        ctx.moveTo(bx, py2);
        ctx.quadraticCurveTo(bx + wave, py2 - h * 0.6, bx - wave * 0.6, py2 - h);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
};

// ------------------------------------------------------------- harrier

/**
 * HARRIER — "the hairpin."
 * Every beat's shot goes out AND comes home, and the wound wears
 * the whole journey: a teardrop flight loop hangs through the
 * strike point — the out leg solid, the return leg dashed — with a
 * glint running the circuit while two raked wing-crescents flash at
 * the turn. The wing-gust skirts the dirt, and molted feathers
 * wobble down on true z to lie where the harrier has been.
 */
const harrier: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x4a1e);
    dust.deployments.skirt!(m, c.wx, c.wy, { radius: 0.4, scale: 0.5 });
    // THE RETURN GUST: pale dust off the turn, not a dark mass —
    // the wing pushes air, and air is light.
    c.particles.burst(c.wx, c.wy, 3, [c.st.spark, c.st.mid], {
      speed: 0.7 + rand() * 0.4, life: 0.7, size: 0.04, gravity: 0,
      drag: 2.6, shape: 'puff', wobble: 0.4, z: 0.15, vz: 0.6, zg: 5,
      land: 'die',
    });
    // Molted feathers: slow, wobbling, settling — a few, and fine.
    for (let k = 0; k < 2; k++) {
      c.particles.burst(c.wx, c.wy, 1, [c.st.mid, shade(c.st.deep, 14)], {
        speed: 0.5 + rand() * 0.5, life: 8, size: 0.05, gravity: 0,
        shape: 'shard', spin: 10, wobble: 0.5,
        z: 0.8, vz: 1.1, zg: 5, land: 'settle', layer: 'world',
      });
    }
    // THE LASTING MARK: feather grains at the strike.
    for (let i = 0; i < 3; i++) {
      const a = rand() * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * 0.3, c.wy + Math.sin(a) * 0.3 * 0.62,
        i === 0 ? c.st.spark : c.st.mid, { life: 8, size: 0.044 });
    }
    c.glow(c.wx, c.wy, 0.8, 0.45);
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const ang = entryAngle(c, 0x4a1e);
    const fade = 1 - t;
    const grow = Math.min(1, t / 0.2);
    ctx.save();
    // The wing-gust: two crescents swept out from the strike,
    // perpendicular to the flight line.
    for (const s of [-1, 1]) {
      const a0 = ang + s * Math.PI / 2;
      const r = sc * (0.3 + grow * 0.3);
      ctx.globalAlpha = 0.5 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(2.6, sc * 0.065);
      ctx.beginPath();
      ctx.ellipse(px, py, r, r * squash, 0, a0 - 0.55, a0 + 0.55);
      ctx.stroke();
      ctx.globalAlpha = 0.75 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.4, sc * 0.032);
      ctx.beginPath();
      ctx.ellipse(px, py, r * 0.94, r * 0.94 * squash, 0, a0 - 0.5, a0 + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const ang = entryAngle(c, 0x4a1e);
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const lift = sc * 0.5;
    // Loop frame: far vertex at the wound; the circuit reaches back
    // along the flight line. Lateral y-components ride a 0.5 aspect
    // — the loop lies in the sky's plane.
    const ux = Math.cos(ang);
    const uy = Math.sin(ang) * 0.5;
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang) * 0.5;
    const L = sc * 1.5;
    const W = sc * 0.55;
    const sx = px - ux * L;
    const sy = py - uy * L - lift;
    const hx = px;
    const hy = py - lift * 0.4;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE HAIRPIN: out leg solid on a deep bed; return leg dashed.
    const leg = (s: number, col: string, lw: number, al: number, dash: boolean): void => {
      ctx.globalAlpha = al;
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      if (dash) ctx.setLineDash([sc * 0.09, sc * 0.1]);
      ctx.beginPath();
      ctx.moveTo(sx + nx * W * 0.2 * s, sy + ny * W * 0.2 * s);
      ctx.quadraticCurveTo(
        px - ux * L * 0.3 + nx * W * s, py - uy * L * 0.3 + ny * W * s - lift,
        hx, hy);
      ctx.stroke();
      if (dash) ctx.setLineDash([]);
    };
    leg(1, st.deep, Math.max(3, sc * 0.075), 0.5 * fade, false);
    leg(1, st.mid, Math.max(1.5, sc * 0.035), 0.9 * fade, false);
    leg(-1, st.core, Math.max(1.3, sc * 0.03), 0.75 * fade, true);
    // The circuit runner: out on the solid leg, home on the dashed.
    const ph = Math.min(1, t / 0.52);
    const s = ph < 0.5 ? 1 : -1;
    const f = ph < 0.5 ? ph * 2 : 2 - ph * 2; // 0→1 out, 1→0 back
    const omf = 1 - f;
    // Quadratic interpolation along the leg.
    const cxq = px - ux * L * 0.3 + nx * W * s;
    const cyq = py - uy * L * 0.3 + ny * W * s - lift;
    const gx = omf * omf * (sx + nx * W * 0.2 * s) + 2 * omf * f * cxq + f * f * hx;
    const gy = omf * omf * (sy + ny * W * 0.2 * s) + 2 * omf * f * cyq + f * f * hy;
    if (ph < 1) {
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, gx, gy, sc * 0.11, sc * 0.045, 4, c.now / 150, 1);
      ctx.fill();
      if (Math.random() < c.frameDt * 16) {
        c.particles.burst(c.wx + (gx - px) / sc, c.wy + (gy - py) / sc * 1.6, 1,
          [st.spark, st.core], { speed: 0.3, life: 0.3, size: 0.05, gravity: 0.3, shape: 'glint' });
      }
    }
    // THE TURN: wing-crescents flash at the wound as the shot banks.
    if (t > 0.2 && t < 0.36) {
      const k = 1 - Math.abs((t - 0.28) / 0.08);
      ctx.globalAlpha = Math.max(0, k) * 0.9;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      for (const w of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.quadraticCurveTo(
          hx + nx * w * sc * 0.4 - ux * sc * 0.15,
          hy + ny * w * sc * 0.4 - uy * sc * 0.15 - sc * 0.2,
          hx + nx * w * sc * 0.6 - ux * sc * 0.45,
          hy + ny * w * sc * 0.6 - uy * sc * 0.45 - sc * 0.1);
        ctx.stroke();
      }
      c.glow(c.wx, c.wy, 0.9, 0.5 * Math.max(0, k));
    }
    ctx.restore();
  },
};

// -------------------------------------------------------------- zenith

/**
 * ZENITH — "the arrow of noon."
 * The school's showpiece: the shot goes up and NOON comes down — a
 * colossal fletched shaft of sunlight falling point-first out of
 * the top of the sky, burying its head in the ring and STANDING
 * there, a pillar with vanes, while burning fall rains inside the
 * circle and eight noon rays gild the court. When the pillar
 * gutters, the ash ring keeps the appointment written in the dirt.
 */
const zenith: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x2e11);
    radiance.deployments.bloom!(m, c.wx, c.wy, { scale: 1.1 });
    radiance.deployments.shafts!(m, c.wx, c.wy, { radius: c.radius * 0.75, scale: 0.9, dur: 2.4 });
    fire.deployments.rain!(m, c.wx, c.wy, { radius: c.radius * 0.65, scale: 0.8, dur: 1.6 });
    dust.deployments.billow!(m, c.wx, c.wy, { radius: c.radius * 0.5, scale: 0.5 });
    // Gilded chaff thrown by the strike, bouncing dead.
    for (let k = 0; k < 3; k++) {
      c.particles.burst(c.wx, c.wy, 1, [c.st.spark, c.st.core], {
        speed: 1.4 + rand() * 1.2, life: 5, size: 0.08, gravity: 0,
        shape: 'glint', flicker: 0.3,
        z: 0.2, vz: 2.4 + rand() * 1.5, zg: 8.5,
        land: 'bounce', bounce: 0.4, layer: 'world',
      });
    }
    // THE LASTING MARK: the ash ring — noon's burnt appointment
    // (deliberate soot grays), plus gilded grains at the heart.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + rand() * 0.3;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.82, c.wy + Math.sin(a) * c.radius * 0.82 * 0.62,
        c.st.mid, { life: 10, size: 0.042, fade: shade(c.st.deep, 14), fadeAt: 0.55 });
    }
    for (let i = 0; i < 4; i++) {
      const a = rand() * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * 0.25, c.wy + Math.sin(a) * 0.25 * 0.62,
        c.st.spark, { life: 8.5, size: 0.055, flicker: 0.35 });
    }
    c.glow(c.wx, c.wy, Math.max(1.6, c.radius), 1.0);
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const hot = Math.max(0, 1 - t / 0.5);
    ctx.save();
    ctx.lineCap = 'butt';
    // The gilded court: deep bed annulus, then gold.
    const band = (r0: number, r1: number, col: string, al: number): void => {
      ctx.globalAlpha = al;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * r1, rPx * r1 * squash, 0, 0, Math.PI * 2);
      ctx.ellipse(px, py, rPx * r0, rPx * r0 * squash, 0, Math.PI * 2, 0, true);
      ctx.fill();
    };
    band(0.5, 0.95, st.deep, 0.4 * fade);
    band(0.56, 0.88, st.mid, (0.2 + 0.3 * hot) * fade);
    // NOON RAYS: eight spokes from the buried head to the rim —
    // the four cardinal ones brighter, the sundial with no shadow.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const p0 = pt(c, rPx * 0.24, a);
      const p1 = pt(c, rPx * 0.92, a);
      ctx.globalAlpha = (i % 2 === 0 ? 0.7 : 0.45) * fade;
      ctx.strokeStyle = i % 2 === 0 ? st.spark : st.mid;
      ctx.lineWidth = Math.max(1.8, sc * (i % 2 === 0 ? 0.05 : 0.035));
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    // The white heart where the head went in.
    if (t < 0.4) {
      ctx.globalAlpha = (1 - t / 0.4) * 0.85;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.2, rPx * 0.2 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius, (0.25 + 0.45 * hot) * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const W = sc * 0.55; // the shaft's body width
    ctx.save();
    ctx.lineCap = 'butt';
    // The descent, then the stand: head altitude falls to zero by
    // t=0.18 and the pillar STAYS planted.
    const k = Math.min(1, t / 0.18);
    const drop = (1 - k) * (1 - k);
    const headY = py - sc * 3.3 * drop;
    const breathe = k >= 1 ? 1 + 0.03 * Math.sin(c.now / 160) : 1;
    const topY = headY - sc * 2.9;
    // THE SHAFT OF NOON: sleeve, gold body, white heart — full fills.
    const shaft = (m0: number, col: string, al: number): void => {
      ctx.globalAlpha = al * fade;
      ctx.fillStyle = col;
      const w = W * m0 * breathe;
      ctx.fillRect(px - w / 2, topY, w, headY - topY - sc * 0.1);
    };
    shaft(1.3, st.deep, 0.5);
    shaft(1.0, st.mid, 0.85);
    shaft(0.42, st.core, 0.95);
    // The head: a broad arrowhead point-first; buried after contact.
    if (k < 1) {
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.moveTo(px - W * 0.62, headY - sc * 0.42);
      ctx.lineTo(px + W * 0.62, headY - sc * 0.42);
      ctx.lineTo(px, headY);
      ctx.closePath();
      ctx.fill();
    }
    // THE FLETCH: two vane pairs near the top — the pillar's crown,
    // the one silhouette that says ARROW and nothing else.
    const vy = topY + sc * (0.3 + (k >= 1 ? Math.min(0.25, (t - 0.18) * 0.6) : 0));
    for (const s of [-1, 1]) {
      ctx.globalAlpha = 0.85 * fade;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.moveTo(px + s * W * 0.5, vy);
      ctx.lineTo(px + s * W * 1.15, vy - sc * 0.42);
      ctx.lineTo(px + s * W * 1.15, vy + sc * 0.1);
      ctx.lineTo(px + s * W * 0.5, vy + sc * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      ctx.moveTo(px + s * W * 0.5, vy + sc * 0.08);
      ctx.lineTo(px + s * W * 1.02, vy - sc * 0.26);
      ctx.lineTo(px + s * W * 1.02, vy + sc * 0.06);
      ctx.lineTo(px + s * W * 0.5, vy + sc * 0.36);
      ctx.closePath();
      ctx.fill();
    }
    // Contact: the flash — one wide star and a searing ground ring.
    if (t > 0.16 && t < 0.3) {
      const fk = 1 - (t - 0.16) / 0.14;
      ctx.globalAlpha = 0.95 * fk;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py, sc * (0.65 + (1 - fk) * 0.5), sc * 0.24, 6, c.now / 220, squash);
      ctx.fill();
      ctx.globalAlpha = 0.85 * fk;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      ctx.beginPath();
      ctx.ellipse(px, py, sc * (0.5 + (1 - fk) * 1.6), sc * (0.5 + (1 - fk) * 1.6) * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      c.glow(c.wx, c.wy, 1.8, 1.0 * fk);
    }
    // Heat shimmer climbing the standing pillar — gated, honest.
    if (k >= 1 && t < 0.8 && Math.random() < c.frameDt * 20) {
      c.particles.burst(c.wx + (Math.random() - 0.5) * 0.4, c.wy, 1, [st.spark, st.core], {
        speed: 0.2, life: 0.6, size: 0.07, gravity: -1.8, shape: 'streak', wobble: 0.3,
      });
    }
    ctx.restore();
  },
};

// ------------------------------------------------------------ crowsong

/**
 * CROWSONG — "the wheeling murder."
 * The channel calls the flock and the flock is NEVER full: five
 * painted crows wheel at altitude over the fixed ring — geometry
 * rooted in the ground's own position hash, so the wheel holds
 * still while the beats pass under it — and every beat three shard
 * "birds" peel off the world-layer orbit and dive, striking blood
 * out of the circle before the climb-out. Black feathers wobble
 * down and pile beat over beat; claw-marks ring the court; the
 * caw rolls out as a dark ripple at flight height.
 */
const crowsong: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const beat = srand(c.seed ^ 0xc305); // per-beat variety
    const R = Math.max(0.9, c.radius * 0.75);
    // THE ORBIT: one beat's worth of shard birds wheeling at z≈2.2
    // on the world layer — they pass behind bodies, as birds do.
    c.particles.emit({
      kind: 'orbit', x: c.wx, y: c.wy, z: 2.2, radius: R,
      orbitSpeed: 2.6, rate: 15, dur: 0.85, attack: 0.06, release: 0.2,
      pops: [{
        colors: [INK, '#241a2e'],
        opts: {
          shape: 'shard', life: 0.9, size: 0.12, speed: 0.15, gravity: 0,
          spin: 7, layer: 'world', shadow: 0.5, land: 'none',
        },
      }],
    });
    // THE DIVES: three birds fold their wings and drop on the ring —
    // each one crisp and countable, each one drawing its own blood.
    for (let k = 0; k < 3; k++) {
      const a = beat() * Math.PI * 2;
      const d = 0.28 + beat() * 0.45;
      const sx = c.wx + Math.cos(a) * c.radius * d;
      const sy = c.wy + Math.sin(a) * c.radius * d * 0.62;
      c.particles.burst(sx, sy, 1, [INK], {
        speed: 0.5, life: 1.2, size: 0.07, gravity: 0, shape: 'shard',
        spin: 9, dir: a + Math.PI, spread: 0.15,
        z: 2.3, vz: -2.8, zg: 5, land: 'die', layer: 'world', shadow: 0.6,
      });
      // The strike draws blood — the library's voice, small and true.
      blood.deployments.spatter!(m, sx, sy, { scale: 0.3 });
    }
    // Molted black feathers, and THE LASTING MARK laid beat over
    // beat — the pile grows because the world keeps what landed.
    for (let k = 0; k < 2; k++) {
      const a = beat() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.5, c.wy + Math.sin(a) * c.radius * 0.5 * 0.62,
        1, ['#241a2e'], {
          speed: 0.2, life: 8, size: 0.048, gravity: 0, shape: 'shard',
          spin: 8, wobble: 0.5, z: 1.5, vz: 0.1, zg: 2.2,
          land: 'settle', layer: 'world',
        });
      lay(c, c.wx + Math.cos(a) * c.radius * (0.3 + beat() * 0.4),
        c.wy + Math.sin(a) * c.radius * (0.3 + beat() * 0.4) * 0.62,
        '#241a2e', { life: 9, size: 0.042 });
    }
    c.glow(c.wx, c.wy, c.radius * 0.7, 0.25);
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    // Rooted in WHERE: the same court re-renders every beat.
    const rooted = srand(posSeed(c, 0xc305));
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    ctx.save();
    ctx.lineCap = 'butt';
    // The court: a thin dark wheel under the flock.
    ctx.globalAlpha = 0.4 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2.4, sc * 0.06);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.88, rPx * 0.88 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Claw-marks: six stable pairs of landing scratches around the
    // ring — the perch record of every crow that has come down.
    for (let i = 0; i < 6; i++) {
      const a = rooted() * Math.PI * 2;
      const p = pt(c, rPx * (0.55 + rooted() * 0.3), a);
      const ma = rooted() * Math.PI;
      for (const s of [-1, 1]) {
        const ox = Math.cos(ma + Math.PI / 2) * sc * 0.035 * s;
        const oy = Math.sin(ma + Math.PI / 2) * sc * 0.035 * s * squash;
        ctx.globalAlpha = (s < 0 ? 0.6 : 0.4) * fade;
        ctx.strokeStyle = s < 0 ? INK : st.mid;
        ctx.lineWidth = Math.max(1.3, sc * 0.028);
        ctx.beginPath();
        ctx.moveTo(p.x + ox - Math.cos(ma) * sc * 0.07, p.y + oy - Math.sin(ma) * sc * 0.07 * squash);
        ctx.lineTo(p.x + ox + Math.cos(ma) * sc * 0.07, p.y + oy + Math.sin(ma) * sc * 0.07 * squash);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, rPx } = c;
    const rooted = srand(posSeed(c, 0xc305 ^ 0x33));
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    const lift = sc * 1.5;
    ctx.save();
    ctx.lineCap = 'round';
    // THE WHEELING MURDER: five crows ride the wall clock — the
    // wheel turns continuously across beats, never re-rolling.
    for (let i = 0; i < 5; i++) {
      const phase = rooted() * Math.PI * 2;
      const speed = 0.55 + rooted() * 0.45;
      const orbR = rPx * (0.72 + rooted() * 0.24);
      const a = phase + (c.now / 1000) * speed;
      const x = px + Math.cos(a) * orbR;
      const y = py - lift + Math.sin(a) * orbR * 0.5;
      const flap = Math.sin(c.now / 85 + i * 2.4);
      const span = sc * (0.16 + rooted() * 0.05);
      const wingY = span * (0.35 + 0.4 * flap);
      ctx.globalAlpha = 0.88 * fade;
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      // Both wings in one stroke: tip — body — tip, hinged mid-flap.
      ctx.beginPath();
      ctx.moveTo(x - span, y - wingY);
      ctx.quadraticCurveTo(x - span * 0.4, y - wingY * 0.2, x, y);
      ctx.quadraticCurveTo(x + span * 0.4, y - wingY * 0.2, x + span, y - wingY);
      ctx.stroke();
      // The body: a small ink knot with a tail nub trailing the turn.
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.ellipse(x, y, sc * 0.05, sc * 0.038, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // THE CAW: at each beat's open, a dark ripple rolls out at
    // flight height — the song of the piece, made visible.
    if (t < 0.16) {
      const k = t / 0.16;
      ctx.globalAlpha = (1 - k) * 0.5;
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1.8, sc * 0.045);
      ctx.beginPath();
      ctx.ellipse(px, py - lift, rPx * 0.3 * (0.4 + k), rPx * 0.3 * (0.4 + k) * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- registry

/**
 * The archery breath wave of THE SIGNATURE LAW — merged into the
 * master SIGNATURES table by the integrating lead.
 */
export const ARCHERY_BREATH_SIGS: Record<string, AbilitySig> = {
  kingshot,
  stringsong,
  hawks_hour,
  winterflight,
  emberhead,
  skyloom,
  gloamshaft,
  harrier,
  zenith,
  crowsong,
};
