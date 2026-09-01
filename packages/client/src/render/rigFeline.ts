/**
 * THE SOFT-FOOTED — sabercat, lynx and the house cat, with the shared cat limb.
 * Split out of rig.ts on the golems.ts template (foundations F3.4);
 * rig.ts re-exports everything here, so every lab, test and painter
 * keeps its old door.
 */
import { EarCarriage, EarSim, earRestChain } from './earPhysics.js';
import { chamferRect, facetBlob, facetCircle } from './shapes.js';
import { shade } from './tint.js';
// The engine's shared grammar comes back from rig.ts — the same
// deferred cycle golems.ts has always ridden (touched only at draw
// time, long after both modules initialize).
import { OUTLINE, faceProfileK, paintBlockBody } from './rig.js';
import type { BeastBlockFrame, BeastSpec } from './rig.js';

/**
 * The night sabercat — the prestige saddle beast (THE ROAD GROWS
 * SHORT Phase 5). A cat is not a horse and is not painted like one:
 * low-slung length, shoulder blades riding ABOVE the spine line, a
 * deep waist tuck, flank stripes, a round skull with a short broad
 * muzzle, and the two ivory sabers that name it. It wears a HARNESS,
 * not a saddle: strap ring at the shoulders, low seat pad, breast
 * band. Ridden low — the seat sits where the cat's back actually is.
 */
export interface SabercatLook {
  coat: string;
  /** Flank banding — the saber stripe read. */
  stripe: string;
  under: string;
  earIn: string;
  eye: string;
  fang: string;
  /** Harness leather (the tack constant) and the seat pad's cloth. */
  leather: string;
  pad: string;
  bodyW: number;
  backH: number;
  /** The feline shoulder rise — blades above the spine at the walk. */
  shoulderH: number;
  chestH: number;
  tuckH: number;
  headW: number;
  headH: number;
}
export const SABERCAT_LOOKS: Record<string, SabercatLook> = {
  sabercat_night: {
    coat: '#4a4f63',
    stripe: '#343849',
    under: '#9aa0b5',
    earIn: '#2c2938',
    eye: '#c9d97a',
    fang: '#efe9da',
    leather: '#4a3423',
    pad: '#5d3550',
    bodyW: 0.19,
    backH: 0.5,
    shoulderH: 0.11,
    chestH: 0.24,
    tuckH: 0.34,
    headW: 0.3,
    headH: 0.24,
  },
};
export function paintSabercatBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: SabercatLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // Longer than the wolf's wedge, rump fuller — a cat is carried
  // between its shoulders and its haunches, not on a chest keel.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.78],
    [hl, hw * 0.78],
    [hl * 0.55, hw],
    [-hl * 0.4, hw * 0.96],
    [-hl, hw * 0.74],
    [-hl, -hw * 0.74],
    [-hl * 0.4, -hw * 0.96],
    [hl * 0.55, -hw],
  ];
  const coat = shade(look.coat, (((f.seed >>> 5) & 7) - 3) * 2);
  paintBlockBody(
    ctx,
    f,
    foot,
    // The feline topline: shoulder rise forward, a shallow dip, the
    // haunch swelling again over the rear legs.
    (X) =>
      look.backH +
      Math.max(0, X / hl - 0.15) * look.shoulderH -
      0.03 * Math.max(0, 1 - Math.abs(X / hl + 0.1) / 0.5) +
      0.05 * Math.max(0, -X / hl - 0.45),
    (X) => look.chestH + (look.tuckH - look.chestH) * Math.min(1, Math.max(0, (0.55 - X / hl) / 1.1)),
    coat,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      const bh = look.backH * tk * s;
      // Flank stripes: dark bands raking down-back from the spine to
      // mid-flank, seeded per body — the saber tiger's name written
      // on it. Length, rake, weight, and seat all jitter off the
      // seed: five identical ticks in a row read as a picket fence,
      // never a coat (the anti-rubber-stamp law).
      if (!f.hurt) {
        ctx.strokeStyle = shade(look.stripe, -8);
        ctx.lineCap = 'round';
        const nS = 4 + ((f.seed >>> 3) & 1);
        for (let k = 0; k < nS; k++) {
          const rr = ((((f.seed >>> (k % 11)) * 2654435761 + k * 131) >>> 0) % 1000) / 1000;
          const rq = ((((f.seed >>> ((k + 4) % 13)) * 2246822519 + k * 97) >>> 0) % 1000) / 1000;
          const X = (-0.7 + (1.34 * (k + 0.5)) / nS + (rr - 0.5) * 0.2) * hl;
          const sx0 = gx(X, 0);
          const sy0 = gyy(X, 0) - bh * (0.97 - 0.07 * rq) - lift;
          const len = s * (0.15 + 0.11 * rq);
          const rake = f.fx * s * (0.09 + 0.07 * rr);
          ctx.lineWidth = Math.max(1.6, s * (0.046 - 0.01 * rr));
          ctx.beginPath();
          ctx.moveTo(sx0, sy0);
          ctx.quadraticCurveTo(sx0 - rake * 0.45, sy0 + len * 0.55, sx0 - rake, sy0 + len);
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
      }
      // Pale bib at the chest (the wolf's law: only while the chest
      // can face the camera). Sized a ruff, not a boulder — at the
      // quarter bands the old 0.78 blob out-massed the skull beside
      // it and read as a dewlap sack — and gated to the true front
      // bands: at profile the chest is edge-on, and the old −0.15
      // gate pasted the bib on the shoulder like a patch of daylight.
      if (f.fy > 0.08 && !f.hurt) {
        ctx.fillStyle = look.under;
        ctx.beginPath();
        facetBlob(
          ctx,
          gx(hl * 0.86, 0),
          gyy(hl * 0.86, 0) - (look.chestH + 0.1) * s - lift * 0.8,
          hw * s * 0.62,
          f.seed ^ 0x33,
          7,
          0.85,
          1.7,
        );
        ctx.fill();
      }
      // ---- THE HARNESS (SABER_SADDLE ruler): a low seat pad between
      // the shoulder rise and the haunch, shoulder strap ring forward,
      // breast band dropping at the chest line. No blanket, no cantle:
      // a cat is ridden close.
      const px0 = gx(-0.04 * hl * 2, 0);
      const py0 = gyy(-0.04 * hl * 2, 0) - bh * 0.98 - lift;
      const px1 = gx(0.26 * hl, 0);
      const py1 = gyy(0.26 * hl, 0) - bh * 0.98 - lift;
      ctx.strokeStyle = f.hurt ? '#ffffff' : look.pad;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(3, s * 0.11);
      ctx.beginPath();
      ctx.moveTo(px0, py0);
      ctx.lineTo(px1, py1);
      ctx.stroke();
      // The strap ring at the shoulders and its girth line.
      const rgx = gx(0.34 * hl, 0);
      const rgy = gyy(0.34 * hl, 0);
      ctx.strokeStyle = f.hurt ? '#ffffff' : shade(look.leather, -8);
      ctx.lineWidth = Math.max(1.8, s * 0.04);
      ctx.beginPath();
      ctx.moveTo(rgx, rgy - bh * 1.02 - lift);
      ctx.lineTo(rgx, rgy - look.chestH * tk * s * 0.5 - lift);
      ctx.stroke();
      // The breast band: girth to chest front along the near flank —
      // the strap that says harness-broken, not saddle-broken. Side
      // bands only; dead ahead the bib owns that column.
      if (Math.abs(f.fx) > 0.25) {
        const bbx = gx(hl * 0.9, 0);
        const bby = gyy(hl * 0.9, 0) - look.chestH * tk * s * 0.86 - lift;
        const bmy = rgy - bh * 0.62 - lift;
        ctx.strokeStyle = f.hurt ? '#ffffff' : look.leather;
        ctx.lineWidth = Math.max(1.6, s * 0.036);
        ctx.beginPath();
        ctx.moveTo(rgx, bmy);
        ctx.quadraticCurveTo((rgx + bbx) / 2, (bmy + bby) / 2 + s * 0.035, bbx, bby);
        ctx.stroke();
      }
      // The pommel horn on the strap ring — the rider's grip point,
      // on the same ruler the hands settle to.
      ctx.fillStyle = f.hurt ? '#ffffff' : shade(look.leather, 10);
      ctx.beginPath();
      facetCircle(ctx, px1, py1 - s * 0.035, s * 0.04, 5, f.seed ^ 0x59);
      ctx.fill();
      ctx.lineCap = 'butt';
    },
  );
}
/**
 * The sabercat head: a round skull where the wolf carries a slab, a
 * short broad muzzle where the wolf runs a spike, blunt round-backed
 * ears, pale-gold eyes, and the two ivory sabers dropping past the
 * jaw — visible at every facing the muzzle is, because they ARE the
 * animal.
 */
