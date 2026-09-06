import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AUTHORED_STANCES,
  STANCES,
  replaceStances,
  stanceBetween,
  stancePairKey,
  stanceScanRange,
  tribeOfActorId,
  tribeOfNpcId,
  validateStances,
  type StancesDef,
} from './stances.js';
import { FACTIONS } from './factions/factions.js';

function docCopy(): StancesDef {
  return JSON.parse(JSON.stringify(AUTHORED_STANCES)) as StancesDef;
}
/** Every test leaves the live doc as it found it (the module is shared). */
function withDoc(doc: StancesDef, run: () => void): void {
  replaceStances(doc);
  try {
    run();
  } finally {
    replaceStances(docCopy());
  }
}

test('WILD SIDES: bestiary tribes resolve claim → faction prefix → implicit', () => {
  assert.equal(tribeOfNpcId('wolf_oldfang', true), 'predators');
  assert.equal(tribeOfNpcId('dire_boar', true), 'grazers');
  const reaverPrefix = FACTIONS.roster.find((f) => f.id === 'reavers')?.npcPrefixes[0];
  if (reaverPrefix) assert.equal(tribeOfNpcId(`${reaverPrefix}_anything`, true), 'reavers');
  assert.equal(tribeOfNpcId('goblin_champion', true), 'menace');
  assert.equal(tribeOfNpcId('chicken', false), 'wildfolk');
});

test('WILD SIDES: longest prefix claim wins across tribes', () => {
  const doc = docCopy();
  doc.tribes.push({ id: 'oldfangs', name: 'The Oldfangs', npcPrefixes: ['wolf_oldfang'], actors: [] });
  withDoc(doc, () => {
    assert.equal(tribeOfNpcId('wolf_oldfang', true), 'oldfangs');
    assert.equal(tribeOfNpcId('wolf', true), 'predators');
  });
});

test('WILD SIDES: actor tribes resolve slug claim → faction → folk', () => {
  const doc = docCopy();
  doc.tribes.push({ id: 'militia', name: 'Militia', npcPrefixes: [], actors: ['odd_gardener'] });
  withDoc(doc, () => {
    assert.equal(tribeOfActorId('odd_gardener'), 'militia');
  });
  const member = FACTIONS.roster.find((f) => f.members.length > 0);
  if (member) assert.equal(tribeOfActorId(member.members[0]!), member.id);
  assert.equal(tribeOfActorId('some_unaffiliated_grocer'), 'folk');
});

test('WILD SIDES: kin are allies; THE ONE-WAY FEUD reads initiator-side only', () => {
  assert.equal(stanceBetween('predators', 'predators').stance, 'ally');
  const hunt = stanceBetween('predators', 'grazers');
  assert.equal(hunt.stance, 'hostile');
  assert.equal(hunt.range, 6);
  assert.equal(hunt.initiates, true);
  // The prey never OPENS the hunt (proving pass F1) — it answers
  // through forced retaliation only.
  const hunted = stanceBetween('grazers', 'predators');
  assert.equal(hunted.stance, 'hostile');
  assert.equal(hunted.initiates, false);
  assert.equal(stanceScanRange('grazers'), 0);
});

test('WILD SIDES: an ally row extends kin peace across banners', () => {
  const doc = docCopy();
  doc.matrix[stancePairKey('watch_hounds', FACTIONS.roster[0]!.id)] = { stance: 'ally' };
  withDoc(doc, () => {
    assert.equal(stanceBetween('watch_hounds', FACTIONS.roster[0]!.id).stance, 'ally');
    assert.equal(stanceBetween(FACTIONS.roster[0]!.id, 'watch_hounds').stance, 'ally');
    assert.equal(stanceBetween('watch_hounds', FACTIONS.roster[0]!.id).initiates, false);
  });
});

