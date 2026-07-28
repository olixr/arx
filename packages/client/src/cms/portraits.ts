import { drawHumanoid } from '../render/rig.js';
import type { Look } from '@arx/shared';
import type { NpcActorDef } from '@arx/content';
import { ringComposite } from './gameRender.js';

/**
 * Studio portraits. Humanoid actors render through THE player rig —
 * the same drawHumanoid the game uses — finished with the world's
 * outline ring, so the studio shows exactly the body the world will
 * meet: skin, hair, beard, and every worn piece, all judged WITH the
 * ring, as the art law demands. Two framings:
 *
 *   - BUST: head and shoulders at a 40° three-quarter turn — list
 *     thumbs, heritage cards, and style tiles.
 *   - FIGURE: the whole body standing square to the camera — the
 *     stage render, "how they actually look in the world".
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

type Equipment = Partial<Record<string, string>>;

const bustCache = new Map<string, HTMLCanvasElement | null>();

function paintRig(
  ctx: CanvasRenderingContext2D,
  px: number,
  look: Look,
  equipment: Equipment,
  framing: 'bust' | 'figure',
): void {
  // Bust: the proven recipe — head centered high, feet planted far
  // below the frame, 40° for the three-quarter read. Figure: the
  // whole body inside the stage, facing the camera dead-on.
  const S = framing === 'bust' ? px * 1.16 : px * 0.52;
  const cx = px / 2;
  const yFeet =
    framing === 'bust' ? px * 0.5 + 0.98 * S + 0.15 * S - px * 0.34 : px * 0.9;
  const hip = 0.1 * S;
  const dir = framing === 'bust' ? (40 * Math.PI) / 180 : Math.PI / 2;

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
  for (const [slot, item] of Object.entries(equipment)) {
    const field = SLOT_TO_RIG[slot];
    if (field && item) rig[field] = item;
  }
  drawHumanoid(ctx, rig as unknown as Parameters<typeof drawHumanoid>[1]);
}

/**
 * A canvas is a DOM node with ONE parent — handing the cached element
 * to two tiles would silently MOVE it from the first to the second.
 * Every caller gets a cheap pixel copy; the cache keeps the original.
 */
function displayCopy(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  c.getContext('2d')!.drawImage(src, 0, 0);
  return c;
}

function renderLook(
  look: Look,
  size: number,
  equipment: Equipment,
  framing: 'bust' | 'figure',
): HTMLCanvasElement | null {
  const key = `${framing}:${size}:${JSON.stringify(look)}:${JSON.stringify(equipment)}`;
  if (bustCache.has(key)) {
    const hit = bustCache.get(key)!;
    return hit ? displayCopy(hit) : null;
  }
  if (bustCache.size > 400) bustCache.clear();
  let failed = false;
  const canvas = ringComposite(size, (ctx, px) => {
    try {
      paintRig(ctx, px, look, equipment, framing);
    } catch (err) {
      failed = true; // an exotic look must never break the studio
      console.warn('portrait render failed', framing, size, err);
    }
  });
  bustCache.set(key, failed ? null : canvas);
  return failed ? null : displayCopy(canvas);
}

/** A ringed three-quarter bust of a raw look (plus optional gear). */
export function lookBust(look: Look, size = 44, equipment: Equipment = {}): HTMLCanvasElement | null {
  return renderLook(look, size, equipment, 'bust');
}

/** The whole body standing square to the camera, ring and all. */
export function lookFigure(
  look: Look,
  size = 200,
  equipment: Equipment = {},
): HTMLCanvasElement | null {
  return renderLook(look, size, equipment, 'figure');
}

/** A humanoid actor's ringed bust; null for creature-bodied actors. */
export function actorBust(def: NpcActorDef, size = 176): HTMLCanvasElement | null {
  if (def.model.kind !== 'humanoid') return null;
  return lookBust(def.model.look, size, def.equipment ?? {});
}

/** A humanoid actor's full standing figure; null for creature bodies. */
export function actorFigure(def: NpcActorDef, size = 200): HTMLCanvasElement | null {
  if (def.model.kind !== 'humanoid') return null;
  return lookFigure(def.model.look, size, def.equipment ?? {});
}
