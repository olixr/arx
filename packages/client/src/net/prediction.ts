import {
  DODGE_COOLDOWN_SEQ,
  DRAW_MOVE_FACTOR,
  InputButton,
  TICK_DT,
  applyDodge,
  hasButton,
  isDrawSlowed,
  stepMovement,
  type CollisionSource,
  type InputFrame,
  type Vec2,
} from '@devcraft/shared';

/**
 * Client-side prediction for the local player. Inputs are applied
 * immediately and kept until the server acknowledges them; on each
 * snapshot we rewind to the authoritative state and replay unacked
 * inputs. Corrections are folded into a decaying error offset so they
 * render as a soft nudge instead of a snap.
 *
 * Prediction advances in fixed 20 Hz steps, but frames render at
 * 60–144 Hz — so `renderPos` interpolates between the previous and
 * current predicted states by the accumulator fraction (`renderAlpha`).
 * Without this the local player pops forward once per tick and holds
 * still between them while the smoothed camera glides — the classic
 * "my character is jittery but the world is smooth" artifact.
 */
export class Predictor {
  pos: Vec2 = { x: 0, y: 0 };
  /** State one prediction step behind `pos` — the interpolation base. */
  private prev: Vec2 = { x: 0, y: 0 };
  /** 0..1 fraction through the current tick, set by the game loop. */
  renderAlpha = 1;
  private pending: InputFrame[] = [];
  private errX = 0;
  private errY = 0;
  private lastDodgeSeq = -999;
  /** Fires when a dodge impulse applies locally (for whoosh/trail FX). */
  onDodge: ((x: number, y: number, mx: number, my: number) => void) | null = null;
  /**
   * Equipped weapon style ('archery' slows movement while Attack is held
   * — the braced draw stance). Must mirror the server's view; ClientGame
   * updates it from equip messages.
   */
  weaponStyle: string | null = null;

  constructor(
    private readonly collision: CollisionSource,
    public speed: number,
  ) {}

  reset(pos: Vec2): void {
    this.pos = { ...pos };
    this.prev = { ...pos };
    this.pending = [];
    this.errX = 0;
    this.errY = 0;
    this.lastDodgeSeq = -999;
  }

  /** Per-frame speed — drawing a bow brakes exactly like the server. */
  private frameSpeed(frame: InputFrame): number {
    return isDrawSlowed(frame, this.weaponStyle)
      ? this.speed * DRAW_MOVE_FACTOR
      : this.speed;
  }

  /** The shared per-frame move: normal step + optional dodge impulse. */
  private simFrame(pos: Vec2, frame: InputFrame, trackDodge: boolean): Vec2 {
    let out = stepMovement(pos, frame, this.frameSpeed(frame), TICK_DT, this.collision);
    if (
      hasButton(frame.buttons, InputButton.Dodge) &&
      frame.seq >= this.lastDodgeSeq + DODGE_COOLDOWN_SEQ &&
      Math.hypot(frame.mx, frame.my) > 0.01
    ) {
      if (trackDodge) {
        this.lastDodgeSeq = frame.seq;
        this.onDodge?.(out.x, out.y, frame.mx, frame.my);
      }
      out = applyDodge(out, frame.mx, frame.my, this.collision);
    }
    return out;
  }

  applyInput(frame: InputFrame): void {
    this.pending.push(frame);
    this.prev = this.pos;
    this.pos = this.simFrame(this.pos, frame, true);
  }

  reconcile(authoritative: Vec2, lastProcessedSeq: number): void {
    while (this.pending.length > 0 && this.pending[0]!.seq <= lastProcessedSeq) {
      this.pending.shift();
    }
    const before = this.pos;
    let pos = { ...authoritative };
    for (const frame of this.pending) {
      pos = stepMovement(pos, frame, this.frameSpeed(frame), TICK_DT, this.collision);
      // Replay the committed dodge impulse on its exact frame.
      if (frame.seq === this.lastDodgeSeq) {
        pos = applyDodge(pos, frame.mx, frame.my, this.collision);
      }
    }
    this.pos = pos;

    // Shift the interpolation base by the same correction so the visual
    // position stays perfectly continuous through the reconcile...
    const dx = before.x - pos.x;
    const dy = before.y - pos.y;
    this.prev = { x: this.prev.x - dx, y: this.prev.y - dy };

    // ...and fold the correction into the decaying offset (big desyncs snap).
    if (Math.hypot(dx, dy) < 2) {
      this.errX += dx;
      this.errY += dy;
    } else {
      this.errX = 0;
      this.errY = 0;
      this.prev = { ...pos };
    }
  }

  /** Call once per render frame; decays the correction offset. */
  decayError(frameDt: number): void {
    const k = Math.exp(-12 * frameDt);
    this.errX *= k;
    this.errY *= k;
    if (Math.abs(this.errX) < 1e-4) this.errX = 0;
    if (Math.abs(this.errY) < 1e-4) this.errY = 0;
  }

  /** Smooth render position: tick-interpolated + correction offset. */
  renderPos(): Vec2 {
    const a = Math.min(1, Math.max(0, this.renderAlpha));
    return {
      x: this.prev.x + (this.pos.x - this.prev.x) * a + this.errX,
      y: this.prev.y + (this.pos.y - this.prev.y) * a + this.errY,
    };
  }
}
