import { markPulse, SLOT_GLINT_PHASE, type ArxMark } from './wornLight.js';
import { itemDef } from '@arx/content';
import { chamferRect } from './shapes.js';
import { CLOTH_HELMS } from './armorHelmsCloth.js';
import { METAL_HELMS } from './armorHelmsMetal.js';
import type { MetalHelmCtx } from './armorHelmCtx.js';
import { TORSO_LAYERS } from './armorTorsoLayers.js';
import type { TorsoCtx } from './armorTorsoCtx.js';
import { shade } from './tint.js';

import { auroraK, breezeK, cinderFlareK, cinderK, daybreakK, emberCrack, fenlightK, starPrick, stormArc, stormVeil, stormboltK, thistleSeed, tideBreakK, tideK, tideStream, voidK, voidRift, voidWink } from './armorClocks.js';
import type { BodyStyle, HelmStyle, OffhandStyle } from './armorStyles.js';
// Compat: the wardrobe's public doors stay on armor.ts while the
// shelves live in their own files (foundations F3.1).
export * from './armorStyles.js';
export { drawPauldron } from './armorPauldron.js';
// ------------------------------------------------------------ painters

/**
 * The torso local frame drawHumanoid establishes before calling in:
 * translated to the hip line, rotated by combat lean, scaled by the
 * fake-3D squash — every coordinate here foreshortens for free.
 */
export interface TorsoFrame {
  s: number;
  /** Shoulder / waist half-widths, hip→shoulder height (local units). */
  tw: number;
  ww: number;
  th: number;
  lead: number;
  profileK: number;
  backK: number;
  /**
   * THE TURNED GARMENT (the turned silhouette's fourth channel): the
   * SIGNED facing cosine. profileK says HOW side-on the body is; yaw
   * says WHICH way it turned. The painter slides its front-plane
   * content (chest marks, emblems, midline, lacing, tabard) toward
   * the leading edge and compresses it, shades the trailing side of
   * the quad as the turned-away plane, and lights the leading arris —
   * so a profile reads as a rotated VOLUME, not a symmetric card.
   */
  yaw: number;
  hurt: boolean;
  /** Foot-lift differential — the gait beat hems sway on. */
  strideSw: number;
  /** Wall-clock ms — hem flutter, ember pulses, living details. */
  nowMs: number;
  /** Gait blend 0..1 — billow and cloth drag scale with real speed. */
  runF: number;
  /**
   * Cloth drag in local x: the hem trails the direction of travel like
   * real cloth (screen travel, un-squashed by the caller). Signed.
   */
  dragX: number;
  /**
   * Seated blend 0..1 (the caller-smoothed sit channel). A seated robe
   * cannot hang its full length — the skirt pools on the ground.
   */
  sit?: number;
  /** Ground line under the body in torso-local units (seated drape). */
  groundY?: number;
  /** Solved knees in the torso local frame (seated knee tents). */
  seatKnees?: Array<{ x: number; y: number }>;
}

/**
 * Torso garment. Replaces the fixed tunic: the `tunic` silhouette with
 * no details is stroke-for-stroke the original body. Pauldrons are NOT
 * drawn here — they are true shoulder joints, painted in screen space
 * on the solved shoulder anchors (drawPauldron) so they ride the arms.
 */
/** The one scratch TorsoCtx (the WIND_TMP idiom) — filled per body. */
const TORSO_CTX = {} as TorsoCtx;

