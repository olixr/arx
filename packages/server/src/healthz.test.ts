import assert from 'node:assert/strict';
import { test } from 'node:test';
import { healthReport, TICK_STALE_MS } from './health.js';
import { TICK_THROWS_MAX_PER_MIN } from './game/tuning.js';
import * as metrics from './metrics.js';

/** THE SERVER TELLS ITS OWN HEALTH: /healthz is a readiness verdict, not a port check. */

function probe(over: Partial<Parameters<typeof healthReport>[0]> = {}) {
  return {
    lastTickAt: () => 1000,
    now: () => 1040,
    tickAvgMs: () => 3.456,
    tickMaxMs: () => 12.34,
    tickThrowsLastMin: () => 0,
    dbPing: () => Promise.resolve(2.5),
    dbQueueDepth: () => 4,
    players: () => 7,
    bootedAt: Date.now() - 65_000,
    ...over,
  };
}

test('a live tick and a quick ping answer 200 with every field', async () => {
  metrics.resetAll();
  metrics.inc('db.writeFailures', 3);
  metrics.unsealBoot();
  metrics.bootWarn('[test] one soft fail');
  metrics.sealBoot();
  const { status, body } = await healthReport(probe());
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.why, undefined);
  assert.equal(body.lastTickAgeMs, 40);
  assert.equal(body.tickAvgMs, 3.46);
  assert.equal(body.tickMaxMs, 12.3);
  assert.equal(body.dbPingMs, 2.5);
  assert.equal(body.dbQueueDepth, 4);
  assert.equal(body.dbWriteFailures, 3);
  assert.equal(body.bootWarnings, 1);
  assert.equal(body.players, 7);
  assert.equal(body.tickThrows, 0);
  assert.equal(body.tickThrowsLastMin, 0);
  assert.ok(body.uptimeSec >= 65);
});

test('THE THROW IS COUNTED: throws past the minute cap answer 503 and name the rate; under it they are only reported', async () => {
  metrics.resetAll();
  metrics.inc('tick.throws', 25);
  const bad = await healthReport(probe({ tickThrowsLastMin: () => TICK_THROWS_MAX_PER_MIN + 1 }));
  assert.equal(bad.status, 503);
  assert.equal(bad.body.why, `tick throwing ${TICK_THROWS_MAX_PER_MIN + 1}/min`);
  assert.equal(bad.body.tickThrows, 25);
  assert.equal(bad.body.tickThrowsLastMin, TICK_THROWS_MAX_PER_MIN + 1);
  const ok = await healthReport(probe({ tickThrowsLastMin: () => TICK_THROWS_MAX_PER_MIN }));
  assert.equal(ok.status, 200);
  assert.equal(ok.body.tickThrowsLastMin, TICK_THROWS_MAX_PER_MIN);
  // A stale tick outranks a throwing one in the verdict (the loop is dead, not merely faulting).
  const dead = await healthReport(probe({ tickThrowsLastMin: () => 999, now: () => 1000 + TICK_STALE_MS + 1 }));
  assert.match(dead.body.why!, /tick stale/);
  metrics.resetAll();
});

test('ONE PING IN FLIGHT: probes on one probe object share an unanswered ping; a settled or abandoned one is reissued', async () => {
  let issued = 0;
  let release: (ms: number) => void = () => undefined;
  const p = probe({
    dbPing: () => {
      issued++;
      return new Promise<number>((res) => {
        release = res;
      });
    },
    slowMs: 5,
  });
  const [a, b] = await Promise.all([healthReport(p), healthReport(p)]);
  assert.equal(issued, 1, 'two concurrent probes queue ONE statement');
  assert.equal(a.status, 503);
  assert.equal(b.status, 503);
  const c = await healthReport(p);
  assert.equal(issued, 1, 'a later probe still shares the unanswered ping');
  assert.equal(c.status, 503);
  release(2);
  await new Promise((r) => setTimeout(r, 0));
  const d = await healthReport(p);
  assert.equal(issued, 2, 'once the ping settles, the next probe issues its own');
  assert.equal(d.status, 503);
  // Past the abandon window a wedged ping is not shared any more.
  const q = probe({ dbPing: () => new Promise<number>(() => undefined), slowMs: 5, abandonMs: 0 });
  let qIssued = 0;
  q.dbPing = () => {
    qIssued++;
    return new Promise<number>(() => undefined);
  };
  await healthReport(q);
  await healthReport(q);
  assert.equal(qIssued, 2, 'an abandoned ping is reissued');
});

test('a stale tick answers 503 {ok:false, why}', async () => {
  const { status, body } = await healthReport(probe({ now: () => 1000 + TICK_STALE_MS + 1 }));
  assert.equal(status, 503);
  assert.equal(body.ok, false);
  assert.match(body.why!, /tick stale 2001ms/);
});

test('no tick yet answers 503 (the loop has not started)', async () => {
  const { status, body } = await healthReport(probe({ lastTickAt: () => 0 }));
  assert.equal(status, 503);
  assert.equal(body.why, 'no tick yet');
  assert.equal(body.lastTickAgeMs, -1);
});

test('a wedged FIFO (ping never answers) answers 503 within the patience, and a slow ping too', async () => {
  const wedged = await healthReport(probe({ dbPing: () => new Promise<number>(() => undefined), slowMs: 5 }));
  assert.equal(wedged.status, 503);
  assert.match(wedged.body.why!, /db ping over 5ms \(queue 4\)/);
  assert.equal(wedged.body.dbPingMs, null);
  const slow = await healthReport(probe({ dbPing: () => Promise.resolve(1500) }));
  assert.equal(slow.status, 503);
  assert.equal(slow.body.why, 'db ping 1500ms');
  const thrown = await healthReport(probe({ dbPing: () => Promise.reject(new Error('gone')) }));
  assert.equal(thrown.status, 503);
});
