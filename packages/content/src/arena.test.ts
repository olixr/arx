import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ARENAS,
  AUTHORED_ARENAS,
  arenaMatchDef,
  arenaMatchXp,
  arenaPurseTableFor,
  arenaRankForXp,
  arenaTitleFor,
  arenaVenue,
  matchesForVenue,
  replaceArenas,
  totalXpForArenaRank,
  validateArenas,
  xpForArenaRank,
  type ArenasDef,
} from './arena.js';
import { arenaValidateRefsNow } from './arenaRefs.js';
import { LOOT_TABLES } from './loot/tables.js';

function docCopy(): ArenasDef {
  return JSON.parse(JSON.stringify(AUTHORED_ARENAS)) as ArenasDef;
}
/** Every test leaves the live doc as it found it (the module is shared). */
function withDoc(doc: ArenasDef, run: () => void): void {
  replaceArenas(doc);
  try {
    run();
  } finally {
    replaceArenas(docCopy());
  }
}

// ------------------------------------------------------------------
// THE SHIPPED CARD: the authored doc walks the validator whole with
// the FULL registries in hand — every foe, table, and zone reference
// is real. The only tolerated warnings are the two uncast ringmasters
// (Phase 5 casts the throats); anything else dangling fails the build.
// ------------------------------------------------------------------

test('SAND AND ROAR: the authored doc stands against the live registries', () => {
  const res = validateArenas(docCopy(), arenaValidateRefsNow());
  assert.ok(res.ok, res.ok ? '' : res.errors.join('; '));
  if (res.ok) {
    for (const w of res.warnings) {
      assert.match(w, /master 'ringmaster_\w+' names no actor yet/, `unexpected warning: ${w}`);
    }
  }
});

test('SAND AND ROAR: every card pays into a purse table that stands', () => {
  for (const m of AUTHORED_ARENAS.matches) {
    const table = m.lootTable ?? arenaPurseTableFor(m.level);
    assert.ok(LOOT_TABLES.has(table), `match '${m.id}' purse '${table}' names no table`);
  }
});

test('SAND AND ROAR: every crowned entry names a forgeable or crowned body', () => {
  const refs = arenaValidateRefsNow();
  for (const m of AUTHORED_ARENAS.matches) {
    for (const r of m.rounds) {
      for (const e of [...(r.entries ?? []), ...(r.pool?.from ?? [])]) {
        if (e.crown === true) {
          assert.ok(refs.crownable!.has(e.npc), `'${e.npc}' cannot wear a crown`);
        }
      }
    }
  }
});

// ------------------------------------------------------------------
// The ladder
// ------------------------------------------------------------------

test('LADDER: per-rank cost grows, totals invert cleanly, titles band', () => {
  let prev = 0;
  for (let r = 1; r <= ARENAS.ladder.maxRank; r++) {
    const need = xpForArenaRank(r);
    assert.ok(need >= prev, `rank ${r} costs less than rank ${r - 1}`);
    prev = need;
  }
  for (const r of [1, 5, 17, 42, 50]) {
    const total = totalXpForArenaRank(r);
    assert.equal(arenaRankForXp(total), r);
    assert.equal(arenaRankForXp(total - 1), r - 1);
  }
  // The cap holds no matter the fortune.
  assert.equal(arenaRankForXp(Number.MAX_SAFE_INTEGER), ARENAS.ladder.maxRank);
  assert.equal(arenaRankForXp(0), 0);
  assert.equal(arenaTitleFor(0), '');
  assert.equal(arenaTitleFor(1), 'Sandfoot');
  assert.equal(arenaTitleFor(9), 'Roundhand');
  assert.equal(arenaTitleFor(50), 'Champion of the Sands');
});

test('LADDER: the house xp formula pays by level unless the card says', () => {
  assert.equal(arenaMatchXp({ ...AUTHORED_ARENAS.matches[0]!, xp: undefined }), 20 + 4 * 4);
  assert.equal(arenaMatchXp({ ...AUTHORED_ARENAS.matches[0]!, xp: 77 }), 77);
});

// ------------------------------------------------------------------
// The counter
// ------------------------------------------------------------------

test('COUNTER: each venue lists its band, level-ordered; explicit venues override', () => {
  const ford = matchesForVenue('ford_ring');
  assert.ok(ford.length >= 4, 'the Ford Ring lists a real card');
  for (const m of ford) {
    assert.ok(m.level >= 3 && m.level <= 16, `'${m.id}' (L${m.level}) escapes the ford band`);
  }
  for (let i = 1; i < ford.length; i++) {
    assert.ok(ford[i]!.level >= ford[i - 1]!.level, 'the card lists in level order');
  }
  const grand = matchesForVenue('grand_ring');
  assert.ok(grand.some((m) => m.id === 'the_tyrants_turn'), 'the headline card stands');
  assert.ok(!grand.some((m) => m.level < 15), 'the Grand Ring lists no warm-ups');

  const doc = docCopy();
  doc.matches[0]!.venues = ['grand_ring'];
  withDoc(doc, () => {
    assert.ok(!matchesForVenue('ford_ring').some((m) => m.id === doc.matches[0]!.id));
    assert.ok(matchesForVenue('grand_ring').some((m) => m.id === doc.matches[0]!.id));
  });
});

