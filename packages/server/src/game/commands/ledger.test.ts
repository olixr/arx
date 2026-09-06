import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHAT_COMMANDS } from './index.js';
import { DEV_COMMANDS } from './devCommands.js';
import { PLAYER_COMMANDS } from './playerCommands.js';

// THE COMMAND LEDGER's laws (foundations F4). The ledger replaced a
// 2,000-line if-chain; these pins hold what the chain guaranteed by
// its shape: order, gating, and the overlapping-verb resolutions.

test('the ledger holds every command, player verbs first', () => {
  assert.equal(PLAYER_COMMANDS.length, 2);
  assert.equal(DEV_COMMANDS.length, 44);
  assert.equal(CHAT_COMMANDS.length, 47);
  assert.deepEqual(
    PLAYER_COMMANDS.map((c) => c.name),
    ['/lock', '/recall'],
  );
  assert.deepEqual(CHAT_COMMANDS.slice(0, 2), PLAYER_COMMANDS);
});

test('first claim wins: the overlapping verbs resolve as the chain did', () => {
  const firstClaim = (text: string) => CHAT_COMMANDS.find((c) => c.claims(text))?.name;
  // /flagreset is declared before /flag, /triggers before /trigger.
  assert.equal(firstClaim('/flagreset dawn'), '/flagreset');
  assert.equal(firstClaim('/flag dawn 1'), '/flag');
  assert.equal(firstClaim('/triggers'), '/triggers');
  assert.equal(firstClaim('/trigger fire'), '/trigger');
  // The pet row: three distinct prefixes, no cross-claims.
  assert.equal(firstClaim('/petbond 3'), '/petbond');
  assert.equal(firstClaim('/petarts'), '/petarts');
  assert.equal(firstClaim('/petstate rest'), '/petstate');
  // THE VERB IS THE CLAIM: player verbs own their line whatever trails it.
  assert.equal(firstClaim('/lock'), '/lock');
  assert.equal(firstClaim('/home'), '/recall');
  assert.equal(firstClaim('/lock the door'), '/lock');
  assert.equal(firstClaim('  /recall now'), '/recall');
  assert.equal(firstClaim('/locked'), '/');
  // Plain speech claims nothing — it falls to the say path.
  assert.equal(firstClaim('hello there'), undefined);
  // THE UNSPOKEN WORD: any slash line nobody owns ends at the terminal
  // entry, never in the room's ears.
  assert.equal(firstClaim('/homee'), '/');
  assert.equal(firstClaim('/homee the door'), '/');
  assert.equal(CHAT_COMMANDS[CHAT_COMMANDS.length - 1]!.name, '/');
});

test('every command is terminal by construction: names are unique', () => {
  const names = CHAT_COMMANDS.map((c) => c.name);
  assert.equal(new Set(names).size, names.length);
});
