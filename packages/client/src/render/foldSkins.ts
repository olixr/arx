/**
 * THE SUBSTRATE FOLDS — the meadow's spectrum keys (docs/contested-
 * lands-plan.md §12.3 step 1, §12.4 the spectrum). Every key here is a
 * hand-picked flat #rrggbb key; nothing is computed at draw time, so the
 * painter's op stream stays a pure function of (tile, world coords,
 * salts, the quantised field) and both backends blit the same canvas.
 *
 * THE LOOKS. The field has four axes (season signed, blight, burn,
 * wear); the painter reads them as five LOOKS after precedence — burn
 * over blight over season (ash covers sickness covers the calendar),
 * and season splits on its sign: + is THE TURN (autumn, and past it
 * the cold), − is THE FLUSH (spring, what a cleared core's recovery
 * plays). Wear is reserved (v2) and folds nothing yet.
 *
 * THE BANDS. band() quantises each axis on integer thresholds (u8
 * 51 / 128 / 218 → touched / taken / held), so "which band" is exact
 * on every machine. Each look carries THREE four-tone tables, one per
 * band, in GRASS_TONES's own role order — [base, a step darker, a
 * step lighter, the darkest] — so meadowTone's noise keeps picking
 * WHICH of the four and the fold only decides THE FOUR. The touched
 * band is the hem: it folds the substrate dither and deals marks but
 * paints no wash, so the meadow's own grain carries the soft edge.
 *
 * THE TURN's held band IS the winter. The wire's season axis reaches
 * +1 for winter and +0.5 for autumn (§12.2), and the field bands on
 * magnitude, so the plan's separate winter ladder (frost-sage → pale
 * → the cold) lives inside the held band's four tones: the noise
 * deals frost-sage, pale, the cold and a dark sage across the field.
 * A per-band winter ladder needs a second octave on the axis, which
 * is a data-model decision, not a palette one (open issue, LG-1).
 *
 * VALUE LAW — THE LADDER (the art director's recut, LG fix pass).
 * The first cut kept every band iso-luminant with the meadow (Δ ≤ 5
 * across three bands) and the disc read as one flat tinted circle:
 * hue alone does not carry a band at zoom 1.3. Each sickening look
 * now steps DOWN in value by band — blight touched ≈ −5, taken ≈ −9,
 * held ≈ −19 from the meadow's mean (113.6); burn −2 / −6 / −14 — on
 * top of the hue shift, and each band's WASH_ALT lobe key sits a
 * further ≥ 10 below its band's base (a dedicated row, never the
 * dither role, which is only Δ4). The turn holds its value (straw is
 * straw) and the cold lifts (snow is where it is going). Nothing
 * sinks past −36 of the meadow: a folded reach is still a country,
 * never a dark hole the props' floor law would fight. Blight is
 * never black (min channel ≥ 0x50 on the substrate, ≥ 0x48 on the
 * lobes). terrain.fold.test.ts pins the numbers.
 */

/** The painter's looks after precedence. Index into every table below. */
export const FOLD_NONE = 0;
export const FOLD_AUTUMN = 1;
export const FOLD_SPRING = 2;
export const FOLD_BLIGHT = 3;
export const FOLD_BURN = 4;
export const FOLD_LOOK_COUNT = 5;

/** Names for the lab and the confession — never for a painted value. */
export const FOLD_LOOK_NAMES: readonly string[] = ['summer', 'autumn', 'spring', 'blight', 'burn'];

/** One four-tone substrate table: [base, darker, lighter, darkest]. */
export type FoldTones = readonly [string, string, string, string];

/**
 * SUBSTRATE_FOLD[look][band − 1] — the four-tone table the meadow
 * dithers with inside a band. Index 0 (summer) is not here: the
 * painter keeps GRASS_TONES for it, and the halo-null path never
 * reads this module at all.
 */
