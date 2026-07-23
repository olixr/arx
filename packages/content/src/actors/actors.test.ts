import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { EQUIP_SLOTS } from '@devcraft/shared';
import { ITEMS } from '../items.js';
import { NPCS } from '../npcs.js';
import { buildBramblewick } from '../maps/bramblewick.js';
import { zoneFromJson, zoneToJson } from '../maps/serialize.js';
import { actorAppearance, actorCombatDef, HUMANOID_BASE, NPC_ACTORS } from './registry.js';
import { validateNpcActor } from './validate.js';

const DEFS_DIR = new URL('./defs/', import.meta.url).pathname;

test('every defs/*.json file is registered and valid', () => {
  const files = readdirSync(DEFS_DIR).filter((f) => f.endsWith('.json'));
  assert.ok(files.length > 0, 'defs directory holds actor files');
  for (const file of files) {
    const raw = JSON.parse(readFileSync(join(DEFS_DIR, file), 'utf8')) as { id?: string };
    const slug = file.replace(/\.json$/, '');
    assert.equal(raw.id, slug, `${file}: filename must equal the actor id`);
    assert.ok(NPC_ACTORS.has(slug), `${file}: missing from the registry SOURCES roster`);
  }
  assert.equal(NPC_ACTORS.size, files.length, 'registry holds exactly the authored files');
});

test('registry cross-references resolve', () => {
  for (const actor of NPC_ACTORS.values()) {
    if (actor.model.kind === 'creature') {
      assert.ok(NPCS.has(actor.model.creature), `${actor.id}: creature exists`);
    }
    for (const [slot, itemId] of Object.entries(actor.equipment ?? {})) {
      assert.ok(EQUIP_SLOTS.includes(slot as (typeof EQUIP_SLOTS)[number]));
      assert.equal(ITEMS.get(itemId)?.equipSlot, slot, `${actor.id}: ${itemId} fits ${slot}`);
    }
    for (const row of actor.inventory ?? []) {
      assert.ok(ITEMS.has(row.item), `${actor.id}: carries known item ${row.item}`);
    }
  }
});

test('humanoid actors produce wire appearance; creature actors do not', () => {
  const guard = NPC_ACTORS.get('bramblewick_gate_guard')!;
  const app = actorAppearance(guard);
  assert.ok(app);
  assert.equal(app.equip.weapon, 'iron_sword');
  assert.equal(app.look?.beard, 6);

  const grib = NPC_ACTORS.get('grib')!;
  assert.equal(actorAppearance(grib), null);
});

test('combat synthesis: scaled base + overrides + neutral aggro clamp', () => {
  const guard = NPC_ACTORS.get('bramblewick_gate_guard')!;
  const def = actorCombatDef(guard)!;
  assert.equal(def.id, 'actor:bramblewick_gate_guard');
  assert.equal(def.level, 18);
  assert.equal(def.maxHp, 60); // stats override wins over scaling
  assert.equal(def.aggroRange, 0); // neutral never aggros
  assert.equal(def.name, 'Bramblewick Guard');
  assert.deepEqual(def.loot, []);

  const hetty = NPC_ACTORS.get('farmer_hetty')!;
  assert.equal(actorCombatDef(hetty), null); // friendly = unhittable

  // A creature actor with combat but no base derives from its own body.
  const res = validateNpcActor({
    id: 'test_warg',
    name: 'Warg',
    disposition: 'hostile',
    model: { kind: 'creature', creature: 'wolf' },
    combat: { level: 24 },
  });
  assert.ok(res.ok);
  const warg = actorCombatDef(res.actor)!;
  assert.ok(warg.maxHp > NPCS.get('wolf')!.maxHp, 'scaled past the wolf base');
  assert.ok(warg.aggroRange > 0, 'hostile keeps the base aggro');
  assert.equal(warg.pounce, true, 'behavior flags ride along');
});

test('humanoid combat falls back to HUMANOID_BASE', () => {
  const res = validateNpcActor({
    id: 'test_brigand',
    name: 'Brigand',
    disposition: 'hostile',
    model: { kind: 'humanoid', look: {} },
    combat: { level: 10 },
  });
  assert.ok(res.ok);
  const def = actorCombatDef(res.actor)!;
  assert.equal(def.maxHp, HUMANOID_BASE.maxHp);
  assert.equal(def.radius, HUMANOID_BASE.radius);
});

test('validator: partial looks fill from defaults (index stability law)', () => {
  const res = validateNpcActor({
    id: 'test_minimal',
    name: 'Minimal',
    disposition: 'friendly',
    model: { kind: 'humanoid', look: { skin: 3 } },
  });
  assert.ok(res.ok);
  assert.ok(res.actor.model.kind === 'humanoid');
  assert.equal(res.actor.model.look.skin, 3);
  assert.equal(res.actor.model.look.eyes, 0);
});

test('validator rejects the dishonest defs', () => {
  const bad = (raw: unknown, needle: string) => {
    const res = validateNpcActor(raw);
    assert.ok(!res.ok, `expected rejection for ${needle}`);
    assert.ok(
      res.errors.some((e) => e.includes(needle)),
      `errors mention ${needle}: ${res.errors.join(' | ')}`,
    );
  };
  const base = {
    id: 'test_bad',
    name: 'Bad',
    disposition: 'friendly',
    model: { kind: 'humanoid', look: {} },
  };
  bad({ ...base, id: 'Bad Slug!' }, 'must match');
  bad({ ...base, model: { kind: 'creature', creature: 'dragon' } }, 'unknown bestiary');
  bad({ ...base, equipment: { weapon: 'iron_helm' } }, "not 'weapon'");
  bad({ ...base, equipment: { weapon: 'nonsense_blade' } }, 'unknown item');
  bad({ ...base, inventory: [{ item: 'egg', qty: 0 }] }, 'qty');
  bad({ ...base, combat: { level: 5 } }, 'friendly actors cannot');
  bad({ ...base, disposition: 'hostile' }, 'hostile actors require');
  bad(
    { ...base, model: { kind: 'creature', creature: 'goblin' }, equipment: { weapon: 'iron_sword' } },
    'only valid on humanoid',
  );
  bad({ ...base, combat: undefined, model: { kind: 'humanoid', look: { skin: 99 } } }, 'valid look');
});

test('actor placements survive the zone JSON round-trip', () => {
  const zone = buildBramblewick();
  assert.ok(zone.actorSpawns && zone.actorSpawns.length >= 7, 'bramblewick places the roster');
  for (const s of zone.actorSpawns!) {
    assert.ok(NPC_ACTORS.has(s.actor), `placed actor '${s.actor}' exists`);
  }
  const back = zoneFromJson(zoneToJson(zone));
  assert.deepEqual(back.actorSpawns, zone.actorSpawns);
});
