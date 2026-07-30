import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { NPC_ACTORS } from '../actors/registry.js';
import { parseDialogueMarkup, stripDialogueMarkup } from './markup.js';
import { DIALOGUES, dialogueEligible, pickDialogue, type DialogueOffer } from './registry.js';
import { dialogueDoneFlag } from './types.js';
import { validateDialogue } from './validate.js';

const DEFS_DIR = new URL('./defs/', import.meta.url).pathname;

/** All offers a given actor carries, straight from authored bindings. */
function offersFor(actor: string): DialogueOffer[] {
  const out: DialogueOffer[] = [];
  for (const def of DIALOGUES.values()) {
    for (const b of def.bindings ?? []) {
      if (b.kind === 'actor' && b.target === actor) out.push({ def, priority: b.priority ?? 0 });
    }
  }
  return out;
}

test('every defs/*.json file is registered and valid', () => {
  const files = readdirSync(DEFS_DIR).filter((f) => f.endsWith('.json'));
  assert.ok(files.length > 0, 'defs directory holds dialogue files');
  for (const file of files) {
    const raw = JSON.parse(readFileSync(join(DEFS_DIR, file), 'utf8')) as { id?: string };
    const slug = file.replace(/\.json$/, '');
    assert.equal(raw.id, slug, `${file}: filename must equal the dialogue id`);
    assert.ok(DIALOGUES.has(slug), `${file}: missing from the registry SOURCES roster`);
  }
  assert.equal(DIALOGUES.size, files.length, 'registry holds exactly the authored files');
});

test('every dialogue has sound bindings and a sound graph', () => {
  for (const def of DIALOGUES.values()) {
    assert.ok((def.bindings ?? []).length > 0, `${def.id}: shipped trees are bound somewhere`);
    for (const b of def.bindings ?? []) {
      assert.ok(NPC_ACTORS.has(b.target), `${def.id}: binding target '${b.target}' exists`);
    }
    const ids = new Set(def.nodes.map((n) => n.id));
    assert.ok(ids.has(def.start), `${def.id}: start node exists`);
    for (const node of def.nodes) {
      if (node.next) assert.ok(ids.has(node.next), `${def.id}/${node.id}: next resolves`);
      for (const c of node.choices ?? []) {
        if (c.next) assert.ok(ids.has(c.next), `${def.id}/${node.id}: choice resolves`);
      }
    }
  }
});

test('markup: the one parser tokenizes emphasis, foreboding, and items', () => {
  const p = parseDialogueMarkup('Take these — {item:bread}, and mind the *gate*. _Run._');
  assert.deepEqual(p.errors, []);
  assert.deepEqual(p.tokens, [
    { kind: 'text', text: 'Take these — ' },
    { kind: 'item', item: 'bread' },
    { kind: 'text', text: ', and mind the ' },
    { kind: 'em', text: 'gate' },
    { kind: 'text', text: '. ' },
    { kind: 'grim', text: 'Run.' },
  ]);
  assert.equal(
    stripDialogueMarkup('Mind the *gate*. _Run._ {item:bread}'),
    'Mind the gate. Run. bread',
  );
});

test('markup: unbalanced, nested, empty, and ghost directives are refused', () => {
  assert.ok(parseDialogueMarkup('an *unclosed span').errors.length > 0);
  assert.ok(parseDialogueMarkup('a *nested _mess_*').errors.length > 0);
  assert.ok(parseDialogueMarkup('an empty ** span').errors.length > 0);
  assert.ok(parseDialogueMarkup('a {potion:red} ghost').errors.length > 0);
  // ...and the validator carries those refusals plus item existence.
  const bad = validateDialogue({
    id: 'test_markup',
    start: 'a',
    bindings: [{ kind: 'actor', target: 'elder_rowan' }],
    nodes: [{ id: 'a', text: 'a ghost gift: {item:nonsense_loaf}' }],
  });
  assert.ok(!bad.ok && bad.errors.some((e) => e.includes('unknown item')));
});

test('eligibility: once-completion, requires and forbids gate the voice', () => {
  const welcome = DIALOGUES.get('rowan_awakening')!;
  const none = () => false;
  assert.ok(dialogueEligible(welcome, none), 'fresh player gets the awakening');
  const done = new Set([dialogueDoneFlag('rowan_awakening')]);
  assert.ok(!dialogueEligible(welcome, (f) => done.has(f)), 'completed once never re-offers');

  // A requires-gated tree stays silent until its flag is earned.
  const gated = validateDialogue({
    id: 'test_gated',
    start: 'a',
    requires: ['earned_it'],
    bindings: [{ kind: 'actor', target: 'elder_rowan' }],
    nodes: [{ id: 'a', text: 'You earned this.' }],
  });
  assert.ok(gated.ok);
  assert.ok(!dialogueEligible(gated.dialogue, none), 'locked until the flag is earned');
  assert.ok(dialogueEligible(gated.dialogue, (f) => f === 'earned_it'));
});

