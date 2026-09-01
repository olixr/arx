/**
 * THE SOFT CROWNS — the forty-two cloth and leather helm kinds, one
 * painter per kind, keyed by HelmStyle.kind. Every painter is one
 * former drawHelmet branch, moved verbatim (foundations F3.2); each is
 * TERMINAL — the metal furniture tail never runs for a soft crown,
 * exactly as the old branch returns guaranteed.
 */
import { auroraK, breezeK, cinderFlareK, cinderK, daybreakK, emberCrack, fenlightK, starPrick, stormArc, stormVeil, stormboltK, thistleSeed, tideBreakK, tideK, tideStream, voidK, voidRift, voidWink } from './armorClocks.js';
import { chamferRect } from './shapes.js';
import { shade } from './tint.js';
import type { HelmCtx } from './armorHelmCtx.js';

function paintWizardHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, headR, fx, backK, lead, hurt, mc } = hc;
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

function paintMagusHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, headR, fx, backK, lead, hurt, mc } = hc;
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

function paintCircletHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, headR, fx, backK, hurt, mc } = hc;
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

function paintVeilHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintHoodHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc, drawGlyphOrbit, drawSideFins, drawSpikesCrown } = hc;
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

function paintThistlehatHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintMothcowlHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintShroudcowlHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintThunderhatHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintShowerhatHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintCoronacowlHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintHedgehatHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, headR, fx, backK, lead, hurt, mc } = hc;
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

function paintTidehatHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintDepthcrownHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintMurkcowlHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintMaelcowlHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintHushcowlHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintOathcowlHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintStardiademHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, headR, backK, hurt, mc } = hc;
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

function paintCourierhoodHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintSharkmawHelm(hc: HelmCtx): void {
  const { ctx, st, s, headX, headY, hw, hh, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintAnglerhoodHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintKrakencowlHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintMarlincrestHelm(hc: HelmCtx): void {
  const { ctx, st, s, headX, headY, hw, hh, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintGuildcowlHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintLatchhoodHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintVeilwrapHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintGripmaskHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintTrapperhoodHelm(hc: HelmCtx): void {
  const { ctx, st, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintFoxmantleHelm(hc: HelmCtx): void {
  const { ctx, st, f, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt } = hc;
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

function paintRoadhoodHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintWolfmantleHelm(hc: HelmCtx): void {
  const { ctx, st, f, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintShadowcowlHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintStagcrownHelm(hc: HelmCtx): void {
  const { ctx, st, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintOrisoncowlHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintVespercowlHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintZenithhatHelm(hc: HelmCtx): void {
  const { ctx, st, f, headX, headY, hw, hh, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintUmbrahoodHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintWealdcowlHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintBloomcrownHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

function paintSedgehatHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, headR, profileK, backK, lead, hurt } = hc;
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

function paintHeroncowlHelm(hc: HelmCtx): void {
  const { ctx, st, f, s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt, mc } = hc;
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

export const CLOTH_HELMS: Record<string, (hc: HelmCtx) => void> = {
  wizard: paintWizardHelm,
  magus: paintMagusHelm,
  circlet: paintCircletHelm,
  veil: paintVeilHelm,
  hood: paintHoodHelm,
  thistlehat: paintThistlehatHelm,
  mothcowl: paintMothcowlHelm,
  shroudcowl: paintShroudcowlHelm,
  thunderhat: paintThunderhatHelm,
  showerhat: paintShowerhatHelm,
  coronacowl: paintCoronacowlHelm,
  hedgehat: paintHedgehatHelm,
  tidehat: paintTidehatHelm,
  depthcrown: paintDepthcrownHelm,
  murkcowl: paintMurkcowlHelm,
  maelcowl: paintMaelcowlHelm,
  hushcowl: paintHushcowlHelm,
  oathcowl: paintOathcowlHelm,
  stardiadem: paintStardiademHelm,
  courierhood: paintCourierhoodHelm,
  sharkmaw: paintSharkmawHelm,
  anglerhood: paintAnglerhoodHelm,
  krakencowl: paintKrakencowlHelm,
  marlincrest: paintMarlincrestHelm,
  guildcowl: paintGuildcowlHelm,
  latchhood: paintLatchhoodHelm,
  veilwrap: paintVeilwrapHelm,
  gripmask: paintGripmaskHelm,
  trapperhood: paintTrapperhoodHelm,
  foxmantle: paintFoxmantleHelm,
  roadhood: paintRoadhoodHelm,
  wolfmantle: paintWolfmantleHelm,
  shadowcowl: paintShadowcowlHelm,
  stagcrown: paintStagcrownHelm,
  orisoncowl: paintOrisoncowlHelm,
  vespercowl: paintVespercowlHelm,
  zenithhat: paintZenithhatHelm,
  umbrahood: paintUmbrahoodHelm,
  wealdcowl: paintWealdcowlHelm,
  bloomcrown: paintBloomcrownHelm,
  sedgehat: paintSedgehatHelm,
  heroncowl: paintHeroncowlHelm,
};
