/**
 * THE LIGHT IS CONTENT (lighting v4, law #1 — docs/lighting-v4-plan.md).
 *
 * Every standing emitter in the world is a data row here, not a branch
 * in the renderer: which tiles emit, at what reach, color, intensity,
 * height and rhythm is CONTENT, shared by the client (which draws it),
 * the server (which will read light levels from the same rows — the
 * darkness ledger, phase 5), and the editor (which will author them —
 * phase 6 of the plan).
 *
 * The renderer owns HOW light behaves — the exposure map, occlusion,
 * bloom compositing — and consumes these rows verbatim. Adding a lit
 * prop to the game is adding a row; the renderer never grows another
 * emitter branch.
 *
 * TRANSCRIPTION LAW (phase 1): every number and every curve in this
 * table is a 1:1 transcription of the renderer's original hardcoded
 * emitter chain, gated by an exact-value parity test on the client
 * (render/emitters.test.ts). Change a fixture's voice ON PURPOSE, with
 * the parity pin updated to match — never as a side effect.
 *
 * What deliberately does NOT live here (world-coupled emitters, still
 * coded in the renderer's collect pass): Riftgate portals (particle
 * side-effects + the portal plane), window hearth-spill (interior
 * region logic + the per-frame cap), Table candles and chest seams
 * (hash-phased queueGlow props), and the underground carried lantern
 * (phase 4 makes it an item). Their numbers migrate when their
 * structure does.
 *
 * THE TWO CHANNELS: an emitter speaks twice —
 *  - `glows`: the additive bloom the eye sees AT the fixture (the
 *    flame's own brilliance). Alpha rides the darkness boost by
 *    default (`gate: 'boost'`), or the man-made-flame clock
 *    (`gate: 'flame'`).
 *  - `lights`: the lightmap punch that illuminates the scene AROUND
 *    the fixture. Intensity always rides the curve; `flameGated`
 *    lights are man-made fire and stand down by day; `occlude` lights
 *    are architecture and cast real wall shadows.
 *
 * THE TOWN LAW, TIERED (owner decision §7.1, taken 2026-08-17 with
 * phase 2): the candle family carries a seated halo and ONE tiny
 * non-occluding pool — a kept flame now warms its own table-reach,
 * but it is still a mark, not a street light. LampPost remains the
 * only OCCLUDING town light: architecture, wall shadows, the night's
 * anchor. Widening the candle tier further is a new owner decision.
 */
import { daylightAt } from '../sim/daylight.js';
import { Tile } from './tiles.js';

/**
 * One sinusoidal voice in a fixture's rhythm:
 * `amp · sin(t·hz + tx·px + ty·py)` — t in seconds, (tx, ty) the
 * fixture's tile, so every instance of a fixture flickers on its own
 * phase while all read the same clock.
 */
export interface CurveTerm {
  hz: number;
  amp: number;
  px?: number;
  py?: number;
}

/**
 * A fixture's rhythm: `base + Σ terms`, optionally multiplied by a
 * second curve (`times`) — the bonfire's slow roar under its flicker.
 */
export interface LightCurve {
  base: number;
  terms: readonly CurveTerm[];
  times?: LightCurve;
}

/** Evaluate a curve at time `t` (seconds) for the fixture at (tx, ty).
 *  Term order and operation order are load-bearing: the parity gate
 *  compares against the original inline arithmetic bit-for-bit. */
export function lightCurveAt(c: LightCurve, t: number, tx: number, ty: number): number {
  let v = c.base;
  for (const term of c.terms) {
    v += term.amp * Math.sin(t * term.hz + tx * (term.px ?? 0) + ty * (term.py ?? 0));
  }
  return c.times ? v * lightCurveAt(c.times, t, tx, ty) : v;
}

/** The visible bloom at the fixture — see THE TWO CHANNELS above. */
export interface EmitterGlow {
  /** World offset from the tile origin. */
  dx: number;
  dy: number;
  /**
   * Height above the ground plane, in world tiles of AIR: divided by
   * the camera's yScale at collect time so the bloom rides the raised
   * fixture (the projAir law) — a sconce basket, a hung cage, a
   * lantern head.
   */
  air?: number;
  r: number;
  /** 'r, g, b' — the bloom pass's color format. */
  rgb: string;
  a: number;
  /** Curve scales the radius (a swelling halo, not just a brightening one). */
  rRide?: boolean;
  /** Alpha's final multiplier: the night boost (default) or the flame clock. */
  gate?: 'flame';
  /** Palette-alt color, when the spec deals one (see EmitterSpec.palette). */
  altRgb?: string;
}