export const SUBSTRATE_FOLD: readonly (readonly [FoldTones, FoldTones, FoldTones])[] = [
  // FOLD_NONE — a placeholder row so the look indexes the table
  // directly; the painter never reaches it (summer is GRASS_TONES).
  [
    ['#5c8941', '#588440', '#608e45', '#55813e'],
    ['#5c8941', '#588440', '#608e45', '#55813e'],
    ['#5c8941', '#588440', '#608e45', '#55813e'],
  ],
  // THE TURN (+season): olive → straw / ochre → the cold (lifts).
  [
    // touched: the green goes olive — the first week of the turn.
    ['#68813b', '#647c39', '#6c873e', '#617937'],
    // taken: straw, with ochre dealt as the darkest of the four.
    ['#867b40', '#81763e', '#8c8043', '#7e733c'],
    // held: the winter — frost-sage, pale, the cold, dark sage.
    ['#798b7a', '#758676', '#7e907e', '#728373'],
  ],
  // THE FLUSH (−season): a half-step lighter and greener, then greener.
  [
    ['#5c8946', '#588343', '#5f8f49', '#568041'],
    ['#5d8d47', '#598844', '#61934a', '#578442'],
    ['#5f9149', '#5b8b47', '#63974c', '#598845'],
  ],
  // BLIGHT: grey-green (−5) → bruise-grey (−9) → grey-violet (−19),
  // never black.
  [
    ['#637558', '#5f7154', '#687b5c', '#5d6d52'],
    ['#676778', '#626273', '#6c6c7e', '#5f5f70'],
    ['#645870', '#5f546b', '#6a5d76', '#5c5167'],
  ],
  // BURN: scorched straw (−2) → dust (−6) → ash-grey (−14; neutral:
  // beside the warm dust a cool grey read as a pool, not as ash).
  [
    ['#816f45', '#7c6b42', '#877448', '#796840'],
    ['#736a5f', '#6f665b', '#796f63', '#6b6358'],
    ['#656461', '#605f5d', '#6a6966', '#5d5c5a'],
  ],
];

/**
 * THE WASH (recut). The wash paints NO flat fill on the meadow any
 * more — the folded substrate already carries each band's four-tone
 * grain, and a flat fill over it was the "one tinted circle" — so
 * `washKey` is the band's base key for the record (the lab's swatch,
 * the materials' plaque) and the wash's own paint is the LOBES:
 * WASH_ALT[look] = [taken lobes, held lobes], each a dedicated key
 * ≥ 10 in value below its band's base (never the dither role, which
 * is only a step). The taken lobes deal across the whole taken band
 * (the held core included, where they sit at the held base's own
 * value and read as its outriders) and the held lobes deal inside the
 * held isoline over them: THE WASHES CARRY THE SHAPE, and the heart
 * of a country reads as a deepening mottle, never a ring.
 */
export function washKey(look: number, band: number): string {
  return SUBSTRATE_FOLD[look]![band - 1]![0];
}
/** The lobe key of a band (2 taken, 3 held) — see WASH_ALT. */
export function washAltKey(look: number, band: number): string {
  return WASH_ALT[look]![band - 2]!;
}
/**
 * WASH_ALT[look] = [taken lobe key, held lobe key]. Ochre lobes in the
 * straw and a dark frost-sage lobe in the cold; a deeper green in the
 * flush; the bruise deepening toward violet under blight; soot in the
 * dust and a darker ash at the burnt heart.
 */
export const WASH_ALT: readonly (readonly [string, string])[] = [
  ['#5c8941', '#5c8941'],
  ['#806c32', '#6b7e77'],
  ['#50833f', '#4f873e'],
  ['#5e5c6f', '#5b4d69'],
  ['#6a5f53', '#5a5857'],
];

/**
 * THE FRINGE's second blade tone per look and band — the lifted
 * accent drawGrassFringe and the path weeds deal beside the substrate
 * tone (summer's is #79a556). A step above the band's lighter tone,
 * so a tuft still reads as a blade against its own ground.
 */
