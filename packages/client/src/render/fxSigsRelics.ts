/**
 * THE SIGNATURE LAW — the relic wave.
 *
 * Thirteen bespoke set-pieces: the ten relic actives, the Bone
 * Tempest sigil, and the two NPC specials, composed on top of the v3
 * grammar in the renderer's three strata. Same binding laws as
 * fxSignatures.ts: hard edges, save/restore hygiene, squash on the
 * ground, srand-deterministic geometry, frameDt-gated emission, ≤60
 * path ops per hook per frame.
 *
 * Relics are ancient TOOLS with one perfected trick — each signature
 * reads as machinery of old Arx doing exactly its job: a totem that
 * breathes, a snare that hides itself, a bell whose toll is the
 * weapon. The NPC specials are authored from the RECEIVING end:
 * ground_slam is threat with total clarity, rallying_howl is the
 * moment a player feels the pack turn as one. No centerpiece here
 * repeats another's, nor any exemplar's.
 */

import { shade } from './rig.js';
import { srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';

/** Screen point r px from the heart along ground angle a. */
function pt(c: SigCtx, r: number, a: number): { x: number; y: number } {
  return { x: c.px + Math.cos(a) * r, y: c.py + Math.sin(a) * r * c.squash };
}

/** Clamp to 0..1 — every staggered clock in this file runs on it. */
function cl(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * EMBER_DASH — "the relay of wicks."
 * The blink leaves its path behind as a charred wick line, and the
 * relic relights it: one white-hot bead runs the wick from departure
 * to arrival, and every station it passes catches — small standing
 * flamelets igniting IN ORDER down the line, each guttering out on
 * its own clock. "Igniting whatever you pass," told as a fuse.
 */
const ember_dash: AbilitySig = {
  spawn(c) {
    const ang = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    // Arrival flare: the bead's destination already burns.
    c.particles.burst(c.wx2, c.wy2 - 0.3, 5, [c.st.mid, c.st.core], {
      speed: 1.4, life: 0.5, size: 0.11, gravity: -2.6, dir: ang, spread: 0.9,
      shape: 'lick', flicker: 0.3, fade: c.st.deep, wobble: 0.5,
    });
    // Departure snuff: the body left, the smoke stays.
    c.particles.burst(c.wx, c.wy - 0.2, 3, [c.st.deep, '#3a3442'], {
      speed: 0.6, life: 0.8, size: 0.12, gravity: -0.9, drag: 1.6, grow: 0.24,
      shape: 'puff', fade: '#2a2431', wobble: 0.5,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const rand = srand(c.seed ^ 0xa1);
    const dx = px2 - px;
    const dy = py2 - py;
    const nx = -dy;
    const ny = dx;
    const nlen = Math.hypot(nx, ny) || 1;
    const fade = 1 - t;
    const bead = cl(t / 0.55); // the bead's run down the wick
    ctx.save();
    ctx.lineCap = 'butt';
    // The wick: a slightly kinked char line the dash burned into the
    // turf — scorched behind the bead, waiting ahead of it.
    const n = 5;
    const wx: number[] = [];
    const wy: number[] = [];
    for (let k = 0; k <= n; k++) {
      const f = k / n;
      const kink = k === 0 || k === n ? 0 : ((rand() - 0.5) * sc * 0.12) / nlen;
      wx.push(px + dx * f + nx * kink);
      wy.push(py + dy * f + ny * kink * squash);
    }
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    for (let k = 0; k <= n; k++) (k === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, wx[k]!, wy[k]!);
    ctx.stroke();
    // The lit length: behind the bead the wick glows ember-orange.
    if (bead > 0.02) {
      const lit = Math.ceil(bead * n);
      ctx.globalAlpha = 0.8 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      ctx.beginPath();
      for (let k = 0; k <= lit; k++) (k === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, wx[Math.min(k, n)]!, wy[Math.min(k, n)]!);
      ctx.stroke();
    }
    // The bead itself: one white-hot square running the line.
    if (bead < 1) {
      const g = sc * 0.09;
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = st.core;
      ctx.fillRect(px + dx * bead - g / 2, py + dy * bead - g / 2, g, g);
    }
    ctx.restore();
    c.glow(c.wx + (c.wx2 - c.wx) * bead, c.wy + (c.wy2 - c.wy) * bead, 0.8, 0.4 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const rand = srand(c.seed ^ 0xa2);
    const dx = px2 - px;
    const dy = py2 - py;
    const bead = cl(t / 0.55);
    ctx.save();
    // The stations catch: four flamelets ignite in order as the bead
    // passes, each a tongue over a hot core wedge, dying in sequence.
    for (let k = 0; k < 4; k++) {
      const f = (k + 0.5) / 4;
      const lit = cl((bead - f) * 5); // ignition snap
      const gutter = cl((t - 0.55 - k * 0.09) / 0.28); // ordered death
      const a = lit * (1 - gutter);
      if (a <= 0) continue;
      const bx = px + dx * f + (rand() - 0.5) * sc * 0.08;
      const by = py + dy * f;
      const h = sc * (0.3 + rand() * 0.16) * a;
      const w = sc * 0.07 * (0.8 + 0.2 * Math.sin(c.now / 95 + k * 2.1));
      const lean = Math.sin(c.now / 150 + k * 1.9) * w * 0.7;
      ctx.globalAlpha = 0.9 * a;
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.moveTo(bx - w, by);
      ctx.lineTo(bx + lean, by - h);
      ctx.lineTo(bx + w, by);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.moveTo(bx - w * 0.45, by);
      ctx.lineTo(bx + lean * 0.5, by - h * 0.55);
      ctx.lineTo(bx + w * 0.45, by);
      ctx.closePath();
      ctx.fill();
    }
    // The bead spits sparks as it runs.
    if (bead < 1 && Math.random() < c.frameDt * 18) {
      c.particles.burst(c.wx + (c.wx2 - c.wx) * bead, c.wy + (c.wy2 - c.wy) * bead - 0.15, 1, [st.spark, st.core], {
        speed: 1.6, life: 0.3, size: 0.05, gravity: 4, up: true, shape: 'streak', flicker: 0.5,
      });
    }
    ctx.restore();
  },
};

/**
 * HEALING_TOTEM — "the first breath."
 * The planted machine wakes by BREATHING: an inhale ring contracts
 * onto the totem, dragging pale motes in off the grass, then the
 * exhale rolls one clean life-ring back out while a seedling glyph —
 * stem and two unfurling leaf arcs — stands up at the center. Mending
 * shown as respiration: the totem takes the field's air and gives it
 * back better.
 */
const healing_totem: AbilitySig = {
  spawn(c) {
    // Planting: soil crumbs jump where the base bites the turf.
    c.particles.burst(c.wx, c.wy, 5, ['#4a4252', '#5a5045'], {
      speed: 1.0, life: 0.7, size: 0.1, gravity: -0.3, drag: 1.9, grow: 0.2,
      shape: 'puff', ground: true,
    });
    c.particles.burst(c.wx, c.wy - 0.4, 3, [c.st.spark, c.st.core], {
      speed: 0.6, life: 0.9, size: 0.1, gravity: 0.3, drag: 2.2, shape: 'glint',
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    ctx.save();
    if (t < 0.4) {
      // The inhale: a ring closing onto the base, brightening as the
      // machine draws the field's air into itself.
      const f = t / 0.4;
      const rr = rPx * (1 - f * 0.75);
      ctx.globalAlpha = 0.3 + 0.4 * f;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // The exhale: one pale life-ring rolls back out, a fainter
      // after-breath chasing it.
      const f = (t - 0.4) / 0.6;
      for (let k = 0; k < 2; k++) {
        const fk = cl(f * 1.4 - k * 0.3);
        if (fk <= 0) continue;
        const rr = rPx * (0.25 + 0.75 * fk);
        ctx.globalAlpha = (k === 0 ? 0.7 : 0.35) * (1 - fk);
        ctx.strokeStyle = k === 0 ? st.core : st.mid;
        ctx.lineWidth = Math.max(1.5, sc * (k === 0 ? 0.05 : 0.03));
        ctx.beginPath();
        ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.7, 0.3 * (t < 0.4 ? t / 0.4 : 1 - (t - 0.4) / 0.6));
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    ctx.save();
    // The seedling glyph: a stem stands up, then two leaf arcs unfurl
    // either side — the totem declaring what it grows.
    const stand = cl(t / 0.35);
    const unfurl = cl((t - 0.3) / 0.4);
    const base = py - sc * 0.15;
    const h = sc * 0.55 * stand;
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, sc * 0.045);
    ctx.beginPath();
    ctx.moveTo(px, base);
    ctx.lineTo(px, base - h);
    ctx.stroke();
    if (unfurl > 0) {
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      for (const side of [-1, 1]) {
        ctx.globalAlpha = 0.9 * unfurl;
        ctx.beginPath();
        ctx.ellipse(
          px + side * sc * 0.16, base - h * 0.75, sc * 0.17 * unfurl, sc * 0.1 * unfurl,
          side * 0.5, side > 0 ? Math.PI * 0.9 : Math.PI * 0.1, side > 0 ? Math.PI * 1.9 : Math.PI * 1.1,
        );
        ctx.stroke();
      }
      // The growing tip winks life-white.
      const tw = 0.5 + 0.5 * Math.sin(c.now / 160);
      ctx.globalAlpha = 0.8 * unfurl * tw;
      ctx.fillStyle = st.core;
      const g = sc * 0.05;
      ctx.fillRect(px - g / 2, base - h - g / 2, g, g);
    }
    // Inhale: motes dragged in off the grass toward the totem.
    if (t < 0.4 && Math.random() < c.frameDt * 14) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.9, c.wy + Math.sin(a) * c.radius * 0.9 * c.squash - 0.15, 1, [st.spark, st.core], {
        speed: 2.2, life: 0.4, size: 0.06, gravity: 0, dir: a + Math.PI, spread: 0.2, drag: 0.6,
      });
    }
    // Exhale: slow sap-glints rise off the crown.
    if (t >= 0.4 && Math.random() < c.frameDt * 8) {
      c.particles.burst(c.wx, c.wy - 0.6, 1, [st.core, st.spark], {
        speed: 0.4, life: 0.8, size: 0.09, gravity: -0.7, drag: 1.5, shape: 'glint',
      });
    }
    ctx.restore();
  },
};

/**
 * SNARE_TRAP — "the leaf-buried noose."
 * The trap's whole trick is not being seen, and the signature says
 * so: a rope noose pulls taut on the ground, cord pigtailing to its
 * anchor peg — then leaf litter sifts down OVER it and the loop sinks
 * to a barely-there dashed ghost. What remains armed is a covered
 * circle and one tell-tale peg only its owner knows to look for.
 */
const snare_trap: AbilitySig = {
  spawn(c) {
    // Litter falls from knee height — the hunter scatters cover.
    c.particles.burst(c.wx, c.wy - 0.7, 6, [c.st.mid, '#6a5a30', c.st.deep], {
      speed: 0.7, life: 0.9, size: 0.09, gravity: 2.2, shape: 'shard', spin: 6, wobble: 0.6,
    });
    c.particles.burst(c.wx, c.wy, 3, ['#4a4252', '#5a5045'], {
      speed: 0.6, life: 0.6, size: 0.09, gravity: -0.2, drag: 2.0, grow: 0.18, shape: 'puff', ground: true,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xb1);
    const pegA = rand() * Math.PI * 2;
    const bury = cl((t - 0.35) / 0.35); // the loop sinks under cover
    ctx.save();
    ctx.lineCap = 'butt';
    // The noose: taut early, a dashed ghost once buried.
    const rr = rPx * 0.7;
    ctx.globalAlpha = 0.8 - 0.62 * bury;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    if (bury > 0.5) ctx.setLineDash([sc * 0.08, sc * 0.1]);
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // The cord pigtails out to the anchor peg.
    const peg = pt(c, rPx * 0.95, pegA);
    ctx.globalAlpha = 0.7 - 0.5 * bury;
    ctx.lineWidth = Math.max(1, sc * 0.022);
    ctx.beginPath();
    ctx.moveTo(px + Math.cos(pegA) * rr, py + Math.sin(pegA) * rr * squash);
    ctx.lineTo(peg.x, peg.y);
    ctx.stroke();
    // Litter patches sift in over the loop as it buries.
    if (bury > 0) {
      for (let k = 0; k < 3; k++) {
        const a = rand() * Math.PI * 2;
        const p = pt(c, rr * (0.6 + rand() * 0.5), a);
        const s = sc * (0.1 + rand() * 0.07);
        ctx.globalAlpha = 0.55 * cl(bury * 1.6 - k * 0.25);
        ctx.fillStyle = k % 2 === 0 ? st.deep : '#6a5a30';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, s, s * 0.55, rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // The tell-tale peg — the one honest thing left showing.
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = st.deep;
    ctx.fillRect(peg.x - sc * 0.03, peg.y - sc * 0.12, sc * 0.06, sc * 0.12);
    ctx.restore();
  },
  air(c) {
    // A last few leaves settle while the cover takes.
    if (c.t > 0.3 && Math.random() < c.frameDt * 6 * (1 - c.t)) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.5, c.wy + Math.sin(a) * c.radius * 0.5 * c.squash - 0.4, 1, [c.st.mid, c.st.deep], {
        speed: 0.3, life: 0.7, size: 0.07, gravity: 1.2, shape: 'shard', spin: 5, wobble: 0.7,
      });
    }
  },
};

/**
 * STORM_BELL — "the tolling mouth."
 * The relic IS the weapon: a bronze bell silhouette hangs over the
 * caster, rocking hard off its first strike, clapper whipping
 * counter-phase — and every toll is a strike: flattened toll-rings
 * stamp outward across the ground in time with the swing while
 * lightning ticks jump off the lip at each extreme. Sound as
 * ordnance, drawn literally.
 */
const storm_bell: AbilitySig = {
  spawn(c) {
    // The first crack: white forks and a spark ring off the mouth.
    c.particles.burst(c.wx, c.wy - 1.1, 6, [c.st.spark, c.st.core], {
      speed: 3.2, life: 0.3, size: 0.07, gravity: 2, shape: 'streak',
    });
    c.particles.burst(c.wx, c.wy - 0.6, 4, [c.st.core, c.st.mid], {
      speed: 0.8, life: 0.8, size: 0.1, gravity: 0.3, drag: 2.0, shape: 'glint',
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    ctx.save();
    // Three toll-rings, one per swing: each stamps out on its own
    // clock, bronze under a white leading edge.
    for (let k = 0; k < 3; k++) {
      const f = cl((t - k * 0.3) / 0.4);
      if (f <= 0 || f >= 1) continue;
      const rr = rPx * (0.2 + 0.8 * f);
      ctx.globalAlpha = 0.6 * (1 - f);
      ctx.strokeStyle = k % 2 === 0 ? st.mid : st.deep;
      ctx.lineWidth = Math.max(2, sc * 0.06 * (1 - f) + 1);
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.8 * (1 - f);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1, sc * 0.025);
      ctx.beginPath();
      ctx.ellipse(px, py, rr * 1.05, rr * 1.05 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius, 0.4 * (1 - t));
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const hx = px;
    const hy = py - sc * 1.55; // the hanger point
    const rock = Math.sin(c.now / 90) * 0.5 * (1 - t * 0.7); // the swing, decaying
    ctx.save();
    ctx.globalAlpha = 0.9 * fade;
    ctx.translate(hx, hy);
    ctx.rotate(rock);
    // The hanger and crown.
    ctx.fillStyle = st.deep;
    ctx.fillRect(-sc * 0.04, -sc * 0.1, sc * 0.08, sc * 0.12);
    // The bell body: a flared trapezoid mouth-down.
    const bw = sc * 0.22;
    const bh = sc * 0.42;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.moveTo(-bw * 0.55, 0);
    ctx.lineTo(bw * 0.55, 0);
    ctx.lineTo(bw * 0.8, bh * 0.78);
    ctx.lineTo(bw, bh); // the flared lip
    ctx.lineTo(-bw, bh);
    ctx.lineTo(-bw * 0.8, bh * 0.78);
    ctx.closePath();
    ctx.fill();
    // The lip's bright rim — where the voice lives.
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    ctx.beginPath();
    ctx.moveTo(-bw, bh);
    ctx.lineTo(bw, bh);
    ctx.stroke();
    // The clapper whips counter-phase to the body.
    ctx.rotate(-rock * 2.1);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1.5, sc * 0.03);
    ctx.beginPath();
    ctx.moveTo(0, bh * 0.2);
    ctx.lineTo(0, bh * 1.08);
    ctx.stroke();
    ctx.fillStyle = st.core;
    const kb = sc * 0.07;
    ctx.fillRect(-kb / 2, bh * 1.08 - kb / 2, kb, kb);
    ctx.restore();
    // Lightning off the lip at the swing extremes.
    if (Math.abs(Math.sin(c.now / 90)) > 0.9 && Math.random() < c.frameDt * 26 * fade) {
      const side = Math.sin(c.now / 90) > 0 ? 1 : -1;
      c.particles.burst(c.wx + side * 0.3, c.wy - 1.1, 1, [st.spark, st.core], {
        speed: 3.0, life: 0.22, size: 0.06, gravity: 1, dir: side > 0 ? 0.3 : Math.PI - 0.3, spread: 0.5, shape: 'streak', flicker: 0.6,
      });
    }
  },
};

/**
 * HUNTERS_DECOY — "the straw twin."
 * The relic builds its lie in plain sight: a mast stands up out of
 * the turf, the crossbar drops to its shoulders, a head-knot pops on
 * and a waist-cord cinches tight — then the finished scarecrow
 * BREATHES, leaning on a slow sway with straw fringe swinging, one
 * beat too alive for a wolf to doubt.
 */
const hunters_decoy: AbilitySig = {
  spawn(c) {
    // Chaff whirls in — the twin assembles from loose straw.
    c.particles.burst(c.wx, c.wy - 0.4, 7, [c.st.mid, c.st.spark, c.st.deep], {
      speed: 1.6, life: 0.6, size: 0.08, gravity: 1.5, drag: 1.2, shape: 'shard', spin: 8,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0xc1);
    const stand = cl(t / 0.3);
    ctx.save();
    // The stand-shadow grows as the twin rises.
    ctx.globalAlpha = 0.3 * stand;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.3 * stand, sc * 0.3 * stand * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // Dropped straw around the base, seeded where it fell.
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1, sc * 0.02);
    ctx.globalAlpha = 0.5 * cl((t - 0.2) / 0.3);
    for (let k = 0; k < 4; k++) {
      const a = rand() * Math.PI * 2;
      const p = pt(c, sc * (0.25 + rand() * 0.3), a);
      const la = rand() * Math.PI;
      const l = sc * 0.09;
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(la) * l, p.y - Math.sin(la) * l * squash);
      ctx.lineTo(p.x + Math.cos(la) * l, p.y + Math.sin(la) * l * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const stand = cl(t / 0.3);
    const drop = cl((t - 0.2) / 0.3); // the crossbar's descent
    const knot = cl((t - 0.5) / 0.12);
    const cinch = cl((t - 0.55) / 0.2);
    // The finished twin breathes: a slow lean no post would have.
    const sway = knot >= 1 ? Math.sin(c.now / 420) * 0.045 : 0;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(sway);
    const h = sc * 1.05 * stand;
    // The mast.
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2.5, sc * 0.06);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -h);
    ctx.stroke();
    // The crossbar slides down from the top to the shoulders.
    if (drop > 0) {
      const cy = -h + h * 0.28 * drop;
      const cw = sc * 0.42;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(-cw, cy);
      ctx.lineTo(cw, cy);
      ctx.stroke();
      // Straw fringe swings off the arms once the bar is seated.
      if (drop >= 1) {
        ctx.strokeStyle = st.mid;
        ctx.lineWidth = Math.max(1, sc * 0.02);
        for (const side of [-1, 1]) {
          const fx0 = side * cw * 0.92;
          const swing = Math.sin(c.now / 300 + side) * sc * 0.03;
          ctx.beginPath();
          ctx.moveTo(fx0, cy);
          ctx.lineTo(fx0 + swing, cy + sc * 0.16);
          ctx.stroke();
        }
      }
    }
    // The head-knot pops on.
    if (knot > 0) {
      const g = sc * 0.14 * (0.7 + 0.3 * knot);
      ctx.globalAlpha = 0.95 * knot;
      ctx.fillStyle = st.mid;
      ctx.fillRect(-g / 2, -h - g * 0.9, g, g);
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(1, sc * 0.02);
      ctx.strokeRect(-g / 2, -h - g * 0.9, g, g);
    }
    // The waist-cord cinches: a tick shrinking to tight.
    if (cinch > 0) {
      const ww = sc * (0.2 - 0.09 * cinch);
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      ctx.beginPath();
      ctx.moveTo(-ww, -h * 0.45);
      ctx.lineTo(ww, -h * 0.45);
      ctx.stroke();
    }
    ctx.restore();
    // Loose straw sheds while the build settles.
    if (t < 0.6 && Math.random() < c.frameDt * 8) {
      c.particles.burst(c.wx, c.wy - 0.8, 1, [st.mid, st.spark], {
        speed: 0.5, life: 0.7, size: 0.06, gravity: 1.4, shape: 'shard', spin: 6, wobble: 0.5,
      });
    }
  },
};

/**
 * STONE_AEGIS — "the surfaced cairn."
 * The river stone answers by BECOMING many: five worn flat slabs
 * shoulder up out of the turf one after another — each breaking
 * ground with its own soil-burst — and settle into a slow knee-height
 * orbit around the caster, tilting as they ride. Interposition made
 * literal: the stones are simply THERE now, between you and the blow.
 */
const stone_aegis: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xd1);
    // Ground breaks at five stations around the body.
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rand() * 0.4;
      c.particles.burst(
        c.wx + Math.cos(a) * 0.7, c.wy + Math.sin(a) * 0.7 * c.squash, 1,
        ['#4a4252', '#5a5045'], {
          speed: 0.7, life: 0.7, size: 0.1, gravity: -0.3, drag: 1.8, grow: 0.22, shape: 'puff', ground: true,
        },
      );
    }
    c.particles.burst(c.wx, c.wy - 0.2, 4, [c.st.mid, c.st.deep], {
      speed: 1.8, life: 0.5, size: 0.08, gravity: 7, up: true, shape: 'shard', spin: 8,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    const rand = srand(c.seed ^ 0xd2);
    const fade = 1 - t;
    ctx.save();
    // Broken-turf ticks where each slab surfaced — the holes remain.
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1.5, sc * 0.03);
    ctx.globalAlpha = 0.5 * fade;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rand() * 0.4;
      const p = pt(c, sc * 0.7, a);
      const la = a + Math.PI / 2;
      const l = sc * 0.08;
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(la) * l, p.y - Math.sin(la) * l * squash);
      ctx.lineTo(p.x + Math.cos(la) * l, p.y + Math.sin(la) * l * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0xd3);
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    ctx.save();
    // Five slabs rise on staggered clocks and take up the orbit.
    for (let k = 0; k < 5; k++) {
      const a0 = (k / 5) * Math.PI * 2 + rand() * 0.4;
      const rise = cl(t * 3.6 - k * 0.28);
      if (rise <= 0) continue;
      const a = a0 + c.now / 1400; // the patrol
      const rr = sc * 0.72;
      const bx = px + Math.cos(a) * rr;
      const groundY = py + Math.sin(a) * rr * squash;
      const by = groundY - sc * 0.38 * rise; // shoulder up to knee height
      const tilt = Math.sin(c.now / 340 + k * 1.9) * 0.18;
      const sw = sc * (0.16 + rand() * 0.05);
      const sh = sw * 0.45;
      ctx.globalAlpha = (0.9 - 0.08 * (k % 3)) * rise * fade;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(tilt);
      ctx.fillStyle = k % 2 === 0 ? st.mid : shade(st.mid, -12);
      ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
      // The worn top edge catches the light.
      ctx.fillStyle = st.spark;
      ctx.fillRect(-sw / 2, -sh / 2, sw, Math.max(1, sh * 0.22));
      ctx.restore();
    }
    ctx.restore();
    // Grit sifts off the freshly risen stones.
    if (t < 0.4 && Math.random() < c.frameDt * 10) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * 0.7, c.wy + Math.sin(a) * 0.7 * squash - 0.35, 1, [st.deep, '#4a4252'], {
        speed: 0.3, life: 0.4, size: 0.05, gravity: 4,
      });
    }
  },
};

