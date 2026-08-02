/**
 * THE SIGNATURE LAW — the ARCHERY wave.
 *
 * Twelve bespoke set-pieces for the bow arts. The school's identity
 * is the ARROW ITSELF: flight lines you can read, fletching you can
 * count, shafts left standing in the earth. An archery impact is
 * never a pop — it is a THUNK with a feathered tail, and what the
 * world remembers is wood and vane, not light.
 *
 * Kind map (how the wire feeds these hooks): fan/projectile impacts
 * arrive as small-radius 'blast's; ground arts telegraph first (the
 * registry skips it) then 'blast'; storm_of_shafts lives as a long
 * 'field'; tumble_shot rides a 'dash' whose far end is the arrival;
 * snare_shot plants as a 'summon'; ricochet writes one 'bolt' per
 * hop, heart→far-end. Every hook stays graceful for any kind.
 *
 * All authoring laws of fxSignatures.ts bind here: hard edges,
 * save/restore hygiene, squash on ground, srand-deterministic
 * geometry, frameDt-gated emission, ≤~60 path ops per hook.
 */

import { srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { dust, asMatter } from './matter/index.js';

// ------------------------------------------------------------ helpers

/**
 * One arrow standing in the earth — the school's word for "the shot
 * landed": a leaning shaft line, two raked fletch vanes, a nock nub.
 * `lean` tilts the tip in screen space; `vane` scales the fletching
 * (an unfurl animates it up from 0).
 */
function standingShaft(
  c: SigCtx,
  x: number,
  y: number,
  h: number,
  lean: number,
  shaftColor: string,
  fletchColor: string,
  vane = 1,
): void {
  const { ctx, sc } = c;
  const ux = Math.sin(lean);
  const uy = -Math.cos(lean);
  const tx = x + ux * h;
  const ty = y + uy * h;
  ctx.strokeStyle = shaftColor;
  ctx.lineWidth = Math.max(1.5, sc * 0.032);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  if (vane > 0) {
    // The fletch: two vanes raked down from the nock.
    const vx = -uy;
    const vy = ux;
    const bx = x + ux * h * 0.68;
    const by = y + uy * h * 0.68;
    const w = h * 0.24 * vane;
    ctx.fillStyle = fletchColor;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(bx + vx * s * w, by + vy * s * w);
      ctx.lineTo(bx, by);
      ctx.closePath();
      ctx.fill();
    }
  }
  // The nock nub.
  const g = Math.max(2, sc * 0.045);
  ctx.fillStyle = shaftColor;
  ctx.fillRect(tx - g / 2, ty - g / 2, g, g);
}

/**
 * The one seeded fact every hook of a cast must agree on: the entry
 * angle. Drawn from its OWN salt so spawn, ground, and air read the
 * same direction no matter what else each hook rolls.
 */
function entryAngle(c: SigCtx, salt: number): number {
  return srand(c.seed ^ salt)() * Math.PI * 2;
}

// ---------------------------------------------------------- signatures

/**
 * VOLLEY — "the fletch-fan."
 * The workhorse fan lands honest: the shaft thunks in quivering and
 * its tri-vane fletching UNFURLS to full spread while two ghost rays
 * flash the siblings' arc through the wound; feather chips tumble
 * down and the entry scratches splay on the turf.
 */
const volley: AbilitySig = {
  spawn(c) {
    const ang = entryAngle(c, 0xa0);
    // Entry chips carry the arrow's motion through the wound.
    c.particles.burst(c.wx, c.wy - 0.35, 4, [c.st.spark, c.st.core], {
      speed: 2.6, life: 0.18, size: 0.06, gravity: 0, dir: ang, spread: 0.5, shape: 'streak',
    });
    // Two feather chips shear off and tumble.
    c.particles.burst(c.wx, c.wy - 0.4, 2, [c.st.mid, c.st.spark], {
      speed: 0.7, life: 0.8, size: 0.08, gravity: 1.2, drag: 1.6, shape: 'shard', spin: 9,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0xa2);
    const ang = entryAngle(c, 0xa0);
    const fade = 1 - t;
    ctx.save();
    // The entry pock.
    ctx.globalAlpha = 0.45 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.12, sc * 0.12 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // Splay scratches: the fan's footprint diverging past the wound.
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1, sc * 0.02);
    ctx.globalAlpha = 0.35 * fade;
    for (let k = -1; k <= 1; k++) {
      const a = ang + k * 0.34;
      const r0 = sc * 0.14;
      const r1 = sc * (0.36 + rand() * 0.14);
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0 * squash);
      ctx.lineTo(px + Math.cos(a) * r1, py + Math.sin(a) * r1 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0xa3);
    const ang = entryAngle(c, 0xa0);
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    // The siblings' spread: two ghost rays flash the fan's arc.
    if (t < 0.14) {
      const ft = 1 - t / 0.14;
      ctx.globalAlpha = 0.5 * ft;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1, sc * 0.02);
      for (const k of [-1, 1]) {
        const a = ang + k * 0.28;
        ctx.beginPath();
        ctx.moveTo(px - Math.cos(a) * sc * 0.85, py - sc * 0.4 - Math.sin(a) * sc * 0.3);
        ctx.lineTo(px, py - sc * 0.35);
        ctx.stroke();
      }
    }
    // The shaft, quivering to rest — and the fletch unfurling.
    const u = Math.min(1, t / 0.22);
    const unfurl = u * (2 - u); // ease-out spread
    const thrum = Math.exp(-t * 6) * Math.sin(c.now / 34) * 0.16;
    ctx.globalAlpha = 0.9 * fade;
    standingShaft(c, px, py, sc * 0.55, (rand() - 0.5) * 0.5 + thrum, st.deep, st.mid, unfurl);
    ctx.restore();
  },
};

