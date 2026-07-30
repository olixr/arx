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
