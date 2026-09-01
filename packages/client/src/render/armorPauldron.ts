/**
 * THE SHOULDER'S KEEPING — drawPauldron whole: every family's shoulder
 * furniture from cloth roll to dread wing. Moved verbatim from
 * armor.ts (foundations F3.1).
 */
import { chamferRect } from './shapes.js';
import { shade } from './tint.js';
import { auroraK, breezeK, cinderFlareK, cinderK, cloudPuff, daybreakK, fenlightK, starPrick, stormArc, stormboltK, thistleSeed, tideBreakK, tideK, voidK, voidWink } from './armorClocks.js';
import { type BodyStyle } from './armorStyles.js';

/**
 * One flame lick that gives no heat: soft halo, a swaying tongue, a
 * hotter core — the cold-fire grammar the thorn twins and the fellbone
 * bones share. Deterministic from the clock; `sway` re-shapes the
 * tongue so no two beats burn alike.
 */
function coldLick(
  ctx: CanvasRenderingContext2D,
  fx: number,
  fy: number,
  h: number,
  w: number,
  a: number,
  sway: number,
  colr: string,
): void {
  if (a <= 0.05) return;
  ctx.globalAlpha = a * 0.28;
  ctx.fillStyle = colr;
  ctx.beginPath();
  ctx.ellipse(fx, fy - h * 0.4, w * 2.1, h * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = a * 0.85;
  ctx.beginPath();
  ctx.moveTo(fx - w, fy);
  ctx.quadraticCurveTo(fx - w * 1.15, fy - h * 0.42, fx + sway, fy - h);
  ctx.quadraticCurveTo(fx + w * 1.2, fy - h * 0.34, fx + w, fy);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = a;
  ctx.fillStyle = shade(colr, 26);
  ctx.beginPath();
  ctx.moveTo(fx - w * 0.45, fy);
  ctx.quadraticCurveTo(fx - w * 0.5, fy - h * 0.3, fx + sway * 0.55, fy - h * 0.6);
  ctx.quadraticCurveTo(fx + w * 0.55, fy - h * 0.24, fx + w * 0.45, fy);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}


export function drawPauldron(
  ctx: CanvasRenderingContext2D,
  st: BodyStyle,
  x: number,
  y: number,
  side: number,
  s: number,
  squashK: number,
  hurt: boolean,
  near: boolean,
  nowMs = 0,
  /** THE SHOULDER GLOBE's depth channel, -1 (far) .. +1 (near): the
   *  caller projects the shoulder bar through the tilted camera and
   *  this cap's place on it sizes the whole assembly — perspective as
   *  size, before the shading says a word. 0 = the level flank read. */
  depthK = 0,
  /** Outward lean, radians: the cap rotates toward its own outward
   *  screen direction as the body turns — worn on the deltoid, not
   *  gimbaled upright at every heading. */
  tilt = 0,
): void {
  if (st.pauldron === 'none') return;
  const base = st.pauldronColor ?? st.metal ?? shade(st.color, -14);
  const col = hurt ? '#ffffff' : near ? shade(base, 8) : shade(base, -12);
  const trim = hurt ? '#ffffff' : (st.pauldronTrim ?? shade(base, 26));
  ctx.save();
  ctx.translate(x, y - 0.035 * s);
  if (tilt) ctx.rotate(tilt);
  // Perspective is size: the set's own boldness dial (champion plate
  // earns a bigger shoulder), then the depth channel — the near cap
  // of a turned body swells, the far cap steps back.
  const bold = (st.pauldronScale ?? 1) * (1 + depthK * 0.15);
  ctx.scale(Math.max(0.55, squashK) * bold, bold);
  /**
   * THE WORN SEAT — the shell every bespoke statement stands on: a
   * domed cap that CUPS the arm root, wide enough that the arm reads
   * as hanging FROM the pauldron instead of the pauldron floating on
   * a stub (the fan-on-a-stick read the user caught). Top plane lit,
   * under-hem curled up around the arm, one bright rim line to say
   * WORN — then each kind's device rides the dome.
   */
  const seat = (hw2: number, drop: number, capCol: string, rimCol: string): void => {
    ctx.fillStyle = hurt ? '#ffffff' : capCol;
    ctx.beginPath();
    ctx.moveTo(-hw2, drop * 0.55);
    ctx.quadraticCurveTo(-hw2 * 1.08, -drop * 0.5, -hw2 * 0.46, -drop * 0.84);
    ctx.quadraticCurveTo(0, -drop * 1.08, hw2 * 0.46, -drop * 0.84);
    ctx.quadraticCurveTo(hw2 * 1.08, -drop * 0.5, hw2, drop * 0.55);
    // The under-hem curves up around the arm — a shell, not a slab.
    ctx.quadraticCurveTo(0, drop * 0.95, -hw2, drop * 0.55);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // The 2.5D dome read: lit crown plane, shaded under-hem.
      ctx.fillStyle = shade(capCol, 14);
      ctx.beginPath();
      ctx.ellipse(0, -drop * 0.5, hw2 * 0.6, drop * 0.34, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shade(capCol, -24);
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(-hw2 * 0.9, drop * 0.5);
      ctx.quadraticCurveTo(0, drop * 0.86, hw2 * 0.9, drop * 0.5);
      ctx.stroke();
      // The rim hem: the one bright line that says WORN.
      ctx.strokeStyle = rimCol;
      ctx.lineWidth = Math.max(1, s * 0.015);
      ctx.beginPath();
      ctx.moveTo(-hw2, drop * 0.55);
      ctx.quadraticCurveTo(0, drop * 0.95, hw2, drop * 0.55);
      ctx.stroke();
    }
  };
  if (st.pauldron === 'orbs') {
    // A conjured orb in patient orbit over each shoulder — floating,
    // never mounted; the gap between orb and shoulder IS the trick.
    // Pushed OUTWARD past the skull silhouette: the head paints after
    // the pauldrons, so an orb hovering straight up simply vanishes.
    const bob = Math.sin(nowMs * 0.0021 + side * 1.3) * 0.014 * s;
    const ox = side * 0.14 * s;
    const oy = -0.095 * s + bob;
    const orx = 0.072 * s;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(ox, oy, orx, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      // Shadowed underside + a hard glint — a sphere, not a dot.
      ctx.fillStyle = shade(base, -22);
      ctx.beginPath();
      ctx.arc(ox, oy, orx, Math.PI * 0.12, Math.PI * 0.88);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(base, 38);
      ctx.beginPath();
      ctx.arc(ox - orx * 0.32, oy - orx * 0.34, orx * 0.27, 0, Math.PI * 2);
      ctx.fill();
      // One trailing spark falling out of the orbit.
      ctx.globalAlpha = 0.45 + 0.3 * Math.sin(nowMs * 0.003 + side * 2.1);
      ctx.fillStyle = shade(base, 20);
      const spy = oy + orx + 0.03 * s;
      ctx.beginPath();
      ctx.moveTo(ox, spy - 0.013 * s);
      ctx.lineTo(ox + 0.01 * s, spy);
      ctx.lineTo(ox, spy + 0.013 * s);
      ctx.lineTo(ox - 0.01 * s, spy);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'dawncrest') {
    // THE DAWNCREST — the dawnsworn shoulder: a sunrise over each
    // arm. The worn seat's hem is the horizon; a small gilt disc
    // climbs out of it on THE DAYBREAK clock with three ray tabs
    // reaching, so the whole set — brow, hem and shoulders — keeps
    // one sky. Ivory cap under gold: the dawn stays the statement.
    const phase = st.dawnbands?.phase;
    const dayK = daybreakK(nowMs, phase);
    const crest = trim;
    const horizonY = -0.078 * s;
    const dr = 0.062 * s;
    // A sliver of sun always shows — a blank shoulder is no shrine.
    const lift = phase === 'noon' ? dr * 0.9 : dr * (0.16 + 0.55 * dayK);
    const dyC = horizonY - lift;
    // Rays first — they reach with the light.
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI * 0.82 + (i / 2) * Math.PI * 0.64;
      const reach = 0.4 + 0.7 * dayK;
      const len = dr * (i === 1 ? 1.05 : 0.7) * reach;
      if (len < dr * 0.12) continue;
      const rx0 = Math.cos(a) * dr * 0.9;
      const ry0 = dyC + Math.sin(a) * dr * 0.9;
      const rx1 = Math.cos(a) * (dr * 0.9 + len);
      const ry1 = dyC + Math.sin(a) * (dr * 0.9 + len);
      const w = dr * 0.17;
      ctx.fillStyle = hurt ? '#ffffff' : shade(crest, i === 1 ? 6 : -8);
      ctx.beginPath();
      ctx.moveTo(rx0 - Math.sin(a) * w, ry0 + Math.cos(a) * w);
      ctx.lineTo(rx1 - Math.sin(a) * w * 0.3, ry1 + Math.cos(a) * w * 0.3);
      ctx.lineTo(rx1 + Math.sin(a) * w * 0.3, ry1 - Math.cos(a) * w * 0.3);
      ctx.lineTo(rx0 + Math.sin(a) * w, ry0 - Math.cos(a) * w);
      ctx.closePath();
      ctx.fill();
    }
    // The disc, clipped at the shoulder horizon.
    ctx.save();
    ctx.beginPath();
    ctx.rect(-dr * 2.2, horizonY - s * 0.3, dr * 4.4, s * 0.3);
    ctx.clip();
    ctx.fillStyle = hurt ? '#ffffff' : crest;
    ctx.beginPath();
    ctx.arc(0, dyC, dr, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = shade(crest, 22);
      ctx.beginPath();
      ctx.arc(0, dyC, dr * 0.72, Math.PI * 1.1, Math.PI * 1.9);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // The seat carries the sky — the horizon the little sun owns.
    seat(0.115 * s, 0.092 * s, hurt ? '#ffffff' : col, trim);
    ctx.restore();
    return;
  }
  if (st.pauldron === 'boughmantle') {
    // THE BOUGH MANTLE — the fenwalker shoulders, third forging, and
    // the base court's pair comes home MATCHED: mastery of the green
    // reads as symmetry (user-amended; the asymmetric-answer law
    // still stands for the species lots). Each shoulder is a living
    // hillock — leaf-lapped tiers cupping the arm, a grown bough
    // arcing outboard whose bud unfurls as the green charge swells,
    // grass standing at the crown, and the fen light banked under
    // the hem. Life rises off the mantle one mote at a time; both
    // shoulders keep ONE watch while the hood keeps the other.
    const wisp = st.wispcourt?.color ?? trim;
    seat(0.116 * s, 0.09 * s, hurt ? '#ffffff' : col, trim);
    const k = fenlightK(nowMs, 0.5);
    // THE LIVING BOUGH is garment-scale STRUCTURE: it holds white in
    // the hurt flash so the silhouette never pops. One tapered limb,
    // grown from the crown, arcing out and up — never a stroke.
    // The bough ducks as the body turns: at a profile the near cap
    // rides below the jaw, and a full-height limb would cross the
    // face — the rise gives back a third of itself with depth.
    const duck = 1 - 0.35 * Math.abs(depthK);
    const bx0 = side * 0.004 * s;
    const by0 = -0.028 * s;
    const bcx = side * 0.058 * s;
    const bcy = -0.102 * s * duck;
    const bxT = side * 0.142 * s + Math.sin(nowMs * 0.0014) * 0.005 * s;
    const byT = -0.072 * s * duck;
    const bN = 8;
    const bOut: Array<[number, number]> = [];
    const bIn: Array<[number, number]> = [];
    for (let i = 0; i <= bN; i++) {
      const u = i / bN;
      const mx = (1 - u) * (1 - u) * bx0 + 2 * (1 - u) * u * bcx + u * u * bxT;
      const my = (1 - u) * (1 - u) * by0 + 2 * (1 - u) * u * bcy + u * u * byT;
      const tx = 2 * (1 - u) * (bcx - bx0) + 2 * u * (bxT - bcx);
      const ty = 2 * (1 - u) * (bcy - by0) + 2 * u * (byT - bcy);
      const tl = Math.hypot(tx, ty) || 1;
      const w = s * (0.022 - 0.014 * u);
      bOut.push([mx - (ty / tl) * w, my + (tx / tl) * w]);
      bIn.push([mx + (ty / tl) * w, my - (tx / tl) * w]);
    }
    const boughCol = hurt ? '#ffffff' : shade(trim, -36);
    ctx.fillStyle = boughCol;
    ctx.beginPath();
    ctx.moveTo(bOut[0]![0], bOut[0]![1]);
    for (const [px2, py2] of bOut) ctx.lineTo(px2, py2);
    for (let i = bIn.length - 1; i >= 0; i--) ctx.lineTo(bIn[i]![0], bIn[i]![1]);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // The bough's lit top edge — the sun side of the limb.
      ctx.fillStyle = shade(trim, -16);
      ctx.beginPath();
      ctx.moveTo(bOut[1]![0], bOut[1]![1]);
      for (let i = 1; i <= 6; i++) ctx.lineTo(bOut[i]![0], bOut[i]![1]);
      for (let i = 6; i >= 1; i--) {
        const o = bOut[i]!; const n = bIn[i]!;
        ctx.lineTo(o[0] * 0.55 + n[0] * 0.45, o[1] * 0.55 + n[1] * 0.45);
      }
      ctx.closePath();
      ctx.fill();
      // THE BUD at the bough's tip: three leaflets parting with the
      // charge, the fen light burning in the part. It never opens
      // whole and never dies — the growth is the animation.
      const part = 0.16 + 0.58 * k;
      const budA = -Math.PI * 0.42;
      for (const dj of [-1, 0, 1] as const) {
        const la = budA + side * dj * part;
        const ll = 0.06 * s * (dj === 0 ? 1.12 : 0.88);
        ctx.fillStyle = shade(trim, dj === 0 ? 2 : -14);
        ctx.beginPath();
        ctx.moveTo(bxT, byT);
        ctx.quadraticCurveTo(bxT + Math.cos(la - 0.4) * ll, byT + Math.sin(la - 0.4) * ll, bxT + Math.cos(la) * ll, byT + Math.sin(la) * ll);
        ctx.quadraticCurveTo(bxT + Math.cos(la + 0.4) * ll, byT + Math.sin(la + 0.4) * ll, bxT, byT);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 0.2 + 0.32 * k;
      ctx.fillStyle = wisp;
      ctx.beginPath();
      ctx.arc(bxT, byT - 0.012 * s, 0.026 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5 + 0.5 * k;
      ctx.fillStyle = shade(wisp, 28);
      ctx.beginPath();
      ctx.arc(bxT, byT - 0.012 * s, 0.009 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // THE GRASS AT THE CROWN: three filled blades behind the
      // bough's root, bending in the same slow air.
      for (const [gi, gu, gh] of [[0, -0.056, 0.062], [1, -0.02, 0.084]] as const) {
        const gx = side * gu * s;
        const gsw = Math.sin(nowMs * 0.0017 + gi * 2.1) * 0.008 * s;
        ctx.fillStyle = shade(col, gi === 1 ? 14 : -4);
        ctx.beginPath();
        ctx.moveTo(gx - 0.008 * s, -0.05 * s);
        ctx.quadraticCurveTo(gx + gsw * 0.5 - 0.002 * s, -0.05 * s - gh * s * 0.6, gx + gsw + side * 0.006 * s, -0.05 * s - gh * s);
        ctx.quadraticCurveTo(gx + gsw * 0.5 + 0.006 * s, -0.05 * s - gh * s * 0.55, gx + 0.008 * s, -0.048 * s);
        ctx.closePath();
        ctx.fill();
      }
      // THE LEAF LAPS: three tiers of pointed leaves shingling the
      // seat — the family ground, grown not thatched. Each tier a
      // value step; alternate leaves carry a lit midrib.
      for (const [ti, ly, dv] of [[0, -0.052, 14], [1, -0.012, -2], [2, 0.028, -13]] as const) {
        ctx.fillStyle = shade(col, dv);
        ctx.beginPath();
        ctx.moveTo(-0.116 * s, ly * s);
        ctx.lineTo(0.116 * s, ly * s);
        for (let i = 3; i >= 0; i--) {
          const u = -1 + (i / 3) * 2;
          const px2 = u * 0.088 * s;
          const drop = (0.03 + 0.006 * Math.sin(i * 2.7 + ti * 1.3)) * s;
          ctx.lineTo(px2 + 0.032 * s, ly * s + 0.012 * s);
          ctx.quadraticCurveTo(px2 + 0.011 * s, ly * s + drop * 0.9, px2, ly * s + drop);
          ctx.quadraticCurveTo(px2 - 0.011 * s, ly * s + drop * 0.9, px2 - 0.032 * s, ly * s + 0.012 * s);
        }
        ctx.closePath();
        ctx.fill();
        if (ti === 1) {
          ctx.fillStyle = shade(col, dv + 16);
          for (let i = 0; i < 4; i++) {
            const px2 = (-1 + (i / 3) * 2) * 0.088 * s;
            ctx.fillRect(px2 - 0.004 * s, ly * s + 0.008 * s, 0.008 * s, 0.02 * s);
          }
        }
      }
      // THE BANKED LIGHT: the fen light living under the hem — a
      // soft pool, no cage, the green that moved in on its own.
      ctx.globalAlpha = 0.14 + 0.22 * k;
      ctx.fillStyle = wisp;
      ctx.beginPath();
      ctx.ellipse(side * 0.072 * s, 0.06 * s, 0.036 * s, 0.017 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.4 + 0.3 * k;
      ctx.fillStyle = shade(wisp, 26);
      ctx.beginPath();
      ctx.ellipse(side * 0.074 * s, 0.06 * s, 0.014 * s, 0.007 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // LIFE RISING: two motes climbing off the mantle, staggered on
      // the watch — spores going home upward.
      for (const mi of [0, 1] as const) {
        const rise = ((nowMs * 0.00042) + mi * 0.5) % 1;
        const mAlpha = 0.55 * k * Math.sin(rise * Math.PI);
        if (mAlpha < 0.03) continue;
        ctx.globalAlpha = mAlpha;
        ctx.fillStyle = wisp;
        ctx.beginPath();
        ctx.arc(
          side * (0.05 + mi * 0.045) * s + Math.sin(rise * Math.PI * 2 + mi * 2) * 0.012 * s,
          0.04 * s - rise * 0.16 * s,
          (0.0095 - mi * 0.002) * s, 0, Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'orchidpaul') {
    // THE ORCHIDPAUL — mirebloom's shoulders: the flower's whole
    // life worn as a pair. The right is THE BLOOM — a five-petal
    // whorl open on the seat, heart burning on the fen clock; the
    // left is THE BUD — closed on its curled stem, one dew drop
    // hanging, patient. Bloom and bud answer each other; nothing
    // repeats.
    const petal = st.petalfall?.color ?? trim;
    seat(0.112 * s, 0.09 * s, hurt ? '#ffffff' : col, trim);
    if (!hurt) {
      const k = fenlightK(nowMs, side < 0 ? 0.4 : 0.0);
      if (side > 0) {
        // THE BLOOM: five petals radiating from the seat's crown,
        // each a filled round-tipped wedge, value-stepped so the
        // whorl turns; the heart wakes between them.
        const hx = side * 0.02 * s;
        const hy = -0.045 * s;
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI * 0.5 + (i - 2) * 0.62 + Math.sin(nowMs * 0.0009) * 0.04;
          const len = (0.085 + (i === 2 ? 0.02 : 0)) * s * (0.92 + 0.12 * k);
          ctx.save();
          ctx.translate(hx, hy);
          ctx.rotate(a);
          ctx.fillStyle = shade(petal, i % 2 === 0 ? -10 : 6);
          ctx.beginPath();
          ctx.moveTo(0, 0.014 * s);
          ctx.quadraticCurveTo(len * 0.5, 0.03 * s, len, 0.004 * s);
          ctx.quadraticCurveTo(len * 1.12, -0.012 * s, len * 0.94, -0.024 * s);
          ctx.quadraticCurveTo(len * 0.45, -0.03 * s, 0, -0.014 * s);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 0.4 + 0.5 * k;
        ctx.fillStyle = shade(petal, 30);
        ctx.beginPath();
        ctx.arc(hx, hy, 0.028 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.7 + 0.3 * k;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(hx, hy, 0.011 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        // THE BUD: the closed teardrop leaning outboard on its
        // curled stem, sepals wrapping it, one dew drop hanging.
        const bx = side * 0.09 * s;
        const by = -0.075 * s + Math.sin(nowMs * 0.0014) * 0.004 * s;
        ctx.strokeStyle = shade(col, -22);
        ctx.lineWidth = Math.max(1.5, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(side * 0.01 * s, -0.03 * s);
        ctx.quadraticCurveTo(side * 0.03 * s, -0.09 * s, bx - side * 0.014 * s, by + 0.03 * s);
        ctx.stroke();
        ctx.fillStyle = petal;
        ctx.beginPath();
        ctx.moveTo(bx, by - 0.05 * s);
        ctx.quadraticCurveTo(bx + side * 0.038 * s, by - 0.012 * s, bx, by + 0.038 * s);
        ctx.quadraticCurveTo(bx - side * 0.038 * s, by - 0.012 * s, bx, by - 0.05 * s);
        ctx.closePath();
        ctx.fill();
        // Sepals: two dark wraps holding the bud shut.
        ctx.fillStyle = shade(col, -14);
        for (const su of [-1, 1] as const) {
          ctx.beginPath();
          ctx.moveTo(bx, by + 0.038 * s);
          ctx.quadraticCurveTo(bx + su * 0.03 * s, by + 0.006 * s, bx + su * 0.016 * s, by - 0.026 * s);
          ctx.quadraticCurveTo(bx + su * 0.008 * s, by, bx, by + 0.02 * s);
          ctx.closePath();
          ctx.fill();
        }
        // The dew drop, hanging and glinting on the clock.
        ctx.strokeStyle = shade(col, -20);
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.beginPath();
        ctx.moveTo(bx, by + 0.04 * s);
        ctx.lineTo(bx, by + 0.06 * s);
        ctx.stroke();
        ctx.globalAlpha = 0.5 + 0.5 * k;
        ctx.fillStyle = shade(petal, 34);
        ctx.beginPath();
        ctx.arc(bx, by + 0.072 * s, 0.013 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'cattailpaul') {
    // THE CATTAILPAUL — rustsedge's shoulders: the harvest worn as a
    // pair. The right is THE SHEAF — three cattails bound and fanned
    // off the seat; the left is THE CREEL — the woven basket lid
    // domed over the shoulder with its amber beads. What the fen
    // grows, and what carries it home.
    const headC = st.seedheads?.head ?? shade(col, -24);
    const fluff = st.seedheads?.fluff ?? trim;
    seat(0.112 * s, 0.09 * s, hurt ? '#ffffff' : col, trim);
    if (!hurt) {
      if (side > 0) {
        // THE SHEAF: three stalks rising and fanning outboard, bound
        // once at the seat's crown.
        for (const [ci, cu, chg] of [[0, -0.02, 0.13], [1, 0.02, 0.165], [2, 0.055, 0.12]] as const) {
          const bx0 = side * cu * s;
          const nod = Math.sin(nowMs * 0.0017 + ci * 2.1) * 0.006 * s;
          const tx = bx0 + side * 0.02 * s * (ci + 1) * 0.6 + nod;
          const topY = -0.04 * s - chg * s;
          ctx.strokeStyle = shade(trim, -18);
          ctx.lineWidth = Math.max(1, s * 0.011);
          ctx.beginPath();
          ctx.moveTo(bx0, -0.03 * s);
          ctx.quadraticCurveTo(bx0 + (tx - bx0) * 0.4, -0.04 * s - chg * s * 0.55, tx, topY + 0.03 * s);
          ctx.stroke();
          ctx.fillStyle = headC;
          ctx.beginPath();
          ctx.ellipse(tx, topY, 0.012 * s, 0.028 * s, side * 0.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = fluff;
          ctx.beginPath();
          ctx.ellipse(tx + side * 0.004 * s, topY - 0.038 * s, 0.007 * s, 0.012 * s, side * 0.1, 0, Math.PI * 2);
          ctx.fill();
        }
        // The binding: one cord wrap where the sheaf leaves the seat.
        ctx.fillStyle = shade(trim, -12);
        ctx.fillRect(side * 0.0 * s - 0.024 * s, -0.05 * s, 0.048 * s, 0.015 * s);
        ctx.fillStyle = shade(trim, 12);
        ctx.fillRect(side * 0.0 * s - 0.007 * s, -0.054 * s, 0.014 * s, 0.023 * s);
      } else {
        // THE CREEL: the woven lid domed over the seat — concentric
        // weave bands, a rim knot, two amber beads off the outboard
        // edge, and one loose reed blade laid across.
        for (const [rk, dv] of [[1, -14], [0.72, -2], [0.45, 10]] as const) {
          ctx.fillStyle = shade(col, dv);
          ctx.beginPath();
          ctx.ellipse(0, -0.035 * s, 0.105 * s * rk, 0.062 * s * rk, 0, Math.PI, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = shade(trim, -8);
        ctx.fillRect(-0.014 * s, -0.108 * s, 0.028 * s, 0.016 * s);
        // The loose blade: one reed lying across the lid.
        ctx.strokeStyle = shade(trim, -20);
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        ctx.moveTo(-side * 0.07 * s, -0.02 * s);
        ctx.quadraticCurveTo(0, -0.075 * s, side * 0.095 * s, -0.055 * s);
        ctx.stroke();
        // The amber beads, two lengths, trading a glint.
        for (const [bi, bl] of [[0, 0.045], [1, 0.028]] as const) {
          const bx = side * (0.1 - bi * 0.026) * s;
          const bSway = Math.sin(nowMs * 0.0019 + bi * 2.3) * 0.005 * s;
          const bby = 0.03 * s + bl * s;
          ctx.strokeStyle = shade(trim, -22);
          ctx.lineWidth = Math.max(1, s * 0.008);
          ctx.beginPath();
          ctx.moveTo(bx, 0.024 * s);
          ctx.lineTo(bx + bSway, bby - 0.01 * s);
          ctx.stroke();
          ctx.fillStyle = shade(trim, 10 + bi * 8);
          ctx.beginPath();
          ctx.arc(bx + bSway, bby, (0.014 - bi * 0.003) * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'heronwing') {
    // THE HERONWING — graymist's shoulders: the bird worn as a pair.
    // The right is THE FOLDED WING — three lapped feather rows
    // shingling the seat, dark-tipped, lifting a breath on the
    // hands' own clock (FOLDED-AT-REST law: a spread wing is the
    // butterfly sin); the left is THE PLUME TUFT — three crest vanes
    // leaning outboard with the mist sliding off them.
    seat(0.112 * s, 0.09 * s, hurt ? '#ffffff' : col, trim);
    if (!hurt) {
      if (side > 0) {
        // THE FOLDED WING: rows of round-tipped coverts, each row a
        // value step, tips dipped dark — mass lying at rest.
        const lift = Math.sin(nowMs * 0.0019) * 0.008;
        ctx.save();
        ctx.rotate(-side * lift);
        for (const [ri, ry, dv, n] of [[0, 0.02, -16, 4], [1, -0.02, -4, 4], [2, -0.06, 8, 3]] as const) {
          for (let i = 0; i < n; i++) {
            const u = (i - (n - 1) / 2) / n;
            const fx2 = u * 0.17 * s + side * 0.012 * s * ri;
            ctx.fillStyle = shade(col, dv);
            ctx.beginPath();
            ctx.moveTo(fx2 - 0.032 * s, ry * s);
            ctx.quadraticCurveTo(fx2, ry * s + 0.075 * s, fx2 + 0.032 * s, ry * s);
            ctx.quadraticCurveTo(fx2, ry * s - 0.02 * s, fx2 - 0.032 * s, ry * s);
            ctx.closePath();
            ctx.fill();
            // The dark tip: dipped in the fen's ink.
            ctx.fillStyle = shade(col, -34);
            ctx.beginPath();
            ctx.moveTo(fx2 - 0.014 * s, ry * s + 0.035 * s);
            ctx.quadraticCurveTo(fx2, ry * s + 0.07 * s, fx2 + 0.014 * s, ry * s + 0.035 * s);
            ctx.quadraticCurveTo(fx2, ry * s + 0.048 * s, fx2 - 0.014 * s, ry * s + 0.035 * s);
            ctx.closePath();
            ctx.fill();
          }
        }
        ctx.restore();
      } else {
        // THE PLUME TUFT: three crest vanes off the seat's crown,
        // leaning outboard, dark-tipped, each on its own slow air —
        // and the mist that will not stay put.
        for (const [pi, pu, ph2] of [[0, 0.0, 0.11], [1, 0.035, 0.15], [2, 0.07, 0.1]] as const) {
          const bx0 = side * pu * s;
          const pSway = Math.sin(nowMs * 0.0011 + pi * 1.3) * 0.007 * s;
          const tx = bx0 + side * (0.03 + pi * 0.012) * s + pSway;
          const topY = -0.045 * s - ph2 * s;
          ctx.fillStyle = shade(col, pi === 1 ? 6 : -8);
          ctx.beginPath();
          ctx.moveTo(bx0 - 0.012 * s, -0.04 * s);
          ctx.quadraticCurveTo(bx0 + (tx - bx0) * 0.4 - 0.01 * s, topY + ph2 * s * 0.4, tx, topY);
          ctx.quadraticCurveTo(bx0 + (tx - bx0) * 0.5 + 0.012 * s, topY + ph2 * s * 0.5, bx0 + 0.012 * s, -0.04 * s);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = shade(col, -32);
          ctx.beginPath();
          ctx.ellipse(tx, topY + 0.008 * s, 0.008 * s, 0.018 * s, side * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
        const mk = fenlightK(nowMs, 0.5);
        const u01 = (nowMs * 0.00018) % 1;
        ctx.globalAlpha = (0.12 + 0.16 * mk) * (1 - u01);
        ctx.fillStyle = trim;
        ctx.beginPath();
        ctx.ellipse(side * (0.06 + u01 * 0.1) * s, -0.1 * s - u01 * 0.03 * s, 0.045 * s, 0.018 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'cloudbank') {
    // THE CLOUD BANK — stormwoven's shoulders, third forging: the
    // generic seat is GONE. Each shoulder is a small working sky
    // painted in the world's own cloud language (cloudPuff — the
    // canopy/pool blob idiom), and the sky DOES ITS WORK: under
    // everything THE STRATUS, a permanent flat-bellied shelf, hugs
    // the shoulder and carries the mass; over it runs THE
    // PROCESSION — clouds born small and dark to windward, swelling
    // into two-tone puffs mid-passage, then sheared flat and
    // swallowed to leeward, every rebirth rolling a new silhouette.
    // ONE WIND: both shoulders drift the same world direction, never
    // mirrored. THE ROLLING SKY: the strike reaches this shoulder on
    // its own station of the body's discharge (near before far,
    // crown before both) and lights every cloud FROM WITHIN — sheet
    // lightning, never a badge.
    const ember = st.chargebeads?.bead ?? trim;
    const k = stormboltK(nowMs, side > 0 ? 0.9 : 0.8);
    const strike = k > 0.92;
    const lit = strike ? 24 : 0;
    // The two shoulders share the wind but not the weather: the far
    // sky runs a phase-shifted procession, so no cloud has a twin.
    const sOff = side > 0 ? 0 : 0.37;
    if (!hurt) {
      // THE BACK ROW: dim weather far behind the working sky.
      for (const [bi, dxB, dyB, rxB] of [[0, -0.062, -0.115, 0.036], [1, 0.058, -0.124, 0.03]] as const) {
        const drB = Math.sin(nowMs * 0.00019 + bi * 2.6) * 0.014 * s;
        ctx.fillStyle = shade(col, -34 + (strike ? 14 : 0));
        cloudPuff(ctx, dxB * s + drB, dyB * s, rxB * s, rxB * 0.6 * s, 407 + bi * 29 + sOff * 100, nowMs, 0.6);
        ctx.fill();
      }
    }
    // THE STRATUS: the permanent shelf — dark belly, mid body, lit
    // crown, all in the one blob language — the mass that keeps the
    // shoulder covered while the procession lives and dies above it.
    // Garment-scale structure: it holds white in the hurt flash.
    ctx.fillStyle = hurt ? '#ffffff' : shade(col, -4 + lit);
    cloudPuff(ctx, 0.004 * s, -0.03 * s, 0.116 * s, 0.054 * s, 91 + sOff * 100, nowMs, 1);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = shade(col, -30 + lit);
      cloudPuff(ctx, 0.012 * s, 0.006 * s, 0.09 * s, 0.03 * s, 137 + sOff * 100, nowMs, 0.7);
      ctx.fill();
      ctx.fillStyle = shade(col, 15 + lit);
      cloudPuff(ctx, -0.022 * s, -0.052 * s, 0.066 * s, 0.032 * s, 53 + sOff * 100, nowMs, 1);
      ctx.fill();
      // THE BANKED CHARGE: gold light living inside the bank, read
      // through the gaps (alpha accents are proven in this path:
      // the heronwing mist precedent).
      ctx.globalAlpha = 0.16 + 0.38 * k + (strike ? 0.24 : 0);
      ctx.fillStyle = ember;
      ctx.beginPath();
      ctx.ellipse(0.005 * s, -0.08 * s, 0.058 * s, 0.03 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // THE PROCESSION: four cloud lives per shoulder, staggered so
    // the sky always holds forming, full and dying weather at once.
    // floor(cycle) re-rolls each slot's silhouette at rebirth, so no
    // cloud ever forms twice.
    const P = 10400;
    const live: Array<[number, number, number]> = [];
    for (const [i, laneY, rBase] of [
      [0, -0.062, 0.052], [1, -0.108, 0.045], [2, -0.036, 0.042], [3, -0.088, 0.048],
    ] as const) {
      const u = nowMs / P + i / 4 + sOff;
      const ph = ((u % 1) + 1) % 1;
      const seed = 613 + i * 53 + Math.floor(u) * 17 + sOff * 100;
      const cx = (-0.098 + 0.193 * ph) * s;
      const cy = laneY * s + Math.sin(nowMs * 0.0009 + i * 2.3) * 0.004 * s;
      const g = ph < 0.3 ? ph / 0.3 : 1;
      const d = ph > 0.66 ? (ph - 0.66) / 0.34 : 0;
      const gs = g * g * (3 - 2 * g);
      // Forming clouds bud off the shelf dark and swell as they
      // climb; dying clouds flatten, darken and are swallowed BACK
      // into the bank — they never waste to a whisker in open air
      // (blunt-tip law: too small or too thin is SKIPPED, and the
      // travel ends over the stratus so the last breath overlaps it).
      const rx = rBase * s * (0.3 + 0.7 * gs) * (1 + 0.45 * d);
      const ry = rBase * 0.72 * s * (0.3 + 0.7 * gs) * (1 - 0.78 * d);
      if (ry < 0.017 * s) continue;
      const dvB = -20 + 26 * gs - 32 * d;
      ctx.fillStyle = hurt ? '#ffffff' : shade(col, dvB + lit);
      cloudPuff(ctx, cx, cy, rx, ry, seed, nowMs, 1);
      ctx.fill();
      if (!hurt && gs > 0.72 && d < 0.42) {
        // The lit cap arrives only on a fully formed cloud — the
        // two-tone read (wash base under a lit crown) the world's
        // own canopies and foam mounds wear.
        ctx.fillStyle = shade(col, dvB + 22 + lit);
        cloudPuff(ctx, cx - rx * 0.18, cy - ry * 0.34, rx * 0.58, ry * 0.56, seed + 31, nowMs, 1);
        ctx.fill();
      }
      if (!hurt && d < 0.5) live.push([cx, cy, gs - d]);
    }
    if (!hurt) {
      if (strike && live.length >= 1) {
        const fr = Math.floor(nowMs / 90);
        // Lightning CRAWLS the sky on the shared beat: the two most
        // alive clouds trade the arc, and one leader jumps down off
        // the bank into the cloth.
        live.sort((a2, b2) => b2[2] - a2[2]);
        const l0 = live[0]!;
        const l1 = live.length > 1 ? live[1]! : ([0.004 * s, -0.03 * s, 1] as [number, number, number]);
        stormArc(ctx, l0[0], l0[1], l1[0], l1[1], fr * 9 + side, s * 0.02, ember, 0.85, Math.max(1, s * 0.007));
        stormArc(ctx, l0[0], l0[1], 0.02 * s, 0.06 * s, fr * 9 + side + 1, s * 0.017, ember, 0.7, Math.max(1, s * 0.006), false);
      } else if (k > 0.45 && (nowMs % 1300) < 120 && live.length >= 1) {
        // The charge crackles early — a filament testing the air
        // between the shelf and whichever cloud is passing.
        const l0 = live[0]!;
        stormArc(ctx, 0, -0.045 * s, l0[0], l0[1], Math.floor(nowMs / 1300) + side, s * 0.012, ember, 0.5, Math.max(1, s * 0.005), false);
      }
    }
    ctx.restore();
    return;
  }

  if (st.pauldron === 'anvilpaul') {
    // THE THUNDER HEART — thunderhead's shoulders, third forging:
    // built to be READ. Each shoulder is a small thunderhead with a
    // visible anatomy: THE STORMBED (a shelf in the world's blob
    // language whose dark belly is CLIPPED inside its body — the
    // belly-inside-the-body law: a detached darkest blob once
    // rendered as a floating black egg), three NAMED cloud masses —
    // crown and two flanks — arranged as weather, two small RUNNER
    // lobes swirling through front and back for motion, and at the
    // center THE EYE: a near-black core ringed by broken arcs of
    // storm-light — the orb of contained energy, dark where the
    // charge lives, lit only at its edge. The two shoulders are a
    // PAIR, not copies: the near side stacks tall (the storm crown),
    // the far side lies low and wide (the low storm), each with its
    // own seeds, phases and cradle. Electricity is constant — the
    // 460ms pulse speaks eye-bolt / crawl / sheet in rotation, and
    // the strike arrives on this shoulder's own station of the
    // rolling sky — within the piece it still takes everything at
    // once.
    const seamC = st.thunderbank?.glow ?? trim;
    const k = stormboltK(nowMs, side > 0 ? 0.9 : 0.8);
    const strike = k > 0.92;
    const near2 = side > 0;
    const sOff = near2 ? 0 : 0.41;
    const sd = near2 ? 0 : 500;
    // The per-side build: [x, y, r] for crown, flankL, flankR; the
    // eye; the bed; the cradle span. Near = tall, far = low + wide.
    const CROWN = near2 ? [-0.012, -0.124, 0.052] : [-0.004, -0.106, 0.046];
    const FLANKL = near2 ? [-0.062, -0.076, 0.043] : [-0.066, -0.064, 0.045];
    const FLANKR = near2 ? [0.058, -0.082, 0.045] : [0.062, -0.068, 0.042];
    const EYE = near2 ? [0.004, -0.084, 0.026] : [0, -0.074, 0.023];
    const statics = [CROWN, FLANKL, FLANKR] as const;
    // THE PULSE CLOCK: three forms in rotation, targets walking the
    // named masses, the bolt guttering out at the end of its beat.
    const BEAT = 460;
    const bt = nowMs / BEAT + sOff * 3;
    const bi2 = Math.floor(bt);
    const bu = bt - bi2;
    const form = ((bi2 % 3) + 3) % 3;
    const tgt = (((bi2 * 2) % 3) + 3) % 3;
    const tgt2 = (tgt + 1) % 3;
    const beatA = bu < 0.7 ? 1 : (1 - bu) / 0.3;
    const litOf = (i: number): number => {
      if (strike) return 30;
      if (bu >= 0.7) return 0;
      if (form === 2) return i === tgt ? 26 : 0;
      if (form === 0) return i === tgt ? 20 : 0;
      return i === tgt || i === tgt2 ? 16 : 0;
    };
    // THE STORMBED: body first, then the belly clipped INSIDE it —
    // the darkest tone can shade the shelf but never leave it.
    const bedLit = strike ? 14 : 0;
    const bx0 = 0.002 * s;
    const by0 = (near2 ? -0.02 : -0.016) * s;
    const brx = (near2 ? 0.118 : 0.122) * s;
    const bry = (near2 ? 0.052 : 0.048) * s;
    ctx.fillStyle = hurt ? '#ffffff' : shade(col, -8 + bedLit);
    cloudPuff(ctx, bx0, by0, brx, bry, 211 + sd, nowMs, 0.8);
    ctx.fill();
    if (!hurt) {
      ctx.save();
      cloudPuff(ctx, bx0, by0, brx, bry, 211 + sd, nowMs, 0.8);
      ctx.clip();
      ctx.fillStyle = shade(col, -28 + bedLit);
      cloudPuff(ctx, bx0 + 0.01 * s, by0 + bry * 0.72, brx * 0.94, bry * 0.66, 263 + sd, nowMs, 0.6);
      ctx.fill();
      ctx.restore();
    }
    // THE RUNNERS: two small lobes swirling through the storm — the
    // same spin on both shoulders (one sky, one turn), the far side
    // on its own phase so no runner twins.
    const spin = nowMs * 0.00023 + sOff * Math.PI * 2;
    const runners: Array<[number, number, number, boolean]> = [];
    for (let i = 0; i < 2; i++) {
      const a = spin + i * Math.PI;
      const rx2 = (near2 ? 0.074 : 0.082) * s;
      const ry2 = (near2 ? 0.034 : 0.028) * s;
      runners.push([
        EYE[0]! * s + Math.cos(a) * rx2,
        EYE[1]! * s + Math.sin(a) * ry2,
        (i === 0 ? 0.029 : 0.025) * s,
        Math.sin(a) >= 0,
      ]);
    }
    for (const [rx3, ry3, rr3, front] of runners) {
      if (front) continue;
      ctx.fillStyle = hurt ? '#ffffff' : shade(col, -20 + (strike ? 22 : 0));
      cloudPuff(ctx, rx3, ry3, rr3 * 0.85, rr3 * 0.68, 601 + sd + Math.round(rr3), nowMs, 1);
      ctx.fill();
    }
    // THE NAMED MASSES: flanks low, crown on top — a thunderhead's
    // build, not a ring of samey lobes. Each lights FROM WITHIN when
    // the pulse speaks its name.
    for (const [i, mass] of [[1, FLANKL], [2, FLANKR], [0, CROWN]] as const) {
      const dvB = (i === 0 ? 2 : -6) + litOf(i);
      ctx.fillStyle = hurt ? '#ffffff' : shade(col, dvB);
      cloudPuff(ctx, mass[0]! * s, mass[1]! * s, mass[2]! * s, mass[2]! * 0.78 * s, 331 + i * 47 + sd, nowMs, 1);
      ctx.fill();
      if (!hurt && i === 0 && litOf(0) === 0) {
        // Day still touches the crown's shoulder — the one dim lit
        // cap on an otherwise charged-dark sky.
        ctx.fillStyle = shade(col, 16);
        cloudPuff(ctx, (mass[0]! - mass[2]! * 0.18) * s, (mass[1]! - mass[2]! * 0.32) * s, mass[2]! * 0.5 * s, mass[2]! * 0.34 * s, 361 + sd, nowMs, 1);
        ctx.fill();
      }
    }
    // THE EYE: the orb of contained energy — a near-black core the
    // storm-light only ever RINGS. Charge lives where light doesn't;
    // the broken arcs turning at its edge are what make it readable.
    const ex = EYE[0]! * s;
    const ey = EYE[1]! * s;
    const er = EYE[2]! * s;
    if (!hurt) {
      // A breathing gold ember bleeds out from behind the core.
      ctx.globalAlpha = 0.12 + 0.3 * k + (strike ? 0.24 : 0);
      ctx.fillStyle = seamC;
      ctx.beginPath();
      ctx.ellipse(ex, ey, er * 1.7, er * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = hurt ? '#ffffff' : shade(col, strike ? -6 : -38);
    cloudPuff(ctx, ex, ey, er, er * 0.86, 499 + sd, nowMs, 1);
    ctx.fill();
    if (!hurt) {
      // The eclipse rim: two broken arcs of different radii turning
      // slowly about the core, and one hot pale tip — energy drawn
      // at the edge of the dark, never a glow.
      const a0 = spin * 1.6;
      ctx.lineCap = 'round';
      ctx.strokeStyle = strike ? '#ffffff' : seamC;
      ctx.globalAlpha = 0.55 + 0.35 * k;
      ctx.lineWidth = Math.max(1, s * 0.007);
      ctx.beginPath();
      ctx.arc(ex, ey, er * 1.32, a0, a0 + Math.PI * 0.9);
      ctx.stroke();
      ctx.globalAlpha = 0.4 + 0.3 * k;
      ctx.lineWidth = Math.max(1, s * 0.005);
      ctx.beginPath();
      ctx.arc(ex, ey, er * 1.12, a0 + Math.PI * 1.2, a0 + Math.PI * 1.7);
      ctx.stroke();
      ctx.strokeStyle = strike ? '#ffffff' : '#f4f8ff';
      ctx.globalAlpha = (0.3 + 0.4 * k) * (0.5 + 0.5 * beatA);
      ctx.lineWidth = Math.max(1, s * 0.0045);
      ctx.beginPath();
      ctx.arc(ex, ey, er * 1.32, a0 + Math.PI * 0.62, a0 + Math.PI * 0.9);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const [rx3, ry3, rr3, front] of runners) {
      if (!front) continue;
      ctx.fillStyle = hurt ? '#ffffff' : shade(col, -8 + (strike ? 26 : 0));
      cloudPuff(ctx, rx3, ry3, rr3, rr3 * 0.78, 601 + sd + Math.round(rr3), nowMs, 1);
      ctx.fill();
    }
    if (!hurt) {
      // THE BINDING: the one forged thing — a fixed gold cradle,
      // riveted at both tips, sized to its own shoulder's storm. It
      // does not move; the storm moves inside it.
      const crx = (near2 ? 0.074 : 0.08) * s;
      const cry = (near2 ? 0.047 : 0.042) * s;
      ctx.globalAlpha = 0.55 + 0.35 * k;
      ctx.strokeStyle = strike ? '#ffffff' : seamC;
      ctx.lineWidth = Math.max(1, s * 0.009);
      ctx.beginPath();
      ctx.ellipse(ex, ey, crx, cry, 0, Math.PI * 0.16, Math.PI * 0.84);
      ctx.stroke();
      ctx.globalAlpha = 1;
      for (const sgn of [-1, 1] as const) {
        const rvx = ex + Math.cos(Math.PI * (sgn > 0 ? 0.16 : 0.84)) * crx;
        const rvy = ey + Math.sin(Math.PI * (sgn > 0 ? 0.16 : 0.84)) * cry;
        ctx.fillStyle = strike ? '#ffffff' : shade(seamC, -10);
        ctx.beginPath();
        ctx.arc(rvx, rvy, Math.max(1.2, 0.009 * s), 0, Math.PI * 2);
        ctx.fill();
      }
      // THE CONSTANT PULSE: drawn lightning, alive every beat, every
      // endpoint a named feature — bolts you can follow.
      const fr = Math.floor(nowMs / 90);
      const aPulse = (0.45 + 0.35 * k) * beatA;
      const tx2 = statics[tgt]![0]! * s;
      const ty2 = statics[tgt]![1]! * s;
      const ux2 = statics[tgt2]![0]! * s;
      const uy2 = statics[tgt2]![1]! * s;
      if (strike) {
        // THE LET-GO: the eye takes crown and both flanks at once,
        // and the leader leaves the storm for the cloth — the only
        // bolt that ever escapes the binding.
        stormArc(ctx, ex, ey, CROWN[0]! * s, CROWN[1]! * s, fr * 9 + side, s * 0.015, seamC, 0.9, Math.max(1, s * 0.006));
        stormArc(ctx, ex, ey, FLANKL[0]! * s, FLANKL[1]! * s, fr * 9 + side + 3, s * 0.014, seamC, 0.85, Math.max(1, s * 0.0055), false);
        stormArc(ctx, ex, ey, FLANKR[0]! * s, FLANKR[1]! * s, fr * 9 + side + 4, s * 0.014, seamC, 0.85, Math.max(1, s * 0.0055), false);
        stormArc(ctx, ex, ey + 0.02 * s, 0.026 * s, 0.068 * s, fr * 9 + side + 5, s * 0.02, seamC, 0.8, Math.max(1, s * 0.007));
      } else if (beatA > 0.05) {
        if (form === 0) {
          // Form I — THE EYE BOLT: the core reaches out and names a
          // mass.
          stormArc(ctx, ex, ey, tx2, ty2, fr * 7 + bi2, s * 0.013, seamC, aPulse, Math.max(1, s * 0.0058));
        } else if (form === 1) {
          // Form II — THE CRAWL: charge walking mass to mass across
          // the storm.
          stormArc(ctx, tx2, ty2, ux2, uy2, fr * 7 + bi2, s * 0.016, seamC, aPulse, Math.max(1, s * 0.0055), false);
        } else {
          // Form III — THE SHEET: the filament buried inside the lit
          // mass itself.
          const mr = statics[tgt]![2]! * s;
          stormArc(ctx, tx2 - mr * 0.5, ty2 + mr * 0.18, tx2 + mr * 0.5, ty2 - mr * 0.22, fr * 7 + bi2, s * 0.009, seamC, aPulse * 0.8, Math.max(1, s * 0.0045), false);
        }
      }
    }
    ctx.restore();
    return;
  }

  if (st.pauldron === 'showerpaul') {
    // THE SHOWER PAULDRON — sunshower's shoulders, asymmetric. The
    // right carries THE SUNBREAK: a gilt half-disc looking over a
    // cloud lobe, rays out, one glint walking its rim. The left is
    // THE DRIP VEIL: the seat slicked with sheen, two bead cords
    // swinging off the hem, and a drop that lets go on the beat.
    const sunC = st.sunpatch?.color ?? trim;
    const rainC = st.rainhem?.color ?? trim;
    const k = stormboltK(nowMs, side > 0 ? 0.9 : 0.8);
    seat(0.112 * s, 0.09 * s, hurt ? '#ffffff' : col, trim);
    if (side > 0) {
      // The cloud lobe the sun looks over.
      ctx.fillStyle = hurt ? '#ffffff' : shade(col, 4);
      ctx.beginPath();
      ctx.arc(side * 0.03 * s, -0.052 * s, 0.055 * s, 0, Math.PI * 2);
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = shade(col, 16);
        ctx.beginPath();
        ctx.arc(side * 0.018 * s, -0.068 * s, 0.028 * s, 0, Math.PI * 2);
        ctx.fill();
        // Rays first, reaching from behind the lobe.
        for (let i = 0; i < 4; i++) {
          const a = -Math.PI * 0.9 + (i / 3) * Math.PI * 0.55;
          ctx.strokeStyle = shade(sunC, -4);
          ctx.lineWidth = Math.max(1, s * 0.009);
          ctx.beginPath();
          ctx.moveTo(side * 0.052 * s + Math.cos(a) * 0.052 * s, -0.078 * s + Math.sin(a) * 0.052 * s);
          ctx.lineTo(side * 0.052 * s + Math.cos(a) * 0.075 * s, -0.078 * s + Math.sin(a) * 0.075 * s);
          ctx.stroke();
        }
        // The half-disc, clipped by its own horizon over the lobe.
        ctx.save();
        ctx.beginPath();
        ctx.rect(side * 0.052 * s - 0.06 * s, -0.078 * s - 0.06 * s, 0.12 * s, 0.06 * s);
        ctx.clip();
        ctx.fillStyle = sunC;
        ctx.beginPath();
        ctx.arc(side * 0.052 * s, -0.078 * s, 0.042 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(sunC, 22);
        ctx.beginPath();
        ctx.arc(side * 0.052 * s, -0.078 * s, 0.028 * s, Math.PI, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // The walking glint.
        const ga = Math.PI * (1.05 + 0.9 * k);
        ctx.globalAlpha = 0.5 + 0.5 * k;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(side * 0.052 * s + Math.cos(ga) * 0.036 * s, -0.078 * s + Math.sin(ga) * 0.036 * s * 0.6 - 0.006 * s, 0.008 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    } else if (!hurt) {
      // THE DRIP VEIL: sheen on the dome, cords of rain-beads off
      // the hem, one drop falling on the cycle.
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = shade(trim, 8);
      ctx.lineWidth = Math.max(1, s * 0.011);
      ctx.beginPath();
      ctx.arc(0, -0.02 * s, 0.078 * s, Math.PI * 1.15, Math.PI * 1.6);
      ctx.stroke();
      ctx.globalAlpha = 1;
      const dropU = (nowMs % 7200) / 7200;
      for (const [u, ph] of [[-0.55, 0.4], [0.35, 2.2]] as const) {
        const bx = u * 0.09 * s + Math.sin(nowMs * 0.0016 + ph) * 0.006 * s;
        const by0 = 0.052 * s;
        const hang = 0.05 * s + 0.012 * s * Math.sin(ph * 3);
        ctx.strokeStyle = shade(col, -18);
        ctx.lineWidth = Math.max(1, s * 0.005);
        ctx.beginPath();
        ctx.moveTo(u * 0.09 * s, by0);
        ctx.quadraticCurveTo(u * 0.09 * s + (bx - u * 0.09 * s) * 0.6, by0 + hang * 0.6, bx, by0 + hang);
        ctx.stroke();
        for (const bv of [0.45, 0.75, 1] as const) {
          ctx.fillStyle = rainC;
          ctx.beginPath();
          ctx.ellipse(u * 0.09 * s + (bx - u * 0.09 * s) * bv, by0 + hang * bv, 0.009 * s, 0.013 * s, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = shade(rainC, 28);
        ctx.beginPath();
        ctx.arc(bx - 0.004 * s, by0 + hang - 0.004 * s, 0.005 * s, 0, Math.PI * 2);
        ctx.fill();
        // The drop lets go off the trailing cord.
        if (u < 0) {
          ctx.globalAlpha = Math.max(0, 0.8 - dropU);
          ctx.fillStyle = rainC;
          ctx.beginPath();
          ctx.ellipse(bx, by0 + hang + 0.02 * s + dropU * 0.11 * s, 0.007 * s, 0.011 * s, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }
    ctx.restore();
    return;
  }

  if (st.pauldron === 'aurorabind') {
    // THE BOUND LIGHTS — the sovereign's shoulders, second forging:
    // the drift is DEAD, and with it every worn shell. There is no
    // pauldron under the aurora — the aurora IS the pauldron: three
    // ribbon streams of drawn light wrapping the shoulder in a true
    // 2.5D orbit (back passes behind, front passes in front — paint
    // order and value are the containment), bent around THE NIGHT
    // HEART, a small torn piece of polar sky that swirls with them,
    // and held by THE SORCERER'S BIND — one still frost cradle, the
    // only forged thing (the binding law: the containment holds
    // still while the storm moves inside it). A PAIR, not copies:
    // the near shoulder stands a tall upright vortex, the far lies
    // a low wide swirl; both spin the same screen direction (one
    // wind), each on its own phase (the clockwork law). Surges ride
    // amplitude, width and light alone — the spin never changes
    // rate.
    const ac = st.auroraband?.colors ?? [trim, trim, trim];
    const kP = auroraK(nowMs, side > 0 ? 0.07 : 0.12);
    const duck = 1 - 0.5 * Math.abs(depthK);
    const shrink = 1 - 0.24 * Math.abs(depthK);
    const outb = side * 0.036 * Math.abs(depthK);
    const sOff = side > 0 ? 0.55 : 2.75;
    const upright = side > 0;
    const cx0 = (side * 0.018 + outb) * s;
    const cy0 = -0.042 * s;
    // The swirl's own frame: near = steep standing vortex, far =
    // low banked swirl; both lean outboard off the arm.
    const rot = side * (upright ? -0.24 : -0.1);
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);
    type Seg = { x: number; y: number; a: number; u: number };
    type Ribbon = { front: Seg[][]; back: Seg[][]; col: string };
    const ribbons: Ribbon[] = [];
    for (let r = 0; r < 3; r++) {
      const rx0 = (0.076 + r * 0.019) * s * shrink;
      const ry0 = rx0 * (upright ? 0.52 : 0.4) * duck;
      const base = nowMs * 0.00046 + r * 2.35 + sOff;
      const span = Math.PI * (1.32 + 0.14 * r);
      const segs = 16;
      const front: Seg[][] = [[]];
      const back: Seg[][] = [[]];
      for (let i = 0; i <= segs; i++) {
        const tU = i / segs;
        const aAng = base + tU * span;
        // The undulation travels the ribbon at one constant pace;
        // the dance widens it, never hurries it.
        const wob = Math.sin(tU * 4.4 - nowMs * 0.0021 + r * 1.7 + sOff) *
          (0.007 + 0.009 * kP) * s;
        // The stream breathes in and out of its orbit as it flows —
        // energy, not wire (constant rates, the seamless law).
        const flow = 1 + 0.12 * Math.sin(tU * 3.1 + nowMs * 0.0013 + r * 2.2 + sOff);
        const ex = Math.cos(aAng) * rx0 * flow;
        const ey = Math.sin(aAng) * ry0 * flow + wob;
        const px = cx0 + ex * cosR - ey * sinR;
        const py = cy0 + ex * sinR + ey * cosR;
        const depth = Math.sin(aAng);
        const seg: Seg = { x: px, y: py, a: Math.sin(tU * Math.PI), u: tU };
        if (depth < 0) {
          back[back.length - 1]!.push(seg);
          if (front[front.length - 1]!.length) front.push([]);
        } else {
          front[front.length - 1]!.push(seg);
          if (back[back.length - 1]!.length) back.push([]);
        }
      }
      ribbons.push({ front, back, col: ac[r % ac.length]! });
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const traceRuns = (runs: Seg[][], colR: string, isFront: boolean): void => {
      for (const run of runs) {
        for (let q = 0; q + 1 < run.length; q++) {
          const p0 = run[q]!;
          const p1 = run[q + 1]!;
          const aa = ((p0.a + p1.a) / 2) * (0.5 + 0.5 * kP) * (isFront ? 1 : 0.42);
          if (aa < 0.08) continue;
          // The stream's body: the lot color casing... in the hurt
          // flash the streams ARE the silhouette — garment-scale
          // structure, painted white whole.
          ctx.globalAlpha = hurt ? Math.min(1, aa * 2.2) : Math.min(1, aa) * 0.78;
          ctx.strokeStyle = hurt ? '#ffffff' : colR;
          ctx.lineWidth = Math.max(1.4, s * (isFront ? 0.031 : 0.016));
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
          if (!hurt) {
            ctx.globalAlpha = Math.min(1, aa);
            ctx.strokeStyle = isFront ? '#e8fff4' : shade(colR, -18);
            ctx.lineWidth = Math.max(1, s * (isFront ? 0.0095 : 0.006));
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
          }
          // The combed rays: only off the bright front passage,
          // reaching away from the heart — light escaping the bind.
          // Faint floating strokes are skipped whole (dilate bar).
          if (!hurt && isFront && q % 2 === 0) {
            const rw = 0.5 + 0.5 * Math.sin(nowMs * 0.0011 + q * 2.3 + sOff);
            const ra = Math.min(1, aa) * (0.28 + 0.5 * rw);
            if (ra >= 0.3) {
              const mx = (p0.x + p1.x) / 2;
              const my = (p0.y + p1.y) / 2;
              const dx = mx - cx0;
              const dy = my - cy0;
              const dd = Math.hypot(dx, dy) || 1;
              const rl = (0.028 + 0.03 * kP) * s * (0.6 + 0.4 * rw);
              ctx.globalAlpha = ra * 0.85;
              ctx.strokeStyle = colR;
              ctx.lineWidth = Math.max(1.2, s * 0.011);
              ctx.beginPath();
              ctx.moveTo(mx, my);
              ctx.lineTo(mx + (dx / dd) * rl, my + (dy / dd) * rl - rl * 0.35);
              ctx.stroke();
            }
          }
        }
      }
    };
    // THE FAR PASSES FIRST: every ribbon's back arcs, dim and thin —
    // the lights honestly go BEHIND the heart.
    for (const rb of ribbons) traceRuns(rb.back, rb.col, false);
    ctx.globalAlpha = 1;
    // THE NIGHT HEART: the torn piece of sky the lights bend around
    // — an irregular shard of the deepest night, smaller than the
    // swirl that binds it (the lights out-scale their prisoner), a
    // star prick awake inside it. Structure: it holds white.
    const hs = 0.064 * s * (1 + 0.06 * kP) * (0.8 + 0.2 * duck);
    ctx.fillStyle = hurt ? '#ffffff' : col;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const aH = (i / 7) * Math.PI * 2;
      const h = Math.sin((sOff + 3) * 12.9898 + i * 78.233) * 43758.5453;
      const rr = hs * (0.78 + ((h - Math.floor(h)) - 0.5) * 0.5 +
        0.06 * Math.sin(nowMs * 0.0016 + i * 2.1 + sOff));
      const pxH = cx0 + Math.cos(aH) * rr * 1.12;
      const pyH = cy0 + Math.sin(aH) * rr * (upright ? 0.94 : 0.78);
      if (i === 0) ctx.moveTo(pxH, pyH);
      else ctx.lineTo(pxH, pyH);
    }
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // One cold arris where the heart catches the swirl's light.
      ctx.strokeStyle = shade(col, 22);
      ctx.globalAlpha = 0.5 + 0.3 * kP;
      ctx.lineWidth = Math.max(1, s * 0.007);
      ctx.beginPath();
      ctx.arc(cx0, cy0, hs * 0.92, Math.PI * 1.12, Math.PI * 1.66);
      ctx.stroke();
      ctx.globalAlpha = 1;
      const twH = Math.sin(nowMs * 0.00034 + sOff);
      if (twH > 0.2) {
        ctx.globalAlpha = 0.35 + 0.5 * ((twH - 0.2) / 0.8);
        ctx.fillStyle = st.starfield?.color ?? trim;
        starPrick(ctx, cx0 - hs * 0.24, cy0 - hs * 0.1, (0.008 + 0.004 * twH) * s);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    // THE NEAR PASSES: the bright faces of the streams sweep in
    // front of the heart, rays combing off them.
    for (const rb of ribbons) traceRuns(rb.front, rb.col, true);
    ctx.globalAlpha = 1;
    if (!hurt && kP > 0.7) {
      // At the dance one spark slips the bind, rising off the crown
      // of the swirl and fading home — never below the wrap bar.
      const mu = ((nowMs * 0.00022 + sOff) % 1 + 1) % 1;
      const aS = Math.sin(mu * Math.PI) * (kP - 0.7) / 0.3;
      if (aS >= 0.32) {
        ctx.globalAlpha = aS;
        ctx.fillStyle = '#e8fff4';
        ctx.beginPath();
        ctx.arc(cx0 + Math.sin(sOff + mu * 5) * 0.02 * s, cy0 - (0.1 + mu * 0.07) * s, 0.007 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    // THE SORCERER'S BIND: the one forged thing — a still frost
    // cradle under the swirl, riveted at its tips. It does not
    // spin, it does not breathe: the bind holds (the binding law).
    ctx.strokeStyle = hurt ? '#ffffff' : trim;
    ctx.lineWidth = Math.max(1.4, s * 0.014);
    ctx.beginPath();
    ctx.ellipse(cx0, cy0 + 0.026 * s, 0.092 * s * shrink, 0.052 * s * shrink, 0, Math.PI * 0.16, Math.PI * 0.84);
    ctx.stroke();
    if (!hurt) {
      ctx.fillStyle = shade(trim, 8);
      for (const tipA of [Math.PI * 0.16, Math.PI * 0.84]) {
        ctx.beginPath();
        ctx.arc(cx0 + Math.cos(tipA) * 0.092 * s * shrink, cy0 + 0.026 * s + Math.sin(tipA) * 0.052 * s * shrink, 0.0075 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    return;
  }

  if (st.pauldron === 'tideorbs') {
    const foam = st.streamwrap?.foam ?? trim;
    const k = tideK(nowMs, 0.14);
    const brk = tideBreakK(nowMs, 0.14);
    seat(0.094 * s, 0.076 * s, hurt ? '#ffffff' : col, trim);
    // Per-side ornament phase: the surge is shared, the details
    // are not (clockwork law).
    const ph = side > 0 ? 0 : 2.4;
    // THE ORB: it swells with the tide, bobs on its own water, and
    // SQUASHES at the break — the surge made visible.
    const bob = Math.sin(nowMs * 0.0014 + ph) * 0.007 * s;
    const orx0 = 0.07 * s * (1 + 0.12 * k);
    const squash = 1 + 0.28 * brk;
    const orx = orx0 * squash;
    const ory = orx0 * (2 - squash) * 0.94;
    const ox = side * 0.06 * s;
    const oy = -0.118 * s + bob + brk * 0.014 * s;
    if (!hurt) {
      // THE BASIN: the seat cups the water the orb rose from — a
      // lit surface, never a dark hole, foam standing at its rim,
      // and a ripple crossing it as the swell passes.
      ctx.fillStyle = shade(col, 6);
      ctx.beginPath();
      ctx.ellipse(ox, -0.05 * s, 0.055 * s, 0.017 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shade(col, 20);
      ctx.lineWidth = Math.max(1, s * 0.006);
      ctx.globalAlpha = 0.4 + 0.4 * k;
      ctx.beginPath();
      ctx.ellipse(ox, -0.05 * s, 0.055 * s * (0.5 + 0.5 * k), 0.017 * s * (0.5 + 0.5 * k), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = foam;
      for (const [ru, rr] of [[-0.85, 0.011], [0.9, 0.01]] as const) {
        ctx.beginPath();
        ctx.arc(ox + ru * 0.05 * s, -0.05 * s + 0.006 * s, s * rr, Math.PI * 0.92, Math.PI * 2.08);
        ctx.closePath();
        ctx.fill();
      }
      // THE TRICKLE: the orb gathers its water — beads drawn up off
      // the pool into the underside, fading as they arrive.
      ctx.fillStyle = foam;
      for (const tp of [0, 0.5] as const) {
        const tu = ((nowMs * 0.0005 + tp + ph * 0.1) % 1 + 1) % 1;
        ctx.globalAlpha = Math.sin(tu * Math.PI) * 0.85;
        ctx.beginPath();
        ctx.arc(
          ox + Math.sin(tu * 6 + ph) * 0.012 * s,
          -0.05 * s - tu * (Math.abs(oy) - 0.05 * s - ory * 0.6),
          0.0085 * s * (1 - tu * 0.3), 0, Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Droplet satellites, far pass: behind the orb they dim and
      // shrink (depth-split law).
      for (const [sp, sr, srr] of [[0, 1.42, 0.013], [2.1, 1.62, 0.01], [4.3, 1.5, 0.011]] as const) {
        const a = nowMs * 0.0011 + sp + ph;
        if (Math.sin(a) >= 0) continue;
        ctx.fillStyle = shade(col, 26);
        ctx.beginPath();
        ctx.arc(ox + Math.cos(a) * orx * sr, oy + Math.sin(a) * ory * 0.7, s * srr * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // THE ORB BODY: a sphere of deep water — structure, so it holds
    // white in the hurt flash.
    ctx.fillStyle = hurt ? '#ffffff' : shade(col, -6);
    ctx.beginPath();
    ctx.ellipse(ox, oy, orx, ory, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ox, oy, orx, ory, 0, 0, Math.PI * 2);
      ctx.clip();
      // The deep at the bottom of the sphere.
      ctx.fillStyle = shade(col, -28);
      ctx.beginPath();
      ctx.ellipse(ox, oy + ory * 0.55, orx * 0.95, ory * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE INNER CURRENTS: two swirls turning inside the water,
      // opposed, forever — the churn seen through the surface.
      ctx.lineCap = 'round';
      for (const [ri, sp2, dv] of [[0.62, 1, 30], [0.36, -1.5, 44]] as const) {
        const a0 = nowMs * 0.0009 * sp2 + ph;
        ctx.strokeStyle = shade(col, dv);
        ctx.lineWidth = Math.max(1, s * 0.013);
        ctx.beginPath();
        ctx.ellipse(ox, oy + ory * 0.08, orx * ri, ory * ri * 0.66, 0, a0, a0 + Math.PI * 1.1);
        ctx.stroke();
      }
      // A drop of light caught mid-swirl.
      const ga = nowMs * 0.0009 + ph + 1.2;
      ctx.fillStyle = foam;
      ctx.beginPath();
      ctx.arc(ox + Math.cos(ga) * orx * 0.5, oy + ory * 0.08 + Math.sin(ga) * ory * 0.35, s * 0.0095, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // The lit cap: the sphere read — light stands on the crown.
      ctx.fillStyle = shade(col, 30);
      ctx.beginPath();
      ctx.ellipse(ox - orx * 0.18, oy - ory * 0.42, orx * 0.5, ory * 0.3, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(col, 44);
      ctx.beginPath();
      ctx.ellipse(ox - orx * 0.3, oy - ory * 0.5, orx * 0.18, ory * 0.11, -0.3, 0, Math.PI * 2);
      ctx.fill();
      // THE RING CURRENT: water orbiting the orb — casing under a
      // pale core, a rope of sea circling its keeper. Split at the
      // orb: the far arc paints dim, the near arc bright.
      const ra = nowMs * 0.0007 * (side > 0 ? 1 : -1) + ph;
      const ringy = oy + ory * 0.1;
      for (const [pass, aa0, aa1] of [[0, Math.PI, Math.PI * 2], [1, 0, Math.PI]] as const) {
        const bright = pass === 1;
        ctx.save();
        ctx.lineCap = 'round';
        // The far half hides behind the orb: an OPAQUE dimmed color,
        // never a translucent stroke — a low-alpha thin arc fans the
        // world's outline dilate into whisker wings (the blunt tip
        // law's stroke verse).
        ctx.strokeStyle = bright ? shade(col, -12) : shade(col, -26);
        ctx.lineWidth = Math.max(1, s * (bright ? 0.018 : 0.014));
        ctx.beginPath();
        ctx.ellipse(ox, ringy, orx * 1.38, ory * 0.5, -0.16 * side, ra + aa0, ra + aa1);
        ctx.stroke();
        if (bright) {
          ctx.strokeStyle = '#dff4ef';
          ctx.globalAlpha = 0.8;
          ctx.lineWidth = Math.max(1, s * 0.007);
          ctx.beginPath();
          ctx.ellipse(ox, ringy, orx * 1.38, ory * 0.5, -0.16 * side, ra + aa0 + 0.12, ra + aa1 - 0.12);
          ctx.stroke();
        }
        ctx.restore();
      }
      // The ring's own foam bead riding the near arc.
      const ba = ra + Math.PI * 1.5;
      ctx.fillStyle = foam;
      ctx.beginPath();
      ctx.arc(ox + Math.cos(ba) * orx * 1.38, ringy + Math.sin(ba) * ory * 0.5, s * 0.011, 0, Math.PI * 2);
      ctx.fill();
      // Droplet satellites, near pass: bright and whole.
      for (const [sp, sr, srr] of [[0, 1.42, 0.013], [2.1, 1.62, 0.01], [4.3, 1.5, 0.011]] as const) {
        const a = nowMs * 0.0011 + sp + ph;
        if (Math.sin(a) < 0) continue;
        const dx2 = ox + Math.cos(a) * orx * sr;
        const dy2 = oy + Math.sin(a) * ory * 0.7;
        ctx.fillStyle = shade(col, 30);
        ctx.beginPath();
        ctx.arc(dx2, dy2, s * srr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = foam;
        ctx.beginPath();
        ctx.arc(dx2 - s * srr * 0.3, dy2 - s * srr * 0.35, s * srr * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      // THE SURGE CROWN: at the break the orb throws its water — a
      // ring of spray leaps and falls back to the pool.
      if (brk > 0.05) {
        const fly = 1 - brk;
        ctx.fillStyle = foam;
        for (const [dph, dxu, dsc] of [[0, -0.8, 1], [0.14, 0.6, 0.8], [0.28, -0.2, 0.65], [0.4, 1.0, 0.5]] as const) {
          const du = Math.min(1, fly + dph);
          if (du >= 1) continue;
          ctx.globalAlpha = (1 - du) * 0.9;
          ctx.beginPath();
          ctx.arc(
            ox + dxu * orx * (0.5 + du * 0.9),
            oy - ory * 0.7 - Math.sin(du * Math.PI) * 0.045 * s + du * du * 0.085 * s,
            0.011 * s * dsc * (1 - du * 0.35), 0, Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        // The pool answers the splash.
        ctx.strokeStyle = foam;
        ctx.globalAlpha = brk * 0.5;
        ctx.lineWidth = Math.max(1, s * 0.006);
        ctx.beginPath();
        ctx.ellipse(ox, -0.052 * s, 0.062 * s * (0.7 + 0.5 * (1 - brk)), 0.02 * s * (0.7 + 0.5 * (1 - brk)), 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    return;
  }


  if (st.pauldron === 'deeppaul') {
    const med = st.medusae;
    const bell = hurt ? '#ffffff' : med?.bell ?? shade(col, 30);
    const lume = med?.lume ?? st.luremotes?.color ?? trim;
    const k = tideK(nowMs, 0.14);
    const brk = tideBreakK(nowMs, 0.14);
    seat(0.092 * s, 0.074 * s, hurt ? '#ffffff' : col, trim);
    const ph = side > 0 ? 0 : 2.6;
    // THE PULSE: a real medusa swims — contract fast, kick, drift,
    // settle. One beat every ~2.4s, per-side phase.
    const pu = ((nowMs * 0.00042 + ph * 0.17) % 1 + 1) % 1;
    const contract = pu < 0.22 ? Math.sin((pu / 0.22) * Math.PI) : 0;
    const kick = pu < 0.5 ? Math.sin((pu / 0.5) * Math.PI) : 0;
    const bx = side * 0.035 * s;
    const by = -0.128 * s - kick * 0.014 * s + Math.sin(nowMs * 0.0009 + ph) * 0.005 * s;
    const brx = 0.082 * s * (1 - 0.16 * contract) * (1 + 0.06 * brk);
    const bry = 0.058 * s * (1 + 0.2 * contract);
    if (!hurt) {
      // THE TENTACLES first, under the bell: two long outer whips
      // and two short inner frills, kicked by the pulse, tips lit.
      ctx.lineCap = 'round';
      for (const [tu, tl, w2, ph2, outer] of [
        [-0.72, 0.115, 0.009, 0, 1], [0.68, 0.105, 0.009, 2.2, 1],
        [-0.26, 0.07, 0.0065, 4.1, 0], [0.3, 0.075, 0.0065, 1.3, 0],
      ] as const) {
        const wob = Math.sin(nowMs * 0.0016 + ph + ph2) * 0.011 * s * (1 + kick * 0.8);
        const tipX = bx + tu * brx * 1.15 + wob * 1.6;
        const tipY = by + 0.03 * s + tl * s * (1 + kick * 0.25);
        ctx.strokeStyle = outer ? shade(col, 30) : shade(col, 18);
        ctx.lineWidth = Math.max(1, s * w2);
        ctx.beginPath();
        ctx.moveTo(bx + tu * brx * 0.8, by + bry * 0.5);
        ctx.quadraticCurveTo(bx + tu * brx * 1.05 + wob, by + 0.02 * s + tl * s * 0.55, tipX, tipY);
        ctx.stroke();
        if (outer) {
          ctx.fillStyle = lume;
          ctx.globalAlpha = 0.5 + 0.4 * k;
          ctx.beginPath();
          ctx.arc(tipX, tipY + s * 0.004, s * 0.008, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      // Motes drifting up past the bell — the deep breathes out.
      ctx.fillStyle = lume;
      for (const mp of [0.1, 0.6] as const) {
        const mu = ((nowMs * 0.00009 + mp + ph * 0.1) % 1 + 1) % 1;
        ctx.globalAlpha = Math.sin(mu * Math.PI) * (0.4 + 0.4 * k);
        ctx.beginPath();
        ctx.arc(bx + Math.sin(mu * 7 + ph) * 0.02 * s - side * 0.04 * s, -0.04 * s - mu * 0.13 * s, 0.007 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // THE BELL: dome over a scalloped skirt — structure, white on
    // hurt.
    ctx.fillStyle = bell;
    ctx.beginPath();
    ctx.moveTo(bx - brx, by + bry * 0.35);
    ctx.quadraticCurveTo(bx - brx * 1.02, by - bry * 0.75, bx, by - bry);
    ctx.quadraticCurveTo(bx + brx * 1.02, by - bry * 0.75, bx + brx, by + bry * 0.35);
    ctx.arc(bx + brx * 0.66, by + bry * 0.35, brx * 0.34, 0, Math.PI, false);
    ctx.arc(bx, by + bry * 0.35, brx * 0.34, 0, Math.PI, false);
    ctx.arc(bx - brx * 0.66, by + bry * 0.35, brx * 0.34, 0, Math.PI, false);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // Bell planes: lit crown crescent, inner dome shade.
      ctx.fillStyle = shade(med?.bell ?? shade(col, 30), 16);
      ctx.beginPath();
      ctx.ellipse(bx - brx * 0.1, by - bry * 0.5, brx * 0.5, bry * 0.34, -0.15, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(med?.bell ?? shade(col, 30), -16);
      ctx.beginPath();
      ctx.ellipse(bx, by + bry * 0.18, brx * 0.8, bry * 0.3, 0, 0, Math.PI);
      ctx.fill();
      // THE ORGANS: the light inside — waxing with the tide,
      // deepening on the contraction.
      ctx.globalAlpha = 0.22 + 0.3 * k + 0.25 * contract + 0.25 * brk;
      ctx.fillStyle = lume;
      ctx.beginPath();
      ctx.ellipse(bx, by - bry * 0.1, brx * 0.4, bry * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // THE RIM LIGHT: the skirt's scallops breathing, flaring at
      // the break.
      ctx.strokeStyle = shade(lume, Math.round(-24 + (0.35 + 0.65 * Math.max(k, brk)) * 38));
      ctx.lineWidth = Math.max(1, s * (0.007 + 0.004 * brk));
      ctx.lineCap = 'round';
      for (const su of [-0.66, 0, 0.66]) {
        ctx.beginPath();
        ctx.arc(bx + brx * su, by + bry * 0.35, brx * 0.34, Math.PI * 0.12, Math.PI * 0.88);
        ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }

  if (st.pauldron === 'darkwells') {
    // THE TWIN WELLS — the dark waters' MATCHED pair (symmetric
    // sets exist; the asymmetry law is a default, not a shackle):
    // each shoulder carries a WELL of black water sunk into the cap
    // — a cold silver coping (a filled band, never a wire), depth
    // rings stepping to true dark — and down inside it THE RISER: a
    // light climbing from the deep with the swell. At the stand it
    // nearly surfaces and the water answers with one ring; at the
    // break it BREACHES — a small crest, spray falling home — then
    // sinks away. Something is down there. Twice a cycle it almost
    // arrives. The pair shares the one beat; only the idle bubbles
    // keep per-side time (the clockwork law).
    const un = st.undertow;
    const neon = un?.neon ?? trim;
    const pearl = st.pearlstrand?.color ?? trim;
    const k = tideK(nowMs, 0.14);
    const brk = tideBreakK(nowMs, 0.14);
    const ph = side > 0 ? 0 : 1.9;
    seat(0.104 * s, 0.086 * s, hurt ? '#ffffff' : col, trim);
    const wx = side * 0.012 * s;
    const wy2 = -0.062 * s;
    const wrx = 0.066 * s;
    const wry = 0.03 * s;
    // THE COPING: the one metal the murk allows — a filled silver
    // band seating the well into the cap. Structure: white on hurt.
    ctx.fillStyle = hurt ? '#ffffff' : shade(trim, -6);
    ctx.beginPath();
    ctx.ellipse(wx, wy2, wrx * 1.2, wry * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      // The coping's lit top crescent — 2.5D says the band has a
      // face.
      ctx.fillStyle = shade(trim, 12);
      ctx.beginPath();
      ctx.ellipse(wx, wy2 - wry * 0.16, wrx * 1.14, wry * 1.06, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      // THE WELL: depth as converging rings, each darker — the
      // drowning gradient sunk into the shoulder.
      for (const [ri, dv] of [[1, -26], [0.74, -34], [0.5, -42]] as const) {
        ctx.fillStyle = shade(col, dv);
        ctx.beginPath();
        ctx.ellipse(wx, wy2 + wry * (1 - ri) * 0.24, wrx * ri, wry * ri, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // THE RISER: the light in the deep. Depth rides the tide —
      // deep is small and dim, risen is wide and bright under the
      // surface plane. Drawn discs; never a halo.
      const rise = k;
      const rr2 = wrx * (0.16 + 0.36 * rise);
      ctx.fillStyle = un?.water ?? shade(col, -10);
      ctx.globalAlpha = 0.45 + 0.3 * rise;
      ctx.beginPath();
      ctx.ellipse(wx, wy2 + wry * 0.14, rr2 * 1.5, rr2 * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = neon;
      ctx.globalAlpha = 0.25 + 0.65 * rise;
      ctx.beginPath();
      ctx.ellipse(wx, wy2 + wry * 0.14, rr2, rr2 * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // The surface answers as it nears: one ring ripple opening.
      if (rise > 0.55) {
        const rp = (rise - 0.55) / 0.45;
        ctx.strokeStyle = shade(neon, 10);
        ctx.globalAlpha = (1 - rp) * 0.6;
        ctx.lineWidth = Math.max(1, s * 0.005);
        ctx.beginPath();
        ctx.ellipse(wx, wy2 + wry * 0.12, wrx * (0.3 + 0.6 * rp), wry * (0.3 + 0.6 * rp), 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // THE BREACH: at the break the light touches air — a small
      // drawn crest, spray falling home into the well. Nothing
      // leaves. Nothing ever leaves.
      if (brk > 0.05) {
        const fly = 1 - brk;
        ctx.strokeStyle = neon;
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(1, s * 0.007);
        ctx.globalAlpha = brk * 0.9;
        ctx.beginPath();
        ctx.arc(wx, wy2 + wry * 0.05, wrx * 0.3, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = pearl;
        for (const [dph, dxu] of [[0, -0.6], [0.18, 0.5], [0.34, -0.15]] as const) {
          const du = Math.min(1, fly + dph);
          if (du >= 1) continue;
          ctx.globalAlpha = (1 - du) * 0.85;
          ctx.beginPath();
          ctx.arc(
            wx + dxu * wrx * (0.5 + du * 0.7),
            wy2 - wry * 0.4 - Math.sin(du * Math.PI) * 0.028 * s + du * du * 0.05 * s,
            0.007 * s * (1 - du * 0.35), 0, Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      // Three rivet beads on the coping's outboard face — the
      // shrine door's hardware, answered at the shoulder.
      ctx.fillStyle = pearl;
      for (const bu of [-0.62, 0, 0.62] as const) {
        ctx.beginPath();
        ctx.arc(wx + bu * wrx * 0.92, wy2 + wry * 1.12 - Math.abs(bu) * wry * 0.3, 0.005 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      // The idle bubble: one bead rising off the well on its own
      // side-phase — air is the one thing that escapes.
      const mu = ((nowMs * 0.0001 + ph * 0.2) % 1 + 1) % 1;
      ctx.fillStyle = neon;
      ctx.globalAlpha = Math.sin(mu * Math.PI) * 0.4;
      ctx.beginPath();
      ctx.arc(wx + Math.sin(mu * 7 + ph) * 0.012 * s, wy2 - wry - mu * 0.05 * s, 0.005 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    return;
  }

  if (st.pauldron === 'brazierpaul') {
    // THE SWORN BRAZIERS — cindersworn's MATCHED pair: an iron
    // brazier sunk into each cap, ringed at the back rim by a crown
    // of standing char shards, and in the bowl a bed of coals whose
    // fire shows ONLY in the cracks between them (the crack law —
    // no coal ever wears its own light). The pair draws on the ONE
    // breath; at the flare each bowl vents a drawn flame lick and
    // lets its sparks rise and die. Only the leaking heat keeps
    // per-side time (the clockwork law). Fire sworn, not displayed.
    const ev = st.emberveins;
    const casing = ev?.casing ?? shade(trim, -14);
    const ember = ev?.ember ?? trim;
    const k = cinderK(nowMs, 0);
    const fl = cinderFlareK(nowMs, 0);
    const ph = side > 0 ? 0 : 2.3;
    seat(0.105 * s, 0.087 * s, hurt ? '#ffffff' : col, trim);
    const bx = side * 0.012 * s;
    const by = -0.064 * s;
    const brx = 0.06 * s;
    const bry = 0.026 * s;
    // THE CROWN OF SHARDS: standing char blades ringing the back
    // rim, no two the same height, mirrored across the pair —
    // structure, so they hold white in the flash.
    ctx.fillStyle = hurt ? '#ffffff' : shade(col, -18);
    for (const [su, hM, lean2] of [
      [-0.88, 0.62, -0.3], [-0.45, 1.0, -0.12], [0.02, 0.78, 0.04],
      [0.48, 0.9, 0.16], [0.86, 0.55, 0.32],
    ] as const) {
      const sx = bx + side * su * brx;
      const sh2 = 0.052 * s * hM;
      const lx = side * lean2 * 0.02 * s;
      ctx.beginPath();
      ctx.moveTo(sx - 0.011 * s, by - bry * 0.2);
      ctx.lineTo(sx + 0.011 * s, by - bry * 0.2);
      ctx.lineTo(sx + lx + 0.002 * s, by - sh2);
      ctx.closePath();
      ctx.fill();
    }
    // THE BOWL: cold iron, a filled band (never a wire), its top
    // crescent lit — the 2.5D face of the rim.
    ctx.fillStyle = hurt ? '#ffffff' : shade(trim, -8);
    ctx.beginPath();
    ctx.ellipse(bx, by, brx * 1.22, bry * 1.35, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = shade(trim, 10);
      ctx.beginPath();
      ctx.ellipse(bx, by - bry * 0.18, brx * 1.16, bry * 1.06, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      // The bowl's dark: the bed the coals sit in.
      ctx.fillStyle = shade(col, -30);
      ctx.beginPath();
      ctx.ellipse(bx, by + bry * 0.06, brx * 0.96, bry * 0.92, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE COALS: three faceted black lumps shouldering each other
      // over the rim — their bodies stay dark as their word.
      for (const [cu, cw2, chh, dv] of [
        [-0.52, 0.032, 0.03, -20], [0.06, 0.04, 0.038, -14], [0.6, 0.03, 0.026, -24],
      ] as const) {
        const px = bx + side * cu * brx;
        ctx.fillStyle = shade(col, dv);
        ctx.beginPath();
        ctx.moveTo(px - cw2 * s, by + bry * 0.3);
        ctx.lineTo(px - cw2 * s * 0.5, by - chh * s);
        ctx.lineTo(px + cw2 * s * 0.55, by - chh * s * 0.82);
        ctx.lineTo(px + cw2 * s, by + bry * 0.3);
        ctx.closePath();
        ctx.fill();
      }
      // THE EMBERS: the fire lives in the cracks BETWEEN the coals
      // — two drawn wedges of light breathing with the bed, casing
      // under core, and never a glow around anything.
      ctx.lineCap = 'round';
      for (const [gu, ga] of [[-0.24, 0.9], [0.34, 1.1]] as const) {
        const px = bx + side * gu * brx;
        ctx.strokeStyle = casing;
        ctx.globalAlpha = (0.3 + 0.45 * k) * ga * 0.8;
        ctx.lineWidth = Math.max(1, s * 0.013);
        ctx.beginPath();
        ctx.moveTo(px - 0.008 * s, by + bry * 0.34);
        ctx.lineTo(px + 0.004 * s, by - bry * 0.25);
        ctx.stroke();
        ctx.strokeStyle = ember;
        ctx.globalAlpha = (0.3 + 0.6 * k) * ga * 0.8;
        ctx.lineWidth = Math.max(1, s * 0.006);
        ctx.beginPath();
        ctx.moveTo(px - 0.006 * s, by + bry * 0.3);
        ctx.lineTo(px + 0.003 * s, by - bry * 0.2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (fl > 0.05) {
        // THE LICK: at the flare the bowl vents one drawn flame —
        // a curling casing+core stroke, tapered by its two weights,
        // leaning outboard on the pair's shared beat.
        const lh = 0.055 * s * (0.5 + 0.5 * fl);
        const tipX2 = bx + side * 0.022 * s;
        const midX = bx - side * 0.012 * s;
        ctx.globalAlpha = 0.5 + 0.5 * fl;
        ctx.strokeStyle = casing;
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(bx, by - bry * 0.3);
        ctx.quadraticCurveTo(midX, by - lh * 0.55, tipX2, by - lh);
        ctx.stroke();
        ctx.strokeStyle = ember;
        ctx.lineWidth = Math.max(1, s * 0.0065);
        ctx.beginPath();
        ctx.moveTo(bx, by - bry * 0.25);
        ctx.quadraticCurveTo(midX, by - lh * 0.5, tipX2, by - lh * 0.92);
        ctx.stroke();
        ctx.globalAlpha = 1;
        // The sparks: rising, wandering, dying — per-side jitter on
        // the one shared beat.
        const flyU = 1 - fl;
        ctx.fillStyle = ember;
        for (const [dph, dxu] of [[0, -0.5], [0.22, 0.55]] as const) {
          const du = Math.min(1, flyU + dph);
          if (du >= 1) continue;
          ctx.globalAlpha = (1 - du) * 0.85;
          ctx.beginPath();
          ctx.arc(
            bx + side * dxu * brx * 0.6 + Math.sin(du * 9 + ph) * 0.012 * s,
            by - bry - du * 0.07 * s,
            0.0065 * s * (1 - du * 0.4), 0, Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      // The leak: one ember mote always rising off the bed on its
      // own side-phase — heat is the one thing the oath lets go.
      const mu = ((nowMs * 0.00011 + ph * 0.2) % 1 + 1) % 1;
      ctx.fillStyle = ember;
      ctx.globalAlpha = Math.sin(mu * Math.PI) * (0.25 + 0.3 * k);
      ctx.beginPath();
      ctx.arc(bx + Math.sin(mu * 7 + ph) * 0.014 * s, by - bry - mu * 0.055 * s, 0.005 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    return;
  }

  if (st.pauldron === 'sunderpaul') {
    // THE TAKEN SHARDS — voidwhisper's MATCHED pair: each cap wears
    // a low angular crest with a BITE torn from its top edge — the
    // wound full of true void (the absence law: the dark inside is
    // deeper than any cloth) — and the missing shard still HOVERS
    // over the cut, torn edges rim-lit in plasma, a smaller chip
    // adrift beside it. The pair shares the hush (one whisper
    // brightens both wounds together) while every held piece bobs
    // on its own side-phase (the clockwork law). Now and then a
    // pale star arrives in the gap: seen, then elsewhere. The void
    // does not return what it takes.
    const vr = st.voidrift;
    const casing = vr?.casing ?? shade(trim, -14);
    const core = vr?.core ?? trim;
    const voidCol = vr?.void ?? '#0a0714';
    const k = voidK(nowMs, 0);
    const ph = side > 0 ? 0 : 2.3;
    seat(0.105 * s, 0.087 * s, hurt ? '#ffffff' : col, trim);
    const px = (u: number): number => side * u * s;
    // THE CREST: an angular standing plate riding the cap's crown —
    // a step LIGHTER than the cap (dark-on-dark is invisible; the
    // stormspire lesson), its top edge broken by the bite. It is
    // structure: it holds white in the flash.
    ctx.fillStyle = hurt ? '#ffffff' : shade(col, 8);
    ctx.beginPath();
    ctx.moveTo(px(-0.082), -0.048 * s);
    ctx.lineTo(px(-0.062), -0.092 * s);
    ctx.lineTo(px(-0.012), -0.088 * s);
    ctx.lineTo(px(0.008), -0.062 * s);
    ctx.lineTo(px(0.036), -0.094 * s);
    ctx.lineTo(px(0.07), -0.082 * s);
    ctx.lineTo(px(0.088), -0.044 * s);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // The 2.5D read: lit top facets either side of the wound.
      ctx.fillStyle = shade(col, 26);
      ctx.beginPath();
      ctx.moveTo(px(-0.062), -0.092 * s);
      ctx.lineTo(px(-0.012), -0.088 * s);
      ctx.lineTo(px(-0.016), -0.078 * s);
      ctx.lineTo(px(-0.058), -0.082 * s);
      ctx.closePath();
      ctx.moveTo(px(0.036), -0.094 * s);
      ctx.lineTo(px(0.07), -0.082 * s);
      ctx.lineTo(px(0.066), -0.072 * s);
      ctx.lineTo(px(0.038), -0.083 * s);
      ctx.closePath();
      ctx.fill();
    }
    // THE WOUND: the bite is full of void — painted always; in the
    // flash the dark notch keeps the sundered silhouette honest.
    ctx.fillStyle = voidCol;
    ctx.beginPath();
    ctx.moveTo(px(-0.012), -0.088 * s);
    ctx.lineTo(px(0.008), -0.062 * s);
    ctx.lineTo(px(0.036), -0.094 * s);
    ctx.closePath();
    ctx.fill();
    // THE SHARD: the piece the void kept, hovering over the bite on
    // its own slow time — and the chip it shed, further out. Both
    // are silhouette: they hold white in the flash.
    const gapP = 0.028 * s + 0.016 * s * k;
    const bob = Math.sin(nowMs * 0.0011 + ph) * 0.008 * s;
    const driftS = Math.sin(nowMs * 0.0007 + ph + 1.1) * 0.006 * s;
    const sx = px(0.012) + side * driftS;
    const sy = -0.096 * s - gapP + bob;
    ctx.fillStyle = hurt ? '#ffffff' : shade(col, 20);
    ctx.beginPath();
    ctx.moveTo(sx, sy + 0.018 * s);
    ctx.lineTo(sx - side * 0.032 * s, sy - 0.016 * s);
    ctx.lineTo(sx - side * 0.01 * s, sy - 0.056 * s);
    ctx.lineTo(sx + side * 0.028 * s, sy - 0.022 * s);
    ctx.closePath();
    ctx.fill();
    const cbob = Math.sin(nowMs * 0.0011 + ph + 2.1) * 0.006 * s;
    const cx2 = px(0.058);
    const cy2 = -0.118 * s + cbob;
    ctx.fillStyle = hurt ? '#ffffff' : shade(col, 6);
    ctx.beginPath();
    ctx.moveTo(cx2, cy2 + 0.008 * s);
    ctx.lineTo(cx2 - side * 0.011 * s, cy2 - 0.009 * s);
    ctx.lineTo(cx2 + side * 0.01 * s, cy2 - 0.012 * s);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // The shard's lit facet — the same sky lights every piece.
      ctx.fillStyle = shade(col, 34);
      ctx.beginPath();
      ctx.moveTo(sx - side * 0.032 * s, sy - 0.016 * s);
      ctx.lineTo(sx - side * 0.01 * s, sy - 0.056 * s);
      ctx.lineTo(sx - side * 0.005 * s, sy - 0.04 * s);
      ctx.lineTo(sx - side * 0.022 * s, sy - 0.014 * s);
      ctx.closePath();
      ctx.fill();
      // THE TORN EDGES wear the only light: plasma on the bite's two
      // lips and along the shard's under-edge, all on the one hush.
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const lips = (): void => {
        ctx.beginPath();
        ctx.moveTo(px(-0.012), -0.088 * s);
        ctx.lineTo(px(0.008), -0.062 * s);
        ctx.lineTo(px(0.036), -0.094 * s);
        ctx.moveTo(sx - side * 0.032 * s, sy - 0.016 * s);
        ctx.lineTo(sx, sy + 0.018 * s);
        ctx.lineTo(sx + side * 0.028 * s, sy - 0.022 * s);
        ctx.stroke();
      };
      ctx.strokeStyle = casing;
      ctx.globalAlpha = 0.28 + 0.5 * k;
      ctx.lineWidth = Math.max(1, s * 0.013);
      lips();
      ctx.strokeStyle = core;
      ctx.globalAlpha = 0.22 + 0.58 * k;
      ctx.lineWidth = Math.max(1, s * 0.006);
      lips();
      ctx.restore();
      // THE ARRIVAL: a pale star at one of three fixed seats around
      // the gap — it wakes, is seen, and is next seen at another.
      const wk = voidWink(nowMs, 0.9 + ph * 0.17, 3);
      const seats: Array<[number, number]> = [
        [-0.024, -0.104], [0.03, -0.124], [0.002, -0.086],
      ];
      const [wu, wv] = seats[wk.i]!;
      ctx.fillStyle = core;
      ctx.globalAlpha = wk.a * (0.4 + 0.6 * k);
      ctx.beginPath();
      ctx.arc(px(wu), wv * s, 0.006 * s * (0.6 + 0.5 * wk.a), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    return;
  }

  if (st.pauldron === 'downpaul') {
    // THE DOWN SHOULDERS — thistledown's MATCHED pair: quilted
    // linen caps, two stitch seams crossing the dome into three
    // soft puffed lobes, a wisp of real down escaping at the crown
    // seam, and on the passing breeze each shoulder lets one seed
    // rise and go. The pair shares the one wind; every loose thing
    // keeps its own side-time (the clockwork law). A starter's
    // shoulders, sewn like they mattered — because they did.
    const seedCol = st.driftdown?.seed ?? shade(trim, 30);
    const bz = breezeK(nowMs, 0);
    const ph = side > 0 ? 0 : 2.3;
    seat(0.1 * s, 0.084 * s, hurt ? '#ffffff' : col, trim);
    const px = (u: number): number => side * u * s;
    if (!hurt) {
      // The quilting: three puffed lobes read as lit top crescents
      // (the billow law — crescents, never offset circles).
      ctx.fillStyle = shade(col, 12);
      for (const [lu, lr] of [[-0.062, 0.026], [0.004, 0.032], [0.066, 0.024]] as const) {
        ctx.beginPath();
        ctx.arc(px(lu), -0.052 * s, lr * s, Math.PI * 1.04, Math.PI * 1.96);
        ctx.closePath();
        ctx.fill();
      }
      // The two seams between the lobes — running stitch, honest.
      ctx.strokeStyle = shade(col, -20);
      ctx.lineWidth = Math.max(1, s * 0.006);
      ctx.setLineDash([s * 0.01, s * 0.009]);
      ctx.beginPath();
      ctx.moveTo(px(-0.03), -0.075 * s);
      ctx.quadraticCurveTo(px(-0.036), -0.03 * s, px(-0.028), 0.032 * s);
      ctx.moveTo(px(0.036), -0.072 * s);
      ctx.quadraticCurveTo(px(0.042), -0.028 * s, px(0.034), 0.034 * s);
      ctx.stroke();
      ctx.setLineDash([]);
      // THE ESCAPING DOWN: a wisp at the crown seam — two SHORT FAT
      // rays leaning with the breeze (thin strokes past the cap's
      // outline fan the world's dilate into dark fuzz — the blunt
      // tip law reaches the small things too).
      ctx.strokeStyle = seedCol;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1.5, s * 0.012);
      const leanW = 0.2 + 0.5 * bz;
      ctx.beginPath();
      for (const [da, dl] of [[-0.3, 0.018], [0.25, 0.021]] as const) {
        ctx.moveTo(px(0.036), -0.068 * s);
        ctx.lineTo(
          px(0.036) + Math.sin(da + leanW) * dl * s,
          -0.068 * s - Math.cos(da + leanW) * dl * s,
        );
      }
      ctx.stroke();
      ctx.lineCap = 'butt';
      // THE SHED: one seed rising off the cap and away — constant
      // pace, per-side phase, brightest when the gust passes.
      const ub = ((nowMs * 0.00012 + ph * 0.2) % 1 + 1) % 1;
      thistleSeed(
        ctx,
        px(0.02) + Math.sin(ub * 6 + ph) * 0.016 * s,
        -0.1 * s - ub * 0.095 * s,
        0.013 * s * (1 - ub * 0.3),
        seedCol,
        side * ub * 1.5,
        Math.sin(ub * Math.PI) * (0.25 + 0.75 * bz),
      );
    }
    ctx.restore();
    return;
  }

  if (st.pauldron === 'vortexpaul') {
    // THE CHURN — the maelstrom's shoulders: the right carries the
    // whirl itself, two crescent ridges turning over the cap with
    // foam chasing their rims, spume tearing off at the break; the
    // left wears THE WASH — flat foam sheets sliding opposed, the
    // sea that never lies still.
    const spume = st.spindrift?.color ?? trim;
    const brk = tideBreakK(nowMs, 0.14);
    seat(0.107 * s, 0.087 * s, hurt ? '#ffffff' : col, trim);
    if (side > 0 && !hurt) {
      // THE WHIRL: crescent ridges precessing round the cap.
      ctx.lineCap = 'round';
      for (const [i, rr] of [[0, 0.05], [1, 0.078]] as const) {
        const a0 = nowMs * 0.00082 * (i === 0 ? 1 : -0.7) + i * 2.4;
        ctx.fillStyle = shade(col, i === 0 ? 16 : -8);
        ctx.beginPath();
        ctx.ellipse(side * 0.015 * s, -0.06 * s, rr * s, rr * s * 0.55, 0, a0, a0 + Math.PI * 1.15);
        ctx.ellipse(side * 0.015 * s, -0.06 * s, rr * s * 0.72, rr * s * 0.4, 0, a0 + Math.PI * 1.15, a0, true);
        ctx.closePath();
        ctx.fill();
        // Foam chasing each ridge's leading rim.
        const fa = a0 + Math.PI * 1.15;
        ctx.fillStyle = spume;
        ctx.beginPath();
        ctx.arc(side * 0.015 * s + Math.cos(fa) * rr * s * 0.86, -0.06 * s + Math.sin(fa) * rr * s * 0.48, 0.012 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      // The eye: the whirl's still point.
      ctx.fillStyle = shade(col, -26);
      ctx.beginPath();
      ctx.ellipse(side * 0.015 * s, -0.06 * s, 0.018 * s, 0.011 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      // Spume off the rim at the break.
      if (brk > 0.05) {
        const fly = 1 - brk;
        ctx.fillStyle = spume;
        for (const dph of [0, 0.25] as const) {
          const du = Math.min(1, fly + dph);
          if (du >= 1) continue;
          ctx.globalAlpha = (1 - du) * 0.85;
          ctx.beginPath();
          ctx.arc(side * (0.09 + du * 0.08) * s, -0.07 * s - du * 0.03 * s, 0.011 * s * (1 - du * 0.4), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    } else if (side < 0 && !hurt) {
      // THE WASH: two foam sheets sliding on opposed swells.
      const s0 = Math.sin(nowMs * 0.0005) * 0.014 * s;
      const s1 = Math.sin(nowMs * 0.0005 + Math.PI) * 0.011 * s;
      for (const [dy2, rx2, dv, dr] of [[-0.055, 0.078, -8, 1], [-0.03, 0.064, 4, -1]] as const) {
        const bx = side * 0.01 * s + (dr > 0 ? s0 : s1);
        ctx.fillStyle = shade(col, dv);
        ctx.beginPath();
        ctx.ellipse(bx, dy2 * s, rx2 * s, 0.024 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        // The foam edge leading each sheet.
        ctx.fillStyle = spume;
        for (const fu of [-0.5, 0.1, 0.65]) {
          ctx.beginPath();
          ctx.arc(bx + (dr > 0 ? 1 : -1) * rx2 * s * 0.8 * (0.6 + 0.4 * Math.abs(fu)), dy2 * s + fu * 0.016 * s, 0.008 * s, Math.PI * 0.9, Math.PI * 2.1);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    ctx.restore();
    return;
  }

  if (st.pauldron === 'mothpile') {
    // THE MOTHPILE — the mothwing shoulder: the moth's own furred
    // thorax worn at the joint. A seated cap buried under two lapped
    // rows of soft pile, every tuft round and deep, the crown row
    // tipped pale like frost on fur — mass without metal, the boss
    // silhouette grown instead of forged. The pile breathes on the
    // hands' own slow clock, one part in thirty: alive, not boiling.
    const breathe = 1 + 0.033 * Math.sin(nowMs * 0.0019 + side * 0.9);
    ctx.save();
    ctx.scale(breathe, breathe);
    seat(0.118 * s, 0.094 * s, hurt ? '#ffffff' : shade(base, -20), trim);
    if (!hurt) {
      // The under-row: bigger, darker lumps ringing the cap's hem.
      ctx.fillStyle = shade(base, -10);
      for (let i = 0; i < 5; i++) {
        const u = -1 + i * 0.5;
        const r = (0.052 + 0.012 * Math.sin(i * 2.7 + side)) * s;
        ctx.beginPath();
        ctx.arc(u * 0.095 * s, 0.012 * s + Math.sin(i * 1.9) * 0.012 * s, r, 0, Math.PI * 2);
        ctx.fill();
      }
      // The crown row: smaller, lit lumps stacked above, each tipped
      // pale — the pile catches the light on top, as pile does.
      for (let i = 0; i < 4; i++) {
        const u = -0.75 + i * 0.5;
        const r = (0.042 + 0.01 * Math.sin(i * 2.2 + side * 1.3)) * s;
        const px = u * 0.085 * s;
        const py = -0.045 * s + Math.sin(i * 2.4) * 0.008 * s;
        ctx.fillStyle = shade(base, 6);
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = trim;
        ctx.beginPath();
        ctx.arc(px - r * 0.2, py - r * 0.38, r * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Hurt flash keeps the pile's lumpy silhouette.
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 5; i++) {
        const u = -1 + i * 0.5;
        const r = (0.052 + 0.012 * Math.sin(i * 2.7 + side)) * s;
        ctx.beginPath();
        ctx.arc(u * 0.095 * s, 0.0 * s + Math.sin(i * 1.9) * 0.012 * s, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.restore();
    return;
  }
  if (st.pauldron === 'sunfan') {
    // THE SUNFAN — the sunhallow shoulder: three gilt ray petals
    // fanning up and outward off a seated gold cap, breathing on a
    // slow dawn clock. Rays, not blades: each petal is broad at the
    // root, round at the tip, and carries its lit ridge the way a
    // ray carries light — the dawn worn at the shoulder to answer
    // the aureole at the brow.
    const breathe = 1 + 0.05 * Math.sin(nowMs * 0.0013 + side * 0.7);
    const rays: Array<[number, number, number]> = [
      // [angle from straight up (×side, outward positive), length, width]
      // Four rays, sized to be SEEN: the dawn at the shoulder is a
      // statement, not a garnish.
      [0.06, 0.26, 0.062],
      [0.4, 0.225, 0.056],
      [0.72, 0.185, 0.05],
      [1.0, 0.14, 0.042],
    ];
    for (let i = rays.length - 1; i >= 0; i--) {
      const [ang, len0, w] = rays[i]!;
      const len = len0 * breathe * s;
      const dx = Math.sin(ang) * side;
      const dy = -Math.cos(ang);
      const px = dx * -0.005 * s;
      const py = 0.01 * s;
      const tx = px + dx * len;
      const ty = py + dy * len;
      const nx = -dy * side;
      const ny = dx * side;
      ctx.fillStyle = hurt ? '#ffffff' : shade(base, (near ? 10 : -4) - i * 8);
      ctx.beginPath();
      ctx.moveTo(px - nx * w * s * 0.5 * side, py - ny * w * s * 0.5 * side);
      ctx.quadraticCurveTo(
        px + dx * len * 0.55 - nx * w * s * 0.62 * side,
        py + dy * len * 0.55 - ny * w * s * 0.62 * side,
        tx - nx * w * s * 0.2 * side, ty - ny * w * s * 0.2 * side,
      );
      // The round ray tip — a petal, never a spike.
      ctx.quadraticCurveTo(tx + dx * w * s * 0.5, ty + dy * w * s * 0.5, tx + nx * w * s * 0.2 * side, ty + ny * w * s * 0.2 * side);
      ctx.quadraticCurveTo(
        px + dx * len * 0.55 + nx * w * s * 0.62 * side,
        py + dy * len * 0.55 + ny * w * s * 0.62 * side,
        px + nx * w * s * 0.5 * side, py + ny * w * s * 0.5 * side,
      );
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        // Each ray carries its lit ridge up the center.
        ctx.strokeStyle = trim;
        ctx.lineWidth = Math.max(1, s * 0.013);
        ctx.beginPath();
        ctx.moveTo(px + dx * len * 0.16, py + dy * len * 0.16);
        ctx.lineTo(px + dx * len * 0.82, py + dy * len * 0.82);
        ctx.stroke();
      }
    }
    // The fan grows out of the WORN SEAT: the dome cups the arm root
    // in a QUIETER antique gold, so the rays stay the bright
    // statement — dome as ground, fan as figure.
    seat(0.112 * s, 0.092 * s, hurt ? '#ffffff' : shade(base, -18), trim);
    ctx.restore();
    return;
  }
  if (st.pauldron === 'veilwing') {
    // THE VEILWING — the gloamsight shoulder: two sculpted wing
    // plates swept up and OUTWARD off the arm, lapped like the
    // veil's own temple crest grown to full span. Dark bronze mass
    // under THE ONE BRIGHT EDGE: a lit stroke down each leading
    // curve, or the sweep reads as shadow instead of wing.
    const u = 1; // outward: the wings clear the silhouette, never the chest
    // Trimmed to sit BELOW the veil's own temple crest — the head
    // keeps the highest gold; the shoulders answer, never compete.
    for (let i = 2; i >= 0; i--) {
      const lift = i * 0.04;
      const len = (0.27 - i * 0.048) * s;
      const px = side * -0.01 * s;
      const py = (-0.025 + lift * 0.35) * s;
      const tx = px + side * u * len;
      const ty = py - (0.165 - lift) * s;
      ctx.fillStyle = hurt ? '#ffffff' : shade(base, (near ? 8 : -6) - i * 12);
      ctx.beginPath();
      ctx.moveTo(px, py - 0.045 * s);
      // Leading curve: up and back to the wing point.
      ctx.quadraticCurveTo(px + side * u * len * 0.5, py - 0.135 * s, tx, ty);
      // The return edge gives the plate its WIDTH — a sculpted slab.
      ctx.quadraticCurveTo(px + side * u * len * 0.55, py + 0.02 * s, px, py + 0.055 * s);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        // THE ONE BRIGHT EDGE down the leading curve.
        ctx.strokeStyle = trim;
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(px, py - 0.042 * s);
        ctx.quadraticCurveTo(px + side * u * len * 0.5, py - 0.13 * s, tx, ty);
        ctx.stroke();
      }
    }
    // The wings grow off the WORN SEAT — the bronze dome cups the arm
    // root and the sweep starts from a shoulder that exists.
    seat(0.115 * s, 0.09 * s, col, trim);
    ctx.restore();
    return;
  }
  if (st.pauldron === 'stormspire') {
    // THE STORMSPIRE — the stormsinger shoulder: three storm-glass
    // crystal spires rising off a domed indigo seat, leaning outward
    // like the weather is pulling them. Each pane keeps THE ONE
    // BRIGHT EDGE down its windward face, and on its own beat an arc
    // snaps between the two tallest tips — the charge the orbs
    // circle for, grounded at the shoulder.
    const seatY = -0.015 * s;
    // The WORN SEAT first: a dark forged dome cupping the arm — the
    // glass is luminous, so the socket it grows from stays iron.
    seat(0.115 * s, 0.09 * s, shade(base, -38), shade(base, -10));
    const spires: Array<[number, number, number, number]> = [
      // [base x (×side), height, half-width, outward lean] — SHORT
      // and FAT: a crystal is mass with facets; a tall thin one is a
      // wire, and twelve wires are a cage (the first-cut lesson).
      [0.02, 0.14, 0.052, 0.32],
      [-0.05, 0.1, 0.04, 0.1],
      [0.09, 0.078, 0.034, 0.55],
    ];
    const tips: Array<[number, number]> = [];
    for (const [k, [bu, hgt, wid, leanK]] of spires.entries()) {
      const bx = side * bu * s;
      const tx = bx + side * leanK * hgt * s * 0.55;
      const ty = seatY - hgt * s;
      tips.push([tx, ty]);
      ctx.fillStyle = hurt ? '#ffffff' : shade(base, 4);
      ctx.beginPath();
      ctx.moveTo(bx - wid * s, seatY);
      ctx.lineTo(tx, ty);
      ctx.lineTo(bx + wid * s, seatY);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        // The dark lee facet; the bright windward edge stays on the
        // two tall panes only — restraint keeps them crystal.
        ctx.fillStyle = shade(base, -18);
        ctx.beginPath();
        ctx.moveTo(bx + wid * s * 0.1, seatY);
        ctx.lineTo(tx, ty);
        ctx.lineTo(bx + wid * s, seatY);
        ctx.closePath();
        ctx.fill();
        if (k < 2) {
          ctx.strokeStyle = trim;
          ctx.lineWidth = Math.max(1, s * 0.013);
          ctx.beginPath();
          ctx.moveTo(bx - wid * s * 0.8, seatY);
          ctx.lineTo(tx - side * 0.004 * s, ty + 0.008 * s);
          ctx.stroke();
        }
      }
    }
    if (!hurt) {
      // The snap: an arc between the two tallest tips on its own
      // beat; between snaps, a charge glint holds the tall point.
      const beat = Math.sin(nowMs * 0.0033 + side * 1.2);
      const [t0, t1] = [tips[0]!, tips[1]!];
      if (beat > 0.9) {
        const j = (beat - 0.9) / 0.1;
        ctx.globalAlpha = j;
        ctx.strokeStyle = shade(trim, 20);
        ctx.lineWidth = Math.max(1, s * 0.011);
        ctx.beginPath();
        ctx.moveTo(t0[0], t0[1]);
        const mx = (t0[0] + t1[0]) / 2 + Math.sin(nowMs * 0.045) * 0.014 * s;
        const my = (t0[1] + t1[1]) / 2 - 0.02 * s;
        ctx.lineTo(mx, my);
        ctx.lineTo(t1[0], t1[1]);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = 0.35 + 0.4 * Math.max(0, beat);
        ctx.fillStyle = shade(trim, 24);
        ctx.beginPath();
        ctx.arc(t0[0], t0[1], 0.012 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'charbrand') {
    // THE CHARBRAND — the flamewrought shoulder: two lapped char-iron
    // slabs with a molten seam breathing between them — the forge
    // never cooled, and the shoulder admits it. The slabs are angular
    // mass with lit top edges; the seam does the talking.
    const slab = (
      x0: number, y0: number, w: number, h: number, skew: number, tone: number,
    ): void => {
      ctx.fillStyle = hurt ? '#ffffff' : shade(base, tone);
      ctx.beginPath();
      ctx.moveTo(x0 - w * 0.5, y0 + h * 0.5);
      ctx.lineTo(x0 - w * 0.42 + skew, y0 - h * 0.5);
      ctx.lineTo(x0 + w * 0.46 + skew, y0 - h * 0.44);
      ctx.lineTo(x0 + w * 0.54, y0 + h * 0.42);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        // The lit top edge — iron under one sun.
        ctx.strokeStyle = shade(base, 26);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(x0 - w * 0.42 + skew, y0 - h * 0.5);
        ctx.lineTo(x0 + w * 0.46 + skew, y0 - h * 0.44);
        ctx.stroke();
      }
    };
    // The WORN SEAT under the ironwork: the char dome cups the arm so
    // the slabs lap a shoulder, not a gap.
    seat(0.115 * s, 0.09 * s, shade(base, -4), shade(base, 18));
    // Upper slab rides the shoulder crown; lower laps the arm.
    slab(side * -0.01 * s, -0.045 * s, 0.19 * s, 0.085 * s, side * 0.012 * s, 6);
    slab(side * 0.02 * s, 0.05 * s, 0.21 * s, 0.09 * s, side * 0.02 * s, -8);
    if (!hurt) {
      // The molten seam between the slabs, breathing on the furnace
      // beat, brightest mid-run — heat, not trim.
      const emberCol = st.pauldronTrim ?? '#ff7a3c';
      const pulse = 0.55 + 0.45 * Math.sin(nowMs * 0.0027 + side * 2.1);
      ctx.globalAlpha = 0.45 + 0.5 * pulse;
      ctx.strokeStyle = emberCol;
      ctx.lineWidth = Math.max(1, s * (0.011 + 0.005 * pulse));
      ctx.beginPath();
      ctx.moveTo(side * -0.095 * s, 0.005 * s);
      ctx.lineTo(side * -0.03 * s, -0.008 * s);
      ctx.lineTo(side * 0.035 * s, 0.008 * s);
      ctx.lineTo(side * 0.1 * s, -0.004 * s);
      ctx.stroke();
      // One spark leaves the seam and dies mid-air.
      const cyc = (nowMs * 0.0011 + (side + 1) * 0.35) % 1;
      if (cyc < 0.7) {
        ctx.globalAlpha = (0.7 - cyc) * 0.9;
        ctx.fillStyle = shade(emberCol, 22);
        ctx.beginPath();
        ctx.arc(side * 0.02 * s + Math.sin(cyc * 9) * 0.012 * s, -0.01 * s - cyc * 0.11 * s, 0.009 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'wardcrest') {
    // THE WARDCREST — the duskwarden shoulder: a broad brass crescent
    // arcing over the cape, horns down, riveted at the tips, with one
    // oxblood watch stone at its crown that keeps the same slow pulse
    // the hem stones answer. Jewelry at armor scale: the toll
    // collector's plate.
    const brass = st.pauldronTrim ?? shade(base, 30);
    const R = 0.13 * s;
    // The WORN SEAT under the crescent: the midnight dome cups the
    // arm and fills the ring — a crescent over a gap is a handle.
    seat(0.12 * s, 0.095 * s, col, shade(brass, -8));
    // The crescent is a PLATE, not a wire: a filled band between two
    // arcs, thick enough to carry rivets and its own lit crown.
    const bandW = 0.055 * s;
    ctx.fillStyle = hurt ? '#ffffff' : brass;
    ctx.beginPath();
    ctx.arc(0, 0.03 * s, R, Math.PI * 1.04, Math.PI * 1.96);
    ctx.arc(0, 0.03 * s, R - bandW, Math.PI * 1.96, Math.PI * 1.04, true);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // The lit crown along the top plane, and the shaded under-rim.
      ctx.strokeStyle = shade(brass, 26);
      ctx.lineWidth = Math.max(1.5, s * 0.016);
      ctx.beginPath();
      ctx.arc(0, 0.026 * s, R - 0.006 * s, Math.PI * 1.18, Math.PI * 1.82);
      ctx.stroke();
      ctx.strokeStyle = shade(brass, -24);
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.arc(0, 0.03 * s, R - bandW + 0.004 * s, Math.PI * 1.14, Math.PI * 1.86);
      ctx.stroke();
      // Rivets seat the horns on the cape.
      ctx.fillStyle = shade(brass, -18);
      for (const es of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(es * (R - bandW * 0.5) * 0.98, 0.03 * s + R * 0.2, 0.015 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      // The watch stone, pulsing on the gemwake clock — set INTO the
      // band's crown, bezel and all.
      if (st.gemwake) {
        const pulse = 0.4 + 0.6 * Math.max(0, Math.sin(nowMs * 0.0013 + side * 2.4));
        const gy = 0.03 * s - R + bandW * 0.5;
        ctx.fillStyle = shade(brass, -26);
        ctx.beginPath();
        ctx.arc(0, gy, 0.034 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(st.gemwake.color, pulse * 30);
        ctx.beginPath();
        ctx.moveTo(0, gy - 0.027 * s);
        ctx.lineTo(0.022 * s, gy);
        ctx.lineTo(0, gy + 0.027 * s);
        ctx.lineTo(-0.022 * s, gy);
        ctx.closePath();
        ctx.fill();
        if (pulse > 0.5) {
          ctx.globalAlpha = (pulse - 0.5) * 0.5;
          ctx.fillStyle = st.gemwake.color;
          ctx.beginPath();
          ctx.arc(0, gy, 0.055 * s, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'aethercrest') {
    // THE AETHERCREST — the aetherion shoulder: two silver crescent
    // arcs floating just off the shoulder, stacked, bobbing on
    // counter-phased clocks with a glint walking the outer rim.
    // Nothing holds them up — the same law as the glyph ring below;
    // the shoulder is where the flagship's geometry begins.
    // Seated LOW and pushed OUTWARD: the arcs cup the shoulder's own
    // curve, clear of the skull — regalia at the shoulder, never ears
    // beside the head (the first-cut lesson). The arcs FLOAT, but the
    // shoulder under them is dressed: a violet cloth pad cups the arm
    // so the regalia hovers over a shoulder, not a stick.
    seat(0.105 * s, 0.085 * s, hurt ? '#ffffff' : shade(st.color, -4), base);
    const arcCol = hurt ? '#ffffff' : base;
    const ox2 = side * 0.055 * s;
    for (const [i, rr] of [0.115, 0.08].entries()) {
      const bob = Math.sin(nowMs * 0.0017 + i * 2.6 + side) * 0.009 * s;
      const cy = 0.005 * s - i * 0.035 * s + bob;
      const R = rr * s;
      ctx.strokeStyle = arcCol;
      ctx.lineWidth = Math.max(1.5, s * (0.021 - i * 0.005));
      ctx.beginPath();
      ctx.arc(ox2, cy, R, Math.PI * 1.02, Math.PI * 1.98);
      ctx.stroke();
      if (!hurt) {
        // The aether edge rides the crescent's crown.
        ctx.strokeStyle = st.pauldronTrim ?? shade(base, 30);
        ctx.lineWidth = Math.max(1, s * 0.009);
        ctx.beginPath();
        ctx.arc(ox2, cy - 0.004 * s, R, Math.PI * 1.22, Math.PI * 1.78);
        ctx.stroke();
      }
    }
    if (!hurt) {
      // The glint walks the outer arc, keeping the ring's own pace.
      const ga = Math.PI * (1.02 + 0.96 * ((Math.sin(nowMs * 0.0009 + side * 1.5) + 1) / 2));
      const bob0 = Math.sin(nowMs * 0.0017 + side) * 0.009 * s;
      ctx.fillStyle = shade(st.pauldronTrim ?? base, 36);
      ctx.beginPath();
      ctx.arc(ox2 + Math.cos(ga) * 0.115 * s, 0.005 * s + bob0 + Math.sin(ga) * 0.115 * s, 0.011 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'bonemaw') {
    // THE BONEMAW — the jadeskull shoulder: a polished jade dome
    // cupping the arm, and the trophy clamped over it — a bleached
    // hunting jaw biting down over the dome's outer slope, fangs
    // curling in around the shoulder it claimed. At the crown a small
    // carved skull boss keeps watch, its eyes waking on the chest
    // device's own slow clock — the gaze answered at the shoulder.
    // Bone rides jade: the dome stays the deep ground so the trophy
    // stays the pale statement.
    const bone = hurt ? '#ffffff' : '#e6e0cc';
    // The rear crest first: two low bone wedges peeking over the
    // crown from behind — silhouette at the north reads, roots
    // buried under the dome so nothing floats.
    ctx.fillStyle = hurt ? '#ffffff' : shade('#e6e0cc', -16);
    for (const [wx, wt, wh] of [[-0.045, 0.03, 0.085], [0.02, 0.036, 0.108]] as const) {
      ctx.beginPath();
      ctx.moveTo(side * (wx - wt) * s, -0.07 * s);
      ctx.quadraticCurveTo(side * (wx - wt * 0.2) * s, (-0.07 - wh) * s, side * (wx + wt * 0.5) * s, (-0.075 - wh) * s);
      ctx.lineTo(side * (wx + wt) * s, -0.07 * s);
      ctx.closePath();
      ctx.fill();
    }
    // THE WORN SEAT: the polished jade dome, gold-hemmed — the stone
    // the trophy is mounted on.
    seat(0.126 * s, 0.098 * s, hurt ? '#ffffff' : col, trim);
    if (!hurt) {
      // Carved jade: one engraved arc following the dome's face —
      // quiet lapidary craft under the bone, never competing.
      ctx.strokeStyle = shade(base, -20);
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(-0.082 * s, 0.028 * s);
      ctx.quadraticCurveTo(0, -0.028 * s, 0.082 * s, 0.028 * s);
      ctx.stroke();
    }
    // The jawbone: a fat mandible arc clamped over the outer slope,
    // thick at the hinge, thinning toward the front bite.
    ctx.fillStyle = bone;
    ctx.beginPath();
    ctx.moveTo(side * -0.034 * s, -0.104 * s);
    ctx.quadraticCurveTo(side * 0.07 * s, -0.132 * s, side * 0.136 * s, -0.048 * s);
    ctx.lineTo(side * 0.126 * s, 0.006 * s);
    ctx.quadraticCurveTo(side * 0.062 * s, -0.066 * s, side * -0.03 * s, -0.056 * s);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // Two facets: the sun finds the jaw's upper face, the underside
      // turns away — bone with mass, never a pale sticker.
      ctx.fillStyle = shade('#e6e0cc', -14);
      ctx.beginPath();
      ctx.moveTo(side * -0.03 * s, -0.062 * s);
      ctx.quadraticCurveTo(side * 0.062 * s, -0.072 * s, side * 0.126 * s, 0.002 * s);
      ctx.lineTo(side * 0.126 * s, 0.006 * s);
      ctx.quadraticCurveTo(side * 0.062 * s, -0.066 * s, side * -0.03 * s, -0.056 * s);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shade('#e6e0cc', 18);
      ctx.lineWidth = Math.max(1, s * 0.011);
      ctx.beginPath();
      ctx.moveTo(side * -0.028 * s, -0.102 * s);
      ctx.quadraticCurveTo(side * 0.068 * s, -0.128 * s, side * 0.13 * s, -0.048 * s);
      ctx.stroke();
    }
    // The bite: four fangs hanging off the jaw's lower edge, each a
    // fat-rooted hook curling in toward the arm — descending from the
    // hinge tooth to the front nipper, the way a real jaw is armed.
    const fangs: Array<[number, number, number, number]> = [
      // [rootX, rootY, length, halfW] — outward = +x, ×side.
      [0.108, -0.028, 0.088, 0.021],
      [0.072, -0.062, 0.075, 0.019],
      [0.036, -0.076, 0.062, 0.017],
      [0.002, -0.082, 0.05, 0.015],
    ];
    for (const [rx, ry, ln, hw2] of fangs) {
      ctx.fillStyle = bone;
      ctx.beginPath();
      ctx.moveTo(side * (rx - hw2) * s, ry * s);
      // The hook: tip drifts back INWARD — teeth close on a bite,
      // they never splay like a fan.
      ctx.quadraticCurveTo(
        side * (rx + hw2 * 1.15) * s, (ry + ln * 0.55) * s,
        side * (rx - hw2 * 0.35) * s, (ry + ln) * s,
      );
      ctx.quadraticCurveTo(side * (rx - hw2 * 0.4) * s, (ry + ln * 0.45) * s, side * (rx - hw2) * s, ry * s);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        // The root notch seats each fang IN the jaw, and the tip
        // keeps a worn point of light.
        ctx.fillStyle = shade('#e6e0cc', -26);
        ctx.fillRect(side * (rx - hw2 * 0.9) * s, (ry - 0.004) * s, hw2 * 1.5 * s, 0.01 * s);
        ctx.fillStyle = shade('#e6e0cc', 24);
        ctx.beginPath();
        ctx.arc(side * (rx - hw2 * 0.3) * s, (ry + ln * 0.92) * s, 0.006 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // The skull boss: a small carved watcher at the dome's crown.
    const bx0 = side * -0.052 * s;
    const by0 = -0.075 * s;
    const br = 0.035 * s;
    ctx.fillStyle = bone;
    ctx.beginPath();
    ctx.arc(bx0, by0, br, Math.PI * 0.92, Math.PI * 2.08);
    ctx.lineTo(bx0 + br * 0.62, by0 + br * 0.78);
    ctx.lineTo(bx0 - br * 0.62, by0 + br * 0.78);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // The carved brow shadow, the pits, the nasal notch.
      ctx.fillStyle = shade('#e6e0cc', -30);
      ctx.fillRect(bx0 - br * 0.68, by0 - br * 0.1, br * 1.36, br * 0.16);
      ctx.fillStyle = '#1c2418';
      for (const exx of [-br * 0.34, br * 0.34]) {
        ctx.fillRect(bx0 + exx - br * 0.2, by0 + br * 0.06, br * 0.4, br * 0.34);
      }
      ctx.fillRect(bx0 - br * 0.08, by0 + br * 0.5, br * 0.16, br * 0.22);
      // The watch answers: the boss's eyes wake on the skullgaze
      // clock, a half-beat behind the chest — fires down a wall.
      if (st.skullgaze) {
        const wake = Math.min(1, Math.max(0, (Math.sin(nowMs * 0.0007 + 1.1 + side * 0.7) + 0.55) * 1.6));
        if (wake > 0.05) {
          ctx.globalAlpha = wake * (0.8 + 0.14 * Math.sin(nowMs * 0.011 + side));
          ctx.fillStyle = shade(st.skullgaze.color, 20);
          for (const exx of [-br * 0.34, br * 0.34]) {
            ctx.fillRect(bx0 + exx - br * 0.13, by0 + br * 0.1, br * 0.26, br * 0.24);
          }
          ctx.globalAlpha = 1;
        }
      }
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'gonfalon') {
    // THE GONFALON, second forging — the oathgold shoulder as a full
    // WAR ASSEMBLY, not a dome with a flag. Reading order, inside
    // out: a quilted crimson arming pad the metal bites into; THREE
    // lapped fluted lames stepping down the arm, every step edged in
    // electrum with its own rivets (the gothic-plate stack the
    // reference boards live on); a coronet of forged points rising
    // off the top lame's crest — the crown worn a second time, at
    // the shoulder; the lance-spar socketed at the crest angling up
    // and OUT with an orb finial; the crimson gonfalon hanging FREE
    // from the spar — orphrey, fringe, woven crown device, march-wind
    // sway; and a jewelry chain swagged from spar tip back to the
    // crest, riding the same wind. The vow is CARRIED, in state.
    const gold = hurt ? '#ffffff' : (st.metal ?? shade(base, 20));
    const crim = hurt ? '#ffffff' : (st.tabard?.color ?? '#7e222c');
    // 1) THE ARMING PAD: quilted crimson peeking past every metal
    // edge — the garment the harness is buckled over. Its rim shows
    // under the bottom lame and behind the crest.
    ctx.fillStyle = hurt ? '#ffffff' : shade('#7e222c', -10);
    ctx.beginPath();
    ctx.ellipse(side * 0.01 * s, 0.012 * s, 0.135 * s, 0.115 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      // The pad's under-rim turns away from the sun: one flat deeper
      // crescent, no tick lines.
      ctx.fillStyle = shade('#7e222c', -22);
      ctx.beginPath();
      ctx.ellipse(side * 0.01 * s, 0.012 * s, 0.135 * s, 0.115 * s, 0, Math.PI * 0.15, Math.PI * 0.85);
      ctx.closePath();
      ctx.fill();
    }
    // 2) THE LAME STACK: three lapped plates stepping down-outboard,
    // each a curved band with a lit crown face, a shaded under-curl,
    // an electrum edge line, and paired rivets — plate that OVERLAPS,
    // the way real pauldrons articulate.
    for (let li = 2; li >= 0; li--) {
      const ly = (-0.062 + li * 0.05) * s;
      const lw2 = (0.128 - li * 0.008) * s;
      const lx = side * li * 0.016 * s;
      const drop = 0.052 * s;
      const capC = hurt ? '#ffffff' : shade(col, -li * 5);
      ctx.fillStyle = capC;
      ctx.beginPath();
      ctx.moveTo(lx - lw2, ly + drop * 0.4);
      ctx.quadraticCurveTo(lx - lw2 * 1.04, ly - drop * 0.5, lx - lw2 * 0.5, ly - drop * 0.9);
      ctx.quadraticCurveTo(lx, ly - drop * 1.14, lx + lw2 * 0.5, ly - drop * 0.9);
      ctx.quadraticCurveTo(lx + lw2 * 1.04, ly - drop * 0.5, lx + lw2, ly + drop * 0.4);
      ctx.quadraticCurveTo(lx, ly + drop * 0.85, lx - lw2, ly + drop * 0.4);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        // The lit crown plane of each lame (2.5D top-plane law).
        ctx.fillStyle = shade(col, 15 - li * 5);
        ctx.beginPath();
        ctx.ellipse(lx, ly - drop * 0.42, lw2 * 0.58, drop * 0.36, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        // The panel break: one flat darker strip per lame — a seam
        // where two planes meet, never a lit/turned line pair.
        ctx.fillStyle = shade(col, -12);
        for (const u of [-0.4, 0.2]) {
          ctx.fillRect(lx + u * lw2, ly - drop * 0.5, lw2 * 0.08, drop * 1.0);
        }
        // The electrum edge: a flat band following the lame's hem.
        ctx.fillStyle = trim;
        ctx.beginPath();
        ctx.moveTo(lx - lw2, ly + drop * 0.32);
        ctx.quadraticCurveTo(lx, ly + drop * 0.77, lx + lw2, ly + drop * 0.32);
        ctx.lineTo(lx + lw2, ly + drop * 0.4);
        ctx.quadraticCurveTo(lx, ly + drop * 0.85, lx - lw2, ly + drop * 0.4);
        ctx.closePath();
        ctx.fill();
        // Paired rivets seating the lap.
        ctx.fillStyle = shade(gold, 26);
        for (const es of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(lx + es * lw2 * 0.82, ly + drop * 0.34, 0.0085 * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // 3) THE CORONET: four forged points rising off the top lame's
    // crest, rank ascending toward the spar socket — the crown said
    // again at the shoulder. Two-facet blades, seated in dark root
    // collars so nothing floats.
    const crestY = -0.108 * s;
    for (const [u, ph] of [[-0.062, 0.052], [-0.014, 0.068], [0.034, 0.085], [0.082, 0.104]] as const) {
      const px2 = side * u * s;
      const pw2 = 0.017 * s;
      const tipY = crestY - ph * s;
      if (!hurt) {
        ctx.fillStyle = shade(base, -26);
        ctx.fillRect(px2 - pw2 * 1.1, crestY - 0.008 * s, pw2 * 2.2, 0.016 * s);
      }
      ctx.fillStyle = hurt ? '#ffffff' : trim;
      ctx.beginPath();
      ctx.moveTo(px2 - pw2, crestY);
      ctx.lineTo(px2 - pw2 * 0.1, tipY);
      ctx.lineTo(px2 + pw2, crestY);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = shade(trim, -20);
        ctx.beginPath();
        ctx.moveTo(px2 - pw2 * 0.1, tipY);
        ctx.lineTo(px2 + pw2, crestY);
        ctx.lineTo(px2 + pw2 * 0.25, crestY);
        ctx.closePath();
        ctx.fill();
      }
    }
    // 4) THE SPAR: the lance socketed at the crest's high end,
    // angling up and OUT — a forged taper with a bright west edge
    // and the orb finial the warcrown's outer points answer.
    const sx0 = side * 0.096 * s;
    const sy0 = -0.096 * s;
    const sx1 = side * 0.186 * s;
    const sy1 = -0.196 * s;
    if (!hurt) {
      ctx.fillStyle = shade(base, -26);
      ctx.beginPath();
      ctx.ellipse(sx0, sy0 + 0.01 * s, 0.02 * s, 0.014 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = hurt ? '#ffffff' : shade(gold, -10);
    ctx.lineWidth = Math.max(1.5, s * 0.02);
    ctx.beginPath();
    ctx.moveTo(sx0, sy0);
    ctx.lineTo(sx1, sy1);
    ctx.stroke();
    ctx.fillStyle = hurt ? '#ffffff' : gold;
    ctx.beginPath();
    ctx.arc(sx1, sy1, 0.017 * s, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = shade(gold, -18);
      ctx.beginPath();
      ctx.arc(sx1, sy1, 0.017 * s, Math.PI * 0.15, Math.PI * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(gold, 36);
      ctx.beginPath();
      ctx.arc(sx1 - 0.006 * s, sy1 - 0.006 * s, 0.0055 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    // 5) THE GONFALON: hung from the spar on two sewn sleeve loops,
    // falling FREE down the outer slope past the lame stack — the
    // hoist rides the spar's angle, gravity owns the fall, the march
    // wind owns the hem. Swallow-tailed, orphreyed, fringed, and
    // carrying the woven crown device that kindles on the vigil.
    const sway = Math.sin(nowMs * 0.0016 + side * 1.9) * 0.013 * s;
    const hx0 = side * 0.108 * s;
    const hy0 = -0.108 * s;
    const hx1 = side * 0.178 * s;
    const hy1 = -0.186 * s;
    const gBot = 0.16 * s;
    const gInX = side * 0.062 * s;
    const gMid = (hx0 + hx1) / 2 + sway * side * 0.3;
    ctx.fillStyle = crim;
    ctx.beginPath();
    ctx.moveTo(hx0, hy0);
    ctx.lineTo(hx1, hy1);
    // The outer edge falls from the spar tip, bellying on the wind.
    ctx.quadraticCurveTo(hx1 + sway * side * 0.6, -0.02 * s, hx1 + sway * side, gBot - 0.02 * s);
    // Two swallow tails with the notch rising between.
    ctx.lineTo(gMid + sway * side * 0.8, gBot - 0.058 * s);
    ctx.lineTo(gMid + sway * side * 0.65, gBot + 0.004 * s);
    ctx.lineTo(gInX + sway * side * 0.5, gBot - 0.05 * s);
    ctx.lineTo(gInX + sway * side * 0.4, gBot + 0.01 * s);
    // The inner edge climbs back to the hoist's low corner.
    ctx.quadraticCurveTo(gInX, -0.02 * s, hx0, hy0);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // The field turns from the one sun: outer half a step deeper.
      ctx.fillStyle = shade(crim, -14);
      ctx.beginPath();
      ctx.moveTo((hx0 + hx1) / 2, (hy0 + hy1) / 2);
      ctx.lineTo(hx1, hy1);
      ctx.quadraticCurveTo(hx1 + sway * side * 0.6, -0.02 * s, hx1 + sway * side, gBot - 0.02 * s);
      ctx.lineTo(gMid + sway * side * 0.8, gBot - 0.058 * s);
      ctx.lineTo(gMid + sway * side * 0.65, gBot + 0.004 * s);
      ctx.quadraticCurveTo(gMid, 0, (hx0 + hx1) / 2, (hy0 + hy1) / 2);
      ctx.closePath();
      ctx.fill();
      // Sleeve loops sewn over the spar.
      ctx.fillStyle = shade(crim, -22);
      for (const u of [0.22, 0.7]) {
        const tx = hx0 + (hx1 - hx0) * u;
        const ty = hy0 + (hy1 - hy0) * u;
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(side * -0.83);
        ctx.fillRect(-0.011 * s, -0.016 * s, 0.022 * s, 0.032 * s);
        ctx.restore();
      }
      // The orphrey: electrum thread down both long edges.
      ctx.strokeStyle = trim;
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(hx1 - side * 0.006 * s, hy1 + 0.012 * s);
      ctx.quadraticCurveTo(hx1 + sway * side * 0.6 - side * 0.006 * s, -0.02 * s, hx1 + sway * side - side * 0.006 * s, gBot - 0.024 * s);
      ctx.moveTo(hx0 - side * 0.002 * s, hy0 + 0.012 * s);
      ctx.quadraticCurveTo(gInX + side * 0.004 * s, -0.02 * s, gInX + sway * side * 0.4 + side * 0.004 * s, gBot + 0.004 * s);
      ctx.stroke();
      // Gold fringe off both tails: flat hanging tabs on the wind.
      ctx.fillStyle = shade(gold, 14);
      for (const [tx, ty] of [
        [gInX + sway * side * 0.4, gBot + 0.01 * s],
        [gMid + sway * side * 0.65, gBot + 0.004 * s],
        [hx1 + sway * side, gBot - 0.02 * s],
      ] as const) {
        ctx.beginPath();
        ctx.moveTo(tx - 0.009 * s, ty);
        ctx.lineTo(tx + 0.009 * s, ty);
        ctx.lineTo(tx + 0.003 * s + sway * 0.6, ty + 0.019 * s);
        ctx.lineTo(tx - 0.003 * s + sway * 0.6, ty + 0.019 * s);
        ctx.closePath();
        ctx.fill();
      }
      // The crown device, woven mid-field — thread, two values.
      const dx = gMid;
      const dy = 0.02 * s;
      const dw = 0.044 * s;
      ctx.fillStyle = shade(gold, -10);
      ctx.fillRect(dx - dw / 2, dy, dw, 0.013 * s);
      ctx.beginPath();
      for (const u of [-0.34, 0, 0.34]) {
        const px3 = dx + u * dw;
        ctx.moveTo(px3 - dw * 0.14, dy);
        ctx.lineTo(px3, dy - 0.023 * s * (u === 0 ? 1.25 : 1));
        ctx.lineTo(px3 + dw * 0.14, dy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(gold, 16);
      ctx.fillRect(dx - dw / 2, dy, dw, 0.005 * s);
      // THE VIGIL: this station's turn in the rotation — the woven
      // crown kindles, holds, and hands the light on (left banner,
      // right banner, then the helm's own fire).
      if (st.vigil) {
        const station = side < 0 ? 0 : 1;
        const wake = Math.max(0, Math.sin(nowMs * 0.0009 + station * 2.094) - 0.45) / 0.55;
        if (wake > 0.04) {
          const vc = st.vigil.color;
          ctx.globalAlpha = wake * 0.36;
          ctx.fillStyle = vc;
          ctx.beginPath();
          ctx.ellipse(dx, dy - 0.006 * s, dw * 0.9, 0.032 * s, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = wake * (0.75 + 0.2 * Math.sin(nowMs * 0.012 + station));
          ctx.fillStyle = shade(vc, 22);
          ctx.fillRect(dx - dw / 2, dy, dw, 0.011 * s);
          ctx.beginPath();
          for (const u of [-0.34, 0, 0.34]) {
            const px3 = dx + u * dw;
            ctx.moveTo(px3 - dw * 0.12, dy);
            ctx.lineTo(px3, dy - 0.021 * s * (u === 0 ? 1.25 : 1));
            ctx.lineTo(px3 + dw * 0.12, dy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      // 6) THE CHAIN SWAG: fine gold links draped from the spar's
      // orb back to the coronet's low point, sagging on the same
      // wind the banner rides — jewelry ON the war gear, the detail
      // that says someone dresses this knight for the field.
      const c0x = sx1;
      const c0y = sy1 + 0.012 * s;
      const c1x = side * -0.05 * s;
      const c1y = crestY - 0.045 * s;
      ctx.fillStyle = shade(gold, 22);
      for (let ci = 1; ci <= 6; ci++) {
        const t = ci / 7;
        const chx = c0x + (c1x - c0x) * t;
        const chy = c0y + (c1y - c0y) * t + Math.sin(Math.PI * t) * (0.03 * s + sway * 0.35);
        ctx.beginPath();
        ctx.arc(chx, chy, 0.0058 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'gateshard') {
    // THE GATESHARD — the gatefall shoulder: a broken arch worn as a
    // war cap. The riftgate came down and somebody forged the fall.
    // Reading order, inside out: the WORN SEAT in the gate's own
    // quarried granite (glass is luminous; the socket it grows from
    // stays stone); two night-glass VOUSSOIR slabs springing off the
    // dome, inboard and outboard, each leaning toward a crown that is
    // not there — beveled top planes (2.5D law), fracture seams down
    // the faces, and THE ONE BRIGHT EDGE up every leading curve, or
    // dark glass on dark plate reads as shadow; a snapped SPLINTER
    // stub low on the outer slope where the third stone sheared; and
    // THE BREACH in the gap: this shoulder's station on the slow
    // rotation — otherlight blooming between the broken tips, glass
    // motes drifting UP out of the light. The arch never closes. It
    // remembers trying.
    const glass = hurt ? '#ffffff' : col;
    const stone = hurt ? '#ffffff' : (st.metal ?? shade(base, -30));
    // 1) THE SEAT: granite, riveted — the masonry the glass bites.
    seat(0.118 * s, 0.092 * s, hurt ? '#ffffff' : shade(stone, near ? 4 : -8), trim);
    if (!hurt) {
      // Quarry rivets on the dome hem: the smith's hand on the stone.
      ctx.fillStyle = shade(stone, 26);
      for (const u of [-0.55, 0, 0.55]) {
        ctx.beginPath();
        ctx.arc(u * 0.085 * s, 0.062 * s, 0.0075 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // 2) THE SPRINGING: two broad glass voussoirs off the dome, the
    // outboard stone taller (the silhouette peeks OUTBOARD, never up
    // into the face), both curving in over the crown of the dome and
    // stopping short. Each is a slab, not a spike: main face, lit
    // top-plane bevel where the break runs, a fracture seam, and the
    // bright leading edge.
    interface Slab {
      rx: number; ry: number; tx: number; ty: number;
      w: number; lean: number;
    }
    const slabs: Slab[] = [
      // outboard voussoir: roots at the dome's outer slope and leans
      // OUTBOARD — the silhouette peeks past the back edge, never up
      // into the face. The head keeps the highest gold.
      { rx: 0.075, ry: 0.012, tx: 0.108, ty: -0.182, w: 0.06, lean: 0.28 },
      // inboard stump: the arch's other springing, snapped LOW — a
      // broken tooth leaning away from the neck. The two break faces
      // frame THE GAP over the dome's crown.
      { rx: -0.052, ry: 0.008, tx: -0.072, ty: -0.108, w: 0.046, lean: -0.22 },
    ];
    for (let i = slabs.length - 1; i >= 0; i--) {
      const sl = slabs[i]!;
      const rx = side * sl.rx * s;
      const ry = sl.ry * s;
      const tx = side * sl.tx * s;
      const ty = sl.ty * s;
      const w = sl.w * s;
      const lean = side * sl.lean;
      // The slab's long axis, and its width normal.
      const ax = tx - rx;
      const ay = ty - ry;
      const al = Math.hypot(ax, ay);
      const nx = (-ay / al) * w * 0.5;
      const ny = (ax / al) * w * 0.5;
      // The BROKEN top: the tip is not a point but a sheared step —
      // a short angled break face with a bitten notch.
      const bx = tx + nx * 0.55 - ax * 0.06;
      const by = ty + ny * 0.55 - ay * 0.06;
      ctx.fillStyle = hurt ? '#ffffff' : shade(glass, (near ? 6 : -6) - i * 10);
      ctx.beginPath();
      ctx.moveTo(rx - nx, ry - ny);
      // Leading (outer) edge bows with the lean — an arch springing.
      ctx.quadraticCurveTo(
        rx - nx + ax * 0.5 + lean * w, ry - ny + ay * 0.5,
        tx - nx * 0.72, ty - ny * 0.72,
      );
      // The shear: down-step, notch, up to the inner break corner.
      ctx.lineTo(tx - nx * 0.1 - ax * 0.03, ty - ny * 0.1 - ay * 0.03);
      ctx.lineTo(bx, by);
      // Trailing edge falls straighter back to the root.
      ctx.quadraticCurveTo(
        rx + nx + ax * 0.45 - lean * w * 0.4, ry + ny + ay * 0.45,
        rx + nx, ry + ny,
      );
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        // The break's top plane catches the sun — snapped stone shows
        // its section (the 2.5D top-plane law at shoulder scale).
        ctx.fillStyle = shade(glass, 18 - i * 6);
        ctx.beginPath();
        ctx.moveTo(tx - nx * 0.72, ty - ny * 0.72);
        ctx.lineTo(tx - nx * 0.1 - ax * 0.03, ty - ny * 0.1 - ay * 0.03);
        ctx.lineTo(bx, by);
        ctx.lineTo(tx - nx * 0.35 - ax * 0.1, ty - ny * 0.35 - ay * 0.1);
        ctx.closePath();
        ctx.fill();
        // The fracture seam: one dark crack wandering down the face.
        ctx.strokeStyle = shade(glass, -26);
        ctx.lineWidth = Math.max(1, s * 0.009);
        ctx.beginPath();
        ctx.moveTo(tx - nx * 0.2, ty - ny * 0.2);
        ctx.lineTo(rx + ax * 0.55 + nx * 0.15, ry + ay * 0.55 + ny * 0.15);
        ctx.lineTo(rx + ax * 0.3 - nx * 0.2, ry + ay * 0.3 - ny * 0.2);
        ctx.stroke();
        // THE ONE BRIGHT EDGE up the leading curve.
        ctx.strokeStyle = trim;
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(rx - nx, ry - ny);
        ctx.quadraticCurveTo(
          rx - nx + ax * 0.5 + lean * w, ry - ny + ay * 0.5,
          tx - nx * 0.72, ty - ny * 0.72,
        );
        ctx.stroke();
      }
    }
    // 3) THE SPLINTER: the third stone sheared at the root — a short
    // stub on the outer slope, break face up, all that held on.
    const spx = side * 0.118 * s;
    const spy = 0.005 * s;
    ctx.fillStyle = hurt ? '#ffffff' : shade(glass, -14);
    ctx.beginPath();
    ctx.moveTo(spx - side * 0.02 * s, spy);
    ctx.lineTo(spx - side * 0.004 * s, spy - 0.05 * s);
    ctx.lineTo(spx + side * 0.016 * s, spy - 0.036 * s);
    ctx.lineTo(spx + side * 0.026 * s, spy + 0.012 * s);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = shade(glass, 12);
      ctx.beginPath();
      ctx.moveTo(spx - side * 0.004 * s, spy - 0.05 * s);
      ctx.lineTo(spx + side * 0.016 * s, spy - 0.036 * s);
      ctx.lineTo(spx + side * 0.006 * s, spy - 0.028 * s);
      ctx.closePath();
      ctx.fill();
      // 4) THE BREACH, this shoulder's station: otherlight blooming
      // in the gap between the broken tips — left arch first, then
      // the chest, then this side, then the crown. A pilot ember
      // holds even between turns: the door never quite gives up.
      if (st.breach) {
        const bc = st.breach.color;
        const station = side < 0 ? 0 : 2;
        const wake = Math.max(0, Math.sin(nowMs * 0.0009 + station * 1.5708) - 0.45) / 0.55;
        const gx = side * 0.02 * s;
        const gy = -0.138 * s;
        // The pilot: a slim standing seam of light in the gap — a
        // crack in the world, never an orb (the orbs word is owned).
        ctx.globalAlpha = 0.2 + wake * 0.32;
        ctx.fillStyle = bc;
        ctx.beginPath();
        ctx.ellipse(gx, gy, 0.016 * s + wake * 0.01 * s, 0.046 * s + wake * 0.02 * s, side * 0.2, 0, Math.PI * 2);
        ctx.fill();
        if (wake > 0.04) {
          // The bloom: a jagged bright crack standing in the gap,
          // and the broken tips catching its light.
          ctx.globalAlpha = Math.min(1, wake * 1.05);
          ctx.strokeStyle = shade(bc, 34);
          ctx.lineWidth = Math.max(1, s * 0.012);
          ctx.beginPath();
          ctx.moveTo(gx + side * 0.006 * s, gy - 0.052 * s);
          ctx.lineTo(gx - side * 0.008 * s, gy - 0.014 * s);
          ctx.lineTo(gx + side * 0.008 * s, gy + 0.01 * s);
          ctx.lineTo(gx - side * 0.004 * s, gy + 0.05 * s);
          ctx.stroke();
          ctx.globalAlpha = wake * 0.8;
          ctx.strokeStyle = shade(bc, 26);
          ctx.lineWidth = Math.max(1, s * 0.011);
          ctx.beginPath();
          ctx.moveTo(side * 0.082 * s, -0.164 * s);
          ctx.lineTo(side * 0.06 * s, -0.14 * s);
          ctx.moveTo(side * -0.062 * s, -0.1 * s);
          ctx.lineTo(side * -0.04 * s, -0.118 * s);
          ctx.stroke();
          // Glass motes drifting UP out of the light and fading —
          // the far side's gravity, leaking through the gap.
          for (let mi = 0; mi < 2; mi++) {
            const ph = nowMs * 0.00062 + mi * 0.53 + station;
            const cyc = ph - Math.floor(ph);
            const ma = Math.sin(cyc * Math.PI) * wake;
            if (ma <= 0.06) continue;
            const mx = gx + Math.sin(cyc * 4.2 + mi * 2.1) * 0.016 * s;
            const my = gy - 0.02 * s - cyc * 0.085 * s;
            const mr = (0.011 - cyc * 0.004) * s;
            ctx.globalAlpha = ma * 0.9;
            ctx.fillStyle = shade(bc, 30);
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
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'rampart') {
    // THE RAMPART — the redmarch shoulder: the wall itself, worn.
    // A crenellated parapet crowns the blackened seat dome — three
    // merlons cut square against the sky with ember watch-light
    // breathing in the embrasures between them, the same rotation the
    // chest rosettes keep — and the legion's crimson cross-banner
    // hangs down the outer slope, pinned under the coping stone.
    // CLOTH HANGS, IT NEVER PLANES; the parapet stands ON the dome.
    // The old pavise slab floated beside the head like a framed
    // heraldic card; a wall must be MASONRY over the shoulder.
    // THE WORN SEAT first: blackened iron, steel-hemmed.
    seat(0.126 * s, 0.098 * s, hurt ? '#ffffff' : col, trim);
    // The banner: legion crimson hung from under the parapet's outer
    // half, swaying only at the hem — the top is pinned stone-fast.
    const bx0 = side * 0.022 * s;
    const bx1 = side * 0.122 * s;
    const bTop = -0.058 * s;
    const bBot = 0.118 * s;
    const sway = Math.sin(nowMs * 0.0017 + side * 2.1) * 0.011 * s;
    if (!hurt) {
      ctx.fillStyle = '#8e262d';
      ctx.beginPath();
      ctx.moveTo(bx0, bTop);
      ctx.lineTo(bx1, bTop);
      ctx.lineTo(bx1 + sway * side * 0.4, bBot - 0.012 * s);
      // The swallow-tail hem, drifting on the march wind.
      ctx.lineTo((bx0 + bx1) / 2 + sway * side, bBot - 0.036 * s);
      ctx.lineTo(bx0 + sway * side * 0.7, bBot);
      ctx.closePath();
      ctx.fill();
      // The field turns from the one sun: outer half a step deeper.
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(bx0, bTop);
      ctx.lineTo(bx1, bTop);
      ctx.lineTo(bx1 + sway * side * 0.4, bBot - 0.012 * s);
      ctx.lineTo((bx0 + bx1) / 2 + sway * side, bBot - 0.036 * s);
      ctx.lineTo(bx0 + sway * side * 0.7, bBot);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = 'rgba(24, 12, 16, 0.22)';
      const mid = (bx0 + bx1) / 2;
      ctx.fillRect(side > 0 ? mid : bx0 - 0.02 * s, bTop, Math.abs(bx1 - bx0) * 0.62 + 0.02 * s, bBot - bTop);
      // The weathered cross, small and true, on the upper field.
      ctx.fillStyle = '#e6dccc';
      const cxB = mid;
      const cyB = -0.002 * s;
      ctx.fillRect(cxB - 0.01 * s, cyB - 0.044 * s, 0.02 * s, 0.084 * s);
      ctx.fillRect(cxB - 0.028 * s, cyB - 0.008 * s, 0.056 * s, 0.02 * s);
      ctx.restore();
      // The hem's cast shadow keeps the cloth OFF the dome.
      ctx.fillStyle = 'rgba(20, 12, 16, 0.24)';
      ctx.beginPath();
      ctx.ellipse((bx0 + bx1) / 2, bBot + 0.006 * s, 0.045 * s, 0.014 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // The parapet: a coping band across the dome's crown carrying
    // three square merlons — the silhouette that says WALL at any
    // size. Ember light breathes in the two embrasures, offset per
    // shoulder so the caps answer each other like the chest fires.
    const bandW = 0.118 * s;
    const bandY = -0.072 * s;
    const bandH = 0.044 * s;
    const iron = hurt ? '#ffffff' : col;
    const ironDeep = hurt ? '#ffffff' : shade(col, -18);
    // The embrasure glow first — fire BEHIND the teeth line.
    if (!hurt) {
      const beat = 0.5 + 0.5 * Math.sin(nowMs * 0.0037 + (side > 0 ? 0 : Math.PI * 0.85));
      ctx.globalAlpha = 0.35 + 0.55 * beat;
      ctx.fillStyle = '#ffb060';
      for (const gx of [-bandW * 0.36, bandW * 0.36]) {
        ctx.beginPath();
        ctx.ellipse(gx, bandY - 0.016 * s, 0.026 * s, 0.022 * s + beat * 0.009 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // The coping band, riveted at its stations.
    ctx.fillStyle = iron;
    ctx.fillRect(-bandW, bandY, bandW * 2, bandH);
    ctx.fillStyle = ironDeep;
    ctx.fillRect(-bandW, bandY + bandH * 0.62, bandW * 2, bandH * 0.38);
    if (!hurt) {
      for (const rx of [-bandW * 0.7, 0, bandW * 0.7]) {
        ctx.fillStyle = shade(trim, -26);
        ctx.fillRect(rx - 0.006 * s, bandY + bandH * 0.3, 0.012 * s, 0.012 * s);
        ctx.fillStyle = shade(trim, 14);
        ctx.fillRect(rx - 0.006 * s, bandY + bandH * 0.3, 0.006 * s, 0.006 * s);
      }
    }
    // The merlons: three teeth, the center a whisper taller, each
    // wearing its lit coping — the 2.5D top plane in one stroke.
    const mw = 0.052 * s;
    for (const [mx, mh] of [
      [-bandW * 0.74, 0.056 * s],
      [0, 0.068 * s],
      [bandW * 0.74, 0.056 * s],
    ] as const) {
      ctx.fillStyle = iron;
      ctx.fillRect(mx - mw / 2, bandY - mh, mw, mh);
      // The screen-right face turns from the sun.
      if (!hurt) {
        ctx.fillStyle = 'rgba(24, 15, 26, 0.2)';
        ctx.fillRect(mx + mw * 0.14, bandY - mh, mw * 0.36, mh);
        // Steel coping caps every tooth — THE ONE BRIGHT EDGE: dark
        // masonry against a dark helm is no battlement at all.
        ctx.fillStyle = shade(trim, 4);
        ctx.fillRect(mx - mw / 2, bandY - mh, mw, 0.012 * s);
      }
    }
    // The steel hem under the band roots the parapet to the dome.
    ctx.fillStyle = hurt ? '#ffffff' : shade(trim, -8);
    ctx.fillRect(-bandW, bandY + bandH, bandW * 2, 0.008 * s);
    ctx.restore();
    return;
  }
  if (st.pauldron === 'shards') {
    // Night-glass slivers in orbit where an orb would hang — angular
    // where the orb is serene, each pane tilted like it was broken
    // off something larger. Same outward-offset law as the orbs: the
    // head paints after the pauldrons.
    const bob = Math.sin(nowMs * 0.0019 + side * 1.7) * 0.012 * s;
    const ox = side * 0.145 * s;
    const oy = -0.1 * s + bob;
    const glint = st.pauldronTrim ?? shade(base, 55);
    const pane = (px: number, py: number, w: number, h: number, tilt: number) => {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(tilt * side);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, -h);
      ctx.lineTo(w, 0);
      ctx.lineTo(0, h);
      ctx.lineTo(-w * 0.55, 0);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        // The ONE bright thing: a hard lit edge down the leading face.
        ctx.strokeStyle = glint;
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.92);
        ctx.lineTo(w * 0.92, 0);
        ctx.stroke();
      }
      ctx.restore();
    };
    pane(ox, oy, 0.052 * s, 0.085 * s, 0.28);
    pane(ox + side * 0.055 * s, oy + 0.055 * s + bob * 0.4, 0.032 * s, 0.05 * s, -0.35);
    ctx.restore();
    return;
  }
  if (st.pauldron === 'sharkfin') {
    // THE SHARKFIN — the icon itself: ONE solid dorsal fin standing
    // off the seat dome, raked, notch-bitten at the trailing edge
    // (a fin that has survived things), pale belly counter-plane,
    // denticle tick row at the base. No spray, no fan: everyone on
    // earth knows this silhouette in silhouette.
    seat(0.12 * s, 0.09 * s, shade(base, -10), shade(base, 6));
    const belly = st.pauldronTrim ?? shade(base, 30);
    ctx.fillStyle = hurt ? '#ffffff' : shade(base, -4);
    ctx.beginPath();
    ctx.moveTo(side * -0.055 * s, -0.04 * s);
    ctx.quadraticCurveTo(side * 0.01 * s, -0.2 * s, side * 0.075 * s, -0.21 * s);
    // Raked trailing edge with THE BITE: a half-moon notch.
    ctx.lineTo(side * 0.15 * s, -0.1 * s);
    ctx.lineTo(side * 0.115 * s, -0.085 * s);
    ctx.lineTo(side * 0.145 * s, -0.045 * s);
    ctx.lineTo(side * 0.09 * s, 0.045 * s);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // The belly counter-plane on the leading face.
      ctx.fillStyle = belly;
      ctx.beginPath();
      ctx.moveTo(side * -0.045 * s, -0.035 * s);
      ctx.quadraticCurveTo(side * 0.005 * s, -0.16 * s, side * 0.06 * s, -0.175 * s);
      ctx.lineTo(side * 0.052 * s, -0.11 * s);
      ctx.quadraticCurveTo(side * 0.015 * s, -0.07 * s, side * 0.005 * s, -0.02 * s);
      ctx.closePath();
      ctx.fill();
      // Denticle ticks along the fin base — skin, not lacquer.
      ctx.strokeStyle = shade(base, -22);
      ctx.lineWidth = Math.max(1, s * 0.009);
      for (let i = 0; i < 4; i++) {
        const bx = side * (-0.03 + i * 0.032) * s;
        ctx.beginPath();
        ctx.moveTo(bx, 0.02 * s);
        ctx.lineTo(bx + side * 0.012 * s, 0.038 * s);
        ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'escalight') {
    // THE ESCALIGHT — the deep angler's shoulder: a dark chitin
    // socket plate sprouting three curved barbels, each tipped with
    // a tiny warm light breathing on the deep's clock, staggered so
    // the shoulder never blinks in unison with itself. Bait at every
    // altitude.
    seat(0.115 * s, 0.088 * s, shade(base, -14), shade(base, 2));
    const glow = st.hookline?.lure ?? '#ffb054';
    if (!hurt) {
      // The chitin plate: one angular scute over the dome crown.
      ctx.fillStyle = shade(base, -24);
      ctx.beginPath();
      ctx.moveTo(side * -0.07 * s, -0.045 * s);
      ctx.lineTo(side * 0.01 * s, -0.075 * s);
      ctx.lineTo(side * 0.08 * s, -0.04 * s);
      ctx.lineTo(side * 0.055 * s, 0.02 * s);
      ctx.lineTo(side * -0.045 * s, 0.015 * s);
      ctx.closePath();
      ctx.fill();
      // Three barbels arcing up-out, staggered phases.
      ctx.strokeStyle = shade(base, -30);
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const ph = i * 2.1;
        const breathe = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(nowMs * 0.0024 + ph));
        const bx = side * (-0.02 + i * 0.035) * s;
        const by = (-0.06 + i * 0.008) * s;
        const txx = bx + side * (0.05 + i * 0.02) * s;
        const tyy = by - (0.1 - i * 0.018) * s;
        ctx.lineWidth = Math.max(1, s * 0.011);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + side * 0.01 * s, by - 0.07 * s, txx, tyy);
        ctx.stroke();
        ctx.globalAlpha = 0.4 * breathe;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(txx, tyy, 0.032 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = Math.min(1, 0.55 + 0.45 * breathe);
        ctx.fillStyle = shade(glow, 34);
        ctx.beginPath();
        ctx.arc(txx, tyy, 0.012 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.lineCap = 'butt';
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'krakengrip') {
    // THE KRAKENGRIP — a tentacle owns the shoulder: rooted behind
    // the seat, coiling OVER the dome in one thick wrap, the free
    // tip curling up past the crown; paired sucker dots walk the
    // inner face. Not worn — HELD.
    seat(0.115 * s, 0.088 * s, shade(base, -12), shade(base, 4));
    const arm = st.pauldronTrim ? shade(base, 8) : shade(base, 6);
    const sucker = st.pauldronTrim ?? shade(base, 34);
    if (!hurt) {
      // The wrap: a fat tapered band lying across the dome.
      ctx.fillStyle = arm;
      ctx.beginPath();
      ctx.moveTo(side * -0.115 * s, 0.01 * s);
      ctx.quadraticCurveTo(side * -0.02 * s, -0.075 * s, side * 0.095 * s, -0.03 * s);
      ctx.lineTo(side * 0.1 * s, 0.015 * s);
      ctx.quadraticCurveTo(side * -0.01 * s, -0.028 * s, side * -0.1 * s, 0.05 * s);
      ctx.closePath();
      ctx.fill();
      // The free tip: rises off the outboard end and CURLS.
      ctx.fillStyle = shade(base, 12);
      ctx.beginPath();
      ctx.moveTo(side * 0.085 * s, -0.02 * s);
      ctx.quadraticCurveTo(side * 0.15 * s, -0.06 * s, side * 0.135 * s, -0.125 * s);
      ctx.quadraticCurveTo(side * 0.125 * s, -0.165 * s, side * 0.085 * s, -0.155 * s);
      ctx.quadraticCurveTo(side * 0.105 * s, -0.14 * s, side * 0.104 * s, -0.115 * s);
      ctx.quadraticCurveTo(side * 0.105 * s, -0.05 * s, side * 0.06 * s, -0.005 * s);
      ctx.closePath();
      ctx.fill();
      // Paired suckers walking the wrap's inner face.
      ctx.fillStyle = sucker;
      for (let i = 0; i < 4; i++) {
        const uu = -0.07 + i * 0.05;
        for (const o of [-0.011, 0.011]) {
          ctx.beginPath();
          ctx.arc(side * uu * s + o * s * 0.4, (0.006 + o) * s - uu * uu * 8 * s * 0.02, Math.max(1, 0.008 * s), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Two suckers up the free tip.
      for (const [ux, uy] of [[0.118, -0.07], [0.122, -0.105]] as const) {
        ctx.beginPath();
        ctx.arc(side * ux * s, uy * s, Math.max(1, 0.007 * s), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'sailfan') {
    // THE SAILFAN — the marlin's shoulder: a ribbed sail raked hard
    // back, four counter-metal spines under teal membrane planes,
    // folded at rest (never spread), the lead spine bright. The
    // strike, holstered.
    seat(0.115 * s, 0.088 * s, shade(base, -8), shade(base, 8));
    const mem = shade(base, -14);
    const spine = st.pauldronTrim ?? shade(base, 30);
    ctx.fillStyle = hurt ? '#ffffff' : mem;
    ctx.beginPath();
    ctx.moveTo(side * -0.03 * s, -0.055 * s);
    ctx.lineTo(side * 0.065 * s, -0.155 * s);
    ctx.lineTo(side * 0.125 * s, -0.12 * s);
    ctx.lineTo(side * 0.165 * s, -0.05 * s);
    ctx.lineTo(side * 0.155 * s, 0.03 * s);
    // Notched return: membrane bays between spine tips.
    ctx.lineTo(side * 0.115 * s, 0.005 * s);
    ctx.lineTo(side * 0.1 * s, 0.05 * s);
    ctx.lineTo(side * 0.045 * s, 0.02 * s);
    ctx.lineTo(side * 0.005 * s, 0.055 * s);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      const tips: Array<[number, number, number]> = [
        [0.065, -0.155, 1], [0.125, -0.12, 0], [0.165, -0.05, 0], [0.155, 0.03, 0],
      ];
      for (const [txx, tyy, lit] of tips) {
        ctx.strokeStyle = lit ? shade(spine, 16) : spine;
        ctx.lineWidth = Math.max(1, s * (lit ? 0.015 : 0.011));
        ctx.beginPath();
        ctx.moveTo(side * -0.025 * s, -0.045 * s);
        ctx.lineTo(side * txx * s, tyy * s);
        ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'shadowdrape') {
    // THE SHADOWDRAPE — the guildmaster's shoulders, ASYMMETRIC: the
    // off shoulder carries a layered half-mantle falling in notched
    // points under a brass clasp; the blade arm wears nothing but
    // crossed straps — the asymmetry IS the statement. A master
    // keeps one shoulder for the guild and one for the work.
    if (side > 0) {
      seat(0.12 * s, 0.088 * s, shade(base, -8), shade(base, 6));
      if (!hurt) {
        // Deepest tier first: the long fall, past the elbow line.
        ctx.fillStyle = shade(base, -32);
        ctx.beginPath();
        ctx.moveTo(-0.085 * s, 0.05 * s);
        ctx.lineTo(0.09 * s, 0.04 * s);
        ctx.lineTo(0.06 * s, 0.225 * s);
        ctx.lineTo(0.02 * s, 0.155 * s);
        ctx.lineTo(-0.03 * s, 0.24 * s);
        ctx.lineTo(-0.062 * s, 0.145 * s);
        ctx.closePath();
        ctx.fill();
        // Middle tier: deeper, longer, two points.
        ctx.fillStyle = shade(base, -20);
        ctx.beginPath();
        ctx.moveTo(-0.095 * s, 0.015 * s);
        ctx.lineTo(0.102 * s, 0.005 * s);
        ctx.lineTo(0.08 * s, 0.17 * s);
        ctx.lineTo(0.038 * s, 0.11 * s);
        ctx.lineTo(-0.018 * s, 0.185 * s);
        ctx.lineTo(-0.06 * s, 0.105 * s);
        ctx.closePath();
        ctx.fill();
      }
      // Upper panel: the mantle proper, three raked points — cloth
      // with WEIGHT (the windmantle lesson: bold points, never trim),
      // each tier a full value step so THREE layers read at distance.
      ctx.fillStyle = hurt ? '#ffffff' : shade(base, 12);
      ctx.beginPath();
      ctx.moveTo(-0.105 * s, -0.022 * s);
      ctx.lineTo(0.11 * s, -0.034 * s);
      ctx.lineTo(0.12 * s, 0.052 * s);
      ctx.lineTo(0.07 * s, 0.128 * s);
      ctx.lineTo(0.05 * s, 0.078 * s);
      ctx.lineTo(-0.004 * s, 0.138 * s);
      ctx.lineTo(-0.034 * s, 0.075 * s);
      ctx.lineTo(-0.092 * s, 0.118 * s);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        // One fold plane on the panel — a crease, not a gradient.
        ctx.fillStyle = shade(base, -6);
        ctx.beginPath();
        ctx.moveTo(0.02 * s, -0.03 * s);
        ctx.lineTo(0.11 * s, -0.034 * s);
        ctx.lineTo(0.12 * s, 0.052 * s);
        ctx.lineTo(0.05 * s, 0.078 * s);
        ctx.closePath();
        ctx.fill();
        // THE CLASP IS A COIN STACK: three lifted coins pinned
        // through the mantle — the Purse wears its ledger on the
        // shoulder too. Only the top coin takes the rare flare.
        const trim2 = st.pauldronTrim ?? shade(base, 30);
        const flare = nowMs % 3400 < 240;
        for (let ci = 2; ci >= 0; ci--) {
          const cy2 = -0.038 * s - ci * 0.011 * s;
          const top = ci === 2;
          ctx.fillStyle = top && flare ? shade(trim2, 30) : shade(trim2, top ? 6 : -8 - ci * 6);
          ctx.beginPath();
          ctx.ellipse(0.072 * s, cy2, 0.024 * s, 0.014 * s, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = shade(trim2, -30);
        ctx.beginPath();
        ctx.ellipse(0.072 * s, -0.06 * s, 0.008 * s, 0.005 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        // THE TASSEL: one cord off the coin stack, two dead men's
        // coins swinging slow at its end — never on the stride,
        // always on the master's own unhurried clock.
        const tsw = Math.sin(nowMs * 0.0011) * 0.012 * s;
        ctx.strokeStyle = shade(base, -28);
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.beginPath();
        ctx.moveTo(0.088 * s, -0.03 * s);
        ctx.quadraticCurveTo(0.106 * s + tsw * 0.4, 0.03 * s, 0.1 * s + tsw, 0.085 * s);
        ctx.stroke();
        ctx.fillStyle = shade(trim2, -12);
        for (const [ty, tr2] of [[0.095, 0.011], [0.118, 0.009]] as const) {
          ctx.beginPath();
          ctx.arc(0.1 * s + tsw * (1 + (ty - 0.095) * 3), ty * s, tr2 * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      // The blade arm: no dome — two crossed straps and a buckle,
      // the shoulder kept FREE. Bare on purpose reads as intent only
      // if the straps say somebody chose it.
      ctx.strokeStyle = hurt ? '#ffffff' : shade(base, -4);
      ctx.lineWidth = Math.max(2, s * 0.027);
      ctx.beginPath();
      ctx.moveTo(-0.095 * s, 0.004 * s);
      ctx.lineTo(0.095 * s, -0.052 * s);
      ctx.moveTo(-0.095 * s, -0.052 * s);
      ctx.lineTo(0.095 * s, 0.012 * s);
      ctx.stroke();
      if (!hurt) {
        const trim2 = st.pauldronTrim ?? shade(base, 30);
        ctx.fillStyle = shade(trim2, -10);
        ctx.fillRect(-0.012 * s, -0.036 * s, 0.024 * s, 0.02 * s);
        ctx.strokeStyle = shade(base, -22);
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.beginPath();
        ctx.moveTo(-0.05 * s, -0.014 * s);
        ctx.lineTo(-0.036 * s, -0.026 * s);
        ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'grapnel') {
    // THE GRAPNEL — the housebreaker's shoulders: one carries the
    // climb (a coiled line under an iron hook, tail hanging frayed),
    // the other the pry (a riveted iron plate that has met some
    // doors). Tools, worn where they deploy.
    if (side > 0) {
      seat(0.112 * s, 0.085 * s, shade(base, -10), shade(base, 4));
      const rope = shade(base, 38);
      const iron = st.pauldronTrim ? shade(st.pauldronTrim, -26) : shade(base, -18);
      if (!hurt) {
        // THE COIL: three stacked turns lying over the dome — each a
        // stroked arc with its own catch of light, spaced to READ as
        // three (a coil that blurs into one turn is a collar).
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const cy = (-0.038 + i * 0.027) * s;
          ctx.strokeStyle = i === 1 ? shade(rope, 12) : rope;
          ctx.lineWidth = Math.max(2, s * 0.02);
          ctx.beginPath();
          ctx.ellipse(0, cy, (0.09 - i * 0.008) * s, 0.032 * s, 0, Math.PI * 1.05, Math.PI * 1.95);
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
        // THE HOOK: shaft rising TALL from the coil's heart, three
        // flukes — two curling out, one facing the viewer as a short
        // center barb; the leading fluke takes the light. A grapnel
        // is a crown the wall never asked for.
        ctx.strokeStyle = iron;
        ctx.lineWidth = Math.max(1.5, s * 0.017);
        ctx.beginPath();
        ctx.moveTo(-0.006 * s, -0.03 * s);
        ctx.lineTo(-0.002 * s, -0.175 * s);
        ctx.stroke();
        for (const [dir, lit] of [[1, 1], [-1, 0]] as const) {
          ctx.fillStyle = lit ? shade(iron, 18) : iron;
          ctx.beginPath();
          ctx.moveTo(-0.002 * s, -0.172 * s);
          ctx.quadraticCurveTo(dir * 0.056 * s, -0.166 * s, dir * 0.064 * s, -0.108 * s);
          ctx.lineTo(dir * 0.044 * s, -0.122 * s);
          ctx.quadraticCurveTo(dir * 0.036 * s, -0.152 * s, -0.002 * s, -0.152 * s);
          ctx.closePath();
          ctx.fill();
        }
        // The center barb: a short tooth toward the viewer — the
        // third point that makes it a grapnel and not an anchor.
        ctx.fillStyle = shade(iron, 8);
        ctx.beginPath();
        ctx.moveTo(-0.011 * s, -0.168 * s);
        ctx.lineTo(0.009 * s, -0.168 * s);
        ctx.lineTo(-0.001 * s, -0.136 * s);
        ctx.closePath();
        ctx.fill();
        // The eye ring at the shaft foot, a taut lead pinned down
        // the seat's back edge, and the tail: hanging long off the
        // trailing side, frayed at the tip.
        ctx.strokeStyle = iron;
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        ctx.arc(-0.004 * s, -0.026 * s, 0.012 * s, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = shade(rope, -12);
        ctx.lineWidth = Math.max(1.5, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(-0.082 * s, 0.012 * s);
        ctx.quadraticCurveTo(-0.102 * s, 0.07 * s, -0.072 * s, 0.15 * s);
        ctx.stroke();
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.beginPath();
        ctx.moveTo(-0.072 * s, 0.15 * s);
        ctx.lineTo(-0.086 * s, 0.176 * s);
        ctx.moveTo(-0.072 * s, 0.15 * s);
        ctx.lineTo(-0.058 * s, 0.174 * s);
        ctx.stroke();
      }
    } else {
      // THE PRY PLATE: flat iron over the seat, three rivets, one
      // long scratch — the door that argued.
      seat(0.105 * s, 0.08 * s, shade(base, -12), shade(base, 2));
      const iron = st.pauldronTrim ? shade(st.pauldronTrim, -30) : shade(base, -20);
      if (!hurt) {
        ctx.fillStyle = iron;
        ctx.beginPath();
        ctx.moveTo(-0.072 * s, -0.042 * s);
        ctx.lineTo(0.052 * s, -0.058 * s);
        ctx.lineTo(0.078 * s, 0.012 * s);
        ctx.lineTo(-0.048 * s, 0.028 * s);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(iron, 20);
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        ctx.moveTo(-0.072 * s, -0.042 * s);
        ctx.lineTo(0.052 * s, -0.058 * s);
        ctx.stroke();
        ctx.fillStyle = shade(iron, -20);
        for (const [rx, ry] of [[-0.052, -0.026], [0.036, -0.04], [0.056, 0.002]] as const) {
          ctx.beginPath();
          ctx.arc(rx * s, ry * s, 0.008 * s, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = shade(iron, 12);
        ctx.lineWidth = Math.max(1, s * 0.007);
        ctx.beginPath();
        ctx.moveTo(-0.03 * s, -0.008 * s);
        ctx.lineTo(0.04 * s, -0.03 * s);
        ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'duskmantle') {
    // THE DUSKMANTLE — the Unseen's shoulders: on one, three tabs of
    // dusk hang and sway on slow staggered clocks, and a single mote
    // rises off them and fades — the night, leaking upward. On the
    // other, nothing but two turns of silver cord: the Unseen does
    // not carry weight it does not need.
    if (side > 0) {
      seat(0.115 * s, 0.085 * s, shade(base, -12), shade(base, 2));
      if (!hurt) {
        // FOUR tabs of dusk painted back-to-front, deepest first,
        // the long lead tab falling past the elbow line — each on
        // its own phase, never in unison (the tentacle law).
        const tabs: Array<[number, number, number, number]> = [
          [-0.072, 0.17, 2.1, -26], [0.062, 0.19, 4.0, -18],
          [-0.028, 0.23, 5.3, -10], [0.02, 0.27, 0.0, -2],
        ];
        for (const [rx, len, ph, tone] of tabs) {
          const swx = Math.sin(nowMs * 0.0013 + ph) * 0.011 * s;
          ctx.fillStyle = shade(base, tone);
          ctx.beginPath();
          ctx.moveTo((rx - 0.03) * s, 0.012 * s);
          ctx.lineTo((rx + 0.03) * s, 0.006 * s);
          ctx.lineTo(rx * s + swx + 0.009 * s, len * s);
          ctx.lineTo(rx * s + swx - 0.011 * s, (len - 0.02) * s);
          ctx.closePath();
          ctx.fill();
        }
        // THE MOTES: born at the tab tips, rising, gone — two on
        // staggered clocks, low alpha (alpha fills are legal in the
        // pauldron path); the empowered read is the restraint.
        const trim2 = st.pauldronTrim ?? shade(base, 30);
        for (const [mx, ph2, per] of [[0.014, 0, 2600], [-0.04, 1300, 3300]] as const) {
          const cyc = ((nowMs + ph2) % per) / per;
          ctx.globalAlpha = 0.32 * (1 - cyc);
          ctx.fillStyle = trim2;
          ctx.beginPath();
          ctx.arc(
            mx * s + Math.sin(cyc * 5.2 + ph2) * 0.013 * s,
            (0.2 - cyc * 0.3) * s,
            0.0075 * s, 0, Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    } else {
      seat(0.1 * s, 0.075 * s, shade(base, -14), shade(base, 0));
      if (!hurt) {
        // Two turns of cord, and the tuck — quiet silver, not a
        // beacon: the bare shoulder whispers.
        const trim2 = st.pauldronTrim ?? shade(base, 30);
        ctx.strokeStyle = shade(trim2, -32);
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.beginPath();
        ctx.moveTo(-0.092 * s, -0.012 * s);
        ctx.quadraticCurveTo(0, 0.014 * s, 0.092 * s, -0.018 * s);
        ctx.moveTo(-0.088 * s, 0.008 * s);
        ctx.quadraticCurveTo(0, 0.034 * s, 0.088 * s, 0.002 * s);
        ctx.stroke();
        ctx.fillStyle = shade(trim2, -32);
        ctx.beginPath();
        ctx.arc(0.07 * s, -0.008 * s, 0.009 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'razorcrest') {
    // THE RAZORCREST — the master's shoulders, remade MATCHED (the
    // asymmetric-office law bows to the user's word, as it did for
    // the drake). Two nested razor plates cap each deltoid, both
    // swept to a down-raked outboard tip — folded at rest, never
    // sky-raked — with the crimson lining bleeding in the lap gap
    // and a knotted cord off the lower tip, the two sides swaying
    // out of step. The plates are FAT caps that OWN the seat dome:
    // thin arc bands over a dark dome read as a glossy ball with a
    // specular highlight (round-1 verdict), so the steel covers and
    // the glint stays short and low, never arcing over the crown.
    seat(0.098 * s, 0.076 * s, shade(base, -14), shade(base, -2));
    const edge = st.pauldronTrim ?? shade(base, 30);
    const lin = st.bloodshroud?.lining ?? '#a83228';
    ctx.save();
    ctx.scale(side >= 0 ? 1 : -1, 1);
    // The lower plate: a broad curved cap, its outboard end swept
    // into the long razor tip that follows the arm down.
    ctx.fillStyle = hurt ? '#ffffff' : shade(base, 4);
    ctx.beginPath();
    ctx.moveTo(-0.108 * s, 0.014 * s);
    ctx.quadraticCurveTo(-0.06 * s, -0.078 * s, 0.04 * s, -0.066 * s);
    ctx.quadraticCurveTo(0.108 * s, -0.052 * s, 0.152 * s, 0.088 * s);
    ctx.lineTo(0.096 * s, 0.062 * s);
    ctx.quadraticCurveTo(0.02 * s, 0.078 * s, -0.052 * s, 0.062 * s);
    ctx.quadraticCurveTo(-0.098 * s, 0.05 * s, -0.108 * s, 0.014 * s);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // Its under-edge falls dark along the hem.
      ctx.strokeStyle = shade(base, -22);
      ctx.lineWidth = Math.max(1, s * 0.009);
      ctx.beginPath();
      ctx.moveTo(-0.052 * s, 0.062 * s);
      ctx.quadraticCurveTo(0.02 * s, 0.078 * s, 0.096 * s, 0.062 * s);
      ctx.lineTo(0.152 * s, 0.088 * s);
      ctx.stroke();
      // THE BLEED: crimson standing in the lap gap, raked with the
      // plates — a wound between the steel, never a ring.
      ctx.strokeStyle = lin;
      ctx.lineWidth = Math.max(1, s * 0.008);
      ctx.beginPath();
      ctx.moveTo(-0.056 * s, -0.012 * s);
      ctx.quadraticCurveTo(0.012 * s, -0.036 * s, 0.078 * s, -0.016 * s);
      ctx.stroke();
    }
    // The upper plate laps it: narrower, brighter, its own shorter
    // tip nested above the long one — twin razors, one sweep.
    ctx.fillStyle = hurt ? '#ffffff' : shade(base, 12);
    ctx.beginPath();
    ctx.moveTo(-0.084 * s, -0.006 * s);
    ctx.quadraticCurveTo(-0.04 * s, -0.084 * s, 0.036 * s, -0.072 * s);
    ctx.quadraticCurveTo(0.09 * s, -0.06 * s, 0.122 * s, 0.036 * s);
    ctx.lineTo(0.07 * s, 0.02 * s);
    ctx.quadraticCurveTo(0.0 * s, 0.032 * s, -0.06 * s, 0.018 * s);
    ctx.quadraticCurveTo(-0.08 * s, 0.01 * s, -0.084 * s, -0.006 * s);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // The lit crown plane of the upper razor — flat value, and
      // it stops well short of a dome highlight.
      ctx.fillStyle = shade(base, 22);
      ctx.beginPath();
      ctx.moveTo(-0.07 * s, -0.02 * s);
      ctx.quadraticCurveTo(-0.032 * s, -0.076 * s, 0.032 * s, -0.064 * s);
      ctx.lineTo(0.028 * s, -0.048 * s);
      ctx.quadraticCurveTo(-0.028 * s, -0.058 * s, -0.06 * s, -0.01 * s);
      ctx.closePath();
      ctx.fill();
      // THE HONED EDGE: one short bright line low on the outboard
      // sweep — the pair's whole glint budget.
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(0.06 * s, -0.044 * s);
      ctx.quadraticCurveTo(0.098 * s, -0.024 * s, 0.122 * s, 0.036 * s);
      ctx.stroke();
      // THE COUNT, etched: two crimson ticks scored into the steel
      // beside the razor tip. A hanging cord at the shoulder dies
      // under the outline shader — every thin dangle grows a fat
      // dark rind and reads as scraggle (round-3 verdict) — so the
      // master's tally is cut INTO the plate, quiet and permanent.
      ctx.strokeStyle = shade(lin, -6);
      ctx.lineWidth = Math.max(1, s * 0.008);
      for (const tu of [0.096, 0.116]) {
        ctx.beginPath();
        ctx.moveTo(tu * s, 0.03 * s);
        ctx.lineTo((tu + 0.012) * s, 0.062 * s);
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.restore();
    return;
  }
  if (st.pauldron === 'guardhair') {
    // THE GUARDHAIR — wolfstalker's winter pelt, worn heavier than
    // any tame fur word: dark under-row, mid coat, and a FROST ROW
    // of pale tips riding the crown (three values, the pelt's own
    // three-value law), guard hairs flicking long off the wind side,
    // one claw toggle hung from the seat band. The pack made room.
    seat(0.12 * s, 0.092 * s, shade(base, -26), shade(base, -4));
    const frost = st.pauldronTrim ?? shade(base, 30);
    for (let i = 0; i < 4; i++) {
      const u = -0.9 + i * 0.6;
      ctx.fillStyle = hurt ? '#ffffff' : shade(base, -20);
      ctx.beginPath();
      ctx.arc(u * 0.1 * s, 0.008 * s + Math.sin(i * 2.1) * 0.012 * s, (0.062 + 0.014 * Math.sin(i * 3.3)) * s, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 3; i++) {
      const u = -0.62 + i * 0.62;
      ctx.fillStyle = hurt ? '#ffffff' : shade(base, near ? 10 : -4);
      ctx.beginPath();
      ctx.arc(u * 0.1 * s, -0.035 * s + Math.sin(i * 1.7) * 0.01 * s, (0.058 + 0.012 * Math.sin(i * 2.6)) * s, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!hurt) {
      // The frost row: pale caps on the crown lumps — winter sitting
      // ON the coat, not mixed into it.
      ctx.fillStyle = frost;
      for (let i = 0; i < 3; i++) {
        const u = -0.58 + i * 0.58;
        ctx.beginPath();
        ctx.arc(u * 0.095 * s, -0.055 * s + Math.sin(i * 1.9) * 0.008 * s, (0.032 + 0.007 * Math.sin(i * 2.2)) * s, Math.PI, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }
      // Long guard hairs off the outer edge, wind-bent.
      ctx.strokeStyle = frost;
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const bx = side * (0.05 + i * 0.026) * s;
        const by = (-0.07 + i * 0.028) * s;
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + side * 0.03 * s, by - 0.045 * s, bx + side * 0.058 * s, by - 0.052 * s);
      }
      ctx.stroke();
      // The claw toggle: one trophy hung off the seat band.
      const cx2 = side * 0.02 * s;
      ctx.strokeStyle = shade(base, -30);
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(cx2, 0.075 * s);
      ctx.lineTo(cx2, 0.095 * s);
      ctx.stroke();
      ctx.fillStyle = '#d8d2c0';
      ctx.beginPath();
      ctx.moveTo(cx2 - 0.011 * s, 0.095 * s);
      ctx.lineTo(cx2 + 0.011 * s, 0.095 * s);
      ctx.quadraticCurveTo(cx2 + 0.008 * s, 0.13 * s, cx2 - 0.004 * s, 0.142 * s);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'drakewing') {
    // THE DRAKEWING PAIR, matched — both shoulders carry the drake's
    // wings FOLDED AT REST (round-2 verdict: the pair speaks louder
    // than the trophy). Four filled membrane planes between bone
    // ribs, values stepping LIGHTER going out (dark-on-dark leaves
    // rib-only whiskers, twice proven), raked down over the deltoid;
    // a copper wrist boss where the folds gather, the horn thumb-claw
    // hooked up off it, and the banked fire living IN the fold gaps —
    // an ember root wedge and one molten vein along the deepest fold.
    // Two kite scales ride the seat dome so even the socket speaks
    // the scale language.
    seat(0.122 * s, 0.092 * s, shade(base, -8), shade(base, 10));
    const rib = st.metal ?? shade(base, 24);
    const bright = st.pauldronTrim ?? shade(rib, 26);
    const horn = '#e6ddc8';
    const ember = st.heatseam?.color ?? bright;
    const emberCore = st.heatseam?.core ?? shade(ember, 24);
    const wx = side * 0.018 * s;
    const wy = -0.095 * s;
    // Membrane planes INNER-FIRST so each outer fold laps the last.
    const folds: Array<[number, number, number, number, number]> = [
      [0.12, 0.16, 0.03, 0.14, -30],
      [0.185, 0.125, 0.1, 0.15, -18],
      [0.24, 0.06, 0.165, 0.125, -6],
      [0.265, -0.045, 0.215, 0.06, 12],
    ];
    for (const [txx, tyy, rxx, ryy, val] of folds) {
      ctx.fillStyle = hurt ? '#ffffff' : shade(base, val);
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.quadraticCurveTo(side * txx * 0.5 * s, wy * 0.35 + tyy * s * 0.5, side * txx * s, tyy * s);
      // The trailing edge sags between rib tips — the membrane
      // remembers hanging.
      ctx.quadraticCurveTo(side * (txx + rxx) * 0.52 * s, tyy * s + 0.022 * s, side * rxx * s, ryy * s);
      ctx.closePath();
      ctx.fill();
    }
    if (!hurt) {
      // The bones laid ON the lit planes: one bright leading rib —
      // the wing's whole glint budget — and three quiet ones under.
      const ribTips: Array<[number, number, number]> = [
        [0.265, -0.045, 1], [0.24, 0.06, 0], [0.185, 0.125, 0], [0.12, 0.16, 0],
      ];
      for (const [txx, tyy, lit] of ribTips) {
        ctx.strokeStyle = lit ? bright : rib;
        ctx.lineWidth = Math.max(1, s * (lit ? 0.016 : 0.011));
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.quadraticCurveTo(side * txx * 0.5 * s, wy * 0.35 + tyy * s * 0.5, side * txx * s, tyy * s);
        ctx.stroke();
      }
      // THE FIRE IN THE FOLDS: the ember root wedge where the
      // membranes gather, and one molten vein tracing the deepest
      // fold's gap — lit from within, never a badge.
      ctx.fillStyle = ember;
      ctx.beginPath();
      ctx.moveTo(wx + side * 0.006 * s, wy + 0.022 * s);
      ctx.lineTo(wx + side * 0.06 * s, wy + 0.06 * s);
      ctx.lineTo(wx + side * 0.012 * s, wy + 0.066 * s);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = emberCore;
      ctx.lineWidth = Math.max(1, s * 0.008);
      ctx.beginPath();
      ctx.moveTo(wx + side * 0.028 * s, wy + 0.05 * s);
      ctx.quadraticCurveTo(side * 0.1 * s, wy * 0.35 + 0.15 * s * 0.42, side * 0.115 * s, 0.145 * s);
      ctx.stroke();
      // The copper wrist boss pinning the folds.
      ctx.fillStyle = rib;
      ctx.beginPath();
      ctx.arc(wx, wy + 0.008 * s, 0.021 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(rib, 22);
      ctx.beginPath();
      ctx.arc(wx - side * 0.005 * s, wy + 0.003 * s, 0.009 * s, 0, Math.PI * 2);
      ctx.fill();
      // Two kite scales on the seat dome — the socket speaks scale.
      for (const [ku, kv] of [[-0.052, -0.006], [-0.012, 0.05]] as const) {
        const kxx = side * ku * s;
        const kyy = kv * s;
        ctx.fillStyle = shade(base, -16);
        ctx.beginPath();
        ctx.moveTo(kxx - 0.02 * s, kyy - 0.016 * s);
        ctx.lineTo(kxx + 0.02 * s, kyy - 0.016 * s);
        ctx.lineTo(kxx + 0.002 * s, kyy + 0.024 * s);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(base, -30);
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.beginPath();
        ctx.moveTo(kxx, kyy - 0.012 * s);
        ctx.lineTo(kxx + 0.001 * s, kyy + 0.018 * s);
        ctx.stroke();
      }
    }
    // The thumb-claw: a two-plane horn hook standing up off the
    // wrist boss — structure, holds the hurt-white silhouette.
    ctx.fillStyle = hurt ? '#ffffff' : shade(horn, -20);
    ctx.beginPath();
    ctx.moveTo(wx + side * 0.012 * s, wy + 0.004 * s);
    ctx.quadraticCurveTo(wx + side * 0.052 * s, wy - 0.052 * s, wx + side * 0.082 * s, wy - 0.07 * s);
    ctx.lineTo(wx + side * 0.036 * s, wy - 0.02 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = hurt ? '#ffffff' : horn;
    ctx.beginPath();
    ctx.moveTo(wx - side * 0.006 * s, wy + 0.01 * s);
    ctx.quadraticCurveTo(wx + side * 0.042 * s, wy - 0.04 * s, wx + side * 0.082 * s, wy - 0.07 * s);
    ctx.lineTo(wx + side * 0.014 * s, wy - 0.004 * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }
  if (st.pauldron === 'oakspaul') {
    // THE OAKSPAUL — stagheart's shoulders: oak-leaf lappets hung in
    // two rows off the seat dome, moss above, worked gold below, an
    // acorn stud at the crown. The forest, formal.
    seat(0.118 * s, 0.09 * s, shade(base, -6), shade(base, 12));
    const gold = st.pauldronTrim ?? shade(base, 28);
    const moss = st.metal ?? shade(base, -10);
    if (!hurt) {
      const leaf = (lx: number, ly: number, ang: number, len: number, colr: string): void => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(ang);
        ctx.fillStyle = colr;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        // A lobed oak leaf as three bumps a side — flat fill, one
        // midrib, never an outline.
        ctx.quadraticCurveTo(len * 0.32, -len * 0.3, len * 0.52, -len * 0.14);
        ctx.quadraticCurveTo(len * 0.72, -len * 0.26, len * 0.86, -len * 0.1);
        ctx.quadraticCurveTo(len * 1.04, -len * 0.12, len, 0);
        ctx.quadraticCurveTo(len * 1.04, len * 0.12, len * 0.86, len * 0.1);
        ctx.quadraticCurveTo(len * 0.72, len * 0.26, len * 0.52, len * 0.14);
        ctx.quadraticCurveTo(len * 0.32, len * 0.3, 0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(colr, -20);
        ctx.lineWidth = Math.max(1, s * 0.009);
        ctx.beginPath();
        ctx.moveTo(len * 0.1, 0);
        ctx.lineTo(len * 0.85, 0);
        ctx.stroke();
        ctx.restore();
      };
      // Upper row: two moss leaves sweeping outward off the crown.
      leaf(side * -0.02 * s, -0.055 * s, side > 0 ? 0.5 : Math.PI - 0.5, 0.135 * s, moss);
      leaf(side * 0.035 * s, -0.02 * s, side > 0 ? 0.9 : Math.PI - 0.9, 0.12 * s, shade(moss, 12));
      // Lower row: three gold leaves hanging down the arm.
      leaf(side * -0.055 * s, 0.035 * s, 1.35, 0.115 * s, shade(gold, -8));
      leaf(side * 0.005 * s, 0.05 * s, 1.55, 0.125 * s, gold);
      leaf(side * 0.06 * s, 0.035 * s, 1.75, 0.11 * s, shade(gold, -14));
      // The acorn stud: cap and nut, two flat tones at the crown.
      ctx.fillStyle = shade(gold, 18);
      ctx.beginPath();
      ctx.arc(0, -0.075 * s, 0.02 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(base, -22);
      ctx.beginPath();
      ctx.arc(0, -0.082 * s, 0.021 * s, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'fur') {
    // A fur mantle over the shoulder: a dark leather under-band SEATS
    // the pelt on the arm (worn, never stickered), then a dark
    // under-row of tufts with a lit row riding on top — mass first,
    // texture second. Lumpy on purpose; fur that lines up stops
    // being fur.
    if (!hurt) {
      ctx.fillStyle = shade(base, -32);
      ctx.beginPath();
      ctx.ellipse(0, 0.05 * s, 0.12 * s, 0.036 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 4; i++) {
      const u = -0.9 + i * 0.6;
      ctx.fillStyle = hurt ? '#ffffff' : shade(base, -18);
      ctx.beginPath();
      ctx.arc(u * 0.095 * s, 0.012 * s + Math.sin(i * 2.1) * 0.011 * s, (0.058 + 0.013 * Math.sin(i * 3.3)) * s, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 3; i++) {
      const u = -0.62 + i * 0.62;
      ctx.fillStyle = hurt ? '#ffffff' : shade(base, near ? 14 : -2);
      ctx.beginPath();
      ctx.arc(u * 0.095 * s, -0.032 * s + Math.sin(i * 1.7) * 0.009 * s, (0.054 + 0.011 * Math.sin(i * 2.6)) * s, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!hurt) {
      // Guard hairs flicking off the outer edge — the pelt's opinion.
      ctx.strokeStyle = shade(base, 22);
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const bx = side * (0.06 + i * 0.028) * s;
        const by = (-0.06 + i * 0.026) * s;
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + side * 0.045 * s, by - 0.035 * s);
      }
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'feathered') {
    // A feathered mantle: three BROAD vanes fanning off the shoulder
    // (the fins-v1 law — a thin feather is a wire), rooted under a
    // covert cluster that seats the wing on the arm. Every vane
    // carries its pale spine; the crown feather sweeps highest.
    const tips: Array<[number, number, number, number, number, number]> = [
      // [baseX, baseY, ctrlX, ctrlY, tipX, tipY] — outward = +x, ×side.
      [0.0, -0.055, 0.16, -0.175, 0.26, -0.215],
      [0.015, -0.025, 0.19, -0.075, 0.28, -0.06],
      [0.03, 0.012, 0.18, 0.03, 0.25, 0.105],
    ];
    for (let i = 0; i < 3; i++) {
      const [bx, by, cx, cy, txx, tyy] = tips[i]!;
      ctx.fillStyle = hurt ? '#ffffff' : shade(base, (near ? 16 : 2) - i * 12);
      ctx.beginPath();
      ctx.moveTo(side * bx * s, by * s);
      ctx.quadraticCurveTo(side * cx * s, cy * s, side * txx * s, tyy * s);
      // The return edge is what gives the vane WIDTH — the wing at
      // rest is a slab of feather, not a pen stroke.
      ctx.quadraticCurveTo(side * (cx + 0.012) * s, (cy + 0.075) * s, side * (bx + 0.024) * s, (by + 0.072) * s);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        // Every vane carries its spine.
        ctx.strokeStyle = shade(base, 30);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(side * (bx + 0.015) * s, (by + 0.02) * s);
        ctx.quadraticCurveTo(
          side * (cx + 0.004) * s, (cy + 0.032) * s,
          side * (txx - 0.02) * s, (tyy + 0.02) * s,
        );
        ctx.stroke();
      }
    }
    if (!hurt) {
      // The covert cluster: small overlapping base feathers hugging
      // the arm root — the fan grows out of the shoulder, it does not
      // hover beside it.
      for (const [ox, oy, r] of [
        [-0.03, 0.015, 0.05],
        [0.035, 0.025, 0.045],
        [0.0, 0.045, 0.042],
      ] as const) {
        ctx.fillStyle = shade(base, -10);
        ctx.beginPath();
        ctx.ellipse(side * ox * s, oy * s, r * s, r * 0.8 * s, side * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = shade(base, 14);
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        ctx.ellipse(side * ox * s, oy * s, r * 0.72 * s, r * 0.56 * s, side * 0.4, Math.PI * 0.1, Math.PI * 0.9);
        ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'lionhead') {
    // THE LION'S HEAD: a sculpted guardian face worn as the shoulder
    // itself — a wreath of forged gold mane wedges around a white
    // enamel visage. The lion IS the pauldron, so the whole head
    // paints in the hurt flash; only the face's dark features gate
    // behind !hurt like every device.
    const fr = 0.092 * s;
    const cy = -0.02 * s;
    // The contact seat: the head is worn, never stickered on.
    if (!hurt) {
      ctx.fillStyle = 'rgba(24, 15, 26, 0.28)';
      ctx.beginPath();
      ctx.ellipse(0, 0.078 * s, 0.128 * s, 0.03 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // The mane wreath: twelve forged wedges radiating from the face,
    // longest over the crown, shortest under the jaw — mass, never
    // rays. Alternate wedges step darker so the wreath reads carved.
    const r0 = fr * 0.84;
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 + (i / 12) * Math.PI * 2;
      const len = fr * (0.5 + 0.36 * Math.max(0, -Math.sin(a)));
      ctx.fillStyle = hurt ? '#ffffff' : shade(trim, i % 2 === 0 ? 8 : -12);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.27) * r0, cy + Math.sin(a - 0.27) * r0);
      ctx.lineTo(Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len));
      ctx.lineTo(Math.cos(a + 0.27) * r0, cy + Math.sin(a + 0.27) * r0);
      ctx.closePath();
      ctx.fill();
    }
    // The visage.
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(0, cy, fr, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, cy, fr, 0, Math.PI * 2);
      ctx.clip();
      // One sun on the face: the screen-right cheek turns away.
      ctx.fillStyle = shade(base, -9);
      ctx.fillRect(fr * 0.2, cy - fr, fr, fr * 2);
      // The brow shelf: two angled bars shading the eyes — sculpture.
      ctx.fillStyle = shade(base, -20);
      for (const es2 of [-1, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(es2 * fr * 0.1, cy - fr * 0.26);
        ctx.lineTo(es2 * fr * 0.72, cy - fr * 0.52);
        ctx.lineTo(es2 * fr * 0.72, cy - fr * 0.2);
        ctx.lineTo(es2 * fr * 0.14, cy - fr * 0.04);
        ctx.closePath();
        ctx.fill();
      }
      // Eyes: two angled cuts under the brow, slanting in and down —
      // a guardian's glare, never a kitten's stare.
      ctx.fillStyle = '#1c1722';
      for (const es2 of [-1, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(es2 * fr * 0.16, cy - fr * 0.08);
        ctx.lineTo(es2 * fr * 0.62, cy - fr * 0.3);
        ctx.lineTo(es2 * fr * 0.62, cy - fr * 0.12);
        ctx.lineTo(es2 * fr * 0.2, cy + fr * 0.06);
        ctx.closePath();
        ctx.fill();
      }
      // The muzzle: a lighter plate dropping to the chin, a broad
      // dark nose wedge, one mouth seam.
      ctx.fillStyle = shade(base, 18);
      ctx.beginPath();
      chamferRect(ctx, -fr * 0.32, cy + fr * 0.06, fr * 0.64, fr * 0.62, fr * 0.16);
      ctx.fill();
      ctx.fillStyle = '#1c1722';
      ctx.beginPath();
      ctx.moveTo(-fr * 0.2, cy + fr * 0.18);
      ctx.lineTo(fr * 0.2, cy + fr * 0.18);
      ctx.lineTo(0, cy + fr * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-fr * 0.026, cy + fr * 0.36, fr * 0.052, fr * 0.26);
      ctx.restore();
    }
    ctx.restore();
    return;
  }
  // ---- THE MOUNTED FAMILY (round / spiked / bladed / layered /
  // wyrmwing / boneridge / thorncrest): every
  // plate pauldron starts from the same forged CAP — a domed shoulder
  // plate with a lit top plane, a one-sun form split, a bright rim
  // lip, and a crown rivet — seated on the arm by a contact shadow so
  // the armor is WORN, never stickered on. The kind then grows its
  // identity out of the crown: devices are wedges and slabs with two
  // facets each, never lines (the v1 nub-and-wire verdict).
  const capW = 0.128 * s;
  const capTop = -0.078 * s;
  const capBot = 0.052 * s;
  const capPath = () => {
    ctx.moveTo(-capW, capBot);
    ctx.quadraticCurveTo(-capW * 1.14, capTop * 0.3, -capW * 0.6, capTop);
    ctx.lineTo(capW * 0.6, capTop);
    ctx.quadraticCurveTo(capW * 1.14, capTop * 0.3, capW, capBot);
    ctx.closePath();
  };
  // The contact seat: the shadow the plate throws onto the arm root.
  if (!hurt) {
    ctx.fillStyle = 'rgba(24, 15, 26, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, capBot + 0.014 * s, capW * 0.94, 0.03 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Identity layers grow from BEHIND the crown so the cap covers
  // their roots — grown from the shoulder, not floated beside it.
  if (!hurt && st.pauldron === 'spiked') {
    // Forged spikes: each one a wedge with a lit leading facet and a
    // shaded trailing facet. One is a warlord's tusk — big, hooked;
    // three are a fan. Bases are FAT; a thin spike is a wire.
    const n = Math.max(1, Math.min(3, st.pauldronSpikes ?? 1));
    // [rootX, rootY, halfW, tipX, tipY, hook] — outward = +x, ×side.
    const layouts: Array<Array<[number, number, number, number, number, number]>> = [
      [[0.03, -0.045, 0.055, 0.205, -0.235, 0.07]],
      [
        [0.055, -0.035, 0.05, 0.225, -0.2, 0.06],
        [-0.025, -0.05, 0.044, -0.02, -0.225, -0.02],
      ],
      [
        [0.06, -0.03, 0.048, 0.235, -0.185, 0.06],
        [0.0, -0.052, 0.044, 0.055, -0.24, 0.02],
        [-0.055, -0.04, 0.04, -0.135, -0.16, -0.04],
      ],
    ];
    for (const [rx, ry, hw, tx2, ty2, hook] of layouts[n - 1]!) {
      const r0x = side * (rx - hw) * s;
      const r1x = side * (rx + hw) * s;
      const rmx = side * rx * s;
      const ry2 = ry * s;
      const tx3 = side * tx2 * s;
      const ty3 = ty2 * s;
      const cx2 = side * (rx + (tx2 - rx) * 0.5 + hook) * s;
      const cy2 = (ry + (ty2 - ry) * 0.55) * s;
      // Leading (outward) facet catches the light...
      ctx.fillStyle = shade(base, 18);
      ctx.beginPath();
      ctx.moveTo(r1x, ry2);
      ctx.quadraticCurveTo(cx2, cy2, tx3, ty3);
      ctx.lineTo(rmx, ry2);
      ctx.closePath();
      ctx.fill();
      // ...the trailing facet turns from it — two-tone or it reads
      // as paper.
      ctx.fillStyle = shade(base, -16);
      ctx.beginPath();
      ctx.moveTo(rmx, ry2);
      ctx.quadraticCurveTo(cx2 - side * 0.02 * s, cy2, tx3, ty3);
      ctx.lineTo(r0x, ry2);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (!hurt && st.pauldron === 'wyrmwing') {
    // The wyrm's wing: a forged membrane fan — three finger spines
    // rising from behind the cap with webbing scalloped between them,
    // flexing on a slow living beat. Claw hooks tip the spines in the
    // trim metal. Forged, not grown: the membrane keeps the two-facet
    // law and the spines carry mass.
    const flex = Math.sin(nowMs * 0.0013 + side * 0.9) * 0.012 * s;
    // Finger tips, root out: [tipX, tipY] before flex, outward = +x.
    const tips: Array<[number, number]> = [
      [0.235 * s + flex, -0.2 * s],
      [0.14 * s + flex * 0.7, -0.3 * s],
      [0.025 * s + flex * 0.35, -0.315 * s],
    ];
    const rootX = 0.02 * s;
    const rootY = capTop + 0.04 * s;
    // The membrane: one path from the root through each tip with a
    // scalloped bite between fingers — the web sags, the spine holds.
    ctx.fillStyle = shade(base, -6);
    ctx.beginPath();
    ctx.moveTo(side * rootX, rootY + 0.02 * s);
    ctx.lineTo(side * tips[0]![0], tips[0]![1]);
    for (let i = 1; i < tips.length; i++) {
      const [px, py] = tips[i - 1]!;
      const [qx, qy] = tips[i]!;
      // The sag point between two fingers bites toward the shoulder.
      ctx.quadraticCurveTo(
        side * ((px + qx) / 2 - 0.012 * s), (py + qy) / 2 + 0.05 * s,
        side * qx, qy,
      );
    }
    ctx.lineTo(side * -0.045 * s, capTop + 0.03 * s);
    ctx.closePath();
    ctx.fill();
    // The inner web panels turn from the sun — two facets per bay.
    ctx.fillStyle = shade(base, -24);
    for (let i = 1; i < tips.length; i++) {
      const [px, py] = tips[i - 1]!;
      const [qx, qy] = tips[i]!;
      ctx.beginPath();
      ctx.moveTo(side * rootX, rootY);
      ctx.lineTo(side * (px * 0.82 + rootX * 0.18), py * 0.82 + rootY * 0.18);
      ctx.quadraticCurveTo(
        side * ((px + qx) / 2 - 0.014 * s), (py + qy) / 2 + 0.042 * s,
        side * (qx * 0.82 + rootX * 0.18), qy * 0.82 + rootY * 0.18,
      );
      ctx.closePath();
      ctx.fill();
    }
    // The spines: fat at the root, each ending in a trim claw hook.
    for (const [txp, typ] of tips) {
      ctx.strokeStyle = shade(base, 14);
      ctx.lineWidth = Math.max(1.5, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(side * rootX, rootY);
      ctx.quadraticCurveTo(
        side * (rootX + (txp - rootX) * 0.5), rootY + (typ - rootY) * 0.62,
        side * txp, typ,
      );
      ctx.stroke();
      ctx.fillStyle = trim;
      ctx.beginPath();
      ctx.moveTo(side * txp, typ);
      ctx.lineTo(side * (txp + 0.028 * s), typ - 0.008 * s);
      ctx.lineTo(side * (txp + 0.008 * s), typ + 0.016 * s);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (!hurt && st.pauldron === 'bladed') {
    // The hero wing: a broad swept blade with real body — a filled
    // edge bevel in the trim metal, a shaded inner face, and a rear
    // fletch for mass. The v1 sliver read as a wire because the trim
    // was a hairline on a same-value fill.
    // Rear fletch first: a shorter, darker blade behind the main one.
    ctx.fillStyle = shade(base, -20);
    ctx.beginPath();
    ctx.moveTo(side * -0.045 * s, capTop + 0.045 * s);
    ctx.quadraticCurveTo(side * 0.045 * s, -0.16 * s, side * 0.1 * s, -0.235 * s);
    ctx.quadraticCurveTo(side * 0.035 * s, -0.14 * s, side * 0.028 * s, capTop + 0.055 * s);
    ctx.closePath();
    ctx.fill();
    // The main wing's body.
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(side * 0.0 * s, capTop + 0.035 * s);
    ctx.quadraticCurveTo(side * 0.17 * s, -0.165 * s, side * 0.25 * s, -0.305 * s);
    ctx.quadraticCurveTo(side * 0.155 * s, -0.16 * s, side * 0.12 * s, capTop + 0.05 * s);
    ctx.closePath();
    ctx.fill();
    // Inner face in shade — the wing has two planes.
    ctx.fillStyle = shade(base, -14);
    ctx.beginPath();
    ctx.moveTo(side * 0.12 * s, capTop + 0.05 * s);
    ctx.quadraticCurveTo(side * 0.15 * s, -0.15 * s, side * 0.215 * s, -0.27 * s);
    ctx.quadraticCurveTo(side * 0.14 * s, -0.145 * s, side * 0.075 * s, capTop + 0.045 * s);
    ctx.closePath();
    ctx.fill();
    // The leading-edge bevel, FILLED in the trim metal.
    ctx.fillStyle = trim;
    ctx.beginPath();
    ctx.moveTo(side * 0.005 * s, capTop + 0.03 * s);
    ctx.quadraticCurveTo(side * 0.168 * s, -0.17 * s, side * 0.25 * s, -0.305 * s);
    ctx.quadraticCurveTo(side * 0.148 * s, -0.152 * s, side * 0.038 * s, capTop + 0.028 * s);
    ctx.closePath();
    ctx.fill();
  }
  if (!hurt && st.pauldron === 'boneridge') {
    // The bone fan: three carved slabs rising off the shoulder, each
    // ending in the double condyle knuckle only bone has. Leading
    // facets catch the light; the marrow-light (hollowlight) gutters
    // in the gaps between them.
    const slabs: Array<[number, number, number, number, number]> = [
      // [rootX, tipX, tipY, halfW, rootY] — outward = +x, ×side.
      [-0.062, -0.118, -0.175, 0.03, -0.03],
      [0.085, 0.2, -0.2, 0.035, -0.025],
      [0.008, 0.048, -0.275, 0.04, -0.045],
    ];
    for (const [rx, tx2, ty2, hw, ry] of slabs) {
      const dxN = tx2 - rx;
      // The shaft: a tapering slab, root fat, waist slimmer.
      ctx.fillStyle = shade(base, 2);
      ctx.beginPath();
      ctx.moveTo(side * (rx - hw) * s, ry * s);
      ctx.lineTo(side * (tx2 - hw * 0.72) * s, ty2 * s);
      ctx.lineTo(side * (tx2 + hw * 0.72) * s, ty2 * s);
      ctx.lineTo(side * (rx + hw) * s, ry * s);
      ctx.closePath();
      ctx.fill();
      // The leading facet — the sun finds one side of every bone.
      ctx.fillStyle = shade(base, 16);
      ctx.beginPath();
      ctx.moveTo(side * (rx + hw * 0.1) * s, ry * s);
      ctx.lineTo(side * (tx2 + hw * 0.05) * s, ty2 * s);
      ctx.lineTo(side * (tx2 + hw * 0.72) * s, ty2 * s);
      ctx.lineTo(side * (rx + hw) * s, ry * s);
      ctx.closePath();
      ctx.fill();
      // The condyles: the double knuckle, with its notch shadow.
      ctx.fillStyle = shade(base, 12);
      ctx.beginPath();
      ctx.arc(side * (tx2 - hw * 0.42 + dxN * 0.04) * s, (ty2 - hw * 0.3) * s, hw * 0.6 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(side * (tx2 + hw * 0.44 + dxN * 0.04) * s, (ty2 - hw * 0.42) * s, hw * 0.55 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(base, -20);
      ctx.beginPath();
      ctx.moveTo(side * tx2 * s, (ty2 - hw * 0.75) * s);
      ctx.lineTo(side * (tx2 + hw * 0.14) * s, (ty2 - hw * 0.1) * s);
      ctx.lineTo(side * (tx2 - hw * 0.14) * s, (ty2 - hw * 0.1) * s);
      ctx.closePath();
      ctx.fill();
    }
    if (st.hollowlight) {
      // The marrow went cold, and something else moved in: two small
      // flames guttering in the gaps of the fan, and one mote that
      // never strays far.
      const hc = st.hollowlight.color;
      for (const [gx, gy, H, ph] of [
        [-0.028, -0.1, 0.125, 0.6],
        [0.145, -0.085, 0.105, 2.9],
      ] as const) {
        const gate = 0.45 + 0.55 * Math.max(0, Math.sin(nowMs * 0.0014 + ph + side));
        const flick = 0.82 + 0.18 * Math.sin(nowMs * 0.017 + ph * 3.1);
        const sway = Math.sin(nowMs * 0.0037 + ph * 2 + side) * 0.016 * s;
        coldLick(ctx, side * gx * s, gy * s, H * s * gate * flick, 0.02 * s, gate, sway, hc);
      }
      const mph = nowMs * 0.00042 + side * 1.7;
      const mcy = mph - Math.floor(mph);
      const ma = Math.sin(mcy * Math.PI);
      if (ma > 0.1) {
        ctx.globalAlpha = ma * 0.8;
        ctx.fillStyle = shade(hc, 18);
        const mx = side * (0.06 + Math.sin(mcy * 4.2 + side) * 0.03) * s;
        const my = (-0.2 - mcy * 0.17) * s;
        ctx.beginPath();
        ctx.moveTo(mx, my - 0.013 * s);
        ctx.lineTo(mx + 0.01 * s, my);
        ctx.lineTo(mx, my + 0.013 * s);
        ctx.lineTo(mx - 0.01 * s, my);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }
  if (!hurt && st.pauldron === 'thorncrest') {
    // The thorn crest: three forged hooks curving up and out, each a
    // fat-rooted claw that turns in at the tip — grown from the
    // steel, never bolted on. The cold fire licks up from behind the
    // row first, so the thorns stand against their own light.
    if (st.coldfire) {
      const cf = st.coldfire.color;
      for (const [gx, gy, H, ph] of [
        [0.02, -0.085, 0.165, 0],
        [0.145, -0.055, 0.125, 2.1],
        [-0.085, -0.065, 0.105, 4.4],
      ] as const) {
        const gate = 0.4 + 0.6 * Math.max(0, Math.sin(nowMs * 0.0015 + ph + side * 1.3));
        const flick = 0.8 + 0.2 * Math.sin(nowMs * 0.019 + ph * 2.7);
        const sway = Math.sin(nowMs * 0.0041 + ph + side * 2) * 0.02 * s;
        coldLick(ctx, side * gx * s, gy * s, H * s * gate * flick, 0.024 * s, gate, sway, cf);
      }
    }
    const thorns: Array<[number, number, number, number, number, number, number]> = [
      // [rootX, rootY, halfW, tipX, tipY, ctrlX, ctrlY] — the ctrl
      // sits past the tip's outward side, so the claw HOOKS.
      [-0.068, -0.035, 0.038, -0.15, -0.19, -0.2, -0.06],
      [0.075, -0.03, 0.05, 0.175, -0.26, 0.295, -0.145],
      [-0.004, -0.048, 0.046, 0.028, -0.3, 0.145, -0.22],
    ];
    for (const [rx, ry, hw, tx2, ty2, cx2, cy2] of thorns) {
      // Leading (outward) facet catches the light...
      ctx.fillStyle = shade(base, 20);
      ctx.beginPath();
      ctx.moveTo(side * (rx + hw) * s, ry * s);
      ctx.quadraticCurveTo(side * cx2 * s, cy2 * s, side * tx2 * s, ty2 * s);
      ctx.lineTo(side * rx * s, ry * s);
      ctx.closePath();
      ctx.fill();
      // ...the trailing facet turns from it.
      ctx.fillStyle = shade(base, -24);
      ctx.beginPath();
      ctx.moveTo(side * rx * s, ry * s);
      ctx.quadraticCurveTo(side * (cx2 - hw * 0.9) * s, (cy2 + hw * 0.4) * s, side * tx2 * s, ty2 * s);
      ctx.lineTo(side * (rx - hw) * s, ry * s);
      ctx.closePath();
      ctx.fill();
      // The ONE bright thing: a hard lit edge down the leading curve —
      // the same law the night-glass shards keep. Dark thorns on dark
      // plate stay a mass without it.
      ctx.strokeStyle = trim;
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(side * (rx + hw * 0.85) * s, (ry - 0.006) * s);
      ctx.quadraticCurveTo(side * cx2 * s, cy2 * s, side * tx2 * s, ty2 * s);
      ctx.stroke();
    }
    // The under-nubs: a second thorn generation budding at the seam.
    for (const [nx, lit] of [[-0.088, false], [0.002, true], [0.09, false]] as const) {
      ctx.fillStyle = shade(base, lit ? 8 : -8);
      ctx.beginPath();
      ctx.moveTo(side * (nx - 0.02) * s, -0.055 * s);
      ctx.lineTo(side * (nx + 0.006) * s, -0.105 * s);
      ctx.lineTo(side * (nx + 0.026) * s, -0.055 * s);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Lames step down the arm BELOW the cap — articulation with mass:
  // each carries a lit upper edge and end rivets.
  if (!hurt && st.pauldron === 'layered') {
    for (let i = 2; i >= 1; i--) {
      const w = capW * (1 - i * 0.15);
      const yy = capBot - 0.018 * s + i * 0.045 * s;
      ctx.fillStyle = shade(col, -i * 9);
      ctx.beginPath();
      chamferRect(ctx, -w, yy, w * 2, 0.048 * s, 0.016 * s);
      ctx.fill();
      ctx.fillStyle = shade(col, 12);
      ctx.fillRect(-w * 0.92, yy + 0.003 * s, w * 1.84, 0.011 * s);
      ctx.fillStyle = shade(base, -28);
      for (const rx of [-1, 1]) {
        ctx.fillRect(rx * (w - 0.022 * s) - 0.007 * s, yy + 0.02 * s, 0.014 * s, 0.014 * s);
      }
    }
  }

  // The cap itself, over every root.
  ctx.fillStyle = col;
  ctx.beginPath();
  capPath();
  ctx.fill();
  if (!hurt) {
    ctx.save();
    ctx.beginPath();
    capPath();
    ctx.clip();
    // One sun: the screen-right half turns away from it. The clip is
    // in the LOCAL mirrored frame, so un-mirror the split for the
    // trailing-side cap (side flips the x axis via the layouts, not
    // the transform — the shade must stay screen-true).
    ctx.fillStyle = shade(base, near ? -8 : -14);
    ctx.fillRect(0, capTop - 0.24 * s, capW * 1.3, capBot - capTop + 0.3 * s);
    // The lit top plane — the tilted bird's eye sees the crown.
    ctx.fillStyle = shade(col, 20);
    ctx.beginPath();
    ctx.moveTo(-capW * 0.66, capTop + 0.002 * s);
    ctx.lineTo(capW * 0.66, capTop + 0.002 * s);
    ctx.lineTo(capW * 0.52, capTop + 0.03 * s);
    ctx.lineTo(-capW * 0.52, capTop + 0.03 * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // The rim lip: bright edging along the base — every kind wears
    // its trim now, not just the gilded sets.
    ctx.strokeStyle = trim;
    ctx.lineWidth = Math.max(1.5, s * 0.02);
    ctx.beginPath();
    ctx.moveTo(-capW * 0.96, capBot - 0.006 * s);
    ctx.lineTo(capW * 0.96, capBot - 0.006 * s);
    ctx.stroke();
    // The crown rivet: a dark seat with a lit dome — a BUMP.
    ctx.fillStyle = shade(base, -26);
    ctx.fillRect(-0.012 * s, capTop + 0.036 * s, 0.024 * s, 0.024 * s);
    ctx.fillStyle = shade(base, 30);
    ctx.fillRect(-0.012 * s, capTop + 0.036 * s, 0.012 * s, 0.012 * s);
    if (st.pauldron === 'round') {
      // The plain cap earns an engraved arc — quiet craft, not blank.
      ctx.strokeStyle = shade(col, -16);
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.beginPath();
      ctx.moveTo(-capW * 0.7, 0.012 * s);
      ctx.quadraticCurveTo(0, -0.03 * s, capW * 0.7, 0.012 * s);
      ctx.stroke();
    }
  }
  ctx.restore();
}
