import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { IpGuard, clientIp } from './ipGuard.js';

function fakeReq(peer: string, headers: Record<string, string | string[]> = {}): IncomingMessage {
  return { socket: { remoteAddress: peer }, headers } as unknown as IncomingMessage;
}

test('connection burst is bounded per IP and separate per address', () => {
  const guard = new IpGuard();
  let accepted = 0;
  for (let i = 0; i < 20; i++) if (guard.tryConnect('203.0.113.7')) accepted++;
  assert.ok(accepted >= 1 && accepted <= 8, `burst held to the bucket (got ${accepted})`);
  assert.ok(guard.tryConnect('203.0.113.8'), 'a different address has its own budget');
});

test('disconnect frees the concurrent slot but never refunds the rate bucket', () => {
  const guard = new IpGuard();
  while (guard.tryConnect('198.51.100.2')) {
    // drain the connect budget
  }
  guard.disconnect('198.51.100.2');
  assert.ok(!guard.tryConnect('198.51.100.2'), 'reconnect-spam cannot mint fresh budget');
});

test('auth attempts share one per-IP budget across reconnects', () => {
  const guard = new IpGuard();
  let allowed = 0;
  for (let i = 0; i < 100; i++) if (guard.allowAuth('192.0.2.9')) allowed++;
  assert.ok(allowed >= 1 && allowed <= 20, `auth burst held to the bucket (got ${allowed})`);
  assert.ok(!guard.allowAuth('192.0.2.9'), 'the budget stays spent regardless of sockets');
  assert.ok(guard.allowAuth('192.0.2.10'), 'a different address still authenticates');
});

test('sweep drops idle addresses but keeps live connections', () => {
  const guard = new IpGuard();
  guard.tryConnect('192.0.2.1'); // stays connected
  guard.tryConnect('192.0.2.2');
  guard.disconnect('192.0.2.2'); // idle
  guard.sweep(Date.now() + 10 * 60_000);
  assert.equal(guard.size, 1, 'only the live address survives the sweep');
});

test('clientIp trusts forwarding headers only from a loopback peer', () => {
  // Production shape: nginx on loopback speaks for the client.
  assert.equal(clientIp(fakeReq('127.0.0.1', { 'x-real-ip': '203.0.113.50' })), '203.0.113.50');
  // Fallback: only the LAST X-Forwarded-For hop (ours) is believed.
  assert.equal(
    clientIp(fakeReq('::ffff:127.0.0.1', { 'x-forwarded-for': 'spoofed, 203.0.113.51' })),
    '203.0.113.51',
  );
  // A direct peer never gets to claim another address.
  assert.equal(
    clientIp(fakeReq('203.0.113.60', { 'x-real-ip': '10.0.0.1', 'x-forwarded-for': '10.0.0.2' })),
    '203.0.113.60',
  );
  assert.equal(clientIp(fakeReq('192.168.1.20')), '192.168.1.20');
});
