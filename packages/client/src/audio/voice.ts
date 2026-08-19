/**
 * The voice player — spoken lines and small utterances, the third
 * playback idiom beside synthesized SFX and streamed tracks: short
 * recorded clips fetched once, decoded once, and held warm in a
 * byte-capped cache so a line's audio is ready before its first
 * glyph lands. Everything rides the engine's `voice` bus (dry,
 * close, under the same warm master chain as the rest of the world).
 *
 * THE ONE RESOLVER lives on the server: this player never chooses
 * clips, it plays URLs the wire hands it and warms the URLs the wire
 * says are coming.
 *
 * SILENCE IS VALID: a fetch or decode that fails degrades to the
 * unvoiced conversation at every step — no throw ever escapes into
 * the dialogue flow, and a URL that failed once stays quiet for the
 * session instead of hammering the server.
 *
 * EVERY EDGE IS A FADE: lines seat in over 20 ms and leave over
 * 80 ms; a skipped line fades, it never clicks off.
 *
 * THE DUCK RAIL: while a full line speaks, music/tracks seat to
 * LINE_DUCK under it and ambience steps back; quips duck nothing.
 * All of it through engine.setDuck — the one lawful system multiplier.
 */

import { VOICE_STREAM_MS } from '@arx/content';
import type { AudioEngine } from './engine.js';
import type { WorldAt } from './sfx.js';

/** Decoded-buffer cache ceiling — ~48 typical Opus clips. */
const CACHE_BYTES = 24 * 1024 * 1024;
/** Concurrent quip ceiling — a third voice on top of two reads as a crowd. */
const MAX_QUIPS = 2;
/** Line fades (seconds). */
const FADE_IN = 0.02;
const FADE_OUT = 0.08;
/**
 * THE DUCK RAIL levels under a spoken line, and the move shapes.
 * These are the shipped defaults — the wire's voiceDials (the live
 * 'voice' content doc) override them per conversation via setDials.
 */
export const LINE_DUCK = { music: 0.45, tracks: 0.45, ambience: 0.75 } as const;
const DUCK_SEAT_TC = 0.12;

/**
 * THE REEL LAW (Phase 6): short lines decode into warm buffers; a
 * line at or past VOICE_STREAM_MS streams through a media element
 * (the TrackPlayer idiom) — a cutscene's worth of speech should
 * never sit decoded in the cache nor wait on a full download.
 */
export function lineDelivery(durMs: number): 'buffer' | 'stream' {
  return durMs >= VOICE_STREAM_MS ? 'stream' : 'buffer';
}

/**
 * THE PACED WORD: how much to stretch the typewriter so a voiced
 * line's text lands with its audio. Stretch-only — a clip shorter
 * than the natural read never speeds the reader up (text may land
 * early; it never outruns the voice). Lands at ~92% of the clip so
 * the last word settles inside the speech, not after it.
 */
export function voicePaceScale(plainSec: number, durMs: number): number {
  if (plainSec <= 0 || durMs <= 0) return 1;
  return Math.max(1, (durMs / 1000) * 0.92 / plainSec);
}
/** Spatial quips speak at room scale — the sfx 'near' family's reach. */
const QUIP_REF = 2.5;
const QUIP_MAX = 16;
const PAN_WIDTH = 12;
const PAN_MAX = 0.8;

/**
 * A byte-budgeted LRU: insertion-ordered Map, `get` re-seats the key,
 * inserts evict the stalest entries until the total fits. An item
 * larger than the whole cap is refused outright (it would evict
 * everything and then rot alone). Pure — tests pin it without audio.
 */
export class LruBytes<V> {
  private map = new Map<string, { v: V; bytes: number }>();
  private total_ = 0;

  constructor(private cap: number) {}

  get(key: string): V | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    this.map.delete(key);
    this.map.set(key, hit);
    return hit.v;
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  set(key: string, v: V, bytes: number): void {
    if (bytes > this.cap) return;
    const old = this.map.get(key);
    if (old) {
      this.total_ -= old.bytes;
      this.map.delete(key);
    }
    this.map.set(key, { v, bytes });
    this.total_ += bytes;
    for (const [k, entry] of this.map) {
      if (this.total_ <= this.cap) break;
      if (k === key) continue; // never evict what was just asked for
      this.map.delete(k);
      this.total_ -= entry.bytes;
    }
  }

  get total(): number {
    return this.total_;
  }

  get size(): number {
    return this.map.size;
  }
}

/** What the browser says it can play — the Phase-1 format probe. */
export interface VoiceFormats {
  oggOpus: string;
  webmOpus: string;
  mp3: string;
  aac: string;
  wav: string;
}

