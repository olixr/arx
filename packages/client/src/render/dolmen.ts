/**
 * THE COURSE DIALECT — the Dolmen (docs/contested-lands-plan.md §11,
 * band 9a: THE MARL, art id `dolmen`).
 *
 * The ninth humanoid dialect on the hobgoblin/skral template: the
 * rig, the carriage bands, and the IK all keep working untouched
 * while this module swaps head, hide, hands, feet, and grows the two
 * things no other body owns — THE YOKE and THE PLUMB.
 *
 * THE FOUR READS (owned by no other body):
 *   THE YOKE     — a bony hide-over-bone mantle, 1.30x the human
 *                  shoulder width, a collar that rises BEHIND and
 *                  beside a head smaller than a man's. From behind
 *                  the back plate hides the head to the crown and
 *                  the figure reads headless — the keel line runs
 *                  on 0.05s above the rim so the read is a hood,
 *                  never a decapitation.
 *   THE KEEL AND THE SHELF — a wedge skull: one median keel brow to
 *                  nape over ONE bar of brow shelf, two deep-set pale
 *                  tick eyes with no whites, two slits for a nose,
 *                  no ears, no hair, a lipless seam that never opens:
 *                  THE STONE FACE. The gape clock is accepted and
 *                  refused.
 *   THE SETTING HANDS — 1.5x wide, four thick fingers, pale palms,
 *                  hung forward of the thighs with the palms turned
 *                  BACK and the fingers spread, as if a stone had
 *                  just been let go.
 *   THE PLUMB    — a bone cord with a chalk-white bob hung from the
 *                  yoke's near rim on its own PendantSim slot: swings
 *                  with the walk, hangs dead-true at rest (THE ONE
 *                  REST: the sheet and the card paint pendantRest).
 *
 * Every feature is a STATION projected through the fixed camera
 * (THE SPHERE LAW): the head hull, the yoke ring, the bib corners,
 * the plumb root — one basis each, never a per-band blend. The hide
 * is warm bone with a seeded GREY MOTTLE (a DESIGN: the seed varies
 * layout, never colour). Not an elf, not a goblin, not a human, not
 * a kobold, not a golem, not a dwarf — see section 1 of the brief.
 */
import { chamferRect } from './shapes.js';
import { shade } from './tint.js';
import { pendantRest, type PendantChain } from './ogre.js';
import { bandFlag, type BandMemory } from './wield.js';

export type DolmenStratum = 'marl';

export interface DolmenLook {
  /** The stratum switch every painter branch reads (9b adds three). */
  stratum: DolmenStratum;
  /** Warm bone-white hide — a yellow-grey cast, never blue, never moonpale. */
  hide: string;
  /** The grey mottle: soft limestone patches on the yoke and upper arms. */
  mottle: string;
  /** The yoke plate — one step darker than the hide. */
  yoke: string;
  /** The yoke's lit rim lip. */
  yokeRim: string;
  /** The plain hide bib apron, collar to mid-thigh. */
  bib: string;
  /** The pale tick eye — no white, no iris ring. */
  eye: string;
  /** Face ink: eye pits and the nose slits — front gates only. */
  ink: string;
  /** The pale palm of the setting hand. */
  palm: string;
  /** The chalk-white plumb bob. */
  bob: string;
  /** The bone cord the bob hangs on. */
  cord: string;
  /** Frame multiplier (the Marl is the base, 1). */
  heavy: number;
  /** Spawn seed carried on the resolved look — mottle layout, plumb phase. */
  seed?: number;
}

/**
 * THE LEVEL GAIT dial: the yoke stays level while the legs roll under
 * it. Every other body rides `rise + bob * 0.45`; the Dolmen takes a
 * tenth of the bob (the art lane may land anywhere in [0.05, 0.15]).
 * Read by rig.ts's `walkBobK` at BOTH hip sites — the twin law.
 */
export const DOLMEN_BOB = 0.1;

export const DOLMEN_LOOKS: Record<string, DolmenLook> = {
  // THE MARL: shallow chalk-clay — warm bone hide, grey mottle, the
  // lowest rounded yoke, pale tick eyes, a chalk-white bob.
  dolmen: {
    stratum: 'marl',
    hide: '#d9cfbd',
    mottle: '#a8a49b',
    yoke: '#c9beaa',
    yokeRim: '#e6dfcf',
    bib: '#8a7458',
    eye: '#f0eadb',
    ink: '#2a2521',
    palm: '#ede5d3',
    bob: '#f5f1e8',
    cord: '#c9b995',
    heavy: 1,
  },
};

const LOOK_CACHE = new Map<string, DolmenLook>();

/**
 * Variant lookup with the Marl as the unknown-id fallback. In 9a every
 * `dolmen*` id resolves to THE DESIGN — no cluster roll (the Marl
 * cluster is 9b's). The seed rides the look for mottle layout and the
 * plumb phase only. Cached: this runs per body per frame.
 */
export function dolmenLook(defId: string, seed = 0): DolmenLook {
  const base = DOLMEN_LOOKS[defId] ?? DOLMEN_LOOKS['dolmen']!;
  const key = `${defId}|${seed & 0xff}`;
  const hit = LOOK_CACHE.get(key);
  if (hit) return hit;
  const look: DolmenLook = { ...base, seed };
  LOOK_CACHE.set(key, look);
  return look;
}

// ---------------------------------------------------------------------------
// THE HEAD.

