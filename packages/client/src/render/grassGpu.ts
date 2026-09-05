/**
 * THE LIVING MEADOW GOES TO THE GPU (grass proposal, phase G-1) — the
 * pure, tested substrate the instanced blade renderer consumes.
 *
 * Two load-bearing pieces, both backend-agnostic and node-verifiable:
 *  - grassWindGlsl(): THE ONE WIND, in GLSL — the exact `windAtInto`
 *    formula for the vertex shader, so GPU blades bend to the SAME wind
 *    field as the CPU trees and cloth. "ONE WIND, literally" — the
 *    formula shares the wind direction (WX/WY) with grass.ts and is
 *    pinned identical to the CPU reference by grassGpu.test.ts.
 *  - packBladeInstances(): the per-blade instance buffer. The Blade
 *    struct generateGrassTile already produces IS the instance record;
 *    this packs it into the interleaved Float32Array the instanced draw
 *    uploads (see docs/gpu-grass-proposal.md §4).
 */
import { WX, WY } from './grass.js';
import type { Blade } from './grass.js';

/** The frame's projection uniforms for the grass shaders — the exact
 *  Camera.worldToScreen affine inputs. Shared by the blade and
 *  ornament programs so the whole meadow rides one projection. */
export interface GrassProj {
  scale: number;
  yScale: number;
  /** Screen origin in CSS px (Camera.originX/Y). */
  ox: number;
  oy: number;
  /** Viewport in CSS px. */
  wCss: number;
  hCss: number;
}

/** Floats per grass instance in the packed buffer. Layout:
 *  [rootX, rootY, height, halfWidth, lean, phase, tone, seg2]. */
export const GRASS_INSTANCE_FLOATS = 8;

/** Pack blades into the interleaved instance buffer the GL instanced
 *  draw consumes (one instance per blade). Reuses `out` when it fits —
 *  the per-tile buffers are pooled, not re-minted each frame. */
export function packBladeInstances(blades: readonly Blade[], out?: Float32Array): Float32Array {
  const need = blades.length * GRASS_INSTANCE_FLOATS;
  const buf = out && out.length >= need ? out : new Float32Array(need);
  for (let i = 0; i < blades.length; i++) {
    const b = blades[i]!;
    const o = i * GRASS_INSTANCE_FLOATS;
    buf[o] = b.bx;
    buf[o + 1] = b.by;
    buf[o + 2] = b.h;
    buf[o + 3] = b.w;
    buf[o + 4] = b.lean;
    buf[o + 5] = b.phase;
    buf[o + 6] = b.tone;
    buf[o + 7] = b.seg2 ? 1 : 0;
  }
  return buf;
}

/**
 * G1 — THE TALL BLADE INTERLEAVES. A contiguous slice of the by-sorted
 * tall-blade instance buffer that shares one interleave depth (`sortY`).
 * Each band becomes one y-sorted DrawItem + one instanced GPU sub-draw
 * (drawn in isolation into its own atlas slot), so a body slots BETWEEN
 * bands at its true foot row.
 */
export interface TallBand {
  /** First blade index in the by-sorted array. */
  i0: number;
  /** Blade count in this band. */
  count: number;
  /** The band's interleave depth — the world row it y-sorts at. */
  sortY: number;
  /** Band world-y extent (min/max blade root), for screen-bbox bounding. */
  minBy: number;
  maxBy: number;
  /** G-ELEVATED — the terrace lift (WORLD height, level·ELEV_H) every blade
   *  in this band rides. Absent/0 = flat ground (tall + skirt bands). Set
   *  only on the elevated-coat bands so a whole row lifts onto its shelf. */
  elev?: number;
  /** THE SKIRT RIDES ITS OBJECT'S SHELF (skirt bands only): the `strat`
   *  (shelf) of the object this skirt nestles, carried through to the blit so
   *  the emitted DrawItem sorts in the object's own slot. Absent on tall/elev
   *  bands (their DrawItems set strat separately). */
  strat?: number;
}

/**
 * Partition a BACK-TO-FRONT (by ascending) tall-blade array into fine
 * world-row bands of height `pitch` (world units). Blades are bucketed by
 * `floor(by / pitch)`; each occupied bucket becomes one band whose
 * `sortY` is the bucket CENTRE — so a body's foot at row fY slots between
 * the band centres, its interleave error bounded by pitch/2 (vs the old
 * two-fixed-lanes-per-tile hack whose midlines popped). Because the input
 * is sorted, every band is a contiguous slice (i0, count). Pure + tested.
 */
