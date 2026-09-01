/**
 * THE FORMLESS — the ooze family and the snake.
 * Split out of rig.ts on the golems.ts template (foundations F3.4);
 * rig.ts re-exports everything here, so every lab, test and painter
 * keeps its old door.
 */
import { chamferRect, facetBlob, facetCircle } from './shapes.js';
import { shade } from './tint.js';
// The engine's shared grammar comes back from rig.ts — the same
// deferred cycle golems.ts has always ridden (touched only at draw
// time, long after both modules initialize).
import { OUTLINE, oozeStrike } from './rig.js';

/**
 * THE OOZE FAMILY (docs/ooze-family-plan.md) — THE SLIME SHAPE LAW,
 * final form (user verdict 2026-08-15, round three): the family owns
 * exactly TWO silhouettes — the HOPPER (the chamfered gel block that
 * carries the whole brand) and the CUBE (the corridor prism). Every
 * other body plan is dead. Variety lives in the DRESS: bespoke
 * material dressings on the hopper — verdant gel, stone-gray grit,
 * frost rime and shards, dripping tar — never a naked palette swap.
 * And A SLIME ATTACKS WITH ITS BODY: the strike is a crouch, a leap,
 * and a flat-out landing slam — no pseudopods, no punches, ever.
 */
export type OozePlan = 'hopper' | 'cube';
/** The material a hopper is made of — each dress is its own kit of
 *  inclusions, sheen, and weather, painted bespoke inside the gel. */
export type OozeDress = 'verdant' | 'stone' | 'frost' | 'tar';
export interface OozeLook {
  plan: OozePlan;
  /** Landmark hoppers carry swallowed pebbles and a second gloss. */
  giant: boolean;
  dress: OozeDress;
}
export const OOZE_LOOKS: Record<string, OozeLook> = {
  slime: { plan: 'hopper', giant: false, dress: 'verdant' },
  slime_small: { plan: 'hopper', giant: false, dress: 'verdant' },
  giant_slime: { plan: 'hopper', giant: true, dress: 'verdant' },
  gray_ooze: { plan: 'hopper', giant: false, dress: 'stone' },
  frost_slime: { plan: 'hopper', giant: false, dress: 'frost' },
  tar_slime: { plan: 'hopper', giant: false, dress: 'tar' },
  gelatinous_cube: { plan: 'cube', giant: true, dress: 'verdant' },
};
/** The family register, painter-side: routing + the no-corpse law. */
export function oozeLook(defId: string): OozeLook | undefined {
  return OOZE_LOOKS[defId];
}
export interface OozeOpts {
  x: number;
  y: number;
  s: number;
  dir: number;
  radius: number;
  color: string;
  hurt: boolean;
  walkPhase: number;
  nowMs: number;
  seed: number;
  /** 0..1 how much the body is actually travelling — stills the cycle. */
  moveK: number;
  attackT?: number;
  ys: number;
}
/**
 * Sprite-cache extents in TILES — the hopper buys HEADROOM for the
 * strike leap (a body cropped mid-jump is the cache's oldest sin),
 * the cube buys room for its surge.
 */
export function oozeExtents(
  look: OozeLook,
  radius: number,
): { halfW: number; top: number; bottom: number } {
  if (look.plan === 'cube') {
    return { halfW: radius * 1.6 + 0.5, top: radius * 2.5 + 0.3, bottom: 0.45 };
  }
  return { halfW: radius * 2.2 + 0.35, top: radius * 3.0 + 0.85, bottom: 0.4 };
}
/** One ooze, routed by its body plan. */
export function drawOoze(ctx: CanvasRenderingContext2D, look: OozeLook, o: OozeOpts): void {
  if (look.plan === 'cube') drawOozeCube(ctx, o);
  else drawOozeHopper(ctx, o, look);
}
export const OOZE_INK = 'rgba(26, 20, 36, 0.4)';
/**
 * THE HOPPER: the brand — a gel block in the wall-prism dialect that
 * squashes on landing, stretches mid-hop, breathes at rest, and RINGS
 * a damped beat just after touchdown. THE JUMP-SLAM is the only
 * strike a slime knows: crouch low and wide, LEAP (the server's
 * pounce carries the ground, the painter carries the air), and come
 * down FLAT on what it hit. The dress is the variant: verdant gel,
 * stone grit, frost rime, falling tar — each painted bespoke inside
 * the mass, and the giant carries its swallowed history on top.
 */