test('THE WATCH ANSWERS: faction vs menace is hostile one-way', () => {
  const watch = stanceBetween('crown', 'menace');
  assert.equal(watch.stance, 'hostile');
  assert.equal(watch.range, STANCES.watchRange);
  assert.equal(watch.initiates, true);
  const mob = stanceBetween('menace', 'crown');
  assert.equal(mob.stance, 'hostile');
  assert.equal(mob.initiates, false);
  // A claimed tribe flying menace: true is still answered...
  assert.equal(stanceBetween('crown', 'predators').stance, 'hostile');
  // ...but a claimed quiet tribe is not (the starter-boar law).
  assert.equal(stanceBetween('crown', 'grazers').stance, 'neutral');
});

test('THE POLITICAL MAP MARCHES: FACTIONS.oppose pairs are hostile both ways', () => {
  const opposedKey = Object.keys(FACTIONS.oppose)[0]!;
  const [a, b] = opposedKey.split('|') as [string, string];
  assert.equal(stanceBetween(a, b).stance, 'hostile');
  assert.equal(stanceBetween(a, b).initiates, true);
  assert.equal(stanceBetween(b, a).initiates, true);
});

test('WILD SIDES: folk and wildfolk fall through to neutral', () => {
  assert.equal(stanceBetween('folk', 'menace').stance, 'neutral');
  assert.equal(stanceBetween('wildfolk', 'crown').stance, 'neutral');
});

test('WILD SIDES: a matrix row outranks the defaults (a truce is authorable)', () => {
  const doc = docCopy();
  doc.matrix[stancePairKey('crown', 'menace')] = { stance: 'neutral' };
  withDoc(doc, () => {
    assert.equal(stanceBetween('crown', 'menace').stance, 'neutral');
  });
});

test('WILD SIDES: spawn-minted tribes feud through the matrix alone', () => {
  const doc = docCopy();
  doc.matrix['goblin_mosstooth|goblin_redfang'] = { stance: 'hostile', range: 7 };
  withDoc(doc, () => {
    const feud = stanceBetween('goblin_redfang', 'goblin_mosstooth');
    assert.equal(feud.stance, 'hostile');
    assert.equal(feud.range, 7);
    assert.equal(stanceScanRange('goblin_redfang'), 7);
  });
});

test('WILD SIDES: stanceScanRange reads 0 for the uninvolved (the cheap gate)', () => {
  assert.equal(stanceScanRange('wildfolk'), 0);
  assert.equal(stanceScanRange('folk'), 0);
  assert.equal(stanceScanRange('menace'), 0); // one-way: the mob never scans
  // Band 8 re-pin: the pack's scan was the hunt's 6 until
  // 'goblin|predators' (range 8, either side opening) landed; a wolf
  // now looks for a worg two tiles further than it looks for a deer.
  assert.equal(stanceScanRange('predators'), 8);
  assert.ok(stanceScanRange('crown') >= STANCES.watchRange);
});

test('WILD SIDES: validator round-trips the shipped doc', () => {
  const res = validateStances(JSON.parse(JSON.stringify(AUTHORED_STANCES)));
  assert.ok(res.ok);
  if (res.ok) assert.deepEqual(res.def, AUTHORED_STANCES);
});

test('WILD SIDES: validator refuses reserved and faction-colliding tribe ids', () => {
  for (const id of ['menace', 'wildfolk', 'folk', FACTIONS.roster[0]!.id]) {
    const res = validateStances({ tribes: [{ id, name: 'X', npcPrefixes: [], actors: [] }] });
    assert.equal(res.ok, false, `tribe id '${id}' must be refused`);
  }
});

