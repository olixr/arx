/**
 * THE SADDLED — courser looks, the saddle law and mountSpec.
 * Split out of rig.ts on the golems.ts template (foundations F3.4);
 * rig.ts re-exports everything here, so every lab, test and painter
 * keeps its old door.
 */
import { LegRigConfig } from './legs.js';
import { chamferRect, facetCircle } from './shapes.js';
import { shade } from './tint.js';
import { SABERCAT_LOOKS } from './rigFeline.js';
// The engine's shared grammar comes back from rig.ts — the same
// deferred cycle golems.ts has always ridden (touched only at draw
// time, long after both modules initialize).
import { MOUNT_SPEC_CACHE, OUTLINE, faceProfileK, paintBlockBody } from './rigKit.js';
import type { BeastBlockFrame, BeastSpec } from './rig.js';

/**
 * The Dawnlands courser — the first saddle beast (THE ROAD GROWS
 * SHORT). A working horse in the brutalist dialect: tall block barrel
 * held high on long hoofed legs, a strong rising neck under a fallen
 * mane, a long plain head, and its tack worn honestly — blanket, seat,
 * girth, reins looped to the pommel. Coats keyed by MOUNT def id.
 */
export interface CourserLook {
  coat: string;
  belly: string;
  mane: string;
  muzzle: string;
  /** Lower-leg tone (the socks) — becomes the spec's legColor. */
  sock: string;
  /** Tack cloth under the saddle — the owner-visible identity color. */
  blanket: string;
  leather: string;
  /** Grey coats dapple; solid coats stay plain. */
  dapple?: boolean;
  /** Mountain shag: belly fringe and a heavier mane fall (the garron). */
  shaggy?: boolean;
  bodyW: number;
  backH: number;
  chestH: number;
  headW: number;
  headH: number;
  neckRise: number;
}
export const COURSER_LOOKS: Record<string, CourserLook> = {
  courser_bay: {
    coat: '#7b4a2e',
    belly: '#93613f',
    mane: '#2b2018',
    muzzle: '#241a12',
    sock: '#3a2c20',
    blanket: '#7d3f3a',
    leather: '#4a3423',
    bodyW: 0.185,
    backH: 0.72,
    chestH: 0.42,
    headW: 0.27,
    headH: 0.2,
    neckRise: 0.44,
  },
};
/**
 * Rider anchor geometry, tile units above the beast's ground point.
 * The renderer builds the rider's seat, stirrups, and pommel grip from
 * these; the tack painter draws to the same numbers — one ruler, so
 * the boot always meets the stirrup iron and the fists the pommel.
 */
export const COURSER_SADDLE = {
  seatH: 0.84,
  stirrupH: 0.36,
  stirrupSide: 0.185,
  stirrupFwd: 0.05,
  pommelFwd: 0.16,
  pommelH: 0.97,
  radius: 0.42,
};
/**
 * THE GALLOP HAS FOUR BEATS: a saddle beast's legs each own a gait
 * group, so an amble walks a true four-beat (one hoof at a time — a
 * horse never trots its walk) and full tilt rolls the beats down the
 * body instead of stamping diagonal pairs. Every mount is a FLIGHT
 * rig: past a canter the rhythm nudge staggers launches and the duty
 * factor drops under 0.5 — the aerial beat, the whole reason a gallop
 * reads as flying where a trot reads as sewing.
 */