export const FRINGE_ALT: readonly (readonly [string, string, string])[] = [
  ['#79a556', '#79a556', '#79a556'],
  ['#8fa653', '#b0a25c', '#a9b8a9'],
  ['#84b05e', '#89b663', '#8ebd68'],
  ['#86986f', '#8c8c9c', '#8e8199'],
  ['#9c8b5a', '#978d80', '#8e9092'],
];

/**
 * THE STUBBLE inks per look: two grades, both LIGHTER than the ground
 * (the turf floor law — dark flecks read as holes). Dealt hash-vs-
 * weight against summer's pair, so the change of stubble is a dither
 * across the hem, never a step.
 */
export const STUBBLE_INK: readonly (readonly [string, string])[] = [
  ['rgba(148, 178, 96, 0.18)', 'rgba(215, 227, 140, 0.15)'],
  ['rgba(196, 178, 110, 0.2)', 'rgba(228, 212, 150, 0.16)'],
  ['rgba(158, 196, 104, 0.18)', 'rgba(222, 236, 150, 0.15)'],
  ['rgba(158, 168, 150, 0.18)', 'rgba(198, 202, 194, 0.14)'],
  ['rgba(150, 140, 122, 0.18)', 'rgba(196, 190, 176, 0.13)'],
];
/** The winter stubble: frost-kissed, the snow rim's own pair. */
export const STUBBLE_INK_COLD: readonly [string, string] = [
  'rgba(178, 198, 168, 0.22)',
  'rgba(228, 238, 224, 0.2)',
];

/** THE MARKS' inks — flat fills only, dealt off the field. */
export const MARK_INK = {
  /** Leaf litter under the turn: four leaf keys, russet to gold. */
  leaf: ['#a8703a', '#b8893c', '#8f5b2f', '#c9a24a'] as readonly string[],
  /** A leaf's seat shade. */
  leafSeat: 'rgba(52, 40, 24, 0.22)',
  /** Frost pools under the cold: the snow hollow's own blue, and rime. */
  frostPool: 'rgba(158, 174, 208, 0.16)',
  frostRime: 'rgba(232, 240, 246, 0.24)',
  /** Soot smuts under burn: a soft dark settle and a charcoal chip pair. */
  smut: 'rgba(38, 30, 30, 0.13)',
  charcoal: ['#2b2325', '#3a302c'] as readonly string[],
  charcoalCap: 'rgba(120, 108, 100, 0.35)',
  /** Grey rings under blight: a pale dead rim around a bruised centre. */
  ringRim: 'rgba(168, 168, 178, 0.2)',
  ringCore: 'rgba(66, 58, 78, 0.16)',
} as const;

/**
 * The contour lanes the wash rolls its hashes on (terrain.ts's
 * ContourLane law): every BlobLayer seed lives below 64 and its alt
 * sub-lanes at seed + 64 / + 96 (below 160), so the wash lanes start
 * at 192 — `FOLD_LANE_BASE + look·4 + band` — and their own alt
 * sub-lanes (+64) land at 256+. No wash lane can ever collide with a
 * shipped layer's hash lane; terrain.fold.test.ts pins the arithmetic.
 */
export const FOLD_LANE_BASE = 192;
export function foldLaneSeed(look: number, band: number): number {
  return FOLD_LANE_BASE + look * 4 + band;
}

/** The noise salts of the wash's alt sub-patches, one per look (the
 *  BlobLayer alt.salt law: a distinct field per material). */
export const FOLD_ALT_SALT: readonly number[] = [0, 2903, 2909, 2917, 2927];
/** The noise salts of the THINNED held band's patches, one per look. */
export const FOLD_HELD_SALT: readonly number[] = [0, 2939, 2953, 2957, 2963];

