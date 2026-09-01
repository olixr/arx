/**
 * THE SCALED WARREN — the kobold, its scale ribbon, hump and tail.
 * Split out of rig.ts on the golems.ts template (foundations F3.4);
 * rig.ts re-exports everything here, so every lab, test and painter
 * keeps its old door.
 */
import { chamferRect } from './shapes.js';
import { shade } from './tint.js';

/* ========================== THE SCALE DIALECT ==========================
 * Kobolds are NOT small villagers with horns and a tail. When
 * RigPose.kobold is set, the flesh head swaps for a hunched tunnel-rat
 * skull — a low cranium sunk into the shoulders under two big dish
 * ears, a LONG drooping snout ending in a bare nose pad with whiskers
 * and buck incisors, and a lit tallow candle seated on the crown (a
 * miner carries its own light). The body hunches with it: the torso
 * tips forward, the head hangs low and thrust ahead over a bent
 * shoulder hump, a naked tail rides the hip, and the bare feet grow
 * claws — while the IK rig, weapon carriage, and all eight facing
 * bands keep working untouched. Each variant is its own DESIGN, never
 * a scale-up: the dusty rank-and-file digger under one candle, and
 * the digmaster's dark bulk under a ragged mane and a three-candle
 * crown.
 */
export interface KoboldLook {
  /** Hide base — each variant weathered its own tunnel. */
  hide: string;
  /** Pale under-hide: jaw, muzzle underside, the tail's low edge. */
  belly: string;
  /** The lit eye bead — small, bright, watching. */
  eye: string;
  /** The bare nose pad at the snout tip. */
  nose: string;
  /**
   * Ragged mane shag over crown and nape; undefined = the digger's
   * short bristle scruff instead.
   */
  mane?: string;
  /** Frame multiplier: jaw mass, ear dish, tail girth. */
  heavy: number;
}
/** The inner ear membrane — thin skin, always flesh-pink. */
export const KOBOLD_EAR_INNER = '#c78e7f';
export const KOBOLD_LOOKS: Record<string, KoboldLook> = {
  // The rank-and-file digger: dusty tan hide, a short bristle scruff,
  // whiskers full of rock dust — a coward alone, a warren together.
  kobold: {
    hide: '#9c6a4a',
    belly: '#d8bf9a',
    eye: '#f0b93a',
    nose: '#43302c',
    heavy: 1,
  },
  // The digmaster: dark umber hide under a ragged slate mane — the
  // warren's one broad-backed silhouette.
  kobold_digmaster: {
    hide: '#6f4838',
    belly: '#c2a480',
    eye: '#ffd24a',
    nose: '#352624',
    mane: '#4a4252',
    heavy: 1.3,
  },
};
/** Variant lookup with the rank-and-file as the unknown-id fallback. */
export function koboldLook(defId: string): KoboldLook {
  return KOBOLD_LOOKS[defId] ?? KOBOLD_LOOKS['kobold']!;
}
/**
 * A tapered filled ribbon along a quadratic spine — the law learned on
 * the ram's horns: curved mass reads as carved form only when drawn as
 * a filled shape with an outline, never as a stroke chain. Width
 * tapers base→tip; returns the sampled spine so callers can seat
 * details on it.
 */
export function scaleRibbon(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  w0: number,
  fill: string,
  outline: string,
): Array<{ x: number; y: number; px: number; py: number; w: number }> {
  const N = 8;
  const spine: Array<{ x: number; y: number; px: number; py: number; w: number }> = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const mt = 1 - t;
    const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
    const y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
    // Tangent of the bezier, for the perpendicular offset.
    const tx = 2 * mt * (cx - x0) + 2 * t * (x1 - cx);
    const ty = 2 * mt * (cy - y0) + 2 * t * (y1 - cy);
    const tl = Math.hypot(tx, ty) || 1e-4;
    spine.push({ x, y, px: -ty / tl, py: tx / tl, w: w0 * (1 - t) * 0.5 });
  }
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < spine.length; i++) {
    const p = spine[i]!;
    if (i === 0) ctx.moveTo(p.x + p.px * p.w, p.y + p.py * p.w);
    else ctx.lineTo(p.x + p.px * p.w, p.y + p.py * p.w);
  }
  for (let i = spine.length - 1; i >= 0; i--) {
    const p = spine[i]!;
    ctx.lineTo(p.x - p.px * p.w, p.y - p.py * p.w);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = Math.max(1, w0 * 0.16);
  ctx.stroke();
  return spine;
}
export interface KoboldHeadFrame {
  s: number;
  headX: number;
  headY: number;
  hw: number;
  hh: number;
  cut: number;
  fx: number;
  fy: number;
  profileK: number;
  backK: number;
  lead: number;
  hurt: boolean;
  nowMs: number;
  /** 0..1 jaw drop — the combat yip-and-snap; 0 keeps the jaw seated. */
  gape: number;
}
/**
 * The kobold head, drawn in the head block's own frame. Reads kobold
 * by SILHOUETTE first: a low cranium between big dish ears under the
 * candle crown, and a LONG snout that leads the facing — hanging low
 * face-on, run out level and drooping at profile — ending in a bare
 * nose pad with whiskers and buck incisors. The pale mandible drops
 * with the gape. From behind there is NO face: hide plates, the nape,
 * the ears' backs, and the scruff or mane riding the crown.
 */
