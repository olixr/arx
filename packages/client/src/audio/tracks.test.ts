import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { TRACK_LIBRARY, drawTrack, moodFor } from './tracks.js';
import { zoneWeights } from './zones.js';

const MUSIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../public/music');

test('every music file on disk sits on a shelf, and every shelf entry exists', () => {
  const files = new Set(
    readdirSync(MUSIC_DIR)
      .filter((f) => f.endsWith('.mp3'))
      .map((f) => f.replace(/\.mp3$/, '')),
  );
  const shelved = new Set(Object.values(TRACK_LIBRARY).flat());
  for (const f of files) {
    assert.ok(shelved.has(f), `${f}.mp3 is on disk but on no shelf — it will never play`);
  }
  for (const name of shelved) {
    assert.ok(files.has(name), `shelf entry '${name}' has no file`);
  }
});

test('the mood law: town outranks all, caves brood, the deep frontier darkens the day', () => {
  const town = zoneWeights(-64, 48);
  const wild = zoneWeights(300, 48);
  const cave = zoneWeights(300, 9000);
  assert.equal(moodFor(town, 12, 5), 'town'); // settled land never plays dread
  assert.equal(moodFor(cave, 12, 5), 'night');
  assert.equal(moodFor(wild, 12, 0), 'adventure');
  assert.equal(moodFor(wild, 23, 0), 'night');
  assert.equal(moodFor(wild, 12, 4), 'danger'); // tier 4+ owns the day…
  assert.equal(moodFor(wild, 23, 5), 'danger'); // …and the night out there
  assert.equal(moodFor(wild, 12, 3), 'adventure'); // tier 3 is still adventure
});

test('every hearth reaches the ear: all eight towns play town, day or night, any tier', () => {
  const seats: Array<[number, number]> = [
    [-64, 48], // Dawnmead
    [352, 24], // Amberford
    [-288, -160], // Silverfall
    [356, 292], // Saltmere
    [584, -136], // Pinewatch
    [848, -392], // Hartfell — its country bands tier 5; the walls must not
    [-256, 288], // Kingsdelf — its country reads the Overband; the bowl must not
    [-680, -176], // Evenfall — the far west is tier-5 country; the groves must not
  ];
  for (const [x, y] of seats) {
    assert.equal(moodFor(zoneWeights(x, y), 12, 5), 'town', `day at ${x},${y}`);
    assert.equal(moodFor(zoneWeights(x, y), 23, 5), 'town', `night at ${x},${y}`);
  }
});

test('THE FULL DECK: a shelf deals every track before any repeats, never back-to-back', () => {
  const shelf = TRACK_LIBRARY.adventure;
  // Deterministic LCG so the pin never flakes.
  let s = 42;
  const rand = (): number => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  let deck: string[] = [];
  let last: string | null = null;
  const seen: string[] = [];
  for (let i = 0; i < shelf.length * 3; i++) {
    const d = drawTrack(shelf, deck, last, rand);
    deck = d.deck;
    last = d.name;
    seen.push(d.name);
  }
  for (let cycle = 0; cycle < 3; cycle++) {
    const deal = seen.slice(cycle * shelf.length, (cycle + 1) * shelf.length);
    assert.equal(new Set(deal).size, shelf.length, `deal ${cycle} covers the whole shelf`);
  }
  for (let i = 1; i < seen.length; i++) {
    assert.notEqual(seen[i], seen[i - 1], 'no track ever plays twice in a row');
  }
});

test('a reshuffle never leads with the track just played', () => {
  // rand ≈ 1 makes Fisher–Yates a no-op, so 'a' would lead again
  // without the guard.
  const d = drawTrack(['a', 'b', 'c'], [], 'a', () => 0.999);
  assert.notEqual(d.name, 'a');
});

test('a stale persisted deck drops tracks the shelf no longer carries', () => {
  const d = drawTrack(['a', 'b'], ['retired_track'], null, () => 0);
  assert.ok(['a', 'b'].includes(d.name));
  assert.ok(!d.deck.includes('retired_track'));
});