export function probeFormats(): VoiceFormats {
  const el = typeof document !== 'undefined' ? document.createElement('audio') : null;
  const can = (t: string): string => el?.canPlayType(t) ?? '';
  return {
    oggOpus: can('audio/ogg; codecs="opus"'),
    webmOpus: can('audio/webm; codecs="opus"'),
    mp3: can('audio/mpeg'),
    aac: can('audio/mp4; codecs="mp4a.40.2"'),
    wav: can('audio/wav'),
  };
}

/** The line on the air right now, for pacing and debug probes. */
export interface CurrentLine {
  url: string;
  startedAt: number;
  durSec: number;
}

export class VoicePlayer {
  /** canPlayType answers, probed once at construction. */
  readonly formats: VoiceFormats;

  private cache = new LruBytes<AudioBuffer>(CACHE_BYTES);
  private inflight = new Map<string, Promise<AudioBuffer | null>>();
  private failed = new Set<string>();
  /** Listener (the camera's subject) for spatial quips. */
  private lx = 0;
  private ly = 0;
  /** Supersession token: any newer play/stop abandons an awaited decode. */
  private lineGen = 0;
  private lineSrc: AudioBufferSourceNode | null = null;
  private lineGain: GainNode | null = null;
  /** The streaming leg: one MediaElementSource per element, forever. */
  private media = new Map<string, { el: HTMLAudioElement; node: MediaElementAudioSourceNode }>();
  private lineMedia: HTMLAudioElement | null = null;
  current: CurrentLine | null = null;
  private quipCount = 0;
  private ducked = false;
  /** Live duck dials — shipped defaults until the wire says otherwise. */
  private dials: { duckLine: number; duckAmbience: number; duckReleaseMs: number } = {
    duckLine: LINE_DUCK.music,
    duckAmbience: LINE_DUCK.ambience,
    duckReleaseMs: 600,
  };

  constructor(private engine: AudioEngine) {
    this.formats = probeFormats();
  }

  /** The wire's voiceDials land here (content-tuned, per dlgopen). */
  setDials(d: { duckLine: number; duckAmbience: number; duckReleaseMs: number }): void {
    const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
    this.dials = {
      duckLine: clamp(d.duckLine, 0.05, 1),
      duckAmbience: clamp(d.duckAmbience, 0.05, 1),
      duckReleaseMs: clamp(d.duckReleaseMs, 0, 5000),
    };
  }

  /** Follow the camera's subject; called once per frame from the loop. */
  setListener(x: number, y: number): void {
    this.lx = x;
    this.ly = y;
  }

  /**
   * Warm the cache for URLs the wire says are coming. Fire-and-forget;
   * failures are remembered quietly. No-op before the gesture unlock
   * (dialogue can only open well after the first click).
   */
  prefetch(urls: readonly string[]): void {
    for (const url of urls) void this.load(url);
  }

  /**
   * Speak a full line: stops whatever line is playing, seats the duck,
   * and starts the clip once decoded (instantly when prefetched). A
   * newer playLine/stopLine during the decode wins — the stale clip
   * never sounds. Reel-length lines (durMs ≥ VOICE_STREAM_MS) stream
   * through a media element instead of decoding.
   */
  playLine(url: string, durMs = 0): void {
    const gen = ++this.lineGen;
    this.haltLine(FADE_OUT);
    if (lineDelivery(durMs) === 'stream') {
      this.playReel(url, durMs, gen);
      return;
    }
    void this.load(url).then((buf) => {
      if (gen !== this.lineGen) return;
      const ctx = this.engine.ctx;
      const bus = this.engine.voice;
      if (!buf || !ctx || !bus) return;
      const t = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(1, t + FADE_IN);
      gain.connect(bus);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(gain);
      this.lineSrc = src;
      this.lineGain = gain;
      this.current = { url, startedAt: t, durSec: buf.duration };
      this.setLineDuck(true);
      src.onended = () => {
        if (gen !== this.lineGen) return;
        this.lineSrc = null;
        this.lineGain = null;
        this.current = null;
        this.setLineDuck(false);
      };
      src.start(t);
    });
  }

