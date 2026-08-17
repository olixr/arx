/**
 * THE LANDING WORD — status application moments (visible-buildcraft V1).
 *
 * The wire carries status as bare bits; nothing announces the moment a
 * state lands. This module is the announcer: a per-body memory of the
 * last seen bits, swept each frame, so a RISING edge can fire one short
 * library-voiced burst — the landing — while the ambient weather in
 * renderer.statusAmbience stays the quiet ongoing hum (THE LANDING
 * SPEAKS, THE RIDE HUMS).
 *
 * Laws bound here:
 * - ONE-VOICE: landings compose render/matter/ deployments. The only
 *   bespoke grains are sunder's stone chips — broken guard is this
 *   status grammar's OWN matter (the ambience already sheds the same
 *   chips) and no library material owns "masonry off a body".
 * - BROKEN MATTER IS NEVER ENERGY: bleed and sunder landings carry no
 *   glow; blood spatters and stone cracks, neither shines.
 * - FIRST SIGHT IS SILENT: a body entering view (or the map growing an
 *   eid it never met) adopts its current bits without a landing —
 *   otherwise every walk-on would replay old news. Stale entries (a
 *   body culled away and back) re-enter the same way.
 * - FALLING EDGES ARE SILENT: expiry just stops the hum; the consume
 *   verb's detonation already has the server's reaction voice.
 * - AMBIGUOUS STACKS SPEAK VENOM: the wire's stack nibble is a body
 *   total, not per-status. When both afflictions ride, the re-apply
 *   note takes venom's voice (the louder strategic state). A stack
 *   note is skipped entirely on the frame its affliction first lands —
 *   the landing already announced.
 *
 * ONE GRAMMAR, EVERY SCALE: STATUS_INK below is the single source for
 * status hexes — nameplate blocks, damage-float inks, and the wound
 * row all read it. The vignette edge for own-body DoT ticks derives
 * from the same family.
 */

import {
  STATUS_BIT,
  STATUS_AMBIENCE_MASK,
  STATUS_BOOK,
  afflictionStacksOf,
  type StatusId,
} from '@arx/shared';
import type { MatterCtx } from './matter/types.js';
import { fire, frost, storm, blood, venom, dust } from './matter/index.js';

/**
 * The one status color truth — read off THE BOOK OF STATES, where
 * each page's visuals contract declares its ink (statusBook.ts). One
 * truth, one home; every client surface keeps reading it from here.
 * (The hexes match the ambience palettes' lead hex, as always.)
 */
export const STATUS_INK: Readonly<Record<string, string>> = Object.fromEntries(
  Object.values(STATUS_BOOK).map((p) => [p.id, p.visuals.ink]),
);

/**
 * Vignette edge tint for own-body DoT ticks, as 'r, g, b' for the
 * renderer's hurt bands: darkened toward the band's weight so the
 * screen edge reads as a wound, not a highlight. Derived from the
 * pages that declare a vignette (the DoT tickers).
 */
export const STATUS_VIGNETTE_RGB: Readonly<Record<'burn' | 'bleed' | 'venom', string>> =
  Object.fromEntries(
    Object.values(STATUS_BOOK).flatMap((p) =>
      p.visuals.vignette ? [[p.id, p.visuals.vignette] as const] : [],
    ),
  ) as Record<'burn' | 'bleed' | 'venom', string>;

export interface StatusEdgeEvent {
  status: StatusId;
  kind: 'land' | 'stack';
}

interface EdgeRec {
  bits: number;
  stacks: number;
  frame: number;
}

/** Ambience-mask bits in nameplate priority order, each with its id. */
const EDGE_BITS: ReadonlyArray<readonly [number, StatusId]> = [
  [STATUS_BIT.sunder, 'sunder'],
  [STATUS_BIT.bleed, 'bleed'],
  [STATUS_BIT.venom, 'venom'],
  [STATUS_BIT.burn, 'burn'],
  [STATUS_BIT.chill, 'chill'],
  [STATUS_BIT.shock, 'shock'],
];

const AFFLICTION_BITS = STATUS_BIT.bleed | STATUS_BIT.venom;

/**
 * Per-body status memory. The renderer observes every visible body
 * once per frame; sweep() advances the frame clock and occasionally
 * purges bodies that stopped being observed (despawn or cull).
 */
