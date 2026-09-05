/**
 * THE LIFE IS A CURVE — the shared curve and ramp registries.
 *
 * A grain never carries a closure or an array: it carries small
 * integer ids into these tables. Size-over-life and alpha-over-life
 * are 17-sample curves (linear between samples); color-over-life is
 * a 33-sample ramp of pre-resolved fill strings. Both are registered
 * ONCE per authored shape and memoized by key, so a frozen recipe
 * costs one lookup at module load and nothing per spawn or per draw.
 *
 * Curves are authored as keyframes `[t0, v0, t1, v1, ...]` (t ascending
 * in 0..1) or by preset name. Ramps are authored as color stops with
 * optional positions; `steps` posterizes a smooth RGB interpolation
 * into N flat bands — a STEPPED gradient that still reads as vector
 * art (hard edges only, never a blend on screen).
 *
 * Id 0 is reserved in both registries and means "the legacy law":
 * the engine's original size/alpha/fade arithmetic, byte-identical.
 */

export const CURVE_SAMPLES = 17;
export const RAMP_SAMPLES = 33;

// ---------------------------------------------------------------------------
// Curves
// ---------------------------------------------------------------------------

/** Flat sample storage: id * CURVE_SAMPLES .. +17. Id 0 = legacy. */
const curveData: number[] = new Array(CURVE_SAMPLES).fill(1);
const curveIds = new Map<string, number>();
let curveCount = 1;

/**
 * The preset vocabulary. Names are the tuning language of the lab
 * and the library; every preset is just keyframes.
 */
export const CURVE_PRESETS: Record<string, number[]> = {
  /** 1 → 0 linear: the engine's default shrink (registered so the
   *  composer can name it; id 0 remains the byte-identical path). */
  shrink: [0, 1, 1, 0],
  /** Hold full size for the whole life. */
  hold: [0, 1, 1, 1],
  /** Born big, dwindles on an ease-in — a flame body that DWINDLES. */
  dwindle: [0, 1, 0.3, 0.92, 0.6, 0.66, 0.85, 0.3, 1, 0],
  /** Pops to full at birth, collapses fast — a flash, a heart. */
  flare: [0, 1, 0.18, 0.72, 0.45, 0.34, 1, 0],
  /** Swells fast, hangs, thins — smoke that grows into itself. */
  swell: [0, 0.35, 0.22, 0.85, 0.55, 1, 1, 0.9],
  /** Born small, blooms to full by mid-life, shrinks out. */
  bloom: [0, 0.3, 0.4, 1, 0.75, 0.85, 1, 0],
  /** Two beats: grows, contracts, grows, gone — breathing matter. */
  pulse: [0, 0.6, 0.25, 1, 0.5, 0.65, 0.75, 1, 1, 0],
  /** Alpha: the engine's default fade tent for growing blocks. */
  tent: [0, 0, 0.25, 1, 1, 0],
  /** Alpha: opaque throughout (the shrinking-block default). */
  solid: [0, 1, 1, 1],
  /** Alpha: 1 → 0 linear. */
  fadeOut: [0, 1, 1, 0],
  /** Alpha: holds, then lets go in the last third. */
  fadeLate: [0, 1, 0.62, 1, 1, 0],
  /** Alpha: born translucent, thickens, dissolves — smoke. */
  smoke: [0, 0.45, 0.28, 0.82, 0.6, 0.7, 1, 0],
  /** Alpha: 0 → 1 fast then holds — matter arriving. */
  fadeIn: [0, 0, 0.2, 1, 1, 1],
  /** Alpha: a soft entrance and a long exit — mist. */
  mist: [0, 0.2, 0.3, 0.6, 0.55, 0.55, 1, 0],
};

/** Evaluate keyframes at t (0..1), linear between keys, clamped. */
export function keysAt(keys: number[], t: number): number {
  const n = keys.length >> 1;
  if (n === 0) return 1;
  if (t <= keys[0]!) return keys[1]!;
  for (let i = 1; i < n; i++) {
    const kt = keys[i * 2]!;
    if (t <= kt) {
      const pt = keys[(i - 1) * 2]!;
      const pv = keys[(i - 1) * 2 + 1]!;
      const kv = keys[i * 2 + 1]!;
      const span = kt - pt;
      return span <= 0 ? kv : pv + (kv - pv) * ((t - pt) / span);
    }
  }
  return keys[(n - 1) * 2 + 1]!;
}

/**
 * Register a size/alpha curve. Accepts a preset name or keyframes;
 * memoized by key so a recipe can call this in a frozen template.
 * Returns an id > 0. Unknown preset names throw at author time —
 * the library must never ship a curve it cannot speak.
 */
export function curveOf(spec: string | number[]): number {
  const keys = typeof spec === 'string' ? CURVE_PRESETS[spec] : spec;
  if (!keys) throw new Error(`unknown curve preset: ${spec}`);
  const key = typeof spec === 'string' ? `@${spec}` : keys.join(',');
  const have = curveIds.get(key);
  if (have !== undefined) return have;
  const id = curveCount++;
  for (let k = 0; k < CURVE_SAMPLES; k++) {
    curveData.push(keysAt(keys, k / (CURVE_SAMPLES - 1)));
  }
  curveIds.set(key, id);
  return id;
}

