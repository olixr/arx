import { POS_SCALE } from '../constants.js';
import type { EntityId } from '../entities.js';
import { BinaryMsgType, ByteReader, ByteWriter } from './binary.js';

/** Volatile per-entity state carried at tick rate. */
export interface SnapshotEntity {
  eid: EntityId;
  x: number;
  y: number;
  /** Facing angle in radians. */
  dir: number;
  /** PoseState */
  pose: number;
  /** 0..255 health fraction (255 = full). Non-combatants send 255. */
  hpPct: number;
  /** STATUS_BIT bitfield — burn/chill/shock/bleed VFX flags. */
  status: number;
  /**
   * NPC alert telegraph (ALERT_ICON_*): 0 calm, 1 wary "?",
   * 2 engaged "!", 3 hunting a lost quarry. Players always send 0.
   */
  alert: number;
}

export interface Snapshot {
  serverTick: number;
  /** Highest input seq from this client the server has processed. */
  lastInputSeq: number;
  entities: SnapshotEntity[];
}

const TAU = Math.PI * 2;

export function encodeSnapshot(snap: Snapshot): ArrayBuffer {
  const w = new ByteWriter(16 + snap.entities.length * 17);
  w.u8(BinaryMsgType.Snapshot);
  w.u32(snap.serverTick >>> 0);
  w.u32(snap.lastInputSeq >>> 0);
  w.u16(snap.entities.length);
  for (const e of snap.entities) {
    w.u32(e.eid);
    w.i32(Math.round(e.x * POS_SCALE));
    w.i32(Math.round(e.y * POS_SCALE));
    w.u8(Math.round((((e.dir % TAU) + TAU) % TAU) / TAU * 255) & 0xff);
    w.u8(e.pose & 0xff);
    w.u8(e.hpPct & 0xff);
    w.u8(e.status & 0xff);
    w.u8(e.alert & 0xff);
  }
  return w.finish();
}

export function decodeSnapshot(r: ByteReader): Snapshot {
  const serverTick = r.u32();
  const lastInputSeq = r.u32();
  const count = r.u16();
  const entities: SnapshotEntity[] = new Array(count);
  for (let i = 0; i < count; i++) {
    entities[i] = {
      eid: r.u32(),
      x: r.i32() / POS_SCALE,
      y: r.i32() / POS_SCALE,
      dir: (r.u8() / 255) * TAU,
      pose: r.u8(),
      hpPct: r.u8(),
      status: r.u8(),
      alert: r.u8(),
    };
  }
  return { serverTick, lastInputSeq, entities };
}