/**
 * PIERCING_BOLT — "the through-bore."
 * Nothing stands in the wound because nothing STOPPED: the heavy
 * shaft's silhouette slides on past the strike, the exit line punches
 * out the far side brighter than the entry, and the turf keeps a
 * drilled bore ring with burrs at both mouths.
 */
const piercing_bolt: AbilitySig = {
  spawn(c) {
    const ang = entryAngle(c, 0xb0);
    // The exit spray: chips blown OUT the far side.
    c.particles.burst(c.wx, c.wy - 0.35, 5, [c.st.spark, c.st.core], {
      speed: 3.2, life: 0.22, size: 0.07, gravity: 1.5, dir: ang, spread: 0.35, shape: 'streak',
    });
    // Entry dust breathes backward off the punch — library earth.
    dust.deployments.kick!(asMatter(c), c.wx - Math.cos(ang) * 0.15, c.wy - Math.sin(ang) * 0.15, { scale: 0.35 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const ang = entryAngle(c, 0xb0);
    const fade = 1 - t;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang) * squash;
    ctx.save();
    // The through-line: dashed approach, then the bold punched exit.
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1, sc * 0.024);
    ctx.globalAlpha = 0.4 * fade;
    ctx.setLineDash([sc * 0.09, sc * 0.08]);
    ctx.beginPath();
    ctx.moveTo(px - dx * sc * 1.1, py - dy * sc * 1.1);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.setLineDash([]);
    const out = Math.min(1, t / 0.18); // the exit punches out early
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + dx * sc * 0.8 * out, py + dy * sc * 0.8 * out);
    ctx.stroke();
    // Burrs at the exit mouth.
    if (out >= 1) {
      const ex = px + dx * sc * 0.8;
      const ey = py + dy * sc * 0.8;
      ctx.lineWidth = Math.max(1, sc * 0.02);
      ctx.beginPath();
      ctx.moveTo(ex - dy * sc * 0.09, ey + dx * sc * 0.09 * squash);
      ctx.lineTo(ex + dy * sc * 0.09, ey - dx * sc * 0.09 * squash);
      ctx.stroke();
    }
    // The bore ring: the drilled mouth the turf keeps.
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.14, sc * 0.14 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const ang = entryAngle(c, 0xb0);
    ctx.save();
    // The shaft that would not stop: its silhouette slides on past.
    if (t < 0.3) {
      const ft = 1 - t / 0.3;
      const off = sc * (0.25 + t * 3.4);
      const gx = px + Math.cos(ang) * off;
      const gy = py - sc * 0.4 + Math.sin(ang) * off * 0.35;
      ctx.globalAlpha = 0.8 * ft;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.moveTo(gx - Math.cos(ang) * sc * 0.4, gy - Math.sin(ang) * sc * 0.14);
      ctx.lineTo(gx, gy);
      ctx.stroke();
    }
    // What lingers is only the wound's glint, winking as it cools.
    if (t > 0.15) {
      const tw = Math.abs(Math.sin(c.now / 120 + (c.seed % 7)));
      ctx.globalAlpha = 0.7 * (1 - t) * tw;
      ctx.fillStyle = st.core;
      const g = sc * 0.05;
      ctx.fillRect(px - g / 2, py - sc * 0.4 - g * 1.8, g, g * 3.6);
      ctx.fillRect(px - g * 1.8, py - sc * 0.4 - g / 2, g * 3.6, g);
    }
    ctx.restore();
  },
};

/**
 * TUMBLE_SHOT — "the somersault hoops."
 * The roll writes itself on the turf: three hoop prints touch down
 * in sequence along the escape line like a wheel's kiss, and at the
 * rise the parting string twangs — one taut release line snapped
 * back at whatever you fled, vibrating itself still.
 */
