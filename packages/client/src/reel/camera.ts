import type { Renderer } from '../render/renderer.js';
import type { CamMove, EaseName } from './types.js';

/**
 * THE CAMERA RIG — a dolly, a spring, and a hand.
 *
 * The renderer already owns a player-follow camera, and it is the
 * right camera for playing. It is the wrong camera for a trailer: it
 * snaps to the body, it never leads a charge, and it holds perfectly
 * still, which on a screen reads as dead rather than calm. So a shot
 * takes `renderer.cameraOverride` and drives it here.
 *
 * Three layers stack, in this order:
 *
 *  1. THE MOVE — where the shot says to be (follow, hold, glide, drift).
 *  2. THE SPRING — critically damped, so the camera has weight. A
 *     follow that tracks its subject exactly is indistinguishable from
 *     a static background scrolling; the lag IS the cinematography.
 *  3. THE BREATH AND THE HAND — a slow, sub-perceptual drift and (in a
 *     fight) a hand-held tremor. Neither is legible on its own; both
 *     are instantly legible by their absence.
 */

const EASES: Record<EaseName, (t: number) => number> = {
  linear: (t) => t,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
};

/** Deterministic value noise — a hand shakes, it does not jitter. */
function noise(t: number, seed: number): number {
  const i = Math.floor(t);
  const f = t - i;
  const s = Math.sin((i + seed * 71.3) * 12.9898) * 43758.5453;
  const s2 = Math.sin((i + 1 + seed * 71.3) * 12.9898) * 43758.5453;
  const a = (s - Math.floor(s)) * 2 - 1;
  const b = (s2 - Math.floor(s2)) * 2 - 1;
  const u = f * f * (3 - 2 * f); // smoothstep — no corners in the shake
  return a * (1 - u) + b * u;
}

interface Subject {
  x: number;
  y: number;
  /** Aim in radians, for the follow lead. */
  aim: number;
}

export class CamRig {
  /** The settled camera — what the spring chases. */
  private tx = 0;
  private ty = 0;
  private tzoom = 1;
  /** The live camera — what the renderer is handed. */
  private x = 0;
  private y = 0;
  private zoom = 1;
  private vx = 0;
  private vy = 0;
  private vz = 0;

  private move: CamMove = { k: 'follow' };
  /** Move-local clock, seconds since the move was handed over. */
  private moveT = 0;
  /** Where the camera stood when the current glide began. */
  private fromX = 0;
  private fromY = 0;
  private fromZoom = 1;

  /** How hard the spring pulls (1/s). Higher = tighter, less weight. */
  stiffness = 3.6;
  /** Hand-held energy, 0..1. */
  handheld = 0;
  /** The always-on drift; a shot never turns this off. */
  breath = 1;

  private clock = 0;

  constructor(private readonly renderer: Renderer) {
    const c = renderer.camera;
    this.x = this.tx = c.x;
    this.y = this.ty = c.y;
    this.zoom = this.tzoom = c.zoom;
    this.fromX = this.x;
    this.fromY = this.y;
    this.fromZoom = this.zoom;
  }

  /** Hand the rig a new move; the glide starts from wherever it is. */
  set(move: CamMove): void {
    this.move = move;
    this.moveT = 0;
    this.fromX = this.x;
    this.fromY = this.y;
    this.fromZoom = this.zoom;
    // A cut-style move (`hold` with no ms) is honest about being a cut:
    // it lands the settled camera immediately and lets the spring do the
    // last inch, so the frame does not sail across the map.
    if (move.k === 'hold' && !move.ms) {
      this.x = this.tx = move.x;
      this.y = this.ty = move.y;
      if (move.zoom !== undefined) this.zoom = this.tzoom = move.zoom;
      this.vx = this.vy = this.vz = 0;
    }
  }

