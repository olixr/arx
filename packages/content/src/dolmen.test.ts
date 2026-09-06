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
const CAST_JSON = new URL('../../../tools/voice/characters.json', import.meta.url).pathname;
const actorJson = (slug: string): string => new URL(`./actors/defs/${slug}.json`, import.meta.url).pathname;

/** BAND 9c — THE REMAINING BODIES: the roster in lock-step order (the Marl first). */
const DOLMEN_IDS = ['dolmen', 'dolmen_sinter', 'dolmen_culm', 'dolmen_gossan', 'dolmen_champion'] as const;

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
  // The bestiary knows the five Dolmen bodies in lock-step order (9c).
  assert.deepEqual([...NPCS.keys()].filter((id) => id.startsWith('dolmen')), [...DOLMEN_IDS]);
});

// ===================================================================
// BAND 9c — THE REMAINING BODIES (blockout §3, rulings R-E).
// Four rows on the Marl's shape and three nameless pooled bodies, examine
// only. No crown pool, no named def, no prefix flip, no routine.
// ===================================================================

/** The four 9c rows, every field of blockout §3.1; color = the look's hide. */
const ROWS: Record<string, { name: string; level: number; maxHp: number; xpReward: number; damage: number; speed: number; color: string; radius: number; hitHeight: number }> = {
  dolmen_sinter: { name: 'Dolmen sinter', level: 8, maxHp: 30, xpReward: 90, damage: 3, speed: 1.4, color: '#c3cad0', radius: 0.32, hitHeight: 2.3 },
  dolmen_culm: { name: 'Dolmen culm', level: 9, maxHp: 33, xpReward: 99, damage: 4, speed: 2.2, color: '#5e5b56', radius: 0.3, hitHeight: 2.25 },
  dolmen_gossan: { name: 'Dolmen gossan', level: 11, maxHp: 42, xpReward: 126, damage: 5, speed: 1.8, color: '#a4693f', radius: 0.34, hitHeight: 2.45 },
  dolmen_champion: { name: 'Dolmen fullweight', level: 14, maxHp: 60, xpReward: 180, damage: 6, speed: 2.0, color: '#955f3a', radius: 0.4, hitHeight: 2.7 },
};

/** The three pooled bodies: slug, title, stratum body, and the binding examine (blockout §3.2). */
const POOLED: ReadonlyArray<{ id: string; title: string; creature: string; examine: string }> = [
  {
    id: 'dolmen_wetsetter',
    title: 'Sinter of the ninth course',
    creature: 'dolmen_sinter',
    examine:
      'It stands stooped in the wet with a milky crust along the rim of its shoulders and a calcite bob hung true. It is counting the courses under the water.',
  },
  {
    id: 'dolmen_firekeeper',
    title: 'Keeper of the hearth cell',
    creature: 'dolmen_culm',
    examine:
      'It stands near the hearth cell with ember eyes and a line of red dust along the seam of its mouth. A black bob hangs true from the rim of its shoulders. The heat comes off the stone.',
  },
  {
    id: 'dolmen_weightkeeper',
    title: 'Keeper of the weight',
    creature: 'dolmen_gossan',
    examine:
      'It stands with its big hands open before its knees and three dull iron beads set along the rim of its shoulders. Behind it the taken stakes lie in a row.',
  },
];

test('THE FOUR ROWS: sinter, culm, gossan, champion on the Marl shape at ratio 3.0', () => {
  for (const [id, row] of Object.entries(ROWS)) {
    const def = NPCS.get(id);
    assert.ok(def, `NPCS holds ${id}`);
    assert.equal(def.name, row.name, `${id} name`);
    assert.equal(def.level, row.level, `${id} level`);
    assert.equal(def.maxHp, row.maxHp, `${id} maxHp`);
    assert.equal(def.xpReward, row.xpReward, `${id} xpReward`);
    assert.equal(def.damage, row.damage, `${id} damage`);
    assert.equal(def.speed, row.speed, `${id} speed`);
    assert.equal(def.color, row.color, `${id} color (= the look's hide)`);
    assert.equal(def.radius, row.radius, `${id} radius`);
    assert.equal(def.hitHeight, row.hitHeight, `${id} hitHeight`);
    // Shared with the Marl's row.
    assert.equal(def.attackRange, 1.0, `${id} attackRange`);
    assert.equal(def.attackCooldownTicks, 60, `${id} attackCooldownTicks`);
    assert.equal(def.leashRange, 12, `${id} leashRange`);
    assert.equal(def.respawnSec, 60, `${id} respawnSec`);
    assert.deepEqual(def.loot, [], `${id} loot`);
    // A set that never initiates: no pack, no craven, no cone, no heart, no kit, no bow, no boss.
    assert.equal(def.aggroRange, 0, `${id} aggroRange`);
    assert.equal(def.pack, undefined, `${id} pack`);
    assert.equal(def.craven, undefined, `${id} craven`);
    assert.equal(def.sightArc, undefined, `${id} sightArc`);
    assert.equal(def.temperament, undefined, `${id} temperament`);
    assert.equal(def.kit, undefined, `${id} kit`);
    assert.equal(def.ranged, undefined, `${id} ranged`);
    assert.equal(def.boss, undefined, `${id} boss`);
    // Ratio exactly 3.0, the Marl's 66/22.
    assert.equal(def.xpReward / def.maxHp, 3.0, `${id} xp/hp`);
  }
  // The Sinter is the slowest bestiary body; the Culm the quickest of the set.
  const speeds = [...NPCS.values()].map((d) => d.speed);
  assert.equal(Math.min(...speeds), 1.4, 'the Sinter is the slowest NpcDef speed in the bestiary');
  assert.ok(NPCS.get('dolmen_culm')!.speed > NPCS.get('dolmen_champion')!.speed, 'the Culm outpaces the champion');
});