export function drawOozeHopper(ctx: CanvasRenderingContext2D, o: OozeOpts, look: OozeLook): void {
  const s = o.s;
  const t = o.nowMs * 0.001;
  const giant = look.giant;
  const dress = look.dress;
  const fx = Math.cos(o.dir);
  const fy = Math.sin(o.dir);
  const px = -fy;
  const py = fx;
  const w = o.radius * 2.1 * s;
  const h = o.radius * 1.7 * s;
  const hsh = (o.seed * 2654435761) >>> 8;

  // Hop cycle from travelled distance; landing squash → launch stretch.
  const hp = (o.walkPhase * 1.35) % 1;
  const lift = Math.max(0, Math.sin(Math.PI * hp)) * 0.2 * s * o.moveK;
  let sqy = 1 + (Math.sin(Math.PI * 2 * hp) * 0.14 - 0.02) * o.moveK;
  // The landing rings: a damped jiggle dies out as the next hop loads.
  sqy += Math.sin(hp * 26) * Math.exp(-hp * 9) * 0.05 * o.moveK;
  // Idle breathing: the mass never quite holds still. A landmark body
  // breathes SLOWER — bulk reads in the clock, not just the box.
  sqy += Math.sin(o.nowMs * (giant ? 0.0021 : 0.0032) + o.seed) * 0.045 * (1 - o.moveK);
  let sqx = 2 - sqy; // area-preserving squash

  // THE JUMP-SLAM: crouch (0..0.4), leap (0.4..0.78), slam (0.78..1).
  // One analytic curve — no pseudopods, no punches: the body IS the
  // weapon, and the landing is the hit.
  const at = o.attackT ?? 0;
  let bx = o.x;
  let by = o.y - lift;
  if (at > 0) {
    if (at < 0.4) {
      // The crouch loads: low, wide, unmistakable.
      const k = at / 0.4;
      sqx += k * 0.3;
      sqy -= k * 0.24;
    } else if (at < 0.78) {
      // The leap: airborne stretch along the arc's rise and fall —
      // taller, but still unmistakably the block (over-narrowing
      // reads as a pill, and a slime is never a pill).
      const k = (at - 0.4) / 0.38;
      const arc = Math.sin(Math.PI * k);
      by -= arc * (0.5 + o.radius * 0.6) * s;
      sqy += arc * 0.24;
      sqx -= arc * 0.18;
      bx += fx * k * 0.16 * s;
      by += fy * k * 0.05 * s;
    } else {
      // The slam: flat-out on impact, then the gel remembers its shape.
      const k = Math.min(1, (at - 0.78) / 0.22);
      const imp = Math.sin(Math.PI * k);
      sqy -= imp * 0.32;
      sqx += imp * 0.38;
    }
  }

  const bw = w * sqx;
  const bh = h * sqy;
  const cut = bw * 0.24;
  const bodyPath = (): void => {
    ctx.beginPath();
    chamferRect(ctx, bx - bw / 2, by - bh, bw, bh, [cut, cut, cut * 0.55, cut * 0.55]);
  };

  // Gel mass, then flat bands clipped inside it: dark contact base,
  // lit top slab — the block read with zero gradients.
  ctx.fillStyle = o.hurt ? '#ffffff' : o.color;
  bodyPath();
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    bodyPath();
    ctx.clip();
    ctx.fillStyle = shade(o.color, -16);
    ctx.fillRect(bx - bw / 2, by - bh * 0.24, bw, bh * 0.24);
    ctx.fillStyle = 'rgba(255, 244, 220, 0.17)';
    ctx.fillRect(bx - bw / 2, by - bh, bw, bh * 0.3);
    const drift = Math.sin(o.nowMs * 0.00045 + o.seed) * bh * 0.02;
    // The nucleus: a darker core low in the body, seeded off-center.
    // (Tar skips it — a dark heart in a near-black body is nothing.)
    if (dress !== 'tar') {
      ctx.fillStyle = shade(o.color, -30);
      ctx.beginPath();
      facetBlob(
        ctx,
        bx + ((o.seed % 7) - 3) * bw * 0.016,
        by - bh * 0.38,
        bw * 0.19,
        o.seed,
        7,
        0.85,
      );
      ctx.fill();
    }
    if (giant) {
      // Swallowed history, riding the mass: three dark pebbles and a
      // pale bone chip, each at its own seeded station, all drifting
      // on a slow internal current — suspended, never pinned.
      ctx.fillStyle = shade(o.color, -42);
      for (let k = 0; k < 3; k++) {
        const kx = bx + (((hsh >> (k * 4)) & 15) / 15 - 0.5) * bw * 0.52;
        const ky = by - bh * (0.2 + (((hsh >> (k * 4 + 2)) & 7) / 7) * 0.32) + drift * (k % 2 === 0 ? 1 : -1);
        ctx.beginPath();
        facetCircle(ctx, kx, ky, bw * (0.035 + ((hsh >> k) & 3) * 0.008), 5, k * 1.3);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(216, 210, 192, 0.6)';
      ctx.save();
      ctx.translate(bx + bw * 0.14, by - bh * 0.55 - drift);
      ctx.rotate(0.6 + ((hsh & 7) / 7) * 0.5);
      ctx.fillRect(-bw * 0.09, -bh * 0.02, bw * 0.18, bh * 0.045);
      ctx.restore();
    }
    switch (dress) {
      case 'stone': {
        // Swallowed grit the gel never digested: angular chips hanging
        // mid-mass, denser than the giant's pebbles and duller — the
        // gray eats gravel and shines like wet slate, not like sap.
        ctx.fillStyle = shade(o.color, -34);
        for (let k = 0; k < 4; k++) {
          const kx = bx + (((hsh >> (k * 3)) & 15) / 15 - 0.5) * bw * 0.5;
          const ky = by - bh * (0.22 + (((hsh >> (k * 3 + 2)) & 7) / 7) * 0.36) + drift * (k % 2 === 0 ? 1 : -1);
          ctx.beginPath();
          facetCircle(ctx, kx, ky, bw * (0.028 + ((hsh >> k) & 3) * 0.007), 5, k * 1.9);
          ctx.fill();
        }
        ctx.fillStyle = shade(o.color, 18);
        ctx.fillRect(bx - bw * 0.3, by - bh * 0.82, bw * 0.13, bh * 0.1);
        break;
      }
      case 'frost': {
        // Suspended ice: pale slivers adrift in the chill, and a rime
        // crust riding the crown — winter kept in a jar.
        ctx.fillStyle = 'rgba(234, 246, 252, 0.7)';
        for (let k = 0; k < 3; k++) {
          ctx.save();
          ctx.translate(
            bx + (((hsh >> (k * 4)) & 15) / 15 - 0.5) * bw * 0.5,
            by - bh * (0.3 + (((hsh >> (k * 3 + 1)) & 7) / 7) * 0.34) + drift * (k % 2 === 0 ? 1 : -1),
          );
          ctx.rotate(((hsh >> (k * 5)) & 31) / 31 * Math.PI);
          ctx.fillRect(-bw * 0.055, -bh * 0.011, bw * 0.11, bh * 0.022);
          ctx.restore();
        }
        ctx.fillStyle = 'rgba(240, 250, 255, 0.5)';
        ctx.fillRect(bx - bw / 2, by - bh, bw, bh * 0.07);
        ctx.fillStyle = shade(o.color, 30);
        ctx.fillRect(bx - bw * 0.3, by - bh * 0.82, bw * 0.13, bh * 0.1);
        break;
      }
      case 'tar': {
        // The tar keeps falling off itself: beads run the face on
        // their own slow clocks and the ground drinks them — and the
        // only light it gives back is two hard chips (the shine IS
        // the material on a body this dark).
        ctx.fillStyle = shade(o.color, 34);
        for (let k = 0; k < 2; k++) {
          const dxr = (k === 0 ? -1 : 1) * bw * (0.16 + (((hsh >> (k * 3)) & 7) / 7) * 0.14);
          const startY = by - bh * (0.6 + (((hsh >> (k * 4)) & 7) / 7) * 0.2);
          const clock = (t * 0.5 + ((hsh >> (k * 5)) & 31) / 31) % 1;
          if (clock < 0.8) {
            const fall = clock * clock * (by - startY);
            ctx.beginPath();
            facetCircle(ctx, bx + dxr, startY + fall, bw * 0.03 * (1 - clock * 0.35), 5, k);
            ctx.fill();
          } else {
            const kk = (clock - 0.8) / 0.2;
            ctx.beginPath();
            facetCircle(ctx, bx + dxr, by - bh * 0.02, bw * 0.045 * (1 - kk), 5, k, 0.4);
            ctx.fill();
          }
        }
        ctx.fillStyle = shade(o.color, 72);
        ctx.fillRect(bx - bw * 0.32, by - bh * 0.8, bw * 0.11, bh * 0.08);
        ctx.fillRect(bx + bw * 0.14, by - bh * 0.6, bw * 0.05, bh * 0.11);
        break;
      }
      default: {
        // One flat gloss chip high on the lit corner (two on the
        // giant — a bigger dome catches the light twice).
        ctx.fillStyle = shade(o.color, 30);
        ctx.fillRect(bx - bw * 0.3, by - bh * 0.82, bw * 0.13, bh * 0.1);
        if (giant) ctx.fillRect(bx + bw * 0.18, by - bh * 0.88, bw * 0.08, bh * 0.07);
      }
    }
    ctx.restore();
  }
  // Eyes track the facing; none on the back of the mass. On tar the
  // ink eyes would drown — the eyes go pale instead.
  if (fy > -0.45) {
    ctx.fillStyle = dress === 'tar' ? '#cfc9dc' : OUTLINE;
    for (const es of [-1, 1]) {
      const eex = bx + fx * bw * 0.15 + es * px * bw * 0.19;
      const eey = by - bh * 0.62 + (fy * bh * 0.1 + es * py * bw * 0.19) * o.ys;
      ctx.fillRect(eex - bw * 0.035, eey - bh * 0.07, bw * 0.07, bh * 0.14);
    }
  }
  ctx.strokeStyle = OOZE_INK;
  ctx.lineWidth = 1;
  bodyPath();
  ctx.stroke();
}
/**
 * THE CUBE (gelatinous): the corridor made flesh. A translucent
 * chamfered prism — the ground reads THROUGH the gel — wearing the
 * 2.5D top-plane law (lit top slab, shaded far edge, bright front
 * arris), with everything it ever engulfed suspended inside at its
 * own depth: bones, a sword, coins. The debris IS the loot table,
 * told honestly, and it floats on a current too slow to watch. The
 * strike is a SURGE: the whole prism shoves forward — a wall deciding
 * to include you.
 */