export function saddleLegs(fwd: number, side: number): LegRigConfig['legs'] {
  return [
    { fwd, side: -side, group: 0 },
    { fwd, side, group: 1 },
    { fwd: -fwd, side: -side, group: 2 },
    { fwd: -fwd, side, group: 3 },
  ];
}
/** One rig for every coat — only the sock color varies. */
export function mountSpec(mountId: string): BeastSpec {
  let spec = MOUNT_SPEC_CACHE.get(mountId);
  if (!spec && mountId.startsWith('sabercat')) {
    // The cat: long and low on springy paws, quick through the turn —
    // the wolf family's athletic grammar at riding scale.
    const catLook = SABERCAT_LOOKS[mountId] ?? SABERCAT_LOOKS.sabercat_night!;
    spec = {
      rig: {
        legs: saddleLegs(0.34, 0.14),
        legLen: 0.46,
        rise: 0.4,
        liftAmp: 0.1,
        runSpeed: 7.5,
        turnRate: 7.5,
        flight: true,
        flightEager: 0.26,
        // THE WALK HAS AN ORDER: the lateral sequence every walking
        // quadruped keeps — LH, LF, RH, RF (legs indexed FL FR BL BR).
        walkOrder: [2, 0, 3, 1],
      },
      bodyLen: 0.62,
      bodyRise: 0.46,
      kneeFwd: [1, 1, -1, -1],
      hipFwd: 0.9,
      hipSide: 0.52,
      // Saddle-bearing bone: the muscled limb painter carries the
      // width as a filled mass (hind thigh 1.35×), so the dial reads
      // as the FED riding cat, not a stroke gauge.
      legW: 0.098,
      foot: 'paw',
      legColor: shade(catLook.coat, -14),
      // The cat's bones: the lynx lane's long thigh over a short hock
      // — the crouch-and-spring frame at riding scale.
      segSplit: [0.53, 0.58],
    };
    MOUNT_SPEC_CACHE.set(mountId, spec);
    return spec;
  }
  const look = COURSER_LOOKS[mountId] ?? COURSER_LOOKS.courser_bay!;
  if (!spec) {
    // The garron is the courser's rig a hand shorter and a hand
    // stockier — same gait laws, lower center, thicker bone.
    const garron = mountId.startsWith('garron');
    spec = {
      rig: {
        legs: saddleLegs(garron ? 0.32 : 0.36, garron ? 0.16 : 0.15),
        legLen: garron ? 0.42 : 0.52,
        rise: garron ? 0.37 : 0.46,
        liftAmp: garron ? 0.08 : 0.085,
        runSpeed: 6.5,
        // A horse commits to a line — statelier than a wolf's snap.
        turnRate: garron ? 6 : 5.5,
        flight: true,
        flightEager: 0.26,
        // THE WALK HAS AN ORDER: the equine 4-beat is a LATERAL
        // sequence — LH, LF, RH, RF (legs indexed FL FR BL BR). This
        // is the stately led-walk read; without it the start-up order
        // sticks and a courser can pace like a sewing machine.
        walkOrder: [2, 0, 3, 1],
      },
      bodyLen: garron ? 0.5 : 0.58,
      bodyRise: garron ? 0.44 : 0.54,
      kneeFwd: [1, 1, -1, -1],
      hipFwd: 0.9,
      hipSide: 0.5,
      // Riding-horse bone: legW is the FOREARM/GASKIN gauge now that
      // the equine limb painter fills real muscle masses from it
      // (gaskin 1.55×, cannon 0.5×) — the old stroke-gauge 0.09 was
      // thinner than a cow's under a barrel half again as tall.
      legW: garron ? 0.13 : 0.115,
      foot: 'hoof',
      legColor: look.sock,
      // The horn block derives from the heavier legW — pull the dial
      // under one so the hoof lands a touch past the portrait-approved
      // block, not a clown boot (hoof ≈ 1.6× the pastern width).
      footScale: 0.85,
      // Horse bones: a long forearm over a short cannon in front, the
      // hock riding HIGH behind — the equine silhouette's whole lower
      // story, and what keeps the gallop's folded knees honest.
      segSplit: [0.55, 0.6],
    };
    MOUNT_SPEC_CACHE.set(mountId, spec);
  }
  return spec;
}
/**
 * Rider geometry per body — the garron seats lower than the courser.
 * Same shape as COURSER_SADDLE; the renderer picks by mount id.
 */
