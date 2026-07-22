/**
 * Death ragdolls: a small position-based physics skeleton simulated in
 * the billboard plane (screen-x, height), anchored to a world ground
 * point that the renderer slides along the killing blow. The victim's
 * limbs go limp and trail the body's momentum, the trunk topples, and
 * everything thuds into the ground line and stays down — no restitution
 * to speak of, no spinning. This is the model behind every defeated
 * character and creature.
 *
 * Coordinates: local tiles, x = screen right, y = screen DOWN (so the
 * ground line is y = point.floor, and airborne is negative y). The
 * caller owns the world anchor; frame-to-frame anchor velocity changes
 * are fed back in as `carry` so limbs keep their world momentum when
 * the body decelerates — that inertia is what pitches a sliding corpse
 * over its own pinned feet.
 */

import { chamferRect, facetBlob, facetCircle } from './shapes.js';
import {
  BEAR_LOOK,
  BEETLE_LOOK,
  BOAR_LOOK,
  CATTLE_LOOKS,
  CRAB_LOOK,
  RAM_LOOK,
  RAT_LOOK,
  SPIDER_LOOK,
  STAG_LOOK,
  WOLF_LOOK,
  drawBearHead,
  drawBoarHead,
  drawCattleHead,
  drawRamHead,
  drawRatHead,
  drawStagHead,
  drawWolfHead,
  paintBearBody,
  paintBeetleBody,
  paintBoarBody,
  paintCattleBody,
  paintCrabBody,
  paintRamBody,
  paintRatBody,
  paintSpiderBody,
  paintStagBody,
  paintWolfBody,
  shade,
  taperedSpinePath,
  type BeastSpec,
} from './rig.js';

const BOOT = '#4a3324';

/** Gravity in the billboard plane (tiles/s²) — heavy, video-game fast. */
const GRAVITY = 17;
/** Air drag per second — bleeds the launch without floatiness. */
const AIR_DRAG = 0.55;
/** Ground friction per second on grounded points — the skid killer. */
const GROUND_FRICTION = 11;
/** Constraint relaxation passes per step. */
const ITERATIONS = 6;
/** A point slower than this (tiles/s) counts toward settling. */
const SETTLE_SPEED = 0.28;
/** Every point must idle this long (s) before the ragdoll sleeps. */
const SETTLE_TIME = 0.3;
/** Downward speed (tiles/s) that qualifies a touchdown as a thud. */
const THUD_SPEED = 2.2;

export interface RagPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** This point's own rest line — tiny scatter so a body lies staggered. */
  floor: number;
  grounded: boolean;
}

interface RagStick {
  a: number;
  b: number;
  len: number;
  /** 1 = rigid bone; <1 = soft brace (trunk bend resistance). */
  stiffness: number;
}

/** A touchdown worth reacting to (dust, thud sfx). */
export interface RagImpact {
  x: number;
  y: number;
  speed: number;
  /** True for the trunk points — the body landing, not a hand flopping. */
  heavy: boolean;
}

export class Ragdoll {
  readonly pts: RagPoint[];
  private readonly sticks: RagStick[];
  /** Indices whose touchdown counts as the body hitting the ground. */
  private readonly heavySet: Set<number>;
  private stillFor = 0;
  settled = false;
  /**
   * Seeded launch jitter (mulberry32). Math.random here made every
   * death — and the ragdoll test suite — nondeterministic; two clients
   * watching the same kill each rolled a different corpse. Seed it per
   * ragdoll and the tumble is a pure function of (victim, blow).
   */
  private rngState: number;

  constructor(pts: RagPoint[], sticks: RagStick[], heavy: number[], seed = 1) {
    this.pts = pts;
    this.sticks = sticks;
    this.heavySet = new Set(heavy);
    this.rngState = (seed >>> 0) || 1;
  }