const tumble_shot: AbilitySig = {
  spawn(c) {
    if (c.kind === 'dash') {
      // Dust kicks where the roll leaves and where it lands.
      const m = asMatter(c);
      dust.deployments.kick!(m, c.wx, c.wy, { scale: 0.45 });
      dust.deployments.kick!(m, c.wx2, c.wy2, { scale: 0.45 });
    } else {
      // The mid-tumble arrow lands: a thin thunk, chips and a feather.
      c.particles.burst(c.wx, c.wy - 0.3, 3, [c.st.spark, c.st.core], {
        speed: 2.2, life: 0.16, size: 0.05, gravity: 0, shape: 'streak',
      });
    }
  },
  ground(c) {
    if (c.kind !== 'dash') return;
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const fade = 1 - t;
    ctx.save();
    // Three hoop prints touch down in sequence along the roll.
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1.5, sc * 0.03);
    for (let k = 0; k < 3; k++) {
      const f = 0.22 + k * 0.28;
      const seen = Math.min(1, Math.max(0, (t - k * 0.07) * 9));
      if (seen <= 0) continue;
      const hx = px + (px2 - px) * f;
      const hy = py + (py2 - py) * f;
      ctx.globalAlpha = 0.5 * fade * seen;
      ctx.beginPath();
      ctx.ellipse(hx, hy, sc * 0.17 * seen, sc * 0.17 * seen * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    if (c.kind === 'dash') {
      const { ctx, st, t, sc, px, py, px2, py2 } = c;
      if (t >= 0.45) return;
      // The parting string: at the rise, one release line snaps back
      // at what you fled, its vibration ghosts damping out.
      const ang = Math.atan2(py - py2, px - px2);
      const ft = 1 - t / 0.45;
      const decay = Math.exp(-t * 9);
      ctx.save();
      const ax = px2;
      const ay = py2 - sc * 0.4;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      for (let k = -1; k <= 1; k++) {
        const off = k * Math.sin(c.now / 28) * decay * sc * 0.09;
        ctx.globalAlpha = (k === 0 ? 0.9 : 0.4) * ft;
        ctx.beginPath();
        ctx.moveTo(ax - Math.sin(ang) * off, ay + Math.cos(ang) * off);
        ctx.lineTo(
          ax + Math.cos(ang) * sc * 0.95 - Math.sin(ang) * off * 0.3,
          ay + Math.sin(ang) * sc * 0.95 + Math.cos(ang) * off * 0.3,
        );
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    // The impact half: a small shaft stands where the parting shot hit.
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0xc3);
    ctx.save();
    ctx.globalAlpha = 0.9 * (t < 0.7 ? 1 : (1 - t) / 0.3);
    const thrum = Math.exp(-t * 6) * Math.sin(c.now / 36) * 0.14;
    standingShaft(c, px, py, sc * 0.45, (rand() - 0.5) * 0.6 + thrum, st.deep, st.mid);
    ctx.restore();
  },
};

/**
 * RAIN_OF_ARROWS — "the shaft thicket."
 * The darkened patch pays off as WOOD: eight shafts drop in on
 * staggered clocks — each a steep falling streak until its thunk —
 * and what's left is a leaning thicket of standing arrows, feathers
 * sifting off it while the pocked turf counts the landings.
 */
const rain_of_arrows: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xd1);
    // The first sheet of the fall: steep streaks out of the sky.
    for (let k = 0; k < 8; k++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * c.radius * 0.9;
      // Each shaft falls on TRUE altitude — spawned high over its
      // own landing point, slanting east as it drops, dying at the
      // dirt the instant it arrives. (Bespoke shafts, v5 physics.)
      c.particles.burst(c.wx + Math.cos(a) * rr - 0.22, c.wy + Math.sin(a) * rr, 1, [c.st.deep, c.st.mid], {
        speed: 1.2, life: 0.5, size: 0.09, gravity: 0, dir: 0, spread: 0.15,
        shape: 'streak', z: 1.7, vz: -7, zg: 0, land: 'die', layer: 'world', shadow: 0,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xd2);
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    ctx.save();
    ctx.fillStyle = st.deep;
    // Pocks appear on each shaft's own landing clock.
    for (let k = 0; k < 8; k++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * rPx * 0.85;
      rand(); // lean (consumed to stay aligned with the air hook)
      const tk = 0.04 + k * 0.055;
      if (t < tk) continue;
      ctx.globalAlpha = 0.45 * fade;
      ctx.beginPath();
      ctx.ellipse(px + Math.cos(a) * rr, py + Math.sin(a) * rr * squash, sc * 0.08, sc * 0.08 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xd2); // same walk as ground — shafts land in their pocks
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    ctx.save();
    for (let k = 0; k < 8; k++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * rPx * 0.85;
      const lean = (rand() - 0.5) * 0.7;
      const bx = px + Math.cos(a) * rr;
      const by = py + Math.sin(a) * rr * squash;
      const tk = 0.04 + k * 0.055;
      if (t < tk) {
        // Still falling: a steep streak closing on its landing point.
        const drop = ((tk - t) / tk) * sc * 1.6;
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = st.deep;
        ctx.lineWidth = Math.max(1.5, sc * 0.032);
        ctx.beginPath();
        ctx.moveTo(bx + Math.sin(lean) * sc * 0.2, by - drop - sc * 0.45);
        ctx.lineTo(bx, by - drop);
        ctx.stroke();
      } else {
        // Landed: it joins the thicket, quivering off its thunk.
        const since = t - tk;
        const thrum = Math.exp(-since * 14) * Math.sin(c.now / 32 + k) * 0.18;
        ctx.globalAlpha = 0.85 * fade;
        standingShaft(c, bx, by, sc * 0.5, lean + thrum, st.deep, st.mid);
      }
    }
    // Feathers sift off the thicket while it stands.
    if (Math.random() < c.frameDt * 5 * fade) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.6, c.wy + Math.sin(a) * c.radius * 0.6 * squash - 0.5, 1, [st.mid, st.spark], {
        speed: 0.3, life: 0.9, size: 0.07, gravity: 0.8, drag: 1.8, shape: 'shard', spin: 6, wobble: 0.5,
      });
    }
    ctx.restore();
  },
};