/**
 * COIL_LANCE — "the unwound coil."
 * The thunderclap arrives WOUND: a tight helix wraps the corridor and
 * snaps straight over the first beat — the spring releasing — leaving
 * one taut storm-rail. Barb cross-ties flash alternately down its
 * length while two static beads crawl the wire, and the turf below
 * keeps a dashed scorch seam. A lightning bolt as a machine part.
 */
const coil_lance: AbilitySig = {
  spawn(c) {
    const ang = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    // The release: storm slivers ram out past the terminus.
    c.particles.burst(c.wx2, c.wy2 - 0.35, 6, [c.st.core, c.st.spark], {
      speed: 3.6, life: 0.28, size: 0.06, gravity: 1, dir: ang, spread: 0.3, shape: 'streak', flicker: 0.4,
    });
    // Recoil at the muzzle end.
    c.particles.burst(c.wx, c.wy - 0.35, 3, [c.st.mid, c.st.core], {
      speed: 1.2, life: 0.4, size: 0.08, gravity: 0.5, dir: ang + Math.PI, spread: 0.6, shape: 'glint',
    });
  },
  ground(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    ctx.save();
    // The scorch seam: a dashed char line under the rail.
    ctx.globalAlpha = 0.35 * (1 - t);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    ctx.setLineDash([sc * 0.14, sc * 0.1]);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px2, py2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const lift = sc * 0.4;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy);
    if (len < 1) return;
    const nx = -dy / len;
    const ny = dx / len;
    const unwind = cl(t / 0.3); // the spring lets go
    const amp = sc * 0.26 * (1 - unwind);
    const fade = 1 - t;
    ctx.save();
    ctx.lineCap = 'butt';
    // The coil: a wrapped polyline collapsing to a straight rail.
    const n = 12;
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.5, sc * 0.08);
    ctx.beginPath();
    for (let k = 0; k <= n; k++) {
      const f = k / n;
      const off = Math.sin(f * Math.PI * 5 + c.seed % 7) * amp;
      const x = px + dx * f + nx * off;
      const y = py + dy * f + ny * off - lift;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // The white filament rides the same wind.
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1, sc * 0.028);
    ctx.beginPath();
    for (let k = 0; k <= n; k++) {
      const f = k / n;
      const off = Math.sin(f * Math.PI * 5 + c.seed % 7) * amp;
      const x = px + dx * f + nx * off;
      const y = py + dy * f + ny * off - lift;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    if (unwind >= 1) {
      // Barb cross-ties flash alternately down the taut rail.
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      for (let k = 0; k < 5; k++) {
        const f = (k + 1) / 6;
        const on = Math.sin(c.now / 70 + k * 2.3) > 0.1;
        if (!on) continue;
        const bl = sc * 0.09;
        ctx.globalAlpha = 0.8 * fade;
        ctx.beginPath();
        ctx.moveTo(px + dx * f - nx * bl, py + dy * f - ny * bl - lift);
        ctx.lineTo(px + dx * f + nx * bl, py + dy * f + ny * bl - lift);
        ctx.stroke();
      }
      // Two static beads crawl the wire.
      ctx.fillStyle = st.core;
      for (let k = 0; k < 2; k++) {
        const f = ((c.now / 420 + k * 0.5) % 1);
        const g = sc * 0.07;
        ctx.globalAlpha = 0.9 * fade;
        ctx.fillRect(px + dx * f - g / 2, py + dy * f - lift - g / 2, g, g);
      }
    }
    ctx.restore();
    c.glow(c.wx2, c.wy2, 0.9, 0.4 * fade);
  },
};

