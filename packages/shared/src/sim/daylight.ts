/**
 * The world clock and everything the sky does to the ground.
 *
 * One full day-night cycle is a fixed span of real time driven by the
 * server tick, so every client computes the same sky from the tick it
 * already interpolates — no extra state in snapshots. All of it is
 * pure functions of the game-clock hour, shared so tests (and any
 * future gameplay: night spawns, shop hours) read the same sky the
 * renderer draws.
 *
 * Design laws:
 * - THE CLOCK IS THE TICK. worldMs = (tick + ofs) · TICK_MS. A dev
 *   `/time` command shifts `ofs`; nothing else may bend time.
 * - DAY OUTWEIGHS NIGHT. Sunrise 05:30, sunset 20:30 — 15 game hours
 *   of light to 9 of dark, because daylight is where most play lives.
 * - NIGHT IS PLAYABLE. The ambient floor never drops below a readable
 *   moonlit blue. Darkness sells contrast for warm lights, not
 *   blindness.
 * - THE SUN SWEEPS BEHIND THE CAMERA. Shadows land west at dawn,
 *   south (down-screen, visible) at noon, east at dusk — they never
 *   point up-screen where the props they belong to would swallow them.
 * - EVERYTHING IS CONTINUOUS. No keyframe pop: ambient, shadow
 *   direction, length and alpha all glide. Dawn and dusk are events,
 *   not cuts.
 */
import { TICK_MS } from '../constants.js';

/** One full day-night cycle in real milliseconds (20 minutes). */
export const DAY_CYCLE_MS = 20 * 60 * 1000;
/** The clock reads this at tick 0 — servers boot into mid-morning. */
export const DAY_START_HOURS = 10;
export const SUNRISE = 5.5;
export const SUNSET = 20.5;

/** Game-clock hours [0, 24) for an absolute world time in ms. */
export function clockHours(worldMs: number): number {
  const h = DAY_START_HOURS + (worldMs / DAY_CYCLE_MS) * 24;
  return ((h % 24) + 24) % 24;
}

/** Convenience: world time from a server tick + dev offset. */
export function clockHoursAtTick(tick: number, ofsTicks = 0): number {
  return clockHours((tick + ofsTicks) * TICK_MS);
}

export interface DaylightSample {
  /** Game-clock hours [0, 24). */
  hours: number;
  /** Sun altitude factor: 0 below horizon → 1 at noon. */
  sun: number;
  /** Moon altitude factor: 0 by day → ~0.85 deep night. */
  moon: number;
  /**
   * Unit WORLD-space direction cast shadows fall (away from whichever
   * body is up). Screen projection multiplies y by the camera yScale.
   */
  shadowX: number;
  shadowY: number;
  /** Shadow ground length per tile of caster height (world tiles). */
  shadowLen: number;
  /** Shadow darkness 0..~0.34; 0 through the twilight gap. */
  shadowAlpha: number;
  /** True when the moon (not the sun) is casting — shadows go blue. */
  moonlit: boolean;
  /** Multiply-lightmap ambient, 0..255 per channel. White = skip. */
  ambient: [number, number, number];
  /** Horizon haze tint + strength for the top-of-frame wash. */
  sky: [number, number, number];
  skyAlpha: number;
  /** 1 − ambient luminance: gates the lightmap pass and glow boosts. */
  darkness: number;
  /** How lit man-made flames are: 0 at noon → 1 at night. */
  flame: number;
}

/** [hour, r, g, b] — the ambient ride around the clock. */
const AMBIENT_KEYS: Array<[number, number, number, number]> = [
  [0.0, 98, 112, 160],
  [4.6, 100, 112, 162],
  [5.5, 150, 132, 162], // first light
  [6.3, 238, 192, 170], // golden dawn
  [7.6, 250, 245, 234],
  [12.0, 255, 255, 255],
  [17.0, 255, 250, 238],
  [19.4, 246, 200, 162], // golden hour
  [20.5, 170, 142, 170], // sundown
  [21.4, 114, 118, 166], // fading dusk
  [22.4, 98, 112, 160], // moonlit night
  [24.0, 98, 112, 160],
];

/** [hour, r, g, b, alpha] — the horizon haze at the top of the frame. */
const SKY_KEYS: Array<[number, number, number, number, number]> = [
  [0.0, 34, 42, 86, 0.5],
  [4.6, 36, 44, 90, 0.5],
  [5.9, 232, 148, 96, 0.52], // dawn fire
  [7.6, 202, 212, 236, 0.44],
  [12.0, 190, 205, 235, 0.42],
  [18.6, 214, 196, 210, 0.44],
  [19.9, 240, 140, 88, 0.55], // dusk fire
  [21.2, 62, 58, 110, 0.5],
  [22.4, 34, 42, 86, 0.5],
  [24.0, 34, 42, 86, 0.5],
];