test('WILD SIDES: validator refuses malformed matrix keys and unknown fields', () => {
  assert.equal(validateStances({ matrix: { 'b|a': { stance: 'hostile' } } }).ok, false);
  assert.equal(validateStances({ matrix: { 'a|a': { stance: 'hostile' } } }).ok, false);
  assert.equal(validateStances({ matrix: { 'a|b': { stance: 'hostile', foo: 1 } } }).ok, false);
  assert.equal(validateStances({ matrix: { 'a|b': { stance: 'hostile', range: 99 } } }).ok, false);
  assert.equal(validateStances({ nonsense: true }).ok, false);
  // THE ONE-WAY FEUD's own law: the initiator must be one of the pair,
  // and only a hostile entry carries one.
  assert.equal(
    validateStances({ matrix: { 'a|b': { stance: 'hostile', initiator: 'c' } } }).ok,
    false,
  );
  assert.equal(
    validateStances({ matrix: { 'a|b': { stance: 'neutral', initiator: 'a' } } }).ok,
    false,
  );
});

test('THE LAMP ON THE TYPO: unknown matrix sides warn, never refuse', () => {
  const shipped = validateStances(JSON.parse(JSON.stringify(AUTHORED_STANCES)));
  assert.ok(shipped.ok);
  if (shipped.ok) assert.deepEqual(shipped.warnings, []);
  const res = validateStances({ matrix: { 'grazers|predetors': { stance: 'hostile' } } });
  assert.ok(res.ok);
  if (res.ok) {
    assert.equal(res.warnings.length, 1);
    assert.ok(res.warnings[0]!.includes('predetors'));
  }
});

test('ONE NAME, ONE BANNER: duplicate claims across tribes are refused', () => {
  const dupActor = validateStances({
    tribes: [
      { id: 'a_side', name: 'A', npcPrefixes: [], actors: ['odd_gardener'] },
      { id: 'b_side', name: 'B', npcPrefixes: [], actors: ['odd_gardener'] },
    ],
  });
  assert.equal(dupActor.ok, false);
  const dupPrefix = validateStances({
    tribes: [
      { id: 'a_side', name: 'A', npcPrefixes: ['wolf'], actors: [] },
      { id: 'b_side', name: 'B', npcPrefixes: ['wolf'], actors: [] },
    ],
  });
  assert.equal(dupPrefix.ok, false);
});

test('WILD SIDES: a tribe prefix shadowing a faction claim warns', () => {
  const reaverPrefix = FACTIONS.roster.find((f) => f.id === 'reavers')?.npcPrefixes[0];
  if (!reaverPrefix) return;
  const res = validateStances({
    tribes: [{ id: 'poachers', name: 'P', npcPrefixes: [reaverPrefix], actors: [] }],
  });
  assert.ok(res.ok);
  if (res.ok) assert.ok(res.warnings.some((w) => w.includes('reavers')));
});

test('THE BACKFILL LAW: absent dials adopt the shipped defaults', () => {
  const res = validateStances({ matrix: { 'a|b': { stance: 'hostile' } } });
  assert.ok(res.ok);
  if (res.ok) {
    assert.equal(res.def.watchRange, AUTHORED_STANCES.watchRange);
    assert.equal(res.def.watchVsMenace, AUTHORED_STANCES.watchVsMenace);
    assert.deepEqual(res.def.tribes, AUTHORED_STANCES.tribes);
  }
});

test('WILD SIDES: replaceStances deep-copies — the caller doc is never aliased', () => {
  const doc = docCopy();
  withDoc(doc, () => {
    doc.tribes[0]!.npcPrefixes.push('poisoned');
    doc.matrix['grazers|predators']!.range = 1;
    assert.ok(!STANCES.tribes[0]!.npcPrefixes.includes('poisoned'));
    assert.equal(STANCES.matrix['grazers|predators']!.range, 6);
  });
});

