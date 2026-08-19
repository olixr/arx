import type { ClientGame } from '../game/clientGame.js';
import type { InputManager } from '../input/inputManager.js';
import type { Button } from './types.js';
import { reel } from './state.js';

/**
 * THE PUPPET — a hand on the same controls a player holds.
 *
 * No shot ever reaches past the input layer to move a body. The
 * director writes the touch lane's analog stick and its four action
 * buttons, exactly as a phone player's thumbs do, and the frame reads
 * them back through the one input path everything else uses. That is
 * the whole point: if the puppet can do it, a player can do it, and
 * the footage is therefore honest.
 *
 * The analog stick is the reason the touch lane wins over synthesised
 * key events — a shot can walk a body into frame at four tenths pace,
 * which is a stroll, and no keyboard can express that.
 */

/** Dev chat runs on the server's 1/s bucket, burst 4. Model it here so
 *  a shot that overspends is caught in the lane, not in the footage. */
const BUCKET_RATE = 1; // tokens per second
const BUCKET_BURST = 4;

export class Puppet {
  /** Held-button release deadlines, ms on the performance clock. */
  private releases = new Map<Button, number>();
  private tokens = BUCKET_BURST;
  private lastRefill = 0;
  /** A live `goto`: steer here every frame until we are inside. */
  private goal: { x: number; y: number; speed: number; within: number } | null = null;
  /** Commands the bucket could not afford yet. */
  private queue: string[] = [];
  /** Every command that had to wait — the take report reads this. */
  readonly overspend: string[] = [];

  constructor(
    private readonly game: ClientGame,
    private readonly input: InputManager,
  ) {}

  /** Analog walk, world axes. Magnitude ≤ 1 sets the pace. */
  move(x: number, y: number): void {
    this.goal = null;
    const len = Math.hypot(x, y);
    this.input.touchMoveX = len > 1 ? x / len : x;
    this.input.touchMoveY = len > 1 ? y / len : y;
  }

  /** Walk toward a world point and stop there. */
  goto(x: number, y: number, speed = 1, within = 0.4): void {
    this.goal = { x, y, speed, within };
  }

  /** True once a `goto` has arrived (or there was never one). */
  get arrived(): boolean {
    return this.goal === null;
  }

  /** The eyes. */
  look(rad: number): void {
    reel.aim = rad;
  }

  lookAt(x: number, y: number): void {
    const p = this.game.predictor.renderPos();
    reel.aim = Math.atan2(y - p.y, x - p.x);
  }

  lookFree(): void {
    reel.aim = null;
  }

  /** Hold a button. `ms` measured on the performance clock. */
  press(btn: Button, ms: number, now: number): void {
    this.set(btn, true);
    this.releases.set(btn, now + Math.max(16, ms));
  }

  /** Dev chat, bucket-aware. Anything over budget waits its turn. */
  cmd(text: string, now: number): void {
    this.refill(now);
    if (this.tokens >= 1 && this.queue.length === 0) {
      this.tokens -= 1;
      this.game.sendChat(text);
      return;
    }
    this.queue.push(text);
    this.overspend.push(text);
  }

  private refill(now: number): void {
    const dt = Math.max(0, (now - this.lastRefill) / 1000);
    this.lastRefill = now;
    this.tokens = Math.min(BUCKET_BURST, this.tokens + dt * BUCKET_RATE);
  }

  private set(btn: Button, down: boolean): void {
    const i = this.input;
    switch (btn) {
      case 'attack': i.touchAttack = down; break;
      case 'art': i.touchAbility1 = down; break;
      case 'relic': i.touchAbility2 = down; break;
      case 'tech': i.touchAbility3 = down; break;
      case 'sigil': i.touchAbility4 = down; break;
    }
  }

  /** One frame of upkeep: releases, steering, the command queue. */
  step(now: number): void {
    for (const [btn, at] of this.releases) {
      if (now >= at) {
        this.set(btn, false);
        this.releases.delete(btn);
      }
    }
    if (this.queue.length) {
      this.refill(now);
      if (this.tokens >= 1) {
        this.tokens -= 1;
        this.game.sendChat(this.queue.shift()!);
      }
    }
    const g = this.goal;
    if (g) {
      const p = this.game.predictor.renderPos();
      const dx = g.x - p.x;
      const dy = g.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d <= g.within) {
        this.goal = null;
        this.input.touchMoveX = 0;
        this.input.touchMoveY = 0;
      } else {
        // Ease the last two tiles so an arrival settles instead of
        // stamping — a body that stops dead reads as a bug.
        const pace = g.speed * Math.min(1, Math.max(0.25, d / 2));
        this.input.touchMoveX = (dx / d) * pace;
        this.input.touchMoveY = (dy / d) * pace;
      }
    }
  }

  /** Drop everything: no held buttons, no walk, no borrowed eyes. */
  release(): void {
    for (const btn of this.releases.keys()) this.set(btn, false);
    this.releases.clear();
    this.goal = null;
    this.input.touchMoveX = 0;
    this.input.touchMoveY = 0;
    reel.aim = null;
  }
}
