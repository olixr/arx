/**
 * The track player — performs the user's authored music library.
 * (The generative score/music system is SET ASIDE by user decision —
 * "too repetitive and basic" — the code and its tests remain, unwired.)
 *
 * The library lives in /public/music and is streamed, never decoded
 * into memory: each track is an HTMLAudioElement wrapped in a
 * MediaElementSource, routed through the engine's `tracks` bus (nearly
 * dry — the files arrive already mastered; the shared room would only
 * smear them).
 *
 * The whole player leans Breath-of-the-Wild: music is scenery that
 * EMERGES from the world's own sound and recedes back into it. Slow
 * blooms, long quiets, and no two sittings walking the same path.
 *
 * Laws:
 *  - MOOD PICKS THE SHELF: town zone → town tracks; underground → the
 *    dungeon shelf; night hours → night tracks; otherwise the day
 *    adventure shelf.
 *    Mood commits on a 2.5s-sustained change (no doorway stutter),
 *    then the sounding track bows out with a fade and the new mood
 *    opens after a short breath.
 *  - THE FULL DECK: each shelf is dealt as a shuffled deck — every
 *    track plays once before any repeats, and a reshuffle never leads
 *    with the track just heard. Decks persist across sessions
 *    (localStorage), so even short sittings walk the library's full
 *    swath instead of re-rolling the same openers.
 *  - THE SONG REMEMBERED: a track cut mid-flight by a mood change is
 *    bookmarked; return to that mood within a few minutes and it takes
 *    up where it left off (a breath rewound) instead of restarting.
 *    Stepping into town and back out never replays the same opening.
 *  - EVERY EDGE IS A LONG BREATH: slow eased fades — ~5s bloom in,
 *    ~3.5s bow out — on a PER-TRACK gain node. Fades never touch the
 *    bus and no two tracks ever fight over one fader, so an interrupted
 *    fade can simply become a gentle crossfade.
 *  - SILENCE IS A SECTION: the rest after a track ends is tuned per
 *    mood — towns sing again sooner; the wild and the night hold long
 *    scenic quiets where the world's own ambience carries the scene.
 */

import type { AudioEngine } from './engine.js';
import { dominantZone, type ZoneWeights } from './zones.js';

export type TrackMood = 'adventure' | 'night' | 'town' | 'dungeon' | 'danger';

export const TRACK_LIBRARY: Record<TrackMood, string[]> = {
  adventure: [
    'adventure_1', 'adventure_2', 'adventure_3', 'adventure_4', 'adventure_5',
    'adventure_6', 'adventure_7', 'adventure_8',
  ],
  night: [
    'night_adventure_1', 'night_adventure_2', 'night_adventure_3',
    'night_adventure_4', 'night_adventure_5',
  ],
  town: [
    'town_1', 'town_2', 'town_3', 'town_4', 'town_5', 'town_6', 'town_7',
  ],
  /** The long dark: everything under the world plays its own shelf. */
  dungeon: ['dungeon_1', 'dungeon_2', 'dungeon_3', 'dungeon_4', 'dungeon_5', 'dungeon_6'],
  /** The deep frontier (danger tier 4+): the land itself is the boss. */
  danger: ['boss_fight_1', 'boss_fight_2', 'boss_fight_3'],
};

const FADE_IN_SEC = 5.0;
const FADE_OUT_SEC = 3.5;
/** How long a cut track's bookmark stays warm. */
const RESUME_WINDOW_SEC = 180;
/** Rewind a breath so the resumed phrase re-establishes itself. */
const RESUME_REWIND_SEC = 4;
/** Don't bookmark a track that was nearly over anyway. */
const RESUME_MIN_REMAIN_SEC = 25;

/**
 * SILENCE IS A SECTION — the rest [min, max] seconds after a track
 * ends naturally, per mood. Towns feel lived-in and sing again sooner;
 * the wild holds long scenic quiets; the night longer still — the dark
 * belongs to the crickets first and the music second; the dungeon lets
 * the dark breathe between pieces but never goes quiet for long (its
 * ambience is thinner than the surface's, so the shelf carries more of
 * the scene); the deep frontier keeps its dread close.
 */
