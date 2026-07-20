import { itemDef } from '@devcraft/content';
import { chamferRect } from './shapes.js';
import { shade } from './rig.js';

/**
 * Visual equipment styles — the CAPE_STYLES pattern extended to every
 * armor slot. Each record is pure JSON-shaped data a painter interprets;
 * the content pass authors records + palettes here, never new painters.
 * Unknown items fall back to silhouettes derived from their item color,
 * so every future def is dressed the moment it exists.
 *
 * Painters run inside drawHumanoid's frames (torso squash frame, head
 * frame, arm joints) so the fake-3D foreshortening and facing bands are
 * inherited for free. Laws every painter obeys:
 * - hurt ⇒ paint flat #ffffff (the white-flash silhouette);
 * - fills/strokes on the live ctx only, no allocation, ≤ ~10 subpaths
 *   per garment (the cape budget — these run per entity per frame);
 * - front/profile/back reads gate on profileK/backK/lead like the face.
 */

export type ArmorClassStyle = 'cloth' | 'leather' | 'plate';

export interface BodyStyle {
  color: string;
  trim: string;
  /** Rivets, buckles, plate edges. Default shade(color, -20). */
  metal?: string;
  cls: ArmorClassStyle;
  silhouette: 'tunic' | 'robe' | 'jerkin' | 'cuirass' | 'brigandine';
  pauldron: 'none' | 'round' | 'spiked' | 'layered';
  pauldronColor?: string;
  chest: 'none' | 'straps' | 'plate' | 'emblem' | 'stitch';
  emblem?: 'chevron' | 'diamond' | 'bolt';
  /** Robe/coat skirt length below the belt line, tiles. 0 = none. */
  skirt: number;
  skirtSlit?: boolean;
  /** drawArm sleeve override. Default shade(color, -12) — today's law. */
  sleeve?: string;
  /** Neck treatment: plate gorget ring or a fur ruff. */
  collar?: 'gorget' | 'fur';
  /** A belt pouch on the hip — the adventurer's secondary read. */
  pouch?: boolean;
  /** Hem/trim accent that breathes with a slow ember pulse. */
  glowTrim?: string;
}

export interface HelmStyle {
  color: string;
  trim: string;
  kind: 'dome' | 'greathelm' | 'hood' | 'circlet' | 'horned' | 'wizard';
  noseGuard?: boolean;
  visor?: 'slit' | 'cross';
  plume?: { color: string };
  horns?: { color: string; size: number };
  /** Wizard hats: a band buckle / star charm on the crown. */
  charm?: string;
}

export interface LegStyle {
  kind: 'pants' | 'greaves' | 'wraps';
  /** Default: today's pants-color law (look pants / darkened body). */
  thigh?: string;
  shin?: string;
  knee?: 'none' | 'plate' | 'wrap';
  kneeColor?: string;
}

export interface BootStyle {
  color: string;
  /** Shaft height up the shin, tiles. 0.06 ≈ the bare foot chip. */
  height: number;
  cuff?: { color: string };
  /** Metal toe cap color (sabatons). */
  toe?: string;
}

export interface OffhandStyle {
  kind: 'buckler' | 'kite' | 'tome' | 'quiver' | 'orb';
  color: string;
  trim: string;
  boss?: string;
  spikes?: boolean;
  emblem?: 'chevron' | 'diamond';
}

// ------------------------------------------------------------- rosters

export const BODY_STYLES: Record<string, BodyStyle> = {
  apprentice_robe: {
    color: '#5a6ea0', trim: '#c9c4cf', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'stitch', skirt: 0.32,
  },
  emberweave_robe: {
    color: '#c4553d', trim: '#e8a23c', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'emblem', emblem: 'bolt',
    skirt: 0.3, skirtSlit: true, glowTrim: '#ffb054',
  },
  leather_body: {
    color: '#b08a5c', trim: '#6b4a26', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'none', chest: 'straps', skirt: 0,
    pouch: true,
  },
  huntsman_jerkin: {
    color: '#3f6b3a', trim: '#2e4a28', metal: '#6b4a26', cls: 'leather',
    silhouette: 'brigandine', pauldron: 'layered', pauldronColor: '#5a3f1e',
    chest: 'straps', skirt: 0.12, collar: 'fur', pouch: true,
  },
  iron_platebody: {
    color: '#8d9299', trim: '#6a6f7d', metal: '#b0b6be', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'round', chest: 'plate', skirt: 0,
    collar: 'gorget',
  },
  steel_platebody: {
    color: '#b8bec8', trim: '#c9a23c', metal: '#d4dae2', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'layered', chest: 'plate',
    emblem: 'diamond', skirt: 0, collar: 'gorget',
  },
};

export const HELM_STYLES: Record<string, HelmStyle> = {
  flower_crown: { color: '#e8c04c', trim: '#79a355', kind: 'circlet' },
  iron_helm: { color: '#8d9299', trim: '#6a6f7d', kind: 'dome', noseGuard: true },
  leather_hood: { color: '#8a6a45', trim: '#6b4a26', kind: 'hood' },
  wolfhide_hood: { color: '#6a6f7d', trim: '#9aa0ae', kind: 'hood' },
  runecloth_cowl: { color: '#7a5ac4', trim: '#c9a8e8', kind: 'hood' },
  wizards_hat: { color: '#4a5a9c', trim: '#c9a23c', kind: 'wizard', charm: '#e8d06a' },
  steel_greathelm: {
    color: '#b8bec8', trim: '#8d9299', kind: 'greathelm',
    visor: 'slit', plume: { color: '#8a2f3c' },
  },
  horned_raider_helm: {
    color: '#7d6a52', trim: '#5a4a38', kind: 'horned',
    noseGuard: true, horns: { color: '#e6e0d0', size: 1 },
  },
};

