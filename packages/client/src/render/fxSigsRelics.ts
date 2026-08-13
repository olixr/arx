/**
 * THE SIGNATURE LAW — the relic wave (THE ARMORY REMEMBERS, wave 6:
 * the legendary tier).
 *
 * Fifteen set-pieces rebuilt ground-up to the three-strata bar at
 * LEGENDARY scale: the ten relic actives, the Bone Tempest sigil,
 * and the enemy specials. A relic is an ancient tool with one
 * perfected trick, and the trick must be legible at a glance — the
 * fire door shows the lane that burns, the raised floor's rim IS
 * the damage circle, the pack's ears rise exactly at the howl's
 * edge. Scale states the tier; clarity states the rules.
 *
 *   PRIMARY   the machine working, painted inside the wire's life.
 *   SECONDARY what flies, rains, upwells, or seats off it.
 *   TERTIARY  THE LASTING MARK — settled formations for ~6-10 s: a
 *             burnt pair of door footprints, a fence of barbs laid
 *             by one runner, three leaf grains over a hidden trap.
 *
 * Binding laws as ever: hard edges, save/restore hygiene, squash on
 * ground y-radii, srand determinism, frameDt-gated emission, ≤ ~60
 * path ops per hook per frame. SUMMON LAW stands: the wire is one
 * 500ms ceremony and any radius drawn is the summon's true
 * influence, never stagecraft. Pulse arts count on bornAt beat
 * parity; field arts accumulate. No centerpiece repeats another's,
 * nor any of this file's former ones (the relay of wicks, the first
 * breath, the leaf-buried noose, the tolling mouth, the straw twin,
 * the surfaced cairn, the unwound coil, the closing hedge, the
 * closing question, the green veining, the surfacing ribs, the
 * bucking floor, the answering chorus, the running laugh, the
 * answering silence — all retired whole).
 *
 * ONE-VOICE stands: fire, smoke, dust, storm, blood, and venom
 * speak through the MATTER LIBRARY; straw, riverbed stone, script,
 * bone, and quiet stay the relics' own.
 */

import { shade } from './rig.js';
import { boltPath, burstStarPath, srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { fire, smoke, dust, storm, blood, venom, asMatter } from './matter/index.js';

/** Screen point r px from the heart along ground angle a. */
function pt(c: SigCtx, r: number, a: number): { x: number; y: number } {
  return { x: c.px + Math.cos(a) * r, y: c.py + Math.sin(a) * r * c.squash };
}

/** Clamp to 0..1 — every staggered clock in this file runs on it. */
function cl(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * THE LASTING MARK — one settled grain laid deliberately at a world
 * point (the ~10s tertiary stratum; burst()'s ×0.7–1.3 life jitter
 * keeps a formation from dying as one).
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
 * EMBER_DASH — "the door of fire."
 * The blink is two doorways: a standing arch of flame snaps open at
 * the departure, its twin opens at the arrival a beat later, and
 * the lane between them ignites as a low carpet of leaning tongues
 * — the pass that burns, shown as the road it burned. Two pairs of
 * scorched door-feet and an ember lane line stay for nine seconds.
 */
const ember_dash: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xed01);
    fire.deployments.path!(asMatter(c), c.wx, c.wy, { dir: Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx), scale: 0.7 });
    // Door-feet: scorch pairs at both thresholds.
    const dx = c.wx2 - c.wx;
    const dy = c.wy2 - c.wy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (const [ex, ey] of [[c.wx, c.wy], [c.wx2, c.wy2]] as Array<[number, number]>) {
      for (const s of [-1, 1]) {
        lay(c, ex + nx * 0.3 * s, ey + ny * 0.3 * s, '#4a3226', { life: 9, size: 0.06 });
      }
    }
    // The ember lane: cooling grains down the middle.
    for (let k = 0; k < 5; k++) {
      const f = (k + 0.5) / 5;
      lay(c, c.wx + dx * f + (rand() - 0.5) * 0.1, c.wy + dy * f + (rand() - 0.5) * 0.1,
        '#fff1d8', {
          life: 8.5, size: 0.05, flicker: 0.35,
          fade: '#f0a45a', fadeAt: 0.2, fade2: '#4a3226', fade2At: 0.6,
        });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    ctx.save();
    // THE BURNING LANE: a low band between the doors, its floor
    // washed warm with leaning tongue ticks along travel.
    const lit = Math.min(1, t / 0.25);
    ctx.globalAlpha = 0.45 * fade * lit;
    ctx.fillStyle = shade('#c85a28', 8);
    ctx.beginPath();
    ctx.moveTo(px + nx * sc * 0.26, py + ny * sc * 0.26 * squash);
    ctx.lineTo(px2 + nx * sc * 0.26, py2 + ny * sc * 0.26 * squash);
    ctx.lineTo(px2 - nx * sc * 0.26, py2 - ny * sc * 0.26 * squash);
    ctx.lineTo(px - nx * sc * 0.26, py - ny * sc * 0.26 * squash);
    ctx.closePath();
    ctx.fill();
    // Leaning tongues: short flame ticks bowed along travel.
    ctx.lineCap = 'round';
    for (let k = 0; k < 6; k++) {
      const f = (k + 0.5) / 6;
      if (f > lit) break;
      const bx = px + dx * f + nx * ((k % 2) - 0.5) * sc * 0.22;
      const by = py + dy * f + ny * ((k % 2) - 0.5) * sc * 0.22 * squash;
      const flick = Math.sin(c.now / 70 + k * 2) * sc * 0.03;
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = k % 3 === 0 ? '#fff1d8' : '#ffb36a';
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + dx / len * sc * 0.1, by - sc * 0.12 + flick, bx + dx / len * sc * 0.2, by - sc * 0.2 + flick);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    ctx.save();
    ctx.lineCap = 'round';
    // THE DOORS: departure arch snaps open 0→0.1 and collapses by
    // 0.4; arrival arch opens 0.15→0.25 and holds to 0.7. Each is a
    // standing flame arch — two legs and a crown, hot core inside.
    const doors: Array<[number, number, number, number]> = [
      [px, py, 0.0, 0.4],
      [px2, py2, 0.15, 0.75],
    ];
    for (const [bx, by, born, die] of doors) {
      const open = cl((t - born) / 0.1);
      const gone = cl((t - die) / 0.12);
      if (open <= 0 || gone >= 1) continue;
      const H = sc * 1.15 * open * (1 - gone);
      const W = sc * 0.34;
      const flick = Math.sin(c.now / 60 + bx) * sc * 0.03;
      for (let pass = 0; pass < 2; pass++) {
        ctx.globalAlpha = (pass === 0 ? 0.85 : 0.97) * (1 - gone);
        ctx.strokeStyle = pass === 0 ? '#e8823d' : '#fff1d8';
        ctx.lineWidth = Math.max(pass === 0 ? 4 : 2, sc * (pass === 0 ? 0.1 : 0.045));
        ctx.beginPath();
        ctx.moveTo(bx - W, by);
        ctx.quadraticCurveTo(bx - W * 1.05, by - H * 0.75 + flick, bx - W * 0.35, by - H);
        ctx.lineTo(bx + W * 0.35, by - H);
        ctx.quadraticCurveTo(bx + W * 1.05, by - H * 0.75 - flick, bx + W, by);
        ctx.stroke();
      }
      // The threshold glow inside the frame.
      ctx.globalAlpha = 0.35 * (1 - gone);
      ctx.fillStyle = '#ffb36a';
      ctx.beginPath();
      ctx.moveTo(bx - W * 0.8, by);
      ctx.lineTo(bx - W * 0.3, by - H * 0.85);
      ctx.lineTo(bx + W * 0.3, by - H * 0.85);
      ctx.lineTo(bx + W * 0.8, by);
      ctx.closePath();
      ctx.fill();
    }
    if (t < 0.12) c.glow(c.wx, c.wy, 1, 0.6 * (1 - t / 0.12));
    if (t > 0.15 && t < 0.3) c.glow(c.wx2, c.wy2, 1.1, 0.65 * (1 - (t - 0.15) / 0.15));
    ctx.restore();
    void st;
  },
};

