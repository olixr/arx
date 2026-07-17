import { hashCoords } from './rng.js';

/**
 * In-house value noise with fractal Brownian motion. Deterministic from
 * seed — worldgen must reproduce identically on every run.
 */

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function latticeValue(seed: number, ix: number, iy: number): number {
  return hashCoords(seed, ix, iy) / 4294967296;
}

/** Single-octave value noise in [0, 1). Input in "noise space". */
export function valueNoise(seed: number, x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smoothstep(x - ix);
  const fy = smoothstep(y - iy);

  const v00 = latticeValue(seed, ix, iy);
  const v10 = latticeValue(seed, ix + 1, iy);
  const v01 = latticeValue(seed, ix, iy + 1);
  const v11 = latticeValue(seed, ix + 1, iy + 1);

  const top = v00 + (v10 - v00) * fx;
  const bottom = v01 + (v11 - v01) * fx;
  return top + (bottom - top) * fy;
}

/** Fractal noise in [0, 1), `octaves` layers of value noise. */
export function fbm(seed: number, x: number, y: number, octaves = 4): number {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let max = 0;
  for (let i = 0; i < octaves; i++) {
    total += valueNoise(seed + i * 7919, x * frequency, y * frequency) * amplitude;
    max += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return total / max;
}