/**
 * STORM_OF_SHAFTS — "the shaft-black sky."
 * The patch of sky stays owned: a wheel of nose-down arrow
 * silhouettes circles above the zone for the field's whole life,
 * letting fall steep streaks that surge on the pulse schedule while
 * the floor throbs its ring and gathers pock-scars.
 */
const storm_of_shafts: AbilitySig = {
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xe2);
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    // The pulse throb: the rim flashes each time the sky lets go.
    const cycle = (c.age % 700) / 700;
    const flash = Math.max(0, 1 - cycle * 3.2);
    ctx.save();
    if (flash > 0) {
      ctx.globalAlpha = 0.5 * flash * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.92, rPx * 0.92 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The floor gathers its scars, one landing at a time.
    const pocks = Math.min(9, Math.floor(t * 14));
    ctx.fillStyle = st.deep;
    ctx.globalAlpha = 0.4 * fade;
    for (let k = 0; k < 9; k++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * rPx * 0.8;
      if (k >= pocks) continue;
      ctx.beginPath();
      ctx.ellipse(px + Math.cos(a) * rr, py + Math.sin(a) * rr * squash, sc * 0.07, sc * 0.07 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xe3);
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    ctx.save();
    // The black wheel: seven nose-down silhouettes circle the zone,
    // each an arrow waiting its turn to fall.
    const spin = c.now / 1400;
    for (let k = 0; k < 7; k++) {
      const a = spin + (k / 7) * Math.PI * 2 + rand() * 0.3;
      const bx = px + Math.cos(a) * rPx * 0.75;
      const by = py + Math.sin(a) * rPx * 0.75 * squash - sc * 1.7;
      const bob = Math.sin(c.now / 300 + k * 1.9) * sc * 0.05;
      ctx.globalAlpha = 0.7 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.moveTo(bx + sc * 0.09, by + bob - sc * 0.34);
      ctx.lineTo(bx, by + bob);
      ctx.stroke();
      // The nock nub crowns each silhouette.
      const g = Math.max(2, sc * 0.045);
      ctx.fillStyle = st.mid;
      ctx.fillRect(bx + sc * 0.09 - g / 2, by + bob - sc * 0.34 - g / 2, g, g);
    }
    // The fall: a steady sift, surging when the pulse lets go.
    const cycle = (c.age % 700) / 700;
    const rate = 8 + (cycle < 0.18 ? 15 : 0);
    if (Math.random() < c.frameDt * rate * fade) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * c.radius * 0.85;
      // The black sky delivers on true altitude — every shaft falls
      // to its own landing point and dies at the dirt.
      c.particles.burst(c.wx + Math.cos(a) * rr - 0.22, c.wy + Math.sin(a) * rr, 1, [st.deep, st.mid], {
        speed: 1.3, life: 0.5, size: 0.09, gravity: 0, dir: 0, spread: 0.12,
        shape: 'streak', z: 1.6, vz: -7.5, zg: 0, land: 'die', layer: 'world', shadow: 0,
      });
    }
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.2 * fade);
    ctx.restore();
  },
};

/**
 * LONGSHOT — "buried to the feathers."
 * A shot that crossed the whole field lands with the field's whole
 * weight: the shaft SINKS over its first beats until only the
 * thrumming fletch stands proud of the turf, while surveyor's ticks
 * stream back along the flight line — the distance, itemized.
 */
