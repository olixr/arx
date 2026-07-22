import { shade } from './rig.js';
import {
  drawHelmet,
  drawPauldron,
  drawTorsoGarment,
  type BodyStyle,
  type BootStyle,
  type GloveStyle,
  type HelmStyle,
  type LegStyle,
  type OffhandStyle,
} from './armor.js';

/**
 * Equipment product shots: every armor icon renders FROM the same
 * style record that dresses the rig — the piece in the pack is the
 * piece on the body, zero art drift. Helms and torsos go through the
 * actual world painters (drawHelmet / drawTorsoGarment + pauldrons)
 * on a synthetic mannequin frame; legs, boots, gloves and shields get
 * bespoke product-shot painters that consume the style fields, since
 * their world painters are woven through the limb solvers.
 *
 * All painters draw inside the 0..1 unit box (the icon pipeline adds
 * the outline-shader ring, shadow, and supersampling).
 */

type Painter = (ctx: CanvasRenderingContext2D) => void;

/** The mannequin's interior: face openings and neck holes read as a
 * quiet shadow, never a hole punched to the parchment behind. */
const INTERIOR = '#2a2133';

// ---------------------------------------------------------------- helm

export function helmIconPainter(st: HelmStyle): Painter {
  return (ctx) => {
    // Frame the helm by its extras: tall furniture (wizard peak, tall
    // ears, antlers, wings, halo) earns a wider stage.
    const tall =
      st.kind === 'wizard' ||
      st.antlers !== undefined ||
      st.wings !== undefined ||
      st.halo !== undefined ||
      (st.ears?.tall ?? false) ||
      (st.horns !== undefined && st.horns.size > 0.45);
    const k = st.kind === 'circlet' ? 2.3 : tall ? 1.62 : 2.05;
    const cy = st.kind === 'wizard' ? 0.66 : tall ? 0.62 : 0.56;
    ctx.translate(0.5, cy);
    ctx.scale(1 / 64, 1 / 64);
    const s = 64 * k;
    const headR = 0.15 * s;
    // The mannequin: a shadowed head form so open kinds (hood, circlet,
    // horned brow cuts) read as worn shapes, not floating shells. An
    // egg taper with a darker jaw — a head in shadow, never a ball.
    ctx.fillStyle = INTERIOR;
    ctx.beginPath();
    ctx.ellipse(0, headR * 0.06, headR * 0.86, headR * 0.94, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(INTERIOR, -26);
    ctx.beginPath();
    ctx.ellipse(0, headR * 0.5, headR * 0.62, headR * 0.42, 0, 0, Math.PI);
    ctx.fill();
    drawHelmet(ctx, st, {
      s,
      headX: 0,
      headY: 0,
      hw: headR * 1.04,
      hh: headR,
      cut: headR * 0.34,
      fx: 0,
      headR,
      profileK: 0,
      backK: 0,
      lead: 0,
      hurt: false,
      nowMs: 5234,
    });
  };
}

// ---------------------------------------------------------------- body

export function bodyIconPainter(st: BodyStyle): Painter {
  return (ctx) => {
    // Stage height: shoulders (+ pauldron headroom) down to hem.
    const skirtDrop = Math.max(0.1, st.skirt + 0.07);
    const pad = st.pauldron === 'none' ? 0.06 : 0.14;
    const totalH = 0.46 + pad + skirtDrop;
    const k = Math.min(1.3, 0.92 / totalH);
    // Hip line sits so the whole stack centers in the box.
    const hipY = 0.5 + (0.46 + pad - skirtDrop) * (k / 2);
    ctx.translate(0.5, hipY);
    ctx.scale(1 / 64, 1 / 64);
    const s = 64 * k;
    const tw = 0.185 * s;
    const ww = 0.125 * s;
    const th = 0.46 * s;
    const frame = {
      s,
      tw,
      ww,
      th,
      lead: 0,
      profileK: 0,
      backK: 0,
      hurt: false,
      strideSw: 0,
      nowMs: 5234,
      runF: 0,
      dragX: 0,
    };
    // Neck shadow peeks over the collar line — the mannequin's throat.
    ctx.fillStyle = INTERIOR;
    ctx.beginPath();
    ctx.ellipse(0, -th * 0.99, tw * 0.34, tw * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    drawTorsoGarment(ctx, st, frame);
    // Both pauldrons seat on the shoulder points, near-side lit.
    drawPauldron(ctx, st, -tw * 0.99, -th * 0.97, -1, s, 1, false, true, 5234);
    drawPauldron(ctx, st, tw * 0.99, -th * 0.97, 1, s, 1, false, false, 5234);
  };
}

// ---------------------------------------------------------------- legs

export function legsIconPainter(st: LegStyle, fallback: string): Painter {
  const thigh = st.thigh ?? fallback;
  const shin = st.shin ?? (st.kind === 'greaves' ? shade(thigh, 6) : shade(thigh, -8));
  return (ctx) => {
    ctx.translate(0.5, 0.5);
    const waistW = 0.46;
    const topY = -0.4;
    const crotch = -0.06;
    const hemY = 0.42;
    const legW = 0.185;
    const gap = 0.045;
    // Waistband: a folded yoke with a belt line.
    ctx.fillStyle = shade(thigh, -18);
    ctx.beginPath();
    ctx.roundRect(-waistW / 2, topY, waistW, 0.11, 0.02);
    ctx.fill();
    // The two legs: near leg square-on, far leg a touch narrower —
    // the pair reads as hanging cloth/steel, not a flat H.
    for (const side of [-1, 1] as const) {
      const cx = side * (gap + legW) * 0.92;
      const w = side < 0 ? legW : legW * 0.94;
      // Thigh half.
      ctx.fillStyle = side < 0 ? thigh : shade(thigh, -10);
      ctx.beginPath();
      ctx.moveTo(cx - w, topY + 0.08);
      ctx.lineTo(cx + w, topY + 0.08);
      ctx.lineTo(cx + w * 0.92, crotch + 0.16);
      ctx.lineTo(cx - w * 0.92, crotch + 0.16);
      ctx.closePath();
      ctx.fill();
      // Shin half — greaves switch material here.
      ctx.fillStyle = side < 0 ? shin : shade(shin, -10);
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.92, crotch + 0.14);
      ctx.lineTo(cx + w * 0.92, crotch + 0.14);
      ctx.lineTo(cx + w * 0.8, hemY);
      ctx.lineTo(cx - w * 0.8, hemY);
      ctx.closePath();
      ctx.fill();
      // Hem cuff.
      ctx.fillStyle = shade(shin, -20);
      ctx.fillRect(cx - w * 0.8, hemY - 0.035, w * 1.6, 0.035);
      // Inner-seam shading keeps the tube form.
      ctx.strokeStyle = shade(thigh, -24);
      ctx.lineWidth = 0.018;
      ctx.beginPath();
      ctx.moveTo(cx + side * w * 0.55, topY + 0.1);
      ctx.lineTo(cx + side * w * 0.5, hemY - 0.04);
      ctx.stroke();
      // Knee treatment.
      const kneeY = crotch + 0.17;
      if (st.knee === 'plate') {
        ctx.fillStyle = st.kneeColor ?? shade(shin, 22);
        ctx.beginPath();
        ctx.ellipse(cx, kneeY, w * 0.62, 0.055, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(st.kneeColor ?? shade(shin, 22), 26);
        ctx.beginPath();
        ctx.ellipse(cx - w * 0.18, kneeY - 0.014, w * 0.26, 0.02, -0.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (st.knee === 'wrap' || st.kind === 'wraps') {
        ctx.strokeStyle = st.kneeColor ?? shade(thigh, 18);
        ctx.lineWidth = 0.024;
        for (const dy of [-0.02, 0.02]) {
          ctx.beginPath();
          ctx.moveTo(cx - w * 0.85, kneeY + dy - 0.012);
          ctx.lineTo(cx + w * 0.85, kneeY + dy + 0.012);
          ctx.stroke();
        }
      }
    }
    // Belt stitch over the yoke.
    ctx.strokeStyle = shade(thigh, 14);
    ctx.lineWidth = 0.016;
    ctx.beginPath();
    ctx.moveTo(-waistW / 2 + 0.03, topY + 0.055);
    ctx.lineTo(waistW / 2 - 0.03, topY + 0.055);
    ctx.stroke();
  };
}

// --------------------------------------------------------------- boots

export function bootsIconPainter(st: BootStyle): Painter {
  return (ctx) => {
    ctx.translate(0.5, 0.5);
    const col = st.color;
    // Shaft height in stage units: style heights run 0.06..0.3 tiles.
    const shaft = Math.min(0.52, 0.18 + st.height * 1.15);
    const footY = 0.3;
    const drawBoot = (cx: number, lit: boolean): void => {
      const c = lit ? col : shade(col, -16);
      const w = 0.14;
      const toeLen = 0.2;
      // Shaft.
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(cx - w, footY - shaft);
      ctx.lineTo(cx + w * 0.9, footY - shaft);
      ctx.lineTo(cx + w * 1.05, footY - 0.06);
      ctx.lineTo(cx - w, footY - 0.02);
      ctx.closePath();
      ctx.fill();
      // Foot + toe, pointing right; wizard slippers curl the tip.
      ctx.beginPath();
      ctx.moveTo(cx - w, footY - 0.06);
      ctx.lineTo(cx + w * 0.9, footY - 0.09);
      if (st.curl) {
        ctx.quadraticCurveTo(cx + w + toeLen * 1.15, footY - 0.1, cx + w + toeLen * 0.72, footY + 0.02);
        ctx.quadraticCurveTo(cx + w + toeLen * 1.3, footY - 0.18, cx + w + toeLen * 0.9, footY - 0.26);
      } else {
        ctx.quadraticCurveTo(cx + w + toeLen, footY - 0.08, cx + w + toeLen * 0.92, footY + 0.03);
      }
      ctx.lineTo(cx - w, footY + 0.03);
      ctx.closePath();
      ctx.fill();
      // Sole.
      ctx.fillStyle = shade(c, -26);
      ctx.beginPath();
      ctx.roundRect(cx - w, footY + 0.005, w * 1.9 + toeLen * (st.curl ? 0.62 : 0.86), 0.038, 0.015);
      ctx.fill();
      // Instep highlight — the 2.5D facet.
      if (lit) {
        ctx.fillStyle = shade(c, 16);
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.6, footY - shaft + 0.02);
        ctx.lineTo(cx - w * 0.15, footY - shaft + 0.02);
        ctx.lineTo(cx - w * 0.15, footY - 0.05);
        ctx.lineTo(cx - w * 0.6, footY - 0.03);
        ctx.closePath();
        ctx.fill();
      }
      // Metal toe cap.
      if (st.toe) {
        ctx.fillStyle = lit ? st.toe : shade(st.toe, -16);
        ctx.beginPath();
        ctx.moveTo(cx + w * 0.75, footY - 0.085);
        ctx.quadraticCurveTo(cx + w + toeLen * 0.95, footY - 0.075, cx + w + toeLen * 0.88, footY + 0.03);
        ctx.lineTo(cx + w * 0.85, footY + 0.03);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(st.toe, 24);
        ctx.lineWidth = 0.016;
        ctx.beginPath();
        ctx.moveTo(cx + w * 0.8, footY - 0.07);
        ctx.quadraticCurveTo(cx + w + toeLen * 0.8, footY - 0.06, cx + w + toeLen * 0.78, footY + 0.0);
        ctx.stroke();
      }
      // Shaft-top treatment: fur roll, clean cuff, or plain fold.
      const topY = footY - shaft;
      if (st.fur) {
        ctx.fillStyle = lit ? st.fur.color : shade(st.fur.color, -14);
        for (let i = 0; i < 5; i++) {
          const bx = cx - w + (i / 4) * (w * 1.9);
          ctx.beginPath();
          ctx.arc(bx, topY + 0.012 + (i % 2) * 0.012, 0.045, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (st.cuff) {
        ctx.fillStyle = lit ? st.cuff.color : shade(st.cuff.color, -14);
        ctx.beginPath();
        ctx.roundRect(cx - w - 0.012, topY - 0.02, w * 1.95 + 0.024, 0.07, 0.02);
        ctx.fill();
      }
      // Climbing straps.
      if (st.wrap) {
        ctx.strokeStyle = lit ? st.wrap.color : shade(st.wrap.color, -14);
        ctx.lineWidth = 0.022;
        for (let i = 0; i < 3; i++) {
          const y = footY - 0.09 - (i / 2.6) * (shaft - 0.14);
          ctx.beginPath();
          ctx.moveTo(cx - w * 0.95, y - 0.02);
          ctx.lineTo(cx + w * 0.95, y + 0.025);
          ctx.stroke();
        }
      }
      // Dread spike off the shaft top.
      if (st.spike) {
        ctx.fillStyle = shade(c, 20);
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.7, topY + 0.01);
        ctx.lineTo(cx - w * 0.2, topY + 0.01);
        ctx.lineTo(cx - w * 0.45, topY - 0.1);
        ctx.closePath();
        ctx.fill();
      }
    };
    // Far boot first (shifted back-left, dimmed), near boot the hero.
    drawBoot(-0.16, false);
    drawBoot(0.02, true);
  };
}

// -------------------------------------------------------------- gloves

export function glovesIconPainter(st: GloveStyle): Painter {
  return (ctx) => {
    ctx.translate(0.5, 0.5);
    const hand = st.hand ?? 'glove';
    const col = st.color;
    const bracer = st.bracer ?? shade(col, -8);
    const drawGlove = (cx: number, cy: number, lit: boolean): void => {
      const c = lit ? col : shade(col, -16);
      const b = lit ? bracer : shade(bracer, -16);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-Math.PI / 5);
      // Forearm/bracer rising from bottom: wrist at origin.
      ctx.fillStyle = b;
      ctx.beginPath();
      ctx.moveTo(-0.09, 0.34);
      ctx.lineTo(0.09, 0.34);
      ctx.lineTo(0.075, 0.05);
      ctx.lineTo(-0.075, 0.05);
      ctx.closePath();
      ctx.fill();
      // Cuff seam at the elbow end.
      if (st.cuff) {
        const cc = lit ? st.cuff.color : shade(st.cuff.color, -14);
        ctx.fillStyle = cc;
        if (st.cuff.kind === 'fur') {
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(-0.075 + i * 0.05, 0.335 + (i % 2) * 0.012, 0.038, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (st.cuff.kind === 'flare') {
          ctx.beginPath();
          ctx.moveTo(-0.13, 0.4);
          ctx.lineTo(0.13, 0.4);
          ctx.lineTo(0.085, 0.28);
          ctx.lineTo(-0.085, 0.28);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.roundRect(-0.1, 0.3, 0.2, 0.065, 0.015);
          ctx.fill();
        }
      }
      // The hand mold.
      ctx.fillStyle = c;
      if (hand === 'gauntlet') {
        // Squared plated fist with a hard end cap.
        ctx.beginPath();
        ctx.roundRect(-0.1, -0.22, 0.2, 0.29, 0.035);
        ctx.fill();
        ctx.fillStyle = shade(c, 18);
        ctx.beginPath();
        ctx.roundRect(-0.1, -0.22, 0.2, 0.075, 0.03);
        ctx.fill();
        // Finger lames.
        ctx.strokeStyle = shade(c, -22);
        ctx.lineWidth = 0.016;
        for (const y of [-0.06, 0.0]) {
          ctx.beginPath();
          ctx.moveTo(-0.09, y);
          ctx.lineTo(0.09, y);
          ctx.stroke();
        }
      } else if (hand === 'paw') {
        ctx.beginPath();
        ctx.ellipse(0, -0.08, 0.115, 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        // Toe splits.
        ctx.strokeStyle = shade(c, -24);
        ctx.lineWidth = 0.016;
        for (const dx of [-0.04, 0.04]) {
          ctx.beginPath();
          ctx.moveTo(dx, -0.21);
          ctx.lineTo(dx, -0.13);
          ctx.stroke();
        }
      } else {
        // Fitted taper (glove/wrap): palm + four finger hints.
        ctx.beginPath();
        ctx.moveTo(-0.095, 0.07);
        ctx.lineTo(0.095, 0.07);
        ctx.lineTo(0.085, -0.1);
        ctx.quadraticCurveTo(0.06, -0.235, 0, -0.235);
        ctx.quadraticCurveTo(-0.06, -0.235, -0.085, -0.1);
        ctx.closePath();
        ctx.fill();
        // Thumb.
        ctx.beginPath();
        ctx.ellipse(0.1, -0.03, 0.038, 0.075, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = shade(c, -22);
        ctx.lineWidth = 0.014;
        for (const dx of [-0.045, 0, 0.045]) {
          ctx.beginPath();
          ctx.moveTo(dx, -0.22 + Math.abs(dx) * 0.5);
          ctx.lineTo(dx, -0.1);
          ctx.stroke();
        }
        if (st.fingerless) {
          // Bare fingertips past the cut.
          ctx.fillStyle = '#c9997a';
          ctx.beginPath();
          ctx.roundRect(-0.07, -0.28, 0.14, 0.055, 0.025);
          ctx.fill();
        }
        if (hand === 'wrap') {
          ctx.strokeStyle = shade(c, 16);
          ctx.lineWidth = 0.02;
          for (const y of [-0.04, 0.02]) {
            ctx.beginPath();
            ctx.moveTo(-0.09, y - 0.015);
            ctx.lineTo(0.09, y + 0.02);
            ctx.stroke();
          }
        }
      }
      // Knuckle device.
      if (st.knuckle) {
        const kc = lit ? st.knuckle.color : shade(st.knuckle.color, -14);
        ctx.fillStyle = kc;
        const ky = hand === 'gauntlet' ? -0.13 : -0.14;
        if (st.knuckle.kind === 'studs') {
          for (const dx of [-0.05, 0, 0.05]) {
            ctx.beginPath();
            ctx.arc(dx, ky, 0.022, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (st.knuckle.kind === 'spikes') {
          for (const dx of [-0.05, 0, 0.05]) {
            ctx.beginPath();
            ctx.moveTo(dx - 0.022, ky + 0.02);
            ctx.lineTo(dx + 0.022, ky + 0.02);
            ctx.lineTo(dx, ky - 0.06);
            ctx.closePath();
            ctx.fill();
          }
        } else if (st.knuckle.kind === 'claws') {
          for (const dx of [-0.055, 0, 0.055]) {
            ctx.beginPath();
            ctx.moveTo(dx - 0.018, ky + 0.02);
            ctx.quadraticCurveTo(dx + 0.035, ky - 0.045, dx + 0.05, ky - 0.1);
            ctx.quadraticCurveTo(dx + 0.012, ky - 0.05, dx + 0.018, ky + 0.02);
            ctx.closePath();
            ctx.fill();
          }
        } else if (st.knuckle.kind === 'plate') {
          ctx.beginPath();
          ctx.roundRect(-0.07, ky - 0.045, 0.14, 0.09, 0.02);
          ctx.fill();
          ctx.strokeStyle = shade(kc, 26);
          ctx.lineWidth = 0.014;
          ctx.beginPath();
          ctx.moveTo(-0.05, ky - 0.02);
          ctx.lineTo(0.05, ky - 0.02);
          ctx.stroke();
        } else {
          // Bezel-set gem.
          ctx.beginPath();
          ctx.arc(0, ky, 0.045, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = shade(kc, 40);
          ctx.beginPath();
          ctx.arc(-0.012, ky - 0.012, 0.016, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    };
    // The pair: far glove tucked well behind, near glove the hero —
    // separated enough that two reads as two, not as clutter.
    drawGlove(-0.17, 0.09, false);
    drawGlove(0.09, -0.04, true);
  };
}

// -------------------------------------------------------------- shield

export function offhandIconPainter(st: OffhandStyle): Painter {
  return (ctx) => {
    ctx.translate(0.5, 0.5);
    const col = st.color;
    const trim = st.trim;
    if (st.kind === 'tower') {
      // The wall: tall rounded slab, banded frame, emblem.
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.roundRect(-0.26, -0.4, 0.52, 0.8, 0.07);
      ctx.fill();
      ctx.strokeStyle = trim;
      ctx.lineWidth = 0.045;
      ctx.beginPath();
      ctx.roundRect(-0.215, -0.355, 0.43, 0.71, 0.05);
      ctx.stroke();
      ctx.fillStyle = shade(col, 14);
      ctx.beginPath();
      ctx.roundRect(-0.215, -0.355, 0.16, 0.71, 0.05);
      ctx.fill();
      drawEmblem(ctx, st, 0, 0);
      // Rivet studs down the frame.
      ctx.fillStyle = shade(trim, 22);
      for (const y of [-0.3, 0, 0.3]) {
        for (const x of [-0.19, 0.19]) {
          ctx.beginPath();
          ctx.arc(x, y, 0.022, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (st.kind === 'kite') {
      // The knight's teardrop.
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, -0.38);
      ctx.quadraticCurveTo(0.34, -0.36, 0.32, -0.08);
      ctx.quadraticCurveTo(0.3, 0.22, 0, 0.42);
      ctx.quadraticCurveTo(-0.3, 0.22, -0.32, -0.08);
      ctx.quadraticCurveTo(-0.34, -0.36, 0, -0.38);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = trim;
      ctx.lineWidth = 0.045;
      ctx.beginPath();
      ctx.moveTo(0, -0.335);
      ctx.quadraticCurveTo(0.29, -0.315, 0.272, -0.075);
      ctx.quadraticCurveTo(0.255, 0.185, 0, 0.365);
      ctx.quadraticCurveTo(-0.255, 0.185, -0.272, -0.075);
      ctx.quadraticCurveTo(-0.29, -0.315, 0, -0.335);
      ctx.closePath();
      ctx.stroke();
      // Left-light facet.
      ctx.fillStyle = shade(col, 14);
      ctx.beginPath();
      ctx.moveTo(-0.02, -0.33);
      ctx.quadraticCurveTo(-0.24, -0.3, -0.245, -0.07);
      ctx.quadraticCurveTo(-0.23, 0.16, -0.02, 0.34);
      ctx.closePath();
      ctx.fill();
      drawEmblem(ctx, st, 0, -0.02);
    } else {
      // Buckler: the fist's little wall — domed round, bossed center.
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, 0, 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = trim;
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.arc(0, 0, 0.315, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = shade(col, 14);
      ctx.beginPath();
      ctx.arc(-0.09, -0.09, 0.2, Math.PI * 0.65, Math.PI * 1.8);
      ctx.arc(0, 0, 0.31, Math.PI * 1.32, Math.PI * 0.78, true);
      ctx.fill();
      const boss = st.boss ?? shade(trim, 18);
      ctx.fillStyle = boss;
      ctx.beginPath();
      ctx.arc(0, 0, 0.105, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(boss, 34);
      ctx.beginPath();
      ctx.arc(-0.028, -0.028, 0.038, 0, Math.PI * 2);
      ctx.fill();
      if (st.spikes) {
        ctx.fillStyle = shade(trim, 26);
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          const px = Math.cos(a);
          const py = Math.sin(a);
          ctx.beginPath();
          ctx.moveTo(px * 0.34 - py * 0.035, py * 0.34 + px * 0.035);
          ctx.lineTo(px * 0.34 + py * 0.035, py * 0.34 - px * 0.035);
          ctx.lineTo(px * 0.46, py * 0.46);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  };
}

function drawEmblem(ctx: CanvasRenderingContext2D, st: OffhandStyle, x: number, y: number): void {
  const c = shade(st.trim, 24);
  ctx.fillStyle = c;
  if (st.emblem === 'diamond') {
    ctx.beginPath();
    ctx.moveTo(x, y - 0.13);
    ctx.lineTo(x + 0.1, y);
    ctx.lineTo(x, y + 0.13);
    ctx.lineTo(x - 0.1, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(c, 22);
    ctx.beginPath();
    ctx.moveTo(x, y - 0.13);
    ctx.lineTo(x + 0.1, y);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();
  } else if (st.emblem === 'chevron') {
    ctx.beginPath();
    ctx.moveTo(x - 0.13, y - 0.02);
    ctx.lineTo(x, y - 0.12);
    ctx.lineTo(x + 0.13, y - 0.02);
    ctx.lineTo(x + 0.13, 0.06 + y);
    ctx.lineTo(x, y - 0.04);
    ctx.lineTo(x - 0.13, 0.06 + y);
    ctx.closePath();
    ctx.fill();
  } else if (st.boss) {
    ctx.fillStyle = st.boss;
    ctx.beginPath();
    ctx.arc(x, y, 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
}
