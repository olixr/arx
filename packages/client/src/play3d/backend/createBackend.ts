/**
 * THE ONE FACTORY (play3d S3) — the only call site that names a
 * concrete GPU backend. See stageBackend.ts for the law.
 */
import { type Backend, type BackendOpts, refuseBackend } from '../stageBackend.js';
import { createWebGLBackend } from './webgl.js';

export function createBackend(canvas: HTMLCanvasElement, opts: BackendOpts = {}): Backend {
  const kind = opts.kind ?? 'webgl';
  if (kind !== 'webgl') return refuseBackend(kind);
  return createWebGLBackend(canvas, opts);
}
