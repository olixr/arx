import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Tile } from '@arx/shared';
import { DIALOGUES, pickDialogue, type DialogueOffer } from './dialogues/registry.js';
import { dialogueDoneFlag } from './dialogues/types.js';
import type { ZoneDef } from './maps/types.js';
import { routineTaskAt } from './routines/schedule.js';
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
/**
 * THE PREFIX FLIP (band 9d, L4's E4): the dolmen tribe's npcPrefixes.
 * ONE constant for every pin in this file: [] until E4 lands, ['dolmen']
 * after (stances.test.ts owns the flip's own pin; this file follows it).
 */
const DOLMEN_PREFIXES: readonly string[] = ['dolmen'];

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

test('THE ROSTER: the setter joins no faction and the dolmen tribe wears its prefix (9d E4)', () => {
  assert.equal(factionOfActor('dolmen_setter'), null);
  const tribe = AUTHORED_STANCES.tribes.find((t) => t.id === 'dolmen');
  assert.ok(tribe, 'the dolmen tribe is declared');
  assert.deepEqual(tribe.npcPrefixes, DOLMEN_PREFIXES);
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

test('THE ROSTER (9c, re-pinned by 9d): no crown pool; the named four stand, Sarsen waits on 9e', () => {
  const tribe = AUTHORED_STANCES.tribes.find((t) => t.id === 'dolmen')!;
  assert.deepEqual(tribe.npcPrefixes, DOLMEN_PREFIXES, 'the prefix flip is L4\'s E4 (one constant above)');
  assert.deepEqual(tribe.actors, []);
  // 9d's cast lane wrote the four named defs; Sarsen is placed and
  // written by 9e (the meadow patch), never before his ground exists.
  assert.equal(NPC_ACTORS.get('dolmen_sarsen'), undefined, 'dolmen_sarsen is 9e\'s cast lane');
  const dolmenActors = [...NPC_ACTORS.values()].filter((a) => a.id.startsWith('dolmen_'));
  assert.deepEqual(
    dolmenActors.map((a) => a.id).sort(),
    ['dolmen_ammat', 'dolmen_drusa', 'dolmen_durrow', 'dolmen_firekeeper', 'dolmen_setter', 'dolmen_vorl', 'dolmen_weightkeeper', 'dolmen_wetsetter'],
  );
  for (const a of dolmenActors) {
    // The pool spends no name; a named throat spends exactly its own.
    const named = NAMED.find((n) => n.id === a.id);
    assert.equal(a.name, named ? named.name : 'Dolmen', `${a.id} name`);
    assert.equal(a.protection, 'untargetable');
    assert.ok(a.model.kind === 'creature' && a.model.creature.startsWith('dolmen'), `${a.id} wears a Dolmen body`);
    assert.equal(factionOfActor(a.id), null, `${a.id} joins no faction (R-E: no dolmen faction)`);
  }
});

// ===================================================================
// BAND 9d — THE SETT'S CAST (band9d/blockout.md §4, §5; rulings R-C,
// R-F). The four named throats and the mouth on Vorl's row, the one
// loop, every string of §5 under the five regexes and the whole-sentence
// split. The Sett's rows themselves (eleven actor rows and Vorl's spawn
// row) are pinned by maps/sett.test.ts from pins.POSTS; this file pins
// the defs, the trees, the routine and the strings the rows stand on.
// ===================================================================

const DIR_N = -Math.PI / 2;

/** The four named defs: slug, name, title, body, design seed (DOLMEN_DESIGNS, 9c Fix B), the binding lines. */
const NAMED: ReadonlyArray<{ id: string; name: string; title: string; creature: string; seed: number; lines: readonly string[]; examine: string }> = [
  {
    id: 'dolmen_ammat',
    name: 'Ammat',
    title: 'Coursemother of the Marl',
    creature: 'dolmen',
    seed: 17,
    examine:
      'She stands on the lip with her hands open before her knees and a chalk bob hung true from the rim of her shoulders. Her yoke is the lowest on the Sett. She has counted you already.',
    lines: [
      'Nine. Fourteen. Thirty three. Stones moved, by year, topside. Wet, and wains, and bad setting. We set here.',
      'The stake man took forty stones from the north end and carried them to his wet road. We counted them going. We will have forty back, or forty like them. That is not a threat. It is a count.',
      'Six paces from the last stone to the drop. The drop held when the wet came up. The stairs are set. Go down if you like.',
    ],
  },
  {
    id: 'dolmen_drusa',
    name: 'Drusa',
    title: 'Sinter of the wet floor',
    creature: 'dolmen_sinter',
    seed: 23,
    examine:
      "It stands stooped at the water's edge, the tallest hood on the Sett, a milky crust along the rim and a calcite bob hung true. The wet is on it. It has come up to say one thing.",
    lines: ['We stop at the ninth.', 'Four courses wet from the bottom row. The top row last.', 'We set here. Lower.'],
  },
  {
    id: 'dolmen_durrow',
    name: 'Durrow',
    title: 'Culm of the hearth cells',
    creature: 'dolmen_culm',
    seed: 29,
    // The brief's examine ran 204 chars; "along the seam of its mouth"
    // became "along its mouth seam" (the bible's own phrase) to pass
    // the 200-char import cap with the sentence intact.
    examine:
      'It stands on the warm shelf with ember eyes and a red line of dust along its mouth seam, a soot cut in the rim over one shoulder and a black bob hung true. It is the only one of them that is quick.',
    lines: [
      'Cold on you, then. Go and be cold.',
      "The stake man's cart goes by with our kerb on it. Cold on him. He does not hear it. It is still said.",
      'Wood burns out. Stone burns on.',
    ],
  },
  {
    id: 'dolmen_vorl',
    name: 'Vorl Fullweight',
    title: 'Keeper of the weight',
    creature: 'dolmen_champion',
    seed: 7,
    examine:
      'The biggest of them by a head and a hand. Rust hide streaked like old iron, three dull beads along the rim of the yoke, a rust stone bob hung true. Its hands are open. Behind it the row and the cart.',
    lines: [
      'One cart. Twelve wheels of stone. A rope. A row of sticks with glass on them. That is the weight and I keep it.',
      'One stone sets a step. Set it and pass.',
      'Forty from the north end. A wall for forty. The stake man has not come.',
      "The chain man's stakes are level. They stand. The others were not. They are here.",
      'The stone ones under the barrow are unset. We would set them. We are not let.',
    ],
  },
];

/** The 9d trees (9e's ammat_count, durrow_cold, the offers and turn-ins are that run's: brief §5.3, §9, §11.5). */
const TREES_9D = ['ammat_course', 'drusa_ninth', 'durrow_hearth'] as const;

/** Every string a Dolmen says in 9d: the examines, the barks, the tree nodes. */
function dolmenStrings(): Array<{ where: string; s: string }> {
  const out: Array<{ where: string; s: string }> = [];
  for (const n of NAMED) {
    const a = NPC_ACTORS.get(n.id)!;
    out.push({ where: `${n.id}/examine`, s: a.examine! });
    for (const [i, l] of (a.lines ?? []).entries()) out.push({ where: `${n.id}/lines[${i}]`, s: l });
  }
  for (const id of TREES_9D) {
    for (const node of DIALOGUES.get(id)!.nodes) out.push({ where: `${id}/${node.id}`, s: node.text });
  }
  return out;
}

/** The player's plates in the 9d trees (a topsider speaks, as statements). */
function playerStrings(): Array<{ where: string; s: string }> {
  const out: Array<{ where: string; s: string }> = [];
  for (const id of TREES_9D) {
    for (const node of DIALOGUES.get(id)!.nodes) {
      for (const c of node.choices ?? []) out.push({ where: `${id}/${node.id}/choice`, s: c.text });
    }
  }
  return out;
}

function offersFor(actor: string): DialogueOffer[] {
  const out: DialogueOffer[] = [];
  for (const def of DIALOGUES.values()) {
    for (const b of def.bindings ?? []) {
      if (b.kind === 'actor' && b.target === actor) out.push({ def, priority: b.priority ?? 0 });
    }
  }
  return out;
}

test('THE FOUR NAMED (9d): each validates on its stratum, untargetable, neutral, no cast row, no combat, no gear, no goods', () => {
  const cast = JSON.parse(readFileSync(CAST_JSON, 'utf8')) as Record<string, unknown>;
  for (const n of NAMED) {
    const raw = JSON.parse(readFileSync(actorJson(n.id), 'utf8')) as Record<string, unknown>;
    const res = validateNpcActor(raw);
    assert.ok(res.ok, res.ok ? '' : `${n.id}: ${res.errors.join('; ')}`);
    const actor = NPC_ACTORS.get(n.id);
    assert.ok(actor, `the registry holds ${n.id} (gen:registries ran)`);
    assert.equal(actor.name, n.name, `${n.id} name`);
    assert.equal(actor.title, n.title, `${n.id} title`);
    assert.equal(actor.disposition, 'neutral', `${n.id} disposition`);
    // `untargetable` on the mouth `dolmen_vorl` too: inert on the spawn-row
    // path (the row's body is the champion NpcDef; the mouth lends only its
    // barks and examine, and a blow answers), kept so R-C's fallback (the
    // actor door) stands whole if the passthrough is ever pulled.
    assert.equal(actor.protection, 'untargetable', `${n.id} protection`);
    assert.deepEqual(actor.model, { kind: 'creature', creature: n.creature }, `${n.id} wears its stratum`);
    assert.ok(NPCS.has(n.creature), `${n.id}'s body ${n.creature} is a live NPCS id`);
    assert.equal(actor.examine, n.examine, `${n.id} examine drifted from the binding string`);
    assert.ok(actor.examine!.length <= 200, `${n.id} examine under the 200-char import cap`);
    assert.deepEqual(actor.lines, [...n.lines], `${n.id} lines drifted from the binding strings`);
    // No legacy tree slot, no combat, no gear, no goods, no cast row: the
    // trees bind through dialogues/defs; silence is the clip.
    assert.equal(actor.dialogue, undefined, `${n.id} dialogue`);
    assert.equal(actor.combat, undefined, `${n.id} combat`);
    assert.equal(actor.equipment, undefined, `${n.id} equipment`);
    assert.equal(actor.inventory, undefined, `${n.id} inventory`);
    assert.ok(!('routine' in actor), `${n.id} carries no routine (the zone's row does)`);
    assert.equal(cast[n.id], undefined, `${n.id} has no voice cast row`);
    assert.equal(factionOfActor(n.id), null, `${n.id} joins no faction`);
  }
  // No name is spent twice, and none is a pooled body's.
  const names = NAMED.map((n) => n.name);
  assert.equal(new Set(names).size, names.length);
});

test('THE DESIGN SEAM (9c Fix B): the client keys a pinned seed on every named slug', () => {
  // Content cannot import the client; the renderer's table is read as
  // text so the four slugs and their seeds cannot drift apart silently.
  const src = readFileSync(new URL('../../client/src/render/dolmen.ts', import.meta.url).pathname, 'utf8');
  const block = /export const DOLMEN_DESIGNS[^{]*\{([\s\S]*?)\n\};/.exec(src);
  assert.ok(block, 'DOLMEN_DESIGNS stands in client/src/render/dolmen.ts');
  const seeds = new Map<string, number>();
  for (const m of block[1]!.matchAll(/(dolmen_[a-z]+):\s*\{\s*seed:\s*(\d+)\s*\}/g)) seeds.set(m[1]!, Number(m[2]));
  for (const n of NAMED) assert.equal(seeds.get(n.id), n.seed, `${n.id} design seed`);
});

test('THE STRINGS OF §5: every Dolmen string passes the five regexes and the whole-sentence split', () => {
  const strings = dolmenStrings();
  // 4 examines + 3 + 3 + 3 + 5 lines + the trees' nodes (5 + 1 + 3).
  assert.equal(strings.length, 4 + 14 + 9);
  for (const { where, s } of strings) {
    assert.match(s, SET_SENTENCE, `${where}: set sentence: ${s}`);
    assert.doesNotMatch(s, BOUNDARY, `${where}: boundary: ${s}`);
    assert.doesNotMatch(s, SPINE, `${where}: spine: ${s}`);
    assert.doesNotMatch(s, BAR, `${where}: the bar's word: ${s}`);
    assert.doesNotMatch(s, TOPSIDERS, `${where}: a name inside a Dolmen line: ${s}`);
    assert.ok(!s.includes('?'), `${where}: a Dolmen never asks: ${s}`);
    for (const sentence of s.split(/(?<=\.)\s+/)) {
      assert.match(sentence, /^[A-Z].*\.$/, `${where}: fragment: ${sentence}`);
    }
  }
  // The player's plates are statements too, and clean, though a topsider may name.
  for (const { where, s } of playerStrings()) {
    assert.match(s, SET_SENTENCE, `${where}: ${s}`);
    assert.doesNotMatch(s, BOUNDARY, `${where}: ${s}`);
    assert.doesNotMatch(s, BAR, `${where}: ${s}`);
  }
});

test('THE ONE WIT, THE ONE STILE, COUNT BEFORE OPINION: the card\'s allowances spent exactly once', () => {
  const all = dolmenStrings();
  // Ammat's one wit is spent in ammat_course's hub and nowhere else.
  const wit = all.filter(({ s }) => /it minds wrong weight/.test(s));
  assert.deepEqual(wit.map((w) => w.where), ['ammat_course/hub']);
  // The stile law is spoken once in the Sett, by Vorl, and by no tree.
  const stile = all.filter(({ s }) => /One stone sets a step/.test(s));
  assert.deepEqual(stile.map((w) => w.where), ['dolmen_vorl/lines[1]']);
  assert.ok(all.every(({ s }) => !/stile/i.test(s)), 'no other Dolmen names the stile');
  // Count before opinion: the counts open on their numbers.
  assert.match(NPC_ACTORS.get('dolmen_ammat')!.lines![0]!, /^Nine\. Fourteen\. Thirty three\./);
  assert.match(DIALOGUES.get('drusa_ninth')!.nodes[0]!.text, /^Four courses wet/);
  // "We set here." stands whole, never enlarged, in the Marl's mouth and the Sinter's.
  assert.ok(/We set here\.$/.test(NPC_ACTORS.get('dolmen_ammat')!.lines![0]!));
  assert.equal(NPC_ACTORS.get('dolmen_drusa')!.lines![2], 'We set here. Lower.');
  // The Sinter speak only as "we": no first person singular in any Drusa string.
  for (const { where, s } of all.filter((x) => x.where.startsWith('dolmen_drusa') || x.where.startsWith('drusa_'))) {
    assert.doesNotMatch(s, /\bI\b/, `${where}: the Sinter speak as we`);
  }
  // The Culm's one oath opens and closes Durrow, and nobody else says it.
  const oath = all.filter(({ s }) => /Cold on/.test(s));
  assert.ok(oath.length >= 3 && oath.every((o) => /^(dolmen_durrow|durrow_)/.test(o.where)), 'the oath is the Culm\'s alone');
});

test('THE TREES\' RAILS (9d): ammat_course, drusa_ninth, durrow_hearth bound as §5 says; durrow_cold waits on 9e', () => {
  // Ammat: the hub while no quest tree outranks it; the sworn choice is
  // the one stamper of `capstone_counted` (9e's three quests require it)
  // and retires itself; the gap line opens once counted.
  const ammat = DIALOGUES.get('ammat_course')!;
  assert.deepEqual(ammat.bindings, [{ kind: 'actor', target: 'dolmen_ammat', priority: 5 }]);
  assert.equal(ammat.once, undefined);
  assert.equal(ammat.requires, undefined);
  const hub = ammat.nodes.find((n) => n.id === 'hub')!;
  assert.deepEqual(hub.choices!.map((c) => c.text), ['Say the count.', 'The gap.']);
  assert.deepEqual(hub.choices![1]!.requires, ['capstone_counted']);
  const count = ammat.nodes.find((n) => n.id === 'count')!;
  const sworn = count.choices!.find((c) => c.next === 'sworn')!;
  assert.equal(sworn.text, 'I will carry stone.');
  assert.deepEqual(sworn.set, ['capstone_counted']);
  assert.deepEqual(sworn.forbids, ['capstone_counted']);
  assert.equal(count.choices!.find((c) => c.next === 'level')!.text, 'Not today.');
  for (const id of ['sworn', 'level', 'gap']) {
    const n = ammat.nodes.find((x) => x.id === id)!;
    assert.equal(n.next, undefined, `${id} ends`);
    assert.equal(n.choices, undefined, `${id} ends`);
    assert.equal(n.hooks, undefined, `${id} carries no hook (no quest, no give in 9d)`);
  }
  // capstone_counted is stamped by exactly one choice in shipped content.
  let stampers = 0;
  for (const d of DIALOGUES.values()) {
    for (const n of d.nodes) {
      for (const h of n.hooks ?? []) if (h.kind === 'flag' && h.flag === 'capstone_counted') stampers++;
      for (const c of n.choices ?? []) if ((c.set ?? []).includes('capstone_counted')) stampers++;
    }
  }
  assert.equal(stampers, 1, 'the sworn choice is the one stamper of capstone_counted');

  // Drusa: one node, the whole of what the Sinter say.
  const drusa = DIALOGUES.get('drusa_ninth')!;
  assert.deepEqual(drusa.bindings, [{ kind: 'actor', target: 'dolmen_drusa', priority: 5 }]);
  assert.equal(drusa.nodes.length, 1);
  assert.equal(drusa.nodes[0]!.choices, undefined);

  // Durrow: the hearth hub with two doors, the black stone, the oath as the goodbye.
  const hearth = DIALOGUES.get('durrow_hearth')!;
  assert.deepEqual(hearth.bindings, [{ kind: 'actor', target: 'dolmen_durrow', priority: 5 }]);
  const hh = hearth.nodes.find((n) => n.id === 'hub')!;
  assert.deepEqual(hh.choices!.map((c) => [c.text, c.next]), [['Tell me what burns here.', 'stone'], ['Cold on you.', 'cold']]);
  const stone = hearth.nodes.find((n) => n.id === 'stone')!;
  assert.deepEqual(stone.choices!.map((c) => c.next), ['cold']);
  const cold = hearth.nodes.find((n) => n.id === 'cold')!;
  assert.equal(cold.text, 'Cold on you, then. Go and be cold.');
  assert.equal(cold.choices, undefined);
  assert.equal(cold.next, undefined);

  // durrow_cold (the shelf shut on the east fork's A branch by a READ of
  // `dike_planted`, priority 10 over the hearth's 5) is 9e's L3 tree
  // (brief §5.3, §9, §11.5): it lands with 9e's errand proof, never before.
  assert.equal(DIALOGUES.get('durrow_cold'), undefined, 'durrow_cold is 9e\'s');

  // The ladders pick the right mouth.
  const at = (actor: string, flags: Iterable<string>) => {
    const set = new Set(flags);
    return pickDialogue(offersFor(actor), (f) => set.has(f))?.id;
  };
  assert.equal(at('dolmen_ammat', []), 'ammat_course');
  assert.equal(at('dolmen_ammat', ['capstone_counted', dialogueDoneFlag('ammat_course')]), 'ammat_course');
  assert.equal(at('dolmen_drusa', []), 'drusa_ninth');
  assert.equal(at('dolmen_durrow', []), 'durrow_hearth');
  // Until 9e's durrow_cold outranks it, the A side hears the hearth too.
  assert.equal(at('dolmen_durrow', ['dike_planted']), 'durrow_hearth');
  // THE MOUTH ON THE ROW: Vorl has barks and no tree; nothing binds him.
  assert.deepEqual(offersFor('dolmen_vorl'), []);
  assert.equal(NPC_ACTORS.get('dolmen_vorl')!.lines!.length, 5);
  // No 9d tree reads a world: flag or writes a quest (the closed rosters).
  for (const id of TREES_9D) {
    const d = DIALOGUES.get(id)!;
    const reads = [...(d.requires ?? []), ...(d.forbids ?? []), ...d.nodes.flatMap((n) => (n.choices ?? []).flatMap((c) => [...(c.requires ?? []), ...(c.forbids ?? []), ...(c.set ?? [])]))];
    for (const f of reads) assert.ok(/^[a-z][a-z0-9_]*$/.test(f), `${id}: bare character flag '${f}'`);
    for (const n of d.nodes) assert.equal(n.hooks, undefined, `${id}/${n.id}: no hooks in 9d`);
  }
});

test('THE ONE LOOP (R-F): dolmen_wet is a post at 1.0 with the Sinter\'s two walks into the wet and back', () => {
  const routine = ROUTINES.get('dolmen_wet');
  assert.ok(routine, 'ROUTINES holds dolmen_wet');
  assert.equal(routine.base.kind, 'post');
  assert.equal(routine.base.speed, 1.0);
  // No dir on the post: the row's authored facing (W, the ninth course) is kept.
  assert.equal(routine.base.dir, undefined);
  const slots = routine.slots ?? [];
  assert.deepEqual(slots.map((s) => [s.from, s.to]), [[5, 7], [17, 19]]);
  for (const slot of slots) {
    const t = slot.task;
    assert.ok(t.kind === 'path' && t.mode === 'once', 'a walk once into the wet, held, and home');
    assert.equal(t.speed, 1.0);
    // Never a sit, a lie or a work stop in the water (the pond-water law).
    for (const w of t.waypoints) assert.ok(!w.sit && !w.lie && !w.work, 'a plain stand in the wet');
    // THE POST IS THE ORIGIN: (180,296) + (-4,+3) = (176,299), in the water
    // south of the ninth course; 240 s facing north at the courses; then home.
    // (The validator writes every optional key; the JSON shape is the pin.)
    assert.deepEqual(JSON.parse(JSON.stringify(t.waypoints)), [
      { x: -4, y: 3, waitSec: 240, dir: DIR_N, speed: 1.0 },
      { x: 0, y: 0, speed: 1.0 },
    ]);
  }
  // Every leg at exactly 1.0: under dolmen_set's 1.2 and under every
  // bestiary walk (the Sinter's NpcDef 1.4 is the bestiary floor).
  const speeds: number[] = [routine.base.speed!];
  for (const s of slots) if (s.task.kind === 'path') { speeds.push(s.task.speed!); for (const w of s.task.waypoints) speeds.push(w.speed!); }
  assert.ok(speeds.every((v) => v === 1.0), `every leg 1.0: ${speeds.join(',')}`);
  assert.ok(ROUTINES.get('dolmen_set')!.base.speed! > 1.0);
  assert.ok(Math.min(...[...NPCS.values()].map((d) => d.speed)) > 1.0);
  // The schedule answers: the wet at six and at eighteen, the post at noon and at midnight.
  assert.equal(routineTaskAt(routine, 6).kind, 'path');
  assert.equal(routineTaskAt(routine, 18).kind, 'path');
  assert.equal(routineTaskAt(routine, 12).kind, 'post');
  assert.equal(routineTaskAt(routine, 0).kind, 'post');
  // ONE loop: dolmen_wet and dolmen_set are the only dolmen_* routines.
  assert.deepEqual([...ROUTINES.keys()].filter((id) => id.startsWith('dolmen')).sort(), ['dolmen_set', 'dolmen_wet']);
});

test('THE WET LEGS: both of Drusa\'s legs land on WaterShallow at level -2 in the built Sett', async (t) => {
  // The zone is L1's; until maps/sett.ts lands this pin stands aside
  // (the routine's shape is pinned above; worldFit.test.ts sweeps the
  // placed routine once the zone is in its ZONES list).
  const settModule = new URL('./maps/sett.ts', import.meta.url).pathname;
  if (!existsSync(settModule)) {
    t.skip('maps/sett.ts not yet landed (L1): the wet-leg pin waits on the ground');
    return;
  }
  const modPath = './maps/sett.js';
  const mod = (await import(modPath)) as { buildSett: () => ZoneDef };
  const z = mod.buildSett();
  const drusa = (z.actorSpawns ?? []).find((a) => a.actor === 'dolmen_drusa');
  assert.ok(drusa, 'the Sett places dolmen_drusa');
  assert.equal(drusa.routine, 'dolmen_wet');
  const at = (wx: number, wy: number): { tile: number; lvl: number } => {
    const i = (Math.floor(wy) - z.origin.y) * z.width + (Math.floor(wx) - z.origin.x);
    return { tile: z.ground[i]!, lvl: z.elev?.[i] ?? 0 };
  };
  const post = at(drusa.x, drusa.y);
  assert.equal(post.lvl, -2, 'the post stands on the -2 core');
  assert.equal(post.tile, Tile.Dirt, 'the post is the Dirt edge north of the water');
  const wet = at(drusa.x - 4, drusa.y + 3);
  assert.equal(wet.tile, Tile.WaterShallow, 'the stop is in the water south of the ninth course');
  assert.equal(wet.lvl, -2, 'a floor tile is never a rim');
});

test('THE BIBLE AND THE CARD: the four Actor lines read LIVE and Vorl\'s row is the mouth', () => {
  const bible = readFileSync(new URL('../../../docs/dialogue-bible/contested-lands.md', import.meta.url).pathname, 'utf8');
  for (const n of NAMED) {
    assert.ok(new RegExp('`' + n.id + '` \\(LIVE, band 9d').test(bible), `${n.id} is LIVE in the bible`);
  }
  assert.ok(!/`dolmen_champion` crown via `names\[\]`/.test(bible), 'the names[] crown retires (R-C: a named, mouthed row)');
  const card = readFileSync(new URL('../../../docs/VOICE-contested-lands.md', import.meta.url).pathname, 'utf8');
  assert.ok(/\*\*Vorl Fullweight\*\*[\s\S]{0,120}`dolmen_vorl`/.test(card), 'the VOICE card names the mouth');
});

test('THE NAMES GATE: node tools/voice/names.mjs --collide exits 0 over the four new throats', () => {
  const tool = new URL('../../../tools/voice/names.mjs', import.meta.url).pathname;
  const out = execFileSync(process.execPath, [tool, '--collide'], { encoding: 'utf8' });
  assert.match(out, /NAMES GATE: PASS/);
  assert.match(out, /CROSS-TOWN NAME COLLISIONS: 0/);
  // No Dolmen name stands one slip from another person's.
  for (const name of ['Ammat', 'Drusa', 'Durrow', 'Vorl']) {
    assert.ok(!new RegExp(`\\b${name}\\s*~|~\\s*${name}\\b`).test(out), `${name} is in no one-letter pair`);
  }
});
