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
 *    waits out an arrival quiet (see THE THRESHOLD IS NOT A CUE).
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
 *  - SILENCE IS A SECTION, and the section is LONG. The library's
 *    tracks run two to six minutes; a flat 12-26 second rest behind
 *    one meant music sounded ~90% of every hour and the land never
 *    got the floor. Three laws now hold the quiet open:
 *
 *      THE EARNED QUIET — a rest is not a constant, it is PAID FOR by
 *      the music just heard: a floor, plus a share of the minutes that
 *      actually sounded, capped. A six-minute adventure piece buys a
 *      three-minute quiet; a two-minute town piece buys about one.
 *      The ratio is what the ear reads, not the absolute number, so
 *      long and short tracks both land the same way.
 *
 *      THE THRESHOLD IS NOT A CUE — crossing a zone line used to cut
 *      the sounding track and open the new mood ~5 seconds later, and
 *      crossing DURING a rest truncated that rest to 2-5 seconds. A
 *      doorway is now an ordinary event: the old track bows out and
 *      the new mood waits out a real arrival quiet. Only the deep
 *      frontier still speaks fast — dread arriving late is dread
 *      wasted, so danger is the one arrival that may cut an earned
 *      quiet short. Every other crossing waits its turn: three
 *      minutes of music just played does not become three more
 *      because a zone line went by.
 *
 *      THE FLOOR OF SILENCE — no code path, on any route, may put
 *      music back inside QUIET_FLOOR seconds of real silence. It is
 *      measured from when the last track went inaudible, not from the
 *      last boundary crossed, so pacing back and forth over a town
 *      line cannot starve the world of its own voice.
 *
 *    And THE DEEP QUIET: now and then the rest simply stretches, well
 *    past its cap. Silences that are all the same length become a
 *    metronome the ear learns to count; one that runs long is what
 *    makes the next bloom land.
 *  - THE WORLD TAKES THE FLOOR: while a track sounds, the ambience
 *    bus settles back a couple of decibels in the music lane of the
 *    duck rail, and rises again — slowly, over a scenic time constant
 *    that no ear can catch working — when the quiet opens. Two things
 *    fall out of it. The mix under music gets cleaner, because the
 *    wind and the birds stop competing with a mastered piece for the
 *    same air. And the quiet does not merely begin, it OPENS: the
 *    land audibly comes forward as the score steps back, which is the
 *    whole reason the rests were lengthened. The move is small on
 *    purpose — deep enough to feel the room change, far too shallow
 *    to read as pumping, and the edges it rides are minutes apart.
 *  - THE WORLD SPEAKS FIRST: a fresh world opens on ambience alone
 *    for the better part of a minute. The first thing a player hears
 *    should be the place, not the score.
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
    'night_adventure_4', 'night_adventure_5', 'night_adventure_6',
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
 * THE EARNED QUIET — how long the world holds the floor after a piece
 * of music, per mood:
 *   floor — the shortest rest this mood ever gives, in seconds.
 *   share — how much of the music just HEARD is paid back as silence
 *           (0.5 = a two-minute piece buys a one-minute quiet).
 *   cap   — the ceiling on the earned part (THE DEEP QUIET may pass it).
 *
 * The characters: towns are lived-in and sing again soonest of the
 * surface moods, but a town is also where a player stands still, so
 * its quiet has to be real. The wild is scenery — the whole point of
 * being out there is the wind, the birds, the far water. The night
 * belongs to the crickets and the owl first and the score second. The
 * dungeon's own ambience is thinner than the surface's, so its shelf
 * carries more of the scene and stays closer. The deep frontier keeps
 * its dread close and its quiets short: fear is the one mood that
 * loses by waiting.
 *
 * The calibration, so a later pass has the reasoning and not just the
 * digits: the shelves average three minutes a track and run to six, so
 * a FLAT rest cannot serve both ends — 45 seconds behind a two-minute
 * town piece is a breath, behind a six-minute adventure piece it is a
 * rounding error. Tuned against the library's real durations these
 * numbers put the shortest rest on the shortest track at ~60s (the
 * asked-for window), the typical rest near two minutes, and the world
 * on the floor 35-45% of every hour — where it was 10%.
 */
