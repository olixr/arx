import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NPC_ACTORS } from '../actors/registry.js';
import { validateDialogue } from '../dialogues/validate.js';
import { validateQuest } from '../quests/validate.js';
import { FACTION_FLAG_RE, parseFactionFlag } from './flags.js';
import {
  AUTHORED_FACTIONS,
  FACTIONS,
  STANDING_CLAMP,
  answerFactionFlag,
  bandAtLeast,
  crossDeltas,
  factionOfActor,
  factionOfNpc,
  replaceFactions,
  standingBand,
  standingPriceMult,
  standingSellMult,
  validateFactions,
} from './factions.js';
import type { FactionsDef } from './types.js';

function docCopy(): FactionsDef {
  return JSON.parse(JSON.stringify(AUTHORED_FACTIONS)) as FactionsDef;
}

test('shipped doc validates and every member is a live actor', () => {
  const res = validateFactions(AUTHORED_FACTIONS);
  assert.ok(res.ok, res.ok ? '' : res.errors.join('; '));
  for (const f of AUTHORED_FACTIONS.roster) {
    for (const m of f.members) assert.ok(NPC_ACTORS.has(m), `${f.id} member ${m} unknown`);
  }
});

test('band law: thresholds map to the seven rungs', () => {
  assert.equal(standingBand(0), 'neutral');
  assert.equal(standingBand(-10), 'suspect');
  assert.equal(standingBand(-9), 'neutral');
  assert.equal(standingBand(-30), 'outlaw');
  assert.equal(standingBand(-60), 'hunted');
  assert.equal(standingBand(-100), 'hunted');
  assert.equal(standingBand(15), 'known');
  assert.equal(standingBand(14), 'neutral');
  assert.equal(standingBand(40), 'trusted');
  assert.equal(standingBand(75), 'champion');
  assert.equal(standingBand(100), 'champion');
  assert.ok(bandAtLeast('trusted', 'known'));
  assert.ok(!bandAtLeast('suspect', 'neutral'));
});

test('faction: grammar parses all three comparisons and refuses typos', () => {
  assert.deepEqual(parseFactionFlag('faction:crown:trusted'), {
    faction: 'crown',
    cmp: 'exact',
    band: 'trusted',
  });
  assert.deepEqual(parseFactionFlag('faction:reavers:atleast:known'), {
    faction: 'reavers',
    cmp: 'atleast',
    band: 'known',
  });
  assert.deepEqual(parseFactionFlag('faction:fordgate:atmost:suspect'), {
    faction: 'fordgate',
    cmp: 'atmost',
    band: 'suspect',
  });
  assert.equal(parseFactionFlag('faction:crown:friendly'), null);
  assert.equal(parseFactionFlag('faction:crown'), null);
  assert.ok(!FACTION_FLAG_RE.test('faction:crown:atleast:'));
});

test('answerFactionFlag compares bands, not values', () => {
  const atleast = parseFactionFlag('faction:crown:atleast:known')!;
  assert.ok(answerFactionFlag(20, atleast));
  assert.ok(answerFactionFlag(90, atleast));
  assert.ok(!answerFactionFlag(0, atleast));
  const atmost = parseFactionFlag('faction:crown:atmost:outlaw')!;
  assert.ok(answerFactionFlag(-40, atmost));
  assert.ok(answerFactionFlag(-70, atmost));
  assert.ok(!answerFactionFlag(-15, atmost));
});

test('membership indexes answer actors and bestiary prefixes', () => {
  assert.equal(factionOfActor('captain_aldis'), 'fordgate');
  assert.equal(factionOfActor('king_aeriex'), 'crown');
  assert.equal(factionOfActor('magpie_mab'), 'rookery');
  assert.equal(factionOfActor('peddler_coff'), null);
  assert.equal(factionOfNpc('brigand_reaver'), 'reavers');
  assert.equal(factionOfNpc('goblin'), null);
});