test('pickDialogue: binding priority wins, completion falls to the default', () => {
  const rowan = offersFor('elder_rowan');
  // Intro + evergreen + the quest offer (gated on quest:...:available,
  // which this test's flag predicates answer false — so picks below
  // exercise the pre-quest ladder unchanged).
  assert.equal(rowan.length, 3);
  const fresh = pickDialogue(rowan, () => false);
  assert.equal(fresh?.id, 'rowan_awakening', 'the once-intro outranks the default');
  const flags = new Set([dialogueDoneFlag('rowan_awakening')]);
  const after = pickDialogue(rowan, (f) => flags.has(f));
  assert.equal(after?.id, 'rowan_green', 'the repeatable default takes over');

  // Branch flags pick between two conditional defaults; a tie on
  // priority breaks by id order (the grib-friend/wary precedent).
  const mk = (id: string, flag: string) => {
    const res = validateDialogue({
      id,
      start: 'a',
      requires: [flag],
      bindings: [{ kind: 'actor', target: 'elder_rowan' }],
      nodes: [{ id: 'a', text: 'Words for a mood.' }],
    });
    assert.ok(res.ok);
    return { def: res.dialogue, priority: 5 };
  };
  const offers = [mk('test_wary', 'mood_wary'), mk('test_friend', 'mood_friend')];
  const moods = new Set(['mood_wary']);
  assert.equal(pickDialogue(offers, (f) => moods.has(f))?.id, 'test_wary');
  moods.add('mood_friend'); // softened later — friend ties, id order breaks it
  assert.equal(pickDialogue(offers, (f) => moods.has(f))?.id, 'test_friend');
});

test('bindings make trees interchangeable: one tree, many targets', () => {
  const res = validateDialogue({
    id: 'test_shared',
    start: 'a',
    bindings: [
      { kind: 'actor', target: 'elder_rowan', priority: 3 },
      { kind: 'actor', target: 'warden_bryn' },
    ],
    nodes: [{ id: 'a', text: 'The same words, wherever they hang.' }],
  });
  assert.ok(res.ok);
  assert.equal(res.dialogue.bindings?.length, 2);
  // The SAME def carries different weights at different targets.
  const atRowan = pickDialogue([{ def: res.dialogue, priority: 3 }], () => false);
  assert.equal(atRowan?.id, 'test_shared');
});

test('validator rejects the dishonest defs', () => {
  const bad = (raw: unknown, needle: string) => {
    const res = validateDialogue(raw);
    assert.ok(!res.ok, `expected rejection for ${needle}`);
    assert.ok(
      res.errors.some((e) => e.includes(needle)),
      `errors mention ${needle}: ${res.errors.join(' | ')}`,
    );
  };
  const base = {
    id: 'test_talk',
    start: 'a',
    bindings: [{ kind: 'actor', target: 'elder_rowan' }],
    nodes: [{ id: 'a', text: 'Hello.' }],
  };
  bad({ ...base, id: 'Bad Id!' }, 'must match');
  bad({ ...base, bindings: [{ kind: 'actor', target: 'nobody' }] }, 'unknown actor');
  bad({ ...base, bindings: [{ kind: 'door', target: 'elder_rowan' }] }, 'unknown');
  bad(
    {
      ...base,
      bindings: [
        { kind: 'actor', target: 'elder_rowan' },
        { kind: 'actor', target: 'elder_rowan' },
      ],
    },
    'duplicates',
  );
  bad({ ...base, start: 'missing' }, 'not a node id');
  bad({ ...base, nodes: [{ id: 'a', text: 'Hi.', next: 'ghost' }] }, 'unknown node');
  bad(
    { ...base, nodes: [{ id: 'a', text: 'Hi.' }, { id: 'b', text: 'Lost.' }] },
    'unreachable',
  );
  bad(
    { ...base, nodes: [{ id: 'a', text: 'Hi.', next: 'a', choices: [{ text: 'And?' }] }] },
    'linear OR a question',
  );
  bad(
    {
      ...base,
      nodes: [
        {
          id: 'a',
          text: 'Pick.',
          choices: [1, 2, 3, 4, 5].map((n) => ({ text: `Option ${n}`, next: undefined })),
        },
      ],
    },
    '1..4 choices',
  );
  bad(
    { ...base, nodes: [{ id: 'a', text: 'Gift.', hooks: [{ kind: 'give', item: 'nonsense', qty: 1 }] }] },
    'unknown item',
  );
  bad(
    { ...base, nodes: [{ id: 'a', text: 'Mark.', hooks: [{ kind: 'flag', flag: 'dlg:cheat' }] }] },
    'must match',
  );
  bad(
    {
      ...base,
      nodes: [{ id: 'a', text: 'Pick.', choices: [{ text: 'Done.', set: ['dlg:rowan_awakening'] }] }],
    },
    'completions are automatic',
  );
});