const REST: Record<TrackMood, readonly [number, number]> = {
  town: [12, 26],
  adventure: [24, 55],
  night: [30, 70],
  dungeon: [18, 42],
  danger: [8, 18],
};

/**
 * Per-track loudness trims — the library is normalized to its own
 * quietest track (EBU R128 integrated loudness, measured with ffmpeg
 * ebur128: −15.3 LUFS reference) so every track leaves the shelf at
 * the same perceived level and the bus fader means one thing.
 * Re-measure and update when tracks are added or replaced.
 */
const TRACK_TRIM: Record<string, number> = {
  adventure_1: 1, // −15.3 LUFS
  adventure_2: 0.9, // −14.4
  adventure_3: 0.86, // −14.0
  adventure_4: 0.76, // −12.9
  adventure_5: 0.9, // −14.4
  adventure_6: 0.74, // −12.7
  adventure_7: 0.72, // −12.5
  adventure_8: 0.73, // −12.6
  night_adventure_1: 0.74, // −12.7
  night_adventure_2: 0.78, // −13.1
  night_adventure_3: 0.79, // −13.3
  night_adventure_4: 0.78, // −13.1
  night_adventure_5: 0.82, // −13.6
  town_1: 0.77, // −13.0
  town_2: 1, // −15.3
  town_3: 0.76, // −12.9
  town_4: 0.76, // −12.9
  town_5: 0.71, // −12.3
  town_6: 0.8, // −13.4
  town_7: 0.83, // −13.7
  dungeon_1: 0.65, // −11.6
  dungeon_2: 0.7, // −12.2
  dungeon_3: 0.7, // −12.2
  dungeon_4: 0.77, // −13.0
  dungeon_5: 0.71, // −12.3
  dungeon_6: 0.79, // −13.2
  boss_fight_1: 0.85, // −13.9
  boss_fight_2: 0.79, // −13.3
  boss_fight_3: 0.86, // −14.0
};

/**
 * Which shelf suits this place, hour, and how far past the lights the
 * listener has walked. Pure — tests could pin it. The danger tier
 * comes from the SAME shared field the server spawns by (the client
 * holds the world seed), so the dread arrives exactly where the
 * dire wolves do: tier 4+ plays the deep-frontier shelf, day or
 * night — out there the land itself is the boss.
 */
export function moodFor(w: ZoneWeights, hours: number, dangerTier = 0): TrackMood {
  if (dominantZone(w) === 'town') return 'town';
  const night = hours < 5.5 || hours > 20.5;
  // Underground is its own country: the dungeon shelf owns every delve.
  if (dominantZone(w) === 'cave') return 'dungeon';
  if (dangerTier >= 4) return 'danger';
  return night ? 'night' : 'adventure';
}

/**
 * THE FULL DECK, pure and testable: take the next track from a
 * shelf's deck, reshuffling the whole shelf when the deck runs dry.
 * A fresh shuffle never leads with the track just played, and names
 * a stale persisted deck no longer carries are dropped on the way in.
 */
export function drawTrack(
  shelf: readonly string[],
  deck: readonly string[],
  last: string | null,
  rand: () => number,
): { name: string; deck: string[] } {
  let d = deck.filter((n) => shelf.includes(n));
  if (d.length === 0) {
    d = [...shelf];
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [d[i], d[j]] = [d[j]!, d[i]!];
    }
    if (d.length > 1 && d[0] === last) {
      const j = 1 + Math.floor(rand() * (d.length - 1));
      [d[0], d[j]] = [d[j]!, d[0]!];
    }
  }
  return { name: d[0]!, deck: d.slice(1) };
}

/** Decks + last-played survive reloads so variety spans sessions. */
const DECK_STORE_KEY = 'arx.musicDecks.v1';

interface DeckStore {
  decks: Partial<Record<TrackMood, string[]>>;
  last: Partial<Record<TrackMood, string>>;
}

function loadDeckStore(): DeckStore {
  try {
    const raw = localStorage.getItem(DECK_STORE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<DeckStore>;
      return { decks: p.decks ?? {}, last: p.last ?? {} };
    }
  } catch {
    // Private browsing or a mangled entry: start a fresh deal.
  }
  return { decks: {}, last: {} };
}

