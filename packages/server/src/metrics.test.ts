import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as metrics from './metrics.js';
import { formatLog } from './log.js';
import { statementTag } from './db/db.js';

test('counters rise, gauges set, observations keep count/sum/max; snapshot and text agree', () => {
  metrics.resetAll();
  metrics.inc('msgs.in');
  metrics.inc('msgs.in');
  metrics.inc('bytes.out', 120);
  metrics.set('players', 9);
  metrics.set('players', 8);
  metrics.observe('tick.ms', 2);
  metrics.observe('tick.ms', 6);
  assert.equal(metrics.counter('msgs.in'), 2);
  assert.equal(metrics.counter('bytes.out'), 120);
  assert.equal(metrics.gauge('players'), 8);
  assert.deepEqual(metrics.observed('tick.ms'), { count: 2, sum: 8, max: 6, avg: 4 });
  const snap = metrics.snapshot();
  assert.equal(snap['tick.ms.max'], 6);
  assert.equal(
    metrics.renderText(),
    'bytes.out 120\nmsgs.in 2\nplayers 8\ntick.ms.count 2\ntick.ms.max 6\ntick.ms.sum 8\n',
  );
  assert.equal(metrics.counter('never'), 0);
});

test('bootWarn counts until the boot is sealed, then only warns', () => {
  metrics.resetAll();
  metrics.unsealBoot();
  const warned: string[] = [];
  const orig = console.warn;
  console.warn = (line: string) => {
    warned.push(line);
  };
  try {
    metrics.bootWarn('[content] DB npc bad');
    metrics.bootWarn('[poi] bad prefab file');
    assert.equal(metrics.bootWarnings(), 2);
    metrics.sealBoot();
    metrics.bootWarn('[npc] reload complaint');
    assert.equal(metrics.bootWarnings(), 2, 'a post-boot warning is not a boot warning');
    assert.equal(warned.length, 3, 'every line still reaches the log');
  } finally {
    console.warn = orig;
    metrics.unsealBoot();
  }
});

test('isLoopback admits only the loopback peers', () => {
  assert.equal(metrics.isLoopback('127.0.0.1'), true);
  assert.equal(metrics.isLoopback('::1'), true);
  assert.equal(metrics.isLoopback('::ffff:127.0.0.1'), true);
  assert.equal(metrics.isLoopback('10.0.0.5'), false);
  assert.equal(metrics.isLoopback(undefined), false);
});

test('the plain log form is [tag] msg k=v; statement tags name verb + table', () => {
  assert.equal(formatLog('info', 'tick', 'minute', { avgMs: 2.5, note: 'ok', gone: undefined }), '[tick] minute avgMs=2.5 note=ok');
  assert.equal(statementTag('UPDATE characters SET x = ? WHERE id = ?'), 'UPDATE characters');
  assert.equal(statementTag('INSERT INTO character_skills (a) VALUES (?)'), 'INSERT character_skills');
  assert.equal(statementTag('  DELETE FROM equipment WHERE character_id = ?'), 'DELETE equipment');
});
