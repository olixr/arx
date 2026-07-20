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
}

export interface HelmStyle {
  color: string;
  trim: string;
  kind: 'dome' | 'greathelm' | 'hood' | 'circlet' | 'horned';
  noseGuard?: boolean;
  visor?: 'slit' | 'cross';
  plume?: { color: string };
  horns?: { color: string; size: number };
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
    silhouette: 'robe', pauldron: 'none', chest: 'stitch', skirt: 0.24,
  },
  emberweave_robe: {
    color: '#c4553d', trim: '#e8a23c', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'emblem', emblem: 'bolt',
    skirt: 0.22, skirtSlit: true,
  },
  leather_body: {
    color: '#b08a5c', trim: '#6b4a26', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'none', chest: 'straps', skirt: 0,
  },
  huntsman_jerkin: {
    color: '#3f6b3a', trim: '#2e4a28', metal: '#6b4a26', cls: 'leather',
    silhouette: 'brigandine', pauldron: 'layered', pauldronColor: '#5a3f1e',
    chest: 'straps', skirt: 0.1,
  },
  iron_platebody: {
    color: '#8d9299', trim: '#6a6f7d', metal: '#b0b6be', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'round', chest: 'plate', skirt: 0,
  },
  steel_platebody: {
    color: '#b8bec8', trim: '#c9a23c', metal: '#d4dae2', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'layered', chest: 'plate',
    emblem: 'diamond', skirt: 0,
  },
};

export const HELM_STYLES: Record<string, HelmStyle> = {
  flower_crown: { color: '#e8c04c', trim: '#79a355', kind: 'circlet' },
  iron_helm: { color: '#8d9299', trim: '#6a6f7d', kind: 'dome', noseGuard: true },
  leather_hood: { color: '#8a6a45', trim: '#6b4a26', kind: 'hood' },
  wolfhide_hood: { color: '#6a6f7d', trim: '#9aa0ae', kind: 'hood' },
  runecloth_cowl: { color: '#7a5ac4', trim: '#c9a8e8', kind: 'hood' },
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
  /** Foot-lift differential — the gait beat robe hems sway on. */
  strideSw: number;
}

/**
 * Torso garment + pauldrons. Replaces the fixed tunic: the `tunic`
 * silhouette with no details is stroke-for-stroke the original body.
 */