// ------------------------------------------------ THE MATERIALS FOLD (LG-2)
/**
 * THE MATERIALS FOLD (plan §12.3 step 3, §12.4 the ground-layer
 * column). Every BlobLayer that lives in weather carries a MaterialFold:
 * hand-picked flat keys per LOOK, read through three doors terrain.ts
 * already had —
 *
 *   THE HEM     the TOUCHED contour (the weighted crossing at the
 *               touched threshold, traced once per look and kept on
 *               the view) filled with the look's hem key inside the
 *               material's region, before the material's own alt
 *               patches; the alt sub-patch reads the pair's second
 *               key per dual cell wherever its cell is touched. The
 *               first cut read the fill per dual cell off the dithered
 *               band — invisible while the pair was Δ4, a one-tile
 *               checker once it could be seen — so the hem is now a
 *               contour like every band: a step of ≥ 8 in value.
 *   THE WASH    the SAME isoband paths the meadow traces (the taken
 *               region, its lobes, the held lobes the view keeps), re-
 *               keyed with the material's own [taken fill, taken lobe,
 *               held lobe] keys and clipped inside the material's
 *               region. The contour therefore continues across a road
 *               edge as ONE line — the phantom-boundary law spoken in
 *               weights — and a road through a blighted wood wears
 *               the road's own greyed keys IN LOBES, never one tint. A
 *               null taken key (sand, stone under the turn; the
 *               shallows) paints no full fill: only the lobes deal,
 *               which is what rime on flags and scum on water ARE —
 *               films in patches.
 *   THE RUNS    the worn band, the sun lip, the snow's laden shade and
 *               its crest take the look's ink at the run's MIDPOINT
 *               read (band ≥ taken), so a stroke never changes colour
 *               mid-run; a look that names no ink holds the layer's
 *               own. The bank face reads the same word (BANK_FACE_FOLD).
 *               The fold re-inks strokes and never adds one: a folded
 *               layer emits exactly the runs it always did.
 *
 * VALUE LAW, spoken per material — THE LADDER: the hem fill steps ≥ 7
 * in value from the base, the taken fill ≥ 12, the taken lobes ≥ 9
 * past the taken fill and the held lobes ≥ 8 past those (the dark
 * floors — worked earth, the underground's flags and scree — climb
 * half-steps: they have half the headroom above black), and nothing
 * strays past 42 of the base (terrain.fold.test.ts pins it), so a
 * folded road is still the road's value and a prop's floor law never
 * fights it. Blight is never black; ash is grey, not char; the cold
 * LIFTS (rime, frost, ice) because snow is where it is going.
 *
 * WHAT HOLDS. Open water (Water, WaterDeep) is foldable: false — water
 * is water; the shallows fold ONLY at the bank face and as scum lobes
 * under blight (the fill never moves). Snow is a winter no-op on every
 * season sign and folds only under burn (soot-dusted). The built floors
 * (WoodFloor) and the underground's own floor (CaveFloor) hold: the
 * plane gate keeps the underground unfolded and planks are planks.
 * Spring (THE FLUSH) reaches only the marsh — the one material that is
 * half plant; the earth holds and the crops carry the flush (LG-4).
 */

/** A run's re-ink at one band: the members a look leaves out hold the layer's own. */
export interface FoldRunInk {
  /** The worn shade band settling the material into its edge. */
  band?: string;
  /** The sun lip on a west-facing run. */
  lip?: string;
  /** The laden blanket's own cool settling shade (Snow only). */
  laden?: string;
  /** The laden crest catching the sun (Snow only). */
  crest?: string;
}

/**
 * One material's fold. Every array is indexed by LOOK (0 summer — always
 * null, the painter never reaches it — 1 autumn/the cold, 2 spring, 3
 * blight, 4 burn).
 */
export interface MaterialFold {
  /** THE HEM: [fill key inside the touched contour, alt-patch key] or null (the material holds). */
  hem: readonly (readonly [string, string] | null)[];
  /** THE WASH: [taken fill key, taken lobe key, held lobe key] — any member null = that pass holds. */
  wash: readonly (readonly [string | null, string | null, string | null] | null)[];
  /** THE RUNS: [taken ink, held ink] read at the run's midpoint, or null (the layer's own). */
  run?: readonly (readonly [FoldRunInk, FoldRunInk] | null)[];
}