test('COUNTER: replaceArenas swaps the live doc and its indexes whole', () => {
  const doc = docCopy();
  doc.venues[0]!.name = 'The Renamed Ring';
  withDoc(doc, () => {
    assert.equal(arenaVenue('grand_ring')?.name, 'The Renamed Ring');
    assert.equal(arenaMatchDef('the_pen')?.fee, 25);
  });
  assert.equal(arenaVenue('grand_ring')?.name, 'The Grand Ring');
});

// ------------------------------------------------------------------
// The validator's law
// ------------------------------------------------------------------

function expectRefusal(mutate: (doc: ArenasDef) => void, pattern: RegExp): void {
  const doc = docCopy();
  mutate(doc);
  const res = validateArenas(JSON.parse(JSON.stringify(doc)));
  assert.ok(!res.ok, `expected refusal matching ${pattern}`);
  if (!res.ok) {
    assert.ok(
      res.errors.some((e) => pattern.test(e)),
      `no error matched ${pattern}: ${res.errors.join('; ')}`,
    );
  }
}

test('VALIDATOR: unknown keys die loudly at every level', () => {
  expectRefusal((d) => ((d as unknown as Record<string, unknown>).extra = 1), /unknown field 'extra'/);
  expectRefusal(
    (d) => ((d.matches[0] as unknown as Record<string, unknown>).bonus = 1),
    /match '\w+' has unknown field 'bonus'/,
  );
  expectRefusal(
    (d) => ((d.venues[0] as unknown as Record<string, unknown>).music = 'loud'),
    /venue '\w+' has unknown field 'music'/,
  );
  expectRefusal(
    (d) => ((d.dials as unknown as Record<string, unknown>).pityTimer = 1),
    /dials has unknown field 'pityTimer'/,
  );
});

test('VALIDATOR: the dash ban holds the announcer to VOICE law', () => {
  expectRefusal((d) => (d.barks.victory[0] = 'Done — and standing.'), /breaks the dash ban/);
  expectRefusal((d) => (d.matches[0]!.blurb = 'Green fighters… mostly.'), /breaks the dash ban/);
  expectRefusal(
    (d) => (d.matches[0]!.rounds[0]!.bark = 'Round one -- begin.'),
    /breaks the dash ban/,
  );
});

test('VALIDATOR: rounds, bodies, and pools hold their caps', () => {
  expectRefusal((d) => (d.matches[0]!.rounds = []), /needs 1\.\.5 rounds/);
  expectRefusal(
    (d) => {
      d.matches[0]!.rounds = [
        d.matches[0]!.rounds[0]!, d.matches[0]!.rounds[0]!, d.matches[0]!.rounds[0]!,
        d.matches[0]!.rounds[0]!, d.matches[0]!.rounds[0]!, d.matches[0]!.rounds[0]!,
      ];
    },
    /needs 1\.\.5 rounds/,
  );
  expectRefusal(
    (d) => (d.matches[0]!.rounds[0]!.entries![0]!.count = [1, 20]),
    /count must be \[min, max\] integers in \[1, 12\]/,
  );
  expectRefusal(
    (d) => (d.matches[0]!.rounds[0]!.entries = [{ npc: 'goblin', count: [12, 12] }, { npc: 'goblin', count: [12, 12] }]),
    /aliveCap/,
  );
  expectRefusal(
    (d) => (d.matches[0]!.rounds[0]!.pool = { pick: 3, from: [{ npc: 'goblin' }] }),
    /pool must be/,
  );
  expectRefusal(
    (d) => {
      d.matches[0]!.rounds[0]!.entries = undefined as never;
      d.matches[0]!.rounds[0]!.pool = undefined as never;
    },
    /needs entries, a pool, or both/,
  );
});

test('VALIDATOR: cross-refs are errors with the registries in hand', () => {
  const refs = arenaValidateRefsNow();
  const bad = docCopy();
  bad.matches[0]!.rounds[0]!.entries![0]!.npc = 'gobiln';
  let res = validateArenas(JSON.parse(JSON.stringify(bad)), refs);
  assert.ok(!res.ok && res.errors.some((e) => /'gobiln' names no bestiary def/.test(e)));

  const crownless = docCopy();
  crownless.matches[0]!.rounds[0]!.entries![0]! = { npc: 'sheep', crown: true };
  res = validateArenas(JSON.parse(JSON.stringify(crownless)), refs);
  assert.ok(!res.ok && res.errors.some((e) => /cannot wear|no kit with a crown pool/.test(e)));

  const lost = docCopy();
  lost.venues[0]!.pit.x = 99999;
  res = validateArenas(JSON.parse(JSON.stringify(lost)), refs);
  assert.ok(!res.ok && res.errors.some((e) => /lies outside zone/.test(e)));

  const noTable = docCopy();
  noTable.matches[0]!.lootTable = 'arena_purse_t9';
  res = validateArenas(JSON.parse(JSON.stringify(noTable)), refs);
  assert.ok(!res.ok && res.errors.some((e) => /names no table/.test(e)));
});