/**
 * HEALING_TOTEM — "the tapped spring."
 * Planting the totem taps a water table of green: concentric
 * upwelling rings surface one after another and RISE as they fade
 * — the spring pushed up through the soil — while a soft rim of
 * clover dots marks the heal's true influence circle (the SUMMON
 * LAW: radius is never stagecraft). The clover rim and a damp ring
 * stay for nine seconds, matching the totem's stand.
 */
const healing_totem: AbilitySig = {
  spawn(c) {
    // The influence rim, recorded honestly: clover dots at radius.
    const R = c.radius || 2.6;
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * R, c.wy + Math.sin(a) * R,
        k % 2 === 0 ? '#7ac47a' : '#4a7a4a',
        { life: 9, size: 0.05, flicker: 0.2 });
    }
    // The damp: a small dark ring at the planting point.
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * 0.22, c.wy + Math.sin(a) * 0.22,
        shade(c.st.deep, -10), { life: 8.5, size: 0.05 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = 1 - t * 0.4;
    ctx.save();
    // THE INFLUENCE CIRCLE: drawn plainly at true radius — a calm
    // double ring, the heal's honest reach.
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx, rPx * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.4 * fade;
    ctx.strokeStyle = shade(st.deep, -6);
    ctx.lineWidth = Math.max(3.4, sc * 0.09);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 1.04, rPx * 1.04 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    ctx.save();
    // THE UPWELLING: four rings surface in sequence and RISE off
    // the ground as they fade — water pushed up through soil, each
    // ring a pale green hoop climbing and thinning.
    for (let k = 0; k < 4; k++) {
      const born = 0.04 + k * 0.18;
      const u = cl((t - born) / 0.4);
      if (u <= 0 || u >= 1) continue;
      const liftY = -u * sc * 0.85;
      const rr = sc * (0.42 - u * 0.14);
      ctx.globalAlpha = (1 - u) * 0.9;
      ctx.strokeStyle = k % 2 === 0 ? st.mid : shade(st.mid, 16);
      ctx.lineWidth = Math.max(2, sc * (0.055 - u * 0.02));
      ctx.beginPath();
      ctx.ellipse(px, py + liftY, rr, rr * squash * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Spring motes ride the upwelling on gated beats.
    if (t < 0.8 && Math.random() < c.frameDt * 12) {
      c.particles.burst(c.wx + (Math.random() - 0.5) * 0.4, c.wy + (Math.random() - 0.5) * 0.3,
        1, [st.spark, st.core], {
          speed: 0.08, life: 1, size: 0.045, gravity: 0, shape: 'glint',
          z: 0.05, vz: 0.8, zg: 0, land: 'none', layer: 'world', shadow: 0, wobble: 0.3,
        });
    }
    // The tap moment: one green star at the strike of the spade.
    if (t < 0.12) {
      const k = 1 - t / 0.12;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py, sc * 0.28, sc * 0.1, 5, c.now / 400, squash);
      ctx.fill();
      c.glow(c.wx, c.wy, 1, 0.5 * k);
    }
    ctx.restore();
  },
};

/**
 * SNARE_TRAP — "the covered work."
 * Craft, then concealment: the toothed ring assembles flat in a
 * blink — jaws, cord, anchor pin — and then leaves BLOW OVER it, a
 * drift of slips sliding across until nothing shows. The absence
 * is the design. Exactly three leaf grains stay for ten seconds —
 * the only hint, and only the hunter knows to read it.
 */
