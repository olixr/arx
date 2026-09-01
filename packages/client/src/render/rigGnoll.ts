/**
 * THE HYENA GRIN — the gnoll.
 * Split out of rig.ts on the golems.ts template (foundations F3.4);
 * rig.ts re-exports everything here, so every lab, test and painter
 * keeps its old door.
 */
import { chamferRect } from './shapes.js';
import { shade } from './tint.js';
import { KoboldHeadFrame, KoboldHumpFrame } from './rigKobold.js';

/**
 * THE FUR DIALECT — the gnoll, the hyena-headed scavenger. Like the
 * bone and scale dialects it swaps head, hair, and face wholesale and
 * adds species mass (crest hump, bushy tail, bare paws) while the IK
 * rig, carriage, and facing bands keep working untouched. Each variant
 * is its own DESIGN, never a scale-up: the rank-and-file skulker in
 * its speckled coat, and the packlord's storm-dark bulk under the
 * standing crest. The rank-and-file additionally rolls a COAT CLUSTER
 * from its spawn seed — a warband reads as individuals from one stock,
 * never as one body stamped four times.
 */
export interface GnollLook {
  /** Coat base — the speckled gray-brown fur that carries the body. */
  fur: string;
  /** Pale underfur: throat, belly panel, jaw underside, tail's low edge. */
  underfur: string;
  /** Bare umber hide where the fur thins: paw pads and the ear dish. */
  skin: string;
  /** Speckle ink — the hyena's broken spot field over the coat. */
  spot: string;
  /** The bristled crest: crown, nape, and down the hunched back. */
  mane: string;
  /**
   * The dark face mask — brow ledge, muzzle bridge, eye sockets, claw
   * ink, the dorsal saddle. The menace tone: everything that scowls
   * wears it.
   */
  mask: string;
  /** The lit eye bead — small, close-set, watching the weakest. */
  eye: string;
  /** The bare nose pad at the muzzle tip. */
  nose: string;
  /** Frame multiplier: jaw mass, ear reach, crest height, tail girth. */
  heavy: number;
  /** Battle-worn: notched ear and a muzzle scar — the packlord's ledger. */
  scarred?: boolean;
  /** Spawn seed carried on the resolved look — drives the spot field. */
  seed?: number;
}
export const GNOLL_LOOKS: Record<string, GnollLook> = {
  // The rank-and-file skulker: a dusty, dirt-matted coat over umber
  // hide, a dark hyena mask, a rust-brown roach, hungry amber eyes —
  // brave in fours.
  gnoll: {
    fur: '#7f6d4c',
    underfur: '#bfae87',
    skin: '#8a7358',
    spot: '#4c4030',
    mane: '#5c3d22',
    mask: '#42372a',
    eye: '#f2a93a',
    nose: '#241d17',
    heavy: 1,
  },
  // The packlord: storm-dark coat, an iron-gray standing crest twice
  // the skulker's reach, a notched ear and an old muzzle scar — the
  // warband's one broad-backed silhouette.
  gnoll_champion: {
    fur: '#4e463c',
    underfur: '#948a70',
    skin: '#6b5f4e',
    spot: '#332c24',
    mane: '#3d3f4c',
    mask: '#302a24',
    eye: '#ffd24a',
    nose: '#1d1815',
    heavy: 1.3,
    scarred: true,
  },
  // THE MATRIARCH (the dread crown): night-dark coat under a pale
  // bone-silver crest — the ONE gnoll whose roach runs cold. Every
  // other coat keeps the warm-crest reference law; the crown breaks
  // it on purpose, and the value gap is even wider than the law
  // asks, so her silhouette reads across the whole fort. Blood-
  // amber eyes, scarred: the mother's ledger is longer than any
  // packlord's.
  gnoll_matriarch: {
    fur: '#48413a',
    underfur: '#8c8274',
    skin: '#6b5f4e',
    spot: '#342d25',
    mane: '#b8b4a8',
    mask: '#332c25',
    eye: '#ff9a3d',
    nose: '#241d17',
    heavy: 1.5,
    scarred: true,
  },
};
/**
 * THE COAT CLUSTERS — four curated colorways for the rank-and-file,
 * picked by spawn seed so a pack sorts into family groups (the beasts'
 * one-line fur-tint law, grown to a wardrobe): dust, ash, russet, and
 * the bone-pale runt. Champions never roll — a packlord is a DESIGN.
 */
export const GNOLL_CLUSTERS: ReadonlyArray<
  Pick<GnollLook, 'fur' | 'underfur' | 'spot' | 'mane' | 'mask'>
> = [
  // The roach runs WARM against every coat (the reference hyena's
  // rust crest) — value-separated from the fur so it reads at scale.
  { fur: '#7f6d4c', underfur: '#bfae87', spot: '#4c4030', mane: '#5c3d22', mask: '#42372a' }, // dust
  { fur: '#65625a', underfur: '#a19e92', spot: '#37342e', mane: '#4a4a54', mask: '#35352f' }, // ash
  { fur: '#785a3c', underfur: '#b49e7c', spot: '#44342a', mane: '#63351f', mask: '#3d3026' }, // russet
  { fur: '#8a8164', underfur: '#c6bb9a', spot: '#4e4736', mane: '#6b5330', mask: '#443c30' }, // bone-pale
];
export const GNOLL_LOOK_CACHE = new Map<string, GnollLook>();
/**
 * Variant lookup with the rank-and-file as the unknown-id fallback.
 * The seed (spawn eid) rolls the skulker's coat cluster plus a small
 * shade jitter; named looks (the packlord) hold their authored design.
 * Resolved looks are cached — this runs per body per frame.
 */
export function gnollLook(defId: string, seed = 0): GnollLook {
  const base = GNOLL_LOOKS[defId] ?? GNOLL_LOOKS['gnoll']!;
  const key = `${defId}|${seed & 0xff}`;
  const hit = GNOLL_LOOK_CACHE.get(key);
  if (hit) return hit;
  let look: GnollLook;
  if (defId === 'gnoll') {
    // Hash the seed before picking: knot members spawn with
    // CONSECUTIVE eids, and raw high bits dressed a whole pack in one
    // coat — the hash spreads a spawned warband across the clusters.
    const h = (seed * 2654435761) | 0;
    const cl = GNOLL_CLUSTERS[(h >>> 8) & 3]!;
    const jit = (((h >>> 12) & 7) - 3) * 2;
    look = {
      ...base,
      fur: shade(cl.fur, jit),
      underfur: cl.underfur,
      spot: cl.spot,
      mane: shade(cl.mane, jit),
      mask: cl.mask,
      seed,
    };
  } else {
    // Named looks hold their authored design — only the spot field
    // stays the body's own.
    look = { ...base, seed };
  }
  GNOLL_LOOK_CACHE.set(key, look);
  return look;
}
/**
 * The gnoll head, drawn in the head block's own frame. Reads gnoll by
 * SILHOUETTE first: a broad low skull between TALL ROUND ears, a
 * bristled crest breaking off the crown, and a BLUNT DEEP muzzle — a
 * bone-cracking jaw, not the wolf's spike — ending in a broad nose
 * with the underbite's teeth proud of the lip. Muzzle length leads the
 * facing (short face-on, run out at profile) and the whole face is
 * gone from behind (the cattle muzzle law): occiput fur, spot courses,
 * ear backs, and the crest pouring down the nape.
 */