  private rand(): number {
    let t = (this.rngState += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Advance the simulation. `carryX/carryY` is the velocity DELTA of the
   * moving anchor frame this step (screen-tile units): points inherit
   * the opposite so their world-space momentum is conserved.
   * Touchdowns hard enough to matter are pushed onto `impacts`.
   */
  step(dt: number, carryX: number, carryY: number, impacts?: RagImpact[]): void {
    if (this.settled || dt <= 0) return;
    const air = Math.max(0, 1 - AIR_DRAG * dt);
    const rub = Math.max(0, 1 - GROUND_FRICTION * dt);
    const startX: number[] = [];
    const startY: number[] = [];
    for (let i = 0; i < this.pts.length; i++) {
      const p = this.pts[i]!;
      startX.push(p.x);
      startY.push(p.y);
      p.vx = (p.vx - carryX) * air;
      p.vy = (p.vy - carryY) * air + GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let it = 0; it < ITERATIONS; it++) {
      for (const st of this.sticks) {
        const a = this.pts[st.a]!;
        const b = this.pts[st.b]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1e-5;
        const k = ((d - st.len) / d) * 0.5 * st.stiffness;
        a.x += dx * k;
        a.y += dy * k;
        b.x -= dx * k;
        b.y -= dy * k;
      }
      for (const p of this.pts) {
        if (p.y > p.floor) p.y = p.floor;
      }
    }
    // PBD velocity recovery, then contact response per point.
    let maxSpeed = 0;
    for (let i = 0; i < this.pts.length; i++) {
      const p = this.pts[i]!;
      const fallSpeed = p.vy;
      p.vx = (p.x - startX[i]!) / dt;
      p.vy = (p.y - startY[i]!) / dt;
      const onFloor = p.y >= p.floor - 1e-4;
      if (onFloor) {
        if (!p.grounded && fallSpeed > THUD_SPEED && impacts) {
          impacts.push({
            x: p.x,
            y: p.y,
            speed: fallSpeed,
            heavy: this.heavySet.has(i),
          });
        }
        p.grounded = true;
        // Dead stop downward, a whisper of give — never a bounce.
        if (p.vy > 0) p.vy = -p.vy * 0.04;
        p.vx *= rub;
      } else {
        p.grounded = false;
      }
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > maxSpeed) maxSpeed = sp;
    }
    if (maxSpeed < SETTLE_SPEED) {
      this.stillFor += dt;
      if (this.stillFor >= SETTLE_TIME) this.settled = true;
    } else {
      this.stillFor = 0;
    }
  }

  /** Fraction of points resting on the ground — the caller's slide drag. */
  groundedFrac(): number {
    let n = 0;
    for (const p of this.pts) if (p.grounded) n++;
    return n / this.pts.length;
  }

  /** Local-space bounds (tiles) for outline/culling rectangles. */
  bounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of this.pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY };
  }

  /**
   * The killing blow. `kx/ky` is the blow's screen-plane direction
   * (unit-ish), `power` 0..1 the severity. The trunk and head take the
   * hit hardest — the differential against friction-pinned feet is what
   * pitches the body over instead of spinning it like a prop.
   */
  launch(kx: number, ky: number, power: number, upper: number[], feet: number[]): void {
    const up = 0.6 + 3.2 * power;
    const shove = 1.1 + 3.6 * power;
    for (const p of this.pts) {
      p.vy -= up * (0.75 + this.rand() * 0.5);
      p.vx += (this.rand() - 0.5) * 0.5;
      p.grounded = false;
    }
    for (const i of upper) {
      const p = this.pts[i]!;
      p.vx += kx * shove;
      p.vy += ky * shove * 0.4;
    }
    for (const i of feet) {
      const p = this.pts[i]!;
      p.vx -= kx * shove * 0.2;
    }
  }
}

/** Humanoid skeleton point indices (see buildHumanoidRagdoll). */
export const H = {
  pelvis: 0,
  chest: 1,
  head: 2,
  kneeL: 3,
  footL: 4,
  kneeR: 5,
  footR: 6,
  elbowL: 7,
  handL: 8,
  elbowR: 9,
  handR: 10,
} as const;

const pt = (x: number, y: number, floor: number): RagPoint => ({
  x,
  y,
  vx: 0,
  vy: 0,
  floor,
  grounded: false,
});

/**
 * Standing humanoid skeleton, proportioned like the live rig (HEIGHT=1
 * scaled by `size`). Floor scatter comes from the seed so two goblins
 * never sprawl identically.
 */