export function drawSabercatHead(
  ctx: CanvasRenderingContext2D,
  look: SabercatLook,
  o: { x: number; y: number; s: number; fx: number; fy: number; ys: number; hurt?: boolean; dead?: boolean },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);

  // Blunt round-backed ears, set wide and low.
  for (const es of [-1, 1]) {
    const bxr = cx + px * es * w * 0.34 + fx * es * w * 0.08;
    const byr = cy + (py * es * w * 0.34 + fy * es * w * 0.08) * ys - h * 0.34;
    const tx = bxr + px * es * w * 0.12;
    const ty = byr - h * 0.5;
    ctx.fillStyle = C(shade(look.coat, -6));
    ctx.beginPath();
    ctx.moveTo(bxr - px * es * w * 0.15, byr + h * 0.04);
    ctx.quadraticCurveTo(tx - px * es * w * 0.02, ty, tx + px * es * w * 0.1, byr - h * 0.1);
    ctx.lineTo(bxr + px * es * w * 0.16, byr + h * 0.1);
    ctx.closePath();
    ctx.fill();
    if (fy > 0.05 && !o.hurt && !o.dead) {
      ctx.fillStyle = look.earIn;
      ctx.beginPath();
      ctx.moveTo(bxr - px * es * w * 0.04, byr);
      ctx.lineTo(bxr + (tx - bxr) * 0.55, byr + (ty - byr) * 0.55);
      ctx.lineTo(bxr + px * es * w * 0.09, byr + h * 0.05);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Round skull: deeper chamfers than any canid — the cat's circle.
  ctx.fillStyle = C(look.coat);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.34, w * 0.34, w * 0.38, w * 0.38]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.34, w * 0.34, w * 0.38, w * 0.38]);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.14)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.2);
    ctx.fillStyle = C(look.under);
    ctx.fillRect(cx - w / 2, cy + h * 0.2, w, h * 0.3);
    ctx.restore();
  }

  // Short broad muzzle + THE SABERS. The muzzle barely leaves the
  // skull (the feline read); the fangs drop from its leading corners,
  // splayed a whisker outward, ivory over everything.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.2;
    const by0 = cy + fy * w * 0.2 * ys + h * 0.12;
    const sl = w * (0.14 + 0.12 * profileK);
    const tx = bx0 + fx * sl;
    const ty = by0 + fy * sl * ys + h * 0.06;
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.2 * (1 - profileK * 0.15);
    const ht = hb * 0.85;
    ctx.fillStyle = C(shade(look.coat, 6));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    // Dark nose leather at the muzzle tip.
    ctx.fillStyle = C(look.earIn);
    ctx.beginPath();
    facetCircle(ctx, tx, ty - h * 0.04, w * 0.06, 5, fx);
    ctx.fill();
    // The sabers: two tapered ivory drops off the muzzle corners.
    if (!o.hurt) {
      ctx.fillStyle = look.fang;
      for (const es of [-1, 1]) {
        // At full profile the far saber hides behind the near one.
        if (Math.abs(fx) > 0.75 && es * py < 0) continue;
        const fx0 = tx + nx * es * ht * 0.72;
        const fy0 = ty + ny * es * ht * 0.72 + h * 0.06;
        const drop = h * 0.52;
        ctx.beginPath();
        ctx.moveTo(fx0 - w * 0.035, fy0);
        ctx.lineTo(fx0 + w * 0.035, fy0);
        ctx.lineTo(fx0 + px * es * w * 0.03 + fx * w * 0.02, fy0 + drop);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // The eyes: pale gold-green, set wide, unblinking.
  if (!o.dead && fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.08 + px * es * w * 0.3;
      const ey = cy + (fy * w * 0.08 + py * es * w * 0.3) * ys - h * 0.12;
      ctx.fillStyle = o.hurt ? '#ffffff' : look.eye;
      ctx.fillRect(ex - s * 0.016, ey - s * 0.014, s * 0.032, s * 0.028);
      if (!o.hurt) {
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(ex - s * 0.005, ey - s * 0.012, s * 0.01, s * 0.024);
      }
    }
  }
}
/**
 * The lynx: the tufted shadow of the deep wood, designed around FOUR
 * reads no other beast owns — black EAR TUFTS spiking off triangular
 * ears, the pale facial RUFF framing the face in fur chops, a
 * black-tipped BOBTAIL perched high, and a RUMP-HIGH topline on legs
 * longer than a wolf's (the cat's mass sits over its haunches, the
 * inverse of the wolf's shoulder keel). Rosette spots write the coat.
 */
