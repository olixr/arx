import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { NPC_ACTORS } from './actors/registry.js';
import { validateNpcActor } from './actors/validate.js';
import { factionOfActor } from './factions/factions.js';
import { NPCS } from './npcs.js';
import { ROUTINES } from './routines/registry.js';
import { AUTHORED_STANCES } from './stances.js';

// BAND 9a — THE CREATURE-ACTOR PROOF (docs/contested-lands-plan.md §11).
// The fourth people's first body: one Dolmen setter that stands, walks
// and speaks as a creature-bodied actor. This file pins the content half
// of that path: the bestiary row, the actor def, the routine, the four
// strings under THE SET SENTENCE, and the roster the body does NOT join
// yet (no faction membership, no tribe prefix, until a fightable body
// exists in 9b).

const ACTOR_JSON = new URL('./actors/defs/dolmen_setter.json', import.meta.url).pathname;

/** THE SET SENTENCE: whole sentences, no dash of any kind, never a question. */
const SET_SENTENCE = /^[^?\-–—]*\.$/;
/** The content boundary (memory: content-boundaries): the words that never stand. */
const BOUNDARY = /\b(witch\w*|warlock\w*|coven\w*|hex\w*|demon\w*|devil\w*|infernal|occult\w*|hell\w*)\b/i;
/** THE SPINE IS NEVER GESTURED AT: a stone may have moved; nothing is moving. */
const SPINE = /\b(moving|pattern|Gabbro)\b/i;
/** The bar's word never stands inside a Dolmen line. */
const BAR = /\btoll\w*\b/i;
/** No names for topsiders. */
const TOPSIDERS = /\b(Ammat|Sarsen|Drusa|Durrow|Vorl|Garrow|Halvor|Ingram|Brede|Margit|Rurik|Eskil)\b/;

test('THE MARL: the bestiary row the actor wears', () => {
  const def = NPCS.get('dolmen');
  assert.ok(def, 'NPCS holds dolmen');
  assert.equal(def.name, 'Dolmen');
  assert.equal(def.level, 6);
  assert.equal(def.maxHp, 22);
  assert.equal(def.xpReward, 66);
  assert.deepEqual(def.loot, []);
  assert.equal(def.speed, 1.8);
  assert.equal(def.color, '#d9cfbd');
  assert.equal(def.radius, 0.3);
  assert.equal(def.hitHeight, 2.2);
  // A set that never initiates: no pack, no craven, no cone, no heart, no kit.
  assert.equal(def.aggroRange, 0);
  assert.equal(def.pack, undefined);
  assert.equal(def.craven, undefined);
  assert.equal(def.sightArc, undefined);
  assert.equal(def.temperament, undefined);
  assert.equal(def.kit, undefined);
  // 66/22 = 3.0 sits inside xpEconomy's [1.8, 6].
  const ratio = def.xpReward / def.maxHp;
  assert.ok(ratio >= 1.8 && ratio <= 6, `xpReward/maxHp = ${ratio}`);
});

test('THE SETTER: the actor def validates as a creature-bodied, untargetable, nameless throat', () => {
  const raw = JSON.parse(readFileSync(ACTOR_JSON, 'utf8')) as Record<string, unknown>;
  const res = validateNpcActor(raw);
  assert.ok(res.ok, res.ok ? '' : res.errors.join('; '));
  const actor = NPC_ACTORS.get('dolmen_setter');
  assert.ok(actor, 'the registry holds dolmen_setter (gen:registries ran)');
  // The name is the people, the title is the work (the skral_weirward shape).
  assert.equal(actor.name, 'Dolmen');
  assert.equal(actor.title, 'Setter of the Course');
  assert.equal(actor.disposition, 'neutral');
  assert.equal(actor.protection, 'untargetable');
  assert.deepEqual(actor.model, { kind: 'creature', creature: 'dolmen' });
  // No tree, no voice, no combat, no gear, no goods: the bark path only.
  assert.equal(actor.dialogue, undefined);
  // No voice cast: tools/voice/characters.json carries no setter row, so
  // generate.mts skips it and the bark bubble is silent (a valid clip).
  const cast = JSON.parse(readFileSync(new URL('../../../tools/voice/characters.json', import.meta.url).pathname, 'utf8')) as Record<string, unknown>;
  assert.equal(cast['dolmen_setter'], undefined);
  assert.equal(actor.combat, undefined);
  assert.equal(actor.equipment, undefined);
  assert.equal(actor.inventory, undefined);
  assert.ok(actor.examine && actor.examine.length <= 200, 'examine under the 200-char import cap');
  assert.ok(actor.lines && actor.lines.length === 3, 'three lines on the bark path');
});

