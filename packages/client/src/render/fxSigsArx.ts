/**
 * THE SIGNATURE LAW — the ARX wave.
 *
 * Eleven bespoke set-pieces for the caster roster. Arx here is not
 * decoration on a hit: each element is a WORLD given one sentence to
 * speak — the sky falls, the sea drowns a circle, dawn is delivered
 * early. Every signature layers a primary read (the impact), a
 * secondary read (its aftermath), and a lingering read (what the
 * world remembers), all in the grammar's three strata.
 *
 * Same binding laws as the founding wave: hard edges only, save/
 * restore discipline, squash on ground y-radii, srand-deterministic
 * geometry with frameDt-gated emission as the only per-frame chance,
 * ≤ ~60 path ops per hook per frame. 120fps is a law. No signature
 * shares a centerpiece with any other, in this file or the founding
 * one.
 */

import { shade } from './rig.js';
import { boltPath, srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { storm, fire, frost, dust, smoke, water, radiance, asMatter } from './matter/index.js';

// ----------------------------------------------------------- arc_bolt

/**
 * ARC_BOLT — "the sewn seam."
 * Each hop leaves its path stitched into the air: cross-ticks sew
 * shut along the stroke in flight order while twig filaments fork
 * off its midpoints, and the struck body sheds a splash of static.
 * A chain of hops reads as one long seam being sewn foe to foe.
 */
const arc_bolt: AbilitySig = {
  spawn(c: SigCtx) {
    // The receiving end takes the charge: static leaps off the body.
    const m = asMatter(c);
    // The needle lands: the library's full discharge crackle at the
    // far end, a fainter echo where the seam's middle stitched.
    storm.deployments.impact!(m, c.wx2, c.wy2, { scale: 1 });
    storm.deployments.impact!(m, (c.wx + c.wx2) / 2, (c.wy + c.wy2) / 2, { scale: 0.4 });
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc } = c;
    const rand = srand(c.seed ^ 0x52);
    const lift = sc * 0.4;
    const x1 = c.px, y1 = c.py - lift;
    const x2 = c.px2, y2 = c.py2 - lift;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const fade = 1 - t;
    ctx.save();
    // The seam: cross-ticks sew shut along the stroke, in flight order.
    const n = Math.max(4, Math.min(8, Math.round(len / (sc * 0.55))));
    const sewn = Math.min(1, t / 0.4);
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.03);
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n;
      const wob = (rand() - 0.5) * sc * 0.08;
      const g = sc * (0.07 + rand() * 0.05);
      if (f > sewn) continue;
      const mx = x1 + dx * f + nx * wob;
      const my = y1 + dy * f + ny * wob;
      ctx.globalAlpha = 0.85 * fade;
      ctx.beginPath();
      ctx.moveTo(mx - nx * g, my - ny * g);
      ctx.lineTo(mx + nx * g, my + ny * g);
      ctx.stroke();
    }
    // Twig filaments fork off the seam's midpoints, re-kinking on the
    // clock while the charge is young.
    if (t < 0.55) {
      const ft = 1 - t / 0.55;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.025);
      ctx.globalAlpha = 0.8 * ft;
      for (let k = 0; k < 2; k++) {
        const f = 0.3 + k * 0.35 + rand() * 0.1;
        const side = rand() < 0.5 ? 1 : -1;
        const reach = sc * (0.3 + rand() * 0.3) * ft;
        const bx = x1 + dx * f, by = y1 + dy * f;
        ctx.beginPath();
        boltPath(
          ctx, bx, by,
          bx + nx * side * reach + (dx / len) * reach * 0.4,
          by + ny * side * reach + (dy / len) * reach * 0.4,
          c.seed ^ (k * 37) ^ Math.floor(c.now / 50), sc * 0.06,
        );
        ctx.stroke();
      }
    }
    ctx.restore();
    c.glow((c.wx + c.wx2) / 2, (c.wy + c.wy2) / 2, 1.2, 0.3 * fade);
  },
};

// -------------------------------------------------------------- blink

/**
 * BLINK — "the paired doorways."
 * Two lancet doors stand for a breath: the one you left through
 * collapses shut while the one you arrive through swings open, a
 * dotted path between them unzipping behind you — the step you
 * never took, erased as it's read.
 */
