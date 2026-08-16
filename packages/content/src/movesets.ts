import {
  COMBO_GRACE_TICKS,
  FINISHER_DAMAGE_MULT,
  FINISHER_KNOCKBACK_MULT,
  FINISHER_RECOVERY_MULT,
  HEAVY_BOLT_MULT,
  HEAVY_BOLT_RECOVERY_MULT,
  HEAVY_BOLT_SPLASH,
  PoseState,
  TWOHAND_COMBO_GRACE_TICKS,
  TWOHAND_FINISHER_DAMAGE_MULT,
  TWOHAND_FINISHER_KNOCKBACK_MULT,
  TWOHAND_FINISHER_RECOVERY_MULT,
  TWOHAND_KNOCKBACK_MULT,
  TWOHAND_STAGE2_DAMAGE_MULT,
  type StatusId,
} from '@arx/shared';
import type { MovesetId, WeaponStats } from './items.js';

/**
 * THE MOVESET BOOK (combat v2, Phase 3): strikes are CONTENT. A
 * moveset is a named string of StrikeDefs; a weapon resolves one
 * through `movesetFor` — its authored `moveset` field first, then its
 * class default, with the dagger family split off by the same
 * three-dial identity the census test pins (fast cadence, short
 * reach, a real backstab). The bow deliberately has no page in this
 * book: its basic is the DRAW, a charge grammar, not a string.
 *
 * Default strings derive every number from the shared lane constants,
 * so the book and the old hardcoded lanes can never disagree — the
 * byte-law test pins it anyway.
 */

export interface StrikeDef {
  /** Choreography word — the client's strike vocabulary key. */
  key: string;
  dmgMult: number;
  kbMult: number;
  /** Every body in the arc eats its own roll (vs best-target only). */
  sweepAll: boolean;
  /** Recovery, as a multiple of the weapon's cooldownTicks. */
  recoveryMult: number;
  /**
   * THE HONEST SWING: ticks from press to impact — the blade travels
   * before it lands, like every NPC blow already does. The press pays
   * (cooldown, pose, the spoken beat); the damage arrives on the
   * choreography's impact frame. Wand bolts keep 0: the projectile's
   * flight is already the honest travel.
   */
  windupTicks: number;
  /** THE BRANCH: a rhythm TAP on this beat plays this strike instead. */
  alt?: StrikeDef;
  /**
   * THE READING EDGE: this beat SPENDS a state it finds. A body in
   * the arc carrying `status` takes `mult` times this strike's roll
   * and the state is consumed — the finisher that reads the wound it
   * built. Each struck body pays and spends its own. Resolved at the
   * one seam; whiff-0 spends nothing.
   */
  consumes?: { status: StatusId; mult: number };
  /** Wand lane: projectile speed factor. */
  speedMult?: number;
  /** Wand lane: splash radius (tiles) at impact. */
  splash?: number;
  /** Melee cone override, radians half-angle (else the class cone). */
  arcHalf?: number;
}

export interface MovesetDef {
  id: MovesetId;
  /** The page's spoken name (the item card's Fights as row). */
  name: string;
  style: 'onehand' | 'twohand' | 'polearm' | 'arx';
  /** Which pose vocabulary the string speaks (steel swings vs casts). */
  poseDialect: 'steel' | 'wand';
  /** Grace ticks stamped after each swing's recovery. */
  graceTicks: number;
  string: StrikeDef[];
}

/**
 * THE FOUR-BEAT SWORD STRING: cleave, return, cleave, payoff. One more
 * chip beat than the old three-beat, so the finisher is EARNED —
 * cycle damage sits 2% under the legacy line (parity-pinned). The
 * final beat BRANCHES: hold-flow sweeps the whole arc (the old
 * crowd-clear finisher, unchanged for holders); a rhythm TAP on the
 * beat drives THE PIERCING instead — one body, a heavier hit, the
 * duelist's answer. Tap reward stays inside the +10% cadence band and
 * only ever against a single target.
 */
