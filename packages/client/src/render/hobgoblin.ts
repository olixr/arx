/**
 * THE LEGION DIALECT — the hobgoblin (docs/hobgoblin-plan.md).
 *
 * The eighth humanoid dialect beside bone, scale, fur, greenskin,
 * construct, giant-kin, and brine: the goblin's MASTER race — and it
 * shares not one line of paint with the goblin, because the two
 * species argue opposite things. A goblin is appetite in a loincloth;
 * a hobgoblin is DISCIPLINE nurtured in iron and flame. Everything
 * the greenskin dialect slouches, this one squares: the rig, the
 * carriage, the facing bands, and the IK all keep working untouched,
 * while this module swaps head, hide, habit, hands, and feet
 * wholesale and grows the two things no other body owns — a swept
 * ear-blade pair and a SIMULATED war queue.
 *
 * THE FOUR READS (owned by no other body):
 *   THE WAR MASK  — a broad flat simian face under ONE heavy brow
 *                 ledge: wide flat nose (never the goblin's hook),
 *                 deep-set ember eyes, a stern seam of a mouth with
 *                 the corner fangs standing proud of an underbitten
 *                 jaw. The head is a PROJECTED HULL — every feature a
 *                 station through the fixed camera (the skral law:
 *                 every future head starts here).
 *   THE SWEPT BLADES — tall lance-point ears raked BACK along the
 *                 skull on the ear-physics contract. A goblin's ears
 *                 flare wide to jeer; a hobgoblin's blades sweep back
 *                 like the cheek-lines of a helm — and pin flatter
 *                 through every strike beat: the snarl of a soldier
 *                 who never breaks step.
 *   THE RANKED CROWN — hair is a UNIFORM matter and every rank wears
 *                 its own: the line and the bow keep the swept
 *                 soldier's crop under cap or bare crown, the
 *                 warcaster binds the high knot of the flame-speaker,
 *                 and the officers' crowns are their helms. (The
 *                 first build hung one simulated braid on every rank
 *                 — the user's verdict: a shared appendage HOMOGENIZES
 *                 exactly where variants must argue. Removed whole.)
 *   THE IRON HABIT — the legion wears its wars: a banded iron
 *                 cuirass, a riveted girdle over a studded pteruges
 *                 skirt, greaved marching boots, and the crimson
 *                 sash. THE BANNER IS ONE: skin clusters vary body to
 *                 body, the legion crimson NEVER does — a shoal sorts
 *                 by family, a legion sorts by RANK.
 *
 * Laws honored here:
 * - THE FLAT FORGE LAW: depth is flat value planes, never gradients;
 *   angular lineTo planes, never fat quadratics.
 * - NO FACE FROM BEHIND falls out of the projection: ink draws only
 *   while a station's outward normal faces the camera.
 * - Blends never extrapolate past the ¾ band; the profile treatment
 *   is the hull's own occiput axis (aB > aF — a skull carries mass
 *   behind the eyes).
 * - Hurt flash: fills go '#ffffff', detail passes skip.
 * - Seeded determinism: hide clusters hash the spawn eid; named
 *   bodies are DESIGNS and never roll.
 * - THE ONE REST: both sims' stateless twin is earRestChain — sheets,
 *   portraits, and corpses paint what the game relaxes to.
 * - Shade floor: back-band fills stay above '#30' after their deepest
 *   shade(); dark seams draw as STROKES.
 */
import { chamferRect } from './shapes.js';
import { shade } from './rig.js';
import type { EarCarriage } from './earPhysics.js';

export interface HobgoblinLook {
  /** War-flushed hide — the brick-and-ember skins of the legion. */
  hide: string;
  /** Face ink: pupils, mouth seam, nostril pits, brow shadow. */
  ink: string;
  /** The ember iris — a watch-fire in a deep socket. */
  eye: string;
  /** The queue and the jaw fringe — always dark, never rolled loud. */
  hair: string;
  /** Armor ground: the banded cuirass, helm, greave, and bracer. */
  iron: string;
  /** Rank metal: rivets, rings, buckles — gilt on the officer. */
  trim: string;
  /** THE BANNER IS ONE: the legion crimson. Constant by law. */
  banner: string;
  /** Harness leather: straps, pteruges ground, boot uppers. */
  strap: string;
  /** The warcaster's mantle; undefined = the line ranks' iron. */
  garb?: string;
  /**
   * The painted helm — head furniture, never an equipment item (THE
   * FORGE LAW makes item metal full-face; the legion's open war-helm
   * is authored INTO the head so the face it disciplines stays
   * readable): 'cap' the line skullcap with cheek guards, 'crest'
   * the officer's combed galea, 'horns' the juggernaut's horned
   * crown, 'none' the bare-crowned specialist.
   */
  helm: 'cap' | 'crest' | 'horns' | 'none';
  /** The flame-speaker's bound top-knot on the bare crown. */
  knot?: boolean;
  /** Jaw-span multiplier (a HEAD dial): the warlord out-jaws the line. */
  jaw?: number;
  /** One argument lost: brow-to-cheek seam + a notched ear blade. */
  scarred?: boolean;
  /** The officer's jaw fringe and chin braid. */
  bearded?: boolean;
  /** The back-slung legion standard — the warlord plants the claim. */
  standard?: boolean;
  /** Frame multiplier: jaw, brow, tusk, and habit weights. */
  heavy: number;
  /** Spawn seed carried on the resolved look — per-body wear. */
  seed?: number;
}

/** Worked tooth and tusk bone — one tone for every legion mouth. */
const HOB_TOOTH = '#e8e0c8';

export const HOB_LOOKS: Record<string, HobgoblinLook> = {
  // The legionary: the line rank — brick hide under the banded iron,
  // skullcap helm, service queue, and the crimson sash of the legion.
  hobgoblin: {
    hide: '#b0523a',
    ink: '#241d1a',
    eye: '#e8a43c',
    hair: '#2a2320',
    iron: '#565b63',
    trim: '#767c86',
    banner: '#8e2f2c',
    strap: '#4c3a28',
    helm: 'cap',
    heavy: 1,
  },
  // The longbowman: a lighter kit that trades the skullcap for the
  // strung-back watch — bare crown, banded bracers, the same sash.
  hobgoblin_archer: {
    hide: '#c07038',
    ink: '#241d1a',
    eye: '#e8a43c',
    hair: '#3a2c1e',
    iron: '#4e535a',
    trim: '#6e747e',
    banner: '#8e2f2c',
    strap: '#514028',
    helm: 'none',
    heavy: 0.92,
  },
  // The warcaster: the legion's flame-speaker — ash-worn hide, a
  // soot-dark mantle over the gorget, embers banked bright in the
  // sockets, and the queue worn high. The one rank without a helm
  // by right, not by shortage.
  hobgoblin_warcaster: {
    hide: '#8d6a58',
    ink: '#221c1c',
    eye: '#ffb84a',
    hair: '#322a24',
    iron: '#4a4e56',
    trim: '#8a6a3a',
    banner: '#8e2f2c',
    strap: '#463626',
    garb: '#413a4c',
    helm: 'none',
    knot: true,
    jaw: 0.94,
    heavy: 0.98,
  },
  // THE WARLORD: deep war-red bulk under the crested officer galea,
  // gilt at every ring, the standard planted on its own back, the
  // jaw fringe braided through iron — the one hobgoblin the legion
  // wheels around.
  hobgoblin_champion: {
    hide: '#9e3f30',
    ink: '#201a18',
    eye: '#f0a83a',
    hair: '#282019',
    iron: '#5c626c',
    trim: '#b08a3e',
    banner: '#8e2f2c',
    strap: '#503c26',
    helm: 'crest',
    jaw: 1.1,
    scarred: true,
    bearded: true,
    standard: true,
    heavy: 1.22,
  },
  // THE JUGGERNAUT: the giant of the breed — a horned iron crown on
  // an umber mountain, the heaviest habit the forges ever hung on a
  // walking back. Bred for the breach; the line opens to let it
  // through.
  hobgoblin_juggernaut: {
    hide: '#84462c',
    ink: '#201a16',
    eye: '#e09a34',
    hair: '#2c241d',
    iron: '#51565e',
    trim: '#8f96a2',
    banner: '#8e2f2c',
    strap: '#4a3826',
    helm: 'horns',
    jaw: 1.18,
    bearded: true,
    heavy: 1.5,
  },
};

/**
 * THE HIDE CLUSTERS — four curated skins for the line ranks, picked
 * by hashed spawn seed (the coat-cluster law): war-brick, burnt
 * amber, dark umber, and ash-tan. Each carries its own hair tone —
 * and NOT its own banner: the crimson is the legion's, not the
 * family's (THE BANNER IS ONE — the deliberate inversion of the
 * skral's family banners; a legion sorts by rank). The warcaster,
 * the warlord, and the juggernaut never roll: a ranked hobgoblin is
 * a DESIGN.
 */
const HOB_CLUSTERS: ReadonlyArray<Pick<HobgoblinLook, 'hide' | 'hair'>> = [
  // WIDE by law (the goblin lesson: a same-hue set reads as one coat
  // at world zoom) — a red, a bright orange, a deep chocolate, and a
  // cool ash, all inside the breed's red-orange-to-grey lane.
  { hide: '#b0523a', hair: '#2a2320' }, // war-brick
  { hide: '#c8823c', hair: '#3a2c1e' }, // bright amber
  { hide: '#6e4030', hair: '#46423c' }, // deep umber, iron-grey queue
  { hide: '#93796a', hair: '#322a24' }, // ash-slate
];