/** The lightmap punch around the fixture — see THE TWO CHANNELS above. */
export interface EmitterLight {
  dx: number;
  dy: number;
  r: number;
  rgb: readonly [number, number, number];
  /** Peak, 0..1. ALWAYS rides the curve — a law, not a flag. */
  intensity: number;
  /** Architecture: casts real wall shadows in the lightmap. */
  occlude?: boolean;
  /** Man-made fire: intensity rides sky.flame, so it stands down by day. */
  flameGated?: boolean;
  /** Curve scales the reach too (living fire), not just the brightness. */
  rRide?: boolean;
  altRgb?: readonly [number, number, number];
  /**
   * Source height above the ground, world tiles (v4 phase 3 — THE
   * LIGHT STANDS WHERE THE FLAME BURNS). The lightmap's 3D term: the
   * pool under a hung light flattens (its center is `z` away; lateral
   * reach preserved via R3 = hypot(r, z)) and faces respond to the
   * source's true height. Must agree with the fixture's glow `air`.
   */
  z?: number;
}

export interface EmitterSpec {
  curve: LightCurve;
  glows: readonly EmitterGlow[];
  lights: readonly EmitterLight[];
  /** The whole fixture stands down by day (flame ≤ 0.05): lamps whose
   *  bloom AND punch are both flame-voiced. */
  flameGate?: boolean;
  /** Fixture may stand on lifted porch boards: the collect pass adds
   *  the deck lift to every glow's air height (THE PORCH LIGHT). */
  porch?: boolean;
  /** Hash-dealt two-color palette: `hashCoords(salt, tx, ty) & 1 === 0`
   *  swaps every entry to its altRgb — the SAME roll the tile's painter
   *  makes, so glow and paint always agree (the RunePillar law). */
  palette?: { salt: number };
}

// ---------------------------------------------------------------- the rhythms
// Named, shared where fixtures genuinely share a voice; bespoke where
// the original chain gave a fixture its own. Frequencies and phase
// salts are the original chain's, verbatim.

/** The standing open flame: camp- and dungeon-fire flicker. */
const FLICK_OPEN_FIRE: LightCurve = {
  base: 0.85,
  terms: [
    { hz: 11, amp: 0.1, px: 3.1 },
    { hz: 23, amp: 0.05, py: 1 },
  ],
};

/** The candle family's shared sub-1Hz breath. */
const CANDLE_BREATH: LightCurve = { base: 0.85, terms: [{ hz: 0.63, amp: 0.15, px: 1.3, py: 0.7 }] };

/** One kept flame: bloom at the form's own flame height, plus the
 *  candle tier's ONE tiny non-occluding pool (THE TOWN LAW, TIERED). */
function candleSpec(air: number, r: number): EmitterSpec {
  return {
    curve: CANDLE_BREATH,
    glows: [{ dx: 0.5, dy: 0.5, air, r, rRide: true, rgb: '255, 190, 100', a: 0.2 }],
    lights: [{ dx: 0.5, dy: 0.5, r: 1.5, rgb: [255, 196, 120], intensity: 0.16, flameGated: true }],
  };
}

/** Cooking coals — shared by the spit and the pot. */
const COALS: EmitterSpec = {
  curve: { base: 0.85, terms: [{ hz: 4.2, amp: 0.12, px: 1.7 }] },
  glows: [{ dx: 0.5, dy: 0.62, r: 0.8, rRide: true, rgb: '240, 120, 45', a: 0.2 }],
  lights: [{ dx: 0.5, dy: 0.6, r: 1.9, rgb: [255, 160, 90], intensity: 0.45, flameGated: true, occlude: true }],
};

// ---------------------------------------------------------------- the roster