/**
 * BRAMBLE_BURST — "the closing hedge."
 * The briar does the rest: three thorn runners GROW around the rim,
 * arc by arc, hooking barbs as they go until the ground is fenced —
 * and on every damage pulse the whole hedge BITES, flexing inward
 * with its thorn tips flashing bleed-red before relaxing to its
 * watch. A living field that visibly takes its toll on the clock.
 */
const bramble_burst: AbilitySig = {
  spawn(c) {
    // The briar breaks soil at the rim.
    const rand = srand(c.seed ^ 0xe1);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.5;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.9,
        c.wy + Math.sin(a) * c.radius * 0.9 * c.squash,
        1, [c.st.mid, c.st.deep], {
          speed: 1.0, life: 0.6, size: 0.09, gravity: -1.4, shape: 'shard', spin: 6, up: true,
        },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, age } = c;
    const rand = srand(c.seed ^ 0xe2);
    const wither = t < 0.85 ? 1 : (1 - t) / 0.15;
    // The pulse clock: every 800ms the hedge bites inward.
    const ph = (age % 800) / 800;
    const bite = Math.max(0, 1 - ph * 5);
    const flex = 1 - 0.07 * bite;
    ctx.save();
    ctx.lineCap = 'butt';
    // Three runners, each growing around its own stretch of rim.
    for (let k = 0; k < 3; k++) {
      const a0 = (k / 3) * Math.PI * 2 + rand() * 0.5;
      const sweep = 1.9 * cl(t / 0.22 - k * 0.18); // growth, staggered
      if (sweep <= 0) continue;
      const rr = rPx * (0.86 + rand() * 0.1) * flex;
      ctx.globalAlpha = 0.75 * wither;
      ctx.strokeStyle = k % 2 === 0 ? st.deep : shade(st.deep, 10);
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, a0, a0 + sweep);
      ctx.stroke();
      // Barb hooks set along the grown length.
      for (let j = 0; j < 4; j++) {
        const ba = a0 + 0.3 + j * 0.45;
        if (ba > a0 + sweep) break;
        const bx = px + Math.cos(ba) * rr;
        const by = py + Math.sin(ba) * rr * squash;
        const out = j % 2 === 0 ? 1 : -1; // hooks alternate in/out
        const hl = sc * 0.1 * (1 + 0.5 * bite);
        ctx.globalAlpha = (bite > 0.3 ? 0.95 : 0.7) * wither;
        ctx.strokeStyle = bite > 0.3 ? '#c4372a' : st.mid;
        ctx.lineWidth = Math.max(1.5, sc * 0.03);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(ba + out * 0.9) * hl, by + Math.sin(ba + out * 0.9) * hl * squash);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { st, t, age, squash } = c;
    const wither = t < 0.85 ? 1 : 0;
    // Leaf flutter drifts inside the hedge — the briar is alive.
    if (wither > 0 && Math.random() < c.frameDt * 5) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * c.radius * 0.7;
      c.particles.burst(c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr * squash - 0.3, 1, [st.mid, st.spark], {
        speed: 0.3, life: 0.8, size: 0.07, gravity: 0.8, shape: 'shard', spin: 4, wobble: 0.6,
      });
    }
    // The bite draws blood: red flecks tick off the rim on the pulse.
    const ph = (age % 800) / 800;
    if (wither > 0 && ph < 0.15 && Math.random() < c.frameDt * 14) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.85, c.wy + Math.sin(a) * c.radius * 0.85 * squash, 1, ['#c4372a', '#6a1518'], {
        speed: 0.7, life: 0.4, size: 0.05, gravity: 5, up: true, fade: '#6a1518',
      });
    }
  },
};

