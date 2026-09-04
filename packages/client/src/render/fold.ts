import { CHUNK_SIZE } from '@arx/shared';
import {
  HALO_LEN,
  allocHalo,
  copyStroke,
  fillHalo,
  haloSig,
  prepareStrokes,
  projectCores,
  reachSig,
  strokeKey,
  type PreparedStroke,
  type SpectrumCore,
  type SpectrumStroke,
} from '@arx/content';

/**
 * THE FOLD — the painter's spectrum registry (docs/contested-lands-plan.md
 * §12). The field math lives in content/spectrum.ts; this module is
 * the client-side copy of the strokes the wire delivered, prepared
 * once per swap, and the two doors the chunk bake will read:
 *
 *   spectrumSig(cx, cy)            — the cache key's new word. 0 means
 *                                    "no stroke in reach": the fast
 *                                    path, and today's byte-identical
 *                                    paint. Any reach hashes non-zero.
 *   spectrumHalo(baseX, baseY, out) — the 36² × 4-axis quantised field
 *                                    at every tile centre of the halo
 *                                    computeLayerIdx already walks.
 *
 * NOT wired into terrain.ts in LG-0 (that is LG-1's band); exported
 * for it. The registry is fed ONLY by the wire (welcome geo, the
 * `spectrum` record) so a bake never reads a registry mid-swap, and
 * it keeps its own epoch so any cache keyed on it dies with the
 * registry it projected.
 *
 * NO CLOCK REACHES A PAINTED VALUE: this module never reads Date or
 * performance. Live cores are projected only through setSpectrumClock,
 * whose argument is a server time the caller quantises (LG-7's
 * 5-second ticker against the server-clock offset).
 */

interface FoldRegistry {
  strokes: SpectrumStroke[];
  cores: SpectrumCore[];
  /** The server time the cores were last projected at (null = never). */
  coreNowMs: number | null;
  /** The keys of the projected core strokes — a step compares here. */
  coreKeys: string;
  /** Authored strokes + projected cores, prepared for the field walk. */
  prepared: PreparedStroke[];
  epoch: number;
}

const REG: FoldRegistry = {
  strokes: [],
  cores: [],
  coreNowMs: null,
  coreKeys: '',
  prepared: [],
  epoch: 0,
};

/** Per-chunk sig memo, cleared on every epoch; bounded so a long walk cannot grow it forever. */
const SIG_CACHE = new Map<number, number>();
const SIG_CACHE_CAP = 4096;
/** The per-bake scratch list of in-reach strokes (transient, pooled). */
const REACH_SCRATCH: PreparedStroke[] = [];

function chunkSlot(cx: number, cy: number): number {
  return ((cx + 0x8000) & 0xffff) | (((cy + 0x8000) & 0xffff) << 16);
}

function rebuild(): void {
  const projected = REG.coreNowMs === null ? [] : projectCores(REG.cores, REG.coreNowMs);
  REG.coreKeys = projected.map(strokeKey).join('\n');
  REG.prepared = prepareStrokes(REG.strokes.concat(projected));
  REG.epoch++;
  SIG_CACHE.clear();
}

/**
 * Whole-list replace from the wire (welcome geo → strokes with no
 * cores; the `spectrum` record → both). Cores keep the last projection
 * time so a registry swap mid-ramp re-projects at the same tick.
 */
export function setSpectrum(strokes: readonly SpectrumStroke[], cores: readonly SpectrumCore[]): void {
  REG.strokes = strokes.map(copyStroke);
  REG.cores = cores.map((c) => ({ ...c }));
  rebuild();
}

/**
 * Project the live cores at a (quantised) server time. Returns whether
 * the field changed — the epoch bumps only when some core's snapped
 * radius actually moved, so a ticker that fires with nothing to say
 * costs no re-bake. Unwired in LG-0.
 */
export function setSpectrumClock(nowMs: number): boolean {
  REG.coreNowMs = nowMs;
  if (REG.cores.length === 0) return false;
  const keys = projectCores(REG.cores, nowMs).map(strokeKey).join('\n');
  if (keys === REG.coreKeys) return false;
  rebuild();
  return true;
}

/** Bumps on every swap that could move a painted value. */
export function spectrumEpoch(): number {
  return REG.epoch;
}

/** The authored strokes as the registry holds them (read only). */
export function spectrumStrokes(): readonly SpectrumStroke[] {
  return REG.strokes;
}

/** The live cores as the registry holds them (read only). */
export function spectrumCores(): readonly SpectrumCore[] {
  return REG.cores;
}

/** Everything the field walk reads right now — strokes and projected cores. */
export function spectrumPrepared(): readonly PreparedStroke[] {
  return REG.prepared;
}

/**
 * The chunk's spectrum signature (see content/spectrum.ts reachSig):
 * 0 iff no stroke or projected core reaches the chunk's halo. Memoised
 * per epoch — a bbox walk per chunk per frame is cheap, a Map read is
 * cheaper, and zero strokes never allocate.
 */
export function spectrumSig(cx: number, cy: number): number {
  if (REG.prepared.length === 0) return 0;
  const slot = chunkSlot(cx, cy);
  const hit = SIG_CACHE.get(slot);
  if (hit !== undefined) return hit;
  const sig = reachSig(REG.prepared, cx, cy, CHUNK_SIZE);
  if (SIG_CACHE.size >= SIG_CACHE_CAP) SIG_CACHE.clear();
  SIG_CACHE.set(slot, sig);
  return sig;
}

/**
 * Fill `out` (HALO_LEN Int16 words) with the quantised field over the
 * chunk's 36² halo. Returns whether any word is non-zero; on false the
 * halo is all zero and the painter takes today's code path. Sampled in
 * world coordinates, so a tile two chunks share reads the same word
 * from either side.
 */
export function spectrumHalo(baseX: number, baseY: number, out: Int16Array): boolean {
  if (out.length !== HALO_LEN) throw new Error(`spectrumHalo: halo must hold ${HALO_LEN} words`);
  if (REG.prepared.length === 0) {
    out.fill(0);
    return false;
  }
  return fillHalo(REG.prepared, baseX, baseY, CHUNK_SIZE, out, REACH_SCRATCH);
}

/** A fresh halo (LG-1 pools these beside the layer index). */
export function allocSpectrumHalo(): Int16Array {
  return allocHalo();
}

/**
 * THE FIELD-AWARE KEY (plan §12.2 cache keys): once LG-1 has built a
 * chunk's halo, this hashes the words it will actually paint. Store it
 * on BakedChunk beside spectrumSig: a registry swap that leaves every
 * sample where it was (a far stroke edited, a core step that snapped
 * to the same ring) hashes the same and is NOT a re-bake. reachSig
 * (spectrumSig above) is the cheap gate — "anything in reach?" — and
 * this is the truth behind it. 0 iff the halo is all zero.
 */
export const spectrumHaloSig = haloSig;

/** Forget everything — tests, and the plane crossing's cache drop if LG-1 wants it. */
export function resetSpectrum(): void {
  REG.strokes = [];
  REG.cores = [];
  REG.coreNowMs = null;
  rebuild();
}
