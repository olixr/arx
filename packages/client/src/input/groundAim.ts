import {
  InputButton,
  groundAimed,
  groundAimRange,
  type AbilityDef,
  type AbilitySlot,
  type InputFrame,
} from '@arx/shared';

/**
 * THE HELD SIGIL: hold-to-aim for point-targeted arts.
 *
 * Press an ability whose shape lands at a ground POINT and the cast
 * waits: the button becomes a held gesture steering a ghost ring
 * (right stick on pad, cursor on mouse), and RELEASE looses the art
 * at the ring. The wire grammar is untouched — this layer simply
 * withholds the button bit while the gesture lives, then raises it
 * for exactly one frame carrying the aimed point (`tx`/`ty`), so the
 * server's press-edge law still sees one press, one cast.
 *
 * Taps stay taps: a press-and-release inside one tick sends no point
 * and the server's aim-assisted resolve answers exactly as before.
 * Touch (and hotbar clicks) never arm the gesture at all — their
 * smart cast is the right grammar for a thumb on glass.
 */

/** What the gesture needs to ask of the game, structurally typed so
 *  this module never imports the game (no cycle). */
export interface AimHost {
  slotAbility(slot: AbilitySlot): AbilityDef | null;
  /** Off cooldown AND not a dormant loan seat. */
  slotReady(slot: AbilitySlot): boolean;
  /** While stowed, a press draws steel instead of aiming. */
  sheathed(): boolean;
  /** Bits currently driven by touch/hotbar buttons — never armed. */
  touchBits(): number;
}

/** The live gesture, read by the renderer for the ghost ring. */
export interface AimGesture {
  slot: AbilitySlot;
  ab: AbilityDef;
  /** The ring's world point (smoothed) — NaN until the first update. */
  x: number;
  y: number;
  /** The art's reach in tiles (the one ruler, honed def's own). */
  range: number;
  bornAt: number;
  /** True once the hand has actively steered the ring. */
  steered: boolean;
  /** Pad reticle: sticky offset from the body, tiles (build-cursor law). */
  padOff: { dx: number; dy: number } | null;
}

const SLOT_BITS: ReadonlyArray<[number, AbilitySlot]> = [
  [InputButton.Ability1, 0],
  [InputButton.Ability2, 1],
  [InputButton.Ability3, 2],
  [InputButton.Ability4, 3],
];

export class GroundAimController {
  private g: AimGesture | null = null;
  private prevRaw = 0;
  /**
   * Bits eaten until their key physically lifts — a cancelled gesture's
   * button must NOT re-arrive at the server as a fresh press edge the
   * moment we stop masking it (that would cast the art you just bailed
   * out of, at the smart point, uninvited).
   */
  private swallowBits = 0;

  constructor(private readonly host: AimHost) {}

  /** The live gesture, or null. Renderer/HUD read, never write. */
  gesture(): AimGesture | null {
    return this.g;
  }

  /** Bail out without casting; the held key stays eaten until lifted. */
  cancel(): void {
    if (!this.g) return;
    this.swallowBits |= SLOT_BITS[this.g.slot]?.[0] ?? 0;
    this.g = null;
  }