export function partitionTallBands(
  blades: readonly { by: number }[],
  pitch: number,
): TallBand[] {
  const bands: TallBand[] = [];
  const p = pitch > 0 ? pitch : 1;
  let i = 0;
  const n = blades.length;
  while (i < n) {
    const bucket = Math.floor(blades[i]!.by / p);
    let j = i;
    let minBy = blades[i]!.by;
    let maxBy = blades[i]!.by;
    while (j < n && Math.floor(blades[j]!.by / p) === bucket) {
      const by = blades[j]!.by;
      if (by < minBy) minBy = by;
      if (by > maxBy) maxBy = by;
      j++;
    }
    bands.push({ i0: i, count: j - i, sortY: (bucket + 0.5) * p, minBy, maxBy });
    i = j;
  }
  return bands;
}

/**
 * G-PERF — COALESCE THE BANDS. partitionTallBands cuts one fine band per
 * occupied pitch bucket so a body can slot between ANY two world rows; but
 * that fine cut only earns its cost where a body actually stands. In open
 * field most adjacent bands have NOTHING sorting between them, so they can
 * merge into ONE blit — far fewer GL sub-draws, atlas slots and 2d copies,
 * the exact same pixels — and only the rows a body's foot occupies keep
 * their fine split (so the body still interleaves precisely).
 *
 * The rule: walk the ascending fine bands, greedily extending a run; refuse
 * to extend across a `splitRow` — an entity foot world-row — that would fall
 * STRICTLY INSIDE the run's blade-y span (`runMinBy < row < candidateMaxBy`),
 * because one blit at one sortY cannot draw both north-of and south-of a body
 * correctly. A run that never straddles a split row keeps the SAME
 * interleave the fine bands gave (it is only ever merged across body-free
 * rows); a run that would straddle one is cut there, exactly reproducing the
 * fine band at that row. So this is a strict cost reduction with no
 * interleave regression for any body whose row is honored.
 *
 * FAR-FIELD LOD: `nearMinBy` drops split rows north of it (up-screen, far
 * from the camera), letting the distance coalesce freely — a body out there
 * compresses to a few pixels and its fine interleave is imperceptible, so
 * paying per-row sub-draws for it is waste. Pass -Infinity to honor every
 * row (no LOD). `splitRows` need not be sorted; it is copied+filtered+sorted
 * here. A merged run's `sortY` is its span midpoint (any value in the
 * body-free span is correct); a lone band keeps its original `sortY`, so a
 * field with a body on every row returns the input unchanged.
 *
 * SPAN CAP: `maxSpan` bounds a merged run's world-y extent. The tall path
 * renders each band in ISOLATION into an atlas slot sized to its SCREEN
 * bbox — a slot as tall as the run's span PLUS a blade height — so an
 * unbounded merge produces a giant slot (a tall run at high zoom or in a
 * tall viewport can span the whole screen), and the atlas balloons past the
 * win. Capping the span
 * keeps every slot atlas-thin: the count still falls (a dense field merges
 * ~pitch:maxSpan-to-one) but no single band's bbox blows up. Pass Infinity
 * for no cap (the pure-geometry tests). Pure + tested.
 */
export function coalesceTallBands(
  bands: readonly TallBand[],
  splitRows: readonly number[],
  nearMinBy = -Infinity,
  maxSpan = Infinity,
): TallBand[] {
  const out: TallBand[] = [];
  if (bands.length === 0) return out;
  // Near-field split rows only, ascending — the merge test binary-searches it.
  const rows: number[] = [];
  for (const r of splitRows) if (r >= nearMinBy) rows.push(r);
  rows.sort((a, b) => a - b);
  // Any split row strictly inside (lo, hi)? First row > lo, is it < hi?
  const straddles = (lo: number, hi: number): boolean => {
    let a = 0;
    let b = rows.length;
    while (a < b) {
      const m = (a + b) >> 1;
      if (rows[m]! <= lo) a = m + 1;
      else b = m;
    }
    return a < rows.length && rows[a]! < hi;
  };

  let i0 = bands[0]!.i0;
  let count = bands[0]!.count;
  let minBy = bands[0]!.minBy;
  let maxBy = bands[0]!.maxBy;
  let sortY = bands[0]!.sortY;
  let n = 1; // fine bands in the running run
  const flush = (): void => {
    out.push({ i0, count, sortY: n === 1 ? sortY : (minBy + maxBy) / 2, minBy, maxBy });
  };
  for (let k = 1; k < bands.length; k++) {
    const b = bands[k]!;
    const newMax = b.maxBy > maxBy ? b.maxBy : maxBy;
    const newMin = b.minBy < minBy ? b.minBy : minBy;
    if (newMax - newMin > maxSpan || straddles(minBy, newMax)) {
      flush();
      i0 = b.i0;
      count = b.count;
      minBy = b.minBy;
      maxBy = b.maxBy;
      sortY = b.sortY;
      n = 1;
    } else {
      // Fine bands are contiguous slices of the by-sorted array, so a run's
      // blade count is just the sum and its i0 stays the first band's.
      count += b.count;
      maxBy = newMax;
      if (b.minBy < minBy) minBy = b.minBy;
      n++;
    }
  }
  flush();
  return out;
}

