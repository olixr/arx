import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { DialogueDef, VoiceClipDef } from '@arx/content';
import { collectVoicePrefetch, voiceWireForNode } from './resolve.js';

const clip = (id: string, hash: string): VoiceClipDef => ({
  id,
  fileHash: hash.repeat(40).slice(0, 40),
  ext: 'ogg',
  durMs: 1200,
  bytes: 20_000,
});

const CLIPS = new Map<string, VoiceClipDef>([
  ['greet', clip('greet', 'a')],
  ['tale', clip('tale', 'b')],
  ['deep', clip('deep', 'c')],
  ['shared', clip('shared', 'd')],
]);

test('a voiced node resolves to a blind URL; a silent or ghost ref to nothing', () => {
  const wire = voiceWireForNode({ voice: 'greet' }, CLIPS);
  assert.deepEqual(wire, { url: `/voice/${'a'.repeat(40)}.ogg`, durMs: 1200, kind: 'line' });
  assert.equal(voiceWireForNode({}, CLIPS), undefined);
  // A mid-edit ghost ref is silence, never an error (SILENCE IS VALID).
  assert.equal(voiceWireForNode({ voice: 'never_uploaded' }, CLIPS), undefined);
});

test('prefetch walks breadth-first from start, dedupes, caps, and skips silence', () => {
  const def: DialogueDef = {
    id: 't',
    start: 'a',
    nodes: [
      // a → hub asks → (b, c); c → d; d loops back to hub (cycle-safe).
      { id: 'a', text: '.', voice: 'greet', next: 'hub' },
      {
        id: 'hub',
        text: '.',
        choices: [
          { text: 'b', next: 'b' },
          { text: 'c', next: 'c' },
        ],
      },
      { id: 'b', text: '.', voice: 'tale' },
      { id: 'c', text: '.', voice: 'shared', next: 'd' },
      { id: 'd', text: '.', voice: 'deep', next: 'hub' },
      { id: 'island', text: '.', voice: 'deep' }, // unreachable — never warmed
    ],
  };
  // Near beats first: a (greet) before the branch beats, no dupes, no island.
  assert.deepEqual(collectVoicePrefetch(def, CLIPS, 12), [
    `/voice/${'a'.repeat(40)}.ogg`,
    `/voice/${'b'.repeat(40)}.ogg`,
    `/voice/${'d'.repeat(40)}.ogg`,
    `/voice/${'c'.repeat(40)}.ogg`,
  ]);
  // The cap holds.
  assert.equal(collectVoicePrefetch(def, CLIPS, 2)!.length, 2);
  assert.equal(collectVoicePrefetch(def, CLIPS, 0), undefined);
  // A wholly silent tree sends nothing at all.
  const silent: DialogueDef = { id: 's', start: 'a', nodes: [{ id: 'a', text: '.' }] };
  assert.equal(collectVoicePrefetch(silent, CLIPS, 12), undefined);
});

test('the moment picks the slot: hello, goodbye, and everything between', async () => {
  const { quipSlotForBeat } = await import('./resolve.js');
  assert.equal(quipSlotForBeat(true, false), 'greet');
  assert.equal(quipSlotForBeat(true, true), 'greet'); // a one-beat talk still says hello
  assert.equal(quipSlotForBeat(false, true), 'farewell');
  assert.equal(quipSlotForBeat(false, false), 'ack');
});

test('pickQuipClip: weights steer, the last pick steps aside, singles repeat', async () => {
  const { pickQuipClip } = await import('./resolve.js');
  const bank = {
    owner: { kind: 'actor' as const, id: 'x' },
    slots: {
      greet: [{ clip: 'hi_1' }, { clip: 'hi_2', weight: 3 }],
      ack: [{ clip: 'hm_1' }],
    },
  };
  // Weighted: hi_1 owns [0, 0.25), hi_2 owns [0.25, 1).
  assert.equal(pickQuipClip(bank, 'greet', undefined, 0.1), 'hi_1');
  assert.equal(pickQuipClip(bank, 'greet', undefined, 0.9), 'hi_2');
  // The previous pick steps aside when an alternative exists...
  assert.equal(pickQuipClip(bank, 'greet', 'hi_2', 0.9), 'hi_1');
  assert.equal(pickQuipClip(bank, 'greet', 'hi_1', 0.0), 'hi_2');
  // ...but a one-clip slot repeats rather than falling silent.
  assert.equal(pickQuipClip(bank, 'ack', 'hm_1', 0.5), 'hm_1');
  // Empty slots and missing banks are silence.
  assert.equal(pickQuipClip(bank, 'farewell', undefined, 0.5), undefined);
  assert.equal(pickQuipClip(undefined, 'greet', undefined, 0.5), undefined);
});

