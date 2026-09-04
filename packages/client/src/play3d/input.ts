/**
 * THE HAND ON THE WORLD (play3d S2) — pointer + keys for the live door.
 *
 * Two hands, one surface:
 *  - `PointerRig` owns the mouse on the canvas. Dragging with EITHER
 *    button orbits (yaw/pitch); the wheel dollies; a left press that
 *    never travelled past the drag threshold is a CLICK, delivered on
 *    release with its screen point (the composition raycasts it onto
 *    the heightfield: interact in reach, else walk there). The right
 *    button never clicks (no context menu on the stage). Deltas
 *    ACCUMULATE between frames and are consumed once per frame, so a
 *    burst of wheel events lands as one dolly and input never touches
 *    the camera outside the frame loop.
 *  - `LiveInput` IS the production `InputManager` (ClientGame samples
 *    it per tick: moveAxes / buttons / sneakMode), with one law added:
 *    THE KEYS FOLLOW THE CAMERA — W walks where the camera looks, so
 *    the raw key vector is rotated by the orbit yaw before the game
 *    sees it (a pad stick and the touch joystick ride the same turn).
 *    Its focus/attack target is a hidden sink, not the canvas, so a
 *    click-to-move never doubles as a swing: the Attack bit comes from
 *    the keymap (Space) / pad, or from `attackHeld` — a left press that
 *    landed on a foe, held until release.
 */
import { InputButton } from '@arx/shared';
import { InputManager } from '../input/inputManager.js';
import { moveOnGround } from './orbit.js';

const CLICK_SLOP_PX = 5;

export class PointerRig {
  private dragX = 0;
  private dragY = 0;
  private wheel = 0;
  private down = -1;
  private pointerId = -1;
  private startX = 0;
  private startY = 0;
  private lastX = 0;
  private lastY = 0;
  private travelled = 0;
  /** A left click landed (screen CSS px). */
  onClick: ((sx: number, sy: number) => void) | null = null;
  /** The left button rose (after a click or a drag). */
  onRelease: (() => void) | null = null;

  private readonly onPointerDown = (e: PointerEvent): void => {
    if (this.down !== -1) return;
    this.down = e.button;
    this.pointerId = e.pointerId;
    this.startX = this.lastX = e.clientX;
    this.startY = this.lastY = e.clientY;
    this.travelled = 0;
    this.canvas.setPointerCapture(e.pointerId);
  };
  private readonly onPointerMove = (e: PointerEvent): void => {
    if (this.down === -1 || e.pointerId !== this.pointerId) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.travelled = Math.max(this.travelled, Math.hypot(e.clientX - this.startX, e.clientY - this.startY));
    if (this.travelled > CLICK_SLOP_PX) {
      this.dragX += dx;
      this.dragY += dy;
    }
  };
  private readonly onPointerUp = (e: PointerEvent): void => {
    if (this.down === -1 || e.pointerId !== this.pointerId) return;
    const button = this.down;
    this.down = -1;
    this.pointerId = -1;
    if (button === 0) {
      if (this.travelled <= CLICK_SLOP_PX) this.onClick?.(e.clientX, e.clientY);
      this.onRelease?.();
    }
  };
  private readonly onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const k = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 120 : 1;
    this.wheel += (e.deltaY * k) / 100;
  };
  private readonly onContext = (e: Event): void => e.preventDefault();
  private readonly onBlur = (): void => {
    this.down = -1;
    this.pointerId = -1;
  };

  constructor(private readonly canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('contextmenu', this.onContext);
    window.addEventListener('blur', this.onBlur);
  }

  /** Read-and-zero the accumulated drag/wheel into `out`. */
  consume(out: { dragX: number; dragY: number; wheel: number }): void {
    out.dragX = this.dragX;
    out.dragY = this.dragY;
    out.wheel = this.wheel;
    this.dragX = 0;
    this.dragY = 0;
    this.wheel = 0;
  }

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('contextmenu', this.onContext);
    window.removeEventListener('blur', this.onBlur);
  }
}

export class LiveInput extends InputManager {
  /** The orbit yaw the keys follow (set by the frame loop). */
  cameraYaw = 0;
  /** A left press on a foe, held until release (the click-attack). */
  attackHeld = false;
  private readonly turned = { x: 0, z: 0 };

  override moveAxes(): { mx: number; my: number } {
    const raw = super.moveAxes();
    const len = Math.hypot(raw.mx, raw.my);
    if (len < 1e-6) return raw;
    // Raw: my<0 is "up/forward" (the 2D frame); strafe is mx.
    moveOnGround(this.cameraYaw, raw.mx / len, -raw.my / len, this.turned);
    raw.mx = this.turned.x * len;
    raw.my = this.turned.z * len;
    return raw;
  }

  override buttons(): number {
    let b = super.buttons();
    if (this.attackHeld && !this.uiCapture && !this.cinemaCapture) b |= InputButton.Attack;
    return b;
  }
}
