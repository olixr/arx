import type { InputManager } from './inputManager.js';
import type { ClientGame } from '../game/clientGame.js';
import type { Renderer } from '../render/renderer.js';

/**
 * Touch controls: drag anywhere on the left half for a virtual joystick;
 * tap the right half to walk there (or interact when the tile is usable);
 * on-screen attack button. Buttons only appear on coarse-pointer devices.
 */
export function setupTouch(
  input: InputManager,
  game: ClientGame,
  renderer: Renderer,
  canvas: HTMLCanvasElement,
  onInteractTap: (tx: number, ty: number) => boolean,
): void {
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  if (!isTouchDevice) return;
  document.getElementById('touch-controls')?.classList.remove('hidden');

  let joyId: number | null = null;
  let joyOrigin = { x: 0, y: 0 };
  const JOY_RADIUS = 60;

  canvas.addEventListener(
    'touchstart',
    (e) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.clientX < window.innerWidth * 0.45 && joyId === null) {
          joyId = t.identifier;
          joyOrigin = { x: t.clientX, y: t.clientY };
        } else {
          // Right-side tap: interact if usable, otherwise walk there.
          const w = renderer.camera.screenToWorld(
            t.clientX,
            t.clientY,
            canvas.clientWidth,
            canvas.clientHeight,
          );
          const tx = Math.floor(w.x);
          const ty = Math.floor(w.y);
          if (!onInteractTap(tx, ty)) game.walkTo(tx, ty);
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
        }
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
    }
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
