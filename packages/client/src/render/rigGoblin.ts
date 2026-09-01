/**
 * THE GREENSKIN — the goblin.
 * Split out of rig.ts on the golems.ts template (foundations F3.4);
 * rig.ts re-exports everything here, so every lab, test and painter
 * keeps its old door.
 */
import { chamferRect } from './shapes.js';
import { shade } from './tint.js';
import { KoboldHeadFrame, scaleRibbon } from './rigKobold.js';

/**
 * THE GREENSKIN DIALECT — the goblin, done at last as its own species.
 * Fifth head-swap dialect after bone, scale, fur, and construct: it
 * swaps head, hair, and face wholesale and reshapes the body's ARGUMENT
 * — the biggest head in the game on the smallest frame, a pot gut over
 * bandy shanks, overlong arms ending in knuckly hands — while the IK
 * rig, carriage, and facing bands keep working untouched. Where the
 * skeleton grins, the kobold bucks, and the gnoll juts, the goblin
 * FLARES: enormous back-swept wing ears wider than the shoulders, the
 * one silhouette that reads goblin at any distance. Each variant is a
 * DESIGN, never a scale-up; the rank-and-file additionally roll a HIDE
 * CLUSTER from the spawn seed so a warband reads as family, never as
 * one body stamped five times.
 */
export interface GoblinLook {
  /** Hide base — the green that names the species. */
  hide: string;
  /** Pale underhide: the pot gut, jaw, palms, and the ear membranes. */
  belly: string;
  /** The dark face ink: pupils, nostrils, maw, claw ticks, the scowl. */
  ink: string;
  /** The lit eye bead — bright, mean, and too small for the head. */
  eye: string;
  /**
   * The loincloth wrap: every goblin owns real underwear — a cloth
   * band lapping the pelvis with a torn apron front and seat. Dirty
   * scrap-cloth on the rabble, school-dyed on the casters, oiled
   * leather under the warboss iron.
   */
  cloth: string;
  /**
   * The casters' ragged half-cowl and shawl; undefined = the bare
   * chest and scrap belt of the rank-and-file.
   */
  garb?: string;
  /** The warboss war-knot: a rag-tied bristle spike on the crown. */
  topknot?: string;
  /** Paired up-tusks proud of the lip — the warboss jaw. */
  tusks?: boolean;
  /** Battle-worn: a notched ear and a cheek scar — rank as ledger. */
  scarred?: boolean;
  /** Frame multiplier: jaw mass, ear reach, gut swell. */
  heavy: number;
  /** Spawn seed carried on the resolved look — per-body wear marks. */
  seed?: number;
}
/** Needle teeth and tusk bone — one tone for every goblin mouth. */
export const GOBLIN_TOOTH = '#e9e0c6';
export const GOBLIN_LOOKS: Record<string, GoblinLook> = {
  // The rank-and-file chopper: moss hide over a pale gut, sulfur eyes
  // under a scowl it was born wearing — brave only in a crowd.
  goblin: {
    hide: '#6f9a44',
    belly: '#b9cb8c',
    ink: '#2a2416',
    eye: '#ffd84a',
    cloth: '#7c6648',
    heavy: 1,
  },
  // The thrower: a wirier build a shade toward olive — the arm that
  // lives at the back of every scrap, pockets full of river stones.
  goblin_thrower: {
    hide: '#7f9540',
    belly: '#c4c690',
    ink: '#2a2416',
    eye: '#ffd84a',
    cloth: '#6e6a52',
    heavy: 0.88,
  },
  // The firecaller: sallow hide under an ember-dyed rag cowl — the
  // camp's fire carried in a shawl that never stopped smouldering.
  goblin_firecaller: {
    hide: '#8a9a4a',
    belly: '#cbc892',
    ink: '#2b2214',
    eye: '#ffb23a',
    cloth: '#8a5230',
    garb: '#b85c26',
    heavy: 1,
  },
  // The gloomcaller: bog-dark hide in a murk-green cowl, eyes lit the
  // sick green of its own bile — even the warband walks around it.
  goblin_gloomcaller: {
    hide: '#5f7d3f',
    belly: '#a8bd82',
    ink: '#232a18',
    eye: '#b9e04a',
    cloth: '#3d4a34',
    garb: '#333f2a',
    heavy: 1.05,
  },
  // The warboss: deep war-green bulk under scavenged iron, true tusks
  // proud of the lip, a rag-tied war-knot and a cheek that lost an
  // argument once — the one goblin the others stand behind.
  goblin_champion: {
    hide: '#4e7a38',
    belly: '#9cb478',
    ink: '#241f14',
    eye: '#ff9a3a',
    cloth: '#54412e',
    topknot: '#33251a',
    tusks: true,
    scarred: true,
    heavy: 1.35,
  },
  // THE ASHEN TYRANT (the dread crown): the caster-king. Ash-scorched
  // hide — a green that has stood too near its own fires for years —
  // over a soot-pale gut, eyes lit the deep furnace orange no other
  // greenskin burns. Wears the court robe (a tyrant's ash-red, darker
  // than the firecaller's working shawl) over oiled leather, tusked
  // and burn-scarred; NO war-knot — this crown's crown is the fire
  // itself, spoken by the charge every time it winds.
  goblin_flame_tyrant: {
    hide: '#6d7a3a',
    belly: '#b8b184',
    ink: '#241c12',
    eye: '#ff7a2e',
    cloth: '#4a3524',
    garb: '#8f3a24',
    tusks: true,
    scarred: true,
    heavy: 1.2,
  },
};
/**
 * THE HIDE CLUSTERS — four curated greens for the rank-and-file,
 * picked by spawn seed so a camp sorts into family groups (the gnoll
 * coat-cluster law, kept): moss, olive, bog, and the sallow runt.
 * Casters and the warboss never roll — a named goblin is a DESIGN.
 */
export const GOBLIN_CLUSTERS: ReadonlyArray<Pick<GoblinLook, 'hide' | 'belly'>> = [
  { hide: '#6f9a44', belly: '#b9cb8c' }, // moss
  { hide: '#847b38', belly: '#cabf8a' }, // olive-brown
  { hide: '#47713e', belly: '#96b47e' }, // bog-dark
  { hide: '#a5ad58', belly: '#ded9a4' }, // the sallow runt
];
export const GOBLIN_LOOK_CACHE = new Map<string, GoblinLook>();
/**
 * Variant lookup with the rank-and-file as the unknown-id fallback.
 * The seed (spawn eid) rolls the chopper's and the thrower's hide
 * cluster plus a small shade jitter; named looks (the casters, the
 * warboss) hold their authored design. Resolved looks are cached —
 * this runs per body per frame.
 */
