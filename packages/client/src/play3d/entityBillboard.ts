/**
 * THE BODY ON A CARD (play3d S2) — one billboard per living entity.
 *
 * An EntityBillboard is a per-body canvas painted by the PRODUCTION
 * rigs — `drawHumanoid` on a `LegSolver` gait (players, townsfolk,
 * the humanoid monsters) or `drawBeast` on the universal `LegRig`
 * (every four-legged thing `beastSpec` knows) — and uploaded as a
 * CanvasTexture ONLY when the body is visible and something changed:
 * it moved, it is settling, its pose turned, its kit changed, or the
 * slow idle-breath cadence came due. The ~20 lines of projection glue
 * are the July spike's, with one addition: the facing, the solved feet
 * and the pole are rotated by the camera yaw before they are painted,
 * so an orbiting camera sees the body's true relative facing (yaw 0 =
 * the 2D game's frame, so `relDir = dir + yaw`).
 *
 * Laws:
 *  - The rig ALWAYS advances (gait state is continuous, movement is
 *    the animation driver); only the PAINT is gated.
 *  - A kind swap (new weapon, cape on/off) is a repaint, never a new
 *    mesh: the canvas, texture and material outlive the kit.
 *  - The nameplate rides the card, above the head, in the 2D game's
 *    ink — the DOM never has to chase a body.
 *  - Bodies at 56 px/tile (the spike's readable close-up density).
 *
 * Not yet (S2 ledger): the legless painters (oozes, bats, adders),
 * owls, mounts, corpses/ragdolls, worn-light auras, status FX, the
 * dialect looks (goblin/skeleton/kobold/... clusters) — those bodies
 * paint as plain humanoids in the def's colour for now.
 */
import * as THREE from 'three';
import { DEFAULT_LOOK, PoseState, type Look } from '@arx/shared';
import { LegSolver, beastSpec, drawBeast, drawHumanoid, type BeastSpec } from '../render/rig.js';
import { LegRig, type LegPose } from '../render/legs.js';
import { CapeSim, capeStyle, drawCape } from '../render/cape.js';
import { windAtInto, type WindSample } from '../render/grass.js';
import { outlineRing } from './outline.js';
import {
  BillboardBuffer,
  billboardDepthMaterial,
  billboardMaterial,
  type BillboardClock,
} from './billboardMaterial.js';

const ENTITY_PX = 56;
/** The 2.5D ground squash the painters were tuned under. */
const Y_SQUASH = 0.6;
/** Idle bodies still breathe: repaint at least this often when visible. */
const IDLE_REPAINT_MS = 180;
/** Pose-turn ease (the 2D anim clock's 300 ms). */
const POSE_EASE_MS = 300;

export interface HumanoidKind {
  body: 'humanoid';
  bodyColor: string;
  isOwn: boolean;
  look?: Look;
  capeId?: string;
  size?: number;
  skinColor?: string;
  weaponItem?: string;
  headItem?: string;
  bodyItem?: string;
  legsItem?: string;
  bootsItem?: string;
  glovesItem?: string;
  offhandItem?: string;
  carryStyle?: 'normal' | 'rogue';
  carryOff?: 'normal' | 'rogue';
}

export interface BeastKind {
  body: 'beast';
  defId: string;
  radius: number;
  color: string;
  speed: number;
  collar?: string;
}

export type BodyKind = HumanoidKind | BeastKind;

/** A kind's identity — equal strings mean the same painted kit. */
export function kindKey(k: BodyKind): string {
  if (k.body === 'beast') return `b|${k.defId}|${k.collar ?? ''}`;
  return `h|${k.bodyColor}|${k.capeId ?? ''}|${k.size ?? 1}|${k.skinColor ?? ''}|${k.weaponItem ?? ''}|${k.headItem ?? ''}|${k.bodyItem ?? ''}|${k.legsItem ?? ''}|${k.bootsItem ?? ''}|${k.glovesItem ?? ''}|${k.offhandItem ?? ''}|${k.carryStyle ?? ''}|${k.carryOff ?? ''}|${k.look ? JSON.stringify(k.look) : ''}`;
}