const SWORD_STRING: MovesetDef = {
  id: 'sword_string',
  name: "The Soldier's Line",
  style: 'onehand',
  poseDialect: 'steel',
  graceTicks: COMBO_GRACE_TICKS,
  string: [
    { key: 'cleave', dmgMult: 1, kbMult: 1, sweepAll: false, recoveryMult: 1, windupTicks: 2 },
    { key: 'return', dmgMult: 1, kbMult: 1.1, sweepAll: false, recoveryMult: 1, windupTicks: 2 },
    { key: 'cleave', dmgMult: 1, kbMult: 1, sweepAll: false, recoveryMult: 1, windupTicks: 2 },
    {
      key: 'sweep',
      dmgMult: FINISHER_DAMAGE_MULT,
      kbMult: FINISHER_KNOCKBACK_MULT,
      sweepAll: true,
      recoveryMult: FINISHER_RECOVERY_MULT,
      windupTicks: 3,
      alt: {
        key: 'thrust',
        dmgMult: 3.0,
        kbMult: 1.6,
        sweepAll: false,
        recoveryMult: FINISHER_RECOVERY_MULT,
        windupTicks: 3,
      },
    },
  ],
};

/**
 * THE DAGGER FLURRY: the first per-family string — five quick cuts,
 * rake and backslash weaving, then the plunge. Authored to EXACT
 * cycle parity with the legacy three-beat ((4 + 2.75) / 6 = 1.125),
 * so the knife's identity is rhythm density, never a damage buff.
 * One-tick windups: fast hands stay fast.
 */
const DAGGER_FLURRY: MovesetDef = {
  id: 'dagger_flurry',
  name: 'The Knife Weave',
  style: 'onehand',
  poseDialect: 'steel',
  graceTicks: COMBO_GRACE_TICKS,
  string: [
    { key: 'rake', dmgMult: 1, kbMult: 1, sweepAll: false, recoveryMult: 1, windupTicks: 1 },
    { key: 'backslash', dmgMult: 1, kbMult: 1, sweepAll: false, recoveryMult: 1, windupTicks: 1 },
    { key: 'rake', dmgMult: 1, kbMult: 1, sweepAll: false, recoveryMult: 1, windupTicks: 1 },
    { key: 'backslash', dmgMult: 1, kbMult: 1, sweepAll: false, recoveryMult: 1, windupTicks: 1 },
    {
      key: 'plunge',
      dmgMult: 2.75,
      kbMult: 1.5,
      sweepAll: true,
      recoveryMult: 2.0,
      windupTicks: 2,
    },
  ],
};

/** THE GREAT STRING: the legacy three beats, now with honest weight. */
const GREAT_STRING: MovesetDef = {
  id: 'great_string',
  name: 'The Mountain Line',
  style: 'twohand',
  poseDialect: 'steel',
  graceTicks: TWOHAND_COMBO_GRACE_TICKS,
  string: [
    {
      key: 'fell',
      dmgMult: 1,
      kbMult: TWOHAND_KNOCKBACK_MULT,
      sweepAll: true,
      recoveryMult: 1,
      windupTicks: 4,
    },
    {
      key: 'reap',
      dmgMult: TWOHAND_STAGE2_DAMAGE_MULT,
      kbMult: TWOHAND_KNOCKBACK_MULT,
      sweepAll: true,
      recoveryMult: 1,
      windupTicks: 4,
    },
    {
      key: 'mountain',
      dmgMult: TWOHAND_FINISHER_DAMAGE_MULT,
      kbMult: TWOHAND_FINISHER_KNOCKBACK_MULT,
      sweepAll: true,
      recoveryMult: TWOHAND_FINISHER_RECOVERY_MULT,
      windupTicks: 5,
      // THE OVERHEAD: a rhythm TAP narrows the mountain to a single
      // falling line — a tight cone, a heavier hit, a harder shove.
      // +9.7% cycle against the great line, single-lane only, inside
      // the +10% band.
      alt: {
        key: 'overhead',
        dmgMult: 3.5,
        kbMult: 2.6,
        sweepAll: true,
        recoveryMult: TWOHAND_FINISHER_RECOVERY_MULT,
        windupTicks: 5,
        arcHalf: 0.6,
      },
    },
  ],
};