const snare_trap: AbilitySig = {
  spawn(c) {
    // The hint: exactly three leaf grains. Nothing else.
    lay(c, c.wx - 0.12, c.wy + 0.05, '#8a9a5a', { life: 10, size: 0.05 });
    lay(c, c.wx + 0.14, c.wy - 0.04, '#6f8a4a', { life: 10, size: 0.045 });
    lay(c, c.wx + 0.02, c.wy + 0.12, '#8a9a5a', { life: 10, size: 0.045 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    ctx.save();
    ctx.lineCap = 'butt';
    const R = Math.max(rPx, sc * 0.5);
    // THE WORK (0→0.4): the toothed ring assembles flat — two jaw
    // arcs with teeth, a cord to the anchor pin.
    const build = cl(t / 0.4);
    const cover = cl((t - 0.45) / 0.35);
    if (cover < 1) {
      const al = (1 - cover) * 0.95;
      for (const s of [0, Math.PI]) {
        const sweep = Math.PI * 0.8 * build;
        ctx.globalAlpha = al;
        ctx.strokeStyle = shade(st.deep, -12);
        ctx.lineWidth = Math.max(2.4, sc * 0.06);
        ctx.beginPath();
        ctx.ellipse(px, py, R * 0.8, R * 0.8 * squash, 0, s - sweep / 2, s + sweep / 2);
        ctx.stroke();
        // Teeth: inward ticks along each built jaw.
        ctx.lineWidth = Math.max(1.6, sc * 0.038);
        for (let k = 0; k < 4; k++) {
          const a = s - sweep / 2 + (k / 3) * sweep;
          if (build < (k + 1) / 4) break;
          const p1 = pt(c, R * 0.8, a);
          const p0 = pt(c, R * 0.62, a);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p0.x, p0.y);
          ctx.stroke();
        }
      }
      // The anchor pin + cord.
      if (build > 0.7) {
        ctx.globalAlpha = al;
        ctx.strokeStyle = shade(st.deep, -8);
        ctx.lineWidth = Math.max(1.6, sc * 0.038);
        ctx.beginPath();
        ctx.moveTo(px + R * 0.8, py);
        ctx.lineTo(px + R * 1.15, py + sc * 0.06);
        ctx.stroke();
        ctx.fillStyle = shade(st.deep, -16);
        const g = Math.max(2.5, sc * 0.06);
        ctx.fillRect(px + R * 1.15 - g / 2, py + sc * 0.06 - g / 2, g, g);
      }
    }
    // THE COVER (0.45→0.8): leaf slips slide across and SETTLE —
    // each a small pointed oval arriving from the seed wind side,
    // coming to rest over the work.
    const rand = srand(c.seed ^ 0x5a1e);
    const windA = rand() * Math.PI * 2;
    for (let k = 0; k < 7; k++) {
      const stagger = (k / 7) * 0.25;
      const u = cl((t - 0.45 - stagger) / 0.2);
      if (u <= 0) continue;
      const restX = px + (rand() - 0.5) * R * 1.4;
      const restY = py + (rand() - 0.5) * R * 1.1 * squash;
      const bx = restX + Math.cos(windA) * (1 - u) * sc * 1.2;
      const by = restY + Math.sin(windA) * (1 - u) * sc * 0.7 - (1 - u) * sc * 0.14;
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = k % 2 === 0 ? '#8a9a5a' : '#6f8a4a';
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(windA + u * 2 + k);
      ctx.beginPath();
      ctx.ellipse(0, 0, sc * 0.1, sc * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },
  air(c) {
    // The set's last touch: one quiet click as the jaws arm.
    if (c.t > 0.38 && c.t < 0.46) {
      const k = 1 - (c.t - 0.38) / 0.08;
      const { ctx, st, sc, px, py } = c;
      ctx.save();
      ctx.globalAlpha = 0.85 * k;
      ctx.fillStyle = st.core;
      const g = Math.max(2, sc * 0.05);
      ctx.fillRect(px - g / 2, py - sc * 0.1 - g / 2, g, g);
      ctx.restore();
    }
  },
};

/**
 * STORM_BELL — "the inverted bell."
 * The bell is the sky over your head: a great mouth-down shell of
 * storm-light hangs above the caster, ONE clapper-bolt swings
 * through it like a pendulum, strikes the rim — and the note falls
 * as the nova, a pressure ring dropping onto the circle. A rim of
 * scorch dashes and the clapper's point stay printed for eight
 * seconds.
 */
const storm_bell: AbilitySig = {
  spawn(c) {
    storm.deployments.impact!(asMatter(c), c.wx, c.wy, { scale: 0.8 });
    // The rung rim: scorch dashes around the circle + clapper point.
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.8, c.wy + Math.sin(a) * c.radius * 0.8,
        '#fff9e0', {
          life: 8, size: 0.05, fade: '#e8e06a', fadeAt: 0.15, fade2: '#3a3630', fade2At: 0.5,
        });
    }
    lay(c, c.wx + 0.24, c.wy, shade(c.st.deep, -16), { life: 8.5, size: 0.06 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    // THE NOTE FALLS: after the strike (t 0.3), the ring drops onto
    // the ground and races out — the bell's toll as pressure.
    if (t < 0.3) return;
    const u = cl((t - 0.3) / 0.5);
    const fade = 1 - u;
    const rr = rPx * (0.2 + u * 0.85);
    ctx.save();
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = shade(st.deep, -8);
    ctx.lineWidth = Math.max(5, sc * 0.14 * (1 - u * 0.4));
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = '#fff9e0';
    ctx.lineWidth = Math.max(2.2, sc * 0.055);
    ctx.beginPath();
    ctx.ellipse(px, py, rr * 0.97, rr * 0.97 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const flicker = 0.8 + 0.2 * Math.sin(c.now / 48);
    const bellY = py - sc * 1.5;
    const fade = t < 0.55 ? 1 : (1 - t) / 0.45;
    ctx.save();
    ctx.lineCap = 'round';
    // THE SHELL: a mouth-down dome of storm-light over the caster —
    // a wide arc with a thickened rim lip, big enough to state the
    // legendary tier.
    const W = rPx * 0.85;
    ctx.globalAlpha = 0.55 * fade * flicker;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(4.4, sc * 0.115);
    ctx.beginPath();
    ctx.ellipse(px, bellY, W, sc * 0.85, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * fade * flicker;
    ctx.strokeStyle = '#fff9e0';
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(px, bellY, W, sc * 0.85, 0, Math.PI + 0.12, Math.PI * 2 - 0.12);
    ctx.stroke();
    // The rim lip: two bright nubs where the mouth ends.
    ctx.fillStyle = st.spark;
    for (const s of [-1, 1]) {
      const g = Math.max(2.5, sc * 0.06);
      ctx.fillRect(px + s * W - g / 2, bellY - g / 2, g, g);
    }
    // THE CLAPPER: one bolt swings like a pendulum (0→0.3) and
    // strikes the rim — drawn as a jagged line from the dome's
    // crown to the swinging tip.
    if (t < 0.34) {
      const swing = Math.sin((t / 0.3) * Math.PI) * 0.9; // out and back
      const tipX = px + Math.sin(swing) * W * 0.85;
      const tipY = bellY - Math.cos(swing) * sc * 0.15 + sc * 0.35;
      ctx.globalAlpha = 0.95 * flicker;
      ctx.strokeStyle = '#fff9e0';
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      boltPath(ctx, px, bellY - sc * 0.8, tipX, tipY, c.seed ^ Math.floor(c.now / 90), sc * 0.1);
      ctx.stroke();
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      ctx.ellipse(tipX, tipY, sc * 0.08, sc * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // THE STRIKE: the toll — a hard star at the rim, once.
    if (t > 0.26 && t < 0.4) {
      const k = 1 - (t - 0.26) / 0.14;
      ctx.globalAlpha = 0.97 * k;
      ctx.fillStyle = '#fff9e0';
      ctx.beginPath();
      burstStarPath(ctx, px + W * 0.75, bellY + sc * 0.1, sc * 0.36, sc * 0.13, 5, c.now / 300, 1);
      ctx.fill();
      c.glow(c.wx, c.wy, c.radius, 0.7 * k);
    }
    ctx.restore();
    void squash;
  },
};

/**
 * HUNTERS_DECOY — "the stitched shadow."
 * The double assembles itself in the open: cross-stitch X's climb a
 * standing bale silhouette, sewing it upright seam by seam, straw
 * dust shaking off the work — while a wide dashed attention-ring
 * marks the decoy's true draw radius (the SUMMON LAW, kept). Straw
 * grains at the base stay for eight seconds.
 */
const hunters_decoy: AbilitySig = {
  spawn(c) {
    dust.deployments.kick!(asMatter(c), c.wx, c.wy, { scale: 0.4 });
    // Straw at the base, kept.
    const rand = srand(c.seed ^ 0xdec0);
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * 0.24, c.wy + Math.sin(a) * 0.24,
        k % 2 === 0 ? '#c8bb84' : '#a89a6a', { life: 8, size: 0.05 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = 1 - t * 0.4;
    // THE DRAW RING: the decoy's true influence — a wide dashed
    // ring, honest and plain, crawling inward (attention pulled).
    ctx.save();
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.8, sc * 0.045);
    ctx.setLineDash([sc * 0.18, sc * 0.14]);
    ctx.lineDashOffset = c.now / 22;
    ctx.beginPath();
    ctx.ellipse(px, py, rPx, rPx * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const build = cl(t / 0.6);
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE STITCHING: five X's climb the bale silhouette bottom-up,
    // each snapping in with a thread-pull; the silhouette's outline
    // rises with the highest stitch.
    const H = sc * 1.15;
    const outlineH = H * build;
    // The bale outline: a soft-shouldered column, drawn to height.
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = '#a89a6a';
    ctx.lineWidth = Math.max(2.4, sc * 0.06);
    ctx.beginPath();
    ctx.moveTo(px - sc * 0.26, py);
    ctx.lineTo(px - sc * 0.26, py - outlineH * 0.8);
    ctx.quadraticCurveTo(px - sc * 0.22, py - outlineH, px, py - outlineH);
    ctx.quadraticCurveTo(px + sc * 0.22, py - outlineH, px + sc * 0.26, py - outlineH * 0.8);
    ctx.lineTo(px + sc * 0.26, py);
    ctx.stroke();
    // The stitches.
    for (let k = 0; k < 5; k++) {
      const born = 0.06 + k * 0.11;
      const u = cl((t - born) / 0.08);
      if (u <= 0) continue;
      const y = py - H * (0.12 + k * 0.2);
      const g = sc * 0.1 * u;
      ctx.globalAlpha = 0.95 * fade;
      ctx.strokeStyle = k % 2 === 0 ? '#c8bb84' : '#e8dcb0';
      ctx.lineWidth = Math.max(1.8, sc * 0.042);
      ctx.beginPath();
      ctx.moveTo(px - g, y - g * 0.7);
      ctx.lineTo(px + g, y + g * 0.7);
      ctx.moveTo(px + g, y - g * 0.7);
      ctx.lineTo(px - g, y + g * 0.7);
      ctx.stroke();
      // The pull: a brief thread from off-body as each stitch lands.
      if (u < 1) {
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = '#e8dcb0';
        ctx.lineWidth = Math.max(1.2, sc * 0.026);
        ctx.beginPath();
        ctx.moveTo(px + g + sc * 0.4 * (1 - u), y - g * 0.7 - sc * 0.2 * (1 - u));
        ctx.lineTo(px + g, y - g * 0.7);
        ctx.stroke();
      }
    }
    // Straw dust shakes off the work on gated beats.
    if (t < 0.6 && Math.random() < c.frameDt * 10) {
      c.particles.burst(c.wx, c.wy, 1, ['#c8bb84', '#a89a6a'], {
        speed: 0.3, life: 0.8, size: 0.045, gravity: 0, shape: 'streak',
        z: 0.3 + Math.random() * 0.6, vz: -0.2, zg: 2, land: 'settle',
        layer: 'world', shadow: 0, wobble: 0.5,
      });
    }
    // The finished double: one hard glint at the crown — "seen."
    if (t > 0.6 && t < 0.72) {
      const k = 1 - (t - 0.6) / 0.12;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py - H - sc * 0.08, sc * 0.16, sc * 0.06, 4, 0.4, 1);
      ctx.fill();
    }
    ctx.restore();
  },
};

/**
 * STONE_AEGIS — "the river remembers."
 * The river stone takes the blows meant for you — so the riverbed
 * arrives: a ring of water-worn pebbles rises around the caster
 * and each one flies to the body and SEATS flat against it in
 * sequence, armor assembled from patience itself, sealed with one
 * water-sheen sweep down the silhouette. Wet pebble stains and two
 * real pebbles stay at your feet for nine seconds.
 */
const stone_aegis: AbilitySig = {
  spawn(c) {
    // Two real pebbles: bounce once, then keep the vigil.
    for (let k = 0; k < 2; k++) {
      c.particles.burst(c.wx + (k - 0.5) * 0.4, c.wy + 0.2, 1, ['#a8b0a4', '#8a9484'], {
        speed: 0.4, life: 9, size: 0.065, gravity: 0, shape: 'square',
        z: 0.3, vz: 0.8, zg: 7, land: 'bounce', bounce: 0.4, layer: 'world',
        fade: '#6a746a', fadeAt: 0.4,
      });
    }
    // Wet stains where the ring rose.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * 0.55, c.wy + Math.sin(a) * 0.55,
        shade(c.st.deep, -8), { life: 9, size: 0.05 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    if (t > 0.5) return;
    // The riverbed opens: a wet ring gleams where the stones rose.
    const k = 1 - t / 0.5;
    ctx.save();
    ctx.globalAlpha = 0.6 * k;
    ctx.strokeStyle = shade(st.mid, 14);
    ctx.lineWidth = Math.max(2.2, sc * 0.055);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.55, sc * 0.55 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0x5709);
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    ctx.save();
    // THE SEATING: six pebbles rise from the ring and fly to their
    // stations on the body — chest, shoulders, hips — each seating
    // FLAT with a small press flash. Armor, assembled patiently.
    const stations: Array<[number, number]> = [
      [0, -0.95], [-0.3, -0.75], [0.3, -0.75], [-0.24, -0.45], [0.24, -0.45], [0, -0.6],
    ];
    for (let k = 0; k < 6; k++) {
      const born = 0.05 + k * 0.1;
      const u = cl((t - born) / 0.14);
      if (u <= 0) continue;
      const a = (k / 6) * Math.PI * 2 + rand() * 0.3;
      const sx = px + Math.cos(a) * sc * 0.55;
      const sy = py + Math.sin(a) * sc * 0.35 * squash;
      const [tx, ty] = stations[k]!;
      const dx = px + tx * sc;
      const dy = py + ty * sc;
      const bx = sx + (dx - sx) * u;
      const by = sy + (dy - sy) * u - Math.sin(u * Math.PI) * sc * 0.2;
      const W = sc * (0.11 - (u >= 1 ? 0.02 : 0));
      // The pebble: water-worn — a rounded slab, lit top, dark seat.
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = shade('#8a9484', -14);
      ctx.beginPath();
      ctx.ellipse(bx, by + W * 0.14, W, W * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = u >= 1 ? shade('#a8b0a4', 8) : '#a8b0a4';
      ctx.beginPath();
      ctx.ellipse(bx, by, W, W * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.8 * fade;
      ctx.fillStyle = shade('#c8cec4', 10);
      ctx.beginPath();
      ctx.ellipse(bx - W * 0.3, by - W * 0.25, W * 0.34, W * 0.2, 0.4, 0, Math.PI * 2);
      ctx.fill();
      // The press: a click flash the frame it seats.
      const uPrev = cl((t - c.frameDt * 1000 / 750 - born) / 0.14);
      if (uPrev < 1 && u >= 1) {
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = st.core;
        ctx.beginPath();
        burstStarPath(ctx, bx, by, sc * 0.12, sc * 0.045, 4, k, 1);
        ctx.fill();
      }
    }
    // THE SHEEN: when the last stone seats, one water-gleam sweeps
    // down the silhouette — the river's blessing on the wall.
    if (t > 0.68) {
      const u = cl((t - 0.68) / 0.2);
      const y = py - sc * 1.1 + u * sc * 1.15;
      ctx.globalAlpha = 0.8 * (1 - u) * fade;
      ctx.strokeStyle = shade(st.mid, 22);
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.ellipse(px, y, sc * 0.34, sc * 0.09, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (u < 0.3) c.glow(c.wx, c.wy, 0.8, 0.4 * (1 - u / 0.3));
    }
    ctx.restore();
  },
};

/**
 * COIL_LANCE — "the finished storm."
 * Uncork a storm that already happened: the corridor arrives as
 * AFTERMATH — rain still falling only inside the bar, a cloud
 * strip overhead already dissolving, and the lance itself a frozen
 * afterimage bolt burning out from both ends toward the middle.
 * The whole line, wet: a dotted rain line and three puddle stains
 * keep the corridor for nine seconds.
 */
const coil_lance: AbilitySig = {
  spawn(c) {
    storm.deployments.impact!(asMatter(c), c.wx2, c.wy2, { scale: 0.7 });
    // The wet line: rain dots + three puddles down the corridor.
    const dx = c.wx2 - c.wx;
    const dy = c.wy2 - c.wy;
    for (let k = 0; k < 6; k++) {
      const f = (k + 0.5) / 6;
      lay(c, c.wx + dx * f, c.wy + dy * f, shade(c.st.deep, -8), { life: 8.5, size: 0.045 });
    }
    for (let k = 0; k < 3; k++) {
      const f = 0.2 + k * 0.3;
      lay(c, c.wx + dx * f + 0.08, c.wy + dy * f + 0.06,
        shade(c.st.deep, -12), { life: 9, size: 0.075 });
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
    ctx.lineCap = 'butt';
    // The rained-on bar: a darkened wet band, corridor only.
    ctx.globalAlpha = 0.4 * fade;
    ctx.fillStyle = shade(st.deep, -10);
    ctx.beginPath();
    ctx.moveTo(px + nx * W, py + ny * W * squash);
    ctx.lineTo(px2 + nx * W, py2 + ny * W * squash);
    ctx.lineTo(px2 - nx * W, py2 - ny * W * squash);
    ctx.lineTo(px - nx * W, py - ny * W * squash);
    ctx.closePath();
    ctx.fill();
    // Rain ticks INSIDE the band only — the storm keeping to its
    // finished line.
    const rand = srand(c.seed ^ (0xc0 + Math.floor(c.now / 80)));
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = shade(st.mid, 18);
    ctx.lineWidth = Math.max(1.2, sc * 0.028);
    for (let k = 0; k < 8; k++) {
      const f = rand();
      const off = (rand() - 0.5) * 2 * W * 0.85;
      const bx = px + dx * f + nx * off;
      const by = py + dy * f + ny * off * squash;
      ctx.beginPath();
      ctx.moveTo(bx + sc * 0.035, by - sc * 0.1);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const lift = sc * 0.5;
    const fade = t < 0.65 ? 1 : (1 - t) / 0.35;
    const dx = px2 - px;
    const dy = py2 - py;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE CLOUD STRIP: a low dark band over the corridor, already
    // thinning — three soft lumps shrinking on their own clocks.
    for (let k = 0; k < 3; k++) {
      const f = 0.2 + k * 0.3;
      const shrink = cl((t - k * 0.08) / 0.6);
      const W = sc * 0.4 * (1 - shrink * 0.7);
      if (W < 2) continue;
      ctx.globalAlpha = 0.5 * (1 - shrink) * fade;
      ctx.fillStyle = shade(st.deep, -6);
      ctx.beginPath();
      ctx.ellipse(px + dx * f, py + dy * f - lift - sc * 0.75, W, W * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // THE AFTERIMAGE LANCE: one frozen bolt along the whole line,
    // burning out from BOTH ends toward the middle — the storm
    // finishing its sentence.
    const burnout = cl(t / 0.55) * 0.5; // each end eats toward 0.5
    if (burnout < 0.5) {
      const flicker = 0.8 + 0.2 * Math.sin(c.now / 55);
      for (let pass = 0; pass < 2; pass++) {
        ctx.globalAlpha = (pass === 0 ? 0.55 : 0.95) * flicker * fade;
        ctx.strokeStyle = pass === 0 ? shade(st.deep, -6) : '#fff9e0';
        ctx.lineWidth = Math.max(pass === 0 ? 4 : 2, sc * (pass === 0 ? 0.105 : 0.048));
        ctx.beginPath();
        boltPath(ctx,
          px + dx * burnout, py + dy * burnout - lift,
          px + dx * (1 - burnout), py + dy * (1 - burnout) - lift,
          c.seed, sc * 0.14);
        ctx.stroke();
      }
      // The burn points: bright wick-ends where the bolt is ending.
      ctx.globalAlpha = 0.97 * fade;
      ctx.fillStyle = st.spark;
      for (const f of [burnout, 1 - burnout]) {
        const g = Math.max(2.5, sc * 0.06);
        ctx.fillRect(px + dx * f - g / 2, py + dy * f - lift - g / 2, g, g);
      }
    }
    // The uncorking: one thunder star at the far end, first frames
    // (the sound arrived before you did).
    if (t < 0.12) {
      const k = 1 - t / 0.12;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = '#fff9e0';
      ctx.beginPath();
      burstStarPath(ctx, px2, py2 - lift, sc * 0.4, sc * 0.14, 5, c.now / 300, 1);
      ctx.fill();
      c.glow(c.wx2, c.wy2, 1.2, 0.7 * k);
    }
    ctx.restore();
  },
};

/**
 * BRAMBLE_BURST — "the fence-writer."
 * The briar does the rest — one RUNNER does all of it: a single
 * long cane enters at the field's edge and walks the perimeter,
 * laying itself down like a fence being written, stapling a barb
 * post at every beat, until the ring closes and the claimed grass
 * inside dims. The fence accumulates and STAYS: a perimeter of
 * barb grains and posts, nine seconds beyond the field.
 */
const bramble_burst: AbilitySig = {
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    const a0 = (c.seed % 7) * 0.9;
    // The runner's progress: the perimeter written over the field's
    // first 70%.
    const written = cl(t / 0.7);
    ctx.save();
    ctx.lineCap = 'round';
    // THE FENCE: the written arc — a woven double line with barbs.
    const sweep = written * Math.PI * 2;
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = shade(st.mid, -14);
    ctx.lineWidth = Math.max(2.6, sc * 0.065);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.88, rPx * 0.88 * squash, 0, a0, a0 + sweep);
    ctx.stroke();
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.6, sc * 0.038);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.84, rPx * 0.84 * squash, 0, a0, a0 + sweep);
    ctx.stroke();
    // Barb posts: staples along the written span.
    for (let k = 0; k < 10; k++) {
      const f = (k + 0.5) / 10;
      if (f > written) break;
      const a = a0 + f * Math.PI * 2;
      const p = pt(c, rPx * 0.88, a);
      ctx.globalAlpha = 0.95 * fade;
      ctx.strokeStyle = shade(st.deep, -12);
      ctx.lineWidth = Math.max(1.8, sc * 0.042);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y - sc * 0.16);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - sc * 0.1);
      ctx.lineTo(p.x + sc * 0.07, p.y - sc * 0.15);
      ctx.stroke();
    }
    // THE RUNNER: the live cane head — a curling green tip with a
    // bright bud, racing the perimeter.
    if (written < 1) {
      const a = a0 + sweep;
      const p = pt(c, rPx * 0.88, a);
      const curl = Math.sin(c.now / 110) * 0.4;
      ctx.globalAlpha = 0.97;
      ctx.strokeStyle = shade(st.mid, 14);
      ctx.lineWidth = Math.max(2.2, sc * 0.055);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.quadraticCurveTo(
        p.x + Math.cos(a + 1.6 + curl) * sc * 0.14, p.y + Math.sin(a + 1.6 + curl) * sc * 0.14 * squash - sc * 0.1,
        p.x + Math.cos(a + 2.1 + curl) * sc * 0.2, p.y + Math.sin(a + 2.1 + curl) * sc * 0.2 * squash - sc * 0.16);
      ctx.stroke();
      ctx.fillStyle = st.core;
      const g = Math.max(2.2, sc * 0.055);
      ctx.fillRect(p.x - g / 2, p.y - g / 2, g, g);
    }
    // THE CLAIM: once the ring closes, the interior dims a step.
    if (written >= 1) {
      ctx.globalAlpha = 0.16 * fade;
      ctx.fillStyle = shade(st.deep, -12);
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.82, rPx * 0.82 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // The fence's record accumulates while the runner writes.
    if (written < 1 && Math.random() < c.frameDt * 4) {
      const a = a0 + written * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.88, c.wy + Math.sin(a) * c.radius * 0.88,
        Math.random() < 0.5 ? '#3a4626' : shade(c.st.deep, -12),
        { life: 9, size: 0.05 });
    }
  },
  air(c) {
    // The bite on the beat-crossing: true blood at a random fence
    // point (the hedge collects its toll).
    const beatT = (c.now % 800) / 800;
    const prevBeatT = ((c.now - c.frameDt * 1000) % 800) / 800;
    if (prevBeatT > beatT && c.t > 0.1 && c.t < 0.85) {
      const a = Math.random() * Math.PI * 2;
      blood.deployments.spray!(asMatter(c),
        c.wx + Math.cos(a) * c.radius * 0.7,
        c.wy + Math.sin(a) * c.radius * 0.7,
        { dir: a + Math.PI, scale: 0.35 });
    }
  },
};

/**
 * ARCANE_SEEKERS — "the answer."
 * The asking-light finds what it asked after: at the wound the
 * seeker's search-spiral collapses inward and STAMPS the answer —
 * a violet exclamation of light, bar and dot, printed in the air.
 * Found. The dot lies on the ground with a three-grain spiral
 * around it for eight seconds: the question, closed.
 */
const arcane_seekers: AbilitySig = {
  spawn(c) {
    // The closed question's record: the dot + a tiny spiral.
    lay(c, c.wx, c.wy, '#b49af0', { life: 8.5, size: 0.06, flicker: 0.3 });
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1;
      const rr = 0.14 + k * 0.09;
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        shade('#b49af0', -14), { life: 8, size: 0.04 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    if (t > 0.5) return;
    // The find's floor light: a violet pulse ring, once.
    const k = 1 - t / 0.5;
    ctx.save();
    ctx.globalAlpha = 0.6 * k;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.8, sc * 0.045);
    const rr = sc * (0.16 + (1 - k) * 0.3);
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const hy = py - sc * 0.72;
    ctx.save();
    ctx.lineCap = 'round';
    // THE COLLAPSING SPIRAL: the search made visible — a violet
    // spiral tightening onto the wound point (0→0.25).
    if (t < 0.25) {
      const u = t / 0.25;
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.8, sc * 0.042);
      ctx.beginPath();
      const N = 12;
      for (let k = 0; k <= N; k++) {
        const f = k / N;
        const a = c.now / 200 + f * Math.PI * 3;
        const rr = sc * (0.55 - f * 0.4) * (1 - u * 0.8);
        const x = px + Math.cos(a) * rr;
        const y = hy + Math.sin(a) * rr * 0.7;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // THE ANSWER: the exclamation stamps (0.22→0.3) and holds — a
    // bar of light over a hard dot, unmistakable at any distance.
    if (t > 0.22) {
      const born = cl((t - 0.22) / 0.08);
      const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
      const H = sc * 0.42 * born;
      ctx.globalAlpha = 0.6 * fade;
      ctx.strokeStyle = shade(st.deep, -6);
      ctx.lineWidth = Math.max(4, sc * 0.1);
      ctx.beginPath();
      ctx.moveTo(px, hy - H);
      ctx.lineTo(px, hy - H * 0.25);
      ctx.stroke();
      ctx.globalAlpha = 0.97 * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.2, sc * 0.055);
      ctx.beginPath();
      ctx.moveTo(px, hy - H);
      ctx.lineTo(px, hy - H * 0.25);
      ctx.stroke();
      const g = Math.max(3, sc * 0.075) * born;
      ctx.fillStyle = st.core;
      ctx.fillRect(px - g / 2, hy - g / 2, g, g);
      // The stamp flash.
      if (born >= 1 && t < 0.38) {
        const k = 1 - (t - 0.3) / 0.08;
        ctx.globalAlpha = 0.95 * Math.max(0, k);
        ctx.fillStyle = st.spark;
        ctx.beginPath();
        burstStarPath(ctx, px, hy - H * 0.6, sc * 0.24, sc * 0.09, 4, 0.4, 1);
        ctx.fill();
        c.glow(c.wx, c.wy, 0.8, 0.5 * Math.max(0, k));
      }
    }
    ctx.restore();
  },
};

/**
 * VENOM_DART — "the sentence served."
 * One green needle with a name on it — and at the wound the name
 * UNSPOOLS: a wavy script-ribbon of dashed green handwriting pays
 * out from the needle's tail and settles over the mark, the
 * sentence served in writing, while the needle itself dissolves.
 * Script dashes and one venom fleck soak in for eight seconds.
 */
const venom_dart: AbilitySig = {
  spawn(c) {
    venom.deployments.bead!(asMatter(c), c.wx, c.wy, { scale: 0.6 });
    // The writing's record: five dashes in a wavy line.
    const rand = srand(c.seed ^ 0x0da7);
    const a = rand() * Math.PI * 2;
    for (let k = 0; k < 5; k++) {
      const f = (k - 2) * 0.18;
      const wob = Math.sin(k * 1.8) * 0.09;
      lay(c, c.wx + Math.cos(a) * f - Math.sin(a) * wob,
        c.wy + Math.sin(a) * f + Math.cos(a) * wob,
        k % 2 === 0 ? '#a0c050' : '#6a8a3c',
        { life: 8, size: 0.045, flicker: 0.2 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    if (t < 0.5) return;
    // The soak: a green blot spreading gently under the writing.
    const u = cl((t - 0.5) / 0.4);
    ctx.save();
    ctx.globalAlpha = 0.5 * (1 - u * 0.5);
    ctx.fillStyle = '#6a8a3c';
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.2 * (0.5 + u), sc * 0.13 * (0.5 + u) * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0x0da7);
    const a = rand() * Math.PI * 2;
    const hy = py - sc * 0.55;
    const ca = Math.cos(a);
    const sn = Math.sin(a) * 0.5;
    ctx.save();
    ctx.lineCap = 'round';
    // The needle: snap-arrival, hanging at the wound while it
    // writes, dissolving after.
    const dissolve = cl((t - 0.5) / 0.25);
    if (dissolve < 1) {
      ctx.globalAlpha = 0.95 * (1 - dissolve);
      ctx.strokeStyle = '#cfe86a';
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(px - ca * sc * 0.3, hy - sn * sc * 0.3);
      ctx.lineTo(px + ca * sc * 0.08, hy + sn * sc * 0.08);
      ctx.stroke();
      if (t < 0.08) {
        ctx.globalAlpha = 0.9 * (1 - t / 0.08);
        ctx.strokeStyle = '#a0c050';
        ctx.lineWidth = Math.max(1.6, sc * 0.038);
        ctx.beginPath();
        ctx.moveTo(px - ca * sc * 1.8, hy - sn * sc * 1.8);
        ctx.lineTo(px - ca * sc * 0.3, hy - sn * sc * 0.3);
        ctx.stroke();
      }
    }
    // THE UNSPOOLING: the script-ribbon pays out from the tail
    // (0.1→0.5) — a dashed wavy line of handwriting settling toward
    // the ground as it writes.
    const write = cl((t - 0.1) / 0.4);
    if (write > 0) {
      const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
      ctx.globalAlpha = 0.95 * fade;
      ctx.strokeStyle = '#a0c050';
      ctx.lineWidth = Math.max(1.8, sc * 0.042);
      ctx.setLineDash([sc * 0.07, sc * 0.045]);
      ctx.beginPath();
      const N = 10;
      for (let k = 0; k <= N * write; k++) {
        const f = k / N;
        const x = px - ca * sc * 0.3 - ca * f * sc * 0.9;
        const wob = Math.sin(f * Math.PI * 4 + 0.5) * sc * 0.08 * (1 - f * 0.3);
        const y = hy - sn * sc * 0.3 - sn * f * sc * 0.45 + wob + f * sc * 0.4;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      // The pen point: bright at the writing head.
      if (write < 1) {
        const f = write;
        const x = px - ca * sc * 0.3 - ca * f * sc * 0.9;
        const y = hy - sn * sc * 0.3 - sn * f * sc * 0.45 + Math.sin(f * Math.PI * 4 + 0.5) * sc * 0.08 * (1 - f * 0.3) + f * sc * 0.4;
        ctx.globalAlpha = 0.97;
        ctx.fillStyle = '#cfe86a';
        const g = Math.max(2.2, sc * 0.055);
        ctx.fillRect(x - g / 2, y - g / 2, g, g);
      }
    }
    if (t < 0.1) c.glow(c.wx, c.wy, 0.6, 0.35 * (1 - t / 0.1));
    ctx.restore();
    void st;
  },
};

/**
 * BONE_TEMPEST — "the three questions of the dead."
 * The fallen champion asks three times, each wave a harder shape:
 * wave one surfaces a ring of knuckle dots; wave two grows them
 * into grinding hooks; wave three joins them into one full toothed
 * saw-ring that turns once and sinks. Beat parity picks the
 * question. A ring of bone grains stays for nine seconds.
 */
const bone_tempest: AbilitySig = {
  spawn(c) {
    const beat = Math.floor((c.now - c.age) / 600) % 3;
    if (beat !== 0) return;
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.7, c.wy + Math.sin(a) * c.radius * 0.7,
        k % 2 === 0 ? '#e8e2d0' : '#b8b09a', { life: 9, size: 0.05 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const beat = Math.floor((c.now - c.age) / 600) % 3;
    const fade = 1 - t * 0.5;
    const R = rPx * 0.7;
    ctx.save();
    ctx.lineCap = 'butt';
    if (beat === 0) {
      // FIRST QUESTION: knuckle dots surface around the ring, each
      // pushing a little soil lip ahead of it.
      const surface = cl(t / 0.4);
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        if (k / 10 > surface) break;
        const p = pt(c, R, a);
        ctx.globalAlpha = 0.6 * fade;
        ctx.fillStyle = shade(st.deep, -12);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + sc * 0.02, sc * 0.08, sc * 0.045 * squash, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.95 * fade;
        ctx.fillStyle = k % 2 === 0 ? '#e8e2d0' : '#d0c8b0';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y - sc * 0.02, sc * 0.055, sc * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (beat === 1) {
      // SECOND QUESTION: the dots grow into hooks — short curved
      // bone claws raking outward, grinding.
      const grow = cl(t / 0.3);
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 + t * 0.6; // the grind turns
        const p = pt(c, R, a);
        const H = sc * 0.22 * grow;
        ctx.globalAlpha = 0.95 * fade;
        ctx.strokeStyle = k % 2 === 0 ? '#e8e2d0' : '#d0c8b0';
        ctx.lineWidth = Math.max(2.2, sc * 0.055);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.quadraticCurveTo(
          p.x + Math.cos(a) * H * 0.8, p.y + Math.sin(a) * H * 0.8 * squash - H * 0.5,
          p.x + Math.cos(a + 0.5) * H * 1.2, p.y + Math.sin(a + 0.5) * H * 1.2 * squash - H * 0.3);
        ctx.stroke();
      }
    } else {
      // THIRD QUESTION: the full saw-ring — a toothed circle that
      // turns once through the pulse and sinks at its end.
      const sink = cl((t - 0.6) / 0.4);
      const turn = t * 0.9;
      ctx.globalAlpha = 0.9 * fade * (1 - sink);
      ctx.strokeStyle = '#d0c8b0';
      ctx.lineWidth = Math.max(3.4, sc * 0.09);
      ctx.beginPath();
      ctx.ellipse(px, py, R, R * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.97 * fade * (1 - sink);
      ctx.fillStyle = '#e8e2d0';
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + turn;
        const p = pt(c, R, a);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(a - 0.3) * sc * 0.14, p.y + Math.sin(a - 0.3) * sc * 0.14 * squash);
        ctx.lineTo(p.x + Math.cos(a + 0.12) * sc * 0.09, p.y + Math.sin(a + 0.12) * sc * 0.09 * squash);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.3 * fade);
  },
  air(c) {
    // Bone chips grind off whichever question is asking, gated.
    if (c.t < 0.7 && Math.random() < c.frameDt * 10) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.7, c.wy + Math.sin(a) * c.radius * 0.7,
        1, ['#e8e2d0', '#b8b09a'], {
          speed: 0.6, life: 1.4, size: 0.05, gravity: 0, dir: a, spread: 0.4,
          shape: 'shard', spin: 8, z: 0.12, vz: 0.9, zg: 7,
          land: 'bounce', bounce: 0.4, layer: 'world',
        });
    }
  },
};

/**
 * GROUND_SLAM — "the raised floor."
 * Threat with total clarity: the champion brings the floor UP — the
 * whole damage circle lifts as ONE round plate, its side wall
 * showing all around, hangs one beat at the top, and slams back
 * flush with a dust ring. The plate's rim IS the danger's edge; a
 * pressed rim ring and radial crack stains stay for nine seconds.
 */
const ground_slam: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    dust.deployments.slam!(asMatter(c), c.wx, c.wy, { scale: 1.3 });
    // The pressed rim + cracks, kept.
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.95, c.wy + Math.sin(a) * c.radius * 0.95,
        shade(c.st.deep, -14), { life: 9, size: 0.06 });
    }
    const rand = srand(c.seed ^ 0x6510);
    for (let k = 0; k < 4; k++) {
      const a = rand() * Math.PI * 2;
      for (let s = 1; s <= 2; s++) {
        lay(c, c.wx + Math.cos(a) * c.radius * 0.3 * s, c.wy + Math.sin(a) * c.radius * 0.3 * s,
          c.st.deep, { life: 8.5, size: 0.05 });
      }
    }
  },
  ground(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    // THE PLATE: rises 0→0.25 (ease-out), hangs 0.25→0.45, slams
    // 0.45→0.55, then the settled scar.
    const up = t < 0.25 ? (t / 0.25) * (2 - t / 0.25) : t < 0.45 ? 1 : t < 0.55 ? 1 - (t - 0.45) / 0.1 : 0;
    const H = sc * 0.34 * up;
    ctx.save();
    ctx.lineCap = 'butt';
    if (up > 0) {
      // The exposed side wall: a dark band all around under the
      // lifted disc — the floor's own thickness, made visible.
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = shade(st.deep, -20);
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.95, rPx * 0.95 * squash, 0, 0, Math.PI);
      ctx.lineTo(px - rPx * 0.95, py - H);
      ctx.ellipse(px, py - H, rPx * 0.95, rPx * 0.95 * squash, 0, Math.PI, 0, true);
      ctx.closePath();
      ctx.fill();
      // The lifted top: the same ground, one step up — lit slab
      // with the champion's pressure star at its heart.
      ctx.globalAlpha = 0.97 * fade;
      ctx.fillStyle = shade(st.mid, 6);
      ctx.beginPath();
      ctx.ellipse(px, py - H, rPx * 0.95, rPx * 0.95 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = shade(st.mid, 20);
      ctx.lineWidth = Math.max(2.2, sc * 0.055);
      ctx.beginPath();
      ctx.ellipse(px, py - H, rPx * 0.93, rPx * 0.93 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (t >= 0.55) {
      // The scar: the rim pressed dark, radial cracks, settled.
      ctx.globalAlpha = 0.8 * fade;
      ctx.strokeStyle = shade(st.deep, -16);
      ctx.lineWidth = Math.max(3.4, sc * 0.09);
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.95, rPx * 0.95 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      const rand = srand(c.seed ^ 0x6511);
      ctx.globalAlpha = 0.7 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      for (let k = 0; k < 4; k++) {
        const a = rand() * Math.PI * 2;
        const kink = (rand() - 0.5) * 0.6;
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(a) * rPx * 0.15, py + Math.sin(a) * rPx * 0.15 * squash);
        ctx.lineTo(px + Math.cos(a + kink) * rPx * 0.6, py + Math.sin(a + kink) * rPx * 0.6 * squash);
        ctx.stroke();
      }
    }
    ctx.restore();
    if (t > 0.45 && t < 0.6) c.glow(c.wx, c.wy, c.radius + 0.5, 0.7 * (1 - (t - 0.45) / 0.15));
  },
  air(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    // The slam's dust ring: bursts outward the frame the plate
    // lands (crossing gate), plus debris hops off the lifted rim.
    const tPrev = t - c.frameDt * 1000 / 780;
    if (tPrev < 0.55 && t >= 0.55) {
      dust.deployments.kick!(asMatter(c), c.wx, c.wy, { scale: 1.1 });
    }
    if (t > 0.05 && t < 0.45 && Math.random() < c.frameDt * 14) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.9, c.wy + Math.sin(a) * c.radius * 0.9,
        1, [st.mid, st.deep], {
          speed: 0.5, life: 1.2, size: 0.05, gravity: 0,
          z: 0.35, vz: 0.8, zg: 7, land: 'bounce', bounce: 0.35, layer: 'world',
        });
    }
    void ctx; void sc; void squash; void px; void py; void rPx;
  },
};

/**
 * RALLYING_HOWL — "the ears in the grass."
 * The matriarch's held note climbs as a single breath-column with
 * harmonic rings riding up it — and the pack answers SILENTLY: all
 * around the howl's exact edge, paired ear-triangles rise out of
 * the grass, prick toward the caller, and sink. The radius is
 * where the ears are. Paired ear grains keep the circle for eight
 * seconds.
 */
const rallying_howl: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x4011);
    // The ear couples' record: paired grains at the true rim.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.3;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.95 - 0.05, c.wy + Math.sin(a) * c.radius * 0.95,
        '#9aa2b8', { life: 8, size: 0.045 });
      lay(c, c.wx + Math.cos(a) * c.radius * 0.95 + 0.05, c.wy + Math.sin(a) * c.radius * 0.95,
        shade('#9aa2b8', -14), { life: 8, size: 0.045 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x4012);
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    // THE EARS: six pairs at the exact rim, each rising on its own
    // clock as the note reaches it, pricking (a small rotation
    // toward the caller), then sinking.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.3;
      const born = 0.15 + (k % 3) * 0.12;
      const u = cl((t - born) / 0.14);
      const sink = cl((t - born - 0.35) / 0.2);
      if (u <= 0 || sink >= 1) continue;
      const p = pt(c, rPx * 0.95, a);
      const H = sc * 0.17 * u * (1 - sink);
      const prick = Math.sin(cl((t - born - 0.14) / 0.1) * Math.PI) * 0.2;
      for (const s of [-1, 1]) {
        const ex = p.x + s * sc * 0.07;
        const lean = (px - ex) * 0.001 * prick * sc;
        ctx.globalAlpha = 0.95 * fade;
        ctx.fillStyle = s === -1 ? '#9aa2b8' : shade('#9aa2b8', -16);
        ctx.beginPath();
        ctx.moveTo(ex - sc * 0.045, p.y);
        ctx.lineTo(ex + lean, p.y - H);
        ctx.lineTo(ex + sc * 0.045, p.y);
        ctx.closePath();
        ctx.fill();
        // The inner ear: a darker notch inside each triangle.
        ctx.globalAlpha = 0.8 * fade;
        ctx.fillStyle = shade(st.deep, -12);
        ctx.beginPath();
        ctx.moveTo(ex - sc * 0.02, p.y);
        ctx.lineTo(ex + lean * 0.8, p.y - H * 0.6);
        ctx.lineTo(ex + sc * 0.02, p.y);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    ctx.save();
    // THE HELD NOTE: one breath-column climbing from the muzzle,
    // three harmonic rings riding up it in sequence.
    const H = sc * 1.6 * cl(t / 0.3);
    ctx.globalAlpha = 0.35 * fade;
    ctx.fillStyle = shade(st.mid, 16);
    ctx.beginPath();
    ctx.moveTo(px - sc * 0.1, py - sc * 0.7);
    ctx.lineTo(px + sc * 0.1, py - sc * 0.7);
    ctx.lineTo(px + sc * 0.05, py - sc * 0.7 - H);
    ctx.lineTo(px - sc * 0.05, py - sc * 0.7 - H);
    ctx.closePath();
    ctx.fill();
    for (let k = 0; k < 3; k++) {
      const u = cl((t - 0.08 - k * 0.14) / 0.4);
      if (u <= 0 || u >= 1) continue;
      const y = py - sc * 0.7 - H * u;
      const rr = sc * (0.14 - u * 0.05);
      ctx.globalAlpha = (1 - u) * 0.9 * fade;
      ctx.strokeStyle = k === 1 ? st.core : st.mid;
      ctx.lineWidth = Math.max(1.8, sc * 0.042);
      ctx.beginPath();
      ctx.ellipse(px, y, rr, rr * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    if (t < 0.15) c.glow(c.wx, c.wy, c.radius * 0.7, 0.4 * (1 - t / 0.15));
  },
};

/**
 * RAVENING_CACKLE — "the joke goes round."
 * The packlord's laugh travels the warband: a jagged cardiogram of
 * cackling writes itself around the rim segment by segment, and
 * every span it passes sprouts a teeth-glyph — two jaw arcs that
 * CLACK once and hang grinning. Teeth-pair grains keep the round
 * for eight seconds. You are inside the joke.
 */
const ravening_cackle: AbilitySig = {
  spawn(c) {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.9 - 0.04, c.wy + Math.sin(a) * c.radius * 0.9,
        '#e8dcb0', { life: 8, size: 0.045 });
      lay(c, c.wx + Math.cos(a) * c.radius * 0.9 + 0.05, c.wy + Math.sin(a) * c.radius * 0.9 + 0.03,
        '#c9a44a', { life: 8, size: 0.04 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xca0c);
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const a0 = (c.seed % 5) * 1.1;
    const written = cl(t / 0.6);
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    // THE CACKLE LINE: a jagged cardiogram written around the rim —
    // spiky where the laugh peaks, drawn segment by segment.
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    const N = 26;
    let started = false;
    for (let k = 0; k <= N * written; k++) {
      const f = k / N;
      const a = a0 + f * Math.PI * 2;
      const spike = k % 2 === 0 ? 0 : (rand() * 0.5 + 0.5) * sc * 0.16;
      const rr = rPx * 0.9 + spike;
      const x = px + Math.cos(a) * rr;
      const y = py + Math.sin(a) * rr * squash;
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // THE TEETH: five glyph pairs along the written span — two jaw
    // arcs that clack shut once as the laugh passes, then grin.
    for (let k = 0; k < 5; k++) {
      const f = (k + 0.5) / 5;
      if (f > written) break;
      const a = a0 + f * Math.PI * 2;
      const p = pt(c, rPx * 0.88, a);
      const clack = cl((written - f) * 6);
      const gap = sc * 0.07 * (1 - clack);
      ctx.globalAlpha = 0.97 * fade;
      ctx.strokeStyle = '#e8dcb0';
      ctx.lineWidth = Math.max(2.2, sc * 0.055);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - gap - sc * 0.03, sc * 0.09, sc * 0.05, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + gap + sc * 0.03, sc * 0.09, sc * 0.05, 0, 0, Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    // The laugh's head: a bright yapping point racing the rim ahead
    // of the writing.
    const a0 = (c.seed % 5) * 1.1;
    const written = cl(t / 0.6);
    if (written < 1) {
      const a = a0 + written * Math.PI * 2;
      const p = pt(c, c.rPx * 0.9, a);
      ctx.save();
      ctx.globalAlpha = 0.97;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, p.x, p.y - sc * 0.1, sc * 0.13, sc * 0.05, 4, c.now / 120, 1);
      ctx.fill();
      ctx.restore();
    }
    if (t < 0.14) c.glow(c.wx, c.wy, c.radius * 0.7, 0.4 * (1 - t / 0.14));
  },
};

/**
 * HUSHING_SCREECH — "the wood bows silent."
 * The elder owl's scream unmakes sound: a thin white ring expands
 * with a cool hush-wash behind it, and everything it crosses BOWS —
 * grass ticks all over the circle lower flat simultaneously and
 * stay down — while one vast soft wing-shadow sweeps across the
 * hushed ground. Flattened-grass marks keep the bow for eight
 * seconds. Nothing else moves; that is the point.
 */
const hushing_screech: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x4054);
    // The bowed grass, recorded: radial lie-marks in the circle.
    for (let k = 0; k < 8; k++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * c.radius * 0.85;
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        k % 2 === 0 ? shade('#b8c4d8', -16) : shade(c.st.deep, -6),
        { life: 8, size: 0.05 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x4055);
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    const ring = cl(t / 0.45);
    ctx.save();
    ctx.lineCap = 'butt';
    // THE HUSH RING: one thin white line, and behind it a cool
    // translucent wash — the world with its sound removed.
    ctx.globalAlpha = 0.2 * fade;
    ctx.fillStyle = shade(st.mid, 8);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * ring, rPx * ring * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.95 * fade * (1 - ring * 0.4);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.8, sc * 0.042);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * ring, rPx * ring * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // THE BOW: grass ticks inside the ring, upright until the hush
    // crosses them — then flat, pointing outward, and they STAY.
    for (let k = 0; k < 10; k++) {
      const a = rand() * Math.PI * 2;
      const rf = Math.sqrt(rand()) * 0.85;
      const p = pt(c, rPx * rf, a);
      const crossed = ring > rf;
      const H = sc * 0.14;
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = crossed ? shade('#b8c4d8', -12) : shade(st.deep, -4);
      ctx.lineWidth = Math.max(1.6, sc * 0.038);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      if (crossed) {
        ctx.lineTo(p.x + Math.cos(a) * H * 1.3, p.y + Math.sin(a) * H * 1.3 * squash);
      } else {
        ctx.lineTo(p.x, p.y - H);
      }
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    // THE WING-SHADOW: one vast soft shadow sweeps across the
    // hushed circle (0.2→0.7) — two lobed wings, umbra only, the
    // owl itself never shown.
    const sweep = cl((t - 0.2) / 0.5);
    if (sweep > 0 && sweep < 1) {
      const wx = px + (sweep - 0.5) * rPx * 2.4;
      ctx.globalAlpha = 0.3 * fade;
      ctx.fillStyle = '#241a2e';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(wx + s * rPx * 0.5, py + sc * 0.05, rPx * 0.55, rPx * 0.22 * squash, s * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.ellipse(wx, py, rPx * 0.2, rPx * 0.14 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // The scream itself: one brief pale flare at the throat point —
    // then nothing at all. Silence is the finale.
    if (t < 0.1) {
      const k = 1 - t / 0.1;
      ctx.globalAlpha = 0.9 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py - sc * 0.9, sc * 0.26, sc * 0.1, 5, c.now / 300, 1);
      ctx.fill();
      c.glow(c.wx, c.wy, c.radius * 0.8, 0.5 * k);
    }
    ctx.restore();
  },
};

// -------------------------------------------------------- the registry

/** The relic-wave signatures, keyed by ability id. */
export const RELIC_SIGS: Record<string, AbilitySig> = {
  ember_dash,
  healing_totem,
  snare_trap,
  storm_bell,
  hunters_decoy,
  stone_aegis,
  coil_lance,
  bramble_burst,
  arcane_seekers,
  venom_dart,
  bone_tempest,
  ground_slam,
  rallying_howl,
  ravening_cackle,
  hushing_screech,
};