/**
 * G1 — THE ATLAS REMAP. The tall bands each render in ISOLATION (no
 * cross-band contamination, so a band's blit carries only its own blades)
 * into a distinct slot of ONE offscreen atlas — a single GL pass, then
 * cheap 2d blits at the interleaved y-sort slots. The blade shader still
 * projects through the camera affine (grassProjectGlsl),
 * emitting NDC for the REAL screen (viewport `SW×SH` device px). This
 * returns the affine `gl_Position.xy = ndc·scale + bias` that RETARGETS
 * that real-screen NDC into the band's atlas slot: the screen device rect
 * at (bandSx,bandSy) maps to the atlas device rect at (ax,ay), same size.
 * It is a pure NDC→NDC affine applied after the projection. Pure + tested
 * (corner mapping).
 *
 *   SW,SH = full-screen backbuffer size in DEVICE px (viewCss·dpr)
 *   AW,AH = atlas size in DEVICE px
 *   bandSx,bandSy = band screen bbox origin in DEVICE px
 *   ax,ay = band atlas-slot origin in DEVICE px
 */
export function bandNdcRemap(
  SW: number,
  SH: number,
  AW: number,
  AH: number,
  bandSx: number,
  bandSy: number,
  ax: number,
  ay: number,
): { sx: number; sy: number; bx: number; by: number } {
  const sx = SW / AW;
  const sy = SH / AH;
  return {
    sx,
    sy,
    bx: sx - 1 + (2 * (ax - bandSx)) / AW,
    by: 1 - sy + (2 * (bandSy - ay)) / AH,
  };
}

/**
 * Build the world→clip `mat3` (column-major, 9 floats) a grass vertex
 * shader could consume as `uView`. It composes the renderer's affine
 * world→screen projection
 * (`screenX = wx·scale + ox`, `screenY = wy·scale·yScale + oy`, matching
 * Camera.worldToScreen; reference math in render/cameraProject.ts) with
 * the GL screen→NDC map, folding in
 * the Y-FLIP the stage shader applies (`ndcY = 1 − 2·screenY/h`), so
 * `uView · vec3(world,1)` lands each blade root exactly where the canvas2d
 * meadow paints it. `ox`/`oy` are the snapped screen origins (Camera.originX/Y);
 * `w`/`h` are the frame's CSS pixel dimensions. Alloc-free with `out`.
 *
 * RETIRED from the live path (Epic "THE ONE RENDER", B2): the grass shaders
 * project every vertex through `grassProjectGlsl` (the per-vertex form of the
 * same affine) instead of this matrix. Kept only as a pinned reference of the
 * affine map (grassGpu.test.ts); no live caller.
 */
export function grassViewMatrix(
  scale: number,
  yScale: number,
  ox: number,
  oy: number,
  w: number,
  h: number,
  out?: Float32Array,
): Float32Array {
  const m = out && out.length >= 9 ? out : new Float32Array(9);
  // column 0 (∂ndc/∂wx), column 1 (∂ndc/∂wy), column 2 (translation)
  m[0] = (2 * scale) / w;   m[1] = 0;                       m[2] = 0;
  m[3] = 0;                 m[4] = (-2 * scale * yScale) / h; m[5] = 0;
  m[6] = (2 * ox) / w - 1;  m[7] = 1 - (2 * oy) / h;         m[8] = 1;
  return m;
}