/** THE WAND RHYTHM: bolt, bolt, orb — the legacy lane, as a page. */
const WAND_RHYTHM: MovesetDef = {
  id: 'wand_rhythm',
  name: 'The Bolt Rhythm',
  style: 'arx',
  poseDialect: 'wand',
  graceTicks: COMBO_GRACE_TICKS,
  string: [
    { key: 'bolt', dmgMult: 1, kbMult: 1, sweepAll: false, recoveryMult: 1, windupTicks: 0 },
    { key: 'bolt', dmgMult: 1, kbMult: 1, sweepAll: false, recoveryMult: 1, windupTicks: 0 },
    {
      key: 'orb',
      dmgMult: HEAVY_BOLT_MULT,
      kbMult: 1,
      sweepAll: false,
      recoveryMult: HEAVY_BOLT_RECOVERY_MULT,
      windupTicks: 0,
      speedMult: 0.8,
      splash: HEAVY_BOLT_SPLASH,
    },
  ],
};

/**
 * THE FENCER'S LINE (Phase 5): the dueling swords' page — thrust-led,
 * narrow lanes, no crowd-clear at all: every beat takes ONE body, and
 * the lunge is the point's whole argument. Cycle +3.6% base / +9.1%
 * on the tap against the soldier's line, single-target only.
 */
const FENCER_LINE: MovesetDef = {
  id: 'fencer_line',
  name: "The Fencer's Line",
  style: 'onehand',
  poseDialect: 'steel',
  graceTicks: COMBO_GRACE_TICKS,
  string: [
    { key: 'thrust', dmgMult: 1, kbMult: 0.9, sweepAll: false, recoveryMult: 1, windupTicks: 2, arcHalf: 0.8 },
    { key: 'cut', dmgMult: 1, kbMult: 1, sweepAll: false, recoveryMult: 1, windupTicks: 2 },
    { key: 'thrust', dmgMult: 1, kbMult: 0.9, sweepAll: false, recoveryMult: 1, windupTicks: 2, arcHalf: 0.8 },
    {
      key: 'lunge',
      dmgMult: 2.7,
      kbMult: 1.5,
      sweepAll: false,
      recoveryMult: FINISHER_RECOVERY_MULT,
      windupTicks: 3,
      arcHalf: 0.55,
      alt: {
        key: 'fleche',
        dmgMult: 3.0,
        kbMult: 1.6,
        sweepAll: false,
        recoveryMult: FINISHER_RECOVERY_MULT,
        windupTicks: 3,
        arcHalf: 0.55,
      },
    },
  ],
};

/**
 * THE REAVER'S ARC (Phase 5): the falchion and scimitar families keep
 * the OLD three-beat chop — wider cuts than a soldier's sword, the
 * legacy crowd finisher, EXACT legacy cycle. The old string survives
 * as an identity, not a default.
 */
const REAVER_ARC: MovesetDef = {
  id: 'reaver_arc',
  name: "The Reaver's Arc",
  style: 'onehand',
  poseDialect: 'steel',
  graceTicks: COMBO_GRACE_TICKS,
  string: [
    { key: 'cleave', dmgMult: 1, kbMult: 1.05, sweepAll: false, recoveryMult: 1, windupTicks: 2, arcHalf: 1.15 },
    { key: 'return', dmgMult: 1, kbMult: 1.15, sweepAll: false, recoveryMult: 1, windupTicks: 2, arcHalf: 1.15 },
    {
      key: 'sweep',
      dmgMult: FINISHER_DAMAGE_MULT,
      kbMult: 1.9,
      sweepAll: true,
      recoveryMult: FINISHER_RECOVERY_MULT,
      windupTicks: 3,
      arcHalf: 1.2,
    },
  ],
};

/**
 * THE CRUSHER'S DROP (Phase 5): the mauls' page — fewer, meatier.
 * Every beat lands a little heavier and rests a little longer; the
 * QUAKE is the biggest single basic-beat in the game. Cycle +1.3%
 * against the great line.
 */
const CRUSHER_DROP: MovesetDef = {
  id: 'crusher_drop',
  name: "The Crusher's Drop",
  style: 'twohand',
  poseDialect: 'steel',
  graceTicks: TWOHAND_COMBO_GRACE_TICKS,
  string: [
    { key: 'drop', dmgMult: 1.1, kbMult: 1.4, sweepAll: true, recoveryMult: 1.1, windupTicks: 5 },
    { key: 'drop', dmgMult: 1.25, kbMult: 1.4, sweepAll: true, recoveryMult: 1.1, windupTicks: 5 },
    {
      key: 'quake',
      dmgMult: 3.3,
      kbMult: 2.5,
      sweepAll: true,
      recoveryMult: 1.7,
      windupTicks: 6,
    },
  ],
};