const blink: AbilitySig = {
  spawn(c: SigCtx) {
    // Departure inhales; arrival exhales.
    c.particles.burst(c.wx, c.wy - 0.45, 5, [c.st.mid, c.st.spark], {
      speed: 1.4, life: 0.4, size: 0.09, gravity: -0.5, drag: 2.2, shape: 'glint',
    });
    c.particles.burst(c.wx2, c.wy2 - 0.45, 6, [c.st.core, c.st.spark], {
      speed: 1.8, life: 0.5, size: 0.1, gravity: -0.8, drag: 1.6, shape: 'glint',
    });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash } = c;
    const fade = 1 - t;
    ctx.save();
    // The unzipping path: a dotted line eaten from the departure end.
    const f0 = Math.min(1, t * 1.15);
    if (f0 < 1) {
      ctx.globalAlpha = 0.5 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.setLineDash([sc * 0.08, sc * 0.13]);
      ctx.lineDashOffset = -c.now / 30;
      ctx.beginPath();
      ctx.moveTo(c.px + (c.px2 - c.px) * f0, c.py + (c.py2 - c.py) * f0);
      ctx.lineTo(c.px2, c.py2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // A rune ellipse under each door: departure's shrinks away,
    // arrival's blooms underfoot.
    const dr = sc * 0.4 * Math.max(0, 1 - t / 0.45);
    if (dr > 0) {
      ctx.globalAlpha = 0.6 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py, dr, dr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const ar = sc * 0.42 * Math.min(1, t / 0.3);
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.beginPath();
    ctx.ellipse(c.px2, c.py2, ar, ar * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc } = c;
    ctx.save();
    // One lancet door: a pointed slit showing the deep elsewhere.
    const door = (bx: number, by: number, w: number, alpha: number): void => {
      if (w <= 0 || alpha <= 0) return;
      const h = sc * 1.15;
      ctx.globalAlpha = alpha * 0.55;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.moveTo(bx - w, by);
      ctx.lineTo(bx - w, by - h * 0.6);
      ctx.lineTo(bx, by - h);
      ctx.lineTo(bx + w, by - h * 0.6);
      ctx.lineTo(bx + w, by);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.stroke();
      // The bright hinge-slit up the middle.
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1, sc * 0.025);
      ctx.beginPath();
      ctx.moveTo(bx, by - sc * 0.06);
      ctx.lineTo(bx, by - h * 0.94);
      ctx.stroke();
      // Rune squares climb the frame.
      ctx.fillStyle = st.spark;
      const g = sc * 0.05;
      for (let k = 0; k < 3; k++) {
        const a = c.now / 500 + (k / 3) * Math.PI * 2;
        ctx.fillRect(
          bx + Math.cos(a) * w * 1.5 - g / 2,
          by - h * 0.5 + Math.sin(a) * h * 0.28 - g / 2, g, g,
        );
      }
    };
    // Departure collapses first; arrival swings open behind it.
    door(c.px, c.py, sc * 0.34 * Math.max(0, 1 - t / 0.45), Math.max(0, 1 - t / 0.45));
    const openW = sc * 0.34 * Math.min(1, Math.max(0, (t - 0.08) / 0.3));
    door(c.px2, c.py2, openW, t < 0.65 ? 1 : (1 - t) / 0.35);
    ctx.restore();
    c.glow(c.wx2, c.wy2, 0.9, 0.35 * (1 - t));
  },
};

// ------------------------------------------------------- meteor_shard

/**
 * METEOR_SHARD — "the fallen star-stone."
 * The sky throws first: a steep lance streaks in from the upper air
 * and the stone it carried stays — an angled slab embedded in the
 * crater, molten along its buried edge, smoking as it cools, with
 * the ejecta thrown long down its line of travel.
 */
const meteor_shard: AbilitySig = {
  spawn(c: SigCtx) {
    // The incoming matter: comet slivers ride the lance line down.
    const rand = srand(c.seed ^ 0x61);
    // The last of the fall: burning pieces streak in on TRUE height —
    // spawned high on the incoming track, flying west and down, dying
    // where they meet the dirt. (The star-stone's own fire-trail.)
    for (let k = 0; k < 4; k++) {
      const f = 0.35 + rand() * 0.55;
      c.particles.burst(c.wx + 0.55 * f, c.wy, 1, [c.st.spark, c.st.core], {
        speed: 2.2, life: 0.6, size: 0.09, gravity: 0,
        dir: Math.PI, spread: 0.08, shape: 'streak',
        trail: 14, trailColor: c.st.deep,
        z: 2.6 * f, vz: -8, zg: 0, land: 'die', layer: 'world', shadow: 0,
      });
    }
    const m = asMatter(c);
    // The ground answers down-track: the library's gouge...
    dust.deployments.gouge!(m, c.wx, c.wy, { dir: Math.atan2(3.8, -2.0), scale: 1 });
    // ...and the stone smokes while it cools — one standing plume.
    smoke.deployments.plume!(m, c.wx + 0.15, c.wy, { dur: 1.6, scale: 0.45 });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x62);
    const fade = 1 - t;
    const track = Math.atan2(3.8, -2.0); // the lance's line, continued
    ctx.save();
    // Ejecta rays: scorch wedges thrown long down the line of travel,
    // short against it — a directional splash, not a polite circle.
    for (let k = 0; k < 6; k++) {
      const a = track + (rand() - 0.5) * 2.2;
      const along = Math.cos(a - track); // +1 down-track, -1 back
      const len = rPx * (0.55 + rand() * 0.4) * (0.75 + 0.45 * along);
      const w = sc * (0.05 + rand() * 0.04);
      ctx.globalAlpha = (0.5 - k * 0.04) * fade;
      ctx.fillStyle = k % 2 === 0 ? st.deep : '#4a3028';
      ctx.beginPath();
      ctx.moveTo(px - Math.sin(a) * w, py + Math.cos(a) * w * squash);
      ctx.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len * squash);
      ctx.lineTo(px + Math.sin(a) * w, py - Math.cos(a) * w * squash);
      ctx.closePath();
      ctx.fill();
    }
    // The crater rim, broken into three arc slabs.
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, sc * 0.06);
    ctx.globalAlpha = 0.6 * fade;
    for (let k = 0; k < 3; k++) {
      const a0 = (k / 3) * Math.PI * 2 + 0.25 + (c.seed % 7) * 0.2;
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.6, rPx * 0.6 * squash, 0, a0, a0 + 1.6);
      ctx.stroke();
    }
    // The molten pool at the stone's foot, cooling shut.
    const heat = Math.max(0, 1 - t / 0.6);
    if (heat > 0) {
      ctx.globalAlpha = heat * 0.8;
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      ctx.ellipse(px, py + sc * 0.06 * squash, rPx * 0.24 * heat, rPx * 0.24 * heat * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius, 0.5 * Math.max(heat, 0.2) * fade);
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0x63);
    ctx.save();
    // The lance: the streak that DELIVERED the stone, head-first.
    if (t < 0.16) {
      const f = t / 0.16;
      const sx = px + sc * 2.0, sy = py - sc * 3.8;
      const hx = sx + (px - sx) * f, hy = sy + (py - sy) * f;
      const tx = sx + (px - sx) * Math.max(0, f - 0.4);
      const ty = sy + (py - sy) * Math.max(0, f - 0.4);
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(3, sc * 0.11);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.045);
      ctx.beginPath();
      ctx.moveTo(tx + (hx - tx) * 0.3, ty + (hy - ty) * 0.3);
      ctx.lineTo(hx, hy);
      ctx.stroke();
    }
    // The star-stone itself: an angled slab standing out of the
    // crater, dark rock above, molten along the buried edge.
    if (t > 0.06) {
      const heat = Math.max(0, 1 - t / 0.75);
      const tilt = -0.55 - rand() * 0.3;
      const L = sc * 0.72, W = sc * 0.26;
      ctx.translate(px + sc * 0.1, py - sc * 0.08);
      ctx.rotate(tilt);
      ctx.globalAlpha = t < 0.75 ? 1 : (1 - t) / 0.25;
      ctx.fillStyle = shade(st.deep, -18);
      ctx.beginPath();
      ctx.moveTo(-L * 0.15, W * 0.5);
      ctx.lineTo(-L * 0.05, -W * 0.5);
      ctx.lineTo(L * 0.55, -W * 0.42);
      ctx.lineTo(L * 0.8, 0);
      ctx.lineTo(L * 0.55, W * 0.45);
      ctx.closePath();
      ctx.fill();
      // A facet catches the last of its own light.
      ctx.strokeStyle = shade(st.deep, 22);
      ctx.lineWidth = Math.max(1, sc * 0.025);
      ctx.beginPath();
      ctx.moveTo(-L * 0.05, -W * 0.5);
      ctx.lineTo(L * 0.55, -W * 0.42);
      ctx.stroke();
      // The molten under-edge, strobing as it cools to rock.
      if (heat > 0) {
        const pulse = 0.6 + 0.4 * Math.sin(c.now / 140);
        ctx.globalAlpha = heat * pulse;
        ctx.strokeStyle = st.spark;
        ctx.lineWidth = Math.max(1.5, sc * 0.05 * heat);
        ctx.beginPath();
        ctx.moveTo(-L * 0.15, W * 0.5);
        ctx.lineTo(L * 0.55, W * 0.45);
        ctx.stroke();
      }
    }
    ctx.restore();
    // (The cooling smoke is the smoke.plume emitter from spawn.)
  },
};

