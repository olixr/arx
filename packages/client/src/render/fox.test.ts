/**
 * Fur-dialect laws for the red skulk: every fox NPC id owns a bespoke
 * look, the smokebrush vixen is a DESIGN and not a scale-up (her own
 * ember-dark coat, the SMOKE tip with its ember ring where the pack
 * flies white, the great ruff, the silvered mask, cold jade eyes),
 * the rank-and-file rolls a COAT CLUSTER from its spawn eid across
 * the four wild coats — ember, frost, dusk, sable (the white fox and
 * the silver fox are real bodies, not tints) — consecutive spawn eids
 * scatter (the hash law), the STOCKING LAW holds (sock ink darker
 * than the coat it walks under), and the loot-story law holds: the
 * pelts the foxes wear really drop.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ABILITIES,
  LOOT_TABLES,
  NPCS,
  PET_REPERTOIRE,
  TAMES,
  petArtDef,
  repertoireFor,
} from '@arx/content';
import { FX_STYLES } from './abilityFx.js';
import { allAbilityIconIds } from './abilityIcons.js';
import { FOX_LOOKS, foxLook } from './rig.js';

test('every fox NPC has its own authored look', () => {
  const foxIds = [...NPCS.keys()].filter((id) => id.startsWith('fox'));
  assert.ok(foxIds.length >= 2, 'the wood fields the fox and the vixen');
  for (const id of foxIds) {
    assert.ok(FOX_LOOKS[id], `${id} must not fall back to a generic reskin`);
  }
  // Unknown future ids degrade to the rank-and-file design, never crash.
  assert.equal(foxLook('fox_new_thing', 7).coat, FOX_LOOKS['fox']!.coat);
});

test('the vixen is a design, not a scale-up', () => {
  const fox = FOX_LOOKS['fox']!;
  const boss = FOX_LOOKS['fox_champion']!;
  assert.ok(fox.backH < boss.backH && fox.bodyW < boss.bodyW, 'the vixen carries the rangier frame');
  assert.notEqual(fox.coat, boss.coat, 'each variant wears its own coat');
  assert.notEqual(fox.tip, boss.tip, 'her flag ends SMOKE where the pack flies white — the inversion detail');
  assert.ok(boss.champion === true && fox.champion !== true, 'only the vixen dresses the great ruff');
  assert.ok(boss.ember && boss.ruff && boss.grizzle && boss.mantle, 'ember ring, ruff, silvered mask, and the burned cross are hers alone');
});

test('the coat clusters: seeded, deterministic, spread, and never on the vixen', () => {
  // Different cluster bits roll different coats...
  const a = foxLook('fox', 5);
  const b = foxLook('fox', 7);
  assert.notEqual(a.coat, b.coat, 'seeds in different clusters wear different coats');
  // ...the same seed always wears the same coat (cached identity)...
  assert.equal(foxLook('fox', 7), b, 'a body keeps its coat frame to frame');
  // ...CONSECUTIVE spawn eids scatter (skulk members spawn adjacent —
  // the hash must dress the earth in more than one coat)...
  const coats = new Set<string>();
  for (let eid = 400; eid < 408; eid++) coats.add(foxLook('fox', eid).coat);
  assert.ok(coats.size >= 3, `eight skulk-mates must spread the clusters, got ${coats.size}`);
  // ...and the vixen never rolls: her design holds at any seed.
  const boss = FOX_LOOKS['fox_champion']!;
  assert.equal(foxLook('fox_champion', 0).coat, boss.coat);
  assert.equal(foxLook('fox_champion', 8).coat, boss.coat);
  assert.equal(foxLook('fox_champion', 8).seed, 8);
});

test('the stocking law: every wild coat walks on darker socks', () => {
  // The sock must read against the coat at world zoom on all four
  // clusters — a same-value sock deletes the stocking read entirely.
  const lum = (hex: string): number =>
    parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
  const seen = new Set<string>();
  for (let eid = 0; eid < 64; eid++) {
    const l = foxLook('fox', eid);
    if (seen.has(l.sock)) continue;
    seen.add(l.sock);
    assert.ok(lum(l.sock) < lum(l.coat), `sock ${l.sock} must run darker than coat ${l.coat}`);
    assert.ok(lum(l.tip) > lum(l.coat), `the flag ${l.tip} must fly brighter than coat ${l.coat}`);
  }
  assert.ok(seen.size >= 3, 'the sweep must have crossed the clusters');
});

test('the skulk hunts as one pack and the vixen screams her own scream', () => {
  const fox = NPCS.get('fox')!;
  const boss = NPCS.get('fox_champion')!;
  assert.equal(fox.pack, 'foxkin');
  assert.equal(boss.pack, 'foxkin', 'pull the vixen, raise the skulk');
  assert.ok(fox.pounce && boss.pounce, 'the mousing dive is anatomy, not kit');
  assert.equal(boss.kit?.[0]?.ability, 'vixens_scream', 'her own voice — never the duskruff\'s borrowed kit');
  assert.equal(boss.kit?.[1]?.ability, 'shrilling_dart', 'the dart that breaks the kiting orbit');
  assert.ok(fox.level < boss.level && fox.maxHp < boss.maxHp);
  assert.ok(fox.speed >= 5.0 && boss.speed > fox.speed, 'nothing in the low wood outruns the skulk, and nothing at all outruns her');
});

test('THE RED SKULK ANSWERS: the keeper courts the fox, and never the crown', () => {
  // The courting round landed 2026-08-18 (the lynx precedent run to
  // its end: the beast shipped first, the courtship came after). The
  // vixen is a sovereign by construction either way.
  assert.ok(TAMES.has('fox'), 'the fox joined the ladder of trust');
  assert.equal(TAMES.get('fox')?.lure, 'raw_chicken', 'the henhouse story, told back to it');
  assert.equal(TAMES.get('fox')?.kit, undefined, 'the wild nip is already the kit');
  assert.ok(!TAMES.has('fox_champion'), 'the vixen kneels for no one');
  // The shelf: the canid pace and bleed, then the skulk's own words.
  const shelf = repertoireFor('fox');
  assert.equal(shelf.length, 6);
  for (const id of ['pack_step', 'blooded_run']) {
    assert.ok(shelf.includes(id), `the canid family word ${id} carries over`);
  }
  for (const id of ['hedge_larder', 'the_wary_one', 'the_hundred_nips', 'the_mousing_dive']) {
    assert.ok(shelf.includes(id), `the skulk's own word ${id} is shelved`);
    assert.ok(
      !Object.entries(PET_REPERTOIRE).some(([sp, ids]) => sp !== 'fox' && ids.includes(id)),
      `${id} is the fox's alone`,
    );
  }
  // The wolf keeps its own teeth: no exclusive of the pack crossed over.
  for (const id of ['hamstring', 'lone_vigil', 'the_first_howl', 'worry_the_wound']) {
    assert.ok(!shelf.includes(id), `${id} stays the wolf's`);
  }
});

test("the dive wears its own face and its own plate", () => {
  // The bespoke-face and spell-plate laws, met at the fox's one word.
  assert.ok(FX_STYLES['the_mousing_dive'], 'the dive has an FX identity');
  assert.ok(
    new Set(allAbilityIconIds()).has('the_mousing_dive'),
    'the dive has a hand-painted plate',
  );
  const ab = ABILITIES.get('the_mousing_dive')!;
  assert.equal(ab.shape, 'leap_slam', 'the fox folds and comes down, it does not charge');
  assert.equal(ab.status?.status, 'bleed', 'the needle teeth stay needle teeth');
  assert.ok(ab.damage > NPCS.get('fox')!.damage, 'the dive out-hits the nip');
  assert.ok(
    (petArtDef('the_mousing_dive')?.windupTicks ?? 0) >= 10,
    'and therefore wears a windup the field can read',
  );
});

test('the loot-story law: the pelts the foxes wear really drop', () => {
  const foxTable = LOOT_TABLES.get('fox')!;
  const bossTable = LOOT_TABLES.get('fox_champion')!;
  assert.ok(foxTable.entries.some((e) => e.item === 'fox_pelt'), 'the flagged pelt drops');
  assert.ok(foxTable.entries.some((e) => e.item === 'raw_chicken'), 'the henhouse story pays');
  assert.ok(bossTable.entries.some((e) => e.item === 'smokebrush_pelt'), 'the ember-dark pelt drops');
  assert.ok(bossTable.entries.some((e) => e.item === 'fox_pelt'), 'the skulk pelts snag in hers');
  assert.ok((bossTable.rarityBonus ?? 0) >= 3, 'the matriarch pays like a champion');
});