const LOOK_CACHE = new Map<string, HobgoblinLook>();

/**
 * Variant lookup with the legionary as the unknown-id fallback. The
 * seed (spawn eid) rolls the line ranks' skin cluster plus a small
 * shade jitter; named looks hold their authored design. Resolved
 * looks are cached — this runs per body per frame.
 */
export function hobgoblinLook(defId: string, seed = 0): HobgoblinLook {
  const base = HOB_LOOKS[defId] ?? HOB_LOOKS['hobgoblin']!;
  const key = `${defId}|${seed & 0xff}`;
  const hit = LOOK_CACHE.get(key);
  if (hit) return hit;
  let look: HobgoblinLook;
  if (defId === 'hobgoblin' || defId === 'hobgoblin_archer') {
    // Hash the seed BEFORE picking: a patrol spawns with consecutive
    // eids, and raw high bits would flush one skin down the whole
    // column (the goblin warband lesson, kept).
    const h = (seed * 2654435761) | 0;
    const cl = HOB_CLUSTERS[(h >>> 8) & 3]!;
    const jit = (((h >>> 12) & 7) - 3) * 2;
    look = { ...base, hide: shade(cl.hide, jit), hair: cl.hair, seed };
  } else {
    look = { ...base, seed };
  }
  LOOK_CACHE.set(key, look);
  return look;
}

// ---------------------------------------------------------------------------
// THE SWEPT BLADES — ear carriage + painter. The sim is EarSim (the
// species-agnostic contract's third species); this module owns what a
// legion ear IS: where it roots, how it rakes, and how it paints.

/**
 * The blade carriage: rooted at the skull's rear quarters and swept
 * BACK-AND-UP — the disciplined silhouette. The goblin wings stand
 * wide off the temples (azimuth 2.0, spread 0.85); these root deeper
 * around the skull and hold a tight lane, so face-on they read as
 * two raked points past the helm's cheeks and at profile as one long
 * blade continuing the crown line. The snarl PINS them flatter still
 * — carriage change through the sim, never a screen trick.
 */
export function hobEarCarriage(heavy: number, pin: number): EarCarriage {
  // PASS-TWO VERDICT (the first build's ears stood near-vertical and
  // curled over the crown — they read as devil horns and buried the
  // helm): an EAR rakes back-and-OUT at temple height — rise well
  // under spread, roots low on the skull's rear corners, a modest
  // hook. The snarl still pins them flatter through the sim.
  return {
    azimuth: 2.55,
    rootR: 0.17,
    rootLift: 0.02,
    length: 0.19 + 0.05 * (heavy - 1),
    spread: 0.78 - 0.16 * pin,
    rise: 0.42 - 0.1 * pin,
    curl: [0, 0.16, 0.34],
  };
}

export interface HobEarStyle {
  skin: string;
  inner: string;
  edge: string;
  ring: string;
}

/** Pre-resolved blade colors off the look (hurt handled by caller). */
export function hobEarStyle(hb: HobgoblinLook, back: boolean): HobEarStyle {
  return {
    skin: shade(hb.hide, back ? -12 : -4),
    // The scoop carries the EAR read — deep enough to separate the
    // hollow from the blade at world zoom (a flat blade is a horn).
    inner: shade(hb.hide, back ? -22 : -20),
    edge: shade(hb.hide, -24),
    ring: hb.trim,
  };
}

/**
 * One lance-blade ear along a sim chain: a narrow angular ribbon —
 * straight planes to a point (THE FLAT FORGE LAW; the goblin's wing
 * is a bowed membrane, this is a knife) — with the inner scoop
 * shadowed on the forward face, one partial edge stroke (never a
 * closed ring under the outline shader), the officer's ring at the
 * root, and the scar ledger's notch bitten from the trailing edge.
 */