export const LEG_STYLES: Record<string, LegStyle> = {
  woven_trousers: { kind: 'pants', thigh: '#8f9ed6' },
  leather_chaps: { kind: 'wraps', thigh: '#b08a5c', shin: '#8a6a45', knee: 'wrap', kneeColor: '#6b4a26' },
  iron_greaves: { kind: 'greaves', thigh: '#5c5460', shin: '#8d9299', knee: 'plate', kneeColor: '#9aa2ac' },
  steel_greaves: { kind: 'greaves', thigh: '#5c5460', shin: '#b8bec8', knee: 'plate', kneeColor: '#d4dae2' },
};

export const BOOT_STYLES: Record<string, BootStyle> = {
  swiftstep_boots: { color: '#7fc9b3', height: 0.1, cuff: { color: '#4a8a78' } },
  leather_boots: { color: '#6b4a26', height: 0.08 },
  wanderer_boots: { color: '#8a6a45', height: 0.16, cuff: { color: '#6b4a26' } },
  iron_sabatons: { color: '#8d9299', height: 0.12, toe: '#c9ccd4' },
};

export const OFFHAND_STYLES: Record<string, OffhandStyle> = {
  spiked_buckler: { kind: 'buckler', color: '#8a744a', trim: '#6b5a38', boss: '#dde2ea', spikes: true },
  oak_kiteshield: { kind: 'kite', color: '#6b4a26', trim: '#a4744b', emblem: 'chevron' },
  frost_quiver: { kind: 'quiver', color: '#8ac4e8', trim: '#4a6a8a' },
  tome_of_embers: { kind: 'tome', color: '#e8763c', trim: '#6b3a1e' },
  arcane_orb: { kind: 'orb', color: '#8f9ed6', trim: '#c9c4cf' },
};

// ---------------------------------------------------------- resolvers

/** Unknown body item: a plain tunic in the item's color — today's read. */
export function bodyStyle(itemId: string): BodyStyle {
  const st = BODY_STYLES[itemId];
  if (st) return st;
  const c = itemDef(itemId)?.color ?? '#8a7a5f';
  return { color: c, trim: shade(c, -20), cls: 'cloth', silhouette: 'tunic', pauldron: 'none', chest: 'none', skirt: 0 };
}

/** Unknown head item: the classic tinted dome — today's helmet. */
export function helmStyle(itemId: string): HelmStyle {
  const st = HELM_STYLES[itemId];
  if (st) return st;
  const c = itemDef(itemId)?.color ?? '#8d9299';
  return { color: c, trim: shade(c, -22), kind: 'dome', noseGuard: true };
}

export function legStyle(itemId: string): LegStyle {
  const st = LEG_STYLES[itemId];
  if (st) return st;
  const c = itemDef(itemId)?.color;
  return c ? { kind: 'pants', thigh: c } : { kind: 'pants' };
}

export function bootStyle(itemId: string): BootStyle {
  const st = BOOT_STYLES[itemId];
  if (st) return st;
  return { color: itemDef(itemId)?.color ?? '#4a3324', height: 0.08 };
}

export function offhandStyle(itemId: string): OffhandStyle {
  const st = OFFHAND_STYLES[itemId];
  if (st) return st;
  const c = itemDef(itemId)?.color ?? '#8a744a';
  return { kind: 'buckler', color: c, trim: shade(c, -20) };
}

// ------------------------------------------------------------ painters

/**
 * The torso local frame drawHumanoid establishes before calling in:
 * translated to the hip line, rotated by combat lean, scaled by the
 * fake-3D squash — every coordinate here foreshortens for free.
 */
export interface TorsoFrame {
  s: number;
  /** Shoulder / waist half-widths, hip→shoulder height (local units). */
  tw: number;
  ww: number;
  th: number;
  lead: number;
  profileK: number;
  backK: number;
  hurt: boolean;
  /** Foot-lift differential — the gait beat hems sway on. */
  strideSw: number;
  /** Wall-clock ms — hem flutter, ember pulses, living details. */
  nowMs: number;
  /** Gait blend 0..1 — billow and cloth drag scale with real speed. */
  runF: number;
  /**
   * Cloth drag in local x: the hem trails the direction of travel like
   * real cloth (screen travel, un-squashed by the caller). Signed.
   */
  dragX: number;
}

/**
 * Torso garment. Replaces the fixed tunic: the `tunic` silhouette with
 * no details is stroke-for-stroke the original body. Pauldrons are NOT
 * drawn here — they are true shoulder joints, painted in screen space
 * on the solved shoulder anchors (drawPauldron) so they ride the arms.
 */