/**
 * ARCANE_SEEKERS — "the closing question."
 * The mote's arrival is the seeking ENDING: three orbit slivers
 * spiral inward and collapse onto the wound — the question closing on
 * its answer — then a four-point asking-star stamps the spot and
 * pulses twice, small rings of confirmation. "Does not lose it,"
 * shown as a search visibly completing.
 */
const arcane_seekers: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xf1);
    // The collapse: slivers converge from a ring onto the point.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.5;
      c.particles.burst(c.wx + Math.cos(a) * 0.7, c.wy + Math.sin(a) * 0.5 - 0.35, 1, [c.st.mid, c.st.core], {
        speed: 3.0, life: 0.24, size: 0.06, gravity: 0, dir: a + Math.PI, spread: 0.15, shape: 'streak',
      });
    }
    c.particles.burst(c.wx, c.wy - 0.35, 3, [c.st.spark, c.st.core], {
      speed: 0.5, life: 0.7, size: 0.09, gravity: 0.2, drag: 2.0, shape: 'glint',
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    ctx.save();
    // A faint diamond seal underfoot — where the answer was written.
    ctx.globalAlpha = 0.4 * (1 - t);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1, sc * 0.025);
    const d = sc * 0.3;
    ctx.beginPath();
    ctx.moveTo(px, py - d * squash);
    ctx.lineTo(px + d, py);
    ctx.lineTo(px, py + d * squash);
    ctx.lineTo(px - d, py);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const cy = py - sc * 0.4;
    ctx.save();
    // The last spiral: three slivers ride collapsing orbits home.
    if (t < 0.3) {
      const f = t / 0.3;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      for (let k = 0; k < 3; k++) {
        const a0 = c.now / 110 + (k * Math.PI * 2) / 3;
        const rr = sc * 0.55 * (1 - f);
        if (rr < 2) break;
        ctx.globalAlpha = 0.8 * (1 - f);
        ctx.beginPath();
        ctx.ellipse(px, cy, rr, rr * 0.62, 0, a0, a0 + 1.3);
        ctx.stroke();
      }
    }
    // The asking-star: stamps with a pop, settles, pulses twice.
    const pop = t < 0.25 ? (t / 0.25) * 1.15 : 1.15 - 0.15 * cl((t - 0.25) / 0.15);
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    const g = sc * 0.11 * pop;
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = st.mid;
    ctx.fillRect(px - g * 0.35, cy - g * 1.6, g * 0.7, g * 3.2);
    ctx.fillRect(px - g * 1.6, cy - g * 0.35, g * 3.2, g * 0.7);
    ctx.fillStyle = st.core;
    ctx.fillRect(px - g * 0.18, cy - g * 0.9, g * 0.36, g * 1.8);
    ctx.fillRect(px - g * 0.9, cy - g * 0.18, g * 1.8, g * 0.36);
    // Two confirmation rings, launched on their own clocks.
    for (let k = 0; k < 2; k++) {
      const f = cl((t - 0.32 - k * 0.24) / 0.22);
      if (f <= 0 || f >= 1) continue;
      ctx.globalAlpha = 0.7 * (1 - f);
      ctx.strokeStyle = k === 0 ? st.core : st.spark;
      ctx.lineWidth = Math.max(1, sc * 0.025);
      const rr = sc * (0.12 + 0.35 * f);
      ctx.beginPath();
      ctx.ellipse(px, cy, rr, rr * 0.72, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, 0.7, 0.35 * fade);
  },
};

