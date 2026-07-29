/**
 * THE SIGNATURE LAW — the wall's voice.
 *
 * Eleven bespoke set-pieces for the shield school plus the block law's
 * own rim spark. Same binding laws as fxSignatures.ts: hard edges,
 * save/restore hygiene, squash on the ground, srand-deterministic
 * geometry, frameDt-gated emission, ≤60 path ops per hook per frame.
 * The school's grammar is MASONRY AND IRON: flat slabs, laid courses,
 * drawn lines — nothing here billows; walls do not billow.
 */

import { shade } from './rig.js';
import { srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';

/** Screen point r px from the heart along ground angle a. */
function groundPt(c: SigCtx, r: number, a: number): { x: number; y: number } {
  return { x: c.px + Math.cos(a) * r, y: c.py + Math.sin(a) * r * c.squash };
}

/** A flat standing slab (screen-space), the school's brick. */
function slab(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  col: string,
  lit?: string,
): void {
  ctx.fillStyle = col;
  ctx.fillRect(x - w / 2, y - h, w, h);
  if (lit) {
    ctx.fillStyle = lit;
    ctx.fillRect(x - w / 2, y - h, w, Math.max(1, h * 0.22));
  }
}

/**
 * SHIELD_BASH — "the doorslam."
 * The blow is a DOOR, not an edge: a flat pressure plate snaps out
 * along the aim, square and blunt, and the air it displaces leaves as
 * one rectangular ripple. Sparks shear off the leading face.
 */
const shield_bash: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x5a1);
    for (let k = 0; k < 5; k++) {
      c.particles.burst(
        c.wx + Math.cos(c.dir) * c.radius * 0.7,
        c.wy + Math.sin(c.dir) * c.radius * 0.7 * c.squash - 0.5,
        1,
        [c.st.spark, c.st.core],
        {
          speed: 2.0 + rand() * 1.2,
          life: 0.4,
          size: 0.07,
          gravity: 6,
          dir: c.dir + (rand() - 0.5) * 0.9,
          spread: 0.2,
          shape: 'glint',
        },
      );
    }
  },
  air(c) {
    const { ctx, st, t, sc, dir } = c;
    if (t > 0.55) return;
    const f = t / 0.55;
    ctx.save();
    // The door: a blunt quad leading the swing, fading as it travels.
    const reach = c.rPx * (0.35 + 0.55 * f);
    const p = groundPt(c, reach, dir);
    const wHalf = sc * 0.42 * (1 - f * 0.3);
    const nx = -Math.sin(dir);
    const ny = Math.cos(dir) * c.squash;
    const lift = sc * 0.55;
    ctx.globalAlpha = 0.7 * (1 - f);
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.moveTo(p.x + nx * wHalf, p.y + ny * wHalf - lift);
    ctx.lineTo(p.x - nx * wHalf, p.y - ny * wHalf - lift);
    ctx.lineTo(p.x - nx * wHalf * 0.86, p.y - ny * wHalf * 0.86 - lift * 1.7);
    ctx.lineTo(p.x + nx * wHalf * 0.86, p.y + ny * wHalf * 0.86 - lift * 1.7);
    ctx.closePath();
    ctx.fill();
    // Its lit edge — the face that meets the jaw.
    ctx.globalAlpha = 0.9 * (1 - f);
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.045);
    ctx.beginPath();
    ctx.moveTo(p.x + nx * wHalf, p.y + ny * wHalf - lift);
    ctx.lineTo(p.x - nx * wHalf, p.y - ny * wHalf - lift);
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.6, c.wy + Math.sin(dir) * c.radius * 0.6, 0.8, 0.25 * (1 - f));
  },
};

/**
 * SET_THE_WALL — "the raised course."
 * The stance builds: flat stone blocks lay themselves in a low broken
 * ring around the planted feet, course by course, and stand while the
 * stance holds. Masonry, not magic — each block lands with grit.
 */