const longshot: AbilitySig = {
  spawn(c) {
    const ang = entryAngle(c, 0xf0);
    // The weight of arrival: chips driven forward, dust stamped up.
    c.particles.burst(c.wx, c.wy - 0.3, 3, [c.st.spark, c.st.core], {
      speed: 3, life: 0.2, size: 0.06, gravity: 1, dir: ang, spread: 0.3, shape: 'streak',
    });
    // The weight stamps its dust up — library earth at the strike.
    dust.deployments.kick!(asMatter(c), c.wx, c.wy, { scale: 0.55 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const ang = entryAngle(c, 0xf0);
    const fade = 1 - t;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang) * squash;
    ctx.save();
    // Surveyor's ticks: the crossed distance counted back up the line.
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1, sc * 0.022);
    for (let k = 0; k < 5; k++) {
      const d = sc * (0.5 + k * 0.42);
      const seen = Math.min(1, Math.max(0, (t - k * 0.05) * 8));
      if (seen <= 0) continue;
      ctx.globalAlpha = (0.5 - k * 0.08) * fade * seen;
      const tx = px - dx * d;
      const ty = py - dy * d;
      ctx.beginPath();
      ctx.moveTo(tx - dy * sc * 0.1, ty + dx * sc * 0.1 * squash);
      ctx.lineTo(tx + dy * sc * 0.1, ty - dx * sc * 0.1 * squash);
      ctx.stroke();
    }
    // The deep pock the sinking shaft drills.
    ctx.globalAlpha = 0.55 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.1, sc * 0.1 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0xf3);
    const lean = (rand() - 0.5) * 0.4;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    ctx.save();
    // The sink: the shaft drives itself home until only fletch shows.
    const sink = Math.min(1, t / 0.5);
    const h = sc * 0.62 * (1 - sink * 0.72);
    const thrum = Math.exp(-t * 3.5) * Math.sin(c.now / 30) * 0.2;
    ctx.globalAlpha = 0.9 * fade;
    standingShaft(c, px, py, h, lean + thrum, st.deep, st.mid);
    // The buried tip's protest: a glint at the mouth once it's home.
    if (sink >= 1) {
      const tw = Math.abs(Math.sin(c.now / 140 + (c.seed % 5)));
      ctx.globalAlpha = 0.6 * fade * tw;
      ctx.fillStyle = st.core;
      const g = sc * 0.04;
      ctx.fillRect(px - g / 2, py - g * 1.6, g, g * 3.2);
    }
    ctx.restore();
  },
};

/**
 * SNARE_SHOT — "the staked jaw."
 * The trap arrives OPEN: eight teeth snap outward around the ring on
 * staggered clocks while trip-cords draw taut from each tooth to the
 * driven center stake — a jaw cocked against the ground, waiting for
 * an ankle.
 */
const snare_shot: AbilitySig = {
  spawn(c) {
    // Planting scatter: leaf chips kicked off the staked ground.
    c.particles.burst(c.wx, c.wy, 5, [c.st.mid, c.st.spark], {
      speed: 1.2, life: 0.6, size: 0.08, gravity: 2, drag: 1, shape: 'shard', spin: 7,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x52);
    ctx.save();
    const n = 8;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + rand() * 0.2;
      // Each tooth snaps open on its own clock.
      const set = Math.min(1, Math.max(0, t * 3.2 - k * 0.14));
      if (set <= 0) continue;
      const nx = Math.cos(a);
      const ny = Math.sin(a) * squash;
      const bx = px + nx * rPx * 0.85;
      const by = py + ny * rPx * 0.85;
      // The tooth: a wedge cocked outward from the ring.
      const len = sc * 0.22 * set;
      const w = sc * 0.08;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = k % 2 === 0 ? st.deep : st.mid;
      ctx.beginPath();
      ctx.moveTo(bx + nx * len, by + ny * len);
      ctx.lineTo(bx - ny * w, by + nx * w * squash);
      ctx.lineTo(bx + ny * w, by - nx * w * squash);
      ctx.closePath();
      ctx.fill();
      // The trip-cord draws taut once its tooth is set.
      if (set >= 1) {
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = st.spark;
        ctx.lineWidth = Math.max(1, sc * 0.02);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(px, py);
        ctx.stroke();
      }
    }
    // The center stake's collar.
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.09, sc * 0.09 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    ctx.save();
    // The drive: the center stake slams down out of the arrow's arc.
    if (t < 0.22) {
      const ft = t / 0.22;
      ctx.globalAlpha = 0.9 * (1 - ft);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(px, py - sc * (1.1 - ft * 0.9));
      ctx.lineTo(px, py - sc * 0.06);
      ctx.stroke();
    } else {
      // What stands after: the stake's stub, armed and patient.
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(2, sc * 0.045);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, py - sc * 0.2);
      ctx.stroke();
      const tw = Math.abs(Math.sin(c.now / 180));
      ctx.globalAlpha = 0.6 * tw;
      ctx.fillStyle = st.spark;
      const g = sc * 0.045;
      ctx.fillRect(px - g / 2, py - sc * 0.2 - g / 2, g, g);
    }
    ctx.restore();
  },
};

