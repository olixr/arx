/**
 * THE SHELLED MANY-LEGS — spider, crab, the giant crab and the beetle.
 * Split out of rig.ts on the golems.ts template (foundations F3.4);
 * rig.ts re-exports everything here, so every lab, test and painter
 * keeps its old door.
 */
import { LimbSolve } from './legs.js';
import { facetBlob, facetCircle } from './shapes.js';
import { shade } from './tint.js';
// The engine's shared grammar comes back from rig.ts — the same
// deferred cycle golems.ts has always ridden (touched only at draw
// time, long after both modules initialize).
import { paintBlockBody } from './rig.js';
import type { BeastBlockFrame, BeastSpec, GiantCrabLook } from './rig.js';

/**
 * The giant spider: two block masses — a low cephalothorax carrying the
 * eye cluster and fang chips, a domed abdomen behind wearing pale
 * chevrons — slung between eight thin stalking legs. No head or tail
 * painter: the whole animal is the body.
 */
export interface SpiderLook {
  carapace: string;
  abdomen: string;
  mark: string;
  eye: string;
  fang: string;
  /** Abdomen half-width; the cephalothorax runs narrower. */
  bodyW: number;
  abdH: number;
  cephH: number;
}
export const SPIDER_LOOK: SpiderLook = {
  carapace: '#3a3244',
  abdomen: '#453a55',
  mark: '#b7a76a',
  eye: '#d95763',
  fang: '#efe9d8',
  bodyW: 0.21,
  abdH: 0.34,
  cephH: 0.19,
};
export function paintSpiderBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: SpiderLook,
  f: BeastBlockFrame,
  at = 0,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  const s = f.s;
  const fx = f.fx;
  const fy = f.fy;
  const px = -fy;
  const py = fx;
  const carapace = shade(look.carapace, (((f.seed >>> 5) & 7) - 3) * 2);

  // Abdomen: a domed octagon over the rear half, peaked mid-mass.
  const aC = -hl * 0.45;
  const aR = hl * 0.55;
  const abdomen: Array<[number, number]> = [
    [aC + aR, -hw * 0.55],
    [aC + aR, hw * 0.55],
    [aC + aR * 0.5, hw],
    [aC - aR * 0.5, hw],
    [aC - aR, hw * 0.55],
    [aC - aR, -hw * 0.55],
    [aC - aR * 0.5, -hw],
    [aC + aR * 0.5, -hw],
  ];
  paintBlockBody(
    ctx,
    f,
    abdomen,
    (X) => look.abdH * (1 - 0.45 * Math.pow((X - aC) / aR, 2)),
    () => 0.1,
    shade(look.abdomen, (((f.seed >>> 5) & 7) - 3) * 2),
    (gx, gyy, lift) => {
      const tk = f.topScale ?? 1;
      // Pale chevrons marching rearward down the dome — drawn in the
      // abdomen's own rotated frame so every facing keeps the V shape.
      ctx.save();
      ctx.translate(gx(aC, 0), gyy(aC, 0) - look.abdH * tk * s * 0.86 - lift);
      ctx.rotate(Math.atan2(fy * f.ys, fx));
      ctx.strokeStyle = look.mark;
      ctx.lineWidth = Math.max(1.5, s * 0.028);
      ctx.lineCap = 'round';
      const wv = hw * s * 0.42;
      for (const q of [0.3, 0, -0.3]) {
        const mx = aR * q * s;
        ctx.beginPath();
        ctx.moveTo(mx - wv * 0.5, -wv);
        ctx.lineTo(mx + wv * 0.45, 0);
        ctx.lineTo(mx - wv * 0.5, wv);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.restore();
    },
  );
  // Spinneret nub off the abdomen's stern.
  ctx.fillStyle = f.hurt ? '#ffffff' : shade(look.abdomen, -18);
  ctx.beginPath();
  facetCircle(
    ctx,
    f.bx + fx * (aC - aR) * s * 1.02,
    f.gy + fy * (aC - aR) * s * 1.02 * f.ys - 0.12 * s,
    s * 0.045,
    5,
    fx,
  );
  ctx.fill();

  // Cephalothorax: the lower front plate the legs crowd around.
  const cC = hl * 0.4;
  const cR = hl * 0.5;
  const cw = hw * 0.62;
  const ceph: Array<[number, number]> = [
    [cC + cR, -cw * 0.6],
    [cC + cR, cw * 0.6],
    [cC + cR * 0.45, cw],
    [cC - cR * 0.55, cw * 0.95],
    [cC - cR, cw * 0.55],
    [cC - cR, -cw * 0.55],
    [cC - cR * 0.55, -cw * 0.95],
    [cC + cR * 0.45, -cw],
  ];
  paintBlockBody(
    ctx,
    f,
    ceph,
    (X) => look.cephH * (1 - 0.3 * Math.pow((X - cC) / cR, 2)),
    () => 0.08,
    carapace,
  );

  // Eye cluster: four hunter's beads across the front plate brow —
  // far-side pair hiding at profile, none from behind, none dead.
  const dead = f.topScale !== undefined && f.topScale < 1;
  if (fy > -0.45 && !f.hurt && !dead) {
    ctx.fillStyle = look.eye;
    for (const [ex0, es] of [
      [0.86, -0.5],
      [0.86, 0.5],
      [0.78, -1.1],
      [0.78, 1.1],
    ] as Array<[number, number]>) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = f.bx + (fx * hl * ex0 + px * es * cw * 0.4) * s;
      const ey =
        f.gy + (fy * hl * ex0 + py * es * cw * 0.4) * f.ys * s - look.cephH * s * 0.82 - f.bob * 0.35 * s;
      const er = s * (Math.abs(es) < 0.8 ? 0.028 : 0.02);
      ctx.fillRect(ex - er, ey - er, er * 2, er * 2);
    }
  }
  // Fang chips under the brow — flared mid-pounce.
  if (fy > -0.3 && !f.hurt) {
    const flare = 1 + Math.min(1, at * 1.6) * 0.5;
    ctx.fillStyle = look.fang;
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.75 && es * py < 0) continue;
      const fx0 = f.bx + (fx * hl * 0.92 + px * es * cw * 0.3) * s;
      const fy0 =
        f.gy + (fy * hl * 0.92 + py * es * cw * 0.3) * f.ys * s - look.cephH * s * 0.4 - f.bob * 0.35 * s;
      ctx.beginPath();
      ctx.moveTo(fx0 - s * 0.022, fy0);
      ctx.lineTo(fx0 + es * px * s * 0.012, fy0 + s * 0.075 * flare);
      ctx.lineTo(fx0 + s * 0.022, fy0);
      ctx.closePath();
      ctx.fill();
    }
  }
}
/**
 * The mudcrab: a wide flat carapace slung sideways across the facing,
 * two chunky pincers held forward (the left one the bigger crusher),
 * and stalked eyes off the front rim. The whole animal is the body
 * painter — head and tail branches return early.
 *
 * THE LIVING STALKS, inherited (the giant crab's doctrine come home):
 * the eyes ride the ear sim — they lag the turn, sway with the
 * scuttle, and pin flat through the clamp. The old rigged eyes hid
 * behind two facing gates (`fy > -0.5`, the far-eye profile skip);
 * stalks that grow off the TOP of the animal have no business
 * disappearing at any band — THE SOCKET RIDES THE CROWN slides the
 * root station onto visible shell instead, and the stalks always
 * paint over the hull.
 */
