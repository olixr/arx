import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE_DEFS, Tile, SIGN_TILES, isSolidTile } from '@arx/shared';
import { MUSEUM_PLANE_ID } from '../planes.js';
import {
  FOLD_BLOCK_H,
  FOLD_BLOCK_W,
  FOLD_CELL,
  FOLD_PAD,
  FOLD_PLAQUE_BANK_ONLY,
  FOLD_PLAQUE_HELD_ONLY,
  FOLD_PLAQUE_HOLD,
  FOLD_PLAQUE_RAMP,
  FOLD_STRIP_H,
  FOLD_STRIP_W,
  MUSEUM_EXCLUDED,
  MUSEUM_FOLD_HOLDS,
  MUSEUM_FOLD_LOOKS,
  MUSEUM_FOLD_MATERIALS,
  buildMuseum,
  museumExhibitedTiles,
  museumFoldHolds,
  museumFoldLegend,
  museumFoldWing,
  museumSpectrum,
  museumStrayTiles,
} from './museum.js';
import { band, fieldAxisAt, prepareStrokes, quant, spectrumAxisIndex, validateSpectrumStrokes } from '../spectrum.js';
import { validateZone, zonePlacementErrors } from './validateZone.js';

test('the museum builds and passes the one zone gate', () => {
  const zone = buildMuseum();
  assert.equal(zone.id, 'museum');
  assert.equal(zone.plane, MUSEUM_PLANE_ID);
  assert.ok(zone.spawn, 'museum declares a spawn');
  assert.deepEqual(zonePlacementErrors(zone), []);
  const verdict = validateZone(zone);
  assert.ok(verdict.ok, `zone gate verdict: ${verdict.error}`);
});

test('coverage is total: every TILE_DEFS id is shown or excluded on purpose', () => {
  // The strays gallery exists exactly so this can never fail on a new
  // tile — it walks in on its own. What CAN fail: an excluded tile
  // that stopped existing, or an exclusion someone widened by hand.
  for (const t of MUSEUM_EXCLUDED) {
    assert.ok(t in TILE_DEFS, `excluded tile ${t} is not in TILE_DEFS`);
  }
  assert.ok(MUSEUM_EXCLUDED.size <= 4, 'exclusions stay a short, argued list');

  const zone = buildMuseum();
  const onFloor = new Set<number>(zone.ground);
  const exhibited = museumExhibitedTiles();
  for (const t of museumStrayTiles()) exhibited.add(t);
  for (const key of Object.keys(TILE_DEFS)) {
    const t = Number(key) as Tile;
    if (MUSEUM_EXCLUDED.has(t)) continue;
    assert.ok(exhibited.has(t), `tile ${t} (${TILE_DEFS[t]!.name}) has no museum bay`);
    assert.ok(onFloor.has(t), `tile ${t} (${TILE_DEFS[t]!.name}) never landed on the floor`);
  }
});

test('every exhibit plinth stands, reads, and can be reached', () => {
  const zone = buildMuseum();
  assert.ok((zone.signs?.length ?? 0) > 300, 'the hall is fully labeled');
  for (const s of zone.signs ?? []) {
    const lx = s.x - zone.origin.x;
    const ly = s.y - zone.origin.y;
    const under = zone.ground[ly * zone.width + lx]!;
    assert.ok(SIGN_TILES.has(under), `sign "${s.title}" lost its board`);
    // The reading spot: the tile just south of every plinth is open
    // floor — a plaque you cannot stand before is a plaque unread.
    const south = zone.ground[(ly + 1) * zone.width + lx]! as Tile;
    assert.ok(!isSolidTile(south), `sign "${s.title}" has no reading spot (${TILE_DEFS[south]?.name})`);
  }
});

// ------------------------------------------------ THE LIVING GROUND wing