/** Ricochet's seeded change of mind — one fact, shared by both hooks. */
function deflection(c: SigCtx): number {
  const rand = srand(c.seed ^ 0x60);
  return (rand() < 0.5 ? -1 : 1) * (0.7 + rand() * 0.6);
}

/**
 * RICOCHET — "the written angle."
 * Every hop leaves its geometry on the air: the taut flight segment
 * decays into dashes, and at the corner the deflection is DRAWN —
 * incoming stroke, outgoing stroke, and the little protractor arc
 * between them, as if the arrow diagrammed its own change of mind.
 */
const ricochet: AbilitySig = {
  spawn(c) {
    // Corner sparks fly off the WRITTEN angle — the same deflection
    // the air hook diagrams.
    const inA = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    const outA = inA + deflection(c);
    c.particles.burst(c.wx2, c.wy2 - 0.35, 4, [c.st.spark, c.st.core], {
      speed: 2.4, life: 0.2, size: 0.06, gravity: 0.5, dir: outA, spread: 0.5, shape: 'streak',
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px2, py2 } = c;
    ctx.save();
    // The strike's footprint under the corner.
    ctx.globalAlpha = 0.4 * (1 - t);
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px2, py2, sc * 0.12, sc * 0.12 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const fade = 1 - t;
    const lift = sc * 0.35;
    const inA = Math.atan2(py2 - py, px2 - px);
    const outA = inA + deflection(c);
    ctx.save();
    // The flight segment, taut at first, decaying into dashes.
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.03);
    ctx.globalAlpha = 0.7 * fade;
    if (t > 0.35) ctx.setLineDash([sc * 0.12, sc * 0.1]);
    ctx.beginPath();
    ctx.moveTo(px, py - lift);
    ctx.lineTo(px2, py2 - lift);
    ctx.stroke();
    ctx.setLineDash([]);
    // The corner: incoming and outgoing strokes, drawn bold.
    const cx = px2;
    const cy = py2 - lift;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2, sc * 0.045);
    ctx.globalAlpha = 0.9 * fade;
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(inA) * sc * 0.4, cy - Math.sin(inA) * sc * 0.4);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + Math.cos(outA) * sc * 0.5, cy + Math.sin(outA) * sc * 0.5);
    ctx.stroke();
    // The protractor arc: the angle itself, measured and signed.
    const a0 = Math.min(inA + Math.PI, outA);
    const a1 = Math.max(inA + Math.PI, outA);
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1, sc * 0.02);
    ctx.globalAlpha = 0.65 * fade;
    ctx.beginPath();
    ctx.ellipse(cx, cy, sc * 0.2, sc * 0.2, 0, a0, a1);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * SKYFALL_SHOT — "the plumb line."
 * Counted to two and answered from straight overhead: a dead-vertical
 * drop-line flashes floor to sky, then one GREAT shaft stands plumb
 * in a punched crater whose shove-ticks stretch outward — the
 * knockback written as rays leaving the rim.
 */
const skyfall_shot: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x71);
    void rand;
    // The shove: the library's rim skirt drives dust out flat in
    // every direction — the plumb strike's pressure ring.
    dust.deployments.skirt!(asMatter(c), c.wx, c.wy, {
      radius: c.radius * 0.4, dur: 0.35, scale: 1,
    });
    // Splinters of the strike jump straight up around the shaft.
    c.particles.burst(c.wx, c.wy - 0.2, 5, [c.st.spark, c.st.core], {
      speed: 2.2, life: 0.35, size: 0.07, gravity: 6, up: true, shape: 'streak',
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x72);
    const fade = 1 - t;
    ctx.save();
    // The punched crater ring.
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.5, rPx * 0.5 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Shove-ticks: rays leaving the rim, stretching with the push.
    const push = Math.min(1, t / 0.3);
    ctx.lineWidth = Math.max(1.5, sc * 0.03);
    ctx.strokeStyle = st.mid;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + rand() * 0.25;
      const r0 = rPx * 0.55;
      const r1 = r0 + rPx * (0.25 + rand() * 0.2) * push;
      ctx.globalAlpha = 0.5 * fade;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0 * squash);
      ctx.lineTo(px + Math.cos(a) * r1, py + Math.sin(a) * r1 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    ctx.save();
    // The plumb line: the fall itself, floor to sky, gone in a blink.
    if (t < 0.15) {
      const ft = 1 - t / 0.15;
      ctx.globalAlpha = 0.9 * ft;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.5, sc * 0.07);
      ctx.beginPath();
      ctx.moveTo(px, py - sc * 2.6);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      ctx.beginPath();
      ctx.moveTo(px, py - sc * 2.6);
      ctx.lineTo(px, py);
      ctx.stroke();
    }
    // The great shaft: plumb-vertical, settling off its strike.
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    const settle = Math.exp(-t * 5) * Math.sin(c.now / 40) * 0.1;
    ctx.globalAlpha = 0.95 * fade;
    standingShaft(c, px, py, sc * 1.05, settle, st.deep, st.mid);
    c.glow(c.wx, c.wy, c.radius * 0.9, 0.35 * fade);
    ctx.restore();
  },
};