/**
 * VENOM_DART — "the green veining."
 * The needle's work starts AFTER the hit: the stub stands quivering
 * in the wound for a blink, then thin lime vein-lines crawl outward
 * from the puncture in branching forks — the venom entering the blood
 * where everyone can see it — each crawling tip carrying a bright
 * bead that finally drips.
 */
const venom_dart: AbilitySig = {
  spawn(c) {
    // The puncture: a tight lime spray, one drop already falling.
    c.particles.burst(c.wx, c.wy - 0.35, 4, [c.st.mid, c.st.spark], {
      speed: 1.6, life: 0.3, size: 0.06, gravity: 3, shape: 'streak',
    });
    c.particles.burst(c.wx, c.wy - 0.3, 1, [c.st.mid], {
      speed: 0.3, life: 0.5, size: 0.07, gravity: 6, fade: c.st.deep,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    const rand = srand(c.seed ^ 0x101);
    ctx.save();
    // Stain blots tick in beneath the wound as the drips land.
    for (let k = 0; k < 3; k++) {
      const on = cl((t - 0.3 - k * 0.2) / 0.1);
      if (on <= 0) continue;
      const a = rand() * Math.PI * 2;
      const p = pt(c, sc * (0.1 + rand() * 0.22), a);
      const s = sc * (0.05 + rand() * 0.04);
      ctx.globalAlpha = 0.5 * on * (1 - t * 0.6);
      ctx.fillStyle = k % 2 === 0 ? st.deep : shade(st.mid, -20);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, s, s * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0x102);
    const cy = py - sc * 0.42;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    ctx.lineCap = 'butt';
    // The stub: the needle stands in the wound, quivering out.
    if (t < 0.3) {
      const qt = 1 - t / 0.3;
      const qa = -0.7 + Math.sin(c.now / 55) * 0.06 * qt;
      ctx.globalAlpha = 0.9 * qt;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.moveTo(px, cy);
      ctx.lineTo(px + Math.cos(qa) * sc * 0.3, cy + Math.sin(qa) * sc * 0.3);
      ctx.stroke();
      // The fletch tick at the tail.
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1, sc * 0.022);
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(qa) * sc * 0.3, cy + Math.sin(qa) * sc * 0.3);
      ctx.lineTo(px + Math.cos(qa) * sc * 0.3 + Math.cos(qa + 2.4) * sc * 0.07, cy + Math.sin(qa) * sc * 0.3 + Math.sin(qa + 2.4) * sc * 0.07);
      ctx.stroke();
    }
    // The veining: three branching crawls, each segment on its own
    // reach clock, a bright bead riding every growing tip.
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1, sc * 0.022);
    for (let k = 0; k < 3; k++) {
      const a0 = rand() * Math.PI * 2;
      let x = px;
      let y = cy;
      let a = a0;
      for (let j = 0; j < 3; j++) {
        const seg = cl(t * 2.2 - k * 0.18 - j * 0.35);
        if (seg <= 0) break;
        const len = sc * (0.14 + rand() * 0.08) * seg;
        const nx2 = x + Math.cos(a) * len;
        const ny2 = y + Math.sin(a) * len * 0.7;
        ctx.globalAlpha = 0.8 * fade;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nx2, ny2);
        ctx.stroke();
        if (seg < 1 || j === 2) {
          // The crawling tip's bead.
          const g = sc * 0.045;
          ctx.globalAlpha = 0.95 * fade;
          ctx.fillStyle = st.spark;
          ctx.fillRect(nx2 - g / 2, ny2 - g / 2, g, g);
        }
        x = nx2;
        y = ny2;
        a += (rand() - 0.5) * 1.2; // the fork bends
      }
    }
    ctx.restore();
    // Late: the beads drip.
    if (t > 0.5 && Math.random() < c.frameDt * 8 * fade) {
      c.particles.burst(c.wx + (Math.random() - 0.5) * 0.5, c.wy - 0.3, 1, [st.mid, st.spark], {
        speed: 0.2, life: 0.5, size: 0.05, gravity: 5, fade: st.deep,
      });
    }
  },
};

