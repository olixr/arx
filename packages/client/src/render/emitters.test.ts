import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tile, hashCoords, tileEmitter } from '@arx/shared';
import { collectEmitter, type EmitterGlowOut } from './emitters.js';
import type { WorldLight } from './lighting.js';

/**
 * THE PARITY GATE (lighting v4 phase 1 — docs/lighting-v4-plan.md).
 *
 * `golden` below is the renderer's ORIGINAL hardcoded emitter chain,
 * transcribed verbatim from collectStaticLights as it stood before the
 * shared-spec refactor (commit parent of the phase-1 landing). The
 * spec table + collectEmitter must reproduce it BIT FOR BIT — exact
 * floats, exact object shapes — across tiles, times, clock gates and
 * camera squashes. Float multiplication is commutative but not
 * associative: if this gate fails by one ulp, the evaluator reordered
 * a product; fix the evaluator, never the tolerance (there is none).
 *
 * Change a fixture's voice ON PURPOSE by updating its spec row AND its
 * golden branch here in the same commit — the gate then documents the
 * new voice.
 *
 * Phase-2 evolutions carried here ON PURPOSE (2026-08-17): every glow
 * gained `gy`/`z` seat fields (THE SEATED HALO needs the ground anchor
 * and air height); the candle family gained its §7.1 tier pool — one
 * table-reach non-occluding light. Everything else is still the
 * original chain verbatim.
 */
