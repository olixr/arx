import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameServer } from './gameServer.js';

/**
 * THE UNWATCHED WORLD DOZES × THE WORLDS APART — the union of watched
 * chunks must speak the entity-chunk index's plane-first dialect.
 * The post-ship audit caught the mismatch: session.knownChunks hold
 * bare "cx,cy" keys while entityChunk keys became "plane|cx,cy", so
 * the doze predicate never matched and every idle body world-wide
 * slept forever (no sight aggro, companions frozen, hens never
 * laying). These pins hold the two halves to one dialect.
 */

type AnyFn = (...args: never[]) => unknown;
const proto = GameServer.prototype as unknown as {
  rebuildAwakeChunks: AnyFn;
  sessionPlane: AnyFn;
};

function slate(sessions: Array<{ eid: number | null; plane?: string; chunks: string[] }>) {
  const positions = new Map<number, { plane: string; x: number; y: number }>();
  const s = {
    awakeChunks: new Set<string>(),
    sessions: sessions.map((row) => {
      if (row.eid !== null && row.plane) {
        positions.set(row.eid, { plane: row.plane, x: 0, y: 0 });
      }
      return { playerEid: row.eid, knownChunks: new Set(row.chunks) };
    }),
    positions,
    sessionPlane: proto.sessionPlane,
  };
  (proto.rebuildAwakeChunks as (this: typeof s) => void).call(s);
  return s.awakeChunks;
}

test('the awake union speaks plane-first keys — the doze predicate can match again', () => {
  const awake = slate([
    { eid: 1, plane: 'surface', chunks: ['3,4', '3,5'] },
    { eid: 2, plane: 'underworld', chunks: ['3,4'] },
  ]);
  // The entity-chunk index files an idle wolf at surface (3,4) under
  // exactly this key — it must be found awake.
  assert.ok(awake.has('surface|3,4'));
  assert.ok(awake.has('surface|3,5'));
  // The same coordinates watched from the underworld wake ONLY the
  // underworld's bodies: planes alias coordinates by design.
  assert.ok(awake.has('underworld|3,4'));
  assert.ok(!awake.has('underworld|3,5'));
  // And no bare key survives — a bare union is the audited regression.
  assert.ok(!awake.has('3,4'));
});

test('a session with no standing body wakes nothing', () => {
  const awake = slate([{ eid: null, chunks: ['0,0'] }]);
  assert.equal(awake.size, 0);
});
