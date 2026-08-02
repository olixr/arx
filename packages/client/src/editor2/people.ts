/**
 * THE PEOPLE OF THE STAGE — Map Studio v2 Phase 3. Every placement
 * synthesizes a REAL entity: actors wear their true look and worn
 * gear through the server's own actorAppearance composition; creature
 * clusters scatter deterministic bodies inside their wander rings;
 * routine-bound actors stand exactly where their day puts them at the
 * scrubbed hour (scrub the clock and the town watch changes shift).
 *
 * Bodies ride the renderer's no-sample fallback — meta.x/y/dir is the
 * position, mutated in place each frame, so LIVING MODE walking gets
 * its gait from the renderer's own frame-delta animation. Clusters
 * outside their hours window leave the entity set and ghost at 25%
 * in the overlay instead — AUTHORED IS ALWAYS VISIBLE, never gone.
 *
 * Position truth only in this phase: work/sit/lie stops stand their
 * bodies at the stop (pose fidelity rides a later phase).
 */

import { EntityKind, type EntityMeta } from '@arx/shared';
import {
  NPCS,
  NPC_ACTORS,
  ROUTINES,
  actorAppearance,
  type NpcActorDef,
  type ZoneDef,
  type ZoneSpawn,
} from '@arx/content';
import { creatureRender } from '../cms/gameRender.js';
import { InterpBuffer } from '../net/interpolation.js';
import type { RemoteEntity } from '../game/clientGame.js';
import { hoursContain, routinePoseAt } from './routines.js';
import type { EditorStage } from './stage.js';

/** Actor bodies start here; cluster bodies at CLUSTER_EID_BASE. */
const ACTOR_EID_BASE = 100_000;
const CLUSTER_EID_BASE = 500_000;
const MAX_BODIES_PER_CLUSTER = 12;

interface OverlayHelpers {
  ctx: CanvasRenderingContext2D;
  sx: (lx: number) => number;
  sy: (ly: number) => number;
  s: number;
  ys: number;
}

export class StagePeople {
  /** LIVING MODE: paths walk in real time; off = the settled hour frame. */
  living = false;
  /** DB-first actor defs (fetched); bundle registry stands in offline. */
  private actorDefs: ReadonlyMap<string, NpcActorDef> = NPC_ACTORS;
  private stale = true;
  private readonly ghostSprites = new Map<string, HTMLCanvasElement>();
  private liveT0 = performance.now();

  constructor(
    private readonly stage: EditorStage,
    private readonly getZone: () => ZoneDef,
  ) {}

  adoptActorDefs(defs: ReadonlyMap<string, NpcActorDef>): void {
    this.actorDefs = defs;
    this.stale = true;
  }

  markStale(): void {
    this.stale = true;
  }

  actorDef(slug: string): NpcActorDef | undefined {
    return this.actorDefs.get(slug);
  }

  /**
   * The motion parameter: LIVING MODE walks real seconds; the still
   * frame derives a deterministic parameter from the scrubbed hour so
   * dragging the clock advances every round through its legs.
   */
  private timeParam(): number {
    if (this.living) return (performance.now() - this.liveT0) / 1000;
    return this.stage.hours * 240; // a quarter-hour scrub ≈ one minute of round
  }

  /** Deterministic scatter inside a cluster ring (golden-angle spiral). */
  private scatter(sp: { x: number; y: number; radius: number }, k: number, count: number): { x: number; y: number } {
    if (sp.radius <= 0 || count === 1) return { x: sp.x + 0.5, y: sp.y + 0.5 };
    const golden = 2.399963;
    const seed = ((sp.x * 31 + sp.y * 17) % 7) * 0.71;
    const r = sp.radius * Math.sqrt((k + 0.55) / count);
    const a = seed + k * golden;
    return { x: sp.x + 0.5 + Math.cos(a) * r, y: sp.y + 0.5 + Math.sin(a) * r };
  }

