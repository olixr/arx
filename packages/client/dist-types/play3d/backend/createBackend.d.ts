/**
 * THE ONE FACTORY (play3d S3) — the only call site that names a
 * concrete GPU backend. See stageBackend.ts for the law.
 */
import { type Backend, type BackendOpts } from '../stageBackend.js';
export declare function createBackend(canvas: HTMLCanvasElement, opts?: BackendOpts): Backend;
//# sourceMappingURL=createBackend.d.ts.map