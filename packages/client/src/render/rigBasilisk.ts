/**
 * THE STONE COURT — the basilisk, its clusters and its tail.
 * Split out of rig.ts on the golems.ts template (foundations F3.4);
 * rig.ts re-exports everything here, so every lab, test and painter
 * keeps its old door.
 */
import { facetBlob, facetCircle } from './shapes.js';
import { BobtailDrawOpts } from './tail.js';
import { shade } from './tint.js';
// The engine's shared grammar comes back from rig.ts — the same
// deferred cycle golems.ts has always ridden (touched only at draw
// time, long after both modules initialize).
import { paintBlockBody } from './rigKit.js';
import type { BeastBlockFrame, BeastSpec } from './rig.js';

export interface BasiliskLook {
  /** Body base hide. */
  hide: string;
  /** The canonical yellowish underbelly + throat + jaw shovel. */
  belly: string;
  /** Osteoderm scute rows — a step BRIGHTER than the hide (the
   *  turtle mail law: darker plates read as windows). */
  plate: string;
  /** Ridge saw, brow horns, claws — raised horn, its own material. */
  horn: string;
  /** Pale-green fire. */
  eye: string;
  /** Half-width of the hull (tiles). */
  bodyW: number;
  /** Back height of the block extrusion (tiles). */
  bodyH: number;
  /** Vertebral saw height (tiles). */
  ridgeH: number;
  headW: number;
  headH: number;
  /** Head-carry height above the ground line (tiles) — LOW: the
   *  court carries its skull level with the back, never raised. */
  headRise: number;
  /** Tail sim weight dial (crest heights, ring weights, settle mass). */
  tailHeavy: number;
  /** THE WEAPON OFF THE STERN: total tail length (tiles) — longer
   *  than the body on every member of the court; the sim, painter,
   *  analytic rest, corpse, and sprite bounds all read this ONE
   *  number so the tail can never be cropped or shortchanged. */
  tailLen: number;
  /** Tail root half-width (tiles) — meets the hull's stern width so
   *  the tail is the body continuing, never a rope tied on. */
  tailRootW: number;
  /** Sim rigidity 0..1 (THE UNBENDING ROOT dial). */
  tailStiff: number;
  /** Scull wave amplitude scale (the swimmer beats hardest). */
  tailWave: number;
  /** The fen cousin: keeled swimming fin instead of the saw. */
  fin?: boolean;
  /** The elder alone: horn crown, plate mass, lichen, barbels. */
  elder?: boolean;
  /** Elder lichen saddles. */
  moss?: string;
}
/**
 * Seeded hide clusters (the lynx law): wild basilisks scatter across
 * four stone-country coats, the fen line across three marsh coats —
 * hash BEFORE picking so consecutive eids never twin. The elder
 * never rolls: a crag has exactly one geology.
 */
export const BASILISK_CLUSTERS: readonly Omit<
  BasiliskLook,
  'bodyW' | 'bodyH' | 'ridgeH' | 'headW' | 'headH' | 'headRise' | 'tailHeavy' | 'tailLen' | 'tailRootW' | 'tailStiff' | 'tailWave'
>[] = [
  // Greystone: the bestiary plate — dull grey-brown, pale-green fire.
  { hide: '#6b6a52', belly: '#c9bd8e', plate: '#7d7c62', horn: '#8a8567', eye: '#b9d18c' },
  // Dun: dust-country brown, the yellowish belly strongest.
  { hide: '#75684e', belly: '#d1bf8b', plate: '#87795c', horn: '#93865f', eye: '#bcd48a' },
  // Umber: dark iron-earth, horn near-bone.
  { hide: '#5e5747', belly: '#bcab7e', plate: '#6f6754', horn: '#8f8468', eye: '#b2cc85' },
  // Mossback: green-grey stone that stood too long in one wood.
  { hide: '#5c6450', belly: '#c2bb8a', plate: '#6e765e', horn: '#848b66', eye: '#c0d792' },
];
export const ELDER_BASILISK_LOOK: BasiliskLook = {
  // Basalt-dark hide under pale worked plate — the crag, not a
  // bigger basilisk (the design-not-reskin law).
  hide: '#4f5548',
  belly: '#b5ad83',
  plate: '#666d58',
  horn: '#8c8465',
  eye: '#c6e392',
  moss: '#78885a',
  bodyW: 0.44,
  bodyH: 0.46,
  ridgeH: 0.24,
  headW: 0.42,
  headH: 0.26,
  headRise: 0.28,
  tailHeavy: 2.3,
  // The crag's tail is a felled tree: half again the body's length,
  // stone-stiff, slow.
  tailLen: 2.0,
  tailRootW: 0.2,
  tailStiff: 0.85,
  tailWave: 0.75,
  elder: true,
};
/**
 * THE COURT'S HULL: the basilisk body is a sprawled saurian trunk —
 * shoulder swell, a saddle over the mid-legs, the haunch swell where
 * the drivers root, tapering into neck and tail stubs the dedicated
 * painters continue. Painted as a block extrusion (the shared 2.5D
 * dialect) with the family's three reads layered INSIDE the
 * hull-clipped marks pass (the crab fixture law — nothing floats):
 * the yellowish BELLY BAND on the down-screen flank, the OSTEODERM
 * ROWS a step brighter than the hide, and — after the hull — the
 * VERTEBRAL SAW riding the crown by the ridge law.
 */