/**
 * PHANTOM_FLIGHT — "the phantom recall."
 * The wound keeps no wood: a pale after-image of the shaft hangs in
 * the strike a beat, then slides BACKWARD out of it and glides home
 * the way it came, its deeper twin trailing half a step behind and
 * shedding glints — the arrow was never yours to keep.
 */
const phantom_flight: AbilitySig = {
  spawn(c) {
    // Pale motes where the phantom passed through.
    c.particles.burst(c.wx, c.wy - 0.4, 5, [c.st.core, c.st.spark], {
      speed: 0.6, life: 0.7, size: 0.09, gravity: 0.2, drag: 2, shape: 'glint',
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    ctx.save();
    // The wound's pale seal: a thin ring, cooling.
    ctx.globalAlpha = 0.4 * (1 - t);
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1, sc * 0.025);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.16, sc * 0.16 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0x83);
    const ang = rand() * Math.PI * 2; // the way home
    const fade = 1 - t;
    ctx.save();
    // The recall: the phantom shaft holds a beat, then glides back.
    const pull = Math.max(0, (t - 0.25) / 0.75);
    const off = pull * sc * 1.5;
    for (const [step, color, a] of [[0, st.core, 0.85], [0.6, st.spark, 0.5]] as const) {
      const offK = Math.max(0, off - step * sc * 0.3); // the twin lags half a step
      const gx = px + Math.cos(ang) * offK;
      const gy = py - sc * 0.42 + Math.sin(ang) * offK * 0.4;
      ctx.globalAlpha = a * fade;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.moveTo(gx - Math.cos(ang) * sc * 0.42, gy - Math.sin(ang) * sc * 0.15);
      ctx.lineTo(gx, gy);
      ctx.stroke();
      // The phantom keeps its fletch: two pale nubs at the tail.
      const nx = gx - Math.cos(ang) * sc * 0.42;
      const ny = gy - Math.sin(ang) * sc * 0.15;
      const g = Math.max(2, sc * 0.04);
      ctx.fillStyle = color;
      ctx.fillRect(nx - g / 2, ny - g * 1.3, g, g);
      ctx.fillRect(nx - g / 2, ny + g * 0.3, g, g);
    }
    // Glints shed along the recall path.
    if (pull > 0 && Math.random() < c.frameDt * 10 * fade) {
      c.particles.burst(c.wx + Math.cos(ang) * (off / sc) * 0.9, c.wy - 0.5, 1, [st.core, st.spark], {
        speed: 0.2, life: 0.5, size: 0.08, gravity: 0.4, shape: 'glint',
      });
    }
    ctx.restore();
  },
};

/**
 * ARROW_TEMPEST — "the seeker's coil."
 * A homing shaft's flight has no straight lines: a comet head runs a
 * tightening spiral track into the wound — the hunt, diagrammed —
 * then the whole coil hangs as a dashed ghost while storm-chips
 * crackle at the terminus.
 */
const arrow_tempest: AbilitySig = {
  spawn(c) {
    // The storm-wreathed arrival: crackle glints around the strike.
    c.particles.burst(c.wx, c.wy - 0.4, 5, [c.st.core, c.st.spark], {
      speed: 0.9, life: 0.5, size: 0.08, gravity: 0.3, drag: 1.6, shape: 'glint', flicker: 0.4,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    ctx.save();
    // The coil's shadow: two faint arcs under the hunt.
    ctx.globalAlpha = 0.3 * (1 - t);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1, sc * 0.022);
    const a0 = (c.seed % 7) * 0.9;
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.55, sc * 0.55 * squash, 0, a0, a0 + 2.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.3, sc * 0.3 * squash, 0, a0 + 2.8, a0 + 4.6);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x93);
    const base = Math.max(rPx, sc * 0.9) * 1.3;
    const a0 = rand() * Math.PI * 2;
    const turn = rand() < 0.5 ? -1 : 1;
    const lift = sc * 0.4;
    const N = 16;
    const pt = (i: number): { x: number; y: number } => {
      const f = i / N;
      const a = a0 + turn * f * Math.PI * 2.4;
      const r = base * (1 - f * 0.94);
      return { x: px + Math.cos(a) * r, y: py - lift + Math.sin(a) * r * 0.5 };
    };
    ctx.save();
    if (t < 0.38) {
      // The hunt: a comet head runs the spiral, six segments of tail.
      const head = Math.floor(N * (t / 0.38));
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      for (let i = Math.max(0, head - 6); i <= head; i++) {
        const p = pt(i);
        if (i === Math.max(0, head - 6)) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      const hp = pt(head);
      ctx.fillStyle = st.core;
      const g = Math.max(2.5, sc * 0.06);
      ctx.fillRect(hp.x - g / 2, hp.y - g / 2, g, g);
    } else {
      // The hunt remembered: the whole coil, dashed and fading.
      const ft = (1 - t) / 0.62;
      ctx.globalAlpha = 0.5 * ft;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.022);
      ctx.setLineDash([sc * 0.08, sc * 0.09]);
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const p = pt(i);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      // Storm-chip at the terminus: a jagged three-stroke crackle.
      const jig = Math.sin(c.now / 60) > 0 ? 1 : -1;
      ctx.globalAlpha = 0.8 * ft;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      ctx.beginPath();
      ctx.moveTo(px, py - lift - sc * 0.3);
      ctx.lineTo(px + jig * sc * 0.08, py - lift - sc * 0.16);
      ctx.lineTo(px - jig * sc * 0.06, py - lift - sc * 0.05);
      ctx.stroke();
    }
    ctx.restore();
  },
};