test('THE FOUR STRINGS: whole sentences, no dash, never a question, boundary-clean, the spine unspoken', () => {
  const actor = NPC_ACTORS.get('dolmen_setter')!;
  const strings = [actor.examine!, ...actor.lines!];
  assert.equal(strings.length, 4);
  // The binding four (blockout §4): the cast lane may not drift from these.
  assert.equal(actor.lines![0], 'We set here.');
  assert.equal(
    actor.lines![1],
    'There are six paces of grass between you and the drop. The drop held when the wet came up and it holds now. Stand where you like.',
  );
  assert.equal(
    actor.lines![2],
    "Nine stones moved on the north lip this year. I have set eight of them back. The ninth is under the sheep man's wall and I have counted it.",
  );
  assert.equal(
    actor.examine,
    'It stands with its hands open before its knees and a chalk bob hung true from the rim of its shoulders. It looked at you once and went back to looking at the ground.',
  );
  for (const s of strings) {
    assert.match(s, SET_SENTENCE, `set sentence: ${s}`);
    assert.doesNotMatch(s, BOUNDARY, `boundary: ${s}`);
    assert.doesNotMatch(s, SPINE, `spine: ${s}`);
    assert.doesNotMatch(s, BAR, `the bar's word: ${s}`);
    assert.doesNotMatch(s, TOPSIDERS, `a topsider named: ${s}`);
    // Every sentence is whole: a capital opens each, a full stop closes each.
    for (const sentence of s.split(/(?<=\.)\s+/)) {
      assert.match(sentence, /^[A-Z].*\.$/, `fragment: ${sentence}`);
    }
  }
  // COUNT BEFORE OPINION: the count line opens on its number.
  assert.match(actor.lines![2], /^Nine stones/);
  // "We set here." is the whole answer and is never enlarged.
  assert.equal(actor.lines![0], 'We set here.');
});

test('THE POST IS THE ORIGIN: dolmen_set is a post with one mid-afternoon wander', () => {
  const routine = ROUTINES.get('dolmen_set');
  assert.ok(routine, 'ROUTINES holds dolmen_set');
  assert.equal(routine.base.kind, 'post');
  // No dir on the post: the placement's facing is kept, so a 9c zone row
  // faces the bowl by its own dir and this file is reused as is.
  assert.equal(routine.base.dir, undefined);
  const slots = routine.slots ?? [];
  assert.equal(slots.length, 1);
  const slot = slots[0]!;
  assert.equal(slot.from, 15);
  assert.equal(slot.to, 16);
  assert.equal(slot.task.kind, 'wander');
  assert.equal(slot.task.kind === 'wander' ? slot.task.radius : NaN, 2);
});

test('THE ROSTER: the setter joins no faction and the dolmen tribe wears no prefix yet', () => {
  assert.equal(factionOfActor('dolmen_setter'), null);
  const tribe = AUTHORED_STANCES.tribes.find((t) => t.id === 'dolmen');
  assert.ok(tribe, 'the dolmen tribe is declared');
  assert.deepEqual(tribe.npcPrefixes, []);
  assert.deepEqual(tribe.actors, []);
  // The bestiary knows exactly one Dolmen body this band; 9b adds the rest.
  assert.deepEqual([...NPCS.keys()].filter((id) => id.startsWith('dolmen')), ['dolmen']);
});