/**
 * BONE_TEMPEST — "the surfacing ribs."
 * The fallen champion answers from BELOW: a ring of rib-tusks breaks
 * the ground around the caster, curving up and out like a great
 * ribcage surfacing, the whole ring slowly grinding through a turn —
 * then the ribs shatter outward into shard spray as the wave spends
 * itself. Three pulses, three risings: the dead keep answering.
 */
const bone_tempest: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x111);
    // The breach: bone chips and grave dust jump at the rim.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.5;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.8,
        c.wy + Math.sin(a) * c.radius * 0.8 * c.squash,
        1, [c.st.mid, c.st.core], {
          speed: 1.8, life: 0.5, size: 0.09, gravity: 6, up: true, shape: 'shard', spin: 9,
        },
      );
    }
    c.particles.burst(c.wx, c.wy - 0.1, 4, ['#4a4252', c.st.deep], {
      speed: 0.9, life: 0.9, size: 0.13, gravity: 0.3, drag: 1.6, grow: 0.26, shape: 'puff', wobble: 0.4, ground: true,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x112);
    const fade = 1 - t;
    ctx.save();
    // The breach ring: a jagged crack polygon where the ribs came up.
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    const n = 9;
    for (let k = 0; k <= n; k++) {
      const a = (k / n) * Math.PI * 2 + (c.seed % 5) * 0.25;
      const rr = rPx * (0.74 + (k % 2 === 0 ? 0.06 : -0.04));
      const x = px + Math.cos(a) * rr;
      const y = py + Math.sin(a) * rr * squash;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    // Splinter chips settle inside the breach.
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.03);
    ctx.globalAlpha = 0.55 * fade;
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      const p = pt(c, rPx * (0.2 + rand() * 0.45), a);
      const la = rand() * Math.PI;
      const l = sc * (0.05 + rand() * 0.05);
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(la) * l, p.y - Math.sin(la) * l * squash);
      ctx.lineTo(p.x + Math.cos(la) * l, p.y + Math.sin(la) * l * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x113);
    ctx.save();
    // Seven rib-tusks on the rim: rise, lean outward, grind a slow
    // turn, then collapse edge-first into the shard spray.
    const grind = c.now / 2400; // the ring's grinding turn
    const shatter = cl((t - 0.65) / 0.2);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + rand() * 0.3 + grind;
      const rise = cl(t / 0.3 - k * 0.04);
      if (rise <= 0) continue;
      const alive = 1 - shatter;
      if (alive <= 0) break;
      const bx = px + Math.cos(a) * rPx * 0.74;
      const by = py + Math.sin(a) * rPx * 0.74 * squash;
      const h = sc * (0.55 + rand() * 0.2) * rise;
      const out = Math.cos(a) >= 0 ? 1 : -1; // tusks lean off the ring
      const lean = sc * 0.2 * (0.4 + t * 0.6) * out;
      const w = sc * 0.08;
      ctx.globalAlpha = 0.9 * alive;
      ctx.fillStyle = k % 2 === 0 ? st.mid : st.core;
      ctx.beginPath();
      ctx.moveTo(bx - w, by);
      ctx.lineTo(bx + lean * 0.4, by - h * 0.6);
      ctx.lineTo(bx + lean, by - h); // the curved tusk tip
      ctx.lineTo(bx + lean * 0.55, by - h * 0.55);
      ctx.lineTo(bx + w, by);
      ctx.closePath();
      ctx.fill();
      // The shadowed inner edge — bone has thickness.
      ctx.globalAlpha = 0.6 * alive;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(1, sc * 0.02);
      ctx.beginPath();
      ctx.moveTo(bx - w * 0.5, by);
      ctx.lineTo(bx + lean * 0.35, by - h * 0.58);
      ctx.stroke();
    }
    ctx.restore();
    // The shatter: ribs become spray where they stood.
    if (shatter > 0 && shatter < 1 && Math.random() < c.frameDt * 30) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.74, c.wy + Math.sin(a) * c.radius * 0.74 * squash - 0.4, 1, [st.mid, st.core], {
        speed: 2.6, life: 0.5, size: 0.08, gravity: 7, dir: a, spread: 0.4, shape: 'shard', spin: 11,
      });
    }
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.25 * (1 - t));
  },
};