test('hub cycles are legal: a choice may loop back to its question', () => {
  const res = validateDialogue({
    id: 'test_hub',
    start: 'hub',
    bindings: [{ kind: 'actor', target: 'elder_rowan' }],
    nodes: [
      { id: 'hub', text: 'Ask.', choices: [{ text: 'Topic?', next: 'topic' }, { text: 'Bye.' }] },
      { id: 'topic', text: 'An answer.', next: 'hub' },
    ],
  });
  assert.ok(res.ok);
});

test('the world answers: a closed roster, readable everywhere, writable nowhere', () => {
  const base = {
    id: 'test_world',
    start: 'a',
    bindings: [{ kind: 'actor', target: 'elder_rowan' }],
  };
  // Every rostered world flag gates cleanly at def and choice level.
  const ok = validateDialogue({
    ...base,
    requires: ['world:threat_near'],
    nodes: [
      {
        id: 'a',
        text: 'Trouble stands close.',
        choices: [
          { text: 'How close?', next: 'b', requires: ['world:threat_bold'] },
          { text: 'Never mind.', forbids: ['world:bounty_open'] },
        ],
      },
      { id: 'b', text: 'Close enough to smell the smoke.' },
    ],
  });
  assert.ok(ok.ok, !ok.ok ? ok.errors.join(' | ') : '');
  // A typoed world flag dies in validation, never silently gates.
  const typo = validateDialogue({
    ...base,
    requires: ['world:threat_neat'],
    nodes: [{ id: 'a', text: 'Hi.' }],
  });
  assert.ok(!typo.ok && typo.errors.some((e) => e.includes('not a known world answer')));
  // Nobody writes the world: not a choice...
  const setWorld = validateDialogue({
    ...base,
    nodes: [{ id: 'a', text: 'Pick.', choices: [{ text: 'Calm it.', set: ['world:calm'] }] }],
  });
  assert.ok(!setWorld.ok && setWorld.errors.some((e) => e.includes('nobody writes it')));
  // ...and not a hook (hook flags stay plain slugs).
  const hookWorld = validateDialogue({
    ...base,
    nodes: [{ id: 'a', text: 'Mark.', hooks: [{ kind: 'flag', flag: 'world:calm' }] }],
  });
  assert.ok(!hookWorld.ok);
});

test('the bounty hook: carries nothing, validates clean, unknown kinds still die', () => {
  const base = {
    id: 'test_bounty',
    start: 'a',
    bindings: [{ kind: 'actor', target: 'elder_rowan' }],
  };
  const ok = validateDialogue({
    ...base,
    nodes: [{ id: 'a', text: 'Marked. Go.', hooks: [{ kind: 'bounty' }] }],
  });
  assert.ok(ok.ok, !ok.ok ? ok.errors.join(' | ') : '');
  const bad = validateDialogue({
    ...base,
    nodes: [{ id: 'a', text: 'Hm.', hooks: [{ kind: 'ransom' }] }],
  });
  assert.ok(!bad.ok && bad.errors.some((e) => e.includes("'bounty'")));
});

test('the spoken line: voice refs check grammar always, existence only with a ledger', () => {
  const tree = (voice: string): unknown => ({
    id: 'v_test',
    start: 'a',
    nodes: [{ id: 'a', text: 'Morning.', voice }],
  });

  // Grammar alone (no ledger): a clean slug passes, a dirty one refuses.
  const ok = validateDialogue(tree('dunna_greet_1'));
  assert.ok(ok.ok && ok.dialogue.nodes[0]!.voice === 'dunna_greet_1');
  const dirty = validateDialogue(tree('Not A Slug'));
  assert.ok(!dirty.ok && dirty.errors.some((e) => e.includes('voice must be a voice clip slug')));

  // With the ledger passed (the Studio-save path), existence is law.
  const known = validateDialogue(tree('dunna_greet_1'), { voiceClipIds: new Set(['dunna_greet_1']) });
  assert.ok(known.ok);
  const ghost = validateDialogue(tree('ghost_clip'), { voiceClipIds: new Set(['dunna_greet_1']) });
  assert.ok(!ghost.ok && ghost.errors.some((e) => e.includes("unknown clip 'ghost_clip'")));
});

test('the mood mark: yes/no/hm validate, anything else refuses', () => {
  const tree = (mood: string): unknown => ({
    id: 'm_test',
    start: 'a',
    nodes: [{ id: 'a', text: 'Aye.', mood }],
  });
  const ok = validateDialogue(tree('yes'));
  assert.ok(ok.ok && ok.dialogue.nodes[0]!.mood === 'yes');
  const bad = validateDialogue(tree('angry'));
  assert.ok(!bad.ok && bad.errors.some((e) => e.includes('mood')));
});
