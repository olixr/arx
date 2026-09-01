/**
 * THE RED SKULK — the fox.
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
 * THE FOX — the cunning made flesh, and none of it borrowed: not the
 * wolf's slab skull, not the lynx's flat plate, not the worg's slope.
 * Four reads own the species. THE BRUSH: a tail nearly the body's own
 * length ending in the white flag — the one mark that survives any
 * zoom, any coat, any light. THE SOOT EARS: oversized triangles,
 * black-backed, so the fox reads from BEHIND by its ears alone. THE
 * SNIPE: a fine tapering muzzle under amber eyes cut with the vertical
 * pupil — the only canid in the wood wearing a cat's eye. THE
 * STOCKINGS: dark legs under a warm coat, the fox stepping in soot.
 */
export interface FoxLook {
  coat: string;
  /** Cream bib, underbelly, and the pale side of every mark. */
  under: string;
  /** The dark stockings — a fox walks in soot to the knee. */
  sock: string;
  /** Soot backing the oversized ears — the from-behind read. */
  earBack: string;
  earIn: string;
  eye: string;
  nose: string;
  /** The brush flag: white for the wild skulk, smoke for the queen. */
  tip: string;
  /** The brush's darker root third — volume, not a banded raccoon. */
  brushRoot: string;
  /**
   * The cross-fox mark: a dark dorsal stripe crossed by a shoulder
   * bar. One wild cluster wears it faint; the matriarch wears it
   * burned deep — the cross writ large.
   */
  mantle?: string;
  /** Silver ticking — the sable cluster's frost, the queen's winters. */
  grizzle?: string;
  bodyW: number;
  backH: number;
  /** A modest wither rise — the fox carries its head HIGH and alert. */
  shoulderH: number;
  /** The light spring coiled behind — well under the lynx's ramp. */
  haunchH: number;
  chestH: number;
  /** High tuck: the leggy waist that says featherweight at any zoom. */
  tuckH: number;
  headW: number;
  headH: number;
  /**
   * The matriarch dresses further: the great pale ruff collar, the
   * silvered mask, the ember ring on her smoke brush. Champions never
   * roll a cluster — the vixen is a DESIGN (the packlord law).
   */
  champion?: boolean;
  /** The queen's ember ring, banded below her smoke tip. */
  ember?: string;
  /** The great ruff collar — pale, chest-deep, no lean fox carries it. */
  ruff?: string;
  seed?: number;
}
export const FOX_LOOKS: Record<string, FoxLook> = {
  fox: {
    coat: '#b4622a',
    under: '#ead9bf',
    sock: '#33241c',
    earBack: '#2c1f18',
    earIn: '#d8b992',
    eye: '#e8a83c',
    nose: '#241a16',
    tip: '#efe8d8',
    brushRoot: '#8a4b22',
    bodyW: 0.13,
    backH: 0.42,
    shoulderH: 0.05,
    haunchH: 0.055,
    chestH: 0.22,
    tuckH: 0.33,
    // The head carries a fuller share of the animal than the first
    // cut gave it — proportional to the body, and broad enough that
    // the ear roots seat ON the skull at every band.
    headW: 0.27,
    headH: 0.22,
  },
  // THE DIRE FOX — the smokebrush vixen, the matriarch. Never a scaled
  // fox and never the dire wolf's wall of meat: she is RANGY, an
  // ember-dark blade on legs too long for her shadow. Her marks are
  // her own: the cross-fox mantle burned charcoal-deep, a silvered
  // mask (her winters, worn on the face), the great pale ruff collar,
  // cold jade eyes where the dire wolf burns ember — and THE SMOKE
  // BRUSH: her flag ends DARK with one ember-bright ring where the
  // whole skulk's ends white. The inversion detail, kept.
  fox_champion: {
    coat: '#6b3226',
    under: '#b9a68f',
    sock: '#221a1e',
    earIn: '#a08a80',
    eye: '#9fd8a8',
    nose: '#1f181a',
    tip: '#2c2430',
    // The worg lesson: ears in the coat's own value VANISH — the
    // queen's soot runs frost-plum, two full steps lighter than her
    // head, so the blades stand against her at every band.
    earBack: '#5a4750',
    brushRoot: '#542a22',
    mantle: '#3a2830',
    grizzle: '#b8aab4',
    bodyW: 0.16,
    backH: 0.54,
    shoulderH: 0.06,
    haunchH: 0.07,
    chestH: 0.25,
    tuckH: 0.43,
    headW: 0.33,
    headH: 0.26,
    champion: true,
    ember: '#d97a35',
    ruff: '#cbb9a4',
  },
};
/**
 * THE COAT CLUSTERS (the gnoll law, spoken vulpine): four curated wild
 * colorways a spawned skulk spreads across — the ember red, the frost
 * white, the dusk cross, and the sable silver. Never a random hue
 * roll; always one of the four coats the wood actually breeds.
 */
