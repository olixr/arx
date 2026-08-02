/**
 * THE SIGNATURE LAW — the TEN FLIGHTS wave.
 *
 * Ten bespoke set-pieces for the legendary chase bows. A flight is
 * the feathers that steer a shaft, and each of these bows steers its
 * own — so each signature is that bow's whole thesis loosed at full
 * draw: the briar fencing its claim in planted arrows, the lark
 * taking the morning line up, the pond counting the skips, the storm
 * setting its anvil down where it was told.
 *
 * Same binding laws as every wave before: hard edges only, save/
 * restore discipline, squash on ground y-radii, air pieces lifted
 * ~0.4·sc, srand-deterministic geometry with frameDt-gated emission
 * as the only per-frame chance, ≤ ~60 path ops per hook per frame.
 * 120fps is a law. No signature shares a centerpiece with any other
 * file's — these are new sentences, not louder readings of old ones.
 *
 * FX v5 wave 3h: four bows speak library matter (storm, fire, shadow
 * — ONE-VOICE LAW; stormskip's touches discharge on their crossing
 * frames). The briar, the bird-light, the moon-glass, the scent, the
 * music, and the star-net stay each bow's own.
 */

import { srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { storm, fire, shadow, asMatter } from './matter/index.js';

// ----------------------------------------------------------- wakewood

/**
 * WAKEWOOD — "the briar fences its claim."
 * Five fletched shafts stand planted around the field's rim like a
 * poacher's fence line, leaves budding off the standing wood, and
 * bramble garlands sag post to post. The pulses run a low green
 * ripple along the garland — the ground is claimed, and it says so.
 */
const wakewood: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x41);
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.5,
        c.wy + Math.sin(a) * c.radius * 0.5 * c.squash,
        1, [c.st.mid, c.st.core], {
          speed: 1.0 + rand() * 0.8, life: 0.55, size: 0.07, gravity: 4,
          dir: a, spread: 0.3, shape: 'glint',
        },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, squash } = c;
    const rand = srand(c.seed ^ 0x42);
    const fade = Math.min(1, (1 - t) * 4);
    const grow = Math.min(1, t * 4);
    ctx.save();
    ctx.lineCap = 'round';
    const posts: Array<readonly [number, number, number]> = [];
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rand() * 0.5;
      const r = c.rPx * (0.72 + rand() * 0.18);
      const x = c.px + Math.cos(a) * r;
      const y = c.py + Math.sin(a) * r * squash;
      posts.push([x, y, a]);
      // The planted shaft, leaning a hair outward, fletch up.
      const lean = Math.cos(a) * 0.16;
      const h = c.sc * 0.42 * grow;
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(1.5, c.sc * 0.04);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + lean * h, y - h);
      ctx.stroke();
      // Fletch tick at the crest, in the bow's green.
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.moveTo(x + lean * h, y - h);
      ctx.lineTo(x + lean * h - c.sc * 0.07, y - h + c.sc * 0.09);
      ctx.lineTo(x + lean * h + c.sc * 0.05, y - h + c.sc * 0.07);
      ctx.closePath();
      ctx.fill();
      // A leaf pair budding off the standing wood.
      const bud = Math.max(0, Math.min(1, t * 3 - k * 0.2));
      if (bud > 0) {
        ctx.fillStyle = st.core;
        ctx.beginPath();
        ctx.ellipse(x + lean * h * 0.5 - c.sc * 0.04 * bud, y - h * 0.55, c.sc * 0.045 * bud, c.sc * 0.02 * bud, -0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // The garland: bramble arcs sagging post to post, and the claim
    // ripple walking the fence on the field's own clock.
    const walk = (c.now / 900) % 1;
    for (let k = 0; k < 5; k++) {
      const [x1, y1] = posts[k]!;
      const [x2, y2] = posts[(k + 1) % 5]!;
      const near = Math.abs(((k / 5) + 0.1) - walk);
      const lit = near < 0.14 || near > 0.86;
      ctx.globalAlpha = (lit ? 0.85 : 0.45) * fade;
      ctx.strokeStyle = lit ? st.core : st.deep;
      ctx.lineWidth = Math.max(1, c.sc * 0.026);
      ctx.beginPath();
      ctx.moveTo(x1, y1 - c.sc * 0.3 * grow);
      ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 - c.sc * 0.1 * grow, x2, y2 - c.sc * 0.3 * grow);
      ctx.stroke();
    }
    ctx.restore();
  },
};

