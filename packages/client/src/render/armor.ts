import { markPulse, SLOT_GLINT_PHASE, type ArxMark } from './wornLight.js';
import { itemDef } from '@arx/content';
import { chamferRect } from './shapes.js';
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

  if (st.kind === 'wizard') {
    // THE wizard hat, done properly: a broad down-turned brim, a CHUNKY
    // crown that tapers with gentle concave sides, and the top third
    // slumping over into a BLUNT, thick, rounded tip — mass through the
    // whole bend, never a pinched wisp. The slump breathes on a slow
    // clock so the hat is quietly alive. A cone has no face to lose, so
    // the silhouette holds at every one of the 360 facings.
    const bandY = headY - hh * 0.55;
    const u = -lead; // the bend direction: the crown slumps trailing
    const sway = Math.sin(f.nowMs * 0.0019) * hw * 0.07;
    const tipX = headX + u * (hw * 1.02 + sway);
    const tipY = bandY - hh * 1.42;
    ctx.fillStyle = mc;
    ctx.beginPath();
    // Windward edge: base → concave climb → over the crown apex.
    ctx.moveTo(headX - u * hw * 0.92, bandY);
    ctx.quadraticCurveTo(headX - u * hw * 0.5, bandY - hh * 0.95, headX - u * hw * 0.14, bandY - hh * 1.52);
    // Over the slump to the tip's upper shoulder — thickness held.
    ctx.quadraticCurveTo(headX + u * hw * 0.28, bandY - hh * 1.86, tipX, tipY - hh * 0.3);
    // The BLUNT tip: a rounded end cap, not a point.
    ctx.quadraticCurveTo(tipX + u * hw * 0.26, tipY - hh * 0.12, tipX + u * hw * 0.08, tipY + hh * 0.12);
    // Underside of the slump back into the crown.
    ctx.quadraticCurveTo(headX + u * hw * 0.5, bandY - hh * 1.28, headX + u * hw * 0.62, bandY - hh * 0.85);
    // Bend-side edge down to the base.
    ctx.quadraticCurveTo(headX + u * hw * 0.8, bandY - hh * 0.4, headX + u * hw * 0.92, bandY);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // Hard-shade the bend side — the slump's own shadow half.
      ctx.fillStyle = shade(st.color, -16);
      ctx.beginPath();
      ctx.moveTo(headX, bandY);
      ctx.quadraticCurveTo(headX + u * hw * 0.05, bandY - hh * 0.9, headX - u * hw * 0.02, bandY - hh * 1.45);
      ctx.quadraticCurveTo(headX + u * hw * 0.3, bandY - hh * 1.78, tipX, tipY - hh * 0.28);
      ctx.quadraticCurveTo(tipX + u * hw * 0.24, tipY - hh * 0.1, tipX + u * hw * 0.08, tipY + hh * 0.1);
      ctx.quadraticCurveTo(headX + u * hw * 0.5, bandY - hh * 1.26, headX + u * hw * 0.62, bandY - hh * 0.84);
      ctx.quadraticCurveTo(headX + u * hw * 0.8, bandY - hh * 0.4, headX + u * hw * 0.92, bandY);
      ctx.closePath();
      ctx.fill();
      // The crown's lit ridge — the plane the light actually catches.
      ctx.strokeStyle = shade(st.color, 18);
      ctx.lineWidth = Math.max(1.5, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(headX - u * hw * 0.3, bandY - hh * 0.5);
      ctx.quadraticCurveTo(headX - u * hw * 0.08, bandY - hh * 1.2, headX + u * hw * 0.22, bandY - hh * 1.62);
      ctx.stroke();
      // One soft crease under the slump sells the cloth's weight.
      ctx.strokeStyle = shade(st.color, -26);
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.beginPath();
      ctx.moveTo(headX + u * hw * 0.16, bandY - hh * 1.32);
      ctx.quadraticCurveTo(headX + u * hw * 0.46, bandY - hh * 1.4, tipX - u * hw * 0.14, tipY);
      ctx.stroke();
    }
    // The broad brim, softly down-turned at the edges: a shallow arc
    // slab rather than a flat ellipse — the silhouette that says
    // "weathered wizard", lit on top, shadowed beneath.
    ctx.fillStyle = hurt ? '#ffffff' : shade(st.color, 6);
    ctx.beginPath();
    ctx.moveTo(headX - hw * 1.95, bandY + hh * 0.18);
    ctx.quadraticCurveTo(headX - hw * 1.2, bandY - hh * 0.22, headX, bandY - hh * 0.24);
    ctx.quadraticCurveTo(headX + hw * 1.2, bandY - hh * 0.22, headX + hw * 1.95, bandY + hh * 0.18);
    ctx.quadraticCurveTo(headX + hw * 1.3, bandY + hh * 0.34, headX, bandY + hh * 0.36);
    ctx.quadraticCurveTo(headX - hw * 1.3, bandY + hh * 0.34, headX - hw * 1.95, bandY + hh * 0.18);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // Brim underside shadow.
      ctx.fillStyle = shade(st.color, -24);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 1.8, bandY + hh * 0.2);
      ctx.quadraticCurveTo(headX, bandY + hh * 0.42, headX + hw * 1.8, bandY + hh * 0.2);
      ctx.quadraticCurveTo(headX + hw * 1.2, bandY + hh * 0.32, headX, bandY + hh * 0.34);
      ctx.quadraticCurveTo(headX - hw * 1.2, bandY + hh * 0.32, headX - hw * 1.8, bandY + hh * 0.2);
      ctx.closePath();
      ctx.fill();
      // Band + charm buckle above the brim, tracking the face.
      ctx.fillStyle = st.trim;
      ctx.fillRect(headX - hw * 0.8, bandY - hh * 0.42, hw * 1.6, hh * 0.22);
      if (backK <= 0.55 && st.charm) {
        const bxx = headX + fx * headR * 0.36;
        ctx.fillStyle = st.charm;
        ctx.beginPath();
        chamferRect(ctx, bxx - headR * 0.09, bandY - hh * 0.46, headR * 0.18, headR * 0.26, headR * 0.05);
        ctx.fill();
      }
      // A single faint star winks near the tip — the aura, whispered.
      const wink = 0.25 + 0.45 * Math.max(0, Math.sin(f.nowMs * 0.0016 + 1.2));
      ctx.globalAlpha = wink;
      ctx.fillStyle = st.charm ?? '#e8d06a';
      const sxx = tipX + u * hw * 0.34;
      const syy = tipY - hh * 0.5;
      ctx.beginPath();
      ctx.moveTo(sxx, syy - hh * 0.12);
      ctx.lineTo(sxx + hw * 0.08, syy);
      ctx.lineTo(sxx, syy + hh * 0.12);
      ctx.lineTo(sxx - hw * 0.08, syy);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      if (st.arcs) {
        // The storm in the hat: the tempest shells' word consumed by
        // the wizard cone — an arc snaps from the windward brim tip
        // up the crown to the slumped point on its own beat, and
        // between snaps a charge glint keeps the current honest.
        const arcC = st.arcs.color;
        const beat = Math.sin(f.nowMs * 0.0029 + 0.7);
        const bx0 = headX - u * hw * 1.88;
        const by0 = bandY + hh * 0.14;
        if (beat > 0.88) {
          const j = (beat - 0.88) / 0.12;
          ctx.globalAlpha = j;
          ctx.strokeStyle = arcC;
          ctx.lineWidth = Math.max(1, s * 0.014);
          ctx.beginPath();
          ctx.moveTo(bx0, by0);
          for (let k2 = 1; k2 <= 4; k2++) {
            const t2 = k2 / 4;
            const jag = Math.sin(f.nowMs * 0.05 + k2 * 2.7) * hw * 0.16;
            ctx.lineTo(
              bx0 + (tipX - bx0) * t2 + jag,
              by0 + (tipY - by0) * t2 - Math.sin(t2 * Math.PI) * hh * 0.3,
            );
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else {
          const charge = 0.3 + 0.4 * Math.max(0, beat);
          ctx.globalAlpha = charge;
          ctx.fillStyle = shade(arcC, 20);
          ctx.beginPath();
          ctx.arc(tipX + u * hw * 0.08, tipY, s * 0.013, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }
    return;
  }

  if (st.kind === 'magus') {
    // THE MAGUS HAT — the duskwarden silhouette: the wizard cone's
    // worldly cousin. A broader brim bent by real weather (upturned
    // at the tips, one wave through each side), a taller, thinner
    // spire with a harder crook, and a brass band carrying a cut gem
    // cluster. Dark cloth under ONE BRIGHT EDGE: the brim's lit rim
    // is what keeps midnight legible on midnight.
    const bandY = headY - hh * 0.55;
    const u = -lead;
    const sway = Math.sin(f.nowMs * 0.0017) * hw * 0.09;
    const tipX = headX + u * (hw * 1.38 + sway);
    const tipY = bandY - hh * 1.78;
    // THE ONE SWEEP: a single unbroken bell from brim to crook —
    // the foot flares wide into the brim, no vertical edge (the
    // Black Mage read; the square-step base is dead family-wide).
    const spire = (): void => {
      ctx.moveTo(headX - u * hw * 1.14, bandY + hh * 0.06);
      ctx.quadraticCurveTo(headX - u * hw * 0.82, bandY - hh * 0.36, headX - u * hw * 0.46, bandY - hh * 0.9);
      ctx.quadraticCurveTo(headX - u * hw * 0.18, bandY - hh * 1.46, headX - u * hw * 0.02, bandY - hh * 1.68);
      // Over the crook — the spire commits harder than the cone does.
      ctx.quadraticCurveTo(headX + u * hw * 0.3, bandY - hh * 2.08, tipX, tipY - hh * 0.22);
      // A pinched, dropped point — road-worn, never a wisp.
      ctx.quadraticCurveTo(tipX + u * hw * 0.18, tipY - hh * 0.04, tipX + u * hw * 0.02, tipY + hh * 0.14);
      ctx.quadraticCurveTo(headX + u * hw * 0.46, bandY - hh * 1.4, headX + u * hw * 0.56, bandY - hh * 0.9);
      ctx.quadraticCurveTo(headX + u * hw * 0.92, bandY - hh * 0.32, headX + u * hw * 1.14, bandY + hh * 0.06);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    spire();
    ctx.fill();
    if (!hurt) {
      // The crook side folds dark; the windward ridge takes the moon.
      ctx.fillStyle = shade(st.color, -14);
      ctx.beginPath();
      ctx.moveTo(headX, bandY + hh * 0.05);
      ctx.quadraticCurveTo(headX + u * hw * 0.04, bandY - hh * 0.95, headX - u * hw * 0.01, bandY - hh * 1.56);
      ctx.quadraticCurveTo(headX + u * hw * 0.3, bandY - hh * 2.0, tipX, tipY - hh * 0.2);
      ctx.quadraticCurveTo(tipX + u * hw * 0.16, tipY - hh * 0.03, tipX + u * hw * 0.02, tipY + hh * 0.12);
      ctx.quadraticCurveTo(headX + u * hw * 0.46, bandY - hh * 1.38, headX + u * hw * 0.56, bandY - hh * 0.88);
      ctx.quadraticCurveTo(headX + u * hw * 0.92, bandY - hh * 0.32, headX + u * hw * 1.14, bandY + hh * 0.06);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shade(st.color, 16);
      ctx.lineWidth = Math.max(1.5, s * 0.018);
      ctx.beginPath();
      ctx.moveTo(headX - u * hw * 0.26, bandY - hh * 0.5);
      ctx.quadraticCurveTo(headX - u * hw * 0.05, bandY - hh * 1.25, headX + u * hw * 0.26, bandY - hh * 1.72);
      ctx.stroke();
      // One crease under the crook — the weather left its writing.
      ctx.strokeStyle = shade(st.color, -24);
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(headX + u * hw * 0.14, bandY - hh * 1.44);
      ctx.quadraticCurveTo(headX + u * hw * 0.5, bandY - hh * 1.56, tipX - u * hw * 0.1, tipY + hh * 0.02);
      ctx.stroke();
    }
    // THE BRIM: broader than the wizard's, waved through each side,
    // tips turned UP — a slab that has argued with weather and won.
    // Blunt tips (the whisker law) and the edge clipped into the
    // cloth.
    const slab = (): void => {
      ctx.moveTo(headX - hw * 2.45, bandY - hh * 0.12);
      ctx.quadraticCurveTo(headX - hw * 1.7, bandY + hh * 0.26, headX - hw * 0.9, bandY - hh * 0.1);
      ctx.quadraticCurveTo(headX, bandY - hh * 0.3, headX + hw * 0.9, bandY - hh * 0.1);
      ctx.quadraticCurveTo(headX + hw * 1.7, bandY + hh * 0.26, headX + hw * 2.45, bandY - hh * 0.12);
      ctx.lineTo(headX + hw * 2.45, bandY + hh * 0.06);
      ctx.quadraticCurveTo(headX + hw * 1.6, bandY + hh * 0.44, headX, bandY + hh * 0.4);
      ctx.quadraticCurveTo(headX - hw * 1.6, bandY + hh * 0.44, headX - hw * 2.45, bandY + hh * 0.06);
      ctx.closePath();
    };
    ctx.fillStyle = hurt ? '#ffffff' : shade(st.color, 4);
    ctx.beginPath();
    slab();
    ctx.fill();
    if (!hurt) {
      // Brim underside shadow, and THE ONE BRIGHT EDGE along the rim.
      ctx.fillStyle = shade(st.color, -26);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 2.3, bandY + hh * 0.02);
      ctx.quadraticCurveTo(headX, bandY + hh * 0.48, headX + hw * 2.3, bandY + hh * 0.02);
      ctx.quadraticCurveTo(headX + hw * 1.5, bandY + hh * 0.38, headX, bandY + hh * 0.36);
      ctx.quadraticCurveTo(headX - hw * 1.5, bandY + hh * 0.38, headX - hw * 2.3, bandY + hh * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      slab();
      ctx.clip();
      ctx.strokeStyle = shade(st.color, 26);
      ctx.lineWidth = Math.max(1, s * 0.013) * 2;
      ctx.beginPath();
      ctx.moveTo(headX - hw * 2.45, bandY - hh * 0.12);
      ctx.quadraticCurveTo(headX - hw * 1.7, bandY + hh * 0.26, headX - hw * 0.9, bandY - hh * 0.1);
      ctx.quadraticCurveTo(headX, bandY - hh * 0.3, headX + hw * 0.9, bandY - hh * 0.1);
      ctx.quadraticCurveTo(headX + hw * 1.7, bandY + hh * 0.26, headX + hw * 2.45, bandY - hh * 0.12);
      ctx.stroke();
      ctx.restore();
      // The brass band WRAPS the cone — a curved strip clipped into
      // the sweep, never a straight rect — and the gem cluster
      // tracks the face.
      ctx.save();
      ctx.beginPath();
      spire();
      ctx.clip();
      ctx.fillStyle = st.trim;
      ctx.beginPath();
      ctx.moveTo(headX - hw * 1.08, bandY - hh * 0.46);
      ctx.quadraticCurveTo(headX, bandY - hh * 0.34, headX + hw * 1.08, bandY - hh * 0.46);
      ctx.lineTo(headX + hw * 1.08, bandY - hh * 0.1);
      ctx.quadraticCurveTo(headX, bandY + hh * 0.02, headX - hw * 1.08, bandY - hh * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (backK <= 0.55 && st.gem) {
        const gx = headX + fx * headR * 0.34;
        const gCol = st.gem.color;
        for (const [du, dr] of [[0, 0.11], [-0.24, 0.075], [0.22, 0.07]] as const) {
          const gx2 = gx + du * headR;
          const gy2 = bandY - hh * 0.32;
          ctx.fillStyle = shade(st.trim, -26);
          ctx.beginPath();
          ctx.arc(gx2, gy2, headR * dr * 1.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = gCol;
          ctx.beginPath();
          ctx.moveTo(gx2, gy2 - headR * dr);
          ctx.lineTo(gx2 + headR * dr * 0.8, gy2);
          ctx.lineTo(gx2, gy2 + headR * dr);
          ctx.lineTo(gx2 - headR * dr * 0.8, gy2);
          ctx.closePath();
          ctx.fill();
        }
        // The center stone keeps a slow watch-fire pulse.
        const wk = 0.4 + 0.6 * Math.max(0, Math.sin(f.nowMs * 0.0013));
        ctx.globalAlpha = wk * 0.5;
        ctx.fillStyle = st.gem.color;
        ctx.beginPath();
        ctx.arc(gx, bandY - hh * 0.32, headR * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    return;
  }

  if (st.kind === 'circlet') {
    // A brow band + center gem over the hair — hair stays visible.
    ctx.fillStyle = mc;
    ctx.fillRect(headX - hw * 1.02, headY - hh * 0.62, hw * 2.04, headR * 0.18);
    if (!hurt && backK <= 0.55) {
      ctx.fillStyle = st.trim;
      const gx = headX + fx * headR * 0.36;
      ctx.beginPath();
      chamferRect(ctx, gx - headR * 0.11, headY - hh * 0.68, headR * 0.22, headR * 0.24, headR * 0.06);
      ctx.fill();
    }
    if (st.icicles && !hurt) {
      // The frozen crown: spears hanging off the band, long at the
      // temples and short over the eyes — the cold never blinds its
      // own court. Two facets each; ice is glass, not chalk.
      const ice = st.icicles.color;
      const by = headY - hh * 0.62 + headR * 0.16;
      for (let i = 0; i < 5; i++) {
        const u = -0.82 + i * 0.41;
        const ix = headX + u * hw;
        const len =
          headR * (0.3 + 0.14 * Math.sin(i * 2.2 + 0.6)) * (Math.abs(u) > 0.5 ? 1.3 : 0.62);
        ctx.fillStyle = ice;
        ctx.beginPath();
        ctx.moveTo(ix - headR * 0.055, by);
        ctx.lineTo(ix + headR * 0.055, by);
        ctx.lineTo(ix + headR * 0.012, by + len);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(ice, -24);
        ctx.beginPath();
        ctx.moveTo(ix + headR * 0.002, by);
        ctx.lineTo(ix + headR * 0.055, by);
        ctx.lineTo(ix + headR * 0.012, by + len);
        ctx.closePath();
        ctx.fill();
      }
      // One winking glint at the lit temple.
      const wk = Math.max(0, Math.sin(f.nowMs * 0.0015));
      if (wk > 0.2) {
        ctx.globalAlpha = 0.4 + 0.6 * wk;
        ctx.fillStyle = shade(ice, 40);
        ctx.fillRect(headX - hw * 0.86, by + headR * 0.12, s * 0.014, s * 0.014);
        ctx.globalAlpha = 1;
      }
    }
    if (st.orbitals && !hurt) {
      // The diadem that keeps time: a thin ring round the crown and
      // two small worlds walking it — near side big and lit, far side
      // small and dimmed. Depth drawn as size, the fake-3D law.
      const ringCol = st.orbitals.ring ?? shade(st.orbitals.color, -22);
      const oy = headY - hh * 0.85;
      const rx = hw * 1.24;
      const ry = hh * 0.26;
      ctx.strokeStyle = ringCol;
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.ellipse(headX, oy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (const ph of [0, Math.PI]) {
        const a = f.nowMs * 0.0011 + ph;
        const behind = Math.sin(a) < 0;
        const px = headX + Math.cos(a) * rx;
        const py = oy + Math.sin(a) * ry;
        const r2 = s * (behind ? 0.013 : 0.021);
        ctx.fillStyle = behind ? shade(st.orbitals.color, -26) : st.orbitals.color;
        ctx.beginPath();
        ctx.arc(px, py, r2, 0, Math.PI * 2);
        ctx.fill();
        if (!behind) {
          ctx.fillStyle = shade(st.orbitals.color, 36);
          ctx.beginPath();
          ctx.arc(px - r2 * 0.3, py - r2 * 0.3, r2 * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    return;
  }

  if (st.kind === 'veil') {
    // THE VEIL — the gloamsight face: the cowl's shell grammar with
    // the window REFUSED. Where every hood opens, this one hangs a
    // sculpted curtain: a smooth cloth plane with nothing behind it
    // but two amber points where the eyes should be. Swept temple
    // wings (the fins word, consumed as the veil's crest) ride the
    // crown; a gold brow band seats the curtain. The opening-anchor
    // law still holds — the blank face tracks the facing and narrows
    // into the profile exactly like the face it refuses to show.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.78 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.62;
    const oBot = headY + hh * 0.86;
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.26, headY + hh * 1.2);
      ctx.quadraticCurveTo(headX + lead * hw * 1.32, headY + hh * 0.2, headX + lead * hw * 1.14, headY - hh * 0.55);
      ctx.quadraticCurveTo(headX + lead * hw * 1.05, headY - hh * 1.28, headX + lead * hw * 0.3, headY - hh * 1.34);
      ctx.quadraticCurveTo(headX - lead * hw * (0.9 + t * 0.4), headY - hh * 1.38, headX - lead * hw * (1.12 + t * 0.5), headY - hh * 0.62);
      ctx.quadraticCurveTo(headX - lead * hw * (1.28 + t * 0.45), headY + hh * 0.15, headX - lead * hw * 1.26, headY + hh * 1.2);
      ctx.quadraticCurveTo(headX, headY + hh * 1.42, headX + lead * hw * 1.26, headY + hh * 1.2);
      ctx.closePath();
    };
    // The temple wings paint FIRST so their roots tuck under the
    // shell — swept gold blades climbing back off the temples, each
    // under THE ONE BRIGHT EDGE.
    if (st.fins && !hurt) {
      const wc = st.fins.color;
      for (const es of [-1, 1]) {
        const sw2 = es !== lead ? 1 : 0.85;
        const ax = headX + es * hw * 0.92;
        const ay = headY - hh * 0.42;
        const tx = ax + es * hw * 0.85 * sw2;
        const ty = ay - hh * 1.3;
        ctx.fillStyle = shade(wc, es === lead ? 4 : -10);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(ax + es * hw * 0.72, ay - hh * 0.5, tx, ty);
        ctx.quadraticCurveTo(ax + es * hw * 0.14, ay - hh * 0.62, ax - es * hw * 0.14, ay - hh * 0.14);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(wc, 34);
        ctx.lineWidth = Math.max(1, s * 0.013);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(ax + es * hw * 0.72, ay - hh * 0.5, tx, ty);
        ctx.stroke();
      }
    }
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      ctx.clip();
      // The torso's own form split, and the crown's lit fold.
      ctx.fillStyle = shade(st.color, -13);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 1.6, hw * 2.4, hh * 3.2);
      ctx.strokeStyle = shade(st.color, 16);
      ctx.lineWidth = Math.max(1.5, s * 0.024);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.72, headY - hh * 0.78);
      ctx.quadraticCurveTo(headX, headY - hh * 1.52, headX + hw * 0.72, headY - hh * 0.78);
      ctx.stroke();
      ctx.restore();
      if (front) {
        // THE CURTAIN: the sculpted blank where a face would be — a
        // plane lit a step above the shell so it reads as a surface
        // presented, not a hole. Three gravity creases; no eyes, no
        // mouth, no argument.
        ctx.fillStyle = shade(st.color, 9);
        ctx.beginPath();
        chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
        ctx.clip();
        ctx.strokeStyle = shade(st.color, -12);
        ctx.lineWidth = Math.max(1, s * 0.011);
        for (const du of [-0.45, 0.05, 0.5]) {
          ctx.beginPath();
          ctx.moveTo(cx + du * ohw, oTop + hh * 0.34);
          ctx.quadraticCurveTo(cx + du * ohw * 1.3, headY + hh * 0.2, cx + du * ohw * 0.8, oBot - hh * 0.1);
          ctx.stroke();
        }
        // The curtain's own lit edge on the leading rim.
        ctx.strokeStyle = shade(st.color, 24);
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(cx + ohw * 0.92, oTop + hh * 0.1);
        ctx.lineTo(cx + ohw * 0.92, oBot - hh * 0.12);
        ctx.stroke();
        ctx.restore();
        // The brow band seats the curtain in gold.
        ctx.fillStyle = st.trim;
        ctx.fillRect(cx - ohw * 1.02, oTop - headR * 0.04, ohw * 2.04, headR * 0.12);
        // The hidden gaze: two amber points burning where eyes
        // should be, breathing on the ember clock — the only proof
        // of tenancy the veil offers.
        if (st.emberEyes) {
          const pulse = 0.6 + 0.4 * Math.sin(f.nowMs * 0.0016);
          const ey = headY + hh * 0.02;
          for (const es of [-1, 1]) {
            const wK = es !== lead ? Math.max(0, 1 - t * 1.4) : 1;
            if (wK <= 0.05) continue;
            const px = cx + es * ohw * 0.42;
            ctx.globalAlpha = 0.3 * pulse * wK;
            ctx.fillStyle = st.emberEyes.color;
            ctx.beginPath();
            ctx.arc(px, ey, hw * 0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = (0.8 + 0.2 * pulse) * wK;
            ctx.fillStyle = shade(st.emberEyes.color, 30);
            ctx.fillRect(px - hw * 0.1, ey - hw * 0.035, hw * 0.2, hw * 0.07);
          }
          ctx.globalAlpha = 1;
        }
      }
    }
    return;
  }

  if (st.kind === 'hood') {
    // A TRUE cowl — the traveler's hood: one continuous shell that
    // owns the whole skull, with the face opening cut clean through
    // it (even-odd). Three commitments the old rounded dome never
    // made:
    //   THE POINT — the crown pitches up an angular slope and folds
    //   over into a drooping swept peak off the trailing crown, alive
    //   on a slow sway. A hood is cut from a triangle of cloth; the
    //   point is the proof, at EVERY facing, not just profile.
    //   THE BROW RIDGE — the leading edge juts past the face line
    //   into an overhang, and that overhang casts a REAL shadow band
    //   down onto the face. The hooded read IS the shadow.
    //   THE MANTLE — the hem flares wide and sags onto the shoulders
    //   as a true shoulder cape.
    // The opening still tracks the face bands and commits to the
    // profile: it presses into the leading edge and narrows, a tunnel
    // seen from the side, never a pasted window.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.74 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.6;
    const oBot = headY + hh * 0.84;
    // The peak: apex over the trailing crown, tip drooping past the
    // shell's own silhouette, swaying on the cloth's slow clock.
    const sway = Math.sin(f.nowMs * 0.0016) * hw * 0.06;
    const apexX = headX - lead * hw * (0.3 + t * 0.18);
    const apexY = headY - hh * (1.54 + t * 0.06);
    const tipX = headX - lead * (hw * (1.42 + t * 0.55) + sway);
    const tipY = headY - hh * (0.92 - t * 0.04) + sway * 0.4;
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.26, headY + hh * 1.2);
      // Leading edge up the jaw, kicking OUT into the brow ridge —
      // the visor line every road hood keeps.
      ctx.quadraticCurveTo(headX + lead * hw * 1.34, headY + hh * 0.22, headX + lead * hw * 1.18, headY - hh * 0.48);
      ctx.quadraticCurveTo(headX + lead * hw * 1.26, headY - hh * 0.84, headX + lead * hw * 0.86, headY - hh * 1.14);
      // The angular climb: brow ridge up the pitched slope to the
      // apex — cloth over a skull, never a dome.
      ctx.quadraticCurveTo(headX + lead * hw * 0.34, headY - hh * 1.44, apexX, apexY);
      // THE POINT: the crown folds over and droops into the tip.
      ctx.quadraticCurveTo(headX - lead * hw * (0.98 + t * 0.35), apexY + hh * 0.02, tipX, tipY);
      // The point's underside returns into the trailing drape — the
      // fold that says the tip hangs, not sticks.
      ctx.quadraticCurveTo(headX - lead * hw * (1.0 + t * 0.28), headY - hh * 0.56, headX - lead * hw * (1.26 + t * 0.38), headY - hh * 0.2);
      // Trailing drape to the hem.
      ctx.quadraticCurveTo(headX - lead * hw * (1.4 + t * 0.34), headY + hh * 0.34, headX - lead * hw * 1.34, headY + hh * 1.2);
      // The mantle: the hem sags wide onto the shoulders.
      ctx.quadraticCurveTo(headX, headY + hh * 1.5, headX + lead * hw * 1.26, headY + hh * 1.2);
      ctx.closePath();
    };
    const opening = () => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      // Cloth planes, clipped to the shell — the hole in the clip keeps
      // every shading pass off the face automatically.
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      // Trailing-half shade — the same split the torso lives by.
      ctx.fillStyle = shade(st.color, -13);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 1.6, hw * 2.4, hh * 3.2);
      // The pitched slope's lit ridge: brow ridge up toward the apex
      // — the light lands on the slope, not on a dome that isn't
      // there anymore.
      ctx.strokeStyle = shade(st.color, 16);
      ctx.lineWidth = Math.max(1.5, s * 0.024);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 0.78, headY - hh * 1.0);
      ctx.quadraticCurveTo(headX + lead * hw * 0.26, headY - hh * 1.36, apexX + lead * hw * 0.1, apexY + hh * 0.1);
      ctx.stroke();
      // The fold under the point: where the crown breaks over and
      // the tip starts to hang — the crease that sells the drape.
      ctx.strokeStyle = shade(st.color, -24);
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.beginPath();
      ctx.moveTo(apexX - lead * hw * 0.06, apexY + hh * 0.16);
      ctx.quadraticCurveTo(headX - lead * hw * (0.92 + t * 0.3), headY - hh * 0.92, tipX + lead * hw * 0.16, tipY - hh * 0.04);
      ctx.stroke();
      // One crease down the trailing drape — cloth remembers gravity.
      ctx.beginPath();
      ctx.moveTo(headX - lead * hw * 0.6, headY - hh * 0.7);
      ctx.quadraticCurveTo(headX - lead * hw * (0.95 + t * 0.25), headY - hh * 0.1, headX - lead * hw * 0.9, headY + hh * 0.9);
      ctx.stroke();
      ctx.restore();
      if (front) {
        // THE OVERHANG SHADOW: the brow ridge juts past the face, and
        // the face pays for it — a soft dark band under the rim,
        // deepest at the top, thinning to nothing by the eye line.
        // Painted INSIDE the opening, on the face itself: this is the
        // hooded read, and no rim stroke can fake it.
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        const shGrad = ctx.createLinearGradient(0, oTop, 0, headY + hh * 0.04);
        shGrad.addColorStop(0, 'rgba(24, 15, 26, 0.5)');
        shGrad.addColorStop(1, 'rgba(24, 15, 26, 0)');
        ctx.fillStyle = shGrad;
        ctx.fillRect(cx - ohw, oTop, ohw * 2, hh * 0.66);
        ctx.restore();
        // The opening reads as depth: shadow just inside the rim, the
        // rolled hem edge on it, and the trim bar across the brow.
        ctx.strokeStyle = 'rgba(24, 15, 26, 0.32)';
        ctx.lineWidth = Math.max(2, s * 0.034);
        ctx.beginPath();
        chamferRect(ctx, cx - ohw + s * 0.012, oTop + s * 0.012, (ohw - s * 0.012) * 2, oBot - oTop - s * 0.024, cut * 0.7);
        ctx.stroke();
        ctx.strokeStyle = shade(st.color, 20);
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        opening();
        ctx.stroke();
        ctx.fillStyle = st.trim;
        ctx.fillRect(cx - ohw * 0.98, oTop - headR * 0.05, ohw * 1.96, headR * 0.1);
        if (st.gem) {
          // A cut gem at the brow, tracking the face like the eyes do
          // and deepening with the opening at profile.
          const gx = headX + fx * headR * (0.36 + 0.24 * t);
          ctx.fillStyle = st.gem.color;
          ctx.beginPath();
          ctx.moveTo(gx, headY - hh * 0.8);
          ctx.lineTo(gx + headR * 0.1, headY - hh * 0.62);
          ctx.lineTo(gx, headY - hh * 0.44);
          ctx.lineTo(gx - headR * 0.1, headY - hh * 0.62);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = shade(st.gem.color, 36);
          ctx.fillRect(gx - headR * 0.03, headY - hh * 0.74, headR * 0.06, headR * 0.06);
        }
        if (st.fangs) {
          // The adder's own: two dry fangs hanging at the mouth of the
          // opening, points down, each seated in a dark root so they
          // read as SEWN ON, not painted. Fat enough to survive zoom.
          const fCol = st.fangs.color;
          for (const es of [-1, 1]) {
            const fxx = cx + es * ohw * 0.55;
            const fw = headR * 0.09;
            const fl = hh * 0.3;
            ctx.fillStyle = shade(fCol, -28);
            ctx.fillRect(fxx - fw * 0.7, oTop - headR * 0.02, fw * 1.4, headR * 0.07);
            ctx.fillStyle = fCol;
            ctx.beginPath();
            ctx.moveTo(fxx - fw * 0.6, oTop + headR * 0.04);
            ctx.lineTo(fxx + fw * 0.6, oTop + headR * 0.04);
            ctx.lineTo(fxx + es * fw * 0.2, oTop + fl);
            ctx.closePath();
            ctx.fill();
            // The curve's shadow side — a fang is round, not flat.
            ctx.fillStyle = shade(fCol, -16);
            ctx.beginPath();
            ctx.moveTo(fxx + es * fw * 0.6, oTop + headR * 0.04);
            ctx.lineTo(fxx + es * fw * 0.2, oTop + fl);
            ctx.lineTo(fxx + es * fw * 0.05, oTop + fl * 0.55);
            ctx.closePath();
            ctx.fill();
          }
        }
        if (st.blooms) {
          // Moonbell blooms tucked at the leading temple: two bell
          // flowers nodding off short arced stems, mouths down — the
          // meadow picked and worn. The far one sits smaller.
          const bCol = st.blooms.color;
          const bx0 = cx + lead * ohw * 0.92;
          const by0 = oTop - headR * 0.02;
          ctx.strokeStyle = shade(st.color, 26);
          ctx.lineWidth = Math.max(1, s * 0.012);
          const bloom = (bx: number, by: number, r: number, nod: number) => {
            // Stem first, arcing up and over.
            ctx.beginPath();
            ctx.moveTo(bx - lead * r * 1.6, by + r * 0.8);
            ctx.quadraticCurveTo(bx - lead * r * 0.4, by - r * 2.2, bx, by - r * 0.9);
            ctx.stroke();
            // The bell: flared cup hanging mouth-down, lip scalloped.
            ctx.fillStyle = bCol;
            ctx.beginPath();
            ctx.moveTo(bx - r * 0.55, by - r * 0.9);
            ctx.quadraticCurveTo(bx, by - r * 1.5, bx + r * 0.55, by - r * 0.9);
            ctx.lineTo(bx + r * 0.8 + nod, by + r * 0.5);
            ctx.quadraticCurveTo(bx + nod, by + r * 0.15, bx - r * 0.8 + nod, by + r * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = shade(bCol, -18);
            ctx.beginPath();
            ctx.moveTo(bx + nod, by + r * 0.28);
            ctx.lineTo(bx + r * 0.8 + nod, by + r * 0.5);
            ctx.quadraticCurveTo(bx + nod, by + r * 0.15, bx - r * 0.8 + nod, by + r * 0.5);
            ctx.closePath();
            ctx.fill();
          };
          bloom(bx0, by0 - headR * 0.1, headR * 0.2, headR * 0.03);
          bloom(bx0 - lead * headR * 0.3, by0 - headR * 0.28, headR * 0.14, -headR * 0.02);
        }
      } else {
        // From behind, the drape tail: the point every hood hangs from.
        ctx.fillStyle = shade(st.color, -10);
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.36, headY + hh * 0.9);
        ctx.lineTo(headX + hw * 0.36, headY + hh * 0.9);
        ctx.lineTo(headX + lead * hw * 0.1, headY + hh * 1.95);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(st.color, -22);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(headX, headY - hh * 1.05);
        ctx.lineTo(headX + lead * hw * 0.08, headY + hh * 0.85);
        ctx.stroke();
      }
    }
    if (st.antlers && !hurt) {
      // Branched antlers off the crown: one main beam each side with
      // two tines, stroked round so they read as bone, not wire. The
      // far beam narrows with the facing like the far eye.
      ctx.strokeStyle = st.antlers.color;
      ctx.lineCap = 'round';
      for (const es of [-1, 1]) {
        const far = es !== lead;
        const wK = far ? Math.max(0.3, 1 - profileK * 0.65) : 1;
        const bx = headX + es * hw * 0.62;
        const by = headY - hh * 0.95;
        const mx = bx + es * hw * 0.55 * wK;
        const my = by - hh * 0.62;
        const txx = bx + es * hw * 1.3 * wK;
        const tyy = by - hh * 1.35;
        ctx.lineWidth = Math.max(2, s * 0.032);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(mx, my, txx, tyy);
        ctx.stroke();
        ctx.lineWidth = Math.max(1.5, s * 0.024);
        ctx.beginPath();
        ctx.moveTo(bx + es * hw * 0.3 * wK, by - hh * 0.38);
        ctx.lineTo(bx + es * hw * 0.16 * wK, by - hh * 0.95);
        ctx.moveTo(bx + es * hw * 0.88 * wK, by - hh * 0.95);
        ctx.lineTo(bx + es * hw * 0.78 * wK, by - hh * 1.5);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
    if (st.ears && !hurt) {
      // Pricked ears on the crown; dark inner ear when frontal. The
      // tall variant is the hare: long upright blades, a touch closer
      // to center. A tip color claims the top third — hare and fox
      // ears alike are black-tipped, and the tip is what sells them.
      const tall = st.ears.tall ? 1.75 : 1;
      for (const es of [-1, 1]) {
        const far = es !== lead;
        const wK = far ? Math.max(0.3, 1 - profileK * 0.65) : 1;
        const bx = headX + es * hw * (st.ears.tall ? 0.46 : 0.58);
        const by = headY - hh * 1.02;
        const ax = bx + es * hw * 0.14 * wK;
        const ay = by - hh * 0.62 * tall;
        ctx.fillStyle = st.ears.color;
        ctx.beginPath();
        ctx.moveTo(bx - es * hw * 0.26 * wK, by);
        ctx.lineTo(ax, ay);
        ctx.lineTo(bx + es * hw * 0.36 * wK, by + hh * 0.06);
        ctx.closePath();
        ctx.fill();
        if (st.ears.tip) {
          // The tip triangle: apex down 35% of each edge — a clean
          // color break, never a stroked outline.
          ctx.fillStyle = st.ears.tip;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax + (bx - es * hw * 0.26 * wK - ax) * 0.35, ay + (by - ay) * 0.35);
          ctx.lineTo(ax + (bx + es * hw * 0.36 * wK - ax) * 0.35, ay + (by + hh * 0.06 - ay) * 0.35);
          ctx.closePath();
          ctx.fill();
        }
        if (backK <= 0.55) {
          ctx.fillStyle = shade(st.ears.color, -26);
          ctx.beginPath();
          ctx.moveTo(bx - es * hw * 0.1 * wK, by - hh * 0.04);
          ctx.lineTo(bx + es * hw * 0.12 * wK, by - hh * 0.42 * tall);
          ctx.lineTo(bx + es * hw * 0.22 * wK, by);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    if (st.antennae && !hurt) {
      // Moth antennae: two bold curled feelers off the crown with
      // clubbed tips, swaying on their own clock — thin reads as wire,
      // so these are stroked fat and round-capped.
      ctx.strokeStyle = st.antennae.color;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1.5, s * 0.026);
      const sway = Math.sin(f.nowMs * 0.0031) * hw * 0.05;
      for (const es of [-1, 1]) {
        const far = es !== lead;
        const wK = far ? Math.max(0.35, 1 - profileK * 0.6) : 1;
        const bx = headX + es * hw * 0.34;
        const by = headY - hh * 1.0;
        const txx = bx + es * hw * 0.72 * wK + sway * es;
        const tyy = by - hh * 0.98;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + es * hw * 0.05 * wK, by - hh * 0.75, txx, tyy);
        ctx.stroke();
        ctx.fillStyle = st.antennae.color;
        ctx.beginPath();
        ctx.arc(txx, tyy, hw * 0.11 * (far ? wK : 1), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.lineCap = 'butt';
    }
    if (st.ruff && !hurt) {
      // A lumpy fur ruff. From the front it RINGS THE FACE OPENING —
      // fur trim on the cowl's hem, framing the face in winter; from
      // behind it stays a band across the crown of the hood.
      ctx.fillStyle = st.ruff.color;
      if (front) {
        // Across the brow hem, hugging the opening's top edge.
        for (let i = 0; i < 5; i++) {
          const u = -1 + i * 0.5;
          const r = (0.05 + 0.013 * Math.sin(i * 2.7)) * hw * 2;
          ctx.beginPath();
          ctx.arc(cx + u * ohw * 1.02, oTop + Math.sin(i * 1.9) * hh * 0.05, r, 0, Math.PI * 2);
          ctx.fill();
        }
        // Down the opening's sides, past the cheeks.
        for (const es of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(cx + es * ohw * 1.05, headY + hh * 0.05, hw * 0.15, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = shade(st.ruff.color, -14);
          ctx.beginPath();
          ctx.arc(cx + es * ohw * 1.02, headY + hh * 0.52, hw * 0.13, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = st.ruff.color;
        }
      } else {
        for (let i = 0; i < 5; i++) {
          const u = -1 + i * 0.5;
          const r = (0.05 + 0.013 * Math.sin(i * 2.7)) * hw * 2;
          ctx.beginPath();
          ctx.arc(headX + u * hw * 0.88, headY - hh * 0.92 + Math.sin(i * 1.9) * hh * 0.06, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // THE COWL'S CROWN DEVICES, seated for cloth. Both come AFTER the
    // ruff, so a bristle ridge or a frill rides OVER the fur the way
    // it grew out of the head under it. A hood's crown pitches far
    // above a helm's dome, so the spike row is lifted onto the cloth
    // line; a hood's temples stand wider than a skull, so the fins
    // step out to the cowl's own edge and ride a little higher, where
    // a frill fans off the temple instead of a glacier's calving.
    drawSpikesCrown(hh * 0.2);
    drawSideFins(hh * 0.04, hw * 0.12);
    if (st.feather && !hurt) {
      // One swept feather tucked at the temple, trailing behind the
      // travel — the scout's whole heraldry. A BROAD vane with a pale
      // spine; a thin feather reads as a wire (the fins-v1 verdict).
      const u = -lead;
      const bx = headX + u * hw * 0.5;
      const by = headY - hh * 0.85;
      const sway = Math.sin(f.nowMs * 0.0023) * hw * 0.07;
      const txx = bx + u * hw * 1.5 + sway;
      const tyy = by - hh * 1.15;
      ctx.fillStyle = st.feather.color;
      ctx.beginPath();
      ctx.moveTo(bx, by + hh * 0.12);
      // Upper vane edge: over the crown to the tip.
      ctx.quadraticCurveTo(bx + u * hw * 0.5, by - hh * 0.95, txx, tyy);
      // Lower vane edge: back beneath the spine, fat in the middle.
      ctx.quadraticCurveTo(bx + u * hw * 0.85, by - hh * 0.28, bx + u * hw * 0.16, by + hh * 0.22);
      ctx.closePath();
      ctx.fill();
      // Trailing-half shade splits the vane along the spine.
      ctx.fillStyle = shade(st.feather.color, -16);
      ctx.beginPath();
      ctx.moveTo(bx + u * hw * 0.1, by + hh * 0.1);
      ctx.quadraticCurveTo(bx + u * hw * 0.75, by - hh * 0.52, txx, tyy);
      ctx.quadraticCurveTo(bx + u * hw * 0.85, by - hh * 0.28, bx + u * hw * 0.16, by + hh * 0.22);
      ctx.closePath();
      ctx.fill();
      // The pale spine — one stroke sells the anatomy.
      ctx.strokeStyle = shade(st.feather.color, 30);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(bx + u * hw * 0.08, by + hh * 0.06);
      ctx.quadraticCurveTo(bx + u * hw * 0.72, by - hh * 0.55, txx - u * hw * 0.08, tyy + hh * 0.06);
      ctx.stroke();
    }
    if (st.mask && !hurt && backK <= 0.55) {
      // The half-mask: a kerchief over the lower face, pointed at the
      // chin. Eyes stay the character's; the rest belongs to the job.
      // Anchored on the SAME face shift as the opening (the 0.34 law,
      // deepening with profileK): a mask that stays centered while the
      // face turns un-masks the profile — it must ride the opening,
      // not the shell, all the way into the side view.
      const mw = hw * 0.78 * (1 - profileK * 0.5);
      const mx = headX + fx * headR * (0.34 + 0.24 * profileK);
      ctx.fillStyle = st.mask;
      ctx.beginPath();
      ctx.moveTo(mx - mw, headY + hh * 0.18);
      ctx.lineTo(mx + mw, headY + hh * 0.18);
      ctx.lineTo(mx + mw * 0.72, headY + hh * 0.6);
      ctx.lineTo(mx, headY + hh * 0.82);
      ctx.lineTo(mx - mw * 0.72, headY + hh * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shade(st.mask, 16);
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(mx - mw, headY + hh * 0.2);
      ctx.lineTo(mx + mw, headY + hh * 0.2);
      ctx.stroke();
    }
    if (st.emberEyes && !hurt && front) {
      // Two coals in the hood's shadow, breathing on a slow pulse —
      // the face keeps the dark, the eyes keep the fire. The far eye
      // narrows out with the facing like the bare face's does.
      const pulse = 0.6 + 0.4 * Math.sin(f.nowMs * 0.0016);
      // The 0.34 opening-anchor law: the coals live IN the face
      // opening, so they ride its shift (deepening with profileK)
      // and narrow with it.
      const ex = headX + fx * headR * (0.34 + 0.24 * profileK);
      const ey = headY + hh * 0.02;
      for (const es of [-1, 1]) {
        const wK = es !== lead ? Math.max(0, 1 - profileK * 1.4) : 1;
        if (wK <= 0.05) continue;
        const px = ex + es * hw * 0.34 * (1 - profileK * 0.45);
        ctx.globalAlpha = 0.35 * pulse * wK;
        ctx.fillStyle = st.emberEyes.color;
        ctx.beginPath();
        ctx.arc(px, ey, hw * 0.17, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = (0.75 + 0.25 * pulse) * wK;
        ctx.fillStyle = shade(st.emberEyes.color, 30);
        ctx.beginPath();
        ctx.arc(px, ey, hw * 0.078, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (st.fireflies && !hurt) {
      // The king's company: two lights on wandering loops round the
      // crown, blinking on their own beats. The far half of the loop
      // reads small and dim — the depth law the orbitals keep.
      const fc = st.fireflies.color;
      for (const [i, ph] of [[0, 0], [1, 2.6]] as const) {
        const t = f.nowMs * 0.00052 + ph;
        const blink = Math.max(0, Math.sin(f.nowMs * 0.0017 + i * 2.9 + 1));
        if (blink < 0.2) continue;
        const a = t * (1 + i * 0.13);
        const px = headX + Math.cos(a) * hw * (1.3 + i * 0.25);
        const py = headY - hh * (0.9 + 0.25 * i) + Math.sin(a * 1.7) * hh * 0.3;
        const near = Math.sin(a) >= 0;
        const r = near ? s * 0.013 : s * 0.009;
        ctx.globalAlpha = (near ? 0.3 : 0.16) * blink;
        ctx.fillStyle = fc;
        ctx.beginPath();
        ctx.arc(px, py, r * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = (near ? 0.95 : 0.55) * blink;
        ctx.fillStyle = shade(fc, 26);
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (st.flamecrown && !hurt) {
      // THE FLAMECROWN: iron tines rising off a dark band seated on
      // the crown, each guttering a hot flame that re-shapes every
      // beat — the coldfire idiom run hot and worn as a crown. The
      // crown was lit, not forged: the tines only hold the fire's
      // place. Centered on the skull axis, so it keeps every facing.
      const tc = st.flamecrown.tine;
      const fc2 = st.flamecrown.flame;
      // The band arcs over the crown to seat the tines.
      ctx.strokeStyle = tc;
      ctx.lineWidth = Math.max(2, s * 0.032);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.88, headY - hh * 0.92);
      ctx.quadraticCurveTo(headX, headY - hh * 1.38, headX + hw * 0.88, headY - hh * 0.92);
      ctx.stroke();
      for (const [du, len, ph] of [
        [-0.72, 0.5, 0],
        [-0.26, 0.72, 1.9],
        [0.26, 0.72, 3.7],
        [0.72, 0.5, 5.2],
      ] as const) {
        const bx = headX + du * hw;
        const by = headY - hh * (1.02 + 0.22 * Math.cos(du * 1.3));
        const bend = du * 0.4;
        const tx = bx + bend * hw * len;
        const ty = by - hh * len;
        // The tine: an iron prong curving outward — forged mass, not
        // a wire; the fire needs something worth holding.
        ctx.fillStyle = tc;
        ctx.beginPath();
        ctx.moveTo(bx - hw * 0.13, by);
        ctx.quadraticCurveTo(bx - hw * 0.08 + bend * hw * 0.5, by - hh * len * 0.55, tx, ty);
        ctx.quadraticCurveTo(bx + hw * 0.1 + bend * hw * 0.5, by - hh * len * 0.5, bx + hw * 0.13, by);
        ctx.closePath();
        ctx.fill();
        // The dim glint down the leading edge — iron, not shadow.
        ctx.strokeStyle = shade(tc, 34);
        ctx.lineWidth = Math.max(1, s * 0.011);
        ctx.beginPath();
        ctx.moveTo(bx + hw * 0.1, by);
        ctx.quadraticCurveTo(bx + hw * 0.09 + bend * hw * 0.5, by - hh * len * 0.5, tx, ty);
        ctx.stroke();
        // The flame: two tongues off the tine's point, re-shaping on
        // their own gutter, giving real heat.
        const g1 = Math.sin(f.nowMs * 0.006 + ph);
        const g2 = Math.sin(f.nowMs * 0.0087 + ph * 1.6);
        const fh = hh * (0.46 + 0.13 * g1) * (len / 0.72);
        ctx.globalAlpha = 0.82;
        ctx.fillStyle = fc2;
        ctx.beginPath();
        ctx.moveTo(tx - hw * 0.1, ty + hh * 0.03);
        ctx.quadraticCurveTo(tx - hw * (0.16 + 0.05 * g2), ty - fh * 0.5, tx + hw * 0.06 * g1, ty - fh);
        ctx.quadraticCurveTo(tx + hw * (0.15 + 0.04 * g1), ty - fh * 0.45, tx + hw * 0.11, ty + hh * 0.03);
        ctx.closePath();
        ctx.fill();
        // The hot heart inside the tongue.
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = shade(fc2, 34);
        ctx.beginPath();
        ctx.moveTo(tx - hw * 0.045, ty + hh * 0.02);
        ctx.quadraticCurveTo(tx + hw * 0.03 * g2, ty - fh * 0.42, tx + hw * 0.03 * g1, ty - fh * 0.6);
        ctx.quadraticCurveTo(tx + hw * 0.055, ty - fh * 0.3, tx + hw * 0.05, ty + hh * 0.02);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    drawGlyphOrbit('near');
    return;
  }

  if (st.kind === 'thistlehat') {
    // THE THISTLEHAT — thistledown's own head: the FIRST wizard's
    // hat, standing on the whole magus chassis (the beloved climb:
    // tall trailing spire, hard crook, pinched dropped point, full
    // waved brim, ONE BRIGHT EDGE). What lives in it is the field:
    // a running stitch climbs the pitch — thread, not gold — the
    // band wears an embroidered sprig, and off the dropped point
    // hangs THE BLOOM: a real thistle head, green calyx under a
    // brush of soft down, nodding as the breeze passes. At the
    // gust it lets one seed go, and the seed rides the wind past
    // the brim the way the wearer left home.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.74 * (1 - 0.5 * t);
    const bz = breezeK(f.nowMs, 0);
    const bandY = headY - hh * 0.55;
    const u = -lead;
    const sway = Math.sin(f.nowMs * 0.0017) * hw * (0.04 + 0.07 * bz);
    const tipX = headX + u * (hw * 1.38 + sway);
    const tipY = bandY - hh * 1.72;
    const oTop = headY - hh * 0.6;
    const oBot = headY + hh * 0.84;
    // THE MANTLE: cloth to the shoulders, risen to meet the band at
    // every facing (the nape law), face window CUT, never filled.
    const mantle = (): void => {
      ctx.moveTo(headX - hw * 1.18, headY + hh * 1.1);
      // The top corners tuck IN under the cone (the skull is narrow
      // up there): a mantle corner wider than the bell's foot peeks
      // past it above the brim and reads as a squared skull.
      ctx.quadraticCurveTo(headX - hw * 1.24, bandY + hh * 0.12, headX - hw * 0.64, bandY - hh * 0.44);
      ctx.lineTo(headX + hw * 0.64, bandY - hh * 0.44);
      ctx.quadraticCurveTo(headX + hw * 1.24, bandY + hh * 0.12, headX + hw * 1.18, headY + hh * 1.1);
      ctx.quadraticCurveTo(headX, headY + hh * 1.38, headX - hw * 1.18, headY + hh * 1.1);
      ctx.closePath();
    };
    const opening = (): void => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    mantle();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt && !front) {
      // The back read: center seam stitch and the drape tail — the
      // maker's hand shows on every side.
      ctx.fillStyle = shade(st.color, -10);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.4, headY + hh * 0.7);
      ctx.lineTo(headX + hw * 0.4, headY + hh * 0.7);
      ctx.lineTo(headX + lead * hw * 0.06, headY + hh * 1.8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shade(st.color, -22);
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.setLineDash([s * 0.016, s * 0.014]);
      ctx.beginPath();
      ctx.moveTo(headX, bandY - hh * 0.2);
      ctx.lineTo(headX + lead * hw * 0.05, headY + hh * 1.5);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // THE SPIRE — ONE SWEEP: the cone is a single unbroken bell
    // from brim to crook. Its foot flares WIDE into the brim
    // (swallowing the old square step where band met cone) and no
    // part of its edge ever runs vertical — the Black Mage read:
    // the hat and the head are one thing.
    const spire = (): void => {
      ctx.moveTo(headX - u * hw * 1.14, bandY + hh * 0.06);
      ctx.quadraticCurveTo(headX - u * hw * 0.82, bandY - hh * 0.36, headX - u * hw * 0.46, bandY - hh * 0.9);
      ctx.quadraticCurveTo(headX - u * hw * 0.18, bandY - hh * 1.42, headX - u * hw * 0.02, bandY - hh * 1.64);
      ctx.quadraticCurveTo(headX + u * hw * 0.3, bandY - hh * 2.02, tipX, tipY - hh * 0.22);
      ctx.quadraticCurveTo(tipX + u * hw * 0.18, tipY - hh * 0.04, tipX + u * hw * 0.02, tipY + hh * 0.14);
      ctx.quadraticCurveTo(headX + u * hw * 0.46, bandY - hh * 1.38, headX + u * hw * 0.56, bandY - hh * 0.9);
      ctx.quadraticCurveTo(headX + u * hw * 0.92, bandY - hh * 0.32, headX + u * hw * 1.14, bandY + hh * 0.06);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    spire();
    ctx.fill();
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      spire();
      ctx.clip();
      // The windward plane takes the light as a panel — linen in
      // the sun, the magus's own shading grammar, riding the sweep.
      ctx.fillStyle = shade(st.color, 9);
      ctx.beginPath();
      ctx.moveTo(headX - u * hw * 0.92, bandY + hh * 0.02);
      ctx.quadraticCurveTo(headX - u * hw * 0.58, bandY - hh * 0.42, headX - u * hw * 0.26, bandY - hh * 1.1);
      ctx.quadraticCurveTo(headX - u * hw * 0.4, bandY - hh * 0.5, headX - u * hw * 0.52, bandY + hh * 0.02);
      ctx.closePath();
      ctx.fill();
      // The crook side folds dark over the cone.
      ctx.fillStyle = shade(st.color, -14);
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(headX, bandY + hh * 0.05);
      ctx.quadraticCurveTo(headX + u * hw * 0.04, bandY - hh * 0.95, headX - u * hw * 0.01, bandY - hh * 1.52);
      ctx.quadraticCurveTo(headX + u * hw * 0.3, bandY - hh * 1.94, tipX, tipY - hh * 0.2);
      ctx.quadraticCurveTo(tipX + u * hw * 0.16, tipY - hh * 0.03, tipX + u * hw * 0.02, tipY + hh * 0.12);
      ctx.quadraticCurveTo(headX + u * hw * 0.46, bandY - hh * 1.36, headX + u * hw * 0.56, bandY - hh * 0.88);
      ctx.quadraticCurveTo(headX + u * hw * 0.92, bandY - hh * 0.32, headX + u * hw * 1.14, bandY + hh * 0.06);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      // THE CLIMBING STITCH: a running seam up the pitch — the
      // starter's craft where a court would wear its magic. Fixed,
      // honest, hand-sewn; nothing about it glows.
      ctx.strokeStyle = shade(st.trim, 14);
      ctx.lineWidth = Math.max(1, s * 0.009);
      ctx.setLineDash([s * 0.015, s * 0.013]);
      ctx.beginPath();
      ctx.moveTo(headX + u * hw * 0.3, bandY - hh * 0.1);
      ctx.quadraticCurveTo(headX + u * hw * 0.2, bandY - hh * 1.1, tipX - u * hw * 0.16, tipY + hh * 0.06);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      // The windward ridge takes the light — the one bright line
      // the magus keeps.
      ctx.strokeStyle = shade(st.color, 16);
      ctx.lineWidth = Math.max(1.5, s * 0.018);
      ctx.beginPath();
      ctx.moveTo(headX - u * hw * 0.26, bandY - hh * 0.5);
      ctx.quadraticCurveTo(headX - u * hw * 0.05, bandY - hh * 1.22, headX + u * hw * 0.26, bandY - hh * 1.66);
      ctx.stroke();
      // One crease under the crook.
      ctx.strokeStyle = shade(st.color, -24);
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(headX + u * hw * 0.14, bandY - hh * 1.4);
      ctx.quadraticCurveTo(headX + u * hw * 0.5, bandY - hh * 1.52, tipX - u * hw * 0.1, tipY + hh * 0.02);
      ctx.stroke();
    }
    // THE BRIM: the magus slab — full waved span, tips up, argued
    // with weather and won. THE BLUNT TIP LAW: the tips end on a
    // short vertical edge, never a razor point — the world's 8-tap
    // outline dilate renders any feature thinner than its radius as
    // a FAN of displaced dark copies (the whisker artifact, seen on
    // every razor-tipped brim in the family).
    const slab = (): void => {
      ctx.moveTo(headX - hw * 2.45, bandY - hh * 0.12);
      ctx.quadraticCurveTo(headX - hw * 1.7, bandY + hh * 0.26, headX - hw * 0.9, bandY - hh * 0.1);
      ctx.quadraticCurveTo(headX, bandY - hh * 0.3, headX + hw * 0.9, bandY - hh * 0.1);
      ctx.quadraticCurveTo(headX + hw * 1.7, bandY + hh * 0.26, headX + hw * 2.45, bandY - hh * 0.12);
      ctx.lineTo(headX + hw * 2.45, bandY + hh * 0.06);
      ctx.quadraticCurveTo(headX + hw * 1.6, bandY + hh * 0.44, headX, bandY + hh * 0.4);
      ctx.quadraticCurveTo(headX - hw * 1.6, bandY + hh * 0.44, headX - hw * 2.45, bandY + hh * 0.06);
      ctx.closePath();
    };
    ctx.fillStyle = hurt ? '#ffffff' : shade(st.color, 4);
    ctx.beginPath();
    slab();
    ctx.fill();
    if (!hurt) {
      // Brim underside — the hat's own honest shadow.
      ctx.fillStyle = shade(st.color, -26);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 2.3, bandY + hh * 0.02);
      ctx.quadraticCurveTo(headX, bandY + hh * 0.48, headX + hw * 2.3, bandY + hh * 0.02);
      ctx.quadraticCurveTo(headX + hw * 1.5, bandY + hh * 0.38, headX, bandY + hh * 0.36);
      ctx.quadraticCurveTo(headX - hw * 1.5, bandY + hh * 0.38, headX - hw * 2.3, bandY + hh * 0.02);
      ctx.closePath();
      ctx.fill();
      // THE ONE BRIGHT EDGE: linen catching the morning, unbroken —
      // and CLIPPED to the slab: a stroke centered on the silhouette
      // edge leaks half its width outside the shape, and the world's
      // outline dilate rings that lip into whiskers (THE EDGE LIVES
      // ON THE CLOTH law).
      ctx.save();
      ctx.beginPath();
      slab();
      ctx.clip();
      ctx.strokeStyle = shade(st.color, 26);
      ctx.lineWidth = Math.max(1, s * 0.013) * 2;
      ctx.beginPath();
      ctx.moveTo(headX - hw * 2.45, bandY - hh * 0.12);
      ctx.quadraticCurveTo(headX - hw * 1.7, bandY + hh * 0.26, headX - hw * 0.9, bandY - hh * 0.1);
      ctx.quadraticCurveTo(headX, bandY - hh * 0.3, headX + hw * 0.9, bandY - hh * 0.1);
      ctx.quadraticCurveTo(headX + hw * 1.7, bandY + hh * 0.26, headX + hw * 2.45, bandY - hh * 0.12);
      ctx.stroke();
      ctx.restore();
      // THE BAND: stitched linen in the thread color, WRAPPING the
      // cone — a curved strip clipped into the sweep, never a
      // straight rect — with a running stitch along its lower edge
      // and at the front a small embroidered sprig.
      ctx.save();
      ctx.beginPath();
      spire();
      ctx.clip();
      ctx.fillStyle = shade(st.trim, -6);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 1.08, bandY - hh * 0.44);
      ctx.quadraticCurveTo(headX, bandY - hh * 0.3, headX + hw * 1.08, bandY - hh * 0.44);
      ctx.lineTo(headX + hw * 1.08, bandY - hh * 0.08);
      ctx.quadraticCurveTo(headX, bandY + hh * 0.06, headX - hw * 1.08, bandY - hh * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shade(st.trim, 20);
      ctx.lineWidth = Math.max(1, s * 0.007);
      ctx.setLineDash([s * 0.012, s * 0.011]);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 1.0, bandY - hh * 0.14);
      ctx.quadraticCurveTo(headX, bandY - hh * 0.0, headX + hw * 1.0, bandY - hh * 0.14);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      if (front && st.bloom) {
        const bx2 = cx;
        const by2 = bandY - hh * 0.16;
        ctx.strokeStyle = st.bloom.calyx;
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx2 - headR * 0.07, by2 + headR * 0.05);
        ctx.quadraticCurveTo(bx2, by2 - headR * 0.01, bx2 + headR * 0.06, by2 - headR * 0.06);
        ctx.moveTo(bx2 - headR * 0.015, by2 + headR * 0.01);
        ctx.lineTo(bx2 - headR * 0.055, by2 - headR * 0.03);
        ctx.moveTo(bx2 + headR * 0.02, by2 - headR * 0.025);
        ctx.lineTo(bx2 + headR * 0.005, by2 - headR * 0.07);
        ctx.stroke();
        ctx.fillStyle = st.bloom.down;
        ctx.beginPath();
        ctx.arc(bx2 + headR * 0.07, by2 - headR * 0.07, headR * 0.028, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // THE BLOOM: the living tassel off the dropped point — calyx
    // above, down brush hanging below, nodding with the breeze.
    // Structure: the bloom is silhouette and holds white in the
    // flash; only its shed seed is light, and light dies in the
    // flash.
    if (st.bloom) {
      const nod = Math.sin(f.nowMs * 0.0017 + 0.6) * (0.1 + 0.24 * bz);
      const blx = tipX + u * hw * 0.03;
      const bly = tipY + hh * 0.18;
      ctx.save();
      ctx.translate(blx, bly);
      ctx.rotate(u * nod);
      // the down brush first — it hangs BELOW the calyx, a real fan
      // of soft rays wide enough to read as the flower it is
      ctx.strokeStyle = hurt ? '#ffffff' : st.bloom.down;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1, s * 0.009);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = Math.PI * 0.14 + (i / 7) * Math.PI * 0.72;
        ctx.moveTo(0, headR * 0.05);
        ctx.lineTo(Math.cos(a) * headR * 0.36, headR * 0.05 + Math.sin(a) * headR * 0.36);
      }
      ctx.stroke();
      if (!hurt) {
        // pale tips on the outer rays — down catching the light
        ctx.fillStyle = st.bloom.seed;
        for (const ta of [0.2, 0.5, 0.8] as const) {
          const a = Math.PI * 0.14 + ta * Math.PI * 0.72;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * headR * 0.36, headR * 0.05 + Math.sin(a) * headR * 0.36, headR * 0.03, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // the calyx: a green urn, cross-ticked like the real burr
      ctx.fillStyle = hurt ? '#ffffff' : st.bloom.calyx;
      ctx.beginPath();
      ctx.moveTo(-headR * 0.1, -headR * 0.05);
      ctx.quadraticCurveTo(0, -headR * 0.16, headR * 0.1, -headR * 0.05);
      ctx.quadraticCurveTo(headR * 0.085, headR * 0.09, 0, headR * 0.12);
      ctx.quadraticCurveTo(-headR * 0.085, headR * 0.09, -headR * 0.1, -headR * 0.05);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = shade(st.bloom.calyx, 16);
        ctx.beginPath();
        ctx.ellipse(0, -headR * 0.045, headR * 0.075, headR * 0.035, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = shade(st.bloom.calyx, -22);
        ctx.lineWidth = Math.max(0.6, s * 0.004);
        ctx.beginPath();
        ctx.moveTo(-headR * 0.07, -headR * 0.02);
        ctx.lineTo(headR * 0.045, headR * 0.08);
        ctx.moveTo(headR * 0.07, -headR * 0.02);
        ctx.lineTo(-headR * 0.045, headR * 0.08);
        ctx.moveTo(0, -headR * 0.04);
        ctx.lineTo(0, headR * 0.1);
        ctx.stroke();
      }
      ctx.restore();
      if (!hurt) {
        // THE LOOSED SEED: one seed on the wind, always faintly
        // going, bright when the gust passes — constant pace, born
        // and dying at nothing (the seamless law). The wind blows
        // toward the leading side; so does everything it carries.
        const ub = ((f.nowMs * 0.00013) % 1 + 1) % 1;
        thistleSeed(
          ctx,
          blx + lead * ub * hw * 2.3,
          bly - ub * hh * 0.55 + Math.sin(ub * 7) * hh * 0.08,
          headR * 0.09 * (1 - ub * 0.25),
          st.bloom.seed,
          lead * ub * 1.6,
          Math.sin(ub * Math.PI) * (0.25 + 0.75 * bz),
        );
      }
    }
    return;
  }

  if (st.kind === 'mothcowl') {
    // THE MOTHCOWL — mothwing's own head: the cowl shaped into the
    // moth itself. The crown rises into TWO soft tuft peaks (the
    // moth's head pile), a dusty ruff rings the face opening, and two
    // fat feelers curl forward off the crown to clubbed tips. Drop-
    // only: the low world's first costume, not its first hand-me-down.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.72 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.56;
    const oBot = headY + hh * 0.84;
    const tuftSway = Math.sin(f.nowMs * 0.0014) * hw * 0.03;
    // The two tuft peaks, one a step taller — soft points, not horns.
    const p1x = headX + lead * hw * 0.4;
    const p1y = headY - hh * (1.44 + t * 0.04);
    const p2x = headX - lead * hw * 0.52 + tuftSway;
    const p2y = headY - hh * 1.34;
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.24, headY + hh * 1.18);
      ctx.quadraticCurveTo(headX + lead * hw * 1.32, headY + hh * 0.2, headX + lead * hw * 1.16, headY - hh * 0.52);
      ctx.quadraticCurveTo(headX + lead * hw * 1.22, headY - hh * 0.9, headX + lead * hw * 0.78, headY - hh * 1.18);
      // Up into the first tuft — a soft peak with a rounded point.
      ctx.quadraticCurveTo(headX + lead * hw * 0.66, headY - hh * 1.36, p1x, p1y);
      // The saddle between the tufts — it must DIP, or the two peaks
      // read as one tall crown.
      ctx.quadraticCurveTo(headX - lead * hw * 0.06, headY - hh * 1.08, p2x, p2y);
      // Down the trailing tuft into the drape.
      ctx.quadraticCurveTo(headX - lead * hw * 0.86, headY - hh * 1.22, headX - lead * hw * (1.14 + t * 0.26), headY - hh * 0.5);
      ctx.quadraticCurveTo(headX - lead * hw * (1.3 + t * 0.3), headY + hh * 0.3, headX - lead * hw * 1.26, headY + hh * 1.18);
      ctx.quadraticCurveTo(headX, headY + hh * 1.46, headX + lead * hw * 1.24, headY + hh * 1.18);
      ctx.closePath();
    };
    const opening = () => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      ctx.fillStyle = shade(st.color, -13);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 1.6, hw * 2.4, hh * 3.2);
      // Each tuft wears its own lit face — flat planes, dusty pile.
      ctx.fillStyle = shade(st.color, 11);
      ctx.beginPath();
      ctx.moveTo(p1x - lead * hw * 0.02, p1y + hh * 0.06);
      ctx.quadraticCurveTo(p1x + lead * hw * 0.2, p1y + hh * 0.42, p1x - lead * hw * 0.05, p1y + hh * 0.78);
      ctx.lineTo(p1x - lead * hw * 0.3, p1y + hh * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p2x, p2y + hh * 0.06);
      ctx.quadraticCurveTo(p2x + lead * hw * 0.16, p2y + hh * 0.36, p2x - lead * hw * 0.04, p2y + hh * 0.66);
      ctx.lineTo(p2x - lead * hw * 0.26, p2y + hh * 0.5);
      ctx.closePath();
      ctx.fill();
      // The wing-dust speckle: a scatter of pale flecks over the
      // trailing drape — the moth leaves powder where it rests.
      ctx.fillStyle = shade(st.trim, -6);
      for (const [du, dv, r] of [
        [-0.55, -0.4, 0.022], [-0.8, 0.1, 0.016], [-0.42, 0.35, 0.019],
        [-0.95, 0.6, 0.015], [-0.6, 0.85, 0.021],
      ] as const) {
        ctx.beginPath();
        ctx.arc(headX + lead * hw * du, headY + hh * dv, s * r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      if (front) {
        // THE MOTH'S DARK: the wearer's face sinks deeper than any
        // road hood — the moth does the looking now, and the human
        // eyes are only rumors in the shadow under the brow.
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        ctx.fillStyle = 'rgba(22, 14, 26, 0.24)';
        ctx.fillRect(cx - ohw, oTop, ohw * 2, oBot - oTop);
        const shGrad = ctx.createLinearGradient(0, oTop, 0, headY + hh * 0.3);
        shGrad.addColorStop(0, 'rgba(18, 11, 22, 0.72)');
        shGrad.addColorStop(1, 'rgba(18, 11, 22, 0)');
        ctx.fillStyle = shGrad;
        ctx.fillRect(cx - ohw, oTop, ohw * 2, hh * 0.94);
        ctx.restore();
        // THE MANE: the collar pile bursts around the opening in two
        // rows — brow fringe above, a full mandible ruff below the
        // chin, each lump round and deep. The moth is FURRED.
        const rCol = st.ruff?.color ?? shade(st.trim, -10);
        ctx.fillStyle = rCol;
        for (let i = 0; i < 5; i++) {
          const u = -1 + i * 0.5;
          const r = (0.052 + 0.013 * Math.sin(i * 2.7)) * hw * 2;
          ctx.beginPath();
          ctx.arc(cx + u * ohw * 1.0, oTop + Math.sin(i * 1.9) * hh * 0.04, r, 0, Math.PI * 2);
          ctx.fill();
        }
        for (const es of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(cx + es * ohw * 1.05, headY + hh * 0.06, hw * 0.15, 0, Math.PI * 2);
          ctx.fill();
        }
        // The mandible ruff: a lapped burst under the chin, darker
        // beneath, pale crests on top — the moth's chest fur rising
        // to meet its face.
        for (const [u2, dy2, r2, dv2] of [
          [-0.72, 0.66, 0.15, -14], [-0.3, 0.76, 0.17, -6],
          [0.14, 0.78, 0.16, -10], [0.58, 0.7, 0.15, -16],
          [-0.5, 0.6, 0.11, 8], [0.05, 0.64, 0.12, 6], [0.44, 0.6, 0.1, 4],
        ] as const) {
          ctx.fillStyle = shade(rCol, dv2);
          ctx.beginPath();
          ctx.arc(cx + u2 * ohw, headY + hh * dy2, hw * r2, 0, Math.PI * 2);
          ctx.fill();
        }
        if (st.motheyes) {
          // THE MOTH'S OWN EYES: two great luminous discs seated on
          // the cowl at the brow corners, above the human dark —
          // faceted, lidless, glowing on a breath far slower than a
          // pulse. The far eye narrows with the facing, as all eyes
          // here do.
          const mec = st.motheyes.color;
          const glow = 0.72 + 0.28 * Math.sin(f.nowMs * 0.0009);
          for (const es of [-1, 1]) {
            const wK = es !== lead ? Math.max(0.25, 1 - t * 0.8) : 1;
            if (wK <= 0.05) continue;
            const px = cx + es * ohw * 1.02;
            const py = oTop - headR * 0.1;
            const rx2 = headR * 0.24 * wK;
            const ry2 = headR * 0.27;
            // The halo breath.
            ctx.globalAlpha = 0.22 * glow;
            ctx.fillStyle = mec;
            ctx.beginPath();
            ctx.ellipse(px, py, rx2 * 1.7, ry2 * 1.55, 0, 0, Math.PI * 2);
            ctx.fill();
            // The eye: dark socket ring, then the lit dome.
            ctx.globalAlpha = 1;
            ctx.fillStyle = shade(st.color, -30);
            ctx.beginPath();
            ctx.ellipse(px, py, rx2 * 1.18, ry2 * 1.14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 0.85 + 0.15 * glow;
            ctx.fillStyle = mec;
            ctx.beginPath();
            ctx.ellipse(px, py, rx2, ry2, 0, 0, Math.PI * 2);
            ctx.fill();
            // The compound read: the lower half steps down a value —
            // a facet plane, not an iris.
            ctx.fillStyle = shade(mec, -22);
            ctx.beginPath();
            ctx.ellipse(px, py + ry2 * 0.34, rx2 * 0.92, ry2 * 0.58, 0, 0, Math.PI);
            ctx.fill();
            // One hard glint, high and windward.
            ctx.fillStyle = shade(mec, 46);
            ctx.beginPath();
            ctx.arc(px - rx2 * 0.3, py - ry2 * 0.36, rx2 * 0.24, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
      } else {
        // From behind: the folded-wing seam — two soft panels meeting
        // at a center crease, the moth at rest.
        ctx.fillStyle = shade(st.color, -9);
        ctx.beginPath();
        ctx.moveTo(headX, headY - hh * 0.9);
        ctx.quadraticCurveTo(headX - hw * 0.5, headY - hh * 0.1, headX - hw * 0.34, headY + hh * 1.1);
        ctx.lineTo(headX + lead * hw * 0.06, headY + hh * 1.2);
        ctx.lineTo(headX, headY - hh * 0.9);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(st.color, -22);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(headX, headY - hh * 1.0);
        ctx.lineTo(headX + lead * hw * 0.06, headY + hh * 1.15);
        ctx.stroke();
      }
      if (st.antennae) {
        // THE PLUMES: the great feathered combs of the silk moth —
        // each antenna a shaft arcing up and FORWARD off its tuft
        // peak, fringed both sides with comb teeth, longest at the
        // middle of the sweep. They quiver on their own quick-slow
        // clock: reading the air is work. The far comb narrows with
        // the facing.
        ctx.lineCap = 'round';
        const aCol = st.antennae.color;
        const quiver = Math.sin(f.nowMs * 0.0026) * hw * 0.05
          + Math.sin(f.nowMs * 0.013) * hw * 0.012;
        for (const [pi, px, py] of [[0, p1x, p1y], [1, p2x, p2y]] as const) {
          const es = pi === 0 ? 1 : -1;
          const far = (es === 1 ? lead : -lead) !== 1 && t > 0.05;
          const wK = far ? Math.max(0.35, 1 - t * 0.6) : 1;
          const bx = px;
          const by = py + hh * 0.06;
          const txx = px + lead * hw * (0.85 + pi * 0.12) * wK + quiver;
          const tyy = py - hh * (0.88 - pi * 0.08);
          const cpx = px + lead * hw * 0.08 * wK;
          const cpy = py - hh * 0.66;
          // Comb teeth first, so the shaft caps their roots: at each
          // station along the shaft, two teeth flare perpendicular,
          // longest mid-sweep — the feather read, drawn fat.
          ctx.strokeStyle = shade(aCol, -10);
          ctx.lineWidth = Math.max(1, s * 0.013);
          for (let k = 1; k <= 5; k++) {
            const u = k / 6;
            const omu = 1 - u;
            const sx3 = omu * omu * bx + 2 * omu * u * cpx + u * u * txx;
            const sy3 = omu * omu * by + 2 * omu * u * cpy + u * u * tyy;
            // The tangent, for the perpendicular flare.
            const dx3 = 2 * omu * (cpx - bx) + 2 * u * (txx - cpx);
            const dy3 = 2 * omu * (cpy - by) + 2 * u * (tyy - cpy);
            const dl = Math.hypot(dx3, dy3) || 1;
            const nx3 = -dy3 / dl;
            const ny3 = dx3 / dl;
            const len = hh * 0.19 * Math.sin(u * Math.PI) * wK + hh * 0.05;
            ctx.beginPath();
            ctx.moveTo(sx3 - nx3 * len, sy3 - ny3 * len);
            ctx.lineTo(sx3 + nx3 * len * 0.7, sy3 + ny3 * len * 0.7);
            ctx.stroke();
          }
          // The shaft over the teeth, tapering to a fine hook.
          ctx.strokeStyle = aCol;
          ctx.lineWidth = Math.max(1.5, s * 0.024);
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.quadraticCurveTo(cpx, cpy, txx, tyy);
          ctx.stroke();
          ctx.lineWidth = Math.max(1, s * 0.012);
          ctx.beginPath();
          ctx.moveTo(txx, tyy);
          ctx.quadraticCurveTo(txx + lead * hw * 0.1 * wK, tyy - hh * 0.1, txx + lead * hw * 0.06 * wK, tyy - hh * 0.2);
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
      }
    }
    return;
  }

  if (st.kind === 'shroudcowl') {
    // THE SHROUD COWL — stormwoven's own head, third forging: the
    // hood does not WEAR a storm, it IS one. The crown's silhouette
    // rolls as three cloud lobes; a living shroud of fog orbits the
    // head on the glyph-orbit split law (far puffs behind the shell,
    // near puffs in front), drifting on its own slow wind. There is
    // no bolt badge: when the sky lets go, the clouds light FROM
    // WITHIN — sheet lightning — and a hairline fork crosses the
    // dark of the opening. The storm-eye at the brow is the one
    // forged thing, and the face stays in mystery.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.74 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.6;
    const oBot = headY + hh * 0.84;
    // The rolling sky's first station: the crown leads (off 0).
    const k = stormboltK(f.nowMs);
    const strike = k > 0.92;
    const wreath = st.cloudwreath?.color ?? shade(st.color, 14);
    // THE SHROUD: three puffs in slow orbit. Far-side puffs paint
    // BEFORE the shell and dim; puffs hidden square behind the
    // skull are skipped outright (floating-orbit occlusion law).
    const puff = (i: number, nearPass: boolean): void => {
      const a = f.nowMs * 0.00019 + (i * Math.PI * 2) / 3;
      const ox = Math.cos(a) * hw * 1.62;
      const depth = Math.sin(a);
      if (nearPass !== depth >= 0) return;
      if (depth < 0 && Math.abs(ox) < hw * 1.15) return;
      const scl = (depth < 0 ? 0.68 : 1) * (1 - t * 0.22);
      const px = headX + ox * (1 - t * 0.3);
      const py = headY - hh * (0.62 + 0.2 * Math.sin(f.nowMs * 0.0009 + i * 2.2));
      const lit = strike ? 26 : 0;
      const r0 = hw * 0.3 * scl;
      const r1 = hw * 0.2 * scl;
      // Two lobes and their caps — a cloud, never a pill.
      ctx.fillStyle = hurt ? '#ffffff' : shade(wreath, -10 + lit);
      ctx.beginPath();
      ctx.arc(px, py, r0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hurt ? '#ffffff' : shade(wreath, -2 + lit);
      ctx.beginPath();
      ctx.arc(px + r0 * 0.78, py + r0 * 0.16, r1, 0, Math.PI * 2);
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = shade(wreath, 10 + lit);
        ctx.beginPath();
        ctx.arc(px, py, r0 * 0.8, Math.PI * 1.06, Math.PI * 1.94);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(wreath, 6 + lit);
        ctx.beginPath();
        ctx.arc(px + r0 * 0.78, py + r0 * 0.16, r1 * 0.76, Math.PI * 1.06, Math.PI * 1.94);
        ctx.closePath();
        ctx.fill();
        // The under-shade that seats the puff in the air.
        ctx.fillStyle = shade(wreath, -22);
        ctx.beginPath();
        ctx.ellipse(px + r0 * 0.2, py + r0 * 0.72, r0 * 0.8, r0 * 0.24, 0, 0, Math.PI);
        ctx.fill();
        if (strike) {
          // Sheet lightning: the cloud rims white for the beat.
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = Math.max(1, s * 0.009);
          ctx.beginPath();
          ctx.arc(px, py, r0, Math.PI * 0.95, Math.PI * 2.05);
          ctx.stroke();
        }
      }
    };
    puff(0, false);
    puff(1, false);
    puff(2, false);
    // The wind carries a slow lean through the whole crown.
    const sway = Math.sin(f.nowMs * 0.0013) * hw * 0.035;
    const shell = (): void => {
      ctx.moveTo(headX + lead * hw * 1.24, headY + hh * 1.12);
      ctx.quadraticCurveTo(headX + lead * hw * 1.35, headY + hh * 0.16, headX + lead * hw * 1.13, headY - hh * 0.48);
      // THE CLOUD CROWN: the silhouette itself rolls — three lobes
      // from the leading edge over the top, each crest its own
      // round, the way a front stacks on the horizon.
      ctx.quadraticCurveTo(headX + lead * hw * 1.14, headY - hh * 0.9, headX + lead * hw * 0.88, headY - hh * 1.06);
      ctx.quadraticCurveTo(headX + lead * hw * (0.72 + 0.02) + sway, headY - hh * 1.52, headX + lead * hw * 0.24 + sway, headY - hh * 1.32);
      ctx.quadraticCurveTo(headX - lead * hw * 0.04 + sway, headY - hh * 1.56, headX - lead * hw * 0.42 + sway, headY - hh * 1.3);
      ctx.quadraticCurveTo(headX - lead * hw * 0.74 + sway * 0.6, headY - hh * 1.46, headX - lead * hw * 0.92, headY - hh * 1.02);
      // Trailing side falls into the mantle.
      ctx.quadraticCurveTo(headX - lead * hw * (1.14 + t * 0.2), headY - hh * 0.72, headX - lead * hw * (1.2 + t * 0.3), headY - hh * 0.14);
      ctx.quadraticCurveTo(headX - lead * hw * (1.36 + t * 0.26), headY + hh * 0.38, headX - lead * hw * 1.28, headY + hh * 1.12);
      ctx.quadraticCurveTo(headX, headY + hh * 1.4, headX + lead * hw * 1.24, headY + hh * 1.12);
      ctx.closePath();
    };
    const opening = (): void => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      // Leeward shade; the leading lobes keep the light.
      ctx.fillStyle = shade(st.color, -13);
      ctx.fillRect(lead === 1 ? headX - hw * 2.6 : headX, headY - hh * 1.7, hw * 2.6, hh * 3.4);
      // Interior billows echoing the crown's own lobes — mass, not
      // decoration. Lit caps as crescents; the strike lights them
      // from within for one beat.
      const lit = strike ? 22 : 0;
      for (const [lu, ly, rr, dv] of [
        [0.52, -1.06, 0.4, -4], [-0.06, -1.12, 0.44, -10], [-0.6, -1.0, 0.36, -16],
      ] as const) {
        const bx = headX + lead * hw * lu + sway;
        const by = headY + hh * ly;
        ctx.fillStyle = shade(st.color, dv + lit);
        ctx.beginPath();
        ctx.arc(bx, by, hw * rr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(st.color, dv + 13 + lit);
        ctx.beginPath();
        ctx.arc(bx, by, hw * rr * 0.8, Math.PI * 1.06, Math.PI * 1.94);
        ctx.closePath();
        ctx.fill();
      }
      // One fold crease where the crown hands off to the mantle.
      ctx.strokeStyle = shade(st.color, -24);
      ctx.lineWidth = Math.max(1, s * 0.009);
      ctx.beginPath();
      ctx.moveTo(headX - lead * hw * 0.5, headY - hh * 0.94);
      ctx.quadraticCurveTo(headX - lead * hw * 0.78, headY - hh * 0.4, headX - lead * hw * 0.88, headY + hh * 0.3);
      ctx.stroke();
      // THE COLLAR ROLLS: the front banks low around the throat.
      for (const [cu, cy2, rr, dv] of [
        [-0.5, 0.98, 0.34, -8], [0.36, 1.02, 0.38, 0],
      ] as const) {
        const bx = headX + hw * cu;
        const by = headY + hh * cy2;
        ctx.fillStyle = shade(st.color, dv + lit);
        ctx.beginPath();
        ctx.arc(bx, by, hw * rr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(st.color, dv + 12 + lit);
        ctx.beginPath();
        ctx.arc(bx, by, hw * rr * 0.78, Math.PI * 1.06, Math.PI * 1.94);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      if (front) {
        // THE CAST VEIL: the mystery as a true falloff, clipped
        // INSIDE the opening — shade the hood actually casts, never
        // a plane floating over the hole.
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        stormVeil(ctx, cx, ohw, oTop + cut * 0.2, headY + hh * 0.14, headY + hh * 0.68, '#141220');
        if (strike) {
          // The fork crosses the dark — in front of the mystery,
          // never lighting it.
          ctx.strokeStyle = 'rgba(232, 240, 255, 0.85)';
          ctx.lineWidth = Math.max(1, s * 0.008);
          ctx.beginPath();
          ctx.moveTo(cx - ohw * 0.34, oTop + hh * 0.1);
          ctx.lineTo(cx + ohw * 0.08, oTop + hh * 0.5);
          ctx.lineTo(cx - ohw * 0.12, oTop + hh * 0.66);
          ctx.lineTo(cx + ohw * 0.3, headY + hh * 0.5);
          ctx.moveTo(cx - ohw * 0.12, oTop + hh * 0.66);
          ctx.lineTo(cx - ohw * 0.38, headY + hh * 0.32);
          ctx.stroke();
        }
        ctx.restore();
        // The shrine frame: trim border, inner dark line, brow hem.
        ctx.strokeStyle = shade(st.color, 20);
        ctx.lineWidth = Math.max(1, s * 0.013);
        ctx.beginPath();
        opening();
        ctx.stroke();
        ctx.strokeStyle = shade(st.color, -24);
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.beginPath();
        chamferRect(ctx, cx - ohw * 0.88, oTop + hh * 0.08, ohw * 1.76, (oBot - oTop) * 0.9, cut * 0.7);
        ctx.stroke();
        ctx.fillStyle = shade(st.color, -22);
        ctx.fillRect(cx - ohw * 0.98, oTop - headR * 0.05, ohw * 1.96, headR * 0.1);
        // THE STORM-EYE: the one forged thing on all that weather.
        const eCol = st.stormeye?.color ?? st.trim;
        const er = headR * 0.12 * (1 - t * 0.3);
        const ey = oTop - headR * 0.02;
        ctx.fillStyle = shade(eCol, -30);
        ctx.beginPath();
        ctx.arc(cx, ey, er, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = eCol;
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        ctx.arc(cx, ey, er * 0.68, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = strike ? '#ffffff' : eCol;
        ctx.beginPath();
        ctx.ellipse(cx, ey, er * 0.16, er * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // From behind: the drape tail, and a cloud roll banked
        // across the nape so the back is weather too.
        ctx.fillStyle = shade(st.color, -12);
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.38, headY + hh * 0.84);
        ctx.lineTo(headX + hw * 0.38, headY + hh * 0.84);
        ctx.lineTo(headX + lead * hw * 0.06, headY + hh * 1.86);
        ctx.closePath();
        ctx.fill();
        for (const [cu, cy2, rr, dv] of [
          [-0.34, 0.4, 0.3, -16], [0.3, 0.44, 0.34, -8],
        ] as const) {
          const bx = headX + hw * cu;
          const by = headY + hh * cy2;
          ctx.fillStyle = shade(st.color, dv);
          ctx.beginPath();
          ctx.arc(bx, by, hw * rr, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = shade(st.color, dv + 11);
          ctx.beginPath();
          ctx.arc(bx, by, hw * rr * 0.78, Math.PI * 1.06, Math.PI * 1.94);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    puff(0, true);
    puff(1, true);
    puff(2, true);
    if (!hurt) {
      const ember = st.cloudwreath?.ember ?? st.trim;
      if (strike) {
        const fr = Math.floor(f.nowMs / 90);
        // THE CRAWL: lightning walks the crown, lobe to lobe, and
        // leaps for the shroud — electricity that DANCES, never a
        // sign that glows.
        stormArc(ctx, headX + lead * hw * 0.72, headY - hh * 1.18, headX - lead * hw * 0.5, headY - hh * 1.26, fr * 3 + 1, hh * 0.16, ember, 0.85, Math.max(1, s * 0.008));
        stormArc(ctx, headX + lead * hw * 0.2, headY - hh * 1.38, headX + lead * hw * 1.04, headY - hh * 0.88, fr * 3 + 2, hh * 0.13, ember, 0.7, Math.max(1, s * 0.007));
        const pa = f.nowMs * 0.00019;
        const pox = Math.cos(pa) * hw * 1.62;
        if (Math.sin(pa) >= 0) {
          stormArc(ctx, headX + lead * hw * 0.4, headY - hh * 1.08, headX + pox, headY - hh * 0.62, fr * 3 + 3, hh * 0.12, ember, 0.6, Math.max(1, s * 0.006), false);
        }
      } else if (k > 0.45 && (f.nowMs % 1300) < 120) {
        // The charge CRACKLES: one short filament snapping across a
        // different lobe each beat.
        const which = Math.floor(f.nowMs / 1300) % 3;
        const wx = [0.55, -0.15, -0.6][which]! * hw;
        stormArc(ctx, headX + wx, headY - hh * 1.3, headX + wx + hw * 0.34, headY - hh * 1.12, Math.floor(f.nowMs / 1300), hh * 0.08, ember, 0.5, Math.max(1, s * 0.006), false);
      }
    }
    return;
  }

  if (st.kind === 'thunderhat') {
    // THE THUNDERHAT — thunderhead's own head, second forging: the
    // storm made a WIZARD'S HAT, on the magus chassis the wardrobe
    // already loves. A wide anvil-dark brim waved by real weather,
    // its ONE BRIGHT EDGE the gold charge seam itself; a heavy spire
    // with a hard crook, a second seam winding up its pitch; a cloud
    // collar brewing where cone meets brim; a riveted iron band; and
    // the forked jewel hung off the trailing tip on its chain —
    // regalia, not a badge. The whole hat keeps THE STORMBOLT count.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.74 * (1 - 0.5 * t);
    // The rolling sky's first station: the crown leads (off 0).
    const k = stormboltK(f.nowMs);
    const strike = k > 0.92;
    const seamC = st.boltjewel?.seam ?? st.trim;
    const bandY = headY - hh * 0.55;
    const u = -lead;
    const sway = Math.sin(f.nowMs * 0.0016) * hw * 0.08;
    const tipX = headX + u * (hw * 1.4 + sway);
    const tipY = bandY - hh * 1.64;
    const oTop = headY - hh * 0.6;
    const oBot = headY + hh * 0.84;
    // THE MANTLE FIRST: the hat sits on cloth, not on a bare skull
    // — a storm-dark drape covering the head to the shoulders at
    // every facing, its face window CUT (evenodd, the hood law), so
    // the chin below the mystery is the wearer's own.
    const mantle = (): void => {
      ctx.moveTo(headX - hw * 1.18, headY + hh * 1.1);
      // Top corners tucked IN under the cone (the squared-skull fix).
      ctx.quadraticCurveTo(headX - hw * 1.24, headY - hh * 0.26, headX - hw * 0.72, bandY - hh * 0.1);
      ctx.lineTo(headX + hw * 0.72, bandY - hh * 0.1);
      ctx.quadraticCurveTo(headX + hw * 1.24, headY - hh * 0.26, headX + hw * 1.18, headY + hh * 1.1);
      ctx.quadraticCurveTo(headX, headY + hh * 1.38, headX - hw * 1.18, headY + hh * 1.1);
      ctx.closePath();
    };
    const opening = (): void => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    mantle();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt && front) {
      ctx.strokeStyle = shade(st.color, 16);
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      opening();
      ctx.stroke();
    }
    if (!hurt && !front) {
      // The back read: soaked center seam and a drape tail.
      ctx.fillStyle = shade(st.color, -12);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.4, headY + hh * 0.7);
      ctx.lineTo(headX + hw * 0.4, headY + hh * 0.7);
      ctx.lineTo(headX + lead * hw * 0.06, headY + hh * 1.8);
      ctx.closePath();
      ctx.fill();
    }
    // THE SPIRE: heavier than the magus — a column of weather, on
    // THE ONE SWEEP (a single unbroken bell from brim to crook; the
    // foot flares wide into the brim, no vertical edge anywhere).
    const spire = (): void => {
      ctx.moveTo(headX - u * hw * 1.18, bandY + hh * 0.06);
      ctx.quadraticCurveTo(headX - u * hw * 0.86, bandY - hh * 0.34, headX - u * hw * 0.5, bandY - hh * 0.88);
      ctx.quadraticCurveTo(headX - u * hw * 0.2, bandY - hh * 1.36, headX - u * hw * 0.04, bandY - hh * 1.56);
      ctx.quadraticCurveTo(headX + u * hw * 0.3, bandY - hh * 1.98, tipX, tipY - hh * 0.2);
      ctx.quadraticCurveTo(tipX + u * hw * 0.18, tipY - hh * 0.02, tipX + u * hw * 0.02, tipY + hh * 0.14);
      ctx.quadraticCurveTo(headX + u * hw * 0.5, bandY - hh * 1.32, headX + u * hw * 0.6, bandY - hh * 0.84);
      ctx.quadraticCurveTo(headX + u * hw * 0.96, bandY - hh * 0.3, headX + u * hw * 1.18, bandY + hh * 0.06);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    spire();
    ctx.fill();
    if (!hurt) {
      // Crook side folds dark; the windward ridge keeps what light
      // the anvil sky allows.
      ctx.fillStyle = shade(st.color, -14);
      ctx.beginPath();
      ctx.moveTo(headX, bandY + hh * 0.05);
      ctx.quadraticCurveTo(headX + u * hw * 0.04, bandY - hh * 0.9, headX - u * hw * 0.02, bandY - hh * 1.44);
      ctx.quadraticCurveTo(headX + u * hw * 0.3, bandY - hh * 1.9, tipX, tipY - hh * 0.18);
      ctx.quadraticCurveTo(tipX + u * hw * 0.16, tipY - hh * 0.01, tipX + u * hw * 0.02, tipY + hh * 0.12);
      ctx.quadraticCurveTo(headX + u * hw * 0.5, bandY - hh * 1.3, headX + u * hw * 0.6, bandY - hh * 0.82);
      ctx.quadraticCurveTo(headX + u * hw * 0.96, bandY - hh * 0.3, headX + u * hw * 1.18, bandY + hh * 0.06);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shade(st.color, 15);
      ctx.lineWidth = Math.max(1.5, s * 0.017);
      ctx.beginPath();
      ctx.moveTo(headX - u * hw * 0.3, bandY - hh * 0.46);
      ctx.quadraticCurveTo(headX - u * hw * 0.06, bandY - hh * 1.16, headX + u * hw * 0.26, bandY - hh * 1.62);
      ctx.stroke();
      // THE SPIRE SEAM: gold winding up the pitch on the count.
      ctx.globalAlpha = 0.4 + 0.6 * k;
      ctx.strokeStyle = strike ? '#ffffff' : seamC;
      ctx.lineWidth = Math.max(1, s * (strike ? 0.016 : 0.011));
      ctx.beginPath();
      ctx.moveTo(headX + u * hw * 0.4, bandY - hh * 0.2);
      ctx.quadraticCurveTo(headX - u * hw * 0.1, bandY - hh * 0.9, headX + u * hw * 0.22, bandY - hh * 1.42);
      ctx.quadraticCurveTo(headX + u * hw * 0.52, bandY - hh * 1.7, tipX - u * hw * 0.06, tipY + hh * 0.06);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // One crease under the crook — the weather's signature.
      ctx.strokeStyle = shade(st.color, -24);
      ctx.lineWidth = Math.max(1, s * 0.011);
      ctx.beginPath();
      ctx.moveTo(headX + u * hw * 0.16, bandY - hh * 1.34);
      ctx.quadraticCurveTo(headX + u * hw * 0.52, bandY - hh * 1.48, tipX - u * hw * 0.1, tipY + hh * 0.04);
      ctx.stroke();
      // THE CLOUD COLLAR: the storm brewing where cone meets brim —
      // three lobes lapped across the base, crescent-capped, lit
      // from within on the strike.
      const lit = strike ? 24 : 0;
      for (const [lu, rr, dv] of [
        [-0.52, 0.32, -14], [0.05, 0.38, -6], [0.56, 0.3, 0],
      ] as const) {
        const bx = headX + hw * lu;
        const by = bandY - hh * (0.28 + 0.04 * Math.sin(lu * 5 + f.nowMs * 0.0011));
        ctx.fillStyle = shade(st.color, dv + lit);
        ctx.beginPath();
        ctx.arc(bx, by, hw * rr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(st.color, dv + 13 + lit);
        ctx.beginPath();
        ctx.arc(bx, by, hw * rr * 0.78, Math.PI * 1.06, Math.PI * 1.94);
        ctx.closePath();
        ctx.fill();
      }
    }
    // THE BRIM: wide, waved, the leading tip turned UP by the
    // updraft — and its ONE BRIGHT EDGE is the charge seam.
    const bLead = lead;
    // Blunt tips (the whisker law); the charge rim clipped into the
    // slab.
    const slab = (): void => {
      ctx.moveTo(headX + bLead * hw * 2.52, bandY - hh * 0.2);
      ctx.quadraticCurveTo(headX + bLead * hw * 1.7, bandY + hh * 0.24, headX + bLead * hw * 0.9, bandY - hh * 0.1);
      ctx.quadraticCurveTo(headX, bandY - hh * 0.3, headX - bLead * hw * 0.9, bandY - hh * 0.1);
      ctx.quadraticCurveTo(headX - bLead * hw * 1.72, bandY + hh * 0.26, headX - bLead * hw * 2.32, bandY - hh * 0.08);
      ctx.lineTo(headX - bLead * hw * 2.32, bandY + hh * 0.08);
      ctx.quadraticCurveTo(headX - bLead * hw * 1.6, bandY + hh * 0.44, headX, bandY + hh * 0.4);
      ctx.quadraticCurveTo(headX + bLead * hw * 1.6, bandY + hh * 0.46, headX + bLead * hw * 2.52, bandY - hh * 0.02);
      ctx.closePath();
    };
    ctx.fillStyle = hurt ? '#ffffff' : shade(st.color, 4);
    ctx.beginPath();
    slab();
    ctx.fill();
    if (!hurt) {
      // Brim underside shadow — the anvil's own dark.
      ctx.fillStyle = shade(st.color, -26);
      ctx.beginPath();
      ctx.moveTo(headX + bLead * hw * 2.36, bandY - hh * 0.1);
      ctx.quadraticCurveTo(headX, bandY + hh * 0.48, headX - bLead * hw * 2.2, bandY + hh * 0.04);
      ctx.quadraticCurveTo(headX - bLead * hw * 1.5, bandY + hh * 0.38, headX, bandY + hh * 0.36);
      ctx.quadraticCurveTo(headX + bLead * hw * 1.5, bandY + hh * 0.4, headX + bLead * hw * 2.36, bandY - hh * 0.1);
      ctx.closePath();
      ctx.fill();
      // THE CHARGE RIM: the one bright edge, gold, on the count —
      // clipped into the slab (the whisker law).
      ctx.save();
      ctx.beginPath();
      slab();
      ctx.clip();
      ctx.globalAlpha = 0.55 + 0.45 * k;
      ctx.strokeStyle = strike ? '#ffffff' : seamC;
      ctx.lineWidth = Math.max(1, s * (strike ? 0.018 : 0.013)) * 2;
      ctx.beginPath();
      ctx.moveTo(headX + bLead * hw * 2.52, bandY - hh * 0.2);
      ctx.quadraticCurveTo(headX + bLead * hw * 1.7, bandY + hh * 0.24, headX + bLead * hw * 0.9, bandY - hh * 0.1);
      ctx.quadraticCurveTo(headX, bandY - hh * 0.3, headX - bLead * hw * 0.9, bandY - hh * 0.1);
      ctx.quadraticCurveTo(headX - bLead * hw * 1.72, bandY + hh * 0.26, headX - bLead * hw * 2.32, bandY - hh * 0.08);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
      if (strike) {
        const fr = Math.floor(f.nowMs / 90);
        // Lightning RIDES the brim and CLIMBS the spire — arcs that
        // dance, never a rim that glows.
        stormArc(ctx, headX + bLead * hw * 2.4, bandY - hh * 0.14, headX + bLead * hw * 0.6, bandY - hh * 0.16, fr * 7 + 1, hh * 0.1, seamC, 0.8, Math.max(1, s * 0.008));
        stormArc(ctx, headX + u * hw * 0.34, bandY - hh * 0.3, tipX - u * hw * 0.04, tipY + hh * 0.1, fr * 7 + 2, hh * 0.14, seamC, 0.75, Math.max(1, s * 0.007));
      } else if (k > 0.45 && (f.nowMs % 1300) < 120 && front) {
        // Rivet sparks on the charge.
        const which = Math.floor(f.nowMs / 1300) % 3;
        const rx = cx + [-0.4, 0, 0.4][which]! * headR;
        stormArc(ctx, rx, bandY - hh * 0.3, rx + headR * 0.22, bandY - hh * 0.46, Math.floor(f.nowMs / 1300) + 7, hh * 0.05, seamC, 0.5, Math.max(1, s * 0.005), false);
      }
      // THE IRON BAND: dark, riveted in gold — the forge's word on
      // all that cloth, WRAPPING the cone (a curved strip clipped
      // into the sweep, never a straight rect).
      ctx.save();
      ctx.beginPath();
      spire();
      ctx.clip();
      ctx.fillStyle = shade(st.color, -30);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 1.12, bandY - hh * 0.44);
      ctx.quadraticCurveTo(headX, bandY - hh * 0.3, headX + hw * 1.12, bandY - hh * 0.44);
      ctx.lineTo(headX + hw * 1.12, bandY - hh * 0.08);
      ctx.quadraticCurveTo(headX, bandY + hh * 0.06, headX - hw * 1.12, bandY - hh * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (front) {
        for (const du of [-0.4, 0, 0.4]) {
          ctx.fillStyle = shade(seamC, du === 0 ? 6 : -8);
          ctx.beginPath();
          ctx.arc(cx + du * headR, bandY - hh * 0.3, headR * 0.045, 0, Math.PI * 2);
          ctx.fill();
        }
        // THE CAST VEIL under the brim — a true falloff clipped
        // inside the window.
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        stormVeil(ctx, cx, ohw, oTop + cut * 0.2, headY + hh * 0.16, headY + hh * 0.68, '#100e18');
        ctx.restore();
      }
    }
    // THE BOLT JEWEL: hung from the trailing brim tip — outside the
    // silhouette, so it is STRUCTURE: hurt holds it white.
    const jSwing = Math.sin(f.nowMs * 0.0013 + 0.6) * hw * 0.07;
    const jx = headX - bLead * hw * 2.1 + jSwing;
    const jy = bandY + hh * (0.52 + 0.03 * Math.cos(f.nowMs * 0.0013 + 0.6));
    const pr = headR * 0.24;
    if (!hurt) {
      ctx.strokeStyle = shade(st.color, -28);
      ctx.lineWidth = Math.max(1, s * 0.008);
      ctx.beginPath();
      ctx.moveTo(headX - bLead * hw * 2.18, bandY + hh * 0.02);
      ctx.lineTo(jx, jy - pr * 0.9);
      ctx.stroke();
      if (strike) {
        const fr = Math.floor(f.nowMs / 90);
        // The jewel does not glow — it ARCS: to the brim tip, and
        // off its own points into the air.
        stormArc(ctx, jx, jy, headX - bLead * hw * 2.3, bandY - hh * 0.06, fr * 5 + 1, hh * 0.1, seamC, 0.85, Math.max(1, s * 0.007));
        stormArc(ctx, jx + pr * 0.3, jy + pr * 0.5, jx + pr * 1.4, jy + pr * 1.5, fr * 5 + 2, hh * 0.07, seamC, 0.6, Math.max(1, s * 0.006), false);
      }
    }
    ctx.save();
    ctx.translate(jx, jy);
    ctx.rotate(bLead * -0.1 + jSwing / (hw * 1.4));
    ctx.fillStyle = hurt ? '#ffffff' : strike ? '#ffffff' : shade(st.boltjewel?.color ?? st.trim, Math.round(-18 + 34 * k));
    ctx.beginPath();
    ctx.moveTo(pr * 0.1, -pr * 0.85);
    ctx.lineTo(-pr * 0.42, pr * 0.12);
    ctx.lineTo(-pr * 0.05, pr * 0.12);
    ctx.lineTo(-pr * 0.16, pr * 0.8);
    ctx.lineTo(pr * 0.46, -pr * 0.1);
    ctx.lineTo(pr * 0.08, -pr * 0.1);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = shade(st.boltjewel?.color ?? st.trim, 34);
      ctx.fillRect(-pr * 0.04, -pr * 0.5, pr * 0.15, pr * 0.15);
    }
    ctx.restore();
    return;
  }

  if (st.kind === 'showerhat') {
    // THE LUCKWARD HAT — sunshower's own head: rain with the sun
    // still out, worn with a brim. One wide rain-slicked brim, sagged
    // at the front so the shadow door stays; a ring of drip beads
    // hangs off the edge — parted at the face — and one drop lets go
    // each cycle. The braided band holds the sun boss at its leading
    // side, and off the trailing edge THE PRISM ARC wakes on the
    // clock: the rainbow only this weather owns.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.74 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.6;
    const oBot = headY + hh * 0.84;
    // The rolling sky's first station: the crown leads (off 0).
    const k = stormboltK(f.nowMs);
    const sunC = st.showerluck?.sun ?? st.trim;
    const beadC = st.showerluck?.bead ?? '#eaf4ff';
    const brimY = headY - hh * 0.3;
    const brimRx = hw * 2.15 * (1 - 0.16 * t);
    // The mantle first — the hat sits on cloth, not on hair.
    ctx.fillStyle = mc;
    ctx.beginPath();
    ctx.moveTo(headX - hw * 1.18, headY + hh * 1.1);
    ctx.quadraticCurveTo(headX - hw * 1.26, headY - hh * 0.2, headX - hw * 0.96, brimY);
    ctx.lineTo(headX + hw * 0.96, brimY);
    ctx.quadraticCurveTo(headX + hw * 1.26, headY - hh * 0.2, headX + hw * 1.18, headY + hh * 1.1);
    ctx.quadraticCurveTo(headX, headY + hh * 1.38, headX - hw * 1.18, headY + hh * 1.1);
    ctx.closePath();
    ctx.fill();
    if (!hurt && front) {
      // The face window sits in the mantle below the brim.
      ctx.fillStyle = shade(st.color, -8);
      ctx.beginPath();
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
      ctx.fill();
      // Mystery poured from the brim, past the eye line.
      // THE CAST VEIL under the brim — a true falloff clipped
      // inside the window.
      ctx.save();
      ctx.beginPath();
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
      ctx.clip();
      stormVeil(ctx, cx, ohw, oTop + cut * 0.2, headY + hh * 0.16, headY + hh * 0.66, '#1e1408');
      ctx.restore();
      ctx.strokeStyle = shade(st.color, 18);
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
      ctx.stroke();
    }
    if (!hurt && !front) {
      // The back read: the mantle's rain-dark center seam and a
      // soaked drape tail below the brim line.
      ctx.fillStyle = shade(st.color, -12);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.4, headY + hh * 0.7);
      ctx.lineTo(headX + hw * 0.4, headY + hh * 0.7);
      ctx.lineTo(headX + lead * hw * 0.06, headY + hh * 1.8);
      ctx.closePath();
      ctx.fill();
    }
    // THE BRIM: one wide rain-slick plane. Lower lip sags; the back
    // rides high. Painted as two half-ellipses sharing the rim line.
    const dipRy = hh * 0.46;
    const riseRy = hh * 0.26;
    ctx.fillStyle = hurt ? '#ffffff' : shade(st.color, -4);
    ctx.beginPath();
    ctx.ellipse(headX, brimY, brimRx, dipRy, 0, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = hurt ? '#ffffff' : shade(st.color, 8);
    ctx.beginPath();
    ctx.ellipse(headX, brimY, brimRx, riseRy, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // THE WATER SHEEN: one pale streak riding the upper plane, and
      // a lit rim line at the edge — slicked, not dry felt.
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = shade(st.trim, 10);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.ellipse(headX, brimY, brimRx * 0.78, riseRy * 0.6, 0, Math.PI * 1.12, Math.PI * 1.7);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = shade(st.color, 20);
      ctx.lineWidth = Math.max(1, s * 0.011);
      ctx.beginPath();
      ctx.ellipse(headX, brimY, brimRx, dipRy, 0, 0, Math.PI);
      ctx.stroke();
      // THE DRIP RING: beads hanging off the brim edge on hairline
      // cords, PARTED at the front so the shadow door stays. One
      // drop per cycle lets go and falls.
      const dropU = ((f.nowMs % 7200) / 7200);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.35;
        const ux = Math.cos(a);
        if (front && Math.abs(ux) < 0.4 && Math.sin(a) > 0) continue;
        const bx = headX + ux * brimRx * 0.94;
        const by = brimY + Math.sin(a) * (Math.sin(a) > 0 ? dipRy : riseRy) * 0.94;
        const hang = hh * (0.1 + 0.05 * Math.sin(i * 2.2));
        ctx.strokeStyle = shade(st.color, -16);
        ctx.lineWidth = Math.max(1, s * 0.006);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx, by + hang);
        ctx.stroke();
        ctx.fillStyle = beadC;
        ctx.beginPath();
        ctx.ellipse(bx, by + hang + headR * 0.035, headR * 0.032, headR * 0.045, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(beadC, 30);
        ctx.beginPath();
        ctx.arc(bx - headR * 0.01, by + hang + headR * 0.022, headR * 0.012, 0, Math.PI * 2);
        ctx.fill();
        // The falling drop: bead 3's drip lets go once a cycle.
        if (i === 3) {
          const fall = dropU * hh * 0.9;
          ctx.globalAlpha = Math.max(0, 0.85 - dropU);
          ctx.fillStyle = beadC;
          ctx.beginPath();
          ctx.ellipse(bx, by + hang + headR * 0.09 + fall, headR * 0.02, headR * 0.034, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }
    // THE CROWN: a low slicked dome over the brim.
    ctx.fillStyle = hurt ? '#ffffff' : st.color;
    ctx.beginPath();
    ctx.moveTo(headX - hw * 0.92, brimY);
    ctx.quadraticCurveTo(headX - hw * 0.98, headY - hh * 0.98, headX - hw * 0.4, headY - hh * 1.14);
    ctx.quadraticCurveTo(headX + lead * hw * 0.1, headY - hh * (1.26 + 0.02 * Math.sin(f.nowMs * 0.0012)), headX + hw * 0.4, headY - hh * 1.14);
    ctx.quadraticCurveTo(headX + hw * 0.98, headY - hh * 0.98, headX + hw * 0.92, brimY);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // The lit pitch of the crown.
      ctx.fillStyle = shade(st.color, 10);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 0.14, headY - hh * 1.22);
      ctx.quadraticCurveTo(headX + lead * hw * 0.66, headY - hh * 1.06, headX + lead * hw * 0.8, brimY - hh * 0.12);
      ctx.lineTo(headX + lead * hw * 0.5, brimY - hh * 0.1);
      ctx.quadraticCurveTo(headX + lead * hw * 0.42, headY - hh * 1.0, headX + lead * hw * 0.0, headY - hh * 1.18);
      ctx.closePath();
      ctx.fill();
      // THE BRAIDED BAND: two cords crossing — gold and cream — with
      // the knot at the trailing side.
      const bandY = brimY - hh * 0.16;
      for (const [colr, ph] of [[sunC, 0], [st.trim, Math.PI]] as const) {
        ctx.strokeStyle = shade(colr, -4);
        ctx.lineWidth = Math.max(1, s * 0.011);
        ctx.beginPath();
        for (let i = 0; i <= 10; i++) {
          const u = -0.88 + (i / 10) * 1.76;
          const x = headX + hw * u;
          const y = bandY + Math.sin((u * 3.2) + ph) * hh * 0.035;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.fillStyle = shade(sunC, -10);
      ctx.beginPath();
      ctx.arc(headX - lead * hw * 0.82, bandY + hh * 0.02, headR * 0.05, 0, Math.PI * 2);
      ctx.fill();
      // THE SUN BOSS: the half-disc at the band's leading side, ray
      // nubs reaching, one glint walking its rim with the charge.
      const sbx = headX + lead * hw * 0.6;
      const sbr = headR * 0.2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(sbx - sbr * 1.6, bandY - sbr * 1.9, sbr * 3.2, sbr * 1.9);
      ctx.clip();
      for (let i = 0; i < 5; i++) {
        const a = Math.PI + (i / 4) * Math.PI;
        ctx.strokeStyle = shade(sunC, -6);
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        ctx.moveTo(sbx + Math.cos(a) * sbr * 1.05, bandY + Math.sin(a) * sbr * 1.05);
        ctx.lineTo(sbx + Math.cos(a) * sbr * 1.38, bandY + Math.sin(a) * sbr * 1.38);
        ctx.stroke();
      }
      ctx.strokeStyle = shade(sunC, -46);
      ctx.lineWidth = Math.max(1.5, s * 0.013);
      ctx.beginPath();
      ctx.arc(sbx, bandY, sbr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = sunC;
      ctx.beginPath();
      ctx.arc(sbx, bandY, sbr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(sunC, 24);
      ctx.beginPath();
      ctx.arc(sbx, bandY, sbr * 0.62, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      const ga = Math.PI * (1.0 + 1.0 * k);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.5 + 0.5 * k;
      ctx.beginPath();
      ctx.arc(sbx + Math.cos(ga) * sbr * 0.85, bandY - Math.abs(Math.sin(ga)) * sbr * 0.85, headR * 0.022, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // THE PRISM ARC: three thin bows springing off the trailing
      // brim, waking with the charge — sun and rain shaking hands.
      if (st.prismarc) {
        const pcs = st.prismarc.colors;
        const ax = headX - lead * brimRx * 0.6;
        const ay = brimY + hh * 0.06;
        ctx.globalAlpha = 0.42 + 0.45 * k;
        ctx.lineWidth = Math.max(1.5, s * 0.017);
        for (let i = 0; i < pcs.length; i++) {
          ctx.strokeStyle = shade(pcs[i]!, 14);
          ctx.beginPath();
          const rr = hw * (0.56 + i * 0.11);
          const a0 = lead === 1 ? Math.PI * 0.98 : Math.PI * 1.52;
          const a1 = lead === 1 ? Math.PI * 1.48 : Math.PI * 2.02;
          ctx.arc(ax, ay, rr, a0, a1);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }
    return;
  }

  if (st.kind === 'coronacowl') {
    // THE CORONA COWL — the aurora sovereign's head: the zenith,
    // worn. A folded midnight cowl on the vigils triangle whose peak
    // carries THE CORONA — the crown of rays the sky only shows
    // straight overhead — asleep to a single frost seed through the
    // quiet arc and erupting when the substorm lands (the dance's
    // first station). Beneath it a wide HORIZON MANTLE hands the
    // hood to the shoulder line, and along its hem lies the quiet
    // arc every dancing sky stands up from — the same horizon the
    // shoulder drifts rise off. The face keeps the wardrobe's
    // deepest dark: the lights dance for the sky, never the door.
    const t = profileK;
    const front = backK <= 0.55;
    const kC = auroraK(f.nowMs, 0);
    const kM = auroraK(f.nowMs, 0.05);
    const cor = st.corona?.colors ?? [st.trim, st.trim, st.trim];
    const starC = st.corona?.star ?? '#e8f4ee';
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.72 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.58;
    const oBot = headY + hh * 0.84;
    const sway = Math.sin(f.nowMs * 0.0011) * hw * 0.024;
    const apexX = headX - lead * hw * (0.26 + t * 0.1) + sway;
    const apexY = headY - hh * 1.46;
    // THE NAPE FIRST: cap the skull before any shell (the cap law) —
    // no facing may show scalp between cloth and crown.
    ctx.fillStyle = hurt ? '#ffffff' : shade(st.color, -8);
    ctx.beginPath();
    ctx.ellipse(headX, headY - hh * 0.24, hw * 1.02, hh * 0.98, 0, 0, Math.PI * 2);
    ctx.fill();
    // THE HORIZON MANTLE: wide banded shoulders, top tucked in under
    // the cowl (the bell owns the head), the hem swept in one slack
    // arc. Garment-scale structure: it holds white in the hurt flash.
    const mantle = (): void => {
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.64, headY + hh * 0.12);
      ctx.quadraticCurveTo(headX - hw * 1.58, headY + hh * 0.7, headX - hw * 1.42, headY + hh * 2.2);
      ctx.quadraticCurveTo(headX - lead * hw * 0.2, headY + hh * (2.62 + 0.08 * t), headX + hw * 1.44, headY + hh * 2.14);
      ctx.quadraticCurveTo(headX + hw * 1.56, headY + hh * 0.68, headX + hw * 0.64, headY + hh * 0.12);
      ctx.closePath();
    };
    ctx.fillStyle = hurt ? '#ffffff' : shade(st.color, -14);
    mantle();
    ctx.fill();
    if (!hurt) {
      ctx.save();
      mantle();
      ctx.clip();
      // The trailing side folds dark — hard planes, cloth's shadow.
      ctx.fillStyle = shade(st.color, -24);
      ctx.beginPath();
      ctx.moveTo(headX - lead * hw * 1.52, headY + hh * 0.48);
      ctx.lineTo(headX - lead * hw * 0.5, headY + hh * 0.3);
      ctx.lineTo(headX - lead * hw * 0.66, headY + hh * 2.6);
      ctx.lineTo(headX - lead * hw * 1.5, headY + hh * 2.45);
      ctx.closePath();
      ctx.fill();
      // THE QUIET ARC: the aurora lying along the horizon hem — a
      // drawn casing under a pale core with rays combed up into the
      // cloth, brightening and rippling as the dance passes. Every
      // stroke lives inside the mantle clip; the dilate never sees
      // a whisker. The hem drapes BELOW the shoulder caps, so the
      // arc stays in the open at every facing.
      const arcPts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i <= 6; i++) {
        const u = i / 6;
        arcPts.push({
          x: headX - hw * 1.32 + u * hw * 2.64,
          y: headY + hh * (2.06 + 0.34 * Math.sin(Math.PI * u)) +
            Math.sin(f.nowMs * 0.0017 + u * 4.6) * hh * (0.016 + 0.05 * kM),
        });
      }
      ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const rw = 0.5 + 0.5 * Math.sin(f.nowMs * 0.0011 + i * 2.3);
        const aA = (0.14 + 0.5 * kM) * (0.4 + 0.6 * rw);
        if (aA < 0.14) continue;
        const bx = (arcPts[i]!.x + arcPts[i + 1]!.x) / 2;
        const by = (arcPts[i]!.y + arcPts[i + 1]!.y) / 2;
        ctx.globalAlpha = aA;
        ctx.strokeStyle = cor[i % cor.length]!;
        ctx.lineWidth = Math.max(1.2, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.sin(f.nowMs * 0.0009 + i) * hw * 0.05, by - hh * (0.16 + 0.14 * kM));
        ctx.stroke();
      }
      const arcTrace = (): void => {
        ctx.beginPath();
        ctx.moveTo(arcPts[0]!.x, arcPts[0]!.y);
        for (let i = 1; i < arcPts.length; i++) ctx.lineTo(arcPts[i]!.x, arcPts[i]!.y);
        ctx.stroke();
      };
      ctx.globalAlpha = 0.35 + 0.5 * kM;
      ctx.strokeStyle = cor[0]!;
      ctx.lineWidth = Math.max(1.6, s * 0.02);
      arcTrace();
      ctx.globalAlpha = 0.5 + 0.5 * kM;
      ctx.strokeStyle = '#e8fff4';
      ctx.lineWidth = Math.max(1, s * 0.009);
      arcTrace();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    // THE CHARGED RING: the aurora orbiting the cowl itself — a
    // drawn ribbon circling the crown on the floating-orbit split
    // law (far arc painted BEFORE the shell, near arc after the
    // face), spinning at one constant pace forever. Quiet sky: one
    // slow teal ring. The dance charges it — wider, brighter, rays
    // combing off the near passage, and a second violet ring wakes
    // inside the first. Floating light: the hurt flash owns none
    // of it (the shell holds the white).
    const wakeC = Math.max(0, (kC - 0.42) / 0.58);
    const ringCy = headY - hh * 0.52;
    const ringPass = (nearP: boolean): void => {
      if (hurt) return;
      ctx.lineCap = 'round';
      const rings = wakeC > 0.3 ? 2 : 1;
      for (let rg = 0; rg < rings; rg++) {
        const colRg = cor[rg === 0 ? 0 : 2] ?? st.trim;
        const scaleR = rg === 0 ? 1 : 0.78;
        const rxR = hw * 1.82 * scaleR;
        const ryR = hh * (0.4 + 0.08 * wakeC) * scaleR;
        const baseR = f.nowMs * (rg === 0 ? 0.00052 : 0.00068) + rg * 2.4;
        const gate = rg === 0 ? 1 : Math.min(1, (wakeC - 0.3) / 0.5);
        const segsR = 18;
        for (let i = 0; i < segsR; i++) {
          const a0 = baseR + (i / segsR) * Math.PI * 2;
          const a1 = baseR + ((i + 1) / segsR) * Math.PI * 2;
          const dep = Math.sin((a0 + a1) / 2);
          if (nearP ? dep < 0 : dep >= 0) continue;
          const aa = (0.26 + 0.55 * kC) * Math.min(1, Math.abs(dep) * 2.4) *
            (nearP ? 1 : 0.5) * gate;
          if (aa < 0.08) continue;
          const wob0 = Math.sin(a0 * 3 + f.nowMs * 0.0007 + rg * 2) * hh * (0.02 + 0.05 * wakeC);
          const wob1 = Math.sin(a1 * 3 + f.nowMs * 0.0007 + rg * 2) * hh * (0.02 + 0.05 * wakeC);
          const x0 = headX + Math.cos(a0) * rxR;
          const y0R = ringCy + Math.sin(a0) * ryR + wob0;
          const x1 = headX + Math.cos(a1) * rxR;
          const y1R = ringCy + Math.sin(a1) * ryR + wob1;
          ctx.globalAlpha = Math.min(1, aa) * 0.6;
          ctx.strokeStyle = colRg;
          ctx.lineWidth = Math.max(1.3, s * 0.015) * (nearP ? 1 : 0.72);
          ctx.beginPath();
          ctx.moveTo(x0, y0R);
          ctx.lineTo(x1, y1R);
          ctx.stroke();
          ctx.globalAlpha = Math.min(1, aa);
          ctx.strokeStyle = '#e8fff4';
          ctx.lineWidth = Math.max(1, s * 0.0065) * (nearP ? 1 : 0.72);
          ctx.beginPath();
          ctx.moveTo(x0, y0R);
          ctx.lineTo(x1, y1R);
          ctx.stroke();
          if (nearP && rg === 0 && i % 3 === 0) {
            // Charge rays comb up and outward off the bright arc —
            // skipped whole below the dilate bar.
            const rw = 0.5 + 0.5 * Math.sin(f.nowMs * 0.0011 + i * 2.1);
            const ra = Math.min(1, aa) * (0.26 + 0.5 * rw) * (0.4 + 0.6 * wakeC);
            if (ra >= 0.3) {
              const outR = x0 >= headX ? 1 : -1;
              ctx.globalAlpha = ra;
              ctx.strokeStyle = colRg;
              ctx.lineWidth = Math.max(1.1, s * 0.009);
              ctx.beginPath();
              ctx.moveTo(x0, y0R);
              ctx.lineTo(x0 + outR * hw * 0.14, y0R - hh * (0.1 + 0.12 * wakeC));
              ctx.stroke();
            }
          }
        }
      }
      ctx.globalAlpha = 1;
    };
    ringPass(false);
    if (!hurt) {
      // THE FROST SEED: the one forged thing — a star seated at the
      // peak, always awake; the corona erupts from it at the dance.
      ctx.fillStyle = starC;
      ctx.globalAlpha = 0.85;
      starPrick(ctx, apexX, apexY + hh * 0.1, headR * (0.05 + 0.02 * wakeC));
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    const shell = (): void => {
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 1.18, headY + hh * 1.08);
      // Convex flanks: the cloth stands proud of the skull (straight
      // converging flanks let the skull break the cloth).
      ctx.quadraticCurveTo(headX + lead * hw * 1.4, headY + hh * 0.1, headX + lead * hw * 1.0, headY - hh * 0.58);
      ctx.quadraticCurveTo(headX + lead * hw * 0.72, headY - hh * 1.08, headX + lead * hw * 0.18, headY - hh * 1.28);
      // The peak, pinched and swept a hair to the trail.
      ctx.quadraticCurveTo(apexX + lead * hw * 0.2, apexY + hh * 0.1, apexX, apexY);
      // The dropped tip ends on a short vertical edge (blunt tip).
      ctx.lineTo(apexX - lead * hw * 0.15, apexY + hh * 0.1);
      ctx.lineTo(apexX - lead * hw * 0.13, apexY + hh * 0.22);
      ctx.quadraticCurveTo(headX - lead * hw * 0.64, headY - hh * 1.16, headX - lead * hw * (1.06 + t * 0.22), headY - hh * 0.5);
      ctx.quadraticCurveTo(headX - lead * hw * (1.34 + t * 0.26), headY + hh * 0.28, headX - lead * hw * 1.24, headY + hh * 1.08);
      ctx.quadraticCurveTo(headX, headY + hh * 1.36, headX + lead * hw * 1.18, headY + hh * 1.08);
      ctx.closePath();
    };
    const opening = (): void => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      // FOLDED DARK: hard planar shadows, never gradients.
      ctx.fillStyle = shade(st.color, -18);
      ctx.beginPath();
      ctx.moveTo(apexX, apexY);
      ctx.lineTo(headX - lead * hw * 0.64, headY - hh * 1.16);
      ctx.lineTo(headX - lead * hw * 1.2, headY - hh * 0.38);
      ctx.lineTo(headX - lead * hw * 1.32, headY + hh * 1.16);
      ctx.lineTo(headX - lead * hw * 0.12, headY + hh * 1.28);
      ctx.lineTo(headX - lead * hw * 0.2, headY - hh * 0.88);
      ctx.closePath();
      ctx.fill();
      // The lit leading plane under the peak.
      ctx.fillStyle = shade(st.color, 8);
      ctx.beginPath();
      ctx.moveTo(apexX, apexY);
      ctx.lineTo(headX + lead * hw * 0.32, headY - hh * 1.28);
      ctx.lineTo(headX + lead * hw * 0.66, headY - hh * 0.68);
      ctx.lineTo(headX + lead * hw * 0.16, headY - hh * 0.6);
      ctx.closePath();
      ctx.fill();
      // ONE BRIGHT EDGE: frost light finds the leading arris — a
      // rim stroke clipped INTO the shell (the dilate bar).
      ctx.strokeStyle = shade(st.trim, -6);
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = Math.max(1, s * 0.011);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 1.36, headY + hh * 0.2);
      ctx.quadraticCurveTo(headX + lead * hw * 1.06, headY - hh * 0.5, headX + lead * hw * 0.24, headY - hh * 1.24);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // One crease where the folded planes meet.
      ctx.strokeStyle = shade(st.color, -26);
      ctx.lineWidth = Math.max(1, s * 0.009);
      ctx.beginPath();
      ctx.moveTo(apexX, apexY + hh * 0.06);
      ctx.lineTo(headX + lead * hw * 0.14, headY - hh * 0.58);
      ctx.stroke();
      // THE STARS IN THE CLOTH: four-point pricks, one awake at a
      // time — the night the crown needs behind it.
      for (const [ui, sx, sy] of [[0, -0.5, -0.92], [1, 0.34, -1.04], [2, -0.1, -0.44]] as const) {
        const tw2 = 0.3 + 0.7 * Math.max(0, Math.sin(f.nowMs * 0.0009 + ui * 2.4));
        ctx.globalAlpha = 0.25 + 0.45 * tw2;
        ctx.fillStyle = starC;
        starPrick(ctx, headX + hw * sx, headY + hh * sy, headR * (0.035 + 0.02 * tw2));
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // THE VISITOR: once in a long while a star crosses the crown
      // cloth — a short drawn streak, clipped in, gone in a breath.
      const muV = (f.nowMs % 26800) / 26800;
      if (muV > 0.9 && muV < 0.945) {
        const pV = (muV - 0.9) / 0.045;
        const vx = headX - lead * hw * (0.72 - 1.5 * pV);
        const vy = headY - hh * (1.12 - 0.5 * pV);
        const aV = 0.75 * Math.sin(Math.PI * pV);
        if (aV >= 0.3) {
          ctx.globalAlpha = aV;
          ctx.strokeStyle = starC;
          ctx.lineCap = 'round';
          ctx.lineWidth = Math.max(1, s * 0.009);
          ctx.beginPath();
          ctx.moveTo(vx - lead * hw * 0.18, vy + hh * 0.06);
          ctx.lineTo(vx, vy);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      ctx.restore();
      if (front) {
        // THE CAST VEIL — the deepest dark the wardrobe owns. The
        // hold zone is one OPAQUE plane (stroke-band veils SEAM
        // against a lit face — the oath cowl's lesson); stormVeil
        // grades only the chin below it.
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        ctx.fillStyle = '#060a0e';
        ctx.fillRect(cx - ohw * 1.1, oTop - headR * 0.05, ohw * 2.2, (headY + hh * 0.3) - oTop + headR * 0.05);
        stormVeil(ctx, cx, ohw * 1.05, headY + hh * 0.28, headY + hh * 0.34, headY + hh * 0.8, '#060a0e');
        ctx.restore();
        // The shrine-door frame: frost border, inner dark line, and
        // the brow bar that seats the cowl on the face.
        ctx.strokeStyle = shade(st.trim, -10);
        ctx.lineWidth = Math.max(1, s * 0.013);
        ctx.beginPath();
        opening();
        ctx.stroke();
        ctx.strokeStyle = shade(st.color, -30);
        ctx.lineWidth = Math.max(1, s * 0.007);
        ctx.beginPath();
        chamferRect(ctx, cx - ohw * 0.9, oTop + headR * 0.06, ohw * 1.8, (oBot - oTop) - headR * 0.12, cut * 0.7);
        ctx.stroke();
        ctx.fillStyle = shade(st.color, -22);
        ctx.fillRect(cx - ohw * 0.98, oTop - headR * 0.045, ohw * 1.96, headR * 0.09);
      } else {
        // The back read: the drape tail going home, the center seam,
        // and one hem star — the corona above already says who.
        ctx.fillStyle = shade(st.color, -12);
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.36, headY + hh * 0.84);
        ctx.lineTo(headX + hw * 0.36, headY + hh * 0.84);
        ctx.lineTo(headX + lead * hw * 0.06, headY + hh * 1.84);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(st.color, -26);
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.beginPath();
        ctx.moveTo(apexX, apexY + hh * 0.3);
        ctx.quadraticCurveTo(headX - lead * hw * 0.1, headY - hh * 0.2, headX + lead * hw * 0.04, headY + hh * 0.8);
        ctx.stroke();
        const twB = 0.3 + 0.7 * Math.max(0, Math.sin(f.nowMs * 0.0009 + 4.1));
        ctx.globalAlpha = 0.25 + 0.4 * twB;
        ctx.fillStyle = starC;
        starPrick(ctx, headX - lead * hw * 0.42, headY + hh * 0.34, headR * 0.04);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    ringPass(true);
    return;
  }

  if (st.kind === 'hedgehat') {
    // THE HEDGEHAT — hedgemage's own head: the cone that grew in a
    // garden. Lumpier than the wizard's, bent TWICE — a crook and a
    // second sag — patched on the windward slope, banded in woven
    // two-tone cord holding a tucked herb sprig, and the brim waves
    // with one honest nibbled notch. A hat someone lives in.
    const bandY = headY - hh * 0.55;
    const u = -lead;
    const sway = Math.sin(f.nowMs * 0.0019) * hw * 0.06;
    const kneeX = headX + u * hw * 0.52;
    const kneeY = bandY - hh * 1.3;
    const tipX = headX + u * (hw * 1.24 + sway);
    const tipY = bandY - hh * 0.98;
    ctx.fillStyle = mc;
    ctx.beginPath();
    ctx.moveTo(headX - u * hw * 0.9, bandY);
    ctx.quadraticCurveTo(headX - u * hw * 0.48, bandY - hh * 0.95, headX - u * hw * 0.1, bandY - hh * 1.5);
    // The first bend: over the crook to the knee.
    ctx.quadraticCurveTo(headX + u * hw * 0.24, bandY - hh * 1.82, kneeX, kneeY - hh * 0.28);
    // The second sag: the tip drops BELOW the knee — a hat that gave
    // up standing years ago.
    ctx.quadraticCurveTo(kneeX + u * hw * 0.42, kneeY - hh * 0.28, tipX, tipY - hh * 0.16);
    ctx.quadraticCurveTo(tipX + u * hw * 0.2, tipY - hh * 0.02, tipX + u * hw * 0.04, tipY + hh * 0.14);
    ctx.quadraticCurveTo(kneeX + u * hw * 0.3, kneeY + hh * 0.12, kneeX - u * hw * 0.05, kneeY + hh * 0.1);
    ctx.quadraticCurveTo(headX + u * hw * 0.52, bandY - hh * 1.1, headX + u * hw * 0.62, bandY - hh * 0.8);
    ctx.quadraticCurveTo(headX + u * hw * 0.8, bandY - hh * 0.38, headX + u * hw * 0.9, bandY);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // The bend side folds dark — flat plane, cloth's own shadow.
      ctx.fillStyle = shade(st.color, -15);
      ctx.beginPath();
      ctx.moveTo(headX, bandY);
      ctx.quadraticCurveTo(headX + u * hw * 0.04, bandY - hh * 0.9, headX - u * hw * 0.02, bandY - hh * 1.44);
      ctx.quadraticCurveTo(headX + u * hw * 0.26, bandY - hh * 1.76, kneeX, kneeY - hh * 0.24);
      ctx.quadraticCurveTo(kneeX + u * hw * 0.4, kneeY - hh * 0.24, tipX, tipY - hh * 0.12);
      ctx.quadraticCurveTo(tipX + u * hw * 0.16, tipY, tipX + u * hw * 0.04, tipY + hh * 0.12);
      ctx.quadraticCurveTo(kneeX + u * hw * 0.3, kneeY + hh * 0.1, kneeX - u * hw * 0.05, kneeY + hh * 0.08);
      ctx.quadraticCurveTo(headX + u * hw * 0.52, bandY - hh * 1.08, headX + u * hw * 0.62, bandY - hh * 0.78);
      ctx.quadraticCurveTo(headX + u * hw * 0.8, bandY - hh * 0.38, headX + u * hw * 0.9, bandY);
      ctx.closePath();
      ctx.fill();
      // THE PATCH on the windward slope, askew, ticked.
      const pCol = shade(st.trim, -18);
      ctx.save();
      ctx.translate(headX - u * hw * 0.3, bandY - hh * 0.78);
      ctx.rotate(-u * 0.22);
      ctx.fillStyle = pCol;
      ctx.fillRect(-hw * 0.22, -hh * 0.18, hw * 0.44, hh * 0.36);
      ctx.strokeStyle = shade(pCol, -24);
      ctx.lineWidth = Math.max(1, s * 0.009);
      for (const [x0, y0, x1, y1] of [
        [-hw * 0.22, -hh * 0.06, -hw * 0.15, -hh * 0.06],
        [hw * 0.15, hh * 0.04, hw * 0.22, hh * 0.04],
        [-hw * 0.04, -hh * 0.18, -hw * 0.04, -hh * 0.11],
        [hw * 0.02, hh * 0.11, hw * 0.02, hh * 0.18],
      ] as const) {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      ctx.restore();
    }
    // THE BRIM: wavy, one nibbled notch on the trailing side — a
    // slab that argued with mice and lost a little.
    ctx.fillStyle = hurt ? '#ffffff' : shade(st.color, 6);
    ctx.beginPath();
    ctx.moveTo(headX - hw * 1.9, bandY + hh * 0.16);
    ctx.quadraticCurveTo(headX - hw * 1.3, bandY - hh * 0.26, headX - hw * 0.5, bandY - hh * 0.22);
    ctx.quadraticCurveTo(headX, bandY - hh * 0.3, headX + hw * 0.5, bandY - hh * 0.2);
    ctx.quadraticCurveTo(headX + hw * 1.3, bandY - hh * 0.24, headX + hw * 1.9, bandY + hh * 0.12);
    // The nibble: a bite off the trailing rim.
    ctx.lineTo(headX + hw * 1.44, bandY + hh * 0.26);
    ctx.lineTo(headX + hw * 1.28, bandY + hh * 0.16);
    ctx.lineTo(headX + hw * 1.1, bandY + hh * 0.3);
    ctx.quadraticCurveTo(headX, bandY + hh * 0.4, headX - hw * 1.9, bandY + hh * 0.16);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = shade(st.color, -24);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 1.76, bandY + hh * 0.18);
      ctx.quadraticCurveTo(headX, bandY + hh * 0.44, headX + hw * 1.06, bandY + hh * 0.3);
      ctx.quadraticCurveTo(headX, bandY + hh * 0.36, headX - hw * 1.76, bandY + hh * 0.18);
      ctx.closePath();
      ctx.fill();
      // THE WOVEN CORD BAND: two-tone dashes — cord over cord, the
      // hedge-craft answer to a buckle.
      const c1 = st.trim;
      const c2 = shade(st.color, -26);
      for (let i = 0; i < 7; i++) {
        const bx = headX - hw * 0.72 + (i / 6) * hw * 1.44;
        ctx.fillStyle = i % 2 === 0 ? c1 : c2;
        ctx.fillRect(bx - hw * 0.1, bandY - hh * 0.42 + (i % 2 ? hh * 0.03 : 0), hw * 0.2, hh * 0.17);
      }
      if (st.sprig && backK <= 0.55) {
        // THE SPRIG: three leaves and seed dots tucked in the band —
        // picked this morning, worn till it wilts.
        const sc = st.sprig.color;
        const sx = headX + fx * headR * 0.3;
        const sy = bandY - hh * 0.42;
        ctx.strokeStyle = shade(sc, -18);
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        ctx.moveTo(sx, sy + hh * 0.08);
        ctx.quadraticCurveTo(sx + hw * 0.06, sy - hh * 0.18, sx + hw * 0.16, sy - hh * 0.34);
        ctx.stroke();
        for (const [da, dl, rot] of [
          [-0.5, 0.2, -0.9], [0.3, 0.26, 0.4], [0.02, 0.38, -0.2],
        ] as const) {
          const lx = sx + hw * (0.06 + da * 0.14);
          const ly = sy - hh * (0.1 + dl * 0.5);
          ctx.save();
          ctx.translate(lx, ly);
          ctx.rotate(rot);
          ctx.fillStyle = sc;
          ctx.beginPath();
          ctx.ellipse(0, 0, hw * 0.13, hh * 0.06, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = shade(sc, 30);
        for (const [ddx, ddy] of [[0.2, -0.42], [0.26, -0.3]] as const) {
          ctx.beginPath();
          ctx.arc(sx + hw * ddx, sy + hh * ddy, s * 0.008, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    return;
  }

  if (st.kind === 'tidehat') {
    // THE TIDEWEAVER'S HAT — the master water-weaver's crown piece.
    // The spire is WOVEN: three water courses cross it as flat
    // planes, their seams foam-stitched, the middle course alive
    // with the tide; the tip pinches and curls like a wave about to
    // land, shedding its droplet at the break. One swell circles
    // the brim forever as a bulge in the brim itself, the rim's one
    // bright edge flowing over it unbroken. At the base the cone
    // stands in a pooled basin ringed in foam, and the band carries
    // the pearl count under a crown pearl in a silver crescent.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.74 * (1 - 0.5 * t);
    const k = tideK(f.nowMs, 0.06);
    const brk = tideBreakK(f.nowMs, 0.06);
    const bandY = headY - hh * 0.55;
    const u = -lead;
    const sway = Math.sin(f.nowMs * 0.0017) * hw * 0.09;
    const tipX = headX + u * (hw * 1.38 + sway);
    const tipY = bandY - hh * 1.72;
    const oTop = headY - hh * 0.6;
    const oBot = headY + hh * 0.84;
    const foamC = st.trim;
    // THE MANTLE: the tide court covers its head — cloth to the
    // shoulders, risen to meet the band at every facing, its face
    // window CUT (evenodd).
    const mantle = (): void => {
      ctx.moveTo(headX - hw * 1.18, headY + hh * 1.1);
      // The top corners tuck IN under the cone (the skull is narrow
      // up there): a mantle corner wider than the bell's foot peeks
      // past it above the brim and reads as a squared skull.
      ctx.quadraticCurveTo(headX - hw * 1.24, bandY + hh * 0.12, headX - hw * 0.64, bandY - hh * 0.44);
      ctx.lineTo(headX + hw * 0.64, bandY - hh * 0.44);
      ctx.quadraticCurveTo(headX + hw * 1.24, bandY + hh * 0.12, headX + hw * 1.18, headY + hh * 1.1);
      ctx.quadraticCurveTo(headX, headY + hh * 1.38, headX - hw * 1.18, headY + hh * 1.1);
      ctx.closePath();
    };
    const opening = (): void => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    mantle();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt && !front) {
      // The back read: soaked center seam, tail light over dark.
      ctx.fillStyle = shade(st.color, -12);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.4, headY + hh * 0.7);
      ctx.lineTo(headX + hw * 0.4, headY + hh * 0.7);
      ctx.lineTo(headX + lead * hw * 0.06, headY + hh * 1.8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = st.color;
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.16, headY + hh * 0.74);
      ctx.lineTo(headX + hw * 0.16, headY + hh * 0.74);
      ctx.lineTo(headX + lead * hw * 0.05, headY + hh * 1.66);
      ctx.closePath();
      ctx.fill();
    }
    // THE CIRCLING SWELL, far hint: rounding the back rim it shows
    // only its foam over the edge — painted before the spire so the
    // hat occludes it honestly.
    const wa = ((f.nowMs / 6800) % 1) * Math.PI * 2;
    const swellX = headX + Math.cos(wa) * hw * 1.55;
    const nearSwell = Math.sin(wa) > 0;
    const tipFade = Math.min(1, Math.max(0, (0.88 - Math.abs(Math.cos(wa))) / 0.26));
    if (!hurt && !nearSwell && tipFade > 0.05) {
      ctx.globalAlpha = tipFade;
      ctx.fillStyle = foamC;
      ctx.beginPath();
      ctx.arc(swellX, bandY - hh * 0.18, hw * 0.14, Math.PI * 0.95, Math.PI * 2.05);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(st.color, 10);
      ctx.beginPath();
      ctx.ellipse(swellX, bandY - hh * 0.12, hw * 0.3, hh * 0.08, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // THE SPIRE — ONE SWEEP: the cone is a single unbroken bell
    // from brim to crook. Its foot flares WIDE into the brim
    // (swallowing the old square step where band met cone) and no
    // part of its edge ever runs vertical — the Black Mage read:
    // the hat and the head are one thing.
    const spire = (): void => {
      ctx.moveTo(headX - u * hw * 1.14, bandY + hh * 0.06);
      ctx.quadraticCurveTo(headX - u * hw * 0.82, bandY - hh * 0.36, headX - u * hw * 0.46, bandY - hh * 0.9);
      ctx.quadraticCurveTo(headX - u * hw * 0.18, bandY - hh * 1.42, headX - u * hw * 0.02, bandY - hh * 1.64);
      ctx.quadraticCurveTo(headX + u * hw * 0.3, bandY - hh * 2.02, tipX, tipY - hh * 0.22);
      ctx.quadraticCurveTo(tipX + u * hw * 0.18, tipY - hh * 0.04, tipX + u * hw * 0.02, tipY + hh * 0.14);
      ctx.quadraticCurveTo(headX + u * hw * 0.46, bandY - hh * 1.38, headX + u * hw * 0.56, bandY - hh * 0.9);
      ctx.quadraticCurveTo(headX + u * hw * 0.92, bandY - hh * 0.32, headX + u * hw * 1.14, bandY + hh * 0.06);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    spire();
    ctx.fill();
    if (!hurt) {
      // THE WOVEN COURSES: the cone is water, woven — three courses
      // crossing the spire as flat planes, clipped to the cloth, so
      // the weave lives IN the silhouette and never on it.
      ctx.save();
      ctx.beginPath();
      spire();
      ctx.clip();
      // The spine the weave follows.
      const spx = (v: number): number =>
        (1 - v) * (1 - v) * headX + 2 * (1 - v) * v * (headX + u * hw * 0.12) + v * v * tipX;
      const spy = (v: number): number =>
        (1 - v) * (1 - v) * (bandY - hh * 0.1) + 2 * (1 - v) * v * (bandY - hh * 1.3) + v * v * (tipY + hh * 0.1);
      const wof = (v: number): number => hw * (1.02 - 0.84 * v);
      for (const [i, [v0, v1, dv]] of [
        [0, [0.02, 0.3, -11]], [1, [0.3, 0.62, 8]], [2, [0.62, 0.98, -9]],
      ] as const) {
        // Each course leans into the wind — the seams run diagonal.
        const skew = 0.09 * (i % 2 === 0 ? 1 : -1);
        ctx.fillStyle = shade(st.color, dv);
        ctx.beginPath();
        ctx.moveTo(spx(v0) - wof(v0) * 1.2, spy(v0 + skew * 0.5));
        ctx.lineTo(spx(v0) + wof(v0) * 1.2, spy(Math.max(0, v0 - skew * 0.5)));
        ctx.lineTo(spx(v1) + wof(v1) * 1.2, spy(Math.max(0, v1 - skew * 0.5)));
        ctx.lineTo(spx(v1) - wof(v1) * 1.2, spy(Math.min(1, v1 + skew * 0.5)));
        ctx.closePath();
        ctx.fill();
      }
      // The foam stitching at the two course seams — the weaver's
      // hand made visible. The lower seam is the LIVING one: its
      // stitch light breathes with the tide.
      ctx.lineCap = 'round';
      for (const [sv, alive] of [[0.3, 1], [0.62, 0]] as const) {
        const skew = 0.09;
        ctx.strokeStyle = foamC;
        ctx.globalAlpha = alive ? 0.3 + 0.45 * k + 0.25 * brk : 0.3;
        ctx.lineWidth = Math.max(1, s * (alive ? 0.009 : 0.007));
        ctx.beginPath();
        ctx.moveTo(spx(sv) - wof(sv) * 1.2, spy(Math.min(1, sv + skew * 0.5)));
        ctx.lineTo(spx(sv) + wof(sv) * 1.2, spy(Math.max(0, sv - skew * 0.5)));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Two stitch beads travelling the living seam at the water's
      // constant pace, born and dying at nothing (the seamless law).
      const sv = 0.3;
      const sx0 = spx(sv) - wof(sv) * 1.2;
      const sy0 = spy(Math.min(1, sv + 0.045));
      const sx1 = spx(sv) + wof(sv) * 1.2;
      const sy1 = spy(Math.max(0, sv - 0.045));
      ctx.fillStyle = foamC;
      for (const bp of [0, 0.5] as const) {
        const ub = ((f.nowMs * 0.00016 + bp) % 1 + 1) % 1;
        const life = Math.sin(ub * Math.PI);
        ctx.globalAlpha = life * 0.9;
        ctx.beginPath();
        ctx.arc(sx0 + (sx1 - sx0) * ub, sy0 + (sy1 - sy0) * ub, s * 0.009 * (0.6 + 0.6 * life), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // The crook side folds dark over the weave — the magus's own
      // shading grammar, so the courses stay cloth, not stripes.
      ctx.fillStyle = shade(st.color, -14);
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(headX, bandY + hh * 0.05);
      ctx.quadraticCurveTo(headX + u * hw * 0.04, bandY - hh * 0.95, headX - u * hw * 0.01, bandY - hh * 1.52);
      ctx.quadraticCurveTo(headX + u * hw * 0.3, bandY - hh * 1.94, tipX, tipY - hh * 0.2);
      ctx.quadraticCurveTo(tipX + u * hw * 0.16, tipY - hh * 0.03, tipX + u * hw * 0.02, tipY + hh * 0.12);
      ctx.quadraticCurveTo(headX + u * hw * 0.46, bandY - hh * 1.36, headX + u * hw * 0.56, bandY - hh * 0.88);
      ctx.quadraticCurveTo(headX + u * hw * 0.92, bandY - hh * 0.32, headX + u * hw * 1.14, bandY + hh * 0.06);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
      // The windward ridge takes the light — the one bright line the
      // magus keeps, and the weave keeps it too.
      ctx.strokeStyle = shade(st.color, 16);
      ctx.lineWidth = Math.max(1.5, s * 0.018);
      ctx.beginPath();
      ctx.moveTo(headX - u * hw * 0.26, bandY - hh * 0.5);
      ctx.quadraticCurveTo(headX - u * hw * 0.05, bandY - hh * 1.22, headX + u * hw * 0.26, bandY - hh * 1.66);
      ctx.stroke();
      // One crease under the crook.
      ctx.strokeStyle = shade(st.color, -24);
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(headX + u * hw * 0.14, bandY - hh * 1.4);
      ctx.quadraticCurveTo(headX + u * hw * 0.5, bandY - hh * 1.52, tipX - u * hw * 0.1, tipY + hh * 0.02);
      ctx.stroke();
      // THE CURL TIP: the pinched point curls like a wave about to
      // land — one foam roll at the pinch, and at the break it
      // finally sheds: a droplet falls the spire's whole height.
      ctx.fillStyle = foamC;
      ctx.beginPath();
      ctx.arc(tipX + u * hw * 0.03, tipY + hh * 0.14, hw * (0.075 + 0.02 * brk), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(foamC, 22);
      ctx.beginPath();
      ctx.arc(tipX + u * hw * 0.03, tipY + hh * 0.14, hw * (0.058 + 0.014 * brk), Math.PI * 1.06, Math.PI * 1.94);
      ctx.closePath();
      ctx.fill();
      if (brk > 0.08) {
        const du = 1 - brk;
        ctx.globalAlpha = (1 - du) * 0.95;
        ctx.beginPath();
        ctx.arc(tipX + u * hw * 0.04, tipY + hh * (0.24 + du * 1.5), hw * 0.05 * (1 - du * 0.35), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    // THE BRIM: the magus slab — full waved span, tips up, argued
    // with weather and won. Blunt tips (the whisker law); the edge
    // clipped into the cloth.
    const slab = (): void => {
      ctx.moveTo(headX - hw * 2.45, bandY - hh * 0.12);
      ctx.quadraticCurveTo(headX - hw * 1.7, bandY + hh * 0.26, headX - hw * 0.9, bandY - hh * 0.1);
      ctx.quadraticCurveTo(headX, bandY - hh * 0.3, headX + hw * 0.9, bandY - hh * 0.1);
      ctx.quadraticCurveTo(headX + hw * 1.7, bandY + hh * 0.26, headX + hw * 2.45, bandY - hh * 0.12);
      ctx.lineTo(headX + hw * 2.45, bandY + hh * 0.06);
      ctx.quadraticCurveTo(headX + hw * 1.6, bandY + hh * 0.44, headX, bandY + hh * 0.4);
      ctx.quadraticCurveTo(headX - hw * 1.6, bandY + hh * 0.44, headX - hw * 2.45, bandY + hh * 0.06);
      ctx.closePath();
    };
    ctx.fillStyle = hurt ? '#ffffff' : shade(st.color, 4);
    ctx.beginPath();
    slab();
    ctx.fill();
    if (!hurt) {
      // Brim underside — the sea's own dark beneath the slab.
      ctx.fillStyle = shade(st.color, -26);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 2.3, bandY + hh * 0.02);
      ctx.quadraticCurveTo(headX, bandY + hh * 0.48, headX + hw * 2.3, bandY + hh * 0.02);
      ctx.quadraticCurveTo(headX + hw * 1.5, bandY + hh * 0.38, headX, bandY + hh * 0.36);
      ctx.quadraticCurveTo(headX - hw * 1.5, bandY + hh * 0.38, headX - hw * 2.3, bandY + hh * 0.02);
      ctx.closePath();
      ctx.fill();
      // THE CIRCLING SWELL, near pass: a bulge IN the brim — same
      // cloth, fused to the slab, foam standing on its crest.
      if (nearSwell && tipFade > 0.05) {
        ctx.globalAlpha = tipFade;
        ctx.fillStyle = shade(st.color, 4);
        ctx.beginPath();
        ctx.ellipse(swellX, bandY + hh * 0.3, hw * 0.52, hh * (0.15 + 0.04 * k), 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(st.color, 14);
        ctx.beginPath();
        ctx.ellipse(swellX + hw * 0.1, bandY + hh * 0.28, hw * 0.3, hh * 0.09, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = foamC;
        for (const [fu, fr] of [[-0.18, 0.085], [0.16, 0.07]] as const) {
          ctx.beginPath();
          ctx.arc(swellX + hw * fu, bandY + hh * (0.15 - 0.04 * k), hw * fr * (1 + 0.3 * brk), Math.PI * 0.94, Math.PI * 2.06);
          ctx.closePath();
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      // THE ONE BRIGHT EDGE: the rim line flows over slab AND swell
      // unbroken — one continuous stroke says one continuous water —
      // clipped into the slab (the whisker law).
      ctx.save();
      ctx.beginPath();
      slab();
      ctx.clip();
      ctx.strokeStyle = shade(st.color, 26);
      ctx.lineWidth = Math.max(1, s * 0.013) * 2;
      ctx.beginPath();
      ctx.moveTo(headX - hw * 2.45, bandY - hh * 0.12);
      ctx.quadraticCurveTo(headX - hw * 1.7, bandY + hh * 0.26, headX - hw * 0.9, bandY - hh * 0.1);
      ctx.quadraticCurveTo(headX, bandY - hh * 0.3, headX + hw * 0.9, bandY - hh * 0.1);
      ctx.quadraticCurveTo(headX + hw * 1.7, bandY + hh * 0.26, headX + hw * 2.45, bandY - hh * 0.12);
      ctx.stroke();
      ctx.restore();
      if (nearSwell && tipFade > 0.05) {
        ctx.globalAlpha = tipFade;
        ctx.beginPath();
        ctx.arc(swellX, bandY + hh * 0.32, hw * 0.5, Math.PI * 1.08, Math.PI * 1.92);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // THE BASIN COLLAR: the spire stands in pooled sea — a ring of
      // lit water at the cone's base, foam at its lip, rippling as
      // the swell passes (the basin law: lit water, never a hole).
      ctx.fillStyle = shade(st.color, 10);
      ctx.beginPath();
      ctx.ellipse(headX, bandY - hh * 0.04, hw * 1.0, hh * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(st.color, -6);
      ctx.beginPath();
      ctx.ellipse(headX, bandY - hh * 0.06, hw * 0.72, hh * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shade(st.color, 22);
      ctx.globalAlpha = 0.35 + 0.4 * k;
      ctx.lineWidth = Math.max(1, s * 0.007);
      ctx.beginPath();
      ctx.ellipse(headX, bandY - hh * 0.05, hw * 1.0 * (0.55 + 0.45 * k), hh * 0.13 * (0.55 + 0.45 * k), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = foamC;
      for (const [ru, rr] of [[-0.94, 0.055], [0.98, 0.05]] as const) {
        ctx.beginPath();
        ctx.arc(headX + hw * ru, bandY - hh * 0.02, hw * rr, Math.PI * 0.92, Math.PI * 2.08);
        ctx.closePath();
        ctx.fill();
      }
      // THE BAND AND THE COUNT: the dark band WRAPS the cone (a
      // curved strip clipped into the sweep, never a straight
      // rect), four pearls walking, and THE CROWN PEARL front and
      // center in its silver crescent.
      ctx.save();
      ctx.beginPath();
      spire();
      ctx.clip();
      ctx.fillStyle = shade(st.color, -30);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 1.08, bandY - hh * 0.42);
      ctx.quadraticCurveTo(headX, bandY - hh * 0.28, headX + hw * 1.08, bandY - hh * 0.42);
      ctx.lineTo(headX + hw * 1.08, bandY - hh * 0.1);
      ctx.quadraticCurveTo(headX, bandY + hh * 0.04, headX - hw * 1.08, bandY - hh * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (front && st.pearls) {
        const pc = st.pearls.color;
        const walk = Math.floor(f.nowMs / 700) % 5;
        for (let i = 0; i < 5; i++) {
          const du = -0.56 + i * 0.28;
          const center = i === 2;
          const lit = i === walk || brk > 0.5;
          const pr = headR * (center ? 0.088 : lit ? 0.058 : 0.048);
          const px = cx + du * headR * 1.16;
          const py = bandY - hh * 0.29;
          if (center) {
            // The silver crescent setting under the crown pearl.
            ctx.strokeStyle = shade(pc, -18);
            ctx.lineWidth = Math.max(1, s * 0.009);
            ctx.beginPath();
            ctx.arc(px, py + headR * 0.015, pr * 1.22, Math.PI * 0.12, Math.PI * 0.88);
            ctx.stroke();
          }
          ctx.fillStyle = lit || center ? shade(pc, Math.round(14 + 20 * Math.max(k, brk))) : pc;
          ctx.beginPath();
          ctx.arc(px, py, pr, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = shade(pc, 55);
          ctx.beginPath();
          ctx.arc(px - pr * 0.3, py - pr * 0.32, pr * 0.32, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // THE POURING RILL: off the trailing edge the sea quietly
      // leaves — beads falling, twice the water at the break.
      const rillX = headX - lead * hw * 2.02;
      const rillY = bandY + hh * 0.14;
      ctx.strokeStyle = shade(st.color, 26);
      ctx.lineWidth = Math.max(1, s * 0.011);
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.7 + 0.3 * brk;
      ctx.beginPath();
      ctx.moveTo(rillX, rillY);
      ctx.quadraticCurveTo(rillX - lead * hw * 0.04, rillY + hh * 0.2, rillX - lead * hw * 0.02, rillY + hh * (0.34 + 0.12 * brk));
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = foamC;
      for (const rp of [0, 0.45] as const) {
        const ru = ((f.nowMs * 0.00055 + rp) % 1 + 1) % 1;
        const life = Math.sin(ru * Math.PI);
        ctx.globalAlpha = life * (0.6 + 0.4 * brk);
        ctx.beginPath();
        ctx.arc(rillX - lead * hw * 0.02 + Math.sin(ru * 9) * hw * 0.02, rillY + hh * (0.1 + ru * 0.62), hw * 0.05 * (0.6 + 0.5 * life), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (front) {
        // THE CAST VEIL under the brim, and the window's frame.
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        stormVeil(ctx, cx, ohw, oTop + cut * 0.2, headY + hh * 0.16, headY + hh * 0.68, '#0a161c');
        ctx.restore();
        ctx.strokeStyle = shade(st.color, 16);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        opening();
        ctx.stroke();
      }
    }
    return;
  }

  if (st.kind === 'depthcrown') {
    // THE BELL CROWN — the abyss's head: darkness wearing its one
    // lamp. A fitted midnight cowl under a jelly-bell crown — the
    // bell's scalloped skirt rings the brow, its rim light breathes
    // with the tide, and at the break it FLARES. Tentacle-veils
    // trail from both jaws (hung things trail), the freckle wake
    // counts across the cloth, and the angler stalk hangs its
    // iron-caged lamp before the deepest veil in the court.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.74 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.58;
    const oBot = headY + hh * 0.84;
    const k = tideK(f.nowMs, 0.06);
    const brk = tideBreakK(f.nowMs, 0.06);
    const lumeC = st.deeplure?.glow ?? st.trim;
    const bellC = st.bellcrown?.bell ?? shade(st.color, 24);
    const bLume = st.bellcrown?.lume ?? lumeC;
    // The bell breathes — a slow medusa pulse, deeper at the break.
    const puls = 1 + 0.045 * Math.sin(f.nowMs * 0.0016) + 0.06 * brk;
    const bellW = hw * 1.28;
    const bellTop = headY - hh * (1.3 * puls);
    const skirtY = headY - hh * 0.52;
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.2, headY + hh * 1.16);
      ctx.quadraticCurveTo(headX + lead * hw * 1.26, headY + hh * 0.1, headX + lead * hw * 1.08, headY - hh * 0.5);
      ctx.quadraticCurveTo(headX + lead * hw * 0.6, headY - hh * 0.8, headX, headY - hh * 0.82);
      ctx.quadraticCurveTo(headX - lead * hw * 0.6, headY - hh * 0.8, headX - lead * hw * (1.04 + t * 0.2), headY - hh * 0.46);
      ctx.quadraticCurveTo(headX - lead * hw * (1.28 + t * 0.26), headY + hh * 0.2, headX - lead * hw * 1.24, headY + hh * 1.16);
      ctx.quadraticCurveTo(headX, headY + hh * 1.42, headX + lead * hw * 1.2, headY + hh * 1.16);
      ctx.closePath();
    };
    const opening = () => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
    };
    // THE TENTACLE VEILS first, so the cowl laps over their roots:
    // two per side — one broad ribbon, one thin whip — trailing and
    // swaying, each tipped in its own light.
    if (!hurt) {
      for (const es of [-1, 1]) {
        const jx = headX + es * hw * 1.0;
        const jsw = Math.sin(f.nowMs * 0.0012 + es * 1.7) * hw * 0.07;
        const jsw2 = Math.sin(f.nowMs * 0.0019 + es * 0.6) * hw * 0.05;
        // The broad ribbon: a filled wavering band.
        ctx.fillStyle = st.jellyveil?.color ?? shade(st.color, 22);
        ctx.beginPath();
        ctx.moveTo(jx - es * hw * 0.14, headY + hh * 0.42);
        ctx.quadraticCurveTo(jx + jsw - es * hw * 0.06, headY + hh * 1.2, jx + jsw * 1.5, headY + hh * 1.86);
        ctx.quadraticCurveTo(jx + jsw * 1.5 + es * hw * 0.12, headY + hh * 1.94, jx + es * hw * 0.16, headY + hh * 1.8);
        ctx.quadraticCurveTo(jx + es * hw * 0.2, headY + hh * 1.0, jx + es * hw * 0.14, headY + hh * 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = bLume;
        ctx.beginPath();
        ctx.arc(jx + jsw * 1.5 + es * hw * 0.05, headY + hh * 1.9, hw * 0.05, 0, Math.PI * 2);
        ctx.fill();
        // The whip: one thin trailing stroke, faster sway.
        ctx.strokeStyle = shade(st.color, 26);
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.beginPath();
        ctx.moveTo(jx + es * hw * 0.05, headY + hh * 0.5);
        ctx.quadraticCurveTo(jx + jsw2 * 1.4 + es * hw * 0.14, headY + hh * 1.4, jx + jsw2 * 2 + es * hw * 0.06, headY + hh * 2.05);
        ctx.stroke();
        ctx.fillStyle = bLume;
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.arc(jx + jsw2 * 2 + es * hw * 0.06, headY + hh * 2.08, hw * 0.032, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    // The cowl.
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      ctx.fillStyle = shade(st.color, -12);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 1.2, hw * 2.4, hh * 3.0);
      ctx.restore();
    }
    // THE BELL: the medusa worn as the crown — structure, so it
    // holds white in the hurt flash.
    ctx.fillStyle = hurt ? '#ffffff' : bellC;
    ctx.beginPath();
    ctx.moveTo(headX - bellW, skirtY);
    ctx.quadraticCurveTo(headX - bellW * 1.04, bellTop + hh * 0.34, headX - bellW * 0.44, bellTop);
    ctx.quadraticCurveTo(headX, bellTop - hh * 0.14, headX + bellW * 0.44, bellTop);
    ctx.quadraticCurveTo(headX + bellW * 1.04, bellTop + hh * 0.34, headX + bellW, skirtY);
    // The scalloped skirt: four bites back across the brow.
    ctx.arc(headX + bellW * 0.75, skirtY, bellW * 0.25, 0, Math.PI, false);
    ctx.arc(headX + bellW * 0.25, skirtY, bellW * 0.25, 0, Math.PI, false);
    ctx.arc(headX - bellW * 0.25, skirtY, bellW * 0.25, 0, Math.PI, false);
    ctx.arc(headX - bellW * 0.75, skirtY, bellW * 0.25, 0, Math.PI, false);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // The bell's planes: lit crown, shaded flank toward the trail.
      ctx.fillStyle = shade(bellC, 14);
      ctx.beginPath();
      ctx.ellipse(headX + lead * bellW * 0.12, bellTop + hh * 0.16, bellW * 0.52, hh * 0.2, lead * -0.1, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(bellC, -14);
      ctx.beginPath();
      ctx.moveTo(headX - lead * bellW * 0.98, skirtY - hh * 0.02);
      ctx.quadraticCurveTo(headX - lead * bellW * 1.0, bellTop + hh * 0.36, headX - lead * bellW * 0.44, bellTop + hh * 0.04);
      ctx.quadraticCurveTo(headX - lead * bellW * 0.62, bellTop + hh * 0.5, headX - lead * bellW * 0.7, skirtY - hh * 0.02);
      ctx.closePath();
      ctx.fill();
      // THE ORGAN GLOW: the light inside the bell — a soft ring
      // that waxes with the tide (unclipped alpha accent lane).
      ctx.globalAlpha = 0.16 + 0.3 * k + 0.3 * brk;
      ctx.fillStyle = bLume;
      ctx.beginPath();
      ctx.ellipse(headX, bellTop + hh * 0.42, bellW * 0.34, hh * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // THE RIM LIGHT: the skirt's scallops carry the bell's own
      // lamp — breathing, flaring at the break.
      ctx.strokeStyle = shade(bLume, Math.round(-26 + (0.35 + 0.65 * Math.max(k, brk)) * 40));
      ctx.lineWidth = Math.max(1, s * (0.009 + 0.005 * brk));
      ctx.lineCap = 'round';
      for (const su of [-0.75, -0.25, 0.25, 0.75]) {
        ctx.beginPath();
        ctx.arc(headX + bellW * su, skirtY, bellW * 0.25, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      }
      // THE FRECKLE WAKE: the deep keeps count across bell and cowl.
      if (st.lumefreckles) {
        const fc = st.lumefreckles.color;
        const frk: Array<[number, number, number]> = [
          [0.7, -1.06, 0.06], [0.24, -1.22, 0.075], [-0.3, -1.16, 0.06],
          [-0.78, -0.92, 0.07], [0.98, -0.6, 0.055], [-1.02, -0.24, 0.06],
          [0.88, 0.14, 0.055],
        ];
        for (const [i, [ux, uy, rr]] of frk.entries()) {
          const wu = ((f.nowMs / 6800 - i * 0.075) % 1 + 1) % 1;
          const wake = wu < 0.16 ? Math.sin((wu / 0.16) * Math.PI) : 0;
          ctx.fillStyle = shade(fc, Math.round(-30 + wake * 58));
          ctx.beginPath();
          ctx.arc(headX + lead * hw * ux, headY + hh * uy, hw * rr * (1 + wake * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (front) {
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        stormVeil(ctx, cx, ohw, oTop + cut * 0.2, headY + hh * 0.2, headY + hh * 0.74, '#060b14');
        ctx.restore();
        ctx.strokeStyle = shade(st.color, 18);
        ctx.lineWidth = Math.max(1, s * 0.013);
        ctx.beginPath();
        opening();
        ctx.stroke();
      } else {
        // From behind: the bell's back keeps its rim light, and the
        // drape tail falls light over the shaded back.
        ctx.fillStyle = st.color;
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.26, headY + hh * 0.8);
        ctx.lineTo(headX + hw * 0.26, headY + hh * 0.8);
        ctx.lineTo(headX + hw * 0.08, headY + hh * 1.9);
        ctx.lineTo(headX - hw * 0.1, headY + hh * 1.9);
        ctx.closePath();
        ctx.fill();
      }
      // THE DEEP LURE: the stalk reaches from under the bell to hang
      // its iron-caged lamp before the brow — the one warm thing.
      if (st.deeplure && front) {
        const stalkC = st.deeplure.stalk;
        const rootX = headX + lead * hw * 0.22;
        const rootY = skirtY - hh * 0.04;
        const bulbX = headX + lead * (hw * (0.3 + 0.42 * t) + Math.sin(f.nowMs * 0.0013) * hw * 0.045);
        const bulbY = headY - hh * (0.4 - 0.04 * t);
        const midX = headX + lead * hw * (0.48 + 0.24 * t);
        const midY = headY - hh * 0.82;
        ctx.fillStyle = stalkC;
        ctx.beginPath();
        ctx.moveTo(rootX - lead * hw * 0.1, rootY);
        ctx.quadraticCurveTo(midX - lead * hw * 0.06, midY, bulbX - lead * hw * 0.02, bulbY - hh * 0.14);
        ctx.lineTo(bulbX + lead * hw * 0.028, bulbY - hh * 0.12);
        ctx.quadraticCurveTo(midX + lead * hw * 0.08, midY + hh * 0.05, rootX + lead * hw * 0.1, rootY + hh * 0.06);
        ctx.closePath();
        ctx.fill();
        const glow = 0.6 + 0.4 * k + brk * 0.3;
        const br2 = headR * 0.155;
        ctx.strokeStyle = shade(st.color, -32);
        ctx.lineWidth = Math.max(1, s * 0.013);
        ctx.beginPath();
        ctx.arc(bulbX, bulbY, br2 * 1.12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = shade(lumeC, Math.round(-14 + glow * 44));
        ctx.beginPath();
        ctx.arc(bulbX, bulbY, br2 * (1 + 0.1 * k), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(lumeC, Math.round(14 + glow * 40));
        ctx.beginPath();
        ctx.arc(bulbX - br2 * 0.24, bulbY - br2 * 0.24, br2 * 0.42, 0, Math.PI * 2);
        ctx.fill();
        // The iron cage: two dark ribs over the light.
        ctx.strokeStyle = shade(st.color, -32);
        ctx.lineWidth = Math.max(1, s * 0.008);
        for (const ca of [0.32, 0.68]) {
          ctx.beginPath();
          ctx.arc(bulbX, bulbY, br2 * 0.98, Math.PI * (0.9 + ca * 0.4), Math.PI * (1.7 + ca * 0.4));
          ctx.stroke();
        }
        if (brk > 0.1) {
          const fly = 1 - brk;
          ctx.fillStyle = lumeC;
          for (const mo of [0, 0.3] as const) {
            const mu = Math.min(1, fly + mo);
            if (mu >= 1) continue;
            ctx.globalAlpha = (1 - mu) * 0.85;
            ctx.beginPath();
            ctx.arc(bulbX + lead * hw * 0.1 * Math.sin(mu * 9), bulbY - br2 - mu * hh * 0.5, headR * 0.03 * (1 - mu * 0.4), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      }
    }
    return;
  }

  if (st.kind === 'murkcowl') {
    // THE DARK WATERS — the drowned watch: a cowl cut from standing
    // black water. The cloth laps in three DEPTH BANDS, each tier a
    // step darker than the last — light dies with depth, spoken in
    // flat value planes (the flat forge law), their slack hems
    // breathing a beat apart. Down the leading pitch, woven in the
    // tier seam, runs THE RIPSEAM — the murk's one light. The
    // opening is framed like a shrine door and holds the deepest
    // veil in the court, and across it lies THE DROWNLINE: the
    // waterline seen from below, rising with the swell. The wearer
    // is under the water. The water does the looking.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.74 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.58;
    const oBot = headY + hh * 0.84;
    const k = tideK(f.nowMs, 0.06);
    const brk = tideBreakK(f.nowMs, 0.06);
    const ripWater = st.ripseam?.water ?? shade(st.color, -20);
    const ripNeon = st.ripseam?.neon ?? st.trim;
    // The shell: the vigils triangle leaned TRAILING (a drooped
    // peak trails), the crown folding back to a pinched, dropped
    // tip — fitted to the skull, apex under the 1.5hh bar.
    const apexX = headX - lead * hw * (0.42 + t * 0.18);
    const apexY = headY - hh * 1.46;
    const tipX = headX - lead * hw * (0.6 + t * 0.18);
    const tipY = apexY + hh * 0.36;
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.22, headY + hh * 1.18);
      ctx.quadraticCurveTo(headX + lead * hw * 1.3, headY + hh * 0.16, headX + lead * hw * 1.1, headY - hh * 0.5);
      ctx.quadraticCurveTo(headX + lead * hw * 1.02, headY - hh * 1.04, headX + lead * hw * 0.36, headY - hh * 1.28);
      ctx.quadraticCurveTo(headX - lead * hw * 0.04, headY - hh * 1.42, apexX, apexY);
      // the peak folds back, pinches, and drops its point
      ctx.quadraticCurveTo(headX - lead * hw * (0.7 + t * 0.2), apexY + hh * 0.08, tipX, tipY);
      // the return hugs the fold OUTBOARD of the skull — the notch
      // under a folded tip is where the scalp leaks (the nape law)
      ctx.quadraticCurveTo(headX - lead * hw * (0.62 + t * 0.16), apexY + hh * 0.46, headX - lead * hw * (0.92 + t * 0.22), headY - hh * 1.0);
      ctx.quadraticCurveTo(headX - lead * hw * (1.16 + t * 0.28), headY - hh * 0.5, headX - lead * hw * (1.26 + t * 0.3), headY + hh * 0.2);
      ctx.quadraticCurveTo(headX - lead * hw * 1.3, headY + hh * 0.72, headX - lead * hw * 1.26, headY + hh * 1.18);
      ctx.quadraticCurveTo(headX, headY + hh * 1.46, headX + lead * hw * 1.22, headY + hh * 1.18);
      ctx.closePath();
    };
    const opening = () => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
    };
    // The base cap FIRST: cloth between skull and crown at every
    // facing, so no fold can ever show scalp (the nape law, amended
    // a829bab — the mantle must MEET the crown everywhere).
    ctx.fillStyle = mc;
    ctx.beginPath();
    ctx.ellipse(headX, headY - hh * 0.5, hw * 1.04, hh * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      // Folded dark: the trailing third in hard shadow.
      ctx.fillStyle = shade(st.color, -13);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 1.7, hw * 2.4, hh * 3.5);
      // THE DEPTH BANDS: three lapped tiers stepping darker toward
      // the hem — the drowning gradient. Each hem is a slack
      // waterline breathing on the tide, a beat behind its
      // neighbor: standing water, never stripes.
      for (const [bi, topV, dv] of [[0, -0.28, -7], [1, 0.2, -20], [2, 0.64, -34]] as const) {
        const bY = headY + hh * topV + Math.sin(f.nowMs * 0.0019 + bi * 1.9) * hh * 0.03 * (0.4 + 0.6 * k);
        ctx.fillStyle = shade(st.color, dv);
        ctx.beginPath();
        ctx.moveTo(headX - hw * 1.5, bY + hh * 0.05 * Math.sin(bi * 2.2 + 1));
        ctx.quadraticCurveTo(headX - hw * 0.4, bY - hh * 0.07, headX + hw * 0.3, bY + hh * 0.02);
        ctx.quadraticCurveTo(headX + hw * 0.9, bY + hh * 0.07, headX + hw * 1.5, bY - hh * 0.04);
        ctx.lineTo(headX + hw * 1.5, headY + hh * 1.6);
        ctx.lineTo(headX - hw * 1.5, headY + hh * 1.6);
        ctx.closePath();
        ctx.fill();
      }
      // The windward arris: one lit plane down the leading pitch —
      // the only daylight this cloth remembers.
      ctx.fillStyle = shade(st.color, 8);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 0.3, headY - hh * 1.26);
      ctx.quadraticCurveTo(headX + lead * hw * 0.8, headY - hh * 0.9, headX + lead * hw * 0.96, headY - hh * 0.4);
      ctx.quadraticCurveTo(headX + lead * hw * 0.6, headY - hh * 0.7, headX + lead * hw * 0.16, headY - hh * 1.14);
      ctx.closePath();
      ctx.fill();
      // THE RIPSEAM: the one drawn current, running the leading
      // pitch crown-to-collar in the tier seam — clipped in the
      // shell, so the light lives IN the cloth, never on it. Its
      // beads sink with the flow; the break surges it by weight,
      // never by pace (the seamless law).
      tideStream(
        ctx,
        headX + lead * hw * 0.26, headY - hh * 1.16,
        headX + lead * hw * 1.0, headY + hh * 0.66,
        f.nowMs, 1.7, hw * 0.07,
        ripWater, ripNeon,
        0.46 + 0.3 * k + 0.2 * brk, Math.max(1, s * 0.0105),
        1 + 0.5 * brk, ripNeon,
      );
      ctx.restore();
      // The pinched tip carries its held drop — and at the break it
      // lets go: one neon-lit bead falls the cowl's whole height.
      // Water that could not quite stay cloth.
      ctx.fillStyle = shade(st.color, -4);
      ctx.beginPath();
      ctx.arc(tipX, tipY + hh * 0.05, hw * 0.068, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ripNeon;
      ctx.globalAlpha = 0.35 + 0.45 * Math.max(k, brk);
      ctx.beginPath();
      ctx.arc(tipX - lead * hw * 0.014, tipY + hh * 0.075, hw * 0.024, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (brk > 0.05) {
        const du = 1 - brk;
        ctx.fillStyle = ripNeon;
        ctx.globalAlpha = (1 - du) * 0.85;
        ctx.beginPath();
        ctx.arc(tipX - lead * hw * 0.05 * du, tipY + hh * (0.14 + du * 1.7), hw * 0.045 * (1 - du * 0.35), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (front) {
        // THE VEIL: the deepest dark in the court — opaque past the
        // eye line, falling off below (the cast veil) — and lying
        // across it, THE DROWNLINE.
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        stormVeil(ctx, cx, ohw, oTop + cut * 0.2, headY + hh * 0.26, headY + hh * 0.72, '#04080f');
        if (st.drownline) {
          const dlc = st.drownline.color;
          // The waterline rises with the swell: chin-low in the
          // slack, past the eyes at the stand.
          const wy = headY + hh * (0.5 - 0.68 * k);
          // Below the line the wearer is UNDER the water — the
          // submersion is near-total, cold blue-black, deepening
          // with depth (two stacked washes; the wash first, so the
          // line lies ON the water it closes over).
          const washBot = oBot - cut * 0.2;
          if (washBot > wy) {
            ctx.lineCap = 'butt';
            ctx.strokeStyle = '#06121f';
            ctx.globalAlpha = 0.74;
            ctx.lineWidth = washBot - wy;
            ctx.beginPath();
            ctx.moveTo(cx - ohw, (wy + washBot) / 2);
            ctx.lineTo(cx + ohw, (wy + washBot) / 2);
            ctx.stroke();
            const deepTop = wy + (washBot - wy) * 0.42;
            ctx.strokeStyle = '#02080f';
            ctx.globalAlpha = 0.6;
            ctx.lineWidth = washBot - deepTop;
            ctx.beginPath();
            ctx.moveTo(cx - ohw, (deepTop + washBot) / 2);
            ctx.lineTo(cx + ohw, (deepTop + washBot) / 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
          ctx.strokeStyle = dlc;
          ctx.lineCap = 'round';
          ctx.lineWidth = Math.max(1, s * 0.007);
          ctx.globalAlpha = 0.5 + 0.32 * k;
          ctx.beginPath();
          for (let i = 0; i <= 8; i++) {
            const v = i / 8;
            const px = cx - ohw * 0.94 + v * ohw * 1.88;
            const py = wy + Math.sin(v * Math.PI * 2.2 + f.nowMs * 0.0016) * hh * 0.032;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
          // The bubbles the line lets go at the break — rising
          // toward a surface that keeps rising away.
          if (brk > 0.05) {
            const fly = 1 - brk;
            ctx.fillStyle = dlc;
            for (const bph of [0, 0.26] as const) {
              const bu = Math.min(1, fly + bph);
              if (bu >= 1) continue;
              ctx.globalAlpha = (1 - bu) * 0.75;
              ctx.beginPath();
              ctx.arc(
                cx + ohw * (0.16 - bph * 0.9) + Math.sin(bu * 9) * ohw * 0.06,
                wy - bu * hh * 0.5,
                headR * 0.026 * (1 - bu * 0.3), 0, Math.PI * 2,
              );
              ctx.fill();
            }
          }
          ctx.globalAlpha = 1;
        }
        ctx.restore();
        // THE SHRINE DOOR: cold silver frame, inner dark line, two
        // drowned rivets at the collar corners — the one metal the
        // murk allows.
        ctx.strokeStyle = shade(st.trim, -12);
        ctx.lineWidth = Math.max(1, s * 0.013);
        ctx.beginPath();
        opening();
        ctx.stroke();
        ctx.strokeStyle = '#0a101c';
        ctx.lineWidth = Math.max(1, s * 0.005);
        ctx.beginPath();
        chamferRect(ctx, cx - ohw * 0.9, oTop + (oBot - oTop) * 0.04, ohw * 1.8, (oBot - oTop) * 0.92, cut * 0.7);
        ctx.stroke();
        ctx.fillStyle = st.trim;
        for (const bu of [-0.82, 0.82] as const) {
          ctx.beginPath();
          ctx.arc(cx + ohw * bu, oBot - cut * 0.5, headR * 0.038, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // From behind: the depth bands already read as lapped
        // tiers; the drape tail falls, and the ripseam keeps its
        // back verse — light value over the shaded back, so the
        // hanging cloth reads.
        ctx.fillStyle = st.color;
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.3, headY + hh * 0.82);
        ctx.lineTo(headX + hw * 0.28, headY + hh * 0.82);
        ctx.lineTo(headX + hw * 0.08, headY + hh * 1.92);
        ctx.lineTo(headX - hw * 0.12, headY + hh * 1.92);
        ctx.closePath();
        ctx.fill();
        tideStream(
          ctx,
          headX - hw * 0.02, headY + hh * 0.92,
          headX + hw * 0.02, headY + hh * 1.78,
          f.nowMs, 0.8, hw * 0.05,
          ripWater, ripNeon,
          0.45 + 0.25 * k, Math.max(1, s * 0.007),
          1 + 0.4 * brk, ripNeon,
        );
      }
    }
    return;
  }

  if (st.kind === 'maelcowl') {
    // THE MAELSTROM — the whirlpool's head: the cowl cloth WOUND on
    // a spiral, churn seams sweeping the dome and slowly turning,
    // each seam chased by its own fleck of foam; the peak torn
    // sideways into a spume streamer that TRAILS off the crown (a
    // hanging device trails; only face-side devices lead); a churn
    // of foam crescents at the throat. At the break, spindrift
    // flies off the streamer.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.74 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.6;
    const oBot = headY + hh * 0.84;
    const brk = tideBreakK(f.nowMs, 0.06);
    const spCol = st.spume?.color ?? st.trim;
    const flut = Math.sin(f.nowMs * 0.0021) * hh * 0.08;
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.24, headY + hh * 1.18);
      ctx.quadraticCurveTo(headX + lead * hw * 1.32, headY + hh * 0.14, headX + lead * hw * 1.12, headY - hh * 0.52);
      ctx.quadraticCurveTo(headX + lead * hw * 1.08, headY - hh * 1.06, headX + lead * hw * 0.4, headY - hh * 1.3);
      // The crown twists trailing — the wind-torn peak.
      ctx.quadraticCurveTo(headX - lead * hw * 0.2, headY - hh * 1.46, headX - lead * hw * 0.56, headY - hh * 1.3);
      // The streamer: torn spume pennant trailing off the peak.
      ctx.quadraticCurveTo(headX - lead * hw * 1.1, headY - hh * (1.24 + 0.06 * brk), headX - lead * hw * (1.56 + 0.2 * brk), headY - hh * 1.0 + flut);
      ctx.quadraticCurveTo(headX - lead * hw * 1.1, headY - hh * 0.98 + flut * 0.5, headX - lead * hw * 0.88, headY - hh * 0.88);
      ctx.quadraticCurveTo(headX - lead * hw * (1.18 + t * 0.24), headY - hh * 0.4, headX - lead * hw * (1.3 + t * 0.28), headY + hh * 0.3);
      ctx.quadraticCurveTo(headX - lead * hw * 1.3, headY + hh * 0.8, headX - lead * hw * 1.26, headY + hh * 1.18);
      ctx.quadraticCurveTo(headX, headY + hh * 1.46, headX + lead * hw * 1.24, headY + hh * 1.18);
      ctx.closePath();
    };
    const opening = () => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      ctx.fillStyle = shade(st.color, -13);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 1.7, hw * 2.4, hh * 3.5);
      // The wound crown's lit plane.
      ctx.fillStyle = shade(st.color, 11);
      ctx.beginPath();
      ctx.ellipse(headX + lead * hw * 0.34, headY - hh * 0.94, hw * 0.6, hh * 0.34, lead * -0.24, Math.PI, Math.PI * 2);
      ctx.fill();
      // THE CHURN SEAMS: the spiral the cloth was wound on — three
      // arc seams sweeping the dome, turning slowly, each chased by
      // its own foam fleck (the churn made visible).
      const wrapC = st.spiralwrap?.color ?? shade(st.color, -24);
      ctx.strokeStyle = wrapC;
      ctx.lineCap = 'round';
      // fatter seams — the churn must read at arm's length.
      const ccx = headX - lead * hw * 0.04;
      const ccy = headY - hh * 0.5;
      for (const [i, rr] of [[0, 0.5], [1, 0.78], [2, 1.06]] as const) {
        const a0 = f.nowMs * 0.00034 + i * 2.15;
        ctx.lineWidth = Math.max(1, s * (0.017 - i * 0.002));
        ctx.beginPath();
        ctx.ellipse(ccx, ccy, hw * rr, hh * rr * 0.72, lead * -0.16, a0, a0 + Math.PI * 0.62);
        ctx.stroke();
        // The foam fleck chasing the seam's leading end.
        const fa = a0 + Math.PI * 0.62;
        ctx.fillStyle = spCol;
        ctx.beginPath();
        ctx.arc(ccx + Math.cos(fa) * hw * rr, ccy + Math.sin(fa) * hh * rr * 0.72, hw * 0.058, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = wrapC;
      }
      ctx.restore();
      // Foam gum riding the torn peak's top edge — the churn's own
      // crest, so the peak reads WAVE and never hair.
      ctx.fillStyle = spCol;
      for (const [pu, pr] of [[0.15, 0.1], [0.45, 0.085], [0.75, 0.07]] as const) {
        const px2 = headX - lead * hw * (0.56 + pu * 0.9);
        const py2 = headY - hh * (1.3 - pu * 0.22) + flut * pu * 0.6;
        ctx.beginPath();
        ctx.arc(px2, py2, hw * pr * (1 + 0.25 * brk), Math.PI * 0.94, Math.PI * 2.06);
        ctx.closePath();
        ctx.fill();
      }
      // The pennant's tip carries its bead of spume.
      ctx.beginPath();
      ctx.arc(headX - lead * hw * (1.52 + 0.2 * brk), headY - hh * 1.0 + flut, hw * 0.07, 0, Math.PI * 2);
      ctx.fill();
      // The streamer's spume: flecks tearing off the pennant at the
      // break — the storm the water makes of itself.
      if (brk > 0.05) {
        const fly = 1 - brk;
        ctx.fillStyle = spCol;
        for (const [dph, dsc] of [[0, 1], [0.2, 0.7], [0.38, 0.5]] as const) {
          const du = Math.min(1, fly + dph);
          if (du >= 1) continue;
          ctx.globalAlpha = (1 - du) * 0.85;
          ctx.beginPath();
          ctx.arc(
            headX - lead * hw * (1.4 + du * 0.6),
            headY - hh * (1.0 + du * 0.16) + flut * (1 - du),
            hw * 0.045 * dsc * (1 - du * 0.4), 0, Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      // THE CHURN COLLAR: overlapping foam crescents ringing the
      // throat — the whirlpool's white ring, worn.
      ctx.fillStyle = spCol;
      for (let i = 0; i < 5; i++) {
        const u = -0.92 + (i / 4) * 1.84;
        ctx.beginPath();
        ctx.arc(headX + hw * u, headY + hh * (1.06 + 0.05 * Math.sin(i * 2.4 + f.nowMs * 0.0008)), hw * (0.11 - 0.015 * Math.abs(u)), Math.PI * 0.92, Math.PI * 2.08);
        ctx.closePath();
        ctx.fill();
      }
      if (front) {
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        stormVeil(ctx, cx, ohw, oTop + cut * 0.2, headY + hh * 0.16, headY + hh * 0.68, '#0d1416');
        ctx.restore();
        ctx.strokeStyle = shade(st.color, 18);
        ctx.lineWidth = Math.max(1, s * 0.013);
        ctx.beginPath();
        opening();
        ctx.stroke();
      } else {
        // From behind: the vortex itself — two wound arcs closing on
        // the eye, and the drape tail light over the shaded back.
        ctx.strokeStyle = shade(st.color, -22);
        ctx.lineWidth = Math.max(1, s * 0.012);
        for (const [rr, aa] of [[0.66, 0.4], [0.38, 1.6]] as const) {
          const a0 = f.nowMs * 0.00034 + aa;
          ctx.beginPath();
          ctx.ellipse(headX, headY - hh * 0.3, hw * rr, hh * rr * 0.8, 0, a0, a0 + Math.PI * 1.1);
          ctx.stroke();
        }
        ctx.fillStyle = spCol;
        ctx.beginPath();
        ctx.arc(headX, headY - hh * 0.3, hw * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = st.color;
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.28, headY + hh * 0.82);
        ctx.lineTo(headX + hw * 0.28, headY + hh * 0.82);
        ctx.lineTo(headX + hw * 0.08, headY + hh * 1.9);
        ctx.lineTo(headX - hw * 0.1, headY + hh * 1.9);
        ctx.closePath();
        ctx.fill();
      }
    }
    return;
  }

  if (st.kind === 'hushcowl') {
    // THE HUSHCOWL — voidwhisper's own head: the cowl the void has
    // already claimed. The vigils triangle stands as ever, except
    // its PEAK IS GONE — severed clean, and THE TAKEN TIP still
    // hovers over the wound, torn edges rim-lit in plasma, the cut
    // itself full of a dark deeper than any cloth (THE VOID IS AN
    // ABSENCE). Down the leading pitch the cloth is torn open on one
    // fixed rift. The opening is framed like a shrine door, and
    // inside it there is NOTHING — no chin, no mask, no eye — only
    // the deepest dark in the wardrobe, where a single pale light
    // arrives, is seen, and is next seen somewhere else. It never
    // crosses the space between. Nobody has watched it long enough
    // to be sure it is alone.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.74 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.58;
    const oBot = headY + hh * 0.84;
    const k = voidK(f.nowMs, 0);
    const casing = st.riftlight?.casing ?? shade(st.trim, -18);
    const core = st.riftlight?.core ?? st.trim;
    const voidCol = st.riftlight?.void ?? '#0a0714';
    // THE SEVERED LINE: where the void cut. Fixed jagged geometry (a
    // wound never re-rolls); only the light on its edges moves. The
    // cut leans with the old peak's pitch.
    const sevPts: Array<[number, number]> = [
      [0.92, -1.1], [0.44, -1.0], [0.06, -1.1], [-0.38, -0.98], [-0.86, -1.04],
    ];
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.22, headY + hh * 1.18);
      ctx.quadraticCurveTo(headX + lead * hw * 1.3, headY + hh * 0.16, headX + lead * hw * 1.1, headY - hh * 0.5);
      ctx.quadraticCurveTo(headX + lead * hw * 1.04, headY - hh * 0.88, headX + lead * hw * sevPts[0]![0], headY + hh * sevPts[0]![1]);
      // the cut crosses the crown — hard steps, fixed
      for (let i = 1; i < sevPts.length; i++) {
        ctx.lineTo(headX + lead * hw * sevPts[i]![0], headY + hh * sevPts[i]![1]);
      }
      ctx.quadraticCurveTo(headX - lead * hw * (1.12 + t * 0.24), headY - hh * 0.6, headX - lead * hw * (1.26 + t * 0.3), headY - hh * 0.02);
      ctx.quadraticCurveTo(headX - lead * hw * 1.34, headY + hh * 0.6, headX - lead * hw * 1.26, headY + hh * 1.2);
      // The hem: heavy quiet cloth — the hush has no rags.
      ctx.quadraticCurveTo(headX - lead * hw * 0.6, headY + hh * 1.44, headX, headY + hh * 1.42);
      ctx.quadraticCurveTo(headX + lead * hw * 0.7, headY + hh * 1.38, headX + lead * hw * 1.22, headY + hh * 1.18);
      ctx.closePath();
    };
    const opening = () => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
    };
    // The base cap FIRST: cloth between skull and crown at every
    // facing, so the wound can never show scalp (the nape law).
    ctx.fillStyle = mc;
    ctx.beginPath();
    ctx.ellipse(headX, headY - hh * 0.5, hw * 1.04, hh * 0.54, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      // Folded dark: the trailing third in hard shadow.
      ctx.fillStyle = shade(st.color, -12);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 1.7, hw * 2.4, hh * 3.5);
      // Two hush seams: the tailoring the void left alone — fixed
      // fold lines falling from the cut toward the hem.
      ctx.strokeStyle = shade(st.color, -22);
      ctx.lineWidth = Math.max(1, s * 0.006);
      ctx.beginPath();
      ctx.moveTo(headX - lead * hw * 0.5, headY - hh * 0.92);
      ctx.quadraticCurveTo(headX - lead * hw * 0.72, headY - hh * 0.1, headX - lead * hw * 0.66, headY + hh * 1.1);
      ctx.moveTo(headX + lead * hw * 0.12, headY - hh * 1.02);
      ctx.quadraticCurveTo(headX - lead * hw * 0.1, headY - hh * 0.2, headX - lead * hw * 0.02, headY + hh * 1.2);
      ctx.stroke();
      // The cold arris: one faint lit plane down the leading pitch —
      // pale lavender light, not warmth; the void has no forge.
      ctx.fillStyle = shade(st.color, 8);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 0.56, headY - hh * 0.98);
      ctx.quadraticCurveTo(headX + lead * hw * 0.94, headY - hh * 0.56, headX + lead * hw * 1.02, headY - hh * 0.08);
      ctx.quadraticCurveTo(headX + lead * hw * 0.7, headY - hh * 0.42, headX + lead * hw * 0.44, headY - hh * 0.88);
      ctx.closePath();
      ctx.fill();
      // THE SHELL RIFT: the one tear in the cloth itself, down the
      // leading pitch, clipped in the shell — a fixed wound whose
      // edges light on the hush and whose star arrives, never walks.
      voidRift(
        ctx,
        headX + lead * hw * 0.34, headY - hh * 0.78,
        headX + lead * hw * 1.0, headY + hh * 0.62,
        4.3, hw * 0.055,
        casing, core, voidCol,
        f.nowMs, k, Math.max(1, s * 0.0085),
      );
      ctx.restore();
    }
    // THE TAKEN TIP: the peak the void kept. It hovers over the cut
    // with open AIR between — the sky through the wound is what says
    // SEVERED — on its own slow time (suspension, not travel), a
    // step lighter than the shell so the fragment reads as its own
    // mass. Silhouette: it holds white in the flash on every facing.
    // The gap must be WIDER than it looks: the outline shader halos
    // both lips, and a narrow wound gets swallowed whole by its own
    // outlines. Sky must survive between them.
    const gap = hh * (0.38 + 0.12 * k);
    const hover = Math.sin(f.nowMs * 0.0009) * hh * 0.06;
    const drift = Math.sin(f.nowMs * 0.0006 + 1.7) * hw * 0.03;
    const fpx = headX + drift;
    const fbY = headY - hh * 1.04 - gap + hover;
    const apexFX = fpx - lead * hw * (0.34 + t * 0.12);
    const apexFY = fbY - hh * 0.42;
    const tipFX = fpx - lead * hw * (0.54 + t * 0.14);
    const tipFY = apexFY + hh * 0.24;
    const tipPath = (): void => {
      ctx.moveTo(fpx + lead * hw * 0.58, fbY + hh * 0.01);
      ctx.quadraticCurveTo(fpx + lead * hw * 0.14, fbY - hh * 0.3, apexFX, apexFY);
      // the fold: pinch, and the point drops back TOWARD the gap it
      // was cut from — the void keeps things where it found them.
      ctx.quadraticCurveTo(fpx - lead * hw * (0.58 + t * 0.14), apexFY + hh * 0.04, tipFX, tipFY);
      ctx.quadraticCurveTo(fpx - lead * hw * 0.54, apexFY + hh * 0.34, fpx - lead * hw * 0.56, fbY - hh * 0.02);
      // the torn base: the mirror of the cut below it
      ctx.lineTo(fpx - lead * hw * 0.28, fbY + hh * 0.07);
      ctx.lineTo(fpx - lead * hw * 0.02, fbY - hh * 0.03);
      ctx.lineTo(fpx + lead * hw * 0.3, fbY + hh * 0.08);
      ctx.closePath();
    };
    ctx.fillStyle = hurt ? '#ffffff' : shade(st.color, 5);
    ctx.beginPath();
    tipPath();
    ctx.fill();
    if (!hurt) {
      // The tip keeps its folded dark — the same trailing shadow the
      // shell wears; a severed piece is still the same cloth.
      ctx.save();
      ctx.beginPath();
      tipPath();
      ctx.clip();
      ctx.fillStyle = shade(st.color, -8);
      ctx.fillRect(lead === 1 ? fpx - hw * 2 : fpx, fbY - hh * 0.9, hw * 2, hh * 1.4);
      ctx.restore();
      // THE TORN EDGES wear the only light: plasma rims on both lips
      // of the wound — the tip's base and the shell's cut — riding
      // the hush together (one whisper brightens both).
      const rimPath = (pts: Array<[number, number]>): void => {
        ctx.beginPath();
        ctx.moveTo(pts[0]![0], pts[0]![1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
        ctx.stroke();
      };
      const cutLip: Array<[number, number]> = sevPts.map(
        ([u, dy]) => [headX + lead * hw * u, headY + hh * (dy + 0.02)],
      );
      const tipLip: Array<[number, number]> = [
        [fpx + lead * hw * 0.58, fbY + hh * 0.01],
        [fpx + lead * hw * 0.3, fbY + hh * 0.08],
        [fpx - lead * hw * 0.02, fbY - hh * 0.03],
        [fpx - lead * hw * 0.28, fbY + hh * 0.07],
        [fpx - lead * hw * 0.56, fbY - hh * 0.02],
      ];
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = casing;
      ctx.globalAlpha = 0.28 + 0.5 * k;
      ctx.lineWidth = Math.max(1, s * 0.016);
      rimPath(cutLip);
      rimPath(tipLip);
      ctx.strokeStyle = core;
      ctx.globalAlpha = 0.22 + 0.58 * k;
      ctx.lineWidth = Math.max(1, s * 0.008);
      rimPath(cutLip);
      rimPath(tipLip);
      ctx.restore();
      // A star ARRIVES in the wound — one of three fixed seats along
      // the gap; brighter when the whisper passes. It does not cross.
      const wk = voidWink(f.nowMs, 1.3, 3);
      const seatU = [-0.52, 0.08, 0.6][wk.i]!;
      ctx.fillStyle = core;
      ctx.globalAlpha = wk.a * (0.4 + 0.6 * k);
      ctx.beginPath();
      ctx.arc(
        headX + lead * hw * seatU,
        headY - hh * 1.04 - gap * 0.5 + hover * 0.5,
        headR * 0.035 * (0.6 + 0.5 * wk.a), 0, Math.PI * 2,
      );
      ctx.fill();
      ctx.globalAlpha = 1;
      if (front) {
        // THE DOORWAY DARK: the deepest hold in the wardrobe — the
        // whole window, opaque, no chin, no landmark (opaque fills
        // are gremlin-safe in a clip; the void needs no grading).
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        ctx.fillStyle = voidCol;
        ctx.fillRect(cx - ohw, oTop + cut * 0.2, ohw * 2, oBot - (oTop + cut * 0.2));
        ctx.restore();
        // THE SHRINE DOOR: a quiet frame in cold lavender-grey — the
        // door wears no light of its own (the absence law holds at
        // the door too); an inner dark line, two small bosses.
        const doorCol = shade(st.trim, -34);
        ctx.strokeStyle = doorCol;
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        opening();
        ctx.stroke();
        ctx.strokeStyle = '#150e22';
        ctx.lineWidth = Math.max(1, s * 0.005);
        ctx.beginPath();
        chamferRect(ctx, cx - ohw * 0.9, oTop + (oBot - oTop) * 0.04, ohw * 1.8, (oBot - oTop) * 0.92, cut * 0.7);
        ctx.stroke();
        ctx.fillStyle = shade(st.trim, -24);
        for (const bu of [-0.82, 0.82] as const) {
          ctx.beginPath();
          ctx.arc(cx + ohw * bu, oBot - cut * 0.5, headR * 0.034, 0, Math.PI * 2);
          ctx.fill();
        }
        // THE WANDERING LIGHT: one pale point in the doorway dark.
        // Three fixed seats where a face has no business being; it
        // wakes at one, dies, and is next seen at another. The only
        // tenant the dark allows — and the whisper feeds it.
        const dw = voidWink(f.nowMs, 0.45, 3);
        const seats: Array<[number, number]> = [
          [-0.36, -0.16], [0.4, 0.14], [-0.06, 0.5],
        ];
        const [su, sv] = seats[dw.i]!;
        const lx = cx + ohw * su;
        const ly = headY + hh * sv;
        ctx.strokeStyle = casing;
        ctx.globalAlpha = dw.a * 0.34 * (0.5 + 0.5 * k);
        ctx.lineWidth = Math.max(1, s * 0.009);
        ctx.beginPath();
        ctx.arc(lx, ly, headR * 0.085, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = core;
        ctx.globalAlpha = dw.a * (0.5 + 0.5 * k);
        ctx.beginPath();
        ctx.arc(lx, ly, headR * 0.055 * (0.6 + 0.5 * dw.a), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        // From behind: the drape tail, and the back verse of the
        // rift — the void does not care which way the wearer faces.
        ctx.fillStyle = st.color;
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.3, headY + hh * 0.82);
        ctx.lineTo(headX + hw * 0.28, headY + hh * 0.82);
        ctx.lineTo(headX + hw * 0.1, headY + hh * 1.9);
        ctx.lineTo(headX - hw * 0.14, headY + hh * 1.9);
        ctx.closePath();
        ctx.fill();
        voidRift(
          ctx,
          headX - hw * 0.02, headY + hh * 0.94,
          headX + hw * 0.04, headY + hh * 1.76,
          6.1, hw * 0.04,
          casing, core, voidCol,
          f.nowMs, k, Math.max(1, s * 0.0065),
        );
      }
    }
    return;
  }

  if (st.kind === 'oathcowl') {
    // THE CINDER OATH — the sworn watch: a cowl cut from charred
    // cloth over a fire that was BANKED, never beaten. Three char
    // tiers lap the crown, every hem burnt ragged; down the leading
    // pitch runs THE MAIN CRACK — the one fissure where the fire
    // looks out, its ember crawl walking the cloth. The opening is
    // framed like a furnace door in cold iron, the face lost in the
    // deepest warm dark, and at the brow sits THE OATH COAL in its
    // iron shrine: one ember, sworn. It has never once gone out.
    // Fire lives in the crack. The cloth just keeps the promise.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.74 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.58;
    const oBot = headY + hh * 0.84;
    const k = cinderK(f.nowMs, 0);
    const fl = cinderFlareK(f.nowMs, 0);
    const casing = st.crackseams?.casing ?? shade(st.trim, -18);
    const ember = st.crackseams?.ember ?? st.trim;
    const sway = Math.sin(f.nowMs * 0.0013) * hw * 0.03;
    // The shell: the vigils triangle leaned TRAILING (proven
    // chassis), the crown folding back to a pinched dropped tip —
    // here burnt to a charred barb. The bottom hem is CHEWED: char
    // took the edge, and the silhouette says so.
    const apexX = headX - lead * hw * (0.44 + t * 0.18);
    const apexY = headY - hh * 1.48;
    const tipX = headX - lead * hw * (0.66 + t * 0.18) + sway * -lead;
    const tipY = apexY + hh * 0.3;
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.22, headY + hh * 1.18);
      ctx.quadraticCurveTo(headX + lead * hw * 1.3, headY + hh * 0.16, headX + lead * hw * 1.1, headY - hh * 0.5);
      ctx.quadraticCurveTo(headX + lead * hw * 1.02, headY - hh * 1.04, headX + lead * hw * 0.36, headY - hh * 1.3);
      ctx.quadraticCurveTo(headX - lead * hw * 0.04, headY - hh * 1.44, apexX, apexY);
      // the peak folds back, pinches, and drops its burnt point
      ctx.quadraticCurveTo(headX - lead * hw * (0.72 + t * 0.2), apexY + hh * 0.06, tipX, tipY);
      // the return hugs the fold OUTBOARD of the skull — the notch
      // under a folded tip is where the scalp leaks (the nape law)
      ctx.quadraticCurveTo(headX - lead * hw * (0.64 + t * 0.16), apexY + hh * 0.42, headX - lead * hw * (0.94 + t * 0.22), headY - hh * 1.0);
      ctx.quadraticCurveTo(headX - lead * hw * (1.18 + t * 0.28), headY - hh * 0.5, headX - lead * hw * (1.28 + t * 0.3), headY + hh * 0.22);
      ctx.quadraticCurveTo(headX - lead * hw * 1.32, headY + hh * 0.74, headX - lead * hw * 1.26, headY + hh * 1.2);
      // THE BURNT HEM: a chewed edge, fixed geometry — char does
      // not breathe, it only keeps what it has taken.
      ctx.quadraticCurveTo(headX - lead * hw * 0.92, headY + hh * 1.4, headX - lead * hw * 0.68, headY + hh * 1.34);
      ctx.lineTo(headX - lead * hw * 0.5, headY + hh * 1.48);
      ctx.lineTo(headX - lead * hw * 0.26, headY + hh * 1.36);
      ctx.lineTo(headX - lead * hw * 0.02, headY + hh * 1.5);
      ctx.lineTo(headX + lead * hw * 0.24, headY + hh * 1.34);
      ctx.lineTo(headX + lead * hw * 0.44, headY + hh * 1.46);
      ctx.quadraticCurveTo(headX + lead * hw * 0.92, headY + hh * 1.28, headX + lead * hw * 1.22, headY + hh * 1.18);
      ctx.closePath();
    };
    const opening = () => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
    };
    // The base cap FIRST: cloth between skull and crown at every
    // facing, so no fold can ever show scalp (the nape law).
    ctx.fillStyle = mc;
    ctx.beginPath();
    ctx.ellipse(headX, headY - hh * 0.5, hw * 1.04, hh * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      // Folded dark: the trailing third in hard shadow.
      ctx.fillStyle = shade(st.color, -12);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 1.7, hw * 2.4, hh * 3.5);
      // THE CHAR TIERS: three lapped tiers stepping darker toward
      // the hem, every hem a fixed ragged jag with its char edging —
      // burnt cloth holds its shape; only the light in it moves.
      for (const [bi, topV, dv] of [[0, -0.34, -5], [1, 0.14, -14], [2, 0.58, -24]] as const) {
        const bY = headY + hh * topV + Math.sin(f.nowMs * 0.0016 + bi * 2.1) * hh * 0.016 * (0.3 + 0.7 * k);
        const jag = (i: number): number =>
          hh * (0.05 + 0.05 * Math.sin(i * 2.7 + bi * 1.3)) * (i % 2 === 0 ? 1 : -0.5);
        ctx.fillStyle = shade(st.color, dv);
        ctx.beginPath();
        ctx.moveTo(headX - hw * 1.5, bY + jag(0));
        for (let i = 1; i <= 6; i++) {
          ctx.lineTo(headX + hw * (-1.5 + (i / 6) * 3), bY + jag(i));
        }
        ctx.lineTo(headX + hw * 1.5, headY + hh * 1.7);
        ctx.lineTo(headX - hw * 1.5, headY + hh * 1.7);
        ctx.closePath();
        ctx.fill();
        // The char edging riding the ragged hem — the burnt line.
        ctx.strokeStyle = '#120a08';
        ctx.lineWidth = Math.max(1, s * 0.013);
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(headX - hw * 1.5, bY + jag(0));
        for (let i = 1; i <= 6; i++) {
          ctx.lineTo(headX + hw * (-1.5 + (i / 6) * 3), bY + jag(i));
        }
        ctx.stroke();
        if (bi === 2) {
          // The banked light seeping under the lowest lap — a thin
          // ember rim breathing with the drawn breath, nothing more.
          // A banked fire never shows all its heat.
          ctx.strokeStyle = ember;
          ctx.globalAlpha = 0.14 + 0.4 * k;
          ctx.lineWidth = Math.max(1, s * 0.008);
          ctx.beginPath();
          ctx.moveTo(headX - hw * 1.5, bY + jag(0) + hh * 0.05);
          for (let i = 1; i <= 6; i++) {
            ctx.lineTo(headX + hw * (-1.5 + (i / 6) * 3), bY + jag(i) + hh * 0.05);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      // The windward arris: one warm lit plane down the leading
      // pitch — cloth that remembers standing near the forge.
      ctx.fillStyle = shade(st.color, 9);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 0.3, headY - hh * 1.28);
      ctx.quadraticCurveTo(headX + lead * hw * 0.8, headY - hh * 0.9, headX + lead * hw * 0.96, headY - hh * 0.4);
      ctx.quadraticCurveTo(headX + lead * hw * 0.6, headY - hh * 0.7, headX + lead * hw * 0.16, headY - hh * 1.16);
      ctx.closePath();
      ctx.fill();
      // THE MAIN CRACK: the one fissure, crown to collar down the
      // leading pitch, clipped in the shell — the fire lives IN the
      // cloth, never on it. Its embers crawl at one pace forever;
      // the flare speaks through their weight, never their speed.
      emberCrack(
        ctx,
        headX + lead * hw * 0.3, headY - hh * 1.18,
        headX + lead * hw * 1.0, headY + hh * 0.68,
        3.2, hw * 0.085,
        casing, ember,
        f.nowMs, Math.max(k, fl), Math.max(1, s * 0.0095),
      );
      ctx.restore();
      // The charred barb at the tip: a burnt bead holding one ember
      // eye — and at the flare it lets a spark GO. Fire that could
      // not quite stay cloth rises; the dark waters' drop, inverted.
      ctx.fillStyle = shade(st.color, -18);
      ctx.beginPath();
      ctx.arc(tipX, tipY + hh * 0.04, hw * 0.062, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ember;
      ctx.globalAlpha = 0.22 + 0.5 * Math.max(k, fl);
      ctx.beginPath();
      ctx.arc(tipX - lead * hw * 0.012, tipY + hh * 0.055, hw * 0.02, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (fl > 0.05) {
        const du = 1 - fl;
        ctx.fillStyle = ember;
        ctx.globalAlpha = (1 - du) * 0.85;
        ctx.beginPath();
        ctx.arc(
          tipX - lead * hw * 0.1 * du + Math.sin(du * 9) * hw * 0.05,
          tipY - hh * (0.08 + du * 1.5),
          hw * 0.04 * (1 - du * 0.4), 0, Math.PI * 2,
        );
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (front) {
        // THE VEIL: the deepest warm dark in the wardrobe — opaque
        // past the eye line, falling off below (the cast veil). The
        // coal watches; the face is nobody's business.
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        // The hold must reach WELL past the eye line — the rig's
        // eyes sit lower than they look. An OPAQUE fill holds the
        // mystery zone solid (opaque fills are gremlin-safe in a
        // clip; stacked stroke bands seam against a bright face),
        // then the cast veil grades only the chin.
        ctx.fillStyle = '#0d0705';
        ctx.fillRect(cx - ohw, oTop + cut * 0.2, ohw * 2, headY + hh * 0.56 - (oTop + cut * 0.2));
        stormVeil(ctx, cx, ohw, headY + hh * 0.4, headY + hh * 0.56, headY + hh * 0.86, '#0d0705');
        ctx.restore();
        // THE FURNACE DOOR: cold iron frame, inner dark line, two
        // rivets at the collar — the one metal the oath allows, and
        // it wears NO light of its own (the crack law holds at the
        // door too: iron is dark; only the coal burns).
        const doorIron = st.oathcoal?.iron ?? shade(st.trim, -40);
        ctx.strokeStyle = shade(doorIron, -8);
        ctx.lineWidth = Math.max(1, s * 0.013);
        ctx.beginPath();
        opening();
        ctx.stroke();
        ctx.strokeStyle = '#150c08';
        ctx.lineWidth = Math.max(1, s * 0.005);
        ctx.beginPath();
        chamferRect(ctx, cx - ohw * 0.9, oTop + (oBot - oTop) * 0.04, ohw * 1.8, (oBot - oTop) * 0.92, cut * 0.7);
        ctx.stroke();
        ctx.fillStyle = shade(doorIron, 10);
        for (const bu of [-0.82, 0.82] as const) {
          ctx.beginPath();
          ctx.arc(cx + ohw * bu, oBot - cut * 0.5, headR * 0.036, 0, Math.PI * 2);
          ctx.fill();
        }
        if (st.oathcoal) {
          // THE OATH COAL: painted after the veil — the one device
          // that reads OVER the dark (what watches by the veil
          // paints after it). An iron shrine on the brow bar, and
          // in it the sworn ember: a faceted black coal whose fire
          // shows ONLY in the cracks across its face. It draws with
          // the breath; at the flare it remembers, and one spark
          // rises. It has never once gone out.
          const oc = st.oathcoal;
          // The coal hangs INSIDE the door's dark, at the brow —
          // one ember burning in a black shrine. Nothing in the
          // wardrobe reads faster than a single light in a doorway.
          const py = headY - hh * 0.26;
          ctx.fillStyle = oc.iron;
          ctx.beginPath();
          chamferRect(ctx, cx - headR * 0.2, py - headR * 0.125, headR * 0.4, headR * 0.25, headR * 0.05);
          ctx.fill();
          // The setting's lit top facet — 2.5D says iron has a face.
          ctx.fillStyle = shade(oc.iron, 16);
          ctx.beginPath();
          ctx.moveTo(cx - headR * 0.17, py - headR * 0.09);
          ctx.lineTo(cx + headR * 0.17, py - headR * 0.09);
          ctx.lineTo(cx + headR * 0.13, py - headR * 0.025);
          ctx.lineTo(cx - headR * 0.13, py - headR * 0.025);
          ctx.closePath();
          ctx.fill();
          // The coal: near-black, faceted, dark as its word.
          ctx.fillStyle = oc.coal;
          ctx.beginPath();
          chamferRect(ctx, cx - headR * 0.115, py - headR * 0.085, headR * 0.23, headR * 0.175, headR * 0.035);
          ctx.fill();
          // The cracks across its face — the only place the fire
          // shows. Drawn strokes, breathing with the bed.
          ctx.strokeStyle = oc.ember;
          ctx.lineCap = 'round';
          ctx.lineWidth = Math.max(1, s * 0.0075);
          ctx.globalAlpha = 0.4 + 0.6 * Math.max(k, fl);
          ctx.beginPath();
          ctx.moveTo(cx - headR * 0.085, py + headR * 0.02);
          ctx.lineTo(cx - headR * 0.02, py - headR * 0.03);
          ctx.lineTo(cx + headR * 0.055, py + headR * 0.038);
          ctx.moveTo(cx + headR * 0.005, py - headR * 0.068);
          ctx.lineTo(cx + headR * 0.06, py - headR * 0.012);
          ctx.stroke();
          ctx.globalAlpha = 1;
          if (fl > 0.05) {
            // The remembering: a tight halo — never a balloon — and
            // one spark that rises and dies.
            ctx.strokeStyle = oc.ember;
            ctx.globalAlpha = 0.22 * fl;
            ctx.lineWidth = Math.max(1, s * 0.01);
            ctx.beginPath();
            ctx.arc(cx, py, headR * 0.185, 0, Math.PI * 2);
            ctx.stroke();
            const du = 1 - fl;
            ctx.fillStyle = oc.ember;
            ctx.globalAlpha = (1 - du) * 0.8;
            ctx.beginPath();
            ctx.arc(
              cx + Math.sin(du * 8) * headR * 0.05,
              py - headR * (0.14 + du * 0.55),
              headR * 0.028 * (1 - du * 0.4), 0, Math.PI * 2,
            );
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
      } else {
        // From behind: the drape tail under the char tiers, and the
        // crack's back verse — the fire does not care which way the
        // wearer faces.
        ctx.fillStyle = st.color;
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.3, headY + hh * 0.82);
        ctx.lineTo(headX + hw * 0.28, headY + hh * 0.82);
        ctx.lineTo(headX + hw * 0.1, headY + hh * 1.9);
        ctx.lineTo(headX - hw * 0.14, headY + hh * 1.9);
        ctx.closePath();
        ctx.fill();
        emberCrack(
          ctx,
          headX - hw * 0.02, headY + hh * 0.94,
          headX + hw * 0.04, headY + hh * 1.76,
          5.1, hw * 0.05,
          casing, ember,
          f.nowMs, k, Math.max(1, s * 0.007),
        );
      }
    }
    return;
  }

  if (st.kind === 'stardiadem') {
    // THE STARDIADEM — starweaver's own head: no hood at all. Two
    // silver strands WOVEN into a brow band — over, under, over — with
    // star points rising off the weave, tallest at the center, and the
    // halo rebuilt as a turning ring of stars overhead: near side
    // bright and large, far side small and dim, one glint walking. The
    // night sky, fitted.
    const front = backK <= 0.55;
    const bandY = headY - hh * 0.62;
    const bandH = headR * 0.19;
    if (st.starring && !hurt) {
      // The star ring paints FIRST so the crown occludes its far arc
      // naturally... but a ring above the crown clears the hair, so
      // both halves show — depth is spoken by size and value alone.
      const rc = st.starring.color;
      const ry0 = headY - hh * 1.62 + Math.sin(f.nowMs * 0.0016) * hh * 0.05;
      const rxR = hw * 0.98;
      const ryR = hh * 0.22;
      const spin = f.nowMs * 0.0006;
      for (let i = 0; i < 6; i++) {
        const a = spin + (i * Math.PI * 2) / 6;
        const px = headX + Math.cos(a) * rxR;
        const py = ry0 + Math.sin(a) * ryR;
        const depth = (Math.sin(a) + 1) / 2;
        const r = headR * (0.065 + 0.06 * depth);
        ctx.globalAlpha = 0.65 + 0.35 * depth;
        ctx.fillStyle = shade(rc, 16 + depth * 34);
        ctx.beginPath();
        ctx.moveTo(px, py - r * 1.5);
        ctx.lineTo(px + r * 0.5, py - r * 0.5);
        ctx.lineTo(px + r * 1.5, py);
        ctx.lineTo(px + r * 0.5, py + r * 0.5);
        ctx.lineTo(px, py + r * 1.5);
        ctx.lineTo(px - r * 0.5, py + r * 0.5);
        ctx.lineTo(px - r * 1.5, py);
        ctx.lineTo(px - r * 0.5, py - r * 0.5);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // The walking glint on the ring's near rim.
      const ga = f.nowMs * 0.0011;
      if (Math.sin(ga) > 0) {
        ctx.fillStyle = shade(rc, 44);
        ctx.beginPath();
        ctx.arc(headX + Math.cos(ga) * rxR, ry0 + Math.sin(ga) * ryR, s * 0.013, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // THE WOVEN BAND: two strands crossing — alternating over-under
    // blocks in two silver values, reading as weave, not stripe.
    const c1 = mc;
    const c2 = hurt ? '#ffffff' : shade(st.color, -18);
    const segs = 8;
    for (let i = 0; i < segs; i++) {
      const x0 = headX - hw * 1.02 + (i / segs) * hw * 2.04;
      const w = (hw * 2.04) / segs;
      ctx.fillStyle = i % 2 === 0 ? c1 : c2;
      ctx.fillRect(x0, bandY - bandH * 0.5, w + 0.5, bandH * 0.62);
      ctx.fillStyle = i % 2 === 0 ? c2 : c1;
      ctx.fillRect(x0, bandY + bandH * 0.12 - bandH * 0.5, w + 0.5, bandH * 0.5);
    }
    if (!hurt && st.starpoints) {
      // The star points rising off the weave — flat silver spires,
      // center tallest, each with a tiny star head. They ring the
      // whole band; the sky has no back side.
      const pc = st.starpoints.color;
      for (const [u, hK] of [[-0.7, 0.4], [-0.35, 0.62], [0, 1], [0.35, 0.62], [0.7, 0.4]] as const) {
        const px = headX + u * hw;
        const py = bandY - bandH * 0.5;
        const len = hh * 0.52 * hK;
        ctx.fillStyle = pc;
        ctx.beginPath();
        ctx.moveTo(px - headR * 0.045, py);
        ctx.lineTo(px + headR * 0.045, py);
        ctx.lineTo(px, py - len);
        ctx.closePath();
        ctx.fill();
        if (hK === 1) {
          const wink = 0.5 + 0.5 * Math.sin(f.nowMs * 0.0019);
          ctx.globalAlpha = 0.5 + 0.5 * wink;
          ctx.fillStyle = shade(pc, 36);
          ctx.beginPath();
          ctx.moveTo(px, py - len - headR * 0.08);
          ctx.lineTo(px + headR * 0.045, py - len);
          ctx.lineTo(px, py - len + headR * 0.08);
          ctx.lineTo(px - headR * 0.045, py - len);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }
    return;
  }

  // ======================= THE HUNTER'S HEADS =======================
  // The leather lane's own nine, one owner each. Same commitments as
  // every costume kind: a true shell with the opening cut through it,
  // the overhang shadow ON the face, a BACK read (drape + seam at
  // minimum), and STRUCTURE that survives the hurt flash white.

  if (st.kind === 'courierhood') {
    // THE WINDCUT — hareswift's head, rebuilt to the FOUR VIGILS cowl
    // reference laws. TRIANGLE OVER DOME: the hood is a hard planar
    // wedge whose long peak streams behind on the wind's own clock —
    // it reads as running while standing still. The RUN EARS are cut
    // FROM the hood's own cloth (twin swept continuations of the
    // crown line, pale hare-lining inside, black tips), never bolted
    // on. The opening is a pointed arch FRAMED like a shrine door in
    // saddle stitch, and the face keeps its MYSTERY: a hard folded
    // shadow polygon past the eye line — angular cloth throws
    // FOLDED dark. The waybill seal CLOSES the throat like a brooch,
    // ribbon streaming. The letter is always almost delivered.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.7 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.66;
    const oBot = headY + hh * 0.84;
    const sway = Math.sin(f.nowMs * 0.0019) * hw * 0.06;
    // The apex and the wind-drawn peak: apex just trailing of crown
    // center, peak streaming far behind, slightly BELOW the apex —
    // drawn by speed, not drooping under gravity.
    // The apex sits LOW between the ears — the twin ear blades own
    // the crown (one busy crown of four points reads as a pineapple;
    // the references keep ONE clean triangle language).
    const apexX = headX - lead * hw * 0.18;
    const apexY = headY - hh * 1.36;
    const peakX = headX - lead * (hw * (2.0 + t * 0.5) + sway);
    const peakY = headY - hh * 0.72 + sway * 0.35;
    const shell = () => {
      // Leading hem, planar: jaw → brow ledge → straight rake to the
      // apex — lines, not domes.
      ctx.moveTo(headX + lead * hw * 1.2, headY + hh * 1.14);
      ctx.lineTo(headX + lead * hw * 1.28, headY + hh * 0.1);
      ctx.lineTo(headX + lead * hw * 1.1, headY - hh * 0.58);
      // The brow ledge juts — a short hard overhang.
      ctx.lineTo(headX + lead * hw * 1.16, headY - hh * 0.88);
      ctx.lineTo(headX + lead * hw * 0.52, headY - hh * 1.24);
      ctx.lineTo(apexX, apexY);
      // THE PEAK: one long draw to the streaming tip, then the fold
      // returns under itself — two lines, a blade of cloth.
      ctx.lineTo(peakX, peakY);
      ctx.lineTo(headX - lead * hw * (1.18 + t * 0.3), headY - hh * 0.34);
      // Trailing drape, planar to the hem.
      ctx.lineTo(headX - lead * hw * (1.3 + t * 0.32), headY + hh * 0.3);
      ctx.lineTo(headX - lead * hw * 1.26, headY + hh * 1.14);
      // The mantle hem sags onto the shoulders in two swept points —
      // the wind lives in the cut.
      ctx.lineTo(headX - lead * hw * 0.52, headY + hh * 1.34);
      ctx.lineTo(headX - lead * hw * 0.28, headY + hh * 1.22);
      ctx.lineTo(headX + lead * hw * 0.38, headY + hh * 1.38);
      ctx.lineTo(headX + lead * hw * 0.62, headY + hh * 1.2);
      ctx.closePath();
    };
    // The shrine arch: a pointed-arch opening, peak riding the face
    // anchor like the eyes do.
    const opening = () => {
      ctx.moveTo(cx - ohw, oBot);
      ctx.lineTo(cx - ohw, headY - hh * 0.14);
      ctx.lineTo(cx - ohw * 0.52, oTop + hh * 0.14);
      ctx.lineTo(cx, oTop);
      ctx.lineTo(cx + ohw * 0.52, oTop + hh * 0.14);
      ctx.lineTo(cx + ohw, headY - hh * 0.14);
      ctx.lineTo(cx + ohw, oBot);
      ctx.closePath();
    };
    // THE RUN EARS — structure, cut from the hood's own cloth: each
    // blade roots INSIDE the crown line and continues it, splayed a
    // shallow V frontal, raked flat with the peak at profile. Hood
    // cloth outside, hare lining inside, black tip. Hurt keeps them.
    const earsSt = st.ears;
    const drawEars = (): void => {
      if (!earsSt) return;
      for (const pass of ['far', 'near'] as const) {
        const es = pass === 'far' ? -(lead || 1) : lead || 1;
        const far = pass === 'far';
        const wK = far ? Math.max(0.35, 1 - t * 0.6) : 1;
        const rootX = headX + es * hw * 0.3 - lead * hw * 0.1;
        const rootY = headY - hh * 1.18;
        const tipX = rootX + es * hw * 0.5 * wK - lead * hw * (0.62 + t * 0.45);
        const tipY = rootY - hh * (0.78 - t * 0.22);
        // The blade: hood cloth, planar edges — WIDE enough to read
        // as folded cloth; a thin blade tips into a needle.
        ctx.fillStyle = hurt ? '#ffffff' : far ? shade(st.color, -14) : st.color;
        ctx.beginPath();
        ctx.moveTo(rootX - es * hw * 0.3, rootY + hh * 0.18);
        ctx.lineTo(tipX - es * hw * 0.05, tipY - hh * 0.02);
        ctx.lineTo(tipX + es * hw * 0.08, tipY + hh * 0.06);
        ctx.lineTo(rootX + es * hw * 0.3, rootY + hh * 0.12);
        ctx.closePath();
        ctx.fill();
        if (!hurt) {
          // The hare lining: a pale inner wedge — the animal inside
          // the cloth. Near ear only; the far ear keeps its shadow.
          if (!far && front && earsSt.color) {
            ctx.fillStyle = earsSt.color;
            ctx.beginPath();
            ctx.moveTo(rootX - es * hw * 0.08, rootY + hh * 0.08);
            ctx.lineTo(tipX + (rootX - tipX) * 0.18 + es * hw * 0.015, tipY + (rootY - tipY) * 0.16);
            ctx.lineTo(rootX + es * hw * 0.1, rootY + hh * 0.06);
            ctx.closePath();
            ctx.fill();
          }
          if (earsSt.tip) {
            // The black tip claims the last quarter — the hare's
            // mark, readable at forty tiles.
            ctx.fillStyle = earsSt.tip;
            ctx.beginPath();
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(tipX + (rootX - es * hw * 0.2 - tipX) * 0.27, tipY + (rootY + hh * 0.14 - tipY) * 0.27);
            ctx.lineTo(tipX + (rootX + es * hw * 0.22 - tipX) * 0.27, tipY + (rootY + hh * 0.1 - tipY) * 0.27);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      // Trailing-half shade, then FOLDED planes — every value change
      // lands on a crease line, never a gradient.
      ctx.fillStyle = shade(st.color, -13);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 1.7, hw * 2.4, hh * 3.4);
      // The lit rake plane: brow ledge to apex, one flat panel.
      ctx.fillStyle = shade(st.color, 12);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 1.02, headY - hh * 0.86);
      ctx.lineTo(headX + lead * hw * 0.46, headY - hh * 1.18);
      ctx.lineTo(apexX, apexY);
      ctx.lineTo(apexX + lead * hw * 0.22, apexY + hh * 0.26);
      ctx.lineTo(headX + lead * hw * 0.9, headY - hh * 0.66);
      ctx.closePath();
      ctx.fill();
      // The peak's under-fold: a deeper plane the whole way out.
      ctx.fillStyle = shade(st.color, -24);
      ctx.beginPath();
      ctx.moveTo(apexX, apexY + hh * 0.1);
      ctx.lineTo(peakX + lead * hw * 0.1, peakY - hh * 0.02);
      ctx.lineTo(headX - lead * hw * 1.12, headY - hh * 0.36);
      ctx.closePath();
      ctx.fill();
      // One crease off the mantle hem's leading point.
      ctx.strokeStyle = shade(st.color, -22);
      ctx.lineWidth = Math.max(1, s * 0.011);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 0.38, headY + hh * 1.3);
      ctx.lineTo(headX + lead * hw * 0.5, headY + hh * 0.6);
      ctx.stroke();
      ctx.restore();
    }
    drawEars();
    if (!hurt) {
      if (front) {
        // THE FOLDED DARK: mystery past the eye line — a hard-edged
        // shadow polygon under the brow, deeper in its trailing
        // corner. No gradient; this hood is planes all the way in.
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        ctx.fillStyle = 'rgba(24, 15, 26, 0.46)';
        ctx.beginPath();
        ctx.moveTo(cx - ohw, oTop);
        ctx.lineTo(cx + ohw, oTop);
        ctx.lineTo(cx + ohw, headY - hh * 0.24);
        ctx.lineTo(cx + lead * ohw * 0.1, headY - hh * 0.04);
        ctx.lineTo(cx - ohw, headY - hh * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(24, 15, 26, 0.3)';
        ctx.beginPath();
        ctx.moveTo(cx - lead * ohw, oTop);
        ctx.lineTo(cx, oTop);
        ctx.lineTo(cx - lead * ohw * 0.3, headY - hh * 0.1);
        ctx.lineTo(cx - lead * ohw, headY + hh * 0.06);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // THE SHRINE FRAME: saddle-stitch border — trim line, running
        // stitch, inner dark line. The craft IS the ornament.
        ctx.strokeStyle = shade(st.trim, 16);
        ctx.lineWidth = Math.max(1.5, headR * 0.06);
        ctx.beginPath();
        opening();
        ctx.stroke();
        ctx.strokeStyle = shade(st.color, -26);
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.setLineDash([s * 0.013, s * 0.012]);
        ctx.beginPath();
        ctx.moveTo(cx - ohw * 0.88, oBot - hh * 0.04);
        ctx.lineTo(cx - ohw * 0.88, headY - hh * 0.1);
        ctx.lineTo(cx - ohw * 0.44, oTop + hh * 0.2);
        ctx.lineTo(cx, oTop + hh * 0.09);
        ctx.lineTo(cx + ohw * 0.44, oTop + hh * 0.2);
        ctx.lineTo(cx + ohw * 0.88, headY - hh * 0.1);
        ctx.lineTo(cx + ohw * 0.88, oBot - hh * 0.04);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Back read: folded planar panels breaking around the center
        // seam, and the peak's shadow laid across them.
        ctx.fillStyle = shade(st.color, -10);
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.4, headY + hh * 0.86);
        ctx.lineTo(headX + hw * 0.4, headY + hh * 0.86);
        ctx.lineTo(headX + lead * hw * 0.12 + hw * 0.06, headY + hh * 1.9);
        ctx.lineTo(headX + lead * hw * 0.12 - hw * 0.1, headY + hh * 1.78);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(st.color, -18);
        ctx.beginPath();
        ctx.moveTo(headX - lead * hw * 0.06, headY - hh * 1.34);
        ctx.lineTo(headX - lead * hw * 0.5, headY - hh * 0.3);
        ctx.lineTo(headX - lead * hw * 0.42, headY + hh * 0.9);
        ctx.lineTo(headX - lead * hw * 0.12, headY + hh * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(st.color, -24);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(headX, headY - hh * 1.2);
        ctx.lineTo(headX + lead * hw * 0.1, headY + hh * 0.8);
        ctx.stroke();
      }
      if (st.waybill) {
        // THE SEAL ON THE TRAILING JAW: the wax brooch pins the hood
        // shut at the cheek seam, its ribbon streaming OUTWARD past
        // the silhouette edge — never across the chest (a cross-body
        // parchment reads as a sash at ten paces; the caught bug).
        const sx2 = cx - lead * ohw * 0.78;
        const sy2 = oBot - headR * 0.06;
        const rEndX = sx2 - lead * hw * (1.05 + t * 0.3) - sway * lead * 0.8;
        const rEndY = sy2 + hh * 0.3 + sway * 0.4;
        ctx.fillStyle = st.waybill.color;
        ctx.beginPath();
        ctx.moveTo(sx2, sy2 - hh * 0.035);
        ctx.quadraticCurveTo((sx2 + rEndX) / 2, sy2 - hh * 0.1, rEndX, rEndY);
        ctx.lineTo(rEndX + lead * hw * 0.09, rEndY - hh * 0.07);
        ctx.lineTo(rEndX + lead * hw * 0.06, rEndY + hh * 0.035);
        ctx.quadraticCurveTo((sx2 + rEndX) / 2, sy2 + hh * 0.05, sx2, sy2 + hh * 0.035);
        ctx.closePath();
        ctx.fill();
        // The seal: wax disc + pressed sigil ring + one hot fleck.
        ctx.fillStyle = st.waybill.seal;
        ctx.beginPath();
        ctx.arc(sx2, sy2, headR * 0.085, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = shade(st.waybill.seal, -22);
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.beginPath();
        ctx.arc(sx2, sy2, headR * 0.048, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = shade(st.waybill.seal, 34);
        ctx.beginPath();
        ctx.arc(sx2 - headR * 0.025, sy2 - headR * 0.03, headR * 0.018, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return;
  }

  if (st.kind === 'sharkmaw') {
    // THE SHARKMAW, rebuilt — the bite IS the opening. The upper jaw
    // line is an ARCH cut clean through the shell (high at the apex,
    // rolling down into the cheek corners), and the teeth hang FROM
    // that arch along its own normals — center teeth plumb, corner
    // teeth raking inward — rooted in one continuous gum band. Above
    // the arch: a true FORESHORTENED muzzle plane sliding with the
    // facing, ending in a nose ridge with paired nostril slits; the
    // silhouette carries the OVERBITE as a hard nose step past the
    // leading edge. Dead eyes wide on the snout sides. No lower jaw:
    // the wearer's shadowed chin is what the mouth is about to
    // close on.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.78 * (1 - 0.5 * t);
    const belly = st.divecrest?.color ?? shade(st.color, 26);
    const tooth = st.divecrest?.flash ?? '#e8ecec';
    // THE BITE ARCH: corners at the cheeks, apex over the brow.
    const cornerY = headY + hh * 0.14;
    const apexY = headY - hh * 0.52;
    const oBot = headY + hh * 0.86;
    // THE DORSAL SAIL — structure: unchanged from round 2; it works.
    ctx.fillStyle = hurt ? '#ffffff' : shade(st.color, -16);
    ctx.beginPath();
    ctx.moveTo(headX + lead * hw * 0.42, headY - hh * 1.12);
    ctx.lineTo(headX + lead * hw * 0.16, headY - hh * 1.74);
    ctx.lineTo(headX - lead * hw * 0.42, headY - hh * 1.72);
    ctx.lineTo(headX - lead * hw * (1.24 + t * 0.28), headY - hh * 1.18);
    ctx.lineTo(headX - lead * hw * 0.84, headY - hh * 1.12);
    ctx.lineTo(headX - lead * hw * 0.68, headY - hh * 1.26);
    ctx.lineTo(headX - lead * hw * 0.34, headY - hh * 1.08);
    ctx.lineTo(headX - lead * hw * 0.12, headY - hh * 1.2);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      ctx.strokeStyle = shade(st.trim, -6);
      ctx.lineWidth = Math.max(1.5, s * 0.015);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 0.42, headY - hh * 1.12);
      ctx.lineTo(headX + lead * hw * 0.16, headY - hh * 1.74);
      ctx.lineTo(headX - lead * hw * 0.42, headY - hh * 1.72);
      ctx.stroke();
    }
    // THE SHELL: streamlined mass whose leading edge carries the
    // OVERBITE — jaw hem in, then the nose STEPS OUT past the face
    // line at muzzle height and slopes back to the brow. The step
    // deepens with the turn: at profile the shark leads with it.
    const noseOut = headX + lead * hw * (1.5 + t * 0.34);
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.1, headY + hh * 1.1);
      ctx.lineTo(headX + lead * hw * 1.2, headY + hh * 0.42);
      // Under-nose cheek: tucked IN — the step needs a base.
      ctx.lineTo(headX + lead * hw * 1.18, headY - hh * 0.08);
      // THE NOSE STEP: out to the blunt tip, flat front, back up.
      ctx.lineTo(noseOut, headY - hh * 0.22);
      ctx.lineTo(noseOut - lead * hw * 0.02, headY - hh * 0.52);
      ctx.lineTo(headX + lead * hw * 1.02, headY - hh * 0.86);
      // Crown, planar, into the trailing gill flank.
      ctx.lineTo(headX + lead * hw * 0.5, headY - hh * 1.12);
      ctx.lineTo(headX - lead * hw * 0.62, headY - hh * 1.16);
      ctx.lineTo(headX - lead * hw * (1.1 + t * 0.26), headY - hh * 0.64);
      ctx.lineTo(headX - lead * hw * (1.2 + t * 0.3), headY + hh * 0.2);
      ctx.lineTo(headX - lead * hw * 1.12, headY + hh * 1.1);
      ctx.lineTo(headX - lead * hw * 0.42, headY + hh * 1.28);
      ctx.lineTo(headX + lead * hw * 0.44, headY + hh * 1.28);
      ctx.closePath();
    };
    // THE OPENING: the bite arch — cut through the shell evenodd so
    // the face truly lives inside the mouth.
    const opening = () => {
      ctx.moveTo(cx - ohw, oBot);
      ctx.lineTo(cx - ohw, cornerY);
      ctx.quadraticCurveTo(cx - ohw * 0.52, apexY + hh * 0.06, cx, apexY);
      ctx.quadraticCurveTo(cx + ohw * 0.52, apexY + hh * 0.06, cx + ohw, cornerY);
      ctx.lineTo(cx + ohw, oBot);
      ctx.closePath();
    };
    // Solid shell fill; the bite window paints as FOLDED DARK below
    // (the mystery law prefers a void in the mouth to a visible face
    // — and a two-subpath evenodd fill proved unreliable here while
    // the same-path clip held; the shark7 probe verdict).
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      // Planar shading + THE MUZZLE PLANE: the foreshortened top of
      // the snout, brow ridge to nose ridge, sliding with the facing
      // and squeezing as the body turns — this plane is what says
      // the snout comes TOWARD you.
      ctx.fillStyle = shade(st.color, -13);
      ctx.fillRect(lead === 1 ? headX - hw * 2.6 : headX, headY - hh * 1.6, hw * 2.6, hh * 3.4);
      const mzSq = 1 - 0.4 * t;
      ctx.fillStyle = shade(st.color, 14);
      ctx.beginPath();
      ctx.moveTo(cx - ohw * 0.9 * mzSq + lead * hw * 0.12, headY - hh * 0.88);
      ctx.lineTo(cx + ohw * 0.9 * mzSq + lead * hw * 0.3, headY - hh * 0.84);
      ctx.lineTo(noseOut - lead * hw * 0.06, headY - hh * 0.5);
      ctx.lineTo(cx - ohw * 0.82 * mzSq + lead * hw * 0.04, headY - hh * 0.56);
      ctx.closePath();
      ctx.fill();
      // The nose FRONT: one mid-value plane under the ridge, with
      // paired nostril slits raked along it.
      ctx.fillStyle = shade(st.color, -2);
      ctx.beginPath();
      ctx.moveTo(cx - ohw * 0.82 * mzSq + lead * hw * 0.04, headY - hh * 0.56);
      ctx.lineTo(noseOut - lead * hw * 0.06, headY - hh * 0.5);
      ctx.lineTo(noseOut - lead * hw * 0.02, headY - hh * 0.24);
      ctx.lineTo(cx - ohw * 0.78 * mzSq, headY - hh * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shade(st.color, -30);
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (const es of [0.32, 0.66]) {
        ctx.beginPath();
        ctx.moveTo(cx + lead * ohw * es * mzSq, headY - hh * 0.44);
        ctx.lineTo(cx + lead * ohw * (es + 0.14) * mzSq, headY - hh * 0.36);
        ctx.stroke();
      }
      // THE BELLY LINE: pale countershade sweeping the jaw hem.
      ctx.fillStyle = belly;
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 1.16, headY + hh * 0.52);
      ctx.quadraticCurveTo(headX, headY + hh * 0.78, headX - lead * hw * 1.1, headY + hh * 0.54);
      ctx.lineTo(headX - lead * hw * 1.1, headY + hh * 1.08);
      ctx.lineTo(headX + lead * hw * 1.08, headY + hh * 1.08);
      ctx.closePath();
      ctx.fill();
      // Gill slashes raking the trailing cheek.
      ctx.strokeStyle = shade(st.color, -30);
      ctx.lineWidth = Math.max(1, s * 0.013);
      for (let g = 0; g < 5; g++) {
        const gx = headX - lead * hw * (0.5 + g * 0.13);
        ctx.beginPath();
        ctx.moveTo(gx, headY - hh * 0.06);
        ctx.quadraticCurveTo(gx - lead * hw * 0.06, headY + hh * 0.26, gx - lead * hw * 0.02, headY + hh * 0.54);
        ctx.stroke();
      }
      ctx.restore();
      // THE DEAD EYES: flat black beads at the snout's brow corners —
      // above and OUTSIDE the bite, where a shark's eyes live. The
      // far eye narrows past the diagonals.
      ctx.fillStyle = '#0e1216';
      ctx.beginPath();
      ctx.arc(headX + lead * hw * 1.02, headY - hh * 0.68, headR * 0.07, 0, Math.PI * 2);
      ctx.fill();
      if (t < 0.5) {
        ctx.beginPath();
        ctx.ellipse(headX - lead * hw * 0.56 - fx * headR * 0.18, headY - hh * 0.72, headR * 0.055 * (1 - t * 0.8), headR * 0.055, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (front) {
        // Inside the mouth: folded dark past the eye line, deepest
        // under the arch apex.
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        // THE MOUTH VOID: opaque night first — nothing lives in the
        // bite but the dark — then the fold plane deepens its top.
        ctx.fillStyle = '#101720';
        ctx.fillRect(cx - ohw, apexY - hh * 0.05, ohw * 2, oBot - apexY + hh * 0.1);
        ctx.fillStyle = 'rgba(12, 9, 16, 0.5)';
        ctx.beginPath();
        ctx.moveTo(cx - ohw, cornerY);
        ctx.quadraticCurveTo(cx - ohw * 0.52, apexY + hh * 0.06, cx, apexY);
        ctx.quadraticCurveTo(cx + ohw * 0.52, apexY + hh * 0.06, cx + ohw, cornerY);
        ctx.lineTo(cx + ohw * 0.82, headY + hh * 0.12);
        ctx.lineTo(cx - lead * ohw * 0.1, headY + hh * 0.22);
        ctx.lineTo(cx - ohw * 0.82, headY + hh * 0.08);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // THE GUM BAND: one continuous band FOLLOWING the arch — the
        // jaw the teeth grow from, never a straight strip.
        const archPt = (k: number): [number, number] => {
          // k in [-1, 1] along the arch, corner to corner.
          const ax = cx + k * ohw;
          const q = 1 - Math.abs(k);
          const ay = cornerY + (apexY - cornerY) * (q * (2 - q));
          return [ax, ay];
        };
        ctx.strokeStyle = shade(st.color, -6);
        ctx.lineWidth = Math.max(2.5, headR * 0.14);
        ctx.beginPath();
        ctx.moveTo(cx - ohw, cornerY);
        ctx.quadraticCurveTo(cx - ohw * 0.52, apexY + hh * 0.06, cx, apexY);
        ctx.quadraticCurveTo(cx + ohw * 0.52, apexY + hh * 0.06, cx + ohw, cornerY);
        ctx.stroke();
        // THE TEETH: seven, hanging along the arch NORMALS — plumb
        // at the apex, raking inward at the corners; the pair beside
        // the apex runs longest, corner teeth smallest. The bite.
        ctx.fillStyle = tooth;
        for (let i = 0; i < 7; i++) {
          const k = -0.88 + (i / 6) * 1.76;
          const [ax, ay] = archPt(k);
          // Normal direction: inward tilt proportional to k.
          const nx = -k * 0.55;
          const big = Math.abs(Math.abs(k) - 0.3) < 0.16;
          const tl = hh * (big ? 0.32 : 0.18 + 0.06 * (1 - Math.abs(k)));
          const tw2 = ohw * (big ? 0.115 : 0.09);
          ctx.beginPath();
          ctx.moveTo(ax - tw2, ay + hh * 0.01);
          ctx.lineTo(ax + tw2, ay + hh * 0.01);
          ctx.lineTo(ax + nx * tw2 * 2 + tw2 * 0.1, ay + tl);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        // Back read: dorsal ridge, gill tabs, tail nub — unchanged.
        ctx.fillStyle = shade(st.color, -18);
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.06, headY - hh * 1.08);
        ctx.lineTo(headX + hw * 0.06, headY - hh * 1.08);
        ctx.lineTo(headX + lead * hw * 0.08 + hw * 0.05, headY + hh * 1.16);
        ctx.lineTo(headX + lead * hw * 0.08 - hw * 0.05, headY + hh * 1.16);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(st.color, -12);
        ctx.beginPath();
        ctx.moveTo(headX + lead * hw * 0.08, headY + hh * 1.12);
        ctx.lineTo(headX + lead * hw * 0.08 + hw * 0.22, headY + hh * 1.44);
        ctx.lineTo(headX + lead * hw * 0.08 - hw * 0.16, headY + hh * 1.4);
        ctx.closePath();
        ctx.fill();
      }
    }
    return;
  }

  if (st.kind === 'anglerhood') {
    // THE ANGLERHOOD — the deep fisher: a swallowed planar hood whose
    // opening holds true VOID — and above it the ROD: a thin chitin
    // spine curving off the crown, dangling a warm LURE that
    // breathes on its own slow clock. Whatever wears this hood is
    // not the thing the light says it is. How did anybody ever
    // acquire this?
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.32 + 0.22 * t);
    const ohw = hw * 0.6 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.52;
    const oBot = headY + hh * 0.8;
    const sway = Math.sin(f.nowMs * 0.0017) * hw * 0.05;
    const apexX = headX - lead * hw * 0.16;
    const apexY = headY - hh * 1.52;
    const peakX = headX - lead * (hw * (1.5 + t * 0.4) + sway);
    const peakY = headY - hh * 0.6 + sway * 0.4;
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.18, headY + hh * 1.14);
      ctx.lineTo(headX + lead * hw * 1.26, headY + hh * 0.1);
      ctx.lineTo(headX + lead * hw * 1.06, headY - hh * 0.6);
      ctx.lineTo(headX + lead * hw * 1.1, headY - hh * 0.9);
      ctx.lineTo(headX + lead * hw * 0.46, headY - hh * 1.26);
      ctx.lineTo(apexX, apexY);
      ctx.lineTo(peakX, peakY);
      ctx.lineTo(headX - lead * hw * (1.14 + t * 0.28), headY - hh * 0.28);
      ctx.lineTo(headX - lead * hw * (1.26 + t * 0.3), headY + hh * 0.32);
      ctx.lineTo(headX - lead * hw * 1.22, headY + hh * 1.14);
      ctx.lineTo(headX - lead * hw * 0.4, headY + hh * 1.32);
      ctx.lineTo(headX + lead * hw * 0.44, headY + hh * 1.34);
      ctx.closePath();
    };
    const opening = () => {
      ctx.moveTo(cx - ohw, oBot);
      ctx.lineTo(cx - ohw, headY - hh * 0.1);
      ctx.lineTo(cx - ohw * 0.5, oTop + hh * 0.14);
      ctx.lineTo(cx, oTop);
      ctx.lineTo(cx + ohw * 0.5, oTop + hh * 0.14);
      ctx.lineTo(cx + ohw, headY - hh * 0.1);
      ctx.lineTo(cx + ohw, oBot);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      ctx.fillStyle = shade(st.color, -13);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 1.7, hw * 2.4, hh * 3.4);
      ctx.fillStyle = shade(st.color, 10);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 0.98, headY - hh * 0.88);
      ctx.lineTo(headX + lead * hw * 0.4, headY - hh * 1.2);
      ctx.lineTo(apexX, apexY);
      ctx.lineTo(apexX + lead * hw * 0.2, apexY + hh * 0.24);
      ctx.lineTo(headX + lead * hw * 0.84, headY - hh * 0.68);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(st.color, -24);
      ctx.beginPath();
      ctx.moveTo(apexX, apexY + hh * 0.08);
      ctx.lineTo(peakX + lead * hw * 0.08, peakY - hh * 0.02);
      ctx.lineTo(headX - lead * hw * 1.06, headY - hh * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (front) {
        // THE VOID: nothing lives in this opening but the dark. The
        // deepest face in the leather lane — deeper than shadowcowl.
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        ctx.fillStyle = 'rgba(10, 8, 14, 0.72)';
        ctx.fillRect(cx - ohw, oTop, ohw * 2, oBot - oTop);
        ctx.restore();
        // A thin nacre frame line — the shrine door, barely lit.
        ctx.strokeStyle = shade(st.trim, -6);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        opening();
        ctx.stroke();
      } else {
        ctx.fillStyle = shade(st.color, -10);
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.36, headY + hh * 0.88);
        ctx.lineTo(headX + hw * 0.36, headY + hh * 0.88);
        ctx.lineTo(headX + lead * hw * 0.08, headY + hh * 1.9);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(st.color, -22);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(headX, headY - hh * 1.15);
        ctx.lineTo(headX + lead * hw * 0.08, headY + hh * 0.82);
        ctx.stroke();
      }
      // THE ROD AND LURE — structure arcs even from behind: the
      // spine curves from the crown out over the brow; the lure
      // hangs before the void and BREATHES.
      if (st.lure) {
        // The rod is pale chitin — a dark rod on a dark hood is no
        // rod at all. It arcs well PAST the brow so the lure hangs
        // clear of the cloth, unmissable: it IS the set's face.
        const rodRootX = headX + lead * hw * 0.1;
        const rodRootY = headY - hh * 1.42;
        const rodTipX = cx + lead * ohw * (front ? 0.55 : 0.95);
        const rodTipY = oTop - hh * 0.62;
        ctx.strokeStyle = hurt ? '#ffffff' : shade(st.trim, -24);
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(rodRootX, rodRootY);
        ctx.quadraticCurveTo(rodRootX + lead * hw * 0.75, rodRootY - hh * 0.36, rodTipX, rodTipY);
        ctx.stroke();
        if (!hurt && front) {
          const bob = Math.sin(f.nowMs * 0.0013) * hh * 0.035;
          const lx = rodTipX;
          const ly = rodTipY + hh * 0.58 + bob;
          ctx.strokeStyle = shade(st.trim, -24);
          ctx.lineWidth = Math.max(1, s * 0.009);
          ctx.beginPath();
          ctx.moveTo(rodTipX, rodTipY);
          ctx.lineTo(lx, ly - headR * 0.08);
          ctx.stroke();
          // The breath: halo swells and dims on a slow clock — the
          // one warm thing in all that cold, and it is BAIT.
          const breathe = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(f.nowMs * 0.0024));
          ctx.globalAlpha = 0.36 * breathe;
          ctx.fillStyle = st.lure.color;
          ctx.beginPath();
          ctx.arc(lx, ly, headR * 0.24, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.5 * breathe;
          ctx.beginPath();
          ctx.arc(lx, ly, headR * 0.13, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.95;
          ctx.fillStyle = shade(st.lure.color, 32);
          ctx.beginPath();
          ctx.arc(lx, ly, headR * 0.07, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }
    return;
  }

  if (st.kind === 'krakencowl') {
    // THE KRAKENCOWL — the deep's own crown: a bulbous mantle-hood
    // built from three flat value planes (never a gradient dome),
    // TWO great eyes riding the mantle with bar pupils — the kraken
    // does the looking; the wearer's face keeps the folded dark
    // beneath — and THREE tentacles alive on a slow clock: one
    // curling off the crown, one draping each side with paired
    // sucker rows and a free curled tip. The storm asked; this is
    // what answered.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.7 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.5;
    const oBot = headY + hh * 0.82;
    const sway = Math.sin(f.nowMs * 0.0012) * hw * 0.06;
    const shell = () => {
      // The mantle: swollen high and trailing — mass, planar cut.
      ctx.moveTo(headX + lead * hw * 1.14, headY + hh * 1.1);
      ctx.lineTo(headX + lead * hw * 1.24, headY + hh * 0.1);
      ctx.lineTo(headX + lead * hw * 1.1, headY - hh * 0.56);
      ctx.lineTo(headX + lead * hw * 0.86, headY - hh * 1.18);
      ctx.lineTo(headX + lead * hw * 0.22, headY - hh * 1.62);
      ctx.lineTo(headX - lead * hw * 0.62, headY - hh * 1.66);
      ctx.lineTo(headX - lead * hw * (1.22 + t * 0.26), headY - hh * 1.08);
      ctx.lineTo(headX - lead * hw * (1.36 + t * 0.3), headY - hh * 0.2);
      ctx.lineTo(headX - lead * hw * 1.24, headY + hh * 1.1);
      ctx.lineTo(headX - lead * hw * 0.42, headY + hh * 1.28);
      ctx.lineTo(headX + lead * hw * 0.44, headY + hh * 1.28);
      ctx.closePath();
    };
    const opening = () => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      // Three flat planes say BULB: trailing shade, mid, lit crown.
      ctx.fillStyle = shade(st.color, -13);
      ctx.fillRect(lead === 1 ? headX - hw * 2.6 : headX, headY - hh * 1.8, hw * 2.6, hh * 3.6);
      ctx.fillStyle = shade(st.color, -24);
      ctx.beginPath();
      ctx.moveTo(headX - lead * hw * 0.5, headY - hh * 1.6);
      ctx.lineTo(headX - lead * hw * 1.3, headY - hh * 0.9);
      ctx.lineTo(headX - lead * hw * 1.34, headY + hh * 0.4);
      ctx.lineTo(headX - lead * hw * 0.7, headY + hh * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(st.color, 11);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 0.78, headY - hh * 1.1);
      ctx.lineTo(headX + lead * hw * 0.18, headY - hh * 1.52);
      ctx.lineTo(headX - lead * hw * 0.5, headY - hh * 1.56);
      ctx.lineTo(headX - lead * hw * 0.42, headY - hh * 1.3);
      ctx.lineTo(headX + lead * hw * 0.6, headY - hh * 0.94);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // THE EYES ON THE MANTLE: two wide-set discs with horizontal
      // bar pupils — intelligence with no warmth in it. Far eye
      // narrows with the facing.
      for (const es of [-1, 1]) {
        const far = es !== (lead || 1);
        const wK = far ? Math.max(0.25, 1 - t * 0.8) : 1;
        const ex = headX + es * hw * 0.66 * (far ? wK : 1);
        const ey = headY - hh * 0.78;
        ctx.fillStyle = shade(st.trim, -4);
        ctx.beginPath();
        ctx.ellipse(ex, ey, headR * 0.14 * wK, headR * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#141018';
        ctx.fillRect(ex - headR * 0.11 * wK, ey - headR * 0.035, headR * 0.22 * wK, headR * 0.07);
      }
      if (front) {
        // The wearer keeps the folded dark below the kraken's gaze.
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        ctx.fillStyle = 'rgba(14, 11, 18, 0.6)';
        ctx.beginPath();
        ctx.moveTo(cx - ohw, oTop);
        ctx.lineTo(cx + ohw, oTop);
        ctx.lineTo(cx + ohw * 0.82, headY - hh * 0.08);
        ctx.lineTo(cx - lead * ohw * 0.12, headY + hh * 0.04);
        ctx.lineTo(cx - ohw * 0.82, headY - hh * 0.14);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    // THE TENTACLES — structure: they hold the silhouette. Each is
    // a tapered two-segment arm; the side pair carries paired
    // sucker dots on the inner face; all three sway on the deep's
    // own clock, never in unison.
    const tent = (
      rootX: number, rootY: number, midX: number, midY: number,
      tipX: number, tipY: number, w0: number, tone: number, suckers: boolean,
    ): void => {
      ctx.fillStyle = hurt ? '#ffffff' : shade(st.color, tone);
      ctx.beginPath();
      ctx.moveTo(rootX - w0, rootY);
      ctx.quadraticCurveTo(midX - w0 * 0.8, midY, tipX - w0 * 0.22, tipY);
      // The curled tip: hooks back on itself — an arm, not a strap.
      ctx.quadraticCurveTo(tipX + w0 * 0.5, tipY + w0 * 0.9, tipX + w0 * 0.85, tipY - w0 * 0.2);
      ctx.quadraticCurveTo(midX + w0 * 0.9, midY + w0 * 0.4, rootX + w0, rootY);
      ctx.closePath();
      ctx.fill();
      if (!hurt && suckers) {
        ctx.fillStyle = shade(st.trim, -8);
        for (let k2 = 0; k2 < 4; k2++) {
          const uu = 0.22 + k2 * 0.2;
          const sx2 = rootX + (midX - rootX) * uu * 1.6 - w0 * 0.1;
          const sy2 = rootY + (midY - rootY) * uu * 1.6;
          ctx.beginPath();
          ctx.arc(sx2, sy2, Math.max(1, w0 * 0.2), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
    // Crown arm: curls up and trailing off the mantle peak.
    tent(
      headX - lead * hw * 0.3, headY - hh * 1.5,
      headX - lead * hw * (1.0 + t * 0.2), headY - hh * (1.7 + 0.04 * Math.sin(f.nowMs * 0.0012)),
      headX - lead * hw * (1.5 + t * 0.4) - sway, headY - hh * 1.14,
      hw * 0.14, -6, false,
    );
    // Side arms: drape past the jaw toward the shoulders.
    tent(
      headX + lead * hw * 1.0, headY + hh * 0.2,
      headX + lead * hw * (1.3 + t * 0.14), headY + hh * 0.92,
      headX + lead * hw * 1.06 + sway * 0.6, headY + hh * 1.62,
      hw * 0.16, 2, true,
    );
    tent(
      headX - lead * hw * 1.06, headY + hh * 0.24,
      headX - lead * hw * (1.34 + t * 0.2), headY + hh * 0.98,
      headX - lead * hw * 1.1 - sway * 0.8, headY + hh * 1.6,
      hw * 0.14, -14, true,
    );
    if (!hurt && !front) {
      // Back read: the mantle's siphon seam + a fourth arm hugging
      // the spine.
      ctx.strokeStyle = shade(st.color, -24);
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.beginPath();
      ctx.moveTo(headX, headY - hh * 1.5);
      ctx.lineTo(headX + lead * hw * 0.08, headY + hh * 0.7);
      ctx.stroke();
      tent(
        headX + lead * hw * 0.1, headY + hh * 0.5,
        headX + lead * hw * 0.2, headY + hh * 1.2,
        headX - lead * hw * 0.12, headY + hh * 1.8,
        hw * 0.12, -18, true,
      );
    }
    return;
  }

  if (st.kind === 'marlincrest') {
    // THE MARLINCREST — the strike made armor: the BILL spears
    // forward-up off the brow (one long two-facet blade, the
    // silhouette that names the fish at any distance), the SAIL
    // rakes back in ribbed spines under teal membrane, streamlined
    // cheek plates close the jaw. The eyes keep a hard visor shade —
    // bare-faced is not the same as readable.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.7 * (1 - 0.5 * t);
    const mem = st.divecrest?.color ?? shade(st.color, -14);
    const spine = st.divecrest?.flash ?? shade(st.trim, -8);
    // THE BILL — structure: two facets, upper lit, lower shaded.
    const billTipX = headX + lead * hw * (2.35 + t * 0.4);
    const billTipY = headY - hh * 1.06;
    ctx.fillStyle = hurt ? '#ffffff' : shade(spine, 14);
    ctx.beginPath();
    ctx.moveTo(headX + lead * hw * 0.5, headY - hh * 0.98);
    ctx.lineTo(billTipX, billTipY);
    ctx.lineTo(headX + lead * hw * 0.56, headY - hh * 0.78);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = shade(spine, -12);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 0.56, headY - hh * 0.78);
      ctx.lineTo(billTipX, billTipY);
      ctx.lineTo(headX + lead * hw * 0.6, headY - hh * 0.64);
      ctx.closePath();
      ctx.fill();
    }
    // THE SAIL — structure: five gold spines raking back off the
    // crown with membrane planes between, tall at the brow, dying
    // at the nape. Filled planes; spines as seams.
    const sailPts: Array<[number, number]> = [
      [0.36, 1.94], [-0.06, 1.98], [-0.5, 1.86], [-0.9, 1.6], [-1.2, 1.3],
    ];
    ctx.fillStyle = hurt ? '#ffffff' : mem;
    ctx.beginPath();
    ctx.moveTo(headX + lead * hw * 0.6, headY - hh * 1.04);
    for (const [ux, uy] of sailPts) {
      ctx.lineTo(headX + lead * hw * ux, headY - hh * uy);
    }
    ctx.lineTo(headX - lead * hw * (1.3 + t * 0.24), headY - hh * 1.02);
    ctx.lineTo(headX - lead * hw * 0.4, headY - hh * 1.06);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      ctx.strokeStyle = spine;
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (const [ux, uy] of sailPts) {
        ctx.beginPath();
        ctx.moveTo(headX + lead * hw * (ux * 0.32 - 0.02), headY - hh * 1.05);
        ctx.lineTo(headX + lead * hw * ux, headY - hh * uy);
        ctx.stroke();
      }
    }
    // The cap: streamlined, close, planar — with cheek plates.
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.1, headY + hh * 0.5);
      ctx.lineTo(headX + lead * hw * 1.18, headY - hh * 0.42);
      ctx.lineTo(headX + lead * hw * 0.6, headY - hh * 1.08);
      ctx.lineTo(headX - lead * hw * 0.5, headY - hh * 1.12);
      ctx.lineTo(headX - lead * hw * (1.06 + t * 0.24), headY - hh * 0.6);
      ctx.lineTo(headX - lead * hw * (1.14 + t * 0.26), headY + hh * 0.2);
      ctx.lineTo(headX - lead * hw * 0.96, headY + hh * 0.66);
      ctx.lineTo(headX - lead * hw * 0.2, headY + hh * 0.4);
      ctx.lineTo(headX + lead * hw * 0.5, headY + hh * 0.62);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      ctx.clip();
      ctx.fillStyle = shade(st.color, -13);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 1.6, hw * 2.4, hh * 3.0);
      ctx.fillStyle = shade(st.color, 12);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 0.56, headY - hh * 1.02);
      ctx.lineTo(headX - lead * hw * 0.44, headY - hh * 1.06);
      ctx.lineTo(headX - lead * hw * 0.36, headY - hh * 0.82);
      ctx.lineTo(headX + lead * hw * 0.46, headY - hh * 0.78);
      ctx.closePath();
      ctx.fill();
      // The lateral line: one scored streamline down the cheek.
      ctx.strokeStyle = shade(st.color, -22);
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 1.08, headY - hh * 0.3);
      ctx.quadraticCurveTo(headX + lead * hw * 0.5, headY - hh * 0.06, headX - lead * hw * 0.6, headY - hh * 0.1);
      ctx.stroke();
      ctx.restore();
      if (front) {
        // The visor shade band: hard, past the eye line.
        ctx.fillStyle = 'rgba(16, 12, 20, 0.4)';
        ctx.beginPath();
        ctx.moveTo(cx - ohw * 0.92, headY - hh * 0.5);
        ctx.lineTo(cx + ohw * 0.92, headY - hh * 0.46);
        ctx.lineTo(cx + ohw * 0.74, headY - hh * 0.1);
        ctx.lineTo(cx - ohw * 0.74, headY - hh * 0.16);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(st.trim, 8);
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(cx - ohw * 0.92, headY - hh * 0.48);
        ctx.lineTo(cx + ohw * 0.92, headY - hh * 0.44);
        ctx.stroke();
      } else {
        // Back read: the sail's trailing spines + cap seams.
        ctx.strokeStyle = shade(st.color, -22);
        ctx.lineWidth = Math.max(1, s * 0.012);
        for (const ku of [-0.42, 0.42]) {
          ctx.beginPath();
          ctx.moveTo(headX + hw * ku, headY - hh * 1.04);
          ctx.lineTo(headX + hw * ku * 0.7, headY - hh * 0.3);
          ctx.stroke();
        }
      }
    }
    return;
  }

  if (st.kind === 'guildcowl') {
    // THE MASTER'S DROOP — cutpurse's head, the guild's own cut: a
    // hard planar hood whose crown falls into a DROOPED POINT off
    // the trailing crown — a liripipe with the weight of good cloth,
    // trailing the facing the way courierhood's peak streams and
    // shadowcowl's blade sweeps (a point that LEADS the face reads
    // as a horn; the caught bug). Below the eye line the kerchief
    // claims everything and hangs to a point past the hem, stamped
    // once with the guild's coin. The one vanity: a brass bead at
    // the droop's very tip, catching light it has no business
    // catching.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.72 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.62;
    const oBot = headY + hh * 0.84;
    // THE DROOPED POINT LIVES ON THE TURN: foreshortened frontal (a
    // short peek past the trailing crown), drawn out to the full
    // droop at profile; the tip falls well BELOW its own root —
    // drooped, never wind-drawn.
    const bkLen = 0.55 + t * 1.15;
    const rootX = headX - lead * hw * 0.6;
    const rootY = headY - hh * 1.16;
    const peakX = headX - lead * hw * (0.6 + bkLen);
    const peakY = headY - hh * (0.34 - t * 0.08);
    // The droop's own spine: fractions root→tip so the facets
    // stretch WITH the facing.
    const bkXd = (k: number): number => rootX + (peakX - rootX) * k;
    const bkYd = (k: number): number => rootY + (peakY - rootY) * k;
    const apexX = headX + lead * hw * 0.1;
    const apexY = headY - hh * 1.38;
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.18, headY + hh * 1.14);
      ctx.lineTo(headX + lead * hw * 1.26, headY + hh * 0.14);
      // A clean leading edge up to the jutting brow ledge — the
      // face side carries the arch, the crown carries the droop.
      ctx.lineTo(headX + lead * hw * 1.06, headY - hh * 0.5);
      ctx.lineTo(headX + lead * hw * 1.12, headY - hh * 0.88);
      // Crown: one clean rake to the apex, then the trailing crown
      // breaks into THE DROOPED POINT — out, DOWN, and back under
      // itself into the drape.
      ctx.quadraticCurveTo(headX + lead * hw * 0.52, headY - hh * 1.3, apexX, apexY);
      ctx.lineTo(rootX, rootY);
      ctx.lineTo(peakX, peakY);
      ctx.quadraticCurveTo(headX - lead * hw * (0.98 + t * 0.2), headY - hh * 0.66, headX - lead * hw * (1.14 + t * 0.28), headY - hh * 0.5);
      ctx.quadraticCurveTo(headX - lead * hw * (1.28 + t * 0.3), headY + hh * 0.28, headX - lead * hw * 1.24, headY + hh * 1.14);
      // The mantle hem breaks in two swept points.
      ctx.lineTo(headX - lead * hw * 0.5, headY + hh * 1.32);
      ctx.lineTo(headX - lead * hw * 0.26, headY + hh * 1.2);
      ctx.lineTo(headX + lead * hw * 0.4, headY + hh * 1.36);
      ctx.lineTo(headX + lead * hw * 0.64, headY + hh * 1.18);
      ctx.closePath();
    };
    // The shrine arch under the brow ledge — pointed, leaning with
    // the face.
    const opening = () => {
      ctx.moveTo(cx - ohw, oBot);
      ctx.lineTo(cx - ohw, headY - hh * 0.1);
      ctx.lineTo(cx - ohw * 0.5, oTop + hh * 0.16);
      ctx.lineTo(cx + lead * ohw * 0.06, oTop);
      ctx.lineTo(cx + ohw * 0.5, oTop + hh * 0.16);
      ctx.lineTo(cx + ohw, headY - hh * 0.1);
      ctx.lineTo(cx + ohw, oBot);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      // Trailing-half shade, then FOLDED planes on crease lines.
      ctx.fillStyle = shade(st.color, -13);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 1.7, hw * 2.4, hh * 3.4);
      // The droop's LIT top plane, root to tip — the light lands on
      // the point's upper edge the whole way out; facets ride the
      // droop's own spine so they stretch WITH the facing.
      ctx.fillStyle = shade(st.color, 12);
      ctx.beginPath();
      ctx.moveTo(rootX, rootY);
      ctx.lineTo(peakX, peakY);
      ctx.lineTo(bkXd(0.72), bkYd(0.72) + hh * 0.16);
      ctx.lineTo(rootX - lead * hw * 0.02, rootY + hh * 0.22);
      ctx.closePath();
      ctx.fill();
      // The under-belly: the deepest plane on the head — the droop's
      // shadowed fold, tip back into the drape.
      ctx.fillStyle = shade(st.color, -26);
      ctx.beginPath();
      ctx.moveTo(peakX, peakY);
      ctx.lineTo(headX - lead * hw * (1.1 + t * 0.24), headY - hh * 0.5);
      ctx.lineTo(bkXd(0.45), bkYd(0.45) + hh * 0.2);
      ctx.closePath();
      ctx.fill();
      // One crease down the crown rake.
      ctx.strokeStyle = shade(st.color, -22);
      ctx.lineWidth = Math.max(1, s * 0.011);
      ctx.beginPath();
      ctx.moveTo(apexX + lead * hw * 0.3, apexY + hh * 0.16);
      ctx.lineTo(headX - lead * hw * 0.3, headY - hh * 0.2);
      ctx.stroke();
      ctx.restore();
      if (front) {
        // THE CAST OF THE BEAK: folded dark past the eye line — an
        // OPAQUE plane (translucent fills silently no-op in this
        // paint path; the storm court's probe, confirmed here), its
        // deep corner leading: the shadow the peak throws. The face
        // is nobody — the dark holds everything above the kerchief.
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        ctx.fillStyle = '#241b21';
        ctx.beginPath();
        ctx.moveTo(cx - ohw, oTop);
        ctx.lineTo(cx + ohw, oTop);
        ctx.lineTo(cx + ohw, headY + hh * 0.12);
        ctx.lineTo(cx - lead * ohw * 0.2, headY + hh * 0.02);
        ctx.lineTo(cx - ohw, headY + hh * 0.1);
        ctx.closePath();
        ctx.fill();
        // The deeper wedge lives in the TRAILING corner — the
        // turned-away side of the void (the leading corner takes
        // what light the arch lets in).
        ctx.fillStyle = '#181117';
        ctx.beginPath();
        ctx.moveTo(cx - lead * ohw * 0.15, oTop);
        ctx.lineTo(cx - lead * ohw, oTop);
        ctx.lineTo(cx - lead * ohw, headY - hh * 0.1);
        ctx.closePath();
        ctx.fill();
        // The void's inner rim: one lighter step just inside the
        // arch — the dark has DEPTH, not just absence. Three planes
        // deep before the kerchief: rim, dark, deepest corner.
        ctx.fillStyle = '#2e2229';
        ctx.beginPath();
        ctx.moveTo(cx - ohw, oTop + hh * 0.5);
        ctx.lineTo(cx - ohw, headY - hh * 0.1);
        ctx.lineTo(cx - ohw * 0.5, oTop + hh * 0.16);
        ctx.lineTo(cx + lead * ohw * 0.06, oTop);
        ctx.lineTo(cx - ohw * 0.62, oTop + hh * 0.3);
        ctx.lineTo(cx - ohw * 0.86, headY - hh * 0.16);
        ctx.closePath();
        ctx.fill();
        // THE KERCHIEF below the eye line — flat panel, one nose
        // ridge, and the hanging point drawn INSIDE the opening.
        if (st.mask) {
          ctx.fillStyle = st.mask;
          ctx.fillRect(cx - ohw, headY - hh * 0.04, ohw * 2, oBot - (headY - hh * 0.04));
          ctx.fillStyle = shade(st.mask, 18);
          ctx.beginPath();
          ctx.moveTo(cx - ohw * 0.38, headY - hh * 0.04);
          ctx.lineTo(cx + ohw * 0.38, headY - hh * 0.04);
          ctx.lineTo(cx + ohw * 0.14, headY + hh * 0.24);
          ctx.lineTo(cx - ohw * 0.14, headY + hh * 0.24);
          ctx.closePath();
          ctx.fill();
          // The coin STAMP on the leading cheek: a pressed ring and
          // a square punch — the guild seal, matte, never glinting
          // (the glint budget belongs to the beak bead).
          ctx.strokeStyle = shade(st.mask, 32);
          ctx.lineWidth = Math.max(1, s * 0.009);
          ctx.beginPath();
          ctx.arc(cx + lead * ohw * 0.52, headY + hh * 0.34, headR * 0.09, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = shade(st.mask, 32);
          ctx.fillRect(cx + lead * ohw * 0.52 - headR * 0.028, headY + hh * 0.34 - headR * 0.028, headR * 0.056, headR * 0.056);
        }
        ctx.restore();
        // The kerchief's hanging point drops past the hood hem.
        if (st.mask) {
          ctx.fillStyle = st.mask;
          ctx.beginPath();
          ctx.moveTo(cx - ohw * 0.5, oBot - hh * 0.06);
          ctx.lineTo(cx + ohw * 0.5, oBot - hh * 0.06);
          ctx.lineTo(cx + lead * ohw * 0.14, headY + hh * 1.42);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = shade(st.mask, -14);
          ctx.beginPath();
          ctx.moveTo(cx + lead * ohw * 0.02, oBot - hh * 0.02);
          ctx.lineTo(cx + lead * ohw * 0.5, oBot - hh * 0.06);
          ctx.lineTo(cx + lead * ohw * 0.14, headY + hh * 1.42);
          ctx.closePath();
          ctx.fill();
        }
        // THE FRAME: double brass piping around the arch — the guild
        // dresses even its shadows.
        ctx.strokeStyle = shade(st.trim, 10);
        ctx.lineWidth = Math.max(1.5, headR * 0.055);
        ctx.beginPath();
        opening();
        ctx.stroke();
        ctx.strokeStyle = shade(st.color, -26);
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.beginPath();
        ctx.moveTo(cx - ohw * 0.86, oBot - hh * 0.04);
        ctx.lineTo(cx - ohw * 0.86, headY - hh * 0.06);
        ctx.lineTo(cx - ohw * 0.42, oTop + hh * 0.22);
        ctx.lineTo(cx + lead * ohw * 0.06, oTop + hh * 0.1);
        ctx.lineTo(cx + ohw * 0.42, oTop + hh * 0.22);
        ctx.lineTo(cx + ohw * 0.86, headY - hh * 0.06);
        ctx.lineTo(cx + ohw * 0.86, oBot - hh * 0.04);
        ctx.stroke();
      } else {
        // Back read: THE DROOP OWNS THE BACK — from behind, the
        // liripipe is the whole story: it falls from the trailing
        // crown, sweeps to the center seam and hangs past the hem,
        // the guild's bead at its tip. Crown seam first.
        ctx.strokeStyle = shade(st.color, -24);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(headX, headY - hh * 1.22);
        ctx.lineTo(headX + lead * hw * 0.08, headY + hh * 0.84);
        ctx.stroke();
        // The fall: the point hangs OVER the hood's shaded back, so
        // it catches the light the back cannot — base value on the
        // body, a deep folded tail, one dark seam line to cut it
        // free of the cloth beneath.
        ctx.fillStyle = st.color;
        ctx.beginPath();
        ctx.moveTo(rootX, rootY + hh * 0.08);
        ctx.quadraticCurveTo(headX - lead * hw * 0.58, headY - hh * 0.16, headX - lead * hw * 0.22, headY + hh * 1.0);
        ctx.lineTo(headX - lead * hw * 0.02, headY + hh * 1.7);
        ctx.lineTo(headX + lead * hw * 0.18, headY + hh * 0.98);
        ctx.quadraticCurveTo(headX - lead * hw * 0.12, headY - hh * 0.28, rootX + lead * hw * 0.28, rootY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(st.color, -28);
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        ctx.moveTo(rootX, rootY + hh * 0.08);
        ctx.quadraticCurveTo(headX - lead * hw * 0.58, headY - hh * 0.16, headX - lead * hw * 0.22, headY + hh * 1.0);
        ctx.lineTo(headX - lead * hw * 0.02, headY + hh * 1.7);
        ctx.stroke();
        ctx.fillStyle = shade(st.color, -18);
        ctx.beginPath();
        ctx.moveTo(headX - lead * hw * 0.22, headY + hh * 1.0);
        ctx.lineTo(headX - lead * hw * 0.02, headY + hh * 1.7);
        ctx.lineTo(headX + lead * hw * 0.18, headY + hh * 0.98);
        ctx.closePath();
        ctx.fill();
        // The bead hangs at the fall's tip.
        if (st.coinpin) {
          const flare2 = f.nowMs % 3400 < 240;
          ctx.fillStyle = flare2 ? shade(st.coinpin.color, 34) : st.coinpin.color;
          ctx.beginPath();
          ctx.arc(headX - lead * hw * 0.02, headY + hh * 1.78, headR * 0.062, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // THE BEAD ON THE DROOP: brass at the very tip, flaring on the
      // rare clock — the master announces nothing, and yet. Front
      // and side facings only: the back read hangs its own bead at
      // the fall's tip.
      if (st.coinpin && front) {
        const gx = peakX + lead * hw * 0.08;
        const gy = peakY - hh * 0.04;
        const flare = f.nowMs % 3400 < 240;
        ctx.fillStyle = flare ? shade(st.coinpin.color, 34) : st.coinpin.color;
        ctx.beginPath();
        ctx.arc(gx, gy, headR * (flare ? 0.075 : 0.062), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(st.coinpin.color, -24);
        ctx.beginPath();
        ctx.arc(gx, gy, headR * 0.024, 0, Math.PI * 2);
        ctx.fill();
        if (flare) {
          ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.arc(gx, gy, headR * 0.14, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }
    return;
  }
  if (st.kind === 'latchhood') {
    // THE LATCHHOOD — alleyrat's head: the housebreaker works CLOSE.
    // The only close-cut head in the guild: a seamed leather coif
    // hugging the skull, a jaw wrap sealing the lower face, and the
    // office worn across the brow — an iron band with a keyhole
    // punched clean through it. Three skeleton keys hang at the
    // trailing jaw, none of them his. The opening is an eye band and
    // nothing more; the quarter's doors know the rest.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.74 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.5;
    const oBot = headY + hh * 0.08;
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.06, headY + hh * 1.04);
      ctx.quadraticCurveTo(headX + lead * hw * 1.16, headY + hh * 0.16, headX + lead * hw * 1.02, headY - hh * 0.6);
      ctx.quadraticCurveTo(headX + lead * hw * 0.92, headY - hh * 1.1, headX + lead * hw * 0.28, headY - hh * 1.26);
      ctx.quadraticCurveTo(headX - lead * hw * 0.4, headY - hh * 1.3, headX - lead * hw * (0.96 + t * 0.16), headY - hh * 0.86);
      ctx.quadraticCurveTo(headX - lead * hw * (1.12 + t * 0.18), headY - hh * 0.2, headX - lead * hw * 1.06, headY + hh * 1.04);
      // The chin wrap closes the hem — one piece, no drape.
      ctx.quadraticCurveTo(headX, headY + hh * 1.3, headX + lead * hw * 1.06, headY + hh * 1.04);
      ctx.closePath();
    };
    const opening = () => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.6);
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      ctx.fillStyle = shade(st.color, -13);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 1.6, hw * 2.4, hh * 3.2);
      // The coif's seams: three saddle lines radiating over the
      // crown — the craft IS the ornament on a working head.
      ctx.strokeStyle = shade(st.color, -24);
      ctx.lineWidth = Math.max(1, s * 0.01);
      for (const u of [-0.5, 0.05, 0.6]) {
        ctx.beginPath();
        ctx.moveTo(headX + lead * hw * u, headY - hh * 1.28);
        ctx.quadraticCurveTo(headX + lead * hw * (u * 0.7), headY - hh * 0.9, headX + lead * hw * (u * 0.9), headY - hh * 0.66);
        ctx.stroke();
      }
      // THE JAW WRAP: the lower face sealed in its own darker cloth,
      // one fold line where it tucks.
      const lt = st.latch;
      if (lt) {
        ctx.fillStyle = lt.wrap;
        ctx.beginPath();
        ctx.moveTo(headX + lead * hw * 1.1, headY + hh * 0.26);
        ctx.lineTo(headX - lead * hw * 1.1, headY + hh * 0.2);
        ctx.lineTo(headX - lead * hw * 1.04, headY + hh * 1.1);
        ctx.quadraticCurveTo(headX, headY + hh * 1.34, headX + lead * hw * 1.04, headY + hh * 1.1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(lt.wrap, -18);
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        ctx.moveTo(headX + lead * hw * 0.9, headY + hh * 0.52);
        ctx.quadraticCurveTo(headX, headY + hh * 0.66, headX - lead * hw * 0.86, headY + hh * 0.48);
        ctx.stroke();
      }
      ctx.restore();
      // THE BROW BAND: iron across the forehead, riveted at both
      // temples, the keyhole punched at the leading third — the
      // office, worn where the door can see it.
      const lt2 = st.latch;
      if (lt2) {
        const bandT = headY - hh * 0.92;
        const bandB = headY - hh * 0.6;
        ctx.fillStyle = lt2.band;
        ctx.beginPath();
        ctx.moveTo(headX + lead * hw * 1.0, bandB + hh * 0.06);
        ctx.lineTo(headX + lead * hw * 0.94, bandT);
        ctx.lineTo(headX - lead * hw * (0.88 + t * 0.14), bandT + hh * 0.08);
        ctx.lineTo(headX - lead * hw * (0.96 + t * 0.16), bandB + hh * 0.1);
        ctx.closePath();
        ctx.fill();
        // The band's lit top edge — iron takes light on the arris.
        ctx.strokeStyle = shade(lt2.band, 24);
        ctx.lineWidth = Math.max(1, s * 0.011);
        ctx.beginPath();
        ctx.moveTo(headX + lead * hw * 0.94, bandT + hh * 0.015);
        ctx.lineTo(headX - lead * hw * (0.88 + t * 0.14), bandT + hh * 0.095);
        ctx.stroke();
        if (front) {
          // THE KEYHOLE: circle and wedge, a void in the iron — and
          // on the rare clock a warm light stands INSIDE it (light
          // lives IN a form, never as a badge on it): some door,
          // somewhere, remembering the Latch.
          const kx2 = cx + lead * ohw * 0.34;
          const ky2 = (bandT + bandB) / 2 + hh * 0.02;
          const lit2 = f.nowMs % 4700 < 340;
          ctx.fillStyle = lit2 ? '#e8a04c' : '#14161a';
          ctx.beginPath();
          ctx.arc(kx2, ky2 - hh * 0.045, headR * 0.055, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(kx2 - headR * 0.03, ky2 - hh * 0.02);
          ctx.lineTo(kx2 + headR * 0.03, ky2 - hh * 0.02);
          ctx.lineTo(kx2 + headR * 0.05, ky2 + hh * 0.075);
          ctx.lineTo(kx2 - headR * 0.05, ky2 + hh * 0.075);
          ctx.closePath();
          ctx.fill();
        }
        // Rivets at the temples.
        ctx.fillStyle = shade(lt2.band, -22);
        for (const u of [0.86, -0.78]) {
          ctx.beginPath();
          ctx.arc(headX + lead * hw * u, (bandT + bandB) / 2 + (u < 0 ? hh * 0.06 : 0), headR * 0.035, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (front) {
        // The eye band holds a hard FOLDED dark — OPAQUE (translucent
        // fills no-op in this paint path), the band's own brow shadow;
        // the eyes emerge under its ragged lower edge. The one head in
        // the guild that lets you meet its eyes, and only its eyes.
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        ctx.fillStyle = '#1d1b20';
        ctx.beginPath();
        ctx.moveTo(cx - ohw, oTop);
        ctx.lineTo(cx + ohw, oTop);
        ctx.lineTo(cx + ohw, oTop + hh * 0.42);
        ctx.lineTo(cx - lead * ohw * 0.1, oTop + hh * 0.54);
        ctx.lineTo(cx - ohw, oTop + hh * 0.36);
        ctx.closePath();
        ctx.fill();
        // THE CAST VEIL (the storm court's lane): stacked translucent
        // STROKES fall off the shadow's edge onto the eyes — strokes
        // are the one alpha channel this paint path honors, so the
        // brow's dark dies softly instead of ending in a sticker line.
        ctx.strokeStyle = '#1d1b20';
        ctx.lineWidth = Math.max(1.5, hh * 0.07);
        for (const [off, al] of [[0.03, 0.4], [0.09, 0.22], [0.15, 0.1]] as const) {
          ctx.globalAlpha = al;
          ctx.beginPath();
          ctx.moveTo(cx - ohw, oTop + hh * (0.38 + off));
          ctx.lineTo(cx + ohw, oTop + hh * (0.44 + off));
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
        // Stitch frame on the eye band's lower lip.
        ctx.strokeStyle = shade(st.color, -26);
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.setLineDash([s * 0.012, s * 0.011]);
        ctx.beginPath();
        ctx.moveTo(cx - ohw * 0.9, oBot + hh * 0.07);
        ctx.lineTo(cx + ohw * 0.9, oBot + hh * 0.07);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Back read: center seam, the wrap's tuck, and the band
        // buckled at the nape.
        ctx.strokeStyle = shade(st.color, -24);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(headX, headY - hh * 1.24);
        ctx.lineTo(headX + lead * hw * 0.06, headY + hh * 1.0);
        ctx.stroke();
        if (st.latch) {
          ctx.fillStyle = st.latch.band;
          ctx.fillRect(headX - hw * 0.5, headY - hh * 0.88, hw, hh * 0.24);
          ctx.fillStyle = shade(st.latch.band, -22);
          ctx.fillRect(headX - headR * 0.05, headY - hh * 0.86, headR * 0.1, hh * 0.2);
        }
      }
      // THE KEYS: three at the trailing jaw off one ring, staggered
      // lengths, hung to gravity — and the glint is RARE and uneven,
      // one key at a time remembering a door.
      const lt3 = front ? st.latch : undefined;
      if (lt3) {
        // The keys hang from a collar ring INBOARD of the shoulder —
        // over the sternum, where the near arm's pauldron (painted
        // after the helmet) can never bury them. These are the
        // office; the office stays visible.
        const rx = headX - lead * hw * 0.5;
        const ry = headY + hh * 1.0;
        ctx.strokeStyle = shade(lt3.band, 16);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.arc(rx, ry, headR * 0.08, 0, Math.PI * 2);
        ctx.stroke();
        const wake = f.nowMs % 3100 < 260 ? Math.floor(f.nowMs / 3100) % 3 : -1;
        const keys: Array<[number, number, number]> = [
          [-0.13, 0.52, -0.16], [0.02, 0.68, 0.05], [0.15, 0.42, 0.2],
        ];
        for (let i = 0; i < 3; i++) {
          const [dx, len, tilt] = keys[i]!;
          const kc = i === wake ? (lt3.keys ? shade(lt3.keys, 30) : '#ffffff') : lt3.keys;
          ctx.save();
          ctx.translate(rx - lead * hw * 0.02 + dx * hw, ry + headR * 0.07);
          ctx.rotate(tilt * (lead || 1));
          ctx.strokeStyle = kc;
          ctx.lineWidth = Math.max(1.5, s * 0.014);
          // Bow at the ring, stem down, bit at the foot.
          ctx.beginPath();
          ctx.arc(0, headR * 0.055, headR * 0.06, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, headR * 0.115);
          ctx.lineTo(0, hh * len);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, hh * len);
          ctx.lineTo(headR * 0.07, hh * len);
          ctx.moveTo(0, hh * (len - 0.09));
          ctx.lineTo(headR * 0.052, hh * (len - 0.09));
          ctx.stroke();
          ctx.restore();
        }
      }
    }
    return;
  }
  if (st.kind === 'veilwrap') {
    // THE VEILWRAP — moonless's head: the night wound on in bands.
    // No hood, no volume, NO opening — cloth wrapped turn over turn
    // until there is no face to find, and where the eyes should be,
    // one slit holding a cold light that breathes. The trailing end
    // streams behind on a slow clock; the silhouette steps where the
    // wraps cross it. On the real nights, nothing looks back.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const sway = Math.sin(f.nowMs * 0.0013) * hw * 0.05;
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.08, headY + hh * 1.06);
      ctx.lineTo(headX + lead * hw * 1.16, headY + hh * 0.24);
      // The silhouette STEPS at each wrap edge — polygonal, banded.
      ctx.lineTo(headX + lead * hw * 1.06, headY - hh * 0.08);
      ctx.lineTo(headX + lead * hw * 1.12, headY - hh * 0.42);
      ctx.lineTo(headX + lead * hw * 0.92, headY - hh * 0.72);
      ctx.lineTo(headX + lead * hw * 0.66, headY - hh * 1.14);
      ctx.lineTo(headX - lead * hw * 0.12, headY - hh * 1.28);
      ctx.lineTo(headX - lead * hw * 0.76, headY - hh * 1.06);
      // Steps stay ON the silhouette but never step INSIDE the skull
      // — a wrap edge that dips under 1.04 head-widths lets the face
      // chip peek through the cloth (the round-1 orange wedge).
      ctx.lineTo(headX - lead * hw * (1.08 + t * 0.16), headY - hh * 0.64);
      ctx.lineTo(headX - lead * hw * (1.04 + t * 0.14), headY - hh * 0.28);
      ctx.lineTo(headX - lead * hw * (1.18 + t * 0.18), headY + hh * 0.1);
      ctx.lineTo(headX - lead * hw * 1.06, headY + hh * 1.06);
      // The throat wrap closes low — one piece to the collar.
      ctx.quadraticCurveTo(headX, headY + hh * 1.32, headX + lead * hw * 1.08, headY + hh * 1.06);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      ctx.clip();
      ctx.fillStyle = shade(st.color, -13);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 1.6, hw * 2.4, hh * 3.2);
      // THE WRAPS: three hard band planes crossing the skull on the
      // diagonal, every value change on a wrap edge — never a
      // gradient. Top band lit, jaw band deep.
      ctx.fillStyle = shade(st.color, 8);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 0.94, headY - hh * 0.7);
      ctx.lineTo(headX + lead * hw * 0.6, headY - hh * 1.18);
      ctx.lineTo(headX - lead * hw * 0.2, headY - hh * 1.3);
      ctx.lineTo(headX - lead * hw * 0.82, headY - hh * 1.0);
      ctx.lineTo(headX - lead * hw * 0.4, headY - hh * 0.78);
      ctx.lineTo(headX + lead * hw * 0.3, headY - hh * 0.82);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(st.color, -6);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 1.12, headY - hh * 0.4);
      ctx.lineTo(headX + lead * hw * 0.94, headY - hh * 0.68);
      ctx.lineTo(headX - lead * hw * 0.44, headY - hh * 0.76);
      ctx.lineTo(headX - lead * hw * (1.0 + t * 0.16), headY - hh * 0.6);
      ctx.lineTo(headX - lead * hw * (0.92 + t * 0.14), headY - hh * 0.3);
      ctx.lineTo(headX + lead * hw * 0.2, headY - hh * 0.24);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(st.color, -20);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 1.14, headY + hh * 0.3);
      ctx.lineTo(headX + lead * hw * 1.04, headY + hh * 0.62);
      ctx.lineTo(headX - lead * hw * 1.02, headY + hh * 0.54);
      ctx.lineTo(headX - lead * hw * 1.1, headY + hh * 0.16);
      ctx.lineTo(headX - lead * hw * 0.3, headY + hh * 0.24);
      ctx.closePath();
      ctx.fill();
      // Wrap edges: two hard separation lines along the band seams.
      ctx.strokeStyle = shade(st.color, -26);
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 1.06, headY - hh * 0.44);
      ctx.lineTo(headX - lead * hw * (0.94 + t * 0.14), headY - hh * 0.34);
      ctx.moveTo(headX + lead * hw * 1.1, headY + hh * 0.26);
      ctx.lineTo(headX - lead * hw * 1.06, headY + hh * 0.12);
      ctx.stroke();
      // The tuck knot at the trailing temple.
      ctx.fillStyle = shade(st.color, -10);
      ctx.beginPath();
      ctx.moveTo(headX - lead * hw * 0.84, headY - hh * 0.66);
      ctx.lineTo(headX - lead * hw * 0.6, headY - hh * 0.78);
      ctx.lineTo(headX - lead * hw * 0.58, headY - hh * 0.5);
      ctx.lineTo(headX - lead * hw * 0.84, headY - hh * 0.44);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // THE TRAILING ENDS: two loose bands streaming behind, each on
      // its own clock — never in unison (the tentacle law); the only
      // things about the Unseen that move.
      const sway2 = Math.sin(f.nowMs * 0.0013 + 2.1) * hw * 0.04;
      const endX = headX - lead * (hw * (1.7 + t * 0.4) + sway);
      const endY = headY - hh * 0.34 + sway * 0.5;
      const end2X = headX - lead * (hw * (1.3 + t * 0.3) + sway2);
      const end2Y = headY + hh * (0.08 + t * 0.05) + sway2 * 0.6;
      // The shorter, lower end first — it reads BEHIND the long one.
      ctx.fillStyle = shade(st.color, -14);
      ctx.beginPath();
      ctx.moveTo(headX - lead * hw * 0.88, headY - hh * 0.3);
      ctx.quadraticCurveTo(headX - lead * hw * 1.1, headY - hh * 0.14, end2X, end2Y);
      ctx.lineTo(end2X + lead * hw * 0.12, end2Y + hh * 0.13);
      ctx.quadraticCurveTo(headX - lead * hw * 1.04, headY + hh * 0.06, headX - lead * hw * 0.9, headY - hh * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(st.color, -4);
      ctx.beginPath();
      ctx.moveTo(headX - lead * hw * 0.8, headY - hh * 0.72);
      ctx.quadraticCurveTo(headX - lead * hw * 1.3, headY - hh * 0.72, endX, endY);
      ctx.lineTo(endX + lead * hw * 0.14, endY + hh * 0.16);
      ctx.quadraticCurveTo(headX - lead * hw * 1.24, headY - hh * 0.42, headX - lead * hw * 0.82, headY - hh * 0.48);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(st.color, -18);
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX + lead * hw * 0.14, endY + hh * 0.16);
      ctx.lineTo(endX + lead * hw * 0.42, endY + hh * 0.05);
      ctx.closePath();
      ctx.fill();
      if (front) {
        // THE SLIT: a lens of dark at the eye line, and inside it
        // the cold light, breathing on its own slow clock. Not eyes.
        // A place where eyes refuse to be.
        const sy = headY - hh * 0.2;
        const sw2 = hw * 0.78 * (1 - 0.5 * t);
        ctx.fillStyle = '#100d16';
        ctx.beginPath();
        ctx.moveTo(cx - sw2, sy);
        ctx.lineTo(cx - sw2 * 0.5, sy - hh * 0.11);
        ctx.lineTo(cx + sw2 * 0.5, sy - hh * 0.11);
        ctx.lineTo(cx + sw2, sy);
        ctx.lineTo(cx + sw2 * 0.5, sy + hh * 0.11);
        ctx.lineTo(cx - sw2 * 0.5, sy + hh * 0.11);
        ctx.closePath();
        ctx.fill();
        if (st.slitglow) {
          const k = 0.5 + 0.5 * Math.sin(f.nowMs * 0.0016);
          ctx.strokeStyle = st.slitglow.color;
          ctx.lineWidth = Math.max(1.5, s * 0.016);
          ctx.globalAlpha = 0.45 + 0.5 * k;
          ctx.beginPath();
          ctx.moveTo(cx - sw2 * 0.78, sy);
          ctx.lineTo(cx + sw2 * 0.78, sy);
          ctx.stroke();
          ctx.globalAlpha = 0.16 * k;
          ctx.lineWidth = Math.max(3, s * 0.05);
          ctx.stroke();
          ctx.globalAlpha = 1;
          // At the breath's PEAK the light sheds: two motes drift up
          // off the slit ends and die — OPAQUE dots fading by SIZE
          // (translucent fills no-op here), each on its own phase.
          for (const [ex2, ph2] of [[-0.7, 0], [0.66, 1550]] as const) {
            const cyc2 = ((f.nowMs + ph2) % 3100) / 3100;
            if (cyc2 < 0.5 && k > 0.55) {
              const u2 = cyc2 / 0.5;
              ctx.fillStyle = st.slitglow.color;
              ctx.beginPath();
              ctx.arc(
                cx + sw2 * ex2 + Math.sin(u2 * 4.4 + ph2) * hw * 0.05,
                sy - hh * 0.06 - u2 * hh * 0.34,
                Math.max(0.5, headR * 0.045 * (1 - u2)), 0, Math.PI * 2,
              );
              ctx.fill();
            }
          }
        }
      } else {
        // Back read: the bands CROSS — an X of wrap edges and the
        // tucked end flap under it.
        ctx.strokeStyle = shade(st.color, -24);
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.7, headY - hh * 0.9);
        ctx.lineTo(headX + hw * 0.74, headY + hh * 0.4);
        ctx.moveTo(headX + hw * 0.7, headY - hh * 0.84);
        ctx.lineTo(headX - hw * 0.7, headY + hh * 0.46);
        ctx.stroke();
        ctx.fillStyle = shade(st.color, -12);
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.16, headY + hh * 0.5);
        ctx.lineTo(headX + hw * 0.2, headY + hh * 0.5);
        ctx.lineTo(headX + hw * 0.06, headY + hh * 1.06);
        ctx.closePath();
        ctx.fill();
      }
    }
    return;
  }
  if (st.kind === 'gripmask') {
    // THE MASTER'S GRIP — the Knife's head remade from nothing. No
    // hood, no cloth, no mask-in-a-window: a sealed casque of ink
    // lacquer swept to a single rear blade point, faceless — and
    // across the featureless void where a face should be, THE RED
    // RIGHT HAND ITSELF: one CONNECTED silhouette (a hand drawn as
    // separate finger bars reads as a decal of stripes — the
    // one-connected-shape law holds for hands as it did for foam),
    // palm heel clamped at the leading jaw, thumb hooking OVER the
    // chin rim, four chisel-tipped fingers raked across toward the
    // trailing brow, the fan compressing as the head turns. Twice
    // in a long while two ember points blink in the finger gaps —
    // it can see you fine. Back read: the crimson wax seal at the
    // nape. The master is the sealed writ.
    const t = profileK;
    const front = backK <= 0.55;
    const tailX = headX - lead * hw * (1.36 + t * 0.28);
    const tailY = headY - hh * 0.52;
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.06, headY + hh * 0.56);
      // Leading cheek to a hard brow ledge, then a sleek dome
      // sweeping long into the rear blade point. The leading edge
      // stays PAST 1.04 head-widths at every station — a step
      // under that lets the face chip peek amber through the shell
      // (the wrap-edge law, caught again at the quarter facings).
      ctx.quadraticCurveTo(headX + lead * hw * 1.18, headY - hh * 0.1, headX + lead * hw * 1.06, headY - hh * 0.66);
      ctx.quadraticCurveTo(headX + lead * hw * 0.6, headY - hh * 1.44, headX - lead * hw * 0.24, headY - hh * 1.4);
      ctx.quadraticCurveTo(headX - lead * hw * 0.98, headY - hh * 1.26, tailX, tailY);
      ctx.lineTo(headX - lead * hw * 1.08, headY - hh * 0.12);
      ctx.quadraticCurveTo(headX - lead * hw * 1.16, headY + hh * 0.44, headX - lead * hw * 0.96, headY + hh * 0.8);
      // The chin band drops LOW — a sealed casque shows no throat.
      ctx.quadraticCurveTo(headX, headY + hh * 1.45, headX + lead * hw * 1.06, headY + hh * 0.56);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      ctx.clip();
      // Trailing half steps down; the lacquer keeps its planes hard.
      ctx.fillStyle = shade(st.color, -12);
      ctx.fillRect(lead === 1 ? headX - hw * 2.6 : headX, headY - hh * 1.7, hw * 2.6, hh * 3.4);
      // The blade point's under-plane.
      ctx.fillStyle = shade(st.color, -24);
      ctx.beginPath();
      ctx.moveTo(headX - lead * hw * 0.52, headY - hh * 1.12);
      ctx.lineTo(tailX + lead * hw * 0.06, tailY - hh * 0.04);
      ctx.lineTo(headX - lead * hw * 1.02, headY - hh * 0.26);
      ctx.closePath();
      ctx.fill();
      // The crown's lit rake off the leading brow.
      ctx.fillStyle = shade(st.color, 10);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 0.94, headY - hh * 0.64);
      ctx.lineTo(headX + lead * hw * 0.4, headY - hh * 1.28);
      ctx.lineTo(headX + lead * hw * 0.58, headY - hh * 1.0);
      ctx.lineTo(headX + lead * hw * 0.98, headY - hh * 0.5);
      ctx.closePath();
      ctx.fill();
      // THE RIDGE FIN, on the TURN only: a crest is edge-on at the
      // frontal read (a wide frontal fin smears the crown — round-1
      // verdict), so it surfaces as the head turns and owns the
      // profile silhouette with the tail.
      if (t > 0.25) {
        ctx.fillStyle = shade(st.color, -18);
        ctx.beginPath();
        ctx.moveTo(headX - lead * hw * 0.08, headY - hh * 1.34);
        ctx.lineTo(headX - lead * hw * 0.52, headY - hh * 1.24);
        ctx.lineTo(tailX + lead * hw * 0.05, tailY - hh * 0.01);
        ctx.lineTo(headX - lead * hw * 0.5, headY - hh * 1.1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(st.color, 12);
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.beginPath();
        ctx.moveTo(headX - lead * hw * 0.08, headY - hh * 1.34);
        ctx.lineTo(headX - lead * hw * 0.52, headY - hh * 1.24);
        ctx.stroke();
      }
      ctx.restore();
      const gr = st.grip;
      if (front && gr) {
        // THE VOID: rim, dark, deepest corner — three planes into a
        // face that is not there.
        const vcx = headX + fx * headR * (0.3 + 0.26 * t);
        const vhw = hw * 0.68 * (1 - 0.5 * t);
        ctx.fillStyle = shade(st.color, -26);
        ctx.beginPath();
        ctx.moveTo(vcx - vhw * 1.1, headY - hh * 0.56);
        ctx.lineTo(vcx + vhw * 1.1, headY - hh * 0.56);
        ctx.lineTo(vcx + vhw * 0.94, headY + hh * 0.5);
        ctx.lineTo(vcx + vhw * 0.3, headY + hh * 0.78);
        ctx.lineTo(vcx - vhw * 0.3, headY + hh * 0.78);
        ctx.lineTo(vcx - vhw * 0.94, headY + hh * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#150e11';
        ctx.beginPath();
        ctx.moveTo(vcx - vhw * 1.0, headY - hh * 0.5);
        ctx.lineTo(vcx + vhw * 1.0, headY - hh * 0.5);
        ctx.lineTo(vcx + vhw * 0.86, headY + hh * 0.46);
        ctx.lineTo(vcx + vhw * 0.26, headY + hh * 0.72);
        ctx.lineTo(vcx - vhw * 0.26, headY + hh * 0.72);
        ctx.lineTo(vcx - vhw * 0.86, headY + hh * 0.46);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0d0809';
        ctx.beginPath();
        ctx.moveTo(vcx - lead * vhw * 0.94, headY - hh * 0.46);
        ctx.lineTo(vcx - lead * vhw * 0.24, headY - hh * 0.4);
        ctx.lineTo(vcx - lead * vhw * 0.8, headY + hh * 0.24);
        ctx.closePath();
        ctx.fill();
        // THE EMBER BLINK, in the gaps the fingers leave open at
        // the eye line.
        if (f.nowMs % 5200 < 240) {
          ctx.fillStyle = gr.ember;
          for (const [ex, ey] of [[0.26, -0.22], [-0.22, -0.24]] as const) {
            ctx.beginPath();
            ctx.arc(vcx + lead * vhw * ex, headY + hh * ey, headR * 0.05, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // THE HAND — one connected mass, and HAND proportions: a
        // big square palm low in the void, four FAT fingers rising
        // over the brow with a trailing rake, chisel tips, notches
        // that stop at the knuckle line (long thin parallel fingers
        // read as a feathered wing — the v2 verdict). The thumb
        // hooks down over the chin rim: the overhang is what makes
        // it a grip and not a decal.
        const hx = (u: number) => vcx + lead * vhw * u;
        const hy = (v: number) => headY + hh * v;
        ctx.fillStyle = gr.hand;
        ctx.beginPath();
        ctx.moveTo(hx(-0.16), hy(0.72));
        ctx.lineTo(hx(-0.44), hy(0.2));
        // Pinky — shortest, most raked.
        ctx.lineTo(hx(-0.56), hy(-0.38));
        ctx.lineTo(hx(-0.36), hy(-0.46));
        ctx.lineTo(hx(-0.26), hy(-0.04));
        // Ring.
        ctx.lineTo(hx(-0.32), hy(-0.5));
        ctx.lineTo(hx(-0.12), hy(-0.56));
        ctx.lineTo(hx(-0.04), hy(-0.06));
        // Middle — the tall one.
        ctx.lineTo(hx(-0.06), hy(-0.56));
        ctx.lineTo(hx(0.16), hy(-0.6));
        ctx.lineTo(hx(0.2), hy(-0.08));
        // Index.
        ctx.lineTo(hx(0.24), hy(-0.5));
        ctx.lineTo(hx(0.44), hy(-0.52));
        ctx.lineTo(hx(0.46), hy(0.1));
        // Palm's leading edge, then the thumb hooking DOWN over
        // the rim onto the chin band.
        ctx.lineTo(hx(0.56), hy(0.3));
        ctx.lineTo(hx(0.84), hy(0.56));
        ctx.lineTo(hx(0.66), hy(0.94));
        ctx.lineTo(hx(0.44), hy(0.76));
        ctx.closePath();
        ctx.fill();
        // The palm heel's shadowed under-plane — flat forge, two
        // values, nothing soft.
        ctx.fillStyle = gr.dark;
        ctx.beginPath();
        ctx.moveTo(hx(-0.16), hy(0.72));
        ctx.lineTo(hx(0.44), hy(0.76));
        ctx.lineTo(hx(0.48), hy(0.5));
        ctx.lineTo(hx(-0.28), hy(0.42));
        ctx.closePath();
        ctx.fill();
        // Finger grooves: three cuts from the notches down to the
        // knuckle line, so the mass bends instead of striping.
        ctx.strokeStyle = gr.dark;
        ctx.lineWidth = Math.max(1, s * 0.009);
        for (const [nu, nv] of [[-0.26, -0.04], [-0.04, -0.06], [0.2, -0.08]] as const) {
          ctx.beginPath();
          ctx.moveTo(hx(nu), hy(nv));
          ctx.lineTo(hx(nu - 0.04), hy(nv + 0.34));
          ctx.stroke();
        }
      } else if (!front) {
        // Back read: the ridge seam, and THE NAPE SEAL — blood-wax
        // pressed at the base of the skull, two cut cord ends
        // drifting under it on the slow clock.
        ctx.strokeStyle = shade(st.color, -24);
        ctx.lineWidth = Math.max(1, s * 0.011);
        ctx.beginPath();
        ctx.moveTo(headX - lead * hw * 0.06, headY - hh * 1.28);
        ctx.lineTo(headX + lead * hw * 0.04, headY + hh * 0.76);
        ctx.stroke();
        const sx3 = headX + lead * hw * 0.06;
        const sy3 = headY + hh * 0.62;
        ctx.fillStyle = st.trim;
        ctx.beginPath();
        ctx.arc(sx3, sy3, headR * 0.14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(st.trim, -20);
        ctx.beginPath();
        ctx.arc(sx3, sy3, headR * 0.07, 0, Math.PI * 2);
        ctx.fill();
        const dr3 = Math.sin(f.nowMs * 0.0012) * hw * 0.06;
        ctx.strokeStyle = shade(st.trim, -8);
        ctx.lineWidth = Math.max(1, s * 0.009);
        ctx.beginPath();
        ctx.moveTo(sx3 - hw * 0.04, sy3 + hh * 0.1);
        ctx.quadraticCurveTo(sx3 - hw * 0.08 + dr3 * 0.5, sy3 + hh * 0.3, sx3 - hw * 0.05 + dr3, sy3 + hh * 0.48);
        ctx.moveTo(sx3 + hw * 0.04, sy3 + hh * 0.1);
        ctx.quadraticCurveTo(sx3 + hw * 0.09 + dr3 * 0.4, sy3 + hh * 0.26, sx3 + hw * 0.06 + dr3 * 0.8, sy3 + hh * 0.4);
        ctx.stroke();
      }
    }
    return;
  }

  if (st.kind === 'trapperhood') {
    // THE TRAPPERHOOD — trapline's head: the deep winter hood
    // swallowed by a FULL FUR TUNNEL — a fat ruff ring framing the
    // whole face opening in lumped clusters, three values deep (dark
    // under-row, mid coat, lit crown), an antler-tine toggle closing
    // the throat. The ridge wind loses this argument.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.32 + 0.22 * t);
    const ohw = hw * 0.66 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.52;
    const oBot = headY + hh * 0.78;
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.2, headY + hh * 1.16);
      ctx.quadraticCurveTo(headX + lead * hw * 1.28, headY + hh * 0.2, headX + lead * hw * 1.1, headY - hh * 0.48);
      ctx.quadraticCurveTo(headX + lead * hw * 1.16, headY - hh * 0.84, headX + lead * hw * 0.64, headY - hh * 1.12);
      ctx.quadraticCurveTo(headX + lead * hw * 0.04, headY - hh * 1.36, headX - lead * hw * 0.56, headY - hh * 1.22);
      ctx.quadraticCurveTo(headX - lead * hw * (1.08 + t * 0.26), headY - hh * 0.9, headX - lead * hw * (1.24 + t * 0.32), headY - hh * 0.14);
      ctx.quadraticCurveTo(headX - lead * hw * (1.34 + t * 0.28), headY + hh * 0.4, headX - lead * hw * 1.26, headY + hh * 1.16);
      ctx.quadraticCurveTo(headX, headY + hh * 1.44, headX + lead * hw * 1.2, headY + hh * 1.16);
      ctx.closePath();
    };
    const opening = () => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      ctx.fillStyle = shade(st.color, -13);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 1.6, hw * 2.4, hh * 3.2);
      ctx.restore();
      if (front) {
        // The tunnel's shadow: deeper than any brim — the face
        // lives a hand back from the weather.
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        const shGrad = ctx.createLinearGradient(0, oTop, 0, headY + hh * 0.14);
        shGrad.addColorStop(0, 'rgba(24, 15, 26, 0.56)');
        shGrad.addColorStop(1, 'rgba(24, 15, 26, 0)');
        ctx.fillStyle = shGrad;
        ctx.fillRect(cx - ohw, oTop, ohw * 2, hh * 0.72);
        ctx.restore();
      }
    }
    // THE RUFF TUNNEL — structure: the fur ring is the silhouette;
    // hurt paints it white and the shape survives. Ring of lumped
    // clusters around the opening (front) or crowning the shell's
    // rim (back), dark under-row first, lit clumps on top.
    const ruffCol = st.ruff?.color ?? shade(st.trim, 34);
    const ringN = 9;
    for (const pass of [0, 1] as const) {
      for (let i = 0; i < ringN; i++) {
        const a = -Math.PI * 0.92 + (i / (ringN - 1)) * Math.PI * 1.84;
        const rx2 = front ? cx : headX;
        const ry2 = front ? (oTop + oBot) / 2 : headY - hh * 0.1;
        const rrx = (front ? ohw * 1.34 : hw * 1.06) * (1 - 0.12 * pass);
        const rry = (front ? (oBot - oTop) * 0.68 : hh * 0.92) * (1 - 0.1 * pass);
        const bx = rx2 + Math.cos(a) * rrx;
        const by = ry2 + Math.sin(a) * rry;
        // Skip only clusters whose CENTER lands inside the opening —
        // the tunnel must ring the whole face (a side-lobes-only ring
        // reads as earmuffs, the v1 verdict).
        if (
          front &&
          bx > cx - ohw * 0.62 && bx < cx + ohw * 0.62 &&
          by > oTop + (oBot - oTop) * 0.12 && by < oBot - (oBot - oTop) * 0.16
        ) continue;
        const rr = (0.085 + 0.02 * Math.sin(i * 2.7 + pass * 1.3)) * headR * (pass ? 0.82 : 1);
        ctx.fillStyle = hurt
          ? '#ffffff'
          : pass === 0
            ? shade(ruffCol, -20)
            : shade(ruffCol, i % 3 === 1 ? 14 : 2);
        ctx.beginPath();
        ctx.arc(bx + (pass ? Math.sin(i * 1.9) * headR * 0.03 : 0), by - pass * headR * 0.04, rr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (!hurt && front) {
      // The antler-tine toggle at the throat: one bone Y on a cord.
      const ty2 = oBot + headR * 0.1;
      ctx.strokeStyle = shade(st.color, -26);
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(cx - ohw * 0.5, ty2 - headR * 0.05);
      ctx.lineTo(cx + ohw * 0.5, ty2 + headR * 0.02);
      ctx.stroke();
      ctx.strokeStyle = '#d8cfae';
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1.5, s * 0.022);
      ctx.beginPath();
      ctx.moveTo(cx - headR * 0.06, ty2 + headR * 0.08);
      ctx.lineTo(cx + headR * 0.05, ty2 - headR * 0.04);
      ctx.moveTo(cx, ty2 + headR * 0.015);
      ctx.lineTo(cx + headR * 0.08, ty2 + headR * 0.06);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
    return;
  }

  if (st.kind === 'foxmantle') {
    // THE FOXMANTLE — emberfox's head: the fox worn WHOLE, a pelt
    // hood whose crown is the beast's own flattened head. The muzzle
    // juts over the brow as a foreshortened wedge ending in the nose
    // pad; swept-back ears rake the crown at a predator's angle;
    // cream cheek flashes frame the opening — and the pelt's bead
    // eyes catch ember light on a clock that owes nothing to the
    // wearer. Vanity, weaponized.
    const t = profileK;
    const front = backK <= 0.55;
    const pelt = st.pelt ?? { color: st.color, dark: shade(st.color, -40), pale: st.trim };
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.72 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.54;
    const oBot = headY + hh * 0.82;
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.22, headY + hh * 1.16);
      ctx.quadraticCurveTo(headX + lead * hw * 1.3, headY + hh * 0.2, headX + lead * hw * 1.14, headY - hh * 0.46);
      ctx.quadraticCurveTo(headX + lead * hw * 1.22, headY - hh * 0.82, headX + lead * hw * 0.72, headY - hh * 1.1);
      // The crown carries the pelt head's mass — a fuller dome than
      // a cloth hood, the animal's skull remembered.
      ctx.quadraticCurveTo(headX + lead * hw * 0.1, headY - hh * 1.4, headX - lead * hw * 0.62, headY - hh * 1.26);
      ctx.quadraticCurveTo(headX - lead * hw * (1.12 + t * 0.26), headY - hh * 0.92, headX - lead * hw * (1.26 + t * 0.34), headY - hh * 0.16);
      ctx.quadraticCurveTo(headX - lead * hw * (1.36 + t * 0.3), headY + hh * 0.4, headX - lead * hw * 1.28, headY + hh * 1.16);
      ctx.quadraticCurveTo(headX, headY + hh * 1.44, headX + lead * hw * 1.22, headY + hh * 1.16);
      ctx.closePath();
    };
    const opening = () => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
    };
    ctx.fillStyle = hurt ? '#ffffff' : pelt.color;
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      ctx.fillStyle = shade(pelt.color, -13);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 1.6, hw * 2.4, hh * 3.2);
      ctx.fillStyle = shade(pelt.color, 10);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 0.84, headY - hh * 0.96);
      ctx.quadraticCurveTo(headX + lead * hw * 0.16, headY - hh * 1.3, headX - lead * hw * 0.52, headY - hh * 1.18);
      ctx.lineTo(headX - lead * hw * 0.42, headY - hh * 0.98);
      ctx.quadraticCurveTo(headX + lead * hw * 0.18, headY - hh * 1.06, headX + lead * hw * 0.68, headY - hh * 0.74);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // THE EARS — structure: one each side, tall enough to own the
    // silhouette, swept back at the hunting angle, black-backed with
    // a pale inner blaze. A fox is its ears at forty tiles.
    for (const es of [-1, 1]) {
      const far = es !== (lead || 1);
      const wK = far ? Math.max(0.35, 1 - t * 0.6) : 1;
      const bx = headX + es * hw * 0.44;
      const by = headY - hh * 1.1;
      const ax = bx + es * hw * 0.3 * wK - lead * hw * 0.34;
      const ay = by - hh * 0.78;
      ctx.fillStyle = hurt ? '#ffffff' : far ? shade(pelt.dark, 10) : pelt.dark;
      ctx.beginPath();
      ctx.moveTo(bx - es * hw * 0.3 * wK, by + hh * 0.1);
      ctx.lineTo(ax, ay);
      ctx.lineTo(bx + es * hw * 0.34 * wK, by + hh * 0.16);
      ctx.closePath();
      ctx.fill();
      if (!hurt && !far && front) {
        ctx.fillStyle = pelt.pale;
        ctx.beginPath();
        ctx.moveTo(bx - es * hw * 0.12 * wK, by + hh * 0.08);
        ctx.lineTo(ax - es * hw * 0.04, ay + hh * 0.22);
        ctx.lineTo(bx + es * hw * 0.16 * wK, by + hh * 0.12);
        ctx.closePath();
        ctx.fill();
      }
    }
    // THE MUZZLE — structure: the foreshortened snout wedge over the
    // brow, nose pad at its tip. The fox looks where you look.
    const mzRootW = ohw * 0.66;
    const mzTipX = cx + lead * ohw * 0.2;
    const mzTipY = oTop + hh * 0.18;
    if (front || backK <= 0.8) {
      ctx.fillStyle = hurt ? '#ffffff' : shade(pelt.color, 6);
      ctx.beginPath();
      ctx.moveTo(cx - mzRootW, headY - hh * 1.06);
      ctx.quadraticCurveTo(cx - mzRootW * 0.5, headY - hh * 1.2, cx + lead * hw * 0.08, headY - hh * 1.18);
      ctx.quadraticCurveTo(cx + mzRootW * 0.6, headY - hh * 1.16, cx + mzRootW, headY - hh * 1.02);
      ctx.lineTo(mzTipX + headR * 0.09, mzTipY);
      ctx.quadraticCurveTo(mzTipX, mzTipY + headR * 0.07, mzTipX - headR * 0.09, mzTipY);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        // The muzzle's shaded side plane — a wedge, not a sticker.
        ctx.fillStyle = shade(pelt.color, -12);
        ctx.beginPath();
        ctx.moveTo(cx - mzRootW, headY - hh * 1.06);
        ctx.lineTo(mzTipX - headR * 0.09, mzTipY);
        ctx.lineTo(mzTipX - headR * 0.02, mzTipY - hh * 0.1);
        ctx.lineTo(cx - mzRootW * 0.55, headY - hh * 0.98);
        ctx.closePath();
        ctx.fill();
        // Nose pad — big enough to anchor the muzzle at distance.
        ctx.fillStyle = pelt.dark;
        ctx.beginPath();
        ctx.arc(mzTipX, mzTipY, headR * 0.085, 0, Math.PI * 2);
        ctx.fill();
        // THE PELT'S EYES: two ember beads on the muzzle sides,
        // waking on a slow clock — the fox does the looking.
        if (pelt.ember && front) {
          const wake = 0.35 + 0.65 * Math.max(0, Math.sin(f.nowMs * 0.0009));
          for (const es of [-1, 1]) {
            ctx.globalAlpha = 0.4 * wake;
            ctx.fillStyle = pelt.ember;
            ctx.beginPath();
            ctx.arc(cx + es * mzRootW * 0.52, headY - hh * 0.86, headR * 0.06, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 0.9 * wake;
            ctx.fillStyle = shade(pelt.ember, 28);
            ctx.beginPath();
            ctx.arc(cx + es * mzRootW * 0.52, headY - hh * 0.86, headR * 0.028, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      }
    }
    if (!hurt) {
      if (front) {
        // The muzzle's own overhang shadow, then the cheek flashes.
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        const shGrad = ctx.createLinearGradient(0, oTop, 0, headY + hh * 0.06);
        shGrad.addColorStop(0, 'rgba(24, 15, 26, 0.5)');
        shGrad.addColorStop(1, 'rgba(24, 15, 26, 0)');
        ctx.fillStyle = shGrad;
        ctx.fillRect(cx - ohw, oTop, ohw * 2, hh * 0.62);
        ctx.restore();
        // Cheek flashes: two narrow pale crescents hugging the jaw
        // line — a marking, not a beard.
        ctx.fillStyle = pelt.pale;
        for (const es of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(cx + es * ohw * 1.0, headY - hh * 0.06);
          ctx.quadraticCurveTo(cx + es * ohw * 1.16, headY + hh * 0.26, cx + es * ohw * 0.94, headY + hh * 0.48);
          ctx.quadraticCurveTo(cx + es * ohw * 0.88, headY + hh * 0.22, cx + es * ohw * 0.9, headY);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        // Back: the pelt's spine stripe runs crown to drape — the
        // animal's back worn down yours.
        ctx.fillStyle = shade(pelt.color, -10);
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.36, headY + hh * 0.9);
        ctx.lineTo(headX + hw * 0.36, headY + hh * 0.9);
        ctx.lineTo(headX + lead * hw * 0.1, headY + hh * 1.92);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(pelt.dark, 16);
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.09, headY - hh * 1.3);
        ctx.lineTo(headX + hw * 0.09, headY - hh * 1.3);
        ctx.lineTo(headX + lead * hw * 0.14 + hw * 0.06, headY + hh * 1.55);
        ctx.lineTo(headX + lead * hw * 0.14 - hw * 0.06, headY + hh * 1.55);
        ctx.closePath();
        ctx.fill();
      }
    }
    return;
  }

  if (st.kind === 'roadhood') {
    // THE ROADHOOD — wayfarer's head: the traveler's hood grown
    // honest with miles. A patched crown, stitch ticks down the
    // brim, a throat cord with its wooden toggle — and the redtail
    // feather worn BIG: a banded hawk primary slanted off the
    // temple, cream bars and a dark tip. The long road, worn openly.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.72 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.58;
    const oBot = headY + hh * 0.84;
    const sway = Math.sin(f.nowMs * 0.0016) * hw * 0.05;
    const apexX = headX - lead * hw * 0.34;
    const apexY = headY - hh * 1.46;
    const tipX = headX - lead * (hw * (1.3 + t * 0.5) + sway);
    const tipY = headY - hh * 0.88 + sway * 0.4;
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.24, headY + hh * 1.18);
      ctx.quadraticCurveTo(headX + lead * hw * 1.32, headY + hh * 0.2, headX + lead * hw * 1.16, headY - hh * 0.48);
      ctx.quadraticCurveTo(headX + lead * hw * 1.24, headY - hh * 0.84, headX + lead * hw * 0.8, headY - hh * 1.14);
      ctx.quadraticCurveTo(headX + lead * hw * 0.3, headY - hh * 1.4, apexX, apexY);
      ctx.quadraticCurveTo(headX - lead * hw * 0.94, apexY + hh * 0.04, tipX, tipY);
      ctx.quadraticCurveTo(headX - lead * hw * (0.98 + t * 0.26), headY - hh * 0.52, headX - lead * hw * (1.24 + t * 0.36), headY - hh * 0.18);
      ctx.quadraticCurveTo(headX - lead * hw * (1.38 + t * 0.32), headY + hh * 0.36, headX - lead * hw * 1.32, headY + hh * 1.18);
      ctx.quadraticCurveTo(headX, headY + hh * 1.48, headX + lead * hw * 1.24, headY + hh * 1.18);
      ctx.closePath();
    };
    const opening = () => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      ctx.fillStyle = shade(st.color, -13);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 1.6, hw * 2.4, hh * 3.2);
      ctx.fillStyle = shade(st.color, 10);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 0.76, headY - hh * 1.02);
      ctx.quadraticCurveTo(headX + lead * hw * 0.22, headY - hh * 1.34, apexX + lead * hw * 0.12, apexY + hh * 0.12);
      ctx.lineTo(apexX + lead * hw * 0.2, apexY + hh * 0.3);
      ctx.quadraticCurveTo(headX + lead * hw * 0.2, headY - hh * 1.1, headX + lead * hw * 0.6, headY - hh * 0.8);
      ctx.closePath();
      ctx.fill();
      // THE PATCH: squared, askew, stitched — pride in the mending.
      const pCol = shade(st.trim, 22);
      ctx.save();
      ctx.translate(headX - lead * hw * 0.3, headY - hh * 1.02);
      ctx.rotate(-lead * 0.18);
      ctx.fillStyle = pCol;
      ctx.fillRect(-hw * 0.26, -hh * 0.2, hw * 0.52, hh * 0.4);
      ctx.strokeStyle = shade(pCol, -26);
      ctx.lineWidth = Math.max(1, s * 0.009);
      for (const [x0, y0, x1, y1] of [
        [-hw * 0.26, -hh * 0.08, -hw * 0.18, -hh * 0.08],
        [hw * 0.18, hh * 0.04, hw * 0.26, hh * 0.04],
        [-hw * 0.06, -hh * 0.2, -hw * 0.06, -hh * 0.12],
      ] as const) {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      ctx.restore();
      ctx.restore();
      if (front) {
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        const shGrad = ctx.createLinearGradient(0, oTop, 0, headY + hh * 0.04);
        shGrad.addColorStop(0, 'rgba(24, 15, 26, 0.46)');
        shGrad.addColorStop(1, 'rgba(24, 15, 26, 0)');
        ctx.fillStyle = shGrad;
        ctx.fillRect(cx - ohw, oTop, ohw * 2, hh * 0.62);
        ctx.restore();
        // Stitch ticks down the brim's leading edge.
        ctx.strokeStyle = shade(st.color, -24);
        ctx.lineWidth = Math.max(1, s * 0.009);
        ctx.setLineDash([s * 0.014, s * 0.013]);
        ctx.beginPath();
        ctx.moveTo(cx + ohw + s * 0.012, oTop + hh * 0.1);
        ctx.lineTo(cx + ohw + s * 0.012, oBot - hh * 0.1);
        ctx.stroke();
        ctx.setLineDash([]);
        // The throat cord and its wooden toggle.
        ctx.strokeStyle = shade(st.trim, -8);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(cx - ohw * 0.6, oBot + headR * 0.06);
        ctx.quadraticCurveTo(cx, oBot + headR * 0.16, cx + ohw * 0.6, oBot + headR * 0.06);
        ctx.stroke();
        ctx.fillStyle = shade(st.trim, -18);
        ctx.save();
        ctx.translate(cx, oBot + headR * 0.14);
        ctx.rotate(0.5);
        ctx.fillRect(-headR * 0.02, -headR * 0.07, headR * 0.04, headR * 0.14);
        ctx.restore();
        // THE HAWK FEATHER: one big banded primary off the temple.
        if (st.feather) {
          // Worn BIG: the feather is the wayfarer's banner, not a
          // pin — it clears the crown and reads at forty tiles.
          const fx2 = cx + lead * ohw * 0.94;
          const fy2 = oTop - headR * 0.02;
          const fTipX = fx2 - lead * hw * 1.45;
          const fTipY = fy2 - hh * 1.3;
          const vane = (): void => {
            ctx.moveTo(fx2, fy2);
            ctx.quadraticCurveTo(fx2 - lead * hw * 0.75, fy2 - hh * 0.28, fTipX, fTipY);
            ctx.quadraticCurveTo(fTipX + lead * hw * 0.55, fTipY + hh * 0.62, fx2 - lead * hw * 0.06, fy2 + hh * 0.26);
            ctx.closePath();
          };
          ctx.fillStyle = st.feather.color;
          ctx.beginPath();
          vane();
          ctx.fill();
          // Cream bars — the redtail's ledger. Clipped to the vane.
          ctx.save();
          ctx.beginPath();
          vane();
          ctx.clip();
          ctx.fillStyle = '#e8dcc0';
          for (const k of [0.3, 0.55]) {
            const bx2 = fx2 + (fTipX - fx2) * k;
            const by2 = fy2 + (fTipY - fy2) * k;
            ctx.save();
            ctx.translate(bx2, by2);
            ctx.rotate(lead * 0.65);
            ctx.fillRect(-hw * 0.3, -hh * 0.05, hw * 0.6, hh * 0.1);
            ctx.restore();
          }
          // Dark tip.
          ctx.fillStyle = shade(st.feather.color, -34);
          ctx.beginPath();
          ctx.arc(fTipX, fTipY, headR * 0.16, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          // The spine.
          ctx.strokeStyle = shade(st.feather.color, 26);
          ctx.lineWidth = Math.max(1, s * 0.01);
          ctx.beginPath();
          ctx.moveTo(fx2 - lead * hw * 0.04, fy2);
          ctx.quadraticCurveTo(fx2 - lead * hw * 0.5, fy2 - hh * 0.3, fTipX + lead * hw * 0.08, fTipY + hh * 0.08);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = shade(st.color, -10);
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.36, headY + hh * 0.9);
        ctx.lineTo(headX + hw * 0.36, headY + hh * 0.9);
        ctx.lineTo(headX + lead * hw * 0.1, headY + hh * 1.95);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(st.color, -22);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(headX, headY - hh * 1.05);
        ctx.lineTo(headX + lead * hw * 0.08, headY + hh * 0.85);
        ctx.stroke();
      }
    }
    return;
  }

  if (st.kind === 'wolfmantle') {
    // THE WOLFMANTLE — wolfstalker's head: the headdress. The wolf's
    // upper muzzle rides the brow as a visor — grey wedge, dark nose,
    // hollow sockets, and a FANG ROW breaking white over the wearer's
    // shadowed face. Ears lie back on the crown; the mane cascades
    // down the trailing side in three depths of winter coat. Every
    // few breaths, cold air curls out from under the jaw that isn't
    // yours. The pack made room.
    const t = profileK;
    const front = backK <= 0.55;
    const pelt = st.pelt ?? { color: shade(st.color, 20), dark: shade(st.color, -30), pale: shade(st.color, 44) };
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.72 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.5;
    const oBot = headY + hh * 0.82;
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.22, headY + hh * 1.16);
      ctx.quadraticCurveTo(headX + lead * hw * 1.3, headY + hh * 0.2, headX + lead * hw * 1.14, headY - hh * 0.42);
      ctx.quadraticCurveTo(headX + lead * hw * 1.2, headY - hh * 0.78, headX + lead * hw * 0.74, headY - hh * 1.08);
      ctx.quadraticCurveTo(headX + lead * hw * 0.12, headY - hh * 1.38, headX - lead * hw * 0.6, headY - hh * 1.26);
      ctx.quadraticCurveTo(headX - lead * hw * (1.1 + t * 0.26), headY - hh * 0.94, headX - lead * hw * (1.26 + t * 0.34), headY - hh * 0.16);
      ctx.quadraticCurveTo(headX - lead * hw * (1.38 + t * 0.3), headY + hh * 0.4, headX - lead * hw * 1.3, headY + hh * 1.16);
      ctx.quadraticCurveTo(headX, headY + hh * 1.46, headX + lead * hw * 1.22, headY + hh * 1.16);
      ctx.closePath();
    };
    const opening = () => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      ctx.fillStyle = shade(st.color, -13);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 1.6, hw * 2.4, hh * 3.2);
      ctx.restore();
    }
    // THE MANE — structure: three depths of winter coat cascading
    // off the trailing crown, shoulder-bound. Painted dark→pale.
    const maneTones = hurt
      ? ['#ffffff', '#ffffff', '#ffffff']
      : [shade(pelt.color, -26), shade(pelt.color, -8), pelt.pale];
    for (let layer = 0; layer < 3; layer++) {
      const spread = 1 - layer * 0.22;
      const drop = 0.5 + layer * 0.16;
      ctx.fillStyle = maneTones[layer]!;
      ctx.beginPath();
      ctx.moveTo(headX - lead * hw * 0.2, headY - hh * (1.3 - layer * 0.08));
      ctx.quadraticCurveTo(
        headX - lead * hw * (1.5 * spread), headY - hh * (0.9 - layer * 0.12),
        headX - lead * hw * (1.62 * spread), headY + hh * (drop - 0.3),
      );
      // The hem breaks into fur points, not a smooth hem.
      for (let k2 = 0; k2 < 3; k2++) {
        const u2 = k2 / 2;
        const px3 = headX - lead * hw * (1.58 * spread - u2 * 1.0 * spread);
        const py3 = headY + hh * (drop - 0.1 + 0.12 * Math.sin(k2 * 2.4 + layer));
        ctx.lineTo(px3, py3 + hh * 0.14);
        ctx.lineTo(px3 + lead * hw * 0.16 * spread, py3 - hh * 0.04);
      }
      ctx.quadraticCurveTo(headX - lead * hw * 0.16, headY + hh * (drop * 0.5), headX - lead * hw * 0.1, headY - hh * 0.4);
      ctx.closePath();
      ctx.fill();
    }
    // THE MUZZLE VISOR — structure: the wolf's upper jaw over the
    // brow. Wedge, nose, sockets, fangs.
    const mzTipX = cx + lead * ohw * 0.3;
    const mzTipY = oTop + hh * 0.14;
    ctx.fillStyle = hurt ? '#ffffff' : pelt.color;
    ctx.beginPath();
    ctx.moveTo(cx - ohw * 0.88, headY - hh * 1.02);
    ctx.quadraticCurveTo(cx - ohw * 0.3, headY - hh * 1.24, cx + lead * hw * 0.14, headY - hh * 1.2);
    ctx.quadraticCurveTo(cx + ohw * 0.7, headY - hh * 1.14, cx + ohw * 0.96, headY - hh * 0.96);
    ctx.lineTo(mzTipX + headR * 0.12, mzTipY);
    ctx.quadraticCurveTo(mzTipX, mzTipY + headR * 0.08, mzTipX - headR * 0.12, mzTipY);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // The side plane in shadow — the skull's own depth.
      ctx.fillStyle = shade(pelt.color, -14);
      ctx.beginPath();
      ctx.moveTo(cx - ohw * 0.88, headY - hh * 1.02);
      ctx.lineTo(mzTipX - headR * 0.12, mzTipY);
      ctx.lineTo(mzTipX - headR * 0.04, mzTipY - hh * 0.12);
      ctx.lineTo(cx - ohw * 0.5, headY - hh * 0.94);
      ctx.closePath();
      ctx.fill();
      // Hollow sockets: the wolf's eyes are GONE — two dark wedges.
      ctx.fillStyle = pelt.dark;
      for (const es of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + es * ohw * 0.52, headY - hh * 1.0);
        ctx.lineTo(cx + es * ohw * 0.28, headY - hh * 0.88);
        ctx.lineTo(cx + es * ohw * 0.56, headY - hh * 0.82);
        ctx.closePath();
        ctx.fill();
      }
      // Nose pad at the wedge tip.
      ctx.fillStyle = pelt.dark;
      ctx.beginPath();
      ctx.arc(mzTipX, mzTipY - headR * 0.01, headR * 0.07, 0, Math.PI * 2);
      ctx.fill();
      // THE FANG ROW: white breaks along the visor's under-edge —
      // the snarl the wearer stands behind.
      if (front) {
        ctx.fillStyle = pelt.pale;
        for (let i = 0; i < 4; i++) {
          const u2 = -0.62 + i * 0.42;
          const fx3 = cx + u2 * ohw;
          const fy3 = mzTipY + headR * 0.02 + Math.abs(u2) * headR * 0.05;
          const big = i === 0 || i === 3;
          ctx.beginPath();
          ctx.moveTo(fx3 - headR * 0.045, fy3);
          ctx.lineTo(fx3 + headR * 0.045, fy3);
          ctx.lineTo(fx3, fy3 + headR * (big ? 0.16 : 0.1));
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    // The ears: laid BACK on the crown — a wolf that has decided.
    for (const far of [true, false]) {
      const wK = far ? Math.max(0.3, 1 - t * 0.65) : 1;
      const bx = headX - lead * hw * (far ? 0.66 : 0.34);
      const by = headY - hh * (far ? 1.14 : 1.2);
      ctx.fillStyle = hurt ? '#ffffff' : far ? shade(pelt.color, -18) : shade(pelt.color, -6);
      ctx.beginPath();
      ctx.moveTo(bx + lead * hw * 0.16 * wK, by + hh * 0.04);
      ctx.lineTo(bx - lead * hw * 0.3 * wK, by - hh * 0.3);
      ctx.lineTo(bx - lead * hw * 0.34 * wK, by + hh * 0.12);
      ctx.closePath();
      ctx.fill();
    }
    if (!hurt) {
      if (front) {
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        const shGrad = ctx.createLinearGradient(0, oTop, 0, headY + hh * 0.12);
        shGrad.addColorStop(0, 'rgba(24, 15, 26, 0.54)');
        shGrad.addColorStop(1, 'rgba(24, 15, 26, 0)');
        ctx.fillStyle = shGrad;
        ctx.fillRect(cx - ohw, oTop, ohw * 2, hh * 0.7);
        ctx.restore();
        // FROSTBREATH: a slow pale curl from under the muzzle — the
        // winter worn honestly. One breath every ~3.2s, drifting
        // down-lead and dying.
        if (st.frostbreath) {
          const p = (f.nowMs % 3200) / 3200;
          if (p < 0.55) {
            const bp = p / 0.55;
            const bx2 = mzTipX + lead * headR * (0.1 + bp * 0.5);
            const by2 = mzTipY + headR * (0.16 + bp * 0.3);
            ctx.globalAlpha = (1 - bp) * 0.45;
            ctx.fillStyle = st.frostbreath.color;
            ctx.beginPath();
            ctx.ellipse(bx2, by2, headR * (0.06 + bp * 0.14), headR * (0.04 + bp * 0.08), lead * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
      } else {
        // Back: THE PELT FALL — the mane owns the back of the hood,
        // fur rows breaking over the drape.
        ctx.fillStyle = shade(pelt.color, -10);
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.6, headY - hh * 0.2);
        for (let i = 0; i < 4; i++) {
          const u2 = -0.6 + i * 0.4;
          ctx.lineTo(headX + hw * u2 + hw * 0.2, headY + hh * (1.5 + 0.14 * Math.sin(i * 2.1)));
          ctx.lineTo(headX + hw * (u2 + 0.3), headY + hh * 1.16);
        }
        ctx.lineTo(headX + hw * 0.6, headY - hh * 0.2);
        ctx.quadraticCurveTo(headX, headY - hh * 0.5, headX - hw * 0.6, headY - hh * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = pelt.pale;
        for (let i = 0; i < 3; i++) {
          const u2 = -0.42 + i * 0.42;
          ctx.beginPath();
          ctx.arc(headX + hw * u2, headY + hh * (0.3 + 0.1 * Math.sin(i * 2.6)), hw * 0.16, Math.PI, Math.PI * 2);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    return;
  }

  if (st.kind === 'shadowcowl') {
    // THE SHADOWCOWL — nightveil's head: the assassin's dark. The
    // longest point in the wardrobe sweeps back past the nape like a
    // blade at rest; the face opening holds NIGHT — deeper than any
    // brim shadow, the half-mask's sheen the only admission anyone
    // is home. ONE violet arris light runs the leading fold: the one
    // bright edge the dark is allowed. What it keeps, it keeps.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.7 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.56;
    const oBot = headY + hh * 0.82;
    const sway = Math.sin(f.nowMs * 0.0011) * hw * 0.05;
    const apexX = headX - lead * hw * 0.2;
    const apexY = headY - hh * 1.5;
    const tipX = headX - lead * (hw * (1.9 + t * 0.5) + sway);
    const tipY = headY + hh * (0.05 + t * 0.05) + sway * 0.5;
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.2, headY + hh * 1.16);
      ctx.quadraticCurveTo(headX + lead * hw * 1.28, headY + hh * 0.2, headX + lead * hw * 1.12, headY - hh * 0.48);
      // A knife-straight leading edge up to the brow.
      ctx.lineTo(headX + lead * hw * 0.94, headY - hh * 1.08);
      ctx.quadraticCurveTo(headX + lead * hw * 0.4, headY - hh * 1.44, apexX, apexY);
      // THE BLADE POINT: one long sweep past the nape, angular.
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(headX - lead * hw * (1.18 + t * 0.26), headY - hh * 0.1);
      ctx.quadraticCurveTo(headX - lead * hw * (1.3 + t * 0.28), headY + hh * 0.42, headX - lead * hw * 1.26, headY + hh * 1.16);
      ctx.quadraticCurveTo(headX, headY + hh * 1.44, headX + lead * hw * 1.2, headY + hh * 1.16);
      ctx.closePath();
    };
    const opening = () => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      ctx.fillStyle = shade(st.color, -13);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 1.6, hw * 2.4, hh * 3.2);
      // The blade point's under-fold: a deeper plane, no curve.
      ctx.fillStyle = shade(st.color, -22);
      ctx.beginPath();
      ctx.moveTo(apexX, apexY + hh * 0.1);
      ctx.lineTo(tipX + lead * hw * 0.12, tipY - hh * 0.03);
      ctx.lineTo(headX - lead * hw * 1.1, headY - hh * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // THE ONE BRIGHT EDGE: the violet arris down the leading fold.
      if (st.edgelight) {
        // The arris runs brow to apex AND down the blade point — one
        // continuous lit fold, with a soft halo pass so the dark set
        // still owns a presence at distance.
        ctx.strokeStyle = st.edgelight.color;
        ctx.lineWidth = Math.max(1.5, s * 0.018);
        ctx.beginPath();
        ctx.moveTo(headX + lead * hw * 0.92, headY - hh * 1.06);
        ctx.quadraticCurveTo(headX + lead * hw * 0.4, headY - hh * 1.4, apexX, apexY);
        ctx.lineTo(tipX + lead * hw * 0.24, tipY - hh * 0.04);
        ctx.stroke();
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = Math.max(3, s * 0.044);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (front) {
        // NIGHT IN THE OPENING: a flat dark that no face detail
        // survives — then the mask's one sheen line below the eyes.
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        ctx.fillStyle = 'rgba(16, 11, 22, 0.62)';
        ctx.fillRect(cx - ohw, oTop, ohw * 2, oBot - oTop);
        if (st.mask) {
          ctx.fillStyle = st.mask;
          ctx.fillRect(cx - ohw, headY - hh * 0.02, ohw * 2, oBot - (headY - hh * 0.02));
          ctx.strokeStyle = shade(st.mask, 20);
          ctx.lineWidth = Math.max(1, s * 0.012);
          ctx.beginPath();
          ctx.moveTo(cx - ohw * 0.72, headY + hh * 0.12);
          ctx.quadraticCurveTo(cx, headY + hh * 0.02, cx + ohw * 0.72, headY + hh * 0.12);
          ctx.stroke();
        }
        ctx.restore();
      } else {
        ctx.fillStyle = shade(st.color, -10);
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.34, headY + hh * 0.9);
        ctx.lineTo(headX + hw * 0.34, headY + hh * 0.9);
        ctx.lineTo(headX + lead * hw * 0.08, headY + hh * 1.9);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(st.color, -24);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(headX, headY - hh * 1.1);
        ctx.lineTo(headX + lead * hw * 0.06, headY + hh * 0.85);
        ctx.stroke();
      }
      // Twin scarf ends off the point, drifting on the cowl's clock.
      const scCol = shade(st.color, -6);
      for (const [ph, len] of [[0, 0.5], [1.7, 0.34]] as const) {
        const drift = Math.sin(f.nowMs * 0.0011 + ph) * hw * 0.14;
        ctx.fillStyle = scCol;
        ctx.beginPath();
        ctx.moveTo(tipX + lead * hw * 0.1, tipY);
        ctx.quadraticCurveTo(
          tipX - lead * hw * 0.22 + drift * 0.5, tipY + hh * len * 0.6,
          tipX - lead * hw * 0.12 + drift, tipY + hh * len,
        );
        ctx.lineTo(tipX + lead * hw * 0.02 + drift, tipY + hh * (len - 0.14));
        ctx.closePath();
        ctx.fill();
      }
    }
    return;
  }

  if (st.kind === 'stagcrown') {
    // THE STAGCROWN — stagheart's head: the wilds crown their own.
    // Bark leather hood under a moss band — and above it the CROWN:
    // two great antler beams swept up and back, three tines each,
    // built as FILLED two-plane bone (never strokes — the flat forge
    // law), gold collars wrapping the roots. The far beam narrows at
    // profile like every honest fin. Structure: hurt white keeps the
    // whole crown's silhouette.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.72 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.56;
    const oBot = headY + hh * 0.84;
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.24, headY + hh * 1.18);
      ctx.quadraticCurveTo(headX + lead * hw * 1.32, headY + hh * 0.2, headX + lead * hw * 1.14, headY - hh * 0.5);
      ctx.quadraticCurveTo(headX + lead * hw * 1.22, headY - hh * 0.86, headX + lead * hw * 0.72, headY - hh * 1.14);
      ctx.quadraticCurveTo(headX + lead * hw * 0.08, headY - hh * 1.38, headX - lead * hw * 0.6, headY - hh * 1.24);
      ctx.quadraticCurveTo(headX - lead * hw * (1.1 + t * 0.26), headY - hh * 0.9, headX - lead * hw * (1.26 + t * 0.34), headY - hh * 0.14);
      ctx.quadraticCurveTo(headX - lead * hw * (1.36 + t * 0.3), headY + hh * 0.4, headX - lead * hw * 1.3, headY + hh * 1.18);
      ctx.quadraticCurveTo(headX, headY + hh * 1.46, headX + lead * hw * 1.24, headY + hh * 1.18);
      ctx.closePath();
    };
    const opening = () => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
    };
    // THE ANTLERS first (behind the shell crown), far beam then near.
    const bone = st.antlers?.color ?? '#e6e0d0';
    for (const far of [true, false]) {
      const es = far ? -1 : 1;
      const eLead = es * (lead || 1);
      const wK = far ? Math.max(0.32, 1 - t * 0.62) : 1;
      const rootX = headX + eLead * hw * 0.56;
      const rootY = headY - hh * 1.02;
      // The beam: a filled tapered polygon sweeping up-out-back,
      // with three tines forking forward off its outer curve.
      const beam = (colr: string, inset: number): void => {
        // ROYAL SCALE: the crown must out-silhouette the head itself
        // — an endgame device is an assembly, never a token. Beams
        // sweep past two head-heights; four tines climb each one.
        const w0 = hw * (0.22 - inset * 0.07) * wK;
        const w1 = hw * (0.08 - inset * 0.03) * wK;
        const midX = rootX + eLead * hw * 0.95 * wK;
        const midY = rootY - hh * 1.0;
        const endX = rootX + eLead * hw * 1.95 * wK;
        const endY = rootY - hh * 2.15;
        ctx.fillStyle = colr;
        ctx.beginPath();
        ctx.moveTo(rootX - eLead * w0, rootY + inset * hh * 0.02);
        ctx.quadraticCurveTo(midX - eLead * w0 * 1.15, midY, endX - eLead * w1, endY + hh * 0.07);
        // The crown tine forks at the very tip.
        ctx.lineTo(endX + eLead * w1 * 0.5, endY - hh * 0.1);
        ctx.lineTo(endX - eLead * hw * 0.06 * wK, endY - hh * 0.02);
        // Three brow/bay tines climbing the outer curve, each a bold
        // forward hook with real width.
        ctx.lineTo(midX + eLead * hw * 0.62 * wK, midY - hh * 0.94);
        ctx.lineTo(midX + eLead * hw * 0.36 * wK, midY - hh * 0.34);
        ctx.lineTo(midX + eLead * hw * 0.86 * wK, midY - hh * 0.5);
        ctx.lineTo(midX + eLead * hw * 0.44 * wK, midY + hh * 0.02);
        ctx.lineTo(rootX + eLead * hw * 0.56 * wK, rootY - hh * 0.62);
        ctx.lineTo(rootX + eLead * hw * 0.32 * wK, rootY - hh * 0.12);
        ctx.quadraticCurveTo(rootX + eLead * w0 * 1.1, rootY + hh * 0.02, rootX + eLead * w0, rootY + hh * 0.06);
        ctx.closePath();
        ctx.fill();
      };
      beam(hurt ? '#ffffff' : far ? shade(bone, -18) : bone, 0);
      if (!hurt && !far) {
        // The under-facet: one darker plane inside the beam — depth
        // as a second fill, never a stroked ridge.
        beam(shade(bone, -12), 1);
        beam(bone, 2);
      }
      if (!hurt) {
        // The gold collar at the root: two flat bands.
        ctx.fillStyle = st.trim;
        ctx.save();
        ctx.translate(rootX, rootY - hh * 0.02);
        ctx.rotate(eLead * -0.5);
        ctx.fillRect(-hw * 0.14 * wK, -hh * 0.03, hw * 0.28 * wK, hh * 0.075);
        ctx.fillRect(-hw * 0.12 * wK, hh * 0.09, hw * 0.24 * wK, hh * 0.06);
        ctx.restore();
      }
    }
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      ctx.fillStyle = shade(st.color, -13);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 1.6, hw * 2.4, hh * 3.2);
      ctx.fillStyle = shade(st.color, 9);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 0.8, headY - hh * 1.0);
      ctx.quadraticCurveTo(headX + lead * hw * 0.14, headY - hh * 1.3, headX - lead * hw * 0.52, headY - hh * 1.16);
      ctx.lineTo(headX - lead * hw * 0.44, headY - hh * 0.96);
      ctx.quadraticCurveTo(headX + lead * hw * 0.16, headY - hh * 1.04, headX + lead * hw * 0.64, headY - hh * 0.78);
      ctx.closePath();
      ctx.fill();
      // THE MOSS BAND: the living ring below the antler roots —
      // a flat band with growth bumps breaking its lower edge.
      if (st.mossband) {
        ctx.fillStyle = st.mossband.color;
        ctx.beginPath();
        ctx.moveTo(headX - hw * 1.04, headY - hh * 0.78);
        ctx.quadraticCurveTo(headX, headY - hh * 1.02, headX + hw * 1.04, headY - hh * 0.78);
        ctx.lineTo(headX + hw * 1.0, headY - hh * 0.6);
        ctx.quadraticCurveTo(headX, headY - hh * 0.84, headX - hw * 1.0, headY - hh * 0.6);
        ctx.closePath();
        ctx.fill();
        for (let i = 0; i < 5; i++) {
          const u2 = -0.8 + i * 0.4;
          ctx.beginPath();
          ctx.arc(headX + hw * u2, headY - hh * (0.62 - 0.16 * Math.abs(u2)), hw * (0.08 + 0.02 * Math.sin(i * 2.2)), 0, Math.PI);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
      if (front) {
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        const shGrad = ctx.createLinearGradient(0, oTop, 0, headY + hh * 0.04);
        shGrad.addColorStop(0, 'rgba(24, 15, 26, 0.46)');
        shGrad.addColorStop(1, 'rgba(24, 15, 26, 0)');
        ctx.fillStyle = shGrad;
        ctx.fillRect(cx - ohw, oTop, ohw * 2, hh * 0.6);
        ctx.restore();
        ctx.strokeStyle = shade(st.color, 16);
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        opening();
        ctx.stroke();
      } else {
        ctx.fillStyle = shade(st.color, -10);
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.36, headY + hh * 0.9);
        ctx.lineTo(headX + hw * 0.36, headY + hh * 0.9);
        ctx.lineTo(headX + lead * hw * 0.08, headY + hh * 1.92);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(st.color, -22);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(headX, headY - hh * 1.02);
        ctx.lineTo(headX + lead * hw * 0.08, headY + hh * 0.85);
        ctx.stroke();
      }
    }
    return;
  }

  // ============================ THE FOUR VIGILS OF THE DAWN =========
  // Each dawnsworn sky wears its OWN head now — four one-owner kinds,
  // no shared shell. The daybreak clock still runs through all four;
  // the garment around it is what changed. The reference laws:
  // TRIANGLE over dome, the face KEPT in mystery, the brow line
  // covering the eyes, the opening FRAMED like a shrine door.

  if (st.kind === 'orisoncowl') {
    // THE ORISON COWL — the rising sun's cowl: a tall TRIANGULAR
    // cowl cut like a candle flame, planar sides climbing straight
    // to a single back-hooked point. The face opening runs deep and
    // narrow, FRAMED in a gold border with collar bosses — a shrine
    // door — and the sun rises INSIDE it: a small disc climbing the
    // inner brow on the daybreak clock, waxing the dark warm from
    // within. Mystery first; the light earns its way out.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.68 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.56;
    const oBot = headY + hh * 0.9;
    const sway = Math.sin(f.nowMs * 0.0014) * hw * 0.03;
    const apexX = headX - lead * hw * (0.22 + t * 0.12) + sway;
    const apexY = headY - hh * 1.52;
    const shell = () => {
      // The refined triangle: fitted to the skull, the peak toned
      // back from a spire to a leaning crest — mystery over height.
      ctx.moveTo(headX + lead * hw * 1.22, headY + hh * 1.16);
      ctx.quadraticCurveTo(headX + lead * hw * 1.3, headY + hh * 0.1, headX + lead * hw * 1.02, headY - hh * 0.62);
      // The leading flank hugs the crown on its way up.
      ctx.quadraticCurveTo(headX + lead * hw * 0.66, headY - hh * 1.14, apexX + lead * hw * 0.12, apexY + hh * 0.08);
      // The hook: a soft lean, no longer a lick of flame.
      ctx.quadraticCurveTo(apexX - lead * hw * 0.03, apexY - hh * 0.06, apexX - lead * hw * 0.22, apexY + hh * 0.08);
      // The trailing flank: a close fall into the drape.
      ctx.quadraticCurveTo(headX - lead * hw * (0.86 + t * 0.22), headY - hh * 0.78, headX - lead * hw * (1.12 + t * 0.3), headY - hh * 0.08);
      ctx.quadraticCurveTo(headX - lead * hw * (1.26 + t * 0.28), headY + hh * 0.42, headX - lead * hw * 1.24, headY + hh * 1.16);
      ctx.quadraticCurveTo(headX, headY + hh * 1.46, headX + lead * hw * 1.22, headY + hh * 1.16);
      ctx.closePath();
    };
    const opening = () => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.7);
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      const dayK = daybreakK(f.nowMs, st.sundisc?.phase);
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      // Two planar facets — the triangle is FOLDED, not blown up.
      ctx.fillStyle = shade(st.color, -13);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 2.1, hw * 2.4, hh * 3.8);
      ctx.fillStyle = shade(st.color, 9);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 0.98, headY - hh * 0.6);
      ctx.lineTo(apexX + lead * hw * 0.1, apexY + hh * 0.14);
      ctx.lineTo(apexX - lead * hw * 0.06, apexY + hh * 0.3);
      ctx.lineTo(headX + lead * hw * 0.5, headY - hh * 0.5);
      ctx.closePath();
      ctx.fill();
      // The crease where the two planes meet, falling from the apex.
      ctx.fillStyle = shade(st.color, -26);
      ctx.beginPath();
      ctx.moveTo(apexX - lead * hw * 0.04, apexY + hh * 0.24);
      ctx.lineTo(apexX + lead * hw * 0.04, apexY + hh * 0.24);
      ctx.lineTo(headX + lead * hw * 0.14, headY + hh * 1.1);
      ctx.lineTo(headX - lead * hw * 0.02, headY + hh * 1.1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (front) {
        // THE DEEP DOOR: shadow past the eye line — the mystery the
        // reference keeps. The rising sun inside is the only lamp.
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        const shGrad = ctx.createLinearGradient(0, oTop, 0, headY + hh * 0.34);
        shGrad.addColorStop(0, 'rgba(20, 12, 22, 0.78)');
        shGrad.addColorStop(1, 'rgba(20, 12, 22, 0)');
        ctx.fillStyle = shGrad;
        ctx.fillRect(cx - ohw, oTop, ohw * 2, hh * 1.0);
        if (st.sundisc) {
          // The sun WITHIN: a small disc climbing the inner brow,
          // and its warmth pooling on the lower face.
          const dc = st.sundisc.color;
          const dr2 = ohw * 0.34;
          const dy2 = oTop + headR * 0.1 + dr2 * (1.1 - dayK * 1.3);
          ctx.globalAlpha = 0.25 + 0.45 * dayK;
          ctx.fillStyle = dc;
          ctx.beginPath();
          ctx.arc(cx, dy2, dr2 * 1.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.75 + 0.25 * dayK;
          ctx.fillStyle = shade(dc, 18);
          ctx.beginPath();
          ctx.arc(cx, dy2, dr2 * 0.62, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.06 + 0.12 * dayK;
          ctx.fillStyle = shade(dc, 20);
          ctx.fillRect(cx - ohw, headY + hh * 0.3, ohw * 2, oBot - headY - hh * 0.3);
          ctx.globalAlpha = 1;
        }
        ctx.restore();
        // THE SHRINE FRAME: the gold border the reference mantles
        // wear — a full bright rim, a dark inner line, and three
        // collar bosses under the chin.
        ctx.strokeStyle = shade(st.trim, -22);
        ctx.lineWidth = Math.max(2, s * 0.03);
        ctx.beginPath();
        chamferRect(ctx, cx - ohw - s * 0.008, oTop - s * 0.008, (ohw + s * 0.008) * 2, oBot - oTop + s * 0.016, cut * 0.7);
        ctx.stroke();
        ctx.strokeStyle = st.trim;
        ctx.lineWidth = Math.max(1.5, s * 0.018);
        ctx.beginPath();
        opening();
        ctx.stroke();
        for (const u of [-0.6, 0, 0.6] as const) {
          const bx = cx + u * ohw * 0.8;
          const by = oBot + headR * 0.07 - Math.abs(u) * headR * 0.03;
          ctx.fillStyle = shade(st.trim, -18);
          ctx.beginPath();
          ctx.arc(bx, by, headR * 0.055, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = shade(st.trim, 22);
          ctx.beginPath();
          ctx.arc(bx - headR * 0.015, by - headR * 0.015, headR * 0.022, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // From behind: the crease keeps falling; the tail hangs.
        ctx.fillStyle = shade(st.color, -10);
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.34, headY + hh * 0.9);
        ctx.lineTo(headX + hw * 0.34, headY + hh * 0.9);
        ctx.lineTo(headX + lead * hw * 0.08, headY + hh * 1.9);
        ctx.closePath();
        ctx.fill();
      }
    }
    return;
  }

  if (st.kind === 'vespercowl') {
    // THE VESPER COWL — the setting sun's cowl: cloth folded like
    // paper into hard planes. A BEAK of a brow juts far out over the
    // face and casts a hard-edged planar shadow to below the eyes;
    // the crown runs low and angled to a short blunt point; the hem
    // breaks into two sharp jaw tabs. Under the beak, the last of
    // the light: a rose sliver sinking on the daybreak run backward.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.7 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.52;
    const oBot = headY + hh * 0.86;
    const beakX = cx + lead * ohw * (1.0 - t * 0.2);
    const beakTip = headY - hh * 0.78;
    const shell = () => {
      // Hard lines only — the fold is the ornament.
      ctx.moveTo(headX + lead * hw * 1.2, headY + hh * 1.12);
      ctx.lineTo(headX + lead * hw * 1.26, headY + hh * 0.06);
      // Up to the beak: the brow juts OUT past the face line.
      ctx.lineTo(headX + lead * hw * 1.46, beakTip);
      // The beak's top plane runs back to the low crown point.
      ctx.lineTo(headX + lead * hw * 0.3, headY - hh * 1.5);
      ctx.lineTo(headX - lead * hw * (0.56 + t * 0.14), headY - hh * 1.58);
      // The short blunt back point and the straight trailing fall.
      ctx.lineTo(headX - lead * hw * (1.18 + t * 0.3), headY - hh * 0.78);
      ctx.lineTo(headX - lead * hw * (1.3 + t * 0.32), headY + hh * 0.3);
      ctx.lineTo(headX - lead * hw * 1.24, headY + hh * 1.12);
      // THE JAW TABS: two sharp triangles broken out of the hem.
      ctx.lineTo(headX - lead * hw * 0.52, headY + hh * 1.22);
      ctx.lineTo(headX - lead * hw * 0.3, headY + hh * 1.52);
      ctx.lineTo(headX - lead * hw * 0.08, headY + hh * 1.24);
      ctx.lineTo(headX + lead * hw * 0.22, headY + hh * 1.5);
      ctx.lineTo(headX + lead * hw * 0.46, headY + hh * 1.2);
      ctx.closePath();
    };
    const opening = () => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.6);
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      const dayK = daybreakK(f.nowMs, st.sundisc?.phase);
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      // Planar values: lit top plane, mid flank, dark under-beak —
      // folded paper, every edge a value break and never a stroke.
      ctx.fillStyle = shade(st.color, -13);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 1.8, hw * 2.4, hh * 3.6);
      ctx.fillStyle = shade(st.color, 12);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 1.44, beakTip);
      ctx.lineTo(headX + lead * hw * 0.3, headY - hh * 1.48);
      ctx.lineTo(headX - lead * hw * 0.54, headY - hh * 1.56);
      ctx.lineTo(headX - lead * hw * 0.32, headY - hh * 1.28);
      ctx.lineTo(headX + lead * hw * 0.5, headY - hh * 1.14);
      ctx.closePath();
      ctx.fill();
      // The under-beak plane in deep shade.
      ctx.fillStyle = shade(st.color, -30);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 1.44, beakTip);
      ctx.lineTo(headX + lead * hw * 0.5, headY - hh * 1.12);
      ctx.lineTo(headX + lead * hw * 0.66, headY - hh * 0.6);
      ctx.lineTo(headX + lead * hw * 1.3, headY - hh * 0.36);
      ctx.closePath();
      ctx.fill();
      // The jaw tabs keep their own facet shade.
      ctx.fillStyle = shade(st.color, -22);
      ctx.beginPath();
      ctx.moveTo(headX - lead * hw * 0.3, headY + hh * 1.5);
      ctx.lineTo(headX - lead * hw * 0.08, headY + hh * 1.22);
      ctx.lineTo(headX - lead * hw * 0.3, headY + hh * 1.26);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (front) {
        // THE PLANAR SHADOW: the beak's shadow is a hard polygon,
        // not a gradient — folded cloth throws folded dark. It
        // covers past the eye line; the vesper light lives below.
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        ctx.fillStyle = 'rgba(22, 13, 24, 0.66)';
        ctx.beginPath();
        ctx.moveTo(cx - ohw, oTop);
        ctx.lineTo(cx + ohw, oTop);
        ctx.lineTo(cx + ohw, headY + hh * 0.1);
        ctx.lineTo(cx - ohw, headY + hh * 0.24);
        ctx.closePath();
        ctx.fill();
        if (st.sundisc) {
          // The last light: a rose sliver low in the dark, sinking
          // as the vow keeps its backward clock.
          const dc = st.sundisc.color;
          const gv = 0.15 + 0.5 * dayK;
          ctx.globalAlpha = gv;
          ctx.fillStyle = dc;
          ctx.beginPath();
          ctx.ellipse(cx, headY + hh * (0.34 - dayK * 0.2), ohw * 0.55, hh * 0.1 + hh * 0.08 * dayK, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = gv * 0.4;
          ctx.fillRect(cx - ohw, headY + hh * 0.2, ohw * 2, oBot - headY - hh * 0.2);
          ctx.globalAlpha = 1;
        }
        ctx.restore();
        // One bright edge along the beak's underside — the fold the
        // light still finds.
        ctx.strokeStyle = st.trim;
        ctx.lineWidth = Math.max(1.5, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(cx - ohw * 0.96, oTop + headR * 0.01);
        ctx.lineTo(cx + ohw * 1.04, oTop - headR * 0.03);
        ctx.stroke();
      } else {
        ctx.fillStyle = shade(st.color, -12);
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.32, headY + hh * 0.92);
        ctx.lineTo(headX + hw * 0.32, headY + hh * 0.92);
        ctx.lineTo(headX + lead * hw * 0.06, headY + hh * 1.8);
        ctx.closePath();
        ctx.fill();
      }
    }
    return;
  }

  if (st.kind === 'zenithhat') {
    // THE ZENITH HAT — noon's hat: the wide brim rides LOW and tips
    // DOWN across the brow, burying the eye line in its shadow the
    // way the old wizards kept their counsel. Above it a tall cone
    // with one hard crook carries the full noon blazon. The sun
    // stands at the top of the sky and never moves; the mystery is
    // the face it leaves in the dark.
    const t = profileK;
    const front = backK <= 0.55;
    const u = -lead;
    const bandY = headY - hh * 0.34;
    const sway = Math.sin(f.nowMs * 0.0017) * hw * 0.05;
    const shimmer = 1 + 0.03 * Math.sin(f.nowMs * 0.0052);
    const kneeX = headX + u * hw * 0.4;
    const kneeY = bandY - hh * 1.66;
    const tipX = headX + u * (hw * 1.1 + sway);
    const tipY = bandY - hh * 1.34;
    // The cone first; the brim laps its base.
    ctx.fillStyle = mc;
    ctx.beginPath();
    ctx.moveTo(headX - u * hw * 0.82, bandY - hh * 0.1);
    ctx.quadraticCurveTo(headX - u * hw * 0.4, bandY - hh * 1.1, headX - u * hw * 0.08, bandY - hh * 1.6);
    ctx.quadraticCurveTo(headX + u * hw * 0.18, bandY - hh * 1.86, kneeX, kneeY);
    // The crook: one hard bend, the tip dropping past it.
    ctx.quadraticCurveTo(kneeX + u * hw * 0.4, kneeY + hh * 0.02, tipX, tipY - hh * 0.1);
    ctx.quadraticCurveTo(tipX + u * hw * 0.16, tipY + hh * 0.04, tipX - u * hw * 0.02, tipY + hh * 0.12);
    ctx.quadraticCurveTo(kneeX + u * hw * 0.34, kneeY + hh * 0.34, headX + u * hw * 0.56, bandY - hh * 0.9);
    ctx.quadraticCurveTo(headX + u * hw * 0.74, bandY - hh * 0.42, headX + u * hw * 0.82, bandY - hh * 0.1);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // The cone's shaded fold side — flat plane.
      ctx.fillStyle = shade(st.color, -15);
      ctx.beginPath();
      ctx.moveTo(headX + u * hw * 0.06, bandY - hh * 0.1);
      ctx.quadraticCurveTo(headX + u * hw * 0.1, bandY - hh * 1.1, headX + u * hw * 0.02, bandY - hh * 1.56);
      ctx.quadraticCurveTo(headX + u * hw * 0.2, bandY - hh * 1.8, kneeX, kneeY + hh * 0.04);
      ctx.quadraticCurveTo(kneeX + u * hw * 0.36, kneeY + hh * 0.06, tipX - u * hw * 0.01, tipY);
      ctx.quadraticCurveTo(kneeX + u * hw * 0.3, kneeY + hh * 0.34, headX + u * hw * 0.56, bandY - hh * 0.88);
      ctx.quadraticCurveTo(headX + u * hw * 0.74, bandY - hh * 0.42, headX + u * hw * 0.82, bandY - hh * 0.1);
      ctx.closePath();
      ctx.fill();
      if (st.sundisc && front) {
        // THE NOON BLAZON on the cone's front: the full disc high,
        // ringed by short rays, shimmering with the heat.
        const dc = st.sundisc.color;
        const bx = headX + fx * headR * 0.2;
        const by = bandY - hh * 0.88;
        const br = headR * 0.2 * shimmer * (1 - t * 0.3);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
          ctx.fillStyle = shade(dc, -6);
          ctx.beginPath();
          ctx.moveTo(bx + Math.cos(a - 0.24) * br * 1.02, by + Math.sin(a - 0.24) * br * 1.02);
          ctx.lineTo(bx + Math.cos(a) * br * 1.55, by + Math.sin(a) * br * 1.55);
          ctx.lineTo(bx + Math.cos(a + 0.24) * br * 1.02, by + Math.sin(a + 0.24) * br * 1.02);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = dc;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(dc, 24);
        ctx.beginPath();
        ctx.arc(bx - br * 0.22, by - br * 0.22, br * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // THE LOW BRIM: wide, and TIPPED — the front edge sags across
    // the brow to the eye line while the back edge rides high. The
    // whole slab leans with the facing so the dip always guards the
    // face side.
    const dipX = headX + fx * headR * 0.4;
    const brimFrontY = headY - hh * 0.06;
    ctx.fillStyle = hurt ? '#ffffff' : shade(st.color, 6);
    ctx.beginPath();
    ctx.moveTo(headX - hw * 2.1, bandY + hh * 0.06);
    ctx.quadraticCurveTo(headX - hw * 1.2, bandY - hh * 0.34, headX - hw * 0.2, bandY - hh * 0.3);
    ctx.quadraticCurveTo(headX + hw * 1.1, bandY - hh * 0.34, headX + hw * 2.1, bandY + hh * 0.06);
    // The front hem: it SAGS to the eye line over the face.
    ctx.quadraticCurveTo(headX + hw * 1.1, brimFrontY + hh * 0.06, dipX, brimFrontY + hh * 0.16);
    ctx.quadraticCurveTo(headX - hw * 1.1, brimFrontY + hh * 0.06, headX - hw * 2.1, bandY + hh * 0.06);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // The brim's underside — all shadow, and it faces the viewer.
      ctx.fillStyle = shade(st.color, -28);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 1.9, bandY + hh * 0.08);
      ctx.quadraticCurveTo(dipX - hw * 0.4, brimFrontY + hh * 0.02, dipX, brimFrontY + hh * 0.14);
      ctx.quadraticCurveTo(dipX + hw * 0.4, brimFrontY + hh * 0.02, headX + hw * 1.9, bandY + hh * 0.08);
      ctx.quadraticCurveTo(headX + hw * 1.0, brimFrontY - hh * 0.02, dipX, brimFrontY + hh * 0.08);
      ctx.quadraticCurveTo(headX - hw * 1.0, brimFrontY - hh * 0.02, headX - hw * 1.9, bandY + hh * 0.08);
      ctx.closePath();
      ctx.fill();
      if (front) {
        // THE BROW SHADOW: the dipped brim buries the eye line — a
        // flat shadow band across the upper face, and the noon light
        // pooling warm on the chin below it.
        const fw = hw * 0.72 * (1 - 0.4 * t);
        ctx.fillStyle = 'rgba(22, 13, 24, 0.5)';
        ctx.beginPath();
        ctx.moveTo(dipX - fw, brimFrontY + hh * 0.1);
        ctx.lineTo(dipX + fw, brimFrontY + hh * 0.1);
        ctx.lineTo(dipX + fw * 0.94, headY + hh * 0.22);
        ctx.lineTo(dipX - fw * 0.94, headY + hh * 0.22);
        ctx.closePath();
        ctx.fill();
        if (st.sundisc) {
          ctx.globalAlpha = 0.14;
          ctx.fillStyle = shade(st.sundisc.color, 20);
          ctx.fillRect(dipX - fw * 0.9, headY + hh * 0.3, fw * 1.8, hh * 0.5);
          ctx.globalAlpha = 1;
        }
      }
      // The band: a dark ribbon above the brim seats the cone.
      ctx.fillStyle = shade(st.color, -24);
      ctx.fillRect(headX - hw * 0.74, bandY - hh * 0.34, hw * 1.48, hh * 0.2);
    }
    return;
  }

  if (st.kind === 'umbrahood') {
    // THE UMBRA HOOD — the eclipse's cowl: the deepest dark in the
    // wardrobe. A smooth towering cowl hooked at the tip, its face a
    // VOID — nothing offered but two pale gold points where eyes
    // should be, steady as held breath. Above the crown floats the
    // eclipsed sun itself: the dark disc in its gold corona ring,
    // spiked, flaring once a cycle. The dawn's other face.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.7 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.54;
    const oBot = headY + hh * 0.88;
    const sway = Math.sin(f.nowMs * 0.0012) * hw * 0.03;
    const apexX = headX - lead * hw * (0.3 + t * 0.14) + sway;
    const apexY = headY - hh * 1.42;
    const dayK = daybreakK(f.nowMs, st.sundisc?.phase);
    if (st.sundisc && !hurt) {
      // THE CROWNED ECLIPSE floats above the peak — painted first so
      // the hood's tip laps its lower rim: it hangs BEHIND the
      // crown, a black sun over a black hood.
      const ring = st.sundisc.ring ?? st.trim;
      const ex = headX - lead * hw * 0.1;
      const ey = apexY - hh * 0.44 + Math.sin(f.nowMs * 0.0015) * hh * 0.04;
      const er = headR * 0.26;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.fillStyle = shade(ring, -8);
        ctx.beginPath();
        ctx.moveTo(ex + Math.cos(a - 0.2) * er * 1.02, ey + Math.sin(a - 0.2) * er * 1.02);
        ctx.lineTo(ex + Math.cos(a) * er * (1.4 + 0.25 * dayK), ey + Math.sin(a) * er * (1.4 + 0.25 * dayK));
        ctx.lineTo(ex + Math.cos(a + 0.2) * er * 1.02, ey + Math.sin(a + 0.2) * er * 1.02);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(ex, ey, er, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = st.sundisc.color;
      ctx.beginPath();
      ctx.arc(ex, ey, er * 0.76, 0, Math.PI * 2);
      ctx.fill();
      if (dayK > 0.7) {
        ctx.globalAlpha = ((dayK - 0.7) / 0.3) * 0.35;
        ctx.fillStyle = ring;
        ctx.beginPath();
        ctx.arc(ex, ey, er * 1.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    const shell = () => {
      // Fitted close and toned back: a rounded dark crest, not a
      // steeple — the void does the talking, not the height.
      ctx.moveTo(headX + lead * hw * 1.2, headY + hh * 1.18);
      ctx.quadraticCurveTo(headX + lead * hw * 1.28, headY + hh * 0.12, headX + lead * hw * 1.06, headY - hh * 0.56);
      ctx.quadraticCurveTo(headX + lead * hw * 0.94, headY - hh * 1.06, apexX + lead * hw * 0.2, apexY + hh * 0.1);
      // The hook: a soft nod over the crown.
      ctx.quadraticCurveTo(apexX - lead * hw * 0.05, apexY - hh * 0.06, apexX - lead * hw * 0.26, apexY + hh * 0.12);
      ctx.quadraticCurveTo(headX - lead * hw * (0.94 + t * 0.24), headY - hh * 0.72, headX - lead * hw * (1.16 + t * 0.3), headY - hh * 0.04);
      ctx.quadraticCurveTo(headX - lead * hw * (1.28 + t * 0.28), headY + hh * 0.46, headX - lead * hw * 1.24, headY + hh * 1.18);
      ctx.quadraticCurveTo(headX, headY + hh * 1.46, headX + lead * hw * 1.2, headY + hh * 1.18);
      ctx.closePath();
    };
    const opening = () => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.7);
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      ctx.fillStyle = shade(st.color, -12);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 2.0, hw * 2.4, hh * 3.8);
      // One quiet lit facet up the leading flank — the least light
      // that still says CLOTH.
      ctx.fillStyle = shade(st.color, 7);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 1.0, headY - hh * 0.54);
      ctx.quadraticCurveTo(headX + lead * hw * 0.86, headY - hh * 1.14, apexX + lead * hw * 0.18, apexY + hh * 0.16);
      ctx.lineTo(apexX + lead * hw * 0.02, apexY + hh * 0.34);
      ctx.quadraticCurveTo(headX + lead * hw * 0.6, headY - hh * 1.0, headX + lead * hw * 0.74, headY - hh * 0.46);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (front) {
        // THE VOID: the opening gives nothing back — full dark to
        // the chin, and the two pale points that watch from it.
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        ctx.fillStyle = 'rgba(16, 10, 20, 0.88)';
        ctx.fillRect(cx - ohw, oTop, ohw * 2, oBot - oTop);
        if (st.emberEyes) {
          const glow = 0.55 + 0.45 * dayK;
          const ey2 = headY - hh * 0.02;
          for (const es of [-1, 1]) {
            const wK = es !== lead ? Math.max(0, 1 - t * 1.4) : 1;
            if (wK <= 0.05) continue;
            const px = cx + es * ohw * 0.4 * (1 - t * 0.3);
            ctx.globalAlpha = 0.3 * glow * wK;
            ctx.fillStyle = st.emberEyes.color;
            ctx.beginPath();
            ctx.arc(px, ey2, hw * 0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = (0.7 + 0.3 * glow) * wK;
            ctx.fillStyle = shade(st.emberEyes.color, 30);
            ctx.fillRect(px - hw * 0.075, ey2 - hw * 0.028, hw * 0.15, hw * 0.056);
          }
          ctx.globalAlpha = 1;
        }
        ctx.restore();
        // ONE BRIGHT EDGE on the rim — the law every dark device
        // keeps, in the eclipse's own gold.
        ctx.strokeStyle = shade(st.sundisc?.ring ?? st.trim, -8);
        ctx.lineWidth = Math.max(1.5, s * 0.016);
        ctx.beginPath();
        opening();
        ctx.stroke();
      } else {
        ctx.fillStyle = shade(st.color, -9);
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.34, headY + hh * 0.92);
        ctx.lineTo(headX + hw * 0.34, headY + hh * 0.92);
        ctx.lineTo(headX + lead * hw * 0.08, headY + hh * 1.9);
        ctx.closePath();
        ctx.fill();
      }
    }
    return;
  }

  if (st.kind === 'wealdcowl') {
    // THE DEEP WEALD — the fen court's first head, third forging: the
    // gallows and its lantern are gone; the green itself is the
    // regalia now. The cowl is cut as one great leaf folded about the
    // skull — broad at the jaw, flanks converging to a single
    // standing peak — worn LOW, its front hem dropping a dark beak
    // between the eyes so the fen keeps its walker's face. A living
    // vine seams the leading flank and breaks into leaf as it
    // climbs; at the peak the newest growth rides curled — a
    // fiddlehead crest that unfurls as the green charge swells and
    // curls home as it gutters. Moss banks the trailing flank, and
    // one leaf at a time falls home to the fen.
    const t = profileK;
    const front = backK <= 0.55;
    const vd = st.verdance;
    const gk = fenlightK(f.nowMs);
    const sway = Math.sin(f.nowMs * 0.0012) * hw * 0.025;
    const apexX = headX - lead * hw * 0.08 + sway;
    const apexY = headY - hh * 1.62;
    const cx = headX + fx * headR * (0.3 + 0.22 * t);
    const ohw = hw * 0.72 * (1 - 0.46 * t);
    const oTop = headY - hh * 0.46;
    // The door slims to a slit at a profile: the chin window is a
    // front-read privilege.
    const oBot = headY + hh * (0.92 - 0.52 * t);
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.32, headY + hh * 1.08);
      // The leading flank: one straight climb from jaw to peak — the
      // triangle IS the silhouette, no drape bulge on the way up.
      ctx.quadraticCurveTo(headX + lead * hw * 1.42, headY + hh * 0.3, headX + lead * hw * (1.14 + t * 0.1), headY - hh * 0.3);
      // The flanks bow OUT on the way to the peak — the cowl is cut
      // big and worn heavy, and the skull never breaks the cloth.
      ctx.quadraticCurveTo(headX + lead * hw * 0.98, headY - hh * 1.06, apexX + lead * hw * 0.15, apexY + hh * 0.12);
      // The peak: a short blunt ridge, not a spike (blunt-tip law).
      ctx.quadraticCurveTo(apexX + lead * hw * 0.01, apexY - hh * 0.08, apexX - lead * hw * 0.13, apexY + hh * 0.1);
      ctx.quadraticCurveTo(headX - lead * hw * 1.04, headY - hh * 1.02, headX - lead * hw * (1.14 + t * 0.16), headY - hh * 0.24);
      ctx.quadraticCurveTo(headX - lead * hw * (1.38 + t * 0.2), headY + hh * 0.34, headX - lead * hw * 1.34, headY + hh * 1.08);
      ctx.quadraticCurveTo(headX, headY + hh * 1.44, headX + lead * hw * 1.32, headY + hh * 1.08);
      ctx.closePath();
    };
    const opening = () => {
      // The shadow door: a low window under the brow hem, its lintel
      // split by THE BEAK — the cowl's own point dropping past the
      // brow. The face below stays the wearer's; the eyes go to the
      // weald.
      ctx.moveTo(cx - ohw, oTop + hh * 0.16);
      ctx.lineTo(cx - ohw * 0.46, oTop);
      ctx.lineTo(cx, oTop + hh * 0.62);
      ctx.lineTo(cx + ohw * 0.46, oTop);
      ctx.lineTo(cx + ohw, oTop + hh * 0.16);
      ctx.lineTo(cx + ohw * 0.9, oBot - hh * 0.12);
      ctx.quadraticCurveTo(cx, oBot + hh * 0.1, cx - ohw * 0.9, oBot - hh * 0.12);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    // THE FIDDLEHEAD CREST is garment-scale STRUCTURE: it holds its
    // white in the hurt flash so the silhouette never pops. The
    // spiral unwinds with the green charge — curled tight at the
    // gutter, lifting open at the swell — drawn as one tapered
    // ribbon, never a stroked wire.
    const curlN = 11;
    const sweep = (1.7 - 0.75 * gk) * Math.PI;
    const a0 = Math.PI * 0.5;
    const ccx = apexX - lead * hw * 0.02;
    const ccy = apexY - hh * 0.34;
    const cr0 = headR * 0.5;
    const spOut: Array<[number, number]> = [];
    const spIn: Array<[number, number]> = [];
    for (let i = 0; i <= curlN; i++) {
      const u = i / curlN;
      const a = a0 - lead * u * sweep;
      const r = cr0 * (1 - 0.72 * u);
      const w = headR * (0.15 - 0.1 * u);
      const px2 = ccx + Math.cos(a) * r;
      const py2 = ccy + Math.sin(a) * r * (0.94 - 0.1 * t);
      spOut.push([px2 + Math.cos(a) * w, py2 + Math.sin(a) * w]);
      spIn.push([px2 - Math.cos(a) * w, py2 - Math.sin(a) * w]);
    }
    ctx.fillStyle = hurt ? '#ffffff' : (vd?.vine ?? st.trim);
    ctx.beginPath();
    ctx.moveTo(spOut[0]![0], spOut[0]![1]);
    for (const [px2, py2] of spOut) ctx.lineTo(px2, py2);
    for (let i = spIn.length - 1; i >= 0; i--) ctx.lineTo(spIn[i]![0], spIn[i]![1]);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // The curl's lit spine — the young side of the growth.
      ctx.fillStyle = shade(vd?.vine ?? st.trim, 16);
      ctx.beginPath();
      ctx.moveTo(spOut[1]![0], spOut[1]![1]);
      for (let i = 1; i <= 5; i++) ctx.lineTo(spOut[i]![0], spOut[i]![1]);
      for (let i = 5; i >= 1; i--) {
        const o = spOut[i]!; const n = spIn[i]!;
        ctx.lineTo(o[0] * 0.6 + n[0] * 0.4, o[1] * 0.6 + n[1] * 0.4);
      }
      ctx.closePath();
      ctx.fill();
      // The growth light rides the curl's tip.
      const tip = spIn[curlN]!;
      ctx.globalAlpha = 0.2 + 0.3 * gk;
      ctx.fillStyle = vd?.glow ?? st.trim;
      ctx.beginPath();
      ctx.arc(tip[0], tip[1], headR * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.55 + 0.45 * gk;
      ctx.fillStyle = shade(vd?.glow ?? st.trim, 28);
      ctx.beginPath();
      ctx.arc(tip[0], tip[1], headR * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      // Two planar facets meeting under the peak — folded, not blown.
      ctx.fillStyle = shade(st.color, -13);
      ctx.fillRect(lead === 1 ? headX - hw * 2.6 : headX, headY - hh * 2.2, hw * 2.6, hh * 4.0);
      // The lit ridge plane climbing the leading flank.
      ctx.fillStyle = shade(st.color, 10);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 1.08, headY - hh * 0.26);
      ctx.lineTo(apexX + lead * hw * 0.1, apexY + hh * 0.16);
      ctx.lineTo(apexX - lead * hw * 0.06, apexY + hh * 0.34);
      ctx.lineTo(headX + lead * hw * 0.6, headY - hh * 0.16);
      ctx.closePath();
      ctx.fill();
      // THE LIVING SEAM: the vine climbs the leading flank in three
      // tapered reaches — filled limbs, never strokes — and breaks
      // into leaf at each joint. The weald grows UP the wearer.
      const seam = (u: number) => ({
        x: headX + lead * hw * (1.06 - 0.98 * u) + sway * u,
        y: headY - hh * (0.3 + 1.18 * u),
      });
      ctx.fillStyle = shade(vd?.vine ?? st.trim, -4);
      for (let i2 = 0; i2 < 3; i2++) {
        const p0 = seam(i2 / 3);
        const p1 = seam((i2 + 1) / 3);
        const wob = lead * hw * 0.05 * (i2 % 2 === 0 ? 1 : -1);
        const vw = hw * (0.075 - i2 * 0.018);
        ctx.beginPath();
        ctx.moveTo(p0.x - vw, p0.y);
        ctx.quadraticCurveTo((p0.x + p1.x) / 2 + wob - vw * 0.6, (p0.y + p1.y) / 2, p1.x - vw * 0.55, p1.y);
        ctx.lineTo(p1.x + vw * 0.55, p1.y);
        ctx.quadraticCurveTo((p0.x + p1.x) / 2 + wob + vw * 0.6, (p0.y + p1.y) / 2, p0.x + vw, p0.y);
        ctx.closePath();
        ctx.fill();
      }
      // The vine's leaves: one at each joint, alternating sides,
      // each a filled lens with a lit midrib wedge.
      for (let i2 = 0; i2 < 3; i2++) {
        const p = seam(0.18 + i2 * 0.33);
        const side2 = i2 % 2 === 0 ? 1 : -1;
        const la = -Math.PI * 0.5 + lead * side2 * Math.PI * 0.42;
        const ll = headR * (0.34 - i2 * 0.05);
        const lx2 = p.x + Math.cos(la) * ll;
        const ly2 = p.y + Math.sin(la) * ll;
        const pw = headR * 0.13;
        ctx.fillStyle = shade(vd?.leaf ?? st.trim, i2 === 1 ? 8 : -4);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.quadraticCurveTo(p.x + Math.cos(la - 0.6) * ll * 0.7 + pw * 0.4, p.y + Math.sin(la - 0.6) * ll * 0.7, lx2, ly2);
        ctx.quadraticCurveTo(p.x + Math.cos(la + 0.6) * ll * 0.7 - pw * 0.4, p.y + Math.sin(la + 0.6) * ll * 0.7, p.x, p.y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(vd?.leaf ?? st.trim, 20);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(la) * ll * 0.78 + Math.cos(la + Math.PI / 2) * pw * 0.16, p.y + Math.sin(la) * ll * 0.78 + Math.sin(la + Math.PI / 2) * pw * 0.16);
        ctx.lineTo(p.x + Math.cos(la) * ll * 0.78 - Math.cos(la + Math.PI / 2) * pw * 0.16, p.y + Math.sin(la) * ll * 0.78 - Math.sin(la + Math.PI / 2) * pw * 0.16);
        ctx.closePath();
        ctx.fill();
      }
      // THE MOSS BANK: soft-edged growth pooled low on the trailing
      // flank — two lapped tones and a scatter of lit lichen flecks.
      ctx.fillStyle = shade(st.color, -20);
      ctx.beginPath();
      ctx.moveTo(headX - lead * hw * 1.3, headY + hh * 0.4);
      ctx.quadraticCurveTo(headX - lead * hw * 0.9, headY + hh * 0.12, headX - lead * hw * 0.5, headY + hh * 0.5);
      ctx.quadraticCurveTo(headX - lead * hw * 0.86, headY + hh * 0.86, headX - lead * hw * 1.34, headY + hh * 0.78);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(st.color, -8);
      ctx.beginPath();
      ctx.moveTo(headX - lead * hw * 1.24, headY + hh * 0.46);
      ctx.quadraticCurveTo(headX - lead * hw * 0.94, headY + hh * 0.26, headX - lead * hw * 0.68, headY + hh * 0.52);
      ctx.quadraticCurveTo(headX - lead * hw * 0.96, headY + hh * 0.7, headX - lead * hw * 1.26, headY + hh * 0.64);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(vd?.leaf ?? st.trim, 14);
      for (const [mu, mv] of [[-1.12, 0.5], [-0.86, 0.38], [-0.72, 0.56]] as const) {
        ctx.beginPath();
        ctx.arc(headX + lead * hw * mu, headY + hh * mv, headR * 0.045, 0, Math.PI * 2);
        ctx.fill();
      }
      // THE LEAF MANTLE: lapped pointed leaves across the cowl's
      // base — the hood handing itself to the shoulders in the same
      // green it grew.
      for (let i2 = 0; i2 < 5; i2++) {
        const u = -0.84 + i2 * 0.42;
        ctx.fillStyle = shade(st.color, i2 % 2 === 0 ? -17 : -5);
        ctx.beginPath();
        ctx.moveTo(headX + hw * (u - 0.24), headY + hh * 1.0);
        ctx.quadraticCurveTo(headX + hw * (u - 0.1), headY + hh * 1.3, headX + hw * u, headY + hh * 1.46);
        ctx.quadraticCurveTo(headX + hw * (u + 0.1), headY + hh * 1.3, headX + hw * (u + 0.24), headY + hh * 1.0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(st.color, i2 % 2 === 0 ? -28 : -16);
        ctx.fillRect(headX + hw * (u - 0.016), headY + hh * 1.04, hw * 0.032, hh * 0.3);
      }
      ctx.restore();
      if (front) {
        // The shadow door pours PAST the eye line — a thin band does
        // not read as mystery, and the rig's eyes sit LOWER than
        // they look. OPAQUE flat planes only: translucent fills
        // no-op in this paint path (the opaque-mystery law).
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        // Planes span far past the door on purpose — the clip owns
        // the shape; the rect only owns the value.
        ctx.fillStyle = '#0e1512';
        ctx.fillRect(cx - ohw * 2.2, oTop - hh * 0.1, ohw * 4.4, hh * 0.1 + (headY + hh * 0.24 - oTop));
        ctx.fillStyle = '#22322a';
        ctx.fillRect(cx - ohw * 2.2, headY + hh * 0.24, ohw * 4.4, hh * 0.22);
        ctx.restore();
        // THE BEAK reads as a folded point, not a notch: a lit lead
        // face and a shadowed trail face meeting at the drop.
        ctx.fillStyle = shade(st.color, 8);
        ctx.beginPath();
        ctx.moveTo(cx - ohw * 0.46, oTop);
        ctx.lineTo(cx, oTop + hh * 0.62);
        ctx.lineTo(cx - lead * hw * 0.02, oTop - hh * 0.04);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(st.color, -14);
        ctx.beginPath();
        ctx.moveTo(cx + ohw * 0.46, oTop);
        ctx.lineTo(cx, oTop + hh * 0.62);
        ctx.lineTo(cx - lead * hw * 0.02, oTop - hh * 0.04);
        ctx.closePath();
        ctx.fill();
        // The beak's edges wear the trim — the one bright line on the
        // dark door — and a dewdrop rides the point.
        ctx.strokeStyle = shade(st.trim, -6);
        ctx.lineWidth = Math.max(1.5, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(cx - ohw * 0.46, oTop + hh * 0.02);
        ctx.lineTo(cx, oTop + hh * 0.62);
        ctx.lineTo(cx + ohw * 0.46, oTop + hh * 0.02);
        ctx.stroke();
        const dewY = oTop + hh * 0.64 + Math.sin(f.nowMs * 0.0021) * hh * 0.02;
        ctx.globalAlpha = 0.4 + 0.5 * gk;
        ctx.fillStyle = vd?.glow ?? st.trim;
        ctx.beginPath();
        ctx.arc(cx, dewY + headR * 0.05, headR * 0.075, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = shade(vd?.glow ?? st.trim, 30);
        ctx.beginPath();
        ctx.arc(cx - headR * 0.02, dewY + headR * 0.03, headR * 0.03, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        // From behind: the drape falls in two leaf points, and the
        // vine seam shows where it crossed over the crown.
        ctx.fillStyle = shade(st.color, -10);
        for (const u of [-0.42, 0.38] as const) {
          ctx.beginPath();
          ctx.moveTo(headX + hw * (u - 0.3), headY + hh * 0.9);
          ctx.lineTo(headX + hw * (u + 0.3), headY + hh * 0.9);
          ctx.quadraticCurveTo(headX + hw * (u + 0.06), headY + hh * 1.5, headX + hw * u, headY + hh * 1.82);
          ctx.quadraticCurveTo(headX + hw * (u - 0.06), headY + hh * 1.5, headX + hw * (u - 0.3), headY + hh * 0.9);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = shade(vd?.vine ?? st.trim, -10);
        ctx.beginPath();
        ctx.moveTo(headX - lead * hw * 0.5, headY + hh * 0.66);
        ctx.quadraticCurveTo(headX - lead * hw * 0.1, headY + hh * 0.3, apexX - lead * hw * 0.04, apexY + hh * 0.5);
        ctx.lineTo(apexX + lead * hw * 0.05, apexY + hh * 0.56);
        ctx.quadraticCurveTo(headX + lead * hw * 0.02, headY + hh * 0.42, headX - lead * hw * 0.38, headY + hh * 0.74);
        ctx.closePath();
        ctx.fill();
      }
      // One leaf falling home to the fen — born at the peak, gone at
      // the mantle, one at a time.
      const fall = (f.nowMs * 0.00028) % 1;
      if (fall < 0.92) {
        const fx2 = apexX + lead * hw * (0.3 + 0.5 * fall) + Math.sin(fall * Math.PI * 3) * hw * 0.14;
        const fy2 = apexY + hh * (0.4 + 2.1 * fall);
        const fr = Math.sin(f.nowMs * 0.004) * 0.9;
        ctx.globalAlpha = 0.75 * (1 - fall * 0.7);
        ctx.fillStyle = shade(vd?.leaf ?? st.trim, 6);
        ctx.save();
        ctx.translate(fx2, fy2);
        ctx.rotate(fr);
        ctx.beginPath();
        ctx.moveTo(0, -headR * 0.09);
        ctx.quadraticCurveTo(headR * 0.08, 0, 0, headR * 0.09);
        ctx.quadraticCurveTo(-headR * 0.08, 0, 0, -headR * 0.09);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }
    return;
  }

  if (st.kind === 'bloomcrown') {
    // THE SOVEREIGN ORCHID — mirebloom's own head, second forging:
    // the mire orchid worn OPEN. Two great fall petals sweep down
    // from the crown to frame the jaw, dew-tipped; three wide lit
    // standard petals stand above, parting as THE FENLIGHT clock
    // breathes; the heart burns between them; and two pale petal
    // tails stream out past the silhouette. Petals and falls are
    // STRUCTURE — they hold as white in the hurt flash.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.66 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.54;
    const oBot = headY + hh * 0.86;
    const bloomK = fenlightK(f.nowMs);
    const crownY = headY - hh * 0.98;
    // THE PETAL TAILS first — behind everything, streaming PAST the
    // shell's own silhouette on the trailing side, pale on plum.
    if (!hurt && st.bloomheart) {
      const tailCol = st.bloomheart.tails ?? st.bloomheart.color;
      for (const [u, len, swing, ph] of [[-1, 1.75, 1.7, 0], [1, 1.35, 1.42, 1.9]] as const) {
        const tSway = Math.sin(f.nowMs * 0.0013 + ph) * hw * 0.1;
        const bx0 = headX - lead * hw * 0.1 + u * hw * 0.2;
        const tipX = headX - lead * hw * swing + tSway;
        ctx.fillStyle = shade(tailCol, u === -1 ? 0 : -12);
        ctx.beginPath();
        ctx.moveTo(bx0, crownY + hh * 0.08);
        ctx.quadraticCurveTo(
          headX - lead * hw * (swing + 0.25) + tSway * 0.5, crownY + hh * len * 0.42,
          tipX, crownY + hh * len,
        );
        ctx.quadraticCurveTo(
          headX - lead * hw * (swing - 0.28) + tSway, crownY + hh * (len * 0.5),
          bx0 - lead * hw * 0.26, crownY + hh * 0.18,
        );
        ctx.closePath();
        ctx.fill();
        // The tail's curl: a paler tip flick.
        ctx.fillStyle = shade(tailCol, 16);
        ctx.beginPath();
        ctx.arc(tipX, crownY + hh * len, headR * 0.045, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.18, headY + hh * 1.14);
      ctx.quadraticCurveTo(headX + lead * hw * 1.28, headY + hh * 0.1, headX + lead * hw * 1.02, headY - hh * 0.5);
      // The calyx dome: a low fitted crown the petals stand from.
      ctx.quadraticCurveTo(headX + lead * hw * 0.7, headY - hh * 1.06, headX, headY - hh * 1.12);
      ctx.quadraticCurveTo(headX - lead * hw * 0.7, headY - hh * 1.04, headX - lead * hw * (1.0 + t * 0.24), headY - hh * 0.46);
      ctx.quadraticCurveTo(headX - lead * hw * (1.24 + t * 0.26), headY + hh * 0.42, headX - lead * hw * 1.2, headY + hh * 1.14);
      ctx.quadraticCurveTo(headX, headY + hh * 1.44, headX + lead * hw * 1.18, headY + hh * 1.14);
      ctx.closePath();
    };
    const opening = () => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.7);
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    // The calyx planes and sepal seams, clipped to the shell.
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      ctx.fillStyle = shade(st.color, -12);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 2.1, hw * 2.4, hh * 3.8);
      ctx.fillStyle = shade(st.color, -24);
      for (const u of [-0.5, 0.1, 0.7] as const) {
        ctx.beginPath();
        ctx.moveTo(headX + lead * hw * u, headY - hh * 1.04);
        ctx.lineTo(headX + lead * hw * (u + 0.1), headY - hh * 1.04);
        ctx.lineTo(headX + lead * hw * (u + 0.04), headY - hh * 0.35);
        ctx.lineTo(headX + lead * hw * (u - 0.06), headY - hh * 0.35);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    // THE STANDARDS: three wide LIT petals off the calyx, the sides
    // PARTING on the clock — structure first, detail only unhurt.
    const stands = [
      [1, 0.36, 1.18, 0.5], [-1, -0.36, 1.16, 0.5], [0, 0, 1.5, 0.6],
    ] as const;
    for (const [u, bx0, ph, pw] of stands) {
      const baseX = headX + lead * hw * 0.04 + u * hw * 0.36 + lead * hw * bx0 * 0.1;
      const rot = u === 0 ? lead * 0.05 : u * (0.1 + 0.24 * bloomK);
      ctx.save();
      ctx.translate(baseX, crownY);
      ctx.rotate(rot);
      ctx.fillStyle = hurt ? '#ffffff' : shade(st.color, u === 0 ? 18 : 8);
      ctx.beginPath();
      ctx.moveTo(-hw * pw * 0.5, 0);
      ctx.quadraticCurveTo(-hw * pw * 0.78, -hh * ph * 0.6, 0, -hh * ph);
      ctx.quadraticCurveTo(hw * pw * 0.78, -hh * ph * 0.6, hw * pw * 0.5, 0);
      ctx.closePath();
      ctx.fill();
      if (hurt) { ctx.restore(); continue; }
      // The petal's heartward vein: a darker center plane.
      ctx.fillStyle = shade(st.color, u === 0 ? -4 : -12);
      ctx.beginPath();
      ctx.moveTo(-hw * pw * 0.14, -hh * 0.06);
      ctx.quadraticCurveTo(-hw * pw * 0.2, -hh * ph * 0.52, 0, -hh * (ph - 0.1));
      ctx.quadraticCurveTo(hw * pw * 0.06, -hh * ph * 0.5, hw * pw * 0.1, -hh * 0.06);
      ctx.closePath();
      ctx.fill();
      // The petal's rim light: the mire's own color at the edge.
      if (st.bloomheart) {
        ctx.globalAlpha = 0.5 + 0.3 * bloomK;
        ctx.strokeStyle = shade(st.bloomheart.color, -6);
        ctx.lineWidth = Math.max(1.5, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(-hw * pw * 0.42, -hh * 0.05);
        ctx.quadraticCurveTo(-hw * pw * 0.7, -hh * ph * 0.6, 0, -hh * (ph - 0.02));
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
    // THE FALLS: two great petals sweeping down from the calyx to
    // frame the jaw, tips curling out — structure, so they hold in
    // the flash; midrib and dew are detail.
    for (const u of [1, -1] as const) {
      const fSway = Math.sin(f.nowMs * 0.0012 + u * 1.2) * hw * 0.02;
      const bx0 = headX + u * hw * 0.6;
      const tx = headX + u * hw * (1.28 + t * 0.1) + fSway;
      const ty = headY + hh * 0.5;
      ctx.fillStyle = hurt ? '#ffffff' : shade(st.color, u === lead ? 4 : -10);
      ctx.beginPath();
      ctx.moveTo(bx0, headY - hh * 0.95);
      ctx.quadraticCurveTo(headX + u * hw * 1.3, headY - hh * 0.5, tx, ty);
      ctx.quadraticCurveTo(headX + u * hw * 1.4, headY + hh * 0.68, headX + u * hw * 1.16, headY + hh * 0.86);
      ctx.quadraticCurveTo(headX + u * hw * 0.98, headY + hh * 0.42, headX + u * hw * 0.78, headY - hh * 0.1);
      ctx.quadraticCurveTo(headX + u * hw * 0.66, headY - hh * 0.6, bx0, headY - hh * 0.95);
      ctx.closePath();
      ctx.fill();
      if (hurt) continue;
      // The fall's midrib: a darker vein plane.
      ctx.fillStyle = shade(st.color, u === lead ? -10 : -22);
      ctx.beginPath();
      ctx.moveTo(bx0 + u * hw * 0.04, headY - hh * 0.85);
      ctx.quadraticCurveTo(headX + u * hw * 1.12, headY - hh * 0.4, tx - u * hw * 0.08, ty - hh * 0.06);
      ctx.lineTo(tx - u * hw * 0.16, ty - hh * 0.02);
      ctx.quadraticCurveTo(headX + u * hw * 1.0, headY - hh * 0.44, bx0 - u * hw * 0.04, headY - hh * 0.82);
      ctx.closePath();
      ctx.fill();
      if (st.bloomheart) {
        const dewK = fenlightK(f.nowMs, u === 1 ? 0.25 : 0.6);
        ctx.globalAlpha = 0.5 + 0.5 * dewK;
        ctx.fillStyle = st.bloomheart.dew;
        ctx.beginPath();
        ctx.arc(headX + u * hw * 1.16, headY + hh * 0.88, headR * 0.055, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.5 * dewK;
        ctx.beginPath();
        ctx.arc(headX + u * hw * 1.14, headY + hh * 0.85, headR * 0.02, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    if (!hurt) {
      if (st.bloomheart) {
        // THE HEART: the orchid's center burning between the
        // standards, waking with the clock — and at full open one
        // pollen mote lifts off it.
        const hx = headX + lead * hw * 0.04;
        const hy = crownY - hh * 0.36;
        ctx.globalAlpha = 0.35 + 0.45 * bloomK;
        ctx.fillStyle = st.bloomheart.color;
        ctx.beginPath();
        ctx.arc(hx, hy, headR * (0.22 + 0.06 * bloomK), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.6 + 0.4 * bloomK;
        ctx.fillStyle = shade(st.bloomheart.color, 18);
        ctx.beginPath();
        ctx.arc(hx, hy, headR * 0.13, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.7 + 0.3 * bloomK;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(hx - headR * 0.03, hy - headR * 0.03, headR * 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        if (bloomK > 0.7) {
          const u01 = (f.nowMs % 5600) / 5600;
          ctx.globalAlpha = 0.55 * ((bloomK - 0.7) / 0.3) * (1 - u01 * 0.6);
          ctx.fillStyle = st.bloomheart.dew;
          ctx.beginPath();
          ctx.arc(hx + Math.sin(f.nowMs * 0.0021) * hw * 0.14, hy - hh * (0.24 + u01 * 0.4), headR * 0.032, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      if (front) {
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        const shGrad = ctx.createLinearGradient(0, oTop, 0, headY + hh * 0.3);
        shGrad.addColorStop(0, 'rgba(22, 12, 24, 0.74)');
        shGrad.addColorStop(1, 'rgba(22, 12, 24, 0)');
        ctx.fillStyle = shGrad;
        ctx.fillRect(cx - ohw, oTop, ohw * 2, hh * 1.0);
        ctx.restore();
        ctx.strokeStyle = st.trim;
        ctx.lineWidth = Math.max(1.5, s * 0.016);
        ctx.beginPath();
        opening();
        ctx.stroke();
        ctx.strokeStyle = shade(st.color, -26);
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        chamferRect(ctx, cx - ohw + s * 0.012, oTop + s * 0.012, (ohw - s * 0.012) * 2, oBot - oTop - s * 0.024, cut * 0.6);
        ctx.stroke();
      } else {
        // From behind: the calyx seam and the tail keep the cloth
        // honest under the streaming petals.
        ctx.fillStyle = shade(st.color, -18);
        ctx.fillRect(headX - hw * 0.05, headY - hh * 0.95, hw * 0.1, hh * 1.9);
        ctx.fillStyle = shade(st.color, -10);
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.32, headY + hh * 0.9);
        ctx.lineTo(headX + hw * 0.32, headY + hh * 0.9);
        ctx.lineTo(headX, headY + hh * 1.8);
        ctx.closePath();
        ctx.fill();
      }
    }
    return;
  }

  if (st.kind === 'sedgehat') {
    // THE FEN LORD'S HAT — rustsedge's own head, second forging: a
    // GRAND double-tiered woven hat, the wide lower brim fringed in
    // hanging reed strands, a lighter upper brim stacked over it,
    // and the tall cone rising between two standing cattails. The
    // face sits in poured shadow under all of it; THE DARTER perches
    // on the upper brim, still as bait, shivering awake once a
    // cycle. A hat with a county under it.
    const t = profileK;
    const front = backK <= 0.55;
    const brimY = headY - hh * 0.22;
    const brimRx = hw * 2.2 * (1 - 0.16 * t);
    const brimRy = hh * 0.42 * (1 - 0.2 * t);
    const brim2Y = brimY - hh * 0.34;
    const brim2Rx = brimRx * 0.66;
    const brim2Ry = brimRy * 0.62;
    const apexX = headX - lead * hw * 0.1;
    const apexY = headY - hh * 1.5;
    // The under-brim first: poured shadow down PAST the eye line.
    if (front && !hurt) {
      ctx.fillStyle = 'rgba(26, 16, 10, 0.72)';
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.88, brimY);
      ctx.lineTo(headX + hw * 0.88, brimY);
      ctx.quadraticCurveTo(headX + hw * 0.86, headY + hh * 0.32, headX + hw * 0.6, headY + hh * 0.38);
      ctx.lineTo(headX - hw * 0.6, headY + hh * 0.38);
      ctx.quadraticCurveTo(headX - hw * 0.86, headY + hh * 0.32, headX - hw * 0.88, brimY);
      ctx.closePath();
      ctx.fill();
    }
    // THE LOWER BRIM: the great ring, three weave bands deep.
    for (const [rk, dv] of [[1, -18], [0.8, -8], [0.58, 2]] as const) {
      ctx.fillStyle = hurt ? '#ffffff' : shade(st.color, dv);
      ctx.beginPath();
      ctx.ellipse(headX, brimY, brimRx * rk, brimRy * rk, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!hurt) {
      // THE REED FRINGE: hanging strands off the lower brim's edge,
      // parted at the front so the shadowed face keeps its door.
      ctx.strokeStyle = shade(st.color, -24);
      ctx.lineWidth = Math.max(1, s * 0.011);
      for (let i = 0; i < 9; i++) {
        const u = -0.92 + (i / 8) * 1.84;
        if (front && Math.abs(u) < 0.34) continue;
        const fx0 = headX + u * brimRx * 0.94;
        const fy0 = brimY + brimRy * Math.sqrt(Math.max(0, 1 - u * u)) * 0.85;
        const fSway = Math.sin(f.nowMs * 0.0019 + i * 1.3) * hw * 0.03;
        const fLen = hh * (0.34 + 0.1 * Math.sin(i * 2.7));
        ctx.beginPath();
        ctx.moveTo(fx0, fy0);
        ctx.quadraticCurveTo(fx0 + fSway * 0.5, fy0 + fLen * 0.6, fx0 + fSway, fy0 + fLen);
        ctx.stroke();
      }
    }
    // THE UPPER BRIM: the lighter tier stacked above, lit.
    for (const [rk, dv] of [[1, -4], [0.66, 8]] as const) {
      ctx.fillStyle = hurt ? '#ffffff' : shade(st.color, dv);
      ctx.beginPath();
      ctx.ellipse(headX, brim2Y, brim2Rx * rk, brim2Ry * rk, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // THE CONE: tall woven rise off the upper brim, faceted, banded.
    const coneW = hw * 0.92;
    const cone = () => {
      ctx.moveTo(headX - coneW, brim2Y);
      ctx.quadraticCurveTo(headX - coneW * 0.48, brim2Y - hh * 0.7, apexX, apexY);
      ctx.quadraticCurveTo(headX + coneW * 0.5, brim2Y - hh * 0.68, headX + coneW, brim2Y);
      ctx.quadraticCurveTo(headX, brim2Y + brim2Ry * 0.6, headX - coneW, brim2Y);
      ctx.closePath();
    };
    ctx.fillStyle = hurt ? '#ffffff' : st.color;
    ctx.beginPath();
    cone();
    ctx.fill();
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      cone();
      ctx.clip();
      ctx.fillStyle = shade(st.color, -12);
      ctx.fillRect(lead === 1 ? headX - hw * 2 : headX, apexY - hh * 0.2, hw * 2, hh * 2.4);
      for (const [by, dv] of [[-1.14, 7], [-0.76, -6]] as const) {
        ctx.fillStyle = shade(st.color, dv);
        ctx.fillRect(headX - coneW, headY + hh * by, coneW * 2, hh * 0.1);
      }
      // The cord band at the cone's foot, and its knot.
      ctx.fillStyle = st.trim;
      ctx.fillRect(headX - coneW, brim2Y - hh * 0.16, coneW * 2, hh * 0.13);
      ctx.fillStyle = shade(st.trim, -16);
      ctx.fillRect(headX + lead * hw * 0.3 - hw * 0.06, brim2Y - hh * 0.19, hw * 0.12, hh * 0.19);
      ctx.restore();
      // THE STANDING CATTAILS: two off the band's trailing side,
      // velvet heads tipped in fluff, nodding a hair.
      for (const [ci, cu, chg] of [[0, -0.62, 0.55], [1, -0.86, 0.4]] as const) {
        const bx0 = headX + lead * hw * cu;
        const nod = Math.sin(f.nowMs * 0.0017 + ci * 2.1) * hw * 0.03;
        const topY = brim2Y - hh * (chg + 0.34);
        ctx.strokeStyle = shade(st.trim, -22);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(bx0, brim2Y - hh * 0.1);
        ctx.quadraticCurveTo(bx0 + nod * 0.5, brim2Y - hh * chg, bx0 + nod, topY + hh * 0.14);
        ctx.stroke();
        ctx.fillStyle = shade(st.color, -28);
        ctx.beginPath();
        ctx.ellipse(bx0 + nod, topY, hw * 0.055, hh * 0.13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(st.trim, 18);
        ctx.beginPath();
        ctx.ellipse(bx0 + nod, topY - hh * 0.17, hw * 0.035, hh * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // The bead cords: two amber drops off the trailing brim edge.
      for (const [bi, bu, bl] of [[0, -0.82, 0.5], [1, -0.6, 0.36]] as const) {
        const bx = headX + lead * brimRx * bu;
        const bSway = Math.sin(f.nowMs * 0.0019 + bi * 2.3) * hw * 0.04;
        const bby = brimY + brimRy + hh * bl;
        ctx.strokeStyle = shade(st.trim, -20);
        ctx.lineWidth = Math.max(1, s * 0.009);
        ctx.beginPath();
        ctx.moveTo(bx, brimY + brimRy * 0.6);
        ctx.lineTo(bx + bSway, bby - hh * 0.06);
        ctx.stroke();
        ctx.fillStyle = shade(st.trim, 10);
        ctx.beginPath();
        ctx.arc(bx + bSway, bby, headR * (0.055 - bi * 0.012), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(st.trim, 32);
        ctx.beginPath();
        ctx.arc(bx + bSway - headR * 0.014, bby - headR * 0.014, headR * 0.02, 0, Math.PI * 2);
        ctx.fill();
      }
      if (st.darter) {
        // THE DARTER: perched on the upper brim's leading edge —
        // long abdomen, thorax bulb, folded blade-plane wings. Once
        // a cycle it remembers it can fly.
        const shivT = f.nowMs % 6200;
        const shiver = shivT < 420 ? Math.sin(f.nowMs * 0.09) * 0.16 : 0;
        ctx.save();
        ctx.translate(headX + lead * brim2Rx * 0.66, brim2Y - hh * 0.1);
        ctx.rotate(lead * -0.12 + shiver * 0.4);
        const dl = hw * 0.82;
        ctx.fillStyle = st.darter.body;
        ctx.beginPath();
        ctx.ellipse(-lead * dl * 0.5, 0, dl * 0.5, hh * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(st.darter.body, -18);
        ctx.fillRect(-lead * dl * 0.42, -hh * 0.045, dl * 0.05, hh * 0.09);
        ctx.fillRect(-lead * dl * 0.68, -hh * 0.04, dl * 0.05, hh * 0.08);
        ctx.fillStyle = shade(st.darter.body, 8);
        ctx.beginPath();
        ctx.arc(0, 0, hh * 0.085, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(st.darter.body, 18);
        ctx.beginPath();
        ctx.arc(lead * dl * 0.14, -hh * 0.014, hh * 0.06, 0, Math.PI * 2);
        ctx.fill();
        for (const [wy, dv, wr] of [[-0.03, 0, -0.07], [0.02, -12, 0.06]] as const) {
          ctx.save();
          ctx.rotate(wr + shiver);
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = shade(st.darter.wing, dv);
          ctx.beginPath();
          ctx.moveTo(0, hh * wy);
          ctx.quadraticCurveTo(-lead * dl * 0.5, hh * (wy - 0.1), -lead * dl * 1.05, hh * (wy - 0.03));
          ctx.lineTo(-lead * dl * 0.86, hh * (wy + 0.05));
          ctx.lineTo(-lead * dl * 0.68, hh * (wy + 0.02));
          ctx.quadraticCurveTo(-lead * dl * 0.38, hh * (wy + 0.08), 0, hh * (wy + 0.03));
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }
    return;
  }

  if (st.kind === 'heroncowl') {
    // THE HERON COWL — graymist's own head: the fog combed into
    // cloth. A low fitted crown sweeps BACK long like a heron's
    // crest; three folded plume vanes lap down the sweep, dark at
    // the tips; two pale chevrons sit at the throat for a gorget.
    // Mist slides off the rim on the fen clock — the lot cut from
    // fog never quite gives it up.
    const t = profileK;
    const front = backK <= 0.55;
    const cx = headX + fx * headR * (0.34 + 0.24 * t);
    const ohw = hw * 0.66 * (1 - 0.5 * t);
    const oTop = headY - hh * 0.56;
    const oBot = headY + hh * 0.86;
    const sway = Math.sin(f.nowMs * 0.0012) * hw * 0.04;
    const apexX = headX - lead * hw * 0.42;
    const apexY = headY - hh * 1.14;
    const swX = headX - lead * hw * (1.56 + t * 0.3) + sway;
    const swY = headY - hh * 0.64;
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.18, headY + hh * 1.14);
      ctx.quadraticCurveTo(headX + lead * hw * 1.28, headY + hh * 0.1, headX + lead * hw * 1.0, headY - hh * 0.6);
      // The crown rides low and fitted over the brow to the apex.
      ctx.quadraticCurveTo(headX + lead * hw * 0.44, headY - hh * 1.1, apexX, apexY);
      // The sweep: the crest laid back, a long trailing point.
      ctx.quadraticCurveTo(headX - lead * hw * 1.0, headY - hh * 1.06, swX, swY);
      // The under-sweep folds back to the skull.
      ctx.quadraticCurveTo(headX - lead * hw * 1.16, headY - hh * 0.42, headX - lead * hw * (1.12 + t * 0.24), headY - hh * 0.02);
      ctx.quadraticCurveTo(headX - lead * hw * (1.24 + t * 0.26), headY + hh * 0.42, headX - lead * hw * 1.2, headY + hh * 1.14);
      ctx.quadraticCurveTo(headX, headY + hh * 1.44, headX + lead * hw * 1.18, headY + hh * 1.14);
      ctx.closePath();
    };
    const opening = () => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.7);
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      // The crown's lit top plane; the sweep's underside in shadow.
      ctx.fillStyle = shade(st.color, -12);
      ctx.fillRect(headX - hw * 2.4, headY - hh * 0.5, hw * 4.8, hh * 2.6);
      ctx.fillStyle = shade(st.color, 7);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 1.0, headY - hh * 0.6);
      ctx.quadraticCurveTo(headX + lead * hw * 0.44, headY - hh * 1.08, apexX, apexY);
      ctx.quadraticCurveTo(headX - lead * hw * 0.9, headY - hh * 1.02, swX, swY);
      ctx.lineTo(swX + lead * hw * 0.1, swY + hh * 0.14);
      ctx.quadraticCurveTo(headX - lead * hw * 0.6, headY - hh * 0.74, headX + lead * hw * 0.6, headY - hh * 0.6);
      ctx.closePath();
      ctx.fill();
      if (st.plumecrest) {
        // THE PLUME CREST: three folded vanes lapped down the sweep,
        // filled blade planes dipped dark at the tips, each riding
        // its own slow air.
        for (const [pi, u0, len] of [[0, 0.1, 0.62], [1, -0.28, 0.78], [2, -0.62, 0.92]] as const) {
          const pSway = Math.sin(f.nowMs * 0.0011 + pi * 1.3) * hw * 0.03;
          const bx0 = headX + lead * hw * u0 * -1;
          const by0 = headY - hh * (1.06 - pi * 0.05);
          const txx = bx0 - lead * hw * len + pSway;
          const tyy = by0 + hh * (0.1 + pi * 0.06);
          ctx.fillStyle = shade(st.plumecrest.color, pi * -7);
          ctx.beginPath();
          ctx.moveTo(bx0, by0);
          ctx.quadraticCurveTo(bx0 - lead * hw * len * 0.5, by0 - hh * 0.16, txx, tyy);
          ctx.lineTo(txx + lead * hw * 0.08, tyy + hh * 0.08);
          ctx.quadraticCurveTo(bx0 - lead * hw * len * 0.4, by0 + hh * 0.12, bx0, by0 + hh * 0.16);
          ctx.closePath();
          ctx.fill();
          // The dark tip: the vane dipped in the fen's own ink.
          ctx.fillStyle = st.plumecrest.tip;
          ctx.beginPath();
          ctx.moveTo(txx + lead * hw * 0.16, tyy - hh * 0.03);
          ctx.lineTo(txx, tyy);
          ctx.lineTo(txx + lead * hw * 0.1, tyy + hh * 0.09);
          ctx.lineTo(txx + lead * hw * 0.24, tyy + hh * 0.05);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
      if (front) {
        ctx.save();
        ctx.beginPath();
        opening();
        ctx.clip();
        const shGrad = ctx.createLinearGradient(0, oTop, 0, headY + hh * 0.3);
        shGrad.addColorStop(0, 'rgba(18, 22, 21, 0.72)');
        shGrad.addColorStop(1, 'rgba(18, 22, 21, 0)');
        ctx.fillStyle = shGrad;
        ctx.fillRect(cx - ohw, oTop, ohw * 2, hh * 1.0);
        ctx.restore();
        ctx.strokeStyle = st.trim;
        ctx.lineWidth = Math.max(1.5, s * 0.016);
        ctx.beginPath();
        opening();
        ctx.stroke();
        ctx.strokeStyle = shade(st.color, -24);
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        chamferRect(ctx, cx - ohw + s * 0.012, oTop + s * 0.012, (ohw - s * 0.012) * 2, oBot - oTop - s * 0.024, cut * 0.6);
        ctx.stroke();
        // THE GORGET: two pale chevrons at the throat — the heron's
        // neck written where the collar meets the dark.
        ctx.strokeStyle = st.trim;
        ctx.lineWidth = Math.max(1.5, s * 0.014);
        for (const [ci, cy] of [[0, 0.06], [1, 0.2]] as const) {
          ctx.beginPath();
          ctx.moveTo(cx - ohw * (0.5 - ci * 0.12), oBot + hh * cy);
          ctx.lineTo(cx, oBot + hh * (cy + 0.1));
          ctx.lineTo(cx + ohw * (0.5 - ci * 0.12), oBot + hh * cy);
          ctx.stroke();
        }
      } else {
        // From behind the sweep IS the statement; the seam and tail
        // keep the cloth hanging honest under it.
        ctx.fillStyle = shade(st.color, -16);
        ctx.fillRect(headX - hw * 0.05, headY - hh * 0.9, hw * 0.1, hh * 1.9);
        ctx.fillStyle = shade(st.color, -9);
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.32, headY + hh * 0.9);
        ctx.lineTo(headX + hw * 0.32, headY + hh * 0.9);
        ctx.lineTo(headX - lead * hw * 0.06, headY + hh * 1.85);
        ctx.closePath();
        ctx.fill();
      }
      // THE MIST: two soft breaths sliding off the rim and hem,
      // guttering on the fen clock — never gone, never held.
      const mk = fenlightK(f.nowMs, 0.5);
      for (const [mi, myB] of [[0, -0.5], [1, 0.75]] as const) {
        const u01 = ((f.nowMs * 0.00016) + mi * 0.5) % 1;
        const mx = headX - lead * hw * (1.1 + u01 * 0.9);
        const my = headY + hh * (myB + u01 * 0.28);
        ctx.globalAlpha = (0.13 + 0.18 * mk) * (1 - u01);
        ctx.fillStyle = st.trim;
        ctx.beginPath();
        ctx.ellipse(mx, my, hw * (0.3 + u01 * 0.24), hh * 0.13, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
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

  if (st.kind === 'greathelm' || st.kind === 'bascinet') {
    // The tournament box: flat-crowned, riveted, faceless. Visor cut
    // tracks the face like the eyes do (the pairX law).
    const shell = () => {
      chamferRect(ctx, headX - hw * 1.06, headY - hh * 1.1, hw * 2.12, hh * 2.08, cut);
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, headY - hh * 1.1, headY + hh * 0.98);
    if (!hurt) {
      ctx.fillStyle = shade(st.color, 16);
      ctx.fillRect(headX - hw * 0.8, headY - hh * 1.0, hw * 1.6, hh * 0.26);
      ctx.fillStyle = shade(st.color, -22);
      ctx.fillRect(headX - hw * 1.06, headY - hh * 0.16, hw * 2.12, headR * 0.2);
      // Brow rivets pin the band — the smith's signature.
      ctx.fillStyle = shade(st.color, 26);
      for (const rx of [-0.62, 0, 0.62]) {
        ctx.fillRect(headX + rx * hw - headR * 0.035, headY - hh * 0.12, headR * 0.07, headR * 0.07);
      }
    }
    if (!hurt && front) {
      if (st.kind === 'bascinet') {
        // The pig-face: an eye slit above a PROTRUDING snout box with
        // breath holes — the muzzle is the helmet's whole identity, so
        // it is drawn fat, bright-edged, and never as a thin line.
        ctx.fillStyle = '#170f1c';
        ctx.fillRect(vx - headR * 0.44 * sw, headY - hh * 0.28, headR * 0.88 * sw, hh * 0.17);
        ctx.fillStyle = shade(st.color, 12);
        ctx.beginPath();
        chamferRect(ctx, vx - headR * 0.4 * sw, headY - hh * 0.02, headR * 0.8 * sw, hh * 0.66, cut * 0.6);
        ctx.fill();
        // The muzzle's top plane catches the sun; its underside sits
        // in contact shade so the box reads as sticking OUT.
        ctx.fillStyle = shade(st.color, 30);
        ctx.fillRect(vx - headR * 0.4 * sw, headY - hh * 0.02, headR * 0.8 * sw, hh * 0.12);
        ctx.fillStyle = shade(st.color, -22);
        ctx.fillRect(vx - headR * 0.4 * sw, headY + hh * 0.52, headR * 0.8 * sw, hh * 0.12);
        // Breath holes: a row of fat punched dots, never pinpricks.
        ctx.fillStyle = shade(st.color, -34);
        for (const bx of [-0.2, 0, 0.2]) {
          ctx.fillRect(vx + bx * headR * sw - headR * 0.045, headY + hh * 0.24, headR * 0.09, headR * 0.09);
        }
      } else if (st.visor === 'cross') {
        // The reinforced cross: a bright riveted strap edging the
        // cut, the way the old great helms wore their faces — the
        // cut itself stays darkness. A bare dark cut on a blackened
        // shell was no face at all (the redmarch lesson).
        ctx.fillStyle = shade(st.trim, -6);
        ctx.fillRect(vx - headR * 0.14, headY - hh * 0.1, headR * 0.28, hh * 0.7);
        ctx.fillRect(vx - headR * 0.5, headY + hh * 0.03, headR * 1.0, hh * 0.26);
        ctx.fillStyle = '#170f1c';
        ctx.fillRect(vx - headR * 0.07, headY - hh * 0.05, headR * 0.14, hh * 0.6);
        ctx.fillRect(vx - headR * 0.4, headY + hh * 0.08, headR * 0.8, hh * 0.16);
      } else {
        ctx.fillStyle = '#170f1c';
        ctx.fillRect(vx - headR * 0.42 * sw, headY + hh * 0.02, headR * 0.84 * sw, hh * 0.15);
      }
    } else if (!hurt) {
      // Plain back plates: a riveted seam instead of a face.
      ctx.fillStyle = shade(st.color, -14);
      ctx.fillRect(headX - 0.01 * s, headY - hh * 0.9, 0.02 * s, hh * 1.7);
    }
  } else if (st.kind === 'barbute') {
    // THE SOLDIER'S BARBUTE: one hammered iron shell, and a bold T cut
    // clean through it — the darkness inside IS the face. Honest
    // metal, forged with intent: riveted brow band, a low forge ridge
    // over the crown, a flared nape skirt behind.
    const topY = headY - hh * 1.18;
    const botY = headY + hh * 1.0;
    const shell = () => {
      ctx.moveTo(headX - hw * 0.72, botY);
      ctx.lineTo(headX - hw * 1.04, headY + hh * 0.42);
      ctx.lineTo(headX - hw * 1.06, headY - hh * 0.5);
      ctx.quadraticCurveTo(headX - hw * 1.0, topY, headX, topY - hh * 0.05);
      ctx.quadraticCurveTo(headX + hw * 1.0, topY, headX + hw * 1.06, headY - hh * 0.5);
      ctx.lineTo(headX + hw * 1.04, headY + hh * 0.42);
      ctx.lineTo(headX + hw * 0.72, botY);
      ctx.closePath();
    };
    const tCut = () => {
      // One cut: the eye band flowing into the mouth slot, chin point.
      const ew = headR * 0.5 * sw;
      const mw = headR * 0.15 * sw;
      ctx.moveTo(vx - ew, headY - hh * 0.36);
      ctx.lineTo(vx + ew, headY - hh * 0.36);
      ctx.lineTo(vx + ew, headY - hh * 0.02);
      ctx.lineTo(vx + mw, headY + hh * 0.08);
      ctx.lineTo(vx + mw, headY + hh * 0.72);
      ctx.lineTo(vx, headY + hh * 0.84);
      ctx.lineTo(vx - mw, headY + hh * 0.72);
      ctx.lineTo(vx - mw, headY + hh * 0.08);
      ctx.lineTo(vx - ew, headY - hh * 0.02);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    if (!hurt) {
      // Hammer-mark facet: one quiet lit plane — the hand-forged read.
      ctx.fillStyle = shade(st.color, 7);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.62, headY - hh * 0.96);
      ctx.lineTo(headX - hw * 0.18, topY + hh * 0.1);
      ctx.lineTo(headX - hw * 0.34, headY - hh * 0.72);
      ctx.closePath();
      ctx.fill();
      // The forge ridge: a low keel over the crown, front-to-back.
      const arcK = 0.35 + 0.65 * profileK;
      ctx.strokeStyle = shade(st.color, 18);
      ctx.lineWidth = Math.max(1.5, s * 0.022);
      ctx.beginPath();
      ctx.moveTo(headX - ld * hw * 0.7 * arcK, headY - hh * 0.92);
      ctx.quadraticCurveTo(headX, topY - hh * 0.08, headX + ld * hw * 0.66 * arcK, headY - hh * 0.9);
      ctx.stroke();
      // Riveted brow band — worn where the work is.
      ctx.fillStyle = st.trim;
      ctx.fillRect(headX - hw * 1.05, headY - hh * 0.64, hw * 2.1, hh * 0.2);
      ctx.fillStyle = shade(st.color, 26);
      for (const rx of [-0.82, -0.52, 0.52, 0.82]) {
        ctx.fillRect(headX + rx * hw - headR * 0.032, headY - hh * 0.6, headR * 0.064, headR * 0.064);
      }
    }
    if (!hurt && front) {
      ctx.fillStyle = '#170f1c';
      ctx.beginPath();
      tCut();
      ctx.fill();
      // The ground rim: a bright filed edge where the cut was dressed.
      ctx.strokeStyle = shade(st.color, 24);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      tCut();
      ctx.stroke();
    } else if (!hurt) {
      // Behind: the riveted center seam and the flared nape skirt.
      ctx.fillStyle = shade(st.color, -14);
      ctx.fillRect(headX - 0.011 * s, topY + hh * 0.16, 0.022 * s, hh * 1.9);
      ctx.fillStyle = shade(st.color, -6);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.9, headY + hh * 0.6);
      ctx.lineTo(headX + hw * 0.9, headY + hh * 0.6);
      ctx.lineTo(headX + hw * 0.7, botY + hh * 0.14);
      ctx.lineTo(headX - hw * 0.7, botY + hh * 0.14);
      ctx.closePath();
      ctx.fill();
    }
  } else if (st.kind === 'armet') {
    // THE GROVE-KEEPER'S ARMET: a rounded skull with a slatted wedge
    // visor standing proud of the face, pivot roundels at the temples
    // (the armet's mechanical truth), and a gorget flare at the jaw so
    // the helm SEATS on the collar instead of ending at it.
    const topY = headY - hh * 1.14;
    const botY = headY + hh * 0.98;
    const shell = () => {
      ctx.moveTo(headX - hw * 1.14, botY);
      ctx.lineTo(headX - hw * 0.96, headY + hh * 0.4);
      ctx.lineTo(headX - hw * 1.04, headY - hh * 0.45);
      ctx.quadraticCurveTo(headX - hw * 0.98, topY, headX, topY);
      ctx.quadraticCurveTo(headX + hw * 0.98, topY, headX + hw * 1.04, headY - hh * 0.45);
      ctx.lineTo(headX + hw * 0.96, headY + hh * 0.4);
      ctx.lineTo(headX + hw * 1.14, botY);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    if (!hurt && front) {
      const vw = headR * 0.54 * sw;
      if (st.boneMask) {
        // THE BONE MASK: the armet consumes the mask as ITS face —
        // a carved death's-head plate standing where the wedge visor
        // would, brow ridge over dark pits, cheek arcs, a nasal keel,
        // and a tooth row biting the bevor line. The pivot roundels
        // still hold it: a trophy MOUNTED, never a painted-on face.
        const bc = st.boneMask.color;
        ctx.fillStyle = bc;
        ctx.beginPath();
        ctx.moveTo(vx - vw * 1.0, headY - hh * 0.52);
        ctx.lineTo(vx + vw * 1.0, headY - hh * 0.52);
        ctx.quadraticCurveTo(vx + vw * 1.06, headY + hh * 0.08, vx + vw * 0.56, headY + hh * 0.56);
        ctx.lineTo(vx + vw * 0.3, headY + hh * 0.72);
        ctx.lineTo(vx - vw * 0.3, headY + hh * 0.72);
        ctx.lineTo(vx - vw * 0.56, headY + hh * 0.56);
        ctx.quadraticCurveTo(vx - vw * 1.06, headY + hh * 0.08, vx - vw * 1.0, headY - hh * 0.52);
        ctx.closePath();
        ctx.fill();
        // The brow ridge: a lit shelf over the pits, its underside
        // carved into shadow — bone with a sun on it.
        ctx.fillStyle = shade(bc, 20);
        ctx.fillRect(vx - vw * 0.96, headY - hh * 0.52, vw * 1.92, hh * 0.14);
        ctx.fillStyle = shade(bc, -22);
        ctx.fillRect(vx - vw * 0.9, headY - hh * 0.38, vw * 1.8, hh * 0.07);
        // The eye pits: dark and deep — the emberEyes word kindles
        // inside them on its own breath.
        ctx.fillStyle = '#141a12';
        for (const es of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(vx + es * headR * 0.06 * sw, headY - hh * 0.24);
          ctx.lineTo(vx + es * headR * 0.4 * sw, headY - hh * 0.28);
          ctx.lineTo(vx + es * headR * 0.36 * sw, headY + hh * 0.1);
          ctx.lineTo(vx + es * headR * 0.08 * sw, headY + hh * 0.08);
          ctx.closePath();
          ctx.fill();
        }
        // The nasal keel: the carved nose notch, one shadow wedge
        // with a bone ridge catching light beside it.
        ctx.fillStyle = '#141a12';
        ctx.beginPath();
        ctx.moveTo(vx - vw * 0.09, headY + hh * 0.16);
        ctx.lineTo(vx + vw * 0.09, headY + hh * 0.16);
        ctx.lineTo(vx, headY + hh * 0.34);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(bc, 16);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(vx, headY - hh * 0.3);
        ctx.lineTo(vx, headY + hh * 0.12);
        ctx.stroke();
        // The grin: a dark seam along the jaw with bone teeth set in
        // it — the mask keeps its own dead smile over the bevor.
        ctx.fillStyle = shade(bc, -34);
        ctx.fillRect(vx - vw * 0.5, headY + hh * 0.46, vw * 1.0, hh * 0.16);
        ctx.fillStyle = bc;
        for (const u of [-0.36, -0.12, 0.12, 0.36]) {
          const txx = vx + u * vw;
          ctx.beginPath();
          ctx.moveTo(txx - vw * 0.075, headY + hh * 0.46);
          ctx.lineTo(txx + vw * 0.075, headY + hh * 0.46);
          ctx.lineTo(txx + vw * 0.05, headY + hh * 0.6);
          ctx.quadraticCurveTo(txx, headY + hh * 0.65, txx - vw * 0.05, headY + hh * 0.6);
          ctx.closePath();
          ctx.fill();
        }
        // One hairline crack wandering the crown of the mask — this
        // trophy has been struck before and kept its face.
        ctx.strokeStyle = shade(bc, -18);
        ctx.lineWidth = Math.max(1, s * 0.009);
        ctx.beginPath();
        ctx.moveTo(vx + vw * 0.62, headY - hh * 0.5);
        ctx.lineTo(vx + vw * 0.5, headY - hh * 0.36);
        ctx.lineTo(vx + vw * 0.6, headY - hh * 0.26);
        ctx.stroke();
      } else {
        // The wedge visor: a POINTED beak standing proud of the face —
        // its top plane catches the sun, its keel edge stays bright, so
        // the wedge reads as a wedge and never as a grille. Slats cut
        // ACROSS the beak's slope, snout-short, breathing not speaking.
        ctx.fillStyle = shade(st.color, -6);
        ctx.beginPath();
        ctx.moveTo(vx - vw, headY - hh * 0.42);
        ctx.lineTo(vx + vw, headY - hh * 0.42);
        ctx.lineTo(vx + vw * 0.7, headY + hh * 0.5);
        ctx.lineTo(vx, headY + hh * 0.84);
        ctx.lineTo(vx - vw * 0.7, headY + hh * 0.5);
        ctx.closePath();
        ctx.fill();
        // Sun on the top plane; the beak's bright keel down the center.
        ctx.fillStyle = shade(st.color, 28);
        ctx.fillRect(vx - vw, headY - hh * 0.42, vw * 2, hh * 0.1);
        ctx.strokeStyle = shade(st.color, 20);
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(vx, headY + hh * 0.02);
        ctx.lineTo(vx, headY + hh * 0.8);
        ctx.moveTo(vx - vw * 0.7, headY + hh * 0.5);
        ctx.lineTo(vx, headY + hh * 0.84);
        ctx.lineTo(vx + vw * 0.7, headY + hh * 0.5);
        ctx.stroke();
        // The eye slit, deep under the brow line.
        ctx.fillStyle = '#170f1c';
        ctx.fillRect(vx - vw * 0.88, headY - hh * 0.28, vw * 1.76, hh * 0.16);
        // Three short breath cuts riding the beak's slopes, ANGLED with
        // the wedge — never a flat stack.
        for (const es of [-1, 1]) {
          for (let i = 0; i < 3; i++) {
            const y0 = headY + hh * (0.06 + i * 0.17);
            ctx.beginPath();
            ctx.moveTo(vx + es * vw * 0.16, y0 + hh * 0.05);
            ctx.lineTo(vx + es * vw * (0.62 - i * 0.1), y0 - hh * 0.03);
            ctx.lineTo(vx + es * vw * (0.62 - i * 0.1), y0 + hh * 0.05);
            ctx.lineTo(vx + es * vw * 0.16, y0 + hh * 0.13);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
      // Pivot roundels: bossed discs where the visor hinges.
      const pc = st.jaw ?? st.trim;
      for (const es of [-1, 1]) {
        ctx.fillStyle = pc;
        ctx.beginPath();
        ctx.arc(headX + es * hw * 0.86, headY - hh * 0.32, headR * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(pc, 30);
        ctx.beginPath();
        ctx.arc(headX + es * hw * 0.86, headY - hh * 0.35, headR * 0.055, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (!hurt) {
      // Behind: center seam + the gorget flare's shade step.
      ctx.fillStyle = shade(st.color, -14);
      ctx.fillRect(headX - 0.01 * s, topY + hh * 0.12, 0.02 * s, hh * 1.9);
      ctx.fillStyle = shade(st.color, -8);
      ctx.fillRect(headX - hw * 1.0, headY + hh * 0.56, hw * 2.0, hh * 0.14);
    }
  } else if (st.kind === 'sallet') {
    // THE GLACIER SALLET: one smooth swept shell running past the
    // skull into a pointed tail, a single cold slit, and a bevor whose
    // lower edge hangs icicle teeth. The mountain wore it first.
    const topY = headY - hh * 1.16;
    const botY = headY + hh * 0.96;
    const u = -ld; // the tail trails the travel, like hair does
    const tailX = headX + u * hw * (1.45 + profileK * 0.6);
    const shell = () => {
      ctx.moveTo(headX + ld * hw * 0.78, botY);
      ctx.lineTo(headX + ld * hw * 1.05, headY + hh * 0.45);
      ctx.lineTo(headX + ld * hw * 1.06, headY - hh * 0.4);
      ctx.quadraticCurveTo(headX + ld * hw * 0.9, topY, headX - ld * hw * 0.08, topY);
      // The crown sweeps back and DOWN into the tail point.
      ctx.quadraticCurveTo(headX + u * hw * 1.14, topY + hh * 0.14, tailX, headY + hh * 0.3);
      ctx.quadraticCurveTo(headX + u * hw * 1.02, headY + hh * 0.34, headX + u * hw * 0.94, headY + hh * 0.6);
      ctx.lineTo(headX + u * hw * 0.72, botY);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    if (!hurt) {
      // The frost glaze: one broad sheen streak across the crown —
      // steel cold enough to fog.
      ctx.save();
      ctx.beginPath();
      shell();
      ctx.clip();
      ctx.strokeStyle = shade(st.color, 22);
      ctx.lineWidth = Math.max(2, s * 0.04);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.7, headY - hh * 0.55);
      ctx.quadraticCurveTo(headX - hw * 0.1, topY + hh * 0.12, headX + hw * 0.62, headY - hh * 0.75);
      ctx.stroke();
      ctx.restore();
      // The tail's under-facet: the swept edge keeps its thickness.
      ctx.strokeStyle = shade(st.color, -18);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(headX + u * hw * 0.7, headY + hh * 0.05);
      ctx.quadraticCurveTo(headX + u * hw * 1.05, headY + hh * 0.14, tailX - u * hw * 0.05, headY + hh * 0.28);
      ctx.stroke();
    }
    if (!hurt && front) {
      // The cold slit, with an ice gleam riding its upper lip.
      ctx.fillStyle = '#170f1c';
      ctx.fillRect(vx - headR * 0.46 * sw, headY - hh * 0.26, headR * 0.92 * sw, hh * 0.15);
      ctx.fillStyle = st.trim;
      ctx.fillRect(vx - headR * 0.46 * sw, headY - hh * 0.32, headR * 0.92 * sw, hh * 0.05);
      // The bevor: a paler chin plate rising to guard the jaw...
      const bw = headR * 0.52 * sw;
      ctx.fillStyle = st.jaw ?? shade(st.color, 8);
      ctx.beginPath();
      ctx.moveTo(vx - bw, headY + hh * 0.08);
      ctx.lineTo(vx + bw, headY + hh * 0.08);
      ctx.lineTo(vx + bw * 0.8, botY);
      ctx.lineTo(vx - bw * 0.8, botY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(st.jaw ?? st.color, -14);
      ctx.fillRect(vx - bw * 0.8, botY - hh * 0.1, bw * 1.6, hh * 0.1);
      // ...whose lower edge hangs icicle teeth: winter's dagged hem —
      // four NARROW drips of uneven length, never a pair of tusks.
      ctx.fillStyle = st.trim;
      for (const [tu, tl] of [[-0.36, 0.2], [-0.13, 0.38], [0.12, 0.26], [0.34, 0.14]] as const) {
        const px = vx + tu * headR * sw;
        ctx.beginPath();
        ctx.moveTo(px - headR * 0.045, botY - hh * 0.02);
        ctx.lineTo(px, botY + hh * tl);
        ctx.lineTo(px + headR * 0.045, botY - hh * 0.02);
        ctx.closePath();
        ctx.fill();
      }
    } else if (!hurt) {
      ctx.fillStyle = shade(st.color, -14);
      ctx.fillRect(headX - 0.01 * s, topY + hh * 0.2, 0.02 * s, hh * 1.8);
    }
  } else if (st.kind === 'radiant') {
    // THE RADIANT MASK: not a helmet with a face hole — a second FACE,
    // serene and gold. Narrow calm eyes, a brow sun-disc, a corona of
    // engraved rays over the crown. The wings ride separately.
    const topY = headY - hh * 1.14;
    const botY = headY + hh * 0.98;
    const shell = () => {
      ctx.moveTo(headX - hw * 0.66, botY);
      ctx.quadraticCurveTo(headX - hw * 1.1, headY + hh * 0.6, headX - hw * 1.05, headY - hh * 0.3);
      ctx.quadraticCurveTo(headX - hw * 1.0, topY, headX, topY);
      ctx.quadraticCurveTo(headX + hw * 1.0, topY, headX + hw * 1.05, headY - hh * 0.3);
      ctx.quadraticCurveTo(headX + hw * 1.1, headY + hh * 0.6, headX + hw * 0.66, botY);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    if (!hurt) {
      // The polish: one hard specular arc — gold answers the sun.
      ctx.strokeStyle = shade(st.color, 34);
      ctx.lineWidth = Math.max(1.5, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.55, headY - hh * 0.82);
      ctx.quadraticCurveTo(headX - hw * 0.08, topY + hh * 0.06, headX + hw * 0.42, headY - hh * 0.92);
      ctx.stroke();
    }
    if (!hurt && front) {
      // The corona: engraved rays radiating from the brow disc — cut
      // deep enough to shadow, or the crown reads blank at zoom.
      ctx.strokeStyle = shade(st.color, -22);
      ctx.lineWidth = Math.max(1.5, s * 0.02);
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        const a = -Math.PI / 2 + i * 0.44;
        const dy = headY - hh * 0.5;
        ctx.moveTo(vx + Math.cos(a) * headR * 0.32, dy + Math.sin(a) * headR * 0.3);
        ctx.lineTo(vx + Math.cos(a) * headR * 0.68, dy + Math.sin(a) * headR * 0.64);
      }
      ctx.stroke();
      // The sun-disc at the brow, ringed with its own engraving so it
      // separates from the gold behind it.
      ctx.strokeStyle = shade(st.color, -24);
      ctx.lineWidth = Math.max(1, s * 0.015);
      ctx.beginPath();
      ctx.arc(vx, headY - hh * 0.5, headR * 0.24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = st.trim;
      ctx.beginPath();
      ctx.arc(vx, headY - hh * 0.5, headR * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(st.trim, 32);
      ctx.beginPath();
      ctx.arc(vx - headR * 0.05, headY - hh * 0.55, headR * 0.08, 0, Math.PI * 2);
      ctx.fill();
      // The sculpted nose ridge — a face, not a plate.
      ctx.strokeStyle = shade(st.color, 16);
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.moveTo(vx, headY - hh * 0.02);
      ctx.lineTo(vx, headY + hh * 0.26);
      ctx.stroke();
      // The serene eyes: two dark almonds, calm as noon — wide enough
      // to read as a gaze, not a squint.
      ctx.fillStyle = '#170f1c';
      for (const es of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(vx + es * headR * 0.27 * sw, headY - hh * 0.08, headR * 0.16 * sw, headR * 0.062, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // The mouth line: gold keeps its counsel.
      ctx.strokeStyle = shade(st.color, -18);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(vx - headR * 0.16 * sw, headY + hh * 0.5);
      ctx.quadraticCurveTo(vx, headY + hh * 0.58, vx + headR * 0.16 * sw, headY + hh * 0.5);
      ctx.stroke();
    } else if (!hurt) {
      // Behind: the corona rays continue over the crown to the nape.
      ctx.fillStyle = shade(st.color, -14);
      ctx.fillRect(headX - 0.01 * s, topY + hh * 0.14, 0.02 * s, hh * 1.9);
      ctx.strokeStyle = shade(st.color, -10);
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.beginPath();
      for (const rx of [-0.55, 0.55]) {
        ctx.moveTo(headX + rx * hw, headY - hh * 0.7);
        ctx.lineTo(headX + rx * hw * 1.5, headY - hh * 0.3);
      }
      ctx.stroke();
    }
  } else if (st.kind === 'ramfort') {
    // THE BATTERING TOWER: a flat-topped siege bucket WIDER than the
    // head — armor as architecture. Riveted corner seams, a keel
    // plate down the face, twin eye slots, a punched breath grid; the
    // ram spirals bolt onto temple roundels.
    const wx = hw * 1.16;
    const topY = headY - hh * 1.08;
    const botY = headY + hh * 1.0;
    const shell = () => {
      chamferRect(ctx, headX - wx, topY, wx * 2, botY - topY, cut * 0.55);
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    if (!hurt) {
      // The rolled crown lip: a reinforcing edge, not a decoration.
      ctx.fillStyle = shade(st.color, 20);
      ctx.fillRect(headX - wx * 0.94, topY, wx * 1.88, hh * 0.14);
      // Corner seams, riveted — the bucket is BUILT, not raised.
      ctx.fillStyle = shade(st.color, -16);
      for (const sx of [-0.72, 0.72]) {
        ctx.fillRect(headX + sx * wx - s * 0.006, topY + hh * 0.16, s * 0.012, botY - topY - hh * 0.24);
      }
      ctx.fillStyle = shade(st.color, 24);
      for (const sx of [-0.72, 0.72]) {
        for (const ry of [-0.55, 0.05, 0.6]) {
          ctx.fillRect(headX + sx * wx - headR * 0.03, headY + ry * hh - headR * 0.03, headR * 0.06, headR * 0.06);
        }
      }
      // Temple roundels: the horn mounts, bolted clean through.
      for (const es of [-1, 1]) {
        const far = es !== ld;
        const wK = far ? Math.max(0.3, 1 - profileK * 0.65) : 1;
        ctx.fillStyle = st.trim;
        ctx.beginPath();
        ctx.arc(headX + es * wx * 0.78 * wK, headY - hh * 0.5, headR * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(st.trim, 26);
        ctx.beginPath();
        ctx.arc(headX + es * wx * 0.78 * wK, headY - hh * 0.5, headR * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (!hurt && front) {
      // The keel plate: a vertical reinforcement the face hides behind.
      const kc = st.jaw ?? shade(st.color, 8);
      ctx.fillStyle = kc;
      ctx.fillRect(vx - headR * 0.13 * sw, topY + hh * 0.14, headR * 0.26 * sw, botY - topY - hh * 0.2);
      ctx.fillStyle = shade(kc, 22);
      for (const ry of [0.3, 0.6]) {
        ctx.fillRect(vx - headR * 0.03, headY + ry * hh, headR * 0.06, headR * 0.06);
      }
      // Twin eye slots flanking the keel — the wall watches back.
      ctx.fillStyle = '#170f1c';
      for (const es of [-1, 1]) {
        const exx = vx + es * headR * 0.32 * sw;
        ctx.fillRect(exx - headR * 0.16 * sw, headY - hh * 0.28, headR * 0.32 * sw, hh * 0.15);
      }
      // The breath grid: punched squares low on the face.
      ctx.fillStyle = shade(st.color, -30);
      for (const es of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          ctx.fillRect(vx + es * headR * 0.32 * sw - headR * 0.04, headY + hh * (0.3 + i * 0.22), headR * 0.08, headR * 0.08);
        }
      }
    } else if (!hurt) {
      ctx.fillStyle = shade(st.color, -14);
      ctx.fillRect(headX - 0.01 * s, topY + hh * 0.16, 0.02 * s, botY - topY - hh * 0.3);
    }
  } else if (st.kind === 'warmask') {
    // THE SEA-WOLF'S WAR MASK: a weathered dome over a full bronze
    // face plate — sculpted brow arcs, a straight nose bar, the
    // mustache flare. The raider brings a SECOND face to the wall.
    const topY = headY - hh * 1.12;
    const botY = headY + hh * 0.98;
    const shell = () => {
      ctx.moveTo(headX - hw * 0.78, botY);
      ctx.lineTo(headX - hw * 1.05, headY + hh * 0.3);
      ctx.lineTo(headX - hw * 1.05, headY - hh * 0.4);
      ctx.quadraticCurveTo(headX - hw * 0.96, topY, headX, topY);
      ctx.quadraticCurveTo(headX + hw * 0.96, topY, headX + hw * 1.05, headY - hh * 0.4);
      ctx.lineTo(headX + hw * 1.05, headY + hh * 0.3);
      ctx.lineTo(headX + hw * 0.78, botY);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    if (!hurt && front) {
      // Cheek plates first, hinged and darker, flanking the mask.
      const mw = headR * 0.58 * sw;
      ctx.fillStyle = st.jaw ?? shade(st.color, -12);
      for (const es of [-1, 1]) {
        ctx.beginPath();
        chamferRect(ctx, vx + es * mw * 1.26 - headR * 0.19, headY + hh * 0.04, headR * 0.38, hh * 0.76, cut * 0.4);
        ctx.fill();
      }
      // The face plate: paler bronze, inset from the shell.
      ctx.fillStyle = st.mask ?? shade(st.color, 14);
      ctx.beginPath();
      chamferRect(ctx, vx - mw, headY - hh * 0.5, mw * 2, hh * 1.4, cut * 0.5);
      ctx.fill();
      // Rivets seat the plate on the shell — dots around the rim say
      // METAL before anything else gets to speak.
      ctx.fillStyle = st.trim;
      for (const [rx, ry] of [[-0.8, -0.35], [0.8, -0.35], [-0.8, 0.55], [0.8, 0.55]] as const) {
        ctx.beginPath();
        ctx.arc(vx + rx * mw, headY + ry * hh, headR * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }
      // The mask is GEOMETRY, not a portrait: dark bronze inlay cut in
      // hard angles — a T of brow bars and nose over wide angular eye
      // holes, a handlebar below. Curves made it a creepy little man;
      // angles make it a WAR MASK.
      const ink = st.jaw ?? shade(st.color, -22);
      // The eye holes: wide angular trapezoid cuts.
      ctx.fillStyle = '#170f1c';
      for (const es of [-1, 1]) {
        const ex = vx + es * headR * 0.3 * sw;
        ctx.beginPath();
        ctx.moveTo(ex - es * headR * 0.2 * sw, headY - hh * 0.24);
        ctx.lineTo(ex + es * headR * 0.16 * sw, headY - hh * 0.3);
        ctx.lineTo(ex + es * headR * 0.19 * sw, headY - hh * 0.06);
        ctx.lineTo(ex - es * headR * 0.2 * sw, headY - hh * 0.06);
        ctx.closePath();
        ctx.fill();
      }
      // The brow bar: one straight dark bar across both eyes...
      ctx.fillStyle = ink;
      ctx.fillRect(vx - headR * 0.54 * sw, headY - hh * 0.4, headR * 1.08 * sw, hh * 0.14);
      // ...dropping into the nose bar (a BAR, never a snout)...
      ctx.fillRect(vx - headR * 0.08, headY - hh * 0.4, headR * 0.16, hh * 0.62);
      // ...and the handlebar: two straight angled blades, tips out and
      // DOWN-swept — heraldry with an edge, nothing that smiles.
      for (const es of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(vx + es * headR * 0.05, headY + hh * 0.3);
        ctx.lineTo(vx + es * headR * 0.5 * sw, headY + hh * 0.4);
        ctx.lineTo(vx + es * headR * 0.54 * sw, headY + hh * 0.56);
        ctx.lineTo(vx + es * headR * 0.05, headY + hh * 0.44);
        ctx.closePath();
        ctx.fill();
      }
    } else if (!hurt) {
      ctx.fillStyle = shade(st.color, -14);
      ctx.fillRect(headX - 0.01 * s, topY + hh * 0.12, 0.02 * s, hh * 1.9);
    }
    if (!hurt) {
      // The crest band: nose-to-nape over the crown — the dragon's
      // back, riveted at the ends. Reads at every facing.
      const arcK = 0.35 + 0.65 * profileK;
      ctx.fillStyle = st.trim;
      ctx.beginPath();
      ctx.moveTo(headX - ld * hw * 0.8 * arcK, headY - hh * 0.88);
      ctx.quadraticCurveTo(headX, topY - hh * 0.18, headX + ld * hw * 0.8 * arcK, headY - hh * 0.88);
      ctx.lineTo(headX + ld * hw * 0.64 * arcK, headY - hh * 0.82);
      ctx.quadraticCurveTo(headX, topY + hh * 0.02, headX - ld * hw * 0.64 * arcK, headY - hh * 0.82);
      ctx.closePath();
      ctx.fill();
    }
  } else if (st.kind === 'dread') {
    // THE BLACK MAW: an overhanging brow shelf keeps the slit in its
    // own night; below it a saw-tooth bevor bites down over darkness.
    // The ember in the slit is the only warmth this helm ever holds.
    const topY = headY - hh * 1.14;
    const botY = headY + hh * 1.0;
    const shell = () => {
      ctx.moveTo(headX - hw * 0.62, botY);
      ctx.lineTo(headX - hw * 1.06, headY + hh * 0.3);
      ctx.lineTo(headX - hw * 1.12, headY - hh * 0.44);
      ctx.lineTo(headX - hw * 0.92, topY);
      ctx.lineTo(headX + hw * 0.92, topY);
      ctx.lineTo(headX + hw * 1.12, headY - hh * 0.44);
      ctx.lineTo(headX + hw * 1.06, headY + hh * 0.3);
      ctx.lineTo(headX + hw * 0.62, botY);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    if (!hurt && front) {
      // The brow shelf: a plate overhanging the slit, hard-shaded
      // beneath — the eyes live in architectural shadow. Its lit top
      // plane is the ONE bright value on the whole black helm, so the
      // jut reads even against the dark.
      ctx.fillStyle = shade(st.color, 22);
      ctx.beginPath();
      ctx.moveTo(vx - headR * 0.66 * sw, headY - hh * 0.58);
      ctx.lineTo(vx + headR * 0.66 * sw, headY - hh * 0.58);
      ctx.lineTo(vx + headR * 0.54 * sw, headY - hh * 0.24);
      ctx.lineTo(vx - headR * 0.54 * sw, headY - hh * 0.24);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(st.color, -34);
      ctx.fillRect(vx - headR * 0.54 * sw, headY - hh * 0.28, headR * 1.08 * sw, hh * 0.09);
      // The slit, and the ember banked inside it — a COOL core over
      // darkness, never a glare.
      ctx.fillStyle = '#170f1c';
      ctx.fillRect(vx - headR * 0.46 * sw, headY - hh * 0.18, headR * 0.92 * sw, hh * 0.16);
      ctx.fillStyle = st.trim;
      ctx.fillRect(vx - headR * 0.34 * sw, headY - hh * 0.14, headR * 0.68 * sw, hh * 0.08);
      ctx.fillStyle = shade(st.trim, 40);
      ctx.fillRect(vx - headR * 0.12 * sw, headY - hh * 0.13, headR * 0.24 * sw, hh * 0.06);
      // The maw: darkness for the teeth to bite into.
      ctx.fillStyle = '#170f1c';
      ctx.fillRect(vx - headR * 0.44 * sw, headY + hh * 0.12, headR * 0.88 * sw, hh * 0.64);
      // Saw teeth: forged, descending, deliberate.
      ctx.fillStyle = st.jaw ?? shade(st.color, 6);
      for (let i = -2; i <= 2; i++) {
        const px = vx + i * headR * 0.19 * sw;
        const tl = hh * (0.46 - Math.abs(i) * 0.08);
        ctx.beginPath();
        ctx.moveTo(px - headR * 0.09 * sw, headY + hh * 0.1);
        ctx.lineTo(px, headY + hh * 0.1 + tl);
        ctx.lineTo(px + headR * 0.09 * sw, headY + hh * 0.1);
        ctx.closePath();
        ctx.fill();
      }
      // The chin spike: the maw resolves to a point.
      ctx.beginPath();
      ctx.moveTo(vx - headR * 0.1 * sw, botY - hh * 0.06);
      ctx.lineTo(vx, botY + hh * 0.2);
      ctx.lineTo(vx + headR * 0.1 * sw, botY - hh * 0.06);
      ctx.closePath();
      ctx.fill();
    } else if (!hurt) {
      // Behind: a studded spine ridge climbs the skull.
      ctx.fillStyle = shade(st.color, -14);
      ctx.fillRect(headX - 0.011 * s, topY + hh * 0.1, 0.022 * s, hh * 2.0);
      ctx.fillStyle = shade(st.color, 10);
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(headX - headR * 0.045, topY + hh * (0.3 + i * 0.5), headR * 0.09, headR * 0.09);
      }
    }
  } else if (st.kind === 'briar') {
    // THE THORN CAGE: the visor is a WOVEN lattice of briar bars over
    // darkness — a hedge you cannot see into — under a twisted wreath
    // band at the brow. The forest forged this one.
    const topY = headY - hh * 1.12;
    const botY = headY + hh * 0.98;
    const shell = () => {
      ctx.moveTo(headX - hw * 0.7, botY);
      ctx.quadraticCurveTo(headX - hw * 1.08, headY + hh * 0.5, headX - hw * 1.05, headY - hh * 0.35);
      ctx.quadraticCurveTo(headX - hw * 1.0, topY, headX, topY);
      ctx.quadraticCurveTo(headX + hw * 1.0, topY, headX + hw * 1.05, headY - hh * 0.35);
      ctx.quadraticCurveTo(headX + hw * 1.08, headY + hh * 0.5, headX + hw * 0.7, botY);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    if (!hurt && front) {
      // The cage window, and the weave across it.
      const cw = headR * 0.52 * sw;
      const window = () => {
        chamferRect(ctx, vx - cw, headY - hh * 0.3, cw * 2, hh * 1.02, cut * 0.5);
      };
      ctx.fillStyle = '#170f1c';
      ctx.beginPath();
      window();
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      window();
      ctx.clip();
      // FAT woven bars — a lattice of grown wood, never wire. The two
      // weave directions take different values so the over/under
      // reads even at world zoom.
      const barC = st.jaw ?? st.trim;
      ctx.lineWidth = Math.max(2.5, s * 0.036);
      ctx.strokeStyle = shade(barC, -10);
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) {
        ctx.moveTo(vx - cw + i * cw, headY - hh * 0.42);
        ctx.lineTo(vx + cw + i * cw, headY + hh * 0.84);
      }
      ctx.stroke();
      ctx.strokeStyle = shade(barC, 8);
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) {
        ctx.moveTo(vx + cw + i * cw, headY - hh * 0.42);
        ctx.lineTo(vx - cw + i * cw, headY + hh * 0.84);
      }
      ctx.stroke();
      // Thorn nubs ride two crossings — the cage still grows.
      ctx.fillStyle = shade(barC, 22);
      for (const [nx, ny] of [[-0.5, 0.05], [0.5, 0.62]] as const) {
        ctx.beginPath();
        ctx.moveTo(vx + nx * cw - headR * 0.05, headY + ny * hh);
        ctx.lineTo(vx + nx * cw + headR * 0.02, headY + ny * hh - headR * 0.09);
        ctx.lineTo(vx + nx * cw + headR * 0.06, headY + ny * hh + headR * 0.03);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    } else if (!hurt) {
      ctx.fillStyle = shade(st.color, -14);
      ctx.fillRect(headX - 0.01 * s, topY + hh * 0.14, 0.02 * s, hh * 1.9);
    }
    if (!hurt) {
      // The wreath: briar beads twisting around the brow, the weave
      // alternating its lit half — over, under, over.
      const by = headY - hh * 0.56;
      for (let i = 0; i < 6; i++) {
        const u2 = -1 + (i + 0.5) / 3;
        ctx.fillStyle = i % 2 === 0 ? st.trim : shade(st.trim, -20);
        ctx.beginPath();
        ctx.ellipse(headX + u2 * hw * 0.9, by + (i % 2 === 0 ? -1 : 1) * hh * 0.035, hw * 0.19, hh * 0.1, u2 * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (st.kind === 'drake') {
    // THE DRAKE VISAGE, reborn — the slain drake's skull worn whole.
    // The bite IS the opening (the jaws-visor grammar): the upper jaw
    // arch holds a furnace-dark void, fangs hanging from a gum band
    // that follows the arch. The skull's own ember eyes ride the brow
    // shelf ABOVE the void — the drake still watches; whoever is
    // inside is nobody. Bone horns root at the REAR crown and TRAIL
    // the facing (the orientation clause: only face-side devices may
    // lead); a serrated spine crest runs crown to nape, tips swept
    // back, banked fire at every root. Fire dressed as patience.
    const t = profileK;
    const ds = st.drakeset ?? { horn: '#e6ddc8', ember: '#ff8848', maw: '#2e1512' };
    const topY = headY - hh * 1.14;
    const botY = headY + hh * 0.98;
    // ---- THE SPINE CREST (behind the shell): serrated plates crown
    // to nape, tips swept trailing. Structure — hurt paints it white
    // and the silhouette holds.
    const arcK = 0.35 + 0.65 * t;
    for (let i = 0; i < 4; i++) {
      const u = (-0.62 + i * 0.42) * arcK;
      const px = headX + ld * u * hw;
      const seat = topY + hh * (0.24 + u * u * 0.5);
      const tall = hh * (0.98 - Math.abs(u) * 0.16 - i * 0.07);
      const tipX = px - ld * hw * (0.4 + t * 0.16);
      ctx.fillStyle = hurt ? '#ffffff' : shade(st.color, -26);
      ctx.beginPath();
      ctx.moveTo(px - hw * 0.19, seat);
      ctx.lineTo(tipX, seat - tall);
      ctx.lineTo(px + hw * 0.21, seat);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        // The banked fire in each membrane root — lit from within,
        // never a badge on the surface; it rides HIGH on the plate so
        // the coal clears the crown line. Every root breathes on its
        // own offset of one rare furnace clock — staggered, never in
        // unison.
        const hot = (f.nowMs + i * 1130) % 4300 < 300;
        ctx.fillStyle = hot ? shade(ds.ember, 32) : ds.ember;
        ctx.beginPath();
        ctx.moveTo(px - hw * 0.11, seat - tall * 0.24);
        ctx.lineTo(px + (tipX - px) * 0.62, seat - tall * 0.74);
        ctx.lineTo(px + hw * 0.12, seat - tall * 0.2);
        ctx.closePath();
        ctx.fill();
      }
    }
    // ---- THE HORNS: two-plane filled bone assemblies rooted at the
    // rear crown. dir blends the frontal splay (+/-1) into the shared
    // trailing sweep (-ld) as the head turns; the far horn steps a
    // value darker at profile so the pair keeps its depth.
    for (const es of [-1, 1] as const) {
      const dir = es * (1 - t) - ld * t;
      const far = es * ld < 0;
      const rx = headX + es * hw * 0.6 * (1 - t) - ld * hw * 0.42 * t;
      const ry = headY - hh * (1.02 - 0.1 * t) + (far ? hh * 0.1 * t : 0);
      const tipX = rx + dir * hw * 1.48;
      const tipY = ry - hh * (1.02 - 0.24 * t);
      // Underside plane first, then the lit top plane over it.
      ctx.fillStyle = hurt ? '#ffffff' : shade(ds.horn, far ? -32 : -22);
      ctx.beginPath();
      ctx.moveTo(rx + dir * hw * 0.02, ry + hh * 0.24);
      ctx.quadraticCurveTo(rx + dir * hw * 0.94, ry + hh * 0.08, tipX, tipY);
      ctx.quadraticCurveTo(rx + dir * hw * 0.68, ry - hh * 0.14, rx - dir * hw * 0.04, ry - hh * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = hurt ? '#ffffff' : shade(ds.horn, far ? -14 : 0);
      ctx.beginPath();
      ctx.moveTo(rx - dir * hw * 0.04, ry - hh * 0.12);
      ctx.quadraticCurveTo(rx + dir * hw * 0.62, ry - hh * 0.4, tipX, tipY);
      ctx.quadraticCurveTo(rx + dir * hw * 0.56, ry - hh * 0.2, rx - dir * hw * 0.12, ry - hh * 0.36);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        // Growth-ring ridges near the root — horn, never plastic.
        ctx.strokeStyle = shade(ds.horn, -36);
        ctx.lineWidth = Math.max(1, s * 0.012);
        for (const k of [0.3, 0.5]) {
          const kx = rx + dir * hw * (0.14 + k * 1.05);
          const ky = ry - hh * (0.1 + k * 0.68);
          ctx.beginPath();
          ctx.moveTo(kx - dir * hw * 0.03, ky + hh * 0.17);
          ctx.lineTo(kx + dir * hw * 0.09, ky - hh * 0.04);
          ctx.stroke();
        }
        // The copper collar where horn meets skull.
        ctx.fillStyle = st.jaw ?? '#b05c30';
        ctx.beginPath();
        ctx.moveTo(rx - dir * hw * 0.18, ry - hh * 0.32);
        ctx.lineTo(rx + dir * hw * 0.26, ry - hh * 0.36);
        ctx.lineTo(rx + dir * hw * 0.32, ry + hh * 0.18);
        ctx.lineTo(rx - dir * hw * 0.14, ry + hh * 0.24);
        ctx.closePath();
        ctx.fill();
      }
    }
    // ---- THE SHELL: the skull mass. Its leading edge carries the
    // OVERBITE — cheek tucks in, the muzzle STEPS OUT past the face
    // line to a blunt bone nose, then slopes back up to the brow
    // boss the leading horn roots behind. The step deepens with the
    // turn: at profile the drake leads with its bite.
    const noseOut = headX + ld * hw * (1.36 + t * 0.42);
    const shell = () => {
      ctx.moveTo(headX + ld * hw * 0.76, botY);
      ctx.lineTo(headX + ld * hw * 1.06, headY + hh * 0.6);
      ctx.lineTo(headX + ld * hw * 1.02, headY + hh * 0.34);
      ctx.lineTo(noseOut - ld * hw * 0.04, headY + hh * 0.3);
      ctx.lineTo(noseOut, headY - hh * 0.02);
      ctx.lineTo(headX + ld * hw * 1.14, headY - hh * 0.3);
      ctx.lineTo(headX + ld * hw * 1.2, headY - hh * 0.56);
      ctx.lineTo(headX + ld * hw * 0.6, topY);
      ctx.lineTo(headX - ld * hw * 0.54, topY);
      ctx.quadraticCurveTo(headX - ld * hw * 1.08, topY + hh * 0.26, headX - ld * hw * (1.08 + t * 0.22), headY - hh * 0.24);
      ctx.lineTo(headX - ld * hw * (1.12 + t * 0.26), headY + hh * 0.44);
      ctx.lineTo(headX - ld * hw * 0.78, botY);
      ctx.lineTo(headX - ld * hw * 0.34, botY + hh * 0.16);
      ctx.lineTo(headX + ld * hw * 0.38, botY + hh * 0.16);
      ctx.closePath();
    };
    // THE BITE ARCH: apex over the brow, corners rolling into the
    // cheeks — the opening the wearer lives behind.
    const cx2 = headX + fx * headR * (0.3 + 0.2 * t);
    const ohw = hw * 0.7 * (1 - 0.46 * t);
    const cornerY = headY + hh * 0.18;
    const apexY = headY - hh * 0.4;
    const oBot = headY + hh * 0.8;
    const opening = () => {
      ctx.moveTo(cx2 - ohw, oBot);
      ctx.lineTo(cx2 - ohw, cornerY);
      ctx.quadraticCurveTo(cx2 - ohw * 0.52, apexY + hh * 0.06, cx2, apexY);
      ctx.quadraticCurveTo(cx2 + ohw * 0.52, apexY + hh * 0.06, cx2 + ohw, cornerY);
      ctx.lineTo(cx2 + ohw, oBot);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      // THE MUZZLE PLANE: the foreshortened top of the snout, brow to
      // nose ridge, sliding and squeezing with the facing — the plane
      // that says the bite comes TOWARD you.
      const mzSq = 1 - 0.4 * t;
      ctx.fillStyle = shade(st.color, 16);
      ctx.beginPath();
      ctx.moveTo(cx2 - ohw * 0.88 * mzSq + ld * hw * 0.1, headY - hh * 0.68);
      ctx.lineTo(cx2 + ohw * 0.88 * mzSq + ld * hw * 0.28, headY - hh * 0.62);
      ctx.lineTo(noseOut - ld * hw * 0.05, headY - hh * 0.26);
      ctx.lineTo(cx2 - ohw * 0.8 * mzSq + ld * hw * 0.02, headY - hh * 0.32);
      ctx.closePath();
      ctx.fill();
      // The bone nose front: one mid plane under the ridge, nostril
      // slits raked along it.
      ctx.fillStyle = shade(st.color, -2);
      ctx.beginPath();
      ctx.moveTo(cx2 - ohw * 0.8 * mzSq, headY - hh * 0.32);
      ctx.lineTo(noseOut - ld * hw * 0.05, headY - hh * 0.26);
      ctx.lineTo(noseOut - ld * hw * 0.01, headY + hh * 0.02);
      ctx.lineTo(cx2 - ohw * 0.76 * mzSq, headY - hh * 0.04);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shade(st.color, -32);
      ctx.lineWidth = Math.max(1, s * 0.013);
      for (const es of [0.34, 0.68]) {
        ctx.beginPath();
        ctx.moveTo(cx2 + ld * ohw * es * mzSq, headY - hh * 0.2);
        ctx.lineTo(cx2 + ld * ohw * (es + 0.15) * mzSq, headY - hh * 0.1);
        ctx.stroke();
      }
      // The cheek scute: one large lapped plate on the trailing
      // cheek — the hide remembered on the skull, drawn as ONE plane
      // with its lap edge, never a texture field.
      ctx.fillStyle = shade(st.color, -10);
      ctx.beginPath();
      ctx.arc(headX - ld * hw * 0.72, headY + hh * 0.28, hw * 0.34, -Math.PI * 0.1, Math.PI * 1.1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shade(st.color, 12);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.arc(headX - ld * hw * 0.72, headY + hh * 0.28, hw * 0.3, Math.PI * 0.08, Math.PI * 0.92);
      ctx.stroke();
      ctx.restore();
      // THE EMBER EYES: the drake's own, riding the brow shelf above
      // the bite — dark socket wedges holding molten slit bars,
      // anchored to the ARCH's own center so the gaze tracks the
      // face at every diagonal (head-centered eyes drift off the
      // bite as cx2 slides — the round-2 alignment verdict). The
      // trailing eye narrows and dies past the half turn; from
      // behind there are no eyes at all. They gutter brighter on
      // their own rare clock, out of step with the crest coals.
      if (front) {
        const eyeHot = f.nowMs % 3700 < 260;
        const eyeC = eyeHot ? shade(ds.ember, 34) : ds.ember;
        for (const es of [1, -1] as const) {
          if (es === -ld && t >= 0.5) continue;
          const sq = es === -ld ? 1 - t * 0.8 : 1;
          ctx.fillStyle = ds.maw;
          ctx.beginPath();
          ctx.moveTo(cx2 + es * ohw * 0.8, headY - hh * 0.66);
          ctx.lineTo(cx2 + es * ohw * 1.5, headY - hh * 0.56);
          ctx.lineTo(cx2 + es * ohw * 1.42, headY - hh * 0.38);
          ctx.lineTo(cx2 + es * ohw * 0.84, headY - hh * 0.44);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = eyeC;
          const ew = ohw * 0.42 * sq;
          ctx.fillRect(cx2 + es * ohw * 1.14 - ew * 0.5, headY - hh * 0.585, ew, hh * 0.115);
        }
      }
    }
    if (!hurt && front) {
      // Inside the bite: the furnace void. Opaque night first, a
      // deeper fold under the arch, and low behind the fangs the
      // banked coals — the one hint there is fire down the throat.
      ctx.save();
      ctx.beginPath();
      opening();
      ctx.clip();
      ctx.fillStyle = ds.maw;
      ctx.fillRect(cx2 - ohw, apexY - hh * 0.05, ohw * 2, oBot - apexY + hh * 0.1);
      ctx.fillStyle = shade(ds.maw, -26);
      ctx.beginPath();
      ctx.moveTo(cx2 - ohw, cornerY);
      ctx.quadraticCurveTo(cx2 - ohw * 0.52, apexY + hh * 0.06, cx2, apexY);
      ctx.quadraticCurveTo(cx2 + ohw * 0.52, apexY + hh * 0.06, cx2 + ohw, cornerY);
      ctx.lineTo(cx2 + ohw * 0.8, headY + hh * 0.1);
      ctx.lineTo(cx2 - ld * ohw * 0.1, headY + hh * 0.2);
      ctx.lineTo(cx2 - ohw * 0.8, headY + hh * 0.06);
      ctx.closePath();
      ctx.fill();
      // The coals: the furnace floor risen — a deep rust bed, one
      // coal that never goes out, and two that stand brighter on
      // staggered furnace clocks. Embers, never a lamp — the values
      // stay deep and the dark stays the master.
      ctx.fillStyle = shade(ds.ember, -44);
      ctx.beginPath();
      ctx.moveTo(cx2 - ohw * 0.78, oBot);
      ctx.quadraticCurveTo(cx2, oBot - hh * 0.22, cx2 + ohw * 0.78, oBot);
      ctx.lineTo(cx2 + ohw, oBot);
      ctx.lineTo(cx2 - ohw, oBot);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(ds.ember, -24);
      ctx.fillRect(cx2 - ld * ohw * 0.32, oBot - hh * 0.12, hw * 0.06, hh * 0.05);
      if (f.nowMs % 5100 < 380) {
        ctx.fillStyle = shade(ds.ember, -8);
        ctx.fillRect(cx2 + ld * ohw * 0.22, oBot - hh * 0.14, hw * 0.07, hh * 0.06);
      }
      if (f.nowMs % 3900 < 300) {
        ctx.fillStyle = shade(ds.ember, -16);
        ctx.fillRect(cx2 + ld * ohw * 0.52, oBot - hh * 0.1, hw * 0.05, hh * 0.045);
      }
      ctx.restore();
      // THE GUM BAND: one continuous band following the arch — the
      // seared jaw the fangs grow from, never a straight strip.
      ctx.strokeStyle = shade(st.color, -30);
      ctx.lineWidth = Math.max(2.5, headR * 0.15);
      ctx.beginPath();
      ctx.moveTo(cx2 - ohw, cornerY);
      ctx.quadraticCurveTo(cx2 - ohw * 0.52, apexY + hh * 0.06, cx2, apexY);
      ctx.quadraticCurveTo(cx2 + ohw * 0.52, apexY + hh * 0.06, cx2 + ohw, cornerY);
      ctx.stroke();
      // THE FANGS: five hanging along the arch normals — plumb at
      // the apex, raking inward at the corners, the apex-adjacent
      // pair longest. Bone shares nothing with skin.
      const archPt = (k: number): [number, number] => {
        const ax = cx2 + k * ohw;
        const q = 1 - Math.abs(k);
        const ay = cornerY + (apexY - cornerY) * (q * (2 - q));
        return [ax, ay];
      };
      ctx.fillStyle = ds.horn;
      for (let i = 0; i < 5; i++) {
        const k = -0.82 + (i / 4) * 1.64;
        const [ax, ay] = archPt(k);
        const nx = -k * 0.5;
        const big = Math.abs(Math.abs(k) - 0.41) < 0.2;
        const tl = hh * (big ? 0.36 : 0.2);
        const tw2 = ohw * (big ? 0.12 : 0.09);
        ctx.beginPath();
        ctx.moveTo(ax - tw2, ay + hh * 0.01);
        ctx.lineTo(ax + tw2, ay + hh * 0.01);
        ctx.lineTo(ax + nx * tw2 * 2 + tw2 * 0.1, ay + tl);
        ctx.closePath();
        ctx.fill();
      }
      // The under-fangs: a modest pair rising from the chin guard,
      // rooted in their own lower gum arc (teeth need a gum).
      ctx.strokeStyle = shade(st.color, -30);
      ctx.lineWidth = Math.max(2, headR * 0.1);
      ctx.beginPath();
      ctx.moveTo(cx2 - ohw * 0.72, oBot + hh * 0.02);
      ctx.quadraticCurveTo(cx2, oBot + hh * 0.14, cx2 + ohw * 0.72, oBot + hh * 0.02);
      ctx.stroke();
      ctx.fillStyle = ds.horn;
      for (const es of [-1, 1]) {
        const ax = cx2 + es * ohw * 0.56;
        ctx.beginPath();
        ctx.moveTo(ax - ohw * 0.08, oBot + hh * 0.06);
        ctx.lineTo(ax + ohw * 0.08, oBot + hh * 0.06);
        ctx.lineTo(ax + es * ohw * 0.02, oBot - hh * 0.16);
        ctx.closePath();
        ctx.fill();
      }
    } else if (!hurt) {
      // The skull from behind: the dark spine ridge the crest rides,
      // running crown to nape, and two rows of lapped KITE scutes —
      // the drake's pointed, keeled scale, one ground value with the
      // lap edge a step LIGHTER (light over dark is what makes a lap
      // read on the shaded back) and a keel line running to every
      // point.
      ctx.fillStyle = shade(st.color, -18);
      ctx.fillRect(headX - hw * 0.07, topY + hh * 0.22, hw * 0.14, hh * 2.0);
      for (let row = 0; row < 2; row++) {
        const ry = headY + hh * (-0.06 + row * 0.52);
        for (let i = 0; i < 3; i++) {
          const px = headX + (-0.6 + i * 0.6 + (row % 2) * 0.3) * hw;
          if (Math.abs(px - headX) > hw * 0.85) continue;
          ctx.fillStyle = shade(st.color, -8);
          ctx.beginPath();
          ctx.moveTo(px - hw * 0.32, ry - hh * 0.16);
          ctx.lineTo(px + hw * 0.32, ry - hh * 0.16);
          ctx.lineTo(px + hw * 0.26, ry + hh * 0.14);
          ctx.lineTo(px, ry + hh * 0.36);
          ctx.lineTo(px - hw * 0.26, ry + hh * 0.14);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = shade(st.color, 10);
          ctx.lineWidth = Math.max(1, s * 0.013);
          ctx.beginPath();
          ctx.moveTo(px - hw * 0.32, ry - hh * 0.155);
          ctx.lineTo(px + hw * 0.32, ry - hh * 0.155);
          ctx.stroke();
          ctx.strokeStyle = shade(st.color, -26);
          ctx.lineWidth = Math.max(1, s * 0.011);
          ctx.beginPath();
          ctx.moveTo(px, ry - hh * 0.1);
          ctx.lineTo(px, ry + hh * 0.32);
          ctx.stroke();
        }
      }
    }
  } else if (st.kind === 'aurochs') {
    // THE AUROCHS: a bull's skull in black bronze — flat wide crown,
    // a heavy riveted brow shelf, wide-set eye slits, and a broad
    // muzzle standing OFF the lower face with a brass ring hung from
    // its lip. Wider than the head like the ramfort: a siege animal
    // wearing armor, not a soldier wearing a bucket.
    const topY = headY - hh * 1.12;
    const botY = headY + hh * 1.0;
    const wx = 1.14;
    const shell = () => {
      ctx.moveTo(headX - hw * 0.8, botY);
      ctx.lineTo(headX - hw * wx, headY + hh * 0.3);
      ctx.lineTo(headX - hw * wx, headY - hh * 0.6);
      ctx.quadraticCurveTo(headX - hw * (wx - 0.12), topY, headX - hw * 0.4, topY - hh * 0.04);
      ctx.lineTo(headX + hw * 0.4, topY - hh * 0.04);
      ctx.quadraticCurveTo(headX + hw * (wx - 0.12), topY, headX + hw * wx, headY - hh * 0.6);
      ctx.lineTo(headX + hw * wx, headY + hh * 0.3);
      ctx.lineTo(headX + hw * 0.8, botY);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    if (!hurt) {
      // The flat crown's lit plane — the 2.5D top the camera earns.
      ctx.fillStyle = shade(st.color, 18);
      ctx.fillRect(headX - hw * 0.84, topY - hh * 0.02, hw * 1.68, hh * 0.2);
      // The brow shelf: one heavy dark bar the whole face hangs from,
      // pinned with bright rivets — the forged line between skull
      // and muzzle.
      ctx.fillStyle = shade(st.color, -20);
      ctx.fillRect(headX - hw * 1.02, headY - hh * 0.5, hw * 2.04, hh * 0.17);
      ctx.fillStyle = shade(st.color, 24);
      for (const rx of [-0.72, -0.24, 0.24, 0.72]) {
        ctx.fillRect(headX + rx * hw - headR * 0.032, headY - hh * 0.46, headR * 0.064, headR * 0.064);
      }
    }
    if (!hurt && front) {
      // Wide-set eye slits under the shelf — a bull watches you from
      // the sides of its head.
      ctx.fillStyle = '#170f1c';
      for (const es of [-1, 1]) {
        ctx.fillRect(
          vx + es * headR * 0.42 * sw - headR * 0.17 * sw,
          headY - hh * 0.26,
          headR * 0.34 * sw,
          hh * 0.13,
        );
      }
      // The muzzle: broader than the bascinet's snout — top plane in
      // sun, underside in contact shade, nostril slots punched dark.
      const mzTop = headY + hh * 0.02;
      ctx.fillStyle = shade(st.color, 10);
      ctx.beginPath();
      chamferRect(ctx, vx - headR * 0.52 * sw, mzTop, headR * 1.04 * sw, hh * 0.7, cut * 0.55);
      ctx.fill();
      ctx.fillStyle = shade(st.color, 30);
      ctx.fillRect(vx - headR * 0.52 * sw, mzTop, headR * 1.04 * sw, hh * 0.13);
      ctx.fillStyle = shade(st.color, -22);
      ctx.fillRect(vx - headR * 0.52 * sw, mzTop + hh * 0.57, headR * 1.04 * sw, hh * 0.13);
      // Nostril slots: two fat vertical punches, flared outward.
      ctx.fillStyle = shade(st.color, -36);
      for (const es of [-1, 1]) {
        ctx.save();
        ctx.translate(vx + es * headR * 0.26 * sw, mzTop + hh * 0.34);
        ctx.rotate(es * 0.2);
        ctx.fillRect(-headR * 0.045, -hh * 0.12, headR * 0.09, hh * 0.24);
        ctx.restore();
      }
      // THE RING: brass, hung from the muzzle's lip — the one piece
      // of jewelry a siege animal respects. Drawn fat, glinted once.
      const ringR = headR * 0.17;
      const ry = mzTop + hh * 0.72 + ringR * 0.5;
      ctx.strokeStyle = st.trim;
      ctx.lineWidth = Math.max(2, headR * 0.075);
      ctx.beginPath();
      ctx.arc(vx, ry, ringR * sw, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = shade(st.trim, 36);
      ctx.beginPath();
      ctx.arc(vx - ringR * 0.55 * sw, ry - ringR * 0.55, headR * 0.045, 0, Math.PI * 2);
      ctx.fill();
    } else if (!hurt) {
      // From behind: the nape band and a riveted spine seam.
      ctx.fillStyle = shade(st.color, -16);
      ctx.fillRect(headX - 0.011 * s, topY + hh * 0.16, 0.022 * s, hh * 1.9);
      ctx.fillStyle = shade(st.color, -24);
      ctx.fillRect(headX - hw * 0.86, headY + hh * 0.52, hw * 1.72, hh * 0.16);
    }
  } else if (st.kind === 'barrow') {
    // THE BARROW CROWN: the king under the hill. A tall dome of
    // green-black iron, the face a dark cavity behind straight bars,
    // and the crown itself — old gold, blunt-pointed — forged AROUND
    // the helm. Rank as structure, never a hat on a hat.
    const topY = headY - hh * 1.2;
    const botY = headY + hh * 1.0;
    const shell = () => {
      ctx.moveTo(headX - hw * 0.78, botY);
      ctx.lineTo(headX - hw * 1.05, headY + hh * 0.44);
      ctx.lineTo(headX - hw * 1.06, headY - hh * 0.72);
      ctx.quadraticCurveTo(headX - hw * 1.0, topY, headX - hw * 0.34, topY - hh * 0.03);
      ctx.lineTo(headX + hw * 0.34, topY - hh * 0.03);
      ctx.quadraticCurveTo(headX + hw * 1.0, topY, headX + hw * 1.06, headY - hh * 0.72);
      ctx.lineTo(headX + hw * 1.05, headY + hh * 0.44);
      ctx.lineTo(headX + hw * 0.78, botY);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    if (!hurt && front) {
      // The cavity: one dark window where a face would be. Whoever is
      // in there has been in there a long time.
      const cw = headR * 0.52 * sw;
      ctx.fillStyle = '#170f1c';
      ctx.beginPath();
      chamferRect(ctx, vx - cw, headY - hh * 0.4, cw * 2, hh * 1.14, cut * 0.5);
      ctx.fill();
      // The bars: three fat iron uprights over the dark — the briar
      // law holds, bars carry mass or they read as scratches.
      ctx.fillStyle = shade(st.color, 10);
      for (const u of [-0.6, 0, 0.6]) {
        ctx.fillRect(vx + u * cw - headR * 0.05 * sw, headY - hh * 0.38, headR * 0.1 * sw, hh * 1.1);
      }
      // Each bar's lit east edge — round iron, not flat straps.
      ctx.fillStyle = shade(st.color, 26);
      for (const u of [-0.6, 0, 0.6]) {
        ctx.fillRect(vx + u * cw + headR * 0.02 * sw, headY - hh * 0.36, headR * 0.025 * sw, hh * 1.06);
      }
      // The bevor: a jaw plate seating the cage from below.
      const jc = st.jaw ?? shade(st.color, -12);
      ctx.fillStyle = jc;
      ctx.fillRect(vx - cw * 1.12, headY + hh * 0.74, cw * 2.24, hh * 0.24);
      ctx.fillStyle = shade(jc, 16);
      ctx.fillRect(vx - cw * 1.12, headY + hh * 0.74, cw * 2.24, hh * 0.06);
    } else if (!hurt) {
      // From behind: the spine seam and two weather notches the hill
      // bit out of the rim.
      ctx.fillStyle = shade(st.color, -16);
      ctx.fillRect(headX - 0.01 * s, topY + hh * 0.2, 0.02 * s, hh * 1.9);
    }
    if (!hurt) {
      // THE CROWN: an old-gold band ringing the skull, blunt trapezoid
      // points rising off it — rising frontal, a full ring at profile
      // (the spikesCrown arc grammar, worn as gold).
      const bandY = headY - hh * 0.66;
      ctx.fillStyle = shade(st.trim, -18);
      ctx.fillRect(headX - hw * 1.02, bandY, hw * 2.04, hh * 0.16);
      ctx.fillStyle = st.trim;
      ctx.fillRect(headX - hw * 1.02, bandY, hw * 2.04, hh * 0.1);
      const arcK = 0.35 + 0.65 * profileK;
      for (let i = 0; i < 3; i++) {
        const u2 = (-0.62 + i * 0.62) * arcK;
        const px = headX + ld * u2 * hw;
        const tall = hh * (0.34 - Math.abs(u2) * 0.1);
        ctx.fillStyle = st.trim;
        ctx.beginPath();
        ctx.moveTo(px - hw * 0.16, bandY + hh * 0.02);
        ctx.lineTo(px - hw * 0.09, bandY - tall);
        ctx.lineTo(px + hw * 0.09, bandY - tall);
        ctx.lineTo(px + hw * 0.16, bandY + hh * 0.02);
        ctx.closePath();
        ctx.fill();
        // The point's shaded west facet — forged gold, not foil.
        ctx.fillStyle = shade(st.trim, -20);
        ctx.beginPath();
        ctx.moveTo(px - hw * 0.16, bandY + hh * 0.02);
        ctx.lineTo(px - hw * 0.09, bandY - tall);
        ctx.lineTo(px - hw * 0.02, bandY - tall);
        ctx.lineTo(px - hw * 0.05, bandY + hh * 0.02);
        ctx.closePath();
        ctx.fill();
      }
      // Weather notches: the hill kept its king a long time.
      ctx.fillStyle = shade(st.color, -30);
      ctx.fillRect(headX - hw * 0.98, headY + hh * 0.18, headR * 0.09, headR * 0.07);
      ctx.fillRect(headX + hw * 0.82, headY - hh * 0.12, headR * 0.07, headR * 0.09);
    }
  } else if (st.kind === 'tempest') {
    // THE TEMPEST CROWN: the storm wore a helm once. A tall storm-
    // steel dome ringed by forged crown points, a keel ridge down the
    // face, glowing slit eyes — and on its own beat an arc SNAPS
    // between the points. The crown carries weather.
    const topY = headY - hh * 1.22;
    const botY = headY + hh * 0.98;
    const shell = () => {
      ctx.moveTo(headX - hw * 0.8, botY);
      ctx.lineTo(headX - hw * 1.04, headY + hh * 0.3);
      ctx.lineTo(headX - hw * 1.04, headY - hh * 0.6);
      ctx.quadraticCurveTo(headX - hw * 0.96, topY, headX - hw * 0.3, topY - hh * 0.02);
      ctx.lineTo(headX + hw * 0.3, topY - hh * 0.02);
      ctx.quadraticCurveTo(headX + hw * 0.96, topY, headX + hw * 1.04, headY - hh * 0.6);
      ctx.lineTo(headX + hw * 1.04, headY + hh * 0.3);
      ctx.lineTo(headX + hw * 0.8, botY);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    // The crown points: forged storm-steel, blunt-tipped, riding the
    // crown ring — rising frontal, a full ring at profile (the barrow
    // crown's arc grammar, worn as weather). Tips remembered so the
    // arc knows where to snap.
    const arcK = 0.35 + 0.65 * profileK;
    const tips: Array<[number, number]> = [];
    if (!hurt) {
      const bandY = topY + hh * 0.16;
      for (let i = 0; i < 3; i++) {
        const u2 = (-0.58 + i * 0.58) * arcK;
        const px = headX + ld * u2 * hw;
        const tall = hh * (0.58 - Math.abs(u2) * 0.14);
        tips.push([px, bandY - tall]);
        ctx.fillStyle = st.color;
        ctx.beginPath();
        ctx.moveTo(px - hw * 0.19, bandY + hh * 0.04);
        ctx.lineTo(px - hw * 0.07, bandY - tall);
        ctx.lineTo(px + hw * 0.07, bandY - tall);
        ctx.lineTo(px + hw * 0.19, bandY + hh * 0.04);
        ctx.closePath();
        ctx.fill();
        // Lit east facet, shaded west — forged, not foil.
        ctx.fillStyle = shade(st.color, 16);
        ctx.beginPath();
        ctx.moveTo(px + hw * 0.03, bandY - tall);
        ctx.lineTo(px + hw * 0.07, bandY - tall);
        ctx.lineTo(px + hw * 0.19, bandY + hh * 0.04);
        ctx.lineTo(px + hw * 0.06, bandY + hh * 0.04);
        ctx.closePath();
        ctx.fill();
        // Each point tipped in the bright trim — lightning rods.
        ctx.fillStyle = st.trim;
        ctx.fillRect(px - hw * 0.055, bandY - tall - hh * 0.08, hw * 0.11, hh * 0.1);
      }
      // The riveted brow band the points stand on.
      ctx.fillStyle = shade(st.color, -18);
      ctx.fillRect(headX - hw * 1.0, headY - hh * 0.52, hw * 2.0, hh * 0.15);
      ctx.fillStyle = shade(st.color, 24);
      for (const rx of [-0.68, -0.23, 0.23, 0.68]) {
        ctx.fillRect(headX + rx * hw - headR * 0.03, headY - hh * 0.49, headR * 0.06, headR * 0.06);
      }
    }
    if (!hurt && front) {
      // The keel: a lit prow ridge down the face — the storm splits
      // on it. Slit eyes glow either side, pulsing with the charge.
      ctx.fillStyle = shade(st.color, 14);
      ctx.fillRect(vx - headR * 0.05 * sw, headY - hh * 0.36, headR * 0.1 * sw, hh * 1.2);
      const glowCol = st.arcs?.color ?? st.trim;
      // The eyes never go dark — the storm is home; the pulse is the
      // charge breathing, not the light deciding.
      const pulse = 0.78 + 0.22 * Math.sin(f.nowMs * 0.0023);
      for (const es of [-1, 1]) {
        const exx = vx + es * headR * 0.32 * sw;
        ctx.fillStyle = '#170f1c';
        ctx.fillRect(exx - headR * 0.19 * sw, headY - hh * 0.1, headR * 0.38 * sw, hh * 0.15);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = glowCol;
        ctx.fillRect(exx - headR * 0.14 * sw, headY - hh * 0.07, headR * 0.28 * sw, hh * 0.09);
        ctx.globalAlpha = 1;
      }
      // The bevor: a jaw plate under the storm.
      ctx.fillStyle = st.jaw ?? shade(st.color, -12);
      ctx.fillRect(vx - headR * 0.5 * sw, headY + hh * 0.5, headR * 1.0 * sw, hh * 0.34);
      ctx.fillStyle = shade(st.jaw ?? st.color, 14);
      ctx.fillRect(vx - headR * 0.5 * sw, headY + hh * 0.5, headR * 1.0 * sw, hh * 0.08);
    } else if (!hurt) {
      // From behind: the spine seam and a nape skirt.
      ctx.fillStyle = shade(st.color, -16);
      ctx.fillRect(headX - 0.01 * s, topY + hh * 0.24, 0.02 * s, hh * 1.8);
      ctx.fillStyle = shade(st.color, -24);
      ctx.fillRect(headX - hw * 0.82, headY + hh * 0.56, hw * 1.64, hh * 0.16);
    }
    if (!hurt && st.arcs && tips.length >= 2) {
      // THE SNAP: on its own beat an arc jumps between two crown
      // points, re-jagging every flicker — the helm never forgets
      // what it is wearing.
      const gate = Math.sin(f.nowMs * 0.0021 + 0.7);
      if (gate > 0.5) {
        const a = Math.min(1, (gate - 0.5) * 3);
        const seed = Math.floor(f.nowMs / 90);
        const [x0, y0] = tips[0]!;
        const [x1, y1] = tips[tips.length - 1]!;
        const mx = (x0 + x1) / 2 + Math.sin(seed * 3.7) * hw * 0.18;
        const my = Math.min(y0, y1) - hh * 0.14 + Math.sin(seed * 2.3) * hh * 0.08;
        for (const [lw, alpha, colr] of [
          [0.028, 0.25 * a, st.arcs.color],
          [0.011, 0.95 * a, shade(st.arcs.color, 32)],
        ] as const) {
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = colr;
          ctx.lineWidth = Math.max(1, s * lw);
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(mx, my);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }
  } else if (st.kind === 'furnace') {
    // THE FURNACE: a squat riveted smelter worn as a helm — flat
    // crown with two vent slots, a grate of fat bars over a molten
    // cavity, and the glow inside breathing on the forge's own beat.
    // The fire is the face.
    const topY = headY - hh * 1.05;
    const botY = headY + hh * 1.0;
    const wx = 1.12;
    const shell = () => {
      ctx.moveTo(headX - hw * 0.86, botY);
      ctx.lineTo(headX - hw * wx, headY + hh * 0.42);
      ctx.lineTo(headX - hw * wx, headY - hh * 0.62);
      ctx.quadraticCurveTo(headX - hw * (wx - 0.1), topY, headX - hw * 0.5, topY - hh * 0.03);
      ctx.lineTo(headX + hw * 0.5, topY - hh * 0.03);
      ctx.quadraticCurveTo(headX + hw * (wx - 0.1), topY, headX + hw * wx, headY - hh * 0.62);
      ctx.lineTo(headX + hw * wx, headY + hh * 0.42);
      ctx.lineTo(headX + hw * 0.86, botY);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    const glow = st.emberEyes?.color ?? st.trim;
    const breath = 0.5 + 0.5 * Math.sin(f.nowMs * 0.0011);
    if (!hurt) {
      // The flat crown's lit plane, and two vent slots punched
      // through it — the fire needs to breathe.
      ctx.fillStyle = shade(st.color, 18);
      ctx.fillRect(headX - hw * 0.88, topY - hh * 0.01, hw * 1.76, hh * 0.18);
      for (const es of [-1, 1]) {
        const vxx = headX + es * hw * 0.38;
        ctx.fillStyle = '#170f1c';
        ctx.fillRect(vxx - hw * 0.14, topY + hh * 0.01, hw * 0.28, hh * 0.1);
        ctx.globalAlpha = 0.35 + 0.5 * breath;
        ctx.fillStyle = glow;
        ctx.fillRect(vxx - hw * 0.1, topY + hh * 0.03, hw * 0.2, hh * 0.06);
        ctx.globalAlpha = 1;
      }
      // Corner seams riveted — boilerwork, honest about it.
      ctx.fillStyle = shade(st.color, 24);
      for (const [rx, ry] of [
        [-0.94, -0.44], [0.94, -0.44], [-0.94, 0.26], [0.94, 0.26],
      ] as const) {
        ctx.fillRect(
          headX + rx * hw - headR * 0.032, headY + ry * hh,
          headR * 0.064, headR * 0.064,
        );
      }
    }
    if (!hurt && front) {
      // The grate: a dark cavity with the melt glowing low inside,
      // then fat jaw bars over it — the briar law, bars carry mass.
      const cw = headR * 0.56 * sw;
      ctx.fillStyle = '#170f1c';
      ctx.beginPath();
      chamferRect(ctx, vx - cw, headY - hh * 0.3, cw * 2, hh * 1.06, cut * 0.5);
      ctx.fill();
      // The melt: brightest at the bottom of the cavity, breathing.
      ctx.globalAlpha = 0.4 + 0.5 * breath;
      ctx.fillStyle = glow;
      ctx.fillRect(vx - cw * 0.9, headY + hh * 0.28, cw * 1.8, hh * 0.42);
      ctx.globalAlpha = (0.4 + 0.5 * breath) * 0.5;
      ctx.fillRect(vx - cw * 0.9, headY - hh * 0.06, cw * 1.8, hh * 0.34);
      ctx.globalAlpha = 1;
      const bars = st.jaw ?? shade(st.color, 8);
      ctx.fillStyle = bars;
      for (const u of [-0.62, 0, 0.62]) {
        ctx.fillRect(vx + u * cw - headR * 0.055 * sw, headY - hh * 0.28, headR * 0.11 * sw, hh * 1.02);
      }
      ctx.fillStyle = shade(bars, 22);
      for (const u of [-0.62, 0, 0.62]) {
        ctx.fillRect(vx + u * cw + headR * 0.02 * sw, headY - hh * 0.26, headR * 0.028 * sw, hh * 0.98);
      }
      // One cross bar cinches the grate — a furnace door, not a cage.
      ctx.fillStyle = shade(bars, -10);
      ctx.fillRect(vx - cw * 1.06, headY + hh * 0.12, cw * 2.12, hh * 0.13);
    } else if (!hurt) {
      // From behind: the spine seam, and one heat crack the plates
      // never quite closed — the secret glows from every side.
      ctx.fillStyle = shade(st.color, -16);
      ctx.fillRect(headX - 0.011 * s, topY + hh * 0.16, 0.022 * s, hh * 1.9);
      ctx.globalAlpha = 0.5 + 0.4 * breath;
      ctx.strokeStyle = glow;
      ctx.lineWidth = Math.max(1.5, s * 0.016);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.34, headY + hh * 0.14);
      ctx.lineTo(headX - hw * 0.12, headY + hh * 0.38);
      ctx.lineTo(headX - hw * 0.28, headY + hh * 0.64);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  } else if (st.kind === 'wyrm') {
    // THE WYRM'S VISAGE: dragon-forged emerald steel — lapped brow
    // scales, a heavy shelf over slit eyes that burn, a protruding
    // snout with vent-lit nostrils, and a dorsal ridge down the
    // crown. Nobody alive has seen the animal; the smith had notes.
    const topY = headY - hh * 1.14;
    const botY = headY + hh * 1.0;
    const shell = () => {
      ctx.moveTo(headX - hw * 0.8, botY);
      ctx.lineTo(headX - hw * 1.06, headY + hh * 0.36);
      ctx.lineTo(headX - hw * 1.04, headY - hh * 0.56);
      ctx.quadraticCurveTo(headX - hw * 0.92, topY, headX - hw * 0.3, topY - hh * 0.02);
      ctx.lineTo(headX + hw * 0.3, topY - hh * 0.02);
      ctx.quadraticCurveTo(headX + hw * 0.92, topY, headX + hw * 1.04, headY - hh * 0.56);
      ctx.lineTo(headX + hw * 1.06, headY + hh * 0.36);
      ctx.lineTo(headX + hw * 0.8, botY);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    const glow = st.emberEyes?.color ?? st.trim;
    if (!hurt) {
      // Lapped brow scales: two rows, EACH rimmed bright — the drake
      // law; unrimmed same-hue scallops read as hair.
      ctx.save();
      ctx.beginPath();
      shell();
      ctx.clip();
      for (let row = 0; row < 2; row++) {
        const ry = topY + hh * (0.3 + row * 0.26);
        for (let i = 0; i < 5; i++) {
          const px = headX + (-0.84 + i * 0.42 + (row % 2) * 0.21) * hw;
          ctx.fillStyle = shade(st.color, -4 - row * 10);
          ctx.beginPath();
          ctx.arc(px, ry, hw * 0.25, 0, Math.PI);
          ctx.fill();
          ctx.strokeStyle = shade(st.color, 20);
          ctx.lineWidth = Math.max(1, s * 0.013);
          ctx.beginPath();
          ctx.arc(px, ry, hw * 0.23, Math.PI * 0.12, Math.PI * 0.88);
          ctx.stroke();
        }
      }
      ctx.restore();
      // The dorsal ridge: three steel points down the crown line,
      // each with a bright trim leading edge.
      const arcK = 0.35 + 0.65 * profileK;
      for (let i = 0; i < 3; i++) {
        const u2 = (-0.5 + i * 0.5) * arcK;
        const px = headX + ld * u2 * hw;
        const seat = topY + hh * (0.16 + u2 * u2 * 0.5);
        const tall = hh * (0.5 - Math.abs(u2) * 0.16);
        ctx.fillStyle = shade(st.color, -8);
        ctx.beginPath();
        ctx.moveTo(px - hw * 0.15, seat);
        ctx.lineTo(px - ld * hw * 0.15, seat - tall);
        ctx.lineTo(px + hw * 0.15, seat);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = st.trim;
        ctx.beginPath();
        ctx.moveTo(px + hw * 0.06, seat);
        ctx.lineTo(px - ld * hw * 0.13, seat - tall * 0.92);
        ctx.lineTo(px + hw * 0.15, seat);
        ctx.closePath();
        ctx.fill();
      }
    }
    if (!hurt && front) {
      // The brow shelf: one heavy dark bar — the eyes live under it.
      ctx.fillStyle = shade(st.color, -20);
      ctx.fillRect(headX - hw * 1.0, headY - hh * 0.42, hw * 2.0, hh * 0.16);
      // Slit eyes that burn, pulsing on a slow breath — never out.
      const pulse = 0.72 + 0.28 * Math.sin(f.nowMs * 0.0016);
      for (const es of [-1, 1]) {
        const exx = vx + es * headR * 0.34 * sw;
        ctx.fillStyle = '#170f1c';
        ctx.beginPath();
        ctx.moveTo(exx - es * headR * 0.2 * sw, headY - hh * 0.12);
        ctx.lineTo(exx + es * headR * 0.16 * sw, headY - hh * 0.24);
        ctx.lineTo(exx + es * headR * 0.18 * sw, headY - hh * 0.06);
        ctx.lineTo(exx - es * headR * 0.16 * sw, headY - hh * 0.0);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.moveTo(exx - es * headR * 0.14 * sw, headY - hh * 0.1);
        ctx.lineTo(exx + es * headR * 0.12 * sw, headY - hh * 0.19);
        ctx.lineTo(exx + es * headR * 0.13 * sw, headY - hh * 0.07);
        ctx.lineTo(exx - es * headR * 0.11 * sw, headY - hh * 0.03);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // The snout: a forged wedge standing OFF the face (the bascinet
      // law), nostril vents lit from inside, tooth hooks on the lip.
      const sn = st.jaw ?? shade(st.color, -6);
      ctx.fillStyle = sn;
      ctx.beginPath();
      chamferRect(ctx, vx - headR * 0.46 * sw, headY + hh * 0.06, headR * 0.92 * sw, hh * 0.6, cut * 0.5);
      ctx.fill();
      ctx.fillStyle = shade(sn, 26);
      ctx.fillRect(vx - headR * 0.46 * sw, headY + hh * 0.06, headR * 0.92 * sw, hh * 0.12);
      ctx.fillStyle = shade(sn, -20);
      ctx.fillRect(vx - headR * 0.46 * sw, headY + hh * 0.54, headR * 0.92 * sw, hh * 0.12);
      const vent = 0.45 + 0.55 * Math.sin(f.nowMs * 0.0016 + 1.4);
      for (const es of [-1, 1]) {
        ctx.fillStyle = '#170f1c';
        ctx.beginPath();
        ctx.arc(vx + es * headR * 0.22 * sw, headY + hh * 0.28, headR * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = vent;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(vx + es * headR * 0.22 * sw, headY + hh * 0.28, headR * 0.035, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#e8dcc0';
      for (const tu of [-0.26, 0, 0.26]) {
        const px = vx + tu * headR * sw;
        ctx.beginPath();
        ctx.moveTo(px - headR * 0.05, headY + hh * 0.66);
        ctx.lineTo(px, headY + hh * 0.48);
        ctx.lineTo(px + headR * 0.05, headY + hh * 0.66);
        ctx.closePath();
        ctx.fill();
      }
    } else if (!hurt) {
      // From behind: the scale spine and two lapped nape plates.
      ctx.fillStyle = shade(st.color, -16);
      ctx.fillRect(headX - 0.01 * s, topY + hh * 0.18, 0.02 * s, hh * 1.9);
      ctx.fillStyle = shade(st.color, -24);
      ctx.fillRect(headX - hw * 0.7, headY + hh * 0.42, hw * 1.4, hh * 0.14);
      ctx.fillRect(headX - hw * 0.56, headY + hh * 0.64, hw * 1.12, hh * 0.14);
    }
  } else if (st.kind === 'warcrown') {
    // THE WARCROWN — the oathgold head, second forging: the idol's
    // serene mask is DEAD (it read as porcelain, not power). This is
    // the crown militant: an angular flared war-helm wearing a TRUE
    // radiate crown of forged electrum points, a crimson jewel set at
    // the brow, angry ember cuts for eyes, engraved sunburst cheek
    // plates, and the king's mantling cascading crimson from under
    // the crown band. Regal AND dangerous — a coronation with teeth.
    const topY = headY - hh * 1.18;
    const botY = headY + hh * 0.98;
    const vc = st.vigil?.color ?? '#ffd98a';
    const mantC = '#7e222c';
    const mkick = Math.sin(f.nowMs * 0.0016) * hw * 0.12;
    if (!hurt) {
      // THE MANTLING first, so the metal always rides OVER the cloth:
      // crimson tongues spilling from under the crown band, swept
      // down and out behind the temples — the king's colors framing
      // the helm at every facing, tails alive on the march wind.
      for (const es of [-1, 1]) {
        const kk = mkick * es * 0.4;
        ctx.fillStyle = es === lead ? mantC : shade(mantC, -14);
        ctx.beginPath();
        ctx.moveTo(headX + es * hw * 0.66, headY - hh * 0.92);
        ctx.quadraticCurveTo(
          headX + es * hw * 1.34, headY - hh * 0.56,
          headX + es * hw * 1.22 + kk, headY + hh * 0.18,
        );
        ctx.lineTo(headX + es * hw * 0.9 + kk * 0.6, headY + hh * 0.26);
        ctx.quadraticCurveTo(headX + es * hw * 1.0, headY - hh * 0.2, headX + es * hw * 0.6, headY - hh * 0.55);
        ctx.closePath();
        ctx.fill();
        // The fold: a flat inner panel a step deeper — the cloth's
        // weight said with a second plane, never a drawn line.
        ctx.fillStyle = shade(mantC, -22);
        ctx.beginPath();
        ctx.moveTo(headX + es * hw * 0.78, headY - hh * 0.7);
        ctx.quadraticCurveTo(
          headX + es * hw * 1.16, headY - hh * 0.34,
          headX + es * hw * 1.08 + kk, headY + hh * 0.14,
        );
        ctx.lineTo(headX + es * hw * 0.94 + kk * 0.7, headY + hh * 0.2);
        ctx.quadraticCurveTo(headX + es * hw * 0.98, headY - hh * 0.22, headX + es * hw * 0.68, headY - hh * 0.56);
        ctx.closePath();
        ctx.fill();
      }
    }
    // THE WINGS: the king's pinions — two great layered electrum
    // fans swept up and back off the temples, three forged blades a
    // side stepping rear-tall to front-short, an orb finial socketed
    // at each root (the crown's own furniture). The banners fly from
    // the shoulders; the wings fly from the head. Painted before the
    // shell so the roots tuck under; structure, so they hold the
    // hurt-flash silhouette. The far wing narrows as the head turns
    // — the fins law.
    for (const es of [-1, 1]) {
      const wK = es === (lead || 1) ? 1 : Math.max(0.3, 1 - profileK * 0.7);
      const rx = headX + es * hw * 0.84;
      const ry = headY - hh * 0.38;
      for (const [bi, txk, tyk] of [
        [0, 0.7, -0.95], [1, 1.16, -0.62], [2, 1.5, -0.22],
      ] as const) {
        const tipx = rx + es * hw * txk * wK;
        const tipy = ry + hh * tyk;
        ctx.fillStyle = hurt ? '#ffffff' : shade(st.jaw ?? st.color, -14 + bi * 16);
        ctx.beginPath();
        ctx.moveTo(rx - es * hw * 0.1, ry - hh * 0.04);
        ctx.quadraticCurveTo(
          rx + es * hw * txk * 0.28 * wK, ry + hh * tyk * 0.82 - hh * 0.1,
          tipx, tipy,
        );
        ctx.lineTo(tipx - es * hw * 0.03 * wK, tipy + hh * 0.26);
        ctx.quadraticCurveTo(
          rx + es * hw * (txk * 0.34 + 0.1) * wK, ry + hh * tyk * 0.5 + hh * 0.16,
          rx + es * hw * 0.22, ry + hh * 0.16,
        );
        ctx.closePath();
        ctx.fill();
      }
      if (!hurt) {
        // The root orb — depth on the blades comes from their three
        // stepped fills alone, never an edge line.
        ctx.fillStyle = shade(st.trim, 12);
        ctx.beginPath();
        ctx.arc(rx, ry, hw * 0.09, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(st.trim, 34);
        ctx.beginPath();
        ctx.arc(rx - hw * 0.03, ry - hh * 0.03, hw * 0.032, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // THE RADIATE CROWN: five forged points standing on the crown
    // plateau, painted before the shell so their roots tuck under —
    // center tallest, the rank descending outward, every point a
    // two-facet blade (lit west, turned east) with the outermost
    // pair carrying orb finials: the same finial the shoulder spars
    // fly. One family of furniture, helm to shoulder.
    const ptsBaseY = topY + hh * 0.14;
    for (const [u, ph, orb] of [
      [-0.66, 0.5, true], [-0.33, 0.74, false], [0, 1.0, false],
      [0.33, 0.74, false], [0.66, 0.5, true],
    ] as const) {
      const px = headX + u * hw;
      const pw = hw * (0.16 - Math.abs(u) * 0.05);
      const tipY = ptsBaseY - hh * ph;
      ctx.fillStyle = hurt ? '#ffffff' : st.trim;
      ctx.beginPath();
      ctx.moveTo(px - pw, ptsBaseY);
      ctx.lineTo(px - pw * 0.1, tipY);
      ctx.lineTo(px + pw, ptsBaseY);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = shade(st.trim, -20);
        ctx.beginPath();
        ctx.moveTo(px - pw * 0.1, tipY);
        ctx.lineTo(px + pw, ptsBaseY);
        ctx.lineTo(px + pw * 0.2, ptsBaseY);
        ctx.closePath();
        ctx.fill();
        if (orb) {
          ctx.fillStyle = shade(st.trim, 12);
          ctx.beginPath();
          ctx.arc(px - pw * 0.1, tipY - hh * 0.05, hw * 0.055, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = shade(st.trim, 34);
          ctx.beginPath();
          ctx.arc(px - pw * 0.14, tipY - hh * 0.065, hw * 0.02, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    if (!hurt) {
      // The center point's diamond finial — the summit of the whole
      // rig keeps the highest light.
      ctx.fillStyle = shade(st.trim, 30);
      ctx.beginPath();
      ctx.moveTo(headX, ptsBaseY - hh * 1.0 - hh * 0.14);
      ctx.lineTo(headX + hw * 0.05, ptsBaseY - hh * 1.0 - hh * 0.04);
      ctx.lineTo(headX, ptsBaseY - hh * 1.0 + hh * 0.06);
      ctx.lineTo(headX - hw * 0.05, ptsBaseY - hh * 1.0 - hh * 0.04);
      ctx.closePath();
      ctx.fill();
    }
    // THE SHELL: angular and flared — wide at the jaw with hard
    // cheek-flange cusps hooking down off the corners, concave taper
    // to the crown plateau. A war helm's mass with a fortress's edge.
    const shell = () => {
      ctx.moveTo(headX - hw * 0.86, botY);
      ctx.lineTo(headX - hw * 0.98, headY + hh * 0.52);
      ctx.lineTo(headX - hw * 1.28, headY + hh * 0.42);
      ctx.lineTo(headX - hw * 1.06, headY + hh * 0.12);
      ctx.lineTo(headX - hw * 1.0, headY - hh * 0.45);
      ctx.quadraticCurveTo(headX - hw * 1.02, topY + hh * 0.16, headX - hw * 0.66, topY + hh * 0.06);
      ctx.quadraticCurveTo(headX, topY - hh * 0.06, headX + hw * 0.66, topY + hh * 0.06);
      ctx.quadraticCurveTo(headX + hw * 1.02, topY + hh * 0.16, headX + hw * 1.0, headY - hh * 0.45);
      ctx.lineTo(headX + hw * 1.06, headY + hh * 0.12);
      ctx.lineTo(headX + hw * 1.28, headY + hh * 0.42);
      ctx.lineTo(headX + hw * 0.98, headY + hh * 0.52);
      ctx.lineTo(headX + hw * 0.86, botY);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    if (!hurt) {
      // THE FACETS: the dome breaks into flat panels — alternating
      // value planes converging on the crown plateau, the flat-vector
      // way to say "forged in sections". No engraved line pairs: the
      // panel EDGE is where two fills meet. Clipped to the shell so
      // the faceting lives at every facing.
      ctx.save();
      ctx.beginPath();
      shell();
      ctx.clip();
      const gy0 = topY + hh * 0.3;
      const gy1 = headY + hh * 0.02;
      for (const [uA, uB] of [[-0.9, -0.54], [-0.18, 0.18], [0.54, 0.9]] as const) {
        ctx.fillStyle = shade(st.color, -8);
        ctx.beginPath();
        ctx.moveTo(headX + uA * hw * 0.74, gy0);
        ctx.quadraticCurveTo(headX + uA * hw * 0.94, (gy0 + gy1) / 2, headX + uA * hw * 1.0, gy1);
        ctx.lineTo(headX + uB * hw * 1.0, gy1);
        ctx.quadraticCurveTo(headX + uB * hw * 0.94, (gy0 + gy1) / 2, headX + uB * hw * 0.74, gy0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    if (!hurt) {
      // THE CROWN BAND: a full-width electrum band seated where shell
      // meets crown — engraved, beaded, the thing the points GROW
      // from. Two-value metal so it reads forged, then bead studs.
      ctx.strokeStyle = shade(st.trim, -16);
      ctx.lineWidth = hh * 0.2;
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.92, topY + hh * 0.22);
      ctx.quadraticCurveTo(headX, topY + hh * 0.06, headX + hw * 0.92, topY + hh * 0.22);
      ctx.stroke();
      ctx.strokeStyle = st.trim;
      ctx.lineWidth = hh * 0.12;
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.9, topY + hh * 0.19);
      ctx.quadraticCurveTo(headX, topY + hh * 0.03, headX + hw * 0.9, topY + hh * 0.19);
      ctx.stroke();
      ctx.fillStyle = shade(st.trim, 28);
      for (const u of [-0.72, -0.44, -0.16, 0.16, 0.44, 0.72]) {
        ctx.beginPath();
        ctx.arc(headX + u * hw, topY + hh * (0.14 + Math.abs(u) * 0.1), hw * 0.035, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (!hurt && front) {
      // THE VOID VISOR: the fourth forging keeps no face at all.
      // One smooth angular plate of night-bronze hangs from the
      // crown band, split by a forged electrum prow keel and cut by
      // a single burning chevron where eyes would be — the keel
      // breaks the fire into two angled lights, and that is all the
      // face the kingdom is given. Menace by absence: there is
      // nothing behind the slit but the vigil.
      const wake = Math.max(0, Math.sin(f.nowMs * 0.0009 + 2 * 2.094) - 0.45) / 0.55;
      const jc = st.jaw ?? shade(st.color, 10);
      const tr = st.trim;
      const vw = headR * 0.8 * sw;
      const vTop = headY - hh * 0.6;
      const vBot = headY + hh * 0.6;
      // The bevor first, so the visor laps it: two chevron throat
      // lames closing to the prow point, each with a lit upper edge.
      for (const [i, wk2, oy] of [[0, 1.0, 0.56], [1, 0.8, 0.78]] as const) {
        ctx.fillStyle = i === 0 ? shade(jc, -6) : shade(jc, -16);
        ctx.beginPath();
        ctx.moveTo(vx - headR * 0.54 * sw * wk2, headY + hh * oy);
        ctx.lineTo(vx, headY + hh * (oy + 0.18));
        ctx.lineTo(vx + headR * 0.54 * sw * wk2, headY + hh * oy);
        ctx.lineTo(vx + headR * 0.54 * sw * wk2, headY + hh * (oy + 0.14));
        ctx.lineTo(vx, headY + hh * (oy + 0.32));
        ctx.lineTo(vx - headR * 0.54 * sw * wk2, headY + hh * (oy + 0.14));
        ctx.closePath();
        ctx.fill();
        // The lit lap: a flat chevron plane along the top edge, not
        // a stroked line.
        ctx.fillStyle = shade(jc, 10);
        ctx.beginPath();
        ctx.moveTo(vx - headR * 0.54 * sw * wk2, headY + hh * oy);
        ctx.lineTo(vx, headY + hh * (oy + 0.18));
        ctx.lineTo(vx + headR * 0.54 * sw * wk2, headY + hh * oy);
        ctx.lineTo(vx + headR * 0.54 * sw * wk2, headY + hh * (oy + 0.05));
        ctx.lineTo(vx, headY + hh * (oy + 0.23));
        ctx.lineTo(vx - headR * 0.54 * sw * wk2, headY + hh * (oy + 0.05));
        ctx.closePath();
        ctx.fill();
      }
      // The plate itself: angular, prow-chinned, temple-flared.
      const visor = () => {
        ctx.moveTo(vx - vw, vTop + hh * 0.12);
        ctx.lineTo(vx - vw * 1.05, headY + hh * 0.04);
        ctx.lineTo(vx - vw * 0.58, vBot - hh * 0.06);
        ctx.lineTo(vx, vBot + hh * 0.16);
        ctx.lineTo(vx + vw * 0.58, vBot - hh * 0.06);
        ctx.lineTo(vx + vw * 1.05, headY + hh * 0.04);
        ctx.lineTo(vx + vw, vTop + hh * 0.12);
        ctx.quadraticCurveTo(vx, vTop - hh * 0.08, vx - vw, vTop + hh * 0.12);
        ctx.closePath();
      };
      ctx.fillStyle = '#241a12';
      ctx.beginPath();
      visor();
      ctx.fill();
      // The west facet catches what light there is — the keel line
      // is where the plate breaks.
      ctx.save();
      ctx.beginPath();
      visor();
      ctx.clip();
      ctx.fillStyle = '#39291c';
      ctx.beginPath();
      ctx.moveTo(vx, vTop - hh * 0.1);
      ctx.lineTo(vx - vw * 1.2, vTop);
      ctx.lineTo(vx - vw * 1.2, vBot + hh * 0.4);
      ctx.lineTo(vx, vBot + hh * 0.24);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // The electrum hem the visor hangs by, riveted at the brow —
      // the plate's edge against the shell is a value break, not a
      // drawn outline (the shader owns outlines).
      ctx.strokeStyle = shade(tr, -6);
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(vx - vw * 0.98, vTop + hh * 0.12);
      ctx.quadraticCurveTo(vx, vTop - hh * 0.06, vx + vw * 0.98, vTop + hh * 0.12);
      ctx.stroke();
      ctx.fillStyle = shade(tr, 20);
      for (const u of [-0.66, -0.22, 0.22, 0.66]) {
        ctx.beginPath();
        ctx.arc(vx + u * vw, vTop + hh * (0.17 - Math.abs(u) * 0.06), headR * 0.03, 0, Math.PI * 2);
        ctx.fill();
      }
      // THE BURNING CHEVRON: one slit cut clear across the void,
      // dipping at the center — a scowl drawn in fire, tapering to
      // points at both ends.
      const eyeY = headY - hh * 0.1;
      const sy = eyeY + hh * 0.08;
      const tipY = eyeY - hh * 0.1;
      const th = hh * 0.3;
      ctx.fillStyle = '#170f1c';
      ctx.beginPath();
      ctx.moveTo(vx - vw * 0.82, tipY - th * 0.28);
      ctx.lineTo(vx, sy - th * 0.5);
      ctx.lineTo(vx + vw * 0.82, tipY - th * 0.28);
      ctx.lineTo(vx + vw * 0.82, tipY + th * 0.34);
      ctx.lineTo(vx, sy + th * 0.6);
      ctx.lineTo(vx - vw * 0.82, tipY + th * 0.34);
      ctx.closePath();
      ctx.fill();
      const pulse = Math.min(1, 0.78 + 0.16 * Math.sin(f.nowMs * 0.0021) + 0.3 * wake);
      if (wake > 0.04) {
        ctx.globalAlpha = wake * 0.35;
        ctx.fillStyle = vc;
        ctx.beginPath();
        ctx.ellipse(vx, eyeY, vw * 0.95, hh * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.globalAlpha = pulse;
      ctx.fillStyle = vc;
      ctx.beginPath();
      ctx.moveTo(vx - vw * 0.76, tipY - th * 0.1);
      ctx.lineTo(vx, sy - th * 0.28);
      ctx.lineTo(vx + vw * 0.76, tipY - th * 0.1);
      ctx.lineTo(vx + vw * 0.76, tipY + th * 0.18);
      ctx.lineTo(vx, sy + th * 0.4);
      ctx.lineTo(vx - vw * 0.76, tipY + th * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      // THE PROW KEEL: the forged electrum ridge splitting the void,
      // brow to chin — it crosses the fire and cuts it into two
      // angled lights without ever drawing a face. Two facets, lit
      // west.
      const kw = headR * 0.07 * sw;
      ctx.fillStyle = shade(tr, -16);
      ctx.beginPath();
      ctx.moveTo(vx, vTop - hh * 0.02);
      ctx.lineTo(vx + kw, vTop + hh * 0.12);
      ctx.lineTo(vx + kw * 1.3, vBot - hh * 0.02);
      ctx.lineTo(vx, vBot + hh * 0.16);
      ctx.lineTo(vx - kw * 1.3, vBot - hh * 0.02);
      ctx.lineTo(vx - kw, vTop + hh * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(tr, 12);
      ctx.beginPath();
      ctx.moveTo(vx, vTop - hh * 0.02);
      ctx.lineTo(vx - kw, vTop + hh * 0.12);
      ctx.lineTo(vx - kw * 1.3, vBot - hh * 0.02);
      ctx.lineTo(vx, vBot + hh * 0.16);
      ctx.closePath();
      ctx.fill();
      // Hot cores where the fire meets the keel — the glare's aim.
      ctx.fillStyle = shade(vc, 40);
      for (const es of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(vx + es * (kw * 1.3 + headR * 0.11 * sw), eyeY + hh * 0.03, headR * 0.062, 0, Math.PI * 2);
        ctx.fill();
      }
      // THE BROW JEWEL: the oath's crimson stone in an electrum
      // bezel at the crown's center — the vigil's third station:
      // when the procession's light reaches the helm, the stone and
      // the slit fire surge together.
      const gx = headX + (vx - headX) * 0.5;
      const gy = topY + hh * 0.13;
      if (wake > 0.04) {
        ctx.globalAlpha = wake * 0.45;
        ctx.fillStyle = vc;
        ctx.beginPath();
        ctx.ellipse(gx, gy, hw * 0.3, hh * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = shade(st.trim, -8);
      ctx.beginPath();
      ctx.arc(gx, gy, hw * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = wake > 0.04 ? shade('#b23138', 10 + wake * 26) : '#b23138';
      ctx.beginPath();
      ctx.arc(gx, gy, hw * 0.095, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade('#b23138', 44);
      ctx.beginPath();
      ctx.arc(gx - hw * 0.03, gy - hh * 0.025, hw * 0.032, 0, Math.PI * 2);
      ctx.fill();
    } else if (!hurt) {
      // From behind: THE CASCADE — the mantling in full. An outer
      // fall of deep crimson framing an inner bright panel, fold
      // lines carrying the cloth's weight, gilt fringe ticking off
      // the tails as they sway. The crown band closes its circle
      // over the top of it all.
      ctx.fillStyle = shade(mantC, -14);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.76, topY + hh * 0.34);
      ctx.lineTo(headX + hw * 0.76, topY + hh * 0.34);
      ctx.quadraticCurveTo(headX + hw * 0.88, headY + hh * 0.1, headX + hw * 0.6 + mkick, botY + hh * 0.28);
      ctx.lineTo(headX + mkick * 0.6, botY + hh * 0.42);
      ctx.lineTo(headX - hw * 0.6 + mkick * 0.8, botY + hh * 0.24);
      ctx.quadraticCurveTo(headX - hw * 0.88, headY + hh * 0.1, headX - hw * 0.76, topY + hh * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#8e262d';
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.38, topY + hh * 0.4);
      ctx.lineTo(headX + hw * 0.38, topY + hh * 0.4);
      ctx.quadraticCurveTo(headX + hw * 0.44, headY + hh * 0.2, headX + hw * 0.26 + mkick * 0.7, botY + hh * 0.2);
      ctx.lineTo(headX - hw * 0.26 + mkick * 0.8, botY + hh * 0.16);
      ctx.quadraticCurveTo(headX - hw * 0.44, headY + hh * 0.2, headX - hw * 0.38, topY + hh * 0.4);
      ctx.closePath();
      ctx.fill();
      // The folds: two flat panels a step deeper — plane against
      // plane, never a drawn line.
      ctx.fillStyle = shade(mantC, -24);
      for (const u of [-0.44, 0.44]) {
        ctx.beginPath();
        ctx.moveTo(headX + u * hw * 0.78, topY + hh * 0.5);
        ctx.quadraticCurveTo(
          headX + u * hw * 0.9, headY,
          headX + u * hw * 0.56 + mkick * 0.7, botY + hh * 0.14,
        );
        ctx.lineTo(headX + u * hw * 0.4 + mkick * 0.6, botY + hh * 0.16);
        ctx.quadraticCurveTo(headX + u * hw * 0.7, headY, headX + u * hw * 0.6, topY + hh * 0.5);
        ctx.closePath();
        ctx.fill();
      }
      // Gilt fringe off the cascade's hem: flat hanging tabs.
      ctx.fillStyle = shade(st.trim, 4);
      for (const u of [-0.62, -0.32, 0, 0.32, 0.62]) {
        const fx2 = headX + u * hw * 0.6 + mkick * 0.7;
        const fy2 = botY + hh * (0.3 - Math.abs(u) * 0.1);
        ctx.beginPath();
        ctx.moveTo(fx2 - hw * 0.038, fy2);
        ctx.lineTo(fx2 + hw * 0.038, fy2);
        ctx.lineTo(fx2 + hw * 0.012 + mkick * 0.4, fy2 + hh * 0.15);
        ctx.lineTo(fx2 - hw * 0.012 + mkick * 0.4, fy2 + hh * 0.15);
        ctx.closePath();
        ctx.fill();
      }
      // The band closes its circle — and the beads keep marching.
      ctx.strokeStyle = st.trim;
      ctx.lineWidth = hh * 0.12;
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.9, topY + hh * 0.19);
      ctx.quadraticCurveTo(headX, topY + hh * 0.33, headX + hw * 0.9, topY + hh * 0.19);
      ctx.stroke();
      ctx.fillStyle = shade(st.trim, 28);
      for (const u of [-0.6, -0.2, 0.2, 0.6]) {
        ctx.beginPath();
        ctx.arc(headX + u * hw, topY + hh * (0.28 - Math.abs(u) * 0.06), hw * 0.035, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (st.kind === 'gatehelm') {
    // THE GATEHELM — the gatefall head: the door itself, worn as a
    // face. A gate-arched shell in night glass on the riftgate's own
    // granite jambs; a sculpted DOUBLE DOOR where a visor would be,
    // hinge-strapped, its meeting seam leaking otherlight; a jagged
    // SIGHT CRACK across both panels at eye height, glowing — the
    // glass broke exactly where the warden needed to see, and the
    // warden kept it. Over the crown THE BROKEN ARCH rises and never
    // meets; the missing KEYSTONE floats in the gap, point down,
    // held by whatever looks through from the other side. It bobs on
    // its own slow clock and surges when the breach rotation reaches
    // the helm — the fourth station, tried last, like the lock it is.
    const topY = headY - hh * 1.22;
    const botY = headY + hh * 0.98;
    const kc = st.keystone?.color ?? '#a985ff';
    const kg = hurt ? '#ffffff' : (st.keystone?.glass ?? shade(st.color, 10));
    const jc = hurt ? '#ffffff' : (st.jaw ?? shade(st.color, -8));
    const wake = Math.max(0, Math.sin(f.nowMs * 0.0009 + 3 * 1.5708) - 0.45) / 0.55;
    const bob = Math.sin(f.nowMs * 0.0017) * hh * 0.06;
    // 1) THE BROKEN ARCH, painted before the shell so the springing
    // roots tuck under the crown: two granite voussoir horns curving
    // toward a center they will never reach. Centered on the skull
    // axis (the halo law: an arch has no face to lose).
    const springY = topY + hh * 0.28;
    for (const es of [-1, 1]) {
      const rootX = headX + es * hw * 0.62;
      const tipX = headX + es * hw * 0.2;
      const tipY = topY - hh * 0.62;
      ctx.fillStyle = hurt ? '#ffffff' : shade(jc, es === lead ? 4 : -8);
      ctx.beginPath();
      ctx.moveTo(rootX + es * hw * 0.22, springY);
      ctx.quadraticCurveTo(
        headX + es * hw * 0.92, topY - hh * 0.34,
        tipX + es * hw * 0.1, tipY,
      );
      // The squared tip: a voussoir waiting on its keystone, not a
      // horn's point — the break face reads flat.
      ctx.lineTo(tipX, tipY + hh * 0.16);
      ctx.quadraticCurveTo(
        headX + es * hw * 0.56, topY - hh * 0.1,
        rootX - es * hw * 0.1, springY,
      );
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        // Voussoir joints: the mason's count survives the fall.
        ctx.strokeStyle = shade(jc, -22);
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        for (const t of [0.4, 0.72]) {
          const jx = rootX + (tipX - rootX) * t;
          const jy = springY + (tipY - springY) * t;
          ctx.moveTo(jx - es * hw * 0.02, jy + hh * 0.03);
          ctx.lineTo(jx + es * hw * 0.13, jy + hh * 0.14);
        }
        ctx.stroke();
        // The break face: the squared tip catches the sun where the
        // keystone tore away — snapped stone shows its section.
        ctx.fillStyle = shade(jc, 26);
        ctx.beginPath();
        ctx.moveTo(tipX + es * hw * 0.1, tipY);
        ctx.lineTo(tipX, tipY + hh * 0.16);
        ctx.lineTo(tipX + es * hw * 0.06, tipY + hh * 0.18);
        ctx.lineTo(tipX + es * hw * 0.14, tipY + hh * 0.05);
        ctx.closePath();
        ctx.fill();
        // The lit inner curve: one bright edge facing the gap.
        ctx.strokeStyle = st.trim;
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(rootX - es * hw * 0.06, springY - hh * 0.02);
        ctx.quadraticCurveTo(
          headX + es * hw * 0.54, topY - hh * 0.12,
          tipX, tipY + hh * 0.14,
        );
        ctx.stroke();
      }
    }
    // 2) THE GAP LIGHT: otherlight bleeding up between the broken
    // tips — a pilot that never dies, a surge when the rotation
    // arrives. Painted under the keystone so the stone rides it.
    if (!hurt) {
      // The shaft of light standing in the gap — the keystone rides
      // its head. Bright enough to read at cell scale: this is the
      // rig's summit statement and it earns its light.
      ctx.globalAlpha = 0.34 + wake * 0.55;
      ctx.fillStyle = kc;
      ctx.beginPath();
      ctx.ellipse(headX, topY - hh * 0.52, hw * (0.22 + wake * 0.08), hh * (0.38 + wake * 0.14), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5 + wake * 0.5;
      ctx.fillStyle = shade(kc, 26);
      ctx.beginPath();
      ctx.ellipse(headX, topY - hh * 0.5, hw * 0.08, hh * (0.26 + wake * 0.1), 0, 0, Math.PI * 2);
      ctx.fill();
      if (wake > 0.04) {
        // One glass mote climbing out of the gap and fading.
        const ph = f.nowMs * 0.00062;
        const cyc = ph - Math.floor(ph);
        const ma = Math.sin(cyc * Math.PI) * wake;
        if (ma > 0.06) {
          const mx = headX + Math.sin(cyc * 4.6) * hw * 0.12;
          const my = topY - hh * (0.95 + cyc * 0.9);
          const mr = headR * (0.055 - cyc * 0.02);
          ctx.globalAlpha = ma * 0.9;
          ctx.fillStyle = shade(kc, 30);
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
    // 3) THE KEYSTONE: the missing stone, floating point-down in the
    // gap it should be closing. A faceted night-glass wedge with a
    // lit top plane (2.5D law), a bright west arris, and no visible
    // means of support — the light holds what the mason lost.
    const ky = topY - hh * 0.74 + bob;
    const kw = hw * 0.28;
    ctx.fillStyle = kg;
    ctx.beginPath();
    ctx.moveTo(headX - kw, ky - hh * 0.26);
    ctx.lineTo(headX + kw, ky - hh * 0.26);
    ctx.lineTo(headX + kw * 0.55, ky + hh * 0.02);
    ctx.lineTo(headX, ky + hh * 0.3);
    ctx.lineTo(headX - kw * 0.55, ky + hh * 0.02);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // The top plane catches the sun — a stone, not a sticker.
      ctx.fillStyle = shade(st.keystone?.glass ?? st.color, 26);
      ctx.beginPath();
      ctx.moveTo(headX - kw, ky - hh * 0.26);
      ctx.lineTo(headX + kw, ky - hh * 0.26);
      ctx.lineTo(headX + kw * 0.8, ky - hh * 0.18);
      ctx.lineTo(headX - kw * 0.8, ky - hh * 0.18);
      ctx.closePath();
      ctx.fill();
      // The lit west facet, and the glow catching the point.
      ctx.fillStyle = shade(st.keystone?.glass ?? st.color, 12);
      ctx.beginPath();
      ctx.moveTo(headX - kw, ky - hh * 0.26);
      ctx.lineTo(headX - kw * 0.55, ky + hh * 0.02);
      ctx.lineTo(headX, ky + hh * 0.3);
      ctx.lineTo(headX - kw * 0.3, ky - hh * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(kc, 20 + wake * 20);
      ctx.beginPath();
      ctx.moveTo(headX, ky + hh * 0.3);
      ctx.lineTo(headX + kw * 0.16, ky + hh * 0.14);
      ctx.lineTo(headX - kw * 0.16, ky + hh * 0.14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = st.trim;
      ctx.lineWidth = Math.max(1, s * 0.011);
      ctx.beginPath();
      ctx.moveTo(headX - kw, ky - hh * 0.26);
      ctx.lineTo(headX - kw * 0.55, ky + hh * 0.02);
      ctx.lineTo(headX, ky + hh * 0.3);
      ctx.stroke();
    }
    // 4) THE SHELL: a gate arch with a keel peak — flat-based jambs
    // flaring at the jaw so the helm SEATS on the gorget, straight
    // rise, then the crown gathers to a low point under the arch.
    const shell = () => {
      ctx.moveTo(headX - hw * 0.86, botY);
      ctx.lineTo(headX - hw * 1.07, headY + hh * 0.4);
      ctx.lineTo(headX - hw * 1.03, headY - hh * 0.52);
      ctx.quadraticCurveTo(headX - hw * 0.98, topY + hh * 0.16, headX - hw * 0.52, topY + hh * 0.04);
      ctx.quadraticCurveTo(headX - hw * 0.18, topY - hh * 0.04, headX, topY - hh * 0.14);
      ctx.quadraticCurveTo(headX + hw * 0.18, topY - hh * 0.04, headX + hw * 0.52, topY + hh * 0.04);
      ctx.quadraticCurveTo(headX + hw * 0.98, topY + hh * 0.16, headX + hw * 1.03, headY - hh * 0.52);
      ctx.lineTo(headX + hw * 1.07, headY + hh * 0.4);
      ctx.lineTo(headX + hw * 0.86, botY);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY - hh * 0.14, botY);
    if (!hurt) {
      // THE JAMBS: granite piers edging the shell — the door's frame
      // worn at the temples, each with its own quarry rivets.
      for (const es of [-1, 1]) {
        ctx.fillStyle = shade(jc, es === lead ? 6 : -6);
        ctx.beginPath();
        ctx.moveTo(headX + es * hw * 1.03, headY - hh * 0.52);
        ctx.lineTo(headX + es * hw * 0.78, headY - hh * 0.56);
        ctx.lineTo(headX + es * hw * 0.74, headY + hh * 0.62);
        ctx.lineTo(headX + es * hw * 1.06, headY + hh * 0.52);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(jc, 24);
        for (const ty of [-0.32, 0.06, 0.42]) {
          ctx.beginPath();
          ctx.arc(headX + es * hw * 0.9, headY + hh * ty, headR * 0.035, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // THE LINTEL: the brow bar the doors hang from — two-value
      // granite with a small carved keystone boss at its center,
      // the crown's loss said again in miniature.
      ctx.strokeStyle = shade(jc, -18);
      ctx.lineWidth = hh * 0.2;
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.92, headY - hh * 0.6);
      ctx.quadraticCurveTo(headX, headY - hh * 0.74, headX + hw * 0.92, headY - hh * 0.6);
      ctx.stroke();
      ctx.strokeStyle = shade(jc, 14);
      ctx.lineWidth = hh * 0.1;
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.9, headY - hh * 0.63);
      ctx.quadraticCurveTo(headX, headY - hh * 0.77, headX + hw * 0.9, headY - hh * 0.63);
      ctx.stroke();
      ctx.fillStyle = shade(st.trim, -14);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.1, headY - hh * 0.82);
      ctx.lineTo(headX + hw * 0.1, headY - hh * 0.82);
      ctx.lineTo(headX + hw * 0.06, headY - hh * 0.62);
      ctx.lineTo(headX - hw * 0.06, headY - hh * 0.62);
      ctx.closePath();
      ctx.fill();
    }
    if (!hurt && front) {
      // 5) THE DOOR FACE. The reveal first: the opening's recessed
      // dark, so the panels read as set INTO the helm, not printed on.
      const dw = headR * 0.62 * sw;
      const doorTop = headY - hh * 0.5;
      const doorBot = botY - hh * 0.12;
      ctx.fillStyle = '#170f1c';
      ctx.beginPath();
      ctx.moveTo(vx - dw, doorBot);
      ctx.lineTo(vx - dw, doorTop + hh * 0.2);
      ctx.quadraticCurveTo(vx, doorTop - hh * 0.14, vx + dw, doorTop + hh * 0.2);
      ctx.lineTo(vx + dw, doorBot);
      ctx.closePath();
      ctx.fill();
      // The two panels: west lit, east turned — glass doors hung a
      // hair inside the reveal, each with a recessed panel line.
      for (const es of [-1, 1]) {
        const x0 = vx + (es < 0 ? -dw * 0.88 : dw * 0.08);
        const x1 = vx + (es < 0 ? -dw * 0.08 : dw * 0.88);
        ctx.fillStyle = shade(st.color, es < 0 ? 14 : -4);
        ctx.beginPath();
        ctx.moveTo(x0, doorBot - hh * 0.05);
        ctx.lineTo(x0, doorTop + hh * (es < 0 ? 0.3 : 0.3));
        ctx.quadraticCurveTo((x0 + x1) / 2, doorTop + hh * 0.02, x1, doorTop + hh * 0.24);
        ctx.lineTo(x1, doorBot - hh * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(st.color, es < 0 ? -12 : -22);
        ctx.lineWidth = Math.max(1, s * 0.009);
        ctx.strokeRect(
          Math.min(x0, x1) + headR * 0.05, headY + hh * 0.06,
          Math.abs(x1 - x0) - headR * 0.1, hh * 0.56,
        );
        // Hinge straps reaching in from the jambs, riveted.
        ctx.fillStyle = shade(jc, 18);
        for (const hy2 of [-0.28, 0.5] as const) {
          const hx0 = es < 0 ? x0 : x1;
          ctx.beginPath();
          ctx.moveTo(hx0, headY + hh * hy2);
          ctx.lineTo(hx0 - es * headR * 0.3 * sw, headY + hh * (hy2 + 0.03));
          ctx.lineTo(hx0 - es * headR * 0.34 * sw, headY + hh * (hy2 + 0.1));
          ctx.lineTo(hx0, headY + hh * (hy2 + 0.13));
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = shade(st.trim, 8);
          ctx.beginPath();
          ctx.arc(hx0 - es * headR * 0.26 * sw, headY + hh * (hy2 + 0.065), headR * 0.028, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = shade(jc, 18);
        }
      }
      // THE MEETING SEAM: where the doors touch, the otherlight
      // leaks — a pilot line always, a blooming one on the helm's
      // station, hot at the core while the door tries the latch.
      const seamA = 0.4 + wake * 0.6;
      ctx.globalAlpha = seamA * 0.5;
      ctx.strokeStyle = kc;
      ctx.lineWidth = Math.max(1.5, s * (0.02 + wake * 0.02));
      ctx.beginPath();
      ctx.moveTo(vx, doorTop + hh * 0.08);
      ctx.lineTo(vx, doorBot - hh * 0.06);
      ctx.stroke();
      ctx.globalAlpha = seamA;
      ctx.strokeStyle = shade(kc, 30);
      ctx.lineWidth = Math.max(1, s * 0.009);
      ctx.beginPath();
      ctx.moveTo(vx, doorTop + hh * 0.12);
      ctx.lineTo(vx, doorBot - hh * 0.1);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // 6) THE SIGHT CRACK: a jagged fracture across both panels at
      // eye height — the break the warden sees by. Dark glass split
      // first, then the light inside it, pulsing like a held breath.
      const cy2 = headY - hh * 0.08;
      const crack = (o: number): void => {
        ctx.moveTo(vx - dw * 0.84, cy2 + hh * 0.02 + o);
        ctx.lineTo(vx - dw * 0.2, cy2 - hh * 0.04 + o);
        ctx.lineTo(vx + dw * 0.08, cy2 + hh * 0.06 + o);
        ctx.lineTo(vx + dw * 0.84, cy2 - hh * 0.04 + o);
      };
      ctx.strokeStyle = '#170f1c';
      ctx.lineWidth = Math.max(1.5, s * 0.022);
      ctx.beginPath();
      crack(0);
      ctx.stroke();
      const pulse = 0.6 + 0.25 * Math.sin(f.nowMs * 0.0021) + 0.4 * wake;
      ctx.globalAlpha = Math.min(1, pulse);
      ctx.strokeStyle = kc;
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      crack(0);
      ctx.stroke();
      // The hot heart of the look: the center span burns whitest.
      ctx.globalAlpha = Math.min(1, pulse * 0.9);
      ctx.strokeStyle = shade(kc, 34);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(vx - dw * 0.2, cy2 - hh * 0.04);
      ctx.lineTo(vx + dw * 0.08, cy2 + hh * 0.06);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (!hurt) {
      // From behind: the door's back — the flared nape skirt first
      // (a doorwarden shows no neck to the dark), then two batten
      // straps, the sealed seam's faint scar, and the hinge backs.
      ctx.fillStyle = shade(st.color, -6);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.92, headY + hh * 0.55);
      ctx.lineTo(headX + hw * 0.92, headY + hh * 0.55);
      ctx.lineTo(headX + hw * 0.72, botY + hh * 0.16);
      ctx.lineTo(headX - hw * 0.72, botY + hh * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(st.color, -12);
      for (const by2 of [-0.24, 0.34]) {
        ctx.fillRect(headX - hw * 0.78, headY + hh * by2, hw * 1.56, hh * 0.16);
      }
      ctx.fillStyle = shade(st.color, -20);
      ctx.fillRect(headX - 0.011 * s, headY - hh * 0.52, 0.022 * s, hh * 1.44);
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = kc;
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(headX, headY - hh * 0.48);
      ctx.lineTo(headX, headY + hh * 0.86);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
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
