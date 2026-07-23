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
    bindings: [{ kind: 'actor', target: 'old_maren' }],
    nodes: [{ id: 'a', text: 'a ghost gift: {item:nonsense_loaf}' }],
  });
  assert.ok(!bad.ok && bad.errors.some((e) => e.includes('unknown item')));
});

test('eligibility: once-completion, requires and forbids gate the voice', () => {
  const welcome = DIALOGUES.get('maren_welcome')!;
  const none = () => false;
  assert.ok(dialogueEligible(welcome, none), 'fresh player gets the welcome');
  const done = new Set([dialogueDoneFlag('maren_welcome')]);
  assert.ok(!dialogueEligible(welcome, (f) => done.has(f)), 'completed once never re-offers');

  const friend = DIALOGUES.get('grib_friend')!;
  assert.ok(!dialogueEligible(friend, none), 'locked until the flag is earned');
  assert.ok(dialogueEligible(friend, (f) => f === 'grib_friend'));
});

test('pickDialogue: binding priority wins, completion falls to the default', () => {
  const maren = offersFor('old_maren');
  assert.equal(maren.length, 2);
  const fresh = pickDialogue(maren, () => false);
  assert.equal(fresh?.id, 'maren_welcome', 'the once-intro outranks the default');
  const flags = new Set([dialogueDoneFlag('maren_welcome')]);
  const after = pickDialogue(maren, (f) => flags.has(f));
  assert.equal(after?.id, 'maren_plaza', 'the repeatable default takes over');

  // Grib: the branch flags pick between two unlocked defaults.
  const grib = offersFor('grib');
  const gribFlags = new Set([dialogueDoneFlag('grib_bands'), 'grib_wary']);
  assert.equal(pickDialogue(grib, (f) => gribFlags.has(f))?.id, 'grib_wary');
  gribFlags.add('grib_friend'); // softened later — friend def ties, id order breaks it
  assert.equal(pickDialogue(grib, (f) => gribFlags.has(f))?.id, 'grib_friend');
});

test('bindings make trees interchangeable: one tree, many targets', () => {
  const res = validateDialogue({
    id: 'test_shared',
    start: 'a',
    bindings: [
      { kind: 'actor', target: 'old_maren', priority: 3 },
      { kind: 'actor', target: 'captain_alda' },
    ],
    nodes: [{ id: 'a', text: 'The same words, wherever they hang.' }],
  });
  assert.ok(res.ok);
  assert.equal(res.dialogue.bindings?.length, 2);
  // The SAME def carries different weights at different targets.
  const atMaren = pickDialogue([{ def: res.dialogue, priority: 3 }], () => false);
  assert.equal(atMaren?.id, 'test_shared');
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
    bindings: [{ kind: 'actor', target: 'old_maren' }],
    nodes: [{ id: 'a', text: 'Hello.' }],
  };
  bad({ ...base, id: 'Bad Id!' }, 'must match');
  bad({ ...base, bindings: [{ kind: 'actor', target: 'nobody' }] }, 'unknown actor');
  bad({ ...base, bindings: [{ kind: 'door', target: 'old_maren' }] }, 'unknown');
  bad(
    {
      ...base,
      bindings: [
        { kind: 'actor', target: 'old_maren' },
        { kind: 'actor', target: 'old_maren' },
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
      nodes: [{ id: 'a', text: 'Pick.', choices: [{ text: 'Done.', set: ['dlg:maren_welcome'] }] }],
    },
    'completions are automatic',
  );
});

test('hub cycles are legal: a choice may loop back to its question', () => {
  const res = validateDialogue({
    id: 'test_hub',
    start: 'hub',
    bindings: [{ kind: 'actor', target: 'old_maren' }],
    nodes: [
      { id: 'hub', text: 'Ask.', choices: [{ text: 'Topic?', next: 'topic' }, { text: 'Bye.' }] },
      { id: 'topic', text: 'An answer.', next: 'hub' },
    ],
  });
  assert.ok(res.ok);
});
