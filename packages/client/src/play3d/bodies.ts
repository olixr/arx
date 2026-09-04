/**
 * THE LIVING STAND UP (play3d S2) — ClientGame's entities as billboards.
 *
 * Every frame the stage walks `game.entities`, samples each body on
 * the same timeline the 2D client renders at (`game.renderTime()`
 * through the interp buffer's smoothed sample — one law, both doors),
 * derives its BodyKind from the meta (players and named townsfolk
 * broadcast an appearance; the bestiary paints from its def), and
 * hands the card its state. Bodies that left the set are disposed the
 * frame they vanish; the own body rides the predictor's render
 * position with `game.aim` for its facing, exactly like main.ts.
 *
 * What stands: Player, Npc (humanoid or beast). Not yet: ItemDrop,
 * ResourceNode, Prop, Projectile, BuildSite (the S2 ledger — props
 * are Workstream 2's PropKind registry; drops/projectiles are FX
 * lanes). Dead bodies (hp 0 / Dead / Lie) are hidden, not ragdolled.
 */
import * as THREE from 'three';
import { CLOTH_COLORS, EntityKind, PoseState, type EntityId, type EntityMeta } from '@arx/shared';
import { npcDef } from '@arx/content';
import type { ClientGame, RemoteEntity } from '../game/clientGame.js';
import { playerColor } from '../render/playerColors.js';
import { humanoidMonsterSize, isHumanoidMonster } from '../render/npcRoster.js';
import type { BillboardClock, BillboardFactory } from './billboard.js';
import { EntityBillboard, type BodyKind, type BodyState, type HumanoidKind } from './entityBillboard.js';

interface BodyRec {
  sprite: EntityBillboard;
  state: BodyState;
  kind: BodyKind;
  seen: number;
  /**
   * THE KIT IS DERIVED ONCE PER META: ClientGame replaces `meta`
   * wholesale on every update, so the meta object's identity (plus the
   * two collar facts that ride it) is the kind's cache key — no
   * per-frame kind objects, no per-frame kindKey strings.
   */
  metaRef: EntityMeta;
  stock: boolean;
  owned: boolean;
}

const DEAD = new Set<number>([PoseState.Dead, PoseState.Lie]);
/** The own body has no remote meta; its kit is cached in ownKindFor. */
const OWN_META: EntityMeta = { eid: 0, kind: EntityKind.Player, x: 0, y: 0 };