test('VALIDATOR: the backfill law adopts shipped dials for a sparse doc', () => {
  const res = validateArenas({});
  assert.ok(res.ok);
  if (res.ok) {
    assert.equal(res.def.dials.countdownSec, AUTHORED_ARENAS.dials.countdownSec);
    assert.equal(res.def.venues.length, AUTHORED_ARENAS.venues.length);
    assert.equal(res.def.matches.length, AUTHORED_ARENAS.matches.length);
    assert.equal(res.def.ladder.maxRank, AUTHORED_ARENAS.ladder.maxRank);
    assert.deepEqual(res.def.barks.chest, AUTHORED_ARENAS.barks.chest);
  }
});

test('VALIDATOR: a dead counter warns; ladder titles must ascend', () => {
  const res = validateArenas(
    JSON.parse(
      JSON.stringify({
        ...docCopy(),
        matches: [{ id: 'lone', name: 'Lone Card', level: 50, fee: 1,
          rounds: [{ entries: [{ npc: 'goblin' }] }] }],
      }),
    ),
  );
  assert.ok(res.ok);
  if (res.ok) {
    assert.ok(res.warnings.some((w) => /lists no cards under its band/.test(w)));
  }
  expectRefusal(
    (d) => (d.ladder.titles = [{ rank: 10, title: 'Up' }, { rank: 5, title: 'Down' }]),
    /titles must ascend/,
  );
});

test('VALIDATOR: the proving-pass laws hold (plane, rim, pinned venue)', () => {
  const refs = arenaValidateRefsNow();
  // A typo'd plane is refused with the registry in hand.
  const badPlane = docCopy();
  (badPlane.venues[0] as { plane?: string }).plane = 'not_a_plane';
  let res = validateArenas(JSON.parse(JSON.stringify(badPlane)), refs);
  assert.ok(!res.ok && res.errors.some((e) => /names no standing plane/.test(e)));
  // A pit whose RIM overhangs the zone is refused, center be damned.
  const overhang = docCopy();
  overhang.venues[1]!.pit.x = 590; // east rim 594.5 > amberford's 592 hem
  res = validateArenas(JSON.parse(JSON.stringify(overhang)), refs);
  assert.ok(!res.ok && res.errors.some((e) => /rim.*lies outside zone/.test(e)));
  // A card pinned to an undeclared venue is an ERROR (unlistable),
  // and a pin outside the venue's band is the lamp, not the law.
  const pinned = docCopy();
  pinned.matches[0]!.venues = ['no_such_ring'];
  res = validateArenas(JSON.parse(JSON.stringify(pinned)), refs);
  assert.ok(!res.ok && res.errors.some((e) => /names venue 'no_such_ring'/.test(e)));
  const offBand = docCopy();
  offBand.matches.find((m) => m.id === 'the_tyrants_turn')!.venues = ['ford_ring'];
  res = validateArenas(JSON.parse(JSON.stringify(offBand)), refs);
  assert.ok(res.ok);
  if (res.ok) assert.ok(res.warnings.some((w) => /outside its band/.test(w)));
});

test('PURSE: the laurel is the sand\'s alone (the exclusive law)', () => {
  // sand_laurel lives in arena_purse_t4 and NOWHERE else.
  let homes = 0;
  for (const [id, t] of LOOT_TABLES) {
    const holds = t.entries.some((e) => 'item' in e && e.item === 'sand_laurel');
    if (holds) {
      homes++;
      assert.equal(id, 'arena_purse_t4', `sand_laurel leaked into '${id}'`);
    }
  }
  assert.equal(homes, 1, 'the laurel must stand in exactly one purse');
});

// ------------------------------------------------------------------
// The purse bands
// ------------------------------------------------------------------

test('PURSE: the banded default splits at 10 / 20 / 32', () => {
  assert.equal(arenaPurseTableFor(4), 'arena_purse_t1');
  assert.equal(arenaPurseTableFor(10), 'arena_purse_t1');
  assert.equal(arenaPurseTableFor(11), 'arena_purse_t2');
  assert.equal(arenaPurseTableFor(20), 'arena_purse_t2');
  assert.equal(arenaPurseTableFor(21), 'arena_purse_t3');
  assert.equal(arenaPurseTableFor(32), 'arena_purse_t3');
  assert.equal(arenaPurseTableFor(33), 'arena_purse_t4');
  assert.equal(arenaPurseTableFor(60), 'arena_purse_t4');
});