// ---- THE CONTESTED LANDS (docs/contested-lands-plan.md §2, §5 beat 7,
// §8): the declared peoples and the neutral rows that ship together.
test('CONTESTED LANDS: the seven tribes are declared and the bestiary reads them', () => {
  for (const id of ['gnoll', 'dead', 'kobold', 'skral', 'legion', 'goblin', 'goblin_doorless', 'dolmen']) {
    assert.ok(AUTHORED_STANCES.tribes.some((t) => t.id === id), `tribe ${id} declared`);
  }
  assert.equal(tribeOfNpcId('gnoll_champion', true), 'gnoll');
  assert.equal(tribeOfNpcId('skeleton_archer', true), 'dead');
  assert.equal(tribeOfNpcId('kobold_digmaster', true), 'kobold');
  assert.equal(tribeOfNpcId('skral_tidelord', true), 'skral');
  assert.equal(tribeOfNpcId('hobgoblin_juggernaut', true), 'legion');
  // Spawn-minted banners: no bestiary claim, so a goblin stays a goblin
  // until a row dresses it (the grubfarm variant, the Sett's own rows).
  assert.equal(tribeOfNpcId('goblin', true), 'menace');
  // Behavior-preserving: the watch still charges every claimed menace.
  for (const t of ['gnoll', 'dead', 'kobold', 'skral', 'legion']) {
    const a = stanceBetween('fordgate', t);
    assert.equal(a.stance, 'hostile', `the watch answers ${t}`);
    assert.equal(a.initiates, true);
  }
  // The Doorless are a farming people the watch does not charge on sight.
  assert.equal(stanceBetween('fordgate', 'goblin_doorless').stance, 'neutral');
});

test('CONTESTED LANDS: the neutral rows coexist, and no hostile row lands in Band 0', () => {
  const neutral = [
    ['goblin_doorless', 'kobold'],
    ['skral', 'reavers'],
    ['predators', 'evencourt'],
    ['crown', 'goblin'],
    ['dolmen', 'kobold'],
    ['dolmen', 'reavers'],
    ['dolmen', 'skral'],
    // The standing feuds that are NEVER blade: opposeHostile would draw
    // steel on these pairs without the truce row.
    ['returners', 'waykeepers'],
    ['fenside', 'fordgate'],
  ] as const;
  for (const [a, b] of neutral) {
    assert.equal(AUTHORED_STANCES.matrix[stancePairKey(a, b)]?.stance, 'neutral', `${a}|${b}`);
    assert.equal(stanceBetween(a, b).stance, 'neutral', `${a} regards ${b}`);
    assert.equal(stanceBetween(b, a).stance, 'neutral', `${b} regards ${a}`);
  }
  // Proof the truce is load-bearing: strip it and the oppose weight bites.
  const doc = docCopy();
  delete doc.matrix['returners|waykeepers'];
  withDoc(doc, () => {
    assert.equal(stanceBetween('returners', 'waykeepers').stance, 'hostile');
  });
  // The zone bands land their hostile rows one at a time behind the
  // FRONTIER doc (plan §8): Band 0 shipped the hunt alone; band 8 (THE
  // HUSK AND THE WARD LINE) landed its three. Band 10's pair is still
  // a comment, so nothing else may stand here.
  const hostile = Object.entries(AUTHORED_STANCES.matrix).filter(([, e]) => e.stance === 'hostile');
  assert.deepEqual(hostile.map(([k]) => k), [
    'grazers|predators',
    'dead|gnoll',
    'goblin|predators',
    'goblin|goblin_doorless',
  ]);
  // The husk's changeover is a fight now that band 8 landed 'dead|gnoll'.
  assert.equal(stanceBetween('dead', 'gnoll').stance, 'hostile');
  // The shipped seed still round-trips its validator with no warnings.
  const res = validateStances(JSON.parse(JSON.stringify(AUTHORED_STANCES)));
  assert.ok(res.ok);
  if (res.ok) assert.deepEqual(res.warnings, []);
  // The Drum's banner is spawn-minted: a goblin body is still a goblin.
  assert.equal(stanceBetween('crown', 'goblin').stance, 'neutral');
  assert.equal(stanceBetween('crown', 'menace').stance, 'hostile');
});