// ---------------------------------------------------------- maelstrom

/**
 * MAELSTROM — "the swallowing eye."
 * The sea arrives where no sea is: three spiral arms wind the ground
 * down into a dark eye that breathes at the center, crest wedges
 * riding the arms and spray dragged INTO the drain — until the eye
 * gulps once and takes the whole circle with it.
 */
const maelstrom: AbilitySig = {
  spawn(c: SigCtx) {
    // The rim floods inward: foam banks pulled toward the drain.
    // The eye swallows: the library's undertow hauls foam and mist
    // out of the rim and INTO the heart for the spin's whole life.
    water.deployments.undertow!(asMatter(c), c.wx, c.wy, {
      radius: c.radius * 0.9, dur: 1.4, scale: 1.1,
    });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    const rot = c.now / 850;
    ctx.save();
    ctx.lineCap = 'butt';
    // Three spiral arms wind rim-to-eye, turning with the drain.
    for (let arm = 0; arm < 3; arm++) {
      const a0 = rot + (arm / 3) * Math.PI * 2;
      ctx.globalAlpha = 0.6 * fade;
      ctx.strokeStyle = arm === 1 ? st.core : st.mid;
      ctx.lineWidth = Math.max(2, sc * 0.055);
      ctx.beginPath();
      for (let i = 0; i <= 7; i++) {
        const f = i / 7;
        const rr = rPx * (0.95 - 0.82 * f);
        const a = a0 + f * 2.7;
        const x = px + Math.cos(a) * rr;
        const y = py + Math.sin(a) * rr * squash;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // Foam ticks ride the arm's outer reach.
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.7 * fade;
      for (let i = 1; i <= 2; i++) {
        const f = i * 0.28;
        const rr = rPx * (0.95 - 0.82 * f);
        const a = a0 + f * 2.7;
        const g = sc * 0.05;
        ctx.fillRect(px + Math.cos(a) * rr - g / 2, py + Math.sin(a) * rr * squash - g / 2, g, g);
      }
    }
    // The eye: dark water breathing at the drain's throat.
    const er = rPx * 0.2 * (1 + 0.12 * Math.sin(c.now / 280));
    ctx.globalAlpha = 0.85 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, er, er * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    ctx.beginPath();
    ctx.ellipse(px, py, er * 1.25, er * 1.25 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // The gulp: one last ring contracting into the throat.
    if (t > 0.75) {
      const g = (t - 0.75) / 0.25;
      ctx.globalAlpha = (1 - g) * 0.8;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * (1 - g) * 0.9, rPx * (1 - g) * 0.9 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.3 * fade);
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    const rot = c.now / 850;
    ctx.save();
    // Crest wedges break above the arms — the sea showing its teeth.
    ctx.fillStyle = st.core;
    for (let arm = 0; arm < 3; arm++) {
      const a = rot + (arm / 3) * Math.PI * 2 + 0.65;
      const rr = rPx * 0.62;
      const bx = px + Math.cos(a) * rr;
      const by = py + Math.sin(a) * rr * squash - sc * 0.16;
      const w = sc * 0.16, h = sc * (0.2 + 0.05 * Math.sin(c.now / 200 + arm * 2.1));
      ctx.globalAlpha = 0.8 * fade;
      ctx.beginPath();
      ctx.moveTo(bx - w * 0.6, by);
      ctx.lineTo(bx + w * 0.1, by - h);
      // The lip curls toward the drain.
      ctx.lineTo(bx - Math.cos(a) * w * 0.5 + w * 0.5, by - h * 0.55);
      ctx.lineTo(bx + w * 0.6, by);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // Spray rides the drain inward, dragged as the water takes it.
    // (The inhaled spray is the water.undertow emitter from spawn.)
  },
};

// -------------------------------------------------------- frost_lance

/**
 * FROST_LANCE — "the frozen rail."
 * The beam does not pass — it STAYS: one hard rail of ice hangs in
 * the air, growing icicle teeth along its underside while rime
 * chevrons run the corridor floor, until the whole rail shatters
 * into dashes and falls as glitter.
 */
const frost_lance: AbilitySig = {
  spawn(c: SigCtx) {
    // The corridor fogs the instant the cold crosses it.
    const m = asMatter(c);
    // The rail freezes: the library's lance rides the whole line —
    // shards, glints, and sinking cold from hilt to point...
    frost.deployments.lance!(m, c.wx, c.wy, {
      x2: c.wx2, y2: c.wy2, dur: 1.0, scale: 1,
    });
    // ...and the point itself shatters cold where it stops.
    frost.deployments.shatter!(m, c.wx2, c.wy2, { scale: 0.55 });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc } = c;
    const rand = srand(c.seed ^ 0x82);
    const fade = 1 - t;
    const dx = c.px2 - c.px, dy = c.py2 - c.py;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    ctx.save();
    // Rime chevrons RUN down the corridor floor — the freeze has a
    // direction, cast hand to horizon.
    const n = Math.max(4, Math.min(9, Math.round(len / (sc * 0.8))));
    const run = Math.min(1, t / 0.35);
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n;
      const side = k % 2 === 0 ? 1 : -1;
      const g = sc * (0.1 + rand() * 0.06);
      if (f > run) continue;
      const mx = c.px + dx * f + nx * side * sc * 0.18;
      const my = c.py + dy * f + ny * side * sc * 0.18;
      ctx.globalAlpha = 0.7 * fade;
      ctx.beginPath();
      ctx.moveTo(mx - (dx / len) * g, my - (dy / len) * g);
      ctx.lineTo(mx + nx * side * g, my + ny * side * g);
      ctx.lineTo(mx + (dx / len) * g, my + (dy / len) * g);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc } = c;
    const rand = srand(c.seed ^ 0x83);
    const lift = sc * 0.4;
    const x1 = c.px, y1 = c.py - lift;
    const x2 = c.px2, y2 = c.py2 - lift;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    ctx.save();
    ctx.lineCap = 'butt';
    // The rail: a mid casing around a white core — it HOLDS solid,
    // then breaks into falling dashes at the end of its life.
    const hold = t < 0.68;
    const alpha = hold ? 1 : (1 - t) / 0.32;
    if (!hold) {
      ctx.setLineDash([sc * 0.22, sc * 0.12]);
      ctx.lineDashOffset = (c.seed % 9) * 3;
    }
    ctx.globalAlpha = 0.85 * alpha;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(3, sc * 0.11);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.045);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    // Icicle teeth grow off the underside, station by station.
    ctx.fillStyle = st.core;
    for (let k = 0; k < 6; k++) {
      const f = 0.15 + (k / 6) * 0.75 + rand() * 0.04;
      const L = sc * (0.12 + rand() * 0.14);
      const grow = Math.min(1, Math.max(0, (t - 0.08 - f * 0.2) / 0.18));
      if (grow <= 0) continue;
      const bx = x1 + dx * f, by = y1 + dy * f;
      const w = sc * 0.035;
      ctx.globalAlpha = 0.9 * alpha;
      ctx.beginPath();
      ctx.moveTo(bx - w, by);
      ctx.lineTo(bx, by + L * grow);
      ctx.lineTo(bx + w, by);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // (The rail's glitter and sinking cold ride the frost.lance
    // emitter from spawn.)
    c.glow((c.wx + c.wx2) / 2, (c.wy + c.wy2) / 2, 1.4, 0.25 * (1 - t));
  },
};

// --------------------------------------------------------- ward_shell

/**
 * WARD_SHELL — "the faceted lantern-dome."
 * Quiet light builds a shelter pane by pane: six equator facets snap
 * in around the body in order, each raising an edge to the apex,
 * until the keystone glint seats at the crown and the finished dome
 * settles into a patient shimmer.
 */
const ward_shell: AbilitySig = {
  spawn(c: SigCtx) {
    c.particles.burst(c.wx, c.wy - 0.6, 6, [c.st.spark, c.st.core], {
      speed: 0.9, life: 0.7, size: 0.1, gravity: -0.5, drag: 2, shape: 'glint',
    });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const fade = 1 - t;
    ctx.save();
    // Anchor pips under each pane seam — the shell is FOUNDED.
    ctx.fillStyle = st.mid;
    const rr = sc * 0.62;
    const built = Math.min(6, Math.floor((t / 0.42) * 6) + 1);
    for (let k = 0; k < built; k++) {
      const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
      const g = sc * 0.05;
      ctx.globalAlpha = 0.6 * fade;
      ctx.fillRect(px + Math.cos(a) * rr - g / 2, py + Math.sin(a) * rr * squash - g / 2, g, g);
    }
    ctx.restore();
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const cy = py - sc * 0.5; // the dome's equator rides the chest
    const rx = sc * 0.62;
    const apexY = cy - sc * 0.62;
    ctx.save();
    // Panes snap in one at a time: an equator arc plus two rising
    // edges that meet at the apex — a faceted lantern, not a bubble.
    const reach = (t / 0.42) * 6;
    for (let k = 0; k < 6; k++) {
      const on = Math.min(1, Math.max(0, reach - k));
      if (on <= 0) continue;
      const a0 = (k / 6) * Math.PI * 2 - Math.PI / 2;
      const a1 = a0 + (Math.PI * 2) / 6;
      // Fresh panes land white, then settle to the ward's own light.
      ctx.globalAlpha = (0.4 + 0.5 * on) * fade;
      ctx.strokeStyle = on < 1 ? st.core : st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(px, cy, rx, rx * squash, 0, a0, a0 + ((Math.PI * 2) / 6) * on);
      ctx.stroke();
      // The pane's leading edge climbs to the apex.
      ctx.globalAlpha = 0.45 * on * fade;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a1) * rx, cy + Math.sin(a1) * rx * squash);
      ctx.lineTo(px, apexY);
      ctx.stroke();
    }
    // The keystone: a crossed glint seating at the crown once the
    // last pane lands, breathing on the shell's slow clock.
    if (reach >= 6) {
      const tw = 0.6 + 0.4 * Math.sin(c.now / 320);
      ctx.globalAlpha = tw * fade;
      ctx.fillStyle = '#ffffff';
      const g = sc * 0.05;
      ctx.fillRect(px - g / 2, apexY - g * 1.8, g, g * 3.6);
      ctx.fillRect(px - g * 1.8, apexY - g / 2, g * 3.6, g);
    }
    ctx.restore();
    // The settled shell keeps a patient shimmer at its joints.
    if (reach >= 6 && Math.random() < c.frameDt * 6 * fade) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + (Math.cos(a) * rx) / sc, c.wy - 0.5 + (Math.sin(a) * rx * squash) / sc, 1, [st.spark, st.core], {
        speed: 0.15, life: 0.5, size: 0.08, gravity: -0.3, shape: 'glint',
      });
    }
    c.glow(c.wx, c.wy, 0.9, 0.3 * fade);
  },
};

