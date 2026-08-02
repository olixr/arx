/**
 * THE KEEPER'S TONGUE — bespoke signatures for the beastcraft arts.
 *
 * The school's words are workings, never blows, so every set-piece
 * here says CARE, CALL, or CALM: rings that close instead of burst,
 * feathers that settle instead of shrapnel that flies, and the one
 * russet howl whose wave is shared between two throats. All authoring
 * laws of fxSignatures.ts bind: hard edges, save/restore hygiene,
 * squash on ground ellipses, srand-seeded geometry, bounded ops.
 *
 * Several ids arrive on more than one wire kind (the capstone's ring
 * is 'howl' while its per-beast pips ride 'becalm') — hooks branch on
 * c.kind, the registry's designed dialect switch.
 *
 * FX v5 wave 3j: the keeper's tongue is workings, never blows, and
 * the audit honored it — ONE library voice (come_to_heel's honest
 * dust-up) and one true-physics upgrade (strewn_bait's grain lands
 * and settles). Breath, command-light, balm-herb, wild mist, the
 * russet pack-spirit, feathers, and the ghost pack stay the wild's
 * own: forcing fire or venom onto CARE would make the library lie.
 */

import { shade } from './rig.js';
import { srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { dust, asMatter } from './matter/index.js';

// ------------------------------------------------------------ shared

/**
 * A settling down-feather: a tiny curved barb that sways as it sinks.
 * The school's own debris — drawn, not particled, so its sway stays
 * deterministic per cast.
 */
function feather(
  c: SigCtx,
  x: number,
  y: number,
  s: number,
  sway: number,
  col: string,
  alpha: number,
): void {
  const { ctx } = c;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(1, c.sc * 0.025);
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5 + sway, y);
  ctx.quadraticCurveTo(x + sway * 0.4, y - s * 0.55, x + s * 0.5 + sway * 0.2, y - s * 0.15);
  ctx.stroke();
  // The quill's spine.
  ctx.beginPath();
  ctx.moveTo(x - s * 0.35 + sway, y - s * 0.05);
  ctx.lineTo(x + s * 0.35 + sway * 0.2, y - s * 0.18);
  ctx.stroke();
}

/**
 * A running beast ghost: the least body that still reads as a wild
 * four-legged thing at a glance — spine slab, head wedge, two leg
 * strokes whose scissor is driven by the run phase. The capstone's
 * ghost pack owns this silhouette; nothing else may borrow it.
 */
function ghostBeast(
  c: SigCtx,
  x: number,
  y: number,
  s: number,
  heading: number,
  phase: number,
  alpha: number,
): void {
  const { ctx, st } = c;
  const fx = Math.cos(heading) >= 0 ? 1 : -1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(fx, 1);
  ctx.globalAlpha = alpha;
  // Spine and haunch: one low slab, rump slightly high mid-stride.
  const lope = Math.sin(phase) * s * 0.08;
  ctx.fillStyle = st.mid;
  ctx.beginPath();
  ctx.moveTo(-s * 0.5, -s * 0.32 + lope);
  ctx.lineTo(s * 0.32, -s * 0.4 - lope * 0.5);
  ctx.lineTo(s * 0.48, -s * 0.18);
  ctx.lineTo(-s * 0.42, -s * 0.12 + lope * 0.6);
  ctx.closePath();
  ctx.fill();
  // The head wedge, thrown forward with the stride.
  ctx.beginPath();
  ctx.moveTo(s * 0.42, -s * 0.42 - lope * 0.4);
  ctx.lineTo(s * 0.72 + lope, -s * 0.3);
  ctx.lineTo(s * 0.4, -s * 0.2);
  ctx.closePath();
  ctx.fill();
  // Two scissoring leg strokes; the gallop is the whole animation.
  ctx.strokeStyle = st.mid;
  ctx.lineWidth = Math.max(1.5, s * 0.09);
  const kick = Math.sin(phase) * s * 0.3;
  ctx.beginPath();
  ctx.moveTo(-s * 0.32, -s * 0.14);
  ctx.lineTo(-s * 0.36 - kick, 0);
  ctx.moveTo(s * 0.26, -s * 0.16);
  ctx.lineTo(s * 0.3 + kick, 0);
  ctx.stroke();
  ctx.restore();
}