/** Field-for-field the HobHeadFrame — the rig fills one shape for every head. */
export interface DolmenHeadFrame {
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
  /** Accepted and IGNORED: THE STONE FACE never opens. */
  gape: number;
}

/** Silhouette samples per head — the turn must read smooth. */
const SIL_N = 36;

/** The dialect's own proportion ladder (the rig's head rung mirrored). */
const DOLMEN_HEAD_K = 0.9;
const DOLMEN_HEAD_X = 0.1;
const DOLMEN_HEAD_Y = 0.25;

interface Lobe {
  kF: number;
  kB: number;
  kL: number;
  kZ: number;
  z0: number;
  P: number;
}

/** A domed cranium — narrower laterally than the hob's: a wedge. */
const CRANIUM: Lobe = { kF: 1.0, kB: 1.0, kL: 0.9, kZ: 0.66, z0: 0.34, P: 2.6 };
/** A short squared jaw under it — narrower still. */
const JAW: Lobe = { kF: 0.86, kB: 0.9, kL: 0.76, kZ: 0.56, z0: -0.44, P: 4.5 };
/**
 * THE KEEL: a thin tall blade along the sagittal plane — from the bow
 * it peaks the crown (a wedge, not a dome); at the profiles it runs
 * the ridge brow to nape. Part of the hull, so the silhouette peaks
 * by algebra and the keel stroke below provably lives on it.
 */
const KEEL: Lobe = { kF: 0.96, kB: 0.96, kL: 0.2, kZ: 0.9, z0: 0.34, P: 2.0 };
/** The crown's Z in head units: the keel's top station. */
const CROWN_Z = KEEL.z0 + KEEL.kZ;

/**
 * THE HEAD IS A TURNED VOLUME (the hob law, the skral precedent): a
 * three-lobe hull (cranium, jaw, keel) whose painted silhouette is the
 * exact screen projection by support function, through the very same
 * basis every station projects through. Exported whole so the lab's
 * probe overlay and the law tests walk the SAME geometry the painter
 * draws.
 */
export function dolmenHeadHull(
  hw: number,
  hh: number,
  fx: number,
  fy: number,
): {
  aF: number;
  aB: number;
  aL: number;
  aZ: number;
  /** The crown station's Z (the keel top) in head units. */
  crownZ: number;
  c1f: { x: number; y: number };
  c1b: { x: number; y: number };
  c2: { x: number; y: number };
  c3: { x: number; y: number };
  st: (F: number, L: number, Z: number) => { x: number; y: number; d: number };
  support: (nx: number, ny: number) => { x: number; y: number };
  ring: (zR: number, t: number) => { x: number; y: number; d: number };
  /** The keel ridge height at forward station F (head units). */
  keelZ: (F: number) => number;
} {
  // THE STYLE-COMPRESSED PITCH (the hob's constant, inside the hull).
  const YKH = 0.4;
  const px = -fy;
  const py = fx;
  const aF = hw * 0.96;
  const aB = aF * 1.28;
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
  const lobeSupport = (lo: Lobe, nx: number, ny: number): { x: number; y: number } => {
    const front = c1f.x * nx + c1f.y * ny >= 0;
    const b1 = front ? { x: c1f.x * lo.kF, y: c1f.y * lo.kF } : { x: c1b.x * lo.kB, y: c1b.y * lo.kB };
    const b2 = { x: c2.x * lo.kL, y: c2.y * lo.kL };
    const b3 = { x: 0, y: -aZ * lo.kZ };
    const e = 1 / (lo.P - 1);
    const dual = (v: number): number => Math.sign(v) * Math.abs(v) ** e;
    const u1 = dual(b1.x * nx + b1.y * ny);
    const u2 = dual(b2.x * nx + b2.y * ny);
    const u3 = dual(b3.x * nx + b3.y * ny);
    const k = 1 / ((Math.abs(u1) ** lo.P + Math.abs(u2) ** lo.P + Math.abs(u3) ** lo.P) ** (1 / lo.P) || 1e-6);
    return {
      x: (b1.x * u1 + b2.x * u2 + b3.x * u3) * k,
      y: -aZ * lo.z0 + (b1.y * u1 + b2.y * u2 + b3.y * u3) * k,
    };
  };
  const support = (nx: number, ny: number): { x: number; y: number } => {
    let best = lobeSupport(CRANIUM, nx, ny);
    let bestV = best.x * nx + best.y * ny;
    for (const lo of [JAW, KEEL]) {
      const p = lobeSupport(lo, nx, ny);
      const v = p.x * nx + p.y * ny;
      if (v > bestV) {
        best = p;
        bestV = v;
      }
    }
    return best;
  };
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
  const keelZ = (F: number): number => {
    const u = Math.max(-1, Math.min(1, F / KEEL.kF));
    return KEEL.z0 + KEEL.kZ * Math.sqrt(Math.max(0, 1 - u * u));
  };
  return { aF, aB, aL, aZ, crownZ: CROWN_Z, c1f, c1b, c2, c3, st, support, ring, keelZ };
}

/**
 * THE PROBE (the standing vetting procedure): when the lab flips this
 * on, every painted head overlays its own silhouette sampling and its
 * load-bearing stations — green on the camera side, hollow red turned
 * away — plus the yoke ring's rim. Default off.
 */
export const DOLMEN_HEAD_DEBUG = { on: false };

// ---------------------------------------------------------------------------
// THE YOKE — one ring geometry shared by the head painter (the near
// wall, painted OVER the head: the collar the head sits inside) and the
// body painter (the far wall, painted UNDER the torso: the back plate
// behind the head). Both derive it from the same numbers so the two
// halves meet at the silhouette edge by construction.

