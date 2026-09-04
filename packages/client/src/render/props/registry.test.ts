import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Tile } from '@arx/shared';
import { PROP_PAINTERS } from './index.js';

// THE PROP HALL's ledger. The registry throws at build time on a tile
// registered twice; these pins hold the hall's shape so a family edit
// that drops or double-books a tile fails here, not in a live scene.

test('the hall holds every extracted prop and only those', () => {
  // 282 tile labels moved out of objectItem's switch in F1. A painter
  // added to a family grows this number on purpose; a silent shrink is
  // a lost prop. THE SCARRED LAND (K0 THE SHEET) added 35: ids
  // 505..545 minus the six the hall does not hold — the two ruin
  // walls (run painters off the switch), DeadTree (the engine tree
  // switch), FenceBroken and HedgeDead (their families' run painters),
  // and LampPostDark (the LampPost engine case).
  assert.equal(PROP_PAINTERS.size, 282 + 35);
});

test('the benches and squares answer; the wilds stay with the engine', () => {
  // Family painters own the crafted world…
  for (const t of [Tile.Well, Tile.Anvil, Tile.Bonfire, Tile.TownFountain, Tile.Gravestone]) {
    assert.ok(PROP_PAINTERS.has(t), `missing painter for tile ${Tile[t]}`);
  }
  // …while growth- and occlusion-entangled tiles stay in objectItem's
  // remaining switch (trees, saplings, rocks, barrier delegations).
  for (const t of [Tile.Tree, Tile.Sapling, Tile.Rock, Tile.Fence, Tile.Hedge,
    // THE SCARRED LAND's engine-switch six: the ruin walls run-merge
    // live, the dead tree is a tree (foliage 0), the broken fence and
    // dead hedge ride their families' run painters, the dark lamp is
    // the LampPost case.
    Tile.RuinWallStone, Tile.RuinWallWood, Tile.DeadTree, Tile.FenceBroken, Tile.HedgeDead, Tile.LampPostDark]) {
    assert.ok(!PROP_PAINTERS.has(t), `tile ${Tile[t]} must stay in the engine switch`);
  }
  // …and the kit's hall members answer.
  for (const t of [Tile.CharredBeam, Tile.EmberBed, Tile.FieldCairn, Tile.SpoilHeap, Tile.GloomStone, Tile.CropBlighted, Tile.LegionStandard, Tile.LeanTo, Tile.SignpostBurnt, Tile.WellFouled, Tile.SluiceGateStrung]) {
    assert.ok(PROP_PAINTERS.has(t), `missing painter for tile ${Tile[t]}`);
  }
});
