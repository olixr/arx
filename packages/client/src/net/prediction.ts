import {
  DRAW_MOVE_FACTOR,
  TICK_DT,
  TRAVEL_SPEEDS,
  isDrawSlowed,
  resolveTeleport,
  stepMovement,
  transitStep,
  transitTicks,
  type CollisionSource,
  type InputFrame,
  type TravelKind,
  type Vec2,
} from '@arx/shared';

/**
 * THE CROSSING, mirrored: the movement a cast carries. A `blink`
 * leaves through the shared teleport resolver on the cast frame; the
 * traversal kinds walk a seq-window road — one transit step per
 * frame at the kind's speed, the sticks suppressed while the road
 * owns the body, exactly the window the server's tickTransits walks
 * in the tick domain (the recorded bounded-drift class: both ends of
 * the road agree, the middle folds through the error offset).
 */
export interface CastMove {
  kind: TravelKind;
  dirX: number;
  dirY: number;
  dist: number;
}

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
  /**
   * Unacked frames, each stamped with the SPEED it was first simmed at
   * — reconcile replays with the frame's own historical speed, never
   * today's (a mid-flight ride/chill change used to mis-replay the
   * whole queue at the new multiplier). Rooting is re-judged live at
   * replay instead: it is seq-deterministic, and a root learned LATE
   * (a charged cast's fire message) must still root the frames it
   * covers.
   */
  private pending: Array<{ frame: InputFrame; speed: number }> = [];
  private errX = 0;
  private errY = 0;
  /** Most recent locally-committed ability cast, mirrored from the
   * server's rules so casts don't rubber-band: movement freezes for the
   * commitment window, and dash Arts move the body on the cast frame. */
  private lastCastSeq = -999;
  private lastCastFreeze = 0;
  private lastCastMove: (CastMove & { frames: number; stepPer: number }) | null = null;
  /**
   * Equipped weapon style ('archery' slows movement while Attack is held
   * — the braced draw stance). Must mirror the server's view; ClientGame
   * updates it from equip messages.
   */
  weaponStyle: string | null = null;
  /**
   * THE PREDICTOR LEARNS ITS LEGS: the steady speed multiplier over
   * base — saddle, tonics, stride enchants, composed server-side by
   * the one law (rideSpeedMult) and mirrored here via S2CRide. Before
   * this mirror existed the predictor ran at base speed and mounted
   * prediction would have rubber-banded every frame.
   */
  speedMult = 1;
  /**
   * THE PREDICTOR FEELS THE PAGES (statusBook Phase 3, generalizing
   * THE PREDICTOR FEELS THE COLD): the movement factor of every
   * status riding the own body — chill's slow, the holds' stone feet
   * — derived from the same STATUS_BOOK pages the server folds
   * (moveFactorOfBits off the own snapshot's status word). Without it
   * a slowed player over-predicts for the state's whole life and
   * rubber-bands every frame. One RTT stale at the edges, honest for
   * the duration.
   */
  statusMoveFactor = 1;
  /**
   * Drawn-bow walk factor with perks folded (Longstride) — mirrored
   * from S2CRide; the bare constant is only the fallback.
   */
  drawFactor = DRAW_MOVE_FACTOR;

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
    this.lastCastSeq = -999;
    this.lastCastMove = null;
  }

  /** ClientGame commits a cast on input frame `seq`. */
  registerCast(seq: number, freezeTicks: number, move: CastMove | null): void {
    this.lastCastSeq = seq;
    this.lastCastFreeze = freezeTicks;
    this.lastCastMove = move
      ? {
          ...move,
          frames: move.kind === 'blink' ? 0 : transitTicks(move.dist, move.kind),
          stepPer: move.kind === 'blink' ? 0 : TRAVEL_SPEEDS[move.kind] * TICK_DT,
        }
      : null;
  }

  /**
   * THE TRAVELED ROAD, mirrored: the frames whose legs the road owns
   * — [cast frame, cast frame + duration). The cast frame itself
   * still walks its normal step (the server processed that frame's
   * stick before the press), so only the LATER window frames zero
   * their input speed; every window frame takes its transit step.
   */
  private roadOwns(seq: number): boolean {
    const mv = this.lastCastMove;
    return (
      mv !== null &&
      mv.kind !== 'blink' &&
      seq >= this.lastCastSeq &&
      seq < this.lastCastSeq + mv.frames
    );
  }

  /** The cast's movement on this frame: the blink door or one road step. */
  private applyCastMove(pos: Vec2, seq: number): Vec2 {
    const mv = this.lastCastMove;
    if (!mv) return pos;
    if (mv.kind === 'blink') {
      return seq === this.lastCastSeq
        ? resolveTeleport(pos, mv.dirX, mv.dirY, mv.dist, this.collision)
        : pos;
    }
    const i = seq - this.lastCastSeq;
    if (i < 0 || i >= mv.frames) return pos;
    const step = Math.min(mv.stepPer, mv.dist - i * mv.stepPer);
    if (step <= 0) return pos;
    const res = transitStep(pos, mv.dirX, mv.dirY, step, this.collision);
    return { x: res.x, y: res.y };
  }

  /** Rooted while committed to a cast (the frames after the cast frame). */
  private rooted(seq: number): boolean {
    if (seq > this.lastCastSeq && seq <= this.lastCastSeq + this.lastCastFreeze) return true;
    // The road owns the sticks on the window frames after the cast.
    if (this.roadOwns(seq) && seq !== this.lastCastSeq) return true;
    // THE CROSSING: a leap's recovery root anchors at the LANDING —
    // the server re-roots at the crater (the press-time freeze burned
    // mid-air), so the mirror holds the same frames or the body walks
    // out of a root the server is still enforcing.
    const mv = this.lastCastMove;
    if (mv && mv.kind === 'leap' && this.lastCastFreeze > 0) {
      const endFrame = this.lastCastSeq + mv.frames - 1;
      if (seq > endFrame && seq <= endFrame + this.lastCastFreeze) return true;
    }
    return false;
  }

  /**
   * Per-frame speed — every factor the server applies, mirrored:
   * draw-slow (perk-folded), the steady ride mult, and the riding
   * pages' feet (chill, the holds).
   */
  private frameSpeed(frame: InputFrame): number {
    if (this.rooted(frame.seq)) return 0;
    let speed =
      (isDrawSlowed(frame, this.weaponStyle) ? this.speed * this.drawFactor : this.speed) *
      this.speedMult;
    speed *= this.statusMoveFactor;
    return speed;
  }

  /** The shared per-frame move: the normal step + a cast's own move. */
  private simFrame(pos: Vec2, frame: InputFrame): Vec2 {
    let out = stepMovement(pos, frame, this.frameSpeed(frame), TICK_DT, this.collision);
    out = this.applyCastMove(out, frame.seq);
    return out;
  }

  applyInput(frame: InputFrame): void {
    this.pending.push({ frame, speed: this.frameSpeed(frame) });
    this.prev = this.pos;
    this.pos = this.simFrame(this.pos, frame);
  }

  reconcile(authoritative: Vec2, lastProcessedSeq: number): void {
    while (this.pending.length > 0 && this.pending[0]!.frame.seq <= lastProcessedSeq) {
      this.pending.shift();
    }
    const before = this.pos;
    let pos = { ...authoritative };
    for (const { frame, speed } of this.pending) {
      // The frame's own historical speed; rooting re-judged live so a
      // root learned late (a charged cast's fire) covers its frames.
      const replaySpeed = this.rooted(frame.seq) ? 0 : speed;
      pos = stepMovement(pos, frame, replaySpeed, TICK_DT, this.collision);
      // Replay the committed cast impulses on their exact frames.
      pos = this.applyCastMove(pos, frame.seq);
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
