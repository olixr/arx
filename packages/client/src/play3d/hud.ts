/**
 * THE CONFESSION (play3d S1) — a DOM overlay that tells the truth about
 * the frame: rAF interval (EMA + worst of the last 2 s), Three's own
 * renderer.info (draw calls, triangles, programs, geometries, textures)
 * and this client's ledgers (chunks, bakes in flight, texture bytes,
 * standing instances, entity repaints). Updated at 4 Hz so the HUD
 * itself never becomes the frame cost it reports.
 *
 * Headless numbers are INDICATIONS ONLY: a headless rAF is capped and
 * jittery, so "frame ms" from Playwright is never an fps claim.
 */

export interface ConfessionExtra {
  [key: string]: string | number;
}

export class Confession {
  private readonly el: HTMLElement;
  private ema = 16.7;
  private worst = 0;
  private worstAt = 0;
  private lastFlush = 0;
  private frames = 0;
  private lastFpsAt = 0;
  private fps = 0;
  /** The last rendered lines — read by the Playwright probe. */
  lines: string[] = [];

  constructor(parent: HTMLElement) {
    this.el = document.createElement('pre');
    this.el.id = 'confession';
    parent.appendChild(this.el);
  }

  /** Feed one frame's wall interval (ms). */
  frame(ms: number, nowMs: number): void {
    this.ema += (ms - this.ema) * 0.08;
    if (ms > this.worst || nowMs - this.worstAt > 2000) {
      this.worst = ms;
      this.worstAt = nowMs;
    }
    this.frames++;
    if (nowMs - this.lastFpsAt >= 1000) {
      this.fps = (this.frames * 1000) / (nowMs - this.lastFpsAt);
      this.frames = 0;
      this.lastFpsAt = nowMs;
    }
  }

  /** True when the next `update` will repaint — build its lines only then. */
  due(nowMs: number): boolean {
    return nowMs - this.lastFlush >= 250;
  }

  /** Repaint the overlay at most every 250 ms. */
  update(
    nowMs: number,
    info: { render: { calls: number; triangles: number }; memory: { geometries: number; textures: number }; programs: unknown[] | null },
    extra: ConfessionExtra,
  ): void {
    if (nowMs - this.lastFlush < 250) return;
    this.lastFlush = nowMs;
    const lines = [
      `frame ${this.ema.toFixed(1)}ms ema · worst ${this.worst.toFixed(1)}ms · ${this.fps.toFixed(0)} fps (rAF)`,
      `draws ${info.render.calls} · tris ${(info.render.triangles / 1000).toFixed(1)}k · programs ${info.programs?.length ?? 0}`,
      `geometries ${info.memory.geometries} · textures ${info.memory.textures}`,
    ];
    for (const [k, v] of Object.entries(extra)) lines.push(`${k} ${typeof v === 'number' ? fmt(v) : v}`);
    this.lines = lines;
    this.el.textContent = lines.join('\n');
  }

  dispose(): void {
    this.el.remove();
  }
}

function fmt(v: number): string {
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2);
}

/** W2: the structures line — draws / tris / atlas pages for the standing geometry. */
export function fmtStructStats(s: {
  chunks: number;
  draws: number;
  tris: number;
  quads: number;
  geometryBytes: number;
  atlasPages: number;
  atlasTiles: number;
  atlasBytes: number;
  buildMsLast: number;
  dirty: number;
  rebuilds: number;
  wakesSkipped: number;
}): string {
  return (
    `${s.draws} draws · ${(s.tris / 1000).toFixed(1)}k tris (${s.quads} quads) over ${s.chunks} chunks · ` +
    `geometry ${fmtBytes(s.geometryBytes)} · faces ${s.atlasTiles} tiles / ${s.atlasPages} pages (${fmtBytes(s.atlasBytes)}) · ` +
    `build ${s.buildMsLast.toFixed(1)}ms · dirty ${s.dirty} · rebuilds ${s.rebuilds} (wakes skipped ${s.wakesSkipped})`
  );
}

export function fmtBytes(b: number): string {
  if (b > 1e9) return `${(b / 1e9).toFixed(2)} GB`;
  if (b > 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  return `${(b / 1e3).toFixed(0)} kB`;
}
