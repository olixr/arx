import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { SOURCE_COUNT as ACTOR_COUNT, SOURCES as ACTOR_SOURCES } from './actors/defs.generated.js';
import { SOURCE_COUNT as DIALOGUE_COUNT, SOURCES as DIALOGUE_SOURCES } from './dialogues/defs.generated.js';

// THE LEDGER AGREES WITH THE SHELF (foundations polish). The generated
// def modules must match the defs/ directories exactly — a def dropped
// in without `npm run gen:registries` fails HERE, at test time, never
// as a silently missing actor in a live town.

const here = dirname(fileURLToPath(import.meta.url));
const jsonCount = (dir: string): number =>
  readdirSync(join(here, dir, 'defs')).filter((f) => f.endsWith('.json')).length;

test('the actor ledger matches its shelf', () => {
  assert.equal(ACTOR_SOURCES.length, ACTOR_COUNT);
  assert.equal(jsonCount('actors'), ACTOR_COUNT, 'run npm run gen:registries');
});

test('the dialogue ledger matches its shelf', () => {
  assert.equal(DIALOGUE_SOURCES.length, DIALOGUE_COUNT);
  assert.equal(jsonCount('dialogues'), DIALOGUE_COUNT, 'run npm run gen:registries');
});