function golden(
  tile: Tile,
  tx: number,
  ty: number,
  t: number,
  flame: number,
  boost: number,
  yScale: number,
  deckLift: number,
  glows: EmitterGlowOut[],
  lights: WorldLight[],
): void {
  if (tile === Tile.Campfire) {
    const flick = 0.85 + Math.sin(t * 11 + tx * 3.1) * 0.1 + Math.sin(t * 23 + ty) * 0.05;
    glows.push({ x: tx + 0.5, y: ty + 0.32, gy: ty + 0.32, z: 0, r: 1.6 * flick, rgb: '235, 140, 52', a: 0.3 * flick * boost });
    lights.push({ x: tx + 0.5, y: ty + 0.5, r: 4.4 * flick, rgb: [255, 186, 110], intensity: 0.9 * flame * flick, occlude: true });
  } else if (tile === Tile.Furnace) {
    const pulse = 0.8 + Math.sin(t * 5 + tx) * 0.2;
    glows.push({ x: tx + 0.5, y: ty + 0.75, gy: ty + 0.75, z: 0, r: 1.15, rgb: '232, 108, 45', a: 0.24 * pulse * boost });
    lights.push({ x: tx + 0.5, y: ty + 0.8, r: 2.8, rgb: [255, 148, 82], intensity: 0.65 * flame * pulse, occlude: true });
  } else if (tile === Tile.Hearth) {
    const pulse = 0.9 + Math.sin(t * 6 + tx * 1.9) * 0.08;
    glows.push({ x: tx + 0.5, y: ty + 0.45, gy: ty + 0.45, z: 0, r: 1.4 * pulse, rgb: '235, 150, 62', a: 0.26 * pulse * boost });
    lights.push({ x: tx + 0.5, y: ty + 0.7, r: 4.2, rgb: [255, 190, 120], intensity: 0.85 * flame * pulse, occlude: true });
  } else if (tile === Tile.Brazier) {
    const flick = 0.85 + Math.sin(t * 11 + tx * 3.1) * 0.1 + Math.sin(t * 23 + ty) * 0.05;
    glows.push({ x: tx + 0.5, y: ty + 0.3, gy: ty + 0.3, z: 0, r: 1.5 * flick, rgb: '255, 158, 66', a: 0.3 * flick * boost });
    lights.push({ x: tx + 0.5, y: ty + 0.5, r: 4.4 * flick, rgb: [255, 180, 104], intensity: 0.9 * flame * flick, occlude: true });
  } else if (tile === Tile.WallSconce) {
    const flick = 0.8 + Math.sin(t * 13 + tx * 2.9) * 0.13 + Math.sin(t * 29 + ty * 1.1) * 0.07;
    glows.push({ x: tx + 0.5, y: ty - 1.1 / yScale, gy: ty, z: 1.1, r: 1.15 * flick, rgb: '255, 156, 62', a: 0.28 * flick * boost });
    lights.push({ x: tx + 0.5, y: ty + 0.35, r: 3.4 * flick, rgb: [255, 176, 96], intensity: 0.8 * flame * flick, occlude: true });
  } else if (tile === Tile.CandleShrine) {
    const flick = 0.86 + Math.sin(t * 9 + tx * 2.3) * 0.08 + Math.sin(t * 17 + ty * 1.7) * 0.06;
    glows.push({ x: tx + 0.5, y: ty + 0.18, gy: ty + 0.18, z: 0, r: 0.85 * flick, rgb: '255, 190, 100', a: 0.24 * flick * boost });
    lights.push({ x: tx + 0.5, y: ty + 0.5, r: 2.4 * flick, rgb: [255, 200, 130], intensity: 0.55 * flame * flick, occlude: true });
  } else if (
    tile === Tile.CandleCluster ||
    tile === Tile.MeltedCandles ||
    tile === Tile.CandleTable ||
    tile === Tile.CandleStand ||
    tile === Tile.PillarCandle ||
    tile === Tile.TripleCandles
  ) {
    const breath = 0.85 + 0.15 * Math.sin(t * 0.63 + tx * 1.3 + ty * 0.7);
    const hgt =
      tile === Tile.CandleStand ? 1.0
      : tile === Tile.CandleTable ? 0.68
      : tile === Tile.PillarCandle ? 0.55
      : 0.4;
    const r =
      tile === Tile.CandleStand ? 0.66
      : tile === Tile.CandleCluster || tile === Tile.TripleCandles ? 0.72
      : tile === Tile.PillarCandle ? 0.6
      : 0.55;
    glows.push({
      x: tx + 0.5,
      y: ty + 0.5 - hgt / yScale,
      gy: ty + 0.5,
      z: hgt,
      r: r * breath,
      rgb: '255, 190, 100',
      a: 0.2 * breath * boost,
    });
    // THE TOWN LAW, TIERED (phase 2, owner decision §7.1): the candle
    // tier's one table-reach pool, flame-voiced, never occluding.
    lights.push({ x: tx + 0.5, y: ty + 0.5, r: 1.5, rgb: [255, 196, 120], intensity: 0.16 * flame * breath });
  } else if (tile === Tile.StandingTorch) {
    const flick = 0.78 + Math.sin(t * 13 + tx * 2.7) * 0.14 + Math.sin(t * 29 + ty * 1.3) * 0.08;
    glows.push({ x: tx + 0.5, y: ty + 0.1, gy: ty + 0.1, z: 0, r: 1.1 * flick, rgb: '255, 150, 58', a: 0.28 * flick * boost });
    lights.push({ x: tx + 0.5, y: ty + 0.5, r: 3.0 * flick, rgb: [255, 176, 96], intensity: 0.75 * flame * flick, occlude: true });
  } else if (tile === Tile.Bonfire) {
    const roar = 0.9 + Math.sin(t * 1.1 + tx) * 0.08;
    const flick = (0.85 + Math.sin(t * 9 + tx * 3.1) * 0.1 + Math.sin(t * 21 + ty) * 0.05) * roar;
    glows.push({ x: tx + 0.5, y: ty + 0.1, gy: ty + 0.1, z: 0, r: 2.3 * flick, rgb: '240, 132, 48', a: 0.34 * flick * boost });
    lights.push({ x: tx + 0.5, y: ty + 0.5, r: 6.2 * flick, rgb: [255, 182, 104], intensity: 1.0 * flame * flick, occlude: true });
  } else if (tile === Tile.WarBrazier) {
    const flick = 0.8 + Math.sin(t * 12 + tx * 3.3) * 0.13 + Math.sin(t * 27 + ty) * 0.06;
    glows.push({ x: tx + 0.5, y: ty + 0.18, gy: ty + 0.18, z: 0, r: 1.4 * flick, rgb: '255, 150, 60', a: 0.3 * flick * boost });
    lights.push({ x: tx + 0.5, y: ty + 0.5, r: 4.0 * flick, rgb: [255, 172, 98], intensity: 0.85 * flame * flick, occlude: true });
  } else if (tile === Tile.MeatSpit || tile === Tile.CookPot) {
    const pulse = 0.85 + Math.sin(t * 4.2 + tx * 1.7) * 0.12;
    glows.push({ x: tx + 0.5, y: ty + 0.62, gy: ty + 0.62, z: 0, r: 0.8 * pulse, rgb: '240, 120, 45', a: 0.2 * pulse * boost });
    lights.push({ x: tx + 0.5, y: ty + 0.6, r: 1.9, rgb: [255, 160, 90], intensity: 0.45 * flame * pulse, occlude: true });
  } else if (tile === Tile.GlowShroom) {
    const pulse = 0.8 + Math.sin(t * 1.4 + tx * 0.9 + ty * 1.7) * 0.2;
    glows.push({ x: tx + 0.5, y: ty + 0.4, gy: ty + 0.4, z: 0, r: 0.95 * pulse, rgb: '110, 225, 200', a: 0.12 * pulse * boost });
    lights.push({ x: tx + 0.5, y: ty + 0.5, r: 2.4, rgb: [110, 225, 200], intensity: 0.4 * pulse });
  } else if (tile === Tile.LurePole) {
    const pulse = 0.82 + Math.sin(t * 1.2 + tx * 1.1 + ty * 0.8) * 0.18;
    glows.push({ x: tx + 0.5, y: ty - 1.0 / yScale, gy: ty, z: 1.0, r: 1.0 * pulse, rgb: '127, 216, 200', a: 0.16 * pulse * boost });
    lights.push({ x: tx + 0.5, y: ty + 0.45, r: 3.6 * pulse, rgb: [127, 216, 200], intensity: 0.55 * pulse, occlude: true });
  } else if (tile === Tile.TideAltar) {
    const pulse = 0.75 + Math.sin(t * 0.9 + tx * 0.7 + ty * 1.3) * 0.25;
    glows.push({ x: tx + 0.5, y: ty + 0.3, gy: ty + 0.3, z: 0, r: 0.7 * pulse, rgb: '170, 216, 226', a: 0.1 * pulse * boost });
    lights.push({ x: tx + 0.5, y: ty + 0.5, r: 2.2, rgb: [170, 216, 226], intensity: 0.3 * pulse });
  } else if (tile === Tile.ArcaneBeacon) {
    const breathe = 0.8 + Math.sin(t * 1.1 + tx * 1.3 + ty * 0.7) * 0.2;
    glows.push({ x: tx + 0.5, y: ty - 0.45, gy: ty - 0.45, z: 0, r: 1.1 * breathe, rgb: '180, 143, 232', a: 0.22 * breathe * boost });
    lights.push({ x: tx + 0.5, y: ty + 0.5, r: 5.0 * breathe, rgb: [180, 148, 228], intensity: 0.7 * breathe, occlude: true });
  } else if (tile === Tile.Runestone) {
    const breathe = 0.75 + Math.sin(t * 1.0 + tx * 0.9 + ty * 1.2) * 0.25;
    glows.push({ x: tx + 0.5, y: ty + 0.1, gy: ty + 0.1, z: 0, r: 0.7 * breathe, rgb: '180, 143, 232', a: 0.12 * breathe * boost });
    lights.push({ x: tx + 0.5, y: ty + 0.5, r: 3.5, rgb: [180, 148, 228], intensity: 0.42 * breathe });
  } else if (tile === Tile.CrystalCluster) {
    const breathe = 0.75 + Math.sin(t * 1.2 + tx * 1.1 + ty * 0.8) * 0.25;
    glows.push({ x: tx + 0.5, y: ty + 0.35, gy: ty + 0.35, z: 0, r: 1.0 * breathe, rgb: '127, 232, 168', a: 0.15 * breathe * boost });
    lights.push({ x: tx + 0.5, y: ty + 0.5, r: 4.0, rgb: [130, 226, 170], intensity: 0.5 * breathe });
  } else if (tile === Tile.WardArch) {
    const breathe = 0.75 + Math.sin(t * 1.0 + tx * 0.7 + ty * 1.0) * 0.25;
    glows.push({ x: tx + 0.5, y: ty - 0.3, gy: ty - 0.3, z: 0, r: 0.8 * breathe, rgb: '180, 143, 232', a: 0.13 * breathe * boost });
    lights.push({ x: tx + 0.5, y: ty + 0.5, r: 3.5, rgb: [180, 148, 228], intensity: 0.45 * breathe });
  } else if (tile === Tile.ArcaneTome) {
    const breathe = 0.78 + Math.sin(t * 1.1 + tx * 1.4 + ty * 0.6) * 0.22;
    glows.push({ x: tx + 0.5, y: ty - 0.35, gy: ty - 0.35, z: 0, r: 0.6 * breathe, rgb: '216, 196, 250', a: 0.12 * breathe * boost });
    lights.push({ x: tx + 0.5, y: ty + 0.5, r: 3.0, rgb: [196, 176, 240], intensity: 0.4 * breathe });
  } else if (tile === Tile.RunePillar) {
    const green = (hashCoords(41, tx, ty) & 1) === 0;
    const breathe = 0.8 + Math.sin(t * 1.05 + tx * 1.0 + ty * 0.9) * 0.2;
    glows.push({
      x: tx + 0.5, y: ty - 0.9, gy: ty - 0.9, z: 0, r: 0.9 * breathe,
      rgb: green ? '127, 232, 168' : '180, 143, 232',
      a: 0.18 * breathe * boost,
    });
    lights.push({
      x: tx + 0.5, y: ty + 0.5, r: 4.5 * breathe,
      rgb: green ? [130, 226, 170] : [180, 148, 228],
      intensity: 0.6 * breathe, occlude: true,
    });
  } else if (tile === Tile.Everflame) {
    const beat = 0.88 + Math.sin(t * 1.6 + tx * 0.8) * 0.12;
    glows.push({ x: tx + 0.5, y: ty + 0.06, gy: ty + 0.06, z: 0, r: 1.7 * beat, rgb: '223, 242, 255', a: 0.26 * beat * boost });
    lights.push({ x: tx + 0.5, y: ty + 0.5, r: 6.0 * beat, rgb: [206, 230, 252], intensity: 0.95 * beat, occlude: true });
  } else if (tile === Tile.Moonwell) {
    const swell = 0.8 + Math.sin(t * 0.9 + tx * 0.6 + ty * 1.1) * 0.2;
    glows.push({ x: tx + 0.5, y: ty + 0.42, gy: ty + 0.42, z: 0, r: 1.2 * swell, rgb: '159, 232, 216', a: 0.16 * swell * boost });
    lights.push({ x: tx + 0.5, y: ty + 0.5, r: 3.6, rgb: [150, 226, 210], intensity: 0.5 * swell });
  } else if (tile === Tile.ElvenWaystone) {
    const pulse = 0.7 + Math.sin(t * 0.8 + tx * 1.1 + ty * 0.9) * 0.3;
    glows.push({ x: tx + 0.5, y: ty + 0.12, gy: ty + 0.12, z: 0, r: 0.65 * pulse, rgb: '159, 232, 216', a: 0.1 * pulse * boost });
    lights.push({ x: tx + 0.5, y: ty + 0.5, r: 2.2, rgb: [150, 226, 210], intensity: 0.3 * pulse });
  } else if (tile === Tile.LampPost) {
    const flick = 0.92 + Math.sin(t * 9 + tx * 2.3 + ty) * 0.05 + Math.sin(t * 17 + ty * 1.7) * 0.03;
    if (flame > 0.05) {
      glows.push({
        x: tx + 0.5,
        y: ty + 0.62 - (1.4 + deckLift) / yScale,
        gy: ty + 0.62,
        z: 1.4 + deckLift,
        r: 1.3 * flick,
        rgb: '255, 205, 130',
        a: 0.28 * flame * flick,
      });
      lights.push({ x: tx + 0.5, y: ty + 0.5, r: 5 * flick, rgb: [255, 205, 135], intensity: 0.9 * flame * flick, occlude: true });
    }
  } else {
    assert.fail(`golden has no branch for tile ${Tile[tile]}`);
  }
}

