/**
 * THE PROVING GROUND — the codex's live diagram of what an art DOES
 * (the Techniques room rebuilt, 2026-08-15).
 *
 * A stat card can say "Range 5 · Radius 2.6"; the proving ground DRAWS
 * it: a caster figure stands on a measured floor, the aim runs down a
 * tile ruler, and the cast's true shape — arc, fan, nova, beam, chain,
 * dash, field — is painted in the art's own FX palette (fxStyleFor:
 * the hotbar plate, the battlefield detonation and this diagram are
 * one voice). Dummies stand where bodies would; knockback pushes them,
 * vortexes pull them, statuses wisp over them.
 *
 * Laws:
 * - THE RIG IS THE RULER: the caster figure is one tile tall, the
 *   floor is ticked in tiles, so every distance reads in the world's
 *   own unit (art-scale law).
 * - ONE VOICE: every color but the chrome comes from the ability's
 *   FxStyle. The chrome (ink lines, parchment numerals) comes from
 *   the one material truth.
 * - MOTION IS A GRACE NOTE: the loop breathes at ~30fps only while
 *   the room stands open and the Interface-motion setting allows it;
 *   with motion off, one still frame tells the whole story.
 */

import type { AbilityDef } from '@arx/shared';
import { fxStyleFor, jaggedRingPath, burstStarPath, type FxStyle } from '../render/abilityFx.js';
import { INK, PALETTE } from './kit/tokens.js';

/** Vertical squash of the ground plane — the world's own 2.5D lean. */
const SQUASH = 0.52;
/** One breath of the diagram's animation, ms. */
const LOOP_MS = 2600;
/** The still frame's phase when motion is off — mid-bloom, all legible. */
const STILL_PHASE = 0.42;

interface Layout {
  /** Pixels per tile along the aim axis. */
  ppt: number;
  /** The caster's floor anchor. */
  cx: number;
  cy: number;
  w: number;
  h: number;
}

export interface ProvingGround {
  root: HTMLElement;
  /** Lay a new subject on the ground (honed def). Null clears it. */
  show(ab: AbilityDef | null): void;
  /** Stop the loop and release the canvas. */
  destroy(): void;
}

