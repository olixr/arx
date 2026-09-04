import { EntityKind, type EntityId } from '@arx/shared';
import { npcDef } from '@arx/content';
import type { ClientGame } from '../game/clientGame.js';
import type { ViewAdapter } from './viewAdapter.js';

/**
 * THE SPOKEN AIR — words standing over the head that said them.
 *
 * The world's other overhead voices are refusals and numbers (damage
 * floaties, THE RISEN WORD). This is the lane for SPEECH: a player's
 * chat line, an actor's bark, a guard's refusal, a mark's cry — any
 * local-channel chat line that arrives carrying its speaker's eid is
 * stood up as a parchment bubble in world space, glued to the drawn
 * body through the same projection every world-anchored HUD piece
 * uses (worldToScreen minus the elevation lift). The log keeps the
 * full record; the bubble is the moment.
 *
 * Laws it lives by:
 * - ONE VOICE, ONE BUBBLE. A speaker holds a single bubble; speaking
 *   again re-fills it and re-pops it. Stacked copies are mush.
 * - THE READ IS PAID FOR. A bubble lives long enough to be read at a
 *   comfortable pace (base + per-glyph), never forever.
 * - POSITION IS TRUTH. The bubble rides the interpolated body every
 *   frame — walk below a speaker and their words stay with them. Only
 *   the viewport edge may bend this (a clamped bubble drops its tail,
 *   the sign plaque's law — a tail that points at nothing lies).
 * - A READ, NOT A SCREEN. pointer-events none, no focus, no input.
 *
 * Perf follows SignHud's hard-won shape: measure the card ONCE per
 * paint (its size only changes with its words), then transform-only
 * writes, each cached so a resting bubble costs zero style churn.
 */

/** The most a bubble will carry — chat's 200 cap reads as a wall. */
export const SPEECH_MAX_CHARS = 140;
/** Shortest life: even "ok" hangs long enough to be seen. */
export const SPEECH_MIN_MS = 2600;
/** Reading pace: each glyph buys the line a little more air. */
export const SPEECH_PER_CHAR_MS = 55;
/** Longest life: past this, a bubble is furniture. */
export const SPEECH_MAX_MS = 9000;
/** Bow-out fade — matches the plaque's exit cadence. */
const OUT_MS = 220;
/** The town square cap: oldest-to-die yields when a crowd all talks. */
const MAX_BUBBLES = 14;
/** A humanoid crown in screen-tiles — one step above the 1.62 label. */
const HUMANOID_TILES = 1.85;

/** Clip speech to bubble size at a word seam, never mid-word mush. */
export function clipSpeech(text: string): string {
  const t = text.trim();
  if (t.length <= SPEECH_MAX_CHARS) return t;
  const cut = t.slice(0, SPEECH_MAX_CHARS);
  const seam = cut.lastIndexOf(' ');
  return (seam > SPEECH_MAX_CHARS * 0.6 ? cut.slice(0, seam) : cut).trimEnd() + '…';
}

/** How long spoken words hang in the air — reading pace, clamped. */
export function speechLifeMs(text: string): number {
  return Math.min(SPEECH_MAX_MS, SPEECH_MIN_MS + text.length * SPEECH_PER_CHAR_MS);
}

/**
 * The tail-tip's height over the feet, in screen-tiles (multiply by
 * camera.scale). Mirrors the renderer's label lane: humanoids cap
 * ~1.62 up, beasts at radius*2.6 — the bubble floats one step above
 * so it never sits on the nameplate.
 */
export function anchorTiles(meta: { kind: EntityKind; appearance?: unknown; defId?: string }): number {
  if (meta.kind === EntityKind.Player || meta.appearance) return HUMANOID_TILES;
  const r = npcDef(meta.defId ?? '')?.radius ?? 0.3;
  return Math.min(3.4, r * 2.6 + 0.8);
}

export interface BubblePlace {
  x: number;
  y: number;
  /** Tail center, px from the card's left edge — slides to keep
   *  pointing at the speaker when the card hugs a viewport edge. */
  tailX: number;
  /** Vertically clamped: the tail points at nothing — drop it. */
  clamped: boolean;
}

/**
 * Where the card stands for an anchor at screen (sx, sy): centered
 * above it, bent inside the viewport, the tail sliding (then bowing
 * out entirely) as the edges assert themselves.
 */
export function placeBubble(
  sx: number,
  sy: number,
  w: number,
  h: number,
  vw: number,
  vh: number,
): BubblePlace {
  const pad = 8;
  const lo = w / 2 + pad;
  const hi = vw - w / 2 - pad;
  const x = hi < lo ? vw / 2 : Math.min(hi, Math.max(lo, sx));
  const y = Math.max(h + pad, Math.min(vh - pad, sy));
  const tailX = Math.min(w - 12, Math.max(12, sx - (x - w / 2)));
  return { x, y, tailX, clamped: Math.abs(y - sy) > 1 };
}

interface Bubble {
  el: HTMLDivElement;
  card: HTMLDivElement;
  text: HTMLDivElement;
  tail: HTMLDivElement;
  dieAt: number;
  /** Measured once per paint — the card only resizes with its words. */
  w: number;
  h: number;
  lastTransform: string;
  lastTailX: number;
  bowing: boolean;
  clampedCls: boolean;
  hidden: boolean;
}

export class SpeechBubbles {
  private readonly layer = document.createElement('div');
  private readonly bubbles = new Map<EntityId, Bubble>();
  private veiled = false;

  constructor(
    private readonly game: ClientGame,
    private readonly renderer: ViewAdapter,
  ) {
    this.layer.id = 'speech-layer';
    document.body.appendChild(this.layer);
  }