/**
 * WARDEN_VOLLEY — "the no-further bar."
 * The wall-top answer draws its law on the ground: a bold bar slams
 * across the approach with notched ends, shove-ticks stamp the way
 * BACK the intruder is going, and a palisade stake stands raked
 * toward the foe — a fence built from one arrow.
 */
const warden_volley: AbilitySig = {
  spawn(c) {
    const ang = entryAngle(c, 0xa9); // the shove direction
    // Chips fly the way the target is going: backward, told off.
    c.particles.burst(c.wx, c.wy - 0.3, 4, [c.st.spark, c.st.mid], {
      speed: 2, life: 0.3, size: 0.07, gravity: 2, dir: ang, spread: 0.5, shape: 'streak',
    });
    c.particles.burst(c.wx, c.wy - 0.4, 1, [c.st.mid], {
      speed: 0.5, life: 0.8, size: 0.08, gravity: 1, drag: 1.6, shape: 'shard', spin: 6,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const ang = entryAngle(c, 0xa9);
    const fade = 1 - t;
    // The bar lies perpendicular to the shove.
    const bx = -Math.sin(ang);
    const by = Math.cos(ang) * squash;
    const grow = Math.min(1, t / 0.12);
    const L = sc * 0.72 * grow;
    ctx.save();
    // NO further: the bar itself, bold and flat.
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(3, sc * 0.09);
    ctx.beginPath();
    ctx.moveTo(px - bx * L, py - by * L);
    ctx.lineTo(px + bx * L, py + by * L);
    ctx.stroke();
    // Notched ends: the bar's teeth.
    if (grow >= 1) {
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.strokeStyle = st.mid;
      for (const s of [-1, 1]) {
        const ex = px + bx * L * s;
        const ey = py + by * L * s;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex + Math.cos(ang) * sc * 0.16, ey + Math.sin(ang) * sc * 0.16 * squash);
        ctx.stroke();
      }
    }
    // Shove-ticks stamp the way back the intruder is going.
    const push = Math.min(1, Math.max(0, (t - 0.1) / 0.25));
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.03);
    for (let k = 0; k < 3; k++) {
      const d = sc * (0.28 + k * 0.2) * push;
      if (d <= 0) continue;
      ctx.globalAlpha = (0.55 - k * 0.12) * fade;
      const tx = px + Math.cos(ang) * d;
      const ty = py + Math.sin(ang) * d * squash;
      ctx.beginPath();
      ctx.moveTo(tx - bx * sc * 0.14, ty - by * sc * 0.14);
      ctx.lineTo(tx + bx * sc * 0.14, ty + by * sc * 0.14);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const ang = entryAngle(c, 0xa9);
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    // The palisade stake: raked hard toward the foe, holding its line.
    const rake = 0.55 * (Math.cos(ang) >= 0 ? 1 : -1);
    const thrum = Math.exp(-t * 6) * Math.sin(c.now / 36) * 0.12;
    ctx.globalAlpha = 0.9 * fade;
    standingShaft(c, px, py, sc * 0.58, rake + thrum, st.deep, st.mid);
    ctx.restore();
  },
};

// -------------------------------------------------------- registry

/**
 * The archery wave of THE SIGNATURE LAW — merged into the master
 * SIGNATURES table by the integrating lead.
 */
export const ARCHERY_SIGS: Record<string, AbilitySig> = {
  tumble_shot,
  rain_of_arrows,
  storm_of_shafts,
  longshot,
  snare_shot,
  ricochet,
  skyfall_shot,
  phantom_flight,
  arrow_tempest,
  warden_volley,
  volley,
  piercing_bolt,
};
