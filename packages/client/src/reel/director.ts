import { EntityKind } from '@arx/shared';
import { npcActor } from '@arx/content';
import type { ClientGame } from '../game/clientGame.js';
import type { InputManager } from '../input/inputManager.js';
import type { Renderer } from '../render/renderer.js';
import { CamRig } from './camera.js';
import { Puppet } from './puppet.js';
import { Recorder, type TakeStats } from './recorder.js';
import { dressStage, undressStage } from './stage.js';
import { reel } from './state.js';
import type { Beat, Shot, StageStep } from './types.js';

/**
 * THE DIRECTOR — one shot, start to finish.
 *
 * Two clocks, deliberately separate. The STAGE clock is wall time and
 * nobody watches it: teleports, gear, the mob line-up, the walk to the
 * mark. The PERFORMANCE clock starts at the first recorded frame and
 * every beat is written against it, so the cut points in the shot file
 * are the cut points in the file that ships.
 *
 * Beats fire on the render frame, not on a timer. A `setTimeout` beat
 * would land between two presented frames and a one-frame error at the
 * moment a greatsword lands is the difference between a shot and a
 * mistake.
 */

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Past this, a body is scenery, not the thing being fought. */
const FOE_RADIUS = 26;

export interface Deps {
  game: ClientGame;
  renderer: Renderer;
  input: InputManager;
  canvas: HTMLCanvasElement;
}

export class Director {
  private readonly puppet: Puppet;
  private readonly rig: CamRig;
  readonly marks: Record<string, number> = {};
  /** Progress the driver polls while the lane waits. */
  phase: 'idle' | 'staging' | 'settling' | 'rolling' | 'done' | 'error' = 'idle';
  note = '';
  recorder: Recorder | null = null;

  constructor(private readonly d: Deps) {
    this.puppet = new Puppet(d.game, d.input);
    this.rig = new CamRig(d.renderer);
  }

  /**
   * Every live FOE, nearest first.
   *
   * The filter matters more than it looks. The game's aim-assist roster
   * is the honest definition of "a thing you are fighting", and a
   * camera that picks anything looser will, the moment the last
   * juggernaut falls, lock onto a chicken and sail across the village
   * with the shot still rolling. (It did. That is why this is a copy of
   * main.ts's assistMark and not a guess.) The radius is the second
   * half of the same lesson: a foe thirty tiles away is scenery.
   */
  private foes(): Array<{ x: number; y: number; d: number; big: number }> {
    const own = this.d.game.predictor.renderPos();
    const out: Array<{ x: number; y: number; d: number; big: number }> = [];
    for (const remote of this.d.game.entities.values()) {
      const meta = remote.meta;
      if (meta.kind !== EntityKind.Npc) continue;
      if (meta.friendly || meta.stock || meta.ownerEid !== undefined) continue;
      if (meta.actor) {
        const actor = npcActor(meta.actor);
        if (actor && (actor.protection === 'invulnerable' || actor.disposition !== 'hostile')) {
          continue;
        }
      }
      const latest = remote.buffer.latest();
      if (latest && latest.hpPct === 0) continue;
      const x = latest?.x ?? meta.x;
      const y = latest?.y ?? meta.y;
      const d = Math.hypot(x - own.x, y - own.y);
      if (d > FOE_RADIUS) continue;
      out.push({
        x,
        y,
        d,
        // "Biggest" means the one the shot is about: a crown outranks a
        // rank-and-filer, and level stands in for stature.
        big: (meta.boss ? 1000 : 0) + (meta.level ?? 0),
      });
    }
    out.sort((a, b) => a.d - b.d);
    return out;
  }

  private pickFoe(pick: 'nearest' | 'biggest' = 'nearest'): { x: number; y: number } | null {
    const all = this.foes();
    if (!all.length) return null;
    if (pick === 'nearest') return all[0]!;
    return all.reduce((a, b) => (b.big > a.big ? b : a));
  }

  /** THE PRE-ROLL. Wall-clock, unwatched, allowed to be slow. */
  async stage(shot: Shot): Promise<void> {
    this.phase = 'staging';
    reel.driving = true;
    dressStage(shot.hud);
    // The DOM chrome and the canvas chrome are two different rooms with
    // one light switch: the shot's dress sets both.
    this.d.renderer.chrome = shot.hud === 'play' ? 'all' : shot.hud === 'drama' ? 'drama' : 'none';
    for (const step of shot.stage) {
      this.note = describe(step);
      await this.runStage(step);
    }
    this.note = 'settling';
    this.phase = 'settling';
    // The world needs a beat to answer: chunks bake, herds walk in,
    // grass stands up, the day grade settles on the new hour. Rolling
    // before that is how a reel gets a pop of terrain in frame one.
    await sleep(1400);
  }