const SPECS: ReadonlyArray<readonly [Tile, EmitterSpec]> = [
  // The open camp flame: a hot mid pool with a true fire flicker.
  [Tile.Campfire, {
    curve: FLICK_OPEN_FIRE,
    glows: [{ dx: 0.5, dy: 0.32, r: 1.6, rRide: true, rgb: '235, 140, 52', a: 0.3 }],
    lights: [{ dx: 0.5, dy: 0.5, r: 4.4, rRide: true, rgb: [255, 186, 110], intensity: 0.9, flameGated: true, occlude: true }],
  }],
  // The forge mouth: a low ember throb, reach kept short and steady.
  [Tile.Furnace, {
    curve: { base: 0.8, terms: [{ hz: 5, amp: 0.2, px: 1 }] },
    glows: [{ dx: 0.5, dy: 0.75, r: 1.15, rgb: '232, 108, 45', a: 0.24 }],
    lights: [{ dx: 0.5, dy: 0.8, r: 2.8, rgb: [255, 148, 82], intensity: 0.65, flameGated: true, occlude: true }],
  }],
  // The heart of a home: a wide, steady warm pool — less flicker than
  // a campfire, more reach than a furnace mouth.
  [Tile.Hearth, {
    curve: { base: 0.9, terms: [{ hz: 6, amp: 0.08, px: 1.9 }] },
    glows: [{ dx: 0.5, dy: 0.45, r: 1.4, rRide: true, rgb: '235, 150, 62', a: 0.26 }],
    lights: [{ dx: 0.5, dy: 0.7, r: 4.2, rgb: [255, 190, 120], intensity: 0.85, flameGated: true, occlude: true }],
  }],
  // Dungeon brazier: an open coal basket — campfire-class reach with
  // the same standing-flame flicker, flame-gated like every man-made
  // fire (underground the flame gate rides to 1, so braziers always
  // carry the dark band).
  [Tile.Brazier, {
    curve: FLICK_OPEN_FIRE,
    glows: [{ dx: 0.5, dy: 0.3, r: 1.5, rRide: true, rgb: '255, 158, 66', a: 0.3 }],
    lights: [{ dx: 0.5, dy: 0.5, r: 4.4, rRide: true, rgb: [255, 180, 104], intensity: 0.9, flameGated: true, occlude: true }],
  }],
  // THE LONG DARK FURNISHED: the caged wall flame — torch-class heat
  // mounted a body's height up the stone, so the pool it throws
  // reaches further down the corridor than a floor fire of the same
  // size. The bloom rides the basket (air, the projAir law); the punch
  // lights the walkway below it.
  [Tile.WallSconce, {
    curve: { base: 0.8, terms: [{ hz: 13, amp: 0.13, px: 2.9 }, { hz: 29, amp: 0.07, py: 1.1 }] },
    glows: [{ dx: 0.5, dy: 0, air: 1.1, r: 1.15, rRide: true, rgb: '255, 156, 62', a: 0.28 }],
    lights: [{ dx: 0.5, dy: 0.35, r: 3.4, rRide: true, rgb: [255, 176, 96], intensity: 0.8, flameGated: true, occlude: true, z: 1.1 }],
  }],
  // THE LONG DARK PEOPLED: grave-candles — the smallest kept flame in
  // the game. A knee-high amber pool with a soft double-wick waver,
  // warmer and gentler than any torch: enough to find the shrine
  // across a dark chamber, never enough to light the way past it.
  [Tile.CandleShrine, {
    curve: { base: 0.86, terms: [{ hz: 9, amp: 0.08, px: 2.3 }, { hz: 17, amp: 0.06, py: 1.7 }] },
    glows: [{ dx: 0.5, dy: 0.18, r: 0.85, rRide: true, rgb: '255, 190, 100', a: 0.24 }],
    lights: [{ dx: 0.5, dy: 0.5, r: 2.4, rRide: true, rgb: [255, 200, 130], intensity: 0.55, flameGated: true, occlude: true }],
  }],
  // THE KEPT FLAME, TIERED (§7.1): one breathing bloom per LIT candle
  // prop plus a table-reach pool that never occludes — the LampPost
  // still owns the town night as its only occluding light. The bloom
  // sits at each form's flame height, and the snuffed tile ids simply
  // have no row.
  [Tile.CandleCluster, candleSpec(0.4, 0.72)],
  [Tile.MeltedCandles, candleSpec(0.4, 0.55)],
  [Tile.CandleTable, candleSpec(0.68, 0.55)],
  [Tile.CandleStand, candleSpec(1.0, 0.66)],
  [Tile.PillarCandle, candleSpec(0.55, 0.6)],
  [Tile.TripleCandles, candleSpec(0.4, 0.72)],
  // A camp torch: a small hot pool with a hard flicker — the rag head
  // burns rough, never lamplight-steady.
  [Tile.StandingTorch, {
    curve: { base: 0.78, terms: [{ hz: 13, amp: 0.14, px: 2.7 }, { hz: 29, amp: 0.08, py: 1.3 }] },
    glows: [{ dx: 0.5, dy: 0.1, r: 1.1, rRide: true, rgb: '255, 150, 58', a: 0.28 }],
    lights: [{ dx: 0.5, dy: 0.5, r: 3.0, rRide: true, rgb: [255, 176, 96], intensity: 0.75, flameGated: true, occlude: true }],
  }],
  // THE GREAT FIRE: the camp's heart and its biggest light — wider
  // than a hearth, hotter than a campfire, with a slow breathing roar
  // under the flicker. The bloom rides high on the flame column.
  [Tile.Bonfire, {
    curve: {
      base: 0.85,
      terms: [{ hz: 9, amp: 0.1, px: 3.1 }, { hz: 21, amp: 0.05, py: 1 }],
      times: { base: 0.9, terms: [{ hz: 1.1, amp: 0.08, px: 1 }] },
    },
    glows: [{ dx: 0.5, dy: 0.1, r: 2.3, rRide: true, rgb: '240, 132, 48', a: 0.34 }],
    lights: [{ dx: 0.5, dy: 0.5, r: 6.2, rRide: true, rgb: [255, 182, 104], intensity: 1.0, flameGated: true, occlude: true }],
  }],
  // The war brazier: campfire-class reach, but the cage bars chop the
  // light — a harder, meaner flicker than the dungeon basket.
  [Tile.WarBrazier, {
    curve: { base: 0.8, terms: [{ hz: 12, amp: 0.13, px: 3.3 }, { hz: 27, amp: 0.06, py: 1 }] },
    glows: [{ dx: 0.5, dy: 0.18, r: 1.4, rRide: true, rgb: '255, 150, 60', a: 0.3 }],
    lights: [{ dx: 0.5, dy: 0.5, r: 4.0, rRide: true, rgb: [255, 172, 98], intensity: 0.85, flameGated: true, occlude: true }],
  }],
  // Cooking coals: a low banked bed, more ember than flame — enough
  // to find the kitchen corner of a camp after dark.
  [Tile.MeatSpit, COALS],
  [Tile.CookPot, COALS],
  // Glowshrooms: bioluminescence, not fire — a smaller, cool teal pool
  // that BREATHES on a slow swell (never the flame flicker), ungated
  // by the flame clock, and non-occluding (a soft haze through the
  // cave, not a lamp).
  [Tile.GlowShroom, {
    curve: { base: 0.8, terms: [{ hz: 1.4, amp: 0.2, px: 0.9, py: 1.7 }] },
    glows: [{ dx: 0.5, dy: 0.4, r: 0.95, rRide: true, rgb: '110, 225, 200', a: 0.12 }],
    lights: [{ dx: 0.5, dy: 0.5, r: 2.4, rgb: [110, 225, 200], intensity: 0.4 }],
  }],
  // THE BANKS GET THEIR GOODS: the caged deep-jelly — the shoal's
  // street light. Bioluminescence law: a slow swell, never flicker,
  // no flame gate. The bloom rides the hanging cage; the punch pools
  // on the path under the bow.
  [Tile.LurePole, {
    curve: { base: 0.82, terms: [{ hz: 1.2, amp: 0.18, px: 1.1, py: 0.8 }] },
    glows: [{ dx: 0.5, dy: 0, air: 1.0, r: 1.0, rRide: true, rgb: '127, 216, 200', a: 0.16 }],
    lights: [{ dx: 0.5, dy: 0.45, r: 3.6, rRide: true, rgb: [127, 216, 200], intensity: 0.55, occlude: true, z: 1.0 }],
  }],
  // The tidecaller's slab: a cold shore-water shimmer, more moonlight
  // than lamp — enough to find the shrine across the camp, never
  // enough to fish by.
  [Tile.TideAltar, {
    curve: { base: 0.75, terms: [{ hz: 0.9, amp: 0.25, px: 0.7, py: 1.3 }] },
    glows: [{ dx: 0.5, dy: 0.3, r: 0.7, rRide: true, rgb: '170, 216, 226', a: 0.1 }],
    lights: [{ dx: 0.5, dy: 0.5, r: 2.2, rgb: [170, 216, 226], intensity: 0.3 }],
  }],
  // THE IMBUED LANE: worked violet magic — a slow arcane swell, never
  // a flicker, ungated by the flame clock.
  [Tile.ArcaneBeacon, {
    curve: { base: 0.8, terms: [{ hz: 1.1, amp: 0.2, px: 1.3, py: 0.7 }] },
    glows: [{ dx: 0.5, dy: -0.45, r: 1.1, rRide: true, rgb: '180, 143, 232', a: 0.22 }],
    lights: [{ dx: 0.5, dy: 0.5, r: 5.0, rRide: true, rgb: [180, 148, 228], intensity: 0.7, occlude: true }],
  }],
  // The split stone's seam and glyph column, a quiet violet.
  [Tile.Runestone, {
    curve: { base: 0.75, terms: [{ hz: 1.0, amp: 0.25, px: 0.9, py: 1.2 }] },
    glows: [{ dx: 0.5, dy: 0.1, r: 0.7, rRide: true, rgb: '180, 143, 232', a: 0.12 }],
    lights: [{ dx: 0.5, dy: 0.5, r: 3.5, rgb: [180, 148, 228], intensity: 0.42 }],
  }],
  // Wild mana: green, low, and alive — glowshroom-class haze.
  [Tile.CrystalCluster, {
    curve: { base: 0.75, terms: [{ hz: 1.2, amp: 0.25, px: 1.1, py: 0.8 }] },
    glows: [{ dx: 0.5, dy: 0.35, r: 1.0, rRide: true, rgb: '127, 232, 168', a: 0.15 }],
    lights: [{ dx: 0.5, dy: 0.5, r: 4.0, rgb: [130, 226, 170], intensity: 0.5 }],
  }],
  // The keystone and its veil: violet at head height.
  [Tile.WardArch, {
    curve: { base: 0.75, terms: [{ hz: 1.0, amp: 0.25, px: 0.7, py: 1.0 }] },
    glows: [{ dx: 0.5, dy: -0.3, r: 0.8, rRide: true, rgb: '180, 143, 232', a: 0.13 }],
    lights: [{ dx: 0.5, dy: 0.5, r: 3.5, rgb: [180, 148, 228], intensity: 0.45 }],
  }],
  // The floating book reads by its own light.
  [Tile.ArcaneTome, {
    curve: { base: 0.78, terms: [{ hz: 1.1, amp: 0.22, px: 1.4, py: 0.6 }] },
    glows: [{ dx: 0.5, dy: -0.35, r: 0.6, rRide: true, rgb: '216, 196, 250', a: 0.12 }],
    lights: [{ dx: 0.5, dy: 0.5, r: 3.0, rgb: [196, 176, 240], intensity: 0.4 }],
  }],
  // The elven street light — lead color dealt by the SAME hash the
  // painter uses, so glow and tip-stone agree: alt (green) when
  // hashCoords(41, tx, ty) & 1 === 0, violet otherwise.
  [Tile.RunePillar, {
    curve: { base: 0.8, terms: [{ hz: 1.05, amp: 0.2, px: 1.0, py: 0.9 }] },
    palette: { salt: 41 },
    glows: [{ dx: 0.5, dy: -0.9, r: 0.9, rRide: true, rgb: '180, 143, 232', altRgb: '127, 232, 168', a: 0.18 }],
    lights: [{ dx: 0.5, dy: 0.5, r: 4.5, rRide: true, rgb: [180, 148, 228], altRgb: [130, 226, 170], intensity: 0.6, occlude: true }],
  }],
  // The Everflame: the elven hall's night anchor — bonfire reach in
  // silver-white. It never went out, so it never flickers: the beat
  // is a heart, not a spit.
  [Tile.Everflame, {
    curve: { base: 0.88, terms: [{ hz: 1.6, amp: 0.12, px: 0.8 }] },
    glows: [{ dx: 0.5, dy: 0.06, r: 1.7, rRide: true, rgb: '223, 242, 255', a: 0.26 }],
    lights: [{ dx: 0.5, dy: 0.5, r: 6.0, rRide: true, rgb: [206, 230, 252], intensity: 0.95, occlude: true }],
  }],
  // The moonwell: lit water, a soft pool that swells with the surface
  // shimmer — non-occluding like the glowshroom (a glow off water,
  // not a lamp on a post).
  [Tile.Moonwell, {
    curve: { base: 0.8, terms: [{ hz: 0.9, amp: 0.2, px: 0.6, py: 1.1 }] },
    glows: [{ dx: 0.5, dy: 0.42, r: 1.2, rRide: true, rgb: '159, 232, 216', a: 0.16 }],
    lights: [{ dx: 0.5, dy: 0.5, r: 3.6, rgb: [150, 226, 210], intensity: 0.5 }],
  }],
  // The waystone's script band: the faintest voice in the kit — just
  // enough to find the road by.
  [Tile.ElvenWaystone, {
    curve: { base: 0.7, terms: [{ hz: 0.8, amp: 0.3, px: 1.1, py: 0.9 }] },
    glows: [{ dx: 0.5, dy: 0.12, r: 0.65, rRide: true, rgb: '159, 232, 216', a: 0.1 }],
    lights: [{ dx: 0.5, dy: 0.5, r: 2.2, rgb: [150, 226, 210], intensity: 0.3 }],
  }],
  // The town lamp: THE ONE LICENSED TOWN NIGHT-LIGHT (THE TOWN LAW).
  // Whole fixture stands down by day; the bloom rides the lantern
  // cage a full post-height up — and THE PORCH LIGHT law: on lifted
  // porch boards the deck lift joins the cage height, so the glow
  // sits on its lantern, never a fifth of a tile low. The bloom's
  // alpha rides the flame clock, not the night boost — a lamp is lit,
  // not merely dark-adapted.
  [Tile.LampPost, {
    curve: { base: 0.92, terms: [{ hz: 9, amp: 0.05, px: 2.3, py: 1 }, { hz: 17, amp: 0.03, py: 1.7 }] },
    flameGate: true,
    porch: true,
    glows: [{ dx: 0.5, dy: 0.62, air: 1.4, r: 1.3, rRide: true, rgb: '255, 205, 130', a: 0.28, gate: 'flame' }],
    lights: [{ dx: 0.5, dy: 0.5, r: 5, rRide: true, rgb: [255, 205, 135], intensity: 0.9, flameGated: true, occlude: true, z: 1.4 }],
  }],
  // THE SCARRED LAND (docs/contested-lands-plan.md §6.1). Five rows,
  // and NO rows on purpose for PitLampDark, LampPostDark, and
  // WardThread — the dark postures are the tell, and the thread is a
  // mark with zero light entries.
  // THE SCARRED LAND (K1): the ember bed — COALS-class, the night
  // tell of a fresh burning. A bed banked under ash is not a fire
  // being worked: the curve sits under the cooking coals (base 0.6
  // against the pit lamp's 0.85 — the first cut's 0.35 × 0.45 came
  // to a 0.16 pool that no screenshot could find at midnight; a tell
  // that cannot be seen is not a tell) and breathes on a slow sub-Hz
  // swell with a faint 5 Hz shiver where a coal splits. Both channels ride the flame
  // clock (bloom `gate: 'flame'`, punch `flameGated`) so the bed reads
  // at dusk and stands down by day — by day the painter's cold coals
  // are all there is. NON-occluding on purpose: a knee-high ring of
  // stones is not architecture (THE FLAME LAW's occlude rule is about
  // walls biting their own light — the bed has no wall), and a burnt
  // steading may seat several; the lightmap's shadow-cast pass is
  // not owed to a ground pool. The licence is argued in lights.test.
  [Tile.EmberBed, {
    curve: { base: 0.6, terms: [{ hz: 0.7, amp: 0.12, px: 1.9, py: 0.7 }, { hz: 5, amp: 0.04, px: 0.6 }] },
    // Bloom 0.40 (K1 polish; was 0.32 — the coal core read as a
    // faint smudge at zoom 1.3): the pool row (r/intensity) and the
    // curve are untouched, so the licence in lights.test still holds.
    glows: [{ dx: 0.5, dy: 0.55, r: 0.9, rRide: true, rgb: '255, 122, 42', a: 0.4, gate: 'flame' }],
    lights: [{ dx: 0.5, dy: 0.55, r: 2.6, rgb: [255, 122, 42], intensity: 0.45, flameGated: true }],
  }],
  // The gloom stone: GlowShroom-class — a cold swell, never a
  // flicker, no flame gate, non-occluding (it was here first and it
  // does not keep a clock). The Riftgate apron's palette above
  // ground: SCAR_GLOOM itself (127, 140, 196), dimmer than the shroom.
  // K4 THE GLOOM (2026-09-04): slowed to 0.8Hz (the shroom breathes
  // at 1.4; the stone is older and slower), the bloom seated at
  // dy 0.3 — the stone's mid-height in ground terms (gloom.ts stands
  // the block 0.6s over a foot line 0.18 south of centre; the lichen
  // plates on its cap and east flank are painted COLD and this row
  // is what lifts them at night) — and the punch pulled in to 2.4 so
  // the halo stays a stone's, not a lamp's.
  [Tile.GloomStone, {
    curve: { base: 0.82, terms: [{ hz: 0.8, amp: 0.18, px: 0.7, py: 1.3 }] },
    glows: [{ dx: 0.5, dy: 0.3, r: 0.85, rRide: true, rgb: '127, 140, 196', a: 0.14 }],
    lights: [{ dx: 0.5, dy: 0.5, r: 2.4, rgb: [127, 140, 196], intensity: 0.36 }],
  }],
  // The foul pool: sick water's own cool swell — slower and dimmer
  // than the stone, a gloom-teal haze low on the ground. No gate,
  // never occludes. K4 THE GLOOM (2026-09-04): 0.6Hz (the slowest
  // swell in the book — standing water); gloom.ts lays the pan 0.2
  // south of the tile centre with its pale wash 0.06 north of the
  // pan, so bloom and punch both sit at dy 0.62 — ON the water, in
  // the wash's own teal; the punch a wading-depth 1.9.
  [Tile.FoulPool, {
    curve: { base: 0.8, terms: [{ hz: 0.6, amp: 0.2, px: 1.3, py: 0.6 }] },
    glows: [{ dx: 0.5, dy: 0.62, r: 0.75, rRide: true, rgb: '104, 150, 140', a: 0.09 }],
    lights: [{ dx: 0.5, dy: 0.62, r: 1.9, rgb: [104, 150, 140], intensity: 0.26 }],
  }],
  // The lamp cairn: LampPost-tier warmth in a waykeeper's stone.
  // Flame-gated like every man-made lamp (THE JUDGING LAW: cold by
  // day — the K2 proof caught a noon halo), and so occluding by THE
  // FLAME LAW (a flame-gated light is architecture; the cairn is a
  // 0.95-tile stone pile, and the lamp it crowns is a LampPost's
  // lamp). The lantern seats in the
  // cairn's crown 0.62 tiles up (marks.ts LampCairn: crownY − ledge
  // − lanH/2), so bloom and punch ride that height, not the foot.
  // Its steadiness is the point: barely a breath.
  [Tile.LampCairn, {
    curve: { base: 0.92, terms: [{ hz: 0.7, amp: 0.06, px: 1.1, py: 0.4 }] },
    flameGate: true,
    glows: [{ dx: 0.5, dy: 0.4, air: 0.6, r: 1.1, rRide: true, rgb: '255, 205, 130', a: 0.24, gate: 'flame' }],
    lights: [{ dx: 0.5, dy: 0.5, r: 4.5, rRide: true, rgb: [255, 205, 135], intensity: 0.8, flameGated: true, occlude: true, z: 0.6 }],
  }],
  // The pit lamp: COALS-class warm — the Returners' word against the
  // LampPost. Flame-gated (cold by day — the judging law), the cooking
  // coals' quick working flicker, occluding like the lamp it answers.
  // The lantern hangs from the arm 0.98 tiles up (marks.ts PitLamp:
  // lanTop + lanH/2), dealt ±0.32 tiles to either side of the stake,
  // so the bloom rides that height as TWO flame-gated lobes, one over
  // each arm's seat (dx 0.18 / 0.82, r 0.6): the lantern's own lobe
  // reads as the bloom and the empty arm's sits dim on the iron,
  // instead of one wide halo centred on the stake where nothing
  // burns. Its dark posture (PitLampDark) has no row at all.
  [Tile.PitLamp, {
    curve: { base: 0.85, terms: [{ hz: 4.2, amp: 0.12, px: 1.7 }] },
    flameGate: true,
    glows: [
      { dx: 0.18, dy: 0.5, air: 1.0, r: 0.6, rRide: true, rgb: '240, 120, 45', a: 0.2, gate: 'flame' },
      { dx: 0.82, dy: 0.5, air: 1.0, r: 0.6, rRide: true, rgb: '240, 120, 45', a: 0.2, gate: 'flame' },
    ],
    lights: [{ dx: 0.5, dy: 0.6, r: 2.6, rgb: [255, 160, 90], intensity: 0.45, flameGated: true, occlude: true, z: 1.0 }],
  }],
];