export function paintKoboldHead(
  ctx: CanvasRenderingContext2D,
  kb: KoboldLook,
  f: KoboldHeadFrame,
): void {
  const { headX, headY, hw, hh, cut, fx, profileK, backK, lead, hurt } = f;
  const hv = kb.heavy;
  const hide = hurt ? '#ffffff' : kb.hide;
  const belly = hurt ? '#ffffff' : kb.belly;
  const back = backK > 0.55;

  // --- the low cranium: a shallow dome sunk into the shoulders — all
  // ear and snout, no proud brow. Silhouette before detail.
  const crTop = headY - hh * 0.72;
  const crBot = headY + hh * 0.5;

  // --- dish ears: big round tunnel-rat ears riding high and wide.
  // Far-side-skip at profile; from behind both read (backs only —
  // the pink membrane faces forward, never the camera's back band).
  const drawEar = (side: number, depth: number): void => {
    const ex = headX - fx * hw * 0.38 + side * hw * 0.8;
    const ey = crTop + hh * 0.24 - (1 - depth) * hh * 0.06;
    const r = hh * 0.42 * (0.85 + 0.15 * hv) * depth;
    ctx.fillStyle = hide;
    ctx.beginPath();
    ctx.arc(ex, ey, r, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.strokeStyle = shade(kb.hide, -24);
      ctx.lineWidth = Math.max(1, r * 0.16);
      ctx.stroke();
      if (!back) {
        ctx.fillStyle = KOBOLD_EAR_INNER;
        ctx.beginPath();
        ctx.arc(ex + fx * r * 0.14, ey + r * 0.08, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(KOBOLD_EAR_INNER, -18);
        ctx.beginPath();
        ctx.arc(ex + fx * r * 0.18, ey + r * 0.16, r * 0.26, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };
  const nearSide = lead;
  // The far ear reads a step smaller and higher — the cheap perspective
  // cue that sells the head as a volume at the three-quarter bands.
  if (profileK < 0.7 || back) drawEar(-nearSide, back ? 1 : 0.86);
  drawEar(nearSide, 1);

  // --- cranium block.
  ctx.fillStyle = hide;
  ctx.beginPath();
  chamferRect(ctx, headX - hw, crTop, hw * 2, crBot - crTop, [cut * 1.4, cut * 1.4, cut * 0.5, cut * 0.5]);
  ctx.fill();
  if (!hurt) {
    // THE FORM SPLIT restated for hide: hard shade right half, lit
    // crown band, jaw under-shade — the dome reads as mass.
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, headX - hw, crTop, hw * 2, crBot - crTop, [cut * 1.4, cut * 1.4, cut * 0.5, cut * 0.5]);
    ctx.clip();
    ctx.fillStyle = shade(kb.hide, -10);
    ctx.fillRect(headX, crTop, hw, crBot - crTop);
    ctx.fillStyle = shade(kb.hide, 9);
    ctx.fillRect(headX - hw, crTop, hw * 2, hh * 0.14);
    ctx.fillStyle = shade(kb.hide, -16);
    ctx.fillRect(headX - hw, crBot - hh * 0.1, hw * 2, hh * 0.1);
    ctx.restore();
  }

  // --- the crown: every kobold wears something up top. The digger
  // gets a short bristle scruff — a few stiff tufts, rock dust and
  // all; the digmaster's full mane replaces it below.
  if (!kb.mane && !hurt) {
    ctx.fillStyle = shade(kb.hide, -20);
    const sBase = headX - fx * hw * 0.28;
    for (let i = 0; i < 4; i++) {
      const t = (i / 3) * 2 - 1;
      const bx = sBase + t * hw * 0.42;
      const by = crTop + hh * 0.1;
      const tall = hh * (0.2 + 0.09 * Math.sin(i * 2.1 + 0.7));
      ctx.beginPath();
      ctx.moveTo(bx - hw * 0.11, by + hh * 0.05);
      ctx.lineTo(bx - fx * hw * 0.12 + t * hw * 0.05, by - tall);
      ctx.lineTo(bx + hw * 0.11, by + hh * 0.06);
      ctx.closePath();
      ctx.fill();
    }
  }

  // --- the mane: ragged shag over the crown and pouring down the
  // nape. The digmaster's slate mop; the digger keeps the scruff.
  if (kb.mane && !hurt) {
    ctx.fillStyle = kb.mane;
    const mBase = headX - fx * hw * 0.24;
    for (let i = 0; i < 5; i++) {
      const t = (i / 4) * 2 - 1;
      const bx = mBase + t * hw * 0.72;
      const by = crTop + hh * 0.14;
      const tall = hh * (0.42 + 0.2 * Math.sin(i * 2.6 + 1)) * (1 + 0.2 * (1 - Math.abs(t)));
      ctx.beginPath();
      ctx.moveTo(bx - hw * 0.2, by + hh * 0.08);
      ctx.lineTo(bx - fx * hw * 0.24 + t * hw * 0.1, by - tall);
      ctx.lineTo(bx + hw * 0.2, by + hh * 0.1);
      ctx.closePath();
      ctx.fill();
    }
    // The nape shag: a heavy lock falling off the trailing edge of
    // the crown — the mop reads even at profile, under the candles.
    const nx0 = headX - fx * hw * 0.98;
    ctx.beginPath();
    ctx.moveTo(nx0 + fx * hw * 0.3, crTop + hh * 0.1);
    ctx.lineTo(nx0 - fx * hw * 0.22, crTop + hh * 0.7);
    ctx.lineTo(nx0 - fx * hw * 0.1, crBot + hh * 0.16);
    ctx.lineTo(nx0 + fx * hw * 0.34, crBot - hh * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(kb.mane, -14);
    ctx.beginPath();
    ctx.moveTo(nx0 + fx * hw * 0.1, crTop + hh * 0.34);
    ctx.lineTo(nx0 - fx * hw * 0.16, crTop + hh * 0.9);
    ctx.lineTo(nx0 + fx * hw * 0.16, crBot + hh * 0.02);
    ctx.closePath();
    ctx.fill();
  }

  if (back) {
    // --- the occiput: no face ever shows from behind. Hide plates in
    // courses, the nape shadow, the ears' backs — and the candlelight
    // still riding the crown.
    if (!hurt) {
      ctx.strokeStyle = shade(kb.hide, -14);
      ctx.lineWidth = Math.max(1, hh * 0.045);
      for (const t of [0.32, 0.6]) {
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.6, crTop + (crBot - crTop) * t);
        ctx.lineTo(headX + hw * 0.6, crTop + (crBot - crTop) * t);
        ctx.stroke();
      }
      // The nape shadow where the head sinks into the hump.
      ctx.fillStyle = shade(kb.hide, -18);
      ctx.beginPath();
      chamferRect(ctx, headX - hw * 0.4, crBot - hh * 0.16, hw * 0.8, hh * 0.16, cut * 0.3);
      ctx.fill();
      if (kb.mane) {
        // Nape shag trailing down the back of the skull.
        ctx.fillStyle = kb.mane;
        for (let i = 0; i < 3; i++) {
          const bx = headX + (i - 1) * hw * 0.3;
          ctx.beginPath();
          ctx.moveTo(bx - hw * 0.14, crTop + hh * 0.4);
          ctx.lineTo(bx + hw * 0.02, crBot + hh * (0.14 + 0.08 * Math.sin(i * 2.2)));
          ctx.lineTo(bx + hw * 0.16, crTop + hh * 0.42);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    return;
  }

  // --- the snout: LONG, leading the facing. Face-on it hangs low and
  // narrow off the skull; at profile it runs out level, the bridge
  // easing down toward the nose pad. Two-piece with the mandible.
  const jawDrop = f.gape * hh * 0.3;
  const snLen = hw * (0.5 + 1.15 * profileK);
  const rootX = headX + fx * hw * 0.16;
  const tipX = rootX + fx * snLen;
  const snHw = hw * (0.44 - 0.12 * profileK);
  const x0 = Math.min(rootX, tipX) - snHw * (1 - profileK);
  const x1 = Math.max(rootX, tipX) + snHw * (1 - profileK);
  const topY = headY - hh * (0.24 - 0.08 * profileK);
  const botY = headY + hh * (0.6 + 0.26 * (1 - profileK));
  ctx.fillStyle = hide;
  ctx.beginPath();
  chamferRect(ctx, x0, topY, x1 - x0, botY - topY, [cut * 0.4, cut * 0.4, cut * 0.6, cut * 0.6]);
  ctx.fill();
  if (!hurt) {
    // Bridge highlight sloping toward the tip, form-split shade, and
    // the drooped under-tip shadow that sells the hang of the snout.
    ctx.fillStyle = shade(kb.hide, 10);
    ctx.fillRect(x0 + (x1 - x0) * 0.12, topY, (x1 - x0) * 0.76, hh * 0.1);
    ctx.fillStyle = shade(kb.hide, -9);
    ctx.beginPath();
    chamferRect(ctx, headX > (x0 + x1) / 2 ? (x0 + x1) / 2 : headX, topY, x1 - (headX > (x0 + x1) / 2 ? (x0 + x1) / 2 : headX), botY - topY, [0, cut * 0.4, cut * 0.6, 0]);
    ctx.fill();
    ctx.fillStyle = shade(kb.hide, -14);
    ctx.fillRect(x0, botY - hh * 0.12, x1 - x0, hh * 0.12);
  }

  // --- the nose pad: bare flesh at the very tip, nostril dot beside.
  const nx = rootX + fx * snLen * 0.96;
  const ny = headY + hh * (0.12 * profileK) + (1 - profileK) * (botY - headY - hh * 0.26);
  const nr = hh * 0.15 * (0.9 + 0.2 * hv);
  ctx.fillStyle = hurt ? '#ffffff' : kb.nose;
  ctx.beginPath();
  ctx.arc(nx, ny, nr, 0, Math.PI * 2);
  ctx.fill();
  if (!hurt) {
    ctx.fillStyle = shade(kb.nose, 16);
    ctx.beginPath();
    ctx.arc(nx - nr * 0.3, ny - nr * 0.35, nr * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(kb.nose, -26);
    if (profileK < 0.55) {
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(nx + sd * nr * 0.5, ny + nr * 0.25, nr * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.arc(nx + lead * nr * 0.45, ny + nr * 0.2, nr * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- whiskers: dust-pale threads swept back off the snout. Near
  // side only at profile (the far cheek is around the corner).
  if (!hurt) {
    ctx.strokeStyle = 'rgba(238,228,205,0.85)';
    ctx.lineWidth = Math.max(1, hh * 0.035);
    for (const sd of [-1, 1]) {
      if (sd !== nearSide && profileK > 0.7) continue;
      const wx = nx - fx * hw * 0.2 + sd * snHw * 0.4 * (1 - profileK * 0.6);
      const wy = ny - hh * 0.04;
      for (const [dy0, dy1] of [[-0.04, -0.14], [0.04, 0.1]] as const) {
        ctx.beginPath();
        ctx.moveTo(wx, wy + dy0 * hh * 3);
        ctx.quadraticCurveTo(
          wx - fx * hw * 0.1 + sd * hw * 0.34,
          wy + dy0 * hh * 3 + hh * 0.06,
          wx - fx * hw * 0.18 + sd * hw * 0.62,
          wy + dy1 * hh * 3 + hh * 0.22,
        );
        ctx.stroke();
      }
    }
  }

  // --- the mandible: pale under-jaw, its own piece, dropping with
  // the gape — the kobold yips and snaps through every swing.
  const mdHw = snHw * 0.82;
  const mdX = rootX + fx * snLen * 0.42;
  const mdTop = botY - hh * 0.08 + jawDrop;
  if (jawDrop > hh * 0.03) {
    // The open mouth behind the dropped jaw, and the tooth row above.
    ctx.fillStyle = hurt ? '#241a2e' : '#3a2028';
    ctx.beginPath();
    chamferRect(ctx, mdX - mdHw * 0.94, botY - hh * 0.1, mdHw * 1.88, mdTop - botY + hh * 0.16, cut * 0.25);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = '#e8ddc2';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(mdX + i * mdHw * 0.5 - hh * 0.05, botY - hh * 0.08);
        ctx.lineTo(mdX + i * mdHw * 0.5, botY + hh * 0.08);
        ctx.lineTo(mdX + i * mdHw * 0.5 + hh * 0.05, botY - hh * 0.08);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  ctx.fillStyle = belly;
  ctx.beginPath();
  chamferRect(ctx, mdX - mdHw, mdTop, mdHw * 2, hh * 0.24, [0, 0, cut * 0.5, cut * 0.5]);
  ctx.fill();

  // --- buck incisors: the tunnel-rat's chisels, proud of the jaw
  // even shut, hanging just behind the nose pad.
  if (!hurt) {
    ctx.fillStyle = '#efe6cf';
    for (const sd of [-1, 1]) {
      const ix = nx - fx * hw * 0.12 + sd * nr * 0.55;
      ctx.beginPath();
      chamferRect(ctx, ix - hh * 0.045, ny + nr * 0.5, hh * 0.09, hh * 0.2 * (1 + 0.25 * hv), [0, 0, hh * 0.03, hh * 0.03]);
      ctx.fill();
    }
  }

  // --- the eyes: small lit beads under a shading brow — watching,
  // not draconic. They slide with the facing; the far eye slips
  // around the corner at profile.
  const eyeY = headY - hh * 0.3;
  const pairX = headX + fx * hw * 0.34;
  const eyeDx = hw * 0.42 * (1 - profileK * 0.5);
  if (!hurt) {
    ctx.fillStyle = shade(kb.hide, -18);
    ctx.beginPath();
    chamferRect(ctx, pairX - hw * 0.62, eyeY - hh * 0.22, hw * 1.24, hh * 0.14, cut * 0.3);
    ctx.fill();
  }
  for (const sd of [-1, 1]) {
    if (sd !== nearSide && profileK > 0.78) continue;
    const ex = pairX + sd * eyeDx;
    if (!hurt) {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = kb.eye;
      ctx.beginPath();
      ctx.arc(ex, eyeY, hh * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = hurt ? '#241a2e' : kb.eye;
    ctx.beginPath();
    ctx.arc(ex, eyeY, hh * 0.115, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = '#241a2e';
      ctx.beginPath();
      ctx.arc(ex + fx * hh * 0.02, eyeY + hh * 0.01, hh * 0.055, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(ex - hh * 0.045, eyeY - hh * 0.05, hh * 0.028, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
export interface KoboldHumpFrame {
  s: number;
  tw: number;
  th: number;
  fx: number;
  backK: number;
  hurt: boolean;
}
/**
 * The shoulder hump: the bent back the whole species carries, drawn
 * in the torso's local frame AFTER the garment and BEFORE the head —
 * a rounded mass rising behind the neck that the low-slung skull sinks
 * into. It trails the facing at profile and reads as bowed shoulders
 * face-on and from behind.
 */
export function paintKoboldHump(
  ctx: CanvasRenderingContext2D,
  kb: KoboldLook,
  garment: string,
  f: KoboldHumpFrame,
): void {
  const { tw, th, fx, backK, hurt } = f;
  const cx = -fx * tw * 0.4;
  const cy = -th + th * 0.02;
  const rx = tw * (1.02 + 0.12 * backK);
  const ry = th * 0.24 * (1 + 0.18 * kb.heavy - 0.18);
  ctx.fillStyle = hurt ? '#ffffff' : garment;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(cx + rx, cy + ry * 0.35);
  ctx.lineTo(cx - rx, cy + ry * 0.35);
  ctx.closePath();
  ctx.fill();
  if (!hurt) {
    // The form split carries over the hump: lit crown line, shaded
    // trailing slope — a bent back, not a collar.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = shade(garment, -9);
    ctx.fillRect(cx, cy - ry, rx, ry * 2);
    ctx.fillStyle = shade(garment, 8);
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 0.42);
    ctx.restore();
  }
}
export interface KoboldTailFrame {
  s: number;
  fx: number;
  fy: number;
  profileK: number;
  backK: number;
  lead: number;
  nowMs: number;
  runF: number;
  poleX: number;
  hurt: boolean;
}
/**
 * The naked tail — THE LIVING WHIP. Drawn in the torso's squashed
 * local frame BEFORE the garment so the root always tucks behind the
 * body. A wave travels root-to-tip on the wall clock, quickening and
 * widening with the gait, so the tail is never a dead ribbon: it
 * snakes at a stand, lashes at a run. Hide at the root eases to bare
 * flesh at the tip. It trails the facing — run out long at profile,
 * hanging low and swaying seen from behind, tip peeking past the hip
 * face-on.
 */
export function paintKoboldTail(
  ctx: CanvasRenderingContext2D,
  kb: KoboldLook,
  f: KoboldTailFrame,
): void {
  const { s, fx, fy, backK, profileK, lead, nowMs, runF, poleX, hurt } = f;
  const hide = hurt ? '#ffffff' : kb.hide;
  const frontK = Math.max(0, fy);
  const trail = -poleX * 0.12 * s;
  // Base spine: root planted at the hip, arcing out behind the facing.
  const rootX = -fx * 0.05 * s;
  const rootY = -0.06 * s;
  const tipX = -fx * (0.56 + 0.14 * profileK) * s + trail - lead * 0.2 * s * frontK;
  const tipY = 0.15 * s + 0.19 * s * backK;
  const cx = rootX + (tipX - rootX) * 0.42;
  const cy = rootY + 0.12 * s + 0.05 * s * backK;
  // The traveling wave: amplitude grows toward the tip (the root stays
  // planted in the pelvis), the whole thing runs faster at speed.
  const N = 10;
  const phase = nowMs * (0.0042 + 0.0038 * runF);
  const amp = s * (0.03 + 0.05 * runF);
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const mt = 1 - t;
    let x = mt * mt * rootX + 2 * mt * t * cx + t * t * tipX;
    let y = mt * mt * rootY + 2 * mt * t * cy + t * t * tipY;
    const tx = 2 * mt * (cx - rootX) + 2 * t * (tipX - cx);
    const ty = 2 * mt * (cy - rootY) + 2 * t * (tipY - cy);
    const tl = Math.hypot(tx, ty) || 1e-4;
    const wob = Math.sin(phase - t * 5.2) * amp * Math.pow(t, 1.4);
    x += (-ty / tl) * wob;
    y += (tx / tl) * wob;
    pts.push({ x, y });
  }
  // Per-point frames from the DISPLACED spine, then one filled ribbon
  // with an outline (the ram's carved-mass law) tapering to the tip.
  const w0 = 0.075 * s * kb.heavy;
  const sp = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(N, i + 1)]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dl = Math.hypot(dx, dy) || 1e-4;
    const t = i / N;
    return { x: p.x, y: p.y, px: -dy / dl, py: dx / dl, w: w0 * (1 - t * 0.92) * 0.5 };
  });
  ctx.fillStyle = hide;
  ctx.beginPath();
  for (let i = 0; i < sp.length; i++) {
    const p = sp[i]!;
    if (i === 0) ctx.moveTo(p.x + p.px * p.w, p.y + p.py * p.w);
    else ctx.lineTo(p.x + p.px * p.w, p.y + p.py * p.w);
  }
  for (let i = sp.length - 1; i >= 0; i--) {
    const p = sp[i]!;
    ctx.lineTo(p.x - p.px * p.w, p.y - p.py * p.w);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = hurt ? '#ffffff' : shade(kb.hide, -26);
  ctx.lineWidth = Math.max(1, w0 * 0.16);
  ctx.stroke();
  if (hurt) return;
  // The bare flesh tip: the last third of the whip pales out.
  ctx.strokeStyle = shade(KOBOLD_EAR_INNER, -4);
  ctx.lineCap = 'round';
  for (let i = 7; i < sp.length - 1; i++) {
    const p = sp[i]!;
    const q = sp[i + 1]!;
    ctx.lineWidth = Math.max(1, p.w * 1.9);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // Pale underside: the belly line along the low edge of the ribbon.
  ctx.strokeStyle = shade(kb.belly, -6);
  ctx.lineWidth = Math.max(1, s * 0.016);
  ctx.beginPath();
  for (let i = 1; i <= 4; i++) {
    const p = sp[i]!;
    // The perpendicular can flip along the spine — always take the
    // down-screen side for the belly edge.
    const sgn = p.py >= 0 ? 1 : -1;
    const x = p.x + p.px * p.w * 0.7 * sgn;
    const y = p.y + p.py * p.w * 0.7 * sgn;
    if (i === 1) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}