export function buildHumanoidRagdoll(size: number, seed: number): Ragdoll {
  const k = size;
  const j = (n: number, amp: number): number => ((((seed >> (n * 3)) & 7) / 7 - 0.5) * 2 * amp) * k;
  const pts: RagPoint[] = [
    pt(0, -0.41 * k, j(0, 0.02)), // pelvis
    pt(0, -0.83 * k, j(1, 0.03)), // chest
    pt(0.02 * k, -1.06 * k, j(2, 0.04)), // head
    pt(-0.1 * k, -0.2 * k, j(3, 0.03)), // kneeL
    pt(-0.1 * k, 0, 0.02 * k + j(4, 0.03)), // footL
    pt(0.1 * k, -0.2 * k, j(5, 0.03)), // kneeR
    pt(0.1 * k, 0, 0.02 * k + j(6, 0.03)), // footR
    pt(-0.17 * k, -0.66 * k, j(7, 0.04)), // elbowL
    pt(-0.19 * k, -0.48 * k, 0.03 * k + j(0, 0.03)), // handL
    pt(0.17 * k, -0.66 * k, j(1, 0.04)), // elbowR
    pt(0.19 * k, -0.48 * k, 0.03 * k + j(2, 0.03)), // handR
  ];
  const st = (a: number, b: number, stiffness = 1): RagStick => {
    const pa = pts[a]!;
    const pb = pts[b]!;
    return { a, b, len: Math.hypot(pb.x - pa.x, pb.y - pa.y), stiffness };
  };
  const sticks: RagStick[] = [
    st(H.pelvis, H.chest),
    st(H.chest, H.head),
    st(H.pelvis, H.kneeL),
    st(H.kneeL, H.footL),
    st(H.pelvis, H.kneeR),
    st(H.kneeR, H.footR),
    st(H.chest, H.elbowL),
    st(H.elbowL, H.handL),
    st(H.chest, H.elbowR),
    st(H.elbowR, H.handR),
    // Soft trunk brace: the spine bends, it doesn't fold in half.
    st(H.pelvis, H.head, 0.35),
  ];
  return new Ragdoll(pts, sticks, [H.pelvis, H.chest, H.head], seed);
}

/** Upper-body / feet index groups for launch(). */
export const HUMANOID_UPPER = [H.chest, H.head, H.elbowL, H.handL, H.elbowR, H.handR];
export const HUMANOID_FEET = [H.footL, H.footR];

/**
 * Beast skeleton: rear hip, front chest, head, then one two-segment
 * chain per leg in the species spec's order. Chains attach to the rear
 * spine point for hind legs (fwd < 0) and the front for the rest.
 */
export function buildBeastRagdoll(spec: BeastSpec, radius: number, seed: number): Ragdoll {
  const rise = spec.bodyRise;
  const len = spec.bodyLen;
  const j = (n: number, amp: number): number => (((seed >> (n * 3)) & 7) / 7 - 0.5) * 2 * amp;
  const pts: RagPoint[] = [
    pt(-len * 0.55, -rise, j(0, 0.02)), // 0 rear
    pt(len * 0.55, -rise, j(1, 0.02)), // 1 front
    pt(len * 0.95, -rise - radius * 0.2, j(2, 0.04)), // 2 head
  ];
  const sticks: RagStick[] = [
    { a: 0, b: 1, len: len * 1.1, stiffness: 1 },
    { a: 1, b: 2, len: Math.hypot(len * 0.4, radius * 0.2), stiffness: 1 },
    // Soft neck-to-tail brace keeps the spine from jackknifing.
    { a: 0, b: 2, len: len * 1.5, stiffness: 0.35 },
  ];
  const half = spec.rig.legLen / 2;
  const legIdx: Array<{ anchor: number; knee: number; foot: number; side: number }> = [];
  for (let i = 0; i < spec.rig.legs.length; i++) {
    const leg = spec.rig.legs[i]!;
    const anchor = leg.fwd < 0 ? 0 : 1;
    const ax = pts[anchor]!.x;
    const kneeI = pts.length;
    pts.push(pt(ax + j(i + 3, 0.05), -rise + half, j(i + 3, 0.03)));
    const footI = pts.length;
    pts.push(pt(ax + j(i + 6, 0.08), 0, 0.02 + j(i + 6, 0.03)));
    sticks.push({ a: anchor, b: kneeI, len: half + rise * 0.2, stiffness: 1 });
    sticks.push({ a: kneeI, b: footI, len: half, stiffness: 1 });
    legIdx.push({ anchor, knee: kneeI, foot: footI, side: Math.sign(leg.side) || 1 });
  }
  const rag = new Ragdoll(pts, sticks, [0, 1, 2], seed);
  (rag as Ragdoll & { legIdx?: typeof legIdx }).legIdx = legIdx;
  return rag;
}

export const BEAST_UPPER = [1, 2];

/** Screen-space projection of local ragdoll points. */
export interface RagFrame {
  /** Anchor ground point on screen (pixels). */
  ax: number;
  ay: number;
  /** Pixels per tile. */
  s: number;
}

const P = (f: RagFrame, p: RagPoint): { x: number; y: number } => ({
  x: f.ax + p.x * f.s,
  y: f.ay + p.y * f.s,
});