/** Dense lookup: tile id → spec. Tile ids are small u16s. */
const BY_TILE: Array<EmitterSpec | undefined> = [];
for (const [tile, spec] of SPECS) BY_TILE[tile] = spec;

/** All emitter rows, for census tests, the darkness ledger, and the
 *  editor's roster view. */
export const EMITTER_LIGHTS: ReadonlyArray<readonly [Tile, EmitterSpec]> = SPECS;

/** The standing-light spec for a tile id, if it emits. O(1) — tiles
 *  are u16 ids on the wire, so callers may hold plain numbers. */
export function tileEmitter(tile: number): EmitterSpec | undefined {
  return BY_TILE[tile];
}

// ------------------------------------------------------- the darkness ledger

/** The ledger's emitter scan reach, tiles — ≥ the longest fixture
 *  pool (the bonfire's 6.2). */
export const LIGHT_SCAN_R = 7;

/**
 * Below this light level the world counts as DARK — the trigger
 * fact's line, the spawn gates' line. ONE shared number: gameplay
 * never argues with itself about what dark means.
 */
export const DARK_LEVEL = 0.25;

/**
 * THE MOON IS PAINT, NOT LIGHT: the deep-night ambient (~0.45
 * luminance) is the NIGHT-IS-PLAYABLE readability courtesy — if the
 * ledger read it as light, nowhere on the surface could ever be dark
 * and the whole gameplay layer would be stillborn. The sky term
 * rescales ABOVE this floor: midnight open field = 0, real sun = 1,
 * dusk in between. Fixtures alone own the night.
 */