/**
 * THE ONE PROJECTION in GLSL (Epic "THE ONE RENDER", phase B2). The grass
 * vertex shaders map every blade/bloom world point to `gl_Position` through
 * THIS function — the exact Camera.worldToScreen affine (render/renderer.ts;
 * reference math `projectWorld` in render/cameraProject.ts), not a private
 * view matrix, so the meadow parallaxes at exactly the player's rate and
 * never edge-crawls against bodies.
 *
 * The camera uniforms `(uScale, uYScale, uOrigin, uViewport)` carry the
 * frame's projection; `uOrigin` is the screen origin the feed computes with
 * `Camera.originX/Y`. Per vertex we form the screen point, then map to NDC with
 * the stage's Y-flip (`gl_Position.w = 1`).
 *
 * Short and tall grass ride one law: a blade tip moves with its root
 * because wind/trample move the point in WORLD space BEFORE this projection.
 * Pinned equal to `projectWorld` by grassProjectParity.test.ts via the JS
 * mirror `grassProjectMirror` below (the `grassWindMirror` pattern).
 */
export function grassProjectGlsl(): string {
  return `
uniform float uScale;
uniform float uYScale;
uniform vec2 uOrigin;    // screen origin (ox, oy)
uniform vec2 uViewport;  // frame size in CSS px (w, h)
// GRASS RIDES ITS SHELF (G-ELEVATED): the terrace lift, in WORLD height, of
// the tile the blade is rooted on (level·ELEV_H). 0 = flat ground = the whole
// shipped meadow, byte-identical (the lift branch is skipped). >0 raises the
// blade onto the plateau top; <0 sinks it into a pit.
uniform float uElev;
vec4 grassProject(vec2 world, vec2 root) {
  float sx = world.x * uScale + uOrigin.x;
  float sy = world.y * uScale * uYScale + uOrigin.y;
  if (uElev != 0.0) {
    // A RIGID screen rise equal to the terrace lift under the blade's ROOT
    // row — level·ELEV_H · scale — exactly the shift the elevated ground
    // quad applies (renderer collectElevatedGround), so the whole blade sits
    // ON the raised top. (root is the rooted tile; the camera is the plain
    // affine, so the rise is uniform across the row.)
    sy -= uElev * uScale;
  }
  float ndcX = 2.0 * sx / uViewport.x - 1.0;
  float ndcY = 1.0 - 2.0 * sy / uViewport.y;   // stage Y-flip
  return vec4(ndcX, ndcY, 0.0, 1.0);
}`;
}

/**
 * A JS transcription of grassProjectGlsl's screen-space math — for the
 * parity test and the tall-band bbox sweep. Given the camera uniforms and
 * a world point it returns the SCREEN position (pre-NDC). Asserting it
 * equals `projectWorld` proves the shader parallaxes the meadow at exactly
 * the player's rate. Keep it in lockstep with grassProjectGlsl (the test
 * fails if they drift). `uOrigin` is passed in already resolved
 * (Camera.originX/Y). Alloc-free when `out` is given.
 */
export function grassProjectMirror(
  scale: number,
  yScale: number,
  ox: number,
  oy: number,
  wx: number,
  wy: number,
  out?: { x: number; y: number },
): { x: number; y: number } {
  const o = out ?? { x: 0, y: 0 };
  o.x = wx * scale + ox;
  o.y = wy * scale * yScale + oy;
  return o;
}

/**
 * GRASS G-INTERACT — THE MEADOW REACTS TO THE BODY. The number of nearby
 * disturbers (players + NPCs) the trample uniform holds. Shared by the
 * blade, cast and (feed) renderer paths so they cannot drift.
 */
export const MAX_DISTURB = 8;

/** Floats per packed disturber POSITION record — [worldX, worldY, radius,
 *  strength]. The velocity lay-vector rides a parallel vec2 array. */
export const DISTURB_STRIDE = 4;

/**
 * G-INTERACT tuning — the one place the parting FEEL lives, so the blade
 * shader, the cast shader and the parity test all read the SAME numbers.
 *
 *  · bendRadial — how far a blade lays over AWAY from the body, as a
 *    fraction of its own height, at the foot (falls smoothly to 0 at the
 *    disturb radius). The PART: blades peel outward so a pocket opens.
 *  · bendWake   — extra lay-over in the body's DIRECTION OF TRAVEL, per
 *    world-unit/sec of the passed lay-vector. The blades comb down in the
 *    wake as the body moves, and spring back radial once it stops.
 *  · pocketFrac — the CLEAR pocket is the inner this-fraction of the
 *    radius; inside it blades flatten so the feet read on top of the
 *    ground, not buried. Small on purpose (a foot pocket, not a bald ring).
 *  · pocketMax  — the most a pocket blade flattens (1 = flat); kept below 1
 *    so a trodden tuft still shows, never a bare hole.
 */