/**
 * GROUND_SLAM — "the bucking floor."
 * Read from the receiving end, the slam is the floor ITSELF turning
 * on you: one shove-band races from the point of impact to the rim,
 * broken floor plates buck upward in its wake and drop back in order,
 * and a berm of thrown earth stands at the edge — the knockback
 * distance drawn on the ground as a raised lip you were thrown over.
 */
const ground_slam: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x121);
    // The floor lets go: heavy slabs and a rim-wide dust skirt.
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.3, c.wy + Math.sin(a) * c.radius * 0.3 * c.squash, 1, ['#5a5045', c.st.deep, '#6a6375'], {
        speed: 2.2, life: 0.6, size: 0.13, gravity: 8, up: true, shape: 'shard', spin: 8,
      });
    }
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rand() * 0.4;
      c.particles.burst(c.wx + Math.cos(a) * c.radius, c.wy + Math.sin(a) * c.radius * c.squash, 1, ['#4a4252', '#3a3442'], {
        speed: 0.9, life: 1.0, size: 0.13, gravity: 0.4, drag: 1.6, grow: 0.3, dir: a, spread: 0.3, shape: 'puff', wobble: 0.4, ground: true,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x122);
    const fade = 1 - t;
    ctx.save();
    // The shove-band: one thick pressure front racing to the rim —
    // the knockback itself, visible.
    const f = cl(t / 0.28);
    if (f < 1) {
      const rr = rPx * (0.15 + 0.85 * f);
      ctx.globalAlpha = 0.75 * (1 - f * 0.5);
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(3, sc * 0.13 * (1 - f * 0.4));
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.ellipse(px, py, rr * 1.04, rr * 1.04 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The berm: thrown-earth arc segments standing at the rim after
    // the band passes — the raised lip of the crater.
    const berm = cl((t - 0.24) / 0.15);
    if (berm > 0) {
      for (let k = 0; k < 5; k++) {
        const a0 = (k / 5) * Math.PI * 2 + rand() * 0.3;
        const rr = rPx * (0.97 + rand() * 0.06);
        ctx.globalAlpha = 0.6 * berm * fade;
        ctx.strokeStyle = k % 2 === 0 ? st.deep : '#5a5045';
        ctx.lineWidth = Math.max(2.5, sc * 0.08);
        ctx.beginPath();
        ctx.ellipse(px, py, rr, rr * squash, 0, a0, a0 + 0.8);
        ctx.stroke();
        // The lip's lit crest.
        ctx.globalAlpha = 0.45 * berm * fade;
        ctx.strokeStyle = st.mid;
        ctx.lineWidth = Math.max(1, sc * 0.025);
        ctx.beginPath();
        ctx.ellipse(px, py - sc * 0.04, rr, rr * squash, 0, a0 + 0.15, a0 + 0.65);
        ctx.stroke();
      }
    }
    // The sunken heart: where the blade actually landed.
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.14, rPx * 0.14 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x123);
    ctx.save();
    // The buck: five floor plates lift in the band's wake — each a
    // tilted slab on a parabolic hop — and drop back in order.
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      const rr = rPx * (0.25 + rand() * 0.55);
      const delay = (rr / rPx) * 0.24; // the band reaches it, THEN it bucks
      const u = cl((t - delay) / 0.34);
      if (u <= 0 || u >= 1) continue;
      const h = Math.sin(u * Math.PI) * sc * 0.42;
      const bx = px + Math.cos(a) * rr;
      const by = py + Math.sin(a) * rr * squash - h;
      const sw = sc * (0.16 + rand() * 0.08);
      const tilt = (rand() - 0.5) * 0.9 * Math.sin(u * Math.PI);
      ctx.globalAlpha = 0.9;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(tilt);
      ctx.fillStyle = k % 2 === 0 ? '#5a5045' : st.deep;
      ctx.fillRect(-sw / 2, -sw * 0.22, sw, sw * 0.44);
      ctx.fillStyle = st.mid;
      ctx.fillRect(-sw / 2, -sw * 0.22, sw, Math.max(1, sw * 0.12));
      ctx.restore();
      // Dust pops where a plate slams back down.
      if (u > 0.88 && Math.random() < c.frameDt * 22) {
        c.particles.burst(c.wx + Math.cos(a) * (rr / sc), c.wy + Math.sin(a) * (rr / sc) * squash, 1, ['#4a4252', st.deep], {
          speed: 0.6, life: 0.5, size: 0.08, gravity: -0.2, drag: 1.8, grow: 0.2, shape: 'puff', ground: true,
        });
      }
    }
    ctx.restore();
  },
};

/**
 * RALLYING_HOWL — "the answering chorus."
 * Felt from inside the ring: the howl climbs off the matriarch's
 * thrown-back head as widening chevron breath-arcs — sound made
 * visible — and the terrible part answers at the rim: ear-prick marks
 * flick up one after another all around the circle, every one turned
 * INWARD toward you, while pale hackle strokes bristle along the
 * edge. The pack has your position now.
 */
const rallying_howl: AbilitySig = {
  spawn(c) {
    // The intake: pale breath and a shiver of glints at the rim.
    c.particles.burst(c.wx, c.wy - 1.0, 4, [c.st.core, c.st.mid], {
      speed: 0.7, life: 0.8, size: 0.11, gravity: -1.2, up: true, drag: 1.4, grow: 0.2, shape: 'puff', fade: '#3c3648', wobble: 0.6,
    });
    const rand = srand(c.seed ^ 0x131);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rand() * 0.4;
      c.particles.burst(c.wx + Math.cos(a) * c.radius, c.wy + Math.sin(a) * c.radius * c.squash - 0.2, 1, [c.st.spark, c.st.core], {
        speed: 0.3, life: 0.6, size: 0.08, gravity: 0.3, drag: 1.8, shape: 'glint',
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x132);
    const fade = 1 - t;
    ctx.save();
    ctx.lineCap = 'butt';
    // Hackles: short strokes just inside the rim that STAND UP as the
    // howl lands — dread bristling along the circle's edge.
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + rand() * 0.25;
      const up = cl(t * 3 - k * 0.12);
      if (up <= 0) continue;
      const p = pt(c, rPx * 0.9, a);
      const l = sc * 0.13 * up;
      ctx.globalAlpha = 0.65 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(a) * l * 0.4, p.y + Math.sin(a) * l * 0.4 * squash - l);
      ctx.stroke();
      // The chilled tip: a pale tick where the bristle ends.
      ctx.globalAlpha = 0.7 * fade * up;
      ctx.fillStyle = st.mid;
      const g = Math.max(1.5, sc * 0.03);
      ctx.fillRect(p.x + Math.cos(a) * l * 0.4 - g / 2, p.y + Math.sin(a) * l * 0.4 * squash - l - g / 2, g, g);
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x133);
    const fade = 1 - t;
    ctx.save();
    ctx.lineCap = 'butt';
    // The howl: three chevron breath-arcs climbing off the thrown-back
    // head, widening as they rise and thinning to nothing.
    ctx.strokeStyle = st.core;
    for (let k = 0; k < 3; k++) {
      const rise = t * sc * 1.2 + k * sc * 0.26;
      const a = cl(1 - rise / (sc * 1.3)) * fade;
      if (a <= 0) continue;
      const hy = py - sc * 0.95 - rise;
      const w = sc * (0.14 + rise / sc * 0.3);
      ctx.globalAlpha = 0.75 * a;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.moveTo(px - w, hy + w * 0.5);
      ctx.lineTo(px, hy);
      ctx.lineTo(px + w, hy + w * 0.5);
      ctx.stroke();
    }
    // The answer: ear-prick marks flick up around the rim, each a
    // paired chevron turned inward — the kin locking on, one by one.
    for (let k = 0; k < 6; k++) {
      const a0 = (k / 6) * Math.PI * 2 + rand() * 0.5;
      const on = cl(t * 2.6 - k * 0.22);
      if (on <= 0) continue;
      const p = pt(c, rPx * 1.02, a0);
      const ey = p.y - sc * 0.3 * on;
      const es = sc * 0.07;
      ctx.globalAlpha = 0.85 * on * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      // Two pricks, leaning toward the center — the turn.
      const leanX = px > p.x ? 1 : -1;
      for (const off of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(p.x + off * es, ey + es * 1.4);
        ctx.lineTo(p.x + off * es * 0.5 + leanX * es * 0.35, ey);
        ctx.stroke();
      }
    }
    ctx.restore();
    // Dread drifts inward: slow motes pulled toward the caller.
    if (Math.random() < c.frameDt * 9 * fade) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius, c.wy + Math.sin(a) * c.radius * squash - 0.25, 1, [st.spark, st.deep], {
        speed: 1.1, life: 0.6, size: 0.06, gravity: 0, dir: a + Math.PI, spread: 0.2, drag: 0.8, flicker: 0.4,
      });
    }
  },
};