const set_the_wall: AbilitySig = {
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    const rand = srand(c.seed ^ 0x5a2);
    ctx.save();
    const n = 9;
    const rise = Math.min(1, t * 4); // courses lay fast, then hold
    const fade = t > 0.85 ? (1 - t) / 0.15 : 1;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + rand() * 0.3;
      if (rand() < 0.22) continue; // the wall is BROKEN — a course, not a cage
      const r = c.rPx * (0.82 + rand() * 0.12);
      const p = groundPt(c, r, a);
      const w = sc * (0.16 + rand() * 0.08);
      const h = sc * (0.1 + rand() * 0.08) * rise;
      ctx.globalAlpha = 0.75 * fade;
      slab(ctx, p.x, p.y, w, h, k % 2 ? st.deep : shade(st.deep, 14), st.mid);
    }
    ctx.restore();
  },
  air(c) {
    // Grit pops where fresh courses seat, early only.
    if (c.t < 0.25 && Math.random() < c.frameDt * 14) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.85, c.wy + Math.sin(a) * c.radius * 0.85 * c.squash, 1, [c.st.deep, c.st.mid], {
        speed: 0.8, life: 0.35, size: 0.05, gravity: 5, up: true, shape: 'square',
      });
    }
  },
};

/**
 * SHIELD_RUSH — "the bow wave."
 * The drive splits the air like a prow: a V-wake peels off the dash
 * line behind the boss, and what was standing in the road leaves it
 * sideways. The wake is drawn water-hard — two straight shears.
 */
const shield_rush: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x5a3);
    const a = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    for (let k = 0; k < 4; k++) {
      const f = 0.25 + k * 0.2;
      const side = k % 2 ? 1 : -1;
      c.particles.burst(
        c.wx + (c.wx2 - c.wx) * f,
        c.wy + (c.wy2 - c.wy) * f - 0.3,
        1,
        [c.st.spark, c.st.mid],
        {
          speed: 1.6 + rand() * 0.8,
          life: 0.45,
          size: 0.07,
          gravity: 4,
          dir: a + side * (Math.PI / 2 + 0.4),
          spread: 0.25,
          shape: 'shard',
          spin: 8,
        },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    if (t > 0.7) return;
    const fade = 1 - t / 0.7;
    const a = Math.atan2((c.py2 - c.py) / Math.max(0.001, squash), c.px2 - c.px);
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.06);
    // The V: two shears opening back from the arrival point.
    for (const side of [-1, 1]) {
      const wa = a + Math.PI - side * 0.38;
      ctx.beginPath();
      ctx.moveTo(c.px2, c.py2);
      ctx.lineTo(c.px2 + Math.cos(wa) * sc * 1.6, c.py2 + Math.sin(wa) * sc * 1.6 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
};

/**
 * DRAW_IRON — "the toll."
 * The challenge rings like a struck bell: flat resonance bars stand up
 * around the caster and shiver, and at the ring's rim small chevrons
 * turn INWARD — the yard turning to face the shout.
 */
const draw_iron: AbilitySig = {
  air(c) {
    const { ctx, st, t, sc, squash } = c;
    const rand = srand(c.seed ^ 0x5a4);
    ctx.save();
    // Resonance bars: vertical iron slats shivering around the body.
    const bars = 5;
    const fade = 1 - t;
    for (let k = 0; k < bars; k++) {
      const a = (k / bars) * Math.PI * 2 + 0.5;
      const r = c.rPx * 0.34;
      const p = groundPt(c, r, a);
      const shiver = Math.sin(c.now / 28 + k * 2.1) * sc * 0.03;
      ctx.globalAlpha = 0.55 * fade;
      slab(ctx, p.x + shiver, p.y - sc * 0.2, sc * 0.06, sc * (0.55 + (k % 2) * 0.15), st.deep, st.spark);
    }
    // The turning: rim chevrons pointing home, staggered in time.
    const n = 7;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + rand() * 0.4;
      const on = (t * 3 + k * 0.4) % 1;
      if (on > 0.6) continue;
      const p = groundPt(c, c.rPx * (1.0 - t * 0.25), a);
      const ia = a + Math.PI; // pointing inward
      ctx.globalAlpha = 0.7 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.045);
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(ia - 0.5) * sc * 0.16, p.y + Math.sin(ia - 0.5) * sc * 0.16 * squash);
      ctx.lineTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(ia + 0.5) * sc * 0.16, p.y + Math.sin(ia + 0.5) * sc * 0.16 * squash);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.6, 0.3 * fade);
  },
};

/**
 * SHIELD_ROOF — "the iron sky."
 * The wall goes overhead: a foreshortened plank of shield hangs above
 * the caster, and what falls on it leaves by the eaves — sparks slide
 * down the pitch and gutter off the low edge. The ground beneath stays
 * a dry, sheltered shadow.
 */