/** What the world says about the body this frame. */
export interface BodyState {
  x: number;
  y: number;
  groundY: number;
  dir: number;
  pose: number;
  hurt: boolean;
  name?: string;
  level?: number;
  /** Nameplate ink (faction tint); default parchment. */
  nameInk?: string;
}

const wind: WindSample = { bx: 0, by: 0, s: 0, l: 0 };

/** Canvas geometry for a kind: size and the feet anchor. */
function cardFor(k: BodyKind): { w: number; h: number; ax: number; ay: number; headUp: number } {
  const S = ENTITY_PX;
  if (k.body === 'beast') {
    const r = k.radius;
    const w = Math.ceil(Math.max(160, (r * 4 + 1.6) * S));
    const h = Math.ceil(Math.max(128, (r * 3 + 1.6) * S));
    return { w, h, ax: w / 2, ay: h - Math.round(0.45 * S), headUp: (r * 2.6 + 0.45) * S };
  }
  const size = k.size ?? 1;
  const w = Math.ceil(224 * Math.max(1, size));
  const h = Math.ceil(192 * Math.max(1, size));
  return { w, h, ax: w / 2, ay: h - Math.round(28 * Math.max(1, size)), headUp: 1.72 * S * size };
}

export class EntityBillboard {
  readonly mesh: THREE.Mesh;
  private readonly buf: BillboardBuffer;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly tex: THREE.CanvasTexture;
  private readonly mat: THREE.ShaderMaterial;
  private readonly depthMat: THREE.ShaderMaterial;
  private kind: BodyKind;
  private key: string;
  private card = { w: 1, h: 1, ax: 0, ay: 0, headUp: 0 };
  private legs: LegSolver | LegRig;
  private spec: BeastSpec | null = null;
  private cape: CapeSim | null = null;
  private readonly kneeMemory: number[] = [0, 0];
  private readonly depthMemory = { mainBehind: false };
  private readonly feet: Array<{ x: number; y: number; lift: number }> = [];
  /** The rotated pose handed to the painters (reused, never allocated per frame). */
  private readonly relPose: LegPose = {
    feet: this.feet,
    dir: 0,
    bob: 0,
    rise: 0,
    wScale: 1,
    poleX: 0,
    poleY: 0,
    poleStrength: 0,
    runF: 0,
    align: 1,
  };
  private restfulSince = 0;
  private lastPaintMs = -1e9;
  private lastX = NaN;
  private lastY = NaN;
  private lastPose = -1;
  private poseSince = 0;
  private lastHurt = false;
  private lastName = '';
  private walkPhase = 0;
  private dirty = true;
  /** Confession: repaints (each is one texture upload). */
  paints = 0;

  constructor(
    kind: BodyKind,
    private readonly clock: BillboardClock,
    private readonly seed = 7,
  ) {
    this.kind = kind;
    this.key = kindKey(kind);
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.magFilter = THREE.LinearFilter;
    this.tex.minFilter = THREE.LinearFilter;
    this.tex.generateMipmaps = false;
    this.buf = new BillboardBuffer(1);
    this.legs = this.makeLegs(kind);
    this.fitCard();
    this.buf.commit();
    this.mat = billboardMaterial(this.tex, clock, { alphaTest: 0.35, sway: false });
    this.depthMat = billboardDepthMaterial(this.tex, clock, { alphaTest: 0.35, sway: false });
    this.mesh = new THREE.Mesh(this.buf.geometry, this.mat);
    this.mesh.customDepthMaterial = this.depthMat;
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = true;
    this.mesh.name = 'entity';
  }

  private makeLegs(kind: BodyKind): LegSolver | LegRig {
    if (kind.body === 'beast') {
      this.spec = beastSpec(kind.defId, kind.radius, kind.speed);
      return new LegRig(this.spec.rig);
    }
    this.spec = null;
    return new LegSolver(kind.size ?? 1);
  }

  /** Size the canvas + quad for the current kind (a rare, gated event). */
  private fitCard(): void {
    const c = cardFor(this.kind);
    this.card = c;
    if (this.canvas.width !== c.w || this.canvas.height !== c.h) {
      this.canvas.width = c.w;
      this.canvas.height = c.h;
    }
    const w = c.w / ENTITY_PX;
    const h = c.h / ENTITY_PX;
    this.buf.set(0, 0, 0, 0, w, h, 0, 0, 1, 1, c.ax / c.w, (c.h - c.ay) / c.h, 0);
    this.buf.geometry.boundingSphere!.radius = Math.max(w, h);
    const k = this.kind;
    this.cape = k.body === 'humanoid' && k.capeId ? new CapeSim(capeStyle(k.capeId), this.seed) : null;
    this.dirty = true;
  }

