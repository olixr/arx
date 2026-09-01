/**
 * THE SHELL THAT WALKS — turtle and the colossus.
 * Split out of rig.ts on the golems.ts template (foundations F3.4);
 * rig.ts re-exports everything here, so every lab, test and painter
 * keeps its old door.
 */
import { facetBlob, facetCircle } from './shapes.js';
import { shade } from './tint.js';
// The engine's shared grammar comes back from rig.ts — the same
// deferred cycle golems.ts has always ridden (touched only at draw
// time, long after both modules initialize).
import { MESH_COLS, MESH_COL_K, MESH_COL_RANK, SNAPPER_BANDS, SNAPPER_BAND_K, paintBlockBody } from './rigKit.js';
import type { BeastBlockFrame, BeastSpec } from './rig.js';

export const TURTLE_CLAW_FAN = [-0.55, 0, 0.55] as const;
/**
 * THE SHELL WALKS — the giant turtles. Four reads owned by no other
 * body: THE KEEP (a scute-mailed dome with a serrated rim — the
 * whole silhouette is the shell), THE HOOK (a beaked shear on a neck
 * that fires like a sprung trap while the feet stay planted), THE
 * COLUMNS (pillar legs splayed from under the rim on the widest
 * track in the wood), and THE MAIL (every scute an individually lit
 * pyramid seated on the dome's curve — armor built plate by plate,
 * never a painted grid).
 *
 * TWO BODIES, TWO SPECIES (this is the law of the pair): the giant
 * turtle is THE SNAPPER — a low, long, jagged vault dragging its rim
 * near the ground on a sprawled track, blade-keeled like the old
 * bestiary plates; the colossus is THE MOUNTAIN — a high tortoise
 * dome on true elephant columns with daylight under the keep, moss
 * on its crown plates and a head like a stone outcrop. They must
 * never read as one silhouette at two zooms.
 */
