import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { TRACK_LIBRARY, moodFor } from './tracks.js';
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
