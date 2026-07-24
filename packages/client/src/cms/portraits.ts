import { drawHumanoid } from '../render/rig.js';
import type { NpcActorDef } from '@devcraft/content';
import { ringComposite } from './gameRender.js';

/**
 * Studio portraits. Humanoid actors render through THE player rig —
 * the same drawHumanoid the game uses, posed as a three-quarter bust
 * with the world's outline ring — so the card shows exactly the body
 * the world will meet: skin, hair, beard, and every worn piece, all
 * judged WITH the ring, as the art law demands.
 */

const SLOT_TO_RIG: Record<string, string> = {
  weapon: 'weaponItem',
  offhand: 'offhandItem',
  head: 'headItem',
  body: 'bodyItem',
  legs: 'legsItem',
  gloves: 'glovesItem',
  boots: 'bootsItem',
  cape: 'capeItem',
};

const bustCache = new Map<string, HTMLCanvasElement>();

/** A humanoid actor's ringed bust, cached per definition content. */
export function actorBust(def: NpcActorDef, size = 176): HTMLCanvasElement | null {
  if (def.model.kind !== 'humanoid') return null;
  const key = `${size}:${JSON.stringify(def.model.look)}:${JSON.stringify(def.equipment ?? {})}`;
  const hit = bustCache.get(key);
  if (hit) return hit;
  if (bustCache.size > 60) bustCache.clear();

  const look = def.model.look;
  let failed = false;
  const canvas = ringComposite(size, (ctx, px) => {
    // The proven bust recipe: head centered in the upper frame, feet
    // planted below it, facing 40° for the three-quarter read.
    const S = px * 1.16;
    const cx = px / 2;
    const yFeet = px * 0.5 + 0.98 * S + 0.15 * S - px * 0.34;
    const hip = 0.1 * S;
    const dir = (40 * Math.PI) / 180;

    const rig: Record<string, unknown> = {
      x: cx,
      y: yFeet,
      scale: S,
      dir,
      pose: 0,
      poseT: 1,
      drawT: 0,
      restT: 1,
      nowMs: 1000,
      feet: [
        { x: cx - hip, y: yFeet, lift: 0 },
        { x: cx + hip, y: yFeet, lift: 0 },
      ],
      bob: 0,
      rise: 0.414,
      wScale: 1.05,
      poleX: 0,
      poleY: 0,
      poleStrength: 0,
      runF: 0,
      align: 1,
      kneeMemory: [0, 0],
      bodyColor: '#8a6f4d',
      hurt: false,
      isOwn: true,
      look,
      gatherPhase: 0,
      craftKind: null,
    };
    for (const [slot, item] of Object.entries(def.equipment ?? {})) {
      const field = SLOT_TO_RIG[slot];
      if (field && item) rig[field] = item;
    }
    try {
      drawHumanoid(ctx, rig as unknown as Parameters<typeof drawHumanoid>[1]);
    } catch {
      failed = true; // an exotic look must never break the studio
    }
  });
  if (failed) return null;
  bustCache.set(key, canvas);
  return canvas;
}
