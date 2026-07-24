import { drawHumanoid } from '../render/rig.js';
import type { NpcActorDef, NpcDef } from '@devcraft/content';

/**
 * Studio portraits. Humanoid actors render through THE player rig —
 * the same drawHumanoid the game uses, posed as a three-quarter bust,
 * so the card shows exactly the body the world will meet: skin, hair,
 * beard, and every worn piece. Creatures get a stylized crest card
 * from their def color until the bestiary art is portable.
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

/** A humanoid actor's bust, cached per definition content. */
export function actorBust(def: NpcActorDef, size = 176): HTMLCanvasElement | null {
  if (def.model.kind !== 'humanoid') return null;
  const key = `${size}:${JSON.stringify(def.model.look)}:${JSON.stringify(def.equipment ?? {})}`;
  const hit = bustCache.get(key);
  if (hit) return hit;
  if (bustCache.size > 60) bustCache.clear();

  const canvas = document.createElement('canvas');
  canvas.width = size * 2;
  canvas.height = size * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);

  // The stage: a soft interior vignette so gear silhouettes read.
  const grad = ctx.createRadialGradient(size / 2, size * 0.42, size * 0.1, size / 2, size * 0.5, size * 0.75);
  grad.addColorStop(0, '#372c48');
  grad.addColorStop(1, '#241b33');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // The proven bust recipe: scale S, feet planted below the frame,
  // head centered in the upper half, facing 40° for the 3/4 read.
  const S = size * 1.16;
  const cx = size / 2;
  const yFeet = size * 0.5 + 0.98 * S + 0.15 * S - size * 0.34;
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
    look: def.model.look,
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
    return null; // an exotic look must never break the studio
  }

  const out = document.createElement('canvas');
  out.width = size;
  out.height = size;
  const octx = out.getContext('2d')!;
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(canvas, 0, 0, size, size);
  bustCache.set(key, out);
  return out;
}

/**
 * A creature crest: the def's color as a beast-shaped emblem with the
 * level struck into it — an honest, consistent identity card.
 */
export function creatureCrest(def: NpcDef, size = 176): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size * 2;
  canvas.height = size * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);

  const grad = ctx.createRadialGradient(size / 2, size * 0.4, size * 0.08, size / 2, size * 0.5, size * 0.75);
  grad.addColorStop(0, '#372c48');
  grad.addColorStop(1, '#241b33');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size * 0.46;
  const r = size * 0.26;

  // Body mass in the creature's color, radius-scaled.
  const bodyR = r * (0.7 + Math.min(1.6, def.radius * 2) * 0.45);
  ctx.fillStyle = def.color;
  ctx.strokeStyle = '#100c1a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(cx, cy + bodyR * 0.28, bodyR * 1.15, bodyR * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Head.
  ctx.beginPath();
  ctx.arc(cx + bodyR * 0.75, cy - bodyR * 0.35, bodyR * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Ears/horns hint scaled by damage share (fiercer = pointier).
  const fierce = Math.min(1, def.damage / 12);
  ctx.beginPath();
  ctx.moveTo(cx + bodyR * 0.5, cy - bodyR * 0.75);
  ctx.lineTo(cx + bodyR * (0.42 - fierce * 0.1), cy - bodyR * (1.15 + fierce * 0.5));
  ctx.lineTo(cx + bodyR * 0.72, cy - bodyR * 0.82);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + bodyR * 0.92, cy - bodyR * 0.72);
  ctx.lineTo(cx + bodyR * (1.05 + fierce * 0.12), cy - bodyR * (1.05 + fierce * 0.4));
  ctx.lineTo(cx + bodyR * 1.08, cy - bodyR * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Eye.
  ctx.fillStyle = '#100c1a';
  ctx.beginPath();
  ctx.arc(cx + bodyR * 0.88, cy - bodyR * 0.38, Math.max(1.6, bodyR * 0.08), 0, Math.PI * 2);
  ctx.fill();

  // Ground shadow.
  ctx.fillStyle = 'rgba(10, 6, 18, 0.4)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + bodyR * 1.06, bodyR * 1.2, bodyR * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  const out = document.createElement('canvas');
  out.width = size;
  out.height = size;
  const octx = out.getContext('2d')!;
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(canvas, 0, 0, size, size);
  return out;
}
