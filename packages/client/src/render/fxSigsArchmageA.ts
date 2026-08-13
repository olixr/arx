/**
 * THE SIGNATURE LAW — the ARCHMAGE wave, first half (THE ARMORY
 * REMEMBERS, wave 5a: the staff arts).
 *
 * Eleven staff arts rebuilt ground-up to the three-strata bar. The
 * staff does not decorate a hit — it asks a WORLD to speak once —
 * and now the world answers on all three layers:
 *
 *   PRIMARY   the painted asking, inside the wire's life.
 *   SECONDARY what flies, drains, breathes, or flocks off it.
 *   TERTIARY  THE LASTING MARK — settled grains in deliberate
 *             formations for ~6-10 s: a stamped heel ring, a
 *             thicket that accumulated cane by cane, six crystal
 *             arms lying in the grass.
 *
 * Binding laws as ever: hard edges, save/restore hygiene, squash on
 * ground y-radii, srand determinism, frameDt-gated emission, ≤ ~60
 * path ops per hook per frame. No centerpiece repeats another's,
 * nor any of this file's former ones (the rune-cut hoop, the
 * hairpin turn, the chimney draft, the raked seabed, the taut lash,
 * the cinder helix, the pack ice, the closed circuit, the season in
 * seconds, the risen flagstones, the blight calendar — all retired
 * whole). Field arts follow the burning-snow law: a long 'field'
 * wire ACCUMULATES its lasting mark beat by beat.
 *
 * ONE-VOICE stands: fire, water, storm, dust, frost, and smoke
 * speak through the MATTER LIBRARY; arcane light, bone-cold seams,
 * and blight petals stay each art's own.
 */

import { shade } from './rig.js';
import { boltPath, burstStarPath, srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { fire, water, storm, dust, frost, smoke, asMatter } from './matter/index.js';

// ------------------------------------------------------------ helpers

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
    speed: 0.05, life: opts.life ?? 8, size: opts.size ?? 0.055,
    gravity: 0, drag: 4, layer: 'ground', flicker: opts.flicker ?? 0,
    fade: opts.fade, fadeAt: opts.fadeAt,
    fade2: opts.fade2, fade2At: opts.fade2At,
  });
}

// -------------------------------------------------------- arcane_ring

/**
 * ARCANE_RING — "the rolled torus."
 * Raw Arx off the staff's heel, and you can SEE the roll: the ring
 * travels outward as a smoke-ring of light seen from above — twist
 * ticks rotating through its band, inner edge rising as the outer
 * falls — while the heel's stamp stays printed at the center. A
 * ring of violet grains keeps the stamp for eight seconds.
 */
const arcane_ring: AbilitySig = {
  spawn(c) {
    // The stamp's record: a small heel ring + four outward ticks.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * 0.22, c.wy + Math.sin(a) * 0.22,
        k % 2 === 0 ? c.st.spark : c.st.mid,
        { life: 8, size: 0.05, flicker: 0.25, fade: shade(c.st.mid, -14), fadeAt: 0.5 });
    }
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.7, c.wy + Math.sin(a) * c.radius * 0.7,
        c.st.mid, { life: 7, size: 0.04 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const rr = rPx * (0.2 + 0.78 * Math.min(1, t / 0.8));
    ctx.save();
    ctx.lineCap = 'butt';
    // THE TORUS: a band with a lit leading (outer) lip, a shadowed
    // trailing (inner) lip, and twist ticks that ROTATE through the
    // band — the roll, made legible.
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = shade(st.deep, -8);
    ctx.lineWidth = Math.max(5.5, sc * 0.16);
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.6, sc * 0.065);
    ctx.beginPath();
    ctx.ellipse(px, py, rr * 1.03, rr * 1.03 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = shade(st.deep, -18);
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(px, py, rr * 0.94, rr * 0.94 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Twist ticks: twelve short radial dashes whose radial position
    // cycles inner → outer on the roll clock.
    const roll = (c.now % 420) / 420;
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.6, sc * 0.038);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const f = (roll + k / 12) % 1;
      const tr = rr * (0.94 + f * 0.09);
      const x = px + Math.cos(a) * tr;
      const y = py + Math.sin(a) * tr * squash;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(a) * sc * 0.035, y - Math.sin(a) * sc * 0.035 * squash);
      ctx.lineTo(x + Math.cos(a) * sc * 0.035, y + Math.sin(a) * sc * 0.035 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    // THE HEEL: the staff-butt stamp — a small violet column drops
    // at the center and rings once, first frames only.
    if (t < 0.14) {
      const k = 1 - t / 0.14;
      ctx.save();
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = shade(st.deep, -8);
      ctx.fillRect(px - Math.max(2.5, sc * 0.06), py - sc * 0.9 * k, Math.max(5, sc * 0.12), sc * 0.9 * k);
      ctx.fillStyle = st.mid;
      ctx.fillRect(px - Math.max(1.2, sc * 0.028), py - sc * 0.9 * k, Math.max(2.4, sc * 0.056), sc * 0.9 * k);
      if (k < 0.6) {
        ctx.globalAlpha = (0.6 - k) * 1.6;
        ctx.fillStyle = st.core;
        ctx.beginPath();
        burstStarPath(ctx, px, py, sc * 0.32, sc * 0.12, 6, c.now / 400, squash);
        ctx.fill();
      }
      ctx.restore();
      c.glow(c.wx, c.wy, 1.1, 0.6 * k);
    }
    // Violet motes tossed up by the passing roll, on gated beats.
    if (t < 0.7 && Math.random() < c.frameDt * 10) {
      const a = Math.random() * Math.PI * 2;
      const rf = 0.2 + Math.min(1, t / 0.8) * 0.75;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * rf, c.wy + Math.sin(a) * c.radius * rf,
        1, [st.spark, st.core], {
          speed: 0.15, life: 0.6, size: 0.05, gravity: 0, shape: 'glint',
          z: 0.05, vz: 0.9, zg: 2, land: 'die', layer: 'world', shadow: 0,
        });
    }
  },
};