export interface DolmenYoke {
  cx: number;
  cy: number;
  rf: number;
  rl: number;
  yk: number;
  hBack: number;
  /** Rim height at azimuth theta (0 = throat, ±pi = nape), px, peak included. */
  h: (theta: number) => number;
  /** Rim height without the keel peak. */
  hRim: (theta: number) => number;
  /** Ring station: azimuth + height above the base ring → frame offset + depth. */
  pt: (theta: number, z: number) => { x: number; y: number; d: number };
}

/** The yoke ring from the rig's frame numbers (s, th, fx, fy). */
export function dolmenYoke(s: number, th: number, fx: number, fy: number): DolmenYoke {
  const headR = 0.15 * s * DOLMEN_HEAD_K;
  const hw = headR * 1.04;
  const hh = headR;
  const headX = fx * DOLMEN_HEAD_X * s;
  const headY = -th - headR * DOLMEN_HEAD_Y;
  const px = -fy;
  const py = fx;
  const cx = headX;
  const cy = headY + hh * 0.48;
  const rf = hw * 1.3;
  const rl = hw * 1.72;
  // A flat ring: the collar's lip is near-straight across the jaw, and
  // the plate behind the head stands only a hand over the crown from
  // the bow (the fore-aft pitch is what the hood pays twice).
  const yk = 0.12;
  const hBack = s * 0.315;
  const hRim = (theta: number): number => {
    // THE SLAB, SHOULDER TO SHOULDER: the rim lies at the base from the
    // throat to the sides, then rises past the ears to a BROAD plateau
    // across the whole back — a rounded slab, never a peak (round one's
    // nape-only rise read as a mitre from the bow).
    const u = (1 - Math.cos(theta)) / 2;
    const t = Math.max(0, Math.min(1, (u - 0.5) / 0.36));
    return hBack * t * t * (3 - 2 * t);
  };
  const h = (theta: number): number => {
    // THE HOOD'S KEEL: the skull's ridge line continues over the back
    // plate — a low broad crest at the nape, proud of the rim.
    const t = (Math.PI - Math.abs(theta)) / 0.75;
    const peak = t < 1 ? (1 - t * t) * (1 - t * t) : 0;
    return hRim(theta) + s * 0.035 * peak;
  };
  const pt = (theta: number, z: number): { x: number; y: number; d: number } => {
    const c = Math.cos(theta);
    const sn = Math.sin(theta);
    return {
      x: cx + c * rf * fx + sn * rl * px,
      y: cy + (c * rf * fy + sn * rl * py) * yk - z,
      d: c * fy + sn * py,
    };
  };
  return { cx, cy, rf, rl, yk, hBack, h, hRim, pt };
}

/** The yoke ring from a head frame (th recovered from the head rung). */
function yokeFromHead(f: DolmenHeadFrame): DolmenYoke {
  const th = -(f.headY + f.hh * DOLMEN_HEAD_Y);
  return dolmenYoke(f.s, th, f.fx, f.fy);
}

/**
 * The back plate's top station — the nape rim without the keel peak,
 * for the hood pin: at the north band it sits at or above the crown
 * station of `dolmenHeadHull` by 0.05s, so the head is hidden to the
 * crown and only the keel's peak rides above the rim.
 */
export function dolmenYokeRim(f: DolmenHeadFrame): { x: number; y: number; d: number } {
  const yk = yokeFromHead(f);
  return yk.pt(Math.PI, yk.hRim(Math.PI));
}

/** The plumb's hang station: the near rim, the body's left of the throat. */
const PLUMB_THETA = 0.62;

/** Where the cord roots (frame offset from the hip) and which side it hangs. */
export function dolmenPlumbRoot(
  s: number,
  th: number,
  fx: number,
  fy: number,
): { x: number; y: number; d: number } {
  const yk = dolmenYoke(s, th, fx, fy);
  return yk.pt(PLUMB_THETA, yk.hRim(PLUMB_THETA) + s * 0.012);
}

/** Cord length in px — the tick and the rest chain share it. */
export function dolmenPlumbLen(s: number): number {
  return s * 0.22;
}

/**
 * THE PLUMB KEEPS ITS LAYER: the cord paints before the bib while its
 * root station faces the camera and behind the torso once the rim
 * has turned away. The switch is a facing-law band on the root's
 * depth (the cape contract's hysteresis, spoken for a station: ON at
 * +0.1, OFF at -0.1, holding between), so the eased gaze crossing
 * the seam near NE / SW never pops the cord under and over in one
 * frame. Every cardinal facing lands outside the dead zone (NE and
 * SW sit at |d| = 0.165), so a settled heading resolves exactly as
 * the stateless threshold did. Stateless callers (the sheet, the
 * card) take the plain threshold.
 */
export const PLUMB_FRONT_ON = 0.1;
export const PLUMB_FRONT_OFF = -0.1;
export function dolmenPlumbFront(mem: BandMemory | undefined, rootDepth: number): boolean {
  return bandFlag(mem, 'dolPlumbFront', rootDepth, PLUMB_FRONT_ON, PLUMB_FRONT_OFF);
}