const HOLD = {} as const satisfies FoldRunInk;

/** Dirt #96744c — the turn darkens it damp with frost lobes at the cold,
 *  blight greys it and spills bruised lobes, burn chars it dust-brown. */
export const DIRT_FOLD: MaterialFold = {
  hem: [null, ['#8e6c45', '#896843'], null, ['#7b6d6b', '#766967'], ['#876d50', '#83694e']],
  wash: [
    null,
    ['#856541', '#795c3b', '#828895'],
    null,
    ['#726563', '#655868', '#5a4e5d'],
    ['#7e654b', '#655d59', '#5b5451'],
  ],
  run: [
    null,
    [{ band: 'rgba(58, 42, 28, 0.34)' }, { band: 'rgba(96, 112, 140, 0.3)', lip: 'rgba(236, 242, 250, 0.4)' }],
    null,
    [{ band: 'rgba(52, 40, 62, 0.32)' }, { band: 'rgba(48, 36, 60, 0.36)', lip: 'rgba(210, 200, 224, 0.26)' }],
    [
      { band: 'rgba(30, 22, 18, 0.36)', lip: 'rgba(170, 150, 130, 0.16)' },
      { band: 'rgba(24, 18, 16, 0.4)', lip: 'rgba(150, 140, 130, 0.12)' },
    ],
  ],
};

/** Tilled #6b4f33 — worked earth: the same story a step deeper; frozen soil pales. */
export const TILLED_FOLD: MaterialFold = {
  hem: [null, ['#60482f', '#5b442c'], null, ['#584643', '#53433f'], ['#5d4833', '#584530']],
  wash: [
    null,
    ['#58422b', '#503d28', '#62616b'],
    null,
    ['#4f403d', '#423749', '#3a3040'],
    ['#55422e', '#413c39', '#3a3532'],
  ],
  run: [
    null,
    [{ band: 'rgba(30, 20, 12, 0.44)' }, { band: 'rgba(56, 70, 100, 0.3)' }],
    null,
    [{ band: 'rgba(34, 22, 40, 0.42)' }, { band: 'rgba(30, 20, 40, 0.46)' }],
    [{ band: 'rgba(22, 16, 12, 0.46)' }, { band: 'rgba(18, 14, 12, 0.5)' }],
  ],
};

/** Swamp #556b3e — the reeds rust in the turn, the marsh freezes pale,
 *  the flush greens it (the one spring material), blight greys, burn dries it. */
export const SWAMP_FOLD: MaterialFold = {
  hem: [
    null,
    ['#5c5c32', '#585830'],
    ['#557840', '#51743d'],
    ['#555851', '#51544d'],
    ['#5d593f', '#58553c'],
  ],
  wash: [
    null,
    ['#56562f', '#4b4b29', '#65716f'],
    ['#597e43', '#4c6c39', '#5f8647'],
    ['#4e514a', '#46434f', '#3e3b46'],
    ['#55523a', '#494640', '#413e39'],
  ],
  run: [
    null,
    [{ band: 'rgba(40, 42, 22, 0.36)' }, { band: 'rgba(78, 96, 118, 0.3)' }],
    null,
    [{ band: 'rgba(28, 28, 40, 0.36)' }, { band: 'rgba(26, 24, 40, 0.4)' }],
    [{ band: 'rgba(26, 22, 14, 0.4)' }, { band: 'rgba(22, 18, 12, 0.44)' }],
  ],
};

/** Path #c2a26e — the packed road darkens a step in the turn, frosts pale
 *  in the cold, greys under blight (bruised lobes toward violet at the
 *  heart), dusts under burn (soot lobes). */