export function drawHobEar(
  ctx: CanvasRenderingContext2D,
  pts: ReadonlyArray<{ x: number; y: number }>,
  w0: number,
  st: HobEarStyle,
  opts: { hurt: boolean; back: boolean; notch?: boolean; ringed?: boolean },
): void {
  const n = pts.length;
  if (n < 3) return;
  // Perpendiculars along the spine; the width profile keeps the blade
  // a LANCE — full at the root, tapering straight to the point.
  const wProf = [1, 0.78, 0.42, 0];
  const ea: Array<{ x: number; y: number }> = [];
  const eb: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(n - 1, i + 1)]!;
    let tx = b.x - a.x;
    let ty = b.y - a.y;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const w = w0 * (wProf[i] ?? 0);
    ea.push({ x: pts[i]!.x + ty * w, y: pts[i]!.y - tx * w });
    eb.push({ x: pts[i]!.x - ty * w, y: pts[i]!.y + tx * w });
  }
  const outline = (): void => {
    ctx.beginPath();
    ctx.moveTo(ea[0]!.x, ea[0]!.y);
    for (let i = 1; i < n - 1; i++) ctx.lineTo(ea[i]!.x, ea[i]!.y);
    ctx.lineTo(pts[n - 1]!.x, pts[n - 1]!.y);
    if (opts.notch) {
      // The healed notch: one bite out of the trailing edge.
      const nx = eb[2]!.x * 0.7 + pts[n - 1]!.x * 0.3;
      const ny = eb[2]!.y * 0.7 + pts[n - 1]!.y * 0.3;
      ctx.lineTo(nx, ny);
      ctx.lineTo(nx * 0.6 + pts[2]!.x * 0.4, ny * 0.6 + pts[2]!.y * 0.4);
    }
    for (let i = n - 2; i >= 0; i--) ctx.lineTo(eb[i]!.x, eb[i]!.y);
    ctx.closePath();
  };
  ctx.lineJoin = 'round';
  ctx.fillStyle = opts.hurt ? '#ffffff' : st.skin;
  outline();
  ctx.fill();
  if (opts.hurt) return;
  // The inner scoop: the forward face carries the ear's hollow — a
  // straight-sided wedge inside the blade, skipped on the back bands
  // (an ear's back is one plane).
  if (!opts.back) {
    ctx.fillStyle = st.inner;
    ctx.beginPath();
    ctx.moveTo(
      pts[0]!.x * 0.72 + pts[1]!.x * 0.28,
      pts[0]!.y * 0.72 + pts[1]!.y * 0.28,
    );
    ctx.lineTo(eb[1]!.x * 0.6 + pts[1]!.x * 0.4, eb[1]!.y * 0.6 + pts[1]!.y * 0.4);
    ctx.lineTo(pts[2]!.x, pts[2]!.y);
    ctx.lineTo(ea[1]!.x * 0.55 + pts[1]!.x * 0.45, ea[1]!.y * 0.55 + pts[1]!.y * 0.45);
    ctx.closePath();
    ctx.fill();
  }
  // THE BROKEN INK: one partial stroke down the leading edge to the
  // point — two-thirds and out, never a closed ring.
  ctx.strokeStyle = st.edge;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = Math.max(1, w0 * 0.22);
  ctx.beginPath();
  ctx.moveTo(ea[1]!.x, ea[1]!.y);
  ctx.lineTo(ea[2]!.x, ea[2]!.y);
  ctx.lineTo(pts[n - 1]!.x, pts[n - 1]!.y);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // The officer's ring: one trim hoop through the blade's root third.
  if (opts.ringed) {
    ctx.strokeStyle = st.ring;
    ctx.lineWidth = Math.max(1, w0 * 0.3);
    const rx = pts[0]!.x * 0.45 + pts[1]!.x * 0.55;
    const ry = pts[0]!.y * 0.45 + pts[1]!.y * 0.55;
    ctx.beginPath();
    ctx.moveTo(rx - w0 * 0.75, ry + w0 * 0.2);
    ctx.lineTo(rx + w0 * 0.75, ry - w0 * 0.2);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// THE HEAD.

export interface HobHeadFrame {
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
  /** 0..1 jaw drop — the war-shout; 0 keeps the stern seam set. */
  gape: number;
}

/** Silhouette samples per head — the turn must read smooth. */
const SIL_N = 36;

/**
 * THE HEAD IS A TURNED VOLUME (round three, user-directed root fix).
 * The features were always honest 3D stations — but the silhouette
 * they lived on was still an axis-aligned billboard slab, so through
 * a turn the face slid across a rectangle that never rotated, and at
 * the diagonals the mouth read as hanging off a cheek that wasn't
 * turning with it. The hull is now a real solid: a TWO-LOBE SKULL (domed cranium over a
 * narrower squarer jaw — superellipsoid lobes)
 * (the soldier's rounded block, honestly three-dimensional) with the
 * longer rear axis, and the painted silhouette is its EXACT screen
 * projection — computed by support function through the very same
 * basis every station projects through. One algebra, two guarantees:
 * the outline tips, shifts, and swells with the turn by construction,
 * and every on-hull feature provably lives inside it.
 *
 * Exported whole so the audit sheet's probe overlay and the law tests
 * walk the SAME geometry the painter draws — the vetting procedure,
 * not a parallel approximation.
 */
export function hobHeadHull(
  hw: number,
  hh: number,
  fx: number,
  fy: number,
): {
  aF: number;
  aB: number;
  aL: number;
  aZ: number;
  c1f: { x: number; y: number };
  c1b: { x: number; y: number };
  c2: { x: number; y: number };
  c3: { x: number; y: number };
  /** Station: head frame (F, L, Z) → screen offset + camera depth. */
  st: (F: number, L: number, Z: number) => { x: number; y: number; d: number };
  /** Support point of the projected skull in screen direction (nx,ny). */
  support: (nx: number, ny: number) => { x: number; y: number };
  /** One point of the crown cross-section ring at height Z = zR. */
  ring: (zR: number, t: number) => { x: number; y: number; d: number };
} {
  // THE STYLE-COMPRESSED PITCH: the world camera's honest YK 0.6
  // looks DOWN on a head — projected truly, the crown owns most of
  // the south band and the face shrinks to a chin strip (the probe
  // strip convicted it on frame one). The head projects through a
  // SOFTER pitch coupling instead — the SILHOUETTE HIERARCHY law
  // (pm^0.3's cousin): the outline still tips, travels, and swells
  // with the turn (the fx terms are untouched and the fy coupling
  // survives at 0.4), but the face keeps the read the whole game's
  // style is built on. One constant, INSIDE the hull, so painter,
  // probe, and law tests compress identically.
  const YKH = 0.4;
  const px = -fy;
  const py = fx;
  const aF = hw * 0.96;
  const aB = aF * 1.3;
  const aL = hw * 0.94;
  const aZ = hh * 0.98;
  const c1f = { x: aF * fx, y: aF * fy * YKH };
  const c1b = { x: aB * fx, y: aB * fy * YKH };
  const c2 = { x: aL * px, y: aL * py * YKH };
  const c3 = { x: 0, y: -aZ };
  const st = (F: number, L: number, Z: number): { x: number; y: number; d: number } => {
    const ax = F >= 0 ? aF : aB;
    return {
      x: F * ax * fx + L * aL * px,
      y: (F * ax * fy + L * aL * py) * YKH - Z * aZ,
      d: F * fy + L * py,
    };
  };
  // THE SKULL IS TWO LOBES (the user's cube round, solved as anatomy
  // instead of an exponent: one symmetric superball's front view IS a
  // rounded square — the wrong solid for a head no matter its dial).
  // A domed CRANIUM sits over a narrower, squarer JAW; the silhouette
  // is the convex hull of the pair (support = the lobes' max), which
  // hangs the cheek taper between them for free. Both lobes project
  // through the one shared basis, so the whole skull still tips,
  // travels, and swells with the turn as a single turned volume.
  interface Lobe {
    kF: number;
    kB: number;
    kL: number;
    kZ: number;
    z0: number;
    P: number;
  }
  const CRANIUM: Lobe = { kF: 1.0, kB: 1.0, kL: 1.0, kZ: 0.66, z0: 0.34, P: 3.0 };
  const JAW: Lobe = { kF: 0.88, kB: 0.9, kL: 0.82, kZ: 0.56, z0: -0.44, P: 5.0 };
  const lobeSupport = (lo: Lobe, nx: number, ny: number): { x: number; y: number } => {
    const front = c1f.x * nx + c1f.y * ny >= 0;
    const b1 = front
      ? { x: c1f.x * lo.kF, y: c1f.y * lo.kF }
      : { x: c1b.x * lo.kB, y: c1b.y * lo.kB };
    const b2 = { x: c2.x * lo.kL, y: c2.y * lo.kL };
    const b3 = { x: 0, y: -aZ * lo.kZ };
    const e = 1 / (lo.P - 1);
    const dual = (v: number): number => Math.sign(v) * Math.abs(v) ** e;
    const u1 = dual(b1.x * nx + b1.y * ny);
    const u2 = dual(b2.x * nx + b2.y * ny);
    const u3 = dual(b3.x * nx + b3.y * ny);
    const k =
      1 /
      ((Math.abs(u1) ** lo.P + Math.abs(u2) ** lo.P + Math.abs(u3) ** lo.P) ** (1 / lo.P) ||
        1e-6);
    return {
      x: (b1.x * u1 + b2.x * u2 + b3.x * u3) * k,
      y: -aZ * lo.z0 + (b1.y * u1 + b2.y * u2 + b3.y * u3) * k,
    };
  };
  const support = (nx: number, ny: number): { x: number; y: number } => {
    const a = lobeSupport(CRANIUM, nx, ny);
    const b = lobeSupport(JAW, nx, ny);
    return a.x * nx + a.y * ny >= b.x * nx + b.y * ny ? a : b;
  };
  // Crown sections (helm brim, hairline) live on the cranium lobe.
  const ring = (zR: number, t: number): { x: number; y: number; d: number } => {
    const zl = Math.max(-0.99, Math.min(0.99, (zR - CRANIUM.z0) / CRANIUM.kZ));
    const ct = Math.cos(t);
    const stn = Math.sin(t);
    const rho = Math.pow(
      (1 - Math.abs(zl) ** CRANIUM.P) / (Math.abs(ct) ** CRANIUM.P + Math.abs(stn) ** CRANIUM.P),
      1 / CRANIUM.P,
    );
    const F = rho * ct * (ct >= 0 ? CRANIUM.kF : CRANIUM.kB);
    const L = rho * stn * CRANIUM.kL;
    return st(F, L, zR);
  };
  return { aF, aB, aL, aZ, c1f, c1b, c2, c3, st, support, ring };
}

/**
 * THE PROBE (the standing vetting procedure): when the lab flips this
 * on, every painted head overlays its own silhouette sampling and its
 * load-bearing feature stations — green where the station holds the
 * camera side, hollow red where it has turned away. A head change is
 * audited by LOOKING at the geometry the painter actually ran, at
 * every band of the turn strip, before any judgment call on the art.
 */
export const HOB_HEAD_DEBUG = { on: false };

/**
 * THE WAR MASK IS ONE HULL. The head is a superellipsoid hull with
 * semi-axes (aF fwd, aB aft, aL lat, aZ up) and EVERY feature — the
 * helm and its furniture, the brow ledge, both ember eyes, the flat
 * nose, the mouth arc with its corner fangs, the jaw fringe, the
 * scar — is a STATION `st(F, L, Z)` projected through the fixed
 * bird's-eye camera (YK 0.6). Orientation, foreshortening, which eye
 * shows, where the seam wraps out of sight, and what serrates the
 * skyline from behind all fall out BY CONSTRUCTION (the motion
 * doctrine's law three; the skral head is the precedent and the
 * goblin head is the tuition). Fixture law: everything mounted ON
 * the skull (horns, crest, studs) starts at unit length and its
 * protrusion runs along the projected surface normal — never a
 * screen triangle.
 */
export function paintHobgoblinHead(
  ctx: CanvasRenderingContext2D,
  hb: HobgoblinLook,
  f: HobHeadFrame,
): void {
  const { headX, headY, hw, hh, cut, fx, fy, lead, hurt, nowMs, gape } = f;
  void cut;
  const s = f.s;
  const hv = hb.heavy;
  const jawK = hb.jaw ?? 1;
  const hide = hurt ? '#ffffff' : hb.hide;
  const px = -fy;
  const py = fx;
  const hull = hobHeadHull(hw, hh, fx, fy);
  const { aF, aB, aL, aZ } = hull;
  void aB;
  const st = (F: number, L: number, Z: number): { x: number; y: number; d: number } => {
    const p = hull.st(F, L, Z);
    return { x: headX + p.x, y: headY + p.y, d: p.d };
  };
  /** THE TURNED VOLUME's own outline path, centered on the head. */
  const sil = (): void => {
    ctx.beginPath();
    for (let i = 0; i < SIL_N; i++) {
      const a = (i / SIL_N) * Math.PI * 2;
      const p = hull.support(Math.cos(a), Math.sin(a));
      if (i === 0) ctx.moveTo(headX + p.x, headY + p.y);
      else ctx.lineTo(headX + p.x, headY + p.y);
    }
    ctx.closePath();
  };
  // The skyline the fixtures clamp to: the outline's own zenith.
  const skyY = headY + hull.support(0, -1).y;
  const helmed = hb.helm !== 'none';
  /** A crown cross-section ring (the hull cut at height Z = zR),
   *  projected — the helm brim and the hairline are REAL sections of
   *  the turned volume, so they tip and shift with the head instead
   *  of sitting on a screen-level line. */
  const ringPts = (zR: number): Array<{ x: number; y: number; d: number }> => {
    const pts: Array<{ x: number; y: number; d: number }> = [];
    for (let i = 0; i < 20; i++) {
      const p = hull.ring(zR, (i / 20) * Math.PI * 2);
      pts.push({ x: headX + p.x, y: headY + p.y, d: p.d });
    }
    return pts;
  };
  /** Fill the hull's cap above Z = zR (caller has clipped to sil()):
   *  the half-plane above the ring's own TIPPED chord plus the ring
   *  loop itself — the brim's visible top plane (the 2.5D top-plane
   *  law, spoken on a head). */
  const fillCap = (zR: number, ring: ReadonlyArray<{ x: number; y: number }>): void => {
    const rcy = headY - zR * aZ;
    const l1 = Math.hypot(hull.c1f.x, hull.c1f.y);
    const l2 = Math.hypot(hull.c2.x, hull.c2.y);
    const ax = l1 >= l2 ? hull.c1f : hull.c2;
    const al = Math.hypot(ax.x, ax.y) || 1e-6;
    const axx = ax.x / al;
    const axy = ax.y / al;
    let pxu = axy;
    let pyu = -axx;
    if (pyu > 0) {
      pxu = -pxu;
      pyu = -pyu;
    }
    const L2 = s * 4;
    ctx.beginPath();
    ctx.moveTo(headX - axx * L2, rcy - axy * L2);
    ctx.lineTo(headX + axx * L2, rcy + axy * L2);
    ctx.lineTo(headX + axx * L2 + pxu * L2, rcy + axy * L2 + pyu * L2);
    ctx.lineTo(headX - axx * L2 + pxu * L2, rcy - axy * L2 + pyu * L2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ring.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
  };
  /** Stroke the camera-near arc of a crown ring — the worn edge. */
  const strokeRimNear = (ring: ReadonlyArray<{ x: number; y: number; d: number }>, dy = 0): void => {
    let run: Array<{ x: number; y: number }> = [];
    let best: Array<{ x: number; y: number }> = [];
    for (const p of [...ring, ...ring]) {
      if (p.d > 0.03) {
        run.push(p);
        if (run.length > best.length && run.length <= ring.length) best = run;
      } else run = [];
    }
    if (best.length < 2) return;
    ctx.beginPath();
    best.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y + dy) : ctx.lineTo(p.x, p.y + dy)));
    ctx.stroke();
  };

  // ---- THE HELM FURNITURE, far pass: crest segments and horns whose
  // stations ride the camera-far hemisphere paint BEFORE the hull —
  // from behind, the officer's comb and the juggernaut's horns
  // serrate the crown line honestly (clamped tangent to the skyline:
  // the far-dome-sinks law — the flat slab top never rises with the
  // far side, so an unclamped far station floats).
  type Fix = { x: number; y: number; d: number; nx: number; ny: number; r: number };
  const crest: Fix[] = [];
  const horns: Fix[] = [];
  const normFix = (F: number, L: number, Z: number, r: number): Fix => {
    // Seated on the CRANIUM dome (the crown lobe is near-ellipsoid at
    // its P): normalize in the lobe frame, so crest and horns touch
    // the skin they are riveted to at every band.
    const zl = (Z - 0.34) / 0.66;
    const v = Math.hypot(F, L, zl) || 1;
    const F0 = F / v;
    const L0 = L / v;
    const Z0 = 0.34 + 0.66 * (zl / v);
    const p = st(F0, L0, Z0);
    const q = st(F0 * 1.5, L0 * 1.5, Z0 * 1.5);
    let nx = q.x - p.x;
    let ny = q.y - p.y;
    const nl = Math.hypot(nx, ny);
    if (nl < 1e-3) {
      nx = 0;
      ny = -1;
    } else {
      nx /= nl;
      ny /= nl;
    }
    const short = Math.max(0.4, Math.min(1, nl / (aZ * 0.5)));
    return { x: p.x, y: p.y, d: F0 * fy + L0 * py, nx: nx * short, ny: ny * short, r };
  };
  if (!hurt && hb.helm === 'crest') {
    // The officer's comb: five stations down the sagittal line, brow
    // to nape — the galea's horsehair ridge in the legion crimson.
    for (const F of [0.62, 0.34, 0.02, -0.32, -0.62]) {
      crest.push(normFix(F, 0, 1, s * 0.021));
    }
  }
  if (!hurt && hb.helm === 'horns') {
    // The juggernaut's horns: one swept cone off each temple ridge —
    // BOLD (the breach's whole crown is the pair; timid nubs read as
    // rivets at world zoom).
    for (const side of [-1, 1] as const) {
      horns.push(normFix(0.3, side * 0.72, 0.85, s * 0.042));
    }
  }
  const paintCrestSeg = (u: Fix, i: number, of: Fix[]): void => {
    const by = u.d <= 0 ? Math.max(u.y, skyY - u.r * 0.5) : u.y;
    const len = u.r * (2.2 + 0.6 * Math.sin((i / Math.max(1, of.length - 1)) * Math.PI));
    const wl = Math.hypot(u.nx, u.ny) || 1;
    const bx = (-u.ny / wl) * u.r;
    const bw = (u.nx / wl) * u.r;
    ctx.fillStyle = shade(hb.banner, u.d > 0 ? 0 : -10);
    ctx.beginPath();
    ctx.moveTo(u.x - bx, by - bw);
    ctx.lineTo(u.x + u.nx * len, by + u.ny * len);
    ctx.lineTo(u.x + bx, by + bw);
    ctx.closePath();
    ctx.fill();
  };
  const paintHorn = (u: Fix): void => {
    const by = u.d <= 0 ? Math.max(u.y, skyY - u.r * 0.5) : u.y;
    const len = u.r * 3.5;
    const wl = Math.hypot(u.nx, u.ny) || 1;
    const bx = (-u.ny / wl) * u.r;
    const bw = (u.nx / wl) * u.r;
    ctx.fillStyle = shade(HOB_TOOTH, u.d > 0 ? -6 : -14);
    ctx.beginPath();
    ctx.moveTo(u.x - bx, by - bw);
    // A war-horn curves: the tip kicks a half-width toward the bow.
    ctx.lineTo(u.x + u.nx * len - u.ny * u.r * 0.9, by + u.ny * len + u.nx * u.r * 0.9);
    ctx.lineTo(u.x + bx, by + bw);
    ctx.closePath();
    ctx.fill();
  };
  crest.forEach((u, i) => {
    if (u.d <= 0) paintCrestSeg(u, i, crest);
  });
  for (const u of horns) if (u.d <= 0) paintHorn(u);

  // ---- THE TURNED VOLUME: the silhouette is the hull's exact
  // projection — it tips at the diagonals, swells astern at the
  // profiles (THE OCCIPUT ROUNDS, now by algebra instead of a
  // hand-drawn cap), and every face station below provably lives on
  // it, because outline and stations share one basis.
  ctx.fillStyle = hide;
  sil();
  ctx.fill();
  if (!hurt) {
    // The form split: one screen-fixed light over the whole turned
    // volume — clipped to the true outline.
    ctx.save();
    sil();
    ctx.clip();
    ctx.fillStyle = 'rgba(16, 12, 10, 0.14)';
    ctx.fillRect(headX, headY - aZ * 1.4, aB + aL + s, aZ * 2.8);
    ctx.restore();
  }

  if (!hurt) {
    if (helmed) {
      // ---- THE PAINTED HELM: the open war-helm is head furniture,
      // never an item (THE FORGE LAW would seal the face). The bowl
      // is the hull's own cap above the rim SECTION — a true
      // cross-section ring of the turned volume, so the brim tips
      // and wraps with the head (the billboard rim was a level
      // screen line at every band: the root of the diagonal lie).
      const zRim = 0.5;
      const ring = ringPts(zRim);
      ctx.save();
      sil();
      ctx.clip();
      ctx.fillStyle = shade(hb.iron, hb.helm === 'crest' ? 2 : -2);
      fillCap(zRim, ring);
      // The rim: the ring's camera-near arc in lit trim, and the
      // shadow the brim throws on the brow below it.
      ctx.strokeStyle = shade(hb.hide, -14);
      ctx.lineWidth = Math.max(1, s * 0.016);
      strokeRimNear(ring, s * 0.016);
      ctx.strokeStyle = shade(hb.trim, 4);
      ctx.lineWidth = Math.max(1, s * 0.02);
      strokeRimNear(ring);
      ctx.restore();
      // The nape guard: a flared iron skirt off the occiput — shown
      // only while the occiput genuinely faces the camera (at profile
      // its station floated beside the skull as a detached grey flag:
      // the pass-two verdict — a guard plate is worn, never hovered).
      const nape = st(-0.82, 0, -0.28);
      if (nape.d > 0.3) {
        ctx.fillStyle = shade(hb.iron, -8);
        ctx.beginPath();
        ctx.moveTo(nape.x - hw * 0.34, nape.y - aZ * 0.14);
        ctx.lineTo(nape.x + hw * 0.34, nape.y - aZ * 0.14);
        ctx.lineTo(nape.x + hw * 0.42, nape.y + aZ * 0.18);
        ctx.lineTo(nape.x - hw * 0.42, nape.y + aZ * 0.18);
        ctx.closePath();
        ctx.fill();
      }
      // Cheek guards: one iron flap per side, shown while that cheek
      // holds the camera — hinged at the rim, riveted at the jaw.
      // Big enough to READ: a guard the size of a coin is a smudge.
      for (const side of [-1, 1] as const) {
        const cg = st(0.3, side * 0.8, -0.12);
        if (cg.d < 0.08) continue;
        ctx.fillStyle = shade(hb.iron, side === lead ? 2 : -6);
        ctx.beginPath();
        ctx.moveTo(cg.x - hw * 0.2, cg.y - aZ * 0.36);
        ctx.lineTo(cg.x + hw * 0.2, cg.y - aZ * 0.36);
        ctx.lineTo(cg.x + hw * 0.15, cg.y + aZ * 0.26);
        ctx.lineTo(cg.x - hw * 0.1, cg.y + aZ * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = hb.trim;
        ctx.beginPath();
        ctx.arc(cg.x + hw * 0.02, cg.y + aZ * 0.14, s * 0.012, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // The bare crown: the scalp reads as swept-back hair — the
      // hull's cap above the HAIRLINE section, so the crop turns
      // with the skull it grows from (the uncovered ranks wear the
      // soldier's crop; hair is a uniform matter).
      const zRim = 0.64;
      const ring = ringPts(zRim);
      ctx.save();
      sil();
      ctx.clip();
      ctx.fillStyle = shade(hb.hair, 2);
      fillCap(zRim, ring);
      // The peak: hair dips a point down the brow's center line —
      // hung off the hairline ring's own forward station, so it
      // walks the turn and leaves with the face.
      const pk0 = hull.ring(zRim, 0);
      const pk = { x: headX + pk0.x, y: headY + pk0.y, d: pk0.d };
      if (pk.d > 0.05) {
        ctx.beginPath();
        ctx.moveTo(pk.x - hw * 0.22, pk.y);
        ctx.lineTo(pk.x, pk.y + aZ * 0.18);
        ctx.lineTo(pk.x + hw * 0.22, pk.y);
        ctx.closePath();
        ctx.fill();
      }
      // Temple sweep: two strokes raking toward the crown's rear.
      ctx.strokeStyle = shade(hb.hair, 12);
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (const side of [-1, 1] as const) {
        const t0 = st(0.5, side * 0.5, 0.62);
        const t1 = st(-0.4, side * 0.28, 0.8);
        ctx.beginPath();
        ctx.moveTo(t0.x, t0.y);
        ctx.lineTo(t1.x, t1.y);
        ctx.stroke();
      }
      ctx.restore();
      // THE FLAME-SPEAKER'S KNOT: a bound bun high on the rear crown
      // — a STATION, so it walks the turn and peeks over the skyline
      // from behind like any honest fixture (never a screen sticker).
      if (hb.knot) {
        const kn = st(-0.45, 0, 0.98);
        const kr = s * 0.042;
        const ky = kn.d <= 0 ? Math.max(kn.y, skyY - kr * 0.6) : kn.y;
        ctx.fillStyle = shade(hb.hair, kn.d > 0 ? 4 : -2);
        ctx.beginPath();
        ctx.ellipse(kn.x, ky - kr * 0.4, kr, kr * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = hb.trim;
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(kn.x - kr * 0.8, ky + kr * 0.1);
        ctx.lineTo(kn.x + kr * 0.8, ky + kr * 0.05);
        ctx.stroke();
      }
    }
  }

  // ---- THE FACE. Every feature d-gated by its own station — the
  // mask assembles at the bow, wraps honestly at the quarters, and
  // leaves with the turn. Face-side master gate: the muzzle station.
  const face = st(0.9, 0, 0).d;
  if (!hurt && face > -0.15) {
    // THE BROW LEDGE: one heavy filled shelf across both sockets —
    // the single most hobgoblin line on the head (a goblin's brows
    // are two; a hobgoblin's is ONE bar of disapproval). It knits
    // down with the war-shout.
    const knit = gape * aZ * 0.06;
    // The socket band first: one dark trench the full brow span —
    // both eyes live IN it, so the ledge above reads as mass casting
    // shadow, not a painted stripe (pass-two: the flat face was mud).
    const t0 = st(0.6, -0.58, 0.24);
    const t1 = st(0.6, 0.58, 0.24);
    ctx.fillStyle = shade(hb.hide, -16);
    ctx.beginPath();
    ctx.moveTo(t0.x, t0.y + knit);
    ctx.lineTo(t1.x, t1.y + knit);
    ctx.lineTo(t1.x, t1.y + knit - aZ * 0.18);
    ctx.lineTo(t0.x, t0.y + knit - aZ * 0.18);
    ctx.closePath();
    ctx.fill();
    const b0 = st(0.62, -0.62, 0.36);
    const b1 = st(0.62, 0.62, 0.36);
    const b2 = st(0.72, 0.58, 0.5);
    const b3 = st(0.72, -0.58, 0.5);
    ctx.fillStyle = shade(hb.hide, -22);
    ctx.beginPath();
    ctx.moveTo(b0.x, b0.y + knit);
    ctx.lineTo(b1.x, b1.y + knit);
    ctx.lineTo(b2.x, b2.y + knit);
    ctx.lineTo(b3.x, b3.y + knit);
    ctx.closePath();
    ctx.fill();
    // The ledge's lit top plane — a shelf, never a stroke.
    ctx.fillStyle = shade(hb.hide, 9);
    ctx.beginPath();
    ctx.moveTo(b3.x, b3.y + knit);
    ctx.lineTo(b2.x, b2.y + knit);
    ctx.lineTo(b2.x, b2.y + knit - aZ * 0.06);
    ctx.lineTo(b3.x, b3.y + knit - aZ * 0.06);
    ctx.closePath();
    ctx.fill();

    // THE EMBER EYES: small, deep-set, and lit — watch-fires in the
    // socket trench. The iris is a sphere's window: it narrows as
    // its side turns away. THE THREE-QUARTER KEEPS BOTH EYES (the
    // diagonal round, user screenshot): the old 0.1 gate culled the
    // far eye exactly at the diagonals (its dot sits at ~0.085
    // there), leaving a one-eyed smear that read broken and lost —
    // the far ember now holds until the turn genuinely takes it,
    // foreshortening to a sliver on the way out instead of popping.
    for (const side of [-1, 1] as const) {
      const e = st(0.56, side * 0.4, 0.2);
      const dot = 0.56 * fy + side * 0.44 * py;
      if (dot < 0.02) continue;
      const irisK = 0.3 + 0.7 * Math.min(1, dot * 1.5);
      const er = hw * 0.17;
      ctx.fillStyle = shade(hb.hide, -30);
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + knit * 0.6, er * 1.25 * irisK, er * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hb.eye;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + knit * 0.6, er * 0.72 * irisK, er * 0.64, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hb.ink;
      ctx.beginPath();
      ctx.ellipse(
        e.x + fx * er * 0.16,
        e.y + knit * 0.6 + er * 0.05,
        er * 0.32 * irisK,
        er * 0.34,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    // THE FLAT NOSE: broad, low, and BLUNT — the anti-hook. A bridge
    // plane falls from under the brow to a squared tip; two nostril
    // wings flare wider than the bridge; the underside is one flat
    // shade plane. At profile the whole thing is a short straight
    // STEP off the face — nothing curls, nothing points.
    const nTop = st(0.78, 0, 0.26);
    const nTipL = st(1.0, -0.26, 0);
    const nTipR = st(1.0, 0.26, 0);
    const wingL = st(0.8, -0.46, -0.1);
    const wingR = st(0.8, 0.46, -0.1);
    if (nTop.d > -0.05) {
      // Bridge plane — LIT hard: the flat nose is the face's biggest
      // single feature in the references, and a timid one reads mud
      // (the pass-two verdict).
      ctx.fillStyle = shade(hb.hide, 14);
      ctx.beginPath();
      ctx.moveTo(nTop.x - hw * 0.16, nTop.y);
      ctx.lineTo(nTop.x + hw * 0.16, nTop.y);
      ctx.lineTo(nTipR.x, nTipR.y);
      ctx.lineTo(nTipL.x, nTipL.y);
      ctx.closePath();
      ctx.fill();
      // The wings: nostril flare WIDER than the bridge — each wing
      // gated by ITS OWN station depth, so the far wing tucks behind
      // the bridge through the turn instead of folding across it.
      ctx.fillStyle = shade(hb.hide, 4);
      if (wingL.d > -0.02) {
        ctx.beginPath();
        ctx.moveTo(nTipL.x, nTipL.y);
        ctx.lineTo(wingL.x, wingL.y);
        ctx.lineTo(wingL.x + hw * 0.12, wingL.y + aZ * 0.11);
        ctx.lineTo(nTipL.x + hw * 0.07, nTipL.y + aZ * 0.09);
        ctx.closePath();
        ctx.fill();
      }
      if (wingR.d > -0.02) {
        ctx.beginPath();
        ctx.moveTo(nTipR.x, nTipR.y);
        ctx.lineTo(wingR.x, wingR.y);
        ctx.lineTo(wingR.x - hw * 0.12, wingR.y + aZ * 0.11);
        ctx.lineTo(nTipR.x - hw * 0.07, nTipR.y + aZ * 0.09);
        ctx.closePath();
        ctx.fill();
      }
      // The underside: one dark plane squares the tip.
      ctx.fillStyle = shade(hb.hide, -18);
      ctx.beginPath();
      ctx.moveTo(nTipL.x, nTipL.y + aZ * 0.06);
      ctx.lineTo(nTipR.x, nTipR.y + aZ * 0.06);
      ctx.lineTo(nTipR.x - hw * 0.04, nTipR.y + aZ * 0.14);
      ctx.lineTo(nTipL.x + hw * 0.04, nTipL.y + aZ * 0.14);
      ctx.closePath();
      ctx.fill();
      // Nostril pits — stations that leave with the muzzle.
      ctx.fillStyle = hb.ink;
      for (const side of [-1, 1] as const) {
        const np = st(0.94, side * 0.24, -0.07);
        if (np.d < 0.15) continue;
        ctx.beginPath();
        ctx.ellipse(np.x, np.y, s * 0.016, s * 0.011, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ---- THE MOUTH: a sampled 3D arc — the stern seam. Corners pull
  // toward the cheeks (the egg law, tempered: a soldier's mouth is
  // wide, not a fish's), the seam bows DOWN at the middle (grim, the
  // goblin grins), and the corner fangs stand UP from the underbite
  // at the arc's true ends. The war-shout drops the hinged jaw and
  // bares both courses.
  const N = 13;
  const THMAX = 1.05;
  type MPt = { x: number; y: number; d: number; th: number };
  const seamZ = (th: number): number =>
    -0.42 - 0.06 * (1 - Math.pow(Math.abs(th) / THMAX, 1.4));
  const dropZ = gape * (0.34 + 0.1 * hv) * jawK;
  const jawZ = (th: number): number => seamZ(th) - dropZ * Math.cos(((th / THMAX) * Math.PI) / 2);
  const arcF = (u: number): number => 0.9 - 0.68 * Math.pow(Math.abs(u), 1.6);
  const arcL = (u: number): number => 0.78 * u * (1.35 - 0.35 * u * u);
  const arc = (zOf: (th: number) => number): MPt[] => {
    const pts: MPt[] = [];
    for (let i = 0; i < N; i++) {
      const th = -THMAX + (2 * THMAX * i) / (N - 1);
      const u = th / THMAX;
      const p = st(arcF(u), arcL(u), zOf(th));
      pts.push({ ...p, th });
    }
    return pts;
  };
  // Visibility = the longest CONTIGUOUS camera-side run (corners near
  // the cheek can pass a plain filter from behind at both ends and
  // bridge a seam across the occiput — the skral lesson, kept).
  // THE MOUTH ANCHORS TO ITS OWN CENTER (the diagonal round, user
  // screenshot): a survivor-corner run with the mouth's center gone
  // behind painted an orphan grin fragment floating at the cheek
  // edge on the rear diagonals — no mouth paints at all unless the
  // arc's CENTER holds the camera side. And the run threshold eases
  // to -0.12: at the front diagonals the trailing half of the stern
  // seam holds deeper into the wrap, so the three-quarter face keeps
  // a FULL mouth instead of a stub.
  const visRun = (pts: MPt[]): MPt[] => {
    let best: MPt[] = [];
    let run: MPt[] = [];
    for (const p of pts) {
      if (p.d > -0.12) {
        run.push(p);
        if (run.length > best.length) best = run;
      } else run = [];
    }
    return best;
  };
  const mouthCenterD = 0.9 * fy;
  const seam = mouthCenterD > -0.06 ? visRun(arc(seamZ)) : [];
  const open = gape > 0.1;
  if (!hurt && seam.length >= 3) {
    const jaw = visRun(arc(jawZ));
    const trace = (pts: MPt[], rev = false): void => {
      const list = rev ? [...pts].reverse() : pts;
      for (let i = 0; i < list.length; i++) {
        if (i === 0 && !rev) ctx.moveTo(list[i]!.x, list[i]!.y);
        else ctx.lineTo(list[i]!.x, list[i]!.y);
      }
    };
    if (open && jaw.length >= 3) {
      // The shout-room: seam down to the dropped jaw — filled ink.
      ctx.fillStyle = hb.ink;
      ctx.beginPath();
      trace(seam);
      trace(jaw, true);
      ctx.closePath();
      ctx.fill();
      // Upper course: squared soldier teeth hanging off the seam.
      ctx.fillStyle = HOB_TOOTH;
      for (let i = 1; i < seam.length - 1; i += 2) {
        const p = seam[i]!;
        const wT = Math.min(s * 0.015, Math.abs(seam[i + 1]!.x - seam[i - 1]!.x) * 0.24);
        if (wT < s * 0.007) continue;
        const tl = s * 0.02 * (1 + 0.4 * gape);
        ctx.fillRect(p.x - wT * 0.5, p.y, wT, tl);
      }
      // The dropped chin: the jaw's own pale thickness under the room.
      const jawTh = s * (0.024 + 0.012 * hv) * (0.5 + 0.5 * gape);
      ctx.fillStyle = shade(hb.hide, -4);
      ctx.beginPath();
      trace(jaw);
      for (let i = jaw.length - 1; i >= 0; i--) {
        const k = Math.sin((Math.PI * i) / Math.max(1, jaw.length - 1));
        ctx.lineTo(jaw[i]!.x, jaw[i]!.y + jawTh * (0.5 + 1.4 * k));
      }
      ctx.closePath();
      ctx.fill();
    }
    // THE SEAM: one stern stroke — bowing down mid-face, rising into
    // its corners. Shut, this IS the mouth; open, it is the lip line
    // over the shout. BOLD: the seam is the discipline made visible.
    ctx.strokeStyle = hb.ink;
    ctx.lineWidth = Math.max(1.5, s * (0.026 + 0.009 * hv));
    ctx.lineCap = 'round';
    ctx.beginPath();
    trace(seam);
    ctx.stroke();
    // THE CORNER FANGS: the underbite's pair, standing UP past the
    // seam at the arc's true ends — modest, worked, and always there
    // (a hobgoblin's tusks are sidearms, not the goblin's needles).
    const base = open && jaw.length >= 3 ? jaw : seam;
    for (const [end, sgn] of [
      [base[0]!, -1],
      [base[base.length - 1]!, 1],
    ] as Array<[MPt, number]>) {
      if (end.d < -0.02 || Math.abs(end.th) < THMAX * 0.7) continue;
      const fl = s * (0.032 + 0.012 * hv) * (0.85 + 0.3 * jawK);
      ctx.fillStyle = HOB_TOOTH;
      ctx.beginPath();
      ctx.moveTo(end.x - s * 0.013, end.y + s * 0.008);
      ctx.lineTo(end.x + sgn * s * 0.006, end.y - fl);
      ctx.lineTo(end.x + s * 0.014, end.y + s * 0.008);
      ctx.closePath();
      ctx.fill();
    }
    // The chin: a squared plate under the seam — the jaw that backs
    // the argument. Skipped mid-shout (the drop repaints it).
    if (!open) {
      const ch = st(0.78, 0, -0.66);
      if (ch.d > 0.1) {
        ctx.fillStyle = shade(hb.hide, -9);
        ctx.beginPath();
        chamferRect(ctx, ch.x - hw * 0.2, ch.y - aZ * 0.05, hw * 0.4, aZ * 0.16, s * 0.012);
        ctx.fill();
      }
    }
  }

  // ---- THE JAW FRINGE: the officer's beard — short dark locks along
  // the jawline, chin braid through one trim ring. Stations per lock;
  // each shows only while its side of the jaw holds the camera.
  if (!hurt && hb.bearded) {
    ctx.fillStyle = shade(hb.hair, -2);
    for (const [F, L] of [
      [0.45, -0.7],
      [0.62, -0.45],
      [0.62, 0.45],
      [0.45, 0.7],
    ] as const) {
      const p = st(F, L, -0.62);
      if (p.d < 0.12) continue;
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.014, p.y);
      ctx.lineTo(p.x, p.y + aZ * 0.2);
      ctx.lineTo(p.x + s * 0.014, p.y);
      ctx.closePath();
      ctx.fill();
    }
    const chin = st(0.8, 0, -0.7);
    if (chin.d > 0.1) {
      ctx.fillStyle = shade(hb.hair, -2);
      ctx.beginPath();
      ctx.moveTo(chin.x - s * 0.016, chin.y);
      ctx.lineTo(chin.x, chin.y + aZ * 0.34);
      ctx.lineTo(chin.x + s * 0.016, chin.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = hb.trim;
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(chin.x - s * 0.012, chin.y + aZ * 0.16);
      ctx.lineTo(chin.x + s * 0.012, chin.y + aZ * 0.14);
      ctx.stroke();
    }
  }

  // ---- THE SCAR: one old argument, brow to cheek across the lead
  // socket — worn where the line can read it.
  if (!hurt && hb.scarred) {
    const s0 = st(0.66, lead * 0.3, 0.42);
    const s1 = st(0.7, lead * 0.56, -0.18);
    if (s0.d > 0.12) {
      ctx.strokeStyle = shade(hb.hide, -26);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(s0.x, s0.y);
      ctx.lineTo(s1.x, s1.y);
      ctx.stroke();
    }
  }

  // ---- helm furniture, near pass: comb and horns over everything.
  crest.forEach((u, i) => {
    if (u.d > 0) paintCrestSeg(u, i, crest);
  });
  for (const u of horns) if (u.d > 0) paintHorn(u);

  // ---- the idle discipline: a slow breath lifts the shout-scaled
  // gular nothing — the hobgoblin's idle face is STILL. Deliberate:
  // the stillness against the goblin's constant jeer IS the read.
  void nowMs;

  // ---- THE PROBE: the standing vetting overlay (lab-only). The
  // magenta ring is the very silhouette sampling the painter filled;
  // the dots are the load-bearing stations — green holding the
  // camera side, hollow red turned away. Any feature outside the
  // ring, or any cluster that fails to travel with the ring through
  // the turn strip, is convicted on sight before taste is consulted.
  if (HOB_HEAD_DEBUG.on && !hurt) {
    ctx.save();
    ctx.strokeStyle = 'rgba(235, 80, 225, 0.9)';
    ctx.lineWidth = 1.5;
    sil();
    ctx.stroke();
    const probes: Array<[number, number, number]> = [
      [0.56, -0.4, 0.2],
      [0.56, 0.4, 0.2],
      [1.0, 0, 0],
      [0.9, 0, -0.45],
      [0.22, -0.78, -0.4],
      [0.22, 0.78, -0.4],
      [0.78, 0, -0.66],
    ];
    for (const [F, L, Z] of probes) {
      const p = st(F, L, Z);
      if (p.d > 0) {
        ctx.fillStyle = 'rgba(90, 230, 110, 0.95)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(235, 80, 80, 0.95)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// THE BODY.

export interface HobBodyFrame {
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
 * THE IRON HABIT, two passes ordered by station depth (the skral
 * body law). The `behind` pass paints UNDER the torso garment: the
 * warlord's standard pole lives there always — honestly occluded by
 * the body at the bow, fully revealed as it turns away, continuous
 * in between. The `front` pass carries the pennant's high reach, the
 * cuirass, girdle, sash, and gorget. The standard rides ONE BODY
 * SHOULDER (the left): its screen side comes from the lateral
 * projection (L·px), NEVER from `lead` — the lead sign flips
 * crossing S/N and teleports anything hung on it.
 * The cuirass overpaint is gated by the caller when real armor is
 * worn (armor stays visible: the loot-story law); the pteruges
 * skirt paints ALWAYS (the harness law — this body is never bare).
 */
export function paintHobgoblinBody(
  ctx: CanvasRenderingContext2D,
  hb: HobgoblinLook,
  f: HobBodyFrame,
  armored: boolean,
  layer: 'behind' | 'front' = 'front',
): void {
  const { s, tw, ww, th, fx, fy, backK, lead, hurt } = f;
  const px = -fy;
  const py = fx;
  const back = backK > 0.5;
  // Standard-pole stations (body frame, L = -1 the body's LEFT
  // shoulder; screen side falls out of the projection).
  const latPx = tw * 0.5 + s * 0.22;
  const fwdPx = ww * 0.5;
  const bs = (F: number, L: number, y0: number): { x: number; y: number; d: number } => ({
    x: F * fwdPx * fx + L * latPx * px,
    y: y0 + (F * fwdPx * fy + L * latPx * py) * 0.18,
    d: F * fy + L * py,
  });
  const finial = bs(-0.3, -1, -th - s * 0.5);
  const butt = bs(0.05, -0.8, th * 0.06);

  if (layer === 'behind') {
    if (hb.standard && !hurt) {
      // THE STANDARD'S SHAFT, whole, always — the torso decides what
      // you see of it. Dark ash pole with an iron heel.
      ctx.strokeStyle = shade('#4e4030', -2);
      ctx.lineWidth = Math.max(1.5, s * 0.022);
      ctx.beginPath();
      ctx.moveTo(butt.x, butt.y);
      ctx.lineTo(finial.x, finial.y + s * 0.05);
      ctx.stroke();
      ctx.fillStyle = shade(hb.iron, -8);
      ctx.beginPath();
      ctx.arc(butt.x, butt.y, s * 0.018, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (hb.standard && !hurt) {
    // THE PENNANT: the legion crimson over the shoulder line — a
    // swallow-tailed field on a cross-bar, never occluded by the
    // torso (the head may cover it at the bow: honest depth). It
    // hangs off the pole's own projected station, so it walks the
    // turn with the shaft it belongs to.
    const bar = { x: finial.x, y: finial.y + s * 0.06 };
    ctx.strokeStyle = shade('#4e4030', -6);
    ctx.lineWidth = Math.max(1, s * 0.014);
    ctx.beginPath();
    ctx.moveTo(bar.x - s * 0.085, bar.y);
    ctx.lineTo(bar.x + s * 0.085, bar.y);
    ctx.stroke();
    const drop = s * 0.17;
    const sway = hurt ? 0 : Math.sin(f.nowMs / 780) * s * 0.012;
    ctx.fillStyle = shade(hb.banner, -2);
    ctx.beginPath();
    ctx.moveTo(bar.x - s * 0.08, bar.y + s * 0.008);
    ctx.lineTo(bar.x + s * 0.08, bar.y + s * 0.008);
    ctx.lineTo(bar.x + s * 0.06 + sway, bar.y + drop);
    ctx.lineTo(bar.x + sway * 0.6, bar.y + drop * 0.72);
    ctx.lineTo(bar.x - s * 0.06 + sway, bar.y + drop);
    ctx.closePath();
    ctx.fill();
    // The device: one iron disc — the legion's mark, not a family's.
    ctx.fillStyle = hb.trim;
    ctx.beginPath();
    ctx.arc(bar.x, bar.y + drop * 0.36, s * 0.02, 0, Math.PI * 2);
    ctx.fill();
    // The finial spike over the bar.
    ctx.fillStyle = shade(hb.trim, -4);
    ctx.beginPath();
    ctx.moveTo(finial.x - s * 0.012, bar.y - s * 0.012);
    ctx.lineTo(finial.x, bar.y - s * 0.07);
    ctx.lineTo(finial.x + s * 0.012, bar.y - s * 0.012);
    ctx.closePath();
    ctx.fill();
  }

  // ---- THE PTERUGES: the studded strap skirt off the girdle —
  // painted ALWAYS (the harness law): five leather tongues over the
  // hip line, one stud each, alternating shade so the row reads as
  // separate straps at world zoom.
  const beltY = -th * 0.2;
  if (!hurt) {
    for (let i = 0; i < 5; i++) {
      const u = (i - 2) / 2;
      const sx0 = u * ww * 0.72 + lead * f.profileK * ww * 0.1;
      const sw = ww * 0.3;
      ctx.fillStyle = shade(hb.strap, i % 2 === 0 ? 0 : -8);
      ctx.beginPath();
      ctx.moveTo(sx0 - sw * 0.5, beltY + s * 0.015);
      ctx.lineTo(sx0 + sw * 0.5, beltY + s * 0.015);
      ctx.lineTo(sx0 + sw * 0.36, beltY + th * 0.34);
      ctx.lineTo(sx0 - sw * 0.36, beltY + th * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = hb.trim;
      ctx.beginPath();
      ctx.arc(sx0, beltY + th * 0.26, s * 0.011, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-ww * 0.9, beltY);
    ctx.lineTo(ww * 0.9, beltY);
    ctx.lineTo(ww * 0.7, beltY + th * 0.34);
    ctx.lineTo(-ww * 0.7, beltY + th * 0.34);
    ctx.closePath();
    ctx.fill();
  }

  if (!armored) {
    if (hb.garb) {
      // THE WARCASTER'S MANTLE: the soot-dark field over the chest
      // with an iron gorget at the throat and the shoulder cords —
      // a speaker's habit, still a soldier's fit.
      const cloth = hurt ? '#ffffff' : hb.garb;
      ctx.fillStyle = cloth;
      ctx.beginPath();
      ctx.moveTo(-tw * 1.02, -th * 0.98);
      ctx.lineTo(tw * 1.02, -th * 0.98);
      ctx.lineTo(ww * 0.92, beltY + s * 0.01);
      ctx.lineTo(-ww * 0.92, beltY + s * 0.01);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        // Form split on the mantle — same screen-fixed light.
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, -th);
        ctx.lineTo(tw * 1.05, -th);
        ctx.lineTo(ww * 0.95, beltY + s * 0.01);
        ctx.lineTo(0, beltY + s * 0.01);
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = shade(hb.garb, -10);
        ctx.fillRect(0, -th * 1.05, tw * 1.1, th);
        ctx.restore();
        // Ember stitching: three chevrons down the field — the
        // flame-speaker's ledger, in banked-coal orange.
        ctx.strokeStyle = shade(hb.eye, -14);
        ctx.lineWidth = Math.max(1, s * 0.011);
        for (const t of [0.42, 0.56, 0.7] as const) {
          const y = -th * (1 - t);
          ctx.beginPath();
          ctx.moveTo(-ww * 0.2, y);
          ctx.lineTo(0, y + s * 0.02);
          ctx.lineTo(ww * 0.2, y);
          ctx.stroke();
        }
      }
    } else if (!hurt) {
      // ---- THE BANDED CUIRASS: four lapped iron hoops shoulder to
      // waist — the legion's lorica, flat value planes with the seam
      // strokes doing the lapping and a rivet at each band's end.
      const top = -th * 0.96;
      const bot = beltY - s * 0.005;
      const bands = 4;
      for (let i = 0; i < bands; i++) {
        const t0 = i / bands;
        const t1 = (i + 1) / bands;
        const y0 = top + (bot - top) * t0;
        const y1 = top + (bot - top) * t1;
        const w1 = tw + (ww - tw) * t1;
        const wA = tw + (ww - tw) * t0;
        // Alternating LAPPED values — the banding must read at world
        // zoom or the cuirass collapses into one grey slab.
        ctx.fillStyle = shade(hb.iron, i % 2 === 0 ? 4 : -7);
        ctx.beginPath();
        ctx.moveTo(-wA * 0.98, y0);
        ctx.lineTo(wA * 0.98, y0);
        ctx.lineTo(w1 * 0.98, y1);
        ctx.lineTo(-w1 * 0.98, y1);
        ctx.closePath();
        ctx.fill();
      }
      // Form split: hard shade right of center, clipped to the chest.
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, top);
      ctx.lineTo(tw, top);
      ctx.lineTo(ww, bot);
      ctx.lineTo(0, bot);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = shade(hb.iron, -9);
      ctx.globalAlpha = 0.55;
      ctx.fillRect(0, top - s * 0.02, tw * 1.1, bot - top + s * 0.04);
      ctx.globalAlpha = 1;
      ctx.restore();
      // The lap seams + rivets over the split.
      ctx.strokeStyle = shade(hb.iron, -16);
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (let i = 1; i < bands; i++) {
        const t = i / bands;
        const y = top + (bot - top) * t;
        const w = tw + (ww - tw) * t;
        ctx.beginPath();
        ctx.moveTo(-w * 0.98, y);
        ctx.lineTo(w * 0.98, y);
        ctx.stroke();
        ctx.fillStyle = hb.trim;
        for (const sgn of [-1, 1] as const) {
          ctx.beginPath();
          ctx.arc(sgn * w * 0.84, y - (bot - top) / (bands * 2), s * 0.012, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // THE SHOULDER CAPS: one riveted plate over each arm root — the
      // legion's issue reaches the whole silhouette, not just the
      // chest face ("wears armor better" must read at the corners).
      for (const sgn of [-1, 1] as const) {
        ctx.fillStyle = shade(hb.iron, sgn < 0 ? 6 : -3);
        ctx.beginPath();
        chamferRect(ctx, sgn * tw * 0.98 - tw * 0.24, top - s * 0.015, tw * 0.48, s * 0.075, s * 0.02);
        ctx.fill();
        ctx.fillStyle = shade(hb.iron, sgn < 0 ? 14 : 4);
        ctx.fillRect(sgn * tw * 0.98 - tw * 0.18, top - s * 0.01, tw * 0.36, s * 0.02);
        ctx.fillStyle = hb.trim;
        ctx.beginPath();
        ctx.arc(sgn * tw * 0.98, top + s * 0.028, s * 0.011, 0, Math.PI * 2);
        ctx.fill();
      }
      // THE GORGET: the collar plate at the throat, lit top edge.
      ctx.fillStyle = shade(hb.iron, 6);
      ctx.beginPath();
      chamferRect(ctx, -tw * 0.5, top - s * 0.02, tw, s * 0.045, s * 0.012);
      ctx.fill();
      // THE SASH: the legion crimson, left shoulder to right hip —
      // gone only when the back faces the camera (it crosses the
      // chest, and the back shows the cuirass alone).
      if (!back) {
        ctx.fillStyle = shade(hb.banner, -2);
        ctx.beginPath();
        ctx.moveTo(-tw * 0.72, top + s * 0.01);
        ctx.lineTo(-tw * 0.38, top - s * 0.005);
        ctx.lineTo(ww * 0.7, bot - s * 0.005);
        ctx.lineTo(ww * 0.38, bot + s * 0.012);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(hb.banner, -16);
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        ctx.moveTo(-tw * 0.55, top + s * 0.005);
        ctx.lineTo(ww * 0.54, bot);
        ctx.stroke();
      }
    }
  }

  // ---- THE GIRDLE: the riveted belt that closes the habit — always
  // painted (it holds the pteruges the harness law already hung).
  ctx.fillStyle = hurt ? '#ffffff' : shade(hb.strap, -4);
  ctx.beginPath();
  chamferRect(ctx, -ww * 0.98, beltY - s * 0.026, ww * 1.96, s * 0.052, s * 0.012);
  ctx.fill();
  if (!hurt) {
    ctx.fillStyle = hb.trim;
    ctx.beginPath();
    chamferRect(ctx, -s * 0.03, beltY - s * 0.02, s * 0.06, s * 0.04, s * 0.008);
    ctx.fill();
    ctx.fillStyle = shade(hb.strap, -14);
    ctx.fillRect(-s * 0.008, beltY - s * 0.012, s * 0.016, s * 0.024);
  }
}

// ---------------------------------------------------------------------------
// LIMBS.

/**
 * The hobgoblin arm past the solve: a soldier's arm — hide above the
 * elbow, the banded iron bracer below it (the legion never marches
 * bare-wristed), and a gauntleted fist with a knuckle bar. Called
 * from drawArm the way the golem, ogre, and skral arms are.
 */
export function drawHobgoblinArm(
  ctx: CanvasRenderingContext2D,
  hb: HobgoblinLook,
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
  const hv = 0.92 + 0.18 * hb.heavy;
  ctx.lineCap = 'round';
  // Upper arm: bare hide, a soldier's muscle.
  ctx.strokeStyle = hurt ? '#ffffff' : shade(hb.hide, -4);
  ctx.lineWidth = Math.max(2, s * 0.068 * hv);
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(kx, ky);
  ctx.stroke();
  // Forearm: the bracer — iron over the working arm, a touch wider
  // than the flesh above it (armor sits ON the limb).
  const bracer = hb.garb ? hb.strap : hb.iron;
  ctx.strokeStyle = hurt ? '#ffffff' : shade(bracer, -2);
  ctx.lineWidth = Math.max(2, s * 0.072 * hv);
  ctx.beginPath();
  ctx.moveTo(kx, ky);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  if (!hurt) {
    // The bracer's cuff seam at the elbow end — the strap that
    // cinches it (a band, not a dye line).
    const adx = ex - kx;
    const ady = ey - ky;
    const al = Math.hypot(adx, ady) || 1;
    const cxp = kx + adx * 0.24;
    const cyp = ky + ady * 0.24;
    ctx.strokeStyle = hb.trim;
    ctx.lineWidth = Math.max(1, s * 0.014);
    ctx.beginPath();
    ctx.moveTo(cxp + (ady / al) * s * 0.038, cyp - (adx / al) * s * 0.038);
    ctx.lineTo(cxp - (ady / al) * s * 0.038, cyp + (adx / al) * s * 0.038);
    ctx.stroke();
  }
  // The fist: a gauntlet chip with the knuckle bar.
  const hr = s * 0.055 * hv;
  ctx.fillStyle = hurt ? '#ffffff' : shade(hb.hide, -6);
  ctx.beginPath();
  ctx.arc(ex, ey, hr, 0, Math.PI * 2);
  ctx.fill();
  if (!hurt) {
    ctx.strokeStyle = shade(hb.hide, -18);
    ctx.lineWidth = Math.max(1, hr * 0.3);
    ctx.beginPath();
    ctx.arc(ex, ey - hr * 0.25, hr * 0.62, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

/**
 * THE MARCHING BOOT: the first dialect foot that is FOOTWEAR — an
 * iron-toed hobnailed marcher under a greave cuff. The legion is
 * shod; the goblin's flap and the skral's fan are the barefoot
 * species' arguments, and this is the answer iron gives.
 */
export function paintHobgoblinFoot(
  ctx: CanvasRenderingContext2D,
  hb: HobgoblinLook,
  fxx: number,
  fyy: number,
  s: number,
  fx: number,
  lead: number,
  hurt: boolean,
): void {
  const gv = 0.92 + 0.16 * hb.heavy;
  const toe = fx * 0.03 * s;
  const fw = 0.078 * s * gv;
  const x0 = fxx - fw + Math.min(0, toe);
  const wF = fw * 2 + Math.abs(toe);
  // The boot block.
  ctx.fillStyle = hurt ? '#ffffff' : shade(hb.strap, -6);
  ctx.beginPath();
  chamferRect(ctx, x0, fyy - 0.034 * s, wF, 0.066 * s, 0.02 * s);
  ctx.fill();
  if (hurt) return;
  // THE GREAVE CUFF: the iron shin plate seating the leg in the boot.
  ctx.fillStyle = shade(hb.iron, -2);
  ctx.beginPath();
  chamferRect(ctx, fxx - 0.052 * s * gv, fyy - 0.062 * s, 0.104 * s * gv, 0.036 * s, 0.012 * s);
  ctx.fill();
  ctx.fillStyle = shade(hb.iron, 8);
  ctx.fillRect(fxx - 0.045 * s * gv, fyy - 0.06 * s, 0.09 * s * gv, 0.009 * s);
  // The iron toe cap on the leading edge.
  const capX = lead > 0 ? x0 + wF - 0.034 * s : x0;
  ctx.fillStyle = shade(hb.iron, 4);
  ctx.beginPath();
  chamferRect(ctx, capX, fyy - 0.03 * s, 0.034 * s, 0.058 * s, 0.012 * s);
  ctx.fill();
  // The sole seam + hobnails: the legion's tread.
  ctx.strokeStyle = shade(hb.strap, -18);
  ctx.lineWidth = Math.max(1, 0.01 * s);
  ctx.beginPath();
  ctx.moveTo(x0 + 0.008 * s, fyy + 0.022 * s);
  ctx.lineTo(x0 + wF - 0.008 * s, fyy + 0.022 * s);
  ctx.stroke();
  ctx.fillStyle = shade(hb.trim, -6);
  for (const o of [0.22, 0.5, 0.78] as const) {
    ctx.beginPath();
    ctx.arc(x0 + wF * o, fyy + 0.028 * s, 0.006 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}
