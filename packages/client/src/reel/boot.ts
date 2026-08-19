import type { ClientGame } from '../game/clientGame.js';
import type { InputManager } from '../input/inputManager.js';
import type { Renderer } from '../render/renderer.js';
import { Director, type Deps } from './director.js';
import type { TakeStats } from './recorder.js';
import { SHOTS, shotById } from './shots.js';

/**
 * THE REEL ROOM's door.
 *
 * Loaded only when `?reel` is on the URL, and dynamically, so a player
 * never downloads a byte of it. Everything the capture lane needs hangs
 * off `window.__reel`: start a shot, ask how it is going, take the
 * bytes. The lane holds no knowledge of the game — it drives this.
 */

export interface ReelBridge {
  ready: true;
  shots: string[];
  /** The whole slate as data — the capture lane reads the roster from
   *  the page rather than importing across package roots, so there is
   *  exactly one list of shots in the repository and it lives here. */
  slate: unknown;
  begin(id: string): void;
  status(): {
    phase: string;
    note: string;
    done: boolean;
    error: string;
    bytes: number;
    stats: TakeStats | null;
  };
  read(offset: number, length: number): string;
  release(): void;
}

export function bootReel(deps: {
  game: ClientGame;
  renderer: Renderer;
  input: InputManager;
}): void {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const d: Deps = { ...deps, canvas };
  let director: Director | null = null;
  let stats: TakeStats | null = null;
  let error = '';
  let done = false;

  const bridge: ReelBridge = {
    ready: true,
    shots: SHOTS.map((s) => s.id),
    slate: SHOTS.map((s) => ({
      id: s.id,
      title: s.title,
      caption: s.caption,
      pillar: s.pillar,
      cast: s.cast,
      seconds: s.seconds,
      fps: s.fps ?? 30,
      hud: s.hud,
      poster: s.poster ?? null,
      loop: s.loop ?? false,
      hero: s.hero ?? false,
    })),
    begin(id) {
      const shot = shotById(id);
      if (!shot) {
        error = `no shot named ${id}`;
        done = true;
        return;
      }
      done = false;
      error = '';
      stats = null;
      director = new Director(d);
      void (async () => {
        try {
          await director!.stage(shot);
          stats = await director!.perform(shot);
        } catch (e) {
          error = e instanceof Error ? `${e.message}\n${e.stack ?? ''}` : String(e);
          director!.phase = 'error';
        } finally {
          // The puppet always lets go, take or no take — a wedged
          // director would leave a body walking into a wall forever.
          director!.release();
          done = true;
        }
      })();
    },
    status: () => ({
      phase: director?.phase ?? 'idle',
      note: director?.note ?? '',
      done,
      error,
      bytes: director?.recorder?.bytes ?? 0,
      stats,
    }),
    read: (offset, length) => director?.recorder?.read(offset, length) ?? '',
    release: () => director?.release(),
  };

  (window as unknown as Record<string, unknown>).__reel = bridge;
}
