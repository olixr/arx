/**
 * THE BRINE DIALECT — the skral (docs/skral-plan.md).
 *
 * The seventh humanoid dialect beside bone, scale, fur, greenskin,
 * construct, and giant-kin: the brine-folk of the banks — fish-headed
 * waders with murloc bones and kuo-toa manners. The rig, carriage,
 * facing bands, and IK all keep working untouched; this module swaps
 * head, hide, hands, and feet wholesale and grows the one thing no
 * other body owns: a SIMULATED crest fin.
 *
 * THE FOUR READS (owned by no other body):
 *   THE CREST   — a spined sail from brow to nape, an ELASTIC BODY on
 *                 the ear-physics contract (two tight-spread chains =
 *                 one deep blade at profile, a readable splay at the
 *                 bow). It breathes with the walk and FLARES through
 *                 every strike beat: the skral threatens with its
 *                 skull the way a goblin jeers with its ears.
 *   THE LANTERN EYES — huge pale wall-eyes high on the SIDES of the
 *                 skull. The near eye reads at every band; from
 *                 behind the eye DOMES still swell the silhouette
 *                 (an eye socket has a back; the crab doctrine).
 *   THE GAPE    — an underslung needle grin WIDER than the skull,
 *                 authored as a CUT (the turtle mouth law): lip band,
 *                 long dark seam sagging at the middle, tooth ticks
 *                 riding the cut. The gape drops a pale shovel jaw
 *                 and inflates the gular throat: the skral CROAKS as
 *                 it swings.
 *   THE WEB-FOOTED HUNCH — the deepest crouch of any walker: no
 *                 neck, skull sunk between narrow shoulders, long low
 *                 arms ending in webbed three-ray hands, and splayed
 *                 webbed fan feet twice the width of the shank.
 *
 * Laws honored here:
 * - THE FLAT FORGE LAW: depth is flat value planes, never gradients.
 * - NO FACE FROM BEHIND: past backK 0.55 the head is hide, crest
 *   root, gill nape and the eye domes — no ink.
 * - Blends never extrapolate past the ¾ band; the profile treatment
 *   is authored inside the painter (the goblin lesson).
 * - Hurt flash: fills go '#ffffff', detail passes skip.
 * - Seeded determinism: hide clusters hash the spawn eid; named
 *   bodies are DESIGNS and never roll.
 * - THE ONE REST: the crest sim's stateless twin is earRestChain —
 *   sheets, portraits, and corpses paint what the game relaxes to.
 * - Shade floor: face ink lives in `ink` (a '#1x/#2x' family) and
 *   paints only where the face gates allow; every authored dark that
 *   can show from behind stays above '#30' after its deepest shade().
 */
import { chamferRect } from './shapes.js';
import { shade } from './rig.js';
import type { EarCarriage } from './earPhysics.js';

export interface SkralLook {
  /** Hide base — the wet scale that names the species. */
  hide: string;
  /** Pale underside: belly plate, jaw shovel, throat, palms, webs. */
  belly: string;
  /** Dark face ink: pupils, mouth seam, nostril pits, claw ticks. */
  ink: string;
  /** The lantern iris — big, pale, and unblinking. */
  eye: string;
  /** Crest membrane (and every limb fin's) — the accent color. */
  fin: string;
  /** Fin rays and crest spines — must hold above '#30' shaded. */
  ray: string;
  /** The net-sash wrap: woven cord and a frayed hip net. */
  cloth: string;
  /** The tidecaller's kelp mantle; undefined = bare rank-and-file. */
  garb?: string;
  /** Coral brow studs — the deepking's crown. */
  crowned?: boolean;
  /** The back-slung barbed trident — the deepking's carry. */
  trident?: boolean;
  /** An eye that lost an argument: lid seam + a notched crest. */
  scarred?: boolean;
  /**
   * Jaw-span multiplier (default 1) — a HEAD dial, not a limb one
   * (the dialect law): the deepking's maw out-spans its shoal, the
   * tidecaller's is a shade daintier. Feeds the mouth span, the
   * gape's drop, and the corner fangs.
   */
  jaw?: number;
  /** Frame multiplier: jaw span, crest reach, belly swell. */
  heavy: number;
  /** Spawn seed carried on the resolved look — per-body wear. */
  seed?: number;
}

/** Needle bone — one tone for every skral mouth and the trident. */
const SKRAL_TOOTH = '#e6e8da';

export const SKRAL_LOOKS: Record<string, SkralLook> = {
  // The rank-and-file wader: tide-green over a silt-pale belly, a
  // madder crest, and the day's catch on a woven belt.
  skral: {
    hide: '#4f8a6a',
    belly: '#cfd8b8',
    ink: '#1f2a26',
    eye: '#e8d89a',
    fin: '#c04a38',
    ray: '#6e3a30',
    cloth: '#7a6f52',
    heavy: 1,
  },
  // The harpooner: a wirier build a shade toward the deep water —
  // the arm that stands off the waterline with the barbed dart.
  skral_harpooner: {
    hide: '#4a7d9c',
    belly: '#c9d6d2',
    ink: '#1e2830',
    eye: '#e8d89a',
    fin: '#d8a03a',
    ray: '#71583a',
    cloth: '#6a6a58',
    heavy: 0.9,
  },
  // The tidecaller: violet-slate under a kelp mantle, crest a pale
  // glowing kelp-green, eyes gone the color of ice water — the one
  // skral the shoal itself walks around.
  skral_tidecaller: {
    hide: '#5a5474',
    belly: '#b8b4c8',
    ink: '#221f2e',
    eye: '#b9e0e4',
    fin: '#7ac4b8',
    ray: '#3d6a62',
    cloth: '#4a4a3e',
    garb: '#3d4a54',
    jaw: 0.94,
    heavy: 0.95,
  },
  // THE DEEPKING: abyss-grey bulk, a tall crimson crest, coral studs
  // over the brow, pearl eyes, and the barbed trident slung across
  // its back — the one skral the bank stands behind.
  skral_champion: {
    hide: '#3d5c6e',
    belly: '#9cb4ac',
    ink: '#1a242a',
    eye: '#dfe3d6',
    fin: '#c03a4a',
    ray: '#5e3238',
    cloth: '#54503e',
    crowned: true,
    trident: true,
    scarred: true,
    jaw: 1.14,
    heavy: 1.3,
  },
};