  get textureBytes(): number {
    return this.canvas.width * this.canvas.height * 4;
  }

  /** Swap the kit; the rig survives when the body plan does. */
  setKind(kind: BodyKind): void {
    const key = kindKey(kind);
    if (key === this.key) return;
    const prev = this.kind;
    const newPlan =
      kind.body !== prev.body ||
      (kind.body === 'beast' && prev.body === 'beast' && kind.defId !== prev.defId) ||
      (kind.body === 'humanoid' && prev.body === 'humanoid' && kind.size !== prev.size);
    this.kind = kind;
    this.key = key;
    if (newPlan) {
      this.legs = this.makeLegs(kind);
      this.kneeMemory.length = 0;
    }
    this.fitCard();
  }

  /**
   * Advance the rig and repaint if the body is visible and something
   * changed. Returns true on repaint.
   */
  update(st: BodyState, dt: number, nowMs: number, camYaw: number, visible: boolean): boolean {
    const { x: wx, y: wy } = st;
    const moved = Number.isNaN(this.lastX) ? 0 : Math.hypot(wx - this.lastX, wy - this.lastY);
    if (moved > 0.001) this.restfulSince = nowMs;
    this.lastX = wx;
    this.lastY = wy;
    if (st.pose !== this.lastPose) {
      this.lastPose = st.pose;
      this.poseSince = nowMs;
      this.dirty = true;
    }
    if (st.hurt !== this.lastHurt) {
      this.lastHurt = st.hurt;
      this.dirty = true;
    }
    const name = st.name ?? '';
    if (name !== this.lastName) {
      this.lastName = name;
      this.dirty = true;
    }
    const pose = this.legs.update(wx, wy, st.dir, dt);
    this.walkPhase += moved * 6;
    this.buf.setOrigin(0, wx, st.groundY, wy);
    this.buf.geometry.boundingSphere!.center.set(wx, st.groundY + 1, wy);
    const settling = nowMs - this.restfulSince < 1400;
    const poseEasing = nowMs - this.poseSince < POSE_EASE_MS + 50;
    const due = nowMs - this.lastPaintMs >= IDLE_REPAINT_MS;
    if (!visible || !(this.dirty || moved > 0.001 || settling || poseEasing || due)) return false;
    this.lastPaintMs = nowMs;
    this.dirty = false;

    // Camera-relative frame: rotate world offsets by the camera yaw so
    // the painted facing band is the one the orbiting camera sees.
    const cy = Math.cos(camYaw);
    const sy = Math.sin(camYaw);
    const relDir = pose.dir + camYaw;
    const S = ENTITY_PX;
    const { ax: AX, ay: AY, w: W, h: H } = this.card;
    const feet = this.feet;
    feet.length = pose.feet.length;
    for (let i = 0; i < pose.feet.length; i++) {
      const f = pose.feet[i]!;
      const dx = f.x - wx;
      const dz = f.y - wy;
      let o = feet[i];
      if (!o) feet[i] = o = { x: 0, y: 0, lift: 0 };
      o.x = AX + (dx * cy - dz * sy) * S;
      o.y = AY + (dx * sy + dz * cy) * S * Y_SQUASH;
      o.lift = f.lift;
    }
    const rp = this.relPose;
    rp.dir = relDir;
    rp.bob = pose.bob;
    rp.rise = pose.rise;
    rp.wScale = pose.wScale;
    rp.poleX = pose.poleX * cy - pose.poleY * sy;
    rp.poleY = pose.poleX * sy + pose.poleY * cy;
    rp.poleStrength = pose.poleStrength;
    rp.runF = pose.runF;
    rp.align = pose.align;

    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const k = this.kind;
    const moving = moved > 0.001;
    const restT = Math.min(1, Math.max(0, (nowMs - this.restfulSince - 350) / 900));
    const tSec = nowMs / 1000;
    const poseT = Math.min(1, (nowMs - this.poseSince) / POSE_EASE_MS);

    if (k.body === 'beast') {
      drawBeast(ctx, {
        x: AX,
        y: AY,
        scale: S,
        dir: relDir,
        radius: k.radius,
        color: k.color,
        defId: k.defId,
        spec: this.spec!,
        pose: rp,
        feet,
        yScale: Y_SQUASH,
        walkPhase: this.walkPhase,
        hurt: st.hurt,
        kneeMemory: this.kneeMemory,
        attackT: st.pose === PoseState.Attack ? poseT : 0,
        seed: this.seed,
        nowMs,
        collar: k.collar,
      });
    } else {
      let paintCape: (() => void) | null = null;
      let capeFront = false;
      if (this.cape) {
        const capeK = k.size ?? 1;
        const hSc = 1 + (1 - pose.wScale) * 0.55;
        const az = (pose.rise + pose.bob * 0.45 + 0.44 * hSc) * capeK;
        windAtInto(wind, wx, wy, tSec);
        this.cape.update(wx, wy, az, st.dir, dt, wind, tSec, capeK);
        capeFront = this.cape.front(Math.sin(relDir));
        const sim = this.cape;
        const capeId = k.capeId!;
        paintCape = () => {
          const pts = sim.nodes.map((nd) => {
            const dx = nd.x - wx;
            const dz = nd.y - wy;
            return {
              x: AX + (dx * cy - dz * sy) * S,
              y: AY + (dx * sy + dz * cy) * S * Y_SQUASH - nd.z * S,
            };
          });
          const breadthK = Math.hypot(Math.sin(relDir), Math.cos(relDir) * 0.45);
          drawCape(ctx, pts, capeStyle(capeId), S * capeK, {
            hurt: st.hurt,
            breadthK,
            hemGlow: Math.min(1, sim.hemSpd / 4.5),
            tSec,
            phase: sim.phase,
          });
        };
      }
      if (paintCape && !capeFront) paintCape();
      drawHumanoid(ctx, {
        x: AX,
        y: AY,
        scale: S,
        dir: relDir,
        pose: st.pose === PoseState.Idle && moving ? PoseState.Walk : st.pose,
        poseT,
        drawT: 0,
        restT,
        nowMs,
        feet,
        bob: pose.bob,
        rise: pose.rise,
        wScale: pose.wScale,
        poleX: rp.poleX,
        poleY: rp.poleY,
        poleStrength: pose.poleStrength,
        runF: pose.runF,
        align: pose.align,
        kneeMemory: this.kneeMemory,
        depthMemory: this.depthMemory,
        bodyColor: k.bodyColor,
        hurt: st.hurt,
        isOwn: k.isOwn,
        weaponItem: k.weaponItem,
        bodyItem: k.bodyItem,
        headItem: k.headItem,
        legsItem: k.legsItem,
        bootsItem: k.bootsItem,
        glovesItem: k.glovesItem,
        offhandItem: k.offhandItem,
        carryStyle: k.carryStyle,
        carryOff: k.carryOff,
        hasCape: this.cape !== null,
        look: k.look ?? DEFAULT_LOOK,
        size: k.size,
        skinColor: k.skinColor,
        gatherPhase: tSec,
      });
      if (paintCape && capeFront) paintCape();
    }
    outlineRing(ctx, W, H, Math.max(1.25, S * 0.04));
    if (name !== '') this.paintName(name, st.level, st.nameInk);
    this.tex.needsUpdate = true;
    this.paints++;
    return true;
  }

  /** The nameplate above the head: the 2D game's parchment ink, ringed. */
  private paintName(name: string, level: number | undefined, ink: string | undefined): void {
    const ctx = this.ctx;
    const { ax, ay, headUp } = this.card;
    const y = Math.max(11, ay - headUp - 4);
    const text = level !== undefined && level > 0 ? `${name}  ${level}` : name;
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(16, 12, 20, 0.9)';
    ctx.strokeText(text, ax, y);
    ctx.fillStyle = ink ?? '#efe6cf';
    ctx.fillText(text, ax, y);
  }

  dispose(): void {
    this.buf.dispose();
    this.mat.dispose();
    this.depthMat.dispose();
    this.tex.dispose();
  }
}