export interface CrabLook {
  shell: string;
  claw: string;
  eye: string;
  /** Half-WIDTH across the facing — wider than the body is long. */
  bodyW: number;
  shellH: number;
}
export const CRAB_LOOK: CrabLook = {
  shell: '#b06a4a',
  claw: '#c97f55',
  eye: '#241a2e',
  bodyW: 0.3,
  shellH: 0.2,
};
export const GIANTCRAB_LOOK: GiantCrabLook = {
  shell: '#46655c',
  crest: '#2f4a41',
  // A step brighter and warmer than the shell: the arms and fists
  // must separate from the hull at any zoom — the claw IS the read.
  claw: '#5e8272',
  clawTip: '#cfc9ad',
  barnacle: '#c9c2a6',
  under: '#33473f',
  eye: '#e0a83c',
  stain: '#7c5a41',
  bodyW: 0.52,
  shellH: 0.34,
  // PASS-ONE FAILURE, paid: tall thin crest pyramids read as PINE
  // TREES standing on a crate — the wall is LOW and wide, a
  // crenellation, never a copse.
  crestH: 0.08,
  rimBot: 0.16,
};
/**
 * THE RAMPART'S MAIL — one row per plate: [X, Y, halfLen, halfWid,
 * keelK] in body fractions (the turtle mail's grammar, a crab's
 * layout): a central crown boss, a crenellated BOW WALL of three
 * storm-raked blades running ACROSS the facing (the perpendicular
 * signature — the turtle's ridge runs nose-to-tail, the crab's wall
 * runs shoulder-to-shoulder), branchial terraces on the flanks, and
 * a stern pair over the tucked abdomen. Authored, never generated.
 */