// ---- THE CONTESTED LANDS band 8: THE HUSK AND THE WARD LINE (plan §5
// beats 1-3; band8/blockout.md §8.1 F1). The three hostile rows land
// as the seed wrote them, and THE ONE-WAY FEUD reads each one the way
// its beat needs: the dead open on the squat, the Drum opens on its
// deserters, and worg and wolf open on each other.
test('CONTESTED LANDS band 8: the three rows land and read initiator-side', () => {
  // Beat 1: the line that died charges the squat; the squat answers.
  const dead = stanceBetween('dead', 'gnoll');
  assert.equal(dead.stance, 'hostile');
  assert.equal(dead.range, 10);
  assert.equal(dead.initiates, true);
  const gnoll = stanceBetween('gnoll', 'dead');
  assert.equal(gnoll.stance, 'hostile');
  assert.equal(gnoll.initiates, false);
  // Beat 2: worg against wolf, either side opening, at the shorter reach.
  const worg = stanceBetween('goblin', 'predators');
  assert.equal(worg.stance, 'hostile');
  assert.equal(worg.range, 8);
  assert.equal(worg.initiates, true);
  assert.equal(stanceBetween('predators', 'goblin').initiates, true);
  // Beat 3: the Drum's pickets hunt the Doorless; the Doorless never open it.
  const drum = stanceBetween('goblin', 'goblin_doorless');
  assert.equal(drum.stance, 'hostile');
  assert.equal(drum.range, 10);
  assert.equal(drum.initiates, true);
  assert.equal(stanceBetween('goblin_doorless', 'goblin').initiates, false);
  // The pack still walks the ward line unbothered: the truce row stands.
  assert.equal(stanceBetween('evencourt', 'predators').stance, 'neutral');
  // Band 10's pair is still owed, not landed.
  assert.equal(AUTHORED_STANCES.matrix['dead|goblin_doorless'], undefined);
  assert.equal(AUTHORED_STANCES.matrix['goblin_doorless|legion'], undefined);
  // The seed round-trips its validator with no warnings.
  const res = validateStances(JSON.parse(JSON.stringify(AUTHORED_STANCES)));
  assert.ok(res.ok);
  if (res.ok) assert.deepEqual(res.warnings, []);
});

// ---- THE PREFIX FLIP (contested lands, band 9d, L4's E4; 9c handoff
// 4; rulings R-E): the dolmen tribe wears its prefix now that a body
// stands in the world (Vorl's row on the Sett).
test('CONTESTED LANDS (9d E4): the dolmen tribe wears its prefix, the champion resolves to it, the three neutral rows are live, no hostile row gains a body', () => {
  const tribe = AUTHORED_STANCES.tribes.find((t) => t.id === 'dolmen')!;
  assert.deepEqual(tribe.npcPrefixes, ['dolmen']);
  assert.deepEqual(tribe.actors, []);
  for (const id of ['dolmen', 'dolmen_sinter', 'dolmen_culm', 'dolmen_gossan', 'dolmen_champion']) {
    assert.equal(tribeOfNpcId(id, false), 'dolmen', `${id} wears the tribe`);
  }
  for (const other of ['kobold', 'reavers', 'skral']) {
    assert.equal(stanceBetween('dolmen', other).stance, 'neutral', `dolmen regards ${other}`);
    assert.equal(stanceBetween(other, 'dolmen').stance, 'neutral', `${other} regards dolmen`);
  }
  // A set that never initiates is nobody's menace: the watch does not
  // charge it, and no hostile row names it on either side.
  assert.equal(stanceBetween('fordgate', 'dolmen').stance, 'neutral');
  for (const [key, row] of Object.entries(AUTHORED_STANCES.matrix)) {
    if (row.stance === 'hostile') assert.ok(!key.split('|').includes('dolmen'), `hostile row ${key} names the dolmen`);
  }
  // No faction claims the prefix (there is no dolmen faction: standing never targets them).
  assert.ok(!FACTIONS.roster.some((f) => f.npcPrefixes.some((p) => p.startsWith('dolmen'))));
});