  /** Cluster body positions at the current hour (patrol walks its loop). */
  private clusterBodies(sp: ZoneSpawn): Array<{ x: number; y: number; dir: number; moving: boolean }> {
    const n = Math.min(MAX_BODIES_PER_CLUSTER, sp.count);
    const out: Array<{ x: number; y: number; dir: number; moving: boolean }> = [];
    if (sp.patrol && sp.patrol.length >= 2 && sp.count === 1) {
      // A patrol cluster's single body walks its waypoint loop.
      const pose = routinePoseAt(
        {
          id: '__patrol',
          base: {
            kind: 'path',
            mode: 'loop',
            waypoints: sp.patrol.map((p) => ({ x: p.x - sp.x, y: p.y - sp.y })),
            speed: 1.6,
          },
        },
        { x: sp.x + 0.5, y: sp.y + 0.5 },
        this.stage.hours,
        this.timeParam(),
      );
      out.push({ x: pose.x, y: pose.y, dir: pose.dir, moving: pose.moving });
      return out;
    }
    for (let k = 0; k < n; k++) {
      const p = this.scatter(sp, k, n);
      out.push({ x: p.x, y: p.y, dir: Math.PI / 2, moving: false });
    }
    return out;
  }

  /**
   * The frame hook: (re)build the entity set when stale, then pose
   * every body for the hour. Mutating meta in place rides the
   * renderer's no-sample fallback; a moving meta animates the gait.
   */
  update(): void {
    const game = this.stage.game;
    const zone = this.getZone();
    const hour = this.stage.hours;
    const t = this.timeParam();

    if (this.stale) {
      game.entities.clear();
      this.stale = false;
    }

    const keep = new Set<number>();

    // ------------------------------------------------------- actors
    (zone.actorSpawns ?? []).forEach((a, i) => {
      const eid = ACTOR_EID_BASE + i;
      const def = this.actorDefs.get(a.actor);
      const routine = a.routine ? ROUTINES.get(a.routine) : undefined;
      const pose = routinePoseAt(routine, { x: a.x + 0.5, y: a.y + 0.5, dir: a.dir }, hour, t);
      let ent = game.entities.get(eid);
      if (!ent) {
        const meta: EntityMeta = {
          eid,
          kind: EntityKind.Npc,
          x: pose.x,
          y: pose.y,
          name: def?.name ?? a.actor,
          ...(def?.title ? { title: def.title } : {}),
          actor: a.actor,
          friendly: def ? def.disposition !== 'hostile' : true,
          ...(def?.combat ? { level: def.combat.level } : {}),
        };
        if (def && def.model.kind === 'creature') {
          meta.defId = def.model.creature;
        } else if (def) {
          meta.appearance = actorAppearance(def) ?? undefined;
        } else {
          // Unknown slug (tool-born, offline): a plain villager body
          // wearing the slug as its name — never invisible.
          meta.appearance = { bodyColor: '', equip: {} };
        }
        ent = { meta, buffer: new InterpBuffer() };
        game.entities.set(eid, ent);
      }
      ent.meta.x = pose.x;
      ent.meta.y = pose.y;
      ent.meta.dir = pose.dir;
      keep.add(eid);
    });

    // ----------------------------------------------------- clusters
    (zone.spawns ?? []).forEach((sp, ci) => {
      const inHours = !sp.hours || hoursContain(sp.hours.from, sp.hours.to, hour);
      if (!inHours) return; // ghosted in the overlay instead
      if (!NPCS.has(sp.npc)) return; // unknown def — markers still tell it
      const bodies = this.clusterBodies(sp);
      bodies.forEach((b, k) => {
        const eid = CLUSTER_EID_BASE + ci * MAX_BODIES_PER_CLUSTER + k;
        let ent: RemoteEntity | undefined = game.entities.get(eid);
        if (!ent) {
          const meta: EntityMeta = {
            eid,
            kind: EntityKind.Npc,
            x: b.x,
            y: b.y,
            defId: sp.npc,
            ...(sp.name ? { name: sp.name } : {}),
            ...(sp.level !== undefined ? { level: sp.level } : {}),
          };
          ent = { meta, buffer: new InterpBuffer() };
          game.entities.set(eid, ent);
        }
        ent.meta.x = b.x;
        ent.meta.y = b.y;
        ent.meta.dir = b.dir;
        keep.add(eid);
      });
    });

    // Placements removed or ghosted this frame leave the stage.
    for (const eid of game.entities.keys()) {
      if (!keep.has(eid)) game.entities.delete(eid);
    }
  }

  // ---------------------------------------------------- the overlay

  private ghostSprite(defId: string, px: number): HTMLCanvasElement | null {
    const size = Math.max(24, Math.min(96, Math.round(px)));
    const key = `${defId}:${size}`;
    const hit = this.ghostSprites.get(key);
    if (hit) return hit;
    const def = NPCS.get(defId);
    if (!def) return null;
    try {
      const sprite = creatureRender(def, size);
      this.ghostSprites.set(key, sprite);
      if (this.ghostSprites.size > 200) this.ghostSprites.clear();
      return sprite;
    } catch {
      return null;
    }
  }

