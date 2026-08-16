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

test('WILD SIDES: kin are allies; the matrix is symmetric hostility', () => {
  assert.equal(stanceBetween('predators', 'predators').stance, 'ally');
  const hunt = stanceBetween('predators', 'grazers');
  assert.equal(hunt.stance, 'hostile');
  assert.equal(hunt.range, 6);
  assert.equal(hunt.initiates, true);
  assert.equal(stanceBetween('grazers', 'predators').initiates, true);
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
  assert.equal(stanceScanRange('predators'), 6);
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