export const FOX_CLUSTERS: ReadonlyArray<
  Pick<FoxLook, 'coat' | 'under' | 'sock' | 'brushRoot' | 'tip' | 'mantle' | 'grizzle'>
> = [
  // Ember — the classic red, soot to the knee.
  { coat: '#b4622a', under: '#ead9bf', sock: '#33241c', brushRoot: '#8a4b22', tip: '#efe8d8' },
  // Frost — the white fox of the high snows; even its soot runs pale.
  { coat: '#d9d2c1', under: '#f2ede1', sock: '#8d8478', brushRoot: '#a89f8e', tip: '#f8f4ea' },
  // Dusk — the cross fox: bracken brown wearing the faint dark cross.
  {
    coat: '#8a5c38',
    under: '#d9c8ac',
    sock: '#2c211b',
    brushRoot: '#6b3f26',
    tip: '#e8dfc9',
    mantle: '#4a3526',
  },
  // Sable — the silver fox: near-black ticked in frost, the white
  // flag popping hardest of all four.
  {
    coat: '#45414c',
    under: '#8f8a96',
    sock: '#26232c',
    brushRoot: '#37333e',
    tip: '#f0ece2',
    grizzle: '#9a95a4',
  },
];
export const FOX_LOOK_CACHE = new Map<string, FoxLook>();
export function foxLook(defId: string, seed = 0): FoxLook {
  const base = FOX_LOOKS[defId] ?? FOX_LOOKS['fox']!;
  const key = `${defId}|${seed & 0xff}`;
  const hit = FOX_LOOK_CACHE.get(key);
  if (hit) return hit;
  let look: FoxLook;
  if (defId === 'fox') {
    // Hash the seed before picking: skulk members spawn with
    // CONSECUTIVE eids, and raw high bits would dress a whole earth
    // in one coat — the hash spreads the litter across the clusters
    // (the gnoll lesson, kept).
    const h = (seed * 2654435761) | 0;
    const cl = FOX_CLUSTERS[(h >>> 8) & 3]!;
    const jit = (((h >>> 12) & 7) - 3) * 2;
    look = {
      ...base,
      coat: shade(cl.coat, jit),
      under: cl.under,
      sock: cl.sock,
      brushRoot: shade(cl.brushRoot, jit),
      tip: cl.tip,
      mantle: cl.mantle,
      grizzle: cl.grizzle,
      seed,
    };
  } else {
    // The smokebrush vixen holds her authored design.
    look = { ...base, seed };
  }
  FOX_LOOK_CACHE.set(key, look);
  return look;
}
export function paintFoxBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: FoxLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // THE STREAMLINED HULL: a fox is an arrow, not a barrel — the deep
  // narrow chest CARRIES the width, the waist draws in hard, and the
  // rump runs to a NARROW stern that pours straight into the brush
  // root. Neither the wolf's keel-and-slab nor the cat's wide-rumped
  // wedge: the taper is the species. What says fox at world zoom is
  // how little body rides how much brush.
  // The widest station sits just AHEAD of midship and the rump holds
  // its width — a lithe barrel, never a dart: the first cut's
  // chest-widest linear taper read as a triangle.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.7],
    [hl, hw * 0.7],
    [hl * 0.35, hw],
    [-hl * 0.35, hw * 0.88],
    [-hl, hw * 0.58],
    [-hl, -hw * 0.58],
    [-hl * 0.35, -hw * 0.88],
    [hl * 0.35, -hw],
  ];
  // Skulk variance: each fox's coat sits a step off the cluster tone.
  const coat = shade(look.coat, (((f.seed >>> 5) & 7) - 3) * 2);
  paintBlockBody(
    ctx,
    f,
    foot,
    // THE ARROW TOPLINE: the neck root RISES out of the chest (the
    // fox listens UP — the head must grow from the body, never hover
    // off it), a shallow dip behind the withers, a light loin arch
    // over the coiled rear, then the stern FALLS AWAY into the brush
    // root — the tail reads attached because the body hands it off.
    (X) =>
      look.backH +
      (look.shoulderH + 0.045) * Math.max(0, (X / hl - 0.45) / 0.55) -
      0.02 * Math.max(0, 1 - Math.abs(X / hl - 0.15) / 0.45) +
      look.haunchH * Math.max(0, 1 - Math.abs(-X / hl - 0.55) / 0.45) -
      0.075 * Math.max(0, (-X / hl - 0.72) / 0.28),
    // The deep little chest into the HIGH hard tuck — the leggy
    // waist, drawn tighter than any other beast wears it.
    (X) => look.chestH + (look.tuckH - look.chestH) * Math.min(1, Math.max(0, (0.5 - X / hl) / 0.85)),
    coat,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      const bh = look.backH * tk * s;
      // THE CROSS: the dark dorsal stripe with its shoulder bar — the
      // dusk cluster wears it faint, the matriarch wears it burned.
      // Laid FIRST so ticking and bib read against it.
      if (look.mantle && !f.hurt) {
        ctx.save();
        ctx.translate(gx(0, 0), gyy(0, 0) - bh * 0.96 - lift);
        ctx.rotate(Math.atan2(f.fy * f.ys, f.fx));
        ctx.fillStyle = look.mantle;
        // The spine stripe, nape to brush root.
        ctx.beginPath();
        facetBlob(ctx, -hl * s * 0.06, 0, hl * s * 0.78, f.seed | 1, 9, (hw * 0.3) / (hl * 0.78), 0.3);
        ctx.fill();
        // The bar across the shoulders — the second stroke of the
        // cross, drawn in its own quarter-turned frame.
        ctx.save();
        ctx.translate(hl * s * 0.42, 0);
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        facetBlob(ctx, 0, 0, hw * s * 0.92, f.seed ^ 0x2b, 7, 0.32, 0.4);
        ctx.fill();
        ctx.restore();
        ctx.restore();
      }
      // Silver ticking riding the saddle line — STROKES, never fills
      // (the fur-dialect law): the sable cluster's frost, and the
      // matriarch's winters worn down her back.
      if (look.grizzle && !f.hurt) {
        ctx.strokeStyle = look.grizzle;
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.lineCap = 'round';
        for (let k = 0; k < 6; k++) {
          const rr = ((((f.seed >>> (k % 11)) * 2654435761 + k * 131) >>> 0) % 1000) / 1000;
          const X = (-0.6 + 0.24 * k + (rr - 0.5) * 0.12) * hl;
          const Y = ((k & 1) === 0 ? 1 : -1) * hw * (0.12 + 0.2 * rr);
          const sx = gx(X, Y);
          const sy = gyy(X, Y) - bh * (0.9 + 0.06 * rr) - lift;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx - f.fx * s * 0.03, sy + s * 0.028);
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
      }
      // THE BIB: the fox's white front — bigger and brighter than the
      // wolf's, the second-surest read after the flag. Only while the
      // chest can actually face the camera.
      if (f.fy > -0.15 && !f.hurt) {
        ctx.fillStyle = look.under;
        ctx.beginPath();
        facetBlob(
          ctx,
          gx(hl * 0.84, 0),
          gyy(hl * 0.84, 0) - (look.chestH + 0.09) * s - lift * 0.8,
          hw * s * 0.92,
          f.seed ^ 0x33,
          7,
          0.85,
          1.7,
        );
        ctx.fill();
      }
    },
  );
}
/**
 * The fox head: a compact near-round skull (deeper chamfers than the
 * wolf slab, shy of the cat's circle) crowned by the SOOT EARS —
 * triangles taller than any canid's, black-backed so the species reads
 * from behind — over THE SNIPE: a fine tapering muzzle, pale-jawed,
 * dotted with the small black nose. The eyes are the fox's secret:
 * amber almonds cut with the VERTICAL pupil — a cat's eye in a canid
 * face, the cunning made visible. `snarl` pins the ears and gapes the
 * needle jaw through the pounce telegraph; corpses pass `dead`.
 */