export interface DisturbTune {
  bendRadial: number;
  bendWake: number;
  pocketFrac: number;
  pocketMax: number;
}
export const DISTURB_TUNE: DisturbTune = {
  // Pass 2 (the refined feel): a touch more outward peel so the part reads as
  // a clear rosette around the body, a slightly wider + deeper foot pocket so
  // the feet sit cleanly on the ground, and the same gentle travel wake.
  bendRadial: 0.72,
  bendWake: 0.1,
  pocketFrac: 0.58,
  pocketMax: 0.96,
};

/**
 * THE PARTING, in GLSL — the shared displacement every disturbed blade (and
 * its cast) obeys, so the coat, the tall bands and the shade all part
 * around a body identically. Emits `grassDisturb(root, jitter, out push,
 * out flat)`:
 *   · push — the lay-over vector in WORLD units per unit blade-height
 *     (radial-away + travel-wake), added at the tip (× up × height).
 *   · flat — the foot-pocket flatten in 0..pocketMax; the caller shortens
 *     the blade by (1 − flat) so the feet sit in a cleared pocket.
 * Summed over the nearby disturbers with a smoothstep falloff (no hard
 * rim). `jitter` rotates each blade's radial push a little off pure-radial
 * so a trodden patch combs over naturally instead of skewering into a
 * starburst. Pinned to `grassDisturbMirror` below by the parity test.
 */
export function grassDisturbGlsl(t: DisturbTune = DISTURB_TUNE): string {
  return `
uniform vec4 uDisturb[${MAX_DISTURB}];    // xy = world pos, z = radius, w = strength
uniform vec2 uDisturbVel[${MAX_DISTURB}]; // xy = travel lay-vector (world u/s), clamped
uniform int uDisturbN;
void grassDisturb(vec2 root, float jitter, out vec2 push, out float pocket) {
  push = vec2(0.0);
  pocket = 0.0;
  float cj = cos(jitter), sj = sin(jitter);
  for (int i = 0; i < ${MAX_DISTURB}; i++) {
    if (i >= uDisturbN) break;
    vec2 d = root - uDisturb[i].xy;
    float dist = length(d);
    float r = max(uDisturb[i].z, 1e-3);
    float t = clamp(dist / r, 0.0, 1.0);
    float bend = 1.0 - t;
    bend = bend * bend * (3.0 - 2.0 * bend);       // smoothstep falloff, soft rim
    float s = bend * uDisturb[i].w;
    vec2 rad = dist > 1e-4 ? d / dist : vec2(0.0, 1.0);
    rad = vec2(rad.x * cj - rad.y * sj, rad.x * sj + rad.y * cj); // jittered radial
    // Radial PART (peel outward) + travel WAKE (comb down where it walks).
    push += rad * s * ${t.bendRadial} + uDisturbVel[i] * s * ${t.bendWake};
    // The tight inner CLEAR pocket — flattens the foot tile so feet read.
    float core = 1.0 - clamp(dist / (r * ${t.pocketFrac}), 0.0, 1.0);
    core = core * core * (3.0 - 2.0 * core);
    pocket = max(pocket, core * uDisturb[i].w);
  }
  pocket = clamp(pocket, 0.0, ${t.pocketMax});
}`;
}

/**
 * A JS transcription of grassDisturbGlsl — FOR THE PARITY TEST ONLY. Given
 * a blade root, its per-blade jitter, and the nearby disturbers (packed as
 * the shader reads them: `pos` = [x,y,r,strength]×n, `vel` = [vx,vy]×n),
 * it returns the exact `{push, flat}` the shader computes. Keep it in
 * lockstep with grassDisturbGlsl (the test fails if they drift).
 */
