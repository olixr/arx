/**
 * THE BARE FRAME — skeleton looks, the skull and the ribcage.
 * Split out of rig.ts on the golems.ts template (foundations F3.4);
 * rig.ts re-exports everything here, so every lab, test and painter
 * keeps its old door.
 */
import { chamferRect } from './shapes.js';
import { shade } from './tint.js';

/* ========================== THE BONE DIALECT ==========================
 * Skeletons are NOT reskinned villagers. When RigPose.skeletal is set,
 * the flesh painters swap out — skull for the head block, ribcage for
 * the torso garment, bare bone strokes with condyle knobs for every
 * limb — while the IK rig, the weapon carriage, capes, helmets, and
 * all eight facing bands keep working untouched. Each variant is its
 * own DESIGN, never a scale-up: the warrior's plain grave-iron frame,
 * the archer's bleached gracile build with frost-lit sockets, the
 * guard's stained heavy bones under a rusted helm, and the champion's
 * crowned, cracked, ember-eyed bulk.
 */
export interface SkeletonLook {
  /** Base bone tone — each variant aged differently in the ground. */
  bone: string;
  /** The dark of the rib cavity behind the rib bars — the depth read. */
  cavity: string;
  /** Light living in the sockets; undefined = the hollow dark stare. */
  glow?: string;
  /** Royalty among the dead wears its crown into battle. */
  crown?: { band: string; gem: string };
  /** Bone thickness multiplier: gracile archer 0.92 → champion 1.3. */
  heavy: number;
  /** Old battle damage: a skull crack down the trailing brow. */
  cracked: boolean;
}
export const SKELETON_LOOKS: Record<string, SkeletonLook> = {
  // The rank-and-file: parchment bone, hollow stare, grave iron.
  skeleton: { bone: '#d6cfba', cavity: '#2a2133', heavy: 1, cracked: false },
  // The archer: bleached lighter, built lighter, a cold frost light
  // behind the eyes — the crypt's patient marksman.
  skeleton_archer: {
    bone: '#dfd9c9',
    cavity: '#2a2133',
    glow: '#9fd8e8',
    heavy: 0.92,
    cracked: false,
  },
  // The guard: iron-stained heavy bone, cracked from old sieges — the
  // door that still stands its post.
  skeleton_guard: { bone: '#c6bda4', cavity: '#292031', heavy: 1.14, cracked: true },
  // The chanter: violet-washed bone, a pale arcane light standing in
  // the sockets — the crypt's one throat that still remembers words.
  skeleton_chanter: {
    bone: '#d6cfdf',
    cavity: '#2a2138',
    glow: '#b49af0',
    heavy: 1.0,
    cracked: false,
  },
  // The champion: aged ivory mass, ember-lit sockets, a gold crown —
  // whoever he was, the grave promoted him.
  skeleton_champion: {
    bone: '#e6ddc4',
    cavity: '#2d1f2e',
    glow: '#ff9a3d',
    crown: { band: '#d4a43c', gem: '#3fa8a0' },
    heavy: 1.3,
    cracked: true,
  },
  // THE ASHEN COURT (the Kingsdelf epic) — the Old Crown's dead, laid
  // properly in the processional vaults and woken slowly by the burn.
  // The kingsman: ash-stained soldier bone, drilled taller than barrow
  // dead, the vaults' grey cold standing in the sockets. UNCRACKED —
  // these were not robbed graves; they were honors.
  skeleton_kingsman: {
    bone: '#cfc6b4',
    cavity: '#2b2130',
    glow: '#9fb4c8',
    heavy: 1.12,
    cracked: false,
  },
  // The crownsguard: parade-perfect after a hundred and fifty years —
  // unbroken discipline reads eerier than any battle scar. The circlet
  // is the OLD realm's silver, tarnished, with the Brand's ember where
  // a royal stone sat: the crown the Silver Line never talks about.
  skeleton_crownsguard: {
    bone: '#c2b49a',
    cavity: '#2e2030',
    glow: '#cfd2e8',
    crown: { band: '#9aa4b2', gem: '#d86a35' },
    heavy: 1.34,
    cracked: false,
  },
  // THE FALLEN KING (the dread crown): old ivory gone gold at the
  // edges — richer bone than any soldier, aged in state, not in the
  // dirt. Gravelight stands in the sockets (the same cold breath his
  // court rises on), and the crown is the barrow's own heavy gold
  // around a grave-lit stone. Cracked — the long watch shows, and the
  // crack is the honest ledger of whoever finally sat him down the
  // first time. The heaviest dead in the ground: the throne fed him
  // well before it kept him.
  skeleton_fallen_king: {
    bone: '#ded2ae',
    cavity: '#241a2c',
    glow: '#7fe8c8',
    crown: { band: '#c9963a', gem: '#58c9a4' },
    heavy: 1.42,
    cracked: true,
  },
  // THE BARROW LORD (the dread crown): barrow-violet bone — the
  // gravecourt's damp stained him where the king aged in state. A
  // cold marsh-light stands in the sockets (grave mist's own breath
  // made permanent), and the circlet is grave SILVER around a mist-
  // pale stone — the quiet court's authority, never the king's gold.
  // UNCRACKED: nobody ever sat him down; the court has held
  // unbroken. Lighter than the king — a keeper, not a warrior.
  skeleton_barrow_lord: {
    bone: '#cdc4d8',
    cavity: '#231c30',
    glow: '#a8c8e0',
    crown: { band: '#8f96a8', gem: '#b9d8ea' },
    heavy: 1.28,
    cracked: false,
  },
};
/** Variant lookup with the rank-and-file as the unknown-id fallback. */
export function skeletonLook(defId: string): SkeletonLook {
  return SKELETON_LOOKS[defId] ?? SKELETON_LOOKS['skeleton']!;
}
export interface SkullFrame {
  s: number;
  headX: number;
  headY: number;
  hw: number;
  hh: number;
  cut: number;
  headR: number;
  fx: number;
  fy: number;
  profileK: number;
  backK: number;
  lead: number;
  hurt: boolean;
  nowMs: number;
  /** 0..1 jaw drop — the combat bite; 0 keeps the jaw seated. */
  gape: number;
}
/**
 * The skull, drawn in the head block's own frame so helmets still fit.
 * Reads skull by SILHOUETTE first: a broad cranium dome stepping in to
 * a narrower maxilla and a separate mandible — then the band-aware
 * face: sockets that slide with the facing and vanish around the
 * corner, a nasal wedge, a tooth row, suture lines on the back band.
 */