export function drawFoxHead(
  ctx: CanvasRenderingContext2D,
  look: FoxLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** 0..1 through the attack telegraph. */
    snarl?: number;
    /** Wall clock for the ear sim tick; absent = the settled rest. */
    nowMs?: number;
    /** THE EAR IS A SIMULATION: the live elastic pair. Sim-less
     *  callers (portraits, CMS, ragdoll) fall to earRestChain — THE
     *  ONE REST, the exact silhouette the live game relaxes to. */
    ears?: EarSim;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const snarl = o.snarl ?? 0;
  const queen = look.champion === true;

  // THE EAR IS A SIMULATION, spoken vulpine: the pricked blades are
  // elastic bodies on the goblin's exact contract — ONE 3D carriage
  // projected through the fixed camera, so orientation, near/far
  // z-order, and foreshortening at every band fall out BY
  // CONSTRUCTION; the sim adds the lag, the gait flap, and the
  // settle no rigged triangle ever had. A fox ear is stiff cartilage:
  // tall rise, tight curl, and the strength law keeps it a blade.
  const dir = Math.atan2(fy, fx);
  const pin = Math.min(1, snarl * 0.75);
  const carr: EarCarriage = {
    azimuth: 2.1,
    // Roots tucked DOWN and IN onto the skull: at the quarter bands
    // the old high wide orbit projected the root past the drawn
    // skull's edge and the blades floated free of the head.
    rootR: look.headW * 0.24,
    rootLift: look.headH * 0.46,
    length: look.headW * (queen ? 0.95 : 0.85),
    spread: 0.5,
    rise: 1.3,
    curl: [0, 0.05, 0.12],
  };
  if (o.ears && !o.dead && o.nowMs) o.ears.update(cx, cy, s, carr, dir, pin, o.nowMs);
  const chains = ([-1, 1] as const).map((side) =>
    o.ears && !o.dead
      ? o.ears.chain(side, carr, dir, pin)
      : earRestChain(side, carr, { dir, pin: o.dead ? 0.55 : pin, sway: 0 }),
  );
  const earW0 = w * (queen ? 0.2 : 0.18);
  const paintEar = (chain: { pts: Array<{ x: number; y: number }>; depth: number }): void => {
    const pts = chain.pts.map((p) => ({ x: cx + p.x * s, y: cy + p.y * s }));
    const prof = [1, 0.78, 0.42, 0];
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
    // The leading edge faces AWAY from the skull (the wing-ear law).
    const da = Math.hypot(ea[1]!.x - cx, ea[1]!.y - cy);
    const db = Math.hypot(eb[1]!.x - cx, eb[1]!.y - cy);
    const lead = da >= db ? ea : eb;
    const trail = da >= db ? eb : ea;
    const blade = (): void => {
      ctx.beginPath();
      ctx.moveTo(trail[0]!.x, trail[0]!.y);
      ctx.lineTo(lead[0]!.x, lead[0]!.y);
      ctx.lineTo(lead[1]!.x, lead[1]!.y);
      ctx.lineTo(lead[2]!.x, lead[2]!.y);
      ctx.lineTo(pts[3]!.x, pts[3]!.y);
      ctx.lineTo(trail[2]!.x, trail[2]!.y);
      ctx.lineTo(trail[1]!.x, trail[1]!.y);
      ctx.closePath();
    };
    // The visible face follows the HEAD's facing: toward the camera
    // shows the pale inner fan in a soot frame; away shows the black
    // back — the fox's whole from-behind identity.
    const front = fy > 0.05;
    ctx.lineJoin = 'round';
    // The blade frame is ALWAYS soot — face-on the pale fan sits
    // inside it; the black-backed ear never stops reading.
    ctx.fillStyle = C(look.earBack);
    blade();
    ctx.fill();
    if (o.hurt) return;
    if (front && !o.dead) {
      // The pale inner fan, inset so the soot frame survives it.
      ctx.fillStyle = look.earIn;
      ctx.beginPath();
      ctx.moveTo(pts[0]!.x + (trail[0]!.x - pts[0]!.x) * 0.45, pts[0]!.y + (trail[0]!.y - pts[0]!.y) * 0.45);
      ctx.lineTo(pts[0]!.x + (lead[0]!.x - pts[0]!.x) * 0.55, pts[0]!.y + (lead[0]!.y - pts[0]!.y) * 0.55);
      ctx.lineTo(lead[1]!.x * 0.6 + pts[1]!.x * 0.4, lead[1]!.y * 0.6 + pts[1]!.y * 0.4);
      ctx.lineTo(pts[2]!.x * 0.85 + pts[3]!.x * 0.15, pts[2]!.y * 0.85 + pts[3]!.y * 0.15);
      ctx.lineTo(trail[1]!.x * 0.6 + pts[1]!.x * 0.4, trail[1]!.y * 0.6 + pts[1]!.y * 0.4);
      ctx.closePath();
      ctx.fill();
    } else if (!front && !o.dead) {
      // Ear back: one cartilage seam keeps the black blade a volume.
      ctx.strokeStyle = shade(look.earBack, 14);
      ctx.lineWidth = Math.max(1, earW0 * 0.16);
      ctx.beginPath();
      ctx.moveTo(pts[0]!.x, pts[0]!.y);
      ctx.quadraticCurveTo(pts[1]!.x, pts[1]!.y, pts[2]!.x, pts[2]!.y);
      ctx.stroke();
    }
    // The queen's silver rim — her winters, worn on the leading edge.
    if (queen && look.grizzle && !o.dead) {
      ctx.strokeStyle = look.grizzle;
      ctx.lineWidth = Math.max(1, earW0 * 0.18);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lead[0]!.x, lead[0]!.y);
      ctx.lineTo(lead[1]!.x, lead[1]!.y);
      ctx.lineTo(lead[2]!.x, lead[2]!.y);
      ctx.lineTo(pts[3]!.x, pts[3]!.y);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  };
  // Far ears first — the skull and face paint over their roots; near
  // ears return at the very end, over everything (the projection's
  // own z-order, never a hand-authored band).
  const earsBehind = chains.filter((c) => c.depth <= 0.05);
  const earsFront = chains.filter((c) => c.depth > 0.05);
  for (const c of earsBehind) paintEar(c);

  // THE GREAT RUFF: the matriarch's pale collar, laid down before the
  // ears so skull and ears both lap it — a full frame of layered chops
  // around the lower skull, chest-deep. No lean fox carries it.
  if (queen && look.ruff && !o.hurt && fy > -0.5) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.8 && es * py < 0) continue;
      for (let i = 0; i < 3; i++) {
        const spread = 0.34 + i * 0.16;
        const rx = cx + px * es * w * spread - fx * w * 0.04;
        const ry = cy + (py * es * w * spread - fy * w * 0.04) * ys + h * (0.1 + i * 0.08);
        const drop = h * (0.5 - i * 0.08);
        ctx.fillStyle = C(shade(look.ruff, -i * 5));
        ctx.beginPath();
        ctx.moveTo(rx - px * es * w * 0.2, ry - h * 0.18);
        ctx.lineTo(rx + px * es * w * (0.2 + i * 0.04), ry - h * 0.02);
        ctx.lineTo(rx + px * es * w * 0.02, ry + drop);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // The skull: compact and fine-boned — chamfers deeper than the wolf
  // slab, shy of the cat's full round. A fox's head is a small neat
  // thing under two enormous ears.
  ctx.fillStyle = C(look.coat);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.3, w * 0.3, w * 0.34, w * 0.34]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.3, w * 0.3, w * 0.34, w * 0.34]);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.15)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.2);
    // The pale lower face: cheek and jaw in the under tone — the
    // white-cheeked mask every fox wears.
    ctx.fillStyle = C(look.under);
    ctx.fillRect(cx - w / 2, cy + h * 0.16, w, h * 0.34);
    ctx.restore();
  }

  // THE CHEEK FLARES: short fur chops flaring OUT at the jaw line —
  // sideways, where the lynx's ruff hangs down. They widen the small
  // skull into the fox's heart-shaped face without borrowing the
  // cat's frame. Far side yields at profile; gone from behind.
  if (!o.hurt && fy > -0.3) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.75 && es * py < 0) continue;
      for (let i = 0; i < 2; i++) {
        // Seated at the JAW line — flares riding the eye line read as
        // tusks (the lynx ruff lesson, relearned at the cheek).
        const rx = cx + px * es * w * (0.4 + i * 0.1) + fx * w * 0.02;
        const ry = cy + (py * es * w * (0.4 + i * 0.1) + fy * w * 0.02) * ys + h * (0.22 + i * 0.08);
        ctx.fillStyle = C(i === 0 ? look.under : shade(look.coat, -4));
        ctx.beginPath();
        ctx.moveTo(rx - px * es * w * 0.14, ry - h * 0.1);
        ctx.lineTo(rx + px * es * w * 0.16, ry + h * (0.0 + i * 0.03));
        ctx.lineTo(rx - px * es * w * 0.02, ry + h * 0.14);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // The queen's silvered mask: frost ticks across brow and muzzle
  // root — her winters, worn on the face. Strokes, per the law.
  if (queen && look.grizzle && !o.hurt && !o.dead && fy > -0.2) {
    ctx.strokeStyle = look.grizzle;
    ctx.lineWidth = Math.max(1, w * 0.024);
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const es = i < 2 ? -1 : 1;
      if (Math.abs(fx) > 0.7 && es * py < 0) continue;
      const sx0 = cx + px * es * w * (0.14 + (i % 2) * 0.12) + fx * w * 0.1;
      const sy0 = cy + (py * es * w * (0.14 + (i % 2) * 0.12) + fy * w * 0.1) * ys - h * (0.22 - (i % 2) * 0.3);
      ctx.beginPath();
      ctx.moveTo(sx0, sy0);
      ctx.lineTo(sx0 + fx * w * 0.09, sy0 + h * 0.07 + fy * w * 0.09 * ys);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  // ---- THE SNIPE: the fine tapering muzzle pushed along the facing —
  // longer and narrower than the wolf's wedge, turning with the head,
  // gone from behind (the muzzle law). Its underside runs pale: the
  // white jaw is half the fox's face.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.2;
    const by0 = cy + fy * w * 0.2 * ys + h * 0.14;
    // THE SNIPE EARNS ITS LENGTH: a fox is a THIRD muzzle — the long
    // fine taper is half the head's identity, and the first cut ran
    // it too short (the goofy read). It grows from deep on the face,
    // reaches, and drops.
    const sl = w * (0.48 + 0.36 * profileK);
    const tx = bx0 + fx * sl;
    // The tip drops below the bridge line — a fox noses DOWN; a level
    // snipe read as a bill.
    const ty = by0 + fy * sl * ys + h * (0.1 + 0.09 * profileK);
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.165 * (1 - profileK * 0.2);
    const ht = hb * 0.4;
    // The snipe wears the COAT — a lightened wedge read as a beak at
    // profile (the duck-bill lesson); the pale jaw below carries the
    // white, the coat carries the bridge.
    ctx.fillStyle = C(shade(look.coat, -2));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    // The pale jaw: the muzzle's DOWN-SCREEN edge in the under tone —
    // the white lip line that carries the mask onto the snipe. A
    // PROFILE read: face-on it ran down the wedge's center as a white
    // drip, so it waits for the head to turn.
    if (!o.hurt && profileK > 0.25) {
      const low = ny >= 0 ? 1 : -1;
      ctx.strokeStyle = C(look.under);
      ctx.lineWidth = Math.max(1.2, w * 0.055);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx0 + nx * hb * 0.72 * low, by0 + ny * hb * 0.72 * low);
      ctx.lineTo(tx + nx * ht * 0.6 * low, ty + ny * ht * 0.6 * low);
      ctx.stroke();
      ctx.lineCap = 'butt';
      // The whisker smudge: one dark dash on the muzzle's near side —
      // the fox's spotted lip, a stroke, small on purpose.
      ctx.strokeStyle = C(shade(look.sock, 12));
      ctx.lineWidth = Math.max(1, w * 0.03);
      ctx.beginPath();
      ctx.moveTo(bx0 + axv * 0.42 - nx * hb * 0.3 * low, by0 + ayv * 0.42 - ny * hb * 0.3 * low);
      ctx.lineTo(bx0 + axv * 0.56 - nx * hb * 0.24 * low, by0 + ayv * 0.56 - ny * hb * 0.24 * low);
      ctx.stroke();
    }
    // Snarl: the needle jaw gapes below the snipe — fangs finer than
    // any wolf's, the quick nip that bleeds.
    if (snarl > 0.15 && !o.dead && !o.hurt) {
      const gape = h * 0.3 * Math.min(1, snarl);
      ctx.fillStyle = '#2a1420';
      ctx.beginPath();
      ctx.moveTo(tx - nx * ht * 0.9, ty - ny * ht * 0.9);
      ctx.lineTo(tx + nx * ht * 0.9, ty + ny * ht * 0.9);
      ctx.lineTo(tx + (axv / al) * ht * 0.4, ty + gape);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#efe9d8';
      for (const ts of [-0.5, 0.4]) {
        ctx.beginPath();
        ctx.moveTo(tx + nx * ht * ts - w * 0.014, ty + ny * ht * ts);
        ctx.lineTo(tx + nx * ht * ts + w * 0.014, ty + ny * ht * ts);
        ctx.lineTo(tx + nx * ht * ts, ty + ny * ht * ts + gape * 0.5);
        ctx.closePath();
        ctx.fill();
      }
    }
    // The small black nose, seated on the tip — pulled back along the
    // axis so it overlaps the wedge instead of floating at profile.
    ctx.fillStyle = C(look.nose);
    ctx.beginPath();
    facetCircle(ctx, tx - (axv / al) * w * 0.015, ty - (ayv / al) * w * 0.015, w * 0.058, 5, fx);
    ctx.fill();
  }

  // THE CUNNING EYE: amber almonds cut with the VERTICAL pupil — the
  // cat's eye in the canid face, the one detail that says fox and
  // nothing else at close zoom. Dark-lined, one light chip. The far
  // one hides as the head goes profile; none from behind, none dead.
  if (!o.dead && fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.12 + px * es * w * 0.27;
      const ey = cy + (fy * w * 0.12 + py * es * w * 0.27) * ys - h * 0.1;
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(es * (0.34 + snarl * 0.25));
      // The soot liner first, then the iris inside it.
      ctx.fillStyle = C(look.earBack);
      ctx.fillRect(-w * 0.092, -h * 0.056, w * 0.184, h * 0.112);
      ctx.fillStyle = C(look.eye);
      ctx.fillRect(-w * 0.078, -h * 0.044, w * 0.156, h * 0.088);
      if (!o.hurt) {
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(-w * 0.016, -h * 0.044, w * 0.032, h * 0.088);
        ctx.fillStyle = 'rgba(255, 250, 235, 0.85)';
        ctx.fillRect(w * 0.028, -h * 0.036, w * 0.024, h * 0.028);
      }
      ctx.restore();
    }
  }

  // The near ears return over everything — roots on the viewer's side
  // of the skull paint over brow and crown (the projection's own
  // z-order, never a hand-authored band).
  for (const c of earsFront) paintEar(c);
}
