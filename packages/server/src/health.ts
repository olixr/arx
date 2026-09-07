import { bootWarnings, counter } from './metrics.js';
import { TICK_THROWS_MAX_PER_MIN } from './game/tuning.js';

/**
 * THE SERVER TELLS ITS OWN HEALTH — /healthz is a READINESS probe, not
 * a "the port answers" stub. The deploy's poll (scripts/arxctl.sh
 * wait_healthy) and the supervisor read this body; a server whose tick
 * loop has stopped or whose one DB connection is wedged answers 503
 * with a `why`, so a bad release fails the deploy instead of passing
 * because the http listener was alive.
 */
export interface HealthProbe {
  /** performance.now()-domain stamp of the last completed tick (0 = never). */
  lastTickAt: () => number;
  now: () => number;
  tickAvgMs: () => number;
  tickMaxMs: () => number;
  /** Ticks whose systems threw inside the last minute (the loop's catch counts them). */
  tickThrowsLastMin: () => number;
  /** SELECT 1 through the FIFO — resolves the round trip in ms. May never resolve when wedged. */
  dbPing: () => Promise<number>;
  dbQueueDepth: () => number;
  players: () => number;
  bootedAt: number;
  /** The ping's patience (default DB_PING_SLOW_MS) — tests shorten it. */
  slowMs?: number;
  /** How long one issued ping is shared before a fresh one is allowed (default DB_PING_ABANDON_MS). */
  abandonMs?: number;
  /** Throws-per-minute past which the tick is reported broken (default TICK_THROWS_MAX_PER_MIN). */
  maxThrowsPerMin?: number;
}

export interface HealthBody {
  ok: boolean;
  why?: string;
  uptimeSec: number;
  players: number;
  lastTickAgeMs: number;
  tickAvgMs: number;
  tickMaxMs: number;
  /** Every tick that threw since boot (the counter); the verdict reads the last minute. */
  tickThrows: number;
  tickThrowsLastMin: number;
  dbPingMs: number | null;
  dbQueueDepth: number;
  dbWriteFailures: number;
  bootWarnings: number;
}

/** A stale tick: two seconds is forty missed ticks — the loop is dead or stalled. */
export const TICK_STALE_MS = 2000;
/** A SELECT 1 slower than this means the FIFO is wedged or buried under a backlog. */
export const DB_PING_SLOW_MS = 1000;
/**
 * ONE PING IN FLIGHT: probes that arrive while a ping is still unanswered
 * share it instead of queueing their own — a 1 s poll against a wedged
 * FIFO used to add one statement per second to the very backlog it was
 * reporting. The shared ping is abandoned (a fresh one may be issued)
 * after this long, so a statement the FIFO dropped can never pin
 * /healthz at 503 after the connection recovers.
 */
export const DB_PING_ABANDON_MS = 30_000;

/** The one outstanding ping per probe (index.ts builds ONE probe; tests build one per case). */
const pingInFlight = new WeakMap<HealthProbe, { promise: Promise<number>; startedAt: number }>();

function sharedPing(p: HealthProbe, now: number): Promise<number> {
  const abandonMs = p.abandonMs ?? DB_PING_ABANDON_MS;
  const live = pingInFlight.get(p);
  if (live !== undefined && now - live.startedAt < abandonMs) return live.promise;
  const entry = { promise: p.dbPing(), startedAt: now };
  pingInFlight.set(p, entry);
  const settle = () => {
    if (pingInFlight.get(p) === entry) pingInFlight.delete(p);
  };
  entry.promise.then(settle, settle);
  return entry.promise;
}

export async function healthReport(p: HealthProbe): Promise<{ status: 200 | 503; body: HealthBody }> {
  const last = p.lastTickAt();
  const lastTickAgeMs = last > 0 ? Math.max(0, Math.round(p.now() - last)) : -1;
  // The ping races a timer: a wedged FIFO never answers, and a probe
  // that hangs with it would be worse than the stall it should report.
  const slowMs = p.slowMs ?? DB_PING_SLOW_MS;
  let dbPingMs: number | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    dbPingMs = await Promise.race([
      sharedPing(p, Date.now()),
      new Promise<null>((res) => {
        timer = setTimeout(() => res(null), slowMs);
      }),
    ]);
  } catch {
    dbPingMs = null;
  } finally {
    if (timer) clearTimeout(timer);
  }
  const throwsLastMin = p.tickThrowsLastMin();
  const maxThrows = p.maxThrowsPerMin ?? TICK_THROWS_MAX_PER_MIN;
  let why: string | undefined;
  if (lastTickAgeMs < 0) why = 'no tick yet';
  else if (lastTickAgeMs > TICK_STALE_MS) why = `tick stale ${lastTickAgeMs}ms`;
  else if (throwsLastMin > maxThrows) why = `tick throwing ${throwsLastMin}/min`;
  else if (dbPingMs === null) why = `db ping over ${slowMs}ms (queue ${p.dbQueueDepth()})`;
  else if (dbPingMs > slowMs) why = `db ping ${Math.round(dbPingMs)}ms`;
  const body: HealthBody = {
    ok: why === undefined,
    ...(why !== undefined ? { why } : {}),
    uptimeSec: Math.floor((Date.now() - p.bootedAt) / 1000),
    players: p.players(),
    lastTickAgeMs,
    tickAvgMs: Math.round(p.tickAvgMs() * 100) / 100,
    tickMaxMs: Math.round(p.tickMaxMs() * 10) / 10,
    tickThrows: counter('tick.throws'),
    tickThrowsLastMin: throwsLastMin,
    dbPingMs: dbPingMs === null ? null : Math.round(dbPingMs * 10) / 10,
    dbQueueDepth: p.dbQueueDepth(),
    dbWriteFailures: counter('db.writeFailures'),
    bootWarnings: bootWarnings(),
  };
  return { status: body.ok ? 200 : 503, body };
}