const shield_roof: AbilitySig = {
  ground(c) {
    const { ctx, st, t } = c;
    ctx.save();
    // The dry patch: the roof's shadow, calm while everything else rains.
    ctx.globalAlpha = 0.28 * (1 - t * 0.5);
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, c.rPx * 0.66, c.rPx * 0.66 * c.squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    const lift = sc * 1.9;
    const fade = t > 0.8 ? (1 - t) / 0.2 : 1;
    ctx.save();
    // The roof: a wide pitched plank, lit along its ridge.
    const w = sc * 0.95;
    const pitch = sc * 0.16;
    ctx.globalAlpha = 0.85 * fade;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.moveTo(c.px - w, c.py - lift + pitch);
    ctx.lineTo(c.px, c.py - lift - pitch);
    ctx.lineTo(c.px + w, c.py - lift + pitch);
    ctx.lineTo(c.px + w * 0.92, c.py - lift + pitch + sc * 0.11);
    ctx.lineTo(c.px, c.py - lift - pitch + sc * 0.11);
    ctx.lineTo(c.px - w * 0.92, c.py - lift + pitch + sc * 0.11);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.beginPath();
    ctx.moveTo(c.px - w, c.py - lift + pitch);
    ctx.lineTo(c.px, c.py - lift - pitch);
    ctx.lineTo(c.px + w, c.py - lift + pitch);
    ctx.stroke();
    ctx.restore();
    // What it sheds: sparks gutter off the eaves.
    if (Math.random() < c.frameDt * 10 * fade) {
      const side = Math.random() < 0.5 ? -1 : 1;
      c.particles.burst(c.wx + side * 0.75, c.wy - 1.55, 1, [c.st.spark, c.st.core], {
        speed: 0.9, life: 0.5, size: 0.05, gravity: 6, dir: side > 0 ? 0.35 : Math.PI - 0.35, spread: 0.2, shape: 'glint',
      });
    }
  },
};

/**
 * TURNED_BLOW — "the mirror angle."
 * A faceted plane of heated iron flashes at the guard: whatever comes
 * in leaves by the same door, elbow-bent. Streak motes arrive, break
 * hard at the facet, and depart glowing hotter than they came.
 */
const turned_blow: AbilitySig = {
  air(c) {
    const { ctx, st, t, sc } = c;
    const fade = 1 - t;
    // The facet: a slim angled plane held off the body, breathing.
    const breathe = 1 + Math.sin(c.now / 160) * 0.05;
    const lift = sc * 0.75;
    ctx.save();
    ctx.translate(c.px, c.py - lift);
    ctx.rotate(-0.5);
    ctx.globalAlpha = 0.6 * fade;
    ctx.fillStyle = st.mid;
    ctx.fillRect(-sc * 0.06, -sc * 0.5 * breathe, sc * 0.12, sc * 1.0 * breathe);
    ctx.globalAlpha = 0.9 * fade;
    ctx.fillStyle = st.spark;
    ctx.fillRect(-sc * 0.06, -sc * 0.5 * breathe, sc * 0.12, sc * 0.12);
    ctx.restore();
    // The elbow: motes arrive, break at the facet, leave hot.
    if (Math.random() < c.frameDt * 8 * fade) {
      c.particles.burst(c.wx - 0.9, c.wy - 0.7, 1, [st.deep], {
        speed: 2.4, life: 0.22, size: 0.05, gravity: 0, dir: 0, spread: 0.1, shape: 'streak',
      });
      c.particles.burst(c.wx - 0.1, c.wy - 0.75, 1, [st.spark, st.core], {
        speed: 2.8, life: 0.3, size: 0.06, gravity: 0, dir: Math.PI * 0.75, spread: 0.15, shape: 'streak',
      });
    }
  },
};

/**
 * RAMPART_BREAK — "the risen course."
 * The rim driven home raises the ground's OWN masonry: flat merlon
 * slabs stand up in a ring at the blast lip like a buried rampart
 * surfacing, hold a beat, and sink. The crater floor cracks in
 * running-bond lines — mortar joints, not radial spokes.
 */
