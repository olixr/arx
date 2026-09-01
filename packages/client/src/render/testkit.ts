/**
 * THE ONE FAKE BRUSH — the recording canvas context every painter test
 * needs, kept in one place instead of re-implemented per test file.
 *
 * The kit's law: a painter run headlessly must (a) never emit non-finite
 * geometry (every numeric argument is checked), and (b) leave a legible
 * receipt (fill counts, dark-fill counts, a coordinate checksum) that a
 * test can assert against. Anything not modeled is a counted no-op.
 *
 * Import ONLY from *.test.ts files — this module asserts, it never ships.
 */
import assert from 'node:assert/strict';

export interface RecordingCtx {
  /** fill() + fillRect() calls. */
  fills: number;
  /** Fills laid while fillStyle read as a dark ink (#2…). */
  darkFills: number;
  /** Running sum of every finite numeric argument — a cheap geometry
   *  fingerprint: two runs that draw the same shapes sum the same. */
  coordSum: number;
  /** Every distinct method name the painter touched, in call order. */
  calls: string[];
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  globalAlpha: number;
}

/** A CanvasRenderingContext2D whose receipts a test can read back. */
export type TestCtx = CanvasRenderingContext2D & RecordingCtx;

/**
 * Build the recording context. Every method is a no-op that NaN-checks
 * its numeric arguments; `fill`/`fillRect` also count. Properties set by
 * the painter (fillStyle, transforms…) are stored and read back as-is.
 */
export function recordingCtx(): TestCtx {
  const counter = {
    fills: 0,
    darkFills: 0,
    coordSum: 0,
    calls: [] as string[],
    fillStyle: '#000' as string | CanvasGradient | CanvasPattern,
    strokeStyle: '#000' as string | CanvasGradient | CanvasPattern,
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
  };
  const checkNums = (args: unknown[]): void => {
    for (const a of args) {
      if (typeof a === 'number') {
        assert.ok(Number.isFinite(a), 'painter emitted non-finite geometry');
        counter.coordSum += a;
      }
    }
  };
  return new Proxy(counter, {
    get(target, prop: string) {
      if (prop in target) return target[prop as keyof typeof target];
      const record = (...args: unknown[]): void => {
        target.calls.push(prop);
        checkNums(args);
        if (prop === 'fill' || prop === 'fillRect') {
          target.fills++;
          if (typeof target.fillStyle === 'string' && target.fillStyle.startsWith('#2')) {
            target.darkFills++;
          }
        }
      };
      return record;
    },
    set(target, prop: string, value) {
      (target as Record<string, unknown>)[prop] = value;
      return true;
    },
  }) as unknown as TestCtx;
}