/**
 * THE STORM WEAVE (Phase 5): the battlestaffs' page — a longer bolt
 * weave into a TEMPEST orb that splashes wider and hits harder than
 * the scholar's. Cycle +6.8% against the bolt rhythm, paid in the
 * longer weave a fight must survive.
 */
const STORMCALL_WEAVE: MovesetDef = {
  id: 'stormcall_weave',
  name: 'The Storm Weave',
  style: 'arx',
  poseDialect: 'wand',
  graceTicks: COMBO_GRACE_TICKS,
  string: [
    { key: 'bolt', dmgMult: 1, kbMult: 1, sweepAll: false, recoveryMult: 1, windupTicks: 0 },
    { key: 'bolt', dmgMult: 1, kbMult: 1, sweepAll: false, recoveryMult: 1, windupTicks: 0 },
    { key: 'bolt', dmgMult: 1, kbMult: 1, sweepAll: false, recoveryMult: 1, windupTicks: 0 },
    {
      key: 'tempest',
      dmgMult: 3.6,
      kbMult: 1,
      sweepAll: false,
      recoveryMult: HEAVY_BOLT_RECOVERY_MULT,
      windupTicks: 0,
      speedMult: 0.75,
      splash: 1.5,
    },
  ],
};

/**
 * THE KING'S VERDICT (Phase 5, signature): kingsbane's own page — the
 * flurry whose plunge takes ONE throat, harder. The first weapon in
 * the game whose fight is its own. Cycle +4.4%, single-target only.
 */
const KINGSBANE_VERDICT: MovesetDef = {
  id: 'kingsbane_verdict',
  name: "The King's Verdict",
  style: 'onehand',
  poseDialect: 'steel',
  graceTicks: COMBO_GRACE_TICKS,
  string: [
    { key: 'rake', dmgMult: 1, kbMult: 1, sweepAll: false, recoveryMult: 1, windupTicks: 1 },
    { key: 'backslash', dmgMult: 1, kbMult: 1, sweepAll: false, recoveryMult: 1, windupTicks: 1 },
    { key: 'rake', dmgMult: 1, kbMult: 1, sweepAll: false, recoveryMult: 1, windupTicks: 1 },
    { key: 'backslash', dmgMult: 1, kbMult: 1, sweepAll: false, recoveryMult: 1, windupTicks: 1 },
    {
      key: 'verdict',
      dmgMult: 3.05,
      kbMult: 1.6,
      sweepAll: false,
      recoveryMult: 2.0,
      windupTicks: 2,
    },
  ],
};

/**
 * THE LINE OF THE LANCE: the polearm class default — jab, jab, and the
 * IMPALE, a piercing corridor that runs every body on the line through
 * (sweepAll inside a needle cone: the reach school's payoff is depth,
 * never breadth). A rhythm TAP takes THE DRIVE instead — one body,
 * harder, the point withdrawn clean. Every beat authors its own narrow
 * cone: THE THRUST IS NOT A CUT, so no polearm beat ever speaks the
 * class-wide melee arc. Cycle rate 4.5/3.5 ≈ 1.286 defines the school
 * band; the drive branch sits at 1.357, inside +10%.
 */
const LINE_OF_LANCE: MovesetDef = {
  id: 'line_of_lance',
  name: 'The Line of the Lance',
  style: 'polearm',
  poseDialect: 'steel',
  graceTicks: COMBO_GRACE_TICKS,
  string: [
    { key: 'jab', dmgMult: 1, kbMult: 0.9, sweepAll: false, recoveryMult: 1, windupTicks: 3, arcHalf: 0.45 },
    { key: 'jab', dmgMult: 1, kbMult: 0.9, sweepAll: false, recoveryMult: 1, windupTicks: 3, arcHalf: 0.45 },
    {
      key: 'impale',
      dmgMult: 2.5,
      kbMult: 1.5,
      sweepAll: true,
      recoveryMult: 1.5,
      windupTicks: 4,
      arcHalf: 0.3,
      alt: {
        key: 'drive',
        dmgMult: 2.75,
        kbMult: 1.2,
        sweepAll: false,
        recoveryMult: 1.5,
        windupTicks: 4,
        arcHalf: 0.45,
      },
    },
  ],
};