export function goblinLook(defId: string, seed = 0): GoblinLook {
  const base = GOBLIN_LOOKS[defId] ?? GOBLIN_LOOKS['goblin']!;
  const key = `${defId}|${seed & 0xff}`;
  const hit = GOBLIN_LOOK_CACHE.get(key);
  if (hit) return hit;
  let look: GoblinLook;
  if (defId === 'goblin' || defId === 'goblin_thrower') {
    // Hash the seed before picking: warband members spawn with
    // CONSECUTIVE eids, and raw high bits dressed a whole camp in one
    // hide — the hash spreads a spawned warband across the clusters.
    const h = (seed * 2654435761) | 0;
    const cl = GOBLIN_CLUSTERS[(h >>> 8) & 3]!;
    const jit = (((h >>> 12) & 7) - 3) * 2;
    look = { ...base, hide: shade(cl.hide, jit), belly: cl.belly, seed };
  } else {
    // Named looks hold their authored design — only the wear marks
    // stay the body's own.
    look = { ...base, seed };
  }
  GOBLIN_LOOK_CACHE.set(key, look);
  return look;
}
/**
 * The goblin head, drawn in the head block's own frame. Reads goblin
 * by SILHOUETTE first: WING EARS swept back and out past the shoulder
 * line — the widest thing on the body — over a low broad cranium with
 * no chin to speak of, a HOOKED nose leading the facing, beady bright
 * eyes under a born scowl, and the needle grin ear to ear. The jaw
 * drops through every strike beat and the ears PIN BACK with it: the
 * goblin JEERS as it swings. From behind there is no face — occiput
 * hide, the nape wedge, the ears' backs, and the warboss war-knot.
 */