export function grassDisturbMirror(
  rootX: number,
  rootY: number,
  jitter: number,
  pos: ArrayLike<number>,
  vel: ArrayLike<number>,
  n: number,
  t: DisturbTune = DISTURB_TUNE,
): { px: number; py: number; flat: number } {
  let px = 0;
  let py = 0;
  let flat = 0;
  const cj = Math.cos(jitter);
  const sj = Math.sin(jitter);
  for (let i = 0; i < Math.min(n, MAX_DISTURB); i++) {
    const dx = rootX - pos[i * 4]!;
    const dy = rootY - pos[i * 4 + 1]!;
    const dist = Math.hypot(dx, dy);
    const r = Math.max(pos[i * 4 + 2]!, 1e-3);
    const strength = pos[i * 4 + 3]!;
    const tt = Math.min(Math.max(dist / r, 0), 1);
    let bend = 1 - tt;
    bend = bend * bend * (3 - 2 * bend);
    const s = bend * strength;
    let radx = dist > 1e-4 ? dx / dist : 0;
    let rady = dist > 1e-4 ? dy / dist : 1;
    const jx = radx * cj - rady * sj;
    const jy = radx * sj + rady * cj;
    radx = jx;
    rady = jy;
    px += radx * s * t.bendRadial + vel[i * 2]! * s * t.bendWake;
    py += rady * s * t.bendRadial + vel[i * 2 + 1]! * s * t.bendWake;
    let core = 1 - Math.min(Math.max(dist / (r * t.pocketFrac), 0), 1);
    core = core * core * (3 - 2 * core);
    flat = Math.max(flat, core * strength);
  }
  flat = Math.min(Math.max(flat, 0), t.pocketMax);
  return { px, py, flat };
}

/**
 * Pack the frame's disturbers into the two uniform arrays the shaders read
 * — POSITION `[x, y, radius, strength]×n` and VELOCITY lay-vector
 * `[vx, vy]×n` (world units/sec, clamped so a sprinting body cannot fling a
 * blade off-screen). Pure and alloc-reusing: it fills the caller's pooled
 * buffers and returns the count actually written (≤ MAX_DISTURB). The
 * `radiusScale` widens the body footprint into the parted spread, and
 * `velClamp` bounds the wake. Tested (grassGpu.test.ts).
 */
export function packDisturbers(
  entries: ArrayLike<{ x: number; y: number; r: number; vx: number; vy: number }>,
  posOut: Float32Array,
  velOut: Float32Array,
  opts: { radiusScale?: number; minRadius?: number; strength?: number; velClamp?: number } = {},
): number {
  const radiusScale = opts.radiusScale ?? 2.8;
  const minRadius = opts.minRadius ?? 0.95;
  const strength = opts.strength ?? 1;
  const velClamp = opts.velClamp ?? 5;
  const n = Math.min(MAX_DISTURB, entries.length);
  for (let i = 0; i < n; i++) {
    const e = entries[i]!;
    posOut[i * 4] = e.x;
    posOut[i * 4 + 1] = e.y;
    posOut[i * 4 + 2] = Math.max(minRadius, e.r * radiusScale);
    posOut[i * 4 + 3] = strength;
    velOut[i * 2] = Math.max(-velClamp, Math.min(velClamp, e.vx));
    velOut[i * 2 + 1] = Math.max(-velClamp, Math.min(velClamp, e.vy));
  }
  return n;
}

/**
 * THE ONE WIND in GLSL. Returns `vec4(bendX, bendY, strength, lum)` —
 * the same four fields as WindSample — for a world point `w` at time
 * `t`. The wind direction (WX/WY) is templated from grass.ts so the two
 * cannot drift on the axis; the coefficients mirror `windAtInto` and are
 * pinned by the parity test. The vertex shader calls this per blade to
 * bend it exactly as the CPU meadow does.
 */
export function grassWindGlsl(): string {
  return `
vec4 grassWind(vec2 w, float t) {
  float along = w.x * ${WX} + w.y * ${WY};
  float across = -w.x * ${WY} + w.y * ${WX};
  float frontBend = 0.9 * sin(across * 0.055 + t * 0.13);
  float gust = 0.6 + 0.4 * sin(along * 0.05 - t * 0.34 + frontBend);
  float sway = 0.72 * sin(along * 0.12 - t * 1.25 + 0.35 * frontBend)
             + 0.28 * sin(along * 0.2 - t * 1.9 + 0.7);
  float s = gust * (0.4 + sway);
  float meander = 0.3 * sin(across * 0.14 - t * 0.7 + along * 0.05);
  float l = 0.62 * sin(along * 0.035 - t * 0.3 + 0.5 * frontBend)
          + 0.38 * sin(along * 0.07 - t * 0.75 + across * 0.02);
  return vec4(${WX} * s - ${WY} * meander, ${WY} * s + ${WX} * meander, s, l);
}`;
}

