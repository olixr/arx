/**
 * THE REELS — recorded game, played back on the front door.
 *
 * Every clip on this page came out of packages/tools/src/reel: the real
 * client, driven through the real input layer, taped off the real
 * canvas. The manifest at /reels/reels.json is written by that lane, so
 * the page never carries a hand-kept list of files that can rot.
 *
 * Three rules hold the whole thing together:
 *
 *  1. NOTHING PLAYS OFF SCREEN. Every clip is behind an
 *     IntersectionObserver; leaving the viewport pauses it, and the tab
 *     going away pauses everything. A dozen 1080p60 videos playing into
 *     nothing is how a beautiful page becomes a hot laptop.
 *  2. NOTHING LOADS BEFORE IT IS WANTED. `preload="none"` until a clip
 *     is within a screen of the fold, and phones get the 720 ladder.
 *  3. REDUCED MOTION MEANS STILLS. Not "slower" — stills. The poster
 *     frame of every reel is a real frame of the same take, so the page
 *     loses its motion and keeps its argument.
 */

export interface ReelEntry {
  id: string;
  title: string;
  caption: string;
  pillar: string;
  seconds: number;
  loop: boolean;
  hero: boolean;
  poster: string;
  sources: { webm: string; webm720: string; mp4: string };
}

interface Manifest {
  generated: string;
  reels: ReelEntry[];
}

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Phones, and anything on a metered-feeling connection, take the 720. */
const small =
  window.matchMedia('(max-width: 900px)').matches ||
  (navigator as { connection?: { saveData?: boolean } }).connection?.saveData === true;

export async function loadReels(): Promise<Map<string, ReelEntry>> {
  try {
    const res = await fetch('/reels/reels.json', { cache: 'force-cache' });
    if (!res.ok) return new Map();
    const data = (await res.json()) as Manifest;
    return new Map(data.reels.map((r) => [r.id, r]));
  } catch {
    // A missing manifest is not an error the visitor should ever see:
    // the page keeps its posters, its copy, and its live canvas.
    return new Map();
  }
}

export interface ReelOptions {
  /** Loop forever (background plates) or play once and hold. */
  loop?: boolean;
  /** Start muted-autoplaying as soon as it is near the fold. */
  auto?: boolean;
  /** Extra classes for the media element. */
  className?: string;
  /** Full-bleed surface: take the 1080 ladder. Wells take the 720. */
  full?: boolean;
}

/** One reel as a <video>, wired for the three rules above. */
export function reelVideo(entry: ReelEntry, opts: ReelOptions = {}): HTMLElement {
  if (reduced) {
    const img = document.createElement('img');
    img.src = entry.poster;
    img.alt = entry.title;
    img.className = opts.className ?? '';
    img.loading = 'lazy';
    return img;
  }
  const v = document.createElement('video');
  v.className = opts.className ?? '';
  v.muted = true;
  v.defaultMuted = true;
  v.playsInline = true;
  v.loop = opts.loop ?? true;
  v.preload = 'none';
  v.poster = entry.poster;
  v.setAttribute('aria-label', entry.title);
  v.disablePictureInPicture = true;
  const src = (url: string, type: string) => {
    const s = document.createElement('source');
    s.src = url;
    s.type = type;
    v.appendChild(s);
  };
  // A feature well is 700 CSS px wide at its largest; a full-bleed band
  // is the whole viewport. `full` is the difference between the two,
  // and it is worth several megabytes a clip.
  src(small || !opts.full ? entry.sources.webm720 : entry.sources.webm, 'video/webm');
  src(entry.sources.mp4, 'video/mp4');
  watch(v, opts.auto ?? true);
  return v;
}

/** The load-and-play gate every clip on the page rides. */
export function watch(v: HTMLVideoElement, auto: boolean): void {
  let loaded = false;
  const near = new IntersectionObserver(
    (es) => {
      for (const e of es) {
        if (!e.isIntersecting || loaded) continue;
        loaded = true;
        v.preload = 'auto';
        v.load();
        near.disconnect();
      }
    },
    { rootMargin: '120% 0px' },
  );
  near.observe(v);

  if (!auto) return;
  const io = new IntersectionObserver(
    (es) => {
      for (const e of es) {
        if (e.isIntersecting && !document.hidden) void v.play().catch(() => {});
        else v.pause();
      }
    },
    { threshold: 0.15 },
  );
  io.observe(v);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) v.pause();
    else if (v.getBoundingClientRect().top < innerHeight) void v.play().catch(() => {});
  });
}

