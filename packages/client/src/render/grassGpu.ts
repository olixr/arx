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
 *  `projectWorld` inputs (unsnapped origin under a lean). Shared by the
 *  blade and ornament programs so the whole meadow rides one homography. */
export interface GrassProj {
  scale: number;
  yScale: number;
  /** Screen origin in CSS px (camOriginX/Y, unsnapped under lean). */
  ox: number;
  oy: number;
  /** Lean parameter. */
  q: number;
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
 * unbounded merge produces a giant slot (a tall run under a lean can span
 * the whole screen), and the atlas balloons past the win. Capping the span
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
 * projects through the full `projectWorld` homography (grassProjectGlsl),
 * emitting NDC for the REAL screen (viewport `SW×SH` device px). This
 * returns the affine `gl_Position.xy = ndc·scale + bias` that RETARGETS
 * that real-screen NDC into the band's atlas slot: the screen device rect
 * at (bandSx,bandSy) maps to the atlas device rect at (ax,ay), same size.
 * Because it is a pure NDC→NDC affine applied AFTER the perspective
 * divide, it is correct for q=0 AND q>0. Pure + tested (corner mapping).
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
 * Build the world→clip `mat3` (column-major, 9 floats) the grass vertex
 * shader consumes as `uView` — for the ORTHO camera (q=0, the shipping
 * default). It composes the renderer's affine world→screen projection
 * (`screenX = wx·scale + ox`, `screenY = wy·scale·yScale + oy`, matching
 * cameraProject's q=0 fast path) with the GL screen→NDC map, folding in
 * the Y-FLIP the stage shader applies (`ndcY = 1 − 2·screenY/h`), so
 * `uView · vec3(world,1)` lands each blade root exactly where the canvas2d
 * meadow paints it. `ox`/`oy` are the snapped screen origins (camOriginX/Y);
 * `w`/`h` are the frame's CSS pixel dimensions. Alloc-free with `out`.
 *
 * RETIRED from the live path (Epic "THE ONE RENDER", B2): a lean is a true
 * projective map needing a per-vertex divide, not expressible in this affine
 * mat3. The grass shaders now project every vertex through `grassProjectGlsl`
 * (the full `projectWorld` homography) instead of this matrix. Kept only as a
 * pinned reference of the q=0 affine map (grassGpu.test.ts); no live caller.
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

/** The perspective-divisor floor — mirrors cameraProject's MIN_W. Kept in
 *  lockstep by grassProjectParity.test.ts (a divergence surfaces the moment
 *  a sample lands in the clamped near field). */
export const GRASS_MIN_W = 0.04;

/**
 * THE ONE PROJECTION in GLSL (Epic "THE ONE RENDER", phase B2). The grass
 * vertex shaders map every blade/bloom world point to `gl_Position` through
 * THIS function — the exact `projectWorld` homography (render/
 * cameraProject.ts), not a private ortho matrix. It replaces the affine
 * `grassViewMatrix` + `gl_Position.w = 1` approximation that made the meadow
 * parallax faster than the world under a lean and edge-crawl against bodies.
 *
 * The camera uniforms `(uScale, uYScale, uOrigin, uQ, uViewport)` carry the
 * frame's projection; `uOrigin` is the screen origin the feed computes with
 * `camOriginX/Y(..., q)` — the UNSNAPPED origin under a lean, so there is no
 * pre-divide sawtooth to amplify (the jitter fix). Per vertex we form the
 * ortho screen point, apply the perspective divide about the viewport centre
 * (the same `wdiv = max(MIN_W, 1 − q·(sy0−cy))`), then map to NDC with the
 * stage's Y-flip. Because the divide is done HERE, `gl_Position.w = 1` is
 * now exactly right (the pre-divided screen point, not an affine guess).
 *
 * At q=0 the divide vanishes through the branch (byte-identical affine feed),
 * so short and tall grass ride one law: a blade tip recedes with its root
 * because wind/trample move the point in WORLD space BEFORE this projection.
 * Pinned equal to `projectWorld` by grassProjectParity.test.ts via the JS
 * mirror `grassProjectMirror` below (the `grassWindMirror` pattern).
 */
export function grassProjectGlsl(): string {
  return `
uniform float uScale;
uniform float uYScale;
uniform vec2 uOrigin;    // screen origin (ox, oy); unsnapped under lean
uniform float uQ;        // lean parameter
uniform vec2 uViewport;  // frame size in CSS px (w, h)
const float GRASS_MIN_W = ${GRASS_MIN_W};
vec4 grassProject(vec2 world) {
  float sx0 = world.x * uScale + uOrigin.x;
  float sy0 = world.y * uScale * uYScale + uOrigin.y;
  float sx = sx0;
  float sy = sy0;
  if (uQ != 0.0) {
    float cx = uViewport.x * 0.5;
    float cy = uViewport.y * 0.5;
    float wdiv = max(GRASS_MIN_W, 1.0 - uQ * (sy0 - cy));
    sx = cx + (sx0 - cx) / wdiv;
    sy = cy + (sy0 - cy) / wdiv;
  }
  float ndcX = 2.0 * sx / uViewport.x - 1.0;
  float ndcY = 1.0 - 2.0 * sy / uViewport.y;   // stage Y-flip
  return vec4(ndcX, ndcY, 0.0, 1.0);
}`;
}

/**
 * A JS transcription of grassProjectGlsl's screen-space math — FOR THE
 * PARITY TEST ONLY. Given the camera uniforms and a world point it returns
 * the final SCREEN position (post-divide, pre-NDC) and the divisor `wDiv`
 * the homography applied (`depthScale = 1/wDiv`). Asserting it equals
 * `projectWorld` proves the shader parallaxes the meadow at exactly the
 * player's rate. Keep it in lockstep with grassProjectGlsl (the test fails
 * if they drift). `uOrigin` is passed in already resolved (camOriginX/Y).
 */
export function grassProjectMirror(
  scale: number,
  yScale: number,
  ox: number,
  oy: number,
  q: number,
  wx: number,
  wy: number,
  w: number,
  h: number,
): { x: number; y: number; wDiv: number } {
  const sx0 = wx * scale + ox;
  const sy0 = wy * scale * yScale + oy;
  if (q === 0) return { x: sx0, y: sy0, wDiv: 1 };
  const cx = w / 2;
  const cy = h / 2;
  const wDiv = Math.max(GRASS_MIN_W, 1 - q * (sy0 - cy));
  return { x: cx + (sx0 - cx) / wDiv, y: cy + (sy0 - cy) / wDiv, wDiv };
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