/** True when the interface has asked for stillness. */
function motionOff(): boolean {
  return (
    document.body.classList.contains('no-ui-motion') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function provingGround(): ProvingGround {
  const root = document.createElement('div');
  root.className = 'proving-ground';
  const canvas = document.createElement('canvas');
  root.appendChild(canvas);
  const caption = document.createElement('div');
  caption.className = 'ground-caption';
  root.appendChild(caption);

  let ab: AbilityDef | null = null;
  let fx: FxStyle | null = null;
  let raf = 0;
  let lastDraw = 0;
  let bornAt = performance.now();
  // The canvas's CSS size, watched — the draw loop never forces layout.
  let boxW = 0;
  let boxH = 0;
  const ro = new ResizeObserver((entries) => {
    for (const e of entries) {
      boxW = e.contentRect.width;
      boxH = e.contentRect.height;
    }
    if (ab) requestAnimationFrame((t) => draw(t));
  });
  ro.observe(canvas);

  const draw = (nowMs: number): void => {
    raf = 0;
    if (!ab || !fx) return;
    if (!root.isConnected) return;
    if (boxW < 40 || boxH < 40) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(boxW * dpr);
    const h = Math.round(boxH * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const phase = motionOff() ? STILL_PHASE : ((nowMs - bornAt) % LOOP_MS) / LOOP_MS;
    render(ctx, w, h, ab, fx, phase);
    lastDraw = nowMs;
    if (!motionOff()) schedule();
  };

  const schedule = (): void => {
    if (raf !== 0) return;
    raf = requestAnimationFrame((t) => {
      // ~30fps is plenty for a breathing diagram.
      if (t - lastDraw < 30) {
        raf = 0;
        schedule();
        return;
      }
      draw(t);
    });
  };

  return {
    root,
    show(next): void {
      ab = next;
      fx = next ? fxStyleFor(next.id, next.color) : null;
      bornAt = performance.now();
      if (!next) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        caption.textContent = '';
        return;
      }
      caption.textContent = shapeStory(next);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      requestAnimationFrame((t) => draw(t));
    },
    destroy(): void {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      ab = null;
      ro.disconnect();
    },
  };
}

/** One plain sentence naming the cast's geometry — the diagram's key. */
function shapeStory(ab: AbilityDef): string {
  const r = ab.range ? `${ab.range} tiles` : '';
  switch (ab.shape) {
    case 'melee_arc':
      return `A sweep through the arc ahead${r ? `, reaching ${r}` : ''}.`;
    case 'dash_strike':
      return (ab.dashTiles ?? 0) < 0
        ? 'A leap away from the aim, cutting what it passes.'
        : `A dash ${Math.abs(ab.dashTiles ?? 3)} tiles forward, cutting through everything passed.`;
    case 'projectile_fan':
      return (ab.projectiles ?? 1) > 1
        ? `${ab.projectiles} shots fanned across the aim${r ? `, flying ${r}` : ''}.`
        : `A shot down the aim${r ? `, flying ${r}` : ''}.`;
    case 'nova':
      return `A ring bursting ${ab.radius ?? 2} tiles out from where you stand.`;
    case 'pulse_nova':
      return `${ab.pulses ?? 3} pulses rolling out of you while you keep moving.`;
    case 'ground_aoe':
      return `A blast called onto aimed ground${r ? ` up to ${r} away` : ''}.`;
    case 'ground_field':
      return `A lingering field laid on aimed ground${r ? ` up to ${r} away` : ''}.`;
    case 'beam':
      return `An instant ray down the aim${r ? `, ${r} long` : ''} — the whole corridor struck at once.`;
    case 'chain_zap':
      return `Strikes the nearest foe, arcing on to ${ab.chainTargets ?? 2} more.`;
    case 'leap_slam':
      return `A leap to aimed ground${r ? ` up to ${r} away` : ''}, detonating on landing.`;
    case 'self_buff':
      return 'A working on yourself alone.';
    case 'summon':
      return `Plants a standing helper${r ? ` up to ${r} away` : ''}.`;
    case 'flurry':
      return 'A rapid burst of strikes ahead while you keep your feet.';
    default:
      return 'A working cast at the world.';
  }
}

/* ================================================================ */
/* the painter                                                       */
/* ================================================================ */

function render(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  ab: AbilityDef,
  fx: FxStyle,
  phase: number,
): void {
  ctx.clearRect(0, 0, w, h);

  // ---- layout: how many tiles must fit along the aim axis.
  const reach = reachTiles(ab);
  const selfish = ab.shape === 'self_buff' || ab.shape === 'nova' || ab.shape === 'pulse_nova';
  // A self-centered cast stands mid-floor; an aimed cast stands left.
  const margin = w * 0.09;
  const usable = w - margin * 2;
  const ppt = Math.min(usable / Math.max(reach, 2.5), h * 0.34);
  const cx = selfish ? w / 2 : margin + ppt * 0.4;
  const cy = h * 0.62;
  const L: Layout = { ppt, cx, cy, w, h };

  drawFloor(ctx, L, ab, selfish);
  drawRuler(ctx, L, ab, selfish);

  // ---- the cast's shape, in its own palette.
  ctx.save();
  switch (ab.shape) {
    case 'melee_arc':
    case 'flurry':
      drawArc(ctx, L, ab, fx, phase);
      break;
    case 'dash_strike':
      drawDash(ctx, L, ab, fx, phase);
      break;
    case 'projectile_fan':
      drawFan(ctx, L, ab, fx, phase);
      break;
    case 'nova':
      drawNova(ctx, L, ab, fx, phase, ab.radius ?? 2, 1);
      break;
    case 'pulse_nova':
      drawNova(ctx, L, ab, fx, phase, ab.radius ?? 2, ab.pulses ?? 3);
      break;
    case 'ground_aoe':
    case 'leap_slam':
      drawGroundBlast(ctx, L, ab, fx, phase, ab.shape === 'leap_slam');
      break;
    case 'ground_field':
      drawField(ctx, L, ab, fx, phase);
      break;
    case 'beam':
      drawBeam(ctx, L, ab, fx, phase);
      break;
    case 'chain_zap':
      drawChain(ctx, L, ab, fx, phase);
      break;
    case 'self_buff':
      drawHalo(ctx, L, fx, phase);
      break;
    case 'summon':
      drawSummon(ctx, L, ab, fx, phase);
      break;
    default:
      drawArc(ctx, L, ab, fx, phase);
  }
  ctx.restore();

  // ---- the caster stands OVER the ground paint, like in the world.
  drawCaster(ctx, L, fx, phase, ab.shape === 'self_buff');
}

/** Tiles of floor the diagram must show along the aim. */
function reachTiles(ab: AbilityDef): number {
  const range = ab.range ?? 0;
  const radius = ab.radius ?? 0;
  const splash = ab.splashRadius ?? 0;
  switch (ab.shape) {
    case 'nova':
    case 'pulse_nova':
      return Math.max(2.2, radius * 2 + 0.8);
    case 'self_buff':
      return 3.2;
    case 'dash_strike':
      return Math.max(2.5, Math.abs(ab.dashTiles ?? 3) + 1);
    case 'ground_aoe':
    case 'ground_field':
    case 'leap_slam':
      return Math.max(3, range + Math.max(radius, splash) + 0.6);
    case 'chain_zap':
      return Math.max(3.5, range + (ab.chainTargets ?? 2) * 1.6 + 0.5);
    default:
      return Math.max(2.5, range + splash + 0.5);
  }
}

/** Squashed ground ellipse at a floor point. */
function floorEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * SQUASH, 0, 0, Math.PI * 2);
}