/**
 * THE COLD OPEN — the hero montage.
 *
 * Two video layers, one on top of the other. The top one plays; the
 * next one is already loaded and waiting underneath; at the cut they
 * trade opacity over a beat and trade roles. That is the whole trick,
 * and it is the only one that gives a hard-cut trailer rhythm without
 * a frame of black between clips.
 *
 * Each clip runs for a written beat rather than to its end, because a
 * trailer cuts on the action, not on the file.
 */
export function montage(
  stage: HTMLElement,
  entries: ReelEntry[],
  ui: { caption: HTMLElement | null; ticks: HTMLElement | null },
): void {
  if (!entries.length) return;
  if (reduced) {
    const img = document.createElement('img');
    img.src = entries[0]!.poster;
    img.alt = entries[0]!.title;
    img.className = 'reel-layer is-on';
    stage.appendChild(img);
    if (ui.caption) ui.caption.textContent = entries[0]!.caption;
    return;
  }

  const layers = [0, 1].map(() => {
    const v = document.createElement('video');
    v.className = 'reel-layer';
    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;
    v.loop = true;
    v.preload = 'none';
    v.disablePictureInPicture = true;
    stage.appendChild(v);
    return v;
  });

  const load = (v: HTMLVideoElement, e: ReelEntry) => {
    v.replaceChildren();
    const s = document.createElement('source');
    s.src = small ? e.sources.webm720 : e.sources.webm;
    s.type = 'video/webm';
    const m = document.createElement('source');
    m.src = e.sources.mp4;
    m.type = 'video/mp4';
    v.append(s, m);
    v.poster = e.poster;
    v.preload = 'auto';
    v.load();
  };

  const ticks: HTMLElement[] = [];
  if (ui.ticks) {
    entries.forEach((e, i) => {
      const b = document.createElement('button');
      b.className = 'reel-tick';
      b.type = 'button';
      b.title = e.title;
      b.setAttribute('aria-label', `Show: ${e.title}`);
      b.addEventListener('click', () => cutTo(i));
      ui.ticks!.appendChild(b);
      ticks.push(b);
    });
  }

  let front = 0;
  let index = 0;
  let timer = 0;
  let running = true;

  /** A clip holds for its own length, capped — no shot outstays it. */
  const holdMs = (e: ReelEntry) => Math.min(8200, Math.max(4200, e.seconds * 1000 - 400));

  function paint(i: number): void {
    if (ui.caption) ui.caption.textContent = entries[i]!.caption;
    ticks.forEach((t, n) => t.classList.toggle('is-on', n === i));
  }

  function cutTo(i: number): void {
    window.clearTimeout(timer);
    index = ((i % entries.length) + entries.length) % entries.length;
    const next = layers[1 - front]!;
    const cur = layers[front]!;
    load(next, entries[index]!);
    const roll = () => {
      void next.play().catch(() => {});
      next.classList.add('is-on');
      cur.classList.remove('is-on');
      front = 1 - front;
      paint(index);
      // Pre-roll the one after this, so its first frame is ready at
      // the cut instead of being fetched at it.
      const after = entries[(index + 1) % entries.length]!;
      const spare = layers[1 - front]!;
      window.setTimeout(() => load(spare, after), 900);
      if (running) timer = window.setTimeout(() => cutTo(index + 1), holdMs(entries[index]!));
    };
    if (next.readyState >= 2) roll();
    else next.addEventListener('loadeddata', roll, { once: true });
  }

  // THE ARROWS WORK. A trailer with chapter marks that only a mouse can
  // reach is a trailer half the room cannot drive.
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const tag = (document.activeElement as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const seen = stage.getBoundingClientRect();
    if (seen.bottom < 80 || seen.top > window.innerHeight - 80) return;
    e.preventDefault();
    cutTo(index + (e.key === 'ArrowRight' ? 1 : -1));
  });

  const io = new IntersectionObserver(
    (es) => {
      for (const e of es) {
        running = e.isIntersecting && !document.hidden;
        if (running) {
          void layers[front]!.play().catch(() => {});
          timer = window.setTimeout(() => cutTo(index + 1), holdMs(entries[index]!));
        } else {
          layers.forEach((v) => v.pause());
          window.clearTimeout(timer);
        }
      }
    },
    { threshold: 0.05 },
  );
  io.observe(stage);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      layers.forEach((v) => v.pause());
      window.clearTimeout(timer);
    }
  });

  cutTo(0);
}