export interface LynxLook {
  coat: string;
  /** Rosette ink — the spots that name the cat. */
  rosette: string;
  under: string;
  /** Dark streaks seaming the pale ruff chops. */
  ruffDark: string;
  earIn: string;
  /** Ear-tuft and tail-tip ink. Tufts are STROKES (the fur-dialect law). */
  tuft: string;
  eye: string;
  /** Nose-leather ink — the downward triangle every cat face carries. */
  nose: string;
  bodyW: number;
  backH: number;
  /** The cat carries its mass BEHIND: extra height ramped over the haunches. */
  haunchH: number;
  /** A modest shoulder rise — always below the haunch line. */
  shoulderH: number;
  chestH: number;
  tuckH: number;
  headW: number;
  headH: number;
  /**
   * The duskruff dresses further: the storm mantle, silver grizzle,
   * and the old scar rake. Champions never roll a cluster — the
   * duskruff is a DESIGN (the packlord law).
   */
  champion?: boolean;
  grizzle?: string;
  scar?: string;
  seed?: number;
}
export const LYNX_LOOKS: Record<string, LynxLook> = {
  lynx: {
    coat: '#9c7f55',
    rosette: '#5d4a33',
    under: '#d8cdb4',
    ruffDark: '#4a3c2c',
    earIn: '#3d3226',
    tuft: '#332e2a',
    eye: '#cfd97a',
    nose: '#7a4448',
    bodyW: 0.15,
    backH: 0.47,
    haunchH: 0.12,
    shoulderH: 0.045,
    chestH: 0.24,
    tuckH: 0.35,
    headW: 0.27,
    headH: 0.225,
  },
  // The year's litter: the head and paws lead the body — cub
  // proportions, rolled into the same coat clusters as the tribe.
  lynx_young: {
    coat: '#9c7f55',
    rosette: '#5d4a33',
    under: '#d8cdb4',
    ruffDark: '#4a3c2c',
    earIn: '#3d3226',
    tuft: '#332e2a',
    eye: '#cfd97a',
    nose: '#7a4448',
    bodyW: 0.125,
    backH: 0.39,
    haunchH: 0.1,
    shoulderH: 0.035,
    chestH: 0.19,
    tuckH: 0.29,
    headW: 0.25,
    headH: 0.21,
  },
  // The duskruff: storm-slate where the pack runs tawny, and marked in
  // SILVER rosettes — the inverse of the pack's dark spots, the way
  // the dire wolf's brush ends pale where the pack's ends dark. Her
  // ONE silhouette element is THE GREAT RUFF: a storm collar of
  // layered fur chops no lean lynx carries.
  lynx_champion: {
    coat: '#565064',
    rosette: '#8d8a9c',
    under: '#9d99a8',
    ruffDark: '#3a3546',
    earIn: '#322d3c',
    tuft: '#332e3a',
    eye: '#ffd24d',
    nose: '#403a4c',
    bodyW: 0.2,
    backH: 0.58,
    haunchH: 0.17,
    shoulderH: 0.06,
    chestH: 0.27,
    tuckH: 0.42,
    headW: 0.34,
    headH: 0.27,
    champion: true,
    grizzle: '#8f8c9e',
    scar: '#8a8494',
  },
};
/**
 * THE COAT CLUSTERS (the gnoll law, spoken feline): four curated wild
 * colorways a spawned tribe spreads across — never a random hue roll,
 * always one of the four coats the wood actually breeds.
 */
export const LYNX_CLUSTERS: ReadonlyArray<Pick<LynxLook, 'coat' | 'under' | 'rosette' | 'ruffDark'>> = [
  // Dun — the common tawny.
  { coat: '#9c7f55', under: '#d8cdb4', rosette: '#5d4a33', ruffDark: '#4a3c2c' },
  // Ash — the grey shade of the old burns.
  { coat: '#8a8a80', under: '#cfcabb', rosette: '#54514a', ruffDark: '#45423c' },
  // Rufous — the red cats of the bracken slopes.
  { coat: '#a4744a', under: '#d9c4a4', rosette: '#66452c', ruffDark: '#523823' },
  // Frost — the pale winter-born.
  { coat: '#b0a98f', under: '#e2dcc8', rosette: '#6a5f4c', ruffDark: '#57503f' },
];
export const LYNX_LOOK_CACHE = new Map<string, LynxLook>();
/**
 * THE MUSCLED LIMB: the lynx's leg is drawn as MASS, never as stick
 * strokes — a filled haunch ball feeding a tapered thigh, a slim hock,
 * and the oversized paw a snow-cat actually stands on. Every shape is
 * built in the solved bones' own frames (hip→knee, knee→paw), so the
 * masses articulate honestly through all eight facing bands, the
 * pounce stretch, and every mid-turn joint memory — flat value planes
 * per the forge law, one coat family per cluster.
 */