// --------------------------------------------------------- signatures

/**
 * SOOTHE THE WILD — "the lowered eyes."
 * Nothing bursts: a pale ring CLOSES onto the beast like a breath let
 * out, down-feathers sink and settle around it, and over its head a
 * bright eye-glint slowly shuts to a lid-line. Rank IV's spread rings
 * the neighbors with the same closing calm, a beat behind.
 */
const soothe_the_wild: AbilitySig = {
  spawn(c) {
    // The breath let out: soft sage puffs that sink, never rise.
    const rand = srand(c.seed ^ 0x61);
    for (let k = 0; k < 4; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * 0.35,
        c.wy + Math.sin(a) * 0.25 - 0.55,
        1,
        [c.st.mid, c.st.core],
        {
          speed: 0.25,
          life: 1.0,
          size: 0.11,
          gravity: 0.6,
          drag: 1.6,
          grow: 0.14,
          shape: 'puff',
          fade: c.st.deep,
          wobble: 0.3,
        },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    ctx.save();
    // The closing ring: wide at the first frame, settling to a snug
    // collar of calm around the feet — the reverse of every blast in
    // the game, which is the point.
    const close = 1 - Math.min(1, t / 0.6);
    const rr = sc * (0.55 + 1.3 * close);
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.055);
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.45 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1, sc * 0.03);
    ctx.beginPath();
    ctx.ellipse(px, py, rr * 0.82, rr * 0.82 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Rank IV: the calm spreads — a second, wider ring closes onto
    // the neighbors a beat behind the first.
    if (c.radius > 0) {
      const lag = Math.max(0, Math.min(1, (t - 0.15) / 0.6));
      const rr2 = c.rPx * (1.4 - 0.4 * lag);
      ctx.globalAlpha = 0.35 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(px, py, rr2, rr2 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, 1.1, 0.22 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0x62);
    ctx.save();
    // The eye going down: a bright glint over the head that narrows
    // to a closed lid-line and rests there.
    const lidY = py - sc * 1.05;
    const open = Math.max(0, 1 - t / 0.55);
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    ctx.globalAlpha = 0.85 * fade;
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.ellipse(px, lidY, sc * 0.11, Math.max(sc * 0.012, sc * 0.075 * open), 0, 0, Math.PI * 2);
    ctx.fill();
    // Two lash ticks droop as the lid settles.
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1, sc * 0.022);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(px + side * sc * 0.12, lidY);
      ctx.lineTo(px + side * sc * 0.17, lidY + sc * (0.02 + 0.05 * (1 - open)));
      ctx.stroke();
    }
    // Down-feathers sinking on their own clocks, swaying as they go.
    for (let k = 0; k < 3; k++) {
      const fall = (t * (0.7 + rand() * 0.5) + rand()) % 1;
      const fx0 = px + (rand() - 0.5) * sc * 1.3;
      const fy = py - sc * (1.1 - fall * 1.0);
      const sway = Math.sin(c.now / 300 + k * 2.1) * sc * 0.08;
      feather(c, fx0, fy, sc * 0.16, sway, k % 2 ? st.core : st.mid, (1 - fall) * 0.7 * fade);
    }
    ctx.restore();
  },
};

/**
 * COME TO HEEL — "the road folds shut."
 * A whistle note leaves the keeper as two quick rising rings; the
 * folded road hangs briefly as a stitched dashed lane from where the
 * friend was to where the keeper stands, chevrons all pointing home;
 * the arrival kicks a small honest dust-up.
 */
