/**
 * THE GREAT WING — the owls, their plumages and wing fans.
 * Split out of rig.ts on the golems.ts template (foundations F3.4);
 * rig.ts re-exports everything here, so every lab, test and painter
 * keeps its old door.
 */
import { facetCircle } from './shapes.js';
import { shade } from './tint.js';

/**
 * THE FEATHER-AND-DISC DIALECT — the great owl, the parliament's
 * hunter. A TWO-POST beast unlike anything else on the rig: an
 * upright keg of plumage on backward-kneed bird legs, a facial disc
 * that carries BOTH eyes forward (the one face in the bestiary that
 * meets yours), and a head that turns on its own clock while the
 * body stands stone-still. Straight out of the oldest bestiaries — a
 * horned hunter the size of a shepherd — rebuilt in the Arx facet
 * dialect: block-prism body, chamfered feather fans, hard shade
 * steps, square pupils, no soft pill anywhere.
 */
export interface OwlLook {
  /** Mantle — the folded-wing cloak that IS the back and shoulders. */
  mantle: string;
  /** Breast keel and underwing — the pale flash of the threat bloom. */
  breast: string;
  /** Barring ink: breast chevrons, feather tips, tail bands. */
  bar: string;
  /** The facial disc plate. */
  disc: string;
  /** The disc's dark rim — what makes the disc a DISC. */
  discRim: string;
  /** The iris — the lamp of the face. */
  eye: string;
  /** Beak horn. */
  horn: string;
  /** Body half-width (tiles); length comes from the BeastSpec. */
  bodyW: number;
  /** Shoulder-dome height of the upright keg (tiles). */
  backH: number;
  /** Belly clearance over the shanks (tiles). */
  bellyH: number;
  headW: number;
  headH: number;
  /** Ear-tuft reach (tiles) — the horned crown; the elder's is a crest. */
  tuftLen: number;
  /** Tail-fan blade reach past the rump (tiles). */
  tailLen: number;
  /** Leading-primary reach of one spread wing (tiles). */
  wingSpan: number;
  /** Doubled disc ring, frost crown ticks — the elder's ledger. */
  elder?: boolean;
  /** Spawn seed carried on the resolved look — drives barring phase. */
  seed?: number;
}
/** The rank-and-file hunter: tawny bark camouflage, amber lamps. */
export const GREAT_OWL_LOOK: OwlLook = {
  mantle: '#8a7458',
  breast: '#d8c9a4',
  bar: '#5a4a38',
  disc: '#c9b488',
  discRim: '#4a3c30',
  eye: '#e8b23c',
  horn: '#3a3028',
  bodyW: 0.25,
  backH: 0.72,
  bellyH: 0.3,
  headW: 0.4,
  headH: 0.27,
  tuftLen: 0.16,
  tailLen: 0.38,
  wingSpan: 1.35,
};
/**
 * The elder: the parliament's high seat — never a scale-up. Storm
 * slate over moon-pale cream where the wing is bark over buff, a
 * TALL tufted crest for a crown, the disc ring doubled like a
 * weathered court seal, and frost ticked through the crown feathers.
 * It out-masses the hunter in every dimension that counts.
 */
export const ELDER_GREAT_OWL_LOOK: OwlLook = {
  mantle: '#4e5262',
  breast: '#d7d3be',
  bar: '#343846',
  disc: '#b9bdc9',
  discRim: '#2c303c',
  eye: '#f2e6a0',
  horn: '#2a2a34',
  bodyW: 0.34,
  backH: 0.94,
  bellyH: 0.38,
  headW: 0.53,
  headH: 0.35,
  tuftLen: 0.34,
  tailLen: 0.55,
  wingSpan: 1.85,
  elder: true,
};
/**
 * THE PLUMAGE CLUSTERS — four curated colorways for the rank-and-file,
 * picked by spawn seed so a parliament sorts into kin groups (the
 * gnoll coat-cluster law, feathered): tawny bark, ash gray, deep-wood
 * moss, and the birch-pale ghost. Elders never roll — an elder is a
 * DESIGN.
 */
export const OWL_PLUMAGES: ReadonlyArray<
  Pick<OwlLook, 'mantle' | 'breast' | 'bar' | 'disc' | 'discRim' | 'eye'>
