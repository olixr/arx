import type { InputManager } from './inputManager.js';
import type { ClientGame } from '../game/clientGame.js';
import type { Renderer } from '../render/renderer.js';

/**
 * Touch controls: drag anywhere on the left half for a virtual joystick;
 * tap the right half to walk there (or interact when the tile is usable);
 * two-finger pinch zooms the camera; on-screen attack button. Buttons
 * only appear on coarse-pointer devices.
 */
export function setupTouch(
  input: InputManager,
  game: ClientGame,
  renderer: Renderer,
  canvas: HTMLCanvasElement,
  onInteractTap: (tx: number, ty: number) => boolean,
  onZoomChange?: () => void,
): void {
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  if (!isTouchDevice) return;
  document.getElementById('touch-controls')?.classList.remove('hidden');

  let joyId: number | null = null;
  let joyOrigin = { x: 0, y: 0 };
  const JOY_RADIUS = 60;

  // Non-joystick touches by id — two of them at once is a pinch.
  const freeTouches = new Map<number, { x: number; y: number }>();
  // Taps are deferred a beat so a second finger can turn them into a
  // pinch instead of a spurious walk order.
  let pendingTap: number | null = null;
  let pinch: { dist: number; zoom: number } | null = null;

  const freeDist = (): number => {
    const pts = Array.from(freeTouches.values());
    return Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
  };

  canvas.addEventListener(
    'touchstart',
    (e) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.clientX < window.innerWidth * 0.45 && joyId === null) {
          joyId = t.identifier;
          joyOrigin = { x: t.clientX, y: t.clientY };
        } else {
          freeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
          if (freeTouches.size >= 2) {
            // Second finger down: this is a pinch, not a tap.
            if (pendingTap !== null) {
              window.clearTimeout(pendingTap);
              pendingTap = null;
            }
            pinch = { dist: freeDist(), zoom: renderer.camera.targetZoom };
          } else {
            const { clientX, clientY } = t;
            pendingTap = window.setTimeout(() => {
              pendingTap = null;
              // Right-side tap: interact if usable, otherwise walk
              // there. pickWorld, not the flat inverse — a tap on a
              // plateau, ramp, or dock deck must land on that surface.
              const w = renderer.pickWorld(clientX, clientY);
              const tx = Math.floor(w.x);
              const ty = Math.floor(w.y);
              if (!onInteractTap(tx, ty)) game.walkTo(tx, ty);
            }, 130);
          }
        }
      }
      e.preventDefault();
    },
    { passive: false },
  );

  canvas.addEventListener(
    'touchmove',
    (e) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === joyId) {
          const dx = t.clientX - joyOrigin.x;
          const dy = t.clientY - joyOrigin.y;
          const len = Math.hypot(dx, dy);
          const clamped = Math.min(1, len / JOY_RADIUS);
          input.touchMoveX = len > 8 ? (dx / len) * clamped : 0;
          input.touchMoveY = len > 8 ? (dy / len) * clamped : 0;
        } else if (freeTouches.has(t.identifier)) {
          freeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
        }
      }
      if (pinch && freeTouches.size >= 2) {
        renderer.camera.setZoom((pinch.zoom * freeDist()) / pinch.dist);
        onZoomChange?.();
      }
      e.preventDefault();
    },
    { passive: false },
  );

  const endTouch = (e: TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === joyId) {
        joyId = null;
        input.touchMoveX = 0;
        input.touchMoveY = 0;
      }
      freeTouches.delete(t.identifier);
    }
    if (freeTouches.size < 2) pinch = null;
  };
  canvas.addEventListener('touchend', endTouch);
  canvas.addEventListener('touchcancel', endTouch);

  // On-screen buttons.
  const attackBtn = document.getElementById('touch-attack');
  attackBtn?.addEventListener('pointerdown', (e) => {
    input.touchAttack = true;
    e.preventDefault();
  });
  attackBtn?.addEventListener('pointerup', () => (input.touchAttack = false));
  attackBtn?.addEventListener('pointercancel', () => (input.touchAttack = false));
}
