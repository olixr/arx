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
 * Laws:
 *  - MOOD PICKS THE SHELF: town zone → town tracks; night hours or
 *    underground → night tracks; otherwise the day adventure shelf.
 *    Mood commits on a 2.5s-sustained change (no doorway stutter),
 *    then the sounding track bows out with a fade and the new mood
 *    opens after a short breath.
 *  - SHUFFLE, NEVER REPEAT: the next track from a shelf is random but
 *    never the one just played from that shelf.
 *  - EVERY EDGE IS A FADE: ~2s in, ~2.6s out. A track that ends
 *    naturally is followed by a real gap (silence is still a section)
 *    before the next one fades in.
 */

import type { AudioEngine } from './engine.js';
import { dominantZone, type ZoneWeights } from './zones.js';

export type TrackMood = 'adventure' | 'night' | 'town';

export const TRACK_LIBRARY: Record<TrackMood, string[]> = {
  adventure: ['adventure_1', 'adventure_2', 'adventure_3', 'adventure_4', 'adventure_5'],
  night: ['night_adventure_1', 'night_adventure_2'],
  town: ['town_1', 'town_2'],
};

const FADE_IN_SEC = 2.0;
const FADE_OUT_SEC = 2.6;

/** Which shelf suits this place and hour. Pure — tests could pin it. */
export function moodFor(w: ZoneWeights, hours: number): TrackMood {
  if (dominantZone(w) === 'town') return 'town';
  const night = hours < 5.5 || hours > 20.5;
  // The caves share the night shelf — dark and patient suits them.
  if (night || dominantZone(w) === 'cave') return 'night';
  return 'adventure';
}

export class TrackPlayer {
  /** Committed mood (readable for debugging). */
  mood: TrackMood = 'adventure';
  state: 'silent' | 'playing' = 'silent';
  /** Name of the sounding track, if any. */
  current: string | null = null;

  private out: GainNode | null = null;
  private nextAt = 0;
  private candidate: TrackMood | null = null;
  private candidateSince = 0;
  private lastPlayed: Partial<Record<TrackMood, string>> = {};
  private media = new Map<string, { el: HTMLAudioElement; node: MediaElementAudioSourceNode }>();
  private activeEl: HTMLAudioElement | null = null;
  private booted = false;

  constructor(private engine: AudioEngine) {}

  update(w: ZoneWeights, hours: number): void {
    const ctx = this.engine.ctx;
    const bus = this.engine.tracks;
    if (!ctx || !bus) return;
    const t = ctx.currentTime;
    if (!this.out) {
      this.out = ctx.createGain();
      this.out.gain.value = 0;
      this.out.connect(bus);
    }
    if (!this.booted) {
      // Let the world's own sounds greet the player first.
      this.booted = true;
      this.mood = moodFor(w, hours);
      this.nextAt = t + 4 + Math.random() * 5;
    }

    // Mood commitment with hysteresis.
    const want = moodFor(w, hours);
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
    this.mood = mood;
    this.candidate = null;
    if (this.state === 'playing') {
      this.fadeOut(t);
      // Arrival deserves music — a breath, not a full rest.
      this.nextAt = t + FADE_OUT_SEC + 2 + Math.random() * 3;
    } else {
      this.nextAt = Math.min(this.nextAt, t + 2 + Math.random() * 3);
    }
  }

  /** Fade the sounding track down and stop it once it is inaudible. */
  private fadeOut(t: number): void {
    const out = this.out;
    if (!out) return;
    const g = out.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0, t + FADE_OUT_SEC);
    const el = this.activeEl;
    if (el) window.setTimeout(() => el.pause(), FADE_OUT_SEC * 1000 + 150);
    this.activeEl = null;
    this.current = null;
    this.state = 'silent';
  }

  private play(t: number): void {
    const ctx = this.engine.ctx;
    const out = this.out;
    if (!ctx || !out) return;
    // Shuffle without repeats: any track from the shelf but the last.
    const shelf = TRACK_LIBRARY[this.mood];
    const pool = shelf.length > 1 ? shelf.filter((n) => n !== this.lastPlayed[this.mood]) : shelf;
    const name = pool[Math.floor(Math.random() * pool.length)]!;

    let m = this.media.get(name);
    if (!m) {
      const el = new Audio(`/music/${name}.mp3`);
      el.preload = 'auto';
      // A MediaElementSource is forever — one per element, cached.
      const node = ctx.createMediaElementSource(el);
      node.connect(out);
      el.addEventListener('ended', () => this.onEnded(el));
      m = { el, node };
      this.media.set(name, m);
    }
    m.el.currentTime = 0;
    const started = m.el.play();
    if (started) {
      started.catch(() => {
        // Autoplay refusal or a load hiccup: stay silent, try later.
        this.state = 'silent';
        this.current = null;
        this.activeEl = null;
        this.nextAt = this.engine.now() + 6;
      });
    }
    const g = out.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(1, t + FADE_IN_SEC);
    this.activeEl = m.el;
    this.current = name;
    this.lastPlayed[this.mood] = name;
    this.state = 'playing';
  }

  /** A track ran to its own mastered ending — rest, then another. */
  private onEnded(el: HTMLAudioElement): void {
    if (el !== this.activeEl) return;
    const t = this.engine.now();
    this.out?.gain.cancelScheduledValues(t);
    this.out?.gain.setValueAtTime(0, t);
    this.activeEl = null;
    this.current = null;
    this.state = 'silent';
    this.nextAt = t + 10 + Math.random() * 18;
  }
}
