/**
 * ONE TAKE, END TO END.
 *
 * Hand this a live lane and a shot: it starts the director inside the
 * page, narrates the pre-roll while it runs, lifts the sealed tape out
 * in slices, and reports honestly on how the frames actually landed.
 *
 * The take report is the reason this is a pipeline and not a macro. A
 * reel with eleven hitches in it is not a reel — the lane says so, and
 * a bad machine day never quietly ships.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Lane } from './lane.js';

export interface TakeReport {
  id: string;
  raw: string;
  bytes: number;
  frames: number;
  medianDt: number;
  hitches: number;
  worstDt: number;
  overspend: string[];
  marks: Record<string, number>;
  /** The performer died mid-take — always a re-shoot. */
  died: boolean;
  /** True when the tape is clean enough to ship without a re-take. */
  clean: boolean;
}

const SLICE = 6 << 20; // 6 MB per bridge crossing

export async function capture(
  lane: Lane,
  shot: { id: string; seconds: number; fps?: number },
  rawDir: string,
): Promise<TakeReport> {
  const page = lane.page;
  mkdirSync(rawDir, { recursive: true });
  const raw = join(rawDir, `${shot.id}.raw.webm`);

  // macOS parks an unfocused window's frame loop at 30 Hz no matter
  // what flags the browser was launched with. A take is only honest if
  // the window is the front one — and the take report below is what
  // catches it on the days this is not enough.
  await page.bringToFront();
  await page.evaluate((id) => (globalThis as any).__reel.begin(id), shot.id);

  let lastNote = '';
  for (;;) {
    const s = (await page.evaluate(() => (globalThis as any).__reel.status())) as {
      phase: string;
      note: string;
      done: boolean;
      error: string;
      bytes: number;
      stats: null | {
        frames: number;
        medianDt: number;
        hitches: number;
        worstDt: number;
        overspend: string[];
        marks: Record<string, number>;
        died: boolean;
      };
    };
    const line = `${s.phase}${s.note ? ` · ${s.note}` : ''}`;
    if (line !== lastNote) {
      console.log(`    ${line}`);
      lastNote = line;
    }
    if (s.error) throw new Error(`shot ${shot.id}: ${s.error}`);
    if (s.done && s.stats) {
      const chunks: Buffer[] = [];
      for (let off = 0; off < s.bytes; off += SLICE) {
        const b64 = (await page.evaluate(
          ([o, l]) => (globalThis as any).__reel.read(o, l),
          [off, Math.min(SLICE, s.bytes - off)] as [number, number],
        )) as string;
        chunks.push(Buffer.from(b64, 'base64'));
      }
      writeFileSync(raw, Buffer.concat(chunks));
      const fps = shot.fps ?? 30;
      const expected = shot.seconds * fps;
      const report: TakeReport = {
        id: shot.id,
        raw,
        bytes: s.bytes,
        frames: s.stats.frames,
        medianDt: s.stats.medianDt,
        hitches: s.stats.hitches,
        worstDt: s.stats.worstDt,
        overspend: s.stats.overspend,
        marks: s.stats.marks,
        died: s.stats.died,
        // A clean take: the performer lived, the frame loop kept pace,
        // hitches stayed under three per hundred frames, and no staging
        // command fell off the chat bucket. Three per cent is where the
        // eye starts to catch it: at a 30 fps target a hitch is one
        // frame held for two, invisible on its own and only legible
        // when they cluster.
        clean:
          !s.stats.died &&
          s.stats.medianDt <= 1000 / fps + 2.5 &&
          s.stats.hitches <= Math.ceil(expected * 0.03) &&
          s.stats.overspend.length === 0,
      };
      return report;
    }
    await page.waitForTimeout(400);
  }
}