export const PATH_FOLD: MaterialFold = {
  hem: [null, ['#bc9a62', '#b7965f'], null, ['#a89991', '#a4958e'], ['#b79877', '#b39474']],
  wash: [
    null,
    ['#b4935d', '#a88957', '#b0b3be'],
    null,
    ['#a0918a', '#928397', '#87798c'],
    ['#ae9071', '#918982', '#87807a'],
  ],
  run: [
    null,
    [{ band: 'rgba(92, 66, 36, 0.34)' }, { band: 'rgba(110, 126, 160, 0.3)', lip: 'rgba(244, 248, 252, 0.44)' }],
    null,
    [
      { band: 'rgba(78, 62, 78, 0.32)', lip: 'rgba(228, 220, 232, 0.28)' },
      { band: 'rgba(70, 54, 78, 0.36)', lip: 'rgba(224, 214, 232, 0.24)' },
    ],
    [
      { band: 'rgba(48, 36, 28, 0.36)', lip: 'rgba(190, 178, 166, 0.2)' },
      { band: 'rgba(36, 28, 24, 0.4)', lip: 'rgba(196, 188, 180, 0.14)' },
    ],
  ],
};

/** Sand #ddc98d — holds through the turn, goes grey in the cold (held
 *  lobes only: frost on the strand), greys under blight, ash-dusts under burn. */
export const SAND_FOLD: MaterialFold = {
  hem: [null, null, null, ['#cabfa4', '#c6bba0'], ['#d2be9a', '#ceba97']],
  wash: [
    null,
    [null, null, '#cfd2da'],
    null,
    ['#c2b79d', '#b4a9b0', '#aba0a7'],
    ['#cab693', '#b4ada5', '#aca59e'],
  ],
  run: [
    null,
    [HOLD, { band: 'rgba(120, 132, 156, 0.3)', lip: 'rgba(246, 250, 254, 0.44)' }],
    null,
    [
      { band: 'rgba(120, 104, 96, 0.32)', lip: 'rgba(240, 232, 236, 0.36)' },
      { band: 'rgba(112, 96, 104, 0.34)', lip: 'rgba(236, 228, 236, 0.32)' },
    ],
    [
      { band: 'rgba(70, 54, 40, 0.34)', lip: 'rgba(214, 204, 190, 0.24)' },
      { band: 'rgba(56, 44, 36, 0.38)', lip: 'rgba(226, 218, 206, 0.16)' },
    ],
  ],
};

/** StoneFloor #a09aa8 — flags hold through the turn and rime in the cold
 *  (held lobes), go cool violet under blight, soot under burn. */
export const STONE_FOLD: MaterialFold = {
  hem: [null, null, null, ['#978db1', '#938aac'], ['#9b9393', '#978f8f']],
  wash: [
    null,
    [null, null, '#a8abb5'],
    null,
    ['#8f86a7', '#8778a5', '#7c6f98'],
    ['#938b8b', '#888280', '#7f7a78'],
  ],
  run: [
    null,
    [HOLD, { band: 'rgba(88, 100, 132, 0.3)', lip: 'rgba(240, 244, 250, 0.48)' }],
    null,
    [
      { band: 'rgba(44, 30, 64, 0.3)', lip: 'rgba(216, 208, 232, 0.36)' },
      { band: 'rgba(40, 26, 62, 0.34)', lip: 'rgba(212, 202, 232, 0.32)' },
    ],
    [
      { band: 'rgba(28, 22, 28, 0.32)', lip: 'rgba(180, 176, 180, 0.24)' },
      { band: 'rgba(22, 18, 22, 0.36)', lip: 'rgba(176, 172, 176, 0.16)' },
    ],
  ],
};

/** DungeonFloor #514b58 — laid flags in the dark band's tones, the same
 *  three answers a half-step down (the dark floors have half the
 *  headroom above black, so their ladders are half as tall). */