export class TrackPlayer {
  /** Committed mood (readable for debugging). */
  mood: TrackMood = 'adventure';
  state: 'silent' | 'playing' = 'silent';
  /** Name of the sounding track, if any. */
  current: string | null = null;

  private nextAt = 0;
  private candidate: TrackMood | null = null;
  private candidateSince = 0;
  private decks: Partial<Record<TrackMood, string[]>>;
  private lastPlayed: Partial<Record<TrackMood, string>>;
  /** THE SONG REMEMBERED — where each mood's cut track stood. */
  private bookmark: Partial<Record<TrackMood, { name: string; pos: number; at: number }>> = {};
  private media = new Map<string, { el: HTMLAudioElement; gain: GainNode }>();
  /** Pending stop per fading track, cancelled if the track resumes. */
  private pauseTimer = new Map<string, number>();
  private activeEl: HTMLAudioElement | null = null;
  private booted = false;

  constructor(private engine: AudioEngine) {
    const stored = loadDeckStore();
    this.decks = stored.decks;
    this.lastPlayed = stored.last;
  }

  update(w: ZoneWeights, hours: number, dangerTier = 0): void {
    const ctx = this.engine.ctx;
    if (!ctx || !this.engine.tracks) return;
    const t = ctx.currentTime;
    if (!this.booted) {
      // Let the world's own sounds greet the player first.
      this.booted = true;
      this.mood = moodFor(w, hours, dangerTier);
      this.nextAt = t + 4 + Math.random() * 5;
    }

    // Mood commitment with hysteresis.
    const want = moodFor(w, hours, dangerTier);
    if (want !== this.mood) {
      if (this.candidate !== want) {
        this.candidate = want;
        this.candidateSince = t;
      } else if (t - this.candidateSince > 2.5) {
        this.switchTo(want, t);
      }
    } else {
      this.candidate = null;
    }

    if (this.state === 'silent' && t >= this.nextAt) this.play(t);
  }

  private switchTo(mood: TrackMood, t: number): void {
    const from = this.mood;
    this.mood = mood;
    this.candidate = null;
    if (this.state === 'playing') {
      this.fadeOut(from, t);
      // Arrival deserves music — a breath, not a full rest. The old
      // track's tail may still be sounding when the new one blooms;
      // per-track gains make that overlap a gentle crossfade.
      this.nextAt = t + FADE_OUT_SEC + 1 + Math.random() * 3;
    } else {
      this.nextAt = Math.min(this.nextAt, t + 2 + Math.random() * 3);
    }
  }

  /**
   * Bow the sounding track out on ITS OWN gain and bookmark where it
   * stood, so `from`'s song can be taken up again on return.
   */
  private fadeOut(from: TrackMood, t: number): void {
    const name = this.current;
    const m = name ? this.media.get(name) : null;
    if (name && m) {
      const remain = (m.el.duration || 0) - m.el.currentTime;
      if (Number.isFinite(remain) && remain > RESUME_MIN_REMAIN_SEC) {
        this.bookmark[from] = { name, pos: m.el.currentTime, at: t };
      } else {
        delete this.bookmark[from];
      }
      const g = m.gain.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      // A convex bow-out: most of the drop early, then a long soft tail.
      g.linearRampToValueAtTime(g.value * 0.3, t + FADE_OUT_SEC * 0.45);
      g.setTargetAtTime(0, t + FADE_OUT_SEC * 0.45, FADE_OUT_SEC * 0.16);
      this.schedulePause(name, m.el, FADE_OUT_SEC + 0.5);
    }
    this.activeEl = null;
    this.current = null;
    this.state = 'silent';
  }

  private schedulePause(name: string, el: HTMLAudioElement, delaySec: number): void {
    const old = this.pauseTimer.get(name);
    if (old !== undefined) window.clearTimeout(old);
    this.pauseTimer.set(
      name,
      window.setTimeout(() => {
        this.pauseTimer.delete(name);
        if (el !== this.activeEl) el.pause();
      }, delaySec * 1000),
    );
  }