/* ---- the stage ---- */

function drawFloor(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  ab: AbilityDef,
  selfish: boolean,
): void {
  const { ppt, cx, cy, w } = L;
  // The floor: quiet ink diamond-grid, one diamond per tile, fading
  // with distance — a stage, not a spreadsheet.
  ctx.save();
  ctx.strokeStyle = PALETTE['line'] ?? '#4a3f2e';
  ctx.lineWidth = Math.max(1, ppt * 0.02);
  const rows = 2;
  const t0 = selfish ? -Math.ceil((cx / ppt) + 1) : -1;
  const t1 = Math.ceil((w - cx) / ppt) + 1;
  for (let ty = -rows; ty <= rows; ty++) {
    for (let tx = t0; tx <= t1; tx++) {
      const x = cx + tx * ppt;
      const y = cy + ty * ppt * SQUASH;
      const dist = Math.abs(tx) + Math.abs(ty) * 1.6;
      const a = Math.max(0, 0.34 - dist * 0.035);
      if (a <= 0.02) continue;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.moveTo(x, y - ppt * SQUASH * 0.5);
      ctx.lineTo(x + ppt * 0.5, y);
      ctx.lineTo(x, y + ppt * SQUASH * 0.5);
      ctx.lineTo(x - ppt * 0.5, y);
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** The tile ruler under the aim: ticks each tile, numeral at reach. */
function drawRuler(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  ab: AbilityDef,
  selfish: boolean,
): void {
  const { ppt, cx, cy, h } = L;
  const range =
    ab.shape === 'nova' || ab.shape === 'pulse_nova'
      ? (ab.radius ?? 2)
      : ab.shape === 'dash_strike'
        ? Math.abs(ab.dashTiles ?? 3)
        : (ab.range ?? 0);
  if (range <= 0) return;
  const y = h * 0.9;
  const x1 = cx + range * ppt * (selfish ? 1 : 1);
  ctx.save();
  ctx.strokeStyle = PALETTE['parchment-faint'] ?? '#9a8f78';
  ctx.fillStyle = PALETTE['parchment-dim'] ?? '#b2a78f';
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(1, ppt * 0.025);
  ctx.beginPath();
  ctx.moveTo(cx, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
  for (let t = 0; t <= Math.floor(range); t++) {
    const x = cx + t * ppt;
    const major = t === 0 || t === Math.floor(range);
    ctx.beginPath();
    ctx.moveTo(x, y - (major ? ppt * 0.1 : ppt * 0.055));
    ctx.lineTo(x, y + (major ? ppt * 0.1 : ppt * 0.055));
    ctx.stroke();
  }
  // The reach's own tick + numeral, even when fractional.
  ctx.beginPath();
  ctx.moveTo(x1, y - ppt * 0.1);
  ctx.lineTo(x1, y + ppt * 0.1);
  ctx.stroke();
  ctx.font = `700 ${Math.max(10, ppt * 0.26)}px 'Trebuchet MS', sans-serif`;
  ctx.textAlign = 'center';
  const label = String(range);
  ctx.fillText(label, x1, y + ppt * 0.38);
  const half = ctx.measureText(label).width / 2;
  ctx.globalAlpha = 0.6;
  ctx.font = `italic ${Math.max(9, ppt * 0.2)}px 'Trebuchet MS', sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('tiles', x1 + half + ppt * 0.12, y + ppt * 0.38);
  ctx.restore();
}

/**
 * The caster: a one-tile figure — the rig is the ruler. Drawn twice:
 * a fat INK silhouette first (the world's outline shader spoken in
 * the diagram), then the warm body inside it, so the figure pops off
 * the dark floor the way every creature pops in the world.
 */
function drawCaster(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  fx: FxStyle,
  phase: number,
  lit: boolean,
): void {
  const { ppt, cx, cy } = L;
  const s = ppt; // one tile tall
  ctx.save();
  // ground shadow
  ctx.fillStyle = 'rgba(12, 8, 4, 0.45)';
  floorEllipse(ctx, cx, cy, s * 0.26);
  ctx.fill();
  const pose = (color: string, pad: number): void => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    // legs
    ctx.lineWidth = s * 0.09 + pad;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.09, cy - s * 0.02);
    ctx.lineTo(cx - s * 0.05, cy - s * 0.32);
    ctx.moveTo(cx + s * 0.09, cy - s * 0.02);
    ctx.lineTo(cx + s * 0.05, cy - s * 0.32);
    ctx.stroke();
    // torso
    ctx.lineWidth = s * 0.17 + pad;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.32);
    ctx.lineTo(cx, cy - s * 0.62);
    ctx.stroke();
    // the casting arm, thrown toward the aim
    ctx.lineWidth = s * 0.08 + pad;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.54);
    ctx.lineTo(cx + s * 0.28, cy - s * 0.6);
    ctx.stroke();
    // head
    ctx.beginPath();
    ctx.arc(cx, cy - s * 0.76, s * 0.14 + pad * 0.5, 0, Math.PI * 2);
    ctx.fill();
  };
  pose(INK, s * 0.07);
  pose(PALETTE['parchment-dim'] ?? '#b2a78f', 0);
  // the cast lives in the hand: an ember of the art's core color.
  const handGlow = 0.55 + 0.45 * Math.sin(phase * Math.PI * 2);
  ctx.globalAlpha = 0.35 * handGlow;
  ctx.fillStyle = fx.glow ? `rgba(${fx.glow}, 1)` : fx.spark;
  ctx.beginPath();
  ctx.arc(cx + s * 0.3, cy - s * 0.6, s * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = lit ? 0.95 : 0.6 + handGlow * 0.35;
  ctx.fillStyle = fx.spark;
  ctx.beginPath();
  ctx.arc(cx + s * 0.3, cy - s * 0.6, s * (0.055 + 0.02 * handGlow), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A pale ink mannequin — where a body would stand. */
function drawDummy(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  x: number,
  y: number,
  opts: { shoved?: number; pulled?: number; tint?: string } = {},
): void {
  const s = L.ppt * 0.92;
  ctx.save();
  ctx.fillStyle = 'rgba(12, 8, 4, 0.3)';
  floorEllipse(ctx, x, y, s * 0.22);
  ctx.fill();
  const body = opts.tint ?? (PALETTE['parchment-faint'] ?? '#9a8f78');
  ctx.strokeStyle = body;
  ctx.fillStyle = body;
  ctx.globalAlpha = 0.8;
  ctx.lineCap = 'round';
  ctx.lineWidth = s * 0.11;
  ctx.beginPath();
  ctx.moveTo(x, cyOf(y, s, -0.02));
  ctx.lineTo(x, cyOf(y, s, -0.58));
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, cyOf(y, s, -0.72), s * 0.12, 0, Math.PI * 2);
  ctx.fill();
  // knockback / pull arrows on the floor beside it
  const push = opts.shoved ?? 0;
  const pull = opts.pulled ?? 0;
  if (push > 0 || pull > 0) {
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = PALETTE['parchment-dim'] ?? '#b2a78f';
    ctx.lineWidth = s * 0.06;
    const dir = push > 0 ? 1 : -1;
    const len = s * 0.42;
    const ax = x + dir * s * 0.34;
    ctx.beginPath();
    ctx.moveTo(ax, y);
    ctx.lineTo(ax + dir * len, y);
    ctx.moveTo(ax + dir * len, y);
    ctx.lineTo(ax + dir * (len - s * 0.14), y - s * 0.09);
    ctx.moveTo(ax + dir * len, y);
    ctx.lineTo(ax + dir * (len - s * 0.14), y + s * 0.09);
    ctx.stroke();
  }
  ctx.restore();
}

function cyOf(y: number, s: number, k: number): number {
  return y + s * k;
}

/* ---- shapes ---- */

function drawArc(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  ab: AbilityDef,
  fx: FxStyle,
  phase: number,
): void {
  const { ppt, cx, cy } = L;
  const range = (ab.range ?? 1.6) * ppt;
  const half = ab.arc ?? Math.PI / 3;
  const bloom = easeOut(Math.min(1, phase * 2.2));
  const echoes = ab.shape === 'flurry' ? 3 : 1;
  for (let e = echoes - 1; e >= 0; e--) {
    const p = Math.max(0, Math.min(1, bloom - e * 0.18));
    if (p <= 0) continue;
    const r = range * (0.4 + 0.6 * p);
    ctx.save();
    ctx.translate(cx, cy - ppt * 0.34);
    ctx.scale(1, SQUASH);
    const grad = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r);
    grad.addColorStop(0, withAlpha(fx.core, 0.05));
    grad.addColorStop(0.72, withAlpha(fx.mid, 0.4 * (1 - e * 0.3)));
    grad.addColorStop(1, withAlpha(fx.deep, 0.12));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, -half, half);
    ctx.closePath();
    ctx.fill();
    // the leading edge — the blade of the sweep
    ctx.strokeStyle = withAlpha(fx.spark, 0.9 * (1 - e * 0.28) * (1 - p * 0.4));
    ctx.lineWidth = ppt * 0.07;
    ctx.beginPath();
    ctx.arc(0, 0, r, -half, half);
    ctx.stroke();
    ctx.restore();
  }
  const dx = cx + Math.cos(half * 0.4) * range * 0.82;
  drawDummy(ctx, L, dx, cy - Math.sin(half * 0.4) * range * SQUASH * 0.3, {
    shoved: ab.knockback && ab.knockback > 0 ? 1 : 0,
    tint: statusTint(ab, fx),
  });
}

function drawDash(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  ab: AbilityDef,
  fx: FxStyle,
  phase: number,
): void {
  const { ppt, cx, cy } = L;
  const tiles = ab.dashTiles ?? 3;
  const back = tiles < 0;
  const dist = Math.abs(tiles) * ppt;
  const p = easeOut(Math.min(1, phase * 1.8));
  const dir = back ? -1 : 1;
  // the cut corridor
  ctx.save();
  const gy = cy - ppt * 0.3;
  const grad = ctx.createLinearGradient(cx, 0, cx + dir * dist, 0);
  grad.addColorStop(0, withAlpha(fx.deep, 0.05));
  grad.addColorStop(0.6, withAlpha(fx.mid, 0.3));
  grad.addColorStop(1, withAlpha(fx.spark, 0.5));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx, gy - ppt * 0.26);
  ctx.lineTo(cx + dir * dist * p, gy - ppt * 0.34);
  ctx.lineTo(cx + dir * dist * p, gy + ppt * 0.34);
  ctx.lineTo(cx, gy + ppt * 0.26);
  ctx.closePath();
  ctx.fill();
  // stride chevrons along the path
  ctx.strokeStyle = withAlpha(fx.spark, 0.85);
  ctx.lineWidth = ppt * 0.06;
  const n = Math.max(2, Math.round(Math.abs(tiles)));
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    if (t > p) break;
    const x = cx + dir * dist * t;
    ctx.globalAlpha = 0.3 + 0.6 * t;
    ctx.beginPath();
    ctx.moveTo(x - dir * ppt * 0.16, gy - ppt * 0.2);
    ctx.lineTo(x + dir * ppt * 0.1, gy);
    ctx.lineTo(x - dir * ppt * 0.16, gy + ppt * 0.2);
    ctx.stroke();
  }
  ctx.restore();
  // the after-image where you land
  const lx = cx + dir * dist * p;
  ctx.save();
  ctx.globalAlpha = 0.5 + 0.4 * p;
  ctx.strokeStyle = withAlpha(fx.core, 0.8);
  ctx.lineWidth = ppt * 0.05;
  floorEllipse(ctx, lx, cy, ppt * 0.3);
  ctx.stroke();
  ctx.restore();
  drawDummy(ctx, L, cx + dir * dist * 0.55, cy + ppt * SQUASH * 0.55, {
    tint: statusTint(ab, fx),
  });
}

function drawFan(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  ab: AbilityDef,
  fx: FxStyle,
  phase: number,
): void {
  const { ppt, cx, cy } = L;
  const range = (ab.range ?? 4) * ppt;
  const shots = Math.max(1, ab.projectiles ?? 1);
  const spread = ab.spreadArc ?? (shots > 1 ? Math.PI / 5 : 0);
  const oy = cy - ppt * 0.5;
  const p = easeOut(Math.min(1, phase * 1.6));
  ctx.save();
  for (let i = 0; i < shots; i++) {
    const a = shots === 1 ? 0 : -spread / 2 + (spread * i) / (shots - 1);
    const tx = cx + Math.cos(a) * range;
    const ty = oy + Math.sin(a) * range * SQUASH;
    // flight line, faded behind the bolt
    ctx.strokeStyle = withAlpha(fx.mid, 0.3);
    ctx.lineWidth = ppt * 0.035;
    ctx.setLineDash([ppt * 0.14, ppt * 0.12]);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * ppt * 0.42, oy + Math.sin(a) * ppt * 0.2);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);
    // the bolt in flight (homing curls its path)
    const bp = Math.min(1, p * 1.15);
    const bx = cx + Math.cos(a) * range * bp;
    const by = oy + Math.sin(a) * range * SQUASH * bp;
    const trail = ppt * 0.5;
    const ta = Math.atan2(by - oy, bx - cx);
    const tg = ctx.createLinearGradient(
      bx - Math.cos(ta) * trail,
      by - Math.sin(ta) * trail,
      bx,
      by,
    );
    tg.addColorStop(0, withAlpha(fx.mid, 0));
    tg.addColorStop(1, withAlpha(fx.spark, 0.95));
    ctx.strokeStyle = tg;
    ctx.lineWidth = ppt * 0.09;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx - Math.cos(ta) * trail, by - Math.sin(ta) * trail);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.fillStyle = fx.core;
    ctx.beginPath();
    ctx.arc(bx, by, ppt * 0.07, 0, Math.PI * 2);
    ctx.fill();
    // impact bloom at full reach
    if (bp >= 1) {
      const splash = ab.splashRadius ?? 0;
      if (splash > 0) {
        ctx.save();
        ctx.translate(tx, ty);
        ctx.scale(1, SQUASH);
        ctx.strokeStyle = withAlpha(fx.mid, 0.55);
        ctx.lineWidth = ppt * 0.05;
        ctx.beginPath();
        jaggedRingPath(ctx, 0, 0, splash * ppt, 1, 11, ringJag(fx), 0.4, 3);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.strokeStyle = withAlpha(fx.spark, 0.8);
        ctx.lineWidth = ppt * 0.045;
        ctx.beginPath();
        burstStarPath(ctx, tx, ty, ppt * 0.2, ppt * 0.09, 5, 0.3, SQUASH);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
  // one mark stands in the flight path; pierce carries the line through.
  const dum = { x: cx + range * 0.62, y: oy + range * 0.05 * SQUASH + ppt * SQUASH * 0.4 };
  drawDummy(ctx, L, dum.x, dum.y, {
    shoved: ab.knockback && ab.knockback > 0 ? 1 : 0,
    tint: statusTint(ab, fx),
  });
}

function drawNova(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  ab: AbilityDef,
  fx: FxStyle,
  phase: number,
  radius: number,
  pulses: number,
): void {
  const { ppt, cx, cy } = L;
  const R = radius * ppt;
  ctx.save();
  ctx.translate(cx, cy - ppt * 0.1);
  ctx.scale(1, SQUASH);
  // the claimed ground: a quiet standing ring at the true radius
  ctx.strokeStyle = withAlpha(fx.deep, 0.55);
  ctx.lineWidth = ppt * 0.05;
  ctx.beginPath();
  jaggedRingPath(ctx, 0, 0, R, 1, 13, ringJag(fx), 0, 5);
  ctx.stroke();
  ctx.fillStyle = withAlpha(fx.mid, 0.08);
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();
  // the living pulses rolling outward
  for (let i = 0; i < pulses; i++) {
    const p = (phase + i / pulses) % 1;
    const r = R * easeOut(p);
    const a = (1 - p) * 0.85;
    if (r < ppt * 0.2) continue;
    ctx.strokeStyle = withAlpha(fx.spark, a);
    ctx.lineWidth = ppt * (0.1 - 0.05 * p);
    ctx.beginPath();
    jaggedRingPath(ctx, 0, 0, r, 1, 13, ringJag(fx) * 0.7, p * 0.6, 5);
    ctx.stroke();
  }
  ctx.restore();
  drawDummy(ctx, L, cx + R * 0.8, cy + ppt * SQUASH * 0.34, {
    shoved: ab.knockback && ab.knockback > 0 ? 1 : 0,
    pulled: ab.knockback && ab.knockback < 0 ? 1 : 0,
    tint: statusTint(ab, fx),
  });
}

function drawGroundBlast(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  ab: AbilityDef,
  fx: FxStyle,
  phase: number,
  leap: boolean,
): void {
  const { ppt, cx, cy } = L;
  const range = (ab.range ?? 4) * ppt;
  const R = (ab.radius ?? 1.6) * ppt;
  const tx = cx + range;
  const ty = cy - ppt * 0.1;
  // the aim: a falling-dot arc from hand to ground (leap draws the body's arc)
  ctx.save();
  ctx.setLineDash([ppt * 0.1, ppt * 0.14]);
  ctx.strokeStyle = withAlpha(fx.mid, 0.5);
  ctx.lineWidth = ppt * 0.045;
  ctx.beginPath();
  ctx.moveTo(cx + ppt * 0.3, cy - ppt * 0.6);
  ctx.quadraticCurveTo((cx + tx) / 2, cy - ppt * (leap ? 1.6 : 1.1), tx, ty);
  ctx.stroke();
  ctx.setLineDash([]);
  // the travelling spark along it
  const p = easeIn(Math.min(1, phase * 1.7));
  const sx = qx(cx + ppt * 0.3, (cx + tx) / 2, tx, p);
  const sy = qy(cy - ppt * 0.6, cy - ppt * (leap ? 1.6 : 1.1), ty, p);
  ctx.fillStyle = fx.core;
  ctx.beginPath();
  ctx.arc(sx, sy, ppt * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // the telegraph, then the blast
  ctx.save();
  ctx.translate(tx, ty);
  ctx.scale(1, SQUASH);
  ctx.strokeStyle = withAlpha(fx.deep, 0.7);
  ctx.lineWidth = ppt * 0.05;
  ctx.beginPath();
  jaggedRingPath(ctx, 0, 0, R, 1, 12, ringJag(fx), 0, 7);
  ctx.stroke();
  const bloom = Math.max(0, Math.min(1, (phase - 0.55) * 3));
  if (bloom > 0) {
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, R * bloom);
    grad.addColorStop(0, withAlpha(fx.core, 0.55 * (1 - bloom * 0.6)));
    grad.addColorStop(0.7, withAlpha(fx.mid, 0.4 * (1 - bloom * 0.5)));
    grad.addColorStop(1, withAlpha(fx.mid, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, R * bloom, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(fx.spark, 0.9 * (1 - bloom));
    ctx.lineWidth = ppt * 0.08;
    ctx.beginPath();
    burstStarPath(ctx, 0, 0, R * (0.4 + bloom * 0.5), R * (0.16 + bloom * 0.2), 7, 0.2);
    ctx.stroke();
  }
  ctx.restore();
  drawDummy(ctx, L, tx - R * 0.5, ty + ppt * SQUASH * 0.5, {
    shoved: ab.knockback && ab.knockback > 0 ? 1 : 0,
    pulled: ab.knockback && ab.knockback < 0 ? 1 : 0,
    tint: statusTint(ab, fx),
  });
}

function drawField(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  ab: AbilityDef,
  fx: FxStyle,
  phase: number,
): void {
  const { ppt, cx, cy } = L;
  const range = (ab.range ?? 4) * ppt;
  const R = (ab.radius ?? 1.8) * ppt;
  const tx = cx + range;
  const ty = cy - ppt * 0.1;
  ctx.save();
  ctx.translate(tx, ty);
  ctx.scale(1, SQUASH);
  // the standing pool
  const grad = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R);
  grad.addColorStop(0, withAlpha(fx.mid, 0.34));
  grad.addColorStop(1, withAlpha(fx.deep, 0.1));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = withAlpha(fx.mid, 0.7);
  ctx.lineWidth = ppt * 0.05;
  ctx.beginPath();
  jaggedRingPath(ctx, 0, 0, R, 1, 13, ringJag(fx), 0, 9);
  ctx.stroke();
  // its heartbeat: a pulse ring breathing inside the bounds
  const p = phase % 1;
  ctx.strokeStyle = withAlpha(fx.spark, (1 - p) * 0.7);
  ctx.lineWidth = ppt * 0.06;
  ctx.beginPath();
  ctx.arc(0, 0, R * (0.25 + 0.7 * easeOut(p)), 0, Math.PI * 2);
  ctx.stroke();
  // rising wisps
  ctx.restore();
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const wp = (phase * 1.4 + i * 0.23) % 1;
    const wx = tx + Math.cos(i * 2.4) * R * 0.55;
    const wy = ty + Math.sin(i * 2.4) * R * SQUASH * 0.55 - wp * ppt * 0.8;
    ctx.globalAlpha = (1 - wp) * 0.6;
    ctx.fillStyle = fx.spark;
    ctx.beginPath();
    ctx.arc(wx, wy, ppt * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  drawDummy(ctx, L, tx + R * 0.4, ty + ppt * SQUASH * 0.4, { tint: statusTint(ab, fx) });
}

function drawBeam(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  ab: AbilityDef,
  fx: FxStyle,
  phase: number,
): void {
  const { ppt, cx, cy } = L;
  const range = (ab.range ?? 5) * ppt;
  const oy = cy - ppt * 0.55;
  const wob = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
  ctx.save();
  // corridor edges
  const half = ppt * 0.22;
  const grad = ctx.createLinearGradient(cx, 0, cx + range, 0);
  grad.addColorStop(0, withAlpha(fx.core, 0.85));
  grad.addColorStop(0.75, withAlpha(fx.mid, 0.6));
  grad.addColorStop(1, withAlpha(fx.mid, 0.12));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx + ppt * 0.34, oy - half * (0.5 + wob * 0.12));
  ctx.lineTo(cx + range, oy - half);
  ctx.lineTo(cx + range, oy + half);
  ctx.lineTo(cx + ppt * 0.34, oy + half * (0.5 + wob * 0.12));
  ctx.closePath();
  ctx.fill();
  // the white-hot core line
  ctx.strokeStyle = withAlpha(fx.core, 0.7 + wob * 0.3);
  ctx.lineWidth = ppt * (0.06 + wob * 0.03);
  ctx.beginPath();
  ctx.moveTo(cx + ppt * 0.34, oy);
  ctx.lineTo(cx + range, oy);
  ctx.stroke();
  ctx.restore();
  // every body in the corridor is struck at once — show two.
  drawDummy(ctx, L, cx + range * 0.45, cy - ppt * 0.1, { tint: statusTint(ab, fx) });
  drawDummy(ctx, L, cx + range * 0.85, cy - ppt * 0.05, { tint: statusTint(ab, fx) });
}

function drawChain(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  ab: AbilityDef,
  fx: FxStyle,
  phase: number,
): void {
  const { ppt, cx, cy } = L;
  const range = (ab.range ?? 3.5) * ppt;
  const chains = Math.max(1, ab.chainTargets ?? 2);
  const marks: Array<{ x: number; y: number }> = [{ x: cx + range, y: cy - ppt * 0.15 }];
  for (let i = 1; i <= chains; i++) {
    marks.push({
      x: cx + range + i * ppt * 1.5,
      y: cy - ppt * 0.15 + (i % 2 === 0 ? -1 : 1) * ppt * SQUASH * (0.5 + i * 0.14),
    });
  }
  const p = easeOut(Math.min(1, phase * 1.5)) * marks.length;
  ctx.save();
  ctx.lineCap = 'round';
  let from = { x: cx + ppt * 0.3, y: cy - ppt * 0.6 };
  for (let i = 0; i < marks.length; i++) {
    const seg = Math.max(0, Math.min(1, p - i));
    if (seg <= 0) break;
    const to = marks[i]!;
    const ex = from.x + (to.x - from.x) * seg;
    const ey = from.y + (to.y - from.y) * seg - ppt * 0.35 * seg;
    // a bolt is jagged: three-point lightning wander
    ctx.strokeStyle = withAlpha(fx.spark, 0.95 - i * 0.14);
    ctx.lineWidth = ppt * (0.09 - i * 0.012);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    const mx = (from.x + ex) / 2 + (i % 2 === 0 ? 1 : -1) * ppt * 0.18;
    const my = (from.y + ey) / 2 - ppt * 0.12;
    ctx.lineTo(mx, my);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    from = { x: to.x, y: to.y - ppt * 0.35 };
    if (seg >= 1) {
      ctx.strokeStyle = withAlpha(fx.core, 0.8 - i * 0.12);
      ctx.lineWidth = ppt * 0.04;
      ctx.beginPath();
      burstStarPath(ctx, to.x, to.y - ppt * 0.35, ppt * 0.17, ppt * 0.07, 4, 0.4);
      ctx.stroke();
    }
  }
  ctx.restore();
  for (let i = 0; i < marks.length; i++) {
    const m = marks[i]!;
    drawDummy(ctx, L, m.x, m.y, { tint: statusTint(ab, fx) });
  }
}

function drawHalo(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  fx: FxStyle,
  phase: number,
): void {
  const { ppt, cx, cy } = L;
  const p = phase % 1;
  ctx.save();
  // rising halo arcs around the caster
  for (let i = 0; i < 3; i++) {
    const hp = (p + i / 3) % 1;
    const y = cy - ppt * 0.2 - hp * ppt * 0.9;
    const r = ppt * (0.5 - hp * 0.16);
    ctx.strokeStyle = withAlpha(fx.spark, (1 - hp) * 0.85);
    ctx.lineWidth = ppt * 0.07;
    ctx.beginPath();
    ctx.ellipse(cx, y, r, r * SQUASH, 0, Math.PI * 0.08, Math.PI * 0.92);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, y, r, r * SQUASH, 0, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
  }
  // the warded ground
  ctx.strokeStyle = withAlpha(fx.mid, 0.6);
  ctx.lineWidth = ppt * 0.05;
  floorEllipse(ctx, cx, cy, ppt * 0.62);
  ctx.stroke();
  ctx.restore();
}

function drawSummon(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  ab: AbilityDef,
  fx: FxStyle,
  phase: number,
): void {
  const { ppt, cx, cy } = L;
  const range = Math.min(ab.range ?? 2, 3) * ppt;
  const tx = cx + range;
  const ty = cy - ppt * 0.05;
  const rise = easeOut(Math.min(1, phase * 2));
  ctx.save();
  // planted ground ring
  ctx.strokeStyle = withAlpha(fx.mid, 0.7);
  ctx.lineWidth = ppt * 0.05;
  floorEllipse(ctx, tx, ty, ppt * 0.5);
  ctx.stroke();
  // the totem body rising out of the ground
  const hgt = ppt * 0.95 * rise;
  ctx.fillStyle = withAlpha(fx.deep, 0.95);
  ctx.fillRect(tx - ppt * 0.14, ty - hgt, ppt * 0.28, hgt);
  ctx.fillStyle = withAlpha(fx.mid, 0.95);
  ctx.fillRect(tx - ppt * 0.19, ty - hgt, ppt * 0.38, ppt * 0.2 * rise);
  // its watching ember
  ctx.fillStyle = fx.spark;
  const wink = 0.6 + 0.4 * Math.sin(phase * Math.PI * 4);
  ctx.globalAlpha = wink;
  ctx.beginPath();
  ctx.arc(tx, ty - hgt + ppt * 0.1, ppt * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ---- small vocab ---- */

function ringJag(fx: FxStyle): number {
  return fx.ring === 'teeth' || fx.ring === 'shards' ? 0.16 : 0.07;
}

/** A dummy struck by a status wears its faint tint. */
function statusTint(ab: AbilityDef, fx: FxStyle): string | undefined {
  return ab.status ? fx.mid : undefined;
}

function withAlpha(hex: string, a: number): string {
  const r = Number.parseInt(hex.slice(1, 3), 16) || 0;
  const g = Number.parseInt(hex.slice(3, 5), 16) || 0;
  const b = Number.parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a))})`;
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function easeIn(t: number): number {
  return t * t;
}

function qx(x0: number, x1: number, x2: number, t: number): number {
  const u = 1 - t;
  return u * u * x0 + 2 * u * t * x1 + t * t * x2;
}

function qy(y0: number, y1: number, y2: number, t: number): number {
  const u = 1 - t;
  return u * u * y0 + 2 * u * t * y1 + t * t * y2;
}