export class StatusEdges {
  private map = new Map<number, EdgeRec>();
  private frame = 0;

  /** Advance the frame clock; purge long-unseen bodies now and then. */
  sweep(): void {
    this.frame++;
    if (this.frame % 120 === 0) {
      for (const [eid, rec] of this.map) {
        if (rec.frame < this.frame - 2) this.map.delete(eid);
      }
    }
  }

  /**
   * Record this body's bits for the current frame and return the
   * edges that rose since the last observation. First sight (or a
   * stale record from before a cull) adopts silently.
   */
  observe(eid: number, bits: number): StatusEdgeEvent[] {
    const stacks = afflictionStacksOf(bits);
    const rec = this.map.get(eid);
    if (!rec || rec.frame < this.frame - 2) {
      this.map.set(eid, { bits, stacks, frame: this.frame });
      return [];
    }
    const events: StatusEdgeEvent[] = [];
    const rose = bits & ~rec.bits & STATUS_AMBIENCE_MASK;
    let afflictionLanded = false;
    if (rose) {
      for (const [bit, status] of EDGE_BITS) {
        if (rose & bit) {
          events.push({ status, kind: 'land' });
          if (bit & AFFLICTION_BITS) afflictionLanded = true;
        }
      }
    }
    // A deeper wound on an already-riding affliction: the smaller
    // re-apply note. Skipped when a landing just spoke for it.
    if (!afflictionLanded && stacks > rec.stacks && bits & AFFLICTION_BITS) {
      events.push({
        status: bits & STATUS_BIT.venom ? 'venom' : 'bleed',
        kind: 'stack',
      });
    }
    rec.bits = bits;
    rec.stacks = stacks;
    rec.frame = this.frame;
    return events;
  }

  /** Test window: how many bodies are remembered. */
  size(): number {
    return this.map.size;
  }
}

type LandingVoice = (c: MatterCtx, x: number, y: number) => void;

/**
 * The landing vocabulary — one short library burst per status, small
 * scale, released at chest height. Sunder adds its own stone chips
 * (see the header doctrine) with the dust library carrying the mass.
 */
export const LANDINGS: Readonly<Record<string, LandingVoice>> = {
  burn: (c, x, y) => {
    fire.deployments.burst!(c, x, y, { scale: 0.45, z: 0.5 });
  },
  chill: (c, x, y) => {
    // The bloom is a sustained rim fog — held short: an announcement,
    // not a second ambience.
    frost.deployments.bloom!(c, x, y, { scale: 0.45, dur: 0.6 });
  },
  shock: (c, x, y) => {
    storm.deployments.crackle!(c, x, y, { scale: 0.5, z: 0.5 });
  },
  bleed: (c, x, y) => {
    blood.deployments.spatter!(c, x, y, { scale: 0.5, z: 0.45 });
  },
  venom: (c, x, y) => {
    venom.deployments.burst!(c, x, y, { scale: 0.45, z: 0.45 });
  },
  sunder: (c, x, y) => {
    dust.deployments.slam!(c, x, y, { scale: 0.45 });
    // The crack itself: three hero chips off the guard, the same dead
    // stone the ambience sheds, falling hard. No glow, ever.
    c.particles.burst(x, y - 0.55, 3, ['#b8b2a6', '#8a8478', '#6a6458'], {
      speed: 0.9,
      life: 0.5,
      size: 0.09,
      gravity: 5.0,
      shape: 'shard',
      z: 0.55,
    });
  },
};

/** The quieter re-apply notes for stacking afflictions. */
const STACK_NOTES: Readonly<Record<string, LandingVoice>> = {
  venom: (c, x, y) => {
    venom.deployments.bead!(c, x, y, { scale: 0.5, z: 0.4 });
  },
  bleed: (c, x, y) => {
    // Drip is a sustained emitter — two or three drops and done.
    blood.deployments.drip!(c, x, y, { scale: 0.5, dur: 0.5 });
  },
};

/** Speak one edge event at a body's ground anchor. */
export function statusLanding(c: MatterCtx, x: number, y: number, ev: StatusEdgeEvent): void {
  const voice = ev.kind === 'land' ? LANDINGS[ev.status] : STACK_NOTES[ev.status];
  voice?.(c, x, y);
}