  /**
   * One frame. `subject` is the player; `foe` is whatever the shot's
   * followFoe/faceFoe picker settled on (null when there is none).
   */
  step(dt: number, subject: Subject, foe: { x: number; y: number } | null): void {
    this.clock += dt;
    this.moveT += dt;
    const m = this.move;

    switch (m.k) {
      case 'follow': {
        const lead = m.lead ?? 1.6;
        this.tx = subject.x + Math.cos(subject.aim) * lead;
        this.ty = subject.y + Math.sin(subject.aim) * lead * 0.75;
        if (m.zoom !== undefined) this.tzoom = m.zoom;
        break;
      }
      case 'followFoe': {
        if (foe) {
          // Frame the pair: the eye wants both bodies, weighted toward
          // the thing that is about to happen.
          this.tx = foe.x * 0.62 + subject.x * 0.38;
          this.ty = foe.y * 0.62 + subject.y * 0.38;
        }
        if (m.zoom !== undefined) this.tzoom = m.zoom;
        break;
      }
      case 'hold': {
        this.tx = m.x;
        this.ty = m.y;
        if (m.zoom !== undefined) this.tzoom = m.zoom;
        break;
      }
      case 'to': {
        const dur = Math.max(0.001, (m.ms ?? 1200) / 1000);
        const t = Math.min(1, this.moveT / dur);
        const e = EASES[m.ease ?? 'inOut'](t);
        this.tx = this.fromX + (m.x - this.fromX) * e;
        this.ty = this.fromY + (m.y - this.fromY) * e;
        if (m.zoom !== undefined) this.tzoom = this.fromZoom + (m.zoom - this.fromZoom) * e;
        break;
      }
      case 'drift': {
        this.tx += m.dx * dt;
        this.ty += m.dy * dt;
        if (m.zoom !== undefined) this.tzoom = m.zoom;
        break;
      }
      case 'zoom': {
        const dur = Math.max(0.001, m.ms / 1000);
        const t = Math.min(1, this.moveT / dur);
        this.tzoom = this.fromZoom + (m.to - this.fromZoom) * EASES[m.ease ?? 'inOut'](t);
        break;
      }
    }

    // THE SPRING. Critically damped: no overshoot, no wobble, just
    // weight. `drift` and `to` already carry their own motion, so they
    // ride a stiffer spring — a lag on top of a tween reads as sludge.
    const k = m.k === 'drift' || m.k === 'to' || m.k === 'zoom' ? this.stiffness * 3 : this.stiffness;
    const a = 1 - Math.exp(-k * dt);
    this.vx = (this.tx - this.x) * a;
    this.vy = (this.ty - this.y) * a;
    this.vz = (this.tzoom - this.zoom) * (1 - Math.exp(-k * 1.4 * dt));
    this.x += this.vx;
    this.y += this.vy;
    this.zoom += this.vz;

    // THE BREATH: 0.35 % of zoom over ~11 s and a hair of travel. Below
    // the threshold of notice, above the threshold of dead.
    const br = this.breath;
    const bz = 1 + Math.sin(this.clock * 0.57) * 0.0035 * br;
    const bx = Math.sin(this.clock * 0.31) * 0.05 * br;
    const by = Math.cos(this.clock * 0.23) * 0.035 * br;

    // THE HAND: two octaves of smooth noise. A fight shot wants this at
    // ~0.6; a landscape wants it at 0.
    const h = this.handheld;
    const hx = h ? (noise(this.clock * 1.7, 1) * 0.09 + noise(this.clock * 4.3, 3) * 0.03) * h : 0;
    const hy = h ? (noise(this.clock * 1.5, 7) * 0.07 + noise(this.clock * 3.9, 5) * 0.025) * h : 0;

    this.renderer.cameraOverride = {
      x: this.x + bx + hx,
      y: this.y + by + hy,
      zoom: this.zoom * bz,
    };
  }

  /** Give the camera back to the game. */
  release(): void {
    this.renderer.cameraOverride = null;
  }
}