export function drawTorsoGarment(
  ctx: CanvasRenderingContext2D,
  st: BodyStyle,
  f: TorsoFrame,
): void {
  const { s, tw, ww, th, hurt, nowMs, runF, backK } = f;
  const col = hurt ? '#ffffff' : st.color;
  const wide = st.silhouette === 'cuirass' ? 1.04 : 1;
  const tww = tw * wide;
  const back = backK > 0.55;
  const metal = st.metal ?? shade(st.color, -20);
  // ---- THE TURNED GARMENT: past the diagonals the billboard commits
  // to its yaw. `turnK` ramps over the last stretch into a profile
  // (zero at and inside the diagonals — those already read), and the
  // front-plane content slides toward the LEADING edge and compresses,
  // the way a cuirass face foreshortens as the body rotates away from
  // the camera. The quad itself stays the body's mass; only what is
  // WORN ON THE FRONT PLANE travels.
  const turnRaw = Math.min(1, Math.max(0, (Math.abs(f.yaw) - 0.72) / 0.26));
  const turnK = turnRaw * turnRaw * (3 - 2 * turnRaw);
  const leadSign = f.yaw >= 0 ? 1 : -1;
  const faceSlide = leadSign * turnK * tww * 0.3;
  const faceSq = 1 - 0.42 * turnK;
  /** Enter/exit the turned front plane around a painted section. */
  const frontPlaneOn = (): void => {
    ctx.save();
    ctx.translate(faceSlide, 0);
    ctx.scale(faceSq, 1);
  };
  const frontPlaneOff = (): void => {
    ctx.restore();
  };

  // ---- the living skirt: a full-length robe hem that DRAGS behind the
  // travel, billows as the gait becomes a run, and ripples on its own
  // clock — cloth as motion, not a static trapezoid. Legs painted
  // earlier are covered naturally; hem stays above the boots.
  if (st.skirt > 0) {
    const y0 = -0.075 * s;
    // THE SEATED POOL: a seated hip line rides a hand's width off the
    // ground, so a full-length hem hanging from it would plunge through
    // the floor. Seated, the hem pulls UP to the true ground line and
    // SPREADS around the hips — cloth tucked under the sitter, not a
    // standing tube — while the travel life calms to a resting breath.
    const seatK = f.sit ?? 0;
    const hemYHang = 0.02 * s + st.skirt * s;
    const hemY = hemYHang + ((f.groundY ?? 0) + 0.05 * s - hemYHang) * seatK;
    const hemW = ww * (1.3 + 0.65 * seatK);
    const calm = 1 - 0.85 * seatK;
    const stride = f.strideSw * 0.025 * s * calm;
    const trail = f.dragX === 0 ? 0 : Math.sign(f.dragX);
    // Five hem points, left to right; drag bows the middle hardest,
    // flutter gives each point its own beat, speed lifts the trailing
    // edge so the cloth planes out behind a sprint.
    const hem: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 4; i++) {
      const u = i / 4;
      const bx = -hemW + u * 2 * hemW;
      const flutter =
        Math.sin(nowMs * 0.005 + i * 1.9) * 0.013 * s * (0.3 + 0.7 * runF) * calm +
        stride * Math.sin(u * Math.PI);
      const dx = f.dragX * (0.5 + 0.4 * Math.sin(u * Math.PI)) * s * calm + flutter;
      const lift =
        (runF * 0.055 * s * Math.max(0, (bx * trail) / hemW) +
          Math.abs(f.dragX) * 0.18 * s * Math.sin(u * Math.PI) * runF) *
        calm;
      // Pooled mounds: resting cloth holds FOLDS, not waves — a fixed
      // per-point undulation, no clock.
      const pool = seatK * 0.016 * s * Math.sin(i * 2.6 + 1.1);
      hem.push({ x: bx + dx, y: hemY - lift + pool });
    }
    // The underskirt: a second cloth layer swinging on a counter-phase
    // beneath the hem — layered depth is what makes a robe MAJESTIC
    // instead of a colored cone.
    if (st.underskirt && !hurt) {
      ctx.fillStyle = st.underskirt;
      ctx.beginPath();
      ctx.moveTo(-ww, y0);
      ctx.lineTo(ww, y0);
      for (let i = 4; i >= 0; i--) {
        const counter = Math.sin(nowMs * 0.005 + i * 1.9 + Math.PI) * 0.012 * s * (0.3 + 0.7 * runF);
        ctx.lineTo(hem[i]!.x * 1.06 + counter, hem[i]!.y + 0.045 * s);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-ww, y0);
    ctx.lineTo(ww, y0);
    for (let i = 4; i >= 0; i--) ctx.lineTo(hem[i]!.x, hem[i]!.y);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // Trailing-half shade keeps the torso's x=0 form split — and
      // committing to a profile it cross-fades onto the TRAILING half
      // (THE TURNED GARMENT), whichever side the yaw put it on.
      ctx.fillStyle = shade(st.color, -18);
      const skFlip = f.yaw >= 0 ? Math.min(1, Math.max(0, (f.yaw - 0.72) / 0.26)) : 0;
      const skHalf = (sgn: number, alpha: number): void => {
        if (alpha <= 0.004) return;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(0, y0);
        ctx.lineTo(sgn * ww, y0);
        if (sgn > 0) {
          ctx.lineTo(hem[4]!.x, hem[4]!.y);
          ctx.lineTo(hem[3]!.x, hem[3]!.y);
        } else {
          ctx.lineTo(hem[0]!.x, hem[0]!.y);
          ctx.lineTo(hem[1]!.x, hem[1]!.y);
        }
        ctx.lineTo(hem[2]!.x, hem[2]!.y);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      };
      skHalf(1, 1 - skFlip);
      skHalf(-1, skFlip);
      // A second, deeper fold line rides the drag — the crease that
      // says the cloth has weight.
      ctx.strokeStyle = shade(st.color, -28);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(-ww * 0.4 + f.dragX * 0.3 * s, y0 + 0.05 * s);
      ctx.quadraticCurveTo(
        -ww * 0.3 + f.dragX * 0.5 * s,
        (y0 + hemY) / 2,
        hem[1]!.x + hemW * 0.18,
        hem[1]!.y - 0.01 * s,
      );
      ctx.stroke();
      if (st.folds) {
        // Gravity folds: a second crease on the trailing half and a
        // catch-light rising beside the deep one — hanging cloth holds
        // more than one opinion about the wind.
        ctx.strokeStyle = shade(st.color, -24);
        ctx.lineWidth = Math.max(1, s * 0.013);
        ctx.beginPath();
        ctx.moveTo(ww * 0.5 + f.dragX * 0.25 * s, y0 + 0.06 * s);
        ctx.quadraticCurveTo(
          ww * 0.44 + f.dragX * 0.45 * s,
          (y0 + hemY) / 2,
          hem[3]!.x - hemW * 0.12,
          hem[3]!.y - 0.015 * s,
        );
        ctx.stroke();
        ctx.strokeStyle = shade(st.color, 12);
        ctx.beginPath();
        ctx.moveTo(-ww * 0.22 + f.dragX * 0.3 * s, y0 + 0.055 * s);
        ctx.quadraticCurveTo(
          -ww * 0.14 + f.dragX * 0.5 * s,
          (y0 + hemY) / 2,
          hem[1]!.x + hemW * 0.32,
          hem[1]!.y - 0.014 * s,
        );
        ctx.stroke();
      }
      // Hem trim follows the moving hem points.
      ctx.strokeStyle = st.trim;
      ctx.lineWidth = Math.max(1.5, s * 0.026);
      ctx.beginPath();
      ctx.moveTo(hem[0]!.x, hem[0]!.y - 0.012 * s);
      for (let i = 1; i <= 4; i++) ctx.lineTo(hem[i]!.x, hem[i]!.y - 0.012 * s);
      ctx.stroke();
      // Emberweave-style hems breathe: a warm pulse over the trim.
      if (st.glowTrim) {
        const pulse = 0.3 + 0.22 * Math.sin(nowMs * 0.0035);
        ctx.strokeStyle = st.glowTrim;
        ctx.globalAlpha = pulse;
        ctx.lineWidth = Math.max(2, s * 0.04);
        ctx.beginPath();
        ctx.moveTo(hem[0]!.x, hem[0]!.y - 0.012 * s);
        for (let i = 1; i <= 4; i++) ctx.lineTo(hem[i]!.x, hem[i]!.y - 0.012 * s);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (st.runes) {
        // Rune dashes floating just above the hem, each breathing on
        // its own phase — enchantment as punctuation, not a light show.
        ctx.strokeStyle = st.runes;
        ctx.lineWidth = Math.max(1, s * 0.016);
        for (let i = 0; i < 4; i++) {
          const p0 = hem[i]!;
          const p1 = hem[i + 1]!;
          const mx = (p0.x + p1.x) / 2;
          const my = (p0.y + p1.y) / 2 - 0.048 * s;
          ctx.globalAlpha = 0.45 + 0.4 * Math.sin(nowMs * 0.0028 + i * 1.9);
          ctx.beginPath();
          ctx.moveTo(mx, my - 0.018 * s);
          ctx.lineTo(mx, my + 0.018 * s);
          if (i % 2 === 0) {
            ctx.moveTo(mx - 0.015 * s, my - 0.004 * s);
            ctx.lineTo(mx + 0.015 * s, my - 0.004 * s);
          } else {
            ctx.moveTo(mx - 0.012 * s, my + 0.012 * s);
            ctx.lineTo(mx + 0.012 * s, my - 0.014 * s);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      if (st.dawnbands) {
        // THE HORIZON HEM: dawnsworn's own skirt — three flat bands
        // climbing off the hem trim, gold nearest the light, each
        // following the living hem's own contour. Dawn is layers,
        // and the layers keep the daybreak clock: as the brow sun
        // climbs, light walks the bands gold-first, the way a real
        // sunrise takes the horizon before it takes the sky.
        const dayK = daybreakK(nowMs, st.dawnbands.phase);
        for (const [bi, bandCol] of st.dawnbands.colors.entries()) {
          const lit = Math.min(1, Math.max(0, (dayK - (0.12 + bi * 0.3)) / 0.22));
          const lift = 0.032 * s + bi * 0.034 * s;
          ctx.strokeStyle = shade(bandCol, lit * 22);
          ctx.lineWidth = Math.max(2, s * (0.034 - bi * 0.007));
          ctx.beginPath();
          ctx.moveTo(hem[0]!.x * (1 - bi * 0.015), hem[0]!.y - lift);
          for (let i = 1; i <= 4; i++) {
            ctx.lineTo(hem[i]!.x * (1 - bi * 0.015), hem[i]!.y - lift);
          }
          ctx.stroke();
        }
      }
      if (st.depthveils) {
        // THE STRATA: the dark waters re-clothe the column — lapped
        // sheets of standing water descending the skirt, each a
        // step darker (the drowning gradient worn), every hem a
        // slack DIAGONAL waterline leaning against its neighbor and
        // breathing a beat behind it down the procession. The
        // diagonals are the point: they kill the tube.
        const dv = st.depthveils.colors;
        const kV = tideK(nowMs, 0.22);
        for (let vi = 0; vi < 3; vi++) {
          const cV = dv[Math.min(vi + 1, dv.length - 1)]!;
          const lean = (vi % 2 === 0 ? -1 : 1) * 0.06;
          const topU = 0.08 + vi * 0.3;
          const breathe = Math.sin(nowMs * 0.0019 + vi * 2.1) * 0.012 * s * (0.4 + 0.6 * kV);
          const yL = y0 + (hemY - y0) * (topU - lean) + breathe;
          const yR = y0 + (hemY - y0) * (topU + lean) + breathe;
          const wV = ww * (1 + topU * 0.3);
          ctx.fillStyle = cV;
          ctx.beginPath();
          ctx.moveTo(-wV, yL);
          ctx.quadraticCurveTo(-wV * 0.3, yL + 0.028 * s, wV * 0.12, (yL + yR) / 2 + 0.012 * s);
          ctx.quadraticCurveTo(wV * 0.62, yR - 0.014 * s, wV, yR);
          ctx.lineTo(hem[4]!.x, hem[4]!.y);
          for (let i = 3; i >= 0; i--) ctx.lineTo(hem[i]!.x, hem[i]!.y);
          ctx.closePath();
          ctx.fill();
          // ONE cold arris per seam, on the leading side only — an
          // edge the light found, never a drawn rim.
          ctx.strokeStyle = shade(cV, 26);
          ctx.lineWidth = Math.max(1, s * 0.008);
          ctx.lineCap = 'round';
          ctx.beginPath();
          if (f.lead === 1) {
            ctx.moveTo(wV * 0.26, (yL + yR) / 2 + 0.008 * s);
            ctx.quadraticCurveTo(wV * 0.66, yR - 0.012 * s, wV * 0.96, yR);
          } else {
            ctx.moveTo(-wV * 0.96, yL);
            ctx.quadraticCurveTo(-wV * 0.6, yL + 0.022 * s, -wV * 0.26, (yL + yR) / 2 + 0.008 * s);
          }
          ctx.stroke();
        }
        // THE SEAM RIP: the drawn current woven along the second
        // stratum's waterline — the cowl's ripseam answered on the
        // body; its beads run with the wrap of the cloth.
        if (st.undertow) {
          const unV = st.undertow;
          const brkV = tideBreakK(nowMs, 0.22);
          const yS = y0 + (hemY - y0) * 0.36;
          tideStream(
            ctx,
            -ww * 0.92, yS + 0.024 * s,
            ww * 0.96, yS - 0.018 * s,
            nowMs, 2.3, 0.014 * s,
            unV.water, unV.neon,
            0.4 + 0.32 * kV + 0.22 * brkV, Math.max(1, s * 0.0075),
            1 + 0.5 * brkV, unV.neon,
          );
        }
      }
      if (st.eddyring) {
        // THE EDDY: the wardrobe's third floating regalia — after
        // kingsmane's crown ring and aetherion's glyphs, the dark
        // waters wear a ring CURRENT orbiting the hips. Near arc
        // only; the far half is SKIPPED behind the cloth (the
        // floating-orbit occlusion law). Drawn casing under a cold
        // core with a traveling ripple at one constant pace (the
        // seamless law), droplets sinking off the low points. It
        // breathes with the tide and stands outside the garment's
        // yaw — floating regalia never take the front plane.
        const er = st.eddyring;
        const kE = tideK(nowMs, 0.18);
        const brkE = tideBreakK(nowMs, 0.18);
        // Mid-skirt, its own register: collar, seam, EDDY, tongues —
        // the four verses never crowd one another.
        const ry = y0 + (hemY - y0) * 0.56;
        const rrx = ww * (1.42 + 0.06 * kE);
        const rry = 0.056 * s * (1 + 0.08 * kE);
        const segs = 14;
        const traceE = (w2: number, colE: string, al: number): void => {
          ctx.strokeStyle = colE;
          ctx.globalAlpha = al;
          ctx.lineWidth = w2;
          ctx.beginPath();
          for (let i = 0; i <= segs; i++) {
            const a = Math.PI * (0.05 + (i / segs) * 0.9);
            const rip = Math.sin(i * 1.7 - nowMs * 0.0042) * 0.006 * s * (1 + 0.5 * brkE);
            const px = Math.cos(a) * rrx;
            const py = ry + Math.sin(a) * rry + rip;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        };
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        traceE(Math.max(1, s * 0.019), er.water, 0.55 + 0.2 * kE);
        traceE(Math.max(1, s * 0.009), er.neon, 0.6 + 0.4 * kE);
        ctx.globalAlpha = 1;
        // The droplets the current cannot keep — sinking off the
        // ring's low arc, fading as they go.
        ctx.fillStyle = er.neon;
        for (const [ph3, au] of [[0, 0.32], [0.5, 0.7]] as const) {
          const mu = ((nowMs * 0.00014 + ph3) % 1 + 1) % 1;
          const a = Math.PI * (0.05 + au * 0.9);
          ctx.globalAlpha = Math.sin(mu * Math.PI) * (0.35 + 0.4 * kE);
          ctx.beginPath();
          ctx.arc(Math.cos(a) * rrx, ry + Math.sin(a) * rry + mu * 0.07 * s, 0.008 * s * (1 - mu * 0.35), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      if (st.cinderveils) {
        // THE CINDER VEILS: the burnt strata — lapped sheets of
        // charred cloth descending the skirt, each a step darker,
        // every hem a slack burnt diagonal leaning against its
        // neighbor (the diagonals kill the tube). The ember light
        // lives in the GAPS between the laps, breathing with the
        // one breath — on the seam, never on the cloth.
        const cvD = st.cinderveils.colors;
        const kV = cinderK(nowMs, 0);
        for (let vi = 0; vi < 3; vi++) {
          const cV = cvD[Math.min(vi + 1, cvD.length - 1)]!;
          const lean = (vi % 2 === 0 ? -1 : 1) * 0.055;
          const topU = 0.1 + vi * 0.29;
          const breathe = Math.sin(nowMs * 0.0016 + vi * 1.7) * 0.008 * s * (0.3 + 0.7 * kV);
          const yL = y0 + (hemY - y0) * (topU - lean) + breathe;
          const yR = y0 + (hemY - y0) * (topU + lean) + breathe;
          const wV = ww * (1 + topU * 0.28);
          ctx.fillStyle = cV;
          ctx.beginPath();
          ctx.moveTo(-wV, yL);
          ctx.quadraticCurveTo(-wV * 0.34, yL + 0.022 * s, wV * 0.1, (yL + yR) / 2 + 0.01 * s);
          ctx.quadraticCurveTo(wV * 0.6, yR - 0.012 * s, wV, yR);
          ctx.lineTo(hem[4]!.x, hem[4]!.y);
          for (let i = 3; i >= 0; i--) ctx.lineTo(hem[i]!.x, hem[i]!.y);
          ctx.closePath();
          ctx.fill();
          // The gap light: a thin ember line hugging the seam from
          // beneath the lap above — the middle seam carries the
          // strongest watch; the others bank lower.
          if (st.emberveins) {
            ctx.strokeStyle = st.emberveins.ember;
            ctx.globalAlpha = (0.1 + 0.36 * kV) * (vi === 1 ? 1 : 0.55);
            ctx.lineWidth = Math.max(1, s * 0.008);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-wV * 0.88, yL + 0.008 * s);
            ctx.quadraticCurveTo(wV * 0.08, (yL + yR) / 2 + 0.016 * s, wV * 0.88, yR + 0.004 * s);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
          // One warm arris per seam, leading side only.
          ctx.strokeStyle = shade(cV, 20);
          ctx.lineWidth = Math.max(1, s * 0.008);
          ctx.lineCap = 'round';
          ctx.beginPath();
          if (f.lead === 1) {
            ctx.moveTo(wV * 0.26, (yL + yR) / 2 + 0.008 * s);
            ctx.quadraticCurveTo(wV * 0.64, yR - 0.01 * s, wV * 0.94, yR);
          } else {
            ctx.moveTo(-wV * 0.94, yL);
            ctx.quadraticCurveTo(-wV * 0.6, yL + 0.02 * s, -wV * 0.26, (yL + yR) / 2 + 0.008 * s);
          }
          ctx.stroke();
        }
      }
      if (st.mirehem) {
        // THE WATERLINE: the hem stitched as still black water — a
        // dark band riding the living hem's own contour, reed blades
        // standing out of it, and one slow ripple ring opening at a
        // time. The fen does not stop at the cloth.
        const mh = st.mirehem;
        const bandT = 0.082 * s;
        ctx.fillStyle = mh.water;
        ctx.beginPath();
        ctx.moveTo(hem[0]!.x, hem[0]!.y - bandT);
        for (let i = 1; i <= 4; i++) ctx.lineTo(hem[i]!.x, hem[i]!.y - bandT);
        for (let i = 4; i >= 0; i--) ctx.lineTo(hem[i]!.x, hem[i]!.y + 0.012 * s);
        ctx.closePath();
        ctx.fill();
        // The still surface: one paler table line along the top.
        ctx.strokeStyle = shade(mh.water, 16);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(hem[0]!.x, hem[0]!.y - bandT);
        for (let i = 1; i <= 4; i++) ctx.lineTo(hem[i]!.x, hem[i]!.y - bandT);
        ctx.stroke();
        // Reeds standing out of the water — leaning blades, seed
        // heads, no two at the same height.
        for (const [u, hR, leanR] of [[-0.62, 0.15, -0.12], [-0.3, 0.1, 0.1], [0.44, 0.125, 0.16]] as const) {
          const bx = u * ww * 1.15;
          const byW = hemY - bandT + 0.01 * s;
          ctx.strokeStyle = mh.reed;
          ctx.lineWidth = Math.max(2, s * 0.022);
          ctx.beginPath();
          ctx.moveTo(bx, byW);
          ctx.quadraticCurveTo(bx + leanR * ww * 0.4, byW - hR * s * 0.6, bx + leanR * ww, byW - hR * s);
          ctx.stroke();
          ctx.fillStyle = shade(mh.reed, 12);
          ctx.beginPath();
          ctx.ellipse(bx + leanR * ww, byW - hR * s - 0.016 * s, 0.011 * s, 0.026 * s, leanR * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // ONE ripple at a time: a ring opening where something under
        // the cloth moved, fading as it spreads.
        const rippleU = (nowMs % 5600) / 5600;
        const which = Math.floor(nowMs / 5600) % 3;
        const rx = [-0.55, 0.1, 0.6][which]! * ww;
        const rr = (0.02 + rippleU * 0.075) * s;
        ctx.globalAlpha = 0.62 * (1 - rippleU);
        ctx.strokeStyle = mh.ripple;
        ctx.lineWidth = Math.max(1, s * 0.011);
        ctx.beginPath();
        ctx.ellipse(rx, hemY - bandT * 0.4, rr, rr * 0.32, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (st.wispcourt) {
        // THE WISP COURT: three fen lights circling the hem in slow
        // court — the robe's floating regalia. Far-side lights are
        // SKIPPED while the skirt hides them and only peek dim past
        // the edges, per the floating-orbit occlusion law.
        const wcc = st.wispcourt.color;
        for (let i = 0; i < 3; i++) {
          const a = nowMs * 0.00042 + (i * Math.PI * 2) / 3;
          const ox = Math.cos(a) * ww * 1.42;
          const depth = Math.sin(a);
          if (depth < 0 && Math.abs(ox) < ww * 1.1) continue;
          const oy = hemY - 0.1 * s + Math.sin(nowMs * 0.0016 + i * 2.1) * 0.02 * s;
          const k = fenlightK(nowMs, i / 3);
          const dim = depth < 0 ? 0.45 : 1;
          const r = (0.02 + 0.01 * k) * s * (depth < 0 ? 0.7 : 1);
          ctx.globalAlpha = (0.16 + 0.3 * k) * dim;
          ctx.fillStyle = wcc;
          ctx.beginPath();
          ctx.arc(ox, oy, r * 2.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = (0.6 + 0.4 * k) * dim;
          ctx.fillStyle = shade(wcc, 30);
          ctx.beginPath();
          ctx.arc(ox, oy, r, 0, Math.PI * 2);
          ctx.fill();
          // The mote it sheds, falling home to the water.
          const fall = (nowMs * 0.0004 + i * 0.37) % 1;
          ctx.globalAlpha = 0.35 * k * dim * (1 - fall);
          ctx.fillStyle = wcc;
          ctx.beginPath();
          ctx.arc(ox + Math.sin(i * 5 + nowMs * 0.001) * 0.008 * s, oy + 0.03 * s + fall * 0.05 * s, r * 0.34, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      if (st.petalfall) {
        // PETALFALL: the orchid crown sheds — one petal at a time
        // drifting down the skirt, rocking as it falls.
        const u01 = (nowMs % 4200) / 4200;
        const which = Math.floor(nowMs / 4200) % 3;
        const px = [-0.5, 0.28, -0.05][which]! * ww + Math.sin(u01 * Math.PI * 3) * ww * 0.16;
        const py = y0 + (hemY - y0) * (0.08 + u01 * 0.85);
        ctx.globalAlpha = 0.85 * Math.min(1, (1 - u01) * 4) * Math.min(1, u01 * 8);
        ctx.fillStyle = st.petalfall.color;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(Math.sin(u01 * Math.PI * 4) * 0.9);
        ctx.beginPath();
        ctx.ellipse(0, 0, 0.023 * s, 0.013 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      if (st.mistwrap) {
        // THE LOW FOG: a translucent mist band sliding around the
        // skirt, guttering on the fen clock — the lot cut from fog
        // never quite gives it up.
        const mkW = fenlightK(nowMs, 0.5);
        const drift = (nowMs * 0.00012) % 1;
        ctx.fillStyle = st.mistwrap.color;
        for (let i = 0; i < 3; i++) {
          const u = ((drift + i / 3) % 1) * 2 - 1;
          const mx = u * ww * 1.2;
          const my = hemY - (0.16 + 0.05 * Math.sin(i * 2.4 + nowMs * 0.0009)) * s;
          ctx.globalAlpha = (0.1 + 0.14 * mkW) * (1 - Math.abs(u) * 0.55);
          ctx.beginPath();
          ctx.ellipse(mx, my, ww * (0.42 - 0.1 * Math.abs(u)), 0.036 * s, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      if (st.sunpatch && !back) {
        // THE SUN PATCH: sunshower's own — one warm window of light
        // sliding across the cloth as the clouds shift overhead.
        // The luck is that it keeps finding you.
        const k = stormboltK(nowMs, 0.6);
        const px = Math.sin(nowMs * 0.00019) * ww * 0.5;
        ctx.globalAlpha = 0.12 + 0.1 * k;
        ctx.fillStyle = st.sunpatch.color;
        ctx.beginPath();
        ctx.ellipse(px, y0 + (hemY - y0) * 0.55, ww * 0.4, (hemY - y0) * 0.34, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.1 + 0.12 * k;
        ctx.beginPath();
        ctx.ellipse(px - ww * 0.05, y0 + (hemY - y0) * 0.5, ww * 0.22, (hemY - y0) * 0.2, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (st.boltbrand && !back) {
        // THE BOLT BRAND: the storm's mark inlaid down the skirt's
        // leading side — a forged fork in its own dark channel,
        // charging on THE STORMBOLT clock and burning white on the
        // strike. Garment-scale: an heirloom, not a stitch. Sixth
        // station of the rolling sky: the skirt takes the discharge
        // after the waist.
        const k = stormboltK(nowMs, 0.54);
        const strike = k > 0.92;
        const bCol = st.boltbrand.color;
        const pr = 0.15 * s;
        const bbx = f.lead * ww * 0.52;
        const bby = y0 + (hemY - y0) * 0.48;
        const bolt = (m: number): void => {
          ctx.beginPath();
          ctx.moveTo(bbx + pr * 0.1 * m, bby - pr * 0.85 * m);
          ctx.lineTo(bbx - pr * 0.42 * m, bby + pr * 0.12 * m);
          ctx.lineTo(bbx - pr * 0.05 * m, bby + pr * 0.12 * m);
          ctx.lineTo(bbx - pr * 0.16 * m, bby + pr * 0.8 * m);
          ctx.lineTo(bbx + pr * 0.46 * m, bby - pr * 0.1 * m);
          ctx.lineTo(bbx + pr * 0.08 * m, bby - pr * 0.1 * m);
          ctx.closePath();
        };
        // The channel the fork sits in — inlay, not appliqué.
        ctx.fillStyle = 'rgba(14, 12, 24, 0.5)';
        bolt(1.3);
        ctx.fill();
        if (strike) {
          const fr = Math.floor(nowMs / 90);
          // The brand does not glow — it DISCHARGES into the cloth.
          stormArc(ctx, bbx + pr * 0.1, bby - pr * 0.85, bbx + pr * 0.95, bby - pr * 1.5, fr * 17 + 1, pr * 0.4, bCol, 0.85, Math.max(1, s * 0.008));
          stormArc(ctx, bbx - pr * 0.16, bby + pr * 0.8, bbx - pr * 1.05, bby + pr * 1.4, fr * 17 + 2, pr * 0.35, bCol, 0.75, Math.max(1, s * 0.007), false);
        }
        ctx.fillStyle = strike ? '#ffffff' : shade(bCol, Math.round(-22 + 40 * k));
        bolt(1);
        ctx.fill();
        ctx.fillStyle = shade(bCol, 32);
        ctx.fillRect(bbx - pr * 0.02, bby - pr * 0.5, pr * 0.14, pr * 0.14);
      }
      if (st.rainhem) {
        // THE RAIN HEM: the weather the robe walks in — a soaked
        // band riding the living hem, slanted rain falling past it,
        // and one ring at a time where a drop gives up.
        const rh = st.rainhem;
        ctx.fillStyle = 'rgba(16, 18, 30, 0.35)';
        ctx.beginPath();
        ctx.moveTo(hem[0]!.x, hem[0]!.y - 0.036 * s);
        for (let i = 1; i <= 4; i++) ctx.lineTo(hem[i]!.x, hem[i]!.y - 0.036 * s);
        for (let i = 4; i >= 0; i--) ctx.lineTo(hem[i]!.x, hem[i]!.y + 0.01 * s);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = rh.color;
        ctx.lineWidth = Math.max(1.5, s * 0.013);
        for (let i = 0; i < 5; i++) {
          const u = -1.3 + (i / 4) * 2.6;
          const fall = ((nowMs * 0.00058) + i * 0.23) % 1;
          const rx0 = u * ww * 1.12 + Math.sin(i * 3.1) * ww * 0.08;
          const ry0 = hemY - 0.34 * s + fall * 0.42 * s;
          ctx.globalAlpha = 0.55 * Math.sin(Math.PI * fall);
          ctx.beginPath();
          ctx.moveTo(rx0, ry0);
          ctx.lineTo(rx0 - f.lead * 0.016 * s, ry0 + 0.055 * s);
          ctx.stroke();
        }
        const spU = (nowMs % 3600) / 3600;
        const which = Math.floor(nowMs / 3600) % 3;
        const sx2 = [-0.7, 0.15, 0.85][which]! * ww;
        const srr = (0.014 + spU * 0.05) * s;
        ctx.globalAlpha = 0.55 * (1 - spU);
        ctx.strokeStyle = rh.color;
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        ctx.ellipse(sx2, hemY + 0.02 * s, srr, srr * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (st.starfield && !back) {
        // THE STARFIELD: the night the lights need behind them —
        // five stars seated in the skirt cloth, one waking at a
        // time. Asleep is SKIPPED whole (the dilate bar), never a
        // faint fly on the hem.
        for (let i = 0; i < 5; i++) {
          const [sx3, sy3] = ([[-0.72, 0.24], [0.55, 0.16], [-0.3, 0.52], [0.78, 0.62], [0.08, 0.36]] as const)[i]!;
          const tw2 = Math.sin(nowMs * 0.00034 + i * 2.51);
          if (tw2 < 0.25) continue;
          ctx.globalAlpha = 0.3 + 0.55 * ((tw2 - 0.25) / 0.75);
          ctx.fillStyle = st.starfield.color;
          starPrick(ctx, sx3 * ww, y0 + (hemY - y0) * sy3, (0.011 + 0.007 * tw2) * s);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      if (st.auroraband) {
        // THE RISING AURA, third forging: the continuous corkscrew
        // read as a STRING OF LIGHTS — too neat to be power. The
        // aura is now WISPS: eight short arcs of aurora, each on its
        // own height band and its own breathing radius, sweeping the
        // body on one wind but waking and fading on staggered
        // watches — radiant static, not a coil. Occlusion holds per
        // segment (glyph-ring law: skipped inside the silhouette,
        // dim past the far edge, in front on the near pass). All
        // motion at constant rates; the substorm and the flicker
        // speak only through amplitude, width and light. Floating
        // light, not garment: the hurt guard owns it.
        const ab = st.auroraband;
        const kA = auroraK(nowMs, 0.18);
        const spinA = nowMs * 0.00038;
        const yTopA = -0.155 * s;
        const yBotA = y0 + (hemY - y0) * 0.94;
        ctx.lineCap = 'round';
        // [height band 0..1, sweep span (rad), phase seat, color]
        const wisps: ReadonlyArray<readonly [number, number, number, number]> = [
          [0.04, 2.3, 0.0, 0], [0.16, 1.7, 2.6, 2], [0.3, 2.6, 4.4, 1],
          [0.44, 1.9, 1.4, 0], [0.56, 2.4, 5.3, 2], [0.68, 1.8, 3.3, 1],
          [0.8, 2.7, 0.9, 0], [0.9, 2.0, 4.0, 1],
        ];
        for (let wi = 0; wi < wisps.length; wi++) {
          const [band, span, seat, ci] = wisps[wi]!;
          const colR = ab.colors[ci % ab.colors.length]!;
          // Each wisp breathes awake and asleep on its own watch —
          // the flicker of static, never a synchronized string.
          const pulse = 0.32 + 0.68 * (0.5 + 0.5 * Math.sin(nowMs * 0.00131 + seat * 1.7));
          const wispA = (0.42 + 0.58 * kA) * pulse;
          if (wispA < 0.14) continue;
          const baseA = spinA + seat;
          const segsW = 12;
          let run: Array<{ x: number; y: number; a: number; far: boolean }> = [];
          const flush = (): void => {
            for (let q = 0; q + 1 < run.length; q++) {
              const p0 = run[q]!;
              const p1 = run[q + 1]!;
              const aa = ((p0.a + p1.a) / 2) * wispA;
              if (aa < 0.08) continue;
              const wF = p0.far ? 0.7 : 1;
              ctx.globalAlpha = Math.min(1, aa) * 0.55;
              ctx.strokeStyle = colR;
              ctx.lineWidth = Math.max(1.4, s * 0.021) * wF;
              ctx.beginPath();
              ctx.moveTo(p0.x, p0.y);
              ctx.lineTo(p1.x, p1.y);
              ctx.stroke();
              ctx.globalAlpha = Math.min(1, aa);
              ctx.strokeStyle = '#e8fff4';
              ctx.lineWidth = Math.max(1, s * 0.0085) * wF;
              ctx.beginPath();
              ctx.moveTo(p0.x, p0.y);
              ctx.lineTo(p1.x, p1.y);
              ctx.stroke();
              const rw = 0.5 + 0.5 * Math.sin(nowMs * 0.0011 + q * 2.3 + wi * 3.1);
              const ra = Math.min(1, aa) * (0.3 + 0.5 * rw);
              if (!p0.far && ra >= 0.3 && q % 2 === 0) {
                // Charge licks: radiating OUT from the body, the
                // static's own gesture (skipped whole below the
                // dilate bar).
                const outR = p0.x >= 0 ? 1 : -1;
                ctx.globalAlpha = ra * 0.8;
                ctx.strokeStyle = colR;
                ctx.lineWidth = Math.max(1.2, s * 0.011);
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p0.x + outR * (0.018 + 0.016 * kA) * s, p0.y - (0.03 + 0.04 * kA) * s);
                ctx.stroke();
              }
            }
            run = [];
          };
          for (let i = 0; i <= segsW; i++) {
            const tU = i / segsW;
            const aAng = baseA + tU * span;
            const hT = band + tU * 0.1;
            // The radius BREATHES in and out of orbit as the wisp
            // sweeps (energy, never wire) and follows the robe's
            // flare down the body.
            const flow = 1 + 0.13 * Math.sin(tU * 2.6 + nowMs * 0.0014 + seat);
            const rxA = ww * (1.02 + 0.6 * hT) * flow;
            const px = Math.cos(aAng) * rxA;
            const farA = Math.sin(aAng) < 0;
            if (!back && farA && Math.abs(px) < ww * (0.78 + 0.5 * hT)) {
              flush();
              continue;
            }
            run.push({
              x: px,
              y: yTopA + (yBotA - yTopA) * hT + Math.sin(aAng) * 0.045 * s,
              a: Math.sin(tU * Math.PI) * (farA ? 0.45 : 1),
              far: farA,
            });
          }
          flush();
        }
        // THE STATIC BREATH: twice a beat a bare flick of charge
        // jumps straight off the cloth into the air — position
        // cycling, life brief, drawn not glowed.
        if ((nowMs % 1150) < 150) {
          const fi = Math.floor(nowMs / 1150);
          const lifeF = ((nowMs % 1150) / 150);
          const aF = Math.sin(lifeF * Math.PI) * (0.4 + 0.5 * kA);
          if (aF >= 0.3) {
            const h = Math.sin(fi * 12.9898) * 43758.5453;
            const hT = 0.15 + ((h - Math.floor(h)) * 0.7);
            const outR = fi % 2 === 0 ? 1 : -1;
            const fx0 = outR * ww * (1.0 + 0.6 * hT);
            const fy0 = yTopA + (yBotA - yTopA) * hT;
            ctx.globalAlpha = aF;
            ctx.strokeStyle = ab.colors[fi % ab.colors.length]!;
            ctx.lineWidth = Math.max(1.2, s * 0.01);
            ctx.beginPath();
            ctx.moveTo(fx0, fy0);
            ctx.lineTo(fx0 + outR * 0.03 * s, fy0 - 0.014 * s);
            ctx.lineTo(fx0 + outR * 0.044 * s, fy0 - 0.036 * s);
            ctx.stroke();
          }
        }
        if (kA > 0.62) {
          // THE RISERS: the dance charges the aura past holding —
          // sparks climb the air and burn out going home.
          const ansR = (kA - 0.62) / 0.38;
          for (let m = 0; m < 3; m++) {
            const mu = ((nowMs * 0.00024 + m / 3) % 1 + 1) % 1;
            const aM = Math.sin(mu * Math.PI) * ansR * 0.9;
            if (aM < 0.32) continue;
            const mx = Math.sin(nowMs * 0.0009 + m * 2.6) * ww * (0.5 + 0.4 * (1 - mu));
            ctx.globalAlpha = aM;
            ctx.fillStyle = ab.colors[m % ab.colors.length]!;
            ctx.beginPath();
            ctx.arc(mx, yBotA - (yBotA - yTopA) * mu, (0.0085 - 0.003 * mu) * s, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      }
      if (st.frosthem) {
        // THE SNOWLINE: the frost under a dancing sky — a pale band
        // riding the living hem, breathing cold; when the dance
        // reaches its last station the snow ANSWERS, the curtain's
        // own colors walking the hem as short drawn dashes, never a
        // wash and never a glow.
        const fh = st.frosthem;
        const kF = auroraK(nowMs, 0.4);
        ctx.lineCap = 'round';
        ctx.strokeStyle = fh.color;
        ctx.globalAlpha = 0.5 + 0.2 * kF;
        ctx.lineWidth = Math.max(1.5, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(hem[0]!.x, hem[0]!.y - 0.012 * s);
        for (let i = 1; i <= 4; i++) ctx.lineTo(hem[i]!.x, hem[i]!.y - 0.012 * s);
        ctx.stroke();
        if (kF > 0.66) {
          const ans = (kF - 0.66) / 0.34;
          const colsF = st.auroraband?.colors ?? [fh.glow];
          const walkF = nowMs * 0.00042;
          for (let i = 0; i < 4; i++) {
            const uD = ((walkF + i * 0.29) % 1 + 1) % 1;
            const aD = (0.32 + 0.5 * ans * (0.5 + 0.5 * Math.sin(nowMs * 0.0013 + i * 1.9))) * Math.sin(Math.PI * uD);
            if (aD < 0.3) continue;
            const p0 = hem[i]!;
            const p1 = hem[i + 1]!;
            const dxD = p0.x + (p1.x - p0.x) * uD;
            const dyD = p0.y + (p1.y - p0.y) * uD - 0.024 * s;
            ctx.globalAlpha = aD;
            ctx.strokeStyle = colsF[i % colsF.length]!;
            ctx.lineWidth = Math.max(1.2, s * 0.011);
            ctx.beginPath();
            ctx.moveTo(dxD - 0.016 * s, dyD + 0.006 * s);
            ctx.lineTo(dxD + 0.016 * s, dyD - 0.006 * s);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }
      if (st.staticcourt) {
        // THE STATIC COURT: three charge sparks climbing the hem air
        // — faint while the sky banks, popping bright together on
        // the strike. The storm's answer to the fen's wisps: these
        // lights do not float, they RISE.
        const scC = st.staticcourt.color;
        const k = stormboltK(nowMs, 0.46);
        const strike = k > 0.92;
        for (let i = 0; i < 3; i++) {
          const u = [-1.18, 1.22, 0.1][i]!;
          if (Math.abs(u) < 0.9 && back) continue;
          const rise = ((nowMs * 0.00032) + i * 0.37) % 1;
          const px = u * ww + Math.sin(nowMs * 0.0019 + i * 2.2) * 0.014 * s;
          const py = hemY - rise * 0.34 * s;
          const rr = (0.011 + 0.005 * k) * s;
          const vis = Math.sin(Math.PI * rise);
          if (strike) {
            stormArc(ctx, px - rr * 2.2, py + rr * 1.6, px + rr * 2.2, py - rr * 1.8, Math.floor(nowMs / 90) * 23 + i, rr * 1.6, scC, 0.85 * vis, Math.max(1, s * 0.006), false);
          } else {
            ctx.globalAlpha = (0.3 + 0.45 * k) * vis;
            ctx.fillStyle = scC;
            ctx.beginPath();
            ctx.moveTo(px, py - rr);
            ctx.lineTo(px + rr * 0.6, py);
            ctx.lineTo(px, py + rr);
            ctx.lineTo(px - rr * 0.6, py);
            ctx.closePath();
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      }
      if (st.stormshroud) {
        // THE STORM SHROUD: the weather that will not leave — three
        // low fog banks sliding around the hem on their own winds,
        // and for one beat after the strike, lit from within.
        const kS = stormboltK(nowMs, 0.38);
        const strikeS = kS > 0.92;
        const drift = (nowMs * 0.00013) % 1;
        for (let i = 0; i < 3; i++) {
          const u = ((drift + i / 3) % 1) * 2 - 1;
          const mx = u * ww * 1.28;
          const my = hemY - (0.15 + 0.05 * Math.sin(i * 2.4 + nowMs * 0.0008)) * s;
          const fade = 1 - Math.abs(u) * 0.55;
          ctx.fillStyle = st.stormshroud.color;
          ctx.globalAlpha = (0.14 + 0.08 * kS + (strikeS ? 0.16 : 0)) * fade;
          ctx.beginPath();
          ctx.ellipse(mx, my, ww * (0.4 - 0.09 * Math.abs(u)), 0.04 * s, 0, 0, Math.PI * 2);
          ctx.fill();
          // The second lobe that keeps it a cloud, not a pill.
          ctx.globalAlpha = (0.12 + 0.08 * kS + (strikeS ? 0.14 : 0)) * fade;
          ctx.beginPath();
          ctx.ellipse(mx + ww * 0.14, my - 0.028 * s, ww * 0.2, 0.03 * s, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      if (st.groundflash) {
        // THE GROUND FLASH: thunderhead's own — the discharge's last
        // station: when the ripple reaches earth, the world under
        // the hem answers for one beat.
        const k = stormboltK(nowMs, 0.3);
        if (k > 0.92) {
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = st.groundflash.color;
          ctx.beginPath();
          ctx.ellipse(0, hemY + 0.045 * s, ww * 1.35, 0.05 * s, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          const fr = Math.floor(nowMs / 90);
          // The flash SKITTERS along the hem, never a rim light.
          stormArc(ctx, hem[0]!.x, hem[0]!.y - 0.01 * s, hem[2]!.x, hem[2]!.y - 0.014 * s, fr * 21 + 1, 0.022 * s, st.groundflash.color, 0.8, Math.max(1, s * 0.008), false);
          stormArc(ctx, hem[2]!.x, hem[2]!.y - 0.014 * s, hem[4]!.x, hem[4]!.y - 0.01 * s, fr * 21 + 2, 0.022 * s, st.groundflash.color, 0.8, Math.max(1, s * 0.008), false);
        }
      }
      if (st.foamtiers) {
        // THE LIVING SURF: tidecaller's own skirt — two scalloped
        // surf layers breaking over the cloth. The waterline RIDES
        // the tide: the tiers climb the robe with the swell and
        // draw back through the slack; the foam is crescents seated
        // in the scallop dips, swelling when the wave breaks, and
        // the backwash leaves its sparkle on the cloth below.
        const fCol = st.foamtiers.color;
        const kT = tideK(nowMs, 0.3);
        const brkT = tideBreakK(nowMs, 0.3);
        const lift = kT * 0.05 * s;
        for (const [ti, top, dv] of [[0, 0.26, 2], [1, 0.56, -7]] as const) {
          const tierTop = y0 + (hemY - y0) * top - 0.02 * s - lift * (1 - ti * 0.4);
          const tierBot = y0 + (hemY - y0) * (top + 0.28) - lift * (1 - ti * 0.4) * 0.6;
          const spread = 1 + (top + 0.28) * 0.3;
          ctx.fillStyle = shade(fCol, dv);
          ctx.beginPath();
          ctx.moveTo(-ww * (1 + top * 0.26), tierTop);
          ctx.lineTo(ww * (1 + top * 0.26), tierTop);
          for (let i = 4; i >= 0; i--) {
            const u = -1 + (i / 4) * 2;
            const px = u * ww * spread;
            const px2 = (u + 0.5) * ww * spread;
            ctx.quadraticCurveTo(
              (px + px2) / 2, tierBot + 0.026 * s,
              px, tierBot - 0.006 * s * Math.sin(i * 1.9),
            );
          }
          ctx.closePath();
          ctx.fill();
          // The surf line: foam crescents seated IN the scallop
          // dips — a gum, not loose dots — swelling at the break.
          ctx.fillStyle = st.trim;
          for (let i = 0; i < 4; i++) {
            const u = -0.75 + (i / 3) * 1.5;
            const fr2 = 0.016 * s * (1 + 0.3 * Math.sin(i * 2.2 + ti)) * (1 + 0.5 * brkT);
            ctx.beginPath();
            ctx.arc(u * ww * spread, tierBot + 0.008 * s, fr2, Math.PI * 0.92, Math.PI * 2.08);
            ctx.closePath();
            ctx.fill();
          }
        }
        // The backwash sparkle: what the retreating water leaves.
        if (brkT > 0.1) {
          ctx.fillStyle = st.trim;
          for (const [su, sv, ph] of [[-0.5, 0.94, 0], [0.15, 0.9, 0.4], [0.6, 0.96, 0.7]] as const) {
            const twk = Math.max(0, Math.sin((brkT + ph) * Math.PI * 2));
            if (twk < 0.2) continue;
            ctx.globalAlpha = twk * 0.8;
            ctx.beginPath();
            ctx.arc(su * ww, y0 + (hemY - y0) * sv, 0.008 * s, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      }
      if (st.luremotes) {
        // THE RISING LIGHT: the abyss breathes out — bioluminescent
        // motes climbing the hem air in their own procession, each
        // fading as it clears the cloth.
        const lm = st.luremotes.color;
        const kT = tideK(nowMs, 0.3);
        for (const [i, [ux, ph]] of ([[-0.7, 0], [0.05, 0.33], [0.72, 0.66]] as const).entries()) {
          const mu = ((nowMs * 0.00012 + ph) % 1 + 1) % 1;
          ctx.globalAlpha = Math.sin(mu * Math.PI) * (0.45 + 0.55 * kT);
          ctx.fillStyle = i === 1 ? shade(lm, 14) : lm;
          ctx.beginPath();
          ctx.arc(
            ux * ww + Math.sin(mu * 8 + i * 2.6) * 0.02 * s,
            hemY + 0.02 * s - mu * 0.24 * s,
            0.009 * s * (1.15 - mu * 0.4), 0, Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      if (st.hemcourse) {
        // ---- THE HEM COURSES: thistledown's skirt — two clean
        // lapped courses of tailored linen, each with its own stitch
        // border, stepping a value darker toward the ground. Layered
        // tailoring; the patchwork is dead.
        const [c1, c2] = st.hemcourse.colors;
        for (const [col2, top] of [[c1, 0.5], [c2, 0.74]] as const) {
          const tierTop = y0 + (hemY - y0) * top;
          const tierBot = y0 + (hemY - y0) * (top + 0.3);
          const sTop = 1 + top * 0.26;
          const sBot = 1 + (top + 0.3) * 0.26;
          ctx.fillStyle = col2;
          ctx.beginPath();
          ctx.moveTo(-ww * sTop, tierTop);
          ctx.lineTo(ww * sTop, tierTop);
          ctx.lineTo(ww * sBot, tierBot);
          ctx.quadraticCurveTo(ww * 0.4, tierBot + 0.022 * s, 0, tierBot + 0.018 * s);
          ctx.quadraticCurveTo(-ww * 0.4, tierBot + 0.022 * s, -ww * sBot, tierBot);
          ctx.closePath();
          ctx.fill();
          // The course's stitch border — the tailor's tick.
          ctx.strokeStyle = shade(col2, 22);
          ctx.lineWidth = Math.max(1, s * 0.007);
          ctx.setLineDash([s * 0.013, s * 0.012]);
          ctx.beginPath();
          ctx.moveTo(-ww * sBot * 0.94, tierBot - 0.008 * s);
          ctx.quadraticCurveTo(0, tierBot + 0.01 * s, ww * sBot * 0.94, tierBot - 0.008 * s);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        // THE VINE STITCH: one embroidered wave riding above the
        // courses — the sprig's garden, sewn all the way round.
        if (st.broidery) {
          const vy = y0 + (hemY - y0) * 0.42;
          ctx.strokeStyle = st.broidery.thread;
          ctx.lineWidth = Math.max(1, s * 0.0055);
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const x0v = -ww * 0.9 + (i / 6) * ww * 1.8;
            const x1v = -ww * 0.9 + ((i + 1) / 6) * ww * 1.8;
            ctx.moveTo(x0v, vy);
            ctx.quadraticCurveTo(
              (x0v + x1v) / 2, vy + (i % 2 === 0 ? -0.012 : 0.012) * s,
              x1v, vy,
            );
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      if (st.driftdown) {
        // ---- THE DRIFT: loosed seeds riding ONE WIND across the
        // hem air — entering on the trailing side, gone past the
        // leading edge, at one constant pace forever (the seamless
        // law). The passing breeze only brightens them: the gust
        // speaks through light, never through hurry.
        const bz2 = breezeK(nowMs, 0);
        for (const [i, [phi, hv]] of ([[0, 0.6], [0.36, 0.72], [0.7, 0.5]] as const).entries()) {
          const ub = ((nowMs * 0.00011 + phi) % 1 + 1) % 1;
          thistleSeed(
            ctx,
            -f.lead * ww * 1.25 + f.lead * ub * ww * 2.7,
            y0 + (hemY - y0) * hv - ub * 0.09 * s + Math.sin(ub * 9 + i * 2.2) * 0.014 * s,
            0.014 * s * (1 - ub * 0.2),
            st.driftdown.seed,
            f.lead * ub * 1.8,
            Math.sin(ub * Math.PI) * (0.3 + 0.7 * bz2),
          );
        }
      }
      if (st.winkmotes) {
        // THE ARRIVALS: voidwhisper's skirt lights — pale stars
        // living at FIXED seats down the cloth. Each wakes where it
        // sits, brightens, dies, and is next seen at its next seat.
        // Nothing travels; nothing drifts; the void arrives. The
        // whisper feeds them all on the one hush.
        const wmCol = st.winkmotes.color;
        const kV = voidK(nowMs, 0);
        for (const [wi, seedW] of [[0, 0.15], [1, 0.52], [2, 0.83]] as const) {
          const wk = voidWink(nowMs, seedW, 3);
          const seats: Array<[number, number]> = [
            [-0.62 + wi * 0.18, 0.38 + wi * 0.16],
            [0.5 - wi * 0.3, 0.6 - wi * 0.14],
            [-0.1 + wi * 0.44, 0.82 - wi * 0.2],
          ];
          const [su2, sv2] = seats[wk.i]!;
          ctx.fillStyle = wmCol;
          ctx.globalAlpha = wk.a * (0.35 + 0.55 * kV);
          ctx.beginPath();
          ctx.arc(
            su2 * ww, y0 + (hemY - y0) * sv2,
            0.0075 * s * (0.6 + 0.5 * wk.a), 0, Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        // One small fixed slit low on the trailing cloth — the
        // skirt's own wound, quiet until the whisper finds it.
        if (st.voidrift) {
          voidRift(
            ctx,
            -ww * 0.42, y0 + (hemY - y0) * 0.52,
            -ww * 0.3, y0 + (hemY - y0) * 0.86,
            9.4, 0.02 * s,
            st.voidrift.casing, st.voidrift.core, st.voidrift.void,
            nowMs, kV, Math.max(1, s * 0.006),
          );
        }
      }
      if (st.undertow) {
        // THE UNDERTOW's own verse: the motes that fall — born in
        // the waist shadow, gone below the hem, each one fading as
        // the dark takes it. (The drawn water lives in the strata
        // seam and the dissolving hem now; the light word carries.)
        const un = st.undertow;
        const kT = tideK(nowMs, 0.3);
        ctx.fillStyle = un.neon;
        for (const [i, [ux, ph]] of ([[-0.72, 0], [0.08, 0.37], [0.66, 0.71]] as const).entries()) {
          const mu = ((nowMs * 0.00011 + ph) % 1 + 1) % 1;
          ctx.globalAlpha = Math.sin(mu * Math.PI) * (0.3 + 0.4 * kT) * (i === 1 ? 1 : 0.8);
          ctx.beginPath();
          ctx.arc(
            ux * ww + Math.sin(mu * 6.5 + i * 2.1) * 0.014 * s,
            y0 + (hemY - y0) * 0.5 + mu * ((hemY - y0) * 0.5 + 0.05 * s),
            0.008 * s * (1.1 - mu * 0.45), 0, Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      if (st.spindrift) {
        // THE SPINDRIFT: the churn that never settles riding the
        // living hem — and when the wave breaks, spume streaks fly
        // off the leading side.
        const sd = st.spindrift.color;
        const brkT = tideBreakK(nowMs, 0.3);
        const slide = Math.sin(nowMs * 0.0006) * 0.02 * s;
        ctx.fillStyle = sd;
        for (const [i, hp] of hem.entries()) {
          if (i % 2 === 0) continue;
          ctx.beginPath();
          ctx.arc(hp.x + slide, hp.y - 0.012 * s, 0.014 * s * (1 + 0.4 * brkT), Math.PI * 0.92, Math.PI * 2.08);
          ctx.closePath();
          ctx.fill();
        }
        if (brkT > 0.1) {
          const fly = 1 - brkT;
          ctx.strokeStyle = sd;
          ctx.lineCap = 'round';
          ctx.lineWidth = Math.max(1, s * 0.008);
          for (const dph of [0, 0.3] as const) {
            const du = Math.min(1, fly + dph);
            if (du >= 1) continue;
            ctx.globalAlpha = (1 - du) * 0.8;
            const sx = f.lead * ww * (1.0 + du * 0.5);
            const sy = hemY - 0.05 * s - du * 0.03 * s;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + f.lead * (0.035 + du * 0.02) * s, sy - 0.006 * s);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
      }
      if (st.constellation && !back) {
        // THE CONSTELLATION: starweaver's own skirt — five stars
        // joined by faint thread lines low on the cloth, flaring one
        // at a time in sequence. A sky you can read twice.
        const cCol = st.constellation.color;
        const pts: Array<[number, number]> = [
          [-0.55, 0.42], [-0.2, 0.3], [0.12, 0.46], [0.42, 0.34], [0.6, 0.58],
        ];
        ctx.strokeStyle = shade(cCol, -18);
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = Math.max(1, s * 0.007);
        ctx.beginPath();
        for (const [i, [u, v]] of pts.entries()) {
          const px = u * ww;
          const py = y0 + (hemY - y0) * v;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        const turn = Math.floor(nowMs / 900) % pts.length;
        const ft = (nowMs % 900) / 900;
        for (const [i, [u, v]] of pts.entries()) {
          const px = u * ww;
          const py = y0 + (hemY - y0) * v;
          const lit = i === turn ? Math.sin(ft * Math.PI) : 0;
          const r = 0.011 * s * (1 + lit * 0.8);
          ctx.fillStyle = shade(cCol, lit * 40);
          ctx.beginPath();
          ctx.moveTo(px, py - r * 1.6);
          ctx.lineTo(px + r * 0.5, py - r * 0.5);
          ctx.lineTo(px + r * 1.6, py);
          ctx.lineTo(px + r * 0.5, py + r * 0.5);
          ctx.lineTo(px, py + r * 1.6);
          ctx.lineTo(px - r * 0.5, py + r * 0.5);
          ctx.lineTo(px - r * 1.6, py);
          ctx.lineTo(px - r * 0.5, py - r * 0.5);
          ctx.closePath();
          ctx.fill();
          if (lit > 0.4) {
            ctx.globalAlpha = (lit - 0.4) * 0.5;
            ctx.fillStyle = cCol;
            ctx.beginPath();
            ctx.arc(px, py, r * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
      }
      if (st.skirtSlit && !back && seatK < 0.5) {
        // The center slit lets the stride read through the cloth —
        // pooled seated cloth has no stride, the slit closes.
        ctx.fillStyle = 'rgba(24, 15, 26, 0.55)';
        ctx.beginPath();
        ctx.moveTo(hem[2]!.x * 0.5, hemY - st.skirt * s * 0.6);
        ctx.lineTo(hem[2]!.x + 0.035 * s, hem[2]!.y);
        ctx.lineTo(hem[2]!.x - 0.035 * s, hem[2]!.y);
        ctx.closePath();
        ctx.fill();
      }
      if (back) {
        // Back panel seam — robes are tailored, front and back.
        ctx.strokeStyle = shade(st.color, -24);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(0, y0 + 0.02 * s);
        ctx.lineTo(hem[2]!.x * 0.8, hem[2]!.y - 0.02 * s);
        ctx.stroke();
      }
    }
    // THE DISSOLVING HEM: outside the hurt guard on purpose — the
    // tongues change the garment's OUTLINE, so they are structure
    // and must hold white in the flash (the hurt amendment).
    if (st.sinkhem) {
      const sh2 = st.sinkhem;
      const kH = tideK(nowMs, 0.3);
      const brkH = tideBreakK(nowMs, 0.3);
      const hemAt = (u: number): { x: number; y: number } => {
        const fu = ((u + 1) / 2) * 4;
        const i0 = Math.min(3, Math.floor(fu));
        const fr2 = fu - i0;
        return {
          x: hem[i0]!.x + (hem[i0 + 1]!.x - hem[i0]!.x) * fr2,
          y: hem[i0]!.y + (hem[i0 + 1]!.y - hem[i0]!.y) * fr2,
        };
      };
      if (!hurt) {
        // The deep between the tongues, first — the water the robe
        // is entering.
        ctx.fillStyle = sh2.deep;
        ctx.beginPath();
        ctx.moveTo(hem[0]!.x, hem[0]!.y - 0.014 * s);
        for (let i = 1; i <= 4; i++) ctx.lineTo(hem[i]!.x, hem[i]!.y - 0.014 * s);
        for (let i = 4; i >= 0; i--) ctx.lineTo(hem[i]!.x * 1.01, hem[i]!.y + 0.03 * s);
        ctx.closePath();
        ctx.fill();
      }
      // Six tongues, no two alike, drawn full edges — torn cloth
      // still earns its edge. They reach a hair further at the
      // swell and sway on their own slow clocks.
      ctx.fillStyle = hurt ? '#ffffff' : sh2.color;
      for (const [ui, len, wT, ph] of [
        [-0.92, 0.075, 0.05, 0], [-0.55, 0.11, 0.062, 1.4],
        [-0.16, 0.085, 0.054, 2.9], [0.2, 0.12, 0.06, 0.8],
        [0.58, 0.09, 0.055, 2.2], [0.9, 0.07, 0.048, 3.6],
      ] as const) {
        const hp = hemAt(ui);
        const sway2 = hurt ? 0 : Math.sin(nowMs * 0.0011 + ph) * 0.008 * s;
        const lenY = len * s * (1 + 0.16 * kH + 0.12 * brkH);
        ctx.beginPath();
        ctx.moveTo(hp.x - wT * s * 0.5, hp.y - 0.02 * s);
        ctx.lineTo(hp.x + wT * s * 0.5, hp.y - 0.02 * s);
        ctx.quadraticCurveTo(hp.x + wT * s * 0.22 + sway2, hp.y + lenY * 0.6, hp.x + sway2 * 1.4, hp.y + lenY);
        ctx.quadraticCurveTo(hp.x - wT * s * 0.3 + sway2 * 0.6, hp.y + lenY * 0.55, hp.x - wT * s * 0.5, hp.y - 0.02 * s);
        ctx.closePath();
        ctx.fill();
      }
      if (!hurt) {
        // Two tongue tips shed their beads in the procession — the
        // last of the robe, going under.
        ctx.fillStyle = st.undertow?.neon ?? st.trim;
        for (const [ui2, ph2, tl] of [[-0.55, 0.15, 0.11], [0.2, 0.6, 0.12]] as const) {
          const mu = ((nowMs * 0.00013 + ph2) % 1 + 1) % 1;
          const hp = hemAt(ui2);
          ctx.globalAlpha = Math.sin(mu * Math.PI) * (0.45 + 0.35 * kH);
          ctx.beginPath();
          ctx.arc(hp.x + Math.sin(mu * 7) * 0.006 * s, hp.y + tl * s + mu * 0.09 * s, 0.0075 * s * (1 - mu * 0.4), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
    // THE ASH HEM: outside the hurt guard on purpose — the tongues
    // change the garment's OUTLINE, so they are structure and hold
    // white in the flash. The hem is burning away: charred tongues
    // reaching past the cloth's bottom edge, THE BURN LINE crawling
    // where cloth becomes ash, and sparks that RISE off it and die.
    // What the robe loses, it gives to the air.
    if (st.ashhem) {
      const ah = st.ashhem;
      const kA = cinderK(nowMs, 0);
      const flA = cinderFlareK(nowMs, 0);
      const hemAtA = (u: number): { x: number; y: number } => {
        const fu = ((u + 1) / 2) * 4;
        const i0 = Math.min(3, Math.floor(fu));
        const fr2 = fu - i0;
        return {
          x: hem[i0]!.x + (hem[i0 + 1]!.x - hem[i0]!.x) * fr2,
          y: hem[i0]!.y + (hem[i0 + 1]!.y - hem[i0]!.y) * fr2,
        };
      };
      // Six charred tongues, no two alike — hard jagged cuts, not
      // water curves: burnt cloth breaks, it does not pour.
      ctx.fillStyle = hurt ? '#ffffff' : ah.char;
      for (const [ui, len, wT, ph] of [
        [-0.9, 0.07, 0.052, 0], [-0.52, 0.105, 0.06, 1.6],
        [-0.14, 0.08, 0.052, 3.1], [0.22, 0.115, 0.058, 0.9],
        [0.6, 0.085, 0.054, 2.4], [0.9, 0.065, 0.046, 3.8],
      ] as const) {
        const hp = hemAtA(ui);
        const sway2 = hurt ? 0 : Math.sin(nowMs * 0.0012 + ph) * 0.006 * s;
        const lenY = len * s * (1 + 0.1 * kA);
        ctx.beginPath();
        ctx.moveTo(hp.x - wT * s * 0.5, hp.y - 0.02 * s);
        ctx.lineTo(hp.x + wT * s * 0.5, hp.y - 0.02 * s);
        ctx.lineTo(hp.x + wT * s * 0.18 + sway2, hp.y + lenY * 0.55);
        ctx.lineTo(hp.x + sway2, hp.y + lenY);
        ctx.lineTo(hp.x - wT * s * 0.26 + sway2 * 0.6, hp.y + lenY * 0.5);
        ctx.closePath();
        ctx.fill();
      }
      if (!hurt) {
        // THE BURN LINE: the one fissure riding the living hem —
        // its embers walk it at one pace forever; the flare speaks
        // through their weight, never their speed.
        emberCrack(
          ctx,
          hem[0]!.x, hem[0]!.y - 0.012 * s,
          hem[4]!.x, hem[4]!.y - 0.012 * s,
          7.4, 0.008 * s,
          st.emberveins?.casing ?? shade(ah.ember, -30), ah.ember,
          nowMs, Math.max(kA, flA), Math.max(1, s * 0.007),
        );
        // THE RISING: sparks born on the burn line, climbing past
        // the skirt and dying — brightest when the fire remembers.
        ctx.fillStyle = ah.ember;
        for (const [i, [ux, ph2]] of ([[-0.6, 0], [0.1, 0.4], [0.7, 0.73]] as const).entries()) {
          const mu = ((nowMs * 0.00012 + ph2) % 1 + 1) % 1;
          const hp = hemAtA(ux);
          ctx.globalAlpha = Math.sin(mu * Math.PI) * (0.22 + 0.3 * kA + 0.3 * flA);
          ctx.beginPath();
          ctx.arc(
            hp.x + Math.sin(mu * 6 + i * 2.2) * 0.015 * s,
            hp.y - 0.01 * s - mu * 0.22 * s,
            0.0075 * s * (1 - mu * 0.35), 0, Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }

    // THE SUNDERED HEM: outside the hurt guard on purpose — the
    // floating course changes the garment's OUTLINE, so it is
    // structure and holds white in the flash. The robe's last hem
    // course is SEVERED: the cloth's cut edge wears a plasma lip, a
    // strip of open dark crosses where the course was, and the
    // course itself hovers below — a hair wider than the cloth
    // above (the taken piece breaks the tube's line), its lower
    // edge torn, drifting on the hush. The void does not return
    // what it takes; it holds it exactly where it was.
    if (st.sunderhem) {
      const shm = st.sunderhem;
      const kS2 = voidK(nowMs, 0);
      const vrS = st.voidrift;
      const hemAtS = (u: number): { x: number; y: number } => {
        const fu = ((u + 1) / 2) * 4;
        const i0 = Math.min(3, Math.floor(fu));
        const fr2 = fu - i0;
        return {
          x: hem[i0]!.x + (hem[i0 + 1]!.x - hem[i0]!.x) * fr2,
          y: hem[i0]!.y + (hem[i0 + 1]!.y - hem[i0]!.y) * fr2,
        };
      };
      const hov = Math.sin(nowMs * 0.0008) * 0.007 * s;
      const dft = Math.sin(nowMs * 0.0005 + 2.1) * 0.008 * s;
      const gapH = 0.036 * s + 0.016 * s * kS2 + hov;
      const bandH = 0.052 * s;
      const uu = [-1, -0.5, 0, 0.5, 1] as const;
      const jagB = (i: number): number =>
        0.013 * s * Math.sin(i * 2.6 + 0.8) * (i % 2 === 0 ? 1 : -0.6);
      // THE FLOATING COURSE.
      ctx.fillStyle = hurt ? '#ffffff' : shm.color;
      ctx.beginPath();
      {
        const p0 = hemAtS(-1);
        ctx.moveTo(p0.x * 1.06 + dft, p0.y + gapH);
        for (let i = 1; i < uu.length; i++) {
          const p = hemAtS(uu[i]!);
          ctx.lineTo(p.x * 1.06 + dft, p.y + gapH);
        }
        for (let i = uu.length - 1; i >= 0; i--) {
          const p = hemAtS(uu[i]!);
          ctx.lineTo(p.x * 1.06 + dft, p.y + gapH + bandH + jagB(i));
        }
      }
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        // The course keeps the robe's own trailing shadow — a
        // severed piece is still the same cloth under the same sun.
        ctx.fillStyle = shade(shm.color, -14);
        ctx.beginPath();
        {
          const pm = hemAtS(0);
          const p1 = hemAtS(1);
          ctx.moveTo(pm.x + dft, pm.y + gapH);
          ctx.lineTo(p1.x * 1.06 + dft, p1.y + gapH);
          ctx.lineTo(p1.x * 1.06 + dft, p1.y + gapH + bandH + jagB(4));
          ctx.lineTo(pm.x + dft, pm.y + gapH + bandH + jagB(2));
        }
        ctx.closePath();
        ctx.fill();
        // THE TORN LIPS wear the only light: the cloth's cut edge
        // above and the course's top lip below, on the one hush.
        ctx.save();
        ctx.lineCap = 'round';
        const lip = (dy: number, scaleX: number, dx: number): void => {
          ctx.beginPath();
          const p0 = hemAtS(-1);
          ctx.moveTo(p0.x * scaleX + dx, p0.y + dy);
          for (let i = 1; i < uu.length; i++) {
            const p = hemAtS(uu[i]!);
            ctx.lineTo(p.x * scaleX + dx, p.y + dy);
          }
          ctx.stroke();
        };
        ctx.strokeStyle = vrS?.casing ?? shade(st.trim, -14);
        ctx.globalAlpha = 0.26 + 0.46 * kS2;
        ctx.lineWidth = Math.max(1, s * 0.012);
        lip(-0.004 * s, 1, 0);
        lip(gapH, 1.06, dft);
        ctx.strokeStyle = vrS?.core ?? st.trim;
        ctx.globalAlpha = 0.2 + 0.55 * kS2;
        ctx.lineWidth = Math.max(1, s * 0.0055);
        lip(-0.004 * s, 1, 0);
        lip(gapH, 1.06, dft);
        ctx.restore();
        // THE ARRIVAL in the gap: one star, three fixed seats along
        // the severance — seen, then elsewhere.
        const wkH = voidWink(nowMs, 0.31, 3);
        const seatU2 = [-0.55, 0.12, 0.62][wkH.i]!;
        const sp = hemAtS(seatU2);
        ctx.fillStyle = vrS?.core ?? st.trim;
        ctx.globalAlpha = wkH.a * (0.4 + 0.6 * kS2);
        ctx.beginPath();
        ctx.arc(
          sp.x, sp.y + gapH * 0.5,
          0.007 * s * (0.6 + 0.5 * wkH.a), 0, Math.PI * 2,
        );
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  // ---- base torso quad — the original tunic geometry.
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-tww, -th);
  ctx.lineTo(tww, -th);
  ctx.lineTo(ww, 0.02 * s);
  ctx.lineTo(-ww, 0.02 * s);
  ctx.closePath();
  ctx.fill();

  if (!hurt) {
    // THE TURNED FORM: face-on, the form split shades the screen-right
    // half (ONE SUN stays screen-left). Committing to a profile, the
    // shaded half must become the TRAILING half — the plane rotated
    // away from the camera — whichever side that lands on. Facing W
    // the trailing half IS screen-right, so the static split already
    // tells the truth; facing E the split cross-fades to the left half
    // as turnK engages, and the trailing edge gains a deeper core
    // shadow so the turn reads as volume, not tint.
    const shadeHalf = (sgn: number, alpha: number): void => {
      if (alpha <= 0.004) return;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(0, -th);
      ctx.lineTo(sgn * tww, -th);
      ctx.lineTo(sgn * ww, 0.02 * s);
      ctx.lineTo(0, 0.02 * s);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    };
    ctx.fillStyle = shade(st.color, -18);
    const flipK = leadSign > 0 ? turnK : 0;
    shadeHalf(1, 1 - flipK);
    shadeHalf(-1, flipK);
    // THE GARMENT'S LAYERS (foundations F3.3): the ninety decoration
    // blocks live in armorTorsoLayers.ts as an ordered array — the array
    // IS the dress code. Context rides the module scratch (WIND_TMP
    // idiom), assembled once per body.
    TORSO_CTX.back = back;
    TORSO_CTX.ctx = ctx;
    TORSO_CTX.f = f;
    TORSO_CTX.frontPlaneOff = frontPlaneOff;
    TORSO_CTX.frontPlaneOn = frontPlaneOn;
    TORSO_CTX.hurt = hurt;
    TORSO_CTX.leadSign = leadSign;
    TORSO_CTX.metal = metal;
    TORSO_CTX.nowMs = nowMs;
    TORSO_CTX.runF = runF;
    TORSO_CTX.s = s;
    TORSO_CTX.st = st;
    TORSO_CTX.th = th;
    TORSO_CTX.turnK = turnK;
    TORSO_CTX.tw = tw;
    TORSO_CTX.tww = tww;
    TORSO_CTX.ww = ww;
    for (const layer of TORSO_LAYERS) layer(TORSO_CTX);
  }

  // ---- seated knee tents: a raised knee lifts the robe's front into
  // a cloth peak — the skirt drapes OVER the leg instead of the shin
  // punching bare through the pooled hem. Painted last: the tented
  // cloth is the nearest layer of the whole garment (it covers the
  // lower torso exactly as a knee held to the chest does). Facing away
  // the legs live behind the torso and the back panel hides them.
  const seatK = f.sit ?? 0;
  if (st.skirt > 0 && seatK > 0.35 && f.seatKnees && !back) {
    const gy = (f.groundY ?? 0) + 0.05 * s;
    const a = Math.min(1, (seatK - 0.35) / 0.4);
    for (const kn of f.seatKnees) {
      const peakY = kn.y - 0.02 * s;
      // A low knee (the lounger's stretch) stays under the pool; only
      // a genuinely raised knee tents the cloth.
      if (peakY > gy - 0.1 * s) continue;
      if (Math.abs(kn.x) > ww * 2.6) continue;
      const bw = 0.115 * s;
      ctx.globalAlpha = a;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(kn.x - bw, gy);
      ctx.quadraticCurveTo(kn.x - bw * 0.55, peakY + 0.02 * s, kn.x, peakY);
      ctx.quadraticCurveTo(kn.x + bw * 0.55, peakY + 0.02 * s, kn.x + bw, gy);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        // The trailing face folds dark; the ridge line catches light —
        // the same one-cut shading the hanging skirt lives by.
        ctx.fillStyle = shade(st.color, -18);
        ctx.beginPath();
        ctx.moveTo(kn.x, peakY);
        ctx.quadraticCurveTo(kn.x + bw * 0.55, peakY + 0.02 * s, kn.x + bw, gy);
        ctx.lineTo(kn.x, gy);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(st.color, 12);
        ctx.lineWidth = Math.max(1, s * 0.018);
        ctx.beginPath();
        ctx.moveTo(kn.x - bw * 0.72, gy - (gy - peakY) * 0.35);
        ctx.quadraticCurveTo(kn.x - bw * 0.3, peakY + 0.016 * s, kn.x, peakY);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }
  if (st.arx && !hurt) drawArxWeave(ctx, st, f);
}

/**
 * THE WEAVE — the body slot's channel. Rune work following the
 * garment's own construction lines rather than floating on top of it:
 * a seam down the breast with three cross ticks, and a collar arc at
 * the throat.
 *
 * A garment that ALREADY owns rune work is left alone here. withArx
 * recolored its authored runes to the bonded school on the way in, so
 * the artist's shapes survive and only the hue answers the enchant;
 * painting this seam over the top as well would give those pieces two
 * rune systems at once, which is exactly the mush this grammar exists
 * to prevent. Every other torso in the game gets the seam.
 *
 * Facing-aware: the seam narrows into the profile and swaps to a plain
 * spine line at the back, because a breast seam drawn on someone's
 * shoulder blades reads as a bug and nothing else.
 */
function drawArxWeave(ctx: CanvasRenderingContext2D, st: BodyStyle, f: TorsoFrame): void {
  const mark = st.arx!;
  if (st.runes) return;
  const { s, tw, ww, th, backK, profileK, nowMs } = f;
  const alpha = markPulse(mark, nowMs, SLOT_GLINT_PHASE.body ?? 0, 0.7);
  if (alpha <= 0.02) return;
  // The chest narrows as the body turns; at the back the seam becomes
  // the spine, which is the same line seen from the other side.
  const narrow = 1 - profileK * 0.55;
  const topY = -th * 0.86;
  const botY = -th * 0.12;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha * 0.85);
  ctx.strokeStyle = mark.mid;
  ctx.lineWidth = Math.max(1.1, s * 0.017);
  ctx.beginPath();
  ctx.moveTo(0, topY);
  ctx.lineTo(0, botY);
  ctx.stroke();
  // Three ticks crossing the seam, each breathing on its own phase so
  // the weave reads as punctuation rather than a lit stripe.
  const half = ((tw + ww) / 2) * 0.42 * narrow * (1 - backK * 0.25);
  ctx.lineWidth = Math.max(1, s * 0.013);
  for (let i = 0; i < 3; i++) {
    const y = topY + ((botY - topY) * (i + 0.7)) / 3.4;
    const w = half * (1 - i * 0.16);
    ctx.globalAlpha = Math.min(1, alpha * (0.55 + 0.45 * Math.sin(nowMs * 0.0028 + i * 1.9)));
    ctx.strokeStyle = i === 1 ? mark.core : mark.mid;
    ctx.beginPath();
    ctx.moveTo(-w, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  // The collar: a shallow arc at the throat that closes the seam at the
  // top. Dropped at the back facing, where there is no throat to ring.
  if (backK < 0.6) {
    ctx.globalAlpha = Math.min(1, alpha * 0.9 * (1 - backK));
    ctx.strokeStyle = mark.core;
    ctx.lineWidth = Math.max(1, s * 0.015);
    ctx.beginPath();
    ctx.moveTo(-tw * 0.34 * narrow, topY + th * 0.04);
    ctx.quadraticCurveTo(0, topY - th * 0.06, tw * 0.34 * narrow, topY + th * 0.04);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * A pauldron as a real shoulder JOINT: painted in screen space on the
 * solved shoulder anchor, after its arm, so it caps the arm root and
 * rides swings instead of staying glued to the torso corners. `side`
 * is the outward direction sign; `squashK` is the body's facing squash.
 */


/** The head local frame (inside the torso squash) drawHelmet works in. */
export interface HeadFrame {
  s: number;
  headX: number;
  headY: number;
  hw: number;
  hh: number;
  cut: number;
  headR: number;
  fx: number;
  profileK: number;
  backK: number;
  lead: number;
  hurt: boolean;
  /** Wall-clock ms — hat-tip sway, living micro-motion. */
  nowMs: number;
}

/**
 * Styled head gear. `dome` reproduces the original helmet exactly;
 * the other kinds extend the same band grammar the face uses.
 */
/** The one scratch HelmCtx (the WIND_TMP idiom) — assembled per call. */
const HELM_CTX = {} as MetalHelmCtx;

export function drawHelmet(ctx: CanvasRenderingContext2D, st: HelmStyle, f: HeadFrame): void {
  const { s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt } = f;
  const mc = hurt ? '#ffffff' : st.color;

  if (st.halo && !hurt) {
    // The floating ring: hovers on its own slow clock, never touching
    // the crown, with one glint sliding around the rim. Works at every
    // facing because a ring has no face to lose.
    const hy = headY - hh * 1.55 + Math.sin(f.nowMs * 0.0017) * hh * 0.06;
    ctx.strokeStyle = st.halo.color;
    ctx.lineWidth = Math.max(1.5, s * 0.022);
    ctx.beginPath();
    ctx.ellipse(headX, hy, hw * 0.92, hh * 0.2, 0, 0, Math.PI * 2);
    ctx.stroke();
    const ga = f.nowMs * 0.0011;
    ctx.fillStyle = shade(st.halo.color, 34);
    ctx.beginPath();
    ctx.arc(headX + Math.cos(ga) * hw * 0.92, hy + Math.sin(ga) * hh * 0.2, s * 0.016, 0, Math.PI * 2);
    ctx.fill();
  }

  if (st.aureole && !hurt) {
    // THE AUREOLE: a fan of gilt rays standing behind the crown,
    // breathing on a slow clock — tallest at the peak, shorter down
    // the sides, every ray carrying its lit ridge. Painted before the
    // shell so the dawn stands BEHIND the cloth; centered on the
    // skull axis, so like the halo it never loses a face.
    const ac = st.aureole.color;
    const cyA = headY - hh * 0.55;
    for (let i = 0; i < 7; i++) {
      const ang = -Math.PI * 0.78 + (i / 6) * Math.PI * 0.56;
      const mid = 1 - Math.abs(i - 3) / 3;
      const breathe = 1 + 0.09 * Math.sin(f.nowMs * 0.0014 + i * 0.55);
      const len = hh * (0.62 + 0.55 * mid) * breathe;
      const dx = Math.sin(ang);
      const dy = -Math.cos(ang) * 0.9;
      const bx = headX + dx * hw * 0.55;
      const by = cyA + dy * hh * 0.3;
      const tx = headX + dx * (hw * 0.55 + len * 0.72);
      const ty = cyA + dy * (hh * 0.3 + len);
      const w = hw * (0.1 + 0.05 * mid);
      ctx.fillStyle = shade(ac, -6 + mid * 10);
      ctx.beginPath();
      ctx.moveTo(bx - dy * w, by + dx * w);
      ctx.lineTo(tx - dy * w * 0.24, ty + dx * w * 0.24);
      ctx.quadraticCurveTo(tx + dx * w * 0.7, ty + dy * w * 0.7, tx + dy * w * 0.24, ty - dx * w * 0.24);
      ctx.lineTo(bx + dy * w, by - dx * w);
      ctx.closePath();
      ctx.fill();
      // The lit ridge each ray carries.
      ctx.strokeStyle = shade(ac, 30);
      ctx.lineWidth = Math.max(1, s * 0.011);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }
  }

  // THE GLYPH ORBIT: three angular runes circling the crown on the
  // fake-3D depth law. Split into two passes so the shell occludes
  // honestly: the far half paints before the cloth, the near half
  // rides above it (the hood branch calls the near pass).
  const drawGlyphOrbit = (pass: 'far' | 'near'): void => {
    if (!st.glyphs || hurt) return;
    const gc = st.glyphs.color;
    const cyO = headY - hh * 0.86;
    const rxO = hw * 1.42;
    const ryO = hh * 0.3;
    const spin = f.nowMs * 0.00046;
    for (let k = 0; k < 3; k++) {
      const a = spin + (k * Math.PI * 2) / 3;
      const isNear = Math.sin(a) >= 0;
      if ((pass === 'near') !== isNear) continue;
      const px = headX + Math.cos(a) * rxO;
      const py = cyO + Math.sin(a) * ryO;
      const depth = (Math.sin(a) + 1) / 2;
      const rh = headR * (0.17 + 0.12 * depth);
      ctx.globalAlpha = 0.55 + 0.45 * depth;
      ctx.strokeStyle = shade(gc, depth * 26);
      ctx.lineWidth = Math.max(1, s * (0.01 + 0.004 * depth));
      ctx.beginPath();
      if (k === 0) {
        // The door: a frame with a raised sill.
        ctx.moveTo(px - rh * 0.62, py + rh * 0.55);
        ctx.lineTo(px - rh * 0.62, py - rh * 0.55);
        ctx.lineTo(px + rh * 0.62, py - rh * 0.55);
        ctx.lineTo(px + rh * 0.62, py + rh * 0.55);
        ctx.moveTo(px, py - rh * 0.55);
        ctx.lineTo(px, py + rh * 0.15);
      } else if (k === 1) {
        // The tide: a diamond riding a bar.
        ctx.moveTo(px, py - rh * 0.6);
        ctx.lineTo(px + rh * 0.55, py);
        ctx.lineTo(px, py + rh * 0.6);
        ctx.lineTo(px - rh * 0.55, py);
        ctx.closePath();
        ctx.moveTo(px - rh * 0.55, py + rh * 0.6);
        ctx.lineTo(px + rh * 0.55, py + rh * 0.6);
      } else {
        // The asking: a stave with two leaning arms.
        ctx.moveTo(px, py - rh * 0.6);
        ctx.lineTo(px, py + rh * 0.6);
        ctx.moveTo(px, py - rh * 0.1);
        ctx.lineTo(px + rh * 0.55, py - rh * 0.55);
        ctx.moveTo(px, py + rh * 0.3);
        ctx.lineTo(px - rh * 0.55, py - rh * 0.1);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  drawGlyphOrbit('far');

  // THE TWO CROWN DEVICES, lent to the cowls. Both grew up on the
  // metal kinds and still paint there unchanged (the metal tail calls
  // them with no seat at all); a hood asks for the same device SEATED
  // DIFFERENTLY — a cowl's crown rides higher than a helm's dome and
  // its temples stand wider — so each takes a seat offset in pixels,
  // zero by default.
  const drawSideFins = (lift = 0, out = 0): void => {
    if (!st.fins || hurt) return;
    // Side fins: broad blades swept up off the temples — real mass, a
    // glacier's calving edge; the far fin narrows like the far eye.
    for (const es of [-1, 1]) {
      const far = es !== lead;
      const wK = far ? Math.max(0.25, 1 - profileK * 0.7) : 1;
      const bx = headX + es * (hw * 0.88 + out);
      const by = headY - (hh * 0.4 + lift);
      ctx.fillStyle = st.fins.color;
      ctx.beginPath();
      ctx.moveTo(bx - es * hw * 0.06, by + hh * 0.42 * wK);
      ctx.quadraticCurveTo(bx + es * hw * 0.55 * wK, by + hh * 0.2, bx + es * hw * 1.0 * wK, by - hh * 0.85);
      ctx.quadraticCurveTo(bx + es * hw * 0.5 * wK, by - hh * 0.2, bx + es * hw * 0.16 * wK, by - hh * 0.1);
      ctx.closePath();
      ctx.fill();
      // A darker under-facet keeps the blade from reading flat.
      ctx.fillStyle = shade(st.fins.color, -16);
      ctx.beginPath();
      ctx.moveTo(bx - es * hw * 0.06, by + hh * 0.42 * wK);
      ctx.quadraticCurveTo(bx + es * hw * 0.5 * wK, by + hh * 0.24, bx + es * hw * 0.86 * wK, by - hh * 0.55);
      ctx.lineTo(bx + es * hw * 0.5 * wK, by - hh * 0.02);
      ctx.closePath();
      ctx.fill();
    }
  };

  const drawSpikesCrown = (lift = 0): void => {
    if (!st.spikesCrown || hurt) return;
    // The spiked crown: forged points riding the centerline front-to-
    // back — rising spikes frontal, a full ridge of war at profile.
    // The crest grammar with teeth.
    const arcK = 0.35 + 0.65 * profileK;
    const baseY = headY - (hh * 1.06 + lift);
    ctx.fillStyle = st.spikesCrown.color;
    for (let i = 0; i < 4; i++) {
      const u = (-0.66 + i * 0.44) * arcK;
      const px = headX + lead * u * hw;
      // The crown line bows like the skull: center spikes stand tallest.
      const seat = baseY - hh * 0.22 * (1 - u * u * 1.6);
      const tall = hh * (0.62 + 0.3 * (1 - Math.abs(u / arcK || 0)));
      const half = hw * 0.15 * (0.8 + 0.4 * arcK);
      ctx.beginPath();
      ctx.moveTo(px - half, seat);
      ctx.lineTo(px + lead * half * 0.1, seat - tall);
      ctx.lineTo(px + half, seat);
      ctx.closePath();
      ctx.fill();
    }
    // A seam bar seats the row on the crown.
    ctx.fillStyle = shade(st.spikesCrown.color, -20);
    ctx.fillRect(headX - hw * 0.8 * arcK, baseY - hh * 0.06, hw * 1.6 * arcK, hh * 0.1);
  };

  if (st.shards && !hurt) {
    // The rift's answer to a halo: three slivers of night glass riding
    // above the crown, the tall one centered, each on its own slow
    // bob. Nothing holds them; the gap IS the wonder. Centered on the
    // skull axis, so like the halo they never lose a face.
    const sCol = st.shards.color;
    const glint = shade(sCol, 58);
    const sliver = (u: number, w: number, h: number, ph: number) => {
      const px = headX + u * hw;
      const py =
        headY - hh * 1.5 - h * 0.5 + Math.sin(f.nowMs * 0.0016 + ph) * hh * 0.07;
      ctx.fillStyle = sCol;
      ctx.beginPath();
      ctx.moveTo(px, py - h);
      ctx.lineTo(px + w, py);
      ctx.lineTo(px, py + h);
      ctx.lineTo(px - w * 0.55, py);
      ctx.closePath();
      ctx.fill();
      // The one bright edge — the same law the riftglass blade obeys.
      ctx.strokeStyle = glint;
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.beginPath();
      ctx.moveTo(px, py - h * 0.9);
      ctx.lineTo(px + w * 0.9, py);
      ctx.stroke();
    };
    sliver(0, hw * 0.16, hh * 0.34, 0);
    sliver(-0.62, hw * 0.12, hh * 0.22, 2.2);
    sliver(0.6, hw * 0.11, hh * 0.2, 4.1);
  }

  if (st.streamers && !hurt) {
    // Two banner tails of light streaming off the crown's trailing
    // edge, each flowing back in a lazy S with a swell through the
    // middle — banners, never sticks. Painted before the shell so
    // their roots tuck under the cloth they stream from.
    for (const [i, colr] of st.streamers.colors.entries()) {
      const ph = i * 2.4;
      const dy = i * hh * 0.42;
      const ax = headX - lead * hw * 0.6;
      const ay = headY - hh * (1.0 - i * 0.2);
      const m1x = ax - lead * hw * 0.75 + Math.sin(f.nowMs * 0.0021 + ph) * hw * 0.12;
      const m1y = ay - hh * 0.42 - dy * 0.5;
      const m2x = ax - lead * hw * 1.35 + Math.sin(f.nowMs * 0.0021 + ph + 1.1) * hw * 0.2;
      const m2y = ay - hh * 0.28 - dy;
      const tipX = ax - lead * hw * 2.05 + Math.sin(f.nowMs * 0.0023 + ph + 2.2) * hw * 0.32;
      const tipY = ay - hh * 0.68 - dy + Math.sin(f.nowMs * 0.0019 + ph + 3.1) * hh * 0.16;
      const w0 = hh * 0.13;
      const wm = hh * 0.2;
      const w1 = hh * 0.06;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = colr;
      ctx.beginPath();
      ctx.moveTo(ax, ay - w0);
      ctx.quadraticCurveTo(m1x, m1y - wm, m2x, m2y - wm * 0.8);
      ctx.quadraticCurveTo((m2x + tipX) / 2, (m2y + tipY) / 2 - wm * 0.5, tipX, tipY - w1);
      ctx.lineTo(tipX - lead * hw * 0.06, tipY + w1);
      ctx.quadraticCurveTo((m2x + tipX) / 2, (m2y + tipY) / 2 + wm * 0.4, m2x, m2y + wm * 0.6);
      ctx.quadraticCurveTo(m1x, m1y + wm * 0.7, ax, ay + w0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shade(colr, 32);
      ctx.lineWidth = Math.max(1, s * 0.011);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(m1x, m1y, m2x, m2y);
      ctx.quadraticCurveTo((m2x + tipX) / 2, (m2y + tipY) / 2, tipX, tipY);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  if (st.crestfeathers && !hurt) {
    // The hawk's wake: three broad feathers swept off the crown and
    // trailing back, each fluttering at the tip on its own beat —
    // painted before the shell so the roots tuck under. The middle
    // feather carries the second color; a one-color crest reads as
    // a fin, not a bird.
    const [c0, c1] = st.crestfeathers.colors;
    const u = -(lead || 1);
    for (let i = 0; i < 3; i++) {
      const colr = i === 1 ? c1 : c0;
      const ax = headX + u * hw * (0.08 + i * 0.14);
      const ay = headY - hh * (1.16 - i * 0.14);
      const flut = Math.sin(f.nowMs * 0.0023 + i * 1.9) * hh * 0.09;
      const tipX = ax + u * hw * (1.5 - i * 0.2);
      const tipY = ay - hh * (0.66 - i * 0.26) + flut;
      const mx = ax + u * hw * 0.62;
      const my = ay - hh * (0.78 - i * 0.2);
      const w0 = hh * 0.2;
      ctx.fillStyle = colr;
      ctx.beginPath();
      ctx.moveTo(ax, ay - w0 * 0.5);
      ctx.quadraticCurveTo(mx, my - w0, tipX, tipY);
      ctx.quadraticCurveTo(mx, my + w0 * 0.7, ax, ay + w0 * 0.8);
      ctx.closePath();
      ctx.fill();
      // The spine — one stroke sells the anatomy.
      ctx.strokeStyle = shade(colr, -24);
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(mx, my, tipX, tipY);
      ctx.stroke();
    }
  }

  // THE SOFT CROWNS (foundations F3.2): forty-two cloth kinds live in
  // armorHelmsCloth.ts, keyed by kind. A soft crown is terminal — the
  // forge tail below never runs for it, as the old branch returns held.
  HELM_CTX.ctx = ctx; HELM_CTX.st = st; HELM_CTX.f = f;
  HELM_CTX.s = s; HELM_CTX.headX = headX; HELM_CTX.headY = headY;
  HELM_CTX.hw = hw; HELM_CTX.hh = hh; HELM_CTX.cut = cut;
  HELM_CTX.headR = headR; HELM_CTX.fx = fx; HELM_CTX.profileK = profileK;
  HELM_CTX.backK = backK; HELM_CTX.lead = lead; HELM_CTX.hurt = hurt;
  HELM_CTX.mc = mc;
  HELM_CTX.drawGlyphOrbit = drawGlyphOrbit;
  HELM_CTX.drawSideFins = drawSideFins;
  HELM_CTX.drawSpikesCrown = drawSpikesCrown;
  const clothPainter = CLOTH_HELMS[st.kind];
  if (clothPainter) {
    clothPainter(HELM_CTX);
    return;
  }


  // ---- THE FORGE LAW: every metal helm is FULL-FACE — it owns the
  // crown, the cheeks, the jaw AND the face. The old open caps are
  // gone; a cap reads as a placeholder, a helm reads as a hero. Each
  // kind forges its own shell below, then the shared furniture
  // vocabulary (horns, fins, wings, crest, spikes, tusks, plume)
  // bolts onto whichever shell it was made for.
  const ld = lead || 1; // icon frames pass lead 0 — forge a facing
  const vx = headX + fx * headR * 0.36; // the pairX law: the face anchor
  const sw = 1 - profileK * 0.45; // face furniture squashes at profile
  const front = backK <= 0.55;
  // The DEPTH-PASS light, clipped to the shell: the same screen-fixed
  // x=0 form split the bare head wears — trailing half in shade, lit
  // crown, jaw in under-shade — so all steel stands under ONE sun.
  const shellLight = (shell: () => void, topY: number, botY: number): void => {
    if (hurt) return;
    ctx.save();
    ctx.beginPath();
    shell();
    ctx.clip();
    ctx.fillStyle = shade(st.color, -10);
    ctx.fillRect(headX, topY - hh, hw * 3, botY - topY + hh * 2.4);
    ctx.fillStyle = shade(st.color, 15);
    ctx.fillRect(headX - hw * 1.4, topY, hw * 2.8, hh * 0.28);
    ctx.fillStyle = shade(st.color, -20);
    ctx.fillRect(headX - hw * 1.4, botY - hh * 0.2, hw * 2.8, hh * 0.6);
    ctx.restore();
  };

  // THE FORGE LAW (foundations F3.2): the seventeen metal helms live in
  // armorHelmsMetal.ts; a hit falls through to the furniture tail below,
  // exactly as the old ladder did.
  HELM_CTX.ld = ld; HELM_CTX.vx = vx; HELM_CTX.sw = sw;
  HELM_CTX.front = front; HELM_CTX.shellLight = shellLight;
  METAL_HELMS[st.kind]?.(HELM_CTX);
  drawSideFins();
  if (st.wings && !hurt) {
    // Feathered wing blades: three ascending points, tallest outermost.
    ctx.fillStyle = st.wings.color;
    for (const es of [-1, 1]) {
      const far = es !== lead;
      const wK = far ? Math.max(0.25, 1 - profileK * 0.7) : 1;
      const bx = headX + es * hw * 0.82;
      const by = headY - hh * 0.55;
      ctx.beginPath();
      ctx.moveTo(bx, by + hh * 0.35 * wK);
      ctx.lineTo(bx + es * hw * 0.3 * wK, by - hh * 0.42);
      ctx.lineTo(bx + es * hw * 0.44 * wK, by - hh * 0.1);
      ctx.lineTo(bx + es * hw * 0.68 * wK, by - hh * 0.72);
      ctx.lineTo(bx + es * hw * 0.8 * wK, by - hh * 0.25);
      ctx.lineTo(bx + es * hw * 1.05 * wK, by - hh * 1.05);
      ctx.lineTo(bx + es * hw * 0.62 * wK, by + hh * 0.38 * wK);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (st.crest && !hurt) {
    // A solid metal ridge riding the crown: narrow blade frontal, full
    // arc at profile — the plume grammar, forged instead of feathered.
    const arcK = 0.35 + 0.65 * profileK;
    ctx.fillStyle = st.crest.color;
    ctx.beginPath();
    ctx.moveTo(headX - lead * hw * 0.88 * arcK, headY - hh * 0.98);
    ctx.quadraticCurveTo(headX, headY - hh * (1.72 + 0.34 * arcK), headX + lead * hw * 0.7 * arcK, headY - hh * 0.98);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shade(st.crest.color, 24);
    ctx.lineWidth = Math.max(1.5, s * 0.02);
    ctx.beginPath();
    ctx.moveTo(headX - lead * hw * 0.74 * arcK, headY - hh * 1.04);
    ctx.quadraticCurveTo(headX, headY - hh * (1.6 + 0.3 * arcK), headX + lead * hw * 0.58 * arcK, headY - hh * 1.04);
    ctx.stroke();
  }
  if (st.horns && !hurt) {
    const hz = st.horns.size;
    if (st.horns.curl) {
      // Ram horns: a thick spiral hugging each temple. Drawn in a
      // per-side MIRRORED local frame (translate + scale) so left and
      // right curl toward the face symmetrically and stay oriented as
      // the head turns — a spiral painted once and flipped can never
      // point the wrong way. The far horn narrows like the far eye.
      ctx.lineCap = 'round';
      for (const es of [-1, 1]) {
        const far = es !== lead;
        const wK = far ? Math.max(0.3, 1 - profileK * 0.65) : 1;
        const rr = hh * 0.52 * hz;
        ctx.save();
        ctx.translate(headX + es * hw * 0.98 * wK, headY - hh * 0.42);
        ctx.scale(es * wK, 1);
        // Root sweep: from the crown, up over the top and down the
        // cheek — the fat outer curl.
        ctx.strokeStyle = st.horns.color;
        ctx.lineWidth = Math.max(2.5, s * 0.052 * hz);
        ctx.beginPath();
        ctx.arc(0, 0, rr, -Math.PI * 0.65, Math.PI * 0.62, false);
        ctx.stroke();
        // The tail: a tighter inner turn finishing forward, toward
        // where the face is — how a real ram's horn resolves.
        ctx.lineWidth = Math.max(2, s * 0.036 * hz);
        ctx.beginPath();
        ctx.arc(hw * 0.08, hh * 0.1, rr * 0.55, Math.PI * 0.6, Math.PI * 1.35, false);
        ctx.stroke();
        // The spiral's heart: filled so the curl reads as horn mass,
        // never an empty hoop earring.
        ctx.fillStyle = shade(st.horns.color, -12);
        ctx.beginPath();
        ctx.arc(hw * 0.06, hh * 0.08, rr * 0.32, 0, Math.PI * 2);
        ctx.fill();
        // Growth ridges: fat ticks across the outer sweep — readable
        // at world zoom, never hairlines.
        ctx.strokeStyle = shade(st.horns.color, -24);
        ctx.lineWidth = Math.max(1.5, s * 0.022);
        ctx.beginPath();
        for (const aa of [-0.35, 0.25]) {
          const tx = Math.cos(aa) * rr;
          const ty = Math.sin(aa) * rr;
          ctx.moveTo(tx - hw * 0.11, ty - hh * 0.06);
          ctx.lineTo(tx + hw * 0.11, ty + hh * 0.06);
        }
        ctx.stroke();
        ctx.restore();
      }
      ctx.lineCap = 'butt';
    } else {
      // Horns sweep up and out — built from a sampled SPINE with real
      // taper: perpendicular offsets fat at the root closing to a
      // point, so the horn can NEVER collapse to a sliver (two
      // hand-laid edge curves twisted into a bowtie once — this is
      // the fix). The far horn narrows like the far eye.
      for (const es of [-1, 1]) {
        const far = es !== lead;
        const wK = far ? Math.max(0.25, 1 - profileK * 0.7) : 1;
        const bx = headX + es * hw * 0.84;
        const by = headY - hh * 0.6;
        const cxp = bx + es * hw * 0.64 * hz * wK;
        const cyp = by - hh * 0.32 * hz;
        const txp = bx + es * hw * 0.7 * hz * wK;
        const typ = by - hh * 0.98 * hz;
        const N = 7;
        const lft: Array<{ x: number; y: number }> = [];
        const rgt: Array<{ x: number; y: number }> = [];
        const px: number[] = [];
        const py: number[] = [];
        for (let i = 0; i <= N; i++) {
          const t = i / N;
          const a0 = (1 - t) * (1 - t);
          const a1 = 2 * (1 - t) * t;
          const a2 = t * t;
          px.push(a0 * bx + a1 * cxp + a2 * txp);
          py.push(a0 * by + a1 * cyp + a2 * typ);
        }
        for (let i = 0; i <= N; i++) {
          const qx = px[Math.min(N, i + 1)]! - px[Math.max(0, i - 1)]!;
          const qy = py[Math.min(N, i + 1)]! - py[Math.max(0, i - 1)]!;
          const dl = Math.hypot(qx, qy) || 1;
          const w = hw * 0.23 * hz * (1 - (i / N) * 0.9) * (far ? 0.55 + wK * 0.45 : 1);
          lft.push({ x: px[i]! - (qy / dl) * w, y: py[i]! + (qx / dl) * w });
          rgt.push({ x: px[i]! + (qy / dl) * w, y: py[i]! - (qx / dl) * w });
        }
        ctx.fillStyle = st.horns.color;
        ctx.beginPath();
        ctx.moveTo(lft[0]!.x, lft[0]!.y);
        for (let i = 1; i <= N; i++) ctx.lineTo(lft[i]!.x, lft[i]!.y);
        for (let i = N; i >= 0; i--) ctx.lineTo(rgt[i]!.x, rgt[i]!.y);
        ctx.closePath();
        ctx.fill();
        // Growth ridges: fat ticks across the sweep — readable at
        // world zoom, never hairlines.
        ctx.strokeStyle = shade(st.horns.color, -22);
        ctx.lineWidth = Math.max(1.5, s * 0.018);
        ctx.beginPath();
        for (const gi of [2, 4]) {
          ctx.moveTo(lft[gi]!.x, lft[gi]!.y);
          ctx.lineTo(rgt[gi]!.x, rgt[gi]!.y);
        }
        ctx.stroke();
        if (st.horns.tine) {
          // The bramble fork: a second, lower point splitting off the
          // main horn — one fork turns a horn into a thorn branch.
          // A fat wedge: curved top edge, straight chord home.
          ctx.fillStyle = shade(st.horns.color, -12);
          ctx.beginPath();
          ctx.moveTo(bx + es * hw * 0.04 * wK, by + hh * 0.1);
          ctx.quadraticCurveTo(
            bx + es * hw * 0.6 * wK,
            by - hh * 0.05 * hz,
            bx + es * hw * 0.98 * hz * wK,
            by - hh * 0.34 * hz,
          );
          ctx.lineTo(bx + es * hw * 0.34 * wK, by + hh * 0.22);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }
  if (st.tusks && !hurt && backK <= 0.55) {
    // Boar tusks: two fat ivory hooks curving up past the jaw line —
    // drawn WIDE at the root and TALL past the cheek; timid tusks
    // read as whiskers and a whiskered knight is no knight.
    for (const es of [-1, 1]) {
      const far = es !== lead;
      const wK = far ? Math.max(0.3, 1 - profileK * 0.65) : 1;
      const bx = headX + es * hw * 0.78 * wK + fx * headR * 0.18;
      const by = headY + hh * 0.68;
      ctx.fillStyle = st.tusks.color;
      ctx.beginPath();
      ctx.moveTo(bx - es * hw * 0.24 * wK, by);
      ctx.quadraticCurveTo(
        bx + es * hw * 0.68 * wK, by - hh * 0.04,
        bx + es * hw * 0.56 * wK, by - hh * 0.98,
      );
      ctx.quadraticCurveTo(bx + es * hw * 0.24 * wK, by - hh * 0.38, bx + es * hw * 0.1 * wK, by);
      ctx.closePath();
      ctx.fill();
      // Root shade seats the tusk in the jaw instead of floating on it.
      ctx.fillStyle = shade(st.tusks.color, -18);
      ctx.beginPath();
      ctx.moveTo(bx - es * hw * 0.2 * wK, by);
      ctx.quadraticCurveTo(bx + es * hw * 0.38 * wK, by - hh * 0.08, bx + es * hw * 0.36 * wK, by - hh * 0.4);
      ctx.lineTo(bx + es * hw * 0.14 * wK, by - hh * 0.12);
      ctx.closePath();
      ctx.fill();
    }
  }
  drawSpikesCrown();
  if (st.boneCrown && !hurt) {
    // THE BONE CROWN: a trophy jaw worn as a comb — four fangs riding
    // the crown centerline, every one HOOKED toward the facing (a
    // spike is a nail; a fang closes), seated on a gilt seam so the
    // bone is mounted, never sprouting. Tallest over the brow, the
    // row descending toward the nape like a jaw is armed.
    const arcK = 0.35 + 0.65 * profileK;
    const bc = st.boneCrown.color;
    const baseY = headY - hh * 1.02;
    // The gilt seam first: the mount the trophy is pinned to.
    ctx.fillStyle = shade(st.boneCrown.seam, -18);
    ctx.fillRect(headX - hw * 0.76 * arcK, baseY - hh * 0.1, hw * 1.52 * arcK, hh * 0.15);
    ctx.fillStyle = st.boneCrown.seam;
    ctx.fillRect(headX - hw * 0.76 * arcK, baseY - hh * 0.1, hw * 1.52 * arcK, hh * 0.08);
    for (let i = 0; i < 4; i++) {
      // Brow-forward: the tall fang leads, the row falls away behind.
      const u = (0.6 - i * 0.42) * arcK;
      const px = headX + ld * u * hw;
      const seatY2 = baseY - hh * 0.16 * (1 - u * u * 1.4);
      const tall = hh * (0.88 - i * 0.14);
      const half = hw * (0.15 - i * 0.014) * (0.8 + 0.4 * arcK);
      // Two facets per fang: lit leading face, shaded trailing.
      ctx.fillStyle = shade(bc, 12);
      ctx.beginPath();
      ctx.moveTo(px + ld * half, seatY2);
      ctx.quadraticCurveTo(px + ld * half * 1.7, seatY2 - tall * 0.62, px + ld * half * 0.5, seatY2 - tall);
      ctx.lineTo(px, seatY2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(bc, -14);
      ctx.beginPath();
      ctx.moveTo(px, seatY2);
      ctx.quadraticCurveTo(px + ld * half * 0.9, seatY2 - tall * 0.6, px + ld * half * 0.5, seatY2 - tall);
      ctx.lineTo(px - ld * half, seatY2);
      ctx.closePath();
      ctx.fill();
      // The root collar: each fang socketed in the seam's gold.
      ctx.fillStyle = shade(st.boneCrown.seam, 16);
      ctx.fillRect(px - half, seatY2 - hh * 0.02, half * 2, hh * 0.055);
    }
  }
  if (st.transverse && !hurt) {
    // THE TRANSVERSE CREST: the legion officer's brush worn ear to
    // ear — full span when the helm faces you (where the fore-aft
    // crest shows only its blade), a narrow banded fin at profile.
    // Striped in the legion's two colors, seated on a bright seam.
    const [ca, cb] = st.transverse.colors;
    const tK = 0.35 + 0.65 * (1 - profileK);
    const span = hw * 1.06 * tK;
    const baseY = headY - hh * 0.96;
    const arch = (u: number) => baseY - hh * (0.24 + 0.52 * (1 - u * u * 0.82));
    // The brush silhouette first, in the field color.
    ctx.fillStyle = ca;
    ctx.beginPath();
    ctx.moveTo(headX - span, baseY + hh * 0.06);
    const N2 = 10;
    for (let i = 0; i <= N2; i++) {
      const u = -1 + (2 * i) / N2;
      // Bristles lean outward from the center part, like a real brush.
      ctx.lineTo(headX + u * span + u * hw * 0.06, arch(u));
    }
    ctx.lineTo(headX + span, baseY + hh * 0.06);
    ctx.closePath();
    ctx.fill();
    // The stripes: alternating bands following the same arch.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(headX - span, baseY + hh * 0.06);
    for (let i = 0; i <= N2; i++) {
      const u = -1 + (2 * i) / N2;
      ctx.lineTo(headX + u * span + u * hw * 0.06, arch(u));
    }
    ctx.lineTo(headX + span, baseY + hh * 0.06);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = cb;
    for (let i = 0; i < 7; i += 2) {
      const u0 = -1 + (2 * i) / 7;
      const u1 = -1 + (2 * (i + 1)) / 7;
      const x0 = headX + u0 * span + u0 * hw * 0.06;
      const x1 = headX + u1 * span + u1 * hw * 0.06;
      ctx.fillRect(Math.min(x0, x1), baseY - hh * 1.0, Math.abs(x1 - x0), hh * 1.2);
    }
    // The sun finds the brush's crown; the underside keeps its shade.
    ctx.fillStyle = 'rgba(255, 246, 230, 0.18)';
    ctx.fillRect(headX - span, baseY - hh * 1.0, span * 2, hh * 0.16);
    ctx.fillStyle = 'rgba(24, 15, 26, 0.22)';
    ctx.fillRect(headX - span, baseY - hh * 0.02, span * 2, hh * 0.1);
    ctx.restore();
    // The seam: a bright holder bar mounting the brush to the crown.
    ctx.fillStyle = shade(st.trim, -12);
    ctx.fillRect(headX - span * 0.86, baseY - hh * 0.02, span * 1.72, hh * 0.12);
    ctx.fillStyle = st.trim;
    ctx.fillRect(headX - span * 0.86, baseY - hh * 0.02, span * 1.72, hh * 0.06);
  }
  if (st.plume && !hurt) {
    // Crest: short center fin frontal, full arc at profile (its hero
    // read), falling tail from behind — the beard's band narrowing.
    ctx.fillStyle = st.plume.color;
    const arcK = 0.35 + 0.65 * profileK;
    const innerY = 1.3 + 0.28 * arcK;
    ctx.beginPath();
    ctx.moveTo(headX - lead * hw * 0.7 * arcK, headY - hh * 1.02);
    ctx.quadraticCurveTo(headX, headY - hh * (1.5 + 0.35 * arcK), headX + lead * hw * 0.72 * arcK, headY - hh * 1.02);
    ctx.lineTo(headX + lead * hw * 0.4 * arcK, headY - hh * 0.98);
    ctx.quadraticCurveTo(headX, headY - hh * innerY, headX - lead * hw * 0.4 * arcK, headY - hh * 0.98);
    ctx.closePath();
    ctx.fill();
    if (backK > 0.55) {
      ctx.fillRect(headX - hw * 0.1, headY - hh * 1.0, hw * 0.2, hh * 1.1);
    }
  }
  if (st.emberEyes && !hurt && front && st.kind !== 'furnace' && st.kind !== 'wyrm') {
    // The heat inside the helm, generalized to every forged shell:
    // two lights burning at the eye line, pulsing on a slow breath —
    // whoever looks out of this helm brought their own weather.
    const gc = st.emberEyes.color;
    const pulse = 0.62 + 0.38 * Math.sin(f.nowMs * 0.0021);
    for (const es of [-1, 1]) {
      const gx = vx + es * headR * 0.21 * sw;
      const gy = headY - hh * 0.02;
      ctx.globalAlpha = 0.32 * pulse;
      ctx.fillStyle = gc;
      ctx.beginPath();
      ctx.arc(gx, gy, headR * 0.15 * sw, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = shade(gc, 26);
      ctx.beginPath();
      ctx.moveTo(gx, gy - headR * 0.085);
      ctx.lineTo(gx + headR * 0.065 * sw, gy);
      ctx.lineTo(gx, gy + headR * 0.085);
      ctx.lineTo(gx - headR * 0.065 * sw, gy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (st.standard && !hurt) {
    // THE STANDARD: the king's colors carried on the helm itself — a
    // slim pole off the crown flying a small square banner that
    // ripples on the march wind's clock. The banner flies trailing,
    // so the champion is always walking INTO their own colors.
    const u = -(lead || 1);
    const poleC = st.standard.pole;
    const bx0 = headX;
    const by0 = headY - hh * 1.0;
    const topY = headY - hh * 2.12 + Math.sin(f.nowMs * 0.0013) * hh * 0.02;
    ctx.strokeStyle = poleC;
    ctx.lineWidth = Math.max(1.5, s * 0.018);
    ctx.beginPath();
    ctx.moveTo(bx0, by0);
    ctx.lineTo(bx0, topY);
    ctx.stroke();
    // The finial: a small forged diamond crowning the pole.
    ctx.fillStyle = shade(poleC, 24);
    ctx.beginPath();
    ctx.moveTo(bx0, topY - hh * 0.16);
    ctx.lineTo(bx0 + hw * 0.09, topY - hh * 0.02);
    ctx.lineTo(bx0, topY + hh * 0.1);
    ctx.lineTo(bx0 - hw * 0.09, topY - hh * 0.02);
    ctx.closePath();
    ctx.fill();
    // The banner: hoist on the pole, fly rippling behind the march.
    const hoistT = topY + hh * 0.22;
    const hoistB = topY + hh * 0.78;
    const flyX = bx0 + u * hw * 1.05;
    const r1 = Math.sin(f.nowMs * 0.0021) * hh * 0.07;
    const r2 = Math.sin(f.nowMs * 0.0021 + 1.9) * hh * 0.09;
    ctx.fillStyle = st.standard.banner;
    ctx.beginPath();
    ctx.moveTo(bx0, hoistT);
    ctx.quadraticCurveTo((bx0 + flyX) / 2, hoistT - hh * 0.06 + r1, flyX, hoistT + r2 * 0.6);
    ctx.lineTo(flyX, hoistB + r2 * 0.6);
    ctx.quadraticCurveTo((bx0 + flyX) / 2, hoistB + hh * 0.06 + r1, bx0, hoistB);
    ctx.closePath();
    ctx.fill();
    // The fly's dip band in the trim, and one fold shadow — cloth.
    const tc = st.standard.trim ?? shade(st.standard.banner, 30);
    ctx.fillStyle = tc;
    ctx.beginPath();
    ctx.moveTo(flyX - u * hw * 0.16, hoistT + r2 * 0.66);
    ctx.lineTo(flyX, hoistT + r2 * 0.6);
    ctx.lineTo(flyX, hoistB + r2 * 0.6);
    ctx.lineTo(flyX - u * hw * 0.16, hoistB + r2 * 0.54);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shade(st.standard.banner, -20);
    ctx.lineWidth = Math.max(1, s * 0.01);
    ctx.beginPath();
    ctx.moveTo(bx0 + u * hw * 0.2, hoistT + hh * 0.12);
    ctx.quadraticCurveTo((bx0 + flyX) / 2, (hoistT + hoistB) / 2 + r1, flyX - u * hw * 0.14, hoistB - hh * 0.1 + r2 * 0.5);
    ctx.stroke();
  }
  if (st.gleam && !hurt) {
    // The crown's glint: one star winking off the helm's high point
    // on its own beat — the body's gleam law worn above the neck.
    const wink = Math.max(0, Math.sin(f.nowMs * 0.0012 + 1.1));
    if (wink >= 0.4) {
      const gx = headX - hw * 0.44;
      const gy = headY - hh * 0.92;
      const gr = hw * 0.3 * (0.5 + 0.5 * wink);
      ctx.globalAlpha = (wink - 0.4) * 1.5;
      ctx.strokeStyle = st.gleam.color;
      ctx.lineWidth = Math.max(1, s * 0.011);
      ctx.beginPath();
      ctx.moveTo(gx - gr, gy);
      ctx.lineTo(gx + gr, gy);
      ctx.moveTo(gx, gy - gr);
      ctx.lineTo(gx, gy + gr);
      ctx.moveTo(gx - gr * 0.45, gy - gr * 0.45);
      ctx.lineTo(gx + gr * 0.45, gy + gr * 0.45);
      ctx.moveTo(gx + gr * 0.45, gy - gr * 0.45);
      ctx.lineTo(gx - gr * 0.45, gy + gr * 0.45);
      ctx.stroke();
      ctx.fillStyle = st.gleam.color;
      ctx.beginPath();
      ctx.arc(gx, gy, gr * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  if (st.arx && !hurt) drawArxBrow(ctx, st.arx, f);
}

/**
 * THE BROW — the head slot's channel in the worn-light grammar. A band
 * of light at the temples with two sigil ticks riding it, and at tier 3
 * a third mark standing proud of the crown.
 *
 * It sits at the BROW rather than over the crown for two reasons: it
 * survives every helmet silhouette in the game (crowns are crowded with
 * plumes, horns, spikes, halos, and crests, and a mark up there would
 * collide with half of them), and a light at eye level reads as
 * something the wearer is looking THROUGH, which is what makes a head
 * working feel like a lamp rather than a hat ornament.
 *
 * The band narrows as the head turns away, so it never floats off the
 * silhouette at the back facing.
 */
function drawArxBrow(ctx: CanvasRenderingContext2D, mark: ArxMark, f: HeadFrame): void {
  const { s, headX, headY, hw, hh, backK, nowMs } = f;
  const alpha = markPulse(mark, nowMs, SLOT_GLINT_PHASE.head ?? 0, 0.9);
  if (alpha <= 0.02) return;
  // Facing away, the brow is on the far side of the skull: the band
  // thins to a rim of spill rather than vanishing outright.
  const face = 1 - backK * 0.72;
  const by = headY - hh * 0.24;
  const bw = hw * 0.82 * face;
  ctx.save();
  ctx.globalAlpha = alpha * 0.9;
  ctx.strokeStyle = mark.mid;
  ctx.lineWidth = Math.max(1.2, s * 0.02);
  ctx.beginPath();
  ctx.moveTo(headX - bw, by);
  ctx.quadraticCurveTo(headX, by - hh * 0.1, headX + bw, by);
  ctx.stroke();
  // Two ticks on the band — the detail that reads it as SIGILWORK and
  // not a glowing headband.
  if (face > 0.45) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = mark.core;
    ctx.lineWidth = Math.max(1, s * 0.013);
    ctx.beginPath();
    for (const side of [-1, 1]) {
      const tx = headX + side * bw * 0.56;
      ctx.moveTo(tx, by - hh * 0.09);
      ctx.lineTo(tx, by + hh * 0.05);
    }
    ctx.stroke();
  }
  // Tier 3 stands a mark clear of the crown: the working is no longer
  // sitting on the helm, it is riding above it.
  if (mark.tier >= 3) {
    const hover = Math.sin(nowMs * 0.0019) * hh * 0.05;
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle = mark.core;
    const ms = s * 0.024;
    ctx.beginPath();
    ctx.moveTo(headX, headY - hh * 1.34 + hover - ms);
    ctx.lineTo(headX + ms * 0.72, headY - hh * 1.34 + hover);
    ctx.lineTo(headX, headY - hh * 1.34 + hover + ms);
    ctx.lineTo(headX - ms * 0.72, headY - hh * 1.34 + hover);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Arm-carried offhand, strapped to the solved off forearm — drawn in
 * the same depth layer as the arm so the strap never breaks.
 */
export function drawOffhandOnArm(
  ctx: CanvasRenderingContext2D,
  st: OffhandStyle,
  arm: { ex: number; ey: number; kx: number; ky: number },
  s: number,
  profileK: number,
  hurt: boolean,
  nowMs = 0,
): void {
  const col = hurt ? '#ffffff' : st.color;
  if (st.kind === 'tome') {
    // A chunky book held flat in the off hand, spine toward the thumb.
    ctx.save();
    ctx.translate(arm.ex, arm.ey);
    ctx.rotate(Math.atan2(arm.ey - arm.ky, arm.ex - arm.kx));
    ctx.fillStyle = col;
    ctx.beginPath();
    chamferRect(ctx, -0.02 * s, -0.085 * s, 0.16 * s, 0.17 * s, 0.02 * s);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = st.trim;
      ctx.fillRect(-0.02 * s, -0.085 * s, 0.035 * s, 0.17 * s);
      ctx.fillStyle = shade(st.color, 22);
      ctx.fillRect(0.03 * s, -0.06 * s, 0.09 * s, 0.026 * s);
      // THE WORN LIGHT on a non-shield offhand: the spine carries the
      // rune face's little cousin — a lit clasp line on the binding,
      // on the offhand's own pulse, with a tier-3 core dot.
      if (st.arx) {
        const a = markPulse(st.arx, nowMs, SLOT_GLINT_PHASE.offhand ?? 0, 0.6);
        if (a > 0.02) {
          ctx.globalAlpha = Math.min(1, a);
          ctx.fillStyle = st.arx.mid;
          ctx.fillRect(-0.012 * s, -0.07 * s, 0.016 * s, 0.14 * s);
          if (st.arx.tier >= 3) {
            ctx.fillStyle = st.arx.core;
            ctx.fillRect(-0.012 * s, -0.012 * s, 0.016 * s, 0.024 * s);
          }
          ctx.globalAlpha = 1;
        }
      }
    }
    ctx.restore();
    return;
  }
  if (st.kind === 'orb') {
    // Floats just off the palm with a slow glint — the focus dialect.
    const ox = arm.ex;
    const oy = arm.ey - 0.05 * s;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(ox, oy, 0.062 * s, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = st.trim;
      ctx.beginPath();
      ctx.arc(ox - 0.018 * s, oy - 0.02 * s, 0.02 * s, 0, Math.PI * 2);
      ctx.fill();
      // THE WORN LIGHT: an enchanted focus wears a thin lit ring just
      // off its surface — the bound working held in orbit, breathing
      // on the offhand's pulse. Tier 3 lights the heart too.
      if (st.arx) {
        const a = markPulse(st.arx, nowMs, SLOT_GLINT_PHASE.offhand ?? 0, 0.6);
        if (a > 0.02) {
          ctx.globalAlpha = Math.min(1, a * 0.9);
          ctx.strokeStyle = st.arx.mid;
          ctx.lineWidth = Math.max(1, s * 0.012);
          ctx.beginPath();
          ctx.arc(ox, oy, 0.078 * s, 0, Math.PI * 2);
          ctx.stroke();
          if (st.arx.tier >= 3) {
            ctx.globalAlpha = Math.min(1, a);
            ctx.fillStyle = st.arx.core;
            ctx.beginPath();
            ctx.arc(ox, oy, 0.018 * s, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      }
    }
    return;
  }
  // Shields ride the forearm midpoint, rotated with the bone; facing
  // squashes the face toward a rim at profile.
  const mx = (arm.kx + arm.ex) / 2;
  const my = (arm.ky + arm.ey) / 2;
  const faceK = 0.3 + 0.7 * (1 - profileK);
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(Math.atan2(arm.ey - arm.ky, arm.ex - arm.kx) + Math.PI / 2);
  if (st.kind === 'tower') {
    // A walking wall: tall slab, riveted border, center boss band. At
    // profile it collapses to a bright structural rim like the others.
    const w = 0.155 * s * faceK;
    const h = 0.34 * s;
    ctx.fillStyle = col;
    ctx.beginPath();
    chamferRect(ctx, -w, -h * 0.5, w * 2, h, 0.035 * s);
    ctx.fill();
    if (!hurt && faceK > 0.55) {
      ctx.strokeStyle = st.trim;
      ctx.lineWidth = Math.max(1, s * 0.018);
      ctx.beginPath();
      chamferRect(ctx, -w * 0.78, -h * 0.42, w * 1.56, h * 0.84, 0.025 * s);
      ctx.stroke();
      ctx.fillStyle = st.boss ?? shade(st.color, 22);
      ctx.fillRect(-w * 0.22, -h * 0.42, w * 0.44, h * 0.84);
      ctx.fillStyle = shade(st.color, -22);
      for (const ry of [-h * 0.36, h * 0.3]) {
        for (const rx of [-w * 0.6, w * 0.6]) {
          ctx.fillRect(rx - 0.011 * s, ry, 0.022 * s, 0.022 * s);
        }
      }
    } else if (!hurt) {
      ctx.fillStyle = shade(st.color, 18);
      ctx.fillRect(-w, -h * 0.5, w * 0.55, h);
    }
    ctx.restore();
    return;
  }
  if (st.kind === 'kite') {
    const w = 0.15 * s * faceK;
    const h = 0.24 * s;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-w, -h * 0.45);
    ctx.lineTo(w, -h * 0.45);
    ctx.lineTo(w * 0.85, h * 0.15);
    ctx.lineTo(0, h * 0.62);
    ctx.lineTo(-w * 0.85, h * 0.15);
    ctx.closePath();
    ctx.fill();
    if (!hurt && faceK > 0.55) {
      ctx.fillStyle = st.trim;
      ctx.beginPath();
      ctx.moveTo(-w * 0.55, -h * 0.2);
      ctx.lineTo(0, h * 0.12);
      ctx.lineTo(w * 0.55, -h * 0.2);
      ctx.lineTo(w * 0.3, -h * 0.28);
      ctx.lineTo(0, -h * 0.08);
      ctx.lineTo(-w * 0.3, -h * 0.28);
      ctx.closePath();
      ctx.fill();
    } else if (!hurt) {
      ctx.fillStyle = shade(st.color, 18);
      ctx.fillRect(-w, -h * 0.45, w * 0.5, h * 1.05);
    }
  } else {
    // Buckler: round face, trim ring, boss — spikes when frontal.
    const r = 0.115 * s;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * faceK, r, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      if (faceK > 0.6) {
        if (st.spikes) {
          ctx.fillStyle = '#dde2ea';
          for (const a of [0.6, 2.2, 3.9, 5.5]) {
            const sx2 = Math.cos(a) * r * 1.28 * faceK;
            const sy2 = Math.sin(a) * r * 1.28;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a + 0.5) * r * 0.8 * faceK, Math.sin(a + 0.5) * r * 0.8);
            ctx.lineTo(sx2, sy2);
            ctx.lineTo(Math.cos(a - 0.5) * r * 0.8 * faceK, Math.sin(a - 0.5) * r * 0.8);
            ctx.closePath();
            ctx.fill();
          }
        }
        ctx.strokeStyle = st.trim;
        ctx.lineWidth = Math.max(1, s * 0.02);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.72 * faceK, r * 0.72, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = st.boss ?? shade(st.color, 26);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.3 * faceK, r * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Rim read at profile: a bright edge line.
        ctx.fillStyle = shade(st.color, 20);
        ctx.fillRect(-r * faceK, -r, r * faceK * 0.9, r * 2);
      }
    }
  }
  ctx.restore();
}

/**
 * Back-mounted quiver (screen space, at the shoulder line). Depth is
 * the caller's: behind the torso when the player faces the camera, in
 * front when they face away — the cape's facing law. When a cape is
 * worn the quiver drops to the off hip so cloth and leather never fight.
 */
export function drawQuiver(
  ctx: CanvasRenderingContext2D,
  st: OffhandStyle,
  x: number,
  y: number,
  s: number,
  lead: number,
  hurt: boolean,
  nowMs = 0,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lead * 0.6);
  ctx.fillStyle = hurt ? '#ffffff' : st.color;
  ctx.beginPath();
  chamferRect(ctx, -0.05 * s, -0.16 * s, 0.1 * s, 0.3 * s, 0.03 * s);
  ctx.fill();
  if (!hurt) {
    ctx.fillStyle = st.trim;
    ctx.fillRect(-0.05 * s, -0.16 * s, 0.1 * s, 0.045 * s);
    // Fletching sprouting from the mouth.
    ctx.fillStyle = '#e6e0d0';
    for (const k of [-0.026, 0.004, 0.03]) {
      ctx.fillRect(k * s - 0.008 * s, -0.225 * s, 0.016 * s, 0.07 * s);
    }
    // THE WORN LIGHT: an enchanted quiver lights its mouth band — the
    // working sits where the arrows leave, on the offhand's own pulse.
    // Tier 3 tips the fletching in the school's core.
    if (st.arx) {
      const a = markPulse(st.arx, nowMs, SLOT_GLINT_PHASE.offhand ?? 0, 0.6);
      if (a > 0.02) {
        ctx.globalAlpha = Math.min(1, a);
        ctx.fillStyle = st.arx.mid;
        ctx.fillRect(-0.05 * s, -0.125 * s, 0.1 * s, 0.014 * s);
        if (st.arx.tier >= 3) {
          ctx.fillStyle = st.arx.core;
          for (const k of [-0.026, 0.004, 0.03]) {
            ctx.fillRect(k * s - 0.008 * s, -0.225 * s, 0.016 * s, 0.014 * s);
          }
        }
        ctx.globalAlpha = 1;
      }
    }
  }
  ctx.restore();
}