test('THE BORDER LAW: cross-pay stops at the outlaw line', () => {
  // Slaying a reaver from neutral pays the lawful poles...
  const fromNeutral = crossDeltas('reavers', FACTIONS.deeds.slayMember, 0);
  assert.ok(fromNeutral.some((c) => c.faction === 'fordgate' && c.delta > 0));
  assert.ok(fromNeutral.some((c) => c.faction === 'waykeepers' && c.delta > 0));
  // ...but once you're already their outlaw, nobody thanks you again.
  assert.deepEqual(crossDeltas('reavers', FACTIONS.deeds.slayMember, -35), []);
  // Authored zero never crosses.
  assert.deepEqual(crossDeltas('reavers', 0, 0), []);
});

test('THE LADDER CONTRACT: pinned deed arithmetic', () => {
  // Four enforcer assaults from a clean name = outlaw, not before.
  const perAssault = FACTIONS.deeds.assaultEnforcer;
  assert.equal(standingBand(3 * perAssault), 'suspect');
  assert.equal(standingBand(4 * perAssault), 'outlaw');
  // One slain member from a clean name = outlaw in one act — and the
  // border law then shuts the cross-pay door on the very next kill.
  assert.equal(standingBand(FACTIONS.deeds.slayMember), 'outlaw');
  assert.deepEqual(crossDeltas('reavers', FACTIONS.deeds.slayMember, FACTIONS.deeds.slayMember), []);
  // A fine restores to exactly the suspect floor — inside suspect.
  assert.equal(standingBand(FACTIONS.fineFloor), 'suspect');
  // The clamp holds the meter's ends.
  assert.equal(standingBand(-STANDING_CLAMP), 'hunted');
});

test('THE PRICE OF A NAME: band multipliers and the mirror law', () => {
  assert.equal(standingPriceMult('champion'), FACTIONS.prices.champion);
  assert.equal(standingPriceMult('trusted'), FACTIONS.prices.trusted);
  assert.equal(standingPriceMult('neutral'), 1);
  assert.equal(standingPriceMult('suspect'), FACTIONS.prices.suspect);
  // Outlaw and below never reach a counter — callers refuse first;
  // the function itself answers parity so nothing can underflow.
  assert.equal(standingPriceMult('outlaw'), 1);
  // THE MIRROR LAW: the sell side reflects around parity.
  assert.equal(standingSellMult('champion'), 2 - FACTIONS.prices.champion);
  assert.equal(standingSellMult('suspect'), 2 - FACTIONS.prices.suspect);
  assert.equal(standingSellMult('neutral'), 1);
  // A discount never inverts into paying-you-to-buy.
  for (const b of ['champion', 'trusted', 'known', 'neutral', 'suspect'] as const) {
    assert.ok(standingPriceMult(b) > 0.5 && standingSellMult(b) > 0.5);
  }
});

test('validator refuses the named illegal docs', () => {
  const bad = (mut: (d: FactionsDef) => void, needle: string): void => {
    const d = docCopy();
    mut(d);
    const res = validateFactions(d);
    assert.ok(!res.ok, `expected refusal: ${needle}`);
    assert.ok(
      res.errors.some((e) => e.includes(needle)),
      `wanted '${needle}' in: ${res.errors.join('; ')}`,
    );
  };
  bad((d) => (d.roster[0]!.members = d.roster[0]!.members.concat('no_such_actor')), 'known actor');
  bad((d) => d.roster[1]!.members.push('captain_aldis'), 'belongs to both');
  bad((d) => d.roster[0]!.enforcers.push('banker_cormund2'), 'not a member');
  bad((d) => (d.bands.outlaw = -70), 'hunted < outlaw');
  bad((d) => ((d as unknown as Record<string, unknown>).mystery = 1), "unknown dial 'mystery'");
  bad((d) => (d.oppose['crown|crown'] = 0.5), 'distinct sorted ids');
  bad((d) => (d.oppose['reavers|crown'] = 0.5), 'sorted');
  bad((d) => (d.fineFloor = -40), 'fineFloor');
  bad((d) => (d.peaceBand = 'suspect'), 'peaceBand');
  bad((d) => {
    d.roster[4]!.members = [];
    d.roster[4]!.npcPrefixes = [];
  }, 'needs bodies');
});

