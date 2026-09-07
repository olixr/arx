/**
 * THE SERVER TELLS ITS OWN HEALTH — one small ledger of counters and
 * gauges the whole process shares. Counters only rise (`inc`), gauges
 * are set whole (`set`), and `observe` keeps count/sum/max for a
 * timing. Everything lives in a Map so a new number costs one line at
 * the site that knows it; the minute tick line and `/metrics` read the
 * same ledger, so a figure in the log is the figure on the wire.
 *
 * Deliberately not a client library: no labels, no histograms, no
 * exporter — the box has one process and the reader is a human with
 * curl or the supervisor log.
 */

const counters = new Map<string, number>();
const gauges = new Map<string, number>();
const observations = new Map<string, { count: number; sum: number; max: number }>();

/** Raise a counter by n (default 1). Counters never go down. */
export function inc(name: string, n = 1): void {
  counters.set(name, (counters.get(name) ?? 0) + n);
}

/** Set a gauge to its current value. */
export function set(name: string, value: number): void {
  gauges.set(name, value);
}

/** Record one sample of a timing/size; keeps count, sum and max. */
export function observe(name: string, value: number): void {
  const o = observations.get(name);
  if (o) {
    o.count++;
    o.sum += value;
    if (value > o.max) o.max = value;
  } else {
    observations.set(name, { count: 1, sum: value, max: value });
  }
}

export function counter(name: string): number {
  return counters.get(name) ?? 0;
}

export function gauge(name: string): number {
  return gauges.get(name) ?? 0;
}

export function observed(name: string): { count: number; sum: number; max: number; avg: number } {
  const o = observations.get(name) ?? { count: 0, sum: 0, max: 0 };
  return { ...o, avg: o.count > 0 ? o.sum / o.count : 0 };
}

/** Forget an observation series (the minute line resets its window). */
export function resetObserved(name: string): void {
  observations.delete(name);
}

/** Every number, flat — what `/metrics` prints and tests read. */
export function snapshot(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of counters) out[k] = v;
  for (const [k, v] of gauges) out[k] = v;
  for (const [k, o] of observations) {
    out[`${k}.count`] = o.count;
    out[`${k}.sum`] = o.sum;
    out[`${k}.max`] = o.max;
  }
  return out;
}

/** `name value` per line, sorted — the `/metrics` body. */
export function renderText(): string {
  const snap = snapshot();
  return (
    Object.keys(snap)
      .sort()
      .map((k) => `${k} ${snap[k]}`)
      .join('\n') + '\n'
  );
}

/** Tests only: wipe the ledger between cases. */
export function resetAll(): void {
  counters.clear();
  gauges.clear();
  observations.clear();
}

// ------------------------------------------------------- boot warnings

let bootSealed = false;

/**
 * THE BOOT COUNTS ITS SOFT FAILS: every "loaded anyway / skipped /
 * authored def stands" site on the boot path warns THROUGH here, so
 * the count survives to the "listening" line and to /healthz instead
 * of living only in a log a human happened to tail. After `sealBoot()`
 * (the listening line) the same door still warns but no longer counts —
 * a Studio reload's complaint is not a boot warning.
 */
export function bootWarn(line: string): void {
  console.warn(line);
  if (!bootSealed) inc('boot.warnings');
}

export function bootWarnings(): number {
  return counter('boot.warnings');
}

export function sealBoot(): void {
  bootSealed = true;
}

/** Tests only: reopen the boot window. */
export function unsealBoot(): void {
  bootSealed = false;
}

/** `remoteAddress` is a loopback peer — the only reader `/metrics` serves. */
export function isLoopback(addr: string | undefined): boolean {
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
}