export const MOVESETS: Record<MovesetId, MovesetDef> = {
  sword_string: SWORD_STRING,
  dagger_flurry: DAGGER_FLURRY,
  great_string: GREAT_STRING,
  wand_rhythm: WAND_RHYTHM,
  fencer_line: FENCER_LINE,
  reaver_arc: REAVER_ARC,
  crusher_drop: CRUSHER_DROP,
  stormcall_weave: STORMCALL_WEAVE,
  kingsbane_verdict: KINGSBANE_VERDICT,
  line_of_lance: LINE_OF_LANCE,
};

/**
 * THE PAGE ROSTER (Phase 5): the book's own authored assignment — a
 * design family's ids on the page they fight from. Lives HERE, not
 * scattered across defs, so all fight-style authoring is one file;
 * the roster test pins every id real and every style agreeing. The
 * roster outranks the dagger classifier (a signature knife keeps its
 * own page) and is outranked only by an authored `weapon.moveset`.
 */
const metals = (key: string) =>
  ['', 'iron_', 'steel_', 'gold_', 'mithril_', 'adamant_', 'obsidian_', 'starsteel_'].map(
    (m) => `${m}${key}`,
  );
export const PAGE_ROSTER: Partial<Record<MovesetId, readonly string[]>> = {
  fencer_line: [
    ...metals('gladius'),
    'moonshard',
    'duelists_grace',
    'vipersong',
    'silverlace',
    'silverthread',
    'borrowed_time',
  ],
  reaver_arc: [...metals('falchion'), ...metals('scimitar')],
  crusher_drop: ['stonebreaker_maul', 'kerbstone', 'forgewrath', 'stormhewer', 'tollbreaker'],
  stormcall_weave: [
    'ember_battlestaff',
    'frost_battlestaff',
    'storm_battlestaff',
    'verdant_battlestaff',
  ],
  kingsbane_verdict: ['kingsbane'],
};

/** id → page, folded once from the roster. */
const PAGE_BY_ID = new Map<string, MovesetDef>();
for (const [pageId, ids] of Object.entries(PAGE_ROSTER)) {
  for (const id of ids!) PAGE_BY_ID.set(id, MOVESETS[pageId as MovesetId]);
}

/**
 * The census test's dagger identity, as the one classifier: fast
 * cadence, short reach, a real backstab. Pure WeaponStats — no
 * registry lookup, so the server door, the client mirror, and the
 * slates all classify identically.
 */
export function isDaggerStats(weapon: WeaponStats): boolean {
  return (
    weapon.cooldownTicks <= 6 && weapon.range <= 1.5 && (weapon.backstabMult ?? 0) >= 2.2
  );
}

/**
 * The weapon's page in the book: authored `moveset` field first, then
 * THE PAGE ROSTER by id, then the class default (daggers split off by
 * identity). Archery has no page — the draw is a charge grammar, and
 * the caller must treat null as "no basic string lane".
 */
export function movesetFor(weapon: WeaponStats, id?: string): MovesetDef | null {
  if (weapon.moveset) return MOVESETS[weapon.moveset];
  if (id) {
    const page = PAGE_BY_ID.get(id);
    if (page) return page;
  }
  if (weapon.style === 'twohand') return GREAT_STRING;
  if (weapon.style === 'polearm') return LINE_OF_LANCE;
  if (weapon.style === 'arx') return WAND_RHYTHM;
  if (weapon.style === 'onehand') return isDaggerStats(weapon) ? DAGGER_FLURRY : SWORD_STRING;
  return null;
}

/**
 * THE POSE ALTERNATION LAW: strings of any length speak the existing
 * three attack poses — even beats swing forehand (Attack), odd beats
 * backhand (Attack2), the final beat wears the payoff pose (Attack3).
 * In the STEEL dialect adjacent beats NEVER share a pose value
 * (including the wrap into a new string), because the client's anim
 * clock keys on pose CHANGE — pinned by test. This is why a five-beat
 * flurry costs zero wire changes. The WAND dialect deliberately
 * repeats Cast beat to beat (legacy, unchanged): a bolt's feedback is
 * the projectile leaving the crown, not a body re-animation — only
 * its payoff orb flips the byte.
 */
export function strikePose(dialect: 'steel' | 'wand', stage: number, len: number): PoseState {
  if (stage === len - 1) return PoseState.Attack3;
  if (dialect === 'wand') return PoseState.Cast;
  return stage % 2 === 0 ? PoseState.Attack : PoseState.Attack2;
}