const rampart_break: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x5a7);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.5;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.8, c.wy + Math.sin(a) * c.radius * 0.8 * c.squash, 1, [c.st.deep, c.st.mid], {
        speed: 1.6 + rand(), life: 0.5, size: 0.09, gravity: 7, dir: a, spread: 0.3, shape: 'shard', spin: 9,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    const rand = srand(c.seed ^ 0x5a8);
    ctx.save();
    // Running-bond cracks: two courses of offset mortar lines.
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    for (let row = 0; row < 2; row++) {
      const ry = c.py + (row - 0.5) * sc * 0.34 * squash;
      const off = row % 2 ? sc * 0.2 : 0;
      ctx.beginPath();
      ctx.moveTo(c.px - c.rPx * 0.55, ry);
      ctx.lineTo(c.px + c.rPx * 0.55, ry);
      ctx.stroke();
      for (let k = -1; k <= 1; k++) {
        const x = c.px + k * sc * 0.4 + off;
        ctx.beginPath();
        ctx.moveTo(x, ry - sc * 0.15 * squash);
        ctx.lineTo(x, ry + sc * 0.15 * squash);
        ctx.stroke();
      }
    }
    // The risen rampart: merlons surface on the rim, hold, sink.
    const up = t < 0.25 ? t / 0.25 : t > 0.7 ? Math.max(0, (1 - t) / 0.3) : 1;
    const n = 8;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + 0.3 + rand() * 0.2;
      const p = groundPt(c, c.rPx * 0.95, a);
      const h = sc * (0.2 + rand() * 0.12) * up;
      if (h < 1) continue;
      ctx.globalAlpha = 0.8 * fade;
      slab(ctx, p.x, p.y, sc * (0.14 + rand() * 0.05), h, k % 2 ? st.deep : shade(st.deep, 12), st.mid);
    }
    ctx.restore();
  },
};

/**
 * WHEEL_OF_IRON — "the loosed rim."
 * The throw leaves torque behind: a wound spiral of release at the
 * caster's hand and, at the heart, a turning glint-pair chasing each
 * other around the rim of a wheel that is already gone.
 */
const wheel_of_iron: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x5a9);
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(c.wx, c.wy - 0.6, 1, [c.st.spark, c.st.core], {
        speed: 1.2 + rand() * 0.6, life: 0.35, size: 0.05, gravity: 2, dir: a, spread: 0.2, shape: 'glint',
      });
    }
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.6) return;
    const fade = 1 - t / 0.6;
    const lift = sc * 0.7;
    ctx.save();
    // The torque: two glints chasing around the departed wheel's rim.
    for (let k = 0; k < 2; k++) {
      const a = c.now / 90 + k * Math.PI;
      const r = sc * 0.4;
      ctx.globalAlpha = 0.8 * fade;
      ctx.strokeStyle = k ? st.core : st.spark;
      ctx.lineWidth = Math.max(1.5, sc * 0.05);
      ctx.beginPath();
      ctx.arc(c.px, c.py - lift, r, a, a + 1.1);
      ctx.stroke();
    }
    ctx.restore();
  },
};

/**
 * HOLD_THE_LINE — "the drawn line."
 * The kept ground declares itself: a dashed iron border runs the
 * field's edge like a line painted on the yard, and the dashes flare
 * in marching order at every pulse. Inside, planted boot-pair marks
 * say someone is NOT leaving.
 */
const hold_the_line: AbilitySig = {
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    const rand = srand(c.seed ^ 0x5ab);
    ctx.save();
    const fade = t > 0.85 ? (1 - t) / 0.15 : 1;
    // The border: dashed iron segments on the rim, marching.
    const n = 12;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const march = (t * 6 + k / n) % 1;
      const hot = march < 0.25;
      const p0 = groundPt(c, c.rPx * 0.96, a - 0.16);
      const p1 = groundPt(c, c.rPx * 0.96, a + 0.16);
      ctx.globalAlpha = (hot ? 0.85 : 0.4) * fade;
      ctx.strokeStyle = hot ? st.mid : st.deep;
      ctx.lineWidth = Math.max(2, sc * (hot ? 0.07 : 0.05));
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    // The planted feet: two boot-pair marks inside the line.
    for (let k = 0; k < 2; k++) {
      const a = rand() * Math.PI * 2;
      const p = groundPt(c, c.rPx * (0.25 + rand() * 0.3), a);
      ctx.globalAlpha = 0.35 * fade;
      ctx.fillStyle = st.deep;
      ctx.fillRect(p.x - sc * 0.07, p.y - sc * 0.028 * squash, sc * 0.055, sc * 0.09 * squash);
      ctx.fillRect(p.x + sc * 0.02, p.y - sc * 0.028 * squash, sc * 0.055, sc * 0.09 * squash);
    }
    ctx.restore();
  },
};