export function drawTorsoGarment(
  ctx: CanvasRenderingContext2D,
  st: BodyStyle,
  f: TorsoFrame,
): void {
  const { s, tw, ww, th, hurt } = f;
  const col = hurt ? '#ffffff' : st.color;
  const wide = st.silhouette === 'cuirass' ? 1.04 : 1;
  const tww = tw * wide;

  // Robe skirt first — the torso quad and belt seat on top of it. Legs
  // are already painted (they draw before the torso frame), so the
  // skirt naturally covers the thighs; capped short so boots read.
  if (st.skirt > 0) {
    const hemY = 0.02 * s + st.skirt * s;
    const hemW = ww * 1.25;
    const sway = f.strideSw * 0.03 * s;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-ww, -0.075 * s);
    ctx.lineTo(ww, -0.075 * s);
    ctx.lineTo(hemW + sway, hemY);
    ctx.lineTo(-hemW + sway, hemY);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // Trailing-half shade, matching the torso's x=0 split.
      ctx.fillStyle = shade(st.color, -18);
      ctx.beginPath();
      ctx.moveTo(0, -0.075 * s);
      ctx.lineTo(ww, -0.075 * s);
      ctx.lineTo(hemW + sway, hemY);
      ctx.lineTo(sway * 0.5, hemY);
      ctx.closePath();
      ctx.fill();
      // Hem trim band; a center slit lets the stride read through.
      ctx.fillStyle = shade(st.trim, -6);
      ctx.fillRect(-hemW + sway, hemY - 0.028 * s, hemW * 2, 0.028 * s);
      if (st.skirtSlit) {
        ctx.fillStyle = 'rgba(24, 15, 26, 0.55)';
        ctx.beginPath();
        ctx.moveTo(sway * 0.4, hemY - st.skirt * s * 0.55);
        ctx.lineTo(0.035 * s + sway, hemY);
        ctx.lineTo(-0.035 * s + sway, hemY);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // Base torso quad — the original tunic geometry (wider for a cuirass).
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-tww, -th);
  ctx.lineTo(tww, -th);
  ctx.lineTo(ww, 0.02 * s);
  ctx.lineTo(-ww, 0.02 * s);
  ctx.closePath();
  ctx.fill();

  if (!hurt) {
    // Hard shade half — the flat-art form read.
    ctx.fillStyle = shade(st.color, -18);
    ctx.beginPath();
    ctx.moveTo(0, -th);
    ctx.lineTo(tww, -th);
    ctx.lineTo(ww, 0.02 * s);
    ctx.lineTo(0, 0.02 * s);
    ctx.closePath();
    ctx.fill();
    // Lit shoulder cap plane.
    ctx.fillStyle = shade(st.color, 14);
    ctx.beginPath();
    ctx.moveTo(-tww, -th);
    ctx.lineTo(tww, -th);
    ctx.lineTo(tww * 0.9, -th + 0.07 * s);
    ctx.lineTo(-tww * 0.9, -th + 0.07 * s);
    ctx.closePath();
    ctx.fill();

    const metal = st.metal ?? shade(st.color, -20);
    const front = f.backK <= 0.55;

    // Waist: cloth belt, or the cuirass' broader darker fauld band.
    if (st.silhouette === 'cuirass') {
      ctx.fillStyle = shade(st.color, -30);
      ctx.fillRect(-ww - 0.014 * s, -0.09 * s, ww * 2 + 0.028 * s, 0.09 * s);
      ctx.fillStyle = metal;
      ctx.fillRect(-ww - 0.014 * s, -0.09 * s, ww * 2 + 0.028 * s, 0.02 * s);
    } else {
      ctx.fillStyle = shade(st.color, -38);
      ctx.fillRect(-ww - 0.008 * s, -0.075 * s, ww * 2 + 0.016 * s, 0.075 * s);
    }

    // Brigandine: riveted horizontal lames across the chest.
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

    // Chest details are front-face marks — skipped when facing away.
    if (front) {
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
        // The bright breastplate facet — plate's hero read.
        ctx.fillStyle = metal;
        ctx.beginPath();
        chamferRect(ctx, -tw * 0.52, -th * 0.86, tw * 1.04, th * 0.52, 0.035 * s);
        ctx.fill();
        ctx.fillStyle = shade(metal, 16);
        ctx.fillRect(-tw * 0.52, -th * 0.86, tw * 1.04, th * 0.1);
      } else if (st.chest === 'stitch') {
        ctx.strokeStyle = st.trim;
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(0, -th * 0.98);
        ctx.lineTo(0, -0.09 * s);
        ctx.stroke();
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
          // bolt
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
    }
  }

  // Pauldrons ride the shoulder corners — drawn last so they cap the
  // silhouette; the head paints after and overlaps them correctly.
  // Far shoulder first (shaded), near lit; both read from behind too.
  if (st.pauldron !== 'none') {
    const pc = hurt ? '#ffffff' : (st.pauldronColor ?? st.metal ?? shade(st.color, -14));
    for (const side of [-f.lead, f.lead]) {
      const near = side === f.lead;
      const col2 = hurt ? '#ffffff' : near ? shade(pc, 8) : shade(pc, -14);
      const pxc = side * tww;
      const pw = tw * 0.42;
      const ph = 0.1 * s;
      ctx.fillStyle = col2;
      if (st.pauldron === 'layered') {
        // Stacked lames stepping down the arm — max overhang 0.05s.
        for (let i = 0; i < 3; i++) {
          const k2 = 1 - i * 0.22;
          ctx.beginPath();
          chamferRect(
            ctx,
            pxc - pw * k2 + side * (0.03 * s + i * 0.012 * s),
            -th - ph * 0.55 + i * ph * 0.5,
            pw * 2 * k2 * 0.8,
            ph * 0.62,
            0.02 * s,
          );
          ctx.fill();
        }
      } else {
        ctx.beginPath();
        chamferRect(ctx, pxc - pw + side * 0.04 * s, -th - ph * 0.62, pw * 2 * 0.9, ph * 1.25, 0.028 * s);
        ctx.fill();
        if (!hurt) {
          ctx.fillStyle = shade(col2, 14);
          ctx.fillRect(pxc - pw * 0.7 + side * 0.04 * s, -th - ph * 0.55, pw * 1.4 * 0.8, ph * 0.32);
        }
        if (st.pauldron === 'spiked' && !hurt) {
          ctx.fillStyle = col2;
          ctx.beginPath();
          ctx.moveTo(pxc + side * (pw * 0.7 + 0.04 * s), -th - ph * 0.4);
          ctx.lineTo(pxc + side * (pw * 0.7 + 0.11 * s), -th - ph * 0.9);
          ctx.lineTo(pxc + side * (pw * 0.25 + 0.04 * s), -th - ph * 0.6);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }
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
}

/**
 * Styled head gear. `dome` reproduces the original helmet exactly;
 * the other kinds extend the same band grammar the face uses.
 */
export function drawHelmet(ctx: CanvasRenderingContext2D, st: HelmStyle, f: HeadFrame): void {
  const { s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt } = f;
  const mc = hurt ? '#ffffff' : st.color;

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