/** One limp two-segment limb as the rig draws them: stroke + stroke. */
function limb(
  ctx: CanvasRenderingContext2D,
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  colUpper: string,
  colLower: string,
  wUpper: number,
  wLower: number,
): void {
  ctx.lineCap = 'round';
  ctx.strokeStyle = colUpper;
  ctx.lineWidth = Math.max(2, wUpper);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.strokeStyle = colLower;
  ctx.lineWidth = Math.max(1.5, wLower);
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

/** A rotated block chip (boot, mitt) seated on a limb end. */
function chip(
  ctx: CanvasRenderingContext2D,
  at: { x: number; y: number },
  toward: { x: number; y: number },
  w: number,
  h: number,
  color: string,
): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(Math.atan2(at.y - toward.y, at.x - toward.x) - Math.PI / 2);
  ctx.fillStyle = color;
  ctx.beginPath();
  chamferRect(ctx, -w / 2, -h * 0.4, w, h, w * 0.22);
  ctx.fill();
  ctx.restore();
}

export interface HumanoidCorpseLook {
  bodyColor: string;
  skinColor: string;
  hairColor: string;
  size: number;
}

/**
 * Paint a humanoid ragdoll in the rig's own dialect: trapezoid torso
 * with a hard shade half, chamfered block head with the hair slab,
 * two-segment limbs, square mitts, boot chips. Far-side limbs go
 * behind the trunk, near-side in front — a sprawl, not a stack.
 */