// ----------------------------------------------------------- larkshot

/**
 * LARKSHOT — "the lark takes the line up."
 * The morning lane is feathered — barb ticks lean off both rails
 * like a fletching seen from inside the shot — and at the terminus
 * a bright lark-glint spirals UP and out of frame, shedding dawn
 * streamers. The sun stays below the horizon; the bird is the light.
 */
const larkshot: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x43);
    const dx = Math.cos(c.dir);
    const dy = Math.sin(c.dir);
    for (let k = 0; k < 5; k++) {
      const d = 0.2 + k * 0.18;
      c.particles.burst(
        c.wx + dx * (c.radius * 2) * d, c.wy + dy * (c.radius * 2) * d * c.squash,
        1, [c.st.core, c.st.spark], {
          speed: 0.5, life: 0.5 + rand() * 0.3, size: 0.06, gravity: -2.5,
          shape: 'glint',
        },
      );
    }
  },
  ground(c) {
    const { ctx, st, t } = c;
    const fade = 1 - t;
    ctx.save();
    ctx.lineCap = 'round';
    // Barb ticks leaning off the lane's rails, swept shot-ward.
    const dx = c.px2 - c.px;
    const dy = c.py2 - c.py;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1, c.sc * 0.03);
    for (let k = 0; k < 6; k++) {
      const u = 0.15 + k * 0.14;
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(c.px + dx * u + nx * sd * c.sc * 0.22, c.py + dy * u + ny * sd * c.sc * 0.22);
        ctx.lineTo(c.px + dx * (u - 0.05) + nx * sd * c.sc * 0.38, c.py + dy * (u - 0.05) + ny * sd * c.sc * 0.38);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t } = c;
    // The lark: a glint spiraling up from the terminus, streamers
    // trailing, gone before the lane is.
    const climb = t * c.sc * 1.5;
    const a = t * Math.PI * 5;
    const lx = c.px2 + Math.cos(a) * c.sc * 0.24 * (1 - t * 0.5);
    const ly = c.py2 - c.sc * 0.4 - climb;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - t) * 2.5);
    ctx.fillStyle = st.spark;
    ctx.beginPath();
    ctx.arc(lx, ly, Math.max(1.5, c.sc * 0.05), 0, Math.PI * 2);
    ctx.fill();
    // Dawn streamers shed down the climb.
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1, c.sc * 0.024);
    for (let k = 1; k <= 3; k++) {
      const ba = a - k * 0.9;
      ctx.globalAlpha = Math.min(1, (1 - t) * 2.5) * (1 - k * 0.26);
      ctx.beginPath();
      ctx.moveTo(c.px2 + Math.cos(ba) * c.sc * 0.24, c.py2 - c.sc * 0.4 - climb + k * c.sc * 0.16);
      ctx.lineTo(c.px2 + Math.cos(ba) * c.sc * 0.3, c.py2 - c.sc * 0.4 - climb + k * c.sc * 0.24);
      ctx.stroke();
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- glasshail

/**
 * GLASSHAIL — "the sky breaks politely."
 * Fallen splinters stand EMBEDDED in the ground where they landed,
 * leaning at their arrival angles, each catching the moon-glint in
 * turn before sublimating to fog. The strike is over fast; the
 * glitter takes its time leaving.
 */
const glasshail: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x45);
    for (let k = 0; k < 8; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(c.wx, c.wy - 0.2, 1, [c.st.core, c.st.spark], {
        speed: 1.8 + rand() * 1.4, life: 0.5, size: 0.06, gravity: 6,
        dir: a, spread: 0.4, shape: 'glint',
      });
    }
  },
  ground(c) {
    const { ctx, st, t, squash } = c;
    const rand = srand(c.seed ^ 0x46);
    const fade = 1 - t;
    ctx.save();
    for (let k = 0; k < 7; k++) {
      const a = rand() * Math.PI * 2;
      const r = c.rPx * (0.2 + rand() * 0.75);
      const x = c.px + Math.cos(a) * r;
      const y = c.py + Math.sin(a) * r * squash;
      const lean = (rand() - 0.5) * 0.8;
      const h = c.sc * (0.22 + rand() * 0.2);
      const sub = Math.max(0, 1 - Math.max(0, t - 0.5 - k * 0.05) * 3);
      if (sub <= 0) continue;
      // The standing splinter: a hard two-facet sliver.
      ctx.globalAlpha = 0.9 * fade * sub;
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.moveTo(x - c.sc * 0.03, y);
      ctx.lineTo(x + lean * h * 0.6 - c.sc * 0.005, y - h);
      ctx.lineTo(x + c.sc * 0.03, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + lean * h * 0.6 - c.sc * 0.005, y - h);
      ctx.lineTo(x + c.sc * 0.03, y);
      ctx.closePath();
      ctx.fill();
      // Each takes the glint in turn.
      const wink = Math.max(0, Math.sin(c.now / 260 + k * 1.9));
      if (wink > 0.75) {
        ctx.globalAlpha = fade * sub;
        ctx.fillStyle = st.spark;
        ctx.beginPath();
        ctx.arc(x + lean * h * 0.4, y - h * 0.65, Math.max(1, c.sc * 0.03), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- stormskip

/**
 * STORMSKIP — "the pond counts the skips."
 * The crowd is briefly a body of water: flat skip-rings spread at
 * each touch point down the line, and the live arc hops ring to
 * ring a half-beat behind the shot, re-jagged on the storm clock.
 */
const stormskip: AbilitySig = {
  spawn(c) {
    // The last skip lands as one TRUE discharge at the far end.
    storm.deployments.impact!(asMatter(c), c.wx2, c.wy2, { scale: 0.6 });
  },
  ground(c) {
    const { ctx, st, t, squash } = c;
    const fade = 1 - t;
    ctx.save();
    // Three touch points along the strike line, rings spreading in
    // arrival order — and each touch DISCHARGES on its crossing
    // frame, a small true crackle as the stone kisses the water.
    const touches = [0.15, 0.55, 0.95];
    const lifeMs = t > 0 ? c.age / t : 0;
    const tPrev = lifeMs > 0 ? (c.age - c.frameDt * 1000) / lifeMs : 0;
    for (let k = 0; k < 3; k++) {
      const u = touches[k]!;
      const x = c.px + (c.px2 - c.px) * u;
      const y = c.py + (c.py2 - c.py) * u;
      const born = k * 0.18;
      if (k > 0 && tPrev < born && t >= born) {
        storm.deployments.impact!(asMatter(c),
          c.wx + (c.wx2 - c.wx) * u, c.wy + (c.wy2 - c.wy) * u,
          { scale: 0.25 });
      }
      const rt = Math.max(0, Math.min(1, (t - born) * 2.2));
      if (rt <= 0) continue;
      ctx.globalAlpha = (1 - rt) * 0.8 * fade;
      ctx.strokeStyle = k === 1 ? st.core : st.mid;
      ctx.lineWidth = Math.max(1, c.sc * 0.035 * (1 - rt * 0.5));
      ctx.beginPath();
      ctx.ellipse(x, y, c.sc * 0.55 * rt, c.sc * 0.55 * rt * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The arc hops the gaps, re-jagged every 90ms.
    const slice = Math.floor(c.now / 90);
    const jag = (k: number): number => {
      const v = Math.sin(slice * 127.1 + k * 311.7) * 43758.5453;
      return v - Math.floor(v);
    };
    const hop = Math.min(1, t * 2.5);
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1, c.sc * 0.03);
    ctx.beginPath();
    ctx.moveTo(c.px, c.py - c.sc * 0.1);
    for (let k = 1; k <= 6; k++) {
      const u = (k / 6) * hop;
      const lift = Math.sin(u * Math.PI * 3) * c.sc * 0.3;
      ctx.lineTo(
        c.px + (c.px2 - c.px) * u + (jag(k) - 0.5) * c.sc * 0.12,
        c.py + (c.py2 - c.py) * u - Math.abs(lift) - c.sc * 0.05,
      );
    }
    ctx.stroke();
    ctx.restore();
  },
};

// ----------------------------------------------------------- charfall

/**
 * CHARFALL — "the kiln door opens."
 * The strike leaves a kiln grate in the ground: parallel glowing
 * bars cooling from the outside in, a brick-dark rim, and heat
 * standing over the bars in slivers. Up an arrow, down a furnace.
 */
const charfall: AbilitySig = {
  spawn(c) {
    // The kiln door opens on TRUE fire: a standing plume over the
    // grate — licks through the full combustion story, sparks up the
    // draft, soot breathing off the top.
    fire.deployments.plume!(asMatter(c), c.wx, c.wy, { dur: 0.9, scale: 0.4 });
  },
  ground(c) {
    const { ctx, st, t, squash } = c;
    const fade = 1 - t;
    ctx.save();
    // The brick-dark rim.
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, c.sc * 0.07);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, c.rPx * 0.85, c.rPx * 0.85 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // The grate: five bars, cooling outside-in on their own clocks.
    for (let k = -2; k <= 2; k++) {
      const heat = Math.max(0, 1 - t * (1.1 + Math.abs(k) * 0.35));
      if (heat <= 0) continue;
      const w = c.rPx * 0.72 * Math.sqrt(1 - (k / 3) * (k / 3));
      const y = c.py + k * c.rPx * 0.26 * squash;
      const pulse = 0.65 + 0.35 * Math.sin(c.now / 170 + k * 1.3);
      ctx.globalAlpha = heat * pulse;
      ctx.strokeStyle = k % 2 === 0 ? st.spark : st.core;
      ctx.lineWidth = Math.max(1.5, c.sc * 0.055 * heat);
      ctx.beginPath();
      ctx.moveTo(c.px - w, y);
      ctx.lineTo(c.px + w, y);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t } = c;
    // Heat slivers standing over the bars, climbing and thinning.
    const rand = srand(c.seed ^ 0x4a);
    ctx.save();
    for (let k = 0; k < 3; k++) {
      const x = c.px + (rand() - 0.5) * c.rPx * 1.1;
      const p = (t * 1.6 + k * 0.33) % 1;
      ctx.globalAlpha = (1 - p) * 0.4 * (1 - t);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1, c.sc * 0.02);
      const y = c.py - c.sc * 0.15 - p * c.sc * 0.55;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + c.sc * 0.05, y - c.sc * 0.1, x, y - c.sc * 0.2);
      ctx.stroke();
    }
    ctx.restore();
  },
};

// ----------------------------------------------------------- hushfall

/**
 * HUSHFALL — "the dark opens its wings."
 * A hush-ring breathes out from the loose — a soft dark rim, not a
 * flash — and owl feathers peel off it point-first after the shots,
 * dissolving before they land. At the heart two amber eyes open,
 * take one unhurried look, and close.
 */
const hushfall: AbilitySig = {
  spawn(c) {
    // The dark opens its wings as one soft TRUE exhale — a small
    // shadow bloom, ink with a bruise-violet edge, quiet as the owl.
    shadow.deployments.bloom!(asMatter(c), c.wx, c.wy, { scale: 0.35 });
  },
  ground(c) {
    const { ctx, st, t, squash } = c;
    const fade = 1 - t;
    ctx.save();
    // The hush-ring: a dark rim moving out, quiet as a held breath.
    const r = c.rPx * (0.25 + t * 0.8);
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, c.sc * 0.07 * fade);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, r, r * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.35 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1, c.sc * 0.03);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, r * 0.82, r * 0.82 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t } = c;
    const rand = srand(c.seed ^ 0x4c);
    ctx.save();
    // Feathers peeling off the ring, point-first, gone mid-fall.
    for (let k = 0; k < 4; k++) {
      const a = rand() * Math.PI * 2;
      const p = Math.max(0, Math.min(1, t * 1.8 - k * 0.12));
      if (p <= 0) continue;
      const r = c.rPx * (0.3 + p * 0.7);
      const x = c.px + Math.cos(a) * r;
      const y = c.py - c.sc * 0.35 + Math.sin(a) * r * 0.4 + p * c.sc * 0.2;
      const rock = Math.sin(p * Math.PI * 3 + k) * 0.4;
      ctx.globalAlpha = (1 - p) * 0.8;
      ctx.fillStyle = st.mid;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a + rock);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(c.sc * 0.1, -c.sc * 0.04, c.sc * 0.19, 0);
      ctx.quadraticCurveTo(c.sc * 0.1, c.sc * 0.035, 0, 0);
      ctx.fill();
      ctx.restore();
    }
    // The eyes: open, look, close — amber, unhurried.
    const eye = Math.sin(Math.min(1, t * 1.4) * Math.PI);
    if (eye > 0.05) {
      ctx.globalAlpha = eye;
      ctx.fillStyle = '#ffd98a';
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(c.px + sd * c.sc * 0.09, c.py - c.sc * 0.45, c.sc * 0.035, c.sc * 0.035 * eye, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  },
};