export const DUNGEON_FOLD: MaterialFold = {
  hem: [null, null, null, ['#4b4362', '#48415e'], ['#504646', '#4d4343']],
  wash: [
    null,
    [null, null, '#585965'],
    null,
    ['#47405d', '#413a5f', '#3d365a'],
    ['#4c4343', '#434040', '#403b3b'],
  ],
  run: [
    null,
    [HOLD, { band: 'rgba(60, 72, 104, 0.3)' }],
    null,
    [{ band: 'rgba(18, 10, 32, 0.34)' }, { band: 'rgba(16, 8, 32, 0.38)' }],
    [{ band: 'rgba(12, 8, 10, 0.36)' }, { band: 'rgba(10, 6, 8, 0.4)' }],
  ],
};

/** CaveRubble #544e5f — scree: the flagstone's answers, a shade lighter. */
export const RUBBLE_FOLD: MaterialFold = {
  hem: [null, null, null, ['#4e466a', '#4b4465'], ['#54494b', '#514648']],
  wash: [
    null,
    [null, null, '#5b5d6a'],
    null,
    ['#4a4364', '#443d65', '#40395f'],
    ['#504547', '#474141', '#413b3b'],
  ],
  run: [
    null,
    [HOLD, { band: 'rgba(60, 72, 104, 0.28)' }],
    null,
    [{ band: 'rgba(20, 12, 34, 0.32)' }, { band: 'rgba(18, 10, 34, 0.36)' }],
    [{ band: 'rgba(12, 8, 10, 0.34)' }, { band: 'rgba(10, 6, 8, 0.38)' }],
  ],
};

/** Snow #e9edf3 — a winter no-op on every season sign (its laden inks
 *  are already the cold's and never move); folds only under burn,
 *  soot-dusted: the blanket greys, its settling shade goes ash-warm
 *  and the crest dims (a sooted crest still catches the sun, dimmer). */
export const SNOW_FOLD: MaterialFold = {
  hem: [null, null, null, null, null],
  wash: [null, null, null, null, ['#dedee2', '#d4d4d8', '#c8c8cc']],
  run: [
    null,
    null,
    null,
    null,
    [
      { laden: 'rgba(110, 104, 112, 0.3)', crest: 'rgba(236, 232, 232, 0.4)' },
      { laden: 'rgba(96, 90, 96, 0.34)', crest: 'rgba(230, 226, 226, 0.34)' },
    ],
  ],
};

/** WaterShallow #649cc0 — foldable: false at the fill (water is water);
 *  scum LOBES under blight at taken+ and the held film's lobes inside. */
export const SHALLOWS_FOLD: MaterialFold = {
  hem: [null, null, null, null, null],
  wash: [null, null, null, [null, '#7b9991', '#728f87'], null],
};

/**
 * THE BANK FACE under a fold: the cut earth the shallows' camera-facing
 * runs show, re-tinted at [taken, held] per look — icy pale in the
 * cold, bruised under blight, char under burn. STAYS CLOSE IN VALUE to
 * the living faces (#5f4a33 earth … #8695ac snow): a pale segment beside
 * a dark one reads as a broken bar, never a material change. A snow
 * land keeps its own face (already the cold's).
 */
export const BANK_FACE_FOLD: readonly (readonly [string | null, string | null] | null)[] = [
  null,
  [null, '#7b8aa2'],
  null,
  ['#5a5066', '#584a66'],
  ['#554842', '#4e433f'],
];

/**
 * THE MATERIAL MARKS' inks (plan §12.4: leaf-litter chips on the road,
 * frozen ruts, rime on the flags, soot on any ground) — dealt off the
 * field per tile in drawTileDetail's material branch, half the meadow's
 * density and on their own hash lanes (THE HAND NEVER REPEATS ITSELF).
 */
export const MATERIAL_MARK_INK = {
  /** The frozen rut: a long low frost pool lying in the wheel line. */
  rut: 'rgba(170, 186, 216, 0.2)',
  rutRime: 'rgba(236, 242, 250, 0.3)',
} as const;