test('THE THREE POOLED BODIES: examine-only, untargetable, neutral, no name spent, no voice, no tree', () => {
  const cast = JSON.parse(readFileSync(CAST_JSON, 'utf8')) as Record<string, unknown>;
  for (const p of POOLED) {
    const raw = JSON.parse(readFileSync(actorJson(p.id), 'utf8')) as Record<string, unknown>;
    const res = validateNpcActor(raw);
    assert.ok(res.ok, res.ok ? '' : `${p.id}: ${res.errors.join('; ')}`);
    const actor = NPC_ACTORS.get(p.id);
    assert.ok(actor, `the registry holds ${p.id} (gen:registries ran)`);
    // The name is the people, the title is the work (the skral_weirward shape).
    assert.equal(actor.name, 'Dolmen', `${p.id} name`);
    assert.equal(actor.title, p.title, `${p.id} title`);
    assert.equal(actor.disposition, 'neutral', `${p.id} disposition`);
    assert.equal(actor.protection, 'untargetable', `${p.id} protection`);
    assert.deepEqual(actor.model, { kind: 'creature', creature: p.creature }, `${p.id} wears its stratum`);
    assert.ok(NPCS.has(p.creature), `${p.id}'s body ${p.creature} is a live NPCS id`);
    // Examine only: no lines, no tree, no combat, no gear, no goods, no cast row.
    assert.equal(actor.lines, undefined, `${p.id} lines`);
    assert.equal(actor.dialogue, undefined, `${p.id} dialogue`);
    assert.equal(actor.combat, undefined, `${p.id} combat`);
    assert.equal(actor.equipment, undefined, `${p.id} equipment`);
    assert.equal(actor.inventory, undefined, `${p.id} inventory`);
    assert.ok(!('routine' in actor), `${p.id} carries no routine (the zone's, 9d)`);
    assert.equal(cast[p.id], undefined, `${p.id} has no voice cast row`);
    assert.ok(actor.examine && actor.examine.length <= 200, `${p.id} examine under the 200-char import cap`);
    // The roster: no faction membership, the same as the setter.
    assert.equal(factionOfActor(p.id), null, `${p.id} joins no faction`);
  }
});

test('THE THREE EXAMINES: verbatim, whole sentences, no dash, never a question, boundary-clean, the spine unspoken', () => {
  for (const p of POOLED) {
    const actor = NPC_ACTORS.get(p.id)!;
    const s = actor.examine!;
    assert.equal(s, p.examine, `${p.id} examine drifted from the binding string`);
    assert.match(s, SET_SENTENCE, `set sentence: ${s}`);
    assert.doesNotMatch(s, BOUNDARY, `boundary: ${s}`);
    assert.doesNotMatch(s, SPINE, `spine: ${s}`);
    assert.doesNotMatch(s, BAR, `the bar's word: ${s}`);
    assert.doesNotMatch(s, TOPSIDERS, `a topsider named: ${s}`);
    // Never elf, dwarf or golem; never gold (dull iron beads only).
    assert.doesNotMatch(s, /\b(elf|elves|elven|dwarf|dwarves|golem\w*|gold\w*)\b/i, `a negated word: ${s}`);
    for (const sentence of s.split(/(?<=\.)\s+/)) {
      assert.match(sentence, /^[A-Z].*\.$/, `fragment: ${sentence}`);
    }
  }
  // The setter's four strings are untouched by 9c (the 9a pins above hold them verbatim).
  const setter = NPC_ACTORS.get('dolmen_setter')!;
  assert.equal(setter.lines!.length, 3);
});

test('THE ROSTER (9c): the tribe still wears no prefix, no crown pool, no named def', () => {
  const tribe = AUTHORED_STANCES.tribes.find((t) => t.id === 'dolmen')!;
  assert.deepEqual(tribe.npcPrefixes, [], 'the prefix flip is 9d\'s');
  assert.deepEqual(tribe.actors, []);
  for (const slug of ['dolmen_ammat', 'dolmen_sarsen', 'dolmen_drusa', 'dolmen_durrow', 'dolmen_vorl']) {
    assert.equal(NPC_ACTORS.get(slug), undefined, `${slug} is 9d's cast lane`);
  }
  // Every Dolmen actor is a pooled, nameless, untargetable body on a dolmen* creature.
  const dolmenActors = [...NPC_ACTORS.values()].filter((a) => a.id.startsWith('dolmen_'));
  assert.deepEqual(
    dolmenActors.map((a) => a.id).sort(),
    ['dolmen_firekeeper', 'dolmen_setter', 'dolmen_weightkeeper', 'dolmen_wetsetter'],
  );
  for (const a of dolmenActors) {
    assert.equal(a.name, 'Dolmen', `${a.id} spends no name`);
    assert.equal(a.protection, 'untargetable');
    assert.ok(a.model.kind === 'creature' && a.model.creature.startsWith('dolmen'), `${a.id} wears a Dolmen body`);
  }
});