export class EntityStage {
  private readonly recs = new Map<EntityId, BodyRec>();
  private own: BodyRec | null = null;
  private ownEquipSrc: unknown = null;
  private ownKind: HumanoidKind | null = null;
  private readonly fallback = { x: 0, y: 0, dir: 0, pose: 0, hpPct: 255, status: 0, alert: 0 };
  /** Confession. */
  bodies = 0;
  paints = 0;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly clock: BillboardClock,
    private readonly billboards: BillboardFactory,
    private readonly groundY: (wx: number, wy: number) => number,
  ) {}

  private humanoidFromAppearance(meta: EntityMeta, eid: EntityId): HumanoidKind {
    const ap = meta.appearance!;
    const eq = ap.equip ?? {};
    return {
      body: 'humanoid',
      isOwn: false,
      bodyColor: ap.look ? CLOTH_COLORS[ap.look.shirt]! : meta.kind === EntityKind.Player ? playerColor(meta.name ?? String(eid)) : '#c8b89a',
      look: ap.look,
      capeId: eq.cape,
      weaponItem: eq.weapon,
      headItem: eq.head,
      bodyItem: eq.body,
      legsItem: eq.legs,
      bootsItem: eq.boots,
      glovesItem: eq.gloves,
      offhandItem: eq.offhand,
      carryStyle: ap.carry,
      carryOff: ap.carryOff,
    };
  }

  private kindFor(remote: RemoteEntity, eid: EntityId): BodyKind | null {
    const meta = remote.meta;
    if (meta.kind === EntityKind.Player) {
      if (!meta.appearance) return { body: 'humanoid', isOwn: false, bodyColor: playerColor(meta.name ?? String(eid)) };
      return this.humanoidFromAppearance(meta, eid);
    }
    if (meta.kind !== EntityKind.Npc) return null;
    if (meta.appearance) return this.humanoidFromAppearance(meta, eid);
    const defId = meta.defId ?? '';
    const def = npcDef(defId);
    if (isHumanoidMonster(defId)) {
      return { body: 'humanoid', isOwn: false, bodyColor: def?.color ?? '#999', size: humanoidMonsterSize(defId) };
    }
    return {
      body: 'beast',
      defId,
      radius: def?.radius ?? 0.3,
      color: def?.color ?? '#999',
      speed: def?.speed ?? 2,
      collar: meta.stock ? '#8a6234' : meta.ownerEid !== undefined && !meta.company ? '#6e4a26' : undefined,
    };
  }

  private ownKindFor(game: ClientGame): HumanoidKind {
    // Equipment is replaced wholesale on the wire; the look and the two
    // grip styles mutate in place (setCarryStyle), so they are compared.
    const k = this.ownKind;
    if (
      k &&
      this.ownEquipSrc === game.equipment &&
      k.look === (game.ownLook ?? undefined) &&
      k.carryStyle === game.carryStyle &&
      k.carryOff === game.carryOff
    ) {
      return k;
    }
    const eq = game.equipment;
    const id = (slot: string): string | undefined => eq[slot]?.id;
    this.ownEquipSrc = game.equipment;
    this.ownKind = {
      body: 'humanoid',
      isOwn: true,
      bodyColor: game.ownLook ? CLOTH_COLORS[game.ownLook.shirt]! : playerColor(game.ownName),
      look: game.ownLook ?? undefined,
      capeId: id('cape'),
      weaponItem: id('weapon'),
      headItem: id('head'),
      bodyItem: id('body'),
      legsItem: id('legs'),
      bootsItem: id('boots'),
      glovesItem: id('gloves'),
      offhandItem: id('offhand'),
      carryStyle: game.carryStyle,
      carryOff: game.carryOff,
    };
    return this.ownKind;
  }

  private make(kind: BodyKind, seed: number, meta: EntityMeta): BodyRec {
    const sprite = new EntityBillboard(kind, this.clock, this.billboards, seed);
    this.scene.add(sprite.mesh);
    return {
      sprite,
      kind,
      seen: 0,
      state: { x: 0, y: 0, groundY: 0, dir: 0, pose: 0, hurt: false },
      metaRef: meta,
      stock: meta.stock === true,
      owned: meta.ownerEid !== undefined,
    };
  }

  private static kitMoved(rec: BodyRec, meta: EntityMeta): boolean {
    return rec.metaRef !== meta || rec.stock !== (meta.stock === true) || rec.owned !== (meta.ownerEid !== undefined);
  }

  private drop(rec: BodyRec): void {
    this.scene.remove(rec.sprite.mesh);
    rec.sprite.dispose();
  }

  /** One frame: sync the set to the game, advance and paint what is visible. */
  update(game: ClientGame, dt: number, nowMs: number, camYaw: number, frustum: THREE.Frustum): void {
    const t = game.renderTime();
    // Remote bodies.
    for (const [eid, remote] of game.entities) {
      if (eid === game.ownEid) continue;
      const meta = remote.meta;
      let rec = this.recs.get(eid);
      if (!rec) {
        const kind = this.kindFor(remote, eid);
        if (kind === null) continue;
        rec = this.make(kind, eid, meta);
        this.recs.set(eid, rec);
      } else if (EntityStage.kitMoved(rec, meta)) {
        const kind = this.kindFor(remote, eid);
        if (kind === null) continue; // it stopped being a body; dropped below
        rec.metaRef = meta;
        rec.stock = meta.stock === true;
        rec.owned = meta.ownerEid !== undefined;
        rec.kind = kind;
        rec.sprite.setKind(kind);
      }
      rec.seen = nowMs;
      const s = remote.buffer.sampleSmoothed(t) ?? this.fallbackFor(remote.meta);
      const dead = s.hpPct === 0 || DEAD.has(s.pose);
      rec.sprite.mesh.visible = !dead;
      if (dead) continue;
      const st = rec.state;
      st.x = s.x;
      st.y = s.y;
      st.groundY = this.groundY(s.x, s.y);
      st.dir = s.dir;
      st.pose = s.pose;
      st.hurt = (remote.hurtUntil ?? 0) > nowMs;
      st.name = remote.meta.name;
      st.level = remote.meta.kind === EntityKind.Npc ? remote.meta.level : undefined;
      const tint = remote.meta.kind === EntityKind.Npc ? game.repTintFor(remote.meta.actor, remote.meta.defId) : null;
      st.nameInk =
        remote.meta.ownerEid !== undefined ? '#9fd39a' : tint === 'hostile' ? '#f0655a' : tint === 'peace' ? '#9db7d6' : undefined;
      const visible = frustum.intersectsSphere(rec.sprite.mesh.geometry.boundingSphere!);
      if (rec.sprite.update(st, dt, nowMs, camYaw, visible)) this.paints++;
    }
    for (const [eid, rec] of this.recs) {
      if (rec.seen !== nowMs) {
        this.drop(rec);
        this.recs.delete(eid);
      }
    }
    // The own body.
    if (game.ownEid !== null) {
      const kind = this.ownKindFor(game);
      if (!this.own) this.own = this.make(kind, 7, OWN_META);
      else if (this.own.kind !== kind) {
        this.own.kind = kind;
        this.own.sprite.setKind(kind);
      }
      const own = game.predictor.renderPos();
      const st = this.own.state;
      st.x = own.x;
      st.y = own.y;
      st.groundY = this.groundY(own.x, own.y);
      st.dir = game.aim;
      st.pose = game.effectiveOwnPose(nowMs);
      st.hurt = game.ownHurtUntil > nowMs;
      st.name = game.ownName;
      this.own.sprite.mesh.visible = true;
      const visible = frustum.intersectsSphere(this.own.sprite.mesh.geometry.boundingSphere!);
      if (this.own.sprite.update(st, dt, nowMs, camYaw, visible)) this.paints++;
    } else if (this.own) {
      this.drop(this.own);
      this.own = null;
    }
    this.bodies = this.recs.size + (this.own ? 1 : 0);
  }

  private fallbackFor(meta: EntityMeta): typeof this.fallback {
    const f = this.fallback;
    f.x = meta.x;
    f.y = meta.y;
    f.dir = meta.dir ?? 0;
    f.pose = PoseState.Idle;
    f.hpPct = 255;
    return f;
  }

  /** Drop every body (plane crossing / sign-out). */
  reset(): void {
    for (const rec of this.recs.values()) this.drop(rec);
    this.recs.clear();
    if (this.own) {
      this.drop(this.own);
      this.own = null;
    }
    this.bodies = 0;
  }

  dispose(): void {
    this.reset();
  }
}