export interface TurtleLook {
  /** Crown plates — the mail's base tone; facets derive from it. */
  shell: string;
  /** The marginal band riding the shell's lower edge. */
  rim: string;
  /** Keel blades and rim saw-teeth. */
  spike: string;
  /** Hide: neck, legs, tail. */
  skin: string;
  /** Pale throat and lower jaw. */
  throat: string;
  beak: string;
  eye: string;
  /** The colossus wears the years: moss caps on the crown plates. */
  moss?: string;
  /** Shell half-width (tiles); length comes from the BeastSpec. */
  bodyW: number;
  /** Dome height at the peak. */
  shellH: number;
  /** Keel blade height above the crown at the tallest station. */
  spikeH: number;
  headW: number;
  headH: number;
  /** Head carry height above ground (the rim line). */
  headRise: number;
  /** Daylight under the keep: the rim's height off the ground. */
  rimBot: number;
  /** Heavier brow, barbels, moss, crown plate — the ancient read. */
  ancient?: boolean;
}
export const TURTLE_LOOK: TurtleLook = {
  shell: '#4a5238',
  rim: '#6e7449',
  // The horn is its own material — raised olive bone, never the
  // shell's tone (a thorn the shell's color reads as a bump, not
  // grown armor).
  spike: '#6f6d49',
  skin: '#7a8455',
  throat: '#cdc7a3',
  beak: '#a89d72',
  eye: '#d29b3f',
  bodyW: 0.44,
  shellH: 0.3,
  spikeH: 0.22,
  headW: 0.27,
  headH: 0.19,
  headRise: 0.22,
  rimBot: 0.08,
};
export const COLOSSUS_LOOK: TurtleLook = {
  shell: '#555c49',
  rim: '#7b775c',
  // Weathered stone-horn — the mountain's studs, a step above the
  // vault they crown but carved by their own shadow.
  spike: '#746e58',
  skin: '#6d7462',
  throat: '#c3bd9d',
  beak: '#a8a184',
  eye: '#d0b26a',
  moss: '#5d7442',
  bodyW: 0.62,
  shellH: 0.6,
  spikeH: 0.34,
  headW: 0.38,
  headH: 0.26,
  headRise: 0.34,
  rimBot: 0.18,
  ancient: true,
};
export const COLOSSUS_BANDS: readonly number[] = [-0.86, -0.56, -0.26, 0.06, 0.38, 0.68, 0.95];
export const COLOSSUS_BAND_K: readonly number[] = [0.5, 0.82, 1, 0.95, 0.75, 0.5];
export function paintTurtleBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: TurtleLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  const { bx, gy, s, fx, fy, ys } = f;
  const px = -fy;
  const py = fx;
  const shell = shade(look.shell, (((f.seed >>> 5) & 7) - 3) * 2);
  const lift = f.bob * 0.35 * s;
  const tk = f.topScale ?? 1;
  // THE DOME IS THE SPECIES: the snapper's vault is LOW and long
  // (peak shoved aft, steep bow falloff); the mountain's dome is
  // HIGH and central — the two silhouettes must never rhyme.
  const domeC = look.ancient ? -hl * 0.02 : -hl * 0.1;
  const fall = look.ancient ? 0.36 : 0.52;
  const topH = (X: number): number =>
    Math.max(0.05, look.shellH * (1 - fall * Math.pow((X - domeC) / hl, 2)));
  const P3 = (X: number, Y: number, Z: number): { x: number; y: number } => ({
    x: bx + (fx * X + px * Y) * s,
    y: gy + (fy * X + py * Y) * ys * s - Z * tk * s - lift,
  });

  // THE BODY UNDER THE KEEP: a skin mass filling the rim's shadow so
  // legs and neck root into flesh instead of poking from an empty
  // shelf (the hollow-crate cheat, retired). THE BELLY TUCKS LIKE A
  // LION'S: the mass is a GROUND-frame lens — its screen width
  // follows the facing between the two half-dims, its depth squashes
  // with ys, and its ground LINE is authored bottom-up with real
  // clearance (daylight under the mountain, the snapper's keel a
  // finger off the dirt). The old body-rotated blob projected the
  // hull's full lateral width as belly DEPTH at profile — a bloated
  // sack scraping the ground.
  const ax = Math.abs(fx);
  const ay = Math.abs(fy);
  const brx = (hl * 0.76 * ax + hw * 0.82 * ay) * s;
  const bry = (hw * 0.34 * ax + hl * 0.3 * ay) * ys * s;
  const bellyClear = (look.ancient ? 0.06 : 0.02) * s;
  ctx.fillStyle = f.hurt ? '#ffffff' : shade(look.skin, -20);
  ctx.save();
  ctx.translate(bx, gy - bellyClear - lift * 0.6 - bry);
  ctx.beginPath();
  facetBlob(ctx, 0, 0, brx, f.seed | 5, 8, bry / brx, 0.5);
  ctx.fill();
  ctx.restore();

  // Footprints fork with the species: the snapper's rim is long and
  // slightly angular (a jagged skirt wants corners to hang teeth
  // on); the mountain's is round-shouldered.
  const foot: Array<[number, number]> = look.ancient
    ? [
        [hl * 0.95, -hw * 0.36],
        [hl * 0.95, hw * 0.36],
        [hl * 0.72, hw * 0.74],
        [hl * 0.34, hw * 0.95],
        [-hl * 0.4, hw],
        [-hl * 0.76, hw * 0.72],
        [-hl * 0.9, hw * 0.34],
        [-hl * 0.9, -hw * 0.34],
        [-hl * 0.76, -hw * 0.72],
        [-hl * 0.4, -hw],
        [hl * 0.34, -hw * 0.95],
        [hl * 0.72, -hw * 0.74],
      ]
    : [
        [hl * 1.0, -hw * 0.42],
        [hl * 1.0, hw * 0.42],
        [hl * 0.72, hw * 0.8],
        [hl * 0.3, hw * 0.98],
        [-hl * 0.34, hw],
        [-hl * 0.72, hw * 0.76],
        [-hl * 0.94, hw * 0.4],
        [-hl * 0.94, -hw * 0.4],
        [-hl * 0.72, -hw * 0.76],
        [-hl * 0.34, -hw],
        [hl * 0.3, -hw * 0.98],
        [hl * 0.72, -hw * 0.8],
      ];

  // THE THORNED SKIRT: the marginal rim wears true horn all the way
  // around — every foot edge hangs a two-facet thorn pointing
  // outward in the BODY frame (projected, so the hem rotates and
  // foreshortens with the hull). Far thorns paint UNDER the keep so
  // the dome occludes their roots while the tips still break the
  // skyline at the back bands; near thorns paint over the flank —
  // a full 360° hem, never a near-side decal.
  const cyd = gy - lift;
  const skirtLen = (look.ancient ? 0.14 : 0.17) * hl;
  const rootZ = look.rimBot + (look.ancient ? 0.1 : 0.05);
  type SkirtThorn = {
    a: { x: number; y: number };
    b: { x: number; y: number };
    m: { x: number; y: number };
    t: { x: number; y: number };
    near: boolean;
  };
  const skirt: SkirtThorn[] = [];
  for (let i = 0; i < foot.length; i++) {
    const a = foot[i]!;
    const b = foot[(i + 1) % foot.length]!;
    const jb = (f.seed ^ (i * 0x85ebca6b)) >>> 0;
    const jl = 0.78 + ((jb >>> 3) & 15) * 0.035; // a jagged hem, never a comb
    const mX = (a[0] + b[0]) / 2;
    const mY = (a[1] + b[1]) / 2;
    const el = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-4;
    const ex2 = (b[0] - a[0]) / el;
    const ey2 = (b[1] - a[1]) / el;
    let nx = ey2;
    let ny2 = -ex2;
    if (nx * mX + ny2 * mY < 0) {
      nx = -nx;
      ny2 = -ny2;
    }
    const bw = Math.min(el * 0.3, hl * 0.09);
    const A2 = P3(mX - ex2 * bw, mY - ey2 * bw, rootZ);
    const B2 = P3(mX + ex2 * bw, mY + ey2 * bw, rootZ);
    const T2 = P3(mX + nx * skirtLen * jl, mY + ny2 * skirtLen * jl, rootZ - 0.035);
    const M2 = P3(mX, mY, rootZ + 0.02);
    skirt.push({ a: A2, b: B2, m: M2, t: T2, near: M2.y > cyd - 0.02 * s });
  }
  const hornRim = shade(look.rim, -4);
  const paintSkirtThorn = (th: SkirtThorn): void => {
    // Two facets split along the thorn's axis, lit by true screen
    // orientation — the same light every dome thorn answers to.
    const halves: Array<[{ x: number; y: number }, { x: number; y: number }]> = [
      [th.a, th.t],
      [th.t, th.b],
    ];
    for (const [c0, c1] of halves) {
      const midY2 = (c0.y + c1.y) / 2;
      const dn2 = Math.hypot((c0.x + c1.x) / 2 - th.m.x, midY2 - th.m.y) || 1e-4;
      const nyF = (midY2 - th.m.y) / dn2;
      ctx.fillStyle = f.hurt ? '#ffffff' : shade(hornRim, Math.round(-nyF * 24) + 4);
      ctx.beginPath();
      ctx.moveTo(th.m.x, th.m.y);
      ctx.lineTo(c0.x, c0.y);
      ctx.lineTo(c1.x, c1.y);
      ctx.closePath();
      ctx.fill();
    }
    // The hem takes THE BROKEN INK too — the down-screen edge only,
    // tip toward base, so each skirt horn breaks from the flank it
    // rides without ringing the hem into a chain.
    if (!f.hurt) {
      const low = th.a.y >= th.b.y ? th.a : th.b;
      ctx.strokeStyle = '#241a2e';
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(th.t.x, th.t.y);
      ctx.lineTo(th.t.x + (low.x - th.t.x) * 0.62, th.t.y + (low.y - th.t.y) * 0.62);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineCap = 'butt';
    }
  };
  for (const th of skirt) if (!th.near) paintSkirtThorn(th);

  // THE SPIKE IS THE PLATE: one shared lattice serves plate and horn
  // alike. The vertex grid lives in the BODY frame on the dome's
  // true surface — jitter is seeded ON the vertex so neighboring
  // plates always meet edge-to-edge, column widths ride the hull's
  // own foot polygon band by band, and the center column remaps onto
  // the crown line (the same slide the old vertebral saw rode) so
  // the ridge stays dead-center face-on and on the skyline at
  // profile. Every projection — plate fill, horn base, horn tip —
  // derives from this one grid, so the mail agrees with itself at
  // all eight bands by construction.
  const xs = look.ancient ? COLOSSUS_BANDS : SNAPPER_BANDS;
  const bandK = look.ancient ? COLOSSUS_BAND_K : SNAPPER_BAND_K;
  const ridgeY = -py * hw * 0.66;
  const port = foot.filter((p) => p[1] < 0).sort((p1, p2) => p1[0] - p2[0]);
  const wAt = (X: number): number => {
    if (X <= port[0]![0]) return -port[0]![1];
    for (let i2 = 1; i2 < port.length; i2++) {
      const p1 = port[i2 - 1]!;
      const p2 = port[i2]!;
      if (X <= p2[0]) {
        const t2 = (X - p1[0]) / (p2[0] - p1[0] || 1e-4);
        return -(p1[1] + (p2[1] - p1[1]) * t2);
      }
    }
    return -port[port.length - 1]![1];
  };
  // One projector for the whole lattice (P3 plus the top face's roll
  // term, so plates sit exactly on the painted vault).
  const pv = (X: number, Y: number, z: number): { x: number; y: number } => ({
    x: bx + (fx * X + px * Y) * s,
    y: gy + (fy * X + py * Y) * ys * s - z * tk * s - lift + Y * s * f.roll * 0.4,
  });
  type MeshV = { X: number; Y: number; z: number; x: number; y: number };
  const grid: MeshV[][] = [];
  for (let i2 = 0; i2 < xs.length; i2++) {
    const row: MeshV[] = [];
    for (let j2 = 0; j2 < MESH_COLS.length; j2++) {
      const jb2 = (f.seed ^ ((i2 * 7 + j2) * 0x45d9f3b)) >>> 0;
      const X = (xs[i2]! + (((jb2 >>> 3) & 7) - 3.5) * 0.008) * hl;
      const wX = wAt(X) * 0.985;
      const edge = Math.abs(MESH_COLS[j2]!) > 0.9;
      const jy2 = (((jb2 >>> 7) & 7) - 3.5) * (edge ? 0.004 : 0.012);
      const cfr = MESH_COLS[j2]! + jy2;
      const Yv = cfr * wX + ridgeY * (1 - cfr * cfr);
      const z2 = topH(X) * (1 - 0.3 * Math.pow((cfr * wX) / hw, 2));
      const sp = pv(X, Yv, z2);
      row.push({ X, Y: Yv, z: z2, x: sp.x, y: sp.y });
    }
    grid.push(row);
  }
  // Cost containment: the whole lattice — vertices, plates, horns —
  // is ONE O(cells) pass with no Path2D and no per-frame caches to
  // invalidate, and in the world it paints through the body-sprite
  // cache: an idle shell re-bakes on the OL_IDLE_CADENCE stagger,
  // not per frame.

  paintBlockBody(
    ctx,
    f,
    foot,
    topH,
    () => look.rimBot,
    shell,
    (gx, gyy, lift2) => {
      // THE MAIL HAS NO GAPS: the SHARED lattice paints its plates
      // here, inside the hull clip (the crab's fixture law) — full
      // at the quarters and the profiles, not just N/S. The horns
      // grown from these same cells paint after, unclipped, so
      // their tips break the silhouette while their bases can
      // never leave it.
      ctx.lineWidth = Math.max(1, s * 0.014);
      for (let i2 = 0; i2 < grid.length - 1; i2++) {
        for (let j2 = 0; j2 < MESH_COLS.length - 1; j2++) {
          const jb2 = (f.seed ^ ((i2 * 5 + j2) * 0x9e3779b9)) >>> 0;
          // Plates sit a step brighter than the vault (the law),
          // brightest on the crown column — the global top-face
          // wash and flank shade re-model the dome OVER the mesh.
          const mid2 = Math.abs(MESH_COLS[j2]! + MESH_COLS[j2 + 1]!) / 2;
          const step = mid2 < 0.15 ? 7 : mid2 < 0.5 ? 4 : 2;
          ctx.fillStyle = shade(shell, step + (((jb2 >>> 5) & 7) - 3.5));
          ctx.beginPath();
          ctx.moveTo(grid[i2]![j2]!.x, grid[i2]![j2]!.y);
          ctx.lineTo(grid[i2 + 1]![j2]!.x, grid[i2 + 1]![j2]!.y);
          ctx.lineTo(grid[i2 + 1]![j2 + 1]!.x, grid[i2 + 1]![j2 + 1]!.y);
          ctx.lineTo(grid[i2]![j2 + 1]!.x, grid[i2]![j2 + 1]!.y);
          ctx.closePath();
          ctx.fill();
          // The seams ARE the mesh read — quiet ink, never a grid.
          ctx.strokeStyle = 'rgba(26, 20, 36, 0.28)';
          ctx.stroke();
        }
      }
      // The marginal band: lighter rim scutes hugging the skirt.
      ctx.save();
      ctx.translate(gx(domeC, 0), gyy(domeC, 0) - look.shellH * tk * s * 0.8 - lift2);
      ctx.rotate(Math.atan2(fy * ys, fx));
      ctx.strokeStyle = look.rim;
      ctx.lineWidth = Math.max(1.5, s * 0.045);
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(hl * 0.92 * s, -hw * 0.5 * s);
      ctx.quadraticCurveTo(hl * 0.18 * s, -hw * 0.98 * s, -hl * 0.62 * s, -hw * 0.8 * s);
      ctx.moveTo(hl * 0.92 * s, hw * 0.5 * s);
      ctx.quadraticCurveTo(hl * 0.18 * s, hw * 0.98 * s, -hl * 0.62 * s, hw * 0.8 * s);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    },
  );

  // The near half of the hem rides over the painted flank.
  for (const th of skirt) if (th.near) paintSkirtThorn(th);

  // ---- THE HORNS OF THE LATTICE: every plate grows its spike —
  // the base ring IS the plate's own corners (inset a hair so the
  // seam still reads between neighbors), the apex rakes aft and
  // cants outward by the plate's column, and the height follows the
  // authored column × band profiles (the crown column is the
  // vertebral saw). Painted far-to-near so each near tip overlaps
  // the base behind it — the imbricated read of grown armor, with
  // base-of-spike matching base-of-shell at every band by
  // construction. The species wears its own horn (TWO BODIES, TWO
  // SPECIES): the snapper's blades rake hard and curve like sabres;
  // the mountain's studs rise blunt and broad. shadeAmp: the
  // mountain's blunt studs need HARDER facet light — shallow cones
  // at this camera pitch flatten to lozenges unless the light
  // carves them (the colossus pass-one failure).
  const horn = look.ancient
    ? { rake: 0.42, cant: [0, 0.62, 1.05], curve: 0.14, shadeAmp: 36 }
    : { rake: 0.62, cant: [0, 0.4, 0.75], curve: 0.3, shadeAmp: 26 };
  const thorns = [] as Array<{
    T: { x: number; y: number };
    ring: Array<{ x: number; y: number }>;
    K: { x: number; y: number };
    R: number;
    rank: number;
    mossy: boolean;
    scarred: boolean;
    mseed: number;
    sortY: number;
  }>;
  for (let ib = 0; ib < grid.length - 1; ib++) {
    for (let jc = 0; jc < MESH_COLS.length - 1; jc++) {
      const vs = [grid[ib]![jc]!, grid[ib + 1]![jc]!, grid[ib + 1]![jc + 1]!, grid[ib]![jc + 1]!];
      // Seeded smith's-hand jitter: no two horns the same, no two
      // shells the same mail — and the same shell forever.
      const jb = (f.seed ^ ((ib * 9 + jc) * 0x2545f491)) >>> 0;
      const jh = 0.88 + ((jb >>> 12) & 15) * 0.016;
      const h = look.spikeH * MESH_COL_K[jc]! * bandK[ib]! * jh;
      const Xc = (vs[0]!.X + vs[1]!.X + vs[2]!.X + vs[3]!.X) / 4;
      const Yc = (vs[0]!.Y + vs[1]!.Y + vs[2]!.Y + vs[3]!.Y) / 4;
      const zc = (vs[0]!.z + vs[1]!.z + vs[2]!.z + vs[3]!.z) / 4;
      const rank = MESH_COL_RANK[jc]!;
      const latSgn = jc < 2 ? -1 : jc > 2 ? 1 : 0;
      const T = pv(Xc - horn.rake * h, Yc + latSgn * horn.cant[rank]! * h, zc + h);
      const K = pv(Xc, Yc, zc);
      const ring = vs.map((v) => ({
        x: v.x + (K.x - v.x) * 0.14,
        y: v.y + (K.y - v.y) * 0.14,
      }));
      const R = Math.hypot(ring[0]!.x - ring[2]!.x, ring[0]!.y - ring[2]!.y) / (2 * s);
      // The years are CELL facts, decided HERE where the cell id is
      // stable — never off the depth-sorted index (a sort-order pick
      // made the moss JUMP between plates as the body turned; the
      // sort permutes with facing, the lattice does not).
      const mossy = !!look.moss && ((jb >>> 16) & 15) < 2;
      const scarred = !!look.moss && ((jb >>> 20) & 31) === 3;
      thorns.push({ T, ring, K, R, rank, mossy, scarred, mseed: jb, sortY: pv(Xc, Yc, 0).y });
    }
  }
  thorns.sort((q1, q2) => q1.sortY - q2.sortY);
  const curveK = horn.curve;
  for (const th of thorns) {
    const { T, ring, K } = th;
    if (f.hurt) {
      ctx.fillStyle = '#ffffff';
      for (let e = 0; e < 4; e++) {
        const ci = ring[e]!;
        const cj = ring[(e + 1) % 4]!;
        ctx.beginPath();
        ctx.moveTo(T.x, T.y);
        ctx.lineTo(ci.x, ci.y);
        ctx.lineTo(cj.x, cj.y);
        ctx.closePath();
        ctx.fill();
      }
      continue;
    }
    // No separate socket anymore — the horn's socket IS its plate;
    // the plate margin left by the base inset does the rooting.
    // Four facets, edges bowed to the tip (the sabre curve —
    // straight triangles read as stamped tin), lit by TRUE screen
    // orientation: sky-facing horn catches the light, the undercut
    // falls into its own shadow. The horn sits BRIGHTER than the
    // vault it grows from (dark plates on a lit dome read as
    // windows — the law still binds).
    const base = th.rank === 0 ? shade(look.spike, 8) : look.spike;
    const ctrl = (p: { x: number; y: number }): { x: number; y: number } => {
      const mx2 = (p.x + T.x) / 2;
      const my2 = (p.y + T.y) / 2;
      const ox = mx2 - K.x;
      const oy = my2 - K.y;
      const od = Math.hypot(ox, oy) || 1e-4;
      const el2 = Math.hypot(p.x - T.x, p.y - T.y);
      return { x: mx2 + (ox / od) * el2 * curveK, y: my2 + (oy / od) * el2 * curveK };
    };
    for (let e = 0; e < 4; e++) {
      const ci = ring[e]!;
      const cj = ring[(e + 1) % 4]!;
      const midX = (ci.x + cj.x) / 2;
      const midY = (ci.y + cj.y) / 2;
      const dn = Math.hypot(midX - T.x, midY - T.y) || 1e-4;
      const nyF = (midY - T.y) / dn;
      ctx.fillStyle = shade(base, Math.round(-nyF * horn.shadeAmp) + 6);
      const c0 = ctrl(ci);
      const c1 = ctrl(cj);
      ctx.beginPath();
      ctx.moveTo(ci.x, ci.y);
      ctx.quadraticCurveTo(c0.x, c0.y, T.x, T.y);
      ctx.quadraticCurveTo(c1.x, c1.y, cj.x, cj.y);
      ctx.closePath();
      ctx.fill();
    }
    // Quiet base seam + a lit keel on the saw blades — the facets
    // carry the relief, never the ink.
    ctx.strokeStyle = 'rgba(26, 20, 36, 0.2)';
    ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.beginPath();
    ctx.moveTo(ring[0]!.x, ring[0]!.y);
    for (let e = 1; e < 4; e++) ctx.lineTo(ring[e]!.x, ring[e]!.y);
    ctx.closePath();
    ctx.stroke();
    // THE BROKEN INK: the outline shader rings only the OUTER
    // silhouette — interior thorns melt together exactly where the
    // 3D overlap needs definition. Each horn takes a PARTIAL stroke
    // of the world's own ink (#241a2e): the shadow-side edge from
    // the tip down two-thirds, a short flick on the lit edge —
    // enough to definitively break every spike from the one behind
    // it, never a closed ring (a ringed base grids the mail and
    // muddies the read). Strokes follow the sabre's own quadratic,
    // so the ink IS the edge, not a halo beside it.
    const inkEdge = (p: { x: number; y: number }, frac: number, alpha: number): void => {
      const c = ctrl(p);
      ctx.strokeStyle = '#241a2e';
      ctx.globalAlpha = alpha;
      ctx.lineWidth = Math.max(1, s * 0.022);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(T.x, T.y);
      for (let i2 = 1; i2 <= 5; i2++) {
        const t2 = (frac * i2) / 5;
        const u2 = 1 - t2;
        ctx.lineTo(
          u2 * u2 * T.x + 2 * u2 * t2 * c.x + t2 * t2 * p.x,
          u2 * u2 * T.y + 2 * u2 * t2 * c.y + t2 * t2 * p.y,
        );
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineCap = 'butt';
    };
    const inkA = look.ancient ? 0.5 : 0.62;
    const shadowSh = ring[0]!.y >= ring[2]!.y ? ring[0]! : ring[2]!;
    const litSh = shadowSh === ring[0] ? ring[2]! : ring[0]!;
    inkEdge(shadowSh, 0.66, inkA);
    inkEdge(litSh, 0.3, inkA * 0.7);
    // The saw flashes its keel only where the blade shows its side —
    // face-on the five keels would chain into one pale zipper down
    // the spine (the pass-one failure of this pass).
    if (th.rank === 0 && Math.abs(fx) > 0.35) {
      ctx.strokeStyle = shade(base, 26);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.globalAlpha = Math.min(1, Math.abs(fx) * 1.3);
      // The keel springs from the bow edge's midpoint — ring[1] and
      // ring[2] are the plate's bow-ward corners.
      const nose = {
        x: (ring[1]!.x + ring[2]!.x) / 2,
        y: (ring[1]!.y + ring[2]!.y) / 2,
      };
      const cn = ctrl(nose);
      ctx.beginPath();
      ctx.moveTo(nose.x, nose.y);
      ctx.quadraticCurveTo(cn.x, cn.y, T.x, T.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // The years, grown ON the horn and painted WITH the horn — moss
    // caps and lichen scars ride their own plate's paint slot in the
    // depth order, so a nearer spike overlaps them exactly as it
    // overlaps the horn they cap. Position and shape both derive
    // from the cell (K→T axis, cell seed): the growth is AFFIXED —
    // it turns with the spike and never redraws elsewhere (the
    // painted-on-top jitter, retired).
    if (th.mossy) {
      ctx.fillStyle = look.moss!;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      facetBlob(
        ctx,
        K.x + (T.x - K.x) * 0.32,
        K.y + (T.y - K.y) * 0.32,
        th.R * s * 0.6,
        th.mseed,
        6,
        0.7,
        0.9,
      );
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (th.scarred) {
      ctx.strokeStyle = shade(look.shell, 20);
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.beginPath();
      ctx.moveTo(ring[0]!.x, ring[0]!.y);
      ctx.lineTo(T.x, T.y);
      ctx.stroke();
    }
  }
}
export function drawTurtleHead(
  ctx: CanvasRenderingContext2D,
  look: TurtleLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    /** 0..1 jaw gape — open through the windup, clamped on the hit. */
    gape?: number;
    /** Corpse: lids down, jaw slack, nothing watching. */
    dead?: boolean;
  },
): void {
  const { x, y, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const hw = look.headW * s;
  const hh = look.headH * s;
  const gape = o.dead ? 0.12 : (o.gape ?? 0);
  const skin = o.hurt ? '#ffffff' : shade(look.skin, 4);

  // THE SNAPPER MOUTH — a CUT, never a cone. The rework's law: the
  // muzzle is the skull's own flesh, the keratin lip is a narrow
  // band on its leading edge with the hook notch at the tip, and
  // the mouth is the long dark line sweeping from the hook back to
  // a corner below the eye — the grim saurian smile of every
  // reference plate. Nothing pale ever projects off the face like a
  // bird's bill again.
  const pk = Math.abs(fx);
  const tipR = look.ancient ? 0.88 : 0.98;
  const tipX = x + fx * hw * tipR;
  const tipY = y + fy * hw * tipR * ys + hh * 0.02;
  const jawDrop = gape * hh * 0.6;
  // Mouth corners: below and behind the eye line, one per side —
  // the cut's far end, and the lower jaw's hinge.
  const corner = (es: number): { x: number; y: number } => ({
    x: x + px * es * hw * 0.46 + fx * hw * 0.16,
    y: y + (py * es * hw * 0.46 + fy * hw * 0.16) * ys + hh * 0.2,
  });
  const cL = corner(-1);
  const cR = corner(1);
  // The lower jaw: one wide pale shovel spanning corner to corner —
  // never a narrow chin — swinging down through the gape.
  ctx.fillStyle = o.hurt ? '#ffffff' : look.throat;
  ctx.beginPath();
  ctx.moveTo(cL.x, cL.y);
  ctx.lineTo(tipX, tipY + hh * 0.24 + jawDrop);
  ctx.lineTo(cR.x, cR.y);
  ctx.lineTo(x + fx * hw * 0.08, y + fy * hw * 0.08 * ys + hh * 0.36);
  ctx.closePath();
  ctx.fill();
  // The gape's dark room between lip and jaw.
  if (gape > 0.12 && !o.hurt) {
    ctx.fillStyle = '#4a2e28';
    ctx.beginPath();
    ctx.moveTo(cL.x, cL.y);
    ctx.lineTo(tipX, tipY + hh * 0.1 + jawDrop * 0.5);
    ctx.lineTo(cR.x, cR.y);
    ctx.lineTo(x + fx * hw * 0.14, y + fy * hw * 0.14 * ys + hh * 0.14);
    ctx.closePath();
    ctx.fill();
  }

  // THE SKULL: a blunt armored wedge with a foreshortened crown
  // plane — the head must carry its share of the body's mass.
  ctx.fillStyle = skin;
  ctx.beginPath();
  facetCircle(ctx, x, y, hw * 0.6, 7, Math.atan2(fy * ys, fx));
  ctx.fill();
  if (!o.hurt) {
    ctx.fillStyle = shade(look.skin, 12);
    ctx.beginPath();
    facetCircle(ctx, x - fx * hw * 0.05, y - fy * hw * 0.05 * ys - hh * 0.18, hw * 0.38, 6, 1.1);
    ctx.fill();
    // THE CROWN PLATE (the ancient only): a darker armored slab
    // SEATED on the skull top between the brows — snug, or it reads
    // as a hat floating behind the head.
    if (look.ancient) {
      ctx.fillStyle = shade(look.shell, -4);
      ctx.beginPath();
      facetCircle(ctx, x - fx * hw * 0.06, y - fy * hw * 0.06 * ys - hh * 0.18, hw * 0.26, 5, 0.6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.stroke();
    }
  }

  // THE MUZZLE: the skull's own flesh reaching forward to the lip —
  // one mass with the cranium, wider than it is long, so the head
  // reads reptile, never bird.
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(x - px * hw * 0.46 + fx * hw * 0.16, y + (-py * hw * 0.46 + fy * hw * 0.16) * ys - hh * 0.12);
  ctx.lineTo(tipX - px * hw * 0.24, tipY - py * hw * 0.24 * ys - hh * 0.08);
  ctx.lineTo(tipX, tipY + hh * 0.08);
  ctx.lineTo(tipX + px * hw * 0.24, tipY + py * hw * 0.24 * ys - hh * 0.08);
  ctx.lineTo(x + px * hw * 0.46 + fx * hw * 0.16, y + (py * hw * 0.46 + fy * hw * 0.16) * ys - hh * 0.12);
  ctx.lineTo(x + fx * hw * 0.1, y + fy * hw * 0.1 * ys + hh * 0.18);
  ctx.closePath();
  ctx.fill();
  if (!o.hurt) {
    // The muzzle's top plane catches the light with the crown.
    ctx.fillStyle = shade(look.skin, 10);
    ctx.beginPath();
    ctx.moveTo(x - px * hw * 0.26 + fx * hw * 0.2, y + (-py * hw * 0.26 + fy * hw * 0.2) * ys - hh * 0.16);
    ctx.lineTo(tipX - px * hw * 0.13, tipY - py * hw * 0.13 * ys - hh * 0.1);
    ctx.lineTo(tipX + px * hw * 0.13, tipY + py * hw * 0.13 * ys - hh * 0.1);
    ctx.lineTo(x + px * hw * 0.26 + fx * hw * 0.2, y + (py * hw * 0.26 + fy * hw * 0.2) * ys - hh * 0.16);
    ctx.closePath();
    ctx.fill();

    // THE LIP: a narrow keratin band along the leading edge — the
    // beak is TRIM on the mouth, never the mouth itself.
    ctx.strokeStyle = shade(look.beak, 4);
    ctx.lineWidth = Math.max(1.5, hh * 0.13);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tipX - px * hw * 0.22, tipY - py * hw * 0.22 * ys + hh * 0.0);
    ctx.quadraticCurveTo(
      tipX + fx * hw * 0.05,
      tipY + fy * hw * 0.05 * ys + hh * 0.05,
      tipX + px * hw * 0.22,
      tipY + py * hw * 0.22 * ys + hh * 0.0,
    );
    ctx.stroke();
    ctx.lineCap = 'butt';
    // THE HOOK NOTCH: the lip's point dropping past the jaw line —
    // deep on the snapper, a blunt chisel on the mountain.
    ctx.fillStyle = shade(look.beak, -6);
    ctx.beginPath();
    ctx.moveTo(tipX - px * hw * 0.08, tipY - py * hw * 0.08 * ys + hh * 0.02);
    ctx.lineTo(tipX + fx * hw * 0.04, tipY + fy * hw * 0.04 * ys + hh * (look.ancient ? 0.2 : 0.3));
    ctx.lineTo(tipX + px * hw * 0.08, tipY + py * hw * 0.08 * ys + hh * 0.02);
    ctx.closePath();
    ctx.fill();

    // THE CUT: the mouth line sweeping from under the hook back to
    // the corner below the eye — a sag, then the rise into the grim
    // corner. Both cheeks show face-on (the iconic front smile);
    // the far cheek hides at profile. The open mouth replaces it.
    if (gape < 0.3) {
      ctx.strokeStyle = 'rgba(30, 20, 24, 0.72)';
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.lineCap = 'round';
      for (const es of [-1, 1]) {
        if (pk > 0.6 && es * py < 0) continue;
        const c = corner(es);
        const midXc = (tipX + c.x) / 2 + fx * hw * 0.02;
        const midYc = (tipY + c.y) / 2 + hh * 0.16;
        ctx.beginPath();
        ctx.moveTo(tipX + px * es * hw * 0.05, tipY + py * es * hw * 0.05 * ys + hh * 0.1);
        ctx.quadraticCurveTo(midXc, midYc, c.x, c.y - hh * 0.05);
        ctx.stroke();
        // The snapper's teeth: two points hanging off the upper lip
        // along the cut — the bestiary-plate bite. The mountain is
        // beyond needing to show its teeth.
        if (!look.ancient && !o.dead) {
          ctx.fillStyle = shade(look.beak, -14);
          for (const t of [0.3, 0.55]) {
            const u = 1 - t;
            const qx = u * u * (tipX + px * es * hw * 0.05) + 2 * u * t * midXc + t * t * c.x;
            const qy =
              u * u * (tipY + py * es * hw * 0.05 * ys + hh * 0.1) +
              2 * u * t * midYc +
              t * t * (c.y - hh * 0.05);
            ctx.beginPath();
            ctx.moveTo(qx - hw * 0.035, qy - hh * 0.02);
            ctx.lineTo(qx, qy + hh * 0.09);
            ctx.lineTo(qx + hw * 0.035, qy - hh * 0.02);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
      ctx.lineCap = 'butt';
    }
    // Nostril pits on the muzzle tip's top plane.
    if (fy > 0.05) {
      ctx.fillStyle = shade(look.skin, -24);
      for (const es of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(
          tipX - fx * hw * 0.1 + px * es * hw * 0.08,
          tipY + (-fy * hw * 0.1 + py * es * hw * 0.08) * ys - hh * 0.1,
          Math.max(0.6, s * 0.012),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }

  // THE BROW: a heavy ledge over the eyes. The snapper crowns its
  // ledge with HORN NUBS (the bestiary plate's devil points); the
  // ancient just wears the ledge darker and half again wider.
  if (!o.hurt) {
    ctx.strokeStyle = shade(look.skin, look.ancient ? -30 : -24);
    ctx.lineWidth = Math.max(1.2, s * (look.ancient ? 0.036 : 0.026));
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - px * hw * 0.5 + fx * hw * 0.1, y + (-py * hw * 0.5 + fy * hw * 0.1) * ys - hh * 0.22);
    ctx.quadraticCurveTo(
      x + fx * hw * 0.34,
      y + fy * hw * 0.34 * ys - hh * 0.32,
      x + px * hw * 0.5 + fx * hw * 0.1,
      y + (py * hw * 0.5 + fy * hw * 0.1) * ys - hh * 0.22,
    );
    ctx.stroke();
    ctx.lineCap = 'butt';
    if (!look.ancient && !o.dead) {
      ctx.fillStyle = shade(look.skin, -18);
      for (const es of [-1, 1]) {
        if (Math.abs(fx) > 0.7 && es * py < 0) continue;
        const hx0 = x + px * es * hw * 0.4 + fx * hw * 0.12;
        const hy0 = y + (py * es * hw * 0.4 + fy * hw * 0.12) * ys - hh * 0.26;
        ctx.beginPath();
        ctx.moveTo(hx0 - hw * 0.07, hy0);
        ctx.lineTo(hx0, hy0 - hh * 0.18);
        ctx.lineTo(hx0 + hw * 0.07, hy0);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // Eyes: side-set under the ledge — the far one hides at profile.
  // THE SMALL EYE SELLS THE MOUNTAIN (the giant-frame inversion): the
  // ancient's eye is a coal in a cliff, never a doll's button.
  const eyeK = look.ancient ? 0.1 : 0.13;
  if (!o.hurt && fy > -0.5) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.7 && es * py < 0) continue;
      const ex0 = x + px * es * hw * 0.42 + fx * hw * 0.18;
      const ey0 = y + (py * es * hw * 0.42 + fy * hw * 0.18) * ys - hh * 0.08;
      if (o.dead) {
        // The lid down — a closed seam where the watch was.
        ctx.strokeStyle = shade(look.skin, -26);
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(ex0 - hw * 0.08, ey0);
        ctx.lineTo(ex0 + hw * 0.08, ey0 + hw * 0.02);
        ctx.stroke();
        continue;
      }
      ctx.fillStyle = '#241a14';
      ctx.beginPath();
      facetCircle(ctx, ex0, ey0, Math.max(1, hw * eyeK), 5, es * 0.8);
      ctx.fill();
      ctx.fillStyle = look.eye;
      ctx.beginPath();
      ctx.arc(ex0 - hw * 0.02, ey0 - hw * 0.02, Math.max(0.7, hw * eyeK * 0.42), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // The snapper's hide tubercles: two seeded wart-dots on the cheek
  // — camera-facing bands, live heads only.
  if (!look.ancient && !o.hurt && !o.dead && fy > 0) {
    ctx.fillStyle = shade(look.skin, -12);
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.7 && es * py < 0) continue;
      ctx.beginPath();
      ctx.arc(
        x + px * es * hw * 0.34 + fx * hw * 0.02,
        y + (py * es * hw * 0.34 + fy * hw * 0.02) * ys + hh * 0.1,
        Math.max(0.7, s * 0.014),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  // The ancient's chin barbels — old-catfish whiskers of hide,
  // hanging where the camera can see the chin at all.
  if (look.ancient && !o.hurt && !o.dead && fy > -0.2) {
    ctx.strokeStyle = shade(look.skin, -14);
    ctx.lineWidth = Math.max(1, s * 0.018);
    ctx.lineCap = 'round';
    for (const es of [-1, 1]) {
      const bx0 = x + fx * hw * 0.5 + px * es * hw * 0.14;
      const by0 = y + (fy * hw * 0.5 + py * es * hw * 0.14) * ys + hh * 0.26;
      ctx.beginPath();
      ctx.moveTo(bx0, by0);
      ctx.quadraticCurveTo(bx0 + px * es * hw * 0.06, by0 + hh * 0.2, bx0 + px * es * hw * 0.02, by0 + hh * 0.34);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
}