// --------------------------------------------------------- wisp_flare

/**
 * WISP_FLARE — "the round trip."
 * Everything they pass, they pass TWICE — so the wound shows both
 * visits: the wisp arrives, stamps a small pale waypoint loop, and
 * visibly DEPARTS back the way it came, dimmer, its return streak
 * peeling off the wound. A tiny loop of pale grains stays where the
 * ticket was punched.
 */
const wisp_flare: AbilitySig = {
  spawn(c) {
    const a = srand(c.seed ^ 0x31f1)() * Math.PI * 2;
    // The waypoint's record: three grains in a small loop.
    for (let k = 0; k < 3; k++) {
      const la = (k / 3) * Math.PI * 2;
      lay(c, c.wx + Math.cos(la) * 0.12, c.wy + Math.sin(la) * 0.12,
        k === 0 ? '#ffffff' : c.st.mid, { life: 7, size: 0.04, flicker: 0.3 });
    }
    void a;
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    // The punch: a pale loop pressed on the turf, once, precise.
    if (t < 0.1) return;
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    ctx.save();
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.8, sc * 0.042);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.16, sc * 0.16 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const a = srand(c.seed ^ 0x31f1)() * Math.PI * 2;
    const ca = Math.cos(a);
    const sn = Math.sin(a) * 0.5;
    const hy = py - sc * 0.5;
    ctx.save();
    ctx.lineCap = 'round';
    // THE ARRIVAL: the wisp comes in hot — a bright bead with a
    // curling tail — and loops the waypoint (a small painted circle
    // orbit, 0.08→0.3).
    if (t < 0.3) {
      const u = Math.max(0, (t - 0.08) / 0.22);
      const oa = a + Math.PI + u * Math.PI * 2.2;
      const bx = px + Math.cos(oa) * sc * 0.2;
      const by = hy + Math.sin(oa) * sc * 0.14;
      if (t < 0.1) {
        ctx.globalAlpha = 0.95 * (1 - t / 0.1);
        ctx.strokeStyle = st.mid;
        ctx.lineWidth = Math.max(2.2, sc * 0.055);
        ctx.beginPath();
        ctx.moveTo(px - ca * sc * 1.8, hy - sn * sc * 1.8);
        ctx.lineTo(px, hy);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.97;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.ellipse(bx, by, sc * 0.06, sc * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      // The loop it draws while orbiting.
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.4, sc * 0.032);
      ctx.beginPath();
      ctx.ellipse(px, hy, sc * 0.2, sc * 0.14, 0, a + Math.PI, oa);
      ctx.stroke();
    }
    // THE DEPARTURE: the second pass — the wisp leaves BACK along
    // its entry line, dimmer, trailing a fading return streak.
    if (t > 0.3 && t < 0.75) {
      const u = (t - 0.3) / 0.45;
      const bx = px - ca * sc * 1.6 * u;
      const by = hy - sn * sc * 1.6 * u;
      ctx.globalAlpha = 0.8 * (1 - u);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.6, sc * 0.04);
      ctx.beginPath();
      ctx.moveTo(px - ca * sc * 1.6 * Math.max(0, u - 0.25), hy - sn * sc * 1.6 * Math.max(0, u - 0.25));
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.globalAlpha = 0.9 * (1 - u * 0.6);
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      ctx.ellipse(bx, by, sc * 0.045, sc * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // The punch flash at the loop's close.
    if (t > 0.28 && t < 0.38) {
      const k = 1 - (t - 0.28) / 0.1;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      burstStarPath(ctx, px, hy, sc * 0.14, sc * 0.05, 4, a, 1);
      ctx.fill();
      c.glow(c.wx, c.wy, 0.6, 0.35 * k);
    }
    ctx.restore();
  },
};

// -------------------------------------------------------- hearth_flare

/**
 * HEARTH_FLARE — "the opened stove."
 * A hearth roars up through a floor that never held one — and for
 * one breath you can SEE the stove: a rectangular door of firelight
 * swings open across the ground, log-glow bars banked inside it,
 * hearth-sparks drifting up while the round shock rolls out past
 * it. The raked-out coals stay in a small rectangular bed, cooling
 * for nine seconds.
 */
const hearth_flare: AbilitySig = {
  spawn(c) {
    fire.deployments.burst!(asMatter(c), c.wx, c.wy, { scale: 0.7 });
    // The coal bed: ember grains in a small RECTANGLE (the only
    // rectangular mark a nova leaves anywhere).
    const rand = srand(c.seed ^ 0x4ea4);
    for (let gx = 0; gx < 3; gx++) {
      for (let gy = 0; gy < 2; gy++) {
        lay(c, c.wx - 0.24 + gx * 0.24 + (rand() - 0.5) * 0.06,
          c.wy - 0.1 + gy * 0.2 + (rand() - 0.5) * 0.06,
          '#fff1d8', {
            life: 9, size: 0.055, flicker: 0.35,
            fade: '#f0a45a', fadeAt: 0.2, fade2: '#4a3226', fade2At: 0.6,
          });
      }
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.65 ? 1 : (1 - t) / 0.35;
    ctx.save();
    ctx.lineCap = 'butt';
    // The round shock: one warm pressure ring rolling out.
    const rr = rPx * Math.min(1, t / 0.6);
    ctx.globalAlpha = 0.6 * fade * (1 - Math.min(1, t / 0.6) * 0.5);
    ctx.strokeStyle = shade(st.deep, -8);
    ctx.lineWidth = Math.max(4.5, sc * 0.13);
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * fade * (1 - Math.min(1, t / 0.6) * 0.4);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(px, py, rr * 0.96, rr * 0.96 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // THE STOVE DOOR: a rectangle of firelight lies on the ground —
    // swung open 0→0.18 (widening trapezoid), banked inside with
    // three log-glow bars that dim in hard steps.
    const open = Math.min(1, t / 0.18);
    const W = sc * 0.62 * open;
    const H = sc * 0.42 * squash;
    const heat = t < 0.35 ? '#fff1d8' : t < 0.6 ? '#ffb36a' : '#c85a28';
    ctx.globalAlpha = 0.85 * fade;
    ctx.fillStyle = shade(st.deep, -18);
    ctx.fillRect(px - W / 2 - sc * 0.03, py - H / 2 - sc * 0.03, W + sc * 0.06, H + sc * 0.06);
    ctx.globalAlpha = 0.8 * fade;
    ctx.fillStyle = st.mid;
    ctx.fillRect(px - W / 2, py - H / 2, W, H);
    // The log bars.
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = heat;
    ctx.lineWidth = Math.max(2.2, sc * 0.055);
    for (let k = 0; k < 3; k++) {
      const y = py - H / 2 + H * (0.25 + k * 0.25);
      ctx.beginPath();
      ctx.moveTo(px - W * 0.4, y);
      ctx.lineTo(px + W * 0.4, y);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.5 * fade);
  },
  air(c) {
    const { st, t } = c;
    // Hearth-sparks drift up off the open door, homely and slow.
    if (t < 0.75 && Math.random() < c.frameDt * 14) {
      c.particles.burst(c.wx + (Math.random() - 0.5) * 0.5, c.wy + (Math.random() - 0.5) * 0.3,
        1, ['#ffb36a', '#fff1d8', st.spark], {
          speed: 0.12, life: 0.9, size: 0.05, gravity: 0, shape: 'glint',
          z: 0.1, vz: 0.9, zg: 0, land: 'none', layer: 'world', shadow: 0,
          wobble: 0.4, flicker: 0.4, fade: '#c85a28', fadeAt: 0.6,
        });
    }
  },
};

// ----------------------------------------------------------- undertow

/**
 * UNDERTOW — "the plughole."
 * The ground remembers being seabed and DRAINS: water-line rings
 * step down toward a dark center mouth — a funnel read from above,
 * each ring lower and darker — while flotsam flecks circle in and
 * go under. At the end the mouth gulps shut with a lid of water
 * and one last plip. Three damp rings stay printed for eight
 * seconds where the sea briefly took its turn.
 */
const undertow: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    water.deployments.churn!(asMatter(c), c.wx, c.wy, { radius: c.radius * 0.6, dur: 0.7, scale: 0.8 });
    // The damp rings: three concentric circles of dark grains.
    for (let r = 0; r < 3; r++) {
      const rr = c.radius * (0.3 + r * 0.25);
      const n = 5 + r * 2;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + r * 0.4;
        lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
          r === 0 ? shade(c.st.deep, -14) : shade(c.st.deep, -8),
          { life: 8, size: 0.05 });
      }
    }
  },
  ground(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    const gulp = Math.min(1, Math.max(0, (t - 0.62) / 0.2)); // the mouth closes
    ctx.save();
    ctx.lineCap = 'butt';
    // THE FUNNEL: four rings stepping DOWN toward the mouth — each
    // drawn lower (y offset) and darker than the last, turning
    // slowly; the innermost circles fastest.
    for (let r = 0; r < 4; r++) {
      const f = r / 3;
      const rr = rPx * (0.85 - f * 0.55) * (1 - gulp * 0.4 * f);
      const sink = sc * 0.05 * r;
      const spin = c.now / (900 - r * 200);
      ctx.globalAlpha = (0.85 - f * 0.1) * fade;
      ctx.strokeStyle = shade(st.deep, -4 - r * 7);
      ctx.lineWidth = Math.max(2.6, sc * (0.085 - f * 0.02));
      ctx.setLineDash([sc * (0.3 - f * 0.14), sc * 0.1]);
      ctx.lineDashOffset = -spin * sc;
      ctx.beginPath();
      ctx.ellipse(px, py + sink, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // THE MOUTH: the dark center hole — swallowing, then gulping
    // shut under a pale lid.
    const mouthR = rPx * 0.18 * (1 - gulp);
    if (mouthR > 1) {
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = shade(st.deep, -26);
      ctx.beginPath();
      ctx.ellipse(px, py + sc * 0.16, mouthR, mouthR * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (gulp > 0 && gulp < 1) {
      // The lid: a pale water sheet sliding over the mouth.
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillStyle = shade(st.mid, 16);
      ctx.beginPath();
      ctx.ellipse(px, py + sc * 0.16, rPx * 0.2 * gulp, rPx * 0.2 * gulp * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // The plip: one small upward droplet column as it seals.
    if (gulp >= 1 && t < 0.9) {
      const k = 1 - (t - 0.82) / 0.08;
      if (k > 0) {
        ctx.globalAlpha = 0.95 * Math.max(0, k);
        ctx.strokeStyle = '#dff0f2';
        ctx.lineWidth = Math.max(2, sc * 0.05);
        ctx.beginPath();
        ctx.moveTo(px, py + sc * 0.12);
        ctx.lineTo(px, py - sc * 0.3 * (1 - k));
        ctx.stroke();
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.7, 0.3 * fade);
  },
  air(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x0d70);
    ctx.save();
    // FLOTSAM: three flecks circle the funnel on tightening orbits
    // and go UNDER — each a small pale chip that vanishes at the
    // mouth with a blink.
    for (let k = 0; k < 3; k++) {
      const start = rand() * Math.PI * 2;
      const u = Math.min(1, Math.max(0, (t - k * 0.08) / 0.55));
      if (u <= 0 || u >= 1) continue;
      const a = start + u * 5;
      const rr = rPx * (0.75 - u * 0.6);
      const x = px + Math.cos(a) * rr;
      const y = py + Math.sin(a) * rr * squash;
      ctx.globalAlpha = 0.95 * (1 - u * u);
      ctx.fillStyle = k % 2 === 0 ? shade(st.mid, 18) : st.mid;
      const g = Math.max(2.2, sc * 0.055);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.fillRect(-g * 0.8, -g * 0.4, g * 1.6, g * 0.8);
      ctx.restore();
    }
    ctx.restore();
  },
};

// ----------------------------------------------------------- stormlash

/**
 * STORMLASH — "the family portrait."
 * Call the bolt you were promised — it brings friends: the main
 * bolt strikes from straight overhead, and a half-beat later two
 * smaller companions strike flanking it, unequal and eager. The
 * cluster scorch stays on the ground: one big mark, two small,
 * cooling white to soot for seven seconds.
 */
const stormlash: AbilitySig = {
  spawn(c) {
    storm.deployments.impact!(asMatter(c), c.wx2, c.wy2, { scale: 0.85 });
    // The cluster scorch: one big + two small.
    const rand = srand(c.seed ^ 0x570a);
    lay(c, c.wx2, c.wy2, '#fff9e0', {
      life: 7.5, size: 0.075, fade: '#e8e06a', fadeAt: 0.15, fade2: '#3a3630', fade2At: 0.5,
    });
    for (let k = 0; k < 2; k++) {
      const a = rand() * Math.PI * 2;
      lay(c, c.wx2 + Math.cos(a) * 0.34, c.wy2 + Math.sin(a) * 0.34, '#fff9e0', {
        life: 7, size: 0.05, fade: '#e8e06a', fadeAt: 0.15, fade2: '#3a3630', fade2At: 0.5,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px2, py2 } = c;
    if (t < 0.08) return;
    const fade = 1 - t;
    const rand = srand(c.seed ^ 0x570b);
    ctx.save();
    // Three landing rings: the family's footprints, sized to rank.
    for (let k = 0; k < 3; k++) {
      const a = k === 0 ? 0 : rand() * Math.PI * 2;
      const d = k === 0 ? 0 : sc * 0.34;
      const born = k === 0 ? 0.08 : 0.2 + k * 0.06;
      if (t < born) continue;
      const rr = sc * (k === 0 ? 0.3 : 0.16);
      ctx.globalAlpha = 0.8 * fade;
      ctx.strokeStyle = k === 0 ? st.spark : shade(st.mid, -8);
      ctx.lineWidth = Math.max(1.8, sc * 0.045);
      ctx.beginPath();
      ctx.ellipse(px2 + Math.cos(a) * d, py2 + Math.sin(a) * d * squash, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px2, py2 } = c;
    const rand = srand(c.seed ^ 0x570b);
    ctx.save();
    ctx.lineCap = 'butt';
    // THE PROMISED BOLT: overhead, thick, first — 0→0.3.
    const flicker = 0.75 + 0.25 * Math.sin(c.now / 42);
    if (t < 0.3) {
      for (let pass = 0; pass < 2; pass++) {
        ctx.globalAlpha = (pass === 0 ? 0.55 : 0.97) * (1 - t / 0.3) * flicker;
        ctx.strokeStyle = pass === 0 ? shade(st.deep, -6) : '#fff9e0';
        ctx.lineWidth = Math.max(pass === 0 ? 4.4 : 2.2, sc * (pass === 0 ? 0.115 : 0.055));
        ctx.beginPath();
        boltPath(ctx, px2, py2 - sc * 3, px2, py2 - sc * 0.1,
          c.seed ^ Math.floor(c.now / 110), sc * 0.18);
        ctx.stroke();
      }
    }
    // THE FRIENDS: two smaller bolts, flanking, staggered, briefer.
    for (let k = 0; k < 2; k++) {
      const born = 0.16 + k * 0.08;
      if (t < born || t > born + 0.18) continue;
      const a = rand() * Math.PI * 2;
      const d = sc * 0.34;
      const bx = px2 + Math.cos(a) * d;
      const by = py2 + Math.sin(a) * d * 0.5;
      const kk = 1 - (t - born) / 0.18;
      ctx.globalAlpha = 0.9 * kk * flicker;
      ctx.strokeStyle = k === 0 ? st.spark : '#fff9e0';
      ctx.lineWidth = Math.max(1.6, sc * 0.04);
      ctx.beginPath();
      boltPath(ctx, bx, by - sc * 2.2, bx, by - sc * 0.05,
        c.seed ^ (k + 3) ^ Math.floor(c.now / 130), sc * 0.1);
      ctx.stroke();
    }
    // The strike star, big-bolt sized.
    if (t > 0.04 && t < 0.2) {
      const k = 1 - (t - 0.04) / 0.16;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = '#fff9e0';
      ctx.beginPath();
      burstStarPath(ctx, px2, py2 - sc * 0.1, sc * 0.4, sc * 0.14, 5, c.now / 300, c.squash);
      ctx.fill();
      c.glow(c.wx2, c.wy2, 1.2, 0.7 * k);
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- cinderstorm

/**
 * CINDERSTORM — "the murmuration."
 * The emberstone exhales a FLOCK: ten embers fly as one organism —
 * following a shared flow, bunching and stretching like starlings
 * over a winter field — then the whole flock disperses outward at
 * once. Where each ember lands, it lies burning down through
 * white, orange, soot for eight seconds.
 */
const cinderstorm: AbilitySig = {
  spawn(c) {
    fire.deployments.ring!(asMatter(c), c.wx, c.wy, { radius: c.radius * 0.5, dur: 0.8, scale: 0.6 });
    // The landing embers: scattered around the rim, cooling.
    const rand = srand(c.seed ^ 0xc1d1);
    for (let k = 0; k < 8; k++) {
      const a = rand() * Math.PI * 2;
      const rr = c.radius * (0.6 + rand() * 0.4);
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr, '#fff1d8', {
        life: 8, size: 0.05, flicker: 0.35,
        fade: '#f0a45a', fadeAt: 0.2, fade2: '#4a3226', fade2At: 0.6,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    // The flock's moving shade: a soft blob that follows the
    // murmuration's centroid below it.
    const swirl = c.now / 300;
    const cx = px + Math.cos(swirl) * rPx * 0.3;
    const cy = py + Math.sin(swirl * 1.3) * rPx * 0.24 * squash;
    ctx.save();
    ctx.globalAlpha = 0.35 * fade;
    ctx.fillStyle = shade(st.deep, -12);
    ctx.beginPath();
    ctx.ellipse(cx, cy, sc * 0.55, sc * 0.3 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xc1d2);
    ctx.save();
    // THE FLOCK: ten embers on a shared flow field — each offset by
    // its own phase but bound to the same swirl clocks, so the
    // group bunches and stretches as one. At t 0.62 it DISPERSES:
    // every ember flies outward along its current heading.
    const swirl = c.now / 300;
    const disperse = Math.max(0, (t - 0.62) / 0.3);
    for (let k = 0; k < 10; k++) {
      const ph = rand() * Math.PI * 2;
      const rad = 0.35 + rand() * 0.3;
      const a = swirl + ph + Math.sin(swirl * 1.3 + ph * 2) * 0.8;
      let x = px + Math.cos(a) * rPx * rad + Math.cos(swirl) * rPx * 0.3;
      let y = py - sc * 0.55 + Math.sin(a) * rPx * rad * 0.5 * squash + Math.sin(swirl * 1.3) * rPx * 0.2;
      let al = 0.95;
      if (disperse > 0) {
        x += Math.cos(a) * disperse * sc * 1.8;
        y += Math.sin(a) * disperse * sc * 1.1;
        al = 1 - disperse;
        if (al <= 0) continue;
      }
      const heat = (Math.sin(c.now / 90 + ph * 3) + 1) / 2;
      ctx.globalAlpha = al;
      ctx.fillStyle = heat > 0.6 ? '#fff1d8' : heat > 0.25 ? st.spark : st.mid;
      const g = Math.max(2.2, sc * (0.05 + heat * 0.02));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.fillRect(-g * 0.8, -g * 0.4, g * 1.6, g * 0.8);
      ctx.restore();
    }
    // The exhale: one warm breath ring off the caster, early.
    if (t < 0.14) {
      const k = 1 - t / 0.14;
      ctx.globalAlpha = 0.8 * k;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.5, sc * 0.065);
      const rr = sc * (0.3 + (1 - k) * 0.5);
      ctx.beginPath();
      ctx.ellipse(px, py - sc * 0.5, rr, rr * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
      c.glow(c.wx, c.wy, 1, 0.5 * k);
    }
    ctx.restore();
  },
};

// ------------------------------------------------------------ glaciate

/**
 * GLACIATE — "the one crystal."
 * One breath of the deep cold grows ONE crystal: a single six-armed
 * flake — the largest, slowest crystal in the game — spreads from
 * the center across the whole circle over the fx's life, its arms
 * budding side-spurs as they go, over concentric depth-bands of
 * deepening blue. Six radial arm-lines of white grains stay in the
 * grass, twinkling, for nine seconds.
 */
const glaciate: AbilitySig = {
  spawn(c) {
    frost.deployments.bloom!(asMatter(c), c.wx, c.wy, {
      radius: c.radius * 0.7, dur: 0.9, scale: 1,
    });
    // The flake's memory: grains down each of the six arms.
    for (let s = 0; s < 6; s++) {
      const a = (s / 6) * Math.PI * 2 + (c.seed % 5) * 0.2;
      for (let k = 1; k <= 3; k++) {
        lay(c, c.wx + Math.cos(a) * c.radius * 0.28 * k,
          c.wy + Math.sin(a) * c.radius * 0.28 * k,
          k === 1 ? '#ffffff' : c.st.mid,
          { life: 9, size: 0.045, flicker: 0.3 });
      }
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    const grow = Math.min(1, t / 0.85); // the slowest growth there is
    ctx.save();
    ctx.lineCap = 'butt';
    // THE DEPTH BANDS: three concentric fills, deepening blue toward
    // the center — ice-core stratigraphy from above.
    for (let r = 2; r >= 0; r--) {
      const rr = rPx * (0.35 + r * 0.3) * Math.min(1, grow * 1.6);
      ctx.globalAlpha = (0.16 + (2 - r) * 0.08) * fade;
      ctx.fillStyle = shade(st.mid, 18 - (2 - r) * 16);
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // THE CRYSTAL: six arms creep outward; each buds two side-spurs
    // at 40% and 70% of its grown length. White over a pale bed.
    for (let s = 0; s < 6; s++) {
      const a = (s / 6) * Math.PI * 2 + (c.seed % 5) * 0.2;
      const L = rPx * 0.92 * grow;
      const ex = px + Math.cos(a) * L;
      const ey = py + Math.sin(a) * L * squash;
      for (let pass = 0; pass < 2; pass++) {
        ctx.globalAlpha = (pass === 0 ? 0.6 : 0.95) * fade;
        ctx.strokeStyle = pass === 0 ? st.mid : '#ffffff';
        ctx.lineWidth = Math.max(pass === 0 ? 3 : 1.5, sc * (pass === 0 ? 0.075 : 0.034));
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(ex, ey);
        // Side spurs, budding once the arm has passed them.
        for (const bud of [0.4, 0.7]) {
          if (grow < bud) continue;
          const bx = px + Math.cos(a) * rPx * 0.92 * bud;
          const by = py + Math.sin(a) * rPx * 0.92 * bud * squash;
          const spurL = sc * 0.16 * Math.min(1, (grow - bud) / 0.2);
          for (const sgn of [-1, 1]) {
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + Math.cos(a + sgn * 0.9) * spurL, by + Math.sin(a + sgn * 0.9) * spurL * squash);
          }
        }
        ctx.stroke();
      }
    }
    // The growth tips sparkle while they creep.
    if (grow < 1) {
      ctx.globalAlpha = 0.97;
      ctx.fillStyle = '#ffffff';
      for (let s = 0; s < 6; s++) {
        const a = (s / 6) * Math.PI * 2 + (c.seed % 5) * 0.2;
        const g = Math.max(1.8, sc * 0.04);
        ctx.fillRect(px + Math.cos(a) * rPx * 0.92 * grow - g / 2,
          py + Math.sin(a) * rPx * 0.92 * grow * squash - g / 2, g, g);
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.9, 0.35 * fade);
  },
  air(c) {
    // The breath itself: a slow cold sigh — frost motes drifting
    // DOWN over the circle, gated, unhurried.
    if (c.t < 0.7 && Math.random() < c.frameDt * 10) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * c.radius * 0.8;
      c.particles.burst(c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        1, ['#ffffff', c.st.core], {
          speed: 0.06, life: 1.1, size: 0.045, gravity: 0, shape: 'glint',
          z: 0.8, vz: -0.35, zg: 0, land: 'die', layer: 'world', shadow: 0, wobble: 0.25,
        });
    }
  },
};

// -------------------------------------------------------- galvanic_arc

/**
 * GALVANIC_ARC — "the overcharged pearl."
 * The stormpearl itself pays the bill: a small pearl-orb hovers at
 * the strike, overcharges in three hard steps — bigger, brighter,
 * unbearable — and POPS into a four-armed star of short arcs while
 * its shell falls as two pale shards. A small scorch and the two
 * shard grains stay where the pearl died.
 */
const galvanic_arc: AbilitySig = {
  spawn(c) {
    storm.deployments.impact!(asMatter(c), c.wx2, c.wy2, { scale: 0.6 });
    // Shell shards: two pale glints that fall and STAY.
    for (let k = 0; k < 2; k++) {
      c.particles.burst(c.wx2, c.wy2, 1, ['#f2ede0'], {
        speed: 0.5, life: 7.5, size: 0.06, gravity: 0, shape: 'glint',
        dir: k === 0 ? 0.8 : 2.5, spread: 0.3,
        z: 0.5, vz: 0.6, zg: 7, land: 'bounce', bounce: 0.4,
        layer: 'world', flicker: 0.2,
      });
    }
    lay(c, c.wx2, c.wy2, '#fff9e0', {
      life: 7, size: 0.055, fade: '#e8e06a', fadeAt: 0.15, fade2: '#3a3630', fade2At: 0.5,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px2, py2 } = c;
    if (t < 0.4) return;
    // The pop's floor: a small hard ring, once.
    const k = Math.max(0, 1 - (t - 0.4) / 0.3);
    ctx.save();
    ctx.globalAlpha = 0.8 * k;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1.8, sc * 0.045);
    const rr = sc * (0.16 + (1 - k) * 0.24);
    ctx.beginPath();
    ctx.ellipse(px2, py2, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const hy = py2 - sc * 0.55;
    ctx.save();
    ctx.lineCap = 'butt';
    // The feed: the live arc from the caster reaches the pearl and
    // keeps feeding it while it charges.
    const flicker = 0.75 + 0.25 * Math.sin(c.now / 40);
    if (t < 0.4) {
      ctx.globalAlpha = 0.9 * flicker;
      ctx.strokeStyle = '#fff9e0';
      ctx.lineWidth = Math.max(1.8, sc * 0.045);
      ctx.beginPath();
      boltPath(ctx, px, py - sc * 0.5, px2, hy, c.seed ^ Math.floor(c.now / 90), sc * 0.12);
      ctx.stroke();
    }
    // THE PEARL: three hard charge steps — radius and whiteness jump
    // at 0.14 and 0.28 — then the POP at 0.4.
    if (t < 0.4) {
      const step = t < 0.14 ? 0 : t < 0.28 ? 1 : 2;
      const R = sc * (0.09 + step * 0.035);
      ctx.globalAlpha = 0.97;
      ctx.fillStyle = step === 2 ? '#ffffff' : step === 1 ? '#f2ede0' : st.mid;
      ctx.beginPath();
      ctx.ellipse(px2, hy, R, R, 0, 0, Math.PI * 2);
      ctx.fill();
      // The shell's dark seam, straining.
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = shade(st.deep, -10);
      ctx.lineWidth = Math.max(1.2, sc * 0.026);
      ctx.beginPath();
      ctx.ellipse(px2, hy, R * 0.75, R * 0.75, c.now / 500, 0.4, 2.4);
      ctx.stroke();
    } else if (t < 0.72) {
      // THE POP: four short arcs star out of the burst point.
      const k = 1 - (t - 0.4) / 0.32;
      for (let s = 0; s < 4; s++) {
        const a = (s / 4) * Math.PI * 2 + 0.4;
        ctx.globalAlpha = 0.9 * k * flicker;
        ctx.strokeStyle = s % 2 === 0 ? '#fff9e0' : st.spark;
        ctx.lineWidth = Math.max(1.6, sc * 0.04);
        ctx.beginPath();
        boltPath(ctx, px2, hy,
          px2 + Math.cos(a) * sc * 0.5, hy + Math.sin(a) * sc * 0.34,
          c.seed ^ (s + 7) ^ Math.floor(c.now / 120), sc * 0.07);
        ctx.stroke();
      }
      if (t < 0.5) {
        const kk = 1 - (t - 0.4) / 0.1;
        ctx.globalAlpha = 0.97 * kk;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        burstStarPath(ctx, px2, hy, sc * 0.26, sc * 0.1, 4, 0.4, 1);
        ctx.fill();
        c.glow(c.wx2, c.wy2, 0.9, 0.6 * kk);
      }
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- overgrowth

/**
 * OVERGROWTH — "the rising thicket."
 * Briars erupt and KEEP growing: over the field's whole life, cane
 * after cane springs up at seeded points — each a curved whip that
 * stays once grown — so the circle visibly thickens into a thicket
 * that finally wilts all together. Thorn grains accumulate beat by
 * beat and lie for nine seconds: the field-kind's law.
 */
const overgrowth: AbilitySig = {
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x0679);
    const lifeMs = c.ticks !== undefined ? c.ticks * 50 : 2000;
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    ctx.save();
    ctx.lineCap = 'round';
    // The bed ring: a rough turned-earth rim.
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = shade(st.deep, -12);
    ctx.lineWidth = Math.max(3.4, sc * 0.09);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.92, rPx * 0.92 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // THE THICKET: twelve canes, each with its own sprout clock
    // spread across the field's life. A grown cane STAYS (painted
    // every frame) until the shared wilt at t 0.85.
    const wilt = Math.max(0, (t - 0.85) / 0.15);
    for (let k = 0; k < 12; k++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * rPx * 0.78;
      const sproutT = 0.04 + (k / 12) * 0.72 + rand() * 0.05;
      const grow = Math.min(1, Math.max(0, (t - sproutT) / (240 / lifeMs)));
      if (grow <= 0) continue;
      const bx = px + Math.cos(a) * rr;
      const by = py + Math.sin(a) * rr * squash;
      const H = sc * (0.32 + rand() * 0.2) * grow * (1 - wilt * 0.6);
      const bend = (rand() - 0.5) * 1.2;
      const sway = Math.sin(c.now / 260 + k * 1.9) * 0.1 * (1 - wilt);
      ctx.globalAlpha = 0.95 * (1 - wilt * 0.5) * fade;
      ctx.strokeStyle = k % 3 === 0 ? shade(st.mid, 10) : st.mid;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + (bend + sway) * sc * 0.14, by - H * 0.65,
        bx + (bend + sway) * sc * 0.3, by - H);
      ctx.stroke();
      // Two thorns per grown cane.
      if (grow >= 1) {
        ctx.lineWidth = Math.max(1.4, sc * 0.032);
        ctx.strokeStyle = shade(st.mid, -18);
        for (const f of [0.45, 0.75]) {
          const tx = bx + (bend + sway) * sc * 0.14 * f * 2;
          const ty = by - H * f;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx + sc * 0.08 * (f > 0.5 ? 1 : -1), ty - sc * 0.05);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
    // THE ACCUMULATION: one thorn grain laid per gated beat — the
    // thicket's litter, outliving the field by nine seconds.
    if (t < 0.85 && Math.random() < c.frameDt * 3) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * c.radius * 0.75;
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        Math.random() < 0.5 ? '#3a4626' : shade(c.st.deep, -12),
        { life: 9, size: 0.05 });
    }
  },
  air(c) {
    // Leaf flecks pop off fresh growth on gated beats.
    if (c.t < 0.8 && Math.random() < c.frameDt * 8) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * c.radius * 0.7;
      c.particles.burst(c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        1, [c.st.spark, c.st.mid], {
          speed: 0.25, life: 0.8, size: 0.045, gravity: 0, shape: 'shard', spin: 4,
          z: 0.3, vz: 0.5, zg: 2, land: 'settle', layer: 'world', wobble: 0.5,
          fade: '#3a4626', fadeAt: 0.6,
        });
    }
  },
};

// ---------------------------------------------------------- grave_chill

/**
 * GRAVE_CHILL — "the breath from below."
 * The deep earth exhales THROUGH the living: thin dark seams crack
 * open across the circle and each one breathes — a slow pale mist
 * column rising from the underworld's lung — while seeded patches
 * of ground briefly deepen their shadows, gripped at the ankle.
 * The seams stay as thin dark grain-lines for eight seconds.
 */
const grave_chill: AbilitySig = {
  spawn(c) {
    smoke.deployments.creep!(asMatter(c), c.wx, c.wy, { radius: c.radius * 0.5, dur: 1.2, scale: 0.6 });
    // The seams' record: short dark grain-lines at seeded angles.
    const rand = srand(c.seed ^ 0x64c1);
    for (let s = 0; s < 4; s++) {
      const a = rand() * Math.PI * 2;
      const rr = rand() * c.radius * 0.6;
      const sx = c.wx + Math.cos(a) * rr;
      const sy = c.wy + Math.sin(a) * rr;
      const la = rand() * Math.PI;
      for (let k = 0; k < 3; k++) {
        lay(c, sx + Math.cos(la) * 0.13 * (k - 1), sy + Math.sin(la) * 0.13 * (k - 1),
          shade(c.st.deep, -16), { life: 8, size: 0.045 });
      }
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x64c1);
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE SEAMS: four thin dark cracks, each with a kink, opening
    // 0→0.2 and holding — the earth's parted lips.
    for (let s = 0; s < 4; s++) {
      const a = rand() * Math.PI * 2;
      const rr = rand() * rPx * 0.6;
      const sx = px + Math.cos(a) * rr;
      const sy = py + Math.sin(a) * rr * squash;
      const la = rand() * Math.PI;
      const open = Math.min(1, t / 0.2);
      const L = sc * 0.36 * open;
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = shade(st.deep, -22);
      ctx.lineWidth = Math.max(2.4, sc * 0.06);
      ctx.beginPath();
      ctx.moveTo(sx - Math.cos(la) * L, sy - Math.sin(la) * L * squash);
      ctx.lineTo(sx + Math.cos(la + 0.4) * L * 0.4, sy + Math.sin(la + 0.4) * L * 0.4 * squash);
      ctx.lineTo(sx + Math.cos(la) * L, sy + Math.sin(la) * L * squash);
      ctx.stroke();
      // The pale rim of each exhaling seam.
      ctx.globalAlpha = 0.6 * fade * (0.7 + 0.3 * Math.sin(c.now / 400 + s * 2));
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.2, sc * 0.028);
      ctx.beginPath();
      ctx.moveTo(sx - Math.cos(la) * L, sy - Math.sin(la) * L * squash - sc * 0.025);
      ctx.lineTo(sx + Math.cos(la) * L, sy + Math.sin(la) * L * squash - sc * 0.025);
      ctx.stroke();
    }
    // THE GRIPPED PATCHES: three seeded spots where every shadow
    // briefly deepens — the chill closing around ankles.
    const grip = Math.sin(Math.min(1, t / 0.5) * Math.PI);
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI * 2;
      const rr = rand() * rPx * 0.7;
      ctx.globalAlpha = 0.3 * grip * fade;
      ctx.fillStyle = shade(st.deep, -20);
      ctx.beginPath();
      ctx.ellipse(px + Math.cos(a) * rr, py + Math.sin(a) * rr * squash, sc * 0.24, sc * 0.12 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x64c1);
    ctx.save();
    // THE BREATH COLUMNS: each seam exhales one slow pale column —
    // a soft quad rising, wobbling once, thinning at the top.
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    for (let s = 0; s < 4; s++) {
      const a = rand() * Math.PI * 2;
      const rr = rand() * rPx * 0.6;
      rand(); // burn the seam-angle roll to stay aligned with ground
      const sx = px + Math.cos(a) * rr;
      const sy = py + Math.sin(a) * rr * squash;
      const born = 0.1 + s * 0.08;
      const u = Math.min(1, Math.max(0, (t - born) / 0.5));
      if (u <= 0) continue;
      const H = sc * 0.85 * u;
      const wob = Math.sin(c.now / 220 + s * 1.7) * sc * 0.04;
      ctx.globalAlpha = 0.28 * (1 - u * 0.5) * fade;
      ctx.fillStyle = shade(st.mid, 14);
      ctx.beginPath();
      ctx.moveTo(sx - sc * 0.08, sy);
      ctx.lineTo(sx + sc * 0.08, sy);
      ctx.lineTo(sx + sc * 0.04 + wob, sy - H);
      ctx.lineTo(sx - sc * 0.04 + wob, sy - H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.7, 0.2 * (1 - t));
  },
};

// ---------------------------------------------------------- gloom_burst

/**
 * GLOOM_BURST — "the violet orchard."
 * Plant the blight and let it bloom, season after season: on each
 * field beat one blight-flower opens at a seeded point — five dark
 * petals parting around a pale heart — sheds a petal, and closes
 * to a husk that PERSISTS. The orchard accumulates: husk grains
 * and shed petals litter the circle for nine seconds after.
 */
const gloom_burst: AbilitySig = {
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x610b);
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    ctx.save();
    // The blighted bed: a dim violet stain disc.
    ctx.globalAlpha = 0.3 * fade;
    ctx.fillStyle = shade(st.deep, -8);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.9, rPx * 0.9 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // THE ORCHARD: eight flowers on staggered clocks across the
    // field's life. Each: opens (petals part) → sheds → closes to
    // a husk that stays painted until field end.
    for (let k = 0; k < 8; k++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * rPx * 0.72;
      const bloomT = 0.05 + (k / 8) * 0.65 + rand() * 0.04;
      const u = Math.max(0, (t - bloomT) / 0.16); // open phase
      if (u <= 0) continue;
      const bx = px + Math.cos(a) * rr;
      const by = py + Math.sin(a) * rr * squash;
      const open = Math.min(1, u);
      const closed = u > 2.2; // husk phase
      const R = sc * 0.16;
      if (!closed) {
        // Five petals part around the pale heart.
        for (let p = 0; p < 5; p++) {
          const pa = (p / 5) * Math.PI * 2 + a;
          const reach = R * (0.4 + open * 0.6) * (u > 1.6 ? 1 - (u - 1.6) / 0.6 : 1);
          ctx.globalAlpha = 0.92 * fade;
          ctx.fillStyle = p % 2 === 0 ? st.mid : shade(st.mid, -14);
          ctx.beginPath();
          ctx.ellipse(bx + Math.cos(pa) * reach, by + Math.sin(pa) * reach * squash,
            R * 0.42, R * 0.24, pa, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 0.95 * fade;
        ctx.fillStyle = shade(st.mid, 28);
        ctx.beginPath();
        ctx.ellipse(bx, by, R * 0.2, R * 0.2 * squash, 0, 0, Math.PI * 2);
        ctx.fill();
        // The shed: one petal detaches at u ≈ 1.2 (crossing frame)
        // and becomes a real drifting particle + a laid stain.
        const uPrev = Math.max(0, (t - c.frameDt * 1000 / ((c.ticks ?? 40) * 50) - bloomT) / 0.16);
        if (uPrev < 1.2 && u >= 1.2) {
          const pwx = c.wx + Math.cos(a) * (rr / sc);
          const pwy = c.wy + Math.sin(a) * (rr / sc);
          c.particles.burst(pwx, pwy, 1, [st.mid, shade(st.mid, -12)], {
            speed: 0.3, life: 1.4, size: 0.05, gravity: 0, shape: 'shard', spin: 3,
            z: 0.12, vz: 0.4, zg: 1.5, land: 'settle', layer: 'world', wobble: 0.6,
          });
          lay(c, pwx + 0.1, pwy + 0.06, shade(c.st.deep, -10), { life: 9, size: 0.045 });
        }
      } else {
        // THE HUSK: a small dark closed pod, leaning.
        ctx.globalAlpha = 0.95 * fade;
        ctx.fillStyle = shade(st.deep, -14);
        ctx.beginPath();
        ctx.ellipse(bx, by - sc * 0.03, R * 0.3, R * 0.42, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.8 * fade;
        ctx.strokeStyle = st.mid;
        ctx.lineWidth = Math.max(1.2, sc * 0.026);
        ctx.beginPath();
        ctx.moveTo(bx, by + sc * 0.04);
        ctx.lineTo(bx, by - sc * 0.1);
        ctx.stroke();
      }
    }
    ctx.restore();
    // THE LITTER ACCUMULATES: husk grains laid on gated beats.
    if (t < 0.85 && Math.random() < c.frameDt * 2.5) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * c.radius * 0.7;
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        Math.random() < 0.5 ? shade(c.st.deep, -12) : c.st.deep,
        { life: 9, size: 0.05, flicker: 0.2 });
    }
  },
  air(c) {
    // Spore motes lift gently off the orchard, gated.
    if (c.t < 0.8 && Math.random() < c.frameDt * 7) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * c.radius * 0.65;
      c.particles.burst(c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        1, [c.st.spark, c.st.mid], {
          speed: 0.08, life: 1, size: 0.04, gravity: 0, shape: 'mote',
          z: 0.08, vz: 0.4, zg: 0, land: 'none', layer: 'world', shadow: 0, wobble: 0.5,
        });
    }
  },
};

// -------------------------------------------------------- the registry

/** The archmage first-half signatures, keyed by ability id. */
export const ARCHMAGE_A_SIGS: Record<string, AbilitySig> = {
  arcane_ring,
  wisp_flare,
  hearth_flare,
  undertow,
  stormlash,
  cinderstorm,
  glaciate,
  galvanic_arc,
  overgrowth,
  grave_chill,
  gloom_burst,
};