export function paintSkull(
  ctx: CanvasRenderingContext2D,
  sk: SkeletonLook,
  f: SkullFrame,
): void {
  const { headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt } = f;
  const bone = hurt ? '#ffffff' : sk.bone;
  const dark = '#241a2e';
  const back = backK > 0.55;
  const jawDrop = f.gape * hh * 0.24;

  // --- cranium: the dome, slightly taller than the flesh block was,
  // ending high so the cheek step-in below can read.
  const crTop = headY - hh * 1.06;
  const crBot = headY + hh * 0.32;
  ctx.fillStyle = bone;
  ctx.beginPath();
  chamferRect(ctx, headX - hw, crTop, hw * 2, crBot - crTop, [cut * 1.15, cut * 1.15, cut * 0.4, cut * 0.4]);
  ctx.fill();

  // --- maxilla: the upper jaw, stepped in from the dome. From behind
  // the step is hidden — the nape runs long instead.
  const mxHw = hw * (back ? 0.8 : 0.72);
  const mxX = headX + fx * hw * 0.08;
  const mxTop = crBot - hh * 0.06;
  const mxBot = headY + hh * (back ? 0.78 : 0.66);
  ctx.beginPath();
  chamferRect(ctx, mxX - mxHw, mxTop, mxHw * 2, mxBot - mxTop, [0, 0, cut * 0.5, cut * 0.5]);
  ctx.fill();

  // --- mandible: its own piece, narrower again, dropping with the
  // gape. Hidden from straight behind (the skull owns that view).
  const mdHw = hw * 0.58;
  const mdTop = headY + hh * 0.6 + jawDrop;
  const mdBot = headY + hh * 1.0 + jawDrop;
  if (!back) {
    // The open mouth: a dark gap behind the dropped jaw.
    if (jawDrop > hh * 0.02) {
      ctx.fillStyle = hurt ? dark : shade(sk.cavity, -6);
      ctx.beginPath();
      chamferRect(ctx, mxX - mdHw * 0.94, mxBot - hh * 0.08, mdHw * 1.88, mdTop - mxBot + hh * 0.14, cut * 0.3);
      ctx.fill();
      ctx.fillStyle = bone;
    }
    ctx.beginPath();
    chamferRect(ctx, mxX - mdHw, mdTop, mdHw * 2, mdBot - mdTop, [0, 0, cut * 0.55, cut * 0.55]);
    ctx.fill();
  }

  if (!hurt) {
    // THE FORM SPLIT, restated for bone: hard shade on the screen-right
    // half, a lit crown band, a temple under-shade rounding the dome.
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, headX - hw, crTop, hw * 2, crBot - crTop, [cut * 1.15, cut * 1.15, cut * 0.4, cut * 0.4]);
    ctx.clip();
    ctx.fillStyle = shade(sk.bone, -9);
    ctx.fillRect(headX, crTop, hw, crBot - crTop);
    ctx.fillStyle = shade(sk.bone, -16);
    ctx.fillRect(headX - hw, crBot - hh * 0.14, hw * 2, hh * 0.14);
    ctx.fillStyle = shade(sk.bone, 9);
    ctx.fillRect(headX - hw, crTop, hw * 2, hh * 0.18);
    ctx.restore();
    // Maxilla sits recessed; the mandible breaks clearly darker — the
    // jaw must read as its OWN bone, not a chin band.
    if (!back) {
      ctx.fillStyle = shade(sk.bone, -8);
      ctx.beginPath();
      chamferRect(ctx, mxX, mxTop, mxHw, mxBot - mxTop, [0, 0, cut * 0.5, 0]);
      ctx.fill();
      ctx.fillStyle = shade(sk.bone, -12);
      ctx.beginPath();
      chamferRect(ctx, mxX - mdHw, mdTop, mdHw * 2, mdBot - mdTop, [0, 0, cut * 0.55, cut * 0.55]);
      ctx.fill();
      ctx.fillStyle = shade(sk.bone, -20);
      ctx.beginPath();
      chamferRect(ctx, mxX, mdTop, mdHw, mdBot - mdTop, [0, 0, cut * 0.55, 0]);
      ctx.fill();
      // The jaw seam: a hard shadow line where mandible meets maxilla.
      ctx.fillStyle = shade(sk.bone, -30);
      ctx.fillRect(mxX - mdHw * 0.92, mdTop - hh * 0.015, mdHw * 1.84, hh * 0.03);
    }
  }

  if (back) {
    // The back of the skull: no face — the suture cross and the
    // occipital shelf are what make the turned head a SKULL still.
    if (!hurt) {
      ctx.strokeStyle = shade(sk.bone, -18);
      ctx.lineWidth = Math.max(1, headR * 0.05);
      ctx.beginPath();
      ctx.moveTo(headX, crTop + hh * 0.22);
      ctx.lineTo(headX, headY + hh * 0.3);
      ctx.moveTo(headX - hw * 0.72, headY - hh * 0.34);
      ctx.lineTo(headX + hw * 0.72, headY - hh * 0.34);
      ctx.stroke();
      ctx.fillStyle = shade(sk.bone, -14);
      ctx.beginPath();
      chamferRect(ctx, mxX - mxHw * 0.9, mxBot - hh * 0.16, mxHw * 1.8, hh * 0.16, [0, 0, cut * 0.5, cut * 0.5]);
      ctx.fill();
    }
  } else {
    // --- the face bands: sockets, nasal wedge, teeth — all sliding
    // with the facing, the far side narrowing through three-quarter
    // and slipping around the corner at profile.
    const pairX = headX + fx * headR * 0.4;
    const sep = headR * (0.44 - 0.18 * profileK);
    const sockY = headY - hh * 0.08;
    const sockW = headR * 0.34;
    const sockH = headR * 0.36;
    const sideK = (es: number): number =>
      es !== lead ? Math.max(0, 1 - Math.max(0, (profileK - 0.5) / 0.28)) : 1;
    // Brow shelf: one heavy shade bar over both sockets — the scowl
    // every skull wears.
    if (!hurt) {
      ctx.fillStyle = shade(sk.bone, -26);
      const bw = (sep + sockW * 1.05) * 2 * (1 - 0.2 * profileK);
      ctx.beginPath();
      chamferRect(ctx, pairX - bw / 2, sockY - sockH * 0.86, bw, headR * 0.16, headR * 0.05);
      ctx.fill();
    }
    for (const es of [-1, 1]) {
      const wK = sideK(es);
      if (wK <= 0.02) continue;
      const w = sockW * wK;
      const cx = pairX + es * sep;
      ctx.fillStyle = dark;
      ctx.beginPath();
      chamferRect(ctx, cx - w / 2, sockY - sockH / 2, w, sockH, headR * 0.09);
      ctx.fill();
      // Zygomatic notch: a shade tick under the socket's outer corner
      // — the cheekbone that makes the socket sit IN bone.
      if (!hurt) {
        ctx.fillStyle = shade(sk.bone, -16);
        ctx.fillRect(cx + es * w * 0.32, sockY + sockH * 0.52, headR * 0.14 * wK, headR * 0.06);
      }
      // The light in the socket: ember or frost, breathing on its own
      // clock, and it OWNS the socket — a furnace behind bone, not a
      // pixel of tint. The rank-and-file keep the hollow dark.
      if (sk.glow && !hurt) {
        const pulse = 0.62 + 0.38 * Math.sin(f.nowMs * 0.004 + es * 1.7);
        ctx.globalAlpha = 0.45 + 0.3 * pulse;
        ctx.fillStyle = shade(sk.glow, -30);
        ctx.beginPath();
        chamferRect(ctx, cx - w * 0.42, sockY - sockH * 0.36, w * 0.84, sockH * 0.74, headR * 0.06);
        ctx.fill();
        ctx.globalAlpha = 0.75 + 0.25 * pulse;
        ctx.fillStyle = sk.glow;
        ctx.fillRect(cx - w * 0.26, sockY - sockH * 0.2, w * 0.52, sockH * 0.46);
        ctx.globalAlpha = 1;
        ctx.fillStyle = shade(sk.glow, 46);
        ctx.fillRect(cx - w * 0.1, sockY - sockH * 0.1, w * 0.2, sockH * 0.24);
      }
    }
    // Nasal aperture: front-on a downward wedge between the sockets;
    // at profile it becomes the notch cut into the leading edge.
    ctx.fillStyle = dark;
    if (profileK > 0.6) {
      const nx = mxX + lead * mxHw * 0.98;
      ctx.beginPath();
      ctx.moveTo(nx, headY + hh * 0.18);
      ctx.lineTo(nx - lead * headR * 0.18, headY + hh * 0.34);
      ctx.lineTo(nx, headY + hh * 0.44);
      ctx.closePath();
      ctx.fill();
    } else {
      const nx = pairX + fx * headR * 0.06;
      ctx.beginPath();
      ctx.moveTo(nx - headR * 0.09, headY + hh * 0.24);
      ctx.lineTo(nx + headR * 0.09, headY + hh * 0.24);
      ctx.lineTo(nx, headY + hh * 0.48);
      ctx.closePath();
      ctx.fill();
    }
    // Teeth: the mandible's top strip in brighter ivory, cut by dark
    // separation ticks — the grin is the skeleton's signature, so it
    // stays bold at every band that shows a face.
    const tK = 1 - 0.35 * profileK;
    const tHw = mdHw * 0.86 * tK;
    const tX = mxX + fx * hw * 0.04;
    ctx.fillStyle = hurt ? '#ffffff' : shade(sk.bone, 14);
    ctx.fillRect(tX - tHw, mdTop, tHw * 2, hh * 0.16);
    if (!hurt) {
      ctx.fillStyle = shade(sk.bone, -40);
      for (const ot of [-0.62, -0.21, 0.21, 0.62]) {
        ctx.fillRect(tX + ot * tHw - headR * 0.028, mdTop, headR * 0.056, hh * 0.15);
      }
    }
    // Jaw hinge: the condyle knob where mandible meets skull — the
    // profile detail that articulates the jaw.
    if (profileK > 0.5 && !hurt) {
      ctx.fillStyle = shade(sk.bone, -12);
      ctx.beginPath();
      ctx.arc(headX - lead * hw * 0.52, headY + hh * 0.52 + jawDrop * 0.4, headR * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Old damage: a crack wandering down the trailing brow. Painted on
  // every band — a wound this old goes all the way around a story.
  if (sk.cracked && !hurt) {
    ctx.strokeStyle = shade(sk.bone, -26);
    ctx.lineWidth = Math.max(1, headR * 0.055);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(headX - lead * hw * 0.3, crTop + hh * 0.1);
    ctx.lineTo(headX - lead * hw * 0.52, headY - hh * 0.5);
    ctx.lineTo(headX - lead * hw * 0.38, headY - hh * 0.16);
    ctx.stroke();
    ctx.lineJoin = 'miter';
  }

  // The crown: a gold band ringing the dome with rising points — worn
  // at every facing (a crown has no back), the gem only where a face
  // is. Painted last so it sits OVER the cracked old bone it outranks.
  if (sk.crown) {
    const bandCol = hurt ? '#ffffff' : sk.crown.band;
    const bandY = crTop + hh * 0.3;
    const bandH = hh * 0.26;
    ctx.fillStyle = bandCol;
    ctx.fillRect(headX - hw * 0.98, bandY, hw * 1.96, bandH);
    if (!hurt) {
      ctx.fillStyle = shade(sk.crown.band, -14);
      ctx.fillRect(headX, bandY, hw * 0.98, bandH);
      ctx.fillStyle = shade(sk.crown.band, 18);
      ctx.fillRect(headX - hw * 0.98, bandY, hw * 1.96, bandH * 0.3);
    }
    // Points: center tallest, the pair beside it shorter — every other
    // one shaded so the ring reads as depth, not a paper cutout.
    for (const [i, ot] of [-0.68, 0, 0.68].entries()) {
      const bx = headX + ot * hw;
      const hgt = hh * (ot === 0 ? 0.46 : 0.32);
      ctx.fillStyle = !hurt && i % 2 === 0 ? shade(sk.crown.band, -8) : bandCol;
      ctx.beginPath();
      ctx.moveTo(bx - hw * 0.14, bandY + bandH * 0.1);
      ctx.lineTo(bx + hw * 0.14, bandY + bandH * 0.1);
      ctx.lineTo(bx + ot * hw * 0.06, bandY - hgt);
      ctx.closePath();
      ctx.fill();
    }
    if (!back && !hurt) {
      const gx = headX + fx * hw * 0.34;
      ctx.fillStyle = sk.crown.gem;
      ctx.fillRect(gx - headR * 0.07, bandY + bandH * 0.24, headR * 0.14, bandH * 0.55);
      ctx.fillStyle = shade(sk.crown.gem, 40);
      ctx.fillRect(gx - headR * 0.05, bandY + bandH * 0.3, headR * 0.055, bandH * 0.22);
    }
  }
}
export interface RibcageFrame {
  s: number;
  tw: number;
  ww: number;
  th: number;
  fx: number;
  lead: number;
  profileK: number;
  backK: number;
  hurt: boolean;
}
/** Rib row positions down the barrel (fractions of its height). */
export const RIB_ROWS = [0.1, 0.36, 0.62, 0.88] as const;
/**
 * The skeletal torso, drawn in the garment's local frame (y=0 at the
 * hip line, −th at the shoulders): clavicle bar and shoulder knobs, a
 * rib barrel over the dark cavity with the sternum riding the leading
 * edge, scapulae and spine from behind — and below it a REAL gap where
 * a waist should be, crossed only by vertebrae down to the iliac-wing
 * pelvis. The see-through waist is the whole-body skeleton read.
 */
export function paintRibcage(
  ctx: CanvasRenderingContext2D,
  sk: SkeletonLook,
  f: RibcageFrame,
): void {
  const { s, tw, ww, th, fx, profileK, backK, hurt } = f;
  const hv = sk.heavy;
  const bone = hurt ? '#ffffff' : sk.bone;
  const back = backK > 0.55;

  // Barrel bounds: shoulders down to mid-torso.
  const y0 = -th + 0.055 * s;
  const y1 = -th * 0.48;
  const wTop = tw * 0.9;
  const wBot = ww * 1.0;
  const wAt = (t: number): number => wTop + (wBot - wTop) * t;

  const barrel = (): void => {
    ctx.beginPath();
    ctx.moveTo(-wTop, y0);
    ctx.lineTo(wTop, y0);
    ctx.lineTo(wBot, y1);
    ctx.lineTo(-wBot, y1);
    ctx.closePath();
  };

  if (back) {
    // From behind the cage is CLOSED: solid bone back, rib seams, the
    // spine column, and the two scapula plates riding the shoulders.
    ctx.fillStyle = bone;
    barrel();
    ctx.fill();
    if (!hurt) {
      ctx.save();
      barrel();
      ctx.clip();
      ctx.fillStyle = shade(sk.bone, -9);
      ctx.fillRect(0, y0, wTop, y1 - y0);
      ctx.strokeStyle = shade(sk.bone, -15);
      ctx.lineWidth = Math.max(1, 0.02 * s);
      for (const t of RIB_ROWS) {
        const ry = y0 + (y1 - y0) * t;
        ctx.beginPath();
        ctx.moveTo(-wAt(t), ry + 0.012 * s);
        ctx.quadraticCurveTo(0, ry - 0.022 * s, wAt(t), ry + 0.012 * s);
        ctx.stroke();
      }
      ctx.restore();
      // Scapulae: two proud blades high on the back, angled outward,
      // each with its own under-shade so they STAND OFF the rib wall.
      const spX = fx * tw * 0.3;
      for (const es of [-1, 1]) {
        ctx.fillStyle = shade(sk.bone, es > 0 ? 2 : 12);
        ctx.beginPath();
        ctx.moveTo(spX + es * tw * 0.18, y0 + 0.012 * s);
        ctx.lineTo(spX + es * tw * 0.88, y0 + 0.03 * s);
        ctx.lineTo(spX + es * tw * 0.6, y0 + 0.22 * s);
        ctx.lineTo(spX + es * tw * 0.2, y0 + 0.16 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(sk.bone, -22);
        ctx.beginPath();
        ctx.moveTo(spX + es * tw * 0.6, y0 + 0.22 * s);
        ctx.lineTo(spX + es * tw * 0.88, y0 + 0.03 * s);
        ctx.lineTo(spX + es * tw * 0.86, y0 + 0.075 * s);
        ctx.lineTo(spX + es * tw * 0.62, y0 + 0.245 * s);
        ctx.closePath();
        ctx.fill();
      }
      // The spine bar overlays the seam of the two halves.
      ctx.fillStyle = shade(sk.bone, -6);
      ctx.fillRect(spX - 0.032 * s, y0, 0.064 * s, y1 - y0);
      ctx.fillStyle = shade(sk.bone, -20);
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(spX - 0.032 * s, y0 + (y1 - y0) * (0.14 + i * 0.24), 0.064 * s, 0.012 * s);
      }
    }
  } else {
    // Facing the camera (and every three-quarter): the OPEN cage.
    // Dark cavity first, rib bars over it, sternum over the ribs. The
    // cage only reads when the cavity WINS between the ribs — thin
    // bright bars over deep dark, never a pale slab with seams.
    ctx.fillStyle = hurt ? '#3a3346' : shade(sk.cavity, -8);
    barrel();
    ctx.fill();
    // Ribs: four near-horizontal bars filling the cage evenly — bone
    // band, dark band, bone band: the classic cage rhythm. A gentle
    // center dip bows each pair toward the sternum, and the whole row
    // tilts down-forward as the body turns to profile.
    const span = y1 - y0;
    const rh = Math.min(0.036 * s * (1 + 0.18 * (hv - 1)), (span / RIB_ROWS.length) * 0.58);
    const tilt = fx * 0.042 * s;
    const dip = (1 - profileK) * 0.016 * s;
    for (const [i, t] of RIB_ROWS.entries()) {
      const ry = y0 + span * t;
      const hwR = wAt(t) * 0.97;
      const cxR = fx * hwR * 0.12;
      for (const es of [-1, 1]) {
        ctx.fillStyle =
          hurt ? '#ffffff' : es > 0 ? shade(sk.bone, -6 - i * 2) : shade(sk.bone, 6 - i * 2);
        ctx.beginPath();
        ctx.moveTo(cxR, ry + dip - rh / 2);
        ctx.lineTo(es * hwR, ry + es * tilt - rh / 2);
        ctx.lineTo(es * hwR, ry + es * tilt + rh / 2);
        ctx.lineTo(cxR, ry + dip + rh / 2);
        ctx.closePath();
        ctx.fill();
      }
    }
    // Sternum: a narrow breastbone bar running the cage's full height,
    // a step brighter than the ribs so the center line reads, sliding
    // from center to the leading edge with the turn.
    const stX = fx * (wTop * 0.86);
    const stW = 0.048 * s * hv;
    ctx.fillStyle = hurt ? '#ffffff' : shade(sk.bone, 10);
    ctx.beginPath();
    chamferRect(ctx, stX - stW / 2, y0 - 0.01 * s, stW, span * 0.92, 0.016 * s);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = shade(sk.bone, -14);
      ctx.fillRect(stX + stW * 0.14, y0 - 0.01 * s, stW * 0.36, span * 0.88);
      // Xiphoid tip: the sternum ends in a point, like the real bone.
      ctx.fillStyle = shade(sk.bone, -4);
      ctx.beginPath();
      ctx.moveTo(stX - stW / 2, y0 + span * 0.9);
      ctx.lineTo(stX + stW / 2, y0 + span * 0.9);
      ctx.lineTo(stX, y0 + span * 1.04);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Clavicle bar + shoulder knobs: the coat-hanger the arms hang from.
  ctx.fillStyle = bone;
  ctx.beginPath();
  chamferRect(ctx, -tw * 0.98, y0 - 0.055 * s, tw * 1.96, 0.04 * s, 0.014 * s);
  ctx.fill();
  if (!hurt) {
    ctx.fillStyle = shade(sk.bone, -12);
    ctx.fillRect(0, y0 - 0.055 * s, tw * 0.98, 0.04 * s);
  }
  for (const es of [-1, 1]) {
    ctx.fillStyle = hurt ? '#ffffff' : shade(sk.bone, es > 0 ? -10 : 4);
    ctx.beginPath();
    ctx.arc(es * tw * 0.94, y0 - 0.02 * s, Math.max(1.8, 0.048 * s * hv), 0, Math.PI * 2);
    ctx.fill();
  }

  // The waist: NOTHING but spine. Three vertebra beads crossing the
  // gap — whatever is behind the body (grass, cape, the far arm)
  // shows through beside them. This gap is the skeleton.
  const spX = fx * tw * 0.22;
  const gapTop = y1 + 0.012 * s;
  const pelvTop = -0.14 * s;
  const beadH = 0.038 * s;
  const step = (pelvTop - gapTop - beadH) / 2;
  for (let i = 0; i < 3; i++) {
    const by = gapTop + i * step;
    ctx.fillStyle = hurt ? '#ffffff' : shade(sk.bone, i % 2 === 0 ? 0 : -8);
    ctx.beginPath();
    chamferRect(ctx, spX - 0.042 * s * hv, by, 0.084 * s * hv, beadH, 0.012 * s);
    ctx.fill();
  }

  // Pelvis: iliac wings flaring up-and-out from the sacrum wedge, the
  // dark inlet notch under it — a bone bowl, not a belt line. Each
  // wing carries a crest highlight so the flare reads as a rim.
  for (const es of [-1, 1]) {
    ctx.fillStyle = hurt ? '#ffffff' : shade(sk.bone, es > 0 ? -10 : 4);
    ctx.beginPath();
    ctx.moveTo(spX + es * 0.018 * s, pelvTop + 0.024 * s);
    ctx.lineTo(es * ww * 1.12, pelvTop - 0.012 * s);
    ctx.lineTo(es * ww * 0.8, 0.042 * s);
    ctx.lineTo(spX + es * 0.028 * s, 0.05 * s);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // The crest: a lit lip along the wing's top edge.
      ctx.strokeStyle = shade(sk.bone, es > 0 ? 4 : 16);
      ctx.lineWidth = Math.max(1, 0.02 * s);
      ctx.beginPath();
      ctx.moveTo(spX + es * 0.02 * s, pelvTop + 0.02 * s);
      ctx.lineTo(es * ww * 1.1, pelvTop - 0.01 * s);
      ctx.stroke();
    }
  }
  ctx.fillStyle = bone;
  ctx.beginPath();
  chamferRect(ctx, spX - 0.052 * s * hv, pelvTop - 0.008 * s, 0.104 * s * hv, 0.07 * s, 0.016 * s);
  ctx.fill();
  ctx.fillStyle = hurt ? '#3a3346' : sk.cavity;
  ctx.beginPath();
  ctx.moveTo(spX - 0.036 * s, 0.022 * s);
  ctx.lineTo(spX + 0.036 * s, 0.022 * s);
  ctx.lineTo(spX, 0.058 * s);
  ctx.closePath();
  ctx.fill();
}