export const GIANTCRAB_PLATES: ReadonlyArray<[number, number, number, number, number]> = [
  // The crown boss — the shield at the center of the shield.
  [-0.02, 0, 0.3, 0.26, 0.45],
  // THE BOW WALL: three WIDE low merlons across the bow, tallest at
  // the center — a battlement, never a treeline (base wider than the
  // rise by law; the pass-one thin pyramids read as pines).
  [0.42, 0, 0.16, 0.17, 1],
  [0.38, -0.46, 0.14, 0.19, 0.78],
  [0.38, 0.46, 0.14, 0.19, 0.78],
  // Branchial terraces, port and starboard.
  [-0.3, -0.56, 0.2, 0.2, 0.5],
  [-0.3, 0.56, 0.2, 0.2, 0.5],
  // The stern pair.
  [-0.68, -0.24, 0.13, 0.14, 0.4],
  [-0.68, 0.24, 0.13, 0.14, 0.4],
];
export const CRABARM_SOLVE: LimbSolve = { ex: 0, ey: 0, kx: 0, ky: 0 };
/**
 * The giant beetle: domed elytra split by a center seam with an
 * iridescent sheen, a darker pronotum plate at the front, and a rhino
 * horn hooking up off the head between two elbowed antennae. Whole
 * animal in the body painter — head and tail branches return early.
 */
