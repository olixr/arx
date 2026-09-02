import test from 'node:test';
import assert from 'node:assert/strict';
import { StageVram } from './stageVram.js';
import type { EvictCandidate, VramLanes, VramStage } from './stageVram.js';

/**
 * THE VRAM CEILING (foundation A1) — the cross-stage governor, pinned.
 *
 * The governor's job is the one thing no per-instance budget can do:
 * bound the SUM two stages hold and, when over, shed the globally
 * coldest records first — across stages with independent clocks. These
 * tests drive it with a fake stage so the arithmetic and the ordering
 * are provable without a GL context.
 */

/** A fake governed stage: a bag of records, each a wall-clock stamp and
 *  a byte size, that reports its resident total and offers its records
 *  as eviction candidates coldest-value-first-agnostic (the governor
 *  sorts). */
class FakeStage implements VramStage {
  readonly records: Array<{ stamp: number; bytes: number; live: boolean }> = [];
  constructor(readonly vramLabel: string) {}
  add(stamp: number, bytes: number): void {
    this.records.push({ stamp, bytes, live: true });
  }
  get residentBytes(): number {
    return this.records.reduce((t, r) => (r.live ? t + r.bytes : t), 0);
  }
  residentBreakdown(): VramLanes {
    return { records: this.residentBytes, keyed: 0, scratch: 0, sheets: 0, layer: 0 };
  }
  collectEvictable(out: EvictCandidate[]): void {
    for (const r of this.records) {
      if (!r.live) continue;
      out.push({
        stamp: r.stamp,
        bytes: r.bytes,
        evict: () => {
          if (!r.live) return 0;
          r.live = false;
          return r.bytes;
        },
      });
    }
  }
}

const MB = 1024 * 1024;

test('totalResidentBytes sums across registered stages', () => {
  StageVram._resetForTest();
  const a = new FakeStage('world');
  const b = new FakeStage('ground');
  StageVram.register(a);
  StageVram.register(b);
  a.add(1, 100 * MB);
  b.add(2, 50 * MB);
  assert.equal(StageVram.totalResidentBytes(), 150 * MB);
  StageVram.unregister(b);
  assert.equal(StageVram.totalResidentBytes(), 100 * MB);
});

test('enforce is a no-op under the ceiling and reports zero shed', () => {
  StageVram._resetForTest();
  const a = new FakeStage('world');
  StageVram.register(a);
  a.add(1, 100 * MB);
  assert.equal(StageVram.enforce(), 0);
  assert.equal(StageVram.lastShedBytes, 0);
  assert.equal(a.residentBytes, 100 * MB);
});

test('over ceiling, sheds the globally coldest records across stages until under', () => {
  StageVram._resetForTest();
  StageVram.setCeiling(300 * MB);
  const w = new FakeStage('world');
  const g = new FakeStage('ground');
  StageVram.register(w);
  StageVram.register(g);
  // Interleave stamps so the coldest live on BOTH stages — the governor
  // must not just drain one stage. Wall-clock stamps (ms) are the only
  // comparable clock across stages, so ordering is by stamp.
  w.add(1000, 100 * MB); // coldest
  g.add(1100, 100 * MB); // 2nd coldest
  w.add(5000, 100 * MB); // warm
  g.add(9000, 100 * MB); // hottest
  assert.equal(StageVram.totalResidentBytes(), 400 * MB);

  const shed = StageVram.enforce();
  // 400 over a 300 ceiling → must shed exactly the one coldest 100MB.
  assert.equal(shed, 100 * MB);
  assert.equal(StageVram.totalResidentBytes(), 300 * MB);
  // The coldest was on `w` (stamp 1000) — that one is gone; g still whole.
  assert.equal(w.residentBytes, 100 * MB);
  assert.equal(g.residentBytes, 200 * MB);
});

test('sheds from whichever stage owns the coldest, not a fixed order', () => {
  StageVram._resetForTest();
  StageVram.setCeiling(256 * MB); // the floor — sizes must exceed it
  const w = new FakeStage('world');
  const g = new FakeStage('ground');
  StageVram.register(w);
  StageVram.register(g);
  w.add(9000, 200 * MB); // hottest — must survive
  g.add(1000, 100 * MB); // coldest — must go first
  StageVram.enforce(); // 300 over 256 → shed the coldest 100MB, stop
  assert.equal(g.residentBytes, 0, 'the ground stage held the coldest and lost it');
  assert.equal(w.residentBytes, 200 * MB, 'the world stage held the hottest and kept it');
});

test('when nothing more is safely evictable, resTOT honestly stays over ceiling', () => {
  StageVram._resetForTest();
  StageVram.setCeiling(256 * MB); // the floor
  const w = new FakeStage('world');
  StageVram.register(w);
  // One record, but pretend it is the working set: make it un-offered
  // by clearing it from the candidate gather (a live record that the
  // stage chooses not to offer, e.g. drawn this frame / pinned).
  w.add(1, 300 * MB);
  // Override the gather to offer nothing (models pinned/this-frame).
  (w as unknown as { collectEvictable(o: EvictCandidate[]): void }).collectEvictable = () => {};
  const shed = StageVram.enforce();
  assert.equal(shed, 0);
  assert.equal(StageVram.totalResidentBytes(), 300 * MB);
  assert.ok(StageVram.totalResidentBytes() > StageVram.ceilingBytes);
});

test('setCeiling clamps to a floor so the store cannot be starved into thrash', () => {
  StageVram._resetForTest();
  StageVram.setCeiling(1); // absurdly low
  assert.ok(StageVram.ceilingBytes >= 256 * MB);
});

test('breakdown labels each stage and totals its lanes', () => {
  StageVram._resetForTest();
  const w = new FakeStage('world');
  StageVram.register(w);
  w.add(1, 42 * MB);
  const b = StageVram.breakdown();
  assert.equal(b.length, 1);
  const only = b[0];
  assert.ok(only);
  assert.equal(only.label, 'world');
  assert.equal(only.total, 42 * MB);
  assert.equal(only.lanes.records, 42 * MB);
});