test('THE LIVING GROUND wing stands: every folding material, one strip per look, in a grass apron, with a plaque', () => {
  const zone = buildMuseum();
  const wing = museumFoldWing();
  assert.equal(wing.rows.length, MUSEUM_FOLD_MATERIALS.length);
  assert.equal(wing.blocks.length, MUSEUM_FOLD_LOOKS.length);
  assert.ok(wing.y1 > wing.y0 && wing.y1 <= zone.height, 'the wing lies inside the hall');
  const at = (x: number, y: number): number => zone.ground[(y - zone.origin.y) * zone.width + (x - zone.origin.x)]!;
  for (const [r, row] of wing.rows.entries()) {
    assert.equal(row.tile, MUSEUM_FOLD_MATERIALS[r]);
    for (const block of wing.blocks) {
      for (let dy = 0; dy < FOLD_BLOCK_H; dy++) {
        for (let dx = 0; dx < FOLD_BLOCK_W; dx++) {
          const x = block.x0 + dx;
          const y = row.y0 + dy;
          const inStrip = dx >= 1 && dx <= FOLD_STRIP_W && dy >= 1 && dy <= FOLD_STRIP_H;
          assert.equal(at(x, y), inStrip ? row.tile : Tile.Grass, `block ${block.look.name} row ${r} at (${dx},${dy})`);
        }
      }
      assert.equal(block.stripX, block.x0 + 1);
      assert.equal(block.crestX, block.stripX + FOLD_STRIP_W, 'the crest stands just east of the strip');
    }
    assert.equal(row.stripY, row.y0 + 1);
  }
  // Blocks stand past each other's hem: the next block begins east of
  // the previous crest's plateau plus its pad.
  for (let k = 1; k < wing.blocks.length; k++) {
    assert.ok(wing.blocks[k]!.x0 >= wing.blocks[k - 1]!.crestX + 2 + FOLD_PAD, `block ${k} stands past the hem`);
  }
  // Forty plaques, one per (material, look), each naming both and its tile.
  const plaques = (zone.signs ?? []).filter((s) => s.title.includes(' · '));
  assert.equal(plaques.length, MUSEUM_FOLD_MATERIALS.length * MUSEUM_FOLD_LOOKS.length);
  let holds = 0;
  for (const p of plaques) {
    const look = MUSEUM_FOLD_LOOKS.find((l) => p.title.endsWith(` · ${l.name}`));
    assert.ok(look, `plaque "${p.title}" names its look`);
    assert.match(p.lines?.[1] ?? '', /^tile \d+$/);
    const tile = Number((p.lines![1] as string).slice(5));
    // THE PLAQUE TELLS THE TRUTH: a holding pair says so, every other
    // pair promises the ramp.
    if (museumFoldHolds(tile, look!.id)) {
      assert.equal(p.lines?.[0], FOLD_PLAQUE_HOLD, `"${p.title}" holds`);
      holds++;
    } else {
      assert.equal(p.lines?.[0], museumFoldLegend(tile, look!.id), `"${p.title}" prints its legend`);
      assert.ok([FOLD_PLAQUE_RAMP, FOLD_PLAQUE_HELD_ONLY, FOLD_PLAQUE_BANK_ONLY].includes(p.lines?.[0] as string), `"${p.title}" ramps, or says what it answers`);
    }
    // The plaque stands under its strip, on the hall floor, with a
    // reading spot south of it (the plaque law above covers the spot).
    const y = p.y - zone.origin.y;
    assert.ok(wing.rows.some((row) => y === row.y0 + FOLD_BLOCK_H), `plaque "${p.title}" stands under its strip`);
  }
  assert.equal(holds, MUSEUM_FOLD_HOLDS.length, 'every holding pair has its plaque');
  // Every hold names a material the wing shows and a look the wing has.
  for (const [t, l] of MUSEUM_FOLD_HOLDS) {
    assert.ok(MUSEUM_FOLD_MATERIALS.includes(t), `hold tile ${t} is in the wing`);
    assert.ok(MUSEUM_FOLD_LOOKS.some((look) => look.id === l), `hold look ${l} is a wing look`);
  }
  // The header explains the ramp.
  const header = (zone.signs ?? []).find((s) => s.title === 'THE LIVING GROUND');
  assert.ok(header, 'the wing has its header');
  assert.equal(header!.lines?.[0], 'the field ramps west to east:');
});

