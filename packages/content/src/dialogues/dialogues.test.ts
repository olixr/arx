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
    bindings: [{ kind: 'actor', target: 'keeper_wren' }],
    nodes: [{ id: 'a', text: 'a ghost gift: {item:nonsense_loaf}' }],
  });
  assert.ok(!bad.ok && bad.errors.some((e) => e.includes('unknown item')));
});

test('eligibility: once-completion, requires and forbids gate the voice', () => {
  const welcome = DIALOGUES.get('wren_awakening')!;
  const none = () => false;
  assert.ok(dialogueEligible(welcome, none), 'fresh player gets the awakening');
  const done = new Set([dialogueDoneFlag('wren_awakening')]);
  assert.ok(!dialogueEligible(welcome, (f) => done.has(f)), 'completed once never re-offers');

  // A requires-gated tree stays silent until its flag is earned.
  const gated = validateDialogue({
    id: 'test_gated',
    start: 'a',
    requires: ['earned_it'],
    bindings: [{ kind: 'actor', target: 'keeper_wren' }],
    nodes: [{ id: 'a', text: 'You earned this.' }],
  });
  assert.ok(gated.ok);
  assert.ok(!dialogueEligible(gated.dialogue, none), 'locked until the flag is earned');
  assert.ok(dialogueEligible(gated.dialogue, (f) => f === 'earned_it'));
});

