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

import { drawShieldAt, isShieldKind, shieldStyle } from './shields.js';
import { itemDef } from '@arx/content';
import { chamferRect, facetBlob, facetCircle } from './shapes.js';
import {
  bodyStyle,
  bootStyle,
  drawHelmet,
  drawOffhandOnArm,
  gloveStyle,
  helmStyle,
  legStyle,
  offhandStyle,
} from './armor.js';
import { bladeStyle, bowStyle, drawBow, drawStaff, drawSword, staffStyle } from './weapons.js';
import { drawTool, toolStyle } from './tools.js';
import {
  BEAR_LOOK,
  BEETLE_LOOK,
  BOAR_LOOK,
  CATTLE_LOOKS,
  CRAB_LOOK,
  DIREWOLF_LOOK,
  RAM_LOOK,
  RAT_LOOK,
  SPIDER_LOOK,
  HIND_LOOK,
  STAG_LOOK,
  WOLF_LOOK,
  WORG_LOOK,
  drawBearHead,
  drawBoarHead,
  drawCattleHead,
  drawDireWolfHead,
  drawOwlHead,
  drawRamHead,
  drawRatHead,
  drawStagHead,
  drawWolfHead,
  drawWorgHead,
  enchantedStyle,
  owlWingFan,
  paintBearBody,
  paintBeetleBody,
  paintBoarBody,
  paintCattleBody,
  paintCrabBody,
  paintDireWolfBody,
  paintOwlBody,
  paintRamBody,
  paintRatBody,
  paintSpiderBody,
  paintStagBody,
  paintWolfBody,
  paintWorgBody,
  scaleRibbon,
  shade,
  taperedSpinePath,
  type BeastSpec,
  type GnollLook,
  type KoboldLook,
  type OwlLook,
  type SkeletonLook,
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

/**
 * The gear a humanoid was wearing at the death instant. Death never
 * strips a body: the corpse falls in the same armor colors, the helmet
 * stays seated, the shield rides the fallen forearm, and the weapon
 * lies along the fist that held it — defeating a knight leaves a
 * knight on the ground, not an undressed villager.
 */
export interface CorpseGear {
  head?: string;
  body?: string;
  legs?: string;
  boots?: string;
  gloves?: string;
  weapon?: string;
  offhand?: string;
  /** Enchant ids riding the weapons — the fx channel survives death. */
  weaponEnch?: string;
  offhandEnch?: string;
}

export interface HumanoidCorpseLook {
  bodyColor: string;
  skinColor: string;
  hairColor: string;
  size: number;
  /** Set = this corpse is a skeleton: paint bones, not flesh. */
  skel?: SkeletonLook;
  /** Set = this corpse is a kobold: horns, muzzle, and tail stay. */
  kob?: KoboldLook;
  /** Set = this corpse is a gnoll: muzzle, crest, and coat stay. */
  gno?: GnollLook;
  /** Worn equipment — the corpse keeps everything it died in. */
  gear?: CorpseGear;
}

/**
 * A weapon painted in the fallen-fist frame (origin at the hand, +x
 * along the forearm's line) — the same routing drawHeldItem uses, so
 * every blade, tool, bow, and staff resolves its own bespoke painter.
 */
function drawFallenWeapon(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  s: number,
  nowMs: number,
  ench?: string,
): void {
  const color = itemDef(itemId)?.color ?? '#8d9299';
  const blade = bladeStyle(itemId, color);
  if (blade) {
    drawSword(ctx, enchantedStyle(blade, ench, 'blade'), s, nowMs);
    return;
  }
  const tool = toolStyle(itemId, color);
  if (tool && !itemId.includes('rod')) {
    drawTool(ctx, tool, s, nowMs);
    return;
  }
  const bow = bowStyle(itemId, color);
  if (bow) {
    drawBow(ctx, enchantedStyle(bow, ench, 'blade'), s, nowMs, false, 0);
    return;
  }
  const staff = staffStyle(itemId, color);
  if (staff) {
    drawStaff(ctx, enchantedStyle(staff, ench, 'staff'), s, nowMs, false, 0.34, 0);
    return;
  }
  if (tool) drawTool(ctx, tool, s, nowMs);
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
  nowMs = 0,
): void {
  if (look.skel) {
    drawSkeletonRagdoll(ctx, rag, f, look.size, look.skel);
    return;
  }
  const s = f.s * look.size;
  const g = rag.pts;
  const pelvis = P(f, g[H.pelvis]!);
  const chest = P(f, g[H.chest]!);
  const head = P(f, g[H.head]!);
  // Worn gear resolves through the SAME style records that dress the
  // live rig — the corpse wears the armor's own colors, not a costume.
  const gear = look.gear;
  const bodySt = gear?.body ? bodyStyle(gear.body) : null;
  const legSt = gear?.legs ? legStyle(gear.legs) : null;
  const bootSt = gear?.boots ? bootStyle(gear.boots) : null;
  const gloveSt = gear?.gloves ? gloveStyle(gear.gloves) : null;
  const helmSt = gear?.head ? helmStyle(gear.head) : null;
  const cloth = bodySt?.color ?? look.bodyColor;
  // Kobold corpses keep bare scaled legs and feet — no cloth, no boots
  // (the live dialect's law carried into death).
  const legCol = look.kob
    ? shade(look.kob.hide, -5)
    : look.gno
      ? shade(look.gno.fur, -5)
      : (legSt?.thigh ?? shade(look.bodyColor, -28));
  const shinCol = look.kob
    ? shade(look.kob.hide, -12)
    : look.gno
      ? shade(look.gno.fur, -14)
      : (legSt?.shin ?? legCol);
  const sleeveCol = bodySt?.sleeve ?? shade(cloth, -10);
  const footCol = look.kob
    ? shade(look.kob.hide, -8)
    : look.gno
      ? shade(look.gno.skin, -6)
      : (bootSt?.color ?? BOOT);
  const mittCol = gloveSt?.color ?? look.skinColor;
  const foreCol = gloveSt ? (gloveSt.bracer ?? shade(gloveSt.color, -8)) : look.skinColor;

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
    chip(ctx, ft, k, s * 0.1, s * 0.09, footCol);
  };
  const drawArm = (elbow: number, hand: number, side: number): void => {
    const sh = {
      x: chest.x + nx * side * tw * 0.85,
      y: chest.y + ny * side * tw * 0.85,
    };
    const el = P(f, g[elbow]!);
    const hd = P(f, g[hand]!);
    limb(ctx, sh, el, hd, sleeveCol, foreCol, s * 0.08, s * 0.06);
    chip(ctx, hd, el, s * 0.075, s * 0.07, mittCol);
    // The pauldron stays seated on the fallen shoulder.
    if (bodySt && bodySt.pauldron !== 'none') {
      const pc = bodySt.pauldronColor ?? bodySt.metal ?? shade(bodySt.color, -20);
      ctx.fillStyle = pc;
      ctx.beginPath();
      facetCircle(ctx, sh.x, sh.y, s * 0.078, 6, side);
      ctx.fill();
      ctx.strokeStyle = bodySt.pauldronTrim ?? shade(pc, -22);
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.stroke();
    }
  };
  // A fallen weapon lies along the forearm's own line, still in the
  // fist that held it — the grip is the last thing a warrior gives up.
  const drawHandWeapon = (elbow: number, hand: number, itemId: string, ench?: string): void => {
    const el = P(f, g[elbow]!);
    const hd = P(f, g[hand]!);
    ctx.save();
    ctx.translate(hd.x, hd.y);
    ctx.rotate(Math.atan2(hd.y - el.y, hd.x - el.x));
    drawFallenWeapon(ctx, itemId, s, nowMs, ench);
    ctx.restore();
  };

  // The kobold tail goes down first — slack on the ground under the
  // body, trailing off the pelvis away from the chest, ridge chips
  // still marking the dorsal line (corpse identity law).
  if (look.kob) {
    const kb = look.kob;
    const tipX = pelvis.x - ux * s * 0.52 * kb.heavy;
    const tipY = pelvis.y - uy * s * 0.52 * kb.heavy + s * 0.1;
    const cx = pelvis.x - ux * s * 0.24 * kb.heavy + s * 0.02;
    const cy = pelvis.y - uy * s * 0.24 * kb.heavy + s * 0.08;
    const spine = scaleRibbon(
      ctx, pelvis.x, pelvis.y, cx, cy, tipX, tipY,
      s * 0.07 * kb.heavy, kb.hide, shade(kb.hide, -26),
    );
    // The bare flesh tip: the last third of the whip pales out.
    ctx.strokeStyle = '#bd8578';
    ctx.lineCap = 'round';
    for (let i = 5; i < spine.length - 1; i++) {
      const p = spine[i]!;
      const q = spine[i + 1]!;
      ctx.lineWidth = Math.max(1, p.w * 1.7);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  // The gnoll's bushy tail likewise goes down first — a slack brush
  // off the pelvis with its dark tip, still speaking the species from
  // a body-pile (corpse identity law).
  if (look.gno) {
    const gn = look.gno;
    const tipX = pelvis.x - ux * s * 0.34 * gn.heavy;
    const tipY = pelvis.y - uy * s * 0.34 * gn.heavy + s * 0.09;
    const cx = pelvis.x - ux * s * 0.16 * gn.heavy + s * 0.02;
    const cy = pelvis.y - uy * s * 0.16 * gn.heavy + s * 0.07;
    const spine = scaleRibbon(
      ctx, pelvis.x, pelvis.y, cx, cy, tipX, tipY,
      s * 0.11 * gn.heavy, gn.fur, shade(gn.fur, -26),
    );
    const tip = spine[spine.length - 1]!;
    const pre = spine[spine.length - 3]!;
    ctx.fillStyle = gn.spot;
    ctx.beginPath();
    ctx.ellipse(
      (tip.x + pre.x) / 2,
      (tip.y + pre.y) / 2,
      s * 0.055 * gn.heavy,
      s * 0.04 * gn.heavy,
      Math.atan2(tip.y - pre.y, tip.x - pre.x),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // Far pair behind the trunk.
  drawArm(H.elbowL, H.handL, -1);
  drawLeg(H.kneeL, H.footL, -1);

  // The off hand keeps what it carried: a shield rides the fallen
  // forearm (half-pinned under the trunk, as a real fall would leave
  // it), a dual-wielded second blade lies along the far fist. Quivers
  // live on the back — under the body, nothing to show.
  if (gear?.offhand) {
    const offSt = offhandStyle(gear.offhand);
    if (offSt.kind === 'weapon') {
      drawHandWeapon(H.elbowL, H.handL, gear.offhand, gear.offhandEnch);
    } else if (isShieldKind(offSt.kind)) {
      // A dropped shield does not lie flat on its face — it comes down
      // on the arm that wore it and half-rolls onto its rim. It keeps
      // the world painter, laid over on the forearm's own angle and
      // turned steeply enough that the eye reads a fallen SHELL.
      const el = P(f, g[H.elbowL]!);
      const hd = P(f, g[H.handL]!);
      const sh = shieldStyle(gear.offhand, offSt.kind, offSt.color, offSt.trim, offSt.boss);
      drawShieldAt(ctx, sh, {
        cx: (el.x + hd.x) / 2,
        cy: (el.y + hd.y) / 2,
        size: 0.24 * s,
        theta: 1.08,
        tilt: Math.atan2(hd.y - el.y, hd.x - el.x) + Math.PI / 2,
        oside: hd.x >= el.x ? 1 : -1,
      });
    } else if (offSt.kind !== 'quiver') {
      const el = P(f, g[H.elbowL]!);
      const hd = P(f, g[H.handL]!);
      drawOffhandOnArm(ctx, offSt, { kx: el.x, ky: el.y, ex: hd.x, ey: hd.y }, s, 0.3, false, nowMs);
    }
  }

  // A robe's skirt lies past the hips, a slack cloth fan behind the
  // trunk — no flutter on the dead.
  if (bodySt && bodySt.skirt > 0) {
    const skL = bodySt.skirt * s;
    const hemW = ww * 1.3;
    ctx.fillStyle = cloth;
    ctx.beginPath();
    ctx.moveTo(pelvis.x + nx * ww, pelvis.y + ny * ww);
    ctx.lineTo(pelvis.x - nx * ww, pelvis.y - ny * ww);
    ctx.lineTo(pelvis.x - ux * skL - nx * hemW, pelvis.y - uy * skL - ny * hemW);
    ctx.lineTo(pelvis.x - ux * skL + nx * hemW, pelvis.y - uy * skL + ny * hemW);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = bodySt.trim;
    ctx.lineWidth = Math.max(1, s * 0.024);
    ctx.beginPath();
    ctx.moveTo(pelvis.x - ux * skL - nx * hemW, pelvis.y - uy * skL - ny * hemW);
    ctx.lineTo(pelvis.x - ux * skL + nx * hemW, pelvis.y - uy * skL + ny * hemW);
    ctx.stroke();
  }

  // Trunk: shoulders→waist trapezoid + hard shade half + belt band.
  const c1 = { x: chest.x + nx * tw, y: chest.y + ny * tw };
  const c2 = { x: chest.x - nx * tw, y: chest.y - ny * tw };
  const p1 = { x: pelvis.x + nx * ww, y: pelvis.y + ny * ww };
  const p2 = { x: pelvis.x - nx * ww, y: pelvis.y - ny * ww };
  ctx.fillStyle = cloth;
  ctx.beginPath();
  ctx.moveTo(c1.x, c1.y);
  ctx.lineTo(c2.x, c2.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.closePath();
  ctx.fill();
  // Shade the half facing screen-down — the side against the ground.
  const downSide = ny >= 0 ? 1 : -1;
  ctx.fillStyle = shade(cloth, -14);
  ctx.beginPath();
  ctx.moveTo(chest.x, chest.y);
  ctx.lineTo(chest.x + nx * downSide * tw, chest.y + ny * downSide * tw);
  ctx.lineTo(pelvis.x + nx * downSide * ww, pelvis.y + ny * downSide * ww);
  ctx.lineTo(pelvis.x, pelvis.y);
  ctx.closePath();
  ctx.fill();
  // A plated cuirass keeps its center seam on the fallen breastplate.
  if (bodySt?.cls === 'plate') {
    ctx.strokeStyle = bodySt.metal ?? shade(bodySt.color, -20);
    ctx.lineWidth = Math.max(1, s * 0.022);
    ctx.beginPath();
    ctx.moveTo(pelvis.x + ux * s * 0.12, pelvis.y + uy * s * 0.12);
    ctx.lineTo(chest.x, chest.y);
    ctx.stroke();
  }
  // Belt band riding just above the pelvis.
  ctx.strokeStyle = bodySt ? bodySt.trim : shade(look.bodyColor, -34);
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
  if (look.kob) {
    // The kobold corpse head in profile: the big dish ear behind a
    // low cranium, the long snout out one side with the pale jaw
    // slack under it, whiskers gone still — and the crown candle
    // SNUFFED, a bare wax stub with no flame (the light goes out on
    // death, the skeleton epic's law). Identity by silhouette.
    const kb = look.kob;
    const hv = kb.heavy;
    // The dish ear behind the skull, membrane down against the fall.
    ctx.fillStyle = shade(kb.hide, -8);
    ctx.beginPath();
    ctx.arc(-hw * 0.62, -hh * 0.42, hh * 0.5 * (0.85 + 0.15 * hv), 0, Math.PI * 2);
    ctx.fill();
    // Low cranium, sunk and small.
    ctx.fillStyle = kb.hide;
    ctx.beginPath();
    chamferRect(ctx, -hw, -hh * 0.7, hw * 2, hh * 1.3, [cut * 1.4, cut * 1.4, cut * 0.5, cut * 0.5]);
    ctx.fill();
    // The mane collapses over the crown on the digmaster.
    if (kb.mane) {
      ctx.fillStyle = kb.mane;
      for (let i = 0; i < 3; i++) {
        const bx = -hw * 0.5 + i * hw * 0.42;
        ctx.beginPath();
        ctx.moveTo(bx - hw * 0.14, -hh * 0.6);
        ctx.lineTo(bx - hw * 0.28, -hh * (0.95 + 0.1 * Math.sin(i * 2.4)));
        ctx.lineTo(bx + hw * 0.16, -hh * 0.56);
        ctx.closePath();
        ctx.fill();
      }
    }
    // The long snout out the +x side, jaw slack beneath it.
    ctx.fillStyle = kb.hide;
    ctx.beginPath();
    chamferRect(ctx, hw * 0.5, -hh * 0.34, hw * 1.35, hh * 0.66, [0, cut * 0.4, cut * 0.5, 0]);
    ctx.fill();
    ctx.fillStyle = kb.belly;
    ctx.beginPath();
    chamferRect(ctx, hw * 0.45, hh * 0.42, hw * 1.05, hh * 0.24, [0, 0, cut * 0.4, cut * 0.4]);
    ctx.fill();
    // The nose pad at the tip; whiskers slack; no eye ever again.
    ctx.fillStyle = kb.nose;
    ctx.beginPath();
    ctx.arc(hw * 1.78, -hh * 0.04, hh * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(238,228,205,0.7)';
    ctx.lineWidth = Math.max(1, hh * 0.035);
    for (const dy of [0.08, 0.22]) {
      ctx.beginPath();
      ctx.moveTo(hw * 1.5, hh * 0.02);
      ctx.quadraticCurveTo(hw * 1.2, hh * (dy + 0.1), hw * 0.95, hh * (dy + 0.3));
      ctx.stroke();
    }
    // Buck incisors resting on the slack jaw.
    ctx.fillStyle = '#efe6cf';
    ctx.beginPath();
    chamferRect(ctx, hw * 1.5, hh * 0.14, hh * 0.09, hh * 0.2, [0, 0, hh * 0.03, hh * 0.03]);
    ctx.fill();
    // The digger's bristle scruff, flattened by the fall.
    if (!kb.mane) {
      ctx.fillStyle = shade(kb.hide, -20);
      for (let i = 0; i < 3; i++) {
        const bx = -hw * 0.42 + i * hw * 0.34;
        ctx.beginPath();
        ctx.moveTo(bx - hw * 0.1, -hh * 0.62);
        ctx.lineTo(bx - hw * 0.16, -hh * (0.82 + 0.06 * Math.sin(i * 2.1)));
        ctx.lineTo(bx + hw * 0.12, -hh * 0.58);
        ctx.closePath();
        ctx.fill();
      }
    }
  } else if (look.gno) {
    // The gnoll corpse head in profile: the tall round ear behind a
    // broad low cranium, the blunt deep muzzle out one side with the
    // pale mandible slack under it and the underbite still proud of
    // the lip — the laugh finally out of it. Crest collapsed over the
    // crown, dapple on the cheek. Identity by silhouette.
    const gn = look.gno;
    const hv = gn.heavy;
    // The tall ear behind the skull, dish down against the fall.
    ctx.fillStyle = shade(gn.fur, -8);
    ctx.beginPath();
    ctx.ellipse(-hw * 0.58, -hh * 0.66, hh * 0.3 * (0.9 + 0.16 * hv), hh * 0.5 * (0.9 + 0.16 * hv), -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = shade(gn.fur, -26);
    ctx.lineWidth = Math.max(1, hh * 0.06);
    ctx.stroke();
    // Broad low cranium.
    ctx.fillStyle = gn.fur;
    ctx.beginPath();
    chamferRect(ctx, -hw * 1.06, -hh * 0.66, hw * 2.06, hh * 1.24, [cut * 1.3, cut * 1.3, cut * 0.6, cut * 0.6]);
    ctx.fill();
    // Cheek dapple — the coat reads even in death.
    ctx.fillStyle = gn.spot;
    const dseed = gn.seed ?? 0;
    for (let i = 0; i < 3; i++) {
      const h = ((dseed >>> (i * 4)) ^ (dseed * 37 + i * 61)) | 0;
      const bx = -hw * 0.5 + ((h & 15) / 15) * hw * 0.9;
      const by = -hh * 0.3 + (((h >> 4) & 15) / 15) * hh * 0.6;
      ctx.beginPath();
      ctx.ellipse(bx, by, hh * 0.09, hh * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // The crest collapses over the crown and nape.
    ctx.fillStyle = gn.mane;
    for (let i = 0; i < 4; i++) {
      const bx = -hw * 0.8 + i * hw * 0.38;
      ctx.beginPath();
      ctx.moveTo(bx - hw * 0.14, -hh * 0.56);
      ctx.lineTo(bx - hw * 0.3, -hh * (0.9 + 0.12 * Math.sin(i * 2.3)) * (1 + 0.3 * (hv - 1)));
      ctx.lineTo(bx + hw * 0.16, -hh * 0.52);
      ctx.closePath();
      ctx.fill();
    }
    // The blunt deep muzzle out the +x side — half the wolf's reach,
    // twice the depth; fur to the lip with the dark mask saddle on
    // the bridge, matching the living head.
    ctx.fillStyle = shade(gn.fur, -4);
    ctx.beginPath();
    chamferRect(ctx, hw * 0.6, -hh * 0.3, hw * 0.98, hh * 0.78, [0, cut * 0.5, cut * 0.6, 0]);
    ctx.fill();
    ctx.fillStyle = gn.mask;
    ctx.beginPath();
    chamferRect(ctx, hw * 0.6, -hh * 0.3, hw * 0.98, hh * 0.24, [0, cut * 0.4, 0, 0]);
    ctx.fill();
    // Slack pale mandible under it.
    ctx.fillStyle = gn.underfur;
    ctx.beginPath();
    chamferRect(ctx, hw * 0.56, hh * 0.5, hw * 0.86, hh * 0.22, [0, 0, cut * 0.4, cut * 0.4]);
    ctx.fill();
    // The underbite: up-teeth still proud of the slack jaw.
    ctx.fillStyle = '#efe6cf';
    for (const off of [0.72, 1.02]) {
      ctx.beginPath();
      ctx.moveTo(hw * off - hh * 0.05, hh * 0.5);
      ctx.lineTo(hw * off, hh * 0.5 - hh * 0.18 * (1 + 0.25 * (hv - 1)));
      ctx.lineTo(hw * off + hh * 0.05, hh * 0.5);
      ctx.closePath();
      ctx.fill();
    }
    // The broad nose on the blunt tip; no eye ever again.
    ctx.fillStyle = gn.nose;
    ctx.beginPath();
    ctx.ellipse(hw * 1.5, -hh * 0.02, hh * 0.18, hh * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = look.skinColor;
    ctx.beginPath();
    chamferRect(ctx, -hw, -hh, hw * 2, hh * 2, cut);
    ctx.fill();
    // THE COVERAGE LAW carries into death: the crown slab of hair only
    // shows where the headwear allows it — a helmet stays seated on
    // the corpse, it never rolls away.
    if (!helmSt || helmSt.kind === 'circlet') {
      // THE OVERHANG LAW rides into death too: the slab clears the
      // skull's chamfered corners instead of leaving skin flares.
      ctx.fillStyle = look.hairColor;
      ctx.beginPath();
      chamferRect(ctx, -hw * 1.04, -hh * 1.05, hw * 2.08, hh * 0.69, [cut * 1.15, cut * 1.15, 0, 0]);
      ctx.fill();
    }
    if (helmSt) {
      // The live helmet painter runs inside the fallen head's rotated
      // frame — crown toward -y, face up out of the sprawl (the skull
      // painter's own read), so every kind keeps its silhouette.
      drawHelmet(ctx, helmSt, {
        s,
        headX: 0,
        headY: 0,
        hw,
        hh,
        cut,
        headR,
        fx: 0,
        profileK: 0,
        backK: 0,
        lead: 1,
        hurt: false,
        nowMs,
      });
    }
  }
  ctx.restore();

  // Near pair over the trunk.
  drawLeg(H.kneeR, H.footR, 1);
  drawArm(H.elbowR, H.handR, 1);

  // The steel goes with them: the mainhand lies in the near fist.
  if (gear?.weapon) drawHandWeapon(H.elbowR, H.handR, gear.weapon, gear.weaponEnch);
}

/**
 * The skeleton's corpse keeps the bone dialect: bare bone limbs with
 * condyle knobs, the open rib cage and vertebra chain along the fallen
 * trunk axis, and the skull — sockets dark (the light in them goes out
 * with the kill), jaw slack, crown still seated on royalty. A pile of
 * bones you can read the variant from.
 */
function drawSkeletonRagdoll(
  ctx: CanvasRenderingContext2D,
  rag: Ragdoll,
  f: RagFrame,
  size: number,
  sk: SkeletonLook,
): void {
  const s = f.s * size;
  const hv = sk.heavy;
  const bone = sk.bone;
  const g = rag.pts;
  const pelvis = P(f, g[H.pelvis]!);
  const chest = P(f, g[H.chest]!);
  const head = P(f, g[H.head]!);

  // Trunk axis pelvis→chest, with its perpendicular.
  let ux = chest.x - pelvis.x;
  let uy = chest.y - pelvis.y;
  const ul = Math.hypot(ux, uy) || 1e-4;
  ux /= ul;
  uy /= ul;
  const nx = -uy;
  const ny = ux;
  const tw = 0.185 * s;
  const ww = 0.125 * s;

  const knob = (x: number, y: number, r: number): void => {
    ctx.fillStyle = bone;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1.4, r), 0, Math.PI * 2);
    ctx.fill();
  };
  const drawLeg = (knee: number, foot: number, hipSide: number): void => {
    const hip = {
      x: pelvis.x + nx * hipSide * ww * 0.7,
      y: pelvis.y + ny * hipSide * ww * 0.7,
    };
    const k = P(f, g[knee]!);
    const ft = P(f, g[foot]!);
    limb(ctx, hip, k, ft, shade(bone, -3), bone, s * 0.062 * hv, s * 0.05 * hv);
    knob(k.x, k.y, s * 0.04 * hv);
    chip(ctx, ft, k, s * 0.085, s * 0.07, bone);
  };
  const drawArmB = (elbow: number, hand: number, side: number): void => {
    const sh = {
      x: chest.x + nx * side * tw * 0.85,
      y: chest.y + ny * side * tw * 0.85,
    };
    const el = P(f, g[elbow]!);
    const hd = P(f, g[hand]!);
    limb(ctx, sh, el, hd, shade(bone, -3), bone, s * 0.056 * hv, s * 0.046 * hv);
    knob(el.x, el.y, s * 0.036 * hv);
    chip(ctx, hd, el, s * 0.07, s * 0.06, bone);
  };

  // Far pair behind the trunk.
  drawArmB(H.elbowL, H.handL, -1);
  drawLeg(H.kneeL, H.footL, -1);

  // --- the fallen cage: cavity slab, rib bars crossing the axis, the
  // sternum riding the up-facing edge, then the vertebra chain down to
  // the pelvis bowl. Same reads as the live ribcage, lying down.
  const cageT = 0.62; // fraction of the trunk the ribcage occupies (chest end)
  const c1 = { x: chest.x + nx * tw * 0.92, y: chest.y + ny * tw * 0.92 };
  const c2 = { x: chest.x - nx * tw * 0.92, y: chest.y - ny * tw * 0.92 };
  const mx = pelvis.x + ux * ul * (1 - cageT);
  const my = pelvis.y + uy * ul * (1 - cageT);
  const m1 = { x: mx + nx * ww * 1.0, y: my + ny * ww * 1.0 };
  const m2 = { x: mx - nx * ww * 1.0, y: my - ny * ww * 1.0 };
  ctx.fillStyle = sk.cavity;
  ctx.beginPath();
  ctx.moveTo(c1.x, c1.y);
  ctx.lineTo(c2.x, c2.y);
  ctx.lineTo(m2.x, m2.y);
  ctx.lineTo(m1.x, m1.y);
  ctx.closePath();
  ctx.fill();
  // Rib bars: three hoops crossing the trunk axis.
  ctx.lineCap = 'round';
  ctx.strokeStyle = bone;
  ctx.lineWidth = Math.max(1.6, s * 0.042 * hv);
  for (const t of [0.18, 0.5, 0.82]) {
    const rx = mx + ux * ul * cageT * (1 - t) + ux * 0;
    const ry = my + uy * ul * cageT * (1 - t);
    const w = (ww + (tw - ww) * (1 - t)) * 0.95;
    ctx.beginPath();
    ctx.moveTo(rx + nx * w, ry + ny * w);
    ctx.lineTo(rx - nx * w, ry - ny * w);
    ctx.stroke();
  }
  // Sternum: a short bar along the axis over the rib mids.
  ctx.strokeStyle = shade(bone, 8);
  ctx.lineWidth = Math.max(1.6, s * 0.05 * hv);
  ctx.beginPath();
  ctx.moveTo(mx + ux * ul * cageT * 0.12, my + uy * ul * cageT * 0.12);
  ctx.lineTo(mx + ux * ul * cageT * 0.86, my + uy * ul * cageT * 0.86);
  ctx.stroke();
  // Vertebrae: beads from cage bottom to the pelvis.
  ctx.lineCap = 'butt';
  for (const t of [0.22, 0.55, 0.85]) {
    const bx = pelvis.x + ux * ul * (1 - cageT) * (1 - t);
    const by = pelvis.y + uy * ul * (1 - cageT) * (1 - t);
    ctx.fillStyle = shade(bone, t > 0.5 ? -8 : 0);
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(Math.atan2(uy, ux));
    ctx.beginPath();
    chamferRect(ctx, -0.024 * s, -0.038 * s * hv, 0.048 * s, 0.076 * s * hv, 0.012 * s);
    ctx.fill();
    ctx.restore();
  }
  // Pelvis bowl: wings flaring perpendicular off the pelvis point.
  for (const es of [-1, 1]) {
    ctx.fillStyle = shade(bone, es > 0 ? -8 : 2);
    ctx.beginPath();
    ctx.moveTo(pelvis.x + ux * 0.03 * s, pelvis.y + uy * 0.03 * s);
    ctx.lineTo(pelvis.x + nx * es * ww * 1.0 + ux * 0.05 * s, pelvis.y + ny * es * ww * 1.0 + uy * 0.05 * s);
    ctx.lineTo(pelvis.x + nx * es * ww * 0.72 - ux * 0.05 * s, pelvis.y + ny * es * ww * 0.72 - uy * 0.05 * s);
    ctx.lineTo(pelvis.x - ux * 0.045 * s, pelvis.y - uy * 0.045 * s);
    ctx.closePath();
    ctx.fill();
  }
  // Clavicle line + shoulder knobs at the chest end.
  ctx.strokeStyle = shade(bone, 4);
  ctx.lineWidth = Math.max(1.4, s * 0.03);
  ctx.beginPath();
  ctx.moveTo(c1.x, c1.y);
  ctx.lineTo(c2.x, c2.y);
  ctx.stroke();
  knob(c1.x, c1.y, s * 0.042 * hv);
  knob(c2.x, c2.y, s * 0.042 * hv);

  // --- the skull, staring up out of the sprawl: cranium, stepped
  // maxilla, slack mandible, both sockets dark. Crown stays seated.
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
  const crTop = -hh * 1.06;
  const crBot = hh * 0.32;
  ctx.fillStyle = bone;
  ctx.beginPath();
  chamferRect(ctx, -hw, crTop, hw * 2, crBot - crTop, [cut * 1.15, cut * 1.15, cut * 0.4, cut * 0.4]);
  ctx.fill();
  ctx.fillStyle = shade(bone, -9);
  ctx.fillRect(0, crTop, hw, crBot - crTop);
  const mxHw = hw * 0.72;
  ctx.fillStyle = shade(bone, -5);
  ctx.beginPath();
  chamferRect(ctx, -mxHw, crBot - hh * 0.06, mxHw * 2, hh * 0.66, [0, 0, cut * 0.5, cut * 0.5]);
  ctx.fill();
  // Mandible hangs slack — death's small open question.
  const mdHw = hw * 0.56;
  const mdTop = hh * 0.72;
  ctx.fillStyle = shade(bone, -11);
  ctx.beginPath();
  chamferRect(ctx, -mdHw, mdTop, mdHw * 2, hh * 0.36, [0, 0, cut * 0.5, cut * 0.5]);
  ctx.fill();
  ctx.fillStyle = shade(bone, 12);
  ctx.fillRect(-mdHw * 0.85, mdTop, mdHw * 1.7, hh * 0.13);
  // Sockets and nasal wedge: hollow dark — whatever burned here is out.
  ctx.fillStyle = '#241a2e';
  for (const es of [-1, 1]) {
    ctx.beginPath();
    chamferRect(ctx, es * headR * 0.42 - headR * 0.16, -hh * 0.26, headR * 0.32, headR * 0.34, headR * 0.09);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-headR * 0.08, hh * 0.24);
  ctx.lineTo(headR * 0.08, hh * 0.24);
  ctx.lineTo(0, hh * 0.46);
  ctx.closePath();
  ctx.fill();
  if (sk.cracked) {
    ctx.strokeStyle = shade(bone, -26);
    ctx.lineWidth = Math.max(1, headR * 0.055);
    ctx.beginPath();
    ctx.moveTo(-hw * 0.3, crTop + hh * 0.1);
    ctx.lineTo(-hw * 0.52, -hh * 0.5);
    ctx.lineTo(-hw * 0.38, -hh * 0.16);
    ctx.stroke();
  }
  if (sk.crown) {
    const bandY = crTop + hh * 0.3;
    const bandH = hh * 0.26;
    ctx.fillStyle = sk.crown.band;
    ctx.fillRect(-hw * 0.98, bandY, hw * 1.96, bandH);
    ctx.fillStyle = shade(sk.crown.band, -14);
    ctx.fillRect(0, bandY, hw * 0.98, bandH);
    ctx.fillStyle = sk.crown.band;
    for (const ot of [-0.68, 0, 0.68]) {
      ctx.beginPath();
      ctx.moveTo(ot * hw - hw * 0.14, bandY + bandH * 0.1);
      ctx.lineTo(ot * hw + hw * 0.14, bandY + bandH * 0.1);
      ctx.lineTo(ot * hw, bandY - hh * (ot === 0 ? 0.46 : 0.32));
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();

  // Near pair over the trunk.
  drawLeg(H.kneeR, H.footR, 1);
  drawArmB(H.elbowR, H.handR, 1);
}

export interface BeastCorpseLook {
  spec: BeastSpec;
  radius: number;
  color: string;
  defId: string;
  seed: number;
  /**
   * The plumage the owl wore alive — resolved from the RAW eid at the
   * death instant (the gnoll corpse-coat law), so the fallen body
   * keeps its cluster instead of rolling a stranger's.
   */
  owl?: OwlLook;
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
  } else if (look.defId === 'dire_wolf') {
    // The great brush lies limp, the frost tip still pale on the dead.
    const tx = rear.x - Math.cos(spineA) * len * 0.58;
    const tipY = f.ay + g[0]!.floor * f.s + s * 0.02;
    const brush = taperedSpinePath(
      rear.x,
      rear.y,
      (rear.x + tx) / 2,
      Math.max(rear.y, tipY) + s * 0.03,
      tx,
      tipY,
      (t) => s * (0.038 + 0.056 * Math.sin(Math.PI * Math.pow(t, 0.9))),
    );
    ctx.fillStyle = shade(DIREWOLF_LOOK.coat, -6);
    ctx.fill(brush);
    ctx.fillStyle = DIREWOLF_LOOK.grizzle;
    ctx.beginPath();
    facetCircle(ctx, tx, tipY, s * 0.044, 5, spineA);
    ctx.fill();
  } else if (look.defId === 'worg') {
    // The ratty crook drops dead straight — no kink left in it.
    const tx = rear.x - Math.cos(spineA) * len * 0.5;
    const tipY = f.ay + g[0]!.floor * f.s + s * 0.015;
    ctx.strokeStyle = shade(WORG_LOOK.hide, -14);
    ctx.lineWidth = Math.max(1.5, s * 0.026);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rear.x, rear.y);
    ctx.quadraticCurveTo((rear.x + tx) / 2, Math.max(rear.y, tipY) + s * 0.02, tx, tipY);
    ctx.stroke();
    ctx.lineCap = 'butt';
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
  } else if (look.owl) {
    // The tail fan splays flat on the ground behind the rump.
    const owl = look.owl;
    const backA = spineA + Math.PI;
    const tbx = rear.x + Math.cos(backA) * len * 0.2;
    const tby = rear.y + Math.sin(backA) * len * 0.2;
    ctx.lineCap = 'round';
    for (let k = 0; k < 4; k++) {
      const a = backA + (k / 3 - 0.5) * 0.9;
      const blade = owl.tailLen * s * (1 - 0.28 * Math.abs(k / 3 - 0.5) * 2);
      ctx.strokeStyle = shade(owl.mantle, k % 2 === 0 ? -4 : -12);
      ctx.lineWidth = Math.max(2, s * 0.05);
      ctx.beginPath();
      ctx.moveTo(tbx, tby);
      ctx.lineTo(tbx + Math.cos(a) * blade, tby + Math.sin(a) * blade * 0.55);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
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
  } else if (look.defId === 'dire_wolf') {
    // The hackle ridge keeps the corpse's identity — paintDireWolfBody
    // draws it outside the hull, so it survives the collapse.
    paintDireWolfBody(ctx, spec, DIREWOLF_LOOK, {
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
  } else if (look.defId === 'worg') {
    paintWorgBody(ctx, spec, WORG_LOOK, {
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
  } else if (look.defId === 'stag' || look.defId === 'hind') {
    paintStagBody(ctx, spec, look.defId === 'hind' ? HIND_LOOK : STAG_LOOK, {
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
  } else if (look.owl) {
    // The fallen owl: the keg collapsed on its side, ONE wing thrown
    // wide across the ground showing its pale underside — the classic
    // dead-bird splay that tells the whole story from twenty tiles.
    // The other wing is pinned under the body; honesty needs no stub.
    // The plumage carries over from life.
    const owl = look.owl;
    const side = ((look.seed >> 3) & 1) === 0 ? 1 : -1;
    paintOwlBody(ctx, spec, owl, {
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
      topScale: 0.45,
      botH: 0.02,
    });
    owlWingFan(ctx, owl, {
      x: midX - Math.cos(spineA) * len * 0.05,
      y: midY + r * 0.1,
      s,
      ang: spineA + side * 2.2,
      spread: 1,
      span: owl.wingSpan * 0.9,
      under: true,
      squash: 0.5,
      seed: look.seed,
    });
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
  } else if (look.defId === 'dire_wolf') {
    // The ember goes out — dead eyes law, notch and fangs stay.
    drawDireWolfHead(ctx, DIREWOLF_LOOK, {
      x: head.x,
      y: head.y,
      s,
      fx: Math.cos(neckA),
      fy: Math.sin(neckA),
      ys: 1,
      dead: true,
    });
  } else if (look.defId === 'worg') {
    drawWorgHead(ctx, WORG_LOOK, {
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
  } else if (look.defId === 'stag' || look.defId === 'hind') {
    drawStagHead(ctx, look.defId === 'hind' ? HIND_LOOK : STAG_LOOK, {
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
  } else if (look.owl) {
    // The disc face-down or side-on, lamps out — the dead-eyes law.
    drawOwlHead(ctx, look.owl, {
      x: head.x,
      y: head.y,
      s,
      fx: Math.cos(neckA),
      fy: Math.sin(neckA),
      ys: 1,
      dead: true,
      seed: look.seed,
    });
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