// -------------------------------------------------------- quarry_call

/**
 * QUARRY_CALL — "the name is read out."
 * The mark arrives before the arrow: a red quarry-ring stamps at
 * the target with an antler tick over it, the flight line draws
 * itself as one taut red thread, and the scent-haze streams DOWN
 * the line toward the mark — the woods leaning in to listen.
 */
const quarry_call: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x4d);
    for (let k = 0; k < 4; k++) {
      c.particles.burst(c.wx2, c.wy2, 1, [c.st.mid, c.st.deep], {
        speed: 0.8 + rand() * 0.6, life: 0.5, size: 0.07, gravity: 1,
        dir: rand() * Math.PI * 2, spread: 0.4, fade: c.st.deep,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, squash } = c;
    const fade = 1 - t;
    ctx.save();
    // The taut thread, first thing drawn, first thing gone.
    const thread = Math.max(0, 1 - t * 2.2);
    if (thread > 0) {
      ctx.globalAlpha = thread * 0.7;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1, c.sc * 0.022);
      ctx.beginPath();
      ctx.moveTo(c.px, c.py - c.sc * 0.2);
      ctx.lineTo(c.px2, c.py2 - c.sc * 0.1);
      ctx.stroke();
    }
    // The quarry-ring stamping at the mark.
    const stamp = Math.min(1, t * 3);
    const r = c.sc * 0.5 * (1.3 - stamp * 0.3);
    ctx.globalAlpha = stamp * 0.9 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, c.sc * 0.045);
    ctx.beginPath();
    ctx.ellipse(c.px2, c.py2, r, r * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // The antler tick over the ring — the name, read out.
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1, c.sc * 0.032);
    ctx.beginPath();
    ctx.moveTo(c.px2 - c.sc * 0.1, c.py2 - r * squash - c.sc * 0.08);
    ctx.lineTo(c.px2, c.py2 - r * squash - c.sc * 0.22);
    ctx.lineTo(c.px2 + c.sc * 0.1, c.py2 - r * squash - c.sc * 0.06);
    ctx.moveTo(c.px2, c.py2 - r * squash - c.sc * 0.22);
    ctx.lineTo(c.px2 + c.sc * 0.02, c.py2 - r * squash - c.sc * 0.3);
    ctx.stroke();
    // Scent-haze streaming down the line toward the mark.
    const rand = srand(c.seed ^ 0x4e);
    ctx.lineWidth = Math.max(1, c.sc * 0.026);
    for (let k = 0; k < 3; k++) {
      const off = (rand() - 0.5) * c.sc * 0.3;
      const p = (t * 1.4 + k * 0.33) % 1;
      const u0 = p * 0.8;
      const u1 = Math.min(1, u0 + 0.14);
      ctx.globalAlpha = (1 - p) * 0.5 * fade;
      ctx.strokeStyle = st.mid;
      ctx.beginPath();
      ctx.moveTo(c.px + (c.px2 - c.px) * u0 + off, c.py + (c.py2 - c.py) * u0 - c.sc * 0.15);
      ctx.lineTo(c.px + (c.px2 - c.px) * u1 + off * 0.6, c.py + (c.py2 - c.py) * u1 - c.sc * 0.1);
      ctx.stroke();
    }
    ctx.restore();
  },
};