const REST: Record<TrackMood, { floor: number; share: number; cap: number }> = {
  town: { floor: 32, share: 0.32, cap: 110 },
  adventure: { floor: 36, share: 0.36, cap: 150 },
  night: { floor: 42, share: 0.42, cap: 170 },
  dungeon: { floor: 28, share: 0.28, cap: 100 },
  danger: { floor: 10, share: 0.08, cap: 30 },
};

/**
 * THE FLOOR OF SILENCE — the hard minimum of real, measured quiet
 * between any two tracks, whatever route asked for the next one.
 * Every path through the player is clamped by this.
 */
const QUIET_FLOOR: Record<TrackMood, number> = {
  town: 30,
  adventure: 34,
  night: 38,
  dungeon: 30,
  danger: 8,
};

/**
 * THE THRESHOLD IS NOT A CUE — the [min, max] arrival quiet after a
 * mood change, before the new shelf speaks. Long enough that the new
 * country's own sound establishes itself first; short enough that the
 * arrival still feels answered.
 */
const ARRIVAL: Record<TrackMood, readonly [number, number]> = {
  town: [24, 48],
  adventure: [36, 72],
  night: [40, 80],
  dungeon: [22, 45],
  danger: [5, 12],
};

/**
 * THE WORLD TAKES THE FLOOR — where the ambience bus sits while a
 * track sounds (1 = its shipped level, kept for the quiet), and the
 * time constant it moves on: long and scenic, so the land comes
 * forward like weather rather than like a fader.
 */
const AMBIENCE_UNDER_MUSIC = 0.8;
const AMBIENCE_SETTLE_TC = 2.5;

/** THE WORLD SPEAKS FIRST — the opening quiet of a fresh session. */
const OPENING_QUIET: readonly [number, number] = [30, 66];

/**
 * THE DEEP QUIET — the chance a rest simply runs long, and by how
 * much. Never in danger country, where a hole in the music reads as a
 * bug rather than as breath.
 */
const DEEP_QUIET_CHANCE = 0.22;
const DEEP_QUIET_STRETCH: readonly [number, number] = [1.5, 2.2];

/**
 * The rest a mood owes after `heardSec` of music actually sounded.
 * Pure, so the pacing law can be pinned by tests instead of by ear.
 * `rand` is drawn twice: once for the ±18% breath on the earned rest,
 * once for THE DEEP QUIET.
 */
export function restAfter(mood: TrackMood, heardSec: number, rand: () => number): number {
  const law = REST[mood];
  const earned = Math.min(law.cap, law.floor + Math.max(0, heardSec) * law.share);
  let rest = earned * (0.82 + rand() * 0.36);
  if (mood !== 'danger' && rand() < DEEP_QUIET_CHANCE) {
    const [lo, hi] = DEEP_QUIET_STRETCH;
    rest *= lo + rand() * (hi - lo);
  }
  return Math.max(QUIET_FLOOR[mood], rest);
}