const ROSTER: readonly Tile[] = [
  Tile.Campfire, Tile.Furnace, Tile.Hearth, Tile.Brazier, Tile.WallSconce,
  Tile.CandleShrine, Tile.CandleCluster, Tile.MeltedCandles, Tile.CandleTable,
  Tile.CandleStand, Tile.PillarCandle, Tile.TripleCandles, Tile.StandingTorch,
  Tile.Bonfire, Tile.WarBrazier, Tile.MeatSpit, Tile.CookPot, Tile.GlowShroom,
  Tile.LurePole, Tile.TideAltar, Tile.ArcaneBeacon, Tile.Runestone,
  Tile.CrystalCluster, Tile.WardArch, Tile.ArcaneTome, Tile.RunePillar,
  Tile.Everflame, Tile.Moonwell, Tile.ElvenWaystone, Tile.LampPost,
];

test('THE PARITY GATE: every spec row reproduces the original chain bit for bit', () => {
  const TXS = [-13, -1, 0, 7, 118];
  const TYS = [-9, 0, 4, 61];
  const TS = [0, 3.7, 921.13];
  // (flame, boost) pairs across the clock: noon, the lamp gate's near
  // side, just past the gate, dusk, and full night.
  const SKIES: ReadonlyArray<readonly [number, number]> = [
    [0, 1.0], [0.03, 1.72], [0.06, 1.7], [0.5, 1.4], [1, 1.8],
  ];
  const YS = 0.82;
  let compared = 0;
  for (const tile of ROSTER) {
    const spec = tileEmitter(tile);
    assert.ok(spec, `no spec for ${Tile[tile]}`);
    for (const tx of TXS) for (const ty of TYS) for (const t of TS) for (const [flame, boost] of SKIES) {
      for (const deckLift of tile === Tile.LampPost ? [0, 0.22] : [0]) {
        const wantG: EmitterGlowOut[] = [];
        const wantL: WorldLight[] = [];
        golden(tile, tx, ty, t, flame, boost, YS, deckLift, wantG, wantL);
        const gotG: EmitterGlowOut[] = [];
        const gotL: WorldLight[] = [];
        collectEmitter(spec, tx, ty, t, flame, boost, YS, deckLift, gotG, gotL);
        assert.deepEqual(gotG, wantG, `${Tile[tile]} glows @ (${tx},${ty}) t=${t} flame=${flame}`);
        assert.deepEqual(gotL, wantL, `${Tile[tile]} lights @ (${tx},${ty}) t=${t} flame=${flame}`);
        compared++;
      }
    }
  }
  // The census half of the gate: nothing silently skipped.
  assert.ok(compared >= ROSTER.length * TXS.length * TYS.length * TS.length * SKIES.length, `only ${compared} comparisons ran`);
});
