/**
 * THE FORGE LAW — the seventeen full-metal helms, one painter per
 * kind. Every painter is one former drawHelmet ladder arm, moved
 * verbatim (foundations F3.2); metal painters FALL THROUGH to the
 * furniture tail (wings, horns, plume, standard…) in drawHelmet,
 * exactly as the old ladder did.
 */
import { chamferRect } from './shapes.js';
import { shade } from './tint.js';
import type { MetalHelmCtx } from './armorHelmCtx.js';

function paintGreathelmHelm(hc: MetalHelmCtx): void {
  const { ctx, st, s, headX, headY, hw, hh, cut, headR, hurt, mc, vx, sw, front, shellLight } = hc;
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
}

function paintBarbuteHelm(hc: MetalHelmCtx): void {
  const { ctx, st, s, headX, headY, hw, hh, headR, profileK, hurt, mc, ld, vx, sw, front, shellLight } = hc;
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
}

function paintArmetHelm(hc: MetalHelmCtx): void {
  const { ctx, st, s, headX, headY, hw, hh, headR, hurt, mc, vx, sw, front, shellLight } = hc;
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
}

function paintSalletHelm(hc: MetalHelmCtx): void {
  const { ctx, st, s, headX, headY, hw, hh, headR, profileK, hurt, mc, ld, vx, sw, front, shellLight } = hc;
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
}

function paintRadiantHelm(hc: MetalHelmCtx): void {
  const { ctx, st, s, headX, headY, hw, hh, headR, hurt, mc, vx, sw, front, shellLight } = hc;
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
}

function paintRamfortHelm(hc: MetalHelmCtx): void {
  const { ctx, st, s, headX, headY, hw, hh, cut, headR, profileK, hurt, mc, ld, vx, sw, front, shellLight } = hc;
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
}

function paintWarmaskHelm(hc: MetalHelmCtx): void {
  const { ctx, st, s, headX, headY, hw, hh, cut, headR, profileK, hurt, mc, ld, vx, sw, front, shellLight } = hc;
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
}

function paintDreadHelm(hc: MetalHelmCtx): void {
  const { ctx, st, s, headX, headY, hw, hh, headR, hurt, mc, vx, sw, front, shellLight } = hc;
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
}

function paintBriarHelm(hc: MetalHelmCtx): void {
  const { ctx, st, s, headX, headY, hw, hh, cut, headR, hurt, mc, vx, sw, front, shellLight } = hc;
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
}

function paintDrakeHelm(hc: MetalHelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, headR, fx, profileK, hurt, mc, ld, front, shellLight } = hc;
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
}

function paintAurochsHelm(hc: MetalHelmCtx): void {
  const { ctx, st, s, headX, headY, hw, hh, cut, headR, hurt, mc, vx, sw, front, shellLight } = hc;
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
}

function paintBarrowHelm(hc: MetalHelmCtx): void {
  const { ctx, st, s, headX, headY, hw, hh, cut, headR, profileK, hurt, mc, ld, vx, sw, front, shellLight } = hc;
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
}

function paintTempestHelm(hc: MetalHelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, headR, profileK, hurt, mc, ld, vx, sw, front, shellLight } = hc;
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
}

function paintFurnaceHelm(hc: MetalHelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, hurt, mc, vx, sw, front, shellLight } = hc;
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
}

function paintWyrmHelm(hc: MetalHelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, profileK, hurt, mc, ld, vx, sw, front, shellLight } = hc;
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
}

function paintWarcrownHelm(hc: MetalHelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, headR, profileK, lead, hurt, mc, vx, sw, front, shellLight } = hc;
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
}

function paintGatehelmHelm(hc: MetalHelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, headR, lead, hurt, mc, vx, sw, front, shellLight } = hc;
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

export const METAL_HELMS: Record<string, (hc: MetalHelmCtx) => void> = {
  greathelm: paintGreathelmHelm,
  bascinet: paintGreathelmHelm,
  barbute: paintBarbuteHelm,
  armet: paintArmetHelm,
  sallet: paintSalletHelm,
  radiant: paintRadiantHelm,
  ramfort: paintRamfortHelm,
  warmask: paintWarmaskHelm,
  dread: paintDreadHelm,
  briar: paintBriarHelm,
  drake: paintDrakeHelm,
  aurochs: paintAurochsHelm,
  barrow: paintBarrowHelm,
  tempest: paintTempestHelm,
  furnace: paintFurnaceHelm,
  wyrm: paintWyrmHelm,
  warcrown: paintWarcrownHelm,
  gatehelm: paintGatehelmHelm,
};