  /**
   * The people plane over the true frame: out-of-hours cluster ghosts
   * at quarter-light with their window told plainly.
   */
  drawGhosts(h: OverlayHelpers): void {
    const zone = this.getZone();
    const hour = this.stage.hours;
    const { ctx } = h;
    (zone.spawns ?? []).forEach((sp) => {
      if (!sp.hours || hoursContain(sp.hours.from, sp.hours.to, hour)) return;
      const bodies = this.clusterBodies(sp);
      ctx.save();
      ctx.globalAlpha = 0.25;
      for (const b of bodies) {
        const sprite = this.ghostSprite(sp.npc, h.s * 1.6);
        if (!sprite) continue;
        const px = h.sx(b.x - zone.origin.x) - sprite.width / 2;
        const py = h.sy(b.y - zone.origin.y) - sprite.height * 0.72;
        ctx.drawImage(sprite, px, py);
      }
      ctx.restore();
      // The window, told at the ring's anchor.
      if (h.s >= 10) {
        const lx = h.sx(sp.x - zone.origin.x + 0.5);
        const ly = h.sy(sp.y - zone.origin.y + 0.5);
        ctx.font = '600 10px ui-monospace, Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const label = `asleep · ${sp.hours.from}–${sp.hours.to}h`;
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(4, 6, 10, 0.7)';
        ctx.fillRect(lx - tw / 2 - 3, ly - 1, tw + 6, 13);
        ctx.fillStyle = 'rgba(233, 236, 243, 0.55)';
        ctx.fillText(label, lx, ly);
      }
    });
  }

  /**
   * THE DAY MADE VISIBLE: the selected actor's routine geometry —
   * the active task lit, off-hour tasks faint; posts, rounds, wander
   * rings, all offset from the post (moving the post moves the day).
   */
  drawRoutineProjection(h: OverlayHelpers, actorIndex: number): void {
    const zone = this.getZone();
    const a = zone.actorSpawns?.[actorIndex];
    if (!a?.routine) return;
    const def = ROUTINES.get(a.routine);
    if (!def) return;
    const hour = this.stage.hours;
    const { ctx } = h;
    const post = { x: a.x + 0.5, y: a.y + 0.5 };
    const lx = (wx: number): number => h.sx(wx - zone.origin.x);
    const ly = (wy: number): number => h.sy(wy - zone.origin.y);

    const tasks = [
      { task: def.base, active: activeIs(def, hour, def.base) },
      ...(def.slots ?? []).map((s) => ({ task: s.task, active: hoursContain(s.from, s.to, hour) && activeIs(def, hour, s.task) })),
    ];
    ctx.save();
    for (const { task, active } of tasks) {
      const alpha = active ? 0.9 : 0.28;
      const ink = active ? 'rgba(94, 155, 245, ' : 'rgba(233, 236, 243, ';
      ctx.strokeStyle = `${ink}${alpha})`;
      ctx.fillStyle = `${ink}${alpha})`;
      ctx.lineWidth = active ? 2 : 1.25;
      if (task.kind === 'post') {
        const px = lx(post.x + (task.x ?? 0));
        const py = ly(post.y + (task.y ?? 0));
        ctx.beginPath();
        ctx.ellipse(px, py, 5, 5 * h.ys, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (task.kind === 'path') {
        const pts = task.waypoints.map((w) => ({ x: lx(post.x + w.x), y: ly(post.y + w.y) }));
        if (pts.length > 0) {
          ctx.setLineDash(active ? [] : [4, 4]);
          ctx.beginPath();
          ctx.moveTo(lx(post.x), ly(post.y));
          for (const p of pts) ctx.lineTo(p.x, p.y);
          if ((task.mode ?? 'loop') === 'loop') ctx.closePath();
          ctx.stroke();
          ctx.setLineDash([]);
          for (const p of pts) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else {
        const cx = lx(post.x + (task.x ?? 0));
        const cy = ly(post.y + (task.y ?? 0));
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.ellipse(cx, cy, task.radius * h.s, task.radius * h.s * h.ys, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }
}

/** Is this the task activeTask would pick (identity compare)? */
function activeIs(def: { base: unknown; slots?: Array<{ from: number; to: number; task: unknown }> }, hour: number, task: unknown): boolean {
  for (const slot of def.slots ?? []) {
    if (hoursContain(slot.from, slot.to, hour)) return slot.task === task;
  }
  return def.base === task;
}