export function drawTorsoGarment(
  ctx: CanvasRenderingContext2D,
  st: BodyStyle,
  f: TorsoFrame,
): void {
  const { s, tw, ww, th, hurt, nowMs, runF, backK } = f;
  const col = hurt ? '#ffffff' : st.color;
  const wide = st.silhouette === 'cuirass' ? 1.04 : 1;
  const tww = tw * wide;
  const back = backK > 0.55;
  const metal = st.metal ?? shade(st.color, -20);

  // ---- the living skirt: a full-length robe hem that DRAGS behind the
  // travel, billows as the gait becomes a run, and ripples on its own
  // clock — cloth as motion, not a static trapezoid. Legs painted
  // earlier are covered naturally; hem stays above the boots.
  if (st.skirt > 0) {
    const y0 = -0.075 * s;
    const hemY = 0.02 * s + st.skirt * s;
    const hemW = ww * 1.3;
    const stride = f.strideSw * 0.025 * s;
    const trail = f.dragX === 0 ? 0 : Math.sign(f.dragX);
    // Five hem points, left to right; drag bows the middle hardest,
    // flutter gives each point its own beat, speed lifts the trailing
    // edge so the cloth planes out behind a sprint.
    const hem: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 4; i++) {
      const u = i / 4;
      const bx = -hemW + u * 2 * hemW;
      const flutter =
        Math.sin(nowMs * 0.005 + i * 1.9) * 0.013 * s * (0.3 + 0.7 * runF) +
        stride * Math.sin(u * Math.PI);
      const dx = f.dragX * (0.5 + 0.4 * Math.sin(u * Math.PI)) * s + flutter;
      const lift =
        runF * 0.055 * s * Math.max(0, (bx * trail) / hemW) +
        Math.abs(f.dragX) * 0.18 * s * Math.sin(u * Math.PI) * runF;
      hem.push({ x: bx + dx, y: hemY - lift });
    }
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-ww, y0);
    ctx.lineTo(ww, y0);
    for (let i = 4; i >= 0; i--) ctx.lineTo(hem[i]!.x, hem[i]!.y);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // Trailing-half shade keeps the torso's x=0 form split.
      ctx.fillStyle = shade(st.color, -18);
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.lineTo(ww, y0);
      ctx.lineTo(hem[4]!.x, hem[4]!.y);
      ctx.lineTo(hem[3]!.x, hem[3]!.y);
      ctx.lineTo(hem[2]!.x, hem[2]!.y);
      ctx.closePath();
      ctx.fill();
      // A second, deeper fold line rides the drag — the crease that
      // says the cloth has weight.
      ctx.strokeStyle = shade(st.color, -28);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(-ww * 0.4 + f.dragX * 0.3 * s, y0 + 0.05 * s);
      ctx.quadraticCurveTo(
        -ww * 0.3 + f.dragX * 0.5 * s,
        (y0 + hemY) / 2,
        hem[1]!.x + hemW * 0.18,
        hem[1]!.y - 0.01 * s,
      );
      ctx.stroke();
      // Hem trim follows the moving hem points.
      ctx.strokeStyle = st.trim;
      ctx.lineWidth = Math.max(1.5, s * 0.026);
      ctx.beginPath();
      ctx.moveTo(hem[0]!.x, hem[0]!.y - 0.012 * s);
      for (let i = 1; i <= 4; i++) ctx.lineTo(hem[i]!.x, hem[i]!.y - 0.012 * s);
      ctx.stroke();
      // Emberweave-style hems breathe: a warm pulse over the trim.
      if (st.glowTrim) {
        const pulse = 0.3 + 0.22 * Math.sin(nowMs * 0.0035);
        ctx.strokeStyle = st.glowTrim;
        ctx.globalAlpha = pulse;
        ctx.lineWidth = Math.max(2, s * 0.04);
        ctx.beginPath();
        ctx.moveTo(hem[0]!.x, hem[0]!.y - 0.012 * s);
        for (let i = 1; i <= 4; i++) ctx.lineTo(hem[i]!.x, hem[i]!.y - 0.012 * s);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (st.skirtSlit && !back) {
        // The center slit lets the stride read through the cloth.
        ctx.fillStyle = 'rgba(24, 15, 26, 0.55)';
        ctx.beginPath();
        ctx.moveTo(hem[2]!.x * 0.5, hemY - st.skirt * s * 0.6);
        ctx.lineTo(hem[2]!.x + 0.035 * s, hem[2]!.y);
        ctx.lineTo(hem[2]!.x - 0.035 * s, hem[2]!.y);
        ctx.closePath();
        ctx.fill();
      }
      if (back) {
        // Back panel seam — robes are tailored, front and back.
        ctx.strokeStyle = shade(st.color, -24);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(0, y0 + 0.02 * s);
        ctx.lineTo(hem[2]!.x * 0.8, hem[2]!.y - 0.02 * s);
        ctx.stroke();
      }
    }
  }

  // ---- base torso quad — the original tunic geometry.
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-tww, -th);
  ctx.lineTo(tww, -th);
  ctx.lineTo(ww, 0.02 * s);
  ctx.lineTo(-ww, 0.02 * s);
  ctx.closePath();
  ctx.fill();

  if (!hurt) {
    ctx.fillStyle = shade(st.color, -18);
    ctx.beginPath();
    ctx.moveTo(0, -th);
    ctx.lineTo(tww, -th);
    ctx.lineTo(ww, 0.02 * s);
    ctx.lineTo(0, 0.02 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(st.color, 14);
    ctx.beginPath();
    ctx.moveTo(-tww, -th);
    ctx.lineTo(tww, -th);
    ctx.lineTo(tww * 0.9, -th + 0.07 * s);
    ctx.lineTo(-tww * 0.9, -th + 0.07 * s);
    ctx.closePath();
    ctx.fill();

    // ---- waist: cloth belt, or the cuirass' ARTICULATED fauld — two
    // overlapping plates stepping down, a real joint instead of a band.
    if (st.silhouette === 'cuirass') {
      ctx.fillStyle = shade(st.color, -24);
      ctx.beginPath();
      chamferRect(ctx, -ww - 0.02 * s, -0.115 * s, ww * 2 + 0.04 * s, 0.075 * s, 0.016 * s);
      ctx.fill();
      ctx.fillStyle = metal;
      ctx.fillRect(-ww - 0.02 * s, -0.115 * s, ww * 2 + 0.04 * s, 0.018 * s);
      ctx.fillStyle = shade(st.color, -34);
      ctx.beginPath();
      chamferRect(ctx, -ww * 0.92 - 0.01 * s, -0.052 * s, ww * 1.84 + 0.02 * s, 0.062 * s, 0.014 * s);
      ctx.fill();
      // Gold edging on the champion fauld.
      if (st.trim !== metal) {
        ctx.fillStyle = st.trim;
        ctx.fillRect(-ww * 0.92, -0.052 * s, ww * 1.84, 0.012 * s);
      }
    } else {
      ctx.fillStyle = shade(st.color, -38);
      ctx.fillRect(-ww - 0.008 * s, -0.075 * s, ww * 2 + 0.016 * s, 0.075 * s);
    }

    // ---- collar: the neck joint that ties helmet to breastplate.
    if (st.collar === 'gorget') {
      ctx.fillStyle = metal;
      ctx.beginPath();
      chamferRect(ctx, -tw * 0.42, -th - 0.028 * s, tw * 0.84, 0.05 * s, 0.014 * s);
      ctx.fill();
      ctx.fillStyle = shade(metal, -22);
      ctx.fillRect(-tw * 0.42, -th + 0.012 * s, tw * 0.84, 0.012 * s);
    } else if (st.collar === 'fur') {
      // A lumpy fur ruff across the shoulder line — the huntsman read.
      ctx.fillStyle = shade(st.trim, 34);
      for (let i = 0; i < 5; i++) {
        const u = -1 + i * 0.5;
        const r = (0.045 + 0.012 * Math.sin(i * 2.7)) * s;
        ctx.beginPath();
        ctx.arc(u * tw * 0.82, -th + 0.012 * s + Math.sin(i * 1.9) * 0.008 * s, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (st.silhouette === 'brigandine') {
      ctx.strokeStyle = shade(st.color, -26);
      ctx.lineWidth = Math.max(1, s * 0.016);
      for (const yk of [0.62, 0.4]) {
        ctx.beginPath();
        ctx.moveTo(-tw * 0.92, -th * yk);
        ctx.lineTo(tw * 0.92, -th * yk);
        ctx.stroke();
      }
      ctx.fillStyle = metal;
      for (const yk of [0.62, 0.4]) {
        for (const xk of [-0.6, 0, 0.6]) {
          ctx.fillRect(tw * xk - 0.008 * s, -th * yk - 0.008 * s, 0.016 * s, 0.016 * s);
        }
      }
    }

    // ---- front and back are DIFFERENT garments: chest marks face the
    // camera; turn around and you get backplates, crossed straps, seams.
    if (!back) {
      if (st.chest === 'straps') {
        ctx.strokeStyle = st.trim;
        ctx.lineWidth = Math.max(1.5, s * 0.028);
        ctx.beginPath();
        ctx.moveTo(-tw * 0.7, -th * 0.96);
        ctx.lineTo(ww * 0.5, -0.1 * s);
        ctx.stroke();
        ctx.fillStyle = metal;
        ctx.fillRect(-tw * 0.16, -th * 0.55, 0.03 * s, 0.03 * s);
      } else if (st.chest === 'plate') {
        ctx.fillStyle = metal;
        ctx.beginPath();
        chamferRect(ctx, -tw * 0.52, -th * 0.86, tw * 1.04, th * 0.52, 0.035 * s);
        ctx.fill();
        ctx.fillStyle = shade(metal, 16);
        ctx.fillRect(-tw * 0.52, -th * 0.86, tw * 1.04, th * 0.1);
        // Rivets pin the breastplate at its corners.
        ctx.fillStyle = shade(metal, -26);
        for (const rx of [-tw * 0.42, tw * 0.42]) {
          ctx.fillRect(rx - 0.008 * s, -th * 0.82, 0.016 * s, 0.016 * s);
          ctx.fillRect(rx - 0.008 * s, -th * 0.42, 0.016 * s, 0.016 * s);
        }
      } else if (st.chest === 'stitch') {
        ctx.strokeStyle = st.trim;
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(0, -th * 0.98);
        ctx.lineTo(0, -0.09 * s);
        ctx.stroke();
        // Rope belt knot — the apprentice's whole budget.
        ctx.fillStyle = st.trim;
        ctx.beginPath();
        ctx.arc(0, -0.04 * s, 0.022 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      if (st.emblem && (st.chest === 'emblem' || st.chest === 'plate')) {
        ctx.fillStyle = st.trim;
        const ey = -th * 0.58;
        const r = tw * 0.3;
        ctx.beginPath();
        if (st.emblem === 'chevron') {
          ctx.moveTo(-r, ey - r * 0.4);
          ctx.lineTo(0, ey + r * 0.5);
          ctx.lineTo(r, ey - r * 0.4);
          ctx.lineTo(r * 0.55, ey - r * 0.55);
          ctx.lineTo(0, ey);
          ctx.lineTo(-r * 0.55, ey - r * 0.55);
        } else if (st.emblem === 'diamond') {
          ctx.moveTo(0, ey - r * 0.7);
          ctx.lineTo(r * 0.6, ey);
          ctx.lineTo(0, ey + r * 0.7);
          ctx.lineTo(-r * 0.6, ey);
        } else {
          ctx.moveTo(r * 0.25, ey - r * 0.75);
          ctx.lineTo(-r * 0.3, ey + r * 0.1);
          ctx.lineTo(r * 0.02, ey + r * 0.1);
          ctx.lineTo(-r * 0.25, ey + r * 0.8);
          ctx.lineTo(r * 0.35, ey - r * 0.12);
          ctx.lineTo(r * 0.02, ey - r * 0.12);
        }
        ctx.closePath();
        ctx.fill();
      }
    } else {
      if (st.silhouette === 'cuirass') {
        // Backplate: spine ridge + shoulder-blade facets + strap line.
        ctx.fillStyle = shade(st.color, -16);
        ctx.fillRect(-0.014 * s, -th * 0.96, 0.028 * s, th * 0.88);
        ctx.fillStyle = shade(st.color, 8);
        for (const sx of [-1, 1]) {
          ctx.beginPath();
          chamferRect(ctx, sx * tw * 0.52 - tw * 0.26, -th * 0.84, tw * 0.52, th * 0.34, 0.03 * s);
          ctx.fill();
        }
        ctx.fillStyle = shade(metal, -18);
        ctx.fillRect(-tww * 0.9, -th * 0.44, tww * 1.8, 0.016 * s);
      } else if (st.chest === 'straps' || st.silhouette === 'brigandine') {
        // Crossed back straps + buckle — how a jerkin actually closes.
        ctx.strokeStyle = shade(st.trim, -6);
        ctx.lineWidth = Math.max(1.5, s * 0.026);
        ctx.beginPath();
        ctx.moveTo(-tw * 0.7, -th * 0.94);
        ctx.lineTo(tw * 0.55, -0.11 * s);
        ctx.moveTo(tw * 0.7, -th * 0.94);
        ctx.lineTo(-tw * 0.55, -0.11 * s);
        ctx.stroke();
        ctx.fillStyle = metal;
        ctx.fillRect(-0.016 * s, -th * 0.52, 0.032 * s, 0.032 * s);
      } else if (st.silhouette === 'robe') {
        ctx.strokeStyle = shade(st.color, -24);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(0, -th * 0.95);
        ctx.lineTo(0, -0.08 * s);
        ctx.stroke();
      }
    }

    // ---- the belt pouch: gear you LIVE out of, riding the lead hip.
    if (st.pouch && !back) {
      const pxx = f.lead * ww * 0.72;
      ctx.fillStyle = shade(st.trim, 10);
      ctx.beginPath();
      chamferRect(ctx, pxx - 0.038 * s, -0.055 * s, 0.076 * s, 0.075 * s, 0.018 * s);
      ctx.fill();
      ctx.fillStyle = shade(st.trim, -14);
      ctx.beginPath();
      chamferRect(ctx, pxx - 0.042 * s, -0.06 * s, 0.084 * s, 0.032 * s, 0.014 * s);
      ctx.fill();
    }
  }
}

/**
 * A pauldron as a real shoulder JOINT: painted in screen space on the
 * solved shoulder anchor, after its arm, so it caps the arm root and
 * rides swings instead of staying glued to the torso corners. `side`
 * is the outward direction sign; `squashK` is the body's facing squash.
 */
export function drawPauldron(
  ctx: CanvasRenderingContext2D,
  st: BodyStyle,
  x: number,
  y: number,
  side: number,
  s: number,
  squashK: number,
  hurt: boolean,
  near: boolean,
): void {
  if (st.pauldron === 'none') return;
  const base = st.pauldronColor ?? st.metal ?? shade(st.color, -14);
  const col = hurt ? '#ffffff' : near ? shade(base, 8) : shade(base, -12);
  ctx.save();
  ctx.translate(x, y - 0.035 * s);
  ctx.scale(Math.max(0.55, squashK), 1);
  if (st.pauldron === 'layered') {
    // Three lames stepping down the arm — articulation you can read.
    for (let i = 0; i < 3; i++) {
      const w = 0.105 * s * (1 - i * 0.16);
      const yy = -0.02 * s + i * 0.038 * s;
      ctx.fillStyle = hurt ? '#ffffff' : shade(col, -i * 8);
      ctx.beginPath();
      chamferRect(ctx, -w + side * i * 0.012 * s, yy, w * 2, 0.042 * s, 0.014 * s);
      ctx.fill();
    }
    if (!hurt) {
      ctx.fillStyle = shade(col, 18);
      ctx.fillRect(-0.08 * s, -0.016 * s, 0.16 * s, 0.014 * s);
    }
  } else {
    // Dome cap over the deltoid, flat base, lit crown, dark rim.
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-0.105 * s, 0.045 * s);
    ctx.quadraticCurveTo(-0.115 * s, -0.05 * s, 0, -0.062 * s);
    ctx.quadraticCurveTo(0.115 * s, -0.05 * s, 0.105 * s, 0.045 * s);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = shade(col, 18);
      ctx.beginPath();
      ctx.moveTo(-0.07 * s, -0.028 * s);
      ctx.quadraticCurveTo(0, -0.055 * s, 0.07 * s, -0.028 * s);
      ctx.lineTo(0.06 * s, -0.008 * s);
      ctx.quadraticCurveTo(0, -0.03 * s, -0.06 * s, -0.008 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(col, -24);
      ctx.fillRect(-0.1 * s, 0.038 * s, 0.2 * s, 0.014 * s);
      if (st.pauldron === 'spiked') {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(side * 0.06 * s, -0.03 * s);
        ctx.lineTo(side * 0.16 * s, -0.09 * s);
        ctx.lineTo(side * 0.095 * s, 0.005 * s);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

/** The head local frame (inside the torso squash) drawHelmet works in. */
export interface HeadFrame {
  s: number;
  headX: number;
  headY: number;
  hw: number;
  hh: number;
  cut: number;
  headR: number;
  fx: number;
  profileK: number;
  backK: number;
  lead: number;
  hurt: boolean;
  /** Wall-clock ms — hat-tip sway, living micro-motion. */
  nowMs: number;
}

/**
 * Styled head gear. `dome` reproduces the original helmet exactly;
 * the other kinds extend the same band grammar the face uses.
 */
export function drawHelmet(ctx: CanvasRenderingContext2D, st: HelmStyle, f: HeadFrame): void {
  const { s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt } = f;
  const mc = hurt ? '#ffffff' : st.color;

  if (st.kind === 'wizard') {
    // THE wizard hat: a broad brim low on the brow and a tall crown
    // that folds over and droops toward the trailing side — Gandalf,
    // not a traffic cone. The tip sways on its own slow clock, so the
    // hat is always faintly alive; the whole silhouette reads at every
    // facing because a cone has no face to lose.
    const bandY = headY - hh * 0.55;
    const sway = Math.sin(f.nowMs * 0.0021) * hw * 0.14;
    const tipX = headX - lead * hw * 1.35 + sway;
    const tipY = bandY - hh * 1.62;
    // Crown cone with a folded knee: the leading edge climbs near-
    // vertical, breaks at the knee, then droops to the hanging tip.
    ctx.fillStyle = mc;
    ctx.beginPath();
    ctx.moveTo(headX - hw * 0.82, bandY);
    ctx.quadraticCurveTo(headX - hw * 0.6, bandY - hh * 1.3, headX + lead * hw * 0.12, bandY - hh * 1.72);
    ctx.quadraticCurveTo(headX - lead * hw * 0.5, bandY - hh * 2.0, tipX, tipY);
    ctx.quadraticCurveTo(headX - lead * hw * 0.15, bandY - hh * 1.55, headX + lead * hw * 0.35, bandY - hh * 1.28);
    ctx.quadraticCurveTo(headX + hw * 0.78, bandY - hh * 0.6, headX + hw * 0.82, bandY);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // Hard-shade the trailing half of the cone — the fold's underside.
      ctx.fillStyle = shade(st.color, -18);
      ctx.beginPath();
      ctx.moveTo(headX + lead * hw * 0.12, bandY - hh * 1.72);
      ctx.quadraticCurveTo(headX - lead * hw * 0.5, bandY - hh * 2.0, tipX, tipY);
      ctx.quadraticCurveTo(headX - lead * hw * 0.15, bandY - hh * 1.55, headX + lead * hw * 0.35, bandY - hh * 1.28);
      ctx.quadraticCurveTo(headX + lead * hw * 0.2, bandY - hh * 0.9, headX + lead * hw * 0.1, bandY);
      ctx.lineTo(headX + lead * hw * 0.6, bandY);
      ctx.closePath();
      ctx.fill();
      // A crease line up the cone sells the cloth.
      ctx.strokeStyle = shade(st.color, -26);
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(headX - lead * hw * 0.2, bandY - hh * 0.2);
      ctx.quadraticCurveTo(headX - lead * hw * 0.05, bandY - hh * 0.9, headX + lead * hw * 0.08, bandY - hh * 1.5);
      ctx.stroke();
    }
    // The brim: a wide slab over the hair, lit on top, shadowed under.
    ctx.fillStyle = hurt ? '#ffffff' : shade(st.color, 6);
    ctx.beginPath();
    ctx.ellipse(headX, bandY + hh * 0.06, hw * 1.85, hh * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = shade(st.color, -24);
      ctx.beginPath();
      ctx.ellipse(headX, bandY + hh * 0.16, hw * 1.78, hh * 0.22, 0, 0, Math.PI);
      ctx.fill();
      // Band + buckle charm above the brim, tracking the face.
      ctx.fillStyle = st.trim;
      ctx.fillRect(headX - hw * 0.78, bandY - hh * 0.26, hw * 1.56, hh * 0.2);
      if (backK <= 0.55 && st.charm) {
        const bxx = headX + fx * headR * 0.36;
        ctx.fillStyle = st.charm;
        ctx.beginPath();
        chamferRect(ctx, bxx - headR * 0.09, bandY - hh * 0.3, headR * 0.18, headR * 0.26, headR * 0.05);
        ctx.fill();
      }
    }
    return;
  }

  if (st.kind === 'circlet') {
    // A brow band + center gem over the hair — hair stays visible.
    ctx.fillStyle = mc;
    ctx.fillRect(headX - hw * 1.02, headY - hh * 0.62, hw * 2.04, headR * 0.18);
    if (!hurt && backK <= 0.55) {
      ctx.fillStyle = st.trim;
      const gx = headX + fx * headR * 0.36;
      ctx.beginPath();
      chamferRect(ctx, gx - headR * 0.11, headY - hh * 0.68, headR * 0.22, headR * 0.24, headR * 0.06);
      ctx.fill();
    }
    return;
  }

  if (st.kind === 'hood') {
    // A soft mantle: the hair-mop geometry in cloth, draping onto the
    // shoulders, with a shadowed face opening when frontal.
    ctx.fillStyle = mc;
    ctx.beginPath();
    chamferRect(ctx, headX - hw * 1.08, headY - hh * 1.12, hw * 2.16, hh * (backK > 0.55 ? 2.05 : 0.98), [
      cut * 1.2,
      cut * 1.2,
      cut * 0.4,
      cut * 0.4,
    ]);
    ctx.fill();
    // Side curtains frame the face and fall toward the shoulders.
    for (const es of [-1, 1]) {
      ctx.fillRect(headX + es * hw * 0.72, headY - hh * 0.7, hw * 0.38, hh * 1.85);
    }
    if (!hurt) {
      ctx.fillStyle = shade(st.color, 12);
      ctx.fillRect(headX - hw * 0.85, headY - hh * 1.04, hw * 1.7, hh * 0.2);
      if (backK <= 0.55) {
        // The cowl's face shadow — deeper the more frontal the read.
        ctx.fillStyle = `rgba(24, 15, 26, ${0.22 * (1 - profileK * 0.5)})`;
        ctx.fillRect(headX - hw * 0.66, headY - hh * 0.62, hw * 1.32, hh * 0.5);
        ctx.fillStyle = st.trim;
        ctx.fillRect(headX - hw * 0.72, headY - hh * 0.66, hw * 1.44, headR * 0.09);
      } else {
        // From behind, the drape tail: the point every hood hangs from.
        ctx.fillStyle = shade(st.color, -10);
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.34, headY + hh * 0.6);
        ctx.lineTo(headX + hw * 0.34, headY + hh * 0.6);
        ctx.lineTo(headX + lead * hw * 0.1, headY + hh * 1.6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(st.color, -22);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(headX, headY - hh * 0.8);
        ctx.lineTo(headX + lead * hw * 0.08, headY + hh * 0.55);
        ctx.stroke();
      }
    }
    return;
  }

  // Metal family: dome (original), greathelm (full face), horned.
  const full = st.kind === 'greathelm';
  ctx.fillStyle = mc;
  ctx.beginPath();
  chamferRect(ctx, headX - hw * 1.06, headY - hh * 1.1, hw * 2.12, hh * (full ? 2.08 : 1.06), cut);
  ctx.fill();
  if (!hurt) {
    ctx.fillStyle = shade(st.color, 16);
    ctx.fillRect(headX - hw * 0.8, headY - hh * 1.0, hw * 1.6, hh * 0.26);
    ctx.fillStyle = shade(st.color, -22);
    ctx.fillRect(headX - hw * 1.06, headY - hh * 0.16, hw * 2.12, headR * 0.2);
    // Brow rivets pin the band — the smith's signature.
    ctx.fillStyle = shade(st.color, 26);
    for (const rx of [-0.62, 0, 0.62]) {
      ctx.fillRect(headX + rx * hw - headR * 0.035, headY - hh * 0.12, headR * 0.07, headR * 0.07);
    }
  }
  if (full) {
    if (!hurt && backK <= 0.55) {
      // Visor cut tracks the face like the eyes do (the pairX law).
      const vx = headX + fx * headR * 0.36;
      ctx.fillStyle = '#170f1c';
      if (st.visor === 'cross') {
        ctx.fillRect(vx - headR * 0.07, headY - hh * 0.05, headR * 0.14, hh * 0.6);
        ctx.fillRect(vx - headR * 0.4, headY + hh * 0.08, headR * 0.8, hh * 0.16);
      } else {
        const sw = 1 - profileK * 0.45;
        ctx.fillRect(vx - headR * 0.42 * sw, headY + hh * 0.02, headR * 0.84 * sw, hh * 0.15);
      }
    } else if (!hurt) {
      // Plain back plates: a riveted seam instead of a face.
      ctx.fillStyle = shade(st.color, -14);
      ctx.fillRect(headX - 0.01 * s, headY - hh * 0.9, 0.02 * s, hh * 1.7);
    }
  } else if (st.noseGuard) {
    ctx.fillStyle = mc;
    if (backK < 0.4 && profileK < 0.6) {
      ctx.fillRect(headX + fx * headR * 0.36 - headR * 0.09, headY - hh * 0.16, headR * 0.18, hh * 0.62);
    } else if (backK < 0.4) {
      ctx.fillRect(headX - lead * hw * 1.02, headY - hh * 0.16, hw * 0.58, hh * 0.6);
    }
  }
  if (st.horns && !hurt) {
    // Horns sweep up and out; the far horn narrows like the far eye.
    ctx.fillStyle = st.horns.color;
    const hz = st.horns.size;
    for (const es of [-1, 1]) {
      const far = es !== lead;
      const wK = far ? Math.max(0.25, 1 - profileK * 0.7) : 1;
      const bx = headX + es * hw * 0.9;
      const by = headY - hh * 0.75;
      ctx.beginPath();
      ctx.moveTo(bx, by + hh * 0.22 * wK);
      ctx.quadraticCurveTo(
        bx + es * hw * 0.55 * hz * wK,
        by - hh * 0.25 * hz,
        bx + es * hw * 0.62 * hz * wK,
        by - hh * 0.85 * hz,
      );
      ctx.lineTo(bx + es * hw * 0.28 * wK, by - hh * 0.2);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (st.plume && !hurt) {
    // Crest: short center fin frontal, full arc at profile (its hero
    // read), falling tail from behind — the beard's band narrowing.
    ctx.fillStyle = st.plume.color;
    const arcK = 0.35 + 0.65 * profileK;
    ctx.beginPath();
    ctx.moveTo(headX - lead * hw * 0.7 * arcK, headY - hh * 1.02);
    ctx.quadraticCurveTo(headX, headY - hh * (1.5 + 0.35 * arcK), headX + lead * hw * 0.72 * arcK, headY - hh * 1.02);
    ctx.lineTo(headX + lead * hw * 0.4 * arcK, headY - hh * 0.98);
    ctx.quadraticCurveTo(headX, headY - hh * (1.3 + 0.28 * arcK), headX - lead * hw * 0.4 * arcK, headY - hh * 0.98);
    ctx.closePath();
    ctx.fill();
    if (backK > 0.55) {
      ctx.fillRect(headX - hw * 0.1, headY - hh * 1.0, hw * 0.2, hh * 1.1);
    }
  }
}

/**
 * Arm-carried offhand, strapped to the solved off forearm — drawn in
 * the same depth layer as the arm so the strap never breaks.
 */
export function drawOffhandOnArm(
  ctx: CanvasRenderingContext2D,
  st: OffhandStyle,
  arm: { ex: number; ey: number; kx: number; ky: number },
  s: number,
  profileK: number,
  hurt: boolean,
): void {
  const col = hurt ? '#ffffff' : st.color;
  if (st.kind === 'tome') {
    // A chunky book held flat in the off hand, spine toward the thumb.
    ctx.save();
    ctx.translate(arm.ex, arm.ey);
    ctx.rotate(Math.atan2(arm.ey - arm.ky, arm.ex - arm.kx));
    ctx.fillStyle = col;
    ctx.beginPath();
    chamferRect(ctx, -0.02 * s, -0.085 * s, 0.16 * s, 0.17 * s, 0.02 * s);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = st.trim;
      ctx.fillRect(-0.02 * s, -0.085 * s, 0.035 * s, 0.17 * s);
      ctx.fillStyle = shade(st.color, 22);
      ctx.fillRect(0.03 * s, -0.06 * s, 0.09 * s, 0.026 * s);
    }
    ctx.restore();
    return;
  }
  if (st.kind === 'orb') {
    // Floats just off the palm with a slow glint — the focus dialect.
    const ox = arm.ex;
    const oy = arm.ey - 0.05 * s;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(ox, oy, 0.062 * s, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = st.trim;
      ctx.beginPath();
      ctx.arc(ox - 0.018 * s, oy - 0.02 * s, 0.02 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  // Shields ride the forearm midpoint, rotated with the bone; facing
  // squashes the face toward a rim at profile.
  const mx = (arm.kx + arm.ex) / 2;
  const my = (arm.ky + arm.ey) / 2;
  const faceK = 0.3 + 0.7 * (1 - profileK);
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(Math.atan2(arm.ey - arm.ky, arm.ex - arm.kx) + Math.PI / 2);
  if (st.kind === 'kite') {
    const w = 0.15 * s * faceK;
    const h = 0.24 * s;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-w, -h * 0.45);
    ctx.lineTo(w, -h * 0.45);
    ctx.lineTo(w * 0.85, h * 0.15);
    ctx.lineTo(0, h * 0.62);
    ctx.lineTo(-w * 0.85, h * 0.15);
    ctx.closePath();
    ctx.fill();
    if (!hurt && faceK > 0.55) {
      ctx.fillStyle = st.trim;
      ctx.beginPath();
      ctx.moveTo(-w * 0.55, -h * 0.2);
      ctx.lineTo(0, h * 0.12);
      ctx.lineTo(w * 0.55, -h * 0.2);
      ctx.lineTo(w * 0.3, -h * 0.28);
      ctx.lineTo(0, -h * 0.08);
      ctx.lineTo(-w * 0.3, -h * 0.28);
      ctx.closePath();
      ctx.fill();
    } else if (!hurt) {
      ctx.fillStyle = shade(st.color, 18);
      ctx.fillRect(-w, -h * 0.45, w * 0.5, h * 1.05);
    }
  } else {
    // Buckler: round face, trim ring, boss — spikes when frontal.
    const r = 0.115 * s;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * faceK, r, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      if (faceK > 0.6) {
        if (st.spikes) {
          ctx.fillStyle = '#dde2ea';
          for (const a of [0.6, 2.2, 3.9, 5.5]) {
            const sx2 = Math.cos(a) * r * 1.28 * faceK;
            const sy2 = Math.sin(a) * r * 1.28;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a + 0.5) * r * 0.8 * faceK, Math.sin(a + 0.5) * r * 0.8);
            ctx.lineTo(sx2, sy2);
            ctx.lineTo(Math.cos(a - 0.5) * r * 0.8 * faceK, Math.sin(a - 0.5) * r * 0.8);
            ctx.closePath();
            ctx.fill();
          }
        }
        ctx.strokeStyle = st.trim;
        ctx.lineWidth = Math.max(1, s * 0.02);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.72 * faceK, r * 0.72, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = st.boss ?? shade(st.color, 26);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.3 * faceK, r * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Rim read at profile: a bright edge line.
        ctx.fillStyle = shade(st.color, 20);
        ctx.fillRect(-r * faceK, -r, r * faceK * 0.9, r * 2);
      }
    }
  }
  ctx.restore();
}

/**
 * Back-mounted quiver (screen space, at the shoulder line). Depth is
 * the caller's: behind the torso when the player faces the camera, in
 * front when they face away — the cape's facing law. When a cape is
 * worn the quiver drops to the off hip so cloth and leather never fight.
 */
export function drawQuiver(
  ctx: CanvasRenderingContext2D,
  st: OffhandStyle,
  x: number,
  y: number,
  s: number,
  lead: number,
  hurt: boolean,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lead * 0.6);
  ctx.fillStyle = hurt ? '#ffffff' : st.color;
  ctx.beginPath();
  chamferRect(ctx, -0.05 * s, -0.16 * s, 0.1 * s, 0.3 * s, 0.03 * s);
  ctx.fill();
  if (!hurt) {
    ctx.fillStyle = st.trim;
    ctx.fillRect(-0.05 * s, -0.16 * s, 0.1 * s, 0.045 * s);
    // Fletching sprouting from the mouth.
    ctx.fillStyle = '#e6e0d0';
    for (const k of [-0.026, 0.004, 0.03]) {
      ctx.fillRect(k * s - 0.008 * s, -0.225 * s, 0.016 * s, 0.07 * s);
    }
  }
  ctx.restore();
}