  /** THE SLOW BLOOM — a concave rise: long quiet approach, late swell. */
  private easeUp(g: AudioParam, t: number, target: number, dur: number): void {
    g.cancelScheduledValues(t);
    const v = g.value;
    g.setValueAtTime(v, t);
    const knee = target * 0.3;
    if (v < knee) {
      g.linearRampToValueAtTime(knee, t + dur * 0.6);
      g.linearRampToValueAtTime(target, t + dur);
    } else {
      // Resuming over its own fade tail: just carry it back up.
      g.linearRampToValueAtTime(target, t + dur * 0.5);
    }
  }

  private play(t: number): void {
    const ctx = this.engine.ctx;
    const bus = this.engine.tracks;
    if (!ctx || !bus) return;

    // THE SONG REMEMBERED: a warm bookmark for this mood resumes the
    // cut track a breath before where it stood; otherwise deal the deck.
    const bm = this.bookmark[this.mood];
    let name: string;
    let resumeAt: number | null = null;
    if (bm && t - bm.at < RESUME_WINDOW_SEC && TRACK_LIBRARY[this.mood].includes(bm.name)) {
      name = bm.name;
      resumeAt = Math.max(0, bm.pos - RESUME_REWIND_SEC);
    } else {
      const drawn = drawTrack(
        TRACK_LIBRARY[this.mood],
        this.decks[this.mood] ?? [],
        this.lastPlayed[this.mood] ?? null,
        Math.random,
      );
      name = drawn.name;
      this.decks[this.mood] = drawn.deck;
      this.lastPlayed[this.mood] = name;
      this.saveDeckStore();
    }
    delete this.bookmark[this.mood];

    let m = this.media.get(name);
    if (!m) {
      const el = new Audio(`/music/${name}.mp3`);
      el.preload = 'auto';
      // A MediaElementSource is forever — one per element, cached.
      // Each track owns its gain, so fades never share a fader.
      const node = ctx.createMediaElementSource(el);
      const gain = ctx.createGain();
      gain.gain.value = 0;
      node.connect(gain);
      gain.connect(bus);
      el.addEventListener('ended', () => this.onEnded(el));
      m = { el, gain };
      this.media.set(name, m);
    }
    const pending = this.pauseTimer.get(name);
    if (pending !== undefined) {
      window.clearTimeout(pending);
      this.pauseTimer.delete(name);
    }
    // A resumed track that is still sounding out its fade tail keeps
    // its place (seeking a live element would be an audible skip);
    // a parked one seeks back to the bookmarked breath.
    if (resumeAt === null) m.el.currentTime = 0;
    else if (m.el.paused || m.el.ended) m.el.currentTime = resumeAt;
    const gain = m.gain;
    const started = m.el.play();
    if (started) {
      started.catch(() => {
        // Autoplay refusal or a load hiccup: stay silent, try later.
        // The track's own gain drops to 0 so a later start still fades in.
        const now = this.engine.now();
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(0, now);
        if (this.current === name) {
          this.state = 'silent';
          this.current = null;
          this.activeEl = null;
          this.nextAt = now + 6;
        }
      });
    }
    this.easeUp(gain.gain, t, TRACK_TRIM[name] ?? 1, FADE_IN_SEC);
    this.activeEl = m.el;
    this.current = name;
    this.state = 'playing';
  }

  /** A track ran to its own mastered ending — a real rest, then on. */
  private onEnded(el: HTMLAudioElement): void {
    if (el !== this.activeEl) return;
    const name = this.current;
    const m = name ? this.media.get(name) : null;
    if (m) {
      // Park its fader at 0 silently so a future replay blooms from quiet.
      const now = this.engine.now();
      m.gain.gain.cancelScheduledValues(now);
      m.gain.gain.setValueAtTime(0, now);
    }
    this.activeEl = null;
    this.current = null;
    this.state = 'silent';
    const [lo, hi] = REST[this.mood];
    this.nextAt = this.engine.now() + lo + Math.random() * (hi - lo);
  }

  private saveDeckStore(): void {
    try {
      localStorage.setItem(
        DECK_STORE_KEY,
        JSON.stringify({ decks: this.decks, last: this.lastPlayed } satisfies DeckStore),
      );
    } catch {
      // Storage refused (private browsing, quota): variety stays per-session.
    }
  }
}