const come_to_heel: AbilitySig = {
  spawn(c) {
    // Arrival dust at the friend's landing: the "small honest
    // dust-up" the doc promises, kept as one TRUE breath of earth.
    dust.deployments.kick!(asMatter(c), c.wx2, c.wy2, { scale: 0.45 });
    // A fleck of bond-green joy in the dust.
    c.particles.burst(c.wx2, c.wy2 - 0.4, 3, [c.st.spark, c.st.core], {
      speed: 0.8,
      life: 0.5,
      size: 0.07,
      gravity: 1.2,
      shape: 'glint',
    });
  },
  ground(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const dx = px - px2;
    const dy = py - py2;
    const len = Math.hypot(dx, dy);
    if (len < sc * 0.4) return;
    const ux = dx / len;
    const uy = dy / len;
    const fade = 1 - t;
    ctx.save();
    // The folded road: a dashed lane that reels IN toward the keeper
    // as the fx lives — the distance visibly being un-walked.
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.setLineDash([sc * 0.14, sc * 0.1]);
    ctx.lineDashOffset = -c.age / 12;
    ctx.beginPath();
    ctx.moveTo(px2 + ux * len * t * 0.8, py2 + uy * len * t * 0.8);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.setLineDash([]);
    // Chevrons riding the lane, every one pointing home.
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.045);
    for (let k = 0; k < 3; k++) {
      const f = Math.min(1, ((t * 1.6 + k * 0.28) % 1) + t * 0.3);
      if (f >= 1) continue;
      const bx = px2 + dx * f;
      const by = py2 + dy * f;
      const s = sc * 0.13;
      ctx.globalAlpha = (1 - f) * 0.8 * fade;
      ctx.beginPath();
      ctx.moveTo(bx - ux * s - uy * s * 0.7, by - uy * s + ux * s * 0.7);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx - ux * s + uy * s * 0.7, by - uy * s - ux * s * 0.7);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    if (t > 0.45) return;
    const ft = 1 - t / 0.45;
    ctx.save();
    // The whistle: two thin rings leaving the keeper's mouth height,
    // the second chasing the first.
    for (let k = 0; k < 2; k++) {
      const born = k * 0.12;
      if (t < born) continue;
      const g = (t - born) / 0.33;
      ctx.globalAlpha = (1 - g) * 0.7 * ft;
      ctx.strokeStyle = k === 0 ? st.core : st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.03);
      ctx.beginPath();
      ctx.ellipse(
        px,
        py - sc * 1.15,
        sc * (0.08 + g * 0.3),
        sc * (0.06 + g * 0.22),
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
    ctx.restore();
  },
};

/**
 * POINT THE FANG — "the pointed dart."
 * The command is one amber dart snapping keeper-to-mark; the mark
 * wears a bared-teeth ring whose ticks all bite INWARD, and over its
 * head a fang chevron throbs. Rank IV's dare flashes a jagged outer
 * ring that names everyone standing too close.
 */