test('pickDialogue: binding priority wins, completion falls to the default', () => {
  const wren = offersFor('keeper_wren');
  // Intro + evergreen + first_light's offer and turn-in + the
  // capstone's offer (all gated on quest:...:available/:ready, which
  // this test's flag predicates answer false — so picks below
  // exercise the pre-quest ladder unchanged).
  assert.equal(wren.length, 5);
  const fresh = pickDialogue(wren, () => false);
  assert.equal(fresh?.id, 'wren_awakening', 'the once-intro outranks the default');
  const flags = new Set([dialogueDoneFlag('wren_awakening')]);
  const after = pickDialogue(wren, (f) => flags.has(f));
  assert.equal(after?.id, 'wren_green', 'the repeatable default takes over');

  // Branch flags pick between two conditional defaults; a tie on
  // priority breaks by id order (the grib-friend/wary precedent).
  const mk = (id: string, flag: string) => {
    const res = validateDialogue({
      id,
      start: 'a',
      requires: [flag],
      bindings: [{ kind: 'actor', target: 'keeper_wren' }],
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
      { kind: 'actor', target: 'keeper_wren', priority: 3 },
      { kind: 'actor', target: 'yardmaster_halla' },
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
    bindings: [{ kind: 'actor', target: 'keeper_wren' }],
    nodes: [{ id: 'a', text: 'Hello.' }],
  };
  bad({ ...base, id: 'Bad Id!' }, 'must match');
  bad({ ...base, bindings: [{ kind: 'actor', target: 'nobody' }] }, 'unknown actor');
  bad({ ...base, bindings: [{ kind: 'door', target: 'keeper_wren' }] }, 'unknown');
  bad(
    {
      ...base,
      bindings: [
        { kind: 'actor', target: 'keeper_wren' },
        { kind: 'actor', target: 'keeper_wren' },
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
      nodes: [{ id: 'a', text: 'Pick.', choices: [{ text: 'Done.', set: ['dlg:wren_awakening'] }] }],
    },
    'completions are automatic',
  );
});

test('hub cycles are legal: a choice may loop back to its question', () => {
  const res = validateDialogue({
    id: 'test_hub',
    start: 'hub',
    bindings: [{ kind: 'actor', target: 'keeper_wren' }],
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
    bindings: [{ kind: 'actor', target: 'keeper_wren' }],
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
    bindings: [{ kind: 'actor', target: 'keeper_wren' }],
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

// ---- THE CONTESTED LANDS band 7: the fen waist's mouths (band7/blockout.md
// §5). The priority ladders are the whole of how a voice turns: a gated
// tree outranks the hub by the number this pins, and a `once` bark
// falls back to the ladder below it the day after it is said.
test('CONTESTED LANDS: the fen waist ladders pick the right mouth', () => {
  const at = (actor: string, flags: Iterable<string>) => {
    const set = new Set(flags);
    return pickDialogue(offersFor(actor), (f) => set.has(f))?.id;
  };
  // Halvor: hub, then the offers, then cold, then the string once, then the fine.
  assert.equal(at('fenside_halvor', []), 'halvor_crofts');
  assert.equal(at('fenside_halvor', ['quest:the_old_gate:available']), 'q_the_old_gate_offer');
  assert.equal(at('fenside_halvor', ['weir_cut']), 'halvor_cold');
  assert.equal(at('fenside_halvor', ['weir_cut', 'halvor_string_carried']), 'halvor_string');
  assert.equal(
    at('fenside_halvor', ['halvor_string_carried', dialogueDoneFlag('halvor_string')]),
    'halvor_crofts',
  );
  assert.equal(at('fenside_halvor', ['weir_cut', 'faction:fenside:atmost:outlaw']), 'halvor_fine');
  // Ingram: hub, the offers, the bill above the hub once B is done and the bill is offerable.
  assert.equal(at('charter_ingram', []), 'ingram_dike');
  assert.equal(at('charter_ingram', ['quest:stakes_in_the_waist:available']), 'q_stakes_in_the_waist_offer');
  assert.equal(
    at('charter_ingram', ['quest:the_green_road:done', 'quest:the_obstruction_bill:available']),
    'ingram_obstruction',
  );
  assert.equal(at('charter_ingram', ['quest:the_green_road:done']), 'ingram_dike');
  // Hale: the First Lamp's tree outranks the old post; the chalk bark once above it.
  assert.equal(at('waykeeper_hale', []), 'hale_lamp');
  assert.equal(at('waykeeper_hale', ['quest:the_green_road:done']), 'hale_toll_walked');
  assert.equal(
    at('waykeeper_hale', ['quest:the_green_road:done', dialogueDoneFlag('hale_toll_walked')]),
    'hale_lamp',
  );
  // The skral: the wave, the turned back, the long wave.
  assert.equal(at('skral_weirward', []), 'skral_weir');
  assert.equal(at('skral_weirward', ['weir_cut']), 'skral_weir_cut');
  assert.equal(at('skral_weirward', ['weir_cut', 'halvor_string_carried']), 'skral_weir_paid');
  // Margit: the stakes once (retired by its own flag), the ledger shut to B.
  assert.equal(at('charter_margit', ['quest:stakes_in_the_waist:active']), 'margit_stakes');
  assert.equal(at('charter_margit', ['quest:stakes_in_the_waist:active', 'stakes_taken']), undefined);
  assert.equal(at('charter_margit', ['quest:the_green_road:done']), 'margit_ledger_closed');
  // Weir: the dried line once, then the pier as before.
  assert.equal(at('angler_weir', ['weir_cut', dialogueDoneFlag('weir_line')]), 'weir_dried');
  assert.equal(
    at('angler_weir', ['weir_cut', dialogueDoneFlag('weir_line'), dialogueDoneFlag('weir_dried')]),
    'weir_pier',
  );
  // Brede's paper choice is the pass's one door; the skral say no word.
  const brede = DIALOGUES.get('brede_bar')!;
  const paper = brede.nodes.find((n) => n.id === 'hub')!.choices!.find((c) => c.next === 'paper')!;
  assert.deepEqual(paper.requires, ['charter_pass']);
  for (const id of ['skral_weir', 'skral_weir_cut', 'skral_weir_paid']) {
    for (const n of DIALOGUES.get(id)!.nodes) assert.ok(!/"/.test(n.text), `${id}: wordless prose`);
  }
});

// ---- THE CONTESTED LANDS band 8: THE HUSK AND THE WARD LINE (band8/
// blockout.md §5, §6.0). The priority ladders are the whole of how the
// north's voices turn. Where the brief's numbers would have hidden an
// offer behind a standing line, the offer was lifted above it and the
// pin below is the proof; where a hub already held four choices, THE
// DOOR BACK rides the topic node nearest the errand.
const BAND8_TREES = [
  'torsten_slate', 'torsten_kept', 'torsten_watch_uneasy', 'torsten_watch_relief',
  'q_the_towers_debt_offer', 'q_the_towers_debt_turnin', 'q_the_order_pays_offer',
  'q_the_order_pays_turnin', 'hale_first_line_burnt', 'hale_aske_coin', 'aske_coin',
  'sentinel_cut', 'sentinel_whole', 'sentinel_alder', 'sentinel_feller',
  'q_keep_the_thread_offer', 'q_keep_the_thread_reoffer', 'q_keep_the_thread_turnin',
  'q_the_stone_at_dusk_offer', 'q_the_stone_at_dusk_reoffer', 'q_the_stone_at_dusk_turnin',
  'bodil_cut', 'bodil_licence', 'bodil_licence_stopped', 'bodil_cut_seen',
  'q_wool_count_offer', 'q_wool_count_turnin', 'q_the_fleece_offer', 'q_the_fleece_turnin',
  'sorrel_left_wolves', 'sorrel_stalls',
  'q_the_grey_root_offer', 'q_the_grey_root_turnin', 'q_the_full_tally_offer',
  'alder_trades_closed', 'alder_bowwood', 'alder_pack_north', 'alder_copse',
  'margit_licence_billed', 'q_the_full_tally_turnin', 'margit_tally_full',
  'rill_no_yew', 'leif_tally_chalk',
] as const;

test('CONTESTED LANDS band 8: the north ladders pick the right mouth', () => {
  const at = (actor: string, flags: Iterable<string>) => {
    const set = new Set(flags);
    return pickDialogue(offersFor(actor), (f) => set.has(f))?.id;
  };
  for (const id of BAND8_TREES) assert.ok(DIALOGUES.has(id), `${id} is shipped`);
  // Torsten: one hub for good; the offer above the watch pair; the
  // refused offer falls back to the hub (THE DOOR BACK); the kept line
  // shrinks the hub, and the wool's offer must still outrank it or a
  // kept character never hears it (10 over 9, the one lifted number).
  assert.equal(at('waykeeper_torsten', []), 'torsten_slate');
  assert.equal(at('waykeeper_torsten', ['quest:the_towers_debt:available']), 'q_the_towers_debt_offer');
  assert.equal(
    at('waykeeper_torsten', ['quest:the_towers_debt:available', 'world:threat_near']),
    'q_the_towers_debt_offer',
  );
  assert.equal(
    at('waykeeper_torsten', ['quest:the_towers_debt:available', 'towers_debt_declined']),
    'torsten_slate',
  );
  assert.equal(at('waykeeper_torsten', ['quest:the_towers_debt:ready']), 'q_the_towers_debt_turnin');
  assert.equal(at('waykeeper_torsten', ['first_line_kept']), 'torsten_kept');
  assert.equal(
    at('waykeeper_torsten', ['first_line_kept', 'quest:the_order_pays:available']),
    'q_the_order_pays_offer',
  );
  assert.equal(
    at('waykeeper_torsten', ['first_line_kept', 'quest:the_order_pays:available', 'order_pays_declined']),
    'torsten_kept',
  );
  assert.equal(at('waykeeper_torsten', ['world:threat_near']), 'torsten_watch_uneasy');
  assert.equal(at('waykeeper_torsten', ['world:relief']), 'torsten_watch_relief');
  // A culled trail never earns his relief line (plan §3.2).
  assert.equal(at('waykeeper_torsten', ['world:relief', 'wool_count_taken']), 'torsten_slate');
  // The hub's count turns on the pair flag: seven, or the nought.
  const hub = DIALOGUES.get('torsten_slate')!.nodes.find((n) => n.id === 'hub')!;
  const counts = hub.choices!.filter((c) => c.text === 'The count.');
  assert.deepEqual(counts.map((c) => [c.next, c.forbids, c.requires]), [
    ['count', ['wool_count_taken'], undefined],
    ['nought', undefined, ['wool_count_taken']],
  ]);
  // The sentinels: NO hub (with no tree eligible the shipped lines are
  // the visit's line); the gated one-liners above the offers; the
  // whole line is once so the dusk offer can speak after it.
  assert.equal(at('even_sentinel', []), undefined);
  assert.equal(at('even_sentinel', ['quest:keep_the_thread:available']), 'q_keep_the_thread_offer');
  assert.equal(
    at('even_sentinel', ['quest:keep_the_thread:available', 'keep_thread_declined']),
    'q_keep_the_thread_reoffer',
  );
  assert.equal(at('even_sentinel', ['quest:keep_the_thread:available', 'ward_thread_cut']), 'sentinel_cut');
  assert.equal(at('even_sentinel', ['keep_thread_done', 'quest:the_stone_at_dusk:available']), 'sentinel_whole');
  assert.equal(
    at('even_sentinel', ['keep_thread_done', 'quest:the_stone_at_dusk:available', dialogueDoneFlag('sentinel_whole')]),
    'q_the_stone_at_dusk_offer',
  );
  assert.equal(at('even_sentinel', ['quest:the_stone_at_dusk:done']), 'sentinel_alder');
  assert.equal(at('even_sentinel', ['quest:the_grey_root:active']), 'sentinel_feller');
  assert.equal(at('even_sentinel', ['quest:keep_the_thread:ready']), 'q_keep_the_thread_turnin');
  assert.equal(at('even_sentinel', ['quest:keep_the_thread:ready', 'ward_thread_cut']), 'sentinel_cut');
  // Sorrel: the pen's hub, the offer, and after a refusal the hub again
  // so the shop on her def opens (THE DOOR BACK's whole reason); the
  // cold count for B characters carries the pen's shop hook itself.
  assert.equal(at('drover_sorrel', []), 'sorrel_stalls');
  assert.equal(at('drover_sorrel', ['quest:wool_count:available']), 'q_wool_count_offer');
  assert.equal(at('drover_sorrel', ['quest:wool_count:available', 'wool_count_declined']), 'sorrel_stalls');
  assert.equal(at('drover_sorrel', ['tower_debt_paid']), 'sorrel_left_wolves');
  assert.ok(
    DIALOGUES.get('sorrel_left_wolves')!.nodes[0]!.hooks?.some((h) => h.kind === 'shop' && h.shop === 'drover_yard'),
    'the pen stays open to the character she is telling the count',
  );
  // Alder: the tutorial once, then the copse; the closure outranks the
  // shelf AND the grey root offer (band 8 fix pass, the live audit's
  // defect 7: an A north character heard the offer first and the
  // closure only after declining it; the closure is A's cost and is
  // said first, 14 over 13, and its hub carries the grey root's door
  // for any hand the thread side has not taken, with the thread's
  // four states shut on the choice); the tally offer outranks the
  // closure (15) or an A north character who cut the grey root never
  // hears the tally.
  const alderIn = [dialogueDoneFlag('alder_axe')];
  assert.equal(at('forester_alder', alderIn), 'alder_copse');
  assert.equal(at('forester_alder', [...alderIn, 'quest:the_grey_root:available']), 'q_the_grey_root_offer');
  assert.equal(
    at('forester_alder', [...alderIn, 'quest:the_grey_root:available', 'wool_count_taken']),
    'alder_trades_closed',
  );
  const closedDoor = DIALOGUES.get('alder_trades_closed')!.nodes[0]!.choices!.find((c) => c.next === 'reoffer_root')!;
  assert.deepEqual(closedDoor.requires, ['quest:the_grey_root:available'], 'the closed hub offers the grey root to a hand that never heard it');
  assert.deepEqual(closedDoor.forbids, ['quest:keep_the_thread:active', 'quest:keep_the_thread:done', 'quest:the_stone_at_dusk:active', 'quest:the_stone_at_dusk:done']);
  assert.equal(
    at('forester_alder', [...alderIn, 'grey_root_done', 'wool_count_taken', 'quest:the_full_tally:available']),
    'q_the_full_tally_offer',
  );
  assert.equal(at('forester_alder', [...alderIn, 'wool_count_taken']), 'alder_trades_closed');
  assert.equal(at('forester_alder', [...alderIn, 'grey_root_done']), 'alder_bowwood');
  assert.equal(at('forester_alder', [...alderIn, 'grey_root_done', 'wool_count_taken']), 'alder_trades_closed');
  assert.equal(
    at('forester_alder', [...alderIn, 'grey_root_done', 'quest:the_full_tally:available']),
    'q_the_full_tally_offer',
  );
  assert.equal(at('forester_alder', [...alderIn, 'quest:the_stone_at_dusk:done']), 'alder_pack_north');
  assert.equal(
    at('forester_alder', [...alderIn, 'quest:the_stone_at_dusk:done', dialogueDoneFlag('alder_pack_north')]),
    'alder_copse',
  );
  assert.ok(
    DIALOGUES.get('alder_bowwood')!.nodes.some((n) => n.hooks?.some((h) => h.kind === 'shop' && h.shop === 'copse_yard')),
    'the yard opens by hook alone',
  );
  assert.equal(NPC_ACTORS.get('forester_alder')!.shop, undefined, 'no shop on the def');
  // Bodil: the hub, the licence while the axe is active until signed,
  // the stop after the dusk, the cut seen once.
  assert.equal(at('charter_bodil', []), 'bodil_cut');
  assert.equal(at('charter_bodil', ['quest:the_grey_root:active']), 'bodil_licence');
  assert.equal(at('charter_bodil', ['quest:the_grey_root:active', 'bodil_licence_signed']), 'bodil_cut');
  assert.equal(at('charter_bodil', ['quest:the_stone_at_dusk:done']), 'bodil_licence_stopped');
  assert.equal(at('charter_bodil', ['ward_thread_cut']), 'bodil_cut_seen');
  assert.equal(at('charter_bodil', ['ward_thread_cut', dialogueDoneFlag('bodil_cut_seen')]), 'bodil_cut');
  // The signature is the cost: evencourt pays on the signed choice's
  // node alone; "Not yet" pays nothing.
  const licence = DIALOGUES.get('bodil_licence')!;
  assert.deepEqual(licence.nodes.find((n) => n.id === 'signed')!.hooks, [
    { kind: 'flag', flag: 'bodil_licence_signed' },
    { kind: 'standing', faction: 'evencourt', delta: -10 },
  ]);
  assert.equal(licence.nodes.find((n) => n.id === 'later')!.hooks, undefined);
  // Hale: the shame line once above the lamp; the wool's turn-in.
  assert.equal(at('waykeeper_hale', ['first_line_burnt']), 'hale_first_line_burnt');
  assert.equal(at('waykeeper_hale', ['first_line_burnt', dialogueDoneFlag('hale_first_line_burnt')]), 'hale_lamp');
  assert.equal(at('waykeeper_hale', ['quest:the_order_pays:ready']), 'q_the_order_pays_turnin');
  assert.equal(at('waykeeper_hale', ['aske_coin_taken']), 'hale_aske_coin');
  // Aske: the coin after the debt, once taken or refused never again.
  assert.equal(at('company_aske', ['quest:the_towers_debt:done']), 'aske_coin');
  assert.equal(at('company_aske', ['quest:the_towers_debt:done', 'aske_coin_taken']), undefined);
  assert.equal(at('company_aske', ['quest:the_towers_debt:done', 'aske_coin_refused']), undefined);
  const book = DIALOGUES.get('aske_coin')!.nodes.find((n) => n.id === 'hub')!.choices!.find((c) => c.next === 'paid_book')!;
  assert.deepEqual(book.requires, ['fen_side_taken']);
  // Margit: the bill once; the full column BELOW the ledger line's
  // repeatable offer so the carry stays reachable (4, not 7).
  assert.equal(at('charter_margit', ['quest:the_stone_at_dusk:done']), 'margit_licence_billed');
  assert.equal(at('charter_margit', ['full_tally_posted']), 'margit_tally_full');
  assert.equal(
    at('charter_margit', ['full_tally_posted', 'quest:the_ledger_line:available']),
    'q_the_ledger_line_offer',
  );
  assert.equal(at('charter_margit', ['quest:the_full_tally:ready']), 'q_the_full_tally_turnin');
  // Rill and Leif: one line each, once.
  assert.equal(at('fletcher_rill', ['grey_root_done', dialogueDoneFlag('rill_bow')]), 'rill_no_yew');
  assert.equal(at('waykeeper_leif', ['full_tally_posted']), 'leif_tally_chalk');
  // Nothing in the band reads the north-west pair flag as a side.
  for (const d of DIALOGUES.values()) {
    const reads = [
      ...(d.requires ?? []),
      ...(d.forbids ?? []),
      ...d.nodes.flatMap((n) => (n.choices ?? []).flatMap((c) => [...(c.requires ?? []), ...(c.forbids ?? [])])),
    ];
    assert.ok(!reads.includes('ward_line_taken'), `${d.id} never reads ward_line_taken`);
  }
});

test('CONTESTED LANDS band 8: THE PEOPLE SPEAK on every new string (the hand lint)', () => {
  // tools/voice/lint.mjs does not exist in this tree, so the gate is
  // pinned here: no dash or hyphen of any kind in anything a player
  // reads, whole sentences, the content boundary held on every id and
  // line. The spine and the old tongue are reviewed by eye (§0.3).
  const DASH = /[-‐‑‒–—―]/;
  const BOUNDARY = /\b(witch|witches|witchcraft|hex|hexes|coven|warlock|demon|demons|devil|devils|infernal|occult|hell)\b/i;
  const check = (where: string, s: string) => {
    assert.ok(!DASH.test(s), `${where}: dash in "${s}"`);
    assert.ok(!BOUNDARY.test(s), `${where}: boundary word in "${s}"`);
    assert.ok(/[.!?]$/.test(s.trim()), `${where}: not a whole sentence "${s}"`);
  };
  for (const id of BAND8_TREES) {
    const d = DIALOGUES.get(id)!;
    assert.ok(!DASH.test(id) && !BOUNDARY.test(id), `${id}: clean id`);
    for (const n of d.nodes) {
      check(`${id}/${n.id}`, stripDialogueMarkup(n.text));
      for (const c of n.choices ?? []) check(`${id}/${n.id}/choice`, c.text);
    }
  }
});