export function drawCatLimb(
  ctx: CanvasRenderingContext2D,
  o: {
    hipX: number;
    hipY: number;
    kx: number;
    ky: number;
    ex: number;
    ey: number;
    /** Upper-leg thickness in px (spec.legW × scale). */
    w: number;
    s: number;
    hind: boolean;
    coat: string;
    champion: boolean;
    /** Far-side legs step into shadow so pairs never merge mid-stride. */
    far: boolean;
    hurt: boolean;
    /** Paw fill override (white mitts, seal points). Absent = the coat's dark step. */
    paw?: string;
  },
): void {
  const { hipX, hipY, kx, ky, ex, ey, w, s, hind } = o;
  const dim = o.far ? -13 : 0;
  const C = (c: string): string => (o.hurt ? '#ffffff' : shade(c, dim));
  // Segment frames.
  const u1x = kx - hipX;
  const u1y = ky - hipY;
  const l1 = Math.hypot(u1x, u1y) || 1e-4;
  const p1x = -u1y / l1;
  const p1y = u1x / l1;
  const u2x = ex - kx;
  const u2y = ey - ky;
  const l2 = Math.hypot(u2x, u2y) || 1e-4;
  const p2x = -u2y / l2;
  const p2y = u2x / l2;

  // The thigh (or upper arm): a tapered quad, broad at the body and
  // pulling in toward the joint. The hind thigh is the biggest muscle
  // on the animal; the foreleg column runs leaner.
  const wHip = w * (hind ? 1.35 : 1.05);
  const wKnee = w * (hind ? 0.62 : 0.58);
  ctx.fillStyle = C(shade(o.coat, hind ? -10 : -14));
  ctx.beginPath();
  ctx.moveTo(hipX + p1x * wHip, hipY + p1y * wHip);
  ctx.lineTo(kx + p1x * wKnee, ky + p1y * wKnee);
  ctx.lineTo(kx - p1x * wKnee, ky - p1y * wKnee);
  ctx.lineTo(hipX - p1x * wHip, hipY - p1y * wHip);
  ctx.closePath();
  ctx.fill();

  // The shank: hock or forearm, slim and tapering to the ankle.
  const wShin = w * 0.55;
  const wAnkle = w * 0.4;
  ctx.fillStyle = C(shade(o.coat, -22));
  ctx.beginPath();
  ctx.moveTo(kx + p2x * wShin, ky + p2y * wShin);
  ctx.lineTo(ex + p2x * wAnkle, ey + p2y * wAnkle);
  ctx.lineTo(ex - p2x * wAnkle, ey - p2y * wAnkle);
  ctx.lineTo(kx - p2x * wShin, ky - p2y * wShin);
  ctx.closePath();
  ctx.fill();

  // Joint fill: a disc bridging the two quads so the knee/hock never
  // opens a wedge of daylight mid-stride.
  ctx.fillStyle = C(shade(o.coat, -16));
  ctx.beginPath();
  ctx.arc(kx, ky, w * 0.58, 0, Math.PI * 2);
  ctx.fill();

  // THE HAUNCH BALL (hind) / shoulder chip (fore): the muscle mass
  // seated over the limb's root, riding the thigh's own angle so it
  // rolls with the stride instead of sticking to the body like a
  // decal. This is what makes the leg read FED, not scrawny.
  const massR = w * (hind ? 1.6 : 1.1);
  const mx = hipX + (u1x / l1) * l1 * (hind ? 0.2 : 0.16);
  const my = hipY + (u1y / l1) * l1 * (hind ? 0.2 : 0.16);
  ctx.fillStyle = C(shade(o.coat, hind ? -5 : -9));
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(Math.atan2(u1y, u1x));
  ctx.beginPath();
  ctx.ellipse(0, 0, massR, massR * 0.76, 0, 0, Math.PI * 2);
  ctx.fill();
  // One quiet under-edge on the mass — a stroke, never a bright rim —
  // so the muscle separates from the flank it overlaps.
  if (!o.hurt) {
    ctx.strokeStyle = shade(o.coat, -30 + dim);
    ctx.lineWidth = Math.max(1, s * 0.014);
    ctx.beginPath();
    ctx.ellipse(0, 0, massR, massR * 0.76, 0, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
  ctx.restore();

  // THE PAW: broad and snowshoe-big, seated square on the shank's own
  // axis, with the toe cleft seams that read at the sheet zoom and
  // vanish quietly at world zoom.
  const pw = w * 0.95;
  const shinA = Math.atan2(ey - ky, ex - kx);
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(shinA - Math.PI / 2);
  ctx.fillStyle = C(o.paw ?? shade(o.coat, -32));
  ctx.beginPath();
  ctx.ellipse(0, pw * 0.1, pw * 0.72, pw * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!o.hurt && s > 100) {
    ctx.strokeStyle = shade(o.coat, -48 + dim);
    ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.lineCap = 'round';
    for (const t of [-0.3, 0.3]) {
      ctx.beginPath();
      ctx.moveTo(t * pw * 0.4, pw * 0.22);
      ctx.lineTo(t * pw * 0.48, pw * 0.5);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  ctx.restore();
}
/**
 * THE HOUSE CAT — the hearth's shadow, the first animal in the game
 * that exists purely for company. Nothing here is borrowed from the
 * lynx beyond the feline LAWS it must obey (the flat muzzle plate,
 * the canid wedge ban, the long-thigh bones): where the lynx is a
 * wild ambusher built on four predator reads, the house cat is built
 * on WARDROBE and CARRIAGE — a curated coat cabinet a whole town's
 * cats spread across (seeded, never random-hued), the raised
 * question-mark tail no wild cat carries, and THE SIT, the settled
 * upright rest that says "domestic" from across a market square.
 */
export interface HousecatLook {
  /** Base coat. */
  coat: string;
  /** Underparts: belly, chest, muzzle plate — and the tuxedo's dress. */
  under: string;
  /** Pattern ink: tabby bars, the cap, patches, the points. */
  mark: string;
  /** Second patch ink (calico, tortoiseshell). */
  mark2?: string;
  /** Inner-ear fan. */
  earIn: string;
  eye: string;
  nose: string;
  /**
   * The written pattern. 'solid' wears the coat plain; 'tabby' bars
   * the back and flanks and writes the crown M; 'bicolor' carries
   * white underparts high up the flank; 'tuxedo' is the black dress
   * over a white bib and blaze; 'capped' is a clean pale body under
   * a dark skullcap (the head painter owns the cap); 'patched'
   * scatters seeded color patches (calico, tortie); 'points' darkens
   * the extremities only — mask, ears, paws, tail.
   */
  pattern: 'solid' | 'tabby' | 'bicolor' | 'tuxedo' | 'capped' | 'patched' | 'points';
  /**
   * Long hair reads in the TAIL first (the plume vs the whip), then
   * the cheek fluff, the chest ruff, and the belly fringe.
   */
  longhair: boolean;
  /** Tail dress: ringed (the raccoon read), dark-tipped, plain coat, or mark-dark end to end. */
  tail: 'rings' | 'tip' | 'coat' | 'dark';
  /** White mitts on all four paws. */
  mitts?: boolean;
  /** The chest locket — one pale patch where the collarbones meet. */
  locket?: boolean;
  /** Body half-width (tiles); length comes from the BeastSpec. */
  bodyW: number;
  backH: number;
  /** The mild rump rise — a kept cat, never the lynx's coiled ramp. */
  haunchH: number;
  shoulderH: number;
  chestH: number;
  tuckH: number;
  headW: number;
  headH: number;
  seed?: number;
}
export const HOUSECAT_BASE = {
  bodyW: 0.115,
  backH: 0.3,
  haunchH: 0.05,
  shoulderH: 0.03,
  chestH: 0.16,
  tuckH: 0.21,
  headW: 0.24,
  headH: 0.2,
};
export type HousecatCoat = Omit<HousecatLook, keyof typeof HOUSECAT_BASE | 'seed'>;
export const HOUSECAT_LOOK_CACHE = new Map<string, HousecatLook>();
/**
 * The house cat's body: a compact level-backed loaf on the block
 * dialect, morphing continuously into THE SIT — haunches folded
 * under, spine sloping up to a lifted chest — as `sitK` rises. The
 * sit is the species' whole domestic identity, so the morph is a
 * first-class body state, not a pose hack: footprint, topline, and
 * belly all interpolate, and the folded haunch paints as real mass.
 */
export function paintHousecatBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: HousecatLook,
  f: BeastBlockFrame,
  sitK = 0,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  const k = Math.max(0, Math.min(1, sitK));
  // Seated, the body shortens (the loaf gathers) and the rump
  // spreads a little where the haunches fold out.
  const rearX = (X: number): number => (X < 0 ? X * (1 - 0.22 * k) : X * (1 - 0.06 * k));
  const rearW = (X: number, Y: number): number => (X < -hl * 0.2 ? Y * (1 + 0.16 * k) : Y);
  const foot: Array<[number, number]> = (
    [
      [hl, -hw * 0.72],
      [hl, hw * 0.72],
      [hl * 0.5, hw * 0.9],
      [-hl * 0.3, hw],
      [-hl, hw * 0.82],
      [-hl, -hw * 0.82],
      [-hl * 0.3, -hw],
      [hl * 0.5, -hw * 0.9],
    ] as Array<[number, number]>
  ).map(([X, Y]) => [rearX(X), rearW(X, Y)] as [number, number]);
  const coat = shade(look.coat, (((f.seed >>> 5) & 7) - 3) * 2);
  // Standing topline: near-level with a soft shoulder and a mild
  // haunch rise (a kept cat, never the lynx's ramp), the neck root
  // easing away at the front. Seated topline: the rump settles and
  // the spine climbs to a chest carried high.
  const standTop = (X: number): number =>
    look.backH +
    look.shoulderH * Math.max(0, X / hl - 0.2) +
    look.haunchH * Math.max(0, (-X / hl - 0.1) / 0.7) -
    0.05 * Math.max(0, (X / hl - 0.66) / 0.34);
  const sitTop = (X: number): number => {
    const t = (X / hl + 1) / 2; // 0 rump .. 1 chest
    return 0.2 + 0.24 * t * t + 0.04 * Math.max(0, 0.3 - Math.abs(t - 0.25));
  };
  const standBot = (X: number): number =>
    look.chestH + (look.tuckH - look.chestH) * Math.min(1, Math.max(0, (0.5 - X / hl) / 1.05));
  const sitBot = (X: number): number => {
    const t = (X / hl + 1) / 2;
    return 0.02 + 0.2 * t * t;
  };
  paintBlockBody(
    ctx,
    f,
    foot,
    (X) => standTop(X) * (1 - k) + sitTop(X) * k,
    (X) => standBot(X) * (1 - k) + sitBot(X) * k,
    coat,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      const bh = look.backH * tk * s;
      const mark = look.mark;
      // ---- THE WHITE UNDERSIDE: bicolor and tuxedo carry pale
      // underparts up the flank — a wash along the belly line, deeper
      // on the bicolor. Rides the belly's own lift coupling.
      if (look.pattern === 'bicolor' || look.pattern === 'tuxedo') {
        const deep = look.pattern === 'bicolor' ? 0.52 : 0.4;
        ctx.fillStyle = look.under;
        ctx.beginPath();
        for (let i = 0; i <= 8; i++) {
          const X = (-0.95 + (1.85 * i) / 8) * hl * (1 - 0.14 * k);
          const y = gyy(X, 0) - bh * (0.16 + 0.05 * Math.sin(i * 2.1 + f.seed)) - lift * 0.6;
          if (i === 0) ctx.moveTo(gx(X, 0), y);
          else ctx.lineTo(gx(X, 0), y);
        }
        for (let i = 8; i >= 0; i--) {
          const X = (-0.95 + (1.85 * i) / 8) * hl * (1 - 0.14 * k);
          ctx.lineTo(gx(X, 0), gyy(X, 0) - bh * (0.16 - deep) - lift * 0.6);
        }
        ctx.closePath();
        ctx.fill();
      }
      // ---- THE TABBY SCRIPT: a doubled spine line and curved rib
      // bars — STROKES, never fills (the fur-dialect law), seeded so
      // no two tabbies bar alike.
      if (look.pattern === 'tabby') {
        ctx.strokeStyle = mark;
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(1, s * 0.02);
        // The spine pair.
        for (const s2 of [-0.03, 0.03]) {
          ctx.beginPath();
          for (let i = 0; i <= 6; i++) {
            const X = (-0.85 + (1.6 * i) / 6) * hl * (1 - 0.14 * k);
            const px2 = gx(X, s2 * hl);
            const py2 = gyy(X, s2 * hl) - bh * 0.98 - lift;
            if (i === 0) ctx.moveTo(px2, py2);
            else ctx.lineTo(px2, py2);
          }
          ctx.stroke();
        }
        // The rib bars: SHORT bowed strokes off the spine, stopping
        // at mid-flank with seeded lengths — a written coat, never a
        // rib cage (the first cut's evenly-ruled ladder read skeletal).
        ctx.lineWidth = Math.max(1, s * 0.022);
        ctx.globalAlpha = 0.85;
        for (let b = 0; b < 4; b++) {
          const rr = ((((f.seed >>> (b % 11)) * 2654435761 + b * 131) >>> 0) % 1000) / 1000;
          const X = (-0.55 + 0.34 * b + (rr - 0.5) * 0.12) * hl * (1 - 0.14 * k);
          const reach = 0.45 + 0.25 * rr;
          for (const side of [-1, 1]) {
            const x0 = gx(X, side * hw * 0.16);
            const y0 = gyy(X, side * hw * 0.16) - bh * (0.96 - 0.03 * rr) - lift;
            const x1 = gx(X - hl * 0.1, side * hw * reach);
            const y1 = gyy(X - hl * 0.1, side * hw * reach) - bh * (0.62 - 0.08 * rr) - lift * 0.9;
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.quadraticCurveTo(
              gx(X - hl * 0.01, side * hw * reach * 0.55),
              gyy(X - hl * 0.01, side * hw * reach * 0.55) - bh * 0.82 - lift,
              x1,
              y1,
            );
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
        ctx.lineCap = 'butt';
      }
      // ---- THE PATCH WORK: calico and tortie scatter seeded color
      // islands over back and shoulders — big enough to read at
      // world zoom, alternating the two inks.
      if (look.pattern === 'patched') {
        const n = look.mark2 ? 5 : 4;
        for (let i = 0; i < n; i++) {
          const rr = ((((f.seed >>> (i % 13)) * 2654435761 + i * 197) >>> 0) % 1000) / 1000;
          const X = (-0.72 + 0.34 * i + (rr - 0.5) * 0.18) * hl * (1 - 0.14 * k);
          const Y = ((i & 1) === 0 ? 1 : -1) * hw * (0.1 + 0.5 * rr);
          ctx.fillStyle = i % 2 === 0 && look.mark2 ? look.mark2 : mark;
          ctx.beginPath();
          facetBlob(
            ctx,
            gx(X, Y),
            gyy(X, Y) - bh * (0.75 + 0.12 * rr) - lift,
            s * (0.055 + 0.03 * rr),
            (f.seed >>> i) | 1,
            7,
            0.8,
            0.5,
          );
          ctx.fill();
        }
      }
      // ---- THE POINTS SHADE: the seal's warmth gathers over the
      // rump — a quiet gradient hint, the extremities carry the ink.
      if (look.pattern === 'points') {
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = mark;
        ctx.beginPath();
        facetBlob(ctx, gx(-hl * 0.55, 0), gyy(-hl * 0.55, 0) - bh * 0.8 - lift, hl * s * 0.42, f.seed | 1, 8, 0.8, 0.6);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // ---- THE LOCKET: one pale patch where the collarbones meet —
      // reads only while the chest can face the camera (the bib law).
      if ((look.locket || look.pattern === 'tuxedo') && f.fy > -0.15) {
        ctx.fillStyle = look.under;
        ctx.beginPath();
        facetBlob(
          ctx,
          gx(hl * 0.88, 0),
          gyy(hl * 0.88, 0) - (look.chestH + 0.07 + 0.1 * k) * s - lift * 0.8,
          hw * s * (look.pattern === 'tuxedo' ? 0.72 : 0.42),
          f.seed ^ 0x55,
          7,
          0.85,
          look.pattern === 'tuxedo' ? 1.6 : 1.1,
        );
        ctx.fill();
      }
      // ---- THE FOLDED HAUNCH: seated, the hind leg is a real mass
      // on the camera-side flank — a thigh disc with a quiet
      // under-edge, and a folded paw hint peeking at its base.
      if (k > 0.3) {
        const side = f.fx >= 0 ? 1 : -1;
        const hx = gx(-hl * 0.42, side * hw * 0.55);
        const hy = gyy(-hl * 0.42, side * hw * 0.55) - bh * 0.32 - lift * 0.6;
        ctx.globalAlpha = Math.min(1, (k - 0.3) / 0.4);
        ctx.fillStyle = shade(coat, -6);
        ctx.beginPath();
        ctx.ellipse(hx, hy, hl * s * 0.34, hl * s * 0.27, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = shade(coat, -26);
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.ellipse(hx, hy, hl * s * 0.34, hl * s * 0.27, 0, Math.PI * 0.1, Math.PI * 0.9);
        ctx.stroke();
        // The folded paw: one toe chip under the thigh's front edge.
        ctx.fillStyle = look.mitts ? look.under : shade(coat, -20);
        ctx.beginPath();
        ctx.ellipse(hx + hl * s * 0.26, hy + hl * s * 0.2, s * 0.032, s * 0.02, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // ---- THE LONG COAT: fluff along the belly fringe and the
      // stern britches — chop strokes, restrained at world zoom.
      if (look.longhair && s > 70) {
        ctx.strokeStyle = shade(coat, -14);
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
          const rr = ((((f.seed >>> (i % 7)) * 2654435761 + i * 61) >>> 0) % 1000) / 1000;
          const X = (-0.8 + 0.3 * i) * hl * (1 - 0.14 * k);
          const x0 = gx(X, 0);
          const y0 = gyy(X, 0) - bh * (0.2 - 0.16 * k) - lift * 0.6;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x0 + (rr - 0.5) * s * 0.03, y0 + s * (0.035 + 0.015 * rr));
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
      }
    },
  );
}
/**
 * The house cat's head — the feline grammar (the lynx's law: a FLAT
 * face, the muzzle plate barely leaving the skull at profile, the
 * canid wedge banned forever) recut CUTE: a round skull, eyes a full
 * size up from any wild cat's, small neat ears on the elastic pair,
 * the pink leather triangle, and the whisker fan at close zoom. The
 * ears ride EarSim — they lag the turn, flap with the trot, and
 * flick at rest; sim-less callers get THE ONE REST.
 */
export function drawHousecatHead(
  ctx: CanvasRenderingContext2D,
  look: HousecatLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** Wall clock for the ear sim and the blink; absent = settled rest. */
    nowMs?: number;
    ears?: EarSim;
    /** 0..1 through THE SIT — steadies the ears, slows the blink. */
    sitK?: number;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const sitK = o.sitK ?? 0;
  const capped = look.pattern === 'capped';
  const pointed = look.pattern === 'points';

  // ---- THE EAR IS A SIMULATION: small stiff triangles on the fox's
  // exact contract — one 3D carriage, projected; the sim adds the
  // turn lag, the trot flap, and the idle flick that makes a cat's
  // ears the most alive thing on its body.
  const dir = Math.atan2(fy, fx);
  const pin = 0;
  const carr: EarCarriage = {
    azimuth: 2.05,
    rootR: look.headW * 0.24,
    // Roots high on the crown and blades a shade longer than the
    // first cut: at the back-quarter bands the far blade must clear
    // the skull's silhouette — a cat from behind reads as TWO ears
    // (the fox's from-behind law, at kitten scale) — while staying
    // well under the lynx's tufted towers.
    rootLift: look.headH * 0.52,
    length: look.headW * 0.5,
    spread: 0.55,
    rise: 1.35,
    curl: [0, 0.04, 0.1],
  };
  if (o.ears && !o.dead && o.nowMs) o.ears.update(cx, cy, s, carr, dir, pin, o.nowMs);
  const chains = ([-1, 1] as const).map((side) =>
    o.ears && !o.dead
      ? o.ears.chain(side, carr, dir, pin)
      : earRestChain(side, carr, { dir, pin: o.dead ? 0.5 : 0, sway: 0 }),
  );
  // Cap and points dress the ear backs in the mark ink; every other
  // coat keeps its own fur.
  const earBack = capped || pointed ? look.mark : shade(look.coat, -8);
  const earW0 = w * 0.135;
  const paintEar = (chain: { pts: Array<{ x: number; y: number }>; depth: number }): void => {
    const pts = chain.pts.map((p) => ({ x: cx + p.x * s, y: cy + p.y * s }));
    const prof = [1, 0.74, 0.4, 0];
    const ea: Array<{ x: number; y: number }> = [];
    const eb: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 4; i++) {
      const a = pts[Math.max(0, i - 1)]!;
      const b = pts[Math.min(3, i + 1)]!;
      let tx = b.x - a.x;
      let ty = b.y - a.y;
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      const ww = earW0 * prof[i]!;
      ea.push({ x: pts[i]!.x + ty * ww, y: pts[i]!.y - tx * ww });
      eb.push({ x: pts[i]!.x - ty * ww, y: pts[i]!.y + tx * ww });
    }
    const da = Math.hypot(ea[1]!.x - cx, ea[1]!.y - cy);
    const db = Math.hypot(eb[1]!.x - cx, eb[1]!.y - cy);
    const lead = da >= db ? ea : eb;
    const trail = da >= db ? eb : ea;
    const blade = (): void => {
      ctx.beginPath();
      ctx.moveTo(trail[0]!.x, trail[0]!.y);
      ctx.lineTo(lead[0]!.x, lead[0]!.y);
      ctx.lineTo(lead[1]!.x, lead[1]!.y);
      ctx.lineTo(pts[3]!.x, pts[3]!.y);
      ctx.lineTo(trail[1]!.x, trail[1]!.y);
      ctx.closePath();
    };
    ctx.lineJoin = 'round';
    ctx.fillStyle = C(earBack);
    blade();
    ctx.fill();
    if (o.hurt) return;
    // The pale inner fan, camera-facing bands only.
    if (fy > 0.02 && !o.dead) {
      ctx.fillStyle = look.earIn;
      ctx.beginPath();
      ctx.moveTo(pts[0]!.x + (trail[0]!.x - pts[0]!.x) * 0.4, pts[0]!.y + (trail[0]!.y - pts[0]!.y) * 0.4);
      ctx.lineTo(pts[0]!.x + (lead[0]!.x - pts[0]!.x) * 0.5, pts[0]!.y + (lead[0]!.y - pts[0]!.y) * 0.5);
      ctx.lineTo(pts[2]!.x * 0.7 + pts[3]!.x * 0.3, pts[2]!.y * 0.7 + pts[3]!.y * 0.3);
      ctx.closePath();
      ctx.fill();
    }
  };
  const earsBack = chains.filter((c) => c.depth <= 0);
  const earsFront = chains.filter((c) => c.depth > 0);
  for (const c of earsBack) paintEar(c);

  // ---- The skull: one round mass — the cute read starts here.
  ctx.fillStyle = C(look.coat);
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.54, h * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();

  // ---- THE CAP: the dark skullcap rides the top of the head — this
  // camera always sees tops (the 2.5D law), so the cap reads at
  // every band; it slides toward the back of the skull as the face
  // comes to camera.
  if (capped && !o.hurt) {
    ctx.fillStyle = look.mark;
    ctx.beginPath();
    ctx.ellipse(cx - fx * w * 0.1, cy - fy * w * 0.1 * ys - h * 0.3, w * 0.42, h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // ---- THE MASK: the seal's warm face, gathered on the muzzle side.
  if (pointed && !o.hurt && !o.dead && fy > -0.4) {
    ctx.fillStyle = look.mark;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(cx + fx * w * 0.3, cy + fy * w * 0.3 * ys + h * 0.06, w * 0.3, h * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // ---- The tabby M: three crown strokes between the ears.
  if (look.pattern === 'tabby' && !o.hurt && !o.dead && fy > -0.25) {
    ctx.strokeStyle = look.mark;
    ctx.lineWidth = Math.max(1, w * 0.05);
    ctx.lineCap = 'round';
    for (const t of [-0.16, 0, 0.16]) {
      const mx = cx - fx * w * 0.12 + px * t * w;
      const my = cy + (-fy * w * 0.12 + py * t * w) * ys - h * 0.32;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + fx * w * 0.1 + px * t * w * 0.35, my + (fy * w * 0.1 + py * t * w * 0.35) * ys + h * 0.14);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  // ---- The longhair cheek fluff: jaw chops framing the round face.
  if (look.longhair && !o.hurt && !o.dead && fy > -0.35) {
    ctx.fillStyle = C(shade(look.coat, -7));
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.7 && es * py < 0) continue;
      const jx = cx + px * es * w * 0.48 + fx * w * 0.1;
      const jy = cy + (py * es * w * 0.48 + fy * w * 0.1) * ys + h * 0.18;
      ctx.beginPath();
      ctx.moveTo(jx - px * es * w * 0.08, jy - h * 0.12);
      ctx.lineTo(jx + px * es * w * 0.16, jy + h * 0.02);
      ctx.lineTo(jx + px * es * w * 0.02, jy + h * 0.16);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ---- THE FLAT FACE: the pale muzzle plate sits ON the skull and
  // barely leaves it at profile (the lynx law — the canid wedge is
  // banned on felines forever). Small: the cute ratio keeps the eyes
  // the biggest thing on the face.
  const profileK = Math.abs(fx);
  const sl = w * (0.06 + 0.07 * profileK);
  const mx0 = cx + fx * (w * 0.3 + sl);
  const my0 = cy + fy * (w * 0.3 + sl) * ys + h * 0.16;
  if (!o.dead && fy > -0.35) {
    ctx.fillStyle = C(pointed ? shade(look.mark, 30) : look.under);
    ctx.beginPath();
    ctx.ellipse(mx0, my0, w * 0.26, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!o.hurt) {
      // The whisker pads: two soft mounds under the nose.
      ctx.fillStyle = C(pointed ? shade(look.mark, 38) : shade(look.under, 6));
      for (const es of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(mx0 + px * es * w * 0.1, my0 + py * es * w * 0.1 * ys + h * 0.02, w * 0.11, h * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // The nose leather: the pink downward triangle.
      ctx.fillStyle = C(look.nose);
      ctx.beginPath();
      ctx.moveTo(mx0 - px * w * 0.055, my0 - h * 0.08);
      ctx.lineTo(mx0 + px * w * 0.055, my0 - h * 0.08);
      ctx.lineTo(mx0, my0 - h * 0.01);
      ctx.closePath();
      ctx.fill();
      // Philtrum and chin: the sewn seam under the leather.
      ctx.strokeStyle = shade(look.under, -34);
      ctx.lineWidth = Math.max(1, w * 0.028);
      ctx.beginPath();
      ctx.moveTo(mx0, my0 - h * 0.01);
      ctx.lineTo(mx0, my0 + h * 0.06);
      ctx.stroke();
      // The whisker fan: three pale arcs per side, close zoom only.
      if (s > 90) {
        ctx.strokeStyle = 'rgba(240, 236, 224, 0.75)';
        ctx.lineWidth = Math.max(0.8, w * 0.018);
        ctx.lineCap = 'round';
        for (const es of [-1, 1]) {
          if (Math.abs(fx) > 0.75 && es * py < 0) continue;
          for (let wi = 0; wi < 3; wi++) {
            const wy0 = my0 + py * es * w * 0.1 * ys + h * (0.0 + 0.03 * wi);
            const wx0 = mx0 + px * es * w * 0.1;
            ctx.beginPath();
            ctx.moveTo(wx0, wy0);
            ctx.quadraticCurveTo(
              wx0 + px * es * w * 0.34,
              wy0 - h * (0.06 - 0.05 * wi),
              wx0 + px * es * w * 0.55,
              wy0 + h * (0.02 * wi - 0.02),
            );
            ctx.stroke();
          }
        }
        ctx.lineCap = 'butt';
      }
    }
  }

  // ---- THE EYES: the biggest feature on the face — round-cut
  // almonds, dark-lined, the vertical pupil, one light chip, and the
  // BLINK: a seeded once-in-a-while shutter, and the long slow
  // half-blink while sitting (the cat's own word for trust).
  if (!o.dead && fy > -0.42) {
    let blink = 0;
    if (o.nowMs && !o.hurt) {
      const phase = ((look.seed ?? 0) % 89) * 97;
      const cyc = sitK > 0.6 ? 5200 : 7400;
      const t2 = (o.nowMs + phase) % cyc;
      const dur = sitK > 0.6 ? 620 : 150;
      if (t2 < dur) blink = Math.sin((t2 / dur) * Math.PI) * (sitK > 0.6 ? 0.65 : 1);
    }
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.62 && es * py < 0) continue;
      const ex = cx + fx * w * 0.16 + px * es * w * 0.26;
      const ey = cy + (fy * w * 0.16 + py * es * w * 0.26) * ys - h * 0.08;
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(es * 0.16);
      const ew = w * 0.15;
      const eh = h * 0.13 * (1 - 0.85 * blink);
      // The liner first, then the iris inside it.
      ctx.fillStyle = C('#2a2430');
      ctx.beginPath();
      ctx.ellipse(0, 0, ew * 1.14, eh * 1.2 + h * 0.008, 0, 0, Math.PI * 2);
      ctx.fill();
      if (!o.hurt) {
        ctx.fillStyle = look.eye;
        ctx.beginPath();
        ctx.ellipse(0, 0, ew, eh, 0, 0, Math.PI * 2);
        ctx.fill();
        if (eh > h * 0.03) {
          // The vertical pupil, soft-edged at this size.
          ctx.fillStyle = OUTLINE;
          ctx.beginPath();
          ctx.ellipse(0, 0, ew * 0.24, eh * 0.92, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 250, 235, 0.9)';
          ctx.beginPath();
          ctx.ellipse(ew * 0.4, -eh * 0.35, ew * 0.16, eh * 0.2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }
  // Dead: quiet closed lids.
  if (o.dead && !o.hurt && fy > -0.42) {
    ctx.strokeStyle = shade(look.coat, -30);
    ctx.lineWidth = Math.max(1, w * 0.03);
    for (const es of [-1, 1]) {
      const ex = cx + fx * w * 0.16 + px * es * w * 0.26;
      const ey = cy + (fy * w * 0.16 + py * es * w * 0.26) * ys - h * 0.08;
      ctx.beginPath();
      ctx.moveTo(ex - w * 0.1, ey);
      ctx.lineTo(ex + w * 0.1, ey);
      ctx.stroke();
    }
  }

  for (const c of earsFront) paintEar(c);
}