/**
 * RAVENING_CACKLE — "the laugh that runs the warband."
 * The howl's ugly cousin, STACCATO where the howl is smooth: broken
 * bark-arcs stutter up off the thrown-back muzzle in ha-ha pairs, and
 * the answer at the rim is worse than ears — GRINS. Paired tooth-rows
 * flick on one after another around the circle, every one turned
 * inward, while claw-scuff ticks rake the dirt just inside the edge.
 * The warband has your position now, and it thinks that's funny.
 */
const ravening_cackle: AbilitySig = {
  spawn(c) {
    // The head goes back: a bark of breath, uglier and lower than the
    // howl's — two quick puffs, not one clean column.
    for (const [dx, up] of [[-0.12, 0.9], [0.14, 1.15]] as const) {
      c.particles.burst(c.wx + dx, c.wy - up, 3, [c.st.core, c.st.mid], {
        speed: 0.6, life: 0.7, size: 0.1, gravity: -1.0, up: true, drag: 1.5, grow: 0.18, shape: 'puff', fade: '#3c3648', wobble: 0.8,
      });
    }
    const rand = srand(c.seed ^ 0x141);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rand() * 0.5;
      c.particles.burst(c.wx + Math.cos(a) * c.radius, c.wy + Math.sin(a) * c.radius * c.squash - 0.2, 1, [c.st.spark, c.st.core], {
        speed: 0.35, life: 0.55, size: 0.07, gravity: 0.3, drag: 1.8, shape: 'glint',
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, rPx } = c;
    const rand = srand(c.seed ^ 0x142);
    const fade = 1 - t;
    ctx.save();
    ctx.lineCap = 'butt';
    // Claw scuffs: paired drag ticks just inside the rim, raked
    // inward — the pack shifting its weight toward you.
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + rand() * 0.3;
      const on = cl(t * 3 - k * 0.14);
      if (on <= 0) continue;
      const p = pt(c, rPx * 0.88, a);
      const inX = Math.cos(a + Math.PI);
      const inY = Math.sin(a + Math.PI) * squash;
      const l = sc * 0.11 * on;
      ctx.globalAlpha = 0.6 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      for (const off of [-1, 1]) {
        const ox = -inY * off * sc * 0.035;
        const oy = inX * off * sc * 0.035;
        ctx.beginPath();
        ctx.moveTo(p.x + ox, p.y + oy);
        ctx.lineTo(p.x + ox + inX * l, p.y + oy + inY * l);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x143);
    const fade = 1 - t;
    ctx.save();
    ctx.lineCap = 'butt';
    // The cackle: broken bark-arcs stuttering upward in ha-ha pairs —
    // short arcs at alternating offsets, never one smooth chevron.
    ctx.strokeStyle = st.core;
    for (let k = 0; k < 4; k++) {
      const rise = t * sc * 1.15 + k * sc * 0.22;
      const a = cl(1 - rise / (sc * 1.25)) * fade;
      if (a <= 0) continue;
      const side = k % 2 === 0 ? -1 : 1;
      const hy = py - sc * 0.9 - rise;
      const hx = px + side * sc * (0.08 + rise / sc * 0.12);
      const w = sc * (0.1 + rise / sc * 0.16);
      ctx.globalAlpha = 0.8 * a;
      ctx.lineWidth = Math.max(1.5, sc * 0.038);
      ctx.beginPath();
      ctx.arc(hx, hy, w, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
    // The answer: GRINS flick on around the rim — paired tooth-row
    // ticks with a dark gap, each turned toward the center.
    for (let k = 0; k < 6; k++) {
      const a0 = (k / 6) * Math.PI * 2 + rand() * 0.5;
      const on = cl(t * 2.8 - k * 0.2);
      if (on <= 0) continue;
      const p = pt(c, rPx * 1.02, a0);
      const gy = p.y - sc * 0.26 * on;
      const gw = sc * 0.09;
      const leanX = px > p.x ? 1 : -1;
      ctx.globalAlpha = 0.85 * on * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.032);
      // Upper and lower rows, slightly staggered toward the quarry.
      for (const [oy, ox] of [[-0.028, 0], [0.028, 0.02]] as const) {
        ctx.beginPath();
        ctx.moveTo(p.x - gw + leanX * ox * sc, gy + oy * sc);
        ctx.lineTo(p.x + gw + leanX * ox * sc, gy + oy * sc);
        ctx.stroke();
      }
      // Tooth ticks bridging the rows — the grin reads at one glance.
      ctx.lineWidth = Math.max(1, sc * 0.02);
      for (const tx of [-0.5, 0, 0.5]) {
        ctx.beginPath();
        ctx.moveTo(p.x + tx * gw, gy - 0.028 * sc);
        ctx.lineTo(p.x + tx * gw + leanX * 0.02 * sc, gy + 0.028 * sc);
        ctx.stroke();
      }
    }
    ctx.restore();
    // Dread drifts inward here too — the same cold pull, an uglier
    // throat behind it.
    if (Math.random() < c.frameDt * 8 * fade) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius, c.wy + Math.sin(a) * c.radius * squash - 0.25, 1, [st.spark, st.deep], {
        speed: 1.0, life: 0.6, size: 0.06, gravity: 0, dir: a + Math.PI, spread: 0.25, drag: 0.8, flicker: 0.5,
      });
    }
  },
};

// -------------------------------------------------------- registry

/** The relic actives, the Bone Tempest sigil, and the NPC specials. */
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
};