// ----------------------------------------------------------- ember_fan

/**
 * EMBER_FAN — "the handprint of coals."
 * Every finger burns, and every strike says so: the impact leaves a
 * splayed five-finger scorch print on the ground, a live coal
 * guttering at each fingertip on its own clock while thin smoke
 * curls off the print as it cools.
 */
const ember_fan: AbilitySig = {
  spawn(c: SigCtx) {
    // The hand opens: five tongues splay from the strike.
    const rand = srand(c.seed ^ 0x91);
    const base = rand() * Math.PI * 2;
    const m = asMatter(c);
    // The hand opens: the library's fan of tongues along the palm...
    fire.deployments.fan!(m, c.wx, c.wy, { dir: base, scale: 1 });
    // ...and true coals hop out and LIE burning where they land.
    fire.deployments.gobbets!(m, c.wx, c.wy, { dir: base, scale: 0.7 });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0x92);
    const fade = 1 - t;
    const base = rand() * Math.PI * 2;
    const R = Math.max(c.rPx, sc * 0.85);
    ctx.save();
    // The palm the fingers grow from.
    ctx.globalAlpha = 0.5 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, R * 0.2, R * 0.2 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // Five finger-scorches splay from the palm, each tipped with a
    // live coal dying on its own clock.
    for (let k = 0; k < 5; k++) {
      const a = base - 0.55 + k * 0.275;
      const len = R * (0.55 + rand() * 0.3) * (k === 2 ? 1.15 : 1); // the long finger
      const w = sc * 0.05;
      const coalLife = 0.45 + rand() * 0.4;
      const tipX = px + Math.cos(a) * len;
      const tipY = py + Math.sin(a) * len * squash;
      ctx.globalAlpha = 0.55 * fade;
      ctx.fillStyle = k % 2 === 0 ? st.deep : '#5a2418';
      ctx.beginPath();
      ctx.moveTo(px - Math.sin(a) * w, py + Math.cos(a) * w * squash);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(px + Math.sin(a) * w, py - Math.cos(a) * w * squash);
      ctx.closePath();
      ctx.fill();
      const heat = Math.max(0, 1 - t / coalLife);
      if (heat > 0) {
        const pulse = 0.55 + 0.45 * Math.sin(c.now / 110 + k * 2.4);
        ctx.globalAlpha = heat * pulse;
        ctx.fillStyle = k % 2 === 0 ? st.spark : st.core;
        const g = sc * 0.055 * (0.6 + 0.4 * heat);
        ctx.fillRect(tipX - g / 2, tipY - g / 2, g, g);
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, 0.8, 0.35 * fade);
  },
  air(c: SigCtx) {
    // The print cools: thin smoke curls off a random fingertip.
    if (c.t > 0.2 && Math.random() < c.frameDt * 8 * (1 - c.t)) {
      const rand = srand(c.seed ^ 0x92);
      const base = rand() * Math.PI * 2;
      // (The fingertips' soot is the fire.fan exhale from spawn.)
    }
  },
};