  /**
   * Per network tick, BEFORE the cast mirror: rewrites the frame's
   * buttons (and stamps `tx`/`ty` on the release frame). Must see every
   * frame — it keeps its own raw press-edge state.
   */
  filterFrame(frame: InputFrame): void {
    const raw = frame.buttons;
    const pressed = raw & ~this.prevRaw;
    this.prevRaw = raw;

    // Eaten keys stay eaten until the finger comes off them.
    this.swallowBits &= raw;
    frame.buttons &= ~this.swallowBits;

    // A reseated (or unequipped) art mid-hold dissolves the gesture.
    if (this.g && this.host.slotAbility(this.g.slot)?.id !== this.g.ab.id) this.cancel();
    // THE LOWERED RING: sheathe is the bail-out gesture (H / d-pad ◀
    // — the one "put it away" verb the hand already knows). The ring
    // dies and the press is EATEN whole: it lowers the ring, it never
    // reaches the server to stow the steel you were about to cast with.
    if (this.g && pressed & InputButton.Sheathe) {
      this.cancel();
      this.swallowBits |= InputButton.Sheathe;
    }

    if (this.g) {
      const bit = SLOT_BITS[this.g.slot]![0];
      if (raw & bit) {
        // Still held: the cast waits, the ring steers.
        frame.buttons &= ~bit;
      } else {
        // Released: one frame carries the press edge AND the point.
        frame.buttons |= bit;
        if (Number.isFinite(this.g.x) && Number.isFinite(this.g.y)) {
          frame.tx = this.g.x;
          frame.ty = this.g.y;
        }
        this.g = null;
      }
      // One gesture at a time: another point-art press mid-hold is
      // eaten whole — it neither casts blind nor steals the ring.
      for (const [b, slot] of SLOT_BITS) {
        if (this.g && b === SLOT_BITS[this.g.slot]![0]) continue;
        if (!(pressed & b)) continue;
        const other = this.host.slotAbility(slot);
        if (other && groundAimed(other)) {
          frame.buttons &= ~b;
          this.swallowBits |= b;
        }
      }
      return;
    }

    // Arm: a fresh key/pad press on a ready point-art starts the hold.
    const touch = this.host.touchBits();
    for (const [bit, slot] of SLOT_BITS) {
      if (!(pressed & bit) || touch & bit) continue;
      const ab = this.host.slotAbility(slot);
      if (!ab || !groundAimed(ab)) continue;
      // A refused press (cooldown, dormant seat, stowed steel) passes
      // through untouched — the server answers it exactly as before.
      if (!this.host.slotReady(slot) || this.host.sheathed()) continue;
      this.g = {
        slot,
        ab,
        x: NaN,
        y: NaN,
        range: groundAimRange(ab),
        bornAt: performance.now(),
        steered: false,
        padOff: null,
      };
      frame.buttons &= ~bit;
      break;
    }

    // A cancel INSIDE this very tick (sheathe press, reseated art) adds
    // its bit to the swallow AFTER the top-of-frame mask ran — re-mask,
    // or this one frame ships the still-held button as a fresh press
    // edge and the server casts the art you just bailed out of.
    frame.buttons &= ~this.swallowBits;
  }

  /**
   * Per render frame: settle the ring's world point. Pad steering is
   * the build cursor's dialect — deflection direction aims, depth sets
   * reach, and the offset is STICKY so you can strafe while the ring
   * holds its ground. Mouse is the cursor through pickWorld, clamped
   * to reach. Un-steered pads rest on the soft aim-assist mark so the
   * ring always tells the truth about where a bare tap would land.
   */
  update(o: {
    /** Any open screen / build ghost / cinematic dissolves the hold. */
    blocked: boolean;
    own: { x: number; y: number };
    aim: number;
    /** Right-stick axes when the pad is the live device, else null. */
    stick: { x: number; y: number } | null;
    /** pickWorld under the cursor (mouse devices), else null. */
    mouseWorld: { x: number; y: number } | null;
    /** Nearest foe inside reach in the aim cone — the honest default. */
    assist: { x: number; y: number } | null;
    dtSec: number;
  }): void {
    const g = this.g;
    if (!g) return;
    if (o.blocked) {
      this.cancel();
      return;
    }
    const reach = g.range;
    const floor = Math.min(0.9, reach);
    let target: { x: number; y: number };
    if (o.stick) {
      const mag = Math.hypot(o.stick.x, o.stick.y);
      if (mag > 0.3) {
        const depth = Math.min(1, (mag - 0.3) / 0.65);
        const r = floor + depth * Math.max(0, reach - floor);
        g.padOff = { dx: (o.stick.x / mag) * r, dy: (o.stick.y / mag) * r };
        g.steered = true;
      }
      if (g.padOff) {
        target = { x: o.own.x + g.padOff.dx, y: o.own.y + g.padOff.dy };
      } else {
        target =
          o.assist ?? {
            x: o.own.x + Math.cos(o.aim) * reach * 0.6,
            y: o.own.y + Math.sin(o.aim) * reach * 0.6,
          };
      }
    } else if (o.mouseWorld) {
      target = o.mouseWorld;
      g.steered = true;
    } else {
      target = {
        x: o.own.x + Math.cos(o.aim) * reach * 0.6,
        y: o.own.y + Math.sin(o.aim) * reach * 0.6,
      };
    }
    // The one ruler: the ring never promises past the art's reach.
    const dx = target.x - o.own.x;
    const dy = target.y - o.own.y;
    const dist = Math.hypot(dx, dy);
    if (dist > reach && dist > 0) {
      target = { x: o.own.x + (dx / dist) * reach, y: o.own.y + (dy / dist) * reach };
    }
    // Critically damped glide — pad marks hand off smoothly, the mouse
    // stays essentially 1:1 (a fast constant, not a laggy one).
    if (!Number.isFinite(g.x)) {
      g.x = target.x;
      g.y = target.y;
    } else {
      const k = 1 - Math.exp(-o.dtSec * (o.stick ? 16 : 40));
      g.x += (target.x - g.x) * k;
      g.y += (target.y - g.y) * k;
    }
  }
}
