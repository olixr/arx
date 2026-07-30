import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AUTHORED_VOICE,
  replaceVoice,
  validateVoice,
  validateVoiceBank,
  validateVoiceClip,
  VOICE,
  voiceClipUrl,
} from './voice.js';

const HASH = 'a'.repeat(40);

const GOOD_CLIP = {
  id: 'dunna_greet_1',
  fileHash: HASH,
  ext: 'ogg',
  durMs: 1400,
  bytes: 18_000,
  transcript: 'Welcome to the Rest.',
  actor: 'innkeep_dunna',
  tags: ['greet'],
};

test('a well-formed clip validates and round-trips its fields', () => {
  const res = validateVoiceClip(GOOD_CLIP, { actorIds: new Set(['innkeep_dunna']) });
  assert.ok(res.ok, JSON.stringify(res));
  assert.deepEqual(res.def, GOOD_CLIP);
  assert.equal(voiceClipUrl(res.def), `/voice/${HASH}.ogg`);
});

test('the clip validator refuses bad grammar, hashes, sizes, and strangers', () => {
  const bad = (patch: object, needle: string): void => {
    const res = validateVoiceClip({ ...GOOD_CLIP, ...patch });
    assert.ok(!res.ok, `expected refusal for ${JSON.stringify(patch)}`);
    assert.ok(
      res.errors.some((e) => e.includes(needle)),
      `wanted '${needle}' in ${JSON.stringify(res.errors)}`,
    );
  };
  bad({ id: 'Dunna-Greet' }, 'clip id');
  bad({ fileHash: 'nope' }, 'sha1');
  bad({ ext: 'flac' }, 'ext must be one of');
  bad({ durMs: 0 }, 'durMs');
  bad({ bytes: VOICE.maxClipBytes + 1 }, 'maxClipBytes');
  bad({ tags: ['UPPER CASE'] }, 'tag');
  const stranger = validateVoiceClip({ ...GOOD_CLIP, actor: 'nobody_here' }, {
    actorIds: new Set(['innkeep_dunna']),
  });
  assert.ok(!stranger.ok && stranger.errors.some((e) => e.includes('not a known actor')));
});

test('banks: slots are the code roster, clips must exist, weights normalize', () => {
  const clips = new Set(['dunna_greet_1', 'grunt_low_1']);
  const good = validateVoiceBank(
    {
      owner: { kind: 'actor', id: 'innkeep_dunna' },
      slots: {
        greet: [{ clip: 'dunna_greet_1' }, { clip: 'grunt_low_1', weight: 3 }],
        ack: [{ clip: 'grunt_low_1', weight: 1 }],
      },
    },
    { clipIds: clips },
  );
  assert.ok(good.ok, JSON.stringify(good));
  // weight 1 is the default and stays implicit; weight 3 survives.
  assert.deepEqual(good.def.slots.greet, [
    { clip: 'dunna_greet_1' },
    { clip: 'grunt_low_1', weight: 3 },
  ]);
  assert.deepEqual(good.def.slots.ack, [{ clip: 'grunt_low_1' }]);

  const badSlot = validateVoiceBank(
    { owner: { kind: 'actor', id: 'x' }, slots: { applause: [{ clip: 'grunt_low_1' }] } },
    { clipIds: clips },
  );
  assert.ok(!badSlot.ok && badSlot.errors.some((e) => e.includes("unknown slot 'applause'")));

  const badClip = validateVoiceBank(
    { owner: { kind: 'actor', id: 'x' }, slots: { greet: [{ clip: 'ghost' }] } },
    { clipIds: clips },
  );
  assert.ok(!badClip.ok && badClip.errors.some((e) => e.includes("unknown clip 'ghost'")));

  const badKind = validateVoiceBank(
    { owner: { kind: 'boat', id: 'x' }, slots: {} },
    { clipIds: clips },
  );
  assert.ok(!badKind.ok && badKind.errors.some((e) => e.includes('owner.kind')));
});

test('the dials: shipped seed is law-clean, typos and inverted ducks refuse', () => {
  assert.ok(validateVoice(AUTHORED_VOICE).ok);

  const typo = validateVoice({ ...AUTHORED_VOICE, quipChanse: 0.5 });
  assert.ok(!typo.ok && typo.errors.some((e) => e.includes("unknown dial 'quipChanse'")));

  // Ambience may never duck deeper than music under a line.
  const inverted = validateVoice({ ...AUTHORED_VOICE, duckLine: 0.8, duckAmbience: 0.3 });
  assert.ok(!inverted.ok && inverted.errors.some((e) => e.includes('duckAmbience')));

  const chance = validateVoice({ ...AUTHORED_VOICE, quipChance: 1.5 });
  assert.ok(!chance.ok);
});

test('replaceVoice swaps in place — identity stable, call-time reads see it', () => {
  const before = VOICE;
  replaceVoice({ ...AUTHORED_VOICE, quipChance: 0.9 });
  assert.equal(VOICE, before);
  assert.equal(VOICE.quipChance, 0.9);
  replaceVoice({ ...AUTHORED_VOICE });
  assert.equal(VOICE.quipChance, AUTHORED_VOICE.quipChance);
});
