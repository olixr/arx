/**
 * THE UNDERFOOT — rat and boar.
 * Split out of rig.ts on the golems.ts template (foundations F3.4);
 * rig.ts re-exports everything here, so every lab, test and painter
 * keeps its old door.
 */
import { chamferRect, facetBlob, facetCircle } from './shapes.js';
import { shade } from './tint.js';
// The engine's shared grammar comes back from rig.ts — the same
// deferred cycle golems.ts has always ridden (touched only at draw
// time, long after both modules initialize).
import { OUTLINE, faceProfileK, paintBlockBody } from './rig.js';
import type { BeastBlockFrame, BeastSpec } from './rig.js';

/**
 * The giant rat: a low hunched wedge — rump high and round, body
 * tapering into a pointed twitchy head with big dish ears, whiskers,
 * buck teeth and a long naked tail dragging an S behind it.
 */
export interface RatLook {
  fur: string;
  dorsal: string;
  belly: string;
  /** Naked skin — tail, nose, inner ear. */
  skin: string;
  earIn: string;
  bodyW: number;
  /** Height of the hunched rump peak. */
  humpH: number;
  headW: number;
  headH: number;
}
export const RAT_LOOK: RatLook = {
  fur: '#8a7a6a',
  dorsal: '#69594b',
  belly: '#b5a68f',
  skin: '#c9a68a',
  earIn: '#d8a396',
  bodyW: 0.2,
  humpH: 0.29,
  headW: 0.25,
  headH: 0.18,
};
export function paintRatBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: RatLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // Teardrop footprint: full-width haunches, shoulders pinching in
  // where the head takes over.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.45],
    [hl, hw * 0.45],
    [hl * 0.2, hw * 0.85],
    [-hl * 0.5, hw],
    [-hl, hw * 0.55],
    [-hl, -hw * 0.55],
    [-hl * 0.5, -hw],
    [hl * 0.2, -hw * 0.85],
  ];
  const fur = shade(look.fur, (((f.seed >>> 7) & 7) - 3) * 2);
  paintBlockBody(
    ctx,
    f,
    foot,
    // The hunched arch: peak over the haunches, falling away to the
    // shoulders — THE rat silhouette side-on.
    (X) => look.humpH - 0.05 * (X / hl + 0.35) * (X / hl + 0.35),
    (X) => 0.05 + 0.02 * Math.max(0, X / hl),
    fur,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      // Greasy dorsal stripe down the spine.
      ctx.save();
      ctx.translate(gx(-hl * 0.12, 0), gyy(-hl * 0.12, 0) - look.humpH * tk * s * 0.9 - lift);
      ctx.rotate(Math.atan2(f.fy * f.ys, f.fx));
      ctx.fillStyle = look.dorsal;
      ctx.beginPath();
      facetBlob(ctx, 0, 0, hl * s * 0.78, f.seed | 1, 9, (hw * 0.62) / (hl * 0.78), 0.9);
      ctx.fill();
      ctx.restore();
    },
  );
}
/**
 * The rat head: pointed snout wedge off a small skull, dish ears
 * behind, beady eyes, whiskers and buck teeth. Muzzle and eyes obey
 * the same foreshortening laws as the cattle and wolf.
 */