/**
 * THE LIVING WIND (grass color+wind pass) — the grass-ONLY wind layers that
 * ride ON TOP of the shared ONE WIND (grassWind above). The ONE WIND is
 * pinned identical to the trees/cloth by the parity test and must NOT change;
 * this adds the meadow's own life without touching that contract:
 *
 *  · env  — a LARGE-SCALE TRAVELLING GUST WAVE in world space: a long-
 *    wavelength swell moving along the wind axis (skewed a touch across it,
 *    so the gust front is angled like real weather) that MULTIPLIES the base
 *    sway amplitude. This is the headline — you SEE a band of stronger wind
 *    roll across the whole meadow, blades laying over as it passes and
 *    springing up behind it, never a uniform sway.
 *  · turb — per-blade high-frequency TURBULENCE + a gentle always-on IDLE
 *    sway, both phase-shifted by the blade's own seed so no two blades move
 *    in lockstep and the field never freezes even in a lull.
 *
 * Both are pure world-space displacements the vertex shader adds BEFORE the
 * projection, so they compose cleanly with elevation and the interaction
 * parting. Templated from GUST_TUNE so the GLSL and the JS mirror
 * (grassGustMirror) cannot drift — the test pins them.
 */
export interface GustTune {
  /** Spatial frequency of the travelling gust wave (rad per world tile) —
   *  smaller = longer wavelength = a broader gust band. */
  gustFreq: number;
  /** Travel speed of the gust along the wind axis (rad/s). */
  gustSpeed: number;
  /** Cross-axis skew of the gust front (rad/tile) — angles the front. */
  gustSkew: number;
  /** Envelope floor: the calm-trough sway multiplier (kept > 0 so a lull
   *  still breathes, never a dead-flat field). */
  gustBase: number;
  /** Envelope swing added by the wave crest — base+amp is peak gust. */
  gustAmp: number;
  /** Per-blade high-frequency turbulence amplitude (tip world units). */
  turbAmp: number;
  turbSpeed: number;
  /** Gentle always-on idle sway amplitude (tip world units). */
  idleAmp: number;
  idleSpeed: number;
}
export const GUST_TUNE: GustTune = {
  // Pass 3 (final): a ~40-tile gust band crossing the meadow in a slow,
  // calming roll; the envelope dips to 0.28 in a lull and swells to 1.28 at
  // the crest so the traveling wave READS; light per-blade turbulence + idle
  // keep the field alive between gusts without ever looking frantic.
  gustFreq: 0.16,
  gustSpeed: 0.85,
  gustSkew: 0.035,
  gustBase: 0.78,
  gustAmp: 0.5,
  turbAmp: 0.14,
  turbSpeed: 2.05,
  idleAmp: 0.075,
  idleSpeed: 0.9,
};

/**
 * THE LIVING WIND in GLSL — emits `vec2 grassGust(vec2 w, float t, float
 * phase)` returning `(env, turb)` (see GustTune). Shared verbatim by the
 * blade and cast shaders so the shade sways with the crown that throws it.
 * Templated from GUST_TUNE + the shared wind axis (WX/WY).
 */
export function grassGustGlsl(t: GustTune = GUST_TUNE): string {
  return `
vec2 grassGust(vec2 w, float t, float phase) {
  float along = w.x * ${WX} + w.y * ${WY};
  float across = -w.x * ${WY} + w.y * ${WX};
  // LARGE travelling gust wave — long wavelength, slow travel, angled front.
  float wave = sin(along * ${t.gustFreq} - t * ${t.gustSpeed} + across * ${t.gustSkew});
  float env = ${t.gustBase} + ${t.gustAmp} * wave;
  float ph = phase * 6.2831853;
  // per-blade turbulence + gentle idle — decorrelated multipliers on ph so
  // neighbours never march together.
  float turb = ${t.turbAmp} * sin(t * ${t.turbSpeed} + ph * 3.1)
             + ${t.idleAmp} * sin(t * ${t.idleSpeed} + ph * 1.7);
  return vec2(env, turb);
}`;
}

/** JS transcription of grassGustGlsl — FOR THE TEST. Keep in lockstep. */
export function grassGustMirror(
  wx: number,
  wy: number,
  t: number,
  phase: number,
  tune: GustTune = GUST_TUNE,
): { env: number; turb: number } {
  const along = wx * WX + wy * WY;
  const across = -wx * WY + wy * WX;
  const wave = Math.sin(along * tune.gustFreq - t * tune.gustSpeed + across * tune.gustSkew);
  const env = tune.gustBase + tune.gustAmp * wave;
  const ph = phase * 6.2831853;
  const turb =
    tune.turbAmp * Math.sin(t * tune.turbSpeed + ph * 3.1) +
    tune.idleAmp * Math.sin(t * tune.idleSpeed + ph * 1.7);
  return { env, turb };
}