  /**
   * Stand words over a speaker's head. The one door: chat routes
   * eid-carrying lines here, and any future system (a boss taunt, a
   * quest beat, an object that talks) speaks through the same call.
   */
  say(eid: EntityId, text: string): void {
    const words = clipSpeech(text);
    if (words === '') return;
    const now = performance.now();
    let b = this.bubbles.get(eid);
    if (!b) {
      b = this.build(eid);
      // A full square yields its stalest voice, never the newest.
      if (this.bubbles.size > MAX_BUBBLES) this.evictOldest();
    }
    b.text.textContent = words;
    b.dieAt = now + speechLifeMs(words);
    if (b.bowing) {
      b.bowing = false;
      b.el.classList.remove('bowing');
    }
    // Re-pop on every line — the snap of a voice starting up. Restart
    // the CSS animation by hand; the reflow is one deliberate read on
    // a rare event (someone spoke), the same bargain the sign strikes.
    b.card.style.animation = 'none';
    void b.card.offsetWidth;
    b.card.style.animation = '';
    // One measure per paint — size only changes with the words.
    b.w = b.el.offsetWidth;
    b.h = b.el.offsetHeight;
    b.lastTransform = '';
    b.lastTailX = -1;
  }

  /** Every voice at once — zone changes and disconnects clear the air. */
  clear(): void {
    for (const b of this.bubbles.values()) b.el.remove();
    this.bubbles.clear();
  }

  /**
   * Per-frame from the main loop. `hidden` veils the whole layer (an
   * open screen, the dialogue cinema) without killing the clocks —
   * words keep aging behind the veil and are gone when it lifts.
   */
  update(now: number, hidden: boolean): void {
    if (hidden !== this.veiled) {
      this.veiled = hidden;
      this.layer.classList.toggle('veiled', hidden);
    }
    if (this.bubbles.size === 0) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cam = this.renderer.camera;
    for (const [eid, b] of this.bubbles) {
      const a = this.anchor(eid);
      // A speaker gone from the world takes their words along.
      if (a === null && b.dieAt > now) b.dieAt = now;
      if (now >= b.dieAt + OUT_MS) {
        b.el.remove();
        this.bubbles.delete(eid);
        continue;
      }
      if (now >= b.dieAt && !b.bowing) {
        b.bowing = true;
        b.el.classList.add('bowing');
      }
      if (a === null) continue;
      const p = this.renderer.screenAnchor(a.x, a.y, vw, vh);
      const sy = p.y - a.tiles * cam.scale;
      // Far off the viewport: keep the clock, skip the paint.
      const off = p.x < -160 || p.x > vw + 160 || sy < -260 || p.y > vh + 160;
      if (off !== b.hidden) {
        b.hidden = off;
        b.el.classList.toggle('hidden', off);
      }
      if (off) continue;
      const place = placeBubble(p.x, sy, b.w, b.h, vw, vh);
      const tf = `translate(calc(${Math.round(place.x)}px - 50%), calc(${Math.round(place.y)}px - 100%))`;
      if (tf !== b.lastTransform) {
        b.lastTransform = tf;
        b.el.style.transform = tf;
      }
      const tailX = Math.round(place.tailX);
      if (tailX !== b.lastTailX) {
        b.lastTailX = tailX;
        b.tail.style.left = `${tailX}px`;
      }
      if (place.clamped !== b.clampedCls) {
        b.clampedCls = place.clamped;
        b.el.classList.toggle('clamped', place.clamped);
      }
    }
  }

  /**
   * The speaker's drawn feet + crown height: own body from the
   * predictor, everyone else from the same interpolated sample the
   * renderer draws this frame — the bubble and the body never shear.
   */
  private anchor(eid: EntityId): { x: number; y: number; tiles: number } | null {
    if (eid === this.game.ownEid) {
      const p = this.game.predictor.renderPos();
      return { x: p.x, y: p.y, tiles: HUMANOID_TILES };
    }
    const remote = this.game.entities.get(eid);
    if (!remote) return null;
    const s = remote.buffer.sampleSmoothed(this.game.renderTime()) ?? remote.buffer.latest();
    return {
      x: s?.x ?? remote.meta.x,
      y: s?.y ?? remote.meta.y,
      tiles: anchorTiles(remote.meta),
    };
  }

  private build(eid: EntityId): Bubble {
    const el = document.createElement('div');
    el.className = 'speech-bubble';
    el.dataset.voice = eid === this.game.ownEid ? 'own' : 'world';
    const card = document.createElement('div');
    card.className = 'speech-card';
    const text = document.createElement('div');
    text.className = 'speech-text';
    const tail = document.createElement('div');
    tail.className = 'speech-tail';
    card.append(text, tail);
    el.appendChild(card);
    this.layer.appendChild(el);
    const b: Bubble = {
      el,
      card,
      text,
      tail,
      dieAt: 0,
      w: 0,
      h: 0,
      lastTransform: '',
      lastTailX: -1,
      bowing: false,
      clampedCls: false,
      hidden: false,
    };
    this.bubbles.set(eid, b);
    return b;
  }

  private evictOldest(): void {
    let oldest: EntityId | null = null;
    let dieAt = Infinity;
    for (const [eid, b] of this.bubbles) {
      if (b.dieAt < dieAt) {
        dieAt = b.dieAt;
        oldest = eid;
      }
    }
    if (oldest !== null) {
      this.bubbles.get(oldest)!.el.remove();
      this.bubbles.delete(oldest);
    }
  }
}