export function paintBasiliskBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: BasiliskLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  const { bx, gy, s, fx, fy, ys } = f;
  const px = -fy;
  const py = fx;
  const hide = shade(look.hide, (((f.seed >>> 5) & 7) - 3) * 2);
  const lift = f.bob * 0.35 * s;
  const tk = f.topScale ?? 1;

  // THE BELLY TUCKS LIKE A LION'S: the under-mass is a ground-frame
  // lens with an authored ground line — the fen keel drags a finger
  // off the mud, the elder keeps honest daylight.
  const ax = Math.abs(fx);
  const ay = Math.abs(fy);
  const brx = (hl * 0.7 * ax + hw * 0.85 * ay) * s;
  const bry = (hw * 0.4 * ax + hl * 0.26 * ay) * ys * s;
  const bellyClear = (look.elder ? 0.07 : look.fin ? 0.015 : 0.04) * s;
  ctx.fillStyle = f.hurt ? '#ffffff' : shade(look.hide, -22);
  ctx.save();
  ctx.translate(bx, gy - bellyClear - lift * 0.6 - bry);
  ctx.beginPath();
  facetBlob(ctx, 0, 0, brx, f.seed | 3, 8, bry / brx, 0.5);
  ctx.fill();
  ctx.restore();

  // The footprint: long-shouldered, waist barely pinched, haunches
  // full — a trunk built to carry six roots.
  const foot: Array<[number, number]> = [
    [hl * 0.98, -hw * 0.4],
    [hl * 0.98, hw * 0.4],
    [hl * 0.62, hw * 0.86],
    [hl * 0.2, hw * 0.94],
    [-hl * 0.14, hw * 0.88],
    [-hl * 0.52, hw * 0.98],
    [-hl * 0.9, hw * 0.6],
    [-hl * 0.9, -hw * 0.6],
    [-hl * 0.52, -hw * 0.98],
    [-hl * 0.14, -hw * 0.88],
    [hl * 0.2, -hw * 0.94],
    [hl * 0.62, -hw * 0.86],
  ];
  // The topline: shoulder swell forward, saddle amidships, the
  // haunch swell aft — never a flat prism wall (the lynx lesson at
  // reptile scale). The fen runs flatter: a log's topline.
  const swellK = look.fin ? 0.12 : 0.26;
  const topH = (X: number): number => {
    const t = X / hl;
    const shoulder = Math.exp(-Math.pow((t - 0.42) / 0.42, 2));
    const haunch = Math.exp(-Math.pow((t + 0.45) / 0.4, 2));
    return Math.max(0.04, look.bodyH * (0.78 + swellK * Math.max(shoulder, haunch * 0.92) - 0.1 * Math.pow(t, 2)));
  };
  const botH = (X: number): number => {
    const t = X / hl;
    // The belly line rides clear of the ground plane between the
    // sprawled hips, sagging lowest amidships.
    return (look.fin ? 0.035 : 0.09) + 0.03 * Math.pow(t, 2);
  };

  paintBlockBody(ctx, f, foot, topH, botH, hide, (gx, gyy) => {
    // ---- THE BELLY BAND: the canonical yellowish underbelly,
    // painted along the DOWN-SCREEN flank inside the clip so it
    // hugs the hull at every band. Pure N/S facings show back or
    // chest — the band fades out with |py|.
    const bandK = Math.min(1, Math.abs(py) * 1.6);
    if (bandK > 0.05) {
      const sgn = Math.sign(py) || 1;
      ctx.fillStyle = shade(look.belly, -6);
      // A soft margin, not a beach towel: the band stays low on the
      // flank and quiet, tapering out at nose and stern.
      ctx.globalAlpha = 0.55 * bandK;
      ctx.beginPath();
      const bandY = hw * 0.94 * sgn;
      const xs = [-0.82, -0.5, -0.1, 0.3, 0.66, 0.9];
      for (let i = 0; i < xs.length; i++) {
        const X = xs[i]! * hl;
        const h = botH(X) * 0.5 * s;
        const xq = gx(X, bandY);
        const yq = gyy(X, bandY) - h - lift * 0.6;
        if (i === 0) ctx.moveTo(xq, yq);
        else ctx.lineTo(xq, yq);
      }
      for (let i = xs.length - 1; i >= 0; i--) {
        const X = xs[i]! * hl;
        // The inner edge pinches to nothing at both ends — a lens of
        // pale, widest amidships.
        const endK = 1 - Math.pow(Math.abs(xs[i]!) / 0.92, 2);
        const innerY = hw * (0.94 - 0.36 * endK) * sgn;
        const h = (botH(X) + (topH(X) - botH(X)) * 0.24 * endK) * tk * s;
        ctx.lineTo(gx(X, innerY), gyy(X, innerY) - h - lift * 0.8);
      }
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // ---- THE OSTEODERM ROWS: two lateral files of grown plate per
    // side riding the back's own curve — a step BRIGHTER than the
    // hide (the mail law), trapezoid-cut (grown armor, never stamped
    // tile), seams quiet. The fen wears none: its read is the keel.
    if (!look.fin) {
      const rows: Array<{ Y: number; k: number }> = look.elder
        ? [
            { Y: 0.34, k: 1 },
            { Y: -0.34, k: 1 },
            { Y: 0.66, k: 0.8 },
            { Y: -0.66, k: 0.8 },
          ]
        : [
            { Y: 0.4, k: 1 },
            { Y: -0.4, k: 1 },
          ];
      const nPlates = look.elder ? 6 : 5;
      for (let ri = 0; ri < rows.length; ri++) {
        const row = rows[ri]!;
        for (let i = 0; i < nPlates; i++) {
          const jit = (((f.seed * 31 + i * 0x9e37 + Math.round(row.Y * 100)) >>> 3) & 15) / 15;
          const jit2 = (((f.seed * 17 + i * 0x85eb + ri * 0x5f3) >>> 4) & 15) / 15;
          // Stagger alternate plates fore-aft and let each row wander
          // in Y — grown armor scatters, a grid is stamped tile.
          const X =
            (-0.62 + ((i + 0.5) / nPlates) * 1.4 + (jit - 0.5) * 0.08 + (i % 2) * 0.03) * hl;
          const Y = row.Y * hw * (0.92 + jit2 * 0.16);
          const h = (botH(X) + (topH(X) - botH(X)) * (0.94 - 0.1 * Math.abs(row.Y))) * tk * s;
          const pw = hw * (look.elder ? 0.17 : 0.13) * (0.82 + jit * 0.34) * row.k * s;
          const pl = hl * (look.elder ? 0.095 : 0.082) * (0.82 + jit2 * 0.34) * s;
          const cxp = gx(X, Y);
          const cyp = gyy(X, Y) - h - lift;
          // Trapezoid seated along the body axis: fore edge full,
          // aft edge cut (the grown-armor read), lit from the sky —
          // with a shaded aft facet carrying the relief so the seam
          // strokes can stay whisper-quiet.
          const fxs = fx * pl;
          const fys = fy * pl * ys;
          const pxs = px * pw;
          const pys = py * pw * ys;
          ctx.fillStyle = shade(look.plate, 7 + Math.round(jit * 5));
          ctx.beginPath();
          ctx.moveTo(cxp + fxs - pxs, cyp + fys - pys);
          ctx.lineTo(cxp + fxs + pxs, cyp + fys + pys);
          ctx.lineTo(cxp - fxs + pxs * 0.62, cyp - fys + pys * 0.62);
          ctx.lineTo(cxp - fxs - pxs * 0.62, cyp - fys - pys * 0.62);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = shade(look.plate, -6);
          ctx.beginPath();
          ctx.moveTo(cxp - fxs * 0.2 - pxs * 0.9, cyp - fys * 0.2 - pys * 0.9);
          ctx.lineTo(cxp - fxs * 0.2 + pxs * 0.9, cyp - fys * 0.2 + pys * 0.9);
          ctx.lineTo(cxp - fxs + pxs * 0.62, cyp - fys + pys * 0.62);
          ctx.lineTo(cxp - fxs - pxs * 0.62, cyp - fys - pys * 0.62);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(26, 20, 36, 0.16)';
          ctx.lineWidth = Math.max(0.6, s * 0.007);
          ctx.stroke();
        }
      }
    } else {
      // The fen's hide read: faint diamond speckle files along the
      // flank — wet keeled leather, not plate.
      ctx.fillStyle = shade(look.hide, 9);
      for (let i = 0; i < 8; i++) {
        const jit = (((f.seed * 17 + i * 0x85eb) >>> 4) & 15) / 15;
        const X = (-0.7 + (i + 0.5) / 8 * 1.5) * hl;
        const Y = (i % 2 === 0 ? 0.38 : -0.38) * hw * (0.9 + jit * 0.2);
        const h = (botH(X) + (topH(X) - botH(X)) * 0.85) * tk * s;
        const r0 = hw * 0.07 * (0.8 + jit * 0.5) * s;
        ctx.beginPath();
        ctx.ellipse(gx(X, Y), gyy(X, Y) - h - lift, r0 * 1.5, r0 * 0.8, Math.atan2(fy * ys, fx), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // ---- THE ELDER'S YEARS: crack scars and lichen saddles, cell
    // facts off the stable seed (never a facing-sorted lottery).
    if (look.elder && look.moss) {
      ctx.fillStyle = look.moss;
      ctx.globalAlpha = 0.55;
      for (const [mx, my, mr] of [
        [-0.42, 0.2, 0.16],
        [0.18, -0.28, 0.13],
        [-0.1, 0.42, 0.1],
      ] as const) {
        const X = mx * hl;
        const Y = my * hw;
        const h = (botH(X) + (topH(X) - botH(X)) * 0.9) * tk * s;
        ctx.beginPath();
        facetBlob(ctx, gx(X, Y), gyy(X, Y) - h - lift, mr * s, f.seed ^ 0x5f3, 6, 0.55, 0.4);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // The crack: one old wound across the plate country.
      ctx.strokeStyle = 'rgba(24, 20, 30, 0.4)';
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      const c0x = gx(0.34 * hl, -0.5 * hw);
      const c0y = gyy(0.34 * hl, -0.5 * hw) - (topH(0.34 * hl) * 0.9) * tk * s - lift;
      ctx.moveTo(c0x, c0y);
      ctx.lineTo(gx(0.18 * hl, -0.2 * hw), gyy(0.18 * hl, -0.2 * hw) - topH(0.18 * hl) * 0.95 * tk * s - lift);
      ctx.lineTo(gx(0.3 * hl, 0.08 * hw), gyy(0.3 * hl, 0.08 * hw) - topH(0.3 * hl) * 0.97 * tk * s - lift);
      ctx.stroke();
    }
  });

  // ---- THE VERTEBRAL SAW / THE KEEL FIN: the crown read, painted
  // OVER the hull. The ridge law: blades root on the 3D centerline,
  // so the root slides up-crown by the lateral projection — dead
  // center face-on, on the skyline side-on.
  if (f.hurt) return;
  const ridgeY = -py * hw * 0.66;
  const blades = look.fin ? 9 : look.elder ? 7 : 6;
  const items: Array<{ X: number; y0: number; x0: number; h: number; w: number }> = [];
  for (let i = 0; i < blades; i++) {
    const t = -0.78 + ((i + 0.5) / blades) * 1.62;
    const X = t * hl;
    const jit = (((f.seed * 13 + i * 0x9e37) >>> 5) & 15) / 15;
    // Tallest amidships, stepping down to neck and stern.
    const bandK = 1 - 0.5 * Math.pow(Math.abs(t + 0.06) / 0.84, 2);
    const h = look.ridgeH * (0.7 + 0.3 * jit) * bandK * s;
    const w = (look.fin ? 0.16 : look.elder ? 0.13 : 0.11) * hl * s * (0.9 + 0.2 * jit);
    const x0 = bx + (fx * X + px * ridgeY) * s;
    const y0 =
      gy + (fy * X + py * ridgeY) * ys * s - topH(X) * tk * s - lift + ridgeY * s * f.roll * 0.4;
    items.push({ X, y0, x0, h, w });
  }
  // Far-to-near by screen y so raked blades imbricate honestly.
  items.sort((a, b) => a.y0 - b.y0);
  for (const it of items) {
    const rake = fx * it.w * (look.fin ? 0.5 : 0.72);
    const rakeY = fy * it.w * 0.4 * ys;
    if (look.fin) {
      // The keel: low connected fin waves — a swimmer's tail speaking
      // all the way up the spine, never a saw.
      ctx.fillStyle = shade(look.horn, -4);
      ctx.beginPath();
      ctx.moveTo(it.x0 - it.w * 0.6, it.y0 + 0.5);
      ctx.quadraticCurveTo(it.x0 - it.w * 0.1 - rake * 0.3, it.y0 - it.h, it.x0 + it.w * 0.5 - rake, it.y0 - it.h * 0.7 - rakeY);
      ctx.quadraticCurveTo(it.x0 + it.w * 0.5, it.y0 - it.h * 0.2, it.x0 + it.w * 0.6, it.y0 + 0.5);
      ctx.closePath();
      ctx.fill();
    } else {
      // The saw blade: a 2-facet horn bowed aft — lit fore facet,
      // shadowed aft, partial BROKEN INK on the shadow edge only.
      const tipX = it.x0 - rake;
      const tipY = it.y0 - it.h - rakeY;
      ctx.fillStyle = shade(look.horn, 8);
      ctx.beginPath();
      ctx.moveTo(it.x0 + it.w * 0.55, it.y0 + 0.5);
      ctx.quadraticCurveTo(it.x0 + it.w * 0.2 - rake * 0.4, it.y0 - it.h * 0.62, tipX, tipY);
      ctx.lineTo(it.x0 - it.w * 0.1, it.y0 - it.h * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(look.horn, -14);
      ctx.beginPath();
      ctx.moveTo(it.x0 - it.w * 0.55, it.y0 + 0.5);
      ctx.quadraticCurveTo(it.x0 - it.w * 0.35 - rake * 0.3, it.y0 - it.h * 0.5, tipX, tipY);
      ctx.lineTo(it.x0 - it.w * 0.1, it.y0 - it.h * 0.18);
      ctx.closePath();
      ctx.fill();
      // The broken ink: one partial stroke off the tip down the
      // shadow edge — never a closed ring (the turtle ink law).
      ctx.strokeStyle = '#241a2e';
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = Math.max(0.8, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.quadraticCurveTo(
        it.x0 - it.w * 0.35 - rake * 0.3,
        it.y0 - it.h * 0.5,
        it.x0 - it.w * 0.42,
        it.y0 - it.h * 0.24,
      );
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}
/**
 * THE COURT'S SKULL — dragon out of crocodile: a long broad muzzle
 * that is the skull's own flesh (MOUTH IS A CUT, never a cone), the
 * grim saurian grin with interlocked teeth, raised nostril bumps on
 * the snout's top plane, a heavy brow ledge — and the species read:
 * eyes lit with pale-green fire. The basilisk wears two backswept
 * brow horns; the elder a four-point crown and chin barbels; the fen
 * keeps a low hunter's brow and nothing it doesn't need.
 */
export function drawBasiliskHead(
  ctx: CanvasRenderingContext2D,
  look: BasiliskLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    /** 0..1 jaw gape — open through the windup, clamped on the hit. */
    gape?: number;
    /** Corpse: fire out, jaw slack. */
    dead?: boolean;
    /** Which family body (horn dress + fen brow fork). */
    fen?: boolean;
  },
): void {
  const { x, y, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const hw = look.headW * s;
  const hh = look.headH * s;
  const gape = o.dead ? 0.15 : (o.gape ?? 0);
  const skin = o.hurt ? '#ffffff' : shade(look.hide, 6);
  const pk = Math.abs(fx);

  // The muzzle reaches long — a croc's proportion, not a turtle's.
  const tipR = 1.28;
  const tipX = x + fx * hw * tipR;
  const tipY = y + fy * hw * tipR * ys + hh * 0.04;
  const jawDrop = gape * hh * 0.72;
  const corner = (es: number): { x: number; y: number } => ({
    x: x + px * es * hw * 0.44 + fx * hw * 0.1,
    y: y + (py * es * hw * 0.44 + fy * hw * 0.1) * ys + hh * 0.22,
  });
  const cL = corner(-1);
  const cR = corner(1);

  // The lower jaw: one wide pale shovel corner to corner, swinging
  // down through the gape — the belly tone carried up the throat.
  ctx.fillStyle = o.hurt ? '#ffffff' : look.belly;
  ctx.beginPath();
  ctx.moveTo(cL.x, cL.y);
  ctx.lineTo(tipX - fx * hw * 0.06, tipY - fy * hw * 0.06 * ys + hh * 0.26 + jawDrop);
  ctx.lineTo(cR.x, cR.y);
  ctx.lineTo(x + fx * hw * 0.04, y + fy * hw * 0.04 * ys + hh * 0.4);
  ctx.closePath();
  ctx.fill();
  // The gape's dark room, and the LOWER teeth rising out of it —
  // the croc's interlock, absent on the closed mouth.
  if (gape > 0.12 && !o.hurt) {
    ctx.fillStyle = '#3c2a26';
    ctx.beginPath();
    ctx.moveTo(cL.x, cL.y);
    ctx.lineTo(tipX - fx * hw * 0.03, tipY - fy * hw * 0.03 * ys + hh * 0.1 + jawDrop * 0.55);
    ctx.lineTo(cR.x, cR.y);
    ctx.lineTo(x + fx * hw * 0.1, y + fy * hw * 0.1 * ys + hh * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = o.dead ? shade(look.belly, -10) : '#e8e0c4';
    for (const t of [0.3, 0.6, 0.85]) {
      const jx = x + (tipX - x) * t;
      const jy = y + (tipY - y) * t + hh * 0.2 + jawDrop * 0.7 * t;
      ctx.beginPath();
      ctx.moveTo(jx - hw * 0.03, jy + hh * 0.05);
      ctx.lineTo(jx, jy - hh * 0.14);
      ctx.lineTo(jx + hw * 0.03, jy + hh * 0.05);
      ctx.closePath();
      ctx.fill();
    }
  }

  // THE SKULL: heavy cranium mass with a lit crown plane.
  ctx.fillStyle = skin;
  ctx.beginPath();
  facetCircle(ctx, x, y, hw * 0.58, 7, Math.atan2(fy * ys, fx));
  ctx.fill();
  if (!o.hurt) {
    ctx.fillStyle = shade(look.hide, 14);
    ctx.beginPath();
    facetCircle(ctx, x - fx * hw * 0.04, y - fy * hw * 0.04 * ys - hh * 0.2, hw * 0.36, 6, 1.1);
    ctx.fill();
  }

  // THE MUZZLE: one mass with the cranium, long and broad, walls
  // pinching slightly ahead of the eyes then flaring at the nose —
  // the croc's spatulate snout in the flat dialect.
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(x - px * hw * 0.44 + fx * hw * 0.1, y + (-py * hw * 0.44 + fy * hw * 0.1) * ys - hh * 0.14);
  ctx.lineTo(x - px * hw * 0.3 + fx * hw * 0.72, y + (-py * hw * 0.3 + fy * hw * 0.72) * ys - hh * 0.12);
  ctx.lineTo(tipX - px * hw * 0.26, tipY - py * hw * 0.26 * ys - hh * 0.1);
  ctx.lineTo(tipX, tipY + hh * 0.1);
  ctx.lineTo(tipX + px * hw * 0.26, tipY + py * hw * 0.26 * ys - hh * 0.1);
  ctx.lineTo(x + px * hw * 0.3 + fx * hw * 0.72, y + (py * hw * 0.3 + fy * hw * 0.72) * ys - hh * 0.12);
  ctx.lineTo(x + px * hw * 0.44 + fx * hw * 0.1, y + (py * hw * 0.44 + fy * hw * 0.1) * ys - hh * 0.14);
  ctx.lineTo(x + fx * hw * 0.06, y + fy * hw * 0.06 * ys + hh * 0.2);
  ctx.closePath();
  ctx.fill();
  if (!o.hurt) {
    // The muzzle's lit top plane, running snout to brow.
    ctx.fillStyle = shade(look.hide, 12);
    ctx.beginPath();
    ctx.moveTo(x - px * hw * 0.24 + fx * hw * 0.2, y + (-py * hw * 0.24 + fy * hw * 0.2) * ys - hh * 0.2);
    ctx.lineTo(tipX - px * hw * 0.13, tipY - py * hw * 0.13 * ys - hh * 0.14);
    ctx.lineTo(tipX + px * hw * 0.13, tipY + py * hw * 0.13 * ys - hh * 0.14);
    ctx.lineTo(x + px * hw * 0.24 + fx * hw * 0.2, y + (py * hw * 0.24 + fy * hw * 0.2) * ys - hh * 0.2);
    ctx.closePath();
    ctx.fill();

    // THE CUT: the mouth line — a long sag from under the snout tip
    // back to the grim corner below the eye, with the croc's
    // interlocked TEETH ticking both ways along it. The far cheek
    // yields at profile; the open gape replaces the closed grin.
    if (gape < 0.3) {
      ctx.strokeStyle = 'rgba(30, 20, 24, 0.72)';
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.lineCap = 'round';
      for (const es of [-1, 1]) {
        if (pk > 0.6 && es * py < 0) continue;
        const c = corner(es);
        const m0x = tipX + px * es * hw * 0.07;
        const m0y = tipY + py * es * hw * 0.07 * ys + hh * 0.12;
        const midXc = (m0x + c.x) / 2 + fx * hw * 0.02;
        const midYc = (m0y + c.y) / 2 + hh * 0.14;
        ctx.beginPath();
        ctx.moveTo(m0x, m0y);
        ctx.quadraticCurveTo(midXc, midYc, c.x, c.y - hh * 0.06);
        ctx.stroke();
        // Interlocked teeth: uppers hang, lowers rise, alternating
        // along the cut's own curve — the croc grin, filled wedges.
        for (let ti = 0; ti < 4; ti++) {
          const t = 0.18 + ti * 0.2;
          const u = 1 - t;
          const qx = u * u * m0x + 2 * u * t * midXc + t * t * c.x;
          const qy = u * u * m0y + 2 * u * t * midYc + t * t * (c.y - hh * 0.06);
          const up = ti % 2 === 0;
          ctx.fillStyle = up ? '#e8e0c4' : shade(look.belly, 6);
          ctx.beginPath();
          if (up) {
            ctx.moveTo(qx - hw * 0.028, qy - hh * 0.02);
            ctx.lineTo(qx, qy + hh * 0.09);
            ctx.lineTo(qx + hw * 0.028, qy - hh * 0.02);
          } else {
            ctx.moveTo(qx - hw * 0.026, qy + hh * 0.03);
            ctx.lineTo(qx, qy - hh * 0.075);
            ctx.lineTo(qx + hw * 0.026, qy + hh * 0.03);
          }
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.lineCap = 'butt';
    }

    // Nostril bumps: RAISED domes on the snout tip's top plane (the
    // croc periscope), each with its dark pit — front reads only.
    if (fy > 0.02) {
      for (const es of [-1, 1]) {
        const nx = tipX - fx * hw * 0.08 + px * es * hw * 0.1;
        const ny = tipY + (-fy * hw * 0.08 + py * es * hw * 0.1) * ys - hh * 0.14;
        ctx.fillStyle = shade(look.hide, 16);
        ctx.beginPath();
        ctx.arc(nx, ny, Math.max(0.8, hw * 0.05), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(look.hide, -26);
        ctx.beginPath();
        ctx.arc(nx, ny, Math.max(0.5, hw * 0.022), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // THE BROW LEDGE and the FIRE: heavy orbital shelves with the
    // pale-green ember under each — the gaze the bestiary promises.
    // Eye stations ride the skull ring (the sphere law): they slide
    // with facing and the far one yields past the profile.
    for (const es of [-1, 1]) {
      if (pk > 0.72 && es * py < 0) continue;
      const ex0 = x + px * es * hw * 0.4 + fx * hw * 0.34;
      const ey0 = y + (py * es * hw * 0.4 + fy * hw * 0.34) * ys - hh * 0.3;
      // The ledge.
      ctx.fillStyle = shade(look.hide, -8);
      ctx.beginPath();
      ctx.ellipse(ex0, ey0 - hh * 0.08, hw * 0.14, hh * 0.1, Math.atan2(fy * ys, fx), 0, Math.PI * 2);
      ctx.fill();
      if (!o.dead) {
        // The soft fire halo — the gaze must read at gameplay zoom.
        ctx.fillStyle = look.eye;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(ex0, ey0, hw * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // The ember itself.
        ctx.beginPath();
        ctx.arc(ex0, ey0, Math.max(1.2, hw * 0.072), 0, Math.PI * 2);
        ctx.fill();
        // The slit pupil, close-up only.
        if (s > 110) {
          ctx.strokeStyle = 'rgba(20, 24, 14, 0.85)';
          ctx.lineWidth = Math.max(0.6, hw * 0.02);
          ctx.beginPath();
          ctx.moveTo(ex0, ey0 - hw * 0.05);
          ctx.lineTo(ex0, ey0 + hw * 0.05);
          ctx.stroke();
        }
      } else {
        // Dead: the fire is out — a dull chip where it lived.
        ctx.fillStyle = shade(look.hide, -18);
        ctx.beginPath();
        ctx.arc(ex0, ey0, Math.max(1, hw * 0.05), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // THE HORN DRESS: the family fork. Basilisk — two backswept brow
    // horns; elder — the four-point crown plus chin barbels; fen —
    // a low brow ridge line only (the lurker carries no crown).
    if (!o.fen) {
      const horns: Array<{ es: number; back: number; len: number }> = look.elder
        ? [
            { es: -1, back: 0.5, len: 0.34 },
            { es: 1, back: 0.5, len: 0.34 },
            { es: -1, back: 0.14, len: 0.24 },
            { es: 1, back: 0.14, len: 0.24 },
          ]
        : [
            { es: -1, back: 0.4, len: 0.26 },
            { es: 1, back: 0.4, len: 0.26 },
          ];
      for (const hspec of horns) {
        const hx = x - fx * hw * hspec.back + px * hspec.es * hw * 0.34;
        const hy = y + (-fy * hw * hspec.back + py * hspec.es * hw * 0.34) * ys - hh * 0.42;
        const hl2 = hw * hspec.len;
        // Swept back and out in the BODY frame, projected.
        const dxh = -fx * 0.8 + px * hspec.es * 0.5;
        const dyh = (-fy * 0.8 + py * hspec.es * 0.5) * ys - 0.5;
        const nl = Math.hypot(dxh, dyh) || 1;
        const tx2 = hx + (dxh / nl) * hl2;
        const ty2 = hy + (dyh / nl) * hl2;
        ctx.fillStyle = shade(look.horn, 4);
        ctx.beginPath();
        ctx.moveTo(hx - px * hw * 0.05, hy - py * hw * 0.05 * ys + hh * 0.05);
        ctx.quadraticCurveTo((hx + tx2) / 2 - hw * 0.02, (hy + ty2) / 2 - hh * 0.1, tx2, ty2);
        ctx.lineTo(hx + px * hw * 0.05, hy + py * hw * 0.05 * ys + hh * 0.05);
        ctx.closePath();
        ctx.fill();
        // Partial ink off the tip (the broken-ink law).
        ctx.strokeStyle = '#241a2e';
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = Math.max(0.7, s * 0.011);
        ctx.beginPath();
        ctx.moveTo(tx2, ty2);
        ctx.quadraticCurveTo((hx + tx2) / 2 - hw * 0.02, (hy + ty2) / 2 - hh * 0.1, hx + (tx2 - hx) * 0.3, hy + (ty2 - hy) * 0.3);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (look.elder && fy > -0.2) {
        // Chin barbels: the old fisher-dragon's whiskers, front reads.
        ctx.strokeStyle = shade(look.belly, -14);
        ctx.lineWidth = Math.max(0.8, s * 0.012);
        ctx.lineCap = 'round';
        for (const es of [-1, 1]) {
          const bx0 = tipX + px * es * hw * 0.14 - fx * hw * 0.1;
          const by0 = tipY + (py * es * hw * 0.14 - fy * hw * 0.1) * ys + hh * 0.24;
          ctx.beginPath();
          ctx.moveTo(bx0, by0);
          ctx.quadraticCurveTo(bx0 + px * es * hw * 0.05, by0 + hh * 0.2, bx0 + px * es * hw * 0.12, by0 + hh * 0.3);
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
      }
    } else {
      // The fen brow: one low ridge line over each orbit — a log's
      // eyebrows, nothing the reeds would notice.
      ctx.strokeStyle = shade(look.hide, -16);
      ctx.lineWidth = Math.max(1, s * 0.016);
      for (const es of [-1, 1]) {
        if (pk > 0.72 && es * py < 0) continue;
        const ex0 = x + px * es * hw * 0.4 + fx * hw * 0.34;
        const ey0 = y + (py * es * hw * 0.4 + fy * hw * 0.34) * ys - hh * 0.4;
        ctx.beginPath();
        ctx.moveTo(ex0 - fx * hw * 0.12 - px * es * hw * 0.04, ey0);
        ctx.quadraticCurveTo(ex0, ey0 - hh * 0.06, ex0 + fx * hw * 0.14, ey0 + hh * 0.02);
        ctx.stroke();
      }
    }
  }
}
export interface BasiliskTailStyle {
  hide: string;
  horn: string;
  /** The yellowish underbelly, carried down the tail's lower edge. */
  belly: string;
  /** Root half-width (tiles) — MUST meet the body's stern width so
   *  the tail reads as the hull continuing, never a rope tied on. */
  rootW: number;
  /** Mass dial: crest heights and ring weights. */
  heavy: number;
  /** The fen cousin: the tall swimmer's fin instead of the crests. */
  fin?: boolean;
}
/**
 * THE WEAPON OFF THE STERN — the basilisk tail painter, rebuilt for
 * the croc-tail sim (user mandate: huge, meaty, dramatic). The
 * silhouette is a MUSCLE WEDGE: root as wide as the hull's stern,
 * holding most of its width through the first half (meat), then
 * closing on a hard whip point. The reads, in croc grammar: the
 * DOUBLE CREST — two scute rows riding the tail base that MERGE into
 * one tall keel saw at mid-length (the signature of every reference
 * crocodilian) — the BELLY BAND carried down the lower edge, and
 * quiet muscle rings at the joints. The fen swaps the crests for one
 * tall swimmer's fin. Dials ride the style (the canid-lane law);
 * plain path calls — no Path2D — so node tests walk every coordinate.
 */
export function drawBasiliskTail(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  st: BasiliskTailStyle,
  wk: number,
  opts: BobtailDrawOpts,
): void {
  const n = pts.length;
  if (n < 3) return;
  const left: Array<{ x: number; y: number }> = [];
  const right: Array<{ x: number; y: number }> = [];
  const widths: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(n - 1, i + 1)]!;
    let tx = b.x - a.x;
    let ty = b.y - a.y;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const t = i / (n - 1);
    // THE MEAT PROFILE: barely tapering through the muscular first
    // half, then the power curve closes it to the whip.
    const w = st.rootW * (1 - 0.88 * Math.pow(t, 1.6)) * wk;
    widths.push(w);
    left.push({ x: pts[i]!.x + ty * w, y: pts[i]!.y - tx * w });
    right.push({ x: pts[i]!.x - ty * w, y: pts[i]!.y + tx * w });
  }

  const tipX = pts[n - 1]!.x + (pts[n - 1]!.x - pts[n - 2]!.x) * 0.6;
  const tipY = pts[n - 1]!.y + (pts[n - 1]!.y - pts[n - 2]!.y) * 0.6;
  const silhouette = (): void => {
    ctx.beginPath();
    ctx.moveTo(left[0]!.x, left[0]!.y);
    for (let i = 1; i < n; i++) ctx.lineTo(left[i]!.x, left[i]!.y);
    ctx.lineTo(tipX, tipY);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i]!.x, right[i]!.y);
    ctx.closePath();
  };

  ctx.lineJoin = 'round';
  ctx.fillStyle = opts.hurt ? '#ffffff' : shade(st.hide, opts.back ? -14 : -6);
  silhouette();
  ctx.fill();
  if (opts.hurt) return;

  // Which ribbon edge is dorsal on screen (the turtle law) — the
  // crests ride it; the belly band takes the other.
  const upperAt = (i: number): { x: number; y: number } =>
    left[i]!.y <= right[i]!.y ? left[i]! : right[i]!;
  const lowerAt = (i: number): { x: number; y: number } =>
    left[i]!.y <= right[i]!.y ? right[i]! : left[i]!;

  // THE BELLY BAND: the yellowish underside carried out of the body
  // read, hugging the lower edge through the meaty half then fading.
  ctx.fillStyle = shade(st.belly, -8);
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  const bellyN = Math.max(3, Math.floor(n * 0.62));
  for (let i = 0; i < bellyN; i++) {
    const lo = lowerAt(i);
    if (i === 0) ctx.moveTo(lo.x, lo.y);
    else ctx.lineTo(lo.x, lo.y);
  }
  for (let i = bellyN - 1; i >= 0; i--) {
    const lo = lowerAt(i);
    const t = i / (n - 1);
    ctx.lineTo(lo.x, lo.y - widths[i]! * (0.42 - 0.3 * t));
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  if (st.fin) {
    // THE SWIMMER'S FIN: one tall connected sheet off the dorsal
    // edge, rising past mid-length and running out the tip — the
    // sculling engine made visible. A step DARKER than the horn: a
    // pale fin read as a separate paddle lying on the tail.
    ctx.fillStyle = shade(st.horn, -16);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const hi = upperAt(i);
      if (i === 0) ctx.moveTo(hi.x, hi.y);
      else ctx.lineTo(hi.x, hi.y);
    }
    ctx.lineTo(tipX, tipY);
    for (let i = n - 1; i >= 0; i--) {
      const hi = upperAt(i);
      const t = i / (n - 1);
      const fh = st.rootW * wk * (0.38 + 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.15)));
      ctx.lineTo(hi.x, hi.y - Math.max(0.3, fh));
    }
    ctx.closePath();
    ctx.fill();
    // The fin's ray seams, quiet.
    ctx.strokeStyle = shade(st.horn, -18);
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = Math.max(0.8, wk * 0.012);
    for (let i = 2; i < n - 1; i += 2) {
      const hi = upperAt(i);
      const t = i / (n - 1);
      const fh = st.rootW * wk * (0.38 + 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.15)));
      ctx.beginPath();
      ctx.moveTo(hi.x, hi.y);
      ctx.lineTo(hi.x + wk * 0.012, hi.y - fh * 0.9);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else {
    // THE DOUBLE CREST: two scute rows on the meaty base — one on
    // the dorsal edge, its twin inset a third of the width — that
    // MERGE at mid-length into the single tall keel saw running out
    // to the tip. Blades bow aft (grown horn, never stamped tin).
    ctx.fillStyle = st.horn;
    const mergeT = 0.42;
    for (let i = 1; i < n - 1; i++) {
      const t = i / (n - 1);
      const hi = upperAt(i);
      const w = widths[i]!;
      // Row heights: base rows are short studs; past the merge the
      // single keel takes the full blade height.
      if (t < mergeT) {
        for (const inset of [0, 0.38]) {
          const bx = hi.x + (pts[i]!.x - hi.x) * inset * 0.9;
          const by = hi.y + (pts[i]!.y - hi.y) * inset * 0.9;
          const sw = w * 0.34 * st.heavy;
          ctx.fillStyle = inset === 0 ? st.horn : shade(st.horn, -10);
          ctx.beginPath();
          ctx.moveTo(bx - sw * 0.6, by + sw * 0.15);
          ctx.quadraticCurveTo(bx - sw * 0.05, by - sw * 1.15, bx + sw * 0.32, by - sw * 0.95);
          ctx.lineTo(bx + sw * 0.55, by + sw * 0.15);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        const rise = Math.min(1, (t - mergeT) / 0.18);
        const sw = w * (0.42 + 0.34 * rise) * st.heavy + wk * 0.012;
        ctx.fillStyle = st.horn;
        ctx.beginPath();
        ctx.moveTo(hi.x - sw * 0.62, hi.y + sw * 0.15);
        ctx.quadraticCurveTo(hi.x - sw * 0.05, hi.y - sw * 1.5, hi.x + sw * 0.3, hi.y - sw * 1.15);
        ctx.lineTo(hi.x + sw * 0.6, hi.y + sw * 0.15);
        ctx.closePath();
        ctx.fill();
        // BROKEN INK off the keel's shadow edge — partial, never a
        // closed ring (the thorned-mail law).
        ctx.strokeStyle = '#241a2e';
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = Math.max(0.7, wk * 0.01);
        ctx.beginPath();
        ctx.moveTo(hi.x + sw * 0.3, hi.y - sw * 1.15);
        ctx.lineTo(hi.x + sw * 0.55, hi.y - sw * 0.2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  // Muscle rings at the joints: quiet, heavier through the meat.
  ctx.strokeStyle = shade(st.hide, -20);
  for (let i = 1; i < n - 1; i++) {
    const t = i / (n - 1);
    ctx.globalAlpha = 0.5 - 0.25 * t;
    ctx.lineWidth = Math.max(1, wk * 0.016 * (1 - 0.4 * t));
    ctx.beginPath();
    ctx.moveTo(left[i]!.x, left[i]!.y);
    ctx.lineTo(right[i]!.x, right[i]!.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // The quiet contour that seats the mass on the ground plane.
  ctx.lineWidth = Math.max(1, wk * 0.013);
  silhouette();
  ctx.stroke();
}
