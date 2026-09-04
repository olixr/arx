import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  DARK_LEVEL,
  EMITTER_LIGHTS,
  LIGHT_SCAN_R,
  lightCurveAt,
  lightLevelAt,
  tileEmitter,
  type EmitterSpec,
} from './lights.js';
import { Tile, candleInfo } from './tiles.js';

// ------------------------------------------------------------ the evaluator

test('lightCurveAt reproduces the inline arithmetic exactly (base + amp·sin terms)', () => {
  // The campfire flicker: 0.85 + sin(t·11 + tx·3.1)·0.1 + sin(t·23 + ty)·0.05
  const c = { base: 0.85, terms: [{ hz: 11, amp: 0.1, px: 3.1 }, { hz: 23, amp: 0.05, py: 1 }] };
  for (const [t, tx, ty] of [[0, 0, 0], [3.7, 12, -4], [921.13, -7, 33]] as const) {
    const want = 0.85 + Math.sin(t * 11 + tx * 3.1) * 0.1 + Math.sin(t * 23 + ty) * 0.05;
    assert.equal(lightCurveAt(c, t, tx, ty), want);
  }
});

test('lightCurveAt `times` multiplies exactly (the bonfire roar law)', () => {
  const c = {
    base: 0.85,
    terms: [{ hz: 9, amp: 0.1, px: 3.1 }, { hz: 21, amp: 0.05, py: 1 }],
    times: { base: 0.9, terms: [{ hz: 1.1, amp: 0.08, px: 1 }] },
  };
  const t = 17.31;
  const tx = 45;
  const ty = -3;
  const roar = 0.9 + Math.sin(t * 1.1 + tx) * 0.08;
  const flick = (0.85 + Math.sin(t * 9 + tx * 3.1) * 0.1 + Math.sin(t * 21 + ty) * 0.05) * roar;
  assert.equal(lightCurveAt(c, t, tx, ty), flick);
});

// ---------------------------------------------------------------- the census

/** The phase-1 roster: exactly the tiles the renderer's old hardcoded
 *  chain served. A new emitter extends this pin ON PURPOSE; a dropped
 *  row screams here before it silently darkens a town. */
const ROSTER: readonly Tile[] = [
  Tile.Campfire, Tile.Furnace, Tile.Hearth, Tile.Brazier, Tile.WallSconce,
  Tile.CandleShrine, Tile.CandleCluster, Tile.MeltedCandles, Tile.CandleTable,
  Tile.CandleStand, Tile.PillarCandle, Tile.TripleCandles, Tile.StandingTorch,
  Tile.Bonfire, Tile.WarBrazier, Tile.MeatSpit, Tile.CookPot, Tile.GlowShroom,
  Tile.LurePole, Tile.TideAltar, Tile.ArcaneBeacon, Tile.Runestone,
  Tile.CrystalCluster, Tile.WardArch, Tile.ArcaneTome, Tile.RunePillar,
  Tile.Everflame, Tile.Moonwell, Tile.ElvenWaystone, Tile.LampPost,
  // THE SCARRED LAND: the ember bed, the gloom pair, the lamp cairn,
  // the pit lamp. The dark postures and the thread have no row.
  Tile.EmberBed, Tile.GloomStone, Tile.FoulPool, Tile.LampCairn, Tile.PitLamp,
];

test('the emitter census: exactly the transcribed roster, each row reachable', () => {
  const listed = EMITTER_LIGHTS.map(([tile]) => tile).sort((a, b) => a - b);
  const expected = [...ROSTER].sort((a, b) => a - b);
  assert.deepEqual(listed, expected);
  for (const tile of ROSTER) assert.ok(tileEmitter(tile), `no spec for tile ${Tile[tile]}`);
  // Non-emitters answer undefined — including the wall the chain never lit.
  assert.equal(tileEmitter(Tile.WallStone), undefined);
  // THE SCARRED LAND's dark postures are the tell: zero light entries
  // for the dark pit lamp, the dark lamp post, and the ward thread.
  assert.equal(tileEmitter(Tile.PitLampDark), undefined);
  assert.equal(tileEmitter(Tile.LampPostDark), undefined);
  assert.equal(tileEmitter(Tile.WardThread), undefined);
  assert.equal(tileEmitter(Tile.Grass), undefined);
});

// ------------------------------------------------------------------ the laws

function eachSpec(fn: (tile: Tile, spec: EmitterSpec) => void): void {
  for (const [tile, spec] of EMITTER_LIGHTS) fn(tile, spec);
}

test('every row is well-formed: sane reaches, intensities, colors, and at least one voice', () => {
  eachSpec((tile, spec) => {
    const name = Tile[tile];
    assert.ok(spec.glows.length + spec.lights.length > 0, `${name}: silent row`);
    assert.ok(spec.curve.terms.length > 0, `${name}: rhythm-less curve`);
    for (const g of spec.glows) {
      assert.ok(g.r > 0 && g.r < 4, `${name}: glow r ${g.r}`);
      assert.ok(g.a > 0 && g.a <= 0.5, `${name}: glow a ${g.a}`);
      assert.match(g.rgb, /^\d{1,3}, \d{1,3}, \d{1,3}$/, `${name}: glow rgb '${g.rgb}'`);
      if (g.air !== undefined) assert.ok(g.air > 0 && g.air < 2, `${name}: air ${g.air}`);
    }
    for (const l of spec.lights) {
      assert.ok(l.r > 0 && l.r <= 7, `${name}: light r ${l.r}`);
      assert.ok(l.intensity > 0 && l.intensity <= 1, `${name}: intensity ${l.intensity}`);
      for (const ch of l.rgb) assert.ok(ch >= 0 && ch <= 255, `${name}: light rgb ${l.rgb}`);
    }
  });
});