/** Seeded mottle stations on the back plate: (theta, z fraction, radius k). */
function mottleStations(seed: number): Array<{ theta: number; z: number; r: number }> {
  const h = (seed * 2654435761) | 0;
  const n = 3 + ((h >>> 3) & 1) + ((h >>> 9) & 1);
  const out: Array<{ theta: number; z: number; r: number }> = [];
  for (let k = 0; k < n; k++) {
    const a = (h >>> (4 + k * 5)) & 15;
    const b = (h >>> (6 + k * 5)) & 7;
    const c = (h >>> (8 + k * 5)) & 3;
    out.push({
      theta: Math.PI + ((a / 15) * 2 - 1) * 1.15,
      z: 0.3 + (b / 7) * 0.45,
      r: 0.9 + c * 0.12,
    });
  }
  return out;
}

const WALL_N = 40;

/**
 * One wall of the yoke ring: the contiguous arc on the camera side
 * (`near`, the outer face) or turned away (`far`, the inner face seen
 * through the open collar), from the base ring (dropped 0.12s into the
 * mantle so no jaw ever peeks under a hood) up to the rim.
 */
function paintYokeWall(
  ctx: CanvasRenderingContext2D,
  look: DolmenLook,
  yk: DolmenYoke,
  s: number,
  side: 'near' | 'far',
  hurt: boolean,
  seed: number,
): void {
  const pts: Array<{ theta: number; d: number }> = [];
  for (let i = 0; i <= WALL_N; i++) {
    const theta = -Math.PI + (i / WALL_N) * Math.PI * 2;
    pts.push({ theta, d: yk.pt(theta, 0).d });
  }
  // The longest contiguous run on the wanted side, wrapping the seam.
  let best: Array<{ theta: number; d: number }> = [];
  let run: Array<{ theta: number; d: number }> = [];
  const want = (d: number): boolean => (side === 'near' ? d > 0 : d <= 0);
  for (const p of [...pts.slice(0, WALL_N), ...pts.slice(0, WALL_N)]) {
    if (want(p.d)) {
      run.push(p);
      if (run.length > best.length && run.length <= WALL_N) best = run;
    } else run = [];
  }
  if (best.length < 2) return;
  const drop = s * 0.12;
  const rim = best.map((p) => yk.pt(p.theta, yk.h(p.theta)));
  const base = best.map((p) => yk.pt(p.theta, -drop));
  const outer = side === 'near';
  // The inner face sits deep in shadow: the head must read IN FRONT of
  // the plate at the bow (a plate as light as the face reads as a helm).
  ctx.fillStyle = hurt ? '#ffffff' : outer ? look.yoke : shade(look.yoke, -30);
  ctx.beginPath();
  rim.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  for (let i = base.length - 1; i >= 0; i--) ctx.lineTo(base[i]!.x, base[i]!.y);
  ctx.closePath();
  ctx.fill();
  if (hurt) return;
  if (outer) {
    // The form split on the plate: a screen-fixed light from the left.
    ctx.save();
    ctx.beginPath();
    rim.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    for (let i = base.length - 1; i >= 0; i--) ctx.lineTo(base[i]!.x, base[i]!.y);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = 'rgba(16, 12, 10, 0.1)';
    ctx.fillRect(yk.cx, yk.cy - yk.hBack - s * 0.2, yk.rl * 2, yk.hBack + s * 0.5);
    // THE MOTTLE on the back plate: soft grey patches, seed-laid.
    for (const m of mottleStations(seed)) {
      const p = yk.pt(m.theta, yk.hRim(m.theta) * m.z);
      if (p.d <= 0.02) continue;
      const wK = Math.max(0.15, Math.min(1, p.d * 1.6));
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = look.mottle;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, s * 0.042 * m.r * wK, s * 0.03 * m.r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // THE HOOD'S KEEL: when the nape faces the camera the ridge line
    // runs from the peak down the plate — the tell that says hood.
    const nape = yk.pt(Math.PI, 0).d;
    if (nape > 0.25) {
      const top = yk.pt(Math.PI, yk.h(Math.PI));
      const bot = yk.pt(Math.PI, yk.hRim(Math.PI) * 0.15);
      const k = Math.min(1, (nape - 0.25) / 0.4);
      ctx.globalAlpha = k;
      ctx.strokeStyle = shade(look.yoke, -22);
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(bot.x, bot.y);
      ctx.stroke();
      ctx.strokeStyle = look.yokeRim;
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(top.x - s * 0.012, top.y + s * 0.01);
      ctx.lineTo(bot.x - s * 0.012, bot.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  // The rim lip: the plate's worn top edge — lit on the outer face, a
  // quieter catch on the inner (the 2.5D top-plane law, on a collar).
  ctx.strokeStyle = outer ? look.yokeRim : shade(look.yoke, -4);
  ctx.lineWidth = Math.max(1, s * (outer ? 0.02 : 0.012));
  ctx.lineJoin = 'round';
  ctx.beginPath();
  rim.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
}

/**
 * THE KEEL AND THE SHELF on ONE HULL. Every feature — the keel ridge,
 * the brow shelf, both tick eyes, the nose slits, the mouth seam — is
 * a station projected through the fixed camera. Then the yoke's NEAR
 * wall paints OVER the head: the collar the head sits down inside
 * (the low lip at the bow, the side wall at the profiles, the whole
 * hood from behind). THE STONE FACE: nothing here reads the clock or
 * the gape.
 */
export function paintDolmenHead(ctx: CanvasRenderingContext2D, look: DolmenLook, f: DolmenHeadFrame): void {
  const { headX, headY, hw, hh, cut, fx, fy, lead, hurt } = f;
  void cut;
  void lead;
  const s = f.s;
  const hide = hurt ? '#ffffff' : look.hide;
  const px = -fy;
  const py = fx;
  const hull = dolmenHeadHull(hw, hh, fx, fy);
  const { aB, aL, aZ } = hull;
  const st = (F: number, L: number, Z: number): { x: number; y: number; d: number } => {
    const p = hull.st(F, L, Z);
    return { x: headX + p.x, y: headY + p.y, d: p.d };
  };
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

  // ---- THE TURNED VOLUME: the hull's exact projection.
  ctx.fillStyle = hide;
  sil();
  ctx.fill();
  if (!hurt) {
    ctx.save();
    sil();
    ctx.clip();
    ctx.fillStyle = 'rgba(16, 12, 10, 0.12)';
    ctx.fillRect(headX, headY - aZ * 1.6, aB + aL + s, aZ * 3.2);
    ctx.restore();

    // ---- THE KEEL: one median ridge brow to nape on the hull's own
    // top — a lit stroke on the camera side, a shaded stroke on the far
    // side. It is the tell that reads the turn at every heading, the
    // north band included, where the face is gone.
    const sideK = py >= 0 ? 1 : -1;
    const keelRun = (L: number, col: string, w: number): void => {
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(1, s * w);
      ctx.lineCap = 'round';
      ctx.beginPath();
      let first = true;
      for (let i = 0; i <= 12; i++) {
        const F = 0.86 - (i / 12) * 1.74;
        const p = st(F, L, hull.keelZ(F) - 0.02);
        if (first) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
        first = false;
      }
      ctx.stroke();
    };
    keelRun(-sideK * 0.07, shade(look.hide, -20), 0.016);
    keelRun(sideK * 0.06, shade(look.hide, 16), 0.014);
    ctx.lineCap = 'butt';
  }

  // ---- THE FACE. Every feature d-gated by its own station; the
  // master gate is the muzzle station (the hob law).
  const face = st(0.9, 0, 0).d;
  if (!hurt && face > -0.15) {
    // THE BROW SHELF: ONE bar across both sockets, its endpoints each
    // their own station (THE SPHERE LAW), with a lit top plane. The
    // socket trench under it is where the eyes live.
    const t0 = st(0.6, -0.6, 0.22);
    const t1 = st(0.6, 0.6, 0.22);
    ctx.fillStyle = shade(look.hide, -16);
    ctx.beginPath();
    ctx.moveTo(t0.x, t0.y);
    ctx.lineTo(t1.x, t1.y);
    ctx.lineTo(t1.x, t1.y - aZ * 0.16);
    ctx.lineTo(t0.x, t0.y - aZ * 0.16);
    ctx.closePath();
    ctx.fill();
    const b0 = st(0.64, -0.66, 0.34);
    const b1 = st(0.64, 0.66, 0.34);
    const b2 = st(0.74, 0.6, 0.46);
    const b3 = st(0.74, -0.6, 0.46);
    ctx.fillStyle = shade(look.hide, -24);
    ctx.beginPath();
    ctx.moveTo(b0.x, b0.y);
    ctx.lineTo(b1.x, b1.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.lineTo(b3.x, b3.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(look.hide, 12);
    ctx.beginPath();
    ctx.moveTo(b3.x, b3.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.lineTo(b2.x, b2.y - aZ * 0.07);
    ctx.lineTo(b3.x, b3.y - aZ * 0.07);
    ctx.closePath();
    ctx.fill();

    // THE TICK EYES: small, deep-set, pale, no whites. The pit is ink
    // (a socket under the shelf); the tick is a pale sliver that
    // narrows as its side turns away. THE THREE-QUARTER KEEPS BOTH
    // EYES: the far eye holds until the turn genuinely takes it.
    for (const side of [-1, 1] as const) {
      const e = st(0.58, side * 0.4, 0.16);
      const dot = 0.58 * fy + side * 0.44 * py;
      if (dot < 0.02) continue;
      const wK = 0.3 + 0.7 * Math.min(1, dot * 1.5);
      const er = hw * 0.15;
      // The pit: a slot under the shelf, wider than tall — deep-set.
      ctx.fillStyle = look.ink;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, er * 1.0 * wK, er * 0.74, 0, 0, Math.PI * 2);
      ctx.fill();
      // The tick: one pale upright sliver in the pit, no white round it.
      ctx.fillStyle = look.eye;
      ctx.beginPath();
      ctx.ellipse(e.x + fx * er * 0.08, e.y, er * 0.3 * wK, er * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // THE NOSE: two slits, no bridge, no wings — ink stations that
    // leave with the muzzle.
    ctx.fillStyle = look.ink;
    for (const side of [-1, 1] as const) {
      const np = st(0.94, side * 0.13, -0.08);
      if (np.d < 0.15) continue;
      ctx.beginPath();
      ctx.ellipse(np.x, np.y, s * 0.0065, s * 0.016, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- THE MOUTH: one straight lipless seam — a sampled arc that
  // never opens (the gape is refused). Longest camera-side run, and no
  // seam at all unless its center holds the camera side.
  const N = 11;
  const THMAX = 0.9;
  type MPt = { x: number; y: number; d: number };
  const arc = (): MPt[] => {
    const pts: MPt[] = [];
    for (let i = 0; i < N; i++) {
      const th = -THMAX + (2 * THMAX * i) / (N - 1);
      const u = th / THMAX;
      // The corner stations sit lower than the center in head Z so the
      // seam PROJECTS straight at the bow (a level arc on a rounded jaw
      // projects as a bowl — round one's smile) and grim at the quarters.
      pts.push(
        st(0.9 - 0.62 * Math.pow(Math.abs(u), 1.6), 0.7 * u * (1.3 - 0.3 * u * u), -0.22 - 0.24 * Math.pow(Math.abs(u), 1.4)),
      );
    }
    return pts;
  };
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
  const seam = 0.9 * fy > -0.06 ? visRun(arc()) : [];
  if (!hurt && seam.length >= 3) {
    ctx.strokeStyle = look.ink;
    ctx.lineWidth = Math.max(1, s * 0.015);
    ctx.lineCap = 'round';
    ctx.beginPath();
    seam.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  // ---- THE YOKE'S NEAR WALL, over the head: the collar the head sits
  // inside. Painted here because the rig's front pass runs BEFORE the
  // head — the lip must cover the jaw, and the hood must cover the
  // crown, so the wall lives in the head's own layer.
  const yk = yokeFromHead(f);
  paintYokeWall(ctx, look, yk, s, 'near', hurt, look.seed ?? 0);

  // ---- THE PROBE: the standing vetting overlay (lab-only).
  if (DOLMEN_HEAD_DEBUG.on && !hurt) {
    ctx.save();
    ctx.strokeStyle = 'rgba(235, 80, 225, 0.9)';
    ctx.lineWidth = 1.5;
    sil();
    ctx.stroke();
    // The yoke ring's rim, cyan.
    ctx.strokeStyle = 'rgba(80, 220, 235, 0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= WALL_N; i++) {
      const theta = -Math.PI + (i / WALL_N) * Math.PI * 2;
      const p = yk.pt(theta, yk.h(theta));
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    const probes: Array<[number, number, number]> = [
      [0.58, -0.4, 0.16],
      [0.58, 0.4, 0.16],
      [0.94, 0, -0.08],
      [0.9, 0, -0.32],
      [0.86, 0, hull.keelZ(0.86)],
      [0, 0, CROWN_Z],
      [-0.88, 0, hull.keelZ(-0.88)],
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

export interface DolmenBodyFrame {
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
  /** PendantSim chain, or null → THE ONE REST. */
  plumb?: PendantChain | null;
  /**
   * The plumb's layer for THIS frame, latched by the rig through
   * `dolmenPlumbFront` (both passes must agree). Absent: the plain
   * root-depth threshold (the sheet and the card are stateless).
   */
  plumbFront?: boolean;
}

/**
 * THE YOKE AND THE BIB, two passes ordered by station depth. `behind`
 * (under the torso): the yoke's far wall — the back plate seen through
 * the collar from the bow — and the plumb when its root has turned
 * away. `front` (over the torso): the mantle slab across the shoulders,
 * the bib apron, the shoulder mottle, and the plumb when it hangs
 * before the bib. The near wall is the head painter's (it must cover
 * the jaw and the crown, so it lives in the head's layer).
 */
export function paintDolmenBody(
  ctx: CanvasRenderingContext2D,
  look: DolmenLook,
  f: DolmenBodyFrame,
  hurt: boolean,
  layer: 'behind' | 'front' = 'front',
): void {
  const { s, tw, ww, th, fx, fy, lead } = f;
  const px = -fy;
  const py = fx;
  const seed = look.seed ?? 0;
  const yk = dolmenYoke(s, th, fx, fy);
  const root = dolmenPlumbRoot(s, th, fx, fy);
  const plumbFront = f.plumbFront ?? root.d >= 0;

  if (layer === 'behind') {
    paintYokeWall(ctx, look, yk, s, 'far', hurt, seed);
    if (!plumbFront) {
      ctx.save();
      ctx.translate(root.x, root.y);
      drawDolmenPlumb(ctx, f.plumb ?? pendantRest(dolmenPlumbLen(s)), look, s, hurt);
      ctx.restore();
    }
    return;
  }

  // ---- THE MANTLE SLAB: the yoke's shoulder plate — a rounded slab
  // from shoulder to shoulder over the torso top, the widest carriage
  // in the game. Hide over bone: the plate tint one step darker.
  const slabTop = -th - s * 0.04;
  const slabH = s * 0.15;
  const slabW = tw * 1.02 + s * 0.012;
  ctx.fillStyle = hurt ? '#ffffff' : look.yoke;
  ctx.beginPath();
  chamferRect(ctx, -slabW, slabTop, slabW * 2, slabH, s * 0.06);
  ctx.fill();
  if (!hurt) {
    // The lifted-collar read: a lit top edge, a shaded underside.
    ctx.fillStyle = look.yokeRim;
    ctx.beginPath();
    chamferRect(ctx, -slabW * 0.9, slabTop, slabW * 1.8, s * 0.022, s * 0.01);
    ctx.fill();
    ctx.fillStyle = shade(look.yoke, -14);
    ctx.beginPath();
    chamferRect(ctx, -slabW * 0.96, slabTop + slabH - s * 0.028, slabW * 1.92, s * 0.028, s * 0.012);
    ctx.fill();
    // The form split: the far shoulder in shadow.
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, -slabW, slabTop, slabW * 2, slabH, s * 0.06);
    ctx.clip();
    ctx.fillStyle = 'rgba(16, 12, 10, 0.1)';
    ctx.fillRect(0, slabTop - s * 0.02, slabW * 1.2, slabH + s * 0.04);
    ctx.restore();
    // Shoulder mottle: one patch per cap, seed-laid, on the outer
    // shoulder only (the design's grey against the bone).
    const h = (seed * 2654435761) | 0;
    for (const sgn of [-1, 1] as const) {
      const jx = (((h >>> (sgn < 0 ? 20 : 25)) & 7) / 7 - 0.5) * s * 0.05;
      const jy = (((h >>> (sgn < 0 ? 23 : 28)) & 3) / 3 - 0.5) * s * 0.03;
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = look.mottle;
      ctx.beginPath();
      ctx.ellipse(sgn * slabW * 0.72 + jx, slabTop + slabH * 0.55 + jy, s * 0.05, s * 0.032, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // ---- THE BIB: a plain hide apron from the collar to mid-thigh and
  // nothing else worn. A FRONT station (F = +1): its corners project
  // through the body basis, so it foreshortens at the profiles and
  // leaves with the turn at the back bands. At the profile it keeps
  // THE HANGING DEPTH: cloth hangs a hand off the chest, so the strip
  // stays ~0.06s wide from collar to hem (the 9a fix pass: a 0.028s
  // line with the setting hand on it read as a STAFF, the one thing
  // section 1 forbids in the hands). The hem stops at mid-thigh,
  // above the hands (the knee sits ~0.21s under the hip; 0.24 ran the
  // bib to the shin).
  if (fy > -0.12) {
    const k = Math.min(1, (fy + 0.12) / 0.14);
    const bs = (F: number, L: number, y0: number, halfW: number): { x: number; y: number } => ({
      x: F * ww * 0.55 * fx + L * halfW * px + L * s * 0.03 * Math.abs(fx),
      y: y0 + (F * ww * 0.55 * fy + L * halfW * py) * 0.18,
    });
    const topY = slabTop + slabH - s * 0.02;
    const botY = s * 0.13;
    const c0 = bs(1, -1, topY, tw * 0.66);
    const c1 = bs(1, 1, topY, tw * 0.66);
    const c2 = bs(1, 1, botY, ww * 1.15);
    const c3 = bs(1, -1, botY, ww * 1.15);
    ctx.globalAlpha = k;
    ctx.fillStyle = hurt ? '#ffffff' : look.bib;
    ctx.beginPath();
    ctx.moveTo(c0.x, c0.y);
    ctx.lineTo(c1.x, c1.y);
    ctx.lineTo(c2.x, c2.y + s * 0.01);
    ctx.lineTo((c2.x + c3.x) / 2, c2.y + s * 0.03);
    ctx.lineTo(c3.x, c3.y + s * 0.01);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // The apron's shaded half and the two collar ties.
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(c0.x, c0.y);
      ctx.lineTo(c1.x, c1.y);
      ctx.lineTo(c2.x, c2.y + s * 0.01);
      ctx.lineTo(c3.x, c3.y + s * 0.01);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = shade(look.bib, -12);
      ctx.fillRect(0, topY - s * 0.02, ww * 1.4, botY - topY + s * 0.08);
      ctx.restore();
      ctx.strokeStyle = shade(look.bib, -24);
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(c0.x, c0.y);
      ctx.lineTo(c1.x, c1.y);
      ctx.stroke();
      ctx.strokeStyle = look.cord;
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (const c of [c0, c1]) {
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x + (c === c0 ? -1 : 1) * s * 0.02, c.y - s * 0.05);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  void lead;

  // ---- THE PLUMB, hanging before the bib.
  if (plumbFront) {
    ctx.save();
    ctx.translate(root.x, root.y);
    drawDolmenPlumb(ctx, f.plumb ?? pendantRest(dolmenPlumbLen(s)), look, s, hurt);
    ctx.restore();
  }
}

/**
 * THE PLUMB: a bone cord through a PendantChain (the ogre's verlet,
 * THE ONE REST for the sheet) with the chalk-white bob at the tip.
 * The bob is a disc of radius 0.06s so the outline ring never swallows
 * it; the cord lies on the bib. Called at the root (caller translates).
 */
export function drawDolmenPlumb(
  ctx: CanvasRenderingContext2D,
  chain: PendantChain,
  look: DolmenLook,
  s: number,
  hurt: boolean,
): void {
  const tip = chain.pts[chain.pts.length - 1]!;
  const mid = chain.pts[Math.floor(chain.pts.length / 2)]!;
  ctx.strokeStyle = hurt ? '#ffffff' : look.cord;
  ctx.lineWidth = Math.max(1, s * 0.013);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(mid.x, mid.y, tip.x, tip.y);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // The knot at the rim.
  ctx.fillStyle = hurt ? '#ffffff' : shade(look.cord, -18);
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.014, 0, Math.PI * 2);
  ctx.fill();
  // THE BOB: a chalk stone, a little heavier below its waist.
  const br = s * 0.06;
  const bx = tip.x;
  const by = tip.y + br * 0.7;
  ctx.fillStyle = hurt ? '#ffffff' : look.bob;
  ctx.beginPath();
  ctx.ellipse(bx, by, br * 0.92, br, 0, 0, Math.PI * 2);
  ctx.fill();
  if (hurt) return;
  ctx.fillStyle = shade(look.bob, -22);
  ctx.beginPath();
  ctx.ellipse(bx + br * 0.28, by + br * 0.18, br * 0.5, br * 0.66, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(look.bob, -40);
  ctx.beginPath();
  ctx.moveTo(bx - br * 0.55, by + br * 0.55);
  ctx.lineTo(bx, by + br * 1.0);
  ctx.lineTo(bx + br * 0.55, by + br * 0.55);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------------------
// LIMBS.

/**
 * The Dolmen arm past the solve: bare bone-hide above and below the
 * elbow, an upper-arm mottle patch, and THE SETTING HAND — 1.5x the
 * human hand width, four thick fingers spread, the pale palm turned
 * BACK (so it shows when the body faces away: `fy` < 0). Called from
 * drawArm the way the golem, ogre, skral, and hobgoblin arms are.
 */
export function drawDolmenArm(
  ctx: CanvasRenderingContext2D,
  look: DolmenLook,
  sx: number,
  sy: number,
  kx: number,
  ky: number,
  ex: number,
  ey: number,
  s: number,
  hurt: boolean,
  nowMs: number,
  fy = 1,
): void {
  void nowMs;
  const hv = 0.94 + 0.12 * look.heavy;
  ctx.lineCap = 'round';
  ctx.strokeStyle = hurt ? '#ffffff' : shade(look.hide, -5);
  ctx.lineWidth = Math.max(2, s * 0.07 * hv);
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(kx, ky);
  ctx.stroke();
  ctx.strokeStyle = hurt ? '#ffffff' : shade(look.hide, 1);
  ctx.lineWidth = Math.max(2, s * 0.062 * hv);
  ctx.beginPath();
  ctx.moveTo(kx, ky);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  if (!hurt) {
    // The upper-arm mottle: one soft patch a third down the humerus,
    // laid by the seed so no two arms match.
    const h = ((look.seed ?? 0) * 2654435761) | 0;
    const along = 0.3 + ((h >>> 14) & 7) / 7 * 0.3;
    const mx = sx + (kx - sx) * along;
    const my = sy + (ky - sy) * along;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = look.mottle;
    ctx.beginPath();
    ctx.ellipse(mx, my, s * 0.03, s * 0.022, Math.atan2(ky - sy, kx - sx), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // THE SETTING HAND: a broad palm slab with four thick fingers
  // fanned off its lower edge. The palm's pale face shows as the
  // body turns away (palms back); the hide back of the hand at the bow.
  const palmK = Math.max(0, Math.min(1, (-fy + 0.15) / 0.7));
  const hr = s * 0.072 * hv;
  const adx = ex - kx;
  const ady = ey - ky;
  const al = Math.hypot(adx, ady) || 1;
  const ux = adx / al;
  const uy = ady / al;
  const back = hurt ? '#ffffff' : shade(look.hide, -8);
  const palm = hurt ? '#ffffff' : look.palm;
  ctx.fillStyle = back;
  ctx.beginPath();
  ctx.ellipse(ex, ey, hr * 0.95, hr * 0.8, Math.atan2(uy, ux), 0, Math.PI * 2);
  ctx.fill();
  if (!hurt && palmK > 0.02) {
    ctx.globalAlpha = palmK;
    ctx.fillStyle = palm;
    ctx.beginPath();
    ctx.ellipse(ex, ey, hr * 0.78, hr * 0.62, Math.atan2(uy, ux), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Four thick fingers, spread: fanned about the forearm direction.
  ctx.strokeStyle = hurt ? '#ffffff' : shade(look.hide, palmK > 0.5 ? 2 : -10);
  ctx.lineWidth = Math.max(1.5, s * 0.026 * hv);
  const fl = hr * 1.05;
  for (let i = 0; i < 4; i++) {
    const a = Math.atan2(uy, ux) + ((i - 1.5) / 1.5) * 0.42;
    const bx = ex + ux * hr * 0.35;
    const by = ey + uy * hr * 0.35;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(a) * fl, by + Math.sin(a) * fl);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

/**
 * THE SLAB FOOT: flat, bare, broad — 1.35x the goblin flap, splayed,
 * so the foot line reads wider than the narrow hips. Three toe seams
 * off the leading edge; no boot was ever the shape.
 */
export function paintDolmenFoot(
  ctx: CanvasRenderingContext2D,
  look: DolmenLook,
  fxx: number,
  fyy: number,
  s: number,
  fx: number,
  lead: number,
  hurt: boolean,
): void {
  const gv = 0.94 + 0.12 * look.heavy;
  const toe = fx * 0.04 * s;
  const fw = 0.115 * s * gv;
  const x0 = fxx - fw + Math.min(0, toe);
  const wF = fw * 2 + Math.abs(toe);
  ctx.fillStyle = hurt ? '#ffffff' : shade(look.hide, -7);
  ctx.beginPath();
  chamferRect(ctx, x0, fyy - 0.026 * s, wF, 0.056 * s, 0.018 * s);
  ctx.fill();
  if (hurt) return;
  // The instep: a lit top plane over the slab.
  ctx.fillStyle = shade(look.hide, 4);
  ctx.beginPath();
  chamferRect(ctx, x0 + 0.01 * s, fyy - 0.024 * s, wF - 0.02 * s, 0.02 * s, 0.008 * s);
  ctx.fill();
  // The ankle seat.
  ctx.fillStyle = shade(look.hide, -12);
  ctx.beginPath();
  ctx.arc(fxx, fyy - 0.02 * s, 0.03 * s, 0, Math.PI * 2);
  ctx.fill();
  // Toe seams on the leading edge — strokes, never ink fills.
  const edge = lead > 0 ? x0 + wF : x0;
  ctx.strokeStyle = shade(look.hide, -20);
  ctx.lineWidth = Math.max(1, 0.01 * s);
  for (const o of [-0.012, 0.002, 0.016] as const) {
    ctx.beginPath();
    ctx.moveTo(edge - lead * 0.032 * s, fyy + o * s);
    ctx.lineTo(edge - lead * 0.004 * s, fyy + o * s);
    ctx.stroke();
  }
}