// ------------------------------------------------------ plucked_chord

/**
 * PLUCKED_CHORD — "the room is strung."
 * Three chord strings stand across the nova disc like the harp
 * came with the archer. Each pulse plucks the next in line — the
 * string bows into a visible vibration envelope and one note-ring
 * leaves it sideways. The strings outlast the notes by a breath.
 */
const plucked_chord: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x4f);
    for (let k = 0; k < 5; k++) {
      c.particles.burst(c.wx, c.wy - 0.3, 1, [c.st.core, c.st.spark], {
        speed: 0.9 + rand() * 0.7, life: 0.5, size: 0.06, gravity: -1.5,
        dir: rand() * Math.PI * 2, spread: 0.5, shape: 'glint',
      });
    }
  },
  ground(c) {
    const { ctx, st, t, squash } = c;
    const fade = 1 - t;
    ctx.save();
    // Which string is being plucked walks with the pulse clock.
    const pluck = Math.floor(t * 3.2) % 3;
    for (let k = -1; k <= 1; k++) {
      const x = c.px + k * c.rPx * 0.4;
      const half = c.rPx * squash * Math.sqrt(Math.max(0.1, 1 - (k * 0.4) * (k * 0.4))) * 0.85;
      const isP = k + 1 === pluck;
      const vib = isP ? Math.sin(c.now / 40) * c.sc * 0.05 * fade : 0;
      ctx.globalAlpha = (isP ? 0.95 : 0.55) * fade;
      ctx.strokeStyle = isP ? st.spark : st.mid;
      ctx.lineWidth = Math.max(1, c.sc * (isP ? 0.035 : 0.026));
      ctx.beginPath();
      ctx.moveTo(x, c.py - half);
      ctx.quadraticCurveTo(x + vib, c.py, x, c.py + half);
      ctx.stroke();
      // Pins where the string meets the room.
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.arc(x, c.py - half, Math.max(1, c.sc * 0.03), 0, Math.PI * 2);
      ctx.arc(x, c.py + half, Math.max(1, c.sc * 0.03), 0, Math.PI * 2);
      ctx.fill();
      // The note leaving the plucked string sideways.
      if (isP) {
        const nt = (t * 3.2) % 1;
        ctx.globalAlpha = (1 - nt) * 0.8;
        ctx.strokeStyle = st.core;
        ctx.lineWidth = Math.max(1, c.sc * 0.03);
        ctx.beginPath();
        ctx.ellipse(x, c.py, c.sc * 0.5 * nt + c.sc * 0.1, (c.sc * 0.5 * nt + c.sc * 0.1) * squash, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- nightweft

/**
 * NIGHTWEFT — "the net closes."
 * A woven lattice of night materializes over the ground at full
 * spread and then DRAWS IN — warp and weft bowing toward center,
 * star glints riding the intersections all the way to the middle.
 * The catch is not chased. It is gathered.
 */
const nightweft: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x51);
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.8,
        c.wy + Math.sin(a) * c.radius * 0.8 * c.squash,
        1, [c.st.core, c.st.spark], {
          speed: 1.2, life: 0.5, size: 0.06, gravity: 0,
          dir: a + Math.PI, spread: 0.15, shape: 'glint',
        },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, squash } = c;
    const fade = 1 - t;
    // The whole net scales toward center as the weave closes.
    const closeK = 1 - Math.min(1, t * 1.3) * 0.75;
    const R = c.rPx * closeK;
    ctx.save();
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1, c.sc * 0.028);
    // Warp and weft, bowing inward — a net, not a grid.
    for (let k = -1; k <= 1; k++) {
      const off = k * R * 0.5;
      const reach = R * Math.sqrt(Math.max(0.15, 1 - (k * 0.5) * (k * 0.5)));
      ctx.beginPath();
      ctx.moveTo(c.px - reach, c.py + off * squash);
      ctx.quadraticCurveTo(c.px, c.py + off * squash * 0.55, c.px + reach, c.py + off * squash);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(c.px + off, c.py - reach * squash);
      ctx.quadraticCurveTo(c.px + off * 0.55, c.py, c.px + off, c.py + reach * squash);
      ctx.stroke();
    }
    // Star glints riding the intersections home.
    ctx.fillStyle = st.spark;
    for (const [i, j] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]] as const) {
      const wink = 0.5 + 0.5 * Math.sin(c.now / 200 + i * 2.1 + j * 1.3);
      ctx.globalAlpha = fade * wink;
      ctx.beginPath();
      ctx.arc(c.px + i * R * 0.5, c.py + j * R * 0.5 * squash, Math.max(1, c.sc * 0.028), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- the_anvil

/**
 * THE_ANVIL — "the storm sets it down."
 * The flat-topped cloud descends over the mark through the fuse,
 * rain arriving ahead of it — then the strike: one bolt column,
 * and a PRESSURE SHELF instead of a round shockwave, a flat-topped
 * ridge that spreads with hard corners. Anvils do not ripple.
 */
const the_anvil: AbilitySig = {
  spawn(c) {
    // The strike earths as one TRUE discharge at the bolt's foot —
    // and nothing round with it: anvils do not ripple.
    storm.deployments.impact!(asMatter(c), c.wx, c.wy, { scale: 0.8 });
  },
  ground(c) {
    const { ctx, st, t, squash } = c;
    const fade = 1 - t;
    ctx.save();
    // The pressure shelf: a flat-topped ridge spreading with hard
    // corners — an anvil's echo, not a pond's.
    const R = c.rPx * (0.3 + Math.min(1, t * 1.6) * 0.75);
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, c.sc * 0.05 * fade);
    ctx.beginPath();
    for (let k = 0; k <= 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      const x = c.px + Math.cos(a) * R;
      const y = c.py + Math.sin(a) * R * squash;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // The bolt column, standing one breath after the strike.
    const col = Math.max(0, 1 - t * 2.8);
    if (col > 0) {
      const slice = Math.floor(c.now / 90);
      const jag = (k: number): number => {
        const v = Math.sin(slice * 127.1 + k * 311.7) * 43758.5453;
        return v - Math.floor(v);
      };
      ctx.globalAlpha = col;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(2, c.sc * 0.06 * col);
      ctx.beginPath();
      ctx.moveTo(c.px + (jag(1) - 0.5) * c.sc * 0.1, c.py - c.sc * 1.5);
      ctx.lineTo(c.px + (jag(2) - 0.5) * c.sc * 0.2, c.py - c.sc * 0.9);
      ctx.lineTo(c.px + (jag(3) - 0.5) * c.sc * 0.16, c.py - c.sc * 0.4);
      ctx.lineTo(c.px, c.py);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t } = c;
    // The anvil itself, seated over the mark and rising away as the
    // strike spends — flat top always level, rain under the lid.
    const lift = c.sc * (1.1 + t * 0.5);
    const cy = c.py - lift;
    const alpha = Math.min(1, (1 - t) * 2);
    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.roundRect(c.px - c.sc * 0.52, cy - c.sc * 0.16, c.sc * 1.04, c.sc * 0.17, c.sc * 0.04);
    ctx.fill();
    for (const [bx, br] of [[-0.28, 0.16], [0, 0.2], [0.28, 0.14]] as const) {
      ctx.beginPath();
      ctx.arc(c.px + bx * c.sc, cy + c.sc * 0.06, br * c.sc, 0, Math.PI * 2);
      ctx.fill();
    }
    // The lit lid — one sun, upper-left.
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1, c.sc * 0.03);
    ctx.beginPath();
    ctx.moveTo(c.px - c.sc * 0.5, cy - c.sc * 0.15);
    ctx.lineTo(c.px + c.sc * 0.5, cy - c.sc * 0.15);
    ctx.stroke();
    // Rain under the lid, beating the arrow down.
    const rand = srand(c.seed ^ 0x54);
    ctx.lineWidth = Math.max(1, c.sc * 0.02);
    ctx.strokeStyle = st.core;
    for (let k = 0; k < 4; k++) {
      const x = c.px + (rand() - 0.5) * c.sc * 0.9;
      const p = (t * 2 + k * 0.25) % 1;
      ctx.globalAlpha = alpha * (1 - p) * 0.5;
      const y = cy + c.sc * 0.25 + p * (lift - c.sc * 0.3);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - c.sc * 0.02, y + c.sc * 0.09);
      ctx.stroke();
    }
    ctx.restore();
  },
};

export const FLIGHTS_SIGS: Record<string, AbilitySig> = {
  wakewood,
  larkshot,
  glasshail,
  stormskip,
  charfall,
  hushfall,
  quarry_call,
  plucked_chord,
  nightweft,
  the_anvil,
};
