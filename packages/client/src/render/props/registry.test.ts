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
  // a lost prop. THE SCARRED LAND (K0 THE SHEET) added 36: ids
  // 505..545 minus the five the hall does not hold — the two ruin
  // walls (run painters off the switch), DeadTree (the engine tree
  // switch), FenceBroken and HedgeDead (their families' run painters).
  // LampPostDark moved INTO the hall at K2 (states.ts: a sooted pane,
  // a missing corner, one shard in the contact shade — the LampPost
  // engine case's "flame held at zero" is dead code behind it).
  // Band 8 THE CLAMP added 1: SmolderHeap 548 (smolderHeap.ts), the
  // kit's mint past the two reserved ground ids.
  assert.equal(PROP_PAINTERS.size, 282 + 36 + 1);
});

test('the benches and squares answer; the wilds stay with the engine', () => {
  // Family painters own the crafted world…
  for (const t of [Tile.Well, Tile.Anvil, Tile.Bonfire, Tile.TownFountain, Tile.Gravestone]) {
    assert.ok(PROP_PAINTERS.has(t), `missing painter for tile ${Tile[t]}`);
  }
  // …while growth- and occlusion-entangled tiles stay in objectItem's
  // remaining switch (trees, saplings, rocks, barrier delegations).
  for (const t of [Tile.Tree, Tile.Sapling, Tile.Rock, Tile.Fence, Tile.Hedge,
    // THE SCARRED LAND's engine-switch five: the ruin walls run-merge
    // live, the dead tree is a tree (foliage 0), the broken fence and
    // dead hedge ride their families' run painters.
    Tile.RuinWallStone, Tile.RuinWallWood, Tile.DeadTree, Tile.FenceBroken, Tile.HedgeDead]) {
    assert.ok(!PROP_PAINTERS.has(t), `tile ${Tile[t]} must stay in the engine switch`);
  }
  // …and the kit's hall members answer (the dark lamp among them —
  // the hall is consulted before the switch, so its painter wins).
  for (const t of [Tile.CharredBeam, Tile.EmberBed, Tile.FieldCairn, Tile.SpoilHeap, Tile.GloomStone, Tile.CropBlighted, Tile.LegionStandard, Tile.LeanTo, Tile.SignpostBurnt, Tile.WellFouled, Tile.SluiceGateStrung, Tile.LampPostDark, Tile.SmolderHeap]) {
    assert.ok(PROP_PAINTERS.has(t), `missing painter for tile ${Tile[t]}`);
  }
});
