import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GroundMarks, MARK_CAP } from './groundMarks.js';
import { LANDING_BOUNCE, LANDING_MARK, LANDING_SPLAT, MARK_CHAR, MARK_FLECK, MARK_SMEAR, type Landing } from '../particles.js';

const landing = (kind: number, mark = 0, life = 0): Landing => ({ x: 1, y: 2, color: '#c9541f', size: 0.06, kind, mark, life });

test('splats stain as flecks, marks remember their kind, bounces pass silently', () => {
  const m = new GroundMarks();
  m.ingest(landing(LANDING_SPLAT), 0);
  m.ingest(landing(LANDING_MARK, MARK_CHAR, 6), 0);
  m.ingest(landing(LANDING_BOUNCE), 0);
  assert.equal(m.count(), 2);
});

test('marks expire on their own life and the cap recycles round-robin', () => {
  const m = new GroundMarks();
  m.add(0, 0, 0.1, '#fff', MARK_FLECK, 1, 0);
  m.add(0, 0, 0.1, '#fff', MARK_FLECK, 3, 0);
  m.prune(1.5);
  assert.equal(m.count(), 1);
  m.prune(3.5);
  assert.equal(m.count(), 0);
  for (let i = 0; i < MARK_CAP * 2; i++) m.add(i, 0, 0.1, '#fff', MARK_SMEAR, 10, 0);
  assert.equal(m.count(), MARK_CAP);
  m.clear();
  assert.equal(m.count(), 0);
});

test('drawing every kind runs clean on a recording context and touches no gradient', () => {
  const calls: string[] = [];
  const ctx = new Proxy({} as CanvasRenderingContext2D, {
    get(_t, k) {
      if (k === 'globalAlpha' || k === 'fillStyle' || k === 'strokeStyle' || k === 'lineWidth') return 1;
      return (...args: unknown[]) => { calls.push(String(k)); void args; };
    },
    set() { return true; },
  });
  const m = new GroundMarks();
  const now = 0;
  m.add(0, 0, 0.1, '#c9541f', MARK_CHAR, 5, now);
  m.add(1, 0, 0.1, '#8fd968', MARK_FLECK, 5, now);
  m.add(2, 0, 0.1, '#c4372a', MARK_SMEAR, 5, now);
  m.add(3, 0, 0.1, '#b8dcf2', 4, 5, now);
  m.draw(ctx, (x, y) => ({ x: x * 10, y: y * 10 }), 48, now + 0.1);
  assert.ok(calls.includes('fillRect'));
  assert.ok(!calls.includes('createRadialGradient') && !calls.includes('createLinearGradient'));
  const saves = calls.filter((c) => c === 'save').length;
  const restores = calls.filter((c) => c === 'restore').length;
  assert.equal(saves, restores, 'save/restore discipline');
});