const point_the_fang: AbilitySig = {
  spawn(c) {
    const ang = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    // The dart: hot amber slivers streak the whole lane at once.
    c.particles.burst(c.wx, c.wy - 0.45, 6, [c.st.spark, c.st.mid], {
      speed: 4.2,
      life: 0.28,
      size: 0.07,
      gravity: 0.5,
      dir: ang,
      spread: 0.12,
      shape: 'streak',
    });
    // The mark flinches: a snap of sparks where the point lands.
    c.particles.burst(c.wx2, c.wy2 - 0.35, 4, [c.st.core, c.st.spark], {
      speed: 1.6,
      life: 0.3,
      size: 0.06,
      gravity: 2.2,
      shape: 'shard',
      spin: 8,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px2, py2 } = c;
    const fade = 1 - t;
    ctx.save();
    // The bared-teeth ring: ticks biting inward at the mark's feet —
    // the fang's promise drawn on the ground.
    const rr = sc * (0.62 + 0.06 * Math.sin(c.now / 110));
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(px2, py2, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = st.core;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + c.now / 900;
      const ox = px2 + Math.cos(a) * rr;
      const oy = py2 + Math.sin(a) * rr * squash;
      const ix = px2 + Math.cos(a) * rr * 0.68;
      const iy = py2 + Math.sin(a) * rr * 0.68 * squash;
      const w = sc * 0.045;
      ctx.globalAlpha = 0.85 * fade;
      ctx.beginPath();
      ctx.moveTo(ox - Math.sin(a) * w, oy + Math.cos(a) * w * squash);
      ctx.lineTo(ix, iy);
      ctx.lineTo(ox + Math.sin(a) * w, oy - Math.cos(a) * w * squash);
      ctx.closePath();
      ctx.fill();
    }
    // Rank IV: the dare — one jagged flash naming the bystanders.
    if (c.radius > 0 && t < 0.4) {
      const g = t / 0.4;
      const dr = c.rPx * (0.6 + 0.4 * g);
      ctx.globalAlpha = (1 - g) * 0.5;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      for (let k = 0; k <= 8; k++) {
        const a = (k / 8) * Math.PI * 2 + 0.4;
        const jr = dr * (k % 2 === 0 ? 1 : 0.88);
        const x = px2 + Math.cos(a) * jr;
        const y = py2 + Math.sin(a) * jr * squash;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px2, py2 } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const throb = 1 + 0.12 * Math.sin(c.now / 95);
    ctx.save();
    // The fang chevron: twin down-teeth hanging over the mark's head.
    ctx.globalAlpha = 0.9 * fade;
    const hy = py2 - sc * 1.15;
    for (const side of [-1, 1]) {
      const bx = px2 + side * sc * 0.09 * throb;
      ctx.fillStyle = side < 0 ? st.core : st.spark;
      ctx.beginPath();
      ctx.moveTo(bx - sc * 0.055, hy - sc * 0.16);
      ctx.lineTo(bx, hy + sc * 0.06 * throb);
      ctx.lineTo(bx + sc * 0.055, hy - sc * 0.16);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  },
};

/**
 * KEEPER'S BALM — "the thrown poultice."
 * The jar arcs as a green comet trailing crushed leaf, breaks over
 * the friend in a soft bloom, and the mending shows its work: a
 * leaf-spiral climbs the body while white cross-glints wink where
 * the hurt was.
 */
const keepers_balm: AbilitySig = {
  spawn(c) {
    const ang = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    // The lob: one heavy green gobbet with a leaf wake.
    c.particles.burst(c.wx, c.wy - 0.5, 1, [c.st.mid], {
      speed: 3.2,
      life: 0.42,
      size: 0.12,
      gravity: 4.5,
      dir: ang,
      spread: 0.05,
      trail: 10,
      trailColor: c.st.deep,
      up: false,
    });
    // The break: herb-wet droplets and leaf chips off the friend.
    c.particles.burst(c.wx2, c.wy2 - 0.4, 6, [c.st.mid, c.st.spark], {
      speed: 1.3,
      life: 0.55,
      size: 0.08,
      gravity: 3.5,
      shape: 'shard',
      spin: 7,
      fade: c.st.deep,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px2, py2 } = c;
    const rand = srand(c.seed ^ 0x71);
    const fade = 1 - t;
    ctx.save();
    // The herb-wet stain, spreading then drying edge-in.
    const spread = Math.min(1, t / 0.3);
    ctx.globalAlpha = 0.4 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px2, py2, sc * 0.5 * spread, sc * 0.5 * spread * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // Sprout ticks stand up around the rim as the balm takes.
    if (t > 0.2) {
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.03);
      for (let k = 0; k < 5; k++) {
        const a = rand() * Math.PI * 2;
        const grow = Math.min(1, (t - 0.2 - rand() * 0.2) / 0.3);
        if (grow <= 0) continue;
        const bx = px2 + Math.cos(a) * sc * 0.45;
        const by = py2 + Math.sin(a) * sc * 0.45 * squash;
        ctx.globalAlpha = 0.8 * fade * grow;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + (rand() - 0.5) * sc * 0.06, by - sc * 0.12 * grow);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px2, py2 } = c;
    const rand = srand(c.seed ^ 0x72);
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    ctx.save();
    // The leaf-spiral: five leaves climb the friend's body, each a
    // bent little blade riding its own turn of the helix.
    for (let k = 0; k < 5; k++) {
      const f = (t * 1.1 + k / 5) % 1;
      const a = f * Math.PI * 4 + k;
      const lx = px2 + Math.cos(a) * sc * 0.34 * (1 - f * 0.3);
      const ly = py2 - sc * (0.15 + f * 1.0);
      const s = sc * 0.09 * (1 - f * 0.4);
      ctx.globalAlpha = Math.sin(f * Math.PI) * 0.85 * fade;
      ctx.fillStyle = k % 2 ? st.mid : shade(st.mid, 14);
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(a * 0.5);
      ctx.beginPath();
      ctx.moveTo(-s, 0);
      ctx.quadraticCurveTo(0, -s * 0.9, s, 0);
      ctx.quadraticCurveTo(0, s * 0.35, -s, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // The mending winks: little white crosses where the hurt closes.
    for (let k = 0; k < 2; k++) {
      const wink = (t * 2 + rand()) % 1;
      if (wink > 0.4) continue;
      const wx = px2 + (rand() - 0.5) * sc * 0.5;
      const wy = py2 - sc * (0.3 + rand() * 0.6);
      const s = sc * 0.055 * (1 - wink / 0.4);
      ctx.globalAlpha = (1 - wink / 0.4) * fade;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(wx - s / 5, wy - s, (s * 2) / 5, s * 2);
      ctx.fillRect(wx - s, wy - s / 5, s * 2, (s * 2) / 5);
    }
    ctx.restore();
  },
};

/**
 * STREWN BAIT — "the laid table."
 * The cast is a sower's toss: grain fans from the hand and falls in
 * an honest arc, and where it lands a faint scent-ring breathes
 * outward so the reach of the table can be READ. The standing meal
 * itself is world furniture (summonItem paints it).
 */
const strewn_bait: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x81);
    // The toss: grain fans from the hand on TRUE arcs — the sower's
    // own seed with v5 physics (loft, land, SETTLE), so the meal
    // visibly lies where it was strewn. Bespoke matter; the wild's
    // table is not library dust.
    for (let k = 0; k < 8; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(c.wx, c.wy, 1, [c.st.mid, c.st.spark, c.st.deep], {
        speed: 0.9 + rand() * 1.1,
        life: 1.6,
        size: 0.055,
        gravity: 0,
        dir: a,
        spread: 0.3,
        shape: 'shard',
        spin: 6,
        z: 0.45, vz: 1.2 + rand() * 0.8, zg: 7, land: 'settle', layer: 'world',
        fade: c.st.deep, fadeAt: 0.7,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    if (c.radius <= 0) return;
    ctx.save();
    // The scent-ring: one slow breath outward, dashed like a thing
    // smelled rather than seen, then gone — the table's true reach.
    const g = Math.min(1, t / 0.7);
    const rr = c.rPx * (0.3 + 0.7 * g);
    ctx.globalAlpha = (1 - g) * 0.4;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    ctx.setLineDash([sc * 0.1, sc * 0.16]);
    ctx.lineDashOffset = -c.age / 30;
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  },
};

/**
 * THE QUIET WALK — "walking as the wild walks."
 * No flash at all: low mist banks settle around the walker, and a
 * circle of ghost paw prints blooms heel-first around their feet —
 * the wild's own gait laid over the keeper's, print by print.
 */
const the_quiet_walk: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x91);
    // Mist banks: pale green-grey, heavy, hugging the ground.
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * 0.6, c.wy + Math.sin(a) * 0.4, 1, [c.st.mid, c.st.deep], {
        speed: 0.3,
        life: 1.4,
        size: 0.16,
        gravity: 0.1,
        drag: 1.8,
        grow: 0.22,
        shape: 'puff',
        fade: c.st.deep,
        wobble: 0.3,
        ground: true,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0x92);
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    // Ghost paw prints: eight prints walking a circle around the
    // caster, appearing one by one, each a pad with three toe dots.
    const n = 8;
    for (let k = 0; k < n; k++) {
      const born = k / n;
      if (t < born * 0.6) continue;
      const age = Math.min(1, (t - born * 0.6) / 0.25);
      const a = born * Math.PI * 2 + (c.seed % 7) * 0.4;
      const rr = sc * (0.75 + rand() * 0.12);
      const bx = px + Math.cos(a) * rr;
      const by = py + Math.sin(a) * rr * squash;
      const s = sc * 0.075;
      ctx.globalAlpha = age * 0.55 * fade;
      ctx.fillStyle = k % 2 ? st.mid : st.core;
      // The pad.
      ctx.beginPath();
      ctx.ellipse(bx, by, s, s * 0.75, a + Math.PI / 2, 0, Math.PI * 2);
      ctx.fill();
      // Three toes, splayed along the walking direction.
      for (let j = -1; j <= 1; j++) {
        const ta = a + Math.PI / 2 + j * 0.5;
        ctx.beginPath();
        ctx.ellipse(
          bx + Math.cos(ta) * s * 1.5,
          by + Math.sin(ta) * s * 1.5 * squash,
          s * 0.32,
          s * 0.26,
          ta,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, 1.0, 0.12 * fade);
  },
};

/**
 * BLOOD OF THE PACK — "one howl, two throats."
 * The only loud word in the school: nested howl crescents leave BOTH
 * ends of the bond at once, a taut cord throbs heartbeat-thick
 * between keeper and friend, and russet wisps come off the friend's
 * shoulders while the blood is up.
 */
const blood_of_the_pack: AbilitySig = {
  spawn(c) {
    // Both throats: a russet spark burst at keeper AND friend.
    for (const [bx, by] of [
      [c.wx, c.wy],
      [c.wx2, c.wy2],
    ] as const) {
      c.particles.burst(bx, by - 0.55, 4, [c.st.spark, c.st.mid], {
        speed: 1.4,
        life: 0.45,
        size: 0.07,
        gravity: 1.2,
        shape: 'streak',
        up: true,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const fade = 1 - t;
    const beat = Math.abs(Math.sin(c.now / 140));
    ctx.save();
    // The pack cord: keeper to friend, throbbing on a heartbeat.
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * (0.035 + 0.045 * beat));
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px2, py2);
    ctx.stroke();
    ctx.globalAlpha = 0.7 * fade * beat;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1, sc * 0.02);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px2, py2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const fade = 1 - t;
    ctx.save();
    ctx.lineCap = 'butt';
    // The howl: three nested crescents rising from each throat, the
    // same word said twice — the shared blood made visible.
    for (const [bx, by] of [
      [px, py],
      [px2, py2],
    ] as const) {
      for (let k = 0; k < 3; k++) {
        const born = k * 0.09;
        if (t < born || t > born + 0.45) continue;
        const g = (t - born) / 0.45;
        const rr = sc * (0.18 + g * 0.55 + k * 0.06);
        ctx.globalAlpha = (1 - g) * (0.8 - k * 0.18) * fade;
        ctx.strokeStyle = k === 0 ? st.core : k === 1 ? st.spark : st.mid;
        ctx.lineWidth = Math.max(1.5, sc * (0.055 - k * 0.012));
        ctx.beginPath();
        ctx.ellipse(bx, by - sc * (1.0 + g * 0.5), rr, rr * squash * 0.8, 0, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      }
    }
    // Russet wisps off the friend's shoulders while the surge rides.
    if (Math.random() < c.frameDt * 14 * fade) {
      c.particles.burst(c.wx2, c.wy2 - 0.5, 1, [st.mid, st.deep], {
        speed: 0.5,
        life: 0.6,
        size: 0.08,
        gravity: -1.6,
        shape: 'lick',
        flicker: 0.3,
        fade: st.deep,
        wobble: 0.5,
      });
    }
    ctx.restore();
  },
};

/**
 * THE KEEPER'S CRY — "the cry that stands them up."
 * One horn-gold ray snaps from keeper to fallen friend; where it
 * lands the ground answers thump-thump — two heartbeat rings a beat
 * apart — and a column of breath-motes and feathers rises with the
 * body. Care, at the top of the keeper's voice.
 */
const the_keepers_cry: AbilitySig = {
  spawn(c) {
    // The breath returns: a rising column at the friend.
    c.particles.burst(c.wx2, c.wy2 - 0.2, 6, [c.st.core, c.st.spark, c.st.mid], {
      speed: 1.1,
      life: 0.8,
      size: 0.08,
      gravity: -2.6,
      up: true,
      drag: 1.1,
      shape: 'glint',
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px2, py2 } = c;
    ctx.save();
    // Thump... thump: two rings a heartbeat apart, both from the
    // friend's own chest-point on the ground.
    for (let k = 0; k < 2; k++) {
      const born = k * 0.22;
      if (t < born || t > born + 0.4) continue;
      const g = (t - born) / 0.4;
      const rr = sc * (0.2 + g * 0.85);
      ctx.globalAlpha = (1 - g) * 0.7;
      ctx.strokeStyle = k === 0 ? st.core : st.mid;
      ctx.lineWidth = Math.max(2, sc * 0.06 * (1 - g) + 1);
      ctx.beginPath();
      ctx.ellipse(px2, py2, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx2, c.wy2, 1.2, 0.35 * (1 - t));
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    ctx.save();
    // The cry itself: one bright ray, gone almost at once — a voice,
    // not a beam weapon.
    if (t < 0.18) {
      const ft = 1 - t / 0.18;
      ctx.globalAlpha = ft * 0.9;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2, sc * 0.07 * ft);
      ctx.beginPath();
      ctx.moveTo(px, py - sc * 1.1);
      ctx.lineTo(px2, py2 - sc * 0.4);
      ctx.stroke();
      ctx.globalAlpha = ft * 0.5;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(4, sc * 0.14 * ft);
      ctx.beginPath();
      ctx.moveTo(px, py - sc * 1.1);
      ctx.lineTo(px2, py2 - sc * 0.4);
      ctx.stroke();
    }
    // The standing halo: a brief arc over the risen friend, late —
    // it appears as the body finds its feet.
    if (t > 0.3 && t < 0.85) {
      const g = (t - 0.3) / 0.55;
      ctx.globalAlpha = Math.sin(g * Math.PI) * 0.8;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(px2, py2 - sc * (0.9 + g * 0.3), sc * 0.3, sc * 0.12, 0, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    // Feathers keep settling where the fall was, forgiven.
    const rand = srand(c.seed ^ 0xa1);
    for (let k = 0; k < 2; k++) {
      const fall = (t * 0.9 + rand()) % 1;
      const fx0 = px2 + (rand() - 0.5) * sc * 0.8;
      const fy = py2 - sc * (1.2 - fall * 1.1);
      const sway = Math.sin(c.now / 280 + k * 2.4) * sc * 0.07;
      feather(c, fx0, fy, sc * 0.14, sway, k % 2 ? st.core : st.spark, (1 - fall) * 0.6);
    }
    ctx.restore();
  },
};

/**
 * VOICE OF THE WILD — "the whole tongue at once."
 * The capstone: three staggered rings roll out wearing soft crown
 * points — a word with weight enough to still a field — while grass
 * and leaf rise inside the circle. At rank IV the wire's long hold
 * (ticks >= 300) calls THE GHOST PACK: three spectral beasts run the
 * rim, the wild itself answering the name it was called by.
 * The same id rides the per-beast 'becalm' pips as a tiny bowed-head
 * arc — the stilled ones, counted one by one.
 */
const voice_of_the_wild: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'howl') return;
    const rand = srand(c.seed ^ 0xb1);
    // The in-breath: leaf and grass chips pulled up inside the ring.
    for (let k = 0; k < 7; k++) {
      const a = rand() * Math.PI * 2;
      const rr = c.radius * (0.25 + rand() * 0.6);
      c.particles.burst(c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr * c.squash, 1, [c.st.mid, c.st.spark], {
        speed: 0.7,
        life: 0.9,
        size: 0.08,
        gravity: -2.2,
        drag: 1.2,
        shape: 'shard',
        spin: 5,
        fade: c.st.deep,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    if (c.kind === 'becalm') {
      // The stilled one: a single soft ring closing on the hearer.
      const close = 1 - Math.min(1, t / 0.5);
      const rr = sc * (0.4 + 0.5 * close);
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.5;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.save();
    // Three rings, each a breath behind the last, each wearing five
    // soft crown points — the capstone's own regalia, in living green.
    for (let k = 0; k < 3; k++) {
      const born = k * 0.14;
      if (t < born) continue;
      const g = Math.min(1, (t - born) / (1 - born));
      const rr = rPx * Math.sqrt(g);
      const fade = (1 - g) * (0.7 - k * 0.15);
      if (fade <= 0.02 || rr < 2) continue;
      ctx.globalAlpha = fade;
      ctx.strokeStyle = k === 0 ? st.core : k === 1 ? st.mid : shade(st.mid, -12);
      ctx.lineWidth = Math.max(1.5, sc * (0.06 - k * 0.015));
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      // The crown points ride the newest ring only.
      if (k === 0) {
        ctx.fillStyle = st.core;
        for (let j = 0; j < 5; j++) {
          const a = (j / 5) * Math.PI * 2 + t * 0.8;
          const bx = px + Math.cos(a) * rr;
          const by = py + Math.sin(a) * rr * squash;
          const s = sc * 0.07 * (1 - g);
          ctx.globalAlpha = fade;
          ctx.beginPath();
          ctx.moveTo(bx - s, by);
          ctx.lineTo(bx, by - s * 1.8);
          ctx.lineTo(bx + s, by);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.3 * (1 - t));
  },
  air(c) {
    const { ctx, t, sc, squash, px, py, rPx } = c;
    if (c.kind !== 'howl') return;
    ctx.save();
    // THE GHOST PACK (rank IV, read from the wire's long hold): three
    // spectral runners lap the rim, each on its own arc and stride.
    const packCalled = (c.ticks ?? 0) >= 300;
    if (packCalled && t > 0.12) {
      const fade = t < 0.75 ? Math.min(1, (t - 0.12) / 0.2) : (1 - t) / 0.25;
      for (let k = 0; k < 3; k++) {
        const a = -c.now / 900 + (k * Math.PI * 2) / 3;
        const rr = rPx * 0.92;
        const bx = px + Math.cos(a) * rr;
        const by = py + Math.sin(a) * rr * squash;
        const heading = a - Math.PI / 2;
        ghostBeast(c, bx, by - sc * 0.2, sc * (0.5 + k * 0.06), heading, c.now / 90 + k * 2.1, 0.4 * fade);
      }
    } else if (t < 0.5) {
      // Below the rank IV hold: rising grass-breath inside the ring.
      if (Math.random() < c.frameDt * 10) {
        const a = Math.random() * Math.PI * 2;
        const rr = Math.sqrt(Math.random()) * c.radius * 0.8;
        c.particles.burst(c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr * c.squash, 1, [c.st.mid, c.st.spark], {
          speed: 0.3,
          life: 0.7,
          size: 0.07,
          gravity: -1.4,
          shape: 'lick',
          fade: c.st.deep,
          wobble: 0.4,
        });
      }
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- registry

export const BEASTCRAFT_SIGS: Record<string, AbilitySig> = {
  soothe_the_wild,
  come_to_heel,
  point_the_fang,
  keepers_balm,
  strewn_bait,
  the_quiet_walk,
  blood_of_the_pack,
  the_keepers_cry,
  voice_of_the_wild,
};
