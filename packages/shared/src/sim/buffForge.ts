/**
 * THE BUFF FORGE (status-book-plan.md, Phase 2) — the declared fold
 * table. Before this file, every buff field's stacking physics lived
 * at its read site as scattered lore: crit folded additively in one
 * helper, speed multiplied in the ride mirror, armor summed inside
 * damagePlayer, regen took best-of in the regen pass. Same rules,
 * seven homes. This file is the ONE home: every fold rule is a named,
 * documented, test-pinned function, and the read sites call it.
 *
 * THE TABLE (the buff constitution — change a rule HERE or nowhere):
 *
 * | field            | rule                | why                                |
 * |------------------|---------------------|------------------------------------|
 * | critPct          | additive            | two sharpenings are both felt      |
 * | dmgMult          | additive-of-excess  | surges add their edge, never       |
 * |                  |                     | compound (TWO BUCKETS' first lane) |
 * | speedMult        | multiplicative      | stride stacks feel honest          |
 * | attackSpeedMult  | multiplicative,     | THE SWING CHANNEL (born Phase 2):  |
 * |                  | clamped SWING band  | the band is engine law, not        |
 * |                  |                     | authoring discipline               |
 * | armor            | sum                 | plates stack                       |
 * | reflectFrac      | max                 | one turned blow, the sharpest      |
 * | regenPer4s       | best-of             | mending doesn't compound           |
 * | gatherSpeed      | best-of             | one pair of hands                  |
 * | meleeLifesteal   | max                 | one thirst, the deepest            |
 *
 * STACKS: a buff may carry `stacks` (absent = 1). Additive rules
 * multiply their contribution by the count; multiplicative rules
 * raise theirs to it; max/best rules IGNORE the count by law — a
 * deeper stance is authored as a bigger number, never as a count.
 * Every shipped buff carries no count, so every fold below reads
 * byte-identical to the scattered originals (pinned).
 */

/** The face a foldable buff shows the table (PlayerBuff satisfies it). */
export interface BuffLike {
  speedMult: number;
  /** THE SWING CHANNEL — multiplies swing cadence (1 = trained pace). */
  attackSpeedMult?: number;
  armor: number;
  reflectFrac: number;
  gatherSpeed: number;
  regenPer4s: number;
  meleeLifesteal: number;
  critPct: number;
  dmgMult: number;
  /** Stack count for stacking buffs (absent = 1). */
  stacks?: number;
}

const nOf = (b: BuffLike): number => Math.max(1, b.stacks ?? 1);

/** critPct: ADDITIVE × stacks. */
export function buffCritPct(buffs: readonly BuffLike[]): number {
  let pct = 0;
  for (const b of buffs) pct += b.critPct * nOf(b);
  return pct;
}

/** dmgMult: ADDITIVE-OF-EXCESS × stacks — surges never compound. */
export function buffDmgMult(buffs: readonly BuffLike[]): number {
  let mult = 1;
  for (const b of buffs) mult += (b.dmgMult - 1) * nOf(b);
  return mult;
}

/** speedMult: MULTIPLICATIVE ^ stacks. */
export function buffSpeedMult(buffs: readonly BuffLike[]): number {
  let mult = 1;
  for (const b of buffs) mult *= Math.pow(b.speedMult, nOf(b));
  return mult;
}

/** armor: SUM × stacks. */
export function buffArmor(buffs: readonly BuffLike[]): number {
  let armor = 0;
  for (const b of buffs) armor += b.armor * nOf(b);
  return armor;
}

/** reflectFrac: MAX — one turned blow, the sharpest; stacks ignored. */
export function buffReflectFrac(buffs: readonly BuffLike[]): number {
  let frac = 0;
  for (const b of buffs) frac = Math.max(frac, b.reflectFrac);
  return frac;
}

/** regenPer4s: BEST-OF — mending doesn't compound; stacks ignored. */
export function buffRegenPer4s(buffs: readonly BuffLike[]): number {
  let regen = 0;
  for (const b of buffs) regen = Math.max(regen, b.regenPer4s);
  return regen;
}

/** gatherSpeed: BEST-OF — one pair of hands; stacks ignored. */
export function buffGatherSpeed(buffs: readonly BuffLike[]): number {
  let mult = 1;
  for (const b of buffs) mult = Math.max(mult, b.gatherSpeed);
  return mult;
}

/** meleeLifesteal: MAX — one thirst, the deepest; stacks ignored. */
export function buffLifesteal(buffs: readonly BuffLike[]): number {
  let steal = 0;
  for (const b of buffs) steal = Math.max(steal, b.meleeLifesteal);
  return steal;
}

// -------------------------------------------------- THE SWING CHANNEL

/**
 * The band the whole swing channel lives inside, whatever authored
 * it — gear, surges, stacks, or a future page's statMods. 0.6 is the
 * heaviest honest slow (below it swings read as broken, not slowed);
 * 1.5 the fastest honest haste (above it recovery frames lie). The
 * ledger (plan Part 4) prices INSIDE the band; the clamp is engine
 * law at the one read, so no assembly of sources can escape it.
 */
export const SWING_MULT_MIN = 0.6;
export const SWING_MULT_MAX = 1.5;

/**
 * The one swing multiplier: worn gear's channel × every riding
 * buff's, clamped to the band. 1 everywhere = the trained pace, so
 * the pre-forge game swings byte-identical.
 */
export function swingMult(gearMult: number, buffs: readonly BuffLike[]): number {
  let mult = gearMult;
  for (const b of buffs) mult *= Math.pow(b.attackSpeedMult ?? 1, nOf(b));
  return Math.min(SWING_MULT_MAX, Math.max(SWING_MULT_MIN, mult));
}

/**
 * Swing cadence under the channel: a faster hand recovers in fewer
 * ticks. Cooldown haste (ability slots) is a DIFFERENT stat and never
 * routes through here.
 *
 * THE CHOREOGRAPHY FLOOR: haste may never start the next swing before
 * the current pose hold ends — pass the style's holdTicks
 * (STRIKE_CLOCKS) and the hasted recovery stops there. A base cadence
 * already under the floor keeps its own law (the floor binds the
 * HASTE, never the weapon), and mult 1 returns the base untouched —
 * the pre-forge game is byte-identical through this door. BOTH
 * mirrors call this one function: the server's pay site and the
 * client's prediction lanes must never do this math apart.
 */
export function swingCooldown(baseTicks: number, mult: number, choreographyFloorTicks = 1): number {
  return Math.max(Math.min(baseTicks, choreographyFloorTicks), Math.round(baseTicks / mult), 1);
}

// ------------------------------------------------------- THE RESTACK

/**
 * The stacking landing for an id-keyed buff (the count-model door's
 * boon-lane sibling): one more stack up to the buff's own max, the
 * clock refreshed by max. Returns the stack count after the landing.
 * No shipped pusher opts in yet — the machinery is engine-complete
 * and pinned, awaiting its first authored stacking boon.
 */
export function restack(
  buff: { stacks?: number; maxStacks?: number; untilTick: number },
  untilTick: number,
): number {
  const max = Math.max(1, buff.maxStacks ?? 1);
  buff.stacks = Math.min(max, (buff.stacks ?? 1) + 1);
  buff.untilTick = Math.max(buff.untilTick, untilTick);
  return buff.stacks;
}