test('THE FLAME LAW: flame-gated light is architecture (occludes) — except the licensed candle tier', () => {
  eachSpec((tile, spec) => {
    for (const l of spec.lights) {
      if (l.flameGated && !candleInfo(tile)?.lit) {
        assert.ok(l.occlude, `${Tile[tile]}: flame-gated light must occlude`);
      }
    }
  });
});

test('THE TOWN LAW, TIERED (§7.1): candles carry one tiny non-occluding pool; LampPost owns the night', () => {
  eachSpec((tile, spec) => {
    if (candleInfo(tile)?.lit) {
      // The tier license, exactly: ONE pool, table-reach, flame-voiced,
      // never architecture. Louder candles need a new owner decision.
      assert.equal(spec.lights.length, 1, `${Tile[tile]}: the candle tier is ONE pool`);
      const pool = spec.lights[0]!;
      assert.ok(!pool.occlude, `${Tile[tile]}: a kept flame never occludes`);
      assert.ok(pool.flameGated, `${Tile[tile]}: a candle is a man-made flame`);
      assert.ok(pool.r <= 1.6, `${Tile[tile]}: table-reach only (r ${pool.r})`);
      assert.ok(pool.intensity <= 0.2, `${Tile[tile]}: a mark's voice (i ${pool.intensity})`);
      assert.equal(spec.glows.length, 1, `${Tile[tile]}: one breathing bloom per lit prop`);
    }
  });
  // Snuffed postures fall through to darkness — no row at all.
  for (const [lit, out] of [
    [Tile.CandleCluster, Tile.CandleClusterOut],
  ] as const) {
    assert.ok(tileEmitter(lit), 'lit candle row missing');
    assert.equal(tileEmitter(out), undefined, 'a snuffed candle must not emit');
  }
  const lamp = tileEmitter(Tile.LampPost);
  assert.ok(lamp?.flameGate && lamp.porch, 'LampPost: flame-gated, porch-aware');
  assert.ok(lamp.lights[0]?.occlude, 'LampPost: the town light is architecture');
});

test('THE LIGHT STANDS WHERE THE FLAME BURNS: a z light matches a glow at its own air height', () => {
  eachSpec((tile, spec) => {
    for (const l of spec.lights) {
      if (l.z === undefined) continue;
      assert.ok(l.z > 0 && l.z < 2, `${Tile[tile]}: z ${l.z} out of the fixture band`);
      assert.ok(
        spec.glows.some((g) => g.air === l.z),
        `${Tile[tile]}: the light floats at z ${l.z} but no flame burns there`,
      );
    }
  });
});

// ------------------------------------------------------- the darkness ledger

test('THE DARKNESS LEDGER: noon is lit, midnight is dark, and a bonfire holds a bright circle', () => {
  const empty = (): number | undefined => Tile.Grass;
  const bonfireAt = (x: number, y: number): number | undefined =>
    x === 10 && y === 10 ? Tile.Bonfire : Tile.Grass;
  // Full sun: lit everywhere regardless of fixtures.
  assert.equal(lightLevelAt(12, false, 500, 500, empty), 1);
  // Midnight open field: ZERO — the moonlit ambient is the NIGHT IS
  // PLAYABLE paint courtesy, never gameplay light (THE MOON IS PAINT).
  const nightOpen = lightLevelAt(0, false, 500, 500, empty);
  assert.equal(nightOpen, 0, `open night ${nightOpen}`);
  // Dusk still reads part-lit: the rescale is a ramp, not a cliff.
  const dusk = lightLevelAt(19, false, 500, 500, empty);
  assert.ok(dusk > 0.1 && dusk < 1, `dusk ${dusk}`);
  // Beside the bonfire at midnight: bright — the fixture claims it.
  const atFire = lightLevelAt(0, false, 10, 10, bonfireAt);
  assert.ok(atFire > 0.7, `at the fire ${atFire}`);
  assert.ok(atFire > DARK_LEVEL, 'a bonfire beats the dark line');
  // Past the scan reach: the fixture is out of the ledger's world.
  const far = lightLevelAt(0, false, 10 + LIGHT_SCAN_R + 2, 10, bonfireAt);
  assert.ok(far < DARK_LEVEL, `far from the fire ${far}`);
});

test('THE DARKNESS LEDGER: no sky underground, and the flame clock lands right on both planes', () => {
  const brazierAt = (x: number, y: number): number | undefined =>
    x === 5 && y === 5 ? Tile.Brazier : Tile.Grass;
  // Underground at noon, no fixture in reach: pitch dark.
  assert.equal(lightLevelAt(12, true, 50, 50, () => Tile.Grass), 0);
  // Underground beside a brazier at NOON: the flame gate rides to 1
  // below ground — the brazier carries the dark band all day.
  const ugFire = lightLevelAt(12, true, 5, 5, brazierAt);
  assert.ok(ugFire > 0.6, `underground brazier ${ugFire}`);
  // Surface at noon the same brazier adds nothing the sun didn't.
  assert.equal(lightLevelAt(12, false, 5, 5, brazierAt), 1);
  // THE STABILITY LAW: the ledger reads fixtures at full voice — the
  // same query twice is bit-identical (no clock term, no flicker).
  assert.equal(
    lightLevelAt(0, false, 10, 10, brazierAt),
    lightLevelAt(0, false, 10, 10, brazierAt),
  );
});

test('THE PALETTE LAW: a palette row deals an alt color to every entry', () => {
  eachSpec((tile, spec) => {
    if (!spec.palette) return;
    for (const g of spec.glows) assert.ok(g.altRgb, `${Tile[tile]}: glow missing altRgb`);
    for (const l of spec.lights) assert.ok(l.altRgb, `${Tile[tile]}: light missing altRgb`);
  });
});