> = [
  // tawny bark — the shipped def color
  { mantle: '#8a7458', breast: '#d8c9a4', bar: '#5a4a38', disc: '#c9b488', discRim: '#4a3c30', eye: '#e8b23c' },
  // ash gray — the great gray of the high boughs
  { mantle: '#767c88', breast: '#ccc9bd', bar: '#474c58', disc: '#b8b5a8', discRim: '#3c4048', eye: '#e8d24c' },
  // deep-wood moss — olive umber, the pine-shadow coat
  { mantle: '#777052', breast: '#cfc298', bar: '#4c4734', disc: '#b5ab7e', discRim: '#3e3a2c', eye: '#e09a38' },
  // birch-pale — the winter ghost the loggers swear at
  { mantle: '#a8a290', breast: '#e4ddc8', bar: '#6e675a', disc: '#d5cdb4', discRim: '#575044', eye: '#f0c84a' },
];
export const OWL_LOOK_CACHE = new Map<string, OwlLook>();
/**
 * Variant lookup with the hunter as the unknown-id fallback. The seed
 * (spawn eid) rolls the rank-and-file's plumage cluster plus a small
 * shade jitter — hashed first, because knot members spawn with
 * CONSECUTIVE eids and raw bits would dress a whole wing in one coat.
 * The elder holds its authored design. Cached; runs per body per frame.
 */
export function owlLook(defId: string, seed = 0): OwlLook {
  const base = defId === 'elder_great_owl' ? ELDER_GREAT_OWL_LOOK : GREAT_OWL_LOOK;
  const key = `${defId}|${seed & 0xff}`;
  const hit = OWL_LOOK_CACHE.get(key);
  if (hit) return hit;
  let look: OwlLook;
  if (defId === 'great_owl') {
    const h = (seed * 2654435761) | 0;
    const cl = OWL_PLUMAGES[(h >>> 8) & 3]!;
    const jit = (((h >>> 12) & 7) - 3) * 2;
    look = {
      ...base,
      mantle: shade(cl.mantle, jit),
      breast: cl.breast,
      bar: cl.bar,
      disc: shade(cl.disc, jit),
      discRim: cl.discRim,
      eye: cl.eye,
      seed,
    };
  } else {
    look = { ...base, seed };
  }
  OWL_LOOK_CACHE.set(key, look);
  return look;
}
/**
 * One feathered wing fan in the facet dialect: a bone-dark leading
 * arm and four chamfered primary blades stepping back from it — a
 * STEPPED silhouette, never a soft fan. Pale on the underside, so a
 * raised wing flashes the mantle warning every prey animal in the
 * wood understands. Screen-space like the bat's membranes (billboard
 * wings read at every body facing); the corpse splay squashes the
 * same fan onto the ground.
 */
