/**
 * THE PACK — wolf, dire wolf, fey wolf and worg: the canid family, its ears and their chains.
 * Split out of rig.ts on the golems.ts template (foundations F3.4);
 * rig.ts re-exports everything here, so every lab, test and painter
 * keeps its old door.
 */
// The engine's shared grammar comes back from rig.ts — the same
// deferred cycle golems.ts has always ridden (touched only at draw
// time, long after both modules initialize).
import type { DireWolfLook, FeyWolfLook } from './rig.js';

/**
 * The wolf: a lean predator prism — deep chest, tucked waist, shoulder
 * hump, dark saddle cape over pale underparts, erect ears, long
 * foreshortening muzzle, amber eyes and a bushy dark-tipped brush.
 */
export interface WolfLook {
  coat: string;
  saddle: string;
  under: string;
  earIn: string;
  eye: string;
  /** Body half-width (tiles); length comes from the BeastSpec. */
  bodyW: number;
  backH: number;
  /** Extra mass ramped up over the shoulders. */
  shoulderH: number;
  /** Belly height at the chest (deep) and the waist (tucked). */
  chestH: number;
  tuckH: number;
  headW: number;
  headH: number;
}
export const WOLF_LOOK: WolfLook = {
  coat: '#6a6f7d',
  saddle: '#4b4e5d',
  under: '#b7b2a2',
  earIn: '#3a3644',
  eye: '#e2a63c',
  bodyW: 0.165,
  backH: 0.54,
  shoulderH: 0.085,
  chestH: 0.25,
  tuckH: 0.33,
  headW: 0.3,
  headH: 0.245,
};
/** Pre-resolved canid-ear tones — the painter never learns a species. */
export interface CanidEarStyle {
  /** The blade's frame fill, both faces. */
  fill: string;
  /** Pale inner fan, face-on only. */
  inner: string;
  /** Back cartilage seam. */
  seam: string;
}
/**
 * Paint one projected canid ear off a physics (or rest) chain — the
 * pricked blade every wolf-line head wears: straight tapered edges,
 * pale inner fan face-on, one cartilage seam behind, and the optional
 * NOTCH bitten from the trailing edge (the matriarch's history in
 * silhouette). Plain path calls so painter tests can walk every
 * coordinate.
 */
export function paintCanidEar(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  w0: number,
  st: CanidEarStyle,
  o: { front: boolean; hurt: boolean; dead: boolean; notch: boolean; headX: number; headY: number },
): void {
  const prof = [1, 0.8, 0.45, 0];
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
    const ww = w0 * prof[i]!;
    ea.push({ x: pts[i]!.x + ty * ww, y: pts[i]!.y - tx * ww });
    eb.push({ x: pts[i]!.x - ty * ww, y: pts[i]!.y + tx * ww });
  }
  // The leading edge faces AWAY from the skull (the wing-ear law).
  const da = Math.hypot(ea[1]!.x - o.headX, ea[1]!.y - o.headY);
  const db = Math.hypot(eb[1]!.x - o.headX, eb[1]!.y - o.headY);
  const lead = da >= db ? ea : eb;
  const trail = da >= db ? eb : ea;
  const blade = (): void => {
    ctx.beginPath();
    ctx.moveTo(trail[0]!.x, trail[0]!.y);
    ctx.lineTo(lead[0]!.x, lead[0]!.y);
    ctx.lineTo(lead[1]!.x, lead[1]!.y);
    ctx.lineTo(lead[2]!.x, lead[2]!.y);
    ctx.lineTo(pts[3]!.x, pts[3]!.y);
    if (o.notch) {
      // The V bitten into the trailing edge on the way back down.
      const ax = trail[2]!.x * 0.6 + pts[3]!.x * 0.4;
      const ay = trail[2]!.y * 0.6 + pts[3]!.y * 0.4;
      ctx.lineTo(ax, ay);
      ctx.lineTo(ax * 0.62 + pts[2]!.x * 0.38, ay * 0.62 + pts[2]!.y * 0.38);
      ctx.lineTo(trail[2]!.x * 0.8 + trail[1]!.x * 0.2, trail[2]!.y * 0.8 + trail[1]!.y * 0.2);
    } else {
      ctx.lineTo(trail[2]!.x, trail[2]!.y);
    }
    ctx.lineTo(trail[1]!.x, trail[1]!.y);
    ctx.closePath();
  };
  ctx.lineJoin = 'round';
  ctx.fillStyle = o.hurt ? '#ffffff' : st.fill;
  blade();
  ctx.fill();
  if (o.hurt) return;
  if (o.front && !o.dead) {
    ctx.fillStyle = st.inner;
    ctx.beginPath();
    ctx.moveTo(pts[0]!.x + (trail[0]!.x - pts[0]!.x) * 0.45, pts[0]!.y + (trail[0]!.y - pts[0]!.y) * 0.45);
    ctx.lineTo(pts[0]!.x + (lead[0]!.x - pts[0]!.x) * 0.55, pts[0]!.y + (lead[0]!.y - pts[0]!.y) * 0.55);
    ctx.lineTo(lead[1]!.x * 0.6 + pts[1]!.x * 0.4, lead[1]!.y * 0.6 + pts[1]!.y * 0.4);
    ctx.lineTo(pts[2]!.x * 0.85 + pts[3]!.x * 0.15, pts[2]!.y * 0.85 + pts[3]!.y * 0.15);
    ctx.lineTo(trail[1]!.x * 0.6 + pts[1]!.x * 0.4, trail[1]!.y * 0.6 + pts[1]!.y * 0.4);
    ctx.closePath();
    ctx.fill();
  } else if (!o.front && !o.dead) {
    ctx.strokeStyle = st.seam;
    ctx.lineWidth = Math.max(1, w0 * 0.16);
    ctx.beginPath();
    ctx.moveTo(pts[0]!.x, pts[0]!.y);
    ctx.quadraticCurveTo(pts[1]!.x, pts[1]!.y, pts[2]!.x, pts[2]!.y);
    ctx.stroke();
  }
}
export const DIREWOLF_LOOK: DireWolfLook = {
  coat: '#4b4854',
  saddle: '#312e3c',
  under: '#9d97a0',
  grizzle: '#8d8fa0',
  hackle: '#232030',
  earIn: '#241f2c',
  eye: '#ff9a3d',
  eyeCore: '#ffe4ac',
  scar: '#8f8494',
  bodyW: 0.215,
  backH: 0.68,
  shoulderH: 0.16,
  chestH: 0.3,
  tuckH: 0.46,
  headW: 0.385,
  headH: 0.3,
};
/**
 * OLD FANG (the dread crown, the wolf boss): the dire painter worn
 * by an authored DESIGN, never a reskin — aged iron-grey where the
 * dire runs storm-charcoal, and the frost ticking laid on HEAVY: a
 * coat gone white at the guard hairs the way an old muzzle goes
 * white. Old-gold eyes (the dire's burn ember), pale scar rake wider
 * than hers — his ledger is longer. Frame reads OLD AND RANGY:
 * leaner in the body and lower at the back than the matriarch,
 * carried on the longest lope in the wood.
 */
