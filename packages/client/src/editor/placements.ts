import type { ZoneDef } from '@devcraft/content';
import type { PlacementRef } from './state.js';

/**
 * Placement geometry: hit-testing and shared accessors for the
 * placement kinds a zone carries — portals, NPC spawn clusters, named
 * actor posts, signs, and the world spawn. All coordinates here are LOCAL
 * zone tiles (floats for hit tests); the zone stores world coords.
 */

/** Local position of a placement's anchor (tile-center space). */
export function placementPos(zone: ZoneDef, ref: PlacementRef): { x: number; y: number } | null {
  const ox = zone.origin.x;
  const oy = zone.origin.y;
  switch (ref.kind) {
    case 'portal': {
      const p = zone.portals?.[ref.index];
      return p ? { x: p.x - ox + 0.5, y: p.y - oy + 0.5 } : null;
    }
    case 'cluster': {
      const s = zone.spawns?.[ref.index];
      return s ? { x: s.x - ox + 0.5, y: s.y - oy + 0.5 } : null;
    }
    case 'actor': {
      const a = zone.actorSpawns?.[ref.index];
      return a ? { x: a.x - ox + 0.5, y: a.y - oy + 0.5 } : null;
    }
    case 'sign': {
      const g = zone.signs?.[ref.index];
      return g ? { x: g.x - ox + 0.5, y: g.y - oy + 0.5 } : null;
    }
    case 'spawn':
      return zone.spawn ? { x: zone.spawn.x - ox, y: zone.spawn.y - oy } : null;
  }
}

export function placementLabel(zone: ZoneDef, ref: PlacementRef): string {
  switch (ref.kind) {
    case 'portal': {
      const p = zone.portals?.[ref.index];
      return p ? (p.delve ? 'delve portal' : `portal → ${p.dest?.x},${p.dest?.y}`) : 'portal';
    }
    case 'cluster': {
      const s = zone.spawns?.[ref.index];
      return s ? `${s.npc} ×${s.count}` : 'spawn cluster';
    }
    case 'actor': {
      const a = zone.actorSpawns?.[ref.index];
      return a ? a.actor : 'actor';
    }
    case 'sign': {
      const g = zone.signs?.[ref.index];
      return g ? (g.title || g.lines?.[0] || 'blank sign') : 'sign';
    }
    case 'spawn':
      return 'world spawn';
  }
}

export function sameRef(a: PlacementRef | null, b: PlacementRef | null): boolean {
  return !!a && !!b && a.kind === b.kind && a.index === b.index;
}

/**
 * The placement under a local float coordinate, nearest-first.
 * Cluster centers hit inside 0.6 tiles; ring edges are a separate
 * affordance (clusterEdgeAt) so a big ring never swallows clicks.
 */
export function placementAt(zone: ZoneDef, fx: number, fy: number): PlacementRef | null {
  const candidates: Array<{ ref: PlacementRef; d: number; r: number }> = [];
  const consider = (ref: PlacementRef, r: number): void => {
    const pos = placementPos(zone, ref);
    if (!pos) return;
    const d = Math.hypot(fx - pos.x, fy - pos.y);
    if (d <= r) candidates.push({ ref, d, r });
  };
  (zone.actorSpawns ?? []).forEach((_, i) => consider({ kind: 'actor', index: i }, 0.62));
  (zone.portals ?? []).forEach((_, i) => consider({ kind: 'portal', index: i }, 0.62));
  (zone.spawns ?? []).forEach((_, i) => consider({ kind: 'cluster', index: i }, 0.62));
  (zone.signs ?? []).forEach((_, i) => consider({ kind: 'sign', index: i }, 0.62));
  if (zone.spawn) consider({ kind: 'spawn', index: 0 }, 0.62);
  candidates.sort((a, b) => a.d - b.d);
  return candidates[0]?.ref ?? null;
}

/** Cluster whose RING EDGE is under the cursor (resize affordance). */
export function clusterEdgeAt(
  zone: ZoneDef,
  fx: number,
  fy: number,
  tol: number,
): number | null {
  let best: { i: number; d: number } | null = null;
  (zone.spawns ?? []).forEach((s, i) => {
    const d = Math.abs(
      Math.hypot(fx - (s.x - zone.origin.x + 0.5), fy - (s.y - zone.origin.y + 0.5)) - s.radius,
    );
    if (d <= tol && (!best || d < best.d)) best = { i, d };
  });
  return best ? (best as { i: number }).i : null;
}

/** Move a placement's anchor to a local tile (integers — authored law). */
export function movePlacement(zone: ZoneDef, ref: PlacementRef, lx: number, ly: number): void {
  const wx = zone.origin.x + lx;
  const wy = zone.origin.y + ly;
  switch (ref.kind) {
    case 'portal': {
      const p = zone.portals?.[ref.index];
      if (p) {
        p.x = wx;
        p.y = wy;
      }
      break;
    }
    case 'cluster': {
      const s = zone.spawns?.[ref.index];
      if (s) {
        s.x = wx;
        s.y = wy;
      }
      break;
    }
    case 'actor': {
      const a = zone.actorSpawns?.[ref.index];
      if (a) {
        a.x = wx;
        a.y = wy;
      }
      break;
    }
    case 'sign': {
      const g = zone.signs?.[ref.index];
      if (g) {
        g.x = wx;
        g.y = wy;
      }
      break;
    }
    case 'spawn':
      zone.spawn = { x: wx + 0.5, y: wy + 0.5 };
      break;
  }
}

/** Remove a placement (the world spawn simply clears). */
export function deletePlacement(zone: ZoneDef, ref: PlacementRef): void {
  switch (ref.kind) {
    case 'portal':
      zone.portals?.splice(ref.index, 1);
      break;
    case 'cluster':
      zone.spawns?.splice(ref.index, 1);
      break;
    case 'actor':
      zone.actorSpawns?.splice(ref.index, 1);
      break;
    case 'sign':
      zone.signs?.splice(ref.index, 1);
      break;
    case 'spawn':
      zone.spawn = undefined;
      break;
  }
}
