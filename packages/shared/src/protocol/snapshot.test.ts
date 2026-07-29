import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ByteReader } from './binary.js';
import { decodeSnapshot, encodeSnapshot, type Snapshot } from './snapshot.js';
import { POS_SCALE } from '../constants.js';

test('snapshot round-trips through the binary codec', () => {
  const snap: Snapshot = {
    serverTick: 123456,
    lastInputSeq: 789,
    entities: [
      { eid: 1, x: 32.5, y: 48.25, dir: 1.5, pose: 1, hpPct: 255, status: 0, alert: 0 },
      { eid: 99, x: -10.125, y: 0, dir: 6.1, pose: 4, hpPct: 128, status: 0b0101, alert: 2 },
      { eid: 4_000_000, x: 1000.75, y: 2000.5, dir: 0, pose: 0, hpPct: 0, status: 255, alert: 3 },
    ],
  };
  const buf = encodeSnapshot(snap);
  const r = new ByteReader(buf);
  assert.equal(r.u8(), 1); // BinaryMsgType.Snapshot
  const out = decodeSnapshot(r);

  assert.equal(out.serverTick, snap.serverTick);
  assert.equal(out.lastInputSeq, snap.lastInputSeq);
  assert.equal(out.entities.length, 3);
  for (let i = 0; i < snap.entities.length; i++) {
    const a = snap.entities[i]!;
    const b = out.entities[i]!;
    assert.equal(b.eid, a.eid);
    assert.ok(Math.abs(b.x - a.x) <= 1 / POS_SCALE);
    assert.ok(Math.abs(b.y - a.y) <= 1 / POS_SCALE);
    // Direction is quantized to 256 steps around the circle.
    const dirErr = Math.abs(b.dir - ((a.dir % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
    assert.ok(Math.min(dirErr, Math.PI * 2 - dirErr) < 0.03);
    assert.equal(b.pose, a.pose);
    assert.equal(b.hpPct, a.hpPct);
    assert.equal(b.status, a.status);
    assert.equal(b.alert, a.alert);
  }
});

test('empty snapshot encodes/decodes', () => {
  const buf = encodeSnapshot({ serverTick: 0, lastInputSeq: 0, entities: [] });
  const r = new ByteReader(buf);
  r.u8();
  const out = decodeSnapshot(r);
  assert.equal(out.entities.length, 0);
});