test('prefetch warms the bank first — the greet leads the queue', async () => {
  const { collectVoicePrefetch } = await import('./resolve.js');
  const def = {
    id: 't2',
    start: 'a',
    nodes: [{ id: 'a', text: '.', voice: 'tale' }],
  };
  const bank = {
    owner: { kind: 'actor' as const, id: 'x' },
    slots: { farewell: [{ clip: 'deep' }], greet: [{ clip: 'greet' }] },
  };
  assert.deepEqual(collectVoicePrefetch(def, CLIPS, 12, bank), [
    `/voice/${'a'.repeat(40)}.ogg`, // greet slot leads regardless of authoring order
    `/voice/${'c'.repeat(40)}.ogg`, // farewell follows
    `/voice/${'b'.repeat(40)}.ogg`, // then the tree's lines
  ]);
  // The cap still binds across both sources.
  assert.equal(collectVoicePrefetch(def, CLIPS, 2, bank)!.length, 2);
});

test('the mood mark rules the slot and is never diced', async () => {
  const { quipSlotForBeat, quipIsRationed } = await import('./resolve.js');
  assert.equal(quipSlotForBeat(false, false, 'yes'), 'yes');
  assert.equal(quipSlotForBeat(true, false, 'no'), 'no'); // the mark beats position
  assert.equal(quipSlotForBeat(false, true, 'hm'), 'hm');
  assert.equal(quipIsRationed(false, false, undefined), true); // anonymous acks dice
  assert.equal(quipIsRationed(false, false, 'yes'), false); // marks always speak
  assert.equal(quipIsRationed(true, false, undefined), false);
  assert.equal(quipIsRationed(false, true, undefined), false);
});

test('the bark keeps its word: transcript matching is loose on form, strict on words', async () => {
  const { matchActorLineClip, normalizeSpoken } = await import('./resolve.js');
  assert.equal(normalizeSpoken('  Hens.  '), 'hens');
  assert.equal(normalizeSpoken("Weather's turning, isn't it?"), "weather's turning isn't it");
  const clips = new Map<string, VoiceClipDef>([
    ['hobb__bark_1', { ...clip('hobb__bark_1', 'a'), actor: 'farmer_hobb', transcript: 'Hens.' }],
    [
      'hobb__bark_2',
      { ...clip('hobb__bark_2', 'b'), actor: 'farmer_hobb', transcript: "Weather's turning." },
    ],
    ['fen__bark_1', { ...clip('fen__bark_1', 'c'), actor: 'tinker_fen', transcript: 'Hens.' }],
    ['no_words', { ...clip('no_words', 'd'), actor: 'farmer_hobb' }],
  ]);
  // Case and punctuation fall away; the words must agree exactly.
  assert.equal(matchActorLineClip('farmer_hobb', 'hens', clips), 'hobb__bark_1');
  assert.equal(matchActorLineClip('farmer_hobb', "WEATHER'S TURNING!", clips), 'hobb__bark_2');
  // Another actor's identical words never speak for this throat.
  assert.equal(matchActorLineClip('tinker_fen', 'Hens.', clips), 'fen__bark_1');
  // No transcript, different words, or an empty line: silence.
  assert.equal(matchActorLineClip('farmer_hobb', 'Fence posts.', clips), undefined);
  assert.equal(matchActorLineClip('farmer_hobb', '...', clips), undefined);
});

test('prefetch leaves reel-length lines to stream on demand', async () => {
  const { collectVoicePrefetch } = await import('./resolve.js');
  const clips = new Map([
    ['short', clip('short', 'a')],
    ['reel', { ...clip('reel', 'b'), durMs: 60_000 }],
  ]);
  const def = {
    id: 't3',
    start: 'a',
    nodes: [
      { id: 'a', text: '.', voice: 'reel', next: 'b' },
      { id: 'b', text: '.', voice: 'short' },
    ],
  };
  // The 60s reel is skipped; only the short line warms the cache.
  assert.deepEqual(collectVoicePrefetch(def, clips, 12), [`/voice/${'a'.repeat(40)}.ogg`]);
});