// ----------------------------------------------------------- stormcall

/**
 * STORMCALL — "the anvil overhead."
 * The asked-for sky ARRIVES: a stacked slab thunderhead hangs over
 * the circle for the field's whole life, its belly flashing as it
 * winds up, then striking on its own clock — each bolt writhing down
 * to a fresh scorch scar the ground keeps between strikes.
 */
const stormcall: AbilitySig = {
  spawn(c: SigCtx) {
    // The charge climbs to meet the cloud.
    c.particles.burst(c.wx, c.wy - 0.4, 6, [c.st.spark, c.st.core], {
      speed: 1.1, life: 0.8, size: 0.09, gravity: -2.2, up: true,
      drag: 0.8, shape: 'glint',
    });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const amb = Math.min(1, (1 - t) / 0.15);
    const W = 620; // the strike clock, ms
    ctx.save();
    // Scorch scars: the last few strikes stay written on the turf.
    const sIdx = Math.floor(c.age / W);
    for (let j = Math.max(0, sIdx - 2); j <= sIdx; j++) {
      const rand = srand(c.seed ^ (j * 197 + 11));
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * rPx * 0.75;
      const since = c.age - (j * W + W * 0.42);
      if (since < 0 || since > 1500) continue;
      const k = 1 - since / 1500;
      const sx = px + Math.cos(a) * rr;
      const sy = py + Math.sin(a) * rr * squash;
      ctx.globalAlpha = 0.55 * k * amb;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      const g = sc * 0.14 * (0.6 + 0.4 * k);
      ctx.beginPath();
      ctx.moveTo(sx - g, sy - g * squash);
      ctx.lineTo(sx + g, sy + g * squash);
      ctx.moveTo(sx + g, sy - g * squash);
      ctx.lineTo(sx - g, sy + g * squash);
      ctx.stroke();
    }
    // Charge ticks patrol the field's rim while the sky decides.
    ctx.fillStyle = st.mid;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + c.now / 1400;
      const g = sc * 0.045;
      ctx.globalAlpha = (0.25 + 0.15 * Math.sin(c.now / 220 + k * 2.6)) * amb;
      ctx.fillRect(px + Math.cos(a) * rPx - g / 2, py + Math.sin(a) * rPx * squash - g / 2, g, g);
    }
    ctx.restore();
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const amb = Math.min(1, (1 - t) / 0.15, c.age / 250);
    const W = 620;
    const sIdx = Math.floor(c.age / W);
    const phase = (c.age % W) / W;
    const rand = srand(c.seed ^ (sIdx * 197 + 11));
    const sa = rand() * Math.PI * 2;
    const sr = Math.sqrt(rand()) * rPx * 0.75;
    const sx = px + Math.cos(sa) * sr;
    const sy = py + Math.sin(sa) * sr * squash;
    const cloudY = py - sc * 2.7;
    const striking = phase > 0.28 && phase < 0.52 && t < 0.88;
    ctx.save();
    // The anvil: three flat slabs stacked over the circle, riding a
    // slow drift so the mass feels HELD, not painted.
    const drift = Math.sin(c.now / 1100) * sc * 0.06;
    for (let k = 0; k < 3; k++) {
      const w = rPx * (1.5 - k * 0.3);
      const h = sc * 0.2;
      ctx.globalAlpha = (0.6 - k * 0.1) * amb;
      ctx.fillStyle = k === 0 ? st.deep : shade(st.deep, k * 12);
      ctx.fillRect(px - w / 2 + drift * (k + 1), cloudY - k * h * 1.15 - h, w, h);
    }
    // The belly flashes as the wind-up builds, whites out on strike.
    if (phase > 0.1 && t < 0.88) {
      const charge = striking ? 1 : Math.min(1, (phase - 0.1) / 0.18) * 0.4;
      ctx.globalAlpha = charge * amb;
      ctx.fillStyle = striking ? st.core : st.spark;
      ctx.fillRect(px - rPx * 0.5 + drift, cloudY - sc * 0.06, rPx, sc * 0.09);
    }
    // The strike: a writhing stroke from belly to scar point.
    if (striking) {
      const k = 1 - (phase - 0.28) / 0.24;
      ctx.globalAlpha = Math.min(1, k * 1.6) * amb;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(3, sc * 0.1);
      ctx.beginPath();
      boltPath(ctx, sx * 0.3 + (px + drift) * 0.7, cloudY, sx, sy, c.seed ^ sIdx ^ Math.floor(c.now / 45), sc * 0.3);
      ctx.stroke();
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      boltPath(ctx, sx * 0.3 + (px + drift) * 0.7, cloudY, sx, sy, c.seed ^ sIdx ^ Math.floor(c.now / 45), sc * 0.3);
      ctx.stroke();
      // The ground answers with a hot ring where the bolt seats.
      ctx.globalAlpha = k * 0.8 * amb;
      ctx.beginPath();
      ctx.ellipse(sx, sy, sc * 0.28 * (1 - k * 0.5), sc * 0.28 * (1 - k * 0.5) * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (Math.random() < c.frameDt * 10) {
        // Each strike's arrival is the library's discharge crackle.
        storm.deployments.impact!(asMatter(c),
          c.wx + (Math.cos(sa) * sr) / sc, c.wy + (Math.sin(sa) * sr * squash) / sc, { scale: 0.7 });
      }
      c.glow(c.wx + (Math.cos(sa) * sr) / sc, c.wy + (Math.sin(sa) * sr * squash) / sc, 1.2, 0.5 * k);
    }
    ctx.restore();
  },
};

