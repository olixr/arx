import { markPulse, SLOT_GLINT_PHASE, type ArxMark } from './wornLight.js';
import { itemDef } from '@arx/content';
import { chamferRect } from './shapes.js';
import { CLOTH_HELMS } from './armorHelmsCloth.js';
import { METAL_HELMS } from './armorHelmsMetal.js';
import type { MetalHelmCtx } from './armorHelmCtx.js';
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
    if (turnK > 0.004) {
      // The trailing third falls deeper — the turned-away plane's core.
      ctx.fillStyle = shade(st.color, -30);
      ctx.globalAlpha = 0.7 * turnK;
      ctx.beginPath();
      ctx.moveTo(-leadSign * tww * 0.45, -th);
      ctx.lineTo(-leadSign * tww, -th);
      ctx.lineTo(-leadSign * ww, 0.02 * s);
      ctx.lineTo(-leadSign * ww * 0.45, 0.02 * s);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      // ONE BRIGHT EDGE on the leading arris: the front plane's lit
      // corner running shoulder to hip — the single strongest cue
      // that the body has rotated, not slid.
      ctx.strokeStyle = shade(st.color, 22);
      ctx.lineWidth = Math.max(1.5, s * 0.022);
      ctx.globalAlpha = 0.9 * turnK;
      ctx.beginPath();
      ctx.moveTo(leadSign * tww * 0.985, -th * 0.97);
      ctx.lineTo(leadSign * (ww + (tww - ww) * 0.06) * 0.985, 0.005 * s);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = shade(st.color, 14);
    ctx.beginPath();
    ctx.moveTo(-tww, -th);
    ctx.lineTo(tww, -th);
    ctx.lineTo(tww * 0.9, -th + 0.07 * s);
    ctx.lineTo(-tww * 0.9, -th + 0.07 * s);
    ctx.closePath();
    ctx.fill();

    // ---- gambeson quilting: diagonal stitch channels crossing into
    // diamonds, one value down — padding you can SEE was sewn, never a
    // texture wash.
    if (st.quilt) {
      ctx.strokeStyle = shade(st.color, -13);
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        const cx = i * tw * 0.52;
        ctx.moveTo(cx - tw * 0.55, -th * 0.94);
        ctx.lineTo(cx + tw * 0.55, -0.1 * s);
        ctx.moveTo(cx + tw * 0.55, -th * 0.94);
        ctx.lineTo(cx - tw * 0.55, -0.1 * s);
      }
      ctx.stroke();
    }

    // ---- gravity folds on the standing torso: creases falling from
    // the chest toward the waist with one catch-light beside the
    // deepest — the difference between a fill and a garment.
    if (st.folds) {
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.strokeStyle = shade(st.color, -22);
      ctx.beginPath();
      ctx.moveTo(-tww * 0.55, -th * 0.62);
      ctx.quadraticCurveTo(-ww * 0.62, -th * 0.28, -ww * 0.5, -0.015 * s);
      ctx.moveTo(tww * 0.4, -th * 0.48);
      ctx.quadraticCurveTo(ww * 0.5, -th * 0.2, ww * 0.42, -0.015 * s);
      ctx.stroke();
      ctx.strokeStyle = shade(st.color, 10);
      ctx.beginPath();
      ctx.moveTo(-tww * 0.55 + 0.016 * s, -th * 0.6);
      ctx.quadraticCurveTo(
        -ww * 0.62 + 0.016 * s, -th * 0.28,
        -ww * 0.5 + 0.016 * s, -0.015 * s,
      );
      ctx.stroke();
    }

    // ---- the shoulder yoke: a contrasting panel across the upper
    // chest, worn front AND back — a yoke is construction, not
    // decoration, and construction wraps the body.
    if (st.yoke) {
      const yCol = st.yoke.color ?? shade(st.color, -14);
      const yh = th * 0.42;
      ctx.fillStyle = yCol;
      ctx.beginPath();
      ctx.moveTo(-tww, -th);
      ctx.lineTo(tww, -th);
      ctx.lineTo(tww * 0.93, -th + yh);
      ctx.lineTo(-tww * 0.93, -th + yh);
      ctx.closePath();
      ctx.fill();
      // Same one-sun form split the base torso wears.
      ctx.fillStyle = shade(yCol, -16);
      ctx.beginPath();
      ctx.moveTo(0, -th);
      ctx.lineTo(tww, -th);
      ctx.lineTo(tww * 0.93, -th + yh);
      ctx.lineTo(0, -th + yh);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(yCol, 12);
      ctx.fillRect(-tww * 0.96, -th, tww * 1.92, 0.045 * s);
      if (st.yoke.stitch) {
        // Saddle stitches straddling the yoke hem — the tailor's tick.
        ctx.strokeStyle = shade(yCol, 24);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const sx = -tww * 0.74 + i * tww * 0.37;
          ctx.moveTo(sx, -th + yh - 0.02 * s);
          ctx.lineTo(sx + 0.018 * s, -th + yh - 0.005 * s);
        }
        ctx.stroke();
      }
    }

    // ---- THE BROIDERY: thistledown's needlework — the starter's
    // craft raised from mending to embroidery (the patches are
    // dead). A running-stitch border rides the yoke hem front AND
    // back — construction wraps the body — and on the front plane a
    // thistle sprig is worked at the sternum: stem, leaf ticks, and
    // one small head of down. Thread, not gold.
    if (st.broidery && !hurt) {
      const bd = st.broidery;
      if (st.yoke) {
        const yh2 = th * 0.42;
        ctx.strokeStyle = bd.thread;
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.setLineDash([s * 0.013, s * 0.012]);
        ctx.beginPath();
        ctx.moveTo(-tww * 0.9, -th + yh2 + 0.012 * s);
        ctx.lineTo(tww * 0.9, -th + yh2 + 0.012 * s);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (!back) {
        frontPlaneOn();
        const spx2 = 0;
        const spy2 = -th * 0.62;
        ctx.strokeStyle = bd.sprig;
        ctx.lineWidth = Math.max(1, s * 0.009);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(spx2 - tw * 0.05, spy2 + th * 0.17);
        ctx.quadraticCurveTo(spx2 + tw * 0.02, spy2 + th * 0.06, spx2 + tw * 0.04, spy2 - th * 0.05);
        ctx.moveTo(spx2 - tw * 0.015, spy2 + th * 0.08);
        ctx.lineTo(spx2 - tw * 0.1, spy2 + th * 0.02);
        ctx.moveTo(spx2 + tw * 0.025, spy2 + th * 0.0);
        ctx.lineTo(spx2 + tw * 0.1, spy2 - th * 0.03);
        ctx.stroke();
        // The sprig's head: a small stitched burr with a down tuft.
        ctx.fillStyle = bd.sprig;
        ctx.beginPath();
        ctx.ellipse(spx2 + tw * 0.045, spy2 - th * 0.075, tw * 0.032, th * 0.028, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = bd.thread;
        ctx.lineWidth = Math.max(1, s * 0.007);
        ctx.beginPath();
        for (const da of [-0.5, -0.15, 0.2, 0.55] as const) {
          ctx.moveTo(spx2 + tw * 0.045, spy2 - th * 0.09);
          ctx.lineTo(spx2 + tw * 0.045 + Math.sin(da) * tw * 0.05, spy2 - th * 0.09 - Math.cos(da) * th * 0.055);
        }
        ctx.stroke();
        frontPlaneOff();
      }
    }

    // ---- front lacing: the cord that closes a jerkin, crossing an
    // open placket in fat X rungs — front only; the back is seam
    // country. Rides ON a yoke when one is worn (a laced yoke).
    if (st.lace && !back) {
      frontPlaneOn();
      const lCol = st.lace === true ? shade(st.trim, -10) : st.lace;
      const lw = tw * 0.17;
      const y0l = -th * 0.94;
      const y1l = -th * 0.58;
      // The placket shadow: the jerkin opens a hair at the throat.
      ctx.fillStyle = shade(st.yoke ? (st.yoke.color ?? shade(st.color, -14)) : st.color, -14);
      ctx.beginPath();
      ctx.moveTo(-lw * 0.55, y0l);
      ctx.lineTo(lw * 0.55, y0l);
      ctx.lineTo(lw * 0.3, y1l);
      ctx.lineTo(-lw * 0.3, y1l);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = lCol;
      ctx.lineWidth = Math.max(1.5, s * 0.02);
      ctx.beginPath();
      for (let i = 0; i < 2; i++) {
        const yy = y0l + ((y1l - y0l) / 2) * i;
        const w2 = lw * (0.6 - 0.18 * i);
        const dy = ((y1l - y0l) / 2) * 0.92;
        ctx.moveTo(-w2, yy);
        ctx.lineTo(w2 * 0.82, yy + dy);
        ctx.moveTo(w2, yy);
        ctx.lineTo(-w2 * 0.82, yy + dy);
      }
      ctx.stroke();
      frontPlaneOff();
    }

    // ---- the tabard: the knight's cloth panel over the steel, painted
    // BEFORE the waist so the fauld cinches it — a surcoat is worn
    // belted, and the chest emblem rides it afterward. The back wears
    // a shorter plain panel.
    if (st.tabard) {
      frontPlaneOn();
      const tCol = st.tabard.color;
      const half = tww * 0.56;
      const hemYt = back ? 0.09 * s : 0.155 * s;
      ctx.fillStyle = tCol;
      ctx.beginPath();
      ctx.moveTo(-half, -th * 0.94);
      ctx.lineTo(half, -th * 0.94);
      ctx.lineTo(half * 0.9, hemYt);
      ctx.lineTo(0, hemYt + 0.05 * s);
      ctx.lineTo(-half * 0.9, hemYt);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(tCol, -16);
      ctx.beginPath();
      ctx.moveTo(0, -th * 0.94);
      ctx.lineTo(half, -th * 0.94);
      ctx.lineTo(half * 0.9, hemYt);
      ctx.lineTo(0, hemYt + 0.05 * s);
      ctx.closePath();
      ctx.fill();
      if (st.tabard.trim && !back) {
        ctx.strokeStyle = st.tabard.trim;
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(-half * 0.9, hemYt - 0.008 * s);
        ctx.lineTo(0, hemYt + 0.042 * s);
        ctx.lineTo(half * 0.9, hemYt - 0.008 * s);
        ctx.stroke();
      }
      frontPlaneOff();
    }

    // ---- waist: cloth belt, or the cuirass' ARTICULATED fauld — two
    // overlapping plates stepping down, a real joint instead of a band.
    if (st.silhouette === 'cuirass') {
      ctx.fillStyle = shade(st.color, -24);
      ctx.beginPath();
      chamferRect(ctx, -ww - 0.02 * s, -0.115 * s, ww * 2 + 0.04 * s, 0.075 * s, 0.016 * s);
      ctx.fill();
      ctx.fillStyle = metal;
      ctx.fillRect(-ww - 0.02 * s, -0.115 * s, ww * 2 + 0.04 * s, 0.018 * s);
      ctx.fillStyle = shade(st.color, -34);
      ctx.beginPath();
      chamferRect(ctx, -ww * 0.92 - 0.01 * s, -0.052 * s, ww * 1.84 + 0.02 * s, 0.062 * s, 0.014 * s);
      ctx.fill();
      // Gold edging on the champion fauld.
      if (st.trim !== metal) {
        ctx.fillStyle = st.trim;
        ctx.fillRect(-ww * 0.92, -0.052 * s, ww * 1.84, 0.012 * s);
      }
    } else if (st.belt && !st.sash) {
      // A real belt where the anonymous band was: two-tone strap,
      // buckle plate with a tongue, and a strap end swinging past it.
      const b = st.belt === true ? {} : st.belt;
      const bCol = b.color ?? shade(st.trim, -8);
      const buck = b.buckle ?? metal;
      ctx.fillStyle = bCol;
      ctx.fillRect(-ww - 0.01 * s, -0.082 * s, ww * 2 + 0.02 * s, 0.062 * s);
      ctx.fillStyle = shade(bCol, -18);
      ctx.fillRect(0, -0.082 * s, ww + 0.01 * s, 0.062 * s);
      ctx.fillStyle = shade(bCol, 14);
      ctx.fillRect(-ww - 0.01 * s, -0.082 * s, ww * 2 + 0.02 * s, 0.012 * s);
      if (!back) {
        const sway = f.strideSw * 0.014 * s;
        ctx.fillStyle = shade(bCol, -10);
        ctx.beginPath();
        ctx.moveTo(0.014 * s, -0.032 * s);
        ctx.lineTo(0.046 * s, -0.032 * s);
        ctx.lineTo(0.042 * s + sway, 0.082 * s);
        ctx.lineTo(0.008 * s + sway, 0.076 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = buck;
        ctx.beginPath();
        chamferRect(ctx, -0.036 * s, -0.094 * s, 0.072 * s, 0.078 * s, 0.014 * s);
        ctx.fill();
        ctx.fillStyle = shade(buck, -26);
        ctx.fillRect(-0.008 * s, -0.086 * s, 0.016 * s, 0.06 * s);
      }
    } else {
      ctx.fillStyle = shade(st.color, -38);
      ctx.fillRect(-ww - 0.008 * s, -0.075 * s, ww * 2 + 0.016 * s, 0.075 * s);
    }

    // ---- the sash: a wide waist band with a hip knot and two tails
    // that swing on the stride — how cloth says "belt" with feeling.
    if (st.sash) {
      const sCol = st.sash;
      ctx.fillStyle = sCol;
      ctx.fillRect(-ww - 0.01 * s, -0.092 * s, ww * 2 + 0.02 * s, 0.056 * s);
      ctx.fillStyle = shade(sCol, -16);
      ctx.fillRect(0, -0.092 * s, ww + 0.01 * s, 0.056 * s);
      const kx = f.lead * ww * 0.6;
      ctx.fillStyle = shade(sCol, 14);
      ctx.beginPath();
      chamferRect(ctx, kx - 0.032 * s, -0.104 * s, 0.064 * s, 0.062 * s, 0.016 * s);
      ctx.fill();
      const sway = f.strideSw * 0.02 * s;
      ctx.fillStyle = shade(sCol, -8);
      for (const [dx, len] of [[-0.02, 0.15], [0.024, 0.115]] as const) {
        ctx.beginPath();
        ctx.moveTo(kx + dx * s - 0.017 * s, -0.05 * s);
        ctx.lineTo(kx + dx * s + 0.017 * s, -0.05 * s);
        ctx.lineTo(kx + dx * s + 0.011 * s + sway, len * s - 0.045 * s);
        ctx.lineTo(kx + dx * s - 0.024 * s + sway, len * s - 0.05 * s);
        ctx.closePath();
        ctx.fill();
      }
    }

    // ---- THE CORDED SASH: thistledown's waist reborn — the rope
    // belt is dead. A woven two-strand cord crosses the waist, its
    // twist drawn as a braid of alternating lit blocks; a flat knot
    // sits at the leading hip, and two tassel cords hang from it,
    // each ending in a seed-fluff tuft that stirs when the breeze
    // passes. Craft with a mage's patience.
    if (st.sashcord && !hurt) {
      const sc = st.sashcord;
      const bz2 = breezeK(nowMs, 0);
      const ry = -0.086 * s;
      const rh = 0.036 * s;
      // The braid: two strands reading as opposed diagonal steps.
      const n = 10;
      for (let i = 0; i < n; i++) {
        const x0 = -ww - 0.01 * s + (i / n) * (ww * 2 + 0.02 * s);
        const w = (ww * 2 + 0.02 * s) / n;
        ctx.fillStyle = i % 2 === 0 ? shade(sc.color, 10) : shade(sc.color, -14);
        ctx.beginPath();
        ctx.moveTo(x0, ry + rh);
        ctx.quadraticCurveTo(x0 + w * 0.5, ry + (i % 2 === 0 ? -rh * 0.2 : rh * 1.2), x0 + w, ry + rh);
        ctx.lineTo(x0 + w, ry);
        ctx.quadraticCurveTo(x0 + w * 0.5, ry + (i % 2 === 0 ? rh * 1.2 : -rh * 0.2), x0, ry);
        ctx.closePath();
        ctx.fill();
      }
      // The braid's edge stitch — one thread line under the cord.
      ctx.strokeStyle = shade(sc.color, -24);
      ctx.lineWidth = Math.max(1, s * 0.006);
      ctx.beginPath();
      ctx.moveTo(-ww, ry + rh + 0.004 * s);
      ctx.lineTo(ww, ry + rh + 0.004 * s);
      ctx.stroke();
      // The flat knot at the leading hip: two lapped loops.
      const kx = f.lead * ww * 0.56;
      ctx.fillStyle = shade(sc.color, 14);
      ctx.beginPath();
      ctx.ellipse(kx - 0.012 * s, ry + rh * 0.5, 0.026 * s, 0.022 * s, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(sc.color, -4);
      ctx.beginPath();
      ctx.ellipse(kx + 0.014 * s, ry + rh * 0.5, 0.024 * s, 0.02 * s, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(sc.color, -26);
      ctx.beginPath();
      ctx.arc(kx, ry + rh * 0.5, 0.009 * s, 0, Math.PI * 2);
      ctx.fill();
      // Two tassel cords, seed-fluff tufts at their ends — the
      // breeze stirs them; the stride swings them.
      const sway3 = f.strideSw * 0.014 * s + Math.sin(nowMs * 0.0017) * 0.006 * s * (0.3 + 0.7 * bz2);
      for (const [dx, len] of [[-0.012, 0.11], [0.02, 0.08]] as const) {
        const ex = kx + dx * s;
        const ey = ry + rh;
        const tipY2 = ey + len * s;
        ctx.strokeStyle = shade(sc.color, -8);
        ctx.lineWidth = Math.max(1, s * 0.011);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.quadraticCurveTo(ex + sway3 * 0.4, ey + len * s * 0.6, ex + sway3, tipY2);
        ctx.stroke();
        // The tuft: soft rays of pale down, folded at rest.
        ctx.strokeStyle = sc.tassel;
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.beginPath();
        for (const fda of [-0.55, -0.2, 0.15, 0.5] as const) {
          ctx.moveTo(ex + sway3, tipY2);
          ctx.lineTo(
            ex + sway3 + Math.sin(fda) * 0.02 * s,
            tipY2 + Math.cos(fda) * 0.026 * s,
          );
        }
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }

    // ---- THE HERB GIRDLE: hedgemage's own waist company — two herb
    // bundles and a seed pouch hung on cords off the sash, swinging
    // with the stride: the garden goes where the mage goes.
    if (st.herbgirdle && !hurt && !back) {
      const cord = st.herbgirdle.cord;
      const leaf = st.herbgirdle.leaf;
      const sway3 = f.strideSw * 0.013 * s;
      // Bundle: stems wrapped at the top, leaves splayed below.
      const bundle = (bx0: number, ph: number, scale: number): void => {
        const dx = sway3 + Math.sin(nowMs * 0.0036 + ph) * 0.004 * s;
        const by = -0.02 * s + 0.075 * s * scale;
        ctx.strokeStyle = shade(cord, -14);
        ctx.lineWidth = Math.max(1, s * 0.009);
        ctx.beginPath();
        ctx.moveTo(bx0, -0.038 * s);
        ctx.lineTo(bx0 + dx, by - 0.028 * s * scale);
        ctx.stroke();
        // The wrap: a flat band where the stems gather.
        ctx.fillStyle = cord;
        ctx.fillRect(bx0 + dx - 0.011 * s, by - 0.03 * s * scale, 0.022 * s, 0.014 * s);
        // Three leaves fanning down.
        for (const [da, rot] of [[-0.016, -0.5], [0, 0.05], [0.016, 0.55]] as const) {
          ctx.save();
          ctx.translate(bx0 + dx + da * s, by);
          ctx.rotate(rot);
          ctx.fillStyle = shade(leaf, rot > 0 ? -12 : 4);
          ctx.beginPath();
          ctx.ellipse(0, 0.012 * s * scale, 0.011 * s * scale, 0.026 * s * scale, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      };
      bundle(-ww * 0.55, 0.4, 1);
      bundle(ww * 0.28, 2.2, 0.78);
      // The seed pouch: a plump little bag, cinched, dotted.
      const px2 = f.lead * ww * 0.72;
      const pdx = sway3 * 0.7;
      ctx.strokeStyle = shade(cord, -14);
      ctx.lineWidth = Math.max(1, s * 0.009);
      ctx.beginPath();
      ctx.moveTo(px2, -0.04 * s);
      ctx.lineTo(px2 + pdx, -0.005 * s);
      ctx.stroke();
      ctx.fillStyle = shade(cord, 10);
      ctx.beginPath();
      ctx.moveTo(px2 + pdx - 0.015 * s, -0.005 * s);
      ctx.quadraticCurveTo(px2 + pdx - 0.026 * s, 0.035 * s, px2 + pdx, 0.045 * s);
      ctx.quadraticCurveTo(px2 + pdx + 0.026 * s, 0.035 * s, px2 + pdx + 0.015 * s, -0.005 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(cord, -18);
      ctx.fillRect(px2 + pdx - 0.016 * s, -0.008 * s, 0.032 * s, 0.008 * s);
    }

    // ---- THE REED GIRDLE: fenwalker's waist — a two-strand woven
    // cord crossing at the hip, carrying a bound rush bundle and one
    // carved bog-charm that swings with the stride. Front only; the
    // back keeps its tailoring quiet.
    if (st.reedgirdle && !hurt && !back) {
      const rg = st.reedgirdle;
      ctx.strokeStyle = rg.cord;
      ctx.lineWidth = Math.max(1.5, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(-ww * 0.98, -0.052 * s);
      ctx.quadraticCurveTo(0, -0.02 * s, ww * 0.98, -0.058 * s);
      ctx.moveTo(-ww * 0.98, -0.028 * s);
      ctx.quadraticCurveTo(0, -0.062 * s, ww * 0.98, -0.034 * s);
      ctx.stroke();
      // The crossing knot, and the rush bundle bound under it.
      ctx.fillStyle = shade(rg.cord, -14);
      ctx.beginPath();
      ctx.arc(-ww * 0.18, -0.042 * s, 0.018 * s, 0, Math.PI * 2);
      ctx.fill();
      const gSway = f.strideSw * 0.01 * s + Math.sin(nowMs * 0.0021) * 0.004 * s;
      for (const [bu, blen] of [[-0.35, 0.085], [0, 0.105], [0.35, 0.078]] as const) {
        ctx.strokeStyle = shade(rg.cord, bu === 0 ? 10 : -6);
        ctx.lineWidth = Math.max(1.5, s * 0.013);
        ctx.beginPath();
        ctx.moveTo(-ww * 0.18, -0.036 * s);
        ctx.quadraticCurveTo(
          -ww * 0.18 + bu * 0.02 * s + gSway * 0.5, -0.036 * s + blen * s * 0.55,
          -ww * 0.18 + bu * 0.032 * s + gSway, -0.036 * s + blen * s,
        );
        ctx.stroke();
      }
      ctx.fillStyle = shade(rg.cord, -18);
      ctx.fillRect(-ww * 0.18 - 0.014 * s, -0.026 * s, 0.028 * s, 0.014 * s);
      // The bog-charm on the far hip: a carved drop with one bright
      // shoulder, swinging on its cord.
      const chx = ww * 0.5 + f.strideSw * 0.014 * s;
      const chy = 0.052 * s;
      ctx.strokeStyle = shade(rg.cord, -10);
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(ww * 0.5, -0.045 * s);
      ctx.lineTo(chx, chy - 0.02 * s);
      ctx.stroke();
      ctx.fillStyle = rg.charm;
      ctx.beginPath();
      ctx.moveTo(chx, chy - 0.024 * s);
      ctx.quadraticCurveTo(chx + 0.016 * s, chy - 0.004 * s, chx, chy + 0.016 * s);
      ctx.quadraticCurveTo(chx - 0.016 * s, chy - 0.004 * s, chx, chy - 0.024 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(rg.charm, 24);
      ctx.beginPath();
      ctx.arc(chx - 0.004 * s, chy - 0.008 * s, 0.006 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    // ---- THE SEED HEADS: rustsedge's own — two cattail heads
    // standing stiff off the girdle line, velvet brown tipped in
    // pale fluff, nodding a hair on the walk.
    if (st.seedheads && !hurt && !back) {
      const sh = st.seedheads;
      for (const [u, hgt, ph] of [[-0.6, 0.1, 0], [0.72, 0.082, 1.9]] as const) {
        const bx = u * ww;
        const nod = Math.sin(nowMs * 0.0017 + ph) * 0.006 * s + f.strideSw * 0.006 * s;
        ctx.strokeStyle = shade(sh.head, -20);
        ctx.lineWidth = Math.max(1, s * 0.011);
        ctx.beginPath();
        ctx.moveTo(bx, -0.03 * s);
        ctx.lineTo(bx + nod, -0.03 * s - hgt * s);
        ctx.stroke();
        ctx.fillStyle = sh.head;
        ctx.beginPath();
        ctx.ellipse(bx + nod, -0.03 * s - hgt * s - 0.016 * s, 0.011 * s, 0.024 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = sh.fluff;
        ctx.beginPath();
        ctx.ellipse(bx + nod, -0.03 * s - hgt * s - 0.044 * s, 0.007 * s, 0.011 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ---- THE CHARGE BEADS: stormwoven's girdle — a double cord
    // swagged across the waist carrying three storm-glass beads.
    // They light in sequence as the sky charges — the count made
    // visible — and white out together on the strike.
    if (st.chargebeads && !hurt && !back) {
      const cb = st.chargebeads;
      const ck = stormboltK(nowMs, 0.64);
      const cstrike = ck > 0.92;
      ctx.strokeStyle = cb.cord;
      ctx.lineWidth = Math.max(1.5, s * 0.013);
      ctx.beginPath();
      ctx.moveTo(-ww * 0.98, -0.05 * s);
      ctx.quadraticCurveTo(0, -0.014 * s, ww * 0.98, -0.056 * s);
      ctx.moveTo(-ww * 0.98, -0.032 * s);
      ctx.quadraticCurveTo(0, 0.006 * s, ww * 0.98, -0.038 * s);
      ctx.stroke();
      const gSway = f.strideSw * 0.008 * s;
      for (let i = 0; i < 3; i++) {
        const u = -0.42 + i * 0.42;
        const lit = cstrike || ck > (i + 1) / 3.6;
        const bx = u * ww + gSway * (i - 1) * 0.5;
        const by = 0.02 * s + 0.012 * s * Math.abs(u);
        ctx.strokeStyle = shade(cb.cord, -12);
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.beginPath();
        ctx.moveTo(u * ww, -0.02 * s);
        ctx.lineTo(bx, by - 0.016 * s);
        ctx.stroke();
        if (lit) {
          ctx.globalAlpha = cstrike ? 0.4 : 0.28;
          ctx.fillStyle = cstrike ? '#ffffff' : cb.bead;
          ctx.beginPath();
          ctx.arc(bx, by, cstrike ? 0.032 * s : 0.024 * s, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = cstrike ? '#ffffff' : lit ? cb.bead : shade(cb.cord, -22);
        ctx.beginPath();
        ctx.ellipse(bx, by, 0.013 * s, 0.017 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = cstrike ? '#ffffff' : shade(lit ? cb.bead : cb.cord, 26);
        ctx.beginPath();
        ctx.arc(bx - 0.004 * s, by - 0.005 * s, 0.004 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      if (cstrike) {
        const fr = Math.floor(nowMs / 90);
        // The count completes its circuit: bead to bead.
        for (let i = 0; i < 2; i++) {
          const u0 = -0.42 + i * 0.42;
          const u1 = u0 + 0.42;
          stormArc(ctx, u0 * ww + gSway * (i - 1) * 0.5, 0.02 * s + 0.012 * s * Math.abs(u0), u1 * ww + gSway * i * 0.5, 0.02 * s + 0.012 * s * Math.abs(u1), fr * 25 + i, 0.016 * s, cb.bead, 0.8, Math.max(1, s * 0.006), false);
        }
      }
    }

    // ---- waist charms: small bells hung on cords off the belt line,
    // each swinging on its own beat — jewelry that lives on the
    // garment. Front only; the back keeps its tailoring quiet.
    if (st.charms && !back) {
      const chCol = hurt ? '#ffffff' : st.charms.color;
      const hang = [
        { u: -0.42, len: 0.075, ph: 0.9 },
        { u: 0.12, len: 0.095, ph: 2.1 },
        { u: f.lead * 0.62, len: 0.065, ph: 3.4 },
      ];
      for (const b of hang) {
        const bx0 = b.u * ww;
        const sway =
          f.strideSw * 0.014 * s +
          Math.sin(nowMs * 0.004 + b.ph) * 0.006 * s * (0.4 + 0.6 * runF);
        const by = -0.02 * s + b.len * s;
        // The cord.
        ctx.strokeStyle = shade(chCol, -24);
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        ctx.moveTo(bx0, -0.03 * s);
        ctx.lineTo(bx0 + sway, by);
        ctx.stroke();
        // The bell: a small flared cup with a lit lip and a clapper
        // dot below — drawn fat enough to survive world zoom.
        const bx = bx0 + sway;
        ctx.fillStyle = chCol;
        ctx.beginPath();
        ctx.moveTo(bx - 0.016 * s, by);
        ctx.quadraticCurveTo(bx, by - 0.02 * s, bx + 0.016 * s, by);
        ctx.lineTo(bx + 0.024 * s, by + 0.026 * s);
        ctx.lineTo(bx - 0.024 * s, by + 0.026 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(chCol, -22);
        ctx.fillRect(bx - 0.024 * s, by + 0.02 * s, 0.048 * s, 0.008 * s);
        ctx.fillStyle = shade(chCol, 26);
        ctx.beginPath();
        ctx.arc(bx, by + 0.036 * s, 0.008 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ---- the bead loop: two strands hung off the neckline meeting at
    // a drop medallion over the sternum, swinging a hair with the
    // stride — a keeper counts the hours on these. Front only.
    if (st.beads && !back) {
      frontPlaneOn();
      const bCol = st.beads.color;
      const sway = f.strideSw * 0.01 * s;
      const lowX = sway;
      const lowY = -th * 0.2;
      for (const es of [-1, 1]) {
        const nx = es * tw * 0.4;
        const ny = -th * 0.94;
        const cx2 = es * tw * 0.36 + sway * 0.5;
        const cy2 = -th * 0.44;
        // One-sun law: the screen-right strand counts in shadow.
        ctx.fillStyle = es === 1 ? shade(bCol, -16) : bCol;
        for (let k = 1; k <= 4; k++) {
          const u = k / 4.6;
          const omu = 1 - u;
          const bx = omu * omu * nx + 2 * omu * u * cx2 + u * u * lowX;
          const by = omu * omu * ny + 2 * omu * u * cy2 + u * u * lowY;
          ctx.beginPath();
          ctx.arc(bx, by, 0.0135 * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // The medallion drop, one lit facet.
      ctx.fillStyle = shade(bCol, 10);
      ctx.beginPath();
      ctx.moveTo(lowX, lowY - 0.012 * s);
      ctx.lineTo(lowX + 0.021 * s, lowY + 0.016 * s);
      ctx.lineTo(lowX, lowY + 0.048 * s);
      ctx.lineTo(lowX - 0.021 * s, lowY + 0.016 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(bCol, 38);
      ctx.fillRect(lowX - 0.012 * s, lowY + 0.002 * s, 0.011 * s, 0.011 * s);
      frontPlaneOff();
    }


    // ---- THE JELLY FRINGE: the abyss robe's own — four streamers
    // trailing off the shoulder line like oral arms, each on its own
    // sway, each carrying its drop of the deep's light.
    if (st.jellyfringe && !hurt && !back) {
      const jf = st.jellyfringe;
      const kJ = tideK(nowMs, 0.22);
      frontPlaneOn();
      ctx.lineCap = 'round';
      for (const [fu, fl, ph3] of [
        [-0.62, 0.5, 0], [-0.24, 0.66, 1.9], [0.28, 0.6, 3.7], [0.64, 0.46, 0.9],
      ] as const) {
        const fx2 = fu * tw;
        const wob = Math.sin(nowMs * 0.0013 + ph3) * tw * 0.07;
        const endY = -th * (0.62 - fl * 0.52);
        ctx.strokeStyle = jf.color;
        ctx.lineWidth = Math.max(1, s * 0.0095);
        ctx.beginPath();
        ctx.moveTo(fx2, -th * 0.6);
        ctx.quadraticCurveTo(fx2 + wob, -th * (0.62 - fl * 0.28), fx2 + wob * 1.5, endY);
        ctx.stroke();
        ctx.fillStyle = jf.lume;
        ctx.globalAlpha = 0.45 + 0.45 * kJ;
        ctx.beginPath();
        ctx.arc(fx2 + wob * 1.5, endY + s * 0.005, s * 0.0075, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      frontPlaneOff();
    }

    // ---- THE STREAM WRAP: tidecaller's living water — two drawn
    // currents crossing the torso, foam riding the flow; the rush
    // surges when the wave breaks. Water is DRAWN, never glowed.
    if (st.streamwrap && !hurt && !back) {
      const sw2 = st.streamwrap;
      const brkC = tideBreakK(nowMs, 0.22);
      frontPlaneOn();
      // The chest crossing: leading shoulder to trailing hip.
      tideStream(
        ctx,
        f.lead * tw * 0.78, -th * 0.68,
        -f.lead * tw * 0.85, -th * 0.1,
        nowMs, 0.6, tw * 0.14,
        sw2.color, sw2.foam, 0.9, Math.max(1, s * 0.016),
        1 + brkC,
        sw2.core ?? '#dff4ef',
      );
      // The waist wrap: the current circling the body.
      tideStream(
        ctx,
        -tw * 0.98, -th * 0.03,
        tw * 0.98, -th * 0.05,
        nowMs, 3.4, tw * 0.09,
        sw2.color, sw2.foam, 0.8, Math.max(1, s * 0.014),
        1 + brkC,
        sw2.core ?? '#dff4ef',
      );
      frontPlaneOff();
    }

    // ---- THE STRATA COLLAR: the dark waters' first sheet laps the
    // chest as a deep water yoke — the drowning gradient starts at
    // the shoulders (this robe wears no capelet; the water is the
    // mantle). Wrap-around cloth: it never takes the front-plane
    // transform, and it dresses the back as a clean dark yoke too.
    if (st.depthveils && !hurt) {
      const dvc = st.depthveils.colors[0]!;
      const kC = tideK(nowMs, 0.14);
      const brC = Math.sin(nowMs * 0.0019) * th * 0.02 * (0.4 + 0.6 * kC);
      ctx.fillStyle = dvc;
      ctx.beginPath();
      ctx.moveTo(-tw * 1.02, -th * 0.98);
      ctx.lineTo(tw * 1.02, -th * 0.98);
      ctx.lineTo(tw * 1.05, -th * 0.6 + brC);
      ctx.quadraticCurveTo(tw * 0.52, -th * 0.42 + brC, f.lead * tw * 0.1, -th * 0.54 + brC);
      ctx.quadraticCurveTo(-f.lead * tw * 0.54, -th * 0.68 + brC, -tw * 1.05, -th * 0.5 + brC);
      ctx.closePath();
      ctx.fill();
      // The collar's cold arris, leading side only.
      ctx.strokeStyle = shade(dvc, 26);
      ctx.lineWidth = Math.max(1, s * 0.008);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(f.lead * tw * 0.98, -th * 0.62 + brC);
      ctx.quadraticCurveTo(f.lead * tw * 0.5, -th * (f.lead === 1 ? 0.44 : 0.66) + brC, f.lead * tw * 0.12, -th * 0.55 + brC);
      ctx.stroke();
    }

    // ---- THE TIDE MOON: the caller's warrant, high on the chest —
    // its lit face waxes with the swell and fills as the wave
    // breaks. The moon moves the water; the robe just repeats it.
    if (st.tidemoon && !hurt && !back) {
      frontPlaneOn();
      const mCol = st.tidemoon.color;
      const kM = tideK(nowMs, 0);
      const brkM = tideBreakK(nowMs, 0);
      const mr = tw * 0.21;
      const mx = 0;
      const my = -th * 0.19;
      // The dark disc first — the moon that is always there.
      ctx.fillStyle = shade(st.color, -30);
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();
      // The lit face: full disc, then the shadow slides OFF it with
      // the swell — the classic phase, no path tricks.
      ctx.save();
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = mCol;
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(st.color, -30);
      ctx.beginPath();
      ctx.arc(mx - mr * 2.05 * kM * kM - mr * 0.16 + mr * 0.16 * kM, my, mr * 0.96, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // The nacre rim holds the disc to the cloth; at the break it
      // catches the strand's own light.
      ctx.strokeStyle = brkM > 0.4 ? shade(mCol, 30) : shade(st.color, -34);
      ctx.lineWidth = Math.max(1, s * 0.011);
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.stroke();
      frontPlaneOff();
    }

    // ---- THE PEARL STRAND: tidecaller's own jewelry — a strand off
    // the neckline with no medallion. One glimmer walks the pearls
    // bead to bead — and when the wave breaks, the whole strand
    // catches its light at once.
    if (st.pearlstrand && !hurt && !back) {
      frontPlaneOn();
      const pCol = st.pearlstrand.color;
      const kP = tideK(nowMs, 0.22);
      const brkP = tideBreakK(nowMs, 0.22);
      const sway3 = f.strideSw * 0.008 * s;
      const lowY = -th * 0.34;
      const nBeads = 7;
      const walk = Math.floor(nowMs / 600) % nBeads;
      for (let k = 0; k < nBeads; k++) {
        const u = -1 + (k / (nBeads - 1)) * 2;
        const bx = u * tw * 0.42 + sway3;
        const by = lowY - Math.abs(u) * th * 0.5 + th * 0.06 * (1 - u * u);
        const lit = k === walk || brkP > 0.5;
        ctx.fillStyle = u > 0.3 && !lit ? shade(pCol, -14) : lit ? shade(pCol, Math.round(18 + 16 * Math.max(kP, brkP))) : pCol;
        ctx.beginPath();
        ctx.arc(bx, by, 0.014 * s * (lit ? 1.25 : 1), 0, Math.PI * 2);
        ctx.fill();
        if (lit) {
          ctx.fillStyle = shade(pCol, 55);
          ctx.beginPath();
          ctx.arc(bx - 0.004 * s, by - 0.004 * s, 0.005 * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      frontPlaneOff();
    }

    // ---- tassets: hip plates hanging off the fauld, swinging a hair
    // with the stride — the heavy knight keeps armor below the waist.
    if (st.tassets) {
      const sway = f.strideSw * 0.015 * s;
      for (const es of [-1, 1]) {
        const hx = es * ww * 0.78;
        ctx.fillStyle = es === f.lead ? shade(metal, -4) : shade(metal, -20);
        ctx.beginPath();
        ctx.moveTo(hx - 0.062 * s, 0.0 * s);
        ctx.lineTo(hx + 0.062 * s, 0.0 * s);
        ctx.lineTo(hx + 0.046 * s + es * sway, 0.115 * s);
        ctx.lineTo(hx - 0.046 * s + es * sway, 0.115 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(metal, es === f.lead ? 16 : -8);
        ctx.fillRect(hx - 0.052 * s, 0.008 * s, 0.104 * s, 0.016 * s);
      }
    }

    // ---- the mantle: a layered shoulder cope draping over the chest —
    // the garment-over-garment read that says HIGH wizardry. Its point
    // drapes lower in front; from behind it reads as a clean yoke.
    // ---- THE WIND MANTLE: hareswift's collar — a draped two-tier
    // shoulder cape whose hem breaks into swept points, every point
    // raked the SAME way (the wind lives in the cut; points that
    // disagree read as decoration, points that agree read as
    // weather). Hare-fur lining shows only at the throat: one pale
    // line, not a donut.
    if (st.windmantle && !hurt) {
      const wm = st.windmantle;
      const rake = -(f.lead || 1);
      // Each tier DRAPES off the shoulder line and hangs in a few
      // BOLD points — cloth with weight, not a zigzag trim band.
      // Points lean with the rake; the trailing point hangs longest.
      const tier = (span: number, yTop: number, colr: string, pts: Array<[number, number]>): void => {
        ctx.fillStyle = colr;
        ctx.beginPath();
        ctx.moveTo(-tww * span, yTop + th * 0.06);
        ctx.quadraticCurveTo(0, yTop - th * 0.1, tww * span, yTop + th * 0.06);
        // Walk back across the hem, dropping each hanging point:
        // [anchor u, drop] — right to left, all tips kicked by rake.
        for (const [u, drop] of pts) {
          const px2 = tww * span * u;
          ctx.lineTo(px2 + tww * 0.14, yTop + th * 0.16);
          ctx.lineTo(px2 + rake * tww * 0.12, yTop + drop);
          ctx.lineTo(px2 - tww * 0.15, yTop + th * 0.2);
        }
        ctx.lineTo(-tww * span, yTop + th * 0.06);
        ctx.closePath();
        ctx.fill();
      };
      // Under tier: deep, three long points. Outer tier: lighter,
      // shorter, offset so the under-points show BETWEEN its own.
      tier(1.02, -th * 0.86, wm.under, [[0.6, th * 0.5], [-0.05, th * 0.42], [-0.68, th * 0.56]]);
      tier(0.9, -th * 0.92, wm.color, [[0.82, th * 0.34], [0.28, th * 0.3], [-0.32, th * 0.32], [-0.88, th * 0.4]]);
      // The throat lining: hare fur peeking at the neck seam only —
      // a short pale tuft line, never a collar-wide smile.
      ctx.strokeStyle = wm.lining;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1.5, s * 0.018);
      ctx.beginPath();
      ctx.moveTo(-tww * 0.18, -th * 1.02);
      ctx.quadraticCurveTo(0, -th * 1.08, tww * 0.18, -th * 1.02);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    // ---- THE MOSS MANTLE: stagheart's shoulders — two lapped bark-
    // leather tiers with moss spilling over every hem, the forest
    // floor worn as a cope. Flat value planes, moss as fat bumps.
    if (st.mossmantle && !hurt) {
      const mm = st.mossmantle;
      // Outer tier: shoulder to shoulder, hem dipping mid-chest.
      ctx.fillStyle = mm.bark;
      ctx.beginPath();
      ctx.moveTo(-tww * 1.02, -th * 0.98);
      ctx.quadraticCurveTo(0, -th * 1.16, tww * 1.02, -th * 0.98);
      ctx.quadraticCurveTo(tww * 0.9, -th * 0.66, 0, -th * 0.58);
      ctx.quadraticCurveTo(-tww * 0.9, -th * 0.66, -tww * 1.02, -th * 0.98);
      ctx.closePath();
      ctx.fill();
      // Inner tier: a shorter lap in a lighter cut.
      ctx.fillStyle = shade(mm.bark, 10);
      ctx.beginPath();
      ctx.moveTo(-tww * 0.72, -th * 1.02);
      ctx.quadraticCurveTo(0, -th * 1.14, tww * 0.72, -th * 1.02);
      ctx.quadraticCurveTo(tww * 0.6, -th * 0.82, 0, -th * 0.76);
      ctx.quadraticCurveTo(-tww * 0.6, -th * 0.82, -tww * 0.72, -th * 1.02);
      ctx.closePath();
      ctx.fill();
      // The moss spill: fat rounded bumps walking each hem — growth,
      // not trim. Ellipse-dot rims read as polka dots; these are
      // half-domes seated ON the hem line.
      ctx.fillStyle = mm.moss;
      for (const [tier, yBase, n] of [[0.86, -th * 0.63, 6], [0.56, -th * 0.79, 4]] as const) {
        for (let i = 0; i < n; i++) {
          const u = -1 + (2 * (i + 0.5)) / n;
          const mx = u * tww * tier;
          const my = yBase + Math.abs(u) * th * -0.05 + th * 0.02 * Math.sin(i * 2.7);
          ctx.beginPath();
          ctx.arc(mx, my, tww * (0.07 + 0.02 * Math.sin(i * 1.9)), 0, Math.PI);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    if (st.mantle) {
      const mCol = st.mantle;
      const drop = back ? th * 0.34 : th * 0.48;
      ctx.fillStyle = mCol;
      ctx.beginPath();
      ctx.moveTo(-tww * 1.02, -th);
      ctx.lineTo(tww * 1.02, -th);
      ctx.lineTo(tww * 0.72, -th + drop * 0.72);
      ctx.lineTo(0, -th + drop);
      ctx.lineTo(-tww * 0.72, -th + drop * 0.72);
      ctx.closePath();
      ctx.fill();
      // Trailing-half shade keeps the mantle in the same light.
      ctx.fillStyle = shade(mCol, -16);
      ctx.beginPath();
      ctx.moveTo(0, -th);
      ctx.lineTo(tww * 1.02, -th);
      ctx.lineTo(tww * 0.72, -th + drop * 0.72);
      ctx.lineTo(0, -th + drop);
      ctx.closePath();
      ctx.fill();
      // Trim edge along the drape + a clasp at the throat, front only.
      ctx.strokeStyle = st.trim;
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.moveTo(-tww * 0.72, -th + drop * 0.72);
      ctx.lineTo(0, -th + drop);
      ctx.lineTo(tww * 0.72, -th + drop * 0.72);
      ctx.stroke();
      if (!back) {
        ctx.fillStyle = st.glowTrim ?? st.trim;
        ctx.beginPath();
        ctx.moveTo(0, -th + 0.015 * s);
        ctx.lineTo(0.024 * s, -th + 0.048 * s);
        ctx.lineTo(0, -th + 0.08 * s);
        ctx.lineTo(-0.024 * s, -th + 0.048 * s);
        ctx.closePath();
        ctx.fill();
      }
    }

    // ---- the capelet: a short shoulder cape with a SHAPED hem — the
    // layered garment for stories the wizard cope doesn't tell.
    // scallop = foam and feather covers, point = leaf tips, dag =
    // storm pennons. One path, filled then clipped for the form split.
    if (st.capelet) {
      const cCol = st.capelet.color ?? shade(st.color, -10);
      const cTrim = st.capelet.trim ?? st.trim;
      const drop = th * (back ? 0.32 : 0.4);
      const half = tww * 1.04;
      const hemKind = st.capelet.hem;
      const segs = 4;
      const pts: Array<[number, number]> = [];
      for (let i = segs; i >= 0; i--) {
        const u = i / segs;
        pts.push([-half + u * 2 * half, -th + drop * (0.84 + 0.16 * Math.sin(u * Math.PI))]);
      }
      const traceHem = () => {
        for (let k = 1; k < pts.length; k++) {
          const [px0, py0] = pts[k - 1]!;
          const [px1, py1] = pts[k]!;
          const mx = (px0 + px1) / 2;
          const my = (py0 + py1) / 2 + drop * 0.32;
          if (hemKind === 'scallop') ctx.quadraticCurveTo(mx, my, px1, py1);
          else if (hemKind === 'point') { ctx.lineTo(mx, my); ctx.lineTo(px1, py1); }
          else { ctx.lineTo(mx + (px1 - px0) * 0.16, my); ctx.lineTo(px1, py1); }
        }
      };
      const shape = () => {
        ctx.beginPath();
        ctx.moveTo(-half, -th);
        ctx.lineTo(half, -th);
        ctx.lineTo(pts[0]![0], pts[0]![1]);
        traceHem();
        ctx.closePath();
      };
      shape();
      ctx.fillStyle = cCol;
      ctx.fill();
      ctx.save();
      shape();
      ctx.clip();
      ctx.fillStyle = shade(cCol, -16);
      ctx.fillRect(0, -th, half, drop * 1.8);
      ctx.fillStyle = shade(cCol, 12);
      ctx.fillRect(-half, -th, half * 2, 0.045 * s);
      ctx.restore();
      // Trim traces only the shaped hem, never the shoulder line.
      ctx.strokeStyle = cTrim;
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(pts[0]![0], pts[0]![1]);
      traceHem();
      ctx.stroke();
      // ---- icicles off the eave: the fringe hangs from the hem dips,
      // each a two-facet spear — lit windward, dark lee. The capelet
      // is the roof the cold drips from; without one there is no eave.
      if (st.icefringe) {
        const ice = st.icefringe.color;
        for (let i = 0; i < 4; i++) {
          const u = 0.125 + i * 0.25;
          const ix = -half + u * 2 * half;
          const iy = -th + drop * (0.84 + 0.16 * Math.sin(u * Math.PI)) + drop * 0.28;
          const len = (0.055 + 0.03 * Math.sin(i * 2.6 + 0.7)) * s;
          const w = 0.016 * s;
          ctx.fillStyle = ice;
          ctx.beginPath();
          ctx.moveTo(ix - w, iy - 0.02 * s);
          ctx.lineTo(ix + w, iy - 0.02 * s);
          ctx.lineTo(ix + 0.004 * s, iy + len);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = shade(ice, -24);
          ctx.beginPath();
          ctx.moveTo(ix + 0.001 * s, iy - 0.02 * s);
          ctx.lineTo(ix + w, iy - 0.02 * s);
          ctx.lineTo(ix + 0.004 * s, iy + len);
          ctx.closePath();
          ctx.fill();
        }
      }
      // ---- GEMWAKE: gem clusters riding the capelet hem — bezel-set
      // stones hung from the hem dips like the icefringe law cut in
      // oxblood, and the hearts keep a rotation: one wakes at a time,
      // flares, and hands the watch along. The cape does the wearing;
      // the gems do the watching.
      if (st.gemwake && !hurt) {
        const gwc = st.gemwake.color;
        const gwm = st.gemwake.metal;
        const turnG = Math.floor(nowMs / 1500) % 4;
        const ftG = (nowMs % 1500) / 1500;
        for (let i = 0; i < 4; i++) {
          const u = 0.125 + i * 0.25;
          const gx = -half + u * 2 * half;
          const gy = -th + drop * (0.84 + 0.16 * Math.sin(u * Math.PI)) + drop * 0.22;
          const R = 0.026 * s;
          // The bezel seats the stone on the hem — jewelry, not paint.
          ctx.fillStyle = shade(gwm, -12);
          ctx.beginPath();
          ctx.arc(gx, gy, R * 1.05, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = shade(gwm, 18);
          ctx.lineWidth = Math.max(1, s * 0.009);
          ctx.beginPath();
          ctx.arc(gx, gy, R * 1.05, Math.PI * 1.1, Math.PI * 1.9);
          ctx.stroke();
          // The stone: a cut diamond with its table facet.
          const lit = i === turnG ? Math.sin(ftG * Math.PI) : 0;
          ctx.fillStyle = shade(gwc, -8 + lit * 34);
          ctx.beginPath();
          ctx.moveTo(gx, gy - R * 0.78);
          ctx.lineTo(gx + R * 0.62, gy);
          ctx.lineTo(gx, gy + R * 0.78);
          ctx.lineTo(gx - R * 0.62, gy);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = shade(gwc, 26 + lit * 24);
          ctx.fillRect(gx - R * 0.18, gy - R * 0.24, R * 0.36, R * 0.3);
          if (lit > 0.25) {
            // The waking flare — this stone holds the watch.
            ctx.globalAlpha = (lit - 0.25) * 0.55;
            ctx.fillStyle = gwc;
            ctx.beginPath();
            ctx.arc(gx, gy, R * 1.9, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
      }
    }

    // ---- THE WING CLOAK: mothwing's own garment — the moth worn
    // WHOLE. Two layered folded wings drape shoulder to hip: the
    // hindwing beneath (longer, darker), the forewing lapped over it
    // (broader, carrying the great eye-spot), both scalloped and
    // veined, tips flaring past the torso silhouette. THE SHIVER is
    // the living word: on a slow clock the folded wings tremble the
    // way a resting moth does, and shed a breath of luminous dust.
    // Species run in the lots: luna grows hindwing streamers, dusk's
    // spots wake as crescents, ember's scallops keep the fire.
    if (st.wingdrape && !hurt) {
      const wCol = st.wingdrape.color;
      const spot = st.wingdrape.spot;
      // The shiver clock: a 4.6s cycle, alive for its first 550ms.
      const cyc = nowMs % 4600;
      const shiverK = cyc < 550 ? Math.sin((cyc / 550) * Math.PI) : 0;
      const tremble = shiverK * Math.sin(nowMs * 0.055) * 0.03;
      for (const es of [-1, 1]) {
        const rootX = es * tw * 0.18;
        const rootY = -th * 1.02;
        ctx.save();
        ctx.translate(rootX, rootY);
        ctx.rotate(es * tremble);
        ctx.translate(-rootX, -rootY);
        // THE HINDWING: beneath, longer, darker — it falls past the
        // waist and tapers toward the hip, its hem cut in deep
        // scallops. Painted first so the forewing laps it.
        const hCol = shade(wCol, es === 1 ? -24 : -14);
        ctx.beginPath();
        ctx.moveTo(rootX, rootY);
        ctx.quadraticCurveTo(es * tw * 1.05, -th * 1.02, es * tw * 1.3, -th * 0.6);
        ctx.quadraticCurveTo(es * tw * 1.24, -th * 0.2, es * tw * 0.98, 0.045 * s);
        // Scallops climbing back to the body.
        ctx.quadraticCurveTo(es * tw * 0.86, 0.075 * s, es * tw * 0.72, 0.052 * s);
        ctx.quadraticCurveTo(es * tw * 0.58, 0.08 * s, es * tw * 0.44, 0.056 * s);
        ctx.quadraticCurveTo(es * tw * 0.3, 0.075 * s, es * tw * 0.2, 0.045 * s);
        ctx.lineTo(es * tw * 0.12, -th * 0.5);
        ctx.closePath();
        ctx.fillStyle = hCol;
        ctx.fill();
        // Hindwing under-spots: a small twin pair low on the wing,
        // in the band the forewing leaves uncovered.
        ctx.fillStyle = shade(spot, -6);
        ctx.beginPath();
        ctx.arc(es * tw * 0.62, 0.018 * s, tw * 0.055, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(es * tw * 0.86, -th * 0.02, tw * 0.048, 0, Math.PI * 2);
        ctx.fill();
        // LUNA'S TAILS: two long hindwing streamers curling down off
        // the inner hem, swaying on the cloth's own slow clock.
        if (st.wingdrape.tails) {
          const tCol = st.wingdrape.tails;
          const tSway = Math.sin(nowMs * 0.0016 + es * 1.2) * tw * 0.08;
          for (const [ti, u0, len] of [[0, 0.62, 0.32], [1, 0.38, 0.23]] as const) {
            const bx = es * tw * u0;
            const by = 0.055 * s;
            const tipX2 = bx + es * tw * 0.18 + tSway * (1 - ti * 0.4);
            const tipY2 = by + len * s;
            ctx.fillStyle = ti === 0 ? tCol : shade(tCol, -10);
            ctx.beginPath();
            ctx.moveTo(bx - es * tw * 0.1, by - 0.01 * s);
            ctx.quadraticCurveTo(bx - es * tw * 0.03, by + len * s * 0.55, tipX2, tipY2);
            // The swallowtail curl: the tip flares back outward.
            ctx.quadraticCurveTo(tipX2 + es * tw * 0.13, tipY2 + 0.016 * s, tipX2 + es * tw * 0.15, tipY2 - 0.014 * s);
            ctx.quadraticCurveTo(tipX2 + es * tw * 0.1, tipY2 - 0.032 * s, bx + es * tw * 0.075, by - 0.01 * s);
            ctx.closePath();
            ctx.fill();
          }
        }
        // THE FOREWING: lapped over, broader, the eye-spot's home.
        // Its tip flares OUT past the shoulder line — the folded
        // moth's tent silhouette, worn as a cloak.
        const fCol = es === 1 ? shade(wCol, -8) : shade(wCol, 4);
        const fore = () => {
          ctx.beginPath();
          ctx.moveTo(rootX, rootY);
          ctx.quadraticCurveTo(es * tw * 0.95, -th * 1.14, es * tw * 1.42, -th * 0.78);
          ctx.quadraticCurveTo(es * tw * 1.3, -th * 0.42, es * tw * 1.05, -th * 0.14);
          // The forewing hem scallops.
          ctx.quadraticCurveTo(es * tw * 0.92, -th * 0.04, es * tw * 0.78, -th * 0.12);
          ctx.quadraticCurveTo(es * tw * 0.62, -th * 0.0, es * tw * 0.46, -th * 0.1);
          ctx.quadraticCurveTo(es * tw * 0.3, -th * 0.02, es * tw * 0.16, -th * 0.16);
          ctx.closePath();
        };
        fore();
        ctx.fillStyle = fCol;
        ctx.fill();
        ctx.save();
        fore();
        ctx.clip();
        // Vein wedges fanning from the root — flat darker panels.
        ctx.fillStyle = shade(fCol, es === 1 ? -16 : -10);
        for (const vk of [0.34, 0.6, 0.84] as const) {
          const vx2 = rootX + (es * tw * 1.42 - rootX) * vk;
          const vy2 = rootY + (-th * 0.78 - rootY) * vk + th * 0.3 * vk;
          ctx.beginPath();
          ctx.moveTo(rootX, rootY + th * 0.06);
          ctx.lineTo(vx2, vy2);
          ctx.lineTo(vx2 - es * tw * 0.07, vy2 + th * 0.09);
          ctx.closePath();
          ctx.fill();
        }
        // THE EYE-SPOT: the moth's oldest trick, worn BIG — dark
        // heart in a pale ring in a darker halo, all flat fills. At
        // dusk the heart wakes as a crescent moon.
        const sx2 = es * tw * 0.7;
        const sy2 = -th * 0.54;
        ctx.fillStyle = shade(spot, 26);
        ctx.beginPath();
        ctx.arc(sx2, sy2, tw * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(wCol, -34);
        ctx.beginPath();
        ctx.arc(sx2, sy2, tw * 0.215, 0, Math.PI * 2);
        ctx.fill();
        if (st.wingdrape.crescent) {
          ctx.fillStyle = st.wingdrape.crescent;
          ctx.beginPath();
          ctx.arc(sx2, sy2, tw * 0.135, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = shade(wCol, -34);
          ctx.beginPath();
          ctx.arc(sx2 + es * tw * 0.065, sy2 - tw * 0.035, tw * 0.115, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = spot;
          ctx.beginPath();
          ctx.arc(sx2 - tw * 0.05, sy2 - tw * 0.05, tw * 0.088, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        // EMBER'S EDGE: the scallops keep the fire — a glow riding
        // both hems, breathing on the banked clock.
        if (st.wingdrape.emberEdge) {
          const ec = st.wingdrape.emberEdge;
          ctx.globalAlpha = 0.55 + 0.35 * Math.sin(nowMs * 0.0021 + es);
          ctx.strokeStyle = ec;
          ctx.lineWidth = Math.max(2, s * 0.018);
          ctx.beginPath();
          ctx.moveTo(es * tw * 1.05, -th * 0.14);
          ctx.quadraticCurveTo(es * tw * 0.92, -th * 0.04, es * tw * 0.78, -th * 0.12);
          ctx.quadraticCurveTo(es * tw * 0.62, -th * 0.0, es * tw * 0.46, -th * 0.1);
          ctx.quadraticCurveTo(es * tw * 0.3, -th * 0.02, es * tw * 0.16, -th * 0.16);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(es * tw * 0.98, 0.045 * s);
          ctx.quadraticCurveTo(es * tw * 0.86, 0.075 * s, es * tw * 0.72, 0.052 * s);
          ctx.quadraticCurveTo(es * tw * 0.58, 0.08 * s, es * tw * 0.44, 0.056 * s);
          ctx.quadraticCurveTo(es * tw * 0.3, 0.075 * s, es * tw * 0.2, 0.045 * s);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      }
      // THE ABDOMEN: between the folded wings, the moth's own body —
      // four lapped fur segments stepping down the center, each a
      // flat band with a lit crest, tapering toward the hem. The
      // costume commits: this is a moth's front, not a robe with
      // wings pinned on.
      if (!back) {
        frontPlaneOn();
        for (let seg = 0; seg < 4; seg++) {
          const segY = -th * 0.34 + seg * th * 0.21;
          const w = tw * (0.24 - seg * 0.032);
          ctx.fillStyle = shade(wCol, seg % 2 === 0 ? -18 : -26);
          ctx.beginPath();
          ctx.moveTo(-w, segY);
          ctx.quadraticCurveTo(0, segY - th * 0.05, w, segY);
          ctx.lineTo(w * 0.92, segY + th * 0.17);
          ctx.quadraticCurveTo(0, segY + th * 0.23, -w * 0.92, segY + th * 0.17);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = shade(wCol, seg % 2 === 0 ? -4 : -12);
          ctx.beginPath();
          ctx.moveTo(-w * 0.9, segY + th * 0.015);
          ctx.quadraticCurveTo(0, segY - th * 0.035, w * 0.9, segY + th * 0.015);
          ctx.lineTo(w * 0.86, segY + th * 0.055);
          ctx.quadraticCurveTo(0, segY + th * 0.005, -w * 0.86, segY + th * 0.055);
          ctx.closePath();
          ctx.fill();
        }
        frontPlaneOff();
      }
      // THE SHED DUST: while the shiver runs, luminous scales drift
      // off the wing hems and fade — the moth pays for moving.
      if (shiverK > 0.05) {
        const prog = cyc / 550;
        ctx.fillStyle = shade(spot, 20);
        for (const [du, dv, ph] of [
          [-0.9, -0.3, 0], [0.84, -0.5, 1], [-0.5, 0.1, 2],
          [0.6, 0.06, 3], [1.1, -0.7, 4],
        ] as const) {
          const fall = prog * 0.06 * s;
          const drift = Math.sin(nowMs * 0.01 + ph) * 0.008 * s;
          ctx.globalAlpha = shiverK * 0.7 * (0.5 + 0.5 * Math.sin(ph * 2.1));
          ctx.beginPath();
          ctx.arc(tw * du + drift, -th * 0.5 + dv * th * 0.8 + fall, 0.009 * s, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }

    // ---- THE THUNDER BANK: stormwoven's own layer — the front
    // itself banked across the chest on a diagonal: fat cloud rolls
    // with flat lit caps, and the gold charge waking along the
    // underside on THE STORMBOLT clock. At the strike the whole
    // bank rims white for a beat.
    if (st.thunderbank && !hurt && !back) {
      frontPlaneOn();
      const tb = st.thunderbank;
      const bk = stormboltK(nowMs, 0.72);
      const bstrike = bk > 0.92;
      for (const [ri, yy0, dv] of [[0, -0.86, -12], [1, -0.58, -2]] as const) {
        for (let i = 0; i < 3; i++) {
          const u = -0.62 + (i / 2) * 1.24;
          const r = tw * (0.3 + 0.05 * Math.sin(i * 2.3 + ri * 1.7));
          const bx = tw * u + tw * 0.09 * ri;
          const by = th * yy0 + th * 0.05 * Math.sin(i * 1.9 + ri) + tw * 0.07 * u;
          ctx.fillStyle = shade(tb.color, dv);
          ctx.beginPath();
          ctx.arc(bx, by, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = shade(tb.color, dv + 13);
          ctx.beginPath();
          ctx.arc(bx, by, r * 0.8, Math.PI * 1.06, Math.PI * 1.94);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.globalAlpha = 0.25 + 0.75 * bk;
      ctx.strokeStyle = tb.glow;
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.beginPath();
      ctx.moveTo(-tw * 0.88, -th * 0.52);
      ctx.quadraticCurveTo(0, -th * 0.34, tw * 0.9, -th * 0.46);
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (bstrike) {
        const fr = Math.floor(nowMs / 90);
        // Lightning dances the bank's underside.
        stormArc(ctx, -tw * 0.8, -th * 0.5, tw * 0.85, -th * 0.44, fr * 19 + 1, th * 0.08, tb.glow, 0.85, Math.max(1, s * 0.008));
      }
      frontPlaneOff();
    }

    // ---- THE WHISPER RIFT: voidwhisper's chest — ONE grand tear
    // leaning across the torso where the void took a strip of the
    // robe (a diagonal kills the tube; the ink panels are dead). The
    // interior is the garment's darkest value, plasma only on the
    // torn lips (THE VOID IS AN ABSENCE), and a smaller echo opens
    // near the waist. The back wears its own verse — the void does
    // not care which way the wearer faces.
    if (st.voidrift && !hurt) {
      const vrT = st.voidrift;
      const kV = voidK(nowMs, 0);
      const lwT = Math.max(1, s * 0.009);
      if (!back) {
        frontPlaneOn();
        voidRift(
          ctx,
          f.lead * tw * 0.58, -th * 0.9,
          -f.lead * tw * 0.5, -th * 0.32,
          2.9, tw * 0.11,
          vrT.casing, vrT.core, vrT.void,
          nowMs, kV, lwT,
        );
        voidRift(
          ctx,
          -f.lead * tw * 0.12, -th * 0.26,
          -f.lead * tw * 0.58, -th * 0.08,
          8.2, tw * 0.05,
          vrT.casing, vrT.core, vrT.void,
          nowMs, kV, Math.max(1, s * 0.006),
        );
        frontPlaneOff();
      } else {
        voidRift(
          ctx,
          -tw * 0.5, -th * 0.78,
          tw * 0.4, -th * 0.3,
          5.7, tw * 0.08,
          vrT.casing, vrT.core, vrT.void,
          nowMs, kV, Math.max(1, s * 0.007),
        );
      }
    }

    // ---- THE CHAR YOKE: cindersworn's mantle — the first cinder
    // veil laps the chest as a charred yoke, its hem burnt ragged
    // (chartabs is dead; the oath keeps only what it re-forges).
    // Off the collar runs THE OATH SEAM: the robe's one fissure,
    // leaning across the body — a diagonal kills the tube — with
    // the ember crawl walking it on the drawn breath. Wrap-around
    // cloth: no front plane, and the back wears it too.
    if (st.cinderveils && !hurt) {
      const yc = st.cinderveils.colors[0]!;
      const kY = cinderK(nowMs, 0);
      const flY = cinderFlareK(nowMs, 0);
      const br2 = Math.sin(nowMs * 0.0016) * th * 0.015 * (0.3 + 0.7 * kY);
      const hemPts: Array<[number, number]> = [
        [1.04, -0.62], [0.7, -0.5], [0.44, -0.6], [0.14, -0.48],
        [-0.18, -0.58], [-0.5, -0.46], [-0.78, -0.56], [-1.04, -0.5],
      ];
      ctx.fillStyle = yc;
      ctx.beginPath();
      ctx.moveTo(-tw * 1.02, -th * 0.98);
      ctx.lineTo(tw * 1.02, -th * 0.98);
      for (const [hx, hy] of hemPts) ctx.lineTo(tw * hx, th * hy + br2);
      ctx.closePath();
      ctx.fill();
      // The char edging on the burnt hem — the line the fire drew.
      ctx.strokeStyle = '#120a08';
      ctx.lineWidth = Math.max(1, s * 0.011);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(tw * hemPts[0]![0], th * hemPts[0]![1] + br2);
      for (let hi = 1; hi < hemPts.length; hi++) {
        ctx.lineTo(tw * hemPts[hi]![0], th * hemPts[hi]![1] + br2);
      }
      ctx.stroke();
      // The yoke's warm arris, leading side only — an edge the
      // forge-light found, never a drawn rim.
      ctx.strokeStyle = shade(yc, 24);
      ctx.lineWidth = Math.max(1, s * 0.008);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(f.lead * tw * 0.98, -th * 0.66 + br2);
      ctx.quadraticCurveTo(f.lead * tw * 0.5, -th * 0.56 + br2, f.lead * tw * 0.16, -th * 0.6 + br2);
      ctx.stroke();
      if (st.emberveins) {
        // THE OATH SEAM: collar to waist, across the grain.
        const evT = st.emberveins;
        emberCrack(
          ctx,
          f.lead * tw * 0.42, -th * 0.54 + br2,
          -f.lead * tw * 0.14, -th * 0.06,
          2.6, tw * 0.06,
          evT.casing, evT.ember,
          nowMs, Math.max(kY, flY), Math.max(1, s * 0.0085),
        );
      }
    }

    // ---- THE SUN COLLAR: dawnsworn's yoke — gilt ray tabs ringing
    // the shoulder line, front AND back (a collar wraps), longest
    // over the shoulders where the sunrise spreads its arms. Two
    // lapped rows: a deeper under-row, then the bright rays over it.
    if (st.raycollar && !hurt) {
      const rc = st.raycollar.color;
      const collarDay = daybreakK(nowMs, st.dawnbands?.phase);
      for (const [row, dvR, lenM] of [[0, -18, 1.18], [1, 4, 1]] as const) {
        ctx.fillStyle = shade(rc, dvR + (row === 1 ? collarDay * 12 : 0));
        for (const u of [-1, -0.62, -0.24, 0.24, 0.62, 1] as const) {
          const bx = u * tw * 0.76;
          const by = -th + Math.abs(u) * th * 0.05;
          const ang = u * 0.85;
          const len = th * (0.16 + 0.13 * Math.abs(u)) * lenM;
          const dx = Math.sin(ang);
          const dy = -Math.cos(ang);
          const w = tw * 0.085;
          const off = row === 0 ? tw * 0.07 * Math.sign(u || 1) : 0;
          ctx.beginPath();
          ctx.moveTo(bx + off - dy * w, by + dx * w);
          ctx.lineTo(bx + off + dx * len, by + dy * len);
          ctx.lineTo(bx + off + dy * w, by - dx * w);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // ---- THE SUN MEDALS: two small suns on cords off the sash —
    // discs with ray nubs, swinging with the stride, glinting when
    // the daybreak crests. Front only; the back keeps its tailoring.
    if (st.sunmedals && !hurt && !back) {
      const smc = st.sunmedals.color;
      const dayK = daybreakK(nowMs, st.dawnbands?.phase);
      const sway3 = f.strideSw * 0.013 * s;
      for (const [i, u, len] of [[0, -0.48, 0.08], [1, 0.56, 0.06]] as const) {
        const bx0 = u * ww;
        const dx = sway3 + Math.sin(nowMs * 0.0034 + i * 2.4) * 0.004 * s;
        const by = -0.02 * s + len * s;
        ctx.strokeStyle = shade(smc, -30);
        ctx.lineWidth = Math.max(1, s * 0.009);
        ctx.beginPath();
        ctx.moveTo(bx0, -0.036 * s);
        ctx.lineTo(bx0 + dx, by - 0.014 * s);
        ctx.stroke();
        const R = 0.02 * s;
        // Ray nubs first, disc over their roots.
        ctx.fillStyle = shade(smc, -12);
        for (let k = 0; k < 4; k++) {
          const a = -Math.PI / 2 + (k / 4) * Math.PI * 2 + Math.PI / 4;
          ctx.beginPath();
          ctx.moveTo(bx0 + dx + Math.cos(a - 0.5) * R * 0.8, by + Math.sin(a - 0.5) * R * 0.8);
          ctx.lineTo(bx0 + dx + Math.cos(a) * R * 1.55, by + Math.sin(a) * R * 1.55);
          ctx.lineTo(bx0 + dx + Math.cos(a + 0.5) * R * 0.8, by + Math.sin(a + 0.5) * R * 0.8);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = smc;
        ctx.beginPath();
        ctx.arc(bx0 + dx, by, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(smc, 24 + dayK * 22);
        ctx.beginPath();
        ctx.arc(bx0 + dx - R * 0.25, by - R * 0.25, R * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ---- collar: the neck joint that ties helmet to breastplate.
    if (st.collar === 'gorget') {
      ctx.fillStyle = metal;
      ctx.beginPath();
      chamferRect(ctx, -tw * 0.42, -th - 0.028 * s, tw * 0.84, 0.05 * s, 0.014 * s);
      ctx.fill();
      ctx.fillStyle = shade(metal, -22);
      ctx.fillRect(-tw * 0.42, -th + 0.012 * s, tw * 0.84, 0.012 * s);
    } else if (st.collar === 'fur') {
      // A lumpy fur ruff across the shoulder line — the huntsman read.
      ctx.fillStyle = st.collarColor ?? shade(st.trim, 34);
      for (let i = 0; i < 5; i++) {
        const u = -1 + i * 0.5;
        const r = (0.045 + 0.012 * Math.sin(i * 2.7)) * s;
        ctx.beginPath();
        ctx.arc(u * tw * 0.82, -th + 0.012 * s + Math.sin(i * 1.9) * 0.008 * s, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ---- the stole: two ordained bands falling from the shoulders
    // past the belt, tick-marked at their ends; from behind they read
    // as short tabs crossing the shoulders — the vestment wraps.
    if (st.stole) {
      frontPlaneOn();
      const sCol = st.stole.color ?? shade(st.color, -16);
      const sTrim = st.stole.trim ?? st.trim;
      const bw = tw * 0.24;
      const len = back ? th * 0.28 : th + 0.13 * s;
      const sway = f.strideSw * 0.012 * s;
      for (const es of [-1, 1]) {
        const bx = es * tw * 0.5;
        ctx.fillStyle = es === f.lead ? sCol : shade(sCol, -12);
        ctx.beginPath();
        ctx.moveTo(bx - bw / 2, -th);
        ctx.lineTo(bx + bw / 2, -th);
        ctx.lineTo(bx + bw / 2 + es * sway, -th + len);
        ctx.lineTo(bx - bw / 2 + es * sway, -th + len);
        ctx.closePath();
        ctx.fill();
        if (!back) {
          // The embroidered end: a hem bar plus a small upright tick.
          ctx.strokeStyle = sTrim;
          ctx.lineWidth = Math.max(1, s * 0.014);
          ctx.beginPath();
          ctx.moveTo(bx - bw / 2 + es * sway, -th + len - 0.026 * s);
          ctx.lineTo(bx + bw / 2 + es * sway, -th + len - 0.026 * s);
          ctx.moveTo(bx, -th + len * 0.6);
          ctx.lineTo(bx, -th + len * 0.6 - 0.03 * s);
          ctx.stroke();
        }
      }
      frontPlaneOff();
    }

    if (st.silhouette === 'brigandine') {
      ctx.strokeStyle = shade(st.color, -26);
      ctx.lineWidth = Math.max(1, s * 0.016);
      for (const yk of [0.62, 0.4]) {
        ctx.beginPath();
        ctx.moveTo(-tw * 0.92, -th * yk);
        ctx.lineTo(tw * 0.92, -th * yk);
        ctx.stroke();
      }
      ctx.fillStyle = metal;
      for (const yk of [0.62, 0.4]) {
        for (const xk of [-0.6, 0, 0.6]) {
          ctx.fillRect(tw * xk - 0.008 * s, -th * yk - 0.008 * s, 0.016 * s, 0.016 * s);
        }
      }
    }

    // ---- scale coat: overlapping scallop rows wrapping the whole
    // torso — a scale coat has no front or back, only more scales.
    // Each row overlaps the one below; the lit crescent on every
    // scallop is what makes it read as metal-on-leather, not polka dots.
    if (st.chest === 'scales') {
      // Scales are BODY-toned rows with metal only as thin lit
      // crescents — the leather stays the identity color; gold-filled
      // scallops turned the whole torso into stripes (v1 verdict).
      const rows = 4;
      const perRow = 4;
      const y0s = -th * 0.88;
      const y1s = -0.14 * s;
      const rowH = (y1s - y0s) / (rows - 1);
      const sr = tw * 0.22;
      const span = tw * 0.78;
      for (let r = 0; r < rows; r++) {
        const yy = y0s + r * rowH;
        const off = (r % 2) * sr;
        ctx.fillStyle = shade(st.color, r % 2 === 0 ? -10 : -20);
        ctx.beginPath();
        for (let i = 0; i < perRow; i++) {
          const sx = -span + off + i * sr * 2;
          if (sx - sr > span || sx + sr < -span) continue;
          ctx.moveTo(sx + sr, yy);
          ctx.arc(sx, yy, sr, 0, Math.PI);
        }
        ctx.fill();
        // The copper crescent riding each scallop's crown.
        ctx.strokeStyle = shade(metal, 8);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        for (let i = 0; i < perRow; i++) {
          const sx = -span + off + i * sr * 2;
          if (sx > span || sx < -span) continue;
          ctx.moveTo(sx - sr * 0.55, yy + sr * 0.3);
          ctx.quadraticCurveTo(sx, yy + sr * 0.66, sx + sr * 0.55, yy + sr * 0.3);
        }
        ctx.stroke();
      }
    }

    // ---- diamondback hide: the adder's pattern worn as a coat — ONE
    // bold band of big diamonds across the belly, wrapping the whole
    // torso (a skin has no front or back). One row is a hide; a field
    // of small ones is a sweater (v1 verdict).
    if (st.chest === 'diamondhide') {
      const yy = -th * 0.52;
      const dw = tw * 0.44;
      const dh = th * 0.22;
      // The band's own ground: a darker strip seats the diamonds.
      ctx.fillStyle = shade(st.color, -8);
      ctx.fillRect(-tw * 0.98, yy - dh, tw * 1.96, dh * 2);
      ctx.fillStyle = shade(st.trim, -2);
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        const dx = i * dw * 2;
        if (dx - dw > tw * 0.98 || dx + dw < -tw * 0.98) continue;
        ctx.moveTo(dx, yy - dh);
        ctx.lineTo(dx + dw, yy);
        ctx.lineTo(dx, yy + dh);
        ctx.lineTo(dx - dw, yy);
        ctx.closePath();
      }
      ctx.fill();
      // The pale keel: one stitch line across each diamond's waist,
      // and a bright rim on the band's edges — hide, sewn on.
      ctx.strokeStyle = shade(st.color, 22);
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        const dx = i * dw * 2;
        if (dx > tw * 0.98 || dx < -tw * 0.98) continue;
        ctx.moveTo(dx - dw * 0.45, yy);
        ctx.lineTo(dx + dw * 0.45, yy);
      }
      ctx.moveTo(-tw * 0.96, yy - dh);
      ctx.lineTo(tw * 0.96, yy - dh);
      ctx.moveTo(-tw * 0.96, yy + dh);
      ctx.lineTo(tw * 0.96, yy + dh);
      ctx.stroke();
    }

    // ---- binding cords: silk wraps crossing the torso both ways and
    // cinching at the sternum knot — the spider's own thread, worn
    // back at it. Front and back both carry the cross (a wrap that
    // vanished on turn would break the garment).
    if (st.cords) {
      const cCol = hurt ? '#ffffff' : st.cords.color;
      ctx.strokeStyle = cCol;
      ctx.lineWidth = Math.max(2, s * 0.032);
      ctx.beginPath();
      ctx.moveTo(-tw * 0.78, -th * 0.96);
      ctx.lineTo(ww * 0.6, -0.09 * s);
      ctx.moveTo(tw * 0.78, -th * 0.96);
      ctx.lineTo(-ww * 0.6, -0.09 * s);
      ctx.stroke();
      // The under-shadow that seats the cords ON the leather.
      ctx.strokeStyle = shade(st.color, -18);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(-tw * 0.78, -th * 0.96 + 0.02 * s);
      ctx.lineTo(ww * 0.6, -0.09 * s + 0.02 * s);
      ctx.moveTo(tw * 0.78, -th * 0.96 + 0.02 * s);
      ctx.lineTo(-ww * 0.6, -0.09 * s + 0.02 * s);
      ctx.stroke();
      if (!back) {
        // The sternum knot: a wound button of silk where they cross.
        ctx.fillStyle = shade(cCol, -10);
        ctx.beginPath();
        ctx.arc(0, -th * 0.52, 0.034 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = shade(cCol, 18);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.arc(0, -th * 0.52, 0.021 * s, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // ---- buckskin fringe: leather strips swinging off the chest yoke,
    // kicked by the stride — motion the plainest jerkin can afford.
    // ---- DRAKEROWS: the drake worn whole — THE TAILORED HIDE on
    // the KITE SCALE. Round 2 mints the set's one scale signature:
    // the pointed, keeled kite (top edge lapped, side facets, keel
    // line to the point) — arcs are anybody's scallops; the kite is
    // the drake's. Front: dark flank fields of lapped kites tucking
    // UNDER a center plastron of five great tempered belly plates
    // (bottom-up so uppers lap lowers, keel column down the middle),
    // with the banked forge standing in every plate gap and cracking
    // through the waist keels. Back: the kite field wall to wall and
    // the dorsal ridge owning the spine. Leading side holds one value
    // step of light over the trailing (turned-garment law).
    if (st.drakerows && !hurt) {
      const dr = st.drakerows;
      const topY = -th * 0.98;
      const botY = -0.05 * s;
      const span = botY - topY;
      const kite = (cxk: number, cyk: number, w2: number, h2: number, fill: string, keel: string, lap?: string): void => {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(cxk - w2, cyk - h2 * 0.5);
        ctx.lineTo(cxk + w2, cyk - h2 * 0.5);
        ctx.lineTo(cxk + w2 * 0.8, cyk + h2 * 0.16);
        ctx.lineTo(cxk, cyk + h2 * 0.5);
        ctx.lineTo(cxk - w2 * 0.8, cyk + h2 * 0.16);
        ctx.closePath();
        ctx.fill();
        if (lap) {
          ctx.strokeStyle = lap;
          ctx.lineWidth = Math.max(1, s * 0.012);
          ctx.beginPath();
          ctx.moveTo(cxk - w2, cyk - h2 * 0.48);
          ctx.lineTo(cxk + w2, cyk - h2 * 0.48);
          ctx.stroke();
        }
        ctx.strokeStyle = keel;
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        ctx.moveTo(cxk, cyk - h2 * 0.3);
        ctx.lineTo(cxk, cyk + h2 * 0.42);
        ctx.stroke();
      };
      if (!back) {
        // The flank fields: two staggered kite columns per side,
        // tapering to the waist, tucking under the plastron's edge.
        for (let r = 0; r < 3; r++) {
          const k = r / 2;
          const yy = topY + span * (0.2 + 0.62 * k);
          const w2 = tww * (0.15 - 0.025 * k);
          const h2 = span * 0.2;
          for (const sgn of [-1, 1] as const) {
            const litSide = sgn === leadSign;
            kite(
              sgn * tww * (0.76 - 0.04 * k), yy, w2, h2,
              litSide ? shade(dr.hide, 6) : shade(dr.hide, -8),
              shade(dr.hide, -22),
              litSide ? shade(dr.hide, 20) : shade(dr.hide, 8),
            );
            kite(
              sgn * tww * (0.55 - 0.03 * k), yy + h2 * 0.5, w2 * 0.8, h2 * 0.9,
              litSide ? shade(dr.hide, 2) : shade(dr.hide, -12),
              shade(dr.hide, -24),
            );
          }
        }
        // THE PLASTRON, bottom-up so every upper plate laps the one
        // below it. It rides the torso's FRONT PLANE, so the whole
        // column slides toward the leading edge as the body turns.
        const pcx = leadSign * tww * 0.09;
        for (let r = 4; r >= 0; r--) {
          const k = r / 4;
          const w = tww * (0.52 - 0.15 * k);
          const yTop = topY + span * (0.03 + r * 0.195);
          const hgt = span * 0.235;
          const yBot = yTop + hgt;
          const plate = (x0: number, x1: number, c: string): void => {
            ctx.fillStyle = c;
            ctx.beginPath();
            ctx.moveTo(pcx + x0, yTop);
            ctx.lineTo(pcx + x1, yTop);
            ctx.lineTo(pcx + x1 * 0.97, yBot - hgt * 0.08);
            ctx.quadraticCurveTo(pcx + (x0 + x1) * 0.5, yBot + hgt * 0.14, pcx + x0 * 0.97, yBot - hgt * 0.08);
            ctx.closePath();
            ctx.fill();
          };
          // Body first, then the leading third lifted and trailing
          // third sunk — flat value planes, never gradients.
          plate(-w, w, dr.plate);
          plate(leadSign * w * 0.3, leadSign * w, shade(dr.plate, 9));
          plate(-leadSign * w, -leadSign * w * 0.42, shade(dr.plate, -13));
          // The lit top plane: the lap edge catching the sky.
          ctx.fillStyle = dr.lit;
          ctx.fillRect(pcx - w * 0.93, yTop, w * 1.86, hgt * 0.2);
          // The keel facet: one dark fold at center — five of these
          // stack into the plastron's single keel column.
          ctx.fillStyle = shade(dr.plate, -22);
          ctx.beginPath();
          ctx.moveTo(pcx - w * 0.05, yTop + hgt * 0.2);
          ctx.lineTo(pcx + w * 0.09, yTop + hgt * 0.2);
          ctx.lineTo(pcx + w * 0.03, yBot + hgt * 0.05);
          ctx.lineTo(pcx - w * 0.09, yBot - hgt * 0.02);
          ctx.closePath();
          ctx.fill();
        }
        // THE FORGE IN THE GAPS: molten light standing where the
        // plates part, each gap breathing on its own phase of the
        // furnace clock, and the two waist keels cracked open on a
        // slower one — the fire lives INSIDE the armor's core, never
        // as a badge on its face.
        if (st.heatseam) {
          const hs = st.heatseam;
          for (const r of [1, 2, 3] as const) {
            const k = r / 4;
            const w = tww * (0.52 - 0.15 * k);
            const yTop = topY + span * (0.03 + r * 0.195);
            const hgt = span * 0.235;
            const yBot = yTop + hgt;
            const br = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(nowMs * 0.0012 + r * 1.9));
            ctx.globalAlpha = 0.5 * br;
            ctx.strokeStyle = hs.color;
            ctx.lineWidth = Math.max(1.5, s * 0.02);
            ctx.beginPath();
            ctx.moveTo(pcx - w * 0.78, yBot - hgt * 0.05);
            ctx.quadraticCurveTo(pcx, yBot + hgt * 0.16, pcx + w * 0.78, yBot - hgt * 0.05);
            ctx.stroke();
            ctx.globalAlpha = 0.95 * br;
            ctx.strokeStyle = hs.core;
            ctx.lineWidth = Math.max(1, s * 0.009);
            ctx.beginPath();
            ctx.moveTo(pcx - w * 0.62, yBot - hgt * 0.02);
            ctx.quadraticCurveTo(pcx, yBot + hgt * 0.15, pcx + w * 0.62, yBot - hgt * 0.02);
            ctx.stroke();
          }
          for (const r of [2, 3] as const) {
            const yTop = topY + span * (0.03 + r * 0.195);
            const hgt = span * 0.235;
            const br = 0.5 + 0.5 * Math.sin(nowMs * 0.0009 + r * 2.6);
            ctx.globalAlpha = 0.55 + 0.4 * br;
            ctx.fillStyle = hs.core;
            ctx.fillRect(pcx - 0.0045 * s, yTop + hgt * 0.34, 0.009 * s, hgt * 0.42);
          }
          ctx.globalAlpha = 1;
        }
      } else {
        // The back of the hide: the kite field wall to wall — ONE
        // quiet ground value, lap edges a step LIGHTER (light over
        // dark is what makes a lap read on the shaded back), keels
        // to every point — and THE DORSAL RIDGE standing over it.
        for (let r = 0; r < 4; r++) {
          const k = r / 3;
          const yy = topY + span * (0.14 + 0.76 * k);
          const w2 = tww * (0.18 - 0.03 * k);
          for (let i = 0; i < 3; i++) {
            const sx = (-0.56 + i * 0.56 + (r % 2) * 0.28) * tww;
            if (Math.abs(sx) > tww * 0.8) continue;
            kite(sx, yy, w2, span * 0.2, shade(dr.hide, -6), shade(dr.hide, -24), shade(dr.hide, 14));
          }
        }
        // The spine column the ridge stands from, then the tabs —
        // bigger than the scutes so the ridge OWNS the back read.
        ctx.fillStyle = shade(dr.hide, -16);
        ctx.fillRect(-0.02 * s, topY + span * 0.02, 0.04 * s, span * 0.94);
        for (let i = 0; i < 4; i++) {
          const yy = topY + span * (0.02 + i * 0.24);
          const tall = span * (0.22 - i * 0.025);
          ctx.fillStyle = shade(dr.hide, -26);
          ctx.beginPath();
          ctx.moveTo(-0.048 * s, yy + tall);
          ctx.lineTo(-leadSign * 0.07 * s, yy - tall * 0.5);
          ctx.lineTo(0.048 * s, yy + tall);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = shade(dr.plate, -4);
          ctx.lineWidth = Math.max(1, s * 0.011);
          ctx.beginPath();
          ctx.moveTo(-0.048 * s, yy + tall);
          ctx.lineTo(-leadSign * 0.07 * s, yy - tall * 0.5);
          ctx.stroke();
        }
      }
    }

    // ---- THE SCALECOAT: fish-leather worn whole — dense crescent
    // rows banding the torso, nacre edge crescents, wrap-around (a
    // skin has no front). Finer than any drake: this is the river's
    // own tanning. On the back read a dorsal ridge of small fin tabs
    // runs the spine; and THE SHEENWAVE — one iridescent band —
    // travels the rows every few seconds: light through water.
    if (st.scalecoat && !hurt) {
      const sc = st.scalecoat;
      // THE TAILORED HARNESS: scale armor as a CUT GARMENT, not a
      // texture grid. Five arced rows hang from a nacre yoke band;
      // each row is a center KEEL plate flanked by smaller scales
      // that taper toward the flanks (radial composition — the
      // sturgeon's scute line down the front); rows tighten toward
      // the waist and drape (center dips, flanks ride up). Uniform
      // giant blocks read as cinderblock (the round-3 verdict);
      // tailoring is what says ARMORER.
      const topY = -th * 0.94;
      const botY = 0.005 * s;
      const rows = 5;
      const spanRows = botY - topY;
      // Flank taper: plate slots at u = 0, ±1, ±2 across the torso;
      // width shrinks stepping outward AND stepping down the rows.
      const slotU = [0, -1, 1, -2, 2];
      for (let r = rows - 1; r >= 0; r--) {
        const rowK = 1 - r * 0.05; // rows tighten toward the waist
        const rowH = (spanRows / rows) * 1.0;
        const yy = topY + (spanRows * (r + 1)) / rows;
        const off = (r % 2) * 0.5; // half-slot stagger
        const lastRow = r === rows - 1;
        for (const u0 of slotU) {
          const u = u0 + (u0 >= 0 ? off : -off);
          const center = u0 === 0;
          const pw = tww * (center ? 0.24 : u0 === -1 || u0 === 1 ? 0.2 : 0.17) * rowK;
          const sx = u * tww * 0.42;
          if (sx - pw > tww || sx + pw < -tww) continue;
          // THE DRAPE: rows arc — center hangs lowest, flanks ride
          // up the ribs.
          const dip = (1 - Math.min(1, Math.abs(u) * 0.5)) * rowH * 0.22;
          const py = yy + dip;
          const turnBias = (sx * leadSign) / tww;
          const col2 = turnBias > 0.5 ? shade(sc.color, 8) : turnBias < -0.45 ? shade(sc.color, -12) : sc.color;
          // The plate: flat shoulders into a full-bellied point.
          ctx.fillStyle = center ? shade(col2, 4) : col2;
          ctx.beginPath();
          ctx.moveTo(sx - pw, py - rowH * 1.06);
          ctx.lineTo(sx + pw, py - rowH * 1.06);
          ctx.lineTo(sx + pw, py - rowH * 0.3);
          ctx.quadraticCurveTo(sx + pw * 0.58, py + rowH * 0.1, sx, py + rowH * 0.2);
          ctx.quadraticCurveTo(sx - pw * 0.58, py + rowH * 0.1, sx - pw, py - rowH * 0.3);
          ctx.closePath();
          ctx.fill();
          // Lit shoulder plane, scaled to the plate.
          ctx.fillStyle = shade(col2, 12);
          ctx.fillRect(sx - pw * 0.85, py - rowH * 1.0, pw * 1.7, rowH * 0.22);
          // Only the CENTER column carries the keel facet — a keel
          // on every plate is noise; one line of keels is a design.
          if (center) {
            ctx.fillStyle = shade(col2, -16);
            ctx.beginPath();
            ctx.moveTo(sx - pw * 0.09, py - rowH * 0.72);
            ctx.lineTo(sx + pw * 0.09, py - rowH * 0.72);
            ctx.lineTo(sx + pw * 0.03, py + rowH * 0.17);
            ctx.lineTo(sx - pw * 0.03, py + rowH * 0.17);
            ctx.closePath();
            ctx.fill();
          }
          // Nacre edge arc; the bottom row and the outermost flanks
          // stay bare (teeth law; the silhouette keeps its own line).
          if (lastRow || Math.abs(u0) === 2) continue;
          ctx.strokeStyle = turnBias > 0.5 ? shade(sc.edge, 14) : sc.edge;
          ctx.lineWidth = Math.max(1, s * 0.011);
          ctx.beginPath();
          ctx.moveTo(sx - pw * 0.78, py - rowH * 0.26);
          ctx.quadraticCurveTo(sx, py + rowH * 0.22, sx + pw * 0.78, py - rowH * 0.26);
          ctx.stroke();
        }
      }
      // THE YOKE: the nacre-edged band the whole harness hangs from
      // — a coat is MOUNTED, never floating.
      ctx.fillStyle = shade(sc.color, -18);
      ctx.beginPath();
      ctx.moveTo(-tww * 0.98, topY - th * 0.02);
      ctx.quadraticCurveTo(0, topY - th * 0.1, tww * 0.98, topY - th * 0.02);
      ctx.lineTo(tww * 0.94, topY + th * 0.1);
      ctx.quadraticCurveTo(0, topY + th * 0.02, -tww * 0.94, topY + th * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = sc.edge;
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(-tww * 0.94, topY + th * 0.09);
      ctx.quadraticCurveTo(0, topY + th * 0.01, tww * 0.94, topY + th * 0.09);
      ctx.stroke();
      // THE SHEENWAVE: a diagonal nacre band sweeping the coat on a
      // slow clock — clipped to the scale field, alpha-soft, gone as
      // fast as light off a turning fish.
      const wp = (nowMs % 4200) / 4200;
      if (wp < 0.4) {
        const k = wp / 0.4;
        const bx = -tww * 1.4 + k * tww * 2.8;
        ctx.save();
        ctx.beginPath();
        ctx.rect(-tww, topY, tww * 2, botY - topY);
        ctx.clip();
        ctx.globalAlpha = 0.3 * Math.sin(k * Math.PI);
        ctx.fillStyle = sc.sheen;
        ctx.beginPath();
        ctx.moveTo(bx - tww * 0.16, botY);
        ctx.lineTo(bx + tww * 0.3, topY);
        ctx.lineTo(bx + tww * 0.52, topY);
        ctx.lineTo(bx + tww * 0.06, botY);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      // The dorsal ridge: fin tabs down the spine, back views only.
      if (back) {
        ctx.fillStyle = shade(sc.color, -18);
        for (let i = 0; i < 4; i++) {
          const yy = -th * (0.92 - i * 0.24);
          ctx.beginPath();
          ctx.moveTo(-tww * 0.05, yy);
          ctx.lineTo(tww * 0.05, yy);
          ctx.lineTo(leadSign * tww * 0.02, yy + th * 0.14);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // ---- WINDTABS: the hood's triangle language carried to the
    // waist — layered wind-cut tabs off the belt line, all raked one
    // way, kicked by the stride like the fringe but SHAPED: swept
    // triangles, not threads.
    if (st.windtabs && !hurt) {
      const rake = -(f.lead || 1);
      const yy = -0.02 * s;
      for (let i = 0; i < 5; i++) {
        const u = -0.8 + i * 0.4;
        const kick =
          f.strideSw * 0.018 * s * (0.5 + 0.5 * Math.abs(u)) +
          Math.sin(nowMs * 0.0038 + i * 1.9) * 0.006 * s * (0.3 + 0.7 * runF);
        const len = (0.075 + 0.02 * Math.sin(i * 2.1)) * s;
        ctx.fillStyle = shade(st.windtabs.color, i % 2 === 0 ? 0 : -12);
        ctx.beginPath();
        ctx.moveTo(u * tww - 0.032 * s, yy);
        ctx.lineTo(u * tww + 0.03 * s, yy);
        ctx.lineTo(u * tww + rake * 0.028 * s + kick, yy + len);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (st.fringe) {
      const yokeY = -th * 0.52;
      ctx.strokeStyle = shade(st.trim, -6);
      ctx.lineWidth = Math.max(1.5, s * 0.024);
      ctx.beginPath();
      ctx.moveTo(-tw * 0.86, yokeY - 0.012 * s);
      ctx.lineTo(tw * 0.86, yokeY - 0.012 * s);
      for (let i = 0; i < 6; i++) {
        const u = -0.78 + i * 0.312;
        const len = (0.082 + 0.018 * Math.sin(i * 2.3)) * s;
        const kick =
          f.strideSw * 0.016 * s * (0.4 + 0.6 * Math.abs(u)) +
          Math.sin(nowMs * 0.004 + i * 1.7) * 0.007 * s * (0.3 + 0.7 * runF);
        ctx.moveTo(u * tw, yokeY);
        ctx.lineTo(u * tw + kick, yokeY + len);
      }
      ctx.stroke();
    }

    // ---- front and back are DIFFERENT garments: chest marks face the
    // camera; turn around and you get backplates, crossed straps, seams.
    // The whole marks family lives on the front (or back) PLANE — it
    // rides the turned-garment transform as one sheet.
    frontPlaneOn();
    if (!back) {
      // ---- THE FOX BIB: emberfox's cream front — a soft rounded
      // throat panel, fur-ticked along its edge so it reads as coat,
      // never as a painted-on shape.
      if (st.foxbib && !hurt) {
        const bw = tww * 0.4;
        ctx.fillStyle = st.foxbib.color;
        ctx.beginPath();
        ctx.moveTo(-bw, -th * 1.0);
        ctx.quadraticCurveTo(-bw * 1.1, -th * 0.62, 0, -th * 0.44);
        ctx.quadraticCurveTo(bw * 1.1, -th * 0.62, bw, -th * 1.0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = st.foxbib.color;
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(1, s * 0.012);
        for (let i = 0; i < 7; i++) {
          const u = -0.9 + (i / 6) * 1.8;
          const ex = u * bw;
          const ey = -th * (0.44 + 0.18 * u * u) - th * 0.02;
          ctx.beginPath();
          ctx.moveTo(ex, ey - th * 0.02);
          ctx.lineTo(ex + u * tww * 0.02, ey + th * 0.07);
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
      }
      if (st.chest === 'straps') {
        ctx.strokeStyle = st.trim;
        ctx.lineWidth = Math.max(1.5, s * 0.028);
        ctx.beginPath();
        ctx.moveTo(-tw * 0.7, -th * 0.96);
        ctx.lineTo(ww * 0.5, -0.1 * s);
        ctx.stroke();
        ctx.fillStyle = metal;
        ctx.fillRect(-tw * 0.16, -th * 0.55, 0.03 * s, 0.03 * s);
      } else if (st.chest === 'plate' && !st.tabard) {
        ctx.fillStyle = metal;
        ctx.beginPath();
        chamferRect(ctx, -tw * 0.52, -th * 0.86, tw * 1.04, th * 0.52, 0.035 * s);
        ctx.fill();
        ctx.fillStyle = shade(metal, 16);
        ctx.fillRect(-tw * 0.52, -th * 0.86, tw * 1.04, th * 0.1);
        // Rivets pin the breastplate at its corners.
        ctx.fillStyle = shade(metal, -26);
        for (const rx of [-tw * 0.42, tw * 0.42]) {
          ctx.fillRect(rx - 0.008 * s, -th * 0.82, 0.016 * s, 0.016 * s);
          ctx.fillRect(rx - 0.008 * s, -th * 0.42, 0.016 * s, 0.016 * s);
        }
        if (st.midline) {
          // The forge crease: two hammered halves joined down the
          // center — dark seam, catch-light along its east side.
          ctx.strokeStyle = shade(metal, -20);
          ctx.lineWidth = Math.max(1, s * 0.016);
          ctx.beginPath();
          ctx.moveTo(0, -th * 0.84);
          ctx.lineTo(0, -th * 0.36);
          ctx.stroke();
          ctx.strokeStyle = shade(metal, 18);
          ctx.lineWidth = Math.max(1, s * 0.012);
          ctx.beginPath();
          ctx.moveTo(0.014 * s, -th * 0.83);
          ctx.lineTo(0.014 * s, -th * 0.37);
          ctx.stroke();
        }
        if (st.rivetSeams) {
          // Seam the plate: a border stroke plus mid-edge rivets
          // joining the corner set — boilerwork, every plate PINNED.
          // Each rivet is a dark seat with a lit dome cap: a BUMP,
          // never a hole.
          ctx.strokeStyle = shade(metal, -16);
          ctx.lineWidth = Math.max(1, s * 0.013);
          ctx.beginPath();
          chamferRect(ctx, -tw * 0.52, -th * 0.86, tw * 1.04, th * 0.52, 0.035 * s);
          ctx.stroke();
          const rivets: Array<[number, number]> = [
            [0, -th * 0.855], [0, -th * 0.36],
            [-tw * 0.51, -th * 0.62], [tw * 0.51, -th * 0.62],
          ];
          ctx.fillStyle = shade(metal, -26);
          for (const [rx, ry] of rivets) {
            ctx.fillRect(rx - 0.008 * s, ry - 0.008 * s, 0.016 * s, 0.016 * s);
          }
          ctx.fillStyle = shade(metal, 22);
          for (const [rx, ry] of rivets) {
            ctx.fillRect(rx - 0.008 * s, ry - 0.008 * s, 0.008 * s, 0.008 * s);
          }
        }
        if (st.ribs) {
          // Bone inlay: three lapped ivory arcs riding the plate, each
          // seated by a dark line beneath — the barrow-king wears his
          // ribs on the outside, and every arc is FAT enough to read
          // as inlay, never as scratches.
          const bCol = st.ribs.color;
          ctx.lineCap = 'round';
          for (let i = 0; i < 3; i++) {
            const ry = -th * (0.74 - i * 0.15);
            const rw2 = tw * (0.44 - i * 0.05);
            ctx.strokeStyle = shade(bCol, -30);
            ctx.lineWidth = Math.max(2, s * 0.03);
            ctx.beginPath();
            ctx.moveTo(-rw2, ry - th * 0.02);
            ctx.quadraticCurveTo(0, ry + th * 0.1, rw2, ry - th * 0.02);
            ctx.stroke();
            ctx.strokeStyle = bCol;
            ctx.lineWidth = Math.max(1.5, s * 0.024);
            ctx.beginPath();
            ctx.moveTo(-rw2, ry - th * 0.03);
            ctx.quadraticCurveTo(0, ry + th * 0.09, rw2, ry - th * 0.03);
            ctx.stroke();
          }
          ctx.lineCap = 'butt';
        }
        if (st.ridges) {
          // Gothic fluting: three channels hammered down the plate,
          // converging toward the waist — each a shadow stroke with a
          // catch-light beside it, both FAT enough to survive world
          // zoom (hairline fluting reads as scratches, not smithing).
          ctx.lineWidth = Math.max(1.5, s * 0.02);
          for (const rx of [-0.26, 0, 0.26]) {
            ctx.strokeStyle = shade(metal, -22);
            ctx.beginPath();
            ctx.moveTo(tw * rx, -th * 0.8);
            ctx.lineTo(tw * rx * 0.55, -th * 0.4);
            ctx.stroke();
            ctx.strokeStyle = shade(metal, 22);
            ctx.beginPath();
            ctx.moveTo(tw * rx + 0.016 * s, -th * 0.8);
            ctx.lineTo(tw * rx * 0.55 + 0.016 * s, -th * 0.4);
            ctx.stroke();
          }
        }
      } else if (st.chest === 'stitch') {
        ctx.strokeStyle = st.trim;
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(0, -th * 0.98);
        ctx.lineTo(0, -0.09 * s);
        ctx.stroke();
        // Rope belt knot — the apprentice's whole budget.
        ctx.fillStyle = st.trim;
        ctx.beginPath();
        ctx.arc(0, -0.04 * s, 0.022 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      if (st.emblem && (st.chest === 'emblem' || st.chest === 'plate')) {
        ctx.fillStyle = st.trim;
        // A mantle or capelet claims the upper chest — the emblem sits
        // below the layered garment, never behind its hem.
        const ey = -th * (st.mantle || st.capelet ? 0.3 : 0.58);
        const r = tw * 0.3 * (st.emblemScale ?? 1);
        if (st.emblem === 'skull') {
          // The dread device: a grinning skull etched into the plate —
          // drawn large; a timid skull is no skull at all.
          const rs = r * 1.45;
          ctx.beginPath();
          ctx.arc(0, ey - rs * 0.12, rs * 0.5, Math.PI * 0.95, Math.PI * 2.05);
          ctx.lineTo(rs * 0.34, ey + rs * 0.42);
          ctx.lineTo(-rs * 0.34, ey + rs * 0.42);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#1c1722';
          for (const exx of [-rs * 0.22, rs * 0.22]) {
            ctx.fillRect(exx - rs * 0.12, ey - rs * 0.24, rs * 0.24, rs * 0.26);
          }
          ctx.fillRect(-rs * 0.055, ey + rs * 0.12, rs * 0.11, rs * 0.18);
        } else if (st.emblem === 'sun') {
          // The radiant device: a core diamond ringed by eight rays —
          // drawn large; a timid sun is a freckle.
          ctx.beginPath();
          ctx.moveTo(0, ey - r * 0.6);
          ctx.lineTo(r * 0.5, ey);
          ctx.lineTo(0, ey + r * 0.6);
          ctx.lineTo(-r * 0.5, ey);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = st.trim;
          ctx.lineWidth = Math.max(1.5, s * 0.02);
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            ctx.moveTo(Math.cos(a) * r * 0.72, ey + Math.sin(a) * r * 0.72);
            ctx.lineTo(Math.cos(a) * r * 1.12, ey + Math.sin(a) * r * 1.12);
          }
          ctx.stroke();
        } else if (st.emblem === 'leaf') {
          // The warden device: a single leaf with its center vein —
          // drawn large; a timid leaf reads as lint.
          ctx.beginPath();
          ctx.moveTo(0, ey - r * 0.8);
          ctx.quadraticCurveTo(r * 0.72, ey - r * 0.14, 0, ey + r * 0.8);
          ctx.quadraticCurveTo(-r * 0.72, ey - r * 0.14, 0, ey - r * 0.8);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = shade(st.trim, -24);
          ctx.lineWidth = Math.max(1, s * 0.014);
          ctx.beginPath();
          ctx.moveTo(0, ey - r * 0.6);
          ctx.lineTo(0, ey + r * 0.6);
          ctx.stroke();
        } else if (st.emblem === 'star') {
          // The celestial device: a four-point star with two pinprick
          // companions — a constellation, not a logo.
          ctx.beginPath();
          ctx.moveTo(0, ey - r * 0.75);
          ctx.lineTo(r * 0.17, ey - r * 0.17);
          ctx.lineTo(r * 0.58, ey);
          ctx.lineTo(r * 0.17, ey + r * 0.17);
          ctx.lineTo(0, ey + r * 0.75);
          ctx.lineTo(-r * 0.17, ey + r * 0.17);
          ctx.lineTo(-r * 0.58, ey);
          ctx.lineTo(-r * 0.17, ey - r * 0.17);
          ctx.closePath();
          ctx.fill();
          ctx.fillRect(r * 0.48, ey - r * 0.66, 0.018 * s, 0.018 * s);
          ctx.fillRect(-r * 0.68, ey + r * 0.46, 0.018 * s, 0.018 * s);
        } else if (st.emblem === 'moon') {
          // The tide device: a waxing crescent, horns to the right —
          // drawn large; a timid device is no device at all.
          ctx.beginPath();
          ctx.arc(0, ey, r * 0.82, -Math.PI * 0.5, Math.PI * 0.5, false);
          ctx.arc(r * 0.34, ey, r * 0.66, Math.PI * 0.5, -Math.PI * 0.5, true);
          ctx.closePath();
          ctx.fill();
        } else if (st.emblem === 'eye') {
          // The arcane device: an unblinking almond eye. It reads back.
          ctx.beginPath();
          ctx.moveTo(-r * 0.88, ey);
          ctx.quadraticCurveTo(0, ey - r * 0.7, r * 0.88, ey);
          ctx.quadraticCurveTo(0, ey + r * 0.7, -r * 0.88, ey);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#1c1722';
          ctx.beginPath();
          ctx.arc(0, ey, r * 0.27, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = shade(st.trim, 34);
          ctx.fillRect(r * 0.05, ey - r * 0.2, 0.018 * s, 0.018 * s);
        } else if (st.emblem === 'moth') {
          // The moth device: four broad wing lobes about a slender body,
          // eye-spots in shadow — drawn WIDE; a timid moth is a smudge.
          const rw = r * 1.35;
          for (const sx of [-1, 1]) {
            // Upper lobe: big, swept up and out.
            ctx.beginPath();
            ctx.moveTo(sx * r * 0.06, ey - r * 0.14);
            ctx.quadraticCurveTo(sx * rw * 0.55, ey - r * 1.3, sx * rw, ey - r * 0.5);
            ctx.quadraticCurveTo(sx * rw * 0.6, ey + r * 0.04, sx * r * 0.06, ey + r * 0.08);
            ctx.closePath();
            ctx.fill();
            // Lower lobe: smaller, hanging.
            ctx.beginPath();
            ctx.moveTo(sx * r * 0.08, ey + r * 0.1);
            ctx.quadraticCurveTo(sx * rw * 0.62, ey + r * 0.3, sx * rw * 0.5, ey + r * 0.85);
            ctx.quadraticCurveTo(sx * r * 0.2, ey + r * 0.8, sx * r * 0.06, ey + r * 0.26);
            ctx.closePath();
            ctx.fill();
          }
          // Eye-spots on the upper wings.
          ctx.fillStyle = shade(st.color, -28);
          for (const sx of [-1, 1]) {
            ctx.beginPath();
            ctx.arc(sx * rw * 0.58, ey - r * 0.55, r * 0.19, 0, Math.PI * 2);
            ctx.fill();
          }
          // The body: a slender taper, antennae curling off the head.
          ctx.fillStyle = shade(st.trim, -22);
          ctx.beginPath();
          ctx.moveTo(0, ey - r * 0.6);
          ctx.lineTo(r * 0.11, ey + r * 0.15);
          ctx.lineTo(0, ey + r * 0.75);
          ctx.lineTo(-r * 0.11, ey + r * 0.15);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = shade(st.trim, -22);
          ctx.lineWidth = Math.max(1, s * 0.016);
          ctx.beginPath();
          ctx.moveTo(0, ey - r * 0.55);
          ctx.quadraticCurveTo(r * 0.22, ey - r * 0.95, r * 0.4, ey - r * 1.15);
          ctx.moveTo(0, ey - r * 0.55);
          ctx.quadraticCurveTo(-r * 0.22, ey - r * 0.95, -r * 0.4, ey - r * 1.15);
          ctx.stroke();
        } else if (st.emblem === 'bullhead') {
          // The pasture device: a broad horn sweep over a square
          // muzzle — drawn WIDE; a timid bull is a goat. Horns are fat
          // round-cap arcs, the muzzle a solid block with dark
          // nostril punches.
          const rb = r * 1.3;
          ctx.strokeStyle = st.trim;
          ctx.lineCap = 'round';
          ctx.lineWidth = Math.max(2.5, s * 0.042);
          ctx.beginPath();
          ctx.moveTo(-rb * 0.24, ey + rb * 0.1);
          ctx.quadraticCurveTo(-rb * 0.95, ey + rb * 0.02, -rb * 0.78, ey - rb * 0.72);
          ctx.moveTo(rb * 0.24, ey + rb * 0.1);
          ctx.quadraticCurveTo(rb * 0.95, ey + rb * 0.02, rb * 0.78, ey - rb * 0.72);
          ctx.stroke();
          ctx.lineCap = 'butt';
          ctx.fillStyle = st.trim;
          ctx.beginPath();
          chamferRect(ctx, -rb * 0.3, ey - rb * 0.18, rb * 0.6, rb * 0.62, rb * 0.12);
          ctx.fill();
          ctx.fillStyle = '#1c1722';
          ctx.fillRect(-rb * 0.17, ey + rb * 0.2, rb * 0.11, rb * 0.14);
          ctx.fillRect(rb * 0.06, ey + rb * 0.2, rb * 0.11, rb * 0.14);
        } else if (st.emblem === 'coin') {
          // The thief's device: one fat brass coin over the heart —
          // rim, punched square hole, a glint that never sleeps.
          // Drawn large; a timid coin is a button.
          ctx.beginPath();
          ctx.arc(0, ey, r * 0.95, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = shade(st.trim, -22);
          ctx.lineWidth = Math.max(1.5, s * 0.02);
          ctx.beginPath();
          ctx.arc(0, ey, r * 0.7, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#1c1722';
          ctx.fillRect(-r * 0.19, ey - r * 0.19, r * 0.38, r * 0.38);
          ctx.fillStyle = shade(st.trim, 34);
          ctx.fillRect(r * 0.4, ey - r * 0.62, 0.024 * s, 0.024 * s);
        } else if (st.emblem === 'flame') {
          // The vigil device: one candle flame drawn big and calm — a
          // teardrop leaning with its own slow breath over a wick bar.
          // A timid flame is out.
          const lean = Math.sin(nowMs * 0.0013) * r * 0.1;
          const rf = r * 1.15;
          ctx.beginPath();
          ctx.moveTo(lean * 1.6, ey - rf * 0.95);
          ctx.quadraticCurveTo(rf * 0.62 + lean, ey - rf * 0.1, 0, ey + rf * 0.5);
          ctx.quadraticCurveTo(-rf * 0.62 + lean, ey - rf * 0.1, lean * 1.6, ey - rf * 0.95);
          ctx.closePath();
          ctx.fill();
          // The dark heart every honest flame keeps.
          ctx.fillStyle = shade(st.color, -20);
          ctx.beginPath();
          ctx.moveTo(lean, ey - rf * 0.28);
          ctx.quadraticCurveTo(rf * 0.25 + lean * 0.6, ey + rf * 0.06, 0, ey + rf * 0.34);
          ctx.quadraticCurveTo(-rf * 0.25 + lean * 0.6, ey + rf * 0.06, lean, ey - rf * 0.28);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = shade(st.trim, -24);
          ctx.fillRect(-rf * 0.2, ey + rf * 0.52, rf * 0.4, 0.018 * s);
        } else if (st.emblem === 'orrery') {
          // The magister's device: a brass armillary — one meridian
          // circle, one flat equator band, a fat sun at the heart and
          // one small world that actually runs its orbit. Clean rings,
          // never a tangle: an instrument reads because it is exact.
          const ro = r * 1.1;
          ctx.strokeStyle = st.trim;
          ctx.lineWidth = Math.max(1.5, s * 0.016);
          ctx.beginPath();
          ctx.arc(0, ey, ro, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(0, ey, ro * 0.96, ro * 0.26, 0, 0, Math.PI * 2);
          ctx.stroke();
          // The sun, big and sure, one hot glint.
          ctx.fillStyle = st.trim;
          ctx.beginPath();
          ctx.arc(0, ey, ro * 0.36, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = shade(st.trim, 34);
          ctx.beginPath();
          ctx.arc(-ro * 0.11, ey - ro * 0.11, ro * 0.13, 0, Math.PI * 2);
          ctx.fill();
          // The wandering world, keeping perfect time on the meridian.
          const oa = nowMs * 0.0009;
          ctx.fillStyle = shade(st.trim, 18);
          ctx.beginPath();
          ctx.arc(Math.cos(oa) * ro, ey + Math.sin(oa) * ro, 0.02 * s, 0, Math.PI * 2);
          ctx.fill();
        } else if (st.emblem === 'crown') {
          // The champion's device: the king's crown, drawn WIDE — a
          // solid band, three blunt points, a jewel in each. A timid
          // crown is a hat; this one granted lands.
          const rc = r * 1.2;
          const by = ey + rc * 0.3;
          ctx.fillStyle = st.trim;
          ctx.fillRect(-rc * 0.85, by - rc * 0.22, rc * 1.7, rc * 0.34);
          for (const [ux, tall] of [[-0.62, 0.55], [0, 0.78], [0.62, 0.55]] as const) {
            ctx.beginPath();
            ctx.moveTo(ux * rc - rc * 0.24, by - rc * 0.2);
            ctx.lineTo(ux * rc, by - rc * 0.2 - rc * tall);
            ctx.lineTo(ux * rc + rc * 0.24, by - rc * 0.2);
            ctx.closePath();
            ctx.fill();
          }
          // Each point's shaded west facet — forged gold, not foil.
          ctx.fillStyle = shade(st.trim, -20);
          for (const [ux, tall] of [[-0.62, 0.55], [0, 0.78], [0.62, 0.55]] as const) {
            ctx.beginPath();
            ctx.moveTo(ux * rc - rc * 0.24, by - rc * 0.2);
            ctx.lineTo(ux * rc, by - rc * 0.2 - rc * tall);
            ctx.lineTo(ux * rc - rc * 0.02, by - rc * 0.2);
            ctx.closePath();
            ctx.fill();
          }
          // The band's lit upper edge and three set jewels.
          ctx.fillStyle = shade(st.trim, 26);
          ctx.fillRect(-rc * 0.85, by - rc * 0.22, rc * 1.7, rc * 0.08);
          ctx.fillStyle = shade(st.color, -26);
          for (const ux of [-0.5, 0, 0.5]) {
            ctx.beginPath();
            ctx.arc(ux * rc, by - rc * 0.04, rc * 0.09, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (st.emblem === 'lion') {
          // The kingsmane device: a guardian lion's face front-on —
          // a wreath of mane wedges around a sculpted visage. Drawn
          // LARGE and calm; a timid lion is a housecat.
          const rl = r * 1.35;
          ctx.fillStyle = st.trim;
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
            const len = rl * (1.06 + 0.16 * Math.max(0, -Math.sin(a)));
            const r0 = rl * 0.68;
            ctx.moveTo(Math.cos(a - 0.3) * r0, ey + Math.sin(a - 0.3) * r0);
            ctx.lineTo(Math.cos(a) * len, ey + Math.sin(a) * len);
            ctx.lineTo(Math.cos(a + 0.3) * r0, ey + Math.sin(a + 0.3) * r0);
          }
          ctx.closePath();
          ctx.fill();
          // The visage: a lighter face disc the mane grows from.
          ctx.fillStyle = shade(st.trim, 28);
          ctx.beginPath();
          ctx.arc(0, ey, rl * 0.72, 0, Math.PI * 2);
          ctx.fill();
          // Brow shelf shading the eyes — sculpture, never cartoon.
          ctx.fillStyle = shade(st.trim, -6);
          for (const exx of [-1, 1] as const) {
            ctx.beginPath();
            ctx.moveTo(exx * rl * 0.08, ey - rl * 0.18);
            ctx.lineTo(exx * rl * 0.52, ey - rl * 0.38);
            ctx.lineTo(exx * rl * 0.52, ey - rl * 0.14);
            ctx.lineTo(exx * rl * 0.12, ey - rl * 0.02);
            ctx.closePath();
            ctx.fill();
          }
          // Eyes, nose wedge, and the mouth seam in near-black — the
          // eyes slant in and down; the device glares, never blinks.
          ctx.fillStyle = '#1c1722';
          for (const exx of [-1, 1] as const) {
            ctx.beginPath();
            ctx.moveTo(exx * rl * 0.12, ey - rl * 0.02);
            ctx.lineTo(exx * rl * 0.5, ey - rl * 0.24);
            ctx.lineTo(exx * rl * 0.5, ey - rl * 0.08);
            ctx.lineTo(exx * rl * 0.16, ey + rl * 0.1);
            ctx.closePath();
            ctx.fill();
          }
          ctx.beginPath();
          ctx.moveTo(-rl * 0.16, ey + rl * 0.16);
          ctx.lineTo(rl * 0.16, ey + rl * 0.16);
          ctx.lineTo(0, ey + rl * 0.38);
          ctx.closePath();
          ctx.fill();
          ctx.fillRect(-rl * 0.026, ey + rl * 0.32, rl * 0.052, rl * 0.24);
        } else {
        ctx.beginPath();
        if (st.emblem === 'chevron') {
          // The breast-band device: drawn WIDE and deep — a timid
          // chevron is a crumb (the kingfisher's whole chest is orange).
          const rc = r * 1.5;
          ctx.moveTo(-rc, ey - rc * 0.45);
          ctx.lineTo(0, ey + rc * 0.62);
          ctx.lineTo(rc, ey - rc * 0.45);
          ctx.lineTo(rc * 0.52, ey - rc * 0.72);
          ctx.lineTo(0, ey - rc * 0.05);
          ctx.lineTo(-rc * 0.52, ey - rc * 0.72);
        } else if (st.emblem === 'diamond') {
          ctx.moveTo(0, ey - r * 0.7);
          ctx.lineTo(r * 0.6, ey);
          ctx.lineTo(0, ey + r * 0.7);
          ctx.lineTo(-r * 0.6, ey);
        } else {
          ctx.moveTo(r * 0.25, ey - r * 0.75);
          ctx.lineTo(-r * 0.3, ey + r * 0.1);
          ctx.lineTo(r * 0.02, ey + r * 0.1);
          ctx.lineTo(-r * 0.25, ey + r * 0.8);
          ctx.lineTo(r * 0.35, ey - r * 0.12);
          ctx.lineTo(r * 0.02, ey - r * 0.12);
        }
        ctx.closePath();
        ctx.fill();
        }
      }
    } else {
      if (st.silhouette === 'cuirass' && !st.tabard) {
        // Backplate: spine ridge + shoulder-blade facets + strap line.
        ctx.fillStyle = shade(st.color, -16);
        ctx.fillRect(-0.014 * s, -th * 0.96, 0.028 * s, th * 0.88);
        ctx.fillStyle = shade(st.color, 8);
        for (const sx of [-1, 1]) {
          ctx.beginPath();
          chamferRect(ctx, sx * tw * 0.52 - tw * 0.26, -th * 0.84, tw * 0.52, th * 0.34, 0.03 * s);
          ctx.fill();
        }
        ctx.fillStyle = shade(metal, -18);
        ctx.fillRect(-tww * 0.9, -th * 0.44, tww * 1.8, 0.016 * s);
      } else if (st.chest === 'straps' || st.silhouette === 'brigandine') {
        // Crossed back straps + buckle — how a jerkin actually closes.
        ctx.strokeStyle = shade(st.trim, -6);
        ctx.lineWidth = Math.max(1.5, s * 0.026);
        ctx.beginPath();
        ctx.moveTo(-tw * 0.7, -th * 0.94);
        ctx.lineTo(tw * 0.55, -0.11 * s);
        ctx.moveTo(tw * 0.7, -th * 0.94);
        ctx.lineTo(-tw * 0.55, -0.11 * s);
        ctx.stroke();
        ctx.fillStyle = metal;
        ctx.fillRect(-0.016 * s, -th * 0.52, 0.032 * s, 0.032 * s);
      } else if (st.silhouette === 'robe') {
        ctx.strokeStyle = shade(st.color, -24);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(0, -th * 0.95);
        ctx.lineTo(0, -0.08 * s);
        ctx.stroke();
      }
    }
    frontPlaneOff();

    // ---- the bandolier: a shoulder-to-hip cord toggled with bone —
    // the trapline worn as clothing. Front and back both carry it; a
    // strap that vanished when you turned would break the garment.
    if (st.bandolier) {
      const bone = hurt ? '#ffffff' : '#d8cfae';
      ctx.strokeStyle = hurt ? '#ffffff' : st.bandolier;
      ctx.lineWidth = Math.max(2.5, s * 0.048);
      ctx.beginPath();
      ctx.moveTo(-tw * 0.74, -th * 0.94);
      ctx.lineTo(ww * 0.56, -0.07 * s);
      ctx.stroke();
      if (!back) {
        // Three bone toggles riding the cord, each a fat crossbar —
        // timid toggles read as lint on the strap.
        ctx.fillStyle = bone;
        for (let i = 0; i < 3; i++) {
          const u = 0.24 + i * 0.26;
          const bxx = -tw * 0.74 + (ww * 0.56 + tw * 0.74) * u;
          const byy = -th * 0.94 + (th * 0.94 - 0.07 * s) * u;
          ctx.save();
          ctx.translate(bxx, byy);
          ctx.rotate(-0.65);
          ctx.fillRect(-0.011 * s, -0.036 * s, 0.022 * s, 0.072 * s);
          ctx.restore();
        }
      }
    }

    // ---- THE COURIER'S SATCHEL: strap over the shoulder, bag on the
    // trailing hip — gear worn crossed, the way distance demands.
    if (st.satchel) {
      const e = -f.lead || 1;
      ctx.strokeStyle = hurt ? '#ffffff' : st.satchel.strap;
      ctx.lineWidth = Math.max(2.5, s * 0.044);
      ctx.beginPath();
      ctx.moveTo(-e * tw * 0.7, -th * 0.96);
      ctx.lineTo(e * ww * 0.62, -0.055 * s);
      ctx.stroke();
      // The bag: flap over body, brass keeper — it LIVES at the hip.
      const bx = e * ww * 0.78;
      ctx.fillStyle = hurt ? '#ffffff' : st.satchel.color;
      ctx.beginPath();
      chamferRect(ctx, bx - 0.048 * s, -0.06 * s, 0.096 * s, 0.098 * s, 0.02 * s);
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = shade(st.satchel.color, -16);
        ctx.beginPath();
        chamferRect(ctx, bx - 0.052 * s, -0.066 * s, 0.104 * s, 0.044 * s, 0.016 * s);
        ctx.fill();
        ctx.fillStyle = '#c9a23c';
        ctx.fillRect(bx - 0.008 * s, -0.032 * s, 0.016 * s, 0.022 * s);
      }
    }

    // ---- THE BEDROLL: the long road carried — a fat wool roll slung
    // diagonal across the back. From the front it admits only the
    // strap and one capped end over the shoulder; turn around and the
    // whole roll is there, strapped twice.
    if (st.bedroll) {
      const rollCol = hurt ? '#ffffff' : st.bedroll.color;
      if (back) {
        ctx.save();
        ctx.rotate(-0.52);
        ctx.fillStyle = rollCol;
        ctx.beginPath();
        chamferRect(ctx, -tw * 1.05, -th * 0.6, tw * 2.1, 0.115 * s, 0.05 * s);
        ctx.fill();
        if (!hurt) {
          // Lit top plane + two cinch straps + shadowed end caps.
          ctx.fillStyle = shade(st.bedroll.color, 12);
          ctx.beginPath();
          chamferRect(ctx, -tw * 1.0, -th * 0.6, tw * 2.0, 0.038 * s, 0.02 * s);
          ctx.fill();
          ctx.fillStyle = shade(st.bedroll.color, -18);
          ctx.fillRect(-tw * 1.05, -th * 0.6, 0.026 * s, 0.115 * s);
          ctx.fillRect(tw * 1.05 - 0.026 * s, -th * 0.6, 0.026 * s, 0.115 * s);
          ctx.strokeStyle = st.bedroll.strap;
          ctx.lineWidth = Math.max(1.5, s * 0.02);
          for (const u of [-0.45, 0.4]) {
            ctx.beginPath();
            ctx.moveTo(u * tw, -th * 0.61);
            ctx.lineTo(u * tw, -th * 0.6 + 0.12 * s);
            ctx.stroke();
          }
        }
        ctx.restore();
      } else {
        ctx.strokeStyle = hurt ? '#ffffff' : st.bedroll.strap;
        ctx.lineWidth = Math.max(2.5, s * 0.042);
        ctx.beginPath();
        ctx.moveTo(f.lead * tw * 0.72, -th * 0.98);
        ctx.lineTo(-f.lead * ww * 0.56, -0.06 * s);
        ctx.stroke();
        if (!hurt) {
          // The roll's end peeking over the lead shoulder: cap ring
          // and a sliver of wool — the read that says CARRIED.
          const px2 = f.lead * tw * 0.88;
          const py2 = -th * 1.06;
          ctx.fillStyle = rollCol;
          ctx.beginPath();
          ctx.ellipse(px2, py2, 0.052 * s, 0.036 * s, f.lead * 0.35, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = shade(st.bedroll.color, -18);
          ctx.beginPath();
          ctx.ellipse(px2 + f.lead * 0.014 * s, py2, 0.034 * s, 0.024 * s, f.lead * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // ---- THE CLAW STRAP: the pack's tithe — four wolf claws hung
    // points-down off a chest cord, each seated in a dark root bead.
    if (st.clawstrap) {
      ctx.strokeStyle = hurt ? '#ffffff' : st.clawstrap.strap;
      ctx.lineWidth = Math.max(2, s * 0.034);
      ctx.beginPath();
      ctx.moveTo(-tw * 0.7, -th * 0.9);
      ctx.lineTo(ww * 0.58, -0.09 * s);
      ctx.stroke();
      if (!back && !hurt) {
        for (let i = 0; i < 4; i++) {
          const u = 0.2 + i * 0.2;
          const bxx = -tw * 0.7 + (ww * 0.58 + tw * 0.7) * u;
          const byy = -th * 0.9 + (th * 0.9 - 0.09 * s) * u;
          ctx.fillStyle = shade(st.clawstrap.strap, -18);
          ctx.beginPath();
          ctx.arc(bxx, byy, 0.014 * s, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = st.clawstrap.claw;
          ctx.beginPath();
          ctx.moveTo(bxx - 0.013 * s, byy + 0.008 * s);
          ctx.lineTo(bxx + 0.013 * s, byy + 0.008 * s);
          ctx.quadraticCurveTo(bxx + 0.01 * s, byy + 0.05 * s, bxx - 0.006 * s, byy + 0.062 * s);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // ---- THE HOOKLINE: the fisher's tackle worn as regalia — a
    // slack line slung shoulder to hip, three barbed hooks riding
    // it, one feathered lure at the low point. The lure winks WARM
    // and RARELY: bait, not jewelry.
    if (st.hookline) {
      const hk = st.hookline;
      ctx.strokeStyle = hurt ? '#ffffff' : hk.line;
      ctx.lineWidth = Math.max(1, s * 0.014);
      // The line sags — a taut line is a bandolier; a fisher's line
      // rests slack between jobs.
      ctx.beginPath();
      ctx.moveTo(-tw * 0.7, -th * 0.96);
      ctx.quadraticCurveTo(0.02 * s, -th * 0.46, ww * 0.58, -th * 0.2);
      ctx.stroke();
      if (!back && !hurt) {
        // Two barbed hooks (a crowd of hardware at the waist reads
        // as teeth): J-curves hung to gravity, muted a step — the
        // LURE keeps the bright note.
        for (const u of [0.3, 0.66]) {
          const bxx = -tw * 0.7 + (ww * 0.58 + tw * 0.7) * u;
          const t2 = 1 - u;
          const byy = -th * 0.96 * t2 * t2 + 2 * t2 * u * (-th * 0.46) + u * u * (-th * 0.2);
          ctx.strokeStyle = shade(hk.hook, -18);
          ctx.lineWidth = Math.max(1, s * 0.011);
          ctx.beginPath();
          ctx.moveTo(bxx, byy);
          ctx.lineTo(bxx, byy + 0.026 * s);
          ctx.arc(bxx - 0.01 * s, byy + 0.026 * s, 0.01 * s, 0, Math.PI * 0.85);
          ctx.stroke();
        }
        // THE LURE at the sag's low point: a feathered teardrop with
        // its warm wink on the rare clock.
        const lx = 0.01 * s;
        const ly = -th * 0.5;
        const wake = nowMs % 2900 < 320;
        ctx.fillStyle = wake ? shade(hk.lure, 30) : hk.lure;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.quadraticCurveTo(lx + 0.016 * s, ly + 0.02 * s, lx, ly + 0.052 * s);
        ctx.quadraticCurveTo(lx - 0.016 * s, ly + 0.02 * s, lx, ly);
        ctx.closePath();
        ctx.fill();
        if (wake) {
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.arc(lx, ly + 0.026 * s, 0.024 * s, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.strokeStyle = shade(hk.lure, -24);
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.beginPath();
        ctx.moveTo(lx, ly + 0.014 * s);
        ctx.lineTo(lx, ly + 0.044 * s);
        ctx.stroke();
      }
    }

    // ---- THE COIN TETHER: the guild's ledger worn openly — lifted
    // coins strung shoulder to hip, and one glint that WALKS the
    // strand coin to coin, wave after wave (the pearlstrand law).
    if (st.cointether) {
      ctx.strokeStyle = hurt ? '#ffffff' : st.cointether.cord;
      ctx.lineWidth = Math.max(1.5, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(-tw * 0.68, -th * 0.92);
      ctx.lineTo(ww * 0.56, -0.08 * s);
      ctx.stroke();
      if (!back && !hurt) {
        const walk = Math.floor(nowMs / 700) % 5;
        for (let i = 0; i < 5; i++) {
          const u = 0.14 + i * 0.18;
          const bxx = -tw * 0.68 + (ww * 0.56 + tw * 0.68) * u;
          const byy = -th * 0.92 + (th * 0.92 - 0.08 * s) * u;
          const lit = i === walk;
          ctx.fillStyle = lit && st.cointether.glint ? st.cointether.glint : st.cointether.coin;
          ctx.beginPath();
          ctx.arc(bxx, byy + 0.014 * s, (lit ? 0.021 : 0.018) * s, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = shade(st.cointether.coin, -22);
          ctx.beginPath();
          ctx.arc(bxx, byy + 0.014 * s, 0.007 * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // ---- THE CUT KIT: the trade worn at the trailing hip — a lifted
    // purse, drawstring cinched, its slit showing a coin on the rare
    // clock; the curved snip that made the slit hangs beside it. The
    // set's own name, carried as gear.
    if (st.cutkit && !back) {
      const ck = st.cutkit;
      const pxx = -f.lead * ww * 0.66;
      ctx.strokeStyle = hurt ? '#ffffff' : shade(ck.pouch, -20);
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(pxx, -0.055 * s);
      ctx.lineTo(pxx, -0.024 * s);
      ctx.stroke();
      ctx.fillStyle = hurt ? '#ffffff' : ck.pouch;
      ctx.beginPath();
      ctx.moveTo(pxx - 0.008 * s, -0.026 * s);
      ctx.quadraticCurveTo(pxx - 0.036 * s, 0.006 * s, pxx - 0.024 * s, 0.046 * s);
      ctx.quadraticCurveTo(pxx, 0.068 * s, pxx + 0.024 * s, 0.044 * s);
      ctx.quadraticCurveTo(pxx + 0.034 * s, 0.004 * s, pxx + 0.008 * s, -0.026 * s);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        // The cinch at the neck, cords ticking out.
        ctx.strokeStyle = shade(ck.pouch, -26);
        ctx.lineWidth = Math.max(1, s * 0.009);
        ctx.beginPath();
        ctx.moveTo(pxx - 0.014 * s, -0.014 * s);
        ctx.lineTo(pxx + 0.014 * s, -0.014 * s);
        ctx.moveTo(pxx + 0.012 * s, -0.014 * s);
        ctx.lineTo(pxx + 0.02 * s, -0.002 * s);
        ctx.stroke();
        // THE SLIT: one clean cut across the belly.
        ctx.strokeStyle = shade(ck.pouch, -38);
        ctx.lineWidth = Math.max(1, s * 0.009);
        ctx.beginPath();
        ctx.moveTo(pxx - 0.016 * s, 0.024 * s);
        ctx.lineTo(pxx + 0.013 * s, 0.018 * s);
        ctx.stroke();
        // The coin AT the slit, only on the rare clock — the purse
        // admits what it is for one blink at a time.
        if (nowMs % 3800 < 300) {
          ctx.fillStyle = ck.glint ?? shade(ck.coin, 26);
          ctx.beginPath();
          ctx.arc(pxx - 0.002 * s, 0.021 * s, 0.011 * s, Math.PI, Math.PI * 2);
          ctx.fill();
        }
        // THE SNIP: a crescent blade point-down off its own loop,
        // handle bead at the top. Muted — the tool, not the show.
        const sx2 = pxx + f.lead * 0.052 * s;
        ctx.fillStyle = shade(ck.pouch, -18);
        ctx.beginPath();
        ctx.arc(sx2, -0.028 * s, 0.008 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = shade(ck.blade, -10);
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        ctx.arc(sx2 - 0.012 * s, 0.0 * s, 0.026 * s, Math.PI * 1.7, Math.PI * 0.62);
        ctx.stroke();
      }
    }

    // ---- THE KEY RING: the housebreaker's borrowed doors — three
    // skeleton keys off one iron ring at the leading hip, staggered
    // hangs, and a glint that is RARE and uneven (a key that flashes
    // on a metronome is jewelry).
    if (st.keyring && !back) {
      const kr = st.keyring;
      const bx = f.lead * ww * 0.6;
      ctx.strokeStyle = hurt ? '#ffffff' : kr.ring;
      ctx.lineWidth = Math.max(1, s * 0.009);
      ctx.beginPath();
      ctx.arc(bx, -0.032 * s, 0.015 * s, 0, Math.PI * 2);
      ctx.stroke();
      if (!hurt) {
        const wake = nowMs % 3100 < 260 ? Math.floor(nowMs / 3100) % 3 : -1;
        const kick = f.strideSw * 0.01 * s;
        const keys: Array<[number, number, number]> = [
          [-0.015, 0.052, -0.16], [0.001, 0.066, 0.03], [0.016, 0.046, 0.18],
        ];
        for (let i = 0; i < 3; i++) {
          const [dx, len, tilt] = keys[i]!;
          ctx.save();
          ctx.translate(bx + dx * s, -0.02 * s);
          ctx.rotate(tilt + kick / (0.2 * s));
          ctx.strokeStyle = i === wake ? (kr.glint ?? shade(kr.keys, 30)) : kr.keys;
          ctx.lineWidth = Math.max(1, s * 0.009);
          ctx.beginPath();
          ctx.arc(0, 0.006 * s, 0.007 * s, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, 0.013 * s);
          ctx.lineTo(0, len * s);
          ctx.moveTo(0, len * s);
          ctx.lineTo(0.008 * s, len * s);
          ctx.moveTo(0, (len - 0.012) * s);
          ctx.lineTo(0.006 * s, (len - 0.012) * s);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // ---- THE SMOKE FLASKS: two bulbs of bottled dark on the belt —
    // and one of them leaks, a thin wisp climbing and dying on a slow
    // cycle. The exit, worn ready.
    if (st.smokeflasks && !back) {
      const sf = st.smokeflasks;
      const bulbs: Array<[number, number, number]> = [
        [f.lead * ww * 0.36, 0.004, 0.023], [f.lead * ww * 0.13, 0.012, 0.019],
      ];
      for (const [bx, by, r] of bulbs) {
        ctx.fillStyle = hurt ? '#ffffff' : sf.glass;
        ctx.beginPath();
        ctx.arc(bx, by * s, r * s, 0, Math.PI * 2);
        ctx.fill();
        if (!hurt) {
          // Cork stub and one glass catch-light — a sphere, not a dot.
          ctx.fillStyle = sf.cork;
          ctx.fillRect(bx - 0.006 * s, by * s - r * s - 0.012 * s, 0.012 * s, 0.013 * s);
          ctx.strokeStyle = shade(sf.glass, 46);
          ctx.lineWidth = Math.max(1, s * 0.007);
          ctx.beginPath();
          ctx.arc(bx, by * s, r * s * 0.62, Math.PI * 1.15, Math.PI * 1.6);
          ctx.stroke();
        }
      }
      if (!hurt) {
        // THE LEAK: off the smaller bulb, one wisp per cycle.
        const cyc = (nowMs % 3600) / 3600;
        if (cyc < 0.55) {
          const u = cyc / 0.55;
          const [wx, wy] = bulbs[1]!;
          const wTop = wy * s - 0.03 * s;
          ctx.strokeStyle = sf.wisp;
          ctx.globalAlpha = 0.26 * (1 - u);
          ctx.lineWidth = Math.max(1, s * 0.008);
          ctx.beginPath();
          ctx.moveTo(wx, wTop);
          ctx.quadraticCurveTo(
            wx + Math.sin(u * 5) * 0.012 * s, wTop - u * 0.04 * s,
            wx + Math.sin(u * 5 + 1.2) * 0.014 * s, wTop - u * 0.07 * s,
          );
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }

    // ---- THE BLOOD SHROUD: the Knife arrives dressed for the
    // eulogy. Three tiers of night cloth drape off the TRAILING
    // shoulder and sweep steeply toward the leading hip — a drape,
    // never a stripe: the diagonal IS the garment. Every tier is
    // cut to hanging points, and every cut edge shows the crimson
    // lining. The back read is a layered half-cape lifted a value
    // step off the jerkin (a dark panel on a dark ground is
    // invisible — only its lap edges and its one cut would float,
    // the twice-learned lesson). Painted BEFORE the harness — the
    // cords pin the cloth, so the cloth must already be there.
    if (st.bloodshroud) {
      const bs = st.bloodshroud;
      const ld2 = f.lead;
      if (!back) {
        for (let k = 0; k < 3; k++) {
          const xin = -ld2 * ww * (0.66 - 0.02 * k);
          const yin = -th * (0.94 - 0.26 * k);
          const xout = ld2 * ww * (0.04 + 0.1 * k);
          const yout = yin + th * 0.34;
          const dep = th * 0.22;
          const kick = f.strideSw * 0.008 * s * (k === 2 ? 1 : 0.4);
          ctx.fillStyle = hurt ? '#ffffff' : shade(bs.cloth, 6 - 8 * k);
          ctx.beginPath();
          ctx.moveTo(xin, yin);
          ctx.lineTo(xout, yout);
          // The hem: three hanging points per tier, tall enough to
          // carry cloth weight (short zigzags read as diamond trim).
          // The root-end tooth stays SHORT: a long tatter at the
          // shoulder seam hangs over the deltoid and reads as
          // scraggle off the pauldron, not drape off the torso.
          for (const [u, dv] of [[0.84, 1.0], [0.52, 0.7], [0.18, 0.5]] as const) {
            const hx = xin + (xout - xin) * (u + 0.08);
            const hy = yin + (yout - yin) * (u + 0.08) + dep;
            const tx2 = xin + (xout - xin) * u + kick * u;
            const ty2 = yin + (yout - yin) * u + dep + th * 0.15 * dv;
            ctx.lineTo(hx, hy);
            ctx.lineTo(tx2, ty2);
          }
          ctx.lineTo(xin, yin + dep + th * 0.08);
          ctx.closePath();
          ctx.fill();
          if (!hurt) {
            // The lap line along the tier's top edge — light over
            // dark is what makes a layer read.
            ctx.strokeStyle = shade(bs.cloth, 10 - 4 * k);
            ctx.lineWidth = Math.max(1, s * 0.008);
            ctx.beginPath();
            ctx.moveTo(xin, yin);
            ctx.lineTo(xout, yout);
            ctx.stroke();
            // THE BLEED: crimson lining standing at the cut, raked
            // with the hem — short and partial on purpose.
            ctx.strokeStyle = bs.lining;
            ctx.lineWidth = Math.max(1, s * 0.008);
            const u0 = 0.66;
            ctx.beginPath();
            ctx.moveTo(xin + (xout - xin) * (u0 + 0.1), yin + (yout - yin) * (u0 + 0.1) + dep * 0.9);
            ctx.lineTo(xin + (xout - xin) * u0, yin + (yout - yin) * u0 + dep + th * 0.05);
            ctx.stroke();
            // The one arterial tick rides the lowest tier's leading
            // tooth — the brightest red the cloth ever admits.
            if (k === 2) {
              ctx.strokeStyle = bs.edge;
              ctx.beginPath();
              ctx.moveTo(xin + (xout - xin) * 0.9, yin + (yout - yin) * 0.9 + dep * 0.94);
              ctx.lineTo(xin + (xout - xin) * 0.84 + kick * 0.84, yin + (yout - yin) * 0.84 + dep + th * 0.13);
              ctx.stroke();
            }
          }
        }
      } else {
        // THE HALF-CAPE: two layered panels down the trailing half
        // of the back, long points drifting on the slow clock, one
        // raked cut bleeding lining mid-panel. The outer panel
        // stands a value step ABOVE the jerkin's back — the cape
        // reads as cloth first, cuts second.
        const drift = Math.sin(nowMs * 0.0009) * 0.012 * s;
        ctx.fillStyle = hurt ? '#ffffff' : shade(bs.cloth, -10);
        ctx.beginPath();
        ctx.moveTo(-ld2 * ww * 0.72, -th * 0.96);
        ctx.lineTo(ld2 * ww * 0.16, -th * 0.88);
        ctx.lineTo(ld2 * ww * 0.1 + drift * 0.4, -0.04 * s);
        ctx.lineTo(-ld2 * ww * 0.12, -0.085 * s);
        ctx.lineTo(-ld2 * ww * 0.48 + drift, 0.015 * s);
        ctx.lineTo(-ld2 * ww * 0.74, -0.055 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = hurt ? '#ffffff' : shade(bs.cloth, 6);
        ctx.beginPath();
        ctx.moveTo(-ld2 * ww * 0.72, -th * 0.96);
        ctx.lineTo(ld2 * ww * 0.04, -th * 0.9);
        ctx.lineTo(-ld2 * ww * 0.04 + drift * 0.6, -0.088 * s);
        ctx.lineTo(-ld2 * ww * 0.34 + drift, -0.015 * s);
        ctx.lineTo(-ld2 * ww * 0.7, -0.095 * s);
        ctx.closePath();
        ctx.fill();
        if (!hurt) {
          // The lap along the outer panel's leading edge.
          ctx.strokeStyle = shade(bs.cloth, 18);
          ctx.lineWidth = Math.max(1, s * 0.009);
          ctx.beginPath();
          ctx.moveTo(ld2 * ww * 0.04, -th * 0.9);
          ctx.lineTo(-ld2 * ww * 0.04 + drift * 0.6, -0.088 * s);
          ctx.stroke();
          // THE CUT, carried to the back — groove then lining, ONE
          // wound on this read (the hood's nape cut keeps it
          // company; nothing else bleeds back here).
          ctx.strokeStyle = shade(bs.cloth, -26);
          ctx.lineWidth = Math.max(1.5, s * 0.012);
          ctx.beginPath();
          ctx.moveTo(-ld2 * ww * 0.18, -th * 0.6);
          ctx.lineTo(-ld2 * ww * 0.5, -th * 0.3);
          ctx.stroke();
          ctx.strokeStyle = bs.lining;
          ctx.lineWidth = Math.max(1, s * 0.008);
          ctx.beginPath();
          ctx.moveTo(-ld2 * ww * 0.22, -th * 0.56);
          ctx.lineTo(-ld2 * ww * 0.46, -th * 0.34);
          ctx.stroke();
        }
      }
    }

    // ---- THE TALLY CORD: a crimson cord riding above the belt, one
    // knot per job that ended the only way the Knife's jobs end. The
    // tail hangs at the leading hip, frayed, kicking on the stride.
    if (st.tallycord && !back) {
      const tc = st.tallycord;
      ctx.strokeStyle = hurt ? '#ffffff' : tc.cord;
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(-ww * 0.6, -0.078 * s);
      ctx.quadraticCurveTo(0, -0.062 * s, ww * 0.6, -0.078 * s);
      ctx.stroke();
      if (!hurt) {
        // Knots at uneven stations — a count, not a pattern.
        ctx.fillStyle = tc.knot;
        for (const u of [0.14, 0.33, 0.62, 0.85]) {
          const kx = -ww * 0.6 + ww * 1.2 * u;
          const ky = -0.078 * s + (0.016 * s) * (4 * u * (1 - u));
          ctx.beginPath();
          ctx.arc(kx, ky, 0.0085 * s, 0, Math.PI * 2);
          ctx.fill();
        }
        // The tail.
        const kick = f.strideSw * 0.012 * s;
        ctx.strokeStyle = tc.cord;
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        ctx.moveTo(f.lead * ww * 0.58, -0.076 * s);
        ctx.quadraticCurveTo(f.lead * ww * 0.62 + kick * 0.5, -0.03 * s, f.lead * ww * 0.6 + kick, 0.012 * s);
        ctx.stroke();
        ctx.lineWidth = Math.max(1, s * 0.007);
        ctx.beginPath();
        ctx.moveTo(f.lead * ww * 0.6 + kick, 0.012 * s);
        ctx.lineTo(f.lead * ww * 0.585 + kick, 0.03 * s);
        ctx.moveTo(f.lead * ww * 0.6 + kick, 0.012 * s);
        ctx.lineTo(f.lead * ww * 0.62 + kick, 0.028 * s);
        ctx.stroke();
      }
    }

    // ---- THE WRIT: the contract at the trailing hip — a slim
    // black case, a blood-wax seal, two cut ribbon ends. MATTE on
    // purpose: paper kills quieter than steel shines, and the one
    // rare-glint budget on this body already belongs to the fan.
    if (st.writkit && !back) {
      const wk = st.writkit;
      const wxx = -f.lead * ww * 0.6;
      ctx.save();
      ctx.translate(wxx, 0.016 * s);
      ctx.rotate(-f.lead * 0.42);
      ctx.fillStyle = hurt ? '#ffffff' : wk.case;
      ctx.beginPath();
      ctx.moveTo(-0.012 * s, -0.052 * s);
      ctx.lineTo(0.012 * s, -0.052 * s);
      ctx.lineTo(0.012 * s, 0.05 * s);
      ctx.lineTo(-0.012 * s, 0.05 * s);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        // End caps in blackened steel — bands, not shine.
        ctx.fillStyle = shade(wk.case, 22);
        ctx.fillRect(-0.012 * s, -0.052 * s, 0.024 * s, 0.011 * s);
        ctx.fillRect(-0.012 * s, 0.04 * s, 0.024 * s, 0.01 * s);
        // THE SEAL: blood-dark wax, a darker stamp sunk in it.
        ctx.fillStyle = wk.seal;
        ctx.beginPath();
        ctx.arc(0, -0.006 * s, 0.014 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(wk.seal, -18);
        ctx.beginPath();
        ctx.arc(0, -0.006 * s, 0.007 * s, 0, Math.PI * 2);
        ctx.fill();
        // The ribbon ends, cut short — nothing on this body waves
        // for attention.
        ctx.strokeStyle = wk.ribbon;
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.beginPath();
        ctx.moveTo(-0.004 * s, 0.006 * s);
        ctx.lineTo(-0.011 * s, 0.032 * s);
        ctx.moveTo(0.005 * s, 0.006 * s);
        ctx.lineTo(0.01 * s, 0.03 * s);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ---- THE PRY BAR: slung flat across the housebreaker's back —
    // a back read and nothing else; from the front the Latch is
    // just a quiet grey nobody. The crook shows over one shoulder.
    if (st.prybar && back) {
      const pb = st.prybar;
      ctx.strokeStyle = hurt ? '#ffffff' : pb.color;
      ctx.lineWidth = Math.max(2, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(-tw * 0.66, -th * 0.88);
      ctx.lineTo(ww * 0.6, -0.06 * s);
      ctx.stroke();
      if (!hurt) {
        // The crooked claw end past the shoulder line, and the lit
        // arris along the bar — iron takes light on the edge.
        ctx.strokeStyle = shade(pb.color, 22);
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.beginPath();
        ctx.moveTo(-tw * 0.6, -th * 0.86);
        ctx.lineTo(ww * 0.54, -0.065 * s);
        ctx.stroke();
        ctx.strokeStyle = pb.color;
        ctx.lineWidth = Math.max(2, s * 0.018);
        ctx.beginPath();
        ctx.moveTo(-tw * 0.66, -th * 0.88);
        ctx.quadraticCurveTo(-tw * 0.78, -th * 0.98, -tw * 0.62, -th * 1.04);
        ctx.stroke();
        // The strap that holds it: two ticks across the bar.
        ctx.strokeStyle = shade(pb.color, -26);
        ctx.lineWidth = Math.max(1, s * 0.01);
        for (const u of [0.3, 0.7]) {
          const bx2 = -tw * 0.66 + (ww * 0.6 + tw * 0.66) * u;
          const by2 = -th * 0.88 + (th * 0.88 - 0.06 * s) * u;
          ctx.beginPath();
          ctx.moveTo(bx2 - 0.012 * s, by2 - 0.012 * s);
          ctx.lineTo(bx2 + 0.012 * s, by2 + 0.012 * s);
          ctx.stroke();
        }
      }
    }

    // ---- THE NIGHT SASH: the veil's band language crossing the
    // chest — a wound sash with hard stepped edges and ONE silver
    // thread stitched along it. The Unseen wears no coins; the
    // Unseen wears the night, folded.
    if (st.nightsash && !back) {
      const ns = st.nightsash;
      ctx.strokeStyle = hurt ? '#ffffff' : ns.color;
      ctx.lineWidth = Math.max(3, s * 0.052);
      ctx.beginPath();
      ctx.moveTo(-tw * 0.7, -th * 0.9);
      ctx.lineTo(ww * 0.58, -0.06 * s);
      ctx.stroke();
      if (!hurt) {
        // The wrap steps: two cross-ticks where the band folds over
        // itself — the head's grammar, carried down.
        ctx.strokeStyle = shade(ns.color, -22);
        ctx.lineWidth = Math.max(1, s * 0.012);
        for (const u of [0.34, 0.62]) {
          const bx2 = -tw * 0.7 + (ww * 0.58 + tw * 0.7) * u;
          const by2 = -th * 0.9 + (th * 0.9 - 0.06 * s) * u;
          ctx.beginPath();
          ctx.moveTo(bx2 - 0.02 * s, by2 + 0.016 * s);
          ctx.lineTo(bx2 + 0.018 * s, by2 - 0.018 * s);
          ctx.stroke();
        }
        // ONE thread of silver along the lower edge — the quiet
        // bright the night is allowed.
        ctx.strokeStyle = ns.thread;
        ctx.lineWidth = Math.max(1, s * 0.006);
        ctx.beginPath();
        ctx.moveTo(-tw * 0.68, -th * 0.86);
        ctx.lineTo(ww * 0.58, -0.038 * s);
        ctx.stroke();
      }
    }

    // ---- THE RED HARNESS: crossed crimson cords over the chest,
    // knotted at the heart. The Knife's binding IS the mark — no
    // coins, no shine, just the two lines everyone learns to read.
    if (st.redharness && !back) {
      const rh = st.redharness;
      ctx.strokeStyle = hurt ? '#ffffff' : rh.cord;
      ctx.lineWidth = Math.max(1.5, s * 0.016);
      ctx.beginPath();
      ctx.moveTo(-tw * 0.68, -th * 0.9);
      ctx.lineTo(ww * 0.56, -0.07 * s);
      ctx.moveTo(tw * 0.68, -th * 0.9);
      ctx.lineTo(-ww * 0.56, -0.07 * s);
      ctx.stroke();
      if (!hurt) {
        // The heart knot where the cords cross, and two short cut
        // ends hanging — a binding tied by somebody who ties knots
        // for a living.
        const kx2 = (tw * 0.68 - ww * 0.56) * -0.04;
        const ky2 = -th * 0.48;
        ctx.fillStyle = rh.knot;
        ctx.beginPath();
        ctx.arc(kx2, ky2, 0.014 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = shade(rh.cord, -14);
        ctx.lineWidth = Math.max(1, s * 0.009);
        ctx.beginPath();
        ctx.moveTo(kx2, ky2 + 0.01 * s);
        ctx.lineTo(kx2 - 0.014 * s, ky2 + 0.042 * s);
        ctx.moveTo(kx2, ky2 + 0.01 * s);
        ctx.lineTo(kx2 + 0.012 * s, ky2 + 0.038 * s);
        ctx.stroke();
      }
    }

    // ---- THE KNIFE BALDRIC: three sheathed throwing blades on a
    // diagonal strap. The glint is RARE and uneven — a blade that
    // flashes on a metronome is jewelry, not a threat.
    if (st.knifebaldric) {
      ctx.strokeStyle = hurt ? '#ffffff' : st.knifebaldric.strap;
      ctx.lineWidth = Math.max(2, s * 0.036);
      ctx.beginPath();
      ctx.moveTo(-tw * 0.72, -th * 0.92);
      ctx.lineTo(ww * 0.58, -0.07 * s);
      ctx.stroke();
      if (!back && !hurt) {
        const wake = nowMs % 2600 < 300 ? Math.floor(nowMs / 2600) % 3 : -1;
        for (let i = 0; i < 3; i++) {
          const u = 0.24 + i * 0.24;
          const bxx = -tw * 0.72 + (ww * 0.58 + tw * 0.72) * u;
          const byy = -th * 0.92 + (th * 0.92 - 0.07 * s) * u;
          ctx.save();
          ctx.translate(bxx, byy);
          ctx.rotate(-0.62);
          ctx.fillStyle = shade(st.knifebaldric.strap, 10);
          ctx.fillRect(-0.012 * s, -0.03 * s, 0.024 * s, 0.06 * s);
          ctx.fillStyle = i === wake && st.knifebaldric.glint ? st.knifebaldric.glint : st.knifebaldric.steel;
          ctx.beginPath();
          ctx.moveTo(-0.008 * s, 0.03 * s);
          ctx.lineTo(0.008 * s, 0.03 * s);
          ctx.lineTo(0, 0.058 * s);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
    }

    // ---- THE SNARELINE: the trapper's bandolier grown honest —
    // bone toggles, a coiled snare wire, and a lure that swings on
    // the stride. Every loop has caught something.
    if (st.snareline) {
      const sl = st.snareline;
      ctx.strokeStyle = hurt ? '#ffffff' : sl.strap;
      ctx.lineWidth = Math.max(2.5, s * 0.048);
      ctx.beginPath();
      ctx.moveTo(-tw * 0.74, -th * 0.94);
      ctx.lineTo(ww * 0.56, -0.07 * s);
      ctx.stroke();
      if (!back && !hurt) {
        // Two bone toggles high on the strap.
        ctx.fillStyle = sl.bone;
        for (let i = 0; i < 2; i++) {
          const u = 0.18 + i * 0.2;
          const bxx = -tw * 0.74 + (ww * 0.56 + tw * 0.74) * u;
          const byy = -th * 0.94 + (th * 0.94 - 0.07 * s) * u;
          ctx.save();
          ctx.translate(bxx, byy);
          ctx.rotate(-0.65);
          ctx.fillRect(-0.011 * s, -0.036 * s, 0.022 * s, 0.072 * s);
          ctx.restore();
        }
        // The wire coil at the strap's waist: three concentric turns.
        const cu = 0.62;
        const cxx = -tw * 0.74 + (ww * 0.56 + tw * 0.74) * cu;
        const cyy = -th * 0.94 + (th * 0.94 - 0.07 * s) * cu;
        ctx.strokeStyle = sl.wire;
        ctx.lineWidth = Math.max(1, s * 0.011);
        for (const r of [0.016, 0.024, 0.032]) {
          ctx.beginPath();
          ctx.arc(cxx, cyy + 0.012 * s, r * s, 0, Math.PI * 2);
          ctx.stroke();
        }
        // The lure: a fur tag hanging low, kicked by the stride.
        const lu = 0.86;
        const lx = -tw * 0.74 + (ww * 0.56 + tw * 0.74) * lu;
        const ly = -th * 0.94 + (th * 0.94 - 0.07 * s) * lu;
        const kick = f.strideSw * 0.018 * s + Math.sin(nowMs * 0.0032) * 0.006 * s * (0.3 + 0.7 * runF);
        ctx.strokeStyle = shade(sl.strap, -14);
        ctx.lineWidth = Math.max(1, s * 0.011);
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + kick, ly + 0.05 * s);
        ctx.stroke();
        ctx.fillStyle = sl.bone;
        ctx.beginPath();
        ctx.moveTo(lx + kick - 0.011 * s, ly + 0.05 * s);
        ctx.lineTo(lx + kick + 0.011 * s, ly + 0.05 * s);
        ctx.lineTo(lx + kick + 0.004 * s, ly + 0.092 * s);
        ctx.lineTo(lx + kick - 0.006 * s, ly + 0.088 * s);
        ctx.closePath();
        ctx.fill();
      }
    }

    // ---- the brush tail: a fox trophy swinging off the trailing hip,
    // kicked by the stride like the fringe — the pelt still has an
    // opinion about being worn.
    if (st.tail) {
      const u = -f.lead;
      const bx = u * ww * 0.82;
      const kick =
        f.strideSw * 0.022 * s +
        Math.sin(nowMs * 0.0035) * 0.009 * s * (0.3 + 0.7 * runF) +
        f.dragX * 0.5 * s;
      const tipX = bx + u * 0.055 * s + kick;
      const tipY = 0.27 * s;
      ctx.fillStyle = hurt ? '#ffffff' : st.tail.color;
      ctx.beginPath();
      ctx.moveTo(bx - 0.02 * s, -0.03 * s);
      // Fat through the middle, tapering to the tip — a brush, not a rope.
      ctx.quadraticCurveTo(bx - 0.055 * s + kick * 0.5, 0.16 * s, tipX - 0.012 * s, tipY);
      ctx.lineTo(tipX + 0.012 * s, tipY);
      ctx.quadraticCurveTo(bx + 0.055 * s + kick * 0.5, 0.16 * s, bx + 0.02 * s, -0.03 * s);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        // The pale tip: the last third dips in cream.
        ctx.fillStyle = st.tail.tip;
        ctx.beginPath();
        ctx.moveTo(bx - 0.045 * s + kick * 0.72, 0.165 * s);
        ctx.quadraticCurveTo(bx - 0.04 * s + kick * 0.86, 0.225 * s, tipX - 0.012 * s, tipY);
        ctx.lineTo(tipX + 0.012 * s, tipY);
        ctx.quadraticCurveTo(bx + 0.045 * s + kick * 0.86, 0.215 * s, bx + 0.045 * s + kick * 0.72, 0.155 * s);
        ctx.closePath();
        ctx.fill();
        // THE EMBER TIP: the showpiece's living word — the brush
        // smolders at its point and sheds slow motes that rise and
        // die. Vanity, weaponized, on fire.
        if (st.tail.ember) {
          const pulse = 0.55 + 0.45 * Math.sin(nowMs * 0.0019);
          ctx.globalAlpha = 0.4 * pulse;
          ctx.fillStyle = st.tail.ember;
          ctx.beginPath();
          ctx.ellipse(tipX, tipY - 0.02 * s, 0.03 * s, 0.045 * s, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = shade(st.tail.ember, 24);
          ctx.beginPath();
          ctx.arc(tipX, tipY - 0.012 * s, 0.011 * s, 0, Math.PI * 2);
          ctx.fill();
          for (let i = 0; i < 3; i++) {
            const p = (nowMs * 0.00045 + i * 0.333) % 1;
            const mx = tipX + Math.sin(p * 6.28 + i * 2.1) * 0.018 * s;
            const my = tipY - 0.03 * s - p * 0.13 * s;
            ctx.globalAlpha = (1 - p) * 0.7;
            ctx.fillStyle = i === 1 ? shade(st.tail.ember, 30) : st.tail.ember;
            ctx.beginPath();
            ctx.arc(mx, my, (0.009 - 0.004 * p) * s, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      }
    }

    // ---- THE STREAMERS: two waybill ribbons off the belt knot,
    // streaming and kicking with the stride — the courier's speed
    // visible even at a standstill's first step.
    if (st.streamers && !hurt) {
      const rc = st.streamers.color;
      const knotX = -(f.lead || 1) * ww * 0.74;
      for (const [ui, ph, len] of [[0, 0, 0.19], [1, 1.9, 0.15]] as const) {
        const bx = knotX - (f.lead || 1) * ui * ww * 0.16;
        const kick =
          f.strideSw * 0.03 * s * (1 + 0.25 * ui) +
          Math.sin(nowMs * 0.0042 + ph) * 0.012 * s * (0.35 + 0.65 * runF) +
          f.dragX * 0.6 * s;
        const midX = bx + kick * 0.5;
        const endX = bx + kick;
        const endY = len * s;
        // A ribbon is a tapered plane, not a line: root width down
        // to a swallow-cut end.
        ctx.fillStyle = rc;
        ctx.beginPath();
        ctx.moveTo(bx - 0.016 * s, -0.045 * s);
        ctx.quadraticCurveTo(midX - 0.014 * s, endY * 0.5, endX - 0.013 * s, endY);
        ctx.lineTo(endX - 0.002 * s, endY - 0.024 * s);
        ctx.lineTo(endX + 0.009 * s, endY - 0.004 * s);
        ctx.quadraticCurveTo(midX + 0.012 * s, endY * 0.45, bx + 0.016 * s, -0.045 * s);
        ctx.closePath();
        ctx.fill();
      }
    }

    // ---- the belt pouch: gear you LIVE out of, riding the lead hip.
    if (st.pouch && !back) {
      const pxx = f.lead * ww * 0.72;
      ctx.fillStyle = shade(st.trim, 10);
      ctx.beginPath();
      chamferRect(ctx, pxx - 0.038 * s, -0.055 * s, 0.076 * s, 0.075 * s, 0.018 * s);
      ctx.fill();
      ctx.fillStyle = shade(st.trim, -14);
      ctx.beginPath();
      chamferRect(ctx, pxx - 0.042 * s, -0.06 * s, 0.084 * s, 0.032 * s, 0.014 * s);
      ctx.fill();
    }

    // ---- THE LUCK CHARM: a hare's foot on a belt cord, swinging on
    // the stride — luck worn where everyone can see it working.
    if (st.luckcharm && !back && !hurt) {
      const lc = st.luckcharm;
      const bx = f.lead * ww * 0.5;
      const kick = f.strideSw * 0.024 * s + Math.sin(nowMs * 0.003) * 0.007 * s * (0.3 + 0.7 * runF);
      ctx.strokeStyle = lc.cord;
      ctx.lineWidth = Math.max(1, s * 0.011);
      ctx.beginPath();
      ctx.moveTo(bx, -0.045 * s);
      ctx.quadraticCurveTo(bx + kick * 0.5, 0.0, bx + kick, 0.038 * s);
      ctx.stroke();
      // The foot: a small tapered pelt lozenge with a pale tip and a
      // brass cap at the cord — flat planes, readable tiny.
      ctx.save();
      ctx.translate(bx + kick, 0.04 * s);
      ctx.rotate(kick / (0.12 * s));
      ctx.fillStyle = '#c9a23c';
      ctx.fillRect(-0.012 * s, -0.006 * s, 0.024 * s, 0.014 * s);
      ctx.fillStyle = lc.foot;
      ctx.beginPath();
      ctx.moveTo(-0.013 * s, 0.008 * s);
      ctx.lineTo(0.013 * s, 0.008 * s);
      ctx.lineTo(0.009 * s, 0.062 * s);
      ctx.lineTo(-0.007 * s, 0.058 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(lc.foot, 26);
      ctx.beginPath();
      ctx.moveTo(-0.007 * s, 0.048 * s);
      ctx.lineTo(0.009 * s, 0.05 * s);
      ctx.lineTo(0.008 * s, 0.062 * s);
      ctx.lineTo(-0.006 * s, 0.058 * s);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // ---- RUNESTRIPS: hanging inscribed strips off the shoulders and
    // hem — cloth with full weight, swaying on the stride and the
    // travel drag, pointed ends, stitched roots. Their runes kindle
    // in a slow reading wave, top strip first, hem last: the fire
    // reads the scripture in order and never loses its place.
    if (st.runestrips) {
      const rsCol = hurt ? '#ffffff' : st.runestrips.color;
      const rn = st.runestrips.rune;
      const turnR = Math.floor(nowMs / 1400) % 4;
      const ftR = (nowMs % 1400) / 1400;
      const strips = [
        // [anchor x (×ww), top y, length, width, phase, order]
        [-0.62, -th * 0.92, th * 0.78, 0.052, 0, 0],
        [0.62, -th * 0.92, th * 0.78, 0.052, 1.6, 1],
        [-0.84, 0.04 * s, st.skirt * s + 0.05 * s, 0.048, 3.1, 2],
        [0.84, 0.04 * s, st.skirt * s + 0.05 * s, 0.048, 4.5, 3],
      ] as const;
      for (const [au, ay, len, w0, ph, order] of strips) {
        const ax = au * ww;
        const w = w0 * s;
        const sway =
          Math.sin(nowMs * 0.0021 + ph) * 0.013 * s * (0.35 + 0.65 * runF) +
          f.strideSw * 0.014 * s +
          f.dragX * 0.42 * s;
        const tipX = ax + sway;
        const tipY = ay + len;
        // The strip's outline path — traced twice, once for the fill
        // and once for the edge that SEPARATES it from the robe (the
        // strips are the robe's colors; the drawn edge is what keeps
        // them a garment-over-garment layer, not a stripe).
        const stripPath = () => {
          ctx.moveTo(ax - w, ay);
          ctx.lineTo(ax + w, ay);
          ctx.quadraticCurveTo(ax + w + sway * 0.5, ay + len * 0.55, tipX + w * 0.72, tipY - w * 1.4);
          ctx.lineTo(tipX, tipY);
          ctx.lineTo(tipX - w * 0.72, tipY - w * 1.4);
          ctx.quadraticCurveTo(ax - w + sway * 0.5, ay + len * 0.55, ax - w, ay);
          ctx.closePath();
        };
        ctx.fillStyle = rsCol;
        ctx.beginPath();
        stripPath();
        ctx.fill();
        if (!hurt) {
          // The full edge keeps the strip legible on its own cloth.
          ctx.strokeStyle = shade(st.runestrips.color, -34);
          ctx.lineWidth = Math.max(1, s * 0.011);
          ctx.beginPath();
          stripPath();
          ctx.stroke();
          // The stitched root, and the CHARRED POINT — the scripture
          // burns from the bottom up, and the tips already went.
          ctx.fillStyle = shade(st.runestrips.color, -24);
          ctx.fillRect(ax - w, ay, w * 2, 0.016 * s);
          ctx.fillStyle = shade(st.runestrips.color, -58);
          ctx.beginPath();
          ctx.moveTo(tipX + w * 0.72, tipY - w * 1.4);
          ctx.lineTo(tipX, tipY);
          ctx.lineTo(tipX - w * 0.72, tipY - w * 1.4);
          ctx.lineTo(tipX - w * 0.5, tipY - w * 2.3);
          ctx.lineTo(tipX + w * 0.5, tipY - w * 2.3);
          ctx.closePath();
          ctx.fill();
          // The scripture: three marks down the strip. The reading
          // wave lights one strip at a time, in order.
          const lit = order === turnR ? Math.sin(ftR * Math.PI) : 0;
          ctx.strokeStyle = shade(rn, lit * 30);
          ctx.globalAlpha = 0.42 + 0.58 * lit;
          ctx.lineWidth = Math.max(1, s * 0.011);
          for (let m = 0; m < 3; m++) {
            const mu = 0.22 + m * 0.26;
            const mx = ax + sway * mu * 0.72;
            const my = ay + len * mu;
            const mw = w * 0.6;
            ctx.beginPath();
            if ((m + order) % 3 === 0) {
              ctx.moveTo(mx - mw, my + mw);
              ctx.lineTo(mx, my - mw);
              ctx.lineTo(mx + mw, my + mw);
            } else if ((m + order) % 3 === 1) {
              ctx.moveTo(mx - mw, my - mw);
              ctx.lineTo(mx + mw, my - mw);
              ctx.moveTo(mx, my - mw);
              ctx.lineTo(mx, my + mw);
            } else {
              ctx.moveTo(mx - mw, my);
              ctx.lineTo(mx + mw, my);
              ctx.moveTo(mx - mw * 0.5, my - mw);
              ctx.lineTo(mx + mw * 0.5, my + mw);
            }
            ctx.stroke();
          }
          if (lit > 0.3) {
            // The reading glow while this strip holds the fire's eye.
            ctx.globalAlpha = (lit - 0.3) * 0.24;
            ctx.fillStyle = rn;
            ctx.beginPath();
            ctx.ellipse(ax + sway * 0.4, ay + len * 0.5, w * 2.1, len * 0.44, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      }
    }

    // ---- the aura: three Arx motes drifting slowly up the robe,
    // each on its own phase, fading in and out — quiet power, never a
    // particle storm. Deterministic from the clock alone.
    if (st.motes) {
      ctx.fillStyle = st.motes;
      for (let i = 0; i < 3; i++) {
        const ph = nowMs * 0.00042 + i * 0.37;
        const cyc = ph - Math.floor(ph);
        const a = Math.sin(cyc * Math.PI) * 0.55;
        if (a <= 0.03) continue;
        const mx = Math.sin(i * 2.4 + Math.floor(ph) * 1.7) * ww * 1.5;
        // Motes are born at the hem — seated, the hem is the POOL, so
        // they rise from the pooled cloth, never from under the floor.
        const born = 0.05 * s + st.skirt * s;
        const moteK = f.sit ?? 0;
        const myBase = born + ((f.groundY ?? 0) + 0.05 * s - born) * moteK;
        const my = myBase - cyc * (th + st.skirt * s) * 0.9;
        const r = (0.016 + 0.006 * Math.sin(i * 5.1)) * s;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.moveTo(mx, my - r * 1.4);
        ctx.lineTo(mx + r, my);
        ctx.lineTo(mx, my + r * 1.4);
        ctx.lineTo(mx - r, my);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ---- frost glints: winter stars winking low on the skirt, each
    // on its own beat — the cloth glitters where it drags the cold.
    if (st.icefringe && st.skirt > 0) {
      const ice = st.icefringe.color;
      for (const [gu, gk, ph] of [[-0.55, 0.72, 0], [0.4, 0.9, 2.4], [0.08, 0.5, 4.2]] as const) {
        const wink = Math.max(0, Math.sin(nowMs * 0.0014 + ph));
        if (wink < 0.15) continue;
        const gx = gu * ww * 1.2;
        const gy = 0.02 * s + st.skirt * s * gk;
        const gr = 0.02 * s * (0.6 + 0.4 * wink);
        ctx.globalAlpha = 0.35 + 0.55 * wink;
        ctx.strokeStyle = ice;
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(gx - gr, gy);
        ctx.lineTo(gx + gr, gy);
        ctx.moveTo(gx, gy - gr);
        ctx.lineTo(gx, gy + gr);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // ---- SIGILWEAVE: sigils surfacing through the skirt cloth, one
    // at a time — rise, hold, sink — while the next wakes elsewhere.
    // The rosette rotation law worn as script: the garment is
    // reading, and it never reads the same line twice in a row.
    if (st.sigilweave && st.skirt > 0) {
      const sg = st.sigilweave.color;
      const sites = [
        [-0.52, 0.4, 0],
        [0.44, 0.62, 1],
        [-0.06, 0.82, 2],
      ] as const;
      const turnS = Math.floor(nowMs / 2600) % 3;
      const ftS = (nowMs % 2600) / 2600;
      for (const [gu, gk, idx] of sites) {
        const lit = idx === turnS ? Math.sin(ftS * Math.PI) : 0;
        if (lit < 0.06) continue;
        const gx = gu * ww * 1.15;
        const gy = 0.02 * s + st.skirt * s * gk;
        const R = 0.036 * s;
        // The under-glow: the weave warms before the line shows.
        ctx.globalAlpha = lit * 0.16;
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(gx, gy, R * 1.7, 0, Math.PI * 2);
        ctx.fill();
        // The sigil itself — each site keeps its own letter.
        ctx.globalAlpha = lit * 0.9;
        ctx.strokeStyle = shade(sg, lit * 20);
        ctx.lineWidth = Math.max(1, s * 0.013);
        ctx.beginPath();
        if (idx === 0) {
          // The open eye, lidded.
          ctx.moveTo(gx - R, gy);
          ctx.quadraticCurveTo(gx, gy - R * 1.1, gx + R, gy);
          ctx.quadraticCurveTo(gx, gy + R * 1.1, gx - R, gy);
          ctx.moveTo(gx + R * 0.3, gy);
          ctx.arc(gx, gy, R * 0.3, 0, Math.PI * 2);
        } else if (idx === 1) {
          // The asking: a stave that leans to listen.
          ctx.moveTo(gx - R * 0.5, gy + R);
          ctx.lineTo(gx - R * 0.5, gy - R);
          ctx.lineTo(gx + R * 0.7, gy - R * 0.3);
          ctx.lineTo(gx - R * 0.5, gy + R * 0.2);
        } else {
          // The answer: three falling bars, each shorter.
          ctx.moveTo(gx - R * 0.8, gy - R);
          ctx.lineTo(gx + R * 0.8, gy - R);
          ctx.moveTo(gx - R * 0.55, gy - R * 0.3);
          ctx.lineTo(gx + R * 0.55, gy - R * 0.3);
          ctx.moveTo(gx - R * 0.3, gy + R * 0.4);
          ctx.lineTo(gx + R * 0.3, gy + R * 0.4);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // ---- dancer ribbons: two banners of light hung off the waist,
    // each flowing outward and down in a lazy S, tips kicking with
    // the sky's own clock. Light, not cloth — they ride above every
    // layer, and the night never puts them down. The composition
    // pairs with the hood's streamers: sky above, dance below.
    if (st.ribbons) {
      for (const [i, rCol] of st.ribbons.colors.entries()) {
        const es = i === 0 ? -1 : 1;
        const ph = i * 2.6;
        const w0 = 0.05 * s;
        const w1 = 0.02 * s;
        const ax = es * ww * 0.78;
        const ay = -0.03 * s;
        // The S: out and down to a mid bow, then flaring past the hem,
        // the tip lifting and falling on the slow beat.
        const m1x = ax + es * (0.1 * s + Math.sin(nowMs * 0.0019 + ph) * 0.02 * s);
        const m1y = ay + 0.14 * s;
        const m2x = ax + es * (0.05 * s + Math.sin(nowMs * 0.0019 + ph + 1.3) * 0.035 * s);
        const m2y = ay + 0.3 * s;
        const tipX = ax + es * (0.16 * s + Math.sin(nowMs * 0.0021 + ph + 2.1) * 0.05 * s);
        const tipY = ay + 0.44 * s + Math.sin(nowMs * 0.0017 + ph + 3) * 0.025 * s;
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = rCol;
        ctx.beginPath();
        ctx.moveTo(ax - w0 * 0.6, ay);
        ctx.quadraticCurveTo(m1x - w0, m1y, m2x - w0 * 0.8, m2y);
        ctx.quadraticCurveTo(m2x - w0 * 0.55, (m2y + tipY) / 2, tipX - w1, tipY);
        ctx.lineTo(tipX + w1, tipY + 0.014 * s);
        ctx.quadraticCurveTo(m2x + w0 * 0.55, (m2y + tipY) / 2 + 0.02 * s, m2x + w0 * 0.8, m2y);
        ctx.quadraticCurveTo(m1x + w0, m1y, ax + w0 * 0.6, ay);
        ctx.closePath();
        ctx.fill();
        // The hot center — light carries its own core.
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = shade(rCol, 32);
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(ax, ay + 0.02 * s);
        ctx.quadraticCurveTo(m1x, m1y, m2x, m2y);
        ctx.quadraticCurveTo(m2x + es * 0.01 * s, (m2y + tipY) / 2, tipX, tipY);
        ctx.stroke();
        // A stray spark shed where the ribbon last kicked.
        const wk = Math.max(0, Math.sin(nowMs * 0.0016 + ph + 0.8));
        if (wk > 0.2) {
          ctx.globalAlpha = wk * 0.8;
          ctx.fillStyle = shade(rCol, 40);
          const px2 = tipX + es * 0.035 * s;
          const py2 = tipY - 0.06 * s - wk * 0.025 * s;
          ctx.beginPath();
          ctx.moveTo(px2, py2 - 0.014 * s);
          ctx.lineTo(px2 + 0.011 * s, py2);
          ctx.lineTo(px2, py2 + 0.014 * s);
          ctx.lineTo(px2 - 0.011 * s, py2);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    // ---- the feather mantle: two lapped rows of broad vanes ringing
    // the shoulders, front AND back — a mantle that vanished on turn
    // would break the garment. Broad and few beats thin and many; a
    // timid feather reads as fringe. One-sun: screen-left vanes lit.
    if (st.plumage) {
      const pl = st.plumage;
      const rows = [
        { y0: -th * 1.02, n: 4, len: th * 0.5, wK: 1 },
        { y0: -th * 0.72, n: 3, len: th * 0.42, wK: 0.85 },
      ];
      for (const row of rows) {
        for (let i = 0; i < row.n; i++) {
          const u = -1 + (2 * (i + 0.5)) / row.n;
          const bx = u * tww * 0.98;
          const by = row.y0 + Math.abs(u) * th * 0.08;
          const vw = tww * 0.34 * row.wK;
          const vl = row.len * (0.86 + 0.14 * Math.sin(i * 2.1 + row.n));
          const tipX = bx + u * vw * 0.55;
          const tipY = by + vl;
          const vane = () => {
            ctx.beginPath();
            ctx.moveTo(bx - vw, by);
            ctx.quadraticCurveTo(bx - vw * 1.05, by + vl * 0.55, tipX, tipY);
            ctx.quadraticCurveTo(bx + vw * 1.05, by + vl * 0.55, bx + vw, by);
            ctx.closePath();
          };
          ctx.fillStyle = u > 0.01 ? shade(pl.color, -14) : shade(pl.color, 4);
          vane();
          ctx.fill();
          // The tip break: the last third dips in the second color.
          ctx.fillStyle = u > 0.01 ? shade(pl.tip, -12) : pl.tip;
          ctx.beginPath();
          ctx.moveTo(bx - vw * 0.62, by + vl * 0.6);
          ctx.quadraticCurveTo(bx - vw * 0.68, by + vl * 0.8, tipX, tipY);
          ctx.quadraticCurveTo(bx + vw * 0.68, by + vl * 0.8, bx + vw * 0.62, by + vl * 0.6);
          ctx.closePath();
          ctx.fill();
          // The spine — one stroke sells the anatomy.
          ctx.strokeStyle = shade(pl.color, -26);
          ctx.lineWidth = Math.max(1, s * 0.012);
          ctx.beginPath();
          ctx.moveTo(bx, by + vl * 0.08);
          ctx.quadraticCurveTo(bx + u * vw * 0.2, by + vl * 0.55, tipX, tipY - vl * 0.06);
          ctx.stroke();
          // The oil-slick sheen: a band of borrowed light walking the
          // rows on a slow clock — iridescence, never a palette swap.
          if (pl.sheen) {
            const swp = Math.sin(nowMs * 0.0008 + u * 2.4 + row.wK * 2);
            if (swp > 0.55) {
              ctx.globalAlpha = ((swp - 0.55) / 0.45) * 0.4;
              ctx.fillStyle = pl.sheen;
              vane();
              ctx.fill();
              ctx.globalAlpha = 1;
            }
          }
        }
      }
    }

    // ---- the back quiver: the archer's tube on the trailing shoulder
    // blade. From behind, the whole story: banded tube, three fletched
    // nocks. From the front, the chest strap and the fletchings peeking
    // over the shoulder — gear that survives the turn.
    if (st.quiver) {
      const q = st.quiver;
      const es = -(f.lead || 1);
      const bob = f.strideSw * 0.01 * s;
      const fletchAt = (axx: number, ayy: number, fw: number, fh: number) => {
        ctx.beginPath();
        ctx.moveTo(axx, ayy - fh);
        ctx.lineTo(axx + fw, ayy);
        ctx.lineTo(axx, ayy + fh);
        ctx.lineTo(axx - fw, ayy);
        ctx.closePath();
        ctx.fill();
      };
      if (back) {
        // Slung wide of the hood's drape tail — a quiver the cowl
        // swallows is a plank, not a story.
        ctx.save();
        ctx.translate(es * tw * 0.52, -th * 0.5 + bob);
        ctx.rotate(es * 0.42);
        const qw = 0.066 * s;
        const qh = 0.2 * s;
        // Arrows first, so the tube's rim seats over their shafts.
        ctx.strokeStyle = shade(q.color, -34);
        ctx.lineWidth = Math.max(1, s * 0.013);
        for (let i = -1; i <= 1; i++) {
          const axx = i * qw * 0.55;
          ctx.beginPath();
          ctx.moveTo(axx, -qh + 0.02 * s);
          ctx.lineTo(axx + i * 0.009 * s, -qh - 0.085 * s + Math.abs(i) * 0.018 * s);
          ctx.stroke();
        }
        ctx.fillStyle = q.fletch;
        for (let i = -1; i <= 1; i++) {
          fletchAt(
            i * qw * 0.55 + i * 0.009 * s,
            -qh - 0.078 * s + Math.abs(i) * 0.018 * s,
            0.019 * s,
            0.031 * s,
          );
        }
        // The tube: lit half, shaded half, bright rim, waist band.
        ctx.fillStyle = q.color;
        ctx.fillRect(-qw, -qh, qw * 2, qh * 2);
        ctx.fillStyle = shade(q.color, -18);
        ctx.fillRect(0, -qh, qw, qh * 2);
        ctx.fillStyle = shade(q.color, 16);
        ctx.fillRect(-qw, -qh, qw * 2, 0.022 * s);
        ctx.fillStyle = shade(q.color, -32);
        ctx.fillRect(-qw, -0.03 * s, qw * 2, 0.02 * s);
        ctx.restore();
      } else {
        // The strap crosses the chest to the opposite hip.
        ctx.strokeStyle = shade(q.color, -12);
        ctx.lineWidth = Math.max(2.5, s * 0.04);
        ctx.beginPath();
        ctx.moveTo(es * tw * 0.72, -th * 0.98);
        ctx.lineTo(-es * ww * 0.6, -0.05 * s);
        ctx.stroke();
        // The buckle plate where the strap crosses the sternum.
        ctx.fillStyle = shade(q.color, 24);
        ctx.fillRect(es * tw * 0.1 - 0.016 * s, -th * 0.56, 0.032 * s, 0.026 * s);
        // Fletchings over the trailing shoulder — the quiver's hello.
        // Big enough to read at world zoom; a timid fletch is lint.
        for (let i = 0; i < 3; i++) {
          const axx = es * tw * (0.62 + i * 0.24);
          const ayy = -th * (1.36 - (i === 1 ? 0.02 : 0.1)) + bob;
          ctx.strokeStyle = shade(q.color, -34);
          ctx.lineWidth = Math.max(1, s * 0.013);
          ctx.beginPath();
          ctx.moveTo(axx, ayy + 0.026 * s);
          ctx.lineTo(axx - es * 0.014 * s, -th * 1.0);
          ctx.stroke();
          ctx.fillStyle = q.fletch;
          fletchAt(axx, ayy, 0.021 * s, 0.033 * s);
        }
      }
    }

    // ---- the scarf tail: a neck wrap knotted at the trailing
    // shoulder, its tail waving behind in a lazy S — the assassin's
    // flag. Cloth, not light: full weight, one shaded edge.
    // ---- THE SLIPSTREAM: speed made visible — pale wind streaks
    // trailing off the shoulders and hip, ALIVE ONLY IN MOTION
    // (gated on the run factor; an idle courier shows nothing, and
    // that restraint is the whole trick). Each streak is a thin
    // tapered plane on its own short clock, drawn toward the trail.
    if (st.slipstream && !hurt && runF > 0.12) {
      const rake = -(f.lead || 1);
      const strength = Math.min(1, (runF - 0.12) / 0.6);
      ctx.fillStyle = st.slipstream.color;
      for (let i = 0; i < 3; i++) {
        const p = (nowMs * 0.0016 + i * 0.333) % 1;
        const yy = -th * (0.9 - i * 0.34);
        const x0 = rake * tww * (0.7 + 0.2 * Math.sin(i * 2.1));
        const len = (0.1 + 0.1 * strength) * s * (1 - p * 0.5);
        ctx.globalAlpha = strength * 0.5 * (1 - p);
        ctx.beginPath();
        ctx.moveTo(x0, yy - 0.006 * s);
        ctx.lineTo(x0 + rake * len, yy + 0.004 * s * (i % 2 === 0 ? 1 : -1));
        ctx.lineTo(x0, yy + 0.008 * s);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ---- SHADOWTAILS: twin dusk scarf ends off the shoulders,
    // drifting on the cowl's slow clock — never snapping, never
    // symmetric. The dark that follows you out of the room.
    if (st.shadowtails && !hurt) {
      const sc = st.shadowtails.color;
      for (const es of [-1, 1]) {
        const drift =
          Math.sin(nowMs * 0.0011 + es * 2.2) * 0.03 * s +
          f.strideSw * 0.012 * s * es +
          f.dragX * 0.45 * s;
        const bx = es * tww * 0.72;
        const by = -th * 0.94;
        const endX = bx + es * 0.05 * s + drift;
        const endY = by + th * (0.78 + 0.08 * Math.sin(nowMs * 0.0013 + es));
        ctx.fillStyle = sc;
        ctx.beginPath();
        ctx.moveTo(bx - 0.02 * s, by);
        ctx.quadraticCurveTo(bx + drift * 0.4 - 0.02 * s, by + th * 0.4, endX - 0.014 * s, endY);
        ctx.lineTo(endX + 0.008 * s, endY - 0.02 * s);
        ctx.quadraticCurveTo(bx + drift * 0.4 + 0.02 * s, by + th * 0.36, bx + 0.02 * s, by);
        ctx.closePath();
        ctx.fill();
        // The deeper inner fold — depth as a flatter, darker plane.
        ctx.fillStyle = shade(sc, -14);
        ctx.beginPath();
        ctx.moveTo(bx, by + th * 0.06);
        ctx.quadraticCurveTo(bx + drift * 0.4, by + th * 0.42, endX - 0.006 * s, endY - 0.015 * s);
        ctx.lineTo(endX - 0.012 * s, endY - 0.035 * s);
        ctx.quadraticCurveTo(bx + drift * 0.36 - 0.008 * s, by + th * 0.34, bx - 0.008 * s, by + th * 0.05);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (st.scarftail) {
      const sc = st.scarftail;
      const es = -(f.lead || 1);
      // The wrap itself rings the collar, front and back both.
      ctx.fillStyle = back ? shade(sc.color, -8) : sc.color;
      ctx.beginPath();
      ctx.moveTo(-tw * 0.64, -th * 1.04);
      ctx.lineTo(tw * 0.64, -th * 1.04);
      ctx.lineTo(tw * 0.56, -th * 0.86);
      ctx.lineTo(-tw * 0.56, -th * 0.86);
      ctx.closePath();
      ctx.fill();
      // The knot.
      ctx.fillStyle = shade(sc.color, 12);
      ctx.beginPath();
      ctx.arc(es * tw * 0.58, -th * 0.95, 0.024 * s, 0, Math.PI * 2);
      ctx.fill();
      // The tail: out, a mid bow, a flared tip that kicks on its own
      // clock — never a stick.
      const ax = es * tw * 0.6;
      const ay = -th * 0.92;
      const m1x = ax + es * (0.08 * s + Math.sin(nowMs * 0.0018) * 0.016 * s);
      const m1y = ay + 0.1 * s;
      const m2x = ax + es * (0.15 * s + Math.sin(nowMs * 0.0018 + 1.2) * 0.03 * s);
      const m2y = ay + 0.22 * s;
      const tipX = ax + es * (0.11 * s + Math.sin(nowMs * 0.002 + 2.3) * 0.045 * s);
      const tipY = ay + 0.35 * s + Math.sin(nowMs * 0.0016 + 3.1) * 0.02 * s;
      const w0 = 0.036 * s;
      const wm = 0.048 * s;
      const w1 = 0.02 * s;
      ctx.fillStyle = sc.color;
      ctx.beginPath();
      ctx.moveTo(ax - w0 * 0.7, ay);
      ctx.quadraticCurveTo(m1x - wm, m1y, m2x - wm * 0.8, m2y);
      ctx.quadraticCurveTo(m2x - wm * 0.5, (m2y + tipY) / 2, tipX - w1 * 1.3, tipY);
      ctx.lineTo(tipX + w1 * 1.3, tipY + 0.012 * s);
      ctx.quadraticCurveTo(m2x + wm * 0.6, (m2y + tipY) / 2 + 0.02 * s, m2x + wm * 0.8, m2y);
      ctx.quadraticCurveTo(m1x + wm, m1y, ax + w0 * 0.7, ay);
      ctx.closePath();
      ctx.fill();
      // The shaded edge — cloth has a dark side under one sun.
      ctx.strokeStyle = shade(sc.color, -20);
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(ax + w0 * 0.5, ay + 0.02 * s);
      ctx.quadraticCurveTo(m1x + wm * 0.7, m1y, m2x + wm * 0.6, m2y);
      ctx.stroke();
      // The dipped tip.
      if (sc.tip) {
        ctx.fillStyle = sc.tip;
        ctx.beginPath();
        ctx.moveTo(m2x - wm * 0.4, (m2y + tipY) / 2 + 0.008 * s);
        ctx.quadraticCurveTo(m2x - wm * 0.2, (m2y + tipY) / 2 + 0.03 * s, tipX - w1 * 1.3, tipY);
        ctx.lineTo(tipX + w1 * 1.3, tipY + 0.012 * s);
        ctx.quadraticCurveTo(m2x + wm * 0.4, (m2y + tipY) / 2 + 0.045 * s, m2x + wm * 0.35, (m2y + tipY) / 2 + 0.016 * s);
        ctx.closePath();
        ctx.fill();
      }
    }

    // ---- smoke wisps: curls rising off the shoulders and thinning
    // as they climb — the burn never quite went out. Deterministic
    // from the clock alone; a curl, never a blob.
    if (st.wisps) {
      ctx.strokeStyle = st.wisps.color;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const ph = nowMs * 0.00052 + i * 0.41;
        const cyc = ph - Math.floor(ph);
        const a = Math.sin(cyc * Math.PI) * 0.55;
        if (a <= 0.04) continue;
        // Born at the shoulder points and drifting OUTBOARD as they
        // climb — smoke that rises straight up dies behind the hood.
        const sideW = Math.sin(i * 2.6 + Math.floor(ph) * 1.9);
        const bx = (Math.sign(sideW) || 1) * tw * (0.8 + 0.25 * Math.abs(sideW));
        const by = -th * (0.85 + 0.1 * Math.sin(i * 3.3));
        const x = bx * (1 + cyc * 0.9) + Math.sin(cyc * 5 + i * 1.7) * 0.032 * s;
        const y = by - cyc * th * 0.75;
        const r = (0.017 + cyc * 0.02) * s;
        ctx.globalAlpha = a;
        ctx.lineWidth = Math.max(1.2, s * (0.02 - cyc * 0.009));
        ctx.beginPath();
        ctx.arc(x, y, r, cyc * 4 + i, cyc * 4 + i + 3.6);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.lineCap = 'butt';
    }

    // ---- fireflies: low wandering lights that BLINK on their own
    // beats — alive, where motes merely drift. A halo and a hot core
    // per light; never more than three.
    if (st.fireflies) {
      const fc = st.fireflies.color;
      for (let i = 0; i < 3; i++) {
        const t = nowMs * 0.00038 + i * 2.1;
        const blink = Math.max(0, Math.sin(nowMs * 0.0019 + i * 2.4));
        if (blink < 0.12) continue;
        const x = Math.sin(i * 2.7 + 1) * ww * 0.9 + Math.cos(t * (1.0 + i * 0.17)) * ww * 0.55;
        const y = -th * 0.3 + Math.sin(i * 1.9) * th * 0.32 + Math.sin(t * (1.4 + i * 0.11)) * 0.05 * s;
        ctx.globalAlpha = 0.26 * blink;
        ctx.fillStyle = fc;
        ctx.beginPath();
        ctx.arc(x, y, 0.032 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.6 + 0.4 * blink;
        ctx.fillStyle = shade(fc, 30);
        ctx.beginPath();
        ctx.arc(x, y, 0.0135 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ---- feather fall: shed feathers rocking down past the hem and
    // fading — the molt that never runs out. Two at most; a flurry
    // would upstage the garment.
    // ---- LEAFFALL: gold leaves shed from nowhere, falling slow with
    // a side-to-side flutter — the wilds acknowledging their own.
    // Three leaves on staggered clocks; each is a pointed oval that
    // rocks as it falls, never a confetti dot.
    if (st.leaffall && !hurt) {
      const lc = st.leaffall.color;
      for (let i = 0; i < 3; i++) {
        const p = (nowMs * 0.00022 + i * 0.333) % 1;
        const sx = Math.sin(i * 2.9) * tww * 0.85;
        const lx = sx + Math.sin(p * 9.4 + i) * 0.045 * s;
        const ly = -th * 1.05 + p * th * 1.6;
        const rock = Math.sin(p * 9.4 + i + 1.2) * 0.9;
        const a = p < 0.12 ? p / 0.12 : p > 0.82 ? (1 - p) / 0.18 : 1;
        ctx.globalAlpha = a * 0.9;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rock);
        ctx.fillStyle = i === 1 ? shade(lc, 14) : lc;
        ctx.beginPath();
        ctx.moveTo(0, -0.024 * s);
        ctx.quadraticCurveTo(0.014 * s, -0.006 * s, 0, 0.022 * s);
        ctx.quadraticCurveTo(-0.014 * s, -0.006 * s, 0, -0.024 * s);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    if (st.featherfall) {
      const fCol = st.featherfall.color;
      for (let i = 0; i < 2; i++) {
        const ph = nowMs * 0.0003 + i * 0.53;
        const cyc = ph - Math.floor(ph);
        const a = Math.sin(cyc * Math.PI) * 0.9;
        if (a <= 0.05) continue;
        const bx = Math.sin(i * 2.9 + Math.floor(ph) * 1.7) * ww * 1.25;
        const x = bx + Math.sin(cyc * 6.2 + i) * 0.05 * s;
        const y = -th * 0.9 + cyc * th * 1.5;
        const rot = 0.5 + Math.sin(cyc * 6.2 + i + Math.PI / 2) * 0.7;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.globalAlpha = a;
        const fl = 0.06 * s;
        ctx.fillStyle = fCol;
        ctx.beginPath();
        ctx.moveTo(-fl * 0.5, 0);
        ctx.quadraticCurveTo(-fl * 0.1, -fl * 0.3, fl * 0.5, -fl * 0.06);
        ctx.quadraticCurveTo(-fl * 0.1, fl * 0.26, -fl * 0.5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(fCol, 26);
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.beginPath();
        ctx.moveTo(-fl * 0.5, 0);
        ctx.lineTo(fl * 0.5, -fl * 0.06);
        ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    // ---- storm arcs: a jagged bolt SNAPS shoulder to chest on its
    // own beat, re-forking every flicker while it lives, then gone.
    // Between snaps, two small charge sparks keep the current honest.
    // A steady bolt is a decal; the snap is the storm.
    if (st.arcsparks) {
      const ac = st.arcsparks.color;
      for (const k of [0, 1] as const) {
        const gate = Math.sin(nowMs * 0.0019 + k * 2.9);
        if (gate > 0.45) {
          const es2 = k === 0 ? -1 : 1;
          // The bolt re-jags on a fast clock while the gate holds —
          // electricity never draws the same path twice.
          const seed = Math.floor(nowMs / 90) + k * 7;
          const x0 = es2 * tw * 0.95;
          const y0 = -th * 1.06;
          const x3 = -es2 * tw * 0.3;
          const y3 = -th * 0.42;
          const pts: Array<[number, number]> = [[x0, y0]];
          for (let i = 1; i <= 2; i++) {
            const t = i / 3;
            const jx = Math.sin(seed * 3.7 + i * 5.1 + k) * tw * 0.3;
            const jy = Math.sin(seed * 2.3 + i * 3.9) * th * 0.1;
            pts.push([x0 + (x3 - x0) * t + jx, y0 + (y3 - y0) * t + jy]);
          }
          pts.push([x3, y3]);
          const a = Math.min(1, (gate - 0.45) * 3.2);
          // Wide soft charge halo first, hot core over it.
          for (const [lw, alpha, colr] of [
            [0.03, 0.22 * a, ac],
            [0.011, 0.95 * a, shade(ac, 32)],
          ] as const) {
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = colr;
            ctx.lineWidth = Math.max(1, s * lw);
            ctx.beginPath();
            ctx.moveTo(pts[0]![0], pts[0]![1]);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
            ctx.stroke();
          }
        }
        // The charge spark: a small cross wink near the shoulder point.
        const wink = Math.max(0, Math.sin(nowMs * 0.0027 + k * 4.1 + 1.7));
        if (wink > 0.35) {
          const es2 = k === 0 ? 1 : -1;
          const gx = es2 * tw * (0.8 + 0.18 * Math.sin(k * 3.1));
          const gy = -th * (0.62 + 0.28 * Math.sin(k * 2.2 + 1));
          const gr = 0.018 * s * wink;
          ctx.globalAlpha = 0.8 * wink;
          ctx.strokeStyle = shade(ac, 26);
          ctx.lineWidth = Math.max(1, s * 0.011);
          ctx.beginPath();
          ctx.moveTo(gx - gr, gy);
          ctx.lineTo(gx + gr, gy);
          ctx.moveTo(gx, gy - gr);
          ctx.lineTo(gx, gy + gr);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    // ---- molten seams: the forge's veins — branching cracks glowing
    // between the chest plates, each breathing on its own furnace
    // beat. Soft heat halo under a hot core; the metal never cooled.
    // From behind, one spine vein keeps the secret lit.
    // ---- HEATSEAM: the banked forge's loose sparks. The standing
    // gap fire lives inside DRAKEROWS (it knows the plate geometry);
    // this word keeps the back waist seam and THE RISING EMBERS —
    // three motes on staggered clocks climbing off the waist and
    // dying by size AND light: sparks off a banked fire, never
    // fireflies.
    if (st.heatseam && !hurt) {
      const hs = st.heatseam;
      if (back) {
        const breathe = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(nowMs * 0.00105));
        ctx.globalAlpha = 0.42 * breathe;
        ctx.strokeStyle = hs.color;
        ctx.lineWidth = Math.max(2, s * 0.026);
        ctx.beginPath();
        ctx.moveTo(-tww * 0.5, -th * 0.26);
        ctx.quadraticCurveTo(0, -th * 0.2, tww * 0.5, -th * 0.26);
        ctx.stroke();
        ctx.globalAlpha = 0.9 * breathe;
        ctx.strokeStyle = hs.core;
        ctx.lineWidth = Math.max(1, s * 0.011);
        ctx.beginPath();
        ctx.moveTo(-tww * 0.41, -th * 0.248);
        ctx.quadraticCurveTo(0, -th * 0.195, tww * 0.41, -th * 0.248);
        ctx.stroke();
        ctx.globalAlpha = 0.95 * breathe;
        ctx.fillStyle = hs.core;
        for (const [ux, uy] of [[-0.2, -0.27], [0.24, -0.25]] as const) {
          ctx.beginPath();
          ctx.arc(ux * tww, uy * th, 0.011 * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (const [ph, cyc] of [[0, 4700], [2600, 6100], [1400, 5400]] as const) {
        const u = ((nowMs + ph) % cyc) / cyc;
        if (u > 0.82) continue;
        const ex = leadSign * tww * (0.3 - u * 0.14) + Math.sin(u * 9 + ph) * tww * 0.05;
        const ey = -th * 0.28 - u * th * 0.62;
        ctx.globalAlpha = 0.85 * (1 - u);
        ctx.fillStyle = u < 0.3 ? hs.core : hs.color;
        ctx.beginPath();
        ctx.arc(ex, ey, 0.013 * s * (1 - u * 0.72), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    if (st.moltenSeams) {
      const mCol = st.moltenSeams.color;
      const veins: Array<{ ph: number; pts: Array<[number, number]> }> = back
        ? [{ ph: 0.7, pts: [[0, -th * 0.98], [-tw * 0.06, -th * 0.7], [tw * 0.05, -th * 0.42], [0, -th * 0.2]] }]
        : [
            { ph: 0, pts: [[-tw * 0.62, -th * 0.98], [-tw * 0.34, -th * 0.78], [-tw * 0.44, -th * 0.55], [-tw * 0.22, -th * 0.34]] },
            { ph: 2.1, pts: [[tw * 0.58, -th * 0.92], [tw * 0.3, -th * 0.68], [tw * 0.4, -th * 0.46], [tw * 0.18, -th * 0.3]] },
            { ph: 4.3, pts: [[-tw * 0.08, -th * 0.86], [tw * 0.06, -th * 0.6], [-tw * 0.05, -th * 0.36], [tw * 0.03, -th * 0.14]] },
          ];
      for (const v of veins) {
        const a = 0.62 + 0.38 * Math.sin(nowMs * 0.0011 + v.ph);
        for (const [lw, alpha, colr] of [
          [0.034, 0.32 * a, mCol],
          [0.015, 0.95 * a, shade(mCol, 24)],
        ] as const) {
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = colr;
          ctx.lineWidth = Math.max(1, s * lw);
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(v.pts[0]![0], v.pts[0]![1]);
          for (let i = 1; i < v.pts.length; i++) ctx.lineTo(v.pts[i]![0], v.pts[i]![1]);
          ctx.stroke();
        }
        // The hottest joints glow beads brighter than the crack.
        ctx.fillStyle = shade(mCol, 36);
        for (const bi of [1, 2] as const) {
          ctx.globalAlpha = (bi === 2 ? 0.9 : 0.6) * a;
          const [bx, by] = v.pts[bi]!;
          ctx.beginPath();
          ctx.arc(bx, by, (bi === 2 ? 0.012 : 0.009) * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.lineJoin = 'miter';
      ctx.globalAlpha = 1;
    }

    // ---- embers: hot sparks rising off the plate and flickering out
    // mid-air — they burn where motes merely drift. Never more than
    // four; a shower reads as damage, a few reads as heat.
    if (st.embers) {
      const eCol = st.embers.color;
      for (let i = 0; i < 5; i++) {
        const ph = nowMs * 0.00058 + i * 0.37;
        const cyc = ph - Math.floor(ph);
        const flick = 0.7 + 0.3 * Math.sin(nowMs * 0.019 + i * 2.3);
        const a = Math.sin(cyc * Math.PI) * flick;
        if (a <= 0.08) continue;
        const bx = Math.sin(i * 2.8 + Math.floor(ph) * 1.9) * tw * 1.15;
        const x = bx + Math.sin(cyc * 5.5 + i * 1.3) * 0.035 * s;
        const y = -th * (0.25 + cyc * 1.15);
        const r = (0.02 - cyc * 0.008) * s;
        ctx.globalAlpha = a * 0.32;
        ctx.fillStyle = eCol;
        ctx.beginPath();
        ctx.arc(x, y, r * 2.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = Math.min(1, a * 1.15);
        ctx.fillStyle = shade(eCol, 28);
        ctx.beginPath();
        ctx.moveTo(x, y - r * 1.3);
        ctx.lineTo(x + r, y);
        ctx.lineTo(x, y + r * 1.3);
        ctx.lineTo(x - r, y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ---- gleam: star glints winking off the plate's high points on
    // their own beats — polish past vanity. Three sites, never lit
    // at once; a constant sparkle is a texture, a wink is a legend.
    if (st.gleam) {
      const gc = st.gleam.color;
      for (const [gu, gv, ph] of [
        [-0.78, -1.0, 0],
        [0.3, -0.62, 2.3],
        [-0.4, -0.18, 4.5],
      ] as const) {
        const wink = Math.max(0, Math.sin(nowMs * 0.0012 + ph));
        if (wink < 0.4) continue;
        const gx = gu * tw;
        const gy = gv * th;
        const gr = 0.026 * s * (0.5 + 0.5 * wink);
        ctx.globalAlpha = (wink - 0.4) * 1.5;
        ctx.strokeStyle = gc;
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
        // The hot heart of the glint.
        ctx.fillStyle = gc;
        ctx.beginPath();
        ctx.arc(gx, gy, gr * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ---- skullgaze: the chest device wakes — two lights kindle in
    // the emblem skull's eye sockets, hold their look, and gutter out
    // on a slow blink. Rides the skull's own geometry; front only,
    // the back never saw it happen.
    if (st.skullgaze && st.emblem === 'skull' && !back) {
      frontPlaneOn();
      const ey = -th * (st.mantle || st.capelet ? 0.3 : 0.58);
      const rs = tw * 0.3 * (st.emblemScale ?? 1) * 1.45;
      // Long waking holds with slow dips — a gaze, not a blinker.
      const wake = Math.min(1, Math.max(0, (Math.sin(nowMs * 0.0007) + 0.55) * 1.6));
      if (wake > 0.05) {
        const flick = 0.86 + 0.14 * Math.sin(nowMs * 0.011);
        const gc2 = st.skullgaze.color;
        for (const exx of [-rs * 0.22, rs * 0.22]) {
          ctx.globalAlpha = wake * 0.3;
          ctx.fillStyle = gc2;
          ctx.beginPath();
          ctx.arc(exx, ey - rs * 0.11, rs * 0.21, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = wake * flick;
          ctx.fillStyle = shade(gc2, 26);
          ctx.fillRect(exx - rs * 0.09, ey - rs * 0.2, rs * 0.18, rs * 0.18);
        }
        ctx.globalAlpha = 1;
      }
      frontPlaneOff();
    }

    // ---- rosettes: watch-fire bosses at the harness points — silver
    // eight-point stars with gem hearts, and the hearts keep a
    // rotation: one flares awake at a time, the way watch fires
    // answer each other down a border wall.
    if (st.rosettes) {
      frontPlaneOn();
      const rm = st.rosettes.metal;
      const rc2 = st.rosettes.color;
      const sites = back
        ? ([[0, -0.84, -1]] as const)
        : ([[-0.68, -0.92, 0], [0.68, -0.92, 1], [0, -0.54, 2]] as const);
      const turn = Math.floor(nowMs / 1700) % 3;
      const ft = (nowMs % 1700) / 1700;
      for (const [gu, gv, idx] of sites) {
        const gx = gu * tw;
        const gy = gv * th;
        const R = 0.042 * s;
        // The star boss: two squares crossed — forged, not stamped.
        ctx.fillStyle = rm;
        ctx.save();
        ctx.translate(gx, gy);
        ctx.fillRect(-R * 0.72, -R * 0.72, R * 1.44, R * 1.44);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = shade(rm, -14);
        ctx.fillRect(-R * 0.72, -R * 0.72, R * 1.44, R * 1.44);
        ctx.restore();
        // The bezel and the gem heart.
        ctx.fillStyle = shade(rm, -30);
        ctx.beginPath();
        ctx.arc(gx, gy, R * 0.52, 0, Math.PI * 2);
        ctx.fill();
        const lit = idx === turn ? Math.sin(ft * Math.PI) : 0;
        ctx.globalAlpha = 0.55 + 0.45 * lit;
        ctx.fillStyle = shade(rc2, lit * 30);
        ctx.beginPath();
        ctx.arc(gx, gy, R * 0.34, 0, Math.PI * 2);
        ctx.fill();
        if (lit > 0.25) {
          // The watch answers: a soft halo while this fire holds.
          ctx.globalAlpha = (lit - 0.25) * 0.5;
          ctx.fillStyle = rc2;
          ctx.beginPath();
          ctx.arc(gx, gy, R * 0.95, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      frontPlaneOff();
    }

    // ---- THE BREACH: the door remembers opening. The breastplate's
    // forge crease is the meeting line of two doors, and on the
    // chest's station in the slow rotation (left arch, CHEST, right
    // arch, crown) a seam of otherlight cracks open down it, blooms,
    // branches, and seals — while it holds, glass motes drift UP out
    // of the light and fade. The far side's gravity, leaking. A
    // pilot thread stays lit between turns; the back keeps only the
    // sealed scar.
    if (st.breach) {
      frontPlaneOn();
      const bc = st.breach.color;
      const y0 = -th * 0.98;
      const y1 = -th * 0.12;
      if (back) {
        ctx.globalAlpha = 0.14;
        ctx.strokeStyle = bc;
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.beginPath();
        ctx.moveTo(0, y0 + th * 0.1);
        ctx.lineTo(0, y1);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        const wake = Math.max(0, Math.sin(nowMs * 0.0009 + 1 * 1.5708) - 0.45) / 0.55;
        // The pilot thread: the seam never goes fully dark.
        ctx.globalAlpha = 0.3 + wake * 0.7;
        ctx.strokeStyle = bc;
        ctx.lineWidth = Math.max(1, s * (0.01 + wake * 0.016));
        ctx.beginPath();
        ctx.moveTo(0, y0);
        ctx.lineTo(0, y1);
        ctx.stroke();
        if (wake > 0.04) {
          // The bloom: a soft light standing off the seam, a hot
          // white core, and the crack BRANCHING — a door forced a
          // finger's width, light finding every flaw in the glass.
          ctx.globalAlpha = wake * 0.3;
          ctx.fillStyle = bc;
          ctx.beginPath();
          ctx.ellipse(0, (y0 + y1) / 2, tw * 0.34, th * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = Math.min(1, wake * 1.1);
          ctx.strokeStyle = shade(bc, 34);
          ctx.lineWidth = Math.max(1, s * 0.01);
          ctx.beginPath();
          ctx.moveTo(0, y0 + th * 0.08);
          ctx.lineTo(0, y1 - th * 0.06);
          ctx.stroke();
          ctx.globalAlpha = wake * 0.85;
          ctx.strokeStyle = shade(bc, 12);
          ctx.lineWidth = Math.max(1, s * 0.009);
          ctx.beginPath();
          ctx.moveTo(0, y0 + th * 0.26);
          ctx.lineTo(tw * 0.3, y0 + th * 0.14);
          ctx.lineTo(tw * 0.44, y0 + th * 0.2);
          ctx.moveTo(0, y0 + th * 0.52);
          ctx.lineTo(-tw * 0.26, y0 + th * 0.62);
          ctx.lineTo(-tw * 0.42, y0 + th * 0.56);
          ctx.moveTo(0, y1 - th * 0.28);
          ctx.lineTo(tw * 0.2, y1 - th * 0.18);
          ctx.stroke();
          // The motes: glass dust falling out of the world, upward.
          for (let mi = 0; mi < 3; mi++) {
            const ph = nowMs * 0.00062 + mi * 0.41;
            const cyc = ph - Math.floor(ph);
            const ma = Math.sin(cyc * Math.PI) * wake;
            if (ma <= 0.06) continue;
            const mx = Math.sin(mi * 2.6 + Math.floor(ph) * 1.7) * tw * 0.3
              + Math.sin(cyc * 4.4 + mi) * 0.014 * s;
            const my = (y0 + y1) / 2 + th * 0.2 - cyc * th * 1.15;
            const mr = (0.012 - cyc * 0.005) * s;
            ctx.globalAlpha = ma * 0.9;
            ctx.fillStyle = shade(bc, 28);
            ctx.beginPath();
            ctx.moveTo(mx, my - mr);
            ctx.lineTo(mx + mr * 0.7, my);
            ctx.lineTo(mx, my + mr);
            ctx.lineTo(mx - mr * 0.7, my);
            ctx.closePath();
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      }
      frontPlaneOff();
    }

    // ---- THE CROWN RING: a broad gilt ring floating about the
    // torso, turning slowly on its own axis. From the front two arcs
    // stand off the flanks (the body hides the rest); from behind the
    // whole circle shows. Three regalia studs ride the rim on the
    // fake-3D depth law — near big and lit, far small and dim — and
    // one glint walks ahead of them. Nothing holds it up.
    if (st.crownring) {
      const cc = st.crownring.color;
      const cyR = -th * 0.6;
      const rxR = tww * 1.66;
      const ryR = th * 0.34;
      const spin = nowMs * 0.00042;
      ctx.lineCap = 'round';
      if (back) {
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = cc;
        ctx.lineWidth = Math.max(1.5, s * 0.024);
        ctx.beginPath();
        ctx.ellipse(0, cyR, rxR, ryR, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // The flank arcs: the ring passes behind the champion.
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = cc;
        ctx.lineWidth = Math.max(1.5, s * 0.024);
        for (const a0 of [-0.62, Math.PI - 0.62] as const) {
          ctx.beginPath();
          ctx.ellipse(0, cyR, rxR, ryR, 0, a0, a0 + 1.24);
          ctx.stroke();
        }
      }
      // The lit crown of the rim — the sun finds the hoop's top.
      ctx.strokeStyle = shade(cc, 30);
      ctx.lineWidth = Math.max(1, s * 0.011);
      ctx.beginPath();
      ctx.ellipse(0, cyR, rxR, ryR, 0, Math.PI + 0.5, Math.PI * 2 - 0.5);
      ctx.stroke();
      // The studs: three regalia points riding the rim in perfect
      // step, each sized and lit by its depth on the turn.
      for (let k = 0; k < 3; k++) {
        const a = spin + (k * Math.PI * 2) / 3;
        const px = Math.cos(a) * rxR;
        const py = cyR + Math.sin(a) * ryR;
        const depth = (Math.sin(a) + 1) / 2;
        // Front-on, the ring lives behind the champion: any stud that
        // would cross the chest is the body's to hide.
        if (!back && Math.abs(px) < tww * 1.02) continue;
        ctx.globalAlpha = 0.5 + 0.5 * depth;
        ctx.fillStyle = shade(cc, 8 + depth * 22);
        ctx.beginPath();
        ctx.arc(px, py, (0.013 + 0.011 * depth) * s, 0, Math.PI * 2);
        ctx.fill();
      }
      // The glint that walks the rim ahead of the studs.
      const ga = spin * 2.3;
      const gpx = Math.cos(ga) * rxR;
      const gpy = cyR + Math.sin(ga) * ryR;
      if (back || Math.abs(gpx) >= tww * 1.02) {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = shade(cc, 40);
        ctx.beginPath();
        ctx.arc(gpx, gpy, 0.014 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.lineCap = 'butt';
    }

    // ---- STORMORBS: three charged orbs orbiting the whole torso —
    // the crown ring's depth law with the ring taken away. Near side
    // big and lit, far side small and dim; where the body stands
    // between orb and eye the orb honestly disappears. Each snaps a
    // static spark on its own beat — charge, never decoration.
    if (st.stormorbs) {
      const oc = st.stormorbs.color;
      const cyO = -th * 0.6;
      const rxO = tww * 1.62;
      const ryO = th * 0.42;
      const spinO = nowMs * 0.00058;
      for (let k = 0; k < 3; k++) {
        const a = spinO + (k * Math.PI * 2) / 3;
        const px = Math.cos(a) * rxO;
        const py = cyO + Math.sin(a) * ryO;
        const depth = (Math.sin(a) + 1) / 2;
        // The far half passes behind the body; the torso hides it.
        if (Math.sin(a) < 0 && Math.abs(px) < tww * 1.08) continue;
        const r = (0.02 + 0.017 * depth) * s;
        // The charge glow breathes around the sphere.
        ctx.globalAlpha = 0.16 + 0.14 * depth;
        ctx.fillStyle = oc;
        ctx.beginPath();
        ctx.arc(px, py, r * 2.1, 0, Math.PI * 2);
        ctx.fill();
        // The sphere: lit by its own depth, hard glint on the crown.
        ctx.globalAlpha = 0.55 + 0.45 * depth;
        ctx.fillStyle = shade(oc, -10 + depth * 26);
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(oc, 44);
        ctx.beginPath();
        ctx.arc(px - r * 0.3, py - r * 0.32, r * 0.32, 0, Math.PI * 2);
        ctx.fill();
        // The snap: a jagged arc jumps off the orb on its own beat.
        const snap = Math.sin(nowMs * 0.0037 + k * 2.3);
        if (snap > 0.93 && !f.hurt) {
          const j = ((snap - 0.93) / 0.07) * 0.9;
          const es = Math.sin(a * 3.1) > 0 ? 1 : -1;
          ctx.globalAlpha = j;
          ctx.strokeStyle = shade(oc, 34);
          ctx.lineWidth = Math.max(1, s * 0.012);
          ctx.beginPath();
          ctx.moveTo(px + es * r * 0.9, py);
          ctx.lineTo(px + es * r * 1.9, py - r * 0.8);
          ctx.lineTo(px + es * r * 1.6, py - r * 0.2);
          ctx.lineTo(px + es * r * 2.6, py - r * 1.1);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    // ---- THE GLYPH RING: a circle of living runes floating about
    // the hips, turning slowly — no hoop holds them; the circle IS
    // the runes keeping formation. Front view the body hides the far
    // side and the flanks carry two standing arcs of script; from
    // behind the whole sentence shows. Every rune rides the rim on
    // the fake-3D depth law, and one glint walks among them.
    if (st.glyphring) {
      const gc = st.glyphring.color;
      const cyG = 0.16 * s;
      const rxG = ww * 1.95;
      const ryG = 0.08 * s;
      const spinG = -nowMs * 0.00034;
      // The whisper of the rim: a thin arc glow tying the script
      // together — light remembering a circle, never a solid hoop.
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = gc;
      ctx.lineWidth = Math.max(1, s * 0.01);
      if (back) {
        ctx.beginPath();
        ctx.ellipse(0, cyG, rxG, ryG, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        for (const a0 of [-0.55, Math.PI - 0.55] as const) {
          ctx.beginPath();
          ctx.ellipse(0, cyG, rxG, ryG, 0, a0, a0 + 1.1);
          ctx.stroke();
        }
      }
      // Eight runes keep the formation. Four strokes of alphabet,
      // recycled with flips so none of them repeats its neighbor.
      for (let k = 0; k < 8; k++) {
        const a = spinG + (k * Math.PI * 2) / 8;
        const px = Math.cos(a) * rxG;
        const py = cyG + Math.sin(a) * ryG;
        const depth = (Math.sin(a) + 1) / 2;
        if (!back && Math.sin(a) < 0 && Math.abs(px) < ww * 1.2) continue;
        const rh = (0.02 + 0.016 * depth) * s;
        const rw = rh * 0.62;
        const fl = k % 2 === 0 ? 1 : -1;
        ctx.globalAlpha = 0.4 + 0.6 * depth;
        ctx.strokeStyle = shade(gc, depth * 26);
        ctx.lineWidth = Math.max(1, s * (0.009 + 0.004 * depth));
        ctx.beginPath();
        switch (k % 4) {
          case 0: // the gate: a bar with a raised threshold
            ctx.moveTo(px - rw, py + rh * 0.5);
            ctx.lineTo(px - rw, py - rh * 0.5);
            ctx.lineTo(px + rw, py - rh * 0.5);
            ctx.lineTo(px + rw, py + rh * 0.5);
            ctx.moveTo(px, py - rh * 0.5);
            ctx.lineTo(px, py + rh * 0.2);
            break;
          case 1: // the bolt: a broken diagonal
            ctx.moveTo(px - rw * fl, py - rh * 0.55);
            ctx.lineTo(px + rw * 0.3 * fl, py - rh * 0.1);
            ctx.lineTo(px - rw * 0.3 * fl, py + rh * 0.1);
            ctx.lineTo(px + rw * fl, py + rh * 0.55);
            break;
          case 2: // the eye: a diamond with a keel
            ctx.moveTo(px, py - rh * 0.55);
            ctx.lineTo(px + rw, py);
            ctx.lineTo(px, py + rh * 0.55);
            ctx.lineTo(px - rw, py);
            ctx.closePath();
            break;
          default: // the branch: a stave with two leaning arms
            ctx.moveTo(px, py - rh * 0.6);
            ctx.lineTo(px, py + rh * 0.6);
            ctx.moveTo(px, py - rh * 0.15);
            ctx.lineTo(px + rw * fl, py - rh * 0.55);
            ctx.moveTo(px, py + rh * 0.25);
            ctx.lineTo(px - rw * fl, py - rh * 0.15);
            break;
        }
        ctx.stroke();
      }
      // The reader: one glint walking the script ahead of the turn.
      const ga2 = spinG * 2.6;
      const gpx = Math.cos(ga2) * rxG;
      const gpy = cyG + Math.sin(ga2) * ryG;
      if (back || Math.sin(ga2) >= 0 || Math.abs(gpx) >= ww * 1.2) {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = shade(gc, 40);
        ctx.beginPath();
        ctx.arc(gpx, gpy, 0.012 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.lineCap = 'butt';
    }
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