export interface BeetleLook {
  shell: string;
  plate: string;
  seam: string;
  /** Iridescent highlight glazed over the lit dome. */
  sheen: string;
  horn: string;
  bodyW: number;
  elyH: number;
  plateH: number;
}
export const BEETLE_LOOK: BeetleLook = {
  shell: '#42527a',
  plate: '#333f5e',
  seam: '#1f2740',
  sheen: '#7fd8c9',
  horn: '#242c44',
  bodyW: 0.2,
  elyH: 0.3,
  plateH: 0.17,
};
export function paintBeetleBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: BeetleLook,
  f: BeastBlockFrame,
  at = 0,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  const { bx, gy, s, fx, fy, ys } = f;
  const px = -fy;
  const py = fx;
  const shell = shade(look.shell, (((f.seed >>> 5) & 7) - 3) * 2);
  const lift = f.bob * 0.35 * s;
  const tk = f.topScale ?? 1;

  // Elytra: one big domed shell over the rear three-quarters.
  const aC = -hl * 0.18;
  const aR = hl * 0.8;
  const ely: Array<[number, number]> = [
    [aC + aR, -hw * 0.62],
    [aC + aR, hw * 0.62],
    [aC + aR * 0.5, hw],
    [aC - aR * 0.5, hw],
    [aC - aR, hw * 0.55],
    [aC - aR, -hw * 0.55],
    [aC - aR * 0.5, -hw],
    [aC + aR * 0.5, -hw],
  ];
  const drawEly = (): void =>
    paintBlockBody(
      ctx,
      f,
      ely,
      (X) => look.elyH * (1 - 0.45 * Math.pow((X - aC) / aR, 2)),
      () => 0.06,
      shell,
      (gx, gyy, lift2) => {
        // Seam, striations and sheen live in the elytra's rotated
        // frame so every facing keeps them running nose-to-tail.
        ctx.save();
        ctx.translate(gx(aC, 0), gyy(aC, 0) - look.elyH * tk * s * 0.88 - lift2);
        ctx.rotate(Math.atan2(fy * ys, fx));
        // The center split — two wing cases, not one shell — opening
        // from a scutellum notch at the front.
        ctx.strokeStyle = look.seam;
        ctx.lineWidth = Math.max(1.5, s * 0.03);
        ctx.beginPath();
        ctx.moveTo(aR * 0.8 * s, 0);
        ctx.lineTo(-aR * 0.95 * s, 0);
        ctx.stroke();
        ctx.fillStyle = look.seam;
        ctx.beginPath();
        ctx.moveTo(aR * 0.92 * s, -hw * s * 0.28);
        ctx.lineTo(aR * 0.55 * s, 0);
        ctx.lineTo(aR * 0.92 * s, hw * s * 0.28);
        ctx.closePath();
        ctx.fill();
        // Pit striations flanking the seam.
        ctx.lineWidth = Math.max(1, s * 0.013);
        ctx.globalAlpha = 0.45;
        for (const q of [-0.5, 0.5]) {
          ctx.beginPath();
          ctx.moveTo(aR * 0.5 * s, q * hw * s * 0.55);
          ctx.lineTo(-aR * 0.8 * s, q * hw * s * 0.55);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // Iridescent glaze catching on the lit dome.
        ctx.fillStyle = look.sheen;
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        facetBlob(ctx, aR * 0.28 * s, -hw * s * 0.32, aR * 0.5 * s, f.seed | 3, 7, 0.62, 0.8);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      },
    );

  // Pronotum plate + head + horn + antennae as one forequarter group.
  const drawFore = (): void => {
    const cC = hl * 0.72;
    const cR = hl * 0.3;
    const cw = hw * 0.78;
    const pro: Array<[number, number]> = [
      [cC + cR, -cw * 0.6],
      [cC + cR, cw * 0.6],
      [cC + cR * 0.4, cw],
      [cC - cR * 0.5, cw],
      [cC - cR, cw * 0.6],
      [cC - cR, -cw * 0.6],
      [cC - cR * 0.5, -cw],
      [cC + cR * 0.4, -cw],
    ];
    paintBlockBody(
      ctx,
      f,
      pro,
      (X) => look.plateH * (1 - 0.35 * Math.pow((X - cC) / cR, 2)),
      () => 0.06,
      f.hurt ? '#ffffff' : look.plate,
    );
    // Head chip in front of the plate.
    const hx0 = bx + fx * hl * 1.08 * s;
    const hy0 = gy + fy * hl * 1.08 * ys * s - look.plateH * 0.4 * tk * s - lift;
    ctx.fillStyle = f.hurt ? '#ffffff' : shade(look.plate, -8);
    ctx.beginPath();
    facetCircle(ctx, hx0, hy0, s * 0.06, 6, Math.atan2(fy * ys, fx));
    ctx.fill();
    // THE HORN: a rhino hook curving up-forward off the head — tossed
    // upward through the strike.
    const toss = at > 0.7 ? Math.sin(Math.PI * Math.min(1, (at - 0.7) / 0.3)) * 0.12 : 0;
    const P = (fw: number, up: number): { x: number; y: number } => ({
      x: bx + fx * fw * s,
      y: gy + fy * fw * ys * s - up * tk * s - lift,
    });
    const hB = P(hl * 1.06, look.plateH * 0.5);
    const hM = P(hl * 1.32, look.plateH * 0.5 + 0.18);
    const hT = P(hl * 1.34, look.plateH * 0.5 + 0.4 + toss);
    const a1 = Math.atan2(hM.y - hB.y, hM.x - hB.x) + Math.PI / 2;
    const a2 = Math.atan2(hT.y - hM.y, hT.x - hM.x) + Math.PI / 2;
    const w0 = Math.max(1.6, s * 0.05);
    const w1 = Math.max(1.2, s * 0.028);
    ctx.fillStyle = f.hurt ? '#ffffff' : look.horn;
    ctx.beginPath();
    ctx.moveTo(hB.x + Math.cos(a1) * w0, hB.y + Math.sin(a1) * w0);
    ctx.lineTo(hM.x + Math.cos(a2) * w1, hM.y + Math.sin(a2) * w1);
    ctx.lineTo(hT.x, hT.y);
    ctx.lineTo(hM.x - Math.cos(a2) * w1, hM.y - Math.sin(a2) * w1);
    ctx.lineTo(hB.x - Math.cos(a1) * w0, hB.y - Math.sin(a1) * w0);
    ctx.closePath();
    ctx.fill();
    // Lit leading edge so the hook reads against the dark shell.
    ctx.strokeStyle = f.hurt ? '#ffffff' : shade(look.shell, 26);
    ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.beginPath();
    ctx.moveTo(hB.x + Math.cos(a1) * w0 * 0.7, hB.y + Math.sin(a1) * w0 * 0.7);
    ctx.lineTo(hM.x + Math.cos(a2) * w1 * 0.7, hM.y + Math.sin(a2) * w1 * 0.7);
    ctx.lineTo(hT.x, hT.y);
    ctx.stroke();
    // Elbowed antennae with club tips, staggered; far one hides at
    // profile.
    const dead = f.topScale !== undefined && f.topScale < 1;
    // No antennae from behind — over the dome they read as stray
    // grass, and the horn already carries the silhouette.
    if (!dead && !f.hurt && fy > -0.35) {
      for (const es of [-1, 1]) {
        if (Math.abs(fx) > 0.65 && es * py < 0) continue;
        const a0x = hx0 + px * es * s * 0.05;
        const a0y = hy0 + py * es * s * 0.05 * ys;
        const a1x = a0x + (fx * 0.1 + px * es * 0.08) * s;
        const a1y = a0y + (fy * 0.1 + py * es * 0.08) * ys * s - s * 0.035;
        const a2x = a1x + (fx * 0.05 + px * es * 0.055) * s;
        const a2y = a1y - s * 0.055;
        ctx.strokeStyle = look.horn;
        ctx.lineWidth = Math.max(1.2, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(a0x, a0y);
        ctx.lineTo(a1x, a1y);
        ctx.lineTo(a2x, a2y);
        ctx.stroke();
        ctx.fillStyle = look.horn;
        ctx.fillRect(a2x - s * 0.018, a2y - s * 0.018, s * 0.036, s * 0.036);
      }
    }
  };

  // True depth between the two masses: walking away, the forequarter
  // tucks behind the dome instead of pasting over it.
  if (fy < -0.2) {
    drawFore();
    drawEly();
  } else {
    drawEly();
    drawFore();
  }
}