// -------------------------------------------------------- mirror_image

/**
 * MIRROR_IMAGE — "the pane that stays."
 * Two glass silhouettes part from one another: yours slides aside
 * and thins to nothing while the copy's pane firms up where it
 * stands, glass slivers raining off the split — the lie solidifies
 * exactly as the truth leaves.
 */
const mirror_image: AbilitySig = {
  spawn(c: SigCtx) {
    // The split throws glass: slivers tumble off the parting line.
    c.particles.burst(c.wx, c.wy - 0.55, 8, ['#ffffff', c.st.mid, c.st.spark], {
      speed: 1.6, life: 0.55, size: 0.08, gravity: 5, shape: 'shard', spin: 11,
    });
    c.particles.burst(c.wx, c.wy - 0.6, 4, [c.st.core, c.st.spark], {
      speed: 0.6, life: 0.7, size: 0.1, gravity: -0.4, drag: 1.8, shape: 'glint',
    });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0xa1);
    const side = rand() < 0.5 ? -1 : 1;
    const off = sc * 0.6 * Math.min(1, t / 0.6) * side;
    const fade = 1 - t;
    ctx.save();
    // The staying pane's footing brightens as the copy takes root...
    ctx.globalAlpha = 0.4 + 0.5 * Math.min(1, t / 0.5);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.4, sc * 0.4 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // ...while the leaver's footing dashes away and dissolves.
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = st.deep;
    ctx.setLineDash([sc * 0.07, sc * 0.1]);
    ctx.beginPath();
    ctx.ellipse(px + off, py, sc * 0.34, sc * 0.34 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0xa1);
    const side = rand() < 0.5 ? -1 : 1;
    const off = sc * 0.6 * Math.min(1, t / 0.6) * side;
    ctx.save();
    // One body-pane: a tall skewed slab with a facet slash.
    const pane = (bx: number, alpha: number, color: string, dashed: boolean): void => {
      if (alpha <= 0) return;
      const h = sc * 1.05, w = sc * 0.21, skew = sc * 0.1;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      if (dashed) ctx.setLineDash([sc * 0.09, sc * 0.07]);
      ctx.beginPath();
      ctx.moveTo(bx - w, py);
      ctx.lineTo(bx - w + skew, py - h);
      ctx.lineTo(bx + w + skew, py - h);
      ctx.lineTo(bx + w, py);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      // The facet slash — glass owning its one hard highlight.
      ctx.globalAlpha = alpha * 0.8;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, sc * 0.025);
      ctx.beginPath();
      ctx.moveTo(bx - w * 0.4, py - h * 0.25);
      ctx.lineTo(bx + w * 0.35 + skew * 0.6, py - h * 0.7);
      ctx.stroke();
    };
    // The copy firms where it stands; you thin away to the side.
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    pane(px, (0.35 + 0.55 * Math.min(1, t / 0.5)) * fade, st.mid, false);
    pane(px + off, Math.max(0, 1 - t / 0.65) * 0.8, st.spark, true);
    ctx.restore();
    c.glow(c.wx, c.wy, 0.8, 0.3 * (1 - t));
  },
};