  /**
   * The streaming leg — the TrackPlayer idiom pointed at speech: one
   * HTMLAudioElement + MediaElementSource per URL, cached forever
   * (recreating a source for a used element throws), fades and ducks
   * exactly like a buffered line. SILENCE IS VALID: a failed stream
   * clears itself and releases the ducks.
   */
  private playReel(url: string, durMs: number, gen: number): void {
    const ctx = this.engine.ctx;
    const bus = this.engine.voice;
    if (!ctx || !bus) return;
    let entry = this.media.get(url);
    if (!entry) {
      const mediaEl = new Audio(url);
      mediaEl.preload = 'auto';
      entry = { el: mediaEl, node: ctx.createMediaElementSource(mediaEl) };
      this.media.set(url, entry);
    }
    const { el: mediaEl, node } = entry;
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + FADE_IN);
    node.disconnect();
    node.connect(gain);
    gain.connect(bus);
    this.lineMedia = mediaEl;
    this.lineGain = gain;
    this.current = { url, startedAt: t, durSec: durMs / 1000 };
    this.setLineDuck(true);
    const done = (): void => {
      if (gen !== this.lineGen) return;
      this.lineMedia = null;
      this.lineGain = null;
      this.current = null;
      this.setLineDuck(false);
    };
    mediaEl.onended = done;
    mediaEl.onerror = done;
    mediaEl.currentTime = 0;
    mediaEl.play().catch(done);
  }

  /** Fade the current line out (a skip, a page turn, a walk-away). */
  stopLine(): void {
    this.lineGen++;
    this.haltLine(FADE_OUT);
  }

  /**
   * A small utterance — a greeting, a grunt, a yes. Never ducks, never
   * interrupts a line. With a world position it speaks from its side
   * of you on the sfx rolloff curve; without one it plays flat (the
   * dialogue frame's own quips are placeless). Capped so overlapping
   * quips never crowd into a chorus.
   */
  playQuip(url: string, at?: WorldAt | null): void {
    if (this.quipCount >= MAX_QUIPS) return;
    let vol = 1;
    let pan = 0;
    if (at) {
      const dx = at.x - this.lx;
      const d = Math.hypot(dx, at.y - this.ly);
      if (d >= QUIP_MAX) return; // out of earshot — skip the fetch too
      const u = d <= QUIP_REF ? 0 : (d - QUIP_REF) / (QUIP_MAX - QUIP_REF);
      vol = Math.pow(1 - u, 1.6);
      pan = Math.max(-PAN_MAX, Math.min(PAN_MAX, dx / PAN_WIDTH));
    }
    this.quipCount++;
    void this.load(url).then((buf) => {
      const ctx = this.engine.ctx;
      const bus = this.engine.voice;
      if (!buf || !ctx || !bus) {
        this.quipCount--;
        return;
      }
      const t = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + FADE_IN);
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      gain.connect(panner);
      panner.connect(bus);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(gain);
      src.onended = () => {
        this.quipCount--;
      };
      src.start(t);
    });
  }

  /** Cache stats for the debug gates. */
  get cacheStats(): { bytes: number; clips: number } {
    return { bytes: this.cache.total, clips: this.cache.size };
  }

  /** Fade out and forget the current line's nodes (no token change). */
  private haltLine(fadeSec: number): void {
    const ctx = this.engine.ctx;
    const src = this.lineSrc;
    const mediaEl = this.lineMedia;
    const gain = this.lineGain;
    this.lineSrc = null;
    this.lineMedia = null;
    this.lineGain = null;
    this.current = null;
    if (!ctx || !gain || (!src && !mediaEl)) {
      this.setLineDuck(false);
      return;
    }
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0, t + fadeSec);
    if (src) {
      src.onended = null;
      try {
        src.stop(t + fadeSec);
      } catch {
        /* already stopped */
      }
    }
    if (mediaEl) {
      mediaEl.onended = null;
      mediaEl.onerror = null;
      window.setTimeout(() => mediaEl.pause(), fadeSec * 1000 + 100);
    }
    this.setLineDuck(false);
  }

  private setLineDuck(on: boolean): void {
    if (on === this.ducked) return;
    this.ducked = on;
    // setTargetAtTime reaches ~95% at 3τ — the release dial names the
    // full journey, so the time constant is a third of it.
    const tc = on ? DUCK_SEAT_TC : Math.max(0.05, this.dials.duckReleaseMs / 3000);
    this.engine.setDuck('music', on ? this.dials.duckLine : 1, tc, 'voice');
    this.engine.setDuck('tracks', on ? this.dials.duckLine : 1, tc, 'voice');
    this.engine.setDuck('ambience', on ? this.dials.duckAmbience : 1, tc, 'voice');
  }

  /**
   * Fetch + decode a clip into the cache. One flight per URL no matter
   * how many callers ask; resolution is the buffer or null (failed —
   * and remembered so the session never re-asks a dead URL).
   */
  private load(url: string): Promise<AudioBuffer | null> {
    const hit = this.cache.get(url);
    if (hit) return Promise.resolve(hit);
    if (this.failed.has(url)) return Promise.resolve(null);
    const flying = this.inflight.get(url);
    if (flying) return flying;
    const ctx = this.engine.ctx;
    if (!ctx) return Promise.resolve(null);
    const p = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.arrayBuffer();
      })
      .then((bytes) => ctx.decodeAudioData(bytes))
      .then((buf) => {
        this.cache.set(url, buf, buf.length * buf.numberOfChannels * 4);
        return buf as AudioBuffer | null;
      })
      .catch(() => {
        this.failed.add(url);
        return null;
      })
      .finally(() => {
        this.inflight.delete(url);
      });
    this.inflight.set(url, p);
    return p;
  }
}