export function owlWingFan(
  ctx: CanvasRenderingContext2D,
  look: OwlLook,
  o: {
    /** Shoulder pivot on screen. */
    x: number;
    y: number;
    s: number;
    /** Screen angle of the leading edge (radians). */
    ang: number;
    /** 0..1 fan opening. */
    spread: number;
    /** Leading-primary reach (tiles). */
    span: number;
    /** Show the pale underside (wings up = the mantle flash). */
    under?: boolean;
    /** Vertical squash for corpse splays flat on the ground. */
    squash?: number;
    /**
     * Fan-opening scale: 1 = the full mantling droop (the standing
     * threat bloom). Level flight carries the blade flatter — cruise
     * ~0.6, a locked-out glide flatter still.
     */
    openK?: number;
    hurt?: boolean;
    seed?: number;
  },
): void {
  const s = o.s;
  const sy = o.squash ?? 1;
  const reach = o.span * s * (0.5 + 0.5 * o.spread);
  const base = o.hurt ? '#ffffff' : o.under ? look.breast : look.mantle;
  const rib = o.hurt ? '#ffffff' : o.under ? shade(look.breast, -11) : shade(look.mantle, -12);
  // The fan droops from the leading edge toward the ground, whichever
  // side of the screen the wing points.
  const droop = Math.cos(o.ang) >= 0 ? 1 : -1;
  const open = droop * (0.28 + 0.62 * Math.max(0.3, o.spread)) * (o.openK ?? 1);
  // ONE solid fan silhouette with a stepped trailing edge — a wing is
  // a MASS, never a rake of ribs. Five primary tips, notched between.
  const N = 5;
  const tip = (k: number): { x: number; y: number; a: number } => {
    const t = k / (N - 1);
    const a = o.ang + open * t;
    const len = reach * (1 - 0.15 * t);
    return { x: o.x + Math.cos(a) * len, y: o.y + Math.sin(a) * len * sy, a };
  };
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.moveTo(o.x, o.y);
  for (let k = 0; k < N; k++) {
    const p = tip(k);
    ctx.lineTo(p.x, p.y);
    // The notch: a step back toward the pivot between primaries.
    if (k < N - 1) {
      const a = o.ang + open * ((k + 0.5) / (N - 1));
      const len = reach * (1 - 0.15 * ((k + 0.5) / (N - 1))) * 0.84;
      ctx.lineTo(o.x + Math.cos(a) * len, o.y + Math.sin(a) * len * sy);
    }
  }
  ctx.closePath();
  ctx.fill();
  if (!o.hurt) {
    // Rachis lines: the feather shafts fanning through the mass.
    ctx.strokeStyle = rib;
    ctx.lineWidth = Math.max(1.2, s * 0.022);
    ctx.lineCap = 'round';
    for (let k = 1; k < N - 1; k++) {
      const p = tip(k);
      ctx.beginPath();
      ctx.moveTo(o.x + (p.x - o.x) * 0.2, o.y + (p.y - o.y) * 0.2);
      ctx.lineTo(o.x + (p.x - o.x) * 0.9, o.y + (p.y - o.y) * 0.9);
      ctx.stroke();
    }
    // The bar band riding the tips — one broken arc of bar ink.
    ctx.strokeStyle = look.bar;
    ctx.lineWidth = Math.max(1.3, s * 0.024);
    for (let k = 0; k < N; k++) {
      const p = tip(k);
      ctx.beginPath();
      ctx.moveTo(o.x + (p.x - o.x) * 0.8, o.y + (p.y - o.y) * 0.8);
      ctx.lineTo(o.x + (p.x - o.x) * 0.9, o.y + (p.y - o.y) * 0.9);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  // The leading arm rides the front edge — the wing's bone line.
  ctx.strokeStyle = o.hurt ? '#ffffff' : shade(look.mantle, -18);
  ctx.lineWidth = Math.max(1.5, s * 0.045);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(o.x, o.y);
  ctx.lineTo(o.x + Math.cos(o.ang) * reach * 0.96, o.y + Math.sin(o.ang) * reach * 0.96 * sy);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // Covert chip seating the fan on the shoulder.
  ctx.fillStyle = base;
  ctx.beginPath();
  facetCircle(ctx, o.x, o.y, s * 0.08, 6, o.ang, sy);
  ctx.fill();
}
/**
 * THE BROAD WING — the great owl's living wing, drawn in BODY SPACE
 * and projected through the caller's lens, so the same mass
 * foreshortens correctly at every one of the eight facings: a
 * profile bird shows a near wing crossing its body and a far wing
 * behind it, a bird flying away shows both wings from above, and
 * nothing ever points sideways-on-screen because the screen said so.
 *
 * The planform is a real owl's: a bone-dark leading arm sweeping out
 * to the wrist, a broad slab of secondaries behind it, and FINGERED
 * primaries stepping back from the wingtip — each finger shorter and
 * further back-swept than the last — closing along a curved trailing
 * edge into the flank. Coverts shingle the shoulder, a dark
 * flight-feather band rides the outer half, and bar ink ticks the
 * finger tips. Pale underside for the mantling flash.
 */
export function owlWingBroad(
  ctx: CanvasRenderingContext2D,
  look: OwlLook,
  o: {
    /** Body-space projector: (F fwd, L starboard, Z up) tiles → screen. */
    P: (F: number, L: number, Z: number) => [number, number];
    /** Which wing: -1 port, +1 starboard. */
    es: number;
    s: number;
    /** Wing carriage: 0 = level, + = raised (mantling), − = swept low. */
    raise: number;
    /** The HAND's carriage, trailing the arm through the beat — the
     *  tip whip. Defaults to `raise` (a held pose). */
    raiseHand?: number;
    /** Load flex: + bends the primaries UP under the power stroke,
     *  − droops them through the recovery. */
    flex?: number;
    /** Rowing swing: forward wrist offset (tiles) through the power
     *  stroke, backward on recovery. */
    swing?: number;
    /** 0..1 downwash window — pale gust streaks fall away under the
     *  wingtips right after the stroke bottoms out. */
    gust?: number;
    /** 0..1 how far the wing is unfolded from the body. */
    spread: number;
    /** Back-sweep of the primary fingers: 0.25 mantling → 1 diving. */
    sweepK: number;
    /** Leading-primary reach in tiles (the look's wingSpan). */
    span: number;
    /** Show the pale underside (raised wings flash the warning). */
    under?: boolean;
    hurt?: boolean;
    seed?: number;
  },
): void {
  const { P, es, s } = o;
  const spread = Math.max(0.05, o.spread);
  const raiseA = o.raise;
  const base = o.hurt ? '#ffffff' : o.under ? look.breast : look.mantle;
  const flightInk = o.hurt ? '#ffffff' : o.under ? shade(look.breast, -9) : shade(look.mantle, -10);
  const boneInk = o.hurt ? '#ffffff' : shade(look.mantle, -22);

  // The skeleton in body space. The arm reaches out and slightly
  // forward; the hand carries the reach and the fingers sweep back.
  const armL = o.span * 0.42 * spread;
  const handL = o.span * 0.58 * spread;
  const handA = o.raiseHand ?? raiseA;
  const flex = o.flex ?? 0;
  const shF = 0.14;
  const shL = es * look.bodyW * 0.72;
  const shZ = 0.1 + look.bodyW * 0.35;
  const cosR = Math.cos(raiseA);
  const sinR = Math.sin(raiseA);
  const wrF = shF + 0.1 * spread + (o.swing ?? 0);
  const wrL = shL + es * cosR * armL;
  const wrZ = shZ + sinR * armL;
  // Five primary fingers: tip k reaches shorter and sweeps further
  // back; the whole hand droops through the fan so a level wing
  // curves like a held glide, and a raised wing blooms.
  const N = 5;
  const tips: Array<[number, number, number]> = [];
  for (let k = 0; k < N; k++) {
    const u = k / (N - 1);
    const len = handL * (1 - 0.36 * u);
    // The hand carries its own (trailing) angle, and the primaries
    // BEND under load — outer fingers most, the tip-flex that turns
    // a hinged plank into a wing pushing against real air.
    const tipRaise = handA - (0.28 + 0.5 * u) * spread * 0.55;
    const backF = (0.1 + 0.85 * u) * len * o.sweepK;
    tips.push([
      wrF + 0.06 * spread - backF,
      wrL + es * Math.cos(tipRaise) * len,
      wrZ + Math.sin(tipRaise) * len * 0.85 - 0.04 * u + flex * u * u * o.span * 0.3,
    ]);
  }
  // The trailing edge closes into the flank at the tail root.
  const rootF = -0.34;
  const rootL = es * look.bodyW * 0.5;
  const rootZ = 0.06;

  // One solid slab: shoulder → leading edge → fingered tips (with the
  // stepped notches of the facet dialect) → trailing root.
  ctx.fillStyle = base;
  ctx.beginPath();
  const p0 = P(shF, shL, shZ);
  ctx.moveTo(p0[0], p0[1]);
  const pw = P(wrF, wrL, wrZ);
  ctx.lineTo(pw[0], pw[1]);
  for (let k = 0; k < N; k++) {
    const t = tips[k]!;
    const pt = P(t[0], t[1], t[2]);
    ctx.lineTo(pt[0], pt[1]);
    if (k < N - 1) {
      // The notch between primaries: step back toward the wrist.
      const n = tips[k + 1]!;
      const nx = t[0] * 0.35 + n[0] * 0.35 + wrF * 0.3;
      const nl = t[1] * 0.35 + n[1] * 0.35 + wrL * 0.3;
      const nz = t[2] * 0.35 + n[2] * 0.35 + wrZ * 0.3;
      const pn = P(nx, nl, nz);
      ctx.lineTo(pn[0], pn[1]);
    }
  }
  const pr = P(rootF, rootL, rootZ);
  ctx.lineTo(pr[0], pr[1]);
  ctx.closePath();
  ctx.fill();

  if (!o.hurt) {
    // The flight-feather band: the outer half of the slab a step
    // darker — secondaries and primaries against the paler coverts.
    ctx.fillStyle = flightInk;
    ctx.beginPath();
    const mixF = (a: [number, number, number], t: number): [number, number] =>
      P(
        a[0] * t + (shF * 0.5 + rootF * 0.5) * (1 - t),
        a[1] * t + (shL * 0.7 + rootL * 0.3) * (1 - t),
        a[2] * t + (shZ * 0.5 + rootZ * 0.5) * (1 - t),
      );
    const pm0 = mixF([wrF, wrL, wrZ], 0.45);
    ctx.moveTo(pm0[0], pm0[1]);
    const pwF = P(wrF, wrL, wrZ);
    ctx.lineTo(pwF[0], pwF[1]);
    for (let k = 0; k < N; k++) {
      const t = tips[k]!;
      const pt = P(t[0], t[1], t[2]);
      ctx.lineTo(pt[0], pt[1]);
    }
    const prF = mixF(tips[N - 1]!, 0.55);
    ctx.lineTo(prF[0], prF[1]);
    ctx.closePath();
    ctx.fill();
    // Bar ink ticking every finger tip — the parliament's barring.
    ctx.strokeStyle = look.bar;
    ctx.lineWidth = Math.max(1.2, s * 0.022);
    ctx.lineCap = 'round';
    for (let k = 0; k < N; k++) {
      const t = tips[k]!;
      const a = P(
        t[0] * 0.82 + wrF * 0.18,
        t[1] * 0.82 + wrL * 0.18,
        t[2] * 0.82 + wrZ * 0.18,
      );
      const b = P(
        t[0] * 0.93 + wrF * 0.07,
        t[1] * 0.93 + wrL * 0.07,
        t[2] * 0.93 + wrZ * 0.07,
      );
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    // Covert shingles: two short arcs seating the wing on the body.
    ctx.strokeStyle = shade(base, -8);
    ctx.lineWidth = Math.max(1.1, s * 0.018);
    for (let r = 0; r < 2; r++) {
      const t0 = 0.2 + r * 0.16;
      const a = P(
        shF + (wrF - shF) * t0,
        shL + (wrL - shL) * t0 * 0.9,
        shZ + (wrZ - shZ) * t0 - 0.02,
      );
      const b = P(
        rootF * (0.4 + r * 0.2) + shF * (0.6 - r * 0.2),
        shL + (rootL - shL) * (0.3 + r * 0.2),
        shZ * 0.7 + rootZ * 0.3 - 0.01,
      );
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
  }
  // The leading arm — the wing's bone line, shoulder to wingtip.
  ctx.strokeStyle = boneInk;
  ctx.lineWidth = Math.max(1.5, s * 0.042);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p0[0], p0[1]);
  ctx.lineTo(pw[0], pw[1]);
  const lead = tips[0]!;
  const pl = P(lead[0], lead[1], lead[2]);
  ctx.lineTo(pl[0], pl[1]);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // THE DOWNWASH: right after the power stroke bottoms out, pale air
  // falls away beneath the outer primaries — brief slanting streaks
  // that sink and fade as the window closes. The whoosh, drawn.
  const gust = o.gust ?? 0;
  if (gust > 0.03 && !o.hurt) {
    const fall = (1 - gust) * 0.3;
    ctx.strokeStyle = `rgba(238, 234, 218, ${(0.3 * gust).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.4, s * 0.032);
    ctx.lineCap = 'round';
    for (const k of [0, 2]) {
      const t = tips[k]!;
      const a = P(t[0] - 0.03, t[1] * 1.01, t[2] - 0.08 - fall);
      const b = P(t[0] - 0.16, t[1] * 1.07, t[2] - 0.22 - fall * 1.3);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
}
/** Flight ceiling per rank (tiles over the ground anchor): the elder
 *  rides higher — rank you can read from across the glade. */
export function owlHoverHeight(look: OwlLook): number {
  return look.elder ? 1.18 : 0.98;
}