test('replaceFactions swaps in place and rebuilds the indexes', () => {
  const edited = docCopy();
  edited.roster.find((f) => f.id === 'reavers')!.npcPrefixes = ['goblin'];
  const before = FACTIONS.roster;
  replaceFactions(edited);
  try {
    assert.equal(factionOfNpc('goblin'), 'reavers');
    assert.equal(factionOfNpc('brigand'), null);
    // Object identity stable — consumers holding FACTIONS see the edit.
    assert.notEqual(FACTIONS.roster, before);
  } finally {
    replaceFactions(JSON.parse(JSON.stringify(AUTHORED_FACTIONS)) as FactionsDef);
  }
  assert.equal(factionOfNpc('brigand'), 'reavers');
});

test('dialogue validator: faction: gates pass, writes refused', () => {
  const tree = (extra: object) => ({
    id: 'reptest',
    start: 'a',
    bindings: [{ kind: 'actor', target: 'captain_aldis' }],
    nodes: [
      {
        id: 'a',
        text: 'Well?',
        choices: [{ text: 'Farewell.', ...extra }],
      },
    ],
  });
  const good = validateDialogue(tree({ requires: ['faction:crown:atleast:known'] }));
  assert.ok(good.ok, good.ok ? '' : good.errors.join('; '));
  const typo = validateDialogue(tree({ requires: ['faction:crown:friendly'] }));
  assert.ok(!typo.ok);
  const ghost = validateDialogue(tree({ requires: ['faction:empire:known'] }));
  assert.ok(!ghost.ok && ghost.errors.some((e) => e.includes('unknown faction')));
  const write = validateDialogue(tree({ set: ['faction:crown:known'] }));
  assert.ok(!write.ok && write.errors.some((e) => e.includes('may not write faction:')));
});

test('dialogue validator: standing hook capped by storyCap', () => {
  const tree = (delta: number, faction = 'rookery') => ({
    id: 'reptest2',
    start: 'a',
    bindings: [{ kind: 'actor', target: 'magpie_mab' }],
    nodes: [{ id: 'a', text: 'Done, then.', hooks: [{ kind: 'standing', faction, delta }] }],
  });
  assert.ok(validateDialogue(tree(5)).ok);
  assert.ok(validateDialogue(tree(-FACTIONS.deeds.storyCap)).ok);
  assert.ok(!validateDialogue(tree(FACTIONS.deeds.storyCap + 1)).ok);
  assert.ok(!validateDialogue(tree(0)).ok);
  assert.ok(!validateDialogue(tree(5, 'empire')).ok);
});

test('quest validator: rewards.standing capped, faction: requires legal', () => {
  const quest = (extra: object) => ({
    id: 'rep_quest',
    name: 'A Name Test',
    giver: 'captain_aldis',
    stages: [{ id: 'go', journal: 'Go.', objectives: [{ kind: 'talk', actor: 'captain_aldis' }] }],
    rewards: { coins: 10 },
    ...extra,
  });
  const good = validateQuest(
    quest({
      rewards: { coins: 10, standing: [{ faction: 'fordgate', delta: 6 }] },
      requires: { flags: ['faction:fordgate:atleast:neutral'] },
    }),
  );
  assert.ok(good.ok, good.ok ? '' : good.errors.join('; '));
  const over = validateQuest(
    quest({ rewards: { standing: [{ faction: 'fordgate', delta: FACTIONS.deeds.questCap + 1 }] } }),
  );
  assert.ok(!over.ok);
  const ghost = validateQuest(quest({ rewards: { standing: [{ faction: 'empire', delta: 5 }] } }));
  assert.ok(!ghost.ok);
  const badGate = validateQuest(quest({ requires: { flags: ['faction:fordgate:sometimes'] } }));
  assert.ok(!badGate.ok);
});
