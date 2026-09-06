import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEV_COMMANDS } from './devCommands.js';
import type { GameServer, PlayerComp } from '../gameServer.js';

/**
 * THE GROUND DOOR (band 9a, E1): `/spawnnpc <slug> [routine]` — the
 * optional third token reaches spawnActor as its seventh argument and
 * is echoed in the reply; without it the call is byte-identical to the
 * old two-token form (routine undefined). The stub records exactly
 * what the real GameServer would be handed.
 */
function harness() {
  const calls: unknown[][] = [];
  const sent: string[] = [];
  const actor = { id: 'dolmen_setter', name: 'Dolmen' };
  const srv = {
    actorDefs: new Map([[actor.id, actor]]),
    positions: new Map([[7, { x: 201, y: 292, dir: Math.PI, plane: 'surface' }]]),
    worldOf: () => ({ isSolid: () => false }),
    spawnActor: (...args: unknown[]) => {
      calls.push(args);
      return 99;
    },
  } as unknown as GameServer;
  const player = {
    session: { sendJson: (m: { text: string }) => sent.push(m.text) },
  } as unknown as PlayerComp;
  const cmd = DEV_COMMANDS.find((c) => c.name === '/spawnnpc')!;
  return { srv, player, cmd, calls, sent, actor };
}

test('/spawnnpc <slug> [routine] hands the routine to spawnActor and echoes it', () => {
  const { srv, player, cmd, calls, sent, actor } = harness();
  assert.ok(cmd.claims('/spawnnpc dolmen_setter dolmen_set'));
  cmd.run(srv, 7, player, '/spawnnpc dolmen_setter dolmen_set');
  assert.equal(calls.length, 1);
  const [def, plane, x, y, idx, dir, routine] = calls[0]!;
  assert.equal(def, actor);
  assert.equal(plane, 'surface');
  assert.ok(typeof x === 'number' && typeof y === 'number');
  assert.ok(Math.hypot((x as number) - 201, (y as number) - 292) <= 2.9, 'beside the caller');
  assert.equal(idx, -1, 'ephemeral: no spawn slot');
  assert.equal(dir, undefined, 'the placement keeps its own facing');
  assert.equal(routine, 'dolmen_set');
  assert.deepEqual(sent, ['Spawned Dolmen (dolmen_set).']);
});

test('/spawnnpc <slug> alone stays the old door: no routine, plain echo', () => {
  const { srv, player, cmd, calls, sent } = harness();
  cmd.run(srv, 7, player, '/spawnnpc dolmen_setter');
  assert.equal(calls.length, 1);
  assert.equal(calls[0]![6], undefined);
  assert.deepEqual(sent, ['Spawned Dolmen.']);
});

test('/spawnnpc with an unknown slug lists the roster and spawns nothing', () => {
  const { srv, player, cmd, calls, sent } = harness();
  cmd.run(srv, 7, player, '/spawnnpc nobody dolmen_set');
  assert.equal(calls.length, 0);
  assert.equal(sent.length, 1);
  assert.match(sent[0]!, /^\/spawnnpc <slug> \[routine\] — dolmen_setter$/);
});
