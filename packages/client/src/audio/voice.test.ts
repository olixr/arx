import assert from 'node:assert/strict';
import { test } from 'node:test';
import { busLevel, type BusKind, type VolumeKind } from './engine.js';
import { LINE_DUCK, LruBytes } from './voice.js';

const FULL: Record<VolumeKind, number> = { master: 1, music: 1, sfx: 1, ambience: 1, voice: 1 };
const OPEN: Record<BusKind, number> = { sfx: 1, music: 1, tracks: 1, ambience: 1, voice: 1 };

test('the duck rail: gain = base × slider × duck, and each bus rides its own slider', () => {
  // At full sliders and no duck, every bus sits exactly at its base mix.
  const bases = (['sfx', 'music', 'tracks', 'ambience', 'voice'] as const).map((k) =>
    busLevel(k, FULL, OPEN),
  );
  for (const b of bases) assert.ok(b > 0 && b <= 1);

  // The music slider drives BOTH music and tracks; nothing else.
  const halfMusic = { ...FULL, music: 0.5 };
  assert.equal(busLevel('music', halfMusic, OPEN), busLevel('music', FULL, OPEN) * 0.5);
  assert.equal(busLevel('tracks', halfMusic, OPEN), busLevel('tracks', FULL, OPEN) * 0.5);
  assert.equal(busLevel('sfx', halfMusic, OPEN), busLevel('sfx', FULL, OPEN));
  assert.equal(busLevel('voice', halfMusic, OPEN), busLevel('voice', FULL, OPEN));

  // The voice slider drives the voice bus alone.
  const halfVoice = { ...FULL, voice: 0.5 };
  assert.equal(busLevel('voice', halfVoice, OPEN), busLevel('voice', FULL, OPEN) * 0.5);
  assert.equal(busLevel('music', halfVoice, OPEN), busLevel('music', FULL, OPEN));

  // Duck multiplies on top of the slider — the two compose, neither wins.
  const ducked = { ...OPEN, tracks: LINE_DUCK.tracks };
  assert.equal(
    busLevel('tracks', halfMusic, ducked),
    busLevel('tracks', FULL, OPEN) * 0.5 * LINE_DUCK.tracks,
  );
  // A duck on one bus never leaks into another.
  assert.equal(busLevel('music', FULL, ducked), busLevel('music', FULL, OPEN));
});

test('the line duck seats speech over scenery, never silences it', () => {
  for (const k of Object.values(LINE_DUCK)) assert.ok(k > 0 && k < 1);
  // Ambience ducks more gently than music — the world keeps breathing.
  assert.ok(LINE_DUCK.ambience > LINE_DUCK.music);
});

test('LruBytes: byte budget holds, staleness evicts, a touch re-seats', () => {
  const lru = new LruBytes<string>(100);
  lru.set('a', 'A', 40);
  lru.set('b', 'B', 40);
  assert.equal(lru.total, 80);

  // Touch 'a' so 'b' is now the stale one; the next insert evicts 'b'.
  assert.equal(lru.get('a'), 'A');
  lru.set('c', 'C', 40);
  assert.equal(lru.has('a'), true);
  assert.equal(lru.has('b'), false);
  assert.equal(lru.has('c'), true);
  assert.equal(lru.total, 80);

  // Re-setting a key replaces its bytes instead of double-counting.
  lru.set('c', 'C2', 20);
  assert.equal(lru.total, 60);
  assert.equal(lru.get('c'), 'C2');

  // An item bigger than the whole cap is refused, not enthroned.
  lru.set('whale', 'W', 101);
  assert.equal(lru.has('whale'), false);
  assert.equal(lru.total, 60);

  // A single item at exactly the cap evicts everyone else and fits.
  lru.set('exact', 'E', 100);
  assert.equal(lru.has('exact'), true);
  assert.equal(lru.total, 100);
  assert.equal(lru.size, 1);
});

test('THE PACED WORD: stretch-only, lands at 92% of the clip, safe at zero', async () => {
  const { voicePaceScale } = await import('./voice.js');
  // A 5s clip over a 2s natural read stretches the reader 2.3×.
  assert.equal(voicePaceScale(2, 5000), (5 * 0.92) / 2);
  // A clip shorter than the read never speeds the reader up.
  assert.equal(voicePaceScale(3, 1000), 1);
  // Degenerate inputs stay harmless.
  assert.equal(voicePaceScale(0, 5000), 1);
  assert.equal(voicePaceScale(2, 0), 1);
});
