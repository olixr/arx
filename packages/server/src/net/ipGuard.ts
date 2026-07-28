import type { IncomingMessage } from 'node:http';
import { TokenBucket } from './rateLimiter.js';

/**
 * Per-IP abuse guard, one layer under the per-connection buckets in
 * Session. The per-connection auth bucket alone has a hole: dropping
 * the socket and reconnecting mints a fresh bucket, so a hammering
 * client just reconnects. These budgets are keyed by address and
 * survive any number of reconnects.
 */
const MAX_CONNS_PER_IP = 12;
/** New sockets per second (burst covers a page reload's flurry). */
const CONNECT_RATE = 1;
const CONNECT_BURST = 8;
/**
 * Auth attempts (hello resume, login, register) per second. Sized so a
 * NAT full of housemates each get their handshake, while sustained
 * credential/invite guessing crawls: 0.5/s is ~43k tries a day — noise
 * against a long random invite code, and every register also burns a
 * scrypt on our side, which this bound keeps cheap.
 */
const AUTH_RATE = 0.5;
const AUTH_BURST = 20;
/** Idle entries (no live sockets) are dropped after this long. */
const IDLE_MS = 5 * 60_000;

interface IpEntry {
  conns: number;
  connect: TokenBucket;
  auth: TokenBucket;
  lastSeen: number;
}

export class IpGuard {
  private readonly entries = new Map<string, IpEntry>();

  private entry(ip: string): IpEntry {
    let e = this.entries.get(ip);
    if (!e) {
      e = {
        conns: 0,
        connect: new TokenBucket(CONNECT_RATE, CONNECT_BURST),
        auth: new TokenBucket(AUTH_RATE, AUTH_BURST),
        lastSeen: Date.now(),
      };
      this.entries.set(ip, e);
    }
    e.lastSeen = Date.now();
    return e;
  }

  /** Gate a new socket: concurrent cap + connection rate. */
  tryConnect(ip: string): boolean {
    const e = this.entry(ip);
    if (e.conns >= MAX_CONNS_PER_IP || !e.connect.consume()) return false;
    e.conns++;
    return true;
  }

  /** Pair with every accepted tryConnect when the socket closes. */
  disconnect(ip: string): void {
    const e = this.entries.get(ip);
    if (e) e.conns = Math.max(0, e.conns - 1);
  }

  /** Gate one auth attempt (hello-with-token, login, or register). */
  allowAuth(ip: string): boolean {
    return this.entry(ip).auth.consume();
  }

  /** Drop long-idle entries so the map never grows without bound. */
  sweep(now = Date.now()): void {
    for (const [ip, e] of this.entries) {
      if (e.conns === 0 && now - e.lastSeen > IDLE_MS) this.entries.delete(ip);
    }
  }

  get size(): number {
    return this.entries.size;
  }
}

/** The one process-wide guard; sessions and the accept gate share it. */
export const ipGuard = new IpGuard();
setInterval(() => ipGuard.sweep(), 60_000).unref();

/**
 * The client's real address. In production the peer is always nginx on
 * loopback, so ONLY a loopback peer may speak for someone else — and
 * then via X-Real-IP (nginx SETS it from $remote_addr, so it cannot be
 * smuggled through). A direct (LAN/dev) peer is taken at face value;
 * forwarded headers from a non-loopback peer are ignored entirely.
 */
export function clientIp(req: IncomingMessage): string {
  const peer = req.socket.remoteAddress ?? 'unknown';
  const loopback = peer === '127.0.0.1' || peer === '::1' || peer === '::ffff:127.0.0.1';
  if (loopback) {
    const real = req.headers['x-real-ip'];
    if (typeof real === 'string' && real.length > 0) return real;
    // Fallback for proxies that only append X-Forwarded-For: the LAST
    // hop is the one our own proxy appended, everything before it is
    // client-controlled.
    const fwd = req.headers['x-forwarded-for'];
    const raw = Array.isArray(fwd) ? fwd[fwd.length - 1] : fwd;
    const last = raw?.split(',').pop()?.trim();
    if (last) return last;
  }
  return peer;
}