/**
 * THE HIDE CLUSTERS — four curated waters for the rank-and-file,
 * picked by hashed spawn seed (the coat-cluster law): tide-green,
 * brine-blue, silt-olive, and the bone-pale shallows runt. Each
 * carries its OWN fin accent — a shoal sorts into family banners.
 * The tidecaller and the deepking never roll: a named skral is a
 * DESIGN.
 */
const SKRAL_CLUSTERS: ReadonlyArray<Pick<SkralLook, 'hide' | 'belly' | 'fin' | 'ray'>> = [
  { hide: '#4f8a6a', belly: '#cfd8b8', fin: '#c04a38', ray: '#6e3a30' }, // tide-green
  { hide: '#4a7d9c', belly: '#c9d6d2', fin: '#d8a03a', ray: '#71583a' }, // brine-blue
  { hide: '#7a8148', belly: '#d6d0a6', fin: '#a4502c', ray: '#66412e' }, // silt-olive
  { hide: '#a8b09a', belly: '#e0e2d2', fin: '#b84a56', ray: '#643840' }, // bone-pale
];

const LOOK_CACHE = new Map<string, SkralLook>();

/**
 * Variant lookup with the rank-and-file as the unknown-id fallback.
 * The seed (spawn eid) rolls the wader's and the harpooner's water
 * cluster plus a small shade jitter; named looks hold their authored
 * design. Resolved looks are cached — this runs per body per frame.
 */
export function skralLook(defId: string, seed = 0): SkralLook {
  const base = SKRAL_LOOKS[defId] ?? SKRAL_LOOKS['skral']!;
  const key = `${defId}|${seed & 0xff}`;
  const hit = LOOK_CACHE.get(key);
  if (hit) return hit;
  let look: SkralLook;
  if (defId === 'skral' || defId === 'skral_harpooner') {
    // Hash the seed BEFORE picking: shoal members spawn with
    // consecutive eids, and raw high bits would dress a whole bank
    // in one water (the goblin warband lesson, kept).
    const h = (seed * 2654435761) | 0;
    const cl = SKRAL_CLUSTERS[(h >>> 8) & 3]!;
    const jit = (((h >>> 12) & 7) - 3) * 2;
    look = { ...base, hide: shade(cl.hide, jit), belly: cl.belly, fin: cl.fin, ray: cl.ray, seed };
  } else {
    look = { ...base, seed };
  }
  LOOK_CACHE.set(key, look);
  return look;
}

// ---------------------------------------------------------------------------
// THE CREST — carriage + painter. The sim itself is EarSim (the ear
// contract is species-agnostic by design); this module owns only what
// a crest IS: where it roots, how it stands, and how it paints.

/**
 * The crest carriage: both chains root near the sagittal line high on
 * the crown (rootR 0.06 — nearly one blade), swept back-and-up. The
 * FLARE is a carriage change, not a screen trick: the strike beat
 * raises the rise and reach, and the sim follows with honest lag.
 */
export function skralCrestCarriage(heavy: number, flare: number): EarCarriage {
  return {
    azimuth: 2.65,
    rootR: 0.05,
    rootLift: 0.1,
    // A SAIL, not an antenna: the reach that makes the mohawk read at
    // world zoom (the pass-one lesson — a timid crest is no crest).
    length: (0.3 + 0.08 * (heavy - 1)) * (1 + 0.18 * flare),
    spread: 0.16,
    rise: 1.15 + 0.55 * flare,
    curl: [0, 0.2, 0.45],
  };
}

export interface SkralCrestStyle {
  membrane: string;
  ray: string;
  edge: string;
}

/** Pre-resolved crest colors off the look (hurt handled by caller). */
export function skralCrestStyle(sk: SkralLook, back: boolean): SkralCrestStyle {
  return {
    membrane: shade(sk.fin, back ? -10 : 0),
    ray: shade(sk.ray, back ? -4 : 2),
    edge: sk.ink,
  };
}

/**
 * One crest bank drawn along a sim chain: a tapered membrane ribbon
 * with spine rays fanned through it and THE BROKEN INK on the leading
 * edge — a partial stroke only (the outline shader rings only the
 * outer silhouette; a closed ring would grid the fin and muddy it —
 * the turtle thorn lesson).
 */