export function saddleFor(mountId: string): typeof COURSER_SADDLE {
  if (mountId.startsWith('sabercat')) return SABER_SADDLE;
  return mountId.startsWith('garron') ? GARRON_SADDLE : COURSER_SADDLE;
}
export const GARRON_SADDLE = {
  seatH: 0.7,
  stirrupH: 0.28,
  stirrupSide: 0.19,
  stirrupFwd: 0.05,
  pommelFwd: 0.14,
  pommelH: 0.82,
  radius: 0.4,
};
// The cat is ridden LOW and close — the night-saber crouch: seat on
// the harness pad behind the shoulder rise, feet tucked high, grip on
// the strap-ring horn.
export const SABER_SADDLE = {
  seatH: 0.64,
  stirrupH: 0.26,
  stirrupSide: 0.19,
  stirrupFwd: 0.02,
  pommelFwd: 0.15,
  pommelH: 0.76,
  radius: 0.42,
};
export function paintCourserBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: CourserLook,
  f: BeastBlockFrame,
  saddle: typeof COURSER_SADDLE = COURSER_SADDLE,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // Deep chest, level back, round croup — the working-horse barrel.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.8],
    [hl, hw * 0.8],
    [hl * 0.55, hw],
    [-hl * 0.5, hw * 0.98],
    [-hl, hw * 0.7],
    [-hl, -hw * 0.7],
    [-hl * 0.5, -hw * 0.98],
    [hl * 0.55, -hw],
  ];
  const coat = shade(look.coat, (((f.seed >>> 5) & 7) - 3) * 2);
  paintBlockBody(
    ctx,
    f,
    foot,
    // Level back with the faint wither rise at the neck end.
    (X) => look.backH + 0.035 * Math.max(0, X / hl - 0.45),
    // The chest drops deeper forward — daylight under the flank only.
    (X) => look.chestH - 0.05 * Math.max(0, X / hl - 0.2),
    coat,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      const bh = look.backH * tk * s;
      // Mountain shag: a ragged fringe along the belly line — the
      // winter coat that makes a garron read garron beside a courser.
      if (look.shaggy && !f.hurt) {
        ctx.strokeStyle = shade(look.coat, -12);
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(1.5, s * 0.035);
        for (let k = 0; k < 6; k++) {
          const X = (k / 5 - 0.5) * 1.5 * hl;
          const fx0 = gx(X, 0);
          const fy0 = gyy(X, 0) - look.chestH * tk * s * 0.72 - lift;
          ctx.beginPath();
          ctx.moveTo(fx0, fy0);
          ctx.lineTo(fx0 + s * 0.012 * ((k % 3) - 1), fy0 + s * (0.07 + 0.02 * (k % 2)));
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
      }
      // Grey coats dapple: a scatter of paler facets over the croup
      // and shoulder, seeded per body so no two greys match.
      if (look.dapple && !f.hurt) {
        ctx.fillStyle = shade(look.coat, 10);
        for (let k = 0; k < 5; k++) {
          const rr = (h: number): number =>
            ((((f.seed >>> (h % 13)) * 2654435761 + k * 97) >>> 0) % 1000) / 1000;
          const X = (rr(k) * 1.6 - 0.8) * hl;
          const Y = (rr(k + 5) * 1.4 - 0.7) * hw;
          ctx.beginPath();
          facetCircle(ctx, gx(X, Y), gyy(X, Y) - bh * 0.62 - lift, s * 0.035, 5, f.seed + k);
          ctx.fill();
        }
      }
      // ---- THE TACK, on the one ruler (COURSER_SADDLE).
      // Blanket: a cloth lozenge laid along the spine under the seat,
      // plus its hem hanging down the camera-near flank.
      const bx0 = gx(-0.16 * hl * 2, 0);
      const by0 = gyy(-0.16 * hl * 2, 0) - bh * 0.92 - lift;
      const bx1 = gx(0.4 * hl, 0);
      const by1 = gyy(0.4 * hl, 0) - bh * 0.92 - lift;
      ctx.strokeStyle = f.hurt ? '#ffffff' : look.blanket;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(3, s * 0.19);
      ctx.beginPath();
      ctx.moveTo(bx0, by0);
      ctx.lineTo(bx1, by1);
      ctx.stroke();
      // The hem band a half-step lower, in the cloth's shade.
      ctx.strokeStyle = f.hurt ? '#ffffff' : shade(look.blanket, -14);
      ctx.lineWidth = Math.max(2.5, s * 0.09);
      ctx.beginPath();
      ctx.moveTo(bx0, by0 + s * 0.13);
      ctx.lineTo(bx1, by1 + s * 0.13);
      ctx.stroke();
      // Saddle seat: the leather lozenge riding the blanket, shorter,
      // with the girth strap dropping to the belly line at its middle.
      const sx0 = gx(-0.05 * hl * 2, 0);
      const sy0 = gyy(-0.05 * hl * 2, 0) - bh * 1.0 - lift;
      const sx1 = gx(0.3 * hl, 0);
      const sy1 = gyy(0.3 * hl, 0) - bh * 1.0 - lift;
      ctx.strokeStyle = f.hurt ? '#ffffff' : look.leather;
      ctx.lineWidth = Math.max(3, s * 0.13);
      ctx.beginPath();
      ctx.moveTo(sx0, sy0);
      ctx.lineTo(sx1, sy1);
      ctx.stroke();
      // Cantle and pommel: the seat's two rises, pommel forward.
      ctx.fillStyle = f.hurt ? '#ffffff' : shade(look.leather, 12);
      ctx.beginPath();
      facetCircle(ctx, sx1, sy1 - s * 0.045, s * 0.045, 5, f.seed ^ 0x11);
      ctx.fill();
      ctx.fillStyle = f.hurt ? '#ffffff' : shade(look.leather, 4);
      ctx.beginPath();
      facetCircle(ctx, sx0, sy0 - s * 0.03, s * 0.038, 5, f.seed ^ 0x2f);
      ctx.fill();
      // Girth: down the visible flank to the belly, mid-seat.
      const gxm = gx(0.12 * hl, 0);
      const gym = gyy(0.12 * hl, 0);
      ctx.strokeStyle = f.hurt ? '#ffffff' : shade(look.leather, -10);
      ctx.lineWidth = Math.max(2, s * 0.05);
      ctx.beginPath();
      ctx.moveTo(gxm, gym - bh * 0.94 - lift);
      ctx.lineTo(gxm, gym - look.chestH * tk * s * 0.5 - lift);
      ctx.stroke();
      // Stirrup leather: seat edge down the near flank to the iron,
      // on the same ruler the rider's boot lands on — a hung boot
      // with no strap is a floating boot. Side-on bands only; dead
      // ahead the legs own that column.
      if (Math.abs(f.fx) > 0.25) {
        const stx = gx(0.04 * hl, 0);
        const sty = gyy(0.04 * hl, 0);
        const ironY = sty - saddle.stirrupH * tk * s - lift;
        ctx.strokeStyle = f.hurt ? '#ffffff' : look.leather;
        ctx.lineWidth = Math.max(1.5, s * 0.04);
        ctx.beginPath();
        ctx.moveTo(stx, sty - bh * 0.98 - lift);
        ctx.lineTo(stx + f.fx * s * 0.02, ironY);
        ctx.stroke();
        ctx.strokeStyle = f.hurt ? '#ffffff' : '#55545c';
        ctx.lineWidth = Math.max(1.5, s * 0.025);
        ctx.beginPath();
        ctx.arc(stx + f.fx * s * 0.02, ironY + s * 0.022, s * 0.028, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    },
  );
}
/**
 * The courser's head: a long plain skull with pricked ears, the
 * muzzle running well past the cheek to a soft dark nose — the length
 * is what separates horse from deer at a glance. The forelock falls
 * between the ears in the mane's color.
 */
export function drawCourserHead(
  ctx: CanvasRenderingContext2D,
  look: CourserLook,
  o: { x: number; y: number; s: number; fx: number; fy: number; ys: number; hurt?: boolean },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);

  // Pricked ears, tighter and shorter than any deer's leaf.
  for (const es of [-1, 1]) {
    const bxr = cx + px * es * w * 0.3 + fx * es * w * 0.05;
    const byr = cy + (py * es * w * 0.3 + fy * es * w * 0.05) * ys - h * 0.42;
    const tx = bxr + px * es * w * 0.14;
    const ty = byr - h * 0.52;
    ctx.fillStyle = C(shade(look.coat, -8));
    ctx.beginPath();
    ctx.moveTo(bxr - px * es * w * 0.09, byr + h * 0.06);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bxr + px * es * w * 0.11, byr + h * 0.1);
    ctx.closePath();
    ctx.fill();
  }
  // The forelock: mane falling between the ears onto the brow.
  ctx.strokeStyle = C(look.mane);
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.5, w * 0.14);
  ctx.beginPath();
  ctx.moveTo(cx - fx * w * 0.1, cy - fy * w * 0.1 * ys - h * 0.5);
  ctx.lineTo(cx + fx * w * 0.12, cy + fy * w * 0.12 * ys - h * 0.16);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // Long chamfered skull.
  ctx.fillStyle = C(look.coat);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.26, w * 0.26]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.26, w * 0.26]);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.14)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.24);
    ctx.restore();
  }

  // The long muzzle: the horse's whole argument. Runs a full head
  // farther than the deer's taper, square-ended, nose soft and dark.
  if (fy > -0.35) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.22;
    const by0 = cy + fy * w * 0.22 * ys + h * 0.1;
    const sl = w * (0.34 + 0.3 * profileK);
    const tx = bx0 + fx * sl;
    // The head axis BREAKS DOWN off the poll — seen side-on the nose
    // line falls near 45 degrees; head-on it stays a hung drop. This
    // angle is the whole difference between a horse and a llama.
    const ty = by0 + fy * sl * ys + h * (0.16 + 0.62 * profileK);
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    // The jaw DEEPENS at the cheek side-on (never narrows) and tapers
    // to a squared nose — the working head, not a stuffed sock.
    const hb = w * (0.19 + 0.055 * profileK);
    const ht = hb * 0.62;
    ctx.fillStyle = C(shade(look.coat, 4));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    // Soft nose block, plus the bit line where the rein meets.
    ctx.fillStyle = C(look.muzzle);
    ctx.beginPath();
    facetCircle(ctx, tx - (axv / al) * w * 0.03, ty - (ayv / al) * w * 0.03, w * 0.085, 5, fx);
    ctx.fill();
  }

  // Calm dark eyes, wide-set.
  if (fy > -0.45 && !o.hurt) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.06 + px * es * w * 0.32;
      const ey = cy + (fy * w * 0.06 + py * es * w * 0.32) * ys - h * 0.1;
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(ex - s * 0.014, ey - s * 0.018, s * 0.028, s * 0.036);
    }
  }
}