/**
 * UNBROKEN — "the ring of walls."
 * The great stand is not one shield but six: a slow ring of small
 * flat heater plates orbits the caster at guard height, each catching
 * the light in turn. As the stand ages the ring tightens — the walls
 * close ranks.
 */
const unbroken: AbilitySig = {
  air(c) {
    const { ctx, st, t, sc } = c;
    const fade = t > 0.85 ? (1 - t) / 0.15 : 1;
    const lift = sc * 0.85;
    const ring = sc * (0.62 - t * 0.18); // ranks close as it ages
    ctx.save();
    for (let k = 0; k < 6; k++) {
      const a = c.now / 900 + (k / 6) * Math.PI * 2;
      const x = c.px + Math.cos(a) * ring;
      const y = c.py - lift + Math.sin(a) * ring * 0.34;
      const behind = Math.sin(a) < 0;
      const s = sc * (behind ? 0.1 : 0.13);
      const lit = Math.cos(a - c.now / 700) > 0.6;
      ctx.globalAlpha = (behind ? 0.5 : 0.85) * fade;
      ctx.fillStyle = lit ? st.core : st.mid;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.8, y - s);
      ctx.lineTo(x + s * 0.8, y - s);
      ctx.lineTo(x + s * 0.8, y + s * 0.1);
      ctx.lineTo(x, y + s);
      ctx.lineTo(x - s * 0.8, y + s * 0.1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, 0.9, 0.3 * fade);
  },
};

/**
 * CHAMPIONS_WALL — "the trophy stakes."
 * Every ring of the wall plants the yard with won ground: thin
 * trophy stakes rise at the rim wearing small brass pennants, hold
 * while the wall dares the survivors, and fall when the dare ends.
 */
const champions_wall: AbilitySig = {
  ground(c) {
    const { ctx, st, t, sc } = c;
    const rand = srand(c.seed ^ 0x5ad);
    ctx.save();
    const n = 7;
    const up = t < 0.2 ? t / 0.2 : t > 0.75 ? Math.max(0, (1 - t) / 0.25) : 1;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + rand() * 0.4;
      const p = groundPt(c, c.rPx * (0.9 + rand() * 0.1), a);
      const h = sc * (0.42 + rand() * 0.14) * up;
      if (h < 2) continue;
      // The stake.
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y - h);
      ctx.stroke();
      // The pennant: a small brass triangle taking a wind that isn't there.
      const flap = Math.sin(c.now / 140 + k) * sc * 0.03;
      ctx.fillStyle = k % 2 ? st.mid : st.spark;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - h);
      ctx.lineTo(p.x + sc * 0.16, p.y - h + sc * 0.05 + flap);
      ctx.lineTo(p.x, p.y - h + sc * 0.1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  },
  air(c) {
    c.glow(c.wx, c.wy, c.radius * 0.7, 0.25 * (1 - c.t));
  },
};

/**
 * SHIELD_BLOCK — "the rim spark."
 * The block law's own voice, cheap enough to say often: a hard little
 * fan of glints shears off the shield face toward the blow, and one
 * short arc of rim catches the light. No ring, no wash — a spark.
 */
const shield_block: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x5ae);
    // dir = the heading the blow travelled; sparks shear BACK at it.
    const back = c.dir + Math.PI;
    for (let k = 0; k < 3; k++) {
      c.particles.burst(
        c.wx + Math.cos(back) * 0.3,
        c.wy + Math.sin(back) * 0.3 * c.squash - 0.7,
        1,
        [c.st.spark, c.st.core],
        {
          speed: 1.6 + rand() * 0.9,
          life: 0.3,
          size: 0.05,
          gravity: 5,
          dir: back + (rand() - 0.5) * 0.9,
          spread: 0.2,
          shape: 'glint',
        },
      );
    }
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.5) return;
    const fade = 1 - t / 0.5;
    const back = c.dir + Math.PI;
    ctx.save();
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.05);
    ctx.beginPath();
    ctx.arc(c.px + Math.cos(back) * sc * 0.3, c.py - sc * 0.7, sc * 0.24, back - 0.7, back + 0.7);
    ctx.stroke();
    ctx.restore();
  },
};

export const SHIELD_SIGS: Record<string, AbilitySig> = {
  shield_bash,
  set_the_wall,
  shield_rush,
  draw_iron,
  shield_roof,
  turned_blow,
  rampart_break,
  wheel_of_iron,
  hold_the_line,
  unbroken,
  champions_wall,
  shield_block,
};