/** Sample curve `id` at life fraction t (0..1). Id 0 → 1. */
export function curveAt(id: number, t: number): number {
  if (id <= 0) return 1;
  const u = t <= 0 ? 0 : t >= 1 ? CURVE_SAMPLES - 1 : t * (CURVE_SAMPLES - 1);
  const i = u | 0;
  const base = id * CURVE_SAMPLES;
  if (i >= CURVE_SAMPLES - 1) return curveData[base + CURVE_SAMPLES - 1]!;
  const a = curveData[base + i]!;
  const b = curveData[base + i + 1]!;
  return a + (b - a) * (u - i);
}

/** Registered curve count including the legacy slot (tests). */
export function curveCountOf(): number {
  return curveCount;
}

/** The authored key of curve `id` ('@preset' or 'k,v,k,v…') — the lab's export. */
export function curveKeyOf(id: number): string {
  for (const [k, v] of curveIds) if (v === id) return k;
  return '';
}

// ---------------------------------------------------------------------------
// Ramps
// ---------------------------------------------------------------------------

/** Flat color storage: id * RAMP_SAMPLES .. +33. Id 0 = legacy. */
const rampData: string[] = new Array(RAMP_SAMPLES).fill('');
const rampIds = new Map<string, number>();
let rampCount = 1;

export interface RampSpec {
  /** Color stops, hot to cool. */
  stops: string[];
  /**
   * Life fractions where each stop takes over (ascending, first is
   * ignored as 0). Absent = evenly spaced over the life.
   */
  at?: number[];
  /**
   * Posterize: interpolate the stops smoothly in RGB, then hold the
   * result in N flat bands. Absent = hard switches at the stops (the
   * fade law). 8–12 reads as a rich gradient; 4 reads as stages.
   */
  steps?: number;
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim();
  if (h.startsWith('#')) h = h.slice(1);
  if (h.length === 3) h = h[0]! + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  if (Number.isNaN(n) || h.length !== 6) return [255, 255, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mix two hex colors in RGB, k 0..1. */
export function mixHex(a: string, b: string, k: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * k, ag + (bg - ag) * k, ab + (bb - ab) * k);
}

/** The smooth color of a ramp at t: between the two bracketing stops. */
function rampSmooth(stops: string[], at: number[], t: number): string {
  const n = stops.length;
  if (n === 1) return stops[0]!;
  for (let i = 1; i < n; i++) {
    if (t <= at[i]!) {
      const span = at[i]! - at[i - 1]!;
      const k = span <= 0 ? 1 : (t - at[i - 1]!) / span;
      return mixHex(stops[i - 1]!, stops[i]!, Math.max(0, Math.min(1, k)));
    }
  }
  return stops[n - 1]!;
}

/** The hard-switch color of a ramp at t: the last stop whose `at` ≤ t. */
function rampHard(stops: string[], at: number[], t: number): string {
  let c = stops[0]!;
  for (let i = 1; i < stops.length; i++) {
    if (t > at[i]!) c = stops[i]!;
  }
  return c;
}

/**
 * Register a ramp. Memoized by its full spec. Returns an id > 0.
 * A one-stop ramp is legal (a constant color through a table).
 */
export function rampOf(spec: RampSpec): number {
  const stops = spec.stops;
  if (stops.length === 0) throw new Error('a ramp needs at least one stop');
  const n = stops.length;
  const at: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    at[i] = spec.at?.[i] ?? (n === 1 ? 0 : i / (n - 1));
  }
  at[0] = 0;
  const key = `${stops.join('|')}@${at.join(',')}#${spec.steps ?? 0}`;
  const have = rampIds.get(key);
  if (have !== undefined) return have;
  const id = rampCount++;
  const steps = spec.steps ?? 0;
  for (let k = 0; k < RAMP_SAMPLES; k++) {
    const t = k / (RAMP_SAMPLES - 1);
    if (steps > 1) {
      // Hold the smooth gradient in N bands: each band wears the
      // color at its own center, so the first band is the hot stop
      // and the last is the cold one.
      const band = Math.min(steps - 1, Math.floor(t * steps));
      const tc = (band + 0.5) / steps;
      rampData.push(rampSmooth(stops, at, tc));
    } else {
      rampData.push(rampHard(stops, at, t));
    }
  }
  rampIds.set(key, id);
  return id;
}

/** The fill string of ramp `id` at life fraction t. Id 0 → ''. */
export function rampAt(id: number, t: number): string {
  if (id <= 0) return '';
  const k = t <= 0 ? 0 : t >= 1 ? RAMP_SAMPLES - 1 : (t * (RAMP_SAMPLES - 1)) | 0;
  return rampData[id * RAMP_SAMPLES + k]!;
}

/** The distinct colors a ramp wears, in order (tests + the lab swatch). */
export function rampBands(id: number): string[] {
  const out: string[] = [];
  if (id <= 0) return out;
  const base = id * RAMP_SAMPLES;
  for (let k = 0; k < RAMP_SAMPLES; k++) {
    const c = rampData[base + k]!;
    if (out.length === 0 || out[out.length - 1] !== c) out.push(c);
  }
  return out;
}

/** Registered ramp count including the legacy slot (tests). */
export function rampCountOf(): number {
  return rampCount;
}

/** The authored key of ramp `id` — the lab's export. */
export function rampKeyOf(id: number): string {
  for (const [k, v] of rampIds) if (v === id) return k;
  return '';
}