export function drawOozeCube(ctx: CanvasRenderingContext2D, o: OozeOpts): void {
  const s = o.s;
  const t = o.nowMs * 0.001;
  const { gath, spr } = oozeStrike(o.attackT ?? 0);
  const fx = Math.cos(o.dir);
  const fy = Math.sin(o.dir);
  const hsh = (o.seed * 2654435761) >>> 8;

  // The slide breath: far slower than a hopper — a mass this size has
  // one gear. The surge shoves the whole prism along the facing.
  const breath = 1 + Math.sin(t * 1.5 + o.seed) * 0.025 + Math.sin(o.walkPhase * Math.PI * 2) * 0.02 * o.moveK;
  const cx = o.x + fx * (spr * 0.38 - gath * 0.1) * s;
  const cy = o.y + fy * (spr * 0.38 - gath * 0.1) * s * o.ys;
  const W = o.radius * 2.0 * s * (1 + gath * 0.06 + spr * 0.05);
  const frontH = o.radius * 1.7 * s * breath * (1 - gath * 0.08);
  const topD = W * 0.34 * o.ys;
  const cut = W * 0.055;
  const body = o.hurt ? '#ffffff' : o.color;

  const frontPath = (): void => {
    ctx.beginPath();
    chamferRect(ctx, cx - W / 2, cy - frontH, W, frontH, [0, 0, cut, cut]);
  };
  const topPath = (): void => {
    ctx.beginPath();
    chamferRect(ctx, cx - W / 2, cy - frontH - topD, W, topD, [cut, cut, 0, 0]);
  };

  if (o.hurt) {
    ctx.fillStyle = body;
    frontPath();
    ctx.fill();
    topPath();
    ctx.fill();
  } else {
    // The gel: translucent — the dungeon floor reads through it.
    ctx.save();
    ctx.globalAlpha = 0.58;
    ctx.fillStyle = o.color;
    frontPath();
    ctx.fill();
    ctx.restore();

    // The swallowed: each item at its own seeded station and DEPTH —
    // deeper is dimmer and smaller (the parallax read) — bobbing on
    // a current too slow to watch. Bones, a sword, coins: the loot
    // table, suspended.
    ctx.save();
    frontPath();
    ctx.clip();
    const station = (k: number): { x: number; y: number; d: number } => ({
      x: cx + (((hsh >> (k * 3)) & 15) / 15 - 0.5) * W * 0.66,
      y:
        cy -
        frontH * (0.22 + (((hsh >> (k * 3 + 2)) & 15) / 15) * 0.58) +
        Math.sin(t * 0.45 + k * 1.9) * frontH * 0.014,
      d: ((hsh >> (k * 2 + 1)) & 3) / 3,
    });
    // The skull: a pale chamfered block with two dark sockets.
    {
      const p = station(1);
      ctx.globalAlpha = 0.78 - p.d * 0.3;
      const r = W * (0.11 - p.d * 0.025);
      ctx.fillStyle = '#ddd6c4';
      ctx.beginPath();
      chamferRect(ctx, p.x - r, p.y - r * 0.9, r * 2, r * 1.6, r * 0.5);
      ctx.fill();
      ctx.fillStyle = 'rgba(40, 32, 48, 0.85)';
      ctx.fillRect(p.x - r * 0.55, p.y - r * 0.35, r * 0.4, r * 0.45);
      ctx.fillRect(p.x + r * 0.15, p.y - r * 0.35, r * 0.4, r * 0.45);
    }
    // Two rib sticks at seeded angles.
    ctx.fillStyle = '#d2cab6';
    for (let k = 0; k < 2; k++) {
      const p = station(3 + k);
      ctx.globalAlpha = 0.7 - p.d * 0.3;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(((hsh >> (k * 7)) & 31) / 31 * Math.PI);
      ctx.fillRect(-W * 0.09, -W * 0.012, W * 0.18, W * 0.024);
      ctx.restore();
    }
    // The sword: blade down-angled, guard and grip — somebody's whole
    // last stand, kept.
    {
      const p = station(6);
      ctx.globalAlpha = 0.82 - p.d * 0.3;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(0.5 + ((hsh >> 9) & 7) / 7 * 0.6);
      ctx.fillStyle = '#9aa1ad';
      ctx.fillRect(-W * 0.014, -W * 0.16, W * 0.028, W * 0.24);
      ctx.fillStyle = '#5c4a32';
      ctx.fillRect(-W * 0.05, -W * 0.19, W * 0.1, W * 0.03);
      ctx.fillRect(-W * 0.014, -W * 0.25, W * 0.028, W * 0.06);
      ctx.restore();
    }
    // Coins: a scatter of small bright discs, deepest of all.
    ctx.fillStyle = '#e8c25a';
    for (let k = 0; k < 4; k++) {
      const p = station(8 + k);
      ctx.globalAlpha = 0.6 - p.d * 0.25;
      ctx.beginPath();
      facetCircle(ctx, p.x, p.y + frontH * 0.16, W * 0.028, 6, k * 1.1, 0.7);
      ctx.fill();
    }
    // The gel between the swallowed and the eye: one pale glaze, and
    // a few suspended air beads rising slower than the patience of
    // anything watching.
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(232, 248, 244, 0.1)';
    frontPath();
    ctx.fill();
    ctx.fillStyle = 'rgba(240, 252, 250, 0.35)';
    for (let k = 0; k < 3; k++) {
      const bx = cx + (((hsh >> (k * 5 + 2)) & 15) / 15 - 0.5) * W * 0.7;
      const clock = (t * 0.09 + ((hsh >> (k * 4)) & 15) / 15) % 1;
      ctx.beginPath();
      facetCircle(ctx, bx, cy - frontH * (0.1 + clock * 0.8), W * 0.014, 5, k);
      ctx.fill();
    }
    ctx.restore();

    // The top plane: the 2.5D law — lit slab, shaded far edge.
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = shade(o.color, 18);
    topPath();
    ctx.fill();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = shade(o.color, -8);
    ctx.fillRect(cx - W / 2 + cut, cy - frontH - topD, W - cut * 2, topD * 0.22);
    ctx.restore();

    // The arrises: a prism is its edges. Bright front-top edge, faint
    // bright verticals — the crisp geometry against the soft world.
    ctx.strokeStyle = shade(o.color, 46);
    ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.beginPath();
    ctx.moveTo(cx - W / 2 + cut * 0.5, cy - frontH);
    ctx.lineTo(cx + W / 2 - cut * 0.5, cy - frontH);
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx - W / 2, cy - frontH);
    ctx.lineTo(cx - W / 2, cy - cut);
    ctx.moveTo(cx + W / 2, cy - frontH);
    ctx.lineTo(cx + W / 2, cy - cut);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // One outline around the whole standing silhouette.
  ctx.strokeStyle = OOZE_INK;
  ctx.lineWidth = 1;
  ctx.beginPath();
  chamferRect(ctx, cx - W / 2, cy - frontH - topD, W, frontH + topD, [cut, cut, cut, cut]);
  ctx.stroke();
}
/**
 * THE TRAIL DAB: one glisten print on the ground an ooze crossed —
 * painted by the renderer's shadow pass so every body walks OVER the
 * wet. A flattened seeded facet, never a stamped circle.
 */