// ------------------------------------------------------------ daybreak

/**
 * DAYBREAK — "the risen disc."
 * Dawn is delivered to the address: a hard horizon bar snaps across
 * the circle and a sun disc climbs over it, short rays fanning off
 * its crown while light-lanes stripe the ground below — then the
 * early morning burns off into drifting gold dust.
 */
const daybreak: AbilitySig = {
  spawn(c: SigCtx) {
    const m = asMatter(c);
    // First light: the library's congregation rises off the horizon
    // line, and gold falls gently over the risen disc's ground.
    radiance.deployments.bloom!(m, c.wx, c.wy, { scale: 1.1 });
    radiance.deployments.rain!(m, c.wx, c.wy, { radius: c.radius * 0.6, dur: 1.2, scale: 0.8 });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = 1 - t;
    ctx.save();
    // Light-lanes: the new sun stripes the ground away from itself —
    // hard pale quads fanning south out of the horizon line.
    ctx.fillStyle = st.core;
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 2 - 0.54 + k * 0.36; // fanned southward
      const len = rPx * (0.95 - Math.abs(k - 1.5) * 0.12);
      const w0 = sc * 0.05, w1 = sc * 0.16;
      ctx.globalAlpha = 0.22 * fade;
      ctx.beginPath();
      ctx.moveTo(px - w0, py);
      ctx.lineTo(px + Math.cos(a) * len - w1, py + Math.sin(a) * len * squash);
      ctx.lineTo(px + Math.cos(a) * len + w1, py + Math.sin(a) * len * squash);
      ctx.lineTo(px + w0, py);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 1.1, 0.55 * fade);
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, px, py, rPx } = c;
    const fade = t < 0.65 ? 1 : (1 - t) / 0.35;
    const hw = rPx * 0.8; // the horizon's half-width
    ctx.save();
    // The horizon bar: a hard line for the sun to have something to
    // rise OVER — dawn needs an edge.
    ctx.globalAlpha = 0.85 * fade;
    ctx.fillStyle = st.deep;
    ctx.fillRect(px - hw, py - Math.max(1.5, sc * 0.045), hw * 2, Math.max(3, sc * 0.09));
    // The disc climbs: everything below the bar belongs to yesterday.
    const rise = Math.min(1, t / 0.45);
    const dr = rPx * 0.42;
    const dy = py + dr * 0.75 - (dr * 0.75 + dr * 0.55) * rise;
    ctx.beginPath();
    ctx.rect(px - hw, py - sc * 4, hw * 2, sc * 4 - sc * 0.02);
    ctx.clip();
    ctx.globalAlpha = fade;
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.ellipse(px, dy, dr, dr, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.055);
    ctx.beginPath();
    ctx.ellipse(px, dy, dr, dr, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Short rays fan off the risen crown, alternating long and short.
    if (rise >= 1) {
      ctx.fillStyle = st.spark;
      for (let k = 0; k < 7; k++) {
        const a = -Math.PI + (k / 6) * Math.PI + Math.sin(c.now / 1600) * 0.06;
        const L = dr * (k % 2 === 0 ? 0.55 : 0.32);
        const bx = px + Math.cos(a) * dr * 1.12;
        const by = dy + Math.sin(a) * dr * 1.12;
        const w = sc * 0.035;
        ctx.globalAlpha = 0.85 * fade;
        ctx.beginPath();
        ctx.moveTo(bx - Math.sin(a) * w, by + Math.cos(a) * w);
        ctx.lineTo(bx + Math.cos(a) * L, by + Math.sin(a) * L);
        ctx.lineTo(bx + Math.sin(a) * w, by - Math.cos(a) * w);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
    // Morning burns off: gold dust drifts up through the young light.
    // (The lingering gold is the radiance.rain emitter from spawn.)
  },
};

// ----------------------------------------------------- riftwalker_step

/**
 * RIFTWALKER_STEP — "the unstitched corridor."
 * The step leaves its route showing: a segmented corridor of void
 * slabs flanks the travel line, zipping shut from the departure end
 * while starlight leaks from the segments still open, and the exit
 * crackles with the shock you dragged through with you.
 */
const riftwalker_step: AbilitySig = {
  spawn(c: SigCtx) {
    // Starlight leaks the moment the corridor opens.
    const rand = srand(c.seed ^ 0xb1);
    for (let k = 0; k < 5; k++) {
      const f = 0.15 + rand() * 0.7;
      c.particles.burst(c.wx + (c.wx2 - c.wx) * f, c.wy + (c.wy2 - c.wy) * f - 0.45, 1, ['#ffffff', c.st.spark], {
        speed: 0.5, life: 0.5, size: 0.09, gravity: -0.4, drag: 1.6, shape: 'glint',
      });
    }
    // The exit spits the charge you carried through — the library's
    // discharge crackle at the corridor's far mouth.
    storm.deployments.impact!(asMatter(c), c.wx2, c.wy2, { scale: 0.85 });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc } = c;
    const fade = 1 - t;
    const zip = t * 1.25;
    ctx.save();
    // The corridor's shadow: dark under the stretch still open.
    const f0 = Math.min(1, zip);
    if (f0 < 1) {
      ctx.globalAlpha = 0.35 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(3, sc * 0.16);
      ctx.beginPath();
      ctx.moveTo(c.px + (c.px2 - c.px) * f0, c.py + (c.py2 - c.py) * f0);
      ctx.lineTo(c.px2, c.py2);
      ctx.stroke();
    }
    // Scuff dashes where you left and where you landed.
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    ctx.setLineDash([sc * 0.06, sc * 0.08]);
    for (const [ex, ey] of [[c.px, c.py], [c.px2, c.py2]] as const) {
      ctx.beginPath();
      ctx.ellipse(ex, ey, sc * 0.3, sc * 0.3 * c.squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc } = c;
    const rand = srand(c.seed ^ 0xb2);
    const lift = sc * 0.4;
    const x1 = c.px, y1 = c.py - lift;
    const x2 = c.px2, y2 = c.py2 - lift;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const zip = t * 1.25;
    ctx.save();
    ctx.lineCap = 'butt';
    // The corridor: paired void slabs flank the line, each segment
    // gone the moment the zipper passes it — elsewhere sealing shut.
    const n = Math.max(5, Math.min(9, Math.round(len / (sc * 0.5))));
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n;
      const jit = (rand() - 0.5) * sc * 0.05;
      if (f < zip) continue;
      const bx = x1 + dx * f, by = y1 + dy * f + jit;
      const half = (len / n) * 0.36;
      const w = sc * 0.17;
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(2.5, sc * 0.07);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(bx - (dx / len) * half + nx * side * w, by - (dy / len) * half + ny * side * w);
        ctx.lineTo(bx + (dx / len) * half + nx * side * w, by + (dy / len) * half + ny * side * w);
        ctx.stroke();
      }
      // The seam glows white down the corridor's throat.
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = k % 2 === 0 ? st.core : st.spark;
      ctx.lineWidth = Math.max(1, sc * 0.03);
      ctx.beginPath();
      ctx.moveTo(bx - (dx / len) * half * 0.7, by - (dy / len) * half * 0.7);
      ctx.lineTo(bx + (dx / len) * half * 0.7, by + (dy / len) * half * 0.7);
      ctx.stroke();
    }
    // The exit crackle: shock dragged through, biting at the arrival.
    if (t < 0.45) {
      const k = 1 - t / 0.45;
      ctx.globalAlpha = k;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1, sc * 0.03);
      for (let j = 0; j < 3; j++) {
        const a = (j / 3) * Math.PI * 2 + (c.seed % 5);
        ctx.beginPath();
        boltPath(
          ctx, x2, y2,
          x2 + Math.cos(a) * sc * 0.4 * k, y2 + Math.sin(a) * sc * 0.34 * k,
          c.seed ^ (j * 53) ^ Math.floor(c.now / 50), sc * 0.06,
        );
        ctx.stroke();
      }
    }
    ctx.restore();
    // Starlight keeps leaking from whatever's still open.
    if (zip < 1 && Math.random() < c.frameDt * 12) {
      const f = zip + Math.random() * (1 - zip);
      c.particles.burst(c.wx + (c.wx2 - c.wx) * f, c.wy + (c.wy2 - c.wy) * f - 0.45, 1, ['#ffffff', st.spark], {
        speed: 0.4, life: 0.4, size: 0.08, gravity: -0.3, shape: 'glint',
      });
    }
    c.glow(c.wx2, c.wy2, 0.9, 0.35 * (1 - t));
  },
};

// -------------------------------------------------------- the registry

/**
 * The ARX roster's bespoke crowns. The lead wires this table into
 * the master SIGNATURES registry — keys must match ability ids and
 * FX_STYLES faces exactly.
 */
export const ARX_SIGS: Record<string, AbilitySig> = {
  arc_bolt,
  blink,
  meteor_shard,
  maelstrom,
  frost_lance,
  ward_shell,
  ember_fan,
  stormcall,
  mirror_image,
  daybreak,
  riftwalker_step,
};