/** Cosine-eased keyframe ride: continuous and pop-free at every key. */
function rideKeys(keys: Array<[number, number, number, number]>, hours: number): [number, number, number];
function rideKeys(keys: Array<[number, ...number[]]>, hours: number): number[];
function rideKeys(keys: Array<[number, ...number[]]>, hours: number): number[] {
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1]![0] <= hours) i++;
  const a = keys[i]!;
  const b = keys[i + 1]!;
  const span = b[0] - a[0] || 1;
  const t = Math.min(1, Math.max(0, (hours - a[0]) / span));
  const e = (1 - Math.cos(Math.PI * t)) / 2;
  const out: number[] = [];
  for (let c = 1; c < a.length; c++) out.push(a[c]! + (b[c]! - a[c]!) * e);
  return out;
}

function smoothstep(lo: number, hi: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}

/**
 * Shadow azimuth for a body's transit fraction u (0 rise → 1 set):
 * southwest at rise, due south at zenith, southeast at set. The whole
 * fan stays SOUTH of the caster — the sun crosses the NORTHERN sky,
 * behind the tilted camera, which is the only direction consistent
 * with the art: prop crowns are painted lit and south faces shaded,
 * so light must come from up-screen at every hour. Hard side-light
 * would contradict every baked highlight in the game. Linear in
 * angle, so direction sweeps at a steady, readable pace.
 */
const AZ_RISE = 2.4; // ≈137°: dawn shadows point southwest
const AZ_SET = Math.PI - AZ_RISE; // mirror: southeast at dusk

function transitShadow(u: number): { x: number; y: number } {
  const phi = AZ_RISE + (AZ_SET - AZ_RISE) * u;
  return { x: Math.cos(phi), y: Math.sin(phi) };
}

/** The whole sky, sampled at a game-clock hour. Pure. */
export function daylightAt(hours: number): DaylightSample {
  // Sun transit fraction across [SUNRISE, SUNSET].
  const dayU = (hours - SUNRISE) / (SUNSET - SUNRISE);
  const sun = dayU > 0 && dayU < 1 ? Math.sin(Math.PI * dayU) : 0;
  // Moon transit across the complementary arc [SUNSET, SUNRISE+24].
  const nightSpan = 24 - (SUNSET - SUNRISE);
  const nightU = (((hours - SUNSET + 24) % 24) / nightSpan + 1) % 1;
  const moonUp = hours > SUNSET || hours < SUNRISE;
  const moon = moonUp ? Math.sin(Math.PI * nightU) * 0.85 : 0;

  const moonlit = moon > sun;
  const alt = moonlit ? moon : sun;
  const u = moonlit ? nightU : Math.min(1, Math.max(0, dayU));
  const dir = transitShadow(u);
  // Low body → long shadow, capped before it reads as a smear.
  const shadowLen = 0.35 + 1.85 * (1 - alt) ** 1.6;
  const shadowAlpha = moonlit
    ? 0.12 * smoothstep(0, 0.3, moon)
    : 0.34 * smoothstep(0, 0.22, sun);

  const ambient = rideKeys(AMBIENT_KEYS, hours);
  const skyRide = rideKeys(SKY_KEYS as Array<[number, ...number[]]>, hours);
  const lum = (0.299 * ambient[0] + 0.587 * ambient[1] + 0.114 * ambient[2]) / 255;

  return {
    hours,
    sun,
    moon,
    shadowX: dir.x,
    shadowY: dir.y,
    shadowLen,
    shadowAlpha,
    moonlit,
    ambient,
    sky: [skyRide[0]!, skyRide[1]!, skyRide[2]!],
    skyAlpha: skyRide[3]!,
    darkness: 1 - lum,
    flame: smoothstep(0.55, 0.12, sun),
  };
}

/** Named times of day for the dev `/time` command. */
export const TIME_NAMES: Record<string, number> = {
  dawn: 6,
  morning: 9,
  noon: 12,
  afternoon: 15,
  dusk: 19.8,
  sunset: 20.3,
  night: 23,
  midnight: 0,
};

/**
 * The tick offset that makes the clock read `targetHours` right now.
 * Always non-negative (the clock only ever runs forward).
 */
export function ofsForHours(tick: number, targetHours: number): number {
  const ticksPerDay = DAY_CYCLE_MS / TICK_MS;
  const current = clockHoursAtTick(tick, 0);
  const delta = (((targetHours - current) % 24) + 24) % 24;
  return Math.round((delta / 24) * ticksPerDay);
}