export function drawSkralCrest(
  ctx: CanvasRenderingContext2D,
  pts: ReadonlyArray<{ x: number; y: number }>,
  w0: number,
  st: SkralCrestStyle,
  opts: { hurt: boolean; notch?: boolean },
): void {
  if (pts.length < 2) return;
  const n = pts.length;
  // The membrane: a LEAF-SAIL — wide off the root, fullest through
  // the middle, drawn to a point at the tip (a straight taper read as
  // an antenna at world zoom; the bulge is what says fin).
  const wAt = (t: number): number => w0 * (0.62 + 1.5 * t * (1 - t)) * (1 - 0.85 * t * t);
  ctx.beginPath();
  ctx.moveTo(pts[0]!.x - wAt(0) * 0.5, pts[0]!.y);
  for (let i = 1; i < n; i++) {
    const t = i / (n - 1);
    const w = wAt(t);
    ctx.lineTo(pts[i]!.x - w * 0.5, pts[i]!.y);
  }
  for (let i = n - 1; i >= 0; i--) {
    const t = i / (n - 1);
    const w = wAt(t);
    ctx.lineTo(pts[i]!.x + w * 0.5, pts[i]!.y);
  }
  ctx.closePath();
  ctx.fillStyle = opts.hurt ? '#ffffff' : st.membrane;
  ctx.fill();
  if (opts.hurt) return;
  // The notch: a bite gone from the membrane's trailing third — the
  // scar ledger, worn where the whole bank can read it.
  if (opts.notch) {
    ctx.fillStyle = st.ray;
    const a = pts[Math.max(1, n - 2)]!;
    const b = pts[n - 1]!;
    ctx.beginPath();
    ctx.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2);
    ctx.lineTo(a.x + w0 * 0.4, a.y + w0 * 0.2);
    ctx.lineTo(a.x + w0 * 0.05, a.y + w0 * 0.42);
    ctx.closePath();
    ctx.fill();
  }
  // The rays: spines fanned from the root through the membrane — the
  // fin's anatomy, and what keeps it from reading as a dyed rag.
  ctx.strokeStyle = st.ray;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, w0 * 0.12);
  const root = pts[0]!;
  for (const t of [0.28, 0.5, 0.72, 0.92] as const) {
    const i = Math.min(n - 1, Math.floor(t * (n - 1)));
    const frac = t * (n - 1) - i;
    const px = pts[i]!.x + (pts[Math.min(n - 1, i + 1)]!.x - pts[i]!.x) * frac;
    const py = pts[i]!.y + (pts[Math.min(n - 1, i + 1)]!.y - pts[i]!.y) * frac;
    ctx.beginPath();
    ctx.moveTo(root.x + (px - root.x) * 0.18, root.y + (py - root.y) * 0.18);
    ctx.lineTo(px, py);
    ctx.stroke();
  }
  // THE BROKEN INK: a partial world-ink stroke down from the tip
  // along the leading edge — two-thirds and out, never a closed ring.
  ctx.strokeStyle = st.edge;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = Math.max(1, w0 * 0.09);
  ctx.beginPath();
  const from = Math.max(1, Math.floor((n - 1) * 0.45));
  ctx.moveTo(pts[from]!.x - wAt(from / (n - 1)) * 0.5, pts[from]!.y);
  for (let i = from + 1; i < n; i++) {
    ctx.lineTo(pts[i]!.x - wAt(i / (n - 1)) * 0.5, pts[i]!.y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// THE HEAD.

export interface SkralHeadFrame {
  s: number;
  headX: number;
  headY: number;
  hw: number;
  hh: number;
  cut: number;
  fx: number;
  fy: number;
  profileK: number;
  backK: number;
  lead: number;
  hurt: boolean;
  nowMs: number;
  /** 0..1 jaw drop — the combat croak; 0 keeps the grin seated. */
  gape: number;
}

/**
 * THE HEAD IS ONE HULL (user-directed structural round: "rethink the
 * models — proper perspective, skews, and orientations; the eyes
 * float; the mouth was a hodgepodge"). The per-band blends are GONE.
 * The head is an ellipsoid hull with semi-axes (aF fwd, aL lat, aZ
 * up), and every feature — both eye domes, the mouth arc, the teeth,
 * the nostrils, the gills, the crown ring, the barbels, the scar —
 * is a STATION in head space projected through the fixed bird's-eye
 * camera (YK 0.6). Orientation, foreshortening, which eye shows,
 * where the grin wraps out of sight, and what peeks over the skyline
 * from behind all fall out BY CONSTRUCTION (the motion doctrine, law
 * three — the lesson the goblin head paid for three times):
 * - a station's camera-side depth d = F·fy + L·py orders it against
 *   the skull slab: d < 0 paints BEFORE the hull (hidden, or peeking
 *   past the silhouette), d > 0 paints OVER it;
 * - a feature's INK draws only while its outward normal faces the
 *   camera — so the face vanishes from behind with no gate at all;
 * - the mouth is a sampled 3D arc around the muzzle: the visible run
 *   is wherever its samples hold the camera side, so the grin is
 *   full at the bow, wraps honestly at the quarters, runs one-sided
 *   at profile, and is gone from behind — and the teeth ride the
 *   samples, narrowing with the arc's own foreshortening.
 */
export function paintSkralHead(
  ctx: CanvasRenderingContext2D,
  sk: SkralLook,
  f: SkralHeadFrame,
): void {
  const { headX, headY, hw, hh, cut, fx, fy, lead, hurt, nowMs, gape } = f;
  const s = f.s;
  const hv = sk.heavy;
  const jawK = sk.jaw ?? 1;
  const hide = hurt ? '#ffffff' : sk.hide;
  const belly = hurt ? '#ffffff' : sk.belly;
  // The camera frame: facing (fx, fy), lateral (px, py), YK vertical.
  const px = -fy;
  const py = fx;
  const YK = 0.6;
  // The hull: one ellipsoid every feature rides. Wider than long than
  // tall — the murloc argument in three numbers.
  const aF = hw * 0.95;
  const aL = hw * (1.18 + 0.1 * (hv - 1));
  const aZ = hh * 0.92;
  /** A station: head-frame (F fwd, L lat, Z up; unit-ish) → screen. */
  const st = (F: number, L: number, Z: number): { x: number; y: number; d: number } => ({
    x: headX + F * aF * fx + L * aL * px,
    y: headY + (F * aF * fy + L * aL * py) * YK - Z * aZ,
    d: F * fy + L * py,
  });
  // The slab: the hull's screen footprint — wide at the bow, long at
  // profile, with a slight muzzle-forward weight shift.
  const W = Math.sqrt(aF * fx * (aF * fx) + aL * px * (aL * px));
  const cx = headX + fx * aF * 0.1;
  const gular = (hurt ? 0 : 0.06 * Math.sin(nowMs / 520)) + 0.55 * gape;

  // ---- THE CROWN RING (deepking): stations around the crown's rim.
  // Far studs paint BEFORE the hull — from behind they peek over the
  // skyline like the coral they are; near studs paint last.
  type Stud = { x: number; y: number; d: number; r: number };
  const studs: Stud[] = [];
  if (sk.crowned && !hurt) {
    for (const th of [-2.0, -1.2, -0.45, 0.45, 1.2, 2.0]) {
      const p = st(Math.cos(th) * 0.55, Math.sin(th) * 0.8, 0.92);
      studs.push({ ...p, r: s * (0.018 + 0.009 * Math.max(0, Math.cos(th))) });
    }
    studs.sort((a, b) => a.d - b.d);
  }
  const paintStud = (u: Stud): void => {
    ctx.fillStyle = shade(SKRAL_TOOTH, u.d > 0 ? -4 : -12);
    ctx.beginPath();
    ctx.moveTo(u.x - u.r, u.y + u.r * 0.8);
    ctx.lineTo(u.x - u.r * 0.2, u.y - u.r * 1.5);
    ctx.lineTo(u.x + u.r * 0.6, u.y + u.r * 0.6);
    ctx.closePath();
    ctx.fill();
  };
  for (const u of studs) if (u.d <= 0) paintStud(u);

  // ---- THE EYE DOMES, far pass: a dome on the camera-far side sits
  // behind the hull. Deep in the rear quarters it returns as the
  // occiput-side bulge (a hypertrophied fish eye swells the outline
  // from every direction — the crab doctrine).
  type Eye = { x: number; y: number; d: number; dot: number; side: number };
  const eyes: Eye[] = [-1, 1].map((side) => {
    const p = st(0.3, side * 0.92, 0.42);
    return { ...p, dot: 0.3 * fy + side * 0.95 * py, side };
  });
  const eyeR = hw * (0.3 + 0.05 * hv) * (1 - 0.08 * Math.abs(fx));
  const paintDome = (e: Eye, rear: boolean): void => {
    ctx.fillStyle = hurt ? '#ffffff' : shade(sk.hide, rear ? -9 : e.dot > 0.12 ? 6 : -2);
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, eyeR, eyeR * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  const rearRead = fy < -0.25;
  for (const e of eyes) if (e.d <= 0.02 && !rearRead) paintDome(e, false);

  // ---- the hull slab + its lit crown plane.
  ctx.fillStyle = hide;
  ctx.beginPath();
  chamferRect(ctx, cx - W, headY - aZ, W * 2, aZ * 1.72, cut * 1.05);
  ctx.fill();
  if (!hurt) {
    ctx.fillStyle = shade(sk.hide, 8);
    ctx.beginPath();
    chamferRect(ctx, cx - W * 0.78, headY - aZ * 0.98, W * 1.56, aZ * 0.34, cut * 0.7);
    ctx.fill();
  }

  // ---- the gular throat: pooled into the shoulders, breathing on
  // the idle clock, ballooning with the croak. A front-hemisphere
  // mass: its pale face turns away with the head.
  const gu = st(0.3, 0, -0.86);
  const thW = W * 0.72;
  const thH = aZ * (0.34 + 0.3 * gular);
  ctx.fillStyle = hurt ? '#ffffff' : gu.d > -0.1 ? belly : shade(sk.hide, -8);
  ctx.beginPath();
  ctx.ellipse(gu.x, gu.y + thH * 0.3, thW, thH, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!hurt && gu.d > 0.1 && gular > 0.2) {
    ctx.fillStyle = shade(sk.belly, 9);
    ctx.beginPath();
    ctx.ellipse(gu.x - thW * 0.25, gu.y + thH * 0.1, thW * 0.34, thH * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- rear-quarter domes: over the hull, as silhouette bulges.
  if (rearRead) for (const e of eyes) paintDome(e, true);

  // ---- THE GILLS: cheek arcs on whichever flank faces the camera,
  // nape seams when the occiput does. One anatomy, two projections.
  if (!hurt) {
    for (const side of [-1, 1] as const) {
      const dotG = side * py;
      if (dotG < 0.25) continue;
      ctx.strokeStyle = shade(sk.hide, -16);
      ctx.lineWidth = Math.max(1, s * 0.014);
      for (let g = 0; g < 3; g++) {
        const gp = st(-0.02 - g * 0.16, side * 0.88, -0.1);
        ctx.beginPath();
        ctx.moveTo(gp.x, gp.y - aZ * 0.22);
        ctx.quadraticCurveTo(gp.x - side * px * s * 0.02, gp.y, gp.x, gp.y + aZ * 0.22);
        ctx.stroke();
      }
    }
    if (-fy > 0.5) {
      ctx.strokeStyle = shade(sk.hide, -18);
      ctx.lineWidth = Math.max(1, s * 0.02);
      for (const o of [-0.42, 0, 0.42] as const) {
        ctx.beginPath();
        ctx.moveTo(cx + W * o - W * 0.14, headY + aZ * 0.28);
        ctx.quadraticCurveTo(cx + W * o, headY + aZ * 0.52, cx + W * o + W * 0.14, headY + aZ * 0.3);
        ctx.stroke();
      }
    }
  }

  // ---- THE MOUTH: a sampled 3D arc around the muzzle. The seam, the
  // lip vault, the jaw, both tooth courses, the tongue, the fangs,
  // and the barbels all ride the SAME samples — one truth, and every
  // part of the mouth agrees at every heading by construction.
  const N = 13;
  const THMAX = 1.25;
  type MPt = { x: number; y: number; d: number; th: number };
  const seamZ = (th: number): number => -0.34 + 0.2 * Math.pow(Math.abs(th) / THMAX, 1.6);
  const dropZ = gape * (0.42 + 0.12 * hv) * jawK;
  const jawZ = (th: number): number => seamZ(th) - dropZ * Math.cos(((th / THMAX) * Math.PI) / 2);
  const arc = (zOf: (th: number) => number): MPt[] => {
    const pts: MPt[] = [];
    for (let i = 0; i < N; i++) {
      const th = -THMAX + (2 * THMAX * i) / (N - 1);
      const p = st(Math.cos(th) * 0.88 + 0.04, Math.sin(th) * 0.98, zOf(th));
      pts.push({ ...p, th });
    }
    return pts;
  };
  const seam = arc(seamZ).filter((p) => p.d > -0.04);
  const open = gape > 0.1;
  if (seam.length >= 3) {
    const jaw = arc(jawZ).filter((p) => p.d > -0.04);
    const head = seam[0]!;
    const tail = seam[seam.length - 1]!;
    const trace = (pts: MPt[], rev = false): void => {
      const list = rev ? [...pts].reverse() : pts;
      for (let i = 0; i < list.length; i++) {
        if (i === 0 && !rev) ctx.moveTo(list[i]!.x, list[i]!.y);
        else ctx.lineTo(list[i]!.x, list[i]!.y);
      }
    };
    if (open) {
      // The mouth-room: seam down to the hinged jaw — filled ink.
      ctx.fillStyle = hurt ? '#ffffff' : sk.ink;
      ctx.beginPath();
      trace(seam);
      trace(jaw, true);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        // The tongue: a coral mass in the jaw's floor — drawn only
        // while the mouth's center holds the camera side.
        const mid = seam[Math.floor(seam.length / 2)]!;
        if (mid.d > 0.25 && dropZ > 0.05) {
          const jmid = jaw[Math.floor(jaw.length / 2)]!;
          ctx.fillStyle = '#a05c56';
          ctx.beginPath();
          ctx.ellipse(
            jmid.x,
            jmid.y - dropZ * aZ * 0.3 - gular * s * 0.01,
            Math.abs(tail.x - head.x) * 0.24,
            Math.min(dropZ * aZ * 0.36, s * 0.034),
            0,
            Math.PI,
            Math.PI * 2,
          );
          ctx.fill();
          ctx.strokeStyle = '#7a423e';
          ctx.lineWidth = Math.max(1, s * 0.01);
          ctx.beginPath();
          ctx.moveTo(jmid.x - Math.abs(tail.x - head.x) * 0.13, jmid.y - dropZ * aZ * 0.32);
          ctx.quadraticCurveTo(
            jmid.x,
            jmid.y - dropZ * aZ * 0.46,
            jmid.x + Math.abs(tail.x - head.x) * 0.13,
            jmid.y - dropZ * aZ * 0.32,
          );
          ctx.stroke();
        }
        // Lower teeth: up-needles standing off the jaw rim at every
        // OTHER interior sample — sparser than the upper course.
        ctx.fillStyle = SKRAL_TOOTH;
        for (let i = 2; i < jaw.length - 2; i += 2) {
          const p = jaw[i]!;
          const wT = Math.min(s * 0.014, Math.abs(jaw[i + 1]!.x - jaw[i - 1]!.x) * 0.22);
          const tl = s * (0.02 + 0.008 * hv) * (0.6 + 0.5 * gape);
          ctx.beginPath();
          ctx.moveTo(p.x - wT, p.y);
          ctx.lineTo(p.x, p.y - tl);
          ctx.lineTo(p.x + wT, p.y);
          ctx.closePath();
          ctx.fill();
        }
      }
      // The shovel: the jaw's own pale thickness under the room, with
      // a rimmed chin — hinged at the arc's ends by construction.
      const jawTh = s * (0.026 + 0.013 * hv) * (0.5 + 0.5 * gape);
      ctx.fillStyle = hurt ? '#ffffff' : belly;
      ctx.beginPath();
      trace(jaw);
      for (let i = jaw.length - 1; i >= 0; i--) {
        const k = Math.sin((Math.PI * i) / Math.max(1, jaw.length - 1));
        ctx.lineTo(jaw[i]!.x, jaw[i]!.y + jawTh * (0.4 + 1.6 * k));
      }
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        ctx.strokeStyle = shade(sk.belly, -16);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        for (let i = 0; i < jaw.length; i++) {
          const k = Math.sin((Math.PI * i) / Math.max(1, jaw.length - 1));
          const yy = jaw[i]!.y + jawTh * (0.3 + 1.3 * k);
          if (i === 0) ctx.moveTo(jaw[i]!.x, yy);
          else ctx.lineTo(jaw[i]!.x, yy);
        }
        ctx.stroke();
      }
    }
    if (!hurt) {
      // Upper teeth: needles hanging from under the lip at every
      // other sample — width from the arc's own local spacing, so
      // the course foreshortens into the turn like everything else.
      // The fang gradient rides |th|: corner teeth run longer.
      ctx.fillStyle = SKRAL_TOOTH;
      for (let i = 1; i < seam.length - 1; i += 2) {
        const p = seam[i]!;
        const wT = Math.min(s * 0.016, Math.abs(seam[i + 1]!.x - seam[i - 1]!.x) * 0.26);
        // Where the arc foreshortens into the wrap the samples crowd —
        // a needle needs standing room or the course smears white.
        if (wT < s * 0.008) continue;
        const cornerK = 1 + 0.8 * Math.pow(Math.abs(p.th) / THMAX, 2);
        const tl = s * (0.024 + 0.011 * hv) * (1 + 0.55 * gape) * cornerK;
        ctx.beginPath();
        ctx.moveTo(p.x - wT, p.y);
        ctx.lineTo(p.x + wT * 0.1, p.y + tl);
        ctx.lineTo(p.x + wT, p.y);
        ctx.closePath();
        ctx.fill();
      }
      // THE LIP VAULT: the muzzle's underside plane — a filled band
      // above the seam with a lit top edge, riding the same samples.
      const lipH = s * (0.02 + 0.009 * hv);
      ctx.fillStyle = shade(sk.hide, -6);
      ctx.beginPath();
      trace(seam);
      for (let i = seam.length - 1; i >= 0; i--) ctx.lineTo(seam[i]!.x, seam[i]!.y - lipH);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shade(sk.hide, 7);
      ctx.lineWidth = Math.max(1, s * 0.011);
      ctx.beginPath();
      for (let i = 1; i < seam.length - 1; i++) {
        if (i === 1) ctx.moveTo(seam[i]!.x, seam[i]!.y - lipH * 0.95);
        else ctx.lineTo(seam[i]!.x, seam[i]!.y - lipH * 0.95);
      }
      ctx.stroke();
      // THE SEAM: one bold stroke down the lip's lower edge.
      ctx.strokeStyle = sk.ink;
      ctx.lineWidth = Math.max(1.5, s * (0.022 + 0.009 * hv));
      ctx.lineCap = 'round';
      ctx.beginPath();
      trace(seam);
      ctx.stroke();
      // The underlip: shut, the grin gets a chin shadow.
      if (!open && seam.length >= 5) {
        ctx.strokeStyle = shade(sk.hide, -15);
        ctx.lineWidth = Math.max(1, s * 0.013);
        ctx.beginPath();
        for (let i = 1; i < seam.length - 1; i++) {
          const yy = seam[i]!.y + s * 0.03;
          if (i === 1) ctx.moveTo(seam[i]!.x, yy);
          else ctx.lineTo(seam[i]!.x, yy);
        }
        ctx.stroke();
      }
      // CORNER FANGS + BARBELS: seated on the arc's true ends, when
      // that end still holds the camera side.
      for (const [end, sgn] of [
        [head, -lead],
        [tail, lead],
      ] as Array<[MPt, number]>) {
        if (end.d < 0.05 || Math.abs(end.th) < THMAX * 0.92) continue;
        ctx.fillStyle = SKRAL_TOOTH;
        const fl = s * (0.04 + 0.014 * hv) * (0.9 + 0.25 * jawK);
        ctx.beginPath();
        ctx.moveTo(end.x - s * 0.015, end.y + dropZ * aZ * 0.2);
        ctx.lineTo(end.x + sgn * s * 0.008, end.y - fl + dropZ * aZ * 0.2);
        ctx.lineTo(end.x + s * 0.016, end.y + dropZ * aZ * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = sk.ink;
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(end.x, end.y + dropZ * aZ * 0.25 + s * 0.008);
        ctx.quadraticCurveTo(
          end.x + sgn * s * 0.02,
          end.y + dropZ * aZ * 0.25 + s * 0.05,
          end.x + sgn * s * 0.008,
          end.y + dropZ * aZ * 0.25 + s * (0.075 + 0.008 * Math.sin(nowMs / 480 + sgn)),
        );
        ctx.stroke();
      }
    }
  }

  // ---- THE NOSTRILS: paired pits high on the muzzle — stations that
  // simply leave with the muzzle.
  if (!hurt) {
    for (const side of [-1, 1] as const) {
      const np = st(0.82, side * 0.16, 0.18);
      if (np.d < 0.12) continue;
      ctx.fillStyle = sk.ink;
      ctx.beginPath();
      ctx.arc(np.x, np.y, s * 0.011, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- THE LANTERNS, near pass: iris, pupil, glint, lid, and the
  // deepking's scar — ink only while the dome's normal faces camera.
  for (const e of eyes) {
    if (e.d <= 0.02 || rearRead) continue;
    paintDome(e, false);
  }
  if (!hurt) {
    for (const e of eyes) {
      if (e.dot < 0.12) continue;
      // The iris narrows as the dome turns — a sphere's window, not
      // a sticker: foreshorten by the dome's own facing.
      const irisK = 0.5 + 0.5 * Math.min(1, e.dot * 1.6);
      ctx.fillStyle = sk.eye;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, eyeR * 0.78 * irisK, eyeR * 0.74, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = sk.ink;
      ctx.beginPath();
      ctx.ellipse(
        e.x + fx * eyeR * 0.24 * irisK,
        e.y + eyeR * 0.06 + fy * eyeR * 0.1,
        eyeR * 0.3 * irisK,
        eyeR * 0.34,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.fillStyle = '#f4f6ee';
      ctx.beginPath();
      ctx.arc(e.x - eyeR * 0.16, e.y - eyeR * 0.22, eyeR * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shade(sk.hide, -18);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.ellipse(e.x, e.y - eyeR * 0.1, eyeR * 0.72 * irisK, eyeR * 0.6, 0, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      if (sk.scarred && e.side === lead && e.dot > 0.3) {
        ctx.strokeStyle = shade(sk.hide, -24);
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(e.x - eyeR * 0.5, e.y - eyeR * 1.15);
        ctx.lineTo(e.x + eyeR * 0.2, e.y + eyeR * 1.05);
        ctx.stroke();
      }
    }
  }

  // ---- the crown's near studs ride over everything.
  for (const u of studs) if (u.d > 0) paintStud(u);
}

// ---------------------------------------------------------------------------
// THE BODY.

export interface SkralBodyFrame {
  s: number;
  tw: number;
  ww: number;
  th: number;
  fx: number;
  fy: number;
  profileK: number;
  backK: number;
  lead: number;
  hurt: boolean;
  nowMs: number;
}

/**
 * The skral torso overpaint: the pale belly plate with its fold
 * bands, spine finlets from behind, and — on the deepking — the
 * back-slung barbed trident. The belly pass is gated by the caller
 * when real armor is worn (armor stays visible: the loot-story law);
 * the NET-SASH (paintSkralWrap) always paints, the loincloth law.
 */
export function paintSkralBody(
  ctx: CanvasRenderingContext2D,
  sk: SkralLook,
  f: SkralBodyFrame,
  armored: boolean,
): void {
  const { s, tw, ww, th, fy, profileK, backK, lead, hurt } = f;
  const back = backK > 0.5;
  // The trident rides the back: mostly hidden behind the torso when
  // the skral faces the camera (tines peeking over the far shoulder),
  // whole when it faces away. Paint order does that for free — the
  // torso quad is already down when this runs, so "behind" here means
  // low alpha slip along the silhouette edge... no tricks: front
  // bands draw only the head above the shoulder line; back bands draw
  // the whole carry.
  if (sk.trident && !hurt) {
    // The carry rides OUTBOARD of the skull: the head proportion is
    // the widest in the game, and a shoulder-slung tine head parked
    // at the spine vanishes behind it at every band (the pass-two
    // lesson) — so the barbed head clears the skull's edge instead.
    const bx = -lead * (tw * 0.4 + s * 0.17);
    const topY = -th - s * 0.16;
    ctx.strokeStyle = shade('#6a5a44', back ? 0 : -4);
    ctx.lineWidth = Math.max(1.5, s * 0.024);
    if (back) {
      ctx.beginPath();
      ctx.moveTo(-bx * 0.3, topY + th * 1.24);
      ctx.lineTo(bx * 0.92, topY + s * 0.08);
      ctx.stroke();
    } else {
      // The shaft's stub peeks from behind the shoulder to the head.
      ctx.beginPath();
      ctx.moveTo(bx * 0.55, topY + s * 0.3);
      ctx.lineTo(bx * 0.95, topY + s * 0.09);
      ctx.stroke();
    }
    // The head: three barbed tines of pale bone, always visible.
    const hxT = back ? bx + lead * s * 0.02 : bx;
    ctx.fillStyle = shade(SKRAL_TOOTH, -4);
    for (const o of [-1, 0, 1] as const) {
      const tx = hxT + o * s * 0.045;
      const tipY = topY - s * (o === 0 ? 0.1 : 0.055);
      ctx.beginPath();
      ctx.moveTo(tx - s * 0.014, topY + s * 0.06);
      ctx.lineTo(tx, tipY);
      ctx.lineTo(tx + s * 0.014, topY + s * 0.06);
      ctx.closePath();
      ctx.fill();
      // The barb: one back-hook off each outer tine.
      if (o !== 0) {
        ctx.beginPath();
        ctx.moveTo(tx, tipY + s * 0.03);
        ctx.lineTo(tx + o * s * 0.02, tipY + s * 0.048);
        ctx.lineTo(tx, tipY + s * 0.056);
        ctx.closePath();
        ctx.fill();
      }
    }
    // The lash binding the head to the shaft.
    ctx.strokeStyle = shade(sk.cloth, -8);
    ctx.lineWidth = Math.max(1, s * 0.016);
    ctx.beginPath();
    ctx.moveTo(hxT - s * 0.05, topY + s * 0.075);
    ctx.lineTo(hxT + s * 0.05, topY + s * 0.09);
    ctx.stroke();
  }
  // Spine finlets: three small hide-dark nubs down the back line —
  // the dorsal read that keeps a walking-away skral a fish.
  if (back && !hurt) {
    ctx.fillStyle = shade(sk.hide, -12);
    for (const t of [0.22, 0.46, 0.7] as const) {
      const y = -th + th * t * 1.1;
      const r = s * 0.028 * (1 - t * 0.4);
      ctx.beginPath();
      ctx.moveTo(-r, y);
      ctx.lineTo(0, y - r * 1.6);
      ctx.lineTo(r, y);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (armored || back) return;
  // The belly plate: one pale panel from the throat's pool past the
  // waist, three soft fold bands — a frog's underside, flat planes.
  const bw = ww * (0.78 - 0.26 * profileK);
  ctx.fillStyle = hurt ? '#ffffff' : sk.belly;
  ctx.beginPath();
  chamferRect(ctx, lead * profileK * ww * 0.2 - bw, -th * 0.86, bw * 2, th * 0.95, s * 0.05);
  ctx.fill();
  if (!hurt) {
    ctx.strokeStyle = shade(sk.belly, -12);
    ctx.lineWidth = Math.max(1, s * 0.012);
    for (const t of [0.3, 0.52, 0.74] as const) {
      const y = -th * 0.86 + th * 0.95 * t;
      ctx.beginPath();
      ctx.moveTo(lead * profileK * ww * 0.2 - bw * 0.8, y);
      ctx.quadraticCurveTo(lead * profileK * ww * 0.2, y + s * 0.016, lead * profileK * ww * 0.2 + bw * 0.8, y);
      ctx.stroke();
    }
    // Flank speckle: a seeded handful of darker scale flecks on the
    // near flank — wet hide, not a flat costume.
    const seed = (sk.seed ?? 0) * 2654435761;
    ctx.fillStyle = shade(sk.hide, -9);
    for (let i = 0; i < 4; i++) {
      const h = (seed >>> (i * 5 + 3)) & 0xff;
      const sx = lead * (bw * 1.1 + (h & 7) * s * 0.01);
      const sy = -th * 0.75 + ((h >> 3) & 15) * th * 0.05;
      ctx.beginPath();
      ctx.ellipse(sx, sy, s * 0.014, s * 0.01, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  void fy;
}

/**
 * THE NET-SASH — every skral wears the woven belt and its frayed hip
 * net (the loincloth law): cord band at the waist, a short knotted
 * net apron on the near hip, and one shell bead. The tidecaller's
 * kelp mantle rides the shoulders above it.
 */
export function paintSkralWrap(
  ctx: CanvasRenderingContext2D,
  sk: SkralLook,
  f: SkralBodyFrame,
): void {
  const { s, tw, ww, th, profileK, backK, lead, hurt } = f;
  const cloth = hurt ? '#ffffff' : sk.cloth;
  // The waist cord: two lapped strands.
  const wy = -th * 0.16;
  ctx.strokeStyle = cloth;
  ctx.lineWidth = Math.max(1.5, s * 0.026);
  ctx.beginPath();
  ctx.moveTo(-ww * 0.96, wy);
  ctx.quadraticCurveTo(0, wy + s * 0.022, ww * 0.96, wy);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, s * 0.016);
  ctx.strokeStyle = hurt ? '#ffffff' : shade(sk.cloth, -10);
  ctx.beginPath();
  ctx.moveTo(-ww * 0.9, wy + s * 0.03);
  ctx.quadraticCurveTo(0, wy + s * 0.052, ww * 0.9, wy + s * 0.03);
  ctx.stroke();
  if (hurt) return;
  // The hip net: a short knotted apron off the near hip — three cords
  // with two cross-ties, ending frayed. Cheap, and it MOVES with the
  // silhouette because it hangs off ww.
  const nx = lead * ww * (0.5 - 0.2 * profileK);
  ctx.strokeStyle = shade(sk.cloth, -6);
  ctx.lineWidth = Math.max(1, s * 0.014);
  for (const o of [-1, 0, 1] as const) {
    ctx.beginPath();
    ctx.moveTo(nx + o * s * 0.03, wy + s * 0.02);
    ctx.lineTo(nx + o * s * 0.042, wy + s * 0.14);
    ctx.stroke();
  }
  for (const t of [0.4, 0.75] as const) {
    ctx.beginPath();
    ctx.moveTo(nx - s * 0.036, wy + s * 0.02 + s * 0.12 * t);
    ctx.lineTo(nx + s * 0.036, wy + s * 0.02 + s * 0.12 * t + s * 0.008);
    ctx.stroke();
  }
  // The shell bead on the cord — one pale chip, the shoal's coin.
  ctx.fillStyle = shade(SKRAL_TOOTH, -2);
  ctx.beginPath();
  ctx.arc(-lead * ww * 0.3, wy + s * 0.008, s * 0.02, 0, Math.PI * 2);
  ctx.fill();
  // The kelp mantle: the tidecaller's shoulder drape — two ragged
  // fronds over the shoulder line, value-separated from the hide.
  if (sk.garb && backK < 0.75) {
    ctx.fillStyle = sk.garb;
    for (const sgn of [-1, 1] as const) {
      const mx = sgn * tw * 0.72;
      ctx.beginPath();
      ctx.moveTo(mx - sgn * s * 0.05, -th * 0.98);
      ctx.quadraticCurveTo(mx + sgn * s * 0.05, -th * 0.7, mx - sgn * s * 0.015, -th * 0.32);
      ctx.lineTo(mx + sgn * s * 0.05, -th * 0.4);
      ctx.quadraticCurveTo(mx + sgn * s * 0.06, -th * 0.78, mx + sgn * s * 0.02, -th * 1.0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = shade(sk.garb, -10);
    ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.beginPath();
    ctx.moveTo(-tw * 0.7, -th * 0.94);
    ctx.quadraticCurveTo(0, -th * 1.06, tw * 0.7, -th * 0.94);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// LIMBS.

/**
 * The skral arm past the solve: lean hide strokes with a forearm FIN
 * off the outer edge and a webbed three-ray hand — palm chip, splayed
 * fingers, membrane fills between them. Called from drawArm the way
 * the golem and ogre arms are; the skral never owned a sleeve.
 */
export function drawSkralArm(
  ctx: CanvasRenderingContext2D,
  sk: SkralLook,
  sx: number,
  sy: number,
  kx: number,
  ky: number,
  ex: number,
  ey: number,
  s: number,
  hurt: boolean,
  nowMs: number,
): void {
  void nowMs;
  const hv = 0.9 + 0.2 * sk.heavy;
  ctx.lineCap = 'round';
  // Upper arm, then a slightly lighter forearm — wet hide catches sky.
  ctx.strokeStyle = hurt ? '#ffffff' : shade(sk.hide, -4);
  ctx.lineWidth = Math.max(2, s * 0.06 * hv);
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(kx, ky);
  ctx.stroke();
  ctx.strokeStyle = hurt ? '#ffffff' : shade(sk.hide, 2);
  ctx.lineWidth = Math.max(2, s * 0.052 * hv);
  ctx.beginPath();
  ctx.moveTo(kx, ky);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  // The forearm fin: one raked blade off the elbow's outer edge.
  const adx = ex - kx;
  const ady = ey - ky;
  const al = Math.hypot(adx, ady) || 1;
  const nx = -ady / al;
  const ny = adx / al;
  const fbx = kx + adx * 0.3;
  const fby = ky + ady * 0.3;
  if (!hurt) {
    ctx.fillStyle = shade(sk.fin, -4);
    ctx.beginPath();
    ctx.moveTo(fbx, fby);
    ctx.quadraticCurveTo(
      fbx + nx * s * 0.075 - adx * 0.08,
      fby + ny * s * 0.075 - ady * 0.08,
      kx + adx * 0.7,
      ky + ady * 0.7,
    );
    ctx.closePath();
    ctx.fill();
  }
  // THE WEBBED HAND: palm chip + three splayed rays + membranes.
  const hr = s * 0.052 * hv;
  ctx.fillStyle = hurt ? '#ffffff' : shade(sk.hide, -2);
  ctx.beginPath();
  ctx.arc(ex, ey, hr, 0, Math.PI * 2);
  ctx.fill();
  if (hurt) {
    ctx.lineCap = 'butt';
    return;
  }
  const spread = 0.62;
  const base = Math.atan2(ady, adx);
  const rays: Array<[number, number]> = [];
  for (const o of [-1, 0, 1] as const) {
    const a = base + o * spread;
    const fl = hr * (o === 0 ? 2.1 : 1.7);
    rays.push([ex + Math.cos(a) * fl, ey + Math.sin(a) * fl]);
  }
  // Membranes between the rays first (under), pale and a touch clear.
  ctx.fillStyle = shade(sk.belly, -4);
  ctx.globalAlpha = 0.85;
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(rays[i]![0], rays[i]![1]);
    ctx.lineTo(rays[i + 1]![0], rays[i + 1]![1]);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // The rays: finger strokes over the webs, dark claw ticks past.
  ctx.strokeStyle = shade(sk.hide, -6);
  ctx.lineWidth = Math.max(1.5, hr * 0.4);
  for (const [rx, ry] of rays) {
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(rx, ry);
    ctx.stroke();
  }
  ctx.fillStyle = sk.ink;
  for (const [rx, ry] of rays) {
    const a = Math.atan2(ry - ey, rx - ex);
    ctx.beginPath();
    ctx.moveTo(rx + Math.cos(a - 0.5) * hr * 0.16, ry + Math.sin(a - 0.5) * hr * 0.16);
    ctx.lineTo(rx + Math.cos(a) * hr * 0.42, ry + Math.sin(a) * hr * 0.42);
    ctx.lineTo(rx + Math.cos(a + 0.5) * hr * 0.16, ry + Math.sin(a + 0.5) * hr * 0.16);
    ctx.closePath();
    ctx.fill();
  }
  ctx.lineCap = 'butt';
}

/**
 * THE FAN FOOT: the murloc footprint — a webbed triangle twice the
 * shank's width, three long toe rays with membrane between, splayed
 * toward the lead. The widest bare foot below the ogre's, on the
 * thinnest shanks in the game: the proportion IS the species.
 */
export function paintSkralFoot(
  ctx: CanvasRenderingContext2D,
  sk: SkralLook,
  fxx: number,
  fyy: number,
  s: number,
  lead: number,
  hurt: boolean,
): void {
  const gv = 0.9 + 0.18 * sk.heavy;
  const heelX = fxx - lead * 0.05 * s;
  // Toe ray stations: fan forward of the ankle, widest in the middle.
  const rays: Array<[number, number]> = [
    [fxx + lead * 0.13 * s * gv, fyy - 0.05 * s],
    [fxx + lead * 0.16 * s * gv, fyy + 0.004 * s],
    [fxx + lead * 0.12 * s * gv, fyy + 0.05 * s],
  ];
  // The web: one filled fan from the heel through all three tips.
  ctx.fillStyle = hurt ? '#ffffff' : shade(sk.belly, -6);
  ctx.beginPath();
  ctx.moveTo(heelX, fyy - 0.03 * s);
  for (const [rx, ry] of rays) ctx.lineTo(rx, ry);
  ctx.lineTo(heelX, fyy + 0.03 * s);
  ctx.closePath();
  ctx.fill();
  if (hurt) return;
  // The instep: hide over the web's root — the foot has a top.
  ctx.fillStyle = shade(sk.hide, -4);
  ctx.beginPath();
  chamferRect(ctx, heelX - 0.02 * s, fyy - 0.032 * s, 0.09 * s * gv, 0.064 * s, 0.02 * s);
  ctx.fill();
  // The ankle knuckle seats the spindle on the fan.
  ctx.fillStyle = shade(sk.hide, -10);
  ctx.beginPath();
  ctx.arc(heelX, fyy - 0.03 * s, 0.024 * s, 0, Math.PI * 2);
  ctx.fill();
  // Toe rays over the web, ink tips past the rim.
  ctx.strokeStyle = shade(sk.hide, -8);
  ctx.lineWidth = Math.max(1, 0.016 * s);
  for (const [rx, ry] of rays) {
    ctx.beginPath();
    ctx.moveTo(heelX + lead * 0.02 * s, fyy);
    ctx.lineTo(rx, ry);
    ctx.stroke();
  }
  ctx.fillStyle = sk.ink;
  for (const [rx, ry] of rays) {
    ctx.beginPath();
    ctx.moveTo(rx - lead * 0.008 * s, ry - 0.008 * s);
    ctx.lineTo(rx + lead * 0.022 * s, ry + 0.002 * s);
    ctx.lineTo(rx - lead * 0.008 * s, ry + 0.01 * s);
    ctx.closePath();
    ctx.fill();
  }
}