  private async runStage(step: StageStep): Promise<void> {
    const g = this.d.game;
    switch (step.k) {
      case 'cmd':
        g.sendChat(step.text);
        // The server's chat bucket refills at 1/s; a pre-roll never
        // races it, because a swallowed `/give` is a shot with no sword.
        await sleep(1150);
        return;
      case 'at': {
        // Ask, then look. Four nudges out from the mark, then give up
        // loudly — a shot in the wrong meadow is a wasted morning.
        const spots = [
          [step.x, step.y],
          [step.x + 2, step.y],
          [step.x - 2, step.y],
          [step.x, step.y + 2],
          [step.x, step.y - 2],
        ];
        for (const [x, y] of spots) {
          g.sendChat(`/tp ${Math.round(x!)} ${Math.round(y!)}`);
          await sleep(1150);
          const p = g.predictor.renderPos();
          if (Math.hypot(p.x - step.x, p.y - step.y) <= 6) return;
        }
        throw new Error(
          `the mark at ${step.x},${step.y} is unreachable — /tp found no walkable tile`,
        );
      }
      case 'wait':
        await sleep(step.ms);
        return;
      case 'tech':
        g.sendTechnique(step.ability, step.slot ?? 0);
        await sleep(400);
        return;
      case 'equip': {
        let idx = g.inventory.findIndex((s) => s && s.item === step.item);
        if (idx < 0) {
          g.sendChat(`/give ${step.item} 1`);
          await sleep(1150);
          idx = g.inventory.findIndex((s) => s && s.item === step.item);
        }
        if (idx >= 0) {
          g.useSlot(idx, step.stow ?? false);
          await sleep(500);
        }
        return;
      }
      case 'interact': {
        g.interact(Math.floor(step.x), Math.floor(step.y));
        await sleep(1200);
        return;
      }
      case 'walk': {
        this.puppet.goto(step.x, step.y, 1, 0.5);
        const until = performance.now() + (step.timeout ?? 20000);
        while (!this.puppet.arrived && performance.now() < until) {
          this.puppet.step(performance.now());
          await sleep(33);
        }
        this.puppet.move(0, 0);
        await sleep(250);
        return;
      }
    }
  }

