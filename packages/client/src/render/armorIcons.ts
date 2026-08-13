import { shade } from './rig.js';
import { drawShieldAt, isShieldKind, shieldStyle } from './shields.js';
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
    // Great horns (dread-sized) earn the widest stage of all — a
    // clipped horn tip reads as a broken horn.
    const hornsBig = st.horns !== undefined && st.horns.size > 1.2;
    const soft = st.kind === 'hood';
    const open = soft || st.kind === 'circlet' || st.kind === 'wizard';
    const k = st.kind === 'circlet' ? 2.15 : hornsBig ? 1.42 : tall ? 1.58 : soft ? 1.85 : 2.05;
    const cy = st.kind === 'wizard' ? 0.64 : hornsBig ? 0.62 : tall ? 0.6 : soft ? 0.5 : 0.54;
    ctx.translate(0.5, cy);
    ctx.scale(1 / 64, 1 / 64);
    const s = 64 * k;
    const headR = 0.15 * s;
    // The mannequin: open kinds (hood, circlet, wizard) get a BUST —
    // neck and shoulder line in shadow — so the piece reads as WORN
    // cloth on a shop form, never a shell floating in space. Sealed
    // metal stays a floating object shot: the helm IS the object.
    if (open) {
      ctx.fillStyle = shade(INTERIOR, -10);
      ctx.beginPath();
      ctx.moveTo(-headR * 0.42, headR * 0.8);
      ctx.lineTo(headR * 0.42, headR * 0.8);
      ctx.lineTo(headR * 0.56, headR * 1.18);
      ctx.lineTo(headR * 1.28, headR * 1.42);
      ctx.quadraticCurveTo(headR * 1.5, headR * 1.52, headR * 1.5, headR * 1.75);
      ctx.lineTo(-headR * 1.5, headR * 1.75);
      ctx.quadraticCurveTo(-headR * 1.5, headR * 1.52, -headR * 1.28, headR * 1.42);
      ctx.lineTo(-headR * 0.56, headR * 1.18);
      ctx.closePath();
      ctx.fill();
    }
    // A shadowed head form so open kinds read as worn shapes, not
    // floating shells. An egg taper with a darker jaw — a head in
    // shadow, never a ball.
    ctx.fillStyle = INTERIOR;
    ctx.beginPath();
    ctx.ellipse(0, headR * 0.06, headR * 0.86, headR * 0.94, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(INTERIOR, -26);
    ctx.beginPath();
    ctx.ellipse(0, headR * 0.5, headR * 0.62, headR * 0.42, 0, 0, Math.PI);
    ctx.fill();
    // Plumed metal helms: pre-paint a SOLID crest fin in the plume
    // color. The world's hollow crescent band lands on its outer edge
    // and merges — on the icon stage a hollow band over a box crown
    // reads as a luggage handle, and a solid fin is the ruled fix.
    if (st.plume && st.kind !== 'hood' && st.kind !== 'wizard' && st.kind !== 'circlet') {
      const pk = 0.78;
      const arcK = 0.35 + 0.65 * pk;
      const hw2 = headR * 1.04;
      ctx.fillStyle = st.plume.color;
      ctx.beginPath();
      ctx.moveTo(-hw2 * 0.7 * arcK, -headR * 1.02);
      ctx.quadraticCurveTo(0, -headR * (1.5 + 0.35 * arcK), hw2 * 0.72 * arcK, -headR * 1.02);
      ctx.lineTo(hw2 * 0.42 * arcK, -headR * 0.6);
      ctx.lineTo(-hw2 * 0.42 * arcK, -headR * 0.6);
      ctx.closePath();
      ctx.fill();
      // The trailing half of the fin sits in shade — one sun.
      ctx.save();
      ctx.clip();
      ctx.fillStyle = shade(st.plume.color, -16);
      ctx.fillRect(-hw2 * 1.4, -headR * 2.0, hw2 * 1.4, headR * 1.6);
      ctx.restore();
    }
    // The museum turn: every helm sits well off square, so the shell
    // shows a leading edge and a shadowed cheek at once. A frontal
    // hood is a picture frame; a turned hood is a garment — cloth
    // kinds turn deepest.
    drawHelmet(ctx, st, {
      s,
      headX: 0,
      headY: 0,
      hw: headR * 1.04,
      hh: headR,
      cut: headR * 0.34,
      fx: soft ? 0.72 : 0.42,
      headR,
      // Plumed helms turn deepest of the metal kinds: the crest's
      // hero read is its profile arc — at a shallow turn it shrinks
      // to a luggage handle on the crown.
      profileK: soft ? 0.55 : st.plume ? 0.78 : 0.3,
      backK: 0,
      lead: 1,
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

export function legsIconPainter(st: LegStyle, fallback: string, id = ''): Painter {
  const thigh = st.thigh ?? fallback;
  const shin = st.shin ?? (st.kind === 'greaves' ? shade(thigh, 6) : shade(thigh, -8));
  // Robe skirts have no LegStyle word of their own (the robe owns the
  // drape in world) — the icon tells the truth by silhouette: an
  // A-line skirt, never a pair of trousers.
  const isSkirt = /skirts$/.test(id);
  if (isSkirt) {
    return (ctx) => {
      ctx.translate(0.5, 0.5);
      const topY = -0.38;
      const hemY = 0.4;
      const waistW = 0.34;
      const hemW = 0.66;
      // The skirt panel, flaring waist to hem.
      ctx.fillStyle = thigh;
      ctx.beginPath();
      ctx.moveTo(-waistW / 2, topY + 0.09);
      ctx.lineTo(waistW / 2, topY + 0.09);
      ctx.quadraticCurveTo(hemW / 2 * 0.86, hemY * 0.4, hemW / 2, hemY);
      ctx.lineTo(-hemW / 2, hemY);
      ctx.quadraticCurveTo(-hemW / 2 * 0.86, hemY * 0.4, -waistW / 2, topY + 0.09);
      ctx.closePath();
      ctx.fill();
      // Gore folds: alternating shaded panels falling to the hem.
      for (const [x0, x1, tint] of [
        [-0.26, -0.13, -14], [-0.06, 0.05, 10], [0.14, 0.26, -14],
      ] as const) {
        ctx.fillStyle = shade(thigh, tint);
        ctx.beginPath();
        ctx.moveTo(x0 * 0.42, topY + 0.12);
        ctx.lineTo(x1 * 0.42, topY + 0.12);
        ctx.lineTo(x1, hemY);
        ctx.lineTo(x0, hemY);
        ctx.closePath();
        ctx.fill();
      }
      // Hem band, then the waist yoke over everything.
      ctx.fillStyle = shade(shin, -18);
      ctx.fillRect(-hemW / 2, hemY - 0.05, hemW, 0.05);
      ctx.fillStyle = shade(thigh, -20);
      ctx.beginPath();
      ctx.roundRect(-waistW / 2 - 0.02, topY, waistW + 0.04, 0.11, 0.025);
      ctx.fill();
      ctx.fillStyle = shade(thigh, 6);
      ctx.fillRect(-waistW / 2, topY + 0.02, waistW, 0.035);
    };
  }
  if (st.kind === 'greaves') {
    return (ctx) => {
      // Forged leg harness, one leg per side: cuisse plate, domed
      // knee cop, ridged shin greave flaring at the calf — armor
      // parts, never trousers with socks.
      ctx.translate(0.5, 0.5);
      const kneeCol = st.kneeColor ?? shade(shin, 22);
      for (const side of [-1, 1] as const) {
        const cx = side * 0.21;
        const dim = side > 0 ? -12 : 0;
        const w = 0.155;
        // Cuisse: thigh plate with a rolled top edge.
        ctx.fillStyle = shade(thigh, dim);
        ctx.beginPath();
        ctx.moveTo(cx - w, -0.36);
        ctx.lineTo(cx + w, -0.36);
        ctx.lineTo(cx + w * 0.9, -0.1);
        ctx.lineTo(cx - w * 0.9, -0.1);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(thigh, dim + 20);
        ctx.fillRect(cx - w, -0.36, w * 2, 0.05);
        // The forge crease down the cuisse.
        ctx.strokeStyle = shade(thigh, dim - 22);
        ctx.lineWidth = 0.02;
        ctx.beginPath();
        ctx.moveTo(cx, -0.3);
        ctx.lineTo(cx, -0.12);
        ctx.stroke();
        // Knee cop: a domed plate with side wings.
        ctx.fillStyle = shade(kneeCol, dim - 10);
        ctx.beginPath();
        ctx.ellipse(cx, -0.045, w * 1.05, 0.075, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(kneeCol, dim);
        ctx.beginPath();
        ctx.ellipse(cx, -0.05, w * 0.78, 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(kneeCol, dim + 30);
        ctx.beginPath();
        ctx.ellipse(cx - w * 0.24, -0.068, w * 0.3, 0.024, -0.25, 0, Math.PI * 2);
        ctx.fill();
        // Shin greave: center ridge, calf swell, ankle flare.
        ctx.fillStyle = shade(shin, dim);
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.82, 0.02);
        ctx.lineTo(cx + w * 0.82, 0.02);
        ctx.quadraticCurveTo(cx + w * 0.95, 0.18, cx + w * 0.72, 0.34);
        ctx.lineTo(cx + w * 0.92, 0.41);
        ctx.lineTo(cx - w * 0.92, 0.41);
        ctx.lineTo(cx - w * 0.72, 0.34);
        ctx.quadraticCurveTo(cx - w * 0.95, 0.18, cx - w * 0.82, 0.02);
        ctx.closePath();
        ctx.fill();
        // The ridge catches the light on its left face.
        ctx.fillStyle = shade(shin, dim + 24);
        ctx.beginPath();
        ctx.moveTo(cx - 0.035, 0.03);
        ctx.lineTo(cx, 0.03);
        ctx.lineTo(cx, 0.4);
        ctx.lineTo(cx - 0.025, 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(shin, dim - 24);
        ctx.lineWidth = 0.018;
        ctx.beginPath();
        ctx.moveTo(cx + 0.004, 0.04);
        ctx.lineTo(cx + 0.004, 0.39);
        ctx.stroke();
        // Ankle rim.
        ctx.fillStyle = shade(shin, dim - 18);
        ctx.fillRect(cx - w * 0.92, 0.375, w * 1.84, 0.035);
        // Rivets pinning the cuisse edge.
        ctx.fillStyle = shade(thigh, dim + 32);
        for (const dx of [-w * 0.6, w * 0.6]) {
          ctx.beginPath();
          ctx.arc(cx + dx, -0.32, 0.016, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // The belt spanning both cuisses.
      ctx.fillStyle = shade(thigh, -26);
      ctx.beginPath();
      ctx.roundRect(-0.4, -0.42, 0.8, 0.08, 0.02);
      ctx.fill();
      ctx.fillStyle = shade(thigh, 2);
      ctx.fillRect(-0.38, -0.405, 0.76, 0.028);
    };
  }
  return (ctx) => {
    // Hanging trousers/wraps: a waist yoke and two draping legs with
    // real cloth reads — creases, a knee break, hem cuffs with a
    // slight outward kick.
    ctx.translate(0.5, 0.5);
    const topY = -0.4;
    const hemY = 0.41;
    const legW = 0.16;
    for (const side of [-1, 1] as const) {
      const cx = side * 0.185;
      const dim = side > 0 ? -12 : 0;
      // One leg, hip to hem: tapers to the knee, kicks at the hem.
      ctx.fillStyle = shade(thigh, dim);
      ctx.beginPath();
      ctx.moveTo(cx - legW, topY + 0.08);
      ctx.lineTo(cx + legW, topY + 0.08);
      ctx.lineTo(cx + legW * 0.82, 0.04);
      ctx.lineTo(cx + legW * 0.95, hemY);
      ctx.lineTo(cx - legW * 0.95, hemY);
      ctx.lineTo(cx - legW * 0.82, 0.04);
      ctx.closePath();
      ctx.fill();
      // Shin half in the shin tone (wraps and two-tone hose).
      ctx.fillStyle = shade(shin, dim);
      ctx.beginPath();
      ctx.moveTo(cx - legW * 0.82, 0.05);
      ctx.lineTo(cx + legW * 0.82, 0.05);
      ctx.lineTo(cx + legW * 0.95, hemY);
      ctx.lineTo(cx - legW * 0.95, hemY);
      ctx.closePath();
      ctx.fill();
      // Drape creases: two falling folds + the knee break.
      ctx.strokeStyle = shade(thigh, dim - 18);
      ctx.lineWidth = 0.016;
      ctx.beginPath();
      ctx.moveTo(cx - legW * 0.35, topY + 0.12);
      ctx.quadraticCurveTo(cx - legW * 0.45, -0.1, cx - legW * 0.3, 0.02);
      ctx.moveTo(cx + legW * 0.4, topY + 0.14);
      ctx.quadraticCurveTo(cx + legW * 0.3, -0.12, cx + legW * 0.42, 0.0);
      ctx.stroke();
      ctx.strokeStyle = shade(shin, dim - 16);
      ctx.beginPath();
      ctx.moveTo(cx - legW * 0.5, 0.16);
      ctx.quadraticCurveTo(cx, 0.2, cx + legW * 0.5, 0.16);
      ctx.stroke();
      // Catch-light down the near edge of the lit leg.
      if (side < 0) {
        ctx.fillStyle = shade(thigh, 14);
        ctx.beginPath();
        ctx.moveTo(cx - legW * 0.95, topY + 0.09);
        ctx.lineTo(cx - legW * 0.62, topY + 0.09);
        ctx.lineTo(cx - legW * 0.52, hemY - 0.01);
        ctx.lineTo(cx - legW * 0.88, hemY - 0.01);
        ctx.closePath();
        ctx.fill();
      }
      // Hem cuff.
      ctx.fillStyle = shade(shin, dim - 22);
      ctx.fillRect(cx - legW * 0.95, hemY - 0.045, legW * 1.9, 0.045);
      // Knee treatment.
      if (st.knee === 'plate') {
        const kc = st.kneeColor ?? shade(shin, 22);
        ctx.fillStyle = shade(kc, dim);
        ctx.beginPath();
        ctx.ellipse(cx, 0.075, legW * 0.66, 0.055, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(kc, dim + 28);
        ctx.beginPath();
        ctx.ellipse(cx - legW * 0.18, 0.06, legW * 0.26, 0.02, -0.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (st.knee === 'wrap' || st.kind === 'wraps') {
        // Binding courses climbing the shin, ends tucked.
        ctx.strokeStyle = shade(st.kneeColor ?? shade(thigh, 18), dim);
        ctx.lineWidth = 0.03;
        for (const y of [0.1, 0.19, 0.28]) {
          ctx.beginPath();
          ctx.moveTo(cx - legW * 0.85, y - 0.015);
          ctx.lineTo(cx + legW * 0.85, y + 0.02);
          ctx.stroke();
        }
      }
    }
    // The waist yoke over both hips, belt stitch lit.
    ctx.fillStyle = shade(thigh, -20);
    ctx.beginPath();
    ctx.roundRect(-0.36, topY, 0.72, 0.1, 0.025);
    ctx.fill();
    ctx.fillStyle = shade(thigh, 8);
    ctx.fillRect(-0.34, topY + 0.02, 0.68, 0.03);
  };
}

// --------------------------------------------------------------- boots

export function bootsIconPainter(st: BootStyle): Painter {
  return (ctx) => {
    // ONE hero boot in clean right-facing profile — heel block, arched
    // instep, toe spring — with its mate tucked behind-left, dimmed
    // and clearly separate. A cobbler's bench shot, never two lumps.
    ctx.translate(0.5, 0.5);
    const col = st.color;
    // Shaft height in stage units: style heights run 0.06..0.3 tiles.
    const shaft = Math.min(0.62, 0.26 + st.height * 1.3);
    const drawBoot = (ox: number, oy: number, k: number, lit: boolean): void => {
      const c = lit ? col : shade(col, -18);
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(k, k);
      const gy = 0.42; // ground line
      const soleT = 0.05;
      const heelX = -0.26;
      const toeX = 0.3;
      const ankleY = gy - soleT - 0.16;
      const topY = gy - shaft;
      // The upper: shaft (leaning gently forward) flowing into the
      // instep and toe box, one silhouette.
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(heelX, gy - soleT);
      ctx.lineTo(heelX + 0.015, topY + 0.02);
      ctx.quadraticCurveTo(heelX + 0.02, topY, heelX + 0.05, topY);
      ctx.lineTo(heelX + 0.29, topY);
      ctx.quadraticCurveTo(heelX + 0.32, topY, heelX + 0.315, topY + 0.03);
      ctx.lineTo(heelX + 0.27, ankleY - 0.03);
      // Instep sweeping down to the toe box.
      ctx.quadraticCurveTo(heelX + 0.3, gy - soleT - 0.075, toeX - 0.12, gy - soleT - 0.075);
      if (st.curl) {
        // The wizard's footnote: the toe rolls up and over in a
        // crisp spiral.
        ctx.quadraticCurveTo(toeX + 0.06, gy - soleT - 0.08, toeX + 0.08, gy - soleT - 0.2);
        ctx.quadraticCurveTo(toeX + 0.08, gy - soleT - 0.3, toeX - 0.0, gy - soleT - 0.28);
        ctx.quadraticCurveTo(toeX + 0.035, gy - soleT - 0.32, toeX + 0.125, gy - soleT - 0.24);
        ctx.quadraticCurveTo(toeX + 0.15, gy - soleT - 0.06, toeX + 0.02, gy - soleT + 0.005);
      } else {
        // Toe box with a little spring at the tip.
        ctx.quadraticCurveTo(toeX + 0.05, gy - soleT - 0.07, toeX + 0.075, gy - soleT - 0.025);
        ctx.quadraticCurveTo(toeX + 0.08, gy - soleT, toeX + 0.05, gy - soleT + 0.005);
      }
      ctx.lineTo(heelX, gy - soleT + 0.005);
      ctx.closePath();
      ctx.fill();
      // Shaft catch-light down the front face.
      if (lit) {
        ctx.fillStyle = shade(c, 16);
        ctx.beginPath();
        ctx.moveTo(heelX + 0.2, topY + 0.025);
        ctx.lineTo(heelX + 0.27, topY + 0.025);
        ctx.lineTo(heelX + 0.235, ankleY - 0.02);
        ctx.lineTo(heelX + 0.175, ankleY - 0.02);
        ctx.closePath();
        ctx.fill();
      }
      // Ankle crease — the break every worn boot carries.
      ctx.strokeStyle = shade(c, -20);
      ctx.lineWidth = 0.018;
      ctx.beginPath();
      ctx.moveTo(heelX + 0.05, ankleY);
      ctx.quadraticCurveTo(heelX + 0.16, ankleY + 0.045, heelX + 0.26, ankleY + 0.01);
      ctx.stroke();
      // Sole with a true heel block.
      ctx.fillStyle = shade(c, -30);
      ctx.beginPath();
      ctx.moveTo(heelX - 0.01, gy - soleT);
      ctx.lineTo(st.curl ? toeX + 0.04 : toeX + 0.075, gy - soleT);
      ctx.quadraticCurveTo(toeX + 0.09, gy - soleT + 0.02, toeX + 0.06, gy);
      ctx.lineTo(heelX - 0.01, gy);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(heelX - 0.015, gy - 0.005, 0.13, 0.035);
      // Metal toe cap.
      if (st.toe) {
        const tc = lit ? st.toe : shade(st.toe, -16);
        ctx.fillStyle = tc;
        ctx.beginPath();
        ctx.moveTo(toeX - 0.08, gy - soleT - 0.07);
        ctx.quadraticCurveTo(toeX + 0.05, gy - soleT - 0.068, toeX + 0.07, gy - soleT - 0.02);
        ctx.quadraticCurveTo(toeX + 0.075, gy - soleT, toeX + 0.05, gy - soleT + 0.002);
        ctx.lineTo(toeX - 0.06, gy - soleT + 0.002);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(tc, 26);
        ctx.beginPath();
        ctx.moveTo(toeX - 0.07, gy - soleT - 0.06);
        ctx.quadraticCurveTo(toeX + 0.02, gy - soleT - 0.058, toeX + 0.045, gy - soleT - 0.028);
        ctx.lineTo(toeX + 0.02, gy - soleT - 0.02);
        ctx.quadraticCurveTo(toeX - 0.02, gy - soleT - 0.045, toeX - 0.07, gy - soleT - 0.048);
        ctx.closePath();
        ctx.fill();
      }
      // Shaft-top treatment: fur roll, clean cuff, or bare fold.
      const shaftW = 0.315;
      if (st.fur) {
        const fc = lit ? st.fur.color : shade(st.fur.color, -14);
        ctx.fillStyle = fc;
        for (let i = 0; i < 6; i++) {
          const bx = heelX + 0.02 + (i / 5) * (shaftW - 0.05);
          ctx.beginPath();
          ctx.arc(bx, topY + 0.015 + (i % 2) * 0.02, 0.05, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = shade(fc, 16);
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(heelX + 0.05 + i * 0.09, topY + 0.005, 0.032, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (st.cuff) {
        const cc = lit ? st.cuff.color : shade(st.cuff.color, -14);
        ctx.fillStyle = cc;
        ctx.beginPath();
        ctx.roundRect(heelX - 0.005, topY - 0.02, shaftW + 0.015, 0.075, 0.02);
        ctx.fill();
        ctx.fillStyle = shade(cc, 18);
        ctx.fillRect(heelX + 0.01, topY - 0.008, shaftW - 0.015, 0.026);
      } else {
        // A plain boot still shows its rolled top edge.
        ctx.fillStyle = shade(c, -14);
        ctx.fillRect(heelX + 0.01, topY, shaftW - 0.01, 0.028);
      }
      // Climbing straps with a buckle dot on the top course.
      if (st.wrap) {
        const wc = lit ? st.wrap.color : shade(st.wrap.color, -14);
        ctx.strokeStyle = wc;
        ctx.lineWidth = 0.026;
        const n = shaft > 0.42 ? 3 : 2;
        for (let i = 0; i < n; i++) {
          const y = ankleY - 0.02 - (i / Math.max(1, n - 1)) * (shaft - 0.26);
          ctx.beginPath();
          ctx.moveTo(heelX + 0.015, y + 0.015);
          ctx.lineTo(heelX + 0.29, y - 0.015);
          ctx.stroke();
        }
        ctx.fillStyle = shade(wc, 30);
        ctx.beginPath();
        ctx.arc(heelX + 0.245, ankleY - 0.035, 0.018, 0, Math.PI * 2);
        ctx.fill();
      }
      // Dread spike off the shaft top, swept back.
      if (st.spike) {
        ctx.fillStyle = shade(c, 22);
        ctx.beginPath();
        ctx.moveTo(heelX + 0.02, topY + 0.015);
        ctx.lineTo(heelX + 0.13, topY + 0.015);
        ctx.quadraticCurveTo(heelX + 0.04, topY - 0.07, heelX - 0.045, topY - 0.115);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    };
    // The mate behind, clearly its own silhouette; the hero in front.
    drawBoot(-0.115, -0.075, 0.88, false);
    drawBoot(0.055, 0.045, 1, true);
  };
}

// -------------------------------------------------------------- gloves

export function glovesIconPainter(st: GloveStyle): Painter {
  return (ctx) => {
    // ONE hero glove, back of the hand to the viewer, fingers up and
    // the thumb standing off the side — the shape a glove makes on a
    // shop counter. The mate peeks from behind, dimmed.
    ctx.translate(0.5, 0.5);
    const hand = st.hand ?? 'glove';
    const col = st.color;
    const bracer = st.bracer ?? shade(col, -8);
    const drawGlove = (ox: number, oy: number, k: number, lit: boolean): void => {
      const c = lit ? col : shade(col, -18);
      const b = lit ? bracer : shade(bracer, -18);
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(k, k);
      ctx.rotate(0.09);
      const palmW = 0.15; // half-width
      const palmTop = -0.08;
      const palmBot = 0.14;
      // Forearm/bracer below the wrist.
      ctx.fillStyle = b;
      ctx.beginPath();
      ctx.moveTo(-palmW * 0.82, palmBot);
      ctx.lineTo(palmW * 0.82, palmBot);
      ctx.lineTo(palmW * 0.95, 0.4);
      ctx.lineTo(-palmW * 0.95, 0.4);
      ctx.closePath();
      ctx.fill();
      if (lit) {
        ctx.fillStyle = shade(b, 14);
        ctx.fillRect(-palmW * 0.6, palmBot + 0.02, palmW * 0.5, 0.23);
      }
      // Cuff at the elbow seam.
      if (st.cuff) {
        const cc = lit ? st.cuff.color : shade(st.cuff.color, -14);
        ctx.fillStyle = cc;
        if (st.cuff.kind === 'fur') {
          for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(-palmW * 0.9 + i * palmW * 0.45, 0.385 + (i % 2) * 0.015, 0.042, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (st.cuff.kind === 'flare') {
          // Forged vambrace mouth, wider than the arm.
          ctx.beginPath();
          ctx.moveTo(-palmW * 1.35, 0.42);
          ctx.lineTo(palmW * 1.35, 0.42);
          ctx.lineTo(palmW * 0.9, 0.3);
          ctx.lineTo(-palmW * 0.9, 0.3);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = shade(cc, 20);
          ctx.fillRect(-palmW * 1.15, 0.395, palmW * 2.3, 0.022);
        } else {
          ctx.beginPath();
          ctx.roundRect(-palmW * 1.05, 0.33, palmW * 2.1, 0.07, 0.018);
          ctx.fill();
          ctx.fillStyle = shade(cc, 18);
          ctx.fillRect(-palmW * 0.95, 0.345, palmW * 1.9, 0.024);
        }
      }
      // The hand.
      ctx.fillStyle = c;
      if (hand === 'paw') {
        // Beast mitt: fat pad with two toe splits and claw tips.
        ctx.beginPath();
        ctx.ellipse(0, -0.06, palmW * 1.25, 0.21, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = shade(c, -24);
        ctx.lineWidth = 0.02;
        for (const dx of [-palmW * 0.42, palmW * 0.42]) {
          ctx.beginPath();
          ctx.moveTo(dx, -0.265);
          ctx.lineTo(dx, -0.13);
          ctx.stroke();
        }
        ctx.fillStyle = shade(c, 30);
        for (const dx of [-palmW * 0.8, 0, palmW * 0.8]) {
          ctx.beginPath();
          ctx.moveTo(dx - 0.02, -0.24);
          ctx.quadraticCurveTo(dx, -0.32, dx + 0.025, -0.24);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        // Palm block.
        ctx.beginPath();
        ctx.roundRect(-palmW, palmTop - 0.02, palmW * 2, palmBot - palmTop + 0.04, 0.03);
        ctx.fill();
        // Four molded fingers off the knuckle line, middle tallest.
        const fw = palmW * 0.47;
        const lens = hand === 'gauntlet' ? [0.2, 0.24, 0.22, 0.16] : [0.21, 0.26, 0.23, 0.16];
        const bare = st.fingerless;
        for (let i = 0; i < 4; i++) {
          const fx = -palmW + fw * (i + 0.5) + fw * i * 0.08;
          const len = lens[i]!;
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.roundRect(fx - fw * 0.44, palmTop - len, fw * 0.88, len + 0.05, fw * 0.42);
          ctx.fill();
          if (bare) {
            // The thief's cut: bare fingertips past the shortened stalls.
            ctx.fillStyle = lit ? '#c9997a' : shade('#c9997a', -16);
            ctx.beginPath();
            ctx.roundRect(fx - fw * 0.36, palmTop - len, fw * 0.72, 0.075, fw * 0.35);
            ctx.fill();
          } else if (hand === 'gauntlet') {
            // Finger lames: two joint cuts per finger stall.
            ctx.strokeStyle = shade(c, -24);
            ctx.lineWidth = 0.014;
            for (const t of [0.38, 0.68]) {
              ctx.beginPath();
              ctx.moveTo(fx - fw * 0.4, palmTop - len * t);
              ctx.lineTo(fx + fw * 0.4, palmTop - len * t);
              ctx.stroke();
            }
          }
        }
        // Thumb standing off the near side.
        ctx.fillStyle = c;
        ctx.save();
        ctx.translate(palmW * 0.98, 0.015);
        ctx.rotate(0.62);
        ctx.beginPath();
        ctx.roundRect(-0.042, -0.15, 0.084, 0.2, 0.04);
        ctx.fill();
        if (hand === 'gauntlet') {
          ctx.strokeStyle = shade(c, -24);
          ctx.lineWidth = 0.014;
          ctx.beginPath();
          ctx.moveTo(-0.036, -0.08);
          ctx.lineTo(0.036, -0.08);
          ctx.stroke();
        }
        ctx.restore();
        // Back-of-hand form: lit plane on the thumb side.
        ctx.fillStyle = shade(c, lit ? 14 : 8);
        ctx.beginPath();
        ctx.roundRect(palmW * 0.25, palmTop, palmW * 0.6, palmBot - palmTop, 0.025);
        ctx.fill();
        if (hand === 'gauntlet') {
          // The hand plate: a beveled cap over the metacarpals.
          ctx.fillStyle = shade(c, 20);
          ctx.beginPath();
          ctx.roundRect(-palmW * 0.82, palmTop + 0.005, palmW * 1.64, 0.085, 0.025);
          ctx.fill();
          ctx.strokeStyle = shade(c, -20);
          ctx.lineWidth = 0.014;
          ctx.beginPath();
          ctx.moveTo(-palmW * 0.7, palmTop + 0.09);
          ctx.lineTo(palmW * 0.7, palmTop + 0.09);
          ctx.stroke();
        } else if (hand === 'wrap') {
          // Binding courses crossing the palm and wrist.
          ctx.strokeStyle = shade(c, 16);
          ctx.lineWidth = 0.026;
          for (const y of [-0.02, 0.05, 0.12]) {
            ctx.beginPath();
            ctx.moveTo(-palmW * 0.95, y - 0.02);
            ctx.lineTo(palmW * 0.95, y + 0.025);
            ctx.stroke();
          }
        } else {
          // Fitted glove: back-seam stitching toward the fingers.
          ctx.strokeStyle = shade(c, -18);
          ctx.lineWidth = 0.012;
          for (const dx of [-palmW * 0.45, 0, palmW * 0.45]) {
            ctx.beginPath();
            ctx.moveTo(dx, palmTop + 0.01);
            ctx.lineTo(dx, palmTop + 0.1);
            ctx.stroke();
          }
        }
      }
      // Knuckle device across the knuckle line.
      if (st.knuckle) {
        const kc = lit ? st.knuckle.color : shade(st.knuckle.color, -14);
        ctx.fillStyle = kc;
        const ky = palmTop + 0.045;
        if (st.knuckle.kind === 'studs') {
          for (const dx of [-palmW * 0.55, 0, palmW * 0.55]) {
            ctx.beginPath();
            ctx.arc(dx, ky, 0.026, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = shade(kc, 34);
            ctx.beginPath();
            ctx.arc(dx - 0.008, ky - 0.008, 0.01, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = kc;
          }
        } else if (st.knuckle.kind === 'spikes') {
          for (const dx of [-palmW * 0.55, 0, palmW * 0.55]) {
            ctx.beginPath();
            ctx.moveTo(dx - 0.026, ky + 0.02);
            ctx.lineTo(dx + 0.026, ky + 0.02);
            ctx.lineTo(dx, ky - 0.075);
            ctx.closePath();
            ctx.fill();
          }
        } else if (st.knuckle.kind === 'claws') {
          for (const dx of [-palmW * 0.6, 0, palmW * 0.6]) {
            ctx.beginPath();
            ctx.moveTo(dx - 0.02, ky + 0.02);
            ctx.quadraticCurveTo(dx + 0.04, ky - 0.05, dx + 0.055, ky - 0.115);
            ctx.quadraticCurveTo(dx + 0.014, ky - 0.055, dx + 0.02, ky + 0.02);
            ctx.closePath();
            ctx.fill();
          }
        } else if (st.knuckle.kind === 'plate') {
          ctx.beginPath();
          ctx.roundRect(-palmW * 0.75, ky - 0.045, palmW * 1.5, 0.09, 0.02);
          ctx.fill();
          ctx.strokeStyle = shade(kc, 26);
          ctx.lineWidth = 0.014;
          ctx.beginPath();
          ctx.moveTo(-palmW * 0.55, ky - 0.018);
          ctx.lineTo(palmW * 0.55, ky - 0.018);
          ctx.stroke();
        } else {
          // Bezel-set gem.
          ctx.fillStyle = shade(kc, -22);
          ctx.beginPath();
          ctx.arc(0, ky, 0.056, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = kc;
          ctx.beginPath();
          ctx.arc(0, ky, 0.042, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = shade(kc, 42);
          ctx.beginPath();
          ctx.arc(-0.013, ky - 0.013, 0.016, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    };
    // The mate behind-left showing its silhouette edge; the hero big.
    drawGlove(-0.21, -0.05, 0.8, false);
    drawGlove(0.07, 0.02, 1.06, true);
  };
}

// -------------------------------------------------------------- shield

/**
 * THE PRODUCT SHOT IS THE WORLD ART. A shield icon is the same painter
 * the body wears, turned three-quarters on and lit by the same sun —
 * so what a player studies in the pack is exactly what they see on
 * their own arm. Nothing here is re-authored.
 *
 * Shields only: the caller gates tomes, orbs and quivers out to their
 * own bespoke object painters before ever reaching this.
 */
export function offhandIconPainter(st: OffhandStyle, id = ''): Painter {
  const sh = shieldStyle(
    id,
    isShieldKind(st.kind) ? st.kind : 'buckler',
    st.color,
    st.trim,
    st.boss,
  );
  return (ctx) => {
    ctx.translate(0.5, 0.5);
    drawShieldAt(ctx, sh, {
      cx: 0,
      cy: 0,
      size: 0.42,
      // Turned off square: the icon shows a face AND an edge at once,
      // which is what tells the eye this is a dished object in the
      // world and not a sticker of one.
      theta: 0.42,
      tilt: -0.1,
      oside: 1,
    });
  };
}

