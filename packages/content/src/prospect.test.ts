import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GATHER_PROSPECTS, prospectScoreAt } from './prospect.js';
import { NODES } from './nodes.js';
import { WILD_ROSTER, wildEntriesFor } from './wilds.js';
import { WORLD_SEED, elevationAt, groundProbeAt, moistureAt } from './worldgen.js';

test('every prospect names a real node yield, and no deep ore sneaks in', () => {
  const yields = new Set(NODES.map((n) => n.yieldItem));
  for (const item of GATHER_PROSPECTS.keys()) {
    assert.ok(yields.has(item), `prospect '${item}' is not a node yield`);
  }
  // The deep ores live in camps and caves — the prospector must stay
  // silent about them or the chart lies at open meadow.
  for (const deep of ['iron_ore', 'coal', 'gold_ore', 'silver_ore', 'mithril_ore']) {
    assert.ok(!GATHER_PROSPECTS.has(deep), `'${deep}' must not be open-field prospected`);
  }
});

test('the prospector knows water from woodland (live-seed spot checks)', () => {
  // Scan a band of the live world for one honest sample of each of
  // the two commonest families, proving score > 0 agrees with the
  // fields the generator sows from — and that open water scores 0.
  let forest: [number, number] | null = null;
  let meadow: [number, number] | null = null;
  let water: [number, number] | null = null;
  for (let ty = -200; ty <= 200 && !(forest && meadow && water); ty += 7) {
    for (let tx = -200; tx <= 200 && !(forest && meadow && water); tx += 7) {
      const probe = groundProbeAt(WORLD_SEED, tx, ty);
      const m = moistureAt(WORLD_SEED, tx, ty);
      if (!forest && probe === 'forest') forest = [tx, ty];
      if (!meadow && probe === 'grass' && m >= 0.4 && m <= 0.6) meadow = [tx, ty];
      if (!water && elevationAt(WORLD_SEED, tx, ty) < 0.3) water = [tx, ty];
    }
  }
  assert.ok(forest && meadow && water, 'the scan band must hold all three grounds');
  assert.ok(prospectScoreAt(WORLD_SEED, forest![0], forest![1], 'forest') > 0);
  assert.ok(prospectScoreAt(WORLD_SEED, meadow![0], meadow![1], 'meadow') > 0);
  for (const g of ['forest', 'meadow', 'ore_knoll', 'waterside'] as const) {
    assert.equal(prospectScoreAt(WORLD_SEED, water![0], water![1], g), 0, `${g} scored open water`);
  }
});

test('the roster read backward finds the walker and the lead alike', () => {
  const wolf = wildEntriesFor('wolf');
  assert.ok(wolf.length > 0, 'wolves must walk wild');
  for (const e of wolf) assert.ok(e.npc === 'wolf' || e.lead?.npc === 'wolf');
  // A lead-only creature is still findable through its knot.
  const leadOnly = WILD_ROSTER.find((e) => e.lead && e.lead.npc !== e.npc);
  if (leadOnly) {
    assert.ok(wildEntriesFor(leadOnly.lead!.npc).length > 0);
  }
  assert.deepEqual(wildEntriesFor('no_such_beast'), []);
});