/**
 * THE PAINTED FIELD (grass color pass) — two large-scale, low-frequency
 * value-noise fields over WORLD space, so the meadow is naturally non-uniform
 * instead of a flat carpet:
 *
 *  · x = VALUE drift — broad patches marginally lighter/darker (shifts the
 *    blade's light step a touch in the fragment shader).
 *  · y = HUE drift — broad patches marginally warmer/cooler, DECORRELATED
 *    from the value patches (different wavelengths + phases) so warmth and
 *    brightness don't move together, which reads as real ground rather than
 *    a gradient.
 *
 * Both ≈ [-1, 1]. Cheap sums of sines (no texture fetch), evaluated per blade
 * root in the vertex shader and passed as varyings. Templated from
 * COLOR_NOISE_TUNE; pinned to grassColorNoiseMirror by the test.
 */
export interface ColorNoiseTune {
  valFx: number;
  valFy: number;
  valFx2: number;
  valFy2: number;
  hueFx: number;
  hueFy: number;
  hueFx2: number;
  hueFy2: number;
}
export const COLOR_NOISE_TUNE: ColorNoiseTune = {
  // ~18–30 tile patches for value; a different, coarser set for hue so the
  // warm/cool drift rides its own reaches. Tasteful, never busy.
  valFx: 0.052,
  valFy: 0.069,
  valFx2: 0.11,
  valFy2: 0.083,
  hueFx: 0.041,
  hueFy: 0.058,
  hueFx2: 0.094,
  hueFy2: 0.037,
};

/** THE PAINTED FIELD in GLSL — `vec2 grassColorNoise(vec2 w)` → (value, hue)
 *  drift, each ≈ [-1,1]. Templated from COLOR_NOISE_TUNE. */
export function grassColorNoiseGlsl(t: ColorNoiseTune = COLOR_NOISE_TUNE): string {
  return `
vec2 grassColorNoise(vec2 w) {
  float v = 0.6 * sin(w.x * ${t.valFx} + w.y * ${t.valFy})
          + 0.4 * sin(w.x * ${t.valFx2} - w.y * ${t.valFy2} + 2.1);
  float hue = 0.6 * sin(w.x * ${t.hueFx} - w.y * ${t.hueFy} + 1.3)
            + 0.4 * sin(w.x * ${t.hueFx2} + w.y * ${t.hueFy2} + 4.7);
  return vec2(v, hue);
}`;
}

/** JS transcription of grassColorNoiseGlsl — FOR THE TEST. Keep in lockstep. */
export function grassColorNoiseMirror(
  wx: number,
  wy: number,
  t: ColorNoiseTune = COLOR_NOISE_TUNE,
): { value: number; hue: number } {
  const value =
    0.6 * Math.sin(wx * t.valFx + wy * t.valFy) +
    0.4 * Math.sin(wx * t.valFx2 - wy * t.valFy2 + 2.1);
  const hue =
    0.6 * Math.sin(wx * t.hueFx - wy * t.hueFy + 1.3) +
    0.4 * Math.sin(wx * t.hueFx2 + wy * t.hueFy2 + 4.7);
  return { value, hue };
}

/**
 * A JS transcription of grassWindGlsl — FOR THE PARITY TEST ONLY. It is
 * the GLSL formula line-for-line in JS, so asserting it equals the CPU
 * `windAtInto` proves the shader bends blades to the exact same wind.
 * Keep it in lockstep with grassWindGlsl above (the test fails if they
 * or windAtInto drift).
 */
export function grassWindMirror(wx: number, wy: number, t: number): { bx: number; by: number; s: number; l: number } {
  const along = wx * WX + wy * WY;
  const across = -wx * WY + wy * WX;
  const frontBend = 0.9 * Math.sin(across * 0.055 + t * 0.13);
  const gust = 0.6 + 0.4 * Math.sin(along * 0.05 - t * 0.34 + frontBend);
  const sway =
    0.72 * Math.sin(along * 0.12 - t * 1.25 + 0.35 * frontBend) +
    0.28 * Math.sin(along * 0.2 - t * 1.9 + 0.7);
  const s = gust * (0.4 + sway);
  const meander = 0.3 * Math.sin(across * 0.14 - t * 0.7 + along * 0.05);
  const l =
    0.62 * Math.sin(along * 0.035 - t * 0.3 + 0.5 * frontBend) +
    0.38 * Math.sin(along * 0.07 - t * 0.75 + across * 0.02);
  return { bx: WX * s - WY * meander, by: WY * s + WX * meander, s, l };
}
