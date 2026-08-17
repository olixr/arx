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
import { boltPath, burstStarPath, srand } from './abilityFx.js';
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
  ground(c: SigCtx) {
    const { ctx, st, t, sc } = c;
    const rand = srand(c.seed ^ 0x54);
    const fade = 1 - t;
    const dx = c.px2 - c.px, dy = c.py2 - c.py;
    ctx.save();
    // Stitch scorches: the seam's needle-marks printed on the turf
    // below it — small char crosses where each stitch bit through.
    ctx.lineCap = 'butt';
    for (let k = 0; k < 4; k++) {
      const f = 0.2 + (k / 4) * 0.7 + rand() * 0.06;
      const sx = c.px + dx * f;
      const sy = c.py + dy * f;
      const g = sc * (0.06 + rand() * 0.03);
      ctx.globalAlpha = 0.7 * fade;
      ctx.strokeStyle = shade(st.deep, -10);
      ctx.lineWidth = Math.max(2, sc * 0.045);
      ctx.beginPath();
      ctx.moveTo(sx - g, sy - g * c.squash);
      ctx.lineTo(sx + g, sy + g * c.squash);
      ctx.moveTo(sx + g, sy - g * c.squash);
      ctx.lineTo(sx - g, sy + g * c.squash);
      ctx.stroke();
    }
    ctx.restore();
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
    ctx.lineCap = 'butt';
    // The thread itself: the charged line the stitches sew shut — a
    // deep under-stroke carrying a lit body, re-kinked on the clock
    // so the charge never sits still.
    const flick = Math.floor(c.now / 55);
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = shade(st.deep, -4);
    ctx.lineWidth = Math.max(3.5, sc * 0.1);
    ctx.beginPath();
    boltPath(ctx, x1, y1, x2, y2, c.seed ^ flick, sc * 0.07);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    boltPath(ctx, x1, y1, x2, y2, c.seed ^ flick, sc * 0.07);
    ctx.stroke();
    // The seam: cross-ticks sew shut along the stroke, in flight
    // order — each a white stitch with a bright head bead.
    const n = Math.max(4, Math.min(8, Math.round(len / (sc * 0.55))));
    const sewn = Math.min(1, t / 0.4);
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n;
      const wob = (rand() - 0.5) * sc * 0.08;
      const g = sc * (0.09 + rand() * 0.05);
      if (f > sewn) continue;
      const mx = x1 + dx * f + nx * wob;
      const my = y1 + dy * f + ny * wob;
      ctx.globalAlpha = 0.6 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(3, sc * 0.075);
      ctx.beginPath();
      ctx.moveTo(mx - nx * g, my - ny * g);
      ctx.lineTo(mx + nx * g, my + ny * g);
      ctx.stroke();
      ctx.globalAlpha = 0.95 * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.8, sc * 0.04);
      ctx.beginPath();
      ctx.moveTo(mx - nx * g, my - ny * g);
      ctx.lineTo(mx + nx * g, my + ny * g);
      ctx.stroke();
      ctx.fillStyle = st.core;
      const bead = Math.max(2, sc * 0.05);
      ctx.fillRect(mx + nx * g - bead / 2, my + ny * g - bead / 2, bead, bead);
    }
    // The re-flash: one bright pulse travels the sewn seam and dies
    // at the far wound — the charge collected, delivered again.
    if (t > 0.35) {
      const pk = Math.min(1, (t - 0.35) / 0.4);
      const bx = x1 + dx * pk;
      const by = y1 + dy * pk;
      ctx.globalAlpha = (1 - pk * 0.5) * fade;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, bx, by, sc * 0.14, sc * 0.05, 4, c.now / 120, 1);
      ctx.fill();
    }
    // Twig filaments fork off the seam's midpoints, re-kinking on the
    // clock while the charge is young.
    if (t < 0.55) {
      const ft = 1 - t / 0.55;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.globalAlpha = 0.85 * ft;
      for (let k = 0; k < 2; k++) {
        const f = 0.3 + k * 0.35 + rand() * 0.1;
        const side = rand() < 0.5 ? 1 : -1;
        const reach = sc * (0.35 + rand() * 0.3) * ft;
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
    c.glow((c.wx + c.wx2) / 2, (c.wy + c.wy2) / 2, 1.2, 0.35 * fade);
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
    // THE TORN VEIL: no path between the doors — nothing crossed the
    // ground, and drawing a lane would lie about the leaving.
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
    // One lancet door: a pointed slit that genuinely SHOWS the deep
    // elsewhere — a near-black interior with its own slow starfield,
    // held in a lit arcane frame. Depth behind the world's skin.
    const door = (bx: number, by: number, w: number, alpha: number, doorSeed: number): void => {
      if (w <= 0 || alpha <= 0) return;
      const h = sc * 1.2;
      const arch = (m: number): void => {
        ctx.beginPath();
        ctx.moveTo(bx - w * m, by);
        ctx.lineTo(bx - w * m, by - h * 0.6);
        ctx.lineTo(bx, by - h * (0.6 + 0.4 * m));
        ctx.lineTo(bx + w * m, by - h * 0.6);
        ctx.lineTo(bx + w * m, by);
        ctx.closePath();
      };
      // The elsewhere: true dark, deeper than any shadow here.
      ctx.globalAlpha = alpha * 0.95;
      ctx.fillStyle = '#0e0a1c';
      arch(1);
      ctx.fill();
      // Its stars: seeded flecks drifting slowly UP inside the door,
      // wrapping as they leave the arch — another sky in there.
      const drand = srand(doorSeed);
      ctx.fillStyle = st.spark;
      for (let k = 0; k < 5; k++) {
        const fx = (drand() - 0.5) * 1.5;
        const fy = (drand() + c.now / (2600 + k * 500)) % 1;
        const g = sc * (0.025 + drand() * 0.02);
        ctx.globalAlpha = alpha * (0.5 + 0.5 * Math.sin(c.now / 300 + k * 2.1));
        ctx.fillRect(bx + fx * w * 0.55 - g / 2, by - fy * h * 0.85 - g / 2, g, g);
      }
      // One far star, brighter: the point you are stepping toward.
      ctx.globalAlpha = alpha * 0.95;
      ctx.fillStyle = '#ffffff';
      const fg = sc * 0.04;
      ctx.fillRect(bx - fg / 2, by - h * 0.55 - fg / 2, fg, fg);
      // The frame: deep casing then lit arcane trim.
      ctx.globalAlpha = alpha * 0.7;
      ctx.strokeStyle = shade(st.deep, -6);
      ctx.lineWidth = Math.max(3.5, sc * 0.09);
      arch(1.06);
      ctx.stroke();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      arch(1);
      ctx.stroke();
      // The threshold glow: a white sill where here meets there.
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2, sc * 0.045);
      ctx.beginPath();
      ctx.moveTo(bx - w * 0.9, by);
      ctx.lineTo(bx + w * 0.9, by);
      ctx.stroke();
      // Rune squares climb the frame.
      ctx.fillStyle = st.spark;
      const g = sc * 0.055;
      for (let k = 0; k < 3; k++) {
        const a = c.now / 500 + (k / 3) * Math.PI * 2;
        ctx.fillRect(
          bx + Math.cos(a) * w * 1.5 - g / 2,
          by - h * 0.5 + Math.sin(a) * h * 0.28 - g / 2, g, g,
        );
      }
    };
    // Departure collapses first; arrival swings open behind it.
    door(c.px, c.py, sc * 0.36 * Math.max(0, 1 - t / 0.45), Math.max(0, 1 - t / 0.45), c.seed ^ 0xd00);
    const openW = sc * 0.36 * Math.min(1, Math.max(0, (t - 0.08) / 0.3));
    door(c.px2, c.py2, openW, t < 0.65 ? 1 : (1 - t) / 0.35, c.seed ^ 0xd01);
    // The step's flash: the instant both doors stand, a white seam
    // links their crowns — the route, shown once, then denied.
    if (t > 0.12 && t < 0.3) {
      const k = 1 - (t - 0.12) / 0.18;
      ctx.globalAlpha = k * 0.8;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.setLineDash([sc * 0.06, sc * 0.1]);
      ctx.beginPath();
      ctx.moveTo(c.px, c.py - sc * 1.15);
      ctx.lineTo(c.px2, c.py2 - sc * 1.2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
    c.glow(c.wx2, c.wy2, 0.9, 0.4 * (1 - t));
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
    // Each ray's far tip carries a still-hot fleck cooling on its own.
    for (let k = 0; k < 6; k++) {
      const a = track + (rand() - 0.5) * 2.2;
      const along = Math.cos(a - track); // +1 down-track, -1 back
      const len = rPx * (0.55 + rand() * 0.4) * (0.75 + 0.45 * along);
      const w = sc * (0.06 + rand() * 0.045);
      const cool = 0.3 + rand() * 0.4;
      ctx.globalAlpha = (0.7 - k * 0.05) * fade;
      ctx.fillStyle = k % 2 === 0 ? st.deep : '#4a3028';
      ctx.beginPath();
      ctx.moveTo(px - Math.sin(a) * w, py + Math.cos(a) * w * squash);
      ctx.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len * squash);
      ctx.lineTo(px + Math.sin(a) * w, py - Math.cos(a) * w * squash);
      ctx.closePath();
      ctx.fill();
      const heat = Math.max(0, 1 - t / cool);
      if (heat > 0) {
        ctx.globalAlpha = heat * 0.95;
        ctx.fillStyle = k % 2 === 0 ? st.spark : st.core;
        const g = sc * 0.05 * (0.5 + heat * 0.5);
        ctx.fillRect(px + Math.cos(a) * len - g / 2, py + Math.sin(a) * len * squash - g / 2, g, g);
      }
    }
    // The crater rim: heaved arc slabs with real lips — dark seat
    // shadow under a raised, dust-lit crest.
    for (let k = 0; k < 3; k++) {
      const a0 = (k / 3) * Math.PI * 2 + 0.25 + (c.seed % 7) * 0.2;
      ctx.globalAlpha = 0.75 * fade;
      ctx.strokeStyle = shade(st.deep, -14);
      ctx.lineWidth = Math.max(3.5, sc * 0.11);
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.6, rPx * 0.6 * squash, 0, a0, a0 + 1.6);
      ctx.stroke();
      ctx.globalAlpha = 0.8 * fade;
      ctx.strokeStyle = shade(st.deep, 16);
      ctx.lineWidth = Math.max(1.8, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(px, py - sc * 0.04, rPx * 0.6, rPx * 0.6 * squash, 0, a0 + 0.1, a0 + 1.5);
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
    // The lance: the streak that DELIVERED the stone — a filled fire
    // taper with a white head, not a pen line, and a burst star the
    // instant it seats.
    if (t < 0.16) {
      const f = t / 0.16;
      const sx = px + sc * 2.0, sy = py - sc * 3.8;
      const hx = sx + (px - sx) * f, hy = sy + (py - sy) * f;
      const tx = sx + (px - sx) * Math.max(0, f - 0.45);
      const ty = sy + (py - sy) * Math.max(0, f - 0.45);
      const a = Math.atan2(hy - ty, hx - tx);
      const wT = sc * 0.16;
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.moveTo(hx + Math.cos(a + Math.PI / 2) * wT * 1.3, hy + Math.sin(a + Math.PI / 2) * wT * 1.3);
      ctx.lineTo(tx, ty);
      ctx.lineTo(hx + Math.cos(a - Math.PI / 2) * wT * 1.3, hy + Math.sin(a - Math.PI / 2) * wT * 1.3);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      ctx.moveTo(hx + Math.cos(a + Math.PI / 2) * wT, hy + Math.sin(a + Math.PI / 2) * wT);
      ctx.lineTo(tx + (hx - tx) * 0.15, ty + (hy - ty) * 0.15);
      ctx.lineTo(hx + Math.cos(a - Math.PI / 2) * wT, hy + Math.sin(a - Math.PI / 2) * wT);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.ellipse(hx, hy, sc * 0.13, sc * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      if (f > 0.85) {
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        burstStarPath(ctx, px, py, sc * 0.55, sc * 0.2, 5, c.now / 300, c.squash);
        ctx.fill();
        c.glow(c.wx, c.wy, 1.6, 0.85);
      }
    }
    // The star-stone itself: an angled slab standing out of the
    // crater — dark flank, a sunlit top facet, molten along the
    // buried edge, heat slivers climbing while it cools.
    if (t > 0.06) {
      const heat = Math.max(0, 1 - t / 0.75);
      const tilt = -0.55 - rand() * 0.3;
      const L = sc * 0.78, W = sc * 0.3;
      ctx.save();
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
      // The sunlit top facet: a real plane, not a hairline.
      ctx.fillStyle = shade(st.deep, 20);
      ctx.beginPath();
      ctx.moveTo(-L * 0.05, -W * 0.5);
      ctx.lineTo(L * 0.55, -W * 0.42);
      ctx.lineTo(L * 0.72, -W * 0.08);
      ctx.lineTo(L * 0.05, -W * 0.18);
      ctx.closePath();
      ctx.fill();
      // One star-glint on the facet — it fell from up there.
      ctx.fillStyle = '#ffffff';
      const gg = sc * 0.045;
      ctx.globalAlpha = (0.5 + 0.5 * Math.sin(c.now / 260)) * (t < 0.75 ? 1 : (1 - t) / 0.25);
      ctx.fillRect(L * 0.3 - gg / 2, -W * 0.3 - gg / 2, gg, gg);
      // The molten under-edge, strobing as it cools to rock.
      if (heat > 0) {
        const pulse = 0.6 + 0.4 * Math.sin(c.now / 140);
        ctx.globalAlpha = heat * pulse;
        ctx.strokeStyle = st.spark;
        ctx.lineWidth = Math.max(2.5, sc * 0.07 * heat);
        ctx.beginPath();
        ctx.moveTo(-L * 0.15, W * 0.5);
        ctx.lineTo(L * 0.55, W * 0.45);
        ctx.stroke();
      }
      ctx.restore();
      // Heat slivers climb off the cooling stone — gated, thin, true.
      if (heat > 0.15 && Math.random() < c.frameDt * 16 * heat) {
        c.particles.burst(c.wx + 0.12, c.wy - 0.1, 1, [st.spark, st.core], {
          speed: 0.7, life: 0.5, size: 0.07, gravity: -1.6, shape: 'streak',
        });
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
    // The flooded circle: a low water sheen under everything — the
    // sea has genuinely ARRIVED here, the arms carve through it.
    ctx.globalAlpha = 0.35 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.98, rPx * 0.98 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // Three spiral arms wind rim-to-eye, turning with the drain —
    // each a BAND of water: deep trough, lit body, foam crest edge.
    for (let arm = 0; arm < 3; arm++) {
      const a0 = rot + (arm / 3) * Math.PI * 2;
      const lane = (rMul: number, col: string, lw: number, al: number): void => {
        ctx.globalAlpha = al * fade;
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        for (let i = 0; i <= 7; i++) {
          const f = i / 7;
          const rr = rPx * (0.95 - 0.82 * f) * rMul;
          const a = a0 + f * 2.7;
          const x = px + Math.cos(a) * rr;
          const y = py + Math.sin(a) * rr * squash;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };
      lane(1.02, shade(st.deep, -10), Math.max(4.5, sc * 0.14), 0.6); // the trough
      lane(1.0, arm === 1 ? shade(st.mid, 8) : st.mid, Math.max(2.8, sc * 0.08), 0.9); // the body
      lane(0.97, st.core, Math.max(1.5, sc * 0.035), 0.85); // the crest line
      // Foam beads ride the arm's outer reach, sliding down-drain.
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 3; i++) {
        const f = ((i * 0.28 + c.now / 2400) % 0.85);
        const rr = rPx * (0.95 - 0.82 * f);
        const a = a0 + f * 2.7;
        const g = sc * (0.05 + (1 - f) * 0.025);
        ctx.globalAlpha = 0.9 * fade;
        ctx.fillRect(px + Math.cos(a) * rr - g / 2, py + Math.sin(a) * rr * squash - g / 2, g, g);
      }
    }
    // The eye: the drain's throat stepping DOWN into dark — three
    // concentric shelves, each deeper than the last, breathing.
    const er = rPx * 0.24 * (1 + 0.12 * Math.sin(c.now / 280));
    for (let ring = 0; ring < 3; ring++) {
      const rr = er * (1 - ring * 0.28);
      ctx.globalAlpha = (0.75 + ring * 0.1) * fade;
      ctx.fillStyle = ring === 2 ? '#0c1420' : shade(st.deep, -8 - ring * 10);
      ctx.beginPath();
      ctx.ellipse(px, py + sc * 0.012 * ring, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2, sc * 0.05);
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
    // direction, cast hand to horizon. Each chevron rides a deep
    // groove bed so the white reads on any ground.
    const n = Math.max(4, Math.min(9, Math.round(len / (sc * 0.8))));
    const run = Math.min(1, t / 0.35);
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n;
      const side = k % 2 === 0 ? 1 : -1;
      const g = sc * (0.12 + rand() * 0.07);
      if (f > run) continue;
      const mx = c.px + dx * f + nx * side * sc * 0.18;
      const my = c.py + dy * f + ny * side * sc * 0.18;
      const chevron = (col: string, lw: number, al: number): void => {
        ctx.globalAlpha = al * fade;
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(mx - (dx / len) * g, my - (dy / len) * g);
        ctx.lineTo(mx + nx * side * g, my + ny * side * g);
        ctx.lineTo(mx + (dx / len) * g, my + (dy / len) * g);
        ctx.stroke();
      };
      chevron(st.deep, Math.max(3, sc * 0.08), 0.6);
      chevron(st.core, Math.max(1.8, sc * 0.04), 0.9);
    }
    // The corridor floor keeps a pale frost sheen while the rail
    // stands over it — the cold pressing down.
    ctx.globalAlpha = 0.22 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(6, sc * 0.3);
    ctx.beginPath();
    ctx.moveTo(c.px, c.py);
    ctx.lineTo(c.px + dx * run, c.py + dy * run);
    ctx.stroke();
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
    // The rail: a true ice PRISM — shadowed underside, ice body,
    // white spine, and specular ticks skating its top edge. It HOLDS
    // solid, then breaks into falling dashes at the end of its life.
    const hold = t < 0.68;
    const alpha = hold ? 1 : (1 - t) / 0.32;
    if (!hold) {
      ctx.setLineDash([sc * 0.22, sc * 0.12]);
      ctx.lineDashOffset = (c.seed % 9) * 3;
    }
    ctx.globalAlpha = 0.6 * alpha;
    ctx.strokeStyle = shade(st.deep, -4);
    ctx.lineWidth = Math.max(5.5, sc * 0.19);
    ctx.beginPath();
    ctx.moveTo(x1, y1 + sc * 0.03);
    ctx.lineTo(x2, y2 + sc * 0.03);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * alpha;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(3.8, sc * 0.13);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2, sc * 0.055);
    ctx.beginPath();
    ctx.moveTo(x1, y1 - sc * 0.03);
    ctx.lineTo(x2, y2 - sc * 0.03);
    ctx.stroke();
    ctx.setLineDash([]);
    // Specular ticks: two glints skate the top edge while it holds —
    // ice is only ice when the light moves on it.
    if (hold) {
      ctx.fillStyle = '#ffffff';
      for (let g2 = 0; g2 < 2; g2++) {
        const f = ((c.now / (1400 + g2 * 500)) + g2 * 0.5) % 1;
        const gx = x1 + dx * f;
        const gy = y1 + dy * f - sc * 0.05;
        const g = sc * 0.06;
        ctx.globalAlpha = 0.95 * alpha;
        ctx.fillRect(gx - g / 2, gy - g / 2, g, g);
      }
    }
    // Icicle teeth grow off the underside, station by station — each
    // in a deep setting, with a white crown at its root.
    for (let k = 0; k < 6; k++) {
      const f = 0.15 + (k / 6) * 0.75 + rand() * 0.04;
      const L = sc * (0.16 + rand() * 0.16);
      const grow = Math.min(1, Math.max(0, (t - 0.08 - f * 0.2) / 0.18));
      if (grow <= 0) continue;
      const bx = x1 + dx * f, by = y1 + dy * f;
      const w = sc * 0.05;
      ctx.globalAlpha = 0.6 * alpha;
      ctx.fillStyle = shade(st.deep, -6);
      ctx.beginPath();
      ctx.moveTo(bx - w * 1.5, by);
      ctx.lineTo(bx, by + L * grow * 1.08);
      ctx.lineTo(bx + w * 1.5, by);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.95 * alpha;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.moveTo(bx - w, by);
      ctx.lineTo(bx, by + L * grow);
      ctx.lineTo(bx + w, by);
      ctx.closePath();
      ctx.fill();
    }
    // The break: as the rail lets go, its dashes shed true falling
    // glitter — the shatter you can hear.
    if (!hold && Math.random() < c.frameDt * 26) {
      const f = Math.random();
      c.particles.burst(c.wx + (c.wx2 - c.wx) * f, c.wy + (c.wy2 - c.wy) * f, 2, [st.core, st.spark], {
        speed: 0.5, life: 0.5, size: 0.07, gravity: 3.2, shape: 'glint',
      });
    }
    ctx.restore();
    // (The rail's glitter and sinking cold ride the frost.lance
    // emitter from spawn.)
    c.glow((c.wx + c.wx2) / 2, (c.wy + c.wy2) / 2, 1.4, 0.3 * (1 - t));
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
    // Panes snap in one at a time: each is a real GLASS facet — a
    // translucent fill spanning equator to apex — so the finished
    // shell reads as a lantern with volume, not a wire bubble.
    const reach = (t / 0.42) * 6;
    for (let k = 0; k < 6; k++) {
      const on = Math.min(1, Math.max(0, reach - k));
      if (on <= 0) continue;
      const a0 = (k / 6) * Math.PI * 2 - Math.PI / 2;
      const seg = (Math.PI * 2) / 6;
      const a1 = a0 + seg * on;
      // The pane's body: a translucent quad from equator arc to apex.
      // Back-half panes read dimmer — the dome has a far side.
      const facing = Math.sin(a0 + seg * 0.5) > 0 ? 1 : 0.55;
      ctx.globalAlpha = 0.16 * on * fade * facing;
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a0) * rx, cy + Math.sin(a0) * rx * squash);
      ctx.ellipse(px, cy, rx, rx * squash, 0, a0, a1);
      ctx.lineTo(px, apexY);
      ctx.closePath();
      ctx.fill();
      // Fresh panes land white, then settle to the ward's own light.
      ctx.globalAlpha = (0.45 + 0.5 * on) * fade * facing;
      ctx.strokeStyle = on < 1 ? st.core : st.mid;
      ctx.lineWidth = Math.max(2.2, sc * 0.06);
      ctx.beginPath();
      ctx.ellipse(px, cy, rx, rx * squash, 0, a0, a1);
      ctx.stroke();
      // The pane's leading edge climbs to the apex.
      ctx.globalAlpha = 0.55 * on * fade * facing;
      ctx.lineWidth = Math.max(1.8, sc * 0.045);
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a0 + seg) * rx, cy + Math.sin(a0 + seg) * rx * squash);
      ctx.lineTo(px, apexY);
      ctx.stroke();
      // The seat-click: a white spark the instant the pane lands.
      if (on > 0.7 && on < 1) {
        const sa = a0 + seg * 0.5;
        ctx.globalAlpha = fade;
        ctx.fillStyle = '#ffffff';
        const g = Math.max(2.5, sc * 0.06);
        ctx.fillRect(px + Math.cos(sa) * rx - g / 2, cy + Math.sin(sa) * rx * squash - g / 2, g, g);
      }
    }
    // The keystone: a crossed glint seating at the crown once the
    // last pane lands, breathing on the shell's slow clock — with a
    // soft halo so the crown reads as the ward's living heart.
    if (reach >= 6) {
      const tw = 0.6 + 0.4 * Math.sin(c.now / 320);
      ctx.globalAlpha = 0.4 * tw * fade;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.ellipse(px, apexY, sc * 0.14, sc * 0.1, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = tw * fade;
      ctx.fillStyle = '#ffffff';
      const g = sc * 0.06;
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
    // Five finger-scorches splay from the palm — each a filled char
    // taper with an ember seam down its middle and a live coal at
    // the tip, dying on its own clock.
    for (let k = 0; k < 5; k++) {
      const a = base - 0.55 + k * 0.275;
      const len = R * (0.55 + rand() * 0.3) * (k === 2 ? 1.15 : 1); // the long finger
      const w = sc * 0.065;
      const coalLife = 0.45 + rand() * 0.4;
      const tipX = px + Math.cos(a) * len;
      const tipY = py + Math.sin(a) * len * squash;
      ctx.globalAlpha = 0.75 * fade;
      ctx.fillStyle = k % 2 === 0 ? st.deep : '#5a2418';
      ctx.beginPath();
      ctx.moveTo(px - Math.sin(a) * w, py + Math.cos(a) * w * squash);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(px + Math.sin(a) * w, py - Math.cos(a) * w * squash);
      ctx.closePath();
      ctx.fill();
      const heat = Math.max(0, 1 - t / coalLife);
      if (heat > 0) {
        // The ember seam: fire still living down the finger's heart.
        ctx.globalAlpha = heat * 0.8 * fade;
        ctx.strokeStyle = st.mid;
        ctx.lineWidth = Math.max(1.8, sc * 0.04);
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(a) * len * 0.2, py + Math.sin(a) * len * 0.2 * squash);
        ctx.lineTo(px + Math.cos(a) * len * 0.85, py + Math.sin(a) * len * 0.85 * squash);
        ctx.stroke();
        const pulse = 0.55 + 0.45 * Math.sin(c.now / 110 + k * 2.4);
        ctx.globalAlpha = heat * pulse;
        ctx.fillStyle = k % 2 === 0 ? st.spark : st.core;
        const g = sc * 0.07 * (0.6 + 0.4 * heat);
        ctx.fillRect(tipX - g / 2, tipY - g / 2, g, g);
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, 0.8, 0.4 * fade);
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0x92);
    const base = rand() * Math.PI * 2;
    const R = Math.max(c.rPx, sc * 0.85);
    ctx.save();
    // Standing flame licks at the two freshest fingertips: the hand
    // is still HOT — real height over the print, breathing, before
    // each gutters into its coal.
    for (let k = 0; k < 5; k++) {
      const a = base - 0.55 + k * 0.275;
      const len = R * (0.55 + rand() * 0.3) * (k === 2 ? 1.15 : 1);
      const coalLife = 0.45 + rand() * 0.4;
      rand(); // keep the walk aligned with the ground hook
      if (k !== 1 && k !== 3) continue;
      const flameLife = Math.max(0, 1 - t / (coalLife * 0.7));
      if (flameLife <= 0) continue;
      const tipX = px + Math.cos(a) * len;
      const tipY = py + Math.sin(a) * len * squash;
      const breathe = 0.7 + 0.3 * Math.sin(c.now / 85 + k * 2.6);
      const h = sc * 0.38 * breathe * flameLife;
      const w = sc * 0.08;
      ctx.globalAlpha = 0.45 * flameLife;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.moveTo(tipX - w * 1.3, tipY + sc * 0.02);
      ctx.lineTo(tipX, tipY - h * 1.06);
      ctx.lineTo(tipX + w * 1.3, tipY + sc * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.95 * flameLife;
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.moveTo(tipX - w, tipY);
      ctx.lineTo(tipX - w * 0.15, tipY - h);
      ctx.lineTo(tipX + w, tipY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.moveTo(tipX - w * 0.4, tipY);
      ctx.lineTo(tipX, tipY - h * 0.55);
      ctx.lineTo(tipX + w * 0.4, tipY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
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
      // A char pool under each scar, then the crossed brand.
      ctx.globalAlpha = 0.45 * k * amb;
      ctx.fillStyle = shade(st.deep, -12);
      ctx.beginPath();
      ctx.ellipse(sx, sy, sc * 0.16, sc * 0.16 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.8 * k * amb;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      const g = sc * 0.15 * (0.6 + 0.4 * k);
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
    // The anvil: three stacked slabs with MASS — each carries a lit
    // top edge and a shadowed belly, riding a slow drift so the
    // whole cloud feels held, breathing, about to speak.
    const drift = Math.sin(c.now / 1100) * sc * 0.06;
    for (let k = 0; k < 3; k++) {
      const w = rPx * (1.5 - k * 0.3);
      const h = sc * 0.22;
      const slabX = px - w / 2 + drift * (k + 1);
      const slabY = cloudY - k * h * 1.15 - h;
      ctx.globalAlpha = (0.75 - k * 0.1) * amb;
      ctx.fillStyle = k === 0 ? st.deep : shade(st.deep, k * 12);
      ctx.fillRect(slabX, slabY, w, h);
      // Sun on the anvil's shoulder: a lit top edge per slab.
      ctx.globalAlpha = (0.55 - k * 0.1) * amb;
      ctx.fillStyle = shade(st.deep, 26 + k * 8);
      ctx.fillRect(slabX, slabY, w, Math.max(1.5, h * 0.18));
      // The belly shadow under the lowest slab.
      if (k === 0) {
        ctx.globalAlpha = 0.5 * amb;
        ctx.fillStyle = shade(st.deep, -16);
        ctx.fillRect(slabX, slabY + h * 0.8, w, h * 0.2);
      }
    }
    // The belly flashes as the wind-up builds, whites out on strike.
    if (phase > 0.1 && t < 0.88) {
      const charge = striking ? 1 : Math.min(1, (phase - 0.1) / 0.18) * 0.4;
      ctx.globalAlpha = charge * amb;
      ctx.fillStyle = striking ? st.core : st.spark;
      ctx.fillRect(px - rPx * 0.5 + drift, cloudY - sc * 0.06, rPx, sc * 0.09);
    }
    // The strike: a writhing three-layer stroke from belly to scar
    // point — dark sheath, storm body, white heart — seating in a
    // burst star.
    if (striking) {
      const k = 1 - (phase - 0.28) / 0.24;
      const flick = c.seed ^ sIdx ^ Math.floor(c.now / 45);
      ctx.globalAlpha = Math.min(1, k * 1.2) * amb * 0.6;
      ctx.strokeStyle = shade(st.deep, -6);
      ctx.lineWidth = Math.max(5, sc * 0.17);
      ctx.beginPath();
      boltPath(ctx, sx * 0.3 + (px + drift) * 0.7, cloudY, sx, sy, flick, sc * 0.3);
      ctx.stroke();
      ctx.globalAlpha = Math.min(1, k * 1.6) * amb;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(3.2, sc * 0.11);
      ctx.beginPath();
      boltPath(ctx, sx * 0.3 + (px + drift) * 0.7, cloudY, sx, sy, flick, sc * 0.3);
      ctx.stroke();
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.8, sc * 0.05);
      ctx.beginPath();
      boltPath(ctx, sx * 0.3 + (px + drift) * 0.7, cloudY, sx, sy, flick, sc * 0.3);
      ctx.stroke();
      // The seat: a white burst star where the sky touches down.
      ctx.globalAlpha = Math.min(1, k * 1.4) * amb;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, sx, sy, sc * 0.34 * (1.4 - k * 0.4), sc * 0.12, 4, flick * 0.4, squash);
      ctx.fill();
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
    // One body-pane: a tall skewed slab of true GLASS — translucent
    // body fill, twin facet slashes, edge light — not an outline.
    const pane = (bx: number, alpha: number, color: string, dashed: boolean): void => {
      if (alpha <= 0) return;
      const h = sc * 1.05, w = sc * 0.21, skew = sc * 0.1;
      const body = (): void => {
        ctx.beginPath();
        ctx.moveTo(bx - w, py);
        ctx.lineTo(bx - w + skew, py - h);
        ctx.lineTo(bx + w + skew, py - h);
        ctx.lineTo(bx + w, py);
        ctx.closePath();
      };
      // The glass body: a cool translucent fill, brighter up top
      // where the light enters it.
      ctx.globalAlpha = alpha * 0.22;
      ctx.fillStyle = color;
      body();
      ctx.fill();
      ctx.globalAlpha = alpha * 0.16;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(bx - w + skew, py - h);
      ctx.lineTo(bx + w + skew, py - h);
      ctx.lineTo(bx + w * 0.6 + skew * 0.7, py - h * 0.6);
      ctx.lineTo(bx - w * 0.6 + skew * 0.7, py - h * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      if (dashed) ctx.setLineDash([sc * 0.09, sc * 0.07]);
      body();
      ctx.stroke();
      ctx.setLineDash([]);
      // Twin facet slashes — glass owning its hard highlights.
      ctx.globalAlpha = alpha * 0.9;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.moveTo(bx - w * 0.4, py - h * 0.25);
      ctx.lineTo(bx + w * 0.35 + skew * 0.6, py - h * 0.7);
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.55;
      ctx.lineWidth = Math.max(1, sc * 0.022);
      ctx.beginPath();
      ctx.moveTo(bx - w * 0.15, py - h * 0.15);
      ctx.lineTo(bx + w * 0.5 + skew * 0.5, py - h * 0.52);
      ctx.stroke();
    };
    // The copy firms where it stands; you thin away to the side —
    // and what thins DISSOLVES: glass motes rising off the leaver.
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const leaving = Math.max(0, 1 - t / 0.65);
    pane(px, (0.35 + 0.55 * Math.min(1, t / 0.5)) * fade, st.mid, false);
    pane(px + off, leaving * 0.8, st.spark, true);
    if (leaving > 0.1 && Math.random() < c.frameDt * 20 * leaving) {
      c.particles.burst(c.wx + off / sc, c.wy - 0.4 - Math.random() * 0.5, 1, ['#ffffff', st.spark], {
        speed: 0.4, life: 0.55, size: 0.07, gravity: -0.9, drag: 1.4, shape: 'glint',
      });
    }
    // The split's first instant: one white seam flash between the
    // parting bodies — the crack of a self coming apart.
    if (t < 0.12) {
      const k = 1 - t / 0.12;
      ctx.globalAlpha = k * 0.9;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.8, sc * 0.045);
      ctx.beginPath();
      ctx.moveTo(px + off * 0.5, py - sc * 0.02);
      ctx.lineTo(px + off * 0.5 + sc * 0.06, py - sc * 1.02);
      ctx.stroke();
    }
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
    // pale quads fanning south out of the horizon line, each edged
    // with a long morning shadow so the light has something to cut.
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 2 - 0.54 + k * 0.36; // fanned southward
      const len = rPx * (0.95 - Math.abs(k - 1.5) * 0.12);
      const w0 = sc * 0.05, w1 = sc * 0.17;
      // The shadow between lanes: dawn's long dark.
      ctx.globalAlpha = 0.28 * fade;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.moveTo(px - w0 * 1.6, py);
      ctx.lineTo(px + Math.cos(a) * len - w1 * 1.35, py + Math.sin(a) * len * squash);
      ctx.lineTo(px + Math.cos(a) * len - w1 * 0.9, py + Math.sin(a) * len * squash);
      ctx.lineTo(px - w0 * 0.6, py);
      ctx.closePath();
      ctx.fill();
      // The lane of light itself.
      ctx.globalAlpha = 0.38 * fade;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.moveTo(px - w0, py);
      ctx.lineTo(px + Math.cos(a) * len - w1, py + Math.sin(a) * len * squash);
      ctx.lineTo(px + Math.cos(a) * len + w1, py + Math.sin(a) * len * squash);
      ctx.lineTo(px + w0, py);
      ctx.closePath();
      ctx.fill();
      // Dew catching light at the lane's far end.
      ctx.globalAlpha = 0.85 * fade;
      ctx.fillStyle = st.spark;
      const g = sc * 0.05;
      ctx.fillRect(px + Math.cos(a) * len - g / 2, py + Math.sin(a) * len * squash - g / 2, g, g);
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 1.1, 0.55 * fade);
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, px, py, rPx } = c;
    const fade = t < 0.65 ? 1 : (1 - t) / 0.35;
    const hw = rPx * 0.8; // the horizon's half-width
    ctx.save();
    const rise = Math.min(1, t / 0.45);
    // The dawn-glow: stacked translucent bands warm the air above
    // the horizon before the disc clears it — morning has a SKY.
    for (let k = 0; k < 3; k++) {
      ctx.globalAlpha = (0.16 - k * 0.04) * fade * (0.4 + 0.6 * rise);
      ctx.fillStyle = k === 0 ? st.spark : st.mid;
      ctx.fillRect(px - hw * (1 - k * 0.12), py - sc * (0.32 + k * 0.3), hw * 2 * (1 - k * 0.12), sc * 0.3);
    }
    // The horizon bar: a hard line for the sun to have something to
    // rise OVER — dawn needs an edge. Gold along its top lip.
    ctx.globalAlpha = 0.9 * fade;
    ctx.fillStyle = st.deep;
    ctx.fillRect(px - hw, py - Math.max(1.5, sc * 0.05), hw * 2, Math.max(3.5, sc * 0.1));
    ctx.fillStyle = st.mid;
    ctx.fillRect(px - hw, py - Math.max(1.5, sc * 0.05), hw * 2, Math.max(1.5, sc * 0.028));
    // The disc climbs: everything below the bar belongs to yesterday.
    const dr = rPx * 0.42;
    const dy = py + dr * 0.75 - (dr * 0.75 + dr * 0.55) * rise;
    ctx.beginPath();
    ctx.rect(px - hw, py - sc * 4, hw * 2, sc * 4 - sc * 0.02);
    ctx.clip();
    // Limb-shaded sun: gold rim, white body, a hot white heart —
    // a star, not a sticker.
    ctx.globalAlpha = fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.5, sc * 0.07);
    ctx.beginPath();
    ctx.ellipse(px, dy, dr * 1.04, dr * 1.04, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = st.spark;
    ctx.beginPath();
    ctx.ellipse(px, dy, dr, dr, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.ellipse(px - dr * 0.08, dy - dr * 0.1, dr * 0.72, dr * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    // Short rays fan off the risen crown — each STRETCHES out from
    // the moment its side of the sun clears, alternating long/short.
    if (rise > 0.7) {
      ctx.fillStyle = st.spark;
      for (let k = 0; k < 7; k++) {
        const grow = Math.min(1, Math.max(0, (rise - 0.7 - k * 0.03) / 0.25));
        if (grow <= 0) continue;
        const a = -Math.PI + (k / 6) * Math.PI + Math.sin(c.now / 1600) * 0.06;
        const L = dr * (k % 2 === 0 ? 0.6 : 0.36) * grow;
        const bx = px + Math.cos(a) * dr * 1.14;
        const by = dy + Math.sin(a) * dr * 1.14;
        const w = sc * 0.045;
        ctx.globalAlpha = 0.9 * fade;
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
    // The corridor: paired void slabs flank the line — each a FILLED
    // quad of elsewhere-dark with its own leaking starlight, gone the
    // moment the zipper passes it. Walking a hallway of night.
    const n = Math.max(5, Math.min(9, Math.round(len / (sc * 0.5))));
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n;
      const jit = (rand() - 0.5) * sc * 0.05;
      const starF = rand();
      if (f < zip) continue;
      const bx = x1 + dx * f, by = y1 + dy * f + jit;
      const half = (len / n) * 0.36;
      const w = sc * 0.19;
      const slabH = sc * 0.34;
      for (const side of [-1, 1]) {
        const sx0 = bx - (dx / len) * half + nx * side * w;
        const sy0 = by - (dy / len) * half + ny * side * w;
        const sx1 = bx + (dx / len) * half + nx * side * w;
        const sy1 = by + (dy / len) * half + ny * side * w;
        // The slab: true void, standing upright off the line.
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = '#100c20';
        ctx.beginPath();
        ctx.moveTo(sx0, sy0);
        ctx.lineTo(sx1, sy1);
        ctx.lineTo(sx1, sy1 - slabH);
        ctx.lineTo(sx0, sy0 - slabH);
        ctx.closePath();
        ctx.fill();
        // Its lit edge facing the corridor's throat.
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = st.mid;
        ctx.lineWidth = Math.max(1.8, sc * 0.045);
        ctx.beginPath();
        ctx.moveTo(sx0, sy0 - slabH);
        ctx.lineTo(sx1, sy1 - slabH);
        ctx.stroke();
        // One star inside each slab, winking on its own clock.
        const tw = 0.4 + 0.6 * Math.sin(c.now / 240 + k * 2.2 + side);
        ctx.globalAlpha = tw;
        ctx.fillStyle = side > 0 ? '#ffffff' : st.spark;
        const g = sc * 0.035;
        ctx.fillRect(
          sx0 + (sx1 - sx0) * starF - g / 2,
          sy0 + (sy1 - sy0) * starF - slabH * (0.3 + starF * 0.5) - g / 2, g, g,
        );
      }
      // The seam glows white down the corridor's throat.
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = k % 2 === 0 ? st.core : st.spark;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.moveTo(bx - (dx / len) * half * 0.7, by - (dy / len) * half * 0.7);
      ctx.lineTo(bx + (dx / len) * half * 0.7, by + (dy / len) * half * 0.7);
      ctx.stroke();
    }
    // The exit crackle: shock dragged through, biting at the arrival
    // around a white arrival star.
    if (t < 0.45) {
      const k = 1 - t / 0.45;
      if (t < 0.2) {
        ctx.globalAlpha = (1 - t / 0.2) * 0.95;
        ctx.fillStyle = st.core;
        ctx.beginPath();
        burstStarPath(ctx, x2, y2, sc * 0.38, sc * 0.14, 4, c.now / 200, 1);
        ctx.fill();
      }
      ctx.globalAlpha = k;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      for (let j = 0; j < 3; j++) {
        const a = (j / 3) * Math.PI * 2 + (c.seed % 5);
        ctx.beginPath();
        boltPath(
          ctx, x2, y2,
          x2 + Math.cos(a) * sc * 0.45 * k, y2 + Math.sin(a) * sc * 0.38 * k,
          c.seed ^ (j * 53) ^ Math.floor(c.now / 50), sc * 0.07,
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
