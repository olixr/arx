import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { NPC_ACTORS } from '../actors/registry.js';
import { DIALOGUES, dialogueEligible, pickDialogue } from './registry.js';
import { dialogueDoneFlag } from './types.js';
import { validateDialogue } from './validate.js';

const DEFS_DIR = new URL('./defs/', import.meta.url).pathname;

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

test('every dialogue binds to a real actor and a sound graph', () => {
  for (const def of DIALOGUES.values()) {
    assert.ok(NPC_ACTORS.has(def.actor), `${def.id}: actor '${def.actor}' exists`);
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

test('pickDialogue: priority wins, completion falls through to the default', () => {
  const maren = [...DIALOGUES.values()].filter((d) => d.actor === 'old_maren');
  assert.equal(maren.length, 2);
  const fresh = pickDialogue(maren, () => false);
  assert.equal(fresh?.id, 'maren_welcome', 'the once-intro outranks the default');
  const flags = new Set([dialogueDoneFlag('maren_welcome')]);
  const after = pickDialogue(maren, (f) => flags.has(f));
  assert.equal(after?.id, 'maren_plaza', 'the repeatable default takes over');

  // Grib: the branch flags pick between two unlocked defaults.
  const grib = [...DIALOGUES.values()].filter((d) => d.actor === 'grib');
  const gribFlags = new Set([dialogueDoneFlag('grib_bands'), 'grib_wary']);
  assert.equal(pickDialogue(grib, (f) => gribFlags.has(f))?.id, 'grib_wary');
  gribFlags.add('grib_friend'); // softened later — friend def ties, id order breaks it
  assert.equal(pickDialogue(grib, (f) => gribFlags.has(f))?.id, 'grib_friend');
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
    actor: 'old_maren',
    start: 'a',
    nodes: [{ id: 'a', text: 'Hello.' }],
  };
  bad({ ...base, id: 'Bad Id!' }, 'must match');
  bad({ ...base, actor: 'nobody' }, 'unknown actor');
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
    actor: 'old_maren',
    start: 'hub',
    nodes: [
      { id: 'hub', text: 'Ask.', choices: [{ text: 'Topic?', next: 'topic' }, { text: 'Bye.' }] },
      { id: 'topic', text: 'An answer.', next: 'hub' },
    ],
  });
  assert.ok(res.ok);
});
