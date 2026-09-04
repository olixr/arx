/**
 * THE HAND ON THE CAMERA (play3d S1) — keyboard + pointer for the
 * skeleton. Drag orbits (yaw/pitch), wheel dollies, WASD walks the
 * target body camera-relative. Deltas ACCUMULATE between frames and
 * are consumed once per frame by the engine, so input never touches
 * the camera outside the frame loop (no mid-frame tearing of the
 * orbit pose) and a burst of wheel events lands as one dolly.
 *
 * S2 mounts the real InputManager / touch.ts adapter; this stays the
 * dev-page fallback.
 */

export class Input3D {
  readonly keys = new Set<string>();
  private dragX = 0;
  private dragY = 0;
  private wheel = 0;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private readonly onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
    this.onKey?.(e.code);
  };
  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };
  private readonly onPointerDown = (e: PointerEvent): void => {
    this.dragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.canvas.setPointerCapture(e.pointerId);
  };
  private readonly onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging) return;
    this.dragX += e.clientX - this.lastX;
    this.dragY += e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };
  private readonly onPointerUp = (): void => {
    this.dragging = false;
  };
  private readonly onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    // Normalise wheel modes: pixels (0), lines (1), pages (2).
    const k = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 120 : 1;
    this.wheel += (e.deltaY * k) / 100;
  };
  private readonly onBlur = (): void => {
    this.keys.clear();
    this.dragging = false;
  };
  /** Single-press hook (toggles). */
  onKey: ((code: string) => void) | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
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

  /** WASD/arrows → (strafe, advance) in -1..1. */
  axes(out: { strafe: number; advance: number }): void {
    const k = this.keys;
    out.advance = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    out.strafe = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }
}