export const LEDGER_NIGHT_FLOOR = 0.45;

/**
 * THE DARKNESS LEDGER (lighting v4 phase 5, law #6): how lit a tile
 * is, 0..1 — a PURE function of the clock, the plane law, and the
 * emitter registry, so the server and any client always agree.
 *
 * COARSE BY DESIGN: tile resolution, linear pool falloff, and every
 * fixture read at FULL VOICE — the render flicker must never flip a
 * gameplay predicate. The sky term is the ambient's luminance (zero
 * below ground); man-made fire stands down by day exactly as the
 * renderer's flame clock does, and always burns underground. The
 * renderer never reads this — render light stays continuous and
 * local; gameplay reads only this.
 */
export function lightLevelAt(
  hours: number,
  underground: boolean,
  tx: number,
  ty: number,
  tileAt: (x: number, y: number) => number | undefined,
): number {
  const sky = daylightAt(hours);
  let level = underground
    ? 0
    : Math.max(0, (1 - sky.darkness - LEDGER_NIGHT_FLOOR) / (1 - LEDGER_NIGHT_FLOOR));
  if (level >= 1) return 1;
  const flame = underground ? 1 : sky.flame;
  const cx = tx + 0.5;
  const cy = ty + 0.5;
  for (let dy = -LIGHT_SCAN_R; dy <= LIGHT_SCAN_R; dy++) {
    for (let dx = -LIGHT_SCAN_R; dx <= LIGHT_SCAN_R; dx++) {
      const t = tileAt(tx + dx, ty + dy);
      if (t === undefined) continue;
      const spec = BY_TILE[t];
      if (spec === undefined) continue;
      for (const l of spec.lights) {
        const eff = l.flameGated ? l.intensity * flame : l.intensity;
        if (eff <= 0.02) continue;
        const d = Math.hypot(tx + dx + l.dx - cx, ty + dy + l.dy - cy);
        if (d >= l.r) continue;
        const c = eff * (1 - d / l.r);
        if (c > level) level = c;
      }
    }
  }
  return Math.min(1, level);
}