export function drawHumanoidRagdoll(
  ctx: CanvasRenderingContext2D,
  rag: Ragdoll,
  f: RagFrame,
  look: HumanoidCorpseLook,
): void {
  const s = f.s * look.size;
  const g = rag.pts;
  const pelvis = P(f, g[H.pelvis]!);
  const chest = P(f, g[H.chest]!);
  const head = P(f, g[H.head]!);
  const legCol = shade(look.bodyColor, -28);
  const shinCol = legCol;
  const sleeveCol = shade(look.bodyColor, -10);

  // Torso frame: axis pelvis→chest, widths from the live proportions.
  let ux = chest.x - pelvis.x;
  let uy = chest.y - pelvis.y;
  const ul = Math.hypot(ux, uy) || 1e-4;
  ux /= ul;
  uy /= ul;
  let nx = -uy;
  let ny = ux;
  const tw = 0.185 * s;
  const ww = 0.125 * s;

  const drawLeg = (knee: number, foot: number, hipSide: number): void => {
    const hip = {
      x: pelvis.x + nx * hipSide * ww * 0.7,
      y: pelvis.y + ny * hipSide * ww * 0.7,
    };
    const k = P(f, g[knee]!);
    const ft = P(f, g[foot]!);
    limb(ctx, hip, k, ft, legCol, shinCol, s * 0.09, s * 0.082);
    chip(ctx, ft, k, s * 0.1, s * 0.09, BOOT);
  };
  const drawArm = (elbow: number, hand: number, side: number): void => {
    const sh = {
      x: chest.x + nx * side * tw * 0.85,
      y: chest.y + ny * side * tw * 0.85,
    };
    const el = P(f, g[elbow]!);
    const hd = P(f, g[hand]!);
    limb(ctx, sh, el, hd, sleeveCol, look.skinColor, s * 0.08, s * 0.06);
    chip(ctx, hd, el, s * 0.075, s * 0.07, look.skinColor);
  };

  // Far pair behind the trunk.
  drawArm(H.elbowL, H.handL, -1);
  drawLeg(H.kneeL, H.footL, -1);

  // Trunk: shoulders→waist trapezoid + hard shade half + belt band.
  const c1 = { x: chest.x + nx * tw, y: chest.y + ny * tw };
  const c2 = { x: chest.x - nx * tw, y: chest.y - ny * tw };
  const p1 = { x: pelvis.x + nx * ww, y: pelvis.y + ny * ww };
  const p2 = { x: pelvis.x - nx * ww, y: pelvis.y - ny * ww };
  ctx.fillStyle = look.bodyColor;
  ctx.beginPath();
  ctx.moveTo(c1.x, c1.y);
  ctx.lineTo(c2.x, c2.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.closePath();
  ctx.fill();
  // Shade the half facing screen-down — the side against the ground.
  const downSide = ny >= 0 ? 1 : -1;
  ctx.fillStyle = shade(look.bodyColor, -14);
  ctx.beginPath();
  ctx.moveTo(chest.x, chest.y);
  ctx.lineTo(chest.x + nx * downSide * tw, chest.y + ny * downSide * tw);
  ctx.lineTo(pelvis.x + nx * downSide * ww, pelvis.y + ny * downSide * ww);
  ctx.lineTo(pelvis.x, pelvis.y);
  ctx.closePath();
  ctx.fill();
  // Belt band riding just above the pelvis.
  ctx.strokeStyle = shade(look.bodyColor, -34);
  ctx.lineWidth = Math.max(1.5, s * 0.05);
  ctx.beginPath();
  ctx.moveTo(pelvis.x + ux * s * 0.06 + nx * ww, pelvis.y + uy * s * 0.06 + ny * ww);
  ctx.lineTo(pelvis.x + ux * s * 0.06 - nx * ww, pelvis.y + uy * s * 0.06 - ny * ww);
  ctx.stroke();

  // Head: chamfered skin block along the neck axis, hair slab crowning
  // the far end. No face — eyes closed is drawn as absence, not marks.
  let hx = head.x - chest.x;
  let hy = head.y - chest.y;
  const hl = Math.hypot(hx, hy) || 1e-4;
  hx /= hl;
  hy /= hl;
  const headR = 0.15 * s;
  const hw = headR * 1.04;
  const hh = headR;
  const cut = headR * 0.34;
  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(Math.atan2(hy, hx) + Math.PI / 2);
  ctx.fillStyle = look.skinColor;
  ctx.beginPath();
  chamferRect(ctx, -hw, -hh, hw * 2, hh * 2, cut);
  ctx.fill();
  ctx.fillStyle = look.hairColor;
  ctx.beginPath();
  chamferRect(ctx, -hw * 0.96, -hh * 0.98, hw * 1.92, hh * 0.62, [cut * 0.85, cut * 0.85, 0, 0]);
  ctx.fill();
  ctx.restore();

  // Near pair over the trunk.
  drawLeg(H.kneeR, H.footR, 1);
  drawArm(H.elbowR, H.handR, 1);
}

export interface BeastCorpseLook {
  spec: BeastSpec;
  radius: number;
  color: string;
  defId: string;
  seed: number;
}

/**
 * Paint a beast ragdoll: the same faceted body mass and species legs
 * as the live drawBeast, hanging off the simulated spine — half the
 * legs behind the mass, half in front, tail limp on the ground.
 */
export function drawBeastRagdoll(
  ctx: CanvasRenderingContext2D,
  rag: Ragdoll,
  f: RagFrame,
  look: BeastCorpseLook,
): void {
  const s = f.s;
  const spec = look.spec;
  const r = look.radius * s;
  const g = rag.pts;
  const rear = P(f, g[0]!);
  const front = P(f, g[1]!);
  const head = P(f, g[2]!);
  const legIdx =
    (rag as Ragdoll & { legIdx?: Array<{ anchor: number; knee: number; foot: number; side: number }> })
      .legIdx ?? [];
  const spineA = Math.atan2(front.y - rear.y, front.x - rear.x);
  const midX = (rear.x + front.x) / 2;
  const midY = (rear.y + front.y) / 2;
  const len = spec.bodyLen * s;
  const legCol = spec.legColor ?? shade(look.color, -35);
  const shinCol = spec.legColor ?? shade(look.color, -22);
  const footCol = shade(spec.legColor ?? look.color, -55);

  const drawLegChain = (li: { anchor: number; knee: number; foot: number }): void => {
    const a = P(f, g[li.anchor]!);
    const k = P(f, g[li.knee]!);
    const ft = P(f, g[li.foot]!);
    limb(ctx, a, k, ft, legCol, shinCol, spec.legW * s, spec.legW * s * 0.78);
    if (spec.foot === 'hoof') {
      chip(ctx, ft, k, spec.legW * s * 1.5, spec.legW * s * 0.95, footCol);
    } else if (spec.foot === 'claw') {
      ctx.strokeStyle = footCol;
      ctx.lineWidth = Math.max(1.5, spec.legW * s * 0.7);
      ctx.lineCap = 'round';
      const base = Math.atan2(ft.y - k.y, ft.x - k.x);
      for (const t of [-0.55, 0, 0.55]) {
        ctx.beginPath();
        ctx.moveTo(ft.x, ft.y);
        ctx.lineTo(ft.x + Math.cos(base + t) * 0.07 * s, ft.y + Math.sin(base + t) * 0.07 * s);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    } else {
      const pw = spec.legW * s * 1.35;
      const shinA = Math.atan2(ft.y - k.y, ft.x - k.x);
      ctx.fillStyle = footCol;
      ctx.beginPath();
      ctx.ellipse(ft.x, ft.y, pw * 0.62, pw * 0.42, shinA - Math.PI / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Far legs (odd sides) behind the mass.
  for (const li of legIdx) if (li.side < 0) drawLegChain(li);

  const cattle = CATTLE_LOOKS[look.defId];

  // Tail first so it reads under the rump.
  if (cattle) {
    const tx = rear.x - Math.cos(spineA) * len * 0.55;
    const tyEnd = f.ay + g[0]!.floor * f.s + s * 0.015;
    ctx.strokeStyle = shade(cattle.hide, -24);
    ctx.lineWidth = Math.max(1.5, s * 0.032);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rear.x, rear.y);
    ctx.quadraticCurveTo((rear.x + tx) / 2, rear.y + s * 0.08, tx, tyEnd);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = cattle.patch;
    ctx.beginPath();
    facetCircle(ctx, tx, tyEnd, s * 0.045, 5, spineA);
    ctx.fill();
  } else if (look.defId === 'wolf') {
    // The brush lies limp along the ground behind the rump.
    const tx = rear.x - Math.cos(spineA) * len * 0.55;
    const tipY = f.ay + g[0]!.floor * f.s + s * 0.02;
    const brush = taperedSpinePath(
      rear.x,
      rear.y,
      (rear.x + tx) / 2,
      Math.max(rear.y, tipY) + s * 0.03,
      tx,
      tipY,
      (t) => s * (0.03 + 0.045 * Math.sin(Math.PI * Math.pow(t, 0.9))),
    );
    ctx.fillStyle = shade(WOLF_LOOK.coat, -4);
    ctx.fill(brush);
    ctx.fillStyle = WOLF_LOOK.saddle;
    ctx.beginPath();
    facetCircle(ctx, tx, tipY, s * 0.038, 5, spineA);
    ctx.fill();
  } else if (look.defId === 'rat') {
    const tx = rear.x - Math.cos(spineA) * len * 1.5;
    const tipY = f.ay + g[0]!.floor * f.s + s * 0.012;
    const tail = taperedSpinePath(
      rear.x,
      rear.y,
      (rear.x + tx) / 2,
      tipY + s * 0.04,
      tx,
      tipY,
      (t) => s * (0.02 * (1 - t) + 0.006),
    );
    ctx.fillStyle = RAT_LOOK.skin;
    ctx.fill(tail);
  }

  // Body mass along the spine — the live block, collapsed onto its
  // side for cattle, the faceted blob for everyone else.
  if (cattle) {
    paintCattleBody(ctx, spec, cattle, {
      bx: midX,
      gy: midY + r * 0.4,
      s,
      fx: Math.cos(spineA),
      fy: Math.sin(spineA),
      ys: 1,
      seed: look.seed,
      hurt: false,
      bob: 0,
      roll: 0,
      backH: cattle.backH * 0.42,
      bellyH: 0.02,
    });
  } else if (look.defId === 'wolf') {
    paintWolfBody(ctx, spec, WOLF_LOOK, {
      bx: midX,
      gy: midY + r * 0.4,
      s,
      fx: Math.cos(spineA),
      fy: Math.sin(spineA),
      ys: 1,
      seed: look.seed,
      hurt: false,
      bob: 0,
      roll: 0,
      topScale: 0.5,
      botH: 0.02,
    });
  } else if (look.defId === 'rat') {
    paintRatBody(ctx, spec, RAT_LOOK, {
      bx: midX,
      gy: midY + r * 0.4,
      s,
      fx: Math.cos(spineA),
      fy: Math.sin(spineA),
      ys: 1,
      seed: look.seed,
      hurt: false,
      bob: 0,
      roll: 0,
      topScale: 0.7,
      botH: 0.015,
    });
  } else if (look.defId === 'boar') {
    paintBoarBody(ctx, spec, BOAR_LOOK, {
      bx: midX,
      gy: midY + r * 0.4,
      s,
      fx: Math.cos(spineA),
      fy: Math.sin(spineA),
      ys: 1,
      seed: look.seed,
      hurt: false,
      bob: 0,
      roll: 0,
      topScale: 0.55,
      botH: 0.02,
    });
  } else if (look.defId === 'ram') {
    paintRamBody(ctx, spec, RAM_LOOK, {
      bx: midX,
      gy: midY + r * 0.4,
      s,
      fx: Math.cos(spineA),
      fy: Math.sin(spineA),
      ys: 1,
      seed: look.seed,
      hurt: false,
      bob: 0,
      roll: 0,
      topScale: 0.55,
      botH: 0.02,
    });
  } else if (look.defId === 'stag') {
    paintStagBody(ctx, spec, STAG_LOOK, {
      bx: midX,
      gy: midY + r * 0.4,
      s,
      fx: Math.cos(spineA),
      fy: Math.sin(spineA),
      ys: 1,
      seed: look.seed,
      hurt: false,
      bob: 0,
      roll: 0,
      topScale: 0.5,
      botH: 0.02,
    });
  } else if (look.defId === 'bear') {
    paintBearBody(ctx, spec, BEAR_LOOK, {
      bx: midX,
      gy: midY + r * 0.4,
      s,
      fx: Math.cos(spineA),
      fy: Math.sin(spineA),
      ys: 1,
      seed: look.seed,
      hurt: false,
      bob: 0,
      roll: 0,
      topScale: 0.55,
      botH: 0.02,
    });
  } else if (look.defId === 'mudcrab') {
    // The whole crab — claws slack, no stalk eyes on the dead.
    paintCrabBody(
      ctx,
      spec,
      CRAB_LOOK,
      {
        bx: midX,
        gy: midY + r * 0.4,
        s,
        fx: Math.cos(spineA),
        fy: Math.sin(spineA),
        ys: 1,
        seed: look.seed,
        hurt: false,
        bob: 0,
        roll: 0,
        topScale: 0.55,
        botH: 0.02,
      },
      0,
    );
  } else if (look.defId === 'giant_beetle') {
    // Collapsed dome — the horn keeps the silhouette honest.
    paintBeetleBody(
      ctx,
      spec,
      BEETLE_LOOK,
      {
        bx: midX,
        gy: midY + r * 0.4,
        s,
        fx: Math.cos(spineA),
        fy: Math.sin(spineA),
        ys: 1,
        seed: look.seed,
        hurt: false,
        bob: 0,
        roll: 0,
        topScale: 0.55,
        botH: 0.02,
      },
      0,
    );
  } else if (look.defId === 'giant_spider') {
    // Spiders die on their back in truth, but the flat-slab collapse
    // reads better in this dialect — legs splay via the chains.
    paintSpiderBody(ctx, spec, SPIDER_LOOK, {
      bx: midX,
      gy: midY + r * 0.4,
      s,
      fx: Math.cos(spineA),
      fy: Math.sin(spineA),
      ys: 1,
      seed: look.seed,
      hurt: false,
      bob: 0,
      roll: 0,
      topScale: 0.55,
      botH: 0.02,
    });
  } else if (look.defId === 'adder') {
    // The whole snake is the ribbon: head→rear through the spine, then
    // a limp tail run collapsing to the floor behind it.
    const floorY = f.ay + g[0]!.floor * f.s;
    const tx = rear.x - Math.cos(spineA) * len * 1.6;
    const tipY = floorY + s * 0.012;
    ctx.fillStyle = look.color;
    const fore = taperedSpinePath(head.x, head.y, front.x, front.y, rear.x, rear.y, (t) =>
      s * (0.035 + 0.028 * Math.sin(Math.PI * t)),
    );
    ctx.fill(fore);
    const aft = taperedSpinePath(
      rear.x,
      rear.y,
      (rear.x + tx) / 2,
      Math.max(rear.y, tipY) + s * 0.03,
      tx,
      tipY,
      (t) => s * (0.05 * (1 - t) + 0.006),
    );
    ctx.fill(aft);
    // A few dorsal diamonds survive on the slack body.
    ctx.fillStyle = shade(look.color, -24);
    for (const q of [0.25, 0.55, 0.85]) {
      const qx = head.x + (rear.x - head.x) * q;
      const qy = head.y + (rear.y - head.y) * q;
      const dw = s * 0.035;
      ctx.beginPath();
      ctx.moveTo(qx, qy - dw);
      ctx.lineTo(qx + dw, qy);
      ctx.lineTo(qx, qy + dw);
      ctx.lineTo(qx - dw, qy);
      ctx.closePath();
      ctx.fill();
    }
  } else if (look.defId === 'cave_bat') {
    // Downed bat: the membranes lie crumpled either side of the tuft.
    const wr = r * 2.2;
    ctx.fillStyle = shade(look.color, -10);
    for (const es of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(midX, midY);
      ctx.lineTo(midX + Math.cos(spineA + es * 2.2) * wr, midY + Math.sin(spineA + es * 2.2) * wr * 0.5);
      ctx.lineTo(midX + Math.cos(spineA + es * 2.7) * wr * 0.62, midY + Math.sin(spineA + es * 2.7) * wr * 0.4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = look.color;
    ctx.beginPath();
    facetBlob(ctx, midX, midY, r * 1.1, look.seed, 8, 0.75);
    ctx.fill();
  } else {
    ctx.fillStyle = look.color;
    ctx.save();
    ctx.translate(midX, midY);
    ctx.rotate(spineA);
    ctx.beginPath();
    facetBlob(ctx, 0, 0, len, look.seed, 9, (r * 0.78) / len, 0.4);
    ctx.fill();
    ctx.fillStyle = shade(look.color, 14);
    ctx.beginPath();
    facetBlob(ctx, -len * 0.15, -r * 0.25, len * 0.5, look.seed ^ 0x5f5f, 7, (r * 0.32) / (len * 0.5), 1.1);
    ctx.fill();
    ctx.restore();
  }

  // Head + ears, slumped on the neck.
  const headR = r * (look.defId === 'chicken' ? 0.5 : 0.55);
  const neckA = Math.atan2(head.y - front.y, head.x - front.x);
  if (cattle) {
    drawCattleHead(ctx, cattle, {
      x: head.x,
      y: head.y,
      s,
      fx: Math.cos(neckA),
      fy: Math.sin(neckA),
      ys: 1,
      dead: true,
    });
  } else if (look.defId === 'wolf') {
    drawWolfHead(ctx, WOLF_LOOK, {
      x: head.x,
      y: head.y,
      s,
      fx: Math.cos(neckA),
      fy: Math.sin(neckA),
      ys: 1,
      dead: true,
    });
  } else if (look.defId === 'rat') {
    drawRatHead(ctx, RAT_LOOK, {
      x: head.x,
      y: head.y,
      s,
      fx: Math.cos(neckA),
      fy: Math.sin(neckA),
      ys: 1,
      dead: true,
    });
  } else if (look.defId === 'boar') {
    drawBoarHead(ctx, BOAR_LOOK, {
      x: head.x,
      y: head.y,
      s,
      fx: Math.cos(neckA),
      fy: Math.sin(neckA),
      ys: 1,
      dead: true,
    });
  } else if (look.defId === 'ram') {
    drawRamHead(ctx, RAM_LOOK, {
      x: head.x,
      y: head.y,
      s,
      fx: Math.cos(neckA),
      fy: Math.sin(neckA),
      ys: 1,
      dead: true,
    });
  } else if (look.defId === 'stag') {
    drawStagHead(ctx, STAG_LOOK, {
      x: head.x,
      y: head.y,
      s,
      fx: Math.cos(neckA),
      fy: Math.sin(neckA),
      ys: 1,
      dead: true,
    });
  } else if (look.defId === 'bear') {
    drawBearHead(ctx, BEAR_LOOK, {
      x: head.x,
      y: head.y,
      s,
      fx: Math.cos(neckA),
      fy: Math.sin(neckA),
      ys: 1,
      dead: true,
    });
  } else if (look.defId === 'giant_spider' || look.defId === 'mudcrab' || look.defId === 'giant_beetle') {
    // No separate head — the body painter drew the whole animal.
  } else if (look.defId === 'adder') {
    // The viper wedge, slack on the floor — no eyes on the dead.
    const hw = s * 0.085;
    const hl = s * 0.15;
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(neckA);
    ctx.fillStyle = look.color;
    ctx.beginPath();
    ctx.moveTo(-hl * 0.3, -hw);
    ctx.lineTo(hl * 0.45, -hw * 0.72);
    ctx.lineTo(hl, -hw * 0.3);
    ctx.lineTo(hl, hw * 0.3);
    ctx.lineTo(hl * 0.45, hw * 0.72);
    ctx.lineTo(-hl * 0.3, hw);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (look.defId === 'cave_bat') {
    const hr = r * 0.75;
    for (const es of [-1, 1]) {
      const ex = head.x + Math.cos(neckA + es * 1.9) * hr * 0.7;
      const ey = head.y + Math.sin(neckA + es * 1.9) * hr * 0.7;
      ctx.fillStyle = look.color;
      ctx.beginPath();
      ctx.moveTo(ex - hr * 0.2, ey);
      ctx.lineTo(ex + Math.cos(neckA + es * 2.4) * hr * 0.85, ey + Math.sin(neckA + es * 2.4) * hr * 0.85);
      ctx.lineTo(ex + hr * 0.2, ey);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = look.color;
    ctx.beginPath();
    facetCircle(ctx, head.x, head.y, hr, 6, neckA + Math.PI / 6);
    ctx.fill();
  } else {
    ctx.fillStyle = look.color;
    ctx.beginPath();
    facetCircle(ctx, head.x, head.y, headR, 6, neckA + Math.PI / 6);
    ctx.fill();
  }
  if (look.defId === 'chicken') {
    ctx.fillStyle = '#e8a33d';
    ctx.beginPath();
    ctx.moveTo(head.x + Math.cos(neckA) * headR * 0.8, head.y + Math.sin(neckA) * headR * 0.8 - headR * 0.2);
    ctx.lineTo(head.x + Math.cos(neckA) * headR * 1.7, head.y + Math.sin(neckA) * headR * 1.7);
    ctx.lineTo(head.x + Math.cos(neckA) * headR * 0.8, head.y + Math.sin(neckA) * headR * 0.8 + headR * 0.2);
    ctx.closePath();
    ctx.fill();
  }

  // Near legs in front.
  for (const li of legIdx) if (li.side >= 0) drawLegChain(li);
}
