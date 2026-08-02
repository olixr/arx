/**
 * Pre-rendered radial falloff sprites.
 *
 * A canvas gradient FILL is rasterized on the CPU in some browsers
 * (Firefox above all), and the night scene paid for one per light per
 * frame — measured as the single biggest frame cost after dark. Each
 * falloff profile is instead rendered ONCE into a small offscreen
 * sprite and stamped with drawImage, which every browser accelerates.
 *
 * Intensity must ride globalAlpha at the stamp, never the stops: every
 * caller's stop alphas scale uniformly with intensity, so the sprite is
 * intensity-free and a flickering lamp never mints a new sprite.
 */

export type GlowStops = ReadonlyArray<readonly [number, number]>;

const SIZE = 256;
const cache = new Map<string, HTMLCanvasElement>();

/**
 * The radial falloff sprite for an `rgb` CSV color ("255, 213, 156")
 * over `stops` [offset, alpha] pairs, with the gradient's inner radius
 * at `innerK` of the outer. Stamp it over the pool's bounding box —
 * drawImage(sprite, x - r, y - r, r * 2, r * 2) — with globalAlpha
 * carrying the light's intensity.
 */
/** Stops-array → key fragment, memoized by identity: callers hoist
 *  their stop arrays to constants, so the join runs once per profile
 *  instead of allocating arrays + strings per light per frame. */
const stopsKeyMemo = new WeakMap<GlowStops, string>();
function stopsKey(stops: GlowStops): string {
  let k = stopsKeyMemo.get(stops);
  if (k === undefined) {
    k = stops.map((s) => s.join(':')).join(',');
    stopsKeyMemo.set(stops, k);
  }
  return k;
}

export function radialGlowSprite(rgb: string, stops: GlowStops, innerK: number): HTMLCanvasElement {
  const key = `${rgb}|${innerK}|${stopsKey(stops)}`;
  let c = cache.get(key);
  if (c) return c;
  // Safety valve: profiles and palette are content-driven and small,
  // but a runaway caller must not leak canvases forever.
  if (cache.size >= 256) cache.clear();
  c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext('2d')!;
  const half = SIZE / 2;
  const grad = ctx.createRadialGradient(half, half, half * innerK, half, half, half);
  for (const [off, a] of stops) grad.addColorStop(off, `rgba(${rgb}, ${a})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);
  cache.set(key, c);
  return c;
}

/**
 * The vertical alpha ramp for lit wall faces: transparent at the top,
 * `midA` at `midOff`, opaque at the foot. White, alpha-only — meant for
 * destination-in over a face patch, stretched to the run's box.
 */
export function rampSprite(midOff: number, midA: number): HTMLCanvasElement {
  const key = `ramp|${midOff}|${midA}`;
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = 1;
  c.height = SIZE;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, SIZE, 0, 0);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(midOff, `rgba(255,255,255,${midA})`);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1, SIZE);
  cache.set(key, c);
  return c;
}