export function drawOozeTrailDab(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  seed: number,
  color: string,
  alpha: number,
): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  facetBlob(ctx, x, y, r, seed, 7, 0.42, ((seed >> 3) & 7) * 0.8);
  ctx.fill();
  ctx.globalAlpha = 1;
}
/**
 * The giant adder: a slithering tapered ribbon — the body is a sampled
 * S-wave behind the head, diamond-patterned down the spine, with a
 * raised viper head that strikes along the facing.
 */
export function drawSnake(
  ctx: CanvasRenderingContext2D,
  o: {
    x: number;
    y: number;
    s: number;
    dir: number;
    radius: number;
    color: string;
    hurt: boolean;
    walkPhase: number;
    nowMs: number;
    seed: number;
    moveK: number;
    attackT?: number;
    ys: number;
  },
): void {
  const s = o.s;
  const fx = Math.cos(o.dir);
  const fy = Math.sin(o.dir);
  const px = -fy;
  const py = fx;
  const at = o.attackT ?? 0;
  const body = o.hurt ? '#ffffff' : o.color;

  // Strike: the head and fore-body pull back, then whip forward.
  let strike = 0;
  if (at > 0) {
    strike = at < 0.7 ? -0.08 * (at / 0.7) : 0.3 * Math.sin(Math.PI * Math.min(1, (at - 0.7) / 0.3));
  }

  const LEN = 1.3; // tiles of body behind the head
  const N = 12;
  const amp = s * (0.05 + 0.07 * o.moveK);
  const phase = o.walkPhase * Math.PI * 2 * 1.15 + Math.sin(o.nowMs * 0.0008 + o.seed) * 0.6 * (1 - o.moveK);
  const pts: Array<{ x: number; y: number; w: number }> = [];
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    const d = t * LEN * s;
    // The head holds its line; the wave grows behind the neck.
    const lat = Math.sin(phase - t * 5.2) * amp * Math.min(1, t * 3);
    // Fore-body rides the strike; rear stays planted.
    const lunge = strike * Math.max(0, 1 - t * 2.4) * s;
    const rise = Math.max(0, 0.22 - t) / 0.22 * (0.1 + at * 0.06) * s;
    pts.push({
      x: o.x - fx * d + px * lat + fx * lunge,
      y: o.y - (fy * d - py * lat - fy * lunge) * o.ys - rise,
      w: s * (0.055 * Math.sin(Math.PI * Math.pow(Math.min(1, t * 1.12), 0.7)) + 0.014 * (1 - t) + 0.004),
    });
  }
  // Ribbon body: perpendicular offsets per sample, one closed fill.
  ctx.fillStyle = body;
  ctx.beginPath();
  for (let k = 0; k <= N; k++) {
    const a = pts[Math.max(0, k - 1)]!;
    const b = pts[Math.min(N, k + 1)]!;
    const dl = Math.hypot(b.x - a.x, b.y - a.y) || 1e-4;
    const nx = -(b.y - a.y) / dl;
    const ny = (b.x - a.x) / dl;
    const p = pts[k]!;
    if (k === 0) ctx.moveTo(p.x + nx * p.w, p.y + ny * p.w);
    else ctx.lineTo(p.x + nx * p.w, p.y + ny * p.w);
  }
  for (let k = N; k >= 0; k--) {
    const a = pts[Math.max(0, k - 1)]!;
    const b = pts[Math.min(N, k + 1)]!;
    const dl = Math.hypot(b.x - a.x, b.y - a.y) || 1e-4;
    const nx = -(b.y - a.y) / dl;
    const ny = (b.x - a.x) / dl;
    const p = pts[k]!;
    ctx.lineTo(p.x - nx * p.w, p.y - ny * p.w);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(26, 20, 36, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Dorsal diamonds march the spine — the adder's zigzag.
  if (!o.hurt) {
    ctx.fillStyle = shade(o.color, -24);
    for (let k = 1; k < N; k += 2) {
      const p = pts[k]!;
      const dw = p.w * 0.85;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - dw);
      ctx.lineTo(p.x + dw, p.y);
      ctx.lineTo(p.x, p.y + dw);
      ctx.lineTo(p.x - dw, p.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Viper head: a flat wedge wider than the neck, riding the rise.
  const h = pts[0]!;
  const hw = s * 0.085;
  const hl = s * 0.15;
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(Math.atan2(fy * o.ys, fx));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-hl * 0.3, -hw);
  ctx.lineTo(hl * 0.45, -hw * 0.72);
  ctx.lineTo(hl, -hw * 0.3);
  ctx.lineTo(hl, hw * 0.3);
  ctx.lineTo(hl * 0.45, hw * 0.72);
  ctx.lineTo(-hl * 0.3, hw);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(26, 20, 36, 0.4)';
  ctx.stroke();
  // Tongue: a rare forked flick, eager through the strike.
  const flick = Math.max(0, Math.sin(o.nowMs * 0.0031 + o.seed) - 0.88) / 0.12;
  const tk = Math.max(flick, at > 0.5 ? 1 : 0);
  if (tk > 0.05 && !o.hurt) {
    ctx.strokeStyle = '#c4485a';
    ctx.lineWidth = Math.max(1, s * 0.012);
    const tl = s * 0.11 * tk;
    ctx.beginPath();
    ctx.moveTo(hl, 0);
    ctx.lineTo(hl + tl * 0.7, 0);
    ctx.moveTo(hl + tl * 0.7, 0);
    ctx.lineTo(hl + tl, -s * 0.02 * tk);
    ctx.moveTo(hl + tl * 0.7, 0);
    ctx.lineTo(hl + tl, s * 0.02 * tk);
    ctx.stroke();
  }
  ctx.restore();
  // Eyes sit on the head's sides — skipped facing away.
  if (fy > -0.45 && !o.hurt) {
    ctx.fillStyle = '#e2a63c';
    for (const es of [-1, 1]) {
      const eex = h.x + fx * hl * 0.25 + es * px * hw * 0.72;
      const eey = h.y + (fy * hl * 0.25 + es * py * hw * 0.72) * o.ys;
      ctx.fillRect(eex - s * 0.014, eey - s * 0.02, s * 0.028, s * 0.04);
    }
  }
}