export const OLDFANG_LOOK: DireWolfLook = {
  coat: '#7a7468',
  saddle: '#4e4838',
  under: '#c2bba8',
  grizzle: '#dcd8c8',
  hackle: '#38332a',
  earIn: '#3d3226',
  eye: '#f2c23a',
  eyeCore: '#fff4cc',
  scar: '#b8b0a0',
  bodyW: 0.205,
  backH: 0.66,
  shoulderH: 0.15,
  chestH: 0.28,
  tuckH: 0.44,
  headW: 0.37,
  headH: 0.29,
};
export const FEYWOLF_LOOK: FeyWolfLook = {
  coat: '#9a94b4',
  mantle: '#5c5480',
  under: '#e0dcec',
  glimmer: '#9ff0d8',
  silver: '#c8cede',
  silverDeep: '#6e7590',
  earIn: '#4a4468',
  eye: '#8cf0cc',
  eyeCore: '#f2fff6',
  // THE SLENDER BEAM: narrower than the matriarch on a longer body —
  // the hound's mass is height and reach, never width.
  bodyW: 0.2,
  // The streamline pass thins the BARREL too: the height stays in
  // the legs and the carried head, not in a deep body slab — profile
  // depth at the chest is now ~0.29 tiles where the first cut ran
  // 0.38 (the "big long chest" the user called out).
  backH: 0.73,
  shoulderH: 0.1,
  // The chest is a KEEL: deep enough to read athletic, shallow
  // enough that the front half never becomes the pack's barrel.
  chestH: 0.44,
  tuckH: 0.61,
  headW: 0.36,
  headH: 0.28,
};
/**
 * The worg: goblin-kin war-hound, designed around ONE silhouette
 * element: the HYENA SLOPE — towering shoulders falling hard down a
 * pencil-thin rump, the head slung LOW off the withers. A bear-trap
 * skull with an underbite whose fang-tusks hook up past the muzzle,
 * big ragged bat ears torn at the edges, mange-dappled dun hide over
 * a bare-skin chest, a short ratty kink of a tail — nothing about it
 * reads noble. The eyes are sickly green and set forward: it is
 * thinking about you specifically.
 */
export interface WorgLook {
  hide: string;
  /** Mange dapple blotches across the shoulders. */
  dapple: string;
  /** The short choppy bristle strip down the nape — patchy, not a mane. */
  mane: string;
  /** Bare skin: chest bib, muzzle, tail hide. */
  bare: string;
  earIn: string;
  eye: string;
  fang: string;
  bodyW: number;
  /** Withers height — the tall front of the slope. */
  shoulderH: number;
  /** Rump height — the low rear of the slope. */
  rumpH: number;
  chestH: number;
  headW: number;
  headH: number;
}
export const WORG_LOOK: WorgLook = {
  hide: '#6b5f47',
  dapple: '#544a36',
  mane: '#38301f',
  bare: '#8f7a62',
  earIn: '#4a3a30',
  eye: '#b8d44a',
  fang: '#e8dfc8',
  bodyW: 0.2,
  shoulderH: 0.6,
  rumpH: 0.34,
  chestH: 0.22,
  headW: 0.34,
  headH: 0.27,
};