test('THE RULER READ: the museum stroke set validates, and every cell reads its band on its own axis and 0 on every other', () => {
  const strokes = museumSpectrum();
  assert.equal(strokes.length, MUSEUM_FOLD_LOOKS.length);
  const vetted = validateSpectrumStrokes(strokes, { idRe: /^[a-z][a-z0-9_-]{0,63}$/ });
  assert.deepEqual(vetted.errors, []);
  for (const s of strokes) {
    assert.equal(s.soft, 1, 'the whole hem is the ramp');
    assert.equal(s.grain, 0, 'a clean ruler');
    assert.equal(s.mode, 'max');
    assert.equal(s.shape.kind, 'rect');
    if (s.shape.kind === 'rect') assert.equal(s.shape.pad, FOLD_PAD);
    assert.notEqual(s.bones, true, 'skin only — the museum regenerates nothing');
  }
  const wing = museumFoldWing();
  const prep = prepareStrokes(strokes);
  for (const block of wing.blocks) {
    const axis = spectrumAxisIndex(block.look.axis);
    for (const row of wing.rows) {
      for (let c = 0; c < 4; c++) {
        for (let dx = 0; dx < FOLD_CELL; dx++) {
          for (let dy = 0; dy < FOLD_STRIP_H; dy++) {
            const x = block.stripX + c * FOLD_CELL + dx + 0.5;
            const y = row.stripY + dy + 0.5;
            const v = fieldAxisAt(prep, axis, x, y);
            const q = quant(v);
            assert.equal(band(q), c, `${block.look.name} row ${row.tile} cell ${c} tile (${dx},${dy}) reads band ${band(q)} (${q})`);
            if (c > 0) assert.equal(Math.sign(q), Math.sign(block.look.amp), 'the season sign is the look');
            for (let other = 0; other < 4; other++) {
              if (other === axis) continue;
              assert.equal(quant(fieldAxisAt(prep, other, x, y)), 0, `${block.look.name}: axis ${other} is silent at cell ${c}`);
            }
          }
        }
      }
      // The apron's west tile is summer; the east tile stands on the plateau.
      assert.equal(band(quant(fieldAxisAt(prep, axis, block.x0 + 0.5, row.stripY + 1.5))), 0);
      assert.equal(band(quant(fieldAxisAt(prep, axis, block.x0 + FOLD_BLOCK_W - 0.5, row.stripY + 1.5))), 3);
    }
  }
  // The turn and the flush share the season axis and never reach each other.
  const turn = prepareStrokes(strokes.filter((s) => s.id === 'museum-turn'));
  const flush = prepareStrokes(strokes.filter((s) => s.id === 'museum-flush'));
  const bTurn = wing.blocks.find((b) => b.look.id === 'museum-turn')!;
  const bFlush = wing.blocks.find((b) => b.look.id === 'museum-flush')!;
  for (const row of wing.rows) {
    for (let dx = 0; dx < FOLD_BLOCK_W; dx++) {
      assert.equal(fieldAxisAt(flush, 0, bTurn.x0 + dx + 0.5, row.stripY + 1.5), 0, 'the flush never reaches the turn');
      assert.equal(fieldAxisAt(turn, 0, bFlush.x0 + dx + 0.5, row.stripY + 1.5), 0, 'the turn never reaches the flush');
    }
  }
});

test('THE HEM STAYS HOME: the museum field is silent at every other wing\'s plinth and the piece it labels', () => {
  const zone = buildMuseum();
  const wing = museumFoldWing();
  const prep = prepareStrokes(museumSpectrum());
  const ownPlaque = (title: string): boolean => title === 'THE LIVING GROUND' || title.includes(' · ');
  let checked = 0;
  for (const s of zone.signs ?? []) {
    if (ownPlaque(s.title)) continue;
    const x = s.x - zone.origin.x + 0.5;
    const y = s.y - zone.origin.y + 0.5;
    for (let axis = 0; axis < 4; axis++) {
      assert.equal(quant(fieldAxisAt(prep, axis, x, y)), 0, `"${s.title}" stands in the museum field (axis ${axis})`);
      assert.equal(quant(fieldAxisAt(prep, axis, x, y - 2)), 0, `the piece "${s.title}" labels stands in the field (axis ${axis})`);
    }
    checked++;
  }
  assert.ok(checked > 300, `the other plinths were walked (${checked})`);
  // The pad is real: FOLD_PAD bare rows separate the wing's rows from
  // its neighbours on both sides (the header's own three rows aside).
  const header = (zone.signs ?? []).find((s) => s.title === 'THE LIVING GROUND')!;
  assert.equal(header.y - zone.origin.y, wing.y0 - 2, 'the header stands two rows above the first apron');
  const northOf = (zone.signs ?? []).filter((s) => !ownPlaque(s.title) && s.y - zone.origin.y < wing.y0);
  const southOf = (zone.signs ?? []).filter((s) => !ownPlaque(s.title) && s.y - zone.origin.y >= wing.y1);
  assert.ok(northOf.length > 0 && southOf.length > 0, 'wings stand on both sides');
  const nearestN = Math.max(...northOf.map((s) => s.y - zone.origin.y));
  const nearestS = Math.min(...southOf.map((s) => s.y - zone.origin.y));
  assert.ok(wing.y0 - 1 - nearestN > FOLD_PAD, `the north neighbour's plinth stands past the hem (${wing.y0 - 1 - nearestN})`);
  assert.ok(nearestS - 2 - (wing.y1 + 1) > FOLD_PAD, `the south neighbour's piece stands past the hem (${nearestS - 2 - (wing.y1 + 1)})`);
});
