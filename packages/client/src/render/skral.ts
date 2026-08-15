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
 * The skral head, drawn in the head block's own frame. Reads skral by
 * SILHOUETTE first: a broad low fish skull WIDER than tall between
 * two lantern eye domes, the needle grin sweeping ear to ear under
 * them, no neck at all — the skull sits IN the shoulders and the
 * gular throat pools where a chin would be, pulsing on the idle
 * clock. The crest paints separately (the sim owns it). From behind
 * there is no face: wet occiput, the gill nape seams, and the eye
 * domes swelling the outline.
 */
export function paintSkralHead(
  ctx: CanvasRenderingContext2D,
  sk: SkralLook,
  f: SkralHeadFrame,
): void {
  const { headX, headY, hw, hh, cut, fx, profileK, backK, lead, hurt, nowMs, gape } = f;
  const hv = sk.heavy;
  const hide = hurt ? '#ffffff' : sk.hide;
  const belly = hurt ? '#ffffff' : sk.belly;
  const back = backK > 0.55;
  const pk = profileK;
  // The skull turns as a WIDE block: cheeks bulge past hw face-on and
  // the muzzle runs forward at profile. Width compresses through the
  // turn, depth arrives — one pair of dials, no per-band branches.
  const skW = hw * (1.24 - 0.26 * pk) * (0.94 + 0.12 * hv);
  const skH = hh * 0.92;
  const mzl = hw * 0.5 * pk; // profile muzzle run-out, toward lead
  // The gular pulse: the throat breathes at rest and INFLATES with
  // the croak — one clock, shared with nothing else on the body.
  const gular = (hurt ? 0 : 0.06 * Math.sin(nowMs / 520)) + 0.55 * gape;

  // ---- the skull mass (one chamfered slab, wider than tall).
  ctx.fillStyle = hide;
  ctx.beginPath();
  chamferRect(
    ctx,
    headX - skW + lead * mzl * 0.35,
    headY - skH,
    skW * 2 + Math.abs(mzl) * 0.55,
    skH * 1.72,
    cut * 1.05,
  );
  ctx.fill();
  // The crown's lit top plane — every big mass shows one.
  if (!hurt) {
    ctx.fillStyle = shade(sk.hide, 8);
    ctx.beginPath();
    chamferRect(
      ctx,
      headX - skW * 0.78 + lead * mzl * 0.3,
      headY - skH * 0.98,
      skW * 1.56,
      skH * 0.34,
      cut * 0.7,
    );
    ctx.fill();
  }

  // ---- the gular throat: a pale pouch under the jaw line, pooled
  // into the shoulders — the no-neck read AND the croak's bellows.
  const thY = headY + skH * 0.66;
  const thW = skW * (0.72 - 0.18 * pk);
  const thH = skH * (0.34 + 0.3 * gular);
  ctx.fillStyle = back ? (hurt ? '#ffffff' : shade(sk.hide, -8)) : belly;
  ctx.beginPath();
  ctx.ellipse(headX + lead * mzl * 0.25, thY + thH * 0.3, thW, thH, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!hurt && !back && gular > 0.2) {
    // The loaded croak's sheen.
    ctx.fillStyle = shade(sk.belly, 9);
    ctx.beginPath();
    ctx.ellipse(headX + lead * mzl * 0.25 - thW * 0.25, thY + thH * 0.12, thW * 0.34, thH * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- THE LANTERN EYES: domes first (they survive every band),
  // ink only where the face gates allow.
  // Eye stations ride the skull's sides and slide forward with pk;
  // the far dome hides once the near cheek truly owns the corner.
  const eyeR = hw * (0.3 + 0.05 * hv) * (1 - 0.12 * pk);
  const eyeY = headY - skH * 0.38;
  const eyeXn = headX + lead * (skW * 0.66 + mzl * 0.18); // near
  const eyeXf = headX - lead * (skW * 0.66 - mzl * 0.42); // far
  const domes: Array<{ x: number; near: boolean }> = [{ x: eyeXn, near: true }];
  if (pk < 0.62) domes.push({ x: eyeXf, near: false });
  for (const d of domes) {
    // The dome: hide-toned from behind (a socket has a back — a full
    // tone step down, or the bulge melts into the occiput), lidded
    // scale up front.
    ctx.fillStyle = hurt ? '#ffffff' : shade(sk.hide, back ? -9 : 6);
    ctx.beginPath();
    ctx.ellipse(d.x, eyeY, eyeR, eyeR * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();
    if (hurt || back) continue;
    // The lantern: pale iris filling most of the dome, ink pupil
    // slid toward the facing — the wall-eye never quite looks AT you,
    // which is worse.
    ctx.fillStyle = sk.eye;
    ctx.beginPath();
    ctx.ellipse(d.x, eyeY, eyeR * 0.78, eyeR * 0.74, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = sk.ink;
    ctx.beginPath();
    ctx.ellipse(
      d.x + lead * eyeR * 0.22 * (d.near ? 1 : 0.6),
      eyeY + eyeR * 0.06,
      eyeR * 0.3,
      eyeR * 0.34,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    // The wet glint — one pale chip, upper-left of the pupil.
    ctx.fillStyle = '#f4f6ee';
    ctx.beginPath();
    ctx.arc(d.x - eyeR * 0.16, eyeY - eyeR * 0.22, eyeR * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // The lid: a heavy upper seam — unblinking is a choice.
    ctx.strokeStyle = shade(sk.hide, -18);
    ctx.lineWidth = Math.max(1, f.s * 0.014);
    ctx.beginPath();
    ctx.ellipse(d.x, eyeY - eyeR * 0.1, eyeR * 0.72, eyeR * 0.6, 0, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    // The scar: the deepking's near lid carries the old argument.
    if (sk.scarred && d.near) {
      ctx.strokeStyle = shade(sk.hide, -24);
      ctx.lineWidth = Math.max(1, f.s * 0.016);
      ctx.beginPath();
      ctx.moveTo(d.x - eyeR * 0.5, eyeY - eyeR * 1.15);
      ctx.lineTo(d.x + eyeR * 0.2, eyeY + eyeR * 1.05);
      ctx.stroke();
    }
  }

  // ---- from behind: gill nape seams and out — no face ever.
  if (back) {
    if (!hurt) {
      ctx.strokeStyle = shade(sk.hide, -18);
      ctx.lineWidth = Math.max(1, f.s * 0.02);
      for (const o of [-0.42, 0, 0.42] as const) {
        ctx.beginPath();
        ctx.moveTo(headX + skW * o - skW * 0.14, headY + skH * 0.28);
        ctx.quadraticCurveTo(headX + skW * o, headY + skH * 0.52, headX + skW * o + skW * 0.14, headY + skH * 0.3);
        ctx.stroke();
      }
    }
    paintSkralCrown(ctx, sk, f, skW, skH);
    return;
  }

  // ---- THE GAPE: the cut, the teeth, and the dropped shovel.
  // The mouth line sweeps the skull's whole width — sagging at the
  // middle, rising to corners BELOW the eyes: the grim fish grin.
  const mY = headY + skH * (0.3 - 0.04 * pk);
  const mSpan = skW * (1.0 - 0.12 * pk);
  const cxm = headX + lead * mzl * 0.45;
  const sag = skH * 0.14;
  const drop = gape * skH * (0.5 + 0.15 * hv);
  if (gape > 0.12) {
    // The mouth-room: dark, then the pale shovel swinging under it.
    ctx.fillStyle = hurt ? '#ffffff' : sk.ink;
    ctx.beginPath();
    ctx.moveTo(cxm - mSpan, mY);
    ctx.quadraticCurveTo(cxm, mY + sag + drop * 0.4, cxm + mSpan, mY);
    ctx.quadraticCurveTo(cxm, mY + sag * 0.2, cxm - mSpan, mY);
    ctx.fill();
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.moveTo(cxm - mSpan * 0.88, mY + drop * 0.35);
    ctx.quadraticCurveTo(cxm, mY + sag + drop, cxm + mSpan * 0.88, mY + drop * 0.35);
    ctx.quadraticCurveTo(cxm, mY + sag * 0.5 + drop * 0.75, cxm - mSpan * 0.88, mY + drop * 0.35);
    ctx.fill();
  }
  if (!hurt) {
    // The cut: one long BOLD ink seam, always worn — shut or gaping.
    // The grin is half the species; a timid seam is a costume.
    ctx.strokeStyle = sk.ink;
    ctx.lineWidth = Math.max(1.5, f.s * (0.026 + 0.01 * hv));
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cxm - mSpan, mY);
    ctx.quadraticCurveTo(cxm, mY + sag + drop * 0.4, cxm + mSpan, mY);
    ctx.stroke();
    // Needle ticks riding the cut — down-teeth off the upper lip,
    // two up-needles at the corners: chunky pale fills, never hairs.
    ctx.fillStyle = SKRAL_TOOTH;
    const teeth = pk > 0.62 ? 4 : 6;
    for (let i = 0; i < teeth; i++) {
      const t = (i + 0.5) / teeth;
      const txp = cxm - mSpan + t * mSpan * 2;
      const typ = mY + Math.sin(t * Math.PI) * sag * 0.9 + drop * 0.38 * Math.sin(t * Math.PI);
      const tl = f.s * (0.034 + 0.012 * hv) * (1 + 0.5 * gape);
      ctx.beginPath();
      ctx.moveTo(txp - f.s * 0.015, typ);
      ctx.lineTo(txp, typ + tl);
      ctx.lineTo(txp + f.s * 0.015, typ);
      ctx.closePath();
      ctx.fill();
    }
    for (const sgn of pk > 0.62 ? [lead] : [-1, 1]) {
      const txp = cxm + sgn * mSpan * 0.84;
      ctx.beginPath();
      ctx.moveTo(txp - f.s * 0.016, mY + drop * 0.3);
      ctx.lineTo(txp + sgn * f.s * 0.007, mY - f.s * 0.042 - 0.014 * f.s * hv + drop * 0.3);
      ctx.lineTo(txp + f.s * 0.016, mY + drop * 0.3);
      ctx.closePath();
      ctx.fill();
    }
    // Barbels: one whisker off each mouth corner, ink, hanging.
    ctx.strokeStyle = sk.ink;
    ctx.lineWidth = Math.max(1, f.s * 0.012);
    for (const sgn of pk > 0.62 ? [lead] : [-1, 1]) {
      const bx = cxm + sgn * mSpan * 0.98;
      ctx.beginPath();
      ctx.moveTo(bx, mY + f.s * 0.005);
      ctx.quadraticCurveTo(
        bx + sgn * f.s * 0.02,
        mY + f.s * 0.045,
        bx + sgn * f.s * 0.008,
        mY + f.s * (0.07 + (hurt ? 0 : 0.008 * Math.sin(nowMs / 480 + sgn))),
      );
      ctx.stroke();
    }
    // Nostril pits: two ink dots high on the muzzle's center line.
    ctx.fillStyle = sk.ink;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cxm + sgn * skW * 0.1 * (1 - pk * 0.5) + lead * mzl * 0.2, headY - skH * 0.52, f.s * 0.011, 0, Math.PI * 2);
      ctx.fill();
    }
    // Gill seams: three curved cuts on the near cheek, under the eye
    // — front-gated (they live on the head's SIDE, so they read best
    // at the ¾ bands and vanish into the turn honestly).
    if (pk > 0.2) {
      ctx.strokeStyle = shade(sk.hide, -16);
      ctx.lineWidth = Math.max(1, f.s * 0.014);
      for (let g = 0; g < 3; g++) {
        const gx = cxm + lead * (mSpan * 0.72 - g * f.s * 0.028);
        ctx.beginPath();
        ctx.moveTo(gx, mY - skH * 0.16);
        ctx.quadraticCurveTo(gx - lead * f.s * 0.014, mY - skH * 0.02, gx, mY + skH * 0.1);
        ctx.stroke();
      }
    }
  }
  paintSkralCrown(ctx, sk, f, skW, skH);
}

/** The deepking's coral studs — a brow crown worn at every band. */
function paintSkralCrown(
  ctx: CanvasRenderingContext2D,
  sk: SkralLook,
  f: SkralHeadFrame,
  skW: number,
  skH: number,
): void {
  if (!sk.crowned || f.hurt) return;
  ctx.fillStyle = shade(SKRAL_TOOTH, -6);
  const n = f.profileK > 0.62 ? 3 : 4;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n - 0.5;
    const bx = f.headX + t * skW * 1.3 + f.lead * f.hw * 0.2 * f.profileK;
    const by = f.headY - skH * 0.86;
    const r = f.s * (0.02 + 0.008 * (1 - Math.abs(t)));
    ctx.beginPath();
    ctx.moveTo(bx - r, by + r * 0.8);
    ctx.lineTo(bx - r * 0.2, by - r * 1.4);
    ctx.lineTo(bx + r * 0.6, by + r * 0.6);
    ctx.closePath();
    ctx.fill();
  }
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