  /** THE PERFORMANCE. Frame-locked, recorded, exactly `seconds` long. */
  async perform(shot: Shot): Promise<TakeStats> {
    const fps = shot.fps ?? 30;
    const rec = new Recorder(this.d.canvas, fps);
    this.recorder = rec;
    const beats: Beat[] = [...shot.beats].sort((a, b) => a.at - b.at);
    let next = 0;
    const durationMs = shot.seconds * 1000;

    // The camera takes the stage one frame before the tape rolls, so
    // frame one is already composed — no snap on the first present.
    this.stepRig(0);
    rec.start();
    this.phase = 'rolling';
    const t0 = performance.now();
    let last = t0;

    await new Promise<void>((done) => {
      const frame = (now: number) => {
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        const t = now - t0;
        while (next < beats.length && beats[next]!.at <= t) {
          this.act(beats[next]!.do, now, t);
          next++;
        }
        // THE SNAP IS THE TELL. A death is over in a frame — the body
        // is on the respawn stone before `ownHpPct` has been read twice
        // — but the TELEPORT it leaves behind is unmistakable, and the
        // camera dutifully following the corpse home is exactly the
        // failure this catches.
        {
          const p = this.d.game.predictor.renderPos();
          if (this.lastPos && Math.hypot(p.x - this.lastPos.x, p.y - this.lastPos.y) > 8) {
            this.died = true;
          }
          this.lastPos = { x: p.x, y: p.y };
          if (this.d.game.ownHpPct === 0) this.died = true;
        }
        this.steerChase();
        this.puppet.step(now);
        this.stepRig(dt);
        rec.note(dt);
        if (t >= durationMs) {
          done();
          return;
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });

    await rec.stop();
    this.phase = 'done';
    const stats = rec.stats(this.puppet.overspend, this.marks, this.died);
    return stats;
  }

  /**
   * THE CHASE. A fight is two bodies negotiating a distance, and the
   * distance changes every frame — so closing on a foe is a per-frame
   * decision, never a walk vector written in the shot file.
   */
  private steerChase(): void {
    const c = this.chase;
    if (!c) return;
    const foe = this.pickFoe(c.pick);
    if (!foe) return;
    const p = this.d.game.predictor.renderPos();
    const dx = foe.x - p.x;
    const dy = foe.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    reel.aim = Math.atan2(dy, dx);
    if (c.away) {
      this.puppet.move((-dx / d) * c.speed, (-dy / d) * c.speed);
      return;
    }
    if (d <= c.within) {
      this.puppet.move(0, 0);
      return;
    }
    // Ease the last stride so an arrival settles instead of stamping.
    const pace = c.speed * Math.min(1, Math.max(0.3, (d - c.within) / 1.5));
    this.puppet.move((dx / d) * pace, (dy / d) * pace);
  }

  private stepRig(dt: number): void {
    const p = this.d.game.predictor.renderPos();
    const aim = reel.aim ?? this.d.game.aim;
    this.rig.step(dt, { x: p.x, y: p.y, aim }, this.pickFoe(this.foePick));
  }

  private foePick: 'nearest' | 'biggest' = 'nearest';
  /** THE PERFORMER WENT DOWN. A death mid-take respawns the body at the
   *  town waystone, and the camera dutifully follows it there — which
   *  is how a boss reel ends in a market square. Watched every frame,
   *  reported, and never quietly shipped. */
  private died = false;
  private lastPos: { x: number; y: number } | null = null;
  /** A live closeOn/backOff: re-steered every frame while it stands. */
  private chase: { pick: 'nearest' | 'biggest'; within: number; speed: number; away: boolean } | null =
    null;

  private act(a: Beat['do'], now: number, t: number): void {
    const P = this.puppet;
    switch (a.k) {
      case 'move':
        this.chase = null;
        P.move(a.x, a.y);
        break;
      case 'closeOn':
        this.foePick = a.pick ?? 'nearest';
        this.chase = {
          pick: this.foePick,
          within: a.within ?? 1.6,
          speed: a.speed ?? 1,
          away: false,
        };
        break;
      case 'backOff':
        this.foePick = a.pick ?? 'nearest';
        this.chase = { pick: this.foePick, within: 0, speed: a.speed ?? 0.8, away: true };
        break;
      case 'goto': P.goto(a.x, a.y, a.speed ?? 1, a.within ?? 0.4); break;
      case 'face': P.lookAt(a.x, a.y); break;
      case 'faceFoe': {
        this.foePick = a.pick ?? 'nearest';
        const f = this.pickFoe(this.foePick);
        if (f) P.lookAt(f.x, f.y);
        break;
      }
      case 'aim': P.look(a.rad); break;
      case 'aimFree': P.lookFree(); break;
      case 'press': P.press(a.btn, a.ms, now); break;
      case 'cmd': P.cmd(a.text, now); break;
      case 'use': this.d.game.interact(Math.floor(a.x), Math.floor(a.y)); break;
      case 'cam':
        if (a.move.k === 'followFoe') this.foePick = a.move.pick ?? 'nearest';
        this.rig.set(a.move);
        break;
      case 'handheld': this.rig.handheld = a.amount; break;
      case 'shake': this.d.renderer.shake(a.amount); break;
      case 'pulse': this.d.renderer.zoomPulse(a.amount ?? 0.045); break;
      case 'mark': this.marks[a.name] = Math.round(t) / 1000; break;
    }
  }

  /** Hand the game back: no puppet, no borrowed camera, no dress. */
  release(): void {
    this.d.renderer.chrome = 'all';
    this.puppet.release();
    this.rig.release();
    undressStage();
    reel.driving = false;
    reel.aim = null;
  }
}

function describe(step: StageStep): string {
  switch (step.k) {
    case 'cmd': return step.text;
    case 'at': return `stand at ${step.x},${step.y}`;
    case 'equip': return `equip ${step.item}`;
    case 'tech': return `seat ${step.ability}`;
    case 'wait': return `wait ${step.ms}ms`;
    case 'walk': return `walk to ${step.x},${step.y}`;
    case 'interact': return `use ${step.x},${step.y}`;
  }
}