/** A draw from a [min, max] second window. */
function drawWindow(w: readonly [number, number], rand: () => number): number {
  return w[0] + rand() * (w[1] - w[0]);
}
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
  night_adventure_6: 0.71, // −12.3 (added 08-17)
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
  /**
   * THE FLOOR OF SILENCE — ctx time at which the last track became
   * genuinely inaudible (its bow-out finished), i.e. when real quiet
   * began. Every start is gated on this, not on any per-frame event,
   * so no amount of boundary-crossing can shorten a silence.
   */
  private quietSince = 0;
  /** THE EARNED QUIET — ctx time the sounding track started sounding. */
  private soundingSince = 0;
  /**
   * AN EARNED QUIET IS NOT REFUNDABLE — true while the pending rest
   * was paid for by music that actually finished sounding. Such a
   * rest stands whatever lines the player crosses; only an ARRIVAL or
   * OPENING quiet (nothing heard yet, nothing owed) may be re-aimed
   * by a crossing.
   */
  private quietEarned = false;
  /** THE WORLD TAKES THE FLOOR — the hold last written, so the
   * per-frame update schedules automation only when it actually
   * changes rather than once a frame forever. */
  private ambHold = 1;
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
      // THE WORLD SPEAKS FIRST — a fresh world opens on its own voice
      // alone. The wind, the birds, the far water get the better part
      // of a minute before the score is allowed an opinion. (Dread
      // country is the exception: it announces itself.)
      this.booted = true;
      this.mood = moodFor(w, hours, dangerTier);
      this.quietSince = t;
      this.quietEarned = false;
      this.nextAt =
        t +
        (this.mood === 'danger'
          ? drawWindow(ARRIVAL.danger, Math.random)
          : drawWindow(OPENING_QUIET, Math.random));
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

    // THE FLOOR OF SILENCE is the last word on every route in: a
    // scheduled start still waits out the mood's minimum real quiet.
    const quietOwed = this.quietSince + QUIET_FLOOR[this.mood];
    if (this.state === 'silent' && t >= this.nextAt && t >= quietOwed) this.play(t);

    // THE WORLD TAKES THE FLOOR. The ambience settles under a sounding
    // track and comes back up when the quiet opens — in the player's
    // OWN lane of the duck rail, so a spoken line's duck and this one
    // compose instead of releasing each other.
    const ambWant = this.state === 'playing' ? AMBIENCE_UNDER_MUSIC : 1;
    if (ambWant !== this.ambHold) {
      this.ambHold = ambWant;
      this.engine.setDuck('ambience', ambWant, AMBIENCE_SETTLE_TC, 'music');
    }
  }

  private switchTo(mood: TrackMood, t: number): void {
    const from = this.mood;
    this.mood = mood;
    this.candidate = null;
    // THE THRESHOLD IS NOT A CUE. A doorway used to be a downbeat:
    // playing → the next track opened ~5s later, silent → a running
    // quiet was truncated to 2-5s. Between them, a player who walked
    // in and out of a town heard music almost without pause. Now a
    // crossing buys the new country an arrival quiet of its own, and
    // a crossing DURING a rest may only pull the rest in as far as
    // that same window — never past THE FLOOR OF SILENCE, which is
    // measured from real silence and so cannot be re-rolled by
    // pacing the line.
    const arrival = t + drawWindow(ARRIVAL[mood], Math.random);
    if (this.state === 'playing') {
      // A track cut mid-flight bought nothing — the arrival quiet is
      // the whole rest, and it is re-aimable like any other.
      this.fadeOut(from, t);
      this.quietEarned = false;
      this.nextAt = Math.max(arrival, t + FADE_OUT_SEC + 1);
    } else if (!this.quietEarned || mood === 'danger') {
      // Dread is the one arrival that outranks an earned quiet: walking
      // into dire-wolf country three minutes deep in a rest must not
      // mean walking in silent. Every other crossing waits its turn.
      this.nextAt = Math.min(this.nextAt, arrival);
    }
    // …and if the pending quiet WAS earned, the crossing changes which
    // shelf speaks next but not when. Three minutes of music just
    // played; a doorway does not entitle the player to three more.
    // Without this, anyone actually travelling — the exact "out
    // exploring" case — re-armed the score at every zone line and
    // heard music every ~40 seconds no matter how long the rests got.
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
    // Real quiet starts where the bow-out lands, not where it began.
    this.quietSince = t + FADE_OUT_SEC;
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
          // Nothing sounded, so nothing was earned — but the retry is
          // still a start, and THE FLOOR OF SILENCE gates it.
          this.quietSince = now;
          this.quietEarned = false;
          this.nextAt = now + 6;
        }
      });
    }
    this.easeUp(gain.gain, t, TRACK_TRIM[name] ?? 1, FADE_IN_SEC);
    this.soundingSince = t;
    this.quietEarned = false;
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
    // THE EARNED QUIET — the rest is bought by the music that actually
    // sounded, so a six-minute piece and a two-minute one leave the
    // same RATIO of world to score behind them.
    const now = this.engine.now();
    this.quietSince = now;
    this.quietEarned = true;
    this.nextAt = now + restAfter(this.mood, now - this.soundingSince, Math.random);
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
