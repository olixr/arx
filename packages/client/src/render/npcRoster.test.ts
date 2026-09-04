import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { HUMANOID_EXACT, HUMANOID_PREFIXES, HUMANOID_SUFFIXES, isHumanoidMonster } from './npcRoster.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * THE ROSTER HOLDS BOTH DOORS: renderer.ts npcItem carries the humanoid
 * predicate inline; this reads that predicate out of the source and
 * asserts npcRoster.ts says exactly the same. A family added to one
 * door without the other fails here, not on a player's screen.
 */
test('npcRoster matches the 2D renderer inline predicate', () => {
  const src = readFileSync(resolve(HERE, 'renderer.ts'), 'utf8');
  const start = src.indexOf('// Humanoid monsters use the full IK rig');
  assert.ok(start > 0, 'the renderer.ts humanoid block is where it was');
  const block = src.slice(start, src.indexOf(') {', start));
  const prefixes = [...block.matchAll(/defId\.startsWith\('([^']+)'\)/g)].map((m) => m[1]);
  const suffixes = [...block.matchAll(/defId\.endsWith\('([^']+)'\)/g)].map((m) => m[1]);
  const exact = [...block.matchAll(/defId === '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(prefixes, [...HUMANOID_PREFIXES]);
  assert.deepEqual(suffixes, [...HUMANOID_SUFFIXES]);
  assert.deepEqual(exact, [...HUMANOID_EXACT]);
});

test('isHumanoidMonster: families in, beasts out', () => {
  assert.ok(isHumanoidMonster('goblin_scout'));
  assert.ok(isHumanoidMonster('stone_golem'));
  assert.ok(isHumanoidMonster('troll'));
  assert.ok(!isHumanoidMonster('wolf'));
  assert.ok(!isHumanoidMonster('trollish_boar'));
});