export function drawRatHead(
  ctx: CanvasRenderingContext2D,
  look: RatLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** -1..1 fast whisker twitch, idle only. */
    twitch?: number;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);

  // Big dish ears behind the skull, pink inside when they face us. A
  // touch of along-facing stagger keeps them apart at full profile.
  for (const es of [-1, 1]) {
    const exr = cx + px * es * w * 0.5 + fx * es * w * 0.07;
    const eyr = cy + (py * es * w * 0.5 + fy * es * w * 0.07) * ys - h * 0.42;
    ctx.fillStyle = C(shade(look.fur, -8));
    ctx.beginPath();
    facetCircle(ctx, exr, eyr, w * 0.36, 6, es * 0.4);
    ctx.fill();
    if (fy > -0.1 && !o.hurt && !o.dead) {
      ctx.fillStyle = look.earIn;
      ctx.beginPath();
      facetCircle(ctx, exr + fx * w * 0.04, eyr + fy * w * 0.04, w * 0.2, 6, es * 0.4);
      ctx.fill();
    }
  }

  // Small skull block — a step lighter than the body fur so the head
  // reads against the haunches at profile.
  ctx.fillStyle = C(shade(look.fur, 8));
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
    ctx.fillStyle = C(look.belly);
    ctx.fillRect(cx - w / 2, cy + h * 0.2, w, h * 0.3);
    ctx.restore();
  }

  // Pointed snout — longer and narrower in profile, pink nose tip.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.24;
    const by0 = cy + fy * w * 0.24 * ys + h * 0.1;
    const sl = w * (0.3 + 0.3 * profileK);
    const tx = bx0 + fx * sl;
    const ty = by0 + fy * sl * ys + h * 0.12;
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.16 * (1 - profileK * 0.3);
    const ht = hb * 0.25;
    ctx.fillStyle = C(shade(look.fur, 8));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C(look.skin);
    ctx.beginPath();
    facetCircle(ctx, tx, ty, w * 0.062, 5, fx);
    ctx.fill();
    // Buck teeth under the nose when the face shows.
    if (fy > 0.1 && !o.hurt && !o.dead) {
      ctx.fillStyle = '#efe9d8';
      ctx.fillRect(tx - w * 0.05, ty + h * 0.08, w * 0.044, h * 0.16);
      ctx.fillRect(tx + w * 0.008, ty + h * 0.08, w * 0.044, h * 0.16);
    }
    // Whiskers fanning back off the snout — the near side only once
    // the head goes full profile.
    if (!o.dead && !o.hurt) {
      ctx.strokeStyle = 'rgba(240, 236, 224, 0.7)';
      ctx.lineWidth = Math.max(0.8, s * 0.007);
      const wbx = bx0 + (axv / al) * sl * 0.55;
      const wby = by0 + (ayv / al) * sl * 0.55;
      const baseA = Math.atan2(ayv, axv);
      const tw = (o.twitch ?? 0) * 0.12;
      for (const es of [-1, 1]) {
        if (profileK > 0.75 && es * py < 0) continue;
        for (const k of [-1, 0, 1]) {
          const a = baseA + es * (1.5 - k * 0.3) + tw * es;
          ctx.beginPath();
          ctx.moveTo(wbx, wby);
          ctx.lineTo(wbx + Math.cos(a) * w * 0.52, wby + Math.sin(a) * w * 0.4);
          ctx.stroke();
        }
      }
    }
  }

  // Beady eyes at the snout root.
  if (!o.dead && fy > -0.45) {
    ctx.fillStyle = OUTLINE;
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.16 + px * es * w * 0.27;
      const ey = cy + (fy * w * 0.16 + py * es * w * 0.27) * ys - h * 0.06;
      ctx.fillRect(ex - w * 0.05, ey - w * 0.05, w * 0.1, w * 0.1);
    }
  }
}
/**
 * The boar: a battering wedge built around four reads owned by no
 * other body — THE RAZOR HUMP (a shoulder tower falling away to a
 * lean low stern; the whole topline is a charge waiting to happen),
 * THE HEDGE CREST (a continuous serrated bristle ridge crown-to-
 * midback that erects when the charge winds up), THE RAVAGER TUSKS
 * (up-swept ivory crescents off the jaw corners), and THE GRIZZLE
 * MASK (a pale band down the snout ridge under furious little eyes).
 * The dire boar is a DESIGN, never an upscale: the mountain hump,
 * frost-tipped quills over cold iron, four aged tusks, rake scars.
 */
export interface BoarLook {
  hide: string;
  bristle: string;
  /** Lit quill tips — the crest must read on its own dark hedge. */
  quillTip: string;
  /** Grizzled dust: the snout-ridge mask and the flank band. */
  grizzle: string;
  snout: string;
  tusk: string;
  earIn: string;
  /** The furious little lamp set in the dark eye mask. */
  eye: string;
  bodyW: number;
  /** Stern topline height — the LOW end of the razorback slope. */
  backH: number;
  /** Shoulder-hump rise over the withers — the tower the slope falls from. */
  humpH: number;
  /** Bristle-quill height over the hump line. */
  crestH: number;
  /** Belly clearance at the deep chest / at the tucked stern. */
  chestH: number;
  tuckH: number;
  headW: number;
  headH: number;
  /** Tusk reach as a fraction of headW — the ravager dial. */
  tuskLen: number;
  /** The dire pair: upper hooks seated over the lower scimitars. */
  fourTusk?: boolean;
  /** Pale rake-scars on the flank — the dire's war record (seeded). */
  scar?: string;
  /** Heavy jowl masses framing the jaw (the dire's old-bruiser face). */
  jowl?: boolean;
  /** Tail cord length multiplier — the dire drags a longer rope. */
  tailK: number;
}
export const BOAR_LOOK: BoarLook = {
  hide: '#5e4736',
  bristle: '#291e16',
  quillTip: '#8d6c4c',
  grizzle: '#93765a',
  snout: '#c9917c',
  tusk: '#f1e8d2',
  earIn: '#241a14',
  eye: '#d8a03c',
  bodyW: 0.23,
  backH: 0.4,
  humpH: 0.15,
  crestH: 0.1,
  chestH: 0.1,
  tuckH: 0.19,
  headW: 0.33,
  headH: 0.27,
  tuskLen: 0.52,
  tailK: 1,
};
/**
 * THE SCARRED IRON: the dire boar wears a cold iron-umber coat under
 * a frost-tipped quill hedge — a mountain at the shoulder where the
 * boar is a wedge, aged four-tusk jaws where the boar carries two
 * clean crescents, and garnet eyes sunk in heavy jowls. At any zoom
 * the two must never read as one silhouette twice.
 */
export const DIREBOAR_LOOK: BoarLook = {
  hide: '#423c3e',
  bristle: '#1d181a',
  quillTip: '#a89c8a',
  grizzle: '#6f655c',
  snout: '#8d6a60',
  tusk: '#dccfa8',
  earIn: '#161113',
  eye: '#c74a35',
  bodyW: 0.3,
  backH: 0.5,
  humpH: 0.26,
  crestH: 0.13,
  chestH: 0.13,
  tuckH: 0.26,
  headW: 0.42,
  headH: 0.34,
  tuskLen: 0.62,
  fourTusk: true,
  scar: '#78685c',
  jowl: true,
  tailK: 1.55,
};