export function paintGoblinHead(
  ctx: CanvasRenderingContext2D,
  gb: GoblinLook,
  f: KoboldHeadFrame,
): void {
  const { headX, headY, hw, hh, cut, fx, profileK, backK, lead, hurt } = f;
  const hv = gb.heavy;
  const hide = hurt ? '#ffffff' : gb.hide;
  const belly = hurt ? '#ffffff' : gb.belly;
  const back = backK > 0.55;
  const nearSide = lead;
  const gape = f.gape;

  // --- the skull box: broad and LOW — all ears and jaw under a flat
  // crown, the cranium of a thing that plans nothing past dinner.
  const gw = hw * 1.1;
  const crTop = headY - hh * 0.62;
  const crBot = headY + hh * 0.56;

  // --- THE WAR-KNOT, laid down first so the crown laps its root: a
  // rag-cinched bristle spike — the warboss banner the whole camp
  // rallies to. It reads from every band, the back included.
  if (gb.topknot && !hurt) {
    const kx = headX - fx * gw * 0.18;
    ctx.fillStyle = gb.topknot;
    ctx.beginPath();
    ctx.moveTo(kx - gw * 0.2, crTop + hh * 0.1);
    ctx.lineTo(kx - gw * 0.08, crTop - hh * (0.52 + 0.1 * (hv - 1)));
    ctx.lineTo(kx + gw * 0.04, crTop - hh * 0.22);
    ctx.lineTo(kx + gw * 0.16, crTop - hh * (0.42 + 0.1 * (hv - 1)));
    ctx.lineTo(kx + gw * 0.24, crTop + hh * 0.1);
    ctx.closePath();
    ctx.fill();
    // The rag tie: a worn red cinch at the root — the one dyed thing
    // a goblin owns.
    ctx.strokeStyle = '#8a4030';
    ctx.lineWidth = Math.max(1.5, hh * 0.09);
    ctx.beginPath();
    ctx.moveTo(kx - gw * 0.16, crTop + hh * 0.02);
    ctx.lineTo(kx + gw * 0.18, crTop - hh * 0.02);
    ctx.stroke();
  }

  // --- THE WING EARS ARE NOT PAINTED HERE: they are elastic bodies
  // (earPhysics.ts — THE EAR IS A SIMULATION), ticked and painted by
  // drawHumanoid in world space around the whole body: the skull-
  // azimuth projection owns the perspective and the per-ear depth
  // term owns the draw order at every band by construction.

  // --- cranium block: chamfered ROUND — a skull, not a crate. The
  // crown corners cut deep and the jaw corners deeper than the other
  // dialects because the jowls below rebuild the width the cuts take.
  ctx.fillStyle = hide;
  ctx.beginPath();
  chamferRect(ctx, headX - gw, crTop, gw * 2, crBot - crTop, [cut * 1.8, cut * 1.8, cut * 1.3, cut * 1.3]);
  ctx.fill();
  if (!hurt) {
    // THE FORM SPLIT restated for hide: hard shade right half, lit
    // crown band, jaw under-shade — the block reads as mass.
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, headX - gw, crTop, gw * 2, crBot - crTop, [cut * 1.8, cut * 1.8, cut * 1.3, cut * 1.3]);
    ctx.clip();
    ctx.fillStyle = shade(gb.hide, -10);
    ctx.fillRect(headX, crTop, gw, crBot - crTop);
    ctx.fillStyle = shade(gb.hide, 9);
    ctx.fillRect(headX - gw, crTop, gw * 2, hh * 0.14);
    ctx.fillStyle = shade(gb.hide, -16);
    ctx.fillRect(headX - gw, crBot - hh * 0.1, gw * 2, hh * 0.1);
    ctx.restore();
  }
  // --- the jowls: cheek masses bulging past the chamfer line, low
  // and wide — the fed-on-anything face. Far jowl steps smaller at
  // the three-quarter bands; both read from behind as skull width.
  const drawJowl = (side: number, depth: number): void => {
    // The jowl retreats toward the jaw's REAR as the head turns — a
    // cheek mass in front of the mouth at profile reads as a flap
    // folded over the face, never as anatomy.
    const jx = headX - fx * gw * (0.08 + 0.52 * profileK) + side * gw * 0.8 * (1 - 0.6 * profileK);
    const jy = headY + hh * 0.24;
    const jk = depth * (1 - 0.22 * profileK);
    ctx.fillStyle = hurt ? '#ffffff' : shade(gb.hide, side === (fx >= 0 ? 1 : -1) ? -2 : -9);
    ctx.beginPath();
    ctx.ellipse(jx, jy, gw * 0.3 * jk, hh * 0.3 * jk, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  if (profileK < 0.72 || back) drawJowl(-nearSide, back ? 0.9 : 0.78);
  // Past the profile threshold the authored side view seats its own
  // jowl at the jaw's REAR — the blended one would land mid-face.
  if (profileK <= 0.9 || back) drawJowl(nearSide, back ? 0.9 : 0.95);

  if (back) {
    // --- the occiput: no face from behind. Hide courses, the nape
    // wedge where the skull sinks toward the hunch, and the ear roots
    // reading as knobs off the skull sides.
    if (!hurt) {
      ctx.strokeStyle = shade(gb.hide, -13);
      ctx.lineWidth = Math.max(1, hh * 0.05);
      for (const t of [0.34, 0.6]) {
        ctx.beginPath();
        ctx.moveTo(headX - gw * 0.58, crTop + (crBot - crTop) * t);
        ctx.lineTo(headX + gw * 0.58, crTop + (crBot - crTop) * t);
        ctx.stroke();
      }
      ctx.fillStyle = shade(gb.hide, -20);
      ctx.beginPath();
      chamferRect(ctx, headX - gw * 0.4, crBot - hh * 0.18, gw * 0.8, hh * 0.18, cut * 0.3);
      ctx.fill();
      if (gb.scarred) {
        // The warboss keeps its ledger on the back of its head too: a
        // pale old crease across the occiput.
        ctx.strokeStyle = shade(gb.hide, 26);
        ctx.lineWidth = Math.max(1, hh * 0.05);
        ctx.beginPath();
        ctx.moveTo(headX - gw * 0.34, crTop + hh * 0.4);
        ctx.lineTo(headX + gw * 0.2, crTop + hh * 0.52);
        ctx.stroke();
      }
    }
    return;
  }

  // ============ THE TRUE PROFILE: AN AUTHORED MODEL, NOT A BLEND ====
  // At E/W every front-face element used to extrapolate its own
  // profileK arithmetic to 1.0 and the errors COMPOUNDED — a botched
  // eye here, a beached jowl there, a nose that read as an ear. Past
  // the swap threshold the head now paints a bespoke side view with
  // authored constants: one hooded eye forward on the face, the brow
  // shelf overhanging it, the short jeer seam running home to the
  // rear jowl, and the CROOK nose — bridge arcing up off the brow,
  // cresting, curling decisively DOWN past the grin. The blends below
  // this branch only ever serve the three-quarter band (profileK
  // ≈ 0.707) again — nothing extrapolates.
  if (profileK > 0.9) {
    const F = lead;
    const face = headX + F * gw;
    const pEyeY = headY - hh * 0.14;
    const pMouthY = headY + hh * 0.3;
    const jawDrop = gape * hh * 0.52;
    const mFront = face + F * hh * 0.02;
    const mBack = headX - F * gw * 0.42;

    // --- the brow shelf in silhouette: bone running rear-high to a
    // front overhang, dipping to the nose root.
    if (!hurt) {
      ctx.fillStyle = shade(gb.hide, -12);
      ctx.beginPath();
      ctx.moveTo(headX - F * gw * 0.55, pEyeY - hh * 0.34);
      ctx.quadraticCurveTo(headX + F * gw * 0.2, pEyeY - hh * 0.48, face + F * hh * 0.12, pEyeY - hh * 0.24);
      ctx.lineTo(face + F * hh * 0.06, pEyeY - hh * 0.06);
      ctx.quadraticCurveTo(headX + F * gw * 0.2, pEyeY - hh * 0.18, headX - F * gw * 0.5, pEyeY - hh * 0.16);
      ctx.closePath();
      ctx.fill();
      // The lit top plane — bone catching the sky.
      ctx.fillStyle = shade(gb.hide, 6);
      ctx.beginPath();
      ctx.moveTo(headX - F * gw * 0.48, pEyeY - hh * 0.32);
      ctx.quadraticCurveTo(headX + F * gw * 0.2, pEyeY - hh * 0.44, face + F * hh * 0.08, pEyeY - hh * 0.24);
      ctx.lineTo(face + F * hh * 0.02, pEyeY - hh * 0.19);
      ctx.quadraticCurveTo(headX + F * gw * 0.2, pEyeY - hh * 0.37, headX - F * gw * 0.44, pEyeY - hh * 0.27);
      ctx.closePath();
      ctx.fill();
      // The hooded-eye shadow under the shelf.
      ctx.strokeStyle = gb.ink;
      ctx.lineWidth = Math.max(1, hh * 0.045);
      ctx.beginPath();
      ctx.moveTo(face - F * gw * 0.04, pEyeY - hh * 0.19);
      ctx.quadraticCurveTo(headX + F * gw * 0.44, pEyeY - hh * 0.28, headX + F * gw * 0.2, pEyeY - hh * 0.18);
      ctx.stroke();
    }

    // --- ONE eye, forward on the face under the shelf, slanted
    // toward the temple, slit pupil set toward where it looks.
    const ex = headX + F * gw * 0.5;
    ctx.fillStyle = hurt ? '#ffffff' : gb.eye;
    ctx.beginPath();
    ctx.ellipse(ex, pEyeY, hh * 0.13, hh * 0.085, -F * 0.3, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.strokeStyle = shade(gb.hide, -22);
      ctx.lineWidth = Math.max(1, hh * 0.03);
      ctx.beginPath();
      ctx.ellipse(ex, pEyeY, hh * 0.13, hh * 0.085, -F * 0.3, Math.PI * 0.15, Math.PI * 0.9);
      ctx.stroke();
      ctx.fillStyle = gb.ink;
      ctx.beginPath();
      ctx.ellipse(ex + F * hh * 0.045, pEyeY + hh * 0.005, hh * 0.034, hh * 0.068, -F * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- the warboss ledger rakes the visible cheek.
    if (gb.scarred && !hurt) {
      ctx.strokeStyle = shade(gb.hide, 26);
      ctx.lineWidth = Math.max(1, hh * 0.045);
      for (const o of [0, 0.14] as const) {
        ctx.beginPath();
        ctx.moveTo(headX + F * gw * (0.3 + o * 0.2), pEyeY + hh * (0.16 + o));
        ctx.lineTo(headX + F * gw * (0.08 + o * 0.2), pEyeY + hh * (0.44 + o));
        ctx.stroke();
      }
    }

    // --- the maw, the mandible, and the short jeer seam. The seam's
    // REAR corner rises — the goblin smirks even side-on.
    if (gape > 0.05) {
      ctx.fillStyle = hurt ? '#ffffff' : gb.ink;
      ctx.beginPath();
      chamferRect(
        ctx,
        Math.min(mFront, mBack),
        pMouthY - hh * 0.03,
        Math.abs(mFront - mBack),
        jawDrop + hh * 0.08,
        cut * 0.4,
      );
      ctx.fill();
    }
    ctx.fillStyle = belly;
    ctx.beginPath();
    chamferRect(
      ctx,
      Math.min(mFront, mBack - F * gw * 0.06),
      pMouthY + jawDrop,
      Math.abs(mFront - (mBack - F * gw * 0.06)),
      hh * 0.24,
      [cut * 0.2, cut * 0.2, cut * 0.7, cut * 0.7],
    );
    ctx.fill();
    if (!hurt) {
      ctx.strokeStyle = shade(gb.hide, -24);
      ctx.lineWidth = Math.max(1, hh * 0.045);
      ctx.beginPath();
      chamferRect(
        ctx,
        Math.min(mFront, mBack - F * gw * 0.06),
        pMouthY + jawDrop,
        Math.abs(mFront - (mBack - F * gw * 0.06)),
        hh * 0.24,
        [cut * 0.2, cut * 0.2, cut * 0.7, cut * 0.7],
      );
      ctx.stroke();
      ctx.strokeStyle = gb.ink;
      ctx.lineWidth = Math.max(1, hh * 0.055);
      ctx.beginPath();
      ctx.moveTo(mFront, pMouthY - hh * 0.04);
      ctx.quadraticCurveTo(
        (mFront + mBack) / 2,
        pMouthY + hh * 0.06,
        mBack,
        pMouthY - hh * 0.12,
      );
      ctx.stroke();
      // Needle teeth off the seam — snaggled, never a tidy row.
      ctx.fillStyle = GOBLIN_TOOTH;
      for (const [u, len] of [
        [0.2, 0.15],
        [0.55, 0.1],
      ] as const) {
        const tx = mFront + (mBack - mFront) * u;
        const ty = pMouthY + hh * 0.01;
        ctx.beginPath();
        ctx.moveTo(tx - hh * 0.035, ty);
        ctx.lineTo(tx + hh * 0.005, ty + hh * len + jawDrop * 0.12);
        ctx.lineTo(tx + hh * 0.045, ty);
        ctx.closePath();
        ctx.fill();
      }
      if (gape > 0.05) {
        for (const u of [0.35, 0.72] as const) {
          const tx = mFront + (mBack - mFront) * u;
          const ty = pMouthY + jawDrop + hh * 0.02;
          ctx.beginPath();
          ctx.moveTo(tx - hh * 0.035, ty);
          ctx.lineTo(tx + hh * 0.005, ty - hh * 0.11 - jawDrop * 0.15);
          ctx.lineTo(tx + hh * 0.045, ty);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // --- ONE tusk rides the mandible front through the gape.
    if (gb.tusks && !hurt) {
      const bx = face - F * hh * 0.02;
      const by = pMouthY + jawDrop + hh * 0.1;
      scaleRibbon(
        ctx,
        bx,
        by,
        bx + F * gw * 0.2,
        by - hh * 0.26,
        bx + F * gw * 0.14,
        by - hh * (0.5 + 0.08 * (hv - 1)),
        hh * 0.15,
        GOBLIN_TOOTH,
        shade(GOBLIN_TOOTH, -38),
      );
    }

    // --- one nasolabial crease ages the cheek out of cartoon.
    if (!hurt) {
      ctx.strokeStyle = shade(gb.hide, -18);
      ctx.lineWidth = Math.max(1, hh * 0.035);
      ctx.beginPath();
      ctx.moveTo(face - F * gw * 0.08, pMouthY - hh * 0.26);
      ctx.quadraticCurveTo(face - F * gw * 0.18, pMouthY - hh * 0.12, face - F * gw * 0.32, pMouthY - hh * 0.02);
      ctx.stroke();
    }

    // --- THE NOSE, last so it overhangs everything: THE SAME broad
    // wedge the face-on band wears, simply turned side-on — flat
    // planes and a bony knuckle (FLAT FORGE LAW), never a rounded
    // tube. The bridge runs nearly straight off the brow, BREAKS at
    // the knuckle on the eye line, tapers to the pointed tip, and the
    // point turns DOWN past the grin; the underside is one flat plane
    // stepping back through the nostril. Always shorter than the
    // standing ear behind it (SILHOUETTE HIERARCHY).
    const reach = gw * 0.58;
    const nRootX = face - F * gw * 0.02;
    const rootTopY = pEyeY - hh * 0.12;
    const knX = face + F * reach * 0.5;
    const knY = pEyeY - hh * 0.02;
    const tipX = face + F * reach;
    const tipY = pMouthY - hh * 0.16;
    const hookX = face + F * reach * 0.84;
    const hookY = pMouthY + hh * 0.08;
    const underX = face + F * reach * 0.6;
    const underY = pMouthY - hh * 0.1;
    const nostX = face + F * gw * 0.12;
    const nostY = pMouthY - hh * 0.18;
    ctx.fillStyle = hurt ? '#ffffff' : shade(gb.hide, 5);
    ctx.beginPath();
    ctx.moveTo(nRootX, rootTopY);
    ctx.lineTo(knX, knY);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(hookX, hookY);
    ctx.lineTo(underX, underY);
    ctx.lineTo(nostX, nostY);
    ctx.quadraticCurveTo(face - F * gw * 0.05, pMouthY - hh * 0.2, nRootX, pEyeY + hh * 0.1);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      ctx.strokeStyle = shade(gb.hide, -26);
      ctx.lineWidth = Math.max(1, hh * 0.045);
      ctx.stroke();
      // The lit plane rides the bridge and breaks with the knuckle —
      // an angular facet, exactly the face-on wedge's bright top.
      ctx.fillStyle = shade(gb.hide, 14);
      ctx.beginPath();
      ctx.moveTo(nRootX, rootTopY + hh * 0.03);
      ctx.lineTo(knX - F * hh * 0.02, knY + hh * 0.04);
      ctx.lineTo(tipX - F * hh * 0.05, tipY + hh * 0.07);
      ctx.lineTo(knX - F * hh * 0.04, knY + hh * 0.11);
      ctx.lineTo(nRootX, pEyeY + hh * 0.01);
      ctx.closePath();
      ctx.fill();
      // The underside plane holds the shade that seats the wedge
      // over the mouth...
      ctx.fillStyle = shade(gb.hide, -14);
      ctx.beginPath();
      ctx.moveTo(hookX, hookY);
      ctx.lineTo(underX, underY);
      ctx.lineTo(nostX, nostY);
      ctx.lineTo(nostX + F * hh * 0.04, nostY + hh * 0.05);
      ctx.lineTo(underX + F * hh * 0.02, underY + hh * 0.05);
      ctx.closePath();
      ctx.fill();
      // ...and the ONE visible nostril flares off its base.
      ctx.fillStyle = gb.ink;
      ctx.beginPath();
      ctx.ellipse(nostX - F * hh * 0.02, nostY + hh * 0.03, hh * 0.05, hh * 0.032, F * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  // --- THE BROW LEDGE: one protruding shelf of bone dipping toward
  // the nose root — a carved form, not a drawn-on frown. Its shadow
  // line hoods the eyes, and the goblin is angry before anything has
  // happened.
  const eyeY = headY - hh * 0.14;
  const eCx = headX + fx * gw * 0.16;
  if (!hurt && !back) {
    const blW = gw * 0.82 * (1 - 0.38 * profileK);
    const blTop = eyeY - hh * 0.42;
    ctx.fillStyle = shade(gb.hide, -12);
    ctx.beginPath();
    ctx.moveTo(eCx - blW, blTop + hh * 0.1);
    ctx.quadraticCurveTo(eCx - blW * 0.4, blTop - hh * 0.04, eCx + fx * gw * 0.02, blTop + hh * 0.12);
    ctx.quadraticCurveTo(eCx + blW * 0.4, blTop - hh * 0.04, eCx + blW, blTop + hh * 0.1);
    ctx.lineTo(eCx + blW * 0.86, blTop + hh * 0.26);
    ctx.quadraticCurveTo(eCx + blW * 0.3, blTop + hh * 0.14, eCx + fx * gw * 0.02, blTop + hh * 0.3);
    ctx.quadraticCurveTo(eCx - blW * 0.3, blTop + hh * 0.14, eCx - blW * 0.86, blTop + hh * 0.26);
    ctx.closePath();
    ctx.fill();
    // The lit top plane of the shelf — bone catching the sky.
    ctx.fillStyle = shade(gb.hide, 6);
    ctx.beginPath();
    ctx.moveTo(eCx - blW * 0.9, blTop + hh * 0.1);
    ctx.quadraticCurveTo(eCx - blW * 0.4, blTop - hh * 0.02, eCx + fx * gw * 0.02, blTop + hh * 0.13);
    ctx.quadraticCurveTo(eCx + blW * 0.4, blTop - hh * 0.02, eCx + blW * 0.9, blTop + hh * 0.1);
    ctx.lineTo(eCx + blW * 0.7, blTop + hh * 0.16);
    ctx.quadraticCurveTo(eCx, blTop + hh * 0.04, eCx - blW * 0.7, blTop + hh * 0.16);
    ctx.closePath();
    ctx.fill();
    // The shadow under the shelf: the hooded-eye line.
    ctx.strokeStyle = gb.ink;
    ctx.lineWidth = Math.max(1, hh * 0.045);
    for (const side of [-1, 1] as const) {
      if (profileK > 0.72 && side !== nearSide) continue;
      const bx = eCx + side * gw * 0.38 * (1 - 0.3 * profileK);
      ctx.beginPath();
      ctx.moveTo(bx + side * gw * 0.2, eyeY - hh * 0.22);
      ctx.quadraticCurveTo(bx, eyeY - hh * 0.3, bx - side * gw * 0.14, eyeY - hh * 0.18);
      ctx.stroke();
    }
  }

  // --- the eyes: wide, SLANTED toward the temples under the brow
  // shelf — the D&D goblin read — with a slit pupil, the far eye
  // slipping around the corner at profile.
  for (const side of [-1, 1] as const) {
    if (profileK > 0.72 && side !== nearSide) continue;
    const ex = eCx + side * gw * 0.37 * (1 - 0.32 * profileK);
    const slant = -side * 0.3;
    ctx.fillStyle = hurt ? '#ffffff' : gb.eye;
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, hh * 0.15, hh * 0.088, slant, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      // The socket's inner corner shade seats the eye in the skull.
      ctx.strokeStyle = shade(gb.hide, -22);
      ctx.lineWidth = Math.max(1, hh * 0.03);
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, hh * 0.15, hh * 0.088, slant, Math.PI * 0.15, Math.PI * 0.9);
      ctx.stroke();
      ctx.fillStyle = gb.ink;
      ctx.beginPath();
      ctx.ellipse(ex + fx * hh * 0.03, eyeY + hh * 0.005, hh * 0.036, hh * 0.07, slant * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- the warboss ledger: an old claw scar raking the near cheek.
  if (gb.scarred && !hurt && profileK < 0.9) {
    ctx.strokeStyle = shade(gb.hide, 26);
    ctx.lineWidth = Math.max(1, hh * 0.045);
    for (const o of [0, 0.14] as const) {
      ctx.beginPath();
      ctx.moveTo(eCx + nearSide * gw * (0.5 + o * 0.3), eyeY + hh * (0.14 + o));
      ctx.lineTo(eCx + nearSide * gw * (0.28 + o * 0.3), eyeY + hh * (0.42 + o));
      ctx.stroke();
    }
  }

  // --- the mouth: the needle grin, ear to ear with the corners up —
  // and the jaw beneath it, a RECEDING chin narrower than the skull.
  // The gape drops the pale mandible, opens the dark maw, and bares
  // the needles; the warboss tusks ride the jaw through all of it.
  const mouthY = headY + hh * 0.3;
  const mCx = headX + fx * gw * 0.12;
  const mHw = gw * (0.72 - 0.22 * profileK);
  const jawDrop = gape * hh * 0.52;
  if (gape > 0.05) {
    // The maw: ink first, so teeth and jaw read against it.
    ctx.fillStyle = hurt ? '#ffffff' : gb.ink;
    ctx.beginPath();
    chamferRect(ctx, mCx - mHw * 0.86, mouthY - hh * 0.04, mHw * 1.72, jawDrop + hh * 0.1, cut * 0.4);
    ctx.fill();
  }
  // The mandible: pale, narrow, and slung under — the weak chin that
  // makes the cranium read all the bigger.
  ctx.fillStyle = belly;
  ctx.beginPath();
  chamferRect(
    ctx,
    mCx - mHw * 0.78,
    mouthY + jawDrop,
    mHw * 1.56,
    hh * 0.24,
    [cut * 0.2, cut * 0.2, cut * 0.7, cut * 0.7],
  );
  ctx.fill();
  if (!hurt) {
    ctx.strokeStyle = shade(gb.hide, -24);
    ctx.lineWidth = Math.max(1, hh * 0.045);
    ctx.beginPath();
    chamferRect(
      ctx,
      mCx - mHw * 0.78,
      mouthY + jawDrop,
      mHw * 1.56,
      hh * 0.24,
      [cut * 0.2, cut * 0.2, cut * 0.7, cut * 0.7],
    );
    ctx.stroke();
    // The grin seam: corners UP — a goblin's resting face is a jeer.
    ctx.strokeStyle = gb.ink;
    ctx.lineWidth = Math.max(1, hh * 0.055);
    ctx.beginPath();
    ctx.moveTo(mCx - mHw, mouthY - hh * 0.1);
    ctx.quadraticCurveTo(mCx, mouthY + hh * 0.06, mCx + mHw, mouthY - hh * 0.1);
    ctx.stroke();
    // Needle teeth: snaggled ticks hanging off the seam — never a
    // tidy row (a goblin's dentist is a rock).
    ctx.fillStyle = GOBLIN_TOOTH;
    for (const [u, len] of [
      [-0.66, 0.14],
      [-0.3, 0.1],
      [0.12, 0.15],
      [0.52, 0.09],
    ] as const) {
      const tx = mCx + u * mHw;
      const ty = mouthY + hh * 0.02 - u * u * hh * 0.1;
      ctx.beginPath();
      ctx.moveTo(tx - hh * 0.035, ty);
      ctx.lineTo(tx + hh * 0.005, ty + hh * len + jawDrop * 0.12);
      ctx.lineTo(tx + hh * 0.045, ty);
      ctx.closePath();
      ctx.fill();
    }
    if (gape > 0.05) {
      // Lower needles rise off the dropped jaw to meet them.
      for (const u of [-0.48, 0.02, 0.42] as const) {
        const tx = mCx + u * mHw;
        const ty = mouthY + jawDrop + hh * 0.02;
        ctx.beginPath();
        ctx.moveTo(tx - hh * 0.035, ty);
        ctx.lineTo(tx + hh * 0.005, ty - hh * 0.11 - jawDrop * 0.15);
        ctx.lineTo(tx + hh * 0.045, ty);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  // --- THE TUSKS: paired up-hooks proud of the lip, riding the
  // mandible through the gape — the warboss argument, drawn as filled
  // curved mass with an outline (the ram's-horn law), never strokes.
  if (gb.tusks && !hurt) {
    for (const side of [-1, 1] as const) {
      if (profileK > 0.72 && side !== nearSide) continue;
      const bx = mCx + side * mHw * 0.62;
      const by = mouthY + jawDrop + hh * 0.1;
      scaleRibbon(
        ctx,
        bx,
        by,
        bx + side * gw * 0.22,
        by - hh * 0.28,
        bx + side * gw * 0.16,
        by - hh * (0.52 + 0.08 * (hv - 1)),
        hh * 0.15,
        GOBLIN_TOOTH,
        shade(GOBLIN_TOOTH, -38),
      );
    }
  }

  // --- the cheek creases: the nasolabial folds from nostril flare
  // toward the mouth corners — the two lines that age a face out of
  // cartoon. Drawn before the nose so the flare overlaps their start.
  if (!hurt && profileK < 0.85) {
    ctx.strokeStyle = shade(gb.hide, -18);
    ctx.lineWidth = Math.max(1, hh * 0.035);
    for (const side of [-1, 1] as const) {
      if (profileK > 0.6 && side !== nearSide) continue;
      const cx0 = eCx + side * gw * 0.24;
      ctx.beginPath();
      ctx.moveTo(cx0, mouthY - hh * 0.32);
      ctx.quadraticCurveTo(cx0 + side * gw * 0.22, mouthY - hh * 0.16, mCx + side * mHw * 0.86, mouthY - hh * 0.06);
      ctx.stroke();
    }
  }

  // --- THE HOOK NOSE, last so it overhangs the grin: a BROAD wedge
  // off the brow root, hooking down to a pointed tip past the grin
  // seam — wide nostril flares at the underside, a lit bridge plane
  // on top. Carved planes with an outline, never a stick and a ball.
  // At profile the hook is a CROOK, never a spear: the bridge arcs UP
  // off the brow, crests, and the tip curls decisively DOWN — a
  // straight forward point reads as an ear worn on the face. Shorter
  // than the ear behind it, always. Face-on it still drops past the
  // grin seam, unchanged.
  const nl = gw * (0.3 + 0.5 * profileK);
  const nRootX = headX + fx * gw * 0.16;
  const nRootY = eyeY + hh * 0.02;
  const rootW = gw * 0.2;
  const tipX = headX + fx * (gw * 0.24 + nl);
  const tipY = mouthY + hh * 0.1 - hh * 0.18 * profileK;
  const flareY = mouthY - hh * 0.22;
  const flareW = gw * 0.3 * (1 - 0.4 * profileK);
  ctx.fillStyle = hurt ? '#ffffff' : shade(gb.hide, 5);
  ctx.beginPath();
  ctx.moveTo(nRootX - rootW, nRootY);
  // Leading edge: the bridge arcs high, then the hook curls down into
  // the tip — the arc IS the crook.
  ctx.quadraticCurveTo(
    nRootX + fx * nl * 0.75 - gw * 0.02,
    nRootY - hh * (0.06 + 0.3 * profileK),
    tipX,
    tipY,
  );
  // Underside: back up through the near nostril flare — the wide
  // goblin nostrils are the wedge's own base, not a dot on a ball.
  ctx.quadraticCurveTo(tipX - fx * gw * 0.1 + flareW * 0.4, tipY - hh * 0.015, nRootX + fx * gw * 0.06 + flareW, flareY + hh * 0.1);
  ctx.quadraticCurveTo(nRootX + fx * gw * 0.04, flareY + hh * 0.16, nRootX + fx * gw * 0.02 - flareW, flareY + hh * 0.09);
  ctx.lineTo(nRootX + rootW * (fx >= 0 ? -0.4 : 0.4), nRootY + hh * 0.06);
  ctx.closePath();
  ctx.fill();
  if (!hurt) {
    ctx.strokeStyle = shade(gb.hide, -26);
    ctx.lineWidth = Math.max(1, hh * 0.045);
    ctx.stroke();
    // The lit bridge plane: one bright facet riding the arc's crest —
    // the carved read at a glance. It follows the crook, never
    // outruns it (a straight bright sliver re-spears the hook).
    ctx.fillStyle = shade(gb.hide, 14);
    ctx.beginPath();
    ctx.moveTo(nRootX - rootW * 0.4, nRootY + hh * 0.02);
    ctx.quadraticCurveTo(
      nRootX + fx * nl * 0.55,
      nRootY - hh * (0.02 + 0.22 * profileK),
      tipX - fx * gw * 0.14,
      tipY - hh * (0.1 + 0.06 * profileK),
    );
    ctx.quadraticCurveTo(nRootX + fx * nl * 0.45, nRootY + hh * 0.08, nRootX - rootW * 0.1, nRootY + hh * 0.09);
    ctx.closePath();
    ctx.fill();
    // The underside shade seats the wedge over the mouth...
    ctx.fillStyle = shade(gb.hide, -14);
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.quadraticCurveTo(tipX - fx * gw * 0.12, tipY - hh * 0.02, nRootX + fx * gw * 0.05 + flareW * 0.7, flareY + hh * 0.12);
    ctx.quadraticCurveTo(tipX - fx * gw * 0.06, tipY - hh * 0.09, tipX, tipY);
    ctx.closePath();
    ctx.fill();
    // ...and the nostrils flare wide off it: ink wedges, one each
    // side face-on, the near one alone at profile.
    ctx.fillStyle = gb.ink;
    for (const side of [-1, 1] as const) {
      if (profileK > 0.6 && side !== nearSide) continue;
      const nx = nRootX + fx * gw * 0.05 + side * flareW * 0.72;
      ctx.beginPath();
      ctx.ellipse(nx, flareY + hh * 0.1, hh * 0.045, hh * 0.03, side * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
/** Torso-local frame for the goblin body overpaint. */
export interface GoblinBodyFrame {
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
 * THE LOINCLOTH — every goblin owns real underwear. A cloth wrap
 * lapping the pelvis hip to hip, with a torn apron hanging over the
 * front and a seat flap covering the back band: coverage from every
 * facing, never a naked hip line. Drawn in the torso's local frame
 * over the legs and UNDER the gut overpaint, and — unlike the gut —
 * for EVERY variant: the warboss wears its wrap under the scavenged
 * iron the way every soldier ever has.
 */
export function paintGoblinLoincloth(
  ctx: CanvasRenderingContext2D,
  gb: GoblinLook,
  f: GoblinBodyFrame,
): void {
  const { s, ww, fx, backK, hurt } = f;
  if (hurt) return;
  const back = backK > 0.55;
  const cloth = gb.cloth;
  const bw = ww * 1.04;
  const topY = -0.05 * s;
  const bandH = 0.095 * s;
  // --- the wrap band: hip to hip, wider than the waist so it reads
  // as cloth AROUND the body, not paint on it.
  ctx.fillStyle = cloth;
  ctx.beginPath();
  chamferRect(ctx, -bw, topY, bw * 2, bandH, 0.018 * s);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  chamferRect(ctx, -bw, topY, bw * 2, bandH, 0.018 * s);
  ctx.clip();
  // Form split + the fold creases of wound cloth.
  ctx.fillStyle = shade(cloth, -11);
  ctx.fillRect(0, topY, bw, bandH);
  ctx.fillStyle = shade(cloth, 8);
  ctx.fillRect(-bw, topY, bw * 2, bandH * 0.3);
  ctx.strokeStyle = shade(cloth, -18);
  ctx.lineWidth = Math.max(1, s * 0.012);
  for (const u of [-0.45, 0.15, 0.62]) {
    ctx.beginPath();
    ctx.moveTo(bw * u, topY + bandH * 0.15);
    ctx.lineTo(bw * (u + 0.12), topY + bandH);
    ctx.stroke();
  }
  ctx.restore();
  // --- the apron: a hanging flap with a torn hem — the front drape
  // facing the camera, the seat flap facing away. It leads the facing
  // a touch so profile bands keep their coverage too.
  const aw = ww * (0.62 + 0.1 * (1 - Math.abs(fx)));
  const ax = fx * ww * 0.16;
  const drop = 0.15 * s * (0.94 + 0.18 * (gb.heavy - 1));
  const hemY = topY + bandH + drop;
  ctx.fillStyle = back ? shade(cloth, -7) : shade(cloth, -3);
  ctx.beginPath();
  ctx.moveTo(ax - aw, topY + bandH - 0.024 * s);
  ctx.lineTo(ax + aw, topY + bandH - 0.024 * s);
  // The torn hem: ragged teeth, never a tailored edge.
  ctx.lineTo(ax + aw * 0.86, hemY - 0.02 * s);
  for (let i = 3; i >= 0; i--) {
    const u = (i / 3) * 2 - 1;
    const tear = 0.028 * s * (0.5 + 0.5 * Math.sin(i * 2.7 + 1.2));
    ctx.lineTo(ax + u * aw * 0.66 + aw * 0.1, hemY - 0.022 * s);
    ctx.lineTo(ax + u * aw * 0.66, hemY + tear - 0.01 * s);
  }
  ctx.lineTo(ax - aw * 0.86, hemY - 0.02 * s);
  ctx.closePath();
  ctx.fill();
  // The drape's center fold and one honest patch: cloth that has
  // been worn, washed never, and mended once.
  ctx.strokeStyle = shade(cloth, -16);
  ctx.lineWidth = Math.max(1, s * 0.013);
  ctx.beginPath();
  ctx.moveTo(ax + fx * aw * 0.2, topY + bandH);
  ctx.lineTo(ax + fx * aw * 0.26, hemY - 0.03 * s);
  ctx.stroke();
  if (!back) {
    ctx.fillStyle = shade(cloth, 12);
    ctx.beginPath();
    chamferRect(ctx, ax - aw * 0.46, topY + bandH + drop * 0.28, 0.05 * s, 0.04 * s, 0.008 * s);
    ctx.fill();
    ctx.strokeStyle = shade(cloth, -16);
    ctx.lineWidth = Math.max(1, s * 0.008);
    ctx.beginPath();
    chamferRect(ctx, ax - aw * 0.46, topY + bandH + drop * 0.28, 0.05 * s, 0.04 * s, 0.008 * s);
    ctx.stroke();
  }
}
/**
 * THE POT GUT — the goblin's torso overpaint, drawn in the torso's
 * local frame AFTER the garment quad (which paints in plain hide) and
 * gated OFF whenever a real body item is worn (the warboss keeps its
 * scavenged iron; nothing here may cover gear that drops). It turns
 * the flat tunic block into a body: the low-slung belly with its lit
 * pale panel and navel, the crease shading under the overhang, a
 * crude rope belt cinched UNDER the gut with the scrap pouch on the
 * hip — and for the casters, the ragged half-shawl with its torn hem
 * over the shoulders. Species dressing painted on, never equipment.
 */
export function paintGoblinTorso(
  ctx: CanvasRenderingContext2D,
  gb: GoblinLook,
  f: GoblinBodyFrame,
): void {
  const { s, tw, ww, th, fx, fy, backK, lead, hurt } = f;
  const back = backK > 0.55;
  const frontK = Math.max(0, Math.min(1, (fy - 0.1) / 0.35));
  const hv = gb.heavy;
  if (hurt) return; // the hurt flash keeps the silhouette clean
  // --- the gut: a low-slung swell wider than the hips, leading the
  // facing a touch — mass a body earns by eating everything it finds.
  const gx = fx * ww * 0.12;
  const gy = -th * 0.3;
  const grx = ww * (0.94 + 0.14 * (hv - 1) * 2);
  const gry = th * 0.33 * (1 + 0.3 * (hv - 1));
  ctx.fillStyle = gb.hide;
  ctx.beginPath();
  ctx.ellipse(gx, gy, grx, gry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(gx, gy, grx, gry, 0, 0, Math.PI * 2);
  ctx.clip();
  // Form split: shade the trailing half, light the top of the swell.
  ctx.fillStyle = shade(gb.hide, -9);
  ctx.fillRect(gx, gy - gry, grx, gry * 2);
  ctx.fillStyle = shade(gb.hide, 8);
  ctx.fillRect(gx - grx, gy - gry, grx * 2, gry * 0.42);
  if (!back && frontK > 0.05) {
    // The pale panel: underhide belly with its navel tick — inside
    // the gut's own silhouette, never past it.
    ctx.globalAlpha = Math.min(1, frontK * 1.4);
    ctx.fillStyle = gb.belly;
    ctx.beginPath();
    ctx.ellipse(gx, gy + gry * 0.16, grx * 0.62, gry * 0.68, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(gb.belly, -26);
    ctx.beginPath();
    ctx.ellipse(gx + fx * grx * 0.1, gy + gry * 0.34, gry * 0.07, gry * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (back) {
    // The sway back: a spine groove and two shoulder-blade ticks —
    // the gut read from behind is the bowed spine that carries it.
    ctx.strokeStyle = shade(gb.hide, -16);
    ctx.lineWidth = Math.max(1.5, s * 0.02);
    ctx.beginPath();
    ctx.moveTo(0, -th * 0.9);
    ctx.quadraticCurveTo(-fx * ww * 0.2, gy, 0, gy + gry * 0.7);
    ctx.stroke();
    for (const side of [-1, 1] as const) {
      ctx.beginPath();
      ctx.moveTo(side * tw * 0.42, -th * 0.78);
      ctx.lineTo(side * tw * 0.6, -th * 0.6);
      ctx.stroke();
    }
  }
  ctx.restore();
  // The crease: one dark arc under the overhang seats the gut on the
  // hips — the line that makes the swell read as weight, not balloon.
  ctx.strokeStyle = shade(gb.hide, -22);
  ctx.lineWidth = Math.max(1.5, s * 0.018);
  ctx.beginPath();
  ctx.ellipse(gx, gy + gry * 0.5, grx * 0.66, gry * 0.5, 0, Math.PI * 0.22, Math.PI * 0.78);
  ctx.stroke();
  // --- the rope belt, cinched UNDER the gut so the swell overhangs
  // it, with the scrap pouch riding the lead hip. The rank-and-file's
  // whole wardrobe: a rope, a pouch, and optimism.
  const beltY = gy + gry * 0.72;
  ctx.strokeStyle = '#7a5c34';
  ctx.lineWidth = Math.max(2, s * 0.035);
  ctx.beginPath();
  ctx.moveTo(-ww * 0.92, beltY + s * 0.008);
  ctx.quadraticCurveTo(gx, beltY + s * 0.03, ww * 0.92, beltY + s * 0.008);
  ctx.stroke();
  ctx.strokeStyle = shade('#7a5c34', -22);
  ctx.lineWidth = Math.max(1, s * 0.012);
  ctx.beginPath();
  ctx.moveTo(-ww * 0.92, beltY + s * 0.016);
  ctx.quadraticCurveTo(gx, beltY + s * 0.038, ww * 0.92, beltY + s * 0.016);
  ctx.stroke();
  if (!back) {
    // The knot: a lump with two rope ends flopped loose.
    const kx = gx - fx * ww * 0.3;
    ctx.fillStyle = '#7a5c34';
    ctx.beginPath();
    ctx.arc(kx, beltY + s * 0.012, s * 0.024, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6b4f2c';
    ctx.lineWidth = Math.max(1, s * 0.014);
    for (const o of [-0.02, 0.016] as const) {
      ctx.beginPath();
      ctx.moveTo(kx, beltY + s * 0.02);
      ctx.lineTo(kx + o * s, beltY + s * 0.06);
      ctx.stroke();
    }
  }
  // The scrap pouch: on the hip, behind the belt line.
  const px = lead * ww * 0.66;
  ctx.fillStyle = '#6b4a2e';
  ctx.beginPath();
  chamferRect(ctx, px - s * 0.045, beltY - s * 0.006, s * 0.09, s * 0.075, s * 0.02);
  ctx.fill();
  ctx.strokeStyle = shade('#6b4a2e', -24);
  ctx.lineWidth = Math.max(1, s * 0.01);
  ctx.beginPath();
  ctx.moveTo(px - s * 0.04, beltY + s * 0.022);
  ctx.lineTo(px + s * 0.04, beltY + s * 0.022);
  ctx.stroke();
  // --- the casters' half-shawl: a ragged drape over the shoulders
  // with a torn sawtooth hem — dyed in the school's color, ending
  // well above the gut so the body still reads goblin under it.
  if (gb.garb) {
    const hemY = -th * 0.42;
    ctx.fillStyle = gb.garb;
    ctx.beginPath();
    ctx.moveTo(-tw * 1.06, -th * 0.98);
    ctx.lineTo(tw * 1.06, -th * 0.98);
    ctx.lineTo(tw * 0.94, hemY);
    for (let i = 4; i >= 0; i--) {
      const u = i / 4;
      const bx = -tw * 0.94 + u * 2 * tw * 0.94;
      const drop = th * 0.14 * (0.6 + 0.5 * Math.sin(i * 2.6 + 0.8));
      ctx.lineTo(bx + tw * 0.12, hemY);
      ctx.lineTo(bx, hemY + drop);
    }
    ctx.closePath();
    ctx.fill();
    // Form split + the collar roll at the throat.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-tw * 1.06, -th * 0.98);
    ctx.lineTo(tw * 1.06, -th * 0.98);
    ctx.lineTo(tw * 0.94, hemY + th * 0.14);
    ctx.lineTo(-tw * 0.94, hemY + th * 0.14);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = shade(gb.garb, -12);
    ctx.fillRect(0, -th, tw * 1.1, th);
    ctx.restore();
    ctx.strokeStyle = shade(gb.garb, -20);
    ctx.lineWidth = Math.max(1.5, s * 0.02);
    ctx.beginPath();
    ctx.ellipse(-fx * tw * 0.2, -th * 0.94, tw * 0.4, th * 0.09, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}