export function paintGnollHead(
  ctx: CanvasRenderingContext2D,
  gn: GnollLook,
  f: KoboldHeadFrame,
  seed = 0,
): void {
  const { headX, headY, hw, hh, cut, fx, fy, profileK, backK, lead, hurt } = f;
  const hv = gn.heavy;
  const fur = hurt ? '#ffffff' : gn.fur;
  const under = hurt ? '#ffffff' : gn.underfur;
  const mask = hurt ? '#ffffff' : gn.mask;
  const back = backK > 0.55;
  const nearSide = lead;

  // --- the skull box: broad and LOW — all jaw and cheek, the brow
  // sunk between the shoulders. Wider than the old cut (the hyena's
  // cheek mass); the crown chamfers run HEAVY so the forehead reads
  // as the dome the Roman muzzle line falls away from.
  const gw = hw * 1.2;
  const crTop = headY - hh * 0.66;
  const crBot = headY + hh * 0.58;

  // --- THE MANE HOOD, laid down FIRST so the skull laps its base: a
  // connected sawtooth ridge breaking off the crown and pouring back
  // off the facing toward the hump — one ragged mass, never a row of
  // pasted thorns. Face-on it reads end-on as a bristle halo behind
  // the crown; at profile the full ridge runs crown → nape; from
  // behind it owns the whole occiput (drawn again there, wider).
  const hoodSpread = gw * (0.6 - 0.36 * profileK) * (1 - backK * 0.2) + backK * gw * 0.3;
  // Taller than the first cut: the roach is half the hyena's
  // silhouette — it must read from every band, not just profile.
  const hoodTall = hh * (0.62 + 0.58 * (hv - 1)) * (1 + 0.12 * profileK);
  const drawHood = (baseYLift: number, teeth: number): void => {
    const bx = (t: number): number =>
      headX + (1 - 2 * t) * hoodSpread - fx * gw * (0.08 + 0.9 * t) * (1 - backK);
    const by = (t: number): number =>
      crTop + hh * (0.04 + (0.5 * profileK + 0.1) * t * (1 - backK)) + baseYLift;
    ctx.beginPath();
    ctx.moveTo(bx(0) + fx * gw * 0.1, by(0) + hh * 0.3);
    for (let i = 0; i < teeth; i++) {
      const t = i / (teeth - 1);
      // Face-on the ridge is seen END-ON: the center locks stand
      // tallest and the corners taper away, so the silhouette above
      // the crown reads as one bristled mound — corner spikes at
      // full height read as a pair of horns.
      const centerBias = 1 - 0.45 * (1 - profileK) * Math.abs(t - 0.5) * 2;
      const tall = hoodTall * (0.72 + 0.38 * Math.sin(i * 2.3 + 1.1)) * centerBias;
      ctx.lineTo(bx(t) - fx * gw * 0.24 + (0.5 - t) * gw * 0.12, by(t) - tall);
      // The valley between bristles holds HALF the ridge height — the
      // roach is one bristled MOUND with a torn edge, never a picket
      // fence of separate thorns over a bare crown.
      ctx.lineTo(bx(Math.min(1, t + 0.75 / (teeth - 1))), by(t) - tall * 0.45);
    }
    // The nape skirt: the ridge falls off the trailing edge toward
    // the shoulder hump in ragged locks — never one flat-edged slab.
    ctx.lineTo(bx(1) - fx * gw * 0.3, crBot + hh * 0.1 * (1 - backK * 0.5));
    ctx.lineTo(bx(0.82) - fx * gw * 0.2, crBot - hh * 0.08);
    ctx.lineTo(bx(0.62), crBot + hh * 0.18 * (1 - backK * 0.5));
    ctx.lineTo(bx(0.5), crBot - hh * 0.05);
    ctx.closePath();
    ctx.fill();
  };
  if (!hurt) {
    ctx.fillStyle = gn.mane;
    drawHood(0, 6);
    if (gn.scarred) {
      // The packlord's frost: pale tips over the iron ridge — age worn
      // as rank. A second, smaller sawtooth inset into the first.
      ctx.fillStyle = shade(gn.mane, 42);
      const bx = (t: number): number =>
        headX + (1 - 2 * t) * hoodSpread * 0.86 - fx * gw * (0.08 + 0.86 * t) * (1 - backK);
      for (let i = 0; i < 4; i++) {
        const t = i / 3;
        const tall = hoodTall * (0.78 + 0.34 * Math.sin(i * 2.3 + 1.4));
        const px = bx(t) - fx * gw * 0.22 + (0.5 - t) * gw * 0.1;
        const py = crTop + hh * (0.04 + 0.5 * profileK * t * (1 - backK)) - tall;
        ctx.beginPath();
        ctx.moveTo(px - gw * 0.055, py + hoodTall * 0.3);
        ctx.lineTo(px, py);
        ctx.lineTo(px + gw * 0.055, py + hoodTall * 0.3);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // ==================== THE TRUE PROFILE ====================
  // The E/W bands get an AUTHORED side view (the goblin law, spoken
  // fur): every blended feature extrapolated to profileK 1.0 read as
  // a squashed front view wearing a snout — the skull box kept its
  // face-on width, so the muzzle never even cleared the cheek. Past
  // 0.9 the whole head swaps for a bespoke silhouette instead: ONE
  // long skull-to-muzzle outline (occiput → domed crown → brow step →
  // ROMAN SLOPE → proud blunt tip → deep masseter jaw), ONE
  // rear-rooted ear, ONE hooded eye, ONE grin rising to its cheek
  // corner. The blends below only ever serve the three-quarter bands;
  // NOTHING extrapolates here.
  if (profileK > 0.9 && !back) {
    const fwd = fx >= 0 ? 1 : -1;
    const pJaw = f.gape * hh * 0.46;
    const occX = headX - fwd * gw * 0.95; // the occiput wall
    const browX = headX + fwd * gw * 0.36; // the forehead step
    const tipPX = headX + fwd * gw * 1.3; // the blunt tip, PROUD of the cheek
    const browPY = headY - hh * 0.34;
    const nosePY = headY + hh * 0.02;
    // The chin runs DEEP — a shallow chin under the slope drifts the
    // read back toward the wolf's spike.
    const chinY = headY + hh * 0.56;
    const jawPY = headY + hh * 0.7;
    const ccp = cut * 0.6;

    // ONE ear at the occiput, leaning BACK off the crown — the dish
    // reads three-quarter from the side, never a floating ring.
    {
      const er = hh * 0.33 * (0.95 + 0.15 * hv);
      const dh = hh * 0.55 * (0.92 + 0.16 * hv);
      const notched = !!gn.scarred;
      ctx.save();
      ctx.translate(occX + fwd * gw * 0.3, crTop + hh * 0.14);
      ctx.rotate(-fwd * 0.46);
      ctx.fillStyle = hurt ? '#ffffff' : shade(gn.fur, -8);
      ctx.beginPath();
      ctx.moveTo(-er * 0.92, 0);
      ctx.lineTo(-er, -dh + er);
      ctx.arc(0, -dh + er, er, Math.PI, notched ? Math.PI * 1.6 : Math.PI * 2);
      if (notched) {
        ctx.lineTo(er * 0.34, -dh + er * 0.66);
        ctx.lineTo(er, -dh + er * 0.94);
      }
      ctx.lineTo(er * 0.92, 0);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        ctx.strokeStyle = shade(gn.fur, -20);
        ctx.lineWidth = Math.max(1, er * 0.13);
        ctx.stroke();
        // The cavity sits OBLIQUE — narrowed and pushed toward the
        // face side, the way a turned dish forecloses.
        ctx.fillStyle = shade(gn.skin, -46);
        ctx.beginPath();
        ctx.ellipse(fwd * er * 0.24, -dh + er * 0.96, er * 0.56, er * 0.84, 0, 0, Math.PI * 2);
        ctx.fill();
        if (!notched) {
          const nickT = 0.34 + 0.3 * (((seed >>> 3) & 7) / 7);
          ctx.fillStyle = mask;
          ctx.beginPath();
          ctx.moveTo(-er * 1.02, -dh * nickT);
          ctx.lineTo(-er * 0.52, -dh * nickT - er * 0.2);
          ctx.lineTo(-er * 1.02, -dh * nickT - er * 0.38);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // The side silhouette: ONE closed outline, skull through muzzle —
    // longer than it is tall, the way a hyena's head actually reads.
    const headPath = (): void => {
      ctx.beginPath();
      ctx.moveTo(occX, jawPY - cut); // rear jaw chamfer
      ctx.lineTo(occX, crTop + cut * 1.4); // the occiput wall
      ctx.quadraticCurveTo(occX, crTop, occX + fwd * cut * 1.6, crTop);
      // The crown DOMES forward and falls to the brow step...
      ctx.quadraticCurveTo(headX - fwd * gw * 0.08, crTop - hh * 0.07, browX - fwd * cut * 0.8, crTop + hh * 0.03);
      ctx.lineTo(browX, browPY);
      // ...then THE ROMAN SLOPE: convex, brow to nose, one fall.
      ctx.quadraticCurveTo((browX + tipPX) / 2, browPY + (nosePY - browPY) * 0.26, tipPX - fwd * ccp, nosePY);
      ctx.lineTo(tipPX, nosePY + ccp); // the blunt front: straight down
      ctx.lineTo(tipPX, chinY - ccp);
      ctx.lineTo(tipPX - fwd * ccp * 1.6, chinY); // the chin corner
      // The throat line rises back into the DEEP masseter jaw.
      ctx.lineTo(headX + fwd * gw * 0.4, jawPY);
      ctx.lineTo(occX + fwd * cut * 1.2, jawPY);
      ctx.closePath();
    };
    ctx.fillStyle = fur;
    headPath();
    ctx.fill();
    if (!hurt) {
      ctx.save();
      headPath();
      ctx.clip();
      // The muzzle wedge forward of the brow is the LIGHTER volume.
      ctx.fillStyle = shade(gn.fur, 7);
      ctx.fillRect(Math.min(browX, tipPX), browPY - hh * 0.14, Math.abs(tipPX - browX), jawPY - browPY + hh * 0.2);
      // Rear form shade seats the occiput...
      ctx.fillStyle = shade(gn.fur, -10);
      ctx.fillRect(Math.min(occX, occX + fwd * gw * 0.4), crTop, gw * 0.4, jawPY - crTop);
      // ...a lit band tops the dome...
      ctx.fillStyle = shade(gn.fur, 9);
      ctx.fillRect(Math.min(occX, browX), crTop, Math.abs(browX - occX), hh * 0.12);
      // ...and the jowl under-shade carries the jaw's weight.
      ctx.fillStyle = shade(gn.fur, -20);
      ctx.fillRect(Math.min(occX, tipPX), jawPY - hh * 0.14, Math.abs(tipPX - occX), hh * 0.14);
      // THE BRIDGE SADDLE rides the slope and stops before the pad.
      ctx.fillStyle = mask;
      ctx.beginPath();
      ctx.moveTo(browX - fwd * cut * 0.5, browPY + hh * 0.02);
      ctx.lineTo(tipPX - fwd * hh * 0.24, nosePY + hh * 0.03);
      ctx.lineTo(tipPX - fwd * hh * 0.24, nosePY + hh * 0.22);
      ctx.lineTo(browX - fwd * cut * 0.5, browPY + hh * 0.3);
      ctx.closePath();
      ctx.fill();
      // The spot field walks the cheek and neck.
      ctx.fillStyle = shade(gn.spot, 0);
      for (let i = 0; i < 4; i++) {
        const h2 = ((seed >>> (i * 3)) ^ (seed * 41 + i * 97)) | 0;
        const sxr = (h2 & 15) / 15;
        const syr = ((h2 >> 4) & 15) / 15;
        const bx2 = occX + fwd * gw * (0.2 + 0.62 * sxr);
        const by2 = crTop + (jawPY - crTop) * (0.3 + 0.4 * syr);
        const br = hh * (0.055 + 0.03 * (((h2 >> 8) & 3) / 3));
        ctx.beginPath();
        ctx.ellipse(bx2, by2, br * 1.25, br, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // The cheek ruff flares BACK off the jaw hinge — the sideburn.
    if (!hurt) {
      const rx0 = occX + fwd * gw * 0.3;
      ctx.fillStyle = shade(gn.fur, -5);
      ctx.beginPath();
      ctx.moveTo(rx0, headY - hh * 0.06);
      ctx.lineTo(rx0 - fwd * gw * 0.34, headY + hh * 0.12);
      ctx.lineTo(rx0 - fwd * gw * 0.04, headY + hh * 0.24);
      ctx.lineTo(rx0 - fwd * gw * 0.3, headY + hh * 0.44);
      ctx.lineTo(rx0 - fwd * gw * 0.02, headY + hh * 0.5);
      ctx.lineTo(rx0 - fwd * gw * 0.2, headY + hh * 0.66);
      ctx.lineTo(rx0 + fwd * gw * 0.08, headY + hh * 0.6);
      ctx.closePath();
      ctx.fill();
    }

    // THE BROW LEDGE hoods the one eye, angled down the slope.
    const eX = browX - fwd * gw * 0.04;
    const eY = browPY + hh * 0.18;
    if (!hurt) {
      ctx.fillStyle = mask;
      ctx.beginPath();
      ctx.moveTo(browX - fwd * gw * 0.34, browPY - hh * 0.14);
      ctx.lineTo(browX + fwd * cut * 0.9, browPY - hh * 0.03);
      ctx.lineTo(browX + fwd * cut * 0.9, browPY + hh * 0.12);
      ctx.lineTo(browX - fwd * gw * 0.36, browPY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(gn.mask, -12);
      ctx.beginPath();
      ctx.ellipse(eX, eY, hh * 0.12, hh * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = gn.eye;
      ctx.beginPath();
      ctx.arc(eX, eY, hh * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = hurt ? '#241a2e' : gn.eye;
    ctx.beginPath();
    ctx.arc(eX, eY, hh * 0.085, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = '#241a2e';
      ctx.beginPath();
      ctx.arc(eX + fwd * hh * 0.024, eY + hh * 0.012, hh * 0.044, 0, Math.PI * 2);
      ctx.fill();
    }

    // THE NOSE PAD wraps the blunt front — taller than wide, seen on.
    ctx.fillStyle = hurt ? '#ffffff' : gn.nose;
    ctx.beginPath();
    chamferRect(ctx, Math.min(tipPX - fwd * hh * 0.28, tipPX + fwd * hh * 0.01), nosePY - hh * 0.02, hh * 0.29, hh * 0.36, ccp * 0.8);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = shade(gn.nose, 24);
      ctx.beginPath();
      ctx.ellipse(tipPX - fwd * hh * 0.16, nosePY + hh * 0.06, hh * 0.07, hh * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // THE MOUTH: the shut grin, or the forward-gaping cackle.
    const mouthPY = headY + hh * 0.34;
    if (pJaw > hh * 0.03) {
      ctx.fillStyle = hurt ? '#241a2e' : '#2e1418';
      ctx.beginPath();
      ctx.moveTo(tipPX - fwd * hh * 0.04, mouthPY - hh * 0.02);
      ctx.lineTo(headX + fwd * gw * 0.34, mouthPY + hh * 0.04);
      ctx.lineTo(headX + fwd * gw * 0.4, mouthPY + hh * 0.16 + pJaw * 0.55);
      ctx.lineTo(tipPX - fwd * hh * 0.01, mouthPY + hh * 0.12 + pJaw);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = '#7c3234';
        ctx.beginPath();
        ctx.ellipse(headX + fwd * gw * 0.75, mouthPY + hh * 0.1 + pJaw * 0.5, gw * 0.2, hh * 0.06 + pJaw * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
        // The upper row hangs into the maw...
        ctx.fillStyle = '#efe6cf';
        for (const t of [0.2, 0.5, 0.78]) {
          const txx = tipPX + (headX + fwd * gw * 0.34 - tipPX) * t;
          const tyy = mouthPY - hh * 0.01 + hh * 0.05 * t;
          ctx.beginPath();
          ctx.moveTo(txx - hh * 0.05, tyy);
          ctx.lineTo(txx, tyy + hh * (t === 0.5 ? 0.13 : 0.2) + pJaw * 0.18);
          ctx.lineTo(txx + hh * 0.05, tyy);
          ctx.closePath();
          ctx.fill();
        }
        // ...and the dropped mandible answers with the underbite.
        ctx.fillStyle = shade(gn.underfur, -16);
        ctx.beginPath();
        chamferRect(
          ctx,
          Math.min(headX + fwd * gw * 0.3, tipPX - fwd * hh * 0.02),
          mouthPY + hh * 0.1 + pJaw,
          Math.abs(tipPX - fwd * hh * 0.02 - (headX + fwd * gw * 0.3)),
          hh * 0.17,
          [0, 0, cut * 0.4, cut * 0.4],
        );
        ctx.fill();
        ctx.fillStyle = '#efe6cf';
        const cx2 = tipPX - fwd * hh * 0.16;
        ctx.beginPath();
        ctx.moveTo(cx2 - hh * 0.055, mouthPY + hh * 0.12 + pJaw);
        ctx.lineTo(cx2 + fwd * hh * 0.015, mouthPY + hh * 0.12 + pJaw - hh * 0.24 * (1 + 0.25 * (hv - 1)));
        ctx.lineTo(cx2 + hh * 0.055, mouthPY + hh * 0.12 + pJaw);
        ctx.closePath();
        ctx.fill();
      }
    } else if (!hurt) {
      // The shut grin: the seam leaves the tip, sags, and RISES past
      // the muzzle root into its one cheek corner.
      ctx.strokeStyle = shade(gn.nose, -4);
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1.2, hh * 0.075);
      ctx.beginPath();
      ctx.moveTo(tipPX - fwd * hh * 0.05, mouthPY);
      ctx.quadraticCurveTo(headX + fwd * gw * 0.85, mouthPY + hh * 0.12, headX + fwd * gw * 0.16, mouthPY - hh * 0.2);
      ctx.stroke();
      ctx.lineCap = 'butt';
      // The meshed row rides the seam...
      ctx.fillStyle = '#e8dcc0';
      for (const t of [0.16, 0.42, 0.68]) {
        const txx = tipPX + (headX + fwd * gw * 0.16 - tipPX) * t;
        const tyy = mouthPY + hh * (0.1 - 0.28 * t * t);
        ctx.beginPath();
        ctx.moveTo(txx - hh * 0.045, tyy);
        ctx.lineTo(txx, tyy + hh * 0.12 * (1 + 0.2 * (hv - 1)));
        ctx.lineTo(txx + hh * 0.045, tyy);
        ctx.closePath();
        ctx.fill();
      }
      // ...and ONE canine juts UP proud near the tip.
      ctx.fillStyle = '#efe6cf';
      const cx2 = tipPX - fwd * hh * 0.18;
      ctx.beginPath();
      ctx.moveTo(cx2 - hh * 0.055, mouthPY + hh * 0.1);
      ctx.lineTo(cx2 + fwd * hh * 0.015, mouthPY + hh * 0.1 - hh * 0.22 * (1 + 0.3 * (hv - 1)));
      ctx.lineTo(cx2 + hh * 0.055, mouthPY + hh * 0.1);
      ctx.closePath();
      ctx.fill();
    }

    // The packlord's ledger: the scar rakes DOWN the slope.
    if (gn.scarred && !hurt) {
      ctx.strokeStyle = shade(gn.fur, 52);
      ctx.lineWidth = Math.max(1.5, hh * 0.07);
      const scx = headX + fwd * gw * 0.78;
      ctx.beginPath();
      ctx.moveTo(scx - hh * 0.1, browPY + hh * 0.12);
      ctx.lineTo(scx + hh * 0.1, browPY + hh * 0.58);
      ctx.stroke();
      ctx.lineWidth = Math.max(1, hh * 0.035);
      for (const t of [0.32, 0.64]) {
        const px0 = scx - hh * 0.1 + hh * 0.2 * t;
        const py0 = browPY + hh * (0.12 + 0.46 * t);
        ctx.beginPath();
        ctx.moveTo(px0 - hh * 0.06, py0 + hh * 0.03);
        ctx.lineTo(px0 + hh * 0.06, py0 - hh * 0.03);
        ctx.stroke();
      }
    }
    return;
  }

  // --- ROUND ears set LOW and WIDE — the hyena's dish, never the
  // wolf's point or the bear's upright button: a short stem under a
  // round blade, canted HARD off the skull's top corners, drawn
  // BEFORE the skull so the cranium laps their roots. Far ear steps
  // smaller at the three-quarter bands (the cheap perspective cue);
  // both read from behind as backs — the inner dish faces forward
  // only.
  const drawEar = (side: number, depth: number): void => {
    const er = hh * 0.32 * (0.95 + 0.15 * hv) * depth;
    const dh = hh * 0.54 * (0.92 + 0.16 * hv) * depth;
    const ex = headX - fx * gw * 0.22 + side * gw * 0.98;
    // The roots ride the skull's upper corners and LIFT toward the
    // turned bands — rooted at mid-face, a trailing ear read as a
    // droop on the cheek at three-quarter.
    const baseY = crTop + hh * (0.46 - 0.08 * profileK);
    const notched = gn.scarred && side === nearSide;
    ctx.save();
    ctx.translate(ex, baseY);
    // The hard out-cant: the dish roots on the skull's SIDE and leans
    // toward ten-and-two — the listening tilt that says hyena. Ears
    // perched upright on the crown corners were the teddy-bear tell.
    ctx.rotate(side * (0.58 + 0.08 * (1 - profileK)));
    // Front ears sit a value under the crown so they never glow; the
    // backs go darker still.
    ctx.fillStyle = hurt ? '#ffffff' : shade(gn.fur, back ? -16 : -8);
    ctx.beginPath();
    ctx.moveTo(-er * 0.92, 0);
    ctx.lineTo(-er, -dh + er);
    ctx.arc(0, -dh + er, er, Math.PI, notched ? Math.PI * 1.6 : Math.PI * 2);
    if (notched) {
      // The notch: a bite taken out of the rim, healed ragged.
      ctx.lineTo(er * 0.34, -dh + er * 0.66);
      ctx.lineTo(er, -dh + er * 0.94);
    }
    ctx.lineTo(er * 0.92, 0);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      ctx.strokeStyle = shade(gn.fur, -20);
      ctx.lineWidth = Math.max(1, er * 0.13);
      ctx.stroke();
      if (!back) {
        // The inner dish: a deep dark cavity FILLING the round blade —
        // concentric bright/dark rings read as a ring toy, so the
        // shadow owns the ear and only a soft rim of fur survives.
        ctx.fillStyle = shade(gn.skin, -40);
        ctx.beginPath();
        ctx.ellipse(fx * er * 0.1, -dh + er * 0.96, er * 0.8, er * 0.84, 0, 0, Math.PI * 2);
        ctx.fill();
        if (!notched) {
          // Every skulker's ears carry a scrap-fight nick — a dark
          // wedge bitten into the outer rim, seeded per body.
          const nickT = 0.34 + 0.3 * (((seed >>> (side > 0 ? 3 : 9)) & 7) / 7);
          ctx.fillStyle = mask;
          ctx.beginPath();
          ctx.moveTo(side * er * 1.02, -dh * nickT);
          ctx.lineTo(side * er * 0.52, -dh * nickT - er * 0.2);
          ctx.lineTo(side * er * 1.02, -dh * nickT - er * 0.38);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        // Ear back: a fur seam up the middle keeps it a volume.
        ctx.strokeStyle = shade(gn.fur, -14);
        ctx.lineWidth = Math.max(1, er * 0.1);
        ctx.beginPath();
        ctx.moveTo(0, -er * 0.3);
        ctx.lineTo(0, -dh + er * 0.6);
        ctx.stroke();
      }
    }
    ctx.restore();
  };
  if (profileK < 0.72 || back) drawEar(-nearSide, back ? 1 : 0.84);
  drawEar(nearSide, 1);

  // --- cranium block: heavy crown chamfers dome the forehead.
  ctx.fillStyle = fur;
  ctx.beginPath();
  chamferRect(ctx, headX - gw, crTop, gw * 2, crBot - crTop, [cut * 1.7, cut * 1.7, cut * 0.55, cut * 0.55]);
  ctx.fill();
  if (!hurt) {
    // THE FORM SPLIT restated for fur: hard shade right half, lit
    // crown band, jaw under-shade — the block reads as mass.
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, headX - gw, crTop, gw * 2, crBot - crTop, [cut * 1.7, cut * 1.7, cut * 0.55, cut * 0.55]);
    ctx.clip();
    ctx.fillStyle = shade(gn.fur, -10);
    ctx.fillRect(headX, crTop, gw, crBot - crTop);
    ctx.fillStyle = shade(gn.fur, 9);
    ctx.fillRect(headX - gw, crTop, gw * 2, hh * 0.13);
    ctx.fillStyle = shade(gn.fur, -16);
    ctx.fillRect(headX - gw, crBot - hh * 0.1, gw * 2, hh * 0.1);
    // The spot field: seeded speckles over the trailing cheek and
    // crown — broken hyena dapple, never a grid. Deterministic from
    // the spawn seed so a body keeps its own coat frame to frame.
    ctx.fillStyle = shade(gn.spot, 0);
    for (let i = 0; i < 5; i++) {
      const h = ((seed >>> (i * 3)) ^ (seed * 41 + i * 97)) | 0;
      const sxr = ((h & 15) / 15) * 2 - 1;
      const syr = (((h >> 4) & 15) / 15) * 2 - 1;
      const bx = headX - fx * gw * 0.34 + sxr * gw * 0.52;
      // Crown and temples only — the muzzle repaints the lower face,
      // and a spot under it would vanish anyway.
      const by = crTop + (crBot - crTop) * (0.18 + 0.3 * (syr * 0.5 + 0.5));
      const br = hh * (0.055 + 0.03 * (((h >> 8) & 3) / 3));
      ctx.beginPath();
      ctx.ellipse(bx, by, br * 1.25, br, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // --- cheek ruffs: jagged fur flaring sideways off the jaw line —
  // the sideburn wedges that break the clean box and read "wild
  // animal" from every band. Far ruff first so the near one laps it.
  const drawRuff = (side: number, depth: number): void => {
    const rx0 = headX - fx * gw * 0.06 + side * gw * 0.88;
    const reach = gw * 0.36 * depth * (0.9 + 0.2 * hv);
    ctx.fillStyle = hurt ? '#ffffff' : shade(gn.fur, -5);
    ctx.beginPath();
    ctx.moveTo(rx0, headY - hh * 0.08);
    ctx.lineTo(rx0 + side * reach, headY + hh * 0.1);
    ctx.lineTo(rx0 + side * gw * 0.06, headY + hh * 0.22);
    ctx.lineTo(rx0 + side * reach * 0.86, headY + hh * 0.42);
    ctx.lineTo(rx0 + side * gw * 0.04, headY + hh * 0.48);
    ctx.lineTo(rx0 + side * reach * 0.55, headY + hh * 0.66);
    ctx.lineTo(rx0 - side * gw * 0.08, headY + hh * 0.6);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // One mask-dark tooth in the ruff keeps it ratty, not fluffy.
      ctx.fillStyle = mask;
      ctx.beginPath();
      ctx.moveTo(rx0 + side * gw * 0.02, headY + hh * 0.26);
      ctx.lineTo(rx0 + side * reach * 0.7, headY + hh * 0.46);
      ctx.lineTo(rx0 + side * gw * 0.01, headY + hh * 0.5);
      ctx.closePath();
      ctx.fill();
    }
  };
  if (!back) {
    if (profileK < 0.72) drawRuff(-nearSide, 0.8);
    drawRuff(nearSide, 1);
  }

  if (back) {
    // --- the occiput: no face from behind. Fur courses, the nape
    // shadow where the skull sinks into the hump, and the mane hood
    // owning the crown and pouring down the middle in falling locks.
    if (!hurt) {
      ctx.strokeStyle = shade(gn.fur, -14);
      ctx.lineWidth = Math.max(1, hh * 0.045);
      for (const t of [0.38, 0.64]) {
        ctx.beginPath();
        ctx.moveTo(headX - gw * 0.6, crTop + (crBot - crTop) * t);
        ctx.lineTo(headX + gw * 0.6, crTop + (crBot - crTop) * t);
        ctx.stroke();
      }
      ctx.fillStyle = shade(gn.fur, -18);
      ctx.beginPath();
      chamferRect(ctx, headX - gw * 0.44, crBot - hh * 0.16, gw * 0.88, hh * 0.16, cut * 0.3);
      ctx.fill();
      // The mane from behind: ONE connected fall — a crown cap arcing
      // the full skull width whose bottom edge tears into ragged
      // locks pouring down the occiput, deepest at the spine line, so
      // the whole band reads as hair over the head, never a panel
      // strapped to it.
      ctx.fillStyle = gn.mane;
      ctx.beginPath();
      ctx.moveTo(headX - gw * 0.88, crTop + hh * 0.08);
      ctx.quadraticCurveTo(headX, crTop - hh * 0.16, headX + gw * 0.88, crTop + hh * 0.08);
      ctx.lineTo(headX + gw * 0.62, crTop + hh * 0.46);
      for (const [xk, dk] of [
        [0.5, 0.5],
        [0.34, 1.05],
        [0.18, 0.58],
        [0.02, 1.3],
        [-0.16, 0.6],
        [-0.34, 1.02],
        [-0.5, 0.48],
      ] as const) {
        ctx.lineTo(headX + xk * gw, crTop + hh * (0.42 + dk * 0.72 * (1 + 0.3 * (hv - 1))));
      }
      ctx.lineTo(headX - gw * 0.62, crTop + hh * 0.46);
      ctx.closePath();
      ctx.fill();
      // The center seam: a darker part line down the spine of the fall.
      ctx.strokeStyle = shade(gn.mane, -14);
      ctx.lineWidth = Math.max(1, hh * 0.07);
      ctx.beginPath();
      ctx.moveTo(headX, crTop + hh * 0.1);
      ctx.lineTo(headX + gw * 0.02, crTop + hh * (0.42 + 1.15 * 0.72 * (1 + 0.3 * (hv - 1))));
      ctx.stroke();
      if (gn.scarred) {
        // Frost tips streak the fall.
        ctx.strokeStyle = shade(gn.mane, 42);
        ctx.lineWidth = Math.max(1, hh * 0.05);
        for (const o of [-0.42, 0.5]) {
          ctx.beginPath();
          ctx.moveTo(headX + o * gw * 0.6, crTop + hh * 0.3);
          ctx.lineTo(headX + o * gw * 0.68, crTop + hh * 1.0);
          ctx.stroke();
        }
      }
    }
    return;
  }

  // --- THE MUZZLE: SHORT, DEEP, BLUNT — the bone-cracker, never the
  // wolf's plank. The top edge is the hyena's ROMAN SLOPE: it leaves
  // the brow high and falls convex to a blunt tip barely past the
  // cheek, while the jaw beneath runs DEEP. Face-on the box is most
  // of the face; at profile it reads dome-then-drop. The long
  // horizontal box with a ball nose was the wolf tell.
  const jawDrop = f.gape * hh * 0.46;
  const snLen = gw * (0.34 + 0.36 * profileK);
  const rootX = headX + fx * gw * 0.24;
  const tipX = rootX + fx * snLen;
  const snHw = gw * (0.52 - 0.18 * profileK);
  const x0 = Math.min(rootX, tipX) - snHw * (1 - profileK);
  const x1 = Math.max(rootX, tipX) + snHw * (1 - profileK);
  const fxs = fx >= 0 ? 1 : -1;
  const xa = fxs > 0 ? x0 : x1; // rear edge, toward the skull
  const xb = fxs > 0 ? x1 : x0; // fore edge, the blunt tip
  const topRearY = headY - hh * (0.1 + 0.26 * profileK);
  const topForeY = headY - hh * (0.1 - 0.18 * profileK);
  // Face-on the box runs DEEP — the bone-cracker jaw is most of the
  // face; a shallow muzzle under a pale chin read plush, not gnoll.
  const botY = headY + hh * (0.88 - 0.26 * profileK);
  const cc = cut * 0.6;
  const muzzlePath = (): void => {
    ctx.beginPath();
    ctx.moveTo(xa, topRearY);
    // The convex bow on the slope — the Roman line. Face-on the two
    // top corners level out and the bow vanishes.
    ctx.quadraticCurveTo(
      (xa + xb) / 2,
      Math.min(topRearY, topForeY) - hh * 0.05 * profileK,
      xb - fxs * cc,
      topForeY,
    );
    ctx.lineTo(xb, topForeY + cc); // the blunt front: straight down,
    ctx.lineTo(xb, botY - cc * 1.3); // no taper, no point
    ctx.lineTo(xb - fxs * cc * 1.5, botY);
    ctx.lineTo(xa + fxs * cc * 1.5 * (1 - profileK), botY);
    ctx.lineTo(xa, botY - cc * 1.3 * (1 - profileK));
    ctx.closePath();
  };
  // A value LIGHTER than the skull — the muzzle must separate as its
  // own volume from every band, or the face reads as one flat slab.
  const muzC = hurt ? '#ffffff' : shade(gn.fur, 7);
  ctx.fillStyle = muzC;
  muzzlePath();
  ctx.fill();
  if (!hurt) {
    // The saddle, the form-split shade, and the deep jowl shadow —
    // the muzzle must read as a WEIGHTED box, and every mark inside
    // clips to the Roman slope so nothing paints past the bridge.
    ctx.save();
    muzzlePath();
    ctx.clip();
    ctx.fillStyle = shade(gn.fur, -12);
    const shX = headX > (x0 + x1) / 2 ? (x0 + x1) / 2 : headX;
    ctx.fillRect(shX, topRearY - hh * 0.32, x1 - shX, botY - topRearY + hh * 0.32);
    // THE BRIDGE SADDLE: mask ink riding the slope — at profile the
    // full run of the bridge; face-on a CENTER blaze down to the
    // nose, so saddle, brow, and sockets stay three separate marks.
    const brCx = (x0 + x1) / 2 + fx * (x1 - x0) * 0.06;
    const brHw = ((x1 - x0) / 2) * (0.42 + 0.58 * profileK);
    const brTop = Math.min(topRearY, topForeY) - hh * 0.08;
    // The blaze STOPS short of the nose — saddle, fur gap, then the
    // pad, or the two merge into one black T across the face.
    const brBot = headY + hh * (-0.08 + 0.24 * profileK);
    ctx.fillStyle = mask;
    ctx.fillRect(brCx - brHw, brTop, brHw * 2, brBot - brTop);
    ctx.fillStyle = shade(gn.mask, -10);
    ctx.fillRect(brCx - brHw, brTop, brHw * 2, Math.max(0, headY - hh * 0.18 - brTop));
    // Jowl under-shade seats the jaw.
    ctx.fillStyle = shade(gn.fur, -20);
    ctx.fillRect(Math.min(x0, x1), botY - hh * 0.15, Math.abs(x1 - x0), hh * 0.15);
    ctx.restore();
  }

  // --- the nose: a broad squared PAD wrapping the blunt tip — wider
  // than tall face-on, turned onto the front plane at profile. Never
  // a ball on a stick (the second wolf tell).
  const noseX =
    ((x0 + x1) / 2) * (1 - profileK) + (xb - fxs * hh * 0.16) * profileK + fx * gw * 0.02;
  const noseY = (headY + hh * 0.17) * (1 - profileK) + (topForeY + hh * 0.2) * profileK;
  const nw = snHw * (0.42 - 0.14 * profileK);
  const nh = hh * 0.14 * (0.95 + 0.15 * hv);
  ctx.fillStyle = hurt ? '#ffffff' : gn.nose;
  ctx.beginPath();
  chamferRect(ctx, noseX - nw, noseY - nh, nw * 2, nh * 2, Math.min(cc, nw * 0.5));
  ctx.fill();
  if (!hurt) {
    // One lit facet on the lead top corner keeps the pad a form.
    ctx.fillStyle = shade(gn.nose, 24);
    ctx.beginPath();
    ctx.ellipse(noseX - nw * 0.4 + fx * nw * 0.2, noseY - nh * 0.4, nw * 0.34, nh * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- THE GRIN: the hyena's whole argument. A bold dark seam runs
  // the muzzle's width and RISES toward the cheek corners, the lips
  // pulled off a meshed tooth row; the lower canines jut PROUD of the
  // seam even shut — the gnoll signature no other dialect carries
  // (the skeleton grins, the kobold bucks, the gnoll juts). The gape
  // drops the mandible off the seam into the open maw: the cackle.
  const mdHw = snHw * 0.58;
  const mdX = noseX * (1 - profileK) + (rootX + fx * snLen * 0.34) * profileK;
  const mouthY = (headY + hh * 0.46) * (1 - profileK) + (botY - hh * 0.42) * profileK;
  const mdTop = botY - hh * 0.1 + jawDrop;
  const lipInk = shade(gn.nose, -4);
  if (jawDrop > hh * 0.03) {
    // The open maw behind the dropped jaw — dark red meat, a tongue,
    // and the UPPER tooth row hanging into it: the cackle is a threat
    // display, and teeth are the whole message.
    ctx.fillStyle = hurt ? '#241a2e' : '#2e1418';
    ctx.beginPath();
    chamferRect(ctx, mdX - mdHw * 1.05, mouthY - hh * 0.06, mdHw * 2.1, mdTop - mouthY + hh * 0.12, cut * 0.25);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = '#7c3234';
      ctx.beginPath();
      ctx.ellipse(mdX + fx * mdHw * 0.2, mdTop - hh * 0.03, mdHw * 0.6, hh * 0.07 + jawDrop * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#efe6cf';
      for (const off of [-0.62, -0.05, 0.55]) {
        const ixT = mdX + fx * mdHw * 0.3 + off * mdHw * 0.78 * (1 - profileK * 0.4);
        ctx.beginPath();
        ctx.moveTo(ixT - hh * 0.05, mouthY - hh * 0.03);
        ctx.lineTo(ixT, mouthY - hh * 0.03 + hh * (off === -0.05 ? 0.14 : 0.22) + jawDrop * 0.2);
        ctx.lineTo(ixT + hh * 0.05, mouthY - hh * 0.03);
        ctx.closePath();
        ctx.fill();
      }
    }
  } else if (!hurt) {
    // The shut-mouth GRIN SEAM: wide, sagging under the nose, rising
    // hard into the cheek corners — drawn as strokes (never fills:
    // the back-band ink law) with the tooth row meshed across it.
    ctx.strokeStyle = lipInk;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.2, hh * 0.075);
    ctx.beginPath();
    if (profileK <= 0.55) {
      // Face-on: one wide swoop, both corners rising.
      ctx.moveTo(mdX - mdHw * 1.5, mouthY - hh * 0.14);
      ctx.quadraticCurveTo(mdX - mdHw * 0.8, mouthY + hh * 0.07, mdX, mouthY + hh * 0.06);
      ctx.quadraticCurveTo(mdX + mdHw * 0.8, mouthY + hh * 0.07, mdX + mdHw * 1.5, mouthY - hh * 0.14);
    } else {
      // Profile: the seam leaves the blunt tip, sags, and rises past
      // the muzzle root into the cheek — the grin runs DEEP.
      ctx.moveTo(xb - fxs * hh * 0.04, mouthY + hh * 0.02);
      ctx.quadraticCurveTo(
        (xb + rootX) / 2,
        mouthY + hh * 0.12,
        rootX - fxs * gw * 0.12,
        mouthY - hh * 0.18,
      );
    }
    ctx.stroke();
    ctx.lineCap = 'butt';
    // The meshed rows: upper teeth hang OFF the seam, lower canines
    // jut UP past it near the corners — shut, and still a threat.
    ctx.fillStyle = '#e8dcc0';
    const grinX = (t: number): number =>
      profileK <= 0.55 ? mdX + t * mdHw * 1.3 : xb - fxs * hh * 0.04 + (rootX - fxs * gw * 0.06 - (xb - fxs * hh * 0.04)) * (t * 0.5 + 0.5);
    const grinY = (t: number): number =>
      profileK <= 0.55
        ? mouthY + hh * 0.05 - Math.abs(t) * Math.abs(t) * hh * 0.16
        : mouthY + hh * 0.06 - (t * 0.5 + 0.5) * (t * 0.5 + 0.5) * hh * 0.2;
    for (const t of [-0.72, -0.24, 0.24, 0.72]) {
      const txx = grinX(t);
      const tyy = grinY(t);
      ctx.beginPath();
      ctx.moveTo(txx - hh * 0.045, tyy);
      ctx.lineTo(txx, tyy + hh * 0.12 * (1 + 0.2 * (hv - 1)));
      ctx.lineTo(txx + hh * 0.045, tyy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#efe6cf';
    for (const t of [-0.95, 0.95]) {
      if (profileK > 0.55 && t < 0) continue; // one canine at profile
      const txx = grinX(t * 0.92);
      const tyy = grinY(t * 0.92) + hh * 0.06;
      const fang = hh * 0.2 * (1 + 0.3 * (hv - 1));
      ctx.beginPath();
      ctx.moveTo(txx - hh * 0.055, tyy);
      ctx.lineTo(txx + fx * hh * 0.015, tyy - fang);
      ctx.lineTo(txx + hh * 0.055, tyy);
      ctx.closePath();
      ctx.fill();
    }
  }
  // The mandible chin strap: pale underfur under the grin, dropping
  // with the gape — a strap, never a bib (the wide pale chin was the
  // first cut's plush-toy tell).
  ctx.fillStyle = hurt ? '#ffffff' : shade(gn.underfur, -16);
  ctx.beginPath();
  chamferRect(ctx, mdX - mdHw, mdTop, mdHw * 2, hh * 0.18, [0, 0, cut * 0.5, cut * 0.5]);
  ctx.fill();
  if (!hurt && jawDrop > hh * 0.03) {
    // The underbite row rides the dropped jaw's leading edge.
    ctx.fillStyle = '#efe6cf';
    for (const [off, tall] of [[-0.55, 0.2], [0, 0.28], [0.55, 0.2]] as const) {
      const ix = mdX + fx * mdHw * 0.3 + off * mdHw * 0.6 * (1 - profileK * 0.4);
      ctx.beginPath();
      ctx.moveTo(ix - hh * 0.05, mdTop + hh * 0.02);
      ctx.lineTo(ix + fx * hh * 0.02, mdTop + hh * 0.02 - hh * tall * (1 + 0.25 * (hv - 1)));
      ctx.lineTo(ix + hh * 0.05, mdTop + hh * 0.02);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (!hurt && f.gape > 0.25) {
    // Snarl creases: the bridge wrinkles up when the jaw drops — the
    // gape is a SNARL, not a yawn.
    ctx.strokeStyle = shade(gn.mask, -14);
    ctx.lineWidth = Math.max(1, hh * 0.04);
    for (const o of [0.2, 0.42]) {
      const wy = topRearY + (topForeY - topRearY) * o + hh * (0.16 + o * 0.3);
      ctx.beginPath();
      ctx.moveTo(rootX + fx * snLen * o - snHw * 0.32 * (1 - profileK), wy);
      ctx.quadraticCurveTo(
        rootX + fx * snLen * (o + 0.14),
        wy - hh * 0.1,
        rootX + fx * snLen * o + snHw * 0.32 * (1 - profileK) + fx * hh * 0.06,
        wy,
      );
      ctx.stroke();
    }
  }

  // --- the muzzle scar: the packlord's ledger, a pale seam raked
  // down the slope on the near side.
  if (gn.scarred && !hurt) {
    ctx.strokeStyle = shade(gn.fur, 52);
    ctx.lineWidth = Math.max(1.5, hh * 0.07);
    const scx = rootX + fx * snLen * 0.45 + nearSide * snHw * 0.16;
    const scTop = topRearY + (topForeY - topRearY) * 0.45;
    ctx.beginPath();
    ctx.moveTo(scx - hh * 0.12, scTop + hh * 0.1);
    ctx.lineTo(scx + hh * 0.1, scTop + hh * 0.58);
    ctx.stroke();
    // Two stitch ticks across it — an old wound, badly closed.
    ctx.lineWidth = Math.max(1, hh * 0.035);
    for (const t of [0.3, 0.62]) {
      const px0 = scx - hh * 0.12 + hh * 0.22 * t;
      const py0 = scTop + hh * (0.1 + 0.48 * t);
      ctx.beginPath();
      ctx.moveTo(px0 - hh * 0.06, py0 + hh * 0.03);
      ctx.lineTo(px0 + hh * 0.06, py0 - hh * 0.03);
      ctx.stroke();
    }
  }

  // --- THE SCOWL: a heavy mask-dark brow ledge angled DOWN toward
  // the muzzle root — two wedges meeting in a V. This single mark
  // flips the face from curious to predatory; it paints OVER the
  // muzzle root so the brow visibly hoods the eyes.
  const eyeY = headY - hh * 0.3;
  const pairX = headX + fx * gw * 0.36;
  const eyeDx = gw * 0.34 * (1 - profileK * 0.5);
  if (!hurt) {
    ctx.fillStyle = mask;
    for (const sd of [-1, 1]) {
      if (sd !== nearSide && profileK > 0.78) continue;
      const inX = pairX + sd * gw * 0.04;
      const outX = pairX + sd * (eyeDx + gw * 0.3);
      ctx.beginPath();
      ctx.moveTo(inX, eyeY + hh * 0.02);
      ctx.lineTo(outX, eyeY - hh * 0.26);
      ctx.lineTo(outX + sd * gw * 0.02, eyeY - hh * 0.08);
      ctx.lineTo(inX + sd * gw * 0.02, eyeY + hh * 0.16);
      ctx.closePath();
      ctx.fill();
    }
  }

  // --- the eyes: small, close-set, SUNK under the brow — lit amber
  // beads in dark sockets, the scavenger's sizing-you-up squint,
  // never round wonder. The far eye slips around the corner at
  // profile.
  for (const sd of [-1, 1]) {
    if (sd !== nearSide && profileK > 0.78) continue;
    const ex = pairX + sd * eyeDx;
    const eyY = eyeY + hh * 0.05;
    if (!hurt) {
      // The socket: a mask-dark pocket the bead burns inside.
      ctx.fillStyle = shade(gn.mask, -12);
      ctx.beginPath();
      ctx.ellipse(ex, eyY, hh * 0.125, hh * 0.095, 0, 0, Math.PI * 2);
      ctx.fill();
      // A faint burn, not a halo — a wide bright ring read cartoon.
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = gn.eye;
      ctx.beginPath();
      ctx.arc(ex, eyY, hh * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = hurt ? '#241a2e' : gn.eye;
    ctx.beginPath();
    ctx.arc(ex, eyY, hh * 0.09, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = '#241a2e';
      ctx.beginPath();
      ctx.arc(ex + fx * hh * 0.022, eyY + hh * 0.014, hh * 0.046, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
/**
 * The crest hump: the gnoll's hunched shoulders drawn in the torso's
 * local frame AFTER the garment and BEFORE the head — high withers in
 * FUR (the scraps a gnoll wears never cover its own back) with the
 * mane's bristle ridge marching down the slope. The low-slung skull
 * sinks into it; face-on and from behind it reads as the bowed back
 * the whole species carries.
 */
export function paintGnollCrest(
  ctx: CanvasRenderingContext2D,
  gn: GnollLook,
  f: KoboldHumpFrame,
): void {
  const { tw, th, fx, backK, hurt } = f;
  const hv = gn.heavy;
  const cx = -fx * tw * 0.34;
  const cy = -th + th * 0.02;
  const rx = tw * (0.96 + 0.12 * backK);
  const ry = th * 0.36 * (1 + 0.3 * (hv - 1));
  const fur = hurt ? '#ffffff' : gn.fur;
  // The withers: a heavy shoulder boulder the skull sinks into — the
  // species' whole silhouette argument. It rises well ABOVE the torso
  // line so the back reads bowed from every band.
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(cx + rx, cy + ry * 0.4);
  ctx.lineTo(cx - rx, cy + ry * 0.4);
  ctx.closePath();
  ctx.fill();
  if (!hurt) {
    // Form split over the hump, the shoulder dapple, then the mane
    // ridge marching the crown — the nape hood above pours into THIS.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = shade(gn.fur, -9);
    ctx.fillRect(cx, cy - ry, rx, ry * 2);
    ctx.fillStyle = shade(gn.fur, 8);
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 0.4);
    // The dorsal mask: the dark saddle tone creeping over the trailing
    // slope of the hump — the hyena's back is darker than its flank.
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = gn.mask;
    ctx.fillRect(cx - fx * rx * 0.5 - rx * (1 - Math.abs(fx)) * 0.2, cy - ry, rx * 0.9, ry * 0.55);
    ctx.globalAlpha = 1;
    // The shoulder dapple: the hump is the coat's widest field — the
    // speckled read lives or dies here, seeded per body like the head.
    ctx.fillStyle = gn.spot;
    const seed = gn.seed ?? 0;
    for (let i = 0; i < 4; i++) {
      const h = ((seed >>> (i * 5)) ^ (seed * 53 + i * 131)) | 0;
      const sx = cx + (((h & 15) / 15) * 2 - 1) * rx * 0.7;
      const sy = cy - ry * 0.1 - ((h >> 4) & 7) / 7 * ry * 0.5;
      const sr = ry * (0.13 + 0.07 * (((h >> 7) & 3) / 3));
      ctx.beginPath();
      ctx.ellipse(sx, sy, sr * 1.3, sr, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // THE MANE RIDGE: one connected sawtooth band riding the crown
    // arc, teeth raking toward the tail — a standing ridge of bristle,
    // never separate pasted triangles. Taller on the packlord.
    const n = 6;
    const ridge = (inset: number, tallK: number, col: string): void => {
      ctx.fillStyle = col;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1)) * 2 - 1;
        const bx = cx + t * rx * 0.72 * inset;
        const lift = Math.sqrt(Math.max(0, 1 - (t * 0.72 * inset) ** 2));
        const by = cy - ry * lift * 0.94;
        const tall =
          ry * (0.5 + 0.34 * Math.sin(i * 2.1 + 0.6)) * tallK * (1 + 0.6 * (hv - 1));
        if (!started) {
          ctx.moveTo(bx - tw * 0.1, by + ry * 0.18);
          started = true;
        }
        ctx.lineTo(bx - fx * tw * 0.12 + t * tw * 0.04, by - tall);
        ctx.lineTo(bx + tw * 0.1, by + ry * 0.1);
      }
      // The skirt closes the band back along the crown so the ridge
      // reads as one mass rooted in the hump.
      ctx.lineTo(cx + rx * 0.74 * inset, cy + ry * 0.06);
      ctx.lineTo(cx - rx * 0.74 * inset, cy + ry * 0.06);
      ctx.closePath();
      ctx.fill();
    };
    ridge(1, 1, gn.mane);
    if (gn.scarred) {
      // Packlord frost: a paler inner ridge over the iron one.
      ridge(0.82, 0.66, shade(gn.mane, 42));
    }
  }
}
/** Torso-local frame for the gnoll body coat overpaint. */
export interface GnollBodyFrame {
  s: number;
  tw: number;
  ww: number;
  th: number;
  fx: number;
  fy: number;
  profileK: number;
  backK: number;
  lead: number;
  hurt: boolean;
}
/**
 * THE BODY COAT — the gnoll's torso overpaint, drawn in the torso's
 * local frame AFTER the garment quad (which paints in plain fur) and
 * BEFORE the crest hump. It turns the flat tunic block into an
 * animal: pale belly panel face-on, the dark dorsal saddle from
 * behind, seeded rosettes on the flanks, a ragged pelt fringe over
 * the hip seam, and the scavenger's crude hide harness with its bone
 * fetishes — species dressing painted on, never equipment (nothing
 * here drops, so nothing here lies).
 */
export function paintGnollBody(
  ctx: CanvasRenderingContext2D,
  gn: GnollLook,
  f: GnollBodyFrame,
): void {
  const { s, tw, ww, th, fy, profileK, backK, lead, hurt } = f;
  const back = backK > 0.55;
  const frontK = Math.max(0, Math.min(1, (fy - 0.1) / 0.35));
  const seed = gn.seed ?? 0;
  if (hurt) return; // the hurt flash keeps the silhouette clean
  if (frontK > 0.05 && !back) {
    // The belly panel: pale underfur from the throat pit to the
    // waist, ragged along its edges — the soft underside every
    // predator body carries under a darker back.
    ctx.globalAlpha = frontK;
    ctx.fillStyle = shade(gn.underfur, -6);
    const bw = ww * 0.6 * (1 - profileK * 0.55);
    const yT = -th * 0.66;
    ctx.beginPath();
    ctx.moveTo(-bw * 0.7, yT);
    ctx.quadraticCurveTo(0, yT - th * 0.08, bw * 0.7, yT);
    ctx.lineTo(bw, -th * 0.34);
    ctx.lineTo(bw * 0.8, -th * 0.3);
    ctx.lineTo(bw * 0.96, -th * 0.12);
    ctx.lineTo(bw * 0.72, 0.005 * s);
    ctx.lineTo(-bw * 0.72, 0.005 * s);
    ctx.lineTo(-bw * 0.96, -th * 0.12);
    ctx.lineTo(-bw * 0.8, -th * 0.3);
    ctx.lineTo(-bw, -th * 0.34);
    ctx.closePath();
    ctx.fill();
    // The chest shadow: the head hangs OVER this torso — a soft dark
    // pocket under the jaw line seats the slung skull.
    ctx.fillStyle = shade(gn.fur, -18);
    ctx.beginPath();
    ctx.ellipse(0, -th * 0.86, tw * 0.5, th * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (backK > 0.25) {
    // The dorsal fall: the MANE keeps going — a tapering column of
    // bristle in the mane's own ink pouring from under the hump down
    // the spine, ragged at its tip. One continuous read from crown to
    // mid-back, never a bib strapped over a tunic.
    ctx.globalAlpha = Math.min(1, backK * 1.3) * 0.9;
    ctx.fillStyle = gn.mane;
    const sw = tw * 0.56;
    ctx.beginPath();
    ctx.moveTo(-sw, -th * 0.99);
    ctx.lineTo(sw, -th * 0.99);
    ctx.lineTo(sw * 0.66, -th * 0.62);
    ctx.lineTo(sw * 0.4, -th * 0.68);
    ctx.lineTo(sw * 0.3, -th * 0.34);
    ctx.lineTo(sw * 0.06, -th * 0.5);
    ctx.lineTo(-sw * 0.08, -th * 0.2);
    ctx.lineTo(-sw * 0.3, -th * 0.56);
    ctx.lineTo(-sw * 0.52, -th * 0.44);
    ctx.lineTo(-sw * 0.66, -th * 0.64);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // The flank rosettes: the hyena dapple across the widest field the
  // body owns, seeded per body — a warband of individuals.
  ctx.fillStyle = gn.spot;
  for (let i = 0; i < 5; i++) {
    const h = ((seed >>> (i * 4)) ^ (seed * 71 + i * 113)) | 0;
    const sxr = ((h & 15) / 15) * 2 - 1;
    const u = ((h >> 4) & 15) / 15;
    const sx = sxr * tw * 0.72;
    // Spots live on the FLANKS: skip the belly center face-on.
    if (!back && frontK > 0.4 && Math.abs(sxr) < 0.4) continue;
    const sy = -th * (0.2 + 0.55 * u);
    const sr = th * (0.045 + 0.03 * (((h >> 8) & 3) / 3));
    ctx.beginPath();
    ctx.ellipse(sx, sy, sr * 1.35, sr, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // The pelt fringe: ragged fur teeth breaking over the hip seam so
  // the torso ENDS in coat, never in a tailored hem.
  ctx.fillStyle = shade(gn.fur, -8);
  ctx.beginPath();
  const fw = ww * 1.06;
  ctx.moveTo(-fw, -0.035 * s);
  ctx.lineTo(fw, -0.035 * s);
  for (let i = 5; i >= 0; i--) {
    const u = i / 5;
    const bx = -fw + u * 2 * fw;
    const drop = 0.034 * s * (0.7 + 0.5 * Math.sin(i * 2.4 + seed * 0.7));
    ctx.lineTo(bx + fw * 0.09, 0.01 * s);
    ctx.lineTo(bx, 0.01 * s + drop);
  }
  ctx.closePath();
  ctx.fill();
  // THE HARNESS: one crude hide strap slung shoulder-to-hip — the
  // scavenger's only tailoring. It crosses the chest face-on and the
  // back from behind (a real strap wraps the body), and carries its
  // bone fetishes only on the chest run.
  const strap = '#3a2a1a';
  const sx0 = lead * tw * 0.72;
  const sy0 = -th * 0.94;
  const sx1 = -lead * ww * 0.8;
  const sy1 = -0.03 * s;
  ctx.strokeStyle = strap;
  ctx.lineWidth = Math.max(2, s * 0.042);
  ctx.beginPath();
  ctx.moveTo(sx0, sy0);
  ctx.lineTo(sx1, sy1);
  ctx.stroke();
  // The strap's worn highlight — leather, not a painted line.
  ctx.strokeStyle = shade(strap, 20);
  ctx.lineWidth = Math.max(1, s * 0.012);
  ctx.beginPath();
  ctx.moveTo(sx0 - lead * s * 0.008, sy0 + s * 0.006);
  ctx.lineTo(sx1 - lead * s * 0.008, sy1 + s * 0.006);
  ctx.stroke();
  if (!back && frontK > 0.3) {
    // Bone fetishes riding the strap: teeth taken off things it ate.
    // The packlord strings more of them — rank counted in trophies.
    const nT = gn.scarred ? 4 : 2;
    for (let i = 0; i < nT; i++) {
      const u = 0.3 + (i / Math.max(1, nT - 1)) * 0.3;
      const bx = sx0 + (sx1 - sx0) * u;
      const by = sy0 + (sy1 - sy0) * u + s * 0.012;
      ctx.fillStyle = '#d8cbaa';
      ctx.beginPath();
      ctx.moveTo(bx - s * 0.012, by);
      ctx.lineTo(bx + (i % 2 === 0 ? 1 : -1) * s * 0.006, by + s * 0.036);
      ctx.lineTo(bx + s * 0.012, by);
      ctx.closePath();
      ctx.fill();
    }
    if (gn.scarred) {
      // The packlord's iron ring cinching the strap mid-chest.
      ctx.strokeStyle = '#5d6068';
      ctx.lineWidth = Math.max(1.5, s * 0.014);
      ctx.beginPath();
      ctx.arc(sx0 + (sx1 - sx0) * 0.5, sy0 + (sy1 - sy0) * 0.5, s * 0.028, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
