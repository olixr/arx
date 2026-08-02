/**
 * GHOST WALK — Map Studio v2 Phase 6. Press Q and a real player body
 * drops at the view's center; WASD steers it through the TRUE
 * collision of the stage's chunks (walls stop you, water wades you —
 * the shared stepMovement, the game's own law); the camera follows.
 * The Mario-Maker instant feel-check, without leaving the bench.
 * Not a server session: nothing spawns, nothing saves, Esc or Q ends.
 */

import { EntityKind, PLAYER_SPEED, stepMovement } from '@arx/shared';
import { InterpBuffer } from '../net/interpolation.js';
import { toast } from '../studio2/kit.js';
import type { StagePeople } from './people.js';
import type { EditorStage } from './stage.js';
import type { Viewport } from './viewport.js';

export const GHOST_EID = 900_000;

export class GhostWalk {
  active = false;
  private x = 0;
  private y = 0;
  private readonly held = new Set<string>();
  private lastMs = 0;

  constructor(
    private readonly stage: EditorStage,
    private readonly viewport: Viewport,
    private readonly people: StagePeople,
    private readonly getZoneOrigin: () => { x: number; y: number },
  ) {}

  toggle(): void {
    if (this.active) this.end();
    else this.begin();
  }

  begin(): void {
    if (!this.viewport.trueView) {
      toast('ghost walk needs the true viewport — flip off draft first', 3600);
      return;
    }
    const o = this.getZoneOrigin();
    this.x = o.x + this.viewport.centerX;
    this.y = o.y + this.viewport.centerY;
    this.active = true;
    this.held.clear();
    this.lastMs = 0;
    this.people.external.add(GHOST_EID);
    const game = this.stage.game;
    game.entities.set(GHOST_EID, {
      meta: {
        eid: GHOST_EID,
        kind: EntityKind.Player,
        x: this.x,
        y: this.y,
        name: 'Ghost',
        appearance: { bodyColor: '', equip: {} },
      },
      buffer: new InterpBuffer(),
    });
    toast('ghost walk — WASD moves · walls are real · Q or Esc returns to the bench', 4600);
  }

  end(): boolean {
    if (!this.active) return false;
    this.active = false;
    this.held.clear();
    this.people.external.delete(GHOST_EID);
    this.stage.game.entities.delete(GHOST_EID);
    toast('the ghost rests');
    return true;
  }

  /** WASD while walking; true = the key was ours (swallow it). */
  keydown(code: string): boolean {
    if (!this.active) return false;
    if (code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD') {
      this.held.add(code);
      return true;
    }
    return false;
  }

  keyup(code: string): void {
    this.held.delete(code);
  }

  /** Per-frame: the shared movement law over the stage's chunks. */
  update(nowMs: number): void {
    if (!this.active) return;
    const dt = this.lastMs > 0 ? Math.min(0.05, (nowMs - this.lastMs) / 1000) : 0.016;
    this.lastMs = nowMs;
    const mx = (this.held.has('KeyD') ? 1 : 0) - (this.held.has('KeyA') ? 1 : 0);
    const my = (this.held.has('KeyS') ? 1 : 0) - (this.held.has('KeyW') ? 1 : 0);
    if (mx !== 0 || my !== 0) {
      const next = stepMovement({ x: this.x, y: this.y }, { mx, my }, PLAYER_SPEED, dt, this.stage.game.world);
      this.x = next.x;
      this.y = next.y;
    }
    const ent = this.stage.game.entities.get(GHOST_EID);
    if (ent) {
      ent.meta.x = this.x;
      ent.meta.y = this.y;
      ent.meta.dir = mx !== 0 || my !== 0 ? Math.atan2(my, mx) : ent.meta.dir;
    }
    // The camera walks with the ghost.
    const o = this.getZoneOrigin();
    this.viewport.centerOn(this.x - o.x, this.y - o.y);
  }
}
